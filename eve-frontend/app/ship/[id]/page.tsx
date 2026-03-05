"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Ship {
  id: number;
  name: string;
  group_name: string;
}

export default function ShipDetails() {
  const params = useParams(); // Holt die ID aus der URL (z.B. die 587 aus /ship/587)
  const router = useRouter(); // Um per Code navigieren zu können (z.B. zurück)
  
  const [ship, setShip] = useState<Ship | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShip = async () => {
      try {
        // Wir rufen den Endpunkt für EIN spezifisches Schiff auf
        const response = await fetch(`http://localhost:8080/ships/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) throw new Error('Schiff nicht gefunden.');
          throw new Error('Netzwerkfehler beim Laden des Schiffs.');
        }
        
        const data: Ship[] | Ship = await response.json();
        // Da unsere API ein einzelnes Objekt zurückgibt
        setShip(data as Ship);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchShip();
    }
  }, [params.id]);

  if (loading) return <div className="min-h-screen p-8 bg-gray-900 text-white">Lade Schiffsdaten...</div>;
  if (error) return <div className="min-h-screen p-8 bg-gray-900 text-red-400">Fehler: {error}</div>;
  if (!ship) return null;

  return (
    <main className="min-h-screen p-8 bg-gray-900 text-gray-100 font-sans">
      {/* Zurück-Button */}
      <button 
        onClick={() => router.back()} 
        className="mb-8 text-blue-400 hover:text-blue-300 flex items-center gap-2"
      >
        ← Zurück zur Suche
      </button>

      {/* Header Bereich für das Schiff */}
      <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold text-white mb-2">{ship.name}</h1>
        <p className="text-xl text-gray-400 mb-6">{ship.group_name}</p>

        {/* Platzhalter für die Fitting-Stats (CPU, Powergrid, etc.) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 border-t border-gray-700 pt-6">
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <p className="text-gray-500 text-sm">CPU</p>
            <p className="text-xl font-mono text-white">??? tf</p>
          </div>
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <p className="text-gray-500 text-sm">Powergrid</p>
            <p className="text-xl font-mono text-white">??? MW</p>
          </div>
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <p className="text-gray-500 text-sm">High Slots</p>
            <p className="text-xl font-mono text-white">???</p>
          </div>
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <p className="text-gray-500 text-sm">Mid / Low</p>
            <p className="text-xl font-mono text-white">??? / ???</p>
          </div>
        </div>
      </div>
    </main>
  );
}