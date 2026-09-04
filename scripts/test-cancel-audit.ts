import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

import { recordAgentAction } from '../src/lib/ai/audit';

async function testCancellationAudit() {
  console.log("Testing Payment Cancellation & Failure Audit Recording...");

  const customerUser = await sql`
    SELECT id, email FROM users WHERE account_type = 'customer' LIMIT 1;
  `;
  const userId = customerUser[0].id;

  // 1. Record Cancellation
  const cancelEntry = await recordAgentAction({
    agent: "BUYER_AGENT",
    userId,
    action: "PAYMENT_CANCELLED",
    tool: "cancelPaymentOrder",
    amount: 3703,
    approvalStatus: "REJECTED",
    reason: "User dismissed the Razorpay checkout modal before completing transaction.",
    result: "Payment was dismissed by user. Cart preserved for retry. No order created.",
    metadata: {
      razorpayOrderId: "order_test_cancel_123",
      status: "cancelled_by_user",
    },
  });
  console.log(`✓ Cancellation recorded! ID: ${cancelEntry?.id}, Action: ${cancelEntry?.action}, Status: ${cancelEntry?.approvalStatus}`);

  // 2. Record Failure
  const failEntry = await recordAgentAction({
    agent: "BUYER_AGENT",
    userId,
    action: "PAYMENT_FAILED",
    tool: "recordPaymentFailure",
    amount: 3703,
    approvalStatus: "REJECTED",
    reason: "Payment declined by issuing bank (insufficient funds).",
    failureReason: "Payment declined by provider",
    result: "Payment failed: Declined. Cart preserved for retry. No order created.",
    metadata: {
      razorpayOrderId: "order_test_fail_456",
      errorDescription: "Payment declined by issuing bank",
      status: "failed_at_gateway",
    },
  });
  console.log(`✓ Failure recorded! ID: ${failEntry?.id}, Action: ${failEntry?.action}, Status: ${failEntry?.approvalStatus}`);

  await sql.end();
}

testCancellationAudit().catch(console.error);
