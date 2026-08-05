import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  writeBatch,
  onSnapshot,
  QueryConstraint,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from './config';
import type {
  Contact,
  ContactList,
  Campaign,
  EmailRecord,
  AiReply,
  EmailTemplate,
  AppSettings,
  ImportResult,
  CsvRow,
  GlobalStats,
  DailyOpenData,
} from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Timestamp) return val.toDate();
  if (typeof (val as { toDate?: () => Date })?.toDate === 'function') return (val as { toDate: () => Date }).toDate();
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (val instanceof Date) return val;
  return new Date();
}

function contactFromDoc(doc: QueryDocumentSnapshot<DocumentData>): Contact {
  const d = doc.data();
  return {
    id: doc.id,
    email: d.email,
    firstName: d.firstName || '',
    lastName: d.lastName || '',
    phone: d.phone,
    company: d.company,
    status: d.status || 'active',
    lists: d.lists || [],
    customFields: d.customFields || {},
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

function campaignFromDoc(doc: QueryDocumentSnapshot<DocumentData>): Campaign {
  const d = doc.data();
  return {
    id: doc.id,
    name: d.name,
    subject: d.subject,
    fromName: d.fromName,
    fromEmail: d.fromEmail,
    listId: d.listId,
    listName: d.listName,
    templateId: d.templateId,
    htmlContent: d.htmlContent || '',
    textContent: d.textContent,
    status: d.status || 'draft',
    scheduledAt: d.scheduledAt ? toDate(d.scheduledAt) : undefined,
    sentAt: d.sentAt ? toDate(d.sentAt) : undefined,
    stats: d.stats || { sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, replied: 0 },
    batchProgress: d.batchProgress,
    createdAt: toDate(d.createdAt),
    updatedAt: d.updatedAt ? toDate(d.updatedAt) : undefined,
  };
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function getContacts(
  pageSize = 50,
  lastDoc?: QueryDocumentSnapshot<DocumentData>,
  filters?: { status?: string; listId?: string }
): Promise<{ contacts: Contact[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(pageSize)];

  if (filters?.status) constraints.push(where('status', '==', filters.status));
  if (filters?.listId) constraints.push(where('lists', 'array-contains', filters.listId));
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const q = query(collection(db, 'contacts'), ...constraints);
  const snap = await getDocs(q);
  const docs = snap.docs;

  return {
    contacts: docs.map(contactFromDoc),
    lastDoc: docs.length === pageSize ? docs[docs.length - 1] : null,
  };
}

export async function getContactByEmail(email: string): Promise<Contact | null> {
  const q = query(collection(db, 'contacts'), where('email', '==', email.toLowerCase()), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return contactFromDoc(snap.docs[0]);
}

export async function getContactByUnsubscribeToken(token: string): Promise<Contact | null> {
  // Le token est stocké dans les emails, on cherche via emailRecord
  const q = query(collection(db, 'emails'), where('unsubscribeToken', '==', token), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const emailDoc = snap.docs[0].data();
  const contactDoc = await getDoc(doc(db, 'contacts', emailDoc.contactId));
  if (!contactDoc.exists()) return null;
  return contactFromDoc(contactDoc as QueryDocumentSnapshot<DocumentData>);
}

export async function createContact(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'contacts'), {
    ...data,
    email: data.email.toLowerCase(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // Mettre à jour le contactCount des listes associées
  if (data.lists && data.lists.length > 0) {
    for (const listId of data.lists) {
      try {
        const listRef = doc(db, 'lists', listId);
        const listDoc = await getDoc(listRef);
        if (listDoc.exists()) {
          const count = (listDoc.data().contactCount || 0) + 1;
          await updateDoc(listRef, { contactCount: count });
        }
      } catch (e) {
        console.error('Erreur mise à jour contactCount:', e);
      }
    }
  }

  return ref.id;
}

export async function updateContact(id: string, data: Partial<Contact>): Promise<void> {
  await updateDoc(doc(db, 'contacts', id), { ...data, updatedAt: Timestamp.now() });
}

export async function deleteContact(id: string): Promise<void> {
  const contactDoc = await getDoc(doc(db, 'contacts', id));
  if (contactDoc.exists()) {
    const data = contactDoc.data();
    await deleteDoc(doc(db, 'contacts', id));
    if (data.lists && Array.isArray(data.lists)) {
      for (const listId of data.lists) {
        try {
          const listRef = doc(db, 'lists', listId);
          const listDoc = await getDoc(listRef);
          if (listDoc.exists()) {
            const count = Math.max(0, (listDoc.data().contactCount || 1) - 1);
            await updateDoc(listRef, { contactCount: count });
          }
        } catch (e) {
          console.error('Erreur mise à jour contactCount:', e);
        }
      }
    }
  } else {
    await deleteDoc(doc(db, 'contacts', id));
  }
}

export async function importContacts(rows: CsvRow[], listIds: string[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, duplicates: 0, errors: 0, errorDetails: [] };
  const batch = writeBatch(db);
  let batchCount = 0;

  for (const row of rows) {
    try {
      if (!row.email || !row.email.includes('@')) {
        result.errors++;
        result.errorDetails.push(`Email invalide : ${row.email}`);
        continue;
      }

      const existing = await getContactByEmail(row.email);
      if (existing) {
        result.duplicates++;
        continue;
      }

      const { email, firstName, lastName, phone, company, ...rest } = row;
      const ref = doc(collection(db, 'contacts'));
      batch.set(ref, {
        email: email.toLowerCase(),
        firstName: firstName || '',
        lastName: lastName || '',
        phone: phone || '',
        company: company || '',
        status: 'active',
        lists: listIds,
        customFields: Object.fromEntries(
          Object.entries(rest).filter(([, v]) => v !== undefined && v !== '')
        ),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      batchCount++;
      result.imported++;

      // Firestore limit: 500 ops per batch
      if (batchCount === 400) {
        await batch.commit();
        batchCount = 0;
      }
    } catch (err) {
      result.errors++;
      result.errorDetails.push(`Erreur pour ${row.email}: ${err}`);
    }
  }

  if (batchCount > 0) await batch.commit();

  // Mettre à jour les compteurs des listes
  for (const listId of listIds) {
    const listSnap = await getDoc(doc(db, 'lists', listId));
    if (listSnap.exists()) {
      await updateDoc(doc(db, 'lists', listId), {
        contactCount: (listSnap.data().contactCount || 0) + result.imported,
      });
    }
  }

  return result;
}

export async function unsubscribeContact(contactId: string): Promise<void> {
  await updateDoc(doc(db, 'contacts', contactId), {
    status: 'unsubscribed',
    updatedAt: Timestamp.now(),
  });
}

// ─── Lists ────────────────────────────────────────────────────────────────────

export async function getLists(): Promise<ContactList[]> {
  const snap = await getDocs(query(collection(db, 'lists'), orderBy('createdAt', 'desc')));
  // Use stored contactCount directly — no N+1 queries
  return snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    description: d.data().description,
    contactCount: d.data().contactCount || 0,
    createdAt: toDate(d.data().createdAt),
  }));
}

export async function refreshListCount(listId: string): Promise<void> {
  try {
    const countSnap = await getCountFromServer(
      query(
        collection(db, 'contacts'),
        where('lists', 'array-contains', listId),
        where('status', '==', 'active')
      )
    );
    await updateDoc(doc(db, 'lists', listId), { contactCount: countSnap.data().count });
  } catch {
    // silencieux
  }
}

export async function createList(name: string, description?: string): Promise<string> {
  const ref = await addDoc(collection(db, 'lists'), {
    name,
    description: description || '',
    contactCount: 0,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateList(id: string, data: Partial<ContactList>): Promise<void> {
  await updateDoc(doc(db, 'lists', id), data);
}

export async function deleteList(id: string): Promise<void> {
  await deleteDoc(doc(db, 'lists', id));
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export async function getCampaigns(): Promise<Campaign[]> {
  const snap = await getDocs(query(collection(db, 'campaigns'), orderBy('createdAt', 'desc')));
  return snap.docs.map(campaignFromDoc);
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const snap = await getDoc(doc(db, 'campaigns', id));
  if (!snap.exists()) return null;
  return campaignFromDoc(snap as QueryDocumentSnapshot<DocumentData>);
}

export async function createCampaign(data: Omit<Campaign, 'id' | 'createdAt' | 'stats'>): Promise<string> {
  const ref = await addDoc(collection(db, 'campaigns'), {
    ...data,
    stats: { sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, replied: 0 },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateCampaign(id: string, data: Partial<Campaign>): Promise<void> {
  await updateDoc(doc(db, 'campaigns', id), { ...data, updatedAt: Timestamp.now() });
}

export function subscribeToCampaign(id: string, callback: (c: Campaign) => void) {
  return onSnapshot(doc(db, 'campaigns', id), (snap) => {
    if (snap.exists()) callback(campaignFromDoc(snap as QueryDocumentSnapshot<DocumentData>));
  });
}

// ─── Email Records ────────────────────────────────────────────────────────────

export async function getCampaignEmails(campaignId: string): Promise<EmailRecord[]> {
  const snap = await getDocs(
    query(collection(db, 'emails'), where('campaignId', '==', campaignId), orderBy('sentAt', 'desc'))
  );
  return snap.docs.map((d) => ({
    id: d.id,
    campaignId: d.data().campaignId,
    contactId: d.data().contactId,
    email: d.data().email,
    status: d.data().status,
    sentAt: d.data().sentAt ? toDate(d.data().sentAt) : undefined,
    openedAt: d.data().openedAt ? toDate(d.data().openedAt) : undefined,
    clickedAt: d.data().clickedAt ? toDate(d.data().clickedAt) : undefined,
    bouncedAt: d.data().bouncedAt ? toDate(d.data().bouncedAt) : undefined,
    messageId: d.data().messageId,
    trackingPixelId: d.data().trackingPixelId,
    unsubscribeToken: d.data().unsubscribeToken,
  }));
}

export async function getEmailByTrackingId(trackingPixelId: string): Promise<EmailRecord | null> {
  const q = query(collection(db, 'emails'), where('trackingPixelId', '==', trackingPixelId), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0].data();
  return { id: snap.docs[0].id, ...d } as EmailRecord;
}

export async function markEmailOpened(emailId: string, campaignId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'emails', emailId), {
    status: 'opened',
    openedAt: Timestamp.now(),
  });
  // Incrémenter stats campagne
  const campRef = doc(db, 'campaigns', campaignId);
  const campSnap = await getDoc(campRef);
  if (campSnap.exists()) {
    const stats = campSnap.data().stats || {};
    batch.update(campRef, { 'stats.opened': (stats.opened || 0) + 1 });
  }
  await batch.commit();
}

export async function markEmailClicked(emailId: string, campaignId: string): Promise<void> {
  const emailRef = doc(db, 'emails', emailId);
  const emailSnap = await getDoc(emailRef);
  if (!emailSnap.exists()) return;

  const batch = writeBatch(db);
  batch.update(emailRef, { status: 'clicked', clickedAt: Timestamp.now() });

  const campRef = doc(db, 'campaigns', campaignId);
  const campSnap = await getDoc(campRef);
  if (campSnap.exists()) {
    const stats = campSnap.data().stats || {};
    batch.update(campRef, { 'stats.clicked': (stats.clicked || 0) + 1 });
  }
  await batch.commit();
}

// ─── AI Replies ───────────────────────────────────────────────────────────────

export async function getAiReplies(pageSize = 50): Promise<AiReply[]> {
  const snap = await getDocs(
    query(collection(db, 'aiReplies'), orderBy('createdAt', 'desc'), limit(pageSize))
  );
  return snap.docs.map((d) => ({
    id: d.id,
    campaignId: d.data().campaignId,
    contactId: d.data().contactId,
    contactEmail: d.data().contactEmail,
    contactName: d.data().contactName,
    originalEmailId: d.data().originalEmailId,
    incomingMessage: d.data().incomingMessage,
    aiResponse: d.data().aiResponse,
    status: d.data().status,
    sentAt: d.data().sentAt ? toDate(d.data().sentAt) : undefined,
    createdAt: toDate(d.data().createdAt),
  }));
}

export async function createAiReply(data: Omit<AiReply, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'aiReplies'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateAiReply(id: string, data: Partial<AiReply>): Promise<void> {
  await updateDoc(doc(db, 'aiReplies', id), data);
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function getTemplates(): Promise<EmailTemplate[]> {
  const snap = await getDocs(query(collection(db, 'templates'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    htmlContent: d.data().htmlContent,
    previewText: d.data().previewText,
    createdAt: toDate(d.data().createdAt),
    updatedAt: d.data().updatedAt ? toDate(d.data().updatedAt) : undefined,
  }));
}

export async function createTemplate(name: string, htmlContent: string, previewText?: string): Promise<string> {
  const ref = await addDoc(collection(db, 'templates'), {
    name,
    htmlContent,
    previewText: previewText || '',
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateTemplate(id: string, data: Partial<EmailTemplate>): Promise<void> {
  await updateDoc(doc(db, 'templates', id), { ...data, updatedAt: Timestamp.now() });
}

export async function deleteTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db, 'templates', id));
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Partial<AppSettings>> {
  const snap = await getDoc(doc(db, 'settings', 'main'));
  if (!snap.exists()) return {};
  return snap.data() as AppSettings;
}

export async function updateSettings(data: Partial<AppSettings>): Promise<void> {
  await setDoc(doc(db, 'settings', 'main'), data, { merge: true });
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getGlobalStats(): Promise<GlobalStats> {
  const [contactsSnap, campaignsSnap] = await Promise.all([
    getDocs(query(collection(db, 'contacts'), where('status', '==', 'active'))),
    getDocs(query(collection(db, 'campaigns'), where('status', 'in', ['sending', 'sent']))),
  ]);

  const activeCampaigns = campaignsSnap.docs.filter((d) => d.data().status === 'sending').length;
  
  // Emails envoyés ce mois
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let emailsThisMonth = 0;
  let totalOpened = 0;
  let totalSent = 0;

  for (const camp of campaignsSnap.docs) {
    const stats = camp.data().stats || {};
    totalSent += stats.sent || 0;
    totalOpened += stats.opened || 0;
    const sentAt = camp.data().sentAt;
    if (sentAt && toDate(sentAt) >= startOfMonth) {
      emailsThisMonth += stats.sent || 0;
    }
  }

  return {
    totalContacts: contactsSnap.size,
    activeCampaigns,
    emailsSentThisMonth: emailsThisMonth,
    avgOpenRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
  };
}

export async function getDailyOpenData(days = 30): Promise<DailyOpenData[]> {
  const result: DailyOpenData[] = [];
  const now = new Date();

  // Récupérer les emails des 30 derniers jours
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  const snap = await getDocs(
    query(
      collection(db, 'emails'),
      where('sentAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('sentAt', 'asc')
    )
  );

  // Grouper par jour
  const byDay: Record<string, DailyOpenData> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    byDay[key] = { date: key, opens: 0, clicks: 0, sent: 0 };
  }

  for (const emailDoc of snap.docs) {
    const data = emailDoc.data();
    const sentAt = data.sentAt ? toDate(data.sentAt) : null;
    if (!sentAt) continue;
    const key = sentAt.toISOString().split('T')[0];
    if (byDay[key]) {
      byDay[key].sent++;
      if (data.openedAt) byDay[key].opens++;
      if (data.clickedAt) byDay[key].clicks++;
    }
  }

  for (const key of Object.keys(byDay).sort()) {
    result.push(byDay[key]);
  }

  return result;
}

// ─── Contacts pour une campagne ───────────────────────────────────────────────

export async function getContactsByList(listId: string): Promise<Contact[]> {
  const snap = await getDocs(
    query(
      collection(db, 'contacts'),
      where('lists', 'array-contains', listId),
      where('status', '==', 'active')
    )
  );
  return snap.docs.map(contactFromDoc);
}
