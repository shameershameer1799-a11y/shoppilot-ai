import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  accountType: "customer" | "business";
};

/** Reads the current authenticated user from the Supabase session (server-side only). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: (user.user_metadata?.full_name as string) ?? user.email ?? "User",
    accountType: (user.user_metadata?.account_type as "customer" | "business") ?? "customer",
  };
}

/** Throws-free guard for API routes: returns null (caller should 401) if unauthenticated. */
export async function requireUser(): Promise<SessionUser | null> {
  return getCurrentUser();
}

/** Guard for business-only API routes and Server Components. */
export async function requireBusinessUser(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user || user.accountType !== "business") return null;
  return user;
}

/** Looks up (or lazily creates) the `businesses` row owned by this user. */
export async function getOrCreateBusiness(userId: string, storeName: string) {
  const db = getDb();
  const existing = await db.query.businesses.findFirst({
    where: eq(schema.businesses.ownerId, userId),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(schema.businesses)
    .values({ ownerId: userId, storeName })
    .returning();
  return created;
}
