/**
 * Firestore REST API Helper
 * 
 * Remplace Firebase Admin SDK pour les routes API Next.js.
 * Utilise la REST API Firestore avec la clé API publique Firebase,
 * ce qui fonctionne avec les Firestore Security Rules ouvertes.
 * 
 * Avantage : pas besoin de clé de service (service account) privée.
 */

const PROJECT_ID =
  process.env.FIREBASE_ADMIN_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  'mailflow-bah-app';

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function withKey(url: string): string {
  if (!API_KEY) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}key=${API_KEY}`;
}

// ── Value Converters ──────────────────────────────────────────────────────────

function fromFirestore(v: unknown): unknown {
  if (!v || typeof v !== 'object') return null;
  const [type, val] = Object.entries(v as Record<string, unknown>)[0];
  switch (type) {
    case 'stringValue': return val as string;
    case 'integerValue': return parseInt(val as string, 10);
    case 'doubleValue': return val as number;
    case 'booleanValue': return val as boolean;
    case 'nullValue': return null;
    case 'timestampValue': return new Date(val as string);
    case 'arrayValue':
      return ((val as { values?: unknown[] }).values || []).map(fromFirestore);
    case 'mapValue':
      return Object.fromEntries(
        Object.entries((val as { fields?: Record<string, unknown> }).fields || {}).map(
          ([k, fv]) => [k, fromFirestore(fv)]
        )
      );
    default: return val;
  }
}

function toFirestore(val: unknown): unknown {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestore) } };
  if (typeof val === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(val as Record<string, unknown>).map(([k, v]) => [k, toFirestore(v)])
        ),
      },
    };
  }
  return { stringValue: String(val) };
}

interface FirestoreDoc {
  name: string;
  fields: Record<string, unknown>;
}

function parseDoc(doc: FirestoreDoc): Record<string, unknown> & { id: string } {
  const id = doc.name.split('/').pop()!;
  const fields: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(doc.fields || {})) {
    fields[key] = fromFirestore(val);
  }
  return { id, ...fields };
}

// ── Public API ────────────────────────────────────────────────────────────────

export type DbDoc = Record<string, unknown> & { id: string };

/** GET a single document by path (e.g. "campaigns/abc123") */
export async function dbGet(path: string): Promise<DbDoc | null> {
  const res = await fetch(withKey(`${BASE}/${path}`));
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.fields) return null;
  return parseDoc(json);
}

/** LIST documents in a collection */
export async function dbList(collectionPath: string): Promise<DbDoc[]> {
  const res = await fetch(withKey(`${BASE}/${collectionPath}`));
  if (!res.ok) return [];
  const json = await res.json();
  if (!json.documents) return [];
  return (json.documents as FirestoreDoc[]).map(parseDoc);
}

/** QUERY documents with filters */
export async function dbQuery(
  collectionId: string,
  filters: Array<{ field: string; op: 'EQUAL' | 'ARRAY_CONTAINS' | 'NOT_EQUAL' | 'LESS_THAN' | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL'; value: unknown }>,
  orderBy?: { field: string; direction?: 'ASCENDING' | 'DESCENDING' },
  limitN?: number
): Promise<DbDoc[]> {
  const url = withKey(`${BASE}:runQuery`);

  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId }],
    where: filters.length === 1
      ? {
          fieldFilter: {
            field: { fieldPath: filters[0].field },
            op: filters[0].op,
            value: toFirestore(filters[0].value),
          },
        }
      : {
          compositeFilter: {
            op: 'AND',
            filters: filters.map((f) => ({
              fieldFilter: {
                field: { fieldPath: f.field },
                op: f.op,
                value: toFirestore(f.value),
              },
            })),
          },
        },
  };

  if (orderBy) {
    structuredQuery.orderBy = [{ field: { fieldPath: orderBy.field }, direction: orderBy.direction || 'ASCENDING' }];
  }
  if (limitN) {
    structuredQuery.limit = limitN;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery }),
  });

  if (!res.ok) return [];
  const results = await res.json() as Array<{ document?: FirestoreDoc }>;
  return results.filter((r) => r.document).map((r) => parseDoc(r.document!));
}

/** PATCH (update) a document — only updates specified fields */
export async function dbPatch(path: string, fields: Record<string, unknown>): Promise<void> {
  const firestoreFields: Record<string, unknown> = {};
  const updateMask: string[] = [];

  for (const [key, val] of Object.entries(fields)) {
    firestoreFields[key] = toFirestore(val);
    updateMask.push(`updateMask.fieldPaths=${encodeURIComponent(key)}`);
  }

  const url = `${withKey(`${BASE}/${path}`)}&${updateMask.join('&')}`;
  await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: firestoreFields }),
  });
}

/** SET (create or overwrite) a document */
export async function dbSet(path: string, fields: Record<string, unknown>): Promise<void> {
  const firestoreFields: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(fields)) {
    firestoreFields[key] = toFirestore(val);
  }
  await fetch(withKey(`${BASE}/${path}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: firestoreFields }),
  });
}
