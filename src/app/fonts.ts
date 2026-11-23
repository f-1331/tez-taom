import { Unbounded, Onest } from 'next/font/google';

export const unbounded = Unbounded({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  weight: ['600', '800'],
  variable: '--font-unbounded',
  display: 'swap',
});

export const onest = Onest({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  weight: ['400', '500', '700'],
  variable: '--font-onest',
  display: 'swap',
});
