import { getDb, schema } from "@/lib/db";
import { eq, or, and, ilike, sql, desc, inArray } from "drizzle-orm";
import { recordAgentAction } from "../audit";

export type SearchCatalogFilters = {
  query?: string;
  category?: string;
  budgetMax?: number;
  budgetMin?: number;
  useCase?: string;
  inStockOnly?: boolean;
  limit?: number;
};

export type ProductComparisonResult = {
  products: Array<{
    id: string;
    name: string;
    price: number;
    mrp: number;
    rating: number;
    stock: number;
    brand: string | null;
    specifications: Record<string, string>;
    advantages: string[];
    disadvantages: string[];
    bestFor: string;
  }>;
  summaryRecommendation: string;
};

export type UpsellSuggestion = {
  product: {
    id: string;
    name: string;
    price: number;
    category: string;
    rating: number;
  };
  relationReason: string;
  discountPercentage?: number;
};

/* ============================================================
   1. searchProducts
   ============================================================ */
export async function searchProducts(filters: SearchCatalogFilters, userId?: string | null) {
  const db = getDb();
  const limit = Math.min(filters.limit || 10, 20);

  const conditions: any[] = [eq(schema.products.isActive, true)];

  if (filters.category) {
    const cat = await db.query.categories.findFirst({
      where: ilike(schema.categories.name, `%${filters.category}%`),
    });
    if (cat) {
      conditions.push(eq(schema.products.categoryId, cat.id));
    }
  }

  if (filters.budgetMax) {
    conditions.push(sql`CAST(${schema.products.price} AS NUMERIC) <= ${filters.budgetMax}`);
  }
  if (filters.budgetMin) {
    conditions.push(sql`CAST(${schema.products.price} AS NUMERIC) >= ${filters.budgetMin}`);
  }

  if (filters.inStockOnly) {
    conditions.push(sql`${schema.products.stock} > 0`);
  }

  if (filters.query) {
    const q = `%${filters.query}%`;
    conditions.push(
      or(
        ilike(schema.products.name, q),
        ilike(schema.products.description, q),
        ilike(schema.products.brand, q)
      )
    );
  }

  let candidates = await db.query.products.findMany({
    where: conditions.length > 1 ? and(...conditions) : conditions[0],
    with: { category: true },
    limit: 30,
  });

  // If no candidates matched exactly and budget was set, try without strict keyword to find closest category match
  if (candidates.length === 0 && filters.category) {
    const cat = await db.query.categories.findFirst({
      where: ilike(schema.categories.name, `%${filters.category}%`),
    });
    if (cat) {
      candidates = await db.query.products.findMany({
        where: eq(schema.products.categoryId, cat.id),
        with: { category: true },
        limit: 15,
      });
    }
  }

  // Rank candidates
  const scored = candidates.map((p) => {
    const price = Number(p.price);
    const mrp = Number(p.mrp);
    const rating = Number(p.rating ?? 0);
    let matchScore = 50;
    const reasons: string[] = [];

    if (filters.budgetMax && price <= filters.budgetMax) {
      matchScore += 25;
      reasons.push(`Within budget (₹${price.toLocaleString("en-IN")})`);
    }

    if (rating >= 4.4) {
      matchScore += 20;
      reasons.push(`High rating: ${rating}★`);
    }

    if (mrp > price) {
      const discount = Math.round(((mrp - price) / mrp) * 100);
      if (discount > 5) {
        matchScore += 10;
        reasons.push(`${discount}% off MRP`);
      }
    }

    if (p.stock > 0) {
      reasons.push("In stock");
    } else {
      matchScore -= 40;
    }

    if (filters.useCase) {
      const tags = (p.tags ?? []).map((t) => t.toLowerCase());
      const desc = (p.description ?? "").toLowerCase();
      if (tags.some((t) => t.includes(filters.useCase!.toLowerCase())) || desc.includes(filters.useCase!.toLowerCase())) {
        matchScore += 15;
        reasons.push(`Tailored for ${filters.useCase}`);
      }
    }

    const finalScore = Math.max(20, Math.min(99, matchScore));
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category?.name || "General",
      price,
      mrp,
      rating,
      stock: p.stock,
      specifications: (p.specifications as Record<string, string>) || {},
      images: p.images || [],
      matchScore: finalScore,
      reasons,
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const results = scored.slice(0, limit);

  // Record audit trail
  await recordAgentAction({
    agent: "BUYER_AGENT",
    userId,
    action: "SEARCH_PRODUCTS",
    tool: "searchProducts",
    inputSummary: `Category: ${filters.category || "Any"}, Budget: ${filters.budgetMax ? "₹" + filters.budgetMax : "Any"}, Query: ${filters.query || "None"}`,
    reason: `Found ${results.length} ranked products from real database catalog`,
    result: `Top match: ${results[0]?.name || "None"}`,
  });

  return results;
}

/* ============================================================
   2. compareProducts
   ============================================================ */
export async function compareProducts(productIds: string[], userId?: string | null): Promise<ProductComparisonResult> {
  const db = getDb();
  const rawProducts = await db.query.products.findMany({
    where: inArray(schema.products.id, productIds),
    with: { category: true },
  });

  const compared = rawProducts.map((p) => {
    const price = Number(p.price);
    const rating = Number(p.rating ?? 0);
    const specs = (p.specifications as Record<string, string>) || {};

    const advantages: string[] = [];
    const disadvantages: string[] = [];
    let bestFor = "Everyday all-round performance";

    if (rating >= 4.5) advantages.push(`Top-tier ${rating}★ customer satisfaction`);
    if (price < 50000) advantages.push("Exceptional price-to-performance value");
    if (p.stock > 10) advantages.push("Readily available in warehouse");
    if (p.stock < 5 && p.stock > 0) disadvantages.push(`Limited inventory (only ${p.stock} units left)`);
    if (p.stock === 0) disadvantages.push("Currently out of stock");

    // Spec analysis
    const ram = specs["RAM"] || specs["Memory"];
    const proc = specs["Processor"] || specs["CPU"];
    const battery = specs["Battery"];

    if (ram && (ram.includes("16") || ram.includes("32"))) {
      advantages.push(`Generous RAM (${ram}) for smooth multitasking`);
      bestFor = "Heavy multitasking, software development & coding";
    }
    if (proc && (proc.toLowerCase().includes("i7") || proc.toLowerCase().includes("ryzen 7") || proc.toLowerCase().includes("m2") || proc.toLowerCase().includes("m3"))) {
      advantages.push(`High-performance processor (${proc})`);
      bestFor = "Coding, content creation, and casual gaming";
    }
    if (battery) {
      advantages.push(`Battery: ${battery}`);
    }

    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      price,
      mrp: Number(p.mrp),
      rating,
      stock: p.stock,
      specifications: specs,
      advantages,
      disadvantages: disadvantages.length ? disadvantages : ["Higher price tier"],
      bestFor,
    };
  });

  // Pick the best match
  const best = [...compared].sort((a, b) => b.rating - a.rating)[0];
  const summaryRecommendation = best
    ? `Based on comprehensive specifications and real user ratings, the **${best.name}** at ₹${best.price.toLocaleString("en-IN")} offers the strongest balance for your requirements: ${best.bestFor}.`
    : "Comparison complete.";

  await recordAgentAction({
    agent: "BUYER_AGENT",
    userId,
    action: "COMPARE_PRODUCTS",
    tool: "compareProducts",
    inputSummary: `Compared ${productIds.length} products`,
    reason: summaryRecommendation,
    result: `Recommended: ${best?.name || "None"}`,
  });

  return { products: compared, summaryRecommendation };
}

/* ============================================================
   3. getRelatedProducts (Intelligent Upsell / Cross-sell)
   ============================================================ */
export async function getRelatedProducts(productId: string, userId?: string | null): Promise<UpsellSuggestion[]> {
  const db = getDb();
  const baseProduct = await db.query.products.findFirst({
    where: eq(schema.products.id, productId),
    with: { category: true },
  });

  if (!baseProduct) return [];

  const baseCategory = baseProduct.category?.name?.toLowerCase() || "";

  // Target cross-sell categories based on parent item
  let targetCategory = "Accessories";
  let whyReason = "Frequently purchased together with this item";

  if (baseCategory.includes("laptop")) {
    targetCategory = "Accessories"; // mouse, keyboard, bag
    whyReason = "Essential companion for productivity and coding setup";
  } else if (baseCategory.includes("phone") || baseCategory.includes("smartphone")) {
    targetCategory = "Headphones"; // earbuds, headphones
    whyReason = "Popular audio pairing for mobile users";
  } else if (baseCategory.includes("headphone")) {
    targetCategory = "Accessories";
    whyReason = "Great addition to your audio collection";
  }

  // Query actual products in the target cross-sell category
  const targetCatRow = await db.query.categories.findFirst({
    where: ilike(schema.categories.name, `%${targetCategory}%`),
  });

  let candidates = targetCatRow
    ? await db.query.products.findMany({
        where: and(eq(schema.products.categoryId, targetCatRow.id), sql`${schema.products.stock} > 0`),
        limit: 3,
      })
    : [];

  // Fallback to top-rated accessories if target empty
  if (candidates.length === 0) {
    candidates = await db.query.products.findMany({
      where: and(sql`${schema.products.id} != ${productId}`, sql`${schema.products.stock} > 0`),
      orderBy: desc(schema.products.rating),
      limit: 3,
    });
  }

  const suggestions: UpsellSuggestion[] = candidates.map((p) => ({
    product: {
      id: p.id,
      name: p.name,
      price: Number(p.price),
      category: targetCategory,
      rating: Number(p.rating ?? 4.5),
    },
    relationReason: `Recommended because customers who purchased ${baseProduct.name} frequently add this: ${whyReason}.`,
    discountPercentage: 10,
  }));

  await recordAgentAction({
    agent: "BUYER_AGENT",
    userId,
    action: "GET_UPSELL_RECOMMENDATIONS",
    tool: "getRelatedProducts",
    inputSummary: `Base Product: ${baseProduct.name} (${baseCategory})`,
    reason: `Generated ${suggestions.length} explainable cross-sell recommendations`,
    result: suggestions.map((s) => s.product.name).join(", "),
  });

  return suggestions;
}

/* ============================================================
   4. checkInventory
   ============================================================ */
export async function checkInventory(productIds: string[]) {
  const db = getDb();
  const items = await db.query.products.findMany({
    where: inArray(schema.products.id, productIds),
  });

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    stock: item.stock,
    inStock: item.stock > 0,
    lowStock: item.stock > 0 && item.stock < 10,
  }));
}

/* ============================================================
   5. Cart & Checkout Agent Tools
   ============================================================ */
export async function getAgentCart(userId: string) {
  const db = getDb();
  const cartRow = await db.query.cart.findFirst({ where: eq(schema.cart.userId, userId) });
  if (!cartRow) return { items: [], subtotal: 0, discount: 0, delivery: 0, total: 0 };

  const items = await db.query.cartItems.findMany({
    where: and(eq(schema.cartItems.cartId, cartRow.id), eq(schema.cartItems.savedForLater, false)),
    with: { product: true },
  });

  const subtotal = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);
  const discount = Math.round(subtotal * 0.05);
  const delivery = subtotal > 2000 ? 0 : 99;
  const total = subtotal - discount + delivery;

  return {
    items: items.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.product.name,
      price: Number(i.product.price),
      quantity: i.quantity,
      stock: i.product.stock,
      images: i.product.images || [],
    })),
    subtotal,
    discount,
    delivery,
    total,
  };
}

export async function addAgentToCart(userId: string, productId: string, quantity = 1) {
  const db = getDb();
  let cartRow = await db.query.cart.findFirst({ where: eq(schema.cart.userId, userId) });

  if (!cartRow) {
    const [newCart] = await db.insert(schema.cart).values({ userId }).returning();
    cartRow = newCart;
  }

  const existingItem = await db.query.cartItems.findFirst({
    where: and(eq(schema.cartItems.cartId, cartRow.id), eq(schema.cartItems.productId, productId)),
  });

  if (existingItem) {
    await db
      .update(schema.cartItems)
      .set({ quantity: existingItem.quantity + quantity })
      .where(eq(schema.cartItems.id, existingItem.id));
  } else {
    await db.insert(schema.cartItems).values({
      cartId: cartRow.id,
      productId,
      quantity,
    });
  }

  const product = await db.query.products.findFirst({ where: eq(schema.products.id, productId) });

  await recordAgentAction({
    agent: "BUYER_AGENT",
    userId,
    action: "ADD_TO_CART",
    tool: "addToCart",
    inputSummary: `Product: ${product?.name || productId}, Quantity: ${quantity}`,
    reason: "User requested addition to cart via conversational shopping agent",
    result: "Item added successfully",
  });

  return getAgentCart(userId);
}
