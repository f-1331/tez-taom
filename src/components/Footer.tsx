import React from 'react';
import { useTranslations } from 'next-intl';
import { Clock, Phone, MapPin, ShieldCheck } from 'lucide-react';

interface FooterProps {
  locale: string;
}

export default function Footer({ locale }: FooterProps) {
  const t = useTranslations('footer');
  const commonT = useTranslations('common');

  return (
    <footer className="w-full bg-[#231815] text-[#FAF8F5] mt-16 border-t border-[#3A2D2A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Info */}
          <div>
            <div className="flex items-center gap-2 font-display font-extrabold text-2xl text-[#FFC93C] mb-3">
              <span>🍔</span>
              <span>Tez-Taom</span>
            </div>
            <p className="text-[#B3A9A3] text-sm leading-relaxed mb-4">
              {commonT('tagline')}. Toshkent shahri bo‘ylab eng tezkor va issiq taomlar yetkazib berish xizmati.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#E5B434]">
              <ShieldCheck className="w-4 h-4" />
              <span>100% Halol va yangi mahsulotlar</span>
            </div>
          </div>

          {/* Working Hours & Contacts */}
          <div className="space-y-3 text-sm text-[#D6CECA]">
            <h4 className="font-display font-bold text-base text-white mb-2">Ish tartibi va aloqa</h4>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FFC93C]" />
              <span>{t('workingHours')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#FFC93C]" />
              <a href="tel:+998712000000" className="hover:text-white transition-colors">
                {t('phone')}
              </a>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#FFC93C] shrink-0 mt-0.5" />
              <span>{t('address')}</span>
            </div>
          </div>

          {/* Legal Pages & Note */}
          <div className="text-sm text-[#B3A9A3]">
            <h4 className="font-display font-bold text-base text-white mb-2">Huquqiy ma’lumotlar</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <span className="hover:underline cursor-pointer">Ommaviy oferta (Namunaviy)</span>
                <span className="ml-1 text-[10px] text-[#FFC93C]">(Yurist ko‘rib chiqsin)</span>
              </li>
              <li>
                <span className="hover:underline cursor-pointer">Maxfiylik siyosati</span>
                <span className="ml-1 text-[10px] text-[#FFC93C]">(Yurist ko‘rib chiqsin)</span>
              </li>
              <li>
                <span className="hover:underline cursor-pointer">Yetkazib berish va to‘lov shartlari</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#3A2D2A] text-center text-xs text-[#8C827D]">
          <p>© {new Date().getFullYear()} Tez-Taom. {t('rights')}</p>
        </div>
      </div>
    </footer>
  );
}
