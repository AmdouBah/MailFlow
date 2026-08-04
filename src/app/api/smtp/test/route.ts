import { NextResponse } from 'next/server';
import { testSmtpConnection } from '@/lib/email/smtp';

export async function POST(req: Request) {
  try {
    const { config } = await req.json();
    if (!config) {
      return NextResponse.json({ success: false, error: 'Missing SMTP config' }, { status: 400 });
    }
    const result = await testSmtpConnection(config);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Error testing SMTP connection' }, { status: 500 });
  }
}
