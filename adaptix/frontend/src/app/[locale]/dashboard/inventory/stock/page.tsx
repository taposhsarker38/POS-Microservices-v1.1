"use client";

import { useStock } from "@/hooks/useInventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Package, AlertTriangle, FileText } from "lucide-react";
import { useState } from "react";
import { StockAdjustmentDialog } from "./components/StockAdjustmentDialog";
import { Stock } from "@/lib/types";

export default function StockPage() {
  const { data: stocks, isLoading } = useStock();
  const [search, setSearch] = useState("");
  const [selectedStock, setSelectedStock] = useState<Stock | undefined>(
    undefined
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredStocks = stocks?.filter((item) =>
    (item.product_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleAdjust = (stock: Stock) => {
    setSelectedStock(stock);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400">
            Inventory Stock
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time stock levels across all warehouses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" /> Stock Report
          </Button>
          <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
            <Package className="mr-2 h-4 w-4" /> Receive Stock
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-950">
            <TableRow>
              <TableHead className="font-semibold">Product</TableHead>
              <TableHead className="font-semibold">Warehouse</TableHead>
              <TableHead className="text-right font-semibold">
                Available Qty
              </TableHead>
              <TableHead className="text-right font-semibold">
                Avg Cost
              </TableHead>
              <TableHead className="text-center font-semibold">
                Status
              </TableHead>
              <TableHead className="text-right font-semibold">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-4 w-12 ml-auto bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-4 w-16 ml-auto bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-6 w-20 mx-auto bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-8 w-20 ml-auto bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredStocks?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No stock records found
                </TableCell>
              </TableRow>
            ) : (
              filteredStocks?.map((item) => {
                const qty = parseFloat(item.quantity);
                const reorder = parseFloat(item.reorder_level);
                const isLow = qty <= reorder;

                return (
                  <TableRow
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                      {item.product_name || item.product_uuid}
                    </TableCell>
                    <TableCell>Main Warehouse</TableCell>
                    <TableCell className="text-right font-bold font-mono">
                      {qty.toFixed(0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      ${item.avg_cost}
                    </TableCell>
                    <TableCell className="text-center">
                      {isLow ? (
                        <Badge
                          variant="destructive"
                          className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200"
                        >
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAdjust(item)}
                        className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                      >
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <StockAdjustmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedStock={selectedStock}
      />
    </div>
  );
}
