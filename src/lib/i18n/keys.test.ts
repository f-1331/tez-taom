import { describe, it, expect } from 'vitest';
import uz from '../../../messages/uz.json';
import uzCyrl from '../../../messages/uz-cyrl.json';
import ru from '../../../messages/ru.json';
import en from '../../../messages/en.json';

function getKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getKeys(obj[key], fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys.sort();
}

describe('i18n key parity', () => {
  const uzKeys = getKeys(uz);
  const uzCyrlKeys = getKeys(uzCyrl);
  const ruKeys = getKeys(ru);
  const enKeys = getKeys(en);

  it('verifies uz and uz-cyrl have identical keys', () => {
    expect(uzCyrlKeys).toEqual(uzKeys);
  });

  it('verifies uz and ru have identical keys', () => {
    expect(ruKeys).toEqual(uzKeys);
  });

  it('verifies uz and en have identical keys', () => {
    expect(enKeys).toEqual(uzKeys);
  });
});
