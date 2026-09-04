import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema, isDbConfigured } from "@/lib/db";
import { and, eq, gte, lte, ilike, desc, asc, sql } from "drizzle-orm";
import { requireBusinessUser } from "@/lib/auth/session";

const querySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minRating: z.coerce.number().optional(),
  sort: z.enum(["price-asc", "price-desc", "rating"]).optional(),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(200),
});

export async function GET(req: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured. Set DATABASE_URL." }, { status: 503 });
  }
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }
  const { search, category, minPrice, maxPrice, minRating, sort, page, pageSize } = parsed.data;

  const db = getDb();
  const conditions = [eq(schema.products.isActive, true)];
  if (search) conditions.push(ilike(schema.products.name, `%${search}%`));
  if (minPrice !== undefined) conditions.push(gte(schema.products.price, String(minPrice)));
  if (maxPrice !== undefined) conditions.push(lte(schema.products.price, String(maxPrice)));
  if (minRating !== undefined) conditions.push(gte(schema.products.rating, String(minRating)));

  let categoryId: string | undefined;
  if (category) {
    const cat = await db.query.categories.findFirst({ where: eq(schema.categories.name, category) });
    categoryId = cat?.id;
    if (categoryId) conditions.push(eq(schema.products.categoryId, categoryId));
  }

  const orderBy =
    sort === "price-asc" ? asc(schema.products.price) :
    sort === "price-desc" ? desc(schema.products.price) :
    sort === "rating" ? desc(schema.products.rating) :
    desc(schema.products.createdAt);

  const [items, [{ count }]] = await Promise.all([
    db.query.products.findMany({
      where: and(...conditions),
      orderBy,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.products).where(and(...conditions)),
  ]);

  return NextResponse.json({ items, total: count, page, pageSize });
}

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  brand: z.string().optional(),
  categoryName: z.string().min(1),
  price: z.number().positive(),
  mrp: z.number().positive(),
  stock: z.number().int().nonnegative(),
  images: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  specifications: z.record(z.string()).default({}),
});

export async function POST(req: Request) {
  const user = await requireBusinessUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured. Set DATABASE_URL." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const db = getDb();
  const business = await db.query.businesses.findFirst({ where: eq(schema.businesses.ownerId, user.id) });
  if (!business) return NextResponse.json({ error: "No business profile found" }, { status: 400 });

  let category = await db.query.categories.findFirst({ where: eq(schema.categories.name, parsed.data.categoryName) });
  if (!category) {
    const slug = parsed.data.categoryName.toLowerCase().replace(/\s+/g, "-");
    [category] = await db.insert(schema.categories).values({ name: parsed.data.categoryName, slug }).returning();
  }

  const [product] = await db.insert(schema.products).values({
    businessId: business.id,
    categoryId: category.id,
    name: parsed.data.name,
    description: parsed.data.description,
    brand: parsed.data.brand,
    price: String(parsed.data.price),
    mrp: String(parsed.data.mrp),
    stock: parsed.data.stock,
    images: parsed.data.images,
    tags: parsed.data.tags,
    specifications: parsed.data.specifications,
  }).returning();

  return NextResponse.json({ product }, { status: 201 });
}
