// Recruitment system — generates and manages hireable adventurers at towns
import { UnitType, AbilityType } from "@/types";
import { SeededRandom } from "@sim/utils/random";
import { RPGBalance } from "@rpg/config/RPGBalanceConfig";
import { createPartyMember } from "./PartyFactory";
import type { RPGState } from "@rpg/state/RPGState";
import type { RecruitData } from "@rpg/state/OverworldState";

// ---------------------------------------------------------------------------
// Recruit pool — all possible recruitable adventurer templates
// ---------------------------------------------------------------------------

interface RecruitTemplate {
  namePool: string[];
  unitType: UnitType;
  abilityTypes?: AbilityType[];
  description: string;
  baseCost: number;
}

const RECRUIT_TEMPLATES: RecruitTemplate[] = [
  {
    namePool: ["Gareth", "Roland", "Aldric", "Cedric", "Bron"],
    unitType: UnitType.SWORDSMAN,
    description: "A steady swordsman. Balanced stats, reliable in any fight.",
    baseCost: 80,
  },
  {
    namePool: ["Theron", "Marcus", "Lucius", "Vance", "Darius"],
    unitType: UnitType.TEMPLAR,
    abilityTypes: [AbilityType.HEAL],
    description: "Holy warrior with healing magic. High defense, moderate attack.",
    baseCost: 150,
  },
  {
    namePool: ["Ivy", "Wren", "Sage", "Lyra", "Nyx"],
    unitType: UnitType.ARCHER,
    description: "Ranged attacker with high speed. Fragile but deadly from afar.",
    baseCost: 90,
  },
  {
    namePool: ["Orion", "Hawk", "Raven", "Flint", "Pierce"],
    unitType: UnitType.LONGBOWMAN,
    description: "Elite ranged unit with extended range and piercing shots.",
    baseCost: 130,
  },
  {
    namePool: ["Bolt", "Rex", "Gunnar", "Forge", "Steel"],
    unitType: UnitType.CROSSBOWMAN,
    description: "Heavy crossbow specialist. Slow but devastating damage.",
    baseCost: 120,
  },
  {
    namePool: ["Sir Gallan", "Sir Bors", "Dame Elise", "Sir Valen", "Dame Kira"],
    unitType: UnitType.KNIGHT,
    abilityTypes: [AbilityType.HEAL],
    description: "Armored cavalry. High HP and defense, charges into battle.",
    baseCost: 200,
  },
  {
    namePool: ["Ignis", "Pyra", "Scorch", "Ember", "Blaze"],
    unitType: UnitType.FIRE_MAGE,
    abilityTypes: [AbilityType.FIREBALL],
    description: "Fire mage with devastating area magic. Low defense.",
    baseCost: 160,
  },
  {
    namePool: ["Volta", "Zephyr", "Storm", "Nimbus", "Gale"],
    unitType: UnitType.STORM_MAGE,
    abilityTypes: [AbilityType.CHAIN_LIGHTNING],
    description: "Storm mage with chain lightning. Hits multiple enemies.",
    baseCost: 180,
  },
  {
    namePool: ["Pike", "Halbert", "Spear", "Lance", "Ward"],
    unitType: UnitType.PIKEMAN,
    description: "Long-reach fighter. Excellent against cavalry and charges.",
    baseCost: 70,
  },
  {
    namePool: ["Shade", "Whisper", "Vex", "Phantom", "Ghost"],
    unitType: UnitType.ASSASSIN,
    description: "Lightning-fast killer. Highest speed, critical hit specialist.",
    baseCost: 170,
  },
  {
    namePool: ["Hex", "Bane", "Null", "Silence", "Void"],
    unitType: UnitType.MAGE_HUNTER,
    description: "Anti-magic specialist. Bonus damage against casters.",
    baseCost: 140,
  },
  {
    namePool: ["Rapid", "Burst", "Volley", "Haste", "Tempo"],
    unitType: UnitType.REPEATER,
    description: "Rapid-fire archer. Attacks twice but with lower damage per hit.",
    baseCost: 150,
  },
];

// ---------------------------------------------------------------------------
// Number of recruits to offer per visit
// ---------------------------------------------------------------------------

const RECRUITS_PER_VISIT = 6;
const STEPS_TO_RESET = 20;

// ---------------------------------------------------------------------------
// Generate recruits for a town visit
// ---------------------------------------------------------------------------

export function generateRecruits(rpgState: RPGState): RecruitData[] {
  const rng = new SeededRandom(rpgState.recruitSeed);

  // Determine party average level for scaling recruit levels
  const avgLevel = rpgState.party.length > 0
    ? Math.max(1, Math.round(rpgState.party.reduce((s, m) => s + m.level, 0) / rpgState.party.length))
    : 1;

  // Shuffle templates and pick RECRUITS_PER_VISIT
  const shuffled = [...RECRUIT_TEMPLATES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.int(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const selected = shuffled.slice(0, RECRUITS_PER_VISIT);
  const recruits: RecruitData[] = [];

  for (let i = 0; i < selected.length; i++) {
    const template = selected[i];
    // Pick a random name from pool
    const name = template.namePool[rng.int(0, template.namePool.length)];
    // Level varies around party average (±1)
    const level = Math.max(1, avgLevel + rng.int(-1, 2));
    // Cost scales with level
    const cost = Math.ceil(template.baseCost * (1 + 0.2 * (level - 1)));

    recruits.push({
      id: `recruit_${rpgState.recruitSeed}_${i}`,
      name,
      unitType: template.unitType,
      level,
      description: template.description,
      cost,
      abilityTypes: template.abilityTypes,
    });
  }

  return recruits;
}

// ---------------------------------------------------------------------------
// Recruit a unit
// ---------------------------------------------------------------------------

export function recruitUnit(rpgState: RPGState, recruit: RecruitData): boolean {
  // Check party size
  if (rpgState.party.length >= RPGBalance.MAX_PARTY_SIZE) return false;
  // Check gold
  if (rpgState.gold < recruit.cost) return false;

  rpgState.gold -= recruit.cost;

  const member = createPartyMember(
    recruit.id,
    recruit.name,
    recruit.unitType as UnitType,
    recruit.level,
    recruit.abilityTypes as AbilityType[] | undefined,
  );

  rpgState.party.push(member);
  return true;
}

// ---------------------------------------------------------------------------
// Step tracking — call after each overworld move
// ---------------------------------------------------------------------------

export function trackRecruitSteps(rpgState: RPGState): void {
  rpgState.stepsSinceLastTown++;
  if (rpgState.stepsSinceLastTown >= STEPS_TO_RESET) {
    rpgState.recruitSeed = rpgState.recruitSeed + rpgState.gameTime + rpgState.stepsSinceLastTown;
  }
}

export function resetRecruitStepsOnTownVisit(rpgState: RPGState): void {
  if (rpgState.stepsSinceLastTown >= STEPS_TO_RESET) {
    rpgState.recruitSeed = rpgState.recruitSeed + rpgState.gameTime + rpgState.stepsSinceLastTown;
  }
  rpgState.stepsSinceLastTown = 0;
}
