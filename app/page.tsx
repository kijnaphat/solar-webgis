'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Map, ArrowRight, Zap, Leaf, Satellite, Database, Layers,
  BrainCircuit, Building2, Landmark, SunMedium, ChevronRight,
  TrendingUp, Target, ShieldCheck, Cpu, BarChart3, CheckCircle2,
  ScanSearch, Star, TreePine, Car, DollarSign, Wind, Plus, Minus,
  Globe2, Award, Clock, Sparkles, Download, Eye, Zap as ZapIcon,
  MousePointer, Activity, GitBranch, LayoutGrid, FileJson, Workflow
} from 'lucide-react';

/* ═══════════════════════════════════════
   HOOKS
═══════════════════════════════════════ */
function useScroll() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const h = () => setY(window.scrollY);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return y;
}

function useInView(opts = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect(); }
    }, { threshold: 0.12, ...opts });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, vis };
}

/* ═══════════════════════════════════════
   PRIMITIVES
═══════════════════════════════════════ */

function Reveal({
  children, delay = 0, y = 28, scale = false, className = '',
}: {
  children: React.ReactNode; delay?: number; y?: number; scale?: boolean; className?: string;
}) {
  const { ref, vis } = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: vis ? 1 : 0,
      transform: vis
        ? 'none'
        : `translateY(${y}px)${scale ? ' scale(0.96)' : ''}`,
      transition: `opacity 1s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 1s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }}>{children}</div>
  );
}

function Count({ to, suffix = '', prefix = '', decimals = 0 }: {
  to: number; suffix?: string; prefix?: string; decimals?: number;
}) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let v = 0; const step = to / 60;
      const t = setInterval(() => {
        v += step; if (v >= to) { setN(to); clearInterval(t); } else setN(v);
      }, 16);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{prefix}{decimals > 0 ? n.toFixed(decimals) : Math.floor(n).toLocaleString()}{suffix}</span>;
}

function Chip({ children, color = '#0071e3', bg }: { children: React.ReactNode; color?: string; bg?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '5px 13px', borderRadius: 980,
      background: bg || `${color}0d`,
      border: `1px solid ${color}25`,
      fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500,
      letterSpacing: '0.13em', textTransform: 'uppercase' as const, color,
    }}>{children}</span>
  );
}

function LiveBadge() {
  return (
    <Chip color="#1d8348" bg="#eafaf1">
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1d8348', animation: 'pulse 2s infinite', display: 'inline-block' }} />
      System Live
    </Chip>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #d2d2d7 20%, #d2d2d7 80%, transparent)' }} />;
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #e5e5e7' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '22px 0', background: 'none',
        border: 'none', cursor: 'pointer', textAlign: 'left', gap: 20,
      }}>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 17, fontWeight: 500, color: '#1d1d1f', lineHeight: 1.4 }}>{q}</span>
        <span style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: open ? '#1d1d1f' : '#f5f5f7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
        }}>
          {open ? <Minus style={{ width: 12, height: 12, color: '#fff' }} />
                : <Plus  style={{ width: 12, height: 12, color: '#6e6e73' }} />}
        </span>
      </button>
      <div style={{ maxHeight: open ? 320 : 0, overflow: 'hidden', transition: 'max-height 0.45s ease' }}>
        <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: '#6e6e73', lineHeight: 1.8, paddingBottom: 22 }}>{a}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   PAGE
═══════════════════════════════════════ */
export default function HomePage() {
  const scrollY = useScroll();
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <>
      {/* ── Global Styles ─────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

        :root {
          --display: 'Bricolage Grotesque', -apple-system, sans-serif;
          --sans:    'Geist', -apple-system, sans-serif;
          --mono:    'Geist Mono', monospace;
          --blue:    #0071e3;
          --blue-d:  #0062c6;
          --green:   #1d8348;
          --green-l: #eafaf1;
          --ink:     #1d1d1f;
          --sub:     #6e6e73;
          --border:  #d2d2d7;
          --bg:      #ffffff;
          --bg2:     #f5f5f7;
          --bg3:     #fbfbfd;
          --r16:     16px;
          --r20:     20px;
          --r28:     28px;
        }

        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
        html { scroll-behavior:smooth; -webkit-font-smoothing:antialiased; }
        body { background:var(--bg); color:var(--ink); font-family:var(--sans); overflow-x:hidden; }
        ::selection { background:rgba(0,113,227,.14); }
        a { text-decoration:none; color:inherit; }

        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes scanL   { 0%{top:-2px} 100%{top:102%} }
        @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
        @keyframes shimmer { 0%{background-position:200% 50%} 100%{background-position:-200% 50%} }
        @keyframes glow    { 0%,100%{opacity:.6} 50%{opacity:1} }

        /* Nav link */
        .nl {
          font-family:var(--sans); font-size:14px; font-weight:500; color:var(--sub);
          padding:6px 12px; border-radius:980px; transition:all .18s;
        }
        .nl:hover { color:var(--ink); background:rgba(0,0,0,.05); }

        /* Buttons */
        .btn-primary {
          display:inline-flex; align-items:center; gap:8px;
          padding:14px 24px; border-radius:980px;
          background:var(--blue); color:#fff;
          font-family:var(--sans); font-size:15px; font-weight:600;
          border:none; cursor:pointer;
          box-shadow:0 1px 2px rgba(0,113,227,.2), 0 4px 16px rgba(0,113,227,.18);
          transition:all .22s; white-space:nowrap;
        }
        .btn-primary:hover { background:var(--blue-d); transform:translateY(-1px); box-shadow:0 2px 4px rgba(0,113,227,.25), 0 8px 28px rgba(0,113,227,.25); }
        .btn-primary:active { transform:scale(.98); }

        .btn-secondary {
          display:inline-flex; align-items:center; gap:6px;
          font-family:var(--sans); font-size:15px; font-weight:500; color:var(--blue);
          background:none; border:none; cursor:pointer; transition:opacity .2s;
        }
        .btn-secondary:hover { opacity:.75; }
        .btn-secondary .arr { transition:transform .2s; }
        .btn-secondary:hover .arr { transform:translateX(3px); }

        /* Card hover */
        .card-lift { transition:transform .3s ease, box-shadow .3s ease, border-color .3s ease; }
        .card-lift:hover { transform:translateY(-5px); box-shadow:0 20px 56px rgba(0,0,0,.1) !important; border-color:rgba(0,0,0,.14) !important; }

        /* Bento */
        .bento { border-radius:var(--r20); overflow:hidden; transition:transform .3s ease, box-shadow .3s ease; }
        .bento:hover { transform:translateY(-3px); box-shadow:0 16px 48px rgba(0,0,0,.09); }

        /* Shimmer skeleton */
        .shimmer-text {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%);
          background-size: 400% 100%;
          animation: shimmer 1.5s ease infinite;
          border-radius: 4px; color: transparent;
        }

        /* Grid underlay */
        .dot-grid {
          background-image: radial-gradient(circle, rgba(0,0,0,.06) 1px, transparent 1px);
          background-size: 22px 22px;
        }

        /* Step line */
        .step-line { position:absolute; left:20px; top:46px; bottom:-28px; width:1px; background:var(--border); }

        /* Dark section */
        .section-dark { background:#1d1d1f; color:#f5f5f7; }
        .section-dark .sub { color:#86868b !important; }

        /* Scrollbar */
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-thumb { background:#d2d2d7; border-radius:3px; }
      `}</style>

      {/* ══════════════════ NAVBAR ══════════════════ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 1000,
        background: scrollY > 6 ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0)',
        backdropFilter: scrollY > 6 ? 'saturate(180%) blur(24px)' : 'none',
        borderBottom: `1px solid ${scrollY > 6 ? 'rgba(0,0,0,0.08)' : 'transparent'}`,
        transition: 'all .4s ease',
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,.18)',
            }}>
              <Zap style={{ width: 15, height: 15, color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.018em', lineHeight: 1 }}>GeoAI Vision</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--sub)', letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 1 }}>by SWU</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display: 'flex', gap: 2 }}>
            {[['Pipeline','#pipeline'],['Technology','#tech'],['ESG','#esg'],['FAQ','#faq']].map(([l,h]) => (
              <a key={l} href={h} className="nl">{l}</a>
            ))}
          </nav>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <LiveBadge />
            <Link href="/dashboard">
              <button className="btn-primary" style={{ padding: '9px 20px', fontSize: 13 }}>
                Open Dashboard
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════════════ HERO ══════════════════ */}
      <section style={{ textAlign: 'center', padding: '108px 24px 0', position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Radial bg */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(0,113,227,.07) 0%, transparent 70%)',
        }} />
        {/* Dot grid */}
        <div className="dot-grid" style={{ position: 'absolute', inset: 0, opacity: .55, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 920, width: '100%' }}>

          {/* Badge */}
          <div style={{ animation: 'fadeUp .7s cubic-bezier(.16,1,.3,1) both', display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '7px 18px', borderRadius: 980,
              background: '#fff', border: '1px solid rgba(0,0,0,.09)',
              boxShadow: '0 1px 6px rgba(0,0,0,.07)',
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--sub)', letterSpacing: '.12em',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1d8348', animation: 'pulse 2s infinite', display: 'inline-block' }} />
              SWU Research Lab · YOLOv8 Segmentation Engine Active
            </div>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'var(--display)',
            fontSize: 'clamp(52px, 8.5vw, 100px)',
            fontWeight: 800,
            letterSpacing: '-.04em',
            lineHeight: .98,
            color: 'var(--ink)',
            animation: 'fadeUp .85s cubic-bezier(.16,1,.3,1) .06s both',
            marginBottom: 28,
          }}>
            See every rooftop.<br />
            <span style={{
              background: 'linear-gradient(135deg, #0071e3 0%, #34aadc 50%, #5ac8fa 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              display: 'inline-block',
            }}>Unlock solar potential.</span>
          </h1>

          {/* Sub */}
          <p style={{
            fontFamily: 'var(--sans)', fontSize: 20, color: 'var(--sub)',
            lineHeight: 1.6, maxWidth: 560, margin: '0 auto 44px',
            animation: 'fadeUp .85s cubic-bezier(.16,1,.3,1) .13s both',
            fontWeight: 400,
          }}>
            Upload a satellite image. Our AI engine detects every rooftop panel,
            models financial returns, and exports precision GeoJSON — in under 60 seconds.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 72, animation: 'fadeUp .85s cubic-bezier(.16,1,.3,1) .22s both' }}>
            <Link href="/dashboard">
              <button className="btn-primary" style={{ fontSize: 17, padding: '16px 34px' }}>
                <Map style={{ width: 18, height: 18 }} />
                Explore Interactive Map
                <ArrowRight style={{ width: 17, height: 17 }} />
              </button>
            </Link>
            <a href="#pipeline">
              <button className="btn-secondary" style={{ fontSize: 17 }}>
                See how it works <ChevronRight className="arr" style={{ width: 17, height: 17 }} />
              </button>
            </a>
          </div>

          {/* Hero mockup */}
          <div style={{ animation: 'scaleIn 1.1s cubic-bezier(.16,1,.3,1) .28s both', position: 'relative' }}>
            {/* Soft shadow halo */}
            <div style={{
              position: 'absolute', bottom: -60, left: '8%', right: '8%', height: 120,
              borderRadius: '50%', filter: 'blur(50px)',
              background: 'rgba(0,113,227,.12)', pointerEvents: 'none',
            }} />

            <div style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,.08)',
              borderRadius: 28,
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0,0,0,.04), 0 16px 48px rgba(0,0,0,.1), 0 48px 80px rgba(0,0,0,.06)',
              textAlign: 'left',
            }}>
              {/* Browser chrome */}
              <div style={{ background: '#f5f5f7', padding: '13px 20px', borderBottom: '1px solid rgba(0,0,0,.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
                </div>
                <div style={{ flex: 1, background: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: 7, padding: '5px 14px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--sub)' }}>
                  geoai.swu.ac.th/dashboard
                </div>
                <LiveBadge />
              </div>

              {/* Map + sidebar */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', minHeight: 320 }}>
                {/* Map */}
                <div style={{ position: 'relative', background: '#eef0f2', overflow: 'hidden', borderRight: '1px solid rgba(0,0,0,.06)' }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(0,0,0,.04) 1px, transparent 1px), linear-gradient(90deg,rgba(0,0,0,.04) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                  }} />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(ellipse at 48% 50%, rgba(0,113,227,.07) 0%, transparent 60%)',
                  }} />

                  {/* Scan ring */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '46%',
                    transform: 'translate(-50%,-50%)',
                    width: 140, height: 140, borderRadius: '50%',
                    border: '1.5px dashed rgba(0,113,227,.22)',
                    animation: 'spin 18s linear infinite',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: 86, height: 86, borderRadius: '50%',
                      border: '1px solid rgba(0,113,227,.12)', background: 'rgba(255,255,255,.6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backdropFilter: 'blur(4px)',
                    }}>
                      <Target style={{ width: 30, height: 30, color: '#0071e3' }} />
                    </div>
                  </div>

                  {/* Panels */}
                  {[
                    { t:'12%',l:'8%',  w:54,h:32,c:'#0071e3',conf:96 },
                    { t:'25%',l:'28%', w:72,h:42,c:'#0071e3',conf:91 },
                    { t:'57%',l:'7%',  w:58,h:34,c:'#ff9f0a',conf:74 },
                    { t:'62%',l:'58%', w:44,h:27,c:'#0071e3',conf:89 },
                    { t:'11%',l:'66%', w:50,h:30,c:'#ff9f0a',conf:68 },
                    { t:'44%',l:'73%', w:38,h:23,c:'#0071e3',conf:93 },
                    { t:'72%',l:'36%', w:48,h:29,c:'#0071e3',conf:87 },
                  ].map((p, i) => (
                    <div key={i} style={{
                      position: 'absolute', top: p.t, left: p.l,
                      width: p.w, height: p.h,
                      background: `${p.c}12`, border: `1.5px solid ${p.c}65`, borderRadius: 4,
                    }}>
                      <div style={{
                        position: 'absolute', top: -17, left: 0,
                        background: '#fff', border: `1px solid ${p.c}40`, borderRadius: 4,
                        padding: '1px 5px', fontFamily: 'var(--mono)', fontSize: 8, color: p.c,
                        boxShadow: '0 1px 4px rgba(0,0,0,.08)',
                      }}>{p.conf}%</div>
                    </div>
                  ))}

                  {/* Scanline */}
                  <div style={{
                    position: 'absolute', left: 0, right: 0, height: 1.5,
                    background: 'linear-gradient(90deg, transparent, rgba(0,113,227,.5) 30%, rgba(0,113,227,.5) 70%, transparent)',
                    animation: 'scanL 4.5s linear infinite',
                  }} />

                  {/* HUD chip bottom-left */}
                  <div style={{
                    position: 'absolute', bottom: 12, left: 12,
                    background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(0,0,0,.09)', borderRadius: 8,
                    padding: '6px 11px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--sub)',
                    boxShadow: '0 2px 8px rgba(0,0,0,.07)',
                  }}>YOLOv8-SEG · 7 PANELS · EPSG:32647</div>

                  {/* Floating accuracy chip top-right */}
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(0,0,0,.09)', borderRadius: 8,
                    padding: '6px 11px', fontFamily: 'var(--mono)', fontSize: 9, color: '#1d8348',
                    boxShadow: '0 2px 8px rgba(0,0,0,.07)', display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1d8348', animation: 'pulse 2s infinite', display: 'inline-block' }} />
                    94.0% CONF
                  </div>
                </div>

                {/* Sidebar */}
                <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {[
                    { l:'Detections', v:'1,248', c:'var(--ink)', big: true },
                    { l:'ROI / year',  v:'฿4.2M', c:'var(--green)', big: true },
                    { l:'AI Confidence', v:'94.0%', c:'var(--blue)', bar: 94 },
                  ].map(s => (
                    <div key={s.l}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--sub)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 5 }}>{s.l}</div>
                      <div style={{ fontFamily: 'var(--display)', fontSize: s.big ? 30 : 22, fontWeight: 800, letterSpacing: '-.025em', color: s.c, lineHeight: 1 }}>{s.v}</div>
                      {s.bar && (
                        <div style={{ height: 3, background: 'var(--bg2)', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
                          <div style={{ height: '100%', width: `${s.bar}%`, background: 'var(--blue)', borderRadius: 2 }} />
                        </div>
                      )}
                    </div>
                  ))}

                  <div style={{
                    marginTop: 'auto', padding: '16px 16px', borderRadius: 14,
                    background: 'linear-gradient(135deg, #eafaf1 0%, #d5f5e3 100%)',
                    border: '1px solid rgba(29,131,72,.15)',
                  }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--green)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 5 }}>Site Grade</div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 44, fontWeight: 900, letterSpacing: '-.04em', color: 'var(--green)', lineHeight: 1 }}>A+</div>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: '#2e7d4f', marginTop: 3 }}>Highly Suitable</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge — AI speed */}
            <div style={{
              position: 'absolute', top: -14, right: -18,
              background: '#fff', border: '1px solid rgba(0,0,0,.09)',
              borderRadius: 14, padding: '10px 16px',
              boxShadow: '0 4px 20px rgba(0,0,0,.1)',
              display: 'flex', alignItems: 'center', gap: 10,
              animation: 'float 4s ease-in-out infinite',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: '#eef4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Cpu style={{ width: 15, height: 15, color: 'var(--blue)' }} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--sub)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Processing</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--ink)' }}>48 sec avg.</div>
              </div>
            </div>

            {/* Floating badge — IoU */}
            <div style={{
              position: 'absolute', bottom: 60, left: -22,
              background: '#fff', border: '1px solid rgba(0,0,0,.09)',
              borderRadius: 14, padding: '10px 16px',
              boxShadow: '0 4px 20px rgba(0,0,0,.1)',
              display: 'flex', alignItems: 'center', gap: 10,
              animation: 'float 5s ease-in-out 1.5s infinite',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: '#fff8ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award style={{ width: 15, height: 15, color: '#ff9f0a' }} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--sub)', letterSpacing: '.1em', textTransform: 'uppercase' }}>IoU Score</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--ink)' }}>0.854</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ marginTop: 52, marginBottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: scrollY > 20 ? 0 : 1, transition: 'opacity .5s' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--sub)', letterSpacing: '.2em', textTransform: 'uppercase' }}>Scroll</div>
          <div style={{ width: 1, height: 28, background: 'linear-gradient(to bottom, var(--border), transparent)' }} />
        </div>
      </section>

      {/* ══════════════════ METRICS ══════════════════ */}
      <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[
            { to: 1248,  s: '',   label: 'Panels Detected',  note: 'and counting' },
            { to: 85200, s: '',   label: 'Usable Area m²',   note: 'total mapped' },
            { to: 85000, s: '',   label: 'CO₂ Offset kg',    note: 'annually' },
            { to: 94,    s: '%',  label: 'AI mAP Accuracy',  note: 'YOLOv8 + U-Net' },
          ].map((s, i, arr) => (
            <Reveal key={s.label} delay={i * 55}>
              <div style={{
                padding: '48px 28px', textAlign: 'center',
                borderRight: i < arr.length-1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 56, fontWeight: 800, letterSpacing: '-.04em', color: 'var(--ink)', lineHeight: 1, marginBottom: 8 }}>
                  <Count to={s.to} suffix={s.s} />
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--sub)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{s.note}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════════════ BENTO FEATURES ══════════════════ */}
      <section style={{ padding: '120px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <Chip>Platform Features</Chip>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(34px,4vw,52px)', fontWeight: 800, letterSpacing: '-.03em', color: 'var(--ink)', margin: '18px 0 18px' }}>
                Everything you need.<br />Nothing you don't.
              </h2>
              <p style={{ fontFamily: 'var(--sans)', fontSize: 18, color: 'var(--sub)', maxWidth: 460, margin: '0 auto', lineHeight: 1.65 }}>
                A complete GeoAI stack — from satellite ingest to bankable financial projections.
              </p>
            </div>
          </Reveal>

          {/* Bento grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'auto auto', gap: 16 }}>

            {/* Big left */}
            <Reveal delay={0} className="bento" style={{ gridColumn: '1/3', gridRow: '1/2' }}>
              <div className="bento" style={{
                background: 'linear-gradient(135deg, #0071e3 0%, #34aadc 100%)',
                padding: '48px 48px 0', minHeight: 340, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,.08)', pointerEvents: 'none' }} />
                <Chip color="#fff" bg="rgba(255,255,255,.2)">Core AI Engine</Chip>
                <h3 style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 800, letterSpacing: '-.025em', color: '#fff', margin: '14px 0 12px', lineHeight: 1.15 }}>
                  YOLOv8 + U-Net<br />Segmentation Pipeline
                </h3>
                <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'rgba(255,255,255,.75)', lineHeight: 1.65, maxWidth: 360, marginBottom: 32 }}>
                  Pixel-perfect polygon detection with 94% mAP@0.5 accuracy. Rejects HVAC, skylights, and false positives automatically.
                </p>
                {/* Mini terminal */}
                <div style={{
                  background: 'rgba(0,0,0,.35)', borderRadius: '14px 14px 0 0', padding: '16px 20px',
                  fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 2,
                }}>
                  {[
                    { c: 'rgba(255,255,255,.4)', t: '> loading yolov8_geo.pt…' },
                    { c: '#5ac8fa', t: '> model weights loaded ✓' },
                    { c: 'rgba(255,255,255,.4)', t: '> running inference…' },
                    { c: '#30d158', t: '> 7 arrays detected — conf: 0.94' },
                  ].map((l, i) => <div key={i} style={{ color: l.c }}>{l.t}</div>)}
                </div>
              </div>
            </Reveal>

            {/* Top right */}
            <Reveal delay={60} className="bento" style={{ gridColumn: '3/4', gridRow: '1/2' }}>
              <div className="bento" style={{ background: 'var(--bg2)', padding: '36px 32px', height: '100%' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'linear-gradient(135deg, #eafaf1, #d5f5e3)',
                  border: '1px solid rgba(29,131,72,.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                }}>
                  <FileJson style={{ width: 24, height: 24, color: 'var(--green)' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)', marginBottom: 10 }}>GeoJSON Export</h3>
                <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--sub)', lineHeight: 1.65, marginBottom: 20 }}>
                  Export EPSG:4326 GeoJSON or Shapefile compatible with AutoCAD, QGIS, and ArcGIS instantly.
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Chip color="var(--green)">EPSG:32647</Chip>
                  <Chip color="var(--green)">WKT</Chip>
                  <Chip color="var(--green)">PostGIS</Chip>
                </div>
              </div>
            </Reveal>

            {/* Bottom left */}
            <Reveal delay={100} className="bento">
              <div className="bento" style={{ background: '#1d1d1f', padding: '36px 32px' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                }}>
                  <TrendingUp style={{ width: 24, height: 24, color: '#30d158' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: '#f5f5f7', marginBottom: 10 }}>25-Year ROI Model</h3>
                <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: '#86868b', lineHeight: 1.65 }}>
                  Instant CAPEX, break-even, IRR, and cumulative cash flow projections with Thai EGAT tariff rates.
                </p>
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['CAPEX','฿1.2M','#86868b',28],['ROI Y10','฿8.1M','#30d158',82],['ROI Y25','฿24M','#5ac8fa',100]].map(([l,v,c,p]) => (
                    <div key={String(l)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#86868b' }}>{l}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: String(c) }}>{v}</span>
                      </div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${p}%`, background: String(c), borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Bottom center */}
            <Reveal delay={140} className="bento">
              <div className="bento" style={{ background: 'var(--bg2)', padding: '36px 32px' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: '#eef4ff', border: '1px solid rgba(0,113,227,.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                }}>
                  <Workflow style={{ width: 24, height: 24, color: 'var(--blue)' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)', marginBottom: 10 }}>String Wiring Sim</h3>
                <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--sub)', lineHeight: 1.65 }}>
                  K-Means clustering groups nearby panels into efficient string inverter circuits — instantly.
                </p>
                <div style={{ marginTop: 20 }}>
                  <svg viewBox="0 0 200 80" style={{ width: '100%' }}>
                    {[40,80,120,160].map((x, i) => (
                      <g key={i}>
                        <rect x={x-12} y={18} width={24} height={14} rx={3} fill={i%2===0?'#0071e3':'#34aadc'} opacity={.85} />
                        {i < 3 && <line x1={x+12} y1={25} x2={x+68} y2={25} stroke="#0071e3" strokeWidth={1.5} strokeDasharray="4 3" opacity={.4} />}
                      </g>
                    ))}
                    {[40,80,120,160].map((x, i) => (
                      <g key={`b${i}`}>
                        <rect x={x-12} y={48} width={24} height={14} rx={3} fill={i%2===0?'#ff9f0a':'#ffbe5c'} opacity={.85} />
                        {i < 3 && <line x1={x+12} y1={55} x2={x+68} y2={55} stroke="#ff9f0a" strokeWidth={1.5} strokeDasharray="4 3" opacity={.4} />}
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
            </Reveal>

            {/* Bottom right */}
            <Reveal delay={180} className="bento">
              <div className="bento" style={{ background: 'linear-gradient(135deg, #fff8ed 0%, #fef3d7 100%)', border: '1px solid rgba(255,159,10,.15)', padding: '36px 32px' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'rgba(255,159,10,.15)', border: '1px solid rgba(255,159,10,.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                }}>
                  <Leaf style={{ width: 24, height: 24, color: '#d48806' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)', marginBottom: 10 }}>Carbon Tokens (CCT)</h3>
                <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: '#8b6914', lineHeight: 1.65, marginBottom: 16 }}>
                  Automatically compute CO₂ offset and generate tradeable Carbon Credit Tokens for ESG reporting.
                </p>
                <div style={{ fontFamily: 'var(--display)', fontSize: 38, fontWeight: 900, letterSpacing: '-.04em', color: '#b8860b' }}>12,750 <span style={{ fontSize: 16, fontWeight: 600 }}>CCT</span></div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#d48806', letterSpacing: '.1em', marginTop: 3 }}>Est. value: $1,912 USD</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════ PIPELINE ══════════════════ */}
      <section id="pipeline" style={{ padding: '120px 24px', background: 'var(--bg3)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 80 }}>
              <Chip>Pipeline</Chip>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(34px,4vw,52px)', fontWeight: 800, letterSpacing: '-.03em', color: 'var(--ink)', margin: '18px 0 18px' }}>
                From pixels to profit.<br />In three steps.
              </h2>
              <p style={{ fontFamily: 'var(--sans)', fontSize: 18, color: 'var(--sub)', maxWidth: 440, margin: '0 auto', lineHeight: 1.65 }}>
                A seamless automated pipeline — no manual GIS work required.
              </p>
            </div>
          </Reveal>

          {[
            {
              n:'01', color:'#0071e3', icon:<Satellite style={{width:22,height:22}}/>,
              title: 'Satellite Image Acquisition',
              body: 'Upload GeoTIFF, PNG, or JPEG. CLAHE and Histogram Equalization remove cloud shadows, balance exposure, and sharpen edges — giving the AI perfect input.',
              tags: ['CLAHE Processing','Multi-band Stacking','10 cm / px'],
              vis: (
                <div style={{ height:300, background:'#eef0f2', borderRadius:18, border:'1px solid rgba(0,0,0,.07)', overflow:'hidden', position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(0,0,0,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.04) 1px,transparent 1px)', backgroundSize:'28px 28px' }} />
                  <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 50%, rgba(0,113,227,.06) 0%, transparent 60%)' }} />
                  <div style={{ width:148, height:148, borderRadius:'50%', border:'1.5px dashed rgba(0,113,227,.2)', animation:'spin 14s linear infinite', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:90, height:90, borderRadius:'50%', border:'1px solid rgba(0,113,227,.12)', background:'rgba(255,255,255,.7)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
                      <Satellite style={{ width:38, height:38, color:'#0071e3' }} />
                    </div>
                  </div>
                  <div style={{ position:'absolute', left:0, right:0, height:1.5, background:'linear-gradient(90deg,transparent,rgba(0,113,227,.45) 30%,rgba(0,113,227,.45) 70%,transparent)', animation:'scanL 3.5s linear infinite' }} />
                  <div style={{ position:'absolute', bottom:14, left:14, background:'rgba(255,255,255,.9)', backdropFilter:'blur(8px)', border:'1px solid rgba(0,0,0,.09)', borderRadius:8, padding:'6px 11px', fontFamily:'var(--mono)', fontSize:9, color:'var(--sub)' }}>RESOLUTION: 10cm/px · CLAHE ACTIVE</div>
                </div>
              ),
            },
            {
              n:'02', color:'#8e44ad', icon:<BrainCircuit style={{width:22,height:22}}/>,
              title: 'AI Deep Segmentation',
              body: 'YOLOv8 + U-Net draws pixel-perfect polygons — rejecting skylights, HVAC, and water tanks. Achieves 94% mAP@0.5 and 0.854 IoU on benchmark datasets.',
              tags: ['Instance Segmentation','94% mAP@0.5','0.854 IoU'],
              vis: (
                <div style={{ height:300, background:'var(--bg2)', borderRadius:18, border:'1px solid rgba(0,0,0,.07)', overflow:'hidden', padding:24, display:'flex', flexDirection:'column' }}>
                  <div style={{ display:'flex', gap:5, marginBottom:14 }}>
                    {['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{width:9,height:9,borderRadius:'50%',background:c}}/>)}
                  </div>
                  {[
                    {c:'var(--sub)',t:'> initializing yolov8_geo.pt…'},
                    {c:'#8e44ad',t:'> model weights loaded ✓'},
                    {c:'var(--sub)',t:'> running inference on tile…'},
                    {c:'var(--green)',t:'> 7 solar arrays detected'},
                    {c:'var(--sub)',t:'> extracting WKT polygons…'},
                    {c:'var(--blue)',t:'> piping to PostGIS ✓'},
                  ].map((l,i)=>(
                    <div key={i} style={{fontFamily:'var(--mono)',fontSize:12,color:l.c,lineHeight:1.9}}>{l.t}</div>
                  ))}
                  <div style={{ marginTop:'auto', background:'#fff', border:'1px solid rgba(0,0,0,.07)', borderRadius:10, padding:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg viewBox="0 0 120 72" style={{width:190,height:114}}>
                      <polygon points="12,18 88,9 102,60 18,66" stroke="#8e44ad" strokeWidth="1.5" fill="rgba(142,68,173,.09)" strokeDasharray="5 3"/>
                      <circle cx="57" cy="36" r="4" fill="#8e44ad"/>
                      <text x="62" y="32" fill="#8e44ad" fontSize="8" fontFamily="monospace" opacity=".85">CONF: 0.96</text>
                      <polygon points="64,15 95,11 100,32 68,36" stroke="#0071e3" strokeWidth="1" fill="rgba(0,113,227,.07)" strokeDasharray="3 2"/>
                      <text x="66" y="24" fill="#0071e3" fontSize="7" fontFamily="monospace" opacity=".8">0.88</text>
                    </svg>
                  </div>
                </div>
              ),
            },
            {
              n:'03', color:'var(--green)', icon:<BarChart3 style={{width:22,height:22}}/>,
              title: 'Web GIS & Financial Engineering',
              body: 'Data flows into PostGIS. K-Means clusters panels into string inverter groups, simulates wiring, and instantly projects CAPEX, 25-year cash flow, and carbon token value.',
              tags: ['K-Means Clustering','25-Year Projection','Carbon Tokens'],
              vis: (
                <div style={{ height:300, background:'var(--bg2)', borderRadius:18, border:'1px solid rgba(0,0,0,.07)', overflow:'hidden', padding:24, display:'flex', flexDirection:'column', gap:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontFamily:'var(--sans)', fontSize:12, fontWeight:600, color:'var(--sub)' }}>25-Year Cash Flow Projection</span>
                    <TrendingUp style={{width:15,height:15,color:'var(--green)'}}/>
                  </div>
                  {[
                    {l:'CAPEX',w:'28%',c:'#94a3b8',v:'฿1.2M'},
                    {l:'Break-Even Yr 7',w:'52%',c:'#ff9f0a',v:'฿0'},
                    {l:'ROI Year 10',w:'80%',c:'var(--green)',v:'฿8.1M'},
                    {l:'ROI Year 25',w:'100%',c:'#0071e3',v:'฿24M'},
                  ].map(b=>(
                    <div key={b.l}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                        <span style={{fontFamily:'var(--sans)',fontSize:11,color:'var(--sub)'}}>{b.l}</span>
                        <span style={{fontFamily:'var(--mono)',fontSize:11,color:b.c,fontWeight:500}}>{b.v}</span>
                      </div>
                      <div style={{height:5,background:'rgba(0,0,0,.07)',borderRadius:3,overflow:'hidden'}}>
                        <div style={{height:'100%',width:b.w,background:b.c,borderRadius:3}}/>
                      </div>
                    </div>
                  ))}
                  <div style={{flex:1,position:'relative',borderLeft:'1.5px solid rgba(0,0,0,.1)',borderBottom:'1.5px solid rgba(0,0,0,.1)'}}>
                    <svg style={{position:'absolute',inset:0,width:'100%',height:'100%'}} viewBox="0 0 100 56" preserveAspectRatio="none">
                      <defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1d8348" stopOpacity=".2"/><stop offset="100%" stopColor="#1d8348" stopOpacity="0"/></linearGradient></defs>
                      <path d="M0,56 L0,50 C18,44 38,30 58,16 C78,4 88,2 100,0 L100,56Z" fill="url(#gg)"/>
                      <path d="M0,50 C18,44 38,30 58,16 C78,4 88,2 100,0" fill="none" stroke="var(--green)" strokeWidth="1.5"/>
                      <line x1="36" y1="0" x2="36" y2="56" stroke="#ff9f0a" strokeWidth=".8" strokeDasharray="3 2" opacity=".7"/>
                      <text x="37" y="8" fill="#ff9f0a" fontSize="5" fontFamily="monospace" opacity=".9">B/E</text>
                    </svg>
                  </div>
                </div>
              ),
            },
          ].map((step, si) => (
            <Reveal key={step.n} delay={si * 80}>
              <div style={{ position:'relative', paddingBottom: si<2 ? 60 : 0 }}>
                {si < 2 && <div className="step-line"/>}
                <div style={{ display:'flex', gap:24 }}>
                  <div style={{
                    width:42, height:42, borderRadius:'50%', flexShrink:0,
                    background:`${step.color}0e`, border:`1.5px solid ${step.color}28`,
                    display:'flex', alignItems:'center', justifyContent:'center', color:step.color,
                  }}>{step.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'var(--mono)',fontSize:10,color:step.color,letterSpacing:'.18em',marginBottom:7}}>STEP {step.n}</div>
                    <h3 style={{fontFamily:'var(--display)',fontSize:28,fontWeight:800,letterSpacing:'-.022em',color:'var(--ink)',marginBottom:13,lineHeight:1.15}}>{step.title}</h3>
                    <p style={{fontFamily:'var(--sans)',fontSize:15,color:'var(--sub)',lineHeight:1.75,marginBottom:18}}>{step.body}</p>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:24}}>
                      {step.tags.map(t=><Chip key={t} color={step.color}>{t}</Chip>)}
                    </div>
                    {step.vis}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════════════ TECHNOLOGY (dark) ══════════════════ */}
      <section id="tech" className="section-dark" style={{ padding:'120px 24px' }}>
        <div style={{ maxWidth:1080, margin:'0 auto' }}>
          <Reveal>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:80, alignItems:'center', marginBottom:80 }}>
              <div>
                <Chip color="#5ac8fa" bg="rgba(90,200,250,.1)">Technology</Chip>
                <h2 style={{ fontFamily:'var(--display)', fontSize:'clamp(34px,4vw,50px)', fontWeight:800, letterSpacing:'-.03em', color:'#f5f5f7', margin:'18px 0 18px', lineHeight:1.1 }}>
                  Proven geospatial<br />science, industrialised.
                </h2>
                <p style={{ fontFamily:'var(--sans)', fontSize:17, color:'#86868b', lineHeight:1.7, marginBottom:32 }}>
                  Every layer of the stack is chosen for spatial precision — from CLAHE image enhancement to EPSG:32647 coordinate math to Moran's I autocorrelation clustering.
                </p>
                <Link href="/dashboard">
                  <button className="btn-secondary" style={{ color:'#2997ff' }}>
                    Explore the platform <ChevronRight className="arr" style={{width:16,height:16}}/>
                  </button>
                </Link>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[
                  {v:'0.854',l:'IoU Score',   n:'Intersection over Union'},
                  {v:'94%',  l:'mAP@0.5',     n:'Detection accuracy'},
                  {v:'0.74', l:"Moran's I",   n:'Spatial clustering index'},
                  {v:'15 cm',l:'Field Match', n:'vs physical measurement'},
                ].map(s=>(
                  <div key={s.l} style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.09)', borderRadius:16, padding:'24px 20px' }}>
                    <div style={{ fontFamily:'var(--display)', fontSize:36, fontWeight:900, letterSpacing:'-.04em', color:'#2997ff', lineHeight:1, marginBottom:8 }}>{s.v}</div>
                    <div style={{ fontFamily:'var(--sans)', fontSize:14, fontWeight:600, color:'#f5f5f7', marginBottom:3 }}>{s.l}</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'#6e6e73', letterSpacing:'.1em' }}>{s.n}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {[
              {icon:<Satellite style={{width:22,height:22}}/>,c:'#5ac8fa',step:'Ingest', title:'GeoTIFF Input',   desc:'Multispectral TIFF with DIP preprocessing'},
              {icon:<Layers style={{width:22,height:22}}/>,   c:'#5e5ce6',step:'Enhance',title:'CLAHE + EQ',      desc:'Contrast-limited adaptive histogram equalisation'},
              {icon:<BrainCircuit style={{width:22,height:22}}/>,c:'#bf5af2',step:'Infer',title:'YOLOv8 + U-Net', desc:'Instance segmentation with confidence scoring'},
              {icon:<Database style={{width:22,height:22}}/>,  c:'#30d158',step:'Store',  title:'PostGIS',        desc:'EPSG:32647 spatial storage and GeoJSON export'},
            ].map((c,i)=>(
              <Reveal key={i} delay={i*55}>
                <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:18, padding:'24px 20px' }}>
                  <div style={{ width:48, height:48, borderRadius:13, marginBottom:18, background:`${c.c}18`, border:`1px solid ${c.c}25`, display:'flex', alignItems:'center', justifyContent:'center', color:c.c }}>{c.icon}</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:9, color:c.c, letterSpacing:'.18em', marginBottom:5 }}>{c.step}</div>
                  <div style={{ fontFamily:'var(--display)', fontSize:16, fontWeight:800, color:'#f5f5f7', marginBottom:6 }}>{c.title}</div>
                  <div style={{ fontFamily:'var(--sans)', fontSize:13, color:'#6e6e73', lineHeight:1.6 }}>{c.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ WHO FOR ══════════════════ */}
      <section style={{ padding:'120px 24px', background:'var(--bg3)' }}>
        <div style={{ maxWidth:1080, margin:'0 auto' }}>
          <Reveal>
            <div style={{ textAlign:'center', marginBottom:64 }}>
              <Chip color="#ff9f0a" bg="rgba(255,159,10,.08)">Audience</Chip>
              <h2 style={{ fontFamily:'var(--display)', fontSize:'clamp(34px,4vw,52px)', fontWeight:800, letterSpacing:'-.03em', color:'var(--ink)', margin:'18px 0 18px' }}>
                Built for people<br />who decide.
              </h2>
            </div>
          </Reveal>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            {[
              {icon:<Landmark style={{width:24,height:24}}/>,color:'var(--blue)',title:'Government & Policy',sub:'Public Sector',featured:false,
               items:['National solar capacity mapping','Grid upgrade planning','Net Zero progress tracking','No manual surveys needed']},
              {icon:<Building2 style={{width:24,height:24}}/>,color:'var(--green)',title:'Energy Investors',sub:'Finance',featured:true,
               items:['Industrial estate screening','CAPEX & IRR modeling','Phase-based investment zoning','ESG carbon token valuation']},
              {icon:<SunMedium style={{width:24,height:24}}/>,color:'#8e44ad',title:'EPC Contractors',sub:'Engineering',featured:false,
               items:['GeoJSON → AutoCAD export',"Moran's I string planning",'EPSG:32647 coordinate math','Wiring diagram simulation']},
            ].map((c,i)=>(
              <Reveal key={c.title} delay={i*70}>
                <div className="card-lift" style={{
                  background: c.featured ? 'var(--ink)' : '#fff',
                  border:`1px solid ${c.featured ? 'var(--ink)' : 'rgba(0,0,0,.07)'}`,
                  borderRadius:20, padding:'36px 28px',
                  position:'relative', overflow:'hidden', cursor:'default',
                  boxShadow: c.featured ? '0 8px 32px rgba(0,0,0,.16)' : '0 1px 4px rgba(0,0,0,.05)',
                }}>
                  {c.featured && (
                    <div style={{ position:'absolute', top:18, right:18, background:'var(--blue)', color:'#fff', fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.12em', textTransform:'uppercase', padding:'4px 10px', borderRadius:999 }}>Popular</div>
                  )}
                  <div style={{ width:52, height:52, borderRadius:14, marginBottom:22, background:`${c.color}12`, border:`1px solid ${c.color}22`, display:'flex', alignItems:'center', justifyContent:'center', color:c.color }}>{c.icon}</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:9, color: c.featured ? '#6e6e73' : 'var(--sub)', letterSpacing:'.16em', textTransform:'uppercase', marginBottom:8 }}>{c.sub}</div>
                  <h3 style={{ fontFamily:'var(--display)', fontSize:22, fontWeight:800, letterSpacing:'-.02em', color: c.featured ? '#f5f5f7' : 'var(--ink)', marginBottom:22, lineHeight:1.2 }}>{c.title}</h3>
                  {c.items.map(it=>(
                    <div key={it} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <div style={{ width:16, height:16, borderRadius:'50%', flexShrink:0, background:`${c.color}14`, border:`1px solid ${c.color}28`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:c.color }}/>
                      </div>
                      <span style={{ fontFamily:'var(--sans)', fontSize:14, color: c.featured ? '#a1a1a6' : 'var(--sub)' }}>{it}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:26 }}>
                    <button className="btn-secondary" style={{ color:c.color, fontSize:14 }}>
                      Request access <ChevronRight className="arr" style={{width:14,height:14}}/>
                    </button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ ESG ══════════════════ */}
      <section id="esg" style={{ padding:'120px 24px', background:'#fff' }}>
        <div style={{ maxWidth:1080, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:80, alignItems:'center' }}>
            <Reveal>
              <div>
                <Chip color="var(--green)" bg="rgba(29,131,72,.07)">ESG Impact</Chip>
                <h2 style={{ fontFamily:'var(--display)', fontSize:'clamp(34px,4vw,50px)', fontWeight:800, letterSpacing:'-.03em', color:'var(--ink)', margin:'18px 0 20px', lineHeight:1.1 }}>
                  Turning data into<br />measurable impact.
                </h2>
                <p style={{ fontFamily:'var(--sans)', fontSize:17, color:'var(--sub)', lineHeight:1.7, marginBottom:32 }}>
                  GeoAI Vision converts physical detections into quantifiable environmental outcomes — from CO₂ tracking to tradeable carbon token generation.
                </p>
                {['CO₂ offset calculated per panel array','Equivalent trees planted computed','Tradeable Carbon Credit Tokens (CCT)','Aligned with Thailand Net Zero 2065'].map((it,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                    <CheckCircle2 style={{ width:18, height:18, color:'var(--green)', flexShrink:0 }}/>
                    <span style={{ fontFamily:'var(--sans)', fontSize:15, color:'var(--sub)' }}>{it}</span>
                  </div>
                ))}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:32 }}>
                  {[
                    {icon:<TreePine style={{width:17,height:17}}/>,v:'4,048',l:'Trees equiv.',c:'var(--green)'},
                    {icon:<Car style={{width:17,height:17}}/>,v:'18.5',l:'Cars removed',c:'var(--blue)'},
                    {icon:<Wind style={{width:17,height:17}}/>,v:'218k',l:'kWh / year',c:'var(--green)'},
                    {icon:<DollarSign style={{width:17,height:17}}/>,v:'12,750',l:'CCT tokens',c:'#d48806'},
                  ].map(s=>(
                    <div key={s.l} style={{ background:'var(--bg2)', border:'1px solid rgba(0,0,0,.06)', borderRadius:14, padding:'16px', display:'flex', alignItems:'center', gap:11 }}>
                      <div style={{ width:36,height:36,borderRadius:10,flexShrink:0,background:`${s.c}10`,color:s.c,display:'flex',alignItems:'center',justifyContent:'center' }}>{s.icon}</div>
                      <div>
                        <div style={{ fontFamily:'var(--mono)',fontSize:8,color:'var(--sub)',letterSpacing:'.14em',textTransform:'uppercase' }}>{s.l}</div>
                        <div style={{ fontFamily:'var(--display)',fontSize:20,fontWeight:800,letterSpacing:'-.02em',color:s.c }}>{s.v}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,.08)', borderRadius:24, padding:'36px', boxShadow:'0 8px 40px rgba(0,0,0,.07)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28, paddingBottom:20, borderBottom:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                    <Leaf style={{ width:17,height:17,color:'var(--green)' }}/>
                    <span style={{ fontFamily:'var(--sans)',fontSize:13,fontWeight:600,color:'var(--ink)' }}>Carbon Offset Dashboard</span>
                  </div>
                  <Chip color="var(--green)" bg="rgba(29,131,72,.07)">
                    <span style={{ width:5,height:5,borderRadius:'50%',background:'var(--green)',animation:'pulse 2s infinite',display:'inline-block' }}/>
                    Live
                  </Chip>
                </div>
                {[
                  {l:'CO₂ Reduction',      v:'85,000 kg',p:85,c:'var(--green)'},
                  {l:'Trees Planted Equiv.',v:'4,048',    p:62,c:'var(--blue)'},
                  {l:'Carbon Tokens (CCT)', v:'12,750',   p:74,c:'#8e44ad'},
                ].map(r=>(
                  <div key={r.l} style={{marginBottom:22}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                      <span style={{fontFamily:'var(--sans)',fontSize:13,color:'var(--sub)'}}>{r.l}</span>
                      <span style={{fontFamily:'var(--display)',fontSize:15,fontWeight:800,letterSpacing:'-.01em',color:'var(--ink)'}}>{r.v}</span>
                    </div>
                    <div style={{height:5,background:'var(--bg2)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${r.p}%`,background:r.c,borderRadius:3}}/>
                    </div>
                  </div>
                ))}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:8 }}>
                  {[
                    {l:'Net Zero Progress',v:'67%',c:'var(--green)'},
                    {l:'CCT Market Value',v:'$1,912',c:'#d48806'},
                  ].map(s=>(
                    <div key={s.l} style={{ padding:'16px',borderRadius:12,background:'var(--bg2)',border:'1px solid rgba(0,0,0,.05)' }}>
                      <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--sub)',letterSpacing:'.14em',textTransform:'uppercase',marginBottom:5}}>{s.l}</div>
                      <div style={{fontFamily:'var(--display)',fontSize:26,fontWeight:900,letterSpacing:'-.04em',color:s.c}}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════ TESTIMONIALS ══════════════════ */}
      <section style={{ padding:'120px 24px', background:'var(--bg2)' }}>
        <div style={{ maxWidth:1080, margin:'0 auto' }}>
          <Reveal>
            <div style={{ textAlign:'center', marginBottom:60 }}>
              <Chip color="#ff9f0a" bg="rgba(255,159,10,.08)">Testimonials</Chip>
              <h2 style={{ fontFamily:'var(--display)', fontSize:'clamp(34px,4vw,52px)', fontWeight:800, letterSpacing:'-.03em', color:'var(--ink)', margin:'18px 0 0' }}>
                Trusted by Thailand's<br />energy leaders.
              </h2>
            </div>
          </Reveal>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            {[
              {name:'Dr. Wanchai P.',org:'Research Director, EGAT', text:"GeoAI Vision compressed what used to be a 3-month rooftop survey into a 48-hour analysis. The financial modeling is exceptionally precise.",stars:5},
              {name:'Arporn S.',org:'Energy Investment Lead, SCG', text:"The priority zoning feature alone saved us from a costly mistake. The AI correctly flagged three rooftops with structural issues our team missed.",stars:5},
              {name:'Tanakrit L.',org:'EPC Project Manager, B.Grimm', text:"We exported GeoJSON directly into AutoCAD. The spatial accuracy is remarkable — within 15 cm of our field measurements.",stars:5},
            ].map((t,i)=>(
              <Reveal key={i} delay={i*70}>
                <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,.07)', borderRadius:20, padding:'32px', transition:'transform .25s ease, box-shadow .25s ease', cursor:'default' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-4px)';(e.currentTarget as HTMLElement).style.boxShadow='0 16px 48px rgba(0,0,0,.08)';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';(e.currentTarget as HTMLElement).style.boxShadow='';}}
                >
                  <div style={{display:'flex',gap:2,marginBottom:18}}>
                    {[...Array(t.stars)].map((_,j)=><Star key={j} style={{width:13,height:13,color:'#ff9f0a',fill:'#ff9f0a'}}/>)}
                  </div>
                  <p style={{ fontFamily:'var(--sans)', fontSize:16, color:'var(--ink)', lineHeight:1.65, marginBottom:24 }}>"{t.text}"</p>
                  <div style={{ display:'flex', alignItems:'center', gap:12, paddingTop:18, borderTop:'1px solid var(--border)' }}>
                    <div style={{ width:38,height:38,borderRadius:'50%',background:'var(--blue)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--display)',fontSize:14,fontWeight:800 }}>{t.name.charAt(0)}</div>
                    <div>
                      <div style={{fontFamily:'var(--sans)',fontSize:14,fontWeight:600,color:'var(--ink)'}}>{t.name}</div>
                      <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--sub)',letterSpacing:'.06em'}}>{t.org}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ FAQ ══════════════════ */}
      <section id="faq" style={{ padding:'120px 24px', background:'#fff' }}>
        <div style={{ maxWidth:680, margin:'0 auto' }}>
          <Reveal>
            <div style={{ textAlign:'center', marginBottom:60 }}>
              <Chip>FAQ</Chip>
              <h2 style={{ fontFamily:'var(--display)', fontSize:'clamp(34px,4vw,52px)', fontWeight:800, letterSpacing:'-.03em', color:'var(--ink)', margin:'18px 0 0' }}>
                Common questions.
              </h2>
            </div>
          </Reveal>
          {[
            {q:'What image formats does GeoAI Vision support?',a:'We support GeoTIFF (.tif), PNG, and JPEG at any resolution. The DIP pipeline is optimised for multispectral imagery at 10–50 cm/pixel, though standard RGB works well for initial assessments.'},
            {q:'How accurate is the AI detection engine?',a:'Our YOLOv8 + U-Net architecture achieves 94% mAP@0.5 and 0.854 IoU on our benchmark dataset. False positives — skylights, HVAC units, water tanks — are rejected via multi-stage confidence thresholds.'},
            {q:'Can I export to AutoCAD or QGIS?',a:'Yes. All detected panels export as GeoJSON (EPSG:4326) or Shapefile format, compatible with AutoCAD, QGIS, ArcGIS, and any PostGIS-based system. WKT geometry is available for direct database integration.'},
            {q:'How is the financial ROI calculated?',a:'ROI is modelled using panel area, local irradiance, EGAT tariff rates, system efficiency (0.2 kWp/m²), and annualised maintenance (฿500/kWp/yr) over a 25-year horizon. Break-even is computed via cumulative cash flow.'},
            {q:"Is this suitable for large industrial estates?",a:"Tested on estates exceeding 200 hectares. Moran's I spatial clustering groups panels into efficient string inverter circuits, reducing design time by up to 70% vs manual surveys."},
          ].map((f,i)=><Faq key={i} q={f.q} a={f.a}/>)}
        </div>
      </section>

      {/* ══════════════════ CTA ══════════════════ */}
      <section style={{ padding:'80px 24px 120px', background:'var(--bg2)' }}>
        <Reveal>
          <div style={{
            maxWidth:1080, margin:'0 auto',
            background:'var(--ink)', borderRadius:32, padding:'72px 64px',
            display:'grid', gridTemplateColumns:'1fr auto', gap:48, alignItems:'center',
            position:'relative', overflow:'hidden',
          }}>
            <div style={{ position:'absolute', right:-80, top:-80, width:400, height:400, borderRadius:'50%', filter:'blur(80px)', background:'rgba(0,113,227,.18)', pointerEvents:'none' }} />
            <div style={{ position:'absolute', left:-40, bottom:-60, width:280, height:280, borderRadius:'50%', filter:'blur(60px)', background:'rgba(29,131,72,.12)', pointerEvents:'none' }} />
            <div style={{ position:'relative' }}>
              <h2 style={{ fontFamily:'var(--display)', fontSize:'clamp(32px,4vw,52px)', fontWeight:800, letterSpacing:'-.035em', color:'#f5f5f7', lineHeight:1.1, marginBottom:16 }}>
                Ready to explore<br />
                <span style={{ background:'linear-gradient(135deg,#5ac8fa,#2997ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>your solar data?</span>
              </h2>
              <p style={{ fontFamily:'var(--sans)', fontSize:17, color:'#86868b', lineHeight:1.65, maxWidth:440 }}>
                Srinakharinwirot University's GeoAI platform is available immediately after upload. No registration. No friction.
              </p>
            </div>
            <div style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:10, flexShrink:0 }}>
              <Link href="/dashboard">
                <button className="btn-primary" style={{ fontSize:17, padding:'18px 38px', whiteSpace:'nowrap' }}>
                  Launch Platform <ArrowRight style={{width:18,height:18}}/>
                </button>
              </Link>
              <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'#6e6e73', letterSpacing:'.1em' }}>No registration required</span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer style={{ borderTop:'1px solid var(--border)', background:'#fff' }}>
        <div style={{ maxWidth:1080, margin:'0 auto', padding:'40px 24px', display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:24, alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:30,height:30,borderRadius:9,background:'var(--ink)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Zap style={{width:13,height:13,color:'#fff'}}/>
            </div>
            <div>
              <div style={{ fontFamily:'var(--display)', fontSize:15, fontWeight:700, color:'var(--ink)', letterSpacing:'-.01em' }}>GeoAI Vision</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--sub)', letterSpacing:'.12em', textTransform:'uppercase', marginTop:1 }}>by Srinakharinwirot University</div>
            </div>
          </div>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--sub)', letterSpacing:'.1em', textAlign:'center', lineHeight:1.7 }}>
            SRINAKHARINWIROT UNIVERSITY (SWU) · EPSG:32647<br />
            Faculty of Engineering · GeoAI Research Lab
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:7 }}>
            <span style={{ width:6,height:6,borderRadius:'50%',background:'#1d8348',animation:'pulse 2s infinite',display:'inline-block' }}/>
            <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--green)', letterSpacing:'.1em' }}>All systems operational</span>
          </div>
        </div>
        <Divider />
        <div style={{ maxWidth:1080, margin:'0 auto', padding:'20px 24px', display:'flex', justifyContent:'center', gap:32 }}>
          {[['Pipeline','#pipeline'],['Technology','#tech'],['ESG','#esg'],['FAQ','#faq'],['Dashboard','/dashboard']].map(([l,h])=>(
            <a key={l} href={h} style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--sub)', letterSpacing:'.1em', textTransform:'uppercase', transition:'color .2s' }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='var(--ink)'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='var(--sub)'}
            >{l}</a>
          ))}
        </div>
      </footer>
    </>
  );
}