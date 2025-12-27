import React, { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Panel,
  Connection,
  Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Sidebar } from "./Sidebar";
import { NodeConfigDialog } from "./NodeConfigDialog";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";

const initialNodes = [
  {
    id: "1",
    type: "input",
    data: { label: "Start Workflow" },
    position: { x: 250, y: 5 },
  },
];

let id = 0;
const getId = () => `dnd_node_${id++}`;

export const WorkflowBuilder = ({
  onSave,
  initialData,
}: {
  onSave: (data: any) => void;
  initialData?: any;
}) => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialData?.nodes || initialNodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialData?.edges || []
  );
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds
        )
      ),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      const label = event.dataTransfer.getData("application/label");

      // check if the dropped element is valid
      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type: "default", // Using default node for generic container, but we store logical type in data
        position,
        data: { label: `${label}`, logicalType: type },
        style: {
          border: "1px solid #777",
          padding: 10,
          borderRadius: 5,
          background:
            type === "condition"
              ? "#ecfdf5"
              : type === "trigger"
              ? "#fffbeb"
              : type === "action"
              ? "#eff6ff"
              : "#fff",
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeClick = (event: React.MouseEvent, node: any) => {
    // Open config only for dropping nodes, not the start node if it's special
    setSelectedNode({ ...node, type: node.data.logicalType || "default" });
    setIsConfigOpen(true);
  };

  const handleNodeSave = (nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          // update label and data
          return {
            ...node,
            data: { ...node.data, ...data, label: data.label },
          };
        }
        return node;
      })
    );
  };

  const handleSaveWorkflow = () => {
    // Serialize
    const flowData = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.logicalType || "default", // Use our logical type
        position: n.position,
        data: n.data,
      })),
      edges: edges,
    };
    onSave(flowData);
  };

  return (
    <div className="flex flex-col h-[600px] w-full border rounded-md bg-white">
      <div className="flex h-full">
        <ReactFlowProvider>
          <div className="flex-grow h-full" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              fitView
            >
              <Controls />
              <Background />
              <Panel position="top-right">
                <Button
                  onClick={handleSaveWorkflow}
                  className="gap-2 shadow-lg"
                >
                  <Save className="h-4 w-4" /> Save Workflow
                </Button>
              </Panel>
            </ReactFlow>
          </div>
        </ReactFlowProvider>
        <div className="w-64 border-l bg-muted/10">
          <Sidebar />
        </div>
      </div>

      <NodeConfigDialog
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        node={selectedNode}
        onSave={handleNodeSave}
      />
    </div>
  );
};
