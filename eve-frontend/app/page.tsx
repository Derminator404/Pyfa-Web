"use client";

import React, { useState, useEffect, useMemo } from 'react';

const API_BASE_URL = "http://192.168.1.230:8080";

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

// --- DYNAMISCHE ICONS ---
const getModuleIcon = (type: string, name: string) => {
  const n = name.toLowerCase();
  if (type === 'high') {
    if (n.includes('laser') || n.includes('pulse') || n.includes('beam')) return "⚡";
    if (n.includes('missile') || n.includes('launcher') || n.includes('rocket')) return "🚀";
    if (n.includes('projectile') || n.includes('railgun') || n.includes('artillery') || n.includes('cannon')) return "🔫";
    if (n.includes('miner') || n.includes('salvager')) return "⛏️";
    return "🔭"; 
  }
  if (type === 'mid') {
    if (n.includes('afterburner') || n.includes('microwarp')) return "🔥";
    if (n.includes('shield')) return "🛡️";
    if (n.includes('web') || n.includes('disruptor') || n.includes('scram')) return "🕸️";
    if (n.includes('battery') || n.includes('cap')) return "🔋";
    return "📡";
  }
  if (type === 'low') {
    if (n.includes('armor')) return "🧱";
    if (n.includes('damage control')) return "💼";
    if (n.includes('magnetic') || n.includes('heat sink') || n.includes('gyro')) return "🧲";
    if (n.includes('power') || n.includes('reactor')) return "☢️";
    return "⚙️";
  }
  if (type === 'rig') return "🔧";
  return "📦";
};

// --- SVG MATH ---
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

// --- EINKLAPPBARES PANEL ---
const CollapsiblePanel = ({ title, children, defaultOpen = true }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-gray-800/80 rounded border border-gray-700 shadow-lg overflow-hidden transition-all duration-300 mb-3 shrink-0">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 bg-gray-800 hover:bg-gray-700 transition-colors focus:outline-none border-b border-gray-700">
        <h3 className="text-sm font-bold text-gray-200">{title}</h3>
        <span className={`text-gray-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>▼</span>
      </button>
      {isOpen && <div className="p-3 flex flex-col gap-1 bg-gray-900/40">{children}</div>}
    </div>
  );
};

// --- VERSCHACHTELTER ORDNER ---
const RecursiveFolder = ({ name, folderData, isSearching, openFolders, toggleFolder, equipModule, pathKey }: any) => {
  const isOpen = isSearching || openFolders[pathKey];

  const getCount = (fd: any): number => {
    let count = fd._items.length;
    for (const key in fd._subfolders) count += getCount(fd._subfolders[key]);
    return count;
  };
  const totalCount = getCount(folderData);

  if (totalCount === 0) return null;

  return (
    <div className="mb-1 ml-1">
      <button
        onClick={() => toggleFolder(pathKey)}
        className="w-full text-left p-1.5 hover:bg-gray-700 rounded text-[11px] font-bold text-gray-300 flex justify-between items-center transition-colors border-l-2 border-transparent hover:border-blue-500"
      >
        <span className="truncate pr-2">📁 {name}</span>
        <span className="text-gray-500 text-[9px]">{totalCount}</span>
      </button>

      {isOpen && (
        <div className="pl-1 mt-1 flex flex-col gap-1 border-l border-gray-700 ml-2">
          {Object.keys(folderData._subfolders).sort().map(subName => (
            <RecursiveFolder
              key={subName}
              name={subName}
              folderData={folderData._subfolders[subName]}
              isSearching={isSearching}
              openFolders={openFolders}
              toggleFolder={toggleFolder}
              equipModule={equipModule}
              pathKey={`${pathKey}-${subName}`}
            />
          ))}
          {folderData._items.map((module: any) => (
            <div
              key={module.id}
              onClick={() => equipModule(module)}
              className="flex items-center gap-2 p-1.5 bg-gray-900/30 hover:bg-blue-900/40 rounded cursor-pointer group"
            >
              <div className="text-[11px] group-hover:scale-110 transition-transform">
                {getModuleIcon(module.type, module.name)}
              </div>
              <p className="text-[10px] font-semibold text-gray-400 group-hover:text-blue-300 truncate">{module.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- SVG KOMPONENTEN ---
const SvgSlotGroup = ({ activeCount, centerAngle, innerRadius, outerRadius, activeFill, activeStroke, iconType, onSlotClick, fittedModules }: any) => {
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
        const isFitted = isActive && fittedModules && fittedModules[iconType] && fittedModules[iconType][i] !== undefined && fittedModules[iconType][i] !== null;
        
        const sAngle = startAngle + i * (FIXED_SWEEP + GAP);
        const eAngle = sAngle + FIXED_SWEEP;
        const pathData = describeArc(300, 300, innerRadius, outerRadius, sAngle, eAngle);
        const centerSlotAngle = sAngle + (FIXED_SWEEP / 2);
        const iconPos = polarToCartesian(300, 300, iconRadius, centerSlotAngle);

        let Icon = null;
        if (isActive && iconType === 'high') Icon = <path d="M 0 -4 L 0 -1 M -3 3 L -1 1 M 3 3 L 1 1" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />;
        else if (isActive && iconType === 'mid') Icon = <path d="M -3 -1.5 L 3 -1.5 M -3 1.5 L 3 1.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />;
        else if (isActive && iconType === 'low') Icon = <path d="M -3 0 L 3 0" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />;
        else if (isActive && iconType === 'rig') Icon = <rect x="-4" y="-4" width="8" height="8" rx="2" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" />;

        const fillClass = isFitted ? "fill-blue-500/80" : activeFill;
        const strokeColor = isFitted ? "stroke-blue-300" : activeStroke;

        return (
          <g key={i} className="group" onClick={() => { if (isActive && onSlotClick) onSlotClick(iconType, i); }}>
            <path d={pathData} className={isActive ? `${fillClass} ${strokeColor} opacity-90 hover:brightness-125 transition-all` : `fill-transparent stroke-gray-700 opacity-30`} strokeWidth="1.5" />
            {Icon && <g transform={`translate(${iconPos.x}, ${iconPos.y}) rotate(${centerSlotAngle}) scale(1.3)`}>{Icon}</g>}
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
        return <circle key={i} cx={pos.x} cy={pos.y} r="3.5" className={isActive ? `${activeFill} ${activeStroke} opacity-90` : `fill-transparent stroke-gray-700 opacity-30`} strokeWidth="1.5" />;
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

const StatRow = ({ label, value, unit = "", highlight = false }: { label: string, value: any, unit?: string, highlight?: boolean }) => (
  <div className={`flex justify-between items-center py-1 border-b border-gray-800/50 hover:bg-gray-800/80 px-1 rounded transition-colors ${highlight ? 'text-green-400 font-bold' : 'text-gray-400'}`}>
    <span className="text-xs">{label}</span>
    <span className={`font-mono text-xs ${highlight ? 'text-green-400' : 'text-white'}`}>{value ?? "0"} <span className="opacity-50 text-[10px]">{unit}</span></span>
  </div>
);

const ResCell = ({ value, color }: { value: number, color: string }) => {
  const safeValue = value || 0;
  return (
    <div className="relative w-10 h-5 md:w-12 md:h-6 bg-gray-800 border border-gray-600 overflow-hidden flex items-center justify-center group rounded-sm">
      <div className={`absolute left-0 top-0 h-full ${color} opacity-80 group-hover:opacity-100 transition-opacity`} style={{ width: `${safeValue}%` }}></div>
      <span className="relative z-10 text-[9px] md:text-[10px] font-mono text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">{safeValue.toFixed(0)}%</span>
    </div>
  );
};

export default function Home() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [moduleSearch, setModuleSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedShip, setSelectedShip] = useState<Ship | null>(null);

  const [allModules, setAllModules] = useState<any[]>([]);
  const [fittedModules, setFittedModules] = useState<any>({ high: [], mid: [], low: [], rig: [] });
  const [simStats, setSimStats] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<{ type: string, index: number } | null>(null);
  const [viewMode, setViewMode] = useState<"wheel" | "list">("list"); 

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/modules`);
        const data = await res.json();
        setAllModules(data);
      } catch (e) {
        console.error("Fehler beim Laden der Module:", e);
      }
    };
    fetchModules();
  }, []);

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
      setFittedModules({ high: [], mid: [], low: [], rig: [] });
      setSimStats(null);
    } catch (err: any) { alert("Fehler: " + err.message); }
  };

  const handleSlotClick = (type: string, index: number) => {
    setActiveSlot({ type, index });
    setPickerOpen(true);
  };

  const equipModule = (module: any) => {
    if (!selectedShip) return;

    let maxSlots = 0;
    if (module.type === 'high') maxSlots = selectedShip.high_slots || 0;
    if (module.type === 'mid') maxSlots = selectedShip.mid_slots || 0;
    if (module.type === 'low') maxSlots = selectedShip.low_slots || 0;
    if (module.type === 'rig') maxSlots = selectedShip.rig_slots || 0;

    if (maxSlots === 0) {
      alert(`Dieses Schiff hat keine ${module.type.toUpperCase()} Slots!`);
      return;
    }

    const currentTypeFit = [...fittedModules[module.type]];
    
    let emptyIndex = -1;
    for (let i = 0; i < maxSlots; i++) {
      if (currentTypeFit[i] === undefined || currentTypeFit[i] === null) {
        emptyIndex = i;
        break;
      }
    }

    if (emptyIndex !== -1) {
      currentTypeFit[emptyIndex] = module.id;
      const newFit = { ...fittedModules, [module.type]: currentTypeFit };
      setFittedModules(newFit);
      triggerSimulation(newFit);
    } else {
      alert(`Alle ${module.type.toUpperCase()} Slots sind bereits voll!`);
    }
  };

  const unequipModule = (type: string, index: number) => {
    const currentModule = fittedModules[type][index];
    if (currentModule !== undefined && currentModule !== null) {
      const newFit = JSON.parse(JSON.stringify(fittedModules));
      newFit[type][index] = null; 
      setFittedModules(newFit);
      triggerSimulation(newFit);
    }
  };

  const triggerSimulation = async (currentFit: any) => {
    if (!selectedShip) return;
    setIsSimulating(true);
    
    try {
      const requestBody = {
        ship_id: selectedShip.id,
        high_slots: currentFit.high.filter((id: number | null) => id !== null && id !== undefined),
        mid_slots: currentFit.mid.filter((id: number | null) => id !== null && id !== undefined),
        low_slots: currentFit.low.filter((id: number | null) => id !== null && id !== undefined),
        rig_slots: currentFit.rig.filter((id: number | null) => id !== null && id !== undefined),
        charges: []
      };

      const res = await fetch(`${API_BASE_URL}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) throw new Error("Simulation fehlgeschlagen");
      const data = await res.json();
      
      if (data.is_valid) {
        setSimStats(data.stats);
      } else {
        console.error("Fitting Warnung:", data.errors);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const cpuUsed = simStats ? simStats.cpu_used : 0;
  const pgUsed = simStats ? simStats.powergrid_used : 0;
  
  const shieldEm = simStats ? simStats.resists.shield.em : selectedShip?.shield_em_res || 0;
  const shieldTherm = simStats ? simStats.resists.shield.thermal : selectedShip?.shield_therm_res || 0;
  const shieldKin = simStats ? simStats.resists.shield.kinetic : selectedShip?.shield_kin_res || 0;
  const shieldExpl = simStats ? simStats.resists.shield.explosive : selectedShip?.shield_expl_res || 0;

  const armorEm = simStats ? simStats.resists.armor.em : selectedShip?.armor_em_res || 0;
  const armorTherm = simStats ? simStats.resists.armor.thermal : selectedShip?.armor_therm_res || 0;
  const armorKin = simStats ? simStats.resists.armor.kinetic : selectedShip?.armor_kin_res || 0;
  const armorExpl = simStats ? simStats.resists.armor.explosive : selectedShip?.armor_expl_res || 0;

  const hullEm = simStats ? simStats.resists.hull.em : selectedShip?.hull_em_res || 0;
  const hullTherm = simStats ? simStats.resists.hull.thermal : selectedShip?.hull_therm_res || 0;
  const hullKin = simStats ? simStats.resists.hull.kinetic : selectedShip?.hull_kin_res || 0;
  const hullExpl = simStats ? simStats.resists.hull.explosive : selectedShip?.hull_expl_res || 0;

  const renderListCategory = (title: string, type: string, maxSlots?: number) => {
    if (!maxSlots || maxSlots === 0) return null;
    return (
      <div className="flex flex-col min-h-0 flex-shrink">
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-700 pb-1 mb-1 shrink-0">
          {title} <span className="text-gray-600 text-[10px] ml-2">({fittedModules[type].filter((x:any) => x).length}/{maxSlots})</span>
        </h3>
        <div className="flex flex-col flex-1 min-h-0 justify-evenly gap-[2px]">
          {Array.from({ length: maxSlots }).map((_, i) => {
            const moduleId = fittedModules[type][i];
            const mod = moduleId ? allModules.find(m => m.id === moduleId) : null;
            return (
              <div 
                key={i}
                onClick={() => !mod && handleSlotClick(type, i)}
                className={`flex items-center justify-between px-2 py-[2px] rounded border ${mod ? 'bg-gray-800 border-gray-600' : 'bg-gray-900/50 border-gray-800 border-dashed hover:border-blue-500 cursor-pointer'} transition-colors overflow-hidden shrink min-h-[26px]`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                   <div className="w-5 h-5 shrink-0 bg-gray-900 rounded flex items-center justify-center text-[10px] shadow-inner border border-gray-700">
                     {mod ? getModuleIcon(mod.type, mod.name) : '+'}
                   </div>
                   <span className={`text-[11px] truncate ${mod ? 'text-gray-200 font-bold' : 'text-gray-600 italic'}`}>
                     {mod ? mod.name : `Leerer Slot`}
                   </span>
                </div>
                {mod && (
                  <button onClick={(e) => { e.stopPropagation(); unequipModule(type, i); }} className="text-red-500 hover:text-red-400 px-2 py-0.5 hover:bg-red-500/20 rounded transition-colors shrink-0 text-xs" title="Modul ausbauen">✖</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const groupedModules = useMemo(() => {
    const isSearching = moduleSearch.trim().length > 0;
    const filtered = isSearching 
      ? allModules.filter(m => m.name.toLowerCase().includes(moduleSearch.toLowerCase()) || m.group.toLowerCase().includes(moduleSearch.toLowerCase()))
      : allModules;

    const grouped: any = { 
      high: { _subfolders: {}, _items: [] }, 
      mid: { _subfolders: {}, _items: [] }, 
      low: { _subfolders: {}, _items: [] }, 
      rig: { _subfolders: {}, _items: [] } 
    };

    filtered.forEach(mod => {
      if (!mod.group) mod.group = "Unsortiert";
      const pathParts = mod.group.split(' > ');
      
      let currentFolder = grouped[mod.type];
      if (!currentFolder) return; 

      pathParts.forEach((part: string) => {
        if (!currentFolder._subfolders[part]) {
          currentFolder._subfolders[part] = { _subfolders: {}, _items: [] };
        }
        currentFolder = currentFolder._subfolders[part];
      });
      currentFolder._items.push(mod);
    });

    return { grouped, isSearching };
  }, [allModules, moduleSearch]);

  const toggleFolder = (folderKey: string) => {
    setOpenFolders(prev => ({ ...prev, [folderKey]: !prev[folderKey] }));
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-900 text-gray-100 font-sans selection:bg-blue-500/30 overflow-hidden">
      <div className="max-w-[1600px] mx-auto relative h-full">

        {selectedShip ? (
          <div className="animate-fade-in flex flex-col h-[calc(100vh-4rem)]">
            
            {/* Top Bar Navigation */}
            <div className="flex justify-between items-center mb-4 shrink-0">
              <button onClick={() => setSelectedShip(null)} className="text-blue-400 hover:text-blue-300 flex items-center gap-2 font-semibold text-sm uppercase tracking-widest">
                ← Anderes Schiff suchen
              </button>
              
              <div className="bg-gray-800 p-1 rounded-lg border border-gray-700 flex shadow-lg">
                <button onClick={() => setViewMode('wheel')} className={`px-6 py-2 text-sm font-bold uppercase tracking-widest rounded transition-all ${viewMode === 'wheel' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>Wheel</button>
                <button onClick={() => setViewMode('list')} className={`px-6 py-2 text-sm font-bold uppercase tracking-widest rounded transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>Pyfa List</button>
              </div>
            </div>

            {/* 3 Columns Layout */}
            <div className="flex flex-col xl:flex-row gap-6 justify-between items-stretch flex-grow overflow-hidden">
              
              {/* === LINKE SEITE: MODULE BROWSER === */}
              <div className="w-full xl:w-1/4 bg-gray-800/80 border border-gray-700 rounded-lg shadow-xl flex flex-col h-full overflow-hidden">
                <div className="p-4 bg-gray-800 border-b border-gray-700 shrink-0">
                  <h2 className="text-sm font-bold text-gray-200 uppercase tracking-widest mb-3">Hardware ({allModules.length})</h2>
                  <input 
                    type="text" 
                    placeholder="Suchen (Laser, Shield, Web)..." 
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                    className="w-full p-2 rounded bg-gray-900 border border-gray-600 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                
                <div className="flex-grow overflow-y-auto custom-scrollbar p-2">
                  {allModules.length === 0 && <p className="text-gray-500 text-center text-xs mt-4">Lade EVE Module...</p>}
                  
                  {['high', 'mid', 'low', 'rig'].map(slotType => {
                    const slotData = groupedModules.grouped[slotType];
                    if (!slotData) return null;

                    const getCount = (fd: any): number => {
                      let count = fd._items.length;
                      for (const key in fd._subfolders) count += getCount(fd._subfolders[key]);
                      return count;
                    };
                    const totalSlotCount = getCount(slotData);

                    if (totalSlotCount === 0) return null;

                    return (
                      <div key={slotType} className="mb-4">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-700 pb-1 mb-2 ml-1">
                          {slotType.toUpperCase()} SLOTS ({totalSlotCount})
                        </div>
                        
                        {Object.keys(slotData._subfolders).sort().map(groupName => (
                          <RecursiveFolder
                            key={groupName}
                            name={groupName}
                            folderData={slotData._subfolders[groupName]}
                            isSearching={groupedModules.isSearching}
                            openFolders={openFolders}
                            toggleFolder={toggleFolder}
                            equipModule={equipModule}
                            pathKey={`${slotType}-${groupName}`}
                          />
                        ))}
                        {slotData._items.map((module: any) => (
                          <div
                            key={module.id}
                            onClick={() => equipModule(module)}
                            className="flex items-center gap-2 p-1.5 bg-gray-900/30 hover:bg-blue-900/40 rounded cursor-pointer group ml-1"
                          >
                            <div className="text-xs group-hover:scale-110 transition-transform">
                              {getModuleIcon(module.type, module.name)}
                            </div>
                            <p className="text-[11px] font-semibold text-gray-400 group-hover:text-blue-300 truncate">{module.name}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>


              {/* === MITTE: FITTING ANSICHT === */}
              <div className="w-full xl:w-2/4 flex justify-center h-full overflow-hidden">
                
                {viewMode === 'wheel' ? (
                  <div className="relative w-[360px] h-[360px] md:w-[600px] md:h-[600px] flex-shrink-0 bg-gray-900 rounded-full shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-gray-800 animate-fade-in self-center">
                    <div className="absolute inset-0 m-auto w-32 h-32 md:w-48 md:h-48 bg-gray-800/80 rounded-full border border-gray-600 flex flex-col items-center justify-center shadow-lg z-10">
                      <h2 className="text-lg md:text-2xl font-bold text-white text-center leading-tight px-2 drop-shadow-md">{selectedShip.name}</h2>
                      <p className="text-[10px] md:text-xs text-blue-400 mt-1 uppercase tracking-widest">{selectedShip.group_name}</p>
                      {isSimulating && <p className="text-green-400 text-[10px] mt-2 animate-pulse uppercase tracking-widest">Simulating...</p>}
                    </div>

                    <svg viewBox="0 0 600 600" className="absolute inset-0 w-full h-full pointer-events-none">
                      <line x1="300" y1="50" x2="300" y2="550" stroke="#374151" strokeWidth="1" opacity="0.3" />
                      <line x1="50" y1="300" x2="550" y2="300" stroke="#374151" strokeWidth="1" opacity="0.3" />
                      <circle cx="300" cy="300" r="150" stroke="#374151" strokeWidth="1" fill="none" opacity="0.2" />

                      <SvgSlotGroup activeCount={selectedShip.high_slots} centerAngle={0} innerRadius={215} outerRadius={265} activeFill="fill-gray-800" activeStroke="stroke-gray-400" iconType="high" onSlotClick={!isSimulating ? unequipModule : null} fittedModules={fittedModules} />
                      <SvgSlotGroup activeCount={selectedShip.mid_slots} centerAngle={90} innerRadius={215} outerRadius={265} activeFill="fill-gray-800" activeStroke="stroke-blue-500/80" iconType="mid" onSlotClick={!isSimulating ? unequipModule : null} fittedModules={fittedModules} />
                      <SvgSlotGroup activeCount={selectedShip.low_slots} centerAngle={180} innerRadius={215} outerRadius={265} activeFill="fill-gray-800" activeStroke="stroke-green-500/80" iconType="low" onSlotClick={!isSimulating ? unequipModule : null} fittedModules={fittedModules} />
                      <SvgSlotGroup activeCount={selectedShip.rig_slots} centerAngle={-60} innerRadius={215} outerRadius={265} activeFill="fill-gray-800" activeStroke="stroke-yellow-600/80" iconType="rig" onSlotClick={!isSimulating ? unequipModule : null} fittedModules={fittedModules} />

                      <SvgHardpointGroup activeCount={selectedShip.turret_slots} centerAngle={-23} radius={200} activeFill="fill-red-900" activeStroke="stroke-red-500" />
                      <SvgHardpointGroup activeCount={selectedShip.launcher_slots} centerAngle={23} radius={200} activeFill="fill-orange-900" strokeClass="stroke-orange-500" />

                      <StatArc startAngle={35} endAngle={70} radius={280} strokeClass={cpuUsed > (selectedShip.cpu || 0) ? "stroke-red-500" : "stroke-blue-500"} textColorClass="fill-blue-400" text={`CPU ${cpuUsed.toFixed(1)} / ${selectedShip.cpu} tf`} />
                      <StatArc startAngle={110} endAngle={145} radius={280} strokeClass={pgUsed > (selectedShip.powergrid || 0) ? "stroke-yellow-500" : "stroke-red-600"} textColorClass="fill-red-400" text={`PG ${pgUsed.toFixed(1)} / ${selectedShip.powergrid} MW`} />
                    </svg>
                  </div>
                ) : (
                  <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 animate-fade-in shadow-xl flex flex-col h-full overflow-hidden">
                    <div className="flex justify-between items-start mb-2 border-b border-gray-700 pb-2 shrink-0">
                      <div>
                        <h2 className="text-3xl font-black text-white tracking-wide">{selectedShip.name}</h2>
                        <p className="text-blue-400 text-sm uppercase tracking-widest">{selectedShip.group_name}</p>
                        {isSimulating && <p className="text-green-400 text-[10px] mt-1 animate-pulse uppercase tracking-widest">Simulating...</p>}
                      </div>
                      <div className="text-right bg-gray-900 p-2 rounded border border-gray-700 hidden lg:block">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Ressourcen</div>
                        <div className="text-xs text-gray-300">CPU: <span className={`font-mono ${cpuUsed > (selectedShip.cpu || 0) ? 'text-red-500' : 'text-blue-400'}`}>{cpuUsed.toFixed(1)} / {selectedShip.cpu}</span></div>
                        <div className="text-xs text-gray-300 mt-1">PG: <span className={`font-mono ${pgUsed > (selectedShip.powergrid || 0) ? 'text-red-500' : 'text-red-400'}`}>{pgUsed.toFixed(1)} / {selectedShip.powergrid}</span></div>
                      </div>
                    </div>
                    
                    <div className="flex-grow flex flex-col justify-evenly gap-2 min-h-0 overflow-hidden">
                      {renderListCategory("High Slots", "high", selectedShip.high_slots)}
                      {renderListCategory("Mid Slots", "mid", selectedShip.mid_slots)}
                      {renderListCategory("Low Slots", "low", selectedShip.low_slots)}
                      {renderListCategory("Rig Slots", "rig", selectedShip.rig_slots)}
                    </div>
                  </div>
                )}
              </div>

              {/* === RECHTE SEITE: NEUE STATS PANELS === */}
              <div className="w-full xl:w-1/4 flex flex-col h-full overflow-y-auto custom-scrollbar pr-2 pb-4">
                
                <CollapsiblePanel title="Kampf (Combat)" defaultOpen={true}>
                  <StatRow label="Effective Hitpoints" value={simStats?.ehp?.toLocaleString() || "0"} unit="EHP" highlight={true} />
                  <StatRow label="Damage Per Second" value={simStats?.dps?.toLocaleString() || "0"} unit="DPS" highlight={true} />
                </CollapsiblePanel>

                <CollapsiblePanel title="Fitting (Ressourcen)" defaultOpen={true}>
                  <StatRow label="CPU" value={`${cpuUsed} / ${simStats ? simStats.cpu_total : selectedShip.cpu || 0}`} unit="tf" />
                  <StatRow label="Powergrid" value={`${pgUsed} / ${simStats ? simStats.powergrid_total : selectedShip.powergrid || 0}`} unit="MW" />
                  <StatRow label="Calibration" value={selectedShip.calibration || 0} unit="tf" />
                </CollapsiblePanel>

                <CollapsiblePanel title="Drohnen (Drones)" defaultOpen={true}>
                  <StatRow label="Bandbreite" value={`${simStats ? simStats.drone_bandwidth_used : "0"} / ${simStats ? simStats.drone_bandwidth_total : "0"}`} unit="Mbit/sec" />
                  <StatRow label="Drohnenhangar" value={`${simStats ? simStats.dronebay_used : "0"} / ${simStats ? simStats.dronebay_total : "0"}`} unit="m³" />
                </CollapsiblePanel>

                <CollapsiblePanel title="Energiespeicher (Capacitor)" defaultOpen={true}>
                  <StatRow label="Kapazität" value={simStats ? simStats.cap_capacity?.toLocaleString() : selectedShip.cap_capacity?.toLocaleString()} unit="GJ" />
                  <StatRow label="Aufladezeit" value={simStats ? (simStats.cap_recharge / 1000).toFixed(1) : selectedShip.cap_recharge ? (selectedShip.cap_recharge / 1000).toFixed(1) : "0"} unit="s" />
                </CollapsiblePanel>

                <CollapsiblePanel title="Verteidigung (Tank)" defaultOpen={true}>
                  <div className="flex justify-between items-center mb-1 pr-1">
                    <div className="w-16"></div> 
                    <div className="w-16 text-right text-gray-400 text-xs font-bold pr-2">HP</div>
                    <div className="flex gap-1">
                      <div className="w-8 lg:w-10 text-center text-blue-400 text-[10px] font-bold">EM</div>
                      <div className="w-8 lg:w-10 text-center text-red-400 text-[10px] font-bold">THR</div>
                      <div className="w-8 lg:w-10 text-center text-gray-300 text-[10px] font-bold">KIN</div>
                      <div className="w-8 lg:w-10 text-center text-orange-400 text-[10px] font-bold">EXP</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between hover:bg-gray-700/50 p-1 rounded transition-colors">
                    <span className="text-blue-300 text-[10px] xl:text-xs font-bold uppercase w-14 xl:w-16 truncate pl-1">Schild</span>
                    <span className="text-white font-mono text-xs xl:text-sm w-16 text-right pr-2">
                      {simStats ? simStats.shield_hp?.toLocaleString() : selectedShip.shield_hp?.toLocaleString() || "0"}
                    </span>
                    <div className="flex gap-1">
                      <ResCell value={shieldEm} color="bg-blue-600" />
                      <ResCell value={shieldTherm} color="bg-red-600" />
                      <ResCell value={shieldKin} color="bg-gray-500" />
                      <ResCell value={shieldExpl} color="bg-orange-500" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between hover:bg-gray-700/50 p-1 rounded transition-colors">
                    <span className="text-gray-300 text-[10px] xl:text-xs font-bold uppercase w-14 xl:w-16 truncate pl-1">Armor</span>
                    <span className="text-white font-mono text-xs xl:text-sm w-16 text-right pr-2">
                      {simStats ? simStats.armor_hp?.toLocaleString() : selectedShip.armor_hp?.toLocaleString() || "0"}
                    </span>
                    <div className="flex gap-1">
                      <ResCell value={armorEm} color="bg-blue-600" />
                      <ResCell value={armorTherm} color="bg-red-600" />
                      <ResCell value={armorKin} color="bg-gray-500" />
                      <ResCell value={armorExpl} color="bg-orange-500" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between hover:bg-gray-700/50 p-1 rounded transition-colors">
                    <span className="text-orange-300 text-[10px] xl:text-xs font-bold uppercase w-14 xl:w-16 truncate pl-1">Hull</span>
                    <span className="text-white font-mono text-xs xl:text-sm w-16 text-right pr-2">
                      {simStats ? simStats.hull_hp?.toLocaleString() : selectedShip.hull_hp?.toLocaleString() || "0"}
                    </span>
                    <div className="flex gap-1">
                      <ResCell value={hullEm} color="bg-blue-600" />
                      <ResCell value={hullTherm} color="bg-red-600" />
                      <ResCell value={hullKin} color="bg-gray-500" />
                      <ResCell value={hullExpl} color="bg-orange-500" />
                    </div>
                  </div>
                </CollapsiblePanel>

                <CollapsiblePanel title="Navigation" defaultOpen={true}>
                  <StatRow label="Max. Geschwindigkeit" value={simStats?.max_velocity?.toLocaleString() || "0"} unit="m/s" />
                  <StatRow label="Ausrichtezeit (Align)" value={simStats?.align_time?.toLocaleString() || "0"} unit="s" />
                  <StatRow label="Agility Factor" value={simStats?.agility_factor?.toLocaleString() || "0"} unit="x" />
                  <StatRow label="Masse" value={simStats?.mass?.toLocaleString() || selectedShip.mass?.toLocaleString() || "0"} unit="kg" />
                </CollapsiblePanel>

                <CollapsiblePanel title="Chassis" defaultOpen={false}>
                  <StatRow label="Laderaum (Cargo)" value={simStats ? simStats.cargo_capacity?.toLocaleString() : selectedShip.cargo_capacity?.toLocaleString()} unit="m³" />
                </CollapsiblePanel>
                
              </div>

            </div>
          </div>
        ) : (
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

      {pickerOpen && activeSlot && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-600 p-6 rounded-lg w-96 max-w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-widest border-b border-gray-700 pb-2">
              Modul für {activeSlot.type.toUpperCase()} Slot {activeSlot.index + 1}
            </h2>
            <p className="text-gray-400 text-sm mb-4">Bitte wähle ein Modul aus der linken Hardware-Leiste aus. Klicke dazu einfach auf ein Modul in der Liste.</p>
            <button 
              className="w-full bg-gray-700 hover:bg-gray-600 p-3 text-white rounded transition-colors tracking-widest uppercase text-sm font-bold"
              onClick={() => setPickerOpen(false)}
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </main>
  );
}