import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOwnerBindToken } from '@/server/telegram/tokens';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Owner foydalanuvchini olish
    const owner = await prisma.user.findFirst({
      where: { role: 'OWNER' },
    });

    if (!owner) {
      return NextResponse.json({ success: false, error: 'Owner foydalanuvchi topilmadi' }, { status: 404 });
    }

    const { rawToken, link, expiresAt } = await createOwnerBindToken(owner.id);

    return NextResponse.json({
      success: true,
      link,
      expiresAt,
      ownerTelegramUsername: owner.telegramUsername || process.env.OWNER_TELEGRAM_USERNAME,
    });
  } catch (err: any) {
    console.error('Error generating bind token:', err);
    return NextResponse.json({ success: false, error: 'Token yaratishda xatolik' }, { status: 500 });
  }
}
