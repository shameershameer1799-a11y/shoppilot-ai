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
 * /business/ai-growth (business). `kind` picks the persona; the
 * conversation + message history are persisted either way.
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
      userId: user.id, kind: parsed.data.kind, title: parsed.data.message.slice(0, 60),
    }).returning();
    conversationId = conv.id;
  }

  await db.insert(schema.aiMessages).values({
    conversationId, role: "user", content: parsed.data.message,
  });

  let assistantContent: string;
  let metadata: Record<string, unknown> = {};

  if (parsed.data.kind === "shopping") {
    const { requirements, matches } = await runShoppingChat(parsed.data.message);
    assistantContent = matches.length
      ? `Found ${matches.length} strong match${matches.length !== 1 ? "es" : ""}.`
      : "I couldn't find a strong match — try a different category or a wider budget.";
    metadata = { requirements, matches };

    // Store as recommendations for the dashboard's "AI insight" surface
    if (matches.length) {
      await db.insert(schema.recommendations).values(
        matches.map((m) => ({
          userId: user.id, productId: m.id, matchScore: m.score, reasons: m.reasons, source: "ai_chat",
        }))
      );
    }
  } else {
    const business = await db.query.businesses.findFirst({ where: eq(schema.businesses.ownerId, user.id) });
    if (!business) return NextResponse.json({ error: "No business profile found" }, { status: 400 });
    const result = await runGrowthAnalysis(business.id, parsed.data.message);
    assistantContent = result.text;
    metadata = { opportunities: result.opportunities };
  }

  await db.insert(schema.aiMessages).values({
    conversationId, role: "assistant", content: assistantContent, metadata,
  });

  return NextResponse.json({ conversationId, content: assistantContent, ...metadata });
}
