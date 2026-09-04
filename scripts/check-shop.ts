import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) { console.error("DATABASE_URL not set"); process.exit(1); }
  const sql = postgres(connectionString, { prepare: false });
  const db = drizzle(sql, { schema });

  // Customer Shop page query (no business filter)
  const products = await db.query.products.findMany({
    where: (p, { eq }) => eq(p.isActive, true),
    with: { category: true },
    limit: 5,
  });

  console.log("Customer Shop products (sample 5):");
  products.forEach(p => console.log("  " + p.name + " | " + p.category?.name));

  const allActive = await db.query.products.findMany({ where: (p, { eq }) => eq(p.isActive, true) });
  console.log("\nTotal active products for shop: " + allActive.length);

  await sql.end();
}
main();
