// ---------------------------------------------------------------------------
// Rift Wizard shrine and spell circle definitions
// ---------------------------------------------------------------------------

import { SpellSchool } from "../state/RiftWizardState";

// ---------------------------------------------------------------------------
// Shrine definitions (for reference / tooltip display)
// ---------------------------------------------------------------------------

export interface ShrineDef {
  school: SpellSchool;
  effect: "damage" | "range" | "charges" | "aoe" | "bounces";
  label: string;
  description: string;
}

export const SHRINE_LABELS: Record<string, string> = {
  damage: "Power Shrine",
  range: "Reach Shrine",
  charges: "Abundance Shrine",
  aoe: "Blast Shrine",
  bounces: "Storm Shrine",
};

export function getShrineDescription(
  school: SpellSchool,
  effect: string,
  magnitude: number,
): string {
  const schoolName = school.charAt(0).toUpperCase() + school.slice(1);
  switch (effect) {
    case "damage":
      return `${schoolName} ${SHRINE_LABELS[effect]}: +${magnitude * 5} damage to first ${schoolName} spell`;
    case "range":
      return `${schoolName} ${SHRINE_LABELS[effect]}: +${magnitude} range to first ${schoolName} spell`;
    case "charges":
      return `${schoolName} ${SHRINE_LABELS[effect]}: +${magnitude * 2} charges to first ${schoolName} spell`;
    case "aoe":
      return `${schoolName} ${SHRINE_LABELS[effect]}: +${magnitude} AoE radius to first ${schoolName} spell`;
    case "bounces":
      return `${schoolName} ${SHRINE_LABELS[effect]}: +${magnitude} bounces to first ${schoolName} spell`;
    default:
      return "Unknown shrine";
  }
}

// ---------------------------------------------------------------------------
// Spell circle descriptions
// ---------------------------------------------------------------------------

export function getSpellCircleDescription(school: SpellSchool): string {
  const schoolName = school.charAt(0).toUpperCase() + school.slice(1);
  return `${schoolName} Circle: Stand here while in the Spell Shop to reduce ${schoolName} spell costs by 1 SP.`;
}

// ---------------------------------------------------------------------------
// School colors (for rendering)
// ---------------------------------------------------------------------------

export const SCHOOL_COLORS: Record<SpellSchool, number> = {
  [SpellSchool.FIRE]: 0xff4400,
  [SpellSchool.ICE]: 0x44bbff,
  [SpellSchool.LIGHTNING]: 0xffdd00,
  [SpellSchool.ARCANE]: 0xaa44ff,
  [SpellSchool.NATURE]: 0x44cc44,
  [SpellSchool.DARK]: 0x666666,
  [SpellSchool.HOLY]: 0xffffaa,
};
