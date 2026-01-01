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
import { AccountGroupForm } from "./group-form";
import { Badge } from "@/components/ui/badge";
import { AlertModal } from "@/components/modals/alert-modal";

export function AccountGroupClient({
  wingId,
  companyId,
  creationCompanyId,
  targetName,
  entities = [],
  startDate,
  endDate,
}: {
  wingId?: string;
  companyId?: string;
  creationCompanyId?: string;
  targetName?: string;
  entities?: any[];
  startDate?: string;
  endDate?: string;
}) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);

  const [openAlert, setOpenAlert] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchGroups = async () => {
    try {
      const params = new URLSearchParams();
      if (wingId) params.append("wing_uuid", wingId);
      if (companyId) params.append("company_uuid", companyId);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const res = await api.get(`/accounting/groups/?${params.toString()}`);
      setGroups(res.data.results || res.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [wingId, companyId, startDate, endDate]);

  const openCreate = () => {
    setSelectedGroup(null);
    setIsDialogOpen(true);
  };

  const openEdit = (group: any) => {
    setSelectedGroup(group);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    fetchGroups();
  };

  const onDelete = (id: number) => {
    setDeleteId(id);
    setOpenAlert(true);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      await api.delete(`/accounting/groups/${deleteId}/`);
      toast.success("Group deleted");
      fetchGroups();
    } catch (e) {
      toast.error("Failed to delete group");
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
      accessorKey: "company_uuid",
      header: "Entity / Unit",
      cell: ({ row }) => {
        const companyUuid = row.original.company_uuid;
        if (
          !companyUuid ||
          companyUuid === "00000000-0000-0000-0000-000000000000"
        ) {
          return targetName || "Main Organization";
        }
        const entity = entities.find((e) => e.id === companyUuid);
        return entity ? entity.name : companyUuid;
      },
    },
    {
      accessorKey: "group_type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.group_type}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.created_at
            ? new Date(row.original.created_at).toLocaleDateString()
            : "-"}
        </span>
      ),
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.updated_at
            ? new Date(row.original.updated_at).toLocaleDateString()
            : "-"}
        </span>
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
        <h3 className="text-xl font-semibold">Account Groups</h3>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Group
        </Button>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950">
        <DataTable
          columns={columns}
          data={groups}
          searchKey="name"
          enableExport={true}
          exportFileName="account_groups"
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedGroup ? "Edit Group" : "New Account Group"}
            </DialogTitle>
          </DialogHeader>
          <AccountGroupForm
            initialData={selectedGroup}
            onSuccess={handleSuccess}
            onCancel={() => setIsDialogOpen(false)}
            companyId={creationCompanyId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
