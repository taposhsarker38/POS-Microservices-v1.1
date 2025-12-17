"use client";

import { useState, useEffect } from "react";
import { Plus, FileEdit, Trash2, Calendar as CalIcon } from "lucide-react";
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
import { ProjectForm } from "./project-form";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

export function ProjectClient() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [openAlert, setOpenAlert] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await api.get("/hrms/projects/projects/");
      setData(response.data.results || response.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteId(id);
    setOpenAlert(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/hrms/projects/projects/${deleteId}/`);
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
      accessorKey: "title",
      header: "Project",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.title}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.client_name}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const colors: Record<string, string> = {
          PLANNING: "bg-blue-100 text-blue-800",
          ACTIVE: "bg-green-100 text-green-800",
          ON_HOLD: "bg-yellow-100 text-yellow-800",
          COMPLETED: "bg-gray-100 text-gray-800",
          CANCELLED: "bg-red-100 text-red-800",
        };
        return (
          <Badge
            variant="outline"
            className={colors[row.original.status] || ""}
          >
            {row.original.status.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "manager_name",
      header: "Manager",
    },
    {
      accessorKey: "start_date",
      header: "Timeline",
      cell: ({ row }) => (
        <div className="text-xs">
          {row.original.start_date
            ? format(new Date(row.original.start_date), "MMM d, yyyy")
            : "TBD"}
          {" - "}
          {row.original.end_date
            ? format(new Date(row.original.end_date), "MMM d, yyyy")
            : "TBD"}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
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
            onClick={(e) => onDelete(row.original.id, e)}
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
        <h3 className="text-lg font-medium">All Projects</h3>
        <Button
          onClick={() => {
            setEditingItem(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Create Project
        </Button>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950">
        <DataTable
          columns={columns}
          data={data}
          searchKey="title"
          onRowClick={(row) => router.push(`/dashboard/projects/${row.id}`)}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Project" : "Create New Project"}
            </DialogTitle>
          </DialogHeader>
          <ProjectForm
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
