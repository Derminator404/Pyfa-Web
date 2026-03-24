import os
from eos.const.eve import AttrId

from eos.data_handler.json_data_handler import JsonDataHandler
from eos.cache_handler.json_cache_handler import JsonCacheHandler
from eos.source.manager import SourceManager
from eos.item.character import Character
from eos.item.skill import Skill
from eos.item.ship import Ship
from eos.fit import Fit

# KORREKTUR: "Module" importiert, damit laden wir die Rigs!
from eos.item.module import Module, ModuleLow, ModuleMid, ModuleHigh
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
        
        # Skills anwenden
        for skill_id in self.all_v_skill_ids:
            fit.skills.add(Skill(skill_id, level=5))

        # Module equippen (mit Try-Except, damit das Tool nicht abstürzt!)
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

        # KORREKTUR: Rigs als generisches "Module" einbauen
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