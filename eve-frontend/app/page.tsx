"use client";

import { useState } from 'react';

// --- KONFIGURATION ---
const API_BASE_URL = "http://192.168.1.103:8080";

// --- DATEN-STRUKTUR (Interface) ---
interface Ship {
  id: number;
  name: string;
  group_name: string;
  cpu?: number;
  powergrid?: number;
  calibration?: number;
  high_slots?: number;
  mid_slots?: number;
  low_slots?: number;
  rig_slots?: number;
  cap_capacity?: number;
  cap_recharge?: number;
}

// --- KLEINE BAUSTEINE (Sub-Komponenten für sauberen Code) ---

// Ein einzelnes Info-Kästchen (Stat-Karte)
const StatCard = ({ label, value, unit = "", colorClass = "border-gray-700" }: { label: string, value: any, unit?: string, colorClass?: string }) => (
  <div className={`bg-gray-900 p-4 rounded border ${colorClass} shadow-inner`}>
    <p className="text-gray-500 text-xs uppercase tracking-tighter mb-1">{label}</p>
    <p className="text-xl font-mono text-white">
      {value ?? "0"} <span className="text-sm opacity-50 font-sans">{unit}</span>
    </p>
  </div>
);

// Eine Trenn-Überschrift für Kategorien
const SectionHeader = ({ title }: { title: string }) => (
  <h3 className="text-sm uppercase tracking-wider font-bold text-gray-500 mb-4 border-b border-gray-700 pb-2 mt-8">
    {title}
  </h3>
);


// --- HAUPT-KOMPONENTE ---

export default function Home() {
  // States für die Suche
  const [ships, setShips] = useState<Ship[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States für das Fitting-Panel
  const [selectedShip, setSelectedShip] = useState<Ship | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // LOGIK: Schiffe suchen
  const fetchShips = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchInput.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch(`${API_BASE_URL}/ships?search=${encodeURIComponent(searchInput)}`);
      if (!res.ok) throw new Error(`Server-Fehler: ${res.status}`);
      const data = await res.json();
      setShips(data);
    } catch (err: any) {
      setError(`Verbindung fehlgeschlagen: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // LOGIK: Attribute laden & Schiff auswählen
  const handleShipClick = async (clickedShip: Ship) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ships/${clickedShip.id}/attributes`);
      if (!res.ok) throw new Error('Attribute konnten nicht geladen werden.');
      const attributes = await res.json();
      
      // Merge: Basis-Daten + nachgeladene Attribute
      setSelectedShip({ ...clickedShip, ...attributes });
    } catch (err: any) {
      alert("Fehler: " + err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-900 text-gray-100 font-sans">
      <div className="max-w-5xl mx-auto">

        {/* --- ANSICHT A: FITTING PANEL --- */}
        {selectedShip ? (
          <div className="animate-fade-in">
            <button 
              onClick={() => setSelectedShip(null)} 
              className="mb-8 text-blue-400 hover:text-blue-300 flex items-center gap-2 font-semibold transition-all hover:-translate-x-1"
            >
              ← Zurück zur Suche
            </button>

            <div className="bg-gray-800 border border-gray-700 p-8 rounded-xl shadow-2xl">
              <div className="mb-2">
                <h1 className="text-4xl font-bold text-white tracking-tight">{selectedShip.name}</h1>
                <p className="text-xl text-gray-400">{selectedShip.group_name}</p>
              </div>

              {/* Kategorie: Ressourcen */}
              <SectionHeader title="Fitting Ressourcen" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="CPU" value={selectedShip.cpu} unit="tf" />
                <StatCard label="Powergrid" value={selectedShip.powergrid} unit="MW" />
                <StatCard label="Calibration" value={selectedShip.calibration} colorClass="border-blue-900/50" />
              </div>

              {/* Kategorie: Slots */}
              <SectionHeader title="Schiffs-Slots" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="High Slots" value={selectedShip.high_slots} />
                <StatCard label="Mid Slots" value={selectedShip.mid_slots} />
                <StatCard label="Low Slots" value={selectedShip.low_slots} />
                <StatCard label="Rig Slots" value={selectedShip.rig_slots} colorClass="border-blue-900/50" />
              </div>

              {/* Kategorie: Capacitor */}
              <SectionHeader title="Energiespeicher" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard label="Kapazität" value={selectedShip.cap_capacity} unit="GJ" colorClass="border-yellow-900/20" />
                <StatCard label="Aufladezeit" value={selectedShip.cap_recharge ? (selectedShip.cap_recharge / 1000).toFixed(1) : "0"} unit="s" colorClass="border-yellow-900/20" />
              </div>
            </div>
          </div>

        ) : (

          /* --- ANSICHT B: SUCHE --- */
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 tracking-tighter">
              EVE PYFA WEB
            </h1>

            <form onSubmit={fetchShips} className="mb-10 flex gap-3">
              <input 
                type="text" 
                placeholder="Schiffsnamen eingeben..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-grow p-4 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-lg shadow-inner"
              />
              <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-lg font-bold transition-all shadow-lg active:scale-95 text-white"
              >
                SUCHEN
              </button>
            </form>

            {/* Status-Meldungen */}
            {loading && <p className="text-blue-400 animate-pulse text-center text-xl">Datenbank-Anfrage läuft...</p>}
            {error && <p className="text-red-400 text-center bg-red-900/20 p-4 rounded border border-red-900/50 mb-6">{error}</p>}
            {loadingDetails && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white text-xl font-bold">Lade Fitting-Attribute...</p>
                </div>
              </div>
            )}
            
            {/* Ergebnis-Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ships.map(ship => (
                <div 
                  key={ship.id} 
                  onClick={() => handleShipClick(ship)} 
                  className="bg-gray-800 border border-gray-700 p-5 rounded-lg hover:border-blue-500 cursor-pointer transition-all group shadow-md hover:shadow-blue-500/10 active:bg-gray-750"
                >
                  <h2 className="text-xl font-bold group-hover:text-blue-400 transition-colors">{ship.name}</h2>
                  <p className="text-gray-500 text-sm">{ship.group_name}</p>
                </div>
              ))}
            </div>

            {hasSearched && ships.length === 0 && !loading && (
              <p className="text-center text-gray-500 mt-10 text-lg italic">Keine Treffer in der Datenbank gefunden.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}