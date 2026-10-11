import { NextResponse } from 'next/server';

export const revalidate = 60;

export async function GET() {
  try {
    const [profilesRes, boostsRes] = await Promise.all([
      fetch('https://api.dexscreener.com/token-profiles/latest/v1', { next: { revalidate: 60 } }),
      fetch('https://api.dexscreener.com/token-boosts/top/v1', { next: { revalidate: 60 } }),
    ]);

    const profiles = profilesRes.ok ? await profilesRes.json() : [];
    const boosts = boostsRes.ok ? await boostsRes.json() : [];

    const socialFeed = (Array.isArray(profiles) ? profiles : []).slice(0, 20).map((p: any) => ({
      chainId: p.chainId,
      tokenAddress: p.tokenAddress,
      description: p.description || null,
      icon: p.icon || null,
      links: p.links || [],
      url: p.url,
      type: 'profile',
    }));

    const boosted = (Array.isArray(boosts) ? boosts : []).slice(0, 10).map((b: any) => ({
      chainId: b.chainId,
      tokenAddress: b.tokenAddress,
      amount: b.amount,
      icon: b.icon || null,
      url: b.url,
      type: 'boost',
    }));

    return NextResponse.json({
      socialFeed,
      boosted,
      source: 'DexScreener',
      updatedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } });
  } catch {
    return NextResponse.json({ socialFeed: [], boosted: [], error: 'Social feed unavailable' }, { status: 200 });
  }
}
