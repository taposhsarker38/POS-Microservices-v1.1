"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WarehouseClient } from "@/components/inventory/warehouse-client";
import { StockClient } from "@/components/inventory/stock-client";

export default function InventoryPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
      </div>
      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Stock Overview</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
        </TabsList>
        <TabsContent value="stock" className="space-y-4">
          <StockClient />
        </TabsContent>
        <TabsContent value="warehouses" className="space-y-4">
          <WarehouseClient />
        </TabsContent>
      </Tabs>
    </div>
  );
}
