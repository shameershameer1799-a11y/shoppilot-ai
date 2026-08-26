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

  const customerList = await db.query.customers.findMany({
    where: eq(schema.customers.businessId, business.id),
    orderBy: desc(schema.customers.aiScore),
    with: { segments: { limit: 1, orderBy: desc(schema.customerSegments.assignedAt) } },
  });

  return NextResponse.json({ customers: customerList });
}
