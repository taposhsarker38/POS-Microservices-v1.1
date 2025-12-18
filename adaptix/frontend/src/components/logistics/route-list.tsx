"use client";

import { useEffect, useState } from "react";
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
import { Search } from "lucide-react";
import api from "@/lib/api";

export function RouteList() {
  const [routes, setRoutes] = useState<any[]>([]);

  const fetchRoutes = () => {
    api
      .get("/logistics/routes/")
      .then((res) => setRoutes(res.data.results || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search routes..." className="pl-8" />
        </div>
        <Button variant="outline" onClick={fetchRoutes}>
          Refresh
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Route ID</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Shipments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-24 text-muted-foreground"
                >
                  No active routes found.
                </TableCell>
              </TableRow>
            ) : (
              routes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>#{r.id}</TableCell>
                  <TableCell>{r.driver_uuid || "Unassigned"}</TableCell>
                  <TableCell>{r.vehicle || "Unassigned"}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.shipments?.length || 0}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
