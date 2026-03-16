// ============================================================================
// ArthurianRPGCompanionAI.ts – Tactical companion combat AI with roles
// ============================================================================

import type { CompanionCombatRole, CompanionState, CombatantState, Vec3 } from "./ArthurianRPGState";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FORMATION_MIN_DIST = 3;
const FORMATION_MAX_DIST = 5;
const HEALER_RANGE = 8;
const HEALER_HEAL_THRESHOLD = 0.5;     // heal when player below 50% HP
const FLEE_HP_THRESHOLD = 0.2;          // disengage at 20% HP
const HEAL_COOLDOWN = 4.0;             // seconds between heals
const HEAL_AMOUNT = 25;
const HEAVY_ATTACK_MULT = 1.8;
const BLOCK_CHANCE_DEFENDER = 0.6;
const TAUNT_COOLDOWN = 8.0;
const CALLOUT_COOLDOWN = 5.0;

// ---------------------------------------------------------------------------
// Action types returned by the companion AI
// ---------------------------------------------------------------------------

export type CompanionCombatAction =
  | { type: "idle" }
  | { type: "move"; targetX: number; targetZ: number; speed: number }
  | { type: "attack"; targetId: string; isHeavy: boolean; damage: number }
  | { type: "heal"; targetId: string; amount: number }
  | { type: "block" }
  | { type: "taunt"; targetId: string }
  | { type: "flee"; awayX: number; awayZ: number; speed: number }
  | { type: "teleport"; x: number; z: number }
  | { type: "callout"; message: string };

// ---------------------------------------------------------------------------
// Companion Combat AI Agent
// ---------------------------------------------------------------------------

export class CompanionCombatAIAgent {
  private healCooldown = 0;
  private tauntCooldown = 0;
  private calloutCooldown = 0;
  private attackCooldown = 0;
  private lastCallout = "";

  constructor(
    public companionId: string,
    public role: CompanionCombatRole,
  ) {}

  /**
   * Main update – returns the best action for this companion this frame.
   */
  update(
    companion: CompanionState,
    playerState: CombatantState,
    enemies: CombatantState[],
    playerTargetId: string | null,
    dt: number,
  ): CompanionCombatAction {
    // Tick cooldowns
    this.healCooldown = Math.max(0, this.healCooldown - dt);
    this.tauntCooldown = Math.max(0, this.tauntCooldown - dt);
    this.calloutCooldown = Math.max(0, this.calloutCooldown - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    if (!companion.isAlive) {
      return { type: "idle" };
    }

    const aliveEnemies = enemies.filter(e => e.hp > 0);
    const companionPos = companion.combatant.position;
    const playerPos = playerState.position;
    const distToPlayer = dist3(companionPos, playerPos);
    const companionHpPct = companion.hp / companion.maxHp;

    // --- Teleport if too far from player ---
    if (distToPlayer > 30) {
      const dir = normalize(playerPos.x - companionPos.x, playerPos.z - companionPos.z);
      return {
        type: "teleport",
        x: playerPos.x - dir.x * FORMATION_MIN_DIST,
        z: playerPos.z - dir.z * FORMATION_MIN_DIST,
      };
    }

    // --- Flee if below 20% HP ---
    if (companionHpPct < FLEE_HP_THRESHOLD && aliveEnemies.length > 0) {
      const nearestEnemy = this.findNearest(companionPos, aliveEnemies);
      if (nearestEnemy) {
        const away = normalize(
          companionPos.x - nearestEnemy.position.x,
          companionPos.z - nearestEnemy.position.z,
        );
        // Emit callout
        if (this.calloutCooldown <= 0) {
          this.calloutCooldown = CALLOUT_COOLDOWN;
          return { type: "callout", message: `${companion.name}: I'm badly wounded! Falling back!` };
        }
        return {
          type: "flee",
          awayX: companionPos.x + away.x * 10,
          awayZ: companionPos.z + away.z * 10,
          speed: 7,
        };
      }
    }

    // --- Callouts: enemy positions, low health warnings ---
    if (this.calloutCooldown <= 0 && aliveEnemies.length > 0) {
      const callout = this.generateCallout(companion, playerState, aliveEnemies);
      if (callout && callout !== this.lastCallout) {
        this.calloutCooldown = CALLOUT_COOLDOWN;
        this.lastCallout = callout;
        return { type: "callout", message: callout };
      }
    }

    // --- Role-specific behavior ---
    switch (this.role) {
      case "attacker":
        return this.updateAttacker(companion, playerState, aliveEnemies, playerTargetId, distToPlayer);
      case "healer":
        return this.updateHealer(companion, playerState, aliveEnemies, distToPlayer);
      case "defender":
        return this.updateDefender(companion, playerState, aliveEnemies, distToPlayer);
      default:
        return this.updateAttacker(companion, playerState, aliveEnemies, playerTargetId, distToPlayer);
    }
  }

  // =========================================================================
  // ATTACKER ROLE
  // =========================================================================

  private updateAttacker(
    companion: CompanionState,
    playerState: CombatantState,
    enemies: CombatantState[],
    playerTargetId: string | null,
    distToPlayer: number,
  ): CompanionCombatAction {
    if (enemies.length === 0) {
      return this.maintainFormation(companion.combatant.position, playerState.position, distToPlayer);
    }

    // Prioritize player's current target
    let target: CombatantState | null = null;
    if (playerTargetId) {
      target = enemies.find(e => e.id === playerTargetId && e.hp > 0) ?? null;
    }
    // Fallback: nearest enemy
    if (!target) {
      target = this.findNearest(companion.combatant.position, enemies);
    }
    if (!target) {
      return this.maintainFormation(companion.combatant.position, playerState.position, distToPlayer);
    }

    const distToTarget = dist3(companion.combatant.position, target.position);

    // Move into flanking position (offset from player-enemy line)
    if (distToTarget > 3) {
      const flankPos = this.getFlankPosition(playerState.position, target.position);
      return {
        type: "move",
        targetX: flankPos.x,
        targetZ: flankPos.z,
        speed: 6,
      };
    }

    // Attack
    if (this.attackCooldown <= 0) {
      this.attackCooldown = 0.8;
      // Use heavy attack on staggered foes
      const isStaggered = (target as any).isStaggered || false;
      const isHeavy = isStaggered;
      const baseDmg = 8 + companion.level * 2;
      const damage = Math.floor(baseDmg * (isHeavy ? HEAVY_ATTACK_MULT : 1));
      return { type: "attack", targetId: target.id, isHeavy, damage };
    }

    // Circle target while on cooldown
    return this.circleTarget(companion.combatant.position, target.position);
  }

  // =========================================================================
  // HEALER ROLE
  // =========================================================================

  private updateHealer(
    companion: CompanionState,
    playerState: CombatantState,
    enemies: CombatantState[],
    distToPlayer: number,
  ): CompanionCombatAction {
    const playerHpPct = playerState.hp / playerState.maxHp;

    // Priority 1: Heal player when below threshold
    if (playerHpPct < HEALER_HEAL_THRESHOLD && this.healCooldown <= 0 && companion.mp >= 10) {
      this.healCooldown = HEAL_COOLDOWN;
      return { type: "heal", targetId: "player", amount: HEAL_AMOUNT + companion.level * 2 };
    }

    // Priority 2: Stay at range from enemies
    if (enemies.length > 0) {
      const nearestEnemy = this.findNearest(companion.combatant.position, enemies);
      if (nearestEnemy) {
        const distToEnemy = dist3(companion.combatant.position, nearestEnemy.position);
        // Flee if enemy is too close
        if (distToEnemy < HEALER_RANGE * 0.5) {
          const away = normalize(
            companion.combatant.position.x - nearestEnemy.position.x,
            companion.combatant.position.z - nearestEnemy.position.z,
          );
          return {
            type: "flee",
            awayX: companion.combatant.position.x + away.x * 5,
            awayZ: companion.combatant.position.z + away.z * 5,
            speed: 6,
          };
        }
      }
    }

    // Priority 3: Stay near player but at safe distance
    if (distToPlayer > FORMATION_MAX_DIST + 2) {
      const dir = normalize(
        playerState.position.x - companion.combatant.position.x,
        playerState.position.z - companion.combatant.position.z,
      );
      return {
        type: "move",
        targetX: playerState.position.x - dir.x * FORMATION_MAX_DIST,
        targetZ: playerState.position.z - dir.z * FORMATION_MAX_DIST,
        speed: 5,
      };
    }

    return { type: "idle" };
  }

  // =========================================================================
  // DEFENDER ROLE
  // =========================================================================

  private updateDefender(
    companion: CompanionState,
    playerState: CombatantState,
    enemies: CombatantState[],
    distToPlayer: number,
  ): CompanionCombatAction {
    if (enemies.length === 0) {
      return this.maintainFormation(companion.combatant.position, playerState.position, distToPlayer);
    }

    // Find nearest threat to player
    const nearestThreat = this.findNearest(playerState.position, enemies);
    if (!nearestThreat) {
      return this.maintainFormation(companion.combatant.position, playerState.position, distToPlayer);
    }

    // Position between player and nearest threat
    const interposePos = {
      x: (playerState.position.x + nearestThreat.position.x) / 2,
      z: (playerState.position.z + nearestThreat.position.z) / 2,
    };
    const distToInterpose = Math.sqrt(
      (companion.combatant.position.x - interposePos.x) ** 2 +
      (companion.combatant.position.z - interposePos.z) ** 2,
    );

    // Move to interpose position
    if (distToInterpose > 2) {
      return {
        type: "move",
        targetX: interposePos.x,
        targetZ: interposePos.z,
        speed: 6,
      };
    }

    // Taunt to draw aggro
    if (this.tauntCooldown <= 0) {
      this.tauntCooldown = TAUNT_COOLDOWN;
      return { type: "taunt", targetId: nearestThreat.id };
    }

    // Block frequently
    if (Math.random() < BLOCK_CHANCE_DEFENDER) {
      return { type: "block" };
    }

    // Counter-attack
    const distToThreat = dist3(companion.combatant.position, nearestThreat.position);
    if (distToThreat < 3 && this.attackCooldown <= 0) {
      this.attackCooldown = 1.0;
      const damage = Math.floor(6 + companion.level * 1.5);
      return { type: "attack", targetId: nearestThreat.id, isHeavy: false, damage };
    }

    return { type: "block" };
  }

  // =========================================================================
  // Shared helpers
  // =========================================================================

  private maintainFormation(
    companionPos: Vec3,
    playerPos: Vec3,
    distToPlayer: number,
  ): CompanionCombatAction {
    if (distToPlayer < FORMATION_MIN_DIST) {
      return { type: "idle" };
    }
    if (distToPlayer > FORMATION_MAX_DIST) {
      const dir = normalize(playerPos.x - companionPos.x, playerPos.z - companionPos.z);
      const speed = distToPlayer > FORMATION_MAX_DIST * 2 ? 8 : 5;
      return {
        type: "move",
        targetX: playerPos.x - dir.x * FORMATION_MIN_DIST,
        targetZ: playerPos.z - dir.z * FORMATION_MIN_DIST,
        speed,
      };
    }
    return { type: "idle" };
  }

  private findNearest(pos: Vec3, entities: CombatantState[]): CombatantState | null {
    let best: CombatantState | null = null;
    let bestDist = Infinity;
    for (const e of entities) {
      const d = dist3(pos, e.position);
      if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
  }

  private getFlankPosition(playerPos: Vec3, enemyPos: Vec3): { x: number; z: number } {
    const dx = enemyPos.x - playerPos.x;
    const dz = enemyPos.z - playerPos.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    // Perpendicular offset for flanking
    const perpX = -dz / d;
    const perpZ = dx / d;
    return {
      x: enemyPos.x + perpX * 2,
      z: enemyPos.z + perpZ * 2,
    };
  }

  private circleTarget(companionPos: Vec3, targetPos: Vec3): CompanionCombatAction {
    const dx = targetPos.x - companionPos.x;
    const dz = targetPos.z - companionPos.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    return {
      type: "move",
      targetX: companionPos.x + (-dz / d) * 2,
      targetZ: companionPos.z + (dx / d) * 2,
      speed: 3,
    };
  }

  private generateCallout(
    companion: CompanionState,
    playerState: CombatantState,
    enemies: CombatantState[],
  ): string | null {
    const playerHpPct = playerState.hp / playerState.maxHp;

    // Warn about player low health
    if (playerHpPct < 0.3) {
      return `${companion.name}: Watch your health! You're badly hurt!`;
    }

    // Call out enemy flanking (enemies behind player)
    for (const enemy of enemies) {
      const toEnemyX = enemy.position.x - playerState.position.x;
      const toEnemyZ = enemy.position.z - playerState.position.z;
      const toCompX = companion.combatant.position.x - playerState.position.x;
      const toCompZ = companion.combatant.position.z - playerState.position.z;
      // Rough check: enemy on opposite side of companion from player
      if (toEnemyX * toCompX + toEnemyZ * toCompZ < -5) {
        return `${companion.name}: Enemy behind you!`;
      }
    }

    // Call out multiple enemies
    if (enemies.length >= 4) {
      return `${companion.name}: We're surrounded! Stay close!`;
    }

    // Call out enemy low health
    for (const enemy of enemies) {
      if (enemy.hp > 0 && enemy.hp / enemy.maxHp < 0.2) {
        return `${companion.name}: That ${enemy.name} is almost finished!`;
      }
    }

    return null;
  }

  /**
   * Change the companion's combat role at runtime.
   */
  setRole(role: CompanionCombatRole): void {
    this.role = role;
    this.healCooldown = 0;
    this.tauntCooldown = 0;
    this.attackCooldown = 0;
  }
}

// ---------------------------------------------------------------------------
// Companion Combat AI Manager – manages all active companion AI agents
// ---------------------------------------------------------------------------

export class CompanionCombatAIManager {
  private agents: Map<string, CompanionCombatAIAgent> = new Map();

  addCompanion(id: string, role: CompanionCombatRole): CompanionCombatAIAgent {
    const agent = new CompanionCombatAIAgent(id, role);
    this.agents.set(id, agent);
    return agent;
  }

  removeCompanion(id: string): void {
    this.agents.delete(id);
  }

  getAgent(id: string): CompanionCombatAIAgent | undefined {
    return this.agents.get(id);
  }

  setRole(id: string, role: CompanionCombatRole): void {
    const agent = this.agents.get(id);
    if (agent) agent.setRole(role);
  }

  /**
   * Update all companion AIs. Returns actions for each companion.
   */
  updateAll(
    companions: CompanionState[],
    playerState: CombatantState,
    enemies: CombatantState[],
    playerTargetId: string | null,
    dt: number,
  ): CompanionCombatResult[] {
    const results: CompanionCombatResult[] = [];

    for (const companion of companions) {
      if (!companion.isAlive) continue;

      let agent = this.agents.get(companion.npcId);
      if (!agent) {
        agent = this.addCompanion(companion.npcId, companion.combatRole);
      }

      const action = agent.update(companion, playerState, enemies, playerTargetId, dt);
      results.push({ companionId: companion.npcId, name: companion.name, action });

      // Apply position changes from movement actions
      this.applyAction(companion, action, playerState, enemies, dt);
    }

    return results;
  }

  /**
   * Apply the action's side effects (movement, damage, healing) to state.
   */
  private applyAction(
    companion: CompanionState,
    action: CompanionCombatAction,
    playerState: CombatantState,
    enemies: CombatantState[],
    dt: number,
  ): void {
    const pos = companion.combatant.position;

    switch (action.type) {
      case "move": {
        const dx = action.targetX - pos.x;
        const dz = action.targetZ - pos.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > 0.1) {
          pos.x += (dx / d) * action.speed * dt;
          pos.z += (dz / d) * action.speed * dt;
        }
        break;
      }
      case "flee": {
        const dx = action.awayX - pos.x;
        const dz = action.awayZ - pos.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > 0.1) {
          pos.x += (dx / d) * action.speed * dt;
          pos.z += (dz / d) * action.speed * dt;
        }
        break;
      }
      case "teleport": {
        pos.x = action.x;
        pos.z = action.z;
        break;
      }
      case "attack": {
        const target = enemies.find(e => e.id === action.targetId);
        if (target && target.hp > 0) {
          target.hp -= action.damage;
          if (target.hp < 0) target.hp = 0;
        }
        break;
      }
      case "heal": {
        if (action.targetId === "player") {
          playerState.hp = Math.min(playerState.maxHp, playerState.hp + action.amount);
        }
        companion.mp = Math.max(0, companion.mp - 10);
        break;
      }
      case "block": {
        companion.combatant.isBlocking = true;
        break;
      }
      case "taunt": {
        // Redirect enemy's target to companion
        const target = enemies.find(e => e.id === action.targetId);
        if (target) {
          // Mark that this enemy should target the companion
          // This is picked up by the enemy AI in the game loop
          (target as any)._taunted_by = companion.npcId;
        }
        break;
      }
      default:
        break;
    }
  }

  clear(): void {
    this.agents.clear();
  }
}

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface CompanionCombatResult {
  companionId: string;
  name: string;
  action: CompanionCombatAction;
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function dist3(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function normalize(x: number, z: number): { x: number; z: number } {
  const len = Math.sqrt(x * x + z * z) || 1;
  return { x: x / len, z: z / len };
}
