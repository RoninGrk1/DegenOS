# DegenOS — Multi-chain crypto research terminal

A Next.js App Router MVP for the DegenOS product spec: neon bull/shield branding, responsive dashboard, DexScreener-powered token search and market discovery, locally persisted watchlist, chain filter, and installable PWA surface.

## What works now
- Responsive desktop and mobile terminal UI.
- `/api/search?q=...` queries DexScreener's public token-pair search API.
- `/api/markets` reads DexScreener's public top-token-boost feed and fetches a sample of token pairs. Responses are cached briefly.
- Watchlist saved to browser local storage.
- Outbound pair links to DexScreener.
- PWA manifest and SVG app icon; Android users can install through Chrome's **Install app** menu when deployed over HTTPS.

## Important release boundary
This is a working MVP, not yet a fully production-ready paid SaaS. Authentication, server-side watchlists, real alerts, risk-provider adapters, paid access entitlements, Stripe checkout/webhooks, privacy/terms pages, rate limiting, provider monitoring, and Android Play Store signing/release still need configuration and testing. The interface intentionally labels those capabilities as not enabled instead of simulating them. No trades are executed and no wallet secrets are requested.

## Run locally
Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open http://localhost:3000. No API key is required for the public DexScreener endpoints. Provider availability and rate limits may change.

## Build

```bash
npm run build
npm start
```

## Android
The site is a PWA and can be installed from Chrome on Android after HTTPS deployment. A Capacitor configuration is included for a native Android wrapper; to produce an APK/AAB, install Capacitor packages, export the static web build, run `npx cap add android`, `npx cap sync android`, then open the Android project in Android Studio and sign a release. The current API routes require a server, so for Capacitor's static export use a deployed `server.url`/remote backend or migrate API routes to the hosted service before packaging.

## Environment
See `.env.example`. Do not commit real secrets. Before payments go live, configure Stripe in test mode, verify webhook signatures, make access grants idempotent, and test expiration/refund flows.

## Production checklist
1. Configure production domain and HTTPS.
2. Add auth and Postgres-backed users/watchlists/alerts.
3. Add server-side rate limits, validation, and observability.
4. Implement and test source-attributed risk checks; show unavailable/stale states.
5. Implement Stripe one-time 30/90/365-day passes and verified webhook entitlements.
6. Publish privacy policy, terms, risk disclosure, cookie policy where required, and support contact.
7. Test mobile accessibility, API errors, abuse controls, backups, and incident response.
8. Generate Android signing keys securely and complete Play Console policy review if distributing there.

## Data and safety
Market observations are not financial advice. Data can be delayed, incomplete, or manipulated. A risk report is not proof that a token is safe. DegenOS should never collect seed phrases or private keys.

## Social utility upgrade (v1.1)

- **Social scores**: Every pair shows a 0–100 social utility score based on X/Telegram presence, websites, and boosts.
- **Social icons**: Direct links to Twitter/X, Telegram, Discord, and websites when available in DexScreener data.
- **Share**: Native share or clipboard copy of token + price + DexScreener link.
- **Social feed**: Dedicated Social tab loads latest token profiles (descriptions + links) from DexScreener.
- **Local reactions**: Bull / Bear tags stored only in localStorage (device-private).
- **Detail panel**: Click any row for expanded socials, score, watch, share, and reactions.
- **New API**: `/api/social` aggregates latest profiles and boosted tokens.

Social data is community-provided and unverified. Scores are informational only — not a safety or quality rating.

## Social chat room

A real-time chat room (`# degen-lounge`) is available in the Chat tab. It works on the website and as an installed PWA / Capacitor app.

### Setup (free)
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run the contents of `supabase/messages.sql` (creates the `messages` table + RLS policies).
3. In Database → Replication, add the `messages` table to the Realtime publication.
4. Copy the Project URL and anon/public key into environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
5. Redeploy.

The Chat tab loads the last 100 messages on open and receives new ones live. Presence shows online users.
