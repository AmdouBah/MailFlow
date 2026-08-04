import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { hashIp } from '@/lib/utils/crypto';
import { Timestamp } from 'firebase-admin/firestore';

// GET /api/track/open?id=<trackingPixelId>
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trackingId = searchParams.get('id');

  // Retourner le pixel immédiatement (ne pas faire attendre le navigateur)
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

  // Enregistrement en arrière-plan (ne pas bloquer la réponse)
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  
  setImmediate(async () => {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection('emails')
        .where('trackingPixelId', '==', trackingId)
        .limit(1)
        .get();

      if (snap.empty) return;

      const emailDoc = snap.docs[0];
      const emailData = emailDoc.data();

      // Ne pas enregistrer si déjà ouvert
      if (emailData.openedAt) return;

      const batch = db.batch();
      batch.update(emailDoc.ref, {
        status: 'opened',
        openedAt: Timestamp.now(),
        ipHash: hashIp(ip),
      });

      // Incrémenter stats campagne
      const campRef = db.collection('campaigns').doc(emailData.campaignId);
      const campSnap = await campRef.get();
      if (campSnap.exists) {
        const opened = (campSnap.data()?.stats?.opened || 0) + 1;
        batch.update(campRef, { 'stats.opened': opened });
      }

      await batch.commit();
    } catch (err) {
      console.error('[track/open]', err);
    }
  });

  return response;
}
