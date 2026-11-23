'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/currency';
import { getLocalized } from '@/lib/i18n/get-localized';
import { useRouter } from '@/navigation';
import {
  Clock,
  CheckCircle,
  ChefHat,
  Bike,
  PackageCheck,
  AlertOctagon,
  ArrowLeft,
  Sparkles,
  Phone,
  MapPin,
} from 'lucide-react';
import { OrderStatus, OrderType } from '@/types';

interface OrderTrackingPageProps {
  params: {
    locale: string;
    id: string;
  };
}

export default function OrderTrackingPage({ params: { locale, id } }: OrderTrackingPageProps) {
  const t = useTranslations('orderStatus');
  const commonT = useTranslations('common');
  const cartT = useTranslations('cart');
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>('NEW');

  // Dastlabki buyurtma ma'lumotlarini yuklash
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        const data = await res.json();
        if (data.success && data.order) {
          setOrder(data.order);
          setCurrentStatus(data.order.status);
        } else {
          setError(data.error || 'Buyurtma topilmadi');
        }
      } catch (err) {
        setError('Ma’lumotlarni yuklashda xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  // Real-time SSE oqimini ulash
  useEffect(() => {
    if (!id) return;

    const eventSource = new EventSource(`/api/orders/${id}/stream`);

    eventSource.addEventListener('status', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.status) {
          setCurrentStatus(payload.status);
          setOrder((prev: any) => (prev ? { ...prev, status: payload.status } : prev));
        }
      } catch (err) {
        console.error('SSE status parse error:', err);
      }
    });

    eventSource.onerror = () => {
      // Aloqa uzilsa SSE avtomatik qayta ulanadi
      console.warn('SSE connection interrupted, retrying...');
    };

    return () => {
      eventSource.close();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center text-[#665E58]">
        <div className="w-12 h-12 border-4 border-[#C92A1C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-display font-semibold">{commonT('loading')}</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl p-6 text-center border border-[#E2DDD7] shadow-sm">
        <AlertOctagon className="w-12 h-12 text-[#C92A1C] mx-auto mb-3" />
        <h2 className="font-display font-bold text-lg text-[#231815] mb-2">{commonT('error')}</h2>
        <p className="text-xs text-[#665E58] mb-6">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="bg-[#C92A1C] text-white px-5 py-2.5 rounded-xl font-bold text-xs"
        >
          {commonT('back')}
        </button>
      </div>
    );
  }

  const isDelivery = order.type === 'DELIVERY';

  // Timeline qadamlari
  const deliverySteps: { status: OrderStatus; label: string; icon: any }[] = [
    { status: 'NEW', label: t('statusNew'), icon: Clock },
    { status: 'CONFIRMED', label: t('statusConfirmed'), icon: CheckCircle },
    { status: 'PREPARING', label: t('statusPreparing'), icon: ChefHat },
    { status: 'READY', label: t('statusReady'), icon: PackageCheck },
    { status: 'ON_THE_WAY', label: t('statusOnTheWay'), icon: Bike },
    { status: 'DELIVERED', label: t('statusDelivered'), icon: CheckCircle },
  ];

  const pickupSteps: { status: OrderStatus; label: string; icon: any }[] = [
    { status: 'NEW', label: t('statusNew'), icon: Clock },
    { status: 'CONFIRMED', label: t('statusConfirmed'), icon: CheckCircle },
    { status: 'PREPARING', label: t('statusPreparing'), icon: ChefHat },
    { status: 'READY', label: t('statusReady'), icon: PackageCheck },
    { status: 'PICKED_UP', label: t('statusPickedUp'), icon: CheckCircle },
  ];

  const steps = isDelivery ? deliverySteps : pickupSteps;
  const currentStepIndex = steps.findIndex((s) => s.status === currentStatus);
  const isCanceled = currentStatus === 'CANCELED';

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 text-xs font-bold text-[#665E58] hover:text-[#C92A1C] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{commonT('back')}</span>
      </button>

      {/* Hero Status Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2DDD7] shadow-sm text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-2 bg-[#FFF5F4] text-[#C92A1C] px-3.5 py-1.5 rounded-full text-xs font-bold mb-3 border border-[#C92A1C]/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('orderNumber', { number: order.number })}</span>
        </div>

        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#231815] mb-2">
          {isCanceled
            ? t('statusCanceled')
            : steps[currentStepIndex]?.label || currentStatus}
        </h1>

        <p className="text-xs text-[#8C827D] font-mono mb-4">
          {t('liveUpdates')}
        </p>

        {!isCanceled && (
          <div className="inline-block bg-[#F5F2EF] px-4 py-2 rounded-xl text-xs font-semibold text-[#231815]">
            {t('etaText', { minutes: isDelivery ? '25–35' : '15–20' })}
          </div>
        )}
      </div>

      {/* Progress Timeline */}
      {!isCanceled && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2DDD7] shadow-sm space-y-6">
          <h2 className="font-display font-bold text-base text-[#231815]">
            {t('timelineTitle')}
          </h2>

          <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E2DDD7]">
            {steps.map((step, idx) => {
              const isPast = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const Icon = step.icon;

              return (
                <div key={step.status} className="relative flex items-center gap-4">
                  {/* Step Dot */}
                  <div
                    className={`absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-[#C92A1C] text-white ring-4 ring-[#FFF5F4]'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border-2 border-[#E2DDD7] text-[#8C827D]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Step Label */}
                  <div className="pl-3">
                    <div
                      className={`text-xs sm:text-sm font-bold ${
                        isCurrent
                          ? 'text-[#C92A1C]'
                          : isPast
                          ? 'text-[#231815]'
                          : 'text-[#8C827D]'
                      }`}
                    >
                      {step.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Courier details if assigned and on the way */}
      {order.courier && currentStatus === 'ON_THE_WAY' && (
        <div className="bg-[#FAF8F5] border border-[#E2DDD7] rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFC93C] rounded-full flex items-center justify-center text-lg">
              🛵
            </div>
            <div>
              <div className="text-xs text-[#8C827D]">Sizning kuryeringiz</div>
              <div className="font-bold text-sm text-[#231815]">{order.courier.name}</div>
            </div>
          </div>
          <div className="text-xs font-mono font-semibold text-[#C92A1C]">
            {order.courier.phone}
          </div>
        </div>
      )}

      {/* Receipt Details Card */}
      <div className="bg-[#FAF8F5] border border-[#E2DDD7] rounded-2xl p-6 shadow-receipt space-y-4">
        <h3 className="font-display font-bold text-sm text-[#231815] pb-2 border-b border-dashed border-[#E2DDD7]">
          {cartT('title')}
        </h3>

        <div className="text-xs space-y-1 text-[#665E58]">
          <div>
            <span className="font-semibold text-[#231815]">Mijoz:</span> {order.customerName} (
            {order.phone})
          </div>
          {order.addressText && (
            <div>
              <span className="font-semibold text-[#231815]">Manzil:</span> {order.addressText}
            </div>
          )}
          {order.comment && (
            <div>
              <span className="font-semibold text-[#231815]">Izoh:</span> {order.comment}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="space-y-2 pt-2 border-t border-[#EFEBE6] text-xs font-sans">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex justify-between items-center text-[#231815]">
              <div>
                <span>{getLocalized(item.nameSnapshot, locale)}</span>
                <span className="text-[#8C827D] ml-1">x {item.qty}</span>
              </div>
              <span className="font-mono font-semibold">
                {formatPrice(item.priceSnapshot * item.qty, locale)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-1 pt-3 border-t-2 border-dashed border-[#E2DDD7] text-xs font-mono">
          <div className="flex justify-between text-[#665E58]">
            <span>{cartT('subtotal')}:</span>
            <span>{formatPrice(order.subtotal, locale)}</span>
          </div>
          {isDelivery && (
            <div className="flex justify-between text-[#665E58]">
              <span>{cartT('deliveryFee')}:</span>
              <span>
                {order.deliveryFee === 0 ? 'BEPUL' : formatPrice(order.deliveryFee, locale)}
              </span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>{cartT('discount')}:</span>
              <span>-{formatPrice(order.discount, locale)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-2 border-t border-[#E2DDD7] text-base font-bold text-[#231815]">
            <span className="font-display">{cartT('total')}:</span>
            <span className="text-xl text-[#C92A1C] font-mono">
              {formatPrice(order.total, locale)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
