import { OrderStatus, OrderType, Role } from '@prisma/client';

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export type InlineKeyboard = InlineKeyboardButton[][];

export function getStaffOrderKeyboard(orderId: string, status: OrderStatus, type: OrderType): InlineKeyboard {
  const keyboard: InlineKeyboard = [];

  switch (status) {
    case 'NEW':
      keyboard.push([
        { text: '✅ Qabul qilish', callback_data: `o:${orderId}:confirm` },
        { text: '❌ Bekor qilish', callback_data: `o:${orderId}:cancel` },
      ]);
      break;

    case 'CONFIRMED':
      keyboard.push([
        { text: '🍳 Tayyorlanmoqda', callback_data: `o:${orderId}:prep` },
        { text: '❌ Bekor qilish', callback_data: `o:${orderId}:cancel` },
      ]);
      break;

    case 'PREPARING':
      keyboard.push([
        { text: '📦 Tayyor', callback_data: `o:${orderId}:ready` },
        { text: '❌ Bekor qilish', callback_data: `o:${orderId}:cancel` },
      ]);
      break;

    case 'READY':
      if (type === 'DELIVERY') {
        keyboard.push([
          { text: '🛵 Yo‘lda', callback_data: `o:${orderId}:ontheway` },
        ]);
      } else {
        keyboard.push([
          { text: '🛍 Mijoz oldi', callback_data: `o:${orderId}:pickedup` },
        ]);
      }
      break;

    case 'ON_THE_WAY':
      keyboard.push([
        { text: '🎉 Yetkazildi', callback_data: `o:${orderId}:delivered` },
      ]);
      break;

    case 'DELIVERED':
    case 'PICKED_UP':
    case 'CANCELED':
    default:
      // Terminal holatlarda inline tugmalar ko'rsatilmaydi
      break;
  }

  return keyboard;
}

export const ACTION_TO_TARGET_STATUS: Record<string, OrderStatus> = {
  confirm: 'CONFIRMED',
  prep: 'PREPARING',
  ready: 'READY',
  ontheway: 'ON_THE_WAY',
  pickedup: 'PICKED_UP',
  delivered: 'DELIVERED',
  cancel: 'CANCELED',
};

export const ROLE_ALLOWED_ACTIONS: Record<Role, string[]> = {
  OWNER: ['confirm', 'prep', 'ready', 'ontheway', 'pickedup', 'delivered', 'cancel'],
  ADMIN: ['confirm', 'prep', 'ready', 'ontheway', 'pickedup', 'delivered', 'cancel'],
  OPERATOR: ['confirm', 'cancel'],
  KITCHEN: ['prep', 'ready'],
  COURIER: ['ontheway', 'delivered'],
  CUSTOMER: [],
};

export function isActionAllowedForRole(role: Role, action: string): boolean {
  const allowed = ROLE_ALLOWED_ACTIONS[role] || [];
  return allowed.includes(action);
}
