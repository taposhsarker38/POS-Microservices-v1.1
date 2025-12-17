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

const promotionSchema = z.object({
  employee: z.string().min(1, "Employee is required"),
  previous_designation: z.string().min(1, "Required"),
  new_designation: z.string().min(1, "Required"),
  promotion_date: z.string().min(1, "Date is required"),
  reason: z.string().optional(),
});

type PromotionFormValues = z.infer<typeof promotionSchema>;

interface PromotionFormProps {
  initialData?: any | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PromotionForm({
  initialData,
  onSuccess,
  onCancel,
}: PromotionFormProps) {
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    api.get("/hrms/employees/").then((res) => {
      setEmployees(res.data.results || res.data);
    });
  }, []);

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      employee: "",
      previous_designation: "",
      new_designation: "",
      promotion_date: new Date().toISOString().split("T")[0],
      reason: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        employee: initialData.employee.toString(),
        previous_designation: initialData.previous_designation,
        new_designation: initialData.new_designation,
        promotion_date: initialData.promotion_date,
        reason: initialData.reason,
      });
    }
  }, [initialData, form]);

  // Optionally auto-fill previous designation when employee selected
  const handleEmployeeChange = (empId: string) => {
    form.setValue("employee", empId);
    const emp = employees.find((e) => String(e.id) === empId);
    if (emp && emp.designation) {
      form.setValue("previous_designation", emp.designation.title || "");
    }
  };

  const onSubmit = async (values: PromotionFormValues) => {
    try {
      if (initialData) {
        await api.put(
          `/hrms/performance/promotions/${initialData.id}/`,
          values
        );
        toast.success("Promotion updated");
      } else {
        await api.post("/hrms/performance/promotions/", values);
        toast.success("Promotion recorded");
      }
      onSuccess();
    } catch (error) {
      toast.error("Failed to save promotion");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="employee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employee</FormLabel>
              <Select
                onValueChange={handleEmployeeChange}
                defaultValue={field.value}
                disabled={!!initialData}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.user.first_name} {emp.user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="previous_designation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Previous Role</FormLabel>
                <FormControl>
                  <Input placeholder="Associate" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="new_designation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Role</FormLabel>
                <FormControl>
                  <Input placeholder="Senior Associate" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="promotion_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Effective Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason/Remarks</FormLabel>
              <FormControl>
                <Textarea placeholder="Details..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Promotion</Button>
        </div>
      </form>
    </Form>
  );
}
