import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const items = await db.query.wishlist.findMany({
    where: eq(schema.wishlist.userId, user.id),
    with: { product: { with: { category: true } } },
  });
  return NextResponse.json({ items });
}

const bodySchema = z.object({ productId: z.string().uuid() });

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const db = getDb();
  const existing = await db.query.wishlist.findFirst({
    where: and(eq(schema.wishlist.userId, user.id), eq(schema.wishlist.productId, parsed.data.productId)),
  });
  if (existing) return NextResponse.json({ item: existing });

  const [item] = await db.insert(schema.wishlist).values({ userId: user.id, productId: parsed.data.productId }).returning();
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const db = getDb();
  await db.delete(schema.wishlist).where(
    and(eq(schema.wishlist.userId, user.id), eq(schema.wishlist.productId, parsed.data.productId))
  );
  return NextResponse.json({ success: true });
}
