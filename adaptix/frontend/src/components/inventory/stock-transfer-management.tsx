"use client";

import * as React from "react";
import {
  ArrowRightLeft,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  Search,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StockTransferForm } from "./stock-transfer-form";
import { cn } from "@/lib/utils";

export function StockTransferManagement() {
  const [transfers, setTransfers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [openForm, setOpenForm] = React.useState(false);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/inventory/transfers/");
      setTransfers(res.data.results || res.data);
    } catch (e) {
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTransfers();
  }, []);

  const handleStatusAction = async (id: string, action: "ship" | "receive") => {
    try {
      await api.post(`/inventory/transfers/${id}/${action}/`);
      toast.success(
        `Transfer ${action === "ship" ? "Shipped" : "Received"} successfully!`
      );
      fetchTransfers();
    } catch (e: any) {
      toast.error(e.response?.data?.error || `Failed to ${action} transfer`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge
            variant="outline"
            className="bg-slate-50 text-slate-500 border-slate-200"
          >
            Draft
          </Badge>
        );
      case "SHIPPED":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-600 border-blue-200 animate-pulse"
          >
            Shipped
          </Badge>
        );
      case "RECEIVED":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-600 border-emerald-200"
          >
            Received
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ArrowRightLeft className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Inter-Warehouse Transfers</h2>
            <p className="text-xs text-muted-foreground">
              Move stock between factory and showrooms
            </p>
          </div>
        </div>

        <Dialog open={openForm} onOpenChange={setOpenForm}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> New Transfer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Initiate Stock Movement</DialogTitle>
            </DialogHeader>
            <StockTransferForm
              onSuccess={() => {
                setOpenForm(false);
                fetchTransfers();
              }}
              onCancel={() => setOpenForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Loading transfers...
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed flex flex-col items-center">
            <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm font-medium">No transfer records found</p>
            <p className="text-xs opacity-50">
              Start by creating a new transfer from Factory to Showroom
            </p>
          </div>
        ) : (
          transfers.map((tr) => (
            <div
              key={tr.id}
              className="bg-white dark:bg-slate-950 border rounded-xl p-4 shadow-sm hover:border-primary/30 transition-all flex flex-col md:flex-row justify-between gap-4"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">
                    {tr.reference_no}
                  </span>
                  {getStatusBadge(tr.status)}
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground uppercase text-[10px] font-bold">
                      From
                    </span>
                    <span className="font-semibold">
                      {tr.source_warehouse_name}
                    </span>
                  </div>
                  <ArrowRightLeft className="h-3 w-3 text-slate-300" />
                  <div className="flex flex-col">
                    <span className="text-muted-foreground uppercase text-[10px] font-bold">
                      To
                    </span>
                    <span className="font-semibold">
                      {tr.destination_warehouse_name}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  {tr.items?.map((it: any, idx: number) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-[10px] bg-slate-100 hover:bg-slate-100"
                    >
                      Product ID: {it.product_uuid.slice(0, 8)}... (Qty:{" "}
                      {it.quantity})
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
                {tr.status === "DRAFT" && (
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleStatusAction(tr.id, "ship")}
                  >
                    <Send className="h-3.5 w-3.5 mr-2" /> Mark Shipped
                  </Button>
                )}
                {tr.status === "SHIPPED" && (
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleStatusAction(tr.id, "receive")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Mark Received
                  </Button>
                )}
                {tr.status === "RECEIVED" && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                    <CheckCircle2 className="h-3 w-3" /> Fully Synced
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
