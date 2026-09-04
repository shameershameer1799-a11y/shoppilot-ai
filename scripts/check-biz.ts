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

  const businesses = await db.query.businesses.findMany({ limit: 10 });
  console.log("Businesses:");
  businesses.forEach(b => console.log("  " + b.storeName + " | ownerId: " + b.ownerId + " | id: " + b.id));

  await sql.end();
}
main();
