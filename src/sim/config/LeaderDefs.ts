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
    id: "joan",
    name: "Joan",
    title: "The Maid of Orleans",
    flavor: "Touched by divine fire, she leads the charge where others dare not tread.",
    bonusLabel: "All infantry units have +20% attack.",
    bonus: { type: "unit_atk_multiplier", multiplier: 1.2 },
  },
  {
    id: "napoleon",
    name: "Napoleon",
    title: "Emperor of the West",
    flavor: "A military genius who turned the chaos of war into an art form.",
    bonusLabel: "Siege units spawn 30% faster.",
    bonus: { type: "spawn_speed_multiplier", multiplier: 0.7 },
  },
  {
    id: "cleopatra",
    name: "Cleopatra",
    title: "Queen of the Nile",
    flavor: "Her golden tongue and sharper mind secured alliances no army could win.",
    bonusLabel: "Start with +300 bonus gold.",
    bonus: { type: "gold_bonus", amount: 300 },
  },
  {
    id: "genghis",
    name: "Genghis",
    title: "Great Khan",
    flavor: "From the endless steppes, he shaped the world's largest empire through sheer will.",
    bonusLabel: "Cavalry units have +15% HP.",
    bonus: { type: "unit_hp_multiplier", multiplier: 1.15 },
  },
  {
    id: "caesar",
    name: "Caesar",
    title: "Consul of Rome",
    flavor: "He came, he saw, he conquered — and then rebuilt what he had taken.",
    bonusLabel: "Gold income is +25% higher.",
    bonus: { type: "income_multiplier", multiplier: 1.25 },
  },
  {
    id: "saladin",
    name: "Saladin",
    title: "Sultan of Jerusalem",
    flavor: "Known as much for mercy and justice as for his unmatched skill on the battlefield.",
    bonusLabel: "Buildings cost 15% less gold.",
    bonus: { type: "building_cost_reduction", multiplier: 0.85 },
  },
  {
    id: "alexander",
    name: "Alexander",
    title: "The Great",
    flavor: "He wept when there were no more worlds to conquer — then found three more.",
    bonusLabel: "Neutral buildings are captured 40% faster.",
    bonus: { type: "capture_speed_multiplier", multiplier: 0.6 },
  },
  {
    id: "boudicca",
    name: "Boudicca",
    title: "Queen of the Iceni",
    flavor: "She turned grief into a fury that shook Rome to its foundations.",
    bonusLabel: "Base starts with +500 extra health.",
    bonus: { type: "base_health_bonus", amount: 500 },
  },
  {
    id: "sun_tzu",
    name: "Sun Tzu",
    title: "Author of The Art of War",
    flavor: "The supreme art of war is to subdue the enemy without fighting.",
    bonusLabel: "All units cost 10% less gold.",
    bonus: { type: "unit_cost_reduction", multiplier: 0.9 },
  },
  {
    id: "leonidas",
    name: "Leonidas",
    title: "King of Sparta",
    flavor: "With shield and spear he held a mountain pass against ten thousand.",
    bonusLabel: "Infantry units have +25% HP.",
    bonus: { type: "unit_hp_multiplier", multiplier: 1.25 },
  },
  {
    id: "elizabeth",
    name: "Elizabeth",
    title: "The Virgin Queen",
    flavor: "With the heart of a king and a mind sharper than any blade she ever commissioned.",
    bonusLabel: "Archers start at Level 1.",
    bonus: { type: "unit_start_level_type", unitType: UnitType.ARCHER, level: 1 },
  },
  {
    id: "attila",
    name: "Attila",
    title: "Scourge of God",
    flavor: "Where his horse trod, no grass grew — and no empire stood for long.",
    bonusLabel: "All units have +15% attack speed.",
    bonus: { type: "unit_atk_multiplier", multiplier: 1.15 },
  },
  {
    id: "charlemagne",
    name: "Charlemagne",
    title: "Father of Europe",
    flavor: "He united fractured kingdoms with iron will and the grace of the church.",
    bonusLabel: "Temples train units 25% faster.",
    bonus: { type: "spawn_speed_multiplier", multiplier: 0.75 },
  },
  {
    id: "hannibal",
    name: "Hannibal",
    title: "Commander of Carthage",
    flavor: "He crossed the Alps with elephants. Rome never forgot it.",
    bonusLabel: "Creature Den units start at Level 1.",
    bonus: { type: "unit_start_level_building", building: BuildingType.CREATURE_DEN, level: 1 },
  },
  {
    id: "wilhelmina",
    name: "Wilhelmina",
    title: "The Iron Duchess",
    flavor: "Behind every great army stands an economy that never sleeps.",
    bonusLabel: "Start with +500 bonus gold.",
    bonus: { type: "gold_bonus", amount: 500 },
  },
  {
    id: "ragnar",
    name: "Ragnar",
    title: "Raider King",
    flavor: "He sailed into legends that terrified half the known world.",
    bonusLabel: "All units have +10% HP and +10% attack.",
    bonus: { type: "unit_hp_multiplier", multiplier: 1.1 },
  },
  {
    id: "nzinga",
    name: "Nzinga",
    title: "Queen of Ndongo",
    flavor: "She negotiated, fought, and outmaneuvered empires for decades.",
    bonusLabel: "Gold income is +15% higher.",
    bonus: { type: "income_multiplier", multiplier: 1.15 },
  },
  {
    id: "vlad",
    name: "Vlad",
    title: "The Impaler",
    flavor: "His reputation alone turned back armies. His methods ensured they did not return.",
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
