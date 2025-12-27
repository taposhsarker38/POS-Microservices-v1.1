"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  AlertCircle,
  Activity,
  Brain,
  Factory,
  RotateCcw,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { LiveClock } from "@/components/ui/LiveClock";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsWidget } from "@/components/dashboard/StatsWidget";
import { motion } from "framer-motion";
import { SalesTrendWidget } from "@/components/intelligence/sales-trend-widget";
import { StockoutModal } from "@/components/intelligence/stockout-modal";
import { ProductTour } from "@/components/onboarding/ProductTour";
import { useState } from "react";

const salesData = [
  { name: "Jan", total: 4200 },
  { name: "Feb", total: 3800 },
  { name: "Mar", total: 5100 },
  { name: "Apr", total: 4600 },
  { name: "May", total: 6200 },
  { name: "Jun", total: 5800 },
];

export default function DashboardPage() {
  const {
    analytics,
    recentOrders,
    lowStockCount,
    highRiskCount,
    manufacturingStats,
    returnStats,
    emiStats,
    isLoading,
  } = useDashboardStats();

  const [showStockoutModal, setShowStockoutModal] = useState(false);

  const salesTrend = (((analytics?.total_revenue || 0) * 0.1) / 100).toFixed(1);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 space-y-4 p-8 pt-6"
      >
        <div className="flex items-center justify-between space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-80" />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex-1 space-y-4 p-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            Dashboard
            <span className="text-xl font-normal text-muted-foreground hidden sm:inline-block">
              {" "}
              |{" "}
            </span>
            <LiveClock className="text-lg font-normal text-muted-foreground hidden sm:inline-block" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Welcome back! Here&apos;s your live overview.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 shadow-sm shadow-emerald-500/10">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            System Online
          </span>
        </div>
      </motion.div>
      {/* AI Intelligence Banner - NEW */}
      {highRiskCount > 0 && (
        <motion.div
          variants={item}
          className="bg-indigo-600 rounded-xl p-4 text-white flex items-center justify-between shadow-lg shadow-indigo-500/20"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold">AI Proactive Alert</p>
              <p className="text-sm text-indigo-100">
                AI has detected {highRiskCount} products with a critical
                stockout risk ( &gt; 70%) within 14 days.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
            onClick={() => setShowStockoutModal(true)}
          >
            Review Insights
          </Button>
        </motion.div>
      )}
      <SalesTrendWidget /> {/* Added SalesTrendWidget */}
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsWidget
          title="Total Revenue"
          value={analytics?.total_revenue || 0}
          icon={DollarSign}
          isCurrency
          trend={`+${salesTrend}%`}
          trendUp={true}
          description="from last month"
          loading={isLoading}
          delay={0.1}
        />
        <StatsWidget
          title="AI Risk Level"
          value={highRiskCount > 0 ? "High" : "Optimal"}
          icon={Brain}
          trend={highRiskCount > 0 ? `${highRiskCount} Risks` : "Safe"}
          trendUp={highRiskCount === 0}
          description="Predicted stockout threats"
          loading={isLoading}
          delay={0.2}
          onClick={() => setShowStockoutModal(true)}
        />
        <StatsWidget
          title="Products in Stock"
          value={analytics?.top_products?.length || 0}
          icon={Package}
          trend="+5"
          trendUp={true}
          description="new items added"
          loading={isLoading}
          delay={0.3}
        />
        <StatsWidget
          title="Low Stock Alerts"
          value={lowStockCount}
          icon={AlertCircle}
          trend={lowStockCount > 0 ? "Action Needed" : "All Good"}
          trendUp={lowStockCount === 0}
          description="items below reorder level"
          loading={isLoading}
          delay={0.4}
        />
        <StatsWidget
          title="Factory Output"
          value={manufacturingStats?.total_produced || 0}
          icon={Factory}
          trend={`${manufacturingStats?.total_defects || 0} Defects`}
          trendUp={(manufacturingStats?.total_defects || 0) === 0}
          description="units produced today"
          loading={isLoading}
          delay={0.5}
        />
        <StatsWidget
          title="Efficiency Rate"
          value={`${manufacturingStats?.efficiency_rate || 100}%`}
          icon={Activity}
          trend={
            (manufacturingStats?.efficiency_rate || 100) > 90
              ? "High Performance"
              : "Needs Attention"
          }
          trendUp={(manufacturingStats?.efficiency_rate || 100) > 90}
          description="yield rate (produced vs defects)"
          loading={isLoading}
          delay={0.6}
        />
        <StatsWidget
          title="Return Rate"
          value={`${returnStats?.return_rate || 0}%`}
          icon={RotateCcw}
          trend={`${returnStats?.total_refunds || 0} refunds`}
          trendUp={(returnStats?.return_rate || 0) < 5}
          description="of total sales volume"
          loading={isLoading}
          delay={0.7}
        />
        <StatsWidget
          title="EMI Performance"
          value={emiStats?.active_plans || 0}
          icon={CreditCard}
          trend={`${emiStats?.upcoming_installments || 0} due`}
          trendUp={true}
          description="active credit plans"
          loading={isLoading}
          delay={0.8}
        />
      </div>
      {/* Charts & Recent Orders */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <motion.div variants={item} className="col-span-4">
          <Card className="border-slate-200 dark:border-slate-800 h-full">
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
        </motion.div>

        {/* RECENT ORDERS */}
        <motion.div variants={item} className="col-span-3">
          <Card className="border-slate-200 dark:border-slate-800 h-full">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent orders found.
                  </p>
                ) : (
                  recentOrders.map((order, idx) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-lg transition-colors cursor-pointer group"
                    >
                      <div
                        className={`h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 flex items-center justify-center text-xs font-semibold group-hover:bg-violet-200 transition-colors`}
                      >
                        #{order.order_number.slice(-3)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {order.customer_name || "Walk-in Customer"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {format(new Date(order.created_at), "MMM d, h:mm a")}{" "}
                          • {order.items_count || "?"} items
                        </p>
                      </div>
                      <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        +${parseFloat(order.grand_total).toLocaleString()}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      {/* Quick Actions - Compact */}
      <motion.div variants={item} className="grid gap-3 md:grid-cols-3">
        <Card className="border-l-2 border-l-violet-400 hover:shadow-sm transition-shadow cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Package className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Quick Restock
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Create PO
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-2 border-l-amber-400 hover:shadow-sm transition-shadow cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <ShoppingCart className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  New Sale
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Open POS
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-2 border-l-emerald-400 hover:shadow-sm transition-shadow cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">New</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Add Customer
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <StockoutModal
        open={showStockoutModal}
        onOpenChange={setShowStockoutModal}
      />
      <ProductTour />
    </motion.div>
  );
}
