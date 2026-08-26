import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { compareProducts } from "@/lib/ai/service";

const bodySchema = z.object({ productIds: z.array(z.string().uuid()).min(2).max(4) });

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const result = await compareProducts(parsed.data.productIds);
  return NextResponse.json(result);
}
