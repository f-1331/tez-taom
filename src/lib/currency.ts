/**
 * Valyuta va narx formatlash yordamchilari.
 * Baza va tizim ichida har doim butun so'm (Int) saqlanadi.
 */

export function somToTiyin(som: number): number {
  if (!Number.isFinite(som)) return 0;
  return Math.round(som * 100);
}

export function tiyinToSom(tiyin: number): number {
  if (!Number.isFinite(tiyin)) return 0;
  return Math.round(tiyin / 100);
}

export function formatPrice(price: number, locale: string = 'uz'): string {
  const normalizedLocale = locale.toLowerCase();
  const formattedNumber = new Intl.NumberFormat('ru-RU').format(Math.round(price));

  switch (normalizedLocale) {
    case 'uz':
      return `${formattedNumber} so‘m`;
    case 'uz-cyrl':
      return `${formattedNumber} сўм`;
    case 'ru':
      return `${formattedNumber} сум`;
    case 'en':
      return `UZS ${formattedNumber}`;
    default:
      return `${formattedNumber} so‘m`;
  }
}
