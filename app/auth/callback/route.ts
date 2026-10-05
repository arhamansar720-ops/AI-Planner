import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/db/server";
import { safeNext } from "@/lib/utils/safe-next";

/** Completes email confirmation / magic-link sign-in. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    console.error("[auth] code exchange failed", { error: error.message });
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
