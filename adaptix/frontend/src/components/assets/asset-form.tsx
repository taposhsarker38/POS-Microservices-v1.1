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
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { handleApiError, handleApiSuccess } from "@/lib/api-handler";

const assetSchema = z.object({
  name: z.string().min(2, "Name required"),
  code: z.string().optional(),
  category: z.string().min(1, "Category required"),
  purchase_date: z.string(),
  purchase_cost: z.coerce.number().min(0),
  status: z.enum(["draft", "active", "maintenance", "retired", "disposed"]),
  notes: z.string().optional(),
  company_uuid: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

interface AssetFormProps {
  initialData?: any | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AssetForm({
  initialData,
  onSuccess,
  onCancel,
}: AssetFormProps) {
  const [categories, setCategories] = useState<any[]>([]);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema) as any, // Cast to any to bypass strict resolver type mismatch
    defaultValues: {
      name: "",
      code: "",
      category: "",
      purchase_date: new Date().toISOString().split("T")[0],
      purchase_cost: 0,
      status: "draft",
      notes: "",
      company_uuid: "dummy",
    },
  });

  useEffect(() => {
    // Fetch Categories
    api.get("/asset/categories/").then((res) => {
      setCategories(res.data.results || res.data);
    });

    if (initialData) {
      form.reset({
        name: initialData.name,
        code: initialData.code || "",
        category: initialData.category, // assuming ID
        purchase_date: initialData.purchase_date,
        purchase_cost: Number(initialData.purchase_cost),
        status: initialData.status,
        notes: initialData.notes || "",
        company_uuid: initialData.company_uuid,
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: AssetFormValues) => {
    try {
      const payload = {
        ...values,
        company_uuid: "dummy", // Middleware handles this usually, but model requires it
      };

      if (initialData) {
        await api.put(`/asset/assets/${initialData.id}/`, payload);
      } else {
        await api.post("/asset/assets/", payload);
      }
      handleApiSuccess(initialData ? "Asset updated" : "Asset created");
      onSuccess();
    } catch (error: any) {
      handleApiError(error, form);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Name</FormLabel>
                <FormControl>
                  <Input placeholder="MacBook Pro" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Tag / Code</FormLabel>
                <FormControl>
                  <Input placeholder="AST-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                    <SelectItem value="disposed">Disposed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="purchase_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="purchase_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Details..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? "Update Asset" : "Create Asset"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
