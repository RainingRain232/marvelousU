// ---------------------------------------------------------------------------
// Fusion synergy definitions — weapon+passive combos that unlock a third effect
// ---------------------------------------------------------------------------

import { SurvivorWeaponId, SurvivorPassiveId } from "./SurvivorWeaponDefs";

export interface SurvivorFusionDef {
  id: string;
  name: string;
  description: string;
  requireWeapon: SurvivorWeaponId;
  requirePassive: SurvivorPassiveId;
  // Fusion effect key — checked by combat/movement systems
  fusionEffect: string;
  // Visual
  color: number;
  // Stat bonuses (stacked on top of base synergy bonuses)
  damageBonus: number;
  areaBonus: number;
  speedBonus: number;
}

export const FUSION_DEFS: SurvivorFusionDef[] = [
  {
    id: "fire_trail",
    name: "Fire Trail",
    description: "Fireball Ring + Swift Boots: leave a fire trail behind the player that damages enemies",
    requireWeapon: SurvivorWeaponId.FIREBALL_RING,
    requirePassive: SurvivorPassiveId.SWIFT_BOOTS,
    fusionEffect: "fire_trail",
    color: 0xff6600,
    damageBonus: 0.10,
    areaBonus: 0,
    speedBonus: 0,
  },
  {
    id: "ice_armor",
    name: "Ice Armor",
    description: "Ice Nova + Plate Armor: enemies that touch the player are frozen for 1s",
    requireWeapon: SurvivorWeaponId.ICE_NOVA,
    requirePassive: SurvivorPassiveId.PLATE_ARMOR,
    fusionEffect: "ice_armor",
    color: 0x88ccff,
    damageBonus: 0,
    areaBonus: 0.15,
    speedBonus: 0,
  },
  {
    id: "lightning_luck",
    name: "Lightning Luck",
    description: "Lightning Chain + Lucky Coin: crits chain an extra bolt to a nearby enemy",
    requireWeapon: SurvivorWeaponId.LIGHTNING_CHAIN,
    requirePassive: SurvivorPassiveId.LUCKY_COIN,
    fusionEffect: "lightning_luck",
    color: 0xaaddff,
    damageBonus: 0.15,
    areaBonus: 0,
    speedBonus: 0,
  },
  {
    id: "holy_magnet",
    name: "Holy Magnet",
    description: "Holy Circle + Magnet: XP gems within holy aura range are pulled toward the player",
    requireWeapon: SurvivorWeaponId.HOLY_CIRCLE,
    requirePassive: SurvivorPassiveId.MAGNET,
    fusionEffect: "holy_magnet",
    color: 0xffd700,
    damageBonus: 0,
    areaBonus: 0,
    speedBonus: 0,
  },
  {
    id: "soul_tome",
    name: "Soul Tome",
    description: "Soul Drain + Spell Tome: lifesteal beams hit 2 extra enemies",
    requireWeapon: SurvivorWeaponId.SOUL_DRAIN,
    requirePassive: SurvivorPassiveId.SPELL_TOME,
    fusionEffect: "soul_tome",
    color: 0x44ff88,
    damageBonus: 0.10,
    areaBonus: 0.20,
    speedBonus: 0,
  },
  {
    id: "arrow_crown",
    name: "Arrow Crown",
    description: "Arrow Volley + Crown: arrows grant bonus XP on kill",
    requireWeapon: SurvivorWeaponId.ARROW_VOLLEY,
    requirePassive: SurvivorPassiveId.CROWN,
    fusionEffect: "arrow_crown",
    color: 0xffcc44,
    damageBonus: 0.10,
    areaBonus: 0,
    speedBonus: 0,
  },
  {
    id: "warp_speed",
    name: "Warp Speed",
    description: "Warp Field + Swift Boots: warp teleports the player a short distance and damages enemies at destination",
    requireWeapon: SurvivorWeaponId.WARP_FIELD,
    requirePassive: SurvivorPassiveId.SWIFT_BOOTS,
    fusionEffect: "warp_speed",
    color: 0xbb66ee,
    damageBonus: 0.15,
    areaBonus: 0,
    speedBonus: 0.10,
  },
  {
    id: "rune_drum",
    name: "Rune Drum",
    description: "Rune Circle + War Drum: rune circles pulse faster, dealing damage twice",
    requireWeapon: SurvivorWeaponId.RUNE_CIRCLE,
    requirePassive: SurvivorPassiveId.WAR_DRUM,
    fusionEffect: "rune_drum",
    color: 0xff4488,
    damageBonus: 0.20,
    areaBonus: 0,
    speedBonus: 0,
  },
  {
    id: "blade_chalice",
    name: "Blade Chalice",
    description: "Spinning Blade + Chalice: blades heal the player for 2% of damage dealt",
    requireWeapon: SurvivorWeaponId.SPINNING_BLADE,
    requirePassive: SurvivorPassiveId.CHALICE,
    fusionEffect: "blade_chalice",
    color: 0x44ff44,
    damageBonus: 0,
    areaBonus: 0,
    speedBonus: 0,
  },
  {
    id: "catapult_armor",
    name: "Catapult Armor",
    description: "Catapult Strike + Plate Armor: boulders stun enemies for 1.5s on impact",
    requireWeapon: SurvivorWeaponId.CATAPULT_STRIKE,
    requirePassive: SurvivorPassiveId.PLATE_ARMOR,
    fusionEffect: "catapult_armor",
    color: 0x886644,
    damageBonus: 0.10,
    areaBonus: 0.10,
    speedBonus: 0,
  },
];
