"use client";

import * as React from "react";
import { ProductGrid } from "@/components/pos/product-grid";
import { Cart } from "@/components/pos/cart";
import { usePOSShortcuts } from "@/hooks/usePOSShortcuts";
import { toast } from "sonner";
import api from "@/lib/api";

export default function POSPage() {
  const [cartItems, setCartItems] = React.useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [isUpdatingPrices, setIsUpdatingPrices] = React.useState(false);

  // Recalculate all item prices when customer changes
  const updateCartPrices = React.useCallback(
    async (customer: any) => {
      if (cartItems.length === 0) return;

      setIsUpdatingPrices(true);
      try {
        const updatedItems = await Promise.all(
          cartItems.map(async (item) => {
            try {
              const res = await api.get(
                `/product/variants/${item.id}/calculate_price/`,
                {
                  params: { price_list_uuid: customer?.price_list_uuid },
                }
              );
              return { ...item, sales_price: res.data.price };
            } catch (e) {
              return item;
            }
          })
        );
        setCartItems(updatedItems);
        toast.success(`Prices updated for ${customer?.name || "Retail"}`);
      } catch (error) {
        toast.error("Failed to update pricing tiers");
      } finally {
        setIsUpdatingPrices(false);
      }
    },
    [cartItems]
  );

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    if (cartItems.length > 0) {
      updateCartPrices(customer);
    }
  };

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [quickPayAmount, setQuickPayAmount] = React.useState<number | null>(
    null
  );

  const handleQuickCheckout = (amount: number) => {
    setQuickPayAmount(amount);
    setCheckoutOpen(true);
  };

  const addToCart = async (product: any) => {
    let finalPrice = product.sales_price;

    // Check for tiered price if customer is selected
    if (selectedCustomer?.price_list_uuid) {
      try {
        const res = await api.get(
          `/product/variants/${product.id}/calculate_price/`,
          {
            params: { price_list_uuid: selectedCustomer.price_list_uuid },
          }
        );
        finalPrice = res.data.price;
      } catch (e) {
        console.error("Tiered price lookup failed, using default.");
      }
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, sales_price: finalPrice }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, sales_price: finalPrice }];
    });
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
          onCheckoutSuccess={() => {
            setCartItems([]);
            setSelectedCustomer(null);
            setQuickPayAmount(null);
          }}
          checkoutOpen={checkoutOpen}
          onCheckoutOpenChange={setCheckoutOpen}
          onLoadAICart={(newItems) => {
            setCartItems((prev) => [...prev, ...newItems]);
          }}
          onQuickCheckout={handleQuickCheckout}
          quickPayAmount={quickPayAmount}
          selectedCustomer={selectedCustomer}
          onCustomerSelect={handleCustomerSelect}
          isUpdatingPrices={isUpdatingPrices}
        />
      </div>
    </div>
  );
}
