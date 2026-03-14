// ---------------------------------------------------------------------------
// Warband mode – AI system
// Decision-making for all non-player fighters: pursue, attack, block, retreat
// ---------------------------------------------------------------------------

import {
  type WarbandState,
  type WarbandFighter,
  BattleType,
  FighterCombatState,
  CombatDirection,
  vec3DistXZ,
} from "../state/WarbandState";
import { WB } from "../config/WarbandBalanceConfig";
import { isRangedWeapon } from "../config/WeaponDefs";
import { CREATURE_DEFS } from "../config/CreatureDefs";

const COMBAT_DIRS = [
  CombatDirection.LEFT_SWING,
  CombatDirection.RIGHT_SWING,
  CombatDirection.OVERHEAD,
  CombatDirection.STAB,
];

function randomDir(): CombatDirection {
  return COMBAT_DIRS[Math.floor(Math.random() * 4)];
}

function mirrorDir(dir: CombatDirection): CombatDirection {
  switch (dir) {
    case CombatDirection.LEFT_SWING:
      return CombatDirection.RIGHT_SWING;
    case CombatDirection.RIGHT_SWING:
      return CombatDirection.LEFT_SWING;
    case CombatDirection.OVERHEAD:
      return CombatDirection.OVERHEAD;
    case CombatDirection.STAB:
      return CombatDirection.STAB;
  }
}

export class WarbandAISystem {
  update(state: WarbandState): void {
    // Update morale for all fighters (including player) if enabled
    if (state.moraleEnabled) {
      this._updateMorale(state);
    }

    for (const fighter of state.fighters) {
      if (fighter.isPlayer) continue;
      if (fighter.combatState === FighterCombatState.DEAD) continue;
      if (!fighter.ai) continue;

      // Fleeing behavior overrides normal AI
      if (fighter.fleeing) {
        this._executeFleeing(fighter, state);
        continue;
      }

      const ai = fighter.ai;

      // Decision timer
      ai.decisionTimer--;
      if (ai.decisionTimer > 0 && ai.targetId) {
        // Continue current behavior
        const target = state.fighters.find((f) => f.id === ai.targetId);
        if (target && target.combatState !== FighterCombatState.DEAD) {
          this._executeBehavior(fighter, target, state);
          continue;
        }
      }

      // Pick new target
      ai.targetId = this._pickTarget(fighter, state);
      ai.decisionTimer = 30 + Math.floor(Math.random() * 30);

      if (!ai.targetId) continue;

      const target = state.fighters.find((f) => f.id === ai.targetId);
      if (!target) continue;

      this._executeBehavior(fighter, target, state);
    }
  }

  private _pickTarget(
    fighter: WarbandFighter,
    state: WarbandState,
  ): string | null {
    let closest: WarbandFighter | null = null;
    let closestDist = Infinity;
    // Fog weather: reduce decision range by 40%
    const maxDecisionRange = state.weather === "fog" ? 30 * 0.6 : Infinity;

    for (const other of state.fighters) {
      if (other.team === fighter.team) continue;
      if (other.combatState === FighterCombatState.DEAD) continue;

      const dist = vec3DistXZ(fighter.position, other.position);
      if (dist > maxDecisionRange) continue; // fog limits detection
      if (dist < closestDist) {
        closestDist = dist;
        closest = other;
      }
    }

    return closest?.id ?? null;
  }

  private _executeBehavior(
    fighter: WarbandFighter,
    target: WarbandFighter,
    _state: WarbandState,
  ): void {
    const ai = fighter.ai!;
    const dist = vec3DistXZ(fighter.position, target.position);

    // Face target
    const angleToTarget = Math.atan2(
      target.position.x - fighter.position.x,
      target.position.z - fighter.position.z,
    );

    // Smooth rotation toward target
    let angleDiff = angleToTarget - fighter.rotation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    fighter.rotation += angleDiff * 0.1;

    const wpn = fighter.equipment.mainHand;
    const isRanged = wpn ? isRangedWeapon(wpn) : false;
    const mounted = fighter.isMounted;
    // Fog weather: reduce preferred range by 40%
    const fogMult = _state.weather === "fog" ? 0.6 : 1.0;
    const idealRange = (isRanged
      ? (mounted ? 15 : 10)
      : (mounted ? 4.0 : ai.preferredRange)) * fogMult;

    // Movement — mounted fighters are faster, creatures use their own speed
    const sinR = Math.sin(fighter.rotation);
    const cosR = Math.cos(fighter.rotation);
    const creatureDef = fighter.creatureType ? CREATURE_DEFS[fighter.creatureType] : null;
    const scaleMult = (fighter.scale !== 1.0 && !creatureDef) ? fighter.scale * 0.6 : 1.0; // larger units are slower proportionally
    const baseWalk = creatureDef ? creatureDef.speed : (mounted ? WB.HORSE_WALK_SPEED : WB.WALK_SPEED * scaleMult);
    const baseBack = creatureDef ? creatureDef.speed * 0.5 : (mounted ? WB.HORSE_BACK_SPEED : WB.BACK_SPEED * scaleMult);
    const baseStrafe = creatureDef ? creatureDef.speed * 0.7 : (mounted ? WB.HORSE_STRAFE_SPEED : WB.STRAFE_SPEED * scaleMult);

    // Siege mode objective movement: if no nearby enemies, move toward objective
    const isSiege = _state.battleType === BattleType.SIEGE;
    if (isSiege && dist > idealRange + 6) {
      // Far from target — move toward capture zone (attackers) or hold zone (defenders)
      const capCenter = { x: WB.SIEGE_CAPTURE_X, y: 0, z: WB.SIEGE_CAPTURE_Z };
      const distToZone = vec3DistXZ(fighter.position, capCenter);
      const isAttacker = fighter.team === "player";

      if (isAttacker && distToZone > WB.SIEGE_CAPTURE_RADIUS) {
        // Attacker: prioritize moving to the capture zone
        const angleToZone = Math.atan2(
          capCenter.x - fighter.position.x,
          capCenter.z - fighter.position.z,
        );
        let zDiff = angleToZone - fighter.rotation;
        while (zDiff > Math.PI) zDiff -= Math.PI * 2;
        while (zDiff < -Math.PI) zDiff += Math.PI * 2;
        fighter.rotation += zDiff * 0.08;
        const speed = baseWalk * 0.9;
        fighter.velocity.x = Math.sin(fighter.rotation) * speed;
        fighter.velocity.z = Math.cos(fighter.rotation) * speed;
        fighter.walkCycle = (fighter.walkCycle + speed * 0.02) % 1;
      } else if (!isAttacker && distToZone > WB.SIEGE_CAPTURE_RADIUS + 2) {
        // Defender: return to capture zone if strayed too far
        const angleToZone = Math.atan2(
          capCenter.x - fighter.position.x,
          capCenter.z - fighter.position.z,
        );
        let zDiff = angleToZone - fighter.rotation;
        while (zDiff > Math.PI) zDiff -= Math.PI * 2;
        while (zDiff < -Math.PI) zDiff += Math.PI * 2;
        fighter.rotation += zDiff * 0.08;
        const speed = baseWalk * 0.8;
        fighter.velocity.x = Math.sin(fighter.rotation) * speed;
        fighter.velocity.z = Math.cos(fighter.rotation) * speed;
        fighter.walkCycle = (fighter.walkCycle + speed * 0.02) % 1;
      } else {
        // Default: move toward target
        const speed = baseWalk * 0.9;
        fighter.velocity.x = sinR * speed;
        fighter.velocity.z = cosR * speed;
        fighter.walkCycle = (fighter.walkCycle + speed * 0.02) % 1;
      }
    } else if (dist > idealRange + 1) {
      // Move toward target
      const speed = baseWalk * 0.9;
      fighter.velocity.x = sinR * speed;
      fighter.velocity.z = cosR * speed;
      fighter.walkCycle = (fighter.walkCycle + speed * 0.02) % 1;
    } else if (dist < idealRange - 1 && isRanged) {
      // Ranged fighters back away if too close
      fighter.velocity.x = -sinR * baseBack;
      fighter.velocity.z = -cosR * baseBack;
      fighter.walkCycle = (fighter.walkCycle + baseBack * 0.02) % 1;
    } else {
      // Strafe around target
      ai.strafeTimer--;
      if (ai.strafeTimer <= 0) {
        ai.strafeDir = Math.random() < 0.5 ? -1 : 1;
        ai.strafeTimer = 30 + Math.floor(Math.random() * 60);
      }
      const strafeSpeed = baseStrafe * 0.7;
      fighter.velocity.x = cosR * strafeSpeed * ai.strafeDir;
      fighter.velocity.z = -sinR * strafeSpeed * ai.strafeDir;
      fighter.walkCycle = (fighter.walkCycle + strafeSpeed * 0.02) % 1;
    }

    // Combat decisions
    if (fighter.combatState === FighterCombatState.IDLE) {
      if (isRanged) {
        this._handleRangedAI(fighter, target, dist);
      } else {
        this._handleMeleeAI(fighter, target, dist);
      }
    }

    // AI releases ranged shot after brief aiming period
    if (
      fighter.combatState === FighterCombatState.AIMING &&
      isRanged &&
      dist <= 30
    ) {
      // Aim for a short time then release
      fighter.stateTimer--;
      if (fighter.stateTimer <= 990) {
        fighter.combatState = FighterCombatState.RELEASING;
        fighter.stateTimer = WB.RELEASE_TICKS_BASE;
      }
    }

    // Reactive blocking
    if (
      fighter.combatState === FighterCombatState.IDLE &&
      target.combatState === FighterCombatState.RELEASING &&
      dist < (target.equipment.mainHand?.reach ?? 2) + 1
    ) {
      if (Math.random() < ai.blockChance) {
        fighter.combatState = FighterCombatState.BLOCKING;
        fighter.stateTimer = 20;
        // Try to match the attacker's direction
        if (Math.random() < ai.blockChance * 0.8) {
          fighter.blockDirection = mirrorDir(target.attackDirection);
        } else {
          fighter.blockDirection = randomDir();
        }
      }
    }

    // Release block after a short time
    if (
      fighter.combatState === FighterCombatState.BLOCKING &&
      fighter.stateTimer <= 0
    ) {
      fighter.combatState = FighterCombatState.IDLE;
    }
  }

  private _handleMeleeAI(
    fighter: WarbandFighter,
    target: WarbandFighter,
    dist: number,
  ): void {
    const ai = fighter.ai!;
    const cDef = fighter.creatureType ? CREATURE_DEFS[fighter.creatureType] : null;
    const reach = cDef ? cDef.reach : (fighter.equipment.mainHand?.reach ?? 1);

    if (dist > reach + target.creatureRadius + 0.5) return;

    // Decide to attack
    if (Math.random() < ai.aggressiveness * 0.1) {
      // Choose attack direction
      if (
        target.combatState === FighterCombatState.BLOCKING &&
        Math.random() < ai.blockChance
      ) {
        // Smart AI: attack where target ISN'T blocking
        const avoidDir = mirrorDir(target.blockDirection);
        const dirs = COMBAT_DIRS.filter((d) => d !== avoidDir);
        fighter.attackDirection = dirs[Math.floor(Math.random() * dirs.length)];
      } else {
        fighter.attackDirection = randomDir();
      }

      fighter.combatState = FighterCombatState.WINDING;
      if (cDef) {
        fighter.stateTimer = cDef.attackTicks;
      } else {
        const speedMult = fighter.equipment.mainHand?.speed ?? 1;
        fighter.stateTimer = Math.round(WB.WINDUP_TICKS_BASE / speedMult);
      }

      if (fighter.stamina >= WB.STAMINA_ATTACK_COST) {
        fighter.stamina -= WB.STAMINA_ATTACK_COST;
      }
    }
  }

  private _handleRangedAI(
    fighter: WarbandFighter,
    target: WarbandFighter,
    dist: number,
  ): void {
    const ai = fighter.ai!;

    if (fighter.ammo <= 0) {
      // Switch to melee behavior if out of ammo
      ai.preferredRange = 2.0;
      this._handleMeleeAI(fighter, target, dist);
      return;
    }

    if (dist > 30) return; // Too far

    // Start drawing — fire frequently when in range
    if (Math.random() < ai.aggressiveness * 0.15) {
      fighter.combatState = FighterCombatState.DRAWING;
      fighter.stateTimer = fighter.equipment.mainHand?.drawTime ?? 30;
    }
  }

  // ---- Fleeing behavior -----------------------------------------------------

  private _executeFleeing(fighter: WarbandFighter, state: WarbandState): void {
    // Find nearest enemy and run away
    let nearestEnemy: WarbandFighter | null = null;
    let nearestDist = Infinity;
    for (const other of state.fighters) {
      if (other.team === fighter.team) continue;
      if (other.combatState === FighterCombatState.DEAD) continue;
      const d = vec3DistXZ(fighter.position, other.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearestEnemy = other;
      }
    }

    if (nearestEnemy) {
      // Run away from nearest enemy
      const awayAngle = Math.atan2(
        fighter.position.x - nearestEnemy.position.x,
        fighter.position.z - nearestEnemy.position.z,
      );
      let angleDiff = awayAngle - fighter.rotation;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      fighter.rotation += angleDiff * 0.15;

      // Fleeing fighters move at 80% speed (slower from panic)
      const speed = WB.WALK_SPEED * 0.8;
      fighter.velocity.x = Math.sin(fighter.rotation) * speed;
      fighter.velocity.z = Math.cos(fighter.rotation) * speed;
      fighter.walkCycle = (fighter.walkCycle + speed * 0.02) % 1;
    }

    // Cancel any combat state while fleeing
    if (
      fighter.combatState !== FighterCombatState.IDLE &&
      fighter.combatState !== FighterCombatState.STAGGERED
    ) {
      fighter.combatState = FighterCombatState.IDLE;
      fighter.stateTimer = 0;
    }
  }

  // ---- Morale system --------------------------------------------------------

  private _updateMorale(state: WarbandState): void {
    const aliveFighters: Record<string, number> = { player: 0, enemy: 0 };
    for (const f of state.fighters) {
      if (f.combatState !== FighterCombatState.DEAD) {
        aliveFighters[f.team]++;
      }
    }

    const ticksPerSec = WB.TICKS_PER_SEC;
    const perTickBase = 1 / ticksPerSec; // base regen per tick (~1/sec)

    for (const fighter of state.fighters) {
      if (fighter.combatState === FighterCombatState.DEAD) continue;

      const allyAlive = aliveFighters[fighter.team] ?? 0;
      const enemyAlive = aliveFighters[fighter.team === "player" ? "enemy" : "player"] ?? 0;
      let moraleDelta = 0;

      // Base regen: +1 per second
      moraleDelta += perTickBase;

      // Outnumbered penalty: -(enemyAlive - allyAlive) * 3 per second
      if (enemyAlive > allyAlive) {
        moraleDelta -= (enemyAlive - allyAlive) * 3 * perTickBase;
      }

      // Outnumber bonus: +2 per second
      if (allyAlive > enemyAlive) {
        moraleDelta += 2 * perTickBase;
      }

      fighter.morale = Math.max(0, Math.min(100, fighter.morale + moraleDelta));

      // Fleeing state transitions
      if (!fighter.fleeing && fighter.morale < 20) {
        fighter.fleeing = true;
      } else if (fighter.fleeing && fighter.morale > 40) {
        fighter.fleeing = false;
      }
    }
  }

  /** Call when a fighter dies to apply morale effects to nearby fighters. */
  applyDeathMorale(deadFighter: WarbandFighter, state: WarbandState): void {
    if (!state.moraleEnabled) return;

    for (const fighter of state.fighters) {
      if (fighter.combatState === FighterCombatState.DEAD) continue;
      if (fighter.id === deadFighter.id) continue;

      const dist = vec3DistXZ(fighter.position, deadFighter.position);
      if (dist > 10) continue; // only affects fighters within 10 units

      if (fighter.team === deadFighter.team) {
        // Ally died nearby: -15 morale
        fighter.morale = Math.max(0, fighter.morale - 15);
      } else {
        // Enemy died nearby: +10 morale
        fighter.morale = Math.min(100, fighter.morale + 10);
      }
    }
  }

  /** Call when a fighter takes heavy damage to apply morale drop. */
  applyDamageMorale(
    fighter: WarbandFighter,
    damage: number,
    state: WarbandState,
  ): void {
    if (!state.moraleEnabled) return;

    // Heavy damage (>30% HP in one hit): -10 morale
    if (damage > fighter.maxHp * 0.3) {
      fighter.morale = Math.max(0, fighter.morale - 10);
    }
  }
}
