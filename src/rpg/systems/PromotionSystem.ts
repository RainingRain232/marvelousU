// Class promotion logic for RPG mode
import { UnitType } from "@/types";
import type { PartyMember, RPGState } from "@rpg/state/RPGState";
import { getPromotionOptions, type PromotionPath } from "@rpg/config/PromotionDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { RPGBalance } from "@rpg/config/RPGBalanceConfig";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Check if a party member can promote (has a path and meets the level). */
export function canPromote(member: PartyMember): boolean {
  return getPromotionOptions(member.unitType, member.level) !== null;
}

/** Get available promotions for a member, or null if none. */
export function getAvailablePromotions(member: PartyMember): PromotionPath | null {
  return getPromotionOptions(member.unitType, member.level);
}

// ---------------------------------------------------------------------------
// Mutation
// ---------------------------------------------------------------------------

/**
 * Apply a class promotion to a party member.
 *
 * 1. Finds the member by ID.
 * 2. Validates level requirement and gold cost.
 * 3. Changes unitType to the new type.
 * 4. Recalculates base stats from UNIT_DEFINITIONS scaled by current level.
 * 5. Keeps XP progress intact.
 * 6. Updates abilityTypes from the new unit definition.
 * 7. Deducts gold cost.
 *
 * Returns true on success, false on failure.
 */
export function applyPromotion(
  rpg: RPGState,
  memberId: string,
  targetUnitType: UnitType,
): boolean {
  // 1. Find member
  const member = rpg.party.find((m) => m.id === memberId);
  if (!member) return false;

  // 2. Check promotion path exists and target is valid
  const path = getPromotionOptions(member.unitType, member.level);
  if (!path) return false;

  const option = path.options.find((o) => o.to === targetUnitType);
  if (!option) return false;

  // 3. Check gold
  if (rpg.gold < path.goldCost) return false;

  // 4. Look up new unit definition
  const newDef = UNIT_DEFINITIONS[targetUnitType];
  if (!newDef) return false;

  // 5. Recalculate base stats from new definition, scaled by current level
  const scale = 1 + RPGBalance.LEVEL_STAT_GROWTH * (member.level - 1);
  const newMaxHp = Math.ceil(newDef.hp * scale);
  const newAtk = Math.ceil(newDef.atk * scale);
  const newDef_ = Math.ceil(newDef.atk * scale * 0.3);
  const newMaxMp = Math.ceil(30 * scale);

  // Preserve current HP/MP ratios so the member isn't left at 0
  const hpRatio = member.maxHp > 0 ? member.hp / member.maxHp : 1;
  const mpRatio = member.maxMp > 0 ? member.mp / member.maxMp : 1;

  // 6. Apply changes
  member.unitType = targetUnitType;
  member.maxHp = newMaxHp;
  member.hp = Math.ceil(newMaxHp * hpRatio);
  member.maxMp = newMaxMp;
  member.mp = Math.ceil(newMaxMp * mpRatio);
  member.atk = newAtk;
  member.def = newDef_;
  member.speed = newDef.speed;
  member.range = newDef.range;

  // 7. Update ability types from new unit definition
  member.abilityTypes = newDef.abilityTypes ? [...newDef.abilityTypes] : [];

  // XP progress is kept intact (xp and xpToNext unchanged)

  // 8. Deduct gold
  rpg.gold -= path.goldCost;

  return true;
}
