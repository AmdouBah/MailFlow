import { dbGet, dbPatch, dbSet } from '@/lib/firebase/firestoreRest';
import { createTransporter, sendEmail } from './smtp';
import { prepareEmailHtml, buildVariablesFromContact } from './templates';
import { generateToken } from '@/lib/utils/crypto';
import type { Contact, Campaign, SmtpSettings } from '@/types';

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

export interface BatchProgress {
  total: number;
  sent: number;
  failed: number;
  currentBatch: number;
}

/**
 * Traite l'envoi d'une campagne en batches de 50 emails.
 * Enregistre la progression dans Firestore pour le polling client.
 */
export async function processCampaignBatch(
  campaign: Campaign,
  contacts: Contact[],
  smtpSettings: SmtpSettings
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const transporter = await createTransporter(smtpSettings);
  const totalContacts = contacts.length;
  let totalSent = 0;
  let totalFailed = 0;
  let lastError = '';

  // Mettre à jour le statut en "sending"
  await dbPatch(`campaigns/${campaign.id}`, {
    status: 'sending',
    batchProgress: { total: totalContacts, sent: 0, failed: 0, currentBatch: 0 },
    updatedAt: new Date().toISOString(),
  });

  const batches: Contact[][] = [];
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    batches.push(contacts.slice(i, i + BATCH_SIZE));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    // Vérifier si la campagne est en pause
    const campaignDoc = await dbGet(`campaigns/${campaign.id}`);
    const currentStatus = campaignDoc?.status as string | undefined;
    if (currentStatus === 'paused' || currentStatus === 'cancelled') {
      return;
    }

    const batch = batches[batchIndex];

    // Mettre à jour la progression
    await dbPatch(`campaigns/${campaign.id}`, {
      'batchProgress.currentBatch': batchIndex + 1,
    });

    // Envoyer les emails du batch en parallèle
    await Promise.all(
      batch.map(async (contact) => {
        const trackingPixelId = generateToken(24);
        const unsubscribeToken = generateToken(32);
        const emailId = generateToken(20);

        const unsubscribeLink = `${appUrl}/api/unsubscribe?token=${unsubscribeToken}`;
        const trackingPixelUrl = `${appUrl}/api/track/open?id=${trackingPixelId}`;

        const variables = buildVariablesFromContact(contact, unsubscribeLink, trackingPixelUrl);
        const subject = campaign.subject.replace(/\{\{([^}]+)\}\}/g, (_, key) => variables[key.trim()] || '');

        const html = prepareEmailHtml(
          campaign.htmlContent,
          variables,
          trackingPixelUrl,
          appUrl,
          emailId
        );

        const result = await sendEmail(transporter, {
          to: contact.email,
          subject,
          html,
          fromName: campaign.fromName,
          fromEmail: campaign.fromEmail,
        });

        if (result.success) {
          totalSent++;
          await dbSet(`emails/${emailId}`, {
            campaignId: campaign.id,
            contactId: contact.id,
            email: contact.email,
            status: 'sent',
            sentAt: new Date().toISOString(),
            messageId: result.messageId || '',
            trackingPixelId,
            unsubscribeToken,
          });
        } else {
          totalFailed++;
          lastError = result.error || 'Erreur inconnue SMTP';
          await dbSet(`emails/${emailId}`, {
            campaignId: campaign.id,
            contactId: contact.id,
            email: contact.email,
            status: 'failed',
            sentAt: new Date().toISOString(),
            errorMessage: result.error,
            trackingPixelId,
            unsubscribeToken,
          });
        }
      })
    );

    // Mettre à jour les stats globales de la campagne
    await dbPatch(`campaigns/${campaign.id}`, {
      'batchProgress.sent': totalSent,
      'batchProgress.failed': totalFailed,
      'stats.sent': totalSent,
    });

    // Pause entre les batches (anti-spam)
    if (batchIndex < batches.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // Marquer la campagne comme envoyée ou échouée
  const finalStatus = totalSent > 0 ? 'sent' : 'failed';
  const updateData: Record<string, unknown> = {
    status: finalStatus,
    'stats.sent': totalSent,
    'stats.failed': totalFailed,
    updatedAt: new Date().toISOString(),
  };

  if (totalSent > 0) {
    updateData.sentAt = new Date().toISOString();
  }
  if (totalSent === 0 && totalFailed > 0) {
    updateData.errorMessage = lastError || "Échec de l'envoi SMTP. Vérifiez vos identifiants dans Paramètres > Configuration email.";
  }

  await dbPatch(`campaigns/${campaign.id}`, updateData);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
