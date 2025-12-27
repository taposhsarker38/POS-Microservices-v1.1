"use client";

import * as React from "react";
import {
  Plus,
  Eye,
  CheckCircle,
  Clock,
  Trash2,
  ArrowRight,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export const RFQManagement: React.FC = () => {
  const [rfqs, setRfqs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedRfq, setSelectedRfq] = React.useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  const fetchRfqs = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/purchase/rfqs/");
      setRfqs(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch (error) {
      toast.error("Failed to load RFQs");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRfqs();
  }, [fetchRfqs]);

  const handleSelectWinner = async (rfqId: string) => {
    try {
      const res = await api.post(`/purchase/rfqs/${rfqId}/select-winner/`);
      toast.success("Winner selected and PO generated!");
      setIsDetailsOpen(false);
      fetchRfqs();
    } catch (error) {
      toast.error(
        "Failed to select winner: " + (error as any).response?.data?.detail ||
          "Unknown error"
      );
    }
  };

  const statusColors: any = {
    open: "bg-blue-100 text-blue-800",
    closed: "bg-gray-100 text-gray-800",
    converted: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "title",
      header: "Title",
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
    },
    {
      accessorKey: "deadline",
      header: "Deadline",
      cell: ({ row }) => format(new Date(row.original.deadline), "PPp"),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={statusColors[row.original.status] || ""}>
          {row.original.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedRfq(row.original);
            setIsDetailsOpen(true);
          }}
        >
          <Eye className="h-4 w-4 mr-2" /> View Quotes
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">RFQ Management</h2>
          <p className="text-muted-foreground">
            Manage Requests for Quotes and select best offers.
          </p>
        </div>
      </div>

      <DataTable columns={columns} data={rfqs} searchKey="title" />

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedRfq?.title}</DialogTitle>
            <DialogDescription>
              Quotes received from vendors for {selectedRfq?.quantity} units.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden py-4">
            <h4 className="text-sm font-semibold mb-3">Vendor Quotes</h4>
            {selectedRfq?.quotes?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                No quotes received yet.
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="grid gap-4">
                  {selectedRfq?.quotes?.map((quote: any) => (
                    <Card
                      key={quote.id}
                      className={
                        quote.is_winning_quote
                          ? "border-green-500 bg-green-50/30"
                          : ""
                      }
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {quote.vendor_name}
                            {quote.is_winning_quote && (
                              <Badge className="bg-green-500">WINNER</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Lead Time: {quote.delivery_lead_time_days} days
                          </p>
                          <p className="text-xs text-muted-foreground italic mt-1">
                            {quote.notes}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-6">
                          <div>
                            <div className="text-lg font-bold text-primary">
                              ${quote.unit_price}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              per unit
                            </div>
                          </div>
                          {selectedRfq?.status === "open" && (
                            <Button
                              size="sm"
                              onClick={() => handleSelectWinner(selectedRfq.id)}
                            >
                              Select Winner
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
