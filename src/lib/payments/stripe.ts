import Stripe from "stripe";

let _client: Stripe | null | undefined;

function getStripeClient(): Stripe | null {
  if (_client !== undefined) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  _client = key ? new Stripe(key, { apiVersion: "2024-06-20" }) : null;
  return _client;
}

export function isPaymentsConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export type PaymentResult = {
  success: true;
  paymentRef: string;
  isMock: boolean;
  clientSecret?: string;
};

/**
 * Creates a PaymentIntent when Stripe is configured, or synthesizes a
 * mock payment reference otherwise. Order creation never blocks on
 * payment configuration — the app must remain usable without keys.
 */
export async function createPayment(amountInRupees: number): Promise<PaymentResult> {
  const stripe = getStripeClient();

  if (!stripe) {
    return {
      success: true,
      isMock: true,
      paymentRef: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amountInRupees * 100), // paise
    currency: "inr",
    automatic_payment_methods: { enabled: true },
  });

  return {
    success: true,
    isMock: false,
    paymentRef: intent.id,
    clientSecret: intent.client_secret ?? undefined,
  };
}
