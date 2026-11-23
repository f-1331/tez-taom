'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { getLocalized } from '@/lib/i18n/get-localized';
import { formatPrice } from '@/lib/currency';
import { useCartStore } from '@/store/useCartStore';
import { X, Check, Plus, Minus } from 'lucide-react';
import { CartModifierOption } from '@/types';

interface ModifierOptionItem {
  id: string;
  name: any;
  priceDelta: number;
}

interface ModifierGroupItem {
  id: string;
  name: any;
  required: boolean;
  min: number;
  max: number;
  options: ModifierOptionItem[];
}

export interface MenuItemWithModifiers {
  id: string;
  name: any;
  description: any;
  price: number;
  emoji?: string | null;
  allergens?: string[];
  modifiers: ModifierGroupItem[];
}

interface ModifierModalProps {
  item: MenuItemWithModifiers | null;
  locale: string;
  onClose: () => void;
}

export default function ModifierModal({ item, locale, onClose }: ModifierModalProps) {
  const t = useTranslations('menu');
  const commonT = useTranslations('common');
  const { addItem, toggleCart } = useCartStore();

  const [selectedOptions, setSelectedOptions] = useState<Map<string, ModifierOptionItem>>(new Map());
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  if (!item) return null;

  const itemName = getLocalized(item.name, locale);
  const itemDesc = getLocalized(item.description, locale);

  const handleToggleOption = (group: ModifierGroupItem, opt: ModifierOptionItem) => {
    const next = new Map(selectedOptions);

    if (group.max === 1) {
      // Radio uslubi (faqat bitta tanlanadi)
      // Guruhdagi boshqa barcha variantlarni o'chirish
      for (const o of group.options) {
        next.delete(o.id);
      }
      next.set(opt.id, opt);
    } else {
      // Checkbox uslubi
      if (next.has(opt.id)) {
        next.delete(opt.id);
      } else {
        // Guruhdagi tanlanganlar sonini tekshirish
        const countInGroup = group.options.filter((o) => next.has(o.id)).length;
        if (countInGroup < group.max) {
          next.set(opt.id, opt);
        }
      }
    }
    setSelectedOptions(next);
  };

  // Majburiy variantlar tekshiruvi
  let canAdd = true;
  for (const group of item.modifiers) {
    const countInGroup = group.options.filter((o) => selectedOptions.has(o.id)).length;
    if (group.required && countInGroup < Math.max(1, group.min)) {
      canAdd = false;
      break;
    }
  }

  // Dinamik narx
  const optionsDelta = Array.from(selectedOptions.values()).reduce(
    (sum, opt) => sum + opt.priceDelta,
    0
  );
  const unitPrice = item.price + optionsDelta;
  const totalPrice = unitPrice * qty;

  const handleAddToCart = () => {
    if (!canAdd) return;

    const chosenModifiers: CartModifierOption[] = [];
    for (const group of item.modifiers) {
      for (const opt of group.options) {
        if (selectedOptions.has(opt.id)) {
          chosenModifiers.push({
            optionId: opt.id,
            groupId: group.id,
            name: opt.name,
            priceDelta: opt.priceDelta,
          });
        }
      }
    }

    const cartItemId = `${item.id}-${chosenModifiers.map((m) => m.optionId).sort().join('_')}`;

    addItem({
      id: cartItemId,
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      emoji: item.emoji || undefined,
      selectedOptions: chosenModifiers,
      qty,
      note: note.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2DDD7] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{item.emoji || '🍔'}</span>
            <div>
              <h3 className="font-display font-bold text-lg text-[#231815] leading-tight">
                {itemName}
              </h3>
              <p className="text-xs text-[#8C827D] font-mono font-semibold">
                {formatPrice(item.price, locale)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#665E58] hover:text-[#231815] hover:bg-[#EFEBE6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {itemDesc && (
            <p className="text-xs sm:text-sm text-[#665E58] leading-relaxed">
              {itemDesc}
            </p>
          )}

          {/* Modifiers groups */}
          {item.modifiers.map((group) => {
            const groupName = getLocalized(group.name, locale);
            return (
              <div key={group.id} className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-[#231815] font-display">{groupName}</span>
                  <span className="text-[11px] text-[#8C827D]">
                    {group.required ? (
                      <span className="text-[#C92A1C]">{t('required')}</span>
                    ) : (
                      t('optional')
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {group.options.map((opt) => {
                    const isSelected = selectedOptions.has(opt.id);
                    const optName = getLocalized(opt.name, locale);

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleToggleOption(group, opt)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
                          isSelected
                            ? 'border-[#C92A1C] bg-[#FFF5F4] text-[#C92A1C] font-semibold'
                            : 'border-[#E2DDD7] bg-[#FAF8F5] text-[#231815] hover:border-[#C92A1C]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'bg-[#C92A1C] border-[#C92A1C] text-white'
                                : 'border-[#A39993] bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span>{optName}</span>
                        </div>

                        <span className="font-mono text-xs">
                          {opt.priceDelta > 0 ? `+${formatPrice(opt.priceDelta, locale)}` : '0 so‘m'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Izoh (Special instructions) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#231815] block">
              Taomga alohida izoh (ixtiyoriy)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Masalan: sousni alohida idishga soling"
              className="w-full bg-[#FAF8F5] border border-[#E2DDD7] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C92A1C]"
              maxLength={150}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#E2DDD7] bg-[#FAF8F5] flex items-center justify-between gap-3">
          {/* Qty selector */}
          <div className="flex items-center gap-3 bg-white border border-[#E2DDD7] rounded-xl p-1.5 px-3">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="text-[#665E58] hover:text-[#C92A1C] p-1"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-sm px-1 min-w-[20px] text-center">
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="text-[#665E58] hover:text-[#C92A1C] p-1"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add button */}
          <button
            onClick={handleAddToCart}
            disabled={!canAdd}
            className="flex-1 bg-[#C92A1C] hover:bg-[#A32014] disabled:opacity-50 text-white font-display font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-between shadow-md transition-all"
          >
            <span>{t('addToCart')}</span>
            <span className="font-mono">{formatPrice(totalPrice, locale)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
