import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbPatch } from '@/lib/firebase/firestoreRest';

// GET /api/track/click?id=<emailId>&url=<encodedUrl>
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const emailId = searchParams.get('id');
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'url manquant' }, { status: 400 });
  }

  const decodedUrl = decodeURIComponent(url);
  const redirect = NextResponse.redirect(decodedUrl, { status: 302 });

  if (!emailId) return redirect;

  // Enregistrement en arrière-plan
  setImmediate(async () => {
    try {
      const emailDoc = await dbGet(`emails/${emailId}`);
      if (!emailDoc || emailDoc.clickedAt) return; // déjà cliqué

      await dbPatch(`emails/${emailId}`, {
        status: 'clicked',
        clickedAt: new Date().toISOString(),
      });

      // Incrémenter stats campagne
      if (emailDoc.campaignId) {
        const camp = await dbGet(`campaigns/${emailDoc.campaignId as string}`);
        if (camp) {
          const stats = (camp.stats as Record<string, number>) || {};
          await dbPatch(`campaigns/${emailDoc.campaignId as string}`, {
            'stats.clicked': (stats.clicked || 0) + 1,
          });
        }
      }
    } catch (err) {
      console.error('[track/click]', err);
    }
  });

  return redirect;
}
