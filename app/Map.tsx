'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap, ImageOverlay, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const parseGeometry = (geom: any) => {
  if (!geom) return null;
  try {
    if (typeof geom === 'object' && geom.type === 'Polygon' && geom.coordinates) {
      return geom.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
    }
    if (typeof geom === 'string') {
      if (geom.includes('POLYGON')) {
        const cleanWkt = geom.split(';').pop() || geom;
        const match = cleanWkt.match(/\(\((.*?)\)\)/);
        if (!match) return null;
        const points = match[1].split(',');
        const coordinates: [number, number][] = [];
        for (const point of points) {
          const parts = point.trim().split(/\s+/);
          if (parts.length >= 2) {
            const lon = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            if (!isNaN(lon) && !isNaN(lat)) coordinates.push([lat, lon]); 
          }
        }
        return coordinates.length >= 3 ? coordinates : null;
      }
      if (/^[0-9A-Fa-f]+$/.test(geom)) {
        const matchHex = geom.match(/[\da-f]{2}/gi);
        if (!matchHex) return null;
        const buffer = new Uint8Array(matchHex.map(h => parseInt(h, 16))).buffer;
        const view = new DataView(buffer);
        const isLittleEndian = view.getUint8(0) === 1;
        const typeCode = view.getUint32(1, isLittleEndian);
        const hasSRID = (typeCode & 0x20000000) !== 0;
        let offset = 5;
        if (hasSRID) offset += 4;
        const numRings = view.getUint32(offset, isLittleEndian);
        offset += 4;
        if (numRings === 0) return null;
        const numPoints = view.getUint32(offset, isLittleEndian);
        offset += 4;
        const coordinates: [number, number][] = [];
        for (let i = 0; i < numPoints; i++) {
          const lon = view.getFloat64(offset, isLittleEndian);
          offset += 8;
          const lat = view.getFloat64(offset, isLittleEndian);
          offset += 8;
          coordinates.push([lat, lon]);
        }
        return coordinates.length >= 3 ? coordinates : null;
      }
    }
    return null;
  } catch (error) { return null; }
};

function AutoZoom({ imageBounds }: { imageBounds: any }) {
  const map = useMap();
  useEffect(() => {
    if (imageBounds) {
      setTimeout(() => map.flyToBounds(imageBounds, { padding: [20, 20], maxZoom: 22, duration: 1.5 }), 500);
    }
  }, [imageBounds, map]);
  return null;
}

interface MapProps {
  panels: any[];
  overlayImage?: string | null;
  imageBounds?: [[number, number], [number, number]] | null;
  baseMap: string;
  activeLayers?: { heatmap?: boolean; stringWiring?: boolean; priority?: boolean }; 
}

export default function MapComponent({ panels, overlayImage, imageBounds, baseMap, activeLayers }: MapProps) {
  const center: [number, number] = [13.85, 100.5];
  const mapUrls: Record<string, string> = {
    satellite: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    street: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  };

  // 🌟 ฟังก์ชันจัดกลุ่มสายไฟ (String Inverter Grouping)
  // แบ่งแผงเป็นกลุ่มๆ ละ 8 แผง เพื่อจำลองการต่ออนุกรมเข้า Inverter
  const stringSize = 8;
  const stringColors = ['#eab308', '#06b6d4', '#ec4899', '#a855f7', '#22c55e', '#f97316']; 
  const stringGroups: Record<number, [number, number][]> = {};

  if (activeLayers?.stringWiring) {
    panels.forEach((p, i) => {
      if (p.centroid_lat && p.centroid_lon) {
        const stringId = Math.floor(i / stringSize);
        if (!stringGroups[stringId]) stringGroups[stringId] = [];
        stringGroups[stringId].push([p.centroid_lat, p.centroid_lon]);
      }
    });
  }

  return (
    <>
      <style>{`
        .wiring-path { stroke-dasharray: 6; animation: dash-flow 1.5s linear infinite; }
        @keyframes dash-flow { from { stroke-dashoffset: 12; } to { stroke-dashoffset: 0; } }
        .phase-tooltip { background: #0f172a !important; border: 1px solid #475569 !important; color: #f8fafc !important; font-family: monospace; font-size: 10px; }
      `}</style>

      <MapContainer center={center} zoom={12} maxZoom={24} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <TileLayer url={mapUrls[baseMap] || mapUrls.dark} maxZoom={24} maxNativeZoom={21} />
        <AutoZoom imageBounds={imageBounds} />

        {overlayImage && imageBounds && <ImageOverlay url={overlayImage} bounds={imageBounds} opacity={0.85} zIndex={10} />}

        {/* 🌟 1. String Inverter Wiring (วาดเส้นเดินสายไฟ) */}
        {activeLayers?.stringWiring && Object.entries(stringGroups).map(([stringId, coords]) => {
          const sId = parseInt(stringId);
          const color = stringColors[sId % stringColors.length];
          return (
            <Polyline key={`string-${sId}`} positions={coords} pathOptions={{ color: color, weight: 2.5, opacity: 0.9, className: 'wiring-path' }}>
              <Tooltip sticky className="phase-tooltip">🔌 STRING #{sId + 1} (Array: {coords.length} units)</Tooltip>
            </Polyline>
          );
        })}

        {/* แผงโซลาร์เซลล์ */}
        {panels && panels.map((panel, index) => {
          if (!panel?.geom) return null;
          const positions = parseGeometry(panel.geom);
          if (!positions) return null;

          const confScore = panel.confidence_score || 0;
          let fillColor = confScore >= 0.50 ? '#10b981' : '#f59e0b';
          let borderColor = confScore >= 0.50 ? '#00ff00' : '#fbbf24';
          let phaseLabel = "Standard Phase";

          // 🌟 2. Priority Zoning Mode (การแบ่งเฟสลงทุน)
          if (activeLayers?.priority) {
            // สูตรประเมิน: พื้นที่ * ความแม่นยำ
            const score = panel.area_sqm * confScore;
            if (score > 3.5) { // Phase 1: High Yield & High Confidence
              fillColor = '#10b981'; borderColor = '#059669'; phaseLabel = "✅ PHASE 1: Immediate Action";
            } else if (score > 1.5) { // Phase 2: Moderate
              fillColor = '#3b82f6'; borderColor = '#2563eb'; phaseLabel = "▶️ PHASE 2: Standard Plan";
            } else { // Phase 3: Low ROI / High Risk
              fillColor = '#64748b'; borderColor = '#475569'; phaseLabel = "⏸️ PHASE 3: Low Priority/Review";
            }
          }

          // 🌟 3. Heatmap Mode
          if (activeLayers?.heatmap) {
            if (panel.area_sqm >= 6) { fillColor = '#ef4444'; borderColor = '#ff0000'; } 
            else if (panel.area_sqm >= 4) { fillColor = '#f97316'; borderColor = '#fb923c'; } 
            else if (panel.area_sqm >= 2) { fillColor = '#eab308'; borderColor = '#facc15'; } 
            else { fillColor = '#3b82f6'; borderColor = '#60a5fa'; } 
          }

          return (
            <Polygon key={panel.id || index} positions={positions as any} pathOptions={{ color: borderColor, fillColor: fillColor, fillOpacity: activeLayers?.heatmap ? 0.7 : 0.6, weight: 2 }}>
              <Popup>
                <div className="font-sans text-sm min-w-[180px]">
                  <p className="font-bold text-slate-800 mb-2 border-b pb-1">📊 Engineering Data</p>
                  <div className="space-y-1 text-slate-700">
                    <p className="flex justify-between items-center">
                      <span>รหัสติดตั้ง:</span> <span className="font-mono text-[10px] bg-slate-100 px-1 rounded border">PNL-{panel.id || index}</span>
                    </p>
                    {activeLayers?.priority && (
                      <p className="flex justify-between text-xs font-bold text-indigo-600 mt-1 mb-1">
                        {phaseLabel}
                      </p>
                    )}
                    <p className="flex justify-between"><span>พื้นที่:</span> <span className="font-semibold text-blue-600">{panel.area_sqm} m²</span></p>
                    <p className="flex justify-between"><span>ความมั่นใจ AI:</span> <span className="font-semibold text-purple-600">{(confScore * 100).toFixed(1)}%</span></p>
                    <p className="flex justify-between"><span>ผลิตพลังงาน:</span> <span className="font-semibold text-emerald-600">{panel.yearly_energy_kwh?.toLocaleString()} kWh</span></p>
                  </div>
                </div>
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>
    </>
  );
}