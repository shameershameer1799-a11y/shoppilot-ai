import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { createPayment } from "@/lib/payments/stripe";
import { generateOrderNumber } from "@/lib/utils";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const items = await db.query.orders.findMany({
    where: eq(schema.orders.userId, user.id),
    orderBy: desc(schema.orders.createdAt),
    with: { items: true },
  });
  return NextResponse.json({ orders: items });
}

const placeOrderSchema = z.object({
  addressLine: z.string().min(1),
  city: z.string().min(1),
  pincode: z.string().min(1),
  phone: z.string().min(1),
  paymentMethod: z.enum(["card", "upi", "cod"]).default("card"),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = placeOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const db = getDb();
  const cartRow = await db.query.cart.findFirst({ where: eq(schema.cart.userId, user.id) });
  if (!cartRow) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

  const items = await db.query.cartItems.findMany({
    where: and(eq(schema.cartItems.cartId, cartRow.id), eq(schema.cartItems.savedForLater, false)),
    with: { product: true },
  });
  if (!items.length) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

  // Stock check
  for (const item of items) {
    if (item.product.stock < item.quantity) {
      return NextResponse.json({ error: `${item.product.name} is out of stock` }, { status: 409 });
    }
  }

  const subtotal = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
  const discount = Math.round(subtotal * 0.05);
  const delivery = subtotal > 2000 ? 0 : 99;
  const total = subtotal - discount + delivery;

  const payment = await createPayment(total);

  const [order] = await db.insert(schema.orders).values({
    orderNumber: generateOrderNumber(),
    userId: user.id,
    status: "ordered",
    subtotal: String(subtotal),
    discount: String(discount),
    deliveryFee: String(delivery),
    total: String(total),
    addressLine: parsed.data.addressLine,
    city: parsed.data.city,
    pincode: parsed.data.pincode,
    phone: parsed.data.phone,
    paymentMethod: parsed.data.paymentMethod,
    paymentRef: payment.paymentRef,
    isMockPayment: payment.isMock,
  }).returning();

  await db.insert(schema.orderItems).values(
    items.map((i) => ({
      orderId: order.id,
      productId: i.productId,
      productName: i.product.name,
      quantity: i.quantity,
      price: i.product.price,
    }))
  );

  // Decrement stock (single-enforcement point pattern: this is the only place stock changes on purchase)
  for (const item of items) {
    await db.update(schema.products)
      .set({ stock: item.product.stock - item.quantity })
      .where(eq(schema.products.id, item.productId));
  }

  // Clear cart
  await db.delete(schema.cartItems).where(eq(schema.cartItems.cartId, cartRow.id));

  await db.insert(schema.analyticsEvents).values({ userId: user.id, eventType: "purchase", metadata: { orderId: order.id, total } });
  await db.insert(schema.notifications).values({
    userId: user.id, type: "order_update", title: `Order ${order.orderNumber} placed`,
    body: `Your order for ${money(total)} has been placed.`,
  });

  return NextResponse.json({ order, payment }, { status: 201 });
}

function money(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}
