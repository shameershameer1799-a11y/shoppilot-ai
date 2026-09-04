import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { eq, or, isNull, desc } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) { console.error("DATABASE_URL not set"); process.exit(1); }
  const sql = postgres(connectionString, { prepare: false });
  const db = drizzle(sql, { schema });

  // Simulate the exact query for kusavannas@gmail.com (Hi Shoppy business)
  const bizId = "ce815949-5120-40e3-ab92-cbc9ef1ced6f"; // Hi Shoppy
  const products = await db.query.products.findMany({
    where: or(
      eq(schema.products.businessId, bizId),
      isNull(schema.products.businessId),
    ),
    with: { category: true },
    orderBy: desc(schema.products.createdAt),
  });

  console.log("Products visible in Business Products page for 'Hi Shoppy':");
  console.log("  Count: " + products.length);
  if (products.length > 0) {
    console.log("  First 3:");
    products.slice(0, 3).forEach(p => console.log("    - " + p.name + " | " + p.category?.name + " | biz: " + p.businessId));
  }

  // Also test for the second business (Virat Kohli 18)
  const bizId2 = "ddd90df9-8ab1-4d48-9509-2b6631979942";
  const products2 = await db.query.products.findMany({
    where: or(
      eq(schema.products.businessId, bizId2),
      isNull(schema.products.businessId),
    ),
  });
  console.log("\nProducts visible for 'Virat Kohli 18': " + products2.length);

  await sql.end();
}
main();
