"use client";

import { useState, useEffect, useMemo } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Camera,
  Users,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Eye,
  UserCheck,
  ShieldAlert,
  ArrowRightLeft,
  Briefcase,
  Search,
  Calendar as CalendarIcon,
  Filter,
  Download,
  FileText,
  Clock,
  ChevronRight,
  Plus,
  Coffee,
  Plane,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface VisionStats {
  env_type: "RETAIL" | "FACTORY" | "OFFICE";
  active_cameras: number;
  on_site_now: number;
  absent_count: number;
  conversion_rate: number;
  security_status: "SECURE" | "ALERT";
}

interface TrafficPoint {
  hour: number;
  entries: number;
  exits: number;
}

interface PresenceLog {
  id: number;
  person_id: string;
  person_type: string;
  camera: string;
  direction: string;
  timestamp: string;
  source: string;
  metadata: any;
}

interface PresenceResponse {
  env_type: string;
  logs: PresenceLog[];
}

interface CartItem {
  id: string;
  name: string;
  sales_price: number;
  quantity: number;
  sku: string;
}

interface CartResponse {
  session_id: string;
  items: CartItem[];
  updated_at: string;
}

interface MovementSession {
  person_id: string;
  out_time: string;
  in_time: string;
  duration_minutes: number;
  is_long_absence: boolean;
  status: string;
}

export default function VisionHubPage() {
  const [activeTab, setActiveTab] = useState("retail");
  const [filterDate, setFilterDate] = useState<Date | undefined>(new Date());
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [stats, setStats] = useState<VisionStats | null>(null);
  const [traffic, setTraffic] = useState<TrafficPoint[]>([]);
  const [logs, setLogs] = useState<PresenceLog[]>([]);
  const [movements, setMovements] = useState<MovementSession[]>([]);
  const [liveCartItems, setLiveCartItems] = useState<CartItem[]>([]);
  const [envType, setEnvType] = useState<string>("OFFICE");
  const [isLoading, setIsLoading] = useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Dynamic Label Generation
  const visitorLabel = envType === "RETAIL" ? "Customer" : "Visitor";

  // Manual Form State
  const [manualType, setManualType] = useState<"footfall" | "presence">(
    "footfall"
  );
  const [manualForm, setManualForm] = useState({
    entries: "0",
    exits: "0",
    person_id: "",
    person_type: "VISITOR",
    direction: "IN",
    leave_status: "Regular Break",
    timestamp: new Date().toISOString().slice(0, 16),
  });

  // 1. Fetch Branches
  useEffect(() => {
    fetch("/api/company/wings/")
      .then((res) => res.json())
      .then((data) => {
        setBranches(data);
        if (data.length > 0) setSelectedBranch(data[0].id);
      })
      .catch((err) => console.error("Error fetching branches:", err));
  }, []);

  // 2. Fetch All Data
  const refreshData = () => {
    if (selectedBranch === "all") return;

    const formattedDate = filterDate
      ? filterDate.toISOString().split("T")[0]
      : "";

    setIsLoading(true);
    const statsUrl = `/api/intelligence/vision/stats/?branch_uuid=${selectedBranch}`;
    const trafficUrl = `/api/intelligence/vision/traffic/?branch_uuid=${selectedBranch}&date=${formattedDate}`;
    const logsUrl = `/api/intelligence/vision/presence-analytics/?branch_uuid=${selectedBranch}`;
    const movementsUrl = `/api/intelligence/vision/movement-tracking/?branch_uuid=${selectedBranch}`;
    // Using hardcoded terminal ID for demo sync
    const cartUrl = `/api/intelligence/vision/cart-sync/?terminal_id=TERM_001`;

    Promise.all([
      fetch(statsUrl).then((r) => r.json()),
      fetch(trafficUrl).then((r) => r.json()),
      fetch(logsUrl).then((r) => r.json()),
      fetch(movementsUrl).then((r) => r.json()),
      fetch(cartUrl).then((r) => r.json()),
    ])
      .then(
        ([statsData, trafficData, logsResponse, movementsData, cartData]: [
          VisionStats,
          TrafficPoint[],
          PresenceResponse,
          MovementSession[],
          CartResponse
        ]) => {
          setStats(statsData);
          setTraffic(trafficData);
          setLogs(logsResponse.logs);
          setMovements(movementsData);

          if (cartData && cartData.items) {
            setLiveCartItems(cartData.items);
          } else {
            setLiveCartItems([]);
          }

          setEnvType(statsData.env_type || logsResponse.env_type || "OFFICE");
          setIsLoading(false);
        }
      )
      .catch((err) => {
        console.error("Error fetching vision data:", err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    refreshData();
  }, [selectedBranch, filterDate]);

  const handleManualSubmit = async () => {
    try {
      const payload = {
        entry_type: manualType,
        branch_uuid: selectedBranch,
        ...manualForm,
      };

      // Auto-adjust person_type for retail if it's default VISITOR
      if (
        manualType === "presence" &&
        envType === "RETAIL" &&
        manualForm.person_type === "VISITOR"
      ) {
        payload.person_type = "CUSTOMER";
      }

      const response = await fetch("/api/intelligence/vision/manual-entry/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(`Manual ${manualType} entry saved`);
        setIsManualModalOpen(false);
        refreshData();
      } else {
        toast.error("Failed to save manual entry");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen text-foreground">
      {/* Header with Global Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            <Eye className="h-8 w-8 text-primary" />
            AI Vision Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Unified visual intelligence across all business sites.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Manual Log Fallback
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Manual Vision Entry</DialogTitle>
                <DialogDescription>
                  Log activity manually if CCTV or power is unavailable.
                </DialogDescription>
              </DialogHeader>
              <Tabs
                defaultValue="footfall"
                onValueChange={(v) => setManualType(v as any)}
              >
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="footfall">Footfall (Traffic)</TabsTrigger>
                  <TabsTrigger value="presence">Presence (ID)</TabsTrigger>
                </TabsList>
                <TabsContent value="footfall" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Entries Count</Label>
                      <Input
                        type="number"
                        value={manualForm.entries}
                        onChange={(e) =>
                          setManualForm({
                            ...manualForm,
                            entries: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Exits Count</Label>
                      <Input
                        type="number"
                        value={manualForm.exits}
                        onChange={(e) =>
                          setManualForm({
                            ...manualForm,
                            exits: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="presence" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Person ID / Name</Label>
                    <Input
                      placeholder={`Employee ID or '${visitorLabel}'`}
                      value={manualForm.person_id}
                      onChange={(e) =>
                        setManualForm({
                          ...manualForm,
                          person_id: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={manualForm.person_type}
                        onValueChange={(v) =>
                          setManualForm({ ...manualForm, person_type: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMPLOYEE">Employee</SelectItem>
                          <SelectItem
                            value={
                              envType === "RETAIL" ? "CUSTOMER" : "VISITOR"
                            }
                          >
                            {visitorLabel}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Direction</Label>
                      <Select
                        value={manualForm.direction}
                        onValueChange={(v) =>
                          setManualForm({ ...manualForm, direction: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IN">Entry (IN)</SelectItem>
                          <SelectItem value="OUT">Exit (OUT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {manualForm.direction === "OUT" &&
                    manualForm.person_type === "EMPLOYEE" && (
                      <div className="space-y-2">
                        <Label>Movement Reason</Label>
                        <Select
                          value={manualForm.leave_status}
                          onValueChange={(v) =>
                            setManualForm({ ...manualForm, leave_status: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Regular Break">
                              Regular Break
                            </SelectItem>
                            <SelectItem value="Short Leave">
                              Short Leave
                            </SelectItem>
                            <SelectItem value="Official Duty">
                              Official Duty
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                </TabsContent>
                <div className="space-y-2 mt-4">
                  <Label>Event Timestamp</Label>
                  <Input
                    type="datetime-local"
                    value={manualForm.timestamp}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        timestamp: e.target.value,
                      })
                    }
                  />
                </div>
              </Tabs>
              <DialogFooter className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsManualModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleManualSubmit}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Save Manual Entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex flex-wrap items-center gap-2 bg-card p-1.5 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-2 px-3 border-r border-border min-w-[180px]">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="border-none bg-transparent focus:ring-0 shadow-none h-8 px-0 text-sm font-medium w-full">
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 px-3">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"ghost"}
                    className={cn(
                      "h-8 px-0 font-medium hover:bg-transparent text-sm justify-start text-left focus-visible:ring-0",
                      !filterDate && "text-muted-foreground"
                    )}
                  >
                    {filterDate ? (
                      format(filterDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={filterDate}
                    onSelect={setFilterDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="retail"
        className="w-full"
        onValueChange={setActiveTab}
      >
        <div className="flex justify-between items-center mb-6">
          <TabsList className="bg-slate-100/50 p-1">
            <TabsTrigger
              value="retail"
              className="flex items-center gap-2 py-2 px-4"
            >
              <ShoppingCart className="h-4 w-4" />
              Retail & POS
            </TabsTrigger>
            <TabsTrigger
              value="factory"
              className="flex items-center gap-2 py-2 px-4"
            >
              <Briefcase className="h-4 w-4" />
              Site Presence
            </TabsTrigger>
            <TabsTrigger
              value="movements"
              className="flex items-center gap-2 py-2 px-4"
            >
              <Clock className="h-4 w-4" />
              Absence Tracking
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="flex items-center gap-2 py-2 px-4"
            >
              <FileText className="h-4 w-4" />
              Intelligence Reports
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200 py-1.5 px-3"
            >
              <div className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse" />
              Vision Engine Live
            </Badge>
          </div>
        </div>

        {/* Global Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-md transition-all hover:border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Active Monitoring
                    </p>
                    <h3 className="text-2xl font-bold mt-1 text-foreground">
                      {stats?.active_cameras ?? 0} Cameras
                    </h3>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-xl">
                    <Camera className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-md transition-all hover:border-indigo-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {activeTab === "retail" ? "Daily Reach" : "On-Site Now"}
                    </p>
                    <h3 className="text-2xl font-bold mt-1 text-foreground">
                      {stats?.on_site_now ?? 0}
                    </h3>
                  </div>
                  <div className="p-3 bg-indigo-500/10 rounded-xl">
                    <Users className="h-6 w-6 text-indigo-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card
              className={cn(
                "bg-card/50 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-md transition-all",
                (stats?.absent_count ?? 0) > 0
                  ? "border-rose-500/20 bg-rose-500/5"
                  : "hover:border-amber-500/20"
              )}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {envType === "RETAIL"
                        ? "Break Absences"
                        : "Total Absences"}
                    </p>
                    <h3
                      className={cn(
                        "text-2xl font-bold mt-1",
                        (stats?.absent_count ?? 0) > 0
                          ? "text-rose-500"
                          : "text-foreground"
                      )}
                    >
                      {stats?.absent_count ?? 0}
                    </h3>
                  </div>
                  <div
                    className={cn(
                      "p-3 rounded-xl",
                      (stats?.absent_count ?? 0) > 0
                        ? "bg-rose-500/10"
                        : "bg-amber-500/10"
                    )}
                  >
                    <Coffee
                      className={cn(
                        "h-6 w-6",
                        (stats?.absent_count ?? 0) > 0
                          ? "text-rose-500"
                          : "text-amber-500"
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-md transition-all hover:border-emerald-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Security State
                    </p>
                    <h3
                      className={cn(
                        "text-2xl font-bold mt-1",
                        stats?.security_status === "ALERT"
                          ? "text-rose-500"
                          : "text-emerald-500"
                      )}
                    >
                      {stats?.security_status ?? "OPTIMAL"}
                    </h3>
                  </div>
                  <div
                    className={cn(
                      "p-3 rounded-xl",
                      stats?.security_status === "ALERT"
                        ? "bg-rose-500/10"
                        : "bg-emerald-500/10"
                    )}
                  >
                    <ShieldAlert
                      className={cn(
                        "h-6 w-6",
                        stats?.security_status === "ALERT"
                          ? "text-rose-500"
                          : "text-emerald-500"
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tab Contents */}
        <TabsContent value="retail" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <Card className="bg-card border-border/50 shadow-sm overflow-hidden h-full">
                <CardHeader className="border-b border-border/50 bg-muted/30 flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <ShoppingCart className="h-5 w-5 text-blue-500" />
                    Live Hybrid Checkout Integration
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                  >
                    Active Sync
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    <div className="p-4 bg-blue-500/5 border-l-4 border-blue-500 flex flex-col gap-4">
                      {liveCartItems.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 bg-background rounded-xl border border-border/50 shadow-sm flex items-center justify-center font-bold text-blue-500 text-xs animate-pulse">
                                LIVE
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="font-bold text-foreground">
                                    Active Session Detected
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4 text-muted-foreground border-border bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  >
                                    {liveCartItems.length} Items Found
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Processing visual stream from Term_001...
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {liveCartItems.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center bg-background/50 p-2 rounded-lg border border-border/50"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center">
                                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      {item.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.sku}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold">
                                    ${item.sales_price}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Qty: {item.quantity}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-background rounded-xl border border-border/50 shadow-sm flex items-center justify-center font-bold text-blue-500 text-xs">
                              LIVE
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-bold text-foreground">
                                  Waiting for Detections
                                </p>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4 text-muted-foreground border-border"
                                >
                                  API Connected
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Scan barcode/QR or wait for CCTV automated
                                cart...
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-card border-border/50 shadow-sm h-full">
                <CardHeader className="border-b border-border/50 bg-muted/30">
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <ArrowRightLeft className="h-5 w-5 text-indigo-500" />
                    Traffic Flux
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex justify-between items-end h-32 gap-1">
                      {traffic.length > 0 ? (
                        traffic.map((tp, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-indigo-500/10 rounded-t-lg relative group transition-all hover:bg-indigo-500/20"
                          >
                            <div
                              className="absolute inset-x-0 bottom-0 bg-indigo-500 rounded-t-lg transition-all"
                              style={{
                                height: `${Math.min(
                                  100,
                                  (tp.entries / 10) * 100
                                )}%`,
                              }}
                            ></div>
                          </div>
                        ))
                      ) : (
                        <div className="flex-1 h-32 flex items-center justify-center text-xs text-muted-foreground italic">
                          No movement data
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/50 p-3 rounded-lg text-center border border-border/50">
                        <p className="text-xs text-muted-foreground mb-1">
                          Total Entries
                        </p>
                        <p className="text-xl font-bold text-emerald-500">
                          {traffic.reduce((a, b) => a + b.entries, 0)}
                        </p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg text-center border border-border/50">
                        <p className="text-xs text-muted-foreground mb-1">
                          Total Exits
                        </p>
                        <p className="text-xl font-bold text-rose-500">
                          {traffic.reduce((a, b) => a + b.exits, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="factory" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">
              Site Activity Report
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-border/50 hover:bg-muted"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-semibold">
                      Identified Person
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold">
                      Type
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold">
                      Camera / Source
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold">
                      Event Time
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {logs.map((log) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="hover:bg-muted/30 border-b border-border/50 last:border-0 group transition-colors"
                      >
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "h-2.5 w-2.5 rounded-full ring-2 ring-offset-2 ring-offset-card",
                                log.person_type === "UNAUTHORIZED"
                                  ? "bg-rose-500 ring-rose-500/20 animate-pulse"
                                  : "bg-emerald-500 ring-emerald-500/20"
                              )}
                            />
                            {log.person_id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "font-normal border",
                              log.person_type === "EMPLOYEE"
                                ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                : log.person_type === "CUSTOMER"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : log.person_type === "VISITOR"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            )}
                          >
                            {log.person_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground flex flex-col gap-1">
                          <span className="flex items-center gap-1.5 text-xs">
                            <MapPin className="h-3.5 w-3.5 opacity-70" />{" "}
                            {log.camera}
                          </span>
                          {log.source === "MANUAL" && (
                            <div className="flex gap-1">
                              <Badge
                                variant="outline"
                                className="text-[10px] w-fit text-amber-500 border-amber-500/20 bg-amber-500/5"
                              >
                                Manual Entry
                              </Badge>
                              {log.metadata?.leave_status === "Short Leave" && (
                                <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 text-[10px] h-4">
                                  Short Leave
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "font-normal",
                              log.direction === "IN"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                            )}
                          >
                            {log.direction}
                          </Badge>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-12 text-muted-foreground italic bg-muted/5"
                      >
                        No activity logs found for this site
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">
              Employee Breakdown & Break Tracker
            </h2>
          </div>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Last Departure</TableHead>
                    <TableHead>Return Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Type / Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m, i) => (
                    <TableRow key={i} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold">{m.person_id}</TableCell>
                      <TableCell className="text-slate-500">
                        {new Date(m.out_time).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {new Date(m.in_time).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-mono ${
                            m.is_long_absence
                              ? "text-rose-600 font-bold"
                              : "text-slate-700"
                          }`}
                        >
                          {m.duration_minutes} mins
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${
                            m.status === "Short Leave"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : m.is_long_absence
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          {m.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {movements.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-slate-400 italic"
                      >
                        No movement sessions recorded for today
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                Long-term Intelligence Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500 italic">
                Historical analytics aggregation in progress...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
