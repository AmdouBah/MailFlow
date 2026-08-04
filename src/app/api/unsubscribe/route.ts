import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

// GET /api/unsubscribe?token=<unsubscribeToken>
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(`${appUrl}/unsubscribe?status=error`);
  }

  try {
    const db = getAdminDb();

    // Trouver l'email par son token de désinscription
    const emailSnap = await db
      .collection('emails')
      .where('unsubscribeToken', '==', token)
      .limit(1)
      .get();

    if (emailSnap.empty) {
      return NextResponse.redirect(`${appUrl}/unsubscribe?status=not_found`);
    }

    const emailData = emailSnap.docs[0].data();
    const contactId = emailData.contactId;
    const campaignId = emailData.campaignId;

    // Mettre à jour le statut du contact
    const contactRef = db.collection('contacts').doc(contactId);
    const contactSnap = await contactRef.get();

    if (!contactSnap.exists) {
      return NextResponse.redirect(`${appUrl}/unsubscribe?status=error`);
    }

    const currentStatus = contactSnap.data()?.status;
    
    if (currentStatus === 'unsubscribed') {
      return NextResponse.redirect(`${appUrl}/unsubscribe?status=already`);
    }

    const firestoreBatch = db.batch();
    
    firestoreBatch.update(contactRef, {
      status: 'unsubscribed',
      updatedAt: Timestamp.now(),
    });

    // Incrémenter les stats de désinscription
    const campRef = db.collection('campaigns').doc(campaignId);
    const campSnap = await campRef.get();
    if (campSnap.exists) {
      firestoreBatch.update(campRef, {
        'stats.unsubscribed': (campSnap.data()?.stats?.unsubscribed || 0) + 1,
      });
    }

    await firestoreBatch.commit();

    return NextResponse.redirect(`${appUrl}/unsubscribe?status=success`);
  } catch (err) {
    console.error('[unsubscribe]', err);
    return NextResponse.redirect(`${appUrl}/unsubscribe?status=error`);
  }
}
