import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import type { UserRole } from "@/lib/supabase/types";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { Separator } from "@/components/ui/separator";

// ダッシュボード配下に入れるロール。未対応ロールはフェイルクローズで /login へ。
// 要望#4(4-D MVP): manager_user/scout_user を解放（閲覧先は /distributions に集約）。
// 代理店向け各ページ（dashboard/livers/invoices/applications）は DISTRIBUTION_ONLY_ROLES
// を /distributions へリダイレクトして締め出す。生データ閲覧の既存ページ流用は次フェーズ。
const DASHBOARD_ALLOWED_ROLES: readonly UserRole[] = [
  "system_admin",
  "agency_user",
  "manager_user",
  "scout_user",
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  if (!DASHBOARD_ALLOWED_ROLES.includes(user.role)) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <AppSidebar userRole={user.role} userEmail={user.email} />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-2 border-b px-4 bg-primary text-primary-foreground md:hidden">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
        </header>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </SidebarProvider>
  );
}
