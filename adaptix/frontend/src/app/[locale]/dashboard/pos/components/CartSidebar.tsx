"use client";

import { CartItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Minus, CreditCard, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface CartSidebarProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

export function CartSidebar({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartSidebarProps) {
  const subtotal = items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.cartQuantity,
    0
  );
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  return (
    <div className="flex flex-col h-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-l border-white/20 dark:border-slate-800 shadow-2xl w-[400px]">
      {/* Header */}
      <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">
              Current Order
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {items.length} items added
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
        </div>
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1 p-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-4">
            <ShoppingBag className="h-16 w-16 opacity-20" />
            <p className="font-medium text-lg opacity-60">Your cart is empty</p>
            <Button variant="outline" className="mt-4" disabled>
              Start Scanning
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative flex gap-4 p-4 rounded-xl bg-white dark:bg-slate-800/50 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800/50"
              >
                {/* Product Image Thumbnail */}
                <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0">
                  {item.productImage ? (
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <ShoppingBag className="h-6 w-6 m-auto text-slate-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-sm truncate text-slate-900 dark:text-slate-100">
                      {item.productName}
                    </h4>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      ${item.price}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold w-6 text-center">
                        {item.cartQuantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="absolute bottom-4 right-4 font-bold text-sm text-slate-700 dark:text-slate-200">
                  ${(parseFloat(item.price) * item.cartQuantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-6 bg-white dark:bg-slate-900 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] z-10">
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Subtotal
            </span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Tax (10%)
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              ${tax.toFixed(2)}
            </span>
          </div>
          <Separator className="my-2 bg-slate-200/50 dark:bg-slate-800/50" />
          <div className="flex justify-between items-end">
            <span className="font-bold text-lg">Total</span>
            <div className="text-right">
              <span className="block text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <Button
          className={cn(
            "w-full h-14 text-lg font-bold shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-300",
            "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0"
          )}
          disabled={items.length === 0}
          onClick={onCheckout}
        >
          <CreditCard className="mr-2 h-5 w-5 animate-pulse" />
          Checkout Now
        </Button>
      </div>
    </div>
  );
}
