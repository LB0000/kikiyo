import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getLivers } from "@/lib/actions/livers";
import { createClient } from "@/lib/supabase/server";
import { LiversClient } from "./_components/livers-client";

export default async function LiversPage() {
  const [user, livers] = await Promise.all([getAuthUser(), getLivers()]);
  if (!user) redirect("/login");

  // admin用: 代理店リストを取得（ライバー編集の代理店変更用）
  let agencies: { id: string; name: string }[] = [];
  if (user.role === "system_admin") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("agencies")
      .select("id, name")
      .order("name");
    agencies = data ?? [];
  }

  return (
    <div className="space-y-6">
      <LiversClient
        livers={livers}
        agencies={agencies ?? []}
        isAdmin={user.role === "system_admin"}
      />
    </div>
  );
}
