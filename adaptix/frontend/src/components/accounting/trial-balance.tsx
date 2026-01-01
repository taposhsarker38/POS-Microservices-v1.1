"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface TrialAccount {
  id: string;
  name: string;
  code: string;
  debit: string;
  credit: string;
}

interface TrialBalanceData {
  accounts: TrialAccount[];
  total_debit: string;
  total_credit: string;
  is_balanced: boolean;
}

export function TrialBalance({
  companyId,
  wingId,
  date,
}: {
  companyId?: string;
  wingId?: string;
  date?: string;
}) {
  const [data, setData] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    setLoading(true);
    const params = new URLSearchParams();
    params.append("company_uuid", companyId);
    if (wingId) params.append("wing_uuid", wingId);
    if (date) params.append("date", date);

    api
      .get(`/accounting/trial-balance/?${params.toString()}`)
      .then((res) => setData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [companyId, wingId, date]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <Card
        className={
          data.is_balanced
            ? "border-l-4 border-l-emerald-500"
            : "border-l-4 border-l-rose-500"
        }
      >
        <CardContent className="py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {data.is_balanced ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            ) : (
              <AlertCircle className="w-8 h-8 text-rose-500" />
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase">
                Ledger Status
              </p>
              <h3 className="text-xl font-bold">
                {data.is_balanced
                  ? "Your Ledger is Balanced (সুষম)"
                  : "Attention: Ledger Imbalance (অসামঞ্জস্য)"}
              </h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">
              Variance
            </p>
            <p
              className={`text-xl font-bold ${
                data.is_balanced ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              ৳{" "}
              {(
                parseFloat(data.total_debit) - parseFloat(data.total_credit)
              ).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-slate-50 dark:bg-slate-900/50">
          <CardTitle>Trial Balance (ট্রায়াল ব্যালেন্স)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100/50 dark:bg-slate-800/50">
                <TableHead className="w-[100px]">Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead className="text-right">Debit (ডেবিট)</TableHead>
                <TableHead className="text-right">Credit (ক্রেডিট)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.accounts.map((acc) => (
                <TableRow key={acc.id}>
                  <TableCell className="font-mono text-xs">
                    {acc.code}
                  </TableCell>
                  <TableCell className="font-medium">{acc.name}</TableCell>
                  <TableCell className="text-right">
                    {parseFloat(acc.debit) > 0
                      ? parseFloat(acc.debit).toLocaleString()
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {parseFloat(acc.credit) > 0
                      ? parseFloat(acc.credit).toLocaleString()
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}

              <TableRow className="bg-slate-100/30 dark:bg-slate-800/30 hover:bg-slate-100/30 font-bold border-t-2">
                <TableCell colSpan={2} className="text-right text-lg">
                  Totals (মোট):
                </TableCell>
                <TableCell className="text-right text-lg text-blue-600">
                  ৳ {parseFloat(data.total_debit).toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-lg text-blue-600">
                  ৳ {parseFloat(data.total_credit).toLocaleString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
