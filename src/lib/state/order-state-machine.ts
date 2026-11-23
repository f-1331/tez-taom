import { OrderStatus, OrderType } from '@/types';

export interface TransitionResult {
  valid: boolean;
  from: OrderStatus;
  to: OrderStatus;
  error?: string;
}

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELED'],
  CONFIRMED: ['PREPARING', 'CANCELED'],
  PREPARING: ['READY', 'CANCELED'],
  READY: ['ON_THE_WAY', 'PICKED_UP', 'CANCELED'],
  ON_THE_WAY: ['DELIVERED', 'CANCELED'],
  DELIVERED: [],
  PICKED_UP: [],
  CANCELED: [],
};

export function validateOrderTransition(
  from: OrderStatus,
  to: OrderStatus,
  orderType: OrderType = 'DELIVERY',
  cancelReason?: string
): TransitionResult {
  if (from === to) {
    return { valid: true, from, to };
  }

  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    return {
      valid: false,
      from,
      to,
      error: `"${from}" holatidan "${to}" holatiga o'tish taqiqlangan`,
    };
  }

  // Olib ketish va yetkazish farqlari
  if (to === 'ON_THE_WAY' && orderType !== 'DELIVERY') {
    return {
      valid: false,
      from,
      to,
      error: `Olib ketish (PICKUP) buyurtmasini "Yo‘lda" (ON_THE_WAY) holatiga o'tkazib bo'lmaydi`,
    };
  }

  if (to === 'PICKED_UP' && orderType === 'DELIVERY') {
    return {
      valid: false,
      from,
      to,
      error: `Yetkazib berish (DELIVERY) buyurtmasini "Olib ketildi" (PICKED_UP) holatiga o'tkazib bo'lmaydi`,
    };
  }

  if (to === 'CANCELED' && (!cancelReason || cancelReason.trim().length === 0)) {
    return {
      valid: false,
      from,
      to,
      error: `Buyurtmani bekor qilish uchun sabab kiritilishi shart`,
    };
  }

  return { valid: true, from, to };
}
