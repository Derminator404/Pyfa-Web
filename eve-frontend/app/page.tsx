"use client";

import { useState, useEffect } from 'react';

// 1. TypeScript Interface
interface Ship {
  id: number;
  name: string;
  group_name: string;
}

export default function Home() {
  // 2. State-Variablen
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Speichert den Text in der Eingabeleiste
  const [searchInput, setSearchInput] = useState<string>("");

  // 3. Funktion zum Abrufen der Daten aus dem Backend
  const fetchShips = async (query: string = "") => {
    setLoading(true);
    setError(null);
    try {
      // Wir hängen den Suchbegriff an die URL an, z.B. ?search=Rifter
      const url = query ? `http://localhost:8080/ships?search=${encodeURIComponent(query)}` : 'http://localhost:8080/ships';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Netzwerkantwort war nicht ok. Läuft das Backend?');
      }
      const data: Ship[] = await response.json();
      setShips(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Wird einmalig beim Start aufgerufen, um eine Standardliste zu zeigen
  useEffect(() => {
    fetchShips();
  }, []);

  // 4. Wird aufgerufen, wenn das Formular abgesendet wird (Enter oder Button-Klick)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); // Verhindert, dass die Seite neu lädt
    fetchShips(searchInput);
  };

  // 5. UI Rendering
  return (
    <main className="min-h-screen p-8 bg-gray-900 text-gray-100 font-sans">
      <h1 className="text-3xl font-bold mb-8 text-blue-400">EVE Online Fitting Tool</h1>
      
      {/* NEU: Ein echtes Formular für die Suche */}
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

      {/* Lade- und Fehleranzeigen */}
      {loading && <p className="text-blue-400 animate-pulse">Durchsuche Datenbank...</p>}
      
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-6">
          <p className="font-bold">Fehler beim Laden:</p>
          <p>{error}</p>
        </div>
      )}
      
      {/* Grid-Anzeige der vom Backend gelieferten Schiffe */}
      {!loading && !error && (
        <>
          {ships.length === 0 ? (
            <p className="text-gray-400">Kein Schiff unter diesem Namen gefunden.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {ships.map((ship) => (
                <div 
                  key={ship.id} 
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
    </main>
  );
}