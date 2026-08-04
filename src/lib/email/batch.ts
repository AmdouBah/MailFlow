import { getAdminDb } from '@/lib/firebase/admin';
import { createTransporter, sendEmail } from './smtp';
import { prepareEmailHtml, buildVariablesFromContact } from './templates';
import { generateToken } from '@/lib/utils/crypto';
import type { Contact, Campaign, SmtpSettings } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';

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
  const db = getAdminDb();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const transporter = await createTransporter(smtpSettings);
  const totalContacts = contacts.length;
  let totalSent = 0;
  let totalFailed = 0;
  let lastError = '';

  // Mettre à jour le statut en "sending"
  await db.collection('campaigns').doc(campaign.id).update({
    status: 'sending',
    batchProgress: { total: totalContacts, sent: 0, failed: 0, currentBatch: 0 },
    updatedAt: Timestamp.now(),
  });

  const batches = [];
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    batches.push(contacts.slice(i, i + BATCH_SIZE));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    // Vérifier si la campagne est en pause
    const campaignSnap = await db.collection('campaigns').doc(campaign.id).get();
    if (campaignSnap.data()?.status === 'paused' || campaignSnap.data()?.status === 'cancelled') {
      return;
    }

    const batch = batches[batchIndex];

    // Mettre à jour la progression
    await db.collection('campaigns').doc(campaign.id).update({
      'batchProgress.currentBatch': batchIndex + 1,
    });

    // Envoyer les emails du batch en parallèle
    const batchWriteBatch = db.batch();
    
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

        const emailRef = db.collection('emails').doc(emailId);
        if (result.success) {
          totalSent++;
          batchWriteBatch.set(emailRef, {
            campaignId: campaign.id,
            contactId: contact.id,
            email: contact.email,
            status: 'sent',
            sentAt: Timestamp.now(),
            messageId: result.messageId || '',
            trackingPixelId,
            unsubscribeToken,
          });
        } else {
          totalFailed++;
          lastError = result.error || 'Erreur inconnue SMTP';
          batchWriteBatch.set(emailRef, {
            campaignId: campaign.id,
            contactId: contact.id,
            email: contact.email,
            status: 'failed',
            sentAt: Timestamp.now(),
            errorMessage: result.error,
            trackingPixelId,
            unsubscribeToken,
          });
        }
      })
    );

    await batchWriteBatch.commit();

    // Mettre à jour les stats globales de la campagne
    await db.collection('campaigns').doc(campaign.id).update({
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
  const updateData: Record<string, any> = {
    status: finalStatus,
    'stats.sent': totalSent,
    'stats.failed': totalFailed,
    updatedAt: Timestamp.now(),
  };

  if (totalSent > 0) {
    updateData.sentAt = Timestamp.now();
  }
  if (totalSent === 0 && totalFailed > 0) {
    updateData.errorMessage = lastError || "Échec de l'envoi SMTP (vérifiez vos identifiants en Paramètres > Configuration email)";
  }

  await db.collection('campaigns').doc(campaign.id).update(updateData);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
