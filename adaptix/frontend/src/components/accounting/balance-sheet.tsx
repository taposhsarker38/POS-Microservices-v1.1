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

interface BalanceGroup {
  name: string;
  total: string;
}

interface BalanceCategory {
  groups: BalanceGroup[];
  total: string;
}

interface BalanceSheetData {
  asset: BalanceCategory;
  liability: BalanceCategory;
  equity: BalanceCategory;
}

export function BalanceSheet({
  companyId,
  wingId,
  date,
}: {
  companyId?: string;
  wingId?: string;
  date?: string;
}) {
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.append("company_uuid", companyId);
    if (wingId) params.append("wing_uuid", wingId);
    if (date) params.append("date", date);

    api
      .get(`/accounting/balance-sheet/?${params.toString()}`)
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error(err);
        setError("Failed to load Balance Sheet data. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [companyId, wingId, date]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 border border-red-200 rounded-md bg-red-50">
        {error}
      </div>
    );
  }

  if (!data)
    return <div className="p-4 text-muted-foreground">No data available.</div>;

  const renderSection = (title: string, category: BalanceCategory) => (
    <Card className="h-full">
      <CardHeader className="bg-slate-50 dark:bg-slate-900/50">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold">{title}</CardTitle>
          <span className="text-xl font-bold">
            ৳ {parseFloat(category.total).toLocaleString()}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <Table>
          <TableBody>
            {category.groups.map((g, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                  {g.name}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {parseFloat(g.total).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {category.groups.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-muted-foreground py-8"
                >
                  No data found for this category
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {renderSection("Assets (সম্পদ)", data.asset)}
        </div>
        <div className="space-y-6">
          {renderSection("Liabilities (দায়)", data.liability)}
          {renderSection("Equity (মালিকানা স্বত্ব)", data.equity)}

          <Card className="bg-blue-600 text-white shadow-lg">
            <CardContent className="py-6 flex justify-between items-center">
              <span className="text-lg font-bold">
                Total Liabilities & Equity:
              </span>
              <span className="text-2xl font-black">
                ৳{" "}
                {(
                  parseFloat(data.liability.total) +
                  parseFloat(data.equity.total)
                ).toLocaleString()}
              </span>
            </CardContent>
          </Card>
        </div>
      </div>

      {Math.abs(
        parseFloat(data.asset.total) -
          (parseFloat(data.liability.total) + parseFloat(data.equity.total))
      ) > 0.01 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-3 text-red-700 font-medium">
          <span className="text-xl">⚠️</span>
          Warning: Balance sheet is not matching. Please check your journal
          entries.
        </div>
      )}
    </div>
  );
}
