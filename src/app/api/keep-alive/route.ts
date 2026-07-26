// app/api/keep-alive/route.ts
// Weekly ping to Supabase so the free-tier project doesn't get auto-paused.
//
// Env vars needed:
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
//   CRON_SECRET — you must create this yourself in Vercel → Project Settings →
//                 Environment Variables. Vercel does NOT generate it automatically;
//                 once it exists, Vercel automatically sends it as the Authorization
//                 Bearer header on cron-triggered requests to this route.
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    // Fail closed in production: an unset secret must not silently open the endpoint.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET is not set — add it in Vercel Project Settings → Environment Variables" },
        { status: 500 }
      );
    }
  } else if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("districts")
    .select("id")
    .limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString(), rows: data?.length ?? 0 });
}
