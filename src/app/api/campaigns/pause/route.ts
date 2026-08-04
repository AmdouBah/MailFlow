import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { campaignId, action } = await request.json();
    if (!campaignId) return NextResponse.json({ error: 'campaignId requis' }, { status: 400 });

    const db = getAdminDb();
    const newStatus = action === 'resume' ? 'sending' : 'paused';
    await db.collection('campaigns').doc(campaignId).update({
      status: newStatus,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
