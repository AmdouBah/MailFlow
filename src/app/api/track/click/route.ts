import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

// GET /api/track/click?id=<emailId>&url=<encodedUrl>
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const emailId = searchParams.get('id');
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'url manquant' }, { status: 400 });
  }

  // Décoder et valider l'URL
  const decodedUrl = decodeURIComponent(url);

  // Rediriger immédiatement
  const redirect = NextResponse.redirect(decodedUrl, { status: 302 });

  if (!emailId) return redirect;

  // Enregistrement en arrière-plan
  setImmediate(async () => {
    try {
      const db = getAdminDb();
      const emailRef = db.collection('emails').doc(emailId);
      const emailSnap = await emailRef.get();

      if (!emailSnap.exists) return;
      const emailData = emailSnap.data()!;

      const firestoreBatch = db.batch();
      
      // Ne pas écraser la première ouverture/clic
      if (!emailData.clickedAt) {
        firestoreBatch.update(emailRef, {
          status: 'clicked',
          clickedAt: Timestamp.now(),
        });

        // Incrémenter stats
        const campRef = db.collection('campaigns').doc(emailData.campaignId);
        const campSnap = await campRef.get();
        if (campSnap.exists) {
          firestoreBatch.update(campRef, {
            'stats.clicked': (campSnap.data()?.stats?.clicked || 0) + 1,
          });
        }
        
        await firestoreBatch.commit();
      }
    } catch (err) {
      console.error('[track/click]', err);
    }
  });

  return redirect;
}
