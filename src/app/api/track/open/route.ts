import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbPatch } from '@/lib/firebase/firestoreRest';
import { hashIp } from '@/lib/utils/crypto';

// GET /api/track/open?id=<trackingPixelId>
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trackingId = searchParams.get('id');

  // Retourner le pixel immédiatement (1x1 GIF transparent)
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  const response = new NextResponse(pixel, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  });

  if (!trackingId) return response;

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // Enregistrement en arrière-plan (ne pas bloquer la réponse)
  setImmediate(async () => {
    try {
      const emails = await dbQuery('emails', [
        { field: 'trackingPixelId', op: 'EQUAL', value: trackingId },
      ], undefined, 1);

      if (emails.length === 0) return;

      const emailDoc = emails[0];
      if (emailDoc.openedAt) return; // déjà ouvert

      await dbPatch(`emails/${emailDoc.id}`, {
        status: 'opened',
        openedAt: new Date().toISOString(),
        ipHash: hashIp(ip),
      });

      // Incrémenter stats campagne
      if (emailDoc.campaignId) {
        const { dbGet } = await import('@/lib/firebase/firestoreRest');
        const camp = await dbGet(`campaigns/${emailDoc.campaignId}`);
        if (camp) {
          const stats = (camp.stats as Record<string, number>) || {};
          await dbPatch(`campaigns/${emailDoc.campaignId}`, {
            'stats.opened': (stats.opened || 0) + 1,
          });
        }
      }
    } catch (err) {
      console.error('[track/open]', err);
    }
  });

  return response;
}
