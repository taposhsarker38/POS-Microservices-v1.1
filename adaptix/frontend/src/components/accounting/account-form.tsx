"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import { toast } from "sonner";
import { handleApiError, handleApiSuccess } from "@/lib/api-handler";
import { useEffect, useState } from "react";

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
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  group: z.string().min(1, "Group is required"),
  company_uuid: z.string().optional(),
  wing_uuid: z.string().optional(),
  opening_balance: z.coerce.number().default(0),
  is_active: z.boolean().default(true),
});

interface AccountFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
  groups: any[];
  companyId?: string;
  wingId?: string;
  targetName?: string;
  entities?: any[];
}

export function AccountForm({
  initialData,
  onSuccess,
  onCancel,
  groups,
  companyId,
  wingId,
  targetName,
  entities = [],
}: AccountFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      code: initialData?.code || "",
      group: initialData?.group ? String(initialData.group) : "",
      company_uuid: initialData?.company_uuid || companyId || "",
      wing_uuid: initialData?.wing_uuid || wingId || "",
      opening_balance: initialData?.opening_balance || 0,
      is_active: initialData?.is_active ?? true,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      const payload = {
        ...values,
        company_uuid:
          values.company_uuid ||
          companyId ||
          "00000000-0000-0000-0000-000000000000",
        wing_uuid: values.wing_uuid || wingId || null,
      };
      if (initialData) {
        await api.patch(`/accounting/accounts/${initialData.id}/`, payload);
        handleApiSuccess("Account updated");
      } else {
        await api.post("/accounting/accounts/", payload);
        handleApiSuccess("Account created");
      }
      onSuccess();
    } catch (error: any) {
      handleApiError(error, form);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {targetName && !initialData && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-2 px-3 rounded text-sm flex items-center gap-2 border border-blue-100 dark:border-blue-900/50">
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              Creating in:
            </span>
            <span className="font-bold">{targetName}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Cash in Hand" {...field} />
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
                <FormLabel>Account Code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 1001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="company_uuid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entity / Unit / Branch</FormLabel>
              <Select
                onValueChange={(val) => {
                  const entity = entities.find((e) => e.id === val);
                  if (entity?.type === "branch") {
                    form.setValue("company_uuid", entity.company_id);
                    form.setValue("wing_uuid", entity.id);
                  } else {
                    form.setValue("company_uuid", val);
                    form.setValue("wing_uuid", "");
                  }
                }}
                defaultValue={
                  initialData?.wing_uuid ||
                  initialData?.company_uuid ||
                  field.value
                }
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Entity / Unit / Branch" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem
                      key={e.id}
                      value={e.id}
                      className={e.type === "branch" ? "pl-6" : "font-bold"}
                    >
                      {e.type === "unit" ? "🏢" : "📍"} {e.name} (
                      {e.type === "unit" ? "Unit" : "Branch"})
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
          name="opening_balance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opening Balance (Starting Capital)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="group"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Group</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name} ({g.group_type})
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
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Active Status</FormLabel>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {initialData ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
