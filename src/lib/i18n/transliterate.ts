/**
 * O'zbek tili lotin alifbosidan kirill alifbosiga deterministik transliteratsiya moduli.
 * Fonetik va imlo qoidalariga asoslangan (o', g', sh, ch, e/e, yo, yu, ya, tutuq belgisi).
 */

const VOWELS_LATIN = new Set(['a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U']);

export function transliterateUzLatToCyrl(input: string): string {
  if (!input) return '';

  // Standartlashtirish: turli tutuq belgilari
  let text = input
    .replace(/[ʻ‘’`]/g, "'")
    // Shartli maxsus juftliklar
    .replace(/O['’ʻ`]/g, 'Ў')
    .replace(/o['’ʻ`]/g, 'ў')
    .replace(/G['’ʻ`]/g, 'Ғ')
    .replace(/g['’ʻ`]/g, 'ғ');

  // Birikmalar va maxsus harflar
  const compoundRules: [RegExp, string][] = [
    [/Sh/g, 'Ш'],
    [/SH/g, 'Ш'],
    [/sh/g, 'ш'],
    [/Ch/g, 'Ч'],
    [/CH/g, 'Ч'],
    [/ch/g, 'ч'],
    [/Yo/g, 'Ё'],
    [/YO/g, 'Ё'],
    [/yo/g, 'ё'],
    [/Yu/g, 'Ю'],
    [/YU/g, 'Ю'],
    [/yu/g, 'ю'],
    [/Ya/g, 'Я'],
    [/YA/g, 'Я'],
    [/ya/g, 'я'],
    [/Ye/g, 'Е'],
    [/YE/g, 'Е'],
    [/ye/g, 'е'],
  ];

  for (const [regex, replacement] of compoundRules) {
    text = text.replace(regex, replacement);
  }

  // So'z boshidagi yoki unlidan keyingi E/e -> Э/э qoidasi
  const chars = Array.from(text);
  const result: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const prevChar = i > 0 ? chars[i - 1] : '';

    if (char === 'E' || char === 'e') {
      const isWordStart = i === 0 || /\s|[.,\/#!$%\^&\*;:{}=\-_`~()?]/.test(prevChar);
      const isAfterVowel = VOWELS_LATIN.has(prevChar);

      if (isWordStart || isAfterVowel) {
        result.push(char === 'E' ? 'Э' : 'э');
        continue;
      } else {
        result.push(char === 'E' ? 'Е' : 'е');
        continue;
      }
    }

    result.push(char);
  }

  let processed = result.join('');

  // Tutuq belgisi (apostrof) harfdan keyin -> ъ
  processed = processed.replace(/([a-zA-Zа-яА-ЯўғқҳЎҒҚҲ])'/g, '$1ъ');

  // Qolgan alohida harflar jadvali
  const singleCharMap: Record<string, string> = {
    a: 'а', A: 'А',
    b: 'б', B: 'Б',
    d: 'д', D: 'Д',
    f: 'ф', F: 'Ф',
    g: 'г', G: 'Г',
    h: 'ҳ', H: 'Ҳ',
    i: 'и', I: 'И',
    j: 'ж', J: 'Ж',
    k: 'к', K: 'К',
    l: 'л', L: 'Л',
    m: 'м', M: 'М',
    n: 'н', N: 'Н',
    o: 'о', O: 'О',
    p: 'п', P: 'П',
    q: 'қ', Q: 'Қ',
    r: 'р', R: 'Р',
    s: 'с', S: 'С',
    t: 'т', T: 'Т',
    u: 'у', U: 'У',
    v: 'в', V: 'В',
    x: 'х', X: 'Х',
    y: 'й', Y: 'Й',
    z: 'з', Z: 'З',
  };

  return Array.from(processed)
    .map((c) => singleCharMap[c] ?? c)
    .join('');
}
