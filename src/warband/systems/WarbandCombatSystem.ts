// ---------------------------------------------------------------------------
// Warband mode – directional combat system
// Handles attack phases, block matching, damage calculation with armor hitboxes
// ---------------------------------------------------------------------------

import {
  type WarbandState,
  type WarbandFighter,
  type WarbandProjectile,
  FighterCombatState,
  CombatDirection,
  BattleType,
  vec3DistXZ,
} from "../state/WarbandState";
import { WB } from "../config/WarbandBalanceConfig";
import { ArmorSlot } from "../config/ArmorDefs";
import { isRangedWeapon, isStaffWeapon } from "../config/WeaponDefs";
import { CREATURE_DEFS, type CreatureSpecialAbility } from "../config/CreatureDefs";

// ---- Spell definitions (extensible – add new spells here) -------------------

export interface SpellDef {
  id: string;
  /** Cooldown in ticks between casts */
  cooldownTicks: number;
  /** Damage multiplier applied to weapon damage for the AoE */
  aoeDamageMult: number;
  /** Base AoE radius (world units) */
  aoeRadius: number;
  /** Extra radius per tier (tier 1 = base mage, tier 2 = adept, tier 3 = master) */
  aoeRadiusPerTier: number;
  /** Extra damage multiplier per tier */
  aoeDamagePerTier: number;
}

/** AoE spell definitions */
const SPELL_DEFS: Record<string, SpellDef> = {
  default: {
    id: "arcane_blast",
    cooldownTicks: 600, // 10 seconds at 60 tps
    aoeDamageMult: 0.5,
    aoeRadius: 1.5,
    aoeRadiusPerTier: 0.5,
    aoeDamagePerTier: 0.15,
  },
};

/** Chain spell config */
export interface ChainSpellDef {
  id: string;
  cooldownTicks: number;
  /** Base damage multiplier on weapon damage */
  damageMult: number;
  /** Extra damage mult per tier */
  damagePerTier: number;
  /** Base number of jumps (minimum 1 = hits initial target only) */
  baseJumps: number;
  /** Extra jumps per tier */
  jumpsPerTier: number;
  /** Max distance a chain can jump to the next target */
  jumpRange: number;
  /** Damage decay per jump (multiplied each hop) */
  decayPerJump: number;
}

const CHAIN_SPELL_DEF: ChainSpellDef = {
  id: "chain_bolt",
  cooldownTicks: 600,
  damageMult: 0.6,
  damagePerTier: 0.15,
  baseJumps: 1,
  jumpsPerTier: 1,
  jumpRange: 5,
  decayPerJump: 0.8,
};

/** Returns true if the staff uses a chain spell instead of AoE */
function isChainStaff(staffId: string): boolean {
  return staffId.includes("storm") || staffId.includes("lightning") || staffId.includes("distortion");
}

/** Returns true if the staff is a healing staff (heals allies in AoE) */
function isHealStaff(staffId: string): boolean {
  return staffId.includes("healing") || staffId.includes("cleric") || staffId.includes("saint");
}

/** Heal AoE config */
const HEAL_SPELL_DEF = {
  cooldownTicks: 600,
  healMult: 0.6,       // base heal as fraction of weapon damage
  healPerTier: 0.2,
  aoeRadius: 2.0,
  aoeRadiusPerTier: 0.5,
};

function getSpellDef(_staffId: string): SpellDef {
  return SPELL_DEFS["default"];
}

/** Determine mage "spell tier" from staff id: base=0, adept=1, master=2, elite=3 */
function getSpellTier(staffId: string): number {
  if (staffId.includes("master") || staffId.includes("dark_savant")) return 2;
  if (staffId.includes("adept") || staffId.includes("warlock")) return 1;
  if (staffId.includes("battlemage") || staffId.includes("archmage")) return 3;
  return 0;
}

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

// ---- Flanking angle helper ------------------------------------------------

/**
 * Compute the angle between the direction from target to attacker and the
 * target's facing direction.  Returns 0 when the attacker is directly in
 * front of the target, PI when directly behind.
 */
function _flankingAngle(attacker: WarbandFighter, target: WarbandFighter): number {
  const angleToAttacker = Math.atan2(
    attacker.position.x - target.position.x,
    attacker.position.z - target.position.z,
  );
  let diff = angleToAttacker - target.rotation;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff);
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

  /** AoE explosions that happened this tick (for FX) */
  readonly aoeExplosions: {
    x: number; y: number; z: number;
    radius: number;
    color: number;
  }[] = [];

  /** Chain spell segments that happened this tick (for FX) */
  readonly chainSegments: {
    from: { x: number; y: number; z: number };
    to: { x: number; y: number; z: number };
    color: number;
  }[] = [];

  /** Heal AoE events this tick (for FX – visually distinct from damage AoE) */
  readonly healExplosions: {
    x: number; y: number; z: number;
    radius: number;
  }[] = [];

  update(state: WarbandState): void {
    this.hits.length = 0;
    this.kills.length = 0;
    this.aoeExplosions.length = 0;
    this.chainSegments.length = 0;
    this.healExplosions.length = 0;

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
            if (fighter.creatureType && !fighter.equipment.mainHand) {
              fighter.stateTimer = CREATURE_DEFS[fighter.creatureType].releaseTicks;
            } else {
              const speedMult = fighter.equipment.mainHand?.speed ?? 1;
              fighter.stateTimer = Math.round(WB.RELEASE_TICKS_BASE / speedMult);
            }
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

      // Spell casting (staff wielders only, on cooldown)
      if (
        fighter.equipment.mainHand &&
        isStaffWeapon(fighter.equipment.mainHand) &&
        fighter.ai // only AI casts spells for now
      ) {
        this._trySpellCast(fighter, state);
      }
    }

    // Update projectiles
    this._updateProjectiles(state);
  }

  private _checkMeleeHits(attacker: WarbandFighter, state: WarbandState): void {
    // Only check on the first tick of release (hit once per attack)
    let maxReleaseTicks: number;
    if (attacker.creatureType && !attacker.equipment.mainHand) {
      maxReleaseTicks = CREATURE_DEFS[attacker.creatureType].releaseTicks;
    } else {
      const speedMult = attacker.equipment.mainHand?.speed ?? 1;
      maxReleaseTicks = Math.round(WB.RELEASE_TICKS_BASE / speedMult);
    }
    if (attacker.stateTimer !== maxReleaseTicks - 1) return;

    const wpn = attacker.equipment.mainHand;
    // Creatures attack bare-handed using their creature def stats
    const creatureDef = attacker.creatureType ? CREATURE_DEFS[attacker.creatureType] : null;
    if (!wpn && !creatureDef) return;

    const reach = wpn ? wpn.reach : creatureDef!.reach;

    for (const target of state.fighters) {
      if (target.id === attacker.id) continue;
      if (target.team === attacker.team) continue;
      if (target.combatState === FighterCombatState.DEAD) continue;

      const dist = vec3DistXZ(attacker.position, target.position);
      if (dist > reach + target.creatureRadius) continue;

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

      // Charge bonus for mounted attackers
      let chargeMult = 1;
      if (attacker.isMounted) {
        const speed = Math.sqrt(attacker.velocity.x ** 2 + attacker.velocity.z ** 2);
        if (speed > WB.HORSE_CHARGE_MIN_SPEED) {
          chargeMult = WB.HORSE_CHARGE_MULT;
        }
      }

      if (blocked) {
        // Blocked: stagger attacker, drain target stamina
        attacker.combatState = FighterCombatState.STAGGERED;
        attacker.stateTimer = WB.STAGGER_TICKS;
        target.stamina -= WB.STAMINA_BLOCK_COST;
        target.blocks++;

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
        const baseDamage = wpn ? wpn.damage : creatureDef!.damage;

        // Hit landed — check if hitting the horse instead (30% for stab/swing on mounted target)
        if (target.isMounted && target.mountId) {
          const hitHorse = (attacker.attackDirection === CombatDirection.STAB ||
            attacker.attackDirection === CombatDirection.LEFT_SWING ||
            attacker.attackDirection === CombatDirection.RIGHT_SWING) && Math.random() < 0.3;
          if (hitHorse) {
            const horse = state.horses.find(h => h.id === target.mountId);
            if (horse && horse.alive) {
              const horseDef = horse.armorTier === "heavy" ? WB.HORSE_DEF_HEAVY
                : horse.armorTier === "medium" ? WB.HORSE_DEF_MEDIUM : WB.HORSE_DEF_LIGHT;
              const horseDmg = Math.max(1, Math.round(baseDamage * chargeMult - horseDef));
              horse.hp -= horseDmg;
              attacker.damage_dealt += horseDmg;

              this.hits.push({
                attacker: attacker.id,
                target: target.id,
                damage: horseDmg,
                zone: ArmorSlot.TORSO,
                blocked: false,
                position: {
                  x: target.position.x,
                  y: target.position.y + 0.5,
                  z: target.position.z,
                },
              });

              if (horse.hp <= 0) {
                horse.hp = 0;
                horse.alive = false;
                horse.riderId = null;
                target.mountId = null;
                target.isMounted = false;
                target.combatState = FighterCombatState.STAGGERED;
                target.stateTimer = WB.STAGGER_TICKS;
              }
              continue; // skip rider damage
            }
          }
        }

        const hitZone = attackHitZone(attacker.attackDirection);
        const zoneMult = hitZoneMultiplier(hitZone);
        const armorDef = target.equipment.armor[hitZone]?.defense ?? 0;
        let rawDamage = baseDamage * zoneMult * chargeMult;

        // Flanking bonus: compare attacker position to target facing direction
        const flankAngle = _flankingAngle(attacker, target);
        if (flankAngle > Math.PI * 2 / 3) {
          rawDamage *= 1.3;  // Behind target (>120°): 1.3x
        } else if (flankAngle > Math.PI / 3) {
          rawDamage *= 1.15; // Side of target (60-120°): 1.15x
        }

        // Siege defender bonus: defenders near their spawn get 1.15x damage
        if (state.battleType === BattleType.SIEGE) {
          const defenderSpawnZ = WB.SIEGE_CAPTURE_Z;
          if (attacker.team === "enemy") {
            const distFromSpawn = Math.abs(attacker.position.z - defenderSpawnZ);
            if (distFromSpawn < 10) {
              rawDamage *= 1.15; // fortification advantage
            }
          }
        }

        const finalDamage = Math.max(1, Math.round(rawDamage - armorDef));

        target.hp -= finalDamage;
        target.lastHitBy = attacker.id;
        attacker.damage_dealt += finalDamage;
        target.damage_taken += finalDamage;
        if (hitZone === ArmorSlot.HEAD) {
          attacker.headshots++;
        }

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
          attacker.currentStreak++;
          if (attacker.currentStreak > attacker.longestStreak) {
            attacker.longestStreak = attacker.currentStreak;
          }
          target.currentStreak = 0;
          attacker.gold += WB.GOLD_PER_KILL;
          if (hitZone === ArmorSlot.HEAD) {
            attacker.gold += WB.GOLD_HEADSHOT_BONUS;
          }

          // Dismount on death
          if (target.isMounted && target.mountId) {
            const horse = state.horses.find(h => h.id === target.mountId);
            if (horse) horse.riderId = null;
            target.mountId = null;
            target.isMounted = false;
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
    let spread = (1 - accuracy) * 0.15;

    // Rain weather: add 15% extra spread to projectile velocity
    if (state.weather === "rain") {
      spread += 0.15;
    }

    const isStaff = isStaffWeapon(wpn);
    const dirX = Math.sin(fighter.rotation) + (Math.random() - 0.5) * spread;
    const dirZ = Math.cos(fighter.rotation) + (Math.random() - 0.5) * spread;
    const dirY = isStaff ? (Math.random() - 0.5) * spread * 0.5 : 0.1 + (Math.random() - 0.5) * spread; // staff rays fly flat

    const proj: WarbandProjectile = {
      id: `proj_${state.tick}_${fighter.id}`,
      ownerId: fighter.id,
      ownerTeam: fighter.team,
      position: {
        x: fighter.position.x + Math.sin(fighter.rotation) * 0.5,
        y: fighter.position.y + (fighter.isMounted ? WB.HORSE_HEIGHT : 0) + WB.FIGHTER_HEIGHT * 0.75,
        z: fighter.position.z + Math.cos(fighter.rotation) * 0.5,
      },
      velocity: {
        x: dirX * speed,
        y: dirY * speed,
        z: dirZ * speed,
      },
      damage: wpn.damage,
      gravity: isStaff ? 0 : WB.ARROW_GRAVITY, // magic rays fly straight
      alive: true,
      age: 0,
      projectileColor: isStaff ? (wpn.accentColor ?? 0xffffff) : undefined,
    };

    state.projectiles.push(proj);
  }

  /** Try to cast a spell (cooldown-gated). Routes to AoE or chain depending on staff type. */
  private _trySpellCast(fighter: WarbandFighter, state: WarbandState): void {
    const wpn = fighter.equipment.mainHand!;

    // Heal spell: centered on self, doesn't need an enemy target
    if (isHealStaff(wpn.id)) {
      if (state.tick - fighter.lastSpellTick < HEAL_SPELL_DEF.cooldownTicks) return;
      fighter.lastSpellTick = state.tick;
      fighter.spellsCast++;
      this._castHealSpell(fighter, state);
      return;
    }

    const cooldown = isChainStaff(wpn.id) ? CHAIN_SPELL_DEF.cooldownTicks : getSpellDef(wpn.id).cooldownTicks;
    if (state.tick - fighter.lastSpellTick < cooldown) return;

    // Need a target in range
    if (!fighter.ai?.targetId) return;
    const target = state.fighters.find(f => f.id === fighter.ai!.targetId);
    if (!target || target.combatState === FighterCombatState.DEAD) return;

    const dist = vec3DistXZ(fighter.position, target.position);
    if (dist > 25) return; // max spell range

    fighter.lastSpellTick = state.tick;
    fighter.spellsCast++;

    if (isChainStaff(wpn.id)) {
      this._castChainSpell(fighter, target, state);
    } else {
      this._castAoeSpell(fighter, target, state);
    }
  }

  /** Fire an AoE spell projectile that explodes on impact */
  private _castAoeSpell(fighter: WarbandFighter, target: WarbandFighter, state: WarbandState): void {
    const wpn = fighter.equipment.mainHand!;
    const spell = getSpellDef(wpn.id);
    const tier = getSpellTier(wpn.id);
    const color = wpn.accentColor ?? 0xffffff;
    const speed = wpn.projectileSpeed ?? WB.ARROW_SPEED;
    const accuracy = wpn.accuracy ?? 0.85;
    let spread = (1 - accuracy) * 0.1;

    // Rain weather: add 15% extra spread to spell projectiles
    if (state.weather === "rain") {
      spread += 0.15;
    }

    const dx = target.position.x - fighter.position.x;
    const dz = target.position.z - fighter.position.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    const dirX = (dx / len) + (Math.random() - 0.5) * spread;
    const dirZ = (dz / len) + (Math.random() - 0.5) * spread;
    const dirY = (Math.random() - 0.5) * spread * 0.3;

    const proj: WarbandProjectile = {
      id: `spell_${state.tick}_${fighter.id}`,
      ownerId: fighter.id,
      ownerTeam: fighter.team,
      position: {
        x: fighter.position.x + Math.sin(fighter.rotation) * 0.5,
        y: fighter.position.y + (fighter.isMounted ? WB.HORSE_HEIGHT : 0) + WB.FIGHTER_HEIGHT * 0.75,
        z: fighter.position.z + Math.cos(fighter.rotation) * 0.5,
      },
      velocity: { x: dirX * speed, y: dirY * speed, z: dirZ * speed },
      damage: wpn.damage,
      gravity: 0,
      alive: true,
      age: 0,
      projectileColor: color,
      isSpell: true,
      aoeRadius: spell.aoeRadius + spell.aoeRadiusPerTier * tier,
      aoeDamage: Math.round(wpn.damage * (spell.aoeDamageMult + spell.aoeDamagePerTier * tier)),
      aoeColor: color,
    };

    state.projectiles.push(proj);
  }

  /** Cast an instant chain spell that jumps between enemies */
  private _castChainSpell(fighter: WarbandFighter, firstTarget: WarbandFighter, state: WarbandState): void {
    const wpn = fighter.equipment.mainHand!;
    const chain = CHAIN_SPELL_DEF;
    const tier = getSpellTier(wpn.id);
    const color = wpn.accentColor ?? 0xffffff;
    const totalJumps = chain.baseJumps + chain.jumpsPerTier * tier;
    let dmgMult = chain.damageMult + chain.damagePerTier * tier;

    const casterPos = {
      x: fighter.position.x,
      y: fighter.position.y + (fighter.isMounted ? WB.HORSE_HEIGHT : 0) + WB.FIGHTER_HEIGHT * 0.75,
      z: fighter.position.z,
    };

    const hitSet = new Set<string>();
    let prevPos = casterPos;
    let currentTarget: WarbandFighter | undefined = firstTarget;

    for (let jump = 0; jump <= totalJumps && currentTarget; jump++) {
      hitSet.add(currentTarget.id);

      const targetPos = {
        x: currentTarget.position.x,
        y: currentTarget.position.y + WB.FIGHTER_HEIGHT * 0.6,
        z: currentTarget.position.z,
      };

      // Visual segment
      this.chainSegments.push({ from: { ...prevPos }, to: { ...targetPos }, color });

      // Deal damage
      const damage = Math.max(1, Math.round(wpn.damage * dmgMult));
      currentTarget.hp -= damage;
      currentTarget.lastHitBy = fighter.id;
      fighter.damage_dealt += damage;
      currentTarget.damage_taken += damage;

      this.hits.push({
        attacker: fighter.id,
        target: currentTarget.id,
        damage,
        zone: ArmorSlot.TORSO,
        blocked: false,
        position: { ...targetPos },
      });

      if (currentTarget.hp <= 0) {
        currentTarget.hp = 0;
        currentTarget.combatState = FighterCombatState.DEAD;
        fighter.kills++;
        fighter.currentStreak++;
        if (fighter.currentStreak > fighter.longestStreak) {
          fighter.longestStreak = fighter.currentStreak;
        }
        currentTarget.currentStreak = 0;
        fighter.gold += WB.GOLD_PER_KILL;

        if (currentTarget.isMounted && currentTarget.mountId) {
          const horse = state.horses.find(h => h.id === currentTarget!.mountId);
          if (horse) horse.riderId = null;
          currentTarget.mountId = null;
          currentTarget.isMounted = false;
        }

        this.kills.push({ killerId: fighter.id, victimId: currentTarget.id });
        if (currentTarget.team === "player") state.playerTeamAlive--;
        else state.enemyTeamAlive--;
      }

      // Decay damage for next jump
      dmgMult *= chain.decayPerJump;
      prevPos = targetPos;

      // Find next closest enemy that hasn't been hit yet
      let bestDist = chain.jumpRange;
      let bestTarget: WarbandFighter | undefined;
      for (const candidate of state.fighters) {
        if (candidate.team === fighter.team) continue;
        if (candidate.combatState === FighterCombatState.DEAD) continue;
        if (hitSet.has(candidate.id)) continue;
        const d = vec3DistXZ(currentTarget.position, candidate.position);
        if (d < bestDist) {
          bestDist = d;
          bestTarget = candidate;
        }
      }
      currentTarget = bestTarget;
    }
  }

  /** Cast a healing AoE centered on the caster, healing nearby allies */
  private _castHealSpell(fighter: WarbandFighter, state: WarbandState): void {
    const wpn = fighter.equipment.mainHand!;
    const tier = getSpellTier(wpn.id);
    const radius = HEAL_SPELL_DEF.aoeRadius + HEAL_SPELL_DEF.aoeRadiusPerTier * tier;
    const healAmount = Math.round(wpn.damage * (HEAL_SPELL_DEF.healMult + HEAL_SPELL_DEF.healPerTier * tier));

    this.healExplosions.push({
      x: fighter.position.x,
      y: fighter.position.y,
      z: fighter.position.z,
      radius,
    });

    for (const ally of state.fighters) {
      if (ally.team !== fighter.team) continue;
      if (ally.combatState === FighterCombatState.DEAD) continue;
      if (ally.hp >= ally.maxHp) continue;

      const dist = vec3DistXZ(fighter.position, ally.position);
      if (dist > radius) continue;

      const falloff = 1 - (dist / radius) * 0.5;
      const heal = Math.max(1, Math.round(healAmount * falloff));
      ally.hp = Math.min(ally.maxHp, ally.hp + heal);
    }
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
        if (proj.isSpell) this._detonateSpell(proj, state);
        proj.alive = false;
        continue;
      }

      // Age limit
      if (proj.age > 300) {
        proj.alive = false;
        continue;
      }

      // Hit detection against horses (riderless)
      for (const horse of state.horses) {
        if (!horse.alive || horse.riderId) continue;
        const dx = proj.position.x - horse.position.x;
        const dy = proj.position.y - (horse.position.y + WB.HORSE_HEIGHT * 0.5);
        const dz = proj.position.z - horse.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < WB.HORSE_RADIUS) {
          const horseDef = horse.armorTier === "heavy" ? WB.HORSE_DEF_HEAVY
            : horse.armorTier === "medium" ? WB.HORSE_DEF_MEDIUM : WB.HORSE_DEF_LIGHT;
          const damage = Math.max(1, Math.round(proj.damage - horseDef));
          horse.hp -= damage;
          if (horse.hp <= 0) { horse.hp = 0; horse.alive = false; }
          if (proj.isSpell) this._detonateSpell(proj, state);
          proj.alive = false;
          break;
        }
      }
      if (!proj.alive) continue;

      // Hit detection against fighters
      for (const target of state.fighters) {
        if (target.id === proj.ownerId) continue;
        if (target.team === proj.ownerTeam) continue;
        if (target.combatState === FighterCombatState.DEAD) continue;

        // Mounted fighters are higher and wider targets
        const mountOffset = target.isMounted ? WB.HORSE_HEIGHT : 0;
        const hitRadius = target.isMounted ? WB.HORSE_RADIUS : target.creatureRadius + 0.15;

        const targetHeight = target.creatureType ? CREATURE_DEFS[target.creatureType].height : WB.FIGHTER_HEIGHT * (target.scale || 1.0);
        const dx = proj.position.x - target.position.x;
        const dy = proj.position.y - (target.position.y + mountOffset + targetHeight * 0.5);
        const dz = proj.position.z - target.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < hitRadius) {
          // Check if projectile hits horse body (below rider)
          const projRelY = proj.position.y - target.position.y;
          if (target.isMounted && target.mountId && projRelY < mountOffset * 0.8) {
            // Hit the horse
            const horse = state.horses.find(h => h.id === target.mountId);
            if (horse && horse.alive) {
              const horseDef = horse.armorTier === "heavy" ? WB.HORSE_DEF_HEAVY
                : horse.armorTier === "medium" ? WB.HORSE_DEF_MEDIUM : WB.HORSE_DEF_LIGHT;
              const damage = Math.max(1, Math.round(proj.damage - horseDef));
              horse.hp -= damage;
              const owner = state.fighters.find(f => f.id === proj.ownerId);
              if (owner) owner.damage_dealt += damage;

              this.hits.push({
                attacker: proj.ownerId, target: target.id, damage, zone: ArmorSlot.LEGS,
                blocked: false, position: { ...proj.position },
              });

              if (horse.hp <= 0) {
                horse.hp = 0;
                horse.alive = false;
                horse.riderId = null;
                target.mountId = null;
                target.isMounted = false;
                target.combatState = FighterCombatState.STAGGERED;
                target.stateTimer = WB.STAGGER_TICKS;
              }
              proj.alive = false;
              break;
            }
          }

          // Determine hit zone by projectile height relative to target
          const relHeight = (proj.position.y - target.position.y - mountOffset) / targetHeight;
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

          if (blocked) {
            target.blocks++;
          }

          if (!blocked) {
            const zoneMult = hitZoneMultiplier(hitZone);
            const armorDef = target.equipment.armor[hitZone]?.defense ?? 0;
            let projDmgMult = 1;
            // Siege defender bonus for ranged: defenders near spawn get 1.15x
            if (state.battleType === BattleType.SIEGE && proj.ownerTeam === "enemy") {
              const owner = state.fighters.find(f => f.id === proj.ownerId);
              if (owner) {
                const distFromSpawn = Math.abs(owner.position.z - WB.SIEGE_CAPTURE_Z);
                if (distFromSpawn < 10) {
                  projDmgMult = 1.15;
                }
              }
            }
            const damage = Math.max(1, Math.round(proj.damage * zoneMult * projDmgMult - armorDef));

            target.hp -= damage;
            target.lastHitBy = proj.ownerId;
            target.damage_taken += damage;

            // Find owner for stats
            const owner = state.fighters.find((f) => f.id === proj.ownerId);
            if (owner) {
              owner.damage_dealt += damage;
              if (hitZone === ArmorSlot.HEAD) {
                owner.headshots++;
              }
            }

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
                owner.currentStreak++;
                if (owner.currentStreak > owner.longestStreak) {
                  owner.longestStreak = owner.currentStreak;
                }
                owner.gold += WB.GOLD_PER_KILL;
                if (hitZone === ArmorSlot.HEAD) {
                  owner.gold += WB.GOLD_HEADSHOT_BONUS;
                }
              }
              target.currentStreak = 0;

              // Dismount on death
              if (target.isMounted && target.mountId) {
                const horse = state.horses.find(h => h.id === target.mountId);
                if (horse) horse.riderId = null;
                target.mountId = null;
                target.isMounted = false;
              }

              this.kills.push({
                killerId: proj.ownerId,
                victimId: target.id,
              });

              if (target.team === "player") state.playerTeamAlive--;
              else state.enemyTeamAlive--;
            }
          }

          if (proj.isSpell) this._detonateSpell(proj, state);
          proj.alive = false;
          break;
        }
      }
    }
  }

  /** Detonate a spell projectile: deal AoE damage to all enemies in radius */
  private _detonateSpell(proj: WarbandProjectile, state: WarbandState): void {
    const radius = proj.aoeRadius ?? 1.5;
    const aoeDmg = proj.aoeDamage ?? 5;
    const color = proj.aoeColor ?? 0xffffff;

    this.aoeExplosions.push({
      x: proj.position.x,
      y: Math.max(0.1, proj.position.y),
      z: proj.position.z,
      radius,
      color,
    });

    const owner = state.fighters.find(f => f.id === proj.ownerId);

    for (const target of state.fighters) {
      if (target.team === proj.ownerTeam) continue;
      if (target.combatState === FighterCombatState.DEAD) continue;

      const dx = proj.position.x - target.position.x;
      const dz = proj.position.z - target.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > radius) continue;

      // Damage falls off linearly with distance
      const falloff = 1 - (dist / radius) * 0.5;
      const damage = Math.max(1, Math.round(aoeDmg * falloff));

      target.hp -= damage;
      target.lastHitBy = proj.ownerId;
      target.damage_taken += damage;
      if (owner) owner.damage_dealt += damage;

      this.hits.push({
        attacker: proj.ownerId,
        target: target.id,
        damage,
        zone: ArmorSlot.TORSO,
        blocked: false,
        position: { x: target.position.x, y: target.position.y + 0.8, z: target.position.z },
      });

      if (target.hp <= 0) {
        target.hp = 0;
        target.combatState = FighterCombatState.DEAD;
        if (owner) {
          owner.kills++;
          owner.currentStreak++;
          if (owner.currentStreak > owner.longestStreak) {
            owner.longestStreak = owner.currentStreak;
          }
          owner.gold += WB.GOLD_PER_KILL;
        }
        target.currentStreak = 0;

        if (target.isMounted && target.mountId) {
          const horse = state.horses.find(h => h.id === target.mountId);
          if (horse) horse.riderId = null;
          target.mountId = null;
          target.isMounted = false;
        }

        this.kills.push({ killerId: proj.ownerId, victimId: target.id });

        if (target.team === "player") state.playerTeamAlive--;
        else state.enemyTeamAlive--;
      }
    }
  }

  // ---- Creature Special Abilities ------------------------------------------

  /** Creature ability explosions that happened this tick (for FX) */
  readonly creatureAbilityExplosions: {
    x: number; y: number; z: number;
    radius: number;
    color: number;
  }[] = [];

  /** Update creature special abilities – call from main combat loop */
  updateCreatureAbilities(state: WarbandState): void {
    if (!state.creatureAbilities) return;

    this.creatureAbilityExplosions.length = 0;

    for (const fighter of state.fighters) {
      if (fighter.combatState === FighterCombatState.DEAD) continue;
      if (!fighter.creatureType) continue;

      const def = CREATURE_DEFS[fighter.creatureType];
      if (!def.specialAbility) continue;

      const ability = def.specialAbility;

      // Regenerate is passive – always active
      if (ability.type === 'regenerate') {
        if (state.tick % ability.cooldownTicks === 0 && fighter.hp < fighter.maxHp) {
          fighter.hp = Math.min(fighter.maxHp, fighter.hp + ability.damage);
        }
        continue;
      }

      // Explode on death is handled separately (checked when HP <= 0)
      if (ability.type === 'explode_on_death') {
        continue;
      }

      // Cooldown check
      if (state.tick - fighter.lastSpellTick < ability.cooldownTicks) continue;

      // Find nearest enemy
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

      if (!nearestEnemy) continue;

      switch (ability.type) {
        case 'fire_breath':
          this._executeFireBreath(fighter, ability, state, nearestEnemy, nearestDist);
          break;
        case 'stomp':
          this._executeStomp(fighter, ability, state);
          break;
        case 'poison_aura':
          this._executePoisonAura(fighter, ability, state);
          break;
        case 'lightning_strike':
          this._executeLightningStrike(fighter, ability, state, nearestEnemy, nearestDist);
          break;
        case 'ice_nova':
          this._executeIceNova(fighter, ability, state);
          break;
      }
    }
  }

  /** Handle explode-on-death abilities – call when a creature dies */
  handleCreatureDeathAbility(victim: WarbandFighter, state: WarbandState): void {
    if (!state.creatureAbilities) return;
    if (!victim.creatureType) return;

    const def = CREATURE_DEFS[victim.creatureType];
    if (!def.specialAbility || def.specialAbility.type !== 'explode_on_death') return;

    const ability = def.specialAbility;
    const color = 0xff4400;

    this.creatureAbilityExplosions.push({
      x: victim.position.x,
      y: victim.position.y + 0.5,
      z: victim.position.z,
      radius: ability.radius,
      color,
    });

    for (const target of state.fighters) {
      if (target.team === victim.team) continue;
      if (target.combatState === FighterCombatState.DEAD) continue;

      const dist = vec3DistXZ(victim.position, target.position);
      if (dist > ability.radius) continue;

      const falloff = 1 - (dist / ability.radius) * 0.5;
      const damage = Math.max(1, Math.round(ability.damage * falloff));

      target.hp -= damage;
      target.damage_taken += damage;
      target.lastHitBy = victim.id;

      this.hits.push({
        attacker: victim.id,
        target: target.id,
        damage,
        zone: ArmorSlot.TORSO,
        blocked: false,
        position: { x: target.position.x, y: target.position.y + 0.8, z: target.position.z },
      });

      if (target.hp <= 0) {
        target.hp = 0;
        target.combatState = FighterCombatState.DEAD;
        target.currentStreak = 0;

        if (target.isMounted && target.mountId) {
          const horse = state.horses.find(h => h.id === target.mountId);
          if (horse) horse.riderId = null;
          target.mountId = null;
          target.isMounted = false;
        }

        this.kills.push({ killerId: victim.id, victimId: target.id });
        if (target.team === "player") state.playerTeamAlive--;
        else state.enemyTeamAlive--;
      }
    }
  }

  private _executeFireBreath(
    fighter: WarbandFighter,
    ability: CreatureSpecialAbility,
    state: WarbandState,
    _nearestEnemy: WarbandFighter,
    nearestDist: number,
  ): void {
    // Fire breath: cone damage in front (60 degree arc)
    if (nearestDist > ability.radius) return;

    fighter.lastSpellTick = state.tick;

    const color = 0xff6600;
    this.creatureAbilityExplosions.push({
      x: fighter.position.x + Math.sin(fighter.rotation) * (ability.radius * 0.5),
      y: fighter.position.y + 1.5,
      z: fighter.position.z + Math.cos(fighter.rotation) * (ability.radius * 0.5),
      radius: ability.radius,
      color,
    });

    for (const target of state.fighters) {
      if (target.team === fighter.team) continue;
      if (target.combatState === FighterCombatState.DEAD) continue;

      const dist = vec3DistXZ(fighter.position, target.position);
      if (dist > ability.radius) continue;

      // Check cone (60 degree arc = 30 degrees each side)
      const angleToTarget = Math.atan2(
        target.position.x - fighter.position.x,
        target.position.z - fighter.position.z,
      );
      let angleDiff = angleToTarget - fighter.rotation;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) > Math.PI / 6) continue; // 30 degrees each side

      const falloff = 1 - (dist / ability.radius) * 0.5;
      const damage = Math.max(1, Math.round(ability.damage * falloff));

      target.hp -= damage;
      target.damage_taken += damage;
      target.lastHitBy = fighter.id;
      fighter.damage_dealt += damage;

      this.hits.push({
        attacker: fighter.id,
        target: target.id,
        damage,
        zone: ArmorSlot.TORSO,
        blocked: false,
        position: { x: target.position.x, y: target.position.y + 0.8, z: target.position.z },
      });

      if (target.hp <= 0) {
        target.hp = 0;
        target.combatState = FighterCombatState.DEAD;
        fighter.kills++;
        fighter.currentStreak++;
        if (fighter.currentStreak > fighter.longestStreak) {
          fighter.longestStreak = fighter.currentStreak;
        }
        target.currentStreak = 0;

        if (target.isMounted && target.mountId) {
          const horse = state.horses.find(h => h.id === target.mountId);
          if (horse) horse.riderId = null;
          target.mountId = null;
          target.isMounted = false;
        }

        this.kills.push({ killerId: fighter.id, victimId: target.id });
        if (target.team === "player") state.playerTeamAlive--;
        else state.enemyTeamAlive--;
      }
    }
  }

  private _executeStomp(
    fighter: WarbandFighter,
    ability: CreatureSpecialAbility,
    state: WarbandState,
  ): void {
    // Stomp: AoE around self, only trigger if an enemy is within range
    let hasNearby = false;
    for (const other of state.fighters) {
      if (other.team === fighter.team || other.combatState === FighterCombatState.DEAD) continue;
      if (vec3DistXZ(fighter.position, other.position) <= ability.radius) {
        hasNearby = true;
        break;
      }
    }
    if (!hasNearby) return;

    fighter.lastSpellTick = state.tick;

    const color = 0x886633;
    this.creatureAbilityExplosions.push({
      x: fighter.position.x,
      y: fighter.position.y + 0.2,
      z: fighter.position.z,
      radius: ability.radius,
      color,
    });

    for (const target of state.fighters) {
      if (target.team === fighter.team) continue;
      if (target.combatState === FighterCombatState.DEAD) continue;

      const dist = vec3DistXZ(fighter.position, target.position);
      if (dist > ability.radius) continue;

      const falloff = 1 - (dist / ability.radius) * 0.5;
      const damage = Math.max(1, Math.round(ability.damage * falloff));

      target.hp -= damage;
      target.damage_taken += damage;
      target.lastHitBy = fighter.id;
      fighter.damage_dealt += damage;

      // Stomp staggers targets
      target.combatState = FighterCombatState.STAGGERED;
      target.stateTimer = Math.round(WB.STAGGER_TICKS * 0.5);

      this.hits.push({
        attacker: fighter.id,
        target: target.id,
        damage,
        zone: ArmorSlot.LEGS,
        blocked: false,
        position: { x: target.position.x, y: target.position.y + 0.3, z: target.position.z },
      });

      if (target.hp <= 0) {
        target.hp = 0;
        target.combatState = FighterCombatState.DEAD;
        fighter.kills++;
        fighter.currentStreak++;
        if (fighter.currentStreak > fighter.longestStreak) {
          fighter.longestStreak = fighter.currentStreak;
        }
        target.currentStreak = 0;

        if (target.isMounted && target.mountId) {
          const horse = state.horses.find(h => h.id === target.mountId);
          if (horse) horse.riderId = null;
          target.mountId = null;
          target.isMounted = false;
        }

        this.kills.push({ killerId: fighter.id, victimId: target.id });
        if (target.team === "player") state.playerTeamAlive--;
        else state.enemyTeamAlive--;
      }
    }
  }

  private _executePoisonAura(
    fighter: WarbandFighter,
    ability: CreatureSpecialAbility,
    state: WarbandState,
  ): void {
    // Poison aura: slow tick damage to nearby enemies (2 damage per 60 ticks)
    if (state.tick % 60 !== 0) return;

    let hasNearby = false;
    for (const other of state.fighters) {
      if (other.team === fighter.team || other.combatState === FighterCombatState.DEAD) continue;
      if (vec3DistXZ(fighter.position, other.position) <= ability.radius) {
        hasNearby = true;
        break;
      }
    }
    if (!hasNearby) return;

    for (const target of state.fighters) {
      if (target.team === fighter.team) continue;
      if (target.combatState === FighterCombatState.DEAD) continue;

      const dist = vec3DistXZ(fighter.position, target.position);
      if (dist > ability.radius) continue;

      const damage = ability.damage;
      target.hp -= damage;
      target.damage_taken += damage;
      target.lastHitBy = fighter.id;
      fighter.damage_dealt += damage;

      if (target.hp <= 0) {
        target.hp = 0;
        target.combatState = FighterCombatState.DEAD;
        fighter.kills++;
        fighter.currentStreak++;
        if (fighter.currentStreak > fighter.longestStreak) {
          fighter.longestStreak = fighter.currentStreak;
        }
        target.currentStreak = 0;

        if (target.isMounted && target.mountId) {
          const horse = state.horses.find(h => h.id === target.mountId);
          if (horse) horse.riderId = null;
          target.mountId = null;
          target.isMounted = false;
        }

        this.kills.push({ killerId: fighter.id, victimId: target.id });
        if (target.team === "player") state.playerTeamAlive--;
        else state.enemyTeamAlive--;
      }
    }
  }

  private _executeLightningStrike(
    fighter: WarbandFighter,
    ability: CreatureSpecialAbility,
    state: WarbandState,
    nearestEnemy: WarbandFighter,
    nearestDist: number,
  ): void {
    // Lightning strike: single-target high damage to nearest enemy
    const maxRange = 8;
    if (nearestDist > maxRange) return;

    fighter.lastSpellTick = state.tick;

    const color = 0x88ccff;
    const target = nearestEnemy;
    const damage = ability.damage;

    // Visual bolt
    this.chainSegments.push({
      from: {
        x: fighter.position.x,
        y: fighter.position.y + (CREATURE_DEFS[fighter.creatureType!].height * 0.8),
        z: fighter.position.z,
      },
      to: {
        x: target.position.x,
        y: target.position.y + WB.FIGHTER_HEIGHT * 0.6,
        z: target.position.z,
      },
      color,
    });

    target.hp -= damage;
    target.damage_taken += damage;
    target.lastHitBy = fighter.id;
    fighter.damage_dealt += damage;

    this.hits.push({
      attacker: fighter.id,
      target: target.id,
      damage,
      zone: ArmorSlot.TORSO,
      blocked: false,
      position: { x: target.position.x, y: target.position.y + 0.8, z: target.position.z },
    });

    if (target.hp <= 0) {
      target.hp = 0;
      target.combatState = FighterCombatState.DEAD;
      fighter.kills++;
      fighter.currentStreak++;
      if (fighter.currentStreak > fighter.longestStreak) {
        fighter.longestStreak = fighter.currentStreak;
      }
      target.currentStreak = 0;

      if (target.isMounted && target.mountId) {
        const horse = state.horses.find(h => h.id === target.mountId);
        if (horse) horse.riderId = null;
        target.mountId = null;
        target.isMounted = false;
      }

      this.kills.push({ killerId: fighter.id, victimId: target.id });
      if (target.team === "player") state.playerTeamAlive--;
      else state.enemyTeamAlive--;
    }
  }

  private _executeIceNova(
    fighter: WarbandFighter,
    ability: CreatureSpecialAbility,
    state: WarbandState,
  ): void {
    // Ice nova: AoE around self
    let hasNearby = false;
    for (const other of state.fighters) {
      if (other.team === fighter.team || other.combatState === FighterCombatState.DEAD) continue;
      if (vec3DistXZ(fighter.position, other.position) <= ability.radius) {
        hasNearby = true;
        break;
      }
    }
    if (!hasNearby) return;

    fighter.lastSpellTick = state.tick;

    const color = 0x88ddff;
    this.creatureAbilityExplosions.push({
      x: fighter.position.x,
      y: fighter.position.y + 0.5,
      z: fighter.position.z,
      radius: ability.radius,
      color,
    });

    for (const target of state.fighters) {
      if (target.team === fighter.team) continue;
      if (target.combatState === FighterCombatState.DEAD) continue;

      const dist = vec3DistXZ(fighter.position, target.position);
      if (dist > ability.radius) continue;

      const falloff = 1 - (dist / ability.radius) * 0.5;
      const damage = Math.max(1, Math.round(ability.damage * falloff));

      target.hp -= damage;
      target.damage_taken += damage;
      target.lastHitBy = fighter.id;
      fighter.damage_dealt += damage;

      this.hits.push({
        attacker: fighter.id,
        target: target.id,
        damage,
        zone: ArmorSlot.TORSO,
        blocked: false,
        position: { x: target.position.x, y: target.position.y + 0.8, z: target.position.z },
      });

      if (target.hp <= 0) {
        target.hp = 0;
        target.combatState = FighterCombatState.DEAD;
        fighter.kills++;
        fighter.currentStreak++;
        if (fighter.currentStreak > fighter.longestStreak) {
          fighter.longestStreak = fighter.currentStreak;
        }
        target.currentStreak = 0;

        if (target.isMounted && target.mountId) {
          const horse = state.horses.find(h => h.id === target.mountId);
          if (horse) horse.riderId = null;
          target.mountId = null;
          target.isMounted = false;
        }

        this.kills.push({ killerId: fighter.id, victimId: target.id });
        if (target.team === "player") state.playerTeamAlive--;
        else state.enemyTeamAlive--;
      }
    }
  }
}
