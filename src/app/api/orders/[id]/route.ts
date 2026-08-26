import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.id, params.id),
    with: { items: true },
  });
  if (!order || order.userId !== user.id) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ order });
}

const statusSchema = z.object({
  status: z.enum(["ordered", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"]),
});

/** Business-side status update (e.g. from a fulfillment workflow). */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user || user.accountType !== "business") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const db = getDb();
  const [updated] = await db.update(schema.orders)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(schema.orders.id, params.id))
    .returning();
  if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ order: updated });
}
