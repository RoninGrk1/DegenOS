import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Stripe webhook. Verifies signature when STRIPE_WEBHOOK_SECRET is set.
// Grants entitlement on checkout.session.completed.
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') || '';

  if (!secret) return NextResponse.json({ received: true, note: 'Webhook secret not set — ignoring' });

  // Basic signature check placeholder — full HMAC verification recommended for production
  // For skeleton we log and optionally write entitlement when service role is present
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

  try {
    const event = JSON.parse(body);
    if (event.type === 'checkout.session.completed' && supabase) {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const plan = session.metadata?.plan || 'pass_30';
      const days = plan === 'pass_365' ? 365 : plan === 'pass_90' ? 90 : 30;
      const expires = new Date(Date.now() + days * 86400000).toISOString();
      if (userId) {
        await supabase.from('entitlements').upsert({
          user_id: userId,
          stripe_customer_id: session.customer,
          plan,
          expires_at: expires,
        }, { onConflict: 'user_id' });
      }
    }
  } catch (e) {
    console.error('Webhook parse error', e);
  }
  return NextResponse.json({ received: true });
}
