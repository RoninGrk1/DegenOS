# Deployment notes

## Vercel
Import `RoninGrk1/DegenOS` into Vercel (or deploy this project directory), set the framework to Next.js, and deploy. No environment variables are required for the demo market endpoints. Use a production branch and preview deploys before merging.

## Android
Recommended first release: PWA install from Chrome (no store review or APK signing required). For Play Store distribution, add Capacitor and native Android project, point app API calls at the hosted backend, configure package ID `io.degenos.app`, app signing, privacy disclosures, and Play Console data safety.

## Before accepting money
Do not enable payment UI until server-side auth, Stripe Checkout, signature-verified webhooks, idempotent entitlement updates, refund handling, access expiry, terms, and support operations are tested. Client-side prices or localStorage must never grant paid access.

## Chat room
Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel (or your host) for the real-time social chat. No extra tables needed for the default lounge. Works in the web app and PWA.

## Cloudflare Workers (recommended)

Cloudflare recommends **OpenNext** or **vinext** for Next.js apps (not the deprecated `@cloudflare/next-on-pages`).

### OpenNext path
```bash
npm i -D @opennextjs/cloudflare wrangler
# Add to package.json scripts:
# "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview"
# "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy
```

`wrangler.toml` and `open-next.config.ts` are included. Set secrets with:
```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### Compatibility notes
- All API routes export `runtime = 'edge'`.
- No Node.js built-in imports — edge-safe.
- In-memory rate limiter is weak on Workers (per-isolate). Replace with Cloudflare Rate Limiting or Durable Objects for production.
- `revalidate` / `next: { revalidate }` caching works differently; OpenNext handles it via KV/Cache API.
- Stripe webhook signature verification is still a placeholder — implement HMAC before accepting real payments.
