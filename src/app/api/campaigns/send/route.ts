import { NextRequest, NextResponse } from 'next/server';
import { processCampaignBatch } from '@/lib/email/batch';
import { testSmtpConnection } from '@/lib/email/smtp';
import type { Campaign, SmtpSettings, Contact } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 secondes max pour Vercel Serverless

const PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID
  || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  || 'mailflow-bah-app';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';

// ── Helpers REST Firestore ──────────────────────────────────────────────────

function firestoreUrl(path: string, query?: Record<string, string>): string {
  const url = new URL(`${FIRESTORE_BASE}/${path}`);
  if (API_KEY) url.searchParams.set('key', API_KEY);
  if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

function valueFromFirestore(v: Record<string, unknown>): unknown {
  if (!v) return null;
  const [type, val] = Object.entries(v)[0];
  switch (type) {
    case 'stringValue': return val as string;
    case 'integerValue': return parseInt(val as string, 10);
    case 'doubleValue': return val as number;
    case 'booleanValue': return val as boolean;
    case 'nullValue': return null;
    case 'timestampValue': return new Date(val as string);
    case 'arrayValue':
      return ((val as { values?: unknown[] }).values || []).map((x) =>
        valueFromFirestore(x as Record<string, unknown>)
      );
    case 'mapValue':
      return Object.fromEntries(
        Object.entries((val as { fields?: Record<string, unknown> }).fields || {}).map(
          ([k2, v2]) => [k2, valueFromFirestore(v2 as Record<string, unknown>)]
        )
      );
    default: return val;
  }
}

function docFromFirestoreRest(doc: {
  name: string;
  fields: Record<string, Record<string, unknown>>;
}): Record<string, unknown> & { id: string } {
  const id = doc.name.split('/').pop()!;
  const fields: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(doc.fields || {})) {
    fields[key] = valueFromFirestore(val);
  }
  return { id, ...fields };
}

async function firestoreGet(path: string): Promise<Record<string, unknown> & { id: string } | null> {
  const res = await fetch(firestoreUrl(path));
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.fields) return null;
  return docFromFirestoreRest(json);
}

async function firestoreQuery(
  collectionPath: string,
  filters: Array<{ field: string; op: string; value: unknown }>
): Promise<Array<Record<string, unknown> & { id: string }>> {
  // Use runQuery (POST) for filtered queries
  const url = `${FIRESTORE_BASE}:runQuery${API_KEY ? `?key=${API_KEY}` : ''}`;

  function toFirestoreValue(val: unknown): unknown {
    if (typeof val === 'string') return { stringValue: val };
    if (typeof val === 'number') return { integerValue: String(val) };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
    return { nullValue: null };
  }

  const body = {
    structuredQuery: {
      from: [{ collectionId: collectionPath }],
      where: filters.length === 1
        ? {
            fieldFilter: {
              field: { fieldPath: filters[0].field },
              op: filters[0].op,
              value: toFirestoreValue(filters[0].value),
            },
          }
        : {
            compositeFilter: {
              op: 'AND',
              filters: filters.map((f) => ({
                fieldFilter: {
                  field: { fieldPath: f.field },
                  op: f.op,
                  value: toFirestoreValue(f.value),
                },
              })),
            },
          },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) return [];
  const results = await res.json() as Array<{ document?: { name: string; fields: Record<string, Record<string, unknown>> } }>;
  return results
    .filter((r) => r.document)
    .map((r) => docFromFirestoreRest(r.document!));
}

async function firestorePatch(path: string, fields: Record<string, unknown>): Promise<void> {
  function toFirestoreValue(val: unknown): unknown {
    if (typeof val === 'string') return { stringValue: val };
    if (typeof val === 'number' && Number.isInteger(val)) return { integerValue: String(val) };
    if (typeof val === 'number') return { doubleValue: val };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (val === null || val === undefined) return { nullValue: null };
    if (val instanceof Date) return { timestampValue: val.toISOString() };
    if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
    if (typeof val === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(val as Record<string, unknown>).map(([k, v]) => [k, toFirestoreValue(v)])) } };
    return { stringValue: String(val) };
  }

  const firestoreFields: Record<string, unknown> = {};
  const updateMask: string[] = [];
  for (const [key, val] of Object.entries(fields)) {
    firestoreFields[key] = toFirestoreValue(val);
    updateMask.push(key);
  }

  const url = firestoreUrl(path) + '&updateMask.fieldPaths=' + updateMask.join('&updateMask.fieldPaths=');
  await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: firestoreFields }),
  });
}

// ── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId requis' }, { status: 400 });
    }

    // Récupérer la campagne via REST
    const campaign = await firestoreGet(`campaigns/${campaignId}`) as unknown as Campaign & { id: string };
    if (!campaign) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 });
    }

    // Récupérer les paramètres SMTP via REST
    const settings = await firestoreGet('settings/main');
    if (!settings?.smtp) {
      return NextResponse.json(
        { error: 'SMTP non configuré. Allez dans Paramètres > Configuration email.' },
        { status: 400 }
      );
    }
    const smtpSettings = settings.smtp as SmtpSettings;

    // Récupérer les contacts actifs de la liste via REST
    const contactDocs = await firestoreQuery('contacts', [
      { field: 'lists', op: 'ARRAY_CONTAINS', value: campaign.listId },
      { field: 'status', op: 'EQUAL', value: 'active' },
    ]);

    const contacts = contactDocs as unknown as Contact[];

    if (contacts.length === 0) {
      return NextResponse.json({ error: 'Aucun contact actif dans cette liste' }, { status: 400 });
    }

    // Vérifier la connexion SMTP avant de démarrer
    const testResult = await testSmtpConnection(smtpSettings);
    if (!testResult.success) {
      await firestorePatch(`campaigns/${campaignId}`, {
        status: 'failed',
        errorMessage: `Erreur SMTP : ${testResult.error}`,
      });
      return NextResponse.json(
        { error: `Échec SMTP : ${testResult.error}. Vérifiez Paramètres > Configuration email.` },
        { status: 400 }
      );
    }
    // Lancer le traitement et attendre sa réalisation (requis sur Serverless Vercel)
    try {
      await processCampaignBatch(campaign, contacts, smtpSettings);
    } catch (err) {
      console.error('[send] Batch error:', err);
      await firestorePatch(`campaigns/${campaignId}`, {
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json({ error: 'Erreur lors de l’envoi des emails' }, { status: 500 });
    }

    return NextResponse.json({ success: true, totalContacts: contacts.length });
  } catch (err) {
    console.error('[api/campaigns/send]', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
