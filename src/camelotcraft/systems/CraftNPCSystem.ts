// ---------------------------------------------------------------------------
// Camelot Craft – NPC interaction system
// ---------------------------------------------------------------------------

import type { CraftState, MobInstance } from "../state/CraftState";
import { MobType, MOB_DEFS } from "../config/CraftMobDefs";
import { addMessage } from "../state/CraftState";
import { BlockType } from "../config/CraftBlockDefs";
import { countInInventory, removeFromInventory } from "../state/CraftInventory";

const NPC_INTERACT_RANGE = 4.0;

// ---------------------------------------------------------------------------
// Arthurian knight names
// ---------------------------------------------------------------------------

export const KNIGHT_NAMES = [
  "Lancelot", "Gawain", "Percival", "Galahad", "Tristan",
  "Kay", "Bedivere", "Gareth", "Gaheris", "Bors",
  "Lamorak", "Pellinore", "Ector", "Dagonet", "Lucan",
  "Agravain", "Mordred", "Palamedes", "Brunor", "Safir",
  "Lionel", "Hector", "Tor", "Erec", "Ywain",
];

export function getRandomKnightName(seed: number, index: number): string {
  const h = ((seed * 2654435761 + index * 374761393) >>> 0) % KNIGHT_NAMES.length;
  return KNIGHT_NAMES[h];
}

// ---------------------------------------------------------------------------
// Villager tips
// ---------------------------------------------------------------------------

const VILLAGER_TIPS = [
  "The enchanted forest hides many crystals deep underground.",
  "Saxon raiders grow bolder at night. Build walls, my lord!",
  "Iron tools mine faster than stone. Seek iron in the deep caves.",
  "The Lady of the Lake knows where Excalibur rests.",
  "Merlin can enchant your tools if you bring him crystals.",
  "The Round Table must be built before knights will pledge fealty.",
  "Dragons nest in the mountains to the north. Beware!",
  "Holy water from the Crystal Lake has healing properties.",
  "A crafting table lets you make better tools and weapons.",
  "Build a furnace to smelt iron and gold ore into ingots.",
  "Castle walls are stronger than stone — reinforce your keep!",
  "Mushroom stew restores more hunger than plain food.",
  "The Holy Grail lies in the dark caverns, guarded by evil.",
  "Plant torches to keep the darkness — and its creatures — at bay.",
  "Gold tools mine faster but break easily. Crystal is the wisest choice.",
];

// ---------------------------------------------------------------------------
// NPC interaction
// ---------------------------------------------------------------------------

export interface NPCInteraction {
  type: "dialog" | "recruit" | "enchant";
  message: string;
}

export function interactWithNPC(state: CraftState, mob: MobInstance): NPCInteraction | null {
  const playerPos = state.player.position;
  const dist = playerPos.distanceTo(mob.position);
  if (dist > NPC_INTERACT_RANGE) return null;

  const def = MOB_DEFS[mob.type];
  if (!def || (def.behavior !== "friendly" && def.behavior !== "passive")) return null;

  switch (mob.type) {
    case MobType.KNIGHT_NPC: return handleKnight(state);
    case MobType.MERLIN: return handleMerlin(state);
    case MobType.LADY_OF_LAKE: return handleLady(state);
    case MobType.VILLAGER: return handleVillager(state, mob);
    default: return null;
  }
}

function handleKnight(state: CraftState): NPCInteraction {
  const p = state.player;

  // Check if player has built a round table
  // Simplified: allow recruitment if they approach a knight NPC
  if (p.knightsRecruited >= 12) {
    const msg = "\"The Round Table is complete, my liege! All knights stand ready.\"";
    addMessage(state, msg, 0xFFD700);
    return { type: "dialog", message: msg };
  }

  const name = getRandomKnightName(state.seed, p.knightsRecruited);
  p.knightsRecruited++;
  const msg = `Sir ${name} pledges fealty to your cause! (${p.knightsRecruited}/12 knights)`;
  addMessage(state, msg, 0xFFD700);
  return { type: "recruit", message: msg };
}

function handleMerlin(state: CraftState): NPCInteraction {
  const inv = state.player.inventory;
  const crystals = countInInventory(inv, BlockType.ENCHANTED_CRYSTAL_ORE);

  if (crystals <= 0) {
    const msg = "Merlin: \"Bring me enchanted crystals from the deep caves, and I shall weave powerful magic for thee.\"";
    addMessage(state, msg, 0x7B68EE);
    return { type: "dialog", message: msg };
  }

  // Consume crystal, grant bonus
  removeFromInventory(inv, BlockType.ENCHANTED_CRYSTAL_ORE, 1);
  state.player.xp += 20;
  const msg = "Merlin enchants your equipment! (+20 XP, tools strengthened)";
  addMessage(state, msg, 0x7B68EE);
  return { type: "enchant", message: msg };
}

function handleLady(state: CraftState): NPCInteraction {
  if (state.player.hasExcalibur) {
    const msg = "The Lady of the Lake smiles: \"Excalibur serves you well, King.\"";
    addMessage(state, msg, 0x80D8FF);
    return { type: "dialog", message: msg };
  }

  const dirs = ["north", "south", "east", "west"];
  const landmarks = ["the Scorched Peaks", "the Ancient Oak", "the Forgotten Ruins", "the Dragon's Spine"];
  const dir = dirs[state.seed % dirs.length];
  const lm = landmarks[(state.seed * 7) % landmarks.length];

  const msg = `The Lady raises her hand from the water: "Seek the crystal cave ${dir} of ${lm}. There you shall find the blade."`;
  addMessage(state, msg, 0x80D8FF);
  return { type: "dialog", message: msg };
}

function handleVillager(state: CraftState, mob: MobInstance): NPCInteraction {
  const seed = Math.floor(Math.abs(mob.position.x * 73856 + mob.position.z * 19349)) >>> 0;
  const tip = VILLAGER_TIPS[seed % VILLAGER_TIPS.length];
  const msg = `Villager: "${tip}"`;
  addMessage(state, msg, 0xA1887F);
  return { type: "dialog", message: msg };
}
