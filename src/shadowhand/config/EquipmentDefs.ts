// ---------------------------------------------------------------------------
// Shadowhand mode — equipment definitions
// ---------------------------------------------------------------------------

export type EquipmentSlot = "tool" | "consumable" | "armor" | "gadget";

export interface EquipmentDef {
  id: string;
  name: string;
  desc: string;
  slot: EquipmentSlot;
  cost: number;
  uses: number; // -1 = infinite
  tier: number; // minimum guild tier to purchase
  effect: EquipmentEffect;
}

export type EquipmentEffect =
  | { type: "lockpick"; speedMult: number; noiseMult: number }
  | { type: "smoke_bomb"; radius: number; duration: number }
  | { type: "sleep_dart"; range: number; duration: number }
  | { type: "grappling_hook"; range: number }
  | { type: "disguise"; duration: number }
  | { type: "acid_vial"; lockBreak: boolean; wallBreak: boolean }
  | { type: "dark_cloak"; detectionMult: number }
  | { type: "soft_boots"; noiseMult: number }
  | { type: "rope"; escapeSpeed: number }
  | { type: "caltrops"; slowDuration: number; radius: number }
  | { type: "flash_powder"; stunDuration: number; radius: number }
  | { type: "skeleton_key"; autoOpen: boolean };

export const EQUIPMENT_DEFS: EquipmentDef[] = [
  // Tools
  {
    id: "basic_lockpick",
    name: "Basic Lockpick",
    desc: "A simple set of picks. Slow but quiet.",
    slot: "tool",
    cost: 20,
    uses: 5,
    tier: 0,
    effect: { type: "lockpick", speedMult: 1.0, noiseMult: 1.0 },
  },
  {
    id: "thieves_tools",
    name: "Thieves' Tools",
    desc: "Professional picks. Faster and quieter.",
    slot: "tool",
    cost: 60,
    uses: 8,
    tier: 1,
    effect: { type: "lockpick", speedMult: 1.5, noiseMult: 0.6 },
  },
  {
    id: "master_picks",
    name: "Master Picks",
    desc: "Enchanted picks that open almost anything silently.",
    slot: "tool",
    cost: 150,
    uses: 12,
    tier: 3,
    effect: { type: "lockpick", speedMult: 2.5, noiseMult: 0.2 },
  },
  {
    id: "skeleton_key",
    name: "Skeleton Key",
    desc: "Opens any mundane lock instantly. Single use.",
    slot: "tool",
    cost: 100,
    uses: 1,
    tier: 2,
    effect: { type: "skeleton_key", autoOpen: true },
  },

  // Consumables
  {
    id: "smoke_bomb",
    name: "Smoke Bomb",
    desc: "Creates a cloud of smoke, blocking vision.",
    slot: "consumable",
    cost: 30,
    uses: 2,
    tier: 0,
    effect: { type: "smoke_bomb", radius: 3, duration: 8 },
  },
  {
    id: "sleep_dart",
    name: "Sleep Dart",
    desc: "Puts a guard to sleep at range.",
    slot: "consumable",
    cost: 40,
    uses: 2,
    tier: 1,
    effect: { type: "sleep_dart", range: 6, duration: 15 },
  },
  {
    id: "acid_vial",
    name: "Acid Vial",
    desc: "Dissolves locks or thin walls. Noisy.",
    slot: "consumable",
    cost: 35,
    uses: 2,
    tier: 1,
    effect: { type: "acid_vial", lockBreak: true, wallBreak: true },
  },
  {
    id: "flash_powder",
    name: "Flash Powder",
    desc: "Blinds and stuns guards in an area.",
    slot: "consumable",
    cost: 50,
    uses: 1,
    tier: 2,
    effect: { type: "flash_powder", stunDuration: 5, radius: 3 },
  },
  {
    id: "caltrops",
    name: "Caltrops",
    desc: "Scattered on the ground to slow pursuers.",
    slot: "consumable",
    cost: 25,
    uses: 3,
    tier: 0,
    effect: { type: "caltrops", slowDuration: 8, radius: 2 },
  },

  // Armor / wearable
  {
    id: "dark_cloak",
    name: "Dark Cloak",
    desc: "Harder to spot in shadows.",
    slot: "armor",
    cost: 80,
    uses: -1,
    tier: 1,
    effect: { type: "dark_cloak", detectionMult: 0.6 },
  },
  {
    id: "soft_boots",
    name: "Soft Boots",
    desc: "Muffle footsteps significantly.",
    slot: "armor",
    cost: 60,
    uses: -1,
    tier: 1,
    effect: { type: "soft_boots", noiseMult: 0.5 },
  },
  {
    id: "noble_disguise",
    name: "Noble's Disguise",
    desc: "Pass as a noble in lit areas. Guards won't question you.",
    slot: "armor",
    cost: 120,
    uses: 1,
    tier: 2,
    effect: { type: "disguise", duration: 30 },
  },

  // Gadgets
  {
    id: "grappling_hook",
    name: "Grappling Hook",
    desc: "Reach upper floors or cross gaps.",
    slot: "gadget",
    cost: 50,
    uses: 3,
    tier: 0,
    effect: { type: "grappling_hook", range: 4 },
  },
  {
    id: "rope_ladder",
    name: "Rope Ladder",
    desc: "Quick escape route. Place at windows.",
    slot: "gadget",
    cost: 35,
    uses: 1,
    tier: 0,
    effect: { type: "rope", escapeSpeed: 2.0 },
  },
];

export function getEquipmentById(id: string): EquipmentDef | undefined {
  return EQUIPMENT_DEFS.find(e => e.id === id);
}

export function getEquipmentForTier(tier: number): EquipmentDef[] {
  return EQUIPMENT_DEFS.filter(e => e.tier <= tier);
}
