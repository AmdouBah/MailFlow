import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbSet, dbPatch } from '@/lib/firebase/firestoreRest';
import { generateAiReply } from '@/lib/ai/reply';
import { createTransporter, sendEmail } from '@/lib/email/smtp';
import type { AiSettings, SmtpSettings } from '@/types';

// POST /api/ai/reply
// Payload: { contactId, contactEmail, contactName, incomingMessage, campaignId, originalEmailId }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, contactEmail, contactName, incomingMessage, campaignId, originalEmailId } = body;

    const settings = await dbGet('settings/main') || {};
    const aiSettings = settings.ai as AiSettings;
    const smtpSettings = settings.smtp as SmtpSettings;
    const senderSettings = (settings.sender as { name?: string; email?: string }) || {};

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
    const replyId = `reply_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await dbSet(`aiReplies/${replyId}`, {
      campaignId,
      contactId,
      contactEmail,
      contactName: contactName || '',
      originalEmailId,
      incomingMessage,
      aiResponse: aiResult.response,
      status: aiSettings.supervisionMode ? 'pending' : 'sent',
      createdAt: new Date().toISOString(),
    });

    // Incrémenter stats campagne (replied)
    if (campaignId) {
      const camp = await dbGet(`campaigns/${campaignId}`);
      if (camp) {
        const stats = (camp.stats as Record<string, number>) || {};
        await dbPatch(`campaigns/${campaignId}`, {
          'stats.replied': (stats.replied || 0) + 1,
        });
      }
    }

    // Si mode supervision → ne pas envoyer automatiquement
    if (aiSettings.supervisionMode) {
      return NextResponse.json({ status: 'pending_approval', replyId });
    }

    // Délai configurable
    const delayMap: Record<string, number> = {
      immediate: 0,
      '5min': 5 * 60 * 1000,
      '15min': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
    };
    const delay = delayMap[aiSettings.replyDelay] || 0;

    const doSend = () => sendAiReply(replyId, smtpSettings, senderSettings, contactEmail, aiResult.response);

    if (delay > 0) {
      setTimeout(doSend, delay);
    } else {
      await doSend();
    }

    return NextResponse.json({ status: 'sent', replyId });
  } catch (err) {
    console.error('[api/ai/reply]', err);
    return NextResponse.json({ error: 'Erreur IA' }, { status: 500 });
  }
}

async function sendAiReply(
  replyId: string,
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

    await dbPatch(`aiReplies/${replyId}`, {
      status: 'sent',
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[sendAiReply]', err);
  }
}
