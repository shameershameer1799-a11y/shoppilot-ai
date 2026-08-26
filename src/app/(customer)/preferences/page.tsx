import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

/** Preferences live inside the Profile page's second card — this route keeps the URL from the spec working. */
export default async function PreferencesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect("/profile");
}
