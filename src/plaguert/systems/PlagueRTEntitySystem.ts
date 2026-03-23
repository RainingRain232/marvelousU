// ---------------------------------------------------------------------------
// Plague Doctor RT — entity systems (day/night, herbs, rats) — no PixiJS
// ---------------------------------------------------------------------------

import { PlagueRTPhase, HouseState, HerbType } from "../types";
import type { PlagueRTState, Herb, Rat } from "../types";
import { PLAGUE_RT_BALANCE as B } from "../config/PlagueRTBalance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _nextHerbId = 1000;
let _nextRatId = 2000;

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function isNight(state: PlagueRTState): boolean {
  return state.dayTime >= B.NIGHT_START || state.dayTime < B.NIGHT_END;
}

function addFloatingText(
  state: PlagueRTState, x: number, y: number, text: string, color: number, size?: number,
): void {
  state.floatingTexts.push({
    x, y, text, color,
    timer: B.FLOAT_TEXT_DURATION,
    maxTimer: B.FLOAT_TEXT_DURATION,
    size,
  });
}

// ---------------------------------------------------------------------------
// Day / night
// ---------------------------------------------------------------------------

export function updateDayNight(state: PlagueRTState, dt: number): void {
  if (state.phase !== PlagueRTPhase.PLAYING) return;

  state.dayTime += dt / B.DAY_DURATION;

  if (state.dayTime >= 1.0) {
    state.dayTime -= 1.0;
    state.day++;
  }

  // Transition events
  const nowNight = isNight(state);

  if (!state.lastNightState && nowNight) {
    state.dayTransitionTimer = B.DAY_TRANSITION_TIME;
    state.dayTransitionText = "NIGHTFALL";
  } else if (state.lastNightState && !nowNight) {
    state.dayTransitionTimer = B.DAY_TRANSITION_TIME;
    state.dayTransitionText = "DAWN";
  }
  state.lastNightState = nowNight;

  if (state.dayTransitionTimer > 0) state.dayTransitionTimer -= dt;

  // Difficulty ramp
  if (state.time > B.GRACE_PERIOD) {
    state.difficulty = Math.min(B.DIFFICULTY_MAX, 1.0 + (state.time - B.GRACE_PERIOD) * B.DIFFICULTY_RAMP);
  }
}

// ---------------------------------------------------------------------------
// Herb spawning
// ---------------------------------------------------------------------------

export function updateHerbSpawning(state: PlagueRTState, dt: number): void {
  if (state.phase !== PlagueRTPhase.PLAYING) return;

  state.nextHerbSpawn -= dt;
  if (state.nextHerbSpawn > 0) return;
  state.nextHerbSpawn = B.HERB_SPAWN_INTERVAL;

  // Count uncollected herbs
  const activeHerbs = state.herbs.filter(h => !h.collected).length;
  if (activeHerbs >= B.HERB_MAX) return;
  if (state.grassTiles.length === 0) return;

  // Pick random grass tile
  const tile = state.grassTiles[Math.floor(Math.random() * state.grassTiles.length)];

  // Weighted herb type selection
  const night = isNight(state);
  const weights: { type: HerbType; w: number }[] = [
    { type: HerbType.LAVENDER, w: B.HERB_WEIGHT_LAVENDER },
    { type: HerbType.WORMWOOD, w: B.HERB_WEIGHT_WORMWOOD },
    { type: HerbType.GARLIC, w: B.HERB_WEIGHT_GARLIC },
  ];
  if (night) weights.push({ type: HerbType.MANDRAKE, w: B.HERB_WEIGHT_MANDRAKE });

  const totalW = weights.reduce((s, w) => s + w.w, 0);
  let roll = Math.random() * totalW;
  let herbType = HerbType.LAVENDER;
  for (const w of weights) {
    roll -= w.w;
    if (roll <= 0) { herbType = w.type; break; }
  }

  const herb: Herb = {
    id: _nextHerbId++,
    gx: tile.gx,
    gy: tile.gy,
    type: herbType,
    collected: false,
    spawnTime: state.time,
    pullX: tile.gx,
    pullY: tile.gy,
    pulling: false,
    spawnFlash: B.HERB_SPAWN_FLASH,
  };
  state.herbs.push(herb);
}

// ---------------------------------------------------------------------------
// Herb magnet pull
// ---------------------------------------------------------------------------

export function updateHerbPull(state: PlagueRTState, dt: number): void {
  if (state.phase !== PlagueRTPhase.PLAYING) return;

  const px = state.player.x;
  const py = state.player.y;

  for (const herb of state.herbs) {
    if (herb.collected) continue;
    if (herb.spawnFlash > 0) herb.spawnFlash -= dt;

    const d = dist(herb.pullX, herb.pullY, px, py);
    if (d < B.HERB_MAGNET_RANGE) {
      herb.pulling = true;
      const dx = px - herb.pullX;
      const dy = py - herb.pullY;
      const len = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
      const speed = Math.min(B.HERB_MAGNET_SPEED * dt, len);
      herb.pullX += (dx / len) * speed;
      herb.pullY += (dy / len) * speed;
    } else {
      herb.pulling = false;
    }
  }
}

// ---------------------------------------------------------------------------
// Rat spawning
// ---------------------------------------------------------------------------

export function updateRatSpawning(state: PlagueRTState, dt: number): void {
  if (state.phase !== PlagueRTPhase.PLAYING) return;
  if (state.time < B.GRACE_PERIOD) return;

  // Wave preview countdown
  if (state.wavePreviewTimer > 0) {
    state.wavePreviewTimer -= dt;
    if (state.wavePreviewTimer <= 0) {
      // Spawn the wave
      spawnRatWave(state);
    }
    return;
  }

  // Individual rat spawning
  state.nextRatSpawn -= dt;
  if (state.nextRatSpawn <= 0) {
    state.nextRatSpawn = B.RAT_SPAWN_INTERVAL;
    if (state.rats.filter(r => r.alive).length < B.RAT_MAX) {
      spawnSingleRat(state);
    }
  }

  // Wave check
  const waveTime = B.RAT_WAVE_INTERVAL;
  const waveThreshold = Math.floor(state.time / waveTime);
  if (waveThreshold > state.wave) {
    state.wave = waveThreshold;
    const count = Math.min(B.RAT_WAVE_BASE + state.wave, B.RAT_MAX - state.rats.filter(r => r.alive).length);
    if (count > 0) {
      state.wavePreviewTimer = B.WAVE_PREVIEW_TIME;
      state.wavePreviewCount = count;
      addFloatingText(state,
        state.player.x * B.TILE_SIZE + B.TILE_SIZE / 2,
        state.player.y * B.TILE_SIZE - B.TILE_SIZE,
        `Rat wave incoming! (${count})`, 0xff6644, 16,
      );
    }
  }
}

function spawnSingleRat(state: PlagueRTState): void {
  // Spawn at edge
  const edge = Math.floor(Math.random() * 4);
  let x: number, y: number;
  if (edge === 0) { x = 0; y = Math.random() * state.gridH; }
  else if (edge === 1) { x = state.gridW - 1; y = Math.random() * state.gridH; }
  else if (edge === 2) { x = Math.random() * state.gridW; y = 0; }
  else { x = Math.random() * state.gridW; y = state.gridH - 1; }

  const target = pickRatTarget(state);
  const rat: Rat = {
    id: _nextRatId++,
    x, y,
    targetGx: target.gx,
    targetGy: target.gy,
    speed: B.RAT_SPEED,
    alive: true,
    infectionAura: B.RAT_AURA,
    deathTimer: 0,
    swarming: false,
  };
  state.rats.push(rat);
}

function spawnRatWave(state: PlagueRTState): void {
  const count = state.wavePreviewCount;
  for (let i = 0; i < count; i++) {
    if (state.rats.filter(r => r.alive).length >= B.RAT_MAX) break;
    spawnSingleRat(state);
  }
  state.wavePreviewCount = 0;
}

function pickRatTarget(state: PlagueRTState): { gx: number; gy: number } {
  // Smart targeting: prefer houses with more villagers and lower infection
  const candidates = state.houses.filter(
    h => h.state === HouseState.HEALTHY || h.state === HouseState.INFECTED,
  );
  if (candidates.length === 0) {
    return { gx: Math.floor(state.gridW / 2), gy: Math.floor(state.gridH / 2) };
  }

  // Weight by villagers (higher = more attractive) and low infection
  let best = candidates[0];
  let bestScore = -1;
  for (const h of candidates) {
    const score = h.villagers * 10 + (100 - h.infection);
    if (score > bestScore) { bestScore = score; best = h; }
  }
  return { gx: best.gx, gy: best.gy };
}

// ---------------------------------------------------------------------------
// Rat movement
// ---------------------------------------------------------------------------

export function updateRatMovement(state: PlagueRTState, dt: number): void {
  if (state.phase !== PlagueRTPhase.PLAYING) return;

  // Clean up dead rats whose death anim finished
  for (let i = state.rats.length - 1; i >= 0; i--) {
    const rat = state.rats[i];
    if (!rat.alive) {
      rat.deathTimer -= dt;
      if (rat.deathTimer <= 0) state.rats.splice(i, 1);
    }
  }

  const aliveRats = state.rats.filter(r => r.alive);

  for (const rat of aliveRats) {
    // Swarm detection
    rat.swarming = false;
    for (const other of aliveRats) {
      if (other.id === rat.id) continue;
      if (dist(rat.x, rat.y, other.x, other.y) < B.RAT_SWARM_RADIUS) {
        rat.swarming = true;
        break;
      }
    }

    // Garlic repulsion
    const garlicActive = state.player.garlicAuraTimer > 0;
    if (garlicActive) {
      const d = dist(rat.x, rat.y, state.player.x, state.player.y);
      if (d < B.GARLIC_REPEL_RANGE) {
        const dx = rat.x - state.player.x;
        const dy = rat.y - state.player.y;
        const len = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
        const repelSpeed = rat.speed * 1.5 * dt / B.TILE_SIZE;
        rat.x += (dx / len) * repelSpeed;
        rat.y += (dy / len) * repelSpeed;
        continue;
      }
    }

    // Move toward target
    const dx = rat.targetGx - rat.x;
    const dy = rat.targetGy - rat.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d < 0.3) {
      // Retarget
      const target = pickRatTarget(state);
      rat.targetGx = target.gx;
      rat.targetGy = target.gy;
      continue;
    }

    let speed = rat.speed * dt / B.TILE_SIZE;
    if (rat.swarming) speed *= B.RAT_SWARM_SPEED_MULT;

    // Smoke slowdown
    for (const smoke of state.smokes) {
      if (dist(rat.x, rat.y, smoke.gx, smoke.gy) <= smoke.radius) {
        speed *= B.SMOKE_SLOW;
        break;
      }
    }

    rat.x += (dx / d) * speed;
    rat.y += (dy / d) * speed;

    // Clamp to grid
    rat.x = Math.max(0, Math.min(state.gridW - 1, rat.x));
    rat.y = Math.max(0, Math.min(state.gridH - 1, rat.y));
  }
}
