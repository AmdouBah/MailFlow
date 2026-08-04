import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { getSettings } from '@/lib/firebase/firestore';
import { processCampaignBatch } from '@/lib/email/batch';
import { getContactsByList } from '@/lib/firebase/firestore';
import type { Campaign, SmtpSettings } from '@/types';

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
    const contacts = await getContactsByList(campaign.listId);
    if (contacts.length === 0) {
      return NextResponse.json({ error: 'Aucun contact actif dans cette liste' }, { status: 400 });
    }

    // Lancer le traitement en arrière-plan (ne pas attendre la fin)
    processCampaignBatch(campaign, contacts, smtpSettings).catch((err) => {
      console.error('[send] Batch error:', err);
      db.collection('campaigns').doc(campaignId).update({ status: 'paused' });
    });

    return NextResponse.json({ success: true, totalContacts: contacts.length });
  } catch (err) {
    console.error('[api/campaigns/send]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
