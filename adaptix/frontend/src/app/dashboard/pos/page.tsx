"use client";

import * as React from "react";
import { ProductGrid } from "@/components/pos/product-grid";
import { Cart } from "@/components/pos/cart";
import { usePOSShortcuts } from "@/hooks/usePOSShortcuts";
import { toast } from "sonner";

export default function POSPage() {
  const [cartItems, setCartItems] = React.useState<any[]>([]);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const addToCart = (product: any) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    // Optional: add toast or sound for ultra-fast feedback
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    if (cartItems.length > 0) {
      setCartItems([]);
      toast.info("Cart cleared");
    }
  };

  // Keyboard Shortcuts Integration
  usePOSShortcuts({
    onSearch: () => {
      const input = document.querySelector(
        'input[placeholder*="Search"]'
      ) as HTMLInputElement;
      input?.focus();
      input?.select();
    },
    onCheckout: () => {
      if (cartItems.length > 0) {
        setCheckoutOpen(true);
      } else {
        toast.error("Cart is empty");
      }
    },
    onClearCart: clearCart,
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 p-0 overflow-hidden bg-slate-100 dark:bg-black">
      <div className="flex-1 overflow-hidden border-r bg-white dark:bg-slate-950 shadow-xl z-0">
        <ProductGrid onAddToCart={addToCart} />
      </div>
      <div className="w-[380px] xl:w-[420px] flex-none bg-white dark:bg-slate-950 shadow-2xl z-10 overflow-hidden flex flex-col">
        <Cart
          items={cartItems}
          onUpdateQuantity={updateQuantity}
          onClear={clearCart}
          onCheckoutSuccess={() => setCartItems([])}
          checkoutOpen={checkoutOpen}
          onCheckoutOpenChange={setCheckoutOpen}
        />
      </div>
    </div>
  );
}
