import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";

/**
 * Seeds realistic demo data: categories, products, a demo business +
 * its customers/campaigns/insights. Run with `npm run db:seed` after
 * `npm run db:push`. Safe to re-run — categories/products are keyed
 * by unique name, so it won't duplicate on a second run.
 *
 * This script does NOT create Supabase Auth users (that requires the
 * Supabase Admin API, not just Postgres). Sign up through the app UI
 * first, then this script will attach a demo business/products to
 * whichever business-type account you created — see BUSINESS_OWNER_EMAIL below.
 */

const BUSINESS_OWNER_EMAIL = process.env.SEED_BUSINESS_EMAIL || "business@demo.com";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required to seed.");
  const sql = postgres(connectionString, { prepare: false });
  const db = drizzle(sql, { schema });

  console.log("Seeding categories...");
  const categoryDefs = [
    { name: "Laptops", icon: "💻" }, { name: "Smartphones", icon: "📱" },
    { name: "Headphones", icon: "🎧" }, { name: "Watches", icon: "⌚" },
    { name: "Shoes", icon: "👟" }, { name: "Cameras", icon: "📷" },
    { name: "Backpacks", icon: "🎒" }, { name: "Accessories", icon: "🔌" },
  ];
  const categoryIds: Record<string, string> = {};
  for (const c of categoryDefs) {
    const slug = c.name.toLowerCase();
    const [row] = await db.insert(schema.categories).values({ name: c.name, icon: c.icon, slug })
      .onConflictDoUpdate({ target: schema.categories.name, set: { icon: c.icon } })
      .returning();
    categoryIds[c.name] = row.id;
  }

  console.log("Looking up (or creating) the demo business...");
  const existingUser = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, BUSINESS_OWNER_EMAIL) });
  let businessId: string | undefined;
  if (existingUser) {
    const business = await db.query.businesses.findFirst({ where: (b, { eq }) => eq(b.ownerId, existingUser.id) });
    businessId = business?.id;
  }
  if (!businessId) {
    console.log(
      `No business found for ${BUSINESS_OWNER_EMAIL} yet. Products will be seeded without an owning business.\n` +
      `Sign up as a business account with that email first, then re-run this script to attach real ownership.`
    );
  }

  console.log("Seeding products...");
  const PRODUCTS = [
    { name: 'NovaBook Pro 14"', cat: "Laptops", brand: "Nova", price: 76999, mrp: 89999, rating: 4.7, reviewCount: 412, stock: 18, tags: ["video editing", "16GB RAM", "SSD"] },
    { name: 'AeroBook Air 13"', cat: "Laptops", brand: "Aero", price: 54999, mrp: 61999, rating: 4.4, reviewCount: 289, stock: 32, tags: ["lightweight", "student"] },
    { name: "TitanForce G15 Gaming", cat: "Laptops", brand: "Titan", price: 98999, mrp: 112999, rating: 4.6, reviewCount: 150, stock: 9, tags: ["gaming", "RTX"] },
    { name: "Pulse X12 Smartphone", cat: "Smartphones", brand: "Pulse", price: 32999, mrp: 37999, rating: 4.5, reviewCount: 980, stock: 60, tags: ["5G", "triple camera"] },
    { name: "Orion Edge Pro", cat: "Smartphones", brand: "Orion", price: 59999, mrp: 66999, rating: 4.6, reviewCount: 640, stock: 24, tags: ["flagship", "AMOLED"] },
    { name: "Vibe Lite 5G", cat: "Smartphones", brand: "Vibe", price: 15999, mrp: 18999, rating: 4.1, reviewCount: 1120, stock: 80, tags: ["budget", "5G"] },
    { name: "SonicWave Pro ANC", cat: "Headphones", brand: "SonicWave", price: 8999, mrp: 11999, rating: 4.6, reviewCount: 2100, stock: 120, tags: ["gaming", "noise cancelling"] },
    { name: "BassCore Studio", cat: "Headphones", brand: "BassCore", price: 4499, mrp: 5999, rating: 4.3, reviewCount: 860, stock: 200, tags: ["bass", "wired"] },
    { name: "AirBuds Mini", cat: "Headphones", brand: "AirBuds", price: 2999, mrp: 3999, rating: 4.2, reviewCount: 1500, stock: 300, tags: ["earbuds", "compact"] },
    { name: "ChronoFit GT", cat: "Watches", brand: "Chrono", price: 6499, mrp: 7999, rating: 4.4, reviewCount: 530, stock: 75, tags: ["fitness", "AMOLED"] },
    { name: "ClassicTime Steel", cat: "Watches", brand: "ClassicTime", price: 12999, mrp: 14999, rating: 4.5, reviewCount: 210, stock: 40, tags: ["analog", "formal"] },
    { name: "StrideMax Runner", cat: "Shoes", brand: "Stride", price: 3999, mrp: 4999, rating: 4.3, reviewCount: 690, stock: 150, tags: ["running", "lightweight"] },
    { name: "UrbanStep Casual", cat: "Shoes", brand: "Urban", price: 2499, mrp: 3299, rating: 4.1, reviewCount: 410, stock: 180, tags: ["casual", "daily"] },
    { name: "LensCraft Z6 Mirrorless", cat: "Cameras", brand: "LensCraft", price: 84999, mrp: 94999, rating: 4.7, reviewCount: 96, stock: 12, tags: ["mirrorless", "4K"] },
    { name: "SnapShot Compact", cat: "Cameras", brand: "SnapShot", price: 18999, mrp: 22999, rating: 4.2, reviewCount: 180, stock: 35, tags: ["compact", "travel"] },
    { name: "TrailPack 40L", cat: "Backpacks", brand: "Trail", price: 2999, mrp: 3799, rating: 4.5, reviewCount: 340, stock: 90, tags: ["travel", "durable"] },
    { name: "CityCarry Laptop Bag", cat: "Backpacks", brand: "CityCarry", price: 1799, mrp: 2299, rating: 4.3, reviewCount: 520, stock: 110, tags: ["laptop", "commute"] },
    { name: "ChargeHub 65W GaN", cat: "Accessories", brand: "ChargeHub", price: 1499, mrp: 1999, rating: 4.4, reviewCount: 900, stock: 250, tags: ["charger", "fast charging"] },
  ];

  const productIds: string[] = [];
  for (const p of PRODUCTS) {
    const existing = await db.query.products.findFirst({ where: (row, { eq }) => eq(row.name, p.name) });
    if (existing) { productIds.push(existing.id); continue; }
    const [row] = await db.insert(schema.products).values({
      businessId, categoryId: categoryIds[p.cat], name: p.name, brand: p.brand,
      description: `${p.name} — a ${p.cat.toLowerCase()} built for ${p.tags[0]}.`,
      price: String(p.price), mrp: String(p.mrp), rating: String(p.rating), reviewCount: p.reviewCount,
      stock: p.stock, tags: p.tags, images: [],
    }).returning();
    productIds.push(row.id);
  }

  if (businessId) {
    console.log("Seeding demo customers, segments, campaigns, and insights...");
    const customerDefs = [
      { name: "Meera Reddy", score: 88, seg: "vip" as const, spend: 48200 },
      { name: "Kabir Shah", score: 76, seg: "loyal" as const, spend: 29900 },
      { name: "Anaya Gupta", score: 63, seg: "high_intent" as const, spend: 8400 },
      { name: "Rohan Verma", score: 34, seg: "at_risk" as const, spend: 15600 },
      { name: "Priya Nair", score: 22, seg: "cart_abandoner" as const, spend: 0 },
      { name: "Devika Rao", score: 91, seg: "vip" as const, spend: 61200 },
    ];
    for (const c of customerDefs) {
      const existing = await db.query.customers.findFirst({
        where: (row, { and, eq }) => and(eq(row.businessId, businessId!), eq(row.displayName, c.name)),
      });
      if (existing) continue;
      const [customer] = await db.insert(schema.customers).values({
        businessId, displayName: c.name, aiScore: c.score, lifetimeSpend: String(c.spend),
      }).returning();
      await db.insert(schema.customerSegments).values({ customerId: customer.id, segment: c.seg });
    }

    const insightExists = await db.query.aiInsights.findFirst({ where: (row, { eq }) => eq(row.businessId, businessId!) });
    if (!insightExists) {
      await db.insert(schema.aiInsights).values([
        { businessId, title: "Recover Abandoned Carts", description: "342 carts abandoned in the last 30 days, avg value ₹3,400.", impact: "high", effort: "low", potentialRevenue: "180000" },
        { businessId, title: "Bundle Headphones with Phones", description: "Cross-sell opportunity based on co-purchase patterns.", impact: "medium", effort: "medium", potentialRevenue: "64000" },
        { businessId, title: "Re-engage VIP segment", description: "6 VIP customers haven't purchased in 30+ days.", impact: "medium", effort: "low", potentialRevenue: "92000" },
      ]);
    }

    const campaignExists = await db.query.campaigns.findFirst({ where: (row, { eq }) => eq(row.businessId, businessId!) });
    if (!campaignExists) {
      await db.insert(schema.campaigns).values([
        { businessId, name: "Abandoned Cart Recovery", status: "active", targetSegment: "cart_abandoner", offer: "10% off", sentCount: 342, recoveredRevenue: "120000", conversionRate: "14.2" },
        { businessId, name: "VIP Early Access — New Laptops", status: "scheduled", targetSegment: "vip", offer: "Early access" },
      ]);
    }
  }

  console.log(`Done. Seeded ${categoryDefs.length} categories and ${productIds.length} products.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
