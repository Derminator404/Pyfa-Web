# models/ship.py
from pydantic import BaseModel
from typing import Optional

class Ship(BaseModel):
    id: int
    name: str
    group_name: str

class ShipAttributes(BaseModel):
    cpu: float
    powergrid: float
    calibration: int
    high_slots: int
    mid_slots: int
    low_slots: int
    rig_slots: int
    cap_capacity: float
    cap_recharge: float