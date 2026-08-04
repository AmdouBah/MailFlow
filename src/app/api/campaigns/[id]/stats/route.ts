import { NextRequest, NextResponse } from 'next/server';
import { dbGet } from '@/lib/firebase/firestoreRest';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignData = await dbGet(`campaigns/${params.id}`);
    if (!campaignData) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 });
    }

    const stats = (campaignData.stats as Record<string, number>) || {};
    const sent = stats.sent || 0;

    return NextResponse.json({
      id: params.id,
      name: campaignData.name,
      status: campaignData.status,
      stats: {
        sent,
        opened: stats.opened || 0,
        clicked: stats.clicked || 0,
        bounced: stats.bounced || 0,
        unsubscribed: stats.unsubscribed || 0,
        replied: stats.replied || 0,
        openRate: sent > 0 ? Math.round(((stats.opened || 0) / sent) * 100) : 0,
        clickRate: sent > 0 ? Math.round(((stats.clicked || 0) / sent) * 100) : 0,
      },
    });
  } catch (err) {
    console.error('[campaigns/stats]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
