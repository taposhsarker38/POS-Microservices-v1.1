"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartOfAccountClient } from "@/components/accounting/account-client";
import { AccountGroupClient } from "@/components/accounting/group-client";
import { JournalEntryForm } from "@/components/accounting/journal-form";
import { BalanceSheet } from "@/components/accounting/balance-sheet";
import { ProfitLoss } from "@/components/accounting/profit-loss";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function JournalList({
  wingId,
  companyId,
  entities = [],
  startDate,
  endDate,
  targetName,
}: {
  wingId?: string;
  companyId?: string;
  entities?: any[];
  startDate?: string;
  endDate?: string;
  targetName?: string;
}) {
  const [journals, setJournals] = useState<any[]>([]);
  const [wings, setWings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (wingId) params.append("wing_uuid", wingId);
    if (companyId) params.append("company_uuid", companyId);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    api
      .get(`/accounting/journals/?${params.toString()}`)
      .then((res) => {
        setJournals(res.data.results || res.data);
      })
      .catch((err) => {
        console.error(err);
      });

    api
      .get("/company/wings/")
      .then((res) => {
        setWings(res.data.results || res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [wingId, companyId, startDate, endDate]);

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Ref</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Entity / Unit</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Action</TableHead>
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
                <TableCell>
                  {wings.find((w) => w.id === j.wing_uuid)?.name || "-"}
                </TableCell>
                <TableCell>
                  {entities.find((e) => e.id === j.company_uuid)?.name ||
                    targetName ||
                    "Main Organization"}
                </TableCell>
                <TableCell>{j.description}</TableCell>
                <TableCell className="text-right">{j.total_debit}</TableCell>
                <TableCell className="text-right">{j.total_credit}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {j.created_at
                    ? new Date(j.created_at).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {j.updated_at
                    ? new Date(j.updated_at).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell className="text-right"></TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

import { AnomalyAlert } from "@/components/intelligence/anomaly-alert";

export default function AccountingPage() {
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [entities, setEntities] = useState<any[]>([]);
  const [rootCompanyId, setRootCompanyId] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const [orgRes, wingsRes, treeRes] = await Promise.all([
          api.get("/company/companies/"),
          api.get("/company/wings/"),
          api.get("/company/info/tree/"),
        ]);

        const companies = (orgRes.data.results || orgRes.data).map(
          (c: any) => ({
            id: c.id,
            name: c.name,
            type: "unit",
            code: c.code,
          })
        );

        // Add root company from tree
        const root = treeRes.data;
        if (root && root.id) {
          setRootCompanyId(root.id);
          if (!companies.find((c: any) => c.id === root.id)) {
            companies.unshift({
              id: root.id,
              name: root.name,
              type: "unit",
              code: root.code || "ROOT",
            });
          }
        }

        const wings = (wingsRes.data.results || wingsRes.data).map(
          (w: any) => ({
            id: w.id,
            name: w.name,
            type: "branch",
            code: w.code,
            company_id: w.company,
          })
        );

        setEntities([...companies, ...wings]);
      } catch (err) {
        console.error("Failed to load entities", err);
      }
    };
    fetchEntities();
  }, []);

  const getSelectedContext = () => {
    if (selectedEntity === "all")
      return {
        companyId: undefined, // Don't filter the fetch
        wingId: undefined,
        targetName: "Consolidated (All Units)",
        creationCompanyId: rootCompanyId,
      };
    const entity = entities.find((e) => e.id === selectedEntity);
    if (entity?.type === "unit")
      return {
        companyId: entity.id,
        wingId: undefined,
        targetName: entity.name,
        creationCompanyId: entity.id,
      };
    if (entity?.type === "branch")
      return {
        companyId: entity.company_id,
        wingId: entity.id,
        targetName: entity.name,
        creationCompanyId: entity.company_id,
      };
    return {
      companyId: undefined,
      wingId: undefined,
      targetName: "Default",
      creationCompanyId: rootCompanyId,
    };
  };

  const { companyId, wingId, targetName, creationCompanyId } =
    getSelectedContext();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Accounting</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border px-3 py-1 rounded-md bg-white dark:bg-slate-950 shadow-sm">
            <span className="text-sm font-medium text-muted-foreground">
              Period:
            </span>
            <input
              type="date"
              className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="date"
              className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Select value={selectedEntity} onValueChange={setSelectedEntity}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select Entity/Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Consolidated (All Units)</SelectItem>
              {entities
                .filter((e) => e.type === "unit")
                .map((unit) => (
                  <SelectItem
                    key={unit.id}
                    value={unit.id}
                    className="font-bold"
                  >
                    🏢 {unit.name} (Unit)
                  </SelectItem>
                ))}
              {entities
                .filter((e) => e.type === "branch")
                .map((wing) => (
                  <SelectItem key={wing.id} value={wing.id} className="pl-6">
                    📍 {wing.name} (Branch)
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <AnomalyAlert />

      <Tabs defaultValue="chart-of-accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="groups">Account Groups</TabsTrigger>
          <TabsTrigger value="journals">General Ledger</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
          <TabsTrigger value="new-journal">New Transaction</TabsTrigger>
        </TabsList>
        <TabsContent value="chart-of-accounts" className="space-y-4">
          <ChartOfAccountClient
            wingId={wingId}
            companyId={companyId}
            creationCompanyId={creationCompanyId}
            targetName={targetName}
            entities={entities}
            startDate={startDate}
            endDate={endDate}
          />
        </TabsContent>
        <TabsContent value="groups" className="space-y-4">
          <AccountGroupClient
            wingId={wingId}
            companyId={companyId}
            creationCompanyId={creationCompanyId}
            targetName={targetName}
            entities={entities}
            startDate={startDate}
            endDate={endDate}
          />
        </TabsContent>
        <TabsContent value="journals" className="space-y-4">
          <JournalList
            wingId={wingId}
            companyId={companyId}
            entities={entities}
            startDate={startDate}
            endDate={endDate}
            targetName={targetName}
          />
        </TabsContent>
        <TabsContent value="balance-sheet" className="space-y-4">
          <BalanceSheet
            companyId={companyId || rootCompanyId}
            wingId={wingId}
            date={endDate}
          />
        </TabsContent>
        <TabsContent value="profit-loss" className="space-y-4">
          <ProfitLoss
            companyId={companyId || rootCompanyId}
            wingId={wingId}
            startDate={startDate}
            endDate={endDate}
          />
        </TabsContent>
        <TabsContent value="new-journal" className="space-y-4">
          <div className="max-w-2xl border p-6 rounded-md bg-white dark:bg-slate-950">
            <h3 className="text-lg font-medium mb-4">
              Post Manual Journal Entry
            </h3>
            <JournalEntryForm
              onSuccess={() => {}}
              initialCompanyId={creationCompanyId}
              initialWingId={wingId}
              entities={entities}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
