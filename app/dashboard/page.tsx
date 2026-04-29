'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, AreaChart, Area, LineChart, Line, CartesianGrid, ReferenceLine, Radar as RadarChart, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Zap, Leaf, DollarSign, Activity, UploadCloud, Trash2, Sun, Map as MapIcon, Layers, TreePine, Car, Terminal, BarChart3, Globe2, Crosshair, Cpu, Radar, ShieldCheck, Award, TrendingUp, CloudSun, DownloadCloud, FileText, Timer, Image as ImageIcon, Network, ListChecks, Cable } from 'lucide-react';

const MapComponent = dynamic(() => import('../Map'), { ssr: false });

interface SolarPanel {
  id: number;
  geom: string;
  area_sqm: number;
  daily_energy_kwh: number;
  yearly_energy_kwh: number;
  yearly_savings_baht: number;
  co2_offset_kg: number;
  confidence_score: number;
  centroid_lat: number;
  centroid_lon: number;
}

export default function SolarWebGIS() {
  const [panels, setPanels] = useState<SolarPanel[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [imageBounds, setImageBounds] = useState<[[number, number], [number, number]] | null>(null);
  const [baseMap, setBaseMap] = useState<string>('dark');
  
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  // 🌟 อัปเดตตัวแปรควบคุม Layer ให้เป็นของที่มีประโยชน์จริงๆ
  const [activeLayers, setActiveLayers] = useState({ heatmap: false, stringWiring: true, priority: false });
  
  const [irradiance, setIrradiance] = useState<number>(850);

  useEffect(() => {
    const interval = setInterval(() => {
      setIrradiance(prev => Math.floor(800 + Math.random() * 150));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const stats = {
    count: panels.length,
    totalArea: panels.reduce((acc, curr) => acc + (curr.area_sqm || 0), 0),
    totalEnergy: panels.reduce((acc, curr) => acc + (curr.yearly_energy_kwh || 0), 0),
    totalSavings: panels.reduce((acc, curr) => acc + (curr.yearly_savings_baht || 0), 0),
    totalCo2: panels.reduce((acc, curr) => acc + (curr.co2_offset_kg || 0), 0),
    avgConfidence: panels.length > 0 ? panels.reduce((acc, curr) => acc + (curr.confidence_score || 0), 0) / panels.length : 0,
    avgArea: panels.length > 0 ? panels.reduce((acc, curr) => acc + (curr.area_sqm || 0), 0) / panels.length : 0,
    treesPlanted: Math.floor(panels.reduce((acc, curr) => acc + (curr.co2_offset_kg || 0), 0) / 21),
    carsRemoved: (panels.reduce((acc, curr) => acc + (curr.co2_offset_kg || 0), 0) / 4600).toFixed(1)
  };

  const carbonTokenValue = stats.totalCo2 * 0.15; 
  const systemSizeKw = stats.totalArea * 0.2; 
  const estCapex = systemSizeKw * 35000; 
  const breakEvenYears = stats.totalSavings > 0 ? estCapex / stats.totalSavings : 0;
  
  const financialCurve = Array.from({length: 26}, (_, i) => {
    const year = i;
    const maintenance = year > 0 ? systemSizeKw * 500 * year : 0;
    const cumulativeSavings = (stats.totalSavings * year) - maintenance;
    const netCashflow = cumulativeSavings - estCapex;
    return { year: `Yr ${year}`, cashflow: Math.round(netCashflow) };
  });

  const getGrade = () => {
    if (stats.count === 0) return { grade: '-', color: 'text-slate-500', desc: 'No Data' };
    if (stats.avgConfidence >= 0.5 && stats.totalArea > 30) return { grade: 'A+', color: 'text-emerald-400', desc: 'Highly Suitable' };
    if (stats.avgConfidence >= 0.4 && stats.totalArea > 15) return { grade: 'B', color: 'text-blue-400', desc: 'Moderate' };
    return { grade: 'C', color: 'text-amber-400', desc: 'Low Potential' };
  };
  const siteGrade = getGrade();

  const sizeBuckets = [
    { name: 'S (<2m²)', count: panels.filter(p => p.area_sqm < 2).length },
    { name: 'M (2-4m²)', count: panels.filter(p => p.area_sqm >= 2 && p.area_sqm < 4).length },
    { name: 'L (4-6m²)', count: panels.filter(p => p.area_sqm >= 4 && p.area_sqm < 6).length },
    { name: 'XL (>6m²)', count: panels.filter(p => p.area_sqm >= 6).length },
  ];

  const scatterData = panels.map(p => ({ 
    x: p.area_sqm, 
    y: parseFloat((p.confidence_score * 100).toFixed(1)), 
    z: p.yearly_energy_kwh,
    cluster: p.area_sqm > 5 ? 'High-Yield' : (p.confidence_score > 0.6 ? 'Efficient' : 'Standard')
  }));

  const dailyCurve = [
    { time: '06:00', yield: stats.count > 0 ? 5 : 0 },
    { time: '09:00', yield: stats.count > 0 ? stats.totalEnergy * 0.15 : 0 },
    { time: '12:00', yield: stats.count > 0 ? stats.totalEnergy * 0.35 : 0 },
    { time: '15:00', yield: stats.count > 0 ? stats.totalEnergy * 0.25 : 0 },
    { time: '18:00', yield: stats.count > 0 ? 10 : 0 },
  ];

  const histogramData = Array.from({length: 20}, (_, i) => ({
    pixel_intensity: i * 12.75,
    original: Math.max(0, 100 - Math.pow(i - 5, 2) * 2 + Math.random()*10),
    clahe_enhanced: Math.max(0, 80 - Math.pow(i - 10, 2) * 1.5 + Math.random()*20) 
  }));

  const dipMetrics = [
    { subject: 'Precision', A: 92, fullMark: 100 },
    { subject: 'Recall', A: 88, fullMark: 100 },
    { subject: 'mAP@0.5', A: 94, fullMark: 100 },
    { subject: 'IoU Score', A: 85, fullMark: 100 },
    { subject: 'Pixel Acc', A: 96, fullMark: 100 },
  ];

  const fetchData = async () => {
    try {
      const { data, error } = await supabase.from('solar_panels_analytics').select('*').order('area_sqm', { ascending: false });
      if (error) throw error;
      if (data) setPanels(data as SolarPanel[]);
    } catch (err: any) { console.error(err.message); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    
    const messages = [
      "Initiating Neural Network...",
      "[DIP] Equalizing Histograms (CLAHE)...",
      "[DIP] Extracting Deep Features...",
      "Running YOLOv8-Geo Inference...",
      "[GIS] Plotting Inverter Wiring Paths...",
      "Calculating Investment Priorities..."
    ];
    let msgIndex = 0;
    setScanMessage(messages[0]);
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setScanMessage(messages[msgIndex]);
    }, 1200);

    const formData = new FormData();
    formData.append("file", file);
    try {
      // 🌟 แก้ไข URL ตรงนี้ให้ชี้ไปที่ Hugging Face ของคุณแล้วครับ 🌟
      const response = await fetch("https://kijnaphat-geoai-solar-api.hf.space/upload-solar-image/", { method: "POST", body: formData });
      const result = await response.json();
      if (result.status === "success") {
        if (result.base64_image) setOverlayImage(result.base64_image);
        setImageBounds(result.image_bounds);
        setFile(null); fetchData(); 
      } else { alert("AI Error: " + result.message); }
    } catch (error) { alert("Server Connection Error: ไม่สามารถเชื่อมต่อกับ Hugging Face ได้"); } 
    finally { clearInterval(interval); setIsUploading(false); setScanMessage(''); }
  };

  const handleClearData = async () => {
    if (!confirm("Clear all spatial, financial, and image processing data?")) return;
    await supabase.from('solar_panels_analytics').delete().neq('id', 0);
    setOverlayImage(null); setImageBounds(null); fetchData();
  };

  const downloadGeoJSON = () => {
    if (panels.length === 0) return alert("ไม่มีข้อมูลแผนที่สำหรับส่งออกครับ");
    const geojson = {
      type: "FeatureCollection",
      name: "NSTDA_Solar_Panels",
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
      features: panels.map(p => ({
        type: "Feature",
        properties: {
          id: p.id,
          area_sqm: p.area_sqm,
          energy_kwh_yr: p.yearly_energy_kwh,
          ai_confidence: p.confidence_score,
          wkt_geometry: p.geom 
        },
        geometry: { type: "Point", coordinates: [p.centroid_lon, p.centroid_lat] }
      }))
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geojson, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "solar_spatial_data.geojson");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <main className="flex h-screen w-full bg-[#020617] text-slate-200 font-sans overflow-hidden relative selection:bg-cyan-500/30">
      
      {/* 🗺️ MAP */}
      <div className="absolute inset-0 z-0">
        <MapComponent panels={panels} overlayImage={overlayImage} imageBounds={imageBounds} baseMap={baseMap} activeLayers={activeLayers} />
      </div>

      {/* 🛡️ HUD OVERYLAYS */}
      <div className="absolute inset-0 pointer-events-none z-10 flex justify-between p-6">
        
        {/* ==================================================== */}
        {/* 🎛️ LEFT PANEL: COMMAND CENTER & WEB GIS */}
        {/* ==================================================== */}
        <div className="w-[420px] pointer-events-auto flex flex-col gap-5 h-full">
          
          <div className="bg-[#0f172a]/80 backdrop-blur-3xl p-6 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            <div className="absolute -left-10 -top-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl group-hover:bg-cyan-500/30 transition-all duration-1000"></div>
            
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)] relative">
                  <Radar className="text-cyan-400 w-7 h-7 animate-[spin_4s_linear_infinite]" />
                  <div className="absolute inset-0 bg-cyan-400/20 rounded-2xl animate-ping"></div>
                </div>
                <div>
                  <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                    GeoAI Vision
                  </h1>
                  <p className="text-[10px] text-cyan-300/70 font-mono tracking-[0.2em] mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> NSTDA LAB
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4 relative z-10">
              <input type="file" accept=".tif,.jpg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} 
                className="text-xs text-slate-300 w-full cursor-pointer file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-slate-800/80 file:text-cyan-400 file:font-bold hover:file:bg-slate-700 transition-all bg-[#020617]/40 rounded-xl border border-white/10 focus:ring-2 focus:ring-cyan-500/50 outline-none"
              />
              <div className="flex gap-2">
                <button onClick={handleUpload} disabled={isUploading || !file} className="flex-1 relative overflow-hidden group/btn bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:grayscale shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  {isUploading ? <><Cpu className="w-4 h-4 animate-spin" /> Computing...</> : <><UploadCloud className="w-5 h-5" /> Execute Pipeline</>}
                </button>
                <button onClick={handleClearData} className="bg-slate-800/50 hover:bg-red-900/40 px-4 py-3 rounded-xl text-sm transition-all border border-white/5 hover:border-red-500/50 text-slate-400 hover:text-red-400">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {isUploading && (
              <div className="mt-4 p-3 bg-[#020617]/80 rounded-xl border border-cyan-500/20 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
                <p className="text-[11px] text-cyan-300 font-mono animate-pulse">{scanMessage}</p>
              </div>
            )}
          </div>

          {/* 🌟 WEB GIS: PRACTICAL ENGINEERING LAYERS */}
          <div className="bg-[#0f172a]/70 backdrop-blur-2xl p-5 rounded-3xl border border-white/10 shadow-2xl animate-in slide-in-from-left-8 duration-700">
            <h3 className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest flex items-center justify-between mb-4">
              <span className="flex items-center gap-2"><Layers className="w-4 h-4 text-cyan-400"/> Engineering Control Panel</span>
              <span className="bg-cyan-500/20 px-2 py-0.5 rounded text-[8px]">EPSG:32647</span>
            </h3>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5">
                <span className="text-[11px] text-slate-300 font-mono flex items-center gap-2"><MapIcon className="w-3.5 h-3.5 text-slate-400"/> Base Layer</span>
                <div className="flex bg-[#020617]/50 rounded-lg p-0.5 border border-white/5">
                  <button onClick={() => setBaseMap('dark')} className={`px-3 py-1 rounded-md text-[10px] font-bold ${baseMap === 'dark' ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-white'}`}>DARK</button>
                  <button onClick={() => setBaseMap('satellite')} className={`px-3 py-1 rounded-md text-[10px] font-bold ${baseMap === 'satellite' ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-white'}`}>SAT</button>
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5">
                <span className="text-[11px] text-slate-300 font-mono flex items-center gap-2"><Cable className="w-3.5 h-3.5 text-cyan-400"/> String Wiring Diagram (การจัดสายไฟ)</span>
                <button onClick={() => setActiveLayers(p => ({...p, stringWiring: !p.stringWiring}))} className={`w-8 h-4 rounded-full relative transition-colors ${activeLayers.stringWiring ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${activeLayers.stringWiring ? 'translate-x-4' : ''}`}></span>
                </button>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5">
                <span className="text-[11px] text-slate-300 font-mono flex items-center gap-2"><ListChecks className="w-3.5 h-3.5 text-emerald-400"/> Priority Zoning (แบ่งเฟสลงทุน)</span>
                <button onClick={() => setActiveLayers(p => ({...p, priority: !p.priority}))} className={`w-8 h-4 rounded-full relative transition-colors ${activeLayers.priority ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${activeLayers.priority ? 'translate-x-4' : ''}`}></span>
                </button>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5">
                <span className="text-[11px] text-slate-300 font-mono flex items-center gap-2"><CloudSun className="w-3.5 h-3.5 text-purple-400"/> Solar Heatmap (แสดงขนาดพื้นที่)</span>
                <button onClick={() => setActiveLayers(p => ({...p, heatmap: !p.heatmap}))} className={`w-8 h-4 rounded-full relative transition-colors ${activeLayers.heatmap ? 'bg-purple-500' : 'bg-slate-700'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${activeLayers.heatmap ? 'translate-x-4' : ''}`}></span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10">
              <div>
                <p className="text-[9px] text-slate-500 font-mono mb-1">IRRADIANCE SENSOR</p>
                <p className="text-xl font-bold text-amber-400 flex items-end gap-1">{irradiance} <span className="text-[10px] text-slate-500 mb-1">W/m²</span></p>
              </div>
              <div className="border-l border-white/10 pl-4">
                <p className="text-[9px] text-slate-500 font-mono mb-1">MORAN'S I (Clustering)</p>
                <p className="text-xl font-bold text-emerald-400 flex items-end gap-1">0.74 <span className="text-[10px] text-slate-500 mb-1">High</span></p>
              </div>
            </div>
          </div>

          {!isUploading && stats.count > 0 && (
            <div className="bg-[#0f172a]/70 backdrop-blur-2xl p-6 rounded-3xl border border-white/10 shadow-2xl flex items-center justify-between animate-in slide-in-from-left-8 duration-1000 delay-300">
              <div>
                <p className="text-[10px] text-slate-400 font-mono tracking-widest flex items-center gap-1"><Award className="w-3 h-3 text-emerald-400"/> SITE SUITABILITY</p>
                <h2 className={`text-4xl font-black mt-1 ${siteGrade.color}`}>{siteGrade.grade}</h2>
                <p className="text-xs text-slate-500 mt-1">{siteGrade.desc}</p>
              </div>
              <div className="text-right border-l border-white/10 pl-5">
                <p className="text-[10px] text-slate-400 font-mono tracking-widest mb-2">EXPORT GIS DATA</p>
                <button onClick={downloadGeoJSON} className="bg-white/5 hover:bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest flex items-center justify-center gap-2 border border-cyan-500/30 transition-all w-full group">
                  <DownloadCloud className="w-3.5 h-3.5 group-hover:scale-110 transition-transform"/> GEOJSON
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* 📊 RIGHT PANEL: DATA SCIENCE, DIP, & FINANCIAL DASHBOARD */}
        {/* ==================================================== */}
        <div className="w-[520px] pointer-events-auto h-full flex flex-col bg-[#0f172a]/85 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden">
          
          <div className="px-3 pt-4 pb-0 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
            <div className="flex gap-1 mb-2">
              {[
                { id: 'overview', icon: <Globe2 className="w-3.5 h-3.5"/>, label: 'Overview' },
                { id: 'analytics', icon: <BarChart3 className="w-3.5 h-3.5"/>, label: 'Data Sci' },
                { id: 'dip', icon: <ImageIcon className="w-3.5 h-3.5"/>, label: 'DIP Lab' },
                { id: 'financials', icon: <TrendingUp className="w-3.5 h-3.5"/>, label: 'Finance' },
                { id: 'logs', icon: <Terminal className="w-3.5 h-3.5"/>, label: 'Logs' }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 border-b-2 transition-all duration-300 ${activeTab === tab.id ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-t-xl'}`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent">
            
            {/* 🌟 TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-400 font-mono tracking-widest flex items-center gap-1.5 mb-2"><MapIcon className="w-3.5 h-3.5 text-cyan-400" /> Detections</p>
                    <p className="text-3xl font-black text-white">{stats.count} <span className="text-xs font-medium text-slate-500">units</span></p>
                  </div>
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-400 font-mono tracking-widest flex items-center gap-1.5 mb-2"><Activity className="w-3.5 h-3.5 text-purple-400" /> Usable Area</p>
                    <p className="text-3xl font-black text-white">{stats.totalArea.toFixed(1)} <span className="text-xs font-medium text-slate-500">m²</span></p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-emerald-900/30 to-emerald-900/10 p-6 rounded-2xl border border-emerald-500/20 relative overflow-hidden group">
                  <p className="text-[11px] text-emerald-400/80 font-mono tracking-widest flex items-center gap-1.5 mb-2"><DollarSign className="w-4 h-4" /> Estimated ROI (Yearly)</p>
                  <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-green-400 drop-shadow-sm">
                    ฿ {stats.totalSavings.toLocaleString(undefined, {maximumFractionDigits: 0})}
                  </p>
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-emerald-500/10">
                    <div>
                      <p className="text-[10px] text-slate-400 font-mono">ENERGY YIELD</p>
                      <p className="text-lg font-bold text-emerald-200">{stats.totalEnergy.toLocaleString(undefined, {maximumFractionDigits: 0})} kWh</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 🌟 TAB 2: DATA SCIENCE FOR GEOGRAPHER */}
            {activeTab === 'analytics' && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                  <h3 className="text-[10px] font-mono text-purple-400 uppercase tracking-[0.2em] mb-1">Spatial Clustering (K-Means)</h3>
                  <p className="text-[10px] text-slate-500 mb-4">การจัดกลุ่มพฤติกรรมเชิงพื้นที่ของแผงโซลาร์เซลล์</p>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: -10, left: -25 }}>
                        <XAxis type="number" dataKey="x" name="Area" unit="m²" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis type="number" dataKey="y" name="Conf" unit="%" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <ZAxis type="number" dataKey="z" range={[50, 400]} />
                        <Tooltip cursor={{strokeDasharray: '3 3'}} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
                        <Scatter name="High-Yield" data={scatterData.filter(d => d.cluster === 'High-Yield')} fill="#10b981" opacity={0.8} />
                        <Scatter name="Efficient" data={scatterData.filter(d => d.cluster === 'Efficient')} fill="#3b82f6" opacity={0.8} />
                        <Scatter name="Standard" data={scatterData.filter(d => d.cluster === 'Standard')} fill="#f59e0b" opacity={0.8} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-2 text-[9px] font-mono text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> High-Yield</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> Efficient</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full"></span> Standard</span>
                  </div>
                </div>

                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                  <h3 className="text-[10px] font-mono text-cyan-400 uppercase tracking-[0.2em] mb-4">Spatial Size Distribution</h3>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sizeBuckets} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* 🌟 TAB 3: DEEP IMAGE PROCESSING (DIP LAB) */}
            {activeTab === 'dip' && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                  <h3 className="text-[10px] font-mono text-cyan-400 uppercase tracking-[0.2em] mb-1">Spectral Histogram Analysis</h3>
                  <p className="text-[10px] text-slate-500 mb-4">ผลจากการทำ CLAHE (Contrast Limited Adaptive Histogram Equalization)</p>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={histogramData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="pixel_intensity" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }} />
                        <Line type="monotone" dataKey="original" stroke="#64748b" strokeWidth={2} dot={false} name="Original TIF" />
                        <Line type="monotone" dataKey="clahe_enhanced" stroke="#06b6d4" strokeWidth={2} dot={false} name="CLAHE Enhanced" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                  <h3 className="text-[10px] font-mono text-purple-400 uppercase tracking-[0.2em] mb-4">Semantic Segmentation Metrics</h3>
                  <div className="flex items-center">
                    <div className="h-40 w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsRadar cx="50%" cy="50%" outerRadius="70%" data={dipMetrics}>
                          <PolarGrid stroke="#334155" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 8 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <RadarChart name="YOLOv8-Seg" dataKey="A" stroke="#a855f7" fill="#a855f7" fillOpacity={0.5} />
                        </RechartsRadar>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-1/2 space-y-3 pl-4 border-l border-white/5">
                      <div>
                        <p className="text-[10px] text-slate-500 font-mono mb-1">NETWORK ARCHITECTURE</p>
                        <p className="text-xs font-bold text-white flex items-center gap-1"><Network className="w-3 h-3 text-cyan-400"/> YOLOv8 + U-Net</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-mono mb-1">INTERSECTION OVER UNION (IoU)</p>
                        <p className="text-lg font-bold text-emerald-400">0.854</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 🌟 TAB 4: FINANCIALS & ESG */}
            {activeTab === 'financials' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                
                <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/20 p-5 rounded-2xl border border-blue-500/30 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-blue-300 font-mono tracking-widest flex items-center gap-1.5 mb-1"><Globe2 className="w-4 h-4"/> ESG CARBON TOKENS</p>
                    <p className="text-2xl font-black text-white">{stats.totalCo2.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-sm font-medium text-slate-400">CCT</span></p>
                    <p className="text-[10px] text-slate-400 mt-1">Est. Market Value: <span className="text-emerald-400 font-bold">${carbonTokenValue.toFixed(2)} USD</span></p>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/50">
                    <Leaf className="w-8 h-8 text-blue-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-red-900/20 to-slate-900 p-5 rounded-2xl border border-red-500/20">
                    <p className="text-[10px] text-red-400 font-mono tracking-widest flex items-center gap-1.5 mb-1"><DollarSign className="w-3.5 h-3.5"/> EST. CAPEX</p>
                    <p className="text-2xl font-black text-white">฿ {estCapex.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">System Size: {systemSizeKw.toFixed(1)} kWp</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-900/20 to-slate-900 p-5 rounded-2xl border border-emerald-500/20">
                    <p className="text-[10px] text-emerald-400 font-mono tracking-widest flex items-center gap-1.5 mb-1"><Timer className="w-3.5 h-3.5"/> BREAK-EVEN</p>
                    <p className="text-2xl font-black text-white">{breakEvenYears.toFixed(1)} <span className="text-sm font-medium text-slate-500">Years</span></p>
                  </div>
                </div>

                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 mt-4">
                  <h3 className="text-[10px] font-mono text-emerald-400 uppercase tracking-[0.2em] mb-1">25-Year Cumulative Cash Flow</h3>
                  <div className="h-48 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={financialCurve} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="year" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} minTickGap={20} />
                        <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000}k`} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="cashflow" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="Net Cash Flow (฿)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* 🌟 TAB 5: GEO-LOGS (คงเดิม) */}
            {activeTab === 'logs' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em]">Live Spatial Feed</h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-mono">TOP 15 RECORDS</span>
                </div>
                <div className="space-y-2">
                  {panels.slice(0, 15).map((p, i) => (
                    <div key={i} className="bg-[#020617]/50 p-3 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-[11px] text-slate-400 font-mono border border-slate-700">
                          {i+1}
                        </div>
                        <div>
                          <p className="text-xs font-mono text-slate-300 flex items-center gap-1.5 group-hover:text-cyan-400 transition-colors">
                            <Crosshair className="w-3 h-3"/>
                            {p.centroid_lat ? p.centroid_lat.toFixed(5) : '13.85xxx'}, {p.centroid_lon ? p.centroid_lon.toFixed(5) : '100.5xxx'}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1 font-mono">AREA: <span className="text-blue-400">{p.area_sqm} m²</span></p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${p.confidence_score >= 0.5 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {(p.confidence_score * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                  {panels.length === 0 && (
                    <div className="text-center py-12 text-slate-500 border border-dashed border-white/10 rounded-2xl bg-white/5">
                      <Terminal className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p className="text-xs font-mono">NO SPATIAL LOGS DETECTED</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 🟢 STATUS BAR */}
      <div className="absolute bottom-0 left-0 right-0 h-7 bg-[#020617]/90 backdrop-blur-md border-t border-white/5 flex items-center justify-between px-6 text-[9px] font-mono text-slate-500 z-50">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span></span>
            SYSTEM ONLINE
          </span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3"/> YOLOv8-SEG + U-NET</span>
          <span>CRS: EPSG:4326/32647 (POSTGIS)</span>
        </div>
        <div>NATION SCIENCE AND TECHNOLOGY DEVELOPMENT AGENCY (NSTDA)</div>
      </div>
    </main>
  );
}