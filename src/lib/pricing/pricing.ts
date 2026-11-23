import { QuoteItemInput, QuoteResponse, OrderType, LocalizedText } from '@/types';

export interface MenuItemDbSnapshot {
  id: string;
  name: LocalizedText;
  price: number;
  isActive: boolean;
  modifiers: {
    id: string;
    required: boolean;
    min: number;
    max: number;
    options: {
      id: string;
      name: LocalizedText;
      priceDelta: number;
      isActive: boolean;
    }[];
  }[];
}

export interface PromoDbSnapshot {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED' | 'FREE_DELIVERY';
  value: number;
  minOrder: number;
  startsAt: Date;
  endsAt: Date;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
}

export interface PricingSettings {
  defaultDeliveryFee: number;
  freeDeliveryThreshold: number;
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  defaultDeliveryFee: 15000,
  freeDeliveryThreshold: 100000,
};

export function calculateOrderQuote(params: {
  type: OrderType;
  items: QuoteItemInput[];
  menuItems: MenuItemDbSnapshot[];
  promo?: PromoDbSnapshot | null;
  settings?: PricingSettings;
  now?: Date;
}): QuoteResponse {
  const { type, items, menuItems, promo, settings = DEFAULT_PRICING_SETTINGS, now = new Date() } = params;
  const errors: string[] = [];

  if (!items || items.length === 0) {
    return {
      valid: false,
      subtotal: 0,
      discount: 0,
      deliveryFee: 0,
      total: 0,
      itemQuotes: [],
      errors: ['Savatcha bo‘sh'],
    };
  }

  const menuMap = new Map(menuItems.map((m) => [m.id, m]));
  const itemQuotes: QuoteResponse['itemQuotes'] = [];
  let subtotal = 0;

  for (const itemInput of items) {
    const menuItem = menuMap.get(itemInput.menuItemId);
    if (!menuItem) {
      errors.push(`Taom topilmadi: ${itemInput.menuItemId}`);
      continue;
    }
    if (!menuItem.isActive) {
      errors.push(`Taom hozirda sotuvda mavjud emas: ${menuItem.name.uz}`);
      continue;
    }
    if (itemInput.qty <= 0) {
      errors.push(`Noto‘g‘ri miqdor: ${itemInput.qty}`);
      continue;
    }

    // Modifier optionlarni tekshirish va delta hisoblash
    const allOptionsMap = new Map();
    for (const group of menuItem.modifiers) {
      for (const opt of group.options) {
        allOptionsMap.set(opt.id, { ...opt, groupId: group.id });
      }
    }

    let optionsDelta = 0;
    const selectedOptionIds = itemInput.selectedOptionIds || [];

    // Majburiy va min/max tekshiruvlar
    for (const group of menuItem.modifiers) {
      const selectedInGroup = selectedOptionIds.filter((optId) => {
        const opt = allOptionsMap.get(optId);
        return opt && opt.groupId === group.id;
      });

      if (group.required && selectedInGroup.length < Math.max(1, group.min)) {
        errors.push(`"${menuItem.name.uz}" uchun majburiy variant tanlanmagan`);
      }
      if (selectedInGroup.length > group.max) {
        errors.push(`"${menuItem.name.uz}" uchun variantlar soni ruxsat etilgan me'yordan oshdi`);
      }
    }

    for (const optId of selectedOptionIds) {
      const opt = allOptionsMap.get(optId);
      if (opt && opt.isActive) {
        optionsDelta += opt.priceDelta;
      }
    }

    const unitPrice = menuItem.price + optionsDelta;
    const itemTotal = unitPrice * itemInput.qty;
    subtotal += itemTotal;

    itemQuotes.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      basePrice: menuItem.price,
      optionsDelta,
      unitPrice,
      qty: itemInput.qty,
      total: itemTotal,
    });
  }

  // Yetkazib berish to'lovi
  let deliveryFee = 0;
  if (type === 'DELIVERY') {
    if (subtotal >= settings.freeDeliveryThreshold) {
      deliveryFee = 0;
    } else {
      deliveryFee = settings.defaultDeliveryFee;
    }
  }

  // Promo-kod hisoblash
  let discount = 0;
  let appliedPromo: QuoteResponse['appliedPromo'];

  if (promo && promo.isActive) {
    const isStarted = promo.startsAt <= now;
    const isEnded = promo.endsAt < now;
    const isLimitExceeded = promo.usageLimit !== null && promo.usedCount >= promo.usageLimit;
    const isMinOrderMet = subtotal >= promo.minOrder;

    if (!isStarted || isEnded) {
      errors.push('Promo-kod muddati o‘tgan');
    } else if (isLimitExceeded) {
      errors.push('Promo-koddan foydalanish limiti tugagan');
    } else if (!isMinOrderMet) {
      errors.push(`Promo-kod uchun minimal buyurtma summasi ${promo.minOrder} so‘m`);
    } else {
      if (promo.type === 'PERCENT') {
        discount = Math.round((subtotal * promo.value) / 100);
      } else if (promo.type === 'FIXED') {
        discount = Math.min(subtotal, promo.value);
      } else if (promo.type === 'FREE_DELIVERY') {
        deliveryFee = 0;
        discount = 0;
      }

      appliedPromo = {
        code: promo.code,
        discount,
        type: promo.type,
      };
    }
  }

  const total = Math.max(0, subtotal - discount + deliveryFee);

  return {
    valid: errors.length === 0,
    subtotal,
    discount,
    deliveryFee,
    total,
    itemQuotes,
    appliedPromo,
    errors: errors.length > 0 ? errors : undefined,
  };
}
