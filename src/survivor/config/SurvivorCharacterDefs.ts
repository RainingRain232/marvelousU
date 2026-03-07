// ---------------------------------------------------------------------------
// Survivor playable character definitions
// ---------------------------------------------------------------------------

import { UnitType } from "@/types";
import { SurvivorWeaponId, SurvivorPassiveId } from "./SurvivorWeaponDefs";

export interface SurvivorCharacterDef {
  id: string;
  name: string;
  unitType: UnitType; // determines sprite
  startingWeapon: SurvivorWeaponId;
  hpBonus: number; // added to base HP
  speedBonus: number; // percentage
  areaBonus: number; // percentage
  critBonus: number; // flat
  regenBonus: number; // hp/sec
  passiveBonus?: SurvivorPassiveId; // starts with level 1 of this passive
  description: string;
  unlocked: boolean; // unlocked by default
}

export const SURVIVOR_CHARACTERS: SurvivorCharacterDef[] = [
  {
    id: "swordsman",
    name: "Swordsman",
    unitType: UnitType.SWORDSMAN,
    startingWeapon: SurvivorWeaponId.SPINNING_BLADE,
    hpBonus: 20,
    speedBonus: 0,
    areaBonus: 0,
    critBonus: 0,
    regenBonus: 0,
    description: "Balanced fighter with a spinning blade",
    unlocked: true,
  },
  {
    id: "archer",
    name: "Archer",
    unitType: UnitType.ARCHER,
    startingWeapon: SurvivorWeaponId.ARROW_VOLLEY,
    hpBonus: 0,
    speedBonus: 0.10,
    areaBonus: 0,
    critBonus: 0,
    regenBonus: 0,
    description: "Fast ranged fighter",
    unlocked: true,
  },
  {
    id: "fire_mage",
    name: "Fire Mage",
    unitType: UnitType.FIRE_MAGE,
    startingWeapon: SurvivorWeaponId.FIREBALL_RING,
    hpBonus: -20,
    speedBonus: 0,
    areaBonus: 0.10,
    critBonus: 0,
    regenBonus: 0,
    description: "Fragile but powerful area damage",
    unlocked: true,
  },
  {
    id: "cleric",
    name: "Cleric",
    unitType: UnitType.CLERIC,
    startingWeapon: SurvivorWeaponId.HOLY_CIRCLE,
    hpBonus: 0,
    speedBonus: 0,
    areaBonus: 0,
    critBonus: 0,
    regenBonus: 1,
    description: "Sustained fighter with holy aura and regen",
    unlocked: true,
  },
  {
    id: "assassin",
    name: "Assassin",
    unitType: UnitType.ASSASSIN,
    startingWeapon: SurvivorWeaponId.SPINNING_BLADE,
    hpBonus: -30,
    speedBonus: 0.15,
    areaBonus: 0,
    critBonus: 0.15,
    regenBonus: 0,
    description: "Glass cannon with high crit and speed",
    unlocked: false,
  },
  {
    id: "knight",
    name: "Knight",
    unitType: UnitType.KNIGHT,
    startingWeapon: SurvivorWeaponId.SPINNING_BLADE,
    hpBonus: 50,
    speedBonus: -0.10,
    areaBonus: 0,
    critBonus: 0,
    regenBonus: 0,
    passiveBonus: SurvivorPassiveId.PLATE_ARMOR,
    description: "Tanky but slow, starts with armor",
    unlocked: false,
  },
  {
    id: "necromancer",
    name: "Necromancer",
    unitType: UnitType.NECROMANCER,
    startingWeapon: SurvivorWeaponId.SOUL_DRAIN,
    hpBonus: -10,
    speedBonus: 0,
    areaBonus: 0,
    critBonus: 0,
    regenBonus: 0,
    description: "Lifesteal specialist",
    unlocked: false,
  },
  {
    id: "pirate",
    name: "Pirate Captain",
    unitType: UnitType.PIRATE_CAPTAIN,
    startingWeapon: SurvivorWeaponId.CATAPULT_STRIKE,
    hpBonus: 10,
    speedBonus: 0,
    areaBonus: 0,
    critBonus: 0.05,
    regenBonus: 0,
    description: "Explosive area damage dealer",
    unlocked: false,
  },
];
