# repositories/ship_repository.py
import sqlite3
from typing import List, Optional

SHIP_ATTRIBUTES_MAP = {
    # --- Fitting ---
    48: "cpu", 11: "powergrid", 1132: "calibration",
    14: "high_slots", 13: "mid_slots", 12: "low_slots", 1137: "rig_slots",
    
    # --- Capacitor ---
    482: "cap_capacity", 55: "cap_recharge",
    
    # --- Struktur (Hull) ---
    9: "hull_hp", 38: "cargo_capacity", 4: "mass",
    109: "hull_em_res", 110: "hull_therm_res", 111: "hull_kin_res", 113: "hull_expl_res",
    
    # --- Panzerung (Armor) --- KORRIGIERTE REIHENFOLGE!
    265: "armor_hp",
    267: "armor_em_res", 
    270: "armor_therm_res", # ID 270 ist Therm
    269: "armor_kin_res", 
    268: "armor_expl_res",  # ID 268 ist Expl

    # --- Schilde (Shield) --- KORRIGIERTE REIHENFOLGE!
    263: "shield_hp",
    271: "shield_em_res", 
    274: "shield_therm_res", # ID 274 ist Therm
    273: "shield_kin_res", 
    272: "shield_expl_res"   # ID 272 ist Expl
}

# Liste aller IDs, die Resistenzen (Resonance) sind und umgerechnet werden müssen
RESIST_IDS = [
    109, 110, 111, 113,   # Hull
    267, 268, 269, 270,   # Armor
    271, 272, 273, 274    # Shield
]

def list_ships(db: sqlite3.Connection, search: Optional[str] = None) -> List[dict]:
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
    return [dict(row) for row in cursor.fetchall()]

def get_full_attributes(db: sqlite3.Connection, ship_id: int) -> dict:
    target_ids = tuple(SHIP_ATTRIBUTES_MAP.keys())
    query = f"SELECT attributeID, value FROM dgmtypeattribs WHERE typeID = ? AND attributeID IN {target_ids}"
    
    cursor = db.cursor()
    cursor.execute(query, (ship_id,))
    rows = cursor.fetchall()
    
    results = {name: 0.0 for name in SHIP_ATTRIBUTES_MAP.values()}
    
    for row in rows:
        attr_id = row["attributeID"]
        attr_name = SHIP_ATTRIBUTES_MAP.get(attr_id)
        
        if attr_name:
            val = row["value"]
            
            # 1. Resistenzen umrechnen: (1 - Resonance) * 100
            if attr_id in RESIST_IDS:
                results[attr_name] = round((1 - val) * 100, 1)
            
            # 2. Ganzzahlen
            elif any(x in attr_name for x in ["slots", "calibration", "hp"]):
                results[attr_name] = int(val)
            
            # 3. Standard
            else:
                results[attr_name] = val
                
    return results