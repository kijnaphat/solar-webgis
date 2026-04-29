'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Map, Cpu, ShieldCheck, Globe2, ArrowRight, Zap, Leaf, 
  Satellite, Database, Layers, BarChart3, CheckCircle2,
  ScanSearch, BrainCircuit, LineChart, Building2, Landmark, SunMedium
} from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#020617] text-slate-50 font-sans selection:bg-cyan-500/30 overflow-x-hidden relative">
      
      {/* 🌌 Background Effect */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-[#020617] to-[#020617]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* 🧭 Navbar */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <span className="font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            GeoAI Vision
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          <Link href="#how-it-works" className="hover:text-cyan-400 transition-colors">How it works</Link>
          <Link href="#architecture" className="hover:text-cyan-400 transition-colors">Architecture</Link>
          <Link href="#esg" className="hover:text-cyan-400 transition-colors">ESG Impact</Link>
        </div>

        <Link href="/dashboard">
          <button className="px-6 py-2.5 bg-white text-slate-900 text-xs font-bold uppercase tracking-wider rounded-full hover:bg-cyan-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]">
            Launch Platform
          </button>
        </Link>
      </nav>

      {/* 🚀 Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-8 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest">
            NSTDA Lab • YOLOv8 Segmentation Engine Active
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-[80px] font-black tracking-tighter leading-[1.1] mb-6 max-w-5xl">
          Optimize your perfect <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]">
            solar energy vision.
          </span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl leading-relaxed mb-10">
          Thailand's leading GeoAI platform for rooftop solar potential. 
          Real-time satellite mapping, Deep Image Processing (DIP), and financial ROI modeling — integrated into one seamless dashboard.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <Link href="/dashboard">
            <button className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl font-bold text-lg flex items-center gap-3 transition-all group shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <Map className="w-5 h-5" />
              Explore Interactive Map
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          <Link href="#how-it-works">
            <button className="text-slate-300 font-bold text-sm border-b-2 border-slate-700 pb-1 hover:text-cyan-400 hover:border-cyan-400 transition-colors flex items-center gap-2">
              <ScanSearch className="w-4 h-4" /> See How It Works
            </button>
          </Link>
        </div>
      </section>

      {/* 📊 Metrics Section */}
      <section className="relative z-10 w-full border-y border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10 border-x border-white/10">
          <div className="py-10 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors">
            <span className="text-4xl md:text-5xl font-black text-white mb-2">1,248</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1"><Map className="w-3 h-3"/> Detections</span>
          </div>
          <div className="py-10 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors">
            <span className="text-4xl md:text-5xl font-black text-white mb-2">85.2<span className="text-cyan-500">k</span></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Usable Area (m²)</span>
          </div>
          <div className="py-10 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors">
            <span className="text-4xl md:text-5xl font-black text-white mb-2">4.2<span className="text-emerald-500">M</span></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1">Est. Savings (THB)</span>
          </div>
          <div className="py-10 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors bg-cyan-500/5">
            <span className="text-4xl md:text-5xl font-black text-cyan-400 mb-2 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">A+</span>
            <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.2em] flex items-center gap-1"><Globe2 className="w-3 h-3"/> Site Grade</span>
          </div>
        </div>
      </section>

      {/* 🔍 NEW: How It Works (Detailed Visual Workflow) */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 py-32 border-b border-white/10">
        <div className="text-center mb-24">
          <h2 className="text-3xl md:text-5xl font-black mb-6">How the Engine Works</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">A seamless pipeline translating raw pixels from space into actionable financial data on the ground.</p>
        </div>

        <div className="space-y-32">
          {/* Step 1 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
              {/* Visual Mockup: Satellite Map Scan */}
              <div className="relative h-80 bg-[#0f172a] rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-luminosity"></div>
                {/* Scanner Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_20px_#22d3ee] animate-[bounce_4s_infinite]"></div>
                {/* Target UI */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 border-2 border-dashed border-cyan-400/50 rounded-full animate-[spin_10s_linear_infinite]"></div>
                  <ScanSearch className="absolute w-12 h-12 text-cyan-400" />
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="text-cyan-400 font-mono text-sm font-bold tracking-widest mb-2">STEP 01</div>
              <h3 className="text-3xl font-black mb-4">Satellite Image Acquisition</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                We pull high-resolution multispectral imagery (TIFF/PNG) over targeted areas. The images undergo <strong>Digital Image Processing (DIP)</strong> using CLAHE and Histogram Equalization to remove cloud shadows, balance exposure, and enhance edge clarity for the AI.
              </p>
              <ul className="space-y-2 text-sm text-slate-300 font-mono">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-500"/> Multi-band Layer Stacking</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-500"/> Spatial Resolution Optimization</li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-purple-400 font-mono text-sm font-bold tracking-widest mb-2">STEP 02</div>
              <h3 className="text-3xl font-black mb-4">AI Deep Segmentation</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Our custom-trained <strong>YOLOv8 + U-Net</strong> architecture scans the enhanced imagery. Instead of simple bounding boxes, it draws pixel-perfect polygons around valid solar arrays, calculating confidence scores and rejecting false positives like skylights or HVAC units.
              </p>
              <ul className="space-y-2 text-sm text-slate-300 font-mono">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500"/> Semantic Instance Segmentation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500"/> 94% mAP@0.5 Accuracy</li>
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full"></div>
              {/* Visual Mockup: AI Code & Polygon */}
              <div className="relative h-80 bg-[#0f172a] rounded-3xl border border-white/10 p-6 shadow-2xl flex flex-col font-mono text-xs">
                <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="text-purple-400 mb-2">&gt; loading weights yolov8_geo.pt...</div>
                <div className="text-slate-400 mb-2">&gt; analyzing tile 13.85_100.5.tif...</div>
                <div className="text-emerald-400 mb-6">&gt; 3 arrays detected. Extracting geometries...</div>
                
                {/* Fake Polygon Visualization */}
                <div className="flex-1 border border-white/5 rounded-xl bg-[#020617] relative flex items-center justify-center overflow-hidden">
                   <svg className="w-32 h-32 text-purple-500 opacity-80" viewBox="0 0 100 100" fill="currentColor">
                      <polygon points="10,20 80,10 90,70 20,80" stroke="#a855f7" strokeWidth="2" fill="rgba(168,85,247,0.3)" strokeDasharray="4" className="animate-[pulse_2s_infinite]" />
                   </svg>
                   <div className="absolute bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-[8px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 backdrop-blur">CONF: 0.96</div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full"></div>
              {/* Visual Mockup: Dashboard Charts */}
              <div className="relative h-80 bg-[#0f172a] rounded-3xl border border-white/10 p-6 shadow-2xl flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm font-bold text-slate-300">Financial Projection</div>
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1"><span>CAPEX</span><span>฿ 1.2M</span></div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full"><div className="w-[30%] h-full bg-slate-500 rounded-full"></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1"><span>Est. ROI (Year 5)</span><span>฿ 3.8M</span></div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full"><div className="w-[80%] h-full bg-emerald-500 rounded-full"></div></div>
                  </div>
                </div>
                {/* Fake Area Chart */}
                <div className="flex-1 mt-6 border-b-2 border-l-2 border-white/10 relative">
                  <svg className="absolute bottom-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <path d="M0,100 L0,80 Q25,70 50,40 T100,10 L100,100 Z" fill="url(#grad)" opacity="0.5"/>
                    <path d="M0,80 Q25,70 50,40 T100,10" fill="none" stroke="#10b981" strokeWidth="2"/>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.5"/>
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="text-emerald-400 font-mono text-sm font-bold tracking-widest mb-2">STEP 03</div>
              <h3 className="text-3xl font-black mb-4">Web GIS & Financial Engineering</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Data is piped into a <strong>PostGIS</strong> database and rendered on our interactive Web GIS platform. The system clusters nearby panels, simulates string inverter wiring, and instantly calculates Capex, break-even periods, and carbon token values.
              </p>
              <ul className="space-y-2 text-sm text-slate-300 font-mono">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> K-Means Spatial Clustering</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> EPSG:32647 Coordinate Math</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ⚙️ System Architecture */}
      <section id="architecture" className="relative z-10 max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black mb-4">Robust System Architecture</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">From Python processing to React rendering, built for scale.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 relative">
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent -translate-y-1/2 z-0"></div>

          {[
            { step: "Data", icon: <Satellite className="w-6 h-6 text-cyan-400" />, title: "Image Fetch", desc: "High-res TIFF/PNG." },
            { step: "DIP", icon: <Layers className="w-6 h-6 text-blue-400" />, title: "Enhancement", desc: "CLAHE & Histograms." },
            { step: "AI", icon: <BrainCircuit className="w-6 h-6 text-purple-400" />, title: "YOLOv8", desc: "Instance Segmentation." },
            { step: "GIS", icon: <Database className="w-6 h-6 text-emerald-400" />, title: "PostGIS / React", desc: "Storage & Visualization." }
          ].map((item, idx) => (
            <div key={idx} className="bg-[#0f172a] border border-white/10 p-6 rounded-3xl relative z-10 hover:-translate-y-2 transition-transform duration-300 shadow-xl text-center">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                {item.icon}
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 🎯 NEW: Target Audience / Use Cases */}
      <section className="relative z-10 bg-white/5 border-y border-white/10 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Who is GeoAI Vision For?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Empowering decision-makers across sectors.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#020617]/50 border border-white/10 p-8 rounded-3xl hover:border-cyan-500/50 transition-colors group backdrop-blur-sm">
              <Landmark className="w-10 h-10 text-cyan-400 mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Government & Policy</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Map national solar capacity, plan grid upgrades, and track progress towards national Net Zero and clean energy mandates efficiently without manual surveys.</p>
            </div>
            <div className="bg-[#020617]/50 border border-white/10 p-8 rounded-3xl hover:border-purple-500/50 transition-colors group backdrop-blur-sm">
              <Building2 className="w-10 h-10 text-purple-400 mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">Energy Investors</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Quickly scan industrial estates to identify the most profitable rooftops. Evaluate CAPEX, predict energy yield, and categorize investments into phases.</p>
            </div>
            <div className="bg-[#020617]/50 border border-white/10 p-8 rounded-3xl hover:border-emerald-500/50 transition-colors group backdrop-blur-sm">
              <SunMedium className="w-10 h-10 text-emerald-400 mb-6" />
              <h3 className="text-xl font-bold mb-3 text-white">EPC Contractors</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Export high-precision GeoJSON boundaries directly into AutoCAD. Use Moran's I spatial clustering to plan string inverter wiring layouts instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 🌍 ESG Impact Section */}
      <section id="esg" className="relative z-10 max-w-7xl mx-auto px-6 py-32">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
              Driving Sustainable <br/>
              <span className="text-emerald-400">ESG Goals</span>
            </h2>
            <p className="text-slate-400 mb-8 leading-relaxed text-lg">
              Beyond engineering, GeoAI Vision transforms physical detection data into quantifiable environmental impact. Track your carbon footprint reduction and tokenize energy yields.
            </p>
            <ul className="space-y-4">
              {[
                "Calculate equivalent trees planted per array",
                "Estimate total CO2 offset (kg) annually",
                "Generate tradable Carbon Credit Tokens (CCT)",
                "Align with national Net Zero strategies"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full"></div>
            <div className="relative bg-[#0f172a] border border-white/10 p-8 rounded-3xl shadow-2xl">
              <div className="flex justify-between items-center mb-6 pb-6 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-sm tracking-widest text-slate-300">CARBON OFFSET</span>
                </div>
                <span className="text-xs font-mono bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">LIVE DATA</span>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                    <span>CO2 Reduction</span>
                    <span className="text-white">85,000 kg</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 w-[85%] rounded-full"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                    <span>Trees Planted Equivalent</span>
                    <span className="text-white">4,000 Units</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 w-[60%] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🎯 Bottom CTA Section */}
      <section className="relative z-10 py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border border-cyan-500/30 p-12 md:p-20 rounded-[3rem] backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/30 blur-[100px] rounded-full"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/30 blur-[100px] rounded-full"></div>
          
          <h2 className="text-3xl md:text-5xl font-black mb-6 relative z-10 text-white">Ready to explore the data?</h2>
          <p className="text-cyan-100/70 mb-10 text-lg relative z-10">Access the Interactive Web GIS dashboard to view live inferences, wiring diagrams, and financial heatmaps.</p>
          
          <Link href="/dashboard" className="relative z-10">
            <button className="px-10 py-5 bg-white text-slate-900 hover:bg-cyan-50 hover:scale-105 rounded-full font-black text-lg transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]">
              Launch Platform Workspace
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs font-mono text-slate-500 bg-[#020617]">
        <p>Nation Science and Technology Development Agency (NSTDA) • EPSG:32647</p>
      </footer>

    </main>
  );
}