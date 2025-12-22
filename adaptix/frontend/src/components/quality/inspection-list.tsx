"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle, XCircle, Eye } from "lucide-react";
import { qualityApi, Inspection } from "@/lib/api/quality";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InspectionForm } from "./inspection-form";

export function InspectionList() {
  const [data, setData] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await qualityApi.getInspections();
      setData(res);
    } catch (error) {
      console.error("Failed to fetch inspections", error);
      toast.error("Could not load inspections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusUpdate = async (
    id: number,
    status: "PASSED" | "FAILED"
  ) => {
    try {
      await qualityApi.updateInspectionStatus(
        id,
        status,
        `Manual update to ${status}`
      );
      toast.success(`Inspection marked as ${status}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const columns: ColumnDef<Inspection>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono">#{row.getValue("id")}</span>
      ),
    },
    {
      accessorKey: "reference_type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.reference_type}</Badge>
      ),
    },
    {
      accessorKey: "reference_uuid",
      header: "Ref UUID",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.reference_uuid.substring(0, 8)}...
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <Badge
            variant={
              s === "PASSED"
                ? "default"
                : s === "FAILED"
                ? "destructive"
                : "secondary"
            }
          >
            {s}
          </Badge>
        );
      },
    },
    {
      accessorKey: "inspection_date",
      header: "Date",
      cell: ({ row }) =>
        row.original.inspection_date
          ? format(new Date(row.original.inspection_date), "PPP p")
          : "-",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const inspection = row.original;
        const isPending = inspection.status === "PENDING";

        return (
          <div className="flex gap-2 justify-end">
            {isPending && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => handleStatusUpdate(inspection.id, "PASSED")}
                  title="Pass Inspection"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleStatusUpdate(inspection.id, "FAILED")}
                  title="Fail Inspection"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Inspection
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        searchKey="reference_uuid"
        isLoading={loading}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Inspection</DialogTitle>
          </DialogHeader>
          <InspectionForm
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
