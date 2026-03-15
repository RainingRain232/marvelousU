// ---------------------------------------------------------------------------
// Survivor landmark system — Arthurian proximity buffs (permanent + temporary)
// Now includes first-visit dialogue system
// ---------------------------------------------------------------------------

import type { SurvivorState, SurvivorTempLandmark, TempLandmarkType } from "../state/SurvivorState";

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

// ---------------------------------------------------------------------------
// Temp landmark definitions
// ---------------------------------------------------------------------------

const TEMP_LANDMARK_DEFS: { type: TempLandmarkType; buffType: string; name: string; radius: number; duration: number }[] = [
  { type: "faction_hall", buffType: "camelot_shield", name: "Shield of Camelot", radius: 6, duration: 60 },
  { type: "blacksmith",   buffType: "wayland_fury",   name: "Wayland's Fury",   radius: 5, duration: 60 },
  { type: "stable",       buffType: "rider_swift",    name: "Rider's Swiftness", radius: 5, duration: 60 },
];

const TEMP_SPAWN_INTERVAL_MIN = 75; // seconds between spawns
const TEMP_SPAWN_INTERVAL_MAX = 105;

// ---------------------------------------------------------------------------
// First-visit dialogue — Arthurian flavour text
// ---------------------------------------------------------------------------

const LANDMARK_DIALOGUES: Record<string, string[]> = {
  sword_stone: [
    "By mine oath... the Sword in the Stone! Its power courses through me like the blood of kings.",
    "The blade hums with ancient power. Mayhaps 'twas destiny that brought me hence.",
    "Excalibur's light shines upon this hallowed ground. I feel its blessing in mine very bones.",
  ],
  chapel: [
    "A chapel most serene... The Lady of the Lake doth grant her grace upon this sacred place.",
    "Peace fills mine heart within these walls. The wounds of battle shall mend by Her mercy.",
    "I kneel before the altar. Let the Lady's healing waters wash away mine hurts.",
  ],
  archive: [
    "Merlin's Archive! Scrolls of forgotten lore line these ancient shelves. Knowledge is power indeed.",
    "The old wizard's wisdom lingers here still. I can feel mine mind sharpening with each breath.",
    "Such arcane texts! Merlin himself must have penned these words in ages long past.",
  ],
  faction_hall: [
    "A Hall of the Round Table! The shields of noble knights adorn these walls. Their courage bolsters mine own.",
    "Camelot's banner flies high! Under its aegis, no blow shall find its mark upon me.",
    "The spirit of chivalry dwells within these stones. I am shielded by the honour of the Table Round.",
  ],
  blacksmith: [
    "Hark! Wayland the Smith's forge burns bright. Mine weapons shall strike with fury renewed!",
    "The ring of hammer upon anvil echoes through time. Wayland's craft empowers mine every blow.",
    "A smithy of legend! The very metal sings as it is shaped by unseen hands.",
  ],
  stable: [
    "Fine steeds of Avalon! Their swiftness shall carry me hence with the wind at my back.",
    "The horses whinny in greeting. I feel fleet of foot, as though borne upon enchanted hooves.",
    "A stable most wondrous! The beasts within grant me speed beyond mortal reckoning.",
  ],
};

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

type LandmarkNotifyCallback = ((name: string, color: number, spawned: boolean) => void) | null;
type LandmarkDialogueCallback = ((dialogue: string, worldX: number, worldY: number) => void) | null;
let _notifyCallback: LandmarkNotifyCallback = null;
let _dialogueCallback: LandmarkDialogueCallback = null;

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

export const SurvivorLandmarkSystem = {
  setNotifyCallback(cb: LandmarkNotifyCallback): void { _notifyCallback = cb; },
  setDialogueCallback(cb: LandmarkDialogueCallback): void { _dialogueCallback = cb; },

  update(state: SurvivorState, dt: number): void {
    if (state.paused || state.levelUpPending || state.gameOver || state.victory) return;

    const px = state.player.position.x;
    const py = state.player.position.y;

    // Reset buffs each frame
    state.activeLandmarkBuffs.clear();

    // --- Permanent landmarks ---
    for (const lm of state.landmarks) {
      const rSq = lm.radius * lm.radius;
      if (distSq(px, py, lm.position.x, lm.position.y) < rSq) {
        state.activeLandmarkBuffs.add(lm.buffType);

        // Chapel: direct HP regen
        if (lm.buffType === "chapel") {
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + 3 * dt);
        }

        // First-visit dialogue
        if (!state.visitedLandmarks.has(lm.id)) {
          state.visitedLandmarks.add(lm.id);
          _triggerDialogue(lm.id, px, py);
        }
      }
    }

    // --- Temporary landmarks ---

    // Tick remaining time, remove expired
    for (let i = state.tempLandmarks.length - 1; i >= 0; i--) {
      const tl = state.tempLandmarks[i];
      tl.remaining -= dt;
      if (tl.remaining <= 0) {
        state.tempLandmarks.splice(i, 1);
        continue;
      }

      // Check proximity buff
      const rSq = tl.radius * tl.radius;
      if (distSq(px, py, tl.position.x, tl.position.y) < rSq) {
        state.activeLandmarkBuffs.add(tl.buffType);

        // First-visit dialogue for temp landmarks (use "type_id" as unique key)
        const visitKey = `temp_${tl.type}_${tl.id}`;
        if (!state.visitedLandmarks.has(visitKey)) {
          state.visitedLandmarks.add(visitKey);
          _triggerDialogue(tl.type, px, py);
        }
      }
    }

    // Spawn cooldown
    state.tempLandmarkCooldown -= dt;
    if (state.tempLandmarkCooldown <= 0) {
      _spawnTempLandmark(state);
      state.tempLandmarkCooldown = TEMP_SPAWN_INTERVAL_MIN + Math.random() * (TEMP_SPAWN_INTERVAL_MAX - TEMP_SPAWN_INTERVAL_MIN);
    }
  },

  cleanup(): void {
    _notifyCallback = null;
    _dialogueCallback = null;
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _triggerDialogue(landmarkKey: string, playerX: number, playerY: number): void {
  const dialogues = LANDMARK_DIALOGUES[landmarkKey];
  if (!dialogues || dialogues.length === 0) return;
  const dialogue = dialogues[Math.floor(Math.random() * dialogues.length)];
  _dialogueCallback?.(dialogue, playerX, playerY);
}

function _spawnTempLandmark(state: SurvivorState): void {
  const def = TEMP_LANDMARK_DEFS[Math.floor(Math.random() * TEMP_LANDMARK_DEFS.length)];
  const margin = 10;
  const x = margin + Math.random() * (state.mapWidth - margin * 2);
  const y = margin + Math.random() * (state.mapHeight - margin * 2);

  const tl: SurvivorTempLandmark = {
    id: state.nextTempLandmarkId++,
    type: def.type,
    position: { x, y },
    radius: def.radius,
    buffType: def.buffType,
    name: def.name,
    remaining: def.duration,
    duration: def.duration,
  };

  state.tempLandmarks.push(tl);

  const color = def.type === "faction_hall" ? 0x4488ff
    : def.type === "blacksmith" ? 0xff8844
    : 0x44ddaa;
  _notifyCallback?.(def.name, color, true);
}
