// ---------------------------------------------------------------------------
// Coven mode — creature definitions
// ---------------------------------------------------------------------------

import type { IngredientId, CovenTerrain } from "../state/CovenState";

export interface CreatureDef {
  type: string;
  name: string;
  hp: number;
  damage: number;
  speed: number;
  terrains: CovenTerrain[];
  nocturnalOnly: boolean;
  loot: IngredientId[];
  description: string;
  color: number;
  dangerLevel: number; // 1-5
}

export const CREATURE_DEFS: CreatureDef[] = [
  // Danger 1: learnable encounters (low damage, manageable with fire bolt)
  { type: "wolf", name: "Shadow Wolf", hp: 22, damage: 8, speed: 2, terrains: ["deep_woods", "clearing"], nocturnalOnly: false, loot: ["wolf_pelt"], description: "Lean and hungry, eyes gleaming", color: 0x666655, dangerLevel: 1 },
  { type: "fae_trickster", name: "Fae Trickster", hp: 15, damage: 4, speed: 3, terrains: ["clearing", "ley_line"], nocturnalOnly: false, loot: ["fairy_cap", "star_fragment"], description: "Laughing, dancing, stealing your ingredients", color: 0xffaadd, dangerLevel: 1 },
  { type: "will_o_wisp", name: "Will-o'-Wisp", hp: 12, damage: 6, speed: 3, terrains: ["swamp", "graveyard"], nocturnalOnly: true, loot: ["ghostshroom"], description: "A bobbing flame that leads you astray", color: 0x88ffaa, dangerLevel: 1 },
  // Danger 2: moderate challenge
  { type: "wolf_pack", name: "Wolf Pack", hp: 50, damage: 15, speed: 2, terrains: ["deep_woods"], nocturnalOnly: true, loot: ["wolf_pelt", "wolf_pelt"], description: "Three wolves hunting as one", color: 0x555544, dangerLevel: 2 },
  { type: "bog_beast", name: "Bog Beast", hp: 45, damage: 12, speed: 1, terrains: ["swamp"], nocturnalOnly: false, loot: ["marsh_reed", "snake_venom"], description: "Rising from the murk, dripping and silent", color: 0x3a4a2a, dangerLevel: 2 },
  { type: "cave_spider", name: "Giant Spider", hp: 32, damage: 10, speed: 2, terrains: ["cave", "ruins"], nocturnalOnly: false, loot: ["spider_silk", "spider_silk"], description: "Webs strong as rope, fangs like daggers", color: 0x3a2a1a, dangerLevel: 2 },
  // Danger 3: serious threats (need potions/better spells)
  { type: "wraith", name: "Wraith", hp: 40, damage: 16, speed: 1, terrains: ["graveyard", "ruins"], nocturnalOnly: true, loot: ["wraith_dust", "shadow_essence"], description: "A tormented spirit, cold and furious", color: 0x8899aa, dangerLevel: 3 },
  { type: "dark_knight", name: "Fallen Knight", hp: 60, damage: 18, speed: 1, terrains: ["ruins", "graveyard"], nocturnalOnly: true, loot: ["iron_filings", "ancient_bone"], description: "Armor blackened, oath broken, still fighting", color: 0x3a3a4a, dangerLevel: 3 },
  // Danger 4-5: bosses (need preparation)
  { type: "wight", name: "Barrow-Wight", hp: 75, damage: 22, speed: 1, terrains: ["graveyard"], nocturnalOnly: true, loot: ["ancient_bone", "shadow_essence", "wraith_dust"], description: "An ancient king who refuses to rest", color: 0x4a5a6a, dangerLevel: 4 },
  { type: "drake", name: "Young Drake", hp: 90, damage: 28, speed: 1, terrains: ["cave"], nocturnalOnly: false, loot: ["dragon_scale", "dragon_scale", "sulfur"], description: "Not yet a dragon, but deadly nonetheless", color: 0xcc4422, dangerLevel: 5 },
];

export function getCreatureDef(type: string): CreatureDef | undefined {
  return CREATURE_DEFS.find((c) => c.type === type);
}

export function getCreaturesForTerrain(terrain: CovenTerrain, isNight: boolean): CreatureDef[] {
  return CREATURE_DEFS.filter((c) => {
    if (!c.terrains.includes(terrain)) return false;
    if (c.nocturnalOnly && !isNight) return false;
    return true;
  });
}
