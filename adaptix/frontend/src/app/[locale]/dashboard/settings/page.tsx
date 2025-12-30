"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoyaltySettings } from "./LoyaltySettings";
import { GeneralSettings } from "./GeneralSettings";
import { WingSettings } from "./WingSettings";
import { CustomFieldsSettings } from "./CustomFieldsSettings";
import { TaxSettings } from "./TaxSettings";
import { CurrencySettings } from "./CurrencySettings";
import { WhiteLabelSettings } from "./WhiteLabelSettings";
import { EMISettings } from "./EMISettings";
import { useTranslations } from "next-intl";
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
        <TabsList className="bg-slate-100 dark:bg-slate-800/50 p-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="taxes">Taxes</TabsTrigger>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
          <TabsTrigger value="white-label">White-labeling</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty & Rewards</TabsTrigger>
          <TabsTrigger value="emi">EMI Plans</TabsTrigger>
          <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-4">
          <GeneralSettings />
        </TabsContent>
        <TabsContent value="branches" className="space-y-4">
          <WingSettings />
        </TabsContent>
        <TabsContent value="taxes" className="space-y-4">
          <TaxSettings />
        </TabsContent>
        <TabsContent value="currencies" className="space-y-4">
          <CurrencySettings />
        </TabsContent>
        <TabsContent value="white-label" className="space-y-4">
          <WhiteLabelSettings />
        </TabsContent>
        <TabsContent value="loyalty" className="space-y-4">
          <LoyaltySettings />
        </TabsContent>
        <TabsContent value="emi" className="space-y-4">
          <EMISettings />
        </TabsContent>
        <TabsContent value="custom-fields" className="space-y-4">
          <CustomFieldsSettings />
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
