import { prisma } from '@/lib/prisma';
import { escapeHtml } from './html';
import { verifyAndConsumeToken } from './tokens';
import { getStaffBotClient } from './client';
import { getStaffOrderKeyboard } from './keyboards';
import { formatPrice } from '@/lib/currency';
import { getLocalized } from '@/lib/i18n/get-localized';
import { Order, OrderItem, Branch } from '@prisma/client';

export function renderStaffOrderHtml(order: Order & { items: OrderItem[]; branch?: Branch | null }): string {
  const typeText = order.type === 'DELIVERY' ? '🛵 Yetkazib berish' : '🛍 Olib ketish';
  const statusEmoji: Record<string, string> = {
    NEW: '🔔 Yangi buyurtma',
    CONFIRMED: '✅ Tasdiqlandi',
    PREPARING: '🍳 Tayyorlanmoqda',
    READY: '📦 Tayyor',
    ON_THE_WAY: '🛵 Yo‘lda',
    DELIVERED: '🎉 Yetkazildi',
    PICKED_UP: '🛍 Mijoz olib ketdi',
    CANCELED: '❌ Bekor qilindi',
  };

  const itemsHtml = order.items
    .map((item) => {
      const name = escapeHtml(getLocalized(item.nameSnapshot as any, 'uz'));
      let line = `  • <b>${name}</b> x ${item.qty} — <code>${formatPrice(item.priceSnapshot * item.qty, 'uz')}</code>`;

      // Modifier options
      if (item.optionsSnapshot && Array.isArray(item.optionsSnapshot) && item.optionsSnapshot.length > 0) {
        const opts = (item.optionsSnapshot as any[])
          .map((opt) => escapeHtml(getLocalized(opt.nameSnapshot, 'uz')))
          .join(', ');
        line += `\n    <i>(${opts})</i>`;
      }

      if (item.note) {
        line += `\n    <i>Izoh: ${escapeHtml(item.note)}</i>`;
      }

      return line;
    })
    .join('\n');

  return (
    `<b>${statusEmoji[order.status] || order.status} #${order.number}</b>\n\n` +
    `👤 <b>Mijoz:</b> ${escapeHtml(order.customerName)} (<code>${escapeHtml(order.phone)}</code>)\n` +
    `📦 <b>Turi:</b> ${typeText}\n` +
    (order.addressText ? `📍 <b>Manzil:</b> ${escapeHtml(order.addressText)}\n` : '') +
    (order.comment ? `💬 <b>Izoh:</b> ${escapeHtml(order.comment)}\n` : '') +
    `\n📋 <b>Taomlar:</b>\n${itemsHtml}\n\n` +
    `💵 <b>Taomlar summasi:</b> ${formatPrice(order.subtotal, 'uz')}\n` +
    `🛵 <b>Yetkazish:</b> ${formatPrice(order.deliveryFee, 'uz')}\n` +
    (order.discount > 0 ? `🎟 <b>Chegirma:</b> -${formatPrice(order.discount, 'uz')}\n` : '') +
    `💰 <b>JAMI:</b> <b>${formatPrice(order.total, 'uz')}</b>\n` +
    `💳 <b>To‘lov:</b> ${order.paymentMethod} (${order.paymentStatus})\n` +
    `⏰ <b>Vaqt:</b> ${new Date(order.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`
  );
}

export async function sendOrderToStaffGroup(orderId: string): Promise<number | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, branch: true },
  });

  if (!order) return null;

  // Guruh chat ID sini olish (Setting yoki env dan)
  let staffChatId = process.env.TELEGRAM_STAFF_CHAT_ID;
  const staffChatSetting = await prisma.setting.findUnique({
    where: { key: 'staffChatId' },
  });
  if (staffChatSetting && staffChatSetting.value) {
    staffChatId = String(staffChatSetting.value);
  }

  if (!staffChatId) {
    console.warn('[StaffBot] Xodimlar guruhi belgilanmagan (/setgroup buyrug‘i berilmagan)');
    return null;
  }

  const client = getStaffBotClient();
  const text = renderStaffOrderHtml(order);
  const reply_markup = {
    inline_keyboard: getStaffOrderKeyboard(order.id, order.status, order.type),
  };

  const res = await client.sendMessage(staffChatId, text, { reply_markup });
  if (res.ok && res.result?.message_id) {
    const messageId = res.result.message_id;
    // Order ga staffMessageId ni yozish
    await prisma.order.update({
      where: { id: order.id },
      data: { staffMessageId: messageId },
    });
    return messageId;
  }

  return null;
}

export async function handleStaffBotMessage(msg: any) {
  const client = getStaffBotClient();
  const text = (msg.text || '').trim();
  const chatId = msg.chat?.id;
  const fromId = msg.from?.id ? BigInt(msg.from.id) : null;
  const fromUsername = msg.from?.username || '';
  const isPrivate = msg.chat?.type === 'private';

  if (!fromId) return;

  // 1. /start bind_<token> (Owner bog'lash oqimi)
  if (text.startsWith('/start bind_') || text.startsWith('/start join_')) {
    const rawToken = text.replace('/start bind_', '').replace('/start join_', '').trim();
    const result = await verifyAndConsumeToken(rawToken, 'OWNER_BIND');

    if (!result.valid) {
      await client.sendMessage(chatId, `❌ <b>Bog‘lanish rad etildi:</b>\n${escapeHtml(result.error)}`);
      return;
    }

    const expectedUsername = (process.env.OWNER_TELEGRAM_USERNAME || 'fayzbek1331').toLowerCase();
    if (!fromUsername || fromUsername.toLowerCase() !== expectedUsername) {
      await client.sendMessage(
        chatId,
        `❌ <b>Xatolik:</b> Sizning Telegram username (@${escapeHtml(fromUsername)}) kutilgan owner username (@${expectedUsername}) bilan mos kelmadi.`
      );
      return;
    }

    // Ownerni yangilash
    await prisma.user.update({
      where: { id: result.tokenRecord.userId },
      data: {
        telegramId: fromId,
        telegramUsername: fromUsername,
      },
    });

    // AuditLog
    await prisma.auditLog.create({
      data: {
        actorId: result.tokenRecord.userId,
        action: 'OWNER_TELEGRAM_BIND',
        meta: {
          telegramId: fromId.toString(),
          username: fromUsername,
          boundAt: new Date().toISOString(),
        },
      },
    });

    await client.sendMessage(
      chatId,
      `🎉 <b>Tabriklaymiz, hurmatli Loyiha Egasi (@${escapeHtml(fromUsername)})!</b>\n\n` +
      `Sizning Telegram hisobingiz Tez-Taom tizimiga <b>OWNER</b> sifatida muvaffaqiyatli bog‘landi.\n\n` +
      `<b>Guruhni sozlash uchun:</b>\n` +
      `1. Meni restoran xodimlari guruhiga qo‘shing.\n` +
      `2. Guruh ichida <code>/setgroup</code> buyrug‘ini yuboring.`
    );
    return;
  }

  // Xodimni bazadan qidirish
  let staffUser = await prisma.user.findUnique({
    where: { telegramId: fromId },
  });

  const expectedOwnerUsername = (process.env.OWNER_TELEGRAM_USERNAME || 'fayzbek1331').toLowerCase();

  // Agar xodim topilmasa, lekin yozuvchi username OWNER_TELEGRAM_USERNAME bo'lsa (Ownerning birinchi kirishi)
  if (!staffUser && fromUsername && fromUsername.toLowerCase() === expectedOwnerUsername) {
    const owner = await prisma.user.findFirst({
      where: { role: 'OWNER' },
    });
    if (owner) {
      staffUser = await prisma.user.update({
        where: { id: owner.id },
        data: {
          telegramId: fromId,
          telegramUsername: fromUsername,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: owner.id,
          action: 'OWNER_TELEGRAM_BIND',
          meta: {
            telegramId: fromId.toString(),
            username: fromUsername,
            boundAt: new Date().toISOString(),
            method: 'DIRECT_START',
          },
        },
      });

      await client.sendMessage(
        chatId,
        `🎉 <b>Tabriklaymiz, hurmatli Loyiha Egasi (@${escapeHtml(fromUsername)})!</b>\n\n` +
        `Sizning Telegram hisobingiz Tez-Taom tizimiga <b>OWNER</b> sifatida muvaffaqiyatli bog‘landi.\n\n` +
        `<b>Guruhni sozlash uchun:</b>\n` +
        `1. Meni restoran xodimlari guruhiga qo‘shing.\n` +
        `2. Guruh ichida <code>/setgroup</code> buyrug‘ini yuboring.\n\n` +
        `<b>Boshqaruv buyruqlari:</b>\n` +
        `• /orders — Faol buyurtmalar\n` +
        `• /today — Bugungi tushum va statistika\n` +
        `• /open — Buyurtma qabul qilishni yoqish\n` +
        `• /close — Buyurtma qabul qilishni to‘xtatish\n` +
        `• /chatid — Ushbu chat ID sini ko‘rish\n` +
        `• /help — Yordam`
      );
      return;
    }
  }

  // Guruhdagi /chatid buyrug'i
  if (text === '/chatid') {
    await client.sendMessage(chatId, `ℹ️ <b>Ushbu chat ID:</b> <code>${chatId}</code>`);
    return;
  }

  // Guruhdagi /setgroup buyrug'i (Faqat OWNER bera oladi)
  if (text === '/setgroup') {
    if (!staffUser || staffUser.role !== 'OWNER') {
      await client.sendMessage(chatId, `⚠️ Ushbu buyruqni faqat loyiha egasi (OWNER) bera oladi.`);
      return;
    }

    await prisma.setting.upsert({
      where: { key: 'staffChatId' },
      update: { value: String(chatId) },
      create: { key: 'staffChatId', value: String(chatId) },
    });

    await client.sendMessage(
      chatId,
      `✅ <b>Muvaffaqiyatli!</b>\nUshbu guruh (ID: <code>${chatId}</code>) Tez-Taom buyurtmalarini qabul qilish guruhi sifatida belgilandi.`
    );
    return;
  }

  // Xodim bo'lmagan foydalanuvchi xabari
  if (!staffUser || staffUser.role === 'CUSTOMER') {
    if (isPrivate) {
      await client.sendMessage(
        chatId,
        `⛔ <b>Bu bot faqat Tez-Taom xodimlari uchun.</b>\n\nAgar siz loyiha egasi bo‘lsangiz, Telegram usernameingiz @${escapeHtml(expectedOwnerUsername)} ekanligini tekshiring.`
      );
    }
    return;
  }

  // /start buyrug'i (Bog'langan xodimlar uchun)
  if (text === '/start') {
    await client.sendMessage(
      chatId,
      `👋 <b>Assalomu alaykum, ${escapeHtml(staffUser.name)}!</b>\n\n` +
      `Siz Tez-Taom xodimlar tizimida: <b>${staffUser.role}</b> roliga egasiz.\n\n` +
      `<b>Mavjud buyruqlar:</b>\n` +
      `• /orders — Faol buyurtmalar ro‘yxati\n` +
      `• /today — Bugungi statistika va tushum\n` +
      (staffUser.role === 'OWNER' || staffUser.role === 'ADMIN'
        ? `• /open — Buyurtma qabul qilishni yoqish\n• /close — To‘xtatish\n• /setgroup — Xodimlar guruhini sozlash\n`
        : '') +
      `• /chatid — Ushbu chat ID sini ko‘rish\n` +
      `• /help — Yordam`
    );
    return;
  }

  // Xodimlar uchun buyruqlar
  if (text === '/orders') {
    const activeOrders = await prisma.order.findMany({
      where: {
        status: { in: ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'ON_THE_WAY'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (activeOrders.length === 0) {
      await client.sendMessage(chatId, `📭 Hozirda faol buyurtmalar mavjud emas.`);
      return;
    }

    const list = activeOrders
      .map(
        (o) =>
          `• <b>#${o.number}</b> [${o.status}] — ${formatPrice(o.total, 'uz')} (${o.type}) — ${escapeHtml(
            o.customerName
          )}`
      )
      .join('\n');

    await client.sendMessage(chatId, `📋 <b>Faol buyurtmalar (${activeOrders.length} ta):</b>\n\n${list}`);
    return;
  }

  if (text === '/today') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayOrders = await prisma.order.findMany({
      where: { createdAt: { gte: todayStart } },
    });

    const totalOrders = todayOrders.length;
    const delivered = todayOrders.filter((o) => o.status === 'DELIVERED' || o.status === 'PICKED_UP');
    const canceled = todayOrders.filter((o) => o.status === 'CANCELED');
    const revenue = delivered.reduce((sum, o) => sum + o.total, 0);
    const avgCheck = delivered.length > 0 ? Math.round(revenue / delivered.length) : 0;

    await client.sendMessage(
      chatId,
      `📊 <b>Bugungi ko‘rsatkichlar:</b>\n\n` +
      `📦 Jami buyurtmalar: <b>${totalOrders} ta</b>\n` +
      `✅ Yetkazilgan: <b>${delivered.length} ta</b>\n` +
      `❌ Bekor qilingan: <b>${canceled.length} ta</b>\n` +
      `💰 Jami tushum: <b>${formatPrice(revenue, 'uz')}</b>\n` +
      `🏷 O‘rtacha chek: <b>${formatPrice(avgCheck, 'uz')}</b>`
    );
    return;
  }

  if (text === '/open' || text === '/close') {
    if (staffUser.role !== 'OWNER' && staffUser.role !== 'ADMIN') {
      await client.sendMessage(chatId, `⚠️ Ushbu buyruq faqat OWNER va ADMIN uchun.`);
      return;
    }

    const isOpen = text === '/open';
    await prisma.setting.upsert({
      where: { key: 'restaurant_settings' },
      update: { value: { maxHourlyOrders: 50, isOpen } },
      create: { key: 'restaurant_settings', value: { maxHourlyOrders: 50, isOpen } },
    });

    await client.sendMessage(
      chatId,
      isOpen
        ? `🟢 <b>Restoranda buyurtma qabul qilish YOQILDI.</b> Mijozlar saytdan buyurtma bera oladi.`
        : `🔴 <b>Restoranda buyurtma qabul qilish TO‘XTATILDI.</b> Yangi buyurtmalar qabul qilinmaydi.`
    );
    return;
  }

  if (text === '/help') {
    await client.sendMessage(
      chatId,
      `📖 <b>Tez-Taom Xodimlar Boti Buyruqlari:</b>\n\n` +
      `/orders — Faol buyurtmalar ro‘yxati\n` +
      `/today — Bugungi kunlik statistika\n` +
      `/open — Buyurtma qabul qilishni yoqish (Admin/Owner)\n` +
      `/close — Buyurtma qabul qilishni to‘xtatish (Admin/Owner)\n` +
      `/chatid — Ushbu chat ID sini ko‘rish\n` +
      `/setgroup — Xodimlar guruhini belgilash (Faqat Owner)`
    );
    return;
  }
}
