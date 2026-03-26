import os
from eos.const.eve import AttrId

from eos.data_handler.json_data_handler import JsonDataHandler
from eos.cache_handler.json_cache_handler import JsonCacheHandler
from eos.source.manager import SourceManager
from eos.item.character import Character
from eos.item.skill import Skill
from eos.item.ship import Ship
from eos.fit import Fit

# Wir nutzen hier Module für Rigs, da dies die EVE-Effekte korrekt auslöst
from eos.item.module import ModuleLow, ModuleMid, ModuleHigh, Module
from eos.item.rig import Rig
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

    def _preload_skills(self):
        skill_groups = set()
        for row in self.data_handler.get_evegroups():
            if str(row.get('categoryID')).split('.')[0] == '16':
                skill_groups.add(row.get('groupID'))

        for row in self.data_handler.get_evetypes():
            if row.get('groupID') in skill_groups and row.get('typeID'):
                self.all_v_skill_ids.append(int(row.get('typeID')))
        print(f"[Simulator] {len(self.all_v_skill_ids)} Skill-IDs erfolgreich vorgeladen.")

    def simulate(self, ship_id: int, low_slots: list, mid_slots: list, high_slots: list, rig_slots: list, charges: list):
        fit = Fit()
        
        try:
            fit.ship = Ship(ship_id)
        except Exception as e:
            return {"is_valid": False, "errors": f"Ungültiges Schiff (ID {ship_id}): {str(e)}", "stats": None}
        
        for skill_id in self.all_v_skill_ids:
            fit.skills.add(Skill(skill_id, level=5))

        # --- SICHERE STATE UMWANDLUNG ---
        def get_state_enum(val):
            try: val = int(val)
            except: val = 3
            if val == 1: return State.offline
            if val == 2: return State.online
            if val == 3: return State.active
            if val == 4: return State.overload
            return State.active

        # --- 1. LOGIK FÜR NORMALE MODULE (LOW, MID) ---
        def equip_modules(rack, module_class, slots_data, rack_name):
            for item in slots_data:
                if not item: continue
                try:
                    # Frontend sendet Dictionaries mit ID und State
                    if isinstance(item, dict):
                        item_id = int(item.get("id", 0))
                        state_val = int(item.get("state", 3))
                    else:
                        item_id = int(item)
                        state_val = 3
                    
                    if item_id > 0:
                        mod = module_class(item_id, state=get_state_enum(state_val))
                        rack.equip(mod)
                except Exception as e:
                    print(f"[Simulator] Fehler beim Fitten in {rack_name}: {e}")

        equip_modules(fit.modules.low, ModuleLow, low_slots, "LOW SLOTS")
        equip_modules(fit.modules.mid, ModuleMid, mid_slots, "MID SLOTS")

        # --- 2. EIGENE LOGIK FÜR RIGS (OHNE STATE) ---
        print("[Simulator] Bestücke RIG SLOTS...")
        for item in rig_slots:
            if not item: continue
            try:
                # Da das Frontend weiterhin ein Dict {id, state} sendet, extrahieren wir nur die ID!
                item_id = int(item.get("id", 0)) if isinstance(item, dict) else int(item)
                
                if item_id > 0:
                    rig_item = Rig(item_id) # <- Kein State! Ein Rig ist einfach nur ein Rig.
                    
                    # Dynamisches Einfügen, da fit.rigs je nach EOS-Version ein Rack oder ItemSet ist
                    if hasattr(fit.rigs, 'equip'):
                        fit.rigs.equip(rig_item)
                    elif hasattr(fit.rigs, 'add'):
                        fit.rigs.add(rig_item)
                    elif hasattr(fit.rigs, 'append'):
                        fit.rigs.append(rig_item)
                        
                    print(f"[Simulator] -> RIG Slot: ID {item_id} erfolgreich eingebaut.")
            except Exception as e:
                print(f"[Simulator] -> FEHLER beim Fitten eines Rigs: {e}")

        # --- 3. LOGIK FÜR HIGH SLOTS (MIT CHARGES) ---
        print("[Simulator] Bestücke HIGH SLOTS...")
        for i, item in enumerate(high_slots):
            if not item: continue
            try:
                if isinstance(item, dict):
                    item_id = int(item.get("id", 0))
                    state_val = int(item.get("state", 3))
                else:
                    item_id = int(item)
                    state_val = 3
                
                if item_id > 0:
                    mod = ModuleHigh(item_id, state=get_state_enum(state_val))
                    if i < len(charges) and charges[i]:
                        mod.charge = Charge(charges[i])
                    fit.modules.high.equip(mod)
            except Exception as e:
                print(f"[Simulator] -> FEHLER beim Fitten High Slot: {e}")

        # --- AUTO-HEAL FÜR PASSIVE MODULE ---
        validation_errors = None
        for _ in range(20): 
            try:
                fit.validate()
                validation_errors = None
                break 
            except Exception as e:
                err_str = str(e)
                if "StateErrorData" in err_str:
                    fixed = False
                    if len(e.args) > 0 and isinstance(e.args[0], dict):
                        for mod, restrictions in e.args[0].items():
                            for restr_type, err_data in restrictions.items():
                                if "StateErrorData" in str(type(err_data)) or "allowed_states" in str(err_data):
                                    mod.state = State.online 
                                    fixed = True
                    if not fixed:
                        validation_errors = err_str
                        break
                else:
                    validation_errors = err_str
                    break

        from eos.stats_container import DmgProfile
        ehp = fit.stats.get_ehp(DmgProfile(em=25, thermal=25, kinetic=25, explosive=25)).total
        dps = fit.stats.get_dps(reload=False).total
        
        try: volley = fit.stats.get_volley().total
        except: volley = 0.0

        def get_attr(attr_id, default=0.0):
            try: return float(fit.ship.attrs[attr_id])
            except: return default

        max_speed = get_attr(37)       
        mass = get_attr(4)             
        shield_hp = get_attr(263)      
        armor_hp = get_attr(265)       
        hull_hp = get_attr(9)          
        cargo_capacity = get_attr(38)  

        # --- CAPACITOR LOGIK ---
        cap_capacity = get_attr(482)
        cap_recharge_time_ms = get_attr(55)
        
        peak_recharge = 0.0
        if cap_recharge_time_ms > 0:
            peak_recharge = (2.5 * cap_capacity) / (cap_recharge_time_ms / 1000.0)

        cap_use = 0.0
        cap_depletes_in = 0.0
        cap_stable_fraction = 1.0
        cap_is_stable = True

        try:
            cap_stat = fit.stats.get_capacitor()
            cap_use = getattr(cap_stat, 'total_use', 0.0)
            
            depletes = getattr(cap_stat, 'depletes_in', None)
            if depletes is not None and depletes > 0:
                cap_is_stable = False
                cap_depletes_in = float(depletes)
                cap_stable_fraction = 0.0
            else:
                cap_is_stable = True
                cap_depletes_in = 0.0
                cap_stable_fraction = float(getattr(cap_stat, 'fraction', 1.0))
        except:
            for rack in (fit.modules.high, fit.modules.mid, fit.modules.low):
                for mod in rack:
                    if getattr(mod, 'state', None) in (State.active, State.overload):
                        try:
                            c_need = float(mod.attrs.get(50, 0))
                            dur = float(mod.attrs.get(73, 1000)) / 1000.0
                            if dur > 0: 
                                cap_use += (c_need / dur)
                        except: pass
            
            if cap_use > peak_recharge:
                cap_is_stable = False
                diff = cap_use - peak_recharge
                cap_depletes_in = cap_capacity / diff if diff > 0 else 0
                cap_stable_fraction = 0.0
            else:
                cap_is_stable = True
                cap_depletes_in = 0.0
                cap_stable_fraction = 1.0

        cap_delta = peak_recharge - cap_use

        max_targets = get_attr(98)
        sig_radius = get_attr(552)
        scan_res = get_attr(564)
        sensor_str = max(get_attr(208), get_attr(209), get_attr(210), get_attr(211))
        warp_speed = get_attr(600)
        drone_range = get_attr(1224) / 1000.0 if get_attr(1224) else 0.0
        lock_range = get_attr(76) / 1000.0 if get_attr(76) else 0.0

        shield_recharge_time = get_attr(479)
        passive_shield = (2.5 * shield_hp) / (shield_recharge_time / 1000.0) if shield_recharge_time > 0 else 0.0

        active_shield = 0.0
        active_armor = 0.0
        active_hull = 0.0

        for rack in (fit.modules.high, fit.modules.mid, fit.modules.low):
            for mod in rack:
                st = getattr(mod, 'state', None)
                if st in (State.active, State.overload):
                    try:
                        dur = float(mod.attrs[73]) / 1000.0 
                        if dur > 0:
                            if 68 in mod.attrs: active_shield += float(mod.attrs[68]) / dur  
                            if 84 in mod.attrs: active_armor += float(mod.attrs[84]) / dur   
                            if 83 in mod.attrs: active_hull += float(mod.attrs[83]) / dur    
                    except:
                        pass

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

        def get_states(rack):
            out = []
            for m in rack:
                st = getattr(m, 'state', State.offline)
                try: out.append(st.value)
                except AttributeError: out.append(int(st))
            return out

        return {
            "is_valid": validation_errors is None,
            "errors": validation_errors,
            "module_states": {
                "high": get_states(fit.modules.high),
                "mid": get_states(fit.modules.mid),
                "low": get_states(fit.modules.low),
#                "rig": get_states(fit.rigs) 
            },
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
                "volley": round(volley, 0),
                "shield_hp": round(shield_hp, 0),
                "armor_hp": round(armor_hp, 0),
                "hull_hp": round(hull_hp, 0),
                "passive_shield": round(passive_shield, 1),
                "active_shield": round(active_shield, 1),
                "active_armor": round(active_armor, 1),
                "active_hull": round(active_hull, 1),
                "max_targets": int(max_targets),
                "sig_radius": round(sig_radius, 1),
                "scan_res": round(scan_res, 1),
                "sensor_str": round(sensor_str, 1),
                "warp_speed": round(warp_speed, 2),
                "drone_range": round(drone_range, 1),
                "lock_range": round(lock_range, 1),
                
                "cap_capacity": round(cap_capacity, 1),
                "cap_recharge": round(cap_recharge_time_ms, 1),
                "cap_use": round(cap_use, 1),
                "cap_delta": round(cap_delta, 1), 
                "cap_is_stable": cap_is_stable,
                "cap_depletes_in": round(cap_depletes_in, 1),
                "cap_stable_fraction": round(cap_stable_fraction * 100, 1),

                # --- NEU: CALIBRATION (MODIFICATION POINTS) ---
                "calibration_used": round(getattr(fit.stats.calibration, 'used', 0.0), 1),
                "calibration_total": round(getattr(fit.stats.calibration, 'output', getattr(fit.stats.calibration, 'total', 0.0)), 1),
                
                "cargo_capacity": round(cargo_capacity, 1),
                "max_velocity": round(max_speed, 1),
                "mass": round(mass, 1),
                "resists": {
                    "shield": format_resists(res.shield),
                    "armor": format_resists(res.armor),
                    "hull": format_resists(res.hull)
                },
                "align_time": round(fit.stats.align_time, 2) if fit.stats.align_time else 0.0,
                "agility_factor": round(fit.stats.agility_factor, 3) if fit.stats.agility_factor else 0.0
            }
        }

eos_sim = EosSimulator()