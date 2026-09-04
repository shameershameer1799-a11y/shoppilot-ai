import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { createRazorpayOrder, FINANCIAL_BOUNDS } from "@/lib/payments/razorpay";
import { recordAgentAction } from "@/lib/ai/audit";

const createOrderSchema = z.object({
  discountCode: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const db = getDb();
  const cartRow = await db.query.cart.findFirst({ where: eq(schema.cart.userId, user.id) });
  if (!cartRow) return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });

  const items = await db.query.cartItems.findMany({
    where: and(eq(schema.cartItems.cartId, cartRow.id), eq(schema.cartItems.savedForLater, false)),
    with: { product: true },
  });

  if (!items.length) {
    return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
  }

  // 1. Stock check
  for (const item of items) {
    if (item.product.stock < item.quantity) {
      await recordAgentAction({
        agent: "BUYER_AGENT",
        userId: user.id,
        action: "CHECKOUT_STOCK_FAILURE",
        tool: "checkInventory",
        reason: `${item.product.name} is out of stock`,
        failureReason: "Insufficient inventory",
        inputSummary: `Product: ${item.product.name}, requested: ${item.quantity}, available: ${item.product.stock}`,
      });
      return NextResponse.json(
        {
          error: `${item.product.name} is out of stock (${item.product.stock} available). Please update your cart.`,
          outOfStockProduct: item.product.id,
        },
        { status: 409 }
      );
    }
  }

  // 2. Pricing calculations with bounded discount
  const subtotal = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const discountPercent = 5; // Standard agent checkout discount
  const discount = Math.round(subtotal * (discountPercent / 100));
  const deliveryFee = subtotal > 2000 ? 0 : 99;
  const total = subtotal - discount + deliveryFee;

  // 3. Financial bounds validation
  if (total > FINANCIAL_BOUNDS.MAX_ORDER_VALUE) {
    return NextResponse.json(
      {
        error: `Order total ₹${total.toLocaleString("en-IN")} exceeds the maximum allowed transaction limit of ₹${FINANCIAL_BOUNDS.MAX_ORDER_VALUE.toLocaleString("en-IN")}.`,
      },
      { status: 400 }
    );
  }

  // 4. Create Razorpay Order
  const receiptId = `rcpt_${Date.now().toString().slice(-8)}_${user.id.slice(0, 4)}`;
  const rzpOrder = await createRazorpayOrder({
    amountInRupees: total,
    receiptId,
    notes: {
      userId: user.id,
      itemCount: String(items.length),
      subtotal: String(subtotal),
      discount: String(discount),
    },
  });

  if (!rzpOrder.success) {
    await recordAgentAction({
      agent: "BUYER_AGENT",
      userId: user.id,
      action: "CREATE_PAYMENT_ORDER_FAILED",
      tool: "createPaymentOrder",
      amount: total,
      reason: rzpOrder.error || "Razorpay order creation failed",
      failureReason: rzpOrder.error,
    });
    return NextResponse.json({ error: rzpOrder.error || "Failed to initialize payment" }, { status: 400 });
  }

  // 5. Record bounded payment request in Agent Audit Trail
  await recordAgentAction({
    agent: "BUYER_AGENT",
    userId: user.id,
    action: "CREATE_PAYMENT_ORDER",
    tool: "createPaymentOrder",
    amount: total,
    approvalStatus: "PENDING",
    inputSummary: `${items.length} item(s), Subtotal: ₹${subtotal}, Delivery: ₹${deliveryFee}, Discount: -₹${discount}`,
    reason: "User prepared checkout. Awaiting explicit Razorpay payment confirmation.",
    result: `Razorpay order created: ${rzpOrder.orderId}`,
    metadata: {
      razorpayOrderId: rzpOrder.orderId,
      amountRupees: total,
      isMock: rzpOrder.isMock,
    },
  });

  return NextResponse.json({
    razorpayOrderId: rzpOrder.orderId,
    amountPaise: rzpOrder.amountPaise,
    amountRupees: total,
    currency: rzpOrder.currency,
    keyId: rzpOrder.keyId,
    isMock: rzpOrder.isMock,
    breakdown: {
      subtotal,
      discount,
      deliveryFee,
      total,
      itemCount: items.length,
    },
  });
}
