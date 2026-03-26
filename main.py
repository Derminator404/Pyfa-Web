# main.py
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel # NEU
from typing import List, Optional, Union, Dict
import sqlite3
import traceback

from database import get_db
from debug import router as debug_router

# Neue Imports aus unserer Struktur
from models.ship import Ship, ShipAttributes
from repositories import ship_repository
from services.simulator import eos_sim # NEU: Unser Simulator!

app = FastAPI(title="EVE Pyfa Web API", version="0.6.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(debug_router)

# --- NEU: Pydantic Model für das Fit ---
class FitRequest(BaseModel):
    ship_id: int
    low_slots: List[int] = []
    mid_slots: List[int] = []
    high_slots: List[int] = []
    charges: List[int] = []

@app.get("/ships", response_model=List[Ship])
def search_ships(search: Optional[str] = Query(None), db: sqlite3.Connection = Depends(get_db)):
    return ship_repository.list_ships(db, search)

@app.get("/ships/{ship_id}/attributes")
def get_attributes(ship_id: int, db: sqlite3.Connection = Depends(get_db)):
    try:
        return ship_repository.get_full_attributes(db, ship_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Wir erlauben nun ints (altes Format) UND Dictionaries (neues Format mit States)
class FitSimulationRequest(BaseModel):
    ship_id: int
    low_slots: List[Union[int, Dict[str, int]]] = []
    mid_slots: List[Union[int, Dict[str, int]]] = []
    high_slots: List[Union[int, Dict[str, int]]] = []
    rig_slots: List[Union[int, Dict[str, int]]] = []
    charges: List[Optional[int]] = []

# NEU: Modul-Liste anfragen
@app.get("/modules", tags=["Datenbank"])
def get_all_modules():
    # Wir importieren den Cache aus der neuen Datei!
    from services.modules import MODULE_CACHE
    return MODULE_CACHE


@app.post("/simulate", tags=["Simulation"])
def simulate_fit(request: FitSimulationRequest):
    # Den Import zu deinem eos_sim musst du oben in der Datei haben!
    from services.simulator import eos_sim 
    
    result = eos_sim.simulate(
        ship_id=request.ship_id,
        low_slots=request.low_slots,
        mid_slots=request.mid_slots,
        high_slots=request.high_slots,
        rig_slots=request.rig_slots, # <--- WICHTIG
        charges=request.charges
    )
    
    if not result["is_valid"]:
        return {"is_valid": False, "errors": result["errors"]}
        
    return result