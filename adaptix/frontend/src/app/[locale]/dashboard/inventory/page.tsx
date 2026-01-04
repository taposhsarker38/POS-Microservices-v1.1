"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WarehouseClient } from "@/components/inventory/warehouse-client";
import { StockClient } from "@/components/inventory/stock-client";
import { StockTransferManagement } from "@/components/inventory/stock-transfer-management";
import { useStockTransactions } from "@/hooks/useInventory";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function InventoryPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
      </div>
      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Stock Overview</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="ledger">Stock Ledger</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
        </TabsList>
        <TabsContent value="stock" className="space-y-4">
          <StockClient />
        </TabsContent>
        <TabsContent value="transfers" className="space-y-4">
          <StockTransferManagement />
        </TabsContent>
        <TabsContent value="ledger" className="space-y-4">
          <StockLedgerTab />
        </TabsContent>
        <TabsContent value="warehouses" className="space-y-4">
          <WarehouseClient />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StockLedgerTab() {
  const { data: transactions, isLoading } = useStockTransactions();

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="p-3 text-left font-semibold">Date / Time</th>
            <th className="p-3 text-left font-semibold">Type</th>
            <th className="p-3 text-right font-semibold">Qty Change</th>
            <th className="p-3 text-right font-semibold">Balance</th>
            <th className="p-3 text-left font-semibold">Source / Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            <tr>
              <td colSpan={5} className="p-8 text-center animate-pulse">
                Loading logs...
              </td>
            </tr>
          ) : transactions?.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-8 text-center text-muted-foreground">
                No transaction history found.
              </td>
            </tr>
          ) : (
            transactions
              ?.sort(
                (a: any, b: any) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )
              .map((tx: any) => (
                <tr
                  key={tx.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase",
                        tx.type === "in"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : tx.type === "out"
                          ? "bg-orange-50 text-orange-700 border-orange-200"
                          : "bg-slate-50"
                      )}
                    >
                      {tx.type}
                    </Badge>
                  </td>
                  <td
                    className={`p-3 text-right font-mono font-bold ${
                      parseFloat(tx.quantity_change) > 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {parseFloat(tx.quantity_change) > 0 ? "+" : ""}
                    {tx.quantity_change}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {tx.balance_after}
                  </td>
                  <td className="p-3 text-xs italic">{tx.notes || "-"}</td>
                </tr>
              ))
          )}
        </tbody>
      </table>
    </div>
  );
}
