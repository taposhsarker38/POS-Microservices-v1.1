import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPIClient } from "@/components/hrms/performance/kpi-client";
import { ReviewClient } from "@/components/hrms/performance/review-client";
import { PromotionClient } from "@/components/hrms/performance/promotion-client";

export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Performance Management
        </h2>
      </div>

      <Tabs defaultValue="kpis" className="w-full">
        <TabsList>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="reviews">Performance Reviews</TabsTrigger>
          <TabsTrigger value="promotions">Promotions & Increments</TabsTrigger>
        </TabsList>
        <TabsContent value="kpis">
          <KPIClient />
        </TabsContent>
        <TabsContent value="reviews">
          <ReviewClient />
        </TabsContent>
        <TabsContent value="promotions">
          <PromotionClient />
        </TabsContent>
      </Tabs>
    </div>
  );
}
