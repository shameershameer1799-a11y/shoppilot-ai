"use client";

/**
 * Loads the official Razorpay Standard Checkout JS script if not already loaded.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export type RazorpayCheckoutOptions = {
  keyId: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  name: string;
  description: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  onSuccess: (payment: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  onDismiss?: () => void;
  onFailure?: (error: { description: string; code?: string; reason?: string }) => void;
};

/**
 * Launches the real Razorpay Web Standard payment dialog in Test Mode.
 * Strictly uses official Razorpay Checkout modal without any mock dialogs.
 */
export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  const keyId = options.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  if (!keyId) {
    const msg = "Razorpay Key ID is missing. Please set RAZORPAY_KEY_ID or NEXT_PUBLIC_RAZORPAY_KEY_ID in your environment variables.";
    if (options.onFailure) {
      options.onFailure({ description: msg });
    } else {
      throw new Error(msg);
    }
    return;
  }

  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !(window as any).Razorpay) {
    const msg = "Unable to load Razorpay Checkout SDK. Please check your internet connection and try again.";
    if (options.onFailure) {
      options.onFailure({ description: msg });
    } else {
      throw new Error(msg);
    }
    return;
  }

  try {
    const rzp = new (window as any).Razorpay({
      key: keyId,
      amount: options.amountPaise,
      currency: options.currency || "INR",
      name: options.name || "ShopPilot AI",
      description: options.description || "Order Checkout",
      order_id: options.orderId,
      prefill: options.prefill || {},
      theme: { color: "#7c3aed" },
      modal: {
        confirm_close: true,
        ondismiss: function () {
          if (options.onDismiss) options.onDismiss();
        },
      },
      handler: function (response: any) {
        if (!response.razorpay_payment_id || !response.razorpay_signature) {
          if (options.onFailure) {
            options.onFailure({ description: "Incomplete payment response received from Razorpay." });
          }
          return;
        }
        options.onSuccess({
          razorpay_order_id: response.razorpay_order_id || options.orderId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
    });

    rzp.on("payment.failed", function (response: any) {
      console.error("Razorpay payment failed:", response.error);
      if (options.onFailure) {
        options.onFailure({
          description: response.error?.description || "Payment declined or failed by provider.",
          code: response.error?.code,
          reason: response.error?.reason,
        });
      }
    });

    rzp.open();
  } catch (err: any) {
    console.error("Failed to initialize Razorpay checkout:", err);
    if (options.onFailure) {
      options.onFailure({ description: err.message || "Failed to initialize Razorpay modal." });
    } else {
      throw err;
    }
  }
}
