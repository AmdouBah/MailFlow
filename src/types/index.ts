// ─── Types Firestore ─────────────────────────────────────────────────────────

export type ContactStatus = 'active' | 'unsubscribed' | 'bounced' | 'invalid';

export interface Contact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  status: ContactStatus;
  lists: string[];
  customFields: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactList {
  id: string;
  name: string;
  description?: string;
  contactCount: number;
  createdAt: Date;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';

export interface CampaignStats {
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  replied: number;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  listId: string;
  listName?: string;
  templateId?: string;
  htmlContent: string;
  textContent?: string;
  status: CampaignStatus;
  scheduledAt?: Date;
  sentAt?: Date;
  stats: CampaignStats;
  batchProgress?: {
    total: number;
    sent: number;
    failed: number;
    currentBatch: number;
  };
  createdAt: Date;
  updatedAt?: Date;
}

export type EmailStatus = 'pending' | 'sent' | 'opened' | 'clicked' | 'bounced' | 'failed';

export interface EmailRecord {
  id: string;
  campaignId: string;
  contactId: string;
  email: string;
  status: EmailStatus;
  sentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  messageId?: string;
  trackingPixelId: string;
  unsubscribeToken: string;
  clickTrackingIds?: string[];
}

export type AiReplyStatus = 'pending' | 'approved' | 'sent' | 'rejected';

export interface AiReply {
  id: string;
  campaignId: string;
  contactId: string;
  contactEmail: string;
  contactName?: string;
  originalEmailId: string;
  incomingMessage: string;
  aiResponse: string;
  status: AiReplyStatus;
  sentAt?: Date;
  createdAt: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  htmlContent: string;
  previewText?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export type SmtpProvider = 'gmail' | 'brevo' | 'ses' | 'resend' | 'custom';

export interface SmtpSettings {
  provider: SmtpProvider;
  host?: string;
  port?: number;
  user?: string;
  password?: string;  // chiffré
  apiKey?: string;    // chiffré
  secure?: boolean;
  // AWS SES
  awsRegion?: string;
  awsAccessKey?: string;  // chiffré
  awsSecretKey?: string;  // chiffré
}

export type AiProvider = 'gemini' | 'openai' | 'anthropic' | 'custom';
export type AiReplyDelay = 'immediate' | '5min' | '15min' | '1h' | 'disabled';
export type AiLanguage = 'fr' | 'en' | 'auto';

export interface AiSettings {
  provider: AiProvider;
  apiKey: string;       // chiffré
  customEndpoint?: string;
  businessContext: string;
  replyDelay: AiReplyDelay;
  language: AiLanguage;
  supervisionMode: boolean;
}

export interface SenderSettings {
  name: string;
  email: string;
}

export interface AppSettings {
  smtp: SmtpSettings;
  ai: AiSettings;
  sender: SenderSettings;
}

// ─── Import CSV ───────────────────────────────────────────────────────────────

export interface CsvRow {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  [key: string]: string | undefined;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  errors: number;
  errorDetails: string[];
}

// ─── Tracking ─────────────────────────────────────────────────────────────────

export interface TrackingEvent {
  type: 'open' | 'click';
  emailId: string;
  campaignId: string;
  contactId: string;
  timestamp: Date;
  ipHash?: string;
  url?: string; // pour les clics
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface GlobalStats {
  totalContacts: number;
  activeCampaigns: number;
  emailsSentThisMonth: number;
  avgOpenRate: number;
}

export interface DailyOpenData {
  date: string;
  opens: number;
  clicks: number;
  sent: number;
}
