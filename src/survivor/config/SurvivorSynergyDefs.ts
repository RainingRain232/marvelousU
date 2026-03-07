// ---------------------------------------------------------------------------
// Weapon synergy definitions — bonuses for specific weapon/passive combos
// ---------------------------------------------------------------------------

import { SurvivorWeaponId, SurvivorPassiveId } from "./SurvivorWeaponDefs";

export interface SurvivorSynergyDef {
  id: string;
  name: string;
  description: string;
  requireWeapons: SurvivorWeaponId[];
  requirePassives: SurvivorPassiveId[];
  // Effects
  damageBonus: number;   // percentage bonus to all weapons
  areaBonus: number;     // percentage bonus
  cooldownReduction: number; // percentage reduction
  specialEffect: string | null; // checked by combat system
}

export const SYNERGY_DEFS: SurvivorSynergyDef[] = [
  {
    id: "fire_and_ice",
    name: "Fire & Ice",
    description: "Fireball + Ice Nova: +25% damage to both",
    requireWeapons: [SurvivorWeaponId.FIREBALL_RING, SurvivorWeaponId.ICE_NOVA],
    requirePassives: [],
    damageBonus: 0.25,
    areaBonus: 0,
    cooldownReduction: 0,
    specialEffect: null,
  },
  {
    id: "storm_of_blades",
    name: "Storm of Blades",
    description: "Spinning Blade + Arrow Volley: +2 arrow count",
    requireWeapons: [SurvivorWeaponId.SPINNING_BLADE, SurvivorWeaponId.ARROW_VOLLEY],
    requirePassives: [],
    damageBonus: 0,
    areaBonus: 0,
    cooldownReduction: 0,
    specialEffect: "storm_of_blades",
  },
  {
    id: "dark_arts",
    name: "Dark Arts",
    description: "Soul Drain + Warp Field: +50% lifesteal",
    requireWeapons: [SurvivorWeaponId.SOUL_DRAIN, SurvivorWeaponId.WARP_FIELD],
    requirePassives: [],
    damageBonus: 0,
    areaBonus: 0,
    cooldownReduction: 0,
    specialEffect: "dark_arts",
  },
  {
    id: "holy_arsenal",
    name: "Holy Arsenal",
    description: "Holy Circle + Chalice: +30% area",
    requireWeapons: [SurvivorWeaponId.HOLY_CIRCLE],
    requirePassives: [SurvivorPassiveId.CHALICE],
    damageBonus: 0,
    areaBonus: 0.30,
    cooldownReduction: 0,
    specialEffect: null,
  },
  {
    id: "thunder_strike",
    name: "Thunder Strike",
    description: "Lightning Chain + Catapult Strike: +20% damage",
    requireWeapons: [SurvivorWeaponId.LIGHTNING_CHAIN, SurvivorWeaponId.CATAPULT_STRIKE],
    requirePassives: [],
    damageBonus: 0.20,
    areaBonus: 0,
    cooldownReduction: 0,
    specialEffect: null,
  },
  {
    id: "arcane_lifesteal",
    name: "Arcane Lifesteal",
    description: "Rune Circle + Soul Drain: rune hits heal",
    requireWeapons: [SurvivorWeaponId.RUNE_CIRCLE, SurvivorWeaponId.SOUL_DRAIN],
    requirePassives: [],
    damageBonus: 0,
    areaBonus: 0,
    cooldownReduction: 0,
    specialEffect: "arcane_lifesteal",
  },
];
