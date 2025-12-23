"use client";

import { useEffect, useState } from "react";
import {
  Zap,
  Settings,
  Plus,
  Trash2,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  Globe,
  FileText,
  MoreVertical,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

interface AutomationRule {
  id: string;
  name: string;
  trigger_type: string;
  action_type: string;
  is_active: boolean;
  description: string;
  last_triggered_at: string | null;
}

interface ActionLog {
  id: string;
  rule_name: string;
  status: string;
  details: string;
  executed_at: string;
}

export default function AutomationHub() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewRuleOpen, setIsNewRuleOpen] = useState(false);

  // New Rule Form State
  const [newRule, setNewRule] = useState({
    name: "",
    trigger_type: "stock_level",
    condition_field: "quantity",
    condition_operator: "<",
    condition_value: "",
    action_type: "email",
    action_config: { to: "", body: "" },
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rulesRes, logsRes] = await Promise.all([
        api.get("/intelligence/automation/rules/"),
        api.get("/intelligence/automation/logs/"),
      ]);
      setRules(rulesRes.data);
      setLogs(logsRes.data);
    } catch (error) {
      console.error("Failed to fetch automation data", error);
      toast.error("Could not load automation data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRule = async () => {
    try {
      if (!newRule.name || !newRule.condition_value) {
        toast.error("Please fill in all required fields");
        return;
      }
      await api.post("/intelligence/automation/rules/", newRule);
      toast.success("Automation rule created successfully!");
      setIsNewRuleOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to create rule");
    }
  };

  const toggleRule = async (ruleId: string, currentState: boolean) => {
    try {
      await api.patch(`/intelligence/automation/rules/${ruleId}/`, {
        is_active: !currentState,
      });
      setRules(
        rules.map((r) =>
          r.id === ruleId ? { ...r, is_active: !currentState } : r
        )
      );
      toast.success(currentState ? "Rule disabled" : "Rule enabled");
    } catch (error) {
      toast.error("Failed to update rule");
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      await api.delete(`/intelligence/automation/rules/${ruleId}/`);
      setRules(rules.filter((r) => r.id !== ruleId));
      toast.success("Rule deleted");
    } catch (error) {
      toast.error("Failed to delete rule");
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4 text-blue-500" />;
      case "webhook":
        return <Globe className="h-4 w-4 text-emerald-500" />;
      case "log":
        return <FileText className="h-4 w-4 text-slate-500" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="text-amber-500 fill-amber-500" />
            Workflow Automation
          </h1>
          <p className="text-slate-500 text-sm">
            Automate your business logic with event-driven rules.
          </p>
        </div>

        <Dialog open={isNewRuleOpen} onOpenChange={setIsNewRuleOpen}>
          <DialogTrigger asChild>
            <Button className="bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-200 gap-2">
              <Plus className="h-4 w-4" /> Create New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Configure Automation Rule</DialogTitle>
              <DialogDescription>
                Define when and what should happen automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Rule Name</label>
                <Input
                  placeholder="e.g. Low Stock Notification"
                  value={newRule.name}
                  onChange={(e) =>
                    setNewRule({ ...newRule, name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Trigger Event</label>
                  <Select
                    value={newRule.trigger_type}
                    onValueChange={(v) =>
                      setNewRule({ ...newRule, trigger_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock_level">
                        Stock Level Change
                      </SelectItem>
                      <SelectItem value="new_order">
                        New Order Created
                      </SelectItem>
                      <SelectItem value="payment_failed">
                        Payment Failed
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Action Type</label>
                  <Select
                    value={newRule.action_type}
                    onValueChange={(v) =>
                      setNewRule({ ...newRule, action_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Send Email</SelectItem>
                      <SelectItem value="webhook">Call Webhook</SelectItem>
                      <SelectItem value="log">Log to Console</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
                  Condition Logic
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">IF</span>
                  <Badge variant="outline" className="bg-white">
                    {newRule.condition_field}
                  </Badge>
                  <Select
                    value={newRule.condition_operator}
                    onValueChange={(v) =>
                      setNewRule({ ...newRule, condition_operator: v })
                    }
                  >
                    <SelectTrigger className="w-[80px] h-8 text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="==">==</SelectItem>
                      <SelectItem value="<">&lt;</SelectItem>
                      <SelectItem value=">">&gt;</SelectItem>
                      <SelectItem value="!=">!=</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-8 text-xs w-24"
                    placeholder="Value"
                    value={newRule.condition_value}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        condition_value: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {newRule.action_type === "email" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recipient Email</label>
                  <Input
                    placeholder="admin@example.com"
                    value={newRule.action_config.to}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        action_config: {
                          ...newRule.action_config,
                          to: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewRuleOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRule} className="bg-violet-600">
                Save Workflow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rules List */}
        <Card className="md:col-span-2 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-slate-400" />
              Active Automations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-slate-400"
                    >
                      No automation rules defined yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule) => (
                    <TableRow
                      key={rule.id}
                      className="group hover:bg-slate-50 transition-colors"
                    >
                      <TableCell className="font-semibold">
                        {rule.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="capitalize text-[10px]"
                        >
                          {rule.trigger_type.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          {getActionIcon(rule.action_type)}
                          <span className="capitalize">{rule.action_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleRule(rule.id, rule.is_active)}
                          className={`w-10 h-5 rounded-full transition-colors relative ${
                            rule.is_active ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${
                              rule.is_active ? "left-6" : "left-1"
                            }`}
                          />
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRule(rule.id)}
                          className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Execution Logs */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Execution History
            </CardTitle>
            <CardDescription>Live feed of automated actions.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 text-sm">
                    No recent activity.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors"
                    >
                      {log.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mt-1 shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {log.rule_name || "System Rule"}
                        </p>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                          {log.details}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(log.executed_at), "MMM d, HH:mm:ss")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
