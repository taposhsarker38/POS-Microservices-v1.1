"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { MoveRight, LayoutDashboard, LogIn, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      // eslint-disable-next-line
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Adaptix
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="#"
            className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600"
          >
            Features
          </Link>
          <Link
            href="#"
            className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600"
          >
            Pricing
          </Link>
          <Link
            href="#"
            className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600"
          >
            Enterprise
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Button
              onClick={() => router.push("/dashboard")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          ) : (
            <Button onClick={() => router.push("/login")} variant="outline">
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl text-purple-600 opacity-50"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl opacity-50"></div>
        </div>

        <div className="max-w-4xl w-full text-center z-10 space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            v1.1 System Online
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Enterprise Management <br />
            <span className="bg-linear-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Reimagined.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Adaptix is the unified platform for POS, Inventory, HR, and
            Accounting. Streamline your operations with AI-driven insights and
            real-time data.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {isAuthenticated ? (
              <Button
                onClick={() => router.push("/dashboard")}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 w-full sm:w-auto"
              >
                Go to Dashboard
                <MoveRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => router.push("/login")}
                size="lg"
                className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 w-full sm:w-auto"
              >
                Sign In to Workspace
                <MoveRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="lg"
              className="text-slate-600 dark:text-slate-400 w-full sm:w-auto"
            >
              View Documentation
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 text-left opacity-80">
            {[
              "Real-time Analytics",
              "Multi-Branch Support",
              "Smart Inventory",
              "Automated HRMS",
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
        &copy; 2025 Adaptix Enterprise. All rights reserved.
      </footer>
    </div>
  );
}
