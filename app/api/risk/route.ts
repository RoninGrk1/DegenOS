import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'local';
  const rl = rateLimit(`risk:${ip}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const chain = req.nextUrl.searchParams.get('chain');
  const address = req.nextUrl.searchParams.get('address');
  if (!chain || !address) return NextResponse.json({ error: 'Missing chain or address' }, { status: 400 });

  try {
    const r = await fetch(`https://api.dexscreener.com/token-pairs/v1/${encodeURIComponent(chain)}/${encodeURIComponent(address)}`, { next: { revalidate: 60 } });
    if (!r.ok) throw new Error('upstream');
    const pairs = await r.json();
    const p = Array.isArray(pairs) ? pairs[0] : null;
    if (!p) return NextResponse.json({ score: 0, evidence: { note: 'No pair data found' }, checkedAt: new Date().toISOString() });

    const liq = p.liquidity?.usd || 0;
    const vol = p.volume?.h24 || 0;
    const ageDays = p.pairCreatedAt ? Math.floor((Date.now() - p.pairCreatedAt) / 86400000) : 0;
    const socials = p.info?.socials?.length || 0;
    const boosts = p.boosts?.active || 0;

    // Evidence score: more signals present = higher score. NOT a safety rating.
    let score = 0;
    const evidence: Record<string, any> = {};
    if (liq > 50000) { score += 25; evidence.liquidity = `$${Math.round(liq).toLocaleString()} (above $50k)`; }
    else if (liq > 10000) { score += 12; evidence.liquidity = `$${Math.round(liq).toLocaleString()} (moderate)`; }
    else { evidence.liquidity = `$${Math.round(liq).toLocaleString()} (thin)`; }
    if (vol > 100000) { score += 20; evidence.volume24h = `$${Math.round(vol).toLocaleString()}`; }
    if (ageDays > 7) { score += 15; evidence.age = `${ageDays}d`; }
    else if (ageDays > 1) { score += 5; evidence.age = `${ageDays}d (new)`; }
    else { evidence.age = 'very new'; }
    if (socials >= 2) { score += 15; evidence.socials = socials; }
    if (boosts > 0) { score += 10; evidence.boosts = boosts; }

    score = Math.min(100, score);

    return NextResponse.json({
      score,
      evidence,
      disclaimer: 'Evidence score only. Higher = more observable signals. Not a safety guarantee.',
      source: 'DexScreener',
      checkedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 's-maxage=60' } });
  } catch {
    return NextResponse.json({ error: 'Risk check unavailable', score: null }, { status: 200 });
  }
}
