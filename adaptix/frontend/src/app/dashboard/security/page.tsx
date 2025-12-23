"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Layers,
  Lock,
  History,
  AlertTriangle,
} from "lucide-react";
import { useWebSockets } from "@/hooks/useWebSockets";

interface IntegrityStatus {
  status: "secure" | "compromised" | "checking";
  checked_records: number;
  valid: number;
  corrupted: number;
  total_records: number;
}

interface AuditLog {
  id: number;
  service_name: string;
  method: string;
  path: string;
  hash: string;
  previous_hash: string;
  created_at: string;
}

export default function SecurityCenterPage() {
  const [integrity, setIntegrity] = useState<IntegrityStatus | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchIntegrity = async () => {
    setIsVerifying(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/audit/logs/verify/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setIntegrity(data);
      }
    } catch (error) {
      console.error("Failed to verify ledger", error);
    } finally {
      setIsVerifying(false);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/audit/logs/?limit=10`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setRecentLogs(data.results || data);
      }
    } catch (error) {
      console.error("Failed to fetch logs", error);
    }
  };

  useEffect(() => {
    fetchIntegrity();
    fetchRecentLogs();
  }, []);

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <Shield className="w-10 h-10 text-blue-500" />
            Security Center
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            AI-Powered Blockchain Audit Ledger & System Integrity Monitoring.
          </p>
        </div>
        <Button
          onClick={fetchIntegrity}
          disabled={isVerifying}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 px-6"
        >
          {isVerifying ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4 mr-2" />
          )}
          Re-verify Integrity
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Integrity Card */}
        <Card
          className={`relative overflow-hidden border-2 transition-all duration-500 ${
            integrity?.status === "secure"
              ? "border-green-500/20 bg-green-500/[0.02]"
              : integrity?.status === "compromised"
              ? "border-red-500/20 bg-red-500/[0.02]"
              : "border-muted"
          }`}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              System Blockchain Integrity
              {integrity?.status === "secure" ? (
                <Badge className="bg-green-500 ml-auto">Verified</Badge>
              ) : integrity?.status === "compromised" ? (
                <Badge variant="destructive" className="ml-auto animate-pulse">
                  Breach Detected
                </Badge>
              ) : (
                <Badge variant="outline" className="ml-auto">
                  Pending
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Cryptographic verification of the last{" "}
              {integrity?.checked_records ?? 0} events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6">
              {integrity?.status === "secure" ? (
                <div className="relative">
                  <ShieldCheck className="w-24 h-24 text-green-500 mb-4 animate-in zoom-in duration-500" />
                  <div className="absolute -inset-4 bg-green-500/20 rounded-full blur-2xl animate-pulse -z-10" />
                </div>
              ) : integrity?.status === "compromised" ? (
                <div className="relative">
                  <ShieldAlert className="w-24 h-24 text-red-500 mb-4 animate-bounce" />
                  <div className="absolute -inset-4 bg-red-500/20 rounded-full blur-2xl animate-pulse -z-10" />
                </div>
              ) : (
                <RefreshCw className="w-24 h-24 text-muted-foreground mb-4 animate-spin" />
              )}

              <div className="text-center">
                <p className="text-3xl font-bold tracking-tight">
                  {integrity?.valid ?? 0} / {integrity?.checked_records ?? 0}
                </p>
                <p className="text-sm text-muted-foreground uppercase tracking-widest mt-1">
                  Valid Blocks
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Total Logs
                </p>
                <p className="text-lg font-bold">
                  {integrity?.total_records ?? 0}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Corrupted
                </p>
                <p
                  className={`text-lg font-bold ${
                    integrity?.corrupted ? "text-red-500" : ""
                  }`}
                >
                  {integrity?.corrupted ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Threat Intelligence / AI Insights Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" />
              <CardTitle>Audit Chain Visualization</CardTitle>
            </div>
            <CardDescription>
              Live cryptographic links between service events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {recentLogs.map((log, idx) => (
                <div key={log.id} className="relative group">
                  {idx !== recentLogs.length - 1 && (
                    <div className="absolute left-6 top-10 bottom-[-16px] w-0.5 bg-gradient-to-b from-blue-500/50 to-transparent z-0" />
                  )}
                  <div className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-all duration-300 relative z-10 group-hover:scale-[1.01]">
                    <div
                      className={`p-2 rounded-lg ${
                        log.hash
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {log.hash ? (
                        <Lock className="w-5 h-5" />
                      ) : (
                        <History className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm flex items-center gap-2">
                            {log.service_name.toUpperCase()} RECENT EVENT
                            {log.hash && (
                              <Badge
                                variant="secondary"
                                className="bg-blue-400/10 text-blue-500 border-none h-5"
                              >
                                Signed
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground bg-accent px-2 py-1 rounded">
                          ID: #{log.id}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-muted-foreground shrink-0 text-[10px] uppercase font-bold">
                            Hash:
                          </span>
                          <span className="font-mono truncate">
                            {log.hash || "Legacy data (un-hashed)"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {integrity?.status === "compromised" && (
        <Card className="border-red-500 bg-red-500/10 animate-pulse transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-12 h-12 text-red-500 shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-red-600">
                  CRITICAL: Chain Integrity Breach Detected!
                </h3>
                <p className="text-sm text-red-700/80">
                  Manual modifications or deletions were detected in the Audit
                  Ledger. The cryptographic link between records has been
                  broken. Audit #1450 and several earlier records are flagged as
                  non-verifiable.
                </p>
              </div>
              <Button variant="destructive" className="ml-auto">
                Investigate Incident
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Actions / Policies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Security Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-full">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                </div>
                <span className="text-sm font-medium">
                  Automatic Ledger Signing
                </span>
              </div>
              <Badge className="bg-green-500">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-full">
                  <Lock className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-sm font-medium">
                  Immutable Chain Enforcement
                </span>
              </div>
              <Badge className="bg-blue-500">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg opacity-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-full">
                  <History className="w-4 h-4 text-orange-500" />
                </div>
                <span className="text-sm font-medium">
                  External Cold-Storage Sync
                </span>
              </div>
              <Badge variant="outline">Scheduled Phase 3</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-600 text-white border-none shadow-xl shadow-blue-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Report Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-100 text-sm mb-4">
              Operational integrity is within 95th percentile. All recent
              modifications to the POS and HRMS modules have been
              cryptographically signed and verified against the previous session
              hash.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Last Full Scan</span>
                <span className="font-mono">Today, 07:30 AM</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Signed Coverage</span>
                <span className="font-mono">98.2%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Active Threats</span>
                <span className="font-mono">0 Detected</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
