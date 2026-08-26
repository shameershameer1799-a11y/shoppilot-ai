import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema, isDbConfigured } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";

async function getOrCreateCart(userId: string) {
  const db = getDb();
  let cartRow = await db.query.cart.findFirst({ where: eq(schema.cart.userId, userId) });
  if (!cartRow) {
    [cartRow] = await db.insert(schema.cart).values({ userId }).returning();
  }
  return cartRow;
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const db = getDb();
  const cartRow = await getOrCreateCart(user.id);
  const items = await db.query.cartItems.findMany({
    where: and(eq(schema.cartItems.cartId, cartRow.id), eq(schema.cartItems.savedForLater, false)),
    with: { product: true },
  });

  const subtotal = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
  const discount = Math.round(subtotal * 0.05);
  const delivery = subtotal > 0 ? (subtotal > 2000 ? 0 : 99) : 0;

  return NextResponse.json({ items, subtotal, discount, delivery, total: subtotal - discount + delivery });
}

const addSchema = z.object({ productId: z.string().uuid(), quantity: z.number().int().positive().default(1) });

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const db = getDb();
  const cartRow = await getOrCreateCart(user.id);

  const existing = await db.query.cartItems.findFirst({
    where: and(eq(schema.cartItems.cartId, cartRow.id), eq(schema.cartItems.productId, parsed.data.productId)),
  });

  if (existing) {
    const [updated] = await db.update(schema.cartItems)
      .set({ quantity: existing.quantity + parsed.data.quantity })
      .where(eq(schema.cartItems.id, existing.id))
      .returning();
    return NextResponse.json({ item: updated });
  }

  const [created] = await db.insert(schema.cartItems).values({
    cartId: cartRow.id,
    productId: parsed.data.productId,
    quantity: parsed.data.quantity,
  }).returning();

  // fire-and-forget analytics event
  await db.insert(schema.analyticsEvents).values({
    userId: user.id, eventType: "add_to_cart", productId: parsed.data.productId,
  });

  return NextResponse.json({ item: created }, { status: 201 });
}
