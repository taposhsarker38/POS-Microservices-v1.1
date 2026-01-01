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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const projectSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  client_name: z.string().optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  status: z.string().default("PLANNING"),
  manager: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  initialData?: any | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProjectForm({
  initialData,
  onSuccess,
  onCancel,
}: ProjectFormProps) {
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    api.get("/hrms/employees/").then((res) => {
      setEmployees(res.data.results || res.data);
    });
  }, []);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      client_name: "",
      status: "PLANNING",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title,
        description: initialData.description,
        client_name: initialData.client_name,
        status: initialData.status,
        manager: initialData.manager ? String(initialData.manager) : undefined,
        start_date: initialData.start_date
          ? new Date(initialData.start_date)
          : undefined,
        end_date: initialData.end_date
          ? new Date(initialData.end_date)
          : undefined,
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: ProjectFormValues) => {
    try {
      const payload = {
        ...values,
        start_date: values.start_date
          ? format(values.start_date, "yyyy-MM-dd")
          : null,
        end_date: values.end_date
          ? format(values.end_date, "yyyy-MM-dd")
          : null,
      };

      handleApiSuccess(initialData ? "Project updated" : "Project created");
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Website Redesign" {...field} />
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

        <FormField
          control={form.control}
          name="client_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Name (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Client Co." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PLANNING">Planning</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
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
            name="manager"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Manager</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Manager" />
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
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Project</Button>
        </div>
      </form>
    </Form>
  );
}
