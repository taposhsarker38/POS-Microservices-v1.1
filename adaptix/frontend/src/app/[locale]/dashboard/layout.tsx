import Header from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import AuthGuard from "@/components/auth/AuthGuard";

import { CompanySetupWizard } from "@/components/onboarding/CompanySetupWizard";

import { AIAssistantWidget } from "@/components/intelligence/ai-assistant-widget";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="h-full relative">
        <div className="hidden h-full md:flex md:w-64 md:flex-col md:fixed md:inset-block-0 md:start-0 z-[80] bg-gray-900 border-r dark:border-slate-800">
          <Sidebar />
        </div>
        <main className="md:ps-64 min-h-screen">
          <Header />
          <div className="p-8">{children}</div>
          <CompanySetupWizard />
          <AIAssistantWidget />
        </main>
      </div>
    </AuthGuard>
  );
}
