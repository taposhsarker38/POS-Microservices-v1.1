import React from "react";
import { Zap, Play, GitBranch, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Sidebar = () => {
  const onDragStart = (
    event: React.DragEvent,
    nodeType: string,
    label: string
  ) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.setData("application/label", label);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <Card className="h-full border-l rounded-none">
      <CardHeader className="py-4">
        <CardTitle className="text-sm">Node Palette</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-muted-foreground mb-4">
          Drag these nodes to the canvas to build your workflow.
        </div>

        <div
          className="flex items-center gap-2 p-3 border rounded-lg cursor-grab hover:border-amber-500 hover:bg-amber-500/10 transition-colors bg-card"
          onDragStart={(event) => onDragStart(event, "trigger", "Trigger")}
          draggable
        >
          <Zap className="h-4 w-4 text-amber-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Trigger</span>
            <span className="text-[10px] text-muted-foreground">
              Start event
            </span>
          </div>
        </div>

        <div
          className="flex items-center gap-2 p-3 border rounded-lg cursor-grab hover:border-emerald-500 hover:bg-emerald-500/10 transition-colors bg-card"
          onDragStart={(event) => onDragStart(event, "condition", "Condition")}
          draggable
        >
          <GitBranch className="h-4 w-4 text-emerald-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Condition</span>
            <span className="text-[10px] text-muted-foreground">If logic</span>
          </div>
        </div>

        <div
          className="flex items-center gap-2 p-3 border rounded-lg cursor-grab hover:border-purple-500 hover:bg-purple-500/10 transition-colors bg-card"
          onDragStart={(event) => onDragStart(event, "approval", "Approval")}
          draggable
        >
          <UserCheck className="h-4 w-4 text-purple-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Approval</span>
            <span className="text-[10px] text-muted-foreground">
              Human review
            </span>
          </div>
        </div>

        <div
          className="flex items-center gap-2 p-3 border rounded-lg cursor-grab hover:border-blue-500 hover:bg-blue-500/10 transition-colors bg-card"
          onDragStart={(event) => onDragStart(event, "action", "Action")}
          draggable
        >
          <Play className="h-4 w-4 text-blue-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Action</span>
            <span className="text-[10px] text-muted-foreground">
              Perform task
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
