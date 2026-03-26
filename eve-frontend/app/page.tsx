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

// --- EINKLAPPBARES PANEL (Pyfa Style) ---
const CollapsiblePanel = ({ title, children, defaultOpen = true, extraText = "" }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-700 bg-gray-900/50 flex flex-col shrink-0">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex justify-between items-center px-1 py-0.5 bg-gray-800/80 hover:bg-gray-700 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-1">
          <span className={`text-[10px] text-gray-400 transform transition-transform ${isOpen ? 'rotate-90' : 'rotate-0'}`}>▶</span>
          <h3 className="text-[11px] font-bold text-gray-200 tracking-wide">{title} {extraText && <span className="font-normal text-gray-400 ml-1">{extraText}</span>}</h3>
        </div>
        <span className="text-[10px] text-gray-500">≡</span>
      </button>
      {isOpen && <div className="p-1.5 flex flex-col gap-1">{children}</div>}
    </div>
  );
};

// --- PYFA RESOURCE BAR ---
const ResourceBar = ({ label, used, total, unit, percent, icon }: any) => {
  const isOver = used > total && total > 0;
  return (
    <div className="flex flex-col text-[10px] font-mono">
      <div className="flex justify-between items-center px-1">
        <span className="text-gray-400">{icon}</span>
        <span className={isOver ? "text-red-400" : "text-gray-300"}>{used.toFixed(1)} / {total.toFixed(total % 1 === 0 ? 0 : 1)} {unit}</span>
      </div>
      <div className="bg-gray-900 border border-gray-700 h-4 relative mt-0.5 shadow-inner">
        <div className={`h-full ${isOver ? 'bg-red-800' : 'bg-gray-600'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
        <div className="absolute inset-0 flex items-center justify-center text-white text-[9px] drop-shadow-md">
          {percent.toFixed(2)}%
        </div>
      </div>
    </div>
  );
};

// --- PYFA RESISTANCE CELL ---
const ResCell = ({ value, color }: { value: number, color: string }) => {
  const safeValue = value || 0;
  return (
    <div className="relative w-full h-5 bg-gray-800 border border-gray-700 flex items-center justify-center shadow-inner overflow-hidden">
      <div className={`absolute left-0 top-0 h-full ${color} opacity-60`} style={{ width: `${safeValue}%` }}></div>
      <span className="relative z-10 text-[10px] font-mono text-gray-100 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">{safeValue.toFixed(1)}%</span>
    </div>
  );
};

// --- STATE INDICATOR BUTTON ---
const StateIndicator = ({ state, onClick }: any) => {
  const colors: any = { 1: 'bg-gray-600', 2: 'bg-blue-500', 3: 'bg-green-500', 4: 'bg-red-500' };
  const labels: any = { 1: 'OFF', 2: 'ON', 3: 'ACT', 4: 'OVL' };
  return (
    <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }} 
      className={`w-7 h-4 rounded text-[8px] font-bold flex items-center justify-center text-white shadow-inner hover:brightness-125 transition-all ${colors[state] || 'bg-gray-600'}`}
      title="Status ändern"
    >
      {labels[state] || '...'}
    </button>
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
    <div className="mb-0.5 ml-1">
      <button onClick={() => toggleFolder(pathKey)} className="w-full text-left p-1 hover:bg-gray-700 rounded text-[11px] font-bold text-gray-300 flex justify-between items-center">
        <span className="truncate pr-2">📁 {name}</span>
        <span className="text-gray-500 text-[9px]">{totalCount}</span>
      </button>
      {isOpen && (
        <div className="pl-1 mt-0.5 flex flex-col gap-0.5 border-l border-gray-700 ml-1.5">
          {Object.keys(folderData._subfolders).sort().map(subName => (
            <RecursiveFolder key={subName} name={subName} folderData={folderData._subfolders[subName]} isSearching={isSearching} openFolders={openFolders} toggleFolder={toggleFolder} equipModule={equipModule} pathKey={`${pathKey}-${subName}`} />
          ))}
          {folderData._items.map((module: any) => (
            <div key={module.id} onClick={() => equipModule(module)} className="flex items-center gap-1.5 p-1 hover:bg-blue-900/40 rounded cursor-pointer group">
              <div className="text-[10px]">{getModuleIcon(module.type, module.name)}</div>
              <p className="text-[10px] text-gray-400 group-hover:text-blue-300 truncate">{module.name}</p>
            </div>
          ))}
        </div>
      )}
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
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/modules`);
        setAllModules(await res.json());
      } catch (e) { console.error(e); }
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
      setSelectedShip({ ...clickedShip, ...(await res.json()) });
      setFittedModules({ high: [], mid: [], low: [], rig: [] });
      setSimStats(null);
    } catch (err: any) { alert("Fehler: " + err.message); }
  };

  // --- EQUIP UND STATE LOGIK ---
  const equipModule = (module: any) => {
    if (!selectedShip) return;
    const type = module.type;
    const maxSlots = selectedShip[`${type}_slots` as keyof Ship] as number || 0;
    
    if (maxSlots === 0) return alert(`Keine ${type.toUpperCase()} Slots!`);

    const currentFit = [...fittedModules[type]];
    
    let emptyIndex = -1;
    for (let i = 0; i < maxSlots; i++) {
      if (currentFit[i] === undefined || currentFit[i] === null) {
        emptyIndex = i;
        break;
      }
    }
    
    if (emptyIndex !== -1) {
      currentFit[emptyIndex] = { id: module.id, state: type === 'rig' ? 2 : 3 };
      const newFit = { ...fittedModules, [type]: currentFit };
      setFittedModules(newFit);
      triggerSimulation(newFit);
    } else {
      alert(`Alle ${type.toUpperCase()} Slots sind voll!`);
    }
  };

  const unequipModule = (type: string, index: number) => {
    const newFit = JSON.parse(JSON.stringify(fittedModules));
    newFit[type][index] = null; 
    setFittedModules(newFit);
    triggerSimulation(newFit);
  };

  const toggleState = (type: string, index: number) => {
    const mod = fittedModules[type][index];
    if (!mod) return;
    
    let nextState = mod.state;
    if (type === 'rig') {
      nextState = mod.state === 2 ? 1 : 2; // Rigs: Online <-> Offline
    } else {
      // Der neue, smarte Cycle: OFF(1) -> ACT(3) -> OVL(4) -> ON(2) -> OFF(1)
      if (mod.state === 1) nextState = 3;      // Von OFF zu Active (Backend korrigiert passive Module hier automatisch zu ON)
      else if (mod.state === 3) nextState = 4; // Von Active zu Overload
      else if (mod.state === 4) nextState = 2; // Von Overload zu Online
      else if (mod.state === 2) nextState = 1; // Von Online zu OFF
    }
    
    const newFit = JSON.parse(JSON.stringify(fittedModules)); // WICHTIG: Deep Clone für State Update
    newFit[type][index] = { ...mod, state: nextState };
    setFittedModules(newFit);
    triggerSimulation(newFit);
  };

  const triggerSimulation = async (currentFit: any) => {
    if (!selectedShip) return;
    setIsSimulating(true);
    try {
      const requestBody = {
        ship_id: selectedShip.id,
        high_slots: currentFit.high.filter((m:any) => m),
        mid_slots: currentFit.mid.filter((m:any) => m),
        low_slots: currentFit.low.filter((m:any) => m),
        rig_slots: currentFit.rig.filter((m:any) => m),
        charges: []
      };
      const res = await fetch(`${API_BASE_URL}/simulate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody)
      });
      const data = await res.json();
      
      if (data.is_valid) {
        setSimStats(data.stats);
        
        // Deep Clone, damit React rendert!
        const syncedFit = JSON.parse(JSON.stringify(currentFit));
        ['high', 'mid', 'low', 'rig'].forEach(type => {
            const returnedStates = data.module_states[type] || [];
            let stateIndex = 0;
            syncedFit[type].forEach((mod: any) => {
                if (mod) {
                    mod.state = returnedStates[stateIndex] || mod.state;
                    stateIndex++;
                }
            });
        });
        setFittedModules(syncedFit);
      }
    } finally { setIsSimulating(false); }
  };

  // --- DATEN AUFBEREITUNG ---
  const cpuUsed = simStats ? simStats.cpu_used : 0;
  const cpuTotal = simStats ? simStats.cpu_total : selectedShip?.cpu || 0;
  const cpuPercent = cpuTotal > 0 ? (cpuUsed / cpuTotal) * 100 : 0;

  const pgUsed = simStats ? simStats.powergrid_used : 0;
  const pgTotal = simStats ? simStats.powergrid_total : selectedShip?.powergrid || 0;
  const pgPercent = pgTotal > 0 ? (pgUsed / pgTotal) * 100 : 0;

  // --- NEU: CALIBRATION ---
  const calUsed = simStats ? simStats.calibration_used : 0;
  const calTotal = simStats ? simStats.calibration_total : selectedShip?.calibration || 0;
  const calPercent = calTotal > 0 ? (calUsed / calTotal) * 100 : 0;

  const bwUsed = simStats ? simStats.drone_bandwidth_used : 0;
  const bwTotal = simStats ? simStats.drone_bandwidth_total : 0;
  const bwPercent = bwTotal > 0 ? (bwUsed / bwTotal) * 100 : 0;

  const res = {
    shield: {
      em: simStats?.resists?.shield?.em ?? selectedShip?.shield_em_res ?? 0,
      therm: simStats?.resists?.shield?.thermal ?? selectedShip?.shield_therm_res ?? 0,
      kin: simStats?.resists?.shield?.kinetic ?? selectedShip?.shield_kin_res ?? 0,
      exp: simStats?.resists?.shield?.explosive ?? selectedShip?.shield_expl_res ?? 0,
      hp: simStats?.shield_hp ?? selectedShip?.shield_hp ?? 0
    },
    armor: {
      em: simStats?.resists?.armor?.em ?? selectedShip?.armor_em_res ?? 0,
      therm: simStats?.resists?.armor?.thermal ?? selectedShip?.armor_therm_res ?? 0,
      kin: simStats?.resists?.armor?.kinetic ?? selectedShip?.armor_kin_res ?? 0,
      exp: simStats?.resists?.armor?.explosive ?? selectedShip?.armor_expl_res ?? 0,
      hp: simStats?.armor_hp ?? selectedShip?.armor_hp ?? 0
    },
    hull: {
      em: simStats?.resists?.hull?.em ?? selectedShip?.hull_em_res ?? 0,
      therm: simStats?.resists?.hull?.thermal ?? selectedShip?.hull_therm_res ?? 0,
      kin: simStats?.resists?.hull?.kinetic ?? selectedShip?.hull_kin_res ?? 0,
      exp: simStats?.resists?.hull?.explosive ?? selectedShip?.hull_expl_res ?? 0,
      hp: simStats?.hull_hp ?? selectedShip?.hull_hp ?? 0
    }
  };

  const renderSlotList = (type: string, maxSlots?: number) => {
    if (!maxSlots || maxSlots === 0) return null;
    return (
      <div className="flex flex-col flex-1 min-h-0 justify-evenly gap-[1px]">
        {Array.from({ length: maxSlots }).map((_, i) => {
          const fitItem = fittedModules[type][i];
          const mod = fitItem ? allModules.find(m => m.id === fitItem.id) : null;
          return (
            <div key={i} className={`flex items-center justify-between px-1.5 py-0.5 rounded border ${mod ? 'bg-gray-800 border-gray-600' : 'bg-gray-900/50 border-gray-800 border-dashed'} overflow-hidden shrink min-h-[24px]`}>
              <div className="flex items-center gap-2 overflow-hidden">
                 {mod && <StateIndicator state={fitItem.state} onClick={() => toggleState(type, i)} />}
                 <div className="w-4 h-4 shrink-0 flex items-center justify-center text-[10px]">{mod ? getModuleIcon(mod.type, mod.name) : '+'}</div>
                 <span className={`text-[10px] truncate ${mod ? 'text-gray-200' : 'text-gray-600 italic'}`}>{mod ? mod.name : `Empty ${type.toUpperCase()}`}</span>
              </div>
              {mod && <button onClick={() => unequipModule(type, i)} className="text-red-500 hover:text-red-400 text-[10px] px-2 bg-red-900/20 rounded">✖</button>}
            </div>
          );
        })}
      </div>
    );
  };

  const groupedModules = useMemo(() => {
    const isSearching = moduleSearch.trim().length > 0;
    const filtered = isSearching 
      ? allModules.filter(m => m.name.toLowerCase().includes(moduleSearch.toLowerCase()) || m.group.toLowerCase().includes(moduleSearch.toLowerCase()))
      : allModules;
    const grouped: any = { high: { _subfolders: {}, _items: [] }, mid: { _subfolders: {}, _items: [] }, low: { _subfolders: {}, _items: [] }, rig: { _subfolders: {}, _items: [] } };
    filtered.forEach(mod => {
      const pathParts = (mod.group || "Unsortiert").split(' > ');
      let currentFolder = grouped[mod.type];
      if (!currentFolder) return; 
      pathParts.forEach((part: string) => {
        if (!currentFolder._subfolders[part]) currentFolder._subfolders[part] = { _subfolders: {}, _items: [] };
        currentFolder = currentFolder._subfolders[part];
      });
      currentFolder._items.push(mod);
    });
    return { grouped, isSearching };
  }, [allModules, moduleSearch]);

  const toggleFolder = (key: string) => setOpenFolders(p => ({ ...p, [key]: !p[key] }));

  return (
    <main className="h-screen p-2 bg-gray-900 text-gray-100 font-sans overflow-hidden">
      {!selectedShip ? (
        <div className="max-w-2xl mx-auto mt-20 text-center">
          <h1 className="text-4xl font-black mb-6 text-gray-300">EVE <span className="text-blue-500">PYFA</span> WEB</h1>
          <form onSubmit={fetchShips} className="flex gap-2 justify-center">
            <input type="text" placeholder="Schiffsnamen eingeben..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-2/3 p-3 rounded bg-gray-800 border border-gray-700 text-sm outline-none focus:border-blue-500" />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded text-sm font-bold">Suchen</button>
          </form>
          {loading && <p className="text-blue-400 mt-4 text-xs">Suche in Datenbank...</p>}
          <div className="grid grid-cols-2 gap-2 mt-6">
            {ships.map(ship => (
              <div key={ship.id} onClick={() => handleShipClick(ship)} className="bg-gray-800 p-3 rounded hover:border-blue-500 border border-gray-700 cursor-pointer text-left">
                <div className="font-bold text-sm">{ship.name}</div>
                <div className="text-xs text-gray-500">{ship.group_name}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex gap-2 h-full max-w-[1800px] mx-auto">
          
          {/* === LINKE SEITE: MODULE BROWSER === */}
          <div className="w-[280px] bg-gray-800 border border-gray-700 flex flex-col h-full shadow-lg">
            <div className="p-2 bg-gray-800 border-b border-gray-700 shrink-0 flex items-center justify-between">
               <button onClick={() => setSelectedShip(null)} className="text-[10px] text-gray-400 hover:text-white uppercase tracking-wider">← Zurück</button>
               <span className="text-[10px] font-bold text-gray-500">MARKET</span>
            </div>
            <div className="p-2 bg-gray-800 border-b border-gray-700 shrink-0">
              <input type="text" placeholder="Search..." value={moduleSearch} onChange={(e) => setModuleSearch(e.target.value)} className="w-full p-1.5 rounded bg-gray-900 border border-gray-700 text-[11px] outline-none focus:border-blue-500" />
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar p-1">
              {['high', 'mid', 'low', 'rig'].map(slotType => {
                const slotData = groupedModules.grouped[slotType];
                if (!slotData || (slotData._items.length === 0 && Object.keys(slotData._subfolders).length === 0)) return null;
                return (
                  <div key={slotType} className="mb-2">
                    <div className="text-[9px] font-bold text-gray-500 uppercase border-b border-gray-700 pb-0.5 mb-1 ml-1">{slotType} Slots</div>
                    {Object.keys(slotData._subfolders).sort().map(g => (
                      <RecursiveFolder key={g} name={g} folderData={slotData._subfolders[g]} isSearching={groupedModules.isSearching} openFolders={openFolders} toggleFolder={toggleFolder} equipModule={equipModule} pathKey={`${slotType}-${g}`} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* === MITTE: FITTING ANSICHT === */}
          <div className="flex-1 bg-gray-800/50 border border-gray-700 p-2 flex flex-col h-full shadow-lg overflow-hidden relative">
            {isSimulating && <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-green-400 animate-pulse"><div className="w-2 h-2 bg-green-400 rounded-full"></div>Simulating</div>}
            <div className="shrink-0 mb-2 px-2 border-b border-gray-700 pb-2">
              <h2 className="text-xl font-bold text-white tracking-wide">{selectedShip.name}</h2>
              <p className="text-blue-400 text-[10px] uppercase tracking-widest">{selectedShip.group_name}</p>
            </div>
            
            <div className="flex-grow flex flex-col gap-2 min-h-0 overflow-y-auto custom-scrollbar px-1">
              {selectedShip.high_slots! > 0 && <div className="flex flex-col shrink-0"><h3 className="text-[10px] font-bold text-gray-500 mb-0.5">HIGH SLOTS</h3>{renderSlotList("high", selectedShip.high_slots)}</div>}
              {selectedShip.mid_slots! > 0 && <div className="flex flex-col shrink-0"><h3 className="text-[10px] font-bold text-gray-500 mb-0.5">MID SLOTS</h3>{renderSlotList("mid", selectedShip.mid_slots)}</div>}
              {selectedShip.low_slots! > 0 && <div className="flex flex-col shrink-0"><h3 className="text-[10px] font-bold text-gray-500 mb-0.5">LOW SLOTS</h3>{renderSlotList("low", selectedShip.low_slots)}</div>}
              {selectedShip.rig_slots! > 0 && <div className="flex flex-col shrink-0"><h3 className="text-[10px] font-bold text-gray-500 mb-0.5">RIG SLOTS</h3>{renderSlotList("rig", selectedShip.rig_slots)}</div>}
            </div>
          </div>

          {/* === RECHTE SEITE: PYFA STATS SEITENLEISTE === */}
          <div className="w-[300px] bg-gray-800 border border-gray-700 flex flex-col h-full shadow-xl overflow-hidden text-gray-200">
            {/* Kopfzeile (Character) */}
            <div className="p-1.5 border-b border-gray-700 bg-gray-900 flex justify-between items-center text-[11px] shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Character:</span>
                <select className="bg-gray-800 border border-gray-700 text-white rounded outline-none py-0.5 px-1"><option>All 5</option></select>
              </div>
              <div className="flex gap-1 text-gray-400">
                <button className="hover:text-white" title="Refresh">↻</button>
                <button className="hover:text-white" title="Book">📖</button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar">
              
              {/* 1. Resources */}
              <CollapsiblePanel title="Resources">
                {/* Slot Icons Row */}
                <div className="flex justify-around items-center border-b border-gray-700 pb-1 mb-1 text-[11px] text-gray-400 font-mono">
                  <span title="High">🔭 {fittedModules.high.filter((x:any)=>x).length}/{selectedShip.high_slots}</span>
                  <span title="Mid">📡 {fittedModules.mid.filter((x:any)=>x).length}/{selectedShip.mid_slots}</span>
                  <span title="Low">⚙️ {fittedModules.low.filter((x:any)=>x).length}/{selectedShip.low_slots}</span>
                  <span title="Rig">🔧 {fittedModules.rig.filter((x:any)=>x).length}/{selectedShip.rig_slots}</span>
                </div>
                {/* Resource Bars */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-1">
                  <ResourceBar icon="🖩" used={cpuUsed} total={cpuTotal} unit="tf" percent={cpuPercent} />
                  <ResourceBar icon="⚡" used={pgUsed} total={pgTotal} unit="MW" percent={pgPercent} />
                  <ResourceBar icon="🎛️" used={calUsed} total={calTotal} unit="pt" percent={calPercent} />
                  <ResourceBar icon="📡" used={bwUsed} total={bwTotal} unit="mbit/s" percent={bwPercent} />
                  
                  {/* Cargo in voller Breite oder als Teil des Grids */}
                  <div className="col-span-2">
                    <ResourceBar icon="📦" used={simStats?.cargo_capacity || selectedShip.cargo_capacity || 0} total={selectedShip.cargo_capacity || 0} unit="m³" percent={((simStats?.cargo_capacity || selectedShip.cargo_capacity || 0) / (selectedShip.cargo_capacity||1))*100} />
                  </div>
                </div>
              </CollapsiblePanel>

              {/* 2. Resistances */}
              <CollapsiblePanel title="Resistances" extraText={`(Effective HP: ${simStats?.ehp?.toLocaleString(undefined, {maximumFractionDigits:0}) || "0"})`}>
                <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-x-1 gap-y-1 text-[10px] items-center text-center">
                  <div className="w-4"></div>
                  <div className="text-blue-400">⚡</div>
                  <div className="text-red-400">🔥</div>
                  <div className="text-gray-400">💥</div>
                  <div className="text-orange-400">🎇</div>
                  <div className="border border-gray-600 bg-gray-800 rounded px-1">EHP</div>

                  <div className="text-blue-300" title="Shield">🛡️</div>
                  <ResCell value={res.shield.em} color="bg-blue-600" />
                  <ResCell value={res.shield.therm} color="bg-red-600" />
                  <ResCell value={res.shield.kin} color="bg-gray-500" />
                  <ResCell value={res.shield.exp} color="bg-orange-500" />
                  <div className="font-mono text-right pr-1">{res.shield.hp.toLocaleString(undefined, {maximumFractionDigits:0})}</div>

                  <div className="text-gray-300" title="Armor">🧱</div>
                  <ResCell value={res.armor.em} color="bg-blue-600" />
                  <ResCell value={res.armor.therm} color="bg-red-600" />
                  <ResCell value={res.armor.kin} color="bg-gray-500" />
                  <ResCell value={res.armor.exp} color="bg-orange-500" />
                  <div className="font-mono text-right pr-1">{res.armor.hp.toLocaleString(undefined, {maximumFractionDigits:0})}</div>

                  <div className="text-orange-300" title="Hull">📦</div>
                  <ResCell value={res.hull.em} color="bg-blue-600" />
                  <ResCell value={res.hull.therm} color="bg-red-600" />
                  <ResCell value={res.hull.kin} color="bg-gray-500" />
                  <ResCell value={res.hull.exp} color="bg-orange-500" />
                  <div className="font-mono text-right pr-1">{res.hull.hp.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                </div>
              </CollapsiblePanel>

              {/* 3. Recharge rates */}
              <CollapsiblePanel title="Recharge rates" defaultOpen={true}>
                <div className="grid grid-cols-4 text-[10px] text-center gap-1 font-mono pt-1">
                  <div className="text-blue-300 text-left pl-1">🛡️ Pas.</div>
                  <div className="text-white">{simStats?.passive_shield?.toFixed(1) || "0.0"}</div>
                  <div className="text-gray-500">HP/s</div>
                  <div></div>
                  
                  <div className="text-blue-300 text-left pl-1">🛡️ Act.</div>
                  <div className="text-white">{simStats?.active_shield?.toFixed(1) || "0.0"}</div>
                  <div className="text-gray-500">HP/s</div>
                  <div></div>
                  
                  <div className="text-gray-300 text-left pl-1">🧱 Act.</div>
                  <div className="text-white">{simStats?.active_armor?.toFixed(1) || "0.0"}</div>
                  <div className="text-gray-500">HP/s</div>
                  <div></div>
                  
                  <div className="text-orange-300 text-left pl-1">📦 Act.</div>
                  <div className="text-white">{simStats?.active_hull?.toFixed(1) || "0.0"}</div>
                  <div className="text-gray-500">HP/s</div>
                  <div></div>
                </div>
              </CollapsiblePanel>

              {/* 4. Firepower */}
              <CollapsiblePanel title="Firepower">
                <div className="flex justify-between items-center text-[10px] font-mono px-2 py-1">
                  <div className="flex flex-col items-center">
                    <span className="text-gray-400">Weapon</span>
                    <span className="text-white">{simStats?.dps?.toFixed(1) || "0.0"} DPS</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-gray-400">Drone</span>
                    <span className="text-white">0.0 DPS</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-gray-400">Volley: <span className="text-white">{simStats?.volley || "0"}</span></span>
                    <span className="text-gray-400">DPS: <span className="text-white">{simStats?.dps?.toFixed(1) || "0.0"}</span></span>
                  </div>
                </div>
              </CollapsiblePanel>

              {/* 5. Remote Reps (Mocked) */}
              <CollapsiblePanel title="Remote Reps" defaultOpen={false}>
                <div className="flex justify-around text-[10px] font-mono text-gray-400 py-1">
                  <span>🔋 0 GJ/s</span><span>🛡️ 0 HP/s</span><span>🧱 0 HP/s</span><span>📦 0 HP/s</span>
                </div>
              </CollapsiblePanel>

              {/* 6. Capacitor */}
              <CollapsiblePanel title="Capacitor" defaultOpen={true}>
                <div className="flex justify-between text-[10px] font-mono px-2 py-1">
                  <div className="flex flex-col">
                    <span className="text-gray-400">Total: <span className="text-white">{simStats?.cap_capacity?.toFixed(0) || selectedShip?.cap_capacity || 0} GJ</span></span>
                    
                    <span className="text-gray-400">Lasts <span className={simStats?.cap_is_stable === false ? "text-red-400" : "text-green-400"}>
                      {simStats ? (
                        simStats.cap_is_stable 
                          ? "Stable" 
                          : `${Math.floor(simStats.cap_depletes_in / 60)}m ${Math.floor(simStats.cap_depletes_in % 60)}s`
                      ) : "Stable"}
                    </span></span>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <span className={simStats?.cap_delta < 0 ? "text-red-400 text-[11px]" : "text-green-400 text-[11px]"}>
                      {simStats?.cap_delta > 0 
                        ? `+${simStats.cap_delta.toFixed(1)} GJ/s` 
                        : `${simStats?.cap_delta?.toFixed(1) || "+0.0"} GJ/s`}
                    </span>
                    <span className="text-gray-400">
                      {simStats ? (
                        simStats.cap_is_stable ? `${simStats.cap_stable_fraction.toFixed(1)}%` : "0.0%"
                      ) : "100%"}
                    </span>
                  </div>
                </div>
              </CollapsiblePanel>

              {/* 7. Targeting & Misc */}
              <CollapsiblePanel title="Targeting & Misc">
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 px-2 py-1 text-[10px] font-mono">
                  <div className="flex justify-between"><span className="text-gray-400">Targets:</span><span className="text-white">{simStats?.max_targets || "0"}</span></div>
                  <div className="flex justify-between border-l border-gray-700 pl-2"><span className="text-gray-400">Speed:</span><span className="text-white">{simStats?.max_velocity?.toFixed(1) || "0"} m/s</span></div>
                  
                  <div className="flex justify-between"><span className="text-gray-400">Range:</span><span className="text-white">{simStats?.lock_range?.toFixed(1) || "0"} km</span></div>
                  <div className="flex justify-between border-l border-gray-700 pl-2"><span className="text-gray-400">Align time:</span><span className="text-white">{simStats?.align_time?.toFixed(2) || "0"} s</span></div>
                  
                  <div className="flex justify-between"><span className="text-gray-400">Scan res.:</span><span className="text-white">{simStats?.scan_res?.toFixed(0) || "0"} mm</span></div>
                  <div className="flex justify-between border-l border-gray-700 pl-2"><span className="text-gray-400">Signature:</span><span className="text-white">{simStats?.sig_radius?.toFixed(0) || "0"} m</span></div>
                  
                  <div className="flex justify-between"><span className="text-gray-400">Sensor str.:</span><span className="text-white">{simStats?.sensor_str?.toFixed(1) || "0"}</span></div>
                  <div className="flex justify-between border-l border-gray-700 pl-2"><span className="text-gray-400">Warp Speed:</span><span className="text-white">{simStats?.warp_speed?.toFixed(2) || "0"} AU/s</span></div>
                  
                  <div className="flex justify-between"><span className="text-gray-400">Drone range:</span><span className="text-white">{simStats?.drone_range?.toFixed(1) || "0"} km</span></div>
                  <div className="flex justify-between border-l border-gray-700 pl-2"><span className="text-gray-400">Cargo:</span><span className="text-white">{simStats?.cargo_capacity || selectedShip.cargo_capacity || 0} m³</span></div>
                </div>
              </CollapsiblePanel>

              {/* 8. Price (Mocked) */}
              <CollapsiblePanel title="Price" defaultOpen={false}>
                <div className="grid grid-cols-3 gap-2 px-2 py-1 text-[10px] font-mono text-center">
                  <div><span className="text-gray-400 block">Ship</span>0 ISK</div>
                  <div><span className="text-gray-400 block">Fittings</span>0 ISK</div>
                  <div><span className="text-gray-400 block">Character</span>0 ISK</div>
                  <div><span className="text-gray-400 block">Drones</span>0 ISK</div>
                  <div><span className="text-gray-400 block">Cargo bay</span>0 ISK</div>
                  <div className="text-blue-300"><span className="text-gray-400 block">Total</span>0 ISK</div>
                </div>
              </CollapsiblePanel>

            </div>
          </div>
        </div>
      )}
    </main>
  );
}