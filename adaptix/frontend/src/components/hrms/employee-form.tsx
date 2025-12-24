"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import api from "@/lib/api";
import { toast } from "sonner";

const formSchema = z.object({
  first_name: z.string().min(1, "First Name is required"),
  last_name: z.string().min(1, "Last Name is required"),
  email: z.string().email(),
  phone: z.string().optional(),
  employee_code: z.string().min(1, "Code is required"),
  department: z.string().optional(),
  designation: z.string().optional(),
  salary_basic: z.coerce.number().min(0, "Salary must be positive"),
  joining_date: z.string().optional(),
  branch_uuid: z.string().optional(),
  current_shift: z.string().optional(),
});

interface EmployeeFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EmployeeForm({
  initialData,
  onSuccess,
  onCancel,
}: EmployeeFormProps) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [allShifts, setAllShifts] = useState<any[]>([]);

  useEffect(() => {
    // Fetch dependencies
    const loadMetadata = async () => {
      try {
        const [deptRes, posRes, compRes, shiftRes] = await Promise.all([
          api.get("/hrms/employees/departments/"),
          api.get("/hrms/employees/designations/"),
          api.get("/company/companies/"),
          api.get("/hrms/shifts/definitions/"),
        ]);
        setDepartments(deptRes.data.results || deptRes.data);
        setPositions(posRes.data.results || posRes.data);
        setBranches(compRes.data.results || compRes.data);

        const shiftData = shiftRes.data.results || shiftRes.data;
        setAllShifts(shiftData);
        setShifts(shiftData); // Default to all
      } catch (e) {
        console.error(e);
      }
    };
    loadMetadata();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      employee_code: initialData?.employee_code || "",
      department: initialData?.department || undefined,
      designation: initialData?.designation || undefined,
      salary_basic: initialData?.salary_basic
        ? parseFloat(initialData.salary_basic)
        : 0,
      joining_date:
        initialData?.joining_date || new Date().toISOString().split("T")[0],
      branch_uuid: initialData?.branch_uuid || "",
      current_shift: initialData?.current_shift || "",
    },
  });

  // Dynamic Shift Filtering
  const selectedBranchId = form.watch("branch_uuid");
  useEffect(() => {
    if (!selectedBranchId || !allShifts.length) {
      setShifts(allShifts);
      return;
    }
    const branch = branches.find((b) => b.id === selectedBranchId);
    if (branch) {
      const filtered = allShifts.filter(
        (s) =>
          s.branch_type === branch.entity_type || s.branch_type === "GENERAL"
      );
      setShifts(filtered);

      // Auto-reset shift if current one is not in filtered list
      const currentShift = form.getValues("current_shift");
      if (currentShift && !filtered.find((s) => s.id === currentShift)) {
        form.setValue("current_shift", "");
      }
    }
  }, [selectedBranchId, allShifts, branches, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (initialData) {
        await api.put(`/hrms/employees/list/${initialData.id}/`, values);
        toast.success("Employee updated");
      } else {
        await api.post("/hrms/employees/list/", values);
        toast.success("Employee created");
      }
      onSuccess();
    } catch (error: any) {
      console.error(error);
      if (error.response?.data?.email) {
        toast.error("Email already exists");
      } else {
        toast.error("Failed to save employee");
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="employee_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employee Code</FormLabel>
              <FormControl>
                <Input placeholder="EMP-001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="john@example.com"
                    type="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Dept" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
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
            name="designation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Position" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {positions.map((p) => (
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
        </div>

        <FormField
          control={form.control}
          name="salary_basic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Basic Salary</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="joining_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Joining Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="branch_uuid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to Company/Branch</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
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
            name="current_shift"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work Shift</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Shift" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {shifts.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.start_time}-{s.end_time})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Employee</Button>
        </div>
      </form>
    </Form>
  );
}
