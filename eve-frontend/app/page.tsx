"use client";

import { useState } from 'react';

// Ersetze diese IP hier, falls sie sich geändert hat!
const API_BASE_URL = "http://192.168.1.103:8080";

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

export default function Home() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedShip, setSelectedShip] = useState<Ship | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchShips = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      console.log(`Suche nach: ${query} auf ${API_BASE_URL}`);
      const res = await fetch(`${API_BASE_URL}/ships?search=${encodeURIComponent(query)}`);
      
      if (!res.ok) throw new Error(`Server-Fehler: ${res.status}`);
      
      const data = await res.json();
      setShips(data);
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(`Verbindung zum Backend fehlgeschlagen (${err.message}). Prüfe die IP ${API_BASE_URL}`);
    } finally {
      setLoading(false);
    }
  };

  const handleShipClick = async (clickedShip: Ship) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ships/${clickedShip.id}/attributes`);
      if (!res.ok) throw new Error('Attribute konnten nicht geladen werden.');
      const attrs = await res.json();
      setSelectedShip({ ...clickedShip, ...attrs });
    } catch (err: any) {
      alert("Fehler beim Laden der Details: " + err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-900 text-gray-100 font-sans">
      {selectedShip ? (
        <div className="animate-fade-in max-w-5xl mx-auto">
          <button onClick={() => setSelectedShip(null)} className="mb-8 text-blue-400 hover:text-blue-300 flex items-center gap-2 font-semibold">
            ← Zurück zur Suche
          </button>

          <div className="bg-gray-800 border border-gray-700 p-8 rounded-xl shadow-2xl">
            <h1 className="text-4xl font-bold text-white mb-1">{selectedShip.name}</h1>
            <p className="text-xl text-gray-400 mb-8">{selectedShip.group_name}</p>

            {/* Ressourcen */}
            <section className="mb-8">
              <h3 className="text-sm uppercase tracking-wider font-bold text-gray-500 mb-4 border-b border-gray-700 pb-2">Fitting Ressourcen</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-900 p-4 rounded border border-gray-700">
                  <p className="text-gray-500 text-xs uppercase">CPU</p>
                  <p className="text-xl font-mono text-white">{selectedShip.cpu} tf</p>
                </div>
                <div className="bg-gray-900 p-4 rounded border border-gray-700">
                  <p className="text-gray-500 text-xs uppercase">Powergrid</p>
                  <p className="text-xl font-mono text-white">{selectedShip.powergrid} MW</p>
                </div>
                <div className="bg-gray-900 p-4 rounded border border-blue-900/50">
                  <p className="text-blue-400 text-xs uppercase">Calibration</p>
                  <p className="text-xl font-mono text-white">{selectedShip.calibration}</p>
                </div>
              </div>
            </section>

            {/* Slots */}
            <section className="mb-8">
              <h3 className="text-sm uppercase tracking-wider font-bold text-gray-500 mb-4 border-b border-gray-700 pb-2">Slots</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-900 p-4 rounded border border-gray-700">
                  <p className="text-gray-500 text-xs uppercase">High Slots</p>
                  <p className="text-xl font-mono text-white">{selectedShip.high_slots}</p>
                </div>
                <div className="bg-gray-900 p-4 rounded border border-gray-700">
                  <p className="text-gray-500 text-xs uppercase">Mid Slots</p>
                  <p className="text-xl font-mono text-white">{selectedShip.mid_slots}</p>
                </div>
                <div className="bg-gray-900 p-4 rounded border border-gray-700">
                  <p className="text-gray-500 text-xs uppercase">Low Slots</p>
                  <p className="text-xl font-mono text-white">{selectedShip.low_slots}</p>
                </div>
                <div className="bg-gray-900 p-4 rounded border border-blue-900/50">
                  <p className="text-blue-400 text-xs uppercase">Rig Slots</p>
                  <p className="text-xl font-mono text-white">{selectedShip.rig_slots}</p>
                </div>
              </div>
            </section>

            {/* Energiespeicher */}
            <section>
              <h3 className="text-sm uppercase tracking-wider font-bold text-gray-500 mb-4 border-b border-gray-700 pb-2">Energiespeicher</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900 p-4 rounded border border-yellow-900/30">
                  <p className="text-yellow-500 text-xs uppercase">Kapazität</p>
                  <p className="text-xl font-mono text-white">{selectedShip.cap_capacity} GJ</p>
                </div>
                <div className="bg-gray-900 p-4 rounded border border-yellow-900/30">
                  <p className="text-yellow-500 text-xs uppercase">Aufladezeit</p>
                  <p className="text-xl font-mono text-white">{(selectedShip.cap_recharge! / 1000).toFixed(1)} s</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">EVE PYFA WEB</h1>
          <form onSubmit={(e) => { e.preventDefault(); fetchShips(searchInput); }} className="mb-10 flex gap-3">
            <input 
              type="text" placeholder="Schiff suchen..." value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-grow p-4 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none transition-all text-lg"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-lg font-bold transition-all shadow-lg active:scale-95">SUCHEN</button>
          </form>

          {loading && <p className="text-blue-400 animate-pulse text-center text-xl">Datenbank wird abgefragt...</p>}
          {error && <p className="text-red-400 text-center mb-6">{error}</p>}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ships.map(ship => (
              <div key={ship.id} onClick={() => handleShipClick(ship)} className="bg-gray-800 border border-gray-700 p-5 rounded-lg hover:border-blue-500 cursor-pointer transition-all group shadow-md hover:shadow-blue-500/10">
                <h2 className="text-xl font-bold group-hover:text-blue-400 transition-colors">{ship.name}</h2>
                <p className="text-gray-500 text-sm">{ship.group_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}