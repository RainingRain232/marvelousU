// JRPG turn-based battle system — initiative, actions, damage, AI
import { TurnBattleAction, TurnBattlePhase, AbilityType } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { SeededRandom } from "@sim/utils/random";
import type { TurnBattleState, TurnBattleCombatant } from "@rpg/state/TurnBattleState";
import { createTurnBattleState } from "@rpg/state/TurnBattleState";
import type { PartyMember, RPGState, RPGItem, StatusEffect } from "@rpg/state/RPGState";
import { ENCOUNTER_DEFS } from "@rpg/config/EncounterDefs";
import type { EnemyDef } from "@rpg/config/EncounterDefs";
import { RPGBalance } from "@rpg/config/RPGBalanceConfig";

// ---------------------------------------------------------------------------
// Battle creation
// ---------------------------------------------------------------------------

export function createBattleFromEncounter(
  rpg: RPGState,
  encounterId: string,
  encounterType: "random" | "dungeon" | "boss",
  battleContext?: { biome?: string; dungeonFloor?: number; dungeonName?: string },
): TurnBattleState {
  const def = ENCOUNTER_DEFS[encounterId];
  if (!def) throw new Error(`Unknown encounter: ${encounterId}`);

  const combatants: TurnBattleCombatant[] = [];

  // Add party members
  for (let i = 0; i < rpg.party.length; i++) {
    const member = rpg.party[i];
    combatants.push(_partyToCombatant(member, i));
  }

  // Add enemies
  let enemyIdx = 0;
  for (const enemyDef of def.enemies) {
    for (let i = 0; i < enemyDef.count; i++) {
      combatants.push(_enemyToCombatant(enemyDef, enemyIdx++));
    }
  }

  const state = createTurnBattleState(
    combatants,
    encounterType,
    def.xpReward,
    def.goldReward,
    def.lootTable.filter(l => Math.random() < l.chance).map(l => l.item),
  );
  state.battleContext = battleContext;
  return state;
}

function _partyToCombatant(member: PartyMember, position: number): TurnBattleCombatant {
  return {
    id: member.id,
    name: member.name,
    isPartyMember: true,
    unitType: member.unitType,
    hp: member.hp,
    maxHp: member.maxHp,
    mp: member.mp,
    maxMp: member.maxMp,
    atk: _computeAtk(member),
    def: _computeDef(member),
    speed: _computeSpeed(member),
    range: member.range,
    abilityTypes: member.abilityTypes,
    statusEffects: [...member.statusEffects],
    position,
    isDefending: false,
  };
}

function _computeAtk(member: PartyMember): number {
  let atk = member.atk;
  if (member.equipment.weapon?.stats.atk) atk += member.equipment.weapon.stats.atk;
  if (member.equipment.accessory?.stats.atk) atk += member.equipment.accessory.stats.atk;
  return atk;
}

function _computeDef(member: PartyMember): number {
  let def = member.def;
  if (member.equipment.armor?.stats.def) def += member.equipment.armor.stats.def;
  if (member.equipment.accessory?.stats.def) def += member.equipment.accessory.stats.def;
  return def;
}

function _computeSpeed(member: PartyMember): number {
  let speed = member.speed;
  if (member.equipment.accessory?.stats.speed) speed += member.equipment.accessory.stats.speed;
  if (member.equipment.armor?.stats.speed) speed += member.equipment.armor.stats.speed;
  return speed;
}

function _enemyToCombatant(enemyDef: EnemyDef, position: number): TurnBattleCombatant {
  const unitDef = UNIT_DEFINITIONS[enemyDef.unitType];
  const scale = 1 + RPGBalance.ENEMY_LEVEL_SCALE * (enemyDef.level - 1);

  return {
    id: `enemy_${position}`,
    name: `${unitDef.type.replace(/_/g, " ")}`,
    isPartyMember: false,
    unitType: enemyDef.unitType,
    hp: enemyDef.overrides?.hp ?? Math.ceil(unitDef.hp * scale),
    maxHp: enemyDef.overrides?.hp ?? Math.ceil(unitDef.hp * scale),
    mp: 0,
    maxMp: 0,
    atk: enemyDef.overrides?.atk ?? Math.ceil(unitDef.atk * scale),
    def: enemyDef.overrides?.def ?? Math.ceil(unitDef.atk * scale * 0.3),
    speed: enemyDef.overrides?.speed ?? unitDef.speed,
    range: unitDef.range,
    abilityTypes: unitDef.abilityTypes ?? [],
    statusEffects: [],
    position,
    isDefending: false,
  };
}

// ---------------------------------------------------------------------------
// Battle loop
// ---------------------------------------------------------------------------

export function calculateInitiative(battle: TurnBattleState): void {
  const rng = new SeededRandom(Date.now());
  const alive = battle.combatants.filter(c => c.hp > 0);

  // Sort by effective speed (descending), random tiebreaker
  alive.sort((a, b) => {
    const diff = _getEffectiveSpeed(b) - _getEffectiveSpeed(a);
    if (Math.abs(diff) > 0.01) return diff;
    return rng.next() - 0.5;
  });

  battle.turnOrder = alive.map(c => c.id);
  battle.currentTurnIndex = 0;
  battle.phase = TurnBattlePhase.SELECT_ACTION;

  // If first combatant is enemy, switch to enemy turn
  const first = battle.combatants.find(c => c.id === battle.turnOrder[0]);
  if (first && !first.isPartyMember) {
    battle.phase = TurnBattlePhase.ENEMY_TURN;
  }
}

export function advanceTurn(battle: TurnBattleState): void {
  // Move to next living combatant
  let nextIndex = battle.currentTurnIndex;
  const count = battle.turnOrder.length;

  for (let i = 0; i < count; i++) {
    nextIndex = (nextIndex + 1) % count;
    const combatant = battle.combatants.find(c => c.id === battle.turnOrder[nextIndex]);
    if (combatant && combatant.hp > 0) break;
  }

  // If wrapped around, start new round
  if (nextIndex <= battle.currentTurnIndex) {
    battle.round++;
    _tickStatusEffects(battle);
    // Reset defending flags
    for (const c of battle.combatants) c.isDefending = false;
    // Recalculate initiative
    calculateInitiative(battle);
    return;
  }

  battle.currentTurnIndex = nextIndex;
  battle.selectedAction = null;
  battle.selectedAbility = null;
  battle.selectedTargetId = null;

  const current = battle.combatants.find(c => c.id === battle.turnOrder[nextIndex]);
  if (!current || current.hp <= 0) {
    // Skip dead combatants
    advanceTurn(battle);
    return;
  }

  // Check for stun — skip turn
  const stunEffect = current.statusEffects.find(e => e.type === "stun");
  if (stunEffect) {
    battle.log.push(`${current.name} is stunned and cannot act!`);
    stunEffect.duration--;
    if (stunEffect.duration <= 0) {
      current.statusEffects = current.statusEffects.filter(e => e !== stunEffect);
      battle.log.push(`${current.name}'s stun wore off.`);
    }
    // Guard against infinite recursion if all combatants are stunned
    const allStunned = battle.combatants
      .filter(c => c.hp > 0)
      .every(c => c.statusEffects.some(e => e.type === "stun"));
    if (!allStunned) {
      advanceTurn(battle);
    }
    return;
  }

  if (current.isPartyMember) {
    battle.phase = TurnBattlePhase.SELECT_ACTION;
  } else {
    battle.phase = TurnBattlePhase.ENEMY_TURN;
  }
}

// ---------------------------------------------------------------------------
// Action execution
// ---------------------------------------------------------------------------

export function executeAction(
  battle: TurnBattleState,
  action: TurnBattleAction,
  targetId: string | null,
  abilityType: AbilityType | null,
  itemId: string | null,
  rpg: RPGState,
): void {
  const currentId = battle.turnOrder[battle.currentTurnIndex];
  const attacker = battle.combatants.find(c => c.id === currentId);
  if (!attacker || attacker.hp <= 0) return;

  battle.phase = TurnBattlePhase.EXECUTE;

  switch (action) {
    case TurnBattleAction.ATTACK:
      _executeAttack(battle, attacker, targetId);
      break;
    case TurnBattleAction.ABILITY:
      _executeAbility(battle, attacker, targetId, abilityType);
      break;
    case TurnBattleAction.DEFEND:
      _executeDefend(battle, attacker);
      break;
    case TurnBattleAction.ITEM:
      _executeItem(battle, attacker, targetId, itemId, rpg);
      break;
    case TurnBattleAction.FLEE:
      _executeFlee(battle, rpg);
      return; // Flee doesn't advance turn normally
  }

  // Check battle end
  if (_checkBattleEnd(battle)) return;

  // Advance to next turn
  advanceTurn(battle);
}

// ---------------------------------------------------------------------------
// Attack
// ---------------------------------------------------------------------------

function _executeAttack(
  battle: TurnBattleState,
  attacker: TurnBattleCombatant,
  targetId: string | null,
): void {
  const target = targetId ? battle.combatants.find(c => c.id === targetId) : null;
  if (!target || target.hp <= 0) return;

  const { damage: rawDamage, isCritical } = _calculateDamage(attacker.atk, target.def, target.isDefending, 1.0);
  const damage = _applyDamageWithShield(target, rawDamage, battle);

  const critText = isCritical ? " (CRIT!)" : "";
  battle.log.push(`${attacker.name} attacks ${target.name} for ${damage} damage${critText}`);

  EventBus.emit("rpgTurnBattleDamage", {
    attackerId: attacker.id,
    targetId: target.id,
    damage,
    isCritical,
  });

  EventBus.emit("rpgTurnBattleAction", {
    combatantId: attacker.id,
    action: TurnBattleAction.ATTACK,
    targetId: target.id,
  });

  if (target.hp <= 0) {
    battle.log.push(`${target.name} is defeated!`);
  }
}

// ---------------------------------------------------------------------------
// Ability
// ---------------------------------------------------------------------------

function _executeAbility(
  battle: TurnBattleState,
  attacker: TurnBattleCombatant,
  targetId: string | null,
  abilityType: AbilityType | null,
): void {
  const ability = abilityType ?? attacker.abilityTypes[0] ?? null;

  // Determine ability properties based on type
  const abilityInfo = _getAbilityInfo(ability);
  const mpCost = abilityInfo.mpCost;

  if (attacker.mp < mpCost) {
    battle.log.push(`${attacker.name} doesn't have enough MP!`);
    return;
  }

  attacker.mp -= mpCost;

  const target = targetId ? battle.combatants.find(c => c.id === targetId) : null;
  if (!target) return;

  if (abilityInfo.isHeal) {
    // Healing ability — targets allies
    const healAmount = Math.ceil(attacker.atk * abilityInfo.multiplier);
    const healed = Math.min(healAmount, target.maxHp - target.hp);
    target.hp += healed;
    battle.log.push(`${attacker.name} casts ${abilityInfo.name} on ${target.name}. Healed ${healed} HP!`);

    EventBus.emit("rpgTurnBattleAction", {
      combatantId: attacker.id,
      action: TurnBattleAction.ABILITY,
      targetId: target.id,
    });
  } else {
    // Damage ability
    if (target.hp <= 0) return;
    const { damage: rawDamage, isCritical } = _calculateDamage(
      attacker.atk, target.def, target.isDefending, abilityInfo.multiplier,
    );
    const damage = _applyDamageWithShield(target, rawDamage, battle);

    const critText = isCritical ? " (CRIT!)" : "";
    battle.log.push(`${attacker.name} casts ${abilityInfo.name} on ${target.name} for ${damage} damage${critText}`);

    EventBus.emit("rpgTurnBattleDamage", {
      attackerId: attacker.id,
      targetId: target.id,
      damage,
      isCritical,
    });

    EventBus.emit("rpgTurnBattleAction", {
      combatantId: attacker.id,
      action: TurnBattleAction.ABILITY,
      targetId: target.id,
    });

    if (target.hp <= 0) {
      battle.log.push(`${target.name} is defeated!`);
    }
  }
}

interface AbilityInfo {
  name: string;
  mpCost: number;
  multiplier: number;
  isHeal: boolean;
}

function _getAbilityInfo(ability: AbilityType | null): AbilityInfo {
  switch (ability) {
    case AbilityType.HEAL:
      return { name: "Heal", mpCost: 8, multiplier: 1.2, isHeal: true };
    case AbilityType.FIREBALL:
      return { name: "Fireball", mpCost: 12, multiplier: 2.0, isHeal: false };
    case AbilityType.CHAIN_LIGHTNING:
      return { name: "Chain Lightning", mpCost: 15, multiplier: 1.8, isHeal: false };
    case AbilityType.ICE_BALL:
      return { name: "Ice Ball", mpCost: 12, multiplier: 1.8, isHeal: false };
    case AbilityType.FIRE_BREATH:
      return { name: "Fire Breath", mpCost: 20, multiplier: 2.5, isHeal: false };
    case AbilityType.FROST_BREATH:
      return { name: "Frost Breath", mpCost: 20, multiplier: 2.5, isHeal: false };
    default:
      // Generic power attack for units without specific abilities
      return { name: "Power Strike", mpCost: 10, multiplier: 1.5, isHeal: false };
  }
}

/** Returns true if the ability targets allies (heal/buff). Used by RPGBoot for target selection. */
export function isHealAbility(abilityType: AbilityType | null): boolean {
  return _getAbilityInfo(abilityType).isHeal;
}

/** Returns the display name for an ability. */
export function getAbilityName(abilityType: AbilityType | null): string {
  return _getAbilityInfo(abilityType).name;
}

// ---------------------------------------------------------------------------
// Defend
// ---------------------------------------------------------------------------

function _executeDefend(
  battle: TurnBattleState,
  attacker: TurnBattleCombatant,
): void {
  attacker.isDefending = true;
  battle.log.push(`${attacker.name} takes a defensive stance.`);

  EventBus.emit("rpgTurnBattleAction", {
    combatantId: attacker.id,
    action: TurnBattleAction.DEFEND,
  });
}

// ---------------------------------------------------------------------------
// Item
// ---------------------------------------------------------------------------

function _executeItem(
  battle: TurnBattleState,
  attacker: TurnBattleCombatant,
  targetId: string | null,
  itemId: string | null,
  rpg: RPGState,
): void {
  if (!itemId) return;

  const invSlot = rpg.inventory.items.find(slot => slot.item.id === itemId);
  if (!invSlot || invSlot.quantity <= 0) {
    battle.log.push("No items left!");
    return;
  }

  const item = invSlot.item;
  const target = targetId
    ? battle.combatants.find(c => c.id === targetId)
    : attacker;

  if (!target) return;

  // Apply item effects
  if (item.stats.hp && item.stats.hp > 0) {
    const healed = Math.min(item.stats.hp, target.maxHp - target.hp);
    target.hp += healed;
    battle.log.push(`${attacker.name} uses ${item.name} on ${target.name}. Healed ${healed} HP.`);
  }
  if (item.stats.mp && item.stats.mp > 0) {
    const restored = Math.min(item.stats.mp, target.maxMp - target.mp);
    target.mp += restored;
    battle.log.push(`${attacker.name} uses ${item.name}. Restored ${restored} MP.`);
  }

  invSlot.quantity--;
  if (invSlot.quantity <= 0) {
    rpg.inventory.items = rpg.inventory.items.filter(s => s.quantity > 0);
  }

  EventBus.emit("rpgItemUsed", { itemId: item.id, targetId: target.id });
  EventBus.emit("rpgTurnBattleAction", {
    combatantId: attacker.id,
    action: TurnBattleAction.ITEM,
    targetId: target.id,
  });
}

// ---------------------------------------------------------------------------
// Flee
// ---------------------------------------------------------------------------

function _executeFlee(
  battle: TurnBattleState,
  _rpg: RPGState,
): void {
  if (!battle.canFlee) {
    battle.log.push("Can't flee from this battle!");
    advanceTurn(battle);
    return;
  }

  const partySpeed = _avgSpeed(battle, true);
  const enemySpeed = _avgSpeed(battle, false);
  const chance = Math.min(
    RPGBalance.FLEE_MAX_CHANCE,
    Math.max(
      RPGBalance.FLEE_MIN_CHANCE,
      RPGBalance.FLEE_BASE_CHANCE + (partySpeed - enemySpeed) * RPGBalance.FLEE_SPEED_FACTOR,
    ),
  );

  if (Math.random() < chance) {
    battle.log.push("Escaped successfully!");
    battle.phase = TurnBattlePhase.FLED;
  } else {
    battle.log.push("Couldn't escape!");
    advanceTurn(battle);
  }
}

function _avgSpeed(battle: TurnBattleState, isParty: boolean): number {
  const group = battle.combatants.filter(c => c.isPartyMember === isParty && c.hp > 0);
  if (group.length === 0) return 0;
  return group.reduce((sum, c) => sum + c.speed, 0) / group.length;
}

// ---------------------------------------------------------------------------
// Damage calculation
// ---------------------------------------------------------------------------

function _calculateDamage(
  atk: number,
  def: number,
  isDefending: boolean,
  multiplier: number,
): { damage: number; isCritical: boolean } {
  const isCritical = Math.random() < RPGBalance.CRITICAL_CHANCE;
  const critMult = isCritical ? RPGBalance.CRITICAL_MULT : 1.0;
  const defendMult = isDefending ? RPGBalance.DEFEND_DAMAGE_MULT : 1.0;

  const baseDamage = atk * multiplier * critMult - def * 0.5;
  const damage = Math.max(1, Math.round(baseDamage * defendMult));

  return { damage, isCritical };
}

// ---------------------------------------------------------------------------
// Enemy AI
// ---------------------------------------------------------------------------

export function executeEnemyTurn(battle: TurnBattleState, rpg: RPGState): void {
  const currentId = battle.turnOrder[battle.currentTurnIndex];
  const enemy = battle.combatants.find(c => c.id === currentId);
  if (!enemy || enemy.hp <= 0) {
    advanceTurn(battle);
    return;
  }

  const aliveParty = battle.combatants.filter(c => c.isPartyMember && c.hp > 0);
  if (aliveParty.length === 0) {
    _checkBattleEnd(battle);
    return;
  }

  // Simple AI: attack weakest party member
  aliveParty.sort((a, b) => a.hp - b.hp);
  const target = aliveParty[0];

  executeAction(battle, TurnBattleAction.ATTACK, target.id, null, null, rpg);
}

// ---------------------------------------------------------------------------
// Battle end checks
// ---------------------------------------------------------------------------

function _checkBattleEnd(battle: TurnBattleState): boolean {
  const aliveParty = battle.combatants.filter(c => c.isPartyMember && c.hp > 0);
  const aliveEnemies = battle.combatants.filter(c => !c.isPartyMember && c.hp > 0);

  if (aliveEnemies.length === 0) {
    battle.phase = TurnBattlePhase.VICTORY;
    battle.log.push("Victory!");
    return true;
  }

  if (aliveParty.length === 0) {
    battle.phase = TurnBattlePhase.DEFEAT;
    battle.log.push("Defeat...");
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Status effects
// ---------------------------------------------------------------------------

function _tickStatusEffects(battle: TurnBattleState): void {
  for (const c of battle.combatants) {
    if (c.hp <= 0) continue;

    const remaining: StatusEffect[] = [];
    for (const effect of c.statusEffects) {
      switch (effect.type) {
        case "poison":
          c.hp = Math.max(1, c.hp - effect.magnitude);
          battle.log.push(`${c.name} takes ${effect.magnitude} poison damage.`);
          break;
        case "regen":
          c.hp = Math.min(c.maxHp, c.hp + effect.magnitude);
          battle.log.push(`${c.name} regenerates ${effect.magnitude} HP.`);
          break;
        case "slow":
        case "haste":
        case "shield":
        case "stun":
          // These are handled elsewhere (speed calc, damage calc, turn skip)
          break;
      }

      effect.duration--;
      if (effect.duration > 0) {
        remaining.push(effect);
      } else {
        battle.log.push(`${c.name}'s ${effect.type} wore off.`);
      }
    }
    c.statusEffects = remaining;
  }
}

/** Get speed adjusted for slow/haste status effects. */
function _getEffectiveSpeed(c: TurnBattleCombatant): number {
  let speed = c.speed;
  for (const e of c.statusEffects) {
    if (e.type === "slow") speed -= e.magnitude;
    if (e.type === "haste") speed += e.magnitude;
  }
  return Math.max(0.1, speed);
}

/** Apply damage to target with shield absorption. Returns actual damage dealt. */
function _applyDamageWithShield(
  target: TurnBattleCombatant,
  damage: number,
  battle: TurnBattleState,
): number {
  const shieldEffect = target.statusEffects.find(e => e.type === "shield");
  if (shieldEffect) {
    const absorbed = Math.min(damage, shieldEffect.magnitude);
    damage -= absorbed;
    shieldEffect.magnitude -= absorbed;
    if (shieldEffect.magnitude <= 0) {
      target.statusEffects = target.statusEffects.filter(e => e !== shieldEffect);
      battle.log.push(`${target.name}'s shield shattered!`);
    } else {
      battle.log.push(`${target.name}'s shield absorbed ${absorbed} damage.`);
    }
  }
  target.hp = Math.max(0, target.hp - damage);
  return damage;
}

// ---------------------------------------------------------------------------
// Apply battle results to party
// ---------------------------------------------------------------------------

export function applyVictoryRewards(
  rpg: RPGState,
  battle: TurnBattleState,
): void {
  // Gold
  rpg.gold += battle.goldReward;

  // XP distributed evenly to living party members
  const aliveParty = rpg.party.filter(m => m.hp > 0);
  const xpEach = aliveParty.length > 0 ? Math.ceil(battle.xpReward / aliveParty.length) : 0;

  for (const member of aliveParty) {
    member.xp += xpEach;

    // Check level up
    while (member.xp >= member.xpToNext && member.level < RPGBalance.MAX_LEVEL) {
      member.xp -= member.xpToNext;
      member.level++;
      _applyLevelUp(member);
      EventBus.emit("rpgLevelUp", { memberId: member.id, newLevel: member.level });
    }
  }

  // Sync party member HP from battle state
  for (const combatant of battle.combatants) {
    if (!combatant.isPartyMember) continue;
    const member = rpg.party.find(m => m.id === combatant.id);
    if (member) {
      member.hp = Math.max(0, combatant.hp);
      member.mp = Math.max(0, combatant.mp);
    }
  }

  // Loot
  for (const item of battle.lootReward) {
    _addItemToInventory(rpg, item);
  }

  EventBus.emit("rpgBattleEnded", {
    victory: true,
    xp: battle.xpReward,
    gold: battle.goldReward,
  });
}

export function applyDefeatPenalty(rpg: RPGState, battle: TurnBattleState): void {
  // Sync HP from battle (all at 0)
  for (const combatant of battle.combatants) {
    if (!combatant.isPartyMember) continue;
    const member = rpg.party.find(m => m.id === combatant.id);
    if (member) {
      member.hp = 1; // Revive with 1 HP
    }
  }

  // Lose some gold
  rpg.gold = Math.max(0, rpg.gold - Math.floor(rpg.gold * 0.2));

  EventBus.emit("rpgBattleEnded", { victory: false, xp: 0, gold: 0 });
}

// ---------------------------------------------------------------------------
// Level up
// ---------------------------------------------------------------------------

function _applyLevelUp(member: PartyMember): void {
  const growth = RPGBalance.LEVEL_STAT_GROWTH;
  member.maxHp = Math.ceil(member.maxHp * (1 + growth));
  member.hp = member.maxHp; // Full heal on level up
  member.maxMp = Math.ceil(member.maxMp * (1 + growth));
  member.mp = member.maxMp;
  member.atk = Math.ceil(member.atk * (1 + growth));
  member.def = Math.ceil(member.def * (1 + growth));
  member.speed = +(member.speed * (1 + growth * 0.5)).toFixed(2);
  member.xpToNext = Math.ceil(member.xpToNext * RPGBalance.XP_SCALE_FACTOR);
}

// ---------------------------------------------------------------------------
// Inventory helpers
// ---------------------------------------------------------------------------

function _addItemToInventory(rpg: RPGState, item: RPGItem): void {
  const existing = rpg.inventory.items.find(s => s.item.id === item.id);
  if (existing) {
    existing.quantity++;
  } else if (rpg.inventory.items.length < rpg.inventory.maxSlots) {
    rpg.inventory.items.push({ item, quantity: 1 });
  }
}
