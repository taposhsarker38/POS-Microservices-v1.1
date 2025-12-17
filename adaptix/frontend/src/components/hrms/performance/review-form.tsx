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

const reviewSchema = z.object({
  employee: z.string().min(1, "Employee is required"),
  period_name: z.string().min(2, "Period name is required"),
  review_date: z.string().min(1, "Date is required"),
  rating: z.coerce.number().min(1).max(5),
  comments: z.string().min(1, "Comments are required"),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  initialData?: any | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReviewForm({
  initialData,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    api.get("/hrms/employees/").then((res) => {
      setEmployees(res.data.results || res.data);
    });
  }, []);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      employee: "",
      period_name: "",
      review_date: new Date().toISOString().split("T")[0],
      rating: 3,
      comments: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        employee: initialData.employee.toString(),
        period_name: initialData.period_name,
        review_date: initialData.review_date,
        rating: initialData.rating,
        comments: initialData.comments,
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: ReviewFormValues) => {
    try {
      if (initialData) {
        await api.put(`/hrms/performance/reviews/${initialData.id}/`, values);
        toast.success("Review updated");
      } else {
        await api.post("/hrms/performance/reviews/", values);
        toast.success("Review submitted");
      }
      onSuccess();
    } catch (error) {
      toast.error("Failed to save review");
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
                onValueChange={field.onChange}
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
                      {emp.user.first_name} {emp.user.last_name} (
                      {emp.employee_id})
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
            name="period_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Period Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Annual 2024" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="review_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Review Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating (1-5)</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(Number(v))}
                defaultValue={String(field.value)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Rating" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1">1 - Poor</SelectItem>
                  <SelectItem value="2">2 - Needs Improvement</SelectItem>
                  <SelectItem value="3">3 - Satisfactory</SelectItem>
                  <SelectItem value="4">4 - Good</SelectItem>
                  <SelectItem value="5">5 - Excellent</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reviewer Comments</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detailed feedback..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Submit Review</Button>
        </div>
      </form>
    </Form>
  );
}
