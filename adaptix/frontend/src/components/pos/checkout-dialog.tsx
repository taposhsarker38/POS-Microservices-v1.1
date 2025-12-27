"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import { Check, Printer, Plus, Trash2 } from "lucide-react";
import { Receipt } from "./receipt";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import usePOSSettings from "@/hooks/use-pos-settings";
import { useCompany } from "@/hooks/use-company";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PaymentEntry {
  id: string;
  method: "cash" | "card" | "mobile_banking" | "bank_transfer" | "emi";
  provider?: string; // e.g. Bkash
  emiPlanId?: string;
  amount: number;
}

interface CheckoutDialogProps {
  items: any[];
  total: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer?: any;
}

const PROVIDERS = ["Bkash", "Nagad", "Rocket", "Brac Bank", "City Bank"];

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

  // -- Payment State --
  const [payments, setPayments] = React.useState<PaymentEntry[]>([]);

  // -- Loyalty --
  const [loyaltyAction, setLoyaltyAction] = React.useState<"EARN" | "REDEEM">(
    "EARN"
  );
  const [redeemPoints, setRedeemPoints] = React.useState<string>("");

  // -- Config --
  const { companyId } = useCompany();
  const { settings } = usePOSSettings(companyId || "");

  // -- EMI Plans --
  const { data: emiPlans } = useQuery({
    queryKey: ["emi-plans", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const res = await api.get(
        `/payment/emi-plans/?company_uuid=${companyId}`
      );
      return res.data;
    },
    enabled: isOpen && !!companyId,
  });

  const receiptRef = React.useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  } as any);

  // Initialize
  React.useEffect(() => {
    if (isOpen && !successData) {
      // Default: Single Cash Payment with full amount
      setPayments([{ id: "1", method: "cash", amount: total }]);
      setLoyaltyAction("EARN");
      setRedeemPoints("");
    }
  }, [isOpen, total]);

  // Calculations
  const availablePoints = customer ? Number(customer.loyalty_points || 0) : 0;
  const earnPoints = Math.floor(total / 10);
  const discountAmount =
    loyaltyAction === "REDEEM" ? Number(redeemPoints || 0) : 0;
  const finalTotal = Math.max(0, total - discountAmount);

  const totalPaid = payments.reduce(
    (acc, p) => acc + (Number(p.amount) || 0),
    0
  );
  const remainingDue = Math.max(0, finalTotal - totalPaid);
  const change = Math.max(0, totalPaid - finalTotal);

  // -- Actions --
  const addPayment = () => {
    if (remainingDue <= 0) return;
    setPayments([
      ...payments,
      {
        id: Math.random().toString(),
        method: "cash",
        amount: remainingDue,
      },
    ]);
  };

  const removePayment = (id: string) => {
    setPayments(payments.filter((p) => p.id !== id));
  };

  const updatePayment = (id: string, field: keyof PaymentEntry, value: any) => {
    setPayments(
      payments.map((p) => {
        if (p.id === id) {
          const updated = { ...p, [field]: value };
          // Reset provider/plan if method changes
          if (field === "method") {
            if (value !== "mobile_banking" && value !== "bank_transfer") {
              updated.provider = undefined;
            }
            if (value !== "emi") {
              updated.emiPlanId = undefined;
            }
          }
          return updated;
        }
        return p;
      })
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Backend Validation Simulation (Frontend check)
      if (settings) {
        if (!settings.allow_split_payment && payments.length > 1) {
          toast.error("Split payments are disabled");
          return;
        }
        if (!settings.allow_partial_payment && remainingDue > 0.01) {
          // tolerance
          toast.error(
            `Partial payment disabled. Please pay full amount ($${finalTotal.toFixed(
              2
            )})`
          );
          return;
        }
      }

      // EMI Validation
      const emiPayment = payments.find((p) => p.method === "emi");
      if (emiPayment && !emiPayment.emiPlanId) {
        toast.error("Please select an EMI Plan");
        return;
      }

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
        payment_data: payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          provider: p.provider,
          emi_plan: p.emiPlanId, // Backend expects this for EMI
        })),
        company_uuid: companyId,
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
        paymentMethod: "Split",
        change: change,
        customerName: customer?.name,
        earnedPoints: loyaltyAction === "EARN" ? earnPoints : 0,
      };

      setSuccessData(receiptData);
      toast.success("Transaction Complete");
      onSuccess();
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail ||
          JSON.stringify(error.response?.data?.payment_data) ||
          "Transaction failed."
      );
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
      <DialogContent className="max-w-lg p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {successData ? "Confirmed" : "Payment"}
            </h2>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">
              {settings ? "Config Loaded" : "Standard Mode"}
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
          // --- SUCCESS VIEW ---
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
          // --- PAYMENT FORM VIEW ---
          <div className="p-6 flex flex-col h-[500px]">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {payments.map((p, index) => (
                  <div
                    key={p.id}
                    className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        Payment #{index + 1}
                      </span>
                      {payments.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-400 hover:text-red-500"
                          onClick={() => removePayment(p.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={p.method}
                        onValueChange={(v) => updatePayment(p.id, "method", v)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">💵 Cash</SelectItem>
                          <SelectItem value="card">💳 Card</SelectItem>
                          <SelectItem value="mobile_banking">
                            📱 Mobile
                          </SelectItem>
                          <SelectItem value="bank_transfer">🏦 Bank</SelectItem>
                          <SelectItem value="emi">📅 EMI</SelectItem>
                        </SelectContent>
                      </Select>

                      {(p.method === "mobile_banking" ||
                        p.method === "bank_transfer") && (
                        <Select
                          value={p.provider}
                          onValueChange={(v) =>
                            updatePayment(p.id, "provider", v)
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROVIDERS.map((prov) => (
                              <SelectItem key={prov} value={prov}>
                                {prov}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {p.method === "emi" && (
                        <div className="flex flex-col gap-1">
                          <Select
                            value={p.emiPlanId}
                            onValueChange={(v) =>
                              updatePayment(p.id, "emiPlanId", v)
                            }
                          >
                            <SelectTrigger className="w-30">
                              <SelectValue placeholder="Select Plan" />
                            </SelectTrigger>
                            <SelectContent>
                              {emiPlans?.map((plan: any) => (
                                <SelectItem key={plan.id} value={plan.id}>
                                  {plan.name} ({plan.duration_months}m)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {p.emiPlanId && (
                            <p className="text-[10px] text-emerald-600 font-bold">
                              {(() => {
                                const plan = emiPlans?.find(
                                  (pl: any) => pl.id === p.emiPlanId
                                );
                                if (!plan) return "";
                                const rate = Number(plan.interest_rate) / 100;
                                const months = plan.duration_months;
                                const monthly =
                                  (p.amount * (1 + rate)) / months;
                                return `$${monthly.toFixed(2)} / mo`;
                              })()}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          $
                        </span>
                        <Input
                          type="number"
                          className="pl-6 font-bold"
                          value={p.amount}
                          onChange={(e) =>
                            updatePayment(
                              p.id,
                              "amount",
                              parseFloat(e.target.value)
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Payment Button */}
                {(settings?.allow_split_payment ?? true) &&
                  remainingDue > 0 && (
                    <Button
                      variant="outline"
                      className="w-full border-dashed"
                      onClick={addPayment}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Split Payment
                    </Button>
                  )}
              </div>
            </ScrollArea>

            {/* Footer Summary */}
            <div className="pt-4 border-t mt-4 space-y-4">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Total Paid</span>
                  <span className="font-bold">${totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between item-center">
                  <span className="font-bold">Remaining</span>
                  <span
                    className={cn(
                      "font-black text-lg",
                      remainingDue > 0 ? "text-red-500" : "text-emerald-500"
                    )}
                  >
                    ${remainingDue > 0 ? remainingDue.toFixed(2) : "0.00"}
                  </span>
                </div>
                {change > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg">
                    <span>Change Due</span>
                    <span>+${change.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <Button
                disabled={
                  loading ||
                  ((settings ? !settings.allow_partial_payment : false) &&
                    remainingDue > 0.01)
                }
                className="w-full h-14 text-lg font-black rounded-xl shadow-lg shadow-primary/20"
                onClick={handleSubmit}
              >
                {remainingDue > 0
                  ? settings?.allow_partial_payment
                    ? "CONFIRM PARTIAL"
                    : "PAY FULL AMOUNT"
                  : "COMPLETE SALE"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
