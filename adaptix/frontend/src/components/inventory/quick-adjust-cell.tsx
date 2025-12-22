"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface QuickAdjustCellProps {
  stockId: string | number;
  initialQuantity: number;
  onUpdate?: (newQty: number) => void;
}

export function QuickAdjustCell({
  stockId,
  initialQuantity,
  onUpdate,
}: QuickAdjustCellProps) {
  const [quantity, setQuantity] = React.useState(initialQuantity);
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<"idle" | "success" | "error">(
    "idle"
  );

  React.useEffect(() => {
    setQuantity(initialQuantity);
  }, [initialQuantity]);

  const handleAdjust = async (delta: number) => {
    const newQty = quantity + delta;
    if (newQty < 0) return;

    setLoading(true);
    setStatus("idle");
    // Optimistic update
    setQuantity(newQty);

    try {
      await api.patch(`/inventory/stocks/${stockId}/`, {
        quantity: newQty,
      });
      setStatus("success");
      onUpdate?.(newQty);

      // Reset status after a brief flash
      setTimeout(() => setStatus("idle"), 1000);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update stock");
      // Revert
      setQuantity(quantity);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-6 w-6"
        onClick={() => handleAdjust(-1)}
        disabled={loading || quantity <= 0}
      >
        <Minus className="h-3 w-3" />
      </Button>

      <div
        className={cn(
          "w-12 text-center text-sm font-medium transition-colors duration-300 rounded",
          status === "success" && "text-emerald-600 bg-emerald-50",
          status === "error" && "text-red-600 bg-red-50"
        )}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin mx-auto" />
        ) : (
          quantity
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        className="h-6 w-6"
        onClick={() => handleAdjust(1)}
        disabled={loading}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
