// ---------------------------------------------------------------------------
// Mage Wars FPS – Spell Crafting: Runes, Combinations & Environmental Spells
// ---------------------------------------------------------------------------

// ---- Elemental Rune definitions -------------------------------------------

export type RuneElement = "fire" | "ice" | "earth" | "lightning" | "shadow" | "nature" | "arcane" | "wind";

export interface RuneDef {
  id: string;
  name: string;
  icon: string;
  element: RuneElement;
  desc: string;
  color: number;
  trailColor: number;
  baseDamage: number;
  baseMana: number;
}

export const RUNE_DEFS: RuneDef[] = [
  {
    id: "rune_fire", name: "Fire Rune", icon: "\uD83D\uDD25",
    element: "fire", desc: "Essence of flame. Burns on contact.",
    color: 0xff4400, trailColor: 0xff8800, baseDamage: 20, baseMana: 8,
  },
  {
    id: "rune_ice", name: "Ice Rune", icon: "\u2744\uFE0F",
    element: "ice", desc: "Frozen crystal shard. Slows targets.",
    color: 0x88ddff, trailColor: 0x44aadd, baseDamage: 15, baseMana: 7,
  },
  {
    id: "rune_earth", name: "Earth Rune", icon: "\uD83E\uDEA8",
    element: "earth", desc: "Dense stone essence. Heavy impact.",
    color: 0x886644, trailColor: 0x664422, baseDamage: 25, baseMana: 10,
  },
  {
    id: "rune_lightning", name: "Lightning Rune", icon: "\u26A1",
    element: "lightning", desc: "Crackling energy. Fast projectiles.",
    color: 0xffff44, trailColor: 0xcccc00, baseDamage: 18, baseMana: 9,
  },
  {
    id: "rune_shadow", name: "Shadow Rune", icon: "\uD83C\uDF11",
    element: "shadow", desc: "Dark void energy. Drains life.",
    color: 0x8833aa, trailColor: 0x551188, baseDamage: 12, baseMana: 6,
  },
  {
    id: "rune_nature", name: "Nature Rune", icon: "\uD83C\uDF3F",
    element: "nature", desc: "Living essence. Heals or poisons.",
    color: 0x44aa22, trailColor: 0x228800, baseDamage: 10, baseMana: 5,
  },
  {
    id: "rune_arcane", name: "Arcane Rune", icon: "\u2728",
    element: "arcane", desc: "Pure magical energy. Amplifies combinations.",
    color: 0xaa88ff, trailColor: 0x8866dd, baseDamage: 16, baseMana: 8,
  },
  {
    id: "rune_wind", name: "Wind Rune", icon: "\uD83C\uDF2C\uFE0F",
    element: "wind", desc: "Gust of force. Knockback effect.",
    color: 0xccffcc, trailColor: 0x88cc88, baseDamage: 8, baseMana: 4,
  },
];

// ---- Crafted spell result definitions -------------------------------------

export type CraftedSpellEffect =
  | "damage" | "dot" | "slow" | "freeze" | "knockback"
  | "lifesteal" | "aoe_explosion" | "chain" | "pierce"
  | "heal_self" | "blind" | "stun" | "pull";

export interface CraftedSpellDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  rune1: RuneElement;
  rune2: RuneElement;
  damage: number;
  manaCost: number;
  cooldown: number;
  projectileSpeed: number;
  projectileSize: number;
  projectileColor: number;
  trailColor: number;
  splashRadius: number;
  effects: CraftedSpellEffect[];
  effectValues: Record<string, number>; // e.g. { dotDamage: 5, dotDuration: 3, slowPct: 0.5 }
  range: number;
}

export const CRAFTED_SPELL_DEFS: CraftedSpellDef[] = [
  // ---- Fire combos ----
  {
    id: "lava_bolt", name: "Lava Bolt", icon: "\uD83C\uDF0B",
    desc: "Fire + Earth = molten rock projectile. High damage, leaves burning ground.",
    rune1: "fire", rune2: "earth",
    damage: 55, manaCost: 18, cooldown: 6, projectileSpeed: 70, projectileSize: 0.25,
    projectileColor: 0xff6600, trailColor: 0xcc4400, splashRadius: 3,
    effects: ["damage", "dot", "aoe_explosion"],
    effectValues: { dotDamage: 8, dotDuration: 3 },
    range: 80,
  },
  {
    id: "steam_blast", name: "Steam Blast", icon: "\u2601\uFE0F",
    desc: "Fire + Ice = superheated steam. Blinds and damages in a cone.",
    rune1: "fire", rune2: "ice",
    damage: 30, manaCost: 14, cooldown: 5, projectileSpeed: 100, projectileSize: 0.3,
    projectileColor: 0xdddddd, trailColor: 0xaaaaaa, splashRadius: 4,
    effects: ["damage", "blind"],
    effectValues: { blindDuration: 2.5 },
    range: 40,
  },
  {
    id: "plasma_lance", name: "Plasma Lance", icon: "\uD83D\uDD31",
    desc: "Fire + Lightning = plasma beam that pierces through enemies.",
    rune1: "fire", rune2: "lightning",
    damage: 45, manaCost: 16, cooldown: 5, projectileSpeed: 180, projectileSize: 0.15,
    projectileColor: 0xffaa44, trailColor: 0xff6622, splashRadius: 0,
    effects: ["damage", "pierce"],
    effectValues: { pierceCount: 3 },
    range: 120,
  },
  {
    id: "hellfire_orb", name: "Hellfire Orb", icon: "\uD83D\uDD34",
    desc: "Fire + Shadow = dark fire that drains life as it burns.",
    rune1: "fire", rune2: "shadow",
    damage: 40, manaCost: 15, cooldown: 6, projectileSpeed: 80, projectileSize: 0.2,
    projectileColor: 0x880044, trailColor: 0x440022, splashRadius: 2,
    effects: ["damage", "lifesteal", "dot"],
    effectValues: { lifestealPct: 0.3, dotDamage: 6, dotDuration: 4 },
    range: 70,
  },
  {
    id: "inferno_gust", name: "Inferno Gust", icon: "\uD83C\uDF2A\uFE0F",
    desc: "Fire + Wind = fiery tornado that knocks back and burns.",
    rune1: "fire", rune2: "wind",
    damage: 25, manaCost: 12, cooldown: 4, projectileSpeed: 90, projectileSize: 0.35,
    projectileColor: 0xff8844, trailColor: 0xff4400, splashRadius: 5,
    effects: ["damage", "knockback", "dot"],
    effectValues: { knockbackForce: 12, dotDamage: 4, dotDuration: 2 },
    range: 50,
  },
  // ---- Ice combos ----
  {
    id: "frost_quake", name: "Frost Quake", icon: "\uD83E\uDDCA",
    desc: "Ice + Earth = frozen earth eruption. Stuns and damages in area.",
    rune1: "ice", rune2: "earth",
    damage: 50, manaCost: 20, cooldown: 8, projectileSpeed: 60, projectileSize: 0.3,
    projectileColor: 0x88bbcc, trailColor: 0x446688, splashRadius: 5,
    effects: ["damage", "stun", "aoe_explosion"],
    effectValues: { stunDuration: 2 },
    range: 60,
  },
  {
    id: "cryo_chain", name: "Cryo Chain", icon: "\u2744\uFE0F",
    desc: "Ice + Lightning = chain frost that bounces between enemies, slowing each.",
    rune1: "ice", rune2: "lightning",
    damage: 30, manaCost: 16, cooldown: 7, projectileSpeed: 140, projectileSize: 0.15,
    projectileColor: 0xaaeeff, trailColor: 0x66ccff, splashRadius: 0,
    effects: ["damage", "chain", "slow"],
    effectValues: { chainCount: 4, slowPct: 0.4, slowDuration: 3 },
    range: 90,
  },
  {
    id: "void_frost", name: "Void Frost", icon: "\uD83D\uDDA4",
    desc: "Ice + Shadow = freezing void. Pulls enemies inward then freezes.",
    rune1: "ice", rune2: "shadow",
    damage: 35, manaCost: 18, cooldown: 8, projectileSpeed: 70, projectileSize: 0.25,
    projectileColor: 0x4422aa, trailColor: 0x221166, splashRadius: 4,
    effects: ["damage", "pull", "freeze"],
    effectValues: { pullForce: 8, freezeDuration: 1.5 },
    range: 70,
  },
  // ---- Earth combos ----
  {
    id: "thunder_crash", name: "Thunder Crash", icon: "\uD83C\uDF29\uFE0F",
    desc: "Earth + Lightning = electrified boulder. Massive AoE stun.",
    rune1: "earth", rune2: "lightning",
    damage: 65, manaCost: 22, cooldown: 9, projectileSpeed: 50, projectileSize: 0.4,
    projectileColor: 0xccaa44, trailColor: 0x998822, splashRadius: 6,
    effects: ["damage", "aoe_explosion", "stun"],
    effectValues: { stunDuration: 1.5 },
    range: 90,
  },
  {
    id: "vine_grip", name: "Vine Grip", icon: "\uD83C\uDF3F",
    desc: "Earth + Nature = entangling vines that root and damage over time.",
    rune1: "earth", rune2: "nature",
    damage: 20, manaCost: 12, cooldown: 6, projectileSpeed: 80, projectileSize: 0.2,
    projectileColor: 0x446622, trailColor: 0x224411, splashRadius: 3,
    effects: ["damage", "stun", "dot"],
    effectValues: { stunDuration: 2.5, dotDamage: 6, dotDuration: 4 },
    range: 60,
  },
  // ---- Lightning combos ----
  {
    id: "storm_drain", name: "Storm Drain", icon: "\u26A1",
    desc: "Lightning + Shadow = draining lightning. Steals mana and health.",
    rune1: "lightning", rune2: "shadow",
    damage: 35, manaCost: 14, cooldown: 6, projectileSpeed: 160, projectileSize: 0.12,
    projectileColor: 0x8844cc, trailColor: 0x6622aa, splashRadius: 0,
    effects: ["damage", "lifesteal"],
    effectValues: { lifestealPct: 0.4 },
    range: 100,
  },
  {
    id: "gale_bolt", name: "Gale Bolt", icon: "\uD83C\uDF2C\uFE0F",
    desc: "Lightning + Wind = electrified gale. Extreme knockback with chain.",
    rune1: "lightning", rune2: "wind",
    damage: 28, manaCost: 11, cooldown: 4, projectileSpeed: 200, projectileSize: 0.12,
    projectileColor: 0xddffaa, trailColor: 0xaacc66, splashRadius: 2,
    effects: ["damage", "knockback", "chain"],
    effectValues: { knockbackForce: 15, chainCount: 2 },
    range: 80,
  },
  // ---- Shadow combos ----
  {
    id: "dark_bloom", name: "Dark Bloom", icon: "\uD83C\uDF38",
    desc: "Shadow + Nature = poisonous dark flower. Heals caster while damaging target.",
    rune1: "shadow", rune2: "nature",
    damage: 25, manaCost: 10, cooldown: 5, projectileSpeed: 90, projectileSize: 0.2,
    projectileColor: 0x663388, trailColor: 0x442266, splashRadius: 2,
    effects: ["damage", "lifesteal", "dot"],
    effectValues: { lifestealPct: 0.5, dotDamage: 5, dotDuration: 5 },
    range: 70,
  },
  // ---- Nature combos ----
  {
    id: "rejuvenation_burst", name: "Rejuvenation Burst", icon: "\uD83C\uDF3C",
    desc: "Nature + Arcane = healing explosion. Heals self and damages foes in area.",
    rune1: "nature", rune2: "arcane",
    damage: 30, manaCost: 16, cooldown: 8, projectileSpeed: 70, projectileSize: 0.3,
    projectileColor: 0x88ff44, trailColor: 0x44cc22, splashRadius: 5,
    effects: ["damage", "heal_self", "aoe_explosion"],
    effectValues: { healAmount: 40 },
    range: 50,
  },
  // ---- Arcane combos ----
  {
    id: "arcane_nova", name: "Arcane Nova", icon: "\uD83D\uDCAB",
    desc: "Arcane + Wind = pure force blast. Massive knockback in all directions.",
    rune1: "arcane", rune2: "wind",
    damage: 40, manaCost: 20, cooldown: 10, projectileSpeed: 55, projectileSize: 0.4,
    projectileColor: 0xbb88ff, trailColor: 0x8855dd, splashRadius: 8,
    effects: ["damage", "knockback", "aoe_explosion"],
    effectValues: { knockbackForce: 20 },
    range: 60,
  },
  {
    id: "void_lance", name: "Void Lance", icon: "\uD83D\uDD2E",
    desc: "Arcane + Shadow = piercing void beam. Ignores armor, pierces targets.",
    rune1: "arcane", rune2: "shadow",
    damage: 50, manaCost: 18, cooldown: 7, projectileSpeed: 170, projectileSize: 0.12,
    projectileColor: 0x4400aa, trailColor: 0x220066, splashRadius: 0,
    effects: ["damage", "pierce"],
    effectValues: { pierceCount: 5 },
    range: 130,
  },
];

// ---- Rune inventory for player spell crafting -----------------------------

export interface RuneInventory {
  rune1: RuneElement | null;
  rune2: RuneElement | null;
  craftedSpellId: string | null;
  craftedSpellCooldown: number;
}

export function createRuneInventory(): RuneInventory {
  return { rune1: null, rune2: null, craftedSpellId: null, craftedSpellCooldown: 0 };
}

export function findCraftedSpell(rune1: RuneElement, rune2: RuneElement): CraftedSpellDef | null {
  return CRAFTED_SPELL_DEFS.find(s =>
    (s.rune1 === rune1 && s.rune2 === rune2) ||
    (s.rune1 === rune2 && s.rune2 === rune1),
  ) || null;
}

export function getCraftedSpellDef(id: string): CraftedSpellDef | null {
  return CRAFTED_SPELL_DEFS.find(s => s.id === id) || null;
}

export function getRuneDef(element: RuneElement): RuneDef {
  return RUNE_DEFS.find(r => r.element === element) || RUNE_DEFS[0];
}

// ---- Environmental Spell (persistent field entity) definitions ------------

export type EnvSpellType =
  | "ice_wall" | "fire_pit" | "teleport_portal"
  | "lightning_fence" | "shadow_zone" | "nature_barrier"
  | "arcane_turret" | "wind_vortex";

export interface EnvSpellDef {
  id: string;
  name: string;
  icon: string;
  type: EnvSpellType;
  desc: string;
  manaCost: number;
  cooldown: number;
  duration: number;          // seconds the entity persists
  width: number;             // X extent (collision box half-width)
  height: number;            // Y extent
  depth: number;             // Z extent
  color: number;
  emissiveColor: number;
  damagePerSecond: number;   // 0 = no damage (wall/portal)
  slowFactor: number;        // 1.0 = no slow, 0.3 = heavy slow
  blockProjectiles: boolean;
  blockMovement: boolean;
  areaRadius: number;        // 0 = box collision only, >0 = circle area effect
  specialEffect: string;     // parsed by gameplay code
}

export const ENV_SPELL_DEFS: EnvSpellDef[] = [
  {
    id: "env_ice_wall", name: "Ice Wall", icon: "\uD83E\uDDCA",
    type: "ice_wall",
    desc: "Summon a wall of ice that blocks movement and projectiles. Slowly melts.",
    manaCost: 25, cooldown: 15, duration: 12,
    width: 4, height: 3, depth: 0.5,
    color: 0x88ddff, emissiveColor: 0x2266aa,
    damagePerSecond: 0, slowFactor: 1.0,
    blockProjectiles: true, blockMovement: true,
    areaRadius: 0, specialEffect: "freeze_on_touch",
  },
  {
    id: "env_fire_pit", name: "Fire Pit", icon: "\uD83D\uDD25",
    type: "fire_pit",
    desc: "Create a blazing fire pit on the ground. Enemies take burn damage walking through.",
    manaCost: 20, cooldown: 12, duration: 10,
    width: 3, height: 0.3, depth: 3,
    color: 0xff4400, emissiveColor: 0xff8800,
    damagePerSecond: 15, slowFactor: 0.6,
    blockProjectiles: false, blockMovement: false,
    areaRadius: 3, specialEffect: "dot_fire",
  },
  {
    id: "env_teleport_portal", name: "Teleport Portal", icon: "\uD83D\uDD2E",
    type: "teleport_portal",
    desc: "Place two linked portals. Step into one, emerge from the other. Allies only.",
    manaCost: 30, cooldown: 20, duration: 15,
    width: 1.2, height: 2.2, depth: 0.3,
    color: 0xaa44ff, emissiveColor: 0x6622cc,
    damagePerSecond: 0, slowFactor: 1.0,
    blockProjectiles: false, blockMovement: false,
    areaRadius: 1.5, specialEffect: "teleport_link",
  },
  {
    id: "env_lightning_fence", name: "Lightning Fence", icon: "\u26A1",
    type: "lightning_fence",
    desc: "Erect a crackling lightning barrier. Damages and stuns enemies passing through.",
    manaCost: 22, cooldown: 14, duration: 8,
    width: 5, height: 3, depth: 0.3,
    color: 0xffff44, emissiveColor: 0xcccc00,
    damagePerSecond: 20, slowFactor: 0.3,
    blockProjectiles: false, blockMovement: false,
    areaRadius: 0, specialEffect: "stun_on_pass",
  },
  {
    id: "env_shadow_zone", name: "Shadow Zone", icon: "\uD83C\uDF11",
    type: "shadow_zone",
    desc: "Create a dome of darkness. Enemies inside are blinded; allies gain stealth.",
    manaCost: 20, cooldown: 16, duration: 8,
    width: 5, height: 4, depth: 5,
    color: 0x220044, emissiveColor: 0x110022,
    damagePerSecond: 5, slowFactor: 0.8,
    blockProjectiles: false, blockMovement: false,
    areaRadius: 5, specialEffect: "blind_enemies",
  },
  {
    id: "env_nature_barrier", name: "Nature Barrier", icon: "\uD83C\uDF33",
    type: "nature_barrier",
    desc: "Grow a thick hedge wall. Blocks movement, heals nearby allies over time.",
    manaCost: 18, cooldown: 14, duration: 10,
    width: 5, height: 2.5, depth: 1,
    color: 0x226611, emissiveColor: 0x44aa22,
    damagePerSecond: 0, slowFactor: 1.0,
    blockProjectiles: true, blockMovement: true,
    areaRadius: 3, specialEffect: "heal_allies",
  },
  {
    id: "env_arcane_turret", name: "Arcane Turret", icon: "\uD83D\uDDFC",
    type: "arcane_turret",
    desc: "Summon an arcane turret that auto-fires at nearby enemies.",
    manaCost: 30, cooldown: 25, duration: 12,
    width: 0.8, height: 2, depth: 0.8,
    color: 0xaa88ff, emissiveColor: 0x6644cc,
    damagePerSecond: 0, slowFactor: 1.0,
    blockProjectiles: false, blockMovement: true,
    areaRadius: 0, specialEffect: "auto_turret",
  },
  {
    id: "env_wind_vortex", name: "Wind Vortex", icon: "\uD83C\uDF2A\uFE0F",
    type: "wind_vortex",
    desc: "Conjure a swirling vortex that pulls enemies in and launches them upward.",
    manaCost: 20, cooldown: 12, duration: 6,
    width: 3, height: 5, depth: 3,
    color: 0xccffcc, emissiveColor: 0x88cc88,
    damagePerSecond: 8, slowFactor: 0.4,
    blockProjectiles: false, blockMovement: false,
    areaRadius: 4, specialEffect: "pull_and_launch",
  },
];

export function getEnvSpellDef(id: string): EnvSpellDef {
  return ENV_SPELL_DEFS.find(e => e.id === id) || ENV_SPELL_DEFS[0];
}

// ---- Dragon Riding definitions --------------------------------------------

export interface DragonMountDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  hp: number;
  speed: number;
  maxSpeed: number;
  turnSpeed: number;
  climbRate: number;
  diveRate: number;
  minAltitude: number;
  maxAltitude: number;
  bodyColor: number;
  wingColor: number;
  accentColor: number;
  breathDamage: number;
  breathRange: number;
  breathConeAngle: number;    // radians
  breathCooldown: number;
  breathColor: number;
  barrelRollCooldown: number; // dodge move
  tailSwipeDamage: number;    // melee damage behind
  tailSwipeRange: number;
  riderSpellDamageMult: number; // spell damage multiplier while mounted
}

export const DRAGON_MOUNT_DEFS: DragonMountDef[] = [
  {
    id: "fire_dragon", name: "Inferno Drake", icon: "\uD83D\uDC32",
    desc: "Classic fire dragon. Great breath attack, balanced flight.",
    hp: 500, speed: 20, maxSpeed: 35, turnSpeed: 1.8,
    climbRate: 12, diveRate: 25, minAltitude: 5, maxAltitude: 40,
    bodyColor: 0x881100, wingColor: 0xcc4400, accentColor: 0xff8800,
    breathDamage: 12, breathRange: 25, breathConeAngle: 0.5,
    breathCooldown: 0.15, breathColor: 0xff4400,
    barrelRollCooldown: 5, tailSwipeDamage: 40, tailSwipeRange: 4,
    riderSpellDamageMult: 0.8,
  },
  {
    id: "frost_dragon", name: "Glacial Wyrm", icon: "\u2744\uFE0F",
    desc: "Ice dragon. Slowing breath, heavy armor, slower flight.",
    hp: 650, speed: 16, maxSpeed: 28, turnSpeed: 1.5,
    climbRate: 10, diveRate: 20, minAltitude: 5, maxAltitude: 35,
    bodyColor: 0x224466, wingColor: 0x4488aa, accentColor: 0x88ddff,
    breathDamage: 8, breathRange: 30, breathConeAngle: 0.6,
    breathCooldown: 0.12, breathColor: 0x88ddff,
    barrelRollCooldown: 6, tailSwipeDamage: 50, tailSwipeRange: 5,
    riderSpellDamageMult: 0.7,
  },
  {
    id: "storm_dragon", name: "Tempest Serpent", icon: "\u26A1",
    desc: "Lightning dragon. Fastest flyer, chain lightning breath.",
    hp: 400, speed: 25, maxSpeed: 45, turnSpeed: 2.2,
    climbRate: 15, diveRate: 30, minAltitude: 5, maxAltitude: 50,
    bodyColor: 0x444400, wingColor: 0x888844, accentColor: 0xffff44,
    breathDamage: 10, breathRange: 20, breathConeAngle: 0.4,
    breathCooldown: 0.1, breathColor: 0xffff44,
    barrelRollCooldown: 3, tailSwipeDamage: 30, tailSwipeRange: 3,
    riderSpellDamageMult: 0.9,
  },
  {
    id: "shadow_dragon", name: "Void Wyvern", icon: "\uD83C\uDF11",
    desc: "Shadow dragon. Stealth dives, dark breath that blinds.",
    hp: 380, speed: 22, maxSpeed: 38, turnSpeed: 2.0,
    climbRate: 14, diveRate: 35, minAltitude: 3, maxAltitude: 45,
    bodyColor: 0x1a0a2e, wingColor: 0x331155, accentColor: 0x8833aa,
    breathDamage: 10, breathRange: 22, breathConeAngle: 0.5,
    breathCooldown: 0.15, breathColor: 0x8833aa,
    barrelRollCooldown: 4, tailSwipeDamage: 35, tailSwipeRange: 4,
    riderSpellDamageMult: 1.0,
  },
  {
    id: "nature_dragon", name: "Elder Treedrake", icon: "\uD83C\uDF3F",
    desc: "Nature dragon. Healing breath, tough, moderate speed.",
    hp: 600, speed: 18, maxSpeed: 30, turnSpeed: 1.6,
    climbRate: 11, diveRate: 22, minAltitude: 5, maxAltitude: 35,
    bodyColor: 0x225511, wingColor: 0x448822, accentColor: 0x88ff44,
    breathDamage: 6, breathRange: 28, breathConeAngle: 0.6,
    breathCooldown: 0.2, breathColor: 0x44aa22,
    barrelRollCooldown: 6, tailSwipeDamage: 45, tailSwipeRange: 5,
    riderSpellDamageMult: 0.75,
  },
];

export function getDragonMountDef(id: string): DragonMountDef {
  return DRAGON_MOUNT_DEFS.find(d => d.id === id) || DRAGON_MOUNT_DEFS[0];
}

// ---- Duel Arena definitions -----------------------------------------------

export type DuelPhase = "lobby" | "spell_select" | "countdown" | "fighting" | "round_end" | "match_end";

export interface DuelArenaConfig {
  id: string;
  name: string;
  icon: string;
  desc: string;
  size: number;            // arena radius
  groundColor: number;
  wallColor: number;
  ambientColor: number;
  fogColor: number;
  hazards: DuelHazardDef[];
}

export interface DuelHazardDef {
  type: "lava_pool" | "spike_trap" | "wind_gust" | "lightning_strike";
  x: number;
  z: number;
  radius: number;
  damage: number;
  interval: number;       // seconds between activations (0 = always active)
}

export const DUEL_ARENA_DEFS: DuelArenaConfig[] = [
  {
    id: "arena_stone_circle", name: "Stone Circle", icon: "\uD83D\uDD73\uFE0F",
    desc: "Ancient circular stone arena. Clean dueling with no hazards.",
    size: 20, groundColor: 0x555555, wallColor: 0x777777,
    ambientColor: 0xcccccc, fogColor: 0x333333,
    hazards: [],
  },
  {
    id: "arena_inferno", name: "Inferno Pit", icon: "\uD83D\uDD25",
    desc: "Volcanic arena with lava pools around the edges.",
    size: 22, groundColor: 0x2a1a0a, wallColor: 0x553311,
    ambientColor: 0xff8844, fogColor: 0x331100,
    hazards: [
      { type: "lava_pool", x: -8, z: -8, radius: 3, damage: 15, interval: 0 },
      { type: "lava_pool", x: 8, z: 8, radius: 3, damage: 15, interval: 0 },
      { type: "lava_pool", x: -8, z: 8, radius: 2, damage: 15, interval: 0 },
      { type: "lava_pool", x: 8, z: -8, radius: 2, damage: 15, interval: 0 },
    ],
  },
  {
    id: "arena_storm", name: "Stormtop Plateau", icon: "\u26A1",
    desc: "Exposed mountain peak. Random lightning strikes hit the arena.",
    size: 25, groundColor: 0x556666, wallColor: 0x667777,
    ambientColor: 0x8899aa, fogColor: 0x445566,
    hazards: [
      { type: "lightning_strike", x: 0, z: 0, radius: 2.5, damage: 30, interval: 6 },
      { type: "lightning_strike", x: 5, z: 5, radius: 2, damage: 25, interval: 8 },
      { type: "lightning_strike", x: -5, z: -5, radius: 2, damage: 25, interval: 8 },
      { type: "wind_gust", x: 0, z: 10, radius: 4, damage: 0, interval: 5 },
    ],
  },
  {
    id: "arena_shadow", name: "Shadow Sanctum", icon: "\uD83C\uDF11",
    desc: "Dark arena with spike traps that emerge periodically.",
    size: 18, groundColor: 0x1a0a1a, wallColor: 0x2a1a2a,
    ambientColor: 0x6633aa, fogColor: 0x110022,
    hazards: [
      { type: "spike_trap", x: -4, z: 0, radius: 1.5, damage: 25, interval: 4 },
      { type: "spike_trap", x: 4, z: 0, radius: 1.5, damage: 25, interval: 4 },
      { type: "spike_trap", x: 0, z: -4, radius: 1.5, damage: 25, interval: 5 },
      { type: "spike_trap", x: 0, z: 4, radius: 1.5, damage: 25, interval: 5 },
    ],
  },
];

export function getDuelArenaDef(id: string): DuelArenaConfig {
  return DUEL_ARENA_DEFS.find(a => a.id === id) || DUEL_ARENA_DEFS[0];
}

// ---- Duel loadout slots ---------------------------------------------------

export const DUEL_MAX_SPELL_SLOTS = 4;
export const DUEL_SPELL_SELECT_TIME = 20;   // seconds for spell selection phase
export const DUEL_COUNTDOWN_TIME = 3;
export const DUEL_ROUNDS_TO_WIN = 3;
export const DUEL_ROUND_TIME = 60;           // seconds per round

export interface DuelLoadout {
  classId: string;
  primaryWandId: string;
  secondaryWandId: string;
  craftedSpellIds: string[];   // up to DUEL_MAX_SPELL_SLOTS
  envSpellId: string | null;
}

export function createDefaultDuelLoadout(classId: string): DuelLoadout {
  const MAGE_CLASS_MAP: Record<string, { primary: string; secondary: string }> = {
    battlemage: { primary: "arcane_bolt", secondary: "arcane_pistol" },
    pyromancer: { primary: "fire_stream", secondary: "fire_burst" },
    cryomancer: { primary: "frost_rifle", secondary: "arcane_pistol" },
    stormcaller: { primary: "lightning_arc", secondary: "void_dagger" },
    shadowmancer: { primary: "shadow_repeater", secondary: "void_dagger" },
    druid: { primary: "nature_thorns", secondary: "arcane_pistol" },
    warlock: { primary: "shadow_repeater", secondary: "fire_burst" },
    archmage: { primary: "arcane_bolt", secondary: "arcane_pistol" },
  };
  const defaults = MAGE_CLASS_MAP[classId] || MAGE_CLASS_MAP.battlemage;
  return {
    classId,
    primaryWandId: defaults.primary,
    secondaryWandId: defaults.secondary,
    craftedSpellIds: [],
    envSpellId: null,
  };
}

// ---- Dragon combat balance constants --------------------------------------

export const DRAGON_COMBAT = {
  LOCK_ON_RANGE: 60,
  LOCK_ON_ANGLE: 0.4,         // radians from center to acquire lock
  LOCK_ON_TIME: 1.5,          // seconds to achieve full lock
  BARREL_ROLL_DURATION: 0.6,
  BARREL_ROLL_INVULN: true,
  DIVE_BOMB_SPEED_MULT: 2.0,
  DIVE_BOMB_DAMAGE: 80,
  DIVE_BOMB_RADIUS: 5,
  AIR_BRAKE_MULT: 0.3,
  COLLISION_DAMAGE: 100,      // dragon-to-dragon collision
  DISMOUNT_ALTITUDE: 8,       // safe dismount if below this altitude
  BREATH_MANA_COST: 2,        // mana per breath tick
  SPELL_CAST_WHILE_FLYING: true,
};
