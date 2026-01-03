"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartOfAccountClient } from "@/components/accounting/account-client";
import { AccountGroupClient } from "@/components/accounting/group-client";
import { JournalEntryForm } from "@/components/accounting/journal-form";
import { BalanceSheet } from "@/components/accounting/balance-sheet";
import { ProfitLoss } from "@/components/accounting/profit-loss";
import { TrialBalance } from "@/components/accounting/trial-balance";
import { AccountingOverview } from "@/components/accounting/overview";
import { SystemAccountMapping } from "@/components/accounting/system-accounts";
import { getUser, isSuperUser } from "@/lib/auth";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCcw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, Edit, Plus } from "lucide-react";

function JournalList({
  wingId,
  companyId,
  entities = [],
  startDate,
  endDate,
  voucherType,
  targetName,
}: {
  wingId?: string;
  companyId?: string;
  entities?: any[];
  startDate?: string;
  endDate?: string;
  voucherType?: string;
  targetName?: string;
}) {
  const [journals, setJournals] = useState<any[]>([]);
  const [wings, setWings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingJournal, setEditingJournal] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchJournals = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (wingId) params.append("wing_uuid", wingId);
    if (companyId) params.append("company_uuid", companyId);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (voucherType && voucherType !== "all")
      params.append("voucher_type", voucherType);

    // Cache busting
    params.append("_t", Date.now().toString());

    api
      .get(`/accounting/journals/?${params.toString()}`)
      .then((res) => {
        setJournals(res.data.results || res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [wingId, companyId, startDate, endDate, voucherType]);

  useEffect(() => {
    fetchJournals();

    api
      .get("/company/wings/")
      .then((res) => {
        setWings(res.data.results || res.data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [wingId, companyId, startDate, endDate, voucherType]);

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
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
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "uppercase text-[10px] font-bold",
                      j.voucher_type === "receipt"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : j.voucher_type === "payment"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : j.voucher_type === "contra"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : ""
                    )}
                  >
                    {j.voucher_type?.substring(0, 3) || "JV"}
                  </Badge>
                </TableCell>
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
                <TableCell className="text-right">
                  {(j.source === "manual" || !j.source) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setEditingJournal(j);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 text-blue-600" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
          {!loading && journals.length > 0 && (
            <TableRow className="bg-muted/50 font-bold hover:bg-muted/50">
              <TableCell
                colSpan={6}
                className="text-right text-muted-foreground uppercase text-xs"
              >
                Total
              </TableCell>
              <TableCell className="text-right">
                {journals
                  .reduce((sum, j) => sum + (Number(j.total_debit) || 0), 0)
                  .toFixed(2)}
              </TableCell>
              <TableCell className="text-right">
                {journals
                  .reduce((sum, j) => sum + (Number(j.total_credit) || 0), 0)
                  .toFixed(2)}
              </TableCell>
              <TableCell colSpan={3}></TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Journal Entry</DialogTitle>
          </DialogHeader>
          {editingJournal && (
            <JournalEntryForm
              initialData={editingJournal}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                fetchJournals();
              }}
              entities={entities}
            />
          )}
        </DialogContent>
      </Dialog>
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
  const [voucherType, setVoucherType] = useState<string>("all");

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
            type: c.is_group ? "group" : "unit",
            code: c.code,
            tenant_id: c.auth_company_uuid,
          })
        );

        // Add root company from tree
        const root = treeRes.data;
        if (root && root.id) {
          // Use auth_company_uuid if available, otherwise fallback to id (for local/single-tenant)
          // The Accounting service expects the Tenant ID (auth_company_uuid)
          const tenantId = root.auth_company_uuid || root.id;
          setRootCompanyId(tenantId);

          if (!companies.find((c: any) => c.id === root.id)) {
            companies.unshift({
              id: root.id,
              tenant_id: tenantId,
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
            company_id: w.company || w.company_uuid,
            // Branches belong to the tenant too
            tenant_id: root?.auth_company_uuid,
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
        companyId: rootCompanyId, // Use the Tenant ID (which setRootCompanyId set)
        wingId: undefined,
        targetName: "Consolidated (All Units)",
        creationCompanyId: rootCompanyId,
      };
    const entity = entities.find((e) => e.id === selectedEntity);
    if (entity?.type === "unit")
      return {
        companyId: entity.tenant_id || entity.id, // Prefer Tenant ID for accounting
        wingId: undefined,
        targetName: entity.name,
        creationCompanyId: entity.id,
      };
    if (entity?.type === "branch")
      return {
        companyId: entity.tenant_id || entity.company_id, // Prefer Tenant ID
        wingId: entity.id,
        targetName: entity.name,
        creationCompanyId: entity.company_id,
      };
    return {
      companyId: rootCompanyId,
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

          <Select value={voucherType} onValueChange={setVoucherType}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Voucher Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vouchers</SelectItem>
              <SelectItem value="receipt">Receipt (RV)</SelectItem>
              <SelectItem value="payment">Payment (PV)</SelectItem>
              <SelectItem value="contra">Contra (CV)</SelectItem>
              <SelectItem value="journal">Journal (JV)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedEntity} onValueChange={setSelectedEntity}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select Entity/Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Consolidated (All Units)</SelectItem>
              {entities
                .filter((e) => e.type === "unit" || e.type === "group")
                .map((unit) => (
                  <SelectItem
                    key={unit.id}
                    value={unit.id}
                    className="font-bold"
                  >
                    {unit.type === "group" ? "🏦" : "🏢"} {unit.name} (
                    {unit.type === "group" ? "Group" : "Unit"})
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="groups">Account Groups</TabsTrigger>
          <TabsTrigger value="journals">General Ledger</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="new-journal">New Transaction</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <AccountingOverview
            companyId={companyId || rootCompanyId}
            wingId={wingId}
            startDate={startDate}
            endDate={endDate}
          />
        </TabsContent>
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
            voucherType={voucherType}
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
        <TabsContent value="trial-balance" className="space-y-4">
          <TrialBalance
            companyId={companyId || rootCompanyId}
            wingId={wingId}
            date={endDate}
          />
        </TabsContent>
        <TabsContent value="settings" className="space-y-4">
          <SystemAccountMapping companyId={companyId || rootCompanyId} />
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
