'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/navigation';
import { useCartStore } from '@/store/useCartStore';
import { formatPrice } from '@/lib/currency';
import { ShoppingBag, Globe, Bike, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  locale: string;
}

const LANGUAGES = [
  { code: 'uz', label: 'O‘zbekcha', short: 'UZ' },
  { code: 'uz-cyrl', label: 'Ўзбекча', short: 'ЎЗ' },
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'en', label: 'English', short: 'EN' },
];

export default function Header({ locale }: HeaderProps) {
  const t = useTranslations('header');
  const commonT = useTranslations('common');
  const cartT = useTranslations('cart');
  const pathname = usePathname();
  const router = useRouter();

  const { getTotalItems, getSubtotal, toggleCart, orderType, setOrderType } = useCartStore();
  const totalItems = getTotalItems();
  const subtotal = getSubtotal();

  const handleLanguageChange = (newLocale: string) => {
    // Cookie saqlash
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.replace(pathname, { locale: newLocale as any });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#E2DDD7] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2 font-display font-extrabold text-2xl text-[#C92A1C] tracking-tight hover:opacity-90 transition-opacity"
        >
          <span className="text-3xl">🍔</span>
          <span>Tez-Taom</span>
        </Link>

        {/* Order Type Toggle (Desktop) */}
        <div className="hidden md:flex items-center bg-[#F5F2EF] p-1 rounded-full border border-[#E2DDD7]">
          <button
            onClick={() => setOrderType('DELIVERY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              orderType === 'DELIVERY'
                ? 'bg-[#C92A1C] text-white shadow-sm'
                : 'text-[#231815] hover:text-[#C92A1C]'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Yetkazib berish</span>
          </button>
          <button
            onClick={() => setOrderType('PICKUP')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              orderType === 'PICKUP'
                ? 'bg-[#C92A1C] text-white shadow-sm'
                : 'text-[#231815] hover:text-[#C92A1C]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Olib ketish</span>
          </button>
        </div>

        {/* Right Section: Language Switcher & Cart Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          <div className="flex items-center bg-[#F5F2EF] rounded-lg p-0.5 border border-[#E2DDD7]">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                  locale.toLowerCase() === lang.code
                    ? 'bg-white text-[#C92A1C] shadow-sm'
                    : 'text-[#665E58] hover:text-[#231815]'
                }`}
                title={lang.label}
              >
                {lang.short}
              </button>
            ))}
          </div>

          {/* Cart Button */}
          <button
            onClick={toggleCart}
            aria-label={t('cart')}
            className="flex items-center gap-2 bg-[#FFC93C] hover:bg-[#E5B434] active:scale-95 text-[#231815] px-3.5 py-2 rounded-xl font-bold text-sm shadow-sm transition-all relative"
          >
            <ShoppingCart className="w-4 h-4 text-[#231815]" />
            <span className="hidden sm:inline font-mono">
              {subtotal > 0 ? formatPrice(subtotal, locale) : t('cart')}
            </span>
            {totalItems > 0 && (
              <span className="bg-[#C92A1C] text-white text-xs font-bold px-1.5 py-0.5 rounded-full animate-bounce sm:static absolute -top-1.5 -right-1.5">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
