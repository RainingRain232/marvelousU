// ============================================================================
// ArthurianRPGAI.ts – NPC, enemy, and wildlife AI systems
// ============================================================================

import { ElementalType } from "./ArthurianRPGConfig";
import type { WeatherModifiers } from "./ArthurianRPGState";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum AIBehaviorState {
  IDLE = "IDLE",
  PATROL = "PATROL",
  ALERT = "ALERT",
  CHASE = "CHASE",
  ATTACK = "ATTACK",
  FLEE = "FLEE",
  DEAD = "DEAD",
}

export enum NPCRoutineState {
  SLEEPING = "SLEEPING",
  WORKING = "WORKING",
  WANDERING = "WANDERING",
  GOING_HOME = "GOING_HOME",
  AT_SHOP = "AT_SHOP",
  EATING = "EATING",
  PATROLLING = "PATROLLING",
}

export enum WildlifeType {
  Wolf = "wolf",
  Deer = "deer",
  Bear = "bear",
  Boar = "boar",
  Rabbit = "rabbit",
}

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

export interface Waypoint {
  x: number;
  y: number;
  z: number;
  waitTime: number; // seconds to pause at this waypoint
}

export interface DetectionParams {
  sightRange: number;
  sightAngle: number; // half-angle in radians
  hearingRange: number;
  stealthCheckSkill: number; // threshold vs. player stealth
}

export interface EnemyAIDef {
  id: string;
  position: { x: number; y: number; z: number };
  facing: number; // yaw in radians
  patrolPath: Waypoint[];
  detection: DetectionParams;
  combatRange: number;
  fleeHpPercent: number;
  groupId: string | null; // enemies in same group coordinate
  maxHp: number;
  hp: number;
  speed: number;
  attackCooldown: number;
}

export interface NPCScheduleEntry {
  startHour: number;
  endHour: number;
  state: NPCRoutineState;
  location: { x: number; y: number; z: number };
}

export interface NPCDef {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  schedule: NPCScheduleEntry[];
  dialogueId: string | null;
  isMerchant: boolean;
  isGuard: boolean;
  isCompanion: boolean;
}

export interface BossSpecialAttack {
  id: string;
  name: string;
  damage: number;
  element: ElementalType;
  cooldown: number;
  areaRadius: number;
  windUpTime: number;
}

export interface BossEncounterDef {
  id: string;
  name: string;
  phases: BossEncounterPhase[];
  position: { x: number; y: number; z: number };
  arenaRadius: number;
}

export interface BossEncounterPhase {
  name: string;
  hpThreshold: number; // transition when HP % drops below
  specialAttacks: BossSpecialAttack[];
  canSummon: boolean;
  summonType: string;
  summonCount: number;
  summonCooldown: number;
  attackRange: number;
  moveSpeed: number;
  dialogue: string | null; // boss says something on phase transition
}

export interface WildlifeDef {
  id: string;
  type: WildlifeType;
  position: { x: number; y: number; z: number };
  packId: string | null;
  wanderRadius: number;
  speed: number;
  hp: number;
  isAggressive: boolean;
}

export interface CompanionDef {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  followDistance: number;
  teleportDistance: number;
  combatRole: "attacker" | "healer" | "defender";
}

// ---------------------------------------------------------------------------
// Detection system
// ---------------------------------------------------------------------------

export function detectPlayer(
  enemy: EnemyAIDef,
  playerX: number,
  _playerY: number,
  playerZ: number,
  playerStealthSkill: number,
  playerDetectionMult: number, // from crouching etc.
  weatherMods?: WeatherModifiers,
): "sight" | "hearing" | null {
  const dx = playerX - enemy.position.x;
  const dz = playerZ - enemy.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  // Weather modifiers for detection and stealth
  const weatherDetectionMult = weatherMods?.detectionRangeMult ?? 1.0;
  const weatherStealthMult = weatherMods?.stealthEffectivenessMult ?? 1.0;

  // Effective ranges adjusted by player stealth and weather
  const stealthFactor = Math.max(0.2, 1 - playerStealthSkill * 0.01 * weatherStealthMult) * playerDetectionMult;
  const effSight = enemy.detection.sightRange * stealthFactor * weatherDetectionMult;
  const effHearing = enemy.detection.hearingRange * stealthFactor * weatherDetectionMult;

  // Sight cone
  if (dist <= effSight) {
    const angleToPlayer = Math.atan2(dx, dz);
    let angleDiff = Math.abs(angleToPlayer - enemy.facing);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    if (angleDiff <= enemy.detection.sightAngle) {
      return "sight";
    }
  }

  // Hearing (omnidirectional)
  if (dist <= effHearing) {
    return "hearing";
  }

  return null;
}

// ---------------------------------------------------------------------------
// Enemy AI agent
// ---------------------------------------------------------------------------

export class EnemyAIAgent {
  state: AIBehaviorState = AIBehaviorState.IDLE;
  private patrolIndex = 0;
  private waitTimer = 0;
  private alertTimer = 0;
  private attackCooldownTimer = 0;
  private lastKnownPlayerPos: { x: number; z: number } | null = null;

  constructor(public def: EnemyAIDef) {
    if (def.patrolPath.length > 0) {
      this.state = AIBehaviorState.PATROL;
    }
  }

  update(
    playerPos: { x: number; y: number; z: number },
    playerStealth: number,
    playerDetectionMult: number,
    groupAlerted: boolean,
    dt: number,
    weatherMods?: WeatherModifiers,
  ): EnemyAIAction {
    if (this.def.hp <= 0) {
      this.state = AIBehaviorState.DEAD;
      return { type: "none" };
    }

    this.attackCooldownTimer = Math.max(0, this.attackCooldownTimer - dt);

    const detection = detectPlayer(
      this.def, playerPos.x, playerPos.y, playerPos.z,
      playerStealth, playerDetectionMult, weatherMods,
    );

    const dx = playerPos.x - this.def.position.x;
    const dz = playerPos.z - this.def.position.z;
    const distToPlayer = Math.sqrt(dx * dx + dz * dz);

    // Group alert overrides
    if (groupAlerted && this.state !== AIBehaviorState.CHASE && this.state !== AIBehaviorState.ATTACK) {
      this.state = AIBehaviorState.CHASE;
      this.lastKnownPlayerPos = { x: playerPos.x, z: playerPos.z };
    }

    switch (this.state) {
      case AIBehaviorState.IDLE:
        return this.updateIdle(detection, playerPos);

      case AIBehaviorState.PATROL:
        return this.updatePatrol(detection, playerPos, dt);

      case AIBehaviorState.ALERT:
        return this.updateAlert(detection, playerPos, dt);

      case AIBehaviorState.CHASE:
        return this.updateChase(playerPos, distToPlayer, dt);

      case AIBehaviorState.ATTACK:
        return this.updateAttack(playerPos, distToPlayer, dt);

      case AIBehaviorState.FLEE:
        return this.updateFlee(playerPos, distToPlayer, dt);

      case AIBehaviorState.DEAD:
        return { type: "none" };
    }
  }

  private updateIdle(
    detection: "sight" | "hearing" | null,
    playerPos: { x: number; y: number; z: number },
  ): EnemyAIAction {
    if (detection === "sight") {
      this.state = AIBehaviorState.CHASE;
      this.lastKnownPlayerPos = { x: playerPos.x, z: playerPos.z };
      return { type: "alert", callForHelp: true };
    }
    if (detection === "hearing") {
      this.state = AIBehaviorState.ALERT;
      this.alertTimer = 5;
      this.lastKnownPlayerPos = { x: playerPos.x, z: playerPos.z };
      return { type: "alert", callForHelp: false };
    }
    return { type: "none" };
  }

  private updatePatrol(
    detection: "sight" | "hearing" | null,
    playerPos: { x: number; y: number; z: number },
    dt: number,
  ): EnemyAIAction {
    if (detection === "sight") {
      this.state = AIBehaviorState.CHASE;
      this.lastKnownPlayerPos = { x: playerPos.x, z: playerPos.z };
      return { type: "alert", callForHelp: true };
    }
    if (detection === "hearing") {
      this.state = AIBehaviorState.ALERT;
      this.alertTimer = 5;
      this.lastKnownPlayerPos = { x: playerPos.x, z: playerPos.z };
    }

    // Walk toward current waypoint
    const wp = this.def.patrolPath[this.patrolIndex];
    const dx = wp.x - this.def.position.x;
    const dz = wp.z - this.def.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.5) {
      this.waitTimer += dt;
      if (this.waitTimer >= wp.waitTime) {
        this.waitTimer = 0;
        this.patrolIndex = (this.patrolIndex + 1) % this.def.patrolPath.length;
      }
      return { type: "none" };
    }

    return this.moveToward(wp.x, wp.z, this.def.speed * 0.5);
  }

  private updateAlert(
    detection: "sight" | "hearing" | null,
    playerPos: { x: number; y: number; z: number },
    dt: number,
  ): EnemyAIAction {
    if (detection === "sight") {
      this.state = AIBehaviorState.CHASE;
      this.lastKnownPlayerPos = { x: playerPos.x, z: playerPos.z };
      return { type: "alert", callForHelp: true };
    }

    this.alertTimer -= dt;
    if (this.alertTimer <= 0) {
      this.state = this.def.patrolPath.length > 0 ? AIBehaviorState.PATROL : AIBehaviorState.IDLE;
      return { type: "none" };
    }

    // Look toward last known position
    if (this.lastKnownPlayerPos) {
      return this.moveToward(
        this.lastKnownPlayerPos.x,
        this.lastKnownPlayerPos.z,
        this.def.speed * 0.3,
      );
    }
    return { type: "none" };
  }

  private updateChase(
    playerPos: { x: number; y: number; z: number },
    distToPlayer: number,
    _dt: number,
  ): EnemyAIAction {
    this.lastKnownPlayerPos = { x: playerPos.x, z: playerPos.z };

    // Check flee
    if (this.def.hp / this.def.maxHp <= this.def.fleeHpPercent) {
      this.state = AIBehaviorState.FLEE;
      return { type: "flee" };
    }

    if (distToPlayer <= this.def.combatRange) {
      this.state = AIBehaviorState.ATTACK;
      return { type: "enterCombat" };
    }

    // Lost track
    if (distToPlayer > this.def.detection.sightRange * 1.5) {
      this.state = AIBehaviorState.ALERT;
      this.alertTimer = 3;
      return { type: "none" };
    }

    return this.moveToward(playerPos.x, playerPos.z, this.def.speed);
  }

  private updateAttack(
    playerPos: { x: number; y: number; z: number },
    distToPlayer: number,
    _dt: number,
  ): EnemyAIAction {
    if (this.def.hp / this.def.maxHp <= this.def.fleeHpPercent) {
      this.state = AIBehaviorState.FLEE;
      return { type: "flee" };
    }

    if (distToPlayer > this.def.combatRange * 1.2) {
      this.state = AIBehaviorState.CHASE;
      return this.moveToward(playerPos.x, playerPos.z, this.def.speed);
    }

    if (this.attackCooldownTimer <= 0) {
      this.attackCooldownTimer = this.def.attackCooldown;
      return { type: "attack", targetX: playerPos.x, targetZ: playerPos.z };
    }

    // Circle while waiting for cooldown
    const dx = playerPos.x - this.def.position.x;
    const dz = playerPos.z - this.def.position.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    return {
      type: "move",
      targetX: this.def.position.x + (-dz / d) * this.def.speed * 0.3,
      targetZ: this.def.position.z + (dx / d) * this.def.speed * 0.3,
      speed: this.def.speed * 0.3,
    };
  }

  private updateFlee(
    playerPos: { x: number; y: number; z: number },
    distToPlayer: number,
    _dt: number,
  ): EnemyAIAction {
    if (distToPlayer > this.def.detection.sightRange * 2) {
      this.state = AIBehaviorState.IDLE;
      return { type: "none" };
    }
    const dx = this.def.position.x - playerPos.x;
    const dz = this.def.position.z - playerPos.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    return {
      type: "move",
      targetX: this.def.position.x + (dx / d) * this.def.speed,
      targetZ: this.def.position.z + (dz / d) * this.def.speed,
      speed: this.def.speed,
    };
  }

  private moveToward(tx: number, tz: number, speed: number): EnemyAIAction {
    return { type: "move", targetX: tx, targetZ: tz, speed };
  }
}

export type EnemyAIAction =
  | { type: "none" }
  | { type: "move"; targetX: number; targetZ: number; speed: number }
  | { type: "attack"; targetX: number; targetZ: number }
  | { type: "alert"; callForHelp: boolean }
  | { type: "enterCombat" }
  | { type: "flee" };

// ---------------------------------------------------------------------------
// Group AI  – enemies in the same group coordinate
// ---------------------------------------------------------------------------

export class GroupAIManager {
  private alertedGroups: Set<string> = new Set();

  alertGroup(groupId: string): void {
    this.alertedGroups.add(groupId);
  }

  isGroupAlerted(groupId: string | null): boolean {
    return groupId !== null && this.alertedGroups.has(groupId);
  }

  clearGroup(groupId: string): void {
    this.alertedGroups.delete(groupId);
  }

  clearAll(): void {
    this.alertedGroups.clear();
  }
}

// ---------------------------------------------------------------------------
// NPC Daily Routine AI
// ---------------------------------------------------------------------------

export class NPCRoutineAgent {
  currentState: NPCRoutineState = NPCRoutineState.SLEEPING;
  private currentTarget: { x: number; y: number; z: number } | null = null;

  constructor(public def: NPCDef) {}

  update(
    worldHour: number, // 0-24
    playerPos: { x: number; y: number; z: number },
    _dt: number,
  ): NPCAction {
    // Find the schedule entry for current hour
    const entry = this.findScheduleEntry(worldHour);
    if (entry) {
      this.currentState = entry.state;
      this.currentTarget = entry.location;
    }

    // Move toward scheduled location
    if (this.currentTarget) {
      const dx = this.currentTarget.x - this.def.position.x;
      const dz = this.currentTarget.z - this.def.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.5) {
        const speed = this.def.isGuard ? 3.0 : 2.0;
        return {
          type: "move",
          targetX: this.currentTarget.x,
          targetZ: this.currentTarget.z,
          speed,
        };
      }
    }

    // Check if player is close enough to trigger dialogue
    const pdx = playerPos.x - this.def.position.x;
    const pdz = playerPos.z - this.def.position.z;
    const playerDist = Math.sqrt(pdx * pdx + pdz * pdz);
    if (playerDist < 3 && this.def.dialogueId) {
      return { type: "dialogueReady", dialogueId: this.def.dialogueId };
    }

    // Guard special: look around while stationary
    if (this.def.isGuard) {
      return { type: "guardIdle" };
    }

    // Wander if in WANDERING state
    if (this.currentState === NPCRoutineState.WANDERING) {
      const angle = Math.random() * Math.PI * 2;
      const wanderDist = 2 + Math.random() * 3;
      return {
        type: "move",
        targetX: this.def.position.x + Math.sin(angle) * wanderDist,
        targetZ: this.def.position.z + Math.cos(angle) * wanderDist,
        speed: 1.5,
      };
    }

    return { type: "idle" };
  }

  private findScheduleEntry(hour: number): NPCScheduleEntry | null {
    for (const entry of this.def.schedule) {
      if (entry.startHour <= entry.endHour) {
        if (hour >= entry.startHour && hour < entry.endHour) return entry;
      } else {
        // Wraps midnight
        if (hour >= entry.startHour || hour < entry.endHour) return entry;
      }
    }
    return null;
  }
}

export type NPCAction =
  | { type: "idle" }
  | { type: "move"; targetX: number; targetZ: number; speed: number }
  | { type: "dialogueReady"; dialogueId: string }
  | { type: "guardIdle" };

// ---------------------------------------------------------------------------
// Companion Follow AI
// ---------------------------------------------------------------------------

export class CompanionFollowAgent {
  private teleportThreshold: number;

  constructor(public def: CompanionDef) {
    this.teleportThreshold = def.teleportDistance;
  }

  update(
    playerPos: { x: number; y: number; z: number },
    _dt: number,
  ): CompanionFollowAction {
    const dx = playerPos.x - this.def.position.x;
    const dz = playerPos.z - this.def.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Teleport if way too far
    if (dist > this.teleportThreshold) {
      return {
        type: "teleport",
        x: playerPos.x - (dx / dist) * this.def.followDistance,
        z: playerPos.z - (dz / dist) * this.def.followDistance,
      };
    }

    // Stay at follow distance
    if (dist > this.def.followDistance + 1) {
      const speed = dist > this.def.followDistance * 2 ? 9 : 5;
      return {
        type: "move",
        targetX: playerPos.x - (dx / dist) * this.def.followDistance,
        targetZ: playerPos.z - (dz / dist) * this.def.followDistance,
        speed,
      };
    }

    return { type: "idle" };
  }
}

export type CompanionFollowAction =
  | { type: "idle" }
  | { type: "move"; targetX: number; targetZ: number; speed: number }
  | { type: "teleport"; x: number; z: number };

// ---------------------------------------------------------------------------
// Boss Encounter Script
// ---------------------------------------------------------------------------

export class BossEncounterScript {
  private currentPhaseIdx = 0;
  private summonCooldownTimer = 0;
  private specialCooldowns: Map<string, number> = new Map();
  isActive = false;

  constructor(public def: BossEncounterDef) {}

  get currentPhase(): BossEncounterPhase {
    return this.def.phases[this.currentPhaseIdx];
  }

  activate(): string | null {
    this.isActive = true;
    this.currentPhaseIdx = 0;
    return this.currentPhase.dialogue;
  }

  update(
    bossHp: number,
    bossMaxHp: number,
    playerPos: { x: number; y: number; z: number },
    bossPos: { x: number; y: number; z: number },
    dt: number,
  ): BossScriptAction {
    if (!this.isActive) return { type: "none" };

    // Tick cooldowns
    this.summonCooldownTimer = Math.max(0, this.summonCooldownTimer - dt);
    for (const [id, cd] of this.specialCooldowns) {
      const next = cd - dt;
      if (next <= 0) this.specialCooldowns.delete(id);
      else this.specialCooldowns.set(id, next);
    }

    // Phase transition
    const hpPct = bossHp / bossMaxHp;
    for (let i = this.currentPhaseIdx + 1; i < this.def.phases.length; i++) {
      if (hpPct <= this.def.phases[i].hpThreshold) {
        this.currentPhaseIdx = i;
        const phase = this.currentPhase;
        return {
          type: "phaseTransition",
          phaseIndex: i,
          phaseName: phase.name,
          dialogue: phase.dialogue,
        };
      }
    }

    const phase = this.currentPhase;

    // Summon adds
    if (phase.canSummon && this.summonCooldownTimer <= 0) {
      this.summonCooldownTimer = phase.summonCooldown;
      return {
        type: "summonAdds",
        enemyType: phase.summonType,
        count: phase.summonCount,
        aroundX: bossPos.x,
        aroundZ: bossPos.z,
      };
    }

    // Special attacks
    for (const special of phase.specialAttacks) {
      if (!this.specialCooldowns.has(special.id)) {
        this.specialCooldowns.set(special.id, special.cooldown);
        return {
          type: "specialAttack",
          attackId: special.id,
          attackName: special.name,
          damage: special.damage,
          element: special.element,
          areaRadius: special.areaRadius,
          windUpTime: special.windUpTime,
          targetX: playerPos.x,
          targetZ: playerPos.z,
        };
      }
    }

    // Default movement / melee handled by combat AI
    const dx = playerPos.x - bossPos.x;
    const dz = playerPos.z - bossPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Keep within arena
    const arenaDx = bossPos.x - this.def.position.x;
    const arenaDz = bossPos.z - this.def.position.z;
    const arenaDistSq = arenaDx * arenaDx + arenaDz * arenaDz;
    if (arenaDistSq > this.def.arenaRadius * this.def.arenaRadius) {
      return {
        type: "move",
        targetX: this.def.position.x,
        targetZ: this.def.position.z,
        speed: phase.moveSpeed,
      };
    }

    if (dist > phase.attackRange) {
      return {
        type: "move",
        targetX: playerPos.x,
        targetZ: playerPos.z,
        speed: phase.moveSpeed,
      };
    }

    return { type: "meleeAttack" };
  }

  deactivate(): void {
    this.isActive = false;
  }
}

export type BossScriptAction =
  | { type: "none" }
  | { type: "move"; targetX: number; targetZ: number; speed: number }
  | { type: "meleeAttack" }
  | { type: "phaseTransition"; phaseIndex: number; phaseName: string; dialogue: string | null }
  | { type: "summonAdds"; enemyType: string; count: number; aroundX: number; aroundZ: number }
  | {
      type: "specialAttack";
      attackId: string;
      attackName: string;
      damage: number;
      element: ElementalType;
      areaRadius: number;
      windUpTime: number;
      targetX: number;
      targetZ: number;
    };

// ---------------------------------------------------------------------------
// Wildlife AI
// ---------------------------------------------------------------------------

export class WildlifeAgent {
  state: AIBehaviorState = AIBehaviorState.IDLE;
  private wanderTarget: { x: number; z: number } | null = null;
  private wanderTimer = 0;
  private origin: { x: number; z: number };

  constructor(public def: WildlifeDef) {
    this.origin = { x: def.position.x, z: def.position.z };
  }

  update(
    playerPos: { x: number; y: number; z: number },
    packAlerted: boolean,
    dt: number,
  ): WildlifeAction {
    if (this.def.hp <= 0) {
      this.state = AIBehaviorState.DEAD;
      return { type: "none" };
    }

    const dx = playerPos.x - this.def.position.x;
    const dz = playerPos.z - this.def.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Aggressive wildlife (wolves, bears)
    if (this.def.isAggressive) {
      if (dist < 15 || packAlerted) {
        this.state = AIBehaviorState.CHASE;
      }
      if (this.state === AIBehaviorState.CHASE) {
        if (dist <= 2) {
          return { type: "attack" };
        }
        return {
          type: "move",
          targetX: playerPos.x,
          targetZ: playerPos.z,
          speed: this.def.speed,
        };
      }
    }

    // Passive wildlife (deer, rabbits) – flee
    if (!this.def.isAggressive && dist < 10) {
      this.state = AIBehaviorState.FLEE;
      const d = dist || 1;
      return {
        type: "move",
        targetX: this.def.position.x - (dx / d) * 20,
        targetZ: this.def.position.z - (dz / d) * 20,
        speed: this.def.speed * 1.5,
      };
    }

    // Wander
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0 || !this.wanderTarget) {
      this.wanderTimer = 3 + Math.random() * 5;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * this.def.wanderRadius;
      this.wanderTarget = {
        x: this.origin.x + Math.sin(angle) * r,
        z: this.origin.z + Math.cos(angle) * r,
      };
    }

    const wdx = this.wanderTarget.x - this.def.position.x;
    const wdz = this.wanderTarget.z - this.def.position.z;
    if (wdx * wdx + wdz * wdz < 1) {
      return { type: "none" };
    }

    return {
      type: "move",
      targetX: this.wanderTarget.x,
      targetZ: this.wanderTarget.z,
      speed: this.def.speed * 0.4,
    };
  }
}

export type WildlifeAction =
  | { type: "none" }
  | { type: "move"; targetX: number; targetZ: number; speed: number }
  | { type: "attack" };

// ---------------------------------------------------------------------------
// Master AI System  (orchestrates all agents each frame)
// ---------------------------------------------------------------------------

export class ArthurianRPGAISystem {
  private enemies: EnemyAIAgent[] = [];
  private npcs: NPCRoutineAgent[] = [];
  private companions: CompanionFollowAgent[] = [];
  private wildlife: WildlifeAgent[] = [];
  private bossEncounters: BossEncounterScript[] = [];
  private groupManager = new GroupAIManager();

  // Registration ----------------------------------------------------------

  addEnemy(def: EnemyAIDef): void {
    this.enemies.push(new EnemyAIAgent(def));
  }

  addNPC(def: NPCDef): void {
    this.npcs.push(new NPCRoutineAgent(def));
  }

  addCompanion(def: CompanionDef): void {
    this.companions.push(new CompanionFollowAgent(def));
  }

  addWildlife(def: WildlifeDef): void {
    this.wildlife.push(new WildlifeAgent(def));
  }

  addBossEncounter(def: BossEncounterDef): void {
    this.bossEncounters.push(new BossEncounterScript(def));
  }

  // Main update -----------------------------------------------------------

  update(
    playerPos: { x: number; y: number; z: number },
    playerStealth: number,
    playerDetectionMult: number,
    worldHour: number,
    dt: number,
    weatherMods?: WeatherModifiers,
  ): AIFrameResult {
    const result: AIFrameResult = {
      enemyActions: [],
      npcActions: [],
      companionActions: [],
      wildlifeActions: [],
      bossActions: [],
    };

    // Enemies
    for (const agent of this.enemies) {
      const action = agent.update(
        playerPos, playerStealth, playerDetectionMult,
        this.groupManager.isGroupAlerted(agent.def.groupId),
        dt, weatherMods,
      );
      if (action.type === "alert" && action.callForHelp && agent.def.groupId) {
        this.groupManager.alertGroup(agent.def.groupId);
      }
      result.enemyActions.push({ id: agent.def.id, action, state: agent.state });
    }

    // NPCs
    for (const agent of this.npcs) {
      const action = agent.update(worldHour, playerPos, dt);
      result.npcActions.push({ id: agent.def.id, name: agent.def.name, action });
    }

    // Companions
    for (const agent of this.companions) {
      const action = agent.update(playerPos, dt);
      result.companionActions.push({ id: agent.def.id, name: agent.def.name, action });
    }

    // Wildlife
    const alertedPacks = new Set<string>();
    for (const agent of this.wildlife) {
      if (agent.state === AIBehaviorState.CHASE && agent.def.packId) {
        alertedPacks.add(agent.def.packId);
      }
    }
    for (const agent of this.wildlife) {
      const packAlerted = agent.def.packId !== null && alertedPacks.has(agent.def.packId);
      const action = agent.update(playerPos, packAlerted, dt);
      result.wildlifeActions.push({ id: agent.def.id, type: agent.def.type, action });
    }

    // Boss encounters
    for (const boss of this.bossEncounters) {
      if (!boss.isActive) continue;
      const bossPos = boss.def.position; // simplified
      const action = boss.update(0, 1, playerPos, bossPos, dt); // HP updated externally
      result.bossActions.push({ id: boss.def.id, name: boss.def.name, action });
    }

    return result;
  }

  // Queries ---------------------------------------------------------------

  getEnemyAgent(id: string): EnemyAIAgent | undefined {
    return this.enemies.find((e) => e.def.id === id);
  }

  activateBossEncounter(id: string): string | null {
    const boss = this.bossEncounters.find((b) => b.def.id === id);
    return boss ? boss.activate() : null;
  }

  clearDeadEnemies(): string[] {
    const dead = this.enemies.filter((e) => e.state === AIBehaviorState.DEAD).map((e) => e.def.id);
    this.enemies = this.enemies.filter((e) => e.state !== AIBehaviorState.DEAD);
    return dead;
  }
}

export interface AIFrameResult {
  enemyActions: { id: string; action: EnemyAIAction; state: AIBehaviorState }[];
  npcActions: { id: string; name: string; action: NPCAction }[];
  companionActions: { id: string; name: string; action: CompanionFollowAction }[];
  wildlifeActions: { id: string; type: WildlifeType; action: WildlifeAction }[];
  bossActions: { id: string; name: string; action: BossScriptAction }[];
}
