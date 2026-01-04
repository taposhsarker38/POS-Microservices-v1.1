"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import api from "@/lib/api";
import { Loader2, AlertTriangle, TrendingDown, DollarSign } from "lucide-react";

export function WorkflowAnalytics() {
  const [loading, setLoading] = useState(true);
  const [defectData, setDefectData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      // Mocking data retrieval for the demo as the backend endpoints are being finalized
      // In production, these calls would be to /reporting/workflow-metrics/

      const defects = [
        { name: "Cooling", value: 35, color: "#ef4444" },
        { name: "Body/Paint", value: 25, color: "#f59e0b" },
        { name: "Electrical", value: 20, color: "#3b82f6" },
        { name: "Other", value: 10, color: "#10b981" },
      ];

      const payments = [
        { name: "Paid", value: 450000, fill: "#10b981" },
        { name: "Remaining", value: 250000, fill: "#e5e7eb" },
      ];

      setDefectData(defects);
      setPaymentData(payments);
    } catch (e) {
      console.error("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
      {/* Defect Categories Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Defect Distribution</CardTitle>
              <CardDescription>Breakdown by major categories</CardDescription>
            </div>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={defectData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {defectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Payment vs Balance Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Lifecycle</CardTitle>
              <CardDescription>
                Paid vs. Remaining Balance (Aggregate)
              </CardDescription>
            </div>
            <DollarSign className="h-4 w-4 text-green-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-col space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Collection Efficiency:
              </span>
              <span className="font-bold text-green-600">64%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div className="h-2 w-[64%] rounded-full bg-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
