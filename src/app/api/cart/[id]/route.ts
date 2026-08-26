import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";

const updateSchema = z.object({ quantity: z.number().int().min(0) });

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const db = getDb();
  if (parsed.data.quantity === 0) {
    await db.delete(schema.cartItems).where(eq(schema.cartItems.id, params.id));
    return NextResponse.json({ success: true, deleted: true });
  }

  const [updated] = await db.update(schema.cartItems)
    .set({ quantity: parsed.data.quantity })
    .where(eq(schema.cartItems.id, params.id))
    .returning();
  if (!updated) return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await db.delete(schema.cartItems).where(eq(schema.cartItems.id, params.id));
  return NextResponse.json({ success: true });
}
