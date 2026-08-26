import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { searchAndRankProducts } from "@/lib/ai/service";

/**
 * Dashboard-style recommendations: blends the user's stored
 * preferences + recent search history into a ranked product list.
 */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const prefs = await db.query.customerPreferences.findFirst({ where: eq(schema.customerPreferences.userId, user.id) });
  const recentSearches = await db.query.searchHistory.findMany({
    where: eq(schema.searchHistory.userId, user.id),
    orderBy: desc(schema.searchHistory.createdAt),
    limit: 3,
  });

  const matches = await searchAndRankProducts({
    category: prefs?.preferredCategories?.[0],
    budgetMax: prefs?.budgetMax ? Number(prefs.budgetMax) : undefined,
    keywords: recentSearches.map((s) => s.query),
  }, 6);

  return NextResponse.json({ matches });
}
