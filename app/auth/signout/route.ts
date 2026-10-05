import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/db/server";

/** Called with fetch from the client, which then navigates home itself. */
export async function POST() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  return new NextResponse(null, { status: 204 });
}
