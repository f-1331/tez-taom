'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Zap, Clock, Shield } from 'lucide-react';

interface HeroProps {
  locale: string;
}

export default function Hero({ locale }: HeroProps) {
  const t = useTranslations('hero');
  const cartT = useTranslations('cart');

  const scrollToMenu = () => {
    const el = document.getElementById('menu-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full bg-[#C92A1C] text-white rounded-2xl md:rounded-3xl p-6 sm:p-10 md:p-12 mb-8 shadow-md relative overflow-hidden">
      {/* Background graphic elements */}
      <div className="absolute -right-10 -bottom-10 opacity-10 text-[180px] select-none pointer-events-none">
        🍔
      </div>

      <div className="relative z-10 max-w-2xl">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-xs font-bold text-white mb-4">
          <Zap className="w-3.5 h-3.5 text-[#FFC93C]" />
          <span>{cartT('freeDeliveryNotice')}</span>
        </div>

        {/* Main Title */}
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl leading-tight tracking-tight mb-4 text-white">
          {t('title')}
        </h1>

        {/* Subtitle */}
        <p className="text-white/90 text-sm sm:text-base md:text-lg mb-8 leading-relaxed max-w-xl">
          {t('subtitle')}
        </p>

        {/* Action Button & Badges */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={scrollToMenu}
            className="bg-[#FFC93C] hover:bg-[#E5B434] active:scale-95 text-[#231815] font-display font-bold px-7 py-3.5 rounded-xl text-base shadow-lg transition-all"
          >
            {t('cta')}
          </button>

          <div className="flex items-center gap-4 text-xs font-medium text-white/90">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#FFC93C]" />
              <span>25–35 daqiqa</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#FFC93C]" />
              <span>Issiq holda</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
