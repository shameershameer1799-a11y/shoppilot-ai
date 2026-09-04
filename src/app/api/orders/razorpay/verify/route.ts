import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { verifyRazorpayPayment } from "@/lib/payments/razorpay";
import { generateOrderNumber, money } from "@/lib/utils";
import { recordAgentAction } from "@/lib/ai/audit";

const verifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  addressLine: z.string().default("101 AI Commerce Blvd"),
  city: z.string().default("Bengaluru"),
  pincode: z.string().default("560001"),
  phone: z.string().default("+91 98765 43210"),
  paymentMethod: z.enum(["card", "upi", "netbanking"]).default("upi"),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    addressLine,
    city,
    pincode,
    phone,
    paymentMethod,
  } = parsed.data;

  // 1. Server-side Cryptographic Signature Verification
  const verification = verifyRazorpayPayment({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  if (!verification.verified) {
    // Record security / failure event in agent audit trail
    await recordAgentAction({
      agent: "BUYER_AGENT",
      userId: user.id,
      action: "PAYMENT_VERIFICATION_FAILED",
      tool: "createOrderAfterVerifiedPayment",
      approvalStatus: "REJECTED",
      reason: "Razorpay signature verification rejected server-side.",
      failureReason: verification.error || "Invalid cryptographic signature",
      metadata: { razorpayOrderId, razorpayPaymentId },
    });

    return NextResponse.json(
      {
        error: "Payment verification failed. Your card has not been charged for this order.",
        details: verification.error,
      },
      { status: 400 }
    );
  }

  const db = getDb();

  // 2. Prevent Duplicate Orders (Idempotency check)
  const existingOrder = await db.query.orders.findFirst({
    where: eq(schema.orders.razorpayPaymentId, razorpayPaymentId),
  });

  if (existingOrder) {
    return NextResponse.json({
      order: existingOrder,
      message: "Order already verified and confirmed.",
    });
  }

  // 3. Retrieve Cart Items
  const cartRow = await db.query.cart.findFirst({ where: eq(schema.cart.userId, user.id) });
  if (!cartRow) {
    return NextResponse.json({ error: "Cart not found" }, { status: 400 });
  }

  const items = await db.query.cartItems.findMany({
    where: and(eq(schema.cartItems.cartId, cartRow.id), eq(schema.cartItems.savedForLater, false)),
    with: { product: true },
  });

  if (!items.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // 4. Inventory Stock Verification
  for (const item of items) {
    if (item.product.stock < item.quantity) {
      await recordAgentAction({
        agent: "BUYER_AGENT",
        userId: user.id,
        action: "POST_PAYMENT_STOCK_ERROR",
        tool: "createOrderAfterVerifiedPayment",
        reason: `${item.product.name} ran out of stock before order finalization`,
        failureReason: "Inventory exhausted",
        metadata: { productId: item.productId, requested: item.quantity, stock: item.product.stock },
      });
      return NextResponse.json(
        { error: `Item ${item.product.name} is no longer in stock. Please contact support for refund.` },
        { status: 409 }
      );
    }
  }

  // 5. Final Totals
  const subtotal = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
  const discount = Math.round(subtotal * 0.05);
  const delivery = subtotal > 2000 ? 0 : 99;
  const total = subtotal - discount + delivery;

  // 6. Create Confirmed Order in Database
  const orderNumber = generateOrderNumber();
  const [order] = await db
    .insert(schema.orders)
    .values({
      orderNumber,
      userId: user.id,
      status: "ordered",
      subtotal: String(subtotal),
      discount: String(discount),
      deliveryFee: String(delivery),
      total: String(total),
      addressLine,
      city,
      pincode,
      phone,
      paymentMethod,
      paymentRef: razorpayPaymentId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      isMockPayment: false,
    })
    .returning();

  // 7. Insert Order Items (Snapshot at purchase time)
  await db.insert(schema.orderItems).values(
    items.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
    }))
  );

  // 8. Decrement Product Stock
  for (const item of items) {
    await db
      .update(schema.products)
      .set({
        stock: Math.max(0, item.product.stock - item.quantity),
        updatedAt: new Date(),
      })
      .where(eq(schema.products.id, item.productId));
  }

  // 9. Clear Cart Items
  await db.delete(schema.cartItems).where(eq(schema.cartItems.cartId, cartRow.id));

  // 10. Record Analytics & Notification
  await db.insert(schema.analyticsEvents).values({
    userId: user.id,
    businessId: items[0]?.product.businessId ?? null,
    eventType: "purchase",
    productId: items[0]?.productId ?? null,
    metadata: {
      orderId: order.id,
      orderNumber,
      total,
      itemCount: items.length,
      paymentMethod: `Razorpay (${paymentMethod})`,
      razorpayPaymentId,
    },
  });

  await db.insert(schema.notifications).values({
    userId: user.id,
    type: "order_update",
    title: `Payment Verified — Order ${order.orderNumber}`,
    body: `Razorpay payment of ${money(total)} verified. Your order is confirmed and processing.`,
  });

  // 11. Record in Agent Audit Trail
  await recordAgentAction({
    agent: "BUYER_AGENT",
    userId: user.id,
    action: "RAZORPAY_PAYMENT_VERIFIED",
    tool: "createOrderAfterVerifiedPayment",
    amount: total,
    approvalStatus: "EXECUTED",
    inputSummary: `Order: ${orderNumber}, PaymentId: ${razorpayPaymentId}, RazorpayOrderId: ${razorpayOrderId}`,
    reason: "Explicit user payment verified via HMAC-SHA256 signature.",
    result: `Order ${orderNumber} created successfully. Stock decremented. Cart cleared.`,
    metadata: {
      orderId: order.id,
      orderNumber,
      amountRupees: total,
      isMock: verification.isMock,
    },
  });

  return NextResponse.json({
    success: true,
    order,
    message: "Payment verified and order placed successfully!",
  }, { status: 201 });
}
