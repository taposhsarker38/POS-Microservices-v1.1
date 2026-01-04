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
import { QCInspectionDialog } from "./qc-inspection-dialog";
import { QCAnalytics } from "./qc-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, List } from "lucide-react";

export function InspectionList() {
  const [data, setData] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInspectionId, setSelectedInspectionId] = useState<
    string | null
  >(null);
  const [isQCDialogOpen, setIsQCDialogOpen] = useState(false);

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
                : s === "REJECTED" || s === "FAILED"
                ? "destructive"
                : s === "REWORK"
                ? "outline"
                : "secondary"
            }
            className={
              s === "REWORK" ? "border-yellow-500 text-yellow-600" : ""
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
              <Button
                size="sm"
                variant="outline"
                className="text-primary hover:bg-primary/5"
                onClick={() => {
                  setSelectedInspectionId(inspection.id.toString());
                  setIsQCDialogOpen(true);
                }}
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Inspect
              </Button>
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
      <Tabs defaultValue="list" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" /> Inspections
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Analytics
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Inspection
          </Button>
        </div>

        <TabsContent value="list" className="mt-0">
          <DataTable
            columns={columns}
            data={data}
            searchKey="reference_uuid"
            isLoading={loading}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          {!loading && data.length > 0 ? (
            <QCAnalytics data={data} />
          ) : (
            <div className="h-[200px] flex items-center justify-center border rounded-lg bg-muted/20">
              <p className="text-muted-foreground">
                Insufficient data for analytics
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

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

      {selectedInspectionId && (
        <QCInspectionDialog
          inspectionId={selectedInspectionId}
          open={isQCDialogOpen}
          onOpenChange={setIsQCDialogOpen}
          onSuccess={() => fetchData()}
        />
      )}
    </div>
  );
}
