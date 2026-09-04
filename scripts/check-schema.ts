import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function run() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  // 1. Check campaign_status enum values
  const enums = await sql`
    SELECT enumlabel FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE typname = 'campaign_status';
  `;
  console.log('campaign_status values:', enums.map(e => e.enumlabel));

  // 2. Create agent_audit_trail table if it does not exist
  await sql`
    CREATE TABLE IF NOT EXISTS agent_audit_trail (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent VARCHAR(40) NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
      action VARCHAR(80) NOT NULL,
      tool VARCHAR(80),
      input_summary TEXT,
      reason TEXT,
      amount NUMERIC(12, 2),
      approval_status VARCHAR(40) DEFAULT 'N_A',
      result TEXT,
      failure_reason TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  console.log('agent_audit_trail table ensured.');

  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS agent_audit_trail_agent_idx ON agent_audit_trail(agent);`;
  await sql`CREATE INDEX IF NOT EXISTS agent_audit_trail_user_idx ON agent_audit_trail(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS agent_audit_trail_business_idx ON agent_audit_trail(business_id);`;
  await sql`CREATE INDEX IF NOT EXISTS agent_audit_trail_created_idx ON agent_audit_trail(created_at);`;
  console.log('agent_audit_trail indexes ensured.');

  // 3. Add extra columns to campaigns table if needed
  await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS audience_description TEXT;`;
  await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reasoning TEXT;`;
  await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS expected_impact TEXT;`;
  await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_products JSONB DEFAULT '[]'::jsonb;`;
  await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;`;
  await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;`;
  console.log('campaigns columns ensured.');

  // 4. Also add razorpay columns to orders table if needed
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(120);`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(120);`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(255);`;
  console.log('orders razorpay columns ensured.');

  await sql.end();
  console.log('Database migration completed successfully!');
}

run().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
