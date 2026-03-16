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

  // ---------------------------------------------------------------------------
  // Weapon + Weapon combo synergies
  // ---------------------------------------------------------------------------
  {
    id: "steam_burst",
    name: "Steam Burst",
    description: "Fireball Ring + Ice Nova: fire and ice collide, creating a steam burst AoE (+30% area, +15% damage)",
    requireWeapons: [SurvivorWeaponId.FIREBALL_RING, SurvivorWeaponId.ICE_NOVA],
    requirePassives: [],
    damageBonus: 0.15,
    areaBonus: 0.30,
    cooldownReduction: 0,
    specialEffect: "steam_burst",
  },
  {
    id: "chain_deluge",
    name: "Chain Deluge",
    description: "Lightning Chain + Ice Nova: chain lightning spreads further through frozen enemies (+40% area)",
    requireWeapons: [SurvivorWeaponId.LIGHTNING_CHAIN, SurvivorWeaponId.ICE_NOVA],
    requirePassives: [],
    damageBonus: 0.10,
    areaBonus: 0.40,
    cooldownReduction: 0,
    specialEffect: "chain_deluge",
  },
  {
    id: "twilight_beam",
    name: "Twilight Beam",
    description: "Holy Circle + Soul Drain: holy light and dark energy merge into a devastating twilight burst (+35% damage)",
    requireWeapons: [SurvivorWeaponId.HOLY_CIRCLE, SurvivorWeaponId.SOUL_DRAIN],
    requirePassives: [],
    damageBonus: 0.35,
    areaBonus: 0,
    cooldownReduction: 0,
    specialEffect: "twilight_beam",
  },
  {
    id: "meteor_lightning",
    name: "Thunderstrike Barrage",
    description: "Catapult Strike + Lightning Chain: boulders call down lightning on impact (+20% damage, +15% area)",
    requireWeapons: [SurvivorWeaponId.CATAPULT_STRIKE, SurvivorWeaponId.LIGHTNING_CHAIN],
    requirePassives: [],
    damageBonus: 0.20,
    areaBonus: 0.15,
    cooldownReduction: 0,
    specialEffect: "meteor_lightning",
  },
  {
    id: "void_blades",
    name: "Void Blades",
    description: "Spinning Blade + Warp Field: blades phase through dimensions, ignoring enemy positioning (+25% damage, -15% cooldown)",
    requireWeapons: [SurvivorWeaponId.SPINNING_BLADE, SurvivorWeaponId.WARP_FIELD],
    requirePassives: [],
    damageBonus: 0.25,
    areaBonus: 0,
    cooldownReduction: 0.15,
    specialEffect: "void_blades",
  },
  {
    id: "rune_volley",
    name: "Rune Volley",
    description: "Arrow Volley + Rune Circle: arrows leave rune marks where they land, dealing bonus AoE (+20% area, +10% damage)",
    requireWeapons: [SurvivorWeaponId.ARROW_VOLLEY, SurvivorWeaponId.RUNE_CIRCLE],
    requirePassives: [],
    damageBonus: 0.10,
    areaBonus: 0.20,
    cooldownReduction: 0,
    specialEffect: "rune_volley",
  },
];
