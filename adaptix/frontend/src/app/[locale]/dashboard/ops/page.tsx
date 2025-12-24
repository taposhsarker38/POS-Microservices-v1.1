"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Server,
  Database,
  Cpu,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import api from "@/lib/api";
import { toast } from "sonner";

const SERVICES = [
  { id: "auth", name: "Auth Service", endpoint: "/auth/health/" },
  { id: "company", name: "Company Service", endpoint: "/company/health/" },
  { id: "customer", name: "Customer Service", endpoint: "/customer/health/" },
  { id: "product", name: "Product Service", endpoint: "/product/health/" },
  {
    id: "inventory",
    name: "Inventory Service",
    endpoint: "/inventory/health/",
  },
  { id: "pos", name: "POS Service", endpoint: "/pos/health/" },
  { id: "hrms", name: "HRMS Service", endpoint: "/hrms/health/" },
  {
    id: "accounting",
    name: "Accounting Service",
    endpoint: "/accounting/health/",
  },
  { id: "purchase", name: "Purchase Service", endpoint: "/purchase/health/" },
  {
    id: "reporting",
    name: "Reporting Service",
    endpoint: "/reporting/health/",
  },
  {
    id: "intelligence",
    name: "Intelligence Service",
    endpoint: "/intelligence/health/",
  },
  { id: "quality", name: "Quality Service", endpoint: "/quality/health/" },
  { id: "asset", name: "Asset Service", endpoint: "/asset/health/" },
  { id: "payment", name: "Payment Service", endpoint: "/payment/health/" },
  {
    id: "notification",
    name: "Notification Service",
    endpoint: "/notification/health/",
  },
  {
    id: "promotion",
    name: "Promotion Service",
    endpoint: "/promotion/health/",
  },
  {
    id: "logistics",
    name: "Logistics Service",
    endpoint: "/logistics/health/",
  },
];

export default function SystemOpsPage() {
  const [statuses, setStatuses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const checkHealth = async () => {
    setLoading(true);
    const newStatuses: Record<string, any> = {};

    await Promise.all(
      SERVICES.map(async (service) => {
        try {
          const start = Date.now();
          const res = await api.get(service.endpoint);
          const duration = Date.now() - start;
          newStatuses[service.id] = {
            status: "healthy",
            latency: duration,
            lastChecked: new Date().toLocaleTimeString(),
            details: res.data,
          };
        } catch (e) {
          newStatuses[service.id] = {
            status: "unhealthy",
            latency: 0,
            lastChecked: new Date().toLocaleTimeString(),
            error: "Service Unreachable",
          };
        }
      })
    );

    setStatuses(newStatuses);
    setLoading(false);
    toast.success("System health check completed");
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const filteredServices = SERVICES.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const healthyCount = Object.values(statuses).filter(
    (s) => s.status === "healthy"
  ).length;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-emerald-500" />
            System Operations
          </h2>
          <p className="text-muted-foreground mt-1">
            Real-time health monitoring for all 17 microservices.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="px-4 py-1 text-sm font-medium">
            System Score: {Math.round((healthyCount / SERVICES.length) * 100)}%
          </Badge>
          <Button onClick={checkHealth} disabled={loading} className="gap-2">
            <RefreshCw
              className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"}
            />
            Refresh Status
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-emerald-50/10 border-emerald-100 dark:border-emerald-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Healthy Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthyCount} / {SERVICES.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-rose-50/10 border-rose-100 dark:border-rose-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              Unhealthy Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {SERVICES.length - healthyCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/10 border-blue-100 dark:border-blue-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4 text-blue-500" />
              Total Instances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">17 Containers</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Microservice Mesh</CardTitle>
              <CardDescription>
                Status check across the entire architecture.
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search service..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Last Check</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map((service) => {
                const status = statuses[service.id];
                return (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">
                      {service.name}
                    </TableCell>
                    <TableCell>
                      {status ? (
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              status.status === "healthy"
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            } animate-pulse`}
                          />
                          <Badge
                            variant={
                              status.status === "healthy"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {status.status.toUpperCase()}
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="secondary">PENDING</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {status?.latency ? (
                        <span className="text-xs text-muted-foreground">
                          {status.latency}ms
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {status?.lastChecked || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                        <Clock className="h-3 w-3" />
                        99.98%
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Logs
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
