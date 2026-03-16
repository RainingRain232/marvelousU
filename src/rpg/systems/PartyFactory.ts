// Create starting party members from unit definitions
import { UnitType, AbilityType, UpgradeType } from "@/types";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import type { PartyMember } from "@rpg/state/RPGState";
import { RPGBalance } from "@rpg/config/RPGBalanceConfig";

// ---------------------------------------------------------------------------
// Party member factory
// ---------------------------------------------------------------------------

export function createPartyMember(
  id: string,
  name: string,
  unitType: UnitType,
  level: number = 1,
  abilityOverrides?: AbilityType[],
  startingSpells?: UpgradeType[],
): PartyMember {
  const def = UNIT_DEFINITIONS[unitType];

  // Scale stats by level
  const scale = 1 + RPGBalance.LEVEL_STAT_GROWTH * (level - 1);
  const baseHp = Math.ceil(def.hp * scale);
  const baseAtk = Math.ceil(def.atk * scale);
  const baseDef = Math.ceil(def.atk * scale * 0.3);
  const baseMp = Math.ceil(30 * scale);

  return {
    id,
    name,
    unitType,
    level,
    xp: 0,
    xpToNext: Math.ceil(RPGBalance.BASE_XP_TO_LEVEL * Math.pow(RPGBalance.XP_SCALE_FACTOR, level - 1)),
    hp: baseHp,
    maxHp: baseHp,
    mp: baseMp,
    maxMp: baseMp,
    atk: baseAtk,
    def: baseDef,
    speed: def.speed,
    range: def.range,
    abilityTypes: abilityOverrides ?? (def.abilityTypes ?? []),
    knownSpells: startingSpells ?? [],
    equippedSpells: startingSpells ?? [],
    equipment: {
      weapon: null,
      armor: null,
      accessory: null,
      helmet: null,
      shield: null,
      legs: null,
      boots: null,
      ring: null,
    },
    statusEffects: [],
    masteryPoints: 0,
    masteryBonuses: {},
    bonusCritChance: 0,
    bonusHealingMult: 0,
    battlesFought: 0,
  };
}

// ---------------------------------------------------------------------------
// Default starting party
// ---------------------------------------------------------------------------

export function createStarterParty(): PartyMember[] {
  return [
    createPartyMember("hero", "Hero", UnitType.KNIGHT, 1, [AbilityType.HEAL], [UpgradeType.SPELL_BLESSING_OF_LIGHT]),
    createPartyMember("mage", "Elara", UnitType.FIRE_MAGE, 1, [AbilityType.FIREBALL], [UpgradeType.SPELL_FLAME_SPARK]),
    createPartyMember("archer", "Finn", UnitType.ARCHER, 1),
  ];
}
