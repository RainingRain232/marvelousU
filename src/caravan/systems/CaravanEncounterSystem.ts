// ---------------------------------------------------------------------------
// Caravan encounter spawner — spawns enemies during travel phase
// ---------------------------------------------------------------------------

import { CaravanBalance } from "../config/CaravanBalanceConfig";
import { rollEncounter, rollBossEncounter } from "../config/CaravanEncounterDefs";
import type { CaravanEnemyDef } from "../config/CaravanEncounterDefs";
import type { CaravanState, CaravanEnemy } from "../state/CaravanState";
import { CaravanMovementSystem } from "./CaravanMovementSystem";

type EncounterCallback = ((name: string) => void) | null;
let _encounterCallback: EncounterCallback = null;

export const CaravanEncounterSystem = {
  setEncounterCallback(cb: EncounterCallback): void { _encounterCallback = cb; },
  resetSegmentEvents(): void { _eventsFiredThisSegment = 0; },

  update(state: CaravanState, dt: number): void {
    if (state.phase !== "travel") return;

    // Don't spawn new encounters while boss is active or at enemy cap
    if (state.bossActive) return;
    if (!CaravanMovementSystem.canSpawnMore(state)) return;

    state.encounterCooldown -= dt;
    if (state.encounterCooldown > 0) return;

    const progress = state.segmentProgress / state.segmentLength;
    const isBossSegment = (state.segment + 1) % CaravanBalance.BOSS_SEGMENT_INTERVAL === 0;
    const shouldBoss = isBossSegment && progress >= 0.75 && !state.bossSpawnedThisSegment;

    if (shouldBoss) {
      _spawnBoss(state);
      state.bossSpawnedThisSegment = true;
    } else {
      _spawnEncounter(state);
    }

    // Reset cooldown — gets shorter in late segment (intensity ramp)
    const min = CaravanBalance.ENCOUNTER_COOLDOWN_MIN;
    const max = CaravanBalance.ENCOUNTER_COOLDOWN_MAX;
    const lateBonus = progress > 0.6 ? (progress - 0.6) * 3 : 0; // up to 1.2s faster
    state.encounterCooldown = Math.max(1.5, min + Math.random() * (max - min) - lateBonus);

    // Check for road events
    _checkRoadEvent(state, progress);
  },
};

function _getScaling(segment: number): { hp: number; atk: number; spd: number } {
  return {
    hp: CaravanBalance.ENEMY_HP_SCALE_BASE + CaravanBalance.ENEMY_HP_SCALE_PER_SEGMENT * segment,
    atk: CaravanBalance.ENEMY_ATK_SCALE_BASE + CaravanBalance.ENEMY_ATK_SCALE_PER_SEGMENT * segment,
    spd: 1 + CaravanBalance.ENEMY_SPEED_SCALE_PER_SEGMENT * segment,
  };
}

function _spawnEncounter(state: CaravanState): void {
  const encounter = rollEncounter(state.segment);
  state.encounterCount++;

  _encounterCallback?.(encounter.name);

  const scale = _getScaling(state.segment);
  // Apply difficulty multiplier
  scale.hp *= state.difficultyMult;
  scale.atk *= state.difficultyMult;

  for (const group of encounter.enemies) {
    for (let i = 0; i < group.count; i++) {
      const enemy = _createEnemy(state, group.def, scale.hp, scale.atk, scale.spd, false);
      state.enemies.push(enemy);
    }
  }
}

function _spawnBoss(state: CaravanState): void {
  const encounter = rollBossEncounter(state.bossIndex);
  state.bossIndex++;
  state.bossActive = true;

  _encounterCallback?.(encounter.name);

  const scale = _getScaling(state.segment);
  scale.hp *= state.difficultyMult;
  scale.atk *= state.difficultyMult;

  for (const group of encounter.enemies) {
    for (let i = 0; i < group.count; i++) {
      const enemy = _createEnemy(state, group.def, scale.hp, scale.atk, scale.spd, group.def.isBoss ?? false);
      state.enemies.push(enemy);
    }
  }
}

function _createEnemy(
  state: CaravanState,
  def: CaravanEnemyDef,
  hpScale: number,
  atkScale: number,
  spdScale: number,
  isBoss: boolean,
): CaravanEnemy {
  const pos = _getSpawnPosition(state);
  const hp = Math.round(def.hp * hpScale);

  return {
    id: state.nextEnemyId++,
    defName: def.name,
    unitType: def.unitType,
    position: pos,
    hp,
    maxHp: hp,
    atk: Math.round(def.atk * atkScale),
    speed: def.speed * spdScale,
    range: def.range,
    goldReward: def.goldReward,
    alive: true,
    isBoss,
    targetType: "caravan",
    targetId: null,
    hitTimer: 0,
    attackTimer: 0.5 + Math.random() * 0.8, // stagger first attacks
    attackCooldown: isBoss ? 1.5 : CaravanBalance.ENEMY_ATTACK_COOLDOWN,
    displayName: def.name,
    deathTimer: 0,
    stunTimer: 0,
  };
}

function _getSpawnPosition(state: CaravanState): { x: number; y: number } {
  const cx = state.caravan.position.x;
  const cy = state.caravan.position.y;
  const marginX = CaravanBalance.ENEMY_SPAWN_MARGIN_X;
  const marginY = CaravanBalance.ENEMY_SPAWN_MARGIN_Y;

  // Spawn from one of 4 directions (added behind for flanking)
  const side = Math.random() * 4;
  let x: number, y: number;

  if (side < 1.5) {
    // Ahead of caravan (right side) — most common
    x = cx + marginX + Math.random() * 4;
    y = cy + (Math.random() * 2 - 1) * (state.mapHeight * 0.4);
  } else if (side < 2.5) {
    // Above
    x = cx + (Math.random() * 2 - 1) * marginX;
    y = Math.max(0.5, cy - marginY - Math.random() * 3);
  } else if (side < 3.5) {
    // Below
    x = cx + (Math.random() * 2 - 1) * marginX;
    y = Math.min(state.mapHeight - 0.5, cy + marginY + Math.random() * 3);
  } else {
    // Behind (flanking) — rarer
    x = cx - marginX * 0.5 - Math.random() * 3;
    y = cy + (Math.random() * 2 - 1) * (state.mapHeight * 0.3);
  }

  x = Math.max(0.5, Math.min(state.mapWidth - 0.5, x));
  y = Math.max(0.5, Math.min(state.mapHeight - 0.5, y));

  return { x, y };
}

// ---------------------------------------------------------------------------
// Road events — random bonuses during travel
// ---------------------------------------------------------------------------

// Track which progress thresholds have been checked (allows 3 events per segment)
let _eventThresholds = [0.2, 0.45, 0.7];
let _eventsFiredThisSegment = 0;

function _checkRoadEvent(state: CaravanState, progress: number): void {
  if (_eventsFiredThisSegment >= _eventThresholds.length) return;
  const threshold = _eventThresholds[_eventsFiredThisSegment];
  if (progress < threshold) return;
  _eventsFiredThisSegment++;

  if (Math.random() > CaravanBalance.EVENT_CHANCE_PER_SEGMENT) return;

  // Pick a random event
  const events = [
    { name: "Wandering Merchant", effect: () => { state.gold += 50; state.totalGoldEarned += 50; } },
    { name: "Hidden Treasure", effect: () => { state.gold += 80; state.totalGoldEarned += 80; } },
    { name: "Traveling Healer", effect: () => {
      state.caravan.hp = Math.min(state.caravan.maxHp, state.caravan.hp + 80);
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 30);
    }},
    { name: "Escort Volunteers", effect: () => {
      for (const e of state.escorts) {
        if (e.alive) e.hp = Math.min(e.maxHp, e.hp + Math.round(e.maxHp * 0.3));
      }
    }},
    { name: "Favorable Winds", effect: () => { state.caravan.speed += 0.2; } },
    { name: "Roadside Shrine", effect: () => {
      // Temporary defense boost
      state.defense += 2;
    }},
    { name: "Old Battlefield Loot", effect: () => {
      state.gold += 40 + state.segment * 20;
      state.totalGoldEarned += 40 + state.segment * 20;
    }},
    { name: "Wandering Blacksmith", effect: () => {
      // Buff player ATK temporarily
      state.player.atkBuffTimer = 10;
      state.player.atkBuffMult = 1.3;
    }},
    { name: "Ancient Waystone", effect: () => {
      // Reduce all ability cooldowns
      for (const ab of state.player.abilities) {
        ab.cooldownTimer = Math.max(0, ab.cooldownTimer - 3);
      }
    }},
    { name: "Caravan Repair Kit", effect: () => {
      state.caravan.hp = Math.min(state.caravan.maxHp, state.caravan.hp + 50);
      // Also heal escorts
      for (const e of state.escorts) {
        if (e.alive) e.hp = Math.min(e.maxHp, e.hp + Math.round(e.maxHp * 0.15));
      }
    }},
  ];

  const event = events[Math.floor(Math.random() * events.length)];
  event.effect();
  _encounterCallback?.(`Event: ${event.name}`);
}
