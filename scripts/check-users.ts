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

  const users = await db.query.users.findMany({ limit: 10 });
  console.log("Users in DB:");
  users.forEach(u => console.log("  " + u.email + " | " + u.accountType + " | " + u.id));

  await sql.end();
}
main();
