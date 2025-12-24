"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useLeaves,
  useLeavePolicies,
  useLeaveAllocations,
  useLeaveTypes,
  useEmployees,
} from "@/hooks/useHRMS";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Settings2,
  PlayCircle,
  AlertCircle,
  ShieldCheck,
  Search,
  Filter,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LeavesPage() {
  const { data: leaves, isLoading: leavesLoading, createLeave } = useLeaves();
  const { data: policies, createPolicy } = useLeavePolicies();
  const {
    data: allocations,
    runEntitlement,
    bulkApprove,
  } = useLeaveAllocations();
  const { data: leaveTypes } = useLeaveTypes();

  const [activeTab, setActiveTab] = useState("requests");
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedAllocations, setSelectedAllocations] = useState<string[]>([]);

  const [policyForm, setPolicyForm] = useState({
    name: "",
    leave_type: "",
    allocation_days: "12",
    tenure_months_required: "0",
    gender_requirement: "ALL",
  });

  const [leaveForm, setLeaveForm] = useState({
    employee: "",
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const { data: employees } = useEmployees();

  // Helper to get company_uuid from context
  const getCompanyUuid = () => {
    return (
      allocations?.[0]?.company_uuid ||
      employees?.[0]?.company_uuid ||
      "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
    );
  };

  const handleRunEntitlement = async () => {
    try {
      const company_uuid = getCompanyUuid();
      const res = await runEntitlement(company_uuid);
      toast.success(
        `Entitlement run complete. Created ${res.allocations_created} draft allocations.`
      );
    } catch (err) {
      toast.error("Failed to run entitlement engine.");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedAllocations.length === 0) {
      toast.error("Please select at least one allocation to approve.");
      return;
    }
    try {
      await bulkApprove(selectedAllocations);
      toast.success(
        `Successfully approved ${selectedAllocations.length} allocations.`
      );
      setSelectedAllocations([]);
    } catch (err) {
      toast.error("Bulk approval failed.");
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "approved")
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 font-medium">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
        </Badge>
      );
    if (s === "rejected" || s === "cancelled")
      return (
        <Badge
          variant="destructive"
          className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20 font-medium"
        >
          <XCircle className="w-3 h-3 mr-1" /> {status}
        </Badge>
      );
    return (
      <Badge
        variant="secondary"
        className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 font-medium"
      >
        <Clock className="w-3 h-3 mr-1" /> {status}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen text-foreground">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2 bg-purple-600/10 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            HRMS Leave Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Dynamic policy-driven leave entitlements for your workforce.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRunEntitlement}
            className="gap-2"
          >
            <PlayCircle className="h-4 w-4" />
            Sync Entitlement
          </Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 gap-2"
            onClick={() => setIsLeaveModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Application
          </Button>
        </div>
      </motion.div>

      <Tabs
        defaultValue="requests"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="bg-muted/50 p-1 mb-6 rounded-xl">
          <TabsTrigger
            value="requests"
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            Leave Requests
          </TabsTrigger>
          <TabsTrigger
            value="allocations"
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            Balance Approval
          </TabsTrigger>
          <TabsTrigger
            value="policies"
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            Entitlement Policies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4 outline-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/40 shadow-sm overflow-hidden"
          >
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Period</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {leaves?.map((leave, i) => (
                    <motion.tr
                      key={leave.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-muted/30 transition-colors border-b border-border/40"
                    >
                      <TableCell className="font-medium">
                        {leave.employee_name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="bg-muted text-muted-foreground hover:bg-muted"
                        >
                          {leave.leave_type_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(leave.start_date).toLocaleDateString()} &rarr;{" "}
                        {new Date(leave.end_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(leave.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                        >
                          View Detail
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {(!leaves || leaves.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12 text-muted-foreground italic"
                    >
                      No leave applications found in the system
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </motion.div>
        </TabsContent>

        <TabsContent value="allocations" className="space-y-4 outline-none">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-full">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-bold text-amber-700 dark:text-amber-500 text-sm">
                  Draft Entitlements Pending
                </h4>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                  The policy engine has calculated new balances. Please review
                  and approve them to make them active.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleBulkApprove}
              disabled={selectedAllocations.length === 0}
              className="bg-blue-600 hover:bg-blue-700 shadow-md"
            >
              Bulk Approve Selected ({selectedAllocations.length})
            </Button>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/40 shadow-sm overflow-hidden"
          >
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="rounded border-border bg-background"
                      onChange={(e) => {
                        if (e.target.checked)
                          setSelectedAllocations(
                            allocations
                              ?.filter((a) => a.status === "DRAFT")
                              .map((a) => a.id) || []
                          );
                        else setSelectedAllocations([]);
                      }}
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Leave Type</TableHead>
                  <TableHead className="font-semibold text-right">
                    Annual Entitlement
                  </TableHead>
                  <TableHead className="font-semibold text-center">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations
                  ?.filter((a) => a.status === "DRAFT")
                  .map((a) => (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "transition-colors border-b border-border/40 hover:bg-muted/30",
                        selectedAllocations.includes(a.id) &&
                          "bg-blue-500/5 hover:bg-blue-500/10"
                      )}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          className="rounded border-border bg-background"
                          checked={selectedAllocations.includes(a.id)}
                          onChange={() => {
                            setSelectedAllocations((prev) =>
                              prev.includes(a.id)
                                ? prev.filter((x) => x !== a.id)
                                : [...prev, a.id]
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {a.employee_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-border">
                          {a.leave_type_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-right font-bold text-primary">
                        {a.total_allocated} Days
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 py-0.5">
                          DRAFT
                        </Badge>
                      </TableCell>
                    </motion.tr>
                  ))}
                {(!allocations ||
                  allocations.filter((a) => a.status === "DRAFT").length ===
                    0) && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12 text-muted-foreground italic"
                    >
                      No draft allocations ready for approval
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </motion.div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4 outline-none">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-lg">Leave Entitlement Policies</h3>
            <Button
              size="sm"
              onClick={() => setIsPolicyModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Rule
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {policies?.map((policy, i) => (
                <motion.div
                  key={policy.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card/50 backdrop-blur-sm p-6 rounded-2xl border border-border/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                      <ShieldCheck className="h-6 w-6 text-emerald-600" />
                    </div>
                    <Badge
                      className={
                        policy.is_active
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }
                    >
                      {policy.is_active ? "Active" : "Paused"}
                    </Badge>
                  </div>

                  <h4 className="font-bold text-lg group-hover:text-emerald-600 transition-colors">
                    {policy.name}
                  </h4>
                  <p className="text-sm font-medium text-muted-foreground mb-6">
                    {policy.leave_type_name}
                  </p>

                  <div className="space-y-3 bg-background/50 rounded-xl p-4 border border-border/40">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                        Benefit
                      </span>
                      <span className="font-bold text-emerald-600 text-base">
                        {policy.allocation_days} Days
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                        Eligibility
                      </span>
                      <span className="text-foreground font-bold">
                        {policy.tenure_months_required}m Tenure
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                        Target
                      </span>
                      <span className="text-foreground font-bold capitalize">
                        {policy.gender_requirement.toLowerCase()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-muted"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {(!policies || policies.length === 0) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full border-2 border-dashed border-border/60 rounded-3xl p-16 text-center group cursor-pointer hover:border-emerald-500 transition-colors"
                onClick={() => setIsPolicyModalOpen(true)}
              >
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-500/10 transition-colors">
                  <Plus className="h-8 w-8 text-muted-foreground group-hover:text-emerald-600" />
                </div>
                <h5 className="font-bold text-foreground mb-1">
                  Define your first leave rule
                </h5>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Create dynamic rules for CL, ML, AL, or any custom leave type
                  based on employee tenure.
                </p>
              </motion.div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Policy Modal */}
      <Dialog open={isPolicyModalOpen} onOpenChange={setIsPolicyModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Define Leave Rule
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                placeholder="e.g. Standard Annual Leave 2024"
                value={policyForm.name}
                onChange={(e) =>
                  setPolicyForm({ ...policyForm, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Leave Category</Label>
              <Select
                value={policyForm.leave_type}
                onValueChange={(v) =>
                  setPolicyForm({ ...policyForm, leave_type: v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type (CL, ML, AL...)" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Days Granted</Label>
                <Input
                  type="number"
                  placeholder="12"
                  value={policyForm.allocation_days}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      allocation_days: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Min. Tenure (Mo)</Label>
                <Input
                  type="number"
                  placeholder="6"
                  value={policyForm.tenure_months_required}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      tenure_months_required: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gender Exclusivity</Label>
              <Select
                value={policyForm.gender_requirement}
                onValueChange={(v) =>
                  setPolicyForm({ ...policyForm, gender_requirement: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Universal (All Genders)</SelectItem>
                  <SelectItem value="MALE">Male Workforce Only</SelectItem>
                  <SelectItem value="FEMALE">Female Workforce Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPolicyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  if (!policyForm.leave_type) {
                    toast.error("Please select a leave category.");
                    return;
                  }
                  const company_uuid = getCompanyUuid();
                  await createPolicy({
                    ...policyForm,
                    allocation_days: Number(policyForm.allocation_days),
                    tenure_months_required: Number(
                      policyForm.tenure_months_required
                    ),
                    gender_requirement: policyForm.gender_requirement as
                      | "ALL"
                      | "MALE"
                      | "FEMALE",
                    company_uuid,
                  });
                  toast.success("New leave rule implemented successfully.");
                  setIsPolicyModalOpen(false);
                } catch (err) {
                  toast.error("Error creating leave rule.");
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-md"
            >
              Deploy Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Application Modal */}
      <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              New Leave Application
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={leaveForm.employee}
                onValueChange={(v) =>
                  setLeaveForm({ ...leaveForm, employee: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} (
                      {(emp as any).employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select
                value={leaveForm.leave_type}
                onValueChange={(v) =>
                  setLeaveForm({ ...leaveForm, leave_type: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={leaveForm.start_date}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, start_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={leaveForm.end_date}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, end_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                placeholder="Briefly explain the reason for leave..."
                value={leaveForm.reason}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, reason: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsLeaveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 shadow-md"
              onClick={async () => {
                try {
                  if (
                    !leaveForm.employee ||
                    !leaveForm.leave_type ||
                    !leaveForm.start_date ||
                    !leaveForm.end_date
                  ) {
                    toast.error("Please fill in all required fields.");
                    return;
                  }
                  const company_uuid = getCompanyUuid();
                  await createLeave({ ...leaveForm, company_uuid });
                  toast.success("Leave application submitted successfully.");
                  setIsLeaveModalOpen(false);
                  setLeaveForm({
                    employee: "",
                    leave_type: "",
                    start_date: "",
                    end_date: "",
                    reason: "",
                  });
                } catch (err) {
                  toast.error("Failed to submit leave application.");
                }
              }}
            >
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
