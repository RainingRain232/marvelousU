// ---------------------------------------------------------------------------
// Round Table – Potion Definitions
// ---------------------------------------------------------------------------

import { PotionDef } from "../types";

export const POTION_DEFS: PotionDef[] = [
  { id: "health_potion", name: "Health Potion", description: "Heal 30 HP.", rarity: "common" },
  { id: "block_potion", name: "Block Potion", description: "Gain 12 Block.", rarity: "common" },
  { id: "energy_potion", name: "Energy Potion", description: "Gain 2 Energy.", rarity: "common" },
  { id: "strength_potion", name: "Strength Potion", description: "Gain 2 Strength.", rarity: "common" },
  { id: "dexterity_potion", name: "Dexterity Potion", description: "Gain 2 Dexterity.", rarity: "common" },
  { id: "fire_potion", name: "Fire Potion", description: "Deal 20 damage to ALL enemies.", rarity: "uncommon" },
  { id: "poison_potion", name: "Poison Potion", description: "Apply 6 Poison to an enemy.", rarity: "uncommon" },
  { id: "weak_potion", name: "Weak Potion", description: "Apply 3 Weak to an enemy.", rarity: "uncommon" },
  { id: "fear_potion", name: "Fear Potion", description: "Apply 3 Vulnerable to an enemy.", rarity: "uncommon" },
  { id: "draw_potion", name: "Draw Potion", description: "Draw 3 cards.", rarity: "uncommon" },
  { id: "fairy_potion", name: "Fairy in a Bottle", description: "Heal 30% Max HP when you die (consumed automatically).", rarity: "rare" },
  { id: "elixir", name: "Elixir", description: "Gain 2 Energy. Draw 2 cards.", rarity: "rare" },
];

export const POTION_MAP: Map<string, PotionDef> = new Map();
for (const p of POTION_DEFS) POTION_MAP.set(p.id, p);

export function getPotionDef(id: string): PotionDef {
  const def = POTION_MAP.get(id);
  if (!def) throw new Error(`Unknown potion: ${id}`);
  return def;
}

export function getRandomPotion(rng: () => number): PotionDef {
  const roll = rng();
  let pool: PotionDef[];
  if (roll < 0.6) pool = POTION_DEFS.filter(p => p.rarity === "common");
  else if (roll < 0.9) pool = POTION_DEFS.filter(p => p.rarity === "uncommon");
  else pool = POTION_DEFS.filter(p => p.rarity === "rare");
  return pool[Math.floor(rng() * pool.length)];
}
