import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) { console.error("DATABASE_URL not set"); process.exit(1); }
  const sql = postgres(connectionString, { prepare: false });
  const db = drizzle(sql, { schema });

  const total = await db.query.products.findMany({ limit: 5 });
  console.log("Total products sample (first 5):");
  total.forEach(p => console.log("  " + p.name + " | businessId: " + p.businessId));

  // Count nulls
  const all = await db.query.products.findMany();
  const nullCount = all.filter(p => !p.businessId).length;
  const withBiz = all.filter(p => p.businessId).length;
  console.log("\nTotal products: " + all.length);
  console.log("  businessId = NULL: " + nullCount);
  console.log("  businessId set: " + withBiz);

  await sql.end();
}
main();
