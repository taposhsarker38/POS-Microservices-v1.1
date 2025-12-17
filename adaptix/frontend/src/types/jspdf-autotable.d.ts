declare module "jspdf-autotable" {
  import { jsPDF } from "jspdf";

  interface AutoTableOptions {
    head?: any[][];
    body?: any[][];
    foot?: any[][];
    html?: string | HTMLTableElement;
    startY?: number;
    margin?: any;
    pageBreak?: "auto" | "avoid" | "always";
    rowPageBreak?: "auto" | "avoid";
    tableWidth?: "auto" | "wrap" | number;
    showHead?: "everyPage" | "firstPage" | "never";
    showFoot?: "everyPage" | "lastPage" | "never";
    tableLineWidth?: number;
    tableLineColor?: any;
    styles?: any;
    headStyles?: any;
    bodyStyles?: any;
    footStyles?: any;
    alternateRowStyles?: any;
    columnStyles?: any;
    didDrawPage?: (data: any) => void;
    // ... add other options as needed
  }

  export default function autoTable(
    doc: jsPDF,
    options: AutoTableOptions
  ): void;
}
