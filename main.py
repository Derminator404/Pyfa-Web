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

# ... (Deine Imports und der /ships Endpunkt für die Suche bleiben gleich)

@app.get("/ships/{ship_id}", tags=["Ships"])
def get_ship_by_id(ship_id: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Gibt NUR die Basis-Details eines spezifischen Schiffes zurück.
    """
    query = """
        SELECT t.typeID as id, t.typeName as name, g.name as group_name
        FROM invtypes t
        JOIN invgroups g ON t.groupID = g.groupID
        WHERE t.typeID = ? AND g.categoryID = 6 AND t.published = 1
    """
    try:
        cursor = db.cursor()
        cursor.execute(query, (ship_id,))
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Schiff nicht gefunden")
        return {"id": row["id"], "name": row["name"], "group_name": row["group_name"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ships/{ship_id}/attributes", tags=["Ships", "Attributes"])
def get_ship_attributes(ship_id: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Gibt NUR die Fitting-Werte (Attribute) eines Schiffes zurück.
    Kategorie 1: Slots, Capacitor UND Calibration.
    """
    # NEU: ID 1132 (Calibration) in der SQL-Abfrage hinzugefügt
    query = """
        SELECT attributeID, value
        FROM dgmtypeattribs
        WHERE typeID = ? AND attributeID IN (11, 12, 13, 14, 48, 55, 482, 1132, 1137)
    """
    try:
        cursor = db.cursor()
        cursor.execute(query, (ship_id,))
        attributes = cursor.fetchall()
        
        # Standardwerte (inkl. calibration)
        data = {
            "cpu": 0.0, "powergrid": 0.0, "calibration": 0,
            "high_slots": 0, "mid_slots": 0, "low_slots": 0, "rig_slots": 0,
            "cap_capacity": 0.0, "cap_recharge": 0.0
        }
        
        for attr in attributes:
            attr_id = attr["attributeID"]
            val = attr["value"]
            if attr_id == 48: data["cpu"] = val
            elif attr_id == 11: data["powergrid"] = val
            elif attr_id == 1132: data["calibration"] = int(val)  # NEU
            elif attr_id == 14: data["high_slots"] = int(val)
            elif attr_id == 13: data["mid_slots"] = int(val)
            elif attr_id == 12: data["low_slots"] = int(val)
            elif attr_id == 1137: data["rig_slots"] = int(val)
            elif attr_id == 482: data["cap_capacity"] = val
            elif attr_id == 55: data["cap_recharge"] = val
            
        return data
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