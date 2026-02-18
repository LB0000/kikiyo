import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { ApplicationForm } from "./_components/application-form";

export default async function ApplicationsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">TikTok申請</h1>
      <ApplicationForm agencyId={user.agencyId} />
    </div>
  );
}
