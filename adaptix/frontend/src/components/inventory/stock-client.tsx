"use client";

import * as React from "react";
import { ArrowUpDown, Search, ScanLine, Filter } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QuickAdjustCell } from "@/components/inventory/quick-adjust-cell";
import { StockAdjustmentDialog } from "@/components/inventory/stock-adjustment-dialog";
import { cn } from "@/lib/utils";

export const StockClient: React.FC = () => {
  const [data, setData] = React.useState<any[]>([]);
  const [warehouses, setWarehouses] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  const [openAdjust, setOpenAdjust] = React.useState(false);
  const [activeWarehouseId, setActiveWarehouseId] =
    React.useState<string>("all");

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcut for scanner focus
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);

      // Fetch filters metadata
      const [whRes, prodRes] = await Promise.all([
        api.get("/inventory/warehouses/"),
        api.get("/product/products/"),
      ]);

      const whData = whRes.data;
      const whs = Array.isArray(whData)
        ? whData
        : whData.results || whData.data || [];
      setWarehouses(whs);

      const prodData = prodRes.data;
      const prods = Array.isArray(prodData)
        ? prodData
        : prodData.results || prodData.data || [];
      setProducts(prods);

      // Build query
      const params = new URLSearchParams();
      if (activeWarehouseId !== "all") {
        const wh = whs.find((w: any) => String(w.id) === activeWarehouseId);
        if (wh) params.append("warehouse", wh.id);
      }
      // Note: We don't filter by product UUID on the server here to allow client-side fuzzy search
      // unless the dataset is huge. For now, we fetch all and filter client-side for "scanner" feel.

      const res = await api.get(`/inventory/stocks/?${params.toString()}`);
      const stockData = res.data;
      const items = Array.isArray(stockData)
        ? stockData
        : stockData.results || stockData.data || [];

      const enriched = items.map((item: any) => {
        const prod = prods.find((p: any) => p.id === item.product_uuid) || {};
        const wh = whs.find((w: any) => w.id === item.warehouse) || {};
        return {
          ...item,
          product_name: prod.name || item.product_uuid,
          product_sku: prod.sku || "N/A",
          warehouse_name: wh.name || item.warehouse,
          reorder_level: Number(prod.reorder_level || item.reorder_level || 10),
        };
      });

      setData(enriched);
    } catch (error) {
      console.error("Failed to fetch stock", error);
      toast.error("Failed to load stock data");
    } finally {
      setLoading(false);
    }
  }, [activeWarehouseId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side filtering for immediate "Scanner" feel
  const filteredData = React.useMemo(() => {
    if (!searchQuery) return data;
    const lower = searchQuery.toLowerCase();
    return data.filter(
      (item) =>
        item.product_name.toLowerCase().includes(lower) ||
        item.product_sku.toLowerCase().includes(lower)
    );
  }, [data, searchQuery]);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "product_name",
      header: "Product",
      cell: ({ row }) => {
        const isLowStock = row.original.quantity <= row.original.reorder_level;
        return (
          <div className="flex flex-col">
            <span className={cn("font-medium", isLowStock && "text-red-600")}>
              {row.original.product_name}
            </span>
            <span className="text-xs text-muted-foreground">
              {row.original.product_sku}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "warehouse_name",
      header: "Warehouse",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.warehouse_name}
        </span>
      ),
    },
    {
      accessorKey: "quantity",
      header: "Stock Level",
      cell: ({ row }) => (
        <QuickAdjustCell
          stockId={row.original.id}
          initialQuantity={row.original.quantity}
          onUpdate={(newQty) => {
            // Update local data reference to avoid full refetch jank
            row.original.quantity = newQty;
          }}
        />
      ),
    },
    {
      accessorKey: "avg_cost",
      header: "Value",
      cell: ({ row }) => (
        <span className="text-xs font-mono">${row.original.avg_cost}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Smart Command Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="w-full md:w-1/2 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Scan SKU or Search Product... (Cmd+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-lg"
          />
          <div className="absolute right-3 top-3 hidden md:flex items-center gap-1 opacity-50">
            <ScanLine className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0">
          <Badge
            variant={activeWarehouseId === "all" ? "default" : "outline"}
            className="cursor-pointer h-8 px-3"
            onClick={() => setActiveWarehouseId("all")}
          >
            All Warehouses
          </Badge>
          {warehouses.map((w) => (
            <Badge
              key={w.id}
              variant={
                String(w.id) === activeWarehouseId ? "default" : "outline"
              }
              className="cursor-pointer h-8 px-3 whitespace-nowrap"
              onClick={() => setActiveWarehouseId(String(w.id))}
            >
              {w.name}
            </Badge>
          ))}
        </div>

        <div className="ml-auto">
          <Button onClick={() => setOpenAdjust(true)} size="sm">
            <ArrowUpDown className="mr-2 h-4 w-4" /> Bulk Adjust
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <DataTable
          columns={columns}
          data={filteredData}
          searchKey="product_name" // Internal table search not used, we filter externally
          hideSearch={true} // Hide internal search
        />
      </div>

      <StockAdjustmentDialog
        warehouses={warehouses}
        products={products}
        isOpen={openAdjust}
        onClose={() => setOpenAdjust(false)}
        onSuccess={fetchData}
      />
    </div>
  );
};
