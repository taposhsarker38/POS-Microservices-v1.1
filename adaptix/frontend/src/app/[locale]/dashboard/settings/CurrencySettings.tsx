"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import api from "@/lib/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const currencySchema = z.object({
  code: z.string().min(3, "Code must be 3 characters").max(3),
  name: z.string().min(2, "Name is required"),
  symbol: z.string().optional(),
  exchange_rate: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Rate must be positive number",
    }),
  is_base: z.boolean().default(false),
});

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchange_rate: string | number;
  is_base: boolean;
}

type CurrencyFormValues = z.infer<typeof currencySchema>;

export function CurrencySettings() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);

  const form = useForm({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      code: "",
      name: "",
      symbol: "",
      exchange_rate: "1.00",
      is_base: false,
    },
  });

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const res = await api.get("/company/currencies/");
      setCurrencies(res.data.results || res.data);
    } catch (error) {
      toast.error("Failed to load currencies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const onDelete = async (id: string) => {
    if (!confirm("Are you sure? This might affect existing invoices.")) return;
    try {
      await api.delete(`/company/currencies/${id}/`);
      toast.success("Currency deleted");
      fetchCurrencies();
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const onSubmit = async (values: CurrencyFormValues) => {
    try {
      const payload = {
        ...values,
        exchange_rate: parseFloat(values.exchange_rate),
      };

      if (editingCurrency) {
        await api.put(`/company/currencies/${editingCurrency.id}/`, payload);
        toast.success("Currency updated");
      } else {
        await api.post("/company/currencies/", payload);
        toast.success("Currency created");
      }
      setIsDialogOpen(false);
      fetchCurrencies();
    } catch (error: any) {
      if (error.response?.data?.code) {
        form.setError("code", { message: "Currency code already exists" });
      } else {
        toast.error("Failed to save currency");
      }
    }
  };

  const openCreate = () => {
    setEditingCurrency(null);
    form.reset({
      code: "",
      name: "",
      symbol: "",
      exchange_rate: "1.00",
      is_base: false,
    });
    setIsDialogOpen(true);
  };

  const openEdit = (curr: Currency) => {
    setEditingCurrency(curr);
    form.reset({
      code: curr.code || "",
      name: curr.name || "",
      symbol: curr.symbol || "",
      exchange_rate: curr.exchange_rate
        ? curr.exchange_rate.toString()
        : "1.00",
      is_base: curr.is_base || false,
    });
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Currencies</CardTitle>
            <CardDescription>
              Manage available currencies and exchange rates.
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Currency
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Exchange Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currencies.map((currency) => (
                <TableRow key={currency.id || currency.code}>
                  <TableCell className="font-medium">{currency.code}</TableCell>
                  <TableCell>{currency.name}</TableCell>
                  <TableCell>{currency.symbol}</TableCell>
                  <TableCell>
                    {Number(currency.exchange_rate).toFixed(4)}
                  </TableCell>
                  <TableCell>
                    {currency.is_base ? (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                      >
                        Base Currency
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Secondary
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(currency)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!currency.is_base && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => onDelete(currency.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {currencies.length === 0 && !loading && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No currencies defined. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCurrency ? "Edit Currency" : "Add Currency"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ISO Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="USD"
                            {...field}
                            maxLength={3}
                            className="uppercase"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="symbol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Symbol</FormLabel>
                        <FormControl>
                          <Input placeholder="$" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="US Dollar" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="exchange_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exchange Rate</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.000001" {...field} />
                        </FormControl>
                        <FormDescription>
                          Relative to Base Currency
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="is_base"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center gap-2 mt-6">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Base Currency</FormLabel>
                        </div>
                        {field.value && (
                          <FormDescription className="text-xs text-amber-600">
                            This will reset other currencies.
                          </FormDescription>
                        )}
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
