"use client";

import * as React from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MoreVertical,
  Activity,
  History,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  FileText,
  BadgeAlert,
  ArrowRight,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function FinanceAnomalyDashboard() {
  const [anomalies, setAnomalies] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedAnomaly, setSelectedAnomaly] = React.useState<any>(null);
  const [resolutionNote, setResolutionNote] = React.useState("");
  const [isResolveDialogOpen, setIsResolveDialogOpen] = React.useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [anomaliesRes, summaryRes] = await Promise.all([
        api.get("/intelligence/anomalies/"),
        api.get("/intelligence/anomalies/summary/"),
      ]);
      setAnomalies(anomaliesRes.data.results || anomaliesRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error("Failed to load financial intelligence data");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleResolve = async () => {
    if (!selectedAnomaly) return;
    try {
      await api.post(`/intelligence/anomalies/${selectedAnomaly.id}/resolve/`, {
        note: resolutionNote,
      });
      toast.success("Anomaly resolved successfully");
      setIsResolveDialogOpen(false);
      setResolutionNote("");
      fetchData();
    } catch (error) {
      toast.error("Failed to resolve anomaly");
    }
  };

  if (loading && !summary) {
    return (
      <div className="p-8 space-y-8 max-w-[1600px] mx-auto transition-all">
        <div className="flex justify-between items-center">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[500px] w-full rounded-2xl" />
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800";
      case "high":
        return "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800";
      case "medium":
        return "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800";
      default:
        return "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800";
    }
  };

  return (
    <div className="min-h-screen bg-background/50 p-6 lg:p-10">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-primary" />
              Financial Intelligence
            </h1>
            <p className="text-muted-foreground mt-1 text-lg">
              AI-driven anomaly detection and risk assessment.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={fetchData}
              className="border-border"
            >
              <Activity className="mr-2 h-4 w-4" />
              Refresh Scan
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardDescription className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Pending Anomalies
              </CardDescription>
              <BadgeAlert className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {summary?.total_pending || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-rose-500" />
                Requires immediate review
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardDescription className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                High Risk Events
              </CardDescription>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {summary?.high_risk || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Confidence Score &gt; 80%
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardDescription className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Avg Risk Score
              </CardDescription>
              <TrendingDown className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">0.42</div>
              <p className="text-xs text-muted-foreground mt-1">
                Normal baseline: 0.15
              </p>
            </CardContent>
          </Card>

          <Card className="border-background bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-primary-foreground/80">
              <CardDescription className="text-xs uppercase font-bold tracking-wider text-primary-foreground/80">
                Protection Active
              </CardDescription>
              <CheckCircle2 className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">99.9%</div>
              <p className="text-xs mt-1 text-primary-foreground/70 tracking-tight">
                Real-time journal monitoring
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Table Section */}
        <Card className="border-border bg-card shadow-xl overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold">
                  Anomaly Feed
                </CardTitle>
                <CardDescription>
                  Review and resolve suspicious transactions.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9 bg-background"
                    placeholder="Filter by reference..."
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-border">
                {anomalies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-4 opacity-20 text-emerald-500" />
                    <p>No pending anomalies detected.</p>
                  </div>
                ) : (
                  anomalies.map((anomaly) => (
                    <div
                      key={anomaly.id}
                      className="p-6 hover:bg-muted/30 transition-all group flex flex-col md:flex-row gap-6 md:items-center"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "px-2 py-0 h-6 text-[10px] uppercase font-bold",
                              getSeverityColor(anomaly.severity)
                            )}
                          >
                            {anomaly.severity}
                          </Badge>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                            {anomaly.anomaly_type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                          {anomaly.category}
                          <span className="text-muted-foreground font-normal text-sm">
                            — {anomaly.journal_reference || "No Reference"}
                          </span>
                        </h3>
                        <p className="text-sm text-foreground/80 leading-relaxed max-w-2xl">
                          {anomaly.reasoning}
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded-md">
                            <Clock className="h-3.5 w-3.5" />
                            {format(
                              new Date(anomaly.journal_date),
                              "MMM d, yyyy"
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded-md">
                            <History className="h-3.5 w-3.5" />
                            Detected{" "}
                            {format(new Date(anomaly.created_at), "HH:mm")}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 md:w-48 shrink-0">
                        <div className="text-right">
                          <div className="text-2xl font-black tracking-tight text-foreground flex items-center gap-1 justify-end">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            {parseFloat(anomaly.amount).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1 justify-end mt-1">
                            <div className="h-1 w-20 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{
                                  width: `${anomaly.risk_score * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                              Risk {Math.round(anomaly.risk_score * 100)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => {
                              setSelectedAnomaly(anomaly);
                              setIsResolveDialogOpen(true);
                            }}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 rounded-lg shadow-lg shadow-primary/10 group/btn"
                          >
                            Resolve
                            <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-xs">
                                <FileText className="mr-2 h-3 w-3" /> View
                                Journal Entry
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs text-rose-500">
                                <AlertCircle className="mr-2 h-3 w-3" /> Mark as
                                Fraud
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Resolve Dialog */}
        <Dialog
          open={isResolveDialogOpen}
          onOpenChange={setIsResolveDialogOpen}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Resolve Anomaly
              </DialogTitle>
              <DialogDescription>
                Provide a brief explanation for closing this alert. This will be
                logged for audit purposes.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="p-3 bg-muted rounded-lg space-y-1 border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase">
                  Target Transaction
                </p>
                <p className="text-sm font-semibold">
                  {selectedAnomaly?.category} —{" "}
                  {selectedAnomaly?.journal_reference}
                </p>
                <p className="text-lg font-bold">
                  ${parseFloat(selectedAnomaly?.amount || 0).toLocaleString()}
                </p>
              </div>
              <Textarea
                placeholder="Maintenance reason or explanation..."
                className="min-h-[100px] resize-none focus:ring-primary"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsResolveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResolve}
                disabled={!resolutionNote.trim()}
                className="bg-primary shadow-lg shadow-primary/20"
              >
                Confirm Resolution
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
