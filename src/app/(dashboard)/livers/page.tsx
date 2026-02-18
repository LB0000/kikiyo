import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getLivers } from "@/lib/actions/livers";
import { LiversClient } from "./_components/livers-client";

export default async function LiversPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const livers = await getLivers();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ライバー名簿</h1>
      <LiversClient livers={livers} />
    </div>
  );
}
