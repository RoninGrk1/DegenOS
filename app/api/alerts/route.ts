import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/ratelimit';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'local';
  if (!rateLimit(`al:${ip}`, 40).ok) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  if (!supabase) return NextResponse.json({ alerts: [], note: 'Requires Supabase' });

  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ alerts: [] });
  const { data } = await supabase.from('alerts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return NextResponse.json({ alerts: data || [] });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'local';
  if (!rateLimit(`al:${ip}`, 20).ok) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const body = await req.json();
  const userId = req.headers.get('x-user-id') || body.userId;
  if (!userId || !body.condition) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { data, error } = await supabase.from('alerts').insert({
    user_id: userId,
    chain_id: body.chain_id,
    token_address: body.token_address,
    symbol: body.symbol,
    condition: body.condition,
    threshold: body.threshold,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ alert: data });
}
