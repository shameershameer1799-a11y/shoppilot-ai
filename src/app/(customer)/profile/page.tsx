import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/Card";
import { ProfileForm } from "@/components/customer/ProfileForm";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">Profile &amp; Preferences</h1>
      <p className="text-sm mb-5 text-slate-500">Manage your account</p>
      <ProfileForm fullName={user.fullName} email={user.email} />
    </div>
  );
}
