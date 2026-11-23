import { prisma } from '@/lib/prisma';
import { escapeHtml } from './html';
import { getCustomerBotClient } from './client';
import { getLocalized } from '@/lib/i18n/get-localized';
import { formatPrice } from '@/lib/currency';
import { OrderStatus } from '@prisma/client';

export async function handleCustomerBotMessage(msg: any) {
  const client = getCustomerBotClient();
  const text = (msg.text || '').trim();
  const chatId = msg.chat?.id;
  const fromId = msg.from?.id ? BigInt(msg.from.id) : null;
  const fromName = msg.from?.first_name || 'Mijoz';

  if (!chatId || !fromId) return;

  // 1. /start ord_<orderId> (Buyurtmani kuzatish havolasi)
  if (text.startsWith('/start ord_')) {
    const orderId = text.replace('/start ord_', '').trim();
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      await client.sendMessage(chatId, `❌ Buyurtma topilmadi.`);
      return;
    }

    // ChatId ni orderga biriktirish
    await prisma.order.update({
      where: { id: order.id },
      data: { telegramChatId: String(chatId) },
    });

    const statusTexts: Record<string, string> = {
      NEW: 'qabul qilindi',
      CONFIRMED: 'tasdiqlandi',
      PREPARING: 'oshxonada tayyorlanmoqda',
      READY: 'tayyor bo‘ldi',
      ON_THE_WAY: 'kuryer tomonidan yo‘lga olindi',
      DELIVERED: 'yetkazib berildi',
      PICKED_UP: 'qabul qilindi',
      CANCELED: 'bekor qilindi',
    };

    await client.sendMessage(
      chatId,
      `🔔 <b>Buyurtma #${order.number} muvaffaqiyatli bog‘landi!</b>\n\n` +
      `Joriy holat: <b>${statusTexts[order.status] || order.status}</b>.\n` +
      `Har bir yangilanish haqida sizga shu yerda xabar beramiz.`
    );
    return;
  }

  // 2. Oddiy /start
  if (text.startsWith('/start')) {
    const reply_markup = {
      inline_keyboard: [
        [
          { text: '🇺🇿 O‘zbekcha', callback_data: 'lang:uz' },
          { text: '🇺🇿 Ўзбекча', callback_data: 'lang:uz-cyrl' },
        ],
        [
          { text: '🇷🇺 Русский', callback_data: 'lang:ru' },
          { text: '🇬🇧 English', callback_data: 'lang:en' },
        ],
      ],
    };

    await client.sendMessage(
      chatId,
      `Assalomu alaykum, <b>${escapeHtml(fromName)}</b>!\n` +
      `Tez-Taom tezkor yetkazib berish botiga xush kelibsiz.\n\n` +
      `Iltimos, muloqot tilini tanlang:\n` +
      `Пожалуйста, выберите язык:\n` +
      `Please choose your language:`,
      { reply_markup }
    );
    return;
  }

  // Boshqa xabarlar uchun menyu tugmasi
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  await client.sendMessage(
    chatId,
    `🍔 Mazali taomlarga buyurtma berish uchun saytimizga tashrif buyuring:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌐 Tez-Taom menyusini ochish', url: appUrl }],
        ],
      },
    }
  );
}

export async function notifyCustomerOrderStatus(orderId: string, newStatus: OrderStatus) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order || !order.telegramChatId) return;

  const client = getCustomerBotClient();
  const locale = order.locale || 'uz';

  const statusMessages: Record<string, Record<string, string>> = {
    CONFIRMED: {
      uz: `✅ Buyurtmangiz #${order.number} tasdiqlandi! Oshxona tayyorlashga kirishmoqda.`,
      'uz-cyrl': `✅ Буюртмангиз #${order.number} тасдиқланди! Ошхона тайёрлашга киришмоқда.`,
      ru: `✅ Ваш заказ #${order.number} подтвержден! Передан на кухню.`,
      en: `✅ Your order #${order.number} is confirmed! Sent to the kitchen.`,
    },
    PREPARING: {
      uz: `🍳 Buyurtmangiz #${order.number} oshxonada mehr bilan tayyorlanmoqda.`,
      'uz-cyrl': `🍳 Буюртмангиз #${order.number} ошхонада меҳр билан тайёрланмоқда.`,
      ru: `🍳 Ваш заказ #${order.number} готовится на нашей кухне.`,
      en: `🍳 Your order #${order.number} is being cooked.`,
    },
    READY: {
      uz: `📦 Buyurtmangiz #${order.number} tayyor!`,
      'uz-cyrl': `📦 Буюртмангиз #${order.number} тайёр!`,
      ru: `📦 Ваш заказ #${order.number} готов!`,
      en: `📦 Your order #${order.number} is ready!`,
    },
    ON_THE_WAY: {
      uz: `🛵 Kuryer buyurtmangizni #${order.number} olib yo‘lga chiqdi!`,
      'uz-cyrl': `🛵 Курьер буюртмангизни #${order.number} олиб йўлга чиқди!`,
      ru: `🛵 Курьер забрал заказ #${order.number} и уже в пути к вам!`,
      en: `🛵 Courier is on the way with your order #${order.number}!`,
    },
    DELIVERED: {
      uz: `🎉 Buyurtmangiz #${order.number} yetkazib berildi! Yoqimli ishtaha! Bizni baholashni unutmang.`,
      'uz-cyrl': `🎉 Буюртмангиз #${order.number} етказиб берилди! Ёқимли иштаҳа! Бизни баҳолашни унутманг.`,
      ru: `🎉 Заказ #${order.number} доставлен! Приятного аппетита! Пожалуйста, оцените наш сервис.`,
      en: `🎉 Order #${order.number} delivered! Enjoy your meal! Please rate our service.`,
    },
    PICKED_UP: {
      uz: `🛍 Buyurtmangizni #${order.number} qabul qilib olganingiz uchun rahmat! Yoqimli ishtaha!`,
      'uz-cyrl': `🛍 Буюртмангизни #${order.number} қабул қилиб олганингиз учун раҳмат! Ёқимли иштаҳа!`,
      ru: `🛍 Спасибо, что забрали заказ #${order.number}! Приятного аппетита!`,
      en: `🛍 Thank you for picking up your order #${order.number}! Enjoy!`,
    },
    CANCELED: {
      uz: `❌ Buyurtmangiz #${order.number} bekor qilindi. Sabab: ${order.cancelReason || 'Aniqlanmagan'}.`,
      'uz-cyrl': `❌ Буюртмангиз #${order.number} бекор қилинди. Сабаб: ${order.cancelReason || 'Аниқланмаган'}.`,
      ru: `❌ Заказ #${order.number} был отменен. Причина: ${order.cancelReason || 'Не указана'}.`,
      en: `❌ Your order #${order.number} has been canceled. Reason: ${order.cancelReason || 'Unspecified'}.`,
    },
  };

  const text = statusMessages[newStatus]?.[locale] || statusMessages[newStatus]?.['uz'];
  if (text) {
    await client.sendMessage(order.telegramChatId, text);
  }
}
