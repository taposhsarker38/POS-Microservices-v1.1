"use client";

import { useEffect, useState } from "react";
import {
  Network,
  Plus,
  ChevronRight,
  ChevronDown,
  Building2,
  Home,
  Factory,
  MoreVertical,
  PlusCircle,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader } from "@/components/ui/loader";
import { motion, AnimatePresence } from "framer-motion";
import { OrganizationWizard } from "@/components/organization/OrganizationWizard";

interface Wing {
  id: string;
  name: string;
  code: string;
}

interface OrgNode {
  id: string;
  name: string;
  code: string;
  is_group: boolean;
  type: "GROUP" | "HOLDING" | "UNIT";
  subsidiaries: OrgNode[];
  wings: Wing[];
}

export default function OrganizationHub() {
  const [tree, setTree] = useState<OrgNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Wizard State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardConfig, setWizardConfig] = useState<{
    parentId?: string;
    parentName?: string;
    type: "GROUP" | "HOLDING" | "UNIT" | "BRANCH";
  }>({ type: "UNIT" });

  const openWizard = (type: any, parentId?: string, parentName?: string) => {
    setWizardConfig({ type, parentId, parentName });
    setWizardOpen(true);
  };

  const fetchTree = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/company/info/tree/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setTree(data);
        // Initially expand the root
        if (data.id) setExpandedNodes(new Set([data.id]));
      }
    } catch (error) {
      toast.error("Failed to load organization tree");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  if (loading) return <Loader fullScreen text="Loading Hierarchy..." />;

  return (
    <div className="p-8 space-y-6 bg-slate-50/50 min-h-screen dark:bg-slate-950/50">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Network className="h-8 w-8 text-indigo-600" />
            Organization Hub
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your Group of Companies, Holdings, and Branches visually.
          </p>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
          onClick={() => openWizard("GROUP")}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add Root Group
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Organizational Structure</CardTitle>
            <CardDescription>
              Click items to expand and manage subsidiaries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tree ? (
              <div className="space-y-4">
                <NodeView
                  node={tree}
                  level={0}
                  expandedNodes={expandedNodes}
                  onToggle={toggleExpand}
                  onAdd={openWizard}
                />
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <Building2 className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-500">No organizational data found.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-indigo-100 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-900/10">
            <CardHeader>
              <CardTitle className="text-sm">Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500 space-y-3 leading-relaxed">
              <p>
                • <strong>Groups</strong> contain Holdings and Units.
              </p>
              <p>
                • <strong>Holdings</strong> represent regional or industrial
                divisions.
              </p>
              <p>
                • <strong>Units</strong> are legal entities/companies.
              </p>
              <p>
                • <strong>Branches</strong> (Wings) are specific locations under
                a Unit.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">
              <p className="italic">No recent changes recorded.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <OrganizationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        type={wizardConfig.type}
        parentId={wizardConfig.parentId}
        parentName={wizardConfig.parentName}
        onSuccess={fetchTree}
      />
    </div>
  );
}

function NodeView({
  node,
  level,
  expandedNodes,
  onToggle,
  onAdd,
}: {
  node: OrgNode;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  onAdd: (type: any, id: string, name: string) => void;
}) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.subsidiaries.length > 0 || node.wings.length > 0;

  const nodeColors = {
    GROUP:
      "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    HOLDING:
      "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    UNIT: "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  };

  const Icons = {
    GROUP: Network,
    HOLDING: Home,
    UNIT: Building2,
  };

  const NodeIcon = Icons[node.type];

  return (
    <div className="space-y-2">
      <div
        className={`flex items-center gap-4 p-3 rounded-lg border-l-4 shadow-sm group transition-all hover:shadow-md cursor-pointer ${
          nodeColors[node.type]
        } dark:border-slate-800`}
        style={{ marginLeft: `${level * 24}px` }}
        onClick={() => onToggle(node.id)}
      >
        <div className="flex items-center gap-3 flex-1">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <div className="w-4" />
          )}
          <NodeIcon className="h-5 w-5" />
          <div>
            <p className="font-bold text-sm leading-none flex items-center gap-2">
              {node.name}
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-bold tracking-tighter h-4 px-1 border-current"
              >
                {node.type}
              </Badge>
            </p>
            <p className="text-[10px] opacity-70 mt-1 uppercase tracking-widest">
              {node.code}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-black/5 dark:hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onAdd(
                node.type === "GROUP" ? "HOLDING" : "UNIT",
                node.id,
                node.name
              );
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2"
                onClick={() =>
                  onAdd(
                    node.type === "GROUP" ? "HOLDING" : "UNIT",
                    node.id,
                    node.name
                  )
                }
              >
                <PlusCircle className="h-4 w-4" /> Add Subsidiary
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onClick={() => onAdd("BRANCH", node.id, node.name)}
              >
                <Factory className="h-4 w-4" /> Add Branch
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = "/dashboard/settings";
                }}
              >
                <Settings2 className="h-4 w-4" /> Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {node.subsidiaries.map((sub) => (
              <NodeView
                key={sub.id}
                node={sub}
                level={level + 1}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onAdd={onAdd}
              />
            ))}
            {node.wings.map((wing) => (
              <div
                key={wing.id}
                className="flex items-center gap-4 p-2 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 ml-6 group transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                style={{ marginLeft: `${(level + 1) * 24}px` }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-4 h-4 rounded-full bg-slate-400 flex items-center justify-center text-[8px] text-white">
                    B
                  </div>
                  <Factory className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                      {wing.name}
                    </p>
                    <p className="text-[9px] text-slate-500 uppercase">
                      {wing.code}
                    </p>
                  </div>
                </div>
                <Badge className="text-[10px] bg-slate-200 text-slate-700 hover:bg-slate-200">
                  BRANCH
                </Badge>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
