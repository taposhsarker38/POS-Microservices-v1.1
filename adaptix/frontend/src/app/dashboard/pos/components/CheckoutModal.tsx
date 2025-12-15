"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Banknote, QrCode } from "lucide-react";
import { CartItem } from "@/lib/types";
import axios from "axios";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  total: number;
  onSuccess: () => void;
}

export function CheckoutModal({
  open,
  onOpenChange,
  cart,
  total,
  onSuccess,
}: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [tendered, setTendered] = useState("");

  const handleCheckout = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      onSuccess();
      onOpenChange(false);
    }, 1500);
  };

  const change = tendered ? Math.max(0, parseFloat(tendered) - total) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Sale</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <h2 className="text-4xl font-bold text-emerald-600">
              ${total.toFixed(2)}
            </h2>
          </div>

          <Tabs defaultValue="cash" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cash">
                <Banknote className="mr-2 h-4 w-4" />
                Cash
              </TabsTrigger>
              <TabsTrigger value="card">
                <CreditCard className="mr-2 h-4 w-4" />
                Card
              </TabsTrigger>
              <TabsTrigger value="qr">
                <QrCode className="mr-2 h-4 w-4" />
                QR
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cash" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Amount Tendered</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    className="pl-7 text-lg"
                    placeholder="0.00"
                    value={tendered}
                    onChange={(e) => setTendered(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg flex justify-between items-center">
                <span className="font-medium">Change Due:</span>
                <span className="text-lg font-bold">${change.toFixed(2)}</span>
              </div>
            </TabsContent>

            <TabsContent
              value="card"
              className="pt-4 text-center text-sm text-muted-foreground"
            >
              <div className="p-8 border-2 border-dashed rounded-lg">
                Waiting for terminal...
              </div>
            </TabsContent>

            <TabsContent value="qr" className="pt-4 text-center">
              <div className="p-8 border rounded-lg bg-white inline-block">
                <QrCode className="h-24 w-24" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Scan customer QR code
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? "Processing..." : "Confirm Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
