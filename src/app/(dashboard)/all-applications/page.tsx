import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getApplications } from "@/lib/actions/applications";
import { AllApplicationsClient } from "./_components/all-applications-client";

export default async function AllApplicationsPage() {
  const user = await getAuthUser();
  if (!user || user.role !== "system_admin") {
    redirect("/dashboard");
  }

  const applications = await getApplications();

  return (
    <div className="space-y-6">
      <AllApplicationsClient applications={applications} />
    </div>
  );
}
