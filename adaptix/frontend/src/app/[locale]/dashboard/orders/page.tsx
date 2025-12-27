"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Eye, RefreshCcw, MoreHorizontal, ArrowUpDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { useCompany } from "@/hooks/use-company";
import api from "@/lib/api";
import { components } from "@/types/pos-api";
import { DataTable } from "@/components/ui/data-table"; // Assuming standard Shadcn DT
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RefundDialog } from "@/components/orders/refund-dialog";
import { useTranslations } from "next-intl";

type Order = components["schemas"]["Order"];

export default function OrdersPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [refundOpen, setRefundOpen] = React.useState(false);

  const { companyId } = useCompany();

  // --- Data Fetching ---
  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["orders", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const res = await api.get("/pos/orders/", {
        params: { company_uuid: companyId },
      }); // Add params for pagination if needed
      return res.data as Order[];
    },
    enabled: !!companyId,
  });

  // --- Columns ---
  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: "order_number",
      header: "Order #",
      cell: ({ row }) => (
        <span className="font-mono font-bold">
          {row.getValue("order_number")}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }) =>
        format(new Date(row.getValue("created_at")), "MMM d, yyyy HH:mm"),
    },
    {
      accessorKey: "customer_name",
      header: "Customer",
    },
    {
      accessorKey: "grand_total",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Total
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-bold">
          ${Number(row.getValue("grand_total")).toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        let variant: "default" | "secondary" | "destructive" | "outline" =
          "default";
        if (status === "cancelled") variant = "destructive";
        if (status === "draft") variant = "secondary";
        if (status === "returned") variant = "outline";
        return (
          <Badge variant={variant} className="uppercase text-[10px]">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "payment_status",
      header: "Payment",
      cell: ({ row }) => {
        const status = row.getValue("payment_status") as string;
        const due = Number(row.original.due_amount);

        let color = "text-slate-500";
        if (status === "paid") color = "text-emerald-500";
        if (status === "partial") color = "text-amber-500";
        if (status === "pending") color = "text-red-500";

        return (
          <div className="flex flex-col">
            <span className={`uppercase font-bold text-[10px] ${color}`}>
              {status}
            </span>
            {due > 0 && (
              <span className="text-[10px] text-red-400">Due: ${due}</span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const order = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() =>
                  navigator.clipboard.writeText(order.order_number)
                }
              >
                Copy Order ID
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/${locale}/dashboard/orders/${order.id}`)
                }
              >
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              {order.status !== "returned" && order.status !== "cancelled" && (
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedOrder(order);
                    setRefundOpen(true);
                  }}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refund / Return
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sales History</h2>
          <p className="text-muted-foreground">
            Manage orders, track payments, and process returns.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border bg-card text-card-foreground shadow">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading orders...
          </div>
        ) : (
          <DataTable
            data={orders}
            columns={columns}
            searchKey="customer_name"
          />
        )}
      </div>

      <RefundDialog
        order={selectedOrder}
        open={refundOpen}
        onOpenChange={setRefundOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
