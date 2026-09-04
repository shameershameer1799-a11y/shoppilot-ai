import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { runShoppingChat, runGrowthAnalysis } from "@/lib/ai/service";

const bodySchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  kind: z.enum(["shopping", "growth"]).default("shopping"),
});

/**
 * Unified chat endpoint used by both /ai-shop (customer) and
 * /business/ai-growth (business).
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const db = getDb();
  let conversationId = parsed.data.conversationId;
  if (!conversationId) {
    const [conv] = await db.insert(schema.aiConversations).values({
      userId: user.id,
      kind: parsed.data.kind,
      title: parsed.data.message.slice(0, 60),
    }).returning();
    conversationId = conv.id;
  }

  await db.insert(schema.aiMessages).values({
    conversationId,
    role: "user",
    content: parsed.data.message,
  });

  let assistantContent: string;
  let responseData: Record<string, unknown> = {};

  if (parsed.data.kind === "shopping") {
    const result = await runShoppingChat(parsed.data.message, user.id);
    assistantContent = result.content;
    responseData = {
      requirements: result.requirements,
      matches: result.matches,
      comparison: result.comparison,
      upsells: result.upsells,
      cart: result.cart,
      checkout: result.checkout,
      recoveryAlternative: result.recoveryAlternative,
    };
  } else {
    const business = await db.query.businesses.findFirst({ where: eq(schema.businesses.ownerId, user.id) });
    if (!business) return NextResponse.json({ error: "No business profile found" }, { status: 400 });
    const result = await runGrowthAnalysis(business.id, parsed.data.message, user.id);
    assistantContent = result.text;
    responseData = {
      opportunities: result.opportunities,
      kpis: result.kpis,
    };
  }

  await db.insert(schema.aiMessages).values({
    conversationId,
    role: "assistant",
    content: assistantContent,
    metadata: responseData,
  });

  return NextResponse.json({
    conversationId,
    content: assistantContent,
    ...responseData,
  });
}
