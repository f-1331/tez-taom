import { LocalizedText } from '@/types';

export function getLocalized(text: LocalizedText | any, locale: string = 'uz'): string {
  if (!text) return '';
  if (typeof text === 'string') return text;

  const normalizedLocale = locale.toLowerCase();

  if (normalizedLocale === 'uz-cyrl' || normalizedLocale === 'uz-cyrl') {
    return text['uz-Cyrl'] || text['uz-cyrl'] || text.uz || '';
  }

  if (normalizedLocale === 'ru') {
    return text.ru || text.uz || '';
  }

  if (normalizedLocale === 'en') {
    return text.en || text.uz || '';
  }

  return text.uz || text.ru || text.en || '';
}
