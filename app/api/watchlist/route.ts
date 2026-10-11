import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/ratelimit';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'local';
  if (!rateLimit(`wl:${ip}`, 60).ok) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  if (!supabase) return NextResponse.json({ items: [], note: 'Server watchlist requires Supabase service role' });

  // For MVP: return empty or accept user id header; full auth middleware can be added
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ items: [] });

  const { data } = await supabase.from('watchlists').select('*').eq('user_id', userId).order('added_at', { ascending: false });
  return NextResponse.json({ items: data || [] });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'local';
  if (!rateLimit(`wl:${ip}`, 30).ok) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const body = await req.json();
  const userId = req.headers.get('x-user-id') || body.userId;
  if (!userId || !body.chain_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { error } = await supabase.from('watchlists').upsert({
    user_id: userId,
    chain_id: body.chain_id,
    pair_address: body.pair_address,
    token_address: body.token_address,
    symbol: body.symbol,
  }, { onConflict: 'user_id,chain_id,pair_address' });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
