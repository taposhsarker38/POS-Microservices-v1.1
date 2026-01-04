"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { FileText, QrCode, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function UnitTracking() {
  const { data: units, isLoading } = useQuery({
    queryKey: ["product-units"],
    queryFn: async () => {
      const res = await api.get("/manufacturing/units/");
      return res.data.results || res.data;
    },
  });

  const downloadReport = async (type: string) => {
    try {
      let endpoint = "";
      if (type === "daily")
        endpoint = "/reporting/analytics/export-daily-production/";
      else if (type === "ssl")
        endpoint = "/reporting/analytics/export-client-progress/";
      else if (type === "qr")
        endpoint = "/reporting/analytics/export-qr-labels/";

      const response = await api.get(endpoint, {
        params: { company_uuid: localStorage.getItem("company_uuid") },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${type}_report_${new Date().toISOString().split("T")[0]}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Report downloaded successfully");
    } catch (error) {
      toast.error("Failed to download report");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-violet-200 bg-violet-50/10">
          <CardHeader>
            <CardTitle className="sm:text-md flex items-center gap-2">
              <FileText className="h-5 w-5 text-violet-500" />
              Production Report
            </CardTitle>
            <CardDescription className="text-xs">
              Daily summary & QC stats for management.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => downloadReport("daily")}
              variant="outline"
              size="sm"
              className="w-full gap-2 border-violet-200 hover:bg-violet-100"
            >
              <Download className="h-4 w-4" /> Export Report
            </Button>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50/10">
          <CardHeader>
            <CardTitle className="sm:text-md flex items-center gap-2">
              <Loader2 className="h-5 w-5 text-indigo-500" />
              Client Progress
            </CardTitle>
            <CardDescription className="text-xs">
              Bulk order snapshot for any client.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => downloadReport("ssl")}
              variant="outline"
              size="sm"
              className="w-full gap-2 border-indigo-200 hover:bg-indigo-100"
            >
              <Download className="h-4 w-4" /> Export Progress
            </Button>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/10">
          <CardHeader>
            <CardTitle className="sm:text-md flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-500" />
              Print QR Labels
            </CardTitle>
            <CardDescription className="text-xs">
              Generate printable QR labels for units.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => downloadReport("qr")}
              variant="outline"
              size="sm"
              className="w-full gap-2 border-emerald-200 hover:bg-emerald-100"
            >
              <Download className="h-4 w-4" /> Download Labels
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50">
          <CardTitle className="text-lg">
            Individual Unit Tracking (QR Engine)
          </CardTitle>
          <CardDescription>
            Unique serial numbers generated for every unit produced.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Serial Number</TableHead>
                <TableHead>Model / Specs</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>History & QR</TableHead>
                <TableHead className="pr-6">Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground mb-2" />
                    Loading units...
                  </TableCell>
                </TableRow>
              ) : Array.isArray(units) && units.length > 0 ? (
                units.map((unit: any) => (
                  <TableRow
                    key={unit.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-violet-600">
                          {unit.serial_number}
                        </span>
                        {unit.warranty_expiry && (
                          <span className="text-[10px] text-muted-foreground">
                            Warranty till:{" "}
                            {new Date(
                              unit.warranty_expiry
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-sm">
                          {unit.model_name || "N/A"}
                        </span>
                        <div className="flex gap-1">
                          {unit.color && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 h-4"
                            >
                              {unit.color}
                            </Badge>
                          )}
                          {unit.size && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 h-4"
                            >
                              {unit.size}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-600">
                      PO-{unit.production_order}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          unit.status === "SHIPPED"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : unit.status === "REWORK"
                            ? "bg-rose-100 text-rose-700 hover:bg-rose-100"
                            : unit.status === "QC"
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-100"
                        }
                      >
                        {unit.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        >
                          <QrCode className="h-4 w-4 mr-1" /> QR
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                        >
                          <Loader2 className="h-4 w-4 mr-1" /> Journey
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="pr-6 text-muted-foreground text-[10px] font-medium">
                      {new Date(unit.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-muted-foreground"
                  >
                    <QrCode className="h-10 w-10 mx-auto opacity-20 mb-2" />
                    <p>No individual units tracked yet.</p>
                    <p className="text-xs">
                      Units are automatically generated when a Production Order
                      is confirmed.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
