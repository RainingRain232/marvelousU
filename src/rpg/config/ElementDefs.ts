// Element effectiveness matrix for RPG combat
import { RPGElementType, UnitType } from "@/types";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";

// Multiplier: attacker element → defender element
// 1.5 = super effective, 0.5 = resisted, 1.0 = neutral
const EFFECTIVENESS: Record<RPGElementType, Partial<Record<RPGElementType, number>>> = {
  [RPGElementType.FIRE]: {
    [RPGElementType.NATURE]: 1.5,
    [RPGElementType.COLD]: 1.5,
    [RPGElementType.FIRE]: 0.5,
  },
  [RPGElementType.COLD]: {
    [RPGElementType.NATURE]: 1.5,
    [RPGElementType.LIGHTNING]: 1.5,
    [RPGElementType.COLD]: 0.5,
    [RPGElementType.FIRE]: 0.5,
  },
  [RPGElementType.LIGHTNING]: {
    [RPGElementType.COLD]: 1.5,
    [RPGElementType.LIGHTNING]: 0.5,
    [RPGElementType.NATURE]: 0.5,
  },
  [RPGElementType.NATURE]: {
    [RPGElementType.LIGHTNING]: 1.5,
    [RPGElementType.NATURE]: 0.5,
    [RPGElementType.FIRE]: 0.5,
  },
  [RPGElementType.HOLY]: {
    [RPGElementType.DARK]: 1.5,
    [RPGElementType.HOLY]: 0.5,
  },
  [RPGElementType.DARK]: {
    [RPGElementType.HOLY]: 1.5,
    [RPGElementType.DARK]: 0.5,
  },
  [RPGElementType.PHYSICAL]: {},
};

export function getElementEffectiveness(
  attackElement: RPGElementType,
  defenderElement: RPGElementType,
): number {
  return EFFECTIVENESS[attackElement]?.[defenderElement] ?? 1.0;
}

export function getEffectivenessText(multiplier: number): string | null {
  if (multiplier >= 1.5) return "Super effective!";
  if (multiplier <= 0.5) return "Resisted...";
  return null;
}

/** Map unit type to element for RPG combat */
export function getUnitElement(unitType: UnitType): RPGElementType {
  const def = UNIT_DEFINITIONS[unitType];
  if (!def) return RPGElementType.PHYSICAL;
  switch (def.element) {
    case "fire": return RPGElementType.FIRE;
    case "cold": return RPGElementType.COLD;
    case "lightning": return RPGElementType.LIGHTNING;
    case "nature": return RPGElementType.NATURE;
    case "heal": return RPGElementType.HOLY;
    case "summon": return RPGElementType.DARK;
    default: return RPGElementType.PHYSICAL;
  }
}

export const ELEMENT_COLORS: Record<RPGElementType, number> = {
  [RPGElementType.PHYSICAL]: 0xcccccc,
  [RPGElementType.FIRE]: 0xff6633,
  [RPGElementType.COLD]: 0x66ccff,
  [RPGElementType.LIGHTNING]: 0xffff33,
  [RPGElementType.NATURE]: 0x33cc33,
  [RPGElementType.HOLY]: 0xffffcc,
  [RPGElementType.DARK]: 0x9933cc,
};

export const ELEMENT_NAMES: Record<RPGElementType, string> = {
  [RPGElementType.PHYSICAL]: "Physical",
  [RPGElementType.FIRE]: "Fire",
  [RPGElementType.COLD]: "Cold",
  [RPGElementType.LIGHTNING]: "Lightning",
  [RPGElementType.NATURE]: "Nature",
  [RPGElementType.HOLY]: "Holy",
  [RPGElementType.DARK]: "Dark",
};
