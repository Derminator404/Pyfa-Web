import os
import json
from eos.const.eve import AttrId

from eos.data_handler.json_data_handler import JsonDataHandler
from eos.cache_handler.json_cache_handler import JsonCacheHandler
from eos.source.manager import SourceManager
from eos.item.character import Character
from eos.item.skill import Skill
from eos.item.ship import Ship
from eos.fit import Fit

from eos.item.module import ModuleLow, ModuleMid, ModuleHigh, Module
from eos.item.charge import Charge
from eos.effect_status import State

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "staticdata")
CACHE_FILE = os.path.join(BASE_DIR, "eos_tq_cache.json.bz2")

class EosSimulator:
    def __init__(self):
        print("[Simulator] Initialisiere EOS Engine...")
        self.data_handler = JsonDataHandler(DATA_PATH)
        self.cache_handler = JsonCacheHandler(CACHE_FILE)
        SourceManager.add('tq', self.data_handler, self.cache_handler, make_default=True)
        
        print("[Simulator] Lade Skill-Liste (All V)...")
        self.all_v_skill_ids = []
        self._preload_skills()
        
        self.all_modules = []
        self._build_module_list()

    def _preload_skills(self):
        skill_groups = set()
        for row in self.data_handler.get_evegroups():
            if str(row.get('categoryID')).split('.')[0] == '16':
                skill_groups.add(row.get('groupID'))

        for row in self.data_handler.get_evetypes():
            if row.get('groupID') in skill_groups and row.get('typeID'):
                self.all_v_skill_ids.append(int(row.get('typeID')))
        print(f"[Simulator] {len(self.all_v_skill_ids)} Skill-IDs erfolgreich vorgeladen.")

    def _build_module_list(self):
        print("[Simulator] Scanne EVE Datenbank nach Modulen (SDE Rekursiv-Suche)...")
        
        # --- HILFSFUNKTION FÜR NAMEN ---
        def get_name(row_data, fallback="Unbekannt"):
            val = row_data.get('name', row_data.get('typeName', row_data.get('groupName')))
            if isinstance(val, dict):
                return val.get('en', val.get('de', fallback))
            if isinstance(val, str) and val.strip():
                return val
            return fallback

        # 1. Validierte Gruppen laden
        valid_groups = {}
        for row in self.data_handler.get_evegroups():
            cat_id = str(row.get('categoryID', '')).split('.')[0]
            if cat_id in ('7', '87'):
                valid_groups[int(row.get('groupID', 0))] = get_name(row, 'Hardware')

        print(f"[Simulator] {len(valid_groups)} Modul-Gruppen gefunden.")

        # 2. Rekursive Slot-Suche in typedogma.json
        slot_map = {}
        typedogma_file = os.path.join(DATA_PATH, "fsd_built", "typedogma.json")
        
        if os.path.exists(typedogma_file):
            print(f"[Simulator] Lese Slot-Zuweisungen aus {typedogma_file}...")
            with open(typedogma_file, 'r', encoding='utf-8') as f:
                typedogma_data = json.load(f)
                
            # Wenn es eine Liste ist, machen wir ein Dictionary daraus
            if isinstance(typedogma_data, list):
                typedogma_data = {str(item.get('typeID', i)): item for i, item in enumerate(typedogma_data)}

            # Die unzerstörbare Such-Funktion
            def find_slot(obj):
                if isinstance(obj, dict):
                    # Check Effect-ID
                    eid = obj.get('effectID', obj.get('effect_id', obj.get('effectId')))
                    if eid is not None:
                        try:
                            eid = int(eid)
                            if eid == 12: return 'high'
                            if eid == 13: return 'mid'
                            if eid == 11: return 'low'
                            if eid == 2663: return 'rig'
                        except: pass

                    # Check Attribute-ID
                    aid = obj.get('attributeID', obj.get('attribute_id', obj.get('attributeId')))
                    if aid is not None:
                        try:
                            aid = int(aid)
                            val = obj.get('value', obj.get('valueFloat', obj.get('valueInt', 0)))
                            if float(val) > 0:
                                if aid == 137: return 'high'
                                if aid == 138: return 'mid'
                                if aid == 139: return 'low'
                                if aid == 1137: return 'rig'
                        except: pass

                    # Gehe eine Ebene tiefer
                    for v in obj.values():
                        res = find_slot(v)
                        if res: return res

                elif isinstance(obj, list):
                    for item in obj:
                        res = find_slot(item)
                        if res: return res
                return None

            # Durchsuche alle Items in der Datei
            for tid_str, dogma_data in typedogma_data.items():
                try:
                    tid = int(tid_str)
                    slot = find_slot(dogma_data)
                    if slot:
                        slot_map[tid] = slot
                except Exception:
                    pass
        else:
            print(f"[Simulator] WARNUNG: Datei {typedogma_file} nicht gefunden!")

        print(f"[Simulator] {len(slot_map)} Slot-Zuweisungen gefunden. Mappe Items...")

        # 3. Items aus eveTypes abgleichen und in die Liste packen
        for row in self.data_handler.get_evetypes():
            if not row.get('published') or not row.get('marketGroupID'):
                continue
                
            group_id = int(row.get('groupID', 0))
            if group_id not in valid_groups:
                continue
                
            type_id = int(row.get('typeID', 0))
            slot_type = slot_map.get(type_id)
            
            if slot_type:
                name = get_name(row, 'Unbekannt')
                if name != "Unbekannt" and valid_groups[group_id] != "Hardware":
                    self.all_modules.append({
                        "id": type_id,
                        "name": name,
                        "type": slot_type,
                        "group": valid_groups[group_id]
                    })

        # 4. Saubere Sortierung
        slot_order = {"high": 1, "mid": 2, "low": 3, "rig": 4}
        self.all_modules.sort(key=lambda x: (slot_order.get(x['type'], 5), x['group'], x['name']))
        
        print(f"[Simulator] >>> ERFOLG: {len(self.all_modules)} Module geladen und einsatzbereit! <<<")

    def simulate(self, ship_id: int, low_slots: list, mid_slots: list, high_slots: list, rig_slots: list, charges: list):
        fit = Fit()
        
        try:
            fit.ship = Ship(ship_id)
        except Exception as e:
            return {"is_valid": False, "errors": f"Ungültiges Schiff (ID {ship_id}): {str(e)}", "stats": None}
        
        for skill_id in self.all_v_skill_ids:
            fit.skills.add(Skill(skill_id, level=5))

        for item_id in low_slots:
            try: fit.modules.low.equip(ModuleLow(item_id, state=State.online))
            except: pass
            
        for item_id in mid_slots:
            try: fit.modules.mid.equip(ModuleMid(item_id, state=State.active))
            except: pass
            
        for i, item_id in enumerate(high_slots):
            try:
                if i < len(charges) and charges[i]:
                    fit.modules.high.equip(ModuleHigh(item_id, state=State.active, charge=Charge(charges[i])))
                else:
                    fit.modules.high.equip(ModuleHigh(item_id, state=State.active))
            except: pass

        for item_id in rig_slots:
            try: fit.modules.rig.equip(Module(item_id, state=State.online))
            except: pass

        validation_errors = None
        try:
            fit.validate()
        except Exception as e:
            validation_errors = str(e)

        from eos.stats_container import DmgProfile
        ehp = fit.stats.get_ehp(DmgProfile(em=25, thermal=25, kinetic=25, explosive=25)).total
        dps = fit.stats.get_dps(reload=False).total

        try:
            max_speed = fit.ship.attrs[AttrId.maxVelocity]
            mass = fit.ship.attrs[AttrId.mass]
        except (AttributeError, KeyError):
            max_speed = 0.0
            mass = 0.0

        drone_bw_used = getattr(fit.stats.drone_bandwidth, 'used', 0.0)
        drone_bw_total = getattr(fit.stats.drone_bandwidth, 'total', getattr(fit.stats.drone_bandwidth, 'output', 0.0))
        
        dronebay_used = getattr(fit.stats.dronebay, 'used', 0.0)
        dronebay_total = getattr(fit.stats.dronebay, 'total', getattr(fit.stats.dronebay, 'output', 0.0))

        res = fit.stats.resists
        def format_resists(layer):
            return {
                "em": round(layer.em * 100, 1),
                "thermal": round(layer.thermal * 100, 1),
                "kinetic": round(layer.kinetic * 100, 1),
                "explosive": round(layer.explosive * 100, 1)
            }

        return {
            "is_valid": validation_errors is None,
            "errors": validation_errors,
            "stats": {
                "powergrid_used": round(getattr(fit.stats.powergrid, 'used', 0.0), 1),
                "powergrid_total": round(getattr(fit.stats.powergrid, 'output', getattr(fit.stats.powergrid, 'total', 0.0)), 1),
                "cpu_used": round(getattr(fit.stats.cpu, 'used', 0.0), 1),
                "cpu_total": round(getattr(fit.stats.cpu, 'output', getattr(fit.stats.cpu, 'total', 0.0)), 1),
                "drone_bandwidth_used": round(drone_bw_used, 1),
                "drone_bandwidth_total": round(drone_bw_total, 1),
                "dronebay_used": round(dronebay_used, 1),
                "dronebay_total": round(dronebay_total, 1),
                "ehp": round(ehp, 2),
                "dps": round(dps, 2),
                "resists": {
                    "shield": format_resists(res.shield),
                    "armor": format_resists(res.armor),
                    "hull": format_resists(res.hull)
                },
                "max_velocity": round(max_speed, 1),
                "mass": round(mass, 1),
                "align_time": round(fit.stats.align_time, 2) if fit.stats.align_time else 0.0,
                "agility_factor": round(fit.stats.agility_factor, 3) if fit.stats.agility_factor else 0.0
            }
        }

eos_sim = EosSimulator()