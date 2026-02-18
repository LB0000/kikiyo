import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getAgencies } from "@/lib/actions/agencies";
import { AgenciesClient } from "./_components/agencies-client";

export default async function AgenciesPage() {
  const [user, agencies] = await Promise.all([getAuthUser(), getAgencies()]);
  if (!user || user.role !== "system_admin") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <AgenciesClient agencies={agencies} />
    </div>
  );
}
