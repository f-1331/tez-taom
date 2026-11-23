import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { calculateOrderQuote, MenuItemDbSnapshot, PromoDbSnapshot } from '@/lib/pricing/pricing';

const quoteSchema = z.object({
  type: z.enum(['DELIVERY', 'PICKUP', 'DINE_IN']),
  items: z.array(
    z.object({
      menuItemId: z.string().min(1),
      selectedOptionIds: z.array(z.string()).default([]),
      qty: z.number().int().positive(),
      note: z.string().optional(),
    })
  ).min(1, 'Savatcha bo‘sh'),
  promoCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = quoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, errors: parsed.error.errors.map((e) => e.message) },
        { status: 400 }
      );
    }

    const { type, items, promoCode } = parsed.data;

    // Barcha so'ralgan taomlarni bazadan olish
    const menuItemIds = items.map((i) => i.menuItemId);
    const dbMenuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      include: {
        modifiers: {
          include: {
            options: true,
          },
        },
      },
    });

    const menuItemsSnapshot: MenuItemDbSnapshot[] = dbMenuItems.map((item) => ({
      id: item.id,
      name: item.name as any,
      price: item.price,
      isActive: item.isActive,
      modifiers: item.modifiers.map((mod) => ({
        id: mod.id,
        required: mod.required,
        min: mod.min,
        max: mod.max,
        options: mod.options.map((opt) => ({
          id: opt.id,
          name: opt.name as any,
          priceDelta: opt.priceDelta,
          isActive: opt.isActive,
        })),
      })),
    }));

    // Promo kodni tekshirish
    let promoSnapshot: PromoDbSnapshot | null = null;
    if (promoCode && promoCode.trim().length > 0) {
      const dbPromo = await prisma.promo.findUnique({
        where: { code: promoCode.trim().toUpperCase() },
      });
      if (dbPromo) {
        promoSnapshot = {
          id: dbPromo.id,
          code: dbPromo.code,
          type: dbPromo.type,
          value: dbPromo.value,
          minOrder: dbPromo.minOrder,
          startsAt: dbPromo.startsAt,
          endsAt: dbPromo.endsAt,
          usageLimit: dbPromo.usageLimit,
          usedCount: dbPromo.usedCount,
          isActive: dbPromo.isActive,
        };
      }
    }

    // Yetkazib berish sozlamalarini olish
    const deliverySetting = await prisma.setting.findUnique({
      where: { key: 'delivery_settings' },
    });
    const settings = deliverySetting ? (deliverySetting.value as any) : undefined;

    const quote = calculateOrderQuote({
      type,
      items,
      menuItems: menuItemsSnapshot,
      promo: promoSnapshot,
      settings,
    });

    return NextResponse.json(quote);
  } catch (error: any) {
    console.error('Error calculating quote:', error);
    return NextResponse.json(
      { valid: false, errors: ['Narxni hisoblashda xatolik yuz berdi'] },
      { status: 500 }
    );
  }
}
