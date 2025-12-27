"use client";

import React, { useEffect, useState } from "react";
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
  GitBranch,
  Layers,
  Calendar,
  UserCheck,
  Maximize2,
} from "lucide-react";
import { WorkflowBuilder } from "@/components/intelligence/automation/WorkflowBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface Workflow {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  flow_data: {
    nodes: any[];
    edges: any[];
  };
}

interface WorkflowInstance {
  id: string;
  workflow_name: string;
  status: string;
  current_node_id: string;
  started_at: string;
}

export default function AutomationHub() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewRuleOpen, setIsNewRuleOpen] = useState(false);
  const [isNewWorkflowOpen, setIsNewWorkflowOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [activeTab, setActiveTab] = useState("rules");

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
      const [rulesRes, logsRes, wfRes, instRes] = await Promise.all([
        api.get("/intelligence/automation/rules/"),
        api.get("/intelligence/automation/logs/"),
        api.get("/intelligence/automation/workflows/"),
        api.get("/intelligence/automation/instances/"),
      ]);
      setRules(rulesRes.data);
      setLogs(logsRes.data);
      setWorkflows(wfRes.data || []);
      setInstances(instRes.data || []);
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

  const handleSaveWorkflow = async (flowData: any) => {
    try {
      if (!newWorkflowName) {
        toast.error("Please provide a name for the workflow");
        return;
      }

      const payload = {
        name: newWorkflowName,
        description: "Created via Visual Builder",
        is_active: true,
        flow_data: flowData,
      };

      await api.post("/intelligence/automation/workflows/", payload);
      toast.success("Workflow saved successfully!");
      setIsNewWorkflowOpen(false);
      setNewWorkflowName("");
      fetchData();
    } catch (e) {
      toast.error("Failed to save workflow");
      console.error(e);
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
        <Dialog open={isNewWorkflowOpen} onOpenChange={setIsNewWorkflowOpen}>
          <DialogContent className="!fixed !z-[100] !top-16 !left-0 sm:!left-64 !w-full sm:!w-[calc(100vw-16rem)] !h-[calc(100vh-4rem)] !max-w-none !translate-x-0 !translate-y-0 !rounded-none border-l shadow-2xl p-0 flex flex-col gap-0 duration-200 data-[state=open]:slide-in-from-right-1/2 data-[state=closed]:slide-out-to-right-1/2">
            <DialogHeader className="p-4 border-b">
              <div className="flex items-center justify-between mr-8">
                <DialogTitle>Visual Workflow Builder</DialogTitle>
                <Input
                  placeholder="Workflow Name (e.g. High Value Order Approval)"
                  className="max-w-md"
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                />
              </div>
            </DialogHeader>
            <div className="flex-1 bg-slate-50 relative">
              <WorkflowBuilder onSave={handleSaveWorkflow} />
            </div>
          </DialogContent>
        </Dialog>

        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
            <Zap className="text-amber-500 fill-amber-500" />
            Workflow Automation
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Build complex multi-step automated workflows and scheduled jobs.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setIsNewWorkflowOpen(true)}
            className="gap-2"
          >
            <GitBranch className="h-4 w-4" /> New Workflow
          </Button>
          <Dialog open={isNewRuleOpen} onOpenChange={setIsNewRuleOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2">
                <Plus className="h-4 w-4" /> Create Rule
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
                        <SelectItem value="scheduled">Scheduled Job</SelectItem>
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
                    <label className="text-sm font-medium">
                      Recipient Email
                    </label>
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
                <Button
                  variant="outline"
                  onClick={() => setIsNewRuleOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateRule} className="bg-primary">
                  Save Rule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="rules" className="gap-2">
            <Zap className="h-4 w-4" /> Trigger Rules
          </TabsTrigger>
          <TabsTrigger value="workflows" className="gap-2">
            <GitBranch className="h-4 w-4" /> Multi-step flows
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Activity className="h-4 w-4" /> Execution History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card className="shadow-lg border-border/40 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                    Automation Rules
                  </CardTitle>
                  <CardDescription>
                    Event-driven simple triggers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 border-b border-border/50">
                        <TableHead>Rule Name</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-semibold">
                            {rule.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {rule.trigger_type.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-xs">
                              {getActionIcon(rule.action_type)}
                              <span className="capitalize">
                                {rule.action_type}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "w-10 h-5 p-0 rounded-full",
                                rule.is_active
                                  ? "bg-emerald-500/20 text-emerald-500"
                                  : "bg-muted text-muted-foreground"
                              )}
                              onClick={() =>
                                toggleRule(rule.id, rule.is_active)
                              }
                            >
                              {rule.is_active ? "ON" : "OFF"}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRule(rule.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
                <CardHeader>
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    size="sm"
                  >
                    <Calendar className="h-4 w-4" /> Schedule Backup
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    size="sm"
                  >
                    <Mail className="h-4 w-4" /> Weekly Summary
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              {workflows.length === 0 ? (
                <Card className="p-12 text-center border-dashed border-2">
                  <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <h3 className="font-semibold mb-1">
                    No multi-step workflows
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create complex logic with multiple nodes.
                  </p>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Create Workflow
                  </Button>
                </Card>
              ) : (
                workflows.map((wf) => (
                  <Card
                    key={wf.id}
                    className="group hover:border-primary/50 transition-colors"
                  >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div>
                        <CardTitle className="text-base">{wf.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {wf.description}
                        </CardDescription>
                      </div>
                      <Badge variant={wf.is_active ? "default" : "secondary"}>
                        {wf.is_active ? "Active" : "Paused"}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        {wf.flow_data.nodes.map((node, i) => (
                          <React.Fragment key={node.id}>
                            <div className="p-2 rounded bg-muted/50 border border-border flex items-center gap-2 text-[10px] font-medium">
                              {node.type === "trigger" && (
                                <Zap className="h-3 w-3 text-amber-500" />
                              )}
                              {node.type === "action" && (
                                <Play className="h-3 w-3 text-primary" />
                              )}
                              {node.type === "approval" && (
                                <UserCheck className="h-3 w-3 text-purple-500" />
                              )}
                              {node.type === "condition" && (
                                <GitBranch className="h-3 w-3 text-emerald-500" />
                              )}
                              <span className="capitalize">{node.type}</span>
                            </div>
                            {i < wf.flow_data.nodes.length - 1 && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Running Instances</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {instances.map((inst) => (
                        <div
                          key={inst.id}
                          className="text-xs p-2 rounded bg-muted/30 border border-border"
                        >
                          <div className="flex justify-between mb-1">
                            <span className="font-bold">
                              {inst.workflow_name}
                            </span>
                            <Badge
                              variant="outline"
                              className="scale-75 origin-right"
                            >
                              {inst.status}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-[10px]">
                            Current Node: {inst.current_node_id}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Execution History</CardTitle>
              <CardDescription>
                Live log of all automation events.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Trigger Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Execution Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(log.executed_at), "PPP HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium text-xs">
                        {log.rule_name || "System"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status === "success" ? "default" : "destructive"
                          }
                          className="text-[10px]"
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[200px]">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
