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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { handleApiError, handleApiSuccess } from "@/lib/api-handler";

const kpiSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  target_value: z.coerce.number().min(0),
  unit: z.string().optional(),
  weightage: z.coerce.number().min(1).max(10).default(1),
  active: z.boolean().default(true),
});

type KPIFormValues = z.infer<typeof kpiSchema>;

interface KPIFormProps {
  initialData?: any | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function KPIForm({ initialData, onSuccess, onCancel }: KPIFormProps) {
  const form = useForm<KPIFormValues>({
    resolver: zodResolver(kpiSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      target_value: 0,
      unit: "",
      weightage: 1,
      active: true,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title,
        description: initialData.description,
        target_value: Number(initialData.target_value),
        unit: initialData.unit,
        weightage: initialData.weightage,
        active: initialData.active,
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: KPIFormValues) => {
    try {
      if (initialData) {
        await api.put(`/hrms/performance/kpis/${initialData.id}/`, values);
      } else {
        await api.post("/hrms/performance/kpis/", values);
      }
      handleApiSuccess(initialData ? "KPI updated" : "KPI created");
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Monthly Sales Target" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Details..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="target_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Value</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. USD, Score" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="weightage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weightage (1-10)</FormLabel>
              <FormControl>
                <Input type="number" min="1" max="10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Active</FormLabel>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Form>
  );
}
