"use client";

import * as React from "react";
import { useReactToPrint } from "react-to-print";
import { Check, Printer } from "lucide-react";
import { Receipt } from "./receipt";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  payment_method: z.enum(["cash", "card"]),
  amount_tendered: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CheckoutDialogProps {
  items: any[];
  total: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer?: any; // Added customer prop
}

export const CheckoutDialog: React.FC<CheckoutDialogProps> = ({
  items,
  total,
  isOpen,
  onClose,
  onSuccess,
  customer,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [successData, setSuccessData] = React.useState<any>(null);
  const [loyaltyAction, setLoyaltyAction] = React.useState<
    "EARN" | "REDEEM" | "NONE"
  >("EARN");
  const [redeemPoints, setRedeemPoints] = React.useState<string>("");

  const router = useRouter();

  const receiptRef = React.useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  } as any);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      payment_method: "cash",
      amount_tendered: "",
    },
  });

  // Calculate Loyalty Values
  const availablePoints = customer ? Number(customer.loyalty_points || 0) : 0;
  const earnPoints = Math.floor(total / 10); // 1 point per $10

  // 1 Point = $1 Discount (Simplified Rule)
  const discountAmount =
    loyaltyAction === "REDEEM" ? Number(redeemPoints || 0) : 0;
  const finalTotal = Math.max(0, total - discountAmount);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSuccessData(null);
      form.reset();
      setLoyaltyAction("EARN");
      setRedeemPoints("");
    }
  }, [isOpen, form]);

  const paymentMethod = form.watch("payment_method");
  const amountTendered = parseFloat(form.watch("amount_tendered") || "0");
  const change = Math.max(0, amountTendered - finalTotal);

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);

      const payload = {
        items: items.map((item) => ({
          product_uuid: item.id,
          quantity: item.quantity,
          unit_price: item.sales_price,
          tax_amount: 0,
          discount_amount: 0,
        })),
        module_type: "pos",
        status: "closed",
        customer_uuid: customer?.id, // Send customer info
        loyalty_action: loyaltyAction,
        redeemed_points: loyaltyAction === "REDEEM" ? Number(redeemPoints) : 0,
        payment_data: [
          {
            method: values.payment_method,
            amount: finalTotal, // Use discounted total
          },
        ],
      };

      const response = await api.post("/pos/orders/", payload);

      // Calculate data for receipt
      const receiptData = {
        storeName: "Adaptix Store",
        orderNumber: response.data.order_number || "PENDING",
        date: new Date().toLocaleString(),
        items: items.map((item) => ({
          name: item.name,
          qty: item.quantity,
          price: Number(item.sales_price || 0),
          total: Number(item.sales_price || 0) * item.quantity,
        })),
        subtotal: total,
        tax: 0,
        discount: discountAmount,
        total: finalTotal,
        paymentMethod: values.payment_method,
        change: values.payment_method === "cash" ? change : 0,
        customerName: customer?.name,
        earnedPoints: loyaltyAction === "EARN" ? earnPoints : 0,
      };

      setSuccessData(receiptData);
      toast.success(`Sale completed! Change: $${change.toFixed(2)}`);
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessData(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {successData ? "Transaction Complete" : "Checkout"}
          </DialogTitle>
        </DialogHeader>

        {successData ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold">Payment Successful</h2>
              <p className="text-muted-foreground">
                Change Due:{" "}
                <span className="font-bold text-foreground">
                  ${successData.change?.toFixed(2)}
                </span>
              </p>
              {successData.earnedPoints > 0 && (
                <p className="text-sm text-green-600 font-medium">
                  + {successData.earnedPoints} Points Earned
                </p>
              )}
            </div>

            <div className="flex flex-col w-full gap-3">
              <Button size="lg" className="w-full" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Print Receipt
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleClose}
              >
                New Sale
              </Button>
            </div>

            <div style={{ display: "none" }}>
              <Receipt ref={receiptRef} data={successData} />
            </div>
          </div>
        ) : (
          <div className="py-2">
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">Amount to Pay</p>
              <div className="flex flex-col items-center">
                {loyaltyAction === "REDEEM" && discountAmount > 0 && (
                  <span className="text-sm text-muted-foreground line-through">
                    ${total.toFixed(2)}
                  </span>
                )}
                <p className="text-4xl font-bold">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(finalTotal)}
                </p>
              </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Loyalty Section */}
              {customer && (
                <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">
                      Loyalty Program
                    </span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {availablePoints} pts available
                    </span>
                  </div>

                  <RadioGroup
                    value={loyaltyAction}
                    onValueChange={(v) => setLoyaltyAction(v as any)}
                    className="grid grid-cols-2 gap-2"
                  >
                    <div>
                      <RadioGroupItem
                        value="EARN"
                        id="earn"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="earn"
                        className="flex flex-col items-center p-2 rounded border hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
                      >
                        <span className="font-bold">Earn</span>
                        <span className="text-xs text-muted-foreground">
                          +{earnPoints} pts
                        </span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem
                        value="REDEEM"
                        id="redeem"
                        className="peer sr-only"
                        disabled={availablePoints < 1}
                      />
                      <Label
                        htmlFor="redeem"
                        className="flex flex-col items-center p-2 rounded border hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer aria-disabled:opacity-50"
                        aria-disabled={availablePoints < 1}
                      >
                        <span className="font-bold">Redeem</span>
                        <span className="text-xs text-muted-foreground">
                          Get Discount
                        </span>
                      </Label>
                    </div>
                  </RadioGroup>

                  {loyaltyAction === "REDEEM" && (
                    <div className="space-y-1 animation-fade-in">
                      <div className="flex justify-between text-xs">
                        <Label>Points to use</Label>
                        <span className="text-muted-foreground">
                          Max: {availablePoints}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={redeemPoints}
                          onChange={(e) => {
                            const val = Math.min(
                              Number(e.target.value),
                              availablePoints,
                              total
                            ); // Cap at Total or Available
                            setRedeemPoints(val.toString());
                          }}
                          placeholder="0"
                          className="h-8"
                        />
                        <div className="flex items-center text-sm font-medium text-green-600 shrink-0">
                          - ${discountAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <Label>Payment Method</Label>
                <RadioGroup
                  defaultValue="cash"
                  onValueChange={(val) =>
                    form.setValue("payment_method", val as "cash" | "card")
                  }
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                >
                  <div>
                    <RadioGroupItem
                      value="cash"
                      id="cash"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="cash"
                      className="flex bg-background flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <span className="text-xl mb-1">💵</span>
                      <span className="text-xs font-semibold">Cash</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="card"
                      id="card"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="card"
                      className="flex bg-background flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <span className="text-xl mb-1">💳</span>
                      <span className="text-xs font-semibold">Card</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {paymentMethod === "cash" && (
                <div className="space-y-2">
                  <Label>Amount Tendered</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    {...form.register("amount_tendered")}
                  />
                  {amountTendered > 0 && (
                    <div className="flex justify-between text-sm px-1">
                      <span>Change due:</span>
                      <span
                        className={
                          change < 0
                            ? "text-red-500"
                            : "text-green-600 font-bold"
                        }
                      >
                        ${change.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Button
                disabled={
                  loading ||
                  (paymentMethod === "cash" && amountTendered < finalTotal)
                }
                className="w-full h-12 text-lg"
                type="submit"
              >
                Complete Sale{" "}
                {loyaltyAction === "REDEEM" && discountAmount > 0
                  ? `($${finalTotal.toFixed(2)})`
                  : ""}
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
