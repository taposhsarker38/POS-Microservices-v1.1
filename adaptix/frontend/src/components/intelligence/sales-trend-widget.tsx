"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface SalesSummary {
  total_sales_30d: number;
  growth_rate: number;
  trend_direction: "up" | "down";
}

interface SparklinePoint {
  date: string;
  sales: number;
}

interface TopMover {
  name: string;
  change: number;
  trend: "up" | "down";
}

import { Skeleton } from "@/components/ui/skeleton";

export function SalesTrendWidget() {
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [sparkline, setSparkline] = useState<SparklinePoint[]>([]);
  const [movers, setMovers] = useState<TopMover[]>([]);

  useEffect(() => {
    api
      .get("/intelligence/sales-trends/")
      .then((res) => {
        if (res.data.status === "success") {
          setSummary(res.data.summary);
          setSparkline(res.data.sparkline);
          setMovers(res.data.top_movers);
        }
      })
      .catch((err) => console.error("Failed to fetch sales trends", err));
  }, []);

  if (!summary) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-4">
        <Skeleton className="col-span-4 h-72" />
        <Skeleton className="col-span-3 h-72" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-4">
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle className="flex justify-between items-center text-sm font-medium">
            <span>Sales Velocity (Last 7 Days)</span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold flex items-center">
            ${summary.total_sales_30d.toLocaleString()}
            <span
              className={`ml-2 text-sm flex items-center ${
                summary.trend_direction === "up"
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {summary.trend_direction === "up" ? (
                <ArrowUpRight className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownRight className="h-4 w-4 mr-1" />
              )}
              {summary.growth_rate}% vs last month
            </span>
          </div>
          <div className="h-[200px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkline}>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <span className="font-bold text-muted-foreground">
                              {payload[0].payload.date}
                            </span>
                            <span className="font-bold">
                              ${payload[0].value}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-3">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            🔥 Top Movers (Trending Now)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {movers.map((item, idx) => (
              <div key={idx} className="flex items-center">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    Category: Food (Est.)
                  </p>
                </div>
                <div
                  className={`font-mono text-sm font-bold ${
                    item.trend === "up" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {item.trend === "up" ? "+" : ""}
                  {item.change}%
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            💡 <strong>Insight:</strong> {movers[0]?.name} is growing faster
            than any other product this week. Consider stocking up for the
            weekend.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
