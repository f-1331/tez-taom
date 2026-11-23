'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCartStore } from '@/store/useCartStore';
import { formatPrice } from '@/lib/currency';
import { getLocalized } from '@/lib/i18n/get-localized';
import { useRouter } from '@/navigation';
import { Trash2, Plus, Minus, Tag, ArrowRight, ShoppingBag } from 'lucide-react';

interface ReceiptCartProps {
  locale: string;
  onCheckoutClick?: () => void;
}

export default function ReceiptCart({ locale, onCheckoutClick }: ReceiptCartProps) {
  const t = useTranslations('cart');
  const commonT = useTranslations('common');
  const router = useRouter();

  const {
    items,
    orderType,
    promoCode,
    promoDiscount,
    setPromo,
    removeItem,
    updateQty,
    clearCart,
    getSubtotal,
    setIsCartOpen,
  } = useCartStore();

  const [inputPromo, setInputPromo] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const subtotal = getSubtotal();
  const freeThreshold = 100000;
  const standardDelivery = 15000;

  let deliveryFee = 0;
  if (orderType === 'DELIVERY') {
    deliveryFee = subtotal >= freeThreshold ? 0 : standardDelivery;
  }

  const total = Math.max(0, subtotal - promoDiscount + deliveryFee);
  const remainingForFree = Math.max(0, freeThreshold - subtotal);

  const handleApplyPromo = async () => {
    if (!inputPromo.trim()) return;
    setIsApplyingPromo(true);
    setPromoError('');

    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inputPromo.trim(), subtotal }),
      });
      const data = await res.json();
      if (data.valid && data.promo) {
        setPromo(data.promo.code, data.promo.discount);
        setInputPromo('');
      } else {
        setPromoError(data.error || 'Promo-kod yaroqsiz');
      }
    } catch (err) {
      setPromoError('Promo-kodni tekshirishda xatolik');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    if (onCheckoutClick) {
      onCheckoutClick();
    } else {
      router.push('/checkout');
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-[#FAF8F5] border border-[#E2DDD7] rounded-2xl p-6 text-center text-[#665E58] shadow-receipt">
        <div className="w-14 h-14 bg-[#F5F2EF] rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
          🧾
        </div>
        <h3 className="font-display font-bold text-base text-[#231815] mb-1">
          {t('emptyTitle')}
        </h3>
        <p className="text-xs text-[#8C827D]">{t('emptySubtitle')}</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF8F5] border border-[#E2DDD7] rounded-2xl p-5 shadow-receipt text-[#231815] flex flex-col font-mono text-sm relative">
      {/* Receipt Header */}
      <div className="text-center pb-3 border-b-2 border-dashed border-[#E2DDD7] mb-3">
        <div className="font-display font-black text-lg text-[#C92A1C] uppercase tracking-wider">
          TEZ-TAOM
        </div>
        <div className="text-[11px] text-[#8C827D]">
          {new Date().toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })} —{' '}
          {orderType === 'DELIVERY' ? 'YETKAZIB BERISH' : 'OLIB KETISH'}
        </div>
      </div>

      {/* Free delivery indicator for delivery orders */}
      {orderType === 'DELIVERY' && (
        <div className="mb-3 bg-white p-2.5 rounded-lg border border-[#E8E3DD] text-xs">
          {remainingForFree > 0 ? (
            <div>
              <div className="flex justify-between text-[11px] text-[#665E58] mb-1 font-sans">
                <span>Bepul yetkazishgacha:</span>
                <span className="font-bold text-[#C92A1C]">{formatPrice(remainingForFree, locale)}</span>
              </div>
              <div className="w-full bg-[#F5F2EF] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#FFC93C] h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (subtotal / freeThreshold) * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-emerald-700 font-bold font-sans flex items-center gap-1.5 text-xs">
              <span>🎉</span>
              <span>Siz uchun yetkazib berish bepul!</span>
            </div>
          )}
        </div>
      )}

      {/* Items List */}
      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 mb-3">
        {items.map((item) => {
          const itemName = getLocalized(item.name, locale);
          const optionsDelta = item.selectedOptions.reduce((sum, opt) => sum + opt.priceDelta, 0);
          const itemTotal = (item.price + optionsDelta) * item.qty;

          return (
            <div key={item.id} className="pb-2 border-b border-[#EFEBE6] text-xs font-sans">
              <div className="flex justify-between items-start gap-2 mb-1">
                <div className="font-semibold text-[#231815] leading-tight">
                  {itemName}
                </div>
                <div className="font-mono font-bold whitespace-nowrap text-[#231815]">
                  {formatPrice(itemTotal, locale)}
                </div>
              </div>

              {/* Modifiers list */}
              {item.selectedOptions.length > 0 && (
                <div className="text-[11px] text-[#8C827D] mb-1.5 space-y-0.5">
                  {item.selectedOptions.map((opt) => (
                    <div key={opt.optionId} className="flex justify-between">
                      <span>+ {getLocalized(opt.name, locale)}</span>
                      {opt.priceDelta > 0 && (
                        <span>+{formatPrice(opt.priceDelta, locale)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Quantity controls */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 bg-white border border-[#E2DDD7] rounded-lg px-2 py-0.5">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="text-[#665E58] hover:text-[#C92A1C] p-0.5 transition-colors"
                    aria-label="Kamaytirish"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono font-bold text-xs px-1">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="text-[#665E58] hover:text-[#C92A1C] p-0.5 transition-colors"
                    aria-label="Oshirish"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="text-[#A39993] hover:text-[#C92A1C] p-1 transition-colors"
                  aria-label="O‘chirish"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Promo Code Input */}
      <div className="mb-3 pt-2 border-t border-dashed border-[#E2DDD7]">
        {promoCode ? (
          <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-2.5 py-1.5 rounded-lg text-xs font-sans">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span className="font-mono font-bold">{promoCode}</span>
              <span>(-{formatPrice(promoDiscount, locale)})</span>
            </div>
            <button
              onClick={() => setPromo(null, 0)}
              className="text-emerald-900 hover:text-red-600 font-bold text-sm ml-2"
            >
              ×
            </button>
          </div>
        ) : (
          <div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={inputPromo}
                onChange={(e) => setInputPromo(e.target.value.toUpperCase())}
                placeholder="Promo-kod (masalan: XUSH2026)"
                className="flex-1 bg-white border border-[#E2DDD7] rounded-lg px-2.5 py-1 text-xs font-mono uppercase focus:outline-none focus:border-[#C92A1C]"
              />
              <button
                onClick={handleApplyPromo}
                disabled={isApplyingPromo || !inputPromo.trim()}
                className="bg-[#231815] text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-[#3A2D2A] disabled:opacity-50 transition-all font-sans"
              >
                {isApplyingPromo ? '...' : 'Qo‘llash'}
              </button>
            </div>
            {promoError && (
              <p className="text-[11px] text-[#C92A1C] mt-1 font-sans">{promoError}</p>
            )}
          </div>
        )}
      </div>

      {/* Financial Summary */}
      <div className="space-y-1.5 pt-2 border-t-2 border-dashed border-[#E2DDD7] text-xs mb-4">
        <div className="flex justify-between text-[#665E58]">
          <span>{t('subtotal')}:</span>
          <span className="font-bold">{formatPrice(subtotal, locale)}</span>
        </div>

        {orderType === 'DELIVERY' && (
          <div className="flex justify-between text-[#665E58]">
            <span>{t('deliveryFee')}:</span>
            <span className={deliveryFee === 0 ? 'text-emerald-700 font-bold' : 'font-bold'}>
              {deliveryFee === 0 ? 'BEPUL' : formatPrice(deliveryFee, locale)}
            </span>
          </div>
        )}

        {promoDiscount > 0 && (
          <div className="flex justify-between text-emerald-700 font-bold">
            <span>{t('discount')}:</span>
            <span>-{formatPrice(promoDiscount, locale)}</span>
          </div>
        )}

        <div className="flex justify-between items-baseline pt-2 border-t border-[#E2DDD7] text-base font-bold text-[#231815]">
          <span className="font-display">{t('total')}:</span>
          <span className="font-mono text-lg text-[#C92A1C]">{formatPrice(total, locale)}</span>
        </div>
      </div>

      {/* Checkout Button */}
      <button
        onClick={handleCheckout}
        className="w-full bg-[#C92A1C] hover:bg-[#A32014] active:scale-[0.99] text-white font-display font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-sm font-sans"
      >
        <span>{t('checkoutBtn')}</span>
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Clear button */}
      <button
        onClick={clearCart}
        className="mt-2 text-[11px] text-[#8C827D] hover:text-[#C92A1C] text-center w-full transition-colors font-sans"
      >
        {t('clearCart')}
      </button>
    </div>
  );
}
