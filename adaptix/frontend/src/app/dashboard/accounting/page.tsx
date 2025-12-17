"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartOfAccountClient } from "@/components/accounting/account-client";
import { AccountGroupClient } from "@/components/accounting/group-client";
import { JournalEntryForm } from "@/components/accounting/journal-form";
import { useState } from "react";
import api from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function JournalList() {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    api
      .get("/accounting/journals/")
      .then((res) => {
        setJournals(res.data.results || res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  });

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Ref</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5}>Loading...</TableCell>
            </TableRow>
          ) : (
            journals.map((j) => (
              <TableRow key={j.id}>
                <TableCell>{j.date}</TableCell>
                <TableCell>{j.reference}</TableCell>
                <TableCell>{j.description}</TableCell>
                <TableCell className="text-right">{j.total_debit}</TableCell>
                <TableCell className="text-right">{j.total_credit}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AccountingPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Accounting</h2>
      </div>
      <Tabs defaultValue="chart-of-accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="groups">Account Groups</TabsTrigger>
          <TabsTrigger value="journals">Journal Entries</TabsTrigger>
          <TabsTrigger value="new-journal">New Transaction</TabsTrigger>
        </TabsList>
        <TabsContent value="chart-of-accounts" className="space-y-4">
          <ChartOfAccountClient />
        </TabsContent>
        <TabsContent value="groups" className="space-y-4">
          <AccountGroupClient />
        </TabsContent>
        <TabsContent value="journals" className="space-y-4">
          <JournalList />
        </TabsContent>
        <TabsContent value="new-journal" className="space-y-4">
          <div className="max-w-2xl border p-6 rounded-md bg-white dark:bg-slate-950">
            <h3 className="text-lg font-medium mb-4">
              Post Manual Journal Entry
            </h3>
            <JournalEntryForm onSuccess={() => {}} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
