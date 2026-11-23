import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const validatePromoSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().int().nonnegative(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validatePromoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, error: 'Promo-kod noto‘g‘ri kiritildi' },
        { status: 400 }
      );
    }

    const { code, subtotal } = parsed.data;
    const promo = await prisma.promo.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!promo || !promo.isActive) {
      return NextResponse.json({ valid: false, error: 'Bunday promo-kod mavjud emas' });
    }

    const now = new Date();
    if (promo.startsAt > now || promo.endsAt < now) {
      return NextResponse.json({ valid: false, error: 'Promo-kod muddati o‘tgan' });
    }

    if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
      return NextResponse.json({ valid: false, error: 'Promo-kod foydalanish limiti tugagan' });
    }

    if (subtotal < promo.minOrder) {
      return NextResponse.json({
        valid: false,
        error: `Promo-kod faqat ${promo.minOrder.toLocaleString()} so‘mdan yuqori buyurtmalar uchun amal qiladi`,
      });
    }

    let discount = 0;
    if (promo.type === 'PERCENT') {
      discount = Math.round((subtotal * promo.value) / 100);
    } else if (promo.type === 'FIXED') {
      discount = Math.min(subtotal, promo.value);
    }

    return NextResponse.json({
      valid: true,
      promo: {
        code: promo.code,
        type: promo.type,
        value: promo.value,
        discount,
      },
    });
  } catch (error: any) {
    console.error('Error validating promo:', error);
    return NextResponse.json(
      { valid: false, error: 'Promo-kodni tekshirishda xatolik yuz berdi' },
      { status: 500 }
    );
  }
}
