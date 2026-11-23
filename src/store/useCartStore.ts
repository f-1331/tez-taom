import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, OrderType } from '@/types';

interface CartState {
  items: CartItem[];
  orderType: OrderType;
  promoCode: string | null;
  promoDiscount: number;
  isCartOpen: boolean;

  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQty: (itemId: string, delta: number) => void;
  setOrderType: (type: OrderType) => void;
  setPromo: (code: string | null, discount?: number) => void;
  clearCart: () => void;
  setIsCartOpen: (open: boolean) => void;
  toggleCart: () => void;

  getTotalItems: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orderType: 'DELIVERY',
      promoCode: null,
      promoDiscount: 0,
      isCartOpen: false,

      addItem: (newItem) => {
        set((state) => {
          // Bir xil taom va bir xil variantlar bo'lsa miqdorini oshirish
          const existingIndex = state.items.findIndex((item) => item.id === newItem.id);
          if (existingIndex > -1) {
            const updated = [...state.items];
            updated[existingIndex].qty += newItem.qty;
            return { items: updated };
          }
          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },

      updateQty: (itemId, delta) => {
        set((state) => {
          const updated = state.items
            .map((item) => {
              if (item.id === itemId) {
                const newQty = item.qty + delta;
                return newQty > 0 ? { ...item, qty: newQty } : null;
              }
              return item;
            })
            .filter(Boolean) as CartItem[];

          return { items: updated };
        });
      },

      setOrderType: (orderType) => set({ orderType }),

      setPromo: (promoCode, promoDiscount = 0) => set({ promoCode, promoDiscount }),

      clearCart: () => set({ items: [], promoCode: null, promoDiscount: 0 }),

      setIsCartOpen: (isCartOpen) => set({ isCartOpen }),

      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

      getTotalItems: () => {
        return get().items.reduce((acc, item) => acc + item.qty, 0);
      },

      getSubtotal: () => {
        return get().items.reduce((acc, item) => {
          const optionsDelta = item.selectedOptions.reduce((sum, opt) => sum + opt.priceDelta, 0);
          return acc + (item.price + optionsDelta) * item.qty;
        }, 0);
      },
    }),
    {
      name: 'tez_taom_cart',
    }
  )
);
