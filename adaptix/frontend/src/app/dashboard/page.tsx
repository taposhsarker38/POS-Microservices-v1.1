"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  DollarSign,
  Users,
  TrendingUp,
  Package,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const salesData = [
  { name: "Jan", total: 4200 },
  { name: "Feb", total: 3800 },
  { name: "Mar", total: 5100 },
  { name: "Apr", total: 4600 },
  { name: "May", total: 6200 },
  { name: "Jun", total: 5800 },
];

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 animate-in fade-in duration-700">
      {/* Header - Smaller */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Welcome back! Here's your overview.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Live
          </span>
        </div>
      </div>

      {/* Stats Grid - Lighter colors, smaller */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-violet-100 dark:border-violet-900/30 bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Total Revenue
            </CardTitle>
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <DollarSign className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              $67,231
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              <p className="text-xs text-emerald-600">+24.5%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-cyan-100 dark:border-cyan-900/30 bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-950/20 dark:to-blue-950/20 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Customers
            </CardTitle>
            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
              <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              2,847
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              <p className="text-xs text-emerald-600">+18.2%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-100 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Orders
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <ShoppingCart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              1,429
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              <p className="text-xs text-emerald-600">+12.8%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Active Now
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              +847
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Activity className="h-3 w-3 text-emerald-600 animate-pulse" />
              <p className="text-xs text-emerald-600">+312</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts - Smaller height */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">
                Sales Overview
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-violet-400" />
                <span>Monthly</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={salesData}>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="total" fill="#a78bfa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  name: "Sarah J.",
                  email: "sarah.j@email.com",
                  amount: "+$2,499",
                  color:
                    "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
                },
                {
                  name: "Michael C.",
                  email: "m.chen@email.com",
                  amount: "+$1,299",
                  color:
                    "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400",
                },
                {
                  name: "Emma W.",
                  email: "emma.w@email.com",
                  amount: "+$899",
                  color:
                    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
                },
                {
                  name: "James B.",
                  email: "j.brown@email.com",
                  amount: "+$649",
                  color:
                    "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-lg transition-colors"
                >
                  <div
                    className={`h-8 w-8 rounded-full ${item.color} flex items-center justify-center text-xs font-semibold`}
                  >
                    {item.name.split(" ")[0][0]}
                    {item.name.split(" ")[1][0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.email}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {item.amount}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Compact */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-l-2 border-l-violet-400 hover:shadow-sm transition-shadow">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Package className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Low Stock
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  23
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-2 border-l-amber-400 hover:shadow-sm transition-shadow">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Pending
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  12
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-2 border-l-emerald-400 hover:shadow-sm transition-shadow">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">New</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  +156
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
