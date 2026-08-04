import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbPatch, dbGet } from '@/lib/firebase/firestoreRest';

// GET /api/unsubscribe?token=<unsubscribeToken>
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(`${appUrl}/unsubscribe?status=error`);
  }

  try {
    // Trouver l'email par son token de désinscription
    const emails = await dbQuery('emails', [
      { field: 'unsubscribeToken', op: 'EQUAL', value: token },
    ], undefined, 1);

    if (emails.length === 0) {
      return NextResponse.redirect(`${appUrl}/unsubscribe?status=not_found`);
    }

    const emailData = emails[0];
    const contactId = emailData.contactId as string;
    const campaignId = emailData.campaignId as string;

    // Vérifier le contact
    const contact = await dbGet(`contacts/${contactId}`);
    if (!contact) {
      return NextResponse.redirect(`${appUrl}/unsubscribe?status=error`);
    }

    if (contact.status === 'unsubscribed') {
      return NextResponse.redirect(`${appUrl}/unsubscribe?status=already`);
    }

    // Mettre à jour le statut du contact
    await dbPatch(`contacts/${contactId}`, {
      status: 'unsubscribed',
      updatedAt: new Date().toISOString(),
    });

    // Incrémenter les stats de désinscription
    if (campaignId) {
      const camp = await dbGet(`campaigns/${campaignId}`);
      if (camp) {
        const stats = (camp.stats as Record<string, number>) || {};
        await dbPatch(`campaigns/${campaignId}`, {
          'stats.unsubscribed': (stats.unsubscribed || 0) + 1,
        });
      }
    }

    return NextResponse.redirect(`${appUrl}/unsubscribe?status=success`);
  } catch (err) {
    console.error('[unsubscribe]', err);
    return NextResponse.redirect(`${appUrl}/unsubscribe?status=error`);
  }
}
