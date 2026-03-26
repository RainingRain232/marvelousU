// ---------------------------------------------------------------------------
// SWORD OF AVALON — 2D Swordfighting Game  (v3 — Ultimate Tournament Edition)
// Deep skeletal-animation combat: parries, ripostes, combos, stances, dodge
// rolls, kicks, bleed DOT, stamina, shields, slow-mo kill-cam, tournament of
// 8 unique knights with between-round shop, blood decals, damage numbers,
// crowd reactions, capes, plumes, super meter, wall splats, aerial combat,
// dynamic torchlight, procedural music, guard break VFX, perfect parries,
// hit flashes, feints, whiff punish AI, and smarter AI.
// ---------------------------------------------------------------------------

import { viewManager } from "../view/ViewManager";
import { audioManager } from "../audio/AudioManager";

// ── Constants ────────────────────────────────────────────────────────────────

const HEALTH_MAX = 100;
const STAMINA_MAX = 100;
const GRAVITY = 0.6;
const MOVE_SPEED = 3.5;
const JUMP_FORCE = -12;
const DODGE_SPEED = 10;
const DODGE_FRAMES = 18;
const PARRY_WINDOW = 10;
const RIPOSTE_WINDOW = 20; // frames after successful parry where riposte is available
const COMBO_WINDOW = 25;
const HITSTOP_FRAMES = 6;
const GROUND_Y_RATIO = 0.78;
const KICK_DAMAGE = 5;
const KICK_STAMINA = 15;
const KICK_RANGE = 65;
const BLEED_DPS = 0.15; // per frame
const BLEED_DURATION = 120; // frames
const SLOWMO_DURATION = 60; // frames
const SLOWMO_SCALE = 0.2;
const SUPER_METER_MAX = 100;
const WALL_LEFT = 80;
const WALL_RIGHT_OFFSET = 80;

interface AttackDef {
  damage: number;
  stamina: number;
  windup: number;
  active: number;
  recovery: number;
  reach: number;
  arc: number;
  canBleed?: boolean;
}

const ATTACKS: Record<string, AttackDef> = {
  slash:    { damage: 12, stamina: 12, windup: 10, active: 6, recovery: 12, reach: 70, arc: 1.2, canBleed: true },
  thrust:   { damage: 16, stamina: 15, windup: 14, active: 5, recovery: 14, reach: 85, arc: 0.3 },
  overhead: { damage: 22, stamina: 20, windup: 18, active: 6, recovery: 16, reach: 65, arc: 1.5, canBleed: true },
  sweep:    { damage: 10, stamina: 10, windup: 8,  active: 8, recovery: 10, reach: 75, arc: 1.0 },
  riposte:  { damage: 28, stamina: 5,  windup: 4,  active: 5, recovery: 10, reach: 75, arc: 1.0 },
  kick:     { damage: KICK_DAMAGE, stamina: KICK_STAMINA, windup: 6, active: 4, recovery: 10, reach: KICK_RANGE, arc: 0.5 },
  airSlash: { damage: 14, stamina: 14, windup: 6,  active: 6, recovery: 8, reach: 75, arc: 1.3 },
  excalibur:{ damage: 40, stamina: 0,  windup: 12, active: 8, recovery: 14, reach: 90, arc: 1.8 },
  chargedSlash: { damage: 24, stamina: 25, windup: 3, active: 6, recovery: 14, reach: 75, arc: 1.4, canBleed: true },
  grab:     { damage: 15, stamina: 18, windup: 8, active: 6, recovery: 12, reach: 40, arc: 0.5 },
  dashAttack: { damage: 14, stamina: 16, windup: 4, active: 5, recovery: 12, reach: 80, arc: 1.0, canBleed: true },
};

interface StanceDef {
  dmgMul: number;
  defMul: number;
  spdMul: number;
  staminaRegen: number;
  color: string;
}

const STANCES: Record<string, StanceDef> = {
  aggressive: { dmgMul: 1.3, defMul: 0.7, spdMul: 1.15, staminaRegen: 0.25, color: "#c04040" },
  balanced:   { dmgMul: 1.0, defMul: 1.0, spdMul: 1.0,  staminaRegen: 0.4,  color: "#d4a843" },
  defensive:  { dmgMul: 0.7, defMul: 1.4, spdMul: 0.85, staminaRegen: 0.55, color: "#4080c0" },
};

interface WeaponDef {
  id: string;
  name: string;
  desc: string;
  damageMul: number;
  speedMul: number;
  reachMul: number;
  staminaMul: number;
  bleedChance: number;
  color: string;
  length: number;
}

const WEAPONS: WeaponDef[] = [
  { id: "longsword", name: "Longsword", desc: "Balanced blade. Jack of all trades.", damageMul: 1.0, speedMul: 1.0, reachMul: 1.0, staminaMul: 1.0, bleedChance: 0, color: "#c8c8d0", length: 1.0 },
  { id: "greatsword", name: "Greatsword", desc: "Massive two-hander. Slow but devastating.", damageMul: 1.4, speedMul: 1.35, reachMul: 1.2, staminaMul: 1.3, bleedChance: 0.1, color: "#aaaabc", length: 1.3 },
  { id: "rapier", name: "Rapier", desc: "Lightning-fast thrusts. Low damage per hit.", damageMul: 0.7, speedMul: 0.65, reachMul: 1.1, staminaMul: 0.7, bleedChance: 0, color: "#d0d0e8", length: 1.1 },
  { id: "scimitar", name: "Scimitar", desc: "Curved blade. Fast slashes that bleed.", damageMul: 0.9, speedMul: 0.8, reachMul: 0.95, staminaMul: 0.85, bleedChance: 0.25, color: "#d4b870", length: 0.95 },
  { id: "flamberge", name: "Flamberge", desc: "Wavy blade. Disrupts blocks, high bleed.", damageMul: 1.15, speedMul: 1.1, reachMul: 1.05, staminaMul: 1.1, bleedChance: 0.35, color: "#cc6644", length: 1.05 },
];

interface ComboDef {
  name: string;
  dmgBonus: number;
  effect: string;
}

const COMBOS: Record<string, ComboDef> = {
  "slash,slash,thrust":   { name: "LANCELOT FURY",  dmgBonus: 1.5, effect: "stagger" },
  "slash,overhead":       { name: "DRAGON STRIKE",   dmgBonus: 1.8, effect: "knockback" },
  "thrust,thrust,slash":  { name: "SERPENT FANG",    dmgBonus: 1.4, effect: "stagger" },
  "sweep,slash,overhead": { name: "AVALON WRATH",    dmgBonus: 2.0, effect: "knockdown" },
  "slash,slash,slash":    { name: "TRIPLE EDGE",     dmgBonus: 1.3, effect: "none" },
  "thrust,sweep":         { name: "VIPER SWEEP",     dmgBonus: 1.4, effect: "stagger" },
  "overhead,sweep":       { name: "CRUSHING TIDE",   dmgBonus: 1.6, effect: "knockback" },
  "kick,overhead":        { name: "BOOT & BLADE",    dmgBonus: 1.7, effect: "knockdown" },
  "slash,kick,thrust":    { name: "GALAHAD RUSH",    dmgBonus: 1.5, effect: "stagger" },
  "feint,slash":          { name: "DECEPTIVE EDGE",  dmgBonus: 1.4, effect: "stagger" },
  "feint,thrust":         { name: "PHANTOM LUNGE",   dmgBonus: 1.5, effect: "stagger" },
};

// ── Enemy Definitions (Tournament) ──────────────────────────────────────────

interface EnemyDef {
  name: string;
  title: string;
  color: string;
  armorColor: string;
  swordColor: string;
  plumeColor: string;
  hp: number;
  damage: number;
  aggression: number;
  parrySkill: number;
  speed: number;
  taunt: string;
  defeated: string;
  ability: string;
  abilityDesc: string;
  taunts?: string[];
  lowHpLine?: string;
  playerLowHpLine?: string;
  barks?: string[];
}

const ENEMIES: EnemyDef[] = [
  {
    name: "SIR CEDRIC", title: "the Green",
    color: "#3a6a3a", armorColor: "#2a4a2a", swordColor: "#999", plumeColor: "#4a8a4a",
    hp: 80, damage: 0.8, aggression: 0.3, parrySkill: 0.05, speed: 0.85,
    taunt: "A practice bout, nothing more!",
    defeated: "I yield... you are swift indeed.",
    ability: "none", abilityDesc: "",
    taunts: ["Not bad, for a beginner!", "Hold still!"],
    lowHpLine: "You... are better than I thought...",
    playerLowHpLine: "Give up now, save yourself!",
    barks: ["Not bad...", "Ha! Got you!", "Decent form!"],
  },
  {
    name: "SIR GALETH", title: "the Duelist",
    color: "#4466aa", armorColor: "#334488", swordColor: "#8899cc", plumeColor: "#5577bb",
    hp: 85, damage: 0.85, aggression: 0.45, parrySkill: 0.15, speed: 0.95,
    taunt: "En garde! Show me your technique.",
    defeated: "A true duelist acknowledges defeat.",
    ability: "counterStrike", abilityDesc: "COUNTER STRIKE \u2014 attacks faster after being hit",
    taunts: ["Predictable.", "Too slow!"],
    lowHpLine: "A worthy opponent... at last.",
    playerLowHpLine: "Your form falters!",
    barks: ["You're wide open!", "Textbook!", "Impressive parry..."],
  },
  {
    name: "SIR HECTOR", title: "Ironside",
    color: "#556", armorColor: "#445", swordColor: "#aab", plumeColor: "#667",
    hp: 120, damage: 0.9, aggression: 0.4, parrySkill: 0.1, speed: 0.75,
    taunt: "My armor is forged from mountain ore. Strike all you wish.",
    defeated: "Iron bends before the Lake Knight...",
    ability: "ironSkin", abilityDesc: "IRON SKIN \u2014 takes 30% reduced damage",
    taunts: ["Your blade cannot pierce me.", "Futile."],
    lowHpLine: "Impossible... my armor...",
    playerLowHpLine: "Crumble before iron!",
    barks: ["Is that all?", "Feel the weight of iron!", "Hmph."],
  },
  {
    name: "LADY ISOLDE", title: "Thornblade",
    color: "#8a3366", armorColor: "#5a2244", swordColor: "#dd5588", plumeColor: "#cc4477",
    hp: 90, damage: 1.1, aggression: 0.6, parrySkill: 0.2, speed: 1.1,
    taunt: "My blade carries poison and grace in equal measure.",
    defeated: "Graceful... you have bested the Thorn.",
    ability: "poison", abilityDesc: "VENOM EDGE \u2014 hits inflict bleeding",
    taunts: ["Feel the sting?", "Graceful, aren't I?"],
    lowHpLine: "The thorn... wilts...",
    playerLowHpLine: "The venom takes hold!",
    barks: ["The thorn pricks deep!", "Taste my venom!", "Quick hands..."],
  },
  {
    name: "SIR AGRAVAIN", title: "the Shadow",
    color: "#333", armorColor: "#222", swordColor: "#556", plumeColor: "#444",
    hp: 95, damage: 1.2, aggression: 0.7, parrySkill: 0.3, speed: 1.15,
    taunt: "You cannot strike what you cannot see.",
    defeated: "The shadows... recede.",
    ability: "shadowStep", abilityDesc: "SHADOW STEP \u2014 teleports behind you after dodging",
    taunts: ["Where am I now?", "You cannot follow."],
    lowHpLine: "The shadows... betray me...",
    playerLowHpLine: "You cannot escape the dark!",
    barks: ["Behind you.", "From the shadows!", "You saw that?"],
  },
  {
    name: "THE CRIMSON KNIGHT", title: "of the Blood Order",
    color: "#881111", armorColor: "#550808", swordColor: "#cc4444", plumeColor: "#aa2222",
    hp: 110, damage: 1.15, aggression: 0.55, parrySkill: 0.25, speed: 0.9,
    taunt: "Your blood will sustain me.",
    defeated: "The blood... runs cold.",
    ability: "lifesteal", abilityDesc: "BLOOD OATH \u2014 heals from damage dealt",
    taunts: ["Your pain feeds me.", "Bleed for me."],
    lowHpLine: "I need... more blood...",
    playerLowHpLine: "Your life force fades!",
    barks: ["Your blood feeds me!", "Delicious!", "Unwise."],
  },
  {
    name: "LADY MORGANA", title: "the Enchantress",
    color: "#6622aa", armorColor: "#441188", swordColor: "#aa66ff", plumeColor: "#8844cc",
    hp: 100, damage: 1.25, aggression: 0.6, parrySkill: 0.35, speed: 1.05,
    taunt: "Reality bends to my will.",
    defeated: "The illusion... shatters.",
    ability: "mirrorImage", abilityDesc: "MIRROR IMAGE \u2014 creates illusory doubles",
    taunts: ["Which is real?", "Illusion or blade?"],
    lowHpLine: "The enchantment... fades...",
    playerLowHpLine: "You see only what I allow!",
    barks: ["Which one is real?", "Magic stings!", "Clever..."],
  },
  {
    name: "THE BLACK KNIGHT", title: "of the Abyss",
    color: "#1a1a1a", armorColor: "#0a0a15", swordColor: "#8888a0", plumeColor: "#600",
    hp: 130, damage: 1.3, aggression: 0.65, parrySkill: 0.4, speed: 1.0,
    taunt: "None shall pass. None have ever passed.",
    defeated: "At last... I am freed from this curse.",
    ability: "rage", abilityDesc: "DARK FURY \u2014 faster and harder hitting below 40% HP",
    taunts: ["Kneel.", "You are nothing."],
    lowHpLine: "The abyss... calls me back...",
    playerLowHpLine: "Submit to the void!",
    barks: ["Kneel.", "DARKNESS!", "...impossible."],
  },
];

// ── Shop Items ──────────────────────────────────────────────────────────────

interface ShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  oneTime: boolean;
  apply: (game: SwordOfAvalonGame) => void;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: "heal", name: "Healing Draught", desc: "Restore 40 HP", cost: 30, oneTime: false,
    apply: (g) => { g["_player"].hp = Math.min(HEALTH_MAX, g["_player"].hp + 40); } },
  { id: "fullheal", name: "Elixir of Life", desc: "Fully restore HP", cost: 60, oneTime: false,
    apply: (g) => { g["_player"].hp = HEALTH_MAX; } },
  { id: "staminaUp", name: "Endurance Rune", desc: "+15% stamina regen (permanent)", cost: 80, oneTime: true,
    apply: (g) => { g["_bonusStaminaRegen"] += 0.06; } },
  { id: "damageUp", name: "Whetstone of Fury", desc: "+10% damage (permanent)", cost: 100, oneTime: true,
    apply: (g) => { g["_bonusDamage"] += 0.1; } },
  { id: "armorUp", name: "Reinforced Mail", desc: "+15% defense (permanent)", cost: 90, oneTime: true,
    apply: (g) => { g["_bonusDefense"] += 0.15; } },
  { id: "bleedChance", name: "Serrated Edge", desc: "All attacks can bleed (permanent)", cost: 120, oneTime: true,
    apply: (g) => { g["_allCanBleed"] = true; } },
  { id: "superCharge", name: "Chalice of Valor", desc: "Start each round with 30% super meter", cost: 100, oneTime: true,
    apply: (g) => { g["_startingSuperMeter"] = 30; } },
  { id: "perfectParry", name: "Templar's Blessing", desc: "Perfect parry window +50% wider", cost: 110, oneTime: true,
    apply: (g) => { g["_bonusPerfectWindow"] = 2; } },
  { id: "enchantFire", name: "Flame Enchant", desc: "Attacks ignite enemies (fire DOT)", cost: 150, oneTime: true,
    apply: (g) => { g["_weaponEnchant"] = "fire"; } },
  { id: "enchantIce", name: "Frost Enchant", desc: "Attacks slow enemy movement 30%", cost: 140, oneTime: true,
    apply: (g) => { g["_weaponEnchant"] = "ice"; } },
  { id: "enchantPoison", name: "Venom Enchant", desc: "Attacks apply poison (stacking DOT)", cost: 130, oneTime: true,
    apply: (g) => { g["_weaponEnchant"] = "poison"; } },
  { id: "enchantHoly", name: "Holy Enchant", desc: "Attacks deal +25% to undead/dark enemies", cost: 120, oneTime: true,
    apply: (g) => { g["_weaponEnchant"] = "holy"; } },
];

// ── Skeleton ─────────────────────────────────────────────────────────────────

const J = {
  PELVIS: 0, SPINE: 1, CHEST: 2, NECK: 3, HEAD: 4,
  L_SHOULDER: 5, L_UPPER_ARM: 6, L_FOREARM: 7, L_HAND: 8,
  R_SHOULDER: 9, R_UPPER_ARM: 10, R_FOREARM: 11, R_HAND: 12,
  L_HIP: 13, L_THIGH: 14, L_SHIN: 15, L_FOOT: 16,
  R_HIP: 17, R_THIGH: 18, R_SHIN: 19, R_FOOT: 20,
} as const;

const JOINT_COUNT = 21;

const BONE_DEF: [number, number, number][] = [];
BONE_DEF[J.PELVIS]      = [-1, 0, 0];
BONE_DEF[J.SPINE]       = [J.PELVIS, 18, -Math.PI / 2];
BONE_DEF[J.CHEST]       = [J.SPINE, 18, 0];
BONE_DEF[J.NECK]        = [J.CHEST, 10, 0];
BONE_DEF[J.HEAD]        = [J.NECK, 12, 0];
BONE_DEF[J.L_SHOULDER]  = [J.CHEST, 8, Math.PI * 0.8];
BONE_DEF[J.L_UPPER_ARM] = [J.L_SHOULDER, 22, 0.3];
BONE_DEF[J.L_FOREARM]   = [J.L_UPPER_ARM, 20, 0.5];
BONE_DEF[J.L_HAND]      = [J.L_FOREARM, 8, 0];
BONE_DEF[J.R_SHOULDER]  = [J.CHEST, 8, -Math.PI * 0.8];
BONE_DEF[J.R_UPPER_ARM] = [J.R_SHOULDER, 22, -0.3];
BONE_DEF[J.R_FOREARM]   = [J.R_UPPER_ARM, 20, -0.5];
BONE_DEF[J.R_HAND]      = [J.R_FOREARM, 8, 0];
BONE_DEF[J.L_HIP]       = [J.PELVIS, 10, Math.PI / 2 + 0.2];
BONE_DEF[J.L_THIGH]     = [J.L_HIP, 26, 0.1];
BONE_DEF[J.L_SHIN]      = [J.L_THIGH, 24, 0.1];
BONE_DEF[J.L_FOOT]      = [J.L_SHIN, 10, 0.8];
BONE_DEF[J.R_HIP]       = [J.PELVIS, 10, Math.PI / 2 - 0.2];
BONE_DEF[J.R_THIGH]     = [J.R_HIP, 26, -0.1];
BONE_DEF[J.R_SHIN]      = [J.R_THIGH, 24, -0.1];
BONE_DEF[J.R_FOOT]      = [J.R_SHIN, 10, -0.8];

// ── Poses ────────────────────────────────────────────────────────────────────

function makePose(overrides: Record<number, number>): Float64Array {
  const p = new Float64Array(JOINT_COUNT);
  for (const [j, a] of Object.entries(overrides)) p[parseInt(j)] = a;
  return p;
}

const POSES: Record<string, Float64Array> = {
  idle_balanced: makePose({
    [J.SPINE]: 0.05, [J.CHEST]: -0.05, [J.HEAD]: 0.05,
    [J.R_UPPER_ARM]: 0.4, [J.R_FOREARM]: -0.8, [J.R_HAND]: -0.2,
    [J.L_UPPER_ARM]: -0.2, [J.L_FOREARM]: 0.4,
  }),
  idle_aggressive: makePose({
    [J.SPINE]: 0.15, [J.CHEST]: -0.1, [J.HEAD]: 0.1,
    [J.R_UPPER_ARM]: 0.2, [J.R_FOREARM]: -0.5, [J.R_HAND]: -0.3,
    [J.L_UPPER_ARM]: -0.4, [J.L_FOREARM]: 0.6,
  }),
  idle_defensive: makePose({
    [J.SPINE]: -0.1, [J.CHEST]: 0.05, [J.HEAD]: 0,
    [J.R_UPPER_ARM]: 0.7, [J.R_FOREARM]: -1.2, [J.R_HAND]: 0.1,
    [J.L_UPPER_ARM]: 0.1, [J.L_FOREARM]: 0.2,
    [J.L_THIGH]: 0.15, [J.R_THIGH]: -0.15,
  }),
  walk1: makePose({
    [J.L_THIGH]: -0.4, [J.L_SHIN]: 0.3, [J.R_THIGH]: 0.4, [J.R_SHIN]: -0.1,
    [J.SPINE]: 0.05, [J.L_UPPER_ARM]: 0.2, [J.R_UPPER_ARM]: 0.4,
  }),
  walk2: makePose({
    [J.L_THIGH]: 0.4, [J.L_SHIN]: -0.1, [J.R_THIGH]: -0.4, [J.R_SHIN]: 0.3,
    [J.SPINE]: 0.05, [J.L_UPPER_ARM]: -0.1, [J.R_UPPER_ARM]: 0.5,
  }),
  slash_windup: makePose({
    [J.CHEST]: -0.3, [J.SPINE]: -0.15,
    [J.R_UPPER_ARM]: -1.2, [J.R_FOREARM]: -0.4, [J.R_HAND]: -0.3,
    [J.L_UPPER_ARM]: 0.3, [J.L_FOREARM]: 0.8,
  }),
  slash_active: makePose({
    [J.CHEST]: 0.4, [J.SPINE]: 0.2,
    [J.R_UPPER_ARM]: 1.0, [J.R_FOREARM]: 0.2, [J.R_HAND]: 0.1,
    [J.L_UPPER_ARM]: -0.3, [J.L_FOREARM]: 0.3,
  }),
  slash_recovery: makePose({
    [J.CHEST]: 0.2, [J.SPINE]: 0.1,
    [J.R_UPPER_ARM]: 0.8, [J.R_FOREARM]: -0.2,
    [J.L_UPPER_ARM]: -0.1, [J.L_FOREARM]: 0.3,
  }),
  thrust_windup: makePose({
    [J.CHEST]: -0.2, [J.SPINE]: -0.1,
    [J.R_UPPER_ARM]: -0.3, [J.R_FOREARM]: -1.5, [J.R_HAND]: 0,
    [J.L_UPPER_ARM]: 0.4, [J.L_FOREARM]: 0.9,
    [J.R_THIGH]: -0.2, [J.L_THIGH]: 0.2,
  }),
  thrust_active: makePose({
    [J.CHEST]: 0.15, [J.SPINE]: 0.15,
    [J.R_UPPER_ARM]: 0.1, [J.R_FOREARM]: -0.1, [J.R_HAND]: 0,
    [J.L_UPPER_ARM]: -0.5, [J.L_FOREARM]: 0.2,
    [J.R_THIGH]: 0.1, [J.L_THIGH]: -0.15,
  }),
  thrust_recovery: makePose({
    [J.CHEST]: 0.1, [J.R_UPPER_ARM]: 0.3, [J.R_FOREARM]: -0.4,
  }),
  overhead_windup: makePose({
    [J.CHEST]: -0.4, [J.SPINE]: -0.2,
    [J.R_UPPER_ARM]: -1.8, [J.R_FOREARM]: -1.0, [J.R_HAND]: -0.5,
    [J.L_UPPER_ARM]: -0.5, [J.L_FOREARM]: 0.3,
    [J.L_THIGH]: 0.2, [J.R_THIGH]: -0.2,
  }),
  overhead_active: makePose({
    [J.CHEST]: 0.5, [J.SPINE]: 0.3,
    [J.R_UPPER_ARM]: 1.4, [J.R_FOREARM]: 0.5, [J.R_HAND]: 0.3,
    [J.L_UPPER_ARM]: -0.4, [J.L_FOREARM]: 0.2,
  }),
  overhead_recovery: makePose({
    [J.CHEST]: 0.3, [J.SPINE]: 0.15,
    [J.R_UPPER_ARM]: 1.0, [J.R_FOREARM]: 0.2,
  }),
  sweep_windup: makePose({
    [J.SPINE]: 0.1, [J.CHEST]: 0.2,
    [J.R_UPPER_ARM]: 0.6, [J.R_FOREARM]: 0.4, [J.R_HAND]: 0.2,
    [J.L_UPPER_ARM]: -0.3,
    [J.L_THIGH]: 0.3, [J.R_THIGH]: -0.1,
  }),
  sweep_active: makePose({
    [J.SPINE]: -0.1, [J.CHEST]: -0.2,
    [J.R_UPPER_ARM]: 1.2, [J.R_FOREARM]: 0.6, [J.R_HAND]: 0.3,
    [J.L_UPPER_ARM]: 0.2,
    [J.L_THIGH]: -0.2, [J.L_SHIN]: 0.4,
  }),
  sweep_recovery: makePose({
    [J.R_UPPER_ARM]: 0.9, [J.R_FOREARM]: 0.3,
  }),
  riposte_windup: makePose({
    [J.CHEST]: 0.1, [J.SPINE]: 0.05,
    [J.R_UPPER_ARM]: -0.5, [J.R_FOREARM]: -1.0, [J.R_HAND]: -0.2,
  }),
  riposte_active: makePose({
    [J.CHEST]: 0.3, [J.SPINE]: 0.2,
    [J.R_UPPER_ARM]: 0.8, [J.R_FOREARM]: -0.2, [J.R_HAND]: 0.1,
    [J.L_UPPER_ARM]: -0.4,
  }),
  riposte_recovery: makePose({
    [J.CHEST]: 0.15, [J.R_UPPER_ARM]: 0.5, [J.R_FOREARM]: -0.3,
  }),
  kick_windup: makePose({
    [J.SPINE]: -0.15, [J.CHEST]: -0.1,
    [J.R_THIGH]: -0.8, [J.R_SHIN]: 0.6,
    [J.L_THIGH]: 0.1,
    [J.R_UPPER_ARM]: 0.3, [J.R_FOREARM]: -0.5,
  }),
  kick_active: makePose({
    [J.SPINE]: 0.2, [J.CHEST]: 0.15,
    [J.R_THIGH]: 0.6, [J.R_SHIN]: -0.2,
    [J.L_THIGH]: -0.1, [J.L_SHIN]: 0.3,
    [J.R_UPPER_ARM]: 0.1,
  }),
  kick_recovery: makePose({
    [J.R_THIGH]: 0.1, [J.R_SHIN]: 0.1,
  }),
  // Air slash poses — legs tucked up
  airSlash_windup: makePose({
    [J.CHEST]: -0.3, [J.SPINE]: -0.15,
    [J.R_UPPER_ARM]: -1.2, [J.R_FOREARM]: -0.4, [J.R_HAND]: -0.3,
    [J.L_UPPER_ARM]: 0.3, [J.L_FOREARM]: 0.8,
    [J.L_THIGH]: -0.5, [J.L_SHIN]: 0.6, [J.R_THIGH]: -0.4, [J.R_SHIN]: 0.5,
  }),
  airSlash_active: makePose({
    [J.CHEST]: 0.4, [J.SPINE]: 0.2,
    [J.R_UPPER_ARM]: 1.0, [J.R_FOREARM]: 0.2, [J.R_HAND]: 0.1,
    [J.L_UPPER_ARM]: -0.3, [J.L_FOREARM]: 0.3,
    [J.L_THIGH]: -0.5, [J.L_SHIN]: 0.6, [J.R_THIGH]: -0.4, [J.R_SHIN]: 0.5,
  }),
  airSlash_recovery: makePose({
    [J.CHEST]: 0.2, [J.SPINE]: 0.1,
    [J.R_UPPER_ARM]: 0.8, [J.R_FOREARM]: -0.2,
    [J.L_UPPER_ARM]: -0.1, [J.L_FOREARM]: 0.3,
    [J.L_THIGH]: -0.4, [J.L_SHIN]: 0.4, [J.R_THIGH]: -0.3, [J.R_SHIN]: 0.3,
  }),
  // Excalibur strike poses
  excalibur_windup: makePose({
    [J.CHEST]: -0.5, [J.SPINE]: -0.3,
    [J.R_UPPER_ARM]: -2.0, [J.R_FOREARM]: -1.2, [J.R_HAND]: -0.6,
    [J.L_UPPER_ARM]: -0.6, [J.L_FOREARM]: 0.4,
    [J.L_THIGH]: 0.3, [J.R_THIGH]: -0.3,
  }),
  excalibur_active: makePose({
    [J.CHEST]: 0.6, [J.SPINE]: 0.4,
    [J.R_UPPER_ARM]: 1.6, [J.R_FOREARM]: 0.6, [J.R_HAND]: 0.4,
    [J.L_UPPER_ARM]: -0.5, [J.L_FOREARM]: 0.3,
  }),
  // Charged slash poses (reuse overhead)
  chargedSlash_windup: makePose({
    [J.CHEST]: -0.4, [J.SPINE]: -0.2,
    [J.R_UPPER_ARM]: -1.8, [J.R_FOREARM]: -1.0, [J.R_HAND]: -0.5,
    [J.L_UPPER_ARM]: -0.5, [J.L_FOREARM]: 0.3,
    [J.L_THIGH]: 0.2, [J.R_THIGH]: -0.2,
  }),
  chargedSlash_active: makePose({
    [J.CHEST]: 0.5, [J.SPINE]: 0.3,
    [J.R_UPPER_ARM]: 1.4, [J.R_FOREARM]: 0.5, [J.R_HAND]: 0.3,
    [J.L_UPPER_ARM]: -0.4, [J.L_FOREARM]: 0.2,
  }),
  chargedSlash_recovery: makePose({
    [J.CHEST]: 0.3, [J.SPINE]: 0.15,
    [J.R_UPPER_ARM]: 1.0, [J.R_FOREARM]: 0.2,
  }),
  // Grab poses
  grab_windup: makePose({
    [J.CHEST]: 0.2, [J.SPINE]: 0.15,
    [J.R_UPPER_ARM]: 0.3, [J.R_FOREARM]: -0.2, [J.R_HAND]: 0.1,
    [J.L_UPPER_ARM]: 0.3, [J.L_FOREARM]: -0.2, [J.L_HAND]: 0.1,
    [J.L_THIGH]: 0.2, [J.R_THIGH]: -0.1,
  }),
  grab_active: makePose({
    [J.CHEST]: 0.35, [J.SPINE]: 0.25,
    [J.R_UPPER_ARM]: 0.6, [J.R_FOREARM]: 0.2, [J.R_HAND]: 0.2,
    [J.L_UPPER_ARM]: 0.6, [J.L_FOREARM]: 0.2, [J.L_HAND]: 0.2,
  }),
  grab_recovery: makePose({
    [J.CHEST]: 0.15, [J.SPINE]: 0.1,
    [J.R_UPPER_ARM]: 0.3, [J.R_FOREARM]: -0.1,
    [J.L_UPPER_ARM]: 0.3, [J.L_FOREARM]: -0.1,
  }),
  excalibur_recovery: makePose({
    [J.CHEST]: 0.3, [J.SPINE]: 0.2,
    [J.R_UPPER_ARM]: 1.1, [J.R_FOREARM]: 0.3,
  }),
  // Dash attack poses (reuse thrust poses)
  dashAttack_windup: makePose({
    [J.CHEST]: -0.2, [J.SPINE]: -0.1,
    [J.R_UPPER_ARM]: -0.3, [J.R_FOREARM]: -1.5, [J.R_HAND]: 0,
    [J.L_UPPER_ARM]: 0.4, [J.L_FOREARM]: 0.9,
    [J.R_THIGH]: -0.2, [J.L_THIGH]: 0.2,
  }),
  dashAttack_active: makePose({
    [J.CHEST]: 0.15, [J.SPINE]: 0.15,
    [J.R_UPPER_ARM]: 0.1, [J.R_FOREARM]: -0.1, [J.R_HAND]: 0,
    [J.L_UPPER_ARM]: -0.5, [J.L_FOREARM]: 0.2,
    [J.R_THIGH]: 0.1, [J.L_THIGH]: -0.15,
  }),
  dashAttack_recovery: makePose({
    [J.CHEST]: 0.1, [J.R_UPPER_ARM]: 0.3, [J.R_FOREARM]: -0.4,
  }),
  block: makePose({
    [J.SPINE]: -0.15, [J.CHEST]: -0.1,
    [J.R_UPPER_ARM]: -0.8, [J.R_FOREARM]: -1.4, [J.R_HAND]: 0.2,
    [J.L_UPPER_ARM]: 0.5, [J.L_FOREARM]: 1.0,
    [J.L_THIGH]: 0.15, [J.R_THIGH]: -0.15,
  }),
  parry_success: makePose({
    [J.SPINE]: 0.1, [J.CHEST]: 0.15,
    [J.R_UPPER_ARM]: -0.2, [J.R_FOREARM]: -0.8, [J.R_HAND]: 0.4,
    [J.L_UPPER_ARM]: -0.3, [J.L_FOREARM]: 0.4,
  }),
  stagger: makePose({
    [J.SPINE]: -0.4, [J.CHEST]: -0.3, [J.HEAD]: -0.2,
    [J.R_UPPER_ARM]: 0.5, [J.R_FOREARM]: 0.3,
    [J.L_UPPER_ARM]: 0.3, [J.L_FOREARM]: -0.2,
    [J.L_THIGH]: 0.2, [J.R_THIGH]: -0.3,
  }),
  knockdown: makePose({
    [J.SPINE]: -1.0, [J.CHEST]: -0.5, [J.HEAD]: -0.3,
    [J.R_UPPER_ARM]: 1.5, [J.R_FOREARM]: 0.5,
    [J.L_UPPER_ARM]: 1.2, [J.L_FOREARM]: 0.3,
    [J.L_THIGH]: -0.8, [J.L_SHIN]: 0.5,
    [J.R_THIGH]: -0.6, [J.R_SHIN]: 0.4,
  }),
  death: makePose({
    [J.SPINE]: -1.2, [J.CHEST]: -0.6, [J.HEAD]: -0.5, [J.NECK]: -0.3,
    [J.R_UPPER_ARM]: 1.8, [J.R_FOREARM]: 0.8,
    [J.L_UPPER_ARM]: 1.5, [J.L_FOREARM]: 0.5,
    [J.L_THIGH]: -1.0, [J.L_SHIN]: 0.8,
    [J.R_THIGH]: -0.8, [J.R_SHIN]: 0.6,
  }),
  dodge: makePose({
    [J.SPINE]: 0.3, [J.CHEST]: 0.2,
    [J.R_UPPER_ARM]: 0.3, [J.R_FOREARM]: -0.4,
    [J.L_UPPER_ARM]: -0.2,
    [J.L_THIGH]: -0.5, [J.L_SHIN]: 0.8,
    [J.R_THIGH]: 0.3, [J.R_SHIN]: 0.2,
  }),
  crouch: makePose({
    [J.SPINE]: 0.3, [J.CHEST]: 0.1,
    [J.L_THIGH]: -0.6, [J.L_SHIN]: 1.0,
    [J.R_THIGH]: -0.5, [J.R_SHIN]: 0.9,
    [J.R_UPPER_ARM]: 0.5, [J.R_FOREARM]: -0.9,
  }),
  jump: makePose({
    [J.L_THIGH]: -0.3, [J.L_SHIN]: -0.2,
    [J.R_THIGH]: 0.2, [J.R_SHIN]: 0.3,
    [J.R_UPPER_ARM]: -0.5, [J.R_FOREARM]: -0.6,
    [J.L_UPPER_ARM]: 0.3,
  }),
};

// ── Types ────────────────────────────────────────────────────────────────────

interface Bone {
  parent: number; length: number; baseAngle: number; angle: number;
  worldX: number; worldY: number; worldAngle: number;
}
interface Skeleton { bones: Bone[]; rootX: number; rootY: number; scale: number; }
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string;
  type: string; grav: number; rot: number; rotSpd: number;
}
interface TrailPoint { x: number; y: number; }
interface DamageNumber { x: number; y: number; text: string; life: number; color: string; }
interface BloodDecal { x: number; y: number; size: number; alpha: number; }

interface FighterConfig {
  color: string; armorColor: string; swordColor: string;
  plumeColor?: string; name: string; isAI: boolean;
}

interface Fighter {
  x: number; y: number; vx: number; vy: number;
  facing: number; grounded: boolean;
  hp: number; maxHp: number; stamina: number;
  stance: string;
  skeleton: Skeleton;
  targetPose: Float64Array;
  walkCycle: number;
  currentAttack: AttackDef | null;
  attackType: string | null;
  attackPhase: string | null;
  attackTimer: number;
  attackHit: boolean;
  blocking: boolean;
  parrying: boolean;
  parryTimer: number;
  blockHeld: boolean;
  riposteReady: boolean;
  riposteTimer: number;
  dodging: boolean;
  dodgeTimer: number;
  dodgeDir: number;
  invulnerable: boolean;
  comboCount: number;
  comboTimer: number;
  comboSequence: string[];
  staggered: boolean;
  staggerTimer: number;
  knockedDown: boolean;
  knockdownTimer: number;
  dead: boolean;
  deathTimer: number;
  exhausted: boolean;
  crouching: boolean;
  swordTrail: TrailPoint[];
  swordTipX: number; swordTipY: number;
  color: string; armorColor: string; swordColor: string;
  plumeColor: string;
  name: string; isAI: boolean;
  aiTimer: number; aiAction: string | null; aiReactionDelay: number; stepTimer: number;
  bleedTimer: number;
  damageMul: number;
  ability: string;
  capeSegments: number[];
  // New fields
  superMeter: number;
  hitFlash: number;
  counterStrikeReady: boolean;
  counterStrikeWindupMul: number;
  wallSplatTimer: number;
  whiffPunishTimer: number;
  whiffPunishAggBoost: number;
  mirrorImageTimer: number;
  grabbing: boolean;
  grabTimer: number;
  grabTarget: Fighter | null;
  scars: {x: number; y: number; angle: number; size: number}[];
  // Enchantment / status effect timers
  enchantment: string;
  fireTimer: number;
  iceTimer: number;
  poisonTimer: number;
  burnTimer: number;
  slowTimer: number;
  poisonStacks: number;
  // Hit zone
  legHitSlowTimer: number;
  disarmedTimer: number;
  // Execution finisher
  vulnerable: boolean;
}

type Phase = "title" | "intro" | "playing" | "shop" | "game_over" | "victory" | "tournament_end" | "training";

// ── Utilities ────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
function clamp(v: number, mn: number, mx: number): number { return Math.max(mn, Math.min(mx, v)); }
function rand(a: number, b: number): number { return a + Math.random() * (b - a); }
function randInt(a: number, b: number): number { return Math.floor(rand(a, b + 1)); }

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const r = clamp(((num >> 16) & 0xff) + percent, 0, 255);
  const g = clamp(((num >> 8) & 0xff) + percent, 0, 255);
  const b = clamp((num & 0xff) + percent, 0, 255);
  return `rgb(${r},${g},${b})`;
}

// ── Main Game Class ──────────────────────────────────────────────────────────

export class SwordOfAvalonGame {
  private _canvas!: HTMLCanvasElement;
  private _ctx!: CanvasRenderingContext2D;
  private _animFrame = 0;
  private _phase: Phase = "title";
  private _difficulty = 1;
  private _frameCount = 0;

  private _player!: Fighter;
  private _ai!: Fighter;

  private _particles: Particle[] = [];
  private _damageNumbers: DamageNumber[] = [];
  private _bloodDecals: BloodDecal[] = [];
  private _shakeX = 0;
  private _shakeY = 0;
  private _shakeIntensity = 0;
  private _hitstopTimer = 0;

  // Slow-mo kill cam
  private _slowmoTimer = 0;
  private _timeScale = 1;

  private _comboDisplayName = "";
  private _comboDisplayTimer = 0;
  private _comboDisplayCount = 0;

  // Tournament state
  private _currentEnemyIdx = 0;
  private _gold = 0;
  private _purchasedOneTime = new Set<string>();
  private _introTimer = 0;
  private _introText = "";
  private _introSubtext = "";

  // Player persistent upgrades
  private _bonusStaminaRegen = 0;
  private _bonusDamage = 0;
  private _bonusDefense = 0;
  private _allCanBleed = false;
  private _startingSuperMeter = 0;
  private _bonusPerfectWindow = 0;

  // Rain & Weather System
  private _raindrops: {x:number, y:number, vy:number, length:number}[] = [];
  private _rainActive = false;

  // Arena variety
  private _arenaStyle = 0;
  private _lightningTimer = 0;
  private _lightningFlash = 0;
  private _lightningBolt: {x1:number,y1:number,x2:number,y2:number}[] = [];
  private _emberParticles: {x:number, y:number, vx:number, vy:number, life:number, size:number}[] = [];

  // Announcer/Commentary
  private _announceText = "";
  private _announceTimer = 0;
  private _announceScale = 2;
  private _firstBloodTriggered = false;
  private _nearDeathTriggered = false;
  private _roundDamageTaken = 0;

  // Charged Heavy Attack
  private _chargeTimer = 0;
  private _charging = false;
  private _chargeSparks: {x:number, y:number, life:number, vx:number, vy:number}[] = [];

  // Round Timer
  private _roundTimer = 60 * 60;

  // Fire Pits
  private _firePits: {x:number, active:boolean}[] = [];

  // Crowd excitement
  private _crowdExcitement = 0;
  private _crowdTimer = 0;

  // Guard break / perfect parry VFX
  private _guardBreakFlash = 0;
  private _perfectParryRing: { x: number; y: number; r: number; alpha: number } | null = null;

  // Procedural music
  private _musicDrone: OscillatorNode | null = null;
  private _musicDrone2: OscillatorNode | null = null;
  private _musicGain: GainNode | null = null;
  private _musicGain2: GainNode | null = null;
  private _musicNoteTimer = 0;

  private _stats = { hitsLanded: 0, hitsTaken: 0, parries: 0, combos: 0, maxCombo: 0, ripostes: 0, goldEarned: 0 };

  private _keys: Record<string, boolean> = {};
  private _justPressed: Record<string, boolean> = {};
  private _prevKeys: Record<string, boolean> = {};

  private _audioCtx: AudioContext | null = null;
  private _titleOverlay: HTMLDivElement | null = null;
  private _resultOverlay: HTMLDivElement | null = null;
  private _shopOverlay: HTMLDivElement | null = null;
  private _destroyed = false;

  // Weapon selection
  private _selectedWeapon = 0;

  // Dash attack
  private _lastDirPress: {dir: number; time: number} = {dir: 0, time: -100};
  private _dashing = false;
  private _dashTimer = 0;
  private _dashStartTime = 0;

  // Crowd thrown items
  private _crowdItems: {x: number; y: number; vx: number; vy: number; type: string; life: number; bounced: boolean}[] = [];

  // Death zoom
  private _deathZoom: {active: boolean; x: number; y: number; scale: number; targetScale: number; flashAlpha: number} = {active: false, x: 0, y: 0, scale: 1.0, targetScale: 1.3, flashAlpha: 0};

  // New Game+ mode
  private _ngPlus = 0;

  // Player enchantment
  private _playerEnchantment = "none";

  // Weapon enchantment (new system — replaces _playerEnchantment)
  private _weaponEnchant: string = "none";

  // Weapon unlock notification
  private _weaponUnlockNotify = "";
  private _weaponUnlockTimer = 0;

  // Dialogue system (AI taunts)
  private _dialogueText = "";
  private _dialogueTimer = 0;
  private _dialogueSpeaker = "";
  private _aiLowHpTaunted = false;
  private _playerLowHpTaunted = false;
  private _aiHalfHpBarked = false;

  // Input buffer system
  private _inputBuffer: {action: string, time: number} | null = null;

  // Unlockable enemy weapons
  private _unlockedWeapons = new Set<string>();

  private _onKeyDown = (e: KeyboardEvent) => this._handleKeyDown(e);
  private _onKeyUp = (e: KeyboardEvent) => this._handleKeyUp(e);
  private _onResize = () => this._resizeCanvas();

  private get _currentWeapon(): WeaponDef {
    const allWeapons = [...WEAPONS, ...this._getUnlockedWeaponDefs()];
    return allWeapons[this._selectedWeapon] || WEAPONS[0];
  }

  private get _activeEnchant(): string {
    return this._weaponEnchant !== "none" ? this._weaponEnchant : this._playerEnchantment;
  }

  // ── Boot & Destroy ───────────────────────────────────────────────────────

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();
    this._audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:50;cursor:none;";
    document.body.appendChild(this._canvas);
    this._ctx = this._canvas.getContext("2d")!;
    this._resizeCanvas();

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("resize", this._onResize);

    this._phase = "title";
    this._showTitle();
    this._startMusic();

    const loop = () => {
      if (this._destroyed) return;
      this._animFrame = requestAnimationFrame(loop);
      this._tick();
    };
    loop();
  }

  destroy(): void {
    this._destroyed = true;
    cancelAnimationFrame(this._animFrame);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("resize", this._onResize);
    this._titleOverlay?.parentNode?.removeChild(this._titleOverlay);
    this._resultOverlay?.parentNode?.removeChild(this._resultOverlay);
    this._shopOverlay?.parentNode?.removeChild(this._shopOverlay);
    this._canvas?.parentNode?.removeChild(this._canvas);
    this._stopMusic();
    this._audioCtx?.close().catch(() => {});
    this._audioCtx = null;
  }

  private _resizeCanvas(): void { this._canvas.width = window.innerWidth; this._canvas.height = window.innerHeight; }
  private get _W(): number { return this._canvas.width; }
  private get _H(): number { return this._canvas.height; }
  private get _groundY(): number { return this._H * GROUND_Y_RATIO; }

  // ── Input ────────────────────────────────────────────────────────────────

  private _handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      if (this._phase === "training") {
        this._phase = "title";
        this._showTitle();
        return;
      }
      this._cleanup(); return;
    }
    this._keys[e.key.toLowerCase()] = true;
    e.preventDefault();
  }
  private _handleKeyUp(e: KeyboardEvent): void { this._keys[e.key.toLowerCase()] = false; e.preventDefault(); }
  private _updateInput(): void {
    for (const k in this._keys) { this._justPressed[k] = this._keys[k] && !this._prevKeys[k]; this._prevKeys[k] = this._keys[k]; }
  }
  private _cleanup(): void { this.destroy(); window.dispatchEvent(new Event("swordOfAvalonExit")); }

  // ── Audio ────────────────────────────────────────────────────────────────

  private _playSound(type: string, vol = 0.3): void {
    const ac = this._audioCtx;
    if (!ac) return;
    try {
      const now = ac.currentTime;
      const g = ac.createGain();
      g.connect(ac.destination);
      g.gain.setValueAtTime(vol, now);

      if (type === "slash") {
        const o = ac.createOscillator(); o.type = "sawtooth";
        o.frequency.setValueAtTime(200, now); o.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        const bq = ac.createBiquadFilter(); bq.type = "highpass"; bq.frequency.value = 300;
        o.connect(bq); bq.connect(g); o.start(now); o.stop(now + 0.15);
      } else if (type === "clash") {
        for (let i = 0; i < 3; i++) {
          const o = ac.createOscillator(); o.type = "square";
          o.frequency.setValueAtTime(800 + i * 400 + Math.random() * 200, now);
          o.frequency.exponentialRampToValueAtTime(200 + i * 100, now + 0.2);
          const g2 = ac.createGain(); g2.gain.setValueAtTime(vol * 0.4, now);
          g2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          o.connect(g2); g2.connect(ac.destination); o.start(now); o.stop(now + 0.2);
        }
      } else if (type === "hit") {
        const buf = ac.createBuffer(1, ac.sampleRate * 0.1, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.2));
        const src = ac.createBufferSource(); src.buffer = buf;
        const bq = ac.createBiquadFilter(); bq.type = "lowpass"; bq.frequency.value = 600;
        src.connect(bq); bq.connect(g); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12); src.start(now);
      } else if (type === "parry") {
        const o = ac.createOscillator(); o.type = "triangle";
        o.frequency.setValueAtTime(1200, now); o.frequency.exponentialRampToValueAtTime(2000, now + 0.05);
        o.frequency.exponentialRampToValueAtTime(600, now + 0.3);
        g.gain.setValueAtTime(vol * 0.6, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        o.connect(g); o.start(now); o.stop(now + 0.3);
      } else if (type === "dodge") {
        const buf = ac.createBuffer(1, ac.sampleRate * 0.15, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3 * Math.exp(-i / (data.length * 0.4));
        const src = ac.createBufferSource(); src.buffer = buf;
        const bq = ac.createBiquadFilter(); bq.type = "bandpass"; bq.frequency.value = 1500; bq.Q.value = 2;
        src.connect(bq); bq.connect(g); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15); src.start(now);
      } else if (type === "step") {
        const buf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.15 * Math.exp(-i / (data.length * 0.15));
        const src = ac.createBufferSource(); src.buffer = buf;
        const bq = ac.createBiquadFilter(); bq.type = "lowpass"; bq.frequency.value = 400;
        src.connect(bq); bq.connect(g); g.gain.exponentialRampToValueAtTime(0.001, now + 0.05); src.start(now);
      } else if (type === "combo") {
        const o = ac.createOscillator(); o.type = "sine";
        o.frequency.setValueAtTime(600, now); o.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        g.gain.setValueAtTime(vol * 0.5, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        o.connect(g); o.start(now); o.stop(now + 0.2);
      } else if (type === "death") {
        for (let i = 0; i < 4; i++) {
          const o = ac.createOscillator(); o.type = "sawtooth";
          o.frequency.setValueAtTime(300 - i * 50, now + i * 0.15);
          o.frequency.exponentialRampToValueAtTime(40, now + i * 0.15 + 0.4);
          const g2 = ac.createGain(); g2.gain.setValueAtTime(vol * 0.3, now + i * 0.15);
          g2.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
          o.connect(g2); g2.connect(ac.destination); o.start(now + i * 0.15); o.stop(now + i * 0.15 + 0.4);
        }
      } else if (type === "victory") {
        [523, 659, 784, 1047].forEach((f, i) => {
          const o = ac.createOscillator(); o.type = "sine";
          o.frequency.setValueAtTime(f, now + i * 0.15);
          const g2 = ac.createGain(); g2.gain.setValueAtTime(vol * 0.4, now + i * 0.15);
          g2.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.5);
          o.connect(g2); g2.connect(ac.destination); o.start(now + i * 0.15); o.stop(now + i * 0.15 + 0.5);
        });
      } else if (type === "crowd") {
        const buf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.08 * Math.sin(i / (ac.sampleRate * 0.05)) * Math.exp(-i / (data.length * 0.5));
        }
        const src = ac.createBufferSource(); src.buffer = buf;
        const bq = ac.createBiquadFilter(); bq.type = "bandpass"; bq.frequency.value = 800; bq.Q.value = 0.5;
        src.connect(bq); bq.connect(g); g.gain.exponentialRampToValueAtTime(0.001, now + 0.5); src.start(now);
      } else if (type === "kick") {
        const buf = ac.createBuffer(1, ac.sampleRate * 0.08, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5 * Math.exp(-i / (data.length * 0.1));
        const src = ac.createBufferSource(); src.buffer = buf;
        const bq = ac.createBiquadFilter(); bq.type = "lowpass"; bq.frequency.value = 300;
        src.connect(bq); bq.connect(g); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1); src.start(now);
      } else if (type === "riposte") {
        const o = ac.createOscillator(); o.type = "sawtooth";
        o.frequency.setValueAtTime(400, now); o.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        o.frequency.exponentialRampToValueAtTime(200, now + 0.2);
        g.gain.setValueAtTime(vol * 0.5, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        o.connect(g); o.start(now); o.stop(now + 0.25);
      } else if (type === "bleed") {
        const o = ac.createOscillator(); o.type = "sine";
        o.frequency.setValueAtTime(180, now); o.frequency.exponentialRampToValueAtTime(100, now + 0.15);
        g.gain.setValueAtTime(vol * 0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        o.connect(g); o.start(now); o.stop(now + 0.15);
      } else if (type === "excalibur") {
        // Epic multi-layered sound for super attack
        for (let i = 0; i < 5; i++) {
          const o = ac.createOscillator(); o.type = i < 2 ? "sawtooth" : "sine";
          o.frequency.setValueAtTime(200 + i * 150, now);
          o.frequency.exponentialRampToValueAtTime(800 + i * 200, now + 0.15);
          o.frequency.exponentialRampToValueAtTime(100 + i * 50, now + 0.5);
          const g2 = ac.createGain(); g2.gain.setValueAtTime(vol * 0.3, now);
          g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          o.connect(g2); g2.connect(ac.destination); o.start(now); o.stop(now + 0.5);
        }
      } else if (type === "wallsplat") {
        const buf = ac.createBuffer(1, ac.sampleRate * 0.15, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.7 * Math.exp(-i / (data.length * 0.15));
        const src = ac.createBufferSource(); src.buffer = buf;
        const bq = ac.createBiquadFilter(); bq.type = "lowpass"; bq.frequency.value = 500;
        src.connect(bq); bq.connect(g); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15); src.start(now);
      } else if (type === "guardbreak") {
        // Cracking / shattering sound
        for (let i = 0; i < 3; i++) {
          const o = ac.createOscillator(); o.type = "square";
          o.frequency.setValueAtTime(1200 + i * 300, now + i * 0.03);
          o.frequency.exponentialRampToValueAtTime(100, now + i * 0.03 + 0.2);
          const g2 = ac.createGain(); g2.gain.setValueAtTime(vol * 0.35, now + i * 0.03);
          g2.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.2);
          o.connect(g2); g2.connect(ac.destination); o.start(now + i * 0.03); o.stop(now + i * 0.03 + 0.2);
        }
      } else if (type === "perfectparry") {
        // Bright, resonant parry sound
        const o = ac.createOscillator(); o.type = "sine";
        o.frequency.setValueAtTime(1800, now); o.frequency.exponentialRampToValueAtTime(2400, now + 0.08);
        o.frequency.exponentialRampToValueAtTime(1000, now + 0.4);
        g.gain.setValueAtTime(vol * 0.6, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        o.connect(g); o.start(now); o.stop(now + 0.4);
        // Harmonic overtone
        const o2 = ac.createOscillator(); o2.type = "triangle";
        o2.frequency.setValueAtTime(3600, now);
        o2.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
        const g3 = ac.createGain(); g3.gain.setValueAtTime(vol * 0.2, now);
        g3.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        o2.connect(g3); g3.connect(ac.destination); o2.start(now); o2.stop(now + 0.3);
      }
    } catch (_) { /* ignore audio errors */ }
  }

  // ── Procedural Ambient Music ──────────────────────────────────────────────

  private _startMusic(): void {
    const ac = this._audioCtx;
    if (!ac) return;
    try {
      // Main drone at C2 (65Hz)
      this._musicGain = ac.createGain();
      this._musicGain.gain.setValueAtTime(0.04, ac.currentTime);
      this._musicGain.connect(ac.destination);
      this._musicDrone = ac.createOscillator();
      this._musicDrone.type = "sine";
      this._musicDrone.frequency.setValueAtTime(65, ac.currentTime);
      this._musicDrone.connect(this._musicGain);
      this._musicDrone.start();

      // Second drone gain (starts silent, activates when excitement is high)
      this._musicGain2 = ac.createGain();
      this._musicGain2.gain.setValueAtTime(0, ac.currentTime);
      this._musicGain2.connect(ac.destination);
      this._musicDrone2 = ac.createOscillator();
      this._musicDrone2.type = "sine";
      this._musicDrone2.frequency.setValueAtTime(98, ac.currentTime);
      this._musicDrone2.connect(this._musicGain2);
      this._musicDrone2.start();
    } catch (_) { /* ignore */ }
  }

  private _stopMusic(): void {
    try {
      this._musicDrone?.stop();
      this._musicDrone2?.stop();
    } catch (_) { /* ignore */ }
    this._musicDrone = null;
    this._musicDrone2 = null;
    this._musicGain = null;
    this._musicGain2 = null;
  }

  private _updateMusic(): void {
    const ac = this._audioCtx;
    if (!ac || !this._musicGain || !this._musicGain2) return;
    try {
      const now = ac.currentTime;
      // Toggle second drone based on excitement
      const targetGain2 = this._crowdExcitement > 0.5 ? 0.03 : 0;
      this._musicGain2.gain.setTargetAtTime(targetGain2, now, 0.3);

      // Play melodic notes
      this._musicNoteTimer++;
      const noteInterval = this._crowdExcitement > 0.5 ? 60 : 120;
      if (this._musicNoteTimer >= noteInterval) {
        this._musicNoteTimer = 0;
        // Minor pentatonic: C, Eb, F, G, Bb
        const notes = [130.81, 155.56, 174.61, 196.00, 233.08]; // octave 3
        const octaveMul = Math.random() < 0.5 ? 1 : 2; // octave 3 or 4
        const freq = notes[randInt(0, 4)] * octaveMul;

        const noteGain = ac.createGain();
        noteGain.gain.setValueAtTime(0.035, now);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        noteGain.connect(ac.destination);
        const noteOsc = ac.createOscillator();
        noteOsc.type = "triangle";
        noteOsc.frequency.setValueAtTime(freq, now);
        noteOsc.connect(noteGain);
        noteOsc.start(now);
        noteOsc.stop(now + 0.8);

        // Reverb-like delay during slow-mo or intro
        if (this._slowmoTimer > 0 || this._phase === "intro") {
          const delayGain = ac.createGain();
          delayGain.gain.setValueAtTime(0.017, now + 0.2);
          delayGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
          delayGain.connect(ac.destination);
          const delayOsc = ac.createOscillator();
          delayOsc.type = "triangle";
          delayOsc.frequency.setValueAtTime(freq, now + 0.2);
          delayOsc.connect(delayGain);
          delayOsc.start(now + 0.2);
          delayOsc.stop(now + 1.0);
        }
      }
    } catch (_) { /* ignore */ }
  }

  // ── Skeleton ─────────────────────────────────────────────────────────────

  private _createSkeleton(): Skeleton {
    const bones: Bone[] = [];
    for (let i = 0; i < JOINT_COUNT; i++) {
      bones.push({ parent: BONE_DEF[i][0], length: BONE_DEF[i][1], baseAngle: BONE_DEF[i][2],
        angle: BONE_DEF[i][2], worldX: 0, worldY: 0, worldAngle: 0 });
    }
    return { bones, rootX: 0, rootY: 0, scale: 1 };
  }

  private _solveFK(sk: Skeleton): void {
    for (let i = 0; i < JOINT_COUNT; i++) {
      const b = sk.bones[i];
      if (b.parent === -1) { b.worldX = sk.rootX; b.worldY = sk.rootY; b.worldAngle = b.angle; }
      else {
        const p = sk.bones[b.parent];
        b.worldAngle = p.worldAngle + b.angle;
        b.worldX = p.worldX + Math.cos(b.worldAngle) * b.length * sk.scale;
        b.worldY = p.worldY + Math.sin(b.worldAngle) * b.length * sk.scale;
      }
    }
  }

  private _applyPose(sk: Skeleton, pose: Float64Array, t: number): void {
    for (let i = 0; i < JOINT_COUNT; i++) {
      sk.bones[i].angle = lerpAngle(sk.bones[i].angle, BONE_DEF[i][2] + pose[i], t);
    }
  }

  private _blendPoses(a: Float64Array, b: Float64Array, t: number): Float64Array {
    const r = new Float64Array(JOINT_COUNT);
    for (let i = 0; i < JOINT_COUNT; i++) r[i] = lerp(a[i], b[i], t);
    return r;
  }

  // ── Particles / FX ───────────────────────────────────────────────────────

  private _spawnParticle(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, type: string, grav = 0): void {
    if (this._particles.length > 800) this._particles.splice(0, 80);
    this._particles.push({ x, y, vx, vy, life, maxLife: life, size, color, type, grav, rot: 0, rotSpd: rand(-0.2, 0.2) });
  }

  private _spawnSparks(x: number, y: number, count: number, intensity = 1): void {
    for (let i = 0; i < count; i++) {
      const a = rand(-Math.PI, Math.PI); const s = rand(3, 8) * intensity;
      const colors = ["#ffd700", "#ff8c00", "#ffaa33", "#fff"];
      this._spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(10, 25), rand(1, 3), colors[randInt(0, 3)], "spark", 0.15);
    }
  }

  private _spawnBlood(x: number, y: number, count: number, dir = 0): void {
    for (let i = 0; i < count; i++) {
      const a = dir + rand(-0.8, 0.8); const s = rand(2, 6);
      const colors = ["#8b0000", "#a00000", "#c02020", "#600"];
      this._spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(15, 35), rand(2, 5), colors[randInt(0, 3)], "blood", 0.3);
    }
    // Blood decals
    for (let i = 0; i < Math.floor(count / 3); i++) {
      this._bloodDecals.push({ x: x + rand(-20, 20), y: this._groundY, size: rand(4, 12), alpha: 0.6 });
    }
    if (this._bloodDecals.length > 50) this._bloodDecals.splice(0, 10);
  }

  private _spawnDust(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = rand(-Math.PI, -0.3); const s = rand(0.5, 2);
      this._spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(20, 40), rand(3, 8), "rgba(150,130,100,0.4)", "dust", -0.02);
    }
  }

  private _spawnGoldenParticles(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = rand(-Math.PI, Math.PI); const s = rand(4, 10);
      const colors = ["#ffd700", "#ffec8b", "#fff68f", "#fffacd"];
      this._spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(15, 35), rand(2, 4), colors[randInt(0, 3)], "spark", 0.1);
    }
  }

  private _spawnCrackParticles(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = rand(-Math.PI, Math.PI); const s = rand(5, 12);
      this._spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(8, 18), rand(1, 2), "#fff", "crack", 0.05);
    }
  }

  private _spawnMirrorGhostParticles(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const a = rand(-Math.PI, Math.PI); const s = rand(1, 3);
      const colors = ["#aa66ff", "#8844cc", "#6622aa", "#bb88ee"];
      this._spawnParticle(x + rand(-30, 30), y + rand(-50, 10), Math.cos(a) * s, Math.sin(a) * s,
        rand(20, 40), rand(4, 10), colors[randInt(0, 3)], "dust", -0.05);
    }
  }

  private _spawnDamageNumber(x: number, y: number, damage: number, color = "#fff"): void {
    this._damageNumbers.push({ x, y, text: Math.round(damage).toString(), life: 50, color });
  }

  private _spawnDamageText(x: number, y: number, text: string, color = "#fff"): void {
    this._damageNumbers.push({ x, y, text, life: 60, color });
  }

  // ── Announcer ─────────────────────────────────────────────────────────────
  private _announce(text: string): void {
    this._announceText = text;
    this._announceTimer = 80;
    this._announceScale = 2;
  }

  private _drawAnnouncement(): void {
    if (this._announceTimer <= 0) return;
    const c = this._ctx;
    const W = this._W, H = this._H;
    this._announceTimer--;
    if (this._announceTimer > 65) {
      this._announceScale = lerp(this._announceScale, 1, 0.15);
    }
    const alpha = this._announceTimer > 20 ? 1 : this._announceTimer / 20;
    const scale = this._announceScale;
    c.save();
    c.globalAlpha = alpha;
    c.textAlign = "center";
    c.font = `bold ${Math.floor(44 * scale)}px Georgia`;
    // Golden glow
    c.shadowColor = "#ffd700";
    c.shadowBlur = 25;
    c.fillStyle = "#ffd700";
    c.fillText(this._announceText, W / 2, H * 0.28);
    c.shadowBlur = 0;
    c.restore();
  }

  // ── Rain System ──────────────────────────────────────────────────────────
  private _initRaindrops(): void {
    this._raindrops = [];
    for (let i = 0; i < 200; i++) {
      this._raindrops.push({
        x: Math.random() * this._W,
        y: Math.random() * this._groundY,
        vy: rand(8, 14),
        length: rand(10, 22),
      });
    }
  }

  private _updateRain(): void {
    if (!this._rainActive) return;
    for (const r of this._raindrops) {
      r.y += r.vy * this._timeScale;
      r.x += 1.5 * this._timeScale; // slight wind
      if (r.y > this._groundY) {
        r.y = rand(-20, -5);
        r.x = Math.random() * this._W;
        r.vy = rand(8, 14);
        r.length = rand(10, 22);
      }
    }
  }

  private _drawRain(): void {
    if (!this._rainActive) return;
    const c = this._ctx;
    c.save();
    for (const r of this._raindrops) {
      const alpha = 0.15 + Math.random() * 0.1;
      c.strokeStyle = `rgba(180,200,255,${alpha})`;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(r.x, r.y);
      c.lineTo(r.x + 1.5, r.y + r.length);
      c.stroke();
    }
    c.restore();
  }

  private _drawPuddles(): void {
    if (!this._rainActive) return;
    const c = this._ctx;
    const gY = this._groundY;
    c.save();
    for (let i = 0; i < 9; i++) {
      const px = this._W * (0.1 + i * 0.1);
      const sinVal = Math.sin(this._frameCount * 0.03 + i * 1.7);
      const alpha = 0.06 + sinVal * 0.03;
      c.fillStyle = `rgba(140,170,220,${alpha})`;
      c.beginPath();
      c.ellipse(px, gY + 4, 18 + sinVal * 4, 3 + sinVal * 1, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  // ── Ember Particles (Volcanic arena) ──────────────────────────────────
  private _updateEmbers(): void {
    for (let i = this._emberParticles.length - 1; i >= 0; i--) {
      const e = this._emberParticles[i];
      e.x += e.vx * this._timeScale;
      e.y += e.vy * this._timeScale;
      e.life -= this._timeScale;
      if (e.life <= 0) this._emberParticles.splice(i, 1);
    }
    // Spawn new embers for style 3
    if (this._arenaStyle === 3 && this._frameCount % 3 === 0) {
      this._emberParticles.push({
        x: rand(0, this._W),
        y: this._groundY + rand(0, 20),
        vx: rand(-0.5, 0.5),
        vy: rand(-1.5, -0.5),
        life: rand(60, 120),
        size: rand(1, 3),
      });
    }
    if (this._emberParticles.length > 150) this._emberParticles.splice(0, 20);
  }

  private _drawEmbers(): void {
    const c = this._ctx;
    for (const e of this._emberParticles) {
      const alpha = clamp(e.life / 40, 0, 1);
      const colors = ["#ff6600", "#ff4400", "#ff8800", "#ffaa00"];
      c.fillStyle = colors[Math.floor(Math.random() * 4)];
      c.globalAlpha = alpha;
      c.beginPath();
      c.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }

  // ── Fire Pits ─────────────────────────────────────────────────────────
  private _updateFirePits(): void {
    for (const pit of this._firePits) {
      if (!pit.active) continue;
      // Damage fighters standing on pits
      for (const f of [this._player, this._ai]) {
        if (f && !f.dead && Math.abs(f.x - pit.x) < 30 && f.grounded) {
          f.hp -= 0.3 * this._timeScale;
          if (this._frameCount % 10 === 0) {
            this._spawnParticle(f.x + rand(-5, 5), f.y - rand(0, 20), rand(-0.5, 0.5), rand(-2, -0.5), rand(10, 20), rand(2, 4), "#ff4400", "spark", -0.05);
          }
          if (f.hp <= 0) {
            f.hp = 0; f.dead = true; f.deathTimer = 0;
            this._playSound("death", 0.4); this._triggerShake(15);
          }
        }
      }
      // Spawn flame particles
      if (this._frameCount % 4 === 0) {
        this._spawnParticle(pit.x + rand(-15, 15), this._groundY - rand(0, 8), rand(-0.5, 0.5), rand(-2, -0.8), rand(15, 30), rand(2, 5), "#ff6600", "spark", -0.05);
      }
    }
  }

  private _drawFirePits(): void {
    const c = this._ctx;
    const gY = this._groundY;
    for (const pit of this._firePits) {
      if (!pit.active) continue;
      // Radial gradient on ground
      const grad = c.createRadialGradient(pit.x, gY, 2, pit.x, gY, 35);
      grad.addColorStop(0, "rgba(255,100,0,0.4)");
      grad.addColorStop(0.5, "rgba(255,60,0,0.2)");
      grad.addColorStop(1, "rgba(255,30,0,0)");
      c.fillStyle = grad;
      c.fillRect(pit.x - 40, gY - 15, 80, 30);
      // Core glow
      c.fillStyle = "rgba(255,200,50,0.3)";
      c.beginPath();
      c.ellipse(pit.x, gY, 15, 5, 0, 0, Math.PI * 2);
      c.fill();
    }
  }

  // ── Grab Mechanic ──────────────────────────────────────────────────────
  private _startGrab(attacker: Fighter, defender: Fighter): void {
    if (attacker.dead || attacker.staggered || attacker.knockedDown || attacker.dodging) return;
    if (attacker.attackPhase) return;
    if (attacker.stamina < 18) return;
    const distance = Math.abs(defender.x - attacker.x);
    if (distance > 40) return;
    if (defender.dodging || defender.invulnerable) return;

    attacker.stamina -= 18;
    attacker.grabbing = true;
    attacker.grabTimer = 20;
    attacker.grabTarget = defender;
    // Lock both in place
    attacker.vx = 0;
    defender.vx = 0;
    defender.staggered = true;
    defender.staggerTimer = 20;
    this._playSound("hit", 0.25);
  }

  private _updateGrab(f: Fighter): void {
    if (!f.grabbing) return;
    f.grabTimer -= this._timeScale;
    // Use grab_active pose
    f.targetPose = POSES.grab_active;
    if (f.grabTarget) {
      f.grabTarget.x = f.x + f.facing * 25;
    }
    if (f.grabTimer <= 0) {
      // Throw!
      if (f.grabTarget && !f.grabTarget.dead) {
        f.grabTarget.vx = f.facing * 10;
        f.grabTarget.vy = -6;
        f.grabTarget.hp -= 15;
        f.grabTarget.staggered = true;
        f.grabTarget.staggerTimer = 25;
        this._spawnDamageNumber(f.grabTarget.x, f.grabTarget.y - 30, 15, "#ff8844");
        this._triggerShake(8);
        this._playSound("kick", 0.3);
        this._announce("THROWN!");
        if (!f.isAI) {
          this._gold += 7;
          this._stats.hitsLanded++;
        }
        if (f.grabTarget.hp <= 0) {
          f.grabTarget.hp = 0; f.grabTarget.dead = true; f.grabTarget.deathTimer = 0;
          this._playSound("death", 0.4); this._triggerShake(15);
          this._slowmoTimer = SLOWMO_DURATION; this._timeScale = SLOWMO_SCALE;
          if (!f.isAI) { this._gold += 50; this._stats.goldEarned += 50; }
        }
      }
      f.grabbing = false;
      f.grabTarget = null;
    }
  }

  private _spawnCrowdItems(count: number, type: string): void {
    for (let i = 0; i < count; i++) {
      this._crowdItems.push({
        x: rand(this._W * 0.2, this._W * 0.8),
        y: rand(-50, -20),
        vx: rand(-2, 2),
        vy: rand(-3, -1),
        type,
        life: 120,
        bounced: false,
      });
    }
    if (this._crowdItems.length > 60) this._crowdItems.splice(0, 20);
  }

  private _updateParticles(): void {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.x += p.vx * this._timeScale; p.y += p.vy * this._timeScale;
      p.vy += p.grav * this._timeScale; p.vx *= 0.97; p.vy *= 0.97;
      p.life -= this._timeScale; p.rot += p.rotSpd * this._timeScale;
      if (p.life <= 0) this._particles.splice(i, 1);
    }
    for (let i = this._damageNumbers.length - 1; i >= 0; i--) {
      const d = this._damageNumbers[i];
      d.y -= 1.2 * this._timeScale; d.life -= this._timeScale;
      if (d.life <= 0) this._damageNumbers.splice(i, 1);
    }
    // Fade blood decals
    for (let i = this._bloodDecals.length - 1; i >= 0; i--) {
      this._bloodDecals[i].alpha -= 0.0005;
      if (this._bloodDecals[i].alpha <= 0) this._bloodDecals.splice(i, 1);
    }
    // Perfect parry ring expansion
    if (this._perfectParryRing) {
      this._perfectParryRing.r += 6;
      this._perfectParryRing.alpha -= 0.04;
      if (this._perfectParryRing.alpha <= 0) this._perfectParryRing = null;
    }
    // Guard break flash decay
    if (this._guardBreakFlash > 0) this._guardBreakFlash--;
    // Crowd thrown items
    for (let i = this._crowdItems.length - 1; i >= 0; i--) {
      const ci = this._crowdItems[i];
      ci.x += ci.vx * this._timeScale;
      ci.y += ci.vy * this._timeScale;
      ci.vy += 0.3 * this._timeScale; // gravity
      if (ci.y >= this._groundY && !ci.bounced) {
        ci.bounced = true;
        ci.vy = -Math.abs(ci.vy) * 0.4;
        ci.y = this._groundY;
      }
      ci.life -= this._timeScale;
      if (ci.life <= 0) this._crowdItems.splice(i, 1);
    }
  }

  private _triggerShake(intensity: number): void { this._shakeIntensity = Math.max(this._shakeIntensity, intensity); }
  private _updateShake(): void {
    if (this._shakeIntensity > 0.5) {
      this._shakeX = (Math.random() - 0.5) * this._shakeIntensity;
      this._shakeY = (Math.random() - 0.5) * this._shakeIntensity;
      this._shakeIntensity *= 0.85;
    } else { this._shakeX = this._shakeY = this._shakeIntensity = 0; }
  }

  // ── Wall Splat ──────────────────────────────────────────────────────────

  private _checkWallSplat(f: Fighter): void {
    if (f.dead || f.wallSplatTimer > 0) return;
    const wallRight = this._W - WALL_RIGHT_OFFSET;
    if ((f.x <= WALL_LEFT || f.x >= wallRight) && Math.abs(f.vx) > 2) {
      f.wallSplatTimer = 30;
      f.staggered = true;
      f.staggerTimer = 30;
      f.hp -= 5;
      f.vx = 0;
      const wallX = f.x <= WALL_LEFT ? WALL_LEFT : wallRight;
      this._spawnDust(wallX, this._groundY, 12);
      this._triggerShake(10);
      this._playSound("wallsplat", 0.35);
      this._spawnDamageNumber(f.x, f.y - 40, 5, "#ff8844");
      if (f.hp <= 0) {
        f.hp = 0; f.dead = true; f.deathTimer = 0;
        this._playSound("death", 0.4); this._triggerShake(15);
      }
    }
  }

  // ── Fighter ──────────────────────────────────────────────────────────────

  private _createFighter(x: number, facing: number, config: FighterConfig, enemyDef?: EnemyDef): Fighter {
    return {
      x, y: 0, vx: 0, vy: 0, facing, grounded: true,
      hp: enemyDef ? enemyDef.hp : HEALTH_MAX, maxHp: enemyDef ? enemyDef.hp : HEALTH_MAX,
      stamina: STAMINA_MAX, stance: "balanced",
      skeleton: this._createSkeleton(), targetPose: POSES.idle_balanced, walkCycle: 0,
      currentAttack: null, attackType: null, attackPhase: null, attackTimer: 0, attackHit: false,
      blocking: false, parrying: false, parryTimer: 0, blockHeld: false,
      riposteReady: false, riposteTimer: 0,
      dodging: false, dodgeTimer: 0, dodgeDir: 0, invulnerable: false,
      comboCount: 0, comboTimer: 0, comboSequence: [],
      staggered: false, staggerTimer: 0, knockedDown: false, knockdownTimer: 0,
      dead: false, deathTimer: 0, exhausted: false, crouching: false,
      swordTrail: [], swordTipX: 0, swordTipY: 0,
      color: config.color, armorColor: config.armorColor, swordColor: config.swordColor,
      plumeColor: config.plumeColor || "#880", name: config.name, isAI: config.isAI,
      aiTimer: 0, aiAction: null, aiReactionDelay: 0, stepTimer: 0,
      bleedTimer: 0, damageMul: enemyDef ? enemyDef.damage : 1,
      ability: enemyDef ? enemyDef.ability : "none",
      capeSegments: [0, 0, 0, 0, 0],
      // New fields
      superMeter: 0,
      hitFlash: 0,
      counterStrikeReady: false,
      counterStrikeWindupMul: 1.0,
      wallSplatTimer: 0,
      whiffPunishTimer: 0,
      whiffPunishAggBoost: 0,
      mirrorImageTimer: 0,
      grabbing: false,
      grabTimer: 0,
      grabTarget: null,
      scars: [],
      // Enchantment / status
      enchantment: "none",
      fireTimer: 0,
      iceTimer: 0,
      poisonTimer: 0,
      burnTimer: 0,
      slowTimer: 0,
      poisonStacks: 0,
      // Hit zone
      legHitSlowTimer: 0,
      disarmedTimer: 0,
      // Execution
      vulnerable: false,
    };
  }

  private _getIdlePose(f: Fighter): Float64Array {
    if (f.stance === "aggressive") return POSES.idle_aggressive;
    if (f.stance === "defensive") return POSES.idle_defensive;
    return POSES.idle_balanced;
  }

  private _startAttack(f: Fighter, type: string): void {
    if (f.dead || f.staggered || f.knockedDown || f.dodging) return;
    if (f.attackPhase && f.attackPhase !== "recovery") return;
    const atk = ATTACKS[type];
    if (!atk) return;
    if (f.stamina < atk.stamina) return;

    if (f.attackPhase === "recovery") f.comboTimer = COMBO_WINDOW;

    f.stamina -= atk.stamina * (!f.isAI ? this._currentWeapon.staminaMul : 1);
    // Clone the attack def to apply weapon modifiers for the player
    let modAtk = atk;
    if (!f.isAI) {
      const wep = this._currentWeapon;
      modAtk = { ...atk, damage: atk.damage * wep.damageMul, reach: atk.reach * wep.reachMul };
    }
    // Disarmed: attacks do 50% damage
    if (f.disarmedTimer > 0) {
      modAtk = { ...modAtk, damage: modAtk.damage * 0.5 };
    }
    f.currentAttack = modAtk; f.attackType = type;
    f.attackPhase = "windup";
    // Counter strike ability: reduce windup by 30% if ready
    let windupFrames = modAtk.windup * (!f.isAI ? this._currentWeapon.speedMul : 1);
    if (f.counterStrikeReady && f.counterStrikeWindupMul < 1.0) {
      windupFrames = Math.floor(windupFrames * f.counterStrikeWindupMul);
      f.counterStrikeReady = false;
      f.counterStrikeWindupMul = 1.0;
    }
    f.attackTimer = windupFrames;
    f.attackHit = false; f.blocking = false; f.parrying = false;
    f.riposteReady = false;

    if (f.comboTimer > 0) { f.comboSequence.push(type); f.comboCount++; }
    else { f.comboSequence = [type]; f.comboCount = 1; }
    f.comboTimer = COMBO_WINDOW;

    if (type === "kick") this._playSound("kick", 0.2);
    else if (type === "riposte") this._playSound("riposte", 0.3);
    else if (type === "excalibur") this._playSound("excalibur", 0.4);
    else this._playSound("slash", 0.15);
  }

  private _startBlock(f: Fighter): void {
    if (f.dead || f.staggered || f.knockedDown || f.dodging || f.attackPhase) return;
    if (!f.blockHeld && !f.blocking) { f.parrying = true; f.parryTimer = PARRY_WINDOW; }
    f.blocking = true; f.blockHeld = true;
  }

  private _stopBlock(f: Fighter): void { f.blocking = false; f.blockHeld = false; f.parrying = false; }

  private _startDodge(f: Fighter, dir: number, staminaCost = 20): void {
    if (f.dead || f.staggered || f.knockedDown || f.dodging) return;
    if (f.stamina < staminaCost) return;
    f.stamina -= staminaCost;
    f.dodging = true; f.dodgeTimer = DODGE_FRAMES; f.dodgeDir = dir || -f.facing; f.invulnerable = true;
    f.blocking = false; f.parrying = false; f.attackPhase = null; f.currentAttack = null;
    this._playSound("dodge", 0.2);
    this._spawnDust(f.x, this._groundY, 5);
  }

  private _updateFighter(f: Fighter): void {
    const st = STANCES[f.stance];
    const ts = this._timeScale;

    if (f.dead) {
      f.deathTimer += ts;
      f.targetPose = POSES.death;
      this._applyPose(f.skeleton, f.targetPose, 0.08 * ts);
      f.y = Math.min(f.y, this._groundY + 20);
      this._solveFK(f.skeleton); return;
    }

    // Hit flash decay
    if (f.hitFlash > 0) f.hitFlash -= ts;

    // Wall splat timer decay
    if (f.wallSplatTimer > 0) f.wallSplatTimer -= ts;

    // Whiff punish timer decay
    if (f.whiffPunishTimer > 0) {
      f.whiffPunishTimer -= ts;
      if (f.whiffPunishTimer <= 0) f.whiffPunishAggBoost = 0;
    }

    // Mirror image timer
    if (f.mirrorImageTimer > 0) f.mirrorImageTimer -= ts;

    // Bleed
    if (f.bleedTimer > 0) {
      f.bleedTimer -= ts;
      f.hp -= BLEED_DPS * ts;
      if (this._frameCount % 15 === 0) {
        this._spawnBlood(f.x + rand(-10, 10), f.y - 30, 2, rand(0, Math.PI * 2));
      }
      if (f.hp <= 0) {
        f.hp = 0; f.dead = true; f.deathTimer = 0;
        this._playSound("death", 0.4); this._triggerShake(15);
      }
    }

    // Fire DOT (legacy fireTimer)
    if (f.fireTimer > 0) {
      f.fireTimer -= ts;
      f.hp -= 0.2 * ts;
      if (this._frameCount % 8 === 0) {
        this._spawnParticle(f.x + rand(-10, 10), f.y - rand(10, 50), rand(-0.5, 0.5), rand(-1.5, -0.5), rand(10, 20), rand(2, 4), "#ff8c00", "spark", -0.05);
      }
      if (f.hp <= 0) { f.hp = 0; f.dead = true; f.deathTimer = 0; this._playSound("death", 0.4); this._triggerShake(15); }
    }
    // Burn DOT (new enchantment system)
    if (f.burnTimer > 0) {
      f.burnTimer -= ts;
      f.hp -= 0.2 * ts;
      if (this._frameCount % 6 === 0) {
        this._spawnParticle(f.x + rand(-10, 10), f.y - rand(10, 50), rand(-0.5, 0.5), rand(-1.5, -0.5), rand(10, 20), rand(2, 4), "#ff8c00", "spark", -0.05);
      }
      if (f.hp <= 0) { f.hp = 0; f.dead = true; f.deathTimer = 0; this._playSound("death", 0.4); this._triggerShake(15); }
    }
    // Ice slow (legacy iceTimer)
    if (f.iceTimer > 0) {
      f.iceTimer -= ts;
      if (this._frameCount % 12 === 0) {
        this._spawnParticle(f.x + rand(-10, 10), f.y - rand(10, 40), rand(-0.3, 0.3), rand(-0.8, -0.2), rand(12, 22), rand(2, 5), "#88ccff", "dust", -0.02);
      }
    }
    // Slow timer (new enchantment system)
    if (f.slowTimer > 0) {
      f.slowTimer -= ts;
      if (this._frameCount % 12 === 0) {
        this._spawnParticle(f.x + rand(-10, 10), f.y - rand(10, 40), rand(-0.3, 0.3), rand(-0.8, -0.2), rand(12, 22), rand(2, 5), "#88ccff", "dust", -0.02);
      }
    }
    // Poison DOT + stamina debuff (legacy)
    if (f.poisonTimer > 0) {
      f.poisonTimer -= ts;
      const stackDmg = 0.1 * Math.max(1, f.poisonStacks);
      f.hp -= stackDmg * ts;
      if (this._frameCount % 10 === 0) {
        this._spawnParticle(f.x + rand(-10, 10), f.y - rand(10, 50), rand(-0.5, 0.5), rand(-1.0, -0.3), rand(12, 25), rand(3, 6), "#44cc44", "dust", -0.03);
      }
      if (f.hp <= 0) { f.hp = 0; f.dead = true; f.deathTimer = 0; this._playSound("death", 0.4); this._triggerShake(15); }
      if (f.poisonTimer <= 0) f.poisonStacks = 0;
    }
    // Disarmed timer
    if (f.disarmedTimer > 0) f.disarmedTimer -= ts;

    // Leg hit slow timer
    if (f.legHitSlowTimer > 0) f.legHitSlowTimer -= ts;

    // Vulnerable state (execution finisher)
    if (!f.vulnerable && f.hp > 0 && f.hp < f.maxHp * 0.05 && f.isAI) {
      f.vulnerable = true;
    }
    if (f.vulnerable) {
      // Pulsing red, can't attack, half speed
      f.attackPhase = null; f.currentAttack = null; f.attackType = null;
    }

    // Exhaustion penalty
    if (f.exhausted && f.attackPhase) {
      f.attackTimer += 0.3 * ts; // attacks are slower
    }
    // Slow timer makes attacks slower (attack speed * 1.3 = slower)
    if (f.slowTimer > 0 && f.attackPhase) {
      f.attackTimer += 0.3 * ts;
    }

    if (f.dodging) {
      f.dodgeTimer -= ts;
      f.x += f.dodgeDir * DODGE_SPEED * (f.dodgeTimer / DODGE_FRAMES) * ts;
      f.targetPose = POSES.dodge;
      if (f.dodgeTimer <= 0) { f.dodging = false; f.invulnerable = false; }
    }
    if (f.staggered) { f.staggerTimer -= ts; f.targetPose = POSES.stagger; if (f.staggerTimer <= 0) f.staggered = false; }
    if (f.knockedDown) { f.knockdownTimer -= ts; f.targetPose = POSES.knockdown; if (f.knockdownTimer <= 0) f.knockedDown = false; }

    // Riposte window
    if (f.riposteReady) { f.riposteTimer -= ts; if (f.riposteTimer <= 0) f.riposteReady = false; }

    if (f.attackPhase) {
      f.attackTimer -= ts;
      const poseKey = f.attackType + "_" + f.attackPhase;
      if (POSES[poseKey]) f.targetPose = POSES[poseKey];
      if (f.attackPhase === "windup" && f.attackTimer <= 0) { f.attackPhase = "active"; f.attackTimer = f.currentAttack!.active * (!f.isAI ? this._currentWeapon.speedMul : 1); f.attackHit = false; }
      else if (f.attackPhase === "active" && f.attackTimer <= 0) {
        // Track if attack missed (whiff) for AI whiff-punish
        if (!f.attackHit && !f.isAI) {
          // Player whiffed — AI gets reaction bonus
          if (this._ai && !this._ai.dead) {
            const whiffEnemyDef = this._currentEnemyIdx < ENEMIES.length ? ENEMIES[this._currentEnemyIdx] : { aggression: 0.8 };
            const diffMul = [0.6, 1.0, 1.5][this._difficulty];
            const reactionFrames = Math.max(3, Math.floor(18 - whiffEnemyDef.aggression * 10 * diffMul));
            this._ai.aiTimer = reactionFrames;
            this._ai.whiffPunishTimer = 30;
            this._ai.whiffPunishAggBoost = 0.3;
          }
        }
        f.attackPhase = "recovery"; f.attackTimer = f.currentAttack!.recovery * (!f.isAI ? this._currentWeapon.speedMul : 1);
      }
      else if (f.attackPhase === "recovery" && f.attackTimer <= 0) { f.attackPhase = null; f.currentAttack = null; f.attackType = null; }
    }

    if (f.parrying) { f.parryTimer -= ts; if (f.parryTimer <= 0) f.parrying = false; }
    if (f.comboTimer > 0) { f.comboTimer -= ts; if (f.comboTimer <= 0) { f.comboCount = 0; f.comboSequence = []; } }
    if (f.blocking && !f.attackPhase && !f.staggered && !f.knockedDown && !f.dodging) f.targetPose = POSES.block;

    if (!f.attackPhase && !f.blocking && !f.staggered && !f.knockedDown && !f.dodging) {
      if (f.crouching) f.targetPose = POSES.crouch;
      else if (!f.grounded) f.targetPose = POSES.jump;
      else if (Math.abs(f.vx) > 0.5) {
        f.walkCycle += 0.12 * st.spdMul * ts;
        f.targetPose = this._blendPoses(POSES.walk1, POSES.walk2, (Math.sin(f.walkCycle) + 1) / 2);
        f.stepTimer += ts;
        if (f.stepTimer > 14) { this._playSound("step", 0.05); f.stepTimer = 0; }
      } else {
        f.targetPose = this._getIdlePose(f);
        const breathe = Math.sin(this._frameCount * 0.04) * 0.02;
        f.targetPose = new Float64Array(f.targetPose);
        f.targetPose[J.CHEST] += breathe; f.targetPose[J.SPINE] += breathe * 0.5;
      }
    }

    // Physics
    f.vy += GRAVITY * ts; f.y += f.vy * ts;
    if (f.y >= this._groundY) { f.y = this._groundY; f.vy = 0; f.grounded = true; } else f.grounded = false;
    let speedMod = 1.0;
    if (f.iceTimer > 0) speedMod *= 0.6;
    if (f.slowTimer > 0) speedMod *= 0.7;
    if (f.legHitSlowTimer > 0) speedMod *= 0.7;
    if (f.vulnerable) speedMod *= 0.5;
    f.x += f.vx * ts * speedMod; f.vx *= 0.85;
    f.x = clamp(f.x, 60, this._W - 60);

    // Wall splat check
    this._checkWallSplat(f);

    // Stamina regen
    if (!f.attackPhase && !f.blocking && !f.dodging) {
      let regen = st.staminaRegen + (f.isAI ? 0 : this._bonusStaminaRegen);
      if (f.poisonTimer > 0) regen *= 0.5;
      f.stamina = Math.min(STAMINA_MAX, f.stamina + regen * ts);
    }
    if (f.stamina <= 0) f.exhausted = true;
    if (f.stamina > 25) f.exhausted = false;

    // Rage ability
    if (f.ability === "rage" && f.hp < f.maxHp * 0.4) {
      const rageBaseDmg = this._currentEnemyIdx < ENEMIES.length ? ENEMIES[this._currentEnemyIdx].damage : 1.5;
      f.damageMul = rageBaseDmg * 1.5;
    }

    // Pose + FK
    const blendSpeed = f.attackPhase === "active" ? 0.25 : 0.12;
    this._applyPose(f.skeleton, f.targetPose, blendSpeed * ts);
    f.skeleton.rootX = 0; f.skeleton.rootY = -50 + (f.crouching ? 20 : 0); f.skeleton.scale = 1.3;
    this._solveFK(f.skeleton);

    // Sword tip
    const hand = f.skeleton.bones[J.R_HAND];
    const swordLen = 55 * f.skeleton.scale * (!f.isAI ? this._currentWeapon.length : 1);
    f.swordTipX = f.x + hand.worldX * f.facing + Math.cos(hand.worldAngle * f.facing) * swordLen * f.facing;
    f.swordTipY = f.y + hand.worldY + Math.sin(hand.worldAngle * f.facing) * swordLen;

    if (f.attackPhase === "active" || f.attackPhase === "windup") {
      f.swordTrail.push({ x: f.swordTipX, y: f.swordTipY });
      if (f.swordTrail.length > 14) f.swordTrail.shift();
    } else { if (f.swordTrail.length > 0) f.swordTrail.shift(); }

    // Cape physics
    const chestB = f.skeleton.bones[J.CHEST];
    for (let i = 0; i < f.capeSegments.length; i++) {
      const target = -f.vx * 0.15 + Math.sin(this._frameCount * 0.06 + i * 0.5) * 0.1;
      f.capeSegments[i] = lerp(f.capeSegments[i], target + (chestB.worldAngle - BONE_DEF[J.CHEST][2]) * 0.3, 0.1);
    }
  }

  // ── Sword Clash ──────────────────────────────────────────────────────────

  private _checkSwordClash(): void {
    const p = this._player;
    const ai = this._ai;
    if (!p || !ai || p.dead || ai.dead) return;
    if (p.attackPhase !== "active" || ai.attackPhase !== "active") return;
    if (p.attackHit || ai.attackHit) return;
    const distance = Math.abs(p.x - ai.x);
    const avgReach = ((p.currentAttack?.reach || 70) + (ai.currentAttack?.reach || 70)) / 2 * p.skeleton.scale;
    if (distance > avgReach) return;

    // Clash!
    p.attackPhase = null; p.currentAttack = null; p.attackType = null;
    ai.attackPhase = null; ai.currentAttack = null; ai.attackType = null;
    p.vx = -p.facing * 4;
    ai.vx = -ai.facing * 4;
    const midX = (p.x + ai.x) / 2;
    const midY = (p.y + ai.y) / 2 - 40;
    this._spawnSparks(midX, midY, 30, 2.0);
    this._playSound("clash", 0.5);
    this._triggerShake(10);
    this._hitstopTimer = 8;
    p.stamina = Math.max(0, p.stamina - 10);
    ai.stamina = Math.max(0, ai.stamina - 10);
    this._announce("CLASH!");
  }

  // ── Combat Resolution ────────────────────────────────────────────────────

  private _resolveCombat(attacker: Fighter, defender: Fighter): void {
    if (attacker.attackPhase !== "active" || attacker.attackHit) return;
    if (defender.dead || defender.invulnerable) return;

    const dx = defender.x - attacker.x;
    if ((dx * attacker.facing) <= 0) return;
    const distance = Math.abs(dx);
    const reach = attacker.currentAttack!.reach * attacker.skeleton.scale;
    if (distance > reach) return;
    if (Math.abs(defender.y - attacker.y) > 80) return;

    attacker.attackHit = true;
    const hitX = (attacker.x + defender.x) / 2;
    const hitY = attacker.y - 40;
    const st = STANCES[attacker.stance];

    // Crowd excitement
    this._crowdExcitement = Math.min(1, this._crowdExcitement + 0.15);

    // Excalibur strike and charged slash are unblockable
    const isExcalibur = attacker.attackType === "excalibur";
    const isChargedSlash = attacker.attackType === "chargedSlash";

    // Parry (not for excalibur)
    if (defender.parrying && attacker.attackType !== "kick" && !isExcalibur && !isChargedSlash) {
      // Check for perfect parry: parried within first 3 frames (+ bonus window)
      const perfectWindow = 3 + (defender.isAI ? 0 : this._bonusPerfectWindow);
      const isPerfectParry = defender.parryTimer > PARRY_WINDOW - perfectWindow;

      if (isPerfectParry) {
        // Perfect parry!
        this._playSound("perfectparry", 0.45);
        this._spawnSparks(hitX, hitY, 30, 2.0);
        this._triggerShake(15);
        this._hitstopTimer = HITSTOP_FRAMES + 4;
        this._spawnDamageText(hitX, hitY - 30, "PERFECT!", "#ffd700");
        this._announce("MASTERFUL!");
        // Radial ring effect
        this._perfectParryRing = { x: hitX, y: hitY, r: 10, alpha: 0.9 };
        // Extra super meter
        defender.superMeter = Math.min(SUPER_METER_MAX, defender.superMeter + 25); // 15 base + 10 bonus
        // Crowd throws a rose after perfect parry
        this._spawnCrowdItems(1, "rose");
      } else {
        this._playSound("parry", 0.4);
        this._spawnSparks(hitX, hitY, 25, 1.5);
        this._triggerShake(12);
        this._hitstopTimer = HITSTOP_FRAMES + 2;
        // Normal parry super meter
        defender.superMeter = Math.min(SUPER_METER_MAX, defender.superMeter + 15);
      }

      attacker.staggered = true; attacker.staggerTimer = 25;
      attacker.attackPhase = null; attacker.currentAttack = null;
      defender.parrying = false; defender.blocking = false;
      // Riposte window!
      defender.riposteReady = true; defender.riposteTimer = RIPOSTE_WINDOW;
      if (!defender.isAI) {
        this._stats.parries++;
        if (!isPerfectParry) this._spawnDamageNumber(hitX, hitY - 20, 0, "#4af");
      }
      this._crowdExcitement = Math.min(1, this._crowdExcitement + 0.3);
      if (this._crowdExcitement > 0.5) this._playSound("crowd", 0.15);
      // Bark trigger: enemy parries player
      if (defender.isAI) {
        const enemyIdxParry = this._currentEnemyIdx < ENEMIES.length ? this._currentEnemyIdx : -1;
        const enemyDefParry = enemyIdxParry >= 0 ? ENEMIES[enemyIdxParry] : null;
        if (enemyDefParry?.barks && enemyDefParry.barks.length > 2) {
          this._showDialogue(enemyDefParry.barks[2], "ai");
        }
      }
      // Player bark on perfect parry (20% chance)
      if (!defender.isAI && isPerfectParry && Math.random() < 0.2) {
        this._showDialogue("Too slow!", "player");
      }
      return;
    }

    // Block (not for excalibur or kick)
    if (defender.blocking && attacker.attackType !== "kick" && !isExcalibur && !isChargedSlash) {
      const blockCost = attacker.currentAttack!.damage * 0.8 / STANCES[defender.stance].defMul;
      defender.stamina -= blockCost;
      if (defender.stamina < 0) {
        // Guard break!
        defender.stamina = 0; defender.staggered = true; defender.staggerTimer = 30;
        defender.blocking = false; this._triggerShake(10);
        this._spawnDamageNumber(hitX, hitY - 20, 0, "#f84");
        // Guard break VFX
        this._spawnCrackParticles(hitX, hitY, 15);
        this._guardBreakFlash = 3;
        this._playSound("guardbreak", 0.35);
        this._announce("GUARD BROKEN!");
      }
      this._playSound("clash", 0.35); this._spawnSparks(hitX, hitY, 12);
      this._triggerShake(6); this._hitstopTimer = HITSTOP_FRAMES;
      return;
    }

    // Hit connects
    let damage = attacker.currentAttack!.damage * st.dmgMul * attacker.damageMul;

    // Hit zone determination
    let hitZone = "body";
    const atkType = attacker.attackType || "slash";
    if (atkType === "overhead" || atkType === "airSlash") {
      hitZone = Math.random() < 0.3 ? "head" : "body";
    } else if (atkType === "sweep" || atkType === "kick") {
      hitZone = Math.random() < 0.4 ? "legs" : "body";
    } else if (atkType === "thrust") {
      hitZone = Math.random() < 0.5 ? "torso" : "body";
    } else if (atkType === "slash" || atkType === "chargedSlash" || atkType === "dashAttack") {
      hitZone = Math.random() < 0.15 ? "arms" : "body";
    }

    // Backstab bonus: attacker is behind defender
    const isBackstab = (attacker.x - defender.x) * defender.facing > 0;
    if (isBackstab) {
      damage *= 1.6;
      this._spawnDamageText(hitX, hitY - 40, "BACKSTAB!", "#ffdd00");
      this._triggerShake(15);
    }

    // Riposte bonus
    if (attacker.attackType === "riposte") {
      damage *= 1.8;
      this._crowdExcitement = Math.min(1, this._crowdExcitement + 0.4);
      if (!attacker.isAI) {
        this._stats.ripostes++;
        attacker.superMeter = Math.min(SUPER_METER_MAX, attacker.superMeter + 20);
      }
    }

    // Enchantment damage bonuses
    const attackerEnchant = !attacker.isAI ? this._activeEnchant : "none";
    // Holy: +25% to undead/dark enemies
    if (attackerEnchant === "holy") {
      const enemyName = defender.name || "";
      if (enemyName.indexOf("BLACK") >= 0 || enemyName.indexOf("CRIMSON") >= 0 || enemyName.indexOf("MORGANA") >= 0 || enemyName.indexOf("SHADOW") >= 0) {
        damage *= 1.25;
        this._spawnGoldenParticles(hitX, hitY, 10);
      }
    }

    // Hit zone effects
    if (hitZone === "head") {
      damage *= 1.5;
      this._spawnDamageText(hitX, hitY - 50, "CRITICAL!", "#ffd700");
      this._spawnSparks(hitX, hitY, 12, 1.5);
      this._triggerShake(15);
      this._hitstopTimer += 3;
      if (damage > 20) this._announce("HEADSHOT!");
    } else if (hitZone === "legs") {
      defender.legHitSlowTimer = 40;
    } else if (hitZone === "torso") {
      defender.staggerTimer = Math.max(defender.staggerTimer, (defender.staggered ? defender.staggerTimer : 0) + 8);
      defender.staggered = true;
    } else if (hitZone === "arms") {
      defender.disarmedTimer = 30;
      this._spawnDamageText(hitX, hitY - 50, "DISARMED!", "#ff8844");
    }

    // Player bonuses
    if (!attacker.isAI) damage *= (1 + this._bonusDamage);

    // Enemy ability: ironSkin
    if (defender.ability === "ironSkin") damage *= 0.7;

    // Player defense bonus
    if (!defender.isAI) damage /= (1 + this._bonusDefense);

    // Combo check
    const seq = attacker.comboSequence.join(",");
    let comboTriggered: ComboDef | null = null;
    for (const [pattern, combo] of Object.entries(COMBOS)) {
      if (seq.endsWith(pattern)) { comboTriggered = combo; break; }
    }

    if (comboTriggered) {
      damage *= comboTriggered.dmgBonus;
      this._comboDisplayName = comboTriggered.name;
      this._comboDisplayTimer = 90; this._comboDisplayCount = attacker.comboCount;
      this._playSound("combo", 0.4);
      if (!attacker.isAI) {
        this._stats.combos++;
        attacker.superMeter = Math.min(SUPER_METER_MAX, attacker.superMeter + 12);
      }
      if (comboTriggered.effect === "knockback") defender.vx = attacker.facing * 8;
      else if (comboTriggered.effect === "knockdown") {
        defender.knockedDown = true; defender.knockdownTimer = 45;
        defender.vx = attacker.facing * 5; defender.vy = -4;
      } else if (comboTriggered.effect === "stagger") { defender.staggered = true; defender.staggerTimer = 20; }
    }

    damage /= STANCES[defender.stance].defMul;

    // Air attack ground bounce
    if (attacker.attackType === "airSlash" && !attacker.grounded) {
      defender.vy = -6;
      defender.staggerTimer = Math.max(defender.staggerTimer, 18);
      defender.staggered = true;
    }

    defender.hp -= damage; defender.vx += attacker.facing * 3;

    // Hit flash on defender
    defender.hitFlash = 4;

    // Battle scars: add 1-2 scars at random body positions
    if (defender.scars.length < 12) {
      const scarCount = randInt(1, 2);
      const scarJoints = [J.CHEST, J.SPINE, J.L_UPPER_ARM, J.R_UPPER_ARM, J.L_THIGH, J.R_THIGH, J.NECK];
      for (let si = 0; si < scarCount && defender.scars.length < 12; si++) {
        const jIdx = scarJoints[randInt(0, scarJoints.length - 1)];
        const bone = defender.skeleton.bones[jIdx];
        defender.scars.push({
          x: bone.worldX * defender.facing + rand(-8, 8),
          y: bone.worldY + rand(-8, 8),
          angle: rand(-Math.PI, Math.PI),
          size: rand(4, 10),
        });
      }
    }

    // Super meter: attacker gains for landing hit, defender gains for taking hit
    let attackerSuperRate = attacker.ability === "excaliburWielder" ? 1.5 : 1;
    let defenderSuperRate = defender.ability === "excaliburWielder" ? 1.5 : 1;
    // Arcane Edge weapon gives player faster super charge
    if (!attacker.isAI && this._currentWeapon.id === "arcaneEdge") attackerSuperRate *= 1.4;
    if (!defender.isAI && this._currentWeapon.id === "arcaneEdge") defenderSuperRate *= 1.4;
    attacker.superMeter = Math.min(SUPER_METER_MAX, attacker.superMeter + 8 * attackerSuperRate);
    defender.superMeter = Math.min(SUPER_METER_MAX, defender.superMeter + 5 * defenderSuperRate);

    // Counter strike ability: after being hit, next attack is 30% faster
    if (defender.ability === "counterStrike") {
      defender.counterStrikeReady = true;
      defender.counterStrikeWindupMul = 0.7;
    }

    // Lifesteal ability
    if (attacker.ability === "lifesteal") {
      const healAmount = damage * 0.2;
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
    }
    // Bloodletter weapon lifesteal for player
    if (!attacker.isAI && this._currentWeapon.id === "bloodletter") {
      const healAmount = damage * 0.1;
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
    }

    // Bleed
    const canBleed = attacker.attackType === "kick" ? false :
      (attacker.currentAttack?.canBleed || (!attacker.isAI && this._allCanBleed) || attacker.ability === "poison");
    const weaponBleedBonus = !attacker.isAI ? this._currentWeapon.bleedChance : 0;
    if (canBleed && Math.random() < 0.35 + weaponBleedBonus) {
      defender.bleedTimer = BLEED_DURATION;
      this._playSound("bleed", 0.15);
    }

    // Enchantment effects on hit
    if (attackerEnchant === "fire") {
      defender.burnTimer = 90;
    }
    if (attackerEnchant === "ice") {
      defender.slowTimer = 60;
    }
    if (attackerEnchant === "poison") {
      defender.poisonStacks = Math.min(3, defender.poisonStacks + 1);
      defender.poisonTimer = 120;
    }

    if (!attacker.isAI) this._stats.hitsLanded++;
    if (!defender.isAI) { this._stats.hitsTaken++; this._roundDamageTaken += damage; }

    // Announcer: first blood
    if (!this._firstBloodTriggered) {
      this._firstBloodTriggered = true;
      this._announce("FIRST BLOOD!");
    }

    // Announcer: excalibur
    if (isExcalibur) {
      this._announce("EXCALIBUR!");
    }

    // Announcer: combo 3+
    if (attacker.comboCount >= 3) {
      this._announce("DEVASTATING COMBO!");
    }
    // Crowd throws coins after 4+ hit combo
    if (attacker.comboCount >= 4) {
      this._spawnCrowdItems(randInt(3, 5), "coin");
    }

    // Announcer: near death
    if (!this._nearDeathTriggered && defender.hp > 0 && defender.hp < defender.maxHp * 0.2) {
      this._nearDeathTriggered = true;
      this._announce("NEAR DEATH!");
    }

    if (!defender.knockedDown && !comboTriggered) { defender.staggered = true; defender.staggerTimer = 12; }

    this._playSound("hit", 0.35);
    const bloodDir = attacker.facing === 1 ? 0 : Math.PI;
    this._spawnBlood(hitX, hitY, 8, bloodDir);
    this._spawnSparks(hitX, hitY, 4);

    // Excalibur: golden particles and extra shake
    if (isExcalibur) {
      this._spawnGoldenParticles(hitX, hitY, 25);
      this._triggerShake(25);
      // Crowd throws many coins after Excalibur
      this._spawnCrowdItems(randInt(8, 10), "coin");
    }

    // Damage number with zone label
    const zoneSuffix = hitZone === "head" ? " (HEAD)" : hitZone === "legs" ? " (LEGS)" : hitZone === "arms" ? " (ARMS)" : hitZone === "torso" ? " (TORSO)" : "";
    const dmgText = Math.round(damage).toString() + zoneSuffix;
    this._damageNumbers.push({ x: hitX, y: hitY - 15, text: dmgText, life: 50,
      color: isExcalibur ? "#ffd700" : attacker.attackType === "riposte" ? "#ffd700" : hitZone === "head" ? "#ffd700" : "#ff4444" });
    this._triggerShake(8 + damage * 0.3);
    this._hitstopTimer = HITSTOP_FRAMES;

    // Gold for player hits
    if (!attacker.isAI) {
      let goldGain = Math.floor(damage * 0.5);
      if (this._ngPlus > 0) goldGain = Math.floor(goldGain * (1 + 0.5 * this._ngPlus));
      this._gold += goldGain; this._stats.goldEarned += goldGain;
    }

    // AI taunts on hit landing (3% chance)
    if (attacker.isAI && Math.random() < 0.03) {
      const enemyIdx = this._currentEnemyIdx < ENEMIES.length ? this._currentEnemyIdx : 7;
      const enemyDef = ENEMIES[enemyIdx];
      if (enemyDef.taunts && enemyDef.taunts.length > 0) {
        this._showDialogue(enemyDef.taunts[randInt(0, enemyDef.taunts.length - 1)], "ai");
      }
    }

    // Bark trigger: enemy drops below 50% HP
    if (defender.isAI && defender.hp > 0 && defender.hp < defender.maxHp * 0.5 && !this._aiHalfHpBarked) {
      this._aiHalfHpBarked = true;
      const enemyIdxBark = this._currentEnemyIdx < ENEMIES.length ? this._currentEnemyIdx : -1;
      const enemyDefBark = enemyIdxBark >= 0 ? ENEMIES[enemyIdxBark] : null;
      if (enemyDefBark?.barks && enemyDefBark.barks.length > 0) {
        this._showDialogue(enemyDefBark.barks[0], "ai");
      }
    }
    // Bark trigger: AI lands big hit (>15 damage)
    if (attacker.isAI && damage > 15) {
      const enemyIdxBark2 = this._currentEnemyIdx < ENEMIES.length ? this._currentEnemyIdx : -1;
      const enemyDefBark2 = enemyIdxBark2 >= 0 ? ENEMIES[enemyIdxBark2] : null;
      if (enemyDefBark2?.barks && enemyDefBark2.barks.length > 1) {
        this._showDialogue(enemyDefBark2.barks[1], "ai");
      }
    }
    // Player barks (20% chance)
    if (!attacker.isAI && Math.random() < 0.2) {
      if (attacker.comboCount >= 3) this._showDialogue("For Avalon!", "player");
      else if (isBackstab) this._showDialogue("Behind you.", "player");
      else if (isExcalibur) this._showDialogue("EXCALIBUR!", "player");
    }

    // Low HP dialogue triggers
    if (defender.isAI && defender.hp > 0 && defender.hp < defender.maxHp * 0.3 && !this._aiLowHpTaunted) {
      this._aiLowHpTaunted = true;
      const enemyIdx = this._currentEnemyIdx < ENEMIES.length ? this._currentEnemyIdx : 7;
      const enemyDef = ENEMIES[enemyIdx];
      if (enemyDef.lowHpLine) this._showDialogue(enemyDef.lowHpLine, "ai");
    }
    if (!defender.isAI && defender.hp > 0 && defender.hp < defender.maxHp * 0.3 && !this._playerLowHpTaunted) {
      this._playerLowHpTaunted = true;
      const enemyIdx = this._currentEnemyIdx < ENEMIES.length ? this._currentEnemyIdx : 7;
      const enemyDef = ENEMIES[enemyIdx];
      if (enemyDef.playerLowHpLine) this._showDialogue(enemyDef.playerLowHpLine, "ai");
    }

    if (defender.hp <= 0) {
      defender.hp = 0; defender.dead = true; defender.deathTimer = 0;
      defender.vx = attacker.facing * 6; defender.vy = -5;
      this._playSound("death", 0.4); this._triggerShake(20);
      this._spawnBlood(hitX, hitY, 25, bloodDir);
      // Dramatic death: zoom + flash
      this._deathZoom = {active: true, x: defender.x, y: defender.y - 40, scale: 1.0, targetScale: 1.3, flashAlpha: 1.0};
      // Slow-mo kill cam!
      this._slowmoTimer = SLOWMO_DURATION; this._timeScale = SLOWMO_SCALE;
      this._crowdExcitement = 1;
      this._playSound("crowd", 0.3);
      // Bonus gold for kill
      if (!attacker.isAI) { this._gold += 50; this._stats.goldEarned += 50; }
      // Kill announcement
      if (!attacker.isAI && this._roundDamageTaken === 0) {
        this._announce("FLAWLESS!");
        this._spawnCrowdItems(15, "coin");
      } else {
        this._announce("VANQUISHED!");
      }
    }
  }

  // ── AI ───────────────────────────────────────────────────────────────────

  private _updateAI(ai: Fighter, player: Fighter): void {
    if (ai.dead || this._phase !== "playing") return;

    const dx = player.x - ai.x;
    const distance = Math.abs(dx);
    ai.facing = dx > 0 ? 1 : -1;

    const diffMul = [0.6, 1.0, 1.5][this._difficulty];
    const isArthurBoss = this._ngPlus >= 1 && this._currentEnemyIdx >= ENEMIES.length;
    const enemyDef: EnemyDef = isArthurBoss ? {
      name: "KING ARTHUR", title: "the Once and Future King",
      color: "#d4a843", armorColor: "#886622", swordColor: "#ffd700", plumeColor: "#fff",
      hp: 200, damage: 1.5, aggression: 0.75, parrySkill: 0.5, speed: 1.1,
      taunt: "", defeated: "", ability: "excaliburWielder",
      abilityDesc: "EXCALIBUR WIELDER \u2014 wields the true Excalibur",
      barks: ["For Camelot!", "The crown commands it!", "Worthy..."],
    } : ENEMIES[this._currentEnemyIdx];
    const ngAgg = this._ngPlus * 0.1;
    const ngParry = this._ngPlus * 0.1;
    const reactionFrames = Math.max(3, Math.floor(18 - (enemyDef.aggression + ngAgg) * 10 * diffMul));
    const aggressiveness = (enemyDef.aggression + ngAgg) * diffMul + ai.whiffPunishAggBoost;
    const parryChance = (enemyDef.parrySkill + ngParry) * diffMul;
    const speedMul = enemyDef.speed;

    // ExcaliburWielder ability: use excalibur every 200 frames
    if (ai.ability === "excaliburWielder" && this._frameCount % 200 === 0 && !ai.attackPhase && !ai.staggered && !ai.knockedDown && distance < 120 && distance > 30) {
      this._startAttack(ai, "excalibur");
      this._spawnGoldenParticles(ai.x, ai.y - 40, 15);
      ai.aiTimer = 0;
      return;
    }

    // Mirror image ability: spawn ghost particles every 300 frames
    if (ai.ability === "mirrorImage") {
      ai.mirrorImageTimer++;
      if (ai.mirrorImageTimer >= 300) {
        ai.mirrorImageTimer = 0;
        this._spawnMirrorGhostParticles(ai.x, ai.y);
      }
    }

    // AI super meter usage
    if (ai.superMeter >= SUPER_METER_MAX && distance < 120 && distance > 40 && !ai.attackPhase && !ai.staggered && !ai.knockedDown) {
      const useChance = [0.2, 0.4, 0.7][this._difficulty];
      if (Math.random() < useChance * 0.02) { // checked every frame so low chance per frame
        ai.superMeter = 0;
        this._startAttack(ai, "excalibur");
        this._spawnGoldenParticles(ai.x, ai.y - 40, 15);
        ai.aiTimer = 0;
        return;
      }
    }

    ai.aiTimer++;
    if (ai.aiTimer < reactionFrames && !ai.aiAction) return;
    if (ai.staggered || ai.knockedDown || ai.dodging) { ai.aiAction = null; return; }
    if (ai.attackPhase) return;

    // Riposte opportunity for AI
    if (ai.riposteReady && ai.riposteTimer > 0) {
      this._startAttack(ai, "riposte");
      ai.riposteReady = false; ai.aiTimer = 0;
      return;
    }

    // React to player attacks
    if (player.attackPhase === "windup" || player.attackPhase === "active") {
      if (distance < 100) {
        if (Math.random() < parryChance && !ai.blocking) {
          this._startBlock(ai); ai.parrying = true; ai.parryTimer = PARRY_WINDOW;
          ai.aiTimer = 0; return;
        } else if (Math.random() < 0.25 * diffMul) {
          this._startDodge(ai, player.facing); ai.aiTimer = 0;
          // Shadow step ability
          if (ai.ability === "shadowStep" && Math.random() < 0.5) {
            ai.x = player.x - player.facing * 60; // teleport behind
            this._spawnDust(ai.x, this._groundY, 10);
          }
          return;
        } else if (!ai.blocking) {
          this._startBlock(ai); ai.aiTimer = 0; return;
        }
      }
    }

    if (ai.blocking && !player.attackPhase) { if (Math.random() < 0.1) this._stopBlock(ai); }

    // AI grab at very close range
    if (distance < 40 && !ai.attackPhase && !ai.grabbing && Math.random() < 0.1 * diffMul && ai.stamina >= 18) {
      this._startGrab(ai, player);
      ai.aiTimer = 0;
      return;
    }

    // Movement
    if (distance > 110) {
      ai.vx += ai.facing * MOVE_SPEED * 0.3 * speedMul;
      ai.aiTimer = 0;
    } else if (distance < 45) {
      ai.vx -= ai.facing * MOVE_SPEED * 0.2 * speedMul;
      ai.aiTimer = 0;
    }

    // Dash attack (AI): 10% chance at medium range
    if (distance >= 80 && distance <= 120 && Math.random() < 0.1 * diffMul && ai.stamina >= 16 && !ai.attackPhase) {
      ai.vx = ai.facing * 12;
      this._startAttack(ai, "dashAttack");
      this._spawnDust(ai.x, this._groundY, 5);
      ai.aiTimer = 0;
      return;
    }

    // Attack
    if (distance > 45 && distance < 100 && ai.aiTimer > reactionFrames) {
      if (Math.random() < aggressiveness * 0.7) {
        this._stopBlock(ai);
        // AI combo chains: sometimes do planned sequences
        const comboRoll = Math.random();
        if (comboRoll < 0.15 * diffMul && ai.stamina > 40) {
          // Plan a 2-hit combo
          this._startAttack(ai, "slash");
        } else if (comboRoll < 0.1 * diffMul && ai.stamina > KICK_STAMINA) {
          this._startAttack(ai, "kick");
        } else {
          const attacks = ["slash", "thrust", "overhead", "sweep"];
          const weights = [3, 2, 1, 2];
          if (ai.stamina < 30) { weights[2] = 0; weights[0] = 4; }
          const total = weights.reduce((a, b) => a + b, 0);
          let r = Math.random() * total; let chosen = "slash";
          for (let i = 0; i < attacks.length; i++) { r -= weights[i]; if (r <= 0) { chosen = attacks[i]; break; } }
          this._startAttack(ai, chosen);
        }
        ai.aiTimer = 0;
      }
    }

    // Stance management
    if (Math.random() < 0.008) {
      if (ai.hp < ai.maxHp * 0.3) ai.stance = "defensive";
      else if (ai.stamina > 70 && ai.hp > ai.maxHp * 0.5) ai.stance = "aggressive";
      else ai.stance = "balanced";
    }
  }

  // ── Player Controller ────────────────────────────────────────────────────

  private _updatePlayerController(p: Fighter): void {
    if (p.dead) return;
    const st = STANCES[p.stance];

    // Input buffer: execute buffered action if window is still valid (8 frames)
    if (this._inputBuffer && this._frameCount - this._inputBuffer.time < 8) {
      if (!p.staggered && !p.knockedDown && !p.dead && (!p.attackPhase || p.attackPhase === "recovery")) {
        const bufferedAction = this._inputBuffer.action;
        this._inputBuffer = null;
        if (bufferedAction === "block") {
          this._startBlock(p);
        } else if (bufferedAction === "dodge") {
          const dir = this._keys["a"] ? -1 : this._keys["d"] ? 1 : -p.facing;
          this._startDodge(p, dir);
        } else if (bufferedAction === "grab") {
          this._startGrab(p, this._ai);
        } else {
          this._startAttack(p, bufferedAction);
        }
        return;
      }
    } else {
      this._inputBuffer = null;
    }

    // Execution finisher: R+J simultaneous press near vulnerable enemy
    if (((this._keys["r"] && this._justPressed["j"]) || (this._keys["j"] && this._justPressed["r"])) && this._ai && this._ai.vulnerable && !p.attackPhase && !p.staggered && !p.knockedDown && !p.dodging) {
      const dist = Math.abs(this._ai.x - p.x);
      if (dist < 100) {
        // Trigger execution — slow-mo, rapid 3-slash animation
        this._slowmoTimer = 40; this._timeScale = 0.15;
        // Multi-hit: 3 rapid slashes with trail + sparks
        for (let hitIdx = 0; hitIdx < 3; hitIdx++) {
          const ox = rand(-10, 10);
          const oy = rand(-40, -10);
          this._spawnSparks(this._ai.x + ox, this._ai.y + oy, 10, 1.5);
          this._spawnBlood(this._ai.x + ox, this._ai.y + oy, 10, p.facing === 1 ? 0 : Math.PI);
        }
        p.targetPose = POSES.riposte_active;
        this._ai.hp = 0; this._ai.dead = true; this._ai.deathTimer = 0; this._ai.vulnerable = false;
        this._spawnBlood(this._ai.x, this._ai.y - 30, 30, p.facing === 1 ? 0 : Math.PI);
        this._triggerShake(25);
        this._announce("EXECUTION!");
        this._playSound("death", 0.5);
        this._gold += 100; this._stats.goldEarned += 100;
        this._crowdExcitement = 1;
        this._playSound("crowd", 0.3);
        this._playSound("crowd", 0.2);
        this._deathZoom = {active: true, x: this._ai.x, y: this._ai.y - 40, scale: 1.0, targetScale: 1.3, flashAlpha: 1.0};
        return;
      }
    }

    // Dash attack: double-tap direction detection
    if (this._justPressed["a"] || this._justPressed["arrowleft"]) {
      if (this._lastDirPress.dir === -1 && this._frameCount - this._lastDirPress.time <= 10 && !this._dashing) {
        this._dashing = true;
        this._dashTimer = 15;
        this._dashStartTime = this._frameCount;
        p.vx = -12;
        p.facing = this._ai ? (this._ai.x > p.x ? 1 : -1) : p.facing;
        this._spawnDust(p.x, this._groundY, 5);
      }
      this._lastDirPress = {dir: -1, time: this._frameCount};
    }
    if (this._justPressed["d"] || this._justPressed["arrowright"]) {
      if (this._lastDirPress.dir === 1 && this._frameCount - this._lastDirPress.time <= 10 && !this._dashing) {
        this._dashing = true;
        this._dashTimer = 15;
        this._dashStartTime = this._frameCount;
        p.vx = 12;
        p.facing = this._ai ? (this._ai.x > p.x ? 1 : -1) : p.facing;
        this._spawnDust(p.x, this._groundY, 5);
      }
      this._lastDirPress = {dir: 1, time: this._frameCount};
    }

    // Dashing state
    if (this._dashing) {
      this._dashTimer--;
      // Afterimage effect
      if (this._frameCount % 2 === 0) {
        this._spawnParticle(p.x + rand(-5, 5), p.y - rand(10, 40), 0, 0, 8, rand(5, 10), "rgba(180,180,255,0.3)", "dust", 0);
      }
      if (this._justPressed["j"] && this._frameCount - this._dashStartTime <= 15) {
        // Convert dash to dash attack
        this._dashing = false;
        this._dashTimer = 0;
        this._startAttack(p, "dashAttack");
        return;
      }
      if (this._dashTimer <= 0) {
        this._dashing = false;
      }
    }

    if (!p.staggered && !p.knockedDown && !p.dodging) {
      if (this._keys["a"] || this._keys["arrowleft"]) p.vx -= MOVE_SPEED * 0.4 * st.spdMul;
      if (this._keys["d"] || this._keys["arrowright"]) p.vx += MOVE_SPEED * 0.4 * st.spdMul;
      if ((this._justPressed["w"] || this._justPressed["arrowup"]) && p.grounded && !p.blocking) { p.vy = JUMP_FORCE; p.grounded = false; }
      p.crouching = !!(this._keys["s"] || this._keys["arrowdown"]) && p.grounded && !p.attackPhase;
    }

    const dx = this._ai.x - p.x;
    if (Math.abs(dx) > 10) p.facing = dx > 0 ? 1 : -1;

    // Feint: during windup, press SPACE to cancel into a dodge
    if (p.attackPhase === "windup" && this._justPressed[" "]) {
      p.attackPhase = null; p.currentAttack = null; p.attackType = null;
      // Add "feint" to combo sequence
      if (p.comboTimer > 0) { p.comboSequence.push("feint"); }
      else { p.comboSequence = ["feint"]; }
      p.comboTimer = COMBO_WINDOW;
      const dir = this._keys["a"] ? -1 : this._keys["d"] ? 1 : -p.facing;
      this._startDodge(p, dir, 10); // feint dodge costs only 10 stamina
      return;
    }

    // Super meter: press R to activate Excalibur Strike (not when there's a vulnerable enemy nearby)
    const nearVulnerable = this._ai && this._ai.vulnerable && Math.abs(this._ai.x - p.x) < 100;
    if (this._justPressed["r"] && !nearVulnerable && p.superMeter >= SUPER_METER_MAX && !p.attackPhase && !p.staggered && !p.knockedDown && !p.dodging) {
      p.superMeter = 0;
      this._startAttack(p, "excalibur");
      this._spawnGoldenParticles(p.x, p.y - 40, 20);
      this._triggerShake(12);
      return;
    }

    // Riposte: if riposte ready and attack pressed, do riposte
    if (p.riposteReady && p.riposteTimer > 0) {
      if (this._justPressed["j"] || this._justPressed["k"] || this._justPressed["u"] || this._justPressed["i"]) {
        this._startAttack(p, "riposte");
        p.riposteReady = false;
        return;
      }
    }

    // Grab: press G at close range (with buffering)
    if (this._justPressed["g"]) {
      if (p.attackPhase || p.staggered || p.knockedDown) {
        this._inputBuffer = { action: "grab", time: this._frameCount };
      } else if (!p.grabbing) {
        this._startGrab(p, this._ai);
      }
    }

    // Charged Heavy Attack: hold J to charge
    if (this._keys["j"] && !p.attackPhase && !p.grabbing && p.grounded && !this._charging) {
      // Start charging on first frame of holding J
      if (this._justPressed["j"]) {
        this._charging = true;
        this._chargeTimer = 0;
      }
    }
    if (this._charging) {
      this._chargeTimer++;
      // Spawn golden sparks while charging every 4 frames
      if (this._chargeTimer % 4 === 0) {
        const hand = p.skeleton.bones[J.R_HAND];
        const sx = p.x + hand.worldX * p.facing;
        const sy = p.y + hand.worldY;
        this._chargeSparks.push({ x: sx + rand(-5, 5), y: sy + rand(-5, 5), life: 12, vx: rand(-1, 1), vy: rand(-2, -0.5) });
      }
      // Release or timer exceeds threshold
      if (!this._keys["j"]) {
        if (this._chargeTimer >= 25) {
          // Execute charged slash
          this._charging = false;
          this._chargeTimer = 0;
          this._startAttack(p, "chargedSlash");
          this._spawnSparks(p.x + p.facing * 30, p.y - 40, 12, 1.5);
          this._announce("CHARGED STRIKE!");
        } else {
          // Released too early — do normal slash
          this._charging = false;
          this._chargeTimer = 0;
          if (!p.grounded) this._startAttack(p, "airSlash");
          else this._startAttack(p, "slash");
        }
      }
      // If charging but gets staggered/etc, cancel
      if (p.staggered || p.knockedDown || p.dodging || p.attackPhase) {
        this._charging = false;
        this._chargeTimer = 0;
      }
    } else {
      // Air slash: press J while airborne (only when not charging)
      if (this._justPressed["j"] && !p.grounded) {
        this._startAttack(p, "airSlash");
      }
    }
    // Attack inputs with buffering
    const tryAttack = (key: string, type: string) => {
      if (this._justPressed[key]) {
        if (p.attackPhase || p.staggered || p.knockedDown) {
          this._inputBuffer = { action: type, time: this._frameCount };
        } else {
          this._startAttack(p, type);
        }
      }
    };
    tryAttack("k", "thrust");
    tryAttack("u", "overhead");
    tryAttack("i", "sweep");
    tryAttack("f", "kick");

    if (this._keys["l"]) {
      if (p.attackPhase || p.staggered || p.knockedDown) {
        if (this._justPressed["l"]) this._inputBuffer = { action: "block", time: this._frameCount };
      } else {
        this._startBlock(p);
      }
    } else if (p.blocking) this._stopBlock(p);

    if (this._justPressed[" "]) {
      if (p.attackPhase || p.staggered || p.knockedDown) {
        this._inputBuffer = { action: "dodge", time: this._frameCount };
      } else {
        const dir = this._keys["a"] ? -1 : this._keys["d"] ? 1 : -p.facing;
        this._startDodge(p, dir);
      }
    }

    if (this._justPressed["1"]) p.stance = "aggressive";
    if (this._justPressed["2"]) p.stance = "balanced";
    if (this._justPressed["3"]) p.stance = "defensive";
  }

  // ── Drawing ──────────────────────────────────────────────────────────────

  private _getTorchPositions(): number[] {
    const W = this._W;
    return [W * 0.12, W * 0.88, W * 0.35, W * 0.65];
  }

  private _drawBackground(): void {
    const c = this._ctx; const W = this._W, H = this._H, gY = this._groundY;

    // Sky — varies by arena style
    const skyGrad = c.createLinearGradient(0, 0, 0, gY);
    if (this._arenaStyle === 0) {
      // Nighttime castle
      skyGrad.addColorStop(0, "#0a0515"); skyGrad.addColorStop(0.4, "#1a0e25");
      skyGrad.addColorStop(0.7, "#2a1535"); skyGrad.addColorStop(1, "#3a2040");
    } else if (this._arenaStyle === 1) {
      // Twilight courtyard — orange/purple
      skyGrad.addColorStop(0, "#1a0830"); skyGrad.addColorStop(0.3, "#4a1545");
      skyGrad.addColorStop(0.6, "#8a3030"); skyGrad.addColorStop(1, "#c06020");
    } else if (this._arenaStyle === 2) {
      // Stormy fortress — dark grey
      skyGrad.addColorStop(0, "#0a0a10"); skyGrad.addColorStop(0.4, "#1a1a25");
      skyGrad.addColorStop(0.7, "#2a2a35"); skyGrad.addColorStop(1, "#353540");
    } else {
      // Volcanic/hellish — red/black
      skyGrad.addColorStop(0, "#0a0000"); skyGrad.addColorStop(0.3, "#1a0505");
      skyGrad.addColorStop(0.6, "#3a0a0a"); skyGrad.addColorStop(1, "#5a1510");
    }
    c.fillStyle = skyGrad; c.fillRect(0, 0, W, gY);

    // Stars (not for stormy/volcanic)
    if (this._arenaStyle <= 1) {
      for (let i = 0; i < 80; i++) {
        const sx = ((42 * (i + 1) * 7919) % W);
        const sy = ((42 * (i + 1) * 6271) % (gY * 0.6));
        const twinkle = Math.sin(this._frameCount * 0.02 + i) * 0.15;
        c.fillStyle = `rgba(255,255,220,${0.3 + (i % 3) * 0.2 + twinkle})`;
        c.fillRect(sx, sy, 1.5, 1.5);
      }
    }

    // Moon (not for stormy/volcanic)
    if (this._arenaStyle <= 1) {
      const moonAlpha = this._arenaStyle === 1 ? 0.08 : 0.12;
      c.fillStyle = `rgba(255,250,220,${moonAlpha})`; c.beginPath(); c.arc(W * 0.8, H * 0.12, 45, 0, Math.PI * 2); c.fill();
      c.fillStyle = `rgba(255,250,220,${moonAlpha * 2})`; c.beginPath(); c.arc(W * 0.8, H * 0.12, 32, 0, Math.PI * 2); c.fill();
      c.fillStyle = `rgba(255,250,220,${moonAlpha * 4})`; c.beginPath(); c.arc(W * 0.8, H * 0.12, 22, 0, Math.PI * 2); c.fill();
    }

    // Lightning for stormy arena (style 2)
    if (this._arenaStyle === 2) {
      this._lightningTimer++;
      if (this._lightningTimer >= 180 && Math.random() < 0.003) {
        this._lightningFlash = 2;
        this._lightningTimer = 0;
        // Generate zigzag bolt
        this._lightningBolt = [];
        let lx = rand(W * 0.2, W * 0.8);
        let ly = 0;
        while (ly < gY - 200) {
          const nx = lx + rand(-40, 40);
          const ny = ly + rand(20, 50);
          this._lightningBolt.push({ x1: lx, y1: ly, x2: nx, y2: ny });
          lx = nx; ly = ny;
        }
        this._triggerShake(5);
      }
      if (this._lightningFlash > 0) {
        c.fillStyle = `rgba(255,255,255,${this._lightningFlash * 0.15})`;
        c.fillRect(0, 0, W, H);
        // Draw bolt
        c.strokeStyle = "rgba(255,255,255,0.9)"; c.lineWidth = 2;
        for (const seg of this._lightningBolt) {
          c.beginPath(); c.moveTo(seg.x1, seg.y1); c.lineTo(seg.x2, seg.y2); c.stroke();
        }
        c.strokeStyle = "rgba(200,200,255,0.4)"; c.lineWidth = 6;
        for (const seg of this._lightningBolt) {
          c.beginPath(); c.moveTo(seg.x1, seg.y1); c.lineTo(seg.x2, seg.y2); c.stroke();
        }
        this._lightningFlash--;
      }
    }

    // Volcanic lava glow at ground for style 3
    if (this._arenaStyle === 3) {
      const lavaGlow = c.createLinearGradient(0, gY - 60, 0, gY);
      lavaGlow.addColorStop(0, "rgba(255,60,0,0)");
      lavaGlow.addColorStop(1, `rgba(255,80,10,${0.12 + Math.sin(this._frameCount * 0.02) * 0.04})`);
      c.fillStyle = lavaGlow; c.fillRect(0, gY - 60, W, 60);
    }

    // Castle silhouette — varies by arena style
    const castleColor = this._arenaStyle === 0 ? "#0d0818" : this._arenaStyle === 1 ? "#1a0820" : this._arenaStyle === 2 ? "#0a0a12" : "#0a0000";
    c.fillStyle = castleColor; c.fillRect(0, gY - 200, W, 200);
    for (let i = 0; i < 7; i++) {
      const tx = W * (0.07 + i * 0.14);
      const th = 50 + (i % 3) * 35 + (i === 3 ? 30 : 0) + (this._arenaStyle === 2 ? 15 : 0);
      c.fillRect(tx - 22, gY - 200 - th, 44, th);
      for (let ci = -2; ci <= 2; ci++) c.fillRect(tx + ci * 9 - 3, gY - 200 - th - 10, 6, 10);
    }
    const windowColor = this._arenaStyle === 3 ? "rgba(255,80,20," : "rgba(255,180,50,";
    for (let i = 0; i < 12; i++) {
      c.fillStyle = `${windowColor}${0.08 + Math.sin(this._frameCount * 0.03 + i) * 0.04})`;
      c.fillRect(W * (0.06 + i * 0.08) - 2, gY - 140 + (i % 3) * 18, 4, 8);
    }

    // Crowd silhouettes in stands
    c.fillStyle = "#150e20";
    c.fillRect(0, gY - 50, W, 50);
    for (let i = 0; i < 40; i++) {
      const cx = W * (i / 40) + rand(-5, 5);
      const cy = gY - 30 + (i % 3) * 8;
      const bob = Math.sin(this._frameCount * 0.08 + i * 1.5) * (1 + this._crowdExcitement * 3);
      c.fillStyle = `rgba(${40 + (i * 7) % 30}, ${30 + (i * 11) % 20}, ${50 + (i * 3) % 20}, 0.7)`;
      c.beginPath(); c.arc(cx, cy + bob, 5, 0, Math.PI * 2); c.fill();
      c.fillRect(cx - 3, cy + bob + 3, 6, 8);
    }

    // Ground
    const groundGrad = c.createLinearGradient(0, gY, 0, H);
    groundGrad.addColorStop(0, "#3a2a1a"); groundGrad.addColorStop(0.3, "#2a1c10"); groundGrad.addColorStop(1, "#1a0e05");
    c.fillStyle = groundGrad; c.fillRect(0, gY, W, H - gY);
    c.strokeStyle = "#5a4a30"; c.lineWidth = 2; c.beginPath(); c.moveTo(0, gY); c.lineTo(W, gY); c.stroke();

    // Puddles (rain)
    this._drawPuddles();

    // Fire pits
    this._drawFirePits();

    // Blood decals on ground
    for (const bd of this._bloodDecals) {
      c.fillStyle = `rgba(100,0,0,${bd.alpha})`;
      c.beginPath(); c.ellipse(bd.x, bd.y + 2, bd.size, bd.size * 0.3, 0, 0, Math.PI * 2); c.fill();
    }

    // Floor tiles
    c.strokeStyle = "rgba(90,74,48,0.15)"; c.lineWidth = 1;
    for (let i = 0; i < W; i += 60) { c.beginPath(); c.moveTo(i, gY); c.lineTo(i, H); c.stroke(); }
    for (let j = gY + 30; j < H; j += 30) { c.beginPath(); c.moveTo(0, j); c.lineTo(W, j); c.stroke(); }

    // Torches
    const torchPositions = this._getTorchPositions();
    for (const tx of torchPositions) {
      c.fillStyle = "#2a1c10"; c.fillRect(tx - 6, gY - 130, 12, 130);
      c.fillStyle = "#3a2a1a"; c.fillRect(tx - 10, gY - 135, 20, 8);
      const ff = Math.sin(this._frameCount * 0.15 + tx) * 3;
      const glowRad = 28 + ff;
      const glow = c.createRadialGradient(tx, gY - 138, 2, tx, gY - 138, glowRad);
      glow.addColorStop(0, "rgba(255,150,30,0.35)"); glow.addColorStop(0.5, "rgba(255,100,20,0.08)"); glow.addColorStop(1, "rgba(255,50,10,0)");
      c.fillStyle = glow; c.fillRect(tx - glowRad, gY - 138 - glowRad, glowRad * 2, glowRad * 2);
      c.fillStyle = "#ff8020"; c.beginPath(); c.ellipse(tx, gY - 140 - ff, 3, 7 + ff * 0.4, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#ffcc44"; c.beginPath(); c.ellipse(tx, gY - 139, 1.5, 3, 0, 0, Math.PI * 2); c.fill();
      if (this._frameCount % 5 === 0) this._spawnParticle(tx + rand(-2, 2), gY - 142, rand(-0.2, 0.2), rand(-1.2, -0.4), rand(12, 25), rand(1, 2.5), "rgba(255,150,30,0.5)", "spark", -0.03);

      // Dynamic torchlight — warm radial gradient overlay extending to arena floor
      const floorGlowRad = 180;
      const floorGlow = c.createRadialGradient(tx, gY - 100, 5, tx, gY, floorGlowRad);
      floorGlow.addColorStop(0, "rgba(255,140,40,0.06)");
      floorGlow.addColorStop(0.5, "rgba(255,100,20,0.03)");
      floorGlow.addColorStop(1, "rgba(255,60,10,0)");
      c.fillStyle = floorGlow;
      c.fillRect(tx - floorGlowRad, gY - 100 - floorGlowRad, floorGlowRad * 2, floorGlowRad * 2 + 100);
    }

    // Banners
    for (const bx of [W * 0.25, W * 0.5, W * 0.75]) {
      const wave = Math.sin(this._frameCount * 0.025 + bx * 0.01) * 3;
      c.fillStyle = "#3a1010"; c.beginPath();
      c.moveTo(bx - 14, gY - 160); c.lineTo(bx + 14, gY - 160);
      c.lineTo(bx + 11 + wave, gY - 95); c.lineTo(bx + wave, gY - 85);
      c.lineTo(bx - 11 + wave, gY - 95); c.closePath(); c.fill();
      c.fillStyle = "#d4a843"; c.font = "16px Georgia"; c.textAlign = "center";
      c.fillText("\u2694", bx + wave * 0.5, gY - 120);
      c.fillStyle = "#5a4a30"; c.fillRect(bx - 2, gY - 168, 4, 12);
    }
  }

  private _computeLightLevel(fighterX: number): number {
    // Compute brightness modifier based on distance to nearest torch
    const torchPositions = this._getTorchPositions();
    let minDist = Infinity;
    for (const tx of torchPositions) {
      const dist = Math.abs(fighterX - tx);
      if (dist < minDist) minDist = dist;
    }
    // Close to torch: bright. Far: dark. Range ~0-250 pixels
    const maxDist = 250;
    const normalized = clamp(minDist / maxDist, 0, 1);
    // Light level: 1.0 near torch, 0.5 far away
    return lerp(1.0, 0.5, normalized);
  }

  private _drawLimb(j1: number, j2: number, w1: number, w2: number, color: string, sk: Skeleton, f: number): void {
    const c = this._ctx;
    const b1 = sk.bones[j1], b2 = sk.bones[j2];
    const x1 = b1.worldX * f, y1 = b1.worldY, x2 = b2.worldX * f, y2 = b2.worldY;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const px = Math.sin(angle), py = -Math.cos(angle);
    c.fillStyle = color; c.beginPath();
    c.moveTo(x1 - px * w1, y1 - py * w1); c.lineTo(x2 - px * w2, y2 - py * w2);
    c.lineTo(x2 + px * w2, y2 + py * w2); c.lineTo(x1 + px * w1, y1 + py * w1);
    c.closePath(); c.fill();
  }

  private _drawJoint(j: number, r: number, color: string, sk: Skeleton, f: number): void {
    const c = this._ctx; const b = sk.bones[j];
    c.fillStyle = color; c.beginPath(); c.arc(b.worldX * f, b.worldY, r, 0, Math.PI * 2); c.fill();
  }

  private _applyLightToColor(color: string, lightLevel: number): string {
    // Parse color and apply brightness modifier
    const num = parseInt(color.replace("#", "").replace(/^rgb\(/,"").replace(/\)/,""), 16);
    if (isNaN(num)) return color;
    const r = clamp(Math.round(((num >> 16) & 0xff) * lightLevel), 0, 255);
    const g = clamp(Math.round(((num >> 8) & 0xff) * lightLevel), 0, 255);
    const b = clamp(Math.round((num & 0xff) * lightLevel), 0, 255);
    return `rgb(${r},${g},${b})`;
  }

  private _drawFighter(fighter: Fighter): void {
    const c = this._ctx;
    c.save(); c.translate(fighter.x, fighter.y);
    if (fighter.dodging) {
      c.globalAlpha = 0.25; c.save(); c.translate(-fighter.dodgeDir * 20, 0);
      this._drawFighterBody(fighter); c.restore();
      c.globalAlpha = 0.15; c.save(); c.translate(-fighter.dodgeDir * 35, 0);
      this._drawFighterBody(fighter); c.restore();
      c.globalAlpha = 1;
    }
    this._drawFighterBody(fighter);

    // Hit flash overlay
    if (fighter.hitFlash > 0) {
      c.save();
      c.globalCompositeOperation = "lighter";
      c.globalAlpha = 0.3;
      this._drawFighterBody(fighter);
      c.restore();
    }

    // Burning: orange glow outline
    if (fighter.burnTimer > 0) {
      c.save();
      c.globalCompositeOperation = "lighter";
      c.globalAlpha = 0.2 + Math.sin(this._frameCount * 0.15) * 0.1;
      c.shadowColor = "#ff8c00";
      c.shadowBlur = 15;
      c.fillStyle = "#ff8c00";
      c.fillRect(-25, -75, 50, 80);
      c.restore();
    }

    // Ice/slow tint overlay
    if (fighter.iceTimer > 0 || fighter.slowTimer > 0) {
      c.save();
      c.globalCompositeOperation = "multiply";
      c.globalAlpha = 0.3;
      c.fillStyle = "#88ccff";
      c.fillRect(-30, -80, 60, 90);
      c.restore();
    }

    // Poisoned: green drip particles
    if (fighter.poisonTimer > 0 || fighter.poisonStacks > 0) {
      c.save();
      c.globalAlpha = 0.4;
      c.fillStyle = "#44cc44";
      for (let pi = 0; pi < fighter.poisonStacks; pi++) {
        const dripY = -60 + Math.sin(this._frameCount * 0.1 + pi * 2.0) * 15;
        const dripX = -8 + pi * 8;
        c.beginPath(); c.arc(dripX, dripY, 2, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(dripX, dripY + 4, 1.5, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }

    // Vulnerable pulsing red overlay
    if (fighter.vulnerable) {
      c.save();
      c.globalCompositeOperation = "lighter";
      c.globalAlpha = 0.15 + Math.sin(this._frameCount * 0.2) * 0.1;
      c.fillStyle = "#ff0000";
      c.fillRect(-30, -80, 60, 90);
      c.restore();
      // Flashing "EXECUTE [R+J]" text
      const execAlpha = 0.6 + Math.sin(this._frameCount * 0.2) * 0.4;
      c.fillStyle = `rgba(255,50,50,${execAlpha})`;
      c.font = "bold 14px Georgia"; c.textAlign = "center";
      c.fillText("EXECUTE [R+J]", 0, -95);
    }

    c.restore();
  }

  private _drawFighterBody(fighter: Fighter): void {
    const c = this._ctx; const sk = fighter.skeleton; const f = fighter.facing;

    // Compute dynamic torchlight level
    const lightLevel = this._computeLightLevel(fighter.x);

    const skinColorBase = fighter.isAI ? "#4a3a2a" : "#c4a080";
    const armorDarkBase = fighter.isAI ? fighter.armorColor : "#555";
    const armorLightBase = fighter.isAI ? shadeColor(fighter.armorColor, 25) : "#777";
    const armorAccentBase = fighter.isAI ? fighter.color : "#886622";

    // Apply light level to colors
    const skinColor = this._applyLightToColor(skinColorBase, lightLevel);
    const armorDark = this._applyLightToColor(armorDarkBase, lightLevel);
    const armorLight = this._applyLightToColor(armorLightBase, lightLevel);
    const armorAccent = this._applyLightToColor(armorAccentBase, lightLevel);

    const stanceColor = STANCES[fighter.stance].color;

    // Cape (drawn behind)
    const chest = sk.bones[J.CHEST]; const neck = sk.bones[J.NECK];
    const capeX = neck.worldX * f; const capeY = neck.worldY;
    c.strokeStyle = fighter.isAI ? fighter.color : "#602020"; c.lineWidth = 3;
    c.beginPath(); c.moveTo(capeX, capeY);
    for (let i = 0; i < fighter.capeSegments.length; i++) {
      const segLen = 10;
      const cx = capeX - f * (i + 1) * 6 + fighter.capeSegments[i] * 15 * -f;
      const cy = capeY + (i + 1) * segLen;
      c.lineTo(cx, cy);
    }
    c.stroke();
    // Cape fill
    c.fillStyle = fighter.isAI ? `${fighter.color}44` : "rgba(96,32,32,0.3)";
    c.beginPath(); c.moveTo(capeX - 5 * f, capeY);
    for (let i = 0; i < fighter.capeSegments.length; i++) {
      c.lineTo(capeX - f * (i + 1) * 6 + fighter.capeSegments[i] * 15 * -f - 4 * f, capeY + (i + 1) * 10);
    }
    for (let i = fighter.capeSegments.length - 1; i >= 0; i--) {
      c.lineTo(capeX - f * (i + 1) * 6 + fighter.capeSegments[i] * 15 * -f + 4 * f, capeY + (i + 1) * 10);
    }
    c.lineTo(capeX + 5 * f, capeY); c.closePath(); c.fill();

    // Legs
    this._drawLimb(J.L_HIP, J.L_THIGH, 5, 7, armorDark, sk, f);
    this._drawLimb(J.L_THIGH, J.L_SHIN, 7, 5, armorLight, sk, f);
    this._drawLimb(J.L_SHIN, J.L_FOOT, 5, 4, armorDark, sk, f);
    this._drawJoint(J.L_THIGH, 4, armorAccent, sk, f);
    this._drawLimb(J.R_HIP, J.R_THIGH, 5, 7, armorDark, sk, f);
    this._drawLimb(J.R_THIGH, J.R_SHIN, 7, 5, armorLight, sk, f);
    this._drawLimb(J.R_SHIN, J.R_FOOT, 5, 4, armorDark, sk, f);
    this._drawJoint(J.R_THIGH, 4, armorAccent, sk, f);
    this._drawJoint(J.L_FOOT, 5, armorDark, sk, f);
    this._drawJoint(J.R_FOOT, 5, armorDark, sk, f);

    // Torso
    this._drawLimb(J.PELVIS, J.SPINE, 10, 12, armorDark, sk, f);
    this._drawLimb(J.SPINE, J.CHEST, 12, 14, armorLight, sk, f);
    this._drawLimb(J.CHEST, J.NECK, 12, 6, armorLight, sk, f);

    // Chest plate detail
    const spine = sk.bones[J.SPINE];
    c.strokeStyle = armorAccent; c.lineWidth = 2; c.beginPath();
    c.moveTo(spine.worldX * f - 8 * f, spine.worldY);
    c.lineTo(chest.worldX * f, chest.worldY - 4);
    c.lineTo(spine.worldX * f + 8 * f, spine.worldY); c.stroke();

    // Chainmail texture on torso — subtle dots grid
    c.save();
    c.globalAlpha = 0.15;
    c.fillStyle = armorAccent;
    const spX = spine.worldX * f; const spY = spine.worldY;
    const chX = chest.worldX * f; const chY = chest.worldY;
    for (let row = 0; row < 5; row++) {
      const t = (row + 1) / 6;
      const rowX = lerp(spX, chX, t);
      const rowY = lerp(spY, chY, t);
      for (let col = -2; col <= 2; col++) {
        c.fillRect(rowX + col * 4, rowY, 1.5, 1.5);
      }
    }
    c.restore();

    // Gorget (neck guard) — small trapezoid at neck
    const neckB = sk.bones[J.NECK];
    c.fillStyle = armorAccent; c.beginPath();
    const nX = neckB.worldX * f;
    const nY = neckB.worldY;
    c.moveTo(nX - 7, nY + 2); c.lineTo(nX + 7, nY + 2);
    c.lineTo(nX + 5, nY - 4); c.lineTo(nX - 5, nY - 4);
    c.closePath(); c.fill();

    // Knee guards — small circles at thigh ends
    const lThigh = sk.bones[J.L_THIGH];
    const rThigh = sk.bones[J.R_THIGH];
    c.fillStyle = armorAccent;
    c.beginPath(); c.arc(lThigh.worldX * f, lThigh.worldY, 4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(rThigh.worldX * f, rThigh.worldY, 4, 0, Math.PI * 2); c.fill();

    // Belt
    const pelvis = sk.bones[J.PELVIS];
    c.fillStyle = armorAccent; c.fillRect(pelvis.worldX * f - 10, pelvis.worldY - 2, 20, 4);

    // Pauldrons
    this._drawJoint(J.L_SHOULDER, 8, armorAccent, sk, f);
    this._drawJoint(J.R_SHOULDER, 8, armorAccent, sk, f);

    // Shield on left arm
    const lHand = sk.bones[J.L_HAND]; const lForearm = sk.bones[J.L_FOREARM];
    const shieldAngle = lForearm.worldAngle;
    const shieldX = (lHand.worldX + lForearm.worldX) * 0.5 * f;
    const shieldY = (lHand.worldY + lForearm.worldY) * 0.5;
    c.save(); c.translate(shieldX, shieldY); c.rotate(shieldAngle * f);
    c.fillStyle = armorDark;
    c.beginPath(); c.moveTo(-8, -12); c.lineTo(8, -12); c.lineTo(6, 12); c.lineTo(0, 16); c.lineTo(-6, 12); c.closePath(); c.fill();
    c.strokeStyle = armorAccent; c.lineWidth = 1.5; c.stroke();
    // Shield emblem
    c.fillStyle = armorAccent; c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill();
    c.restore();

    // Arms
    this._drawLimb(J.L_SHOULDER, J.L_UPPER_ARM, 4, 5, skinColor, sk, f);
    this._drawLimb(J.L_UPPER_ARM, J.L_FOREARM, 5, 4, skinColor, sk, f);
    // Vambraces (forearm armor) — slightly thicker with accent border
    this._drawLimb(J.L_FOREARM, J.L_HAND, 5, 4, armorDark, sk, f);
    this._drawLimb(J.L_FOREARM, J.L_HAND, 4, 3, skinColor, sk, f);
    this._drawJoint(J.L_UPPER_ARM, 3, armorAccent, sk, f);
    this._drawLimb(J.R_SHOULDER, J.R_UPPER_ARM, 4, 5, skinColor, sk, f);
    this._drawLimb(J.R_UPPER_ARM, J.R_FOREARM, 5, 4, skinColor, sk, f);
    // Vambraces (forearm armor)
    this._drawLimb(J.R_FOREARM, J.R_HAND, 5, 4, armorDark, sk, f);
    this._drawLimb(J.R_FOREARM, J.R_HAND, 4, 3, skinColor, sk, f);
    this._drawJoint(J.R_UPPER_ARM, 3, armorAccent, sk, f);
    this._drawJoint(J.L_HAND, 4, armorDark, sk, f);
    this._drawJoint(J.R_HAND, 4, armorDark, sk, f);

    // Battle scars
    if (fighter.scars.length > 0) {
      c.save();
      c.strokeStyle = "rgba(120,20,20,0.6)";
      c.lineWidth = 1.5;
      for (const scar of fighter.scars) {
        c.beginPath();
        const sx = scar.x;
        const sy = scar.y;
        const halfLen = scar.size / 2;
        c.moveTo(sx - Math.cos(scar.angle) * halfLen, sy - Math.sin(scar.angle) * halfLen);
        c.lineTo(sx + Math.cos(scar.angle) * halfLen, sy + Math.sin(scar.angle) * halfLen);
        c.stroke();
      }
      c.restore();
    }

    // Sword
    const hand = sk.bones[J.R_HAND];
    const swordAngle = hand.worldAngle;
    const hx = hand.worldX * f, hy = hand.worldY;
    const swordLen = 55 * sk.scale * (!fighter.isAI ? this._currentWeapon.length : 1);

    c.save();
    c.shadowColor = stanceColor;
    c.shadowBlur = fighter.attackPhase === "active" ? 18 : (fighter.riposteReady ? 12 : 5);
    if (fighter.riposteReady) c.shadowColor = "#ffd700";
    // Enchantment sword glow
    if (!fighter.isAI && this._activeEnchant !== "none") {
      const enchGlowColors: Record<string, string> = { fire: "#ff8c00", ice: "#88ccff", holy: "#fffacd", poison: "#44cc44" };
      c.shadowColor = enchGlowColors[this._activeEnchant] || stanceColor;
      if (!fighter.attackPhase) c.shadowBlur = 8 + Math.sin(this._frameCount * 0.08) * 3;
      else c.shadowBlur = 15;
    }
    // Excalibur golden glow
    if (fighter.attackType === "excalibur" && fighter.attackPhase) {
      c.shadowColor = "#ffd700";
      c.shadowBlur = 30;
    }
    // Super meter full glow
    if (fighter.superMeter >= SUPER_METER_MAX && !fighter.attackPhase) {
      c.shadowColor = "#ffd700";
      c.shadowBlur = 10 + Math.sin(this._frameCount * 0.1) * 5;
    }
    const tipX = hx + Math.cos(swordAngle * f) * swordLen * f;
    const tipY = hy + Math.sin(swordAngle * f) * swordLen;
    // Blade
    const bladeColor = (fighter.attackType === "excalibur" && fighter.attackPhase) ? "#ffd700" : (!fighter.isAI ? this._currentWeapon.color : fighter.swordColor);
    // Disarmed: sword flickers at 50% alpha alternating frames
    if (fighter.disarmedTimer > 0) {
      c.globalAlpha = this._frameCount % 2 === 0 ? 0.5 : 0.2;
    }
    c.strokeStyle = bladeColor; c.lineWidth = 3.5;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(tipX, tipY); c.stroke();
    c.strokeStyle = "#fff"; c.lineWidth = 1; c.globalAlpha = fighter.disarmedTimer > 0 ? 0.3 : 0.6;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(tipX, tipY); c.stroke();
    c.globalAlpha = 1; c.restore();

    // Cross guard
    const gA = swordAngle + Math.PI / 2;
    c.strokeStyle = "#d4a843"; c.lineWidth = 3; c.beginPath();
    c.moveTo(hx - Math.cos(gA * f) * 9 * f, hy - Math.sin(gA * f) * 9);
    c.lineTo(hx + Math.cos(gA * f) * 9 * f, hy + Math.sin(gA * f) * 9); c.stroke();

    // Pommel
    c.fillStyle = "#d4a843"; c.beginPath();
    c.arc(hx - Math.cos(swordAngle * f) * 7 * f, hy - Math.sin(swordAngle * f) * 7, 3.5, 0, Math.PI * 2); c.fill();

    // Head / Helmet
    const head = sk.bones[J.HEAD];
    const headX = head.worldX * f, headY = head.worldY;
    c.fillStyle = armorLight; c.beginPath(); c.arc(headX, headY - 2, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#111"; c.beginPath(); c.arc(headX + 3 * f, headY, 5, -0.3, 0.8); c.fill();

    // Helmet plume
    c.strokeStyle = fighter.plumeColor; c.lineWidth = 3;
    c.beginPath(); c.moveTo(headX - 2 * f, headY - 12);
    const plumeWave = Math.sin(this._frameCount * 0.1 + fighter.x * 0.01) * 3;
    c.quadraticCurveTo(headX - 8 * f + plumeWave, headY - 22, headX - 15 * f + plumeWave, headY - 18);
    c.stroke();

    // Eyes
    c.fillStyle = fighter.isAI ? "#c04040" : "#ddd";
    c.fillRect(headX + 2 * f, headY - 2, 2, 1.5);
    c.fillRect(headX + 5 * f, headY - 2, 2, 1.5);

    // Bleed indicator
    if (fighter.bleedTimer > 0) {
      c.fillStyle = `rgba(180,0,0,${0.3 + Math.sin(this._frameCount * 0.2) * 0.15})`;
      c.beginPath(); c.ellipse(0, -60, 15, 3, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#c00"; c.font = "10px Georgia"; c.textAlign = "center";
      c.fillText("BLEEDING", 0, -65);
    }

    // Riposte ready indicator
    if (fighter.riposteReady && !fighter.isAI) {
      c.fillStyle = `rgba(255,215,0,${0.5 + Math.sin(this._frameCount * 0.15) * 0.3})`;
      c.font = "bold 14px Georgia"; c.textAlign = "center";
      c.fillText("RIPOSTE!", 0, -80);
    }

    // Super meter full indicator
    if (fighter.superMeter >= SUPER_METER_MAX && !fighter.isAI) {
      c.fillStyle = `rgba(255,215,0,${0.6 + Math.sin(this._frameCount * 0.12) * 0.3})`;
      c.font = "bold 14px Georgia"; c.textAlign = "center";
      c.fillText("R - EXCALIBUR!", 0, -95);
    }

    // Stance glow
    if (!fighter.dead) {
      c.fillStyle = stanceColor;
      c.globalAlpha = 0.15 + Math.sin(this._frameCount * 0.06) * 0.05;
      c.beginPath(); c.ellipse(0, 0, 25, 5, 0, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
  }

  private _drawSwordTrail(trail: TrailPoint[]): void {
    if (trail.length < 2) return;
    const c = this._ctx;
    for (let i = 1; i < trail.length; i++) {
      const alpha = (i / trail.length) * 0.5; const width = (i / trail.length) * 5;
      c.strokeStyle = `rgba(200,220,255,${alpha})`; c.lineWidth = width;
      c.beginPath(); c.moveTo(trail[i - 1].x, trail[i - 1].y); c.lineTo(trail[i].x, trail[i].y); c.stroke();
      c.strokeStyle = `rgba(150,180,255,${alpha * 0.3})`; c.lineWidth = width * 3;
      c.beginPath(); c.moveTo(trail[i - 1].x, trail[i - 1].y); c.lineTo(trail[i].x, trail[i].y); c.stroke();
    }
  }

  private _drawParticles(): void {
    const c = this._ctx;
    for (const p of this._particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      c.save(); c.globalAlpha = alpha; c.translate(p.x, p.y); c.rotate(p.rot);
      if (p.type === "spark") {
        c.fillStyle = p.color; c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        c.globalAlpha = alpha * 0.5; c.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
      } else if (p.type === "blood") {
        c.fillStyle = p.color; c.beginPath(); c.arc(0, 0, p.size * alpha, 0, Math.PI * 2); c.fill();
      } else if (p.type === "crack") {
        // Thin angular white crack particles
        c.strokeStyle = p.color; c.lineWidth = p.size * 0.8; c.globalAlpha = alpha;
        c.beginPath(); c.moveTo(-p.size * 2, 0); c.lineTo(p.size * 2, 0); c.stroke();
      } else {
        c.fillStyle = p.color; c.beginPath(); c.arc(0, 0, p.size, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
    // Damage numbers
    for (const d of this._damageNumbers) {
      const alpha = clamp(d.life / 30, 0, 1);
      c.save(); c.globalAlpha = alpha;
      c.fillStyle = d.color;
      // Check if it's a text label (non-numeric)
      const isText = isNaN(parseFloat(d.text));
      c.font = `bold ${isText ? 20 : (d.text === "0" ? 14 : 18)}px Georgia`; c.textAlign = "center";
      if (d.text === "0") c.fillText("PARRY!", d.x, d.y);
      else c.fillText(d.text, d.x, d.y);
      // Add glow for special text
      if (d.color === "#ffd700") {
        c.shadowColor = "#ffd700"; c.shadowBlur = 10;
        c.fillText(d.text === "0" ? "PARRY!" : d.text, d.x, d.y);
        c.shadowBlur = 0;
      }
      c.restore();
    }
    // Perfect parry ring
    if (this._perfectParryRing) {
      const ring = this._perfectParryRing;
      c.save();
      c.globalAlpha = ring.alpha;
      c.strokeStyle = "#fff";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      c.stroke();
      // Inner glow
      c.strokeStyle = "#ffd700";
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(ring.x, ring.y, ring.r * 0.8, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    // Crowd thrown items
    for (const ci of this._crowdItems) {
      const alpha = clamp(ci.life / 30, 0, 1);
      c.save();
      c.globalAlpha = alpha;
      if (ci.type === "coin") {
        c.fillStyle = "#ffd700";
        c.beginPath(); c.arc(ci.x, ci.y, 4, 0, Math.PI * 2); c.fill();
        // Shine
        c.fillStyle = "#fff";
        c.globalAlpha = alpha * 0.5;
        c.beginPath(); c.arc(ci.x - 1, ci.y - 1, 1.5, 0, Math.PI * 2); c.fill();
      } else if (ci.type === "rose") {
        c.fillStyle = "#cc2244";
        c.beginPath(); c.arc(ci.x, ci.y, 3, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#dd4466";
        c.beginPath(); c.arc(ci.x + 2, ci.y - 1, 2, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(ci.x - 2, ci.y - 1, 2, 0, Math.PI * 2); c.fill();
        // Stem
        c.strokeStyle = "#228822";
        c.lineWidth = 1;
        c.beginPath(); c.moveTo(ci.x, ci.y + 3); c.lineTo(ci.x, ci.y + 10); c.stroke();
      }
      c.restore();
    }
  }

  private _drawBar(x: number, y: number, w: number, h: number, ratio: number, color: string, bgColor: string): void {
    const c = this._ctx; ratio = clamp(ratio, 0, 1);
    c.fillStyle = bgColor; c.fillRect(x, y, w, h);
    const grad = c.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, color); grad.addColorStop(1, shadeColor(color, -30));
    c.fillStyle = grad; c.fillRect(x, y, w * ratio, h);
    c.strokeStyle = "rgba(212,168,67,0.4)"; c.lineWidth = 1; c.strokeRect(x, y, w, h);
  }

  private _drawSuperBar(x: number, y: number, w: number, h: number, ratio: number): void {
    const c = this._ctx; ratio = clamp(ratio, 0, 1);
    c.fillStyle = "#1a1200"; c.fillRect(x, y, w, h);
    const grad = c.createLinearGradient(x, y, x + w * ratio, y);
    grad.addColorStop(0, "#b8860b"); grad.addColorStop(0.5, "#ffd700"); grad.addColorStop(1, "#b8860b");
    c.fillStyle = grad; c.fillRect(x, y, w * ratio, h);
    c.strokeStyle = "rgba(212,168,67,0.5)"; c.lineWidth = 1; c.strokeRect(x, y, w, h);
    // Glow effect when full
    if (ratio >= 1) {
      c.save();
      c.shadowColor = "#ffd700";
      c.shadowBlur = 8 + Math.sin(this._frameCount * 0.1) * 4;
      c.strokeStyle = "#ffd700"; c.lineWidth = 1.5;
      c.strokeRect(x, y, w, h);
      c.restore();
    }
  }

  // ── Dialogue System ──────────────────────────────────────────────────
  private _showDialogue(text: string, speaker: string): void {
    this._dialogueText = text;
    this._dialogueTimer = 90;
    this._dialogueSpeaker = speaker;
  }

  private _drawDialogue(): void {
    if (this._dialogueTimer <= 0) return;
    this._dialogueTimer--;
    const c = this._ctx;
    const alpha = this._dialogueTimer > 20 ? 1 : this._dialogueTimer / 20;
    const speaker = this._dialogueSpeaker === "ai" ? this._ai : this._player;
    if (!speaker) return;
    const bx = speaker.x;
    const by = speaker.y - 90;
    c.save();
    c.globalAlpha = alpha;
    c.font = "13px Georgia";
    const tw = c.measureText(this._dialogueText).width + 16;
    const bh = 24;
    // Speech bubble
    c.fillStyle = "rgba(255,255,255,0.9)";
    c.beginPath();
    const rx = bx - tw / 2;
    const ry = by - bh / 2;
    const r = 6;
    c.moveTo(rx + r, ry); c.lineTo(rx + tw - r, ry);
    c.arcTo(rx + tw, ry, rx + tw, ry + r, r);
    c.lineTo(rx + tw, ry + bh - r);
    c.arcTo(rx + tw, ry + bh, rx + tw - r, ry + bh, r);
    c.lineTo(rx + r, ry + bh);
    c.arcTo(rx, ry + bh, rx, ry + bh - r, r);
    c.lineTo(rx, ry + r);
    c.arcTo(rx, ry, rx + r, ry, r);
    c.closePath();
    c.fill();
    // Triangle pointer
    c.beginPath();
    c.moveTo(bx - 5, by + bh / 2);
    c.lineTo(bx, by + bh / 2 + 8);
    c.lineTo(bx + 5, by + bh / 2);
    c.closePath();
    c.fill();
    // Text
    c.fillStyle = "#222";
    c.textAlign = "center";
    c.fillText(this._dialogueText, bx, by + 5);
    c.restore();
  }

  // ── Floor Reflections ────────────────────────────────────────────────
  private _drawFighterReflection(fighter: Fighter): void {
    if (!fighter || fighter.dead) return;
    const c = this._ctx;
    const gY = this._groundY;
    c.save();
    c.translate(fighter.x, gY);
    c.scale(1, -0.3);
    c.globalAlpha = 0.08;
    // Draw simplified dark silhouette
    const sk = fighter.skeleton;
    const f = fighter.facing;
    const drawSilLimb = (j1: number, j2: number, w: number) => {
      const b1 = sk.bones[j1], b2 = sk.bones[j2];
      const x1 = b1.worldX * f, y1 = b1.worldY, x2 = b2.worldX * f, y2 = b2.worldY;
      c.beginPath();
      c.moveTo(x1, y1); c.lineTo(x2, y2);
      c.lineWidth = w; c.stroke();
    };
    c.strokeStyle = "#000";
    drawSilLimb(J.PELVIS, J.SPINE, 10);
    drawSilLimb(J.SPINE, J.CHEST, 12);
    drawSilLimb(J.CHEST, J.NECK, 8);
    drawSilLimb(J.L_HIP, J.L_THIGH, 6);
    drawSilLimb(J.L_THIGH, J.L_SHIN, 5);
    drawSilLimb(J.R_HIP, J.R_THIGH, 6);
    drawSilLimb(J.R_THIGH, J.R_SHIN, 5);
    drawSilLimb(J.L_SHOULDER, J.L_UPPER_ARM, 4);
    drawSilLimb(J.L_UPPER_ARM, J.L_FOREARM, 4);
    drawSilLimb(J.R_SHOULDER, J.R_UPPER_ARM, 4);
    drawSilLimb(J.R_UPPER_ARM, J.R_FOREARM, 4);
    // Head
    const head = sk.bones[J.HEAD];
    c.fillStyle = "#000";
    c.beginPath(); c.arc(head.worldX * f, head.worldY, 8, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  private _drawUI(): void {
    const c = this._ctx; const W = this._W, H = this._H;
    const barW = Math.min(300, W * 0.22); const barH = 20;
    const staminaW = barW * 0.85; const staminaH = 12; const margin = 20;
    const superW = barW * 0.75; const superH = 8;

    // Player
    c.fillStyle = "#d4a843"; c.font = "16px Georgia"; c.textAlign = "left";
    c.fillText(this._player.name, margin, margin - 4);
    this._drawBar(margin, margin, barW, barH, this._player.hp / this._player.maxHp, "#a03030", "#301010");
    this._drawBar(margin, margin + barH + 4, staminaW, staminaH, this._player.stamina / STAMINA_MAX, "#30803a", "#102a10");
    // Player super meter
    this._drawSuperBar(margin, margin + barH + staminaH + 8, superW, superH, this._player.superMeter / SUPER_METER_MAX);
    c.fillStyle = STANCES[this._player.stance].color; c.font = "12px Georgia"; c.textAlign = "left";
    c.fillText(this._player.stance.toUpperCase(), margin, margin + barH + staminaH + superH + 22);

    // Gold
    c.fillStyle = "#ffd700"; c.font = "14px Georgia"; c.textAlign = "left";
    c.fillText(`\u2726 ${this._gold} gold`, margin, margin + barH + staminaH + superH + 40);

    // Enchantment indicator
    if (this._activeEnchant !== "none") {
      const enchColors: Record<string, string> = { fire: "#ff8c00", ice: "#88ccff", holy: "#ffd700", poison: "#44cc44" };
      c.fillStyle = enchColors[this._activeEnchant] || "#fff";
      c.font = "11px Georgia"; c.textAlign = "left";
      c.fillText(`[${this._activeEnchant.toUpperCase()}]`, margin + 100, margin + barH + staminaH + superH + 40);
    }

    // Fire/Ice/Poison/Burn/Slow/Disarm status icons next to HP bars
    { let statusY = margin + 14;
      const drawStatus = (f: Fighter, x: number, align: string) => {
        let sy = statusY;
        c.font = "10px Georgia";
        c.textAlign = align as CanvasTextAlign;
        if (f.fireTimer > 0 || f.burnTimer > 0) { c.fillStyle = "#ff6600"; c.fillText("BURN", x, sy); sy += 12; }
        if (f.iceTimer > 0 || f.slowTimer > 0) { c.fillStyle = "#88ccff"; c.fillText("SLOW", x, sy); sy += 12; }
        if (f.poisonTimer > 0) { c.fillStyle = "#44cc44"; c.fillText(`POISON x${f.poisonStacks}`, x, sy); sy += 12; }
        if (f.disarmedTimer > 0) { c.fillStyle = "#ff8844"; c.fillText("DISARMED", x, sy); }
      };
      drawStatus(this._player, margin + barW + 4, "left");
      drawStatus(this._ai, W - margin - barW - 4, "right");
    }

    // Round indicator
    const totalRounds = this._ngPlus >= 1 ? ENEMIES.length + 1 : ENEMIES.length;
    const ngLabel = this._ngPlus > 0 ? ` | NG+ LEVEL ${this._ngPlus}` : "";
    c.fillStyle = "#d4a843"; c.font = "13px Georgia"; c.textAlign = "center";
    c.fillText(`ROUND ${this._currentEnemyIdx + 1} / ${totalRounds}${ngLabel}`, W / 2, margin);

    // AI
    const enemy = this._currentEnemyIdx < ENEMIES.length ? ENEMIES[this._currentEnemyIdx] : null;
    c.textAlign = "right"; c.fillStyle = "#c04040"; c.font = "16px Georgia";
    c.fillText(this._ai.name, W - margin, margin - 4);
    this._drawBar(W - margin - barW, margin, barW, barH, this._ai.hp / this._ai.maxHp, "#a03030", "#301010");
    this._drawBar(W - margin - staminaW, margin + barH + 4, staminaW, staminaH, this._ai.stamina / STAMINA_MAX, "#30803a", "#102a10");
    // AI super meter
    this._drawSuperBar(W - margin - superW, margin + barH + staminaH + 8, superW, superH, this._ai.superMeter / SUPER_METER_MAX);
    c.fillStyle = STANCES[this._ai.stance].color; c.font = "12px Georgia"; c.textAlign = "right";
    c.fillText(this._ai.stance.toUpperCase(), W - margin, margin + barH + staminaH + superH + 22);

    // Enemy ability
    const abilityDescText = enemy?.abilityDesc || (this._ai.ability === "excaliburWielder" ? "EXCALIBUR WIELDER \u2014 commands the true Excalibur" : "");
    if (abilityDescText) {
      c.fillStyle = "#886"; c.font = "11px Georgia"; c.textAlign = "right";
      c.fillText(abilityDescText, W - margin, margin + barH + staminaH + superH + 38);
    }

    // Combo display
    if (this._comboDisplayTimer > 0) {
      this._comboDisplayTimer--;
      const alpha = clamp(this._comboDisplayTimer / 30, 0, 1);
      const scale = 1 + (1 - alpha) * 0.5;
      c.save(); c.globalAlpha = alpha;
      c.fillStyle = "#ffd700"; c.font = `bold ${Math.floor(28 * scale)}px Georgia`;
      c.textAlign = "center"; c.shadowColor = "#ffd700"; c.shadowBlur = 15;
      c.fillText(this._comboDisplayName, W / 2, H * 0.2);
      c.shadowBlur = 0; c.fillStyle = "#fff"; c.font = `${Math.floor(18 * scale)}px Georgia`;
      c.fillText(`${this._comboDisplayCount} HIT COMBO!`, W / 2, H * 0.2 + 30); c.restore();
    }

    if (this._player.comboCount > 1 && this._player.comboTimer > 0) {
      c.fillStyle = "#ffd700"; c.font = "bold 20px Georgia"; c.textAlign = "left";
      c.globalAlpha = clamp(this._player.comboTimer / 10, 0, 1);
      c.fillText(`${this._player.comboCount}x`, margin, margin + barH + staminaH + superH + 58); c.globalAlpha = 1;
    }

    // Slow-mo indicator
    if (this._slowmoTimer > 0) {
      c.fillStyle = `rgba(255,215,0,${0.3 + Math.sin(this._frameCount * 0.1) * 0.15})`;
      c.font = "bold 24px Georgia"; c.textAlign = "center";
      c.fillText("FINISHING BLOW", W / 2, H * 0.35);
    }

    // Guard break flash overlay
    if (this._guardBreakFlash > 0) {
      c.save();
      c.fillStyle = `rgba(255,255,255,${this._guardBreakFlash * 0.1})`;
      c.fillRect(0, 0, W, H);
      c.restore();
    }

    c.fillStyle = "rgba(160,128,64,0.3)"; c.font = "11px Georgia"; c.textAlign = "center";
    c.fillText("J-Slash(hold=Charge)  K-Thrust  U-Overhead  I-Sweep  F-Kick  G-Grab  L-Block/Parry  SPACE-Dodge  R-Super  1/2/3-Stance  ESC-Quit", W / 2, H - 12);
  }

  // ── Weapon Unlocking ────────────────────────────────────────────────────
  private _unlockWeaponForEnemy(enemyIdx: number): void {
    const unlockMap: Record<number, string> = {
      0: "verdantBlade",    // Sir Cedric — Verdant Blade
      1: "duelistRapier",   // Sir Galeth
      2: "ironCleaver",     // Sir Hector — Iron Cleaver
      3: "thornwhip",       // Lady Isolde — Thornwhip
      4: "shadowDirk",      // Sir Agravain — Shadow Dirk
      5: "bloodletter",     // Crimson Knight — Bloodletter
      6: "arcaneEdge",      // Lady Morgana — Arcane Edge
      7: "abyssalGreatsword", // Black Knight — Abyssal Greatsword
    };
    const weapId = unlockMap[enemyIdx];
    if (weapId && !this._unlockedWeapons.has(weapId)) {
      this._unlockedWeapons.add(weapId);
      const weapDefs = this._getUnlockedWeaponDefs();
      const unlocked = weapDefs.find(w => w.id === weapId);
      if (unlocked) {
        this._weaponUnlockNotify = unlocked.name;
        this._weaponUnlockTimer = 120;
      }
    }
  }

  // Unlock Arthur's weapon (called when Arthur defeated in NG+)
  private _unlockArthurWeapon(): void {
    if (!this._unlockedWeapons.has("trueExcalibur")) {
      this._unlockedWeapons.add("trueExcalibur");
      this._weaponUnlockNotify = "True Excalibur";
      this._weaponUnlockTimer = 120;
    }
  }

  private _getUnlockedWeaponDefs(): WeaponDef[] {
    const unlocked: WeaponDef[] = [];
    if (this._unlockedWeapons.has("verdantBlade")) {
      unlocked.push({ id: "verdantBlade", name: "Verdant Blade", desc: "Cedric's blade. Slight speed bonus.", damageMul: 0.95, speedMul: 0.85, reachMul: 0.95, staminaMul: 0.85, bleedChance: 0.1, color: "#44aa44", length: 0.95 });
    }
    if (this._unlockedWeapons.has("duelistRapier")) {
      unlocked.push({ id: "duelistRapier", name: "Duelist's Rapier", desc: "Galeth's precise rapier.", damageMul: 0.8, speedMul: 0.7, reachMul: 1.1, staminaMul: 0.75, bleedChance: 0, color: "#8899cc", length: 1.1 });
    }
    if (this._unlockedWeapons.has("ironCleaver")) {
      unlocked.push({ id: "ironCleaver", name: "Iron Cleaver", desc: "Hector's iron cleaver. High damage, slow.", damageMul: 1.45, speedMul: 1.4, reachMul: 1.2, staminaMul: 1.35, bleedChance: 0.1, color: "#888899", length: 1.3 });
    }
    if (this._unlockedWeapons.has("thornwhip")) {
      unlocked.push({ id: "thornwhip", name: "Thornwhip", desc: "Isolde's thorn blade. Max bleed.", damageMul: 1.0, speedMul: 1.0, reachMul: 1.05, staminaMul: 1.0, bleedChance: 0.45, color: "#dd5588", length: 1.05 });
    }
    if (this._unlockedWeapons.has("shadowDirk")) {
      unlocked.push({ id: "shadowDirk", name: "Shadow Dirk", desc: "Agravain's dirk. Fastest, low reach.", damageMul: 0.7, speedMul: 0.55, reachMul: 0.8, staminaMul: 0.6, bleedChance: 0, color: "#334", length: 0.85 });
    }
    if (this._unlockedWeapons.has("bloodletter")) {
      unlocked.push({ id: "bloodletter", name: "Bloodletter", desc: "Crimson's blade. Lifesteal effect.", damageMul: 1.1, speedMul: 1.0, reachMul: 1.0, staminaMul: 1.0, bleedChance: 0.2, color: "#cc4444", length: 1.0 });
    }
    if (this._unlockedWeapons.has("arcaneEdge")) {
      unlocked.push({ id: "arcaneEdge", name: "Arcane Edge", desc: "Morgana's blade. Super charges faster.", damageMul: 0.95, speedMul: 0.9, reachMul: 1.0, staminaMul: 0.9, bleedChance: 0, color: "#aa66ff", length: 1.0 });
    }
    if (this._unlockedWeapons.has("abyssalGreatsword")) {
      unlocked.push({ id: "abyssalGreatsword", name: "Abyssal Greatsword", desc: "Black Knight's cursed sword. Highest damage.", damageMul: 1.5, speedMul: 1.4, reachMul: 1.25, staminaMul: 1.35, bleedChance: 0.15, color: "#4444aa", length: 1.35 });
    }
    if (this._unlockedWeapons.has("trueExcalibur")) {
      unlocked.push({ id: "trueExcalibur", name: "True Excalibur", desc: "Arthur's blade. Balanced perfection.", damageMul: 1.2, speedMul: 0.9, reachMul: 1.1, staminaMul: 0.85, bleedChance: 0.15, color: "#ffd700", length: 1.15 });
    }
    return unlocked;
  }

  // ── Overlays ─────────────────────────────────────────────────────────────

  private _showTitle(): void {
    this._titleOverlay = document.createElement("div");
    this._titleOverlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;z-index:60;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:radial-gradient(ellipse at center, rgba(30,15,5,0.92) 0%, rgba(10,5,2,0.98) 100%);font-family:Georgia,serif;`;
    this._titleOverlay.innerHTML = `
      <div style="font-size:72px;color:#d4a843;text-shadow:0 0 30px rgba(212,168,67,0.5),0 4px 8px rgba(0,0,0,0.8);letter-spacing:8px;margin-bottom:10px;text-align:center">SWORD OF AVALON</div>
      <div style="font-size:22px;color:#8b6914;letter-spacing:4px;margin-bottom:15px;text-align:center">A TALE OF STEEL AND HONOR</div>
      <div style="font-size:14px;color:#665;letter-spacing:2px;margin-bottom:40px;text-align:center">TOURNAMENT OF 8 KNIGHTS &mdash; SHOP BETWEEN ROUNDS</div>
      <div style="background:rgba(212,168,67,0.08);border:1px solid rgba(212,168,67,0.2);border-radius:8px;padding:24px 36px;margin-bottom:40px;max-width:700px">
        <div style="color:#d4a843;margin-bottom:12px;font-size:18px;letter-spacing:2px">CONTROLS</div>
        <div style="color:#a08040;font-size:14px;line-height:1.8">
          <span style="color:#d4a843;font-weight:bold">A/D</span> Move &nbsp;
          <span style="color:#d4a843;font-weight:bold">W</span> Jump &nbsp;
          <span style="color:#d4a843;font-weight:bold">S</span> Crouch &nbsp;
          <span style="color:#d4a843;font-weight:bold">J</span> Slash (air: Air Slash) &nbsp;
          <span style="color:#d4a843;font-weight:bold">K</span> Thrust &nbsp;
          <span style="color:#d4a843;font-weight:bold">U</span> Overhead<br>
          <span style="color:#d4a843;font-weight:bold">I</span> Sweep &nbsp;
          <span style="color:#d4a843;font-weight:bold">F</span> Kick &nbsp;
          <span style="color:#d4a843;font-weight:bold">L</span> Block/Parry &nbsp;
          <span style="color:#d4a843;font-weight:bold">SPACE</span> Dodge (during windup: Feint) &nbsp;
          <span style="color:#d4a843;font-weight:bold">R</span> Super Attack<br>
          <span style="color:#d4a843;font-weight:bold">1/2/3</span> Stance &nbsp;
          <span style="color:#88a">Parry then attack = <span style="color:#ffd700">RIPOSTE</span> (bonus damage!)</span>
        </div>
      </div>
      <div id="soa-diff" style="display:flex;gap:12px;margin-bottom:20px"></div>
      <div style="color:#d4a843;font-size:16px;letter-spacing:2px;margin-bottom:10px">CHOOSE YOUR WEAPON</div>
      <div id="soa-weapons" style="display:flex;gap:8px;margin-bottom:25px;flex-wrap:wrap;justify-content:center"></div>
      <div style="display:flex;gap:12px;margin-bottom:20px">
        <button id="soa-start" style="padding:16px 48px;font-size:22px;font-family:Georgia,serif;
          background:linear-gradient(180deg,#d4a843 0%,#8b6914 100%);color:#1a0e05;border:2px solid #d4a843;
          border-radius:4px;cursor:pointer;letter-spacing:3px;text-transform:uppercase">ENTER THE TOURNAMENT</button>
        <button id="soa-training" style="padding:16px 32px;font-size:18px;font-family:Georgia,serif;
          background:rgba(212,168,67,0.12);color:#d4a843;border:1px solid rgba(212,168,67,0.4);
          border-radius:4px;cursor:pointer;letter-spacing:2px;text-transform:uppercase">TRAINING</button>
      </div>`;
    document.body.appendChild(this._titleOverlay);

    const diffDiv = this._titleOverlay.querySelector("#soa-diff") as HTMLDivElement;
    ["SQUIRE", "KNIGHT", "CHAMPION"].forEach((name, idx) => {
      const btn = document.createElement("button");
      btn.textContent = name;
      btn.style.cssText = `padding:10px 24px;font-size:16px;font-family:Georgia,serif;
        background:rgba(212,168,67,${idx === this._difficulty ? 0.25 : 0.1});
        color:${idx === this._difficulty ? "#d4a843" : "#a08040"};
        border:1px solid ${idx === this._difficulty ? "#d4a843" : "rgba(212,168,67,0.3)"};
        border-radius:4px;cursor:pointer;letter-spacing:2px`;
      btn.addEventListener("click", () => {
        this._difficulty = idx;
        diffDiv.querySelectorAll("button").forEach((b, bi) => {
          (b as HTMLButtonElement).style.background = `rgba(212,168,67,${bi === idx ? 0.25 : 0.1})`;
          (b as HTMLButtonElement).style.color = bi === idx ? "#d4a843" : "#a08040";
          (b as HTMLButtonElement).style.borderColor = bi === idx ? "#d4a843" : "rgba(212,168,67,0.3)";
        });
      });
      diffDiv.appendChild(btn);
    });

    // Weapon selection buttons (base + unlocked)
    const weapDiv = this._titleOverlay.querySelector("#soa-weapons") as HTMLDivElement;
    // All possible enemy weapon IDs for display
    const allPossibleEnemyWeaponIds = [
      "verdantBlade", "duelistRapier", "ironCleaver", "thornwhip",
      "shadowDirk", "bloodletter", "arcaneEdge", "abyssalGreatsword", "trueExcalibur",
    ];
    const renderWeapons = () => {
      weapDiv.innerHTML = "";
      const unlockedWeapDefs = this._getUnlockedWeaponDefs();
      const allWeapons = [...WEAPONS, ...unlockedWeapDefs];
      allWeapons.forEach((wep, idx) => {
        const btn = document.createElement("div");
        const isSelected = idx === this._selectedWeapon;
        const isUnlocked = idx >= WEAPONS.length;
        const borderColor = isSelected ? "#ffd700" : isUnlocked ? "rgba(255,140,0,0.4)" : "rgba(212,168,67,0.2)";
        btn.style.cssText = `background:rgba(212,168,67,${isSelected ? 0.15 : 0.05});
          border:2px solid ${borderColor};border-radius:6px;
          padding:10px 14px;cursor:pointer;width:120px;text-align:center;transition:border-color 0.2s`;
        btn.innerHTML = `
          ${isUnlocked ? '<div style="color:#ff8c00;font-size:9px;font-weight:bold;margin-bottom:2px">UNLOCKED</div>' : ""}
          <div style="color:${wep.color};font-size:14px;font-weight:bold;margin-bottom:4px">${wep.name}</div>
          <div style="color:#887;font-size:10px;margin-bottom:6px">${wep.desc}</div>
          <div style="color:#665;font-size:9px;line-height:1.4">
            DMG ${(wep.damageMul * 100).toFixed(0)}% SPD ${(100 / wep.speedMul).toFixed(0)}%<br>
            RCH ${(wep.reachMul * 100).toFixed(0)}% BLD ${(wep.bleedChance * 100).toFixed(0)}%
          </div>`;
        btn.addEventListener("click", () => {
          this._selectedWeapon = idx;
          renderWeapons();
        });
        weapDiv.appendChild(btn);
      });
      // Show locked weapon slots
      const unlockedIds = new Set(unlockedWeapDefs.map(w => w.id));
      for (const weapId of allPossibleEnemyWeaponIds) {
        if (!unlockedIds.has(weapId)) {
          const lockedBtn = document.createElement("div");
          lockedBtn.style.cssText = `background:rgba(50,50,50,0.3);border:2px solid rgba(100,100,100,0.2);
            border-radius:6px;padding:10px 14px;width:120px;text-align:center;opacity:0.5`;
          lockedBtn.innerHTML = `
            <div style="font-size:24px;margin-bottom:4px">\u{1F512}</div>
            <div style="color:#665;font-size:11px">LOCKED</div>
            <div style="color:#554;font-size:9px">Defeat enemy to unlock</div>`;
          weapDiv.appendChild(lockedBtn);
        }
      }
    };
    renderWeapons();

    // Training mode button
    this._titleOverlay.querySelector("#soa-training")!.addEventListener("click", () => {
      this._audioCtx?.resume();
      this._titleOverlay?.parentNode?.removeChild(this._titleOverlay); this._titleOverlay = null;
      this._startTrainingMode();
    });

    this._titleOverlay.querySelector("#soa-start")!.addEventListener("click", () => {
      this._audioCtx?.resume();
      this._titleOverlay?.parentNode?.removeChild(this._titleOverlay); this._titleOverlay = null;
      this._currentEnemyIdx = 0; this._gold = 0; this._purchasedOneTime.clear();
      this._bonusStaminaRegen = 0; this._bonusDamage = 0; this._bonusDefense = 0; this._allCanBleed = false;
      this._startingSuperMeter = 0; this._bonusPerfectWindow = 0; this._ngPlus = 0;
      this._playerEnchantment = "none"; this._weaponEnchant = "none";
      this._stats = { hitsLanded: 0, hitsTaken: 0, parries: 0, combos: 0, maxCombo: 0, ripostes: 0, goldEarned: 0 };
      this._startRound();
    });
  }

  private _startRound(): void {
    // Check for King Arthur bonus boss in NG+
    const isArthurBoss = this._ngPlus >= 1 && this._currentEnemyIdx >= ENEMIES.length;
    const enemy: EnemyDef = isArthurBoss ? {
      name: "KING ARTHUR", title: "the Once and Future King",
      color: "#d4a843", armorColor: "#886622", swordColor: "#ffd700", plumeColor: "#fff",
      hp: 200, damage: 1.5, aggression: 0.75, parrySkill: 0.5, speed: 1.1,
      taunt: "You have proven worthy. Now face the King.",
      defeated: "The sword... chooses you. You are Avalon's champion.",
      ability: "excaliburWielder",
      abilityDesc: "EXCALIBUR WIELDER \u2014 wields the true Excalibur",
      taunts: ["For Camelot!", "The crown commands it!"],
      lowHpLine: "A worthy successor...",
      playerLowHpLine: "The throne shall not fall!",
      barks: ["For Camelot!", "The crown commands it!", "Worthy..."],
    } : ENEMIES[this._currentEnemyIdx];
    this._bloodDecals = [];
    this._particles = [];
    this._damageNumbers = [];
    this._comboDisplayTimer = 0;
    this._hitstopTimer = 0; this._shakeIntensity = 0;
    this._slowmoTimer = 0; this._timeScale = 1;
    this._crowdExcitement = 0;
    this._guardBreakFlash = 0;
    this._perfectParryRing = null;
    this._crowdItems = [];
    this._deathZoom = {active: false, x: 0, y: 0, scale: 1.0, targetScale: 1.3, flashAlpha: 0};
    this._dashing = false;
    this._dashTimer = 0;

    // Arena style based on round
    if (this._currentEnemyIdx <= 1) this._arenaStyle = 0;
    else if (this._currentEnemyIdx <= 3) this._arenaStyle = 1;
    else if (this._currentEnemyIdx <= 5) this._arenaStyle = 2;
    else this._arenaStyle = 3;

    // Rain activates on rounds 4+ (tougher enemies)
    this._rainActive = this._currentEnemyIdx >= 3;
    if (this._rainActive) this._initRaindrops();
    else this._raindrops = [];

    // Fire pits on rounds 5+ (arenaStyle 2 and 3)
    if (this._arenaStyle >= 2) {
      this._firePits = [
        { x: this._W * 0.25, active: true },
        { x: this._W * 0.75, active: true },
      ];
    } else {
      this._firePits = [];
    }

    // Round timer: 60 seconds at 60fps
    this._roundTimer = 60 * 60;

    // Reset announcer state
    this._firstBloodTriggered = false;
    this._nearDeathTriggered = false;
    this._roundDamageTaken = 0;
    this._announceTimer = 0;
    this._lightningTimer = 0;
    this._lightningFlash = 0;
    this._lightningBolt = [];
    this._emberParticles = [];
    this._chargeTimer = 0;
    this._charging = false;
    this._chargeSparks = [];

    // Keep player HP between rounds
    const prevHp = this._player ? this._player.hp : HEALTH_MAX;
    this._player = this._createFighter(this._W * 0.3, 1, {
      color: "#d4a843", armorColor: "#666", swordColor: this._currentWeapon.color, plumeColor: "#880",
      name: "SIR GALAHAD", isAI: false,
    });
    this._player.hp = prevHp; this._player.maxHp = HEALTH_MAX;
    // Apply starting super meter from shop upgrade
    this._player.superMeter = this._startingSuperMeter;

    this._ai = this._createFighter(this._W * 0.7, -1, {
      color: enemy.color, armorColor: enemy.armorColor, swordColor: enemy.swordColor,
      plumeColor: enemy.plumeColor, name: enemy.name, isAI: true,
    }, enemy);

    // Apply NG+ scaling to enemy
    if (this._ngPlus > 0) {
      this._ai.maxHp = Math.round(this._ai.maxHp * (1 + 0.3 * this._ngPlus));
      this._ai.hp = this._ai.maxHp;
      this._ai.damageMul *= (1 + 0.2 * this._ngPlus);
    }

    // Reset dialogue state
    this._aiLowHpTaunted = false;
    this._playerLowHpTaunted = false;
    this._aiHalfHpBarked = false;
    this._dialogueTimer = 0;

    // Show intro
    this._introText = `${enemy.name}`;
    this._introSubtext = `"${enemy.taunt}"`;
    this._introTimer = 120;
    this._phase = "intro";
    const roundLabel = isArthurBoss ? "BONUS BOSS!" : `ROUND ${this._currentEnemyIdx + 1}!`;
    this._announce(roundLabel);
  }

  private _startTrainingMode(): void {
    this._bloodDecals = [];
    this._particles = [];
    this._damageNumbers = [];
    this._comboDisplayTimer = 0;
    this._hitstopTimer = 0; this._shakeIntensity = 0;
    this._slowmoTimer = 0; this._timeScale = 1;
    this._crowdExcitement = 0;
    this._guardBreakFlash = 0;
    this._perfectParryRing = null;
    this._arenaStyle = 0;
    this._rainActive = false;
    this._raindrops = [];
    this._firePits = [];
    this._crowdItems = [];
    this._deathZoom = {active: false, x: 0, y: 0, scale: 1.0, targetScale: 1.3, flashAlpha: 0};
    this._firstBloodTriggered = false;
    this._nearDeathTriggered = false;
    this._roundDamageTaken = 0;
    this._announceTimer = 0;
    this._emberParticles = [];
    this._chargeTimer = 0;
    this._charging = false;
    this._chargeSparks = [];
    this._dashing = false;
    this._dashTimer = 0;

    this._player = this._createFighter(this._W * 0.3, 1, {
      color: "#d4a843", armorColor: "#666", swordColor: this._currentWeapon.color, plumeColor: "#880",
      name: "SIR GALAHAD", isAI: false,
    });
    this._player.hp = HEALTH_MAX; this._player.maxHp = HEALTH_MAX;

    // Dummy AI: doesn't attack, huge HP
    this._currentEnemyIdx = 0;
    this._ai = this._createFighter(this._W * 0.7, -1, {
      color: "#555", armorColor: "#444", swordColor: "#888",
      plumeColor: "#666", name: "TRAINING DUMMY", isAI: true,
    });
    this._ai.hp = 999; this._ai.maxHp = 999;
    this._ai.ability = "none";
    this._ai.damageMul = 0;

    this._roundTimer = 99999;
    this._phase = "training";
    this._announce("TRAINING MODE");
  }

  private _drawTrainingUI(): void {
    const c = this._ctx;
    const W = this._W;
    const H = this._H;
    // Move list on the right side
    c.save();
    c.fillStyle = "rgba(0,0,0,0.5)";
    c.fillRect(W - 220, 80, 210, 340);
    c.strokeStyle = "rgba(212,168,67,0.3)";
    c.lineWidth = 1;
    c.strokeRect(W - 220, 80, 210, 340);
    c.fillStyle = "#d4a843";
    c.font = "bold 14px Georgia";
    c.textAlign = "left";
    c.fillText("MOVE LIST", W - 210, 100);
    const moves = [
      {key: "J", name: "Slash", dmg: ATTACKS.slash.damage, stam: ATTACKS.slash.stamina},
      {key: "J (hold)", name: "Charged Slash", dmg: ATTACKS.chargedSlash.damage, stam: ATTACKS.chargedSlash.stamina},
      {key: "K", name: "Thrust", dmg: ATTACKS.thrust.damage, stam: ATTACKS.thrust.stamina},
      {key: "U", name: "Overhead", dmg: ATTACKS.overhead.damage, stam: ATTACKS.overhead.stamina},
      {key: "I", name: "Sweep", dmg: ATTACKS.sweep.damage, stam: ATTACKS.sweep.stamina},
      {key: "F", name: "Kick", dmg: ATTACKS.kick.damage, stam: ATTACKS.kick.stamina},
      {key: "G", name: "Grab", dmg: ATTACKS.grab.damage, stam: ATTACKS.grab.stamina},
      {key: "DD+J", name: "Dash Attack", dmg: ATTACKS.dashAttack.damage, stam: ATTACKS.dashAttack.stamina},
      {key: "L", name: "Block/Parry", dmg: 0, stam: 0},
      {key: "SPACE", name: "Dodge", dmg: 0, stam: 20},
      {key: "R", name: "Excalibur", dmg: ATTACKS.excalibur.damage, stam: 0},
    ];
    c.font = "11px Georgia";
    let yOff = 118;
    for (const m of moves) {
      c.fillStyle = "#d4a843";
      c.fillText(m.key, W - 210, yOff);
      c.fillStyle = "#a08040";
      c.fillText(m.name, W - 155, yOff);
      if (m.dmg > 0) {
        c.fillStyle = "#ff6644";
        c.fillText(`${m.dmg}`, W - 55, yOff);
        c.fillStyle = "#44aa66";
        c.fillText(`${m.stam}`, W - 25, yOff);
      }
      yOff += 18;
    }
    c.fillStyle = "#665";
    c.font = "10px Georgia";
    c.fillText("DMG  STA", W - 55, 106);

    // Current combo chain at bottom
    if (this._player && this._player.comboSequence.length > 0) {
      c.fillStyle = "rgba(0,0,0,0.4)";
      c.fillRect(W / 2 - 200, H - 60, 400, 30);
      c.fillStyle = "#ffd700";
      c.font = "14px Georgia";
      c.textAlign = "center";
      c.fillText("Combo: " + this._player.comboSequence.join(" > "), W / 2, H - 40);
    }

    // ESC to return
    c.fillStyle = "#665";
    c.font = "13px Georgia";
    c.textAlign = "center";
    c.fillText("Press ESC to return to title", W / 2, H - 80);
    c.restore();
  }

  private _showShop(): void {
    this._shopOverlay = document.createElement("div");
    this._shopOverlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;z-index:60;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:rgba(10,5,2,0.92);font-family:Georgia,serif;`;

    const prevIdx = this._currentEnemyIdx - 1;
    const enemy = prevIdx < ENEMIES.length ? ENEMIES[prevIdx] : null;
    const defeatedName = enemy ? enemy.name : "KING ARTHUR";
    const defeatedQuote = enemy ? enemy.defeated : "The crown... passes to you.";
    let html = `
      <div style="font-size:36px;color:#d4a843;letter-spacing:4px;margin-bottom:8px">${defeatedName} DEFEATED</div>
      <div style="font-size:16px;color:#665;margin-bottom:20px;font-style:italic">"${defeatedQuote}"</div>
      <div style="font-size:20px;color:#ffd700;margin-bottom:30px">\u2726 ${this._gold} Gold</div>
      <div style="font-size:22px;color:#d4a843;letter-spacing:3px;margin-bottom:20px">ARMORER'S SHOP</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-bottom:30px;max-width:800px">`;

    for (const item of SHOP_ITEMS) {
      const isEnchant = item.id.startsWith("enchant");
      const enchantType = isEnchant ? item.id.replace("enchant", "").charAt(0).toLowerCase() + item.id.replace("enchant", "").slice(1) : "";
      const isActiveEnchant = isEnchant && (this._weaponEnchant === enchantType.toLowerCase() || this._playerEnchantment === enchantType.toLowerCase());
      const bought = item.oneTime && this._purchasedOneTime.has(item.id) && !isEnchant;
      const canAfford = this._gold >= item.cost && !bought;
      html += `<div data-item="${item.id}" style="background:rgba(212,168,67,${canAfford ? 0.1 : 0.03});
        border:1px solid ${isActiveEnchant ? "#ff8c00" : `rgba(212,168,67,${canAfford ? 0.3 : 0.1})`};border-radius:6px;padding:14px 18px;
        cursor:${canAfford ? "pointer" : "default"};width:180px;opacity:${bought ? 0.4 : 1}">
        <div style="color:#d4a843;font-size:15px;margin-bottom:4px">${item.name}</div>
        <div style="color:#887;font-size:12px;margin-bottom:6px">${item.desc}</div>
        <div style="color:#ffd700;font-size:13px">${isActiveEnchant ? "ACTIVE" : bought ? "PURCHASED" : `${item.cost} gold`}</div>
      </div>`;
    }

    html += `</div><button id="soa-continue" style="padding:14px 40px;font-size:20px;font-family:Georgia,serif;
      background:linear-gradient(180deg,#d4a843 0%,#8b6914 100%);color:#1a0e05;border:2px solid #d4a843;
      border-radius:4px;cursor:pointer;letter-spacing:3px;text-transform:uppercase">NEXT CHALLENGER</button>`;

    this._shopOverlay.innerHTML = html;
    document.body.appendChild(this._shopOverlay);

    // Wire up shop items
    this._shopOverlay.querySelectorAll("[data-item]").forEach(el => {
      el.addEventListener("click", () => {
        const id = (el as HTMLElement).dataset.item!;
        const item = SHOP_ITEMS.find(i => i.id === id)!;
        const isEnchant = item.id.startsWith("enchant");
        if (item.oneTime && this._purchasedOneTime.has(item.id) && !isEnchant) return;
        if (this._gold < item.cost) return;
        this._gold -= item.cost;
        item.apply(this);
        if (item.oneTime && !isEnchant) this._purchasedOneTime.add(item.id);
        // Refresh shop
        this._shopOverlay?.parentNode?.removeChild(this._shopOverlay);
        this._showShop();
      });
    });

    this._shopOverlay.querySelector("#soa-continue")!.addEventListener("click", () => {
      this._shopOverlay?.parentNode?.removeChild(this._shopOverlay); this._shopOverlay = null;
      this._startRound();
    });
  }

  private _showResult(type: "game_over" | "tournament_end"): void {
    this._resultOverlay = document.createElement("div");
    this._resultOverlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;z-index:60;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:rgba(10,5,2,0.9);font-family:Georgia,serif;`;
    const isWin = type === "tournament_end";
    this._resultOverlay.innerHTML = `
      <div style="font-size:56px;color:#d4a843;text-shadow:0 0 20px rgba(212,168,67,0.4);margin-bottom:20px;letter-spacing:6px">
        ${isWin ? "CHAMPION OF AVALON" : "DEFEATED"}</div>
      <div style="font-size:20px;color:#8b6914;margin-bottom:30px">
        ${isWin ? "All challengers have fallen before your blade!" : `Fell to ${this._currentEnemyIdx < ENEMIES.length ? ENEMIES[this._currentEnemyIdx].name : "KING ARTHUR"}...`}</div>
      <div style="background:rgba(212,168,67,0.06);border:1px solid rgba(212,168,67,0.15);border-radius:8px;padding:20px 32px;margin-bottom:30px;text-align:left">
        <p style="color:#a08040;font-size:15px;line-height:2">Hits Landed: <span style="color:#d4a843">${this._stats.hitsLanded}</span></p>
        <p style="color:#a08040;font-size:15px;line-height:2">Hits Taken: <span style="color:#d4a843">${this._stats.hitsTaken}</span></p>
        <p style="color:#a08040;font-size:15px;line-height:2">Parries: <span style="color:#d4a843">${this._stats.parries}</span></p>
        <p style="color:#a08040;font-size:15px;line-height:2">Ripostes: <span style="color:#d4a843">${this._stats.ripostes}</span></p>
        <p style="color:#a08040;font-size:15px;line-height:2">Combos: <span style="color:#d4a843">${this._stats.combos}</span> (max ${this._stats.maxCombo}x)</p>
        <p style="color:#a08040;font-size:15px;line-height:2">Gold Earned: <span style="color:#ffd700">${this._stats.goldEarned}</span></p>
        <p style="color:#a08040;font-size:15px;line-height:2">Knights Defeated: <span style="color:#d4a843">${this._currentEnemyIdx}/${ENEMIES.length}</span></p>
      </div>
      <div style="display:flex;gap:12px">
      <button id="soa-retry" style="padding:16px 48px;font-size:22px;font-family:Georgia,serif;
        background:linear-gradient(180deg,#d4a843 0%,#8b6914 100%);color:#1a0e05;border:2px solid #d4a843;
        border-radius:4px;cursor:pointer;letter-spacing:3px;text-transform:uppercase">NEW TOURNAMENT</button>
      ${isWin ? `<button id="soa-ngplus" style="padding:16px 48px;font-size:22px;font-family:Georgia,serif;
        background:linear-gradient(180deg,#ff8c00 0%,#cc6600 100%);color:#1a0e05;border:2px solid #ff8c00;
        border-radius:4px;cursor:pointer;letter-spacing:3px;text-transform:uppercase">NEW GAME+ (NG+${this._ngPlus + 1})</button>` : ""}
      </div>`;
    document.body.appendChild(this._resultOverlay);

    this._resultOverlay.querySelector("#soa-retry")!.addEventListener("click", () => {
      this._resultOverlay?.parentNode?.removeChild(this._resultOverlay); this._resultOverlay = null;
      this._ngPlus = 0;
      this._showTitle();
    });

    if (isWin) {
      this._resultOverlay.querySelector("#soa-ngplus")?.addEventListener("click", () => {
        this._resultOverlay?.parentNode?.removeChild(this._resultOverlay); this._resultOverlay = null;
        this._ngPlus++;
        // Keep purchased upgrades, reset round
        this._currentEnemyIdx = 0;
        this._player.hp = HEALTH_MAX;
        this._stats = { hitsLanded: 0, hitsTaken: 0, parries: 0, combos: 0, maxCombo: 0, ripostes: 0, goldEarned: 0 };
        this._startRound();
      });
    }
  }


  // ── Main Tick ────────────────────────────────────────────────────────────

  private _tick(): void {
    // Slow-mo management
    if (this._slowmoTimer > 0) {
      this._slowmoTimer--;
      if (this._slowmoTimer <= 0) this._timeScale = 1;
      else this._timeScale = lerp(SLOWMO_SCALE, 1, 1 - this._slowmoTimer / SLOWMO_DURATION);
    }

    // Procedural music update
    this._updateMusic();

    // Intro phase
    if (this._phase === "intro") {
      this._frameCount++;
      this._introTimer--;
      if (this._introTimer <= 0) this._phase = "playing";
    }

    // Training mode
    if (this._phase === "training") {
      if (this._hitstopTimer > 0) {
        this._hitstopTimer--;
      } else {
        this._frameCount++;
        this._updateInput();
        this._updatePlayerController(this._player);
        // Training dummy doesn't attack
        this._updateFighter(this._player);
        this._updateFighter(this._ai);
        // 3x regen for player in training
        this._player.hp = Math.min(this._player.maxHp, this._player.hp + 0.5);
        this._player.stamina = Math.min(STAMINA_MAX, this._player.stamina + 0.8);
        this._checkSwordClash();
        this._resolveCombat(this._player, this._ai);
        this._updateParticles();
        this._updateShake();
        this._updateGrab(this._player);
        // Reset dummy if nearly dead
        if (this._ai.hp <= 50) { this._ai.hp = 999; this._ai.dead = false; this._ai.deathTimer = 0; this._ai.staggered = false; this._ai.knockedDown = false; }
        // ESC returns to title (handled by _handleKeyDown)
      }
    }

    if (this._phase === "playing") {
      if (this._hitstopTimer > 0) {
        this._hitstopTimer--;
      } else {
        this._frameCount++;
        this._updateInput();
        this._updatePlayerController(this._player);
        this._updateAI(this._ai, this._player);
        this._updateFighter(this._player);
        this._updateFighter(this._ai);
        this._checkSwordClash();
        this._resolveCombat(this._player, this._ai);
        this._resolveCombat(this._ai, this._player);
        this._updateParticles();
        this._updateShake();
        this._updateRain();
        this._updateEmbers();
        this._updateFirePits();
        this._updateGrab(this._player);
        this._updateGrab(this._ai);

        // Update charge sparks
        for (let i = this._chargeSparks.length - 1; i >= 0; i--) {
          const s = this._chargeSparks[i];
          s.x += s.vx; s.y += s.vy; s.life--;
          if (s.life <= 0) this._chargeSparks.splice(i, 1);
        }

        // Round timer
        this._roundTimer -= this._timeScale;
        if (this._roundTimer <= 0 && !this._player.dead && !this._ai.dead) {
          this._roundTimer = 0;
          this._announce("TIME!");
          const playerPct = this._player.hp / this._player.maxHp;
          const aiPct = this._ai.hp / this._ai.maxHp;
          if (playerPct >= aiPct) {
            // Player wins on HP
            this._ai.hp = 0; this._ai.dead = true; this._ai.deathTimer = 0;
            this._playSound("death", 0.4); this._triggerShake(15);
          } else {
            // AI wins
            this._player.hp = 0; this._player.dead = true; this._player.deathTimer = 0;
            this._playSound("death", 0.4); this._triggerShake(15);
          }
        }

        // Crowd decay
        this._crowdExcitement *= 0.998;
        this._crowdTimer++;
        if (this._crowdTimer > 180 && this._crowdExcitement > 0.6) {
          this._playSound("crowd", 0.08); this._crowdTimer = 0;
        }

        if (this._player.comboCount > this._stats.maxCombo) this._stats.maxCombo = this._player.comboCount;

        // Death zoom update
        if (this._deathZoom.active) {
          const dying = this._player.dead ? this._player : (this._ai.dead ? this._ai : null);
          if (dying) {
            // Gradually zoom in over 40 frames
            if (dying.deathTimer < 40) {
              this._deathZoom.scale = lerp(this._deathZoom.scale, this._deathZoom.targetScale, 0.05);
              // Spawn extra blood
              if (this._frameCount % 4 === 0) {
                this._spawnBlood(dying.x + rand(-15, 15), dying.y - rand(10, 40), 3, rand(0, Math.PI * 2));
              }
            }
            // Flash to white effect at the moment of death (first 10 frames)
            if (dying.deathTimer < 10) {
              this._deathZoom.flashAlpha = Math.max(0, 1.0 - dying.deathTimer / 10);
            } else {
              this._deathZoom.flashAlpha = Math.max(0, this._deathZoom.flashAlpha - 0.05);
            }
            // After 50 frames, zoom back out
            if (dying.deathTimer > 50) {
              this._deathZoom.scale = lerp(this._deathZoom.scale, 1.0, 0.05);
              if (Math.abs(this._deathZoom.scale - 1.0) < 0.01) {
                this._deathZoom.active = false;
                this._deathZoom.scale = 1.0;
              }
            }
          }
        }

        // Unlock enemy weapon on defeat
        if (this._ai.dead && this._ai.deathTimer === 1) {
          const isArthurDefeated = this._ngPlus >= 1 && this._currentEnemyIdx >= ENEMIES.length;
          if (isArthurDefeated) {
            this._unlockArthurWeapon();
          } else {
            this._unlockWeaponForEnemy(this._currentEnemyIdx);
          }
        }

        // AI dead — advance tournament
        if (this._ai.dead && this._ai.deathTimer > 80) {
          this._currentEnemyIdx++;
          const isArthurBoss = this._ngPlus >= 1 && this._currentEnemyIdx > ENEMIES.length;
          if (isArthurBoss) {
            // Beat Arthur — tournament end
            this._phase = "tournament_end";
            this._playSound("victory", 0.4);
            this._showResult("tournament_end");
          } else if (this._currentEnemyIdx >= ENEMIES.length) {
            if (this._ngPlus >= 1) {
              // In NG+, after beating all 8, spawn Arthur
              this._phase = "shop";
              this._showShop();
            } else {
              this._phase = "tournament_end";
              this._playSound("victory", 0.4);
              this._showResult("tournament_end");
            }
          } else {
            this._phase = "shop";
            this._showShop();
          }
        }
        // Player dead
        if (this._player.dead && this._player.deathTimer > 80) {
          this._phase = "game_over";
          this._showResult("game_over");
        }
      }
    }

    // Render
    const c = this._ctx;
    c.clearRect(0, 0, this._W, this._H);
    c.save(); c.translate(this._shakeX, this._shakeY);

    // Death zoom transform
    if (this._deathZoom.active && this._deathZoom.scale !== 1.0) {
      const dz = this._deathZoom;
      const cx = dz.x;
      const cy = dz.y;
      c.translate(cx, cy);
      c.scale(dz.scale, dz.scale);
      c.translate(-cx, -cy);
    }

    this._drawBackground();

    if (this._phase === "playing" || this._phase === "game_over" || this._phase === "victory"
        || this._phase === "tournament_end" || this._phase === "intro" || this._phase === "training") {
      // Floor reflections (before fighters)
      if (this._player) this._drawFighterReflection(this._player);
      if (this._ai) this._drawFighterReflection(this._ai);

      const fighters = [this._player, this._ai].filter(Boolean).sort((a, b) => a.y - b.y);
      for (const f of fighters) { this._drawSwordTrail(f.swordTrail); this._drawFighter(f); }
      // Rain drawn after fighters
      this._drawRain();
      // Embers (volcanic arena)
      if (this._arenaStyle === 3) this._drawEmbers();
      this._drawParticles();

      // Charge bar and charge sparks
      if (this._charging && this._chargeTimer > 0) {
        const p = this._player;
        const barW = 30;
        const barH = 4;
        const ratio = clamp(this._chargeTimer / 25, 0, 1);
        const bx = p.x - barW / 2;
        const by = p.y - 105;
        c.fillStyle = "#333"; c.fillRect(bx, by, barW, barH);
        const chargeGrad = c.createLinearGradient(bx, by, bx + barW * ratio, by);
        chargeGrad.addColorStop(0, "#ffd700"); chargeGrad.addColorStop(1, "#ff8c00");
        c.fillStyle = chargeGrad; c.fillRect(bx, by, barW * ratio, barH);
        if (ratio >= 1) {
          c.strokeStyle = "#ffd700"; c.lineWidth = 1;
          c.shadowColor = "#ffd700"; c.shadowBlur = 8;
          c.strokeRect(bx, by, barW, barH);
          c.shadowBlur = 0;
        }
      }
      // Draw charge sparks
      for (const s of this._chargeSparks) {
        const alpha = clamp(s.life / 12, 0, 1);
        c.fillStyle = `rgba(255,215,0,${alpha})`;
        c.beginPath(); c.arc(s.x, s.y, 2, 0, Math.PI * 2); c.fill();
      }

      // Weapon unlock notification
      if (this._weaponUnlockTimer > 0) {
        this._weaponUnlockTimer--;
        const unlockAlpha = this._weaponUnlockTimer > 20 ? 1 : this._weaponUnlockTimer / 20;
        c.save();
        c.globalAlpha = unlockAlpha;
        // Gold banner at top center
        c.fillStyle = "rgba(40,30,10,0.8)";
        const bannerW = 340;
        const bannerH = 36;
        c.fillRect(this._W / 2 - bannerW / 2, 70, bannerW, bannerH);
        c.strokeStyle = "#ffd700";
        c.lineWidth = 2;
        c.strokeRect(this._W / 2 - bannerW / 2, 70, bannerW, bannerH);
        c.fillStyle = "#ffd700";
        c.font = "bold 16px Georgia";
        c.textAlign = "center";
        c.fillText(`WEAPON UNLOCKED: ${this._weaponUnlockNotify}`, this._W / 2, 93);
        c.restore();
      }

      // Dialogue bubbles
      this._drawDialogue();

      // Announcements
      this._drawAnnouncement();

      // Round timer
      if (this._phase === "playing" || this._phase === "intro") {
        const totalSeconds = Math.max(0, Math.ceil(this._roundTimer / 60));
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const timerStr = `${mins}:${secs.toString().padStart(2, "0")}`;
        const isLow = totalSeconds <= 10;
        const pulse = isLow ? 0.5 + Math.sin(this._frameCount * 0.15) * 0.5 : 1;
        c.fillStyle = isLow ? `rgba(255,50,50,${pulse})` : "rgba(212,168,67,0.8)";
        c.font = `bold ${isLow ? 22 : 18}px Georgia`;
        c.textAlign = "center";
        c.fillText(timerStr, this._W / 2, 52);
      }

      if (this._phase !== "intro") this._drawUI();
      if (this._phase === "training") this._drawTrainingUI();
    }

    // Intro text
    if (this._phase === "intro" && this._introTimer > 0) {
      const alpha = this._introTimer > 100 ? (120 - this._introTimer) / 20 : this._introTimer / 40;
      c.save(); c.globalAlpha = clamp(alpha, 0, 1);
      c.fillStyle = "#d4a843"; c.font = "bold 44px Georgia"; c.textAlign = "center";
      c.shadowColor = "#d4a843"; c.shadowBlur = 20;
      c.fillText(this._introText, this._W / 2, this._H * 0.3);
      c.shadowBlur = 0;
      c.fillStyle = "#887"; c.font = "italic 20px Georgia";
      c.fillText(this._introSubtext, this._W / 2, this._H * 0.3 + 40);
      const isArthurIntro = this._ngPlus >= 1 && this._currentEnemyIdx >= ENEMIES.length;
      const introEnemy = isArthurIntro ? null : ENEMIES[this._currentEnemyIdx];
      const introAbilityDesc = isArthurIntro ? "EXCALIBUR WIELDER \u2014 commands the true Excalibur" : (introEnemy?.abilityDesc || "");
      if (introAbilityDesc) {
        c.fillStyle = "#a66"; c.font = "15px Georgia";
        c.fillText(introAbilityDesc, this._W / 2, this._H * 0.3 + 70);
      }
      c.fillStyle = "#665"; c.font = "16px Georgia";
      const roundText = isArthurIntro ? "BONUS BOSS" : `Round ${this._currentEnemyIdx + 1} of ${ENEMIES.length}`;
      c.fillText(roundText, this._W / 2, this._H * 0.3 + 100);
      c.restore();
    }

    c.restore();

    // Death flash overlay
    if (this._deathZoom.active && this._deathZoom.flashAlpha > 0) {
      c.save();
      c.fillStyle = `rgba(255,255,255,${this._deathZoom.flashAlpha * 0.6})`;
      c.fillRect(0, 0, this._W, this._H);
      c.restore();
    }

    // Vignette + slow-mo tint
    const vg = c.createRadialGradient(this._W / 2, this._H / 2, this._H * 0.3, this._W / 2, this._H / 2, this._H * 0.9);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(0,0,0,${this._slowmoTimer > 0 ? 0.65 : 0.5})`);
    c.fillStyle = vg; c.fillRect(0, 0, this._W, this._H);

    // Slow-mo golden tint
    if (this._slowmoTimer > 0) {
      c.fillStyle = `rgba(255,200,50,${0.04 * (this._slowmoTimer / SLOWMO_DURATION)})`;
      c.fillRect(0, 0, this._W, this._H);
    }
  }
}
