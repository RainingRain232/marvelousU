// ---------------------------------------------------------------------------
// LOT: Fate's Gambit — state definitions
// ---------------------------------------------------------------------------

import { LOT, type LotType, type Difficulty } from "../config/LotConfig";

// ---- ID generation ----
let _nextId = 1;
export function genLotId(): number { return _nextId++; }

// ---- Phases ----
export type LotPhase =
  | "menu"
  | "draw"           // Lot is being revealed
  | "active"         // Challenge in progress
  | "victory"        // Round cleared
  | "buff_select"    // Choose a buff card
  | "intermission"   // Between rounds — upgrade shop, heal
  | "game_over";

// ---- Entity types ----
export interface Vec3 { x: number; y: number; z: number; }

export interface LotPlayer {
  pos: Vec3;
  vel: Vec3;
  yaw: number;
  pitch: number;
  hp: number;
  maxHp: number;
  stamina: number;
  grounded: boolean;
  dodgeTimer: number;
  dodgeCooldown: number;
  iframeTimer: number;
  attackTimer: number;
  heavyChargeTimer: number;
  heavyCharging: boolean;
  blocking: boolean;
  comboCount: number;
  comboTimer: number;
  hitFlash: number;
  killStreak: number;
  killStreakTimer: number;
  lastHitDir: number; // angle of last damage source for directional indicator
  lastHitTimer: number;
  fateShieldUsed: boolean; // consumed once per round
  burnTargets: Map<number, number>; // enemy id → remaining burn seconds
  // Abilities
  whirlwindCd: number;
  whirlwindActive: number;
  dashStrikeCd: number;
  reflectCd: number;
  reflectActive: number;
}

export type EnemyType = "skeleton" | "skeleton_archer" | "wraith" | "golem" | "boss" | "champion" | "necromancer";
export type EnemyBehavior = "idle" | "chase" | "attack" | "charge" | "slam" | "teleport" | "stunned" | "dead" | "parry" | "phase_dash" | "ranged" | "resurrect" | "flank";

export interface LotEnemy {
  id: number;
  type: EnemyType;
  pos: Vec3;
  vel: Vec3;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  attackRange: number;
  attackCd: number;
  attackTimer: number;
  behavior: EnemyBehavior;
  behaviorTimer: number;
  yaw: number;
  hitFlash: number;
  specialCd: number;
  specialTimer: number;
  dead: boolean;
  deathTimer: number;
  bossPhase: number; // 1, 2, 3 for multi-phase bosses
  flankIndex: number; // which position in the encirclement
  burning: number;
  stunVisual: number;
  walkCycle: number;
  elite: boolean;
  spawnTimer: number; // emergence animation countdown (starts at 0.6, counts to 0)
}

export interface Projectile {
  id: number;
  pos: Vec3;
  vel: Vec3;
  damage: number;
  radius: number;
  life: number;
  fromEnemy: boolean;
  color: string;
}

export interface Shockwave {
  pos: Vec3;
  radius: number;
  maxRadius: number;
  speed: number;
  damage: number;
  hit: boolean;
}

export interface GroundTelegraph {
  pos: Vec3;
  radius: number;
  timer: number;
  maxTimer: number;
  color: string;
}

export interface Obstacle {
  id: number;
  type: "spike_trap" | "fire_pillar" | "pendulum";
  pos: Vec3;
  radius: number;
  damage: number;
  timer: number;
  active: boolean;
  angle: number;
  speed: number;
}

export interface Treasure {
  id: number;
  pos: Vec3;
  collected: boolean;
  type: "gold" | "heal" | "fortune";
  glowTimer: number;
}

export interface Particle {
  pos: Vec3;
  vel: Vec3;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface DamageNumber {
  pos: Vec3;
  value: number;
  timer: number;
  crit: boolean;
}

export interface Notification {
  text: string;
  color: string;
  timer: number;
}

export interface ArenaPillar {
  pos: Vec3;
  height: number;
  radius: number;
  hp: number;
  destroyed: boolean;
  crumbleTimer: number;
}

// ---- Buffs ----
export type BuffType =
  | "blood_oath"       // +30% dmg, +15% dmg taken
  | "iron_skin"        // +25 max HP
  | "swift_feet"       // +20% move speed (2 rounds)
  | "vampiric_edge"    // heal 5% of dmg dealt
  | "fortunes_favor"   // +1 fortune
  | "berserker_rage"   // more dmg at low HP
  | "phantom_dodge"    // -40% dodge cd, 2x iframes (3 rounds)
  | "elemental_sword"  // attacks apply burn DoT
  | "glass_cannon"     // +60% dmg, -40% max HP
  | "focus_fire"       // enemies take 2x dmg but attack 2x faster
  | "fortress";        // +50% max HP, -40% move speed

export interface ActiveBuff {
  type: BuffType;
  roundsLeft: number; // -1 = permanent
}

export const BUFF_INFO: Record<BuffType, { name: string; desc: string; color: string; icon: string; duration: number }> = {
  blood_oath:      { name: "Blood Oath",      desc: "+30% damage, but take +15% damage", color: "#ff4444", icon: "🩸", duration: -1 },
  iron_skin:       { name: "Iron Skin",       desc: "+25 max HP permanently",            color: "#aabbcc", icon: "🛡", duration: -1 },
  swift_feet:      { name: "Swift Feet",      desc: "+20% move speed for 2 rounds",      color: "#44ddff", icon: "💨", duration: 2 },
  vampiric_edge:   { name: "Vampiric Edge",   desc: "Heal 5% of damage dealt",           color: "#cc44aa", icon: "🧛", duration: -1 },
  fortunes_favor:  { name: "Fortune's Favor", desc: "+1 Fortune immediately",             color: "#ffd700", icon: "✦",  duration: 0 },
  berserker_rage:  { name: "Berserker Rage",  desc: "Deal more damage at lower HP",      color: "#ff6622", icon: "🔥", duration: -1 },
  phantom_dodge:   { name: "Phantom Dodge",   desc: "Dodge CD -40%, iframes doubled for 3 rounds", color: "#8844ff", icon: "👻", duration: 3 },
  elemental_sword: { name: "Elemental Sword", desc: "Attacks burn enemies (3 dmg/s for 3s)", color: "#ff8800", icon: "⚔",  duration: -1 },
  glass_cannon:    { name: "Glass Cannon",    desc: "+60% damage but -40% max HP",         color: "#ff2244", icon: "💀", duration: -1 },
  focus_fire:      { name: "Focus Fire",      desc: "Enemies take 2x dmg but attack 2x faster", color: "#ff6600", icon: "🎯", duration: 3 },
  fortress:        { name: "Fortress",        desc: "+50% max HP but -40% move speed",     color: "#4466aa", icon: "🏰", duration: -1 },
};

// ---- Upgrades ----
export type UpgradeId =
  | "tempered_blade"
  | "fortified_armor"
  | "endurance"
  | "quick_recovery"
  | "fortune_seeker"
  | "heavy_mastery"
  | "life_drain"
  | "fates_shield";

export interface UpgradeDef {
  name: string;
  desc: string;
  maxLevel: number;
  costs: number[];
  icon: string;
  color: string;
}

export const UPGRADE_DEFS: Record<UpgradeId, UpgradeDef> = {
  tempered_blade:  { name: "Tempered Blade",  desc: "+15% attack damage per level",  maxLevel: 3, costs: [500, 1000, 2000],  icon: "⚔", color: "#ff6644" },
  fortified_armor: { name: "Fortified Armor", desc: "+15 max HP per level",          maxLevel: 3, costs: [500, 1000, 2000],  icon: "🛡", color: "#6688bb" },
  endurance:       { name: "Endurance",        desc: "+20 max stamina per level",     maxLevel: 2, costs: [400, 800],         icon: "💪", color: "#44cc88" },
  quick_recovery:  { name: "Quick Recovery",   desc: "-20% dodge cooldown per level", maxLevel: 2, costs: [600, 1200],        icon: "💨", color: "#44aaff" },
  fortune_seeker:  { name: "Fortune Seeker",   desc: "+10% fortune drop chance",      maxLevel: 2, costs: [800, 1600],        icon: "✦",  color: "#ffd700" },
  heavy_mastery:   { name: "Heavy Mastery",    desc: "-0.15s heavy charge time",      maxLevel: 2, costs: [700, 1400],        icon: "🔨", color: "#cc8844" },
  life_drain:      { name: "Life Drain",       desc: "Heal 3 HP per kill",            maxLevel: 1, costs: [1500],             icon: "❤",  color: "#cc44aa" },
  fates_shield:    { name: "Fate's Shield",    desc: "Survive one lethal hit per round (1 HP)", maxLevel: 1, costs: [1200],   icon: "✝",  color: "#ffdd44" },
};

// ---- Arena Mutations ----
export type MutationType =
  | "none"
  | "frozen"       // Icy floor, low friction
  | "overgrown"    // Triple pillars
  | "blood_moon"   // Enemies +30% speed/dmg, +50% score
  | "fog"          // Dense fog, low visibility
  | "runic_overcharge"; // Floor runes explode periodically

export const MUTATION_INFO: Record<MutationType, { name: string; desc: string; color: string }> = {
  none:             { name: "",                 desc: "",                                   color: "#888" },
  frozen:           { name: "Frozen Arena",     desc: "Icy floor — reduced friction",       color: "#88ccff" },
  overgrown:        { name: "Overgrown",        desc: "Dense pillar forest",                color: "#44aa44" },
  blood_moon:       { name: "Blood Moon",       desc: "Enemies empowered, +50% score",      color: "#ff2222" },
  fog:              { name: "Fog of War",       desc: "Dense fog — limited visibility",     color: "#666688" },
  runic_overcharge: { name: "Runic Overcharge", desc: "Floor runes explode periodically",   color: "#aa44ff" },
};

// ---- Kill streak tiers ----
export const KILL_STREAKS: { count: number; label: string; color: string }[] = [
  { count: 3, label: "TRIPLE KILL", color: "#ffaa44" },
  { count: 5, label: "RAMPAGE", color: "#ff6622" },
  { count: 8, label: "UNSTOPPABLE", color: "#ff2222" },
  { count: 12, label: "GODLIKE", color: "#ff00ff" },
];

// ---- Main state ----
export interface LotState {
  screenW: number;
  screenH: number;
  phase: LotPhase;
  phaseTimer: number;
  difficulty: Difficulty;
  tick: number;
  gameTime: number;
  paused: boolean;

  // Fortune & rounds
  round: number;
  fortune: number;
  score: number;
  bestRound: number;
  totalKills: number;
  roundKills: number;
  flawless: boolean;

  // Current lot
  currentLot: LotType | null;
  drawnLot: LotType | null;
  lotOptions: LotType[];
  rerolled: boolean;

  // Player
  player: LotPlayer;

  // Enemies
  enemies: LotEnemy[];
  spawnQueue: { type: EnemyType; delay: number }[];

  // Projectiles & shockwaves
  projectiles: Projectile[];
  shockwaves: Shockwave[];

  // Obstacles
  obstacles: Obstacle[];
  obstacleTimeLeft: number; // dedicated timer for gauntlet

  // Treasures
  treasures: Treasure[];
  treasuresCollected: number;
  treasureTimeLeft: number;

  // Cursed arena
  curseRadius: number;

  // Arena
  arenaRadius: number;
  pillars: ArenaPillar[];
  arenaRotation: number;
  mutation: MutationType;
  runicExplosions: { pos: Vec3; timer: number; radius: number; warned: boolean }[];

  // Ground telegraphs (attack warning circles)
  telegraphs: GroundTelegraph[];

  // Ground decals (scorch marks, impact craters)
  decals: { pos: Vec3; radius: number; color: string; life: number }[];

  // Attack arc visualization
  attackArcTimer: number; // >0 shows arc mesh
  attackArcHeavy: boolean;

  // Combat shrines
  shrines: { pos: Vec3; type: "power" | "speed" | "armor"; timer: number; collected: boolean }[];

  // Buffs & upgrades
  buffs: ActiveBuff[];
  buffChoices: BuffType[]; // 3 choices during buff_select phase
  upgrades: Record<UpgradeId, number>;

  // Effects
  particles: Particle[];
  damageNumbers: DamageNumber[];
  notifications: Notification[];
  screenShake: number;
  hitStopTimer: number;
  hitStopScale: number;
  slowMotionTimer: number;
  slowMotionScale: number;
  screenFlash: number;        // white flash intensity (0-1)
  screenFlashColor: string;   // flash tint color
  killStreakLabel: string;
  killStreakTimer: number;
  killStreakColor: string;

  // Sword trail (last N positions of sword tip for rendering)
  swordTrail: Vec3[];

  // Input
  keys: Set<string>;
  mouseDown: boolean;
  rightMouseDown: boolean;
  mouseX: number;
  mouseY: number;
  mouseDX: number;
  mouseDY: number;
  pointerLocked: boolean;
}

export function createLotState(sw: number, sh: number): LotState {
  return {
    screenW: sw,
    screenH: sh,
    phase: "menu",
    phaseTimer: 0,
    difficulty: "normal",
    tick: 0,
    gameTime: 0,
    paused: false,

    round: 0,
    fortune: LOT.STARTING_FORTUNE,
    score: 0,
    bestRound: 0,
    totalKills: 0,
    roundKills: 0,
    flawless: true,

    currentLot: null,
    drawnLot: null,
    lotOptions: [],
    rerolled: false,

    player: {
      pos: { x: 0, y: 1, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      hp: LOT.MAX_HP,
      maxHp: LOT.MAX_HP,
      stamina: LOT.STAMINA_MAX,
      grounded: true,
      dodgeTimer: 0,
      dodgeCooldown: 0,
      iframeTimer: 0,
      attackTimer: 0,
      heavyChargeTimer: 0,
      heavyCharging: false,
      blocking: false,
      comboCount: 0,
      comboTimer: 0,
      hitFlash: 0,
      killStreak: 0,
      killStreakTimer: 0,
      lastHitDir: 0,
      lastHitTimer: 0,
      fateShieldUsed: false,
      burnTargets: new Map(),
      whirlwindCd: 0,
      whirlwindActive: 0,
      dashStrikeCd: 0,
      reflectCd: 0,
      reflectActive: 0,
    },

    enemies: [],
    spawnQueue: [],
    projectiles: [],
    shockwaves: [],
    obstacles: [],
    obstacleTimeLeft: 0,
    treasures: [],
    treasuresCollected: 0,
    treasureTimeLeft: 0,
    curseRadius: LOT.ARENA_RADIUS,

    arenaRadius: LOT.ARENA_RADIUS,
    pillars: [],
    arenaRotation: 0,
    mutation: "none",
    runicExplosions: [],

    buffs: [],
    buffChoices: [],
    upgrades: {
      tempered_blade: 0,
      fortified_armor: 0,
      endurance: 0,
      quick_recovery: 0,
      fortune_seeker: 0,
      heavy_mastery: 0,
      life_drain: 0,
      fates_shield: 0,
    },

    particles: [],
    damageNumbers: [],
    notifications: [],
    telegraphs: [],
    decals: [],
    attackArcTimer: 0,
    attackArcHeavy: false,
    shrines: [],

    screenShake: 0,
    hitStopTimer: 0,
    hitStopScale: 0.1,
    slowMotionTimer: 0,
    slowMotionScale: 1,
    screenFlash: 0,
    screenFlashColor: "#ffffff",
    killStreakLabel: "",
    killStreakTimer: 0,
    killStreakColor: "",

    swordTrail: [],

    keys: new Set(),
    mouseDown: false,
    rightMouseDown: false,
    mouseX: 0,
    mouseY: 0,
    mouseDX: 0,
    mouseDY: 0,
    pointerLocked: false,
  };
}
