import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema, isDbConfigured } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { SettingsForm } from "@/components/business/SettingsForm";

export default async function BusinessSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.accountType !== "business") redirect("/login");

  let storeName = `${user.fullName}'s Store`;
  let supportEmail = user.email;
  if (isDbConfigured()) {
    const db = getDb();
    const business = await db.query.businesses.findFirst({ where: eq(schema.businesses.ownerId, user.id) });
    if (business) { storeName = business.storeName; supportEmail = business.supportEmail ?? user.email; }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 font-display">Settings</h1>
      <p className="text-sm mb-5 text-slate-500">Manage your business profile</p>
      <Card className="p-5 max-w-md">
        <SettingsForm storeName={storeName} supportEmail={supportEmail} />
      </Card>
    </div>
  );
}
