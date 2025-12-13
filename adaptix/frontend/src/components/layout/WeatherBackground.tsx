"use client";

import { useWeather } from "@/hooks/useWeather";
import { cn } from "@/lib/utils";
import {
  Cloud,
  CloudRain,
  Sun,
  Moon,
  CloudLightning,
  Snowflake,
} from "lucide-react";

interface WeatherBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function WeatherBackground({
  children,
  className,
}: WeatherBackgroundProps) {
  const { weather, loading } = useWeather();

  // Default gradient (Neutral)
  let bgClass =
    "bg-gradient-to-br from-slate-100 to-slate-300 dark:from-slate-900 dark:to-slate-800";
  let Icon = Sun;

  if (weather) {
    if (!weather.isDay) {
      // Night
      bgClass =
        "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white";
      Icon = Moon;
    } else {
      // Day
      const code = weather.weatherCode;
      if (code === 0 || code === 1) {
        // Clear / Sunny
        bgClass =
          "bg-gradient-to-br from-blue-300 via-cyan-200 to-yellow-100 dark:from-sky-900 dark:via-blue-800 dark:to-amber-900";
        Icon = Sun;
      } else if (code >= 2 && code <= 48) {
        // Cloudy / Fog
        bgClass =
          "bg-gradient-to-br from-gray-300 via-slate-300 to-zinc-400 dark:from-gray-800 dark:via-slate-800 dark:to-zinc-900";
        Icon = Cloud;
      } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
        // Rain
        bgClass =
          "bg-gradient-to-br from-slate-400 via-blue-400 to-blue-500 dark:from-slate-800 dark:via-blue-900 dark:to-blue-950";
        Icon = CloudRain;
      } else if (code >= 71 && code <= 77) {
        // Snow
        bgClass =
          "bg-gradient-to-br from-white via-cyan-100 to-blue-100 dark:from-slate-800 dark:via-cyan-900 dark:to-blue-950";
        Icon = Snowflake;
      } else if (code >= 95) {
        // Thunderstorm
        bgClass =
          "bg-gradient-to-br from-slate-700 via-purple-700 to-indigo-800 dark:from-slate-950 dark:via-purple-950 dark:to-indigo-950 text-white";
        Icon = CloudLightning;
      }
    }
  }

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col items-center justify-center transition-colors duration-1000",
        bgClass,
        className
      )}
    >
      {/* Weather Indicator (Top Right) */}
      <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-sm transition-opacity opacity-80 hover:opacity-100">
        {loading ? (
          <span className="text-xs">Loading weather...</span>
        ) : weather ? (
          <>
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">{weather.temperature}°C</span>
          </>
        ) : (
          <span className="text-xs">Locating...</span>
        )}
      </div>

      {children}
    </div>
  );
}
