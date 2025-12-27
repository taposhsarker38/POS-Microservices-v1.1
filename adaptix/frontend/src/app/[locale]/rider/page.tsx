"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { MapPin, Package, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RiderDashboard() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        // Mock driver UUID for prototype - in real app, get from auth context
        const driverUuid = "mock-driver-uuid";
        const res = await api.get(
          `/logistics/shipping/rider/shipments/?driver_uuid=${driverUuid}`
        );
        setDeliveries(res.data || []);
      } catch (error) {
        console.error("Failed to load deliveries", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDeliveries();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Route</h1>
          <p className="text-slate-500 text-sm">
            {format(new Date(), "EEEE, MMMM do")}
          </p>
        </div>
        <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold">
          R
        </div>
      </header>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Loading route...</div>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center">
          <CheckCircle className="h-16 w-16 text-green-400 mb-4" />
          <h3 className="text-xl font-semibold text-slate-800">
            All caught up!
          </h3>
          <p className="text-slate-500">No deliveries assigned for today.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map((delivery) => (
            <Link href={`/rider/delivery/${delivery.id}`} key={delivery.id}>
              <Card className="active:scale-95 transition-transform">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge
                      variant={
                        delivery.status === "DELIVERED" ? "default" : "outline"
                      }
                      className={
                        delivery.status === "DELIVERED"
                          ? "bg-green-600"
                          : "text-blue-600 border-blue-200 bg-blue-50"
                      }
                    >
                      {delivery.status}
                    </Badge>
                    <span className="text-xs text-slate-400 font-mono">
                      {delivery.tracking_number.slice(0, 8)}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-slate-800 mb-1">
                    {delivery.customer_name}
                  </h3>

                  <div className="flex items-start gap-2 text-slate-600 text-sm mb-3">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">
                      {delivery.destination_address}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-500 border-t pt-3 mt-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {delivery.route ? "Stop #3" : "ASAP"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto py-1 px-2 text-violet-600"
                    >
                      View Details →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
