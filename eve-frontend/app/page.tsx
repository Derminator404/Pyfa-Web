"use client";

import { useState } from 'react';

// 1. Interface erweitert (Kategorie 1 + Calibration)
interface Ship {
  id: number;
  name: string;
  group_name: string;
  cpu?: number;
  powergrid?: number;
  calibration?: number;     // NEU
  high_slots?: number;
  mid_slots?: number;
  low_slots?: number;
  rig_slots?: number;
  cap_capacity?: number;
  cap_recharge?: number;
}

export default function Home() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState<string>("");
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const [selectedShip, setSelectedShip] = useState<Ship | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  const fetchShips = async (query: string) => {
    if (!query.trim()) return; 
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const url = `http://localhost:8080/ships?search=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Netzwerkantwort war nicht ok.');
      const data: Ship[] = await response.json();
      setShips(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchShips(searchInput);
  };

  const handleShipClick = async (clickedShip: Ship) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`http://localhost:8080/ships/${clickedShip.id}/attributes`);
      if (!response.ok) throw new Error('Attribute konnten nicht geladen werden.');
      const attributes = await response.json();
      setSelectedShip({ ...clickedShip, ...attributes });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-900 text-gray-100 font-sans">
      
      {selectedShip ? (
        <div className="animate-fade-in">
          <button 
            onClick={() => setSelectedShip(null)} 
            className="mb-8 text-blue-400 hover:text-blue-300 flex items-center gap-2 font-semibold transition-colors"
          >
            ← Zurück zur Suche
          </button>

          <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-lg">
            <h1 className="text-4xl font-bold text-white mb-2">{selectedShip.name}</h1>
            <p className="text-xl text-gray-400 mb-6">{selectedShip.group_name}</p>

            {/* BLOCK 1: Fitting Ressourcen (CPU, PG, Calibration) */}
            <h3 className="text-lg font-semibold text-gray-300 border-b border-gray-700 pb-2 mt-8 mb-4">Fitting Ressourcen</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-900 p-4 rounded border border-gray-700">
                <p className="text-gray-500 text-sm">CPU</p>
                <p className="text-xl font-mono text-white">{selectedShip.cpu ?? "0"} tf</p>
              </div>
              <div className="bg-gray-900 p-4 rounded border border-gray-700">
                <p className="text-gray-500 text-sm">Powergrid</p>
                <p className="text-xl font-mono text-white">{selectedShip.powergrid ?? "0"} MW</p>
              </div>
              {/* NEU: Calibration */}
              <div className="bg-gray-900 p-4 rounded border border-blue-900/50">
                <p className="text-blue-400 text-sm">Calibration</p>
                <p className="text-xl font-mono text-white">{selectedShip.calibration ?? "0"}</p>
              </div>
            </div>

            {/* BLOCK 2: Slots */}
            <h3 className="text-lg font-semibold text-gray-300 border-b border-gray-700 pb-2 mt-8 mb-4">Schiffs-Slots</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-900 p-4 rounded border border-gray-700">
                <p className="text-gray-500 text-sm">High Slots</p>
                <p className="text-xl font-mono text-white">{selectedShip.high_slots ?? "0"}</p>
              </div>
              <div className="bg-gray-900 p-4 rounded border border-gray-700">
                <p className="text-gray-500 text-sm">Mid Slots</p>
                <p className="text-xl font-mono text-white">{selectedShip.mid_slots ?? "0"}</p>
              </div>
              <div className="bg-gray-900 p-4 rounded border border-gray-700">
                <p className="text-gray-500 text-sm">Low Slots</p>
                <p className="text-xl font-mono text-white">{selectedShip.low_slots ?? "0"}</p>
              </div>
              <div className="bg-gray-900 p-4 rounded border border-blue-900/50">
                <p className="text-blue-400 text-sm">Rig Slots</p>
                <p className="text-xl font-mono text-white">{selectedShip.rig_slots ?? "0"}</p>
              </div>
            </div>

            {/* BLOCK 3: Energiespeicher (Capacitor) */}
            <h3 className="text-lg font-semibold text-gray-300 border-b border-gray-700 pb-2 mt-8 mb-4">Energiespeicher</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 p-4 rounded border border-yellow-900/30">
                <p className="text-yellow-500 text-sm">Capacitor Kapazität</p>
                <p className="text-xl font-mono text-white">{selectedShip.cap_capacity ?? "0"} GJ</p>
              </div>
              <div className="bg-gray-900 p-4 rounded border border-yellow-900/30">
                <p className="text-yellow-500 text-sm">Capacitor Aufladezeit</p>
                <p className="text-xl font-mono text-white">
                  {selectedShip.cap_recharge ? (selectedShip.cap_recharge / 1000).toFixed(1) : "0"} s
                </p>
              </div>
            </div>
            
          </div>
        </div>

      ) : (

        /* ANSICHT 2: DIE SUCHE (Bleibt unverändert) */
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold mb-8 text-blue-400">EVE Online Fitting Tool</h1>
          
          <form onSubmit={handleSearch} className="mb-8 flex gap-2 w-full md:w-2/3 lg:w-1/2">
            <input 
              type="text" 
              placeholder="Suche in der Datenbank (z.B. Drake, Tengu)..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-grow p-3 rounded bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded font-semibold transition-colors"
            >
              Suchen
            </button>
          </form>

          {loading && <p className="text-blue-400 animate-pulse">Durchsuche Datenbank...</p>}
          {loadingDetails && <p className="text-green-400 animate-pulse mt-4">Lade Schiffsdetails...</p>}
          
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-6">
              <p className="font-bold">Fehler beim Laden:</p>
              <p>{error}</p>
            </div>
          )}
          
          {!loading && !error && (
            <>
              {!hasSearched && <p className="text-gray-400 text-lg">Bitte gib einen Schiffsnamen ein, um die Datenbank zu durchsuchen.</p>}
              {hasSearched && ships.length === 0 && <p className="text-gray-400 text-lg">Kein Schiff unter dem Namen "{searchInput}" gefunden.</p>}

              {hasSearched && ships.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {ships.map((ship) => (
                    <div 
                      key={ship.id} 
                      onClick={() => handleShipClick(ship)} 
                      className="bg-gray-800 border border-gray-700 p-4 rounded shadow-lg hover:border-blue-500 transition-colors cursor-pointer group"
                    >
                      <h2 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">{ship.name}</h2>
                      <p className="text-gray-400 text-sm mt-1">Klasse: {ship.group_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}