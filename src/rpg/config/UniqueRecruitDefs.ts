import { UnitType } from "@/types";

export interface UniqueRecruitDef {
  id: string;
  name: string;
  unitType: UnitType;
  level: number;
  cost: number;
  backstory: string;
  statBonuses: Partial<{ atk: number; def: number; hp: number; mp: number; speed: number; critChance: number }>;
  townIndex: number; // which town index hosts this recruit (0-9)
}

export const UNIQUE_RECRUITS: UniqueRecruitDef[] = [
  {
    id: "elara",
    name: "Elara",
    unitType: UnitType.ARCHER,
    level: 5,
    cost: 400,
    backstory: "An elven ranger exiled from the Silverwood. Her arrows never miss their mark.",
    statBonuses: { critChance: 0.15, speed: 0.5 },
    townIndex: 1,
  },
  {
    id: "grimjaw",
    name: "Grimjaw",
    unitType: UnitType.BERSERKER,
    level: 8,
    cost: 600,
    backstory: "A half-orc berserker who fights with reckless abandon. What he lacks in finesse, he makes up in fury.",
    statBonuses: { atk: 10, def: -3 },
    townIndex: 3,
  },
  {
    id: "sister_miriam",
    name: "Sister Miriam",
    unitType: UnitType.CLERIC,
    level: 6,
    cost: 500,
    backstory: "A devoted sister of the Holy Order. Her prayers can mend even the gravest wounds.",
    statBonuses: { mp: 20, def: 2 },
    townIndex: 5,
  },
  {
    id: "kazrik",
    name: "Kazrik",
    unitType: UnitType.DEFENDER,
    level: 7,
    cost: 550,
    backstory: "A dwarven shieldbearer who once held a mountain pass alone against a hundred orcs.",
    statBonuses: { def: 8, hp: 30 },
    townIndex: 7,
  },
  {
    id: "shadowfang",
    name: "Shadowfang",
    unitType: UnitType.SWORDSMAN,
    level: 10,
    cost: 800,
    backstory: "A mysterious assassin with no past. His first strike always finds its mark.",
    statBonuses: { atk: 5, critChance: 0.25, speed: 1.0 },
    townIndex: 9,
  },
];

export function getUniqueRecruitForTown(townIndex: number): UniqueRecruitDef | undefined {
  return UNIQUE_RECRUITS.find(r => r.townIndex === townIndex);
}
