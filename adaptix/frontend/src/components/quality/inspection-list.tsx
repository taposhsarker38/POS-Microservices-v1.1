"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import api from "@/lib/api";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InspectionForm } from "./inspection-form";

export function InspectionList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/quality/inspections/");
      setData(res.data);
    } catch (error) {
      console.error("Failed to fetch inspections", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "reference_type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.reference_type}</Badge>
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
        format(new Date(row.original.created_at || new Date()), "PPP"),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button size="sm" variant="ghost">
          View
        </Button>
      ),
    },
  ];

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // ... imports and previous code ...

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Inspection
        </Button>
      </div>
      <DataTable columns={columns} data={data} searchKey="reference_type" />

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
