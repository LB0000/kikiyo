import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getLivers } from "@/lib/actions/livers";
import { LiversClient } from "./_components/livers-client";

export default async function LiversPage() {
  const [user, livers] = await Promise.all([getAuthUser(), getLivers()]);
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <LiversClient livers={livers} />
    </div>
  );
}
