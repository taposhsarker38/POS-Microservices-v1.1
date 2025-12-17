"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { AccountForm } from "./account-form";
import { AlertModal } from "@/components/modals/alert-modal";

export function ChartOfAccountClient() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);

  const [openAlert, setOpenAlert] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchAccounts = async () => {
    try {
      const res = await api.get("/accounting/accounts/");
      setAccounts(res.data.results || res.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await api.get("/accounting/groups/");
      setGroups(res.data.results || res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchGroups();
  }, []);

  const openCreate = () => {
    setSelectedAccount(null);
    setIsDialogOpen(true);
  };

  const openEdit = (account: any) => {
    setSelectedAccount(account);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    fetchAccounts();
  };

  const onDelete = (id: number) => {
    setDeleteId(id);
    setOpenAlert(true);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      await api.delete(`/accounting/accounts/${deleteId}/`);
      toast.success("Account deleted");
      fetchAccounts();
    } catch (e) {
      toast.error("Failed to delete account");
    } finally {
      setLoading(false);
      setOpenAlert(false);
      setDeleteId(null);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => <span className="font-mono">{row.original.code}</span>,
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "group",
      header: "Group",
      cell: ({ row }) => {
        const g = groups.find((grp) => grp.id === row.original.group);
        return g ? g.name : row.original.group;
      },
    },
    {
      accessorKey: "current_balance",
      header: "Balance",
      cell: ({ row }) => (
        <span className="font-mono">{row.original.current_balance}</span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
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
        <h3 className="text-xl font-semibold">Chart of Accounts</h3>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Account
        </Button>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950">
        <DataTable
          columns={columns}
          data={accounts}
          searchKey="name"
          enableExport={true}
          exportFileName="chart_of_accounts"
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAccount ? "Edit Account" : "New Account"}
            </DialogTitle>
          </DialogHeader>
          <AccountForm
            initialData={selectedAccount}
            groups={groups}
            onSuccess={handleSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
