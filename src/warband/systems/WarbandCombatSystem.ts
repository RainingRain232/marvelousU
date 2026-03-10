// ---------------------------------------------------------------------------
// Warband mode – directional combat system
// Handles attack phases, block matching, damage calculation with armor hitboxes
// ---------------------------------------------------------------------------

import {
  type WarbandState,
  type WarbandFighter,
  type WarbandProjectile,
  type WeaponPickup,
  FighterCombatState,
  CombatDirection,
  vec3DistXZ,
} from "../state/WarbandState";
import { WB } from "../config/WarbandBalanceConfig";
import { ArmorSlot } from "../config/ArmorDefs";
import { isRangedWeapon } from "../config/WeaponDefs";

// ---- Hitbox zone from attack direction ------------------------------------

function attackHitZone(dir: CombatDirection): ArmorSlot {
  switch (dir) {
    case CombatDirection.LEFT_SWING:
    case CombatDirection.RIGHT_SWING:
      // Horizontal swings hit torso or arms
      return Math.random() < 0.7 ? ArmorSlot.TORSO : ArmorSlot.GAUNTLETS;
    case CombatDirection.OVERHEAD:
      // Overhead chop hits head or torso
      return Math.random() < 0.5 ? ArmorSlot.HEAD : ArmorSlot.TORSO;
    case CombatDirection.STAB:
      // Stab hits torso mostly, sometimes legs
      return Math.random() < 0.75 ? ArmorSlot.TORSO : ArmorSlot.LEGS;
  }
}

function hitZoneMultiplier(slot: ArmorSlot): number {
  switch (slot) {
    case ArmorSlot.HEAD:
      return WB.HEAD_MULT;
    case ArmorSlot.TORSO:
      return WB.TORSO_MULT;
    case ArmorSlot.GAUNTLETS:
      return WB.GAUNTLETS_MULT;
    case ArmorSlot.LEGS:
      return WB.LEGS_MULT;
    case ArmorSlot.BOOTS:
      return WB.BOOTS_MULT;
  }
}

/** Check if blocker's block direction matches the attacker's attack direction */
function isBlockMatched(
  attackDir: CombatDirection,
  blockDir: CombatDirection,
): boolean {
  // Block must match the attack: left swing blocked with right swing (mirror),
  // overhead blocked with overhead, stab blocked with stab
  const mirrored = mirrorDirection(attackDir);
  return blockDir === mirrored;
}

function mirrorDirection(dir: CombatDirection): CombatDirection {
  switch (dir) {
    case CombatDirection.LEFT_SWING:
      return CombatDirection.RIGHT_SWING; // block left swing from right side
    case CombatDirection.RIGHT_SWING:
      return CombatDirection.LEFT_SWING; // block right swing from left side
    case CombatDirection.OVERHEAD:
      return CombatDirection.OVERHEAD; // block overhead with overhead guard
    case CombatDirection.STAB:
      return CombatDirection.STAB; // block stab with center guard
  }
}

// ---- Combat system --------------------------------------------------------

export class WarbandCombatSystem {
  /** Hits that happened this tick (for FX/audio) */
  readonly hits: {
    attacker: string;
    target: string;
    damage: number;
    zone: ArmorSlot;
    blocked: boolean;
    position: { x: number; y: number; z: number };
  }[] = [];

  /** Kills that happened this tick */
  readonly kills: { killerId: string; victimId: string }[] = [];

  update(state: WarbandState): void {
    this.hits.length = 0;
    this.kills.length = 0;

    for (const fighter of state.fighters) {
      if (fighter.combatState === FighterCombatState.DEAD) continue;

      // Stamina regen
      if (fighter.combatState !== FighterCombatState.BLOCKING) {
        fighter.stamina = Math.min(
          fighter.maxStamina,
          fighter.stamina + WB.STAMINA_REGEN,
        );
      }

      // State timer countdown
      if (fighter.stateTimer > 0) {
        fighter.stateTimer--;
      }

      // State transitions
      switch (fighter.combatState) {
        case FighterCombatState.WINDING:
          if (fighter.stateTimer <= 0) {
            fighter.combatState = FighterCombatState.RELEASING;
            const speedMult = fighter.equipment.mainHand?.speed ?? 1;
            fighter.stateTimer = Math.round(WB.RELEASE_TICKS_BASE / speedMult);
          }
          break;

        case FighterCombatState.RELEASING:
          // Check for hits during release
          this._checkMeleeHits(fighter, state);
          if (fighter.stateTimer <= 0) {
            fighter.combatState = FighterCombatState.RECOVERY;
            fighter.stateTimer = WB.RECOVERY_TICKS_BASE;
          }
          break;

        case FighterCombatState.RECOVERY:
          if (fighter.stateTimer <= 0) {
            fighter.combatState = FighterCombatState.IDLE;
          }
          break;

        case FighterCombatState.STAGGERED:
          if (fighter.stateTimer <= 0) {
            fighter.combatState = FighterCombatState.IDLE;
          }
          break;

        case FighterCombatState.DRAWING:
          if (fighter.stateTimer <= 0) {
            fighter.combatState = FighterCombatState.AIMING;
            fighter.stateTimer = 999;
          }
          break;

        case FighterCombatState.AIMING:
          // AI or player releases when ready
          break;

        default:
          break;
      }

      // Fire ranged weapon on release
      if (
        fighter.combatState === FighterCombatState.RELEASING &&
        fighter.equipment.mainHand &&
        isRangedWeapon(fighter.equipment.mainHand)
      ) {
        this._fireProjectile(fighter, state);
        fighter.combatState = FighterCombatState.RECOVERY;
        fighter.stateTimer = WB.RECOVERY_TICKS_BASE;
      }
    }

    // Update projectiles
    this._updateProjectiles(state);
  }

  private _checkMeleeHits(attacker: WarbandFighter, state: WarbandState): void {
    // Only check on the first tick of release (hit once per attack)
    const speedMult = attacker.equipment.mainHand?.speed ?? 1;
    const maxReleaseTicks = Math.round(WB.RELEASE_TICKS_BASE / speedMult);
    if (attacker.stateTimer !== maxReleaseTicks - 1) return;

    const wpn = attacker.equipment.mainHand;
    if (!wpn) return;

    const reach = wpn.reach;

    for (const target of state.fighters) {
      if (target.id === attacker.id) continue;
      if (target.team === attacker.team) continue;
      if (target.combatState === FighterCombatState.DEAD) continue;

      const dist = vec3DistXZ(attacker.position, target.position);
      if (dist > reach + WB.FIGHTER_RADIUS) continue;

      // Check facing (must face target within ~120 degrees)
      const angleToTarget = Math.atan2(
        target.position.x - attacker.position.x,
        target.position.z - attacker.position.z,
      );
      let angleDiff = angleToTarget - attacker.rotation;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) > Math.PI * 0.6) continue;

      // Check block — directional match OR shield covers the angle
      const isBlocking =
        target.combatState === FighterCombatState.BLOCKING;
      let blocked = false;
      if (isBlocking) {
        // Directional weapon block (no shield needed)
        if (isBlockMatched(attacker.attackDirection, target.blockDirection)) {
          blocked = true;
        }
        // Shield block: covers a frontal arc regardless of direction
        const shield = target.equipment.offHand;
        if (shield && shield.blockArc) {
          const angleToAttacker = Math.atan2(
            attacker.position.x - target.position.x,
            attacker.position.z - target.position.z,
          );
          let shieldAngleDiff = angleToAttacker - target.rotation;
          while (shieldAngleDiff > Math.PI) shieldAngleDiff -= Math.PI * 2;
          while (shieldAngleDiff < -Math.PI) shieldAngleDiff += Math.PI * 2;
          if (Math.abs(shieldAngleDiff) < shield.blockArc / 2) {
            blocked = true;
          }
        }
      }

      if (blocked) {
        // Blocked: stagger attacker, drain target stamina
        attacker.combatState = FighterCombatState.STAGGERED;
        attacker.stateTimer = WB.STAGGER_TICKS;
        target.stamina -= WB.STAMINA_BLOCK_COST;

        // Shield takes damage if applicable
        const shield = target.equipment.offHand;
        if (shield && shield.shieldHp !== undefined) {
          // For now just track the block
        }

        this.hits.push({
          attacker: attacker.id,
          target: target.id,
          damage: 0,
          zone: ArmorSlot.TORSO,
          blocked: true,
          position: {
            x: (attacker.position.x + target.position.x) / 2,
            y: attacker.position.y + WB.FIGHTER_HEIGHT * 0.6,
            z: (attacker.position.z + target.position.z) / 2,
          },
        });
      } else {
        // Hit landed
        const hitZone = attackHitZone(attacker.attackDirection);
        const zoneMult = hitZoneMultiplier(hitZone);
        const armorDef = target.equipment.armor[hitZone]?.defense ?? 0;
        const rawDamage = wpn.damage * zoneMult;
        const finalDamage = Math.max(1, Math.round(rawDamage - armorDef));

        target.hp -= finalDamage;
        target.lastHitBy = attacker.id;
        attacker.damage_dealt += finalDamage;

        // Interrupt target if they were winding up
        if (
          target.combatState === FighterCombatState.WINDING ||
          target.combatState === FighterCombatState.DRAWING
        ) {
          target.combatState = FighterCombatState.STAGGERED;
          target.stateTimer = Math.round(WB.STAGGER_TICKS * 0.6);
        } else if (!isBlocking) {
          // Brief stagger on hit
          target.combatState = FighterCombatState.STAGGERED;
          target.stateTimer = Math.round(WB.STAGGER_TICKS * 0.3);
        }

        this.hits.push({
          attacker: attacker.id,
          target: target.id,
          damage: finalDamage,
          zone: hitZone,
          blocked: false,
          position: {
            x: target.position.x,
            y: target.position.y + WB.FIGHTER_HEIGHT * 0.6,
            z: target.position.z,
          },
        });

        // Check death
        if (target.hp <= 0) {
          target.hp = 0;
          target.combatState = FighterCombatState.DEAD;
          attacker.kills++;
          attacker.gold += WB.GOLD_PER_KILL;
          if (hitZone === ArmorSlot.HEAD) {
            attacker.gold += WB.GOLD_HEADSHOT_BONUS;
          }

          // Drop weapon as pickup
          if (target.equipment.mainHand) {
            const pickup: WeaponPickup = {
              id: `pickup_${state.tick}_${target.id}`,
              position: { ...target.position },
              weapon: target.equipment.mainHand,
              age: 0,
            };
            state.pickups.push(pickup);
          }

          this.kills.push({
            killerId: attacker.id,
            victimId: target.id,
          });

          // Update team counts
          if (target.team === "player") state.playerTeamAlive--;
          else state.enemyTeamAlive--;
        }
      }
    }
  }

  private _fireProjectile(
    fighter: WarbandFighter,
    state: WarbandState,
  ): void {
    const wpn = fighter.equipment.mainHand;
    if (!wpn || fighter.ammo <= 0) return;

    fighter.ammo--;

    const speed = wpn.projectileSpeed ?? WB.ARROW_SPEED;
    const accuracy = wpn.accuracy ?? 0.85;
    const spread = (1 - accuracy) * 0.15;

    const dirX = Math.sin(fighter.rotation) + (Math.random() - 0.5) * spread;
    const dirZ = Math.cos(fighter.rotation) + (Math.random() - 0.5) * spread;
    const dirY = 0.1 + (Math.random() - 0.5) * spread; // slight upward arc

    const proj: WarbandProjectile = {
      id: `proj_${state.tick}_${fighter.id}`,
      ownerId: fighter.id,
      ownerTeam: fighter.team,
      position: {
        x: fighter.position.x + Math.sin(fighter.rotation) * 0.5,
        y: fighter.position.y + WB.FIGHTER_HEIGHT * 0.75,
        z: fighter.position.z + Math.cos(fighter.rotation) * 0.5,
      },
      velocity: {
        x: dirX * speed,
        y: dirY * speed,
        z: dirZ * speed,
      },
      damage: wpn.damage,
      gravity: WB.ARROW_GRAVITY,
      alive: true,
      age: 0,
    };

    state.projectiles.push(proj);
  }

  private _updateProjectiles(state: WarbandState): void {
    const dt = WB.SIM_TICK_MS / 1000;

    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const proj = state.projectiles[i];
      if (!proj.alive) {
        state.projectiles.splice(i, 1);
        continue;
      }

      proj.age++;

      // Physics
      proj.position.x += proj.velocity.x * dt;
      proj.position.y += proj.velocity.y * dt;
      proj.position.z += proj.velocity.z * dt;
      proj.velocity.y += proj.gravity * dt;

      // Ground collision
      if (proj.position.y <= 0) {
        proj.alive = false;
        continue;
      }

      // Age limit
      if (proj.age > 300) {
        proj.alive = false;
        continue;
      }

      // Hit detection against fighters
      for (const target of state.fighters) {
        if (target.id === proj.ownerId) continue;
        if (target.team === proj.ownerTeam) continue;
        if (target.combatState === FighterCombatState.DEAD) continue;

        const dx = proj.position.x - target.position.x;
        const dy = proj.position.y - (target.position.y + WB.FIGHTER_HEIGHT * 0.5);
        const dz = proj.position.z - target.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < WB.FIGHTER_RADIUS + 0.15) {
          // Determine hit zone by projectile height relative to target
          const relHeight = (proj.position.y - target.position.y) / WB.FIGHTER_HEIGHT;
          let hitZone: ArmorSlot;
          if (relHeight > 0.85) hitZone = ArmorSlot.HEAD;
          else if (relHeight > 0.45) hitZone = ArmorSlot.TORSO;
          else if (relHeight > 0.2) hitZone = ArmorSlot.LEGS;
          else hitZone = ArmorSlot.BOOTS;

          // Check block (shield blocks projectiles in arc)
          const shield = target.equipment.offHand;
          const isBlocking = target.combatState === FighterCombatState.BLOCKING;
          let blocked = false;
          if (isBlocking && shield && shield.blockArc) {
            const angleToProj = Math.atan2(
              proj.position.x - target.position.x,
              proj.position.z - target.position.z,
            );
            let angleDiff = angleToProj - target.rotation;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            if (Math.abs(angleDiff) < shield.blockArc / 2) {
              blocked = true;
            }
          }

          if (!blocked) {
            const zoneMult = hitZoneMultiplier(hitZone);
            const armorDef = target.equipment.armor[hitZone]?.defense ?? 0;
            const damage = Math.max(1, Math.round(proj.damage * zoneMult - armorDef));

            target.hp -= damage;
            target.lastHitBy = proj.ownerId;

            // Find owner for stats
            const owner = state.fighters.find((f) => f.id === proj.ownerId);
            if (owner) owner.damage_dealt += damage;

            this.hits.push({
              attacker: proj.ownerId,
              target: target.id,
              damage,
              zone: hitZone,
              blocked: false,
              position: { ...proj.position },
            });

            if (target.hp <= 0) {
              target.hp = 0;
              target.combatState = FighterCombatState.DEAD;
              if (owner) {
                owner.kills++;
                owner.gold += WB.GOLD_PER_KILL;
                if (hitZone === ArmorSlot.HEAD) {
                  owner.gold += WB.GOLD_HEADSHOT_BONUS;
                }
              }

              if (target.equipment.mainHand) {
                state.pickups.push({
                  id: `pickup_${state.tick}_${target.id}`,
                  position: { ...target.position },
                  weapon: target.equipment.mainHand,
                  age: 0,
                });
              }

              this.kills.push({
                killerId: proj.ownerId,
                victimId: target.id,
              });

              if (target.team === "player") state.playerTeamAlive--;
              else state.enemyTeamAlive--;
            }
          }

          proj.alive = false;
          break;
        }
      }
    }
  }
}
