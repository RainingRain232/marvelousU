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
  unlocked: boolean; // unlocked by default (free characters)
  unlockCost: number; // gold cost to unlock (0 = free)
  spawnQuotes: string[]; // said when spawning
  bossKillQuotes: string[]; // said when killing a boss
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
    unlockCost: 0,
    spawnQuotes: ["For honor and glory!", "My blade is ready.", "Let them come."],
    bossKillQuotes: ["Fall, beast!", "Another victory for the realm!", "That was a worthy foe."],
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
    unlockCost: 0,
    spawnQuotes: ["Arrows nocked and ready.", "I never miss.", "Swift as the wind."],
    bossKillQuotes: ["Bullseye.", "Not so tough after all.", "One arrow was all it took."],
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
    unlockCost: 0,
    spawnQuotes: ["Burn them all!", "Fire consumes everything.", "The flames obey me."],
    bossKillQuotes: ["Reduced to ashes!", "Feel the inferno!", "Nothing survives the flame."],
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
    unlocked: false,
    unlockCost: 200,
    spawnQuotes: ["The light protects.", "By the Lady's grace.", "I shall endure."],
    bossKillQuotes: ["The light prevails!", "Begone, darkness!", "Sanctified and purified."],
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
    unlockCost: 300,
    spawnQuotes: ["From the shadows...", "They won't see me coming.", "Quick and silent."],
    bossKillQuotes: ["Too slow.", "A clean kill.", "Should have watched your back."],
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
    unlockCost: 500,
    spawnQuotes: ["I am the wall.", "None shall pass!", "Steel and resolve."],
    bossKillQuotes: ["By Camelot's might!", "Your strength means nothing.", "The knight stands victorious."],
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
    unlockCost: 750,
    spawnQuotes: ["Death is just the beginning.", "Your soul is mine.", "I feast on the fallen."],
    bossKillQuotes: ["Your essence empowers me!", "Another soul claimed.", "Death comes for all."],
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
    unlockCost: 1000,
    spawnQuotes: ["Anchors aweigh!", "Fire the cannons!", "Yarr, let's plunder!"],
    bossKillQuotes: ["That's captain to you!", "Sunk to the depths!", "Another treasure claimed!"],
  },
];
