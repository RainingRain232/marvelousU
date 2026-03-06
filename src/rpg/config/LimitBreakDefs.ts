// Limit break definitions — ultimate abilities charged by combat
import { UnitType, RPGElementType } from "@/types";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";

export interface LimitBreakDef {
  name: string;
  description: string;
  /** "all_enemies", "all_allies", "self_and_allies" */
  targetMode: "all_enemies" | "all_allies" | "self_and_allies";
  /** ATK multiplier for damage, or heal multiplier */
  multiplier: number;
  /** Optional status effect applied */
  statusEffect?: { type: "stun" | "regen" | "shield"; duration: number; magnitude: number };
  /** Element of the attack */
  element: RPGElementType;
  isHeal: boolean;
}

// Category based on unit characteristics
function _getUnitCategory(unitType: UnitType): "melee" | "ranged" | "mage" | "healer" | "tank" {
  const def = UNIT_DEFINITIONS[unitType];
  if (!def) return "melee";
  if (def.isHealer) return "healer";
  if (def.element === "fire" || def.element === "cold" || def.element === "lightning" || def.element === "summon") return "mage";
  if (def.range > 1 && !def.element) return "ranged";
  // Tank detection: high HP relative to ATK
  if (def.hp > def.atk * 5) return "tank";
  return "melee";
}

const LIMIT_BREAKS: Record<string, LimitBreakDef> = {
  melee: {
    name: "Blade Storm",
    description: "Devastating attack striking all enemies",
    targetMode: "all_enemies",
    multiplier: 2.0,
    element: RPGElementType.PHYSICAL,
    isHeal: false,
  },
  ranged: {
    name: "Arrow Rain",
    description: "A hail of arrows strikes all foes",
    targetMode: "all_enemies",
    multiplier: 1.5,
    element: RPGElementType.PHYSICAL,
    isHeal: false,
  },
  mage: {
    name: "Arcane Nova",
    description: "Unleashes devastating magical energy",
    targetMode: "all_enemies",
    multiplier: 3.0,
    element: RPGElementType.FIRE, // overridden by unit element at runtime
    isHeal: false,
  },
  healer: {
    name: "Divine Grace",
    description: "Fully heals all allies and cleanses status effects",
    targetMode: "all_allies",
    multiplier: 999, // full heal
    element: RPGElementType.HOLY,
    isHeal: true,
  },
  tank: {
    name: "Fortress",
    description: "Grants a powerful shield to all allies",
    targetMode: "self_and_allies",
    multiplier: 0,
    statusEffect: { type: "shield", duration: 3, magnitude: 100 },
    element: RPGElementType.PHYSICAL,
    isHeal: false,
  },
};

export function getLimitBreak(unitType: UnitType): LimitBreakDef {
  const cat = _getUnitCategory(unitType);
  const lb = { ...LIMIT_BREAKS[cat] };

  // Override element for mages
  if (cat === "mage") {
    const def = UNIT_DEFINITIONS[unitType];
    if (def?.element === "cold") lb.element = RPGElementType.COLD;
    else if (def?.element === "lightning") lb.element = RPGElementType.LIGHTNING;
    else if (def?.element === "summon") lb.element = RPGElementType.DARK;
  }

  return lb;
}

// Limit gauge constants
export const LIMIT_GAUGE_MAX = 100;
export const LIMIT_GAIN_ON_DAMAGE_TAKEN = 15;
export const LIMIT_GAIN_ON_DAMAGE_DEALT = 10;
export const LIMIT_GAIN_ON_DEFEND = 5;
