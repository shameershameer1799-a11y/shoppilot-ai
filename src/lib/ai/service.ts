import OpenAI from "openai";
import { getDb, schema } from "@/lib/db";
import { ilike, or, sql, eq } from "drizzle-orm";

/* ============================================================
   Client + demo-mode detection
   ============================================================ */
let _client: OpenAI | null | undefined;

function getOpenAiClient(): OpenAI | null {
  if (_client !== undefined) return _client;
  const key = process.env.OPENAI_API_KEY;
  _client = key ? new OpenAI({ apiKey: key }) : null;
  return _client;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/* ============================================================
   Types
   ============================================================ */
export type ProductMatch = {
  id: string;
  name: string;
  price: number;
  mrp: number;
  rating: number;
  score: number;
  reasons: string[];
};

export type ShoppingRequirements = {
  category?: string;
  budgetMax?: number;
  useCase?: string;
  keywords: string[];
};

export type GrowthOpportunity = {
  title: string;
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  potentialRevenue: string;
  action: string;
};

/* ============================================================
   1. EXTRACT SHOPPING REQUIREMENTS (function-calling when live,
      regex-based parsing when in demo mode — same output shape
      either way, so callers never need to branch on mode).
   ============================================================ */
export async function extractRequirements(message: string): Promise<ShoppingRequirements> {
  const client = getOpenAiClient();

  if (!client) {
    return mockExtractRequirements(message);
  }

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Extract shopping requirements from the user's message. Categories are one of: " +
          "Laptops, Smartphones, Headphones, Watches, Shoes, Cameras, Backpacks, Accessories.",
      },
      { role: "user", content: message },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "extract_requirements",
          description: "Extract structured shopping requirements from a user message",
          parameters: {
            type: "object",
            properties: {
              category: { type: "string", description: "Product category, if mentioned" },
              budgetMax: { type: "number", description: "Maximum budget in rupees, if mentioned" },
              useCase: { type: "string", description: "Use case, e.g. gaming, video editing, travel" },
              keywords: { type: "array", items: { type: "string" }, description: "Other relevant keywords" },
            },
            required: ["keywords"],
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "extract_requirements" } },
  });

  const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall) return mockExtractRequirements(message);

  try {
    const parsed = JSON.parse(toolCall.function.arguments);
    return {
      category: parsed.category,
      budgetMax: parsed.budgetMax,
      useCase: parsed.useCase,
      keywords: parsed.keywords ?? [],
    };
  } catch {
    return mockExtractRequirements(message);
  }
}

function mockExtractRequirements(message: string): ShoppingRequirements {
  const q = message.toLowerCase();
  const budgetMatch = q.match(/(\d[\d,]*)/);
  const budgetMax = budgetMatch ? parseInt(budgetMatch[1].replace(/,/g, ""), 10) : undefined;

  const catMap: Record<string, string> = {
    laptop: "Laptops", phone: "Smartphones", smartphone: "Smartphones",
    headphone: "Headphones", earbud: "Headphones", watch: "Watches",
    shoe: "Shoes", camera: "Cameras", backpack: "Backpacks", bag: "Backpacks",
    charger: "Accessories",
  };
  let category: string | undefined;
  for (const key of Object.keys(catMap)) {
    if (q.includes(key)) { category = catMap[key]; break; }
  }

  const useCaseWords = ["gaming", "video editing", "travel", "student", "professional", "fitness"];
  const useCase = useCaseWords.find((w) => q.includes(w));

  const keywords = q
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 8);

  return { category, budgetMax, useCase, keywords };
}

/* ============================================================
   2. SEARCH + RANK PRODUCTS against real DB data
   ============================================================ */
export async function searchAndRankProducts(
  requirements: ShoppingRequirements,
  limit = 3
): Promise<ProductMatch[]> {
  const db = getDb();

  const conditions = [];
  if (requirements.category) {
    const category = await db.query.categories.findFirst({
      where: eq(schema.categories.name, requirements.category),
    });
    if (category) conditions.push(eq(schema.products.categoryId, category.id));
  }
  if (requirements.keywords.length) {
    conditions.push(
      or(...requirements.keywords.map((k) => ilike(schema.products.name, `%${k}%`)))
    );
  }

  const candidates = await db.query.products.findMany({
    where: conditions.length ? sql`${sql.join(conditions, sql` AND `)}` : undefined,
    limit: 40,
  });

  const pool = candidates.length ? candidates : await db.query.products.findMany({ limit: 40 });

  const scored = pool.map((p) => {
    const price = Number(p.price);
    const mrp = Number(p.mrp);
    const rating = Number(p.rating ?? 0);
    let score = 50;
    const reasons: string[] = [];

    if (requirements.budgetMax) {
      if (price <= requirements.budgetMax) { score += 25; reasons.push("Within budget"); }
      else score -= 20;
    }
    if (rating >= 4.4) { score += (rating - 4) * 20; reasons.push("Highly rated"); }
    score += Math.min((p.reviewCount ?? 0) / 100, 10);
    if (mrp > price) {
      const off = Math.round(((mrp - price) / mrp) * 100);
      score += off / 5;
      reasons.push(`Good value (${off}% off)`);
    }
    if (requirements.useCase && (p.tags ?? []).some((t) => t.toLowerCase().includes(requirements.useCase!))) {
      score += 10;
      reasons.push(`Matches: ${requirements.useCase}`);
    }

    score = Math.max(40, Math.min(99, Math.round(score)));
    return { id: p.id, name: p.name, price, mrp, rating, score, reasons };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/* ============================================================
   3. CHAT — orchestrates extract -> search -> respond.
      Used by POST /api/ai/chat
   ============================================================ */
export async function runShoppingChat(message: string) {
  const requirements = await extractRequirements(message);
  const matches = await searchAndRankProducts(requirements);
  return { requirements, matches };
}

/* ============================================================
   4. COMPARE two or more products
   ============================================================ */
export async function compareProducts(productIds: string[]) {
  const db = getDb();
  const products = await db.query.products.findMany({
    where: or(...productIds.map((id) => eq(schema.products.id, id))),
  });

  const client = getOpenAiClient();
  if (!client) {
    return mockCompare(products);
  }

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Compare these products for a shopper in 2-3 concise sentences per product, focused on who each is best for. Be factual and neutral.",
      },
      { role: "user", content: JSON.stringify(products.map((p) => ({ name: p.name, price: p.price, rating: p.rating, specs: p.specifications }))) },
    ],
  });

  return { summary: completion.choices[0]?.message?.content ?? "", products };
}

function mockCompare(products: Array<typeof schema.products.$inferSelect>) {
  const cheapest = [...products].sort((a, b) => Number(a.price) - Number(b.price))[0];
  const highestRated = [...products].sort((a, b) => Number(b.rating) - Number(a.rating))[0];
  const summary = products
    .map((p) => {
      const bits = [];
      if (p.id === cheapest?.id) bits.push("best value");
      if (p.id === highestRated?.id) bits.push("highest rated");
      return `${p.name}: ${bits.length ? bits.join(", ") : "solid all-round option"} at ₹${Number(p.price).toLocaleString("en-IN")}.`;
    })
    .join(" ");
  return { summary, products };
}

/* ============================================================
   5. BUSINESS GROWTH ANALYST — reads real analytics/campaign
      data and returns ranked opportunities. Used by
      POST /api/ai/chat when called from /business/ai-growth.
   ============================================================ */
export async function runGrowthAnalysis(businessId: string, question: string) {
  const db = getDb();

  const [insights, atRiskCustomers, recentCampaigns] = await Promise.all([
    db.query.aiInsights.findMany({ where: eq(schema.aiInsights.businessId, businessId), limit: 5 }),
    db.query.customers.findMany({ where: eq(schema.customers.businessId, businessId), limit: 10 }),
    db.query.campaigns.findMany({ where: eq(schema.campaigns.businessId, businessId), limit: 5 }),
  ]);

  const client = getOpenAiClient();
  const context = { insights, atRiskCustomers, recentCampaigns, question };

  if (!client) {
    return mockGrowthAnswer(question, insights);
  }

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a commerce growth analyst. Answer the business owner's question using only the " +
          "provided data. Be concise and actionable. If you recommend an opportunity, name a clear next step.",
      },
      { role: "user", content: JSON.stringify(context) },
    ],
  });

  return {
    text: completion.choices[0]?.message?.content ?? "",
    opportunities: insights.map(toOpportunity),
  };
}

function toOpportunity(i: typeof schema.aiInsights.$inferSelect): GrowthOpportunity {
  return {
    title: i.title,
    impact: (i.impact as GrowthOpportunity["impact"]) ?? "medium",
    effort: (i.effort as GrowthOpportunity["effort"]) ?? "medium",
    potentialRevenue: i.potentialRevenue ? `₹${Number(i.potentialRevenue).toLocaleString("en-IN")}` : "—",
    action: "Generate Campaign",
  };
}

function mockGrowthAnswer(question: string, insights: Array<typeof schema.aiInsights.$inferSelect>) {
  const q = question.toLowerCase();
  if (q.includes("abandon")) {
    return {
      text: "Cart abandonment is your biggest lever this week based on stored analytics events.",
      opportunities: [{
        title: "Recover Abandoned Carts", impact: "high" as const, effort: "low" as const,
        potentialRevenue: "₹1.8L", action: "Generate Campaign",
      }],
    };
  }
  return {
    text: insights.length
      ? "Here are your current open opportunities, ranked by impact:"
      : "No stored insights yet — once analytics events accumulate, I'll surface ranked opportunities here.",
    opportunities: insights.map(toOpportunity),
  };
}
