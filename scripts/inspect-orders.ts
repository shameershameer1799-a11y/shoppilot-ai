import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function run() {
  const orders = await sql`
    SELECT id, order_number, user_id, total, status, payment_method, payment_ref, razorpay_order_id, razorpay_payment_id, razorpay_signature, created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 10;
  `;
  console.log('=== RECENT ORDERS ===');
  console.log(JSON.stringify(orders, null, 2));

  const audits = await sql`
    SELECT id, agent, action, tool, amount, approval_status, reason, result, metadata, created_at
    FROM agent_audit_trail
    ORDER BY created_at DESC
    LIMIT 15;
  `;
  console.log('=== RECENT AUDIT ENTRIES ===');
  console.log(JSON.stringify(audits, null, 2));

  const spOrders = await sql`
    SELECT id, order_number, user_id, total, status, payment_method, payment_ref, razorpay_order_id, razorpay_payment_id, created_at
    FROM orders
    WHERE order_number IN ('SP26311', 'SP26371') OR id IN ('SP26311', 'SP26371');
  `;
  console.log('=== SPECIFIC ORDERS SP26311 / SP26371 ===');
  console.log(JSON.stringify(spOrders, null, 2));

  const spAudits = await sql`
    SELECT id, agent, action, tool, amount, approval_status, reason, result, metadata, created_at
    FROM agent_audit_trail
    WHERE result LIKE '%SP26311%' OR result LIKE '%SP26371%' OR input_summary LIKE '%SP26311%' OR input_summary LIKE '%SP26371%';
  `;
  console.log('=== SPECIFIC AUDIT ENTRIES FOR SP26311 / SP26371 ===');
  console.log(JSON.stringify(spAudits, null, 2));

  await sql.end();
}
run().catch(console.error);
