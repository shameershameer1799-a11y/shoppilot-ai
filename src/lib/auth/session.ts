import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  accountType: "customer" | "business";
};

/** Reads the current authenticated user from the Supabase session (server-side only).
 *  Falls back to the Drizzle `users` table for accountType when Supabase metadata
 *  does not include the field (e.g. for accounts created before the field was added). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Prefer Supabase metadata; fall back to the Drizzle users table.
  let accountType = (user.user_metadata?.account_type as "customer" | "business") ?? null;
  let fullName = (user.user_metadata?.full_name as string) ?? null;

  if (!accountType || !fullName) {
    try {
      const db = getDb();
      const dbUser = await db.query.users.findFirst({
        where: eq(schema.users.id, user.id),
      });
      if (dbUser) {
        accountType = accountType ?? dbUser.accountType;
        fullName = fullName ?? dbUser.fullName;
      }
    } catch {
      // DB may be unavailable during build or cold start; fall back gracefully.
    }
  }

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: fullName ?? user.email ?? "User",
    accountType: accountType ?? "customer",
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
