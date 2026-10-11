import { NextResponse } from 'next/server';
export const runtime = 'edge';
export const revalidate = 45;
const FALLBACK = [
 {chainId:'solana',dexId:'demo',pairAddress:'demo-1',baseToken:{address:'DEMO1',name:'Demo Token',symbol:'DEMO'},quoteToken:{symbol:'SOL'},priceUsd:'0.0421',priceChange:{h24:12.4},volume:{h24:182000},liquidity:{usd:94000},fdv:4200000,pairCreatedAt:Date.now()-86400000*8,url:'https://dexscreener.com/'},
 {chainId:'ethereum',dexId:'demo',pairAddress:'demo-2',baseToken:{address:'DEMO2',name:'Example Asset',symbol:'EXA'},quoteToken:{symbol:'WETH'},priceUsd:'1.24',priceChange:{h24:-3.8},volume:{h24:560000},liquidity:{usd:730000},fdv:12400000,pairCreatedAt:Date.now()-86400000*45,url:'https://dexscreener.com/'},
];
export async function GET() {
 try {
  const r = await fetch('https://api.dexscreener.com/token-boosts/top/v1', { next: { revalidate: 45 }, headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`provider status ${r.status}`);
  const raw = await r.json();
  const tokens = Array.isArray(raw) ? raw.slice(0,30) : [];
  const pairs = await Promise.all(tokens.slice(0,15).map(async (t:any) => {
    try { const p = await fetch(`https://api.dexscreener.com/token-pairs/v1/${encodeURIComponent(t.chainId)}/${encodeURIComponent(t.tokenAddress)}`,{next:{revalidate:45}}); if(!p.ok)return null; const list=await p.json(); return Array.isArray(list)?list[0]:null; } catch { return null; }
  }));
  const data = pairs.filter(Boolean).filter((p:any)=>p?.baseToken && p?.priceUsd).slice(0,15);
  return NextResponse.json({data,source:'DexScreener',updatedAt:new Date().toISOString(),demo:false},{headers:{'Cache-Control':'s-maxage=45, stale-while-revalidate=120'}});
 } catch {
  return NextResponse.json({data:[],source:'DexScreener',updatedAt:new Date().toISOString(),demo:false,notice:'Live market data is temporarily unavailable. Try again shortly.'},{headers:{'Cache-Control':'no-store'}});
 }
}
