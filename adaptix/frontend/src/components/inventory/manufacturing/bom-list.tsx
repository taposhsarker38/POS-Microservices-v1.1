"use client";

import { useState, useEffect } from "react";
import { Plus, FileEdit, Trash2 } from "lucide-react";
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
import { BOMForm } from "./bom-form";

export function BOMList() {
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
      const productMap: Record<string, string> = {};
      (res.data.results || res.data).forEach((p: any) => {
        productMap[p.id] = p.name;
      });
      setProducts(productMap);
    } catch (e) {
      console.error("Failed to fetch products");
    }
  };

  const fetchData = async () => {
    try {
      const response = await api.get("/inventory/manufacturing/boms/");
      setData(response.data.results || response.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch BOMs");
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
      await api.delete(`/inventory/manufacturing/boms/${deleteId}/`);
      toast.success("Deleted successfully");
      fetchData();
    } catch (e) {
      toast.error("Failed to delete");
    } finally {
      setOpenAlert(false);
      setDeleteId(null);
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
      accessorKey: "name",
      header: "Recipe Name",
    },
    {
      accessorKey: "quantity",
      header: "Output Qty",
    },
    {
      id: "items_count",
      header: "Components",
      cell: ({ row }) => row.original.items?.length || 0,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right">
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
          <Plus className="mr-2 h-4 w-4" /> Create BOM
        </Button>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950">
        <DataTable columns={columns} data={data} searchKey="name" />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit BOM" : "Create New BOM"}
            </DialogTitle>
          </DialogHeader>
          <BOMForm
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
