import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getAdminDb();
    const campSnap = await db.collection('campaigns').doc(params.id).get();
    if (!campSnap.exists) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 });
    }

    const campaignData = campSnap.data()!;
    const stats = campaignData.stats || {};
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
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
