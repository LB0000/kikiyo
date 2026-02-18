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
    <div className="space-y-6">
      <AgenciesClient agencies={agencies} />
    </div>
  );
}
