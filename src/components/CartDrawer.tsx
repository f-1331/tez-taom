'use client';

import React from 'react';
import { useCartStore } from '@/store/useCartStore';
import ReceiptCart from './ReceiptCart';
import { X } from 'lucide-react';

interface CartDrawerProps {
  locale: string;
}

export default function CartDrawer({ locale }: CartDrawerProps) {
  const { isCartOpen, setIsCartOpen } = useCartStore();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Drawer content */}
      <div className="relative z-10 w-full max-w-md bg-[#FAF8F5] h-full shadow-2xl flex flex-col p-4 sm:p-6 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#E2DDD7]">
          <h2 className="font-display font-bold text-lg text-[#231815]">Sizning savatchangiz</h2>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1 rounded-full text-[#665E58] hover:text-[#231815] hover:bg-[#F5F2EF] transition-colors"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ReceiptCart locale={locale} onCheckoutClick={() => setIsCartOpen(false)} />
      </div>
    </div>
  );
}
