"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BOMList } from "./bom-list";
import { ProductionOrderList } from "./production-order-list";
import { WorkCenterList } from "./work-center-list";
import { OperationList } from "./operation-list";
import { ShopFloorControl } from "./shop-floor-control";

import { UnitTracking } from "./unit-tracking";

export function ManufacturingClient() {
  return (
    <Tabs defaultValue="production-orders" className="space-y-4">
      <TabsList>
        <TabsTrigger value="production-orders">Production Orders</TabsTrigger>
        <TabsTrigger value="unit-tracking">Unit Tracking & Reports</TabsTrigger>
        <TabsTrigger value="shop-floor">Shop Floor / Workers</TabsTrigger>
        <TabsTrigger value="operations">Operations</TabsTrigger>
        <TabsTrigger value="boms">Bills of Material (BOM)</TabsTrigger>
        <TabsTrigger value="work-centers">Work Centers</TabsTrigger>
      </TabsList>
      <TabsContent value="production-orders" className="space-y-4">
        <ProductionOrderList />
      </TabsContent>
      <TabsContent value="unit-tracking" className="space-y-4">
        <UnitTracking />
      </TabsContent>
      <TabsContent value="shop-floor" className="space-y-4">
        <ShopFloorControl />
      </TabsContent>
      <TabsContent value="operations" className="space-y-4">
        <OperationList />
      </TabsContent>
      <TabsContent value="boms" className="space-y-4">
        <BOMList />
      </TabsContent>
      <TabsContent value="work-centers" className="space-y-4">
        <WorkCenterList />
      </TabsContent>
    </Tabs>
  );
}
