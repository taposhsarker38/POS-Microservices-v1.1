"use client";

import { WeatherBackground } from "@/components/layout/WeatherBackground";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <WeatherBackground>
      <Loader2 className="h-10 w-10 animate-spin text-white/50" />
      <p className="mt-4 text-white/80 text-sm font-medium">Redirecting...</p>
    </WeatherBackground>
  );
}
