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
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
  customer?: any;
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
  const [loyaltyAction, setLoyaltyAction] = React.useState<"EARN" | "REDEEM">(
    "EARN"
  );
  const [redeemPoints, setRedeemPoints] = React.useState<string>("");

  const router = useRouter();
  const tenderedRef = React.useRef<HTMLInputElement>(null);
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

  // Calculate Values
  const availablePoints = customer ? Number(customer.loyalty_points || 0) : 0;
  const earnPoints = Math.floor(total / 10);
  const discountAmount =
    loyaltyAction === "REDEEM" ? Number(redeemPoints || 0) : 0;
  const finalTotal = Math.max(0, total - discountAmount);

  const paymentMethod = form.watch("payment_method");
  const amountTendered = parseFloat(form.watch("amount_tendered") || "0");
  const change = Math.max(0, amountTendered - finalTotal);

  // Auto-focus logic
  React.useEffect(() => {
    if (isOpen && !successData) {
      form.reset({ payment_method: "cash", amount_tendered: "" });
      setLoyaltyAction("EARN");
      setRedeemPoints("");
      setTimeout(() => tenderedRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const setTendered = (val: number) => {
    form.setValue("amount_tendered", val.toFixed(2));
    tenderedRef.current?.focus();
  };

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
        customer_uuid: customer?.id,
        loyalty_action: loyaltyAction,
        redeemed_points: loyaltyAction === "REDEEM" ? Number(redeemPoints) : 0,
        payment_data: [{ method: values.payment_method, amount: finalTotal }],
      };

      const response = await api.post("/pos/orders/", payload);

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
      toast.success("Transaction Complete");
      onSuccess();
    } catch (error: any) {
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
      <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {successData ? "Confirmed" : "Payment"}
            </h2>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">
              Ultra-Fast POS
            </p>
          </div>
          {!successData && (
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-400">
                ${finalTotal.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">
                Total Due
              </p>
            </div>
          )}
        </div>

        {successData ? (
          <div className="p-8 space-y-6 flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border-2 border-emerald-100 shadow-sm">
              <Check className="h-10 w-10" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-black">Sale Confirmed</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Receipt #{successData.orderNumber}
              </p>
              <p className="text-4xl font-black mt-4">
                ${successData.change?.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">
                Change Due
              </p>
            </div>
            <div className="w-full grid grid-cols-1 gap-2 pt-4">
              <Button
                size="lg"
                className="h-14 font-bold"
                onClick={handlePrint}
              >
                <Printer className="mr-2 h-5 w-5" /> Print Receipt
              </Button>
              <Button variant="outline" className="h-12" onClick={handleClose}>
                Next Customer [Enter]
              </Button>
            </div>
            <div style={{ display: "none" }}>
              <Receipt ref={receiptRef} data={successData} />
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                  <span>Amount Received</span>
                  {paymentMethod === "cash" && change > 0 && (
                    <Badge
                      variant="outline"
                      className="text-emerald-600 border-emerald-100 bg-emerald-50"
                    >
                      +${change.toFixed(2)} Change
                    </Badge>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-300">
                    $
                  </span>
                  <Input
                    ref={tenderedRef}
                    type="number"
                    step="0.01"
                    className="h-16 pl-9 text-3xl font-black rounded-xl border-2 focus:border-primary shadow-inner"
                    {...form.register("amount_tendered")}
                  />
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[10, 20, 50, 100].map((amt) => (
                    <Button
                      key={amt}
                      type="button"
                      variant="outline"
                      className="h-10 font-bold text-xs"
                      onClick={() => setTendered(amt)}
                    >
                      ${amt}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 font-bold text-xs"
                    onClick={() => setTendered(finalTotal)}
                  >
                    Exact
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Method
                  </span>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(v) =>
                      form.setValue("payment_method", v as any)
                    }
                    className="flex gap-2"
                  >
                    <Label
                      htmlFor="cash"
                      className={cn(
                        "flex-1 h-16 flex flex-col items-center justify-center rounded-xl border-2 cursor-pointer transition-all",
                        paymentMethod === "cash"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-slate-100 bg-white hover:bg-slate-50"
                      )}
                    >
                      <RadioGroupItem
                        value="cash"
                        id="cash"
                        className="sr-only"
                      />
                      <span className="text-xl">💵</span>
                      <span className="text-[8px] font-bold uppercase mt-1">
                        Cash
                      </span>
                    </Label>
                    <Label
                      htmlFor="card"
                      className={cn(
                        "flex-1 h-16 flex flex-col items-center justify-center rounded-xl border-2 cursor-pointer transition-all",
                        paymentMethod === "card"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-slate-100 bg-white hover:bg-slate-50"
                      )}
                    >
                      <RadioGroupItem
                        value="card"
                        id="card"
                        className="sr-only"
                      />
                      <span className="text-xl">💳</span>
                      <span className="text-[8px] font-bold uppercase mt-1">
                        Card
                      </span>
                    </Label>
                  </RadioGroup>
                </div>
                {customer && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Loyalty
                    </span>
                    <Button
                      type="button"
                      variant={
                        loyaltyAction === "REDEEM" ? "default" : "outline"
                      }
                      className="w-full h-16 text-[10px] flex flex-col"
                      onClick={() =>
                        setLoyaltyAction((l) =>
                          l === "REDEEM" ? "EARN" : "REDEEM"
                        )
                      }
                      disabled={availablePoints < 1}
                    >
                      {loyaltyAction === "REDEEM" ? "REDEEMING" : "EARNING"}
                      <span className="font-bold">
                        {loyaltyAction === "REDEEM" ? redeemPoints : earnPoints}{" "}
                        PTS
                      </span>
                    </Button>
                  </div>
                )}
              </div>

              <Button
                disabled={
                  loading ||
                  (paymentMethod === "cash" && amountTendered < finalTotal)
                }
                className="w-full h-14 text-lg font-black rounded-xl shadow-lg shadow-primary/20"
                type="submit"
              >
                COMPLETE SALE [Enter]
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
