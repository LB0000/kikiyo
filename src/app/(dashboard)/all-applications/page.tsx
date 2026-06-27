import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getApplications } from "@/lib/actions/applications";
import { fallbackPathForRole } from "@/lib/constants";
import { AllApplicationsClient } from "./_components/all-applications-client";

export default async function AllApplicationsPage() {
  const [user, applications] = await Promise.all([
    getAuthUser(),
    getApplications(),
  ]);
  if (!user) redirect("/login");
  if (user.role !== "system_admin") {
    redirect(fallbackPathForRole(user.role));
  }

  return (
    <div className="space-y-6">
      <AllApplicationsClient applications={applications} />
    </div>
  );
}
