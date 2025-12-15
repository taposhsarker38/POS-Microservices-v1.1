"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg" | "xl";
  variant?: "default" | "primary" | "secondary" | "white";
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4",
  default: "h-6 w-6",
  lg: "h-10 w-10",
  xl: "h-16 w-16",
};

const colorClasses = {
  default: "text-muted-foreground",
  primary: "text-emerald-600 dark:text-emerald-500",
  secondary: "text-violet-600 dark:text-violet-500",
  white: "text-white",
};

export function Loader({
  size = "default",
  variant = "primary",
  text,
  fullScreen = false,
  className,
  ...props
}: LoaderProps) {
  const Content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className
      )}
      {...props}
    >
      <Loader2
        className={cn("animate-spin", sizeClasses[size], colorClasses[variant])}
      />
      {text && (
        <p
          className={cn(
            "text-sm font-medium animate-pulse",
            colorClasses[variant]
          )}
        >
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
        {Content}
      </div>
    );
  }

  return Content;
}
