'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { getLocalized } from '@/lib/i18n/get-localized';
import { formatPrice } from '@/lib/currency';
import { useCartStore } from '@/store/useCartStore';
import ModifierModal, { MenuItemWithModifiers } from './ModifierModal';
import ReceiptCart from './ReceiptCart';
import { Plus, Check, Sparkles, AlertCircle } from 'lucide-react';

interface MenuSectionProps {
  categories: any[];
  locale: string;
}

export default function MenuSection({ categories, locale }: MenuSectionProps) {
  const t = useTranslations('menu');
  const commonT = useTranslations('common');
  const { addItem, items: cartItems } = useCartStore();

  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id || '');
  const [selectedItemForMod, setSelectedItemForMod] = useState<MenuItemWithModifiers | null>(null);

  const handleItemClick = (item: any) => {
    if (item.modifiers && item.modifiers.length > 0) {
      setSelectedItemForMod(item);
    } else {
      // Modifiersiz taomni darhol savatga qo'shish
      addItem({
        id: item.id,
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        emoji: item.emoji || undefined,
        selectedOptions: [],
        qty: 1,
      });
    }
  };

  const isItemInCart = (itemId: string) => {
    return cartItems.some((ci) => ci.menuItemId === itemId);
  };

  return (
    <div id="menu-section" className="w-full">
      {/* Category Tabs (Sticky) */}
      <div className="sticky top-16 z-30 bg-[#F5F2EF]/95 backdrop-blur-md py-3 mb-6 border-b border-[#E2DDD7] overflow-x-auto scrollbar-none flex gap-2">
        {categories.map((cat) => {
          const catName = getLocalized(cat.name, locale);
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                const el = document.getElementById(`cat-${cat.id}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-display font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#C92A1C] text-white shadow-sm'
                  : 'bg-white text-[#231815] hover:bg-[#EFEBE6] border border-[#E2DDD7]'
              }`}
            >
              {catName}
            </button>
          );
        })}
      </div>

      {/* Main Grid: Menu Items (Left 2 cols) & Sticky Receipt (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Menu Board Content */}
        <div className="lg:col-span-8 space-y-10">
          {categories.map((cat) => {
            const catName = getLocalized(cat.name, locale);

            return (
              <div key={cat.id} id={`cat-${cat.id}`} className="space-y-4 scroll-mt-32">
                <div className="flex items-center gap-3">
                  <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#231815]">
                    {catName}
                  </h2>
                  <div className="h-0.5 flex-1 bg-[#E2DDD7]" />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {cat.items.map((item: any) => {
                    const itemName = getLocalized(item.name, locale);
                    const itemDesc = getLocalized(item.description, locale);
                    const hasMods = item.modifiers && item.modifiers.length > 0;
                    const inCart = isItemInCart(item.id);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E2DDD7] hover:border-[#C92A1C]/50 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between gap-3 sm:gap-4 group"
                      >
                        {/* Left: 64px Tile (Emoji / Image) */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#FAF8F5] rounded-xl flex items-center justify-center text-3xl sm:text-4xl border border-[#EFEBE6] shrink-0 group-hover:scale-105 transition-transform">
                          {item.emoji || '🍔'}
                        </div>

                        {/* Middle: Name, description & tags */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-display font-bold text-sm sm:text-base text-[#231815] truncate">
                              {itemName}
                            </h3>
                            {item.tags?.includes('popular') && (
                              <span className="bg-[#FFF5F4] text-[#C92A1C] text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-[#C92A1C]/20 shrink-0">
                                {t('popular')}
                              </span>
                            )}
                            {item.tags?.includes('new') && (
                              <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-amber-200 shrink-0">
                                {t('new')}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[#665E58] line-clamp-2 leading-relaxed">
                            {itemDesc}
                          </p>

                          {item.allergens && item.allergens.length > 0 && (
                            <div className="text-[10px] text-[#8C827D] mt-1 flex items-center gap-1">
                              <span>⚠️ {item.allergens.join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Right: Price & Add Button */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0 pl-1">
                          <span className="font-mono font-bold text-sm sm:text-base text-[#231815]">
                            {formatPrice(item.price, locale)}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(item);
                            }}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold font-sans transition-all active:scale-95 shadow-sm ${
                              inCart
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-[#FFC93C] text-[#231815] hover:bg-[#E5B434]'
                            }`}
                          >
                            {inCart ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{t('added')}</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>{hasMods ? t('customize') : t('addToCart')}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Sticky Receipt for Desktop */}
        <div className="hidden lg:block lg:col-span-4 sticky top-20">
          <ReceiptCart locale={locale} />
        </div>
      </div>

      {/* Modifier Modal */}
      <ModifierModal
        item={selectedItemForMod}
        locale={locale}
        onClose={() => setSelectedItemForMod(null)}
      />
    </div>
  );
}
