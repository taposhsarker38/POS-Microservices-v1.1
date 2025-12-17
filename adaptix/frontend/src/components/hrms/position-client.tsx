"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { toast } from "sonner";
import { AlertModal } from "@/components/modals/alert-modal";

interface Position {
  id: string;
  name: string;
  rank: number;
}

export function PositionClient() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [formData, setFormData] = useState({ name: "", rank: 1 });

  const [openAlert, setOpenAlert] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchPositions = async () => {
    try {
      const response = await api.get("/hrms/employees/designations/");
      setPositions(response.data.results || response.data);
    } catch (error) {
      console.error("Failed to fetch positions", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  const handleSubmit = async () => {
    try {
      if (editingPos) {
        await api.put(
          `/hrms/employees/designations/${editingPos.id}/`,
          formData
        );
        toast.success("Position updated");
      } else {
        await api.post("/hrms/employees/designations/", formData);
        toast.success("Position created");
      }
      setIsDialogOpen(false);
      setEditingPos(null);
      setFormData({ name: "", rank: 1 });
      fetchPositions();
    } catch (error) {
      toast.error("Operation failed");
    }
  };

  const onDelete = (id: string) => {
    setDeleteId(id);
    setOpenAlert(true);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      await api.delete(`/hrms/employees/designations/${deleteId}/`);
      toast.success("Position deleted");
      fetchPositions();
    } catch (error) {
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
      setOpenAlert(false);
      setDeleteId(null);
    }
  };

  const openEdit = (pos: Position) => {
    setEditingPos(pos);
    setFormData({ name: pos.name, rank: pos.rank });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingPos(null);
    setFormData({ name: "", rank: 1 });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <AlertModal
        isOpen={openAlert}
        onClose={() => setOpenAlert(false)}
        onConfirm={confirmDelete}
        loading={loading}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          Positions (Designations)
        </h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Position
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Rank (1=Top)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : positions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4">
                  No positions found.
                </TableCell>
              </TableRow>
            ) : (
              positions.map((pos) => (
                <TableRow key={pos.id}>
                  <TableCell className="font-medium">{pos.name}</TableCell>
                  <TableCell>{pos.rank}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(pos)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => onDelete(pos.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPos ? "Edit Position" : "Add Position"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Job Title</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rank">Rank Level (Lower = Senior)</Label>
              <Input
                id="rank"
                type="number"
                value={formData.rank}
                onChange={(e) =>
                  setFormData({ ...formData, rank: parseInt(e.target.value) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
