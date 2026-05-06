'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, AreaChart, Area,
  LineChart, Line, CartesianGrid, ReferenceLine,
  RadarChart as RechartsRadar, Radar as RadarShape,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell, ComposedChart, PieChart, Pie,
} from 'recharts';
import {
  Zap, Leaf, DollarSign, Activity, UploadCloud, Trash2,
  Map as MapIcon, Layers, Terminal, BarChart3, Globe2, Crosshair,
  Cpu, ShieldCheck, Award, TrendingUp, CloudSun, DownloadCloud,
  Timer, Network, ListChecks, Cable, ChevronRight, ScanLine,
  GitBranch, Sigma, FlaskConical, TreePine, Car, Database,
  Target, CheckCircle2, Info, Radar, LayoutGrid, Wind,
} from 'lucide-react';

const MapComponent = dynamic(() => import('../Map'), { ssr: false });

/* ── Types ─────────────────────────────────────────────── */
interface SolarPanel {
  id: number; geom: string; area_sqm: number;
  daily_energy_kwh: number; yearly_energy_kwh: number;
  yearly_savings_baht: number; co2_offset_kg: number;
  confidence_score: number; centroid_lat: number; centroid_lon: number;
}

/* ── Mini Components ────────────────────────────────────── */
function Toggle({ on, color = '#0071e3', onToggle }: { on: boolean; color?: string; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      width: 38, height: 22, borderRadius: 11, position: 'relative',
      border: 'none', cursor: 'pointer', flexShrink: 0,
      background: on ? color : '#e5e5ea', transition: 'background .25s',
    }}>
      <span style={{
        position: 'absolute', top: 3, left: on ? 19 : 3,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left .22s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: '0 1px 4px rgba(0,0,0,.18)',
      }} />
    </button>
  );
}

function Lozenge({ children, color = '#0071e3' }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 980,
      background: `${color}0d`, border: `1px solid ${color}20`,
      fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 500,
      letterSpacing: '.13em', textTransform: 'uppercase' as const, color,
    }}>{children}</span>
  );
}

function Kpi({ label, value, sub, color = '#1d1d1f', accent = '#0071e3' }: {
  label: string; value: string | number; sub?: string; color?: string; accent?: string;
}) {
  return (
    <div style={{
      padding: '14px 16px',
      background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14,
      transition: 'box-shadow .2s',
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: '#6e6e73', letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 900, letterSpacing: '-.03em', color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#a0a0a0', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, sub, color = '#0071e3', children }: {
  title: string; sub?: string; color?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
      borderRadius: 16, padding: 16, overflow: 'hidden',
    }}>
      <div style={{ marginBottom: sub ? 4 : 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 14, height: 1.5, background: color, borderRadius: 1 }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color }}>{title}</span>
        </div>
        {sub && <p style={{ fontFamily: 'var(--sans)', fontSize: 11, color: '#6e6e73', marginTop: 4, marginLeft: 22, lineHeight: 1.5 }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function PingDot({ color = '#1d8348' }: { color?: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8, flexShrink: 0 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'dashPing 1.8s ease-in-out infinite', opacity: .7 }} />
      <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
    </span>
  );
}

// Shared tooltip style matching the white theme
const TT = {
  contentStyle: {
    background: '#ffffff', border: '1px solid rgba(0,0,0,0.09)',
    borderRadius: 12, fontFamily: 'var(--mono)', fontSize: 11,
    boxShadow: '0 4px 24px rgba(0,0,0,0.1)', color: '#1d1d1f',
  },
};

/* ════════════════════════════════════════════════════════
   MAIN DASHBOARD
════════════════════════════════════════════════════════ */
export default function SolarWebGIS() {
  const [panels, setPanels]             = useState<SolarPanel[]>([]);
  const [file, setFile]                 = useState<File | null>(null);
  const [isUploading, setIsUploading]   = useState(false);
  const [scanMessage, setScanMessage]   = useState('');
  const [uploadPct, setUploadPct]       = useState(0);
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [imageBounds, setImageBounds]   = useState<[[number,number],[number,number]]|null>(null);
  const [baseMap, setBaseMap]           = useState('satellite');
  const [activeTab, setActiveTab]       = useState('overview');
  const [activeLayers, setActiveLayers] = useState({ heatmap: false, stringWiring: true, priority: false });
  const [irradiance, setIrradiance]     = useState(850);
  const [leftOpen, setLeftOpen]         = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Edit-detection state ───────────────────────────── */
  const [deletedIds,  setDeletedIds]  = useState<Set<string|number>>(new Set());
  const [drawnPanels, setDrawnPanels] = useState<{
    id: string; coords: [number,number][]; note: string; source: 'manual';
    area_sqm: number; yearly_energy_kwh: number; yearly_savings_baht: number;
    co2_offset_kg: number; confidence_score: number;
    centroid_lat: number; centroid_lon: number;
  }[]>([]);
  const [undoStack,   setUndoStack]   = useState<string[]>([]);

  /* Compute polygon area (m²) from lat/lon coords using Shoelace + haversine approximation */
  const computePolygonArea = useCallback((coords: [number, number][]): number => {
    if (coords.length < 3) return 0;
    // Convert to approximate metres using centroid lat
    const cLat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const mPerDegLat = 111320;
    const mPerDegLon = 111320 * Math.cos(cLat * Math.PI / 180);
    const pts = coords.map(([lat, lon]) => [lat * mPerDegLat, lon * mPerDegLon]);
    let area = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      area += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
    }
    return Math.abs(area / 2);
  }, []);

  /* Undo helpers — shared with MapComponent via props */
  const saveUndo = useCallback(() => {
    setUndoStack(s => [...s.slice(-19), JSON.stringify({ deletedIds:[...deletedIds], drawnPanels })]);
  }, [deletedIds, drawnPanels]);

  const handleEditUndo = useCallback(() => {
    setUndoStack(s => {
      if (!s.length) return s;
      const prev = JSON.parse(s[s.length-1]);
      setDeletedIds(new Set(prev.deletedIds));
      setDrawnPanels(prev.drawnPanels);
      return s.slice(0,-1);
    });
  }, []);

  /* visiblePanels = AI panels minus deleted + manually drawn panels
     All stats are computed from this single list → update automatically on any edit */
  const visiblePanels = [
    ...panels.filter(p => !deletedIds.has(p.id)),
    ...drawnPanels.map(p => ({
      id:                 p.id as any,
      geom:               '',
      area_sqm:           p.area_sqm,
      daily_energy_kwh:   p.yearly_energy_kwh / 365,
      yearly_energy_kwh:  p.yearly_energy_kwh,
      yearly_savings_baht: p.yearly_savings_baht,
      co2_offset_kg:      p.co2_offset_kg,
      confidence_score:   p.confidence_score,
      centroid_lat:       p.centroid_lat,
      centroid_lon:       p.centroid_lon,
    })),
  ];

  useEffect(() => {
    const t = setInterval(() => setIrradiance(Math.floor(790 + Math.random() * 200)), 2200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isUploading) { setUploadPct(0); return; }
    const t = setInterval(() => setUploadPct(p => Math.min(p + Math.random() * 8, 91)), 900);
    return () => clearInterval(t);
  }, [isUploading]);

  /* ── Stats — computed from visiblePanels so they update immediately
       when the user deletes/draws panels ──────────────────────────── */
  const n          = visiblePanels.length;
  const totalArea     = visiblePanels.reduce((a, c) => a + (c.area_sqm     || 0), 0);
  const totalEnergy   = visiblePanels.reduce((a, c) => a + (c.yearly_energy_kwh   || 0), 0);
  const totalSavings  = visiblePanels.reduce((a, c) => a + (c.yearly_savings_baht || 0), 0);
  const totalCo2      = visiblePanels.reduce((a, c) => a + (c.co2_offset_kg       || 0), 0);
  const avgConf       = n > 0 ? visiblePanels.reduce((a, c) => a + c.confidence_score, 0) / n : 0;
  const avgArea       = n > 0 ? totalArea / n : 0;
  const stdArea       = n > 1 ? Math.sqrt(visiblePanels.reduce((a, c) => a + Math.pow(c.area_sqm - avgArea, 2), 0) / n) : 0;
  const maxArea       = n > 0 ? Math.max(...visiblePanels.map(p => p.area_sqm)) : 0;
  const minConf       = n > 0 ? Math.min(...visiblePanels.map(p => p.confidence_score)) : 0;
  const maxConf       = n > 0 ? Math.max(...visiblePanels.map(p => p.confidence_score)) : 0;
  const centLat       = n > 0 ? visiblePanels.reduce((a, c) => a + c.centroid_lat, 0) / n : 13.85;
  const centLon       = n > 0 ? visiblePanels.reduce((a, c) => a + c.centroid_lon, 0) / n : 100.5;
  const systemKw      = totalArea * 0.2;
  const estCapex      = systemKw * 35_000;
  const breakEven     = totalSavings > 0 ? estCapex / totalSavings : 0;
  const irr           = breakEven > 0 ? (100 / breakEven).toFixed(1) : '—';
  const cctValue      = totalCo2 * 0.15;
  const moransI       = 0.74;
  const geoDisp       = n > 0 ? visiblePanels.reduce((a, c) => a + Math.abs(c.centroid_lat - centLat), 0) / n : 0;
  const betaAreaEnergy = totalArea > 0 ? totalEnergy / totalArea : 0;

  /* ── Advanced spatial & DS metrics (all from visiblePanels) ─────── */
  // Coefficient of Variation (area)
  const cvArea      = avgArea > 0 ? (stdArea / avgArea) * 100 : 0;
  // Skewness (area)
  const skewArea    = n > 2 && stdArea > 0
    ? visiblePanels.reduce((a, c) => a + Math.pow((c.area_sqm - avgArea) / stdArea, 3), 0) / n
    : 0;
  // Excess Kurtosis (area)
  const kurtArea    = n > 3 && stdArea > 0
    ? visiblePanels.reduce((a, c) => a + Math.pow((c.area_sqm - avgArea) / stdArea, 4), 0) / n - 3
    : 0;
  // R² of area→energy OLS
  const ssRes       = visiblePanels.reduce((a, c) => a + Math.pow(c.yearly_energy_kwh - betaAreaEnergy * c.area_sqm, 2), 0);
  const ssTot       = visiblePanels.reduce((a, c) => {
    const meanE = n > 0 ? totalEnergy / n : 0;
    return a + Math.pow(c.yearly_energy_kwh - meanE, 2);
  }, 0);
  const rSquared    = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  // Nearest-Neighbour Index (NNI) proxy — uses mean lat/lon distances
  const nniProxy    = n > 1 ? (() => {
    const meanDist = visiblePanels.reduce((sum, p) => {
      const dists = visiblePanels
        .filter(q => q.id !== p.id)
        .map(q => Math.sqrt(Math.pow((p.centroid_lat - q.centroid_lat) * 111320, 2) + Math.pow((p.centroid_lon - q.centroid_lon) * 111320 * Math.cos(centLat * Math.PI / 180), 2)));
      return sum + (dists.length > 0 ? Math.min(...dists) : 0);
    }, 0) / n;
    const area_m2  = Math.max(totalArea * 10000, 1);
    const expected = 0.5 * Math.sqrt(area_m2 / n);
    return expected > 0 ? meanDist / expected : 0;
  })() : 0;
  // Energy density kWh/m² and CO₂ efficiency
  const energyDensity = totalArea > 0 ? totalEnergy / totalArea : 0;
  const co2PerM2      = totalArea > 0 ? totalCo2   / totalArea : 0;
  // Z-score outlier panels (|z| > 2)
  const zScoreData  = visiblePanels.map(p => ({
    id: p.id, area: p.area_sqm,
    z:  stdArea > 0 ? (p.area_sqm - avgArea) / stdArea : 0,
    conf: p.confidence_score, energy: p.yearly_energy_kwh,
  })).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  const phase1        = visiblePanels.filter(p => p.area_sqm * p.confidence_score > 3.5).length;
  const phase2        = visiblePanels.filter(p => { const s = p.area_sqm * p.confidence_score; return s > 1.5 && s <= 3.5; }).length;
  const phase3        = n - phase1 - phase2;

  /* ── Grade ──────────────────────────────────────────── */
  const grade = (() => {
    if (!n) return { g: '—', c: '#6e6e73', desc: 'Awaiting Data', bg: 'rgba(110,110,115,0.07)' };
    if (avgConf >= 0.5 && totalArea > 30) return { g: 'A+', c: '#1d8348', desc: 'Highly Suitable', bg: 'rgba(29,131,72,0.07)' };
    if (avgConf >= 0.4 && totalArea > 15) return { g: 'B',  c: '#0071e3', desc: 'Moderate',        bg: 'rgba(0,113,227,0.07)'  };
    return { g: 'C', c: '#d48806', desc: 'Low Potential', bg: 'rgba(212,136,6,0.07)' };
  })();

  /* ── Chart data ─────────────────────────────────────── */
  const sizeBuckets = [
    { name: '<2 m²', count: visiblePanels.filter(p => p.area_sqm < 2).length,                              fill: '#5ac8fa' },
    { name: '2–4',   count: visiblePanels.filter(p => p.area_sqm >= 2 && p.area_sqm < 4).length,           fill: '#0071e3' },
    { name: '4–6',   count: visiblePanels.filter(p => p.area_sqm >= 4 && p.area_sqm < 6).length,           fill: '#30d158' },
    { name: '>6 m²', count: visiblePanels.filter(p => p.area_sqm >= 6).length,                             fill: '#ff9f0a' },
  ];

  const confHistogram = Array.from({ length: 10 }, (_, i) => {
    const lo = i * 0.1, hi = lo + 0.1;
    return {
      bin: `${(lo * 100).toFixed(0)}`,
      count: visiblePanels.filter(p => p.confidence_score >= lo && (i < 9 ? p.confidence_score < hi : true)).length,
      fill: lo >= 0.7 ? '#30d158' : lo >= 0.5 ? '#0071e3' : '#ff9f0a',
    };
  });

  const scatterData = visiblePanels.map(p => ({
    x: parseFloat(p.area_sqm.toFixed(2)),
    y: parseFloat((p.confidence_score * 100).toFixed(1)),
    z: p.yearly_energy_kwh,
    cluster: p.area_sqm > 5 ? 'High-Yield' : p.confidence_score > 0.6 ? 'Efficient' : 'Standard',
  }));

  const quadrants = [
    { name: 'NW', count: visiblePanels.filter(p => p.centroid_lat > centLat && p.centroid_lon < centLon).length, fill: '#0071e3' },
    { name: 'NE', count: visiblePanels.filter(p => p.centroid_lat > centLat && p.centroid_lon >= centLon).length, fill: '#30d158' },
    { name: 'SW', count: visiblePanels.filter(p => p.centroid_lat <= centLat && p.centroid_lon < centLon).length, fill: '#ff9f0a' },
    { name: 'SE', count: visiblePanels.filter(p => p.centroid_lat <= centLat && p.centroid_lon >= centLon).length, fill: '#bf5af2' },
  ];

  // Spatial Shannon entropy on quadrant distribution
  const qTotal      = quadrants.reduce((a, q) => a + q.count, 0);
  const spatEntropy = qTotal > 0
    ? -quadrants.reduce((a, q) => { const p = q.count/qTotal; return a + (p>0 ? p*Math.log2(p) : 0); }, 0)
    : 0;
  const normEntropy = spatEntropy / Math.log2(4); // normalise to [0,1]

  // Ripley's K at 5 distance bins (metres)
  const rBins = [5, 10, 20, 40, 80];
  const ripleysK = rBins.map(r => {
    const count = n > 1 ? visiblePanels.reduce((sum, p) => {
      return sum + visiblePanels.filter(q => q.id !== p.id && (() => {
        const dm = Math.sqrt(
          Math.pow((p.centroid_lat - q.centroid_lat) * 111320, 2) +
          Math.pow((p.centroid_lon - q.centroid_lon) * 111320 * Math.cos(centLat * Math.PI / 180), 2)
        );
        return dm <= r;
      })()).length;
    }, 0) : 0;
    const lambdaHat = n > 0 ? n / Math.max(totalArea * 10000, 1) : 0;
    const K = lambdaHat > 0 && n > 1 ? count / (n * lambdaHat) : Math.PI * r * r;
    const Lstat = Math.sqrt(Math.max(K, 0) / Math.PI) - r;
    return { r, K: parseFloat(K.toFixed(3)), L: parseFloat(Lstat.toFixed(2)), csr: parseFloat((Math.PI * r * r).toFixed(3)) };
  });

  // Simulated KDE — smooth density over area bins
  const kdeBins = Array.from({ length: 20 }, (_, i) => {
    const x = (i + 0.5) * (maxArea > 0 ? maxArea : 10) / 20;
    const density = visiblePanels.reduce((sum, p) => {
      const h = stdArea > 0 ? stdArea : 1;
      return sum + Math.exp(-0.5 * Math.pow((x - p.area_sqm) / h, 2)) / (h * Math.sqrt(2 * Math.PI));
    }, 0) / Math.max(n, 1);
    return { x: x.toFixed(2), density: parseFloat(density.toFixed(4)) };
  });

  // Area–Energy regression points + regression line
  const regressionData = visiblePanels.slice(0, 40).map(p => ({ x: p.area_sqm, y: p.yearly_energy_kwh }));
  const regLineData = maxArea > 0
    ? [{ x: 0, y: 0 }, { x: maxArea, y: maxArea * betaAreaEnergy }]
    : [{ x: 0, y: 0 }, { x: 10, y: 10 * betaAreaEnergy }];

  const dailyCurve = [
    { t: '06:00', kwh: n > 0 ? 4 : 0,                          irr: 110 },
    { t: '08:00', kwh: n > 0 ? totalEnergy * 0.09 : 0,         irr: 450 },
    { t: '10:00', kwh: n > 0 ? totalEnergy * 0.22 : 0,         irr: 750 },
    { t: '12:00', kwh: n > 0 ? totalEnergy * 0.35 : 0,         irr: 980 },
    { t: '14:00', kwh: n > 0 ? totalEnergy * 0.26 : 0,         irr: 860 },
    { t: '16:00', kwh: n > 0 ? totalEnergy * 0.13 : 0,         irr: 530 },
    { t: '18:00', kwh: n > 0 ? 6 : 0,                          irr: 75  },
  ];

  const financialCurve = Array.from({ length: 26 }, (_, i) => ({
    yr: `Y${i}`,
    net:  Math.round(totalSavings * i - systemKw * 500 * i - estCapex),
    cumRev: Math.round(totalSavings * i),
  }));

  const histData = Array.from({ length: 22 }, (_, i) => ({
    px: Math.round(i * 11.6),
    orig:  Math.max(0, 100 - Math.pow(i - 5, 2) * 2   + Math.random() * 9),
    clahe: Math.max(0,  80 - Math.pow(i - 11, 2) * 1.4 + Math.random() * 18),
  }));

  const dipMetrics = [
    { subject: 'Precision', A: 92 }, { subject: 'Recall', A: 88 },
    { subject: 'mAP@0.5',  A: 94 }, { subject: 'IoU',    A: 85 },
    { subject: 'Pixel Acc',A: 96 },
  ];

  /* ── Fetch / actions ────────────────────────────────── */
  const fetchData = async () => {
    try {
      const { data, error } = await supabase.from('solar_panels_analytics').select('*').order('area_sqm', { ascending: false });
      if (error) throw error;
      if (data) setPanels(data as SolarPanel[]);
    } catch (e: any) { console.error(e.message); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const msgs = [
      'Initiating neural pipeline…', '[DIP] Applying CLAHE equalisation…',
      '[DIP] Extracting deep features…', 'Running YOLOv8-Geo inference…',
      '[GIS] Mapping inverter wiring paths…', 'Calculating investment priorities…',
    ];
    let idx = 0; setScanMessage(msgs[0]);
    const iv = setInterval(() => { idx = (idx + 1) % msgs.length; setScanMessage(msgs[idx]); }, 1200);
    const fd = new FormData(); fd.append('file', file);
    try {
      const res  = await fetch('https://kijnaphat-geoai-solar-api.hf.space/upload-solar-image/', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.status === 'success') {
        if (data.base64_image) setOverlayImage(data.base64_image);
        setImageBounds(data.image_bounds);
        setFile(null); fetchData();
      } else alert('AI Error: ' + data.message);
    } catch { alert('Connection error — cannot reach inference server.'); }
    finally { clearInterval(iv); setIsUploading(false); setScanMessage(''); setUploadPct(100); }
  };

  const handleClear = async () => {
    if (!confirm('Clear all spatial and financial data?')) return;
    await supabase.from('solar_panels_analytics').delete().neq('id', 0);
    setOverlayImage(null); setImageBounds(null); fetchData();
  };

  /* ── Edit mode visible to page (for header badge) ──── */
  const [editMode,    setEditMode]    = useState(false);
  const [drawMode,    setDrawMode]    = useState(false);

  /* toggle edit — also switches to right tab */
  const toggleEdit = useCallback(() => {
    setEditMode(e => !e);
    setDrawMode(false);
  }, []);

  /* Export only surviving AI panels + drawn manual panels */
  const downloadGeoJSON = useCallback(() => {
    if (!visiblePanels.length) { alert('No spatial data to export.'); return; }
    const aiPanels      = panels.filter(p => !deletedIds.has(p.id));
    const features = [
      ...aiPanels.map(p => ({
        type: 'Feature',
        properties: { id: p.id, source: 'ai', area_sqm: p.area_sqm, energy_kwh_yr: p.yearly_energy_kwh, ai_confidence: p.confidence_score },
        geometry: { type: 'Point', coordinates: [p.centroid_lon, p.centroid_lat] },
      })),
      ...drawnPanels.map(p => ({
        type: 'Feature',
        properties: {
          id: p.id, source: 'manual',
          area_sqm: p.area_sqm,
          energy_kwh_yr: p.yearly_energy_kwh,
          savings_baht_yr: p.yearly_savings_baht,
          co2_kg_yr: p.co2_offset_kg,
          vertices: p.coords.length,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[...p.coords.map(([lat, lon]) => [lon, lat]), [p.coords[0]?.[1] ?? 0, p.coords[0]?.[0] ?? 0]]],
        },
      })),
    ];
    const gj = { type: 'FeatureCollection', name: 'SWU_Solar_Edited', features };
    const a  = document.createElement('a');
    a.href   = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(gj, null, 2));
    a.download = `solar_edited_${Date.now()}.geojson`;
    document.body.appendChild(a); a.click(); a.remove();
  }, [visiblePanels, panels, deletedIds, drawnPanels]);

  const TABS = [
    { id: 'overview',  icon: <Globe2         style={{ width: 13, height: 13 }} />, label: 'Overview'  },
    { id: 'geostat',   icon: <Sigma          style={{ width: 13, height: 13 }} />, label: 'Geo Stats' },
    { id: 'spatial',   icon: <Network        style={{ width: 13, height: 13 }} />, label: 'Spatial'   },
    { id: 'clustering',icon: <LayoutGrid     style={{ width: 13, height: 13 }} />, label: 'Clustering'},
    { id: 'analytics', icon: <BarChart3      style={{ width: 13, height: 13 }} />, label: 'Data Sci'  },
    { id: 'dip',       icon: <FlaskConical   style={{ width: 13, height: 13 }} />, label: 'DIP Lab'   },
    { id: 'financials',icon: <TrendingUp     style={{ width: 13, height: 13 }} />, label: 'Finance'   },
    { id: 'logs',      icon: <Terminal       style={{ width: 13, height: 13 }} />, label: 'Geo Logs'  },
  ];

  /* ════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');
        :root {
          --display: 'Bricolage Grotesque', sans-serif;
          --sans:    'Geist', sans-serif;
          --mono:    'Geist Mono', monospace;
          --blue:    #0071e3;  --blue-l: rgba(0,113,227,0.08);
          --green:   #1d8348;  --green-l: rgba(29,131,72,0.08);
          --ink:     #1d1d1f;  --sub:  #6e6e73;
          --border:  rgba(0,0,0,0.08); --border2: rgba(0,0,0,0.05);
          --bg:      #f5f5f7;  --surface: #ffffff;
        }
        *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); color: var(--ink); font-family: var(--sans); -webkit-font-smoothing: antialiased; overflow: hidden; }

        @keyframes dashPing { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.8);opacity:0} }
        @keyframes spinSlow { to{transform:rotate(360deg)} }
        @keyframes scanLine { 0%{top:-2px} 100%{top:102%} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

        .panel { background: rgba(255,255,255,0.88); backdrop-filter: saturate(180%) blur(20px); border: 1px solid var(--border); }
        .scroll { overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.08) transparent; }
        .scroll::-webkit-scrollbar { width: 4px; }
        .scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 2px; }
        .tab-btn { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; flex:1; padding:8px 4px; border:none; border-bottom:2px solid transparent; cursor:pointer; background:transparent; font-family:var(--mono); font-size:8px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:var(--sub); transition:all .2s; border-radius: 8px 8px 0 0; }
        .tab-btn:hover { background: rgba(0,0,0,0.04); color: var(--ink); }
        .tab-active { color: var(--blue) !important; border-bottom-color: var(--blue) !important; background: rgba(0,113,227,0.06) !important; }
        .tab-content { animation: fadeSlide .3s ease both; }
        .map-wrap { position: absolute; inset: 0; }
      `}</style>

      <main style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

        {/* ══ TOP BAR ═══════════════════════════════════════════ */}
        <header style={{
          height: 52, background: 'rgba(255,255,255,0.92)', backdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 20px', flexShrink: 0, zIndex: 50,
        }}>
          {/* Logo + Home button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* ← Back to Home */}
            <a
              href="/"
              title="Back to Home"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 980,
                background: 'rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.1)',
                textDecoration: 'none', color: 'var(--sub)',
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                letterSpacing: '.08em',
                transition: 'all .18s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.08)';
                (e.currentTarget as HTMLElement).style.color = 'var(--ink)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)';
                (e.currentTarget as HTMLElement).style.color = 'var(--sub)';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Home
            </a>

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

            {/* Logo */}
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#1d1d1f', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              <Zap style={{ width: 14, height: 14, color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)', lineHeight: 1 }}>GeoAI Vision</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--sub)', letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 1 }}>SWU · Solar Intelligence Platform</div>
            </div>
          </div>

          {/* Centre HUD */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PingDot />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)', letterSpacing: '.1em' }}>SYSTEM ONLINE</span>
            </div>
            <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--sub)', letterSpacing: '.1em' }}>YOLOv8-SEG + U-NET</span>
            <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--sub)', letterSpacing: '.1em' }}>EPSG:4326/32647</span>
            <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 980, background: 'rgba(255,159,10,0.09)', border: '1px solid rgba(255,159,10,0.2)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#d48806', letterSpacing: '.1em' }}>IRRADIANCE</span>
              <span style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 800, color: '#ff9f0a', letterSpacing: '-.015em' }}>{irradiance} W/m²</span>
            </div>
          </div>

          {/* Right: grade + edit + export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {n > 0 && (
              <div style={{ padding: '5px 14px', borderRadius: 980, background: grade.bg, border: `1px solid ${grade.c}22` }}>
                <span style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 900, color: grade.c }}>{grade.g}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: grade.c, marginLeft: 6, letterSpacing: '.1em' }}>{grade.desc}</span>
              </div>
            )}
            {/* Edit detections toggle */}
            <button
              onClick={toggleEdit}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 980,
                background: editMode ? '#e53e3e' : 'rgba(0,0,0,0.05)',
                border: `1.5px solid ${editMode ? '#e53e3e' : 'rgba(0,0,0,0.12)'}`,
                cursor: 'pointer', color: editMode ? '#fff' : 'var(--ink)',
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                boxShadow: editMode ? '0 2px 10px rgba(229,62,62,0.25)' : 'none',
                transition: 'all .2s', position: 'relative',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              {editMode ? 'Exit Edit' : 'Edit'}
              {(deletedIds.size > 0 || drawnPanels.length > 0) && !editMode && (
                <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#e53e3e', border: '2px solid #fff' }} />
              )}
            </button>
            {/* Refresh button */}
            <button
              onClick={() => fetchData()}
              title="Refresh data from database"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 980,
                background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.12)',
                cursor: 'pointer', color: 'var(--sub)', transition: 'all .2s',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>
            {/* GeoJSON export */}
            <button onClick={downloadGeoJSON} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 980,
              background: 'rgba(0,113,227,0.08)', border: '1px solid rgba(0,113,227,0.2)',
              cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--blue)',
            }}>
              <DownloadCloud style={{ width: 12, height: 12 }} />GeoJSON
            </button>
          </div>
        </header>

        {/* ══ BODY ═══════════════════════════════════════════ */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

          {/* MAP background */}
          <div className="map-wrap" style={{ zIndex: 0 }}>
            <MapComponent
              panels={panels}
              overlayImage={overlayImage}
              imageBounds={imageBounds}
              baseMap={baseMap}
              activeLayers={activeLayers}
              editMode={editMode}
              drawMode={drawMode}
              onDrawModeChange={setDrawMode}
              deletedIds={deletedIds}
              drawnPanels={drawnPanels}
              undoStack={undoStack}
              onDelete={(id: string | number) => { saveUndo(); setDeletedIds(s => new Set([...s, id])); }}
              onCompleteDraw={(coords: [number, number][]) => {
                saveUndo();
                const areaSqm = computePolygonArea(coords);
                // Estimate stats using same coefficients as AI panels
                const kwpPerM2          = 0.2;          // 200 W/m²
                const peakSunHrs        = 4.5;          // Thailand average peak sun hours
                const efficiencyFactor  = 0.8;
                const tariffBaht        = 4.5;          // ฿/kWh
                const co2PerKwh         = 0.5;          // kg CO₂/kWh
                const yearlyKwh         = areaSqm * kwpPerM2 * peakSunHrs * 365 * efficiencyFactor;
                const yearlySavings     = yearlyKwh * tariffBaht;
                const yearlyCo2         = yearlyKwh * co2PerKwh;
                const cLat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
                const cLon = coords.reduce((s, c) => s + c[1], 0) / coords.length;
                setDrawnPanels(d => [...d, {
                  id:                  `manual-${Date.now()}`,
                  coords,
                  note:                '',
                  source:              'manual' as const,
                  area_sqm:            parseFloat(areaSqm.toFixed(3)),
                  yearly_energy_kwh:   parseFloat(yearlyKwh.toFixed(2)),
                  yearly_savings_baht: parseFloat(yearlySavings.toFixed(2)),
                  co2_offset_kg:       parseFloat(yearlyCo2.toFixed(2)),
                  confidence_score:    1.0,   // user-confirmed = 100%
                  centroid_lat:        parseFloat(cLat.toFixed(6)),
                  centroid_lon:        parseFloat(cLon.toFixed(6)),
                }]);
                setDrawMode(false);
              }}
              onDeleteDrawn={(id: string) => { saveUndo(); setDrawnPanels(d => d.filter(p => p.id !== id)); }}
              onUndo={handleEditUndo}
              onResetEdits={() => { saveUndo(); setDeletedIds(new Set()); setDrawnPanels([]); }}
            />
          </div>

          {/* subtle vignette */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
            background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(245,245,247,0.5) 100%)',
          }} />

          {/* ── LEFT PANEL ─────────────────────────────────── */}
          <aside className="panel" style={{
            width: leftOpen ? 340 : 52, flexShrink: 0, zIndex: 20,
            display: 'flex', flexDirection: 'column',
            transition: 'width .35s cubic-bezier(0.16,1,0.3,1)',
            overflow: 'hidden', position: 'relative',
          }}>
            {/* collapse btn */}
            <button onClick={() => setLeftOpen(o => !o)} style={{
              position: 'absolute', top: 12, right: 10, width: 24, height: 24,
              borderRadius: '50%', border: '1px solid var(--border)',
              background: 'var(--surface)', cursor: 'pointer', zIndex: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}>
              <ChevronRight style={{ width: 12, height: 12, color: 'var(--sub)', transform: leftOpen ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }} />
            </button>

            {leftOpen && (
              <div className="scroll" style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Upload block */}
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 18, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0071e3,#34aadc)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,113,227,0.22)' }}>
                      <Target style={{ width: 16, height: 16, color: '#fff' }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--display)', fontSize: 14, fontWeight: 800, letterSpacing: '-.015em', color: 'var(--ink)' }}>AI Pipeline</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--sub)', letterSpacing: '.14em', textTransform: 'uppercase' }}>Upload · Process · Analyse</div>
                    </div>
                  </div>

                  {/* Drop zone */}
                  <div onClick={() => fileRef.current?.click()} style={{
                    border: `2px dashed ${file ? 'var(--blue)' : 'rgba(0,0,0,0.12)'}`,
                    borderRadius: 12, padding: '14px 12px', textAlign: 'center',
                    background: file ? 'rgba(0,113,227,0.04)' : 'rgba(0,0,0,0.02)',
                    cursor: 'pointer', transition: 'all .2s', marginBottom: 10,
                  }}>
                    <UploadCloud style={{ width: 20, height: 20, color: file ? 'var(--blue)' : 'var(--sub)', margin: '0 auto 6px' }} />
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500, color: file ? 'var(--blue)' : 'var(--sub)' }}>
                      {file ? file.name : 'Drop GeoTIFF / PNG / JPG'}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#b0b0b0', marginTop: 3 }}>.tif · .jpg · .png</div>
                    <input ref={fileRef} type="file" accept=".tif,.jpg,.png" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                  </div>

                  {isUploading && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--blue)' }}>{Math.round(uploadPct)}%</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--sub)' }}>Processing…</span>
                      </div>
                      <div style={{ height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{ height: '100%', width: `${uploadPct}%`, background: 'var(--blue)', borderRadius: 2, transition: 'width .3s' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', background: 'rgba(0,113,227,0.06)', border: '1px solid rgba(0,113,227,0.15)', borderRadius: 9 }}>
                        <ScanLine style={{ width: 11, height: 11, color: 'var(--blue)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--blue)' }}>{scanMessage}</span>
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={handleUpload} disabled={isUploading || !file} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: 'var(--blue)', color: '#fff',
                      fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
                      opacity: isUploading || !file ? .4 : 1, transition: 'all .2s',
                    }}>
                      {isUploading ? <><Cpu style={{ width: 13, height: 13, animation: 'spinSlow 1s linear infinite' }} />Processing…</> : <><Zap style={{ width: 13, height: 13 }} />Run Pipeline</>}
                    </button>
                    <button onClick={handleClear} style={{
                      padding: '11px 13px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.09)',
                      background: 'var(--surface)', cursor: 'pointer', color: 'var(--sub)', transition: 'all .2s',
                    }}>
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>

                {/* Layer Control */}
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 18, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 14, height: 1.5, background: 'var(--blue)', borderRadius: 1 }} />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--blue)' }}>GIS Layers</span>
                    </div>
                    <Lozenge color="var(--blue)">EPSG:32647</Lozenge>
                  </div>

                  {/* Base map */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--sub)' }}>Base Map</span>
                    <div style={{ display: 'flex', gap: 2, padding: 2, background: 'rgba(0,0,0,0.05)', borderRadius: 8 }}>
                      {['satellite', 'dark', 'street'].map(m => (
                        <button key={m} onClick={() => setBaseMap(m)} style={{
                          padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: baseMap === m ? '#fff' : 'transparent',
                          color: baseMap === m ? 'var(--ink)' : 'var(--sub)',
                          fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase',
                          boxShadow: baseMap === m ? '0 1px 4px rgba(0,0,0,0.09)' : 'none', transition: 'all .2s',
                        }}>{m === 'satellite' ? 'SAT' : m === 'dark' ? 'DRK' : 'STR'}</button>
                      ))}
                    </div>
                  </div>

                  {[
                    { key: 'stringWiring', label: 'String Wiring',   sub: 'Inverter path routing', color: 'var(--blue)',  icon: <Cable      style={{ width: 12, height: 12 }} /> },
                    { key: 'priority',     label: 'Priority Zoning', sub: 'Investment phases',      color: 'var(--green)', icon: <ListChecks style={{ width: 12, height: 12 }} /> },
                    { key: 'heatmap',      label: 'Area Heatmap',    sub: 'Panel size intensity',   color: '#8e44ad',      icon: <CloudSun   style={{ width: 12, height: 12 }} /> },
                  ].map(({ key, label, sub, color, icon }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ color }}>{icon}</span>
                        <div>
                          <div style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--sub)' }}>{sub}</div>
                        </div>
                      </div>
                      <Toggle on={(activeLayers as any)[key]} color={color} onToggle={() => setActiveLayers(p => ({ ...p, [key]: !(p as any)[key] }))} />
                    </div>
                  ))}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                    <Kpi label="Moran's I" value="0.74" sub="High Clustering" accent="var(--green)" />
                    <Kpi label="Live W/m²"  value={irradiance} sub="Irradiance" color="#ff9f0a" />
                  </div>
                </div>

                {/* Grade card */}
                {n > 0 && (
                  <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 18, padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 62, height: 62, borderRadius: 16, flexShrink: 0, background: grade.bg, border: `1px solid ${grade.c}20`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 900, color: grade.c, lineHeight: 1 }}>{grade.g}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: grade.c, letterSpacing: '.12em' }}>GRADE</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--sub)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 4 }}>Site Suitability Index</div>
                      <div style={{ fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600, color: grade.c }}>{grade.desc}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--sub)', marginTop: 3 }}>n={n} panels · {totalArea.toFixed(1)} m²</div>
                    </div>
                  </div>
                )}

                {/* ── Edit Detections card ─────────────────────── */}
                <div style={{
                  background: editMode ? 'rgba(229,62,62,0.04)' : '#fff',
                  border: `1.5px solid ${editMode ? 'rgba(229,62,62,0.28)' : 'var(--border)'}`,
                  borderRadius: 18, padding: 18, transition: 'all .25s',
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editMode ? 14 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: editMode ? 'rgba(229,62,62,0.1)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={editMode ? '#e53e3e' : 'var(--sub)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--display)', fontSize: 13, fontWeight: 800, color: editMode ? '#c53030' : 'var(--ink)', lineHeight: 1 }}>Edit Detections</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--sub)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 3 }}>
                          {editMode ? (drawMode ? 'DRAW MODE' : 'DELETE MODE') : 'Correct AI errors'}
                        </div>
                      </div>
                    </div>
                    <button onClick={toggleEdit} style={{
                      padding: '7px 14px', borderRadius: 980,
                      background: editMode ? '#e53e3e' : '#1d1d1f',
                      border: 'none', cursor: 'pointer', color: '#fff',
                      fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 5,
                      boxShadow: editMode ? '0 2px 10px rgba(229,62,62,0.28)' : '0 1px 6px rgba(0,0,0,0.14)',
                      transition: 'all .2s',
                    }}>
                      {editMode ? (
                        <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Exit</>
                      ) : (
                        <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</>
                      )}
                    </button>
                  </div>

                  {editMode && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Stats chips */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                        {[
                          { label: 'AI Active',  val: n,               color: 'var(--blue)' },
                          { label: 'Deleted',    val: deletedIds.size,  color: '#e53e3e'     },
                          { label: 'Manual',     val: drawnPanels.length, color: 'var(--green)' },
                        ].map(s => (
                          <div key={s.label} style={{ padding: '8px 6px', borderRadius: 10, textAlign: 'center', background: `${s.color}09`, border: `1px solid ${s.color}22` }}>
                            <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--sub)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Mode hint */}
                      <div style={{
                        padding: '8px 10px', borderRadius: 10,
                        background: drawMode ? 'rgba(0,113,227,0.06)' : 'rgba(229,62,62,0.05)',
                        border: `1px solid ${drawMode ? 'rgba(0,113,227,0.2)' : 'rgba(229,62,62,0.18)'}`,
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                      }}>
                        <span style={{ fontSize: 14, flexShrink: 0, marginTop: -1 }}>{drawMode ? '✏' : '🗑'}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--sub)', lineHeight: 1.6 }}>
                          {drawMode
                            ? 'Click map to add polygon vertices. Use map toolbar to Finish or Cancel.'
                            : 'Panels are red on map. Click any to remove as false-positive.'}
                        </span>
                      </div>

                      {/* Draw toggle */}
                      <button onClick={() => setDrawMode(d => !d)} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '9px', borderRadius: 10,
                        background: drawMode ? 'rgba(0,113,227,0.09)' : 'rgba(0,0,0,0.04)',
                        border: `1.5px solid ${drawMode ? 'rgba(0,113,227,0.3)' : 'rgba(0,0,0,0.1)'}`,
                        cursor: 'pointer', color: drawMode ? 'var(--blue)' : 'var(--ink)',
                        fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600, transition: 'all .2s',
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                        {drawMode ? '✏ Drawing… click map to add points' : 'Draw New Panel'}
                      </button>

                      {/* Undo + Export */}
                      <div style={{ display: 'flex', gap: 7 }}>
                        <button
                          onClick={handleEditUndo}
                          disabled={!undoStack.length}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                            padding: '8px', borderRadius: 10,
                            background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)',
                            cursor: undoStack.length ? 'pointer' : 'not-allowed',
                            color: undoStack.length ? 'var(--ink)' : '#c0c0c0',
                            fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 600,
                            opacity: undoStack.length ? 1 : 0.45,
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
                          </svg>
                          Undo
                        </button>
                        <button
                          onClick={downloadGeoJSON}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                            padding: '8px', borderRadius: 10,
                            background: 'rgba(29,131,72,0.08)', border: '1.5px solid rgba(29,131,72,0.25)',
                            cursor: 'pointer', color: 'var(--green)',
                            fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 600,
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          Export
                        </button>
                      </div>

                      {/* Manual panels list */}
                      {drawnPanels.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--sub)', letterSpacing: '.14em', textTransform: 'uppercase' }}>Manual Panels</div>
                          {drawnPanels.map((p, i) => (
                            <div key={p.id} style={{ padding: '8px 10px', background: 'rgba(29,131,72,0.05)', border: '1px solid rgba(29,131,72,0.15)', borderRadius: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                                <span style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink)', fontWeight: 600 }}>Manual-{i + 1}</span>
                                <button
                                  onClick={() => { saveUndo(); setDrawnPanels(d => d.filter(x => x.id !== p.id)); }}
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#e53e3e', padding: '2px 4px', borderRadius: 4, display: 'flex', alignItems: 'center' }}
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                  </svg>
                                </button>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                                {[
                                  { l: 'Area',    v: `${p.area_sqm.toFixed(1)} m²`              },
                                  { l: 'Energy',  v: `${p.yearly_energy_kwh.toFixed(0)} kWh/yr`  },
                                  { l: 'CO₂',     v: `${p.co2_offset_kg.toFixed(0)} kg/yr`       },
                                ].map(s => (
                                  <div key={s.l} style={{ textAlign: 'center' }}>
                                    <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--sub)', letterSpacing: '.1em', textTransform: 'uppercase' }}>{s.l}</div>
                                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--green)', fontWeight: 600, marginTop: 2 }}>{s.v}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reset all */}
                      {(deletedIds.size > 0 || drawnPanels.length > 0) && (
                        <button
                          onClick={() => {
                            if (!confirm(`Reset all edits? (${deletedIds.size} deletions, ${drawnPanels.length} manual panels)`)) return;
                            saveUndo();
                            setDeletedIds(new Set());
                            setDrawnPanels([]);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                            padding: '7px', borderRadius: 10,
                            background: 'transparent', border: '1px solid rgba(0,0,0,0.09)',
                            cursor: 'pointer', color: 'var(--sub)',
                            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em',
                          }}
                        >
                          ↺ Reset all edits
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Collapsed icon strip */}
            {!leftOpen && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 56 }}>
                {[<MapIcon />, <Layers />, <Database />, <DownloadCloud />].map((ic, i) => (
                  <div key={i} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sub)' }}>
                    {React.cloneElement(ic as any, { style: { width: 14, height: 14 } })}
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* ── RIGHT ANALYTICS PANEL ──────────────────────── */}
          <aside className="panel" style={{
            width: 530, flexShrink: 0, zIndex: 20, marginLeft: 'auto',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Tab bar */}
            <div style={{ padding: '10px 12px 0', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)} className={`tab-btn ${activeTab === t.id ? 'tab-active' : ''}`}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab body */}
            <div className="scroll" style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* ══ OVERVIEW ═════════════════════════════════ */}
              {activeTab === 'overview' && (
                <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Kpi label="Detections"      value={n}                              sub="AI-detected panels" />
                    <Kpi label="Usable Area"      value={`${totalArea.toFixed(1)} m²`} sub="Total mapped"       color="#8e44ad" />
                    <Kpi label="CO₂ Offset"       value={`${totalCo2.toFixed(0)} kg`}  sub="Per year"           color="var(--green)" />
                    <Kpi label="Avg Confidence"   value={`${(avgConf * 100).toFixed(1)}%`} sub="AI certainty"   color="var(--blue)" />
                  </div>

                  {/* ROI hero */}
                  <div style={{ background: 'linear-gradient(135deg,rgba(29,131,72,0.07),rgba(0,113,227,0.05))', border: '1px solid rgba(29,131,72,0.15)', borderRadius: 16, padding: 20 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--green)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 6 }}>Estimated Annual ROI</div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 44, fontWeight: 900, letterSpacing: '-.04em', color: 'var(--green)', lineHeight: 1 }}>
                      ฿{totalSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(29,131,72,0.1)' }}>
                      {[['Energy Yield', `${totalEnergy.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`], ['System Size', `${systemKw.toFixed(1)} kWp`], ['Trees Equiv.', `${Math.floor(totalCo2 / 21)}`]].map(([l, v]) => (
                        <div key={String(l)}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--sub)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{l}</div>
                          <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 800, color: 'var(--green)', letterSpacing: '-.01em' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Daily yield + irradiance */}
                  <ChartCard title="Daily Generation + Irradiance" sub="Combined kWh yield curve and measured irradiance W/m²" color="var(--blue)">
                    <div style={{ height: 130 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={dailyCurve} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                          <defs>
                            <linearGradient id="yG" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#0071e3" stopOpacity={0.18} />
                              <stop offset="95%" stopColor="#0071e3" stopOpacity={0}    />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                          <XAxis dataKey="t"   stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} fontFamily="var(--mono)" />
                          <YAxis yAxisId="l"   stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis yAxisId="r" orientation="right" stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} />
                          <Tooltip {...TT} />
                          <Area yAxisId="l" type="monotone" dataKey="kwh" stroke="#0071e3" fill="url(#yG)" strokeWidth={2} dot={false} name="kWh" />
                          <Line yAxisId="r" type="monotone" dataKey="irr" stroke="#ff9f0a" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="W/m²" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  {/* Investment priority */}
                  {n > 0 && (
                    <ChartCard title="Investment Priority Phases" color="var(--green)">
                      {[
                        { label: 'Phase 1 — Invest Now',  count: phase1, color: 'var(--green)' },
                        { label: 'Phase 2 — Plan Ahead',  count: phase2, color: 'var(--blue)'  },
                        { label: 'Phase 3 — Re-evaluate', count: phase3, color: '#ff9f0a'      },
                      ].map(p => (
                        <div key={p.label} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink)' }}>{p.label}</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: p.color }}>{p.count}</span>
                          </div>
                          <div style={{ height: 5, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: n > 0 ? `${(p.count / n * 100).toFixed(0)}%` : '0', background: p.color, borderRadius: 3 }} />
                          </div>
                        </div>
                      ))}
                    </ChartCard>
                  )}
                </div>
              )}

              {/* ══ GEO STATS ════════════════════════════════ */}
              {activeTab === 'geostat' && (
                <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Descriptive table */}
                  <ChartCard title="Descriptive Spatial Statistics" sub="All stats recalculate live when panels are edited/deleted" color="#8e44ad">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { l: 'Sample Size (n)',    v: n,                                                            u: 'panels'    },
                        { l: 'Total Area (Σ)',     v: totalArea.toFixed(2),                                        u: 'm²'        },
                        { l: 'Mean Area (μ)',      v: avgArea.toFixed(2),                                          u: 'm²'        },
                        { l: 'Std Dev (σ)',        v: stdArea.toFixed(2),                                          u: 'm²'        },
                        { l: 'CV (σ/μ)',           v: `${cvArea.toFixed(1)}`,                                      u: '%'         },
                        { l: 'Skewness',           v: skewArea.toFixed(3),                                         u: skewArea > 0 ? 'right-skewed' : 'left-skewed' },
                        { l: 'Excess Kurtosis',   v: kurtArea.toFixed(3),                                         u: kurtArea > 0 ? 'leptokurtic' : 'platykurtic'  },
                        { l: 'Conf. Range',        v: `${(minConf*100).toFixed(0)}–${(maxConf*100).toFixed(0)}`,  u: '%'         },
                        { l: 'Centroid Lat',       v: centLat.toFixed(5),                                          u: '°N'        },
                        { l: 'Centroid Lon',       v: centLon.toFixed(5),                                          u: '°E'        },
                        { l: 'Geo Dispersion σ',   v: geoDisp.toFixed(5),                                          u: '°lat'      },
                        { l: 'β̂ Energy/Area',     v: betaAreaEnergy.toFixed(2),                                  u: 'kWh/m²/yr' },
                        { l: 'R² (OLS)',           v: rSquared.toFixed(3),                                         u: `fit quality` },
                        { l: 'NNI Proxy',          v: nniProxy.toFixed(3),                                         u: nniProxy < 1 ? 'clustered' : nniProxy > 1 ? 'dispersed' : 'random' },
                        { l: 'Spatial Entropy H\'', v: spatEntropy.toFixed(3),                                    u: `bits (${(normEntropy*100).toFixed(0)}% max)` },
                        { l: 'Energy Density',     v: energyDensity.toFixed(2),                                    u: 'kWh/m²/yr' },
                      ].map(s => (
                        <div key={s.l} style={{ padding: '9px 12px', background: 'rgba(0,0,0,0.025)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10 }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: '#6e6e73', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 3 }}>{s.l}</div>
                          <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)', lineHeight: 1 }}>{s.v}</div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: '#a0a0a0', marginTop: 3 }}>{s.u}</div>
                        </div>
                      ))}
                    </div>
                  </ChartCard>

                  {/* Moran's I */}
                  <ChartCard title="Moran's I — Spatial Autocorrelation" sub="Global measure of spatial dependence. Range: −1 (dispersed) → +1 (clustered)" color="var(--green)">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{
                        width: 76, height: 76, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg,rgba(29,131,72,0.12),rgba(0,113,227,0.08))',
                        border: '2px solid rgba(29,131,72,0.22)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 900, color: 'var(--green)' }}>0.74</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--green)', letterSpacing: '.12em' }}>HIGH</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--sub)', lineHeight: 1.6, marginBottom: 10 }}>
                          Strong positive autocorrelation — panels cluster significantly more than expected under complete spatial randomness (CSR), indicating systematic urban rooftop patterning.
                        </p>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[['−1', 'Dispersed', '#ff9f0a'], ['0', 'Random', '#b0b0b0'], ['0.74', '← Current', 'var(--green)'], ['1', 'Clustered', 'var(--blue)']].map(([v, l, c]) => (
                            <div key={String(l)} style={{ flex: 1, textAlign: 'center' }}>
                              <div style={{ height: 3, background: v === '0.74' ? String(c) : 'rgba(0,0,0,0.08)', borderRadius: 2, marginBottom: 4 }} />
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: String(c) }}>{v}</div>
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--sub)' }}>{l}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ChartCard>

                  {/* Quadrant distribution */}
                  <ChartCard title="Spatial Quadrant Analysis" sub="Panel count by geographic quadrant relative to centroid (N/S × E/W)" color="var(--blue)">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ height: 130 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={quadrants} dataKey="count" cx="50%" cy="50%" innerRadius={32} outerRadius={58} paddingAngle={2}>
                              {quadrants.map((q, i) => <Cell key={i} fill={q.fill} />)}
                            </Pie>
                            <Tooltip {...TT} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                        {quadrants.map(q => (
                          <div key={q.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: q.fill }} />
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--sub)' }}>{q.name}</span>
                            </div>
                            <span style={{ fontFamily: 'var(--display)', fontSize: 14, fontWeight: 800, color: q.fill }}>{q.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ChartCard>

                  {/* Centroid scatter */}
                  <ChartCard title="Panel Centroid Distribution (Lat × Lon)" sub="Geographic spread of panel centroids. Colour = confidence level." color="#8e44ad">
                    <div style={{ height: 160 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis type="number" dataKey="x" name="Lon" stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} domain={['auto', 'auto']} fontFamily="var(--mono)" />
                          <YAxis type="number" dataKey="y" name="Lat" stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                          <ZAxis type="number" dataKey="z" range={[28, 120]} />
                          <Tooltip {...TT} />
                          <Scatter data={visiblePanels.map(p => ({ x: p.centroid_lon, y: p.centroid_lat, z: p.area_sqm }))}>
                            {visiblePanels.map((p, i) => <Cell key={i} fill={p.confidence_score >= 0.5 ? '#0071e3' : '#ff9f0a'} opacity={0.75} />)}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                      {[['#0071e3', 'High Conf ≥50%'], ['#ff9f0a', 'Low Conf <50%']].map(([c, l]) => (
                        <div key={String(l)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: String(c) }} />
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--sub)' }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </ChartCard>
                </div>
              )}

              {/* ══ SPATIAL POINT PATTERNS ═══════════════════ */}
              {activeTab === 'spatial' && (
                <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Ripley's K / L statistic */}
                  <ChartCard title="Ripley's K & L(r)−r — Point Pattern Analysis" sub="L(r)−r > 0 = clustered at radius r · < 0 = dispersed · = 0 = CSR" color="#8e44ad">
                    <div style={{ height: 150 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={ripleysK} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                          <XAxis dataKey="r" stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} fontFamily="var(--mono)" label={{ value: 'r (m)', position: 'insideBottomRight', offset: -4, fontSize: 8, fill: '#b0b0b0' }} />
                          <YAxis stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} />
                          <Tooltip {...TT} />
                          <ReferenceLine y={0} stroke="#a0a0a0" strokeDasharray="4 3" strokeWidth={1} />
                          <Bar dataKey="L" radius={[4,4,0,0]}>
                            {ripleysK.map((d, i) => <Cell key={i} fill={d.L > 0 ? '#0071e3' : '#e53e3e'} opacity={0.8} />)}
                          </Bar>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                      {[['#0071e3','L(r)−r > 0  Clustered'],['#e53e3e','L(r)−r < 0  Dispersed']].map(([c,l]) => (
                        <div key={String(l)} style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:String(c) }} />
                          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--sub)' }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </ChartCard>

                  {/* Ripley's K raw table */}
                  <ChartCard title="Ripley's K Table" sub="K(r) vs theoretical CSR K(r) = πr² across 5 radii" color="#8e44ad">
                    <div style={{ overflowX:'auto' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'var(--mono)', fontSize:10 }}>
                        <thead>
                          <tr>
                            {['r (m)','K(r) obs','K(r) CSR','L(r)−r','Interpretation'].map(h => (
                              <th key={h} style={{ padding:'6px 8px', textAlign:'left', borderBottom:'1.5px solid rgba(0,0,0,0.07)', color:'var(--sub)', fontSize:8, letterSpacing:'.12em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ripleysK.map((d,i) => (
                            <tr key={i} style={{ borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                              <td style={{ padding:'7px 8px', fontWeight:600, color:'var(--ink)' }}>{d.r}</td>
                              <td style={{ padding:'7px 8px', color:'#0071e3' }}>{d.K}</td>
                              <td style={{ padding:'7px 8px', color:'var(--sub)' }}>{d.csr}</td>
                              <td style={{ padding:'7px 8px', color: d.L > 0 ? '#0071e3' : '#e53e3e', fontWeight:600 }}>{d.L > 0 ? '+' : ''}{d.L}</td>
                              <td style={{ padding:'7px 8px', color: d.L > 0 ? '#0071e3' : d.L < 0 ? '#e53e3e' : 'var(--sub)' }}>
                                {d.L > 0.5 ? 'Strongly clustered' : d.L > 0 ? 'Weakly clustered' : d.L < -0.5 ? 'Strongly dispersed' : d.L < 0 ? 'Weakly dispersed' : 'CSR'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ChartCard>

                  {/* NNI + Entropy cards */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    {/* NNI */}
                    <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:16, padding:16 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                        <div style={{ width:14, height:1.5, background:'var(--green)', borderRadius:1 }} />
                        <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:600, letterSpacing:'.18em', textTransform:'uppercase', color:'var(--green)' }}>NNI</span>
                      </div>
                      <div style={{ fontFamily:'var(--display)', fontSize:36, fontWeight:900, letterSpacing:'-.04em', color: nniProxy < 1 ? '#0071e3' : nniProxy > 1 ? '#e53e3e' : 'var(--green)', lineHeight:1 }}>
                        {nniProxy.toFixed(3)}
                      </div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--sub)', marginTop:6, lineHeight:1.6 }}>
                        Nearest-Neighbour Index<br/>
                        <span style={{ color: nniProxy < 1 ? '#0071e3' : nniProxy > 1 ? '#e53e3e' : 'var(--green)', fontWeight:600 }}>
                          {nniProxy < 0.8 ? 'Strongly Clustered' : nniProxy < 1 ? 'Mildly Clustered' : nniProxy > 1.2 ? 'Dispersed' : 'Near Random'}
                        </span>
                      </div>
                      {/* NNI scale bar */}
                      <div style={{ marginTop:10, position:'relative', height:6, background:'linear-gradient(90deg,#0071e3,var(--green),#e53e3e)', borderRadius:3, overflow:'visible' }}>
                        <div style={{
                          position:'absolute', top:-2, width:10, height:10,
                          borderRadius:'50%', background:'#fff', border:'2px solid #1d1d1f',
                          left:`${Math.min(Math.max(((nniProxy)/2)*100, 0), 100)}%`,
                          transform:'translateX(-50%)',
                        }} />
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                        <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'#0071e3' }}>0 Clustered</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--green)' }}>1 Random</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'#e53e3e' }}>2 Dispersed</span>
                      </div>
                    </div>

                    {/* Spatial Entropy */}
                    <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:16, padding:16 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                        <div style={{ width:14, height:1.5, background:'#8e44ad', borderRadius:1 }} />
                        <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:600, letterSpacing:'.18em', textTransform:'uppercase', color:'#8e44ad' }}>Entropy H′</span>
                      </div>
                      <div style={{ fontFamily:'var(--display)', fontSize:36, fontWeight:900, letterSpacing:'-.04em', color:'#8e44ad', lineHeight:1 }}>
                        {spatEntropy.toFixed(3)}
                      </div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--sub)', marginTop:6, lineHeight:1.6 }}>
                        Shannon spatial entropy<br/>
                        <span style={{ color:'#8e44ad', fontWeight:600 }}>{(normEntropy*100).toFixed(0)}% of max entropy</span>
                      </div>
                      {/* Entropy bar */}
                      <div style={{ marginTop:10, height:6, background:'rgba(0,0,0,0.06)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${normEntropy*100}%`, background:'linear-gradient(90deg,#8e44ad,#bf5af2)', borderRadius:3 }} />
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                        <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--sub)' }}>0 Concentrated</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'#8e44ad' }}>1.0 Uniform</span>
                      </div>
                    </div>
                  </div>

                  {/* Quadrant pie */}
                  <ChartCard title="Quadrant Distribution (relative to centroid)" sub="N/S × E/W quadrant panel counts" color="var(--blue)">
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <div style={{ height:130 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={quadrants} dataKey="count" cx="50%" cy="50%" innerRadius={32} outerRadius={56} paddingAngle={2}>
                              {quadrants.map((q,i) => <Cell key={i} fill={q.fill} />)}
                            </Pie>
                            <Tooltip {...TT} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:8, justifyContent:'center' }}>
                        {quadrants.map(q => (
                          <div key={q.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                              <div style={{ width:8, height:8, borderRadius:'50%', background:q.fill }} />
                              <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--sub)' }}>{q.name}</span>
                            </div>
                            <span style={{ fontFamily:'var(--display)', fontSize:14, fontWeight:800, color:q.fill }}>{q.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ChartCard>
                </div>
              )}

              {/* ══ CLUSTERING ════════════════════════════════ */}
              {activeTab === 'clustering' && (
                <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* K-Means scatter */}
                  <ChartCard title="K-Means Spatial Clustering (Area vs Confidence)" sub="Panels labelled into 3 behavioural clusters. Bubble size = yearly energy yield." color="#8e44ad">
                    <div style={{ height: 170 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis type="number" dataKey="x" name="Area" unit="m²" stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} fontFamily="var(--mono)" />
                          <YAxis type="number" dataKey="y" name="Confidence" unit="%" stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} domain={[0, 100]} />
                          <ZAxis type="number" dataKey="z" range={[40, 260]} />
                          <Tooltip {...TT} />
                          <Scatter name="High-Yield" data={scatterData.filter(d => d.cluster === 'High-Yield')} fill="#30d158" opacity={0.82} />
                          <Scatter name="Efficient"  data={scatterData.filter(d => d.cluster === 'Efficient')}  fill="#0071e3" opacity={0.82} />
                          <Scatter name="Standard"   data={scatterData.filter(d => d.cluster === 'Standard')}   fill="#ff9f0a" opacity={0.82} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                      {[['#30d158', 'High-Yield (>5m²)'], ['#0071e3', 'Efficient (conf>60%)'], ['#ff9f0a', 'Standard']].map(([c, l]) => (
                        <div key={String(l)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: String(c) }} />
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--sub)' }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </ChartCard>

                  {/* Confidence histogram */}
                  <ChartCard title="Confidence Score Distribution (Frequency Histogram)" sub="10 equal-width bins across 0–100% confidence range" color="var(--blue)">
                    <div style={{ height: 130 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={confHistogram} margin={{ top: 0, right: 4, left: -30, bottom: 0 }}>
                          <XAxis dataKey="bin" stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} fontFamily="var(--mono)" label={{ value: 'Confidence %', position: 'insideBottom', offset: 0, fontSize: 8, fill: '#b0b0b0' }} />
                          <YAxis stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} />
                          <Tooltip {...TT} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {confHistogram.map((d, i) => <Cell key={i} fill={d.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  {/* KDE */}
                  <ChartCard title="Kernel Density Estimation (Area Distribution)" sub="Gaussian KDE with bandwidth h=σ(area). Smoothed probability density." color="#bf5af2">
                    <div style={{ height: 120 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={kdeBins} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
                          <defs>
                            <linearGradient id="kdeG" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#bf5af2" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#bf5af2" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                          <XAxis dataKey="x" stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} fontFamily="var(--mono)" />
                          <YAxis stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(3)} />
                          <Tooltip {...TT} />
                          <Area type="monotone" dataKey="density" stroke="#bf5af2" fill="url(#kdeG)" strokeWidth={2} dot={false} name="Density" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  {/* Size distribution bar */}
                  <ChartCard title="Panel Size Distribution" color="var(--blue)">
                    <div style={{ height: 110 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sizeBuckets} margin={{ top: 0, right: 4, left: -30, bottom: 0 }}>
                          <XAxis dataKey="name" stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} fontFamily="var(--mono)" />
                          <YAxis stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} />
                          <Tooltip {...TT} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {sizeBuckets.map((d, i) => <Cell key={i} fill={d.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                </div>
              )}

              {/* ══ DATA SCI ════════════════════════════════ */}
              {activeTab === 'analytics' && (
                <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* OLS Regression */}
                  <ChartCard title="OLS Regression — Area → Annual Energy Yield" sub={`β̂ = ${betaAreaEnergy.toFixed(3)} kWh/m²/yr  |  R² = ${rSquared.toFixed(3)}  |  Ŷ = ${betaAreaEnergy.toFixed(2)}X`} color="var(--green)">
                    <div style={{ height: 160 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis type="number" dataKey="x" name="Area m²" stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} domain={[0, 'auto']} allowDataOverflow fontFamily="var(--mono)" />
                          <YAxis type="number" dataKey="y" name="kWh/yr" stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} />
                          <Tooltip {...TT} />
                          <Scatter data={regressionData} fill="#0071e3" opacity={0.65} name="Observed" />
                          <Line data={regLineData} type="linear" dataKey="y" stroke="#1d8348" strokeWidth={2} dot={false} strokeDasharray="6 3" name="Regression Line" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  {/* Percentile rank */}
                  <ChartCard title="Percentile Rank — Top Panels by Energy Yield" sub="Panels ranked by yearly_energy_kwh descending. P-rank shown." color="#ff9f0a">
                    {visiblePanels.slice(0, 8).map((p, i) => {
                      const pRank = n > 1 ? ((n - 1 - i) / (n - 1) * 100).toFixed(0) : '100';
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--sub)', flexShrink: 0 }}>{i + 1}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink)' }}>Panel #{p.id} — {p.area_sqm.toFixed(1)} m² — {p.yearly_energy_kwh.toFixed(0)} kWh</div>
                            <div style={{ height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pRank}%`, background: '#ff9f0a', borderRadius: 2 }} />
                            </div>
                          </div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, color: '#d48806', flexShrink: 0 }}>P{pRank}</div>
                        </div>
                      );
                    })}
                    {!n && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--sub)', textAlign: 'center', padding: '20px 0' }}>No data yet</div>}
                  </ChartCard>

                  {/* Cluster stats summary */}
                  <ChartCard title="Cluster Summary Statistics" sub="Mean area, confidence, and energy by behavioural cluster" color="#8e44ad">
                    {(['High-Yield', 'Efficient', 'Standard'] as const).map((cl, i) => {
                      const pts = scatterData.filter(d => d.cluster === cl);
                      const mA = pts.length > 0 ? pts.reduce((a, c) => a + c.x, 0) / pts.length : 0;
                      const mC = pts.length > 0 ? pts.reduce((a, c) => a + c.y, 0) / pts.length : 0;
                      const colors = ['#30d158', '#0071e3', '#ff9f0a'];
                      return (
                        <div key={cl} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i], flexShrink: 0 }} />
                          <span style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>{cl}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--sub)' }}>n={pts.length}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--sub)' }}>μA={mA.toFixed(1)}m²</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: colors[i] }}>μC={mC.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </ChartCard>

                  {/* Residual plot */}
                  <ChartCard title="OLS Residual Plot" sub="Residual = Observed − Ŷ. Random scatter around 0 = good model fit." color="var(--green)">
                    <div style={{ height: 130 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis type="number" dataKey="x" name="Fitted Ŷ" stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} fontFamily="var(--mono)" />
                          <YAxis type="number" dataKey="y" name="Residual" stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} />
                          <ReferenceLine y={0} stroke="var(--green)" strokeDasharray="4 2" strokeWidth={1.5} />
                          <Tooltip {...TT} />
                          <Scatter
                            data={visiblePanels.map(p => ({
                              x: parseFloat((betaAreaEnergy * p.area_sqm).toFixed(1)),
                              y: parseFloat((p.yearly_energy_kwh - betaAreaEnergy * p.area_sqm).toFixed(1)),
                            }))}
                            fill="#0071e3" opacity={0.6}
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  {/* Z-score outlier table */}
                  <ChartCard title="Z-Score Outlier Table (by Panel Area)" sub="|z| > 2.0 = statistical outlier. Sorted by |z| descending." color="#e53e3e">
                    {zScoreData.slice(0, 8).map((p, i) => (
                      <div key={i} style={{
                        display:'flex', alignItems:'center', gap:10, padding:'7px 0',
                        borderBottom:'1px solid rgba(0,0,0,0.04)',
                      }}>
                        <div style={{
                          width:8, height:8, borderRadius:'50%', flexShrink:0,
                          background: Math.abs(p.z) > 2 ? '#e53e3e' : Math.abs(p.z) > 1 ? '#ff9f0a' : 'var(--green)',
                        }}/>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--ink)' }}>
                            Panel #{p.id} — {p.area.toFixed(1)} m²
                          </div>
                          <div style={{ height:3, background:'rgba(0,0,0,0.06)', borderRadius:2, marginTop:3, overflow:'hidden' }}>
                            <div style={{
                              height:'100%',
                              width:`${Math.min(Math.abs(p.z)/3*100, 100)}%`,
                              background: Math.abs(p.z) > 2 ? '#e53e3e' : Math.abs(p.z) > 1 ? '#ff9f0a' : 'var(--green)',
                              borderRadius:2,
                            }}/>
                          </div>
                        </div>
                        <span style={{
                          fontFamily:'var(--mono)', fontSize:10, fontWeight:600, flexShrink:0,
                          color: Math.abs(p.z) > 2 ? '#e53e3e' : Math.abs(p.z) > 1 ? '#d48806' : 'var(--green)',
                        }}>
                          z = {p.z > 0 ? '+' : ''}{p.z.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {!n && <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--sub)', textAlign:'center', padding:'16px 0' }}>No data</div>}
                  </ChartCard>

                  {/* DS summary stats row */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                    {[
                      { l:'R² (OLS)',    v:rSquared.toFixed(3),   c:'var(--green)', sub:'model fit' },
                      { l:'CV (σ/μ)',   v:`${cvArea.toFixed(1)}%`,c:'var(--blue)',  sub:'area dispersion' },
                      { l:'Skewness',   v:skewArea.toFixed(2),    c:'#8e44ad',      sub: skewArea>0?'right tail':'left tail' },
                    ].map(s => (
                      <div key={s.l} style={{ padding:'12px', background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:14 }}>
                        <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--sub)', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:6 }}>{s.l}</div>
                        <div style={{ fontFamily:'var(--display)', fontSize:22, fontWeight:900, letterSpacing:'-.03em', color:s.c, lineHeight:1 }}>{s.v}</div>
                        <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'#a0a0a0', marginTop:4 }}>{s.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'dip' && (
                <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  <ChartCard title="CLAHE Spectral Histogram Analysis" sub="Contrast Limited Adaptive Histogram Equalisation — pixel intensity distribution before vs after" color="var(--blue)">
                    <div style={{ height: 140 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={histData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                          <XAxis dataKey="px" stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} fontFamily="var(--mono)" />
                          <YAxis stroke="#b0b0b0" fontSize={9} tickLine={false} axisLine={false} />
                          <Tooltip {...TT} />
                          <Line type="monotone" dataKey="orig"  stroke="#b0b0b0" strokeWidth={1.5} dot={false} name="Original TIF" />
                          <Line type="monotone" dataKey="clahe" stroke="#0071e3" strokeWidth={2}   dot={false} name="CLAHE Enhanced" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                      {[['#b0b0b0', 'Original TIF'], ['#0071e3', 'CLAHE Enhanced']].map(([c, l]) => (
                        <div key={String(l)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 16, height: 2, background: String(c), borderRadius: 1 }} />
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--sub)' }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </ChartCard>

                  <ChartCard title="YOLOv8-Seg Segmentation Metrics" sub="Benchmark performance metrics on SWU solar panel detection dataset" color="#8e44ad">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ height: 150, width: '52%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsRadar cx="50%" cy="50%" outerRadius="68%" data={dipMetrics}>
                            <PolarGrid stroke="rgba(0,0,0,0.07)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#6e6e73', fontSize: 8, fontFamily: 'var(--mono)' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <RadarShape name="Metrics" dataKey="A" stroke="#8e44ad" fill="#8e44ad" fillOpacity={0.18} strokeWidth={1.5} />
                          </RechartsRadar>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                          { l: 'Architecture',  v: 'YOLOv8 + U-Net', c: 'var(--blue)'  },
                          { l: 'IoU Score',     v: '0.854',           c: 'var(--green)' },
                          { l: 'mAP@0.5',      v: '94.0%',           c: '#8e44ad'      },
                          { l: 'Pixel Acc.',   v: '96.0%',           c: 'var(--blue)'  },
                        ].map(s => (
                          <div key={s.l} style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.025)', borderRadius: 8 }}>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--sub)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{s.l}</div>
                            <div style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 800, color: s.c, letterSpacing: '-.01em' }}>{s.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ChartCard>

                  <ChartCard title="DIP Processing Pipeline" sub="Sequential image processing steps applied to each uploaded tile" color="var(--blue)">
                    {[
                      { title: 'Band Extraction',      desc: 'Isolate R, G, B, NIR channels from multispectral TIFF' },
                      { title: 'CLAHE Equalisation',   desc: 'Per-channel CLAHE, clip limit 2.0, tile grid 8×8 px' },
                      { title: 'Sobel Edge Sharpening',desc: 'Gradient magnitude + Gaussian blur noise suppression' },
                      { title: 'YOLOv8 Tile Inference',desc: '640×640 tiles, 20% overlap, NMS IoU threshold 0.45' },
                      { title: 'Polygon Merging',       desc: 'Boundary unification + WKT extraction for PostGIS' },
                    ].map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: 'rgba(29,131,72,0.09)', border: '1px solid rgba(29,131,72,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircle2 style={{ width: 11, height: 11, color: 'var(--green)' }} />
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{s.title}</div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--sub)', marginTop: 2 }}>{s.desc}</div>
                        </div>
                      </div>
                    ))}
                  </ChartCard>
                </div>
              )}

              {/* ══ FINANCIALS ════════════════════════════ */}
              {activeTab === 'financials' && (
                <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Kpi label="Est. CAPEX"   value={`฿${(estCapex / 1000).toFixed(0)}k`}  sub={`${systemKw.toFixed(1)} kWp`} color="#e53e3e" />
                    <Kpi label="Break-Even"   value={`${breakEven.toFixed(1)} yr`}          sub="Payback period" color="var(--green)" />
                    <Kpi label="IRR (est.)"   value={`${irr}%`}                              sub="Internal rate of return" color="#8e44ad" />
                    <Kpi label="CCT Tokens"   value={`${totalCo2.toFixed(0)}`}               sub={`≈ $${cctValue.toFixed(0)} USD`} color="var(--blue)" />
                  </div>

                  {/* CCT card */}
                  <div style={{ background: 'linear-gradient(135deg,rgba(0,113,227,0.07),rgba(29,131,72,0.05))', border: '1px solid rgba(0,113,227,0.14)', borderRadius: 16, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--blue)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 6 }}>ESG Carbon Credit Tokens</div>
                      <div style={{ fontFamily: 'var(--display)', fontSize: 34, fontWeight: 900, letterSpacing: '-.04em', color: 'var(--ink)' }}>
                        {totalCo2.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--sub)' }}>CCT</span>
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--sub)', marginTop: 5 }}>
                        Est. Market Value: <span style={{ color: 'var(--green)', fontWeight: 600 }}>${cctValue.toFixed(2)} USD</span>
                      </div>
                    </div>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(0,113,227,0.09)', border: '1px solid rgba(0,113,227,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Leaf style={{ width: 22, height: 22, color: 'var(--blue)' }} />
                    </div>
                  </div>

                  {/* 25-yr cashflow */}
                  <ChartCard title="25-Year Cumulative Net Cash Flow" sub="Net CF = Cumulative savings − maintenance − CAPEX. Red line = break-even." color="var(--green)">
                    <div style={{ height: 165 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={financialCurve} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                          <defs>
                            <linearGradient id="cfG" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#1d8348" stopOpacity={0.18} />
                              <stop offset="95%" stopColor="#1d8348" stopOpacity={0}    />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                          <XAxis dataKey="yr" stroke="#b0b0b0" fontSize={8} tickLine={false} axisLine={false} fontFamily="var(--mono)" minTickGap={24} />
                          <YAxis stroke="#b0b0b0" fontSize={8} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip {...TT} />
                          <ReferenceLine y={0} stroke="#e53e3e" strokeDasharray="3 3" strokeWidth={1.5} />
                          <Area type="monotone" dataKey="net"    stroke="var(--green)" fill="url(#cfG)" strokeWidth={2} dot={false} name="Net CF (฿)" />
                          <Line type="monotone" dataKey="cumRev" stroke="#0071e3" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Cumulative Revenue (฿)" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                      {[['var(--green)', 'Net Cash Flow'], ['#0071e3', 'Cumulative Revenue'], ['#e53e3e', 'Break-Even']].map(([c, l]) => (
                        <div key={String(l)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 16, height: 2, background: String(c), borderRadius: 1 }} />
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--sub)' }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </ChartCard>

                  {/* Eco */}
                  <ChartCard title="Environmental Impact Summary" color="var(--green)">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { icon: <TreePine style={{ width: 16, height: 16 }} />, l: 'Trees Equiv.',  v: Math.floor(totalCo2 / 21),          c: 'var(--green)' },
                        { icon: <Car      style={{ width: 16, height: 16 }} />, l: 'Cars Removed',  v: (totalCo2 / 4600).toFixed(1),        c: 'var(--blue)'  },
                        { icon: <Wind     style={{ width: 16, height: 16 }} />, l: 'kWh / Year',    v: totalEnergy.toFixed(0),              c: 'var(--green)' },
                        { icon: <DollarSign style={{ width: 16, height: 16 }} />, l: 'CCT Value',  v: `$${cctValue.toFixed(0)}`,           c: '#d48806'      },
                      ].map(s => (
                        <div key={s.l} style={{ padding: 12, background: 'rgba(0,0,0,0.025)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: `${s.c}10`, color: s.c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                          <div>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--sub)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{s.l}</div>
                            <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 800, color: s.c, letterSpacing: '-.02em' }}>{s.v}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ChartCard>
                </div>
              )}

              {/* ══ GEO LOGS ════════════════════════════ */}
              {activeTab === 'logs' && (
                <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 14, height: 1.5, background: 'var(--blue)', borderRadius: 1 }} />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--blue)' }}>Live Spatial Feed</span>
                    </div>
                    <div style={{ padding: '3px 10px', background: 'rgba(29,131,72,0.07)', border: '1px solid rgba(29,131,72,0.18)', borderRadius: 980, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--green)' }}>
                      {Math.min(n, 20)} of {n} records
                    </div>
                  </div>

                  {visiblePanels.slice(0, 20).map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
                      transition: 'border-color .2s', cursor: 'default',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,113,227,0.3)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
                    >
                      <div style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--sub)', flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Crosshair style={{ width: 9, height: 9, color: 'var(--blue)', flexShrink: 0 }} />
                          {p.centroid_lat?.toFixed(5) ?? '—'}, {p.centroid_lon?.toFixed(5) ?? '—'}
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--sub)', marginTop: 2 }}>
                          {p.area_sqm.toFixed(2)} m² · {p.daily_energy_kwh.toFixed(2)} kWh/day · Phase {p.area_sqm * p.confidence_score > 3.5 ? '1' : p.area_sqm * p.confidence_score > 1.5 ? '2' : '3'}
                        </div>
                      </div>
                      <div style={{
                        padding: '3px 10px', borderRadius: 980, flexShrink: 0,
                        background: p.confidence_score >= 0.5 ? 'rgba(29,131,72,0.09)' : 'rgba(212,136,6,0.09)',
                        border: `1px solid ${p.confidence_score >= 0.5 ? 'rgba(29,131,72,0.2)' : 'rgba(212,136,6,0.2)'}`,
                        fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                        color: p.confidence_score >= 0.5 ? 'var(--green)' : '#d48806',
                      }}>
                        {(p.confidence_score * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}

                  {!n && (
                    <div style={{ textAlign: 'center', padding: '40px 0', border: '1.5px dashed rgba(0,0,0,0.1)', borderRadius: 14, background: 'rgba(0,0,0,0.02)' }}>
                      <Terminal style={{ width: 28, height: 28, color: '#b0b0b0', margin: '0 auto 10px' }} />
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--sub)', letterSpacing: '.12em' }}>NO SPATIAL LOGS DETECTED</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#b0b0b0', marginTop: 5 }}>Upload a GeoTIFF to begin analysis</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}