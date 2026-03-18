// ---------------------------------------------------------------------------
// Terraria – NPC spawning and interaction
// ---------------------------------------------------------------------------

import type { TerrariaState } from "../state/TerrariaState";
import { addMessage } from "../state/TerrariaState";
import type { NPCInstance } from "../state/TerrariaEntity";
import { getSurfaceHeight } from "./TerrariaTerrainSystem";

// ---------------------------------------------------------------------------
// NPC definitions
// ---------------------------------------------------------------------------

interface NPCDef {
  type: string;
  name: string;
  color: number;
  dialogue: string[];
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
    spawnCondition: (s) => s.quests[1]?.completed ?? false,
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

/** Try to interact with nearest NPC. Returns dialogue string or null. */
export function interactWithNPC(state: TerrariaState): string | null {
  const p = state.player;
  let closest: NPCInstance | null = null;
  let closestDist = 3; // interact range

  for (const npc of state.npcs) {
    const dx = npc.x - p.x;
    const dy = npc.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < closestDist) {
      closestDist = dist;
      closest = npc;
    }
  }

  if (closest && closest.dialogue.length > 0) {
    const line = closest.dialogue[Math.floor(Math.random() * closest.dialogue.length)];
    addMessage(state, `[${closest.name}] ${line}`, 0x88CCFF);
    return line;
  }
  return null;
}
