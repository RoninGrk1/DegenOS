# Deployment notes

## Vercel
Import `RoninGrk1/DegenOS` into Vercel (or deploy this project directory), set the framework to Next.js, and deploy. No environment variables are required for the demo market endpoints. Use a production branch and preview deploys before merging.

## Android
Recommended first release: PWA install from Chrome (no store review or APK signing required). For Play Store distribution, add Capacitor and native Android project, point app API calls at the hosted backend, configure package ID `io.degenos.app`, app signing, privacy disclosures, and Play Console data safety.

## Before accepting money
Do not enable payment UI until server-side auth, Stripe Checkout, signature-verified webhooks, idempotent entitlement updates, refund handling, access expiry, terms, and support operations are tested. Client-side prices or localStorage must never grant paid access.

## Chat room
Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel (or your host) for the real-time social chat. No extra tables needed for the default lounge. Works in the web app and PWA.
