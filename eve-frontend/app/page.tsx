"use client";

import { useState } from 'react';

const API_BASE_URL = "http://localhost:8080";

// --- INTERFACE ---
interface Ship {
  id: number; name: string; group_name: string;
  cpu?: number; powergrid?: number; calibration?: number;
  high_slots?: number; mid_slots?: number; low_slots?: number; rig_slots?: number;
  turret_slots?: number; launcher_slots?: number;
  cap_capacity?: number; cap_recharge?: number;
  hull_hp?: number; cargo_capacity?: number; mass?: number;
  hull_em_res?: number; hull_therm_res?: number; hull_kin_res?: number; hull_expl_res?: number;
  armor_hp?: number; armor_em_res?: number; armor_therm_res?: number; armor_kin_res?: number; armor_expl_res?: number;
  shield_hp?: number; shield_em_res?: number; shield_therm_res?: number; shield_kin_res?: number; shield_expl_res?: number;
}

// --- SVG MATH MAGIE ---
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return { x: centerX + (radius * Math.cos(angleInRadians)), y: centerY + (radius * Math.sin(angleInRadians)) };
};

const describeArc = (x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => {
  const startOuter = polarToCartesian(x, y, outerRadius, endAngle);
  const endOuter = polarToCartesian(x, y, outerRadius, startAngle);
  const startInner = polarToCartesian(x, y, innerRadius, endAngle);
  const endInner = polarToCartesian(x, y, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", startOuter.x, startOuter.y,
    "A", outerRadius, outerRadius, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
    "L", endInner.x, endInner.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
    "Z"
  ].join(" ");
};

// --- EINKLAPPBARES PANEL (COLLAPSIBLE) ---
const CollapsiblePanel = ({ title, children, defaultOpen = true }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-gray-800/80 rounded border border-gray-700 shadow-lg overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex justify-between items-center p-3 bg-gray-800 hover:bg-gray-700 transition-colors focus:outline-none border-b border-gray-700"
      >
        <h3 className="text-sm font-bold text-gray-200">{title}</h3>
        <span className={`text-gray-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
          ▼
        </span>
      </button>
      
      {/* Inhalt: Wird ausgeblendet, wenn nicht offen */}
      {isOpen && (
        <div className="p-3 flex flex-col gap-2 bg-gray-900/40">
          {children}
        </div>
      )}
    </div>
  );
};


// --- SVG KOMPONENTEN FÜR FESTE 8 SLOTS ---
const SvgSlotGroup = ({ activeCount, centerAngle, innerRadius, outerRadius, activeFill, activeStroke, iconType }: any) => {
  const MAX_SLOTS = 8;
  const FIXED_SWEEP = 8;
  const GAP = 2;
  
  const totalSweep = MAX_SLOTS * FIXED_SWEEP + (MAX_SLOTS - 1) * GAP;
  const startAngle = centerAngle - (totalSweep / 2);
  const iconRadius = (innerRadius + outerRadius) / 2;

  return (
    <g className="pointer-events-auto cursor-pointer">
      {Array.from({ length: MAX_SLOTS }).map((_, i) => {
        const isActive = i < (activeCount || 0);
        
        const sAngle = startAngle + i * (FIXED_SWEEP + GAP);
        const eAngle = sAngle + FIXED_SWEEP;
        const pathData = describeArc(300, 300, innerRadius, outerRadius, sAngle, eAngle);
        
        const centerSlotAngle = sAngle + (FIXED_SWEEP / 2);
        const iconPos = polarToCartesian(300, 300, iconRadius, centerSlotAngle);

        let Icon = null;
        if (isActive && iconType === 'high') {
          Icon = <path d="M 0 -4 L 0 -1 M -3 3 L -1 1 M 3 3 L 1 1" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />;
        } else if (isActive && iconType === 'mid') {
          Icon = <path d="M -3 -1.5 L 3 -1.5 M -3 1.5 L 3 1.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />;
        } else if (isActive && iconType === 'low') {
          Icon = <path d="M -3 0 L 3 0" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />;
        } else if (isActive && iconType === 'rig') {
          Icon = <rect x="-4" y="-4" width="8" height="8" rx="2" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" />;
        }

        return (
          <g key={i} className="group">
            <path 
              d={pathData} 
              className={isActive 
                ? `${activeFill} ${activeStroke} opacity-90 hover:brightness-125 transition-all` 
                : `fill-transparent stroke-gray-700 opacity-30`
              } 
              strokeWidth="1.5" 
            />
            {Icon && (
              <g transform={`translate(${iconPos.x}, ${iconPos.y}) rotate(${centerSlotAngle}) scale(1.3)`}>
                {Icon}
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};

const SvgHardpointGroup = ({ activeCount, centerAngle, radius, activeFill, activeStroke }: any) => {
  const MAX_SLOTS = 8;
  const FIXED_SWEEP = 4;
  const totalSweep = (MAX_SLOTS - 1) * FIXED_SWEEP;
  const startAngle = centerAngle - (totalSweep / 2);

  return (
    <g>
      {Array.from({ length: MAX_SLOTS }).map((_, i) => {
        const isActive = i < (activeCount || 0);
        const pos = polarToCartesian(300, 300, radius, startAngle + i * FIXED_SWEEP);
        return (
          <circle 
            key={i} cx={pos.x} cy={pos.y} r="3.5" 
            className={isActive ? `${activeFill} ${activeStroke} opacity-90` : `fill-transparent stroke-gray-700 opacity-30`} 
            strokeWidth="1.5" 
          />
        );
      })}
    </g>
  );
};

const StatArc = ({ startAngle, endAngle, radius, strokeClass, text, textColorClass }: any) => {
  const start = polarToCartesian(300, 300, radius, startAngle);
  const end = polarToCartesian(300, 300, radius, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? "0" : "1";
  const dLine = ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y].join(" ");
  const midAngle = (startAngle + endAngle) / 2;
  const isBottom = midAngle > 90 && midAngle < 270;
  let dText = "", textId = `path-${startAngle}-${endAngle}`.replace(/\./g, '');

  if (isBottom) {
    const tStart = polarToCartesian(300, 300, radius, endAngle);
    const tEnd = polarToCartesian(300, 300, radius, startAngle);
    dText = ["M", tStart.x, tStart.y, "A", radius, radius, 0, largeArcFlag, 0, tEnd.x, tEnd.y].join(" ");
  } else {
    const tStart = polarToCartesian(300, 300, radius, startAngle);
    const tEnd = polarToCartesian(300, 300, radius, endAngle);
    dText = ["M", tStart.x, tStart.y, "A", radius, radius, 0, largeArcFlag, 1, tEnd.x, tEnd.y].join(" ");
  }

  return (
    <g>
      <path d={dLine} className={strokeClass} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.9" />
      <path id={textId} d={dText} fill="none" stroke="none" />
      <text className={`text-[12px] font-bold tracking-widest uppercase ${textColorClass} drop-shadow-[0_2px_2px_rgba(0,0,0,1)]`} dy={isBottom ? "16" : "-8"}>
        <textPath href={`#${textId}`} startOffset="50%" textAnchor="middle">{text}</textPath>
      </text>
    </g>
  );
};

// --- BAUSTEINE FÜR DAS RECHTE PANEL ---
const StatRow = ({ label, value, unit = "" }: { label: string, value: any, unit?: string }) => (
  <div className="flex justify-between items-center py-1.5 border-b border-gray-800/50 hover:bg-gray-800/80 px-1 rounded transition-colors">
    <span className="text-gray-400 text-sm">{label}</span>
    <span className="text-white font-mono text-sm">{value ?? "0"} <span className="text-gray-500 text-xs">{unit}</span></span>
  </div>
);

const ResCell = ({ value, color }: { value: number, color: string }) => {
  const safeValue = value || 0;
  return (
    <div className="relative w-10 h-6 md:w-12 md:h-7 bg-gray-800 border border-gray-600 overflow-hidden flex items-center justify-center group rounded-sm">
      <div className={`absolute left-0 top-0 h-full ${color} opacity-80 group-hover:opacity-100 transition-opacity`} style={{ width: `${safeValue}%` }}></div>
      <span className="relative z-10 text-[10px] md:text-xs font-mono text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">{safeValue.toFixed(0)}%</span>
    </div>
  );
};


export default function Home() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedShip, setSelectedShip] = useState<Ship | null>(null);

  const fetchShips = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchInput.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ships?search=${encodeURIComponent(searchInput)}`);
      setShips(await res.json());
    } finally { setLoading(false); }
  };

  const handleShipClick = async (clickedShip: Ship) => {
    try {
      const res = await fetch(`${API_BASE_URL}/ships/${clickedShip.id}/attributes`);
      const attributes = await res.json();
      setSelectedShip({ ...clickedShip, ...attributes });
    } catch (err: any) { alert("Fehler: " + err.message); }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-900 text-gray-100 font-sans selection:bg-blue-500/30">
      <div className="max-w-[1400px] mx-auto">

        {selectedShip ? (
          <div className="animate-fade-in">
            <button onClick={() => setSelectedShip(null)} className="mb-4 text-blue-400 hover:text-blue-300 flex items-center gap-2 font-semibold text-sm uppercase tracking-widest z-50 relative">
              ← Suche
            </button>

            <div className="flex flex-col xl:flex-row gap-8 items-center xl:items-start justify-center">
              
              {/* === LINKE SEITE: DAS RIESIGE EVE FITTING WHEEL === */}
              <div className="relative w-[360px] h-[360px] md:w-[600px] md:h-[600px] flex-shrink-0 bg-gray-900 rounded-full shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-gray-800">
                
                <div className="absolute inset-0 m-auto w-32 h-32 md:w-48 md:h-48 bg-gray-800/80 rounded-full border border-gray-600 flex flex-col items-center justify-center shadow-lg z-10">
                  <h2 className="text-lg md:text-2xl font-bold text-white text-center leading-tight px-2 drop-shadow-md">{selectedShip.name}</h2>
                  <p className="text-[10px] md:text-xs text-blue-400 mt-1 uppercase tracking-widest">{selectedShip.group_name}</p>
                </div>

                <svg viewBox="0 0 600 600" className="absolute inset-0 w-full h-full pointer-events-none">
                  <line x1="300" y1="50" x2="300" y2="550" stroke="#374151" strokeWidth="1" opacity="0.3" />
                  <line x1="50" y1="300" x2="550" y2="300" stroke="#374151" strokeWidth="1" opacity="0.3" />
                  <circle cx="300" cy="300" r="150" stroke="#374151" strokeWidth="1" fill="none" opacity="0.2" />

                  {/* === DIE 4 HAUPT-QUADRANTEN === */}
                  {/* HIGH: Oben zentriert (0 Grad) */}
                  <SvgSlotGroup activeCount={selectedShip.high_slots} centerAngle={0} innerRadius={215} outerRadius={265} activeFill="fill-gray-800" activeStroke="stroke-gray-400" iconType="high" />
                  
                  {/* MID: Rechts zentriert (90 Grad) */}
                  <SvgSlotGroup activeCount={selectedShip.mid_slots} centerAngle={90} innerRadius={215} outerRadius={265} activeFill="fill-gray-800" activeStroke="stroke-blue-500/80" iconType="mid" />
                  
                  {/* LOW: Unten zentriert (180 Grad) */}
                  <SvgSlotGroup activeCount={selectedShip.low_slots} centerAngle={180} innerRadius={215} outerRadius={265} activeFill="fill-gray-800" activeStroke="stroke-green-500/80" iconType="low" />
                  
                  {/* RIGS: NEU POSITIONIERT -> Links oben (-60 Grad bzw. 300 Grad) */}
                  <SvgSlotGroup activeCount={selectedShip.rig_slots} centerAngle={-60} innerRadius={215} outerRadius={265} activeFill="fill-gray-800" activeStroke="stroke-yellow-600/80" iconType="rig" />

                  {/* === HARDPOINTS === */}
                  <SvgHardpointGroup activeCount={selectedShip.turret_slots} centerAngle={-23} radius={200} activeFill="fill-red-900" activeStroke="stroke-red-500" />
                  <SvgHardpointGroup activeCount={selectedShip.launcher_slots} centerAngle={23} radius={200} activeFill="fill-orange-900" strokeClass="stroke-orange-500" />

                  {/* === GEBOGENER TEXT & BALKEN === */}
                  <StatArc startAngle={35} endAngle={70} radius={280} strokeClass="stroke-blue-500" textColorClass="fill-blue-400" text={`CPU ${selectedShip.cpu} tf`} />
                  <StatArc startAngle={110} endAngle={145} radius={280} strokeClass="stroke-red-600" textColorClass="fill-red-400" text={`POWERGRID ${selectedShip.powergrid} MW`} />
                </svg>
              </div>

              {/* === RECHTE SEITE: EINKLAPPBARE STATS PANELS === */}
              <div className="w-full xl:w-1/3 flex flex-col gap-3 overflow-y-auto max-h-[85vh] custom-scrollbar pr-2 mt-8 xl:mt-0">
                
                {/* Panel 1: Capacitor */}
                <CollapsiblePanel title="Energiespeicher (Capacitor)" defaultOpen={true}>
                  <StatRow label="Kapazität" value={selectedShip.cap_capacity?.toLocaleString()} unit="GJ" />
                  <StatRow label="Aufladezeit" value={selectedShip.cap_recharge ? (selectedShip.cap_recharge / 1000).toFixed(1) : "0"} unit="s" />
                </CollapsiblePanel>

              {/* Panel 2: Verteidigung */}
                <CollapsiblePanel title="Verteidigung (Tank)" defaultOpen={true}>
                  <div className="flex justify-between items-center mb-1 pr-1">
                    <div className="w-16"></div> 
                    <div className="w-16 text-right text-gray-400 text-xs font-bold pr-2">HP</div>
                    <div className="flex gap-1">
                      <div className="w-10 md:w-12 text-center text-blue-400 text-[10px] md:text-xs font-bold">EM</div>
                      <div className="w-10 md:w-12 text-center text-red-400 text-[10px] md:text-xs font-bold">THR</div>
                      <div className="w-10 md:w-12 text-center text-gray-300 text-[10px] md:text-xs font-bold">KIN</div>
                      <div className="w-10 md:w-12 text-center text-orange-400 text-[10px] md:text-xs font-bold">EXP</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between hover:bg-gray-700/50 p-1 rounded transition-colors">
                    <span className="text-blue-300 text-xs font-bold uppercase w-16 truncate pl-1">Schild</span>
                    <span className="text-white font-mono text-sm w-16 text-right pr-2">{selectedShip.shield_hp?.toLocaleString() || "0"}</span>
                    <div className="flex gap-1">
                      <ResCell value={selectedShip.shield_em_res || 0} color="bg-blue-600" />
                      <ResCell value={selectedShip.shield_therm_res || 0} color="bg-red-600" />
                      <ResCell value={selectedShip.shield_kin_res || 0} color="bg-gray-500" />
                      <ResCell value={selectedShip.shield_expl_res || 0} color="bg-orange-500" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between hover:bg-gray-700/50 p-1 rounded transition-colors">
                    <span className="text-gray-300 text-xs font-bold uppercase w-16 truncate pl-1">Armor</span>
                    <span className="text-white font-mono text-sm w-16 text-right pr-2">{selectedShip.armor_hp?.toLocaleString() || "0"}</span>
                    <div className="flex gap-1">
                      <ResCell value={selectedShip.armor_em_res || 0} color="bg-blue-600" />
                      <ResCell value={selectedShip.armor_therm_res || 0} color="bg-red-600" />
                      <ResCell value={selectedShip.armor_kin_res || 0} color="bg-gray-500" />
                      <ResCell value={selectedShip.armor_expl_res || 0} color="bg-orange-500" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between hover:bg-gray-700/50 p-1 rounded transition-colors">
                    <span className="text-orange-300 text-xs font-bold uppercase w-16 truncate pl-1">Hull</span>
                    <span className="text-white font-mono text-sm w-16 text-right pr-2">{selectedShip.hull_hp?.toLocaleString() || "0"}</span>
                    <div className="flex gap-1">
                      <ResCell value={selectedShip.hull_em_res || 0} color="bg-blue-600" />
                      <ResCell value={selectedShip.hull_therm_res || 0} color="bg-red-600" />
                      <ResCell value={selectedShip.hull_kin_res || 0} color="bg-gray-500" />
                      <ResCell value={selectedShip.hull_expl_res || 0} color="bg-orange-500" />
                    </div>
                  </div>
                </CollapsiblePanel>
          
                {/* Panel 3: Chassis */}
                <CollapsiblePanel title="Chassis" defaultOpen={true}>
                  <StatRow label="Ladraum" value={selectedShip.cargo_capacity?.toLocaleString()} unit="m³" />
                  <StatRow label="Masse" value={selectedShip.mass?.toLocaleString()} unit="kg" />
                  <StatRow label="Rig Calibration" value={selectedShip.calibration} />
                </CollapsiblePanel>

              </div>
            </div>
          </div>
        ) : (
          /* SUCHE ANSICHT */
          <div className="max-w-3xl mx-auto mt-20">
            <h1 className="text-5xl font-black mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-gray-400 tracking-tighter text-center">
              EVE <span className="text-gray-200">PYFA</span> WEB
            </h1>
            <form onSubmit={fetchShips} className="mb-10 flex gap-2">
              <input type="text" placeholder="Schiffsnamen eingeben (z.B. Drake)..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="flex-grow p-4 rounded bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-lg text-center tracking-wide" />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded font-bold text-white tracking-widest uppercase shadow-lg">Suchen</button>
            </form>
            {loading && <p className="text-blue-400 animate-pulse text-center tracking-widest uppercase text-sm font-bold">Initialisiere Datenbank-Uplink...</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ships.map(ship => (
                <div key={ship.id} onClick={() => handleShipClick(ship)} className="bg-gray-800 border border-gray-700 p-4 rounded hover:border-blue-500 cursor-pointer group flex justify-between items-center shadow-md">
                  <span className="text-lg font-bold text-gray-200 group-hover:text-blue-400">{ship.name}</span>
                  <span className="text-gray-500 text-xs uppercase tracking-widest">{ship.group_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}