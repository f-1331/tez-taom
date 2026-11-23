import { describe, it, expect } from 'vitest';
import { calculateOrderQuote, MenuItemDbSnapshot, PromoDbSnapshot } from './pricing';

const mockMenuItems: MenuItemDbSnapshot[] = [
  {
    id: 'burger-1',
    name: { uz: 'Klassik burger', ru: 'Классический бургер', en: 'Classic Burger' },
    price: 32000,
    isActive: true,
    modifiers: [
      {
        id: 'mod-cheese',
        required: false,
        min: 0,
        max: 2,
        options: [
          { id: 'opt-cheese', name: { uz: 'Qo‘shimcha pishloq' }, priceDelta: 4000, isActive: true },
        ],
      },
    ],
  },
  {
    id: 'fries-1',
    name: { uz: 'Kartoshka fri', ru: 'Картофель фри', en: 'French fries' },
    price: 14000,
    isActive: true,
    modifiers: [],
  },
];

describe('calculateOrderQuote', () => {
  it('calculates subtotal and standard delivery fee for order under 100 000 so‘m', () => {
    const result = calculateOrderQuote({
      type: 'DELIVERY',
      items: [
        {
          menuItemId: 'burger-1',
          selectedOptionIds: ['opt-cheese'],
          qty: 2, // (32000 + 4000) * 2 = 72000
        },
      ],
      menuItems: mockMenuItems,
    });

    expect(result.valid).toBe(true);
    expect(result.subtotal).toBe(72000);
    expect(result.deliveryFee).toBe(15000);
    expect(result.total).toBe(87000);
  });

  it('grants free delivery when subtotal reaches 100 000 so‘m threshold', () => {
    const result = calculateOrderQuote({
      type: 'DELIVERY',
      items: [
        {
          menuItemId: 'burger-1',
          selectedOptionIds: [],
          qty: 4, // 32000 * 4 = 128000
        },
      ],
      menuItems: mockMenuItems,
    });

    expect(result.valid).toBe(true);
    expect(result.subtotal).toBe(128000);
    expect(result.deliveryFee).toBe(0);
    expect(result.total).toBe(128000);
  });

  it('charges 0 delivery fee for PICKUP regardless of total', () => {
    const result = calculateOrderQuote({
      type: 'PICKUP',
      items: [
        {
          menuItemId: 'fries-1',
          selectedOptionIds: [],
          qty: 1, // 14000
        },
      ],
      menuItems: mockMenuItems,
    });

    expect(result.valid).toBe(true);
    expect(result.deliveryFee).toBe(0);
    expect(result.total).toBe(14000);
  });

  it('applies percentage promo code correctly', () => {
    const mockPromo: PromoDbSnapshot = {
      id: 'promo-10',
      code: 'TEZ10',
      type: 'PERCENT',
      value: 10,
      minOrder: 50000,
      startsAt: new Date('2026-01-01'),
      endsAt: new Date('2026-12-31'),
      usageLimit: 100,
      usedCount: 5,
      isActive: true,
    };

    const result = calculateOrderQuote({
      type: 'PICKUP',
      items: [
        {
          menuItemId: 'burger-1',
          selectedOptionIds: [],
          qty: 2, // 64000
        },
      ],
      menuItems: mockMenuItems,
      promo: mockPromo,
    });

    expect(result.valid).toBe(true);
    expect(result.subtotal).toBe(64000);
    expect(result.discount).toBe(6400); // 10%
    expect(result.total).toBe(57600);
  });
});
