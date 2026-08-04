import { NextRequest, NextResponse } from 'next/server';
import { dbPatch } from '@/lib/firebase/firestoreRest';

export async function POST(request: NextRequest) {
  try {
    const { campaignId, scheduledAt } = await request.json();
    if (!campaignId || !scheduledAt) {
      return NextResponse.json({ error: 'campaignId et scheduledAt requis' }, { status: 400 });
    }

    await dbPatch(`campaigns/${campaignId}`, {
      status: 'scheduled',
      scheduledAt: new Date(scheduledAt).toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[campaigns/schedule]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
