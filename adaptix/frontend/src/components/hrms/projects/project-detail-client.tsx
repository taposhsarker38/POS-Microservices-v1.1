"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  FileEdit,
  Trash2,
  ArrowLeft,
  MoreHorizontal,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import api from "@/lib/api";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { AlertModal } from "@/components/modals/alert-modal";
import { TaskForm } from "./task-form";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectDetailClientProps {
  projectId: string;
}

export function ProjectDetailClient({ projectId }: ProjectDetailClientProps) {
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [openAlert, setOpenAlert] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await api.get(`/hrms/projects/projects/${projectId}/`);
      setProject(response.data);
      // The serializer returns nested tasks, so we can use that directly
      // Or we can fetch tasks separately if pagination is needed.
      // For now, let's use the nested tasks if available, or fetch separate if needed.
      // My serializer `ProjectDetailSerializer` includes `tasks`.
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch project details");
      router.push("/dashboard/projects");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onDeleteTask = (id: string) => {
    setDeleteTaskId(id);
    setOpenAlert(true);
  };

  const confirmDeleteTask = async () => {
    try {
      await api.delete(`/hrms/projects/tasks/${deleteTaskId}/`);
      toast.success("Task deleted");
      fetchData();
    } catch (e) {
      toast.error("Failed to delete task");
    } finally {
      setOpenAlert(false);
      setDeleteTaskId(null);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await api.patch(`/hrms/projects/tasks/${taskId}/`, { status: newStatus });
      toast.success("Status updated");
      fetchData();
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "title",
      header: "Task",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          {row.original.status === "DONE" ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <Circle className="h-4 w-4 text-slate-300" />
          )}
          <span
            className={
              row.original.status === "DONE"
                ? "line-through text-muted-foreground"
                : ""
            }
          >
            {row.original.title}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "assignee_name",
      header: "Assignee",
      cell: ({ row }) => row.original.assignee_name || "Unassigned",
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const colors: Record<string, string> = {
          LOW: "bg-slate-100 text-slate-800",
          MEDIUM: "bg-blue-100 text-blue-800",
          HIGH: "bg-orange-100 text-orange-800",
          URGENT: "bg-red-100 text-red-800",
        };
        return (
          <Badge variant="secondary" className={colors[row.original.priority]}>
            {row.original.priority}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              <Badge variant="outline">
                {row.original.status.replace("_", " ")}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => updateTaskStatus(row.original.id, "TODO")}
            >
              To Do
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateTaskStatus(row.original.id, "IN_PROGRESS")}
            >
              In Progress
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateTaskStatus(row.original.id, "REVIEW")}
            >
              In Review
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateTaskStatus(row.original.id, "DONE")}
            >
              Done
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
    {
      accessorKey: "due_date",
      header: "Due",
      cell: ({ row }) =>
        row.original.due_date
          ? format(new Date(row.original.due_date), "MMM d")
          : "-",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingTask(row.original);
              setIsTaskDialogOpen(true);
            }}
          >
            <FileEdit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500"
            onClick={() => onDeleteTask(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <div>Loading...</div>;
  if (!project) return <div>Project not found</div>;

  return (
    <div className="space-y-6">
      <AlertModal
        isOpen={openAlert}
        onClose={() => setOpenAlert(false)}
        onConfirm={confirmDeleteTask}
        loading={loading}
      />

      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Projects</span>
        </div>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {project.title}
            </h2>
            <div className="mt-2 flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Client: {project.client_name || "Internal"}</span>
              <span>•</span>
              <span>Manager: {project.manager_name || "N/A"}</span>
              <span>•</span>
              <Badge variant="outline">{project.status}</Badge>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingTask(null);
              setIsTaskDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Task
          </Button>
        </div>
        <p className="text-muted-foreground">{project.description}</p>
      </div>

      <Separator />

      {/* Task List */}
      <div>
        <h3 className="text-lg font-medium mb-4">Tasks</h3>
        <div className="rounded-md border bg-white dark:bg-slate-950">
          <DataTable columns={columns} data={tasks} searchKey="title" />
        </div>
      </div>

      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
          </DialogHeader>
          <TaskForm
            projectId={projectId}
            initialData={editingTask}
            onSuccess={() => {
              setIsTaskDialogOpen(false);
              fetchData();
            }}
            onCancel={() => setIsTaskDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
