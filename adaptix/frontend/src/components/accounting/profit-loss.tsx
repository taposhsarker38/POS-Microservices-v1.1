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
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface PLGroup {
  name: string;
  total: string;
}

interface PLCategory {
  groups: PLGroup[];
  total: string;
}

interface PLData {
  income: PLCategory;
  expense: PLCategory;
  net_profit: string;
}

export function ProfitLoss({
  companyId,
  wingId,
  startDate,
  endDate,
}: {
  companyId?: string;
  wingId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const [data, setData] = useState<PLData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    setLoading(true);
    const params = new URLSearchParams();
    params.append("company_uuid", companyId);
    if (wingId) params.append("wing_uuid", wingId);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    api
      .get(`/accounting/profit-loss/?${params.toString()}`)
      .then((res) => setData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [companyId, wingId, startDate, endDate]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!data) return null;

  const isProfit = parseFloat(data.net_profit) >= 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ৳ {parseFloat(data.income.total).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ৳ {parseFloat(data.expense.total).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-l-4 shadow-sm ${
            isProfit ? "border-l-blue-500" : "border-l-amber-500"
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-500" />
              Net {isProfit ? "Profit" : "Loss"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                isProfit ? "text-blue-600" : "text-amber-600"
              }`}
            >
              ৳ {parseFloat(data.net_profit).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Section */}
        <Card>
          <CardHeader className="bg-emerald-50/50 dark:bg-emerald-900/10">
            <CardTitle className="text-lg">Revenue / Income (আয়)</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableBody>
                {data.income.groups.map((g, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {parseFloat(g.total).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-emerald-50/30 font-bold border-t-2">
                  <TableCell>Total Income</TableCell>
                  <TableCell className="text-right">
                    ৳ {parseFloat(data.income.total).toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Expense Section */}
        <Card>
          <CardHeader className="bg-rose-50/50 dark:bg-rose-900/10">
            <CardTitle className="text-lg">Operating Expenses (ব্যয়)</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableBody>
                {data.expense.groups.map((g, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {parseFloat(g.total).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-rose-50/30 font-bold border-t-2">
                  <TableCell>Total Expenses</TableCell>
                  <TableCell className="text-right">
                    ৳ {parseFloat(data.expense.total).toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
