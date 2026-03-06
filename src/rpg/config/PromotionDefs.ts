// Class promotion paths for RPG mode
import { UnitType } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromotionPath {
  from: UnitType;
  options: { to: UnitType; description: string }[];
  levelRequired: number;
  goldCost: number;
}

// ---------------------------------------------------------------------------
// Promotion definitions
// ---------------------------------------------------------------------------

export const PROMOTION_PATHS: PromotionPath[] = [
  // =========================================================================
  // Level 10 promotions (Tier 1 -> Tier 2)
  // =========================================================================
  {
    from: UnitType.SWORDSMAN,
    options: [
      { to: UnitType.DEFENDER, description: "Tank path: high HP and defense" },
      { to: UnitType.AXEMAN, description: "DPS path: raw damage output" },
    ],
    levelRequired: 10,
    goldCost: 200,
  },
  {
    from: UnitType.ARCHER,
    options: [
      { to: UnitType.LONGBOWMAN, description: "Range path: extended attack range" },
      { to: UnitType.CROSSBOWMAN, description: "Power path: slower but harder hits" },
    ],
    levelRequired: 10,
    goldCost: 200,
  },
  {
    from: UnitType.PIKEMAN,
    options: [
      { to: UnitType.PHALANX, description: "Defense: unbreakable formation" },
      { to: UnitType.BERSERKER, description: "Offense: reckless fury" },
    ],
    levelRequired: 10,
    goldCost: 200,
  },
  {
    from: UnitType.FIRE_MAGE,
    options: [
      { to: UnitType.FIRE_ADEPT_MAGE, description: "Adept fire magic mastery" },
    ],
    levelRequired: 10,
    goldCost: 200,
  },
  {
    from: UnitType.COLD_MAGE,
    options: [
      { to: UnitType.COLD_ADEPT_MAGE, description: "Adept cold magic mastery" },
    ],
    levelRequired: 10,
    goldCost: 200,
  },
  {
    from: UnitType.STORM_MAGE,
    options: [
      { to: UnitType.LIGHTNING_ADEPT_MAGE, description: "Adept lightning magic mastery" },
    ],
    levelRequired: 10,
    goldCost: 200,
  },
  {
    from: UnitType.MONK,
    options: [
      { to: UnitType.CLERIC, description: "Holy healer with stronger restoration" },
    ],
    levelRequired: 10,
    goldCost: 200,
  },
  {
    from: UnitType.KNIGHT,
    options: [
      { to: UnitType.LANCER, description: "Mounted charge specialist" },
    ],
    levelRequired: 10,
    goldCost: 200,
  },
  {
    from: UnitType.SCOUT_CAVALRY,
    options: [
      { to: UnitType.HORSE_ARCHER, description: "Fast ranged cavalry" },
    ],
    levelRequired: 10,
    goldCost: 200,
  },

  // =========================================================================
  // Level 20 promotions (Tier 2 -> Tier 3)
  // =========================================================================
  {
    from: UnitType.DEFENDER,
    options: [
      { to: UnitType.ROYAL_DEFENDER, description: "Royal guard with supreme defense" },
    ],
    levelRequired: 20,
    goldCost: 400,
  },
  {
    from: UnitType.AXEMAN,
    options: [
      { to: UnitType.ANCIENT_AXEMAN, description: "Ancient warrior of devastating power" },
    ],
    levelRequired: 20,
    goldCost: 400,
  },
  {
    from: UnitType.LONGBOWMAN,
    options: [
      { to: UnitType.ARBALESTIER, description: "Elite siege-bow specialist" },
      { to: UnitType.ANCIENT_LONGBOWMAN, description: "Ancient master of the longbow" },
    ],
    levelRequired: 20,
    goldCost: 400,
  },
  {
    from: UnitType.CROSSBOWMAN,
    options: [
      { to: UnitType.REPEATER, description: "Rapid-fire repeating crossbow" },
    ],
    levelRequired: 20,
    goldCost: 400,
  },
  {
    from: UnitType.PHALANX,
    options: [
      { to: UnitType.ROYAL_PHALANX, description: "Royal phalanx with impenetrable shield wall" },
    ],
    levelRequired: 20,
    goldCost: 400,
  },
  {
    from: UnitType.FIRE_ADEPT_MAGE,
    options: [
      { to: UnitType.FIRE_MASTER_MAGE, description: "Master of fire magic" },
    ],
    levelRequired: 20,
    goldCost: 400,
  },
  {
    from: UnitType.COLD_ADEPT_MAGE,
    options: [
      { to: UnitType.COLD_MASTER_MAGE, description: "Master of cold magic" },
    ],
    levelRequired: 20,
    goldCost: 400,
  },
  {
    from: UnitType.LIGHTNING_ADEPT_MAGE,
    options: [
      { to: UnitType.LIGHTNING_MASTER_MAGE, description: "Master of lightning magic" },
    ],
    levelRequired: 20,
    goldCost: 400,
  },
  {
    from: UnitType.CLERIC,
    options: [
      { to: UnitType.SAINT, description: "Blessed saint with divine healing" },
    ],
    levelRequired: 20,
    goldCost: 400,
  },
  {
    from: UnitType.LANCER,
    options: [
      { to: UnitType.KNIGHT_LANCER, description: "Armored knight with devastating lance charge" },
      { to: UnitType.ELITE_LANCER, description: "Elite lancer with unmatched speed" },
    ],
    levelRequired: 20,
    goldCost: 400,
  },

  // =========================================================================
  // Level 30 promotions (Tier 3 -> Tier 4)
  // =========================================================================
  {
    from: UnitType.ROYAL_DEFENDER,
    options: [
      { to: UnitType.ANCIENT_DEFENDER, description: "Ancient defender of legendary resilience" },
    ],
    levelRequired: 30,
    goldCost: 600,
  },
  {
    from: UnitType.ROYAL_PHALANX,
    options: [
      { to: UnitType.ANCIENT_PHALANX, description: "Ancient phalanx, immovable in battle" },
    ],
    levelRequired: 30,
    goldCost: 600,
  },
  {
    from: UnitType.REPEATER,
    options: [
      { to: UnitType.ELDER_REPEATER, description: "Elder repeater with withering volleys" },
    ],
    levelRequired: 30,
    goldCost: 600,
  },
  {
    from: UnitType.FIRE_MASTER_MAGE,
    options: [
      { to: UnitType.DARK_SAVANT, description: "Dark savant channeling forbidden flame" },
    ],
    levelRequired: 30,
    goldCost: 600,
  },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Look up available promotion options for a given unit type and level.
 * Returns the matching PromotionPath or null if no promotion is available.
 */
export function getPromotionOptions(unitType: UnitType, level: number): PromotionPath | null {
  for (const path of PROMOTION_PATHS) {
    if (path.from === unitType && level >= path.levelRequired) {
      return path;
    }
  }
  return null;
}
