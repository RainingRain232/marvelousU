// ---------------------------------------------------------------------------
// Terraria – NPC spawning and interaction
// ---------------------------------------------------------------------------

import type { TerrariaState } from "../state/TerrariaState";
import { addMessage } from "../state/TerrariaState";
import type { NPCInstance } from "../state/TerrariaEntity";
import { getSurfaceHeight } from "./TerrariaTerrainSystem";
import type { ItemStack } from "../state/TerrariaInventory";
import { createBlockItem } from "../state/TerrariaInventory";
import { BlockType } from "../config/TerrariaBlockDefs";
import type { MobInstance } from "../state/TerrariaEntity";
import { MOB_DEFS } from "../config/TerrariaMobDefs";
import { damageMob } from "./TerrariaMobSystem";

// ---------------------------------------------------------------------------
// NPC definitions
// ---------------------------------------------------------------------------

interface NPCDef {
  type: string;
  name: string;
  color: number;
  dialogue: string[];
  progressDialogue?: Record<string, string[]>; // condition key → extra dialogue
  shopItems?: () => ItemStack[];
  spawnCondition: (state: TerrariaState) => boolean;
}

const NPC_DEFS: NPCDef[] = [
  {
    type: "merlin",
    name: "Merlin",
    color: 0x6644CC,
    dialogue: [
      "Greetings, young knight. The Grail lies far below...",
      "Craft better tools to dig deeper, seek the crystal caves.",
      "Beware the Underworld — the Dragon guards its treasure.",
    ],
    progressDialogue: {
      hasExcalibur: ["Thou hast found Excalibur! Now build thy castle and rally thy knights!"],
      dragonSlain: ["The Dragon is vanquished! The Holy Grail beckons from the deepest chamber."],
      deepUnderground: ["I sense dark magic below. Tread carefully in the crystal depths."],
    },
    shopItems: () => [
      createBlockItem(BlockType.TORCH, "Torch", 0xFFAA00, 10),
      createBlockItem(BlockType.ENCHANTED_TORCH, "Enchanted Torch", 0xAA55FF, 5),
      createBlockItem(BlockType.HOLY_STONE, "Holy Stone", 0xFFF8DC, 3),
    ],
    spawnCondition: (s) => s.player.blocksMined >= 10,
  },
  {
    type: "lady_lake",
    name: "Lady of the Lake",
    color: 0x4488CC,
    dialogue: [
      "I sense great purpose in thee. Excalibur awaits...",
      "The legendary blade rests deep in a crystal shrine.",
      "Return to me when thou hast found it.",
    ],
    progressDialogue: {
      hasExcalibur: ["Well done, brave knight! Excalibur's power flows through thee.", "I can heal thy wounds. Rest here a moment."],
      manyKills: ["Thy blade has tasted much battle. Be wary of the darkness within."],
    },
    shopItems: () => [
      createBlockItem(BlockType.WATER, "Healing Potion", 0x44FF44, 3),
      createBlockItem(BlockType.ENCHANTED_STONE, "Enchanted Stone", 0x9966FF, 2),
    ],
    spawnCondition: (s) => s.player.blocksMined >= 50,
  },
  {
    type: "blacksmith",
    name: "Blacksmith",
    color: 0xAA6633,
    dialogue: [
      "Need better gear? Build a Forge and bring me ores!",
      "Iron makes fine weapons. Gold is soft but enchantable.",
      "Crystal gear is the finest in all of Camelot.",
    ],
    progressDialogue: {
      hasIron: ["Good iron! I can forge that into proper weapons at my anvil."],
      hasGold: ["Gold ore? Fit for a king's crown — or a magic-infused blade."],
      hasCrystal: ["Enchanted crystals! With these I can craft the finest arms in the realm."],
    },
    shopItems: () => [
      createBlockItem(BlockType.IRON_ORE, "Iron Ore", 0xB87333, 5),
      createBlockItem(BlockType.GOLD_ORE, "Gold Ore", 0xFFD700, 3),
      createBlockItem(BlockType.COBBLESTONE, "Cobblestone", 0x6B6B6B, 20),
      createBlockItem(BlockType.PLANKS, "Planks", 0xC4A35A, 15),
    ],
    spawnCondition: (s) => s.quests[1]?.completed ?? false,
  },
  {
    type: "herbalist",
    name: "Forest Herbalist",
    color: 0x44AA44,
    dialogue: [
      "The forest provides all we need to survive.",
      "Mushrooms can be both healing and deadly — know the difference!",
      "I brew potions from the herbs of this land.",
    ],
    progressDialogue: {
      deepUnderground: ["The deep caves hold rare glowing fungi. Bring them to me for potent elixirs."],
    },
    shopItems: () => [
      createBlockItem(BlockType.MUSHROOM, "Healing Mushroom", 0xCC8844, 5),
      createBlockItem(BlockType.RED_FLOWER, "Fire Resistance Potion", 0xFF4444, 2),
      createBlockItem(BlockType.BLUE_FLOWER, "Speed Potion", 0x4488FF, 2),
      createBlockItem(BlockType.TALL_GRASS, "Herbal Remedy", 0x5BAF50, 3),
    ],
    spawnCondition: (s) => s.player.blocksMined >= 30,
  },
  {
    type: "knight_recruit",
    name: "Knight of the Round Table",
    color: 0xBBBBBB,
    dialogue: [
      "I pledge my sword to Camelot!",
      "Build us a castle and we shall defend it.",
      "For king and country!",
    ],
    progressDialogue: {
      dragonSlain: ["The Dragon falls! Long live the King!", "Our blades stand ready for the final quest."],
    },
    spawnCondition: (s) => s.quests[3]?.completed ?? false,
  },
];

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

let _npcCheckTimer = 0;

export function updateNPCs(state: TerrariaState, dt: number): void {
  _npcCheckTimer += dt;

  // Periodically check for new NPC spawns
  if (_npcCheckTimer >= 10) {
    _npcCheckTimer = 0;

    for (const def of NPC_DEFS) {
      // Knights can spawn multiple times (up to 6 for quest)
      if (def.type === "knight_recruit") {
        const knightCount = state.npcs.filter(n => n.type === "knight_recruit").length;
        if (knightCount < 6 && def.spawnCondition(state)) {
          _spawnNPC(state, def);
        }
        continue;
      }
      // Other NPCs: only one of each type
      if (state.npcs.some(n => n.type === def.type)) continue;
      if (def.spawnCondition(state)) {
        _spawnNPC(state, def);
      }
    }
  }

  // Simple NPC wander AI
  for (const npc of state.npcs) {
    // NPCs mostly stay still, occasionally wander
    if (Math.random() < 0.005) {
      npc.vx = (Math.random() - 0.5) * 2;
      npc.facingRight = npc.vx > 0;
    }
    if (Math.random() < 0.02) {
      npc.vx = 0;
    }
  }
}

function _spawnNPC(state: TerrariaState, def: NPCDef): void {
  // Spawn near player on the surface
  const px = Math.floor(state.player.x) + Math.floor(Math.random() * 20 - 10);
  const clampedX = Math.max(5, Math.min(state.worldWidth - 5, px));
  const surfaceY = getSurfaceHeight(clampedX);

  const npc: NPCInstance = {
    id: state.nextEntityId++,
    type: def.type,
    name: def.name,
    x: clampedX + 0.5,
    y: surfaceY + 2,
    vx: 0, vy: 0,
    facingRight: true,
    onGround: false,
    hp: 100,
    maxHp: 100,
    dialogue: def.dialogue,
  };
  state.npcs.push(npc);
  addMessage(state, `${def.name} has arrived!`, 0x44FF44);

  // Knight recruitment
  if (def.type === "knight_recruit") {
    state.player.knightsRecruited++;
  }
}

// ---------------------------------------------------------------------------
// Knight combat AI (recruited knights fight nearby mobs)
// ---------------------------------------------------------------------------

export function updateKnightCombat(state: TerrariaState, _dt: number): void {
  for (const npc of state.npcs) {
    if (npc.type !== "knight_recruit") continue;

    // Find nearest hostile mob
    let nearestMob: MobInstance | null = null;
    let nearestDist = 12;

    for (const mob of state.mobs) {
      const dx = mob.x - npc.x;
      const dy = mob.y - npc.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        const def = MOB_DEFS[mob.type];
        if (def?.hostile) {
          nearestDist = dist;
          nearestMob = mob;
        }
      }
    }

    if (nearestMob) {
      const dx = nearestMob.x - npc.x;
      npc.vx = Math.sign(dx) * 3;
      npc.facingRight = dx > 0;

      if (nearestDist < 2) {
        npc.vx = 0;
        const attackCycle = Math.sin(state.totalTime * 3 + npc.id) > 0.8;
        if (attackCycle && nearestMob.hurtTimer <= 0) {
          damageMob(state, nearestMob, 8);
        }
      }
    } else {
      const dx = state.player.x - npc.x;
      if (Math.abs(dx) > 10) {
        npc.vx = Math.sign(dx) * 2;
        npc.facingRight = dx > 0;
      }
    }
  }
}

/** Try to interact with nearest NPC. Returns dialogue string or null. */
export function interactWithNPC(state: TerrariaState): string | null {
  const p = state.player;
  let closest: NPCInstance | null = null;
  let closestDist = 3;

  for (const npc of state.npcs) {
    const dx = npc.x - p.x;
    const dy = npc.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < closestDist) {
      closestDist = dist;
      closest = npc;
    }
  }

  if (!closest) return null;

  // Find NPC definition for progress dialogue
  const def = NPC_DEFS.find(d => d.type === closest!.type);

  // Build dialogue pool from base + progress-specific lines
  const pool = [...(closest.dialogue || [])];
  if (def?.progressDialogue) {
    if (p.hasExcalibur && def.progressDialogue.hasExcalibur) pool.push(...def.progressDialogue.hasExcalibur);
    if (p.mobsKilled >= 20 && def.progressDialogue.manyKills) pool.push(...def.progressDialogue.manyKills);
    if (p.mobsKilled >= 1 && p.hasExcalibur && def.progressDialogue.dragonSlain) pool.push(...def.progressDialogue.dragonSlain);
    if (p.y < 120 && def.progressDialogue.deepUnderground) pool.push(...def.progressDialogue.deepUnderground);
    // Blacksmith material awareness
    if (p.blocksMined >= 20 && def.progressDialogue.hasIron) pool.push(...def.progressDialogue.hasIron);
    if (p.blocksMined >= 50 && def.progressDialogue.hasGold) pool.push(...def.progressDialogue.hasGold);
    if (p.blocksMined >= 100 && def.progressDialogue.hasCrystal) pool.push(...def.progressDialogue.hasCrystal);
  }

  if (pool.length > 0) {
    const line = pool[Math.floor(Math.random() * pool.length)];
    addMessage(state, `[${closest.name}] ${line}`, 0x88CCFF);

    // Herbalist/Lady of the Lake: healing on interaction
    if (closest.type === "lady_lake" && p.hasExcalibur && p.hp < p.maxHp) {
      const healAmount = Math.min(20, p.maxHp - p.hp);
      p.hp += healAmount;
      addMessage(state, `The Lady heals you for ${healAmount} HP!`, 0x44FF44);
    }

    // Shop hint
    if (def?.shopItems) {
      addMessage(state, `[${closest.name}] I have wares if you need supplies. (Press T to trade)`, 0xFFDD44);
    }

    return line;
  }
  return null;
}

/** Get shop items for nearest NPC. Returns items or empty array. */
export function getNPCShop(state: TerrariaState): { npcName: string; items: ItemStack[] } | null {
  const p = state.player;
  let closest: NPCInstance | null = null;
  let closestDist = 3;

  for (const npc of state.npcs) {
    const dx = npc.x - p.x;
    const dy = npc.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < closestDist) {
      closestDist = dist;
      closest = npc;
    }
  }

  if (!closest) return null;
  const def = NPC_DEFS.find(d => d.type === closest!.type);
  if (!def?.shopItems) return null;

  return { npcName: closest.name, items: def.shopItems() };
}

/** Purchase item from NPC shop (trades iron ore as currency). */
export function buyFromNPC(state: TerrariaState, itemIndex: number): boolean {
  const shop = getNPCShop(state);
  if (!shop || itemIndex < 0 || itemIndex >= shop.items.length) return false;

  const item = shop.items[itemIndex];
  // Simple trading: give the item to the player
  const inv = state.player.inventory;
  // Try to add to inventory
  for (let i = 0; i < inv.hotbar.length; i++) {
    if (!inv.hotbar[i]) {
      inv.hotbar[i] = { ...item };
      addMessage(state, `Acquired ${item.displayName}!`, 0x44FF44);
      return true;
    }
    if (inv.hotbar[i]!.displayName === item.displayName) {
      inv.hotbar[i]!.count += item.count;
      addMessage(state, `Acquired ${item.count}x ${item.displayName}!`, 0x44FF44);
      return true;
    }
  }
  for (let i = 0; i < inv.main.length; i++) {
    if (!inv.main[i]) {
      inv.main[i] = { ...item };
      addMessage(state, `Acquired ${item.displayName}!`, 0x44FF44);
      return true;
    }
  }
  addMessage(state, "Inventory full!", 0xFF4444);
  return false;
}
