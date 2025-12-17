"use client";

import * as React from "react";
import { Trash2, ShoppingCart, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CustomerSelector } from "@/components/pos/customer-selector";
import { CheckoutDialog } from "@/components/pos/checkout-dialog";

interface CartProps {
  items: any[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onClear: () => void;
  onCheckoutSuccess: () => void;
}

export const Cart: React.FC<CartProps> = ({
  items,
  onUpdateQuantity,
  onClear,
  onCheckoutSuccess,
}) => {
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null);

  // Simple Total Calc
  const subtotal = items.reduce(
    (acc, item) => acc + (item.sales_price || 0) * item.quantity,
    0
  );
  const tax = subtotal * 0.1; // Dummy 10% tax
  const total = subtotal + tax;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3 bg-card">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold flex items-center">
            <ShoppingCart className="mr-2 h-5 w-5" /> Current Order
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={items.length === 0}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <CustomerSelector
          onSelect={setSelectedCustomer}
          selectedCustomer={selectedCustomer}
        />
      </div>

      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mb-4 opacity-20" />
            <p>Cart is empty</p>
            <p className="text-sm">Select products to add</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    ${Number(item.sales_price || 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onUpdateQuantity(item.id, -1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-bold">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onUpdateQuantity(item.id, 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="w-20 text-right font-medium">
                  ${((item.sales_price || 0) * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 bg-muted/20 border-t space-y-4">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax (10%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <Button
          className="w-full h-12 text-lg"
          disabled={items.length === 0}
          onClick={() => setCheckoutOpen(true)}
        >
          Checkout
        </Button>
      </div>

      <CheckoutDialog
        items={items}
        total={total}
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={() => {
          onCheckoutSuccess();
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
      />
    </div>
  );
};
