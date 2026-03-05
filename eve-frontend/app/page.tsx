"use client";

import { useState } from 'react';

const API_BASE_URL = "http://192.168.1.103:8080";

interface Ship {
  id: number;
  name: string;
  group_name: string;
  cpu?: number; powergrid?: number; calibration?: number;
  high_slots?: number; mid_slots?: number; low_slots?: number; rig_slots?: number;
  cap_capacity?: number; cap_recharge?: number;
  // Hull
  hull_hp?: number; cargo_capacity?: number; mass?: number;
  hull_em_res?: number; hull_therm_res?: number; hull_kin_res?: number; hull_expl_res?: number;
  // Armor
  armor_hp?: number;
  armor_em_res?: number; armor_therm_res?: number; armor_kin_res?: number; armor_expl_res?: number;
  // Shield
  shield_hp?: number;
  shield_em_res?: number; shield_therm_res?: number; shield_kin_res?: number; shield_expl_res?: number;
}

// --- BAUSTEINE ---
const StatCard = ({ label, value, unit = "", colorClass = "border-gray-700" }: { label: string, value: any, unit?: string, colorClass?: string }) => (
  <div className={`bg-gray-900 p-4 rounded border ${colorClass} shadow-inner`}>
    <p className="text-gray-500 text-xs uppercase tracking-tighter mb-1">{label}</p>
    <p className="text-xl font-mono text-white">
      {value ?? "0"} <span className="text-sm opacity-50 font-sans">{unit}</span>
    </p>
  </div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <h3 className="text-sm uppercase tracking-wider font-bold text-gray-500 mb-4 border-b border-gray-700 pb-2 mt-8">
    {title}
  </h3>
);

const ResLine = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className="flex justify-between items-center bg-gray-900/40 p-2 rounded border border-gray-800/50">
    <span className={`text-xs font-bold ${color}`}>{label}</span>
    <span className="text-white font-mono">{value?.toFixed(1)}%</span>
  </div>
);

// Neuer Baustein: Ein kompletter Defense-Block (HP + Resistenzen)
const DefenseBlock = ({ title, hp, em, therm, kin, expl, colorClass }: any) => (
  <div className={`bg-gray-900 p-4 rounded border ${colorClass}`}>
    <p className="text-gray-500 text-xs uppercase tracking-tighter mb-1">{title} HP</p>
    <p className="text-2xl font-mono text-white mb-4">{hp?.toLocaleString()}</p>
    <div className="grid grid-cols-2 gap-2">
      <ResLine label="EM" color="text-yellow-500" value={em || 0} />
      <ResLine label="THERM" color="text-red-500" value={therm || 0} />
      <ResLine label="KIN" color="text-gray-300" value={kin || 0} />
      <ResLine label="EXPL" color="text-orange-500" value={expl || 0} />
    </div>
  </div>
);


export default function Home() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedShip, setSelectedShip] = useState<Ship | null>(null);

  const fetchShips = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchInput.trim()) return;
    setLoading(true); setHasSearched(true);
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
    <main className="min-h-screen p-8 bg-gray-900 text-gray-100 font-sans">
      <div className="max-w-6xl mx-auto">

        {selectedShip ? (
          <div className="animate-fade-in">
            <button onClick={() => setSelectedShip(null)} className="mb-8 text-blue-400 hover:text-blue-300 flex items-center gap-2 font-semibold">
              ← Zurück zur Suche
            </button>

            <div className="bg-gray-800 border border-gray-700 p-8 rounded-xl shadow-2xl">
              <h1 className="text-4xl font-bold text-white mb-1">{selectedShip.name}</h1>
              <p className="text-xl text-gray-400 mb-6">{selectedShip.group_name}</p>

              {/* FITTING & SLOTS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <SectionHeader title="Ressourcen" />
                  <div className="grid grid-cols-3 gap-2">
                    <StatCard label="CPU" value={selectedShip.cpu} unit="tf" />
                    <StatCard label="Powergrid" value={selectedShip.powergrid} unit="MW" />
                    <StatCard label="Calibration" value={selectedShip.calibration} colorClass="border-blue-900/50" />
                  </div>
                </div>
                <div>
                  <SectionHeader title="Slots" />
                  <div className="grid grid-cols-4 gap-2">
                    <StatCard label="High" value={selectedShip.high_slots} />
                    <StatCard label="Mid" value={selectedShip.mid_slots} />
                    <StatCard label="Low" value={selectedShip.low_slots} />
                    <StatCard label="Rig" value={selectedShip.rig_slots} colorClass="border-blue-900/50" />
                  </div>
                </div>
              </div>

              {/* DEFENSE / TANK */}
              <SectionHeader title="Verteidigung (Tank)" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DefenseBlock 
                  title="Schild" hp={selectedShip.shield_hp} colorClass="border-blue-500/30"
                  em={selectedShip.shield_em_res} therm={selectedShip.shield_therm_res} kin={selectedShip.shield_kin_res} expl={selectedShip.shield_expl_res} 
                />
                <DefenseBlock 
                  title="Panzerung" hp={selectedShip.armor_hp} colorClass="border-gray-500/30"
                  em={selectedShip.armor_em_res} therm={selectedShip.armor_therm_res} kin={selectedShip.armor_kin_res} expl={selectedShip.armor_expl_res} 
                />
                <DefenseBlock 
                  title="Struktur" hp={selectedShip.hull_hp} colorClass="border-orange-500/30"
                  em={selectedShip.hull_em_res} therm={selectedShip.hull_therm_res} kin={selectedShip.hull_kin_res} expl={selectedShip.hull_expl_res} 
                />
              </div>

              {/* CHASSIS & CAPACITOR */}
              <SectionHeader title="Systeme & Chassis" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Cap Kapazität" value={selectedShip.cap_capacity} unit="GJ" colorClass="border-yellow-900/20" />
                <StatCard label="Cap Ladezeit" value={selectedShip.cap_recharge ? (selectedShip.cap_recharge / 1000).toFixed(1) : "0"} unit="s" colorClass="border-yellow-900/20" />
                <StatCard label="Ladraum" value={selectedShip.cargo_capacity} unit="m³" />
                <StatCard label="Masse" value={selectedShip.mass?.toLocaleString()} unit="kg" />
              </div>

            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">EVE PYFA WEB</h1>
            <form onSubmit={fetchShips} className="mb-10 flex gap-3">
              <input type="text" placeholder="Schiffsnamen eingeben..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="flex-grow p-4 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none text-lg" />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-lg font-bold text-white">SUCHEN</button>
            </form>
            {loading && <p className="text-blue-400 animate-pulse text-center">Suche...</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ships.map(ship => (
                <div key={ship.id} onClick={() => handleShipClick(ship)} className="bg-gray-800 border border-gray-700 p-5 rounded-lg hover:border-blue-500 cursor-pointer group">
                  <h2 className="text-xl font-bold group-hover:text-blue-400">{ship.name}</h2>
                  <p className="text-gray-500 text-sm">{ship.group_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}