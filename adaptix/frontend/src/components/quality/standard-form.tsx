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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  product_uuid: z.string().min(1, "Product is required"),
  name: z.string().min(2, "Name is required"),
  criteria: z.string().min(5, "Criteria description required"),
  tolerance_min: z.string().optional(),
  tolerance_max: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface StandardFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function StandardForm({ onSuccess, onCancel }: StandardFormProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    // Fetch products for dropdown
    api
      .get("/product/products/")
      .then((res) => {
        setProducts(res.data.results || []);
      })
      .catch(console.error);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_uuid: "",
      name: "",
      criteria: "",
      tolerance_min: "",
      tolerance_max: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      const payload = {
        ...values,
        tolerance_min: values.tolerance_min
          ? parseFloat(values.tolerance_min)
          : null,
        tolerance_max: values.tolerance_max
          ? parseFloat(values.tolerance_max)
          : null,
      };
      await api.post("/quality/standards/", payload);
      onSuccess();
    } catch (error) {
      console.error("Failed to create standard", error);
    } finally {
      setLoading(false);
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
                    <SelectValue placeholder="Select product" />
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
              <FormLabel>Standard Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Weight Check" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="criteria"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Criteria</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe passing criteria..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tolerance_min"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Tolerance</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tolerance_max"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Tolerance</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Standard
          </Button>
        </div>
      </form>
    </Form>
  );
}
