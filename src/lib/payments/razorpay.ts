import crypto from "crypto";
import Razorpay from "razorpay";

/* ============================================================
   Razorpay Server-Side Client & Configuration
   ============================================================ */
let _razorpayClient: Razorpay | null | undefined;

export function getRazorpayClient(): Razorpay | null {
  if (_razorpayClient !== undefined) return _razorpayClient;
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (key_id && key_secret) {
    try {
      _razorpayClient = new Razorpay({ key_id, key_secret });
    } catch {
      _razorpayClient = null;
    }
  } else {
    _razorpayClient = null;
  }
  return _razorpayClient;
}

export function isRazorpayConfigured(): boolean {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(key_id && key_secret);
}

export function getPublicRazorpayKey(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "";
}

/* ============================================================
   Financial Governance & Bounded Money Rules
   ============================================================ */
export const FINANCIAL_BOUNDS = {
  MAX_ORDER_VALUE: 500000, // ₹5,00,000 max single order value
  MAX_AGENT_DISCOUNT_PERCENT: 15, // AI cannot grant more than 15% discount
  REQUIRE_EXPLICIT_CONFIRMATION: true, // Never silent charge
  CURRENCY: "INR",
} as const;

export type CreateRazorpayOrderResult = {
  success: boolean;
  orderId: string;
  amountPaise: number;
  amountRupees: number;
  currency: string;
  keyId: string;
  isMock: boolean;
  receipt: string;
  error?: string;
};

export type VerifyRazorpayPaymentResult = {
  verified: boolean;
  orderId: string;
  paymentId: string;
  isMock: boolean;
  error?: string;
};

/**
 * Creates a real Razorpay Order server-side using the Razorpay Orders API.
 * Enforces financial boundaries (MAX_ORDER_VALUE).
 * Never synthesizes mock IDs.
 */
export async function createRazorpayOrder(params: {
  amountInRupees: number;
  receiptId: string;
  notes?: Record<string, string>;
}): Promise<CreateRazorpayOrderResult> {
  const { amountInRupees, receiptId, notes = {} } = params;

  // 1. Boundary enforcement
  if (amountInRupees <= 0) {
    return {
      success: false,
      orderId: "",
      amountPaise: 0,
      amountRupees: 0,
      currency: FINANCIAL_BOUNDS.CURRENCY,
      keyId: getPublicRazorpayKey(),
      isMock: false,
      receipt: receiptId,
      error: "Order amount must be greater than zero",
    };
  }

  if (amountInRupees > FINANCIAL_BOUNDS.MAX_ORDER_VALUE) {
    return {
      success: false,
      orderId: "",
      amountPaise: 0,
      amountRupees: amountInRupees,
      currency: FINANCIAL_BOUNDS.CURRENCY,
      keyId: getPublicRazorpayKey(),
      isMock: false,
      receipt: receiptId,
      error: `Order amount (₹${amountInRupees.toLocaleString("en-IN")}) exceeds the safe transaction limit of ₹${FINANCIAL_BOUNDS.MAX_ORDER_VALUE.toLocaleString("en-IN")}.`,
    };
  }

  const amountPaise = Math.round(amountInRupees * 100);
  const client = getRazorpayClient();

  // 2. Strict Configuration Check
  if (!client) {
    return {
      success: false,
      orderId: "",
      amountPaise,
      amountRupees: amountInRupees,
      currency: FINANCIAL_BOUNDS.CURRENCY,
      keyId: getPublicRazorpayKey(),
      isMock: false,
      receipt: receiptId,
      error: "Razorpay Test Mode credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are not configured. Please set them in your environment variables.",
    };
  }

  // 3. Real Razorpay Test Mode Order Creation via Razorpay Orders API
  try {
    const order = await client.orders.create({
      amount: amountPaise,
      currency: FINANCIAL_BOUNDS.CURRENCY,
      receipt: receiptId.slice(0, 40),
      notes: {
        ...notes,
        platform: "ShopPilot AI",
        buildathon: "Razorpay AI Buildathon 2026",
      },
    });

    return {
      success: true,
      orderId: order.id,
      amountPaise: Number(order.amount),
      amountRupees: Number(order.amount) / 100,
      currency: order.currency,
      keyId: getPublicRazorpayKey(),
      isMock: false,
      receipt: receiptId,
    };
  } catch (err: any) {
    console.error("Razorpay API orders.create failed:", err);
    return {
      success: false,
      orderId: "",
      amountPaise,
      amountRupees: amountInRupees,
      currency: FINANCIAL_BOUNDS.CURRENCY,
      keyId: getPublicRazorpayKey(),
      isMock: false,
      receipt: receiptId,
      error: `Razorpay API order creation failed: ${err.error?.description || err.message || "Authentication/Network failure"}`,
    };
  }
}

/**
 * Verifies Razorpay payment signature server-side.
 * Formula: HMAC_SHA256(order_id + "|" + payment_id, secret) == signature
 * Never allows mock/unverified signatures.
 */
export function verifyRazorpayPayment(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): VerifyRazorpayPaymentResult {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return {
      verified: false,
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      isMock: false,
      error: "Missing Razorpay order ID, payment ID, or signature",
    };
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return {
      verified: false,
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      isMock: false,
      error: "RAZORPAY_KEY_SECRET is not configured on the server.",
    };
  }

  // Real cryptographic HMAC SHA-256 verification
  try {
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature.length !== razorpaySignature.length) {
      return {
        verified: false,
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        isMock: false,
        error: "Invalid Razorpay payment signature length. Verification rejected.",
      };
    }

    const isMatch = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpaySignature)
    );

    return {
      verified: isMatch,
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      isMock: false,
      error: isMatch ? undefined : "Cryptographic signature verification failed: signature does not match secret.",
    };
  } catch (err: any) {
    return {
      verified: false,
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      isMock: false,
      error: `Signature verification exception: ${err.message}`,
    };
  }
}
