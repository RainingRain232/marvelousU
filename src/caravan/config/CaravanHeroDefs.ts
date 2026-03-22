// ---------------------------------------------------------------------------
// Caravan hero class definitions — 4 classes with unique stats and abilities
// ---------------------------------------------------------------------------

import { UnitType } from "@/types";

export type AbilityId = "war_cry" | "shield_bash" | "arrow_volley" | "fireball" | "heal_aura" | "holy_smite";

export interface AbilityDef {
  id: AbilityId;
  name: string;
  key: string;        // display key
  keyCode: string;    // actual KeyboardEvent.code
  cooldown: number;   // seconds
  description: string;
  color: number;       // UI color
}

export interface HeroClassDef {
  id: string;
  name: string;
  unitType: UnitType;
  hp: number;
  atk: number;
  speed: number;
  range: number;
  attackCooldown: number;
  abilities: AbilityDef[];
  description: string;
  color: number;
}

// ---------------------------------------------------------------------------
// Ability definitions
// ---------------------------------------------------------------------------

const ABILITY_WAR_CRY: AbilityDef = {
  id: "war_cry", name: "War Cry", key: "Q", keyCode: "KeyQ",
  cooldown: 12, description: "Buffs all escorts: +50% ATK for 5s",
  color: 0xff8844,
};

const ABILITY_SHIELD_BASH: AbilityDef = {
  id: "shield_bash", name: "Shield Bash", key: "E", keyCode: "KeyE",
  cooldown: 6, description: "AoE knockback + stun nearby enemies",
  color: 0x4488cc,
};

const ABILITY_ARROW_VOLLEY: AbilityDef = {
  id: "arrow_volley", name: "Arrow Volley", key: "Q", keyCode: "KeyQ",
  cooldown: 8, description: "Hit all enemies in range for 2x damage",
  color: 0x88cc44,
};

const ABILITY_FIREBALL: AbilityDef = {
  id: "fireball", name: "Fireball", key: "Q", keyCode: "KeyQ",
  cooldown: 7, description: "AoE explosion: 3x damage in small area",
  color: 0xff4422,
};

const ABILITY_HEAL_AURA: AbilityDef = {
  id: "heal_aura", name: "Heal Aura", key: "E", keyCode: "KeyE",
  cooldown: 15, description: "Heal caravan 50 HP + all escorts 30%",
  color: 0x44ff88,
};

const ABILITY_HOLY_SMITE: AbilityDef = {
  id: "holy_smite", name: "Holy Smite", key: "Q", keyCode: "KeyQ",
  cooldown: 10, description: "Massive single-target hit: 5x damage",
  color: 0xffdd44,
};

// ---------------------------------------------------------------------------
// Hero classes
// ---------------------------------------------------------------------------

export const HERO_CLASSES: HeroClassDef[] = [
  {
    id: "warrior",
    name: "Warrior",
    unitType: UnitType.KNIGHT,
    hp: 150, atk: 18, speed: 3.5, range: 1.8,
    attackCooldown: 0.5,
    abilities: [ABILITY_WAR_CRY, ABILITY_SHIELD_BASH],
    description: "Tanky melee fighter — buffs allies, controls crowds",
    color: 0xcc6633,
  },
  {
    id: "ranger",
    name: "Ranger",
    unitType: UnitType.LONGBOWMAN,
    hp: 90, atk: 22, speed: 4.5, range: 5.0,
    attackCooldown: 0.6,
    abilities: [ABILITY_ARROW_VOLLEY, ABILITY_SHIELD_BASH],
    description: "Fast ranged attacker — hits hard from distance",
    color: 0x44aa44,
  },
  {
    id: "mage",
    name: "Battlemage",
    unitType: UnitType.FIRE_MAGE,
    hp: 80, atk: 28, speed: 3.8, range: 4.0,
    attackCooldown: 0.7,
    abilities: [ABILITY_FIREBALL, ABILITY_HEAL_AURA],
    description: "Glass cannon — devastating AoE magic + healing",
    color: 0x6644cc,
  },
  {
    id: "paladin",
    name: "Paladin",
    unitType: UnitType.TEMPLAR,
    hp: 130, atk: 14, speed: 3.5, range: 1.5,
    attackCooldown: 0.45,
    abilities: [ABILITY_HOLY_SMITE, ABILITY_HEAL_AURA],
    description: "Holy warrior — sustain healing + burst damage",
    color: 0xddcc44,
  },
];
