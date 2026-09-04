/**
 * Test script: verify customers with segments relation works
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const sql = postgres(connectionString, { prepare: false });
  const db = drizzle(sql, { schema });

  console.log("Testing relation: customers with segments...");

  try {
    const business = await db.query.businesses.findFirst();
    if (!business) {
      console.log("No businesses found in DB.");
      await sql.end();
      return;
    }
    console.log("Using business: " + business.storeName + " (" + business.id + ")");

    const customers = await db.query.customers.findMany({
      where: eq(schema.customers.businessId, business.id),
      orderBy: desc(schema.customers.aiScore),
      with: { segments: { limit: 1, orderBy: desc(schema.customerSegments.assignedAt) } },
    });

    console.log("SUCCESS! Found " + customers.length + " customers.");
    if (customers.length > 0) {
      const c = customers[0];
      console.log("  First customer: " + c.displayName);
      console.log("  AI Score: " + c.aiScore);
      console.log("  Segments: " + (c.segments?.length ?? 0));
    }
  } catch (err) {
    console.error("FAILED:", (err as Error).message);
  } finally {
    await sql.end();
  }
}

main();
