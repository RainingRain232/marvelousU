// Status effect combo definitions — when two status effects combine, trigger a bonus effect
import type { StatusEffect } from "@rpg/state/RPGState";

export interface StatusCombo {
  /** Status types that trigger combo (both must be present) */
  required: [StatusEffect["type"], StatusEffect["type"]];
  /** Name of combo for battle log */
  name: string;
  /** Effect of combo */
  effect:
    | { type: "stun"; duration: number }
    | { type: "burst_damage"; multiplier: number }
    | { type: "freeze"; duration: number };
}

export const STATUS_COMBOS: StatusCombo[] = [
  {
    required: ["wet", "stun"], // Wet + Lightning shock = Shocked
    name: "Shocked",
    effect: { type: "stun", duration: 2 },
  },
  {
    required: ["poison", "regen"], // Poison + Fire = Explosion
    name: "Explosion",
    effect: { type: "burst_damage", multiplier: 2.0 },
  },
  {
    required: ["slow", "slow"], // Slow + Cold = Frozen
    name: "Frozen",
    effect: { type: "freeze", duration: 1 },
  },
];

/** Check if adding a new status triggers a combo. Returns combo if found. */
export function checkStatusCombo(
  existingEffects: StatusEffect[],
  newType: StatusEffect["type"],
): StatusCombo | null {
  for (const combo of STATUS_COMBOS) {
    const [a, b] = combo.required;
    if (
      (newType === a && existingEffects.some(e => e.type === b)) ||
      (newType === b && existingEffects.some(e => e.type === a))
    ) {
      return combo;
    }
  }
  return null;
}
