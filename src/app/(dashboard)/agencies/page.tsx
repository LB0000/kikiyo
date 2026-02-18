import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getAgencies } from "@/lib/actions/agencies";
import { AgenciesClient } from "./_components/agencies-client";

export default async function AgenciesPage() {
  const user = await getAuthUser();
  if (!user || user.role !== "system_admin") {
    redirect("/dashboard");
  }

  const agencies = await getAgencies();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">代理店一覧</h1>
      </div>
      <AgenciesClient agencies={agencies} />
    </div>
  );
}
