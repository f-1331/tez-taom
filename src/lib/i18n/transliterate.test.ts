import { describe, it, expect } from 'vitest';
import { transliterateUzLatToCyrl } from './transliterate';

describe('transliterateUzLatToCyrl', () => {
  it('correctly transliterates basic Uzbek fast food terms', () => {
    expect(transliterateUzLatToCyrl('Tez-Taom')).toBe('Тез-Таом');
    expect(transliterateUzLatToCyrl('Klassik burger')).toBe('Классик бургер');
    expect(transliterateUzLatToCyrl('Kartoshka fri')).toBe('Картошка фри');
    expect(transliterateUzLatToCyrl('Mol go‘shti')).toBe('Мол гўшти');
    expect(transliterateUzLatToCyrl('Tovuqli lavash')).toBe('Товуқли лаваш');
  });

  it('handles special Uzbek letters: o‘, g‘, q, h', () => {
    expect(transliterateUzLatToCyrl("O'zbekiston")).toBe('Ўзбекистон');
    expect(transliterateUzLatToCyrl("G'alaba")).toBe('Ғалаба');
    expect(transliterateUzLatToCyrl('Qo‘shimcha pishloq')).toBe('Қўшимча пишлоқ');
    expect(transliterateUzLatToCyrl('Hush kelibsiz')).toBe('Ҳуш келибсиз');
  });

  it('handles sh, ch, yo, yu, ya, ye diphthongs', () => {
    expect(transliterateUzLatToCyrl('Shirinlik')).toBe('Ширинлик');
    expect(transliterateUzLatToCyrl('Choy')).toBe('Чой');
    expect(transliterateUzLatToCyrl('Yaxna ichimlik')).toBe('Яхна ичимлик');
    expect(transliterateUzLatToCyrl('Yulduz')).toBe('Юлдуз');
    expect(transliterateUzLatToCyrl('Yog‘')).toBe('Ёғ');
    expect(transliterateUzLatToCyrl('Yelim')).toBe('Елим');
  });

  it('correctly distinguishes E / E rule (Э at start / after vowel, Е inside word)', () => {
    expect(transliterateUzLatToCyrl('Eshik')).toBe('Эшик');
    expect(transliterateUzLatToCyrl('Besh')).toBe('Беш');
    expect(transliterateUzLatToCyrl('Katta ehtirom')).toBe('Катта эҳтиром');
  });

  it('handles tutuq belgisi (apostrophe)', () => {
    expect(transliterateUzLatToCyrl("San'at")).toBe('Санъат');
    expect(transliterateUzLatToCyrl("Ma'suliyat")).toBe('Маъсулият');
  });
});
