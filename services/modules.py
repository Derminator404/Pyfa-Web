import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
STATIC_DATA = os.path.join(BASE_DIR, "staticdata")

def build_module_list():
    print("[ModuleLoader] Initialisiere Modul-Scanner (Hierarchie & Markt-Modus)...")
    modules = []
    
    db_path = os.path.join(DATA_DIR, "eve.db")
    if not os.path.exists(db_path):
        db_path = os.path.join(STATIC_DATA, "eve.db")
        
    if not os.path.exists(db_path):
        print(f"[ModuleLoader] FEHLER: eve.db nicht gefunden!")
        return modules

    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row 
        cursor = conn.cursor()
        
        # 1. Alle Gruppen laden (für Fallbacks)
        cursor.execute("SELECT * FROM invgroups")
        valid_groups = {}
        target_gids = set()
        for row in cursor:
            keys = row.keys()
            gid = row['groupID']
            name = row['groupName'] if 'groupName' in keys else row['name'] if 'name' in keys else f"Group {gid}"
            valid_groups[gid] = name
            # Wir wollen nur Hardware (7) und Rigs (87)
            if row['categoryID'] in (7, 87):
                target_gids.add(gid)

        # 2. Marktgruppen laden und den Stammbaum (Hierarchie) aufbauen!
        cursor.execute("SELECT * FROM invmarketgroups")
        market_groups = {}
        for row in cursor:
            keys = row.keys()
            mgid = row['marketGroupID']
            parent = row['parentGroupID'] if 'parentGroupID' in keys else None
            name = row['marketGroupName'] if 'marketGroupName' in keys else row['name'] if 'name' in keys else f"Market Group {mgid}"
            market_groups[mgid] = {'name': name, 'parent': parent}
            
        # Wir bauen für jedes Item den Pfad (z.B. "Hull & Armor > Armor Hardeners")
        market_paths = {}
        for mgid in market_groups:
            path = []
            current = mgid
            while current:
                if current in market_groups:
                    node_name = market_groups[current]['name']
                    # Die obersten Kategorien verstecken wir, damit das Menü nicht zu lang wird
                    if node_name not in ("Ship Equipment", "Ship Modifications", "Standard", "Advanced", "Faction"):
                        path.insert(0, node_name)
                    current = market_groups[current]['parent']
                else:
                    break
            market_paths[mgid] = " > ".join(path) if path else "Unsortiert"

        # 3. Slot-Daten
        cursor.execute("SELECT * FROM dgmtypeeffects WHERE effectID IN (11, 12, 13, 2663)")
        effects = {row['typeID']: row['effectID'] for row in cursor}
        
        cursor.execute("SELECT * FROM dgmtypeattribs WHERE attributeID IN (137, 138, 139, 1137)")
        attrs = {}
        for row in cursor:
            keys = row.keys()
            val = None
            if 'valueFloat' in keys and row['valueFloat'] is not None:
                val = row['valueFloat']
            elif 'valueInt' in keys and row['valueInt'] is not None:
                val = row['valueInt']
            elif 'value' in keys and row['value'] is not None:
                val = row['value']
                
            if val and float(val) > 0:
                attrs[row['typeID']] = row['attributeID']

        def guess_slot_by_group(gn):
            gn = gn.lower()
            if 'rig' in gn: return 'rig'
            if any(x in gn for x in ['weapon', 'laser', 'launcher', 'turret', 'smartbomb', 'nosferatu', 'cloak', 'probe', 'mining', 'link', 'tractor']): return 'high'
            if any(x in gn for x in ['shield', 'propulsion', 'afterburner', 'microwarp', 'web', 'scram', 'disruptor', 'battery', 'analyzer', 'scanner', 'painter']): return 'mid'
            if any(x in gn for x in ['armor', 'hull', 'damage control', 'overdrive', 'magnetic', 'heat sink', 'gyro', 'nanofiber', 'plating', 'relay']): return 'low'
            return None

        # 4. Items zusammenbauen
        cursor.execute("SELECT * FROM invtypes WHERE published = 1 AND marketGroupID IS NOT NULL")
        
        for row in cursor:
            keys = row.keys()
            gid = row['groupID']
            if gid not in target_gids:
                continue
                
            tid = row['typeID']
            mgid = row['marketGroupID']
            internal_group = valid_groups.get(gid, "Unknown")
            
            # HIER WEISEN WIR DEN SCHÖNEN EVE-MARKT-PFAD ZU!
            market_group_name = market_paths.get(mgid, internal_group)
            
            slot = None
            eid = effects.get(tid)
            if eid == 12: slot = 'high'
            elif eid == 13: slot = 'mid'
            elif eid == 11: slot = 'low'
            elif eid == 2663: slot = 'rig'
            else:
                aid = attrs.get(tid)
                if aid == 137: slot = 'high'
                elif aid == 138: slot = 'mid'
                elif aid == 139: slot = 'low'
                elif aid == 1137: slot = 'rig'
                
            if not slot:
                slot = guess_slot_by_group(internal_group)
                
            if slot:
                name = row['typeName'] if 'typeName' in keys else row['name'] if 'name' in keys else f"Item {tid}"
                modules.append({
                    "id": tid,
                    "name": name,
                    "type": slot,
                    "group": market_group_name
                })
        
        conn.close()
        
        slot_order = {"high": 1, "mid": 2, "low": 3, "rig": 4}
        modules.sort(key=lambda x: (slot_order.get(x['type'], 5), x['group'], x['name']))
        
        print(f"[ModuleLoader] >>> ERFOLG: {len(modules)} Module in EVE-Marktgruppen geladen! <<<")
        return modules
        
    except Exception as e:
        print(f"[ModuleLoader] SQLite Fehler: {e}")
        return []

MODULE_CACHE = build_module_list()