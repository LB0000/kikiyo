"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NAV_ITEMS } from "@/lib/constants";
import type { UserRole } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  Monitor,
  ListOrdered,
  FileText,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  users: Users,
  building2: Building2,
  monitor: Monitor,
  "list-ordered": ListOrdered,
  "file-text": FileText,
};

type AppSidebarProps = {
  userRole: UserRole;
  userEmail: string;
};

export function AppSidebar({ userRole, userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const filteredItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  const initials = userEmail.split("@")[0].slice(0, 2).toUpperCase();

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch {
      // サインアウト失敗してもログイン画面に遷移
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar className="border-r-0">
      {/* ── Brand Header ── */}
      <SidebarHeader className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md shadow-primary/25">
            <Image src="/logo.png" alt="KIKIYO" width={28} height={28} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider text-foreground">
              KIKIYO
            </h1>
            <p className="text-[10px] font-medium tracking-[0.2em] text-muted-foreground uppercase">
              Live Manager
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* ── Gradient Divider ── */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

      {/* ── Navigation ── */}
      <SidebarContent className="px-3 pt-6">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">
            メニュー
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {filteredItems.map((item) => {
                const Icon = ICON_MAP[item.icon];
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      size="lg"
                      className={
                        isActive
                          ? "bg-primary/10 text-primary border-l-[3px] border-primary font-semibold rounded-l-none"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60 border-l-[3px] border-transparent"
                      }
                    >
                      <Link href={item.href} prefetch={true}>
                        {Icon && (
                          <Icon
                            className={`size-[18px] shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/70"}`}
                          />
                        )}
                        <span className="text-[15px]">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="p-4">
        <div className="mx-2 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-xs font-bold text-primary-foreground shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {userEmail.split("@")[0]}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="mt-1 w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          ログアウト
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
