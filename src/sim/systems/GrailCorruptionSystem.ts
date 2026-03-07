// Grail Greed Corruption — stacking combat modifiers for Wave mode.
//
// Every 3-4 waves a new CorruptionModifier activates and stacks on top of
// previous ones.  Early modifiers are gentle nudges; later ones are dramatic.
//
// Modifier categories:
//   Elemental  — resistance / stat shifts on enemies
//   Biological — enemy behaviour changes (regen, split, parasitic)
//   Temporal   — pacing shifts (reinforcements, revenant)
//   Psychic    — targets the player's army directly

import type { GameState } from "@sim/state/GameState";
import type { Unit } from "@sim/entities/Unit";
import { createUnit } from "@sim/entities/Unit";
import { UnitState } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import { distanceSq } from "@sim/utils/math";

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

export type CorruptionCategory = "elemental" | "biological" | "temporal" | "psychic";

export interface CorruptionModifier {
  id: string;
  name: string;
  category: CorruptionCategory;
  description: string;
  tier: 1 | 2 | 3;
  /** Called once at battle start after all units are placed. */
  apply(state: GameState): void;
  /** Hook called when any unit dies. */
  onUnitDied?(state: GameState, unit: Unit, killerUnitId?: string): void;
  /** Hook called every sim tick. */
  onTick?(state: GameState, dt: number): void;
  /** Hook called when damage is dealt (before HP subtraction). Returns modified damage. */
  onDamageDealt?(state: GameState, attacker: Unit, target: Unit, damage: number): number;
}

// ---------------------------------------------------------------------------
// Corruption runtime state (lives alongside _waveState in main.ts)
// ---------------------------------------------------------------------------

export interface GrailCorruptionState {
  enabled: boolean;
  activeModifiers: CorruptionModifier[];
  corruptionLevel: number;
  nextModifierWave: number;
  /** Tracks which modifier IDs have been used (no duplicates). */
  usedModifierIds: Set<string>;
  /** Internal timers for temporal effects. */
  _revenantQueue: Array<{ unit: Unit; timer: number }>;
  _reinforcementsSpawned: boolean;
  _reinforcementTimer: number;
  _reinforcementUnits: Unit[];
  _mindWarpTimer: number;
  _mindWarpUnit: Unit | null;
  _battleTickCount: number;
}

export function createGrailCorruptionState(): GrailCorruptionState {
  return {
    enabled: false,
    activeModifiers: [],
    corruptionLevel: 0,
    nextModifierWave: 5,
    usedModifierIds: new Set(),
    _revenantQueue: [],
    _reinforcementsSpawned: false,
    _reinforcementTimer: 0,
    _reinforcementUnits: [],
    _mindWarpTimer: 0,
    _mindWarpUnit: null,
    _battleTickCount: 0,
  };
}

// ---------------------------------------------------------------------------
// Modifier definitions
// ---------------------------------------------------------------------------

// Helpers
function getEnemyUnits(state: GameState): Unit[] {
  const units: Unit[] = [];
  for (const u of state.units.values()) {
    if (u.owner === "p2" && u.state !== UnitState.DIE) units.push(u);
  }
  return units;
}

function getPlayerUnits(state: GameState): Unit[] {
  const units: Unit[] = [];
  for (const u of state.units.values()) {
    if (u.owner === "p1" && u.state !== UnitState.DIE) units.push(u);
  }
  return units;
}

// ---- TIER 1 ----

const IRONHIDE: CorruptionModifier = {
  id: "ironhide",
  name: "IRONHIDE",
  category: "elemental",
  description: "All enemies gain +30% HP",
  tier: 1,
  apply(state) {
    for (const u of getEnemyUnits(state)) {
      const bonus = Math.floor(u.maxHp * 0.3);
      u.maxHp += bonus;
      u.hp += bonus;
    }
  },
};

const SWIFTNESS: CorruptionModifier = {
  id: "swiftness",
  name: "SWIFTNESS",
  category: "elemental",
  description: "All enemies gain +20% speed",
  tier: 1,
  apply(state) {
    for (const u of getEnemyUnits(state)) {
      u.speed *= 1.2;
    }
  },
};

const REGENERATION: CorruptionModifier = {
  id: "regeneration",
  name: "REGENERATION",
  category: "biological",
  description: "All enemies regenerate 1% max HP/sec",
  tier: 1,
  apply(state) {
    for (const u of getEnemyUnits(state)) {
      u.regenRate += u.maxHp * 0.01;
    }
  },
};

const FURY: CorruptionModifier = {
  id: "fury",
  name: "FURY",
  category: "elemental",
  description: "All enemies gain +25% attack damage",
  tier: 1,
  apply(state) {
    for (const u of getEnemyUnits(state)) {
      u.atk = Math.floor(u.atk * 1.25);
    }
  },
};

// ---- TIER 2 ----

let _corruptionState: GrailCorruptionState | null = null;

/** Set the active corruption state reference (called from main.ts). */
export function setCorruptionStateRef(cs: GrailCorruptionState): void {
  _corruptionState = cs;
}

const SOULBURN: CorruptionModifier = {
  id: "soulburn",
  name: "SOULBURN",
  category: "biological",
  description: "Enemy deaths deal AoE damage (10% max HP) to nearby units",
  tier: 2,
  apply() { /* passive — handled via onUnitDied */ },
  onUnitDied(state, unit) {
    if (unit.owner !== "p2") return;
    const aoeDamage = Math.floor(unit.maxHp * 0.1);
    const aoeRangeSq = 3 * 3;
    for (const u of state.units.values()) {
      if (u.id === unit.id || u.state === UnitState.DIE) continue;
      if (u.owner === "p2") continue; // only damages player units
      if (distanceSq(unit.position, u.position) <= aoeRangeSq) {
        u.hp -= aoeDamage;
        EventBus.emit("unitDamaged", { unitId: u.id, amount: aoeDamage, attackerId: unit.id });
        if (u.hp <= 0) {
          u.hp = 0;
          u.state = UnitState.DIE;
          u.deathTimer = 1.0;
          u.targetId = null;
          u.path = null;
          EventBus.emit("unitDied", { unitId: u.id });
        }
      }
    }
  },
};

const PARASITIC: CorruptionModifier = {
  id: "parasitic",
  name: "PARASITIC",
  category: "biological",
  description: "Enemies heal 15% of damage dealt",
  tier: 2,
  apply() { /* passive — handled via onDamageDealt */ },
  onDamageDealt(_state, attacker, _target, damage) {
    if (attacker.owner !== "p2") return damage;
    const heal = Math.floor(damage * 0.15);
    attacker.hp = Math.min(attacker.hp + heal, attacker.maxHp);
    if (heal > 0) {
      EventBus.emit("unitHealed", {
        unitId: attacker.id,
        amount: heal,
        position: { ...attacker.position },
      });
    }
    return damage;
  },
};

const REINFORCEMENTS: CorruptionModifier = {
  id: "reinforcements",
  name: "REINFORCEMENTS",
  category: "temporal",
  description: "20% of enemy army spawns as mid-battle reinforcements",
  tier: 2,
  apply(state) {
    if (!_corruptionState) return;
    // Snapshot 20% of enemy units to spawn later
    const enemies = getEnemyUnits(state);
    const count = Math.max(1, Math.floor(enemies.length * 0.2));
    const picks: Unit[] = [];
    const shuffled = [...enemies].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count && i < shuffled.length; i++) {
      picks.push(shuffled[i]);
    }
    _corruptionState._reinforcementUnits = picks;
    _corruptionState._reinforcementsSpawned = false;
    _corruptionState._reinforcementTimer = 30; // spawn after 30 seconds
  },
  onTick(state, dt) {
    if (!_corruptionState || _corruptionState._reinforcementsSpawned) return;
    _corruptionState._reinforcementTimer -= dt;
    if (_corruptionState._reinforcementTimer <= 0) {
      _corruptionState._reinforcementsSpawned = true;
      // Spawn reinforcement copies
      for (const template of _corruptionState._reinforcementUnits) {
        const unit = createUnit({
          type: template.type,
          owner: "p2",
          position: { x: template.position.x + Math.random() * 4 - 2, y: template.position.y + Math.random() * 4 - 2 },
        });
        state.units.set(unit.id, unit);
        EventBus.emit("unitSpawned", {
          unitId: unit.id,
          buildingId: "",
          position: { ...unit.position },
        });
      }
      EventBus.emit("randomEvent", {
        eventType: "corruption_reinforcements",
        title: "CORRUPTION: REINFORCEMENTS",
        description: "Enemy reinforcements have arrived!",
      });
    }
  },
};

// ---- TIER 3 ----

const REVENANT: CorruptionModifier = {
  id: "revenant",
  name: "REVENANT",
  category: "temporal",
  description: "Slain enemies revive once at 30% HP after 5 seconds",
  tier: 3,
  apply() {
    if (_corruptionState) {
      _corruptionState._revenantQueue = [];
    }
  },
  onUnitDied(_state, unit) {
    if (unit.owner !== "p2") return;
    if (!_corruptionState) return;
    // Check if this unit has already revived (tag via a simple marker)
    if ((unit as Unit & { _revenantUsed?: boolean })._revenantUsed) return;
    // Queue for revival
    const clone = { ...unit }; // shallow copy for type/position info
    _corruptionState._revenantQueue.push({ unit: clone, timer: 5 });
  },
  onTick(state, dt) {
    if (!_corruptionState) return;
    const queue = _corruptionState._revenantQueue;
    for (let i = queue.length - 1; i >= 0; i--) {
      queue[i].timer -= dt;
      if (queue[i].timer <= 0) {
        const template = queue[i].unit;
        const revived = createUnit({
          type: template.type,
          owner: "p2",
          position: { ...template.position },
        });
        revived.hp = Math.floor(revived.maxHp * 0.3);
        // Mark so it won't revive again
        (revived as Unit & { _revenantUsed?: boolean })._revenantUsed = true;
        state.units.set(revived.id, revived);
        EventBus.emit("unitSpawned", {
          unitId: revived.id,
          buildingId: "",
          position: { ...revived.position },
        });
        queue.splice(i, 1);
      }
    }
  },
};

const MIND_WARP: CorruptionModifier = {
  id: "mind_warp",
  name: "MIND WARP",
  category: "psychic",
  description: "Your highest-ATK unit fights for the enemy for 10 seconds",
  tier: 3,
  apply(state) {
    if (!_corruptionState) return;
    const playerUnits = getPlayerUnits(state);
    if (playerUnits.length === 0) return;
    // Find highest ATK
    let best = playerUnits[0];
    for (const u of playerUnits) {
      if (u.atk > best.atk) best = u;
    }
    best.owner = "p2";
    best.targetId = null;
    best.path = null;
    _corruptionState._mindWarpUnit = best;
    _corruptionState._mindWarpTimer = 10;
    EventBus.emit("randomEvent", {
      eventType: "corruption_mind_warp",
      title: "CORRUPTION: MIND WARP",
      description: `Your ${best.type} has been charmed!`,
    });
  },
  onTick(_state, dt) {
    if (!_corruptionState || !_corruptionState._mindWarpUnit) return;
    _corruptionState._mindWarpTimer -= dt;
    if (_corruptionState._mindWarpTimer <= 0) {
      const unit = _corruptionState._mindWarpUnit;
      if (unit.state !== UnitState.DIE) {
        unit.owner = "p1";
        unit.targetId = null;
        unit.path = null;
      }
      _corruptionState._mindWarpUnit = null;
    }
  },
};

const FORTIFIED: CorruptionModifier = {
  id: "fortified",
  name: "FORTIFIED",
  category: "elemental",
  description: "All enemies gain +2 attack range",
  tier: 2,
  apply(state) {
    for (const u of getEnemyUnits(state)) {
      u.range += 2;
    }
  },
};

const DEATH_SPLIT: CorruptionModifier = {
  id: "death_split",
  name: "DEATH SPLIT",
  category: "biological",
  description: "Slain enemies split into 2 weaker copies (50% stats)",
  tier: 3,
  apply() { /* passive — handled via onUnitDied */ },
  onUnitDied(state, unit) {
    if (unit.owner !== "p2") return;
    // Don't split splits (tag check)
    if ((unit as Unit & { _isSplit?: boolean })._isSplit) return;
    for (let i = 0; i < 2; i++) {
      const copy = createUnit({
        type: unit.type,
        owner: "p2",
        position: {
          x: unit.position.x + (i === 0 ? -1 : 1),
          y: unit.position.y + (Math.random() - 0.5) * 2,
        },
      });
      copy.maxHp = Math.floor(copy.maxHp * 0.5);
      copy.hp = copy.maxHp;
      copy.atk = Math.floor(copy.atk * 0.5);
      (copy as Unit & { _isSplit?: boolean })._isSplit = true;
      state.units.set(copy.id, copy);
      EventBus.emit("unitSpawned", {
        unitId: copy.id,
        buildingId: "",
        position: { ...copy.position },
      });
    }
  },
};

// ---------------------------------------------------------------------------
// All modifiers registry
// ---------------------------------------------------------------------------

export const ALL_CORRUPTION_MODIFIERS: CorruptionModifier[] = [
  IRONHIDE,
  SWIFTNESS,
  REGENERATION,
  FURY,
  SOULBURN,
  PARASITIC,
  REINFORCEMENTS,
  FORTIFIED,
  REVENANT,
  MIND_WARP,
  DEATH_SPLIT,
];

// ---------------------------------------------------------------------------
// Selection logic
// ---------------------------------------------------------------------------

/**
 * Determine the max tier allowed based on the current wave number.
 * Waves 1-10: tier 1 only, 11-20: tier 1+2, 21+: all tiers.
 */
function maxTierForWave(wave: number): number {
  if (wave <= 10) return 1;
  if (wave <= 20) return 2;
  return 3;
}

/**
 * Select a new modifier for the given wave.
 * Returns null if no modifier should activate this wave.
 */
export function selectModifier(
  cs: GrailCorruptionState,
  wave: number,
): CorruptionModifier | null {
  if (wave < cs.nextModifierWave) return null;

  const maxTier = maxTierForWave(wave);
  const available = ALL_CORRUPTION_MODIFIERS.filter(
    (m) => m.tier <= maxTier && !cs.usedModifierIds.has(m.id),
  );

  if (available.length === 0) return null;

  const pick = available[Math.floor(Math.random() * available.length)];
  cs.usedModifierIds.add(pick.id);
  cs.activeModifiers.push(pick);
  cs.corruptionLevel = cs.activeModifiers.length;

  // Schedule next modifier: 3-4 waves later
  cs.nextModifierWave = wave + 3 + Math.floor(Math.random() * 2);

  return pick;
}

// ---------------------------------------------------------------------------
// Runtime hooks — called from main.ts / SimLoop
// ---------------------------------------------------------------------------

/**
 * Apply all active modifiers at battle start (after units are placed).
 */
export function applyCorruptionModifiers(state: GameState, cs: GrailCorruptionState): void {
  if (!cs.enabled) return;
  setCorruptionStateRef(cs);
  // Reset per-battle state
  cs._revenantQueue = [];
  cs._reinforcementsSpawned = false;
  cs._reinforcementTimer = 0;
  cs._reinforcementUnits = [];
  cs._mindWarpTimer = 0;
  cs._mindWarpUnit = null;
  cs._battleTickCount = 0;

  for (const mod of cs.activeModifiers) {
    mod.apply(state);
  }
}

/**
 * Per-tick update for active modifiers.
 */
export function tickCorruptionModifiers(state: GameState, cs: GrailCorruptionState, dt: number): void {
  if (!cs.enabled || cs.activeModifiers.length === 0) return;
  cs._battleTickCount++;
  for (const mod of cs.activeModifiers) {
    mod.onTick?.(state, dt);
  }
}

/**
 * Unit death hook — notify all active modifiers.
 */
export function onCorruptionUnitDied(state: GameState, cs: GrailCorruptionState, unit: Unit, killerUnitId?: string): void {
  if (!cs.enabled || cs.activeModifiers.length === 0) return;
  for (const mod of cs.activeModifiers) {
    mod.onUnitDied?.(state, unit, killerUnitId);
  }
}

/**
 * Damage hook — let modifiers modify damage. Returns final damage.
 */
export function onCorruptionDamageDealt(
  state: GameState,
  cs: GrailCorruptionState,
  attacker: Unit,
  target: Unit,
  damage: number,
): number {
  if (!cs.enabled || cs.activeModifiers.length === 0) return damage;
  let d = damage;
  for (const mod of cs.activeModifiers) {
    if (mod.onDamageDealt) {
      d = mod.onDamageDealt(state, attacker, target, d);
    }
  }
  return d;
}
