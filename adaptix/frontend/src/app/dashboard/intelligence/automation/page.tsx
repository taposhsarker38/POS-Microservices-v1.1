"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  ArrowRight,
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
import { cn } from "@/lib/utils";

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
        return <Mail className="h-4 w-4 text-primary" />;
      case "webhook":
        return <Globe className="h-4 w-4 text-emerald-500" />;
      case "log":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen text-foreground">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
            <Zap className="text-amber-500 fill-amber-500" />
            Workflow Automation
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Automate your business logic with event-driven rules.
          </p>
        </div>

        <Dialog open={isNewRuleOpen} onOpenChange={setIsNewRuleOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2">
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

              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Condition Logic
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">IF</span>
                  <Badge variant="outline" className="bg-background">
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
              <Button onClick={handleCreateRule} className="bg-primary">
                Save Workflow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rules List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2"
        >
          <Card className="shadow-lg border-border/40 bg-card/50 backdrop-blur-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                Active Automations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {rules.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-10 text-muted-foreground"
                        >
                          No automation rules defined yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rules.map((rule) => (
                        <motion.tr
                          key={rule.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="group hover:bg-muted/30 transition-colors border-b border-border/40"
                        >
                          <TableCell className="font-semibold">
                            {rule.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="capitalize text-[10px] bg-secondary/50"
                            >
                              {rule.trigger_type.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {getActionIcon(rule.action_type)}
                              <span className="capitalize">
                                {rule.action_type}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() =>
                                toggleRule(rule.id, rule.is_active)
                              }
                              className={cn(
                                "w-9 h-5 rounded-full transition-colors relative",
                                rule.is_active
                                  ? "bg-emerald-500"
                                  : "bg-muted-foreground/30"
                              )}
                            >
                              <div
                                className={cn(
                                  "absolute top-1 w-3 h-3 bg-white rounded-full transition-transform shadow-sm",
                                  rule.is_active ? "left-5" : "left-1"
                                )}
                              />
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRule(rule.id)}
                              className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Execution Logs */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-lg border-border/40 bg-card/50 backdrop-blur-sm h-full">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-500" />
                Execution History
              </CardTitle>
              <CardDescription>Live feed of automated actions.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y divide-border/40">
                  {logs.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground text-sm">
                      No recent activity.
                    </div>
                  ) : (
                    logs.map((log, i) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={log.id}
                        className="p-4 flex items-start gap-3 hover:bg-muted/20 transition-colors"
                      >
                        {log.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive mt-1 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <p className="text-xs font-bold text-foreground truncate max-w-[150px]">
                              {log.rule_name || "System Rule"}
                            </p>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {format(
                                new Date(log.executed_at),
                                "MMM d, HH:mm"
                              )}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {log.details}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
