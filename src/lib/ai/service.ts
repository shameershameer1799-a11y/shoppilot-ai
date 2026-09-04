import OpenAI from "openai";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  searchProducts,
  compareProducts as compareProductsTool,
  getRelatedProducts,
  getAgentCart,
  addAgentToCart,
  type ProductComparisonResult,
  type UpsellSuggestion,
} from "./agents/buyer-tools";
import {
  getSalesAnalytics,
  detectGrowthOpportunities,
  type GrowthOpportunity as RichGrowthOpportunity,
} from "./agents/merchant-tools";
import { recordAgentAction } from "./audit";

/* ============================================================
   Client Configuration
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
  stock: number;
  reasons: string[];
  images?: string[];
  specifications?: Record<string, string>;
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

export type CheckoutSummary = {
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  itemCount: number;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  requiresConfirmation: boolean;
};

export type ShoppingAgentResponse = {
  content: string;
  requirements?: ShoppingRequirements;
  matches?: ProductMatch[];
  comparison?: ProductComparisonResult;
  upsells?: UpsellSuggestion[];
  cart?: any;
  checkout?: CheckoutSummary;
  recoveryAlternative?: {
    originalUnavailable: string;
    reason: string;
    alternatives: ProductMatch[];
  };
};

export type GrowthAgentResponse = {
  text: string;
  opportunities: RichGrowthOpportunity[];
  kpis?: any;
};

/* ============================================================
   1. Extract Structured Intent (with LLM or Smart Fallback)
   ============================================================ */
export async function extractRequirements(message: string): Promise<ShoppingRequirements> {
  const client = getOpenAiClient();

  if (!client) {
    return mockExtractRequirements(message);
  }

  try {
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
                useCase: { type: "string", description: "Use case, e.g. gaming, coding, travel" },
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
  const budgetMatch = q.match(/(?:under|below|budget|within|around|₹|rs\.?)\s*(\d[\d,]*)/i) || q.match(/(\d[\d,]*)\s*(?:k|thousand)?/);

  let budgetMax: number | undefined;
  if (budgetMatch) {
    let raw = budgetMatch[1].replace(/,/g, "");
    let val = parseInt(raw, 10);
    if (q.includes(raw + "k")) val *= 1000;
    if (val > 100) budgetMax = val;
  }

  const catMap: Record<string, string> = {
    laptop: "Laptops",
    notebook: "Laptops",
    macbook: "Laptops",
    phone: "Smartphones",
    smartphone: "Smartphones",
    mobile: "Smartphones",
    headphone: "Headphones",
    earphone: "Headphones",
    earbud: "Headphones",
    watch: "Watches",
    smartwatch: "Watches",
    shoe: "Shoes",
    sneaker: "Shoes",
    camera: "Cameras",
    dslr: "Cameras",
    backpack: "Backpacks",
    bag: "Backpacks",
    mouse: "Accessories",
    keyboard: "Accessories",
    charger: "Accessories",
  };

  let category: string | undefined;
  for (const [key, val] of Object.entries(catMap)) {
    if (q.includes(key)) {
      category = val;
      break;
    }
  }

  const useCaseWords = [
    "coding",
    "programming",
    "gaming",
    "video editing",
    "travel",
    "student",
    "office",
    "fitness",
    "running",
    "music",
  ];
  const useCase = useCaseWords.find((w) => q.includes(w));

  const keywords = q
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !["under", "need", "want", "find", "best", "give", "show"].includes(w))
    .slice(0, 8);

  return { category, budgetMax, useCase, keywords };
}

/* ============================================================
   2. RUN SHOPPING CHAT (Buyer Agent Orchestrator)
   ============================================================ */
export async function runShoppingChat(message: string, userId?: string | null): Promise<ShoppingAgentResponse> {
  const q = message.toLowerCase().trim();

  // Intent 1: Out-of-Stock Failure & Intelligent Recovery Demo
  if (q.includes("out of stock") || q.includes("demo failure") || q.includes("simulate failure") || q.includes("unavailable")) {
    const db = getDb();
    // Find an item or use mock
    const alternatives = await searchProducts({ category: "Laptops", limit: 2, inStockOnly: true }, userId);

    await recordAgentAction({
      agent: "BUYER_AGENT",
      userId,
      action: "FAILURE_RECOVERY_DEMO",
      tool: "searchProducts",
      reason: "Requested item 'ProBook Ultra (Refurb)' is out of stock. Agent recovered by finding 2 in-stock alternatives.",
      result: "Presented 2 in-stock alternatives with matching specs.",
    });

    return {
      content:
        "⚠️ **Inventory Notice**: The product you requested is currently out of stock in our regional fulfillment warehouse.\n\n" +
        "Rather than canceling your intent, I analyzed our real catalog and found **2 immediate in-stock alternatives** with matching specifications and pricing:",
      recoveryAlternative: {
        originalUnavailable: "ProBook Ultra X1 (Out of Stock)",
        reason: "Zero units remaining in inventory. Restocking scheduled in 10 days.",
        alternatives: alternatives.map((a) => ({
          ...a,
          score: a.matchScore,
        })),
      },
      matches: alternatives.map((a) => ({ ...a, score: a.matchScore })),
    };
  }

  // Intent 2: Conversational Checkout & Bounded Payment Calculation
  if (
    q.includes("checkout") ||
    q.includes("proceed to pay") ||
    q.includes("buy now") ||
    q.includes("pay now") ||
    q.includes("place order")
  ) {
    if (!userId) {
      return {
        content: "Please sign in to proceed to checkout so I can prepare your order breakdown.",
      };
    }

    const cart = await getAgentCart(userId);
    if (!cart.items.length) {
      return {
        content: "Your cart is currently empty! Tell me what product you'd like to find, and I'll add it for you.",
      };
    }

    const checkoutSummary: CheckoutSummary = {
      subtotal: cart.subtotal,
      discount: cart.discount,
      delivery: cart.delivery,
      total: cart.total,
      itemCount: cart.items.length,
      items: cart.items.map((i) => ({ id: i.productId, name: i.name, price: i.price, quantity: i.quantity })),
      requiresConfirmation: true,
    };

    await recordAgentAction({
      agent: "BUYER_AGENT",
      userId,
      action: "PREPARE_CHECKOUT_SUMMARY",
      tool: "calculateCheckout",
      amount: cart.total,
      approvalStatus: "PENDING",
      inputSummary: `${cart.items.length} item(s) in cart. Total: ₹${cart.total.toLocaleString("en-IN")}`,
      reason: "Buyer Agent bounded money safety gate: explicit confirmation required before launching Razorpay.",
      result: "Checkout summary generated. Awaiting user confirmation.",
    });

    return {
      content:
        `I have prepared your order summary for **${cart.items.length} item(s)**.\n\n` +
        `• **Subtotal**: ₹${cart.subtotal.toLocaleString("en-IN")}\n` +
        `• **Agent Discount (5%)**: −₹${cart.discount.toLocaleString("en-IN")}\n` +
        `• **Delivery**: ${cart.delivery === 0 ? "FREE" : "₹" + cart.delivery}\n` +
        `• **Final Payable Amount**: **₹${cart.total.toLocaleString("en-IN")}**\n\n` +
        `⚠️ **Safety & Compliance**: ShopPilot AI will never silently charge your account. Please review the details below and click **Confirm & Pay with Razorpay** to proceed.`,
      checkout: checkoutSummary,
    };
  }

  // Intent 3: Conversational Add to Cart
  if (
    (q.includes("add") && (q.includes("cart") || q.includes("this") || q.includes("item") || q.includes("laptop") || q.includes("mouse") || q.includes("phone"))) ||
    q.startsWith("add ")
  ) {
    if (!userId) {
      return {
        content: "Please log in so I can manage your shopping cart securely.",
      };
    }

    // Try finding the referenced product in the database
    const req = await extractRequirements(message);
    const searchMatches = await searchProducts({
      category: req.category,
      budgetMax: req.budgetMax,
      query: req.keywords.join(" ") || undefined,
      limit: 1,
      inStockOnly: true,
    }, userId);

    const targetProduct = searchMatches[0];
    if (!targetProduct) {
      return {
        content: "I couldn't locate that specific item in stock. Would you like me to show you the best available options?",
      };
    }

    const updatedCart = await addAgentToCart(userId, targetProduct.id, 1);
    const upsells = await getRelatedProducts(targetProduct.id, userId);

    return {
      content:
        `✅ Added **${targetProduct.name}** (₹${targetProduct.price.toLocaleString("en-IN")}) to your cart!\n\n` +
        `Your cart now has **${updatedCart.items.length} item(s)** totaling **₹${updatedCart.total.toLocaleString("en-IN")}**.\n\n` +
        `💡 **Recommended Accessories**: Customers who purchase this item frequently bundle the following compatible accessories:`,
      cart: updatedCart,
      upsells,
    };
  }

  // Intent 4: Product Comparison Request
  if (q.includes("compare") || q.includes("difference between") || q.includes("vs")) {
    const req = await extractRequirements(message);
    const matches = await searchProducts({
      category: req.category,
      budgetMax: req.budgetMax,
      useCase: req.useCase,
      query: req.keywords.join(" "),
      limit: 3,
    }, userId);

    if (matches.length >= 2) {
      const comparison = await compareProductsTool(matches.map((m) => m.id), userId);
      return {
        content: `Here is a side-by-side technical comparison of the top ${matches.length} matching products based on specifications, value, and intended use cases:`,
        comparison,
        matches: matches.map((m) => ({ ...m, score: m.matchScore })),
      };
    }
  }

  // Intent 5: Standard Discovery & Recommendation (The Primary Path)
  const requirements = await extractRequirements(message);
  const candidates = await searchProducts({
    category: requirements.category,
    budgetMax: requirements.budgetMax,
    useCase: requirements.useCase,
    query: requirements.keywords.join(" "),
    limit: 3,
  }, userId);

  const matches: ProductMatch[] = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    price: c.price,
    mrp: c.mrp,
    rating: c.rating,
    score: c.matchScore,
    stock: c.stock,
    reasons: c.reasons,
    images: c.images,
    specifications: c.specifications,
  }));

  // Fetch accessories for the top candidate
  let upsells: UpsellSuggestion[] = [];
  if (matches.length > 0) {
    upsells = await getRelatedProducts(matches[0].id, userId);
  }

  let contentText = "";
  if (matches.length > 0) {
    const top = matches[0];
    const budgetMsg = requirements.budgetMax ? ` under ₹${requirements.budgetMax.toLocaleString("en-IN")}` : "";
    const useCaseMsg = requirements.useCase ? ` optimized for ${requirements.useCase}` : "";
    contentText =
      `I searched our verified catalog and found **${matches.length} strong matches**${budgetMsg}${useCaseMsg}.\n\n` +
      `**Top Recommendation**: **${top.name}** at ₹${top.price.toLocaleString("en-IN")} (${top.score}% match). ` +
      `It stands out for: ${top.reasons.slice(0, 2).join(", ")}.\n\n` +
      `You can compare specifications below, add any item directly to your cart, or ask me to bundle compatible accessories.`;
  } else {
    contentText =
      "I couldn't find an exact match for those specific filters in our catalog. " +
      "Try widening your budget range or specifying a broader category (e.g., Laptops, Smartphones, Headphones).";
  }

  // Record recommendations in DB for personalization
  if (matches.length && userId) {
    try {
      const db = getDb();
      await db.insert(schema.recommendations).values(
        matches.map((m) => ({
          userId,
          productId: m.id,
          matchScore: m.score,
          reasons: m.reasons,
          source: "ai_chat",
        }))
      );
    } catch {
      // Non-blocking
    }
  }

  return {
    content: contentText,
    requirements,
    matches,
    upsells: upsells.slice(0, 2),
  };
}

/* ============================================================
   3. RUN GROWTH ANALYSIS (Merchant Growth Agent)
   ============================================================ */
export async function runGrowthAnalysis(
  businessId: string,
  question: string,
  userId?: string | null
): Promise<GrowthAgentResponse> {
  const [analytics, opportunities] = await Promise.all([
    getSalesAnalytics(businessId),
    detectGrowthOpportunities(businessId),
  ]);

  const q = question.toLowerCase();
  let text = "";

  if (q.includes("abandon") || q.includes("cart")) {
    const opp = opportunities.find((o) => o.category === "Abandoned Cart") || opportunities[0];
    text =
      `📊 **Abandoned Cart Analysis**:\n\n` +
      `Our telemetry detected **${opp.estimatedTargetAudience} shoppers** who added items to their cart but abandoned before payment in the last 30 days.\n\n` +
      `• **Estimated Recoverable Revenue**: **${opp.potentialRevenue}**\n` +
      `• **AI Confidence**: ${opp.confidence}%\n` +
      `• **Recommended Action**: ${opp.recommendedAction}\n\n` +
      `You can review the generated draft campaign below and click **Approve** to execute it.`;
  } else if (q.includes("revenue") || q.includes("sales") || q.includes("grow") || q.includes("increase")) {
    text =
      `📈 **Revenue Growth Diagnosis**:\n\n` +
      `Current 30-day store performance shows **₹${analytics.kpis.revenue.toLocaleString("en-IN")}** across **${analytics.kpis.orders} orders** ` +
      `(Average Order Value: ₹${analytics.kpis.avgOrderValue.toLocaleString("en-IN")}, Conversion Rate: ${analytics.kpis.conversionRate}%).\n\n` +
      `I have identified **${opportunities.length} high-leverage growth opportunities** ranked by potential revenue impact. ` +
      `The fastest lever is **${opportunities[0].title}** with an estimated impact of **${opportunities[0].potentialRevenue}**.`;
  } else {
    text =
      `Based on real telemetry and customer purchase patterns for your store, here are your top **${opportunities.length} AI-detected growth opportunities**. ` +
      `Each opportunity includes quantified revenue potential, audience signals, and a draft campaign ready for your approval:`;
  }

  await recordAgentAction({
    agent: "MERCHANT_GROWTH_AGENT",
    userId,
    businessId,
    action: "RUN_GROWTH_ANALYSIS",
    tool: "detectGrowthOpportunities",
    inputSummary: `Merchant question: "${question}"`,
    reason: text.slice(0, 120),
    result: `Surfaced ${opportunities.length} opportunities`,
  });

  return {
    text,
    opportunities,
    kpis: analytics.kpis,
  };
}

/* ============================================================
   4. Legacy Helper Compatibility
   ============================================================ */
export async function compareProducts(productIds: string[]) {
  return compareProductsTool(productIds);
}

export async function searchAndRankProducts(requirements: ShoppingRequirements, limit = 3) {
  const list = await searchProducts({
    category: requirements.category,
    budgetMax: requirements.budgetMax,
    useCase: requirements.useCase,
    query: requirements.keywords.join(" "),
    limit,
  });
  return list.map((l) => ({
    id: l.id,
    name: l.name,
    price: l.price,
    mrp: l.mrp,
    rating: l.rating,
    score: l.matchScore,
    reasons: l.reasons,
  }));
}
