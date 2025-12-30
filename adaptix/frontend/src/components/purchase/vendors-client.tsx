"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, FileEdit, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import api from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { AlertModal } from "@/components/modals/alert-modal";
import { VendorForm } from "./vendor-form";

export function VendorsClient() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any | null>(null);
  const [openAlert, setOpenAlert] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/purchase/vendors/", {
        params: { search: searchTerm },
      });
      // Handle potential pagination or direct array
      const data = Array.isArray(res.data)
        ? res.data
        : res.data.results || res.data.data || [];
      setVendors(data);
    } catch (error) {
      console.error("Failed to fetch vendors", error);
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchVendors]);

  const onDelete = (id: string) => {
    setDeleteId(id);
    setOpenAlert(true);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      await api.delete(`/purchase/vendors/${deleteId}/`);
      toast.success("Vendor deleted successfully");
      fetchVendors();
    } catch (e) {
      toast.error("Failed to delete vendor");
    } finally {
      setLoading(false);
      setOpenAlert(false);
      setDeleteId(null);
    }
  };

  const openEdit = (vendor: any) => {
    setEditingVendor(vendor);
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingVendor(null);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    fetchVendors();
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "contact_person",
      header: "Contact Person",
      cell: ({ row }) => row.original.contact_person || "-",
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.original.phone || "-",
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email || "-",
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => (
        <span className="truncate max-w-[200px] block">
          {row.original.address || "-"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEdit(row.original)}
          >
            <FileEdit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-600"
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vendors</h2>
          <p className="text-sm text-muted-foreground">
            Manage your suppliers and service providers.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Vendor
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            className="pl-8 bg-white dark:bg-slate-950"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {searchTerm && (
          <Button
            variant="ghost"
            onClick={() => setSearchTerm("")}
            className="text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950">
        <DataTable
          columns={columns}
          data={vendors}
          isLoading={loading}
          searchKey="name"
        />
      </div>

      <VendorForm
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        initialData={editingVendor}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
