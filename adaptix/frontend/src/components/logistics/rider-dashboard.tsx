"use client";

import * as React from "react";
import {
  Truck,
  Package,
  MapPin,
  CheckCircle2,
  Navigation,
  Camera,
  Signature,
  Phone,
  AlertCircle,
  ChevronRight,
  Clock,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function RiderDashboard() {
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedTask, setSelectedTask] = React.useState<any>(null);
  const [isDeliverModalOpen, setIsDeliverModalOpen] = React.useState(false);
  const [deliveryNotes, setDeliveryNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchTasks = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/logistics/shipments/my-tasks/");
      setTasks(response.data || []);
    } catch (error) {
      console.error("Failed to fetch rider tasks", error);
      toast.error("Failed to load your delivery tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCompleteDelivery = async () => {
    if (!selectedTask) return;

    try {
      setIsSubmitting(true);
      await api.patch(
        `/logistics/shipments/${selectedTask.id}/complete_delivery/`,
        {
          notes: deliveryNotes,
          location: { lat: 0, lng: 0 }, // Simulator placeholder
        }
      );

      toast.success("Delivery completed successfully!");
      setIsDeliverModalOpen(false);
      setDeliveryNotes("");
      setSelectedTask(null);
      fetchTasks();
    } catch (error) {
      toast.error("Failed to update delivery status");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20">
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">My Deliveries</h1>
        <p className="text-muted-foreground text-sm">
          You have {tasks.length} active tasks
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Truck className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold">No Pending Tasks</h3>
          <p className="text-muted-foreground text-sm mt-2">
            Great job! You've cleared all your assignments. New tasks will
            appear here.
          </p>
          <Button variant="outline" className="mt-6" onClick={fetchTasks}>
            Refresh
          </Button>
        </div>
      ) : (
        <div className="space-y-4 px-4">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="overflow-hidden border-l-4 border-l-violet-500 shadow-sm"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase"
                      >
                        {task.tracking_number.split("-")[0]}
                      </Badge>
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 capitalize">
                        {task.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-1">
                      {task.customer_name}
                    </CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Phone className="h-4 w-4 text-violet-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <p className="text-sm line-clamp-2">
                    {task.destination_address}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>Assigned {format(new Date(task.created_at), "p")}</span>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t p-3 flex gap-2">
                <Button variant="outline" className="flex-1 gap-2 text-sm h-10">
                  <Navigation className="h-4 w-4" /> Navigate
                </Button>
                <Button
                  className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700 text-sm h-10"
                  onClick={() => {
                    setSelectedTask(task);
                    setIsDeliverModalOpen(true);
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" /> Deliver
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Delivery Confirmation Modal */}
      <Dialog open={isDeliverModalOpen} onOpenChange={setIsDeliverModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Delivery</DialogTitle>
            <DialogDescription>
              Confirm delivery for{" "}
              <strong>{selectedTask?.customer_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2 border-dashed border-2"
              >
                <Camera className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs">Photo POD</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2 border-dashed border-2"
              >
                <Signature className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs">Get Signature</span>
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Delivery Notes (Optional)
              </label>
              <Textarea
                placeholder="Where did you leave the package?"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-between items-center">
            <Button
              variant="ghost"
              onClick={() => setIsDeliverModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 flex-1"
              onClick={handleCompleteDelivery}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Confirm Delivery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
