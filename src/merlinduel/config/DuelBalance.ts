// ---------------------------------------------------------------------------
// Merlin's Duel — Balance constants
// ---------------------------------------------------------------------------

import { Element, SpellId } from "../types";
import type { Spell, Wizard, ShopItem } from "../types";

export const DUEL_BALANCE = {
  // Canvas & arena
  CANVAS_W: 800, CANVAS_H: 500,
  PLAYER_X: 100, ENEMY_X: 700,
  ARENA_TOP: 40, ARENA_BOTTOM: 460,
  WIZARD_RADIUS: 18,

  // Player defaults
  PLAYER_MAX_HP: 100,
  PLAYER_MAX_MANA: 100,
  PLAYER_MANA_REGEN: 8,          // per second
  PLAYER_MOVE_SPEED: 200,        // pixels per second
  SHIELD_DRAIN_RATE: 15,         // mana per second while shielding
  SHIELD_BLOCK_MULT: 0.3,        // damage multiplier when shielding

  // Countdown
  COUNTDOWN_DURATION: 3,

  // Projectile lifetime
  PROJECTILE_MAX_AGE: 5,

  // Gold & scoring
  GOLD_PER_ROUND: 30,
  SCORE_PER_ROUND: 100,
  SCORE_PER_HP: 1,
  SCORE_BONUS_FLAWLESS: 200,

  // Shards (meta currency)
  SHARDS_PER_WIN: 5,
  SHARDS_PER_ROUND: 1,

  // Screen effects
  SHAKE_DURATION: 0.2, SHAKE_INTENSITY: 5,
  FLASH_DURATION: 0.15,

  // Particle constants
  PARTICLE_COUNT_HIT: 8,
  PARTICLE_COUNT_DEATH: 20,
  PARTICLE_COUNT_SHIELD: 6,
  PARTICLE_LIFETIME: 0.6,

  // AI constants per difficulty tier
  AI_EASY: { castInterval: 2.0, dodgeChance: 0.1, reactionTime: 0.6 },
  AI_MEDIUM: { castInterval: 1.4, dodgeChance: 0.25, reactionTime: 0.4 },
  AI_HARD: { castInterval: 1.0, dodgeChance: 0.4, reactionTime: 0.25 },
  AI_BOSS: { castInterval: 0.7, dodgeChance: 0.5, reactionTime: 0.15 },

  // Element colors
  COLOR_FIRE: 0xff4400,
  COLOR_ICE: 0x44ccff,
  COLOR_LIGHTNING: 0xffdd44,
  COLOR_ARCANE: 0xaa44ff,

  // UI colors
  COLOR_BG: 0x1a1a2e,
  COLOR_ARENA_FLOOR: 0x222244,
  COLOR_HP_BAR: 0xcc2222,
  COLOR_MANA_BAR: 0x2244cc,
  COLOR_GOLD: 0xffd700,
  COLOR_SHIELD: 0x44aaff,
  COLOR_TEXT: 0xeeeeee,

  // Upgrade costs (per tier, index = current level)
  UPGRADE_COSTS: {
    maxHp: [20, 40, 80],
    manaRegen: [15, 30, 60],
    spellPower: [25, 50, 100],
    shieldEfficiency: [20, 40],
    startingGold: [10, 25, 50],
  } as Record<string, number[]>,

  // Upgrade values per tier
  UPGRADE_VALUES: {
    maxHp: 15,              // +15 max HP per tier
    manaRegen: 2,           // +2 mana/s per tier
    spellPower: 0.1,        // +10% spell power per tier
    shieldEfficiency: 0.15, // -15% shield drain per tier
    startingGold: 15,       // +15 starting gold per tier
  },
} as const;

// ---------------------------------------------------------------------------
// Spell definitions
// ---------------------------------------------------------------------------

export const SPELL_DEFS: Record<SpellId, Omit<Spell, "unlocked">> = {
  // Fire
  [SpellId.FIREBALL]:       { id: SpellId.FIREBALL,       element: Element.FIRE,      name: "Fireball",        damage: 18, manaCost: 15, speed: 320, size: 10, cooldown: 0.8 },
  [SpellId.FLAME_WAVE]:     { id: SpellId.FLAME_WAVE,     element: Element.FIRE,      name: "Flame Wave",      damage: 25, manaCost: 25, speed: 240, size: 18, cooldown: 1.5 },
  [SpellId.INFERNO]:        { id: SpellId.INFERNO,        element: Element.FIRE,      name: "Inferno",         damage: 40, manaCost: 45, speed: 200, size: 24, cooldown: 3.0 },
  // Ice
  [SpellId.ICE_SHARD]:      { id: SpellId.ICE_SHARD,      element: Element.ICE,       name: "Ice Shard",       damage: 12, manaCost: 10, speed: 380, size: 7,  cooldown: 0.5 },
  [SpellId.FROST_NOVA]:     { id: SpellId.FROST_NOVA,     element: Element.ICE,       name: "Frost Nova",      damage: 20, manaCost: 30, speed: 180, size: 22, cooldown: 2.0 },
  [SpellId.BLIZZARD]:       { id: SpellId.BLIZZARD,       element: Element.ICE,       name: "Blizzard",        damage: 35, manaCost: 40, speed: 160, size: 28, cooldown: 3.5 },
  // Lightning
  [SpellId.LIGHTNING_BOLT]:  { id: SpellId.LIGHTNING_BOLT, element: Element.LIGHTNING,  name: "Lightning Bolt",  damage: 15, manaCost: 12, speed: 500, size: 6,  cooldown: 0.6 },
  [SpellId.CHAIN_LIGHTNING]: { id: SpellId.CHAIN_LIGHTNING,element: Element.LIGHTNING,  name: "Chain Lightning",  damage: 22, manaCost: 28, speed: 420, size: 10, cooldown: 1.8 },
  [SpellId.THUNDERSTORM]:   { id: SpellId.THUNDERSTORM,   element: Element.LIGHTNING,  name: "Thunderstorm",    damage: 38, manaCost: 50, speed: 350, size: 20, cooldown: 3.2 },
  // Arcane
  [SpellId.ARCANE_MISSILE]: { id: SpellId.ARCANE_MISSILE, element: Element.ARCANE,    name: "Arcane Missile",  damage: 14, manaCost: 10, speed: 360, size: 6,  cooldown: 0.4 },
  [SpellId.MANA_BURST]:     { id: SpellId.MANA_BURST,     element: Element.ARCANE,    name: "Mana Burst",      damage: 28, manaCost: 35, speed: 280, size: 16, cooldown: 2.2 },
  [SpellId.VOID_BEAM]:      { id: SpellId.VOID_BEAM,      element: Element.ARCANE,    name: "Void Beam",       damage: 45, manaCost: 55, speed: 260, size: 14, cooldown: 4.0 },
};

// ---------------------------------------------------------------------------
// Tournament opponents (8 rounds)
// ---------------------------------------------------------------------------

export const OPPONENTS: Wizard[] = [
  {
    x: 700, y: 250, hp: 80, maxHp: 80, mana: 60, maxMana: 60, manaRegen: 5,
    name: "Pip", title: "the Apprentice", color: 0x44aa44,
    spells: [SpellId.FIREBALL, SpellId.ICE_SHARD],
    castInterval: 2.2, dodgeChance: 0.05, reactionTime: 0.7, defeated: false,
  },
  {
    x: 700, y: 250, hp: 100, maxHp: 100, mana: 70, maxMana: 70, manaRegen: 6,
    name: "Elara", title: "the Frost Witch", color: 0x44ccff,
    spells: [SpellId.ICE_SHARD, SpellId.FROST_NOVA],
    castInterval: 1.8, dodgeChance: 0.12, reactionTime: 0.55, defeated: false,
  },
  {
    x: 700, y: 250, hp: 110, maxHp: 110, mana: 80, maxMana: 80, manaRegen: 7,
    name: "Ragnar", title: "the Storm Caller", color: 0xffdd44,
    spells: [SpellId.LIGHTNING_BOLT, SpellId.CHAIN_LIGHTNING],
    castInterval: 1.5, dodgeChance: 0.18, reactionTime: 0.45, defeated: false,
  },
  {
    x: 700, y: 250, hp: 120, maxHp: 120, mana: 90, maxMana: 90, manaRegen: 8,
    name: "Vex", title: "the Flame Lord", color: 0xff6622,
    spells: [SpellId.FIREBALL, SpellId.FLAME_WAVE, SpellId.INFERNO],
    castInterval: 1.3, dodgeChance: 0.22, reactionTime: 0.38, defeated: false,
  },
  {
    x: 700, y: 250, hp: 140, maxHp: 140, mana: 100, maxMana: 100, manaRegen: 9,
    name: "Isolde", title: "the Arcane Sage", color: 0xaa44ff,
    spells: [SpellId.ARCANE_MISSILE, SpellId.MANA_BURST, SpellId.FROST_NOVA],
    castInterval: 1.1, dodgeChance: 0.28, reactionTime: 0.32, defeated: false,
  },
  {
    x: 700, y: 250, hp: 160, maxHp: 160, mana: 110, maxMana: 110, manaRegen: 10,
    name: "Draven", title: "the Void Walker", color: 0x8833cc,
    spells: [SpellId.VOID_BEAM, SpellId.ARCANE_MISSILE, SpellId.CHAIN_LIGHTNING],
    castInterval: 0.95, dodgeChance: 0.35, reactionTime: 0.28, defeated: false,
  },
  {
    x: 700, y: 250, hp: 180, maxHp: 180, mana: 120, maxMana: 120, manaRegen: 12,
    name: "Morgath", title: "the Blizzard King", color: 0x2288cc,
    spells: [SpellId.BLIZZARD, SpellId.FROST_NOVA, SpellId.THUNDERSTORM],
    castInterval: 0.8, dodgeChance: 0.42, reactionTime: 0.2, defeated: false,
  },
  {
    x: 700, y: 250, hp: 220, maxHp: 220, mana: 150, maxMana: 150, manaRegen: 14,
    name: "Mordred", title: "the Dark Sorcerer", color: 0xcc1144,
    spells: [SpellId.INFERNO, SpellId.THUNDERSTORM, SpellId.VOID_BEAM, SpellId.BLIZZARD],
    castInterval: 0.65, dodgeChance: 0.5, reactionTime: 0.12, defeated: false,
  },
];

// ---------------------------------------------------------------------------
// Shop items
// ---------------------------------------------------------------------------

export const SHOP_ITEMS: ShopItem[] = [
  { name: "Health Potion",    description: "Restore 30 HP",            cost: 20, apply: "healHp" },
  { name: "Mana Crystal",     description: "+20 max mana",             cost: 35, apply: "maxMana" },
  { name: "Spell Tome",       description: "+10% spell power",         cost: 40, apply: "spellPower" },
  { name: "Arcane Shield",    description: "-15% shield drain",        cost: 30, apply: "shieldEff" },
  { name: "Mana Spring",      description: "+3 mana regen/s",          cost: 35, apply: "manaRegen" },
  { name: "Vitality Rune",    description: "+20 max HP",               cost: 30, apply: "maxHpUp" },
  { name: "Focus Gem",        description: "-10% cooldowns",           cost: 45, apply: "cooldownReduce" },
  { name: "Barrier Charm",    description: "Shield blocks +10% more",  cost: 25, apply: "shieldBlock" },
];

// ---------------------------------------------------------------------------
// Element color helper
// ---------------------------------------------------------------------------

export function getElementColor(el: Element): number {
  switch (el) {
    case Element.FIRE: return DUEL_BALANCE.COLOR_FIRE;
    case Element.ICE: return DUEL_BALANCE.COLOR_ICE;
    case Element.LIGHTNING: return DUEL_BALANCE.COLOR_LIGHTNING;
    case Element.ARCANE: return DUEL_BALANCE.COLOR_ARCANE;
  }
}
