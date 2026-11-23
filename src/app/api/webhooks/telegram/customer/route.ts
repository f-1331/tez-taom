import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramUpdate } from '@/server/telegram/handlers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
  const expectedSecret = process.env.TELEGRAM_CUSTOMER_WEBHOOK_SECRET;

  if (expectedSecret && secretHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized secret token' }, { status: 401 });
  }

  try {
    const update = await req.json();
    await handleTelegramUpdate('customer', update);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Customer webhook error:', err);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
