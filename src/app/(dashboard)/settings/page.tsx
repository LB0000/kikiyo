import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { ChangePasswordForm } from "./_components/change-password-form";

export default async function SettingsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">パスワード変更</h1>
      <ChangePasswordForm userEmail={user.email} />
    </div>
  );
}
