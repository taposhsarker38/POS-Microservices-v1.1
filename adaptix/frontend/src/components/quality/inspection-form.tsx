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
  reference_type: z.enum(["INVENTORY", "PRODUCTION", "RECEIVING"]),
  reference_uuid: z.string().min(1, "Reference ID is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface InspectionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function InspectionForm({ onSuccess, onCancel }: InspectionFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reference_type: "PRODUCTION",
      reference_uuid: "",
      notes: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      await api.post("/quality/inspections/", values);
      onSuccess();
    } catch (error) {
      console.error("Failed to create inspection", error);
      // In a real app, use toast here
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="reference_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="INVENTORY">Inventory</SelectItem>
                  <SelectItem value="PRODUCTION">Production Order</SelectItem>
                  <SelectItem value="RECEIVING">Receiving</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reference_uuid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference ID (UUID)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. PO-123 UUID" {...field} />
              </FormControl>
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
                <Textarea placeholder="Inspection notes..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Inspection
          </Button>
        </div>
      </form>
    </Form>
  );
}
