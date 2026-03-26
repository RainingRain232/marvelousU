// ---------------------------------------------------------------------------
// Depths of Avalon — game state
// ---------------------------------------------------------------------------

import { DEPTHS } from "../config/DepthsConfig";

export type DepthsPhase = "menu" | "diving" | "shop" | "game_over" | "victory";

export interface DepthsPlayer {
  x: number; y: number; z: number;
  yaw: number;   // horizontal rotation
  pitch: number; // vertical look
  vx: number; vy: number; vz: number;
  hp: number; maxHp: number;
  oxygen: number; maxOxygen: number;
  attackCooldown: number;
  invulnTimer: number;
  sprinting: boolean;
  lightRadius: number;
  damage: number;
  armor: number;
  // Dash
  dashCooldown: number;
  dashTimer: number;     // >0 means currently dashing
  dashDirX: number;
  dashDirY: number;
  dashDirZ: number;
  // Harpoon
  harpoonCooldown: number;
  // Charged attack
  chargeTimer: number; // >0 = charging, at CHARGE_TIME = fully charged
  charging: boolean;
}

export interface DepthsEnemy {
  id: number;
  type: string;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  hp: number; maxHp: number;
  dmg: number;
  speed: number;
  radius: number;
  aggroRange: number;
  color: number;
  glow: number;
  xp: number;
  alive: boolean;
  attackCooldown: number;
  wanderAngle: number;
  wanderTimer: number;
  hitFlash: number;
  isBoss: boolean;
  bossKey: string;
  telegraphTimer: number;
  isElite: boolean;
  eliteModifier: string;
}

export interface DepthsHarpoon {
  id: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  dmg: number;
  life: number;
  alive: boolean;
}

export interface DepthsAirBubble {
  id: number;
  x: number; y: number; z: number;
  baseY: number;
  alive: boolean;
  timer: number;
}

export interface DepthsTreasure {
  id: number;
  x: number; y: number; z: number;
  name: string;
  value: number;
  color: number;
  collected: boolean;
  bobPhase: number;
}

export interface DepthsParticle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; maxLife: number;
  size: number;
  color: number;
  type: "bubble" | "blood" | "sparkle" | "debris" | "dash_trail" | "harpoon_trail" | "siren_proj" | "whirlpool" | "relic_glow";
}

export interface DepthsWhirlpool {
  x: number; y: number; z: number;
  radius: number;
  rotSpeed: number;
  phase: number;
}

export interface DepthsSirenProjectile {
  id: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number;
  alive: boolean;
}

export interface DepthsRelic {
  id: number;
  key: string;
  x: number; y: number; z: number;
  collected: boolean;
  bobPhase: number;
}

export interface DepthsFishSchool {
  cx: number; cy: number; cz: number; // school center
  dirAngle: number;
  dirPitch: number;
  turnTimer: number;
  fish: { ox: number; oy: number; oz: number; phase: number }[]; // offsets from center
  fleeing: boolean;
}

export interface DepthsJellyfish {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  driftAngle: number;
  pulsePhase: number;
  shockCooldown: number;
}

export interface DepthsExcalibur {
  x: number; y: number; z: number;
  retrieved: boolean;
  glowPhase: number;
}

export interface DepthsDrop {
  id: number;
  x: number; y: number; z: number;
  type: "hp" | "o2";
  amount: number;
  life: number;
  bobPhase: number;
}

export interface DepthsScreenFlash {
  color: string;
  timer: number;
  maxTime: number;
}

export interface DepthsAchievementToast {
  name: string;
  desc: string;
  life: number;
}

export interface DepthsDamageNumber {
  x: number; y: number; z: number;
  value: number;
  life: number;
  color: number;
}

export interface DepthsNotification {
  text: string;
  life: number;
  color: string;
}

export interface DepthsUpgrades {
  lung_capacity: number;
  swim_speed: number;
  armor: number;
  sword: number;
  light_radius: number;
  pressure_resist: number;
  harpoon: number;
}

export interface DepthsWorldProp {
  x: number; y: number; z: number;
  type: "coral" | "kelp" | "rock" | "ruin";
  scaleX: number; scaleY: number; scaleZ: number;
  rotY: number;
  color: number;
  variant: number;
}

export interface DepthsBubbleStream {
  x: number; z: number;
  baseY: number;
  timer: number;
  rate: number;
}

export interface DepthsCombo {
  count: number;
  timer: number;
  bestStreak: number;
}

export interface DepthsDamageIndicator {
  angle: number; // screen-space angle from center
  life: number;
  intensity: number; // 0..1
}

export interface DepthsScreenShake {
  intensity: number;
  timer: number;
  offsetX: number;
  offsetY: number;
}

export interface DepthsState {
  phase: DepthsPhase;
  screenW: number;
  screenH: number;
  tick: number;
  gameTime: number;

  // Player
  player: DepthsPlayer;

  // Current depth (player.y but inverted for display)
  currentDepth: number;
  maxDepthReached: number;
  depthZoneIndex: number;

  // Enemies
  enemies: DepthsEnemy[];
  nextEnemyId: number;
  enemySpawnTimer: number;

  // Harpoons
  harpoons: DepthsHarpoon[];
  nextHarpoonId: number;

  // Bosses
  bossesDefeated: Set<string>;
  activeBossId: number | null;

  // Air bubbles
  airBubbles: DepthsAirBubble[];
  nextBubbleId: number;
  airBubbleSpawnTimer: number;

  // Treasures
  treasures: DepthsTreasure[];

  // Particles
  particles: DepthsParticle[];

  // Damage numbers
  damageNumbers: DepthsDamageNumber[];

  // Notifications
  notifications: DepthsNotification[];

  // World props (static scenery)
  worldProps: DepthsWorldProp[];

  // Bubble streams (ambient decoration)
  bubbleStreams: DepthsBubbleStream[];

  // Whirlpools
  whirlpools: DepthsWhirlpool[];

  // Siren projectiles
  sirenProjectiles: DepthsSirenProjectile[];
  nextSirenProjId: number;

  // Relics
  relics: DepthsRelic[];
  collectedRelics: Set<string>;

  // Depth checkpoints (after boss kills)
  depthCheckpoint: number;

  // FOV
  currentFov: number;
  targetFov: number;

  // Vignette
  vignetteIntensity: number;

  // Fish schools
  fishSchools: DepthsFishSchool[];

  // Jellyfish
  jellyfish: DepthsJellyfish[];

  // Excalibur
  excalibur: DepthsExcalibur;

  // Achievements
  unlockedAchievements: Set<string>;
  achievementToasts: DepthsAchievementToast[];

  // Drops
  drops: DepthsDrop[];
  nextDropId: number;

  // Screen flash
  screenFlash: DepthsScreenFlash;

  // Boss damage tracking (for flawless achievement)
  bossHpOnEngage: number;
  damageTakenDuringBoss: number;

  // Difficulty scaling
  depthMomentumMult: number; // current reward multiplier from depth

  // Wave events
  waveActive: boolean;
  waveTimer: number;
  waveDepthTriggered: Set<number>; // which depths have already triggered waves this dive
  waveBonusXp: number; // accumulated bonus XP during wave

  // Run tracking
  diveStartTime: number;
  bestRunGold: number;
  bestRunKills: number;
  bestRunDepth: number;
  lastRunSummary: {
    depth: number; kills: number; gold: number; time: number;
    relics: string[]; bossesKilled: string[];
  } | null;

  // New depth record
  isNewDepthRecord: boolean;

  // Combo
  combo: DepthsCombo;

  // Damage indicators (directional)
  damageIndicators: DepthsDamageIndicator[];

  // Screen shake
  screenShake: DepthsScreenShake;

  // Economy
  gold: number;
  totalGold: number;
  xp: number;
  level: number;
  xpToNext: number;

  // Upgrades
  upgrades: DepthsUpgrades;

  // Session stats
  diveCount: number;
  enemiesKilled: number;
  bossesSlain: number;
  treasuresFound: number;
  bestDepth: number;

  // Input
  keys: Set<string>;
  mouseDown: boolean;
  rightMouseDown: boolean;
  mouseDX: number;
  mouseDY: number;
  pointerLocked: boolean;

  // Pause
  paused: boolean;

  // Hit-stop
  hitStopTimer: number;
  hitStopScale: number;

  // Audio event flags (consumed by orchestrator each frame)
  audioHit: boolean;
  audioCritHit: boolean;
  audioCollect: boolean;
  audioDash: boolean;
  audioHarpoon: boolean;
  audioChargeRelease: boolean;
  audioBossSpawn: boolean;
  audioRelic: boolean;
  audioExcalibur: boolean;
  audioZoneTransition: boolean;

  // Death cause for game over screen
  deathCause: string;

  // Death animation
  deathAnimTimer: number; // >0 means death animation playing before game_over screen

  // Endless mode
  endlessMode: boolean;
  endlessWave: number;

  // Dive abilities (unlocked mid-dive at depth milestones)
  unlockedAbilities: Set<string>;

  // Curses (chosen before dive for bonus rewards)
  activeCurses: Set<string>;
  curseMult: number; // combined reward multiplier from curses

  // Elite enemy tracking
  eliteKills: number;

  // Relic synergies (active combos)
  activeSynergies: Set<string>;

  // Tutorial (first-dive only)
  tutorialShown: Set<string>;
  isFirstDive: boolean;

  // Tidal Shield (ability) state
  tidalShieldActive: boolean;

  // Blood Frenzy (ability) state
  bloodFrenzyTimer: number;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createDepthsState(sw: number, sh: number): DepthsState {
  const worldProps = _generateWorldProps();
  const treasures = _generateTreasures();
  const bubbleStreams = _generateBubbleStreams();
  const whirlpools = _generateWhirlpools();
  const relics = _generateRelics(worldProps);
  const jellyfish = _generateJellyfish();

  return {
    phase: "menu",
    screenW: sw,
    screenH: sh,
    tick: 0,
    gameTime: 0,

    player: {
      x: 0, y: -2, z: 0,
      yaw: 0, pitch: 0,
      vx: 0, vy: 0, vz: 0,
      hp: DEPTHS.PLAYER_MAX_HP,
      maxHp: DEPTHS.PLAYER_MAX_HP,
      oxygen: DEPTHS.OXYGEN_MAX,
      maxOxygen: DEPTHS.OXYGEN_MAX,
      attackCooldown: 0,
      invulnTimer: 0,
      sprinting: false,
      lightRadius: DEPTHS.PLAYER_LIGHT_RADIUS,
      damage: DEPTHS.PLAYER_ATTACK_DMG,
      armor: 0,
      dashCooldown: 0,
      dashTimer: 0,
      dashDirX: 0, dashDirY: 0, dashDirZ: 0,
      harpoonCooldown: 0,
      chargeTimer: 0,
      charging: false,
    },

    currentDepth: 2,
    maxDepthReached: 0,
    depthZoneIndex: 0,

    enemies: [],
    nextEnemyId: 1,
    enemySpawnTimer: 2.0,

    harpoons: [],
    nextHarpoonId: 1,

    bossesDefeated: new Set(),
    activeBossId: null,

    airBubbles: [],
    nextBubbleId: 1,
    airBubbleSpawnTimer: 3.0,

    treasures,

    particles: [],
    damageNumbers: [],
    notifications: [],
    worldProps,
    bubbleStreams,
    whirlpools,

    sirenProjectiles: [],
    nextSirenProjId: 1,

    relics,
    collectedRelics: new Set(),

    depthCheckpoint: 0,

    currentFov: DEPTHS.CAMERA_FOV,
    targetFov: DEPTHS.CAMERA_FOV,

    vignetteIntensity: 0,

    fishSchools: _generateFishSchools(),

    jellyfish,

    excalibur: {
      x: 0, y: -DEPTHS.EXCALIBUR_DEPTH, z: 0,
      retrieved: false, glowPhase: 0,
    },

    unlockedAchievements: new Set(),
    achievementToasts: [],

    drops: [],
    nextDropId: 1,

    screenFlash: { color: "", timer: 0, maxTime: 0 },

    bossHpOnEngage: 0,
    damageTakenDuringBoss: 0,

    depthMomentumMult: 1,

    waveActive: false,
    waveTimer: 0,
    waveDepthTriggered: new Set(),
    waveBonusXp: 0,

    diveStartTime: 0,
    bestRunGold: 0,
    bestRunKills: 0,
    bestRunDepth: 0,
    lastRunSummary: null,
    isNewDepthRecord: false,

    combo: { count: 0, timer: 0, bestStreak: 0 },
    damageIndicators: [],
    screenShake: { intensity: 0, timer: 0, offsetX: 0, offsetY: 0 },

    gold: 0,
    totalGold: 0,
    xp: 0,
    level: 1,
    xpToNext: 50,

    upgrades: {
      lung_capacity: 0,
      swim_speed: 0,
      armor: 0,
      sword: 0,
      light_radius: 0,
      pressure_resist: 0,
      harpoon: 0,
    },

    diveCount: 0,
    enemiesKilled: 0,
    bossesSlain: 0,
    treasuresFound: 0,
    bestDepth: 0,

    keys: new Set(),
    mouseDown: false,
    rightMouseDown: false,
    mouseDX: 0,
    mouseDY: 0,
    pointerLocked: false,

    paused: false,
    hitStopTimer: 0,
    hitStopScale: 0.05,

    audioHit: false,
    audioCritHit: false,
    audioCollect: false,
    audioDash: false,
    audioHarpoon: false,
    audioChargeRelease: false,
    audioBossSpawn: false,
    audioRelic: false,
    audioExcalibur: false,
    audioZoneTransition: false,
    deathCause: "",
    deathAnimTimer: 0,
    endlessMode: false,
    endlessWave: 0,

    unlockedAbilities: new Set(),
    activeCurses: new Set(),
    curseMult: 1,
    eliteKills: 0,
    activeSynergies: new Set(),
    tutorialShown: new Set(),
    isFirstDive: true,
    tidalShieldActive: false,
    bloodFrenzyTimer: 0,
  };
}

// ---------------------------------------------------------------------------
// World generation helpers
// ---------------------------------------------------------------------------

function _generateWorldProps(): DepthsWorldProp[] {
  const props: DepthsWorldProp[] = [];
  const R = DEPTHS.WORLD_RADIUS;

  const coralColors = [0xff4466, 0xff8844, 0xffcc22, 0x44ddaa, 0x8844ff, 0xff66aa];
  for (let i = 0; i < DEPTHS.CORAL_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * R;
    const depth = -(Math.random() * 100 + 5);
    props.push({
      x: Math.cos(angle) * dist, y: depth, z: Math.sin(angle) * dist,
      type: "coral",
      scaleX: 0.5 + Math.random() * 1.5, scaleY: 1.0 + Math.random() * 3.0, scaleZ: 0.5 + Math.random() * 1.5,
      rotY: Math.random() * Math.PI * 2,
      color: coralColors[Math.floor(Math.random() * coralColors.length)],
      variant: Math.floor(Math.random() * 3),
    });
  }

  for (let i = 0; i < DEPTHS.KELP_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * R;
    const depth = -(Math.random() * 120 + 5);
    props.push({
      x: Math.cos(angle) * dist, y: depth, z: Math.sin(angle) * dist,
      type: "kelp",
      scaleX: 0.3 + Math.random() * 0.4, scaleY: 3.0 + Math.random() * 8.0, scaleZ: 0.3 + Math.random() * 0.4,
      rotY: Math.random() * Math.PI * 2,
      color: 0x226633 + Math.floor(Math.random() * 0x113311),
      variant: Math.floor(Math.random() * 2),
    });
  }

  for (let i = 0; i < DEPTHS.ROCK_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * R;
    const depth = -(Math.random() * 160 + 2);
    props.push({
      x: Math.cos(angle) * dist, y: depth, z: Math.sin(angle) * dist,
      type: "rock",
      scaleX: 1.0 + Math.random() * 3.0, scaleY: 0.5 + Math.random() * 2.0, scaleZ: 1.0 + Math.random() * 3.0,
      rotY: Math.random() * Math.PI * 2,
      color: 0x556666 + Math.floor(Math.random() * 0x222222),
      variant: Math.floor(Math.random() * 3),
    });
  }

  for (let i = 0; i < DEPTHS.RUIN_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * (R - 10);
    const depth = -(30 + Math.random() * 130);
    props.push({
      x: Math.cos(angle) * dist, y: depth, z: Math.sin(angle) * dist,
      type: "ruin",
      scaleX: 2.0 + Math.random() * 4.0, scaleY: 3.0 + Math.random() * 6.0, scaleZ: 2.0 + Math.random() * 4.0,
      rotY: Math.random() * Math.PI * 2,
      color: 0x887766,
      variant: Math.floor(Math.random() * 4),
    });
  }

  return props;
}

function _generateTreasures(): DepthsTreasure[] {
  const treasures: DepthsTreasure[] = [];
  const R = DEPTHS.WORLD_RADIUS;

  for (let i = 0; i < DEPTHS.TREASURE_COUNT; i++) {
    const types = DEPTHS.TREASURE_TYPES;
    const t = types[Math.floor(Math.random() * types.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * (R - 5);
    const depth = -(t.minDepth + Math.random() * 40);

    treasures.push({
      id: i + 1,
      x: Math.cos(angle) * dist, y: depth, z: Math.sin(angle) * dist,
      name: t.name, value: t.value, color: t.color,
      collected: false,
      bobPhase: Math.random() * Math.PI * 2,
    });
  }
  return treasures;
}

function _generateFishSchools(): DepthsFishSchool[] {
  const schools: DepthsFishSchool[] = [];
  const R = DEPTHS.WORLD_RADIUS;
  for (let i = 0; i < DEPTHS.FISH_SCHOOL_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * (R - 10);
    const fish: DepthsFishSchool["fish"] = [];
    for (let j = 0; j < DEPTHS.FISH_PER_SCHOOL; j++) {
      fish.push({
        ox: (Math.random() - 0.5) * DEPTHS.FISH_SCHOOL_RADIUS,
        oy: (Math.random() - 0.5) * DEPTHS.FISH_SCHOOL_RADIUS * 0.5,
        oz: (Math.random() - 0.5) * DEPTHS.FISH_SCHOOL_RADIUS,
        phase: Math.random() * Math.PI * 2,
      });
    }
    schools.push({
      cx: Math.cos(angle) * dist,
      cy: -(5 + Math.random() * 120),
      cz: Math.sin(angle) * dist,
      dirAngle: Math.random() * Math.PI * 2,
      dirPitch: (Math.random() - 0.5) * 0.3,
      turnTimer: 2 + Math.random() * 4,
      fish,
      fleeing: false,
    });
  }
  return schools;
}

function _generateJellyfish(): DepthsJellyfish[] {
  const jf: DepthsJellyfish[] = [];
  const R = DEPTHS.WORLD_RADIUS;
  for (let i = 0; i < DEPTHS.JELLYFISH_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * (R - 10);
    jf.push({
      x: Math.cos(angle) * dist,
      y: -(5 + Math.random() * 150),
      z: Math.sin(angle) * dist,
      vx: 0, vy: 0, vz: 0,
      driftAngle: Math.random() * Math.PI * 2,
      pulsePhase: Math.random() * Math.PI * 2,
      shockCooldown: 0,
    });
  }
  return jf;
}

function _generateWhirlpools(): DepthsWhirlpool[] {
  const pools: DepthsWhirlpool[] = [];
  const R = DEPTHS.WORLD_RADIUS;
  for (let i = 0; i < DEPTHS.WHIRLPOOL_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 15 + Math.random() * (R - 20);
    pools.push({
      x: Math.cos(angle) * dist,
      y: -(20 + Math.random() * 130),
      z: Math.sin(angle) * dist,
      radius: DEPTHS.WHIRLPOOL_RADIUS * (0.7 + Math.random() * 0.6),
      rotSpeed: 1.5 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return pools;
}

function _generateRelics(worldProps: DepthsWorldProp[]): DepthsRelic[] {
  const relics: DepthsRelic[] = [];
  const relicKeys = Object.keys(DEPTHS.RELICS);
  const ruins = worldProps.filter(p => p.type === "ruin");
  let relicId = 1;

  for (const ruin of ruins) {
    if (Math.random() > DEPTHS.RELIC_SPAWN_CHANCE) continue;
    const key = relicKeys[Math.floor(Math.random() * relicKeys.length)];
    // Avoid duplicates
    if (relics.some(r => r.key === key)) continue;

    relics.push({
      id: relicId++,
      key,
      x: ruin.x + (Math.random() - 0.5) * 4,
      y: ruin.y + 1,
      z: ruin.z + (Math.random() - 0.5) * 4,
      collected: false,
      bobPhase: Math.random() * Math.PI * 2,
    });
  }
  return relics;
}

function _generateBubbleStreams(): DepthsBubbleStream[] {
  const streams: DepthsBubbleStream[] = [];
  const R = DEPTHS.WORLD_RADIUS;
  for (let i = 0; i < DEPTHS.BUBBLE_STREAM_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * R;
    streams.push({
      x: Math.cos(angle) * dist, z: Math.sin(angle) * dist,
      baseY: -(10 + Math.random() * 140),
      timer: 0,
      rate: 0.2 + Math.random() * 0.3,
    });
  }
  return streams;
}
