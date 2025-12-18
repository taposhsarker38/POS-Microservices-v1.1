"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FleetList } from "@/components/logistics/fleet-list";
import { ShipmentList } from "@/components/logistics/shipment-list";
import { RouteList } from "@/components/logistics/route-list";
import { Truck, Package, Map } from "lucide-react";

export default function LogisticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Logistics & Distribution
        </h2>
      </div>

      <Tabs defaultValue="fleet" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fleet" className="flex items-center gap-2">
            <Truck className="h-4 w-4" /> Fleet
          </TabsTrigger>
          <TabsTrigger value="shipments" className="flex items-center gap-2">
            <Package className="h-4 w-4" /> Shipments
          </TabsTrigger>
          <TabsTrigger value="routes" className="flex items-center gap-2">
            <Map className="h-4 w-4" /> Routes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="space-y-4">
          <FleetList />
        </TabsContent>

        <TabsContent value="shipments" className="space-y-4">
          <ShipmentList />
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <RouteList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
