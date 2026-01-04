"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import { handleApiError } from "@/lib/api-handler";

export function OperationList() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);
  const [workCenters, setWorkCenters] = React.useState<any[]>([]);

  React.useEffect(() => {
    api.get("/manufacturing/work-centers/").then((res) => {
      const data = res.data.results || res.data;
      setWorkCenters(Array.isArray(data) ? data : []);
    });
  }, []);

  // Data Fetching
  const { data: operations, isLoading } = useQuery({
    queryKey: ["mfg", "operations"],
    queryFn: () =>
      api.get("/manufacturing/operations/").then((res) => {
        const data = res.data.results || res.data;
        return Array.isArray(data) ? data : [];
      }),
  });

  // Actions
  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editingItem
        ? api.put(`/manufacturing/operations/${editingItem.id}/`, data)
        : api.post("/manufacturing/operations/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mfg", "operations"] });
      setIsDialogOpen(false);
      setEditingItem(null);
      toast.success(editingItem ? "Operation updated" : "Operation created");
    },
    onError: (error: any) => {
      handleApiError(error);
    },
  });

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <span className="font-mono font-bold">{row.getValue("code")}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "work_center_name",
      header: "Default Work Center",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate max-w-[200px] block">
          {row.getValue("description")}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditingItem(row.original);
                setIsDialogOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Operations / Tasks</h3>
        <Button
          onClick={() => {
            setEditingItem(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Operation
        </Button>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingItem(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Operation" : "Add New Operation"}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                saveMutation.mutate(data);
              }}
              className="space-y-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  name="name"
                  defaultValue={editingItem?.name}
                  required
                  placeholder="e.g. Cutting"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    name="code"
                    defaultValue={editingItem?.code}
                    required
                    placeholder="OP-001"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="work_center">Work Center</Label>
                  <Select
                    name="work_center"
                    defaultValue={
                      editingItem?.work_center
                        ? String(editingItem.work_center)
                        : ""
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select WC" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(workCenters) &&
                        workCenters.map((wc) => (
                          <SelectItem key={wc.id} value={String(wc.id)}>
                            {wc.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  name="description"
                  defaultValue={editingItem?.description}
                  placeholder="Define what happens here..."
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending
                  ? "Saving..."
                  : editingItem
                  ? "Update"
                  : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={operations || []}
        isLoading={isLoading}
        searchKey="name"
      />
    </div>
  );
}
