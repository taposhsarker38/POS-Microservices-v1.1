import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface NodeConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  node: any;
  onSave: (nodeId: string, data: any) => void;
}

export const NodeConfigDialog = ({
  isOpen,
  onClose,
  node,
  onSave,
}: NodeConfigDialogProps) => {
  const [data, setData] = React.useState<any>({});

  React.useEffect(() => {
    if (node) {
      setData(node.data || {});
    }
  }, [node]);

  const handleSave = () => {
    let finalData = { ...node.data, ...data };

    // Generate cron if not custom
    if (
      data.trigger_type === "scheduled" &&
      data.schedule_frequency !== "custom"
    ) {
      const [hour, minute] = (data.schedule_time || "09:00").split(":");
      const days = (data.schedule_days || []).join(",");

      let cron = "";
      if (data.schedule_frequency === "daily") {
        cron = `${minute} ${hour} * * *`;
      } else if (data.schedule_frequency === "weekly") {
        cron = `${minute} ${hour} * * ${days || "*"}`;
      } else if (data.schedule_frequency === "monthly") {
        cron = `${minute} ${hour} 1 * *`;
      }
      finalData.cron = cron;
    }

    onSave(node.id, {
      ...finalData,
      label: generateLabel(node.type, finalData),
    });
    onClose();
  };

  const generateLabel = (type: string, data: any) => {
    switch (type) {
      case "trigger":
        return `Trigger: ${data.trigger_type || "Unknown"}`;
      case "condition":
        return `If ${data.field || "Field"} ${data.operator || "=="} ${
          data.value || "Value"
        }`;
      case "action":
        return `Action: ${data.action_type || "None"}`;
      case "approval":
        return `Approval: ${data.role || "Manager"}`;
      default:
        return type;
    }
  };

  if (!node) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure {node.type} Node</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {node.type === "trigger" && (
            <div className="grid gap-2">
              <Label>Trigger Event</Label>
              <Select
                value={data.trigger_type}
                onValueChange={(v) => setData({ ...data, trigger_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock_level">
                    Stock Level Change
                  </SelectItem>
                  <SelectItem value="new_order">New Order Created</SelectItem>
                  <SelectItem value="payment_failed">Payment Failed</SelectItem>
                  <SelectItem value="scheduled">Scheduled Job</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {node.type === "trigger" && data.trigger_type === "scheduled" && (
            <div className="space-y-4 border p-3 rounded-md bg-muted/20">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                Schedule Configuration
              </Label>

              <div className="grid gap-2">
                <Label>Frequency</Label>
                <Select
                  value={data.schedule_frequency || "daily"}
                  onValueChange={(v) => {
                    const newData = { ...data, schedule_frequency: v };
                    // Reset cron if moving away from custom
                    if (
                      v !== "custom" &&
                      data.schedule_frequency === "custom"
                    ) {
                      newData.cron = "";
                    }
                    setData(newData);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">
                      Monthly (1st of month)
                    </SelectItem>
                    <SelectItem value="custom">
                      Custom Cron Expression
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {data.schedule_frequency === "custom" ? (
                <div className="grid gap-2">
                  <Label>Cron Expression</Label>
                  <Input
                    value={data.cron || ""}
                    onChange={(e) => setData({ ...data, cron: e.target.value })}
                    placeholder="e.g. 0 17 * * 5"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Min Hour Day Month Weekday
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label>Time (24h)</Label>
                    <Input
                      type="time"
                      value={data.schedule_time || "09:00"}
                      onChange={(e) =>
                        setData({ ...data, schedule_time: e.target.value })
                      }
                    />
                  </div>

                  {data.schedule_frequency === "weekly" && (
                    <div className="grid gap-2">
                      <Label>Days of Week</Label>
                      <div className="flex flex-wrap gap-2">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                          (day, idx) => {
                            // cron days: 0=Sun, 1=Mon...6=Sat. Let's align with that or usage 1-7.
                            // standard cron: 0 or 7 is Sunday. 1 is Mon.
                            // Let's use 1=Mon, 7=Sun.
                            const dayNum = idx + 1;
                            const currentDays = (data.schedule_days || []).map(
                              Number
                            );
                            const isSelected = currentDays.includes(dayNum);

                            return (
                              <div
                                key={day}
                                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer border transition-colors ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background hover:bg-muted"
                                }`}
                                onClick={() => {
                                  const newDays = isSelected
                                    ? currentDays.filter(
                                        (d: number) => d !== dayNum
                                      )
                                    : [...currentDays, dayNum];
                                  setData({
                                    ...data,
                                    schedule_days: newDays.sort(),
                                  });
                                }}
                              >
                                {day}
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {node.type === "condition" && (
            <>
              <div className="grid gap-2">
                <Label>Field</Label>
                <Input
                  value={data.field || ""}
                  onChange={(e) => setData({ ...data, field: e.target.value })}
                  placeholder="e.g. total_amount"
                />
              </div>
              <div className="grid gap-2">
                <Label>Operator</Label>
                <Select
                  value={data.operator}
                  onValueChange={(v) => setData({ ...data, operator: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">">&gt; (Greater than)</SelectItem>
                    <SelectItem value="<">&lt; (Less than)</SelectItem>
                    <SelectItem value="==">== (Equals)</SelectItem>
                    <SelectItem value="!=">!= (Not Equals)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Value</Label>
                <Input
                  value={data.value || ""}
                  onChange={(e) => setData({ ...data, value: e.target.value })}
                  placeholder="e.g. 10000"
                />
              </div>
            </>
          )}

          {node.type === "action" && (
            <>
              <div className="grid gap-2">
                <Label>Action Type</Label>
                <Select
                  value={data.action_type}
                  onValueChange={(v) => setData({ ...data, action_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Send Email</SelectItem>
                    <SelectItem value="webhook">Call Webhook</SelectItem>
                    <SelectItem value="log">Log to Console</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {data.action_type === "email" && (
                <div className="grid gap-2">
                  <Label>Recipient</Label>
                  <Input
                    value={data.to || ""}
                    onChange={(e) => setData({ ...data, to: e.target.value })}
                    placeholder="admin@example.com"
                  />
                </div>
              )}
            </>
          )}

          {node.type === "approval" && (
            <div className="grid gap-2">
              <Label>Required Role</Label>
              <Select
                value={data.role}
                onValueChange={(v) => setData({ ...data, role: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
