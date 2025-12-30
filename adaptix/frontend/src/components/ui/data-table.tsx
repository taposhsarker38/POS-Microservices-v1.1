"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Download, LayoutList, Rows } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  pdfTitle?: string;
  hideSearch?: boolean; // New prop to hide internal search
  enableExport?: boolean;
  exportFileName?: string;
  isLoading?: boolean;
  onRowClick?: (row: TData) => void;
  enableGlobalFilter?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  pdfTitle,
  hideSearch = false,
  enableExport = false,
  exportFileName = "data_export",
  isLoading = false,
  onRowClick,
  enableGlobalFilter = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [density, setDensity] = React.useState<"default" | "compact">(
    "default"
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
    },
  });

  const handleExport = () => {
    const rows = table.getFilteredRowModel().rows;
    if (!rows || rows.length === 0) return;

    // Get headers from columns
    const headers = columns
      .map((col: any) => {
        if (typeof col.header === "string") return col.header;
        if (col.accessorKey) return col.accessorKey;
        return null;
      })
      .filter(Boolean);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => {
        return columns
          .map((col: any) => {
            if (col.accessorKey) {
              const val = (row.original as any)[col.accessorKey];
              const stringVal =
                val === null || val === undefined ? "" : String(val);
              return `"${stringVal.replace(/"/g, '""')}"`;
            }
            return '""';
          })
          .filter((_, i) => headers[i] != null)
          .join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${exportFileName}_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const rows = table.getFilteredRowModel().rows;
    if (!rows || rows.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const headers = columns
      .map((col: any) => {
        if (typeof col.header === "string") return col.header;
        if (col.accessorKey) return col.accessorKey;
        return null;
      })
      .filter(Boolean);

    const body = rows.map((row) => {
      return columns
        .map((col: any) => {
          if (col.accessorKey) {
            const val = (row.original as any)[col.accessorKey];
            return val === null || val === undefined ? "" : String(val);
          }
          return "";
        })
        .filter((_, i) => {
          const col = columns[i] as any;
          const header =
            typeof col.header === "string" ? col.header : col.accessorKey;
          return !!header;
        });
    });

    autoTable(doc as any, {
      head: [headers],
      body: body,
      startY: 40,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: {
        fillColor: [16, 185, 129], // Emerald-600
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { top: 40 },

      didDrawPage: (data) => {
        // --- HEADER ---
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "bold");
        const title =
          pdfTitle || exportFileName.replace(/_/g, " ").toUpperCase();
        doc.text(title, data.settings.margin.left, 22);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        const dateStr = `Generated on: ${new Date().toLocaleString()}`;
        doc.text(dateStr, data.settings.margin.left, 30);

        // Header Line
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(0.5);
        doc.line(
          data.settings.margin.left,
          34,
          pageWidth - data.settings.margin.left,
          34
        );

        // --- FOOTER ---
        const footerY = pageHeight - 10;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);

        // Page Number
        const pageNumber = `Page ${data.pageNumber}`;
        doc.text(
          pageNumber,
          pageWidth - data.settings.margin.left - 20,
          footerY
        );

        // System Branding
        doc.text(
          "Generated by Adaptix ERP System Professional Suite",
          data.settings.margin.left,
          footerY
        );
      },
    });

    doc.save(`${exportFileName}_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-2">
        {searchKey && !hideSearch && !enableGlobalFilter && (
          <Input
            placeholder={`Filter ${searchKey.replace(/_/g, " ")}...`}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        )}

        {enableGlobalFilter && (
          <Input
            placeholder="Search all columns..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
        )}

        <div className="ml-auto flex gap-2">
          {enableExport && (
            <>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="mr-2 h-4 w-4" /> PDF
              </Button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                {density === "compact" ? (
                  <LayoutList className="h-4 w-4" />
                ) : (
                  <Rows className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDensity("default")}>
                Default
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDensity("compact")}>
                Compact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center">
                    <span className="text-muted-foreground mr-2">
                      Loading data...
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick && onRowClick(row.original)}
                  className={
                    onRowClick ? "cursor-pointer hover:bg-muted/50" : ""
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={density === "compact" ? "py-1" : "py-4"}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
