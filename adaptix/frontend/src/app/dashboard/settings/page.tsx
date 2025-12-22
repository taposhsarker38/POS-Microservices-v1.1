"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoyaltySettings } from "./LoyaltySettings";
import { GeneralSettings } from "./GeneralSettings";
import { WingSettings } from "./WingSettings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your company preferences and system configurations.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty & Rewards</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-4">
          <GeneralSettings />
        </TabsContent>
        <TabsContent value="branches" className="space-y-4">
          <WingSettings />
        </TabsContent>
        <TabsContent value="loyalty" className="space-y-4">
          <LoyaltySettings />
        </TabsContent>
        <TabsContent value="notifications">
          <div className="text-sm text-slate-500 p-4">
            Notification settings coming soon.
          </div>
        </TabsContent>
        <TabsContent value="billing">
          <div className="text-sm text-slate-500 p-4">
            Billing settings coming soon.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
