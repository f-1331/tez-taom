import { Order, OrderItem, Branch } from '@prisma/client';
import { getLocalized } from '../i18n/get-localized';
import { formatPrice } from '../currency';

export function maskPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.length >= 9) {
    const start = cleaned.slice(0, 7);
    const end = cleaned.slice(-2);
    return `${start} *** ** ${end}`;
  }
  return phone;
}

export interface SendStaffNotificationParams {
  order: Order & {
    items: OrderItem[];
    branch?: Branch | null;
  };
}

export async function sendStaffOrderNotification(params: SendStaffNotificationParams): Promise<{ success: boolean; error?: string }> {
  const { order } = params;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const maskedPhone = maskPhone(order.phone);
  const typeText = order.type === 'DELIVERY' ? '🛵 Yetkazib berish' : '🛍 Olib ketish';

  const itemsList = order.items
    .map((item) => {
      const name = getLocalized(item.nameSnapshot as any, 'uz');
      return `  • ${name} x ${item.qty} (${formatPrice(item.priceSnapshot * item.qty, 'uz')})`;
    })
    .join('\n');

  const messageText = `🔔 *YANGI BUYURTMA #${order.number}*\n\n` +
    `👤 *Mijoz:* ${order.customerName} (${maskedPhone})\n` +
    `📦 *Turi:* ${typeText}\n` +
    (order.addressText ? `📍 *Manzil:* ${order.addressText}\n` : '') +
    (order.comment ? `💬 *Izoh:* ${order.comment}\n` : '') +
    `\n📋 *Taomlar:*\n${itemsList}\n\n` +
    `💵 *Taomlar summasi:* ${formatPrice(order.subtotal, 'uz')}\n` +
    `🛵 *Yetkazish:* ${formatPrice(order.deliveryFee, 'uz')}\n` +
    (order.discount > 0 ? `🎟 *Chegirma:* -${formatPrice(order.discount, 'uz')}\n` : '') +
    `💰 *JAMI:* *${formatPrice(order.total, 'uz')}*\n` +
    `💳 *To‘lov usuli:* ${order.paymentMethod} (${order.paymentStatus})\n` +
    `⏰ *Vaqt:* ${new Date(order.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;

  // Agar mock rejimda bo'lsa yoki token yo'q bo'lsa
  if (!botToken || botToken === 'mock_telegram_token' || !chatId) {
    console.log('[Telegram Staff Notifier - MOCK]: Yangi buyurtma xabari generatsiya qilindi:\n', messageText);
    return { success: true };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'Markdown',
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[Telegram Staff Notifier - ERROR]: Telegram API xatolik berdi:', errorText);
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Telegram Staff Notifier - EXCEPTION]:', err);
    return { success: false, error: err.message };
  }
}
