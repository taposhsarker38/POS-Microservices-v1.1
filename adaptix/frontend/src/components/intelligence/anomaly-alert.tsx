"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Anomaly {
  id: string;
  category: string;
  amount: number;
  date: string;
  severity: "medium" | "high";
  message: string;
}

export function AnomalyAlert() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // In a real app, this would be a polling interval or websocket
    api
      .get("/intelligence/financial-anomalies/")
      .then((res) => {
        if (res.data.status === "success" && res.data.data) {
          setAnomalies(res.data.data);
        }
      })
      .catch((err) => console.error("Failed to fetch anomalies", err));
  }, []);

  if (!visible || anomalies.length === 0) return null;

  return (
    <div className="mb-6 space-y-4">
      {anomalies.map((anomaly) => (
        <Alert
          key={anomaly.id}
          variant={anomaly.severity === "high" ? "destructive" : "default"}
          className="border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>Unusual Expense Detect: {anomaly.category}</span>
            <span className="text-xs font-mono font-bold">
              ${anomaly.amount.toLocaleString()}
            </span>
          </AlertTitle>
          <AlertDescription>{anomaly.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
