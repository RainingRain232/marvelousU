// ============================================================================
// ArthurianRPGCombat.ts – Real-time combat system for an Arthurian RPG
// ============================================================================

// ---------------------------------------------------------------------------
// Types & Config imports
// ---------------------------------------------------------------------------

import type {
  ArthurianRPGState,
  CombatantState,
  ActiveEffect,
  CombatAction,
  EnemyAIProfile,
  BossPhase,
  CompanionCombatRole,
  DamageInstance,
  HitResult,
  ComboState,
} from "./ArthurianRPGState";

import {
  ElementalType,
  CombatActionType,
} from "./ArthurianRPGConfig";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIGHT_ATTACK_COOLDOWN = 0.45; // seconds
const HEAVY_ATTACK_COOLDOWN = 1.2;
const BLOCK_STAMINA_COST_PER_SEC = 8;
const DODGE_ROLL_COOLDOWN = 0.8;
const DODGE_ROLL_STAMINA_COST = 25;
const DODGE_IFRAME_DURATION = 0.3;
const SPELL_CAST_BASE_TIME = 0.9;
const HEALING_ANIMATION_LOCK = 1.5;
const COMBO_WINDOW = 0.8; // seconds to chain next light attack
const MAX_COMBO_CHAIN = 5;
const COMBO_DAMAGE_BONUS_PER_HIT = 0.1; // +10 % per chain
const CRIT_BASE_CHANCE = 0.05;
const CRIT_DAMAGE_MULTIPLIER = 2.0;
export const STAGGER_THRESHOLD = 30; // poise damage to stagger
const STAGGER_DURATION = 1.0;
const RESPAWN_DELAY = 5.0;

export const BOSS_PHASE_HP_THRESHOLDS = [0.75, 0.5, 0.25]; // transition at 75/50/25 %

// ---------------------------------------------------------------------------
// Elemental effectiveness matrix  (attacker → defender → multiplier)
// ---------------------------------------------------------------------------

const ELEMENTAL_MATRIX: Record<ElementalType, Partial<Record<ElementalType, number>>> = {
  [ElementalType.Fire]: { [ElementalType.Ice]: 1.5, [ElementalType.Dark]: 1.25 },
  [ElementalType.Ice]: { [ElementalType.Lightning]: 1.5, [ElementalType.Fire]: 0.75 },
  [ElementalType.Lightning]: { [ElementalType.Fire]: 1.5, [ElementalType.Ice]: 0.75 },
  [ElementalType.Holy]: { [ElementalType.Dark]: 2.0 },
  [ElementalType.Dark]: { [ElementalType.Holy]: 2.0, [ElementalType.Physical]: 1.1 },
  [ElementalType.Physical]: {},
};

// ---------------------------------------------------------------------------
// Damage calculation helpers
// ---------------------------------------------------------------------------

/**
 * Core damage formula.
 *
 *   baseDamage = weaponDamage + (attribute * scaling)
 *   skillBonus  = 1 + (skillLevel * 0.01)
 *   comboBonus  = 1 + (comboChain * COMBO_DAMAGE_BONUS_PER_HIT)
 *   raw         = baseDamage * skillBonus * comboBonus * perkMultiplier
 *   elemental   = raw * elementalEffectiveness
 *   afterArmor  = elemental * (1 - armorMitigation)
 */
function calculateDamage(
  attacker: CombatantState,
  defender: CombatantState,
  action: CombatAction,
  combo: ComboState,
): DamageInstance {
  const weapon = attacker.equipment.mainHand;
  const weaponDamage = weapon ? weapon.baseDamage : 5; // unarmed fallback
  const element = weapon?.element ?? ElementalType.Physical;
  const attribute = getRelevantAttribute(attacker, action);
  const scaling = weapon?.attributeScaling ?? 1.0;

  const baseDamage = weaponDamage + attribute * scaling;

  // Skill bonus
  const skillKey = getSkillKeyForAction(action);
  const skillLevel = attacker.skills[skillKey] ?? 0;
  const skillBonus = 1 + skillLevel * 0.01;

  // Combo
  const comboBonus =
    action.type === CombatActionType.LightAttack
      ? 1 + combo.chain * COMBO_DAMAGE_BONUS_PER_HIT
      : 1;

  // Perk multiplier  (aggregated from equipped perks)
  const perkMult = computePerkMultiplier(attacker, action);

  let raw = baseDamage * skillBonus * comboBonus * perkMult;

  // Heavy attack bonus
  if (action.type === CombatActionType.HeavyAttack) {
    raw *= 1.75;
  }

  // Elemental effectiveness
  const defElement = defender.primaryElement ?? ElementalType.Physical;
  const eleMult = ELEMENTAL_MATRIX[element]?.[defElement] ?? 1.0;
  const elemental = raw * eleMult;

  // Armor mitigation: reduction = armor / (armor + 100)
  const armor = computeTotalArmor(defender);
  const mitigation = armor / (armor + 100);
  const afterArmor = elemental * (1 - mitigation);

  // Critical hit
  const critChance = CRIT_BASE_CHANCE + skillLevel * 0.002;
  const isCrit = Math.random() < critChance;
  const finalDamage = isCrit ? afterArmor * CRIT_DAMAGE_MULTIPLIER : afterArmor;

  return {
    amount: Math.max(1, Math.round(finalDamage)),
    element,
    isCritical: isCrit,
    isBlocked: false,
    staggerDamage: action.type === CombatActionType.HeavyAttack ? 20 : 10,
  };
}

function getRelevantAttribute(c: CombatantState, action: CombatAction): number {
  switch (action.type) {
    case CombatActionType.SpellCast:
      return c.attributes.intelligence;
    case CombatActionType.HeavyAttack:
      return c.attributes.strength;
    default:
      return c.attributes.dexterity;
  }
}

function getSkillKeyForAction(action: CombatAction): string {
  switch (action.type) {
    case CombatActionType.SpellCast:
      return "destruction";
    case CombatActionType.HeavyAttack:
      return "twoHanded";
    default:
      return "oneHanded";
  }
}

function computePerkMultiplier(c: CombatantState, _action: CombatAction): number {
  let mult = 1.0;
  for (const perk of c.perks) {
    mult *= perk.damageMultiplier ?? 1.0;
  }
  return mult;
}

function computeTotalArmor(c: CombatantState): number {
  const g = c.equipment;
  let total = 0;
  if (g.head) total += g.head.armorValue;
  if (g.chest) total += g.chest.armorValue;
  if (g.legs) total += g.legs.armorValue;
  if (g.feet) total += g.feet.armorValue;
  if (g.offHand?.armorValue) total += g.offHand.armorValue;
  return total;
}

// ---------------------------------------------------------------------------
// Combo tracker
// ---------------------------------------------------------------------------

export class ComboTracker {
  chain = 0;
  lastHitTime = 0;

  registerHit(time: number): number {
    if (time - this.lastHitTime <= COMBO_WINDOW && this.chain < MAX_COMBO_CHAIN) {
      this.chain++;
    } else {
      this.chain = 1;
    }
    this.lastHitTime = time;
    return this.chain;
  }

  getState(): ComboState {
    return { chain: this.chain, lastHitTime: this.lastHitTime };
  }

  reset(): void {
    this.chain = 0;
    this.lastHitTime = 0;
  }
}

// ---------------------------------------------------------------------------
// Stagger / Poise system
// ---------------------------------------------------------------------------

export class PoiseTracker {
  private currentPoise: number;
  private maxPoise: number;
  private staggerTimer = 0;
  isStaggered = false;

  constructor(maxPoise: number) {
    this.maxPoise = maxPoise;
    this.currentPoise = maxPoise;
  }

  applyPoiseDamage(amount: number): boolean {
    if (this.isStaggered) return false;
    this.currentPoise -= amount;
    if (this.currentPoise <= 0) {
      this.isStaggered = true;
      this.staggerTimer = STAGGER_DURATION;
      return true; // stagger triggered
    }
    return false;
  }

  update(dt: number): void {
    if (this.isStaggered) {
      this.staggerTimer -= dt;
      if (this.staggerTimer <= 0) {
        this.isStaggered = false;
        this.currentPoise = this.maxPoise;
      }
    } else {
      // Regenerate poise slowly
      this.currentPoise = Math.min(this.maxPoise, this.currentPoise + dt * 10);
    }
  }
}

// ---------------------------------------------------------------------------
// Block system
// ---------------------------------------------------------------------------

function processBlock(
  defender: CombatantState,
  incoming: DamageInstance,
): DamageInstance {
  if (!defender.isBlocking) return incoming;

  const shield = defender.equipment.offHand;
  const blockEfficiency = shield ? shield.blockEfficiency ?? 0.6 : 0.3;
  const reducedAmount = Math.round(incoming.amount * (1 - blockEfficiency));

  return {
    ...incoming,
    amount: Math.max(0, reducedAmount),
    isBlocked: true,
    staggerDamage: Math.round(incoming.staggerDamage * 0.5),
  };
}

// ---------------------------------------------------------------------------
// Dodge roll
// ---------------------------------------------------------------------------

export class DodgeRollHandler {
  private cooldownRemaining = 0;
  private iFrameRemaining = 0;
  isRolling = false;
  isInvincible = false;
  rollDirection = { x: 0, z: 0 };

  attempt(dirX: number, dirZ: number, stamina: number): boolean {
    if (this.cooldownRemaining > 0 || stamina < DODGE_ROLL_STAMINA_COST) {
      return false;
    }
    this.isRolling = true;
    this.isInvincible = true;
    this.iFrameRemaining = DODGE_IFRAME_DURATION;
    this.cooldownRemaining = DODGE_ROLL_COOLDOWN;
    const mag = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
    this.rollDirection = { x: dirX / mag, z: dirZ / mag };
    return true;
  }

  update(dt: number): void {
    if (this.iFrameRemaining > 0) {
      this.iFrameRemaining -= dt;
      if (this.iFrameRemaining <= 0) {
        this.isInvincible = false;
        this.isRolling = false;
      }
    }
    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining -= dt;
    }
  }
}

// ---------------------------------------------------------------------------
// Active Effects (buffs / debuffs / DoTs)
// ---------------------------------------------------------------------------

function applyActiveEffects(
  combatant: CombatantState,
  effects: ActiveEffect[],
  dt: number,
): ActiveEffect[] {
  const remaining: ActiveEffect[] = [];

  for (const eff of effects) {
    eff.elapsed += dt;

    // Periodic tick
    if (eff.tickInterval > 0) {
      const ticksDue = Math.floor(eff.elapsed / eff.tickInterval) -
        Math.floor((eff.elapsed - dt) / eff.tickInterval);
      for (let i = 0; i < ticksDue; i++) {
        if (eff.damagePerTick) {
          combatant.hp = Math.max(0, combatant.hp - eff.damagePerTick);
        }
        if (eff.healPerTick) {
          combatant.hp = Math.min(combatant.maxHp, combatant.hp + eff.healPerTick);
        }
      }
    }

    if (eff.elapsed < eff.duration) {
      remaining.push(eff);
    }
  }

  return remaining;
}

// ---------------------------------------------------------------------------
// Healing action (with animation lock)
// ---------------------------------------------------------------------------

export class HealingHandler {
  isLocked = false;
  private lockTimer = 0;

  beginHeal(combatant: CombatantState, healAmount: number): boolean {
    if (this.isLocked || combatant.hp >= combatant.maxHp) return false;
    this.isLocked = true;
    this.lockTimer = HEALING_ANIMATION_LOCK;
    combatant.hp = Math.min(combatant.maxHp, combatant.hp + healAmount);
    return true;
  }

  update(dt: number): void {
    if (this.isLocked) {
      this.lockTimer -= dt;
      if (this.lockTimer <= 0) {
        this.isLocked = false;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Spell casting
// ---------------------------------------------------------------------------

export interface SpellDef {
  id: string;
  name: string;
  manaCost: number;
  castTime: number; // multiplier on SPELL_CAST_BASE_TIME
  damage: number;
  element: ElementalType;
  cooldown: number;
  areaRadius: number; // 0 = single target
  effect?: Partial<ActiveEffect>;
}

const SPELL_BOOK: SpellDef[] = [
  {
    id: "fireball",
    name: "Fireball",
    manaCost: 30,
    castTime: 1.0,
    damage: 50,
    element: ElementalType.Fire,
    cooldown: 3.0,
    areaRadius: 3,
    effect: {
      id: "burn",
      name: "Burning",
      duration: 4,
      tickInterval: 1,
      damagePerTick: 8,
      elapsed: 0,
    },
  },
  {
    id: "frost_spike",
    name: "Frost Spike",
    manaCost: 20,
    castTime: 0.6,
    damage: 35,
    element: ElementalType.Ice,
    cooldown: 2.0,
    areaRadius: 0,
  },
  {
    id: "lightning_bolt",
    name: "Lightning Bolt",
    manaCost: 40,
    castTime: 0.8,
    damage: 60,
    element: ElementalType.Lightning,
    cooldown: 4.0,
    areaRadius: 0,
  },
  {
    id: "holy_smite",
    name: "Holy Smite",
    manaCost: 50,
    castTime: 1.2,
    damage: 70,
    element: ElementalType.Holy,
    cooldown: 6.0,
    areaRadius: 2,
  },
  {
    id: "shadow_bolt",
    name: "Shadow Bolt",
    manaCost: 25,
    castTime: 0.7,
    damage: 45,
    element: ElementalType.Dark,
    cooldown: 2.5,
    areaRadius: 0,
  },
  {
    id: "healing_light",
    name: "Healing Light",
    manaCost: 35,
    castTime: 1.4,
    damage: -60, // negative = heal
    element: ElementalType.Holy,
    cooldown: 8.0,
    areaRadius: 0,
  },
];

export class SpellCaster {
  private cooldowns: Map<string, number> = new Map();
  private castingSpell: SpellDef | null = null;
  private castProgress = 0;
  isCasting = false;

  getSpellBook(): SpellDef[] {
    return SPELL_BOOK;
  }

  beginCast(spellId: string, mana: number): SpellDef | null {
    const spell = SPELL_BOOK.find((s) => s.id === spellId);
    if (!spell) return null;
    if (mana < spell.manaCost) return null;
    const cd = this.cooldowns.get(spellId) ?? 0;
    if (cd > 0) return null;
    this.castingSpell = spell;
    this.castProgress = 0;
    this.isCasting = true;
    return spell;
  }

  update(dt: number): SpellDef | null {
    // Tick cooldowns
    for (const [id, cd] of this.cooldowns) {
      const next = cd - dt;
      if (next <= 0) this.cooldowns.delete(id);
      else this.cooldowns.set(id, next);
    }

    if (!this.castingSpell) return null;
    this.castProgress += dt;
    const needed = this.castingSpell.castTime * SPELL_CAST_BASE_TIME;
    if (this.castProgress >= needed) {
      const spell = this.castingSpell;
      this.cooldowns.set(spell.id, spell.cooldown);
      this.castingSpell = null;
      this.isCasting = false;
      this.castProgress = 0;
      return spell; // spell fires
    }
    return null;
  }

  cancelCast(): void {
    this.castingSpell = null;
    this.isCasting = false;
    this.castProgress = 0;
  }

  getCastProgress(): number {
    if (!this.castingSpell) return 0;
    return this.castProgress / (this.castingSpell.castTime * SPELL_CAST_BASE_TIME);
  }
}

// ---------------------------------------------------------------------------
// Enemy Combat AI
// ---------------------------------------------------------------------------

export class EnemyCombatAI {
  private decisionTimer = 0;
  private circleDirection = 1;
  private attackCooldown = 0;

  constructor(private profile: EnemyAIProfile) {}

  update(
    self: CombatantState,
    target: CombatantState,
    dt: number,
  ): CombatAction | null {
    this.decisionTimer -= dt;
    this.attackCooldown -= dt;

    const dx = target.position.x - self.position.x;
    const dz = target.position.z - self.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Flee at low HP
    if (self.hp / self.maxHp < (this.profile.fleeThreshold ?? 0.15)) {
      return {
        type: CombatActionType.Dodge,
        direction: { x: -dx / dist, z: -dz / dist },
      };
    }

    // Too far – approach
    if (dist > this.profile.attackRange) {
      return {
        type: CombatActionType.Move,
        direction: { x: dx / dist, z: dz / dist },
      };
    }

    // Within attack range
    if (this.decisionTimer <= 0) {
      this.decisionTimer = this.profile.decisionInterval ?? 0.8;
      this.circleDirection *= Math.random() < 0.3 ? -1 : 1;
    }

    // Circle strafe between attacks
    if (this.attackCooldown > 0) {
      const perpX = -dz / dist * this.circleDirection;
      const perpZ = dx / dist * this.circleDirection;
      return { type: CombatActionType.Move, direction: { x: perpX, z: perpZ } };
    }

    // Choose attack
    const roll = Math.random();
    if (roll < this.profile.heavyAttackChance) {
      this.attackCooldown = HEAVY_ATTACK_COOLDOWN + (this.profile.attackDelay ?? 0);
      return { type: CombatActionType.HeavyAttack };
    } else if (roll < this.profile.heavyAttackChance + (this.profile.blockChance ?? 0.1)) {
      return { type: CombatActionType.Block };
    } else {
      this.attackCooldown = LIGHT_ATTACK_COOLDOWN + (this.profile.attackDelay ?? 0);
      return { type: CombatActionType.LightAttack };
    }
  }
}

// ---------------------------------------------------------------------------
// Boss Combat AI  (multi-phase)
// ---------------------------------------------------------------------------

export class BossCombatAI {
  private currentPhaseIndex = 0;
  private phaseTimer = 0;
  private specialCooldown = 0;
  private summonCooldown = 0;

  constructor(private phases: BossPhase[]) {}

  get currentPhase(): BossPhase {
    return this.phases[this.currentPhaseIndex];
  }

  update(
    self: CombatantState,
    target: CombatantState,
    dt: number,
  ): CombatAction | null {
    this.phaseTimer += dt;
    this.specialCooldown -= dt;
    this.summonCooldown -= dt;

    // Phase transitions
    const hpPercent = self.hp / self.maxHp;
    for (let i = this.currentPhaseIndex + 1; i < this.phases.length; i++) {
      if (hpPercent <= this.phases[i].hpThreshold) {
        this.currentPhaseIndex = i;
        this.phaseTimer = 0;
        // Return a phase-transition action for the HUD to show
        return {
          type: CombatActionType.Special,
          specialId: "phase_transition",
          data: { phase: i, name: this.phases[i].name },
        };
      }
    }

    const phase = this.currentPhase;

    // Summon adds
    if (phase.canSummon && this.summonCooldown <= 0) {
      this.summonCooldown = phase.summonCooldown ?? 15;
      return {
        type: CombatActionType.Special,
        specialId: "summon_adds",
        data: { count: phase.summonCount ?? 2, enemyType: phase.summonType ?? "skeleton" },
      };
    }

    // Special attack
    if (this.specialCooldown <= 0 && phase.specialAttacks.length > 0) {
      const idx = Math.floor(Math.random() * phase.specialAttacks.length);
      const special = phase.specialAttacks[idx];
      this.specialCooldown = special.cooldown;
      return {
        type: CombatActionType.Special,
        specialId: special.id,
        data: {
          damage: special.damage,
          element: special.element,
          areaRadius: special.areaRadius,
        },
      };
    }

    // Default melee
    const dx = target.position.x - self.position.x;
    const dz = target.position.z - self.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > (phase.attackRange ?? 3)) {
      return { type: CombatActionType.Move, direction: { x: dx / dist, z: dz / dist } };
    }

    return {
      type: Math.random() < 0.4
        ? CombatActionType.HeavyAttack
        : CombatActionType.LightAttack,
    };
  }
}

// ---------------------------------------------------------------------------
// Companion Combat AI
// ---------------------------------------------------------------------------

export class CompanionCombatAI {
  private healCooldown = 0;

  constructor(private role: CompanionCombatRole) {}

  update(
    self: CombatantState,
    player: CombatantState,
    enemies: CombatantState[],
    dt: number,
  ): CombatAction | null {
    this.healCooldown -= dt;

    switch (this.role) {
      case "healer":
        return this.healerBehavior(self, player, enemies);
      case "defender":
        return this.defenderBehavior(self, player, enemies);
      case "attacker":
      default:
        return this.attackerBehavior(self, player, enemies);
    }
  }

  private healerBehavior(
    self: CombatantState,
    player: CombatantState,
    _enemies: CombatantState[],
  ): CombatAction | null {
    // Heal player if low
    if (player.hp / player.maxHp < 0.5 && self.mp >= 35 && this.healCooldown <= 0) {
      this.healCooldown = 8;
      return { type: CombatActionType.SpellCast, spellId: "healing_light", target: player };
    }
    // Stay near player
    const dx = player.position.x - self.position.x;
    const dz = player.position.z - self.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 5) {
      return { type: CombatActionType.Move, direction: { x: dx / dist, z: dz / dist } };
    }
    return null;
  }

  private defenderBehavior(
    self: CombatantState,
    player: CombatantState,
    enemies: CombatantState[],
  ): CombatAction | null {
    // Interpose between player and closest enemy
    const closest = this.closestEnemy(player, enemies);
    if (!closest) return null;

    const midX = (player.position.x + closest.position.x) / 2;
    const midZ = (player.position.z + closest.position.z) / 2;
    const dx = midX - self.position.x;
    const dz = midZ - self.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 2) {
      return { type: CombatActionType.Move, direction: { x: dx / dist, z: dz / dist } };
    }

    return { type: CombatActionType.Block };
  }

  private attackerBehavior(
    self: CombatantState,
    _player: CombatantState,
    enemies: CombatantState[],
  ): CombatAction | null {
    const closest = this.closestEnemy(self, enemies);
    if (!closest) return null;

    const dx = closest.position.x - self.position.x;
    const dz = closest.position.z - self.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 2) {
      return { type: CombatActionType.Move, direction: { x: dx / dist, z: dz / dist } };
    }

    return {
      type: Math.random() < 0.7
        ? CombatActionType.LightAttack
        : CombatActionType.HeavyAttack,
    };
  }

  private closestEnemy(
    ref: CombatantState,
    enemies: CombatantState[],
  ): CombatantState | null {
    let best: CombatantState | null = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const dx = e.position.x - ref.position.x;
      const dz = e.position.z - ref.position.z;
      const d = dx * dx + dz * dz;
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }
}

// ---------------------------------------------------------------------------
// Death & Respawn
// ---------------------------------------------------------------------------

export class DeathRespawnHandler {
  isDead = false;
  private timer = 0;
  private respawnPosition = { x: 0, y: 0, z: 0 };

  setRespawnPoint(pos: { x: number; y: number; z: number }): void {
    this.respawnPosition = { ...pos };
  }

  die(): void {
    this.isDead = true;
    this.timer = RESPAWN_DELAY;
  }

  update(dt: number): { x: number; y: number; z: number } | null {
    if (!this.isDead) return null;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.isDead = false;
      return { ...this.respawnPosition };
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main CombatSystem – orchestrates everything per frame
// ---------------------------------------------------------------------------

export class ArthurianRPGCombatSystem {
  private comboTracker = new ComboTracker();
  private dodgeHandler = new DodgeRollHandler();
  private healingHandler = new HealingHandler();
  private spellCaster = new SpellCaster();
  private deathHandler = new DeathRespawnHandler();
  private poiseTrackers: Map<string, PoiseTracker> = new Map();
  private activeEffects: Map<string, ActiveEffect[]> = new Map();
  private enemyAIs: Map<string, EnemyCombatAI> = new Map();
  private bossAI: BossCombatAI | null = null;
  private companionAIs: Map<string, CompanionCombatAI> = new Map();

  private pendingHits: HitResult[] = [];

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  registerEnemy(id: string, profile: EnemyAIProfile, maxPoise: number): void {
    this.enemyAIs.set(id, new EnemyCombatAI(profile));
    this.poiseTrackers.set(id, new PoiseTracker(maxPoise));
    this.activeEffects.set(id, []);
  }

  registerBoss(phases: BossPhase[], maxPoise: number): void {
    this.bossAI = new BossCombatAI(phases);
    this.poiseTrackers.set("boss", new PoiseTracker(maxPoise));
    this.activeEffects.set("boss", []);
  }

  registerCompanion(id: string, role: CompanionCombatRole): void {
    this.companionAIs.set(id, new CompanionCombatAI(role));
    this.activeEffects.set(id, []);
  }

  setRespawnPoint(pos: { x: number; y: number; z: number }): void {
    this.deathHandler.setRespawnPoint(pos);
  }

  // -----------------------------------------------------------------------
  // Player actions
  // -----------------------------------------------------------------------

  playerLightAttack(player: CombatantState, target: CombatantState, time: number): HitResult | null {
    if (this.healingHandler.isLocked || this.spellCaster.isCasting) return null;
    const action: CombatAction = { type: CombatActionType.LightAttack };
    this.comboTracker.registerHit(time);
    return this.resolveHit(player, target, action);
  }

  playerHeavyAttack(player: CombatantState, target: CombatantState): HitResult | null {
    if (this.healingHandler.isLocked || this.spellCaster.isCasting) return null;
    this.comboTracker.reset();
    const action: CombatAction = { type: CombatActionType.HeavyAttack };
    return this.resolveHit(player, target, action);
  }

  playerBlock(player: CombatantState, dt: number): void {
    const cost = BLOCK_STAMINA_COST_PER_SEC * dt;
    if (player.stamina >= cost) {
      player.isBlocking = true;
      player.stamina -= cost;
    } else {
      player.isBlocking = false;
    }
  }

  playerStopBlock(player: CombatantState): void {
    player.isBlocking = false;
  }

  playerDodge(dirX: number, dirZ: number, player: CombatantState): boolean {
    const ok = this.dodgeHandler.attempt(dirX, dirZ, player.stamina);
    if (ok) player.stamina -= DODGE_ROLL_STAMINA_COST;
    return ok;
  }

  playerCastSpell(spellId: string, player: CombatantState): boolean {
    if (this.healingHandler.isLocked) return false;
    const spell = this.spellCaster.beginCast(spellId, player.mp);
    if (spell) {
      player.mp -= spell.manaCost;
      return true;
    }
    return false;
  }

  playerHeal(player: CombatantState, healAmount: number): boolean {
    return this.healingHandler.beginHeal(player, healAmount);
  }

  // -----------------------------------------------------------------------
  // Hit resolution
  // -----------------------------------------------------------------------

  private resolveHit(
    attacker: CombatantState,
    defender: CombatantState,
    action: CombatAction,
  ): HitResult {
    let dmg = calculateDamage(attacker, defender, action, this.comboTracker.getState());

    // Dodge i-frames check
    if (this.dodgeHandler.isInvincible) {
      return { damage: 0, blocked: false, dodged: true, critical: false, staggered: false, killed: false };
    }

    // Block mitigation
    dmg = processBlock(defender, dmg);

    // Apply damage
    defender.hp = Math.max(0, defender.hp - dmg.amount);

    // Poise / stagger
    const poise = this.poiseTrackers.get(defender.id);
    let staggered = false;
    if (poise && !dmg.isBlocked) {
      staggered = poise.applyPoiseDamage(dmg.staggerDamage);
    }

    // Apply on-hit effects (e.g. burning)
    const weaponEffect = attacker.equipment.mainHand?.onHitEffect;
    if (weaponEffect) {
      const effects = this.activeEffects.get(defender.id) ?? [];
      effects.push({ ...weaponEffect, elapsed: 0 });
      this.activeEffects.set(defender.id, effects);
    }

    const result: HitResult = {
      damage: dmg.amount,
      blocked: dmg.isBlocked,
      dodged: false,
      critical: dmg.isCritical,
      staggered,
      killed: defender.hp <= 0,
    };
    this.pendingHits.push(result);
    return result;
  }

  // -----------------------------------------------------------------------
  // Frame update
  // -----------------------------------------------------------------------

  update(state: ArthurianRPGState, dt: number): HitResult[] {
    this.pendingHits = [];

    // Update subsystems
    this.dodgeHandler.update(dt);
    this.healingHandler.update(dt);

    // Spell casting tick
    const firedSpell = this.spellCaster.update(dt);
    if (firedSpell && state.player.target) {
      const target = state.player.target;
      if (firedSpell.damage < 0) {
        // heal
        state.player.combatant.hp = Math.min(
          state.player.combatant.maxHp,
          state.player.combatant.hp - firedSpell.damage,
        );
      } else {
        target.hp = Math.max(0, target.hp - firedSpell.damage);
        if (firedSpell.effect) {
          const effects = this.activeEffects.get(target.id) ?? [];
          effects.push({ ...firedSpell.effect, elapsed: 0 } as ActiveEffect);
          this.activeEffects.set(target.id, effects);
        }
      }
    }

    // Poise updates
    for (const [, pt] of this.poiseTrackers) {
      pt.update(dt);
    }

    // Active effects
    for (const [id, effects] of this.activeEffects) {
      const combatant = state.getCombatantById(id);
      if (combatant) {
        this.activeEffects.set(id, applyActiveEffects(combatant, effects, dt));
      }
    }

    // Enemy AI decisions
    for (const [id, ai] of this.enemyAIs) {
      const enemy = state.getCombatantById(id);
      if (!enemy || enemy.hp <= 0) continue;
      const action = ai.update(enemy, state.player.combatant, dt);
      if (action && action.type === CombatActionType.LightAttack) {
        this.resolveHit(enemy, state.player.combatant, action);
      } else if (action && action.type === CombatActionType.HeavyAttack) {
        this.resolveHit(enemy, state.player.combatant, action);
      }
    }

    // Boss AI
    if (this.bossAI) {
      const boss = state.getCombatantById("boss");
      if (boss && boss.hp > 0) {
        const action = this.bossAI.update(boss, state.player.combatant, dt);
        if (action) {
          if (
            action.type === CombatActionType.LightAttack ||
            action.type === CombatActionType.HeavyAttack
          ) {
            this.resolveHit(boss, state.player.combatant, action);
          }
          // Special actions are emitted via pendingHits for the HUD
        }
      }
    }

    // Companion AI
    const aliveEnemies = state.getAliveEnemies();
    for (const [id, ai] of this.companionAIs) {
      const companion = state.getCombatantById(id);
      if (!companion || companion.hp <= 0) continue;
      const action = ai.update(companion, state.player.combatant, aliveEnemies, dt);
      if (action && (
        action.type === CombatActionType.LightAttack ||
        action.type === CombatActionType.HeavyAttack
      )) {
        const target = this.closestTo(companion, aliveEnemies);
        if (target) this.resolveHit(companion, target, action);
      }
    }

    // Player death check
    if (state.player.combatant.hp <= 0 && !this.deathHandler.isDead) {
      this.deathHandler.die();
    }
    const respawnPos = this.deathHandler.update(dt);
    if (respawnPos) {
      state.player.combatant.hp = state.player.combatant.maxHp;
      state.player.combatant.mp = state.player.combatant.maxMp;
      state.player.combatant.stamina = state.player.combatant.maxStamina;
      state.player.combatant.position = respawnPos;
    }

    // Stamina / mana regen
    const pc = state.player.combatant;
    if (!pc.isBlocking && !this.dodgeHandler.isRolling) {
      pc.stamina = Math.min(pc.maxStamina, pc.stamina + 12 * dt);
    }
    pc.mp = Math.min(pc.maxMp, pc.mp + 3 * dt);

    return this.pendingHits;
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private closestTo(ref: CombatantState, list: CombatantState[]): CombatantState | null {
    let best: CombatantState | null = null;
    let bestD = Infinity;
    for (const c of list) {
      const dx = c.position.x - ref.position.x;
      const dz = c.position.z - ref.position.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  getComboChain(): number {
    return this.comboTracker.chain;
  }

  isPlayerDead(): boolean {
    return this.deathHandler.isDead;
  }

  getSpellCastProgress(): number {
    return this.spellCaster.getCastProgress();
  }

  getSpellBook(): SpellDef[] {
    return this.spellCaster.getSpellBook();
  }

  isDodging(): boolean {
    return this.dodgeHandler.isRolling;
  }

  isHealing(): boolean {
    return this.healingHandler.isLocked;
  }
}
