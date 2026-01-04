"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { handleApiError } from "@/lib/api-handler";

const poSchema = z.object({
  product_uuid: z.string().min(1, "Product is required"),
  bom: z.coerce.number().optional(), // ID of BOM
  work_center: z.coerce.number().optional().nullable(),
  quantity_planned: z.coerce.number().min(1),
  status: z.string().default("DRAFT"),
  target_warehouse_uuid: z.string().optional().nullable(),
  notes: z.string().optional(),
});

type POFormValues = z.infer<typeof poSchema>;

interface ProductionOrderFormProps {
  initialData?: any | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductionOrderForm({
  initialData,
  onSuccess,
  onCancel,
}: ProductionOrderFormProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [workCenters, setWorkCenters] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stockCheckResult, setStockCheckResult] = useState<any>(null);

  useEffect(() => {
    api.get("/product/products/").then((res) => {
      const data = res.data.results || res.data;
      setProducts(Array.isArray(data) ? data : []);
    });
    api.get("/manufacturing/boms/").then((res) => {
      const data = res.data.results || res.data;
      setBoms(Array.isArray(data) ? data : []);
    });
    api.get("/manufacturing/work-centers/").then((res) => {
      const data = res.data.results || res.data;
      setWorkCenters(Array.isArray(data) ? data : []);
    });
    api.get("/inventory/warehouses/").then((res) => {
      const data = res.data.results || res.data;
      setWarehouses(Array.isArray(data) ? data : []);
    });
  }, []);

  const form = useForm<POFormValues>({
    resolver: zodResolver(poSchema) as any,
    defaultValues: {
      quantity_planned: 1,
      status: "DRAFT",
      notes: "",
    },
  });

  const selectedProduct = form.watch("product_uuid");
  const filteredBoms = useMemo(
    () => boms.filter((b) => b.product_uuid === selectedProduct),
    [boms, selectedProduct]
  );

  // Auto-select BOM if only one exists for product
  useEffect(() => {
    if (selectedProduct && filteredBoms.length === 1) {
      const currentBom = form.getValues("bom");
      if (currentBom !== filteredBoms[0].id) {
        form.setValue("bom", filteredBoms[0].id);
      }
    }
  }, [selectedProduct, filteredBoms, form]);

  useEffect(() => {
    if (initialData) {
      console.log("[DEBUG] Form Reset with initialData:", initialData);
      form.reset({
        product_uuid: initialData.product_uuid,
        bom: initialData.bom
          ? Number(initialData.bom.id || initialData.bom)
          : undefined,
        work_center: initialData.work_center
          ? Number(initialData.work_center.id || initialData.work_center)
          : null,
        quantity_planned: Number(initialData.quantity_planned),
        status: initialData.status,
        target_warehouse_uuid: initialData.target_warehouse_uuid || null,
        notes: initialData.notes || "",
      });
    }
  }, [initialData, form]);

  const checkStock = async () => {
    const bomId = form.getValues("bom");
    const qty = form.getValues("quantity_planned");
    if (!bomId) {
      toast.error("Please select a Recipe (BOM) first");
      return;
    }

    try {
      const res = await api.post("/manufacturing/orders/check-availability/", {
        bom_id: bomId,
        quantity: qty,
      });
      setStockCheckResult(res.data);
    } catch (e) {
      toast.error("Failed to check stock");
    }
  };

  const onSubmit = async (values: POFormValues) => {
    console.log("[DEBUG] Submitting PO Form Values:", values);
    try {
      if (initialData?.id) {
        await api.put(`/manufacturing/orders/${initialData.id}/`, values);
        toast.success("Production Order updated");
      } else {
        await api.post("/manufacturing/orders/", values);
        toast.success("Production Order created");
      }
      onSuccess();
    } catch (error: any) {
      handleApiError(error, form);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="product_uuid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                key={`prod-${products.length}-${field.value || "new"}`}
              >
                <FormControl>
                  <SelectTrigger disabled={!!initialData}>
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Array.isArray(products) &&
                    products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipe (BOM)</FormLabel>
              <Select
                key={`bom-${filteredBoms.length}-${field.value || "none"}`}
                onValueChange={(val) => field.onChange(Number(val))}
                value={field.value ? String(field.value) : ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        filteredBoms.length === 0
                          ? "No BOMs found"
                          : "Select Recipe"
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Array.isArray(filteredBoms) &&
                    filteredBoms.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name} (Output: {b.quantity})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="work_center"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Center / Machine</FormLabel>
              <Select
                key={`wc-${workCenters.length}-${field.value || "none"}`}
                onValueChange={(val) => {
                  if (val === "none") {
                    field.onChange(null);
                  } else {
                    field.onChange(Number(val));
                  }
                }}
                value={
                  field.value !== undefined && field.value !== null
                    ? String(field.value)
                    : "none"
                }
              >
                <FormControl>
                  <SelectTrigger aria-label="Select Work Center">
                    <SelectValue
                      placeholder={
                        !Array.isArray(workCenters)
                          ? "Loading..."
                          : workCenters.length === 0
                          ? "No Work Centers found"
                          : "Select Work Center (Optional)"
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None / Manual</SelectItem>
                  {Array.isArray(workCenters) &&
                    workCenters.length > 0 &&
                    workCenters.map((wc) => (
                      <SelectItem key={wc.id} value={String(wc.id)}>
                        {wc.name} ({wc.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="target_warehouse_uuid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destination Warehouse (for Finished Goods)</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || undefined}
              >
                <FormControl>
                  <SelectTrigger className="border-emerald-200 bg-emerald-50/20">
                    <SelectValue placeholder="Select Factory/Showroom" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Array.isArray(warehouses) &&
                    warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.type})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity_planned"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity to Produce</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input type="number" step="1" {...field} />
                </FormControl>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={checkStock}
                  disabled={!form.watch("bom")}
                >
                  Check Stock
                </Button>
              </div>
              <FormMessage />
              {stockCheckResult && (
                <div
                  className={`text-sm mt-2 p-2 rounded border ${
                    stockCheckResult.status === "AVAILABLE"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  {stockCheckResult.status === "AVAILABLE" ? (
                    <div className="flex items-center">
                      <span className="mr-2">✅</span>
                      Materials Available
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold flex items-center">
                        <span className="mr-2">❌</span>
                        Material Shortage
                      </div>
                      <ul className="list-disc list-inside mt-1 text-xs">
                        {stockCheckResult.shortages?.map((s: any) => (
                          <li key={s.component_uuid}>
                            Missing {s.shortage} units (Have: {s.available},
                            Need: {s.needed})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {initialData?.operation_trackers &&
          initialData.operation_trackers.length > 0 && (
            <div className="space-y-2 border-t pt-4 bg-secondary/5 p-3 rounded-lg border">
              <FormLabel className="flex items-center gap-2">
                ⚒️ Operation Tracking
                <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full font-normal">
                  {
                    initialData.operation_trackers.filter(
                      (o: any) => o.status === "COMPLETED"
                    ).length
                  }{" "}
                  / {initialData.operation_trackers.length} Done
                </span>
              </FormLabel>
              <div className="space-y-2 mt-2">
                {initialData.operation_trackers.map((op: any) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between p-2 border rounded-md bg-background shadow-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-xs">
                        {op.sequence}. {op.operation_name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] uppercase font-bold ${
                            op.status === "COMPLETED"
                              ? "text-green-600"
                              : op.status === "IN_PROGRESS"
                              ? "text-blue-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          {op.status}
                        </span>
                        {op.actual_time_minutes > 0 && (
                          <span className="text-[9px] text-muted-foreground">
                            | ⏱️ {op.actual_time_minutes}m
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      {op.status === "PENDING" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] px-3"
                          onClick={async () => {
                            try {
                              await api.post(
                                `/manufacturing/operation-trackers/${op.id}/start/`
                              );
                              toast.success("Operation started");
                              onSuccess(); // Refresh
                            } catch (e) {
                              toast.error("Failed to start operation");
                            }
                          }}
                        >
                          Start
                        </Button>
                      )}
                      {op.status === "IN_PROGRESS" && (
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-[10px] px-3 bg-green-600 hover:bg-green-700 text-white"
                          onClick={async () => {
                            try {
                              await api.post(
                                `/manufacturing/operation-trackers/${op.id}/complete/`
                              );
                              toast.success("Operation completed");
                              onSuccess(); // Refresh
                            } catch (e) {
                              toast.error("Failed to complete operation");
                            }
                          }}
                        >
                          Done
                        </Button>
                      )}
                      {op.status === "COMPLETED" && (
                        <span className="text-green-600 text-[10px] font-bold px-2 py-1 bg-green-50 rounded italic">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Any instructions..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Order</Button>
        </div>
      </form>
    </Form>
  );
}
