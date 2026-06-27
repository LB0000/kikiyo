import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import type { UserRole } from "@/lib/supabase/types";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { Separator } from "@/components/ui/separator";

// ダッシュボード配下に入れるロール。未対応ロールはフェイルクローズで /login へ。
// 要望#4: manager_user/scout_user を解放。各ページのアクセス制御:
//   dashboard / livers: scout_user のみ /distributions へ（manager は生データ閲覧可＝4-Dフル）
//   invoices / applications: admin / agency_user のみ（manager/scout は fallbackPathForRole へ）
//   agencies / all-applications: admin のみ
//   distributions: admin / manager / scout（代理店ユーザーは /invoices へ）
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
