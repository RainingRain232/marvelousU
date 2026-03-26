// ---------------------------------------------------------------------------
// Pendulum — The Clockwork Knight — state types & factory
// ---------------------------------------------------------------------------

import { PENDULUM } from "../config/PendulumConfig";

export interface Vec3 { x: number; y: number; z: number; }

// ---- Phases ----
export type PendulumPhase =
  | "menu"
  | "playing"
  | "intermission"
  | "game_over";

// ---- Player ----
export type PlayerAction =
  | "idle"
  | "walking"
  | "sprinting"
  | "dashing"
  | "casting"
  | "dead";

export interface PendulumPlayer {
  pos: Vec3;
  vel: Vec3;
  yaw: number;
  pitch: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  action: PlayerAction;
  onGround: boolean;
  // Abilities
  chronoStrikeCD: number;
  gearThrowCD: number;
  timeSlowCD: number;
  rewindCD: number;
  timeStopCD: number;
  dashCD: number;
  // Active effects
  timeSlowTimer: number;
  timeSlowPos: Vec3 | null;
  timeStopTimer: number;
  // Dash
  dashTimer: number;
  dashDir: Vec3;
  invincibleTimer: number;
  // Cast animation timers (for renderer)
  gearThrowCastTimer: number;
  timeSlowCastTimer: number;
  rewindCastTimer: number;
  timeStopCastTimer: number;
  // Combo
  combo: number;
  comboTimer: number;
  maxCombo: number;
  // Chrono strike combo chain
  strikeComboStep: number;
  strikeComboTimer: number;
  // Resources
  gears: number;
  // Upgrades
  strikeLevel: number;
  armorLevel: number;
  speedLevel: number;
  gearThrowLevel: number;
  chronoLevel: number;
  turretLevel: number;
  pillarLevel: number;
  // Kill streak
  killStreak: number;
  killStreakTimer: number;
  // Repairing
  repairingPillarIdx: number;   // -1 = not repairing
  // Block
  blocking: boolean;
  blockTimer: number;
}

// ---- Enemies ----
export type EnemyType =
  | "gear_drone"
  | "spring_knight"
  | "coil_archer"
  | "brass_golem"
  | "clock_spider"
  | "chronovore";

export type EnemyBehavior =
  | "approaching"
  | "attacking"
  | "chasing"
  | "charging"
  | "leaping"
  | "casting"
  | "retreating"
  | "stunned"
  | "frozen"        // time-frozen
  | "dead";

export interface Enemy {
  id: string;
  type: EnemyType;
  pos: Vec3;
  vel: Vec3;
  rotation: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  behavior: EnemyBehavior;
  attackTimer: number;
  stunTimer: number;
  frozenTimer: number;          // time freeze remaining
  deathTimer: number;
  target: "tower" | "pillar" | "player" | "turret";
  targetPillarIdx: number;
  flying: boolean;
  colorVariant: number;
  hitFlash: number;
  bobPhase: number;
  // Slow zone effect
  timeSlowed: boolean;
  timeSlowFactor: number;
  // Type-specific
  fireCD: number;               // coil_archer
  chargeCD: number;             // spring_knight
  chargeTimer: number;
  chargeDir: Vec3;
  leapCD: number;               // clock_spider
  leapTimer: number;
  slamCD: number;               // brass_golem / chronovore
  slamDelayTimer: number;       // telegraph delay before slam hits
  spawnCD: number;              // chronovore
  beamCD: number;               // chronovore
  beamTimer: number;
  snaredTimer: number;
  // Boss phase
  bossPhase: number;
  // Knockback
  knockbackVel: Vec3;
  knockbackTimer: number;
}

// ---- Clock Tower ----
export interface ClockTower {
  hp: number;
  maxHp: number;
  hourHand: number;    // 0-360 degrees
  minuteHand: number;  // 0-360 degrees
}

// ---- Gear Pillars ----
export type PillarStatus = "active" | "damaged" | "destroyed";

export interface GearPillar {
  pos: Vec3;
  hp: number;
  maxHp: number;
  status: PillarStatus;
  repairProgress: number;
  gearRotation: number;       // visual spinning
}

// ---- Clockwork Turrets (allies) ----
export interface Turret {
  id: string;
  pos: Vec3;
  hp: number;
  maxHp: number;
  attackTimer: number;
  targetId: string | null;
  barrelRotation: number;
}

// ---- Particles ----
export interface PendulumParticle {
  pos: Vec3;
  vel: Vec3;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  type: "spark" | "gear_bit" | "steam" | "chrono" | "rust" | "bolt" | "impact" | "trail" | "time_ripple" | "clock_dust";
}

// ---- Floating damage numbers ----
export interface DamageNumber {
  pos: Vec3;
  value: number;
  timer: number;
  color: number;
  crit: boolean;
}

// ---- Gear Fragments (resource orbs) ----
export interface GearFragment {
  pos: Vec3;
  vel: Vec3;
  value: number;
  life: number;
  attracted: boolean;
}

// ---- Repair Kits ----
export interface RepairKit {
  pos: Vec3;
  vel: Vec3;
  heal: number;
  life: number;
}

// ---- Projectiles ----
export type ProjectileOwner = "player" | "enemy";
export interface Projectile {
  id: string;
  pos: Vec3;
  vel: Vec3;
  damage: number;
  life: number;
  type: "gear" | "bolt" | "chrono_beam" | "reversed_bolt";
  owner: ProjectileOwner;
  ownerId: string;
  bouncesLeft: number;
}

// ---- Spawn Queue ----
export interface SpawnEntry {
  type: EnemyType;
  delay: number;
  targetPillarIdx: number;
}

// ---- Time Slow Zones (active on field) ----
export interface TimeSlowZone {
  pos: Vec3;
  radius: number;
  timer: number;
  factor: number;
}

// ---- Wave Modifiers ----
export type WaveModifier = "none" | "overclock" | "rust_storm" | "haywire" | "magnetic";
export type Difficulty = "easy" | "normal" | "hard" | "nightmare";

export interface GameStats {
  damageDealt: number;
  damageTaken: number;
  towerDamage: number;
  pillarsLost: number;
  gearsEarned: number;
  abilitiesUsed: number;
}

export const WAVE_MODIFIER_NAMES: Record<WaveModifier, string> = {
  none: "",
  overclock: "OVERCLOCK",
  rust_storm: "RUST STORM",
  haywire: "HAYWIRE",
  magnetic: "MAGNETIC PULL",
};

export const WAVE_MODIFIER_COLORS: Record<WaveModifier, number> = {
  none: 0xffffff,
  overclock: 0xff6622,
  rust_storm: 0x886644,
  haywire: 0xcc2233,
  magnetic: 0x4488cc,
};

// ---- Buffs ----
export type BuffId = "brass_plating" | "spring_coil" | "chrono_surge" | "gear_harvest" | "overcharge" | "iron_frame" | "temporal_echo";

export interface ActiveBuff {
  id: BuffId;
  name: string;
  description: string;
  duration: number;
  remaining: number;
}

export const BUFF_POOL: { id: BuffId; name: string; description: string; duration: number }[] = [
  { id: "brass_plating", name: "Brass Plating", description: "+20% damage reduction", duration: -1 },
  { id: "spring_coil", name: "Spring Coil", description: "+25% move speed", duration: 2 },
  { id: "chrono_surge", name: "Chrono Surge", description: "+35% ability damage", duration: 2 },
  { id: "gear_harvest", name: "Gear Harvest", description: "+50% gear drops", duration: 2 },
  { id: "overcharge", name: "Overcharge", description: "Pendulum power +30%", duration: 2 },
  { id: "iron_frame", name: "Iron Frame", description: "+40 max HP", duration: -1 },
  { id: "temporal_echo", name: "Temporal Echo", description: "Attacks hit twice (50% dmg)", duration: 2 },
];

// ---- Notifications ----
export interface PendulumNotification {
  text: string;
  timer: number;
  color: number;
}

// ---- Upgrades ----
export interface Upgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  maxLevel: number;
  field: keyof Pick<PendulumPlayer,
    "strikeLevel" | "armorLevel" | "speedLevel" | "gearThrowLevel" | "chronoLevel" | "turretLevel" | "pillarLevel">;
}

export const UPGRADES: Upgrade[] = [
  { id: "strike", name: "Chrono Edge", description: "+25% melee damage. Lv3: strikes restore 1 gear", baseCost: 3, maxLevel: 4, field: "strikeLevel" },
  { id: "armor", name: "Brass Armor", description: "+12 HP, +8% DR. Lv3: parry window +0.15s", baseCost: 4, maxLevel: 4, field: "armorLevel" },
  { id: "speed", name: "Spring Step", description: "+12% speed, +10 stamina. Lv3: dash leaves time trail", baseCost: 3, maxLevel: 4, field: "speedLevel" },
  { id: "gearThrow", name: "Razor Gears", description: "+30% gear dmg, +1 bounce. Lv3: gears pierce", baseCost: 5, maxLevel: 4, field: "gearThrowLevel" },
  { id: "chrono", name: "Time Mastery", description: "+25% slow zone radius & duration. Lv3: frozen enemies shatter", baseCost: 5, maxLevel: 4, field: "chronoLevel" },
  { id: "turret", name: "Turret Works", description: "+1 max turret, +30% turret dmg. Lv3: turrets slow enemies", baseCost: 4, maxLevel: 3, field: "turretLevel" },
  { id: "pillar", name: "Pillar Ward", description: "Pillars +2 HP/s, +30 HP. Lv3: active pillars buff damage +5%", baseCost: 4, maxLevel: 3, field: "pillarLevel" },
];

export function getUpgradeCost(upg: Upgrade, currentLevel: number): number {
  return Math.ceil(upg.baseCost * Math.pow(PENDULUM.UPGRADE_COST_SCALE, currentLevel));
}

// ---- Decorative debris ----
export interface ClockDebris {
  pos: Vec3;
  height: number;
  radius: number;
  type: "gear" | "spring" | "cog" | "pipe";
  rusted: boolean;
  spinPhase: number;
}

// ---- Main State ----
export interface PendulumState {
  phase: PendulumPhase;
  tick: number;
  gameTime: number;
  wave: number;
  waveTimer: number;
  phaseTimer: number;
  waveModifier: WaveModifier;
  paused: boolean;
  hitStopTimer: number;
  hitStopScale: number;
  // Pendulum
  pendulumAngle: number;        // current angle of swing (-1 to 1)
  pendulumPower: number;        // current power multiplier
  // Core entities
  player: PendulumPlayer;
  enemies: Map<string, Enemy>;
  clockTower: ClockTower;
  pillars: GearPillar[];
  turrets: Turret[];
  debris: ClockDebris[];
  // Active zones
  timeSlowZones: TimeSlowZone[];
  // Visual
  particles: PendulumParticle[];
  notifications: PendulumNotification[];
  damageNumbers: DamageNumber[];
  gearFragments: GearFragment[];
  repairKits: RepairKit[];
  projectiles: Projectile[];
  spawnQueue: SpawnEntry[];
  spawnTimer: number;
  // Entropy
  entropy: number;
  // Stats
  enemiesKilled: number;
  totalKills: number;
  bestWave: number;
  // Clock hour
  clockHour: number;
  clockHourTimer: number;
  // Screen
  screenW: number;
  screenH: number;
  // Input
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  rightMouseDown: boolean;
  nextId: number;
  pointerLocked: boolean;
  mouseDX: number;
  mouseDY: number;
  screenShake: number;
  screenShakeIntensity: number;
  difficulty: Difficulty;
  stats: GameStats;
  deathSequenceTimer: number;
  screenFlash: { color: string; intensity: number; timer: number };
  waveTitle: { text: string; timer: number; color: string };
  // Pending visual events
  pendingSlam: { x: number; z: number } | null;
  pendingTimeSlowPos: Vec3 | null;
  pendingRewindPos: Vec3 | null;
  // Wave modifier timers
  rustStormDotTimer: number;
  // Enemy count
  aliveEnemyCount: number;
  // Pending effects
  pendingBossRoar: boolean;
  pendingRepairPillarIdx: number;
  // Time stop active flag
  timeStopActive: boolean;
  // Buff system
  activeBuffs: ActiveBuff[];
  buffChoices: { id: BuffId; name: string; description: string; duration: number }[];
  buffSelectActive: boolean;
  // Pillar threat
  pillarUnderAttack: number[];
  // Survival time
  timeSurvived: number;
  // Ambient
  ambientParticleTimer: number;
  // Apex strike indicator
  apexStrikeActive: boolean;
  // Dash trails
  dashTrails: { pos: Vec3; timer: number; radius: number }[];
  // Parry state
  parryWindow: number;           // time remaining in parry window
  lastParrySuccess: number;      // timer for parry flash
  // Boss HP tracking
  bossId: string | null;
  // Victory
  victory: boolean;
  // Wave clear summary
  waveClearStats: { kills: number; damage: number; gears: number; time: number } | null;
  // Damage direction indicators
  damageIndicators: { angle: number; timer: number }[];
  // Enemy telegraphs (for charge/slam warnings)
  telegraphs: { pos: Vec3; radius: number; timer: number; color: number }[];
  // Clock hour event message
  hourEventMsg: string;
  hourEventTimer: number;
}

// ---- Factory ----

function generatePillars(): GearPillar[] {
  const pillars: GearPillar[] = [];
  const spread = PENDULUM.PILLAR_SPREAD;
  const positions = [
    { x: spread, y: 0, z: 0 },
    { x: -spread, y: 0, z: 0 },
    { x: 0, y: 0, z: spread },
    { x: 0, y: 0, z: -spread },
  ];
  for (const pos of positions) {
    pillars.push({
      pos,
      hp: PENDULUM.PILLAR_HP,
      maxHp: PENDULUM.PILLAR_HP,
      status: "active",
      repairProgress: 0,
      gearRotation: Math.random() * Math.PI * 2,
    });
  }
  return pillars;
}

function generateDebris(): ClockDebris[] {
  const debris: ClockDebris[] = [];
  const types: ClockDebris["type"][] = ["gear", "spring", "cog", "pipe"];
  const half = PENDULUM.GROUND_SIZE / 2;
  for (let i = 0; i < PENDULUM.DEBRIS_COUNT; i++) {
    const x = (Math.random() - 0.5) * (half * 1.8);
    const z = (Math.random() - 0.5) * (half * 1.8);
    const distCenter = Math.sqrt(x * x + z * z);
    if (distCenter < 10) continue;
    let tooClose = false;
    const spread = PENDULUM.PILLAR_SPREAD;
    const pillarPositions = [
      { x: spread, z: 0 }, { x: -spread, z: 0 },
      { x: 0, z: spread }, { x: 0, z: -spread },
    ];
    for (const pp of pillarPositions) {
      const dx = x - pp.x, dz = z - pp.z;
      if (Math.sqrt(dx * dx + dz * dz) < 6) { tooClose = true; break; }
    }
    if (tooClose) continue;
    debris.push({
      pos: { x, y: 0, z },
      height: 1 + Math.random() * 4,
      radius: 0.5 + Math.random() * 1.2,
      type: types[Math.floor(Math.random() * types.length)],
      rusted: Math.random() < 0.3,
      spinPhase: Math.random() * Math.PI * 2,
    });
  }
  return debris;
}

export function createPendulumState(sw: number, sh: number): PendulumState {
  return {
    phase: "menu",
    tick: 0,
    gameTime: 0,
    wave: 0,
    waveTimer: 0,
    phaseTimer: 0,
    waveModifier: "none",
    paused: false,
    hitStopTimer: 0,
    hitStopScale: 1,
    pendulumAngle: 0,
    pendulumPower: 1.0,
    player: {
      pos: { x: 0, y: 0, z: -12 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      hp: PENDULUM.MAX_HP,
      maxHp: PENDULUM.MAX_HP,
      stamina: PENDULUM.STAMINA_MAX,
      maxStamina: PENDULUM.STAMINA_MAX,
      action: "idle",
      onGround: true,
      chronoStrikeCD: 0,
      gearThrowCD: 0,
      timeSlowCD: 0,
      rewindCD: 0,
      timeStopCD: 0,
      dashCD: 0,
      timeSlowTimer: 0,
      timeSlowPos: null,
      timeStopTimer: 0,
      dashTimer: 0,
      dashDir: { x: 0, y: 0, z: 0 },
      invincibleTimer: 0,
      gearThrowCastTimer: 0,
      timeSlowCastTimer: 0,
      rewindCastTimer: 0,
      timeStopCastTimer: 0,
      combo: 0,
      comboTimer: 0,
      maxCombo: 0,
      strikeComboStep: 0,
      strikeComboTimer: 0,
      gears: 0,
      strikeLevel: 0,
      armorLevel: 0,
      speedLevel: 0,
      gearThrowLevel: 0,
      chronoLevel: 0,
      turretLevel: 0,
      pillarLevel: 0,
      killStreak: 0,
      killStreakTimer: 0,
      repairingPillarIdx: -1,
      blocking: false,
      blockTimer: 0,
    },
    enemies: new Map(),
    clockTower: {
      hp: PENDULUM.CLOCK_TOWER_HP,
      maxHp: PENDULUM.CLOCK_TOWER_HP,
      hourHand: 0,
      minuteHand: 0,
    },
    pillars: generatePillars(),
    turrets: [],
    debris: generateDebris(),
    timeSlowZones: [],
    particles: [],
    notifications: [],
    damageNumbers: [],
    gearFragments: [],
    repairKits: [],
    projectiles: [],
    spawnQueue: [],
    spawnTimer: 0,
    entropy: 0,
    enemiesKilled: 0,
    totalKills: 0,
    bestWave: 0,
    clockHour: 0,
    clockHourTimer: PENDULUM.HOUR_DURATION,
    screenW: sw,
    screenH: sh,
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    rightMouseDown: false,
    nextId: 1,
    pointerLocked: false,
    mouseDX: 0,
    mouseDY: 0,
    screenShake: 0,
    screenShakeIntensity: 0,
    difficulty: "normal",
    stats: { damageDealt: 0, damageTaken: 0, towerDamage: 0, pillarsLost: 0, gearsEarned: 0, abilitiesUsed: 0 },
    deathSequenceTimer: 0,
    screenFlash: { color: "transparent", intensity: 0, timer: 0 },
    waveTitle: { text: "", timer: 0, color: "#fff" },
    pendingSlam: null,
    pendingTimeSlowPos: null,
    pendingRewindPos: null,
    rustStormDotTimer: 0,
    aliveEnemyCount: 0,
    pendingBossRoar: false,
    pendingRepairPillarIdx: -1,
    timeStopActive: false,
    activeBuffs: [],
    buffChoices: [],
    buffSelectActive: false,
    pillarUnderAttack: [],
    timeSurvived: 0,
    ambientParticleTimer: 0,
    apexStrikeActive: false,
    dashTrails: [],
    parryWindow: 0,
    lastParrySuccess: 0,
    bossId: null,
    victory: false,
    waveClearStats: null,
    damageIndicators: [],
    telegraphs: [],
    hourEventMsg: "",
    hourEventTimer: 0,
  };
}

export function genPendulumId(state: PendulumState): string {
  return `pen_${state.nextId++}`;
}
