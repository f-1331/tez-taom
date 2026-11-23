import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { locales } from '@/i18n';
import { unbounded, onest } from '../fonts';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'common' });
  const heroT = await getTranslations({ locale, namespace: 'hero' });

  return {
    title: `${t('appName')} — ${t('tagline')}`,
    description: heroT('subtitle'),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        uz: '/uz',
        'uz-cyrl': '/uz-cyrl',
        ru: '/ru',
        en: '/en',
      },
    },
    openGraph: {
      title: `${t('appName')} — ${t('tagline')}`,
      description: heroT('subtitle'),
      type: 'website',
      locale,
    },
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${unbounded.variable} ${onest.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#F5F2EF] text-[#231815] selection:bg-[#FFC93C]">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Header locale={locale} />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <CartDrawer locale={locale} />
          <Footer locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
