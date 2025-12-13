"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { WeatherBackground } from "@/components/layout/WeatherBackground";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Assuming auth-service exposes /auth/login/ endpoint via Kong
      // Adjust endpoint if necessary (e.g. /api/auth/token/)
      const response = await api.post("/auth/token/", {
        username: email, // Django defaults to username, but we might use email. Let's assume username for now or check auth service.
        password: password,
      });

      const { access, refresh } = response.data;

      localStorage.setItem("accessToken", access);
      localStorage.setItem("refreshToken", refresh);

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError("Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <WeatherBackground>
      <Card className="w-[90%] sm:w-87.5 shadow-2xl border-white/40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center bg-clip-text text-transparent bg-linear-to-r from-primary to-purple-600">
            Adaptix
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground/80">
            Enter your credentials to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid w-full items-center gap-4">
              {error && (
                <div
                  className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center animate-in fade-in slide-in-from-top-2"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="block sm:inline text-xs">{error}</span>
                </div>
              )}
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Username / Email</Label>
                <Input
                  id="email"
                  placeholder="admin"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/50 dark:bg-slate-900/50"
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/50 dark:bg-slate-900/50"
                />
              </div>
              <div className="flex items-center justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full shadow-lg hover:shadow-xl transition-all mt-6"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="underline hover:text-primary">
              Sign Up
            </Link>
          </div>
        </CardFooter>
      </Card>

      <div className="mt-8 text-center text-xs text-muted-foreground/60">
        © 2025 Adaptix Enterprise. All rights reserved.
      </div>
    </WeatherBackground>
  );
}
