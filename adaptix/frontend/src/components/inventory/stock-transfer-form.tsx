"use client";

import { useForm, useFieldArray } from "react-hook-form";
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
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

const transferSchema = z.object({
  source_warehouse: z.string().min(1, "Source warehouse is required"),
  destination_warehouse: z.string().min(1, "Destination warehouse is required"),
  reference_no: z.string().min(2, "Reference number is required"),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        product_uuid: z.string().min(1, "Product is required"),
        quantity: z.coerce.number().min(0.001, "Quantity must be > 0"),
      })
    )
    .min(1, "At least one item is required"),
});

type TransferFormValues = z.infer<typeof transferSchema>;

interface StockTransferFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function StockTransferForm({
  onSuccess,
  onCancel,
}: StockTransferFormProps) {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    api
      .get("/inventory/warehouses/")
      .then((res) => setWarehouses(res.data.results || res.data));
    api
      .get("/product/products/")
      .then((res) => setProducts(res.data.results || res.data));
  }, []);

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema) as any,
    defaultValues: {
      reference_no: `TRF-${Date.now().toString().slice(-6)}`,
      items: [{ product_uuid: "", quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const onSubmit = async (values: TransferFormValues) => {
    try {
      if (values.source_warehouse === values.destination_warehouse) {
        toast.error("Source and destination warehouses cannot be the same");
        return;
      }
      await api.post("/inventory/transfers/", values);
      toast.success("Stock transfer created as Draft");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to create transfer");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="source_warehouse"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From (Source)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Warehouse" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
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
            name="destination_warehouse"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To (Destination)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Warehouse" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="reference_no"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference #</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Items to Transfer</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ product_uuid: "", quantity: 1 })}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </div>

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex gap-4 items-end animate-in fade-in slide-in-from-top-1"
            >
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name={`items.${index}.product_uuid`}
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="w-32">
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-red-500"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Create Transfer</Button>
        </div>
      </form>
    </Form>
  );
}
