import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getApplications } from "@/lib/actions/applications";
import { DISTRIBUTION_ONLY_ROLES } from "@/lib/constants";
import { AllApplicationsClient } from "./_components/all-applications-client";

export default async function AllApplicationsPage() {
  const [user, applications] = await Promise.all([
    getAuthUser(),
    getApplications(),
  ]);
  if (!user) redirect("/login");
  if (user.role !== "system_admin") {
    redirect(DISTRIBUTION_ONLY_ROLES.includes(user.role) ? "/distributions" : "/dashboard");
  }

  return (
    <div className="space-y-6">
      <AllApplicationsClient applications={applications} />
    </div>
  );
}
