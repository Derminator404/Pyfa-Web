# models/ship.py
from pydantic import BaseModel
from typing import Optional

class Ship(BaseModel):
    id: int
    name: str
    group_name: str

class ShipAttributes(BaseModel):
    # --- Fitting & Slots ---
    cpu: float
    powergrid: float
    calibration: int
    high_slots: int
    mid_slots: int
    low_slots: int
    rig_slots: int
    turret_slots: int      # NEU: Geschütz-Hardpoints
    launcher_slots: int    # NEU: Raketen-Hardpoints
    
    # --- Capacitor ---
    cap_capacity: float
    cap_recharge: float
    
    # --- Struktur (Hull) ---
    hull_hp: float
    cargo_capacity: float
    mass: float
    hull_em_res: float
    hull_therm_res: float
    hull_kin_res: float
    hull_expl_res: float

    # --- NEU: Panzerung (Armor) ---
    armor_hp: float
    armor_em_res: float
    armor_therm_res: float
    armor_kin_res: float
    armor_expl_res: float

    # --- NEU: Schilde (Shield) ---
    shield_hp: float
    shield_em_res: float
    shield_therm_res: float
    shield_kin_res: float
    shield_expl_res: float