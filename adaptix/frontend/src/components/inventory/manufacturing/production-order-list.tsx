"use client";

import { useState, useEffect } from "react";
import { Plus, FileEdit, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import api from "@/lib/api";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { AlertModal } from "@/components/modals/alert-modal";
import { ProductionOrderForm } from "./production-order-form";
import { Badge } from "@/components/ui/badge";

export function ProductionOrderList() {
  const [data, setData] = useState<any[]>([]);
  const [products, setProducts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [openAlert, setOpenAlert] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await api.get("/product/products/");
      const data = res.data.results || res.data;
      const productMap: Record<string, string> = {};
      if (Array.isArray(data)) {
        data.forEach((p: any) => {
          productMap[p.id] = p.name;
        });
      }
      setProducts(productMap);
    } catch (e) {
      console.error("Failed to fetch products");
    }
  };

  const fetchData = async () => {
    try {
      const response = await api.get("/manufacturing/orders/");
      const result = response.data.results || response.data;
      setData(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts().then(fetchData);
  }, []);

  const onDelete = (id: string) => {
    setDeleteId(id);
    setOpenAlert(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/manufacturing/orders/${deleteId}/`);
      toast.success("Deleted successfully");
      fetchData();
    } catch (e) {
      toast.error("Failed to delete");
    } finally {
      setOpenAlert(false);
      setDeleteId(null);
    }
  };

  const completeOrder = async (id: string) => {
    try {
      await api.post(`/manufacturing/orders/${id}/complete/`);
      toast.success("Production Completed");
      fetchData();
    } catch (e) {
      toast.error("Failed to complete order");
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "product_uuid",
      header: "Product",
      cell: ({ row }) =>
        products[row.original.product_uuid] || row.original.product_uuid,
    },
    {
      accessorKey: "quantity_planned",
      header: "Qty Planned",
    },
    {
      accessorKey: "work_center_name",
      header: "Work Center",
      cell: ({ row }) => row.original.work_center_name || "Manual / None",
    },
    {
      accessorKey: "source_order_number",
      header: "Origin (Head Office)",
      cell: ({ row }) =>
        row.original.source_order_number ? (
          <Badge
            variant="secondary"
            className="bg-purple-50 text-purple-700 border-purple-200"
          >
            {row.original.source_order_number}
          </Badge>
        ) : (
          "-"
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const colors: Record<string, string> = {
          DRAFT: "bg-slate-100",
          CONFIRMED: "bg-blue-100 text-blue-800",
          IN_PROGRESS: "bg-yellow-100 text-yellow-800",
          COMPLETED: "bg-green-100 text-green-800",
          CANCELLED: "bg-red-100 text-red-800",
        };
        return (
          <Badge variant="outline" className={colors[row.original.status]}>
            {row.original.status.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right flex justify-end space-x-1">
          {row.original.status !== "COMPLETED" &&
            row.original.status !== "CANCELLED" && (
              <Button
                variant="ghost"
                size="icon"
                className="text-green-600"
                title="Complete Production"
                onClick={() => completeOrder(row.original.id)}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingItem(row.original);
              setIsDialogOpen(true);
            }}
          >
            <FileEdit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500"
            onClick={() => onDelete(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <AlertModal
        isOpen={openAlert}
        onClose={() => setOpenAlert(false)}
        onConfirm={confirmDelete}
        loading={loading}
      />
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditingItem(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Create Order
        </Button>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950">
        <DataTable columns={columns} data={data} searchKey="status" />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Order" : "Create Production Order"}
            </DialogTitle>
          </DialogHeader>
          <ProductionOrderForm
            initialData={editingItem}
            onSuccess={() => {
              setIsDialogOpen(false);
              fetchData();
            }}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
