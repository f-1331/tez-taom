import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { calculateOrderQuote, MenuItemDbSnapshot, PromoDbSnapshot } from '@/lib/pricing/pricing';
import { sendStaffOrderNotification, maskPhone } from '@/lib/telegram/staff-notifier';
import { sendOrderToStaffGroup } from '@/server/telegram/staffBot';

// Rate Limiter: IP bo'yicha 10 daqiqada 5 ta buyurtma
const ipRequestHistory = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 5;

  const timestamps = (ipRequestHistory.get(ip) || []).filter((time) => now - time < windowMs);
  if (timestamps.length >= maxRequests) {
    return false;
  }
  timestamps.push(now);
  ipRequestHistory.set(ip, timestamps);
  return true;
}

const createOrderSchema = z.object({
  idempotencyKey: z.string().min(8, 'Idempotency kaliti kiritilishi shart'),
  type: z.enum(['DELIVERY', 'PICKUP', 'DINE_IN']),
  customerName: z.string().min(2, 'Ismingizni kiriting').max(50),
  phone: z.string().min(9, 'Telefon raqamingizni to‘g‘ri kiriting').max(20),
  locale: z.string().default('uz'),
  addressText: z.string().optional(),
  comment: z.string().max(250).optional(),
  scheduledFor: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'CARD_ON_DELIVERY', 'PAYME', 'CLICK', 'UZUM']).default('CASH'),
  promoCode: z.string().optional(),
  items: z.array(
    z.object({
      menuItemId: z.string().min(1),
      selectedOptionIds: z.array(z.string()).default([]),
      qty: z.number().int().positive(),
      note: z.string().optional(),
    })
  ).min(1, 'Savatcha bo‘sh'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Juda ko‘p so‘rov yuborildi. Iltimos, 10 daqiqadan so‘ng qayta urinib ko‘ring.',
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.errors.map((e) => e.message) },
        { status: 400 }
      );
    }

    const {
      idempotencyKey,
      type,
      customerName,
      phone,
      locale,
      addressText,
      comment,
      scheduledFor,
      paymentMethod,
      promoCode,
      items,
    } = parsed.data;

    // 0. Restoran ochiq/yopiqligini tekshirish (/open va /close sozlamasi)
    const restaurantSetting = await prisma.setting.findUnique({
      where: { key: 'restaurant_settings' },
    });
    if (restaurantSetting && (restaurantSetting.value as any)?.isOpen === false) {
      return NextResponse.json(
        {
          success: false,
          error: 'Restoranda buyurtma qabul qilish vaqtincha to‘xtatilgan. Iltimos, keyinroq urinib ko‘ring.',
        },
        { status: 503 }
      );
    }

    // Delivery turida manzil majburiy
    if (type === 'DELIVERY' && (!addressText || addressText.trim().length < 3)) {
      return NextResponse.json(
        { success: false, error: 'Yetkazib berish uchun aniq manzil kiritilishi shart' },
        { status: 400 }
      );
    }

    // 1. Idempotency tekshiruvi: Agar shu kalit bilan buyurtma avval yaratilgan bo'lsa
    const existingOrder = await prisma.order.findUnique({
      where: { idempotencyKey },
      include: { items: true },
    });

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        orderId: existingOrder.id,
        orderNumber: existingOrder.number,
        total: existingOrder.total,
        isExisting: true,
      });
    }

    // 2. Server-side narx hisoblash
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

    if (!quote.valid || quote.errors) {
      return NextResponse.json(
        { success: false, errors: quote.errors || ['Savatchani hisoblashda xatolik'] },
        { status: 400 }
      );
    }

    // Markaziy filialni olish
    const branch = await prisma.branch.findFirst({
      where: { isActive: true },
    });

    if (!branch) {
      return NextResponse.json(
        { success: false, error: 'Xizmat ko‘rsatuvchi filial topilmadi' },
        { status: 500 }
      );
    }

    // Bugungi kunlik ketma-ket raqam (daily sequential number)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrdersCount = await prisma.order.count({
      where: { createdAt: { gte: todayStart } },
    });
    const dailyNumber = todayOrdersCount + 1;

    // 3. Atomik Tranzaksiya bilan Buyurtma yaratish
    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          number: dailyNumber,
          branchId: branch.id,
          type,
          customerName,
          phone,
          locale,
          addressText: type === 'DELIVERY' ? addressText : undefined,
          comment,
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          paymentMethod,
          paymentStatus: 'UNPAID',
          status: 'NEW',
          subtotal: quote.subtotal,
          discount: quote.discount,
          deliveryFee: quote.deliveryFee,
          total: quote.total,
          promoCode: promoSnapshot?.code,
          idempotencyKey,
        },
      });

      // Buyurtma qatorlari (OrderItem) snapshotlari
      for (const itemQuote of quote.itemQuotes) {
        const matchingInput = items.find((i) => i.menuItemId === itemQuote.menuItemId);
        const menuItem = dbMenuItems.find((m) => m.id === itemQuote.menuItemId);

        // Tanlangan modifier snapshotlari
        const selectedOptions = (menuItem?.modifiers || [])
          .flatMap((m) => m.options)
          .filter((opt) => matchingInput?.selectedOptionIds.includes(opt.id))
          .map((opt) => ({
            optionId: opt.id,
            nameSnapshot: opt.name,
            priceDelta: opt.priceDelta,
          }));

        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            menuItemId: itemQuote.menuItemId,
            nameSnapshot: itemQuote.name as any,
            priceSnapshot: itemQuote.basePrice,
            qty: itemQuote.qty,
            note: matchingInput?.note,
            optionsSnapshot: selectedOptions,
          },
        });
      }

      // OrderEvent: NEW
      await tx.orderEvent.create({
        data: {
          orderId: createdOrder.id,
          type: 'ORDER_CREATED',
          to: 'NEW',
          meta: { quoteSnapshot: quote } as any,
        },
      });

      // Outbox: NotificationJob
      await tx.notificationJob.create({
        data: {
          channel: 'TELEGRAM',
          payload: { orderId: createdOrder.id },
          status: 'PENDING',
        },
      });

      // Promo count oshirish
      if (promoSnapshot) {
        await tx.promo.update({
          where: { id: promoSnapshot.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      return createdOrder;
    });

    // 4. Asinxron xodimlar Telegram bildirishnomasini yuborish
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true, branch: true },
    });

    if (fullOrder) {
      sendStaffOrderNotification({ order: fullOrder }).catch((err) =>
        console.error('Telegram notification error:', err)
      );
      sendOrderToStaffGroup(order.id).catch((err) =>
        console.error('Telegram staff group error:', err)
      );
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.number,
      total: order.total,
      maskedPhone: maskPhone(order.phone),
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, error: 'Buyurtma berishda xatolik yuz berdi' },
      { status: 500 }
    );
  }
}
