// ---------------------------------------------------------------------------
// Survivor landmark system — Arthurian proximity buffs (permanent + temporary)
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
// Notification callback
// ---------------------------------------------------------------------------

type LandmarkNotifyCallback = ((name: string, color: number, spawned: boolean) => void) | null;
let _notifyCallback: LandmarkNotifyCallback = null;

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

export const SurvivorLandmarkSystem = {
  setNotifyCallback(cb: LandmarkNotifyCallback): void { _notifyCallback = cb; },

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
  },
};

// ---------------------------------------------------------------------------
// Internal spawn logic
// ---------------------------------------------------------------------------

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
