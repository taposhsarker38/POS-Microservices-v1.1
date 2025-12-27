"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  Printer,
  RefreshCcw,
  CreditCard,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/api";
import { useCompany } from "@/hooks/use-company";
import { components } from "@/types/pos-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefundDialog } from "@/components/orders/refund-dialog";

type Order = components["schemas"]["Order"];

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [refundOpen, setRefundOpen] = React.useState(false);

  const { companyId } = useCompany();

  const {
    data: order,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["order", id, companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const res = await api.get(`/pos/orders/${id}/`, {
        params: { company_uuid: companyId },
      });
      return res.data as Order;
    },
    enabled: !!id && !!companyId,
  });

  if (isLoading)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading order details...
      </div>
    );
  if (!order)
    return <div className="p-8 text-center text-red-500">Order not found</div>;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Order #{order.order_number}
            </h2>
            <p className="text-muted-foreground">
              Placed on {format(new Date(order.created_at), "PPP p")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print Receipt
          </Button>
          {order.status !== "returned" && order.status !== "cancelled" && (
            <Button onClick={() => setRefundOpen(true)}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Return / Refund
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Order Items */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.product_name}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(item.unit_price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      $
                      {(
                        Number(item.quantity) * Number(item.unit_price)
                      ).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-bold">
                  <TableCell colSpan={3} className="text-right">
                    Grand Total
                  </TableCell>
                  <TableCell className="text-right text-lg">
                    ${Number(order.grand_total).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Info & Status */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={
                    order.status === "completed" ? "default" : "secondary"
                  }
                >
                  {order.status}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Payment</span>
                <Badge
                  variant={
                    order.payment_status === "paid" ? "default" : "outline"
                  }
                >
                  {order.payment_status}
                </Badge>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                  Customer
                </p>
                <p className="font-medium">
                  {order.customer_name || "Guest Customer"}
                </p>
                <p className="text-xs text-muted-foreground">
                  ID: {order.customer_uuid || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                  Amount Paid
                </p>
                <p className="text-xl font-bold text-emerald-600">
                  ${Number(order.paid_amount).toFixed(2)}
                </p>
              </div>
              {Number(order.due_amount) > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                    Remaining Due
                  </p>
                  <p className="text-xl font-bold text-red-500">
                    ${Number(order.due_amount).toFixed(2)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.payments?.map((payment: any, i: number) => (
                <div
                  key={i}
                  className="flex flex-col gap-1 border-b pb-2 last:border-0"
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium uppercase">
                      {payment.method.replace("_", " ")}
                    </span>
                    <span className="font-bold">
                      ${Number(payment.amount).toFixed(2)}
                    </span>
                  </div>
                  {payment.provider && (
                    <p className="text-xs text-muted-foreground">
                      Provider: {payment.provider}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <RefundDialog
        order={order}
        open={refundOpen}
        onOpenChange={setRefundOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
