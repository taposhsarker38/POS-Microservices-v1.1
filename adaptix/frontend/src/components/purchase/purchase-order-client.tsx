"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  ArrowUpDown,
  FileText,
  DollarSign,
  Wallet,
  Users,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PurchaseOrderForm } from "@/components/purchase/purchase-order-form";
import { ReceiveOrderDialog } from "@/components/purchase/receive-order-dialog";
import { VendorPaymentDialog } from "@/components/purchase/vendor-payment-dialog";
import { VendorForm } from "@/components/purchase/vendor-form";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const PurchaseOrderClient: React.FC = () => {
  const [data, setData] = React.useState<any[]>([]);
  const [vendors, setVendors] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<any>(null);

  const [openReceive, setOpenReceive] = React.useState(false);
  const [receiveOrderId, setReceiveOrderId] = React.useState<string | null>(
    null
  );

  const [openPayment, setOpenPayment] = React.useState(false);
  const [paymentOrderId, setPaymentOrderId] = React.useState<any>(null);

  const [openVendor, setOpenVendor] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [ordersRes, vendorsRes, productsRes] = await Promise.all([
        api.get("/purchase/orders/"),
        api.get("/purchase/vendors/"),
        api.get("/product/products/"), // Assuming product service
      ]);

      const orders = Array.isArray(ordersRes.data)
        ? ordersRes.data
        : ordersRes.data.results || ordersRes.data.data || [];

      const vends = Array.isArray(vendorsRes.data)
        ? vendorsRes.data
        : vendorsRes.data.results || vendorsRes.data.data || [];

      const prods = Array.isArray(productsRes.data)
        ? productsRes.data
        : productsRes.data.results || productsRes.data.data || [];

      setData(orders);
      setVendors(vends);
      setProducts(prods);
    } catch (error) {
      console.error("Failed to fetch purchase data", error);
      toast.error("Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onEdit = (order: any) => {
    setSelectedOrder(order);
    setOpen(true);
  };

  const onCreate = () => {
    setSelectedOrder(null);
    setOpen(true);
  };

  const handleModalClose = () => {
    setOpen(false);
    fetchData();
  };

  const onReceive = (order: any) => {
    setReceiveOrderId(order.id);
    setOpenReceive(true);
  };

  const onPay = (order: any) => {
    setPaymentOrderId(order);
    setOpenPayment(true);
  };

  const handlePaymentSuccess = () => {
    fetchData(); // Refresh list to update paid amount/status
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "ordered":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "received":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200";
      case "rejected":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case "paid":
        return "bg-emerald-100 text-emerald-800 hover:bg-emerald-200";
      case "partial":
        return "bg-amber-100 text-amber-800 hover:bg-amber-200";
      case "overdue":
        return "bg-rose-100 text-rose-800 hover:bg-rose-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "reference_number",
      header: "Reference",
    },
    {
      accessorKey: "vendor.name",
      header: "Vendor",
      cell: ({ row }) => row.original.vendor?.name || "N/A",
    },
    {
      accessorKey: "date_issued",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-0 font-medium"
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => format(new Date(row.original.date_issued), "PP"),
    },
    {
      accessorKey: "total_amount",
      header: "Total Amount",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("total_amount"));
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD", // Should be company currency default
        }).format(amount);
        return <div className="font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: "payment_status",
      header: "Payment",
      cell: ({ row }) => {
        const status = row.original.payment_status || "pending";
        const paid = parseFloat(row.original.paid_amount || 0);
        const total = parseFloat(row.original.total_amount || 0);

        return (
          <div className="flex flex-col gap-1">
            <Badge className={getStatusColor(status)} variant="outline">
              {status.toUpperCase()}
            </Badge>
            {status !== "paid" && status !== "pending" && (
              <span className="text-xs text-muted-foreground">
                Pd: {paid.toFixed(0)}/{total.toFixed(0)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={getStatusColor(row.original.status)}
          variant="secondary"
        >
          {row.original.status.replace("_", " ").toUpperCase()}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
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
                onClick={() => onEdit(row.original)}
                className="cursor-pointer"
              >
                <Pencil className="mr-2 h-4 w-4" /> View / Edit
              </DropdownMenuItem>
              {row.original.status === "ordered" && (
                <DropdownMenuItem
                  onClick={() => onReceive(row.original)}
                  className="cursor-pointer text-blue-600"
                >
                  <ArrowUpDown className="mr-2 h-4 w-4" /> Receive Order
                </DropdownMenuItem>
              )}
              {row.original.payment_status !== "paid" && (
                <DropdownMenuItem
                  onClick={() => onPay(row.original)}
                  className="cursor-pointer text-green-600"
                >
                  <Wallet className="mr-2 h-4 w-4" /> Record Payment
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (loading) {
    return <div>Loading orders...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Purchase Orders</h2>
          <p className="text-muted-foreground">Manage inventory procurement.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenVendor(true)}>
            <Users className="mr-2 h-4 w-4" /> Add Vendor
          </Button>
          <Button onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" /> Create Order
          </Button>
        </div>
      </div>
      <div className="mt-8">
        <DataTable searchKey="reference_number" columns={columns} data={data} />
      </div>
      <PurchaseOrderForm
        vendors={vendors}
        products={products}
        initialData={selectedOrder}
        isOpen={open}
        onClose={handleModalClose}
        onVendorCreated={fetchData}
      />
      <ReceiveOrderDialog
        orderId={receiveOrderId}
        isOpen={openReceive}
        onClose={() => setOpenReceive(false)}
        onSuccess={handleModalClose}
      />
      <VendorPaymentDialog
        order={paymentOrderId}
        isOpen={openPayment}
        onClose={() => setOpenPayment(false)}
        onSuccess={handlePaymentSuccess}
      />
      <VendorForm
        isOpen={openVendor}
        onClose={() => setOpenVendor(false)}
        onSuccess={fetchData}
      />
    </>
  );
};
