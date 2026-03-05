from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware  # <-- Diese Zeile hat wahrscheinlich gefehlt!
from pydantic import BaseModel
from typing import List, Optional
import sqlite3

# Importiere unsere eigenen Module
from database import get_db
from debug import router as debug_router

# ---------------------------------------------------------
# 1. FastAPI Initialisierung
# ---------------------------------------------------------
app = FastAPI(
    title="EVE Online Fitting API",
    description="API für das EVE Online Fitting Tool - Verbunden mit eve.db",
    version="0.4.0" 
)

# --- CORS Konfiguration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.1.103:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -------------------------------

# Binde den Debug-Router in die Haupt-App ein
app.include_router(debug_router)

# ---------------------------------------------------------
# 2. Pydantic Datenmodelle (Schemas)
# ---------------------------------------------------------
class ItemBase(BaseModel):
    id: int
    name: str

class Ship(ItemBase):
    group_name: str

class Module(ItemBase):
    group_name: str

class SimulationResult(BaseModel):
    total_dps: float
    effective_hp: float

# ---------------------------------------------------------
# 3. Haupt-API Endpunkte (Jetzt mit korrekten SQL-Abfragen!)
# ---------------------------------------------------------

@app.get("/ships", response_model=List[Ship], tags=["Ships"])
def get_ships(search: Optional[str] = Query(None, description="Suchbegriff für den Schiffsnamen"), db: sqlite3.Connection = Depends(get_db)):
    """
    Holt eine Liste von Schiffen aus der Datenbank.
    Wenn ein 'search' Parameter übergeben wird, wird gezielt in der Datenbank gesucht.
    """
    query = """
        SELECT t.typeID as id, t.typeName as name, g.name as group_name
        FROM invtypes t
        JOIN invgroups g ON t.groupID = g.groupID
        WHERE g.categoryID = 6 AND t.published = 1
    """
    params = []
    
    # Wenn ein Suchbegriff da ist, filtern wir direkt in SQL
    if search:
        query += " AND t.typeName LIKE ?"
        params.append(f"%{search}%")
        
    # Wir begrenzen das Ergebnis auf 50, damit die API immer blitzschnell bleibt
    query += " ORDER BY t.typeName LIMIT 50;"
    
    try:
        cursor = db.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [{"id": row["id"], "name": row["name"], "group_name": row["group_name"]} for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Datenbankfehler: {str(e)}")

@app.get("/ships/{ship_id}", response_model=Ship, tags=["Ships"])
def get_ship_by_id(ship_id: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Gibt die Details eines spezifischen Schiffes anhand seiner ID (typeID) zurück.
    Wird benötigt, wenn ein Nutzer im Frontend ein Schiff zum Fitten auswählt.
    """
    query = """
        SELECT t.typeID as id, t.typeName as name, g.name as group_name
        FROM invtypes t
        JOIN invgroups g ON t.groupID = g.groupID
        WHERE t.typeID = ? AND g.categoryID = 6 AND t.published = 1
    """
    try:
        cursor = db.cursor()
        # Wir übergeben die ship_id sicher als Parameter (Tuples in Python enden mit Komma)
        cursor.execute(query, (ship_id,))
        row = cursor.fetchone() # fetchone() holt genau einen Eintrag (oder None)
        
        if row is None:
            # Wenn die ID nicht existiert (oder kein Schiff ist), werfen wir einen 404 Fehler
            raise HTTPException(status_code=404, detail=f"Schiff mit ID {ship_id} nicht gefunden")
            
        return {"id": row["id"], "name": row["name"], "group_name": row["group_name"]}
    
    except HTTPException:
        raise # Wir leiten den 404 Fehler einfach weiter
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Datenbankfehler: {str(e)}")

@app.get("/items", response_model=List[Module], tags=["Items"])
def search_items(query: str = Query("", description="Suchbegriff"), db: sqlite3.Connection = Depends(get_db)):
    """
    Sucht nach Items (wie Modulen oder Munition) in der Datenbank.
    Filtern nach Kategorie 7 (Module), 8 (Charges/Munition) oder 18 (Drones) wäre später sinnvoll.
    """
    sql_query = """
        SELECT t.typeID as id, t.typeName as name, g.name as group_name
        FROM invtypes t
        JOIN invgroups g ON t.groupID = g.groupID
        WHERE t.published = 1
    """
    params = []
    
    # Wenn ein Suchbegriff übergeben wurde, hängen wir eine Bedingung an die SQL-Abfrage an
    if query:
        sql_query += " AND t.typeName LIKE ?"
        params.append(f"%{query}%")
        
    sql_query += " ORDER BY t.typeName LIMIT 50;"
    
    try:
        cursor = db.cursor()
        cursor.execute(sql_query, params)
        rows = cursor.fetchall()
        return [{"id": row["id"], "name": row["name"], "group_name": row["group_name"]} for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Datenbankfehler: {str(e)}")

@app.post("/simulate", response_model=SimulationResult, tags=["Simulation"])
def simulate_fit():
    """Bleibt vorerst ein Dummy, bis wir eos einbinden."""
    return SimulationResult(total_dps=154.5, effective_hp=8500.0)