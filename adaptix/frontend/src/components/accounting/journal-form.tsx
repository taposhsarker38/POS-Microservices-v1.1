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
  voucher_type: z.enum(["receipt", "payment", "contra", "journal"]),
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
  initialData,
}: {
  onSuccess?: () => void;
  initialCompanyId?: string;
  initialWingId?: string;
  entities?: any[];
  initialData?: any;
}) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [wings, setWings] = useState<any[]>([]);

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema) as any,
    defaultValues: {
      date: initialData?.date || new Date().toISOString().split("T")[0],
      reference: initialData?.reference || "",
      wing_uuid:
        initialWingId ||
        (initialData?.wing_uuid ? initialData.wing_uuid : "MAIN_UNIT"),
      voucher_type: initialData?.voucher_type || "journal",
      description: initialData?.description || "",
      items: initialData?.items || [
        { account: "", debit: 0, credit: 0, description: "" },
        { account: "", debit: 0, credit: 0, description: "" },
      ],
    },
  });

  useEffect(() => {
    if (initialData) {
      const resetItems =
        initialData.items?.length > 0
          ? initialData.items.map((it: any) => ({
              account: it.account,
              debit: parseFloat(it.debit) || 0,
              credit: parseFloat(it.credit) || 0,
              description: it.description || "",
            }))
          : [
              { account: "", debit: 0, credit: 0, description: "" },
              { account: "", debit: 0, credit: 0, description: "" },
            ];

      form.reset({
        date: initialData.date,
        reference: initialData.reference || "",
        wing_uuid: initialData.wing_uuid || "MAIN_UNIT",
        voucher_type: initialData.voucher_type,
        description: initialData.description || "",
        items: resetItems,
      });
    }
  }, [initialData, form]);

  useEffect(() => {
    // Only set default wing if we are NOT in edit mode
    if (initialWingId && !initialData) {
      form.setValue("wing_uuid", initialWingId);
    }
  }, [initialWingId, initialData, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    // Priority: 1. initialData's company, 2. dashboard's selected company
    const contextCompanyId = initialData?.company_uuid || initialCompanyId;

    const fetchContextualData = async () => {
      const params = new URLSearchParams();
      if (contextCompanyId) params.append("company_uuid", contextCompanyId);

      api.get(`/accounting/accounts/?${params.toString()}`).then((res) => {
        setAccounts(res.data.results || res.data);
      });

      if (entities.length > 0) {
        // Step 1: Broadly filter to the relevant company context
        let filteredWings = entities.filter(
          (w) =>
            String(w.id) === String(contextCompanyId) ||
            String(w.company_id) === String(contextCompanyId) ||
            String(w.id) === String(initialData?.company_uuid) ||
            String(w.company_id) === String(initialData?.company_uuid)
        );

        // Step 2: If we didn't find any branches/units for this company,
        // fallback to showing all entities so the user isn't blocked.
        if (filteredWings.length === 0) {
          filteredWings = entities.filter(
            (e) => e.type === "branch" || e.type === "unit"
          );
        }

        // Step 3: Ensure the specific branch/unit assigned to the journal is in the list
        const targetWingId = initialData?.wing_uuid || "MAIN_UNIT";
        const hasSelection = filteredWings.find((w) =>
          w.type === "unit"
            ? targetWingId === "MAIN_UNIT"
            : String(w.id) === String(targetWingId)
        );

        if (!hasSelection) {
          const contextName =
            entities.find((e) => String(e.id) === String(contextCompanyId))
              ?.name || "Main Unit";
          filteredWings.unshift({
            id: targetWingId === "MAIN_UNIT" ? "MAIN_UNIT" : targetWingId,
            name: targetWingId === "MAIN_UNIT" ? contextName : "Unknown Branch",
            type: targetWingId === "MAIN_UNIT" ? "unit" : "branch",
          });
        }

        setWings(filteredWings);
      } else {
        api.get("/company/wings/").then((res) => {
          setWings(res.data.results || res.data);
        });
      }
    };
    fetchContextualData();
  }, [initialCompanyId, initialData, entities]);

  const onSubmit = async (values: JournalFormValues) => {
    // Convert magic string back to null/empty for backend
    const submissionValues = {
      ...values,
      wing_uuid: values.wing_uuid === "MAIN_UNIT" ? "" : values.wing_uuid,
    };

    try {
      if (initialData?.id) {
        await api.put(`/accounting/journals/${initialData.id}/`, {
          ...submissionValues,
          company_uuid: initialData.company_uuid,
        });
        handleApiSuccess("Transaction Updated");
      } else {
        await api.post("/accounting/journals/", {
          ...submissionValues,
          company_uuid: initialCompanyId,
        });
        handleApiSuccess("Transaction Posted");
      }
      form.reset({
        date: new Date().toISOString().split("T")[0],
        reference: "",
        wing_uuid: initialData?.wing_uuid || initialWingId || "MAIN_UNIT",
        voucher_type: "journal",
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
                  value={field.value || "MAIN_UNIT"}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder="Select Branch / Unit"
                        className="truncate"
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {wings.map((wing) => (
                      <SelectItem
                        key={wing.id}
                        value={
                          wing.type === "unit" && wing.id === "MAIN_UNIT"
                            ? "MAIN_UNIT"
                            : String(wing.id)
                        }
                        className="max-w-[400px] truncate"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>{wing.type === "unit" ? "🏢" : "📍"}</span>
                          <span className="truncate">{wing.name}</span>
                          <span className="text-[10px] opacity-50 shrink-0">
                            ({wing.type === "unit" ? "Main" : "Branch"})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
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
            name="voucher_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Voucher Type (ভাউচার টাইপ)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="receipt">Receipt (RV)</SelectItem>
                    <SelectItem value="payment">Payment (PV)</SelectItem>
                    <SelectItem value="contra">Contra (CV)</SelectItem>
                    <SelectItem value="journal">Journal (JV)</SelectItem>
                  </SelectContent>
                </Select>
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
                  <Input placeholder="Transaction summary..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="truncate">
                            <SelectValue placeholder="Account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          {accounts.length === 0 && (
                            <div className="p-2 text-xs text-muted-foreground text-center">
                              No accounts found
                            </div>
                          )}
                          {accounts.map((acc) => (
                            <SelectItem
                              key={acc.id}
                              value={acc.id}
                              className="truncate"
                            >
                              <span className="font-mono text-[10px] mr-2 opacity-70">
                                [{acc.code}]
                              </span>
                              <span>{acc.name}</span>
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
          {initialData?.id ? "Update Transaction" : "Post Transaction"}
        </Button>
      </form>
    </Form>
  );
}
