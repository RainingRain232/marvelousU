// Class specialization system — apply specialization branches at level 10
import type { PartyMember, RPGState } from "@rpg/state/RPGState";
import {
  canSpecialize,
  getSpecializations,
  getSpecializationById,
} from "@rpg/config/SpecializationDefs";
import type { SpecializationDef } from "@rpg/config/SpecializationDefs";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Check if a party member is eligible for specialization.
 * Requires: level >= 10, has no specialization yet, and specializations exist
 * for their unit type.
 */
export function canMemberSpecialize(member: PartyMember): boolean {
  // Already specialized if they have a specialization marker
  if (member.specializationId) return false;
  return canSpecialize(member.unitType, member.level);
}

/**
 * Get available specialization options for a party member.
 */
export function getSpecializationOptions(member: PartyMember): SpecializationDef[] {
  if (!canMemberSpecialize(member)) return [];
  return getSpecializations(member.unitType);
}

/**
 * Check if any party member is ready to specialize (used for UI trigger).
 */
export function anyMemberCanSpecialize(rpg: RPGState): PartyMember | null {
  for (const member of rpg.party) {
    if (canMemberSpecialize(member)) return member;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Mutation
// ---------------------------------------------------------------------------

/**
 * Apply a specialization to a party member.
 *
 * 1. Validates eligibility and specialization ID.
 * 2. Applies stat bonuses from the specialization.
 * 3. Stores specialization ID on the member.
 * 4. Adds specialization abilities as equipped spells (using ability IDs).
 *
 * Returns true on success, false on failure.
 */
export function applySpecialization(
  _rpg: RPGState,
  memberId: string,
  specId: string,
): boolean {
  const member = _rpg.party.find(m => m.id === memberId);
  if (!member) return false;

  // Check eligibility
  if (!canMemberSpecialize(member)) return false;

  const spec = getSpecializationById(specId);
  if (!spec) return false;

  // Verify this spec is for the member's unit type
  if (spec.fromUnitType !== member.unitType) return false;

  // Apply stat bonuses
  if (spec.statBonuses.maxHp) {
    member.maxHp += spec.statBonuses.maxHp;
    member.hp += spec.statBonuses.maxHp; // heal the bonus amount
  }
  if (spec.statBonuses.maxMp) {
    member.maxMp += spec.statBonuses.maxMp;
    member.mp += spec.statBonuses.maxMp;
  }
  if (spec.statBonuses.atk) member.atk += spec.statBonuses.atk;
  if (spec.statBonuses.def) member.def += spec.statBonuses.def;
  if (spec.statBonuses.speed) member.speed += spec.statBonuses.speed;

  // Add ability types
  for (const at of spec.abilityTypesGranted) {
    if (!member.abilityTypes.includes(at)) {
      member.abilityTypes.push(at);
    }
  }

  // Mark specialization on the member
  member.specializationId = specId;
  member.specializationName = spec.name;

  return true;
}
