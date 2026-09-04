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

  const businessUsers = await db.query.users.findMany({
    where: (u, { eq }) => eq(u.accountType, "business"),
  });
  console.log("Business users in Drizzle DB:");
  businessUsers.forEach(u => {
    console.log("  Email: " + u.email);
    console.log("  AccountType: " + u.accountType);
    console.log("  ID: " + u.id);
    console.log("---");
  });

  await sql.end();
}
main();
