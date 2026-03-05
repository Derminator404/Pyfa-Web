# repositories/ship_repository.py
import sqlite3
from typing import List, Optional

# Unser Mapping-Dictionary für sauberen Code
SHIP_ATTRIBUTES_MAP = {
    48: "cpu",
    11: "powergrid",
    1132: "calibration",
    14: "high_slots",
    13: "mid_slots",
    12: "low_slots",
    1137: "rig_slots",
    482: "cap_capacity",
    55: "cap_recharge"
}

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
    
    # Standardwerte
    results = {name: 0.0 for name in SHIP_ATTRIBUTES_MAP.values()}
    
    for row in rows:
        attr_name = SHIP_ATTRIBUTES_MAP.get(row["attributeID"])
        if attr_name:
            val = row["value"]
            # Konvertierung zu Int für Slots/Calibration
            results[attr_name] = int(val) if "slots" in attr_name or "calibration" in attr_name else val
            
    return results