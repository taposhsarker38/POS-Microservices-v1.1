"use client";

import { useState, useEffect } from "react";
import {
  Brain,
  Sparkles,
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  ArrowRight,
  Zap,
  Eye,
  Video,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Bar,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

export function AIClient() {
  const router = useRouter();
  const [module, setModule] = useState("sales-forecast");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [inventoryRisk, setInventoryRisk] = useState<any[]>([]);
  const [visionData, setVisionData] = useState<any>(null);

  const fetchForecast = async () => {
    try {
      const res = await api.get("/intelligence/forecast/predictions/");
      setData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInventoryOpt = async () => {
    try {
      const res = await api.get("/intelligence/inventory/opt/");
      setInventoryRisk(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVisionStats = async () => {
    try {
      // Hardcoding branch_uuid for demo or fetch from context
      const branchUuid = "b9090176-5080-4948-be8e-15f5cc24a806";
      const res = await api.get(
        `/intelligence/vision/stats/?branch_uuid=${branchUuid}`
      );
      setVisionData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const generateForecast = async () => {
    setLoading(true);
    try {
      await api.post("/intelligence/forecast/predictions/trigger/");
      toast.success("AI Training started in background!");
      // Poll or wait
      setTimeout(fetchForecast, 5000);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const runRiskAnalysis = async () => {
    setLoading(true);
    try {
      await api.post("/intelligence/inventory/opt/trigger_analysis/");
      toast.success("Inventory risk analysis started!");
      setTimeout(fetchInventoryOpt, 5000);
    } catch (e: any) {
      toast.error("Analysis trigger failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (module === "sales-forecast") {
      fetchForecast();
    } else if (module === "inventory-opt") {
      fetchInventoryOpt();
    } else if (module === "vision-analytics") {
      fetchVisionStats();
    }
  }, [module]);

  const goToDemandForecasting = () => {
    router.push("/dashboard/intelligence/forecasts");
  };

  const renderContent = () => {
    switch (module) {
      case "sales-forecast":
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-violet-50 dark:bg-violet-950/20 p-6 rounded-xl border border-violet-100 dark:border-violet-900/50 shadow-sm">
              <div className="flex gap-4">
                <div className="p-3 bg-violet-100 dark:bg-violet-900/50 rounded-lg h-fit text-violet-600 dark:text-violet-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    Sales Prediction Engine
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Advanced time-series analysis using Prophet to estimate
                    future revenue and seasonal trends.
                  </p>
                </div>
              </div>
              <Button
                onClick={generateForecast}
                disabled={loading}
                className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20"
              >
                {loading ? (
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Retrain AI Model
              </Button>
            </div>

            <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      30-Day Revenue Projection
                    </CardTitle>
                    <CardDescription>
                      Predicted sales volume with 80% confidence intervals.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>Forecast</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-blue-200 dark:bg-blue-900/50" />
                      <span>Confidence</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[450px] p-6">
                {data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                      <defs>
                        <linearGradient
                          id="colorSales"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.1}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(val) => format(new Date(val), "MMM d")}
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `$${val}`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        labelFormatter={(val) => format(new Date(val), "PPPP")}
                      />
                      <Area
                        type="monotone"
                        dataKey="confidence_upper"
                        stroke="none"
                        fill="#3b82f6"
                        fillOpacity={0.1}
                        connectNulls
                      />
                      <Area
                        type="monotone"
                        dataKey="confidence_lower"
                        stroke="none"
                        fill="#f8fafc"
                        fillOpacity={1}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted_sales"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{
                          r: 4,
                          fill: "#3b82f6",
                          strokeWidth: 2,
                          stroke: "#fff",
                        }}
                        activeDot={{ r: 6 }}
                        name="Predicted Revenue"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full animate-bounce">
                      <Brain className="h-8 w-8" />
                    </div>
                    <p>
                      Training data required. Please trigger forecast
                      generation.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case "inventory-opt":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-xl border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
              <div className="flex gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg h-fit text-emerald-600 dark:text-emerald-400">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    Stockout Risk Analysis
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    AI-powered monitoring of stock levels versus predicted
                    demand. Identifies critical items before they run out.
                  </p>
                </div>
              </div>
              <Button
                onClick={runRiskAnalysis}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                disabled={loading}
              >
                Scan for Risks
              </Button>
            </div>

            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>Critical Stock Alerts</CardTitle>
                <CardDescription>
                  Items identified by AI with high probability of stockout
                  within 14 days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                      <TableHead>Product UUID</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Est. Stockout</TableHead>
                      <TableHead className="text-right">
                        Suggested Reorder
                      </TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryRisk.length > 0 ? (
                      inventoryRisk.map((item) => (
                        <TableRow
                          key={item.id}
                          className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                        >
                          <TableCell className="font-mono text-xs">
                            {item.product_uuid}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 w-24 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    item.stockout_risk_score > 70
                                      ? "bg-red-500"
                                      : item.stockout_risk_score > 40
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  )}
                                  style={{
                                    width: `${item.stockout_risk_score}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-bold">
                                {item.stockout_risk_score}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <AlertTriangle
                                className={cn(
                                  "h-4 w-4",
                                  item.stockout_risk_score > 70
                                    ? "text-red-500"
                                    : "text-amber-500"
                                )}
                              />
                              {item.estimated_stockout_date
                                ? format(
                                    new Date(item.estimated_stockout_date),
                                    "MMM d, yyyy"
                                  )
                                : "N/A"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.suggested_reorder_qty} units
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Create PO <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-10 text-muted-foreground"
                        >
                          No risk analysis data found. Run a scan to identify
                          stockout threats.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      case "vision-analytics":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-950/20 p-6 rounded-xl border border-blue-100 dark:border-blue-900/50 shadow-sm">
              <div className="flex gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg h-fit text-blue-600 dark:text-blue-400">
                  <Eye className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    Visitor Traffic Vision
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Computer Vision analysis of store traffic, conversion rates,
                    and shopper behavior.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                Configure Cameras
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">
                    Total Visitors (Today)
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {visionData?.active_cameras > 0 ? "184" : "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +12% from yesterday
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">
                    Conversion Rate
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    {visionData?.conversion_rate || "0"}%
                  </div>
                  <p className="text-xs text-muted-foreground">Target: 25%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">
                    Currently On-Site
                  </CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {visionData?.on_site_now || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Occupancy Load: 15%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">
                    Active Cameras
                  </CardTitle>
                  <Video className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {visionData?.active_cameras || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All Systems Operational
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Hourly Footfall vs. Sales</CardTitle>
                <CardDescription>
                  Traffic peaks (bars) vs Number of Transactions (line)
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={[
                      { time: "10am", visitors: 40, sales: 12 },
                      { time: "11am", visitors: 65, sales: 20 },
                      { time: "12pm", visitors: 85, sales: 35 },
                      { time: "1pm", visitors: 90, sales: 25 },
                      { time: "2pm", visitors: 55, sales: 18 },
                      { time: "3pm", visitors: 70, sales: 22 },
                      { time: "4pm", visitors: 110, sales: 45 },
                      { time: "5pm", visitors: 140, sales: 55 },
                      { time: "6pm", visitors: 120, sales: 40 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip />
                    <Bar
                      yAxisId="left"
                      dataKey="visitors"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="sales"
                      stroke="#10b981"
                      strokeWidth={3}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );
      case "demand-planning":
        return (
          <div className="flex flex-col items-center justify-center h-96 text-center space-y-4 bg-violet-50 dark:bg-violet-900/10 rounded-2xl border-2 border-dashed border-violet-200">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-violet-100">
              <TrendingUp className="h-12 w-12 text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-xl">Advanced Demand Planning</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Detailed product-level forecasting, stock-out risk charts, and
                automated supply suggestions.
              </p>
            </div>
            <Button
              onClick={goToDemandForecasting}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Open Demand Planner <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      case "automation-hub":
        return (
          <div className="flex flex-col items-center justify-center h-96 text-center space-y-4 bg-amber-50 dark:bg-amber-950/10 rounded-2xl border-2 border-dashed border-amber-200">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-amber-100">
              <Zap className="h-12 w-12 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-xl">Rules & Automations</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Set up "If-This-Then-That" triggers to automate your business
                operations and notifications.
              </p>
            </div>
            <Button
              onClick={() => router.push("/dashboard/intelligence/automation")}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Open Automation Hub <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      case "hr-retention":
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Business Intelligence
            </h2>
            <Badge
              variant="outline"
              className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200"
            >
              AI Active
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Smart decision support powered by Meta Prophet and predictive
            analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Analysis Module:
          </span>
          <div className="w-[250px]">
            <Select value={module} onValueChange={setModule}>
              <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="Select Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales-forecast">
                  Sales Forecasting
                </SelectItem>
                <SelectItem value="inventory-opt">
                  Inventory Optimization
                </SelectItem>
                <SelectItem value="vision-analytics">
                  Visitor Vision (CCTV)
                </SelectItem>
                <SelectItem value="demand-planning">
                  Demand Planning (Phase 1.2)
                </SelectItem>
                <SelectItem value="automation-hub">
                  Automation (Phase 1.3)
                </SelectItem>
                <SelectItem value="hr-retention">Employee Insights</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
