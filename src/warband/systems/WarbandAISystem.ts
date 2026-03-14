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
  FormationType,
  TroopOrder,
  TroopGroup,
  vec3DistXZ,
} from "../state/WarbandState";
import { WB } from "../config/WarbandBalanceConfig";
import { isRangedWeapon } from "../config/WeaponDefs";
import { CREATURE_DEFS } from "../config/CreatureDefs";

const SIEGE_CREATURE_TYPES: ReadonlySet<string> = new Set([
  "battering_ram", "catapult", "trebuchet", "ballista",
  "cannon", "giant_siege", "bolt_thrower", "siege_catapult",
  "war_wagon", "bombard", "siege_tower", "hellfire_mortar",
]);

function classifyFighter(f: WarbandFighter): TroopGroup {
  // Siege creatures
  if (f.creatureType && SIEGE_CREATURE_TYPES.has(f.creatureType)) return TroopGroup.SIEGE;
  // Cavalry
  if (f.isMounted) return TroopGroup.CAVALRY;
  // Weapon-based classification
  const w = f.equipment.mainHand;
  if (w) {
    if (w.category === "staff") return TroopGroup.MAGES;
    if (w.category === "bow" || w.category === "crossbow" || w.category === "thrown") return TroopGroup.ARCHERS;
  }
  return TroopGroup.MELEE;
}

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

    // Gather player allies for formation positioning
    const player = state.fighters.find(f => f.isPlayer);
    const allyList = state.fighters.filter(
      f => !f.isPlayer && f.team === "player" && f.combatState !== FighterCombatState.DEAD && f.ai,
    );

    for (const fighter of state.fighters) {
      if (fighter.isPlayer) continue;
      if (fighter.combatState === FighterCombatState.DEAD) continue;
      if (!fighter.ai) continue;

      // Fleeing behavior overrides normal AI
      if (fighter.fleeing) {
        this._executeFleeing(fighter, state);
        continue;
      }

      // Player allies respond to formation/order commands
      const isAlly = fighter.team === "player" && player;
      if (isAlly) {
        // Only apply orders to fighters matching the selected group (ALL matches everyone)
        const group = state.selectedGroup;
        if (group === TroopGroup.ALL || classifyFighter(fighter) === group) {
          const allyIdx = allyList.indexOf(fighter);
          const handled = this._handleAllyOrder(fighter, player, allyIdx, allyList.length, state);
          if (handled) continue;
        }
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

  /**
   * Handle ally troop orders. Returns true if the ally's movement was overridden
   * (hold/follow), false if the ally should use normal combat AI (charge).
   */
  private _handleAllyOrder(
    ally: WarbandFighter,
    player: WarbandFighter,
    allyIdx: number,
    allyCount: number,
    state: WarbandState,
  ): boolean {
    const order = state.troopOrder;

    // CHARGE: let normal AI handle everything
    if (order === TroopOrder.CHARGE) return false;

    // HOLD_AND_FIRE: ranged/mage troops hold and fire, melee troops form a shield line
    if (order === TroopOrder.HOLD_AND_FIRE) {
      return this._handleHoldAndFire(ally, player, allyIdx, allyCount, state);
    }

    // Compute formation target position relative to player
    const formPos = this._getFormationPosition(
      player, allyIdx, allyCount, state.formation,
    );

    const dist = vec3DistXZ(ally.position, formPos);

    // If an enemy is very close (within reach), fight regardless of order
    const nearestEnemy = this._findNearestEnemy(ally, state);
    if (nearestEnemy) {
      const eDist = vec3DistXZ(ally.position, nearestEnemy.position);
      const reach = ally.equipment.mainHand?.reach ?? 2.0;
      if (eDist < reach + 1.5) {
        // Close enough to fight — use normal AI
        return false;
      }
    }

    if (order === TroopOrder.HOLD) {
      // Hold: if already at formation position, idle. Otherwise move there.
      if (dist < 1.5) {
        // Face forward (same direction as player)
        ally.velocity.x *= 0.8;
        ally.velocity.z *= 0.8;
        // Face toward nearest enemy if any
        if (nearestEnemy) {
          const angle = Math.atan2(
            nearestEnemy.position.x - ally.position.x,
            nearestEnemy.position.z - ally.position.z,
          );
          let diff = angle - ally.rotation;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          ally.rotation += diff * 0.1;
        }
        return true;
      }
    }

    // FOLLOW or HOLD (but not at position yet): move toward formation position
    const angle = Math.atan2(
      formPos.x - ally.position.x,
      formPos.z - ally.position.z,
    );
    let diff = angle - ally.rotation;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ally.rotation += diff * 0.15;

    const speed = ally.isMounted ? WB.HORSE_WALK_SPEED : WB.WALK_SPEED;
    const moveSpeed = dist > 5 ? speed * 1.2 : speed * 0.8;
    ally.velocity.x = Math.sin(angle) * moveSpeed;
    ally.velocity.z = Math.cos(angle) * moveSpeed;

    return true;
  }

  /**
   * HOLD_AND_FIRE order:
   * - Ranged/mage troops stay in formation and use normal combat AI to fire
   * - Melee troops advance to form a shield line between ranged allies and enemies
   */
  private _handleHoldAndFire(
    ally: WarbandFighter,
    player: WarbandFighter,
    allyIdx: number,
    allyCount: number,
    state: WarbandState,
  ): boolean {
    const wpn = ally.equipment.mainHand;
    const isRanged = wpn ? isRangedWeapon(wpn) : false;

    const nearestEnemy = this._findNearestEnemy(ally, state);

    if (isRanged) {
      // Ranged/mage: hold formation position, but let normal AI handle targeting & firing
      const formPos = this._getFormationPosition(
        player, allyIdx, allyCount, state.formation,
      );
      const dist = vec3DistXZ(ally.position, formPos);

      if (dist < 2.0) {
        // At position — face enemy and let normal combat AI fire
        ally.velocity.x *= 0.8;
        ally.velocity.z *= 0.8;
        if (nearestEnemy) {
          const angle = Math.atan2(
            nearestEnemy.position.x - ally.position.x,
            nearestEnemy.position.z - ally.position.z,
          );
          let diff = angle - ally.rotation;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          ally.rotation += diff * 0.15;
        }
        // Return false so normal AI handles the attack/shoot cycle
        return false;
      }

      // Move to formation position
      const angle = Math.atan2(formPos.x - ally.position.x, formPos.z - ally.position.z);
      let diff = angle - ally.rotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ally.rotation += diff * 0.15;
      const speed = ally.isMounted ? WB.HORSE_WALK_SPEED : WB.WALK_SPEED;
      ally.velocity.x = Math.sin(angle) * speed;
      ally.velocity.z = Math.cos(angle) * speed;
      return true;
    }

    // Melee: advance forward to form a shield line between the player group and enemies
    if (!nearestEnemy) {
      // No enemies visible — hold formation
      const formPos = this._getFormationPosition(
        player, allyIdx, allyCount, state.formation,
      );
      const dist = vec3DistXZ(ally.position, formPos);
      if (dist < 1.5) {
        ally.velocity.x *= 0.8;
        ally.velocity.z *= 0.8;
        return true;
      }
      const angle = Math.atan2(formPos.x - ally.position.x, formPos.z - ally.position.z);
      let diff = angle - ally.rotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ally.rotation += diff * 0.15;
      const speed = ally.isMounted ? WB.HORSE_WALK_SPEED : WB.WALK_SPEED;
      ally.velocity.x = Math.sin(angle) * speed;
      ally.velocity.z = Math.cos(angle) * speed;
      return true;
    }

    // Compute shield line position: halfway between player and nearest enemy,
    // spread out perpendicular to the enemy direction
    const meleeAllies = state.fighters.filter(
      f => !f.isPlayer && f.team === "player" && f.combatState !== FighterCombatState.DEAD
        && f.ai && !(f.equipment.mainHand && isRangedWeapon(f.equipment.mainHand)),
    );
    const meleeIdx = meleeAllies.indexOf(ally);
    const meleeCount = meleeAllies.length;

    // Direction from player toward nearest enemy
    const dirX = nearestEnemy.position.x - player.position.x;
    const dirZ = nearestEnemy.position.z - player.position.z;
    const dirLen = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
    const normX = dirX / dirLen;
    const normZ = dirZ / dirLen;

    // Shield line center: advance a fixed distance ahead of the player toward the enemy
    const advanceDist = Math.min(dirLen * 0.6, 12);
    const centerX = player.position.x + normX * advanceDist;
    const centerZ = player.position.z + normZ * advanceDist;

    // Perpendicular direction for spreading the line
    const perpX = -normZ;
    const perpZ = normX;
    const spacing = 2.5;
    const half = (meleeCount - 1) / 2;
    const targetX = centerX + perpX * (meleeIdx - half) * spacing;
    const targetZ = centerZ + perpZ * (meleeIdx - half) * spacing;

    const distToTarget = Math.sqrt(
      (ally.position.x - targetX) ** 2 + (ally.position.z - targetZ) ** 2,
    );

    // If enemy is within melee reach, fight
    const eDist = vec3DistXZ(ally.position, nearestEnemy.position);
    const reach = wpn?.reach ?? 2.0;
    if (eDist < reach + 1.5) {
      return false; // let normal AI fight
    }

    if (distToTarget < 1.5) {
      // At shield line position — face enemy, hold
      ally.velocity.x *= 0.8;
      ally.velocity.z *= 0.8;
      const angle = Math.atan2(
        nearestEnemy.position.x - ally.position.x,
        nearestEnemy.position.z - ally.position.z,
      );
      let diff = angle - ally.rotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ally.rotation += diff * 0.15;
      return true;
    }

    // Move to shield line position
    const angle = Math.atan2(targetX - ally.position.x, targetZ - ally.position.z);
    let diff = angle - ally.rotation;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ally.rotation += diff * 0.15;
    const speed = ally.isMounted ? WB.HORSE_WALK_SPEED : WB.WALK_SPEED;
    const moveSpeed = distToTarget > 5 ? speed * 1.3 : speed;
    ally.velocity.x = Math.sin(angle) * moveSpeed;
    ally.velocity.z = Math.cos(angle) * moveSpeed;
    return true;
  }

  private _findNearestEnemy(fighter: WarbandFighter, state: WarbandState): WarbandFighter | null {
    let nearest: WarbandFighter | null = null;
    let nearestDist = Infinity;
    for (const other of state.fighters) {
      if (other.team === fighter.team) continue;
      if (other.combatState === FighterCombatState.DEAD) continue;
      const d = vec3DistXZ(fighter.position, other.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = other;
      }
    }
    return nearest;
  }

  /**
   * Compute the desired world position for an ally in the current formation.
   * Positions are computed relative to the player's position and facing.
   */
  private _getFormationPosition(
    player: WarbandFighter,
    idx: number,
    count: number,
    formation: FormationType,
  ): { x: number; y: number; z: number } {
    const sin = Math.sin(player.rotation);
    const cos = Math.cos(player.rotation);
    const spacing = 2.5;

    let localX = 0;
    let localZ = 0;

    switch (formation) {
      case FormationType.LINE: {
        // Spread in a line perpendicular to player facing, behind the player
        const half = (count - 1) / 2;
        localX = (idx - half) * spacing;
        localZ = -spacing; // one row behind player
        break;
      }
      case FormationType.COLUMN: {
        // Narrow column behind the player
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        localX = (col - 0.5) * spacing;
        localZ = -(row + 1) * spacing;
        break;
      }
      case FormationType.WEDGE: {
        // V-shape — wider as it goes back
        const row = Math.floor(idx / 2);
        const side = idx % 2 === 0 ? -1 : 1;
        localX = side * (row + 1) * spacing;
        localZ = -(row + 1) * spacing;
        break;
      }
      case FormationType.SQUARE: {
        // Compact box
        const cols = Math.max(2, Math.ceil(Math.sqrt(count)));
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const halfC = (cols - 1) / 2;
        localX = (col - halfC) * spacing;
        localZ = -(row + 1) * spacing;
        break;
      }
      case FormationType.SCATTER: {
        // Spread loosely around the player, seeded by index
        const angle = (idx / Math.max(1, count)) * Math.PI * 2 + idx * 0.7;
        const radius = spacing * (1.5 + (idx % 3));
        localX = Math.cos(angle) * radius;
        localZ = -Math.abs(Math.sin(angle) * radius) - spacing;
        break;
      }
    }

    // Rotate local offset by player facing and add to player position
    return {
      x: player.position.x + localX * cos - localZ * sin,
      y: 0,
      z: player.position.z + localX * sin + localZ * cos,
    };
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
