import { NextRequest, NextResponse } from 'next/server';
import { dbPatch } from '@/lib/firebase/firestoreRest';

export async function POST(request: NextRequest) {
  try {
    const { campaignId, action } = await request.json();
    if (!campaignId) return NextResponse.json({ error: 'campaignId requis' }, { status: 400 });

    const newStatus = action === 'resume' ? 'sending' : 'paused';
    await dbPatch(`campaigns/${campaignId}`, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    console.error('[campaigns/pause]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
