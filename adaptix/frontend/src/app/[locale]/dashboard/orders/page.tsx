"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  Eye,
  RefreshCcw,
  MoreHorizontal,
  ArrowUpDown,
  History,
  Factory,
  CalendarIcon,
  X,
} from "lucide-react";
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
import { OrderJourney } from "@/components/pos/order-journey";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

type Order = components["schemas"]["Order"];

export default function OrdersPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [refundOpen, setRefundOpen] = React.useState(false);
  const [selectedBranch, setSelectedBranch] = React.useState<string>("all");
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [journeyOpen, setJourneyOpen] = React.useState(false);
  const [journeyId, setJourneyId] = React.useState<string | null>(null);

  const { companyId } = useCompany();

  // --- Fetch Branches ---
  const { data: branches = [] } = useQuery({
    queryKey: ["wings", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const res = await api.get("/company/wings/", {
        params: { company_uuid: companyId },
      });
      return Array.isArray(res.data) ? res.data : res.data?.results || [];
    },
    enabled: !!companyId,
  });

  // --- Data Fetching ---
  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["orders", companyId, selectedBranch, date],
    queryFn: async () => {
      if (!companyId) return [];
      const params: any = { company_uuid: companyId };
      if (selectedBranch !== "all") params.branch_id = selectedBranch;
      if (date?.from) params.start_date = format(date.from, "yyyy-MM-dd");
      if (date?.to) params.end_date = format(date.to, "yyyy-MM-dd");

      const res = await api.get("/pos/orders/", { params });
      return Array.isArray(res.data) ? res.data : res.data?.results || [];
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
      cell: ({ row }) => {
        const dateStr = row.getValue("created_at") as string;
        return dateStr ? format(new Date(dateStr), "MMM d, yyyy HH:mm") : "-";
      },
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
                  className="text-amber-600"
                  onClick={() => {
                    setSelectedOrder(order);
                    setRefundOpen(true);
                  }}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refund Order
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  setJourneyId(order.id);
                  setJourneyOpen(true);
                }}
              >
                <History className="mr-2 h-4 w-4" /> Track Journey
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-purple-600"
                onClick={async () => {
                  try {
                    await api.post(
                      `/pos/orders/${order.id}/request-production/`
                    );
                    toast.success("Production Request Sent to Factory");
                  } catch (e) {
                    toast.error("Failed to request production");
                  }
                }}
              >
                <Factory className="mr-2 h-4 w-4" /> Request Factory
              </DropdownMenuItem>
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
          <p className="text-muted-foreground text-xs uppercase font-bold tracking-widest mt-1">
            Track and filter transactions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Filter */}
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[180px] bg-white dark:bg-slate-950">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🏢 All Branches</SelectItem>
              {Array.isArray(branches) &&
                branches.map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>
                    📍 {w.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[260px] justify-start text-left font-normal bg-white dark:bg-slate-950",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {(date?.from || date?.to || selectedBranch !== "all") && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-slate-400 hover:text-rose-500"
                onClick={() => {
                  setSelectedBranch("all");
                  setDate({ from: undefined, to: undefined });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
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
            enableGlobalFilter={true}
          />
        )}
      </div>

      <RefundDialog
        order={selectedOrder}
        open={refundOpen}
        onOpenChange={setRefundOpen}
        onSuccess={() => refetch()}
      />

      <Dialog open={journeyOpen} onOpenChange={setJourneyOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Lifecycle Tracking</DialogTitle>
          </DialogHeader>
          {journeyId && <OrderJourney orderId={journeyId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
