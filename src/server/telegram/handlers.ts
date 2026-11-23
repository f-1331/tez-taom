import { prisma } from '@/lib/prisma';
import { getStaffBotClient, getCustomerBotClient } from './client';
import { handleStaffBotMessage, renderStaffOrderHtml } from './staffBot';
import { handleCustomerBotMessage, notifyCustomerOrderStatus } from './customerBot';
import {
  ACTION_TO_TARGET_STATUS,
  isActionAllowedForRole,
  getStaffOrderKeyboard,
} from './keyboards';
import { validateOrderTransition } from '@/lib/state/order-state-machine';
import { OrderStatus } from '@prisma/client';

export async function handleTelegramUpdate(botType: 'staff' | 'customer', update: any) {
  if (!update) return;

  // 1. Yangi xabar (Message)
  if (update.message) {
    if (botType === 'staff') {
      await handleStaffBotMessage(update.message);
    } else {
      await handleCustomerBotMessage(update.message);
    }
    return;
  }

  // 2. Callback Query (Tugma bosilishi)
  if (update.callback_query) {
    const query = update.callback_query;
    const data = String(query.data || '');
    const fromId = query.from?.id ? BigInt(query.from.id) : null;
    const client = botType === 'staff' ? getStaffBotClient() : getCustomerBotClient();

    if (!fromId) {
      await client.answerCallbackQuery(query.id, { text: 'Xatolik: Foydalanuvchi aniqlanmadi' });
      return;
    }

    // Xodimlar boti tugmalari (o:<orderId>:<action>)
    if (botType === 'staff' && data.startsWith('o:')) {
      const parts = data.split(':');
      if (parts.length < 3) {
        await client.answerCallbackQuery(query.id, { text: 'Noto‘g‘ri buyruq formati' });
        return;
      }

      const orderId = parts[1];
      const action = parts[2];
      const targetStatus = ACTION_TO_TARGET_STATUS[action];

      if (!targetStatus) {
        await client.answerCallbackQuery(query.id, { text: 'Noma’lum holat' });
        return;
      }

      // Xodimni tekshirish
      const staffUser = await prisma.user.findUnique({
        where: { telegramId: fromId },
      });

      if (!staffUser || staffUser.role === 'CUSTOMER') {
        await client.answerCallbackQuery(query.id, {
          text: '⛔ Siz Tez-Taom xodimi sifatida ro‘yxatga olinmagansiz!',
          show_alert: true,
        });
        return;
      }

      // Rol ruxsatini tekshirish
      if (!isActionAllowedForRole(staffUser.role, action)) {
        await client.answerCallbackQuery(query.id, {
          text: `⛔ Sizning rolingiz (${staffUser.role}) uchun ushbu amalni bajarish taqiqlangan!`,
          show_alert: true,
        });
        return;
      }

      // Buyurtmani bazadan olish
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true, branch: true },
      });

      if (!order) {
        await client.answerCallbackQuery(query.id, { text: 'Buyurtma topilmadi' });
        return;
      }

      // Takroriy bosish xavfsizligi
      if (order.status === targetStatus) {
        await client.answerCallbackQuery(query.id, { text: 'Buyurtma allaqachon ushbu holatda.' });
        return;
      }

      // Holat mashinasi ruxsatini tekshirish
      const cancelReason = action === 'cancel' ? `Xodim (@${query.from?.username || staffUser.name}) tomonidan bekor qilindi` : undefined;
      const transitionResult = validateOrderTransition(order.status as OrderStatus, targetStatus, order.type as any, cancelReason);

      if (!transitionResult.valid) {
        await client.answerCallbackQuery(query.id, {
          text: `⚠️ ${transitionResult.error || 'Ushbu o‘tishga ruxsat berilmagan'}`,
          show_alert: true,
        });
        return;
      }

      // Atomik tranzaksiya bilan buyurtma holatini yangilash
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const o = await tx.order.update({
          where: { id: order.id },
          data: {
            status: targetStatus,
            cancelReason: targetStatus === 'CANCELED' ? cancelReason : order.cancelReason,
          },
          include: { items: true, branch: true },
        });

        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            type: 'TELEGRAM_STATUS_CHANGE',
            from: order.status,
            to: targetStatus,
            actorId: staffUser.id,
            meta: {
              source: 'TELEGRAM_STAFF_BOT',
              telegramUserId: fromId.toString(),
              telegramUsername: query.from?.username,
              action,
            },
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: staffUser.id,
            action: 'ORDER_STATUS_CHANGED',
            meta: {
              orderId: order.id,
              orderNumber: order.number,
              from: order.status,
              to: targetStatus,
              actorRole: staffUser.role,
            },
          },
        });

        return o;
      });

      // Guruhdagi xabarni tahrirlash
      if (query.message?.message_id && query.message?.chat?.id) {
        const updatedHtml = renderStaffOrderHtml(updatedOrder);
        const newKeyboard = getStaffOrderKeyboard(updatedOrder.id, updatedOrder.status, updatedOrder.type);

        await client.editMessageText(query.message.chat.id, query.message.message_id, updatedHtml, {
          reply_markup: { inline_keyboard: newKeyboard },
        });
      }

      // Mijoz botiga bildirishnoma yuborish
      notifyCustomerOrderStatus(updatedOrder.id, targetStatus).catch((err) =>
        console.error('Customer bot notify error:', err)
      );

      await client.answerCallbackQuery(query.id, {
        text: `✅ Buyurtma holati "${targetStatus}" ga o‘zgartirildi!`,
      });
      return;
    }

    // Mijoz boti til tanlash tugmalari (lang:<locale>)
    if (botType === 'customer' && data.startsWith('lang:')) {
      const locale = data.replace('lang:', '');
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      const welcomeMessages: Record<string, string> = {
        uz: `🇺🇿 <b>Til tanlandi: O‘zbekcha</b>\n\nQuyidagi tugma orqali menyuni ochib, buyurtma berishingiz mumkin:`,
        'uz-cyrl': `🇺🇿 <b>Тил танланди: Ўзбекча</b>\n\nҚуйидаги тугма орқали менюни очиб, буюртма беришингиз мумкин:`,
        ru: `🇷🇺 <b>Язык выбран: Русский</b>\n\nВы можете открыть меню и сделать заказ по кнопке ниже:`,
        en: `🇬🇧 <b>Language selected: English</b>\n\nYou can open the menu and place your order using the button below:`,
      };

      await client.answerCallbackQuery(query.id, { text: `OK (${locale})` });

      if (query.message?.chat?.id) {
        await client.sendMessage(
          query.message.chat.id,
          welcomeMessages[locale] || welcomeMessages['uz'],
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🍔 Tez-Taom Menyusi', url: `${appUrl}/${locale}` }],
              ],
            },
          }
        );
      }
      return;
    }

    await client.answerCallbackQuery(query.id);
  }
}
