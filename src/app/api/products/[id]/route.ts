import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema, isDbConfigured } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireBusinessUser } from "@/lib/auth/session";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured. Set DATABASE_URL." }, { status: 503 });
  }
  const db = getDb();
  const product = await db.query.products.findFirst({
    where: eq(schema.products.id, params.id),
    with: { reviews: { limit: 10 } },
  });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ product });
}

const updateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  mrp: z.number().positive().optional(),
  stock: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await requireBusinessUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const db = getDb();
  const values: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (values.price !== undefined) values.price = String(values.price);
  if (values.mrp !== undefined) values.mrp = String(values.mrp);

  const [updated] = await db.update(schema.products).set(values).where(eq(schema.products.id, params.id)).returning();
  if (!updated) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ product: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireBusinessUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await db.update(schema.products).set({ isActive: false }).where(eq(schema.products.id, params.id));
  return NextResponse.json({ success: true });
}
