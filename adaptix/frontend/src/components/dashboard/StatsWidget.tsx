"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { NumberTicker } from "@/components/ui/NumberTicker";

interface StatsWidgetProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean; // true = green, false = red
  description?: string;
  loading?: boolean;
  className?: string;
  delay?: number; // Animation delay
  isCurrency?: boolean;
  onClick?: () => void;
}

/**
 * StatsWidget Component
 *
 * A reusable, animated card for displaying key metrics.
 *
 * Features:
 * - Loading Skeleton state
 * - Entrance Animation (Framer Motion)
 * - Number Ticker Animation
 * - Consistent Styling (Glassmorphism compatible)
 *
 * @example
 * <StatsWidget
 *    title="Total Revenue"
 *    value={5000}
 *    icon={DollarSign}
 *    loading={isLoading}
 *    isCurrency
 * />
 */
export function StatsWidget({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  description,
  loading = false,
  className,
  delay = 0,
  isCurrency = false,
  onClick,
}: StatsWidgetProps) {
  // 1. Loading State (Skeleton)
  if (loading) {
    return (
      <Card
        className={cn(
          "rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900/50 backdrop-blur-sm",
          className
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-40" />
        </CardContent>
      </Card>
    );
  }

  // 2. Animated Render
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={cn(
        "h-full",
        onClick && "cursor-pointer transition-transform hover:scale-[1.02]"
      )}
    >
      <Card
        className={cn(
          "h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300",
          className
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide">
            {title}
          </CardTitle>
          <div className="p-2 bg-primary/10 rounded-full">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isCurrency && "$"}
            <NumberTicker
              value={
                typeof value === "string"
                  ? parseFloat(value.replace(/[^0-9.]/g, ""))
                  : value
              }
            />
          </div>
          {(trend || description) && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {trend && (
                <span
                  className={cn(
                    "font-medium",
                    trendUp ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {trendUp ? "+" : ""}
                  {trend}
                </span>
              )}
              <span className="opacity-80">{description}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
