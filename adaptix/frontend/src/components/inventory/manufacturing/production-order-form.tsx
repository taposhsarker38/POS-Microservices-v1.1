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
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

const poSchema = z.object({
  product_uuid: z.string().min(1, "Product is required"),
  bom: z.coerce.number().optional(), // ID of BOM
  quantity_planned: z.coerce.number().min(1),
  status: z.string().default("DRAFT"),
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
  const [stockCheckResult, setStockCheckResult] = useState<any>(null);

  // Import implicitly or use api directly? existing code uses `api` defaulting to axios instance.
  // I created `manufacturingApi` but need to import it.
  // Let's import it at top or use dynamic import if needed, but standard import is better.

  useEffect(() => {
    api.get("/product/products/").then((res) => {
      setProducts(res.data.results || res.data);
    });
    api.get("/inventory/manufacturing/boms/").then((res) => {
      setBoms(res.data.results || res.data);
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
  const filteredBoms = boms.filter((b) => b.product_uuid === selectedProduct);

  // Auto-select BOM if only one exists for product
  useEffect(() => {
    if (selectedProduct && filteredBoms.length === 1) {
      form.setValue("bom", filteredBoms[0].id);
    }
  }, [selectedProduct, filteredBoms, form]);

  useEffect(() => {
    if (initialData) {
      form.reset({
        product_uuid: initialData.product_uuid,
        bom: initialData.bom,
        quantity_planned: initialData.quantity_planned,
        status: initialData.status,
        notes: initialData.notes,
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

    // We can use the generic 'api' valid for now if we don't want to import separate file
    // But I added logic to manufacturingApi. Let's try to use `api` client with raw endpoint
    // to avoid import errors if I didn't add the import statement yet.
    try {
      const res = await api.post(
        "/inventory/manufacturing/orders/check-availability/",
        {
          bom_id: bomId,
          quantity: qty,
        }
      );
      setStockCheckResult(res.data);
    } catch (e) {
      toast.error("Failed to check stock");
    }
  };

  const onSubmit = async (values: POFormValues) => {
    try {
      if (initialData?.id) {
        await api.put(
          `/inventory/manufacturing/orders/${initialData.id}/`,
          values
        );
        toast.success("Production Order updated");
      } else {
        await api.post("/inventory/manufacturing/orders/", values);
        toast.success("Production Order created");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to save order");
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products.map((p) => (
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
                onValueChange={(val) => field.onChange(Number(val))}
                value={field.value ? String(field.value) : undefined}
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
                  {filteredBoms.map((b) => (
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
