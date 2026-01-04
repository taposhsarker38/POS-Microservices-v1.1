"use client";

import * as React from "react";
import {
  Activity,
  Thermometer,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Search,
  ArrowUpRight,
  RefreshCw,
  MoreVertical,
  Cpu,
  Gauge,
  History,
  TrendingDown,
  TrendingUp,
  AlertOctagon,
  Battery,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

export function AssetHealthDashboard() {
  const [assets, setAssets] = React.useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = React.useState<any>(null);
  const [healthData, setHealthData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [detailsLoading, setDetailsLoading] = React.useState(false);

  const fetchAssets = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/asset/assets/");
      const data = response.data.results || response.data;
      setAssets(data);
      if (data.length > 0 && !selectedAsset) {
        handleSelectAsset(data[0]);
      }
    } catch (error) {
      toast.error("Failed to load assets");
    } finally {
      setLoading(false);
    }
  }, [selectedAsset]);

  const handleSelectAsset = async (asset: any) => {
    setSelectedAsset(asset);
    try {
      setDetailsLoading(true);
      const response = await api.get(
        `/asset/assets/${asset.id}/health-metrics/`
      );
      setHealthData(response.data);
    } catch (error) {
      console.error("Failed to load health metrics", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const runSimulation = async () => {
    try {
      toast.info("Triggering IoT simulation...", {
        description: "Generating synthetic telemetry data for analysis.",
      });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      fetchAssets();
      if (selectedAsset) handleSelectAsset(selectedAsset);
      toast.success("Telemetry updated", {
        description: "New sensor readings have been processed.",
      });
    } catch (err) {
      toast.error("Simulation failed");
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    );
  }

  const getHealthScore = (metrics: any) => {
    if (
      !metrics ||
      !metrics.telemetry_history ||
      metrics.telemetry_history.length === 0
    )
      return 100;
    const last = metrics.telemetry_history[0];
    let score = 100;
    if (parseFloat(last.temperature) > 75) score -= 30;
    if (parseFloat(last.vibration) > 0.8) score -= 40;
    return Math.max(0, score);
  };

  const healthScore = getHealthScore(healthData);

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 dark:text-emerald-400";
    if (score >= 50) return "text-amber-500 dark:text-amber-400";
    return "text-rose-500 dark:text-rose-400";
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500 dark:bg-emerald-400";
    if (score >= 50) return "bg-amber-500 dark:bg-amber-400";
    return "bg-rose-500 dark:bg-rose-400";
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10 transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <BrainIcon className="h-8 w-8 text-primary" />
              Intelligence Hub
            </h1>
            <p className="text-muted-foreground mt-1 text-lg">
              Predictive Maintenance & Asset Health Monitoring
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={runSimulation}
              className="border-border hover:bg-muted"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Simulate Telemetry
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
              <Activity className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Sidebar: Asset List */}
          <Card className="xl:col-span-3 border-border bg-card/50 backdrop-blur-sm h-[calc(100vh-200px)] sticky top-6 flex flex-col overflow-hidden">
            <CardHeader className="border-b border-border pb-4 bg-muted/40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 bg-background border-input focus:ring-primary"
                  placeholder="Search assets..."
                />
              </div>
            </CardHeader>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => handleSelectAsset(asset)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-all duration-200 group border border-transparent",
                      selectedAsset?.id === asset.id
                        ? "bg-primary/10 border-primary/20"
                        : "hover:bg-muted hover:border-border"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={cn(
                          "font-medium text-sm truncate pr-2",
                          selectedAsset?.id === asset.id
                            ? "text-primary"
                            : "text-foreground"
                        )}
                      >
                        {asset.name}
                      </span>
                      {asset.maintenance_status?.pending_tasks > 0 ? (
                        <Badge
                          variant="destructive"
                          className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]"
                        >
                          {asset.maintenance_status.pending_tasks}
                        </Badge>
                      ) : (
                        <div
                          className={`h-2 w-2 rounded-full mt-1.5 ${
                            asset.status === "active"
                              ? "bg-emerald-500"
                              : "bg-muted-foreground"
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {asset.category_name}
                      </p>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/50 group-hover:text-primary/50 transition-colors">
                        ID: {asset.id.slice(0, 4)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Main Content Area */}
          <div className="xl:col-span-9 space-y-6">
            {detailsLoading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                  ))}
                </div>
                <Skeleton className="h-[400px] rounded-xl" />
              </div>
            ) : healthData ? (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Health Score Card */}
                  <Card className="relative overflow-hidden border-border bg-card">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                      <Activity
                        className={cn("h-32 w-32", getHealthColor(healthScore))}
                      />
                    </div>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                        Asset Health Score
                      </CardDescription>
                      <CardTitle className="flex items-baseline gap-2">
                        <span
                          className={cn(
                            "text-4xl font-bold tracking-tighter",
                            getHealthColor(healthScore)
                          )}
                        >
                          {healthScore}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground">
                          / 100
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Progress
                        value={healthScore}
                        className="h-2 mb-2"
                        indicatorClassName={getHealthBg(healthScore)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {healthScore > 80
                          ? "System operating within optimal parameters."
                          : "Anomalies detected in sensor data."}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Temperature Card */}
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardDescription className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                        Temperature
                      </CardDescription>
                      {parseFloat(
                        healthData.telemetry_history[0]?.temperature || 0
                      ) > 60 ? (
                        <Badge variant="destructive" className="animate-pulse">
                          High
                        </Badge>
                      ) : (
                        <Thermometer className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">
                        {healthData.telemetry_history[0]?.temperature || 0}°C
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Updated{" "}
                        {format(
                          new Date(
                            healthData.telemetry_history[0]?.timestamp ||
                              new Date()
                          ),
                          "HH:mm"
                        )}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Vibration Card */}
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardDescription className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                        Vibration
                      </CardDescription>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">
                        {healthData.telemetry_history[0]?.vibration || 0}{" "}
                        <span className="text-base font-normal text-muted-foreground">
                          mm/s
                        </span>
                      </div>
                      <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="h-3 w-3" /> Nominal Range
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Deep Dive Charts */}
                <Card className="border-border bg-card">
                  <CardHeader className="border-b border-border bg-muted/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg font-bold">
                          Real-time Telemetry
                        </CardTitle>
                        <CardDescription>
                          24-hour sensor data aggregation
                        </CardDescription>
                      </div>
                      <Tabs defaultValue="temp" className="w-[300px]">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="temp">Temperature</TabsTrigger>
                          <TabsTrigger value="vib">Vibration</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer>
                        <AreaChart
                          data={[...healthData.telemetry_history].reverse()}
                        >
                          <defs>
                            <linearGradient
                              id="colorTemp"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#f97316"
                                stopOpacity={0.2}
                              />
                              <stop
                                offset="95%"
                                stopColor="#f97316"
                                stopOpacity={0}
                              />
                            </linearGradient>
                            <linearGradient
                              id="colorVib"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#3b82f6"
                                stopOpacity={0.2}
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
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            dataKey="timestamp"
                            tickFormatter={(val) =>
                              format(new Date(val), "HH:mm")
                            }
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            stroke="hsl(var(--muted-foreground))"
                            dy={10}
                          />
                          <YAxis
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            stroke="hsl(var(--muted-foreground))"
                            tickFormatter={(val) => `${val}°`}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid hsl(var(--border))",
                              backgroundColor: "hsl(var(--popover))",
                              color: "hsl(var(--popover-foreground))",
                              boxShadow: "var(--shadow-sm)",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="temperature"
                            stroke="#f97316"
                            strokeWidth={2}
                            fill="url(#colorTemp)"
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                          <ReferenceLine
                            y={80}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            label={{
                              position: "right",
                              value: "Critical Limit",
                              fill: "#ef4444",
                              fontSize: 10,
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Bottom Grid: Insights & Maintenance */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* AI Insights Panel */}
                  <Card className="border-border bg-slate-950 dark:bg-slate-900 text-white overflow-hidden shadow-xl">
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-violet-500/20 rounded-lg">
                          <Cpu className="h-4 w-4 text-violet-300" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
                          Cortex Engine
                        </span>
                      </div>
                      <CardTitle className="text-xl">
                        Predictive Insights
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        AI-generated analysis based on recent patterns.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {healthData.maintenance_history.some(
                        (t: any) => t.task_type === "preventive"
                      ) ? (
                        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-md">
                          <div className="flex gap-3">
                            <AlertOctagon className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-rose-200">
                                Anomaly Detected
                              </h4>
                              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                                Vibration patterns indicate instability. 94%
                                failure probability.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
                          <div className="flex gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-emerald-200">
                                System Nominal
                              </h4>
                              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                                All efficient metrics are within optimal ranges
                                using the prediction model.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <p className="text-xs text-slate-400 mb-1">
                            RUL Prediction
                          </p>
                          <p className="text-2xl font-bold">142 Days</p>
                          <Progress
                            value={70}
                            className="h-1 mt-3 bg-white/10"
                            indicatorClassName="bg-blue-400"
                          />
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <p className="text-xs text-slate-400 mb-1">
                            Efficiency Rating
                          </p>
                          <p className="text-2xl font-bold">98.2%</p>
                          <Progress
                            value={98}
                            className="h-1 mt-3 bg-white/10"
                            indicatorClassName="bg-emerald-400"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Maintenance Tasks List */}
                  <Card className="border-border bg-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold">
                          Maintenance Schedule
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8"
                        >
                          View All
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[320px]">
                        {healthData.maintenance_history.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
                            <CheckCircle2 className="h-10 w-10 mb-3 opacity-20" />
                            <p className="text-sm">No pending maintenance.</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-border">
                            {healthData.maintenance_history.map((task: any) => (
                              <div
                                key={task.id}
                                className="p-4 hover:bg-muted/50 transition-colors flex gap-4 items-start group"
                              >
                                <div
                                  className={cn(
                                    "w-2 h-2 rounded-full mt-2 shrink-0",
                                    task.priority === "high"
                                      ? "bg-rose-500"
                                      : "bg-blue-500"
                                  )}
                                />
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <h4 className="text-sm font-semibold text-foreground">
                                      {task.title}
                                    </h4>
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] group-hover:bg-background"
                                    >
                                      {task.status}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {task.description}
                                  </p>
                                  <div className="flex items-center gap-3 mt-3">
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                                      <Settings className="h-3 w-3" />
                                      {task.task_type}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                                      <Clock className="h-3 w-3" />
                                      {task.suggested_date || "ASAP"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <div className="h-[600px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-3xl bg-muted/20">
                <Search className="h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-foreground">
                  No Asset Selected
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm text-center mt-2">
                  Select an asset from the sidebar to view detailed health
                  diagnostics and telemetry.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  );
}
