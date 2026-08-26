import { NextResponse } from "next/server";
import { requireBusinessUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await requireBusinessUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const business = await db.query.businesses.findFirst({ where: eq(schema.businesses.ownerId, user.id) });
  if (!business) return NextResponse.json({ error: "No business profile found" }, { status: 400 });

  const insights = await db.query.aiInsights.findMany({
    where: eq(schema.aiInsights.businessId, business.id),
    orderBy: desc(schema.aiInsights.createdAt),
  });

  return NextResponse.json({ insights });
}
