"use client";

import * as React from "react";
import {
  Trash2,
  ShoppingCart,
  Minus,
  Plus,
  Keyboard,
  Wand2,
  Banknote,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CustomerSelector } from "@/components/pos/customer-selector";
import { CheckoutDialog } from "@/components/pos/checkout-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CartProps {
  items: any[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onClear: () => void;
  onCheckoutSuccess: () => void;
  checkoutOpen: boolean;
  onCheckoutOpenChange: (open: boolean) => void;
  onLoadAICart: (items: any[]) => void;
  onQuickCheckout: (amount: number) => void;
  quickPayAmount?: number | null;
}

export const Cart: React.FC<CartProps> = ({
  items,
  onUpdateQuantity,
  onClear,
  onCheckoutSuccess,
  checkoutOpen,
  onCheckoutOpenChange,
  onLoadAICart,
  onQuickCheckout,
  quickPayAmount,
}) => {
  const [loadingAI, setLoadingAI] = React.useState(false);

  const handleSmartLoad = async () => {
    setLoadingAI(true);
    try {
      // Hardcoded terminal ID for demo
      const res = await api.get(
        "intelligence/vision/cart-sync/?terminal_id=TERM_001"
      );
      if (res.data?.items) {
        onLoadAICart(res.data.items);
        toast.success("AI Visual Cart Loaded!");
      }
    } catch (e) {
      toast.error("No visual cart found for this terminal.");
    } finally {
      setLoadingAI(false);
    }
  };
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null);

  const subtotal = items.reduce(
    (acc, item) => acc + (item.sales_price || 0) * item.quantity,
    0
  );
  const tax = items.reduce((acc, item) => {
    if (item.is_tax_exempt) return acc;
    return acc + (item.sales_price || 0) * item.quantity * 0;
  }, 0);
  const total = subtotal + tax;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50">
      <div className="p-4 border-b space-y-3 bg-white dark:bg-slate-950">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" /> Active Order
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={items.length === 0}
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Clear Cart [Alt+C]"
          >
            <Trash2 className="h-4 w-4" />
            <span className="ml-2 text-[10px] font-bold border rounded px-1 hidden lg:inline">
              ALT+C
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSmartLoad}
            disabled={loadingAI}
            className="text-violet-600 border-violet-200 bg-violet-50 hover:bg-violet-100"
            title="Load AI Smart Cart"
          >
            <Wand2
              className={cn("h-4 w-4 mr-2", loadingAI && "animate-spin")}
            />
            AI Cart
          </Button>
        </div>
        <CustomerSelector
          onSelect={setSelectedCustomer}
          selectedCustomer={selectedCustomer}
        />
      </div>

      <ScrollArea className="flex-1 px-4 py-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-75 text-muted-foreground opacity-40">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="h-8 w-8" />
            </div>
            <p className="font-bold">Cart is empty</p>
            <p className="text-xs">Select products or scan barcode</p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-start bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-right-2"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    ${Number(item.sales_price || 0).toFixed(2)} / unit
                  </p>
                  {item.is_tax_exempt && (
                    <Badge
                      variant="outline"
                      className="h-3 px-1 text-[8px] bg-emerald-50 text-emerald-600 border-emerald-200 mt-1"
                    >
                      TAX FREE
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg p-0.5 border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md hover:bg-white dark:hover:bg-slate-700"
                      onClick={() => onUpdateQuantity(item.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-black">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md hover:bg-white dark:hover:bg-slate-700"
                      onClick={() => onUpdateQuantity(item.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="w-16 text-right font-black text-sm text-slate-900 dark:text-white">
                    ${((item.sales_price || 0) * item.quantity).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 bg-white dark:bg-slate-950 border-t space-y-4 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <div className="space-y-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="text-slate-800 dark:text-slate-200">
              ${subtotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span className="text-slate-800 dark:text-slate-200">
              ${tax.toFixed(2)}
            </span>
          </div>
          <Separator className="my-1" />
          <div className="flex justify-between text-slate-900 dark:text-white">
            <span className="text-sm">Total Due</span>
            <span className="text-2xl font-black text-primary">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="pt-2 flex gap-2">
          {[50, 100, 500, 1000].map((amt) => (
            <Button
              key={amt}
              variant="outline"
              size="sm"
              className="flex-1 h-10 font-bold border-emerald-100 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-200"
              onClick={() => onQuickCheckout(amt)}
              disabled={items.length === 0}
            >
              <Banknote className="h-3 w-3 mr-1" /> {amt}
            </Button>
          ))}
        </div>

        <Button
          className="w-full h-14 text-xl font-black rounded-xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
          disabled={items.length === 0}
          onClick={() => onCheckoutOpenChange(true)}
        >
          CHECKOUT [Alt+X]
        </Button>

        <div className="flex items-center justify-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          <span className="flex items-center gap-1">
            <Keyboard className="h-3 w-3" /> Shortcuts Active
          </span>
        </div>
      </div>

      <CheckoutDialog
        items={items}
        total={total}
        isOpen={checkoutOpen}
        onClose={() => onCheckoutOpenChange(false)}
        onSuccess={() => {
          onCheckoutSuccess();
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        quickPayAmount={quickPayAmount}
      />
    </div>
  );
};
