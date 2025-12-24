import { AssetClient } from "@/components/assets/asset-client";

export default function AssetsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Assets Management</h2>
      </div>
      <AssetClient />
    </div>
  );
}
