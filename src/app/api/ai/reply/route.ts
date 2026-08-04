import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { generateAiReply } from '@/lib/ai/reply';
import { createTransporter, sendEmail } from '@/lib/email/smtp';
import { Timestamp } from 'firebase-admin/firestore';
import type { AiSettings, SmtpSettings } from '@/types';

// POST /api/ai/reply
// Payload: { contactId, contactEmail, contactName, incomingMessage, campaignId, originalEmailId }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, contactEmail, contactName, incomingMessage, campaignId, originalEmailId } = body;

    const db = getAdminDb();
    const settingsSnap = await db.collection('settings').doc('main').get();
    const settings = settingsSnap.data() || {};

    const aiSettings = settings.ai as AiSettings;
    const smtpSettings = settings.smtp as SmtpSettings;
    const senderSettings = settings.sender || {};

    if (!aiSettings || !aiSettings.apiKey || aiSettings.replyDelay === 'disabled') {
      return NextResponse.json({ error: 'IA désactivée ou non configurée' }, { status: 400 });
    }

    // Générer la réponse IA
    const aiResult = await generateAiReply({
      incomingMessage,
      contactName,
      aiSettings,
    });

    // Créer le log dans Firestore
    const replyRef = await db.collection('aiReplies').add({
      campaignId,
      contactId,
      contactEmail,
      contactName: contactName || '',
      originalEmailId,
      incomingMessage,
      aiResponse: aiResult.response,
      status: aiSettings.supervisionMode ? 'pending' : 'sent',
      createdAt: Timestamp.now(),
    });

    // Incrémenter stats campagne (replied)
    if (campaignId) {
      const campRef = db.collection('campaigns').doc(campaignId);
      const campSnap = await campRef.get();
      if (campSnap.exists) {
        await campRef.update({
          'stats.replied': (campSnap.data()?.stats?.replied || 0) + 1,
        });
      }
    }

    // Si mode supervision → ne pas envoyer automatiquement
    if (aiSettings.supervisionMode) {
      return NextResponse.json({ status: 'pending_approval', replyId: replyRef.id });
    }

    // Délai configurable
    const delayMap: Record<string, number> = {
      immediate: 0,
      '5min': 5 * 60 * 1000,
      '15min': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
    };
    const delay = delayMap[aiSettings.replyDelay] || 0;

    if (delay > 0) {
      setTimeout(() => sendAiReply(replyRef.id, db, smtpSettings, senderSettings, contactEmail, aiResult.response), delay);
    } else {
      await sendAiReply(replyRef.id, db, smtpSettings, senderSettings, contactEmail, aiResult.response);
    }

    return NextResponse.json({ status: 'sent', replyId: replyRef.id });
  } catch (err) {
    console.error('[api/ai/reply]', err);
    return NextResponse.json({ error: 'Erreur IA' }, { status: 500 });
  }
}

async function sendAiReply(
  replyId: string,
  db: FirebaseFirestore.Firestore,
  smtpSettings: SmtpSettings,
  senderSettings: { name?: string; email?: string },
  contactEmail: string,
  aiResponse: string
) {
  try {
    const transporter = await createTransporter(smtpSettings);
    await sendEmail(transporter, {
      to: contactEmail,
      subject: 'Re: Votre message',
      html: `<p>${aiResponse.replace(/\n/g, '<br/>')}</p>`,
      fromName: senderSettings.name || 'Support',
      fromEmail: senderSettings.email || 'no-reply@mailflow.app',
    });

    await db.collection('aiReplies').doc(replyId).update({
      status: 'sent',
      sentAt: Timestamp.now(),
    });
  } catch (err) {
    console.error('[sendAiReply]', err);
  }
}
