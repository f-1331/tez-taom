import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true,
});

export const config = {
  // Match only internationalized pathnames, ignore api, static files, images
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
