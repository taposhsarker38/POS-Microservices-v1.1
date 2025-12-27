"use client";

import { useEffect, useState } from "react";
import { useWebSockets } from "@/hooks/useWebSockets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Bell, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { format } from "date-fns";

interface FeedItem {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  severity: "info" | "success" | "warning" | "error";
}

export function LiveFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const { socket } = useWebSockets();

  const addEvent = (
    msg: string,
    type: string,
    severity: FeedItem["severity"] = "info"
  ) => {
    const newItem: FeedItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message: msg,
      timestamp: new Date(),
      severity,
    };
    setItems((prev) => [newItem, ...prev].slice(0, 50));
  };

  useEffect(() => {
    if (!socket) return;

    const handleForecast = () => {
      addEvent(
        "AI Demand Forecast completed successfully.",
        "Forecast",
        "success"
      );
    };

    const handleAlert = (data: any) => {
      addEvent(
        `Critical anomaly detected: ${data.message || "Check alerts"}`,
        "Anomaly",
        "error"
      );
    };

    const handleAutomation = (data: any) => {
      addEvent(
        `Workflow Rule triggered: ${data.rule_name || "System Rule"}`,
        "Automation",
        "info"
      );
    };

    socket.on("forecast.completed", handleForecast);
    socket.on("intelligence.alert", handleAlert);
    socket.on("automation.triggered", handleAutomation);

    return () => {
      socket.off("forecast.completed", handleForecast);
      socket.off("intelligence.alert", handleAlert);
      socket.off("automation.triggered", handleAutomation);
    };
  }, [socket]);

  return (
    <Card className="h-full bg-slate-900/50 border-slate-800 text-white backdrop-blur-xl">
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
          Live Intelligence Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-100 px-4">
          <div className="space-y-4 py-4">
            {items.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm italic">
                Waiting for real-time events...
              </div>
            )}
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative flex gap-3 pb-4 border-l border-white/10 pl-4 ml-2"
              >
                <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-slate-800 border-2 border-slate-700 group-first:bg-emerald-500 group-first:animate-ping" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {item.type}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {format(item.timestamp, "HH:mm:ss")}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {item.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
