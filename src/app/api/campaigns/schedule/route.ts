import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { campaignId, scheduledAt } = await request.json();
    if (!campaignId || !scheduledAt) {
      return NextResponse.json({ error: 'campaignId et scheduledAt requis' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('campaigns').doc(campaignId).update({
      status: 'scheduled',
      scheduledAt: Timestamp.fromDate(new Date(scheduledAt)),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
