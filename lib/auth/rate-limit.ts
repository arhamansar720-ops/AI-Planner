import "server-only";

const hits = new Map<string, number[]>();

/**
 * A small in-memory limiter for sign-in, sign-up and reset requests: at most
 * `limit` attempts per key in `windowMs`. Enough for a single web instance.
 */
export function rateLimited(key: string, limit = 10, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return recent.length > limit;
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
