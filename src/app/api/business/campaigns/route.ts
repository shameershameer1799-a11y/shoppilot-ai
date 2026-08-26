import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const user = await requireBusinessUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const business = await db.query.businesses.findFirst({ where: eq(schema.businesses.ownerId, user.id) });
  if (!business) return NextResponse.json({ error: "No business profile found" }, { status: 400 });

  const campaignList = await db.query.campaigns.findMany({
    where: eq(schema.campaigns.businessId, business.id),
    orderBy: desc(schema.campaigns.createdAt),
  });
  return NextResponse.json({ campaigns: campaignList });
}

const createSchema = z.object({
  name: z.string().min(1),
  targetSegment: z.enum(["new", "loyal", "vip", "high_intent", "price_sensitive", "at_risk", "cart_abandoner"]).optional(),
  offer: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await requireBusinessUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const db = getDb();
  const business = await db.query.businesses.findFirst({ where: eq(schema.businesses.ownerId, user.id) });
  if (!business) return NextResponse.json({ error: "No business profile found" }, { status: 400 });

  const [campaign] = await db.insert(schema.campaigns).values({
    businessId: business.id,
    name: parsed.data.name,
    targetSegment: parsed.data.targetSegment,
    offer: parsed.data.offer,
    status: "draft",
  }).returning();

  return NextResponse.json({ campaign }, { status: 201 });
}
