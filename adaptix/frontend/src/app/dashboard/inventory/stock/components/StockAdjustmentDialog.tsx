"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { useTransactions } from "@/hooks/useInventory";
import { Stock } from "@/lib/types";
import { Plus, Minus, ArrowRightLeft } from "lucide-react";

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStock?: Stock;
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  selectedStock,
}: StockAdjustmentDialogProps) {
  const { createTransaction } = useTransactions();
  const [type, setType] = useState("adjustment_add");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) return;

    setLoading(true);
    try {
      await createTransaction({
        stock: selectedStock.id,
        type: type as any,
        quantity_change: quantity, // Backend handles sign based on type usually, or we clarify
        notes,
      });
      onOpenChange(false);
      setQuantity("");
      setNotes("");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Adjust Stock: {selectedStock?.product_name || "Unknown Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={type === "adjustment_add" ? "default" : "outline"}
                onClick={() => setType("adjustment_add")}
                className={
                  type === "adjustment_add"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : ""
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
              <Button
                type="button"
                variant={type === "adjustment_sub" ? "default" : "outline"}
                onClick={() => setType("adjustment_sub")}
                className={
                  type === "adjustment_sub" ? "bg-red-600 hover:bg-red-700" : ""
                }
              >
                <Minus className="mr-2 h-4 w-4" /> Remove
              </Button>
              <Button
                type="button"
                variant={type === "transfer_out" ? "default" : "outline"}
                onClick={() => setType("transfer_out")}
              >
                <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              step="0.001"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes / Reason</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Damaged goods, Stock take correction"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Confirm Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
