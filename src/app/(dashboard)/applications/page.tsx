import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { ApplicationForm } from "./_components/application-form";

export default async function ApplicationsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-3 text-2xl font-bold">
        <span className="inline-block h-8 w-1 rounded bg-pink-400" />
        TikTok申請
      </h1>
      <ApplicationForm agencyId={user.agencyId} />
    </div>
  );
}
