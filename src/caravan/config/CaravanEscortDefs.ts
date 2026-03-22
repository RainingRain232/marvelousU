// ---------------------------------------------------------------------------
// Caravan escort (hireable mercenary) definitions
// ---------------------------------------------------------------------------

import { UnitType } from "@/types";

export interface EscortDef {
  id: string;
  name: string;
  unitType: UnitType;
  hp: number;
  atk: number;
  speed: number;
  range: number;
  cost: number;
  description: string;
  isRanged: boolean; // ranged escorts use kiting AI
}

export const ESCORT_DEFS: EscortDef[] = [
  {
    id: "militia",
    name: "Militia",
    unitType: UnitType.PIKEMAN,
    hp: 75, atk: 8, speed: 2.0, range: 1.2,
    cost: 40,
    description: "Cheap footsoldier — decent shield",
    isRanged: false,
  },
  {
    id: "swordsman",
    name: "Swordsman",
    unitType: UnitType.SWORDSMAN,
    hp: 120, atk: 12, speed: 2.0, range: 1.3,
    cost: 90,
    description: "Reliable melee fighter",
    isRanged: false,
  },
  {
    id: "archer",
    name: "Archer",
    unitType: UnitType.ARCHER,
    hp: 60, atk: 16, speed: 2.2, range: 5.0,
    cost: 110,
    description: "Ranged — kites away from melee",
    isRanged: true,
  },
  {
    id: "knight",
    name: "Knight",
    unitType: UnitType.KNIGHT,
    hp: 200, atk: 20, speed: 2.5, range: 1.3,
    cost: 220,
    description: "Heavy mounted warrior — high HP",
    isRanged: false,
  },
  {
    id: "mage",
    name: "Battle Mage",
    unitType: UnitType.FIRE_MAGE,
    hp: 80, atk: 28, speed: 1.6, range: 4.0,
    cost: 280,
    description: "Powerful ranged magic — fragile",
    isRanged: true,
  },
];
