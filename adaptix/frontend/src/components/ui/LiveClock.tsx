"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function LiveClock({ className }: { className?: string }) {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time)
    return (
      <div
        className={cn(
          "h-5 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded",
          className
        )}
      />
    );

  return (
    <div className={cn("font-mono font-medium", className)}>
      {time.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </div>
  );
}
