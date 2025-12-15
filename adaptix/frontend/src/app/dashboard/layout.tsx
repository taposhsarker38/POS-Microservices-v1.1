import Header from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import AuthGuard from "@/components/auth/AuthGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="h-full relative">
        <div className="hidden h-full md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
          <Sidebar />
        </div>
        <main className="md:pl-64">
          <Header />
          <div className="p-8">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
