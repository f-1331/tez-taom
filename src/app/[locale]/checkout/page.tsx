'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useCartStore } from '@/store/useCartStore';
import { formatPrice } from '@/lib/currency';
import { getLocalized } from '@/lib/i18n/get-localized';
import { useRouter } from '@/navigation';
import { Bike, ShoppingBag, Clock, MapPin, Phone, User, CreditCard, Banknote, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface CheckoutPageProps {
  params: {
    locale: string;
  };
}

export default function CheckoutPage({ params: { locale } }: CheckoutPageProps) {
  const t = useTranslations('checkout');
  const cartT = useTranslations('cart');
  const commonT = useTranslations('common');
  const router = useRouter();

  const { items, orderType, setOrderType, promoCode, clearCart } = useCartStore();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [addressText, setAddressText] = useState('');
  const [comment, setComment] = useState('');
  const [scheduledType, setScheduledType] = useState<'ASAP' | 'SCHEDULED'>('ASAP');
  const [scheduledTime, setScheduledTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD_ON_DELIVERY'>('CASH');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Server-side quote holati
  const [quote, setQuote] = useState<{
    subtotal: number;
    deliveryFee: number;
    discount: number;
    total: number;
  } | null>(null);

  // Telefon raqamini formatlash
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith('+998')) {
      val = '+998 ';
    }
    setPhone(val);
  };

  // Serverdan aniq kotirovkani olish
  useEffect(() => {
    if (items.length === 0) return;

    const fetchQuote = async () => {
      try {
        const payload = {
          type: orderType,
          items: items.map((i) => ({
            menuItemId: i.menuItemId,
            selectedOptionIds: i.selectedOptions.map((o) => o.optionId),
            qty: i.qty,
          })),
          promoCode: promoCode || undefined,
        };

        const res = await fetch('/api/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.valid) {
          setQuote({
            subtotal: data.subtotal,
            deliveryFee: data.deliveryFee,
            discount: data.discount,
            total: data.total,
          });
        }
      } catch (err) {
        console.error('Failed to get server quote:', err);
      }
    };

    fetchQuote();
  }, [items, orderType, promoCode]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (items.length === 0) {
      setError(cartT('emptyTitle'));
      return;
    }

    if (!customerName.trim() || customerName.trim().length < 2) {
      setError('Iltimos, ismingizni to‘liq kiriting');
      return;
    }

    const cleanPhone = phone.replace(/[^\d+]/g, '');
    if (cleanPhone.length < 13) {
      setError('Telefon raqamini to‘liq kiriting (+998 90 123 45 67)');
      return;
    }

    if (orderType === 'DELIVERY' && (!addressText || addressText.trim().length < 5)) {
      setError('Iltimos, yetkazib berish manzilini aniq kiriting (ko‘cha, uy, xonadon)');
      return;
    }

    setIsSubmitting(true);

    try {
      // Idempotency kaliti generatsiya qilish (UUIDv4)
      const idempotencyKey = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const orderPayload = {
        idempotencyKey,
        type: orderType,
        customerName: customerName.trim(),
        phone: cleanPhone,
        locale,
        addressText: orderType === 'DELIVERY' ? addressText.trim() : undefined,
        comment: comment.trim() || undefined,
        paymentMethod,
        promoCode: promoCode || undefined,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          selectedOptionIds: i.selectedOptions.map((o) => o.optionId),
          qty: i.qty,
          note: i.note,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || (data.errors && data.errors.join(', ')) || 'Buyurtma berishda xatolik yuz berdi');
        setIsSubmitting(false);
        return;
      }

      // Savatni tozalash va kuzatuv sahifasiga yo'naltirish
      clearCart();
      router.push(`/orders/${data.orderId}`);
    } catch (err: any) {
      setError('Internet bilan aloqa uzildi. Iltimos, qayta urinib ko‘ring.');
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl p-8 text-center border border-[#E2DDD7] shadow-sm">
        <div className="text-4xl mb-3">🛒</div>
        <h2 className="font-display font-bold text-lg text-[#231815] mb-2">{cartT('emptyTitle')}</h2>
        <p className="text-xs text-[#665E58] mb-6">{cartT('emptySubtitle')}</p>
        <button
          onClick={() => router.push('/')}
          className="bg-[#C92A1C] text-white px-5 py-2.5 rounded-xl font-bold text-xs"
        >
          {t('backToMenu')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8">
      <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#231815] mb-6">
        {t('title')}
      </h1>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Chap tomon: Form ma'lumotlari */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Yetkazish turi */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2DDD7] shadow-sm">
            <h2 className="font-display font-bold text-sm text-[#231815] mb-3">
              1. {t('deliveryType')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrderType('DELIVERY')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                  orderType === 'DELIVERY'
                    ? 'border-[#C92A1C] bg-[#FFF5F4] text-[#C92A1C]'
                    : 'border-[#E2DDD7] text-[#665E58] hover:border-[#C92A1C]/50'
                }`}
              >
                <Bike className="w-4 h-4" />
                <span>{t('delivery')}</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderType('PICKUP')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                  orderType === 'PICKUP'
                    ? 'border-[#C92A1C] bg-[#FFF5F4] text-[#C92A1C]'
                    : 'border-[#E2DDD7] text-[#665E58] hover:border-[#C92A1C]/50'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{t('pickup')}</span>
              </button>
            </div>
          </div>

          {/* 2. Mijoz ma'lumotlari */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2DDD7] shadow-sm space-y-4">
            <h2 className="font-display font-bold text-sm text-[#231815]">
              2. Aloqa ma’lumotlari
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#665E58] mb-1.5">
                  {t('name')} *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8C827D] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Alisher Fayzullayev"
                    className="w-full bg-[#FAF8F5] border border-[#E2DDD7] rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-[#C92A1C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#665E58] mb-1.5">
                  {t('phone')} *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#8C827D] absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="+998 90 123 45 67"
                    className="w-full bg-[#FAF8F5] border border-[#E2DDD7] rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono focus:outline-none focus:border-[#C92A1C]"
                  />
                </div>
              </div>
            </div>

            {orderType === 'DELIVERY' && (
              <div>
                <label className="block text-xs font-bold text-[#665E58] mb-1.5">
                  {t('address')} *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#8C827D] absolute left-3 top-3" />
                  <input
                    type="text"
                    required={orderType === 'DELIVERY'}
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    placeholder={t('addressPlaceholder')}
                    className="w-full bg-[#FAF8F5] border border-[#E2DDD7] rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-[#C92A1C]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#665E58] mb-1.5">
                {t('comment')}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('commentPlaceholder')}
                rows={2}
                className="w-full bg-[#FAF8F5] border border-[#E2DDD7] rounded-xl p-3 text-xs focus:outline-none focus:border-[#C92A1C]"
              />
            </div>
          </div>

          {/* 3. Yetkazish vaqti */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2DDD7] shadow-sm space-y-3">
            <h2 className="font-display font-bold text-sm text-[#231815]">
              3. {t('scheduledTime')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScheduledType('ASAP')}
                className={`p-3 rounded-xl border text-xs font-bold text-left transition-all flex items-center gap-2 ${
                  scheduledType === 'ASAP'
                    ? 'border-[#C92A1C] bg-[#FFF5F4] text-[#C92A1C]'
                    : 'border-[#E2DDD7] text-[#665E58]'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{t('asSoonAsPossible')}</span>
              </button>

              <button
                type="button"
                onClick={() => setScheduledType('SCHEDULED')}
                className={`p-3 rounded-xl border text-xs font-bold text-left transition-all flex items-center gap-2 ${
                  scheduledType === 'SCHEDULED'
                    ? 'border-[#C92A1C] bg-[#FFF5F4] text-[#C92A1C]'
                    : 'border-[#E2DDD7] text-[#665E58]'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{t('selectTime')}</span>
              </button>
            </div>

            {scheduledType === 'SCHEDULED' && (
              <div className="pt-2">
                <input
                  type="time"
                  min="09:00"
                  max="22:30"
                  step="900"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="bg-[#FAF8F5] border border-[#E2DDD7] rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            )}
          </div>

          {/* 4. To'lov usuli */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2DDD7] shadow-sm space-y-3">
            <h2 className="font-display font-bold text-sm text-[#231815]">
              4. {t('paymentMethod')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  paymentMethod === 'CASH'
                    ? 'border-[#C92A1C] bg-[#FFF5F4] text-[#C92A1C]'
                    : 'border-[#E2DDD7] text-[#665E58]'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>{t('cash')}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD_ON_DELIVERY')}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  paymentMethod === 'CARD_ON_DELIVERY'
                    ? 'border-[#C92A1C] bg-[#FFF5F4] text-[#C92A1C]'
                    : 'border-[#E2DDD7] text-[#665E58]'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>{t('cardOnDelivery')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* O'ng tomon: Buyurtma qisqacha mazmuni & Submit */}
        <div className="lg:col-span-5 sticky top-20">
          <div className="bg-[#FAF8F5] border border-[#E2DDD7] rounded-2xl p-6 shadow-receipt space-y-4">
            <h3 className="font-display font-bold text-base text-[#231815] pb-2 border-b border-dashed border-[#E2DDD7]">
              {cartT('title')}
            </h3>

            {/* Qisqacha taomlar */}
            <div className="space-y-2 max-h-56 overflow-y-auto text-xs font-sans">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-[#231815]">
                  <div>
                    <span className="font-medium">{getLocalized(item.name, locale)}</span>
                    <span className="text-[#8C827D] ml-1">x {item.qty}</span>
                  </div>
                  <span className="font-mono font-semibold">
                    {formatPrice(
                      (item.price +
                        item.selectedOptions.reduce((s, o) => s + o.priceDelta, 0)) *
                        item.qty,
                      locale
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Moliyaviy ko'rsatkichlar */}
            {quote && (
              <div className="space-y-1.5 pt-3 border-t-2 border-dashed border-[#E2DDD7] text-xs font-mono">
                <div className="flex justify-between text-[#665E58]">
                  <span>{cartT('subtotal')}:</span>
                  <span>{formatPrice(quote.subtotal, locale)}</span>
                </div>
                {orderType === 'DELIVERY' && (
                  <div className="flex justify-between text-[#665E58]">
                    <span>{cartT('deliveryFee')}:</span>
                    <span className={quote.deliveryFee === 0 ? 'text-emerald-700 font-bold' : ''}>
                      {quote.deliveryFee === 0 ? 'BEPUL' : formatPrice(quote.deliveryFee, locale)}
                    </span>
                  </div>
                )}
                {quote.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>{cartT('discount')}:</span>
                    <span>-{formatPrice(quote.discount, locale)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t border-[#E2DDD7] text-base font-bold text-[#231815]">
                  <span className="font-display">{cartT('total')}:</span>
                  <span className="text-xl text-[#C92A1C] font-mono">
                    {formatPrice(quote.total, locale)}
                  </span>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2 border border-red-200">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#C92A1C] hover:bg-[#A32014] disabled:opacity-50 text-white font-display font-bold py-4 px-6 rounded-xl text-base shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>{t('placing')}</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{t('placeOrder')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
