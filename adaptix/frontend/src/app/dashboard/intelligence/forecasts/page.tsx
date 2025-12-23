"use client";

import { useEffect, useState } from "react";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Package,
  Calendar,
  ChevronRight,
  RefreshCcw,
  Search,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/api";
import { toast } from "sonner";
import { useWebSockets } from "@/hooks/useWebSockets";

interface ForecastData {
  product_uuid: string;
  product_name: string;
  forecast_date: string;
  predicted_quantity: number;
  confidence_score: number;
}

interface SalesHistory {
  date: string;
  quantity_sold: number;
}

export default function ForecastingDashboard() {
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<ForecastData[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const { socket } = useWebSockets();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/intelligence/forecast/predictions/");
      setPredictions(res.data);

      if (res.data.length > 0 && !selectedProduct) {
        setSelectedProduct(res.data[0].product_uuid);
      }
    } catch (error) {
      console.error("Failed to fetch forecasts", error);
      toast.error("Could not load forecasting data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadChartData(selectedProduct);
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (socket) {
      socket.on("forecast.completed", () => {
        toast.success("Forecast generation completed. Refreshing data...");
        fetchData();
        if (selectedProduct) {
          loadChartData(selectedProduct);
        }
      });
    }
    return () => {
      if (socket) socket.off("forecast.completed");
    };
  }, [socket, selectedProduct]);

  const loadChartData = async (productId: string) => {
    try {
      // Get History (last 14 days) and Predictions (next 7 days)
      const [historyRes, predRes] = await Promise.all([
        api.get(`/intelligence/forecast/history/?product_uuid=${productId}`),
        api.get(
          `/intelligence/forecast/predictions/?product_uuid=${productId}`
        ),
      ]);

      const history = historyRes.data.map((h: any) => ({
        date: h.date,
        actual: parseFloat(h.quantity_sold),
        type: "history",
      }));

      const preds = predRes.data.map((p: any) => ({
        date: p.forecast_date,
        forecast: parseFloat(p.predicted_quantity),
        type: "forecast",
      }));

      // Merge and sort
      const merged = [...history, ...preds].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setChartData(merged);
    } catch (error) {
      toast.error("Failed to load chart data");
    }
  };

  const syncData = async () => {
    if (syncing) return;
    try {
      setSyncing(true);
      toast.info("Triggering data sync and forecast generation...");
      await api.post("/intelligence/forecast/predictions/trigger/");
      toast.success("Job started. Please refresh in a minute.");
    } catch (error) {
      toast.error("Failed to trigger sync");
    } finally {
      setSyncing(false);
    }
  };

  const filteredPredictions = Array.from(
    new Set(predictions.map((p) => p.product_uuid))
  )
    .map((uuid) => predictions.find((p) => p.product_uuid === uuid)!)
    .filter((p) => p.product_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Brain className="text-violet-600" />
            Demand Forecasting
          </h1>
          <p className="text-slate-500">
            AI-powered inventory predictions and stock-out prevention.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            onClick={syncData}
            disabled={syncing}
            className="bg-violet-600 hover:bg-violet-700 gap-2"
          >
            <TrendingUp
              className={syncing ? "animate-spin h-4 w-4" : "h-4 w-4"}
            />
            {syncing ? "Generating..." : "Generate Forecasts"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Product List Sidebar */}
        <Card className="md:col-span-1 shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Tracked Products</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {loading ? (
                <div className="p-4 text-center text-slate-400">Loading...</div>
              ) : filteredPredictions.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  No data found
                </div>
              ) : (
                filteredPredictions.map((p) => (
                  <div
                    key={p.product_uuid}
                    onClick={() => setSelectedProduct(p.product_uuid)}
                    className={cn(
                      "p-4 border-b border-slate-100 cursor-pointer transition-colors flex items-center justify-between group",
                      selectedProduct === p.product_uuid
                        ? "bg-violet-50"
                        : "hover:bg-slate-50"
                    )}
                  >
                    <div>
                      <p className="font-semibold text-sm line-clamp-1">
                        {p.product_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={
                            p.confidence_score > 0.6 ? "secondary" : "outline"
                          }
                          className="text-[10px] px-1 h-4"
                        >
                          {Math.round(p.confidence_score * 100)}% Conf.
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-slate-300 group-hover:text-violet-500 transition-colors",
                        selectedProduct === p.product_uuid &&
                          "text-violet-600 translate-x-1"
                      )}
                    />
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chart View */}
        <div className="md:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-violet-100 rounded-lg">
                  <TrendingUp className="text-violet-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">
                    Predicted Demand (7d)
                  </p>
                  <p className="text-2xl font-bold">
                    {chartData
                      .filter((d) => d.type === "forecast")
                      .reduce((sum, d) => sum + d.forecast, 0)
                      .toFixed(1)}{" "}
                    items
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <AlertTriangle className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Risk Level</p>
                  <Badge className="bg-amber-100 text-amber-700 border-none">
                    Medium
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Current Stock</p>
                  <p className="text-2xl font-bold">--</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Demand Trend Analysis</CardTitle>
              <CardDescription>
                Historical sales vs Predicted demand for the selected product.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorActual"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.1}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8b5cf6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorForecast"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#ec4899"
                          stopOpacity={0.1}
                        />
                        <stop
                          offset="95%"
                          stopColor="#ec4899"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(d) =>
                        new Date(d).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      labelFormatter={(label) =>
                        new Date(label).toLocaleDateString(undefined, {
                          dateStyle: "long",
                        })
                      }
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      name="Actual Sales"
                      fillOpacity={1}
                      fill="url(#colorActual)"
                    />
                    <Area
                      type="monotone"
                      dataKey="forecast"
                      stroke="#ec4899"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Forecasted Demand"
                      fillOpacity={1}
                      fill="url(#colorForecast)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
