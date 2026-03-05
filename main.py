from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sqlite3

# Importiere deine Module (Stelle sicher, dass database.py und debug.py existieren)
from database import get_db
from debug import router as debug_router

app = FastAPI(
    title="EVE Online Fitting API",
    description="API für das EVE Online Fitting Tool - Pyfa DB Struktur",
    version="0.5.0"
)

# CORS Konfiguration für das Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.1.103:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Debug-Router einbinden
app.include_router(debug_router)

# --- Datenmodelle ---
class Ship(BaseModel):
    id: int
    name: str
    group_name: str

# --- Endpunkte ---

@app.get("/ships", response_model=List[Ship], tags=["Ships"])
def get_ships(search: Optional[str] = Query(None), db: sqlite3.Connection = Depends(get_db)):
    """Durchsucht die Schiffsdatenbank."""
    query = """
        SELECT t.typeID as id, t.typeName as name, g.name as group_name
        FROM invtypes t
        JOIN invgroups g ON t.groupID = g.groupID
        WHERE g.categoryID = 6 AND t.published = 1
    """
    params = []
    if search:
        query += " AND t.typeName LIKE ?"
        params.append(f"%{search}%")
    
    query += " ORDER BY t.typeName LIMIT 50"
    
    cursor = db.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    return [{"id": r["id"], "name": r["name"], "group_name": r["group_name"]} for r in rows]

@app.get("/ships/{ship_id}", response_model=Ship, tags=["Ships"])
def get_ship_by_id(ship_id: int, db: sqlite3.Connection = Depends(get_db)):
    """Holt Basis-Daten für ein einzelnes Schiff."""
    query = """
        SELECT t.typeID as id, t.typeName as name, g.name as group_name
        FROM invtypes t
        JOIN invgroups g ON t.groupID = g.groupID
        WHERE t.typeID = ?
    """
    cursor = db.cursor()
    cursor.execute(query, (ship_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Schiff nicht gefunden")
    return {"id": row["id"], "name": row["name"], "group_name": row["group_name"]}

@app.get("/ships/{ship_id}/attributes", tags=["Attributes"])
def get_ship_attributes(ship_id: int, db: sqlite3.Connection = Depends(get_db)):
    """Holt die Fitting-Attribute (Kategorie 1)."""
    # 11:PG, 12:Low, 13:Mid, 14:High, 48:CPU, 55:CapRecharge, 482:CapCap, 1132:Calibration, 1137:Rigs
    query = """
        SELECT attributeID, value
        FROM dgmtypeattribs
        WHERE typeID = ? AND attributeID IN (11, 12, 13, 14, 48, 55, 482, 1132, 1137)
    """
    cursor = db.cursor()
    cursor.execute(query, (ship_id,))
    attributes = cursor.fetchall()
    
    data = {
        "cpu": 0.0, "powergrid": 0.0, "calibration": 0,
        "high_slots": 0, "mid_slots": 0, "low_slots": 0, "rig_slots": 0,
        "cap_capacity": 0.0, "cap_recharge": 0.0
    }
    
    for attr in attributes:
        aid, val = attr["attributeID"], attr["value"]
        if aid == 48: data["cpu"] = val
        elif aid == 11: data["powergrid"] = val
        elif aid == 1132: data["calibration"] = int(val)
        elif aid == 14: data["high_slots"] = int(val)
        elif aid == 13: data["mid_slots"] = int(val)
        elif aid == 12: data["low_slots"] = int(val)
        elif aid == 1137: data["rig_slots"] = int(val)
        elif aid == 482: data["cap_capacity"] = val
        elif aid == 55: data["cap_recharge"] = val
            
    return data