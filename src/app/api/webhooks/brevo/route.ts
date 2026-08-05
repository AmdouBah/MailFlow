import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbSet, dbPatch, dbQuery } from '@/lib/firebase/firestoreRest';
import { generateAiReply } from '@/lib/ai/reply';
import { createTransporter, sendEmail } from '@/lib/email/smtp';
import type { AiSettings, SmtpSettings } from '@/types';

// Webhook Brevo Inbound Email
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log('[Brevo Webhook] Received payload:', JSON.stringify(payload).substring(0, 500));

    // Brevo Inbound Parse envoie souvent un tableau "items"
    const items = payload.items || [payload];

    for (const item of items) {
      // Ignorer les événements de tracking d'email (ouverture, clic, livraison...)
      const trackingEvents = ['opened', 'delivered', 'clicks', 'hard_bounce', 'soft_bounce', 'unsubscribed', 'blocked', 'spam', 'unique_opened'];
      if (item.event && trackingEvents.includes(item.event)) {
        console.log(`[Brevo Webhook] Ignored tracking event: ${item.event}`);
        continue;
      }

      const fromEmail = item.From?.Address || item.from?.email || item.email;
      const fromName = item.From?.Name || item.from?.name || '';
      const textBody = item.TextBody || item.text || item.HtmlBody || item.html || '';
      const subject = item.Subject || item.subject || '';

      if (!fromEmail || (!textBody && !item.inbound_email_processed)) continue;

      // 1. Essayer de trouver le contact dans la base de données
      const contacts = await dbQuery('contacts', [
        { field: 'email', op: 'EQUAL', value: fromEmail.toLowerCase().trim() }
      ]);
      
      const contact = contacts.length > 0 ? contacts[0] : null;
      const contactId = contact ? contact.id : `unknown_${Date.now()}`;
      
      // 2. Traitement IA (optionnel, selon paramètres)
      const settings = (await dbGet('settings/main') || {}) as Record<string, unknown>;
      const aiSettings = settings.ai as AiSettings;
      const smtpSettings = settings.smtp as SmtpSettings;
      
      const replyId = `reply_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      
      let aiResponse = '';
      let status = 'pending';
      
      // Si l'IA est activée
      if (aiSettings && aiSettings.apiKey && aiSettings.replyDelay !== 'disabled') {
        try {
          const aiResult = await generateAiReply({
            incomingMessage: textBody || '(Pas de texte)',
            contactName: fromName || (contact ? String(contact.firstName || '') : ''),
            aiSettings,
          });
          
          aiResponse = aiResult.response;
          status = aiSettings.supervisionMode ? 'pending' : 'sent';
        } catch (err) {
          console.error('[Brevo Webhook] Error generating AI reply:', err);
          const errMsg = err instanceof Error ? err.message : String(err);
          aiResponse = `[Erreur IA: ${errMsg.includes('Insufficient Balance') ? 'Solde insuffisant sur votre compte IA (DeepSeek/OpenAI)' : errMsg}]`;
          status = 'rejected';
        }
      }

      // 3. Enregistrer la réponse dans Firestore
      await dbSet(`aiReplies/${replyId}`, {
        contactId,
        contactEmail: fromEmail,
        contactName: fromName,
        incomingMessage: textBody,
        subject,
        aiResponse,
        status,
        createdAt: new Date().toISOString(),
      });

      // 4. Si pas de supervision et IA a répondu, on envoie immédiatement (ou avec délai)
      if (aiResponse && status === 'sent') {
        const senderSettings = (settings.sender as { name?: string; email?: string }) || {};
        
        // Délai configurable
        const delayMap: Record<string, number> = {
          immediate: 0,
          '5min': 5 * 60 * 1000,
          '15min': 15 * 60 * 1000,
          '1h': 60 * 60 * 1000,
        };
        const delay = delayMap[aiSettings.replyDelay] || 0;

        const doSend = async () => {
          try {
            const transporter = await createTransporter(smtpSettings);
            await sendEmail(transporter, {
              to: fromEmail,
              subject: `Re: ${subject}`,
              html: `<p>${aiResponse.replace(/\n/g, '<br/>')}</p>`,
              fromName: senderSettings.name || 'Support',
              fromEmail: senderSettings.email || smtpSettings.user || '',
            });

            await dbPatch(`aiReplies/${replyId}`, {
              status: 'sent',
              sentAt: new Date().toISOString(),
            });
          } catch (err) {
            console.error('[sendAiReply Webhook]', err);
          }
        };

        if (delay > 0) {
          // Note: Sur Vercel Serverless (Hobby), setTimeout ne survivra pas après la réponse.
          // C'est mieux d'envoyer tout de suite si on est sur la version gratuite.
          await doSend();
        } else {
          await doSend();
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/webhooks/brevo]', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
