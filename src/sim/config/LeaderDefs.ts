// Leader definitions — each leader grants a passive bonus to the player.
// Leaders have no combat stats; they provide flat buffs applied at game start
// and/or each round reset.

import { UnitType, BuildingType } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LeaderId = string;

export interface LeaderDef {
  id: LeaderId;
  name: string;
  title: string;
  /** Flavor/lore sentence shown in the leader card. */
  flavor: string;
  /** Short one-line description of the bonus, shown as the "bonus" tag. */
  bonusLabel: string;
  /** Structured bonus data consumed by the game systems. */
  bonus: LeaderBonus;
}

/** Discriminated union of all bonus types. */
export type LeaderBonus =
  | { type: "unit_start_level"; unitSource: "stables"; level: number }
  | { type: "unit_start_level_building"; building: BuildingType; level: number }
  | { type: "unit_start_level_type"; unitType: UnitType; level: number }
  | { type: "spawn_unit_near_castle"; unitType: UnitType; bonusLevel?: number }
  | { type: "gold_bonus"; amount: number }
  | { type: "income_multiplier"; multiplier: number }
  | { type: "base_health_bonus"; amount: number }
  | { type: "unit_atk_multiplier"; multiplier: number }
  | { type: "unit_hp_multiplier"; multiplier: number }
  | { type: "spawn_speed_multiplier"; multiplier: number }
  | { type: "capture_speed_multiplier"; multiplier: number }
  | { type: "building_cost_reduction"; multiplier: number }
  | { type: "unit_cost_reduction"; multiplier: number }
  | { type: "none" };

// ---------------------------------------------------------------------------
// Leader definitions
// ---------------------------------------------------------------------------

export const LEADER_DEFINITIONS: LeaderDef[] = [
  {
    id: "arthur",
    name: "Arthur",
    title: "The Once and Future King",
    flavor: "A legendary king who forged unity through honour and strength of arms.",
    bonusLabel: "Stables units start at Level 2.",
    bonus: { type: "unit_start_level", unitSource: "stables", level: 2 },
  },
  {
    id: "merlin",
    name: "Merlin",
    title: "Archmage of Avalon",
    flavor: "The greatest sorcerer of the age, his wisdom shapes the fate of empires.",
    bonusLabel: "Mages start at Level 1. A Storm Mage spawns near your castle at battle start.",
    bonus: { type: "unit_start_level_building", building: BuildingType.MAGE_TOWER, level: 1 },
  },
  {
    id: "lancelot",
    name: "Lancelot",
    title: "Knight of the Lake",
    flavor: "The greatest swordsman of the Round Table, torn between duty and desire.",
    bonusLabel: "All infantry units have +20% attack.",
    bonus: { type: "unit_atk_multiplier", multiplier: 1.2 },
  },
  {
    id: "tristan",
    name: "Tristan",
    title: "Knight of Cornwall",
    flavor: "A peerless warrior whose blade sang as sweetly as his harp.",
    bonusLabel: "Siege units spawn 30% faster.",
    bonus: { type: "spawn_speed_multiplier", multiplier: 0.7 },
  },
  {
    id: "guinevere",
    name: "Guinevere",
    title: "Queen of Camelot",
    flavor: "Her grace held the court together when steel and pride threatened to tear it apart.",
    bonusLabel: "Start with +300 bonus gold.",
    bonus: { type: "gold_bonus", amount: 300 },
  },
  {
    id: "gawain",
    name: "Gawain",
    title: "The Sun Knight",
    flavor: "His strength waxes with the sun — by noon, no knight alive can match him.",
    bonusLabel: "Cavalry units have +15% HP.",
    bonus: { type: "unit_hp_multiplier", multiplier: 1.15 },
  },
  {
    id: "bedivere",
    name: "Bedivere",
    title: "The One-Handed Knight",
    flavor: "Last of the loyal, he cast Excalibur into the lake when all others had fallen.",
    bonusLabel: "Gold income is +25% higher.",
    bonus: { type: "income_multiplier", multiplier: 1.25 },
  },
  {
    id: "kay",
    name: "Kay",
    title: "Seneschal of Camelot",
    flavor: "Arthur's foster-brother and steward — sharp-tongued, sharper-minded, and utterly dependable.",
    bonusLabel: "Buildings cost 15% less gold.",
    bonus: { type: "building_cost_reduction", multiplier: 0.85 },
  },
  {
    id: "percival",
    name: "Percival",
    title: "The Grail Seeker",
    flavor: "A simple youth who became the purest of questing knights through faith alone.",
    bonusLabel: "Neutral buildings are captured 40% faster.",
    bonus: { type: "capture_speed_multiplier", multiplier: 0.6 },
  },
  {
    id: "isolde",
    name: "Isolde",
    title: "The Fair Healer",
    flavor: "Her hands mend what blades have broken — she is the last hope of the wounded.",
    bonusLabel: "Base starts with +500 extra health.",
    bonus: { type: "base_health_bonus", amount: 500 },
  },
  {
    id: "morgana",
    name: "Morgana",
    title: "The Fay Enchantress",
    flavor: "Half-sister to the king, she walks the line between healing and hexing.",
    bonusLabel: "All units cost 10% less gold.",
    bonus: { type: "unit_cost_reduction", multiplier: 0.9 },
  },
  {
    id: "galahad",
    name: "Galahad",
    title: "The Pure Knight",
    flavor: "Son of Lancelot, unblemished in spirit — the only knight to achieve the Grail.",
    bonusLabel: "Infantry units have +25% HP.",
    bonus: { type: "unit_hp_multiplier", multiplier: 1.25 },
  },
  {
    id: "nimue",
    name: "Nimue",
    title: "Lady of the Lake",
    flavor: "She gave Excalibur to a king and imprisoned a wizard — all before teatime.",
    bonusLabel: "Archers start at Level 1.",
    bonus: { type: "unit_start_level_type", unitType: UnitType.ARCHER, level: 1 },
  },
  {
    id: "mordred",
    name: "Mordred",
    title: "The Treacherous Son",
    flavor: "Born of sin and raised on ambition, he broke the fellowship that could not be broken.",
    bonusLabel: "All units have +15% attack speed.",
    bonus: { type: "unit_atk_multiplier", multiplier: 1.15 },
  },
  {
    id: "uther",
    name: "Uther",
    title: "The Pendragon",
    flavor: "Arthur's father and the first to bear the dragon standard — a king forged in war.",
    bonusLabel: "Temples train units 25% faster.",
    bonus: { type: "spawn_speed_multiplier", multiplier: 0.75 },
  },
  {
    id: "gareth",
    name: "Gareth",
    title: "Knight of Many Colours",
    flavor: "He served as a kitchen boy to prove his worth, then rose to become one of the finest knights.",
    bonusLabel: "Creature Den units start at Level 1.",
    bonus: { type: "unit_start_level_building", building: BuildingType.CREATURE_DEN, level: 1 },
  },
  {
    id: "elaine",
    name: "Elaine",
    title: "The Lily Maid",
    flavor: "Her love was unrequited, but her courage was unmatched — she gave all for Camelot.",
    bonusLabel: "Start with +500 bonus gold.",
    bonus: { type: "gold_bonus", amount: 500 },
  },
  {
    id: "bors",
    name: "Bors",
    title: "The Steadfast",
    flavor: "One of only three knights to behold the Holy Grail — and the only one who returned.",
    bonusLabel: "All units have +10% HP and +10% attack.",
    bonus: { type: "unit_hp_multiplier", multiplier: 1.1 },
  },
  {
    id: "igraine",
    name: "Igraine",
    title: "Duchess of Cornwall",
    flavor: "Mother of Arthur, she endured the schemes of kings and sorcerers with quiet strength.",
    bonusLabel: "Gold income is +15% higher.",
    bonus: { type: "income_multiplier", multiplier: 1.15 },
  },
  {
    id: "agravain",
    name: "Agravain",
    title: "The Dark Knight",
    flavor: "Gawain's brother, consumed by suspicion — he exposed Lancelot's secret at the cost of everything.",
    bonusLabel: "Base starts with +1000 extra health.",
    bonus: { type: "base_health_bonus", amount: 1000 },
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getLeader(id: LeaderId): LeaderDef | undefined {
  return LEADER_DEFINITIONS.find((l) => l.id === id);
}
