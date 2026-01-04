"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  manufacturingApi,
  WorkCenter,
  ProductionOrder,
} from "@/lib/api/manufacturing";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ShopFloorPage() {
  const [selectedCenter, setSelectedCenter] = React.useState<string>("all");
  const queryClient = useQueryClient();

  // Data Fetching
  const { data: workCenters, isLoading: loadingCenters } = useQuery({
    queryKey: ["mfg", "work-centers"],
    queryFn: manufacturingApi.getWorkCenters,
  });

  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ["mfg", "orders"],
    queryFn: manufacturingApi.getOrders,
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      manufacturingApi.updateOrder(id, { status: status as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mfg", "orders"] });
      toast.success("Order status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  // Filter Logic
  const filteredOrders =
    orders?.filter(
      (o) =>
        selectedCenter === "all" || o.work_center?.toString() === selectedCenter
    ) || [];

  // Group by Status
  const todoOrders = filteredOrders.filter((o) =>
    ["DRAFT", "CONFIRMED"].includes(o.status)
  );
  const inProgressOrders = filteredOrders.filter(
    (o) => o.status === "IN_PROGRESS"
  );
  const completedOrders = filteredOrders.filter((o) =>
    ["COMPLETED", "QUALITY_CHECK"].includes(o.status)
  );

  if (loadingCenters || loadingOrders) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Shop Floor Control
        </h2>
        <div className="flex items-center space-x-2">
          <Select value={selectedCenter} onValueChange={setSelectedCenter}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select Work Center" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Work Centers</SelectItem>
              {workCenters?.map((wc) => (
                <SelectItem key={wc.id} value={wc.id.toString()}>
                  {wc.name} ({wc.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="todo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="todo">To Do ({todoOrders.length})</TabsTrigger>
          <TabsTrigger value="process">
            In Progress ({inProgressOrders.length})
          </TabsTrigger>
          <TabsTrigger value="done">
            Completed ({completedOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todo" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {todoOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                actionLabel="Start Job"
                onAction={() =>
                  updateStatusMutation.mutate({
                    id: order.id,
                    status: "IN_PROGRESS",
                  })
                }
                icon={<Play className="mr-2 h-4 w-4" />}
                variant="default"
              />
            ))}
            {todoOrders.length === 0 && <EmptyState />}
          </div>
        </TabsContent>

        <TabsContent value="process" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inProgressOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                actionLabel="Complete Job"
                onAction={() =>
                  updateStatusMutation.mutate({
                    id: order.id,
                    status: "QUALITY_CHECK",
                  })
                }
                icon={<CheckCircle className="mr-2 h-4 w-4" />}
                variant="secondary"
              />
            ))}
            {inProgressOrders.length === 0 && <EmptyState />}
          </div>
        </TabsContent>

        <TabsContent value="done" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                actionLabel="Archive"
                onAction={() => {}}
                icon={<CheckCircle className="mr-2 h-4 w-4" />}
                variant="outline"
                disabled
              />
            ))}
            {completedOrders.length === 0 && <EmptyState />}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrderCard({
  order,
  actionLabel,
  onAction,
  icon,
  variant = "default",
  disabled = false,
}: {
  order: ProductionOrder;
  actionLabel: string;
  onAction: () => void;
  icon: React.ReactNode;
  variant?: "default" | "secondary" | "outline";
  disabled?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Order #{order.id}</CardTitle>
        <Badge
          variant={order.status === "IN_PROGRESS" ? "default" : "secondary"}
        >
          {order.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{order.quantity_planned} Units</div>
        <p className="text-xs text-muted-foreground">
          Product:{" "}
          {order.product_name || order.product_uuid.substring(0, 8) + "..."}
        </p>
        <div className="mt-4 flex items-center space-x-2 text-sm text-muted-foreground">
          <div className="flex-1">
            <span className="block text-xs font-semibold uppercase">
              Work Center
            </span>
            {order.work_center_name || "Unassigned"}
          </div>
          <div className="flex-1 text-right">
            <span className="block text-xs font-semibold uppercase">
              Due Date
            </span>
            {order.due_date || "No Date"}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={variant as any}
          onClick={onAction}
          disabled={disabled}
        >
          {icon}
          {actionLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex h-[200px] flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground">
      <AlertCircle className="mb-2 h-10 w-10 opacity-20" />
      <p>No orders in this stage.</p>
    </div>
  );
}
