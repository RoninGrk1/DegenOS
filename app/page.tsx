'use client';
import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Bell, Bookmark, Check, ChevronDown, CircleHelp, Command, ExternalLink, Filter, Gauge, Globe2, LayoutDashboard, Menu, Search, ShieldAlert, ShieldCheck, Sparkles, Star, Wallet, X, Zap, Share2, MessageCircle, Twitter, Send, Globe, Heart, ThumbsUp, ThumbsDown } from 'lucide-react';

type Social = { platform?: string; handle?: string };
type Pair = {
  chainId?: string; dexId?: string; pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { symbol?: string };
  priceUsd?: string; priceChange?: { h24?: number }; volume?: { h24?: number };
  liquidity?: { usd?: number }; fdv?: number; pairCreatedAt?: number; url?: string;
  info?: { socials?: Social[]; websites?: { url?: string }[]; imageUrl?: string };
  boosts?: { active?: number };
};

const money = (v?: number) => v == null || !Number.isFinite(v) ? '—' : v >= 1e9 ? '$' + (v / 1e9).toFixed(2) + 'B' : v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : '$' + v.toFixed(2);
const price = (v?: string) => { const n = Number(v); if (!Number.isFinite(n) || !n) return '—'; return n < 0.01 ? '$' + n.toPrecision(3) : n < 1 ? '$' + n.toFixed(4) : '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 }); };
const short = (s?: string) => s ? s.length > 13 ? s.slice(0, 6) + '…' + s.slice(-4) : s : '—';
const chains = ['All chains', 'Solana', 'Ethereum', 'Base', 'BNB Chain', 'Arbitrum', 'Polygon'];

function socialScore(p: Pair): number {
  const socials = p.info?.socials?.length || 0;
  const webs = p.info?.websites?.length || 0;
  const boost = Math.min(p.boosts?.active || 0, 5);
  const hasX = p.info?.socials?.some(s => /twitter|x/i.test(s.platform || '')) ? 15 : 0;
  const hasTg = p.info?.socials?.some(s => /telegram|tg/i.test(s.platform || '')) ? 15 : 0;
  return Math.min(100, socials * 12 + webs * 8 + boost * 6 + hasX + hasTg);
}

function SocialIcons({ pair }: { pair: Pair }) {
  const socials = pair.info?.socials || [];
  const sites = pair.info?.websites || [];
  if (!socials.length && !sites.length) return <span className="muted">—</span>;
  return (
    <div className="social-icons">
      {socials.slice(0, 4).map((s, i) => {
        const plat = (s.platform || '').toLowerCase();
        const href = plat.includes('twitter') || plat.includes('x') ? `https://x.com/${s.handle}` :
          plat.includes('telegram') || plat.includes('tg') ? `https://t.me/${s.handle}` :
          plat.includes('discord') ? `https://discord.gg/${s.handle}` : '#';
        const Icon = plat.includes('twitter') || plat.includes('x') ? Twitter :
          plat.includes('telegram') || plat.includes('tg') ? Send :
          plat.includes('discord') ? MessageCircle : Globe;
        return <a key={i} href={href} target="_blank" rel="noreferrer" className="social-icon" title={s.platform}>{<Icon size={14} />}</a>;
      })}
      {sites.slice(0, 2).map((w, i) => <a key={'w' + i} href={w.url} target="_blank" rel="noreferrer" className="social-icon" title="Website"><Globe size={14} /></a>)}
    </div>
  );
}

export default function Home() {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [search, setSearch] = useState('');
  const [queryResults, setQueryResults] = useState<Pair[] | null>(null);
  const [chain, setChain] = useState('All chains');
  const [tab, setTab] = useState('Discover');
  const [saved, setSaved] = useState<string[]>([]);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [showSaved, setShowSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [socialFeed, setSocialFeed] = useState<any[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [selected, setSelected] = useState<Pair | null>(null);

  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem('degenos-watchlist') || '[]'));
      setReactions(JSON.parse(localStorage.getItem('degenos-reactions') || '{}'));
    } catch {}
    fetch('/api/markets').then(r => r.json()).then(j => { setPairs(j.data || []); setNotice(j.notice || ''); }).catch(() => setNotice('Market data unavailable.')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'Social' || socialFeed.length) return;
    setSocialLoading(true);
    fetch('/api/social').then(r => r.json()).then(j => setSocialFeed(j.socialFeed || [])).catch(() => {}).finally(() => setSocialLoading(false));
  }, [tab]);

  useEffect(() => {
    if (search.trim().length < 2) { setQueryResults(null); return; }
    const id = setTimeout(() => fetch('/api/search?q=' + encodeURIComponent(search.trim())).then(r => r.json()).then(j => setQueryResults(j.pairs || [])).catch(() => setQueryResults([])), 350);
    return () => clearTimeout(id);
  }, [search]);

  const visible = useMemo(() => {
    let src = queryResults ?? pairs;
    if (chain !== 'All chains') src = src.filter(p => (p.chainId || '').toLowerCase() === chain.toLowerCase().replace(' chain', ''));
    if (showSaved || tab === 'Watchlist') src = src.filter(p => saved.includes((p.chainId || '') + ':' + (p.pairAddress || p.baseToken?.address || '')));
    return src;
  }, [pairs, queryResults, chain, showSaved, tab, saved]);

  const toggle = (p: Pair) => {
    const k = (p.chainId || '') + ':' + (p.pairAddress || p.baseToken?.address || '');
    setSaved(old => {
      const n = old.includes(k) ? old.filter(x => x !== k) : [...old, k];
      localStorage.setItem('degenos-watchlist', JSON.stringify(n));
      return n;
    });
  };

  const react = (p: Pair, type: string) => {
    const k = (p.chainId || '') + ':' + (p.pairAddress || p.baseToken?.address || '');
    setReactions(old => {
      const n = { ...old, [k]: old[k] === type ? '' : type };
      localStorage.setItem('degenos-reactions', JSON.stringify(n));
      return n;
    });
  };

  const share = async (p: Pair) => {
    const text = `${p.baseToken?.symbol || 'Token'} on ${p.chainId || 'chain'} — $${p.priceUsd || '?'} | DegenOS research`;
    const url = p.url || `https://dexscreener.com/${p.chainId}/${p.pairAddress || p.baseToken?.address}`;
    if (navigator.share) {
      try { await navigator.share({ title: text, text, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setNotice('Share text + link copied to clipboard');
  };

  const nav = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'Discover', icon: Search },
    { name: 'Social', icon: Sparkles },
    { name: 'Watchlist', icon: Bookmark },
    { name: 'Risk scanner', icon: ShieldCheck },
    { name: 'Alerts', icon: Bell },
  ];

  const fmtAge = (n?: number) => !n ? '—' : Math.max(0, Math.floor((Date.now() - n) / 86400000)) + 'd';

  return (
    <main className="app-shell">
      <aside className={'sidebar ' + (mobileNav ? 'sidebar-open' : '')}>
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 48 48" aria-label="DegenOS bull shield"><path d="M24 3 43 11v15L24 45 5 26V11Z" fill="#09130c" stroke="#72ff35" strokeWidth="1.7"/><path d="M11 12 7 5l10 6M37 12l4-7-10 6" fill="none" stroke="#baff9b" strokeWidth="2.5" strokeLinecap="round"/><path d="M13 18 19 16 24 21 29 16 35 18 32 31 24 37 16 31Z" fill="#121d15" stroke="#a4ff77" strokeWidth="1.4"/><path d="M16 23 21 24M32 23 27 24" stroke="#79ff38" strokeWidth="3" strokeLinecap="round"/><path d="M20 30h8l-4 3Z" fill="#a4ff77"/></svg>
          </div>
          <div><div className="brand-name">DEGEN<span>OS</span></div><div className="brand-sub">ON-CHAIN INTELLIGENCE</div></div>
          <button className="icon-btn close-mobile" onClick={() => setMobileNav(false)}><X size={18}/></button>
        </div>
        <div className="workspace-label">WORKSPACE <ChevronDown size={13}/></div>
        <div className="workspace-card"><div className="workspace-icon"><Command size={16}/></div><div><strong>Research terminal</strong><small>Personal workspace</small></div><span className="online-dot"/></div>
        <div className="nav-label">TERMINAL</div>
        <nav>{nav.map(n => (
          <button key={n.name} onClick={() => { setTab(n.name); setShowSaved(n.name === 'Watchlist'); setMobileNav(false); }} className={'nav-item ' + (tab === n.name ? 'active' : '')}>
            <n.icon size={17}/><span>{n.name}</span>{n.name === 'Alerts' && <span className="nav-tag">SOON</span>}
          </button>
        ))}</nav>
        <div className="nav-label tools-label">TOOLS</div>
        <button className="nav-item" onClick={() => setTab('Risk scanner')}><Gauge size={17}/><span>Token risk checks</span></button>
        <button className="nav-item" onClick={() => setTab('Discover')}><Globe2 size={17}/><span>Chain explorer</span><ExternalLink size={12} className="nav-ext"/></button>
        <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-icon"><Zap size={15}/></div>
            <div><strong>DEGEN PASS</strong><small>Research smarter.</small></div>
            <span className="plan-pill">BETA</span>
            <p>Premium access passes are being prepared.</p>
            <button onClick={() => setNotice('Pass checkout is not connected yet. No payment has been taken.')}>Explore plans <span>↗</span></button>
          </div>
          <div className="user-row">
            <div className="avatar">D</div>
            <div><strong>Guest researcher</strong><small>Local session</small></div>
            <button className="icon-btn" title="Account information" onClick={() => setNotice('Guest mode: watchlist & reactions saved on this device only. Secure accounts are not enabled yet.')}><CircleHelp size={16}/></button>
          </div>
        </div>
      </aside>
      {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close menu"/>}
      <section className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)}><Menu size={19}/></button>
          <div className="breadcrumbs">Workspace <span>/</span> <strong>{tab}</strong></div>
          <div className="top-actions">
            <div className="system-status"><span className="online-dot"/> SYSTEM OPERATIONAL</div>
            <button className="icon-btn" onClick={() => setNotice('Alerts are planned for a later release. Threshold notifications are not active yet.')} aria-label="Notifications"><Bell size={17}/></button>
            <div className="top-avatar">D</div>
          </div>
        </header>
        <div className="content">
          <div className="hero-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line"/> DEGENOS TERMINAL <span className="beta-tag">PUBLIC BETA</span></div>
              <h1>Find the signal.<br/><span>Check the risk.</span></h1>
              <p className="hero-copy">Your edge starts with better information. Discover tokens, inspect market activity, track social utility, and keep your watchlist close.</p>
            </div>
            <div className="hero-emblem">
              <div className="emblem-glow"/>
              <img className="hero-logo-image" src="/bull-shield-logo.jpeg" alt="DegenOS neon bull shield emblem"/>
              <svg className="fallback-emblem" viewBox="0 0 180 180" role="img" aria-label="DegenOS neon bull shield"><path d="M90 9 159 36v55c0 34-27 61-69 80C48 152 21 125 21 91V36Z" fill="#0b100c" stroke="#71ff32" strokeWidth="2.5"/><path d="M56 48 43 25l27 19M124 48l13-23-27 19" fill="none" stroke="#c4ffae" strokeWidth="7" strokeLinejoin="round"/><path d="M48 62 75 57 90 71 105 57 132 62 123 101 90 130 57 101Z" fill="#151d17" stroke="#9cff71" strokeWidth="2"/><path d="M61 80 79 84M119 80 101 84" stroke="#79ff3d" strokeWidth="6" strokeLinecap="round"/><path d="M75 104h30L90 117Z" fill="#9cff71"/><path d="M90 11v157" stroke="#72ff35" strokeOpacity=".12"/></svg>
              <div className="emblem-label">BUILT FOR THE ON-CHAIN EDGE</div>
            </div>
          </div>
          {notice && <div className="notice"><CircleHelp size={16}/><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-top"><span>TRACKED PAIRS</span><Activity size={15}/></div><div className="stat-number">{loading ? '—' : pairs.length.toString().padStart(2, '0')}<span className="stat-unit"> LIVE FEED</span></div><div className="stat-foot"><span className="mini-dot"/> Market discovery feed</div></div>
            <div className="stat-card"><div className="stat-top"><span>WATCHLIST</span><Bookmark size={15}/></div><div className="stat-number">{saved.length.toString().padStart(2, '0')}<span className="stat-unit"> SAVED</span></div><div className="stat-foot">Saved on this device</div></div>
            <div className="stat-card"><div className="stat-top"><span>SOCIAL UTILITY</span><Sparkles size={15}/></div><div className="stat-number">Live<span className="stat-unit"> SIGNALS</span></div><div className="stat-foot">Profiles + boosts</div></div>
            <div className="stat-card"><div className="stat-top"><span>SUPPORTED CHAINS</span><Globe2 size={15}/></div><div className="stat-number">Multi<span className="stat-unit"> CHAIN</span></div><div className="stat-foot">Coverage depends on provider</div></div>
          </div>

          {tab === 'Social' ? (
            <div className="section-heading"><div><div className="eyebrow small"><span className="eyebrow-line"/> SOCIAL INTELLIGENCE</div><h2>Community & profile feed</h2><p>Latest token profiles and social presence from DexScreener. Social links are community-provided and unverified.</p></div></div>
          ) : (
            <div className="section-heading"><div><div className="eyebrow small"><span className="eyebrow-line"/> MARKET INTELLIGENCE</div><h2>{tab === 'Watchlist' ? 'Your watchlist' : tab === 'Risk scanner' ? 'Token risk scanner' : 'Token discovery'}</h2><p>Explore market pairs, social utility scores, and on-chain signals.</p></div><div className="live-pill"><span className="online-dot"/> {loading ? 'CONNECTING' : 'PROVIDER FEED'} <span className="live-sep">·</span> {loading ? '—' : '45S CACHE'}</div></div>
          )}

          {tab !== 'Social' && (
            <>
              <div className="toolbar">
                <div className="search-wrap"><Search size={17}/><input placeholder="Search token, symbol or address…" value={search} onChange={e => setSearch(e.target.value)}/></div>
                <div className="filters">
                  <div className="select-wrap"><Filter size={14}/><select value={chain} onChange={e => setChain(e.target.value)}>{chains.map(c => <option key={c}>{c}</option>)}</select><ChevronDown size={14}/></div>
                  <button className={'filter-btn ' + (showSaved ? 'active' : '')} onClick={() => setShowSaved(s => !s)}><Bookmark size={14}/> Watchlist</button>
                </div>
              </div>
              <div className="table-card">
                <div className="table-top"><div><span className="table-label">PAIRS</span><span className="table-count">{visible.length}</span></div><div className="table-source">DexScreener · cached</div></div>
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>ASSET / PAIR</th><th>PRICE</th><th>24H</th><th>VOLUME</th><th>LIQ</th><th>SOCIAL</th><th>SCORE</th><th></th></tr></thead>
                    <tbody>
                      {visible.slice(0, 40).map((p, i) => {
                        const k = (p.chainId || '') + ':' + (p.pairAddress || p.baseToken?.address || '');
                        const chg = p.priceChange?.h24;
                        const score = socialScore(p);
                        return (
                          <tr key={k + i} onClick={() => setSelected(p)} className="row-click">
                            <td><div className="asset-cell"><div className="asset-icon">{(p.baseToken?.symbol || '?')[0]}</div><div><strong>{p.baseToken?.symbol || '—'}</strong><small>{p.chainId} · {short(p.pairAddress)}</small></div></div></td>
                            <td>{price(p.priceUsd)}</td>
                            <td className={chg != null && chg >= 0 ? 'up' : 'down'}>{chg != null ? (chg >= 0 ? '+' : '') + chg.toFixed(1) + '%' : '—'}</td>
                            <td>{money(p.volume?.h24)}</td>
                            <td>{money(p.liquidity?.usd)}</td>
                            <td><SocialIcons pair={p}/></td>
                            <td><div className="score-pill" style={{ opacity: 0.6 + score / 250 }}>{score}</div></td>
                            <td className="actions-cell">
                              <button className="icon-btn tiny" onClick={e => { e.stopPropagation(); toggle(p); }} title="Watchlist"><Bookmark size={14} fill={saved.includes(k) ? 'currentColor' : 'none'}/></button>
                              <button className="icon-btn tiny" onClick={e => { e.stopPropagation(); share(p); }} title="Share"><Share2 size={14}/></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="table-bottom"><span>Data provided by <a href="https://docs.dexscreener.com" target="_blank" rel="noreferrer">DexScreener</a></span><span>Social scores are informational only</span></div>
              </div>
            </>
          )}

          {tab === 'Social' && (
            <div className="social-grid">
              {socialLoading && <div className="notice">Loading social profiles…</div>}
              {!socialLoading && socialFeed.length === 0 && <div className="notice">No recent profiles available.</div>}
              {socialFeed.map((item, i) => (
                <div key={i} className="social-card">
                  <div className="social-card-head">
                    {item.icon && <img src={item.icon} alt="" className="social-card-icon"/>}
                    <div><strong>{item.chainId}</strong><small>{short(item.tokenAddress)}</small></div>
                  </div>
                  {item.description && <p className="social-desc">{item.description.slice(0, 180)}{item.description.length > 180 ? '…' : ''}</p>}
                  <div className="social-links">
                    {(item.links || []).slice(0, 5).map((l: any, j: number) => (
                      <a key={j} href={l.url} target="_blank" rel="noreferrer" className="social-link-pill">{l.label || l.type || 'Link'}</a>
                    ))}
                  </div>
                  {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="social-view">View on DexScreener →</a>}
                </div>
              ))}
            </div>
          )}

          <div className="bottom-grid">
            <div className="feature-card"><div className="feature-icon green"><Sparkles size={18}/></div><div><h3>Social utility scores.</h3><p>Tokens are scored on social presence (X, Telegram, websites, boosts). Higher scores mean richer community signals — not safety.</p><button onClick={() => setTab('Social')}>Open social feed <span>→</span></button></div></div>
            <div className="feature-card"><div className="feature-icon purple"><Share2 size={18}/></div><div><h3>Share research instantly.</h3><p>Copy or native-share any pair with price and DexScreener link. Your local reactions stay private on this device.</p><button onClick={() => setNotice('Select a token and use the share button in the table.')}>How sharing works <span>→</span></button></div></div>
          </div>

          <footer>
            <div><span className="footer-brand">DEGEN<span>OS</span></span><span className="footer-sep">·</span> Find the signal. Check the risk.</div>
            <div className="footer-right"><span><span className="online-dot"/> PUBLIC BETA</span><a href="https://github.com/RoninGrk1/DegenOS" target="_blank" rel="noreferrer">SOURCE CODE <ExternalLink size={11}/></a></div>
          </footer>
          <div className="disclaimer"><ShieldAlert size={14}/><span><strong>Not financial advice.</strong> Market data and social scores are informational and may be inaccurate, stale, or incomplete. Token risk checks cannot prove safety. DegenOS does not execute trades or custody assets.</span></div>
        </div>
      </section>

      {selected && (
        <div className="detail-overlay" onClick={() => setSelected(null)}>
          <div className="detail-panel" onClick={e => e.stopPropagation()}>
            <div className="detail-head">
              <div><strong>{selected.baseToken?.symbol}</strong> <small>{selected.chainId}</small></div>
              <button className="icon-btn" onClick={() => setSelected(null)}><X size={16}/></button>
            </div>
            <div className="detail-price">{price(selected.priceUsd)} <span className={selected.priceChange?.h24 != null && selected.priceChange.h24 >= 0 ? 'up' : 'down'}>{selected.priceChange?.h24 != null ? (selected.priceChange.h24 >= 0 ? '+' : '') + selected.priceChange.h24.toFixed(1) + '%' : ''}</span></div>
            <div className="detail-stats">
              <div><span>Volume 24h</span><strong>{money(selected.volume?.h24)}</strong></div>
              <div><span>Liquidity</span><strong>{money(selected.liquidity?.usd)}</strong></div>
              <div><span>Social score</span><strong>{socialScore(selected)}</strong></div>
            </div>
            <div className="detail-social"><SocialIcons pair={selected}/></div>
            <div className="detail-actions">
              <button onClick={() => toggle(selected)} className="detail-btn"><Bookmark size={14}/> {saved.includes((selected.chainId || '') + ':' + (selected.pairAddress || selected.baseToken?.address || '')) ? 'Saved' : 'Watch'}</button>
              <button onClick={() => share(selected)} className="detail-btn"><Share2 size={14}/> Share</button>
              <button onClick={() => react(selected, 'bull')} className={'detail-btn ' + (reactions[(selected.chainId || '') + ':' + (selected.pairAddress || selected.baseToken?.address || '')] === 'bull' ? 'active' : '')}><ThumbsUp size={14}/> Bull</button>
              <button onClick={() => react(selected, 'bear')} className={'detail-btn ' + (reactions[(selected.chainId || '') + ':' + (selected.pairAddress || selected.baseToken?.address || '')] === 'bear' ? 'active' : '')}><ThumbsDown size={14}/> Bear</button>
            </div>
            {selected.url && <a href={selected.url} target="_blank" rel="noreferrer" className="detail-link">Open on DexScreener →</a>}
          </div>
        </div>
      )}
    </main>
  );
}
