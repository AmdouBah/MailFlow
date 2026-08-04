import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { processCampaignBatch } from '@/lib/email/batch';
import { testSmtpConnection } from '@/lib/email/smtp';
import type { Campaign, SmtpSettings, Contact } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId requis' }, { status: 400 });
    }

    const db = getAdminDb();

    // Récupérer la campagne
    const campaignSnap = await db.collection('campaigns').doc(campaignId).get();
    if (!campaignSnap.exists) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 });
    }
    const campaignData = campaignSnap.data() as Campaign;
    const campaign = { ...campaignData, id: campaignId };

    // Récupérer les paramètres SMTP
    const settingsSnap = await db.collection('settings').doc('main').get();
    if (!settingsSnap.exists || !settingsSnap.data()?.smtp) {
      return NextResponse.json(
        { error: 'SMTP non configuré. Allez dans Paramètres > Configuration email.' },
        { status: 400 }
      );
    }
    const smtpSettings = settingsSnap.data()!.smtp as SmtpSettings;

    // Récupérer les contacts actifs de la liste
    const contactsSnap = await db
      .collection('contacts')
      .where('lists', 'array-contains', campaign.listId)
      .where('status', '==', 'active')
      .get();

    const contacts = contactsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Contact[];

    if (contacts.length === 0) {
      return NextResponse.json({ error: 'Aucun contact actif dans cette liste' }, { status: 400 });
    }

    // Vérifier la connexion SMTP avant de démarrer l'envoi
    const testResult = await testSmtpConnection(smtpSettings);
    if (!testResult.success) {
      await db.collection('campaigns').doc(campaignId).update({
        status: 'failed',
        errorMessage: `Erreur SMTP : ${testResult.error}`,
      });
      return NextResponse.json(
        { error: `Échec SMTP : ${testResult.error}. Vérifiez Paramètres > Configuration email.` },
        { status: 400 }
      );
    }

    // Lancer le traitement en arrière-plan (ne pas attendre la fin)
    processCampaignBatch(campaign, contacts, smtpSettings).catch((err) => {
      console.error('[send] Batch error:', err);
      db.collection('campaigns').doc(campaignId).update({
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    });

    return NextResponse.json({ success: true, totalContacts: contacts.length });
  } catch (err) {
    console.error('[api/campaigns/send]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
