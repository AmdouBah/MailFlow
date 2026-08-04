import nodemailer from 'nodemailer';
import type { SmtpSettings } from '@/types';
import { decrypt } from '@/lib/utils/crypto';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName: string;
  fromEmail: string;
  messageId?: string;
  headers?: Record<string, string>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function getDecryptedValue(val?: string): string {
  if (!val) return '';
  const decrypted = decrypt(val);
  return decrypted ? decrypted : val;
}

export async function createTransporter(settings: SmtpSettings): Promise<nodemailer.Transporter> {
  const password = getDecryptedValue(settings.password);
  const apiKey = getDecryptedValue(settings.apiKey);

  switch (settings.provider) {
    case 'gmail': {
      const passRaw = password || apiKey;
      const passClean = passRaw.replace(/\s+/g, '');
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: settings.user?.trim(),
          pass: passClean,
        },
      });
    }

    case 'brevo':
      return nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: { user: settings.user?.trim()!, pass: apiKey || password },
      });

    case 'resend':
      return nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 587,
        secure: false,
        auth: { user: 'resend', pass: apiKey },
      });

    case 'ses': {
      const region = settings.awsRegion || 'eu-west-1';
      const accessKey = getDecryptedValue(settings.awsAccessKey);
      const secretKey = getDecryptedValue(settings.awsSecretKey);
      return nodemailer.createTransport({
        host: `email-smtp.${region}.amazonaws.com`,
        port: 587,
        secure: false,
        auth: { user: accessKey, pass: secretKey },
      });
    }

    case 'custom':
    default:
      return nodemailer.createTransport({
        host: settings.host!,
        port: settings.port || 587,
        secure: settings.secure || settings.port === 465,
        auth: settings.user
          ? { user: settings.user, pass: password }
          : undefined,
      });
  }
}

export async function sendEmail(
  transporter: nodemailer.Transporter,
  options: SendEmailOptions
): Promise<SendResult> {
  try {
    const info = await transporter.sendMail({
      from: `"${options.fromName}" <${options.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      messageId: options.messageId,
      headers: {
        'X-Mailer': 'MailFlow',
        ...options.headers,
      },
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inconnue',
    };
  }
}

export async function testSmtpConnection(settings: SmtpSettings): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = await createTransporter(settings);
    await transporter.verify();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Connexion échouée',
    };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
