# main.py
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import sqlite3

from database import get_db
from debug import router as debug_router

# Neue Imports aus unserer Struktur
from models.ship import Ship, ShipAttributes
from repositories import ship_repository

app = FastAPI(title="EVE Pyfa Web API", version="0.6.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In der Dev-Phase für alle IPs offen
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(debug_router)

@app.get("/ships", response_model=List[Ship])
def search_ships(search: Optional[str] = Query(None), db: sqlite3.Connection = Depends(get_db)):
    return ship_repository.list_ships(db, search)

@app.get("/ships/{ship_id}/attributes")
def get_attributes(ship_id: int, db: sqlite3.Connection = Depends(get_db)):
    try:
        return ship_repository.get_full_attributes(db, ship_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
