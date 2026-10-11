import { NextRequest, NextResponse } from 'next/server';

// Stripe Checkout session creator.
// Requires STRIPE_SECRET_KEY. Returns a session URL when configured.
export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: 'Stripe not configured', configured: false }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const plan = body.plan || 'pass_30';
  const prices: Record<string, number> = { pass_30: 999, pass_90: 2499, pass_365: 7999 }; // cents

  // Minimal fetch-based Stripe Checkout (no SDK required for skeleton)
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?pass=success`);
  params.set('cancel_url', `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?pass=cancel`);
  params.set('line_items[0][price_data][currency]', 'usd');
  params.set('line_items[0][price_data][product_data][name]', `DegenOS ${plan}`);
  params.set('line_items[0][price_data][unit_amount]', String(prices[plan] || 999));
  params.set('line_items[0][quantity]', '1');
  if (body.userId) params.set('client_reference_id', body.userId);
  params.set('metadata[plan]', plan);

  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const session = await r.json();
  if (!r.ok) return NextResponse.json({ error: session.error?.message || 'Stripe error' }, { status: 400 });
  return NextResponse.json({ url: session.url, id: session.id });
}
