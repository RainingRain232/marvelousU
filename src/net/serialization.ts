// Serialize / deserialize GameState for network transport.
//
// Converts Maps → Records, Sets → arrays, strips non-serializable fields
// (StateMachine, Ability.execute). The server sends serialized snapshots;
// the client deserializes them back into a live GameState.

import type { GameState } from "@sim/state/GameState";
import type { Unit } from "@sim/entities/Unit";
import { UNIT_TRANSITIONS } from "@sim/entities/Unit";
import type { Building } from "@sim/entities/Building";
import type { Base } from "@sim/entities/Base";
import type { Projectile } from "@sim/entities/Projectile";
import type { PlayerState } from "@sim/state/PlayerState";
import { StateMachine } from "@sim/core/StateMachine";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { UnitState } from "@/types";
import type {
  SerializedGameState,
  SerializedUnit,
  SerializedBuilding,
  SerializedBase,
  SerializedProjectile,
  SerializedPlayer,
} from "@net/protocol";

// ---------------------------------------------------------------------------
// Serialize (GameState → SerializedGameState)
// ---------------------------------------------------------------------------

export function serializeState(state: GameState): SerializedGameState {
  const bases: Record<string, SerializedBase> = {};
  for (const [id, base] of state.bases) {
    bases[id] = serializeBase(base);
  }

  const buildings: Record<string, SerializedBuilding> = {};
  for (const [id, building] of state.buildings) {
    buildings[id] = serializeBuilding(building);
  }

  const units: Record<string, SerializedUnit> = {};
  for (const [id, unit] of state.units) {
    units[id] = serializeUnit(unit);
  }

  const projectiles: Record<string, SerializedProjectile> = {};
  for (const [id, proj] of state.projectiles) {
    projectiles[id] = serializeProjectile(proj);
  }

  const players: Record<string, SerializedPlayer> = {};
  for (const [id, player] of state.players) {
    players[id] = serializePlayer(player);
  }

  const rallyFlags: Record<string, { x: number; y: number }> = {};
  for (const [id, pos] of state.rallyFlags) {
    rallyFlags[id] = { x: pos.x, y: pos.y };
  }

  return {
    phase: state.phase,
    gameMode: state.gameMode,
    tick: state.tick,
    phaseTimer: state.phaseTimer,
    eventTimer: state.eventTimer,
    winnerId: state.winnerId,
    playerCount: state.playerCount,
    bases,
    buildings,
    units,
    projectiles,
    players,
    alliances: [...state.alliances],
    rallyFlags,
  };
}

// ---------------------------------------------------------------------------
// Entity serializers
// ---------------------------------------------------------------------------

function serializeUnit(u: Unit): SerializedUnit {
  return {
    id: u.id,
    type: u.type,
    owner: u.owner,
    position: { x: u.position.x, y: u.position.y },
    facingDirection: u.facingDirection,
    hp: u.hp,
    maxHp: u.maxHp,
    atk: u.atk,
    speed: u.speed,
    range: u.range,
    state: u.state,
    targetId: u.targetId,
    attackTimer: u.attackTimer,
    castTimer: u.castTimer,
    deathTimer: u.deathTimer,
    lifespanTimer: u.lifespanTimer,
    siegeOnly: u.siegeOnly,
    homeguard: u.homeguard,
    slowFactor: u.slowFactor,
    slowTimer: u.slowTimer,
    xp: u.xp,
    level: u.level,
    abilityIds: [...u.abilityIds],
    path: u.path ? u.path.map((p) => ({ x: p.x, y: p.y })) : null,
    pathIndex: u.pathIndex,
    groupId: u.groupId,
    formationOffset: { x: u.formationOffset.x, y: u.formationOffset.y },
  };
}

function serializeBuilding(b: Building): SerializedBuilding {
  return {
    id: b.id,
    type: b.type,
    owner: b.owner,
    position: { x: b.position.x, y: b.position.y },
    linkedBaseId: b.linkedBaseId,
    state: b.state,
    health: b.health,
    maxHealth: b.maxHealth,
    captureProgress: b.captureProgress,
    capturePlayerId: b.capturePlayerId,
    shopInventory: [...b.shopInventory],
    blueprints: [...b.blueprints],
    upgradeInventory: [...b.upgradeInventory],
    spawnQueue: {
      buildingId: b.spawnQueue.buildingId,
      entries: b.spawnQueue.entries.map((e) => ({
        unitType: e.unitType,
        remainingTime: e.remainingTime,
      })),
      groupThreshold: b.spawnQueue.groupThreshold,
      readyUnits: [...b.spawnQueue.readyUnits],
      queueEnabled: b.spawnQueue.queueEnabled,
    },
    turrets: b.turrets.map((t) => ({
      projectileTag: t.projectileTag,
      damage: t.damage,
      range: t.range,
      attackSpeed: t.attackSpeed,
      attackTimer: t.attackTimer,
      targetId: t.targetId,
    })),
  };
}

function serializeBase(b: Base): SerializedBase {
  return {
    id: b.id,
    direction: b.direction,
    owner: b.owner,
    health: b.health,
    maxHealth: b.maxHealth,
    position: { x: b.position.x, y: b.position.y },
    spawnOffset: { x: b.spawnOffset.x, y: b.spawnOffset.y },
    castleId: b.castleId,
  };
}

function serializeProjectile(p: Projectile): SerializedProjectile {
  return {
    id: p.id,
    abilityId: p.abilityId,
    ownerId: p.ownerId,
    ownerPlayerId: p.ownerPlayerId,
    origin: { x: p.origin.x, y: p.origin.y },
    target: { x: p.target.x, y: p.target.y },
    position: { x: p.position.x, y: p.position.y },
    speed: p.speed,
    damage: p.damage,
    aoeRadius: p.aoeRadius,
    targetId: p.targetId,
    hitIds: [...p.hitIds],
    slowDuration: p.slowDuration,
    slowFactor: p.slowFactor,
  };
}

function serializePlayer(p: PlayerState): SerializedPlayer {
  return {
    id: p.id,
    gold: p.gold,
    goldAccum: p.goldAccum,
    direction: p.direction,
    slot: p.slot,
    isAI: p.isAI,
    ownedBaseId: p.ownedBaseId,
    ownedBuildings: [...p.ownedBuildings],
  };
}

// ---------------------------------------------------------------------------
// Deserialize (SerializedGameState → patch onto live GameState)
// ---------------------------------------------------------------------------

/**
 * Apply a serialized snapshot onto an existing GameState.
 * This overwrites entity maps and scalar fields but preserves the
 * battlefield grid (which doesn't change during a game) and non-serializable
 * fields like StateMachine instances on units.
 *
 * For units that already exist in the live state, we update fields in-place
 * to preserve the StateMachine reference. New units get a fresh StateMachine.
 */
export function applySnapshot(
  state: GameState,
  snapshot: SerializedGameState,
): void {
  // Scalar fields
  state.phase = snapshot.phase;
  state.gameMode = snapshot.gameMode;
  state.tick = snapshot.tick;
  state.phaseTimer = snapshot.phaseTimer;
  state.eventTimer = snapshot.eventTimer;
  state.winnerId = snapshot.winnerId;
  state.playerCount = snapshot.playerCount;

  // Alliances
  state.alliances.clear();
  for (const key of snapshot.alliances) {
    state.alliances.add(key);
  }

  // Rally flags
  state.rallyFlags.clear();
  for (const [id, pos] of Object.entries(snapshot.rallyFlags)) {
    state.rallyFlags.set(id, { x: pos.x, y: pos.y });
  }

  // Players
  for (const [id, sp] of Object.entries(snapshot.players)) {
    const existing = state.players.get(id);
    if (existing) {
      existing.gold = sp.gold;
      existing.goldAccum = sp.goldAccum;
      existing.ownedBaseId = sp.ownedBaseId;
      existing.ownedBuildings = [...sp.ownedBuildings];
    }
  }

  // Bases
  for (const [id, sb] of Object.entries(snapshot.bases)) {
    const existing = state.bases.get(id);
    if (existing) {
      existing.health = sb.health;
      existing.maxHealth = sb.maxHealth;
      existing.castleId = sb.castleId;
    }
  }

  // Buildings — update existing, add new, remove gone
  const snapshotBuildingIds = new Set(Object.keys(snapshot.buildings));
  for (const id of state.buildings.keys()) {
    if (!snapshotBuildingIds.has(id)) {
      state.buildings.delete(id);
    }
  }
  for (const [id, sb] of Object.entries(snapshot.buildings)) {
    const existing = state.buildings.get(id);
    if (existing) {
      _patchBuilding(existing, sb);
    } else {
      state.buildings.set(id, _deserializeBuilding(sb));
    }
  }

  // Units — update existing, add new, remove gone
  const snapshotUnitIds = new Set(Object.keys(snapshot.units));
  for (const id of state.units.keys()) {
    if (!snapshotUnitIds.has(id)) {
      state.units.delete(id);
    }
  }
  for (const [id, su] of Object.entries(snapshot.units)) {
    const existing = state.units.get(id);
    if (existing) {
      _patchUnit(existing, su);
    } else {
      state.units.set(id, _deserializeUnit(su));
    }
  }

  // Projectiles — full replace (short-lived, not worth patching)
  state.projectiles.clear();
  for (const [id, sp] of Object.entries(snapshot.projectiles)) {
    state.projectiles.set(id, _deserializeProjectile(sp));
  }

  // Abilities are NOT serialized — they are reconstructed lazily by AbilitySystem
}

// ---------------------------------------------------------------------------
// Patch helpers (update in-place to preserve references)
// ---------------------------------------------------------------------------

function _patchUnit(unit: Unit, su: SerializedUnit): void {
  unit.position.x = su.position.x;
  unit.position.y = su.position.y;
  unit.facingDirection = su.facingDirection;
  unit.hp = su.hp;
  unit.maxHp = su.maxHp;
  unit.atk = su.atk;
  unit.speed = su.speed;
  unit.range = su.range;
  unit.state = su.state;
  unit.targetId = su.targetId;
  unit.attackTimer = su.attackTimer;
  unit.castTimer = su.castTimer;
  unit.deathTimer = su.deathTimer;
  unit.lifespanTimer = su.lifespanTimer;
  unit.slowFactor = su.slowFactor;
  unit.slowTimer = su.slowTimer;
  unit.xp = su.xp;
  unit.level = su.level;
  unit.abilityIds = [...su.abilityIds];
  unit.path = su.path ? su.path.map((p) => ({ x: p.x, y: p.y })) : null;
  unit.pathIndex = su.pathIndex;
  unit.groupId = su.groupId;
  unit.formationOffset.x = su.formationOffset.x;
  unit.formationOffset.y = su.formationOffset.y;
}

function _patchBuilding(b: Building, sb: SerializedBuilding): void {
  b.owner = sb.owner;
  b.state = sb.state;
  b.health = sb.health;
  b.maxHealth = sb.maxHealth;
  b.captureProgress = sb.captureProgress;
  b.capturePlayerId = sb.capturePlayerId;
  b.shopInventory = [...sb.shopInventory];
  b.blueprints = [...sb.blueprints];
  b.upgradeInventory = [...sb.upgradeInventory];
  b.spawnQueue.entries = sb.spawnQueue.entries.map((e) => ({
    unitType: e.unitType,
    remainingTime: e.remainingTime,
  }));
  b.spawnQueue.groupThreshold = sb.spawnQueue.groupThreshold;
  b.spawnQueue.readyUnits = [...sb.spawnQueue.readyUnits];
  b.spawnQueue.queueEnabled = sb.spawnQueue.queueEnabled;
  for (let i = 0; i < b.turrets.length && i < sb.turrets.length; i++) {
    b.turrets[i].attackTimer = sb.turrets[i].attackTimer;
    b.turrets[i].targetId = sb.turrets[i].targetId;
  }
}

// ---------------------------------------------------------------------------
// Deserialize helpers (create new entities from serialized data)
// ---------------------------------------------------------------------------

function _deserializeUnit(su: SerializedUnit): Unit {
  const def = UNIT_DEFINITIONS[su.type];
  const stateMachine = new StateMachine<UnitState>(
    su.state,
    UNIT_TRANSITIONS,
  );

  return {
    id: su.id,
    type: su.type,
    owner: su.owner,
    position: { x: su.position.x, y: su.position.y },
    facingDirection: su.facingDirection,
    hp: su.hp,
    maxHp: su.maxHp,
    atk: su.atk,
    speed: su.speed,
    range: su.range,
    state: su.state,
    stateMachine,
    targetId: su.targetId,
    attackTimer: su.attackTimer,
    castTimer: su.castTimer,
    deathTimer: su.deathTimer,
    lifespanTimer: su.lifespanTimer,
    siegeOnly: su.siegeOnly,
    huntTargets: def?.huntTargets ?? [],
    diplomatOnly: def?.diplomatOnly ?? false,
    homeguard: su.homeguard,
    homeguardOrigin: null,
    slowFactor: su.slowFactor,
    slowTimer: su.slowTimer,
    idleInterruptionTimer: 0,
    nextIdleInterruptionTimer: 4,
    xp: su.xp,
    level: su.level,
    abilityIds: [...su.abilityIds],
    path: su.path ? su.path.map((p) => ({ x: p.x, y: p.y })) : null,
    pathIndex: su.pathIndex,
    groupId: su.groupId,
    formationOffset: { x: su.formationOffset.x, y: su.formationOffset.y },
    hasCharged: false,
    pathFailCount: 0,
    regenRate: def?.regenRate ?? 0,
    regenAccumulator: 0,
  };
}

function _deserializeBuilding(sb: SerializedBuilding): Building {
  return {
    id: sb.id,
    type: sb.type,
    owner: sb.owner,
    position: { x: sb.position.x, y: sb.position.y },
    linkedBaseId: sb.linkedBaseId,
    state: sb.state,
    health: sb.health,
    maxHealth: sb.maxHealth,
    captureProgress: sb.captureProgress,
    capturePlayerId: sb.capturePlayerId,
    shopInventory: [...sb.shopInventory],
    blueprints: [...sb.blueprints],
    upgradeInventory: [...sb.upgradeInventory],
    spawnQueue: {
      buildingId: sb.spawnQueue.buildingId,
      entries: sb.spawnQueue.entries.map((e) => ({
        unitType: e.unitType,
        remainingTime: e.remainingTime,
      })),
      groupThreshold: sb.spawnQueue.groupThreshold,
      readyUnits: [...sb.spawnQueue.readyUnits],
      queueEnabled: sb.spawnQueue.queueEnabled,
    },
    turrets: sb.turrets.map((t) => ({
      projectileTag: t.projectileTag,
      damage: t.damage,
      range: t.range,
      attackSpeed: t.attackSpeed,
      attackTimer: t.attackTimer,
      targetId: t.targetId,
    })),
  };
}

function _deserializeProjectile(sp: SerializedProjectile): Projectile {
  return {
    id: sp.id,
    abilityId: sp.abilityId,
    ownerId: sp.ownerId,
    ownerPlayerId: sp.ownerPlayerId,
    origin: { x: sp.origin.x, y: sp.origin.y },
    target: { x: sp.target.x, y: sp.target.y },
    position: { x: sp.position.x, y: sp.position.y },
    speed: sp.speed,
    damage: sp.damage,
    aoeRadius: sp.aoeRadius,
    bounceTargets: [],
    maxBounces: 0,
    bounceRange: 0,
    targetId: sp.targetId,
    hitIds: new Set(sp.hitIds),
    slowDuration: sp.slowDuration,
    slowFactor: sp.slowFactor,
    teleportDistance: 0,
  };
}
