import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { executeApprovedCampaign } from "@/lib/ai/agents/merchant-tools";
import { recordAgentAction } from "@/lib/ai/audit";

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
  reasoning: z.string().optional(),
  expectedImpact: z.string().optional(),
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
    reasoning: parsed.data.reasoning,
    expectedImpact: parsed.data.expectedImpact,
    status: "draft",
  }).returning();

  await recordAgentAction({
    agent: "MERCHANT_GROWTH_AGENT",
    userId: user.id,
    businessId: business.id,
    action: "CREATE_CAMPAIGN_DRAFT",
    tool: "generateCampaignDraft",
    approvalStatus: "DRAFT",
    inputSummary: `Campaign: ${campaign.name}`,
    reason: "Campaign created in DRAFT status. Human merchant approval required before execution.",
    result: `Draft ID: ${campaign.id}`,
  });

  return NextResponse.json({ campaign }, { status: 201 });
}

const actionSchema = z.object({
  campaignId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
});

/**
 * Human-in-the-Loop approval gate for campaigns.
 */
export async function PATCH(req: Request) {
  const user = await requireBusinessUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const db = getDb();
  const business = await db.query.businesses.findFirst({ where: eq(schema.businesses.ownerId, user.id) });
  if (!business) return NextResponse.json({ error: "No business profile found" }, { status: 400 });

  if (parsed.data.action === "approve") {
    const updated = await executeApprovedCampaign({
      campaignId: parsed.data.campaignId,
      businessId: business.id,
      approvedByUserId: user.id,
    });
    return NextResponse.json({ campaign: updated, message: "Campaign approved and launched!" });
  } else {
    // Dismiss/reject
    const [updated] = await db
      .update(schema.campaigns)
      .set({ status: "draft" }) // Kept inactive
      .where(eq(schema.campaigns.id, parsed.data.campaignId))
      .returning();

    await recordAgentAction({
      agent: "MERCHANT_GROWTH_AGENT",
      userId: user.id,
      businessId: business.id,
      action: "REJECT_CAMPAIGN_DRAFT",
      tool: "requestMerchantApproval",
      approvalStatus: "REJECTED",
      inputSummary: `Campaign ID: ${parsed.data.campaignId}`,
      reason: "Merchant rejected campaign execution.",
      result: "Campaign dismissed.",
    });

    return NextResponse.json({ campaign: updated, message: "Campaign dismissed." });
  }
}
