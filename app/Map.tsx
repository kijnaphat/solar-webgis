'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MapContainer, TileLayer, Polygon, Popup, useMap,
  ImageOverlay, Polyline, Tooltip, CircleMarker, useMapEvents,
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
        const nPts = view.getUint32(off, le); off += 4;
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
   AUTO-ZOOM
═══════════════════════════════════════════════════════════ */
function AutoZoom({ bounds }: { bounds: [[number,number],[number,number]]|null|undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    const t = setTimeout(() => map.flyToBounds(bounds, { padding:[24,24], maxZoom:22, duration:1.6 }), 400);
    return () => clearTimeout(t);
  }, [bounds, map]);
  return null;
}

/* ═══════════════════════════════════════════════════════════
   ZOOM TRACKER
═══════════════════════════════════════════════════════════ */
function ZoomTracker({ onZoom }: { onZoom: (z:number)=>void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => { onZoom(map.getZoom()); }, []);
  return null;
}

/* ═══════════════════════════════════════════════════════════
   DRAW CONTROLLER — captures map clicks while in draw mode
═══════════════════════════════════════════════════════════ */
interface DrawControllerProps {
  drawMode: boolean;
  onAddVertex: (lat: number, lon: number) => void;
}
function DrawController({ drawMode, onAddVertex }: DrawControllerProps) {
  useMapEvents({
    click(e) {
      if (drawMode) onAddVertex(e.latlng.lat, e.latlng.lng);
    },
  });
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
   DRAWN POLYGON — a manually drawn panel
═══════════════════════════════════════════════════════════ */
interface DrawnPanel {
  id:       string;
  coords:   [number, number][];
  note:     string;
  source:   'manual';
}

/* ═══════════════════════════════════════════════════════════
   MAP PROPS
═══════════════════════════════════════════════════════════ */
interface MapProps {
  panels: any[];
  overlayImage?:  string | null;
  imageBounds?:   [[number,number],[number,number]] | null;
  baseMap:        string;
  activeLayers?:  { heatmap?: boolean; stringWiring?: boolean; priority?: boolean };
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function MapComponent({ panels, overlayImage, imageBounds, baseMap, activeLayers }: MapProps) {
  const CENTER: [number,number] = [13.85, 100.5];
  const [zoom, setZoom] = useState(12);

  /* ── Edit-mode state ─────────────────────────────────── */
  const [editMode,     setEditMode]     = useState(false);
  const [drawMode,     setDrawMode]     = useState(false);
  const [deletedIds,   setDeletedIds]   = useState<Set<string|number>>(new Set());
  const [drawnPanels,  setDrawnPanels]  = useState<DrawnPanel[]>([]);
  const [draftCoords,  setDraftCoords]  = useState<[number,number][]>([]);
  const [undoStack,    setUndoStack]    = useState<string[]>([]); // JSON snapshots
  const [toast,        setToast]        = useState<string>('');

  /* ── Toast helper ────────────────────────────────────── */
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  }, []);

  /* ── Save state to undo stack ────────────────────────── */
  const saveUndo = useCallback(() => {
    setUndoStack(s => [
      ...s.slice(-19),
      JSON.stringify({ deletedIds: [...deletedIds], drawnPanels }),
    ]);
  }, [deletedIds, drawnPanels]);

  /* ── Undo ────────────────────────────────────────────── */
  const handleUndo = useCallback(() => {
    setUndoStack(s => {
      if (!s.length) return s;
      const prev = JSON.parse(s[s.length - 1]);
      setDeletedIds(new Set(prev.deletedIds));
      setDrawnPanels(prev.drawnPanels);
      showToast('↩ Undo applied');
      return s.slice(0, -1);
    });
  }, [showToast]);

  /* ── Delete AI polygon ───────────────────────────────── */
  const handleDelete = useCallback((id: string|number) => {
    saveUndo();
    setDeletedIds(s => new Set([...s, id]));
    showToast('🗑 Panel removed — AI detection corrected');
  }, [saveUndo, showToast]);

  /* ── Add vertex while drawing ────────────────────────── */
  const handleAddVertex = useCallback((lat: number, lon: number) => {
    setDraftCoords(d => [...d, [lat, lon]]);
  }, []);

  /* ── Complete drawn polygon ──────────────────────────── */
  const handleCompleteDraw = useCallback(() => {
    if (draftCoords.length < 3) { showToast('⚠ Draw at least 3 points first'); return; }
    saveUndo();
    const newPanel: DrawnPanel = {
      id:     `manual-${Date.now()}`,
      coords: draftCoords,
      note:   '',
      source: 'manual',
    };
    setDrawnPanels(d => [...d, newPanel]);
    setDraftCoords([]);
    setDrawMode(false);
    showToast('✅ Manual panel saved');
  }, [draftCoords, saveUndo, showToast]);

  /* ── Cancel drawing ──────────────────────────────────── */
  const handleCancelDraw = useCallback(() => {
    setDraftCoords([]);
    setDrawMode(false);
    showToast('✖ Drawing cancelled');
  }, [showToast]);

  /* ── Delete manual panel ─────────────────────────────── */
  const handleDeleteDrawn = useCallback((id: string) => {
    saveUndo();
    setDrawnPanels(d => d.filter(p => p.id !== id));
    showToast('🗑 Manual panel removed');
  }, [saveUndo, showToast]);

  /* ── Export edits as GeoJSON ─────────────────────────── */
  const handleExport = useCallback(() => {
    const surviving = panels.filter(p => !deletedIds.has(p.id ?? p));
    const features = [
      ...surviving.map(p => ({
        type: 'Feature',
        properties: { id: p.id, source: 'ai', area_sqm: p.area_sqm, confidence: p.confidence_score },
        geometry: { type: 'Point', coordinates: [p.centroid_lon, p.centroid_lat] },
      })),
      ...drawnPanels.map(p => ({
        type: 'Feature',
        properties: { id: p.id, source: 'manual', note: p.note },
        geometry: {
          type: 'Polygon',
          coordinates: [[...p.coords.map(([lat, lon]) => [lon, lat]), [p.coords[0][1], p.coords[0][0]]]],
        },
      })),
    ];
    const gj = { type: 'FeatureCollection', name: 'SWU_Solar_Edited', features };
    const a  = document.createElement('a');
    a.href   = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(gj, null, 2));
    a.download = `solar_edited_${Date.now()}.geojson`;
    document.body.appendChild(a); a.click(); a.remove();
    showToast('📥 Exported edited GeoJSON');
  }, [panels, deletedIds, drawnPanels, showToast]);

  /* ── Summary counts ──────────────────────────────────── */
  const survivingCount = panels.filter(p => !deletedIds.has(p.id ?? p)).length;
  const deletedCount   = deletedIds.size;
  const drawnCount     = drawnPanels.length;

  /* ── String wiring groups ────────────────────────────── */
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

  return (
    <div style={{ position:'relative', height:'100%', width:'100%' }}>

      {/* ══════════════════════════════════════════════════
          FLOATING EDITOR TOOLBAR  (top-right of map)
      ══════════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
      }}>

        {/* Main edit toggle */}
        <button
          onClick={() => { setEditMode(e => !e); setDrawMode(false); setDraftCoords([]); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px', borderRadius: 980,
            background: editMode ? '#1d1d1f' : '#fff',
            border: `1.5px solid ${editMode ? '#1d1d1f' : 'rgba(0,0,0,0.15)'}`,
            cursor: 'pointer', color: editMode ? '#fff' : '#1d1d1f',
            fontFamily: "'Geist', sans-serif", fontSize: 13, fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
            transition: 'all .2s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          {editMode ? 'Exit Edit Mode' : 'Edit Detections'}
        </button>

        {/* Edit sub-toolbar — shown only in edit mode */}
        {editMode && (
          <div style={{
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'saturate(180%) blur(16px)',
            border: '1px solid rgba(0,0,0,0.09)', borderRadius: 20,
            padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
            minWidth: 230,
          }}>

            {/* Status summary */}
            <div style={{
              padding: '10px 12px', background: 'rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12,
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4,
            }}>
              {[
                { label:'AI panels', val: survivingCount, color:'#0071e3' },
                { label:'Deleted',   val: deletedCount,   color:'#e53e3e' },
                { label:'Manual',    val: drawnCount,     color:'#1d8348' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Geist', sans-serif", fontSize:18, fontWeight:900, color:s.color, lineHeight:1 }}>{s.val}</div>
                  <div style={{ fontFamily:"'Geist Mono', monospace", fontSize:8, color:'#6e6e73', letterSpacing:'.1em', textTransform:'uppercase', marginTop:3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Instructions */}
            <div style={{
              padding: '8px 10px', background: drawMode ? 'rgba(0,113,227,0.06)' : 'rgba(0,0,0,0.025)',
              border: `1px solid ${drawMode ? 'rgba(0,113,227,0.2)' : 'rgba(0,0,0,0.07)'}`,
              borderRadius: 10,
            }}>
              <div style={{ fontFamily:"'Geist Mono', monospace", fontSize:10, color: drawMode ? '#0071e3' : '#6e6e73', lineHeight:1.6 }}>
                {drawMode
                  ? `✏ Click map to add vertex\n${draftCoords.length} point${draftCoords.length !== 1 ? 's' : ''} placed${draftCoords.length >= 3 ? ' — ready to finish' : ''}`
                  : '← Click a red panel to remove it\nor use Draw to add new panels'}
              </div>
            </div>

            {/* Draw / finish / cancel */}
            {!drawMode ? (
              <button
                onClick={() => { setDrawMode(true); showToast('✏ Click map to place polygon vertices'); }}
                style={{
                  display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                  padding:'10px 14px', borderRadius:10,
                  background:'rgba(0,113,227,0.08)', border:'1.5px solid rgba(0,113,227,0.25)',
                  cursor:'pointer', color:'#0071e3',
                  fontFamily:"'Geist', sans-serif", fontSize:13, fontWeight:600,
                  transition:'all .18s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                Draw New Panel
              </button>
            ) : (
              <div style={{ display:'flex', gap:7 }}>
                <button
                  onClick={handleCompleteDraw}
                  disabled={draftCoords.length < 3}
                  style={{
                    flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                    padding:'9px', borderRadius:10,
                    background: draftCoords.length >= 3 ? 'rgba(29,131,72,0.09)' : 'rgba(0,0,0,0.04)',
                    border: `1.5px solid ${draftCoords.length >= 3 ? 'rgba(29,131,72,0.3)' : 'rgba(0,0,0,0.1)'}`,
                    cursor: draftCoords.length >= 3 ? 'pointer' : 'not-allowed',
                    color: draftCoords.length >= 3 ? '#1d8348' : '#a0a0a0',
                    fontFamily:"'Geist', sans-serif", fontSize:12, fontWeight:600,
                    transition:'all .18s',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Finish ({draftCoords.length}pts)
                </button>
                <button
                  onClick={handleCancelDraw}
                  style={{
                    display:'flex', alignItems:'center', justifyContent:'center',
                    padding:'9px 12px', borderRadius:10,
                    background:'rgba(229,62,62,0.07)', border:'1.5px solid rgba(229,62,62,0.2)',
                    cursor:'pointer', color:'#e53e3e',
                    fontFamily:"'Geist', sans-serif", fontSize:12, fontWeight:600,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Undo / Export row */}
            <div style={{ display:'flex', gap:7 }}>
              <button
                onClick={handleUndo}
                disabled={!undoStack.length}
                style={{
                  flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  padding:'9px', borderRadius:10,
                  background:'rgba(0,0,0,0.03)', border:'1px solid rgba(0,0,0,0.09)',
                  cursor: undoStack.length ? 'pointer' : 'not-allowed',
                  color: undoStack.length ? '#1d1d1f' : '#c0c0c0',
                  fontFamily:"'Geist', sans-serif", fontSize:12, fontWeight:600,
                  transition:'all .18s',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
                </svg>
                Undo
              </button>
              <button
                onClick={handleExport}
                style={{
                  flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  padding:'9px', borderRadius:10,
                  background:'rgba(29,131,72,0.08)', border:'1.5px solid rgba(29,131,72,0.25)',
                  cursor:'pointer', color:'#1d8348',
                  fontFamily:"'Geist', sans-serif", fontSize:12, fontWeight:600,
                  transition:'all .18s',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export
              </button>
            </div>

            {/* Reset all */}
            {(deletedCount > 0 || drawnCount > 0) && (
              <button
                onClick={() => {
                  if (!confirm(`Reset all edits? (${deletedCount} deletions + ${drawnCount} manual panels)`)) return;
                  saveUndo();
                  setDeletedIds(new Set());
                  setDrawnPanels([]);
                  showToast('↺ All edits reset');
                }}
                style={{
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  padding:'8px', borderRadius:10,
                  background:'transparent', border:'1px solid rgba(0,0,0,0.09)',
                  cursor:'pointer', color:'#6e6e73',
                  fontFamily:"'Geist Mono', monospace", fontSize:10, letterSpacing:'.1em',
                }}
              >
                Reset all edits
              </button>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          TOAST NOTIFICATION
      ══════════════════════════════════════════════════ */}
      {toast && (
        <div style={{
          position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)',
          zIndex:1001, background:'rgba(29,29,31,0.92)', backdropFilter:'blur(12px)',
          color:'#fff', padding:'10px 22px', borderRadius:980,
          fontFamily:"'Geist', sans-serif", fontSize:13, fontWeight:500,
          boxShadow:'0 4px 24px rgba(0,0,0,0.2)',
          animation:'toastIn .22s ease',
          whiteSpace:'nowrap',
        }}>
          {toast}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          DRAW MODE CURSOR HINT (top center)
      ══════════════════════════════════════════════════ */}
      {drawMode && (
        <div style={{
          position:'absolute', top:14, left:'50%', transform:'translateX(-50%)',
          zIndex:1001, background:'rgba(0,113,227,0.94)', backdropFilter:'blur(8px)',
          color:'#fff', padding:'7px 20px', borderRadius:980,
          fontFamily:"'Geist Mono', monospace", fontSize:11, letterSpacing:'.1em',
          boxShadow:'0 4px 16px rgba(0,113,227,0.3)',
          display:'flex', alignItems:'center', gap:8,
        }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'#fff', animation:'drawPulse 1s infinite', display:'inline-block' }}/>
          DRAW MODE — click map to place vertices · right-click to cancel last point
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          LEAFLET MAP
      ══════════════════════════════════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&display=swap');

        .leaflet-container { background:#f0ece8; font-family:'Geist',system-ui,sans-serif; cursor:${drawMode?'crosshair':'grab'}; }
        .leaflet-container:active { cursor:${drawMode?'crosshair':'grabbing'}; }

        /* Popup */
        .leaflet-popup-content-wrapper {
          border-radius:16px!important; border:1px solid rgba(0,0,0,0.09)!important;
          box-shadow:0 8px 32px rgba(0,0,0,0.14),0 2px 8px rgba(0,0,0,0.08)!important;
          padding:0!important; overflow:hidden!important;
          background:#fff!important; min-width:240px!important;
        }
        .leaflet-popup-content { margin:0!important; padding:0!important; width:auto!important; }
        .leaflet-popup-tip-container { display:none!important; }
        .leaflet-popup-close-button {
          top:10px!important; right:12px!important; color:#6e6e73!important;
          font-size:18px!important; width:22px!important; height:22px!important;
          display:flex!important; align-items:center!important; justify-content:center!important;
          border-radius:50%!important; transition:background .15s!important;
        }
        .leaflet-popup-close-button:hover { background:rgba(0,0,0,0.06)!important; }

        /* Tooltips */
        .geo-tooltip {
          background:#fff!important; border:1px solid rgba(0,0,0,0.09)!important;
          border-radius:8px!important; box-shadow:0 4px 16px rgba(0,0,0,0.1)!important;
          padding:5px 10px!important; font-family:'Geist Mono',monospace!important;
          font-size:10px!important; color:#1d1d1f!important; white-space:nowrap!important;
        }
        .geo-tooltip::before { display:none!important; }

        /* Delete tooltip — red accent */
        .del-tooltip {
          background:#fff!important; border:1.5px solid rgba(229,62,62,0.35)!important;
          border-radius:10px!important; box-shadow:0 4px 20px rgba(229,62,62,0.15)!important;
          padding:0!important; overflow:hidden!important;
        }
        .del-tooltip::before { display:none!important; }

        /* Manual panel tooltip — green accent */
        .manual-tooltip {
          background:#fff!important; border:1.5px solid rgba(29,131,72,0.35)!important;
          border-radius:10px!important; box-shadow:0 4px 20px rgba(29,131,72,0.15)!important;
          padding:0!important; overflow:hidden!important;
        }
        .manual-tooltip::before { display:none!important; }

        /* Wiring animation */
        .wiring-path { stroke-dasharray:7 4; animation:wireDash 1.4s linear infinite; }
        @keyframes wireDash { to { stroke-dashoffset:-22; } }

        /* Polygon hover */
        .solar-polygon { transition:fill-opacity 0.15s; }
        .solar-polygon:hover { fill-opacity:0.75!important; }

        /* Edit-mode polygon: glows red on hover */
        .solar-del:hover { fill-opacity:0.85!important; filter:drop-shadow(0 0 6px rgba(229,62,62,0.6)); cursor:pointer; }

        /* Draft polygon vertices */
        .draft-vertex { cursor:crosshair; }

        /* Toast in */
        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

        /* Draw pulse dot */
        @keyframes drawPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.5)} }

        /* Attribution */
        .leaflet-control-attribution {
          background:rgba(255,255,255,0.85)!important; backdrop-filter:blur(8px)!important;
          border-radius:6px 0 0 0!important; font-family:'Geist Mono',monospace!important;
          font-size:9px!important; padding:3px 8px!important;
        }
        .leaflet-control-zoom a {
          background:rgba(255,255,255,0.92)!important; backdrop-filter:blur(8px)!important;
          border-color:rgba(0,0,0,0.1)!important; color:#1d1d1f!important;
        }
        .leaflet-control-zoom a:hover { background:#f5f5f7!important; }
      `}</style>

      <MapContainer
        center={CENTER} zoom={12} maxZoom={24}
        style={{ height:'100%', width:'100%', zIndex:0 }}
      >
        <TileLayer url={MAP_URLS[baseMap] || MAP_URLS.satellite} maxZoom={24} maxNativeZoom={21} />
        <AutoZoom bounds={imageBounds} />
        <ZoomTracker onZoom={setZoom} />
        <DrawController drawMode={drawMode} onAddVertex={handleAddVertex} />

        {/* Overlay image */}
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

        {/* Wiring node dots */}
        {activeLayers?.stringWiring && zoom >= 17 && panels.map((p, i) => {
          if (!p.centroid_lat || !p.centroid_lon) return null;
          const color = STRING_COLORS[Math.floor(i/STRING_SIZE) % STRING_COLORS.length];
          return <CircleMarker key={`nd-${i}`} center={[p.centroid_lat, p.centroid_lon]} radius={3} pathOptions={{ color:'#fff', fillColor:color, fillOpacity:1, weight:1.5 }} />;
        })}

        {/* ── AI-detected panels ──────────────────────── */}
        {panels.map((panel, index) => {
          const pId = panel.id ?? index;
          if (deletedIds.has(pId)) return null;

          const positions = parseGeometry(panel.geom);
          if (!positions) return null;

          const conf     = panel.confidence_score || 0;
          const area     = panel.area_sqm         || 0;
          const phaseScr = area * conf;
          const cc       = confColor(conf);
          const pc       = phaseColor(phaseScr);

          let fill: string, border: string;
          if (activeLayers?.priority)  { fill = phaseColor(phaseScr).fill; border = phaseColor(phaseScr).border; }
          else if (activeLayers?.heatmap) { fill = areaColor(area).fill; border = areaColor(area).border; }
          else                          { fill = cc.fill; border = cc.border; }

          const energyDay = panel.daily_energy_kwh?.toFixed(2)  ?? '—';
          const energyYr  = panel.yearly_energy_kwh?.toFixed(0)  ?? '—';
          const savings   = panel.yearly_savings_baht?.toLocaleString(undefined,{maximumFractionDigits:0}) ?? '—';
          const co2       = panel.co2_offset_kg?.toFixed(1) ?? '—';

          /* In edit mode — make red + show delete in popup */
          const editFill   = editMode ? '#e53e3e' : fill;
          const editBorder = editMode ? '#c53030' : border;
          const editOpacity = editMode ? 0.5 : fillOpacity;

          return (
            <Polygon
              key={pId}
              positions={positions as any}
              className={editMode ? 'solar-del' : 'solar-polygon'}
              pathOptions={{
                color:       editBorder,
                fillColor:   editFill,
                fillOpacity: activeLayers?.heatmap ? 0.65 : editOpacity,
                weight:      strokeWeight,
                lineCap:     'round', lineJoin:'round',
              }}
              eventHandlers={editMode ? {
                click: () => {
                  if (confirm(`Remove PNL-${String(pId).padStart(4,'0')} (${area.toFixed(1)} m²) as false-positive?`))
                    handleDelete(pId);
                },
              } : {}}
            >
              {/* Popup — normal mode */}
              {!editMode && (
                <Popup maxWidth={280} minWidth={240} closeButton>
                  <div style={{ fontFamily:"'Geist',system-ui,sans-serif" }}>
                    {/* Header */}
                    <div style={{ padding:'14px 16px 12px', borderBottom:'1px solid rgba(0,0,0,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontFamily:"'Geist Mono',monospace", fontSize:10, color:'#6e6e73', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:3 }}>Solar Panel</div>
                        <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:18, fontWeight:800, letterSpacing:'-.02em', color:'#1d1d1f', lineHeight:1 }}>
                          PNL-{String(pId).padStart(4,'0')}
                        </div>
                      </div>
                      <div style={{ padding:'5px 11px', borderRadius:980, background:`${cc.fill}12`, border:`1px solid ${cc.fill}30`, fontFamily:"'Geist Mono',monospace", fontSize:11, fontWeight:600, color:cc.fill }}>
                        {(conf*100).toFixed(1)}%
                      </div>
                    </div>

                    {/* KPI row */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderBottom:'1px solid rgba(0,0,0,0.07)' }}>
                      {[{ l:'Area', v:`${area.toFixed(1)} m²`, c:'#0071e3' },{ l:'Daily', v:`${energyDay} kWh`, c:'#1d8348' },{ l:'Yearly', v:`${energyYr} kWh`, c:'#1d8348' }]
                        .map((s,i,arr) => (
                          <div key={s.l} style={{ padding:'11px 12px', textAlign:'center', borderRight: i<arr.length-1?'1px solid rgba(0,0,0,0.07)':'none' }}>
                            <div style={{ fontFamily:"'Geist Mono',monospace", fontSize:8, color:'#a0a0a0', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:4 }}>{s.l}</div>
                            <div style={{ fontFamily:"'Geist',sans-serif", fontSize:13, fontWeight:700, color:s.c, lineHeight:1 }}>{s.v}</div>
                          </div>
                        ))}
                    </div>

                    {/* Details */}
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

                    {/* Phase footer */}
                    {activeLayers?.priority && (
                      <div style={{ padding:'10px 16px', background:`${pc.fill}09`, borderTop:`1px solid ${pc.fill}20`, display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:pc.fill }} />
                        <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:10, color:pc.fill, fontWeight:600, letterSpacing:'.08em' }}>{pc.label}</span>
                      </div>
                    )}
                  </div>
                </Popup>
              )}

              {/* Tooltip — normal mode: quick preview */}
              {!editMode && (
                <Tooltip className="geo-tooltip" direction="top" offset={[0,-4]}>
                  <span style={{ color:fill, fontWeight:600 }}>PNL-{String(pId).padStart(4,'0')}</span>
                  {'  '}·{'  '}{area.toFixed(1)} m²
                  {'  '}·{'  '}<span style={{ color:cc.fill }}>{(conf*100).toFixed(0)}% conf</span>
                </Tooltip>
              )}

              {/* Tooltip — edit mode: delete hint */}
              {editMode && (
                <Tooltip className="geo-tooltip" direction="top" offset={[0,-4]}>
                  <span style={{ color:'#e53e3e', fontWeight:600 }}>🗑 Click to remove</span>
                  {'  '}PNL-{String(pId).padStart(4,'0')}
                  {'  '}·{'  '}{area.toFixed(1)} m²
                  {'  '}·{'  '}<span style={{ color:cc.fill }}>{(conf*100).toFixed(0)}%</span>
                </Tooltip>
              )}
            </Polygon>
          );
        })}

        {/* ── Manually drawn panels ───────────────────── */}
        {drawnPanels.map(p => (
          <Polygon
            key={p.id}
            positions={p.coords as any}
            pathOptions={{
              color:       '#1d8348',
              fillColor:   '#1d8348',
              fillOpacity: 0.35,
              weight:      2.5,
              dashArray:   editMode ? '6 3' : undefined,
            }}
          >
            <Popup maxWidth={240} minWidth={200} closeButton>
              <div style={{ fontFamily:"'Geist',system-ui,sans-serif" }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(0,0,0,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontFamily:"'Geist Mono',monospace", fontSize:9, color:'#1d8348', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:3 }}>Manual Panel</div>
                    <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:16, fontWeight:800, color:'#1d1d1f' }}>User-drawn</div>
                  </div>
                  <div style={{ padding:'4px 10px', borderRadius:980, background:'rgba(29,131,72,0.1)', border:'1px solid rgba(29,131,72,0.25)', fontFamily:"'Geist Mono',monospace", fontSize:10, fontWeight:600, color:'#1d8348' }}>
                    Manual
                  </div>
                </div>
                <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:9, color:'#6e6e73', letterSpacing:'.12em', textTransform:'uppercase' }}>Vertices</span>
                    <span style={{ fontFamily:"'Geist',sans-serif", fontSize:13, fontWeight:600, color:'#1d1d1f' }}>{p.coords.length} points</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:9, color:'#6e6e73', letterSpacing:'.12em', textTransform:'uppercase' }}>Source</span>
                    <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:10, color:'#1d8348' }}>Human correction</span>
                  </div>
                </div>
                {editMode && (
                  <div style={{ padding:'10px 16px', borderTop:'1px solid rgba(0,0,0,0.07)' }}>
                    <button
                      onClick={() => handleDeleteDrawn(p.id)}
                      style={{
                        width:'100%', padding:'8px', borderRadius:8,
                        background:'rgba(229,62,62,0.07)', border:'1px solid rgba(229,62,62,0.2)',
                        cursor:'pointer', color:'#e53e3e',
                        fontFamily:"'Geist',sans-serif", fontSize:12, fontWeight:600,
                        display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      Remove this panel
                    </button>
                  </div>
                )}
              </div>
            </Popup>
            <Tooltip className="geo-tooltip" direction="top" offset={[0,-4]}>
              <span style={{ color:'#1d8348', fontWeight:600 }}>✏ Manual Panel</span>
              {'  '}·{'  '}{p.coords.length} vertices
              {editMode && '  · click to remove'}
            </Tooltip>
          </Polygon>
        ))}

        {/* ── Draft polygon while drawing ─────────────── */}
        {draftCoords.length >= 2 && (
          <Polygon
            positions={draftCoords as any}
            pathOptions={{ color:'#0071e3', fillColor:'#0071e3', fillOpacity:0.18, weight:2, dashArray:'6 3' }}
          />
        )}

        {/* Draft vertex dots */}
        {draftCoords.map(([lat,lon],i) => (
          <CircleMarker
            key={`dv-${i}`}
            center={[lat,lon]}
            radius={i === 0 ? 6 : 4}
            className="draft-vertex"
            pathOptions={{
              color: i === 0 ? '#fff' : '#0071e3',
              fillColor: i === 0 ? '#0071e3' : '#fff',
              fillOpacity: 1,
              weight: 2,
            }}
          >
            <Tooltip className="geo-tooltip" permanent direction="top" offset={[0,-8]}>
              <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:9, color:'#0071e3' }}>
                {i === 0 ? 'Start' : `P${i+1}`}
              </span>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Centroid markers (high zoom, non-edit) */}
        {!editMode && !activeLayers?.stringWiring && zoom >= 18 && panels
          .filter(p => !deletedIds.has(p.id ?? p))
          .map((p, i) => {
            if (!p.centroid_lat || !p.centroid_lon) return null;
            const cc = confColor(p.confidence_score || 0);
            return <CircleMarker key={`ctr-${i}`} center={[p.centroid_lat,p.centroid_lon]} radius={2.5} pathOptions={{ color:'#fff', fillColor:cc.fill, fillOpacity:1, weight:1.5 }} />;
          })}
      </MapContainer>
    </div>
  );
}