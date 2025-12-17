import { ManufacturingClient } from "@/components/inventory/manufacturing/manufacturing-client";

export default function ManufacturingPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Manufacturing</h2>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950 p-6">
        <ManufacturingClient />
      </div>
    </div>
  );
}
