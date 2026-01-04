"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { manufacturingApi, WorkCenter } from "@/lib/api/manufacturing";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Cpu } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import { handleApiError } from "@/lib/api-handler";

export function WorkCenterList() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<WorkCenter | null>(null);

  // Data Fetching
  const { data: workCenters, isLoading } = useQuery({
    queryKey: ["mfg", "work-centers"],
    queryFn: manufacturingApi.getWorkCenters,
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<WorkCenter>) =>
      manufacturingApi.createWorkCenter(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mfg", "work-centers"] });
      setIsDialogOpen(false);
      toast.success("Work Center created");
    },
    onError: (error: any) => {
      handleApiError(error);
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<WorkCenter>) =>
      manufacturingApi.updateWorkCenter(editingItem!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mfg", "work-centers"] });
      setIsDialogOpen(false);
      setEditingItem(null);
      toast.success("Work Center updated");
    },
    onError: (error: any) => {
      handleApiError(error);
    },
  });

  const columns: ColumnDef<WorkCenter>[] = [
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
      accessorKey: "capacity_per_day",
      header: "Daily Capacity",
      cell: ({ row }) => (
        <span>
          {parseFloat(row.getValue("capacity_per_day")).toLocaleString()} units
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
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
        <h3 className="text-lg font-medium">Work Centers</h3>
        <Button
          onClick={() => {
            setEditingItem(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Work Center
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
                {editingItem ? "Edit Work Center" : "Add Work Center"}
              </DialogTitle>
            </DialogHeader>
            <WorkCenterForm
              initialData={editingItem}
              onSubmit={(data) => {
                if (editingItem) {
                  updateMutation.mutate(data);
                } else {
                  createMutation.mutate(data);
                }
              }}
              isSubmitting={
                createMutation.isPending || updateMutation.isPending
              }
            />
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={workCenters || []}
        isLoading={isLoading}
        searchKey="name"
      />
    </div>
  );
}

function WorkCenterForm({
  initialData,
  onSubmit,
  isSubmitting,
}: {
  initialData?: WorkCenter | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = React.useState({
    name: "",
    code: "",
    capacity_per_day: "",
    description: "",
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        code: initialData.code,
        capacity_per_day: String(initialData.capacity_per_day),
        description: initialData.description || "",
      });
    } else {
      setFormData({
        name: "",
        code: "",
        capacity_per_day: "",
        description: "",
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          required
          placeholder="e.g. Assembly Line A"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            required
            placeholder="e.g. WC-001"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="capacity">Daily Capacity</Label>
          <Input
            id="capacity"
            type="number"
            required
            placeholder="1000"
            value={formData.capacity_per_day}
            onChange={(e) =>
              setFormData({ ...formData, capacity_per_day: e.target.value })
            }
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="desc">Description</Label>
        <Textarea
          id="desc"
          placeholder="Capabilities and location..."
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting
          ? "Saving..."
          : initialData
          ? "Update Work Center"
          : "Create Work Center"}
      </Button>
    </form>
  );
}
