export interface LocalizedText {
  uz: string;
  'uz-Cyrl'?: string;
  ru?: string;
  en?: string;
}

export type SupportedLocale = 'uz' | 'uz-cyrl' | 'ru' | 'en';

export type OrderType = 'DELIVERY' | 'PICKUP' | 'DINE_IN';

export type PaymentMethod = 'CASH' | 'CARD_ON_DELIVERY' | 'PAYME' | 'CLICK' | 'UZUM';

export type PaymentStatus = 'UNPAID' | 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'ON_THE_WAY'
  | 'DELIVERED'
  | 'PICKED_UP'
  | 'CANCELED';

export interface CartModifierOption {
  optionId: string;
  groupId: string;
  name: LocalizedText;
  priceDelta: number;
}

export interface CartItem {
  id: string; // generated unique cart item id (e.g. itemId + options hash)
  menuItemId: string;
  name: LocalizedText;
  price: number; // base price
  emoji?: string;
  imageUrl?: string;
  selectedOptions: CartModifierOption[];
  qty: number;
  note?: string;
}

export interface QuoteItemInput {
  menuItemId: string;
  selectedOptionIds: string[];
  qty: number;
  note?: string;
}

export interface QuoteRequest {
  type: OrderType;
  items: QuoteItemInput[];
  promoCode?: string;
  branchId?: string;
  zoneId?: string;
}

export interface QuoteResponse {
  valid: boolean;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  itemQuotes: {
    menuItemId: string;
    name: LocalizedText;
    basePrice: number;
    optionsDelta: number;
    unitPrice: number;
    qty: number;
    total: number;
  }[];
  appliedPromo?: {
    code: string;
    discount: number;
    type: string;
  };
  errors?: string[];
}

export interface CreateOrderInput {
  idempotencyKey: string;
  type: OrderType;
  customerName: string;
  phone: string;
  locale: string;
  addressText?: string;
  lat?: number;
  lng?: number;
  comment?: string;
  scheduledFor?: string; // ISO string if scheduled
  paymentMethod: PaymentMethod;
  promoCode?: string;
  items: QuoteItemInput[];
}
