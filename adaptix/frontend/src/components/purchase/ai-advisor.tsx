"use client";

import * as React from "react";
import {
  Brain,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Info,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AISuggestion {
  id: string;
  product_uuid: string;
  suggested_quantity: number;
  estimated_out_of_stock_date: string;
  confidence_score: number;
  status: "pending" | "approved" | "ignored";
  reasoning: string;
  product_name?: string;
  product_sku?: string;
}

export const AIProcurementAdvisor: React.FC = () => {
  const [suggestions, setSuggestions] = React.useState<AISuggestion[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [vendors, setVendors] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [selectedSuggestion, setSelectedSuggestion] =
    React.useState<AISuggestion | null>(null);
  const [isConvertOpen, setIsConvertOpen] = React.useState(false);
  const [selectedVendorId, setSelectedVendorId] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [suggRes, prodRes, vendRes] = await Promise.all([
        api.get("/purchase/ai-suggestions/?status=pending"),
        api.get("/product/products/"),
        api.get("/purchase/vendors/"),
      ]);

      const prods = prodRes.data;
      const suggs = suggRes.data.map((s: any) => {
        const p = prods.find((item: any) => item.id === s.product_uuid) || {};
        return {
          ...s,
          product_name: p.name || "Unknown Product",
          product_sku: p.sku || "N/A",
        };
      });

      setSuggestions(suggs);
      setProducts(prods);
      setVendors(vendRes.data);
    } catch (error) {
      console.error("Failed to fetch AI data", error);
      toast.error("Failed to load AI suggestions");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleIgnore = async (id: string) => {
    try {
      await api.patch(`/purchase/ai-suggestions/${id}/`, { status: "ignored" });
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      toast.info("Suggestion ignored");
    } catch (error) {
      toast.error("Failed to ignore suggestion");
    }
  };

  const handleConvert = async () => {
    if (!selectedSuggestion || !selectedVendorId) return;

    try {
      setSubmitting(true);
      const res = await api.post(
        `/purchase/ai-suggestions/${selectedSuggestion.id}/convert-to-po/`,
        {
          vendor_id: selectedVendorId,
        }
      );

      toast.success("Converted to Draft PO!");
      setSuggestions((prev) =>
        prev.filter((s) => s.id !== selectedSuggestion.id)
      );
      setIsConvertOpen(false);
      setSelectedSuggestion(null);
      setSelectedVendorId("");
    } catch (error) {
      toast.error("Failed to convert suggestion");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        AI is thinking...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 flex flex-col md:flex-row gap-6 items-start">
        <div className="bg-primary/10 p-4 rounded-full">
          <Brain className="h-8 w-8 text-primary animate-pulse" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">AI Procurement Advisor</h2>
          <p className="text-muted-foreground">
            Our AI has analyzed sales velocity, seasonal trends, and current
            stock levels. Review these items to prevent future stockouts.
          </p>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4 opacity-20" />
          <h3 className="text-lg font-medium">Inventory is healthy</h3>
          <p className="text-muted-foreground">
            No critical procurement risks detected at this time.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {suggestions.map((s) => (
            <Card
              key={s.id}
              className="overflow-hidden border-l-4 border-l-primary"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{s.product_name}</CardTitle>
                    <CardDescription>{s.product_sku}</CardDescription>
                  </div>
                  <Badge variant="outline" className="flex gap-1 items-center">
                    <TrendingUp className="h-3 w-3" />
                    {Math.round(s.confidence_score * 100)}% Confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 p-3 bg-secondary/20 rounded-lg text-sm">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">
                      Suggested Qty
                    </Label>
                    <div className="text-xl font-bold">
                      {s.suggested_quantity}
                    </div>
                  </div>
                  <Separator orientation="vertical" className="h-10" />
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">
                      Est. Stockout Date
                    </Label>
                    <div className="text-xl font-bold text-red-600">
                      {format(
                        new Date(s.estimated_out_of_stock_date),
                        "MMM dd"
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 items-start text-sm bg-blue-50/50 p-3 rounded-lg border border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/20">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                  <span className="text-blue-700 dark:text-blue-300 italic">
                    "{s.reasoning}"
                  </span>
                </div>
              </CardContent>
              <CardFooter className="bg-secondary/5 border-t flex justify-end gap-2 p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleIgnore(s.id)}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Ignore
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedSuggestion(s);
                    setIsConvertOpen(true);
                  }}
                >
                  <ArrowRight className="h-4 w-4 mr-2" /> Convert to PO
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Convert Dialog */}
      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve AI Suggestion</DialogTitle>
            <DialogDescription>
              This will create a Draft Purchase Order for{" "}
              {selectedSuggestion?.product_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Vendor</Label>
              <Select
                onValueChange={setSelectedVendorId}
                value={selectedVendorId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSuggestion && (
              <div className="p-3 border rounded-md bg-secondary/10">
                <div className="text-sm font-medium">Auto-filled Item:</div>
                <div className="text-xs text-muted-foreground">
                  {selectedSuggestion.product_name} x{" "}
                  {selectedSuggestion.suggested_quantity}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedVendorId || submitting}
              onClick={handleConvert}
            >
              {submitting ? "Creating..." : "Create Draft PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
