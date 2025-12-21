"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StockoutChart } from "./stockout-chart";
import api from "@/lib/api";
import { Loader2, AlertTriangle, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StockoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productUuid?: string; // If null, we might show a list of high-risk items first
}

interface PredictionData {
  product_uuid: string;
  current_stock: number;
  risk_score: number;
  estimated_stockout_date: string;
  projection: any[];
}

export function StockoutModal({ open, onOpenChange }: StockoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PredictionData | null>(null);
  // Ideally we fetch a list of high risk items first, for now hardcoding or fetching first high risk
  // For the demo "Deep Dive", let's assume we fetch the highest risk product

  useEffect(() => {
    if (open) {
      fetchHighestRisk();
    }
  }, [open]);

  const fetchHighestRisk = async () => {
    setLoading(true);
    try {
      // 1. Get high risk items list
      const listRes = await api.get("/intelligence/inventory/");
      const highRisk = listRes.data.results.find(
        (i: any) => i.stockout_risk_score > 50
      );

      if (highRisk) {
        const detailsRes = await api.get(
          "/intelligence/inventory/prediction-details/",
          {
            params: { product_uuid: highRisk.product_uuid },
          }
        );
        setData(detailsRes.data);
      }
    } catch (e) {
      console.error("Failed to fetch stockout details", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Stockout Prediction Analysis
          </DialogTitle>
          <DialogDescription>
            AI-driven forecast of inventory depletion based on recent sales
            velocity.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                <p className="text-xs text-muted-foreground font-medium uppercase">
                  Current Stock
                </p>
                <p className="text-2xl font-bold">{data.current_stock}</p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium uppercase">
                  Risk Score
                </p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {data.risk_score}/100
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                <p className="text-xs text-muted-foreground font-medium uppercase">
                  Est. Stockout
                </p>
                <p className="text-2xl font-bold">
                  {data.estimated_stockout_date || "N/A"}
                </p>
              </div>
            </div>

            {/* Chart */}
            <div className="border rounded-lg p-4">
              <h4 className="text-sm font-semibold mb-2">
                Inventory Depletion Curve
              </h4>
              <StockoutChart data={data.projection} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button variant="default">Create PO Now</Button>
            </div>
          </div>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
            <p>No high-risk items detected.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
