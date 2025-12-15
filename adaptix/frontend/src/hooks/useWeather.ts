"use client";

import { useState, useEffect } from "react";

interface WeatherData {
  temperature: number;
  weatherCode: number; // WMO code
  isDay: boolean;
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day`
          );
          const data = await res.json();
          setWeather({
            temperature: data.current.temperature_2m,
            weatherCode: data.current.weather_code,
            isDay: data.current.is_day === 1,
          });
        } catch (error) {
          console.error("Failed to fetch weather", error);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.warn("Geolocation denied or unavailable", error);
        setLoading(false);
      }
    );
  }, []);

  return { weather, loading };
}
