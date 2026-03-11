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
    for (const fighter of state.fighters) {
      if (fighter.isPlayer) continue;
      if (fighter.combatState === FighterCombatState.DEAD) continue;
      if (!fighter.ai) continue;

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

    for (const other of state.fighters) {
      if (other.team === fighter.team) continue;
      if (other.combatState === FighterCombatState.DEAD) continue;

      const dist = vec3DistXZ(fighter.position, other.position);
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
    const idealRange = isRanged
      ? (mounted ? 15 : 10)
      : (mounted ? 4.0 : ai.preferredRange);

    // Movement — mounted fighters are faster
    const sinR = Math.sin(fighter.rotation);
    const cosR = Math.cos(fighter.rotation);
    const baseWalk = mounted ? WB.HORSE_WALK_SPEED : WB.WALK_SPEED;
    const baseBack = mounted ? WB.HORSE_BACK_SPEED : WB.BACK_SPEED;
    const baseStrafe = mounted ? WB.HORSE_STRAFE_SPEED : WB.STRAFE_SPEED;

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
    const reach = fighter.equipment.mainHand?.reach ?? 1;

    if (dist > reach + WB.FIGHTER_RADIUS + 0.5) return;

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
      const speedMult = fighter.equipment.mainHand?.speed ?? 1;
      fighter.stateTimer = Math.round(WB.WINDUP_TICKS_BASE / speedMult);

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
}
