'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  MapContainer, TileLayer, Polygon, Popup,
  useMap, ImageOverlay, Polyline, Tooltip, CircleMarker, useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/* ═══════════════════════════════════════════════════════════
   GEOMETRY PARSER — GeoJSON · WKT · PostGIS EWKB hex
═══════════════════════════════════════════════════════════ */
const parseGeometry = (geom: any): [number, number][] | null => {
  if (!geom) return null;
  try {
    if (typeof geom === 'object' && geom.type === 'Polygon' && geom.coordinates)
      return geom.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number]);

    if (typeof geom === 'string') {
      if (geom.includes('POLYGON')) {
        const wkt   = geom.split(';').pop() || geom;
        const match = wkt.match(/\(\((.*?)\)\)/);
        if (!match) return null;
        const coords: [number, number][] = [];
        for (const pt of match[1].split(',')) {
          const parts = pt.trim().split(/\s+/);
          if (parts.length >= 2) {
            const lon = parseFloat(parts[0]), lat = parseFloat(parts[1]);
            if (!isNaN(lon) && !isNaN(lat)) coords.push([lat, lon]);
          }
        }
        return coords.length >= 3 ? coords : null;
      }
      if (/^[0-9A-Fa-f]+$/.test(geom)) {
        const hex  = geom.match(/[\da-f]{2}/gi);
        if (!hex) return null;
        const buf  = new Uint8Array(hex.map(h => parseInt(h, 16))).buffer;
        const view = new DataView(buf);
        const le   = view.getUint8(0) === 1;
        const type = view.getUint32(1, le);
        let off    = 5 + ((type & 0x20000000) ? 4 : 0);
        const rings = view.getUint32(off, le); off += 4;
        if (!rings) return null;
        const nPts  = view.getUint32(off, le); off += 4;
        const coords: [number, number][] = [];
        for (let i = 0; i < nPts; i++) {
          const lon = view.getFloat64(off, le); off += 8;
          const lat = view.getFloat64(off, le); off += 8;
          coords.push([lat, lon]);
        }
        return coords.length >= 3 ? coords : null;
      }
    }
    return null;
  } catch { return null; }
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function AutoZoom({ bounds }: { bounds: [[number,number],[number,number]] | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    const t = setTimeout(() => map.flyToBounds(bounds, { padding:[24,24], maxZoom:22, duration:1.6 }), 400);
    return () => clearTimeout(t);
  }, [bounds, map]);
  return null;
}

function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => { onZoom(map.getZoom()); }, []);
  return null;
}

function DrawController({ active, onVertex }: { active: boolean; onVertex: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) { if (active) onVertex(e.latlng.lat, e.latlng.lng); },
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (active && e.key === 'Escape') {
        // Signal cancel via custom event
        window.dispatchEvent(new CustomEvent('map-cancel-draw'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active]);
  return null;
}

/* ═══════════════════════════════════════════════════════════
   COLOUR HELPERS
═══════════════════════════════════════════════════════════ */
function confColor(s: number) {
  if (s >= 0.75) return { fill:'#1d8348', border:'#156b3a' };
  if (s >= 0.50) return { fill:'#0071e3', border:'#005cbf' };
  if (s >= 0.30) return { fill:'#ff9f0a', border:'#d48806' };
  return               { fill:'#e53e3e', border:'#c53030' };
}
function areaColor(a: number) {
  if (a >= 8) return { fill:'#e53e3e', border:'#c53030' };
  if (a >= 5) return { fill:'#dd6b20', border:'#c05621' };
  if (a >= 3) return { fill:'#d69e2e', border:'#b7791f' };
  if (a >= 1) return { fill:'#38a169', border:'#276749' };
  return             { fill:'#4299e1', border:'#2b6cb0' };
}
function phaseColor(s: number) {
  if (s > 3.5) return { fill:'#1d8348', border:'#156b3a', label:'Phase 1 — Invest Now' };
  if (s > 1.5) return { fill:'#0071e3', border:'#005cbf', label:'Phase 2 — Plan Ahead' };
  return             { fill:'#a0a0a0', border:'#767676', label:'Phase 3 — Re-evaluate' };
}
const STRING_COLORS = ['#0071e3','#1d8348','#8e44ad','#d48806','#e53e3e','#0097a7','#6d28d9','#b45309'];

/* ═══════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════ */
export interface DrawnPanel {
  id: string;
  coords: [number, number][];
  note: string;
  source: 'manual';
}

interface MapProps {
  panels: any[];
  overlayImage?:  string | null;
  imageBounds?:   [[number,number],[number,number]] | null;
  baseMap:        string;
  activeLayers?:  { heatmap?: boolean; stringWiring?: boolean; priority?: boolean };

  /* ── Edit props from page.tsx (optional — falls back to internal state) ── */
  editMode?:          boolean;
  drawMode?:          boolean;
  deletedIds?:        Set<string|number>;
  drawnPanels?:       DrawnPanel[];
  undoStack?:         string[];
  onDrawModeChange?:  (v: boolean) => void;
  onDelete?:          (id: string|number) => void;
  onCompleteDraw?:    (coords: [number,number][]) => void;
  onDeleteDrawn?:     (id: string) => void;
  onUndo?:            () => void;
  onResetEdits?:      () => void;
}

/* ═══════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════ */
export default function MapComponent({
  panels, overlayImage, imageBounds, baseMap, activeLayers,
  /* Edit props from page.tsx — undefined means use internal state */
  editMode:        extEditMode,
  drawMode:        extDrawMode,
  deletedIds:      extDeletedIds,
  drawnPanels:     extDrawnPanels,
  undoStack:       extUndoStack,
  onDrawModeChange,
  onDelete,
  onCompleteDraw,
  onDeleteDrawn,
  onUndo,
  onResetEdits,
}: MapProps) {

  const CENTER: [number,number] = [13.85, 100.5];
  const [zoom, setZoom] = useState(12);

  /* ── Internal fallback state (used when page.tsx doesn't pass props) ── */
  const [_editMode,    _setEditMode]    = useState(false);
  const [_drawMode,    _setDrawMode]    = useState(false);
  const [_deletedIds,  _setDeletedIds]  = useState<Set<string|number>>(new Set());
  const [_drawnPanels, _setDrawnPanels] = useState<DrawnPanel[]>([]);
  const [_undoStack,   _setUndoStack]   = useState<string[]>([]);

  /* Use external props when provided, otherwise internal */
  const controlled   = extEditMode !== undefined; // true = page.tsx controls everything
  const editMode     = controlled ? (extEditMode   ?? false) : _editMode;
  const drawMode     = controlled ? (extDrawMode   ?? false) : _drawMode;
  const deletedIds   = controlled ? (extDeletedIds ?? new Set<string|number>()) : _deletedIds;
  const drawnPanels  = controlled ? (extDrawnPanels ?? []) : _drawnPanels;
  const undoStack    = controlled ? (extUndoStack   ?? []) : _undoStack;

  /* ── Internal undo (only when self-contained) ─────── */
  const _saveUndo = useCallback(() => {
    _setUndoStack(s => [...s.slice(-19), JSON.stringify({ deletedIds:[..._deletedIds], drawnPanels:_drawnPanels })]);
  }, [_deletedIds, _drawnPanels]);

  /* ── Unified setters — routes to external callbacks OR internal state ── */
  const setEditMode = useCallback((v: boolean | ((p: boolean) => boolean)) => {
    if (controlled) return; // page.tsx owns this via toggleEdit
    _setEditMode(v as any);
  }, [controlled]);

  const setDrawMode = useCallback((v: boolean) => {
    if (onDrawModeChange) { onDrawModeChange(v); return; }
    _setDrawMode(v);
  }, [onDrawModeChange]);

  const handleDelete = useCallback((id: string|number, area?: number) => {
    if (onDelete) {
      onDelete(id);
      showToast('🗑 Panel removed — stats updated');
    } else {
      _saveUndo();
      _setDeletedIds(s => new Set([...s, id]));
      showToast('🗑 Panel removed');
    }
  }, [onDelete, _saveUndo]);

  const handleUndo = useCallback(() => {
    if (onUndo) { onUndo(); showToast('↩ Undo applied'); return; }
    _setUndoStack(s => {
      if (!s.length) return s;
      const prev = JSON.parse(s[s.length-1]);
      _setDeletedIds(new Set(prev.deletedIds));
      _setDrawnPanels(prev.drawnPanels);
      showToast('↩ Undo applied');
      return s.slice(0,-1);
    });
  }, [onUndo]);

  const handleDeleteDrawn = useCallback((id: string) => {
    if (onDeleteDrawn) { onDeleteDrawn(id); showToast('🗑 Manual panel removed'); return; }
    _saveUndo();
    _setDrawnPanels(d => d.filter(p => p.id !== id));
    showToast('🗑 Manual panel removed');
  }, [onDeleteDrawn, _saveUndo]);

  /* ── Draw state ─────────────────────────────────────── */
  const [draftCoords, setDraftCoords] = useState<[number,number][]>([]);
  const [toast, setToast]             = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg); setTimeout(() => setToast(''), 2600);
  }, []);

  /* Cancel draw via Escape key */
  useEffect(() => {
    const handler = () => {
      setDraftCoords([]);
      setDrawMode(false);
      showToast('✖ Drawing cancelled');
    };
    window.addEventListener('map-cancel-draw', handler);
    return () => window.removeEventListener('map-cancel-draw', handler);
  }, [setDrawMode, showToast]);

  /* Reset draft when drawMode turns off */
  useEffect(() => { if (!drawMode) setDraftCoords([]); }, [drawMode]);

  const handleAddVertex = useCallback((lat: number, lon: number) => {
    setDraftCoords(d => [...d, [lat, lon]]);
  }, []);

  const handleCompleteDraw = useCallback(() => {
    if (draftCoords.length < 3) { showToast('⚠ Place at least 3 points first'); return; }
    const newPanel: DrawnPanel = { id:`manual-${Date.now()}`, coords:draftCoords, note:'', source:'manual' };
    if (onCompleteDraw) {
      onCompleteDraw(draftCoords);
    } else {
      _saveUndo();
      _setDrawnPanels(d => [...d, newPanel]);
    }
    setDraftCoords([]);
    setDrawMode(false);
    showToast('✅ Manual panel saved');
  }, [draftCoords, onCompleteDraw, _saveUndo, setDrawMode, showToast]);

  const handleCancelDraw = useCallback(() => {
    setDraftCoords([]);
    setDrawMode(false);
    showToast('✖ Drawing cancelled');
  }, [setDrawMode, showToast]);

  const handleExport = useCallback(() => {
    const surviving = panels.filter(p => !deletedIds.has(p.id ?? p));
    const features = [
      ...surviving.map(p => ({
        type:'Feature',
        properties:{ id:p.id, source:'ai', area_sqm:p.area_sqm, confidence:p.confidence_score },
        geometry:{ type:'Point', coordinates:[p.centroid_lon, p.centroid_lat] },
      })),
      ...drawnPanels.map(p => ({
        type:'Feature',
        properties:{ id:p.id, source:'manual', note:p.note },
        geometry:{
          type:'Polygon',
          coordinates:[[...p.coords.map(([lat,lon]) => [lon,lat]), [p.coords[0][1], p.coords[0][0]]]],
        },
      })),
    ];
    const a = document.createElement('a');
    a.href  = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ type:'FeatureCollection', features }, null, 2));
    a.download = `solar_edited_${Date.now()}.geojson`;
    document.body.appendChild(a); a.click(); a.remove();
    showToast('📥 GeoJSON exported');
  }, [panels, deletedIds, drawnPanels, showToast]);

  /* ── Derived counts ─────────────────────────────────── */
  const survivingCount = panels.filter(p => !deletedIds.has(p.id ?? p)).length;
  const deletedCount   = deletedIds.size;
  const drawnCount     = drawnPanels.length;

  /* ── String wiring ──────────────────────────────────── */
  const STRING_SIZE = 8;
  const stringGroups: Record<number,[number,number][]> = {};
  if (activeLayers?.stringWiring) {
    panels.forEach((p, i) => {
      if (p.centroid_lat && p.centroid_lon) {
        const id = Math.floor(i / STRING_SIZE);
        if (!stringGroups[id]) stringGroups[id] = [];
        stringGroups[id].push([p.centroid_lat, p.centroid_lon]);
      }
    });
  }

  const strokeWeight = zoom >= 19 ? 3 : zoom >= 16 ? 2 : 1.5;
  const fillOpacity  = zoom >= 18 ? 0.55 : 0.45;

  const MAP_URLS: Record<string,string> = {
    satellite: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    street:    'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  };

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <div style={{ position:'relative', height:'100%', width:'100%' }}>

      {/* ── Edit toggle (only shows when NOT controlled by page.tsx) ── */}
      {!controlled && (
        <div style={{
          position:'absolute', top:12, left:12, zIndex:1003,
          display:'flex', flexDirection:'column', gap:8, width:248,
          fontFamily:"'Geist',system-ui,sans-serif",
          pointerEvents: 'all',
        }}>
          {/* Main toggle button */}
          <button
            onClick={() => { _setEditMode(e => !e); _setDrawMode(false); setDraftCoords([]); }}
            style={{
              display:'flex', alignItems:'center', gap:8, width:'100%',
              padding:'10px 14px', borderRadius:14,
              background: editMode ? 'rgba(229,62,62,0.92)' : 'rgba(255,255,255,0.92)',
              backdropFilter:'saturate(180%) blur(16px)',
              border:`1.5px solid ${editMode?'rgba(229,62,62,0.4)':'rgba(0,0,0,0.1)'}`,
              cursor:'pointer', color: editMode ? '#fff' : '#1d1d1f',
              fontSize:13, fontWeight:700,
              boxShadow: editMode ? '0 4px 20px rgba(229,62,62,0.25)' : '0 4px 20px rgba(0,0,0,0.12)',
              transition:'all .22s', justifyContent:'space-between',
            }}
          >
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28,height:28,borderRadius:8,background:editMode?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.06)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, lineHeight:1 }}>{editMode?'Exit Edit Mode':'Edit Detections'}</div>
                <div style={{ fontFamily:"'Geist Mono',monospace", fontSize:8, letterSpacing:'.14em', textTransform:'uppercase', marginTop:3, opacity:0.65 }}>
                  {editMode?(drawMode?'DRAW MODE':'CLICK RED PANEL TO DELETE'):'Correct AI errors'}
                </div>
              </div>
            </div>
            {(deletedCount>0||drawnCount>0)&&!editMode&&(
              <span style={{ width:8,height:8,borderRadius:'50%',background:'#e53e3e',border:'2px solid rgba(255,255,255,0.9)',flexShrink:0 }}/>
            )}
            {editMode&&(
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity:0.7,flexShrink:0 }}>
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            )}
          </button>

          {/* Expanded edit card */}
          {editMode && (
            <div style={{ background:'rgba(255,255,255,0.95)',backdropFilter:'saturate(180%) blur(20px)',border:'1px solid rgba(0,0,0,0.09)',borderRadius:18,overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,0.12)', position:'relative', zIndex:1003, pointerEvents:'all' }}>
              {/* Stats */}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
                {[{label:'AI Active',val:survivingCount,color:'#0071e3'},{label:'Deleted',val:deletedCount,color:'#e53e3e'},{label:'Manual',val:drawnCount,color:'#1d8348'}].map((s,i,arr)=>(
                  <div key={s.label} style={{ padding:'12px 8px',textAlign:'center',borderRight:i<arr.length-1?'1px solid rgba(0,0,0,0.06)':'none' }}>
                    <div style={{ fontFamily:"'Geist',sans-serif",fontSize:22,fontWeight:900,color:s.color,lineHeight:1 }}>{s.val}</div>
                    <div style={{ fontFamily:"'Geist Mono',monospace",fontSize:8,color:'#6e6e73',letterSpacing:'.1em',textTransform:'uppercase',marginTop:4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding:14,display:'flex',flexDirection:'column',gap:9 }}>
                {/* Hint */}
                <div style={{ padding:'9px 11px',borderRadius:10,background:drawMode?'rgba(0,113,227,0.07)':'rgba(229,62,62,0.05)',border:`1px solid ${drawMode?'rgba(0,113,227,0.2)':'rgba(229,62,62,0.18)'}`,display:'flex',alignItems:'flex-start',gap:8 }}>
                  <div style={{ flexShrink:0,marginTop:1 }}>
                    {drawMode?(
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0071e3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    ):(
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    )}
                  </div>
                  <span style={{ fontFamily:"'Geist Mono',monospace",fontSize:10,lineHeight:1.6,color:drawMode?'#0071e3':'#e53e3e' }}>
                    {drawMode?`Click map · ${draftCoords.length} pt${draftCoords.length!==1?'s':''} placed${draftCoords.length>=3?' — ready!':''}` : 'Click any red panel to remove as false-positive'}
                  </span>
                </div>
                {/* Draw / Finish / Cancel — Finish & Cancel handled by the floating bar above map */}
                {!drawMode ? (
                  <button onClick={()=>{_setDrawMode(true);showToast('✏ Click map to place vertices — use toolbar above to Finish');}} style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:7,padding:'10px',borderRadius:10,background:'rgba(0,113,227,0.08)',border:'1.5px solid rgba(0,113,227,0.25)',cursor:'pointer',color:'#0071e3',fontSize:12,fontWeight:600 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    Draw New Panel
                  </button>
                ) : (
                  /* Draw mode active — floating bar on map has Finish/Cancel. Show cancel shortcut here too. */
                  <button onClick={handleCancelDraw} style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px',borderRadius:10,background:'rgba(229,62,62,0.07)',border:'1.5px solid rgba(229,62,62,0.2)',cursor:'pointer',color:'#e53e3e',fontSize:12,fontWeight:600 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Cancel Drawing
                  </button>
                )}
                <div style={{ height:1,background:'rgba(0,0,0,0.06)',margin:'2px 0' }} />
                {/* Undo + Export */}
                <div style={{ display:'flex',gap:7 }}>
                  <button onClick={handleUndo} disabled={!undoStack.length} style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'8px',borderRadius:10,background:'rgba(0,0,0,0.03)',border:'1px solid rgba(0,0,0,0.08)',cursor:undoStack.length?'pointer':'not-allowed',color:undoStack.length?'#1d1d1f':'#c0c0c0',fontSize:11,fontWeight:600,opacity:undoStack.length?1:0.45 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                    Undo
                  </button>
                  <button onClick={handleExport} style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'8px',borderRadius:10,background:'rgba(29,131,72,0.08)',border:'1.5px solid rgba(29,131,72,0.22)',cursor:'pointer',color:'#1d8348',fontSize:11,fontWeight:600 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export
                  </button>
                </div>
                {/* Manual list */}
                {drawnCount>0&&(
                  <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
                    <div style={{ fontFamily:"'Geist Mono',monospace",fontSize:8,color:'#a0a0a0',letterSpacing:'.14em',textTransform:'uppercase' }}>Manual Panels</div>
                    {drawnPanels.map((p,i)=>(
                      <div key={p.id} style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:9,background:'rgba(29,131,72,0.05)',border:'1px solid rgba(29,131,72,0.14)' }}>
                        <div style={{ width:6,height:6,borderRadius:'50%',background:'#1d8348',flexShrink:0 }}/>
                        <span style={{ flex:1,fontFamily:"'Geist Mono',monospace",fontSize:9,color:'#1d1d1f' }}>Manual-{i+1} · {p.coords.length} pts</span>
                        <button onClick={()=>handleDeleteDrawn(p.id)} style={{ border:'none',background:'none',cursor:'pointer',color:'#e53e3e',padding:'2px',borderRadius:4,display:'flex',alignItems:'center',opacity:0.7 }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Reset */}
                {(deletedCount>0||drawnCount>0)&&(
                  <button onClick={()=>{if(!confirm(`Reset all edits? (${deletedCount}D + ${drawnCount}M)`))return;if(onResetEdits){onResetEdits();}else{_saveUndo();_setDeletedIds(new Set());_setDrawnPanels([]);}showToast('↺ All edits reset');}} style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'7px',borderRadius:10,background:'transparent',border:'1px solid rgba(0,0,0,0.08)',cursor:'pointer',color:'#6e6e73',fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:'.1em',marginTop:2 }}>
                    ↺ Reset all edits
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Draw mode floating bar — ALWAYS shows when drawing (regardless of controlled/standalone) ── */}
      {drawMode && (
        <div style={{
          position: 'absolute',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1002,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'saturate(180%) blur(20px)',
          border: '1.5px solid rgba(0,113,227,0.3)',
          borderRadius: 980,
          padding: '6px 8px 6px 14px',
          boxShadow: '0 4px 24px rgba(0,113,227,0.2)',
          fontFamily: "'Geist', system-ui, sans-serif",
          whiteSpace: 'nowrap',
        }}>
          {/* Pulse dot */}
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#0071e3',
            animation: 'drawPulse 1s infinite',
            display: 'inline-block', flexShrink: 0,
          }}/>

          {/* Status text */}
          <span style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 11, letterSpacing: '.08em', color: '#0071e3', fontWeight: 600,
          }}>
            {draftCoords.length < 3
              ? `DRAW MODE — ${draftCoords.length} point${draftCoords.length !== 1 ? 's' : ''} (need ${3 - draftCoords.length} more)`
              : `DRAW MODE — ${draftCoords.length} points · ready!`}
          </span>

          <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.1)', margin: '0 4px' }} />

          {/* Undo last vertex */}
          <button
            onClick={() => setDraftCoords(d => d.slice(0, -1))}
            disabled={draftCoords.length === 0}
            title="Undo last point"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 10px', borderRadius: 980,
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.1)',
              cursor: draftCoords.length > 0 ? 'pointer' : 'not-allowed',
              color: draftCoords.length > 0 ? '#1d1d1f' : '#c0c0c0',
              fontSize: 12, fontWeight: 600,
              opacity: draftCoords.length === 0 ? 0.4 : 1,
              transition: 'all .15s',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
            </svg>
            Undo
          </button>

          {/* Finish */}
          <button
            onClick={handleCompleteDraw}
            disabled={draftCoords.length < 3}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 980,
              background: draftCoords.length >= 3 ? '#1d8348' : 'rgba(0,0,0,0.08)',
              border: 'none',
              cursor: draftCoords.length >= 3 ? 'pointer' : 'not-allowed',
              color: draftCoords.length >= 3 ? '#fff' : '#a0a0a0',
              fontSize: 12, fontWeight: 700,
              opacity: draftCoords.length < 3 ? 0.55 : 1,
              boxShadow: draftCoords.length >= 3 ? '0 2px 10px rgba(29,131,72,0.35)' : 'none',
              transition: 'all .18s',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Finish ({draftCoords.length}pts)
          </button>

          {/* Cancel */}
          <button
            onClick={handleCancelDraw}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 980,
              background: 'rgba(229,62,62,0.08)',
              border: '1px solid rgba(229,62,62,0.25)',
              cursor: 'pointer', color: '#e53e3e',
              fontSize: 12, fontWeight: 600,
              transition: 'all .15s',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Cancel
          </button>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)',
          zIndex:1002, background:'rgba(29,29,31,0.92)', backdropFilter:'blur(12px)',
          color:'#fff', padding:'10px 22px', borderRadius:980,
          fontFamily:"'Geist',sans-serif", fontSize:13, fontWeight:500,
          boxShadow:'0 4px 24px rgba(0,0,0,0.2)', whiteSpace:'nowrap',
          animation:'toastIn .22s ease',
        }}>
          {toast}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          LEAFLET MAP + STYLES
      ═══════════════════════════════════════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&display=swap');

        .leaflet-container {
          background: #f0ece8;
          font-family: 'Geist', system-ui, sans-serif;
          cursor: ${drawMode ? 'crosshair' : 'grab'};
        }
        .leaflet-container:active { cursor: ${drawMode ? 'crosshair' : 'grabbing'}; }

        .leaflet-popup-content-wrapper {
          border-radius: 16px !important; border: 1px solid rgba(0,0,0,0.09) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08) !important;
          padding: 0 !important; overflow: hidden !important;
          background: #fff !important; min-width: 240px !important;
        }
        .leaflet-popup-content { margin: 0 !important; padding: 0 !important; width: auto !important; }
        .leaflet-popup-tip-container { display: none !important; }
        .leaflet-popup-close-button {
          top: 10px !important; right: 12px !important; color: #6e6e73 !important;
          font-size: 18px !important; width: 22px !important; height: 22px !important;
          display: flex !important; align-items: center !important; justify-content: center !important;
          border-radius: 50% !important; transition: background .15s !important;
        }
        .leaflet-popup-close-button:hover { background: rgba(0,0,0,0.06) !important; }

        .geo-tooltip {
          background: #fff !important; border: 1px solid rgba(0,0,0,0.09) !important;
          border-radius: 8px !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important;
          padding: 5px 10px !important; font-family: 'Geist Mono', monospace !important;
          font-size: 10px !important; color: #1d1d1f !important; white-space: nowrap !important;
        }
        .geo-tooltip::before { display: none !important; }

        .wiring-path { stroke-dasharray: 7 4; animation: wireDash 1.4s linear infinite; }
        @keyframes wireDash { to { stroke-dashoffset: -22; } }

        .solar-polygon { transition: fill-opacity 0.15s; }
        .solar-polygon:hover { fill-opacity: 0.75 !important; }

        .solar-del:hover {
          fill-opacity: 0.85 !important;
          filter: drop-shadow(0 0 6px rgba(229,62,62,0.6));
          cursor: pointer !important;
        }

        .draft-vertex { cursor: crosshair; }

        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes drawPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.5)} }

        .leaflet-control-attribution {
          background: rgba(255,255,255,0.85) !important; backdrop-filter: blur(8px) !important;
          border-radius: 6px 0 0 0 !important; font-family: 'Geist Mono', monospace !important;
          font-size: 9px !important; padding: 3px 8px !important;
        }
        .leaflet-control-zoom a {
          background: rgba(255,255,255,0.92) !important; backdrop-filter: blur(8px) !important;
          border-color: rgba(0,0,0,0.1) !important; color: #1d1d1f !important;
        }
        .leaflet-control-zoom a:hover { background: #f5f5f7 !important; }
      `}</style>

      <MapContainer center={CENTER} zoom={12} maxZoom={24} style={{ height:'100%', width:'100%', zIndex:0 }}>
        <TileLayer url={MAP_URLS[baseMap] || MAP_URLS.satellite} maxZoom={24} maxNativeZoom={21} />
        <AutoZoom bounds={imageBounds} />
        <ZoomTracker onZoom={setZoom} />
        <DrawController active={drawMode} onVertex={handleAddVertex} />

        {overlayImage && imageBounds && (
          <ImageOverlay url={overlayImage} bounds={imageBounds} opacity={0.82} zIndex={10} />
        )}

        {/* String Wiring */}
        {activeLayers?.stringWiring && Object.entries(stringGroups).map(([sid, coords]) => {
          const id    = parseInt(sid);
          const color = STRING_COLORS[id % STRING_COLORS.length];
          return (
            <Polyline key={`str-${id}`} positions={coords} pathOptions={{ color, weight:2.5, opacity:0.88, className:'wiring-path' }}>
              <Tooltip className="geo-tooltip" sticky>
                <span style={{ color, fontWeight:600 }}>STRING #{id+1}</span>{'  '}·{'  '}{coords.length} panels
              </Tooltip>
            </Polyline>
          );
        })}

        {activeLayers?.stringWiring && zoom >= 17 && panels.map((p, i) => {
          if (!p.centroid_lat || !p.centroid_lon) return null;
          const color = STRING_COLORS[Math.floor(i/STRING_SIZE) % STRING_COLORS.length];
          return <CircleMarker key={`nd-${i}`} center={[p.centroid_lat, p.centroid_lon]} radius={3} pathOptions={{ color:'#fff', fillColor:color, fillOpacity:1, weight:1.5 }} />;
        })}

        {/* ── AI-detected panels ──────────────────────── */}
        {panels.map((panel, index) => {
          const pId = panel.id ?? index;
          if (deletedIds.has(pId)) return null;   // ← respects both internal & external deletedIds

          const positions = parseGeometry(panel.geom);
          if (!positions) return null;

          const conf     = panel.confidence_score || 0;
          const area     = panel.area_sqm || 0;
          const phaseScr = area * conf;
          const cc       = confColor(conf);
          const pc       = phaseColor(phaseScr);

          let fill: string, border: string;
          if (activeLayers?.priority)     { fill=phaseColor(phaseScr).fill; border=phaseColor(phaseScr).border; }
          else if (activeLayers?.heatmap) { fill=areaColor(area).fill;     border=areaColor(area).border;     }
          else                            { fill=cc.fill;                   border=cc.border;                  }

          const eFill    = editMode ? '#e53e3e' : fill;
          const eBorder  = editMode ? '#c53030' : border;
          const eOpacity = editMode ? 0.5 : fillOpacity;

          const energyDay = panel.daily_energy_kwh?.toFixed(2)  ?? '—';
          const energyYr  = panel.yearly_energy_kwh?.toFixed(0) ?? '—';
          const savings   = panel.yearly_savings_baht?.toLocaleString(undefined,{maximumFractionDigits:0}) ?? '—';
          const co2       = panel.co2_offset_kg?.toFixed(1) ?? '—';

          return (
            <Polygon
              key={pId}
              positions={positions as any}
              className={editMode ? 'solar-del' : 'solar-polygon'}
              pathOptions={{
                color:       eBorder,
                fillColor:   eFill,
                fillOpacity: activeLayers?.heatmap ? 0.65 : eOpacity,
                weight:      strokeWeight,
                lineCap:     'round', lineJoin:'round',
              }}
              eventHandlers={editMode ? {
                click: () => {
                  if (confirm(`Remove PNL-${String(pId).padStart(4,'0')} (${area.toFixed(1)} m²) as false-positive?\n\nAll analytics will update immediately.`))
                    handleDelete(pId, area);
                },
              } : {}}
            >
              {!editMode && (
                <Popup maxWidth={280} minWidth={240} closeButton>
                  <div style={{ fontFamily:"'Geist',system-ui,sans-serif" }}>
                    <div style={{ padding:'14px 16px 12px', borderBottom:'1px solid rgba(0,0,0,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontFamily:"'Geist Mono',monospace", fontSize:10, color:'#6e6e73', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:3 }}>Solar Panel</div>
                        <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:18, fontWeight:800, letterSpacing:'-.02em', color:'#1d1d1f', lineHeight:1 }}>PNL-{String(pId).padStart(4,'0')}</div>
                      </div>
                      <div style={{ padding:'5px 11px', borderRadius:980, background:`${cc.fill}12`, border:`1px solid ${cc.fill}30`, fontFamily:"'Geist Mono',monospace", fontSize:11, fontWeight:600, color:cc.fill }}>
                        {(conf*100).toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderBottom:'1px solid rgba(0,0,0,0.07)' }}>
                      {[{l:'Area',v:`${area.toFixed(1)} m²`,c:'#0071e3'},{l:'Daily',v:`${energyDay} kWh`,c:'#1d8348'},{l:'Yearly',v:`${energyYr} kWh`,c:'#1d8348'}]
                        .map((s,i,arr)=>(
                          <div key={s.l} style={{ padding:'11px 12px', textAlign:'center', borderRight:i<arr.length-1?'1px solid rgba(0,0,0,0.07)':'none' }}>
                            <div style={{ fontFamily:"'Geist Mono',monospace", fontSize:8, color:'#a0a0a0', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:4 }}>{s.l}</div>
                            <div style={{ fontFamily:"'Geist',sans-serif", fontSize:13, fontWeight:700, color:s.c, lineHeight:1 }}>{s.v}</div>
                          </div>
                        ))}
                    </div>
                    <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:9, color:'#6e6e73', letterSpacing:'.12em', textTransform:'uppercase' }}>Annual Savings</span>
                        <span style={{ fontFamily:"'Geist',sans-serif", fontSize:14, fontWeight:700, color:'#1d8348' }}>฿{savings}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:9, color:'#6e6e73', letterSpacing:'.12em', textTransform:'uppercase' }}>CO₂ Offset</span>
                        <span style={{ fontFamily:"'Geist',sans-serif", fontSize:13, fontWeight:600, color:'#15803d' }}>{co2} kg/yr</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:9, color:'#6e6e73', letterSpacing:'.12em', textTransform:'uppercase' }}>Centroid</span>
                        <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:10, color:'#1d1d1f' }}>{panel.centroid_lat?.toFixed(5)}, {panel.centroid_lon?.toFixed(5)}</span>
                      </div>
                      <div>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                          <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:9, color:'#6e6e73', letterSpacing:'.12em', textTransform:'uppercase' }}>AI Confidence</span>
                          <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:9, color:cc.fill, fontWeight:600 }}>{(conf*100).toFixed(1)}%</span>
                        </div>
                        <div style={{ height:4, background:'rgba(0,0,0,0.07)', borderRadius:2, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${conf*100}%`, background:cc.fill, borderRadius:2 }} />
                        </div>
                      </div>
                    </div>
                    {activeLayers?.priority && (
                      <div style={{ padding:'10px 16px', background:`${pc.fill}09`, borderTop:`1px solid ${pc.fill}20`, display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:pc.fill }} />
                        <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:10, color:pc.fill, fontWeight:600, letterSpacing:'.08em' }}>{pc.label}</span>
                      </div>
                    )}
                  </div>
                </Popup>
              )}

              <Tooltip className="geo-tooltip" direction="top" offset={[0,-4]}>
                {editMode
                  ? <><span style={{ color:'#e53e3e', fontWeight:600 }}>🗑 Click to remove</span>{'  '}PNL-{String(pId).padStart(4,'0')}{'  '}·{'  '}{area.toFixed(1)} m²</>
                  : <><span style={{ color:fill, fontWeight:600 }}>PNL-{String(pId).padStart(4,'0')}</span>{'  '}·{'  '}{area.toFixed(1)} m²{'  '}·{'  '}<span style={{ color:cc.fill }}>{(conf*100).toFixed(0)}%</span></>}
              </Tooltip>
            </Polygon>
          );
        })}

        {/* ── Manually drawn panels ───────────────────── */}
        {drawnPanels.map((p, idx) => (
          <Polygon key={p.id} positions={p.coords as any}
            pathOptions={{ color:'#1d8348', fillColor:'#1d8348', fillOpacity:0.35, weight:2.5, dashArray:editMode?'6 3':undefined }}>
            <Popup maxWidth={240} minWidth={200} closeButton>
              <div style={{ fontFamily:"'Geist',system-ui,sans-serif" }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(0,0,0,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontFamily:"'Geist Mono',monospace", fontSize:9, color:'#1d8348', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:3 }}>Manual Panel</div>
                    <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:16, fontWeight:800, color:'#1d1d1f' }}>User-drawn #{idx+1}</div>
                  </div>
                  <div style={{ padding:'4px 10px', borderRadius:980, background:'rgba(29,131,72,0.1)', border:'1px solid rgba(29,131,72,0.25)', fontFamily:"'Geist Mono',monospace", fontSize:10, fontWeight:600, color:'#1d8348' }}>Manual</div>
                </div>
                <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:9, color:'#6e6e73', letterSpacing:'.12em', textTransform:'uppercase' }}>Vertices</span>
                    <span style={{ fontFamily:"'Geist',sans-serif", fontSize:13, fontWeight:600, color:'#1d1d1f' }}>{p.coords.length} points</span>
                  </div>
                </div>
                {editMode && (
                  <div style={{ padding:'10px 16px', borderTop:'1px solid rgba(0,0,0,0.07)' }}>
                    <button onClick={()=>handleDeleteDrawn(p.id)} style={{ width:'100%', padding:'8px', borderRadius:8, background:'rgba(229,62,62,0.07)', border:'1px solid rgba(229,62,62,0.2)', cursor:'pointer', color:'#e53e3e', fontFamily:"'Geist',sans-serif", fontSize:12, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      Remove this panel
                    </button>
                  </div>
                )}
              </div>
            </Popup>
            <Tooltip className="geo-tooltip" direction="top" offset={[0,-4]}>
              <span style={{ color:'#1d8348', fontWeight:600 }}>✏ Manual #{idx+1}</span>{'  '}·{'  '}{p.coords.length} vertices
            </Tooltip>
          </Polygon>
        ))}

        {/* Draft polygon */}
        {draftCoords.length >= 2 && (
          <Polygon positions={draftCoords as any} pathOptions={{ color:'#0071e3', fillColor:'#0071e3', fillOpacity:0.18, weight:2, dashArray:'6 3' }} />
        )}

        {/* Draft vertex dots */}
        {draftCoords.map(([lat, lon], i) => (
          <CircleMarker key={`dv-${i}`} center={[lat, lon]} radius={i===0?6:4} className="draft-vertex"
            pathOptions={{ color:i===0?'#fff':'#0071e3', fillColor:i===0?'#0071e3':'#fff', fillOpacity:1, weight:2 }}>
            <Tooltip className="geo-tooltip" permanent direction="top" offset={[0,-8]}>
              <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:9, color:'#0071e3' }}>{i===0?'Start':`P${i+1}`}</span>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Centroid dots at high zoom */}
        {!editMode && !activeLayers?.stringWiring && zoom >= 18 && panels
          .filter(p => !deletedIds.has(p.id ?? p))
          .map((p, i) => {
            if (!p.centroid_lat || !p.centroid_lon) return null;
            const cc = confColor(p.confidence_score || 0);
            return <CircleMarker key={`ctr-${i}`} center={[p.centroid_lat, p.centroid_lon]} radius={2.5} pathOptions={{ color:'#fff', fillColor:cc.fill, fillOpacity:1, weight:1.5 }} />;
          })}
      </MapContainer>
    </div>
  );
}