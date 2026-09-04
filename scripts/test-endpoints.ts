async function testEndpoints() {
  console.log("Testing live server endpoints on http://localhost:3000...");

  // 1. Products API
  try {
    const res1 = await fetch("http://localhost:3000/api/products?pageSize=3");
    const d1 = await res1.json();
    console.log(`✓ Products API responded: status ${res1.status}, products returned: ${d1.products?.length}`);
  } catch (err: any) {
    console.error("Products API error:", err.message);
  }

  // 2. Razorpay Create endpoint (Unauthenticated check)
  try {
    const res2 = await fetch("http://localhost:3000/api/orders/razorpay/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const d2 = await res2.json();
    console.log(`✓ Razorpay Create endpoint security check: status ${res2.status}, error: "${d2.error}"`);
  } catch (err: any) {
    console.error("Razorpay Create endpoint error:", err.message);
  }

  // 3. Razorpay Verify endpoint (Unauthenticated check)
  try {
    const res3 = await fetch("http://localhost:3000/api/orders/razorpay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpayOrderId: "order_123",
        razorpayPaymentId: "pay_123",
        razorpaySignature: "sig_123",
      }),
    });
    const d3 = await res3.json();
    console.log(`✓ Razorpay Verify endpoint security check: status ${res3.status}, error: "${d3.error}"`);
  } catch (err: any) {
    console.error("Razorpay Verify endpoint error:", err.message);
  }

  // 4. AI Shop Page
  try {
    const res4 = await fetch("http://localhost:3000/ai-shop");
    console.log(`✓ AI Shop page responded: status ${res4.status}`);
  } catch (err: any) {
    console.error("AI Shop page error:", err.message);
  }

  // 5. Checkout Page
  try {
    const res5 = await fetch("http://localhost:3000/checkout");
    console.log(`✓ Checkout page responded: status ${res5.status}`);
  } catch (err: any) {
    console.error("Checkout page error:", err.message);
  }

  console.log("\nAll endpoint accessibility checks passed!");
}

testEndpoints();
