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
  quickPayAmount?: number | null;
}

const PROVIDERS = ["Bkash", "Nagad", "Rocket", "Brac Bank", "City Bank"];

export const CheckoutDialog: React.FC<CheckoutDialogProps> = ({
  items,
  total,
  isOpen,
  onClose,
  onSuccess,
  customer,
  quickPayAmount,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [successData, setSuccessData] = React.useState<any>(null);
  const [showPreview, setShowPreview] = React.useState(false);

  // -- Tax Automation --
  const [zones, setZones] = React.useState<any[]>([]);
  const [selectedZoneCode, setSelectedZoneCode] = React.useState<string>("");
  const [itemTaxes, setItemTaxes] = React.useState<Record<string, number>>({});

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
  // -- EMI Plans --
  const { data: allEmiPlans } = useQuery({
    queryKey: ["emi-plans", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const res = await api.get(`payment/emi-plans/?company_uuid=${companyId}`);
      // Handle potential pagination
      return res.data.results || res.data;
    },
    enabled: isOpen && !!companyId,
  });

  const emiPlans = React.useMemo(() => {
    if (!allEmiPlans || !Array.isArray(allEmiPlans)) return [];

    let commonPlanIds: string[] | null = null;

    items.forEach((item) => {
      if (
        item.emi_plan_ids &&
        Array.isArray(item.emi_plan_ids) &&
        item.emi_plan_ids.length > 0
      ) {
        if (commonPlanIds === null) {
          commonPlanIds = [...item.emi_plan_ids];
        } else {
          commonPlanIds = commonPlanIds.filter((id) =>
            item.emi_plan_ids.includes(id)
          );
        }
      }
    });

    if (commonPlanIds === null) return allEmiPlans;
    return allEmiPlans.filter((p: any) => commonPlanIds?.includes(p.id));
  }, [allEmiPlans, items]);

  // Fetch Tax Zones
  React.useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await api.get("accounting/tax/zones/");
        setZones(res.data.results || res.data);
      } catch (error) {
        console.error("Failed to fetch tax zones", error);
      }
    };
    if (isOpen) fetchZones();
  }, [isOpen]);

  // Calculate Taxes in real-time
  React.useEffect(() => {
    const calculateTaxes = async () => {
      if (!selectedZoneCode) {
        setItemTaxes({});
        return;
      }

      const newTaxes: Record<string, number> = {};
      await Promise.all(
        items.map(async (item) => {
          if (item.is_tax_exempt) {
            newTaxes[item.id] = 0;
            return;
          }

          try {
            const res = await api.post("accounting/tax/engine/calculate/", {
              amount: (item.sales_price || 0) * item.quantity,
              zone_code: selectedZoneCode,
              product_category_uuid: item.category_id,
            });
            newTaxes[item.id] = res.data.total_tax || 0;
          } catch (error) {
            console.error(`Tax calc failed for ${item.name}:`, error);
            newTaxes[item.id] = 0;
          }
        })
      );
      setItemTaxes(newTaxes);
    };

    calculateTaxes();
  }, [selectedZoneCode, items]);

  const receiptRef = React.useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  } as any);

  // Calculations
  const calculatedSubtotal = React.useMemo(() => {
    return items.reduce(
      (acc, item) => acc + (item.sales_price || 0) * item.quantity,
      0
    );
  }, [items]);

  const calculatedTax = React.useMemo(() => {
    if (selectedZoneCode) {
      return Object.values(itemTaxes).reduce((acc, val) => acc + val, 0);
    }
    return items.reduce((acc, item) => {
      if (item.is_tax_exempt) return acc;
      return acc + (item.sales_price || 0) * item.quantity * 0;
    }, 0);
  }, [items, selectedZoneCode, itemTaxes]);

  const availablePoints = customer ? Number(customer.loyalty_points || 0) : 0;
  const earnPoints = Math.floor(calculatedSubtotal / 10);
  const discountAmount =
    loyaltyAction === "REDEEM" ? Number(redeemPoints || 0) : 0;
  const finalTotal = Math.max(
    0,
    calculatedSubtotal + calculatedTax - discountAmount
  );

  const totalPaid = payments.reduce(
    (acc, p) => acc + (Number(p.amount) || 0),
    0
  );
  const remainingDue = Math.max(0, finalTotal - totalPaid);
  const change = Math.max(0, totalPaid - finalTotal);

  const isAllEmiEligible = items.every(
    (item) => item.is_emi_eligible !== false
  );

  // Initialize or Sync Payment
  React.useEffect(() => {
    if (isOpen && !successData) {
      // Auto-set tax zone from settings
      if (settings?.default_tax_zone_code && !selectedZoneCode) {
        setSelectedZoneCode(settings.default_tax_zone_code);
      }

      if (quickPayAmount !== undefined && quickPayAmount !== null) {
        setPayments([{ id: "1", method: "cash", amount: quickPayAmount }]);
        // If quickPayAmount >= finalTotal, we could auto-submit,
        // but it's safer to let the user see it for a split second or just click Complete.
        // For "Simplified" flow, let's auto-submit if it covers the total.
        if (quickPayAmount >= finalTotal && finalTotal > 0) {
          handleSubmit();
        }
      } else {
        // If only one payment and it was matching the previous total, update it to the new finalTotal
        if (payments.length <= 1) {
          setPayments([{ id: "1", method: "cash", amount: finalTotal }]);
        }
      }

      if (payments.length === 0 && !quickPayAmount) {
        setLoyaltyAction("EARN");
        setRedeemPoints("");
      }
    }
  }, [isOpen, finalTotal, quickPayAmount]);

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
          product_name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.sales_price || 0,
          tax_amount: itemTaxes[item.id] || 0,
          discount_amount: 0,
          metadata: {
            ...item.metadata,
            category_uuid: item.category_id,
            is_tax_exempt: item.is_tax_exempt,
            is_emi_eligible: item.is_emi_eligible,
          },
        })),
        module_type: "retail",
        status: "completed",
        tax_zone_code: selectedZoneCode,
        customer_uuid: customer?.id,
        customer_name: customer?.name || "Guest",
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

      const response = await api.post("pos/orders/", payload);

      const receiptData = {
        storeName: "Adaptix Store",
        orderNumber: response.data.order_number || "PENDING",
        date: new Date().toLocaleString(),
        items: items.map((item) => ({
          name: item.name,
          qty: item.quantity,
          price: Number(item.sales_price || 0),
          total: Number(item.sales_price || 0) * item.quantity,
          isTaxExempt: item.is_tax_exempt,
        })),
        subtotal: calculatedSubtotal,
        tax: calculatedTax,
        discount: discountAmount,
        total: finalTotal,
        paymentMethod:
          payments.length > 1 ? "Split" : payments[0]?.method || "Due",
        change: change,
        paidAmount: totalPaid,
        balanceDue: remainingDue,
        customerName: customer?.name,
        earnedPoints: loyaltyAction === "EARN" ? earnPoints : 0,
      };

      setSuccessData(receiptData);
      toast.success("Transaction Complete");
      onSuccess();
    } catch (error: any) {
      console.error("Transaction Error:", error.response?.data);
      const errorMsg =
        error.response?.data?.detail ||
        (error.response?.data && typeof error.response.data === "object"
          ? Object.entries(error.response.data)
              .map(([key, val]) => `${key}: ${JSON.stringify(val)}`)
              .join(", ")
          : null) ||
        "Transaction failed.";

      toast.error(errorMsg);
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

              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border w-full space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">
                    Total Paid
                  </span>
                  <span className="text-2xl font-black text-emerald-600">
                    ${successData.paidAmount?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-dashed">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">
                    Change Return
                  </span>
                  <span className="text-4xl font-black text-primary animate-pulse">
                    ${successData.change?.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="w-full grid grid-cols-2 gap-3 pt-4">
              <Button
                size="lg"
                className="h-14 font-bold bg-emerald-600 hover:bg-emerald-700"
                onClick={handlePrint}
              >
                <Printer className="mr-2 h-5 w-5" /> Print
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 font-bold border-slate-200"
                onClick={() => setShowPreview(true)}
              >
                <Check className="mr-2 h-5 w-5" /> Preview
              </Button>
              <Button
                variant="secondary"
                className="h-12 col-span-2 mt-2"
                onClick={handleClose}
              >
                Next Customer [Enter]
              </Button>
            </div>
            <div style={{ display: "none" }}>
              <Receipt ref={receiptRef} data={successData} />
            </div>

            {/* Receipt Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogContent className="max-w-[400px] p-0 bg-slate-100 border-none shadow-2xl overflow-hidden">
                <ScrollArea className="max-h-[80vh] w-full">
                  <div className="p-4 bg-white shadow-[0_0_20px_rgba(0,0,0,0.1)] mx-auto my-4 w-[90%] border-t-4 border-slate-900 animate-in zoom-in-95 duration-300">
                    <Receipt data={successData} />
                    <div className="p-4 border-t border-dashed bg-slate-50 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        Close Preview
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          // --- PAYMENT FORM VIEW ---
          <div className="p-6 flex flex-col max-h-[85vh]">
            {!isAllEmiEligible && (
              <div className="mb-4 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-amber-600 border-amber-300 bg-amber-100/50 text-[10px]"
                >
                  NOTE
                </Badge>
                <p className="text-[10px] text-amber-700 font-medium">
                  Cart has items ineligible for EMI sales.
                </p>
              </div>
            )}
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
                          <SelectItem
                            value="emi"
                            disabled={!isAllEmiEligible || !customer}
                            title={
                              !customer
                                ? "Guests cannot use EMI"
                                : !isAllEmiEligible
                                ? "Some items in cart are not eligible for EMI"
                                : ""
                            }
                          >
                            📅 EMI {!isAllEmiEligible && " (Ineligible)"}{" "}
                            {!customer && " (Register Customer)"}
                          </SelectItem>
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
                                  {plan.name} ({plan.tenure_months}m)
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
                                const months = plan.tenure_months;
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
                          autoFocus
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
                    <div className="flex gap-2 mt-2">
                      {[100, 500, 1000].map((val) => (
                        <Button
                          key={val}
                          variant="outline"
                          size="sm"
                          className="flex-1 text-[10px] h-7 font-bold"
                          onClick={() => updatePayment(p.id, "amount", val)}
                        >
                          {val}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-[10px] h-7 font-bold border-primary text-primary"
                        onClick={() =>
                          updatePayment(p.id, "amount", finalTotal)
                        }
                      >
                        Exact
                      </Button>
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
            <div className="pt-4 border-t mt-4 space-y-3">
              {!settings?.default_tax_zone_code && (
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-[10px] uppercase font-black text-slate-500">
                    Tax Zone
                  </Label>
                  <select
                    className="h-8 px-2 rounded border bg-slate-50 text-xs font-bold"
                    value={selectedZoneCode}
                    onChange={(e) => setSelectedZoneCode(e.target.value)}
                  >
                    <option value="">Manual / No Tax</option>
                    {zones.map((z: any) => (
                      <option key={z.id} value={z.code}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>${calculatedSubtotal.toFixed(2)}</span>
                </div>
                {calculatedTax > 0 && (
                  <div className="flex justify-between text-violet-600 font-medium">
                    <span className="flex items-center gap-1">
                      Tax{" "}
                      {selectedZoneCode && (
                        <Badge className="text-[8px] h-3 px-1 bg-violet-100 text-violet-600 border-none">
                          RULES
                        </Badge>
                      )}
                    </span>
                    <span>+${calculatedTax.toFixed(2)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Discount</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 pt-1 border-t border-dashed">
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
                {!customer && remainingDue > 0.01 && (
                  <div className="flex items-center gap-2 p-2 bg-rose-50 border border-rose-100 rounded-lg animate-in fade-in zoom-in-95">
                    <Badge
                      variant="destructive"
                      className="h-4 px-1 text-[8px]"
                    >
                      STOP
                    </Badge>
                    <span className="text-[10px] text-rose-600 font-bold uppercase tracking-tight">
                      Guest customers must pay in full to proceed.
                    </span>
                  </div>
                )}
              </div>

              <Button
                disabled={
                  loading ||
                  ((settings ? !settings.allow_partial_payment : false) &&
                    remainingDue > 0.01) ||
                  (!customer && remainingDue > 0.01)
                }
                className={cn(
                  "w-full h-14 text-lg font-black rounded-xl shadow-lg transition-all",
                  !customer && remainingDue > 0.01
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    : "shadow-primary/20"
                )}
                onClick={handleSubmit}
              >
                {remainingDue > 0
                  ? !customer
                    ? "PAY FULL (GUEST)"
                    : settings?.allow_partial_payment
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
