import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { recordAgentAction } from "@/lib/ai/audit";

const cancelSchema = z.object({
  razorpayOrderId: z.string().optional(),
  amount: z.number().optional(),
  reason: z.string().optional(),
  type: z.enum(["cancelled", "failed"]).default("cancelled"),
  errorDescription: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = cancelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { razorpayOrderId, amount, reason, type, errorDescription } = parsed.data;

  if (type === "cancelled") {
    await recordAgentAction({
      agent: "BUYER_AGENT",
      userId: user.id,
      action: "PAYMENT_CANCELLED",
      tool: "cancelPaymentOrder",
      amount: amount || 0,
      approvalStatus: "REJECTED",
      reason: reason || "User dismissed the Razorpay checkout modal before completing transaction.",
      result: "Payment was dismissed by user. Cart preserved for retry. No order created.",
      metadata: {
        razorpayOrderId: razorpayOrderId || null,
        status: "cancelled_by_user",
      },
    });
  } else {
    await recordAgentAction({
      agent: "BUYER_AGENT",
      userId: user.id,
      action: "PAYMENT_FAILED",
      tool: "recordPaymentFailure",
      amount: amount || 0,
      approvalStatus: "REJECTED",
      reason: errorDescription || "Payment declined or failed at Razorpay payment gateway.",
      failureReason: errorDescription || "Payment declined by provider",
      result: `Payment failed: ${errorDescription || "Declined"}. Cart preserved for retry. No order created.`,
      metadata: {
        razorpayOrderId: razorpayOrderId || null,
        errorDescription: errorDescription || null,
        status: "failed_at_gateway",
      },
    });
  }

  return NextResponse.json({ success: true, message: "Payment outcome recorded in audit trail." });
}
