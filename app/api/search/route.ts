import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'edge';
export async function GET(req: NextRequest) {
 const q = req.nextUrl.searchParams.get('q')?.trim();
 if (!q || q.length < 2 || q.length > 100) return NextResponse.json({pairs:[]});
 try { const r=await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`,{next:{revalidate:30}}); if(!r.ok) throw new Error('upstream'); const j=await r.json(); return NextResponse.json({pairs:Array.isArray(j.pairs)?j.pairs.slice(0,30):[],source:'DexScreener',updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'s-maxage=30, stale-while-revalidate=60'}}); }
 catch { return NextResponse.json({pairs:[],error:'Search temporarily unavailable.'},{status:200}); }
}
