import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getAgencies } from "@/lib/actions/agencies";
import { DISTRIBUTION_ONLY_ROLES } from "@/lib/constants";
import { AgenciesClient } from "./_components/agencies-client";

export default async function AgenciesPage() {
  const [user, agencies] = await Promise.all([getAuthUser(), getAgencies()]);
  if (!user) redirect("/login");
  if (user.role !== "system_admin") {
    redirect(DISTRIBUTION_ONLY_ROLES.includes(user.role) ? "/distributions" : "/dashboard");
  }

  return (
    <div className="space-y-6">
      <AgenciesClient agencies={agencies} />
    </div>
  );
}
