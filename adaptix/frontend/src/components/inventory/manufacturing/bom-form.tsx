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
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { handleApiError } from "@/lib/api-handler";
import { Plus, Trash2 } from "lucide-react";

const bomSchema = z.object({
  product_uuid: z.string().min(1, "Product is required"),
  name: z.string().min(2, "Name is required"),
  quantity: z.string(),
  items: z
    .array(
      z.object({
        component_uuid: z.string().min(1, "Component required"),
        quantity: z.string(),
        waste_percentage: z.string().optional(),
      })
    )
    .min(1, "At least one item required"),
});

type BOMFormValues = z.infer<typeof bomSchema>;

interface BOMFormProps {
  initialData?: any | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BOMForm({ initialData, onSuccess, onCancel }: BOMFormProps) {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    // Fetch products for selection
    api.get("/product/products/").then((res) => {
      setProducts(res.data.results || res.data);
    });
  }, []);

  const form = useForm<BOMFormValues>({
    resolver: zodResolver(bomSchema) as any,
    defaultValues: {
      name: "",
      quantity: "1",
      items: [{ quantity: "1", waste_percentage: "0", component_uuid: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        product_uuid: initialData.product_uuid,
        name: initialData.name,
        quantity: String(initialData.quantity),
        items:
          initialData.items?.map((i: any) => ({
            ...i,
            quantity: String(i.quantity),
            waste_percentage: String(i.waste_percentage || 0),
          })) || [],
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: BOMFormValues) => {
    try {
      const payload = {
        ...values,
        quantity: parseFloat(values.quantity),
        items: values.items.map((i) => ({
          ...i,
          quantity: parseFloat(i.quantity),
          waste_percentage: i.waste_percentage
            ? parseFloat(i.waste_percentage)
            : 0,
        })),
      };

      if (initialData) {
        await api.put(
          `/inventory/manufacturing/boms/${initialData.id}/`,
          payload
        );
        toast.success("BOM updated");
      } else {
        const { items, ...bomData } = payload;
        const res = await api.post("/inventory/manufacturing/boms/", bomData);
        const bomId = res.data.id;

        // Add items
        for (const item of items) {
          await api.post(`/inventory/manufacturing/boms/${bomId}/add_item/`, {
            component_uuid: item.component_uuid,
            quantity: item.quantity,
            waste_percentage: item.waste_percentage,
          });
        }

        toast.success("BOM created");
      }
      onSuccess();
      onSuccess();
    } catch (error: any) {
      handleApiError(error, form);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 max-h-[80vh] overflow-y-auto px-1"
      >
        <FormField
          control={form.control}
          name="product_uuid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product (Output)</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={!!initialData}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Product to Build" />
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipe Name</FormLabel>
              <FormControl>
                <Input placeholder="standard v1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Output Quantity</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <FormLabel>Ingredients / Components</FormLabel>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                append({
                  component_uuid: "",
                  quantity: "1",
                  waste_percentage: "0",
                })
              }
            >
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </div>

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex space-x-2 items-end border p-2 rounded-md"
            >
              <FormField
                control={form.control}
                name={`items.${index}.component_uuid`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs">Component</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select Component" />
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
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`items.${index}.quantity`}
                render={({ field }) => (
                  <FormItem className="w-24">
                    <FormLabel className="text-xs">Qty</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        className="h-8"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save BOM</Button>
        </div>
      </form>
    </Form>
  );
}
