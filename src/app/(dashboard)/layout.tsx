import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import type { UserRole } from "@/lib/supabase/types";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { Separator } from "@/components/ui/separator";

// 要望#4: manager_user/scout_user はロール enum・型としては追加済みだが、
// 専用画面・「担当分のみ表示」の配線は 4-D で実装する。それまではフェイルクローズで
// 未対応ロールをダッシュボードから締め出す（マイグレ032適用後・037適用前に
// monthly_reports 等が認証済み全ユーザーへ漏れる経路を塞ぐ）。4-D で manager/scout を
// 解放する際は、ここと各ページ・Server Action のガードを同時に更新すること。
const DASHBOARD_ALLOWED_ROLES: readonly UserRole[] = [
  "system_admin",
  "agency_user",
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
