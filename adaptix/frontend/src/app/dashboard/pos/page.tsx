"use client";

import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { Product, CartItem } from "@/lib/types";
import { ProductCard } from "./components/ProductCard";
import { CartSidebar } from "./components/CartSidebar";
import { Input } from "@/components/ui/input";
import {
  Search,
  SlidersHorizontal,
  Grid,
  List as ListIcon,
} from "lucide-react";
import { CheckoutModal } from "./components/CheckoutModal";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

export default function POSPage() {
  const { data: products, isLoading } = useProducts();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { theme } = useTheme();

  const cartTotal =
    cart.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.cartQuantity,
      0
    ) * 1.1;

  const addToCart = (product: Product) => {
    const variant = product.variants?.[0];
    if (!variant) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === variant.id);
      if (existing) {
        return prev.map((item) =>
          item.id === variant.id
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          ...variant,
          productName: product.name,
          productImage: product.thumbnail,
          taxMethod: product.tax_method,
          cartQuantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = Math.max(0, item.cartQuantity + delta);
            return { ...item, cartQuantity: newQty };
          }
          return item;
        })
        .filter((item) => item.cartQuantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckoutSuccess = () => {
    setCart([]);
    setCheckoutOpen(false);
  };

  const filteredProducts = products?.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.variants.some((v) => v.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-8 overflow-hidden bg-slate-50/50 dark:bg-black/20">
      {/* Product Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                POS Terminal
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage sales and inventory
              </p>
            </div>

            {/* Stats/Quick Actions Placeholder */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="hidden md:flex">
                <Grid className="mr-2 h-4 w-4" /> Grid
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:flex opacity-50"
              >
                <ListIcon className="mr-2 h-4 w-4" /> List
              </Button>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="relative flex-1 max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <Input
                className="pl-10 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl focus-visible:ring-violet-500 transition-all text-base"
                placeholder="Search products by name, SKU or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="h-12 px-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-sm"
            >
              <SlidersHorizontal className="h-5 w-5 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-20 scrollbar-hide">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/5] bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-20">
              {filteredProducts?.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={addToCart}
                />
              ))}
              {filteredProducts?.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                  <p className="text-lg">No products found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <CartSidebar
        items={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={() => setCheckoutOpen(true)}
      />

      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        total={cartTotal}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
}
