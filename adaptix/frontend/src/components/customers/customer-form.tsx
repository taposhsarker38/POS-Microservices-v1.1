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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { DynamicAttributeRenderer } from "../shared/DynamicAttributeRenderer";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  loyalty_points: z.coerce.number().min(0).default(0),
  attribute_set: z.string().optional(),
  attributes: z.record(z.any()).default({}),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  initialData?: any | null;
  onSuccess: () => void;
  onCancel: () => void;
  attributeSets: any[];
  isAdmin?: boolean;
}

export function CustomerForm({
  initialData,
  onSuccess,
  onCancel,
  attributeSets,
}: CustomerFormProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      loyalty_points: 0,
      attribute_set: "",
      attributes: {},
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        phone: initialData.phone,
        email: initialData.email || "",
        address: initialData.address || "",
        loyalty_points: Number(initialData.loyalty_points || 0),
        attribute_set: initialData.attribute_set || "",
        attributes: initialData.attributes || {},
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      if (initialData) {
        await api.put(`/customer/customers/${initialData.id}/`, values);
        toast.success("Customer updated");
      } else {
        await api.post("/customer/customers/", values);
        toast.success("Customer created");
      }
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to save customer");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="john@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="123 Main St..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="attribute_set"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Attribute Set (Custom Fields)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Set" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {attributeSets.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch("attribute_set") &&
          form.watch("attribute_set") !== "none" && (
            <DynamicAttributeRenderer
              form={form}
              attributeSet={attributeSets.find(
                (s) => String(s.id) === form.watch("attribute_set")
              )}
            />
          )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? "Update Customer" : "Create Customer"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
