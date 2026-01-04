"use client";

import * as React from "react";
import {
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  Clock,
  Search,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import api from "@/lib/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ShipmentTracker() {
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [shipment, setShipment] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trackingNumber) return;

    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/logistics/shipments/`, {
        params: { tracking_number: trackingNumber },
      });

      const results = response.data.results || response.data;
      if (Array.isArray(results) && results.length > 0) {
        setShipment(results[0]);
      } else if (results && !Array.isArray(results) && results.id) {
        setShipment(results);
      } else {
        setError("Shipment not found. Please check your tracking number.");
        setShipment(null);
      }
    } catch (err) {
      setError("Failed to fetch tracking information.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-700";
      case "SHIPPED":
        return "bg-blue-100 text-blue-700";
      case "OUT_FOR_DELIVERY":
        return "bg-orange-100 text-orange-700";
      case "PENDING":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const steps = [
    { label: "Order Processed", icon: Package, status: "PENDING" },
    { label: "Shipped", icon: Truck, status: "SHIPPED" },
    { label: "Out for Delivery", icon: Navigation, status: "OUT_FOR_DELIVERY" },
    { label: "Delivered", icon: CheckCircle2, status: "DELIVERED" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 p-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Track Your Shipment
        </h1>
        <p className="text-muted-foreground italic">
          Enter your tracking number to get real-time updates.
        </p>
      </div>

      <form onSubmit={handleTrack} className="flex gap-2">
        <Input
          placeholder="Enter Tracking Number (e.g. uuid)..."
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          className="h-12 shadow-sm"
        />
        <Button
          size="lg"
          className="h-12 px-8 bg-violet-600"
          disabled={loading}
        >
          {loading ? "Searching..." : "Track"}
        </Button>
      </form>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 border border-red-100 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {shipment && (
        <Card className="border-t-4 border-t-violet-500 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Shipment Status</CardTitle>
              <CardDescription>
                Tracking ID: {shipment.tracking_number}
              </CardDescription>
            </div>
            <Badge className={getStatusColor(shipment.status)}>
              {shipment.status.replace(/_/g, " ")}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Stepper UI */}
            <div className="relative flex justify-between">
              {/* Progress Line */}
              <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-100 -z-10" />

              {steps.map((step, idx) => {
                const isCompleted =
                  steps.findIndex((s) => s.status === shipment.status) >= idx;
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center gap-2 bg-white px-2"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isCompleted
                          ? "bg-violet-600 border-violet-600 text-white shadow-md"
                          : "bg-white border-slate-200 text-slate-400"
                      }`}
                    >
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        isCompleted ? "text-violet-600" : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Delivery Address
                </p>
                <p className="font-semibold">{shipment.destination_address}</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Last Update
                </p>
                <p className="font-semibold">
                  {format(new Date(shipment.updated_at), "PPP p")}
                </p>
              </div>
            </div>

            {shipment.status === "DELIVERED" && (
              <div className="bg-green-50 p-4 rounded-xl flex items-center gap-4 border border-green-100">
                <div className="bg-green-500 p-2 rounded-full">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-green-800 font-bold text-sm">
                    Delivered Securely
                  </p>
                  <p className="text-green-700 text-xs">
                    Proof of delivery verified on our system.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Navigation(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}

function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
