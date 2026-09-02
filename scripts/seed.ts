import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";

/**
 * Seeds realistic demo data: categories, products, a demo business +
 * its customers/campaigns/insights. Run with `npm run db:seed` after
 * `npm run db:push`. Safe to re-run — categories/products are keyed
 * by unique name, and existing products are updated with images without losing data.
 */

const BUSINESS_OWNER_EMAIL = process.env.SEED_BUSINESS_EMAIL || "business@demo.com";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required to seed.");
  const sql = postgres(connectionString, { prepare: false });
  const db = drizzle(sql, { schema });

  console.log("Seeding categories...");
  const categoryDefs = [
    { name: "Laptops", icon: "💻" },
    { name: "Smartphones", icon: "📱" },
    { name: "Headphones", icon: "🎧" },
    { name: "Watches", icon: "⌚" },
    { name: "Shoes", icon: "👟" },
    { name: "Cameras", icon: "📷" },
    { name: "Backpacks", icon: "🎒" },
    { name: "Accessories", icon: "🔌" },
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

  console.log("Seeding / updating products...");
  const PRODUCTS = [
    {
      name: 'NovaBook Pro 14"',
      cat: "Laptops",
      brand: "Nova",
      price: 76999,
      mrp: 89999,
      rating: 4.7,
      reviewCount: 412,
      stock: 18,
      tags: ["video editing", "16GB RAM", "SSD"],
      images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: 'AeroBook Air 13"',
      cat: "Laptops",
      brand: "Aero",
      price: 54999,
      mrp: 61999,
      rating: 4.4,
      reviewCount: 289,
      stock: 32,
      tags: ["lightweight", "student"],
      images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: "TitanForce G15 Gaming",
      cat: "Laptops",
      brand: "Titan",
      price: 98999,
      mrp: 112999,
      rating: 4.6,
      reviewCount: 150,
      stock: 9,
      tags: ["gaming", "RTX"],
      images: ["https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: "Pulse X12 Smartphone",
      cat: "Smartphones",
      brand: "Pulse",
      price: 32999,
      mrp: 37999,
      rating: 4.5,
      reviewCount: 980,
      stock: 60,
      tags: ["5G", "triple camera"],
      images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: "Orion Edge Pro",
      cat: "Smartphones",
      brand: "Orion",
      price: 59999,
      mrp: 66999,
      rating: 4.6,
      reviewCount: 640,
      stock: 24,
      tags: ["flagship", "AMOLED"],
      images: ["https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: "Vibe Lite 5G",
      cat: "Smartphones",
      brand: "Vibe",
      price: 15999,
      mrp: 18999,
      rating: 4.1,
      reviewCount: 1120,
      stock: 80,
      tags: ["budget", "5G"],
      images: ["https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: "SonicWave Pro ANC",
      cat: "Headphones",
      brand: "SonicWave",
      price: 8999,
      mrp: 11999,
      rating: 4.6,
      reviewCount: 2100,
      stock: 120,
      tags: ["gaming", "noise cancelling"],
      images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: "BassCore Studio",
      cat: "Headphones",
      brand: "BassCore",
      price: 4499,
      mrp: 5999,
      rating: 4.3,
      reviewCount: 860,
      stock: 200,
      tags: ["bass", "wired"],
      images: ["https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: "AirBuds Mini",
      cat: "Headphones",
      brand: "AirBuds",
      price: 2999,
      mrp: 3999,
      rating: 4.2,
      reviewCount: 1500,
      stock: 300,
      tags: ["earbuds", "compact"],
      images: ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: "ChronoFit GT",
      cat: "Watches",
      brand: "Chrono",
      price: 6499,
      mrp: 7999,
      rating: 4.4,
      reviewCount: 530,
      stock: 75,
      tags: ["fitness", "AMOLED"],
      images: ["https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: "ClassicTime Steel",
      cat: "Watches",
      brand: "ClassicTime",
      price: 12999,
      mrp: 14999,
      rating: 4.5,
      reviewCount: 210,
      stock: 40,
      tags: ["analog", "formal"],
      images: ["https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: "StrideMax Runner",
      cat: "Shoes",
      brand: "Stride",
      price: 3999,
      mrp: 4999,
      rating: 4.3,
      reviewCount: 690,
      stock: 150,
      tags: ["running", "lightweight"],
      images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: "UrbanStep Casual",
      cat: "Shoes",
      brand: "Urban",
      price: 2499,
      mrp: 3299,
      rating: 4.1,
      reviewCount: 410,
      stock: 180,
      tags: ["casual", "daily"],
      images: ["https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: "LensCraft Z6 Mirrorless",
      cat: "Cameras",
      brand: "LensCraft",
      price: 84999,
      mrp: 94999,
      rating: 4.7,
      reviewCount: 96,
      stock: 12,
      tags: ["mirrorless", "4K"],
      images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: "SnapShot Compact",
      cat: "Cameras",
      brand: "SnapShot",
      price: 18999,
      mrp: 22999,
      rating: 4.2,
      reviewCount: 180,
      stock: 35,
      tags: ["compact", "travel"],
      images: ["https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: "TrailPack 40L",
      cat: "Backpacks",
      brand: "Trail",
      price: 2999,
      mrp: 3799,
      rating: 4.5,
      reviewCount: 340,
      stock: 90,
      tags: ["travel", "durable"],
      images: ["https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: "CityCarry Laptop Bag",
      cat: "Backpacks",
      brand: "CityCarry",
      price: 1799,
      mrp: 2299,
      rating: 4.3,
      reviewCount: 520,
      stock: 110,
      tags: ["laptop", "commute"],
      images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80"],
    },
    {
      name: "ChargeHub 65W GaN",
      cat: "Accessories",
      brand: "ChargeHub",
      price: 1499,
      mrp: 1999,
      rating: 4.4,
      reviewCount: 900,
      stock: 250,
      tags: ["charger", "fast charging"],
      images: ["https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80"],
    },
  ];

  const productIds: string[] = [];
  let updatedCount = 0;
  let insertedCount = 0;

  for (const p of PRODUCTS) {
    const existing = await db.query.products.findFirst({ where: (row, { eq }) => eq(row.name, p.name) });
    if (existing) {
      // Update existing product with new images without overwriting prices, stock, ratings, reviews, etc.
      await db.update(schema.products)
        .set({
          images: p.images,
          updatedAt: new Date(),
        })
        .where(eq(schema.products.id, existing.id));
      productIds.push(existing.id);
      updatedCount++;
      continue;
    }

    const [row] = await db.insert(schema.products).values({
      businessId,
      categoryId: categoryIds[p.cat],
      name: p.name,
      brand: p.brand,
      description: `${p.name} — a ${p.cat.toLowerCase()} built for ${p.tags[0]}.`,
      price: String(p.price),
      mrp: String(p.mrp),
      rating: String(p.rating),
      reviewCount: p.reviewCount,
      stock: p.stock,
      tags: p.tags,
      images: p.images,
    }).returning();
    productIds.push(row.id);
    insertedCount++;
  }
  console.log(`Products: ${updatedCount} updated with images, ${insertedCount} newly inserted.`);

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
        { businessId, title: "Recover Abandoned Carts", description: "342 carts abandoned in the last 30 days, avg value ₹13,400.", impact: "high", effort: "low", potentialRevenue: "180000" },
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
