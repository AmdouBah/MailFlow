import { NextRequest, NextResponse } from 'next/server';
import { importContacts } from '@/lib/firebase/firestore';
import type { CsvRow } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { rows, listIds } = await request.json() as { rows: CsvRow[]; listIds: string[] };

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'rows invalides' }, { status: 400 });
    }

    const result = await importContacts(rows, listIds || []);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[contacts/import]', err);
    return NextResponse.json({ error: 'Erreur import' }, { status: 500 });
  }
}
