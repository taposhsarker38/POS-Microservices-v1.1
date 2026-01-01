"use client";

import { useFieldArray, useForm } from "react-hook-form";
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
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { handleApiError, handleApiSuccess } from "@/lib/api-handler";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// Schema
const journalSchema = z.object({
  date: z.string(),
  reference: z.string().optional(),
  wing_uuid: z.string().min(1, "Branch is required"),
  description: z.string().optional(),
  items: z
    .array(
      z.object({
        account: z.string().min(1, "Account required"),
        debit: z.coerce.number().min(0).default(0),
        credit: z.coerce.number().min(0).default(0),
        description: z.string().optional(),
      })
    )
    .refine(
      (items) => {
        const totalDebit = items.reduce(
          (sum, item) => sum + (item.debit || 0),
          0
        );
        const totalCredit = items.reduce(
          (sum, item) => sum + (item.credit || 0),
          0
        ); // fixed
        return Math.abs(totalDebit - totalCredit) < 0.01;
      },
      { message: "Debits must equal Credits" }
    ),
});

type JournalFormValues = z.infer<typeof journalSchema>;

export function JournalEntryForm({
  onSuccess,
  initialCompanyId,
  initialWingId,
  entities = [],
}: {
  onSuccess?: () => void;
  initialCompanyId?: string;
  initialWingId?: string;
  entities?: any[];
}) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [wings, setWings] = useState<any[]>([]);

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema) as any,
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      reference: "",
      wing_uuid: initialWingId || "",
      description: "",
      items: [
        { account: "", debit: 0, credit: 0, description: "" },
        { account: "", debit: 0, credit: 0, description: "" },
      ],
    },
  });

  useEffect(() => {
    if (initialWingId) {
      form.setValue("wing_uuid", initialWingId);
    }
  }, [initialWingId, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    const fetchContextualData = async () => {
      const params = new URLSearchParams();
      if (initialCompanyId) params.append("company_uuid", initialCompanyId);

      api.get(`/accounting/accounts/?${params.toString()}`).then((res) => {
        setAccounts(res.data.results || res.data);
      });

      if (entities.length > 0) {
        let filteredWings = entities.filter((e) => e.type === "branch");
        if (initialCompanyId) {
          filteredWings = filteredWings.filter(
            (w) => w.company_id === initialCompanyId
          );
        }
        setWings(filteredWings);
      } else {
        api.get("/company/wings/").then((res) => {
          setWings(res.data.results || res.data);
        });
      }
    };
    fetchContextualData();
  }, [initialCompanyId, entities]);

  const onSubmit = async (values: JournalFormValues) => {
    try {
      await api.post("/accounting/journals/", {
        ...values,
      });
      handleApiSuccess("Transaction Posted");
      form.reset({
        date: new Date().toISOString().split("T")[0],
        reference: "",
        description: "",
        items: [
          { account: "", debit: 0, credit: 0, description: "" },
          { account: "", debit: 0, credit: 0, description: "" },
        ],
      });
      onSuccess?.();
    } catch (e: any) {
      handleApiError(e, form);
    }
  };

  const totalDebit = form
    .watch("items")
    .reduce((sum, i) => sum + (Number(i.debit) || 0), 0);
  const totalCredit = form
    .watch("items")
    .reduce((sum, i) => sum + (Number(i.credit) || 0), 0);
  const unbalanced = Math.abs(totalDebit - totalCredit).toFixed(2);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference</FormLabel>
                <FormControl>
                  <Input placeholder="INV-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="wing_uuid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch / Unit</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {wings.map((wing) => (
                      <SelectItem key={wing.id} value={wing.id}>
                        {wing.name} ({wing.code})
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Transaction summary..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border rounded-md p-4 bg-muted/20">
          <div className="mb-2 grid grid-cols-12 gap-2 text-sm font-medium">
            <div className="col-span-4">Account</div>
            <div className="col-span-3">Debit</div>
            <div className="col-span-3">Credit</div>
            <div className="col-span-1"></div>
          </div>
          {fields.map((fieldItem, index) => (
            <div
              key={fieldItem.id}
              className="grid grid-cols-12 gap-2 mb-2 items-start"
            >
              <div className="col-span-4">
                <FormField
                  control={form.control}
                  name={`items.${index}.account`}
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name={`items.${index}.debit`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name={`items.${index}.credit`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-2 flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ account: "", debit: 0, credit: 0, description: "" })
            }
          >
            <Plus className="mr-2 h-3 w-3" /> Add Line
          </Button>
        </div>

        <div className="flex justify-between items-center p-4 border rounded-md">
          <div>
            {form.formState.errors.items?.root && (
              <p className="text-red-500 text-sm">
                {form.formState.errors.items.root.message}
              </p>
            )}
            {Number(unbalanced) > 0 && (
              <p className="text-red-500 text-sm">Unbalanced: {unbalanced}</p>
            )}
          </div>
          <div className="text-right space-y-1">
            <div className="flex justify-end gap-4 text-sm">
              <span>
                Total Debit: <strong>{totalDebit.toFixed(2)}</strong>
              </span>
              <span>
                Total Credit: <strong>{totalCredit.toFixed(2)}</strong>
              </span>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={Number(unbalanced) > 0.01 || form.formState.isSubmitting}
        >
          Post Transaction
        </Button>
      </form>
    </Form>
  );
}
