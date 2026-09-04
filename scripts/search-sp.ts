import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function searchSP() {
  const orders = await sql`
    SELECT id, order_number, total, created_at, razorpay_order_id, razorpay_payment_id
    FROM orders
    WHERE order_number LIKE '%263%' OR order_number = 'SP26371' OR order_number = 'SP26311';
  `;
  console.log('Orders with 263:', orders);

  const audits = await sql`
    SELECT id, action, amount, result, input_summary, created_at
    FROM agent_audit_trail
    WHERE result LIKE '%263%' OR input_summary LIKE '%263%';
  `;
  console.log('Audits with 263:', audits);

  const notifications = await sql`
    SELECT id, title, body, created_at
    FROM notifications
    WHERE title LIKE '%263%' OR body LIKE '%263%';
  `;
  console.log('Notifications with 263:', notifications);

  const allRecentOrders = await sql`
    SELECT id, order_number, total, created_at, razorpay_order_id, razorpay_payment_id
    FROM orders
    ORDER BY created_at DESC
    LIMIT 15;
  `;
  console.log('All recent 15 orders:', allRecentOrders);

  await sql.end();
}
searchSP().catch(console.error);
