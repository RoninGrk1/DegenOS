// Simple in-memory rate limiter.
// WARNING: On Cloudflare Workers this Map is per-isolate and resets frequently.
// It provides only weak protection. For production use Cloudflare Rate Limiting
// bindings, Durable Objects, or an external store (Upstash Redis).
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 30, windowMs = 60_000): { ok: boolean; remaining: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (b.count >= limit) return { ok: false, remaining: 0 };
  b.count++;
  return { ok: true, remaining: limit - b.count };
}
