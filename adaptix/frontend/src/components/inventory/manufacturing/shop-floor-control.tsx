"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Play,
  CheckCircle,
  Clock,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function ShopFloorControl() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = React.useState<any | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false);
  const [activeOperationId, setActiveOperationId] = React.useState<
    string | null
  >(null);

  // Fetch Production Orders (+ nested operations)
  const { data: orders, isLoading } = useQuery({
    queryKey: ["mfg", "shop-orders"],
    queryFn: () =>
      api
        .get("/manufacturing/orders/")
        .then((res) => res.data.results || res.data),
  });

  // Fetch HRM Employees for assignment
  const { data: employees = [] } = useQuery({
    queryKey: ["hrms", "employees"],
    queryFn: () =>
      api.get("/hrms/employees/").then((res) => {
        const data = res.data.results || res.data;
        return Array.isArray(data) ? data : [];
      }),
  });

  // Fetch Products for mapping
  const { data: products = [] } = useQuery({
    queryKey: ["product", "list"],
    queryFn: () =>
      api.get("/product/products/").then((res) => {
        const data = res.data.results || res.data;
        return Array.isArray(data) ? data : [];
      }),
  });

  // Helper to get product name
  const getProductName = (order: any) => {
    if (order.product_name) return order.product_name;

    // Safety check for products list (could be paginated or raw array)
    const productList = Array.isArray(products)
      ? products
      : (products as any)?.results || [];
    const prod = productList.find((p: any) => p.id === order.product_uuid);

    return prod
      ? prod.name
      : order.product_uuid
      ? order.product_uuid.slice(0, 8) + "..."
      : "Unknown";
  };

  const updateOpMutation = useMutation({
    mutationFn: ({ orderId, opId, data }: any) =>
      api.patch(`/manufacturing/orders/${orderId}/operations/${opId}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mfg", "shop-orders"] });
      toast.success("Task updated");
      setIsAssignModalOpen(false);
    },
  });

  const handleStatusUpdate = (
    orderId: string,
    opId: string,
    status: string
  ) => {
    const data: any = { status };
    if (status === "IN_PROGRESS") data.started_at = new Date().toISOString();
    if (status === "COMPLETED") data.completed_at = new Date().toISOString();
    updateOpMutation.mutate({ orderId, opId, data });
  };

  const handleAssignWorker = (workerUuid: string) => {
    if (!selectedOrder || !activeOperationId) return;
    const op = selectedOrder.operation_trackers.find(
      (o: any) => o.id === activeOperationId
    );
    const workerIds = [...(op?.assigned_worker_uuids || []), workerUuid];
    updateOpMutation.mutate({
      orderId: selectedOrder.id,
      opId: activeOperationId,
      data: { assigned_worker_uuids: workerIds },
    });
  };

  if (isLoading)
    return (
      <div className="p-8 text-center animate-pulse">
        Loading Shop Floor Data...
      </div>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Left List: Active Orders */}
      <div className="md:col-span-1 bg-white dark:bg-slate-950 border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-slate-50 dark:bg-slate-900">
          <h3 className="font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Active Work Orders
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {orders
            ?.filter((o: any) => o.status !== "COMPLETED")
            .map((order: any) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                  selectedOrder?.id === order.id
                    ? "bg-primary/5 border-primary shadow-sm"
                    : "bg-white dark:bg-slate-900"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-sm">PO-{order.id}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {order.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Product:{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {getProductName(order)}
                  </span>
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Users className="h-3 w-3 text-slate-400" />
                  <span className="text-[10px] font-medium text-slate-500">
                    {order.operation_trackers?.length || 0} Tasks
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Right List: Tasks & Control */}
      <div className="md:col-span-2 bg-white dark:bg-slate-950 border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {selectedOrder ? (
          <>
            <div className="p-4 border-b bg-primary/5 flex justify-between items-center">
              <div>
                <h3 className="font-bold">
                  Execution Plan: PO-{selectedOrder.id}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedOrder.source_order_number
                    ? `Project Link: ${selectedOrder.source_order_number}`
                    : "Internal Production"}
                </p>
              </div>
              <Badge variant="secondary" className="bg-white">
                {selectedOrder.quantity_planned} Units
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedOrder.operation_trackers?.map(
                (op: any, index: number) => (
                  <div key={op.id} className="relative pl-8 pb-4">
                    {/* Timeline connector */}
                    {index < selectedOrder.operation_trackers.length - 1 && (
                      <div className="absolute left-3 top-6 w-[2px] h-full bg-slate-100 dark:bg-slate-800" />
                    )}
                    <div
                      className={cn(
                        "absolute left-1 top-1 h-5 w-5 rounded-full border-2 bg-white dark:bg-slate-950 flex items-center justify-center z-10",
                        op.status === "COMPLETED"
                          ? "border-emerald-500 text-emerald-500"
                          : "border-slate-300"
                      )}
                    >
                      {op.status === "COMPLETED" ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <span className="text-[10px] font-bold">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    <div className="bg-white dark:bg-slate-900 border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-sm">
                            {op.operation_name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] uppercase",
                                op.status === "IN_PROGRESS"
                                  ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                                  : "bg-slate-50"
                              )}
                            >
                              {op.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {op.status === "PENDING" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleStatusUpdate(
                                  selectedOrder.id,
                                  op.id,
                                  "IN_PROGRESS"
                                )
                              }
                            >
                              <Play className="h-3 w-3 mr-1" /> Start
                            </Button>
                          )}
                          {op.status === "IN_PROGRESS" && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() =>
                                handleStatusUpdate(
                                  selectedOrder.id,
                                  op.id,
                                  "COMPLETED"
                                )
                              }
                            >
                              <CheckCircle className="h-3 w-3 mr-1" /> Done
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3 items-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Team:
                        </span>
                        {Array.isArray(op.assigned_worker_uuids) &&
                          op.assigned_worker_uuids.map((wId: string) => {
                            const emp = Array.isArray(employees)
                              ? employees.find((e: any) => e.id === wId)
                              : null;
                            return (
                              <Badge
                                key={wId}
                                variant="secondary"
                                className="rounded-full text-[10px] font-normal"
                              >
                                {emp
                                  ? `${emp.first_name} ${emp.last_name}`
                                  : wId.slice(0, 8)}
                              </Badge>
                            );
                          })}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-primary"
                          onClick={() => {
                            setActiveOperationId(op.id);
                            setIsAssignModalOpen(true);
                          }}
                        >
                          <UserPlus className="h-3 w-3 mr-1" /> Assign
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50">
            <Users className="h-12 w-12 mb-2" />
            <p>Select a Production Order to manage shop floor setup</p>
          </div>
        )}
      </div>

      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Professional to Task</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <Select onValueChange={handleAssignWorker}>
              <SelectTrigger>
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(employees) &&
                  employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This will add the employee to the task tracking logs for PO-
              {selectedOrder?.id}.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
