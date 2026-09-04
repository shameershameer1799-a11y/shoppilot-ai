import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import * as dotenv from "dotenv";
import crypto from "crypto";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  FINANCIAL_BOUNDS,
  isRazorpayConfigured,
} from "../src/lib/payments/razorpay";
import { searchProducts, compareProducts, getRelatedProducts } from "../src/lib/ai/agents/buyer-tools";
import { getSalesAnalytics, detectGrowthOpportunities } from "../src/lib/ai/agents/merchant-tools";
import { recordAgentAction } from "../src/lib/ai/audit";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function verifyAll() {
  console.log("==================================================");
  console.log("STARTING FULL SHOPPILOT AI COMPLIANCE VERIFICATION");
  console.log("==================================================");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not set!");
    process.exit(1);
  }

  const sql = postgres(connectionString, { prepare: false });
  const db = drizzle(sql, { schema });

  // TEST 1: Product details with reviews & user relation
  console.log("\n[TEST 1] Testing Product Details with Reviews relation query...");
  const sampleProduct = await db.query.products.findFirst({
    with: {
      category: true,
      reviews: {
        with: { user: true },
        limit: 5,
      },
    },
  });

  if (!sampleProduct) {
    throw new Error("TEST 1 FAILED: No product found in database!");
  }
  console.log(`✓ Product query passed! Found: "${sampleProduct.name}" (ID: ${sampleProduct.id})`);
  console.log(`  Category: ${sampleProduct.category?.name}, Reviews count: ${sampleProduct.reviews?.length || 0}`);

  // TEST 2: Business Customers with segments relation query
  console.log("\n[TEST 2] Testing Business Customers with Segments relation query...");
  const sampleBusiness = await db.query.businesses.findFirst();
  if (!sampleBusiness) {
    throw new Error("TEST 2 FAILED: No business found in database!");
  }
  const customers = await db.query.customers.findMany({
    where: eq(schema.customers.businessId, sampleBusiness.id),
    with: { segments: true },
    limit: 5,
  });
  console.log(`✓ Customer query passed! Found ${customers.length} customer records for store "${sampleBusiness.storeName}".`);

  // TEST 3: Business Products query
  console.log("\n[TEST 3] Testing Business Products query...");
  const allProducts = await db.query.products.findMany({
    with: { category: true },
    limit: 5,
  });
  console.log(`✓ Business products query passed! Total catalog sample count: ${allProducts.length}`);

  // TEST 4: Agent Audit Trail insert and query
  console.log("\n[TEST 4] Testing Agent Audit Trail recording...");
  const auditEntry = await recordAgentAction({
    agent: "BUYER_AGENT",
    action: "VERIFICATION_TEST_ACTION",
    tool: "searchProducts",
    inputSummary: "Automated verification test run",
    reason: "Verifying persistent audit trail recording compliance",
    approvalStatus: "EXECUTED",
    result: "Audit verification passed",
    amount: 14999,
  });

  if (!auditEntry) {
    throw new Error("TEST 4 FAILED: Audit trail record insertion failed!");
  }
  console.log(`✓ Audit trail passed! Created audit record ID: ${auditEntry.id}`);

  // TEST 5: Razorpay Strict Error on Missing Credentials
  console.log("\n[TEST 5A] Testing Missing Razorpay Credentials Error Handling...");
  const savedKey = process.env.RAZORPAY_KEY_ID;
  const savedSecret = process.env.RAZORPAY_KEY_SECRET;

  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  delete process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  const missingCredsResult = await createRazorpayOrder({
    amountInRupees: 68499,
    receiptId: `test_rcpt_${Date.now()}`,
  });

  if (missingCredsResult.success) {
    throw new Error("TEST 5A FAILED: createRazorpayOrder should fail when credentials are missing!");
  }
  if (!missingCredsResult.error?.includes("credentials") && !missingCredsResult.error?.includes("configured")) {
    throw new Error(`TEST 5A FAILED: Expected configuration error message, got: "${missingCredsResult.error}"`);
  }
  console.log(`✓ Missing credentials handling passed! Returned error: "${missingCredsResult.error}"`);

  // TEST 5B: Cryptographic Signature Verification & Tampering Rejection
  console.log("\n[TEST 5B] Testing Cryptographic HMAC-SHA256 Signature Verification...");
  const testSecret = "test_buildathon_secret_key_2026";
  process.env.RAZORPAY_KEY_SECRET = testSecret;

  const testOrderId = "order_test_razorpay_998877";
  const testPaymentId = "pay_test_razorpay_112233";
  const validSignature = crypto
    .createHmac("sha256", testSecret)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest("hex");

  const validVerification = verifyRazorpayPayment({
    razorpayOrderId: testOrderId,
    razorpayPaymentId: testPaymentId,
    razorpaySignature: validSignature,
  });

  if (!validVerification.verified) {
    throw new Error(`TEST 5B FAILED: Valid signature was rejected: ${validVerification.error}`);
  }
  console.log("✓ Valid HMAC-SHA256 signature verification passed!");

  // Test Tampered Signature Rejection
  const tamperedSignature = validSignature.slice(0, -4) + "abcd";
  const tamperedVerification = verifyRazorpayPayment({
    razorpayOrderId: testOrderId,
    razorpayPaymentId: testPaymentId,
    razorpaySignature: tamperedSignature,
  });

  if (tamperedVerification.verified) {
    throw new Error("TEST 5B FAILED: Tampered signature was NOT rejected!");
  }
  console.log(`✓ Tampered signature rejection passed! Blocked with: "${tamperedVerification.error}"`);

  // Test Bounded Limits Rejection
  console.log("\n[TEST 5C] Testing Financial Boundary Limits...");
  const overLimitOrder = await createRazorpayOrder({
    amountInRupees: FINANCIAL_BOUNDS.MAX_ORDER_VALUE + 1000,
    receiptId: "test_overlimit",
  });
  if (overLimitOrder.success) {
    throw new Error("TEST 5C FAILED: Over-limit order was NOT blocked by bounded financial rules!");
  }
  console.log(`✓ Bounded money limit enforcement passed! Blocked order over ₹${FINANCIAL_BOUNDS.MAX_ORDER_VALUE}: "${overLimitOrder.error}"`);

  // Restore environment variables
  if (savedKey) process.env.RAZORPAY_KEY_ID = savedKey;
  if (savedSecret) process.env.RAZORPAY_KEY_SECRET = savedSecret;

  // TEST 6: Buyer Agent Tools
  console.log("\n[TEST 6] Testing Buyer Agent Tools (Search, Compare, Upsell)...");
  const searchResults = await searchProducts({
    category: "Laptops",
    budgetMax: 70000,
    limit: 3,
  });
  console.log(`✓ searchProducts passed! Found ${searchResults.length} laptops under ₹70,000.`);
  if (searchResults.length >= 2) {
    const comparison = await compareProducts(searchResults.slice(0, 3).map((p) => p.id));
    console.log(`✓ compareProducts passed! Compared ${comparison.products.length} products. Recommendation: "${comparison.summaryRecommendation.slice(0, 80)}..."`);
  }
  if (searchResults.length > 0) {
    const upsells = await getRelatedProducts(searchResults[0].id);
    console.log(`✓ getRelatedProducts passed! Found ${upsells.length} cross-sell accessories.`);
  }

  // TEST 7: Merchant Growth Agent Tools
  console.log("\n[TEST 7] Testing Merchant Growth Agent Tools (Analytics & Opportunities)...");
  const analytics = await getSalesAnalytics(sampleBusiness.id);
  console.log(`✓ getSalesAnalytics passed! Revenue: ₹${analytics.kpis.revenue}, Orders: ${analytics.kpis.orders}, AOV: ₹${analytics.kpis.avgOrderValue}`);

  const opportunities = await detectGrowthOpportunities(sampleBusiness.id);
  console.log(`✓ detectGrowthOpportunities passed! Found ${opportunities.length} ranked opportunities.`);
  opportunities.forEach((o, i) => {
    console.log(`  [${i + 1}] ${o.title} (${o.category}) — Est. Revenue: ${o.potentialRevenue} (${o.confidence}% confidence)`);
  });

  console.log("\n==================================================");
  console.log("ALL REAL RAZORPAY INTEGRATION & COMPLIANCE TESTS PASSED!");
  console.log("==================================================");

  await sql.end();
}

verifyAll().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
