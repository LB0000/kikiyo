"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NAV_ITEMS } from "@/lib/constants";
import type { UserRole } from "@/lib/supabase/types";
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
    <Sidebar>
      <SidebarHeader className="px-6 py-6">
        <div className="flex flex-col items-center gap-1">
          <Image src="/logo.png" alt="KIKIYO" width={48} height={48} />
          <span className="text-sm font-bold tracking-wide text-pink-400">
            KIKIYO
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const Icon = ICON_MAP[item.icon];
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                    >
                      <Link href={item.href}>
                        {Icon && <Icon className="size-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="space-y-2">
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-pink-50 hover:text-pink-500 transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            ログアウト
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
