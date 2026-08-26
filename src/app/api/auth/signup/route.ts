import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDb, schema, isDbConfigured } from "@/lib/db";

const signupSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  accountType: z.enum(["customer", "business"]),
  storeName: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { fullName, email, password, accountType, storeName } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, account_type: accountType } },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const authUser = data.user;
  if (!authUser) {
    return NextResponse.json(
      { error: "Signup succeeded but requires email confirmation. Check your inbox." },
      { status: 200 }
    );
  }

  // Mirror into our own `users` table + create related rows.
  // Skipped gracefully if DATABASE_URL isn't configured yet (auth still works).
  if (isDbConfigured()) {
    const db = getDb();
    await db.insert(schema.users).values({
      id: authUser.id,
      email,
      fullName,
      accountType,
    }).onConflictDoNothing();

    if (accountType === "customer") {
      await db.insert(schema.profiles).values({ userId: authUser.id }).onConflictDoNothing();
      await db.insert(schema.cart).values({ userId: authUser.id }).onConflictDoNothing();
    } else {
      await db.insert(schema.businesses).values({
        ownerId: authUser.id,
        storeName: storeName || `${fullName}'s Store`,
        supportEmail: email,
      });
    }
  }

  return NextResponse.json({ user: { id: authUser.id, email, fullName, accountType } });
}
