"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  FileEdit,
  Trash2,
  Award,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import api from "@/lib/api";
import { toast } from "sonner";
import { CustomerForm } from "./customer-form";
import { LoyaltyView } from "./loyalty-view";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { AlertModal } from "@/components/modals/alert-modal";
import { Badge } from "@/components/ui/badge";

export function CustomerClient() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<any | null>(null);
  const [isLoyaltyOpen, setIsLoyaltyOpen] = useState(false);
  const [attributeSets, setAttributeSets] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  const [openAlert, setOpenAlert] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const [customersRes, attrSetsRes, companiesRes, wingsRes] =
        await Promise.all([
          api.get("/customer/customers/", { params: { search: searchTerm } }),
          api.get("/customer/attribute-sets/"),
          api.get("/company/companies/"),
          api.get("/company/wings/"),
        ]);
      setCustomers(customersRes.data.results || customersRes.data);
      setAttributeSets(attrSetsRes.data.results || attrSetsRes.data);

      const getItems = (res: any) => res.data?.results || res.data || [];
      const mergingCompanies = getItems(companiesRes).map((c: any) => ({
        ...c,
        type: "Unit",
      }));
      const mergingWings = getItems(wingsRes).map((w: any) => ({
        ...w,
        type: "Branch",
      }));

      const mergedBranches = [...mergingCompanies, ...mergingWings];
      setBranches(mergedBranches);
    } catch (error) {
      console.error("Failed to fetch customers", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const onDelete = (id: string) => {
    setDeleteId(id);
    setOpenAlert(true);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      await api.delete(`/customer/customers/${deleteId}/`);
      toast.success("Customer deleted");
      fetchCustomers();
    } catch (e) {
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
      setOpenAlert(false);
      setDeleteId(null);
    }
  };

  const openEdit = (customer: any) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingCustomer(null);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    fetchCustomers();
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
      accessorKey: "phone",
      header: "Phone",
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email || "-",
    },
    {
      accessorKey: "loyalty_points",
      header: "Points",
    },
    {
      accessorKey: "tier",
      header: "Tier",
      cell: ({ row }) => {
        const tier = row.original.tier || "SILVER";
        const colors: Record<string, string> = {
          SILVER: "bg-slate-400 hover:bg-slate-500",
          GOLD: "bg-yellow-500 hover:bg-yellow-600",
          PLATINUM: "bg-cyan-500 hover:bg-cyan-600",
          ELITE: "bg-purple-600 hover:bg-purple-700",
        };
        return <Badge className={colors[tier] || colors.SILVER}>{tier}</Badge>;
      },
    },
    {
      accessorKey: "branch_name",
      header: "Branch",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal capitalize">
          {row.original.branch_name || "General"}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const isVerified =
          row.original.is_email_verified || row.original.is_phone_verified;
        return isVerified ? (
          <Badge
            variant="outline"
            className="text-emerald-600 bg-emerald-50 border-emerald-200 gap-1 pr-2"
          >
            <ShieldCheck className="h-3 w-3" /> Verified
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-slate-500 bg-slate-50 border-slate-200 gap-1 pr-2"
          >
            <ShieldAlert className="h-3 w-3" /> Unverified
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right">
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
            className="text-amber-500 hover:text-amber-600"
            onClick={() => {
              setLoyaltyCustomer(row.original);
              setIsLoyaltyOpen(true);
            }}
          >
            <Award className="h-4 w-4" />
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Customers</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Customer
        </Button>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950">
        <DataTable
          columns={columns}
          data={customers}
          searchKey="name"
          enableExport={true}
          exportFileName="customer_list"
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer" : "Add New Customer"}
            </DialogTitle>
          </DialogHeader>
          <CustomerForm
            initialData={editingCustomer}
            attributeSets={attributeSets}
            branches={branches}
            onSuccess={handleSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Sheet open={isLoyaltyOpen} onOpenChange={setIsLoyaltyOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader className="mb-6">
            <SheetTitle>Loyalty Program</SheetTitle>
            <SheetDescription>
              Managing rewards for {loyaltyCustomer?.name}
            </SheetDescription>
          </SheetHeader>

          {loyaltyCustomer && <LoyaltyView customerId={loyaltyCustomer.id} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
