"use client";

import * as React from "react";
import {
  User,
  ShoppingBag,
  Award,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  CreditCard,
  MapPin,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const CustomerPortal: React.FC = () => {
  const [customer, setCustomer] = React.useState<any>(null);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchPortalData = React.useCallback(async () => {
    try {
      setLoading(true);
      // 1. Get my profile
      const customerRes = await api.get("/customer/profiles/me/");
      const customerData = customerRes.data;
      setCustomer(customerData);

      // 2. Get my orders using my customer ID
      if (customerData?.id) {
        const ordersRes = await api.get(`/pos/orders/my-orders/`, {
          params: { customer_id: customerData.id },
        });
        setOrders(ordersRes.data || []);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("Customer profile not linked to this account.");
      } else {
        toast.error("Failed to load portal data");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[120px] rounded-xl" />
          <Skeleton className="h-[120px] rounded-xl" />
          <Skeleton className="h-[120px] rounded-xl" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="bg-slate-100 p-6 rounded-full">
          <User className="h-12 w-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold">No Customer Profile Linked</h2>
        <p className="text-muted-foreground max-w-md">
          We couldn't find a customer profile associated with your user account.
          Please contact support to link your account.
        </p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const nextTierPoints =
    customer.tier === "ELITE"
      ? 0
      : customer.tier === "PLATINUM"
      ? 2000
      : customer.tier === "GOLD"
      ? 1000
      : 500;
  const progress =
    nextTierPoints > 0 ? (customer.loyalty_points / nextTierPoints) * 100 : 100;

  return (
    <div className="space-y-8">
      {/* Header / Profile Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/30">
            <User className="h-16 w-16" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl font-bold mb-1">{customer.name}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-blue-100 text-sm">
              <span className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" /> {customer.phone}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />{" "}
                {customer.address || "No address set"}
              </span>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20 text-center">
            <p className="text-xs uppercase tracking-wider text-blue-200 mb-1 font-semibold">
              Current Tier
            </p>
            <Badge
              variant="secondary"
              className="bg-blue-400 text-white border-none text-md px-3 py-1"
            >
              {customer.tier}
            </Badge>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-default border-none bg-slate-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" /> Loyalty Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.loyalty_points}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              {customer.tier !== "ELITE" ? (
                <>
                  <Progress value={progress} className="h-1 mb-1" />
                  <span>
                    {nextTierPoints - customer.loyalty_points} pts to{" "}
                    {customer.tier === "PLATINUM"
                      ? "ELITE"
                      : customer.tier === "GOLD"
                      ? "PLATINUM"
                      : "GOLD"}
                  </span>
                </>
              ) : (
                "You are at the highest tier!"
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-default border-none bg-slate-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-blue-500" /> Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              Last order:{" "}
              {orders.length > 0
                ? format(new Date(orders[0].created_at), "MMM d, yyyy")
                : "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-default border-none bg-slate-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-500" /> Active Promotions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <div className="mt-1 text-xs text-muted-foreground">
              No personalized offers at this time
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Orders and History */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="orders">Purchase History</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty Benefits</TabsTrigger>
          <TabsTrigger value="settings">Profile Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                View status and details of your purchases.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed rounded-xl">
                  <ShoppingBag className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">
                    You haven't made any purchases yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors text-blue-600">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">
                            Order #{order.order_number}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), "PPp")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="hidden md:block text-right">
                          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                            Total
                          </p>
                          <p className="font-bold">${order.grand_total}</p>
                        </div>
                        <Badge
                          className={
                            order.status === "completed"
                              ? "bg-green-100 text-green-700 hover:bg-green-100 border-none px-3"
                              : order.status === "cancelled"
                              ? "bg-red-100 text-red-700 hover:bg-red-100 border-none px-3"
                              : "bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3"
                          }
                        >
                          {order.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="group-hover:translate-x-1 transition-transform"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {orders.length > 0 && (
              <CardFooter className="justify-center border-t py-4">
                <Button
                  variant="link"
                  className="text-blue-600 font-semibold gap-2"
                >
                  View All Order History <ExternalLink className="h-4 w-4" />
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="loyalty">
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Tiers & Benefits</CardTitle>
              <CardDescription>
                See how you can earn more points and level up.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  {
                    tier: "SILVER",
                    range: "0 - 499 pts",
                    icon: Award,
                    color: "text-slate-400",
                    active: customer.tier === "SILVER",
                  },
                  {
                    tier: "GOLD",
                    range: "500 - 999 pts",
                    icon: Award,
                    color: "text-amber-500",
                    active: customer.tier === "GOLD",
                  },
                  {
                    tier: "PLATINUM",
                    range: "1,000 - 1,999 pts",
                    icon: Award,
                    color: "text-indigo-400",
                    active: customer.tier === "PLATINUM",
                  },
                  {
                    tier: "ELITE",
                    range: "2,000+ pts",
                    icon: Award,
                    color: "text-rose-500",
                    active: customer.tier === "ELITE",
                  },
                ].map((t) => (
                  <div
                    key={t.tier}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      t.active
                        ? "border-blue-500 bg-blue-50/50 shadow-sm"
                        : "border-transparent bg-slate-50 opacity-60"
                    }`}
                  >
                    <t.icon className={`h-8 w-8 mb-2 ${t.color}`} />
                    <h5 className="font-bold text-sm tracking-wide">
                      {t.tier}
                    </h5>
                    <p className="text-xs text-muted-foreground">{t.range}</p>
                    {t.active && (
                      <Badge className="mt-3 bg-blue-600">Active</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>
                Manage your personal information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Full Name
                  </label>
                  <p className="border-b py-2 text-md">{customer.name}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Phone Number
                  </label>
                  <p className="border-b py-2 text-md">{customer.phone}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Email Address
                  </label>
                  <p className="border-b py-2 text-md">
                    {customer.email || "Not provided"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Linked Account
                  </label>
                  <div className="flex items-center gap-2 py-2">
                    <Badge
                      variant="outline"
                      className="text-green-600 bg-green-50 border-green-200"
                    >
                      Verified
                    </Badge>
                    <span className="text-xs text-muted-foreground italic">
                      Linked to your current login
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
