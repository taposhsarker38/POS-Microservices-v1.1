"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Package,
  Truck,
  CheckCircle2,
  CreditCard,
  Factory,
  ArrowRight,
  Info,
} from "lucide-react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OrderJourneyProps {
  orderId: string;
}

export function OrderJourney({ orderId }: OrderJourneyProps) {
  // 1. Fetch Sales Order
  const { data: order, isLoading: salesLoading } = useQuery({
    queryKey: ["sales", "order", orderId],
    queryFn: () => api.get(`/pos/orders/${orderId}/`).then((res) => res.data),
  });

  // 2. Fetch Manufacturing Info (Linked PO)
  const { data: manufacturingOrders } = useQuery({
    queryKey: ["mfg", "order-link", orderId],
    queryFn: () =>
      api
        .get(`/manufacturing/orders/?source_order_uuid=${orderId}`)
        .then((res) => res.data.results || res.data),
  });

  // 3. Fetch Logistics Info (Linked Shipment)
  const { data: shipments } = useQuery({
    queryKey: ["logistics", "order-link", orderId],
    queryFn: () =>
      api
        .get(`/logistics/shipments/?order_uuid=${orderId}`)
        .then((res) => res.data.results || res.data),
  });

  if (salesLoading)
    return (
      <div className="p-8 text-center animate-pulse">
        Tracing Order Journey...
      </div>
    );
  if (!order)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Order not found
      </div>
    );

  const steps = [
    {
      title: "Head Office Order",
      status: "COMPLETED",
      icon: <Building2 className="h-5 w-5" />,
      color: "bg-blue-500",
      details: (
        <div className="text-xs space-y-1 mt-1">
          <p className="font-medium">{order.order_number}</p>
          <p>Customer: {order.customer_name}</p>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[10px]">
              Total: ${order.grand_total}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                order.payment_status === "paid"
                  ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                  : "text-amber-600 border-amber-200 bg-amber-50"
              )}
            >
              Payment: {order.payment_status}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      title: "Factory Production",
      status:
        manufacturingOrders?.length > 0
          ? manufacturingOrders[0].status === "COMPLETED"
            ? "COMPLETED"
            : "IN_PROGRESS"
          : "PENDING",
      icon: <Factory className="h-5 w-5" />,
      color: "bg-purple-500",
      details:
        manufacturingOrders?.length > 0 ? (
          <div className="text-xs space-y-1 mt-1">
            {manufacturingOrders.map((mo: any) => (
              <div key={mo.id}>
                <p className="font-medium">
                  PO-{mo.id} ({mo.status})
                </p>
                <p>Planned: {mo.quantity_planned} pcs</p>
                <p className="text-[10px] text-muted-foreground italic">
                  {mo.notes}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Waiting for production queue...
          </p>
        ),
    },
    {
      title: "Warehouse Fulfillment",
      status: manufacturingOrders?.some((mo: any) => mo.status === "COMPLETED")
        ? "COMPLETED"
        : "PENDING",
      icon: <Package className="h-5 w-5" />,
      color: "bg-amber-500",
      details: (
        <div className="text-xs space-y-1 mt-1">
          <p>Status: Ready for Dispatch</p>
          <p className="text-[10px] text-muted-foreground">
            Buffer stock and Showroom distribution managed.
          </p>
        </div>
      ),
    },
    {
      title: "Logistics & Delivery",
      status:
        shipments?.length > 0
          ? shipments[0].status === "DELIVERED"
            ? "COMPLETED"
            : "IN_PROGRESS"
          : "PENDING",
      icon: <Truck className="h-5 w-5" />,
      color: "bg-blue-600",
      details:
        shipments?.length > 0 ? (
          <div className="text-xs space-y-1 mt-1">
            {shipments.map((s: any) => (
              <div key={s.id}>
                <p className="font-medium">
                  {s.tracking_number.slice(0, 8)}... ({s.status})
                </p>
                <p>To: {s.destination_address}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Pending production output...
          </p>
        ),
    },
    {
      title: "Final Completion",
      status:
        order.status === "completed" &&
        shipments?.some((s: any) => s.status === "DELIVERED")
          ? "COMPLETED"
          : "PENDING",
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "bg-emerald-500",
      details: (
        <p className="text-[10px] text-muted-foreground italic">
          Full cycle audit ready.
        </p>
      ),
    },
  ];

  return (
    <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border shadow-sm">
      <div className="flex items-center gap-2 mb-6 border-b pb-4">
        <Info className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">End-to-End Order Journey</h2>
      </div>

      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
        {steps.map((step, index) => (
          <div
            key={index}
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
          >
            {/* Icon circle */}
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors",
                step.status === "COMPLETED"
                  ? "bg-emerald-500 text-white border-emerald-200"
                  : step.status === "IN_PROGRESS"
                  ? "bg-amber-500 text-white border-amber-200 animate-pulse"
                  : "bg-slate-100 text-slate-400 border-slate-200"
              )}
            >
              {step.icon}
            </div>
            {/* Card Content */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-50 dark:bg-slate-900 border rounded-xl p-4 shadow-sm hover:border-primary/30 transition-all">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm tracking-tight">
                  {step.title}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] uppercase font-bold",
                    step.status === "COMPLETED"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                      : step.status === "IN_PROGRESS"
                      ? "bg-amber-50 text-amber-600 border-amber-200"
                      : "bg-slate-50 text-slate-400"
                  )}
                >
                  {step.status}
                </Badge>
              </div>
              <div>{step.details}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
