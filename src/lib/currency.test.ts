import { describe, it, expect } from 'vitest';
import { somToTiyin, tiyinToSom, formatPrice } from './currency';

describe('currency utilities', () => {
  it('converts so‘m to tiyin correctly', () => {
    expect(somToTiyin(100)).toBe(10000);
    expect(somToTiyin(49000)).toBe(4900000);
    expect(somToTiyin(0)).toBe(0);
  });

  it('converts tiyin to so‘m correctly', () => {
    expect(tiyinToSom(10000)).toBe(100);
    expect(tiyinToSom(4900000)).toBe(49000);
    expect(tiyinToSom(0)).toBe(0);
  });

  it('formats prices across all 4 locales', () => {
    expect(formatPrice(32000, 'uz')).toBe('32 000 so‘m');
    expect(formatPrice(32000, 'uz-cyrl')).toBe('32 000 сўм');
    expect(formatPrice(32000, 'ru')).toBe('32 000 сум');
    expect(formatPrice(32000, 'en')).toBe('UZS 32 000');
  });
});
