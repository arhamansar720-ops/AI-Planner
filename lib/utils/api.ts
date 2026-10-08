import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { getSession } from "@/lib/auth/session";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Resolve the signed-in user or produce the response to return instead. */
export async function requireUser() {
  const { user } = await getSession();
  if (!user) return { error: jsonError(401, "Not signed in") } as const;
  return { user } as const;
}

export async function readJson<T extends z.ZodType>(request: Request, schema: T) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: jsonError(400, "Invalid JSON") } as const;
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { error: jsonError(400, "Invalid request") } as const;
  return { data: parsed.data as z.infer<T> } as const;
}
