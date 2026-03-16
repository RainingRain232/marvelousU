// Class specialization definitions — at level 10, each base class branches
// into two specializations with unique abilities.
import { UnitType, AbilityType } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpecializationAbility {
  id: string;
  name: string;
  description: string;
  /** MP cost to use in battle. */
  mpCost: number;
  /** Damage dealt (0 for non-damage abilities). */
  damage: number;
  /** Heal amount (0 for non-healing abilities). */
  healAmount: number;
  /** Cooldown in turns. */
  cooldown: number;
  /** Optional status effect applied on use. */
  statusEffect?: "poison" | "regen" | "slow" | "haste" | "shield" | "stun" | "wet";
  /** Status effect duration in turns. */
  statusDuration?: number;
  /** Status effect magnitude. */
  statusMagnitude?: number;
}

export interface SpecializationDef {
  id: string;
  name: string;
  description: string;
  /** The base class (UnitType) this specialization branches from. */
  fromUnitType: UnitType;
  /** Level required to specialize (always 10). */
  levelRequired: number;
  /** Stat bonuses applied on specialization. */
  statBonuses: Partial<{
    maxHp: number;
    maxMp: number;
    atk: number;
    def: number;
    speed: number;
  }>;
  /** Two unique abilities granted by this specialization. */
  abilities: SpecializationAbility[];
  /** Ability types added to the unit. */
  abilityTypesGranted: AbilityType[];
}

// ---------------------------------------------------------------------------
// Specialization Definitions
// ---------------------------------------------------------------------------

export const SPECIALIZATION_DEFS: SpecializationDef[] = [
  // =========================================================================
  // SWORDSMAN -> Blademaster / Warden
  // =========================================================================
  {
    id: "spec_blademaster",
    name: "Blademaster",
    description: "A whirlwind of steel. High crit, devastating multi-hit combos.",
    fromUnitType: UnitType.SWORDSMAN,
    levelRequired: 10,
    statBonuses: { atk: 4, speed: 1 },
    abilities: [
      {
        id: "spec_blade_dance",
        name: "Blade Dance",
        description: "Strike all enemies with a flurry of slashes.",
        mpCost: 12,
        damage: 18,
        healAmount: 0,
        cooldown: 3,
      },
      {
        id: "spec_mortal_edge",
        name: "Mortal Edge",
        description: "A precise strike that always crits and ignores 50% defense.",
        mpCost: 8,
        damage: 25,
        healAmount: 0,
        cooldown: 4,
      },
    ],
    abilityTypesGranted: [],
  },
  {
    id: "spec_warden",
    name: "Warden",
    description: "An unyielding protector. Shields allies and retaliates.",
    fromUnitType: UnitType.SWORDSMAN,
    levelRequired: 10,
    statBonuses: { maxHp: 30, def: 5 },
    abilities: [
      {
        id: "spec_iron_wall",
        name: "Iron Wall",
        description: "Reduce all party damage taken by 40% for 3 turns.",
        mpCost: 10,
        damage: 0,
        healAmount: 0,
        cooldown: 5,
        statusEffect: "shield",
        statusDuration: 3,
        statusMagnitude: 40,
      },
      {
        id: "spec_counter_stance",
        name: "Counter Stance",
        description: "Enter a counter stance — automatically retaliate against the next 2 attacks.",
        mpCost: 6,
        damage: 15,
        healAmount: 0,
        cooldown: 3,
      },
    ],
    abilityTypesGranted: [],
  },

  // =========================================================================
  // ARCHER -> Sharpshooter / Ranger
  // =========================================================================
  {
    id: "spec_sharpshooter",
    name: "Sharpshooter",
    description: "Deadly precision from extreme range. Piercing shots bypass armor.",
    fromUnitType: UnitType.ARCHER,
    levelRequired: 10,
    statBonuses: { atk: 5, speed: 1 },
    abilities: [
      {
        id: "spec_piercing_shot",
        name: "Piercing Shot",
        description: "A shot that ignores all enemy defense.",
        mpCost: 10,
        damage: 30,
        healAmount: 0,
        cooldown: 4,
      },
      {
        id: "spec_rapid_fire",
        name: "Rapid Fire",
        description: "Fire 3 arrows at random enemies.",
        mpCost: 8,
        damage: 12,
        healAmount: 0,
        cooldown: 3,
      },
    ],
    abilityTypesGranted: [],
  },
  {
    id: "spec_ranger",
    name: "Ranger",
    description: "Master of traps and nature magic. Supports the party with utility.",
    fromUnitType: UnitType.ARCHER,
    levelRequired: 10,
    statBonuses: { maxHp: 15, def: 3, speed: 1 },
    abilities: [
      {
        id: "spec_natures_embrace",
        name: "Nature's Embrace",
        description: "Heal the entire party for a moderate amount.",
        mpCost: 12,
        damage: 0,
        healAmount: 25,
        cooldown: 4,
      },
      {
        id: "spec_entangle",
        name: "Entangle",
        description: "Roots slow all enemies for 2 turns.",
        mpCost: 8,
        damage: 5,
        healAmount: 0,
        cooldown: 3,
        statusEffect: "slow",
        statusDuration: 2,
        statusMagnitude: 50,
      },
    ],
    abilityTypesGranted: [],
  },

  // =========================================================================
  // PIKEMAN -> Hoplite / Dragoon
  // =========================================================================
  {
    id: "spec_hoplite",
    name: "Hoplite",
    description: "Impenetrable shield wall. Taunts enemies and absorbs damage.",
    fromUnitType: UnitType.PIKEMAN,
    levelRequired: 10,
    statBonuses: { maxHp: 40, def: 6 },
    abilities: [
      {
        id: "spec_shield_wall",
        name: "Shield Wall",
        description: "All damage to the party is redirected to the Hoplite for 2 turns.",
        mpCost: 10,
        damage: 0,
        healAmount: 0,
        cooldown: 5,
        statusEffect: "shield",
        statusDuration: 2,
        statusMagnitude: 100,
      },
      {
        id: "spec_spear_brace",
        name: "Spear Brace",
        description: "Deal heavy damage to the first enemy that attacks this turn.",
        mpCost: 6,
        damage: 22,
        healAmount: 0,
        cooldown: 3,
      },
    ],
    abilityTypesGranted: [],
  },
  {
    id: "spec_dragoon",
    name: "Dragoon",
    description: "A leaping attacker. High burst damage with jump attacks.",
    fromUnitType: UnitType.PIKEMAN,
    levelRequired: 10,
    statBonuses: { atk: 5, speed: 2 },
    abilities: [
      {
        id: "spec_dragon_dive",
        name: "Dragon Dive",
        description: "Leap into the air and crash down on all enemies.",
        mpCost: 14,
        damage: 28,
        healAmount: 0,
        cooldown: 4,
      },
      {
        id: "spec_lance_thrust",
        name: "Lance Thrust",
        description: "A powerful single-target thrust with bonus crit chance.",
        mpCost: 7,
        damage: 20,
        healAmount: 0,
        cooldown: 2,
      },
    ],
    abilityTypesGranted: [],
  },

  // =========================================================================
  // FIRE_MAGE -> Pyromancer / Warmage
  // =========================================================================
  {
    id: "spec_pyromancer",
    name: "Pyromancer",
    description: "Pure fire devastation. AoE fire spells that burn over time.",
    fromUnitType: UnitType.FIRE_MAGE,
    levelRequired: 10,
    statBonuses: { atk: 6, maxMp: 20 },
    abilities: [
      {
        id: "spec_inferno",
        name: "Inferno",
        description: "Engulf all enemies in flames. Burns for 3 turns.",
        mpCost: 16,
        damage: 20,
        healAmount: 0,
        cooldown: 5,
        statusEffect: "poison", // repurposed as burn
        statusDuration: 3,
        statusMagnitude: 8,
      },
      {
        id: "spec_flame_shield",
        name: "Flame Shield",
        description: "Surround self in fire. Attackers take damage for 3 turns.",
        mpCost: 10,
        damage: 10,
        healAmount: 0,
        cooldown: 4,
        statusEffect: "shield",
        statusDuration: 3,
        statusMagnitude: 20,
      },
    ],
    abilityTypesGranted: [],
  },
  {
    id: "spec_warmage",
    name: "Warmage",
    description: "Combines martial prowess with fire magic for close-range combat.",
    fromUnitType: UnitType.FIRE_MAGE,
    levelRequired: 10,
    statBonuses: { atk: 3, def: 3, maxHp: 20 },
    abilities: [
      {
        id: "spec_blazing_strike",
        name: "Blazing Strike",
        description: "Melee attack wreathed in flame. Stuns on hit.",
        mpCost: 8,
        damage: 24,
        healAmount: 0,
        cooldown: 3,
        statusEffect: "stun",
        statusDuration: 1,
        statusMagnitude: 1,
      },
      {
        id: "spec_fire_aura",
        name: "Fire Aura",
        description: "Boost all party members' attack by 20% for 3 turns.",
        mpCost: 12,
        damage: 0,
        healAmount: 0,
        cooldown: 5,
        statusEffect: "haste",
        statusDuration: 3,
        statusMagnitude: 20,
      },
    ],
    abilityTypesGranted: [],
  },

  // =========================================================================
  // MONK -> Sage / Templar
  // =========================================================================
  {
    id: "spec_sage",
    name: "Sage",
    description: "Supreme healer. Mass healing and resurrection.",
    fromUnitType: UnitType.MONK,
    levelRequired: 10,
    statBonuses: { maxMp: 25, maxHp: 15 },
    abilities: [
      {
        id: "spec_divine_prayer",
        name: "Divine Prayer",
        description: "Heal all party members for a large amount.",
        mpCost: 18,
        damage: 0,
        healAmount: 40,
        cooldown: 5,
      },
      {
        id: "spec_resurrection",
        name: "Resurrection",
        description: "Revive a fallen ally with 50% HP.",
        mpCost: 25,
        damage: 0,
        healAmount: 0,
        cooldown: 8,
      },
    ],
    abilityTypesGranted: [],
  },
  {
    id: "spec_templar",
    name: "Templar",
    description: "Holy warrior. Smites evil and shields allies with faith.",
    fromUnitType: UnitType.MONK,
    levelRequired: 10,
    statBonuses: { atk: 4, def: 4, maxHp: 10 },
    abilities: [
      {
        id: "spec_holy_smite",
        name: "Holy Smite",
        description: "Deal heavy holy damage to a single undead or demon enemy.",
        mpCost: 10,
        damage: 35,
        healAmount: 0,
        cooldown: 3,
      },
      {
        id: "spec_faith_barrier",
        name: "Faith Barrier",
        description: "Grant a shield to an ally that absorbs the next 30 damage.",
        mpCost: 8,
        damage: 0,
        healAmount: 0,
        cooldown: 4,
        statusEffect: "shield",
        statusDuration: 3,
        statusMagnitude: 30,
      },
    ],
    abilityTypesGranted: [],
  },

  // =========================================================================
  // KNIGHT -> Paladin / Dark Knight
  // =========================================================================
  {
    id: "spec_paladin",
    name: "Paladin",
    description: "Holy champion. Heals while fighting, bonus damage to evil.",
    fromUnitType: UnitType.KNIGHT,
    levelRequired: 10,
    statBonuses: { atk: 3, def: 3, maxHp: 20 },
    abilities: [
      {
        id: "spec_radiant_charge",
        name: "Radiant Charge",
        description: "Charge an enemy dealing damage and healing self.",
        mpCost: 10,
        damage: 20,
        healAmount: 15,
        cooldown: 3,
      },
      {
        id: "spec_aura_of_light",
        name: "Aura of Light",
        description: "Regenerate all party members for 3 turns.",
        mpCost: 14,
        damage: 0,
        healAmount: 0,
        cooldown: 5,
        statusEffect: "regen",
        statusDuration: 3,
        statusMagnitude: 10,
      },
    ],
    abilityTypesGranted: [],
  },
  {
    id: "spec_dark_knight",
    name: "Dark Knight",
    description: "Sacrifices HP for devastating power. High risk, high reward.",
    fromUnitType: UnitType.KNIGHT,
    levelRequired: 10,
    statBonuses: { atk: 7, speed: 1 },
    abilities: [
      {
        id: "spec_soul_rend",
        name: "Soul Rend",
        description: "Sacrifice 15% HP to deal massive dark damage.",
        mpCost: 6,
        damage: 40,
        healAmount: 0,
        cooldown: 3,
      },
      {
        id: "spec_dark_pact",
        name: "Dark Pact",
        description: "Sacrifice 10% HP to gain +50% ATK for 2 turns.",
        mpCost: 4,
        damage: 0,
        healAmount: 0,
        cooldown: 4,
        statusEffect: "haste",
        statusDuration: 2,
        statusMagnitude: 50,
      },
    ],
    abilityTypesGranted: [],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get available specializations for a given unit type.
 * Returns an empty array if the unit type has no specializations.
 */
export function getSpecializations(unitType: UnitType): SpecializationDef[] {
  return SPECIALIZATION_DEFS.filter(s => s.fromUnitType === unitType);
}

/**
 * Check if a party member qualifies for specialization.
 */
export function canSpecialize(unitType: UnitType, level: number): boolean {
  const specs = getSpecializations(unitType);
  return specs.length > 0 && level >= specs[0].levelRequired;
}

/**
 * Get a specialization by its ID.
 */
export function getSpecializationById(specId: string): SpecializationDef | undefined {
  return SPECIALIZATION_DEFS.find(s => s.id === specId);
}
