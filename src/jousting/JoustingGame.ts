// ---------------------------------------------------------------------------
// Jousting Tournament – Main Game (v3 – visual overhaul)
// Medieval jousting tournament with pattern-learning AI, timed aiming,
// stamina system, animated crowd, knight taunts, tournament bracket,
// localStorage high scores, unhorse ragdoll, rich arena scene with
// castle towers, heraldry, speed lines, lance splinters, torches, etc.
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle, type Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { joustingAudio } from "./JoustingAudio";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LANCE_ZONES = ["high", "mid", "low"] as const;
type Zone = (typeof LANCE_ZONES)[number];

/** Heraldry pattern for each knight's shield / tabard. */
type Heraldry = "cross" | "chevron" | "bend" | "saltire" | "pale" | "fess" | "quarters" | "crown";

/** Knight special ability type. */
type Ability = "none" | "steady" | "rage" | "feinter" | "pure" | "morning" | "perfect" | "pendragon";

interface Knight {
  name: string;
  color: number;
  color2: number; // secondary heraldry color
  horseColor: number;
  skill: number;
  title: string;
  taunt: string;
  defeated: string;
  heraldry: Heraldry;
  ability: Ability;
  abilityName: string;
  abilityDesc: string;
}

const TOURNAMENT_KNIGHTS: Knight[] = [
  {
    name: "Sir Cedric", color: 0x4488cc, color2: 0xaaccee, horseColor: 0x885533, skill: 0.15,
    title: "the Novice", heraldry: "cross", ability: "none", abilityName: "", abilityDesc: "",
    taunt: "I just polished my armor... please don't dent it.",
    defeated: "Well fought! I'll stick to poetry.",
  },
  {
    name: "Sir Bors", color: 0x44aa44, color2: 0xcceecc, horseColor: 0x664422, skill: 0.25,
    title: "the Steady", heraldry: "fess", ability: "steady", abilityName: "Steady Hand", abilityDesc: "Reduced lance sway",
    taunt: "Steady hands, steady lance. You won't rattle me.",
    defeated: "Steady wasn't enough today...",
  },
  {
    name: "Sir Gareth", color: 0xcc8844, color2: 0xffddaa, horseColor: 0x553311, skill: 0.38,
    title: "of Orkney", heraldry: "bend", ability: "rage", abilityName: "Orkney Rage", abilityDesc: "+unhorse chance (both sides)",
    taunt: "Orkney breeds warriors, not farmers. Prepare yourself!",
    defeated: "You'd do well in the Orkney lists!",
  },
  {
    name: "Sir Tristan", color: 0xaa44aa, color2: 0xddaadd, horseColor: 0x775544, skill: 0.48,
    title: "the Bold", heraldry: "chevron", ability: "feinter", abilityName: "Bold Feint", abilityDesc: "Feints lance mid-charge",
    taunt: "They call me Bold because I never flinch. Do you?",
    defeated: "Bold... but not bold enough. Well done.",
  },
  {
    name: "Sir Percival", color: 0xcc4444, color2: 0xffaaaa, horseColor: 0x443322, skill: 0.58,
    title: "the Pure", heraldry: "saltire", ability: "pure", abilityName: "Pure Heart", abilityDesc: "Immune to glancing blows",
    taunt: "Purity of heart guides my lance. Can you match it?",
    defeated: "Your heart burns brighter than mine today.",
  },
  {
    name: "Sir Gawain", color: 0xddaa22, color2: 0xffeebb, horseColor: 0x332211, skill: 0.7,
    title: "the Courteous", heraldry: "pale", ability: "morning", abilityName: "Sun's Strength", abilityDesc: "First tilt is always powerful",
    taunt: "I'll unseat you courteously, of course.",
    defeated: "A courteous defeat. You are truly skilled.",
  },
  {
    name: "Sir Lancelot", color: 0xeeeeff, color2: 0x4466aa, horseColor: 0x222222, skill: 0.82,
    title: "du Lac", heraldry: "quarters", ability: "perfect", abilityName: "Perfect Form", abilityDesc: "Always gets perfect timing",
    taunt: "None have bested me. You will be no exception.",
    defeated: "Impossible... the Lake itself weeps.",
  },
  {
    name: "King Arthur", color: 0xffd700, color2: 0xcc2222, horseColor: 0xffffff, skill: 0.93,
    title: "Pendragon", heraldry: "crown", ability: "pendragon", abilityName: "Pendragon's Will", abilityDesc: "All abilities combined",
    taunt: "Excalibur stays sheathed. My lance will suffice.",
    defeated: "The realm has found a true champion!",
  },
];

// Player heraldry
const PLAYER_COLOR = 0x3366bb;
const PLAYER_COLOR2 = 0xaabbdd;
const PLAYER_HORSE = 0x885533;
const PLAYER_HERALDRY: Heraldry = "cross";

const BASE_CHARGE_DURATION = 2.8;
const CHARGE_SPEEDUP_PER_ROUND = 0.12;
const MIN_CHARGE_DURATION = 1.4;
const TILT_COUNT = 3;
const AIM_TIME = 6.0;
const IMPACT_FREEZE = 0.8;
const RESULT_DISPLAY = 2.5;

const SCORE_UNHORSE = 3;
const SCORE_HIT = 1;
const SCORE_GLANCE = 0;
const SCORE_BLOCK = 0;

const MAX_STAMINA = 100;
const STAMINA_HIT_COST = 15;
const STAMINA_UNHORSE_COST = 40;
const STAMINA_REGEN_PER_TILT = 8;
const LANCE_SWAY_BASE = 0;
const LANCE_SWAY_PER_MISSING_STAMINA = 0.08;

const HS_KEY = "jousting_best_v1";

// ---------------------------------------------------------------------------
// Difficulty
// ---------------------------------------------------------------------------

type Difficulty = "squire" | "knight" | "champion";

interface DifficultySettings {
  label: string;
  desc: string;
  aiSkillMult: number; // multiplier on AI skill
  goldMult: number; // multiplier on gold rewards
  perfectZone: number; // wider = easier
  goodZone: number;
  meterSpeed: number; // slower = easier
  startGold: number;
}

const DIFFICULTY_MAP: Record<Difficulty, DifficultySettings> = {
  squire: { label: "SQUIRE", desc: "Forgiving timing, +gold, AI less sharp", aiSkillMult: 0.7, goldMult: 1.5, perfectZone: 0.18, goodZone: 0.35, meterSpeed: 1.8, startGold: 30 },
  knight: { label: "KNIGHT", desc: "Balanced challenge for seasoned jousters", aiSkillMult: 1.0, goldMult: 1.0, perfectZone: 0.12, goodZone: 0.28, meterSpeed: 2.5, startGold: 0 },
  champion: { label: "CHAMPION", desc: "Brutal AI, tight timing, less gold", aiSkillMult: 1.3, goldMult: 0.7, perfectZone: 0.08, goodZone: 0.20, meterSpeed: 3.2, startGold: 0 },
};

// ---------------------------------------------------------------------------
// Player abilities
// ---------------------------------------------------------------------------

type PlayerAbility = "none" | "ironWill" | "swiftStrike" | "shieldMaster" | "crowdChampion";

interface PlayerAbilityDef {
  name: string;
  desc: string;
  color: number;
}

const PLAYER_ABILITIES: Record<PlayerAbility, PlayerAbilityDef> = {
  none: { name: "None", desc: "", color: 0x888888 },
  ironWill: { name: "Iron Will", desc: "Stamina costs halved, +5 regen per tilt", color: 0x44aaff },
  swiftStrike: { name: "Swift Strike", desc: "Perfect timing zone 50% wider", color: 0xff8844 },
  shieldMaster: { name: "Shield Master", desc: "30% chance to block adjacent zones (free)", color: 0x44ff88 },
  crowdChampion: { name: "Crowd Champion", desc: "Crowd favor fills 2x faster, bonus gold", color: 0xffdd44 },
};

const SELECTABLE_ABILITIES: PlayerAbility[] = ["ironWill", "swiftStrike", "shieldMaster", "crowdChampion"];

// ---------------------------------------------------------------------------
// Random events between matches
// ---------------------------------------------------------------------------

interface RandomEvent {
  name: string;
  desc: string;
  apply: (s: JoustState) => void;
  color: number;
}

const RANDOM_EVENTS: RandomEvent[] = [
  { name: "Lady of the Lake", desc: "A mysterious blessing restores your stamina!", color: 0x44aaff,
    apply: (s) => { s.playerStamina = MAX_STAMINA; } },
  { name: "Blacksmith's Gift", desc: "A wandering smith sharpens your lance! (+1 lance level)", color: 0xff8844,
    apply: (s) => { if (s.lanceLevel < 2) s.lanceLevel++; } },
  { name: "Squire's Blunder", desc: "Your squire drops your shield... -10 stamina", color: 0xcc4444,
    apply: (s) => { s.playerStamina = Math.max(20, s.playerStamina - 10); } },
  { name: "Royal Purse", desc: "The King tosses you a purse of gold! +40g", color: 0xffd700,
    apply: (s) => { s.gold += 40; } },
  { name: "Crowd Chants", desc: "The crowd sings your name! Crowd favor filled!", color: 0xffdd44,
    apply: (s) => { s.crowdFavor = 1.0; } },
  { name: "Horse Whisperer", desc: "A druid calms your steed. Horse charges smoother.", color: 0x44ff88,
    apply: (s) => { if (s.horseLevel < 2) s.horseLevel++; } },
  { name: "Rival's Taunt", desc: "Your next opponent mocks you. Fight with fury! +20g if you win.", color: 0xcc44cc,
    apply: (s) => { s.gold += 20; } },
  { name: "Fine Weather", desc: "Clear skies and a fair breeze. Stamina regen boosted!", color: 0x88ccff,
    apply: (s) => { s.playerStamina = Math.min(MAX_STAMINA, s.playerStamina + 15); } },
];

// ---------------------------------------------------------------------------
// Crowd Favor
// ---------------------------------------------------------------------------

const CROWD_FAVOR_MAX = 1.0;
const CROWD_FAVOR_PERFECT = 0.25; // gain on perfect timing
const CROWD_FAVOR_UNHORSE = 0.5; // gain on unhorse
const CROWD_FAVOR_HIT = 0.1; // gain on regular hit
const CROWD_FAVOR_DECAY = 0.05; // lose per tilt

// ---------------------------------------------------------------------------
// Challenge modes
// ---------------------------------------------------------------------------

type ChallengeMode = "normal" | "ironGauntlet" | "flawless" | "handicap";

interface ChallengeDef {
  name: string;
  desc: string;
  color: number;
}

const CHALLENGE_DEFS: Record<ChallengeMode, ChallengeDef> = {
  normal: { name: "Tournament", desc: "Standard 8-knight tournament", color: 0xffd700 },
  ironGauntlet: { name: "Iron Gauntlet", desc: "No shop between matches — pure skill", color: 0xcc4444 },
  flawless: { name: "Flawless", desc: "Win without taking a single hit", color: 0x44ffaa },
  handicap: { name: "Handicap", desc: "Start with no gold, AI gets +20% skill", color: 0xaa44ff },
};

// ---------------------------------------------------------------------------
// Mastery tracking (localStorage)
// ---------------------------------------------------------------------------

const MASTERY_KEY = "jousting_mastery_v1";

interface KnightMastery {
  wins: number;
  unhorses: number;
  perfectWins: number; // wins where all tilts were perfect timing
}

interface MasteryData {
  knights: Record<string, KnightMastery>;
  totalRuns: number;
  totalWins: number; // full tournament clears
  challengeClears: Record<ChallengeMode, boolean>;
}

function _readMastery(): MasteryData {
  try {
    const raw = localStorage.getItem(MASTERY_KEY);
    if (raw) return JSON.parse(raw) as MasteryData;
  } catch { /* noop */ }
  return { knights: {}, totalRuns: 0, totalWins: 0, challengeClears: { normal: false, ironGauntlet: false, flawless: false, handicap: false } };
}

function _writeMastery(data: MasteryData): void {
  try { localStorage.setItem(MASTERY_KEY, JSON.stringify(data)); } catch { /* noop */ }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

enum Phase {
  MAIN_MENU,
  ABILITY_SELECT,
  STATS,
  BESTIARY,
  CONTROLS,
  PRE_MATCH,
  CHARGING,
  AIMING,
  IMPACT,
  TILT_RESULT,
  MATCH_RESULT,
  EVENT,
  SHOP,
  PAUSE,
  TOURNAMENT_END,
}

type PowerRating = "perfect" | "good" | "weak" | "none";

// Gold rewards
const GOLD_WIN = 30;
const GOLD_UNHORSE_BONUS = 20;
const GOLD_PERFECT_BONUS = 10;
const GOLD_STREAK_BONUS = 5; // per streak tilt

// Upgrade costs
const LANCE_UPGRADE_COST = [40, 80];
const SHIELD_UPGRADE_COST = [40, 80];
const HORSE_UPGRADE_COST = [50, 100];
const POTION_COST = 25;

// Feint
const FEINT_STAMINA_COST = 15;
const FEINT_WINDOW = 0.4; // last 40% of charge

// ---------------------------------------------------------------------------
// Arena themes
// ---------------------------------------------------------------------------

type ArenaTheme = "meadow" | "courtyard" | "snow" | "night";

interface ArenaColors {
  sky: number[];
  ground: number;
  track: number;
  standColor: number;
  treeGreen: number;
  name: string;
}

const ARENA_THEMES: Record<ArenaTheme, ArenaColors> = {
  meadow: { sky: [0x0c1220, 0x12203a, 0x1a3050, 0x244060, 0x305570, 0x406880], ground: 0x2a4a1a, track: 0x7a5c3a, standColor: 0x3a2211, treeGreen: 0x1a3318, name: "The Meadow" },
  courtyard: { sky: [0x141820, 0x1a2430, 0x223040, 0x2a3a50, 0x344860, 0x3e5570], ground: 0x2a3a2a, track: 0x6a5a4a, standColor: 0x3a2a1a, treeGreen: 0x1a2a18, name: "Castle Courtyard" },
  snow: { sky: [0x1a2030, 0x2a3040, 0x3a4555, 0x4a5a6a, 0x5a6a7a, 0x6a7a8a], ground: 0x4a5a6a, track: 0x5a5045, standColor: 0x3a3030, treeGreen: 0x1a3028, name: "Winter Lists" },
  night: { sky: [0x050810, 0x080c18, 0x0a1020, 0x0c1428, 0x0e1830, 0x101c38], ground: 0x1a2a12, track: 0x5a4830, standColor: 0x2a1808, treeGreen: 0x0a1a08, name: "Torchlit Arena" },
};

const ALL_ARENAS: ArenaTheme[] = ["meadow", "courtyard", "snow", "night"];

// ---------------------------------------------------------------------------
// AI combat personality
// ---------------------------------------------------------------------------

interface AIPersonality {
  preferredLance: Zone | null; // zone they favor (null = balanced)
  preferredShield: Zone | null;
  aggressiveness: number; // 0-1, how often they go for high-risk zones
  feintLikelihood: number; // multiplier on base feint chance
  firstTiltBehavior: "aggressive" | "defensive" | "balanced";
}

const KNIGHT_PERSONALITIES: AIPersonality[] = [
  { preferredLance: null, preferredShield: "mid", aggressiveness: 0.2, feintLikelihood: 0, firstTiltBehavior: "balanced" }, // Cedric: timid, defaults mid
  { preferredLance: "mid", preferredShield: "mid", aggressiveness: 0.3, feintLikelihood: 0, firstTiltBehavior: "defensive" }, // Bors: always steady mid
  { preferredLance: "high", preferredShield: "low", aggressiveness: 0.7, feintLikelihood: 0.5, firstTiltBehavior: "aggressive" }, // Gareth: aggressive, aims high
  { preferredLance: null, preferredShield: null, aggressiveness: 0.5, feintLikelihood: 2.0, firstTiltBehavior: "balanced" }, // Tristan: feints constantly
  { preferredLance: "low", preferredShield: "high", aggressiveness: 0.4, feintLikelihood: 0.5, firstTiltBehavior: "defensive" }, // Percival: defensive, aims low
  { preferredLance: "high", preferredShield: "high", aggressiveness: 0.8, feintLikelihood: 1.0, firstTiltBehavior: "aggressive" }, // Gawain: opens aggressive, aims high
  { preferredLance: null, preferredShield: null, aggressiveness: 0.6, feintLikelihood: 1.5, firstTiltBehavior: "balanced" }, // Lancelot: perfect adaptability
  { preferredLance: null, preferredShield: null, aggressiveness: 0.9, feintLikelihood: 2.0, firstTiltBehavior: "aggressive" }, // Arthur: relentless
];

// Power meter defaults now in DIFFICULTY_MAP (perfectZone, goodZone, meterSpeed)

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

type Weather = "sunny" | "rain" | "wind" | "fog";

interface WeatherDef {
  name: string;
  swayMult: number; // lance sway multiplier (1 = normal)
  unhorseMod: number; // added to unhorse chance
  zoneRevealProgress: number; // when opponent zones are revealed (lower = later)
  color: number;
  desc: string;
}

const WEATHER_DEFS: Record<Weather, WeatherDef> = {
  sunny: { name: "Clear Skies", swayMult: 1.0, unhorseMod: 0, zoneRevealProgress: 0.65, color: 0xffee88, desc: "Fair weather — no modifiers" },
  rain: { name: "Heavy Rain", swayMult: 1.4, unhorseMod: 0.1, zoneRevealProgress: 0.65, color: 0x6688aa, desc: "Slippery saddles (+sway, +unhorse)" },
  wind: { name: "Strong Wind", swayMult: 1.2, unhorseMod: 0, zoneRevealProgress: 0.65, color: 0x88aacc, desc: "Lance drifts in gusts (+sway)" },
  fog: { name: "Dense Fog", swayMult: 1.0, unhorseMod: 0, zoneRevealProgress: 0.85, color: 0x778899, desc: "Opponent zones hidden longer" },
};

const ALL_WEATHER: Weather[] = ["sunny", "rain", "wind", "fog"];

// ---------------------------------------------------------------------------
// Cosmetics (unlockable via mastery milestones)
// ---------------------------------------------------------------------------

interface CosmeticUnlock {
  id: string;
  name: string;
  desc: string;
  check: (m: MasteryData) => boolean;
  color: number; // applied to player knight
}

const COSMETIC_UNLOCKS: CosmeticUnlock[] = [
  { id: "gold_lance", name: "Golden Lance", desc: "Win 5 matches total", color: 0xffd700, check: (m) => { let w = 0; for (const k of Object.values(m.knights)) w += k.wins; return w >= 5; } },
  { id: "crimson_armor", name: "Crimson Armor", desc: "Unhorse 10 opponents total", color: 0xcc2222, check: (m) => { let u = 0; for (const k of Object.values(m.knights)) u += k.unhorses; return u >= 10; } },
  { id: "royal_purple", name: "Royal Purple", desc: "Clear all 4 challenge modes", color: 0x8844cc, check: (m) => m.challengeClears.normal && m.challengeClears.ironGauntlet && m.challengeClears.flawless && m.challengeClears.handicap },
  { id: "white_steed", name: "White Steed", desc: "Complete a full tournament clear", color: 0xeeeeff, check: (m) => m.totalWins >= 1 },
  { id: "emerald_shield", name: "Emerald Shield", desc: "Win 3 perfect matches (all perfect timing)", color: 0x22cc66, check: (m) => { let p = 0; for (const k of Object.values(m.knights)) p += k.perfectWins; return p >= 3; } },
];

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: number; size: number;
  type: "spark" | "dust" | "splinter" | "confetti";
  rotation?: number; rotSpeed?: number;
}

interface FloatingText {
  text: string; x: number; y: number; vy: number;
  life: number; maxLife: number; color: number; fontSize: number;
}

interface JoustState {
  phase: Phase;
  timer: number;
  roundIndex: number;
  tiltIndex: number;
  playerScore: number;
  opponentScore: number;
  playerWins: number;
  playerLance: Zone;
  playerShield: Zone;
  aiLance: Zone;
  aiShield: Zone;
  chargeProgress: number;
  lastPlayerResult: string;
  lastAIResult: string;
  lastPlayerPoints: number;
  lastAIPoints: number;
  playerUnhorsed: boolean;
  aiUnhorsed: boolean;
  playerStamina: number;
  aiStamina: number;
  aimTimer: number;
  playerLanceHistory: Zone[];
  playerShieldHistory: Zone[];
  aiLanceHistory: Zone[];
  aiShieldHistory: Zone[];
  particles: Particle[];
  crowdExcitement: number;
  crowdWavePhase: number;
  shakeTimer: number;
  shakeMag: number;
  unhorseAnimTimer: number;
  unhorsePlayerFallAngle: number;
  unhorseAIFallAngle: number;
  floatingTexts: FloatingText[];
  bestRound: number;
  impactFlash: number;
  // Power meter (timing strike)
  powerMeterPos: number; // 0-1 oscillating
  powerMeterLocked: boolean;
  powerRating: PowerRating;
  // Gold & upgrades
  gold: number;
  lanceLevel: number; // 0-2
  shieldLevel: number; // 0-2
  horseLevel: number; // 0-2
  // Feint
  playerFeinted: boolean;
  aiFeinted: boolean;
  // Streak
  tiltStreak: number;
  // Shop cursor
  shopCursor: number;
  // Difficulty
  difficulty: Difficulty;
  // Player ability
  playerAbility: PlayerAbility;
  abilityCursor: number;
  // Crowd favor
  crowdFavor: number; // 0-1
  crowdFavorUsed: boolean; // consumed this tilt?
  // Random event
  currentEvent: RandomEvent | null;
  // Stats
  totalPerfects: number;
  totalUnhorses: number;
  totalGoldEarned: number;
  totalTiltsWon: number;
  bestStreakEver: number;
  // Menu cursor for difficulty
  difficultyCursor: number;
  // Slow-motion
  slowMo: number;
  slowMoTimer: number;
  phaseFlash: number; // 0-1, brief white flash on phase transitions
  // Challenge mode
  challengeMode: ChallengeMode;
  challengeCursor: number;
  hitsTaken: number; // for flawless tracking
  // Mastery
  mastery: MasteryData;
  allPerfectThisMatch: boolean; // track if all tilts had perfect timing
  // Tutorial hints
  showHint: boolean;
  hintText: string;
  hintTimer: number;
  isFirstRun: boolean;
  // Menu navigation
  pausedFrom: Phase;
  bestiaryCursor: number;
  statsPage: number;
  // Charge tension — power windows
  powerWindowActive: boolean;
  powerWindowTimer: number;
  powerWindowHit: boolean; // did player hit the window this charge?
  // Opponent zone reveal during charge
  showOpponentZones: boolean;
  // Feint dodge result
  feintDodged: boolean;
  // Tilt result weight — brief stun/recovery
  tiltRecoveryTimer: number;
  lastTiltWinner: "player" | "ai" | "draw";
  // Impact recoil
  impactRecoilPlayer: number; // 0-1, how far player knight recoils backward
  impactRecoilAI: number; // 0-1, how far AI knight recoils backward
  impactZoom: number; // 0-1, brief zoom-in toward impact point
  impactSeverity: number;
  // Weather
  weather: Weather;
  // AI tell (lance drift animation during aiming)
  aiTellDrift: number; // -1 to 1, how much AI lance visually drifts toward their zone
  // Cosmetics
  unlockedCosmetics: string[];
  activeCosmetic: string; // id of active cosmetic (affects player color)
  // Random bracket
  randomBracket: boolean;
  knightOrder: number[];
  // Arena theme
  arenaTheme: ArenaTheme;
  // Charge stages (progressive tension)
  chargeStage: number; // 0-3, updated during charge based on progress
  // Replay
  replayActive: boolean;
  replayTimer: number;
}

function _readBest(): number {
  try { const v = localStorage.getItem(HS_KEY); return v ? parseInt(v, 10) || 0 : 0; } catch { return 0; }
}
function _writeBest(round: number): void {
  try { localStorage.setItem(HS_KEY, String(round)); } catch { /* noop */ }
}

function createState(): JoustState {
  return {
    phase: Phase.MAIN_MENU, timer: 0,
    roundIndex: 0, tiltIndex: 0, playerScore: 0, opponentScore: 0, playerWins: 0,
    playerLance: "mid", playerShield: "mid", aiLance: "mid", aiShield: "mid",
    chargeProgress: 0, lastPlayerResult: "", lastAIResult: "",
    lastPlayerPoints: 0, lastAIPoints: 0,
    playerUnhorsed: false, aiUnhorsed: false,
    playerStamina: MAX_STAMINA, aiStamina: MAX_STAMINA,
    aimTimer: AIM_TIME, playerLanceHistory: [], playerShieldHistory: [], aiLanceHistory: [], aiShieldHistory: [],
    particles: [], crowdExcitement: 0, crowdWavePhase: 0,
    shakeTimer: 0, shakeMag: 0,
    unhorseAnimTimer: 0, unhorsePlayerFallAngle: 0, unhorseAIFallAngle: 0,
    floatingTexts: [], bestRound: _readBest(), impactFlash: 0,
    powerMeterPos: 0, powerMeterLocked: false, powerRating: "none",
    gold: 0, lanceLevel: 0, shieldLevel: 0, horseLevel: 0,
    playerFeinted: false, aiFeinted: false, tiltStreak: 0, shopCursor: 0,
    difficulty: "knight", playerAbility: "none", abilityCursor: 0,
    crowdFavor: 0, crowdFavorUsed: false, currentEvent: null,
    totalPerfects: 0, totalUnhorses: 0, totalGoldEarned: 0, totalTiltsWon: 0, bestStreakEver: 0,
    difficultyCursor: 1,
    slowMo: 1, slowMoTimer: 0, phaseFlash: 0,
    challengeMode: "normal", challengeCursor: 0,
    hitsTaken: 0,
    mastery: _readMastery(),
    allPerfectThisMatch: true,
    showHint: false, hintText: "", hintTimer: 0,
    isFirstRun: _readBest() === 0,
    pausedFrom: Phase.MAIN_MENU, bestiaryCursor: 0, statsPage: 0,
    powerWindowActive: false, powerWindowTimer: 0, powerWindowHit: false,
    showOpponentZones: false, feintDodged: false,
    tiltRecoveryTimer: 0, lastTiltWinner: "draw",
    impactRecoilPlayer: 0, impactRecoilAI: 0, impactZoom: 0, impactSeverity: 0,
    weather: "sunny", aiTellDrift: 0,
    unlockedCosmetics: [], activeCosmetic: "",
    randomBracket: false, knightOrder: [0, 1, 2, 3, 4, 5, 6, 7],
    arenaTheme: "meadow", chargeStage: 0,
    replayActive: false, replayTimer: 0,
  };
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const S_TITLE = new TextStyle({ fontFamily: "monospace", fontSize: 36, fill: 0xffd700, fontWeight: "bold", letterSpacing: 6, dropShadow: { color: 0x000000, blur: 4, distance: 2, angle: Math.PI / 4 } });
const S_SUBTITLE = new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: 0xccbb88, letterSpacing: 2 });
const S_BODY = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xdddddd });
const S_BODY_ITALIC = new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xbbaa88, fontStyle: "italic" });
const S_KNIGHT = new TextStyle({ fontFamily: "monospace", fontSize: 20, fill: 0xffffff, fontWeight: "bold", dropShadow: { color: 0x000000, blur: 3, distance: 1, angle: Math.PI / 4 } });
const S_RESULT = new TextStyle({ fontFamily: "monospace", fontSize: 24, fill: 0xffd700, fontWeight: "bold" });
const S_SCORE = new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: 0xffffff });
const S_BTN = new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: 0xffffff, fontWeight: "bold" });
const S_HIT = new TextStyle({ fontFamily: "monospace", fontSize: 28, fill: 0xff4444, fontWeight: "bold", dropShadow: { color: 0x000000, blur: 4, distance: 2, angle: Math.PI / 4 } });
const S_BLOCK = new TextStyle({ fontFamily: "monospace", fontSize: 28, fill: 0x4488ff, fontWeight: "bold", dropShadow: { color: 0x000000, blur: 4, distance: 2, angle: Math.PI / 4 } });
const S_GLANCE = new TextStyle({ fontFamily: "monospace", fontSize: 24, fill: 0xaaaa44, fontWeight: "bold" });
const S_UNHORSE = new TextStyle({ fontFamily: "monospace", fontSize: 34, fill: 0xff2200, fontWeight: "bold", dropShadow: { color: 0x000000, blur: 6, distance: 3, angle: Math.PI / 4 } });
const S_CROWN = new TextStyle({ fontFamily: "monospace", fontSize: 48, fill: 0xffd700, fontWeight: "bold", dropShadow: { color: 0x000000, blur: 6, distance: 3, angle: Math.PI / 4 } });
const S_AIM_LABEL = new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xffcc44, fontWeight: "bold" });
const S_AIM_ACTIVE = new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xffffff, fontWeight: "bold" });
const S_AIM_INACTIVE = new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0x556677 });
const S_TIMER_WARN = new TextStyle({ fontFamily: "monospace", fontSize: 22, fill: 0xff4444, fontWeight: "bold" });
const S_TIMER_OK = new TextStyle({ fontFamily: "monospace", fontSize: 22, fill: 0x44cc44, fontWeight: "bold" });
const S_STAMINA = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x44ddaa });
const S_BRACKET_WON = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x44ff44, fontWeight: "bold" });
const S_BRACKET_CURRENT = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xffd700, fontWeight: "bold" });
const S_BRACKET_LOCKED = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x334455 });
const S_PERFECT = new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0x44ffaa, fontWeight: "bold", dropShadow: { color: 0x000000, blur: 3, distance: 1, angle: Math.PI / 4 } });
const S_GOOD = new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: 0xcccc44, fontWeight: "bold" });
const S_WEAK = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0x886644 });
const S_GOLD = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xffd700, fontWeight: "bold" });
const S_SHOP_ITEM = new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xdddddd });
const S_SHOP_ACTIVE = new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xffffff, fontWeight: "bold" });
const S_SHOP_MAXED = new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0x556677 });
const S_ABILITY = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xff8844, fontStyle: "italic" });
const S_FEINT = new TextStyle({ fontFamily: "monospace", fontSize: 20, fill: 0xff8844, fontWeight: "bold", dropShadow: { color: 0x000000, blur: 3, distance: 1, angle: Math.PI / 4 } });
const S_STREAK = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xff8800, fontWeight: "bold" });
const S_FAVOR = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xffdd44, fontWeight: "bold" });
const S_EVENT_TITLE = new TextStyle({ fontFamily: "monospace", fontSize: 22, fill: 0xffd700, fontWeight: "bold", dropShadow: { color: 0x000000, blur: 4, distance: 2, angle: Math.PI / 4 } });
const S_DIFF_ACTIVE = new TextStyle({ fontFamily: "monospace", fontSize: 15, fill: 0xffffff, fontWeight: "bold" });
const S_DIFF_INACTIVE = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0x556677 });
const S_STAT_LABEL = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x8899aa });
const S_STAT_VALUE = new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xffd700, fontWeight: "bold" });

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const _keys: Record<string, boolean> = {};
const _justPressedMap: Record<string, boolean> = {};
function _onKeyDown(e: KeyboardEvent): void {
  if (!_keys[e.code]) _justPressedMap[e.code] = true;
  _keys[e.code] = true;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
}
function _onKeyUp(e: KeyboardEvent): void { _keys[e.code] = false; }
function justPressed(code: string): boolean { return !!_justPressedMap[code]; }
function clearJustPressed(): void { for (const k of Object.keys(_justPressedMap)) _justPressedMap[k] = false; }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chargeDuration(round: number): number {
  return Math.max(MIN_CHARGE_DURATION, BASE_CHARGE_DURATION - round * CHARGE_SPEEDUP_PER_ROUND);
}
function lanceSway(stamina: number, t: number, steadyBonus = false, weatherSway = 1.0): number {
  const missing = MAX_STAMINA - stamina;
  let a = LANCE_SWAY_BASE + missing * LANCE_SWAY_PER_MISSING_STAMINA;
  if (steadyBonus) a *= 0.3;
  a *= weatherSway;
  return Math.sin(t * 4.5) * a + Math.sin(t * 7.3) * a * 0.5;
}
function zoneIndex(z: Zone): number { return LANCE_ZONES.indexOf(z); }
function zoneDist(a: Zone, b: Zone): number { return Math.abs(zoneIndex(a) - zoneIndex(b)); }

/** Variable tilt count per round — later rounds are longer/harder. */
function tiltsForRound(round: number): number {
  if (round >= 7) return 5; // Final 2 knights: best of 5
  if (round >= 4) return 5; // Mid-tier: best of 5
  return TILT_COUNT; // Early: best of 3
}

/** Get player's display color (base or cosmetic override). */
function getPlayerColor(s: JoustState): number {
  if (s.activeCosmetic) {
    const cos = COSMETIC_UNLOCKS.find(c => c.id === s.activeCosmetic);
    if (cos) return cos.color;
  }
  return PLAYER_COLOR;
}

/** Get current opponent knight (supports random bracket order). */
function getOpponent(s: JoustState): Knight {
  const idx = s.knightOrder[s.roundIndex] ?? s.roundIndex;
  return TOURNAMENT_KNIGHTS[idx] ?? TOURNAMENT_KNIGHTS[0];
}

/** Get AI personality for current opponent. */
function getPersonality(s: JoustState): AIPersonality {
  const idx = s.knightOrder[s.roundIndex] ?? s.roundIndex;
  return KNIGHT_PERSONALITIES[idx] ?? KNIGHT_PERSONALITIES[0];
}

/** Deterministic pseudo-random for seeded visuals (so trees/flowers don't jitter). */
function seededRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------
// JoustingGame class
// ---------------------------------------------------------------------------

export class JoustingGame {
  private _state: JoustState = createState();
  private _container = new Container();
  private _gfx = new Graphics();
  private _texts: Text[] = [];
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _sw = 0;
  private _sh = 0;
  private _elapsed = 0;

  async boot(): Promise<void> {
    viewManager.clearWorld();
    this._sw = viewManager.screenWidth;
    this._sh = viewManager.screenHeight;
    this._elapsed = 0;
    this._container.addChild(this._gfx);
    viewManager.addToLayer("ui", this._container);
    window.addEventListener("keydown", _onKeyDown);
    window.addEventListener("keyup", _onKeyUp);
    this._state = createState();
    this._state.phase = Phase.MAIN_MENU;
    joustingAudio.init();
    this._tickerCb = (ticker) => this._update(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  destroy(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    window.removeEventListener("keydown", _onKeyDown);
    window.removeEventListener("keyup", _onKeyUp);
    joustingAudio.destroy();
    viewManager.removeFromLayer("ui", this._container);
    this._container.destroy({ children: true });
  }

  // =========================================================================
  // UPDATE
  // =========================================================================

  private _update(dt: number): void {
    const s = this._state;
    if (dt > 0.1) dt = 0.1;

    // Slow-motion system
    if (s.slowMoTimer > 0) {
      s.slowMoTimer -= dt; // timer ticks in real-time
      if (s.slowMoTimer <= 0) { s.slowMo = 1; s.slowMoTimer = 0; }
    }
    dt *= s.slowMo; // apply slow-motion to all game logic
    this._elapsed += dt;

    // Tutorial hint timer
    if (s.showHint) { s.hintTimer -= dt; if (s.hintTimer <= 0) s.showHint = false; }

    // Particles
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type !== "confetti") p.vy += 400 * dt;
      else p.vy += 60 * dt; // confetti floats
      if (p.rotation !== undefined) p.rotation! += (p.rotSpeed ?? 0) * dt;
      p.life -= dt;
      if (p.life <= 0) s.particles.splice(i, 1);
    }
    // Floating texts
    for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
      const ft = s.floatingTexts[i]; ft.y += ft.vy * dt; ft.life -= dt;
      if (ft.life <= 0) s.floatingTexts.splice(i, 1);
    }
    if (s.shakeTimer > 0) s.shakeTimer -= dt;
    if (s.impactFlash > 0) s.impactFlash = Math.max(0, s.impactFlash - dt * 4);
    if (s.phaseFlash > 0) s.phaseFlash = Math.max(0, s.phaseFlash - dt * 5);
    s.crowdExcitement = Math.max(0, s.crowdExcitement - dt * 0.3);
    s.crowdWavePhase += dt * (1.5 + s.crowdExcitement * 3);

    // Pause key (ESC during gameplay phases)
    const gameplayPhases = [Phase.AIMING, Phase.CHARGING, Phase.IMPACT, Phase.TILT_RESULT, Phase.PRE_MATCH];
    if (gameplayPhases.includes(s.phase) && justPressed("Escape")) {
      s.pausedFrom = s.phase;
      s.phase = Phase.PAUSE;
      joustingAudio.stopGallop();
      joustingAudio.stopMeterTone();
    }

    switch (s.phase) {
      case Phase.MAIN_MENU: this._updateMainMenu(); break;
      case Phase.ABILITY_SELECT: this._updateAbilitySelect(); break;
      case Phase.STATS: this._updateStats(); break;
      case Phase.BESTIARY: this._updateBestiary(); break;
      case Phase.CONTROLS: this._updateControls(); break;
      case Phase.PRE_MATCH: this._updatePreMatch(dt); break;
      case Phase.CHARGING: this._updateCharging(dt); break;
      case Phase.AIMING: this._updateAiming(dt); break;
      case Phase.IMPACT: this._updateImpact(dt); break;
      case Phase.TILT_RESULT: this._updateTiltResult(dt); break;
      case Phase.MATCH_RESULT: this._updateMatchResult(dt); break;
      case Phase.EVENT: this._updateEvent(); break;
      case Phase.SHOP: this._updateShop(); break;
      case Phase.PAUSE: this._updatePause(); break;
      case Phase.TOURNAMENT_END: this._updateTournamentEnd(); break;
    }
    this._render();
    clearJustPressed();
  }

  // ---- Phase updates (same logic as v2) -----------------------------------

  private _updateMainMenu(): void {
    const s = this._state;
    // Difficulty selection with A/D
    if (justPressed("ArrowLeft") || justPressed("KeyA")) s.difficultyCursor = Math.max(0, s.difficultyCursor - 1);
    if (justPressed("ArrowRight") || justPressed("KeyD")) s.difficultyCursor = Math.min(2, s.difficultyCursor + 1);
    if (justPressed("Space") || justPressed("Enter")) {
      const best = s.bestRound;
      const diff: Difficulty = (["squire", "knight", "champion"] as Difficulty[])[s.difficultyCursor];
      this._state = createState();
      this._state.bestRound = best;
      this._state.difficulty = diff;
      this._state.gold = DIFFICULTY_MAP[diff].startGold;
      this._state.phase = Phase.ABILITY_SELECT;
    }
    // Menu navigation
    if (justPressed("KeyS") && !justPressed("Space")) { /* handled by difficulty */ }
    if (justPressed("Digit1") || justPressed("KeyC")) { s.phase = Phase.CONTROLS; return; }
    if (justPressed("Digit2") || justPressed("KeyB")) { s.phase = Phase.BESTIARY; s.bestiaryCursor = 0; return; }
    if (justPressed("Digit3") || justPressed("KeyR")) { s.phase = Phase.STATS; s.statsPage = 0; return; }
    if (justPressed("Escape")) window.dispatchEvent(new Event("joustingExit"));
  }

  private _updateAbilitySelect(): void {
    const s = this._state;
    if (justPressed("ArrowUp") || justPressed("KeyW")) s.abilityCursor = Math.max(0, s.abilityCursor - 1);
    if (justPressed("ArrowDown") || justPressed("KeyS")) s.abilityCursor = Math.min(SELECTABLE_ABILITIES.length - 1, s.abilityCursor + 1);
    // Challenge mode toggle with A/D
    const unlocked = s.mastery.totalWins > 0 || s.playerWins >= 4;
    if (unlocked) {
      const modes: ChallengeMode[] = ["normal", "ironGauntlet", "flawless", "handicap"];
      if (justPressed("ArrowLeft") || justPressed("KeyA")) s.challengeCursor = Math.max(0, s.challengeCursor - 1);
      if (justPressed("ArrowRight") || justPressed("KeyD")) s.challengeCursor = Math.min(modes.length - 1, s.challengeCursor + 1);
      s.challengeMode = modes[s.challengeCursor];
    }
    if (justPressed("Space") || justPressed("Enter")) {
      s.playerAbility = SELECTABLE_ABILITIES[s.abilityCursor];
      if (s.challengeMode === "handicap") s.gold = 0;
      // Random bracket: shuffle knight order
      if (s.randomBracket) {
        const order = [0, 1, 2, 3, 4, 5, 6, 7];
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
        s.knightOrder = order;
      }
      // Roll weather and arena for first match
      s.weather = ALL_WEATHER[Math.floor(Math.random() * ALL_WEATHER.length)];
      s.arenaTheme = ALL_ARENAS[Math.floor(Math.random() * ALL_ARENAS.length)];
      // Check cosmetic unlocks
      s.unlockedCosmetics = COSMETIC_UNLOCKS.filter(c => c.check(s.mastery)).map(c => c.id);
      // Apply active cosmetic if any
      if (s.unlockedCosmetics.length > 0 && !s.activeCosmetic) {
        s.activeCosmetic = s.unlockedCosmetics[s.unlockedCosmetics.length - 1]; // latest unlock
      }
      joustingAudio.confirm();
      s.phase = Phase.PRE_MATCH; s.timer = 3.0;
    }
    // Toggle random bracket with R
    if (justPressed("KeyR") && (s.mastery.totalWins > 0 || s.bestRound >= 4)) {
      s.randomBracket = !s.randomBracket;
    }
  }

  private _updateStats(): void {
    if (justPressed("Escape") || justPressed("Space")) { this._state.phase = Phase.MAIN_MENU; }
  }

  private _updateBestiary(): void {
    const s = this._state;
    if (justPressed("ArrowUp") || justPressed("KeyW")) s.bestiaryCursor = Math.max(0, s.bestiaryCursor - 1);
    if (justPressed("ArrowDown") || justPressed("KeyS")) s.bestiaryCursor = Math.min(TOURNAMENT_KNIGHTS.length - 1, s.bestiaryCursor + 1);
    if (justPressed("Escape") || justPressed("Space")) { s.phase = Phase.MAIN_MENU; }
  }

  private _updateControls(): void {
    if (justPressed("Escape") || justPressed("Space")) { this._state.phase = Phase.MAIN_MENU; }
  }

  private _updatePause(): void {
    const s = this._state;
    if (justPressed("Escape") || justPressed("KeyP")) {
      // Resume
      s.phase = s.pausedFrom;
    }
    if (justPressed("KeyQ")) {
      // Quit to main menu
      const best = s.bestRound;
      const mastery = _readMastery();
      this._state = createState();
      this._state.bestRound = best;
      this._state.mastery = mastery;
      this._state.phase = Phase.MAIN_MENU;
      joustingAudio.stopGallop();
      joustingAudio.stopMeterTone();
      joustingAudio.stopCrowd();
    }
  }

  private _updatePreMatch(dt: number): void {
    const s = this._state; s.timer -= dt;
    if (justPressed("Space") || justPressed("Enter")) s.timer = 0;
    if (s.timer <= 0) {
      s.phase = Phase.AIMING; s.aimTimer = AIM_TIME; s.chargeProgress = 0;
      s.playerLance = "mid"; s.playerShield = "mid";
      s.playerUnhorsed = false; s.aiUnhorsed = false;
      s.unhorseAnimTimer = 0; s.unhorsePlayerFallAngle = 0; s.unhorseAIFallAngle = 0;
      s.impactRecoilPlayer = 0; s.impactRecoilAI = 0; s.impactZoom = 0; s.impactSeverity = 0;
      s.impactFlash = 0;
      joustingAudio.startCrowd();
      joustingAudio.startAimingMusic();
      this._decideAI();
    }
  }

  private _updateCharging(dt: number): void {
    const s = this._state;
    const speedMult = 1 + s.horseLevel * 0.1;
    // Iron Gauntlet: every 3rd tilt, meter speeds up 25%
    const igBoost = (s.challengeMode === "ironGauntlet" && s.tiltIndex % 3 === 2) ? 1.25 : 1;
    s.chargeProgress += (dt / chargeDuration(s.roundIndex)) * speedMult * igBoost;
    if (s.chargeProgress > 0.5) s.crowdExcitement = Math.min(1, s.crowdExcitement + dt * 2);

    // Charge stages — progressive tension
    const prevStage = s.chargeStage;
    if (s.chargeProgress < 0.25) s.chargeStage = 0;
    else if (s.chargeProgress < 0.5) s.chargeStage = 1;
    else if (s.chargeProgress < 0.75) s.chargeStage = 2;
    else s.chargeStage = 3;
    // Stage transition effects
    if (s.chargeStage > prevStage) {
      if (s.chargeStage === 2) s.crowdExcitement = Math.min(1, s.crowdExcitement + 0.2); // crowd stirs at 50%
      if (s.chargeStage === 3) {
        s.slowMo = 0.92; s.slowMoTimer = 0.15; // brief micro-slowdown at 75% — tension peak
      }
    }

    // Power windows — periodic brief bonus windows during charge (dt-based, no setTimeout)
    if (s.powerWindowActive) {
      s.powerWindowTimer -= dt;
      if (s.powerWindowTimer <= 0) s.powerWindowActive = false; // window expired
    } else {
      s.powerWindowTimer -= dt;
      if (s.powerWindowTimer <= 0 && s.chargeProgress < 0.85 && s.chargeProgress > 0.1) {
        s.powerWindowActive = true;
        s.powerWindowTimer = 0.3; // window lasts 0.3s (counted down above)
        joustingAudio.zoneChange(); // audio cue
      }
    }

    // Reveal opponent zones (fog delays reveal)
    const weatherDef = WEATHER_DEFS[s.weather];
    s.showOpponentZones = s.chargeProgress > weatherDef.zoneRevealProgress;

    // Power meter oscillates (sine wave 0-1) — speed from difficulty
    const diff = DIFFICULTY_MAP[s.difficulty];
    // Stamina affects meter speed: low stamina = slower oscillation (harder to time)
    const staminaSlowdown = s.playerStamina < 30 ? 1 - ((30 - s.playerStamina) / 30) * 0.3 : 1;
    const meterSpd = diff.meterSpeed * staminaSlowdown * igBoost;
    const perfZone = diff.perfectZone * (s.playerAbility === "swiftStrike" ? 1.5 : 1);
    const goodZn = diff.goodZone * (s.playerAbility === "swiftStrike" ? 1.2 : 1);
    if (!s.powerMeterLocked) {
      s.powerMeterPos = (Math.sin(this._elapsed * Math.PI * 2 * meterSpd) + 1) / 2;
      joustingAudio.updateMeterTone(s.powerMeterPos);
    }

    // Lock power meter with Space
    if (!s.powerMeterLocked && justPressed("Space")) {
      s.powerMeterLocked = true;
      const dist = Math.abs(s.powerMeterPos - 0.5);
      if (dist <= perfZone) { s.powerRating = "perfect"; this._addFloating("PERFECT!", this._sw / 2, this._sh * 0.7, 0x44ffaa, 20); joustingAudio.perfectTiming(); }
      else if (dist <= goodZn) { s.powerRating = "good"; this._addFloating("GOOD", this._sw / 2, this._sh * 0.7, 0xcccc44, 16); joustingAudio.confirm(); }
      else { s.powerRating = "weak"; this._addFloating("WEAK", this._sw / 2, this._sh * 0.7, 0x886644, 14); }
      // Power window bonus: if locked during active window, upgrade rating
      if (s.powerWindowActive && !s.powerWindowHit) {
        s.powerWindowHit = true;
        if (s.powerRating === "good") { s.powerRating = "perfect"; this._addFloating("WINDOW BONUS!", this._sw / 2, this._sh * 0.66, 0x44ffdd, 16); }
        else if (s.powerRating === "weak") { s.powerRating = "good"; this._addFloating("WINDOW SAVE!", this._sw / 2, this._sh * 0.66, 0xdddd44, 14); }
      }
      joustingAudio.stopMeterTone();
    }

    // Exhaustion: very low stamina slows charge
    if (s.playerStamina < 20) {
      // Reduce charge speed by up to 20% when exhausted
      const exhaustionPenalty = 1 - ((20 - s.playerStamina) / 20) * 0.2;
      s.chargeProgress -= (dt / chargeDuration(s.roundIndex)) * speedMult * (1 - exhaustionPenalty); // counteract some of the speed
    }

    // Feint: press W/S/A/D during last 40% of charge to shift zones (costs stamina)
    // Disabled when stamina < 20 (too exhausted to feint)
    if (s.chargeProgress > (1 - FEINT_WINDOW) && !s.playerFeinted && s.playerStamina >= FEINT_STAMINA_COST && s.playerStamina >= 20) {
      let feinted = false;
      if (justPressed("ArrowUp") || justPressed("KeyW")) {
        const i = zoneIndex(s.playerLance); if (i > 0) { s.playerLance = LANCE_ZONES[i - 1]; feinted = true; }
      }
      if (justPressed("ArrowDown") || justPressed("KeyS")) {
        const i = zoneIndex(s.playerLance); if (i < 2) { s.playerLance = LANCE_ZONES[i + 1]; feinted = true; }
      }
      if (justPressed("ArrowLeft") || justPressed("KeyA")) {
        const i = zoneIndex(s.playerShield); if (i > 0) { s.playerShield = LANCE_ZONES[i - 1]; feinted = true; }
      }
      if (justPressed("ArrowRight") || justPressed("KeyD")) {
        const i = zoneIndex(s.playerShield); if (i < 2) { s.playerShield = LANCE_ZONES[i + 1]; feinted = true; }
      }
      if (feinted) {
        s.playerFeinted = true;
        s.playerStamina -= FEINT_STAMINA_COST;
        this._addFloating("FEINT!", this._sw * 0.3, this._sh * 0.45, 0xff8844, 18);
        joustingAudio.feint();
      }
    }

    // AI feint (ability-based, or any AI in later rounds at lower chance)
    const opp = getOpponent(s);
    const canAIFeint = opp.ability === "feinter" || opp.ability === "pendragon";
    const pers = getPersonality(s);
    const lateRoundFeint = s.roundIndex >= 4 && !canAIFeint;
    const feintChance = (canAIFeint ? 0.08 : lateRoundFeint ? 0.03 : 0) * Math.max(1, pers.feintLikelihood);
    if (feintChance > 0 && !s.aiFeinted && s.chargeProgress > (1 - FEINT_WINDOW) && Math.random() < feintChance) {
      // AI shifts to a random different zone
      const zones: Zone[] = LANCE_ZONES.filter(z => z !== s.aiLance);
      s.aiLance = zones[Math.floor(Math.random() * zones.length)];
      s.aiFeinted = true;
    }

    if (s.chargeProgress >= 1.0) {
      s.chargeProgress = 1.0;
      // Auto-lock power meter if not locked
      if (!s.powerMeterLocked) {
        s.powerMeterLocked = true;
        const dist = Math.abs(s.powerMeterPos - 0.5);
        if (dist <= perfZone) s.powerRating = "perfect";
        else if (dist <= goodZn) s.powerRating = "good";
        else s.powerRating = "weak";
      }
      this._resolveImpact();
      joustingAudio.stopGallop();
      joustingAudio.stopMeterTone();
      joustingAudio.stopMusic();
      // Impact freeze duration scales with severity (block=0.6s, hit=0.9s, strong=1.1s, unhorse=1.4s)
      const freezeDurations = [0.6, 0.9, 1.1, 1.4];
      s.phase = Phase.IMPACT; s.timer = freezeDurations[s.impactSeverity] ?? IMPACT_FREEZE;
      s.unhorseAnimTimer = 0;
      s.impactFlash = 0.6 + s.impactSeverity * 0.15; // stronger flash for bigger hits
    }
  }

  private _updateAiming(dt: number): void {
    const s = this._state; s.aimTimer -= dt;
    // AI tell: lance drifts toward AI's chosen zone (subtle, skill-based)
    const opp = getOpponent(s);
    const tellStrength = Math.max(0, 1 - opp.skill * 1.2); // lower skill = more obvious tell
    const targetDrift = s.aiLance === "high" ? -1 : s.aiLance === "low" ? 1 : 0;
    s.aiTellDrift += (targetDrift * tellStrength - s.aiTellDrift) * dt * 1.5; // smooth drift
    if (justPressed("ArrowUp") || justPressed("KeyW")) { const i = zoneIndex(s.playerLance); if (i > 0) s.playerLance = LANCE_ZONES[i - 1]; }
    if (justPressed("ArrowDown") || justPressed("KeyS")) { const i = zoneIndex(s.playerLance); if (i < 2) s.playerLance = LANCE_ZONES[i + 1]; }
    if (justPressed("ArrowLeft") || justPressed("KeyA")) { const i = zoneIndex(s.playerShield); if (i > 0) s.playerShield = LANCE_ZONES[i - 1]; }
    if (justPressed("ArrowRight") || justPressed("KeyD")) { const i = zoneIndex(s.playerShield); if (i < 2) s.playerShield = LANCE_ZONES[i + 1]; }
    if (justPressed("Space") || justPressed("Enter") || s.aimTimer <= 0) {
      s.phase = Phase.CHARGING; s.chargeProgress = 0;
      s.powerMeterPos = 0; s.powerMeterLocked = false; s.powerRating = "none";
      s.playerFeinted = false; s.aiFeinted = false; s.feintDodged = false;
      s.powerWindowActive = false; s.powerWindowTimer = 0.6 + Math.random() * 0.4; s.powerWindowHit = false;
      s.showOpponentZones = false;
      s.playerLanceHistory.push(s.playerLance); s.playerShieldHistory.push(s.playerShield);
      s.phaseFlash = 0.5;
      joustingAudio.confirm();
      joustingAudio.startGallop();
      joustingAudio.startMeterTone();
      joustingAudio.startCrowd();
      joustingAudio.startChargeMusic();
      // Tutorial hint for first match
      if (s.isFirstRun && s.roundIndex === 0 && s.tiltIndex === 0) {
        s.showHint = true;
        s.hintText = "Hit SPACE when the needle is in the GREEN zone!";
        s.hintTimer = 2.5;
      }
    }
    // Zone change audio
    if (justPressed("ArrowUp") || justPressed("KeyW") || justPressed("ArrowDown") || justPressed("KeyS") ||
        justPressed("ArrowLeft") || justPressed("KeyA") || justPressed("ArrowRight") || justPressed("KeyD")) {
      joustingAudio.zoneChange();
    }
  }

  private _updateImpact(dt: number): void {
    const s = this._state; s.timer -= dt;
    // Unhorse animation
    if (s.playerUnhorsed || s.aiUnhorsed) {
      s.unhorseAnimTimer += dt;
      if (s.playerUnhorsed) s.unhorsePlayerFallAngle = Math.min(Math.PI / 2, s.unhorseAnimTimer * 3);
      if (s.aiUnhorsed) s.unhorseAIFallAngle = Math.min(Math.PI / 2, s.unhorseAnimTimer * 3);
    }
    // Recoil decay (knights slide back then settle)
    s.impactRecoilPlayer = Math.max(0, s.impactRecoilPlayer - dt * 1.2);
    s.impactRecoilAI = Math.max(0, s.impactRecoilAI - dt * 1.2);
    // Zoom decay
    s.impactZoom = Math.max(0, s.impactZoom - dt * 2.5);
    if (s.timer <= 0) { s.phase = Phase.TILT_RESULT; s.timer = RESULT_DISPLAY; }
  }

  private _updateTiltResult(dt: number): void {
    const s = this._state; s.timer -= dt;
    if (justPressed("Space") || justPressed("Enter")) s.timer = 0;
    if (s.timer <= 0) {
      s.tiltIndex++;
      const tc = tiltsForRound(s.roundIndex);
      const needed = Math.ceil(tc / 2);
      if (s.playerScore >= needed || s.opponentScore >= needed || s.tiltIndex >= tc) {
        // Instant replay of winning tilt before match result
        if (s.playerScore > s.opponentScore && s.impactSeverity >= 1) {
          s.replayActive = true; s.replayTimer = 1.5; // 1.5s replay
          s.slowMo = 0.35; s.slowMoTimer = 1.5; // slow during replay
          s.chargeProgress = 0.85; // show last 15% of charge as "replay"
        }
        s.phase = Phase.MATCH_RESULT; s.timer = RESULT_DISPLAY + (s.replayActive ? 1.5 : 0);
        if (s.playerScore > s.opponentScore && !s.replayActive) {
          s.slowMo = 0.4; s.slowMoTimer = 0.6;
          if (s.roundIndex === TOURNAMENT_KNIGHTS.length - 1) {
            s.slowMo = 0.2; s.slowMoTimer = 1.0;
          }
        }
      } else {
        const extraRegen = s.playerAbility === "ironWill" ? 5 : 0;
        s.playerStamina = Math.min(MAX_STAMINA, s.playerStamina + STAMINA_REGEN_PER_TILT + extraRegen);
        s.aiStamina = Math.min(MAX_STAMINA, s.aiStamina + STAMINA_REGEN_PER_TILT);
        s.crowdFavorUsed = false; // reset favor usage for next tilt
        s.phase = Phase.AIMING; s.aimTimer = AIM_TIME; s.chargeProgress = 0;
        s.playerLance = "mid"; s.playerShield = "mid";
        s.playerUnhorsed = false; s.aiUnhorsed = false;
        s.unhorseAnimTimer = 0; s.unhorsePlayerFallAngle = 0; s.unhorseAIFallAngle = 0;
        s.impactRecoilPlayer = 0; s.impactRecoilAI = 0; s.impactZoom = 0; s.impactSeverity = 0;
        s.impactFlash = 0;
        joustingAudio.startAimingMusic();
        this._decideAI();
      }
    }
  }

  private _updateMatchResult(dt: number): void {
    const s = this._state; s.timer -= dt;
    if (justPressed("Space") || justPressed("Enter")) s.timer = 0;
    if (s.timer <= 0) {
      let won = s.playerScore > s.opponentScore;
      // Flawless challenge graded: 0 hits = FLAWLESS (gold), 1 hit = VALIANT (silver), 2+ = fail
      if (won && s.challengeMode === "flawless" && s.hitsTaken >= 2) {
        won = false; // override — too many hits
      }
      if (won) {
        s.playerWins++; s.roundIndex++;
        const winGold = Math.round(GOLD_WIN * DIFFICULTY_MAP[s.difficulty].goldMult);
        s.gold += winGold; s.totalGoldEarned += winGold;
        if (s.playerWins > s.bestRound) { s.bestRound = s.playerWins; _writeBest(s.playerWins); }
        joustingAudio.victory();
        // Update mastery for defeated knight
        const defeatedName = TOURNAMENT_KNIGHTS[s.roundIndex - 1]?.name ?? "";
        if (defeatedName) {
          if (!s.mastery.knights[defeatedName]) s.mastery.knights[defeatedName] = { wins: 0, unhorses: 0, perfectWins: 0 };
          s.mastery.knights[defeatedName].wins++;
          if (s.allPerfectThisMatch) s.mastery.knights[defeatedName].perfectWins++;
        }
        s.allPerfectThisMatch = true; // reset for next match
        if (s.roundIndex >= TOURNAMENT_KNIGHTS.length) { s.phase = Phase.TOURNAMENT_END; joustingAudio.stopCrowd(); }
        else {
          // Iron Gauntlet: skip shop entirely
          if (s.challengeMode === "ironGauntlet") {
            s.tiltIndex = 0; s.playerScore = 0; s.opponentScore = 0;
            s.playerStamina = Math.min(MAX_STAMINA, s.playerStamina + 20);
            s.aiStamina = MAX_STAMINA;
            s.playerLanceHistory = []; s.playerShieldHistory = []; s.aiLanceHistory = []; s.aiShieldHistory = [];
            s.crowdFavor = 0; s.crowdFavorUsed = false; s.hitsTaken = 0;
            s.impactRecoilPlayer = 0; s.impactRecoilAI = 0; s.impactZoom = 0;
            joustingAudio.startCrowd();
            s.weather = ALL_WEATHER[Math.floor(Math.random() * ALL_WEATHER.length)];
            s.arenaTheme = ALL_ARENAS[s.roundIndex % ALL_ARENAS.length];
            s.phase = Phase.PRE_MATCH; s.timer = 2.0;
          }
          // Random event (40% chance after each win)
          else if (Math.random() < 0.4) {
            s.currentEvent = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
            s.phase = Phase.EVENT;
          } else {
            s.phase = Phase.SHOP; s.shopCursor = 0;
          }
        }
      } else {
        if (s.playerWins > s.bestRound) { s.bestRound = s.playerWins; _writeBest(s.playerWins); }
        joustingAudio.defeat();
        joustingAudio.stopCrowd();
        joustingAudio.stopGallop();
        s.phase = Phase.TOURNAMENT_END;
      }
    }
  }

  private _updateEvent(): void {
    if (justPressed("Space") || justPressed("Enter")) {
      const s = this._state;
      if (s.currentEvent) {
        s.currentEvent.apply(s);
        joustingAudio.eventReveal();
      }
      s.currentEvent = null;
      s.phase = Phase.SHOP; s.shopCursor = 0;
    }
  }

  private _updateShop(): void {
    const s = this._state;
    const items = this._getShopItems();
    // Navigate with W/S
    if (justPressed("ArrowUp") || justPressed("KeyW")) { s.shopCursor = Math.max(0, s.shopCursor - 1); }
    if (justPressed("ArrowDown") || justPressed("KeyS")) { s.shopCursor = Math.min(items.length, s.shopCursor + 1); }
    // Buy with Space/Enter
    if (justPressed("Space") || justPressed("Enter")) {
      if (s.shopCursor < items.length) {
        const item = items[s.shopCursor];
        if (item.canBuy) {
          s.gold -= item.cost;
          item.apply();
          this._addFloating(`-${item.cost}g`, this._sw / 2, this._sh * 0.5, 0xffd700, 18);
          joustingAudio.purchase();
        }
      } else {
        // "Continue" selected — go to next match
        s.tiltIndex = 0; s.playerScore = 0; s.opponentScore = 0;
        s.playerStamina = MAX_STAMINA; s.aiStamina = MAX_STAMINA;
        s.playerLanceHistory = []; s.playerShieldHistory = []; s.aiLanceHistory = []; s.aiShieldHistory = [];
        s.crowdFavor = 0; s.crowdFavorUsed = false; s.hitsTaken = 0;
        s.weather = ALL_WEATHER[Math.floor(Math.random() * ALL_WEATHER.length)];
        s.arenaTheme = ALL_ARENAS[s.roundIndex % ALL_ARENAS.length];
        s.phase = Phase.PRE_MATCH; s.timer = 3.0;
      }
    }
  }

  private _getShopItems(): { name: string; desc: string; cost: number; canBuy: boolean; level: number; maxLevel: number; apply: () => void }[] {
    const s = this._state;
    const items: { name: string; desc: string; cost: number; canBuy: boolean; level: number; maxLevel: number; apply: () => void }[] = [];
    // Lance upgrade
    if (s.lanceLevel < 2) {
      const cost = LANCE_UPGRADE_COST[s.lanceLevel];
      items.push({ name: "Lance Upgrade", desc: "+unhorse chance, +damage", cost, canBuy: s.gold >= cost, level: s.lanceLevel + 1, maxLevel: 2, apply: () => { s.lanceLevel++; } });
    } else {
      items.push({ name: "Lance Upgrade", desc: "MAX LEVEL", cost: 0, canBuy: false, level: 2, maxLevel: 2, apply: () => {} });
    }
    // Shield upgrade
    if (s.shieldLevel < 2) {
      const cost = SHIELD_UPGRADE_COST[s.shieldLevel];
      items.push({ name: "Shield Upgrade", desc: "blocks adjacent zones", cost, canBuy: s.gold >= cost, level: s.shieldLevel + 1, maxLevel: 2, apply: () => { s.shieldLevel++; } });
    } else {
      items.push({ name: "Shield Upgrade", desc: "MAX LEVEL", cost: 0, canBuy: false, level: 2, maxLevel: 2, apply: () => {} });
    }
    // Horse upgrade
    if (s.horseLevel < 2) {
      const cost = HORSE_UPGRADE_COST[s.horseLevel];
      items.push({ name: "Horse Upgrade", desc: "+charge speed", cost, canBuy: s.gold >= cost, level: s.horseLevel + 1, maxLevel: 2, apply: () => { s.horseLevel++; } });
    } else {
      items.push({ name: "Horse Upgrade", desc: "MAX LEVEL", cost: 0, canBuy: false, level: 2, maxLevel: 2, apply: () => {} });
    }
    // Stamina potion
    if (s.playerStamina < MAX_STAMINA) {
      items.push({ name: "Stamina Potion", desc: "restore full stamina", cost: POTION_COST, canBuy: s.gold >= POTION_COST, level: 0, maxLevel: 0, apply: () => { s.playerStamina = MAX_STAMINA; } });
    }
    return items;
  }

  private _updateTournamentEnd(): void {
    const s = this._state;
    // Save mastery on first entry to this phase (check if not already saved)
    if (s.mastery.totalRuns === _readMastery().totalRuns) {
      s.mastery.totalRuns++;
      if (s.roundIndex >= TOURNAMENT_KNIGHTS.length) {
        s.mastery.totalWins++;
        s.mastery.challengeClears[s.challengeMode] = true;
      }
      _writeMastery(s.mastery);
    }
    if (justPressed("Space") || justPressed("Enter")) {
      const best = s.bestRound;
      const mastery = _readMastery();
      this._state = createState();
      this._state.bestRound = best;
      this._state.mastery = mastery;
      this._state.phase = Phase.MAIN_MENU;
    }
    if (justPressed("Escape")) window.dispatchEvent(new Event("joustingExit"));
  }

  // ---- AI (same as v2) ----------------------------------------------------

  private _decideAI(): void {
    const s = this._state;
    const handicapBoost = s.challengeMode === "handicap" ? 0.2 : 0;
    const skill = Math.min(1, getOpponent(s).skill * DIFFICULTY_MAP[s.difficulty].aiSkillMult + handicapBoost);
    const personality = getPersonality(s);
    const lanceFreq: Record<Zone, number> = { high: 0, mid: 0, low: 0 };
    for (const z of s.playerLanceHistory) lanceFreq[z]++;
    const shieldFreq: Record<Zone, number> = { high: 0, mid: 0, low: 0 };
    for (const z of s.playerShieldHistory) shieldFreq[z]++;
    const histLen = s.playerLanceHistory.length;

    // First tilt personality behavior
    if (histLen === 0) {
      if (personality.firstTiltBehavior === "aggressive") {
        s.aiLance = personality.preferredLance ?? (Math.random() < 0.6 ? "high" : "low");
        s.aiShield = personality.preferredShield ?? "mid";
        return;
      } else if (personality.firstTiltBehavior === "defensive") {
        s.aiLance = "mid";
        s.aiShield = personality.preferredShield ?? "mid";
        return;
      }
    }

    // Shield: pattern-read or personality-biased
    if (histLen >= 1 && Math.random() < skill) {
      let best: Zone = "mid"; let bestC = -1;
      for (const z of LANCE_ZONES) { const sc = lanceFreq[z] + Math.random() * 0.5; if (sc > bestC) { bestC = sc; best = z; } }
      s.aiShield = best;
    } else if (personality.preferredShield && Math.random() < personality.aggressiveness) {
      s.aiShield = personality.preferredShield; // personality bias
    } else { s.aiShield = LANCE_ZONES[Math.floor(Math.random() * 3)]; }

    // Lance: pattern-read or personality-biased
    if (histLen >= 1 && Math.random() < skill) {
      let worst: Zone = "mid"; let worstC = Infinity;
      for (const z of LANCE_ZONES) { const sc = shieldFreq[z] + Math.random() * 0.5; if (sc < worstC) { worstC = sc; worst = z; } }
      s.aiLance = worst;
    } else if (personality.preferredLance && Math.random() < personality.aggressiveness) {
      s.aiLance = personality.preferredLance; // personality bias
    } else {
      const w = [0.35, 0.3, 0.35]; const r = Math.random(); let cum = 0; s.aiLance = "mid";
      for (let i = 0; i < 3; i++) { cum += w[i]; if (r < cum) { s.aiLance = LANCE_ZONES[i]; break; } }
    }
  }

  // ---- Impact resolution --------------------------------------------------

  private _resolveImpact(): void {
    const s = this._state;
    const opp = getOpponent(s);
    const ability = opp.ability;

    const diff = DIFFICULTY_MAP[s.difficulty];

    // Record AI choices for pattern display
    s.aiLanceHistory.push(s.aiLance);
    s.aiShieldHistory.push(s.aiShield);

    // Shield level gives chance to block adjacent zones
    const shieldBlockBase = s.playerAbility === "shieldMaster" ? 0.30 : 0;
    const shieldBlocksAdj = (level: number) => Math.random() < level * 0.15 + shieldBlockBase;
    let playerHit = s.playerLance !== s.aiShield;
    let aiHit = s.aiLance !== s.playerShield;

    // Player shield upgrade: chance to block adjacent zone
    if (aiHit && (s.shieldLevel > 0 || shieldBlockBase > 0) && zoneDist(s.aiLance, s.playerShield) === 1 && shieldBlocksAdj(s.shieldLevel)) {
      aiHit = false;
    }
    // Feint dodge: if player feinted shield to match AI lance zone, partial dodge
    if (aiHit && s.playerFeinted && s.aiLance === s.playerShield) {
      aiHit = false; // perfect dodge!
      s.feintDodged = true;
      this._addFloating("DODGE!", this._sw * 0.4, this._sh * 0.45, 0x44ffaa, 22);
    }

    // Crowd favor bonus: if full and not used, grant +1 point on hit
    const favorBonus = (s.crowdFavor >= CROWD_FAVOR_MAX && !s.crowdFavorUsed) ? 1 : 0;
    if (favorBonus > 0) s.crowdFavorUsed = true;

    let pp = 0, ap = 0;

    // --- Player's attack ---
    if (playerHit) {
      const d = zoneDist(s.playerLance, s.aiShield);
      const glance = ((MAX_STAMINA - s.playerStamina) / MAX_STAMINA) * 0.4;
      // Power rating modifiers
      const isPerfect = s.powerRating === "perfect";
      const isWeak = s.powerRating === "weak";
      // Lance upgrade: +unhorse chance
      const lanceBonus = s.lanceLevel * 0.1;
      const rageBonus = (ability === "rage" || ability === "pendragon") ? 0.15 : 0;
      const weatherUnhorse = WEATHER_DEFS[s.weather].unhorseMod;

      if (isWeak && Math.random() < 0.3) {
        pp = SCORE_GLANCE; s.lastPlayerResult = "GLANCE";
      } else if (Math.random() < glance && !isPerfect) {
        pp = SCORE_GLANCE; s.lastPlayerResult = "GLANCE";
      } else if (d >= 2 && Math.random() < 0.45 + (isPerfect ? 0.2 : 0) + lanceBonus + rageBonus + weatherUnhorse) {
        pp = SCORE_UNHORSE; s.aiUnhorsed = true; s.lastPlayerResult = "UNHORSED!";
      } else if (isPerfect && d >= 1 && Math.random() < 0.25 + lanceBonus) {
        pp = SCORE_UNHORSE; s.aiUnhorsed = true; s.lastPlayerResult = "UNHORSED!";
      } else {
        pp = SCORE_HIT; s.lastPlayerResult = "HIT!";
        if (isPerfect) { pp = 2; s.lastPlayerResult = "STRONG HIT!"; }
      }
    } else { pp = SCORE_BLOCK; s.lastPlayerResult = "BLOCKED"; }

    // Crowd favor bonus applied to player points
    if (pp > 0 && favorBonus > 0) {
      pp += favorBonus;
      s.lastPlayerResult += " +FAVOR!";
      this._addFloating("CROWD FAVOR!", this._sw / 2, this._sh * 0.65, 0xffdd44, 20);
    }

    // --- AI's attack ---
    if (aiHit) {
      const d = zoneDist(s.aiLance, s.playerShield);
      const aiSkill = Math.min(1, opp.skill * diff.aiSkillMult);
      const aiPerfect = ability === "perfect" || ability === "pendragon" || (ability === "morning" && s.tiltIndex === 0);
      const pureNoGlance = ability === "pure" || ability === "pendragon";
      const glance = pureNoGlance ? 0 : ((MAX_STAMINA - s.aiStamina) / MAX_STAMINA) * 0.4;
      const rageBonus = (ability === "rage" || ability === "pendragon") ? 0.15 : 0;
      void aiSkill; // used by AI decision, not directly in impact

      if (Math.random() < glance) { ap = SCORE_GLANCE; s.lastAIResult = "GLANCE"; }
      else if (d >= 2 && Math.random() < 0.45 + (aiPerfect ? 0.2 : 0) + rageBonus) {
        ap = SCORE_UNHORSE; s.playerUnhorsed = true; s.lastAIResult = "UNHORSED!";
      } else if (aiPerfect && d >= 1 && Math.random() < 0.25) {
        ap = SCORE_UNHORSE; s.playerUnhorsed = true; s.lastAIResult = "UNHORSED!";
      } else {
        ap = SCORE_HIT; s.lastAIResult = "HIT!";
        if (aiPerfect) { ap = 2; s.lastAIResult = "STRONG HIT!"; }
      }
    } else { ap = SCORE_BLOCK; s.lastAIResult = "BLOCKED"; }

    s.playerScore += pp; s.opponentScore += ap;
    s.lastPlayerPoints = pp; s.lastAIPoints = ap;

    // Stamina costs (Iron Will halves costs)
    const staminaMult = s.playerAbility === "ironWill" ? 0.5 : 1;
    if (aiHit) s.playerStamina = Math.max(0, s.playerStamina - (s.playerUnhorsed ? STAMINA_UNHORSE_COST : STAMINA_HIT_COST) * staminaMult);
    if (playerHit) s.aiStamina = Math.max(0, s.aiStamina - (s.aiUnhorsed ? STAMINA_UNHORSE_COST : STAMINA_HIT_COST));

    // Stats tracking
    if (s.powerRating === "perfect") s.totalPerfects++;
    if (s.aiUnhorsed) s.totalUnhorses++;

    // Crowd favor
    const favorMult = (s.playerAbility === "crowdChampion" ? 2 : 1) * (s.challengeMode === "handicap" ? 2 : 1);
    if (s.powerRating === "perfect") s.crowdFavor = Math.min(CROWD_FAVOR_MAX, s.crowdFavor + CROWD_FAVOR_PERFECT * favorMult);
    if (s.aiUnhorsed) s.crowdFavor = Math.min(CROWD_FAVOR_MAX, s.crowdFavor + CROWD_FAVOR_UNHORSE * favorMult);
    else if (pp > 0) s.crowdFavor = Math.min(CROWD_FAVOR_MAX, s.crowdFavor + CROWD_FAVOR_HIT * favorMult);
    s.crowdFavor = Math.max(0, s.crowdFavor - CROWD_FAVOR_DECAY);

    // Gold earned (difficulty multiplied)
    const gm = diff.goldMult * (s.playerAbility === "crowdChampion" ? 1.25 : 1);
    if (pp > ap) {
      const base = 10;
      let earned = base;
      if (s.lastPlayerResult.includes("UNHORSED")) earned += GOLD_UNHORSE_BONUS;
      if (s.powerRating === "perfect") earned += GOLD_PERFECT_BONUS;
      s.tiltStreak++;
      if (s.tiltStreak > s.bestStreakEver) s.bestStreakEver = s.tiltStreak;
      earned += s.tiltStreak * GOLD_STREAK_BONUS;
      const finalGold = Math.round(earned * gm);
      s.gold += finalGold;
      s.totalGoldEarned += finalGold;
      s.totalTiltsWon++;
      s.lastTiltWinner = "player";
      // Handicap bonus: hits boost crowd favor 2x, unhorse restores some stamina
      if (s.challengeMode === "handicap") {
        if (s.aiUnhorsed) s.playerStamina = Math.min(MAX_STAMINA, s.playerStamina + 25);
      }
    } else if (ap > pp) {
      s.tiltStreak = 0;
      s.lastTiltWinner = "ai";
    } else {
      s.lastTiltWinner = "draw";
    }

    const ix = this._sw / 2, iy = this._sh * 0.52;

    if (s.aiUnhorsed || s.playerUnhorsed) {
      // === UNHORSE — maximum impact ===
      this._spawnSparks(ix, iy, 80); this._spawnSplinters(ix, iy, 18);
      this._spawnConfetti(ix, iy - 50, 50);
      s.crowdExcitement = 1.0; s.shakeTimer = 0.6; s.shakeMag = 14;
      this._addFloating("UNHORSED!", ix, iy - 50, 0xff2200, 34);
      joustingAudio.unhorse();
      joustingAudio.crowdCheer(1.0);
      s.slowMo = 0.15; s.slowMoTimer = 0.7; // very dramatic slowmo
      s.impactSeverity = 3;
      s.impactRecoilPlayer = s.playerUnhorsed ? 1.0 : 0.3;
      s.impactRecoilAI = s.aiUnhorsed ? 1.0 : 0.3;
      s.impactZoom = 0.8;
    } else if (playerHit || aiHit) {
      const isPerfect = s.powerRating === "perfect";
      const isStrong = isPerfect || (pp >= 2);
      // === HIT — solid impact ===
      this._spawnSparks(ix, iy, isStrong ? 40 : 25);
      this._spawnSplinters(ix, iy, isStrong ? 10 : 5);
      s.crowdExcitement = isStrong ? 0.8 : 0.5;
      s.shakeTimer = isStrong ? 0.35 : 0.2;
      s.shakeMag = isStrong ? 8 : 5;
      if (isPerfect) {
        joustingAudio.strongHit();
        s.slowMo = 0.35; s.slowMoTimer = 0.4;
        s.impactSeverity = 2;
        s.impactZoom = 0.5;
      } else {
        joustingAudio.hit();
        s.slowMo = 0.55; s.slowMoTimer = 0.25; // every hit gets brief slowmo
        s.impactSeverity = 1;
        s.impactZoom = 0.25;
      }
      joustingAudio.crowdCheer(isStrong ? 0.7 : 0.4);
      // Recoil: hit knight pushes back
      s.impactRecoilPlayer = aiHit ? (isStrong ? 0.6 : 0.3) : 0.1;
      s.impactRecoilAI = playerHit ? (isStrong ? 0.6 : 0.3) : 0.1;
    } else {
      // === BLOCK — shields clash, still impactful ===
      this._spawnSparks(ix, iy, 15);
      // Shield sparks burst (blue-white)
      for (let bs = 0; bs < 8; bs++) {
        const ba = Math.random() * Math.PI * 2; const bsp = 60 + Math.random() * 120;
        this._state.particles.push({
          x: ix, y: iy, vx: Math.cos(ba) * bsp, vy: Math.sin(ba) * bsp - 60,
          life: 0.15 + Math.random() * 0.2, maxLife: 0.35,
          color: [0x88aaff, 0xaaccff, 0xffffff][Math.floor(Math.random() * 3)],
          size: 1.5 + Math.random() * 2, type: "spark",
        });
      }
      s.shakeTimer = 0.15; s.shakeMag = 3;
      s.slowMo = 0.7; s.slowMoTimer = 0.15; // brief hitch even on block
      s.impactSeverity = 0;
      s.impactRecoilPlayer = 0.15;
      s.impactRecoilAI = 0.15;
      s.impactZoom = 0.1;
      joustingAudio.block();
      s.crowdExcitement = Math.max(s.crowdExcitement, 0.2);
    }

    // Flawless tracking
    if (aiHit) {
      s.hitsTaken++;
      if (s.challengeMode === "flawless" && s.hitsTaken === 1) {
        this._addFloating("FLAWLESS BROKEN!", this._sw / 2, this._sh * 0.4, 0xff4444, 24);
      }
    }
    if (s.powerRating !== "perfect") s.allPerfectThisMatch = false;

    // Gold audio
    if (pp > 0) {
      this._addFloating(`+${pp}`, this._sw * 0.35, iy - 20, 0x44ff44, 24);
      joustingAudio.goldEarned();
    }
    if (ap > 0) this._addFloating(`+${ap}`, this._sw * 0.65, iy - 20, 0xff4444, 24);

    // Crowd favor full notification
    if (s.crowdFavor >= CROWD_FAVOR_MAX && !s.crowdFavorUsed) {
      joustingAudio.crowdFavorFull();
    }

    // Tutorial hint after first tilt
    if (s.isFirstRun && s.roundIndex === 0 && s.tiltIndex === 0) {
      if (playerHit && !aiHit) {
        s.showHint = true; s.hintText = "Great hit! Keep varying your zones to stay unpredictable."; s.hintTimer = 3;
      } else if (aiHit && !playerHit) {
        s.showHint = true; s.hintText = "Blocked! Try aiming where their shield ISN'T."; s.hintTimer = 3;
      }
    }
  }

  private _spawnSparks(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2; const sp = 80 + Math.random() * 280;
      this._state.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 140,
        life: 0.2 + Math.random() * 0.6, maxLife: 0.8,
        color: [0xffdd44, 0xffaa22, 0xffffff, 0xffee88][Math.floor(Math.random() * 4)],
        size: 1.5 + Math.random() * 3, type: "spark",
      });
    }
  }

  private _spawnSplinters(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const sp = 100 + Math.random() * 200;
      this._state.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
        life: 0.5 + Math.random() * 0.8, maxLife: 1.3,
        color: [0xccaa66, 0xbb9955, 0xddbb77][Math.floor(Math.random() * 3)],
        size: 3 + Math.random() * 5, type: "splinter",
        rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 12,
      });
    }
  }

  private _spawnConfetti(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this._state.particles.push({
        x: x + (Math.random() - 0.5) * 200, y: y - Math.random() * 60,
        vx: (Math.random() - 0.5) * 100, vy: -20 + Math.random() * 40,
        life: 1.5 + Math.random() * 1.5, maxLife: 3,
        color: [0xff4444, 0x4488ff, 0xffdd44, 0x44ff44, 0xff88ff, 0xffffff][Math.floor(Math.random() * 6)],
        size: 2 + Math.random() * 3, type: "confetti",
        rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 8,
      });
    }
  }

  private _spawnDust(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this._state.particles.push({
        x: x + (Math.random() - 0.5) * 10, y,
        vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30,
        life: 0.4 + Math.random() * 0.5, maxLife: 0.9,
        color: 0x998866, size: 4 + Math.random() * 6, type: "dust",
      });
    }
  }

  private _addFloating(text: string, x: number, y: number, color: number, fontSize: number): void {
    this._state.floatingTexts.push({ text, x, y, vy: -55, life: 1.4, maxLife: 1.4, color, fontSize });
  }

  // =========================================================================
  // RENDER
  // =========================================================================

  private _render(): void {
    const g = this._gfx; const s = this._state; const sw = this._sw; const sh = this._sh;
    for (const t of this._texts) { this._container.removeChild(t); t.destroy(); }
    this._texts = [];
    g.clear();

    let shakeX = 0, shakeY = 0;
    if (s.shakeTimer > 0) { shakeX = (Math.random() - 0.5) * s.shakeMag * 2; shakeY = (Math.random() - 0.5) * s.shakeMag * 2; }
    this._container.x = shakeX; this._container.y = shakeY;
    // Reset zoom (will be overridden by _renderArena if needed)
    this._container.scale.set(1); this._container.pivot.set(0, 0);

    switch (s.phase) {
      case Phase.MAIN_MENU: this._renderMainMenu(g, sw, sh); break;
      case Phase.ABILITY_SELECT: this._renderAbilitySelect(g, sw, sh); break;
      case Phase.STATS: this._renderStats(g, sw, sh); break;
      case Phase.BESTIARY: this._renderBestiary(g, sw, sh); break;
      case Phase.CONTROLS: this._renderControls(g, sw, sh); break;
      case Phase.PRE_MATCH: this._renderPreMatch(g, sw, sh); break;
      case Phase.AIMING: this._renderAiming(g, sw, sh); break;
      case Phase.CHARGING: this._renderArena(g, sw, sh); break;
      case Phase.IMPACT: this._renderArena(g, sw, sh); this._renderImpactText(sw, sh); break;
      case Phase.TILT_RESULT: this._renderArena(g, sw, sh); this._renderTiltResult(sw, sh); break;
      case Phase.MATCH_RESULT: this._renderMatchResult(g, sw, sh); break;
      case Phase.EVENT: this._renderEvent(g, sw, sh); break;
      case Phase.SHOP: this._renderShop(g, sw, sh); break;
      case Phase.PAUSE: this._renderPause(g, sw, sh); break;
      case Phase.TOURNAMENT_END: this._renderTournamentEnd(g, sw, sh); break;
    }

    // Particles
    for (const p of s.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      if (p.type === "splinter") {
        // Draw rotated rectangle for splinter
        const cx = p.x, cy = p.y; const r = p.rotation ?? 0;
        const hw = p.size, hh = 1.5;
        const cos = Math.cos(r), sin = Math.sin(r);
        g.moveTo(cx + cos * hw - sin * hh, cy + sin * hw + cos * hh);
        g.lineTo(cx - cos * hw - sin * hh, cy - sin * hw + cos * hh);
        g.lineTo(cx - cos * hw + sin * hh, cy - sin * hw - cos * hh);
        g.lineTo(cx + cos * hw + sin * hh, cy + sin * hw - cos * hh);
        g.fill({ color: p.color, alpha });
      } else if (p.type === "confetti") {
        // Polygon confetti — rotating parallelogram
        const sz = p.size * (0.5 + Math.abs(Math.sin(p.rotation ?? 0)) * 0.5);
        const cr = p.rotation ?? 0;
        const cc = Math.cos(cr), cs = Math.sin(cr);
        const hw = sz * 0.5, hh = sz * 0.3;
        g.moveTo(p.x + cc * hw - cs * hh, p.y + cs * hw + cc * hh);
        g.lineTo(p.x - cc * hw - cs * hh, p.y - cs * hw + cc * hh);
        g.lineTo(p.x - cc * hw + cs * hh, p.y - cs * hw - cc * hh);
        g.lineTo(p.x + cc * hw + cs * hh, p.y + cs * hw - cc * hh);
        g.fill({ color: p.color, alpha });
      } else if (p.type === "dust") {
        // Polygon dust puff (hexagonal)
        const dr = p.size * alpha;
        g.moveTo(p.x + dr, p.y);
        for (let di = 1; di <= 6; di++) {
          const da = (di / 6) * Math.PI * 2;
          const jr = dr * (0.8 + seededRand(di + p.x) * 0.4); // jitter for organic shape
          g.lineTo(p.x + Math.cos(da) * jr, p.y + Math.sin(da) * jr);
        }
        g.fill({ color: p.color, alpha: alpha * 0.4 });
      } else {
        // Spark polygon (4-point star)
        const sr = p.size * alpha;
        const sr2 = sr * 0.4;
        g.moveTo(p.x, p.y - sr); g.lineTo(p.x + sr2, p.y - sr2);
        g.lineTo(p.x + sr, p.y); g.lineTo(p.x + sr2, p.y + sr2);
        g.lineTo(p.x, p.y + sr); g.lineTo(p.x - sr2, p.y + sr2);
        g.lineTo(p.x - sr, p.y); g.lineTo(p.x - sr2, p.y - sr2);
        g.fill({ color: p.color, alpha });
      }
    }

    // Floating texts
    for (const ft of s.floatingTexts) {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      const scale = 0.8 + (1 - alpha) * 0.4;
      const st = new TextStyle({ fontFamily: "monospace", fontSize: ft.fontSize * scale, fill: ft.color, fontWeight: "bold",
        dropShadow: { color: 0x000000, blur: 3, distance: 1, angle: Math.PI / 4 } });
      const t = this._addText(ft.text, st, ft.x, ft.y); t.alpha = alpha;
    }

    // Impact shock rings (expanding concentric circles from impact point)
    if (s.impactFlash > 0) {
      const ringCx = sw / 2, ringCy = sh * 0.52;
      const ringAge = 1 - s.impactFlash; // 0 at impact, grows to 1
      for (let ri = 0; ri < 3; ri++) {
        const ringR = (ringAge * 300 + ri * 40) * (1 + ri * 0.3);
        const ringAlpha = Math.max(0, 0.15 - ringAge * 0.15 - ri * 0.03);
        if (ringAlpha > 0) {
          g.circle(ringCx, ringCy, ringR); g.stroke({ color: 0xffffff, width: 2 - ri * 0.5, alpha: ringAlpha } as any);
        }
      }
    }

    // Impact flash overlay (starburst + vignette + chromatic shift)
    if (s.impactFlash > 0) {
      // Screen fill
      g.rect(0, 0, sw, sh);
      g.fill({ color: 0xffffff, alpha: s.impactFlash * 0.35 });
      // Radial starburst from impact point
      const fcx = sw / 2, fcy = sh * 0.52;
      for (let fi = 0; fi < 16; fi++) {
        const fa1 = (fi / 16) * Math.PI * 2;
        const fa2 = ((fi + 0.5) / 16) * Math.PI * 2;
        const fr = 80 + s.impactFlash * 200;
        g.moveTo(fcx, fcy);
        g.lineTo(fcx + Math.cos(fa1) * fr, fcy + Math.sin(fa1) * fr * 0.6);
        g.lineTo(fcx + Math.cos(fa2) * fr * 0.5, fcy + Math.sin(fa2) * fr * 0.3);
        g.fill({ color: 0xffffff, alpha: s.impactFlash * 0.2 });
      }
      // Chromatic aberration — offset red/blue tint at edges
      const abr = s.impactFlash * 0.12;
      g.rect(0, 0, sw * 0.08, sh); g.fill({ color: 0xff0000, alpha: abr });
      g.rect(sw * 0.92, 0, sw * 0.08, sh); g.fill({ color: 0x0044ff, alpha: abr });
      // Vignette — darkened corners
      const vig = s.impactFlash * 0.3;
      // Top-left
      g.moveTo(0, 0); g.lineTo(sw * 0.3, 0); g.lineTo(0, sh * 0.3); g.fill({ color: 0x000000, alpha: vig });
      // Top-right
      g.moveTo(sw, 0); g.lineTo(sw * 0.7, 0); g.lineTo(sw, sh * 0.3); g.fill({ color: 0x000000, alpha: vig });
      // Bottom-left
      g.moveTo(0, sh); g.lineTo(sw * 0.3, sh); g.lineTo(0, sh * 0.7); g.fill({ color: 0x000000, alpha: vig });
      // Bottom-right
      g.moveTo(sw, sh); g.lineTo(sw * 0.7, sh); g.lineTo(sw, sh * 0.7); g.fill({ color: 0x000000, alpha: vig });
    }

    // Phase transition flash (brief white sweep)
    if (s.phaseFlash > 0) {
      g.rect(0, 0, sw, sh); g.fill({ color: 0xffffff, alpha: s.phaseFlash * 0.3 });
    }

    // Permanent subtle vignette (always-on atmospheric darkening at edges)
    const vigA = 0.15;
    g.moveTo(0, 0); g.lineTo(sw * 0.15, 0); g.lineTo(0, sh * 0.15); g.fill({ color: 0x000000, alpha: vigA });
    g.moveTo(sw, 0); g.lineTo(sw * 0.85, 0); g.lineTo(sw, sh * 0.15); g.fill({ color: 0x000000, alpha: vigA });
    g.moveTo(0, sh); g.lineTo(sw * 0.15, sh); g.lineTo(0, sh * 0.85); g.fill({ color: 0x000000, alpha: vigA });
    g.moveTo(sw, sh); g.lineTo(sw * 0.85, sh); g.lineTo(sw, sh * 0.85); g.fill({ color: 0x000000, alpha: vigA });
  }

  private _addText(text: string, style: TextStyle, x: number, y: number, anchor = 0.5): Text {
    const t = new Text({ text, style }); t.anchor.set(anchor); t.x = x; t.y = y;
    this._container.addChild(t); this._texts.push(t); return t;
  }

  // ---- Arena Background ---------------------------------------------------

  private _renderArenaBackground(g: Graphics, sw: number, sh: number): void {
    const s = this._state;

    // === SKY (animated bands with stars and atmospheric shimmer) ===
    const theme = ARENA_THEMES[s.weather === "fog" ? "meadow" : s.arenaTheme]; // fog always uses meadow colors
    const skyColors = theme.sky;
    const skyH = sh * 0.42;
    const bandH = skyH / skyColors.length;
    for (let i = 0; i < skyColors.length; i++) {
      const by1 = i * bandH;
      const by2 = (i + 1) * bandH + 1;
      g.moveTo(0, by1); g.lineTo(sw, by1);
      for (let bx = sw; bx >= 0; bx -= 20) {
        const curve = Math.sin(bx * 0.005 + i * 0.5) * (i * 0.5 + 0.5);
        g.lineTo(bx, by2 + curve);
      }
      g.fill(skyColors[i]);
    }
    // Atmospheric shimmer (organic polygon shapes drifting across sky)
    for (let si = 0; si < 3; si++) {
      const sx2 = ((si * 400 + this._elapsed * 3) % (sw + 200)) - 100;
      const sy2 = si * (skyH * 0.3) + 10;
      const sAlpha = 0.015 + Math.sin(this._elapsed * 0.5 + si * 2) * 0.008;
      const sw2 = 120, sh2 = skyH * 0.18;
      g.moveTo(sx2 - sw2, sy2);
      g.quadraticCurveTo(sx2 - sw2 * 0.6, sy2 - sh2, sx2 - sw2 * 0.1, sy2 - sh2 * 0.7);
      g.quadraticCurveTo(sx2 + sw2 * 0.3, sy2 - sh2 * 1.1, sx2 + sw2 * 0.7, sy2 - sh2 * 0.5);
      g.quadraticCurveTo(sx2 + sw2, sy2, sx2 + sw2 * 0.7, sy2 + sh2 * 0.5);
      g.quadraticCurveTo(sx2 + sw2 * 0.2, sy2 + sh2 * 0.8, sx2 - sw2 * 0.3, sy2 + sh2 * 0.4);
      g.quadraticCurveTo(sx2 - sw2 * 0.8, sy2 + sh2 * 0.3, sx2 - sw2, sy2);
      g.fill({ color: 0x2244aa, alpha: sAlpha });
    }
    // Stars (twinkling in upper sky)
    for (let sti = 0; sti < 20; sti++) {
      const stx = seededRand(sti * 71) * sw;
      const sty = seededRand(sti * 43) * (skyH * 0.6);
      const twinkle = 0.1 + Math.sin(this._elapsed * 2 + sti * 1.7) * 0.08;
      const stSize = 0.5 + seededRand(sti * 29) * 1.2;
      // 4-point star polygon
      g.moveTo(stx, sty - stSize); g.lineTo(stx + stSize * 0.3, sty);
      g.lineTo(stx, sty + stSize); g.lineTo(stx - stSize * 0.3, sty);
      g.fill({ color: 0xeeeeff, alpha: twinkle });
    }
    // Upper sky aurora/nebula streaks (fills the empty upper area)
    for (let aui = 0; aui < 3; aui++) {
      const aux = seededRand(aui * 89) * sw * 0.8 + sw * 0.1;
      const auy = skyH * 0.1 + aui * (skyH * 0.15);
      const auW = 80 + seededRand(aui * 41) * 60;
      // Wispy nebula polygon
      g.moveTo(aux - auW, auy);
      g.quadraticCurveTo(aux - auW * 0.5, auy - 8 - seededRand(aui * 31) * 4, aux, auy - 5);
      g.quadraticCurveTo(aux + auW * 0.5, auy - 10, aux + auW, auy - 3);
      g.quadraticCurveTo(aux + auW * 0.7, auy + 4, aux + auW * 0.3, auy + 6);
      g.quadraticCurveTo(aux - auW * 0.2, auy + 5, aux - auW * 0.6, auy + 3);
      g.quadraticCurveTo(aux - auW * 0.9, auy + 2, aux - auW, auy);
      g.fill({ color: [0x223366, 0x332255, 0x224455][aui], alpha: 0.025 });
    }

    // Horizon glow (warm band at the bottom of sky)
    g.moveTo(0, skyH - 15);
    for (let hgx = 0; hgx <= sw; hgx += 20) {
      g.lineTo(hgx, skyH - 15 + Math.sin(hgx * 0.008 + this._elapsed * 0.2) * 3);
    }
    g.lineTo(sw, skyH + 5); g.lineTo(0, skyH + 5);
    g.fill({ color: 0x443322, alpha: 0.08 });

    // Sun with rays
    const sunX = sw * 0.82, sunY = sh * 0.1;
    // God rays
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + this._elapsed * 0.05;
      const rayLen = 60 + Math.sin(this._elapsed * 0.8 + i) * 15;
      const rayW = 0.08;
      g.moveTo(sunX, sunY);
      g.lineTo(sunX + Math.cos(angle - rayW) * rayLen, sunY + Math.sin(angle - rayW) * rayLen);
      g.lineTo(sunX + Math.cos(angle + rayW) * rayLen, sunY + Math.sin(angle + rayW) * rayLen);
      g.fill({ color: 0xffeeaa, alpha: 0.08 });
    }
    // Sun (polygon starburst)
    // Outer glow polygon (12-point soft star)
    for (let si = 0; si < 12; si++) {
      const a1 = (si / 12) * Math.PI * 2;
      const a2 = ((si + 1) / 12) * Math.PI * 2;
      const r1 = 26 + Math.sin(this._elapsed * 0.5 + si * 0.8) * 4;
      g.moveTo(sunX, sunY);
      g.lineTo(sunX + Math.cos(a1) * r1, sunY + Math.sin(a1) * r1);
      g.lineTo(sunX + Math.cos(a2) * r1, sunY + Math.sin(a2) * r1);
      g.fill({ color: 0xffeeaa, alpha: 0.12 });
    }
    // Mid sun (8-point polygon)
    g.moveTo(sunX + 18, sunY);
    for (let si = 1; si <= 16; si++) {
      const a = (si / 16) * Math.PI * 2;
      const r = si % 2 === 0 ? 18 : 14;
      g.lineTo(sunX + Math.cos(a) * r, sunY + Math.sin(a) * r);
    }
    g.fill({ color: 0xffdd66, alpha: 0.35 });
    // Core polygon (hexagonal)
    g.moveTo(sunX + 10, sunY);
    for (let si = 1; si <= 6; si++) {
      const a = (si / 6) * Math.PI * 2;
      g.lineTo(sunX + Math.cos(a) * 10, sunY + Math.sin(a) * 10);
    }
    g.fill(0xffee88);
    // Center bright spot
    g.moveTo(sunX + 5, sunY);
    for (let si = 1; si <= 6; si++) {
      const a = (si / 6) * Math.PI * 2;
      g.lineTo(sunX + Math.cos(a) * 5, sunY + Math.sin(a) * 5);
    }
    g.fill({ color: 0xffffff, alpha: 0.3 });

    // Clouds (two layers — distant + near, bumpy polygon cumulus)
    // Distant cloud layer (slower, smaller, dimmer)
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 350 + this._elapsed * 3) % (sw + 250)) - 125;
      const cy = sh * 0.04 + i * 15;
      const cw = 25 + seededRand(i * 91) * 20;
      const ch = 5 + seededRand(i * 73) * 3;
      g.moveTo(cx - cw, cy + ch * 0.3);
      g.quadraticCurveTo(cx - cw * 0.6, cy - ch, cx, cy - ch * 0.9);
      g.quadraticCurveTo(cx + cw * 0.6, cy - ch * 1.1, cx + cw, cy + ch * 0.3);
      g.quadraticCurveTo(cx, cy + ch * 0.5, cx - cw, cy + ch * 0.3);
      g.fill({ color: 0x667788, alpha: 0.06 });
    }
    // Near cloud layer (larger, more detailed, brighter)
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 280 + this._elapsed * 6) % (sw + 200)) - 100;
      const cy = sh * 0.06 + i * 20 + Math.sin(i * 2.7) * 8;
      const cw = 35 + seededRand(i * 17) * 30;
      const ch = 8 + seededRand(i * 31) * 5;
      // Shadow underneath cloud
      g.moveTo(cx - cw * 0.8, cy + ch * 0.6);
      g.quadraticCurveTo(cx, cy + ch * 0.9, cx + cw * 0.8, cy + ch * 0.6);
      g.quadraticCurveTo(cx, cy + ch * 0.4, cx - cw * 0.8, cy + ch * 0.6);
      g.fill({ color: 0x334455, alpha: 0.04 });
      // Main cloud body
      g.moveTo(cx - cw, cy + ch * 0.3);
      g.quadraticCurveTo(cx - cw * 0.8, cy - ch, cx - cw * 0.4, cy - ch * 0.8);
      g.quadraticCurveTo(cx - cw * 0.1, cy - ch * 1.4, cx + cw * 0.2, cy - ch);
      g.quadraticCurveTo(cx + cw * 0.5, cy - ch * 1.5, cx + cw * 0.7, cy - ch * 0.6);
      g.quadraticCurveTo(cx + cw, cy - ch * 0.3, cx + cw, cy + ch * 0.3);
      g.quadraticCurveTo(cx + cw * 0.5, cy + ch * 0.6, cx, cy + ch * 0.4);
      g.quadraticCurveTo(cx - cw * 0.5, cy + ch * 0.6, cx - cw, cy + ch * 0.3);
      g.fill({ color: 0x889aaa, alpha: 0.12 });
      // Highlight on top (sunlit edge)
      g.moveTo(cx - cw * 0.3, cy - ch * 0.6);
      g.quadraticCurveTo(cx, cy - ch * 1.3, cx + cw * 0.4, cy - ch * 0.7);
      g.quadraticCurveTo(cx + cw * 0.2, cy - ch * 0.4, cx - cw * 0.1, cy - ch * 0.5);
      g.quadraticCurveTo(cx - cw * 0.3, cy - ch * 0.4, cx - cw * 0.3, cy - ch * 0.6);
      g.fill({ color: 0xaabbcc, alpha: 0.08 });
      // Dark underside detail
      g.moveTo(cx - cw * 0.5, cy + ch * 0.2);
      g.quadraticCurveTo(cx, cy + ch * 0.45, cx + cw * 0.5, cy + ch * 0.2);
      g.quadraticCurveTo(cx, cy + ch * 0.1, cx - cw * 0.5, cy + ch * 0.2);
      g.fill({ color: 0x556677, alpha: 0.05 });
    }

    // Birds (polygon bodies with wing animation)
    for (let i = 0; i < 5; i++) {
      const bx = ((i * 320 + this._elapsed * 18 + i * 80) % (sw + 150)) - 75;
      const by = sh * 0.04 + i * 10 + Math.sin(this._elapsed * 0.8 + i * 3) * 5;
      const wing = Math.sin(this._elapsed * 6 + i * 2) * 5;
      // Body polygon
      g.moveTo(bx - 2, by); g.quadraticCurveTo(bx, by - 1.5, bx + 3, by);
      g.quadraticCurveTo(bx, by + 1, bx - 2, by); g.fill(0x1a2a3a);
      // Left wing polygon
      g.moveTo(bx - 1, by); g.quadraticCurveTo(bx - 5, by + wing * 0.8, bx - 8, by + wing);
      g.lineTo(bx - 6, by + wing * 0.5); g.fill(0x1a2a3a);
      // Right wing polygon
      g.moveTo(bx + 1, by); g.quadraticCurveTo(bx + 5, by + wing * 0.8, bx + 8, by + wing);
      g.lineTo(bx + 6, by + wing * 0.5); g.fill(0x1a2a3a);
    }

    // === SKY-TO-LANDSCAPE TRANSITION (gradient blending) ===
    // Atmospheric haze band between sky and landscape
    for (let hz = 0; hz < 4; hz++) {
      const hzy = skyH - 8 + hz * 6;
      const hza = 0.04 - hz * 0.008;
      g.moveTo(0, hzy);
      for (let hzx = 0; hzx <= sw; hzx += 30) {
        g.lineTo(hzx, hzy + Math.sin(hzx * 0.01 + hz * 2 + this._elapsed * 0.1) * 3);
      }
      g.lineTo(sw, hzy + 10); g.lineTo(0, hzy + 10);
      g.fill({ color: 0x2a3a4a, alpha: hza });
    }

    // === DISTANT LANDSCAPE ===

    // Distant mountain range (behind castle)
    g.moveTo(0, sh * 0.32);
    for (let mx = 0; mx <= sw; mx += 8) {
      const mh = 25 + Math.sin(mx * 0.005 + 0.5) * 15 + Math.sin(mx * 0.012 + 2) * 8 + Math.sin(mx * 0.03) * 4;
      g.lineTo(mx, sh * 0.32 - mh);
    }
    g.lineTo(sw, sh * 0.32); g.lineTo(0, sh * 0.32);
    g.fill(0x0e1e2e);
    // Mountain snow caps
    for (let mx = 0; mx <= sw; mx += 8) {
      const mh = 25 + Math.sin(mx * 0.005 + 0.5) * 15 + Math.sin(mx * 0.012 + 2) * 8 + Math.sin(mx * 0.03) * 4;
      if (mh > 35) {
        g.moveTo(mx - 4, sh * 0.32 - mh + 3);
        g.lineTo(mx, sh * 0.32 - mh);
        g.lineTo(mx + 4, sh * 0.32 - mh + 3);
        g.fill({ color: 0xccddee, alpha: 0.15 });
      }
    }
    // Mountain ridge highlights (snow/light on distant peaks)
    g.moveTo(0, sh * 0.32);
    for (let mx = 0; mx <= sw; mx += 8) {
      const mh = 25 + Math.sin(mx * 0.005 + 0.5) * 15 + Math.sin(mx * 0.012 + 2) * 8 + Math.sin(mx * 0.03) * 4;
      if (mh > 30) {
        // Lit side highlight
        g.moveTo(mx - 2, sh * 0.32 - mh + 5);
        g.lineTo(mx, sh * 0.32 - mh);
        g.lineTo(mx + 1, sh * 0.32 - mh + 4);
        g.fill({ color: 0x3a4a5a, alpha: 0.2 });
      }
    }
    // Second mountain layer (nearer, darker, with forest texture)
    g.moveTo(0, sh * 0.33);
    for (let mx = 0; mx <= sw; mx += 6) {
      const mh = 15 + Math.sin(mx * 0.008 + 3) * 10 + Math.sin(mx * 0.02 + 1) * 5;
      g.lineTo(mx, sh * 0.33 - mh);
    }
    g.lineTo(sw, sh * 0.33); g.lineTo(0, sh * 0.33);
    g.fill(0x142434);
    // Forest texture on second range (small tree-top bumps)
    for (let mx = 10; mx < sw; mx += 12) {
      const mh = 15 + Math.sin(mx * 0.008 + 3) * 10 + Math.sin(mx * 0.02 + 1) * 5;
      const trH = 3 + seededRand(mx * 7) * 3;
      g.moveTo(mx - 2, sh * 0.33 - mh);
      g.quadraticCurveTo(mx, sh * 0.33 - mh - trH, mx + 2, sh * 0.33 - mh);
      g.fill({ color: 0x1a3828, alpha: 0.5 });
    }

    // Mountain-to-castle haze (depth layering)
    g.moveTo(0, sh * 0.30); g.lineTo(sw, sh * 0.30);
    g.lineTo(sw, sh * 0.35); g.lineTo(0, sh * 0.35);
    g.fill({ color: 0x1a2a3a, alpha: 0.06 });

    // Castle towers (polygon detail)
    const castleX = sw * 0.5;
    const castleBase = sh * 0.30;
    // Main keep (polygon with buttresses)
    g.moveTo(castleX - 20, castleBase);
    g.lineTo(castleX - 22, castleBase - 48);
    g.lineTo(castleX - 18, castleBase - 50);
    g.lineTo(castleX + 18, castleBase - 50);
    g.lineTo(castleX + 22, castleBase - 48);
    g.lineTo(castleX + 20, castleBase);
    g.fill(0x1a2a38);
    // Keep stone lines
    for (let sy2 = 0; sy2 < 5; sy2++) {
      const sly = castleBase - 10 - sy2 * 9;
      g.moveTo(castleX - 19, sly); g.lineTo(castleX + 19, sly);
      g.stroke({ color: 0x142230, width: 0.5 });
    }
    // Crenellations (polygon merlons)
    for (let i = 0; i < 5; i++) {
      const mx2 = castleX - 18 + i * 8;
      g.moveTo(mx2, castleBase - 50);
      g.lineTo(mx2, castleBase - 58);
      g.lineTo(mx2 + 2, castleBase - 60);
      g.lineTo(mx2 + 4, castleBase - 58);
      g.lineTo(mx2 + 4, castleBase - 50);
      g.fill(0x1a2a38);
    }
    // Left tower (polygon with conical roof)
    g.moveTo(castleX - 52, castleBase);
    g.lineTo(castleX - 52, castleBase - 42);
    g.lineTo(castleX - 28, castleBase - 42);
    g.lineTo(castleX - 28, castleBase);
    g.fill(0x162636);
    // Tower crenellations (polygon merlons with beveled caps)
    for (let i = 0; i < 3; i++) {
      const mcx = castleX - 52 + i * 8;
      g.moveTo(mcx, castleBase - 42);
      g.lineTo(mcx, castleBase - 47);
      g.lineTo(mcx + 0.5, castleBase - 48);
      g.lineTo(mcx + 2, castleBase - 48.5);
      g.lineTo(mcx + 3.5, castleBase - 48);
      g.lineTo(mcx + 4, castleBase - 47);
      g.lineTo(mcx + 4, castleBase - 42);
      g.fill(0x162636);
      // Stone line
      g.moveTo(mcx + 0.5, castleBase - 45); g.lineTo(mcx + 3.5, castleBase - 45);
      g.stroke({ color: 0x0e1e2e, width: 0.4 });
    }
    // Conical roof polygon
    g.moveTo(castleX - 54, castleBase - 42);
    g.lineTo(castleX - 40, castleBase - 62);
    g.lineTo(castleX - 26, castleBase - 42);
    g.fill(0x1a3040);
    // Roof pennant
    g.moveTo(castleX - 40, castleBase - 62);
    g.lineTo(castleX - 40, castleBase - 68);
    g.stroke({ color: 0x664422, width: 1 });
    g.moveTo(castleX - 40, castleBase - 68);
    g.lineTo(castleX - 32, castleBase - 65);
    g.lineTo(castleX - 40, castleBase - 63);
    g.fill(0xcc2222);
    // Right tower (mirrored)
    g.moveTo(castleX + 28, castleBase);
    g.lineTo(castleX + 28, castleBase - 42);
    g.lineTo(castleX + 52, castleBase - 42);
    g.lineTo(castleX + 52, castleBase);
    g.fill(0x162636);
    for (let i = 0; i < 3; i++) {
      const mcx = castleX + 28 + i * 8;
      g.moveTo(mcx, castleBase - 42); g.lineTo(mcx, castleBase - 47);
      g.lineTo(mcx + 0.5, castleBase - 48); g.lineTo(mcx + 2, castleBase - 48.5);
      g.lineTo(mcx + 3.5, castleBase - 48); g.lineTo(mcx + 4, castleBase - 47);
      g.lineTo(mcx + 4, castleBase - 42); g.fill(0x162636);
      g.moveTo(mcx + 0.5, castleBase - 45); g.lineTo(mcx + 3.5, castleBase - 45);
      g.stroke({ color: 0x0e1e2e, width: 0.4 });
    }
    g.moveTo(castleX + 26, castleBase - 42);
    g.lineTo(castleX + 40, castleBase - 62);
    g.lineTo(castleX + 54, castleBase - 42);
    g.fill(0x1a3040);
    g.moveTo(castleX + 40, castleBase - 62);
    g.lineTo(castleX + 40, castleBase - 68);
    g.stroke({ color: 0x664422, width: 1 });
    g.moveTo(castleX + 40, castleBase - 68);
    g.lineTo(castleX + 48, castleBase - 65);
    g.lineTo(castleX + 40, castleBase - 63);
    g.fill(0x2244cc);
    // Curtain wall between towers (lower connecting wall)
    g.moveTo(castleX - 28, castleBase); g.lineTo(castleX - 28, castleBase - 25);
    g.lineTo(castleX - 20, castleBase - 25); g.fill(0x152535);
    g.moveTo(castleX + 20, castleBase - 25); g.lineTo(castleX + 28, castleBase - 25);
    g.lineTo(castleX + 28, castleBase); g.fill(0x152535);
    // Wall crenellations on curtain
    for (let wc = 0; wc < 3; wc++) {
      g.moveTo(castleX - 27 + wc * 4, castleBase - 25);
      g.lineTo(castleX - 27 + wc * 4, castleBase - 29);
      g.lineTo(castleX - 25 + wc * 4, castleBase - 29);
      g.lineTo(castleX - 25 + wc * 4, castleBase - 25);
      g.fill(0x152535);
    }
    for (let wc = 0; wc < 3; wc++) {
      g.moveTo(castleX + 21 + wc * 4, castleBase - 25);
      g.lineTo(castleX + 21 + wc * 4, castleBase - 29);
      g.lineTo(castleX + 23 + wc * 4, castleBase - 29);
      g.lineTo(castleX + 23 + wc * 4, castleBase - 25);
      g.fill(0x152535);
    }
    // Gate arch polygon (larger, more ornate)
    g.moveTo(castleX - 8, castleBase);
    g.lineTo(castleX - 8, castleBase - 16);
    g.quadraticCurveTo(castleX - 6, castleBase - 24, castleX, castleBase - 26);
    g.quadraticCurveTo(castleX + 6, castleBase - 24, castleX + 8, castleBase - 16);
    g.lineTo(castleX + 8, castleBase);
    g.fill(0x0a1520);
    // Gate portcullis lines
    for (let pl = -5; pl <= 5; pl += 3) {
      g.moveTo(castleX + pl, castleBase); g.lineTo(castleX + pl, castleBase - 14);
      g.stroke({ color: 0x1a2530, width: 0.5 });
    }
    // Castle windows (arched polygon with glow)
    for (const wx2 of [-14, -5, 5, 12]) {
      const wby = castleBase - 30 - Math.abs(wx2) * 0.3;
      g.moveTo(castleX + wx2, wby + 6);
      g.lineTo(castleX + wx2, wby);
      g.quadraticCurveTo(castleX + wx2 + 2, wby - 3, castleX + wx2 + 4, wby);
      g.lineTo(castleX + wx2 + 4, wby + 6);
      g.fill({ color: 0xffdd88, alpha: 0.35 });
      // Window glow rays (polygon light spilling out)
      const wgx = castleX + wx2 + 2, wgy = wby + 2;
      for (let wr = 0; wr < 4; wr++) {
        const wa = wr * (Math.PI / 2) + Math.PI * 0.25;
        const wrl = 5 + wr * 1.5;
        g.moveTo(wgx, wgy);
        g.lineTo(wgx + Math.cos(wa - 0.15) * wrl, wgy + Math.sin(wa - 0.15) * wrl);
        g.lineTo(wgx + Math.cos(wa + 0.15) * wrl, wgy + Math.sin(wa + 0.15) * wrl);
        g.fill({ color: 0xffdd88, alpha: 0.03 });
      }
    }
    // Tower windows
    for (const twx of [-42, -38, 34, 38]) {
      g.moveTo(castleX + twx, castleBase - 28);
      g.lineTo(castleX + twx, castleBase - 33);
      g.lineTo(castleX + twx + 3, castleBase - 33);
      g.lineTo(castleX + twx + 3, castleBase - 28);
      g.fill({ color: 0xffdd88, alpha: 0.25 });
    }

    // Treeline behind stands (polygon leaf clusters)
    for (let i = 0; i < 40; i++) {
      const tx = seededRand(i * 13) * sw;
      const treeH = 20 + seededRand(i * 7) * 25;
      const tw = 8 + seededRand(i * 19) * 10;
      const tbase = sh * 0.34;
      const green = 0x1a3318 + ((Math.floor(seededRand(i * 23) * 3)) << 8);
      // Trunk polygon (tapered)
      g.moveTo(tx - 2, tbase);
      g.lineTo(tx - 1, tbase - treeH * 0.45);
      g.lineTo(tx + 1, tbase - treeH * 0.45);
      g.lineTo(tx + 2, tbase);
      g.fill(0x2a1a0a);
      // Canopy polygon (bumpy multi-lobe shape)
      const cpy = tbase - treeH * 0.5;
      const rw = tw * 0.5; const rh = treeH * 0.35;
      g.moveTo(tx - rw, cpy + rh * 0.3);
      g.quadraticCurveTo(tx - rw * 1.1, cpy - rh * 0.3, tx - rw * 0.5, cpy - rh * 0.8);
      g.quadraticCurveTo(tx - rw * 0.1, cpy - rh * 1.2, tx + rw * 0.3, cpy - rh * 0.9);
      g.quadraticCurveTo(tx + rw * 0.8, cpy - rh * 1.1, tx + rw, cpy - rh * 0.4);
      g.quadraticCurveTo(tx + rw * 1.1, cpy + rh * 0.2, tx + rw * 0.5, cpy + rh * 0.5);
      g.quadraticCurveTo(tx, cpy + rh * 0.7, tx - rw * 0.5, cpy + rh * 0.5);
      g.quadraticCurveTo(tx - rw * 0.9, cpy + rh * 0.5, tx - rw, cpy + rh * 0.3);
      g.fill(green);
      // Highlight lobe
      g.moveTo(tx - rw * 0.3, cpy - rh * 0.6);
      g.quadraticCurveTo(tx, cpy - rh * 1.0, tx + rw * 0.4, cpy - rh * 0.7);
      g.quadraticCurveTo(tx + rw * 0.1, cpy - rh * 0.4, tx - rw * 0.3, cpy - rh * 0.6);
      g.fill(green + 0x060606);
    }

    // Distant hills (continuous polygon terrain silhouette)
    g.moveTo(0, sh * 0.34);
    for (let hx = 0; hx <= sw; hx += 6) {
      const h1 = 12 + Math.sin(hx * 0.008 + 1) * 8 + Math.sin(hx * 0.022) * 5 + Math.sin(hx * 0.04) * 3;
      g.lineTo(hx, sh * 0.34 - h1);
    }
    g.lineTo(sw, sh * 0.34);
    g.lineTo(0, sh * 0.34);
    g.fill(0x1a3318);
    // Second hill layer (foreground, slightly lighter)
    g.moveTo(0, sh * 0.34);
    for (let hx = 0; hx <= sw; hx += 8) {
      const h2 = 6 + Math.sin(hx * 0.012 + 2.5) * 5 + Math.sin(hx * 0.03 + 1) * 3;
      g.lineTo(hx, sh * 0.34 - h2);
    }
    g.lineTo(sw, sh * 0.34);
    g.lineTo(0, sh * 0.34);
    g.fill(0x1e3a1c);

    // === STANDS (tiered grandstands with plank detail) ===
    // Upper tier (polygon with beveled front edge)
    g.moveTo(0, sh * 0.32); g.lineTo(sw, sh * 0.32);
    g.lineTo(sw, sh * 0.36); g.lineTo(0, sh * 0.36); g.fill(theme.standColor);
    // Beveled top edge highlight
    g.moveTo(0, sh * 0.32); g.lineTo(sw, sh * 0.32);
    g.lineTo(sw, sh * 0.322); g.lineTo(0, sh * 0.322); g.fill({ color: 0x5a3a1a, alpha: 0.5 });
    // Upper tier plank lines
    for (let plk = 0; plk < 3; plk++) {
      g.moveTo(0, sh * 0.32 + plk * (sh * 0.013));
      g.lineTo(sw, sh * 0.32 + plk * (sh * 0.013));
      g.stroke({ color: 0x2a1808, width: 0.5 });
    }
    // Lower tier (polygon with beveled front)
    g.moveTo(0, sh * 0.36); g.lineTo(sw, sh * 0.36);
    g.lineTo(sw, sh * 0.42); g.lineTo(0, sh * 0.42); g.fill(0x4a3322);
    g.moveTo(0, sh * 0.36); g.lineTo(sw, sh * 0.36);
    g.lineTo(sw, sh * 0.362); g.lineTo(0, sh * 0.362); g.fill({ color: 0x6a4a2a, alpha: 0.4 });
    // Lower tier plank lines
    for (let plk = 0; plk < 4; plk++) {
      g.moveTo(0, sh * 0.36 + plk * (sh * 0.015));
      g.lineTo(sw, sh * 0.36 + plk * (sh * 0.015));
      g.stroke({ color: 0x3a2211, width: 0.5 });
    }
    // Support posts (polygon)
    for (let px2 = 0; px2 < sw; px2 += 80) {
      g.moveTo(px2 + 2, sh * 0.36);
      g.lineTo(px2, sh * 0.44);
      g.lineTo(px2 + 5, sh * 0.44);
      g.lineTo(px2 + 4, sh * 0.36);
      g.fill(0x3a1a08);
    }
    // Stand front face (polygon with beveled top edge)
    g.moveTo(0, sh * 0.42);
    g.lineTo(sw, sh * 0.42);
    g.lineTo(sw, sh * 0.44);
    g.lineTo(0, sh * 0.44);
    g.fill(0x553322);
    // Front face plank seams
    for (let px2 = 30; px2 < sw; px2 += 45) {
      g.moveTo(px2, sh * 0.42); g.lineTo(px2 + 1, sh * 0.44);
      g.stroke({ color: 0x442211, width: 0.5 });
    }
    // Decorative cloth drape (animated flutter with wind)
    for (let x = 0; x < sw; x += 60) {
      const drapeColor = x < sw / 2 ? PLAYER_COLOR : (getOpponent(s)?.color ?? 0xcc4444);
      const dTop = sh * 0.42;
      const dBot = sh * 0.435;
      // Wind flutter on the cloth sag
      const wind = Math.sin(this._elapsed * 2.5 + x * 0.05) * 2;
      const wind2 = Math.sin(this._elapsed * 3.8 + x * 0.03) * 1.5;
      // Cloth body polygon with animated sag
      g.moveTo(x, dTop);
      g.lineTo(x + 50, dTop);
      g.quadraticCurveTo(x + 48, dBot - 2 + wind, x + 45, dBot + wind2);
      // Scalloped bottom polygon with flutter
      for (let sc = 4; sc >= 0; sc--) {
        const scx = x + sc * 10;
        const scFlutter = Math.sin(this._elapsed * 3 + sc * 1.2 + x * 0.02) * 1.5;
        g.quadraticCurveTo(scx + 5, dBot + sh * 0.006 + scFlutter, scx, dBot + wind2 * 0.5);
      }
      g.quadraticCurveTo(x + 2, dBot - 2 + wind, x, dTop);
      g.fill({ color: drapeColor, alpha: 0.5 });
      // Cloth fold highlight (animated sweep)
      const foldX = x + 10 + Math.sin(this._elapsed * 1.5 + x * 0.04) * 8;
      g.moveTo(foldX, dTop + 1);
      g.quadraticCurveTo(foldX + 15, dTop + 3 + wind * 0.3, foldX + 30, dTop + 1);
      g.stroke({ color: 0xffffff, width: 0.5, alpha: 0.12 } as any);
    }

    // Royal box (center of upper tier — polygon detail)
    const rbx = sw * 0.45, rby = sh * 0.30;
    const rbw = sw * 0.1;
    // Canopy polygon (draped cloth shape)
    g.moveTo(rbx - 3, rby);
    g.quadraticCurveTo(rbx + rbw * 0.25, rby - sh * 0.008, rbx + rbw * 0.5, rby + sh * 0.005);
    g.quadraticCurveTo(rbx + rbw * 0.75, rby - sh * 0.008, rbx + rbw + 3, rby);
    g.lineTo(rbx + rbw + 3, rby + sh * 0.02);
    g.lineTo(rbx - 3, rby + sh * 0.02);
    g.fill(0x882222);
    // Canopy gold trim polygon (scalloped)
    g.moveTo(rbx - 3, rby + sh * 0.02);
    for (let sc = 0; sc <= 6; sc++) {
      const scx = rbx + (sc / 6) * rbw;
      const scy = rby + sh * 0.02 + (sc % 2 === 0 ? 0 : sh * 0.006);
      g.lineTo(scx, scy);
    }
    g.lineTo(rbx + rbw + 3, rby + sh * 0.02);
    g.stroke({ color: 0xffd700, width: 1.5 });
    // Gold valance fill
    g.moveTo(rbx, rby + sh * 0.02);
    g.lineTo(rbx + rbw, rby + sh * 0.02);
    g.lineTo(rbx + rbw, rby + sh * 0.028);
    g.lineTo(rbx, rby + sh * 0.028);
    g.fill(0xffd700);
    // Canopy posts (polygon columns with capitals)
    for (const postX of [rbx, rbx + rbw - 3]) {
      // Column shaft
      g.moveTo(postX, rby);
      g.lineTo(postX + 3, rby);
      g.lineTo(postX + 2.5, rby + sh * 0.06);
      g.lineTo(postX + 0.5, rby + sh * 0.06);
      g.fill(0xddaa44);
      // Capital polygon (top ornament)
      g.moveTo(postX - 2, rby);
      g.lineTo(postX + 5, rby);
      g.lineTo(postX + 4, rby + 3);
      g.lineTo(postX - 1, rby + 3);
      g.fill(0xffd700);
      // Base polygon
      g.moveTo(postX - 1, rby + sh * 0.055);
      g.lineTo(postX + 4, rby + sh * 0.055);
      g.lineTo(postX + 5, rby + sh * 0.065);
      g.lineTo(postX - 2, rby + sh * 0.065);
      g.fill(0xffd700);
    }
    // King figure (polygon body)
    const kingX = rbx + rbw * 0.5, kingY = rby + sh * 0.04;
    // Head polygon
    g.moveTo(kingX - 3, kingY - 3);
    g.quadraticCurveTo(kingX - 4, kingY - 8, kingX, kingY - 9);
    g.quadraticCurveTo(kingX + 4, kingY - 8, kingX + 3, kingY - 3);
    g.fill(0xddbb88);
    // Body (robed polygon)
    g.moveTo(kingX - 5, kingY - 2);
    g.lineTo(kingX + 5, kingY - 2);
    g.lineTo(kingX + 6, kingY + 10);
    g.lineTo(kingX - 6, kingY + 10);
    g.fill(0x882222);
    // Robe trim
    g.moveTo(kingX - 5, kingY - 2);
    g.lineTo(kingX, kingY + 8);
    g.lineTo(kingX + 5, kingY - 2);
    g.stroke({ color: 0xffd700, width: 0.5 });
    // Crown polygon (ornate)
    g.moveTo(kingX - 4, kingY - 9);
    g.lineTo(kingX - 5, kingY - 12);
    g.lineTo(kingX - 4, kingY - 14);
    g.lineTo(kingX - 2, kingY - 12);
    g.lineTo(kingX, kingY - 15);
    g.lineTo(kingX + 2, kingY - 12);
    g.lineTo(kingX + 4, kingY - 14);
    g.lineTo(kingX + 5, kingY - 12);
    g.lineTo(kingX + 4, kingY - 9);
    g.fill(0xffd700);
    // Crown jewel (diamond polygon)
    g.moveTo(kingX, kingY - 14); g.lineTo(kingX + 1, kingY - 13); g.lineTo(kingX, kingY - 12); g.lineTo(kingX - 1, kingY - 13); g.fill(0xff2222);
    // Scepter
    g.moveTo(kingX + 4, kingY - 1);
    g.lineTo(kingX + 8, kingY - 8);
    g.stroke({ color: 0xffd700, width: 1 });
    // Scepter orb (polygon star)
    g.moveTo(kingX + 8, kingY - 11); g.lineTo(kingX + 9, kingY - 9.5); g.lineTo(kingX + 10, kingY - 9);
    g.lineTo(kingX + 9, kingY - 8); g.lineTo(kingX + 8, kingY - 7); g.lineTo(kingX + 7, kingY - 8);
    g.lineTo(kingX + 6, kingY - 9); g.lineTo(kingX + 7, kingY - 9.5); g.fill(0xffd700);
    // Attendant figure (left)
    g.moveTo(kingX - 12, kingY - 1);
    g.quadraticCurveTo(kingX - 13, kingY - 6, kingX - 11, kingY - 7);
    g.quadraticCurveTo(kingX - 9, kingY - 6, kingX - 10, kingY - 1);
    g.fill(0xddbb88);
    g.moveTo(kingX - 13, kingY);
    g.lineTo(kingX - 9, kingY);
    g.lineTo(kingX - 9, kingY + 8);
    g.lineTo(kingX - 13, kingY + 8);
    g.fill(0x224488);

    // === ANIMATED CROWD ===
    const crowdRows = 3;
    const crowdPerRow = 55; // denser crowd
    for (let row = 0; row < crowdRows; row++) {
      for (let i = 0; i < crowdPerRow; i++) {
        const cx = (i / crowdPerRow) * sw + 8;
        const baseY = sh * 0.33 + row * (sh * 0.03);
        // Skip where royal box is
        if (row === 0 && cx > rbx - 5 && cx < rbx + sw * 0.1 + 5) continue;
        const waveOff = Math.sin(s.crowdWavePhase + i * 0.35 + row * 0.8) * 0.5 + 0.5;
        const exc = s.crowdExcitement;
        const standH = waveOff * exc * 5;
        const cy = baseY - standH;
        const colors = [0x882222, 0x228844, 0x224488, 0x884422, 0x664488, 0x886622, 0x448844, 0x884466, 0x446688];
        const bodyColor = colors[(i * 7 + row * 3) % colors.length];
        const headSize = 2.5 + seededRand(i * 11 + row) * 1.5;
        // Head polygon (slightly oval)
        g.moveTo(cx - headSize, cy - 5);
        g.quadraticCurveTo(cx - headSize, cy - 5 - headSize, cx, cy - 5 - headSize * 1.1);
        g.quadraticCurveTo(cx + headSize, cy - 5 - headSize, cx + headSize, cy - 5);
        g.quadraticCurveTo(cx + headSize * 0.8, cy - 4, cx, cy - 3.5);
        g.quadraticCurveTo(cx - headSize * 0.8, cy - 4, cx - headSize, cy - 5);
        g.fill(0xddbb88);
        // Body polygon (tapered torso)
        g.moveTo(cx - 2.5, cy - 2);
        g.lineTo(cx + 2.5, cy - 2);
        g.lineTo(cx + 3, cy + 4);
        g.lineTo(cx + 2, cy + 8);
        g.lineTo(cx - 2, cy + 8);
        g.lineTo(cx - 3, cy + 4);
        g.fill(bodyColor);
        // Shoulders
        g.moveTo(cx - 3.5, cy - 1);
        g.quadraticCurveTo(cx, cy - 2.5, cx + 3.5, cy - 1);
        g.lineTo(cx + 2.5, cy);
        g.quadraticCurveTo(cx, cy - 1, cx - 2.5, cy);
        g.fill(bodyColor);
        if (exc > 0.3 && waveOff > 0.5) {
          // Raised arms (polygon)
          g.moveTo(cx - 3, cy - 1); g.lineTo(cx - 5, cy - 5);
          g.lineTo(cx - 6, cy - 8); g.lineTo(cx - 4, cy - 7);
          g.lineTo(cx - 2, cy - 1); g.fill(0xddbb88);
          g.moveTo(cx + 3, cy - 1); g.lineTo(cx + 5, cy - 5);
          g.lineTo(cx + 6, cy - 8); g.lineTo(cx + 4, cy - 7);
          g.lineTo(cx + 2, cy - 1); g.fill(0xddbb88);
        }
        // Some hold small pennant flags (polygon triangle)
        if ((i * 3 + row) % 7 === 0) {
          const flagColor = cx < sw / 2 ? PLAYER_COLOR : (getOpponent(s)?.color ?? 0xcc4444);
          g.moveTo(cx + 3, cy - 7); g.lineTo(cx + 3, cy - 16); g.stroke({ color: 0x664422, width: 1 });
          // Triangle pennant polygon
          g.moveTo(cx + 3, cy - 16);
          g.lineTo(cx + 10, cy - 14);
          g.lineTo(cx + 3, cy - 12);
          g.fill(flagColor);
        }
      }
    }

    // === STAND-TO-GROUND TRANSITION (blend strip) ===
    g.moveTo(0, sh * 0.44); g.lineTo(sw, sh * 0.44);
    g.lineTo(sw, sh * 0.46); g.lineTo(0, sh * 0.46);
    g.fill({ color: 0x2a3a1a, alpha: 0.4 }); // dark green-brown blend
    // Scattered shadow below stands
    for (let shdi = 0; shdi < 10; shdi++) {
      const shdx = seededRand(shdi * 67) * sw;
      g.moveTo(shdx - 15, sh * 0.44);
      g.quadraticCurveTo(shdx, sh * 0.46, shdx + 15, sh * 0.44);
      g.quadraticCurveTo(shdx, sh * 0.45, shdx - 15, sh * 0.44);
      g.fill({ color: 0x1a2a10, alpha: 0.1 });
    }

    // === GROUND (polygon with slight terrain undulation) ===
    g.moveTo(0, sh * 0.44);
    for (let gx2 = 0; gx2 <= sw; gx2 += 12) {
      const gy2 = sh * 0.44 + Math.sin(gx2 * 0.015) * 1.5 + Math.sin(gx2 * 0.04) * 0.8;
      g.lineTo(gx2, gy2);
    }
    g.lineTo(sw, sh); g.lineTo(0, sh);
    g.fill(theme.ground);
    // Ground color patches (darker/lighter polygon patches for terrain variation)
    for (let pi2 = 0; pi2 < 8; pi2++) {
      const px2 = seededRand(pi2 * 67) * sw;
      const py2 = sh * 0.7 + seededRand(pi2 * 43) * (sh * 0.25);
      const pr = 15 + seededRand(pi2 * 29) * 20;
      g.moveTo(px2 - pr, py2);
      g.quadraticCurveTo(px2 - pr * 0.5, py2 - pr * 0.3, px2, py2 - pr * 0.2);
      g.quadraticCurveTo(px2 + pr * 0.5, py2 - pr * 0.3, px2 + pr, py2);
      g.quadraticCurveTo(px2 + pr * 0.5, py2 + pr * 0.3, px2, py2 + pr * 0.2);
      g.quadraticCurveTo(px2 - pr * 0.5, py2 + pr * 0.3, px2 - pr, py2);
      g.fill({ color: pi2 % 2 === 0 ? 0x264218 : 0x2e5220, alpha: 0.3 });
    }

    // Track wear marks (darkened trampled areas near the jousting lane)
    for (let tw = 0; tw < 6; tw++) {
      const twx = sw * 0.15 + tw * (sw * 0.12);
      const twy = sh * 0.54;
      g.moveTo(twx - 15, twy); g.quadraticCurveTo(twx, twy + 3, twx + 15, twy);
      g.quadraticCurveTo(twx, twy - 2, twx - 15, twy);
      g.fill({ color: 0x1a3010, alpha: 0.2 });
    }
    // Scattered rocks and pebbles
    for (let ri = 0; ri < 12; ri++) {
      const rrx = seededRand(ri * 89) * sw;
      const rry = sh * 0.68 + seededRand(ri * 53) * (sh * 0.28);
      const rrSize = 1.5 + seededRand(ri * 67) * 2.5;
      // Rock polygon (irregular pentagon)
      g.moveTo(rrx - rrSize, rry);
      g.lineTo(rrx - rrSize * 0.5, rry - rrSize * 0.8);
      g.lineTo(rrx + rrSize * 0.6, rry - rrSize * 0.5);
      g.lineTo(rrx + rrSize, rry + rrSize * 0.3);
      g.lineTo(rrx - rrSize * 0.3, rry + rrSize * 0.6);
      g.fill({ color: 0x556655, alpha: 0.3 });
      // Rock highlight
      g.moveTo(rrx - rrSize * 0.3, rry - rrSize * 0.5);
      g.lineTo(rrx + rrSize * 0.3, rry - rrSize * 0.3);
      g.stroke({ color: 0x778877, width: 0.5, alpha: 0.2 } as any);
    }

    // Clover/low vegetation patches (fills ground sparsity)
    for (let ci = 0; ci < 15; ci++) {
      const clx = seededRand(ci * 79) * sw;
      const cly = sh * 0.68 + seededRand(ci * 51) * (sh * 0.28);
      const clr = 5 + seededRand(ci * 33) * 6;
      // Cluster of small leaf polygons
      for (let lf = 0; lf < 4; lf++) {
        const la = (lf / 4) * Math.PI * 2 + seededRand(ci * 19 + lf) * 0.5;
        const lx2 = clx + Math.cos(la) * clr * 0.6;
        const ly2 = cly + Math.sin(la) * clr * 0.3;
        g.moveTo(lx2, ly2);
        g.quadraticCurveTo(lx2 + Math.cos(la) * 3, ly2 + Math.sin(la) * 1.5 - 2, lx2 + Math.cos(la) * 5, ly2 + Math.sin(la) * 2.5);
        g.quadraticCurveTo(lx2 + Math.cos(la) * 3, ly2 + Math.sin(la) * 1.5 + 1, lx2, ly2);
        g.fill({ color: 0x2a5a1a + ((Math.floor(seededRand(ci * 61 + lf) * 2)) << 8), alpha: 0.3 });
      }
    }

    // Grass tufts (polygon blades)
    for (let i = 0; i < 60; i++) {
      const gx = seededRand(i * 37) * sw;
      const gy = sh * 0.68 + seededRand(i * 23) * (sh * 0.28);
      const gh = 4 + seededRand(i * 53) * 6;
      const lean = Math.sin(this._elapsed * 1.5 + i) * 1.5;
      const grassGreen = 0x3a6a2a + ((Math.floor(seededRand(i * 41) * 3)) << 8);
      // Main blade polygon (tapered leaf shape)
      g.moveTo(gx - 1, gy);
      g.quadraticCurveTo(gx - 0.5 + lean * 0.5, gy - gh * 0.6, gx + lean, gy - gh);
      g.quadraticCurveTo(gx + 0.5 + lean * 0.5, gy - gh * 0.6, gx + 1, gy);
      g.fill(grassGreen);
      // Secondary blade (shorter, offset)
      g.moveTo(gx + 2, gy);
      g.quadraticCurveTo(gx + 2.5 + lean * 0.4, gy - gh * 0.4, gx + 2 + lean * 0.8, gy - gh * 0.7);
      g.quadraticCurveTo(gx + 3 + lean * 0.4, gy - gh * 0.4, gx + 3, gy);
      g.fill(grassGreen + 0x080808);
      // Third blade (opposite lean)
      g.moveTo(gx - 1.5, gy);
      g.quadraticCurveTo(gx - 2 + lean * 0.3, gy - gh * 0.3, gx - 1 + lean * 0.5, gy - gh * 0.5);
      g.quadraticCurveTo(gx - 0.5 + lean * 0.3, gy - gh * 0.3, gx - 0.5, gy);
      g.fill(grassGreen - 0x040404);
    }

    // Wildflowers (polygon petals)
    for (let i = 0; i < 20; i++) {
      const fx = seededRand(i * 61) * sw;
      const fy = sh * 0.7 + seededRand(i * 47) * (sh * 0.25);
      const flowerColors = [0xff6666, 0xffff66, 0xff88ff, 0xffffff, 0x88aaff];
      const fc = flowerColors[Math.floor(seededRand(i * 71) * flowerColors.length)];
      // Stem polygon
      g.moveTo(fx - 0.5, fy + 1);
      g.lineTo(fx - 0.3, fy + 6);
      g.lineTo(fx + 0.3, fy + 6);
      g.lineTo(fx + 0.5, fy + 1);
      g.fill(0x336622);
      // Leaf on stem
      g.moveTo(fx, fy + 3);
      g.quadraticCurveTo(fx + 3, fy + 2, fx + 4, fy + 3.5);
      g.quadraticCurveTo(fx + 3, fy + 4, fx, fy + 3);
      g.fill(0x448822);
      // Petals (5-petal polygon flower)
      const petalCount = 4 + Math.floor(seededRand(i * 83) * 3); // 4-6 petals
      for (let p = 0; p < petalCount; p++) {
        const pa = (p / petalCount) * Math.PI * 2 + seededRand(i * 37) * 0.5;
        const pr = 2 + seededRand(i * 91 + p) * 1;
        const px2 = fx + Math.cos(pa) * pr;
        const py2 = fy + Math.sin(pa) * pr;
        g.moveTo(fx, fy);
        g.quadraticCurveTo(fx + Math.cos(pa - 0.4) * pr * 0.6, fy + Math.sin(pa - 0.4) * pr * 0.6, px2, py2);
        g.quadraticCurveTo(fx + Math.cos(pa + 0.4) * pr * 0.6, fy + Math.sin(pa + 0.4) * pr * 0.6, fx, fy);
        g.fill(fc);
      }
      // Center (tiny 4-point star)
      g.moveTo(fx, fy - 1); g.lineTo(fx + 0.8, fy); g.lineTo(fx, fy + 1); g.lineTo(fx - 0.8, fy); g.fill(0xffdd44);
    }

    // === GROUND-TO-TRACK GRADIENT (worn grass edge) ===
    g.moveTo(0, sh * 0.54);
    for (let gtx = 0; gtx <= sw; gtx += 15) {
      g.lineTo(gtx, sh * 0.54 + Math.sin(gtx * 0.02) * 2);
    }
    g.lineTo(sw, sh * 0.58);
    for (let gtx = sw; gtx >= 0; gtx -= 15) {
      g.lineTo(gtx, sh * 0.58 + Math.sin(gtx * 0.015 + 1) * 1.5);
    }
    g.fill({ color: 0x4a5a2a, alpha: 0.3 }); // worn grass/dirt blend

    // === DIRT TRACK (polygon with beveled edges) ===
    const trackTop = sh * 0.56;
    const trackBot = sh * 0.68;
    // Track surface polygon with slight undulation
    g.moveTo(0, trackTop);
    for (let tx2 = 0; tx2 <= sw; tx2 += 15) {
      g.lineTo(tx2, trackTop + Math.sin(tx2 * 0.02) * 1.2);
    }
    g.lineTo(sw, trackBot);
    for (let tx2 = sw; tx2 >= 0; tx2 -= 15) {
      g.lineTo(tx2, trackBot + Math.sin(tx2 * 0.025 + 1) * 0.8);
    }
    g.fill(theme.track);
    // Track texture polygon patches (organic shapes instead of rect strips)
    for (let tx2 = 10; tx2 < sw; tx2 += 25) {
      const shade = seededRand(tx2 * 7) * 0.18;
      const pw2 = 8 + seededRand(tx2 * 3) * 8;
      const py2 = trackTop + (trackBot - trackTop) * 0.3 + seededRand(tx2 * 11) * (trackBot - trackTop) * 0.4;
      g.moveTo(tx2 - pw2, py2);
      g.quadraticCurveTo(tx2, py2 - pw2 * 0.3, tx2 + pw2, py2);
      g.quadraticCurveTo(tx2, py2 + pw2 * 0.3, tx2 - pw2, py2);
      g.fill({ color: 0x6a4c2a, alpha: shade });
    }
    // Hoof ruts (polygon divots)
    for (let x2 = 20; x2 < sw; x2 += 35) {
      const rx2 = x2 + seededRand(x2) * 10;
      const ry2 = sh * 0.61;
      g.moveTo(rx2 - 6, ry2);
      g.quadraticCurveTo(rx2 - 3, ry2 - 2, rx2, ry2 - 1);
      g.quadraticCurveTo(rx2 + 3, ry2 - 2, rx2 + 6, ry2);
      g.quadraticCurveTo(rx2 + 3, ry2 + 2, rx2, ry2 + 1);
      g.quadraticCurveTo(rx2 - 3, ry2 + 2, rx2 - 6, ry2);
      g.fill({ color: 0x5a3c1a, alpha: 0.3 });
    }
    // Track border polygon edges (beveled)
    // Top border
    g.moveTo(0, trackTop - 1);
    for (let bx = 0; bx <= sw; bx += 20) { g.lineTo(bx, trackTop + Math.sin(bx * 0.02) * 1.2 - 1); }
    for (let bx = sw; bx >= 0; bx -= 20) { g.lineTo(bx, trackTop + Math.sin(bx * 0.02) * 1.2 + 2); }
    g.fill(0x553311);
    // Bottom border
    g.moveTo(0, trackBot - 1);
    for (let bx = 0; bx <= sw; bx += 20) { g.lineTo(bx, trackBot + Math.sin(bx * 0.025 + 1) * 0.8 - 1); }
    for (let bx = sw; bx >= 0; bx -= 20) { g.lineTo(bx, trackBot + Math.sin(bx * 0.025 + 1) * 0.8 + 2); }
    g.fill(0x553311);

    // === ARENA FURNITURE (polygon scene props) ===

    // Hay bales near track edges (polygon rectangles with straw texture)
    for (let hbi = 0; hbi < 4; hbi++) {
      const hbx = sw * 0.05 + hbi * (sw * 0.28);
      const hby = sh * 0.69;
      // Bale body (rounded polygon)
      g.moveTo(hbx - 8, hby + 5); g.quadraticCurveTo(hbx - 9, hby - 2, hbx - 6, hby - 5);
      g.lineTo(hbx + 6, hby - 5); g.quadraticCurveTo(hbx + 9, hby - 2, hbx + 8, hby + 5);
      g.lineTo(hbx - 8, hby + 5); g.fill(0x998844);
      // Straw lines
      g.moveTo(hbx - 5, hby - 3); g.lineTo(hbx + 5, hby - 3); g.stroke({ color: 0xbbaa55, width: 0.5 });
      g.moveTo(hbx - 6, hby); g.lineTo(hbx + 6, hby); g.stroke({ color: 0xbbaa55, width: 0.5 });
      g.moveTo(hbx - 5, hby + 3); g.lineTo(hbx + 5, hby + 3); g.stroke({ color: 0xbbaa55, width: 0.5 });
      // Binding rope
      g.moveTo(hbx, hby - 5); g.lineTo(hbx, hby + 5); g.stroke({ color: 0x664422, width: 0.8 });
    }

    // Wooden fence posts along track edges
    for (let fpi = 0; fpi < 8; fpi++) {
      const fpx = sw * 0.08 + fpi * (sw * 0.12);
      const fpy = sh * 0.555;
      // Post (tapered polygon)
      g.moveTo(fpx - 1.5, fpy); g.lineTo(fpx - 1, fpy - 10);
      g.lineTo(fpx + 1, fpy - 10); g.lineTo(fpx + 1.5, fpy); g.fill(0x664422);
      // Post cap (pointed)
      g.moveTo(fpx - 1.5, fpy - 10); g.lineTo(fpx, fpy - 13);
      g.lineTo(fpx + 1.5, fpy - 10); g.fill(0x775533);
    }

    // Decorative shields mounted on stand front face
    for (let dsi = 0; dsi < 5; dsi++) {
      const dsx = sw * 0.12 + dsi * (sw * 0.2);
      const dsy = sh * 0.43;
      const shColor = TOURNAMENT_KNIGHTS[dsi % TOURNAMENT_KNIGHTS.length].color;
      // Mini kite shield polygon
      g.moveTo(dsx, dsy - 5); g.quadraticCurveTo(dsx + 4, dsy - 4, dsx + 4, dsy);
      g.lineTo(dsx + 2, dsy + 4); g.lineTo(dsx, dsy + 6);
      g.lineTo(dsx - 2, dsy + 4); g.lineTo(dsx - 4, dsy);
      g.quadraticCurveTo(dsx - 4, dsy - 4, dsx, dsy - 5);
      g.fill({ color: shColor, alpha: 0.3 });
      g.moveTo(dsx, dsy - 5); g.quadraticCurveTo(dsx + 4, dsy - 4, dsx + 4, dsy);
      g.lineTo(dsx + 2, dsy + 4); g.lineTo(dsx, dsy + 6);
      g.lineTo(dsx - 2, dsy + 4); g.lineTo(dsx - 4, dsy);
      g.quadraticCurveTo(dsx - 4, dsy - 4, dsx, dsy - 5);
      g.stroke({ color: 0xffd700, width: 0.5 });
    }

    // Straw/debris scattered on track
    for (let sti = 0; sti < 20; sti++) {
      const stx = seededRand(sti * 59) * sw;
      const sty = sh * 0.57 + seededRand(sti * 37) * (sh * 0.09);
      const stAngle = seededRand(sti * 83) * Math.PI;
      const stLen = 2 + seededRand(sti * 47) * 3;
      // Small straw piece (tapered polygon)
      const sc2 = Math.cos(stAngle), ss2 = Math.sin(stAngle);
      g.moveTo(stx - sc2 * stLen, sty - ss2 * stLen);
      g.lineTo(stx + sc2 * stLen, sty + ss2 * stLen);
      g.lineTo(stx + sc2 * stLen + ss2 * 0.5, sty + ss2 * stLen - sc2 * 0.5);
      g.lineTo(stx - sc2 * stLen + ss2 * 0.5, sty - ss2 * stLen - sc2 * 0.5);
      g.fill({ color: 0xbbaa66, alpha: 0.15 });
    }

    // Butterflies near flowers (tiny polygon insects)
    for (let bfi = 0; bfi < 3; bfi++) {
      const bfx = seededRand(bfi * 71) * sw;
      const bfy = sh * 0.68 + seededRand(bfi * 43) * (sh * 0.15);
      const bfDx = bfx + Math.sin(this._elapsed * 1.5 + bfi * 3) * 12;
      const bfDy = bfy + Math.sin(this._elapsed * 2 + bfi * 2) * 6;
      const bfWing = Math.sin(this._elapsed * 8 + bfi * 2.5) * 3;
      const bfColor = [0xffaa44, 0xff88cc, 0xaaddff][bfi];
      // Left wing
      g.moveTo(bfDx, bfDy); g.quadraticCurveTo(bfDx - 3, bfDy - bfWing, bfDx - 4, bfDy);
      g.quadraticCurveTo(bfDx - 2, bfDy + 1, bfDx, bfDy); g.fill({ color: bfColor, alpha: 0.4 });
      // Right wing
      g.moveTo(bfDx, bfDy); g.quadraticCurveTo(bfDx + 3, bfDy - bfWing, bfDx + 4, bfDy);
      g.quadraticCurveTo(bfDx + 2, bfDy + 1, bfDx, bfDy); g.fill({ color: bfColor, alpha: 0.4 });
    }

    // === TILT BARRIER (perspective) ===
    const bTop = sh * 0.40, bBot = sh * 0.66;
    // Main barrier body
    g.moveTo(sw * 0.488, bTop); g.lineTo(sw * 0.512, bTop);
    g.lineTo(sw * 0.525, bBot); g.lineTo(sw * 0.475, bBot); g.fill(0x6a4a2a);
    // Light side
    g.moveTo(sw * 0.512, bTop); g.lineTo(sw * 0.525, bBot);
    g.lineTo(sw * 0.515, bBot); g.lineTo(sw * 0.505, bTop); g.fill(0x7a5a3a);
    // Rails (polygon planks with grain)
    for (let i = 0; i < 7; i++) {
      const t = i / 6; const ry = bTop + t * (bBot - bTop);
      const hw = 0.018 + t * 0.004;
      const lx2 = sw * (0.5 - hw); const rw = sw * hw * 2;
      // Plank polygon (slightly warped)
      g.moveTo(lx2, ry);
      g.lineTo(lx2 + rw, ry + 0.5);
      g.lineTo(lx2 + rw, ry + 3);
      g.lineTo(lx2, ry + 2.5);
      g.fill(0x553311);
      // Plank highlight
      g.moveTo(lx2 + 2, ry + 0.5);
      g.lineTo(lx2 + rw - 2, ry + 1);
      g.stroke({ color: 0x664422, width: 0.5 });
    }
    // Post caps (polygon ornamental finials)
    // Top finial
    const ftx = sw * 0.5, fty = bTop - 3;
    g.moveTo(ftx, fty - 8);
    g.quadraticCurveTo(ftx + 3, fty - 6, ftx + 4, fty - 3);
    g.quadraticCurveTo(ftx + 5, fty, ftx + 3, fty + 2);
    g.lineTo(ftx - 3, fty + 2);
    g.quadraticCurveTo(ftx - 5, fty, ftx - 4, fty - 3);
    g.quadraticCurveTo(ftx - 3, fty - 6, ftx, fty - 8);
    g.fill(0xccaa66);
    // Top finial jewel (diamond polygon)
    g.moveTo(ftx, fty - 6); g.lineTo(ftx + 2, fty - 4); g.lineTo(ftx, fty - 2); g.lineTo(ftx - 2, fty - 4);
    g.fill(0xffd700);
    // Finial cross detail
    g.moveTo(ftx - 1, fty - 4); g.lineTo(ftx + 1, fty - 4); g.stroke({ color: 0xeebb00, width: 0.5 });
    // Bottom finial (larger) with fleur-de-lis inspired shape
    const fby = bBot + 3;
    g.moveTo(ftx, fby - 8);
    g.quadraticCurveTo(ftx + 3, fby - 7, ftx + 5, fby - 4);
    g.quadraticCurveTo(ftx + 6, fby - 1, ftx + 4, fby + 2);
    g.quadraticCurveTo(ftx + 6, fby + 4, ftx + 5, fby + 6);
    g.lineTo(ftx + 3, fby + 5);
    g.quadraticCurveTo(ftx + 2, fby + 3, ftx, fby + 4);
    g.quadraticCurveTo(ftx - 2, fby + 3, ftx - 3, fby + 5);
    g.lineTo(ftx - 5, fby + 6);
    g.quadraticCurveTo(ftx - 6, fby + 4, ftx - 4, fby + 2);
    g.quadraticCurveTo(ftx - 6, fby - 1, ftx - 5, fby - 4);
    g.quadraticCurveTo(ftx - 3, fby - 7, ftx, fby - 8);
    g.fill(0xccaa66);
    // Finial center jewel (diamond)
    g.moveTo(ftx, fby - 2); g.lineTo(ftx + 2.5, fby + 1); g.lineTo(ftx, fby + 4); g.lineTo(ftx - 2.5, fby + 1);
    g.fill(0xffd700);
    g.moveTo(ftx, fby - 1); g.lineTo(ftx + 1.5, fby + 1); g.lineTo(ftx, fby + 3); g.lineTo(ftx - 1.5, fby + 1);
    g.fill({ color: 0xffffff, alpha: 0.15 });

    // === PENNANT POLES WITH TORCHES ===
    const oppColor = getOpponent(s)?.color ?? 0xcc4444;
    this._drawPennantWithTorch(g, sw * 0.05, sh * 0.24, PLAYER_COLOR);
    this._drawPennantWithTorch(g, sw * 0.15, sh * 0.22, PLAYER_COLOR);
    this._drawPennantWithTorch(g, sw * 0.85, sh * 0.22, oppColor);
    this._drawPennantWithTorch(g, sw * 0.95, sh * 0.24, oppColor);

    // === WEATHER EFFECTS ===
    const wx = this._state.weather;
    if (wx === "rain") {
      // Dark sky overlay for rain
      g.rect(0, 0, sw, sh * 0.44); g.fill({ color: 0x0a1020, alpha: 0.12 });
      // Dense rain streaks (more, varied angles)
      for (let ri = 0; ri < 50; ri++) {
        const rsx = ((ri * 37 + this._elapsed * 250) % (sw + 60)) - 30;
        const rsy = ((ri * 23 + this._elapsed * 600) % (sh + 40)) - 20;
        const rLen = 8 + seededRand(ri * 19) * 8;
        const rWind = Math.sin(this._elapsed * 0.5) * 2;
        g.moveTo(rsx, rsy); g.lineTo(rsx - 2 + rWind, rsy + rLen);
        g.stroke({ color: 0x8899bb, width: 0.7 + seededRand(ri * 31) * 0.5, alpha: 0.15 + seededRand(ri * 41) * 0.1 } as any);
      }
      // Rain splashes on ground
      for (let sp = 0; sp < 8; sp++) {
        const spx = ((sp * 150 + this._elapsed * 180 + sp * 47) % sw);
        const spy = sh * 0.55 + seededRand(sp * 83) * (sh * 0.12);
        const spAge = (this._elapsed * 3 + sp * 1.7) % 1;
        if (spAge < 0.3) {
          const spR = spAge * 12;
          // Polygon ripple (octagon)
          g.moveTo(spx + spR, spy);
          for (let ri = 1; ri <= 8; ri++) { g.lineTo(spx + Math.cos((ri / 8) * Math.PI * 2) * spR, spy + Math.sin((ri / 8) * Math.PI * 2) * spR * 0.4); }
          g.stroke({ color: 0x8899bb, width: 0.5, alpha: (0.3 - spAge) * 0.5 } as any);
        }
      }
      // Puddle reflections on track
      for (let pi = 0; pi < 8; pi++) {
        const prx = seededRand(pi * 83) * sw;
        const prw = 10 + seededRand(pi * 37) * 12;
        // Puddle polygon (irregular oval)
        g.moveTo(prx - prw, sh * 0.62);
        g.quadraticCurveTo(prx - prw * 0.5, sh * 0.62 - 2.5, prx, sh * 0.62 - 2);
        g.quadraticCurveTo(prx + prw * 0.5, sh * 0.62 - 2.5, prx + prw, sh * 0.62);
        g.quadraticCurveTo(prx + prw * 0.5, sh * 0.62 + 2.5, prx, sh * 0.62 + 2);
        g.quadraticCurveTo(prx - prw * 0.5, sh * 0.62 + 2.5, prx - prw, sh * 0.62);
        g.fill({ color: 0x6688aa, alpha: 0.06 });
        // Ripple on puddle (polygon hexagon)
        const ripT = (this._elapsed * 2 + pi * 0.8) % 1;
        const rpx = prx + seededRand(pi * 61) * 6 - 3, rpr = ripT * 4;
        g.moveTo(rpx + rpr, sh * 0.62);
        for (let rpi = 1; rpi <= 6; rpi++) { g.lineTo(rpx + Math.cos((rpi / 6) * Math.PI * 2) * rpr, sh * 0.62 + Math.sin((rpi / 6) * Math.PI * 2) * rpr * 0.35); }
        g.stroke({ color: 0x8899bb, width: 0.4, alpha: (1 - ripT) * 0.15 } as any);
      }
      // Occasional lightning flash
      const lightningPhase = Math.sin(this._elapsed * 0.3) + Math.sin(this._elapsed * 0.7);
      if (lightningPhase > 1.8) {
        g.rect(0, 0, sw, sh); g.fill({ color: 0xccddff, alpha: 0.06 });
      }
      // Wet surface sheen on track
      g.rect(0, sh * 0.56, sw, sh * 0.12); g.fill({ color: 0x6688aa, alpha: 0.03 });
    } else if (wx === "wind") {
      // Wind streaks (more, longer)
      for (let wi = 0; wi < 14; wi++) {
        const wsx = ((wi * 130 + this._elapsed * 150) % (sw + 150)) - 75;
        const wsy = sh * 0.15 + seededRand(wi * 61) * (sh * 0.55);
        const wLen = 30 + seededRand(wi * 43) * 50;
        g.moveTo(wsx, wsy); g.lineTo(wsx + wLen, wsy + seededRand(wi * 29) * 4 - 2);
        g.stroke({ color: 0xaabbcc, width: 0.5, alpha: 0.08 + seededRand(wi * 71) * 0.06 } as any);
      }
      // Blown leaves (small polygon shapes drifting)
      for (let li = 0; li < 6; li++) {
        const lx2 = ((li * 200 + this._elapsed * 80) % (sw + 100)) - 50;
        const ly2 = sh * 0.25 + seededRand(li * 47) * (sh * 0.4) + Math.sin(this._elapsed * 2 + li * 3) * 15;
        const lr = Math.sin(this._elapsed * 3 + li * 2);
        // Leaf polygon
        g.moveTo(lx2, ly2); g.quadraticCurveTo(lx2 + 4, ly2 - 3 * lr, lx2 + 6, ly2);
        g.quadraticCurveTo(lx2 + 4, ly2 + 2 * lr, lx2, ly2);
        g.fill({ color: [0x886622, 0x668833, 0xaa7722][li % 3], alpha: 0.25 });
      }
    } else if (wx === "fog") {
      // Volumetric fog layers (multiple overlapping, animated)
      for (let fl = 0; fl < 3; fl++) {
        const fogY = sh * 0.28 + fl * (sh * 0.12);
        const fogAlpha = 0.05 + Math.sin(this._elapsed * 0.3 + fl) * 0.015;
        g.moveTo(0, fogY);
        for (let fx2 = 0; fx2 <= sw; fx2 += 25) {
          g.lineTo(fx2, fogY + Math.sin(fx2 * 0.006 + this._elapsed * 0.4 + fl * 1.5) * 12);
        }
        g.lineTo(sw, fogY + sh * 0.15); g.lineTo(0, fogY + sh * 0.15);
        g.fill({ color: 0x889aaa, alpha: fogAlpha });
      }
      // Fog wisps (animated, drifting)
      for (let fi = 0; fi < 6; fi++) {
        const fwx = ((fi * 250 + this._elapsed * 12) % (sw + 250)) - 125;
        const fwy = sh * 0.3 + fi * (sh * 0.06) + Math.sin(this._elapsed * 0.5 + fi * 2) * 8;
        const fwW = 50 + seededRand(fi * 47) * 50;
        g.moveTo(fwx - fwW, fwy);
        g.quadraticCurveTo(fwx - fwW * 0.3, fwy - 10, fwx, fwy - 5);
        g.quadraticCurveTo(fwx + fwW * 0.3, fwy - 8, fwx + fwW, fwy);
        g.quadraticCurveTo(fwx + fwW * 0.3, fwy + 6, fwx, fwy + 4);
        g.quadraticCurveTo(fwx - fwW * 0.3, fwy + 6, fwx - fwW, fwy);
        g.fill({ color: 0x99aabb, alpha: 0.03 + seededRand(fi * 37) * 0.02 });
      }
    }

    // === ATMOSPHERIC DUST MOTES floating in the air ===
    for (let dm = 0; dm < 15; dm++) {
      const dmx = seededRand(dm * 97) * sw;
      const dmy = sh * 0.15 + seededRand(dm * 53) * (sh * 0.4);
      const driftX = dmx + Math.sin(this._elapsed * 0.5 + dm * 1.7) * 18;
      const driftY = dmy + Math.sin(this._elapsed * 0.3 + dm * 2.3) * 10;
      const moteAlpha = 0.06 + Math.sin(this._elapsed * 1.5 + dm * 3) * 0.04;
      const moteSize = 1 + seededRand(dm * 31) * 1.8;
      // Polygon mote (4-point diamond with slight rotation)
      const mr = this._elapsed * 0.8 + dm * 1.3;
      const mc = Math.cos(mr), ms = Math.sin(mr);
      g.moveTo(driftX + mc * moteSize, driftY + ms * moteSize);
      g.lineTo(driftX - ms * moteSize * 0.5, driftY + mc * moteSize * 0.5);
      g.lineTo(driftX - mc * moteSize, driftY - ms * moteSize);
      g.lineTo(driftX + ms * moteSize * 0.5, driftY - mc * moteSize * 0.5);
      g.fill({ color: 0xffeedd, alpha: moteAlpha });
    }

    // === SUN RAYS through the scene (light shafts) ===
    const sunX2 = sw * 0.82, sunY2 = sh * 0.1;
    for (let ray = 0; ray < 4; ray++) {
      const rAngle = 0.3 + ray * 0.2 + Math.sin(this._elapsed * 0.2 + ray) * 0.05;
      const rLen = sh * 0.7;
      const rW = 15 + ray * 5;
      const rx1 = sunX2 + Math.cos(rAngle) * 30;
      const ry1 = sunY2 + Math.sin(rAngle) * 30;
      const rx2 = sunX2 + Math.cos(rAngle) * rLen;
      const ry2 = sunY2 + Math.sin(rAngle) * rLen;
      g.moveTo(rx1 - Math.sin(rAngle) * 2, ry1 + Math.cos(rAngle) * 2);
      g.lineTo(rx2 - Math.sin(rAngle) * rW, ry2 + Math.cos(rAngle) * rW);
      g.lineTo(rx2 + Math.sin(rAngle) * rW, ry2 - Math.cos(rAngle) * rW);
      g.lineTo(rx1 + Math.sin(rAngle) * 2, ry1 - Math.cos(rAngle) * 2);
      g.fill({ color: 0xffeecc, alpha: 0.015 + Math.sin(this._elapsed * 0.4 + ray) * 0.005 });
    }

    // === HORSE SHADOWS (drawn on track) ===
    // Will be drawn by _renderArena per knight
  }

  private _drawPennantWithTorch(g: Graphics, x: number, y: number, color: number): void {
    // Pole (tapered polygon)
    g.moveTo(x - 1.5, y - 50);
    g.lineTo(x + 1.5, y - 50);
    g.lineTo(x + 2.5, y + 60);
    g.lineTo(x - 2.5, y + 60);
    g.fill(0x553322);
    // Pole highlight
    g.moveTo(x - 0.5, y - 50);
    g.lineTo(x + 0.5, y - 50);
    g.lineTo(x + 0.5, y + 58);
    g.lineTo(x - 0.5, y + 58);
    g.fill({ color: 0x775544, alpha: 0.4 });
    // Pole cap (polygon finial — onion dome shape)
    g.moveTo(x, y - 60);
    g.quadraticCurveTo(x + 4, y - 58, x + 5, y - 54);
    g.quadraticCurveTo(x + 4, y - 51, x + 2, y - 50);
    g.lineTo(x - 2, y - 50);
    g.quadraticCurveTo(x - 4, y - 51, x - 5, y - 54);
    g.quadraticCurveTo(x - 4, y - 58, x, y - 60);
    g.fill(0xccaa66);
    // Finial jewel (polygon diamond)
    g.moveTo(x, y - 57); g.lineTo(x + 1.5, y - 55); g.lineTo(x, y - 53); g.lineTo(x - 1.5, y - 55);
    g.fill(0xffd700);

    // Pennant flag (waving)
    const w1 = Math.sin(this._elapsed * 3.2 + x * 0.01);
    const w2 = Math.sin(this._elapsed * 4.8 + x * 0.02);
    g.moveTo(x + 3, y - 48);
    g.lineTo(x + 30 + w1 * 5, y - 42 + w2 * 2);
    g.lineTo(x + 15 + w1 * 3, y - 32 + w2 * 1.5);
    g.lineTo(x + 3, y - 28);
    g.fill(color);
    // Flag emblem stripe
    g.moveTo(x + 5, y - 40);
    g.lineTo(x + 28 + w1 * 4, y - 38 + w2); g.stroke({ color: 0xffd700, width: 1.5 });

    // Torch at top
    const tx = x, ty = y - 55;
    const f1 = Math.sin(this._elapsed * 8 + x) * 2;
    const f2 = Math.sin(this._elapsed * 12 + x * 1.3) * 1.5;
    const f3 = Math.cos(this._elapsed * 10 + x * 0.7) * 1;
    // Torch glow halo (polygon radial light)
    const glowR = 35 + Math.sin(this._elapsed * 5 + x) * 5;
    // Outer glow (8-sided polygon)
    g.moveTo(tx + glowR, ty - 8);
    for (let gi = 1; gi <= 8; gi++) {
      const ga = (gi / 8) * Math.PI * 2;
      const gr = glowR + Math.sin(ga * 2 + this._elapsed * 3) * 3;
      g.lineTo(tx + Math.cos(ga) * gr, ty - 8 + Math.sin(ga) * gr);
    }
    g.fill({ color: 0xff8822, alpha: 0.04 });
    // Inner glow (hexagon)
    const igr = glowR * 0.6;
    g.moveTo(tx + igr, ty - 8);
    for (let gi = 1; gi <= 6; gi++) {
      g.lineTo(tx + Math.cos((gi / 6) * Math.PI * 2) * igr, ty - 8 + Math.sin((gi / 6) * Math.PI * 2) * igr);
    }
    g.fill({ color: 0xffaa44, alpha: 0.06 });
    // Ground light pool from torch (polygon)
    const plR = 20 + Math.sin(this._elapsed * 3 + x) * 3;
    g.moveTo(tx - plR, y + 58);
    g.quadraticCurveTo(tx - plR * 0.5, y + 53, tx, y + 54);
    g.quadraticCurveTo(tx + plR * 0.5, y + 53, tx + plR, y + 58);
    g.quadraticCurveTo(tx + plR * 0.5, y + 63, tx, y + 62);
    g.quadraticCurveTo(tx - plR * 0.5, y + 63, tx - plR, y + 58);
    g.fill({ color: 0xffaa44, alpha: 0.03 });
    const f4 = Math.sin(this._elapsed * 15 + x * 0.5) * 1;
    // Outer glow polygon
    g.moveTo(tx - 12 + f1 * 0.2, ty - 2);
    g.quadraticCurveTo(tx + f1, ty - 20, tx + 12 + f1 * 0.2, ty - 2);
    g.quadraticCurveTo(tx, ty + 4, tx - 12 + f1 * 0.2, ty - 2);
    g.fill({ color: 0xff8800, alpha: 0.06 });
    // Outer flame polygon (teardrop)
    g.moveTo(tx - 5 + f3, ty);
    g.quadraticCurveTo(tx - 6 + f1, ty - 10, tx + f1 * 0.5, ty - 18 + f2);
    g.quadraticCurveTo(tx + 6 + f1, ty - 10, tx + 5 + f3, ty);
    g.quadraticCurveTo(tx, ty + 2, tx - 5 + f3, ty);
    g.fill({ color: 0xff4400, alpha: 0.65 });
    // Middle flame polygon
    g.moveTo(tx - 3 + f4, ty - 1);
    g.quadraticCurveTo(tx - 4 + f2, ty - 8, tx + f2 * 0.3, ty - 15 + f3);
    g.quadraticCurveTo(tx + 4 + f2, ty - 8, tx + 3 + f4, ty - 1);
    g.quadraticCurveTo(tx, ty + 1, tx - 3 + f4, ty - 1);
    g.fill({ color: 0xffaa22, alpha: 0.75 });
    // Inner flame polygon (bright core)
    g.moveTo(tx - 1.5 + f3, ty);
    g.quadraticCurveTo(tx - 2 + f4, ty - 5, tx + f3, ty - 10 + f1);
    g.quadraticCurveTo(tx + 2 + f4, ty - 5, tx + 1.5 + f3, ty);
    g.fill({ color: 0xffee66, alpha: 0.85 });
    // Spark at tip (4-point star polygon)
    const spkx = tx + f1 * 0.3, spky = ty - 17 + f2, spka = 0.4 + f4 * 0.2;
    g.moveTo(spkx, spky - 1.5); g.lineTo(spkx + 0.5, spky - 0.5);
    g.lineTo(spkx + 1.5, spky); g.lineTo(spkx + 0.5, spky + 0.5);
    g.lineTo(spkx, spky + 1.5); g.lineTo(spkx - 0.5, spky + 0.5);
    g.lineTo(spkx - 1.5, spky); g.lineTo(spkx - 0.5, spky - 0.5);
    g.fill({ color: 0xffffff, alpha: spka });
  }

  // ---- Shield heraldry pattern --------------------------------------------

  private _drawHeraldry(g: Graphics, cx: number, cy: number, w: number, h: number, heraldry: Heraldry, _c1: number, c2: number): void {
    switch (heraldry) {
      case "cross":
        g.rect(cx - 1, cy - h / 2, 2, h); g.fill(c2);
        g.rect(cx - w / 2, cy - 1, w, 2); g.fill(c2); break;
      case "chevron":
        g.moveTo(cx - w / 2, cy + h * 0.2); g.lineTo(cx, cy - h * 0.3);
        g.lineTo(cx + w / 2, cy + h * 0.2); g.lineTo(cx + w / 2, cy + h * 0.35);
        g.lineTo(cx, cy - h * 0.15); g.lineTo(cx - w / 2, cy + h * 0.35);
        g.fill(c2); break;
      case "bend":
        g.moveTo(cx - w / 2, cy - h / 2); g.lineTo(cx - w / 2 + w * 0.3, cy - h / 2);
        g.lineTo(cx + w / 2, cy + h / 2); g.lineTo(cx + w / 2 - w * 0.3, cy + h / 2);
        g.fill(c2); break;
      case "saltire":
        g.moveTo(cx - w / 2, cy - h / 2); g.lineTo(cx - w * 0.25, cy); g.lineTo(cx - w / 2, cy + h / 2);
        g.lineTo(cx, cy + h * 0.25); g.lineTo(cx + w / 2, cy + h / 2);
        g.lineTo(cx + w * 0.25, cy); g.lineTo(cx + w / 2, cy - h / 2);
        g.lineTo(cx, cy - h * 0.25); g.fill(c2); break;
      case "pale":
        g.rect(cx - w * 0.15, cy - h / 2, w * 0.3, h); g.fill(c2); break;
      case "fess":
        g.rect(cx - w / 2, cy - h * 0.15, w, h * 0.3); g.fill(c2); break;
      case "quarters":
        g.rect(cx - w / 2, cy - h / 2, w / 2, h / 2); g.fill(c2);
        g.rect(cx, cy, w / 2, h / 2); g.fill(c2); break;
      case "crown":
        // Ornate polygon crown
        g.moveTo(cx - 4, cy + 3);
        g.lineTo(cx + 4, cy + 3);
        g.lineTo(cx + 4, cy);
        g.lineTo(cx + 3.5, cy - 1);
        g.lineTo(cx + 4, cy - 4);
        g.lineTo(cx + 3, cy - 3);
        g.lineTo(cx + 1.5, cy - 5);
        g.lineTo(cx, cy - 3);
        g.lineTo(cx - 1.5, cy - 5);
        g.lineTo(cx - 3, cy - 3);
        g.lineTo(cx - 4, cy - 4);
        g.lineTo(cx - 3.5, cy - 1);
        g.lineTo(cx - 4, cy);
        g.fill(c2);
        // Crown jewels (dots on points)
        g.circle(cx, cy - 3, 0.7); g.fill(0xff2222);
        g.circle(cx + 3, cy - 3, 0.5); g.fill(0x2244ff);
        g.circle(cx - 3, cy - 3, 0.5); g.fill(0x2244ff);
        break;
    }
  }

  // ---- Main Menu (arena background) ---------------------------------------

  private _renderMainMenu(g: Graphics, sw: number, sh: number): void {
    // Draw arena as background (dimmed)
    this._renderArenaBackground(g, sw, sh);
    // Dim overlay
    g.rect(0, 0, sw, sh); g.fill({ color: 0x000000, alpha: 0.6 });

    // Ornate parchment panel
    const px = sw * 0.15, py = sh * 0.1, pw = sw * 0.7, ph = sh * 0.8;
    g.roundRect(px, py, pw, ph, 8); g.fill({ color: 0x1a1a28, alpha: 0.9 });
    g.roundRect(px, py, pw, ph, 8); g.stroke({ color: 0xffd700, width: 2 });
    g.roundRect(px + 6, py + 6, pw - 12, ph - 12, 4); g.stroke({ color: 0x886622, width: 1 });

    // Corner flourishes (curling vine scroll ornaments)
    const corners: [number, number, number, number][] = [
      [px + 8, py + 8, 1, 1], [px + pw - 8, py + 8, -1, 1],
      [px + 8, py + ph - 8, 1, -1], [px + pw - 8, py + ph - 8, -1, -1],
    ];
    for (const [fx, fy, dx, dy] of corners) {
      // Central ornament (8-point star polygon)
      g.moveTo(fx, fy - 5); g.lineTo(fx + 2, fy - 2); g.lineTo(fx + 5, fy); g.lineTo(fx + 2, fy + 2);
      g.lineTo(fx, fy + 5); g.lineTo(fx - 2, fy + 2); g.lineTo(fx - 5, fy); g.lineTo(fx - 2, fy - 2);
      g.fill(0xffd700);
      g.moveTo(fx, fy - 2.5); g.lineTo(fx + 1, fy - 1); g.lineTo(fx + 2.5, fy); g.lineTo(fx + 1, fy + 1);
      g.lineTo(fx, fy + 2.5); g.lineTo(fx - 1, fy + 1); g.lineTo(fx - 2.5, fy); g.lineTo(fx - 1, fy - 1);
      g.fill(0x1a1a28);
      // Curling vine arm (horizontal)
      g.moveTo(fx, fy);
      g.quadraticCurveTo(fx + dx * 18, fy + dy * 2, fx + dx * 25, fy - dy * 5);
      g.quadraticCurveTo(fx + dx * 22, fy - dy * 8, fx + dx * 15, fy - dy * 4);
      g.stroke({ color: 0xffd700, width: 1.2 });
      // Curl tip (diamond polygon)
      const ctx2 = fx + dx * 25, cty2 = fy - dy * 5;
      g.moveTo(ctx2, cty2 - 2); g.lineTo(ctx2 + 2, cty2); g.lineTo(ctx2, cty2 + 2); g.lineTo(ctx2 - 2, cty2);
      g.fill(0xffd700);
      // Curling vine arm (vertical)
      g.moveTo(fx, fy);
      g.quadraticCurveTo(fx + dx * 2, fy + dy * 18, fx - dx * 5, fy + dy * 25);
      g.quadraticCurveTo(fx - dx * 8, fy + dy * 22, fx - dx * 4, fy + dy * 15);
      g.stroke({ color: 0xffd700, width: 1.2 });
      const cvx = fx - dx * 5, cvy = fy + dy * 25;
      g.moveTo(cvx, cvy - 2); g.lineTo(cvx + 2, cvy); g.lineTo(cvx, cvy + 2); g.lineTo(cvx - 2, cvy); g.fill(0xffd700);
      // Leaf polygon on vine
      g.moveTo(fx + dx * 12, fy + dy * 1);
      g.quadraticCurveTo(fx + dx * 16, fy - dy * 4, fx + dx * 20, fy - dy * 2);
      g.quadraticCurveTo(fx + dx * 16, fy + dy * 1, fx + dx * 12, fy + dy * 1);
      g.fill({ color: 0xffd700, alpha: 0.4 });
    }

    // Edge filigree (subtle scrollwork along top/bottom edges)
    for (let fi = 0; fi < 6; fi++) {
      const fxc = px + pw * 0.2 + fi * (pw * 0.12);
      // Top edge scroll
      g.moveTo(fxc, py + 4);
      g.quadraticCurveTo(fxc + pw * 0.03, py - 2, fxc + pw * 0.06, py + 4);
      g.stroke({ color: 0x886622, width: 0.8 });
      // Bottom edge scroll
      g.moveTo(fxc, py + ph - 4);
      g.quadraticCurveTo(fxc + pw * 0.03, py + ph + 2, fxc + pw * 0.06, py + ph - 4);
      g.stroke({ color: 0x886622, width: 0.8 });
    }

    // Crown/helmet icon above title
    const crownX = sw / 2, crownY = py + ph * 0.03;
    g.moveTo(crownX - 12, crownY + 6);
    g.lineTo(crownX + 12, crownY + 6);
    g.lineTo(crownX + 12, crownY + 2);
    g.lineTo(crownX + 10, crownY - 2);
    g.lineTo(crownX + 12, crownY - 6);
    g.lineTo(crownX + 8, crownY - 4);
    g.lineTo(crownX + 4, crownY - 8);
    g.lineTo(crownX, crownY - 5);
    g.lineTo(crownX - 4, crownY - 8);
    g.lineTo(crownX - 8, crownY - 4);
    g.lineTo(crownX - 12, crownY - 6);
    g.lineTo(crownX - 10, crownY - 2);
    g.lineTo(crownX - 12, crownY + 2);
    g.fill(0xffd700);
    // Crown jewels
    g.circle(crownX, crownY - 5, 1); g.fill(0xff2222);
    g.circle(crownX + 6, crownY - 3, 0.8); g.fill(0x2266ff);
    g.circle(crownX - 6, crownY - 3, 0.8); g.fill(0x2266ff);

    // Decorative scrollwork divider under title
    const divY = py + ph * 0.19;
    g.moveTo(px + 40, divY);
    g.quadraticCurveTo(sw / 2 - 30, divY - 5, sw / 2 - 15, divY);
    g.stroke({ color: 0x886622, width: 1 });
    // Central diamond on divider
    g.moveTo(sw / 2, divY - 5); g.lineTo(sw / 2 + 5, divY); g.lineTo(sw / 2, divY + 5); g.lineTo(sw / 2 - 5, divY);
    g.fill(0xffd700);
    g.moveTo(sw / 2 + 15, divY);
    g.quadraticCurveTo(sw / 2 + 30, divY - 5, px + pw - 40, divY);
    g.stroke({ color: 0x886622, width: 1 });

    this._addText("JOUSTING", S_TITLE, sw / 2, py + ph * 0.09);
    this._addText("TOURNAMENT", S_SUBTITLE, sw / 2, py + ph * 0.155);

    // Knight silhouettes flanking the emblem
    const silY = py + ph * 0.30;
    // Left knight (player)
    const lkx = px + 45;
    // Horse body
    g.moveTo(lkx - 18, silY + 12); g.quadraticCurveTo(lkx - 20, silY, lkx - 10, silY - 4);
    g.quadraticCurveTo(lkx, silY - 6, lkx + 12, silY - 2);
    g.quadraticCurveTo(lkx + 16, silY + 4, lkx + 12, silY + 14);
    g.quadraticCurveTo(lkx, silY + 16, lkx - 18, silY + 12);
    g.fill({ color: PLAYER_COLOR, alpha: 0.2 });
    // Horse head
    g.moveTo(lkx + 10, silY); g.quadraticCurveTo(lkx + 18, silY - 8, lkx + 20, silY - 2);
    g.quadraticCurveTo(lkx + 16, silY + 2, lkx + 10, silY); g.fill({ color: PLAYER_COLOR, alpha: 0.2 });
    // Rider
    g.moveTo(lkx - 3, silY - 4); g.lineTo(lkx + 3, silY - 4);
    g.lineTo(lkx + 2, silY - 18); g.lineTo(lkx - 2, silY - 18); g.fill({ color: PLAYER_COLOR, alpha: 0.25 });
    // Helm
    g.moveTo(lkx - 3, silY - 18); g.quadraticCurveTo(lkx, silY - 24, lkx + 3, silY - 18); g.fill({ color: PLAYER_COLOR, alpha: 0.25 });
    // Lance pointing right
    g.moveTo(lkx + 5, silY - 12); g.lineTo(lkx + 40, silY - 16);
    g.lineTo(lkx + 40, silY - 14); g.lineTo(lkx + 5, silY - 10); g.fill({ color: PLAYER_COLOR, alpha: 0.15 });

    // Right knight (opponent) — mirrored
    const rkx = px + pw - 45;
    g.moveTo(rkx + 18, silY + 12); g.quadraticCurveTo(rkx + 20, silY, rkx + 10, silY - 4);
    g.quadraticCurveTo(rkx, silY - 6, rkx - 12, silY - 2);
    g.quadraticCurveTo(rkx - 16, silY + 4, rkx - 12, silY + 14);
    g.quadraticCurveTo(rkx, silY + 16, rkx + 18, silY + 12);
    g.fill({ color: 0xcc4444, alpha: 0.2 });
    g.moveTo(rkx - 10, silY); g.quadraticCurveTo(rkx - 18, silY - 8, rkx - 20, silY - 2);
    g.quadraticCurveTo(rkx - 16, silY + 2, rkx - 10, silY); g.fill({ color: 0xcc4444, alpha: 0.2 });
    g.moveTo(rkx - 3, silY - 4); g.lineTo(rkx + 3, silY - 4);
    g.lineTo(rkx + 2, silY - 18); g.lineTo(rkx - 2, silY - 18); g.fill({ color: 0xcc4444, alpha: 0.25 });
    g.moveTo(rkx - 3, silY - 18); g.quadraticCurveTo(rkx, silY - 24, rkx + 3, silY - 18); g.fill({ color: 0xcc4444, alpha: 0.25 });
    g.moveTo(rkx - 5, silY - 12); g.lineTo(rkx - 40, silY - 16);
    g.lineTo(rkx - 40, silY - 14); g.lineTo(rkx - 5, silY - 10); g.fill({ color: 0xcc4444, alpha: 0.15 });

    // Animated crossed lances (polygon shafts) with kite shield
    const cx = sw / 2, cy = py + ph * 0.28;
    // Shield glow (polygon radial light pattern)
    const shGlow = 0.06 + Math.sin(this._elapsed * 1.8) * 0.03;
    // Outer glow (12-point polygon)
    for (let sgi = 0; sgi < 12; sgi++) {
      const sga1 = (sgi / 12) * Math.PI * 2;
      const sga2 = ((sgi + 1) / 12) * Math.PI * 2;
      const sgr = 28 + Math.sin(this._elapsed * 0.8 + sgi) * 3;
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(sga1) * sgr, cy + Math.sin(sga1) * sgr);
      g.lineTo(cx + Math.cos(sga2) * sgr, cy + Math.sin(sga2) * sgr);
      g.fill({ color: 0xffd700, alpha: shGlow });
    }
    // Inner glow (hexagon)
    g.moveTo(cx + 20, cy);
    for (let sgi = 1; sgi <= 6; sgi++) {
      g.lineTo(cx + Math.cos((sgi / 6) * Math.PI * 2) * 20, cy + Math.sin((sgi / 6) * Math.PI * 2) * 20);
    }
    g.fill({ color: 0xffeeaa, alpha: shGlow * 0.7 });
    const wobble = Math.sin(this._elapsed * 1.2) * 3;
    // Left lance polygon (tapered shaft)
    g.moveTo(cx - 100, cy - 27 + wobble);
    g.lineTo(cx + 15, cy + 13 - wobble);
    g.lineTo(cx + 15, cy + 17 - wobble);
    g.lineTo(cx - 100, cy - 23 + wobble);
    g.fill(0xccaa66);
    // Left lance tip polygon
    g.moveTo(cx + 15, cy + 12 - wobble);
    g.lineTo(cx + 25, cy + 15 - wobble);
    g.lineTo(cx + 15, cy + 18 - wobble);
    g.fill(0xbbbbbb);
    // Right lance polygon
    g.moveTo(cx + 100, cy - 27 - wobble);
    g.lineTo(cx - 15, cy + 13 + wobble);
    g.lineTo(cx - 15, cy + 17 + wobble);
    g.lineTo(cx + 100, cy - 23 - wobble);
    g.fill(0xccaa66);
    // Right lance tip
    g.moveTo(cx - 15, cy + 12 + wobble);
    g.lineTo(cx - 25, cy + 15 + wobble);
    g.lineTo(cx - 15, cy + 18 + wobble);
    g.fill(0xbbbbbb);
    // Shield (kite polygon)
    g.moveTo(cx, cy - 14);
    g.quadraticCurveTo(cx + 13, cy - 12, cx + 13, cy);
    g.lineTo(cx + 7, cy + 12);
    g.lineTo(cx, cy + 16);
    g.lineTo(cx - 7, cy + 12);
    g.lineTo(cx - 13, cy);
    g.quadraticCurveTo(cx - 13, cy - 12, cx, cy - 14);
    g.fill(0xffd700);
    // Shield inner
    g.moveTo(cx, cy - 10);
    g.quadraticCurveTo(cx + 9, cy - 8, cx + 9, cy);
    g.lineTo(cx + 5, cy + 9);
    g.lineTo(cx, cy + 12);
    g.lineTo(cx - 5, cy + 9);
    g.lineTo(cx - 9, cy);
    g.quadraticCurveTo(cx - 9, cy - 8, cx, cy - 10);
    g.fill(0x1a1a28);
    this._drawHeraldry(g, cx, cy + 1, 14, 18, "cross", 0x1a1a28, 0xffd700);

    this._addText("Defeat 8 knights to claim the Champion's Crown", S_BODY, sw / 2, py + ph * 0.42);

    // Tournament bracket preview — 8 knight color pips
    const bpY = py + ph * 0.46;
    const bpW = pw * 0.5;
    const bpX = sw / 2 - bpW / 2;
    for (let ki = 0; ki < TOURNAMENT_KNIGHTS.length; ki++) {
      const k = TOURNAMENT_KNIGHTS[ki];
      const kx = bpX + (ki / (TOURNAMENT_KNIGHTS.length - 1)) * bpW;
      // Pip — mini shield polygon with knight color
      g.moveTo(kx, bpY - 4); g.quadraticCurveTo(kx + 4, bpY - 3, kx + 4, bpY);
      g.lineTo(kx + 2, bpY + 3); g.lineTo(kx, bpY + 5);
      g.lineTo(kx - 2, bpY + 3); g.lineTo(kx - 4, bpY);
      g.quadraticCurveTo(kx - 4, bpY - 3, kx, bpY - 4); g.fill(k.color);
      // Inner highlight
      g.moveTo(kx, bpY - 2); g.lineTo(kx + 2, bpY); g.lineTo(kx, bpY + 2); g.lineTo(kx - 2, bpY);
      g.fill({ color: 0x000000, alpha: 0.25 });
      // Connector line
      if (ki < TOURNAMENT_KNIGHTS.length - 1) {
        const nx = bpX + ((ki + 1) / (TOURNAMENT_KNIGHTS.length - 1)) * bpW;
        g.moveTo(kx + 5, bpY); g.lineTo(nx - 5, bpY);
        g.stroke({ color: 0x445566, width: 0.8 });
      }
    }

    // High score
    const best = this._state.bestRound;
    if (best > 0) {
      const bk = best >= TOURNAMENT_KNIGHTS.length ? "ALL" : TOURNAMENT_KNIGHTS[best - 1].name;
      this._addText(`Personal Best: ${best}/${TOURNAMENT_KNIGHTS.length} (last: ${bk})`, S_STAMINA, sw / 2, py + ph * 0.51);
      // Highlight defeated pips
      for (let ki = 0; ki < best; ki++) {
        const kx = bpX + (ki / (TOURNAMENT_KNIGHTS.length - 1)) * bpW;
        // Defeated glow ring (polygon)
        g.moveTo(kx, bpY - 6); g.quadraticCurveTo(kx + 6, bpY - 4, kx + 6, bpY + 1);
        g.lineTo(kx + 3, bpY + 5); g.lineTo(kx, bpY + 7); g.lineTo(kx - 3, bpY + 5);
        g.lineTo(kx - 6, bpY + 1); g.quadraticCurveTo(kx - 6, bpY - 4, kx, bpY - 6);
        g.stroke({ color: 0x44ff44, width: 1 });
      }
    }

    // Scrollwork divider above controls
    const divY2 = py + ph * 0.54;
    g.moveTo(px + 50, divY2);
    for (let sc = 0; sc < 8; sc++) {
      const scx2 = px + 50 + sc * ((pw - 100) / 8);
      g.quadraticCurveTo(scx2 + (pw - 100) / 16, divY2 + (sc % 2 === 0 ? -3 : 3), scx2 + (pw - 100) / 8, divY2);
    }
    g.stroke({ color: 0x886622, width: 0.8 });

    // Controls in a nice box
    const cby = py + ph * 0.56;
    g.roundRect(px + 40, cby, pw - 80, ph * 0.28, 4); g.fill({ color: 0x000000, alpha: 0.3 });
    g.roundRect(px + 40, cby, pw - 80, ph * 0.28, 4); g.stroke({ color: 0x445566, width: 1 });
    this._addText("CONTROLS", S_AIM_LABEL, sw / 2, cby + 14);
    this._addText("W/S  or  \u2191/\u2193    Aim Lance (high / mid / low)", S_AIM_INACTIVE, sw / 2, cby + ph * 0.06);
    this._addText("A/D  or  \u2190/\u2192    Position Shield (high / mid / low)", S_AIM_INACTIVE, sw / 2, cby + ph * 0.11);
    this._addText("SPACE            Confirm & Charge", S_AIM_INACTIVE, sw / 2, cby + ph * 0.16);
    this._addText("SPACE mid-charge Hit timing meter for bonus damage", S_AIM_INACTIVE, sw / 2, cby + ph * 0.21);
    this._addText("W/S/A/D late     Feint! Shift zone mid-charge (costs stamina)", S_AIM_INACTIVE, sw / 2, cby + ph * 0.26);

    // Difficulty selector
    const dfy = py + ph * 0.85;
    this._addText("DIFFICULTY (A/D):", S_AIM_LABEL, sw / 2, dfy - 14);
    const diffs: Difficulty[] = ["squire", "knight", "champion"];
    for (let di = 0; di < 3; di++) {
      const d = DIFFICULTY_MAP[diffs[di]];
      const sel = this._state.difficultyCursor === di;
      const dstyle = sel ? S_DIFF_ACTIVE : S_DIFF_INACTIVE;
      const label = sel ? `[\u25B6 ${d.label} \u25C0]` : d.label;
      this._addText(label, dstyle, px + 60 + di * (pw / 3), dfy + 4);
    }

    // Laurel wreath around start button area
    const lwY = py + ph * 0.95;
    const lwX = sw / 2;
    // Left laurel branch
    for (let lf = 0; lf < 5; lf++) {
      const la = -0.3 - lf * 0.22;
      const lr = 45 + lf * 4;
      const lfx = lwX + Math.cos(la) * lr - 15;
      const lfy = lwY + Math.sin(la) * lr * 0.3;
      g.moveTo(lfx, lfy);
      g.quadraticCurveTo(lfx - 5, lfy - 4, lfx - 8, lfy - 2);
      g.quadraticCurveTo(lfx - 5, lfy + 1, lfx, lfy);
      g.fill({ color: 0x446622, alpha: 0.3 });
    }
    // Right laurel branch (mirrored)
    for (let lf = 0; lf < 5; lf++) {
      const la = Math.PI + 0.3 + lf * 0.22;
      const lr = 45 + lf * 4;
      const lfx = lwX + Math.cos(la) * lr + 15;
      const lfy = lwY + Math.sin(la) * lr * 0.3;
      g.moveTo(lfx, lfy);
      g.quadraticCurveTo(lfx + 5, lfy - 4, lfx + 8, lfy - 2);
      g.quadraticCurveTo(lfx + 5, lfy + 1, lfx, lfy);
      g.fill({ color: 0x446622, alpha: 0.3 });
    }
    // Laurel stems
    g.moveTo(lwX - 15, lwY);
    g.quadraticCurveTo(lwX - 50, lwY - 12, lwX - 65, lwY + 2);
    g.stroke({ color: 0x446622, width: 1, alpha: 0.3 } as any);
    g.moveTo(lwX + 15, lwY);
    g.quadraticCurveTo(lwX + 50, lwY - 12, lwX + 65, lwY + 2);
    g.stroke({ color: 0x446622, width: 1, alpha: 0.3 } as any);

    // Menu buttons row
    const mbY = py + ph * 0.91;
    this._addText("[C] Controls    [B] Bestiary    [R] Records", S_AIM_INACTIVE, sw / 2, mbY);

    const startText = this._addText("PRESS SPACE TO BEGIN", S_BTN, sw / 2, py + ph * 0.96);
    startText.alpha = 0.5 + Math.sin(this._elapsed * 3) * 0.5;
  }

  // ---- Ability Select Screen -----------------------------------------------

  private _renderAbilitySelect(g: Graphics, sw: number, sh: number): void {
    this._renderArenaBackground(g, sw, sh);
    g.rect(0, 0, sw, sh); g.fill({ color: 0x000000, alpha: 0.65 });

    const s = this._state;
    const px = sw * 0.12, py = sh * 0.06, pw = sw * 0.76, ph = sh * 0.88;
    g.roundRect(px, py, pw, ph, 8); g.fill({ color: 0x0a0a18, alpha: 0.92 });
    g.roundRect(px, py, pw, ph, 8); g.stroke({ color: 0xffd700, width: 2 });
    g.roundRect(px + 5, py + 5, pw - 10, ph - 10, 5); g.stroke({ color: 0x886622, width: 0.8 });

    // Header icon — gauntlet/fist
    const gx = sw / 2, gy = py + 14;
    g.moveTo(gx - 6, gy + 4); g.lineTo(gx - 8, gy - 2); g.lineTo(gx - 4, gy - 6);
    g.lineTo(gx + 4, gy - 6); g.lineTo(gx + 8, gy - 2); g.lineTo(gx + 6, gy + 4);
    g.lineTo(gx + 4, gy + 6); g.lineTo(gx - 4, gy + 6); g.fill(0xffd700);

    this._addText("CHOOSE YOUR ABILITY", S_TITLE, sw / 2, py + 32);

    // Difficulty badge
    const diffDef = DIFFICULTY_MAP[s.difficulty];
    const dbx = sw / 2, dby = py + 58;
    g.roundRect(dbx - 50, dby - 8, 100, 18, 4); g.fill({ color: 0x000000, alpha: 0.3 });
    g.roundRect(dbx - 50, dby - 8, 100, 18, 4); g.stroke({ color: 0x886622, width: 0.8 });
    this._addText(`\u2694 ${diffDef.label}`, S_SUBTITLE, dbx, dby + 1);

    // Scrollwork divider
    const abDivY = py + 75;
    g.moveTo(px + 40, abDivY);
    g.quadraticCurveTo(sw / 2, abDivY - 4, px + pw - 40, abDivY);
    g.stroke({ color: 0x886622, width: 0.8 });

    const itemH = 68;
    const startY = py + 85;

    for (let i = 0; i < SELECTABLE_ABILITIES.length; i++) {
      const ab = PLAYER_ABILITIES[SELECTABLE_ABILITIES[i]];
      const iy = startY + i * itemH;
      const selected = s.abilityCursor === i;

      // Glow on selected
      if (selected) {
        g.roundRect(px + 18, iy - 2, pw - 36, itemH - 4, 7);
        g.fill({ color: ab.color, alpha: 0.04 + Math.sin(this._elapsed * 3) * 0.02 });
      }
      g.roundRect(px + 20, iy, pw - 40, itemH - 8, 6);
      g.fill({ color: selected ? 0x1a1a3a : 0x0a0a18, alpha: 0.85 });
      g.roundRect(px + 20, iy, pw - 40, itemH - 8, 6);
      g.stroke({ color: selected ? ab.color : 0x333344, width: selected ? 2 : 1 });

      // Ability-specific polygon icon
      const iconX = px + 44; const iconY = iy + (itemH - 8) / 2;
      if (SELECTABLE_ABILITIES[i] === "ironWill") {
        // Shield polygon
        g.moveTo(iconX, iconY - 10); g.quadraticCurveTo(iconX + 9, iconY - 8, iconX + 9, iconY);
        g.lineTo(iconX + 5, iconY + 8); g.lineTo(iconX, iconY + 11);
        g.lineTo(iconX - 5, iconY + 8); g.lineTo(iconX - 9, iconY);
        g.quadraticCurveTo(iconX - 9, iconY - 8, iconX, iconY - 10);
        g.fill(selected ? ab.color : 0x333344);
      } else if (SELECTABLE_ABILITIES[i] === "swiftStrike") {
        // Lightning bolt polygon
        g.moveTo(iconX - 2, iconY - 10); g.lineTo(iconX + 5, iconY - 10);
        g.lineTo(iconX, iconY - 1); g.lineTo(iconX + 6, iconY - 2);
        g.lineTo(iconX - 2, iconY + 11); g.lineTo(iconX + 1, iconY + 2);
        g.lineTo(iconX - 5, iconY + 2); g.fill(selected ? ab.color : 0x333344);
      } else if (SELECTABLE_ABILITIES[i] === "shieldMaster") {
        // Double shield polygon
        g.moveTo(iconX - 3, iconY - 8); g.quadraticCurveTo(iconX + 4, iconY - 7, iconX + 4, iconY);
        g.lineTo(iconX, iconY + 8); g.lineTo(iconX - 6, iconY);
        g.quadraticCurveTo(iconX - 6, iconY - 7, iconX - 3, iconY - 8); g.fill(selected ? ab.color : 0x333344);
        g.moveTo(iconX + 1, iconY - 6); g.quadraticCurveTo(iconX + 8, iconY - 5, iconX + 8, iconY + 2);
        g.lineTo(iconX + 4, iconY + 9); g.lineTo(iconX - 1, iconY + 2);
        g.quadraticCurveTo(iconX - 1, iconY - 5, iconX + 1, iconY - 6);
        g.fill({ color: selected ? ab.color : 0x333344, alpha: 0.6 });
      } else {
        // Crown polygon (crowd champion)
        g.moveTo(iconX - 8, iconY + 4); g.lineTo(iconX + 8, iconY + 4);
        g.lineTo(iconX + 8, iconY); g.lineTo(iconX + 6, iconY - 3);
        g.lineTo(iconX + 8, iconY - 7); g.lineTo(iconX + 4, iconY - 5);
        g.lineTo(iconX, iconY - 9); g.lineTo(iconX - 4, iconY - 5);
        g.lineTo(iconX - 8, iconY - 7); g.lineTo(iconX - 6, iconY - 3);
        g.lineTo(iconX - 8, iconY); g.fill(selected ? ab.color : 0x333344);
      }

      const prefix = selected ? "\u25B6 " : "  ";
      const nameStyle = new TextStyle({ fontFamily: "monospace", fontSize: 15, fill: selected ? ab.color : 0x888888, fontWeight: "bold" });
      this._addText(`${prefix}${ab.name}`, nameStyle, px + 65, iy + 16, 0);
      this._addText(ab.desc, selected ? S_BODY : S_AIM_INACTIVE, px + 65, iy + 34, 0);
    }

    // Challenge mode selector (if unlocked)
    const unlocked = s.mastery.totalWins > 0 || s.bestRound >= 4;
    if (unlocked) {
      const cmy = py + ph - 60;
      g.roundRect(px + 20, cmy - 10, pw - 40, 35, 4); g.fill({ color: 0x000000, alpha: 0.25 });
      this._addText("CHALLENGE MODE (A/D):", S_AIM_LABEL, sw / 2, cmy - 2);
      const modes: ChallengeMode[] = ["normal", "ironGauntlet", "flawless", "handicap"];
      for (let ci = 0; ci < modes.length; ci++) {
        const cd = CHALLENGE_DEFS[modes[ci]];
        const sel = s.challengeCursor === ci;
        // Challenge icon (small colored diamond)
        const cdx = px + 35 + ci * (pw / 4);
        if (sel) {
          g.moveTo(cdx - 3, cmy + 14); g.lineTo(cdx, cmy + 11); g.lineTo(cdx + 3, cmy + 14); g.lineTo(cdx, cmy + 17);
          g.fill(cd.color);
        }
        const cStyle = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: sel ? cd.color : 0x445566, fontWeight: sel ? "bold" : "normal" });
        this._addText(sel ? `${cd.name}` : cd.name, cStyle, cdx + 8, cmy + 14, 0);
      }
    }

    // Mastery stats
    const runCount = s.mastery.totalRuns;
    if (runCount > 0) {
      this._addText(`Runs: ${runCount} | Clears: ${s.mastery.totalWins}`, S_STAT_LABEL, sw / 2, py + ph - 30);
    }

    // Random bracket toggle + cosmetics
    if (s.mastery.totalWins > 0 || s.bestRound >= 4) {
      const rbStyle = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: s.randomBracket ? 0xff8800 : 0x445566, fontWeight: s.randomBracket ? "bold" : "normal" });
      this._addText(`[R] Random Bracket: ${s.randomBracket ? "ON" : "OFF"}`, rbStyle, sw / 2, py + ph - 28);
    }
    if (s.unlockedCosmetics.length > 0) {
      const cosNames = COSMETIC_UNLOCKS.filter(c => s.unlockedCosmetics.includes(c.id)).map(c => c.name).join(", ");
      this._addText(`Unlocked: ${cosNames}`, S_STAMINA, sw / 2, py + ph - 42);
    }
    this._addText("W/S: Ability  |  A/D: Challenge  |  R: Bracket  |  SPACE: Start", S_AIM_INACTIVE, sw / 2, py + ph - 12);
  }

  // ---- Controls Screen ----------------------------------------------------

  private _renderControls(g: Graphics, sw: number, sh: number): void {
    this._renderArenaBackground(g, sw, sh);
    g.rect(0, 0, sw, sh); g.fill({ color: 0x000000, alpha: 0.7 });

    const px = sw * 0.08, py = sh * 0.03, pw = sw * 0.84, ph = sh * 0.94;
    g.roundRect(px, py, pw, ph, 8); g.fill({ color: 0x0a0a18, alpha: 0.94 });
    g.roundRect(px, py, pw, ph, 8); g.stroke({ color: 0xffd700, width: 2 });
    g.roundRect(px + 5, py + 5, pw - 10, ph - 10, 5); g.stroke({ color: 0x886622, width: 0.8 });

    // Decorative crossed swords header icon
    const hx = sw / 2, hy = py + 14;
    g.moveTo(hx - 20, hy - 4); g.lineTo(hx + 8, hy + 6); g.stroke({ color: 0xffd700, width: 1.5 });
    g.moveTo(hx + 20, hy - 4); g.lineTo(hx - 8, hy + 6); g.stroke({ color: 0xffd700, width: 1.5 });
    // Sword pommels (diamond polygons)
    g.moveTo(hx - 22, hy - 7); g.lineTo(hx - 20, hy - 5); g.lineTo(hx - 22, hy - 3); g.lineTo(hx - 24, hy - 5); g.fill(0xffd700);
    g.moveTo(hx + 22, hy - 7); g.lineTo(hx + 24, hy - 5); g.lineTo(hx + 22, hy - 3); g.lineTo(hx + 20, hy - 5); g.fill(0xffd700);

    this._addText("CONTROLS & MECHANICS", S_TITLE, sw / 2, py + 30);

    // Scrollwork divider under title
    const tdY = py + 46;
    g.moveTo(px + 60, tdY);
    for (let sc = 0; sc < 6; sc++) { g.quadraticCurveTo(px + 60 + sc * ((pw - 120) / 6) + (pw - 120) / 12, tdY + (sc % 2 === 0 ? -3 : 3), px + 60 + (sc + 1) * ((pw - 120) / 6), tdY); }
    g.stroke({ color: 0x886622, width: 0.8 });

    // Central vertical divider
    g.moveTo(sw / 2, py + 55); g.lineTo(sw / 2, py + ph - 35);
    g.stroke({ color: 0x333344, width: 1 });

    const lx = px + 25; const rx2 = sw / 2 + 15;
    let cy = py + 58;
    const hdr = (text: string, x: number, y: number, iconColor = 0xffcc44) => {
      // Section header with small diamond icon
      g.moveTo(x - 70, y); g.lineTo(x - 64, y - 4); g.lineTo(x - 58, y); g.lineTo(x - 64, y + 4); g.fill(iconColor);
      this._addText(text, S_AIM_LABEL, x, y);
      // Underline
      g.moveTo(x - 55, y + 7); g.lineTo(x + 55, y + 7); g.stroke({ color: iconColor, width: 0.5, alpha: 0.3 } as any);
    };
    const row = (key: string, desc: string, x: number, y: number) => {
      // Key in bright, desc in dim
      const keyStyle = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xaabbcc, fontWeight: "bold" });
      this._addText(key, keyStyle, x, y, 0);
      this._addText(desc, S_AIM_INACTIVE, x + 75, y, 0);
    };

    // Left column — Controls with section icons
    hdr("AIMING PHASE", lx + 80, cy, 0x44aaff); cy += 16;
    // Lance icon
    g.moveTo(lx + 5, cy + 3); g.lineTo(lx + 15, cy); g.lineTo(lx + 5, cy - 3); g.fill(0x44aaff);
    row("W / \u2191", "Aim lance HIGH", lx + 20, cy); cy += 13;
    row("S / \u2193", "Aim lance LOW", lx + 20, cy); cy += 13;
    // Shield icon
    g.moveTo(lx + 8, cy - 4); g.quadraticCurveTo(lx + 13, cy - 5, lx + 13, cy);
    g.lineTo(lx + 8, cy + 5); g.lineTo(lx + 3, cy); g.quadraticCurveTo(lx + 3, cy - 5, lx + 8, cy - 4);
    g.fill(0x44aaff);
    row("A / \u2190", "Shield HIGH", lx + 20, cy); cy += 13;
    row("D / \u2192", "Shield LOW", lx + 20, cy); cy += 13;
    row("SPACE", "Start charge", lx + 20, cy); cy += 20;

    hdr("CHARGING PHASE", lx + 80, cy, 0xff8844); cy += 16;
    // Power meter icon (polygon)
    g.roundRect(lx + 3, cy - 3, 14, 6, 2); g.stroke({ color: 0xff8844, width: 1 });
    // Needle (triangle pointer)
    g.moveTo(lx + 9, cy - 5); g.lineTo(lx + 11, cy); g.lineTo(lx + 9, cy + 5); g.lineTo(lx + 7, cy); g.fill(0xff8844);
    row("SPACE", "Lock timing meter", lx + 20, cy); cy += 13;
    row("W/S/A/D", "Feint (last 40%, -15 stam)", lx + 20, cy); cy += 20;

    hdr("GENERAL", lx + 80, cy, 0x888888); cy += 16;
    row("ESC", "Pause / Back", lx + 20, cy); cy += 13;
    row("SPACE", "Skip / Confirm", lx + 20, cy); cy += 13;

    // Right column — Mechanics with color-coded entries
    cy = py + 58;
    hdr("SCORING", rx2 + 80, cy, 0xff4444); cy += 16;
    // Color-coded score entries
    const scoreRow = (label: string, pts: string, color: number, x: number, y: number) => {
      // Score pip (hexagon polygon)
      g.moveTo(x + 3, y - 3); g.lineTo(x + 6, y - 1.5); g.lineTo(x + 6, y + 1.5);
      g.lineTo(x + 3, y + 3); g.lineTo(x, y + 1.5); g.lineTo(x, y - 1.5); g.fill(color);
      const ls = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: color, fontWeight: "bold" });
      this._addText(label, ls, x + 12, y, 0);
      this._addText(pts, S_AIM_INACTIVE, x + 90, y, 0);
    };
    scoreRow("UNHORSE", "3 pts (lance far from shield)", 0xff2200, rx2, cy); cy += 13;
    scoreRow("STRONG HIT", "2 pts (perfect timing)", 0xff6644, rx2, cy); cy += 13;
    scoreRow("HIT", "1 pt", 0xffaa44, rx2, cy); cy += 13;
    scoreRow("GLANCE", "0 pts (low stamina)", 0xaaaa44, rx2, cy); cy += 13;
    scoreRow("BLOCK", "0 pts (lance = shield)", 0x4488ff, rx2, cy); cy += 20;

    hdr("TIMING METER", rx2 + 80, cy, 0x44cc44); cy += 16;
    // Mini meter diagram
    const mDx = rx2 + 5, mDy = cy + 2;
    g.roundRect(mDx, mDy - 4, 60, 8, 3); g.fill({ color: 0x663322, alpha: 0.6 });
    // Good zone (polygon with tapered edges)
    g.moveTo(mDx + 12, mDy - 4); g.lineTo(mDx + 48, mDy - 4);
    g.lineTo(mDx + 46, mDy + 4); g.lineTo(mDx + 14, mDy + 4); g.fill({ color: 0x666622, alpha: 0.5 });
    // Perfect zone (polygon)
    g.moveTo(mDx + 22, mDy - 4); g.lineTo(mDx + 38, mDy - 4);
    g.lineTo(mDx + 36, mDy + 4); g.lineTo(mDx + 24, mDy + 4); g.fill({ color: 0x226633, alpha: 0.7 });
    g.roundRect(mDx, mDy - 4, 60, 8, 3); g.stroke({ color: 0x888888, width: 0.5 });
    this._addText("PERFECT = 2x dmg, +unhorse", S_AIM_INACTIVE, rx2 + 75, cy, 0); cy += 13;
    this._addText("GOOD = normal damage", S_AIM_INACTIVE, rx2 + 75, cy, 0); cy += 13;
    this._addText("WEAK = 30% glance chance", S_AIM_INACTIVE, rx2 + 75, cy, 0); cy += 20;

    hdr("STAMINA", rx2 + 80, cy, 0x44ddaa); cy += 16;
    // Mini stamina bar
    g.roundRect(rx2 + 5, cy - 3, 50, 6, 3); g.fill({ color: 0x44cc66, alpha: 0.5 });
    g.roundRect(rx2 + 5, cy - 3, 50, 6, 3); g.stroke({ color: 0x666666, width: 0.5 });
    this._addText("Hit: -15  Unhorsed: -40  Feint: -15", S_AIM_INACTIVE, rx2 + 65, cy, 0); cy += 13;
    this._addText("Regen: +8/tilt  Below 20: EXHAUSTED", S_AIM_INACTIVE, rx2 + 65, cy, 0); cy += 20;

    hdr("CROWD FAVOR", rx2 + 80, cy, 0xffd700); cy += 16;
    // Mini crowd bar
    g.roundRect(rx2 + 5, cy - 3, 50, 6, 3); g.fill({ color: 0xddaa44, alpha: 0.5 });
    g.roundRect(rx2 + 5, cy - 3, 50, 6, 3); g.stroke({ color: 0x666666, width: 0.5 });
    this._addText("Perfect: +25%  Hit: +10%  Unhorse: +50%", S_AIM_INACTIVE, rx2 + 65, cy, 0); cy += 13;
    this._addText("When full: next hit gets +1 bonus!", S_AIM_INACTIVE, rx2 + 65, cy, 0);

    this._addText("ESC or SPACE to return", S_BTN, sw / 2, py + ph - 16);
  }

  // ---- Stats/Records Screen -----------------------------------------------

  private _renderStats(g: Graphics, sw: number, sh: number): void {
    this._renderArenaBackground(g, sw, sh);
    g.rect(0, 0, sw, sh); g.fill({ color: 0x000000, alpha: 0.7 });

    const s = this._state;
    const m = s.mastery;
    const px = sw * 0.1, py = sh * 0.04, pw = sw * 0.8, ph = sh * 0.92;
    g.roundRect(px, py, pw, ph, 8); g.fill({ color: 0x0a0a18, alpha: 0.94 });
    g.roundRect(px, py, pw, ph, 8); g.stroke({ color: 0xffd700, width: 2 });

    this._addText("RECORDS & ACHIEVEMENTS", S_TITLE, sw / 2, py + 28);

    // Global stats
    let cy = py + 65;
    const lx = px + pw * 0.15;
    const rx2 = px + pw * 0.55;

    // Stats grid
    g.roundRect(px + 20, cy - 5, pw - 40, 70, 4); g.fill({ color: 0x000000, alpha: 0.3 });
    this._addText("CAREER STATS", S_AIM_LABEL, sw / 2, cy + 2);
    cy += 20;

    this._addText("Tournament Runs", S_STAT_LABEL, lx, cy);
    this._addText(`${m.totalRuns}`, S_STAT_VALUE, lx + 120, cy);
    this._addText("Full Clears", S_STAT_LABEL, rx2, cy);
    this._addText(`${m.totalWins}`, S_STAT_VALUE, rx2 + 100, cy);
    cy += 18;
    this._addText("Personal Best", S_STAT_LABEL, lx, cy);
    this._addText(`${s.bestRound}/${TOURNAMENT_KNIGHTS.length}`, S_STAT_VALUE, lx + 120, cy);
    this._addText("Win Rate", S_STAT_LABEL, rx2, cy);
    const winRate = m.totalRuns > 0 ? Math.round(m.totalWins / m.totalRuns * 100) : 0;
    this._addText(`${winRate}%`, S_STAT_VALUE, rx2 + 100, cy);
    cy += 30;

    // Challenge completions
    g.roundRect(px + 20, cy - 5, pw - 40, 45, 4); g.fill({ color: 0x000000, alpha: 0.3 });
    this._addText("CHALLENGE COMPLETIONS", S_AIM_LABEL, sw / 2, cy + 2);
    cy += 20;
    const challenges: ChallengeMode[] = ["normal", "ironGauntlet", "flawless", "handicap"];
    for (let ci = 0; ci < challenges.length; ci++) {
      const cd = CHALLENGE_DEFS[challenges[ci]];
      const cleared = m.challengeClears[challenges[ci]];
      const cStyle = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: cleared ? cd.color : 0x334455, fontWeight: cleared ? "bold" : "normal" });
      const icon = cleared ? "\u2713" : "\u2717";
      this._addText(`${icon} ${cd.name}`, cStyle, px + 40 + ci * (pw / 4), cy);
    }
    cy += 30;

    // Per-knight mastery
    g.roundRect(px + 20, cy - 5, pw - 40, TOURNAMENT_KNIGHTS.length * 22 + 25, 4);
    g.fill({ color: 0x000000, alpha: 0.3 });
    this._addText("KNIGHT MASTERY", S_AIM_LABEL, sw / 2, cy + 2);
    cy += 20;

    // Column headers
    this._addText("Knight", S_AIM_INACTIVE, px + 50, cy, 0);
    this._addText("Wins", S_AIM_INACTIVE, px + pw * 0.45, cy);
    this._addText("Unhorses", S_AIM_INACTIVE, px + pw * 0.6, cy);
    this._addText("Perfect Wins", S_AIM_INACTIVE, px + pw * 0.78, cy);
    cy += 16;

    for (let ki = 0; ki < TOURNAMENT_KNIGHTS.length; ki++) {
      const k = TOURNAMENT_KNIGHTS[ki];
      const km = m.knights[k.name] ?? { wins: 0, unhorses: 0, perfectWins: 0 };
      const hasData = km.wins > 0;
      const kStyle = hasData ? S_BODY : S_AIM_INACTIVE;
      this._addText(`${k.name} ${k.title}`, kStyle, px + 50, cy, 0);
      this._addText(`${km.wins}`, hasData ? S_STAT_VALUE : S_AIM_INACTIVE, px + pw * 0.45, cy);
      this._addText(`${km.unhorses}`, hasData ? S_STAT_VALUE : S_AIM_INACTIVE, px + pw * 0.6, cy);
      this._addText(`${km.perfectWins}`, hasData ? S_STAT_VALUE : S_AIM_INACTIVE, px + pw * 0.78, cy);
      // Color pip (mini shield polygon)
      const kpx = px + 38;
      g.moveTo(kpx, cy - 3); g.quadraticCurveTo(kpx + 3, cy - 2, kpx + 3, cy);
      g.lineTo(kpx + 1.5, cy + 2.5); g.lineTo(kpx, cy + 3.5);
      g.lineTo(kpx - 1.5, cy + 2.5); g.lineTo(kpx - 3, cy);
      g.quadraticCurveTo(kpx - 3, cy - 2, kpx, cy - 3); g.fill(hasData ? k.color : 0x222233);
      cy += 22;
    }

    // Abilities reference
    cy += 10;
    g.roundRect(px + 20, cy - 5, pw - 40, 50, 4); g.fill({ color: 0x000000, alpha: 0.3 });
    this._addText("PLAYER ABILITIES", S_AIM_LABEL, sw / 2, cy + 2);
    cy += 18;
    for (let ai = 0; ai < SELECTABLE_ABILITIES.length; ai++) {
      const ab = PLAYER_ABILITIES[SELECTABLE_ABILITIES[ai]];
      const abStyle = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: ab.color, fontWeight: "bold" });
      this._addText(`${ab.name}: ${ab.desc}`, abStyle, px + 40 + ai * (pw / 4), cy, 0);
    }

    // Cosmetic unlocks
    cy += 20;
    g.roundRect(px + 20, cy - 5, pw - 40, 45, 4); g.fill({ color: 0x000000, alpha: 0.3 });
    this._addText("COSMETIC UNLOCKS", S_AIM_LABEL, sw / 2, cy + 2);
    cy += 16;
    for (let ci = 0; ci < COSMETIC_UNLOCKS.length; ci++) {
      const cu = COSMETIC_UNLOCKS[ci];
      const unlocked = cu.check(m);
      const cuStyle = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: unlocked ? cu.color : 0x334455, fontWeight: unlocked ? "bold" : "normal" });
      const icon = unlocked ? "\u2713" : "\u2717";
      // Color pip
      g.circle(px + 32 + ci * (pw / COSMETIC_UNLOCKS.length), cy + 1, 3);
      g.fill(unlocked ? cu.color : 0x222233);
      this._addText(`${icon} ${cu.name}`, cuStyle, px + 42 + ci * (pw / COSMETIC_UNLOCKS.length), cy, 0);
    }

    this._addText("ESC or SPACE to return", S_BTN, sw / 2, py + ph - 18);
  }

  // ---- Bestiary Screen ----------------------------------------------------

  private _renderBestiary(g: Graphics, sw: number, sh: number): void {
    this._renderArenaBackground(g, sw, sh);
    g.rect(0, 0, sw, sh); g.fill({ color: 0x000000, alpha: 0.7 });

    const s = this._state;
    const px = sw * 0.08, py = sh * 0.04, pw = sw * 0.84, ph = sh * 0.92;
    g.roundRect(px, py, pw, ph, 8); g.fill({ color: 0x0a0a18, alpha: 0.94 });
    g.roundRect(px, py, pw, ph, 8); g.stroke({ color: 0xffd700, width: 2 });

    this._addText("KNIGHT BESTIARY", S_TITLE, sw / 2, py + 28);

    // Knight list (left panel)
    const listW = pw * 0.35;
    for (let ki = 0; ki < TOURNAMENT_KNIGHTS.length; ki++) {
      const k = TOURNAMENT_KNIGHTS[ki];
      const ky = py + 58 + ki * 24;
      const selected = s.bestiaryCursor === ki;
      if (selected) {
        g.roundRect(px + 10, ky - 4, listW - 10, 20, 3);
        g.fill({ color: k.color, alpha: 0.15 });
        g.roundRect(px + 10, ky - 4, listW - 10, 20, 3);
        g.stroke({ color: k.color, width: 1 });
      }
      // Color pip (shield polygon)
      const bpx = px + 22, bpy2 = ky + 6;
      g.moveTo(bpx, bpy2 - 4); g.quadraticCurveTo(bpx + 4, bpy2 - 3, bpx + 4, bpy2);
      g.lineTo(bpx + 2, bpy2 + 3); g.lineTo(bpx, bpy2 + 5);
      g.lineTo(bpx - 2, bpy2 + 3); g.lineTo(bpx - 4, bpy2);
      g.quadraticCurveTo(bpx - 4, bpy2 - 3, bpx, bpy2 - 4); g.fill(k.color);
      const nameStyle = selected ? S_SHOP_ACTIVE : S_SHOP_ITEM;
      this._addText(`${selected ? "\u25B6 " : "  "}${k.name}`, nameStyle, px + 32, ky + 6, 0);
      // Stars (condensed)
      const stCount = Math.ceil(k.skill * 5);
      this._addText("\u2605".repeat(stCount), S_AIM_INACTIVE, px + listW - 15, ky + 6);
    }

    // Detail panel (right side)
    const detailX = px + listW + 15;
    const detailW = pw - listW - 30;
    const k = TOURNAMENT_KNIGHTS[s.bestiaryCursor];
    const km = s.mastery.knights[k.name] ?? { wins: 0, unhorses: 0, perfectWins: 0 };

    g.roundRect(detailX, py + 55, detailW, ph - 80, 6);
    g.fill({ color: 0x111122, alpha: 0.6 });
    g.roundRect(detailX, py + 55, detailW, ph - 80, 6);
    g.stroke({ color: k.color, width: 1 });

    let dy = py + 70;
    // Knight name and title
    const knightNameStyle = new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: k.color, fontWeight: "bold", dropShadow: { color: 0x000000, blur: 3, distance: 1, angle: Math.PI / 4 } });
    this._addText(k.name, knightNameStyle, detailX + detailW / 2, dy); dy += 20;
    this._addText(k.title, S_SUBTITLE, detailX + detailW / 2, dy); dy += 25;

    // Knight silhouette
    this._drawKnightSilhouette(g, detailX + detailW / 2, dy + 30, k.color, true, k.heraldry, k.color, k.color2);
    dy += 80;

    // Stats
    const starsStr = "\u2605".repeat(Math.ceil(k.skill * 5)) + "\u2606".repeat(5 - Math.ceil(k.skill * 5));
    this._addText(`Skill: ${starsStr}`, S_AIM_LABEL, detailX + detailW / 2, dy); dy += 18;

    // Ability
    if (k.abilityName) {
      const abStyle = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xff8844, fontWeight: "bold" });
      this._addText(`\u2694 ${k.abilityName}`, abStyle, detailX + detailW / 2, dy); dy += 14;
      this._addText(k.abilityDesc, S_AIM_INACTIVE, detailX + detailW / 2, dy); dy += 20;
    } else {
      this._addText("No special ability", S_AIM_INACTIVE, detailX + detailW / 2, dy); dy += 20;
    }

    // Heraldry
    this._addText(`Heraldry: ${k.heraldry}`, S_AIM_INACTIVE, detailX + detailW / 2, dy); dy += 18;

    // Taunt
    g.roundRect(detailX + 10, dy - 4, detailW - 20, 30, 4);
    g.fill({ color: 0x000000, alpha: 0.3 });
    this._addText(`"${k.taunt}"`, S_BODY_ITALIC, detailX + detailW / 2, dy + 11); dy += 38;

    // Defeat quote
    g.roundRect(detailX + 10, dy - 4, detailW - 20, 30, 4);
    g.fill({ color: 0x000000, alpha: 0.3 });
    this._addText(`On defeat: "${k.defeated}"`, S_BODY_ITALIC, detailX + detailW / 2, dy + 11); dy += 38;

    // Your mastery of this knight
    g.roundRect(detailX + 10, dy - 4, detailW - 20, 52, 4);
    g.fill({ color: 0x000000, alpha: 0.3 });
    this._addText("YOUR MASTERY", S_AIM_LABEL, detailX + detailW / 2, dy + 4); dy += 18;
    if (km.wins > 0) {
      this._addText(`Victories: ${km.wins}`, S_STAT_VALUE, detailX + detailW * 0.25, dy);
      this._addText(`Unhorses: ${km.unhorses}`, S_STAT_VALUE, detailX + detailW * 0.55, dy);
      this._addText(`Perfect: ${km.perfectWins}`, S_STAT_VALUE, detailX + detailW * 0.85, dy);
    } else {
      this._addText("Not yet defeated", S_AIM_INACTIVE, detailX + detailW / 2, dy);
    }

    this._addText("W/S: Navigate    ESC/SPACE: Return", S_BTN, sw / 2, py + ph - 18);
  }

  // ---- Pause Screen -------------------------------------------------------

  private _renderPause(g: Graphics, sw: number, sh: number): void {
    // Show arena behind (frozen)
    this._renderArenaBackground(g, sw, sh);
    g.rect(0, 0, sw, sh); g.fill({ color: 0x000000, alpha: 0.65 });

    const px = sw * 0.22, py = sh * 0.12, pw = sw * 0.56, ph = sh * 0.76;
    g.roundRect(px, py, pw, ph, 10); g.fill({ color: 0x0a0a18, alpha: 0.94 });
    g.roundRect(px, py, pw, ph, 10); g.stroke({ color: 0xffd700, width: 2 });
    g.roundRect(px + 4, py + 4, pw - 8, ph - 8, 7); g.stroke({ color: 0x886622, width: 0.8 });

    // Pause icon (polygon bars with beveled ends)
    const pix = sw / 2, piy = py + 20;
    // Left bar
    g.moveTo(pix - 8, piy - 7); g.lineTo(pix - 4, piy - 7); g.lineTo(pix - 3, piy - 5);
    g.lineTo(pix - 3, piy + 5); g.lineTo(pix - 4, piy + 7); g.lineTo(pix - 8, piy + 7);
    g.lineTo(pix - 9, piy + 5); g.lineTo(pix - 9, piy - 5); g.fill(0xffd700);
    // Right bar
    g.moveTo(pix + 3, piy - 7); g.lineTo(pix + 7, piy - 7); g.lineTo(pix + 8, piy - 5);
    g.lineTo(pix + 8, piy + 5); g.lineTo(pix + 7, piy + 7); g.lineTo(pix + 3, piy + 7);
    g.lineTo(pix + 2, piy + 5); g.lineTo(pix + 2, piy - 5); g.fill(0xffd700);

    this._addText("PAUSED", S_TITLE, sw / 2, py + 40);

    // Ornate scrollwork divider
    const pd1 = py + 58;
    g.moveTo(px + 25, pd1);
    g.quadraticCurveTo(sw / 2 - 20, pd1 - 4, sw / 2 - 8, pd1);
    g.stroke({ color: 0x886622, width: 1 });
    g.moveTo(sw / 2, pd1 - 3); g.lineTo(sw / 2 + 3, pd1); g.lineTo(sw / 2, pd1 + 3); g.lineTo(sw / 2 - 3, pd1); g.fill(0xffd700);
    g.moveTo(sw / 2 + 8, pd1);
    g.quadraticCurveTo(sw / 2 + 20, pd1 - 4, px + pw - 25, pd1);
    g.stroke({ color: 0x886622, width: 1 });

    let cy = py + 72;
    const s = this._state;

    // Current match info panel
    if (s.roundIndex < TOURNAMENT_KNIGHTS.length) {
      const opp = getOpponent(s);
      g.roundRect(px + 15, cy - 6, pw - 30, 52, 4); g.fill({ color: 0x000000, alpha: 0.3 });
      // Opponent color pip (shield polygon)
      const opx = px + 28, opy = cy + 8;
      g.moveTo(opx, opy - 4); g.quadraticCurveTo(opx + 4, opy - 3, opx + 4, opy);
      g.lineTo(opx + 2, opy + 3); g.lineTo(opx, opy + 5);
      g.lineTo(opx - 2, opy + 3); g.lineTo(opx - 4, opy);
      g.quadraticCurveTo(opx - 4, opy - 3, opx, opy - 4); g.fill(opp.color);
      this._addText(`Facing: ${opp.name} ${opp.title}`, S_BODY, sw / 2, cy + 6); cy += 18;
      this._addText(`Score: You ${s.playerScore} - ${s.opponentScore} ${opp.name.split(" ")[1]}`, S_SCORE, sw / 2, cy + 4); cy += 16;
      this._addText(`Tilt ${s.tiltIndex + 1} of ${tiltsForRound(s.roundIndex)}`, S_AIM_INACTIVE, sw / 2, cy + 4); cy += 26;
    }

    // Controls section with icons
    g.roundRect(px + 15, cy - 2, pw - 30, 52, 4); g.fill({ color: 0x000000, alpha: 0.2 });
    // Lance icon
    g.moveTo(px + 25, cy + 10); g.lineTo(px + 35, cy + 7); g.lineTo(px + 25, cy + 4); g.fill(0x44aaff);
    this._addText("CONTROLS", S_AIM_LABEL, sw / 2, cy + 4); cy += 16;
    this._addText("W/S: Lance    A/D: Shield    SPACE: Charge/Lock", S_AIM_INACTIVE, sw / 2, cy + 2); cy += 13;
    this._addText("W/S/A/D mid-charge: Feint    ESC: Resume", S_AIM_INACTIVE, sw / 2, cy + 2); cy += 24;

    // Status section with visual bars
    g.roundRect(px + 15, cy - 2, pw - 30, 82, 4); g.fill({ color: 0x000000, alpha: 0.2 });
    // Shield icon for status
    g.moveTo(px + 28, cy + 6); g.quadraticCurveTo(px + 33, cy + 4, px + 33, cy + 10);
    g.lineTo(px + 28, cy + 16); g.lineTo(px + 23, cy + 10);
    g.quadraticCurveTo(px + 23, cy + 4, px + 28, cy + 6); g.fill(0x44ddaa);
    this._addText("STATUS", S_AIM_LABEL, sw / 2, cy + 4); cy += 16;
    // Stamina with bar
    this._addText("Stamina", S_AIM_INACTIVE, px + 40, cy + 2, 0);
    this._renderStaminaBar(g, px + 100, cy - 1, pw * 0.4, 7, s.playerStamina);
    this._addText(`${Math.round(s.playerStamina)}`, S_STAT_VALUE, px + 100 + pw * 0.42, cy + 2, 0); cy += 14;
    // Gold
    g.moveTo(px + 40, cy); g.lineTo(px + 44, cy - 3); g.lineTo(px + 48, cy); g.lineTo(px + 44, cy + 3); g.fill(0xffd700);
    this._addText(`Gold: ${s.gold}g`, S_GOLD, px + 55, cy, 0); cy += 14;
    // Streak + Favor
    this._addText(`Streak: ${s.tiltStreak}x`, s.tiltStreak >= 2 ? S_STREAK : S_AIM_INACTIVE, px + 40, cy, 0);
    const favorPct = Math.round(s.crowdFavor / CROWD_FAVOR_MAX * 100);
    this._addText(`Crowd Favor: ${favorPct}%`, S_FAVOR, px + pw * 0.55, cy, 0); cy += 14;
    if (s.playerAbility !== "none") {
      const ab = PLAYER_ABILITIES[s.playerAbility];
      const abStyle = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: ab.color, fontWeight: "bold" });
      g.moveTo(px + 40, cy); g.lineTo(px + 44, cy - 3); g.lineTo(px + 48, cy); g.lineTo(px + 44, cy + 3); g.fill(ab.color);
      this._addText(`${ab.name}`, abStyle, px + 55, cy, 0);
    }

    // Bottom options with styled buttons
    const btnY = py + ph - 50;
    // Resume button
    g.roundRect(sw / 2 - 60, btnY - 6, 120, 22, 4); g.fill({ color: 0x224422, alpha: 0.6 });
    g.roundRect(sw / 2 - 60, btnY - 6, 120, 22, 4); g.stroke({ color: 0x44ff44, width: 1 });
    this._addText("[ESC] Resume", S_BTN, sw / 2, btnY + 4);
    // Quit button
    g.roundRect(sw / 2 - 50, btnY + 22, 100, 18, 3); g.fill({ color: 0x221111, alpha: 0.4 });
    g.roundRect(sw / 2 - 50, btnY + 22, 100, 18, 3); g.stroke({ color: 0x553333, width: 0.8 });
    this._addText("[Q] Quit", S_AIM_INACTIVE, sw / 2, btnY + 31);
  }

  // ---- Pre-Match ----------------------------------------------------------

  private _renderPreMatch(g: Graphics, sw: number, sh: number): void {
    // Arena background
    this._renderArenaBackground(g, sw, sh);
    g.rect(0, 0, sw, sh); g.fill({ color: 0x000000, alpha: 0.55 });

    const s = this._state; const opp = getOpponent(s);

    // Panel
    const px = sw * 0.1, py = sh * 0.05, pw = sw * 0.8, ph = sh * 0.9;
    g.roundRect(px, py, pw, ph, 6); g.fill({ color: 0x0a0a18, alpha: 0.9 });
    g.roundRect(px, py, pw, ph, 6); g.stroke({ color: 0xffd700, width: 2 });

    // Round header — special for final match
    if (s.roundIndex === TOURNAMENT_KNIGHTS.length - 1) {
      this._addText("THE FINAL BOUT", S_EVENT_TITLE, sw / 2, py + 20);
    } else {
      this._addText(`ROUND ${s.roundIndex + 1} of ${TOURNAMENT_KNIGHTS.length}`, S_SUBTITLE, sw / 2, py + 20);
    }

    // VS
    this._addText("You", S_KNIGHT, sw * 0.28, py + ph * 0.1);
    this._addText("VS", S_RESULT, sw / 2, py + ph * 0.1);
    this._addText(opp.name, S_KNIGHT, sw * 0.72, py + ph * 0.1);
    this._addText(opp.title, S_SUBTITLE, sw * 0.72, py + ph * 0.16);

    // Knight silhouettes with heraldry shields
    this._drawKnightSilhouette(g, sw * 0.28, py + ph * 0.38, PLAYER_COLOR, true, PLAYER_HERALDRY, PLAYER_COLOR, PLAYER_COLOR2);
    this._drawKnightSilhouette(g, sw * 0.72, py + ph * 0.38, opp.color, false, opp.heraldry, opp.color, opp.color2);

    // Stars
    const stars = Math.ceil(opp.skill * 5);
    this._addText(`Skill: ${"\u2605".repeat(stars)}${"\u2606".repeat(5 - stars)}`, S_AIM_LABEL, sw * 0.72, py + ph * 0.26);

    // Ability badge
    if (opp.abilityName) {
      this._addText(`\u2694 ${opp.abilityName}: ${opp.abilityDesc}`, S_ABILITY, sw * 0.72, py + ph * 0.29);
    }

    // Taunt bubble
    const bby = py + ph * 0.56;
    g.roundRect(sw * 0.2, bby, sw * 0.6, 38, 8); g.fill({ color: 0x111122, alpha: 0.85 });
    g.roundRect(sw * 0.2, bby, sw * 0.6, 38, 8); g.stroke({ color: 0x886622, width: 1 });
    g.moveTo(sw * 0.68, bby); g.lineTo(sw * 0.72, bby - 8); g.lineTo(sw * 0.7, bby); g.fill({ color: 0x111122, alpha: 0.85 });
    this._addText(`"${opp.taunt}"`, S_BODY_ITALIC, sw / 2, bby + 19);

    // Bracket
    this._renderBracket(g, sw, py + ph * 0.68);

    // Player ability display
    if (s.playerAbility !== "none") {
      const pab = PLAYER_ABILITIES[s.playerAbility];
      const pabStyle = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: pab.color, fontStyle: "italic" });
      this._addText(`Your ability: \u2694 ${pab.name}`, pabStyle, sw * 0.28, py + ph * 0.29);
    }

    // Challenge mode badge
    if (s.challengeMode !== "normal") {
      const ch = CHALLENGE_DEFS[s.challengeMode];
      const chStyle = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: ch.color, fontWeight: "bold" });
      this._addText(`\u2B22 ${ch.name}`, chStyle, sw / 2, py + ph * 0.82);
    }

    const tc = tiltsForRound(s.roundIndex);
    // Weather display
    const wd = WEATHER_DEFS[s.weather];
    const wStyle = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: wd.color, fontWeight: "bold" });
    this._addText(`\u2601 ${wd.name}: ${wd.desc}`, wStyle, sw / 2, py + ph * 0.80);
    // Arena name
    this._addText(`\u26F3 ${ARENA_THEMES[s.arenaTheme].name}`, S_AIM_INACTIVE, sw / 2, py + ph * 0.83);
    // Random bracket indicator
    if (s.randomBracket) {
      this._addText("\u2B22 Random Bracket", S_STREAK, sw / 2, py + ph * 0.86);
    }
    this._addText(`Best of ${tc} tilts`, S_BODY, sw / 2, py + ph * 0.89);
    const skip = this._addText("SPACE to skip", S_AIM_INACTIVE, sw / 2, py + ph * 0.92);
    skip.alpha = 0.5 + Math.sin(this._elapsed * 3) * 0.3;
  }

  private _renderBracket(g: Graphics, sw: number, startY: number): void {
    const s = this._state;
    const bw = sw * 0.75, bx = sw * 0.125, cellW = bw / TOURNAMENT_KNIGHTS.length;
    g.roundRect(bx - 5, startY - 5, bw + 10, 50, 4); g.fill({ color: 0x000000, alpha: 0.4 });
    g.roundRect(bx - 5, startY - 5, bw + 10, 50, 4); g.stroke({ color: 0x333344, width: 1 });
    this._addText("TOURNAMENT BRACKET", S_AIM_INACTIVE, sw / 2, startY + 3);
    for (let i = 0; i < TOURNAMENT_KNIGHTS.length; i++) {
      const k = TOURNAMENT_KNIGHTS[i];
      const cx = bx + cellW * i + cellW / 2, cy = startY + 28;
      let st: TextStyle, lb: string;
      if (i < s.roundIndex) { st = S_BRACKET_WON; lb = `\u2713 ${k.name.split(" ")[1]}`; }
      else if (i === s.roundIndex) { st = S_BRACKET_CURRENT; lb = `\u25B6 ${k.name.split(" ")[1]}`; }
      else { st = S_BRACKET_LOCKED; lb = k.name.split(" ")[1]; }
      this._addText(lb, st, cx, cy);
      // Shield dot for each knight
      g.circle(cx, cy + 12, 3); g.fill(i <= s.roundIndex ? k.color : 0x222233);
      if (i < TOURNAMENT_KNIGHTS.length - 1) {
        g.moveTo(cx + cellW * 0.35, cy + 12); g.lineTo(cx + cellW * 0.65, cy + 12);
        g.stroke({ color: i < s.roundIndex ? 0x44ff44 : 0x222233, width: 1 });
      }
    }
  }

  // ---- Aiming -------------------------------------------------------------

  private _renderAiming(g: Graphics, sw: number, sh: number): void {
    this._renderArenaBackground(g, sw, sh);
    const s = this._state; const opp = getOpponent(s);

    // Shadows
    this._drawShadow(g, sw * 0.15, sh * 0.64);
    this._drawShadow(g, sw * 0.85, sh * 0.64);

    this._drawKnightFull(g, sw * 0.15, sh * 0.52, getPlayerColor(s), PLAYER_COLOR2, PLAYER_HORSE, true, s.playerLance, 0, 0, s.playerStamina, PLAYER_HERALDRY);
    // AI tell: lance drifts toward their chosen zone (subtle, skill-dependent)
    const tellZone: Zone = s.aiTellDrift < -0.3 ? "high" : s.aiTellDrift > 0.3 ? "low" : "mid";
    this._drawKnightFull(g, sw * 0.85, sh * 0.52, opp.color, opp.color2, opp.horseColor, false, tellZone, 0, 0, s.aiStamina, opp.heraldry);

    // Aiming panel
    const px = sw * 0.02, py = sh * 0.04, pw = 195, ph = 210;
    g.roundRect(px, py, pw, ph, 6); g.fill({ color: 0x0a0a18, alpha: 0.85 });
    g.roundRect(px, py, pw, ph, 6); g.stroke({ color: 0xffd700, width: 1 });

    // Visual zone diagram — armored knight target figure
    const diagX = px + pw - 35, diagY = py + 50;
    // Helm (high zone)
    g.moveTo(diagX - 5, diagY - 18);
    g.quadraticCurveTo(diagX - 6, diagY - 28, diagX, diagY - 30);
    g.quadraticCurveTo(diagX + 6, diagY - 28, diagX + 5, diagY - 18);
    g.fill({ color: 0x333344, alpha: 0.5 });
    g.rect(diagX - 4, diagY - 22, 8, 2); g.fill({ color: 0x222233, alpha: 0.4 }); // visor
    // Torso (mid zone)
    g.moveTo(diagX - 7, diagY - 16);
    g.lineTo(diagX + 7, diagY - 16);
    g.lineTo(diagX + 6, diagY + 4);
    g.lineTo(diagX - 6, diagY + 4);
    g.fill({ color: 0x333344, alpha: 0.5 });
    // Pauldrons
    g.ellipse(diagX - 8, diagY - 14, 4, 3); g.fill({ color: 0x333344, alpha: 0.5 });
    g.ellipse(diagX + 8, diagY - 14, 4, 3); g.fill({ color: 0x333344, alpha: 0.5 });
    // Legs (low zone)
    g.moveTo(diagX - 5, diagY + 4); g.lineTo(diagX - 6, diagY + 18);
    g.lineTo(diagX - 2, diagY + 18); g.lineTo(diagX - 1, diagY + 4); g.fill({ color: 0x333344, alpha: 0.5 });
    g.moveTo(diagX + 1, diagY + 4); g.lineTo(diagX + 2, diagY + 18);
    g.lineTo(diagX + 6, diagY + 18); g.lineTo(diagX + 5, diagY + 4); g.fill({ color: 0x333344, alpha: 0.5 });
    // Zone highlight overlays
    const zoneRects: [number, number][] = [[-30, -16], [-16, 4], [4, 18]]; // [top, bottom] per zone
    for (let zi = 0; zi < 3; zi++) {
      const [zt, zb] = zoneRects[zi];
      const active = s.playerLance === LANCE_ZONES[zi];
      if (active) {
        // Pulsing glow on active zone
        const pulse = 0.1 + Math.sin(this._elapsed * 4) * 0.08;
        g.roundRect(diagX - 13, diagY + zt - 2, 26, zb - zt + 4, 3);
        g.fill({ color: 0xff4444, alpha: pulse });
        g.roundRect(diagX - 13, diagY + zt - 2, 26, zb - zt + 4, 3);
        g.stroke({ color: 0xff4444, width: 2 });
        // Zone label
        this._addText(LANCE_ZONES[zi].charAt(0).toUpperCase(), S_AIM_ACTIVE, diagX + 16, diagY + (zt + zb) / 2);
      } else {
        g.roundRect(diagX - 13, diagY + zt - 2, 26, zb - zt + 4, 3);
        g.stroke({ color: 0x334455, width: 0.5 });
      }
    }

    this._addText("LANCE (W/S)", S_AIM_LABEL, px + 65, py + 18);
    for (let i = 0; i < 3; i++) {
      const zone = LANCE_ZONES[i]; const isA = s.playerLance === zone;
      this._addText(isA ? `\u25B6 ${zone.toUpperCase()}` : `  ${zone.toUpperCase()}`, isA ? S_AIM_ACTIVE : S_AIM_INACTIVE, px + 65, py + 42 + i * 22);
    }
    this._addText("SHIELD (A/D)", S_AIM_LABEL, px + 65, py + 115);
    for (let i = 0; i < 3; i++) {
      const zone = LANCE_ZONES[i]; const isA = s.playerShield === zone;
      this._addText(isA ? `\u25B6 ${zone.toUpperCase()}` : `  ${zone.toUpperCase()}`, isA ? S_AIM_ACTIVE : S_AIM_INACTIVE, px + 65, py + 137 + i * 22);
    }
    this._renderStaminaBar(g, px + 10, py + ph - 16, pw - 20, 8, s.playerStamina);

    // Opponent pattern analysis panel (right side) — shows AI tendencies
    if (s.aiLanceHistory.length > 0) {
      const apx = sw - 195, apy = sh * 0.04, apw = 185, aph = 100;
      g.roundRect(apx, apy, apw, aph, 6); g.fill({ color: 0x0a0a18, alpha: 0.75 });
      g.roundRect(apx, apy, apw, aph, 6); g.stroke({ color: 0x886622, width: 1 });
      this._addText("OPPONENT SCOUTING", S_AIM_LABEL, apx + apw / 2, apy + 12);

      // Count AI zone frequencies
      const aiLF: Record<Zone, number> = { high: 0, mid: 0, low: 0 };
      const aiSF: Record<Zone, number> = { high: 0, mid: 0, low: 0 };
      for (const z of s.aiLanceHistory) aiLF[z]++;
      for (const z of s.aiShieldHistory) aiSF[z]++;
      const total = s.aiLanceHistory.length;

      // Lance tendency bars
      this._addText("Their lance:", S_AIM_INACTIVE, apx + 50, apy + 28);
      for (let zi = 0; zi < 3; zi++) {
        const z = LANCE_ZONES[zi];
        const pct = total > 0 ? aiLF[z] / total : 0;
        const barX = apx + 100, barY = apy + 26 + zi * 10, barW = 70;
        g.roundRect(barX, barY, barW, 7, 3); g.fill({ color: 0x222233, alpha: 0.5 });
        if (pct > 0) { g.roundRect(barX, barY, barW * pct, 7, 3); g.fill({ color: 0xff6644, alpha: 0.7 }); }
        this._addText(z.charAt(0).toUpperCase(), S_AIM_INACTIVE, barX - 8, barY + 3);
      }

      // Shield tendency bars
      this._addText("Their shield:", S_AIM_INACTIVE, apx + 50, apy + 62);
      for (let zi = 0; zi < 3; zi++) {
        const z = LANCE_ZONES[zi];
        const pct = total > 0 ? aiSF[z] / total : 0;
        const barX = apx + 100, barY = apy + 60 + zi * 10, barW = 70;
        g.roundRect(barX, barY, barW, 7, 3); g.fill({ color: 0x222233, alpha: 0.5 });
        if (pct > 0) { g.roundRect(barX, barY, barW * pct, 7, 3); g.fill({ color: 0x4488ff, alpha: 0.7 }); }
        this._addText(z.charAt(0).toUpperCase(), S_AIM_INACTIVE, barX - 8, barY + 3);
      }

      // Zone history icons (last few tilts)
      if (s.aiLanceHistory.length >= 2) {
        const histY = apy + aph - 16;
        this._addText("History:", S_AIM_INACTIVE, apx + 30, histY, 0);
        const showCount = Math.min(4, s.aiLanceHistory.length);
        for (let hi = 0; hi < showCount; hi++) {
          const hIdx = s.aiLanceHistory.length - showCount + hi;
          const lz = s.aiLanceHistory[hIdx];
          const lColor = lz === "high" ? 0xff6644 : lz === "mid" ? 0xffaa44 : 0x44aaff;
          this._addText(lz.charAt(0).toUpperCase(), new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: lColor, fontWeight: "bold" }), apx + 75 + hi * 16, histY);
        }
      } else {
        this._addText("Aim where they DON'T shield!", S_AIM_LABEL, apx + apw / 2, apy + aph - 8);
      }
    }

    // Timer
    const ts = Math.ceil(s.aimTimer);
    this._addText(`${ts}s`, ts <= 2 ? S_TIMER_WARN : S_TIMER_OK, sw - 55, sh * 0.06);
    // Timer bar
    const timerRatio = s.aimTimer / AIM_TIME;
    g.roundRect(sw - 80, sh * 0.1, 50, 6, 3); g.fill({ color: 0x000000, alpha: 0.5 });
    g.roundRect(sw - 80, sh * 0.1, 50 * timerRatio, 6, 3); g.fill(ts <= 2 ? 0xff4444 : 0x44cc44);

    this._renderScoreBar(g, sw);
    // Gold display
    this._addText(`\u2B27 ${s.gold}g`, S_GOLD, sw - 50, sh * 0.06);

    const ct = this._addText("SPACE to charge!", S_BTN, sw / 2, sh * 0.93);
    ct.alpha = 0.6 + Math.sin(this._elapsed * 4) * 0.4;
  }

  // ---- Arena (charge/impact) ----------------------------------------------

  private _renderArena(g: Graphics, sw: number, sh: number): void {
    this._renderArenaBackground(g, sw, sh);
    const s = this._state; const opp = getOpponent(s); const p = s.chargeProgress;

    // Knight positions with impact recoil (push back after collision)
    const recoilDist = 35; // max recoil distance in pixels
    const playerRecoil = s.impactRecoilPlayer * recoilDist;
    const aiRecoil = s.impactRecoilAI * recoilDist;
    const playerX = sw * 0.15 + p * (sw * 0.35) - playerRecoil;
    const aiX = sw * 0.85 - p * (sw * 0.35) + aiRecoil;
    const ky = sh * 0.52;
    const bob = Math.sin(p * Math.PI * 10) * 4 * (1 - p * 0.3);

    // Impact zoom effect (brief scale toward center)
    if (s.impactZoom > 0) {
      const zoomScale = 1 + s.impactZoom * 0.08;
      const zoomCx = sw / 2, zoomCy = sh * 0.52;
      // Zoom toward impact center: pivot = center, then offset position to compensate
      this._container.scale.set(zoomScale);
      this._container.pivot.set(zoomCx, zoomCy);
      this._container.x += zoomCx;
      this._container.y += zoomCy;
    } else {
      this._container.scale.set(1);
      this._container.pivot.set(0, 0);
    }

    // Instant replay during match result — re-render arena with charge animation
    if (s.replayActive && s.phase === Phase.MATCH_RESULT) {
      s.replayTimer -= 1 / 60; // tick in real time
      s.chargeProgress = Math.min(1, s.chargeProgress + 0.005); // slowly advance charge
      if (s.replayTimer <= 0) {
        s.replayActive = false;
        s.chargeProgress = 1;
      }
      // "REPLAY" label
      const rpAlpha = 0.5 + Math.sin(this._elapsed * 4) * 0.3;
      const rpt = this._addText("\u25B6 REPLAY", S_EVENT_TITLE, sw / 2, sh * 0.08);
      rpt.alpha = rpAlpha;
      // Film border effect (black bars top/bottom)
      g.moveTo(0, 0); g.lineTo(sw, 0); g.lineTo(sw, sh * 0.04); g.lineTo(0, sh * 0.04);
      g.fill({ color: 0x000000, alpha: 0.6 });
      g.moveTo(0, sh * 0.96); g.lineTo(sw, sh * 0.96); g.lineTo(sw, sh); g.lineTo(0, sh);
      g.fill({ color: 0x000000, alpha: 0.6 });
    }

    // Charge stage visual effects
    if (s.phase === Phase.CHARGING) {
      // Stage 1 (25%): subtle ground shake indication
      if (s.chargeStage >= 1 && Math.random() < 0.3) {
        this._spawnDust(playerX - 20, ky + 42, 1);
        this._spawnDust(aiX + 20, ky + 42, 1);
      }
      // Stage 2 (50%): intensified dust + slight vignette
      if (s.chargeStage >= 2) {
        const stageVig = (s.chargeStage - 1) * 0.03;
        g.moveTo(0, 0); g.lineTo(sw * 0.1, 0); g.lineTo(0, sh * 0.1); g.fill({ color: 0x000000, alpha: stageVig });
        g.moveTo(sw, 0); g.lineTo(sw * 0.9, 0); g.lineTo(sw, sh * 0.1); g.fill({ color: 0x000000, alpha: stageVig });
      }
      // Stage 3 (75%): golden tension glow from center
      if (s.chargeStage >= 3) {
        const tenGlow = 0.02 + Math.sin(this._elapsed * 6) * 0.01;
        g.moveTo(sw / 2 - 30, sh * 0.35); g.lineTo(sw / 2 + 30, sh * 0.35);
        g.lineTo(sw / 2 + 15, sh * 0.7); g.lineTo(sw / 2 - 15, sh * 0.7);
        g.fill({ color: 0xffdd44, alpha: tenGlow });
      }
    }

    // Depth of field — fog overlay on distant elements during charge (focus on knights)
    if (s.phase === Phase.CHARGING && p > 0.2) {
      const fogIntensity = Math.min(0.15, (p - 0.2) * 0.2);
      // Fog over upper landscape/sky area
      g.rect(0, 0, sw, sh * 0.44);
      g.fill({ color: 0x1a2a40, alpha: fogIntensity });
    }

    // Speed lines during charge
    if (s.phase === Phase.CHARGING && p > 0.3) {
      const intensity = (p - 0.3) / 0.7;
      const cx = sw / 2, cy = sh * 0.5;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + this._elapsed * 2;
        const r1 = 50 + intensity * 80;
        const r2 = r1 + 40 + intensity * 100;
        g.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1 * 0.4);
        g.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2 * 0.4);
        g.stroke({ color: 0xffffff, width: 1.5, alpha: intensity * 0.15 } as any);
      }
    }

    // Shadows
    this._drawShadow(g, playerX, sh * 0.64);
    this._drawShadow(g, aiX, sh * 0.64);

    this._drawKnightFull(g, playerX, ky + bob, getPlayerColor(s), PLAYER_COLOR2, PLAYER_HORSE, true, s.playerLance, p, s.unhorsePlayerFallAngle, s.playerStamina, PLAYER_HERALDRY);
    this._drawKnightFull(g, aiX, ky - bob, opp.color, opp.color2, opp.horseColor, false, s.aiLance, p, s.unhorseAIFallAngle, s.aiStamina, opp.heraldry);

    // Impact phase extra effects
    if (s.phase === Phase.IMPACT) {
      const impactCx = sw / 2, impactCy = sh * 0.52;
      // Continuing sparks during freeze
      if (s.impactSeverity >= 1 && Math.random() < 0.35) {
        this._spawnSparks(impactCx + (Math.random() - 0.5) * 40, impactCy + (Math.random() - 0.5) * 25, 2);
      }
      // Lance debris trail on strong+ hits
      if (s.impactSeverity >= 2 && Math.random() < 0.5) {
        this._spawnSplinters(impactCx + (Math.random() - 0.5) * 50, impactCy - 15, 2);
      }
      // Shield flash on blocks
      if (s.impactSeverity === 0 && s.impactZoom > 0) {
        const blockGlow = s.impactZoom * 2;
        g.circle(impactCx, impactCy, 20 * blockGlow + 10);
        g.fill({ color: 0x88aaff, alpha: blockGlow * 0.1 });
        g.circle(impactCx, impactCy, 10 * blockGlow + 5);
        g.fill({ color: 0xccddff, alpha: blockGlow * 0.15 });
        // Shield clang rings
        const clangR = (1 - s.impactZoom) * 30 + 10;
        g.circle(impactCx, impactCy, clangR); g.stroke({ color: 0xaaccff, width: 1.5, alpha: s.impactZoom * 0.2 } as any);
      }
      // Hit flash + armor glow on struck knight
      if (s.impactSeverity >= 1 && s.impactZoom > 0) {
        const hitGlow = s.impactZoom * 2;
        g.circle(impactCx, impactCy, 25 * hitGlow + 15);
        g.fill({ color: 0xff8844, alpha: hitGlow * 0.08 });
        // Armor flash on the struck knight (white highlight pulse)
        if (s.lastAIPoints > 0) {
          // Player was hit — flash on player knight
          g.circle(playerX, ky, 30); g.fill({ color: 0xffffff, alpha: s.impactZoom * 0.12 });
        }
        if (s.lastPlayerPoints > 0) {
          // AI was hit — flash on AI knight
          g.circle(aiX, ky, 30); g.fill({ color: 0xffffff, alpha: s.impactZoom * 0.12 });
        }
      }
      // Unhorse dust cloud at fall point
      if ((s.playerUnhorsed || s.aiUnhorsed) && Math.random() < 0.4) {
        const dustX = s.playerUnhorsed ? playerX - 20 : aiX + 20;
        const dustY = ky + 42;
        this._state.particles.push({
          x: dustX + (Math.random() - 0.5) * 20, y: dustY,
          vx: (Math.random() - 0.5) * 30, vy: -15 - Math.random() * 20,
          life: 0.5 + Math.random() * 0.4, maxLife: 0.9,
          color: 0x998866, size: 5 + Math.random() * 6, type: "dust",
        });
      }
      // Impact energy wave (expanding ring on strong hits)
      if (s.impactSeverity >= 2 && s.impactZoom > 0.1) {
        const waveR = (1 - s.impactZoom) * 60 + 15;
        g.circle(impactCx, impactCy, waveR);
        g.stroke({ color: 0xffdd44, width: 2, alpha: s.impactZoom * 0.15 } as any);
        g.circle(impactCx, impactCy, waveR + 8);
        g.stroke({ color: 0xffaa22, width: 1, alpha: s.impactZoom * 0.08 } as any);
      }
    }

    // Dust from hooves
    if (s.phase === Phase.CHARGING) {
      if (Math.random() < 0.6) this._spawnDust(playerX - 30, ky + 40, 2);
      if (Math.random() < 0.6) this._spawnDust(aiX + 30, ky + 40, 2);
      // Lance trail sparks (gold dust from lance tips)
      if (p > 0.3 && Math.random() < 0.3) {
        this._state.particles.push({
          x: playerX + 80, y: ky - 25 + Math.random() * 10,
          vx: -20 + Math.random() * 10, vy: -10 + Math.random() * 20,
          life: 0.3 + Math.random() * 0.3, maxLife: 0.6,
          color: 0xccaa66, size: 1 + Math.random() * 2, type: "spark",
        });
        this._state.particles.push({
          x: aiX - 80, y: ky - 25 + Math.random() * 10,
          vx: 20 - Math.random() * 10, vy: -10 + Math.random() * 20,
          life: 0.3 + Math.random() * 0.3, maxLife: 0.6,
          color: 0xccaa66, size: 1 + Math.random() * 2, type: "spark",
        });
      }
    }

    // Motion blur ghost trails during charge (semi-transparent knight silhouettes behind)
    if (s.phase === Phase.CHARGING && p > 0.15) {
      const trailAlpha = Math.min(0.12, (p - 0.15) * 0.2);
      for (let tr = 1; tr <= 3; tr++) {
        const trailOffset = tr * 12 * (1 + p);
        // Player ghost
        g.ellipse(playerX - trailOffset, ky + bob + 10, 30, 18);
        g.fill({ color: PLAYER_COLOR, alpha: trailAlpha / tr });
        // AI ghost
        g.ellipse(aiX + trailOffset, ky - bob + 10, 30, 18);
        g.fill({ color: opp.color, alpha: trailAlpha / tr });
      }
    }

    this._renderScoreBar(g, sw);
    // Stamina bars
    this._renderStaminaBar(g, sw * 0.28, 46, sw * 0.16, 6, s.playerStamina);
    this._addText("You", S_AIM_INACTIVE, sw * 0.36, 59);
    this._renderStaminaBar(g, sw * 0.56, 46, sw * 0.16, 6, s.aiStamina);
    this._addText(opp.name.split(" ")[1], S_AIM_INACTIVE, sw * 0.64, 59);

    // Gold display
    this._addText(`\u2B27 ${s.gold}g`, S_GOLD, sw - 50, 24);

    // Power meter during charge
    if (s.phase === Phase.CHARGING) {
      this._renderPowerMeter(g, sw, sh);
    }

    // Opponent zone reveal during late charge
    if (s.showOpponentZones && s.phase === Phase.CHARGING) {
      const ozx = sw * 0.82, ozy = 70;
      g.roundRect(ozx - 40, ozy - 8, 80, 36, 4); g.fill({ color: 0x000000, alpha: 0.6 });
      g.roundRect(ozx - 40, ozy - 8, 80, 36, 4); g.stroke({ color: 0xff6644, width: 1 });
      this._addText(`\u2694 ${s.aiLance.toUpperCase()}`, S_AIM_ACTIVE, ozx, ozy + 2);
      this._addText(`\u26E8 ${s.aiShield.toUpperCase()}`, S_AIM_ACTIVE, ozx, ozy + 18);
      this._addText("OPP. ZONES", S_AIM_INACTIVE, ozx, ozy - 2);
    }

    // Power window indicator during charge
    if (s.phase === Phase.CHARGING && s.powerWindowActive && !s.powerMeterLocked) {
      const pwAlpha = 0.4 + Math.sin(this._elapsed * 12) * 0.3;
      g.roundRect(sw / 2 - 110, this._sh * 0.74, 220, 24, 4);
      g.stroke({ color: 0x44ffaa, width: 2, alpha: pwAlpha } as any);
      this._addText("\u26A1 POWER WINDOW!", S_PERFECT, sw / 2, this._sh * 0.72);
    }

    // Exhaustion warning
    if (s.phase === Phase.CHARGING && s.playerStamina < 20) {
      const exhAlpha = 0.4 + Math.sin(this._elapsed * 5) * 0.3;
      const exh = this._addText("EXHAUSTED!", S_TIMER_WARN, sw * 0.15, sh * 0.35);
      exh.alpha = exhAlpha;
    }

    // Feint hint
    if (s.phase === Phase.CHARGING && p > (1 - FEINT_WINDOW) && !s.playerFeinted && s.playerStamina >= FEINT_STAMINA_COST && s.playerStamina >= 20) {
      const feintAlpha = 0.5 + Math.sin(this._elapsed * 6) * 0.5;
      const ft = this._addText("W/S/A/D to FEINT!", S_AIM_LABEL, sw * 0.15, sh * 0.42);
      ft.alpha = feintAlpha;
    }
    if (s.playerFeinted) { this._addText("FEINTED!", S_FEINT, sw * 0.15, sh * 0.42); }
    if (s.aiFeinted) { this._addText("FEINTED!", S_FEINT, sw * 0.85, sh * 0.42); }

    // Streak display
    if (s.tiltStreak >= 2) {
      this._addText(`\u2B25 ${s.tiltStreak}x Streak!`, S_STREAK, sw / 2, sh * 0.88);
    }

    // Crowd sparkle effect during excitement
    if (s.crowdExcitement > 0.3 && Math.random() < s.crowdExcitement * 0.2) {
      const sparkX = Math.random() * sw;
      const sparkY = sh * 0.32 + Math.random() * (sh * 0.1);
      this._state.particles.push({
        x: sparkX, y: sparkY, vx: (Math.random() - 0.5) * 25, vy: -35 - Math.random() * 50,
        life: 0.4 + Math.random() * 0.4, maxLife: 0.8,
        color: [0xffd700, 0xffaa44, 0xffffff, 0xff8844][Math.floor(Math.random() * 4)],
        size: 1 + Math.random() * 2.5, type: "spark",
      });
    }
    // Crowd excitement visual pulse — stands glow during high excitement
    if (s.crowdExcitement > 0.5) {
      const excGlow = (s.crowdExcitement - 0.5) * 0.08;
      g.rect(0, sh * 0.32, sw, sh * 0.12);
      g.fill({ color: 0xffaa44, alpha: excGlow });
    }
    // Thrown items during unhorse excitement
    if (s.crowdExcitement > 0.8 && s.phase === Phase.IMPACT && Math.random() < 0.15) {
      // Throw a hat/flower from crowd
      this._state.particles.push({
        x: Math.random() * sw, y: sh * 0.34,
        vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 40,
        life: 1.0 + Math.random() * 0.5, maxLife: 1.5,
        color: [0xff4444, 0x44ff44, 0xffd700, 0xffffff][Math.floor(Math.random() * 4)],
        size: 3 + Math.random() * 2, type: "confetti",
        rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 6,
      });
    }

    // Crowd favor bar (bottom left)
    const cfx = 10, cfy = sh - 24, cfw = 120, cfh = 10;
    g.roundRect(cfx, cfy, cfw, cfh, cfh / 2); g.fill({ color: 0x000000, alpha: 0.5 });
    if (s.crowdFavor > 0) {
      const fcolor = s.crowdFavor >= CROWD_FAVOR_MAX ? 0xffd700 : 0xddaa44;
      g.roundRect(cfx, cfy, cfw * Math.min(1, s.crowdFavor / CROWD_FAVOR_MAX), cfh, cfh / 2); g.fill(fcolor);
      // Glow effect when favor is full
      if (s.crowdFavor >= CROWD_FAVOR_MAX) {
        const glowA = 0.15 + Math.sin(this._elapsed * 4) * 0.1;
        g.roundRect(cfx - 3, cfy - 3, cfw + 6, cfh + 6, cfh / 2 + 3);
        g.fill({ color: 0xffd700, alpha: glowA });
        // Golden particles rising from favor bar
        if (Math.random() < 0.3) {
          this._state.particles.push({
            x: cfx + Math.random() * cfw, y: cfy,
            vx: (Math.random() - 0.5) * 15, vy: -20 - Math.random() * 25,
            life: 0.5 + Math.random() * 0.3, maxLife: 0.8,
            color: 0xffd700, size: 1 + Math.random() * 1.5, type: "spark",
          });
        }
      }
    }
    g.roundRect(cfx, cfy, cfw, cfh, cfh / 2); g.stroke({ color: s.crowdFavor >= CROWD_FAVOR_MAX ? 0xffd700 : 0x666666, width: s.crowdFavor >= CROWD_FAVOR_MAX ? 1.5 : 0.8 });
    this._addText(s.crowdFavor >= CROWD_FAVOR_MAX ? "CROWD FAVOR READY!" : "Crowd Favor", S_FAVOR, cfx + cfw / 2, cfy - 6);

    // Player ability indicator (bottom right)
    if (s.playerAbility !== "none") {
      const ab = PLAYER_ABILITIES[s.playerAbility];
      const abStyle = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: ab.color, fontWeight: "bold" });
      this._addText(`\u2694 ${ab.name}`, abStyle, sw - 70, sh - 18);
    }

    // Challenge mode indicator
    if (s.challengeMode !== "normal") {
      const ch = CHALLENGE_DEFS[s.challengeMode];
      const chStyle = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: ch.color, fontWeight: "bold" });
      this._addText(`\u2B22 ${ch.name}`, chStyle, sw - 70, sh - 30);
    }

    // Tutorial hint overlay
    if (s.showHint && s.hintText) {
      const hintAlpha = Math.min(1, s.hintTimer * 2);
      g.roundRect(sw * 0.2, sh * 0.7, sw * 0.6, 28, 6);
      g.fill({ color: 0x112244, alpha: 0.85 * hintAlpha });
      g.roundRect(sw * 0.2, sh * 0.7, sw * 0.6, 28, 6);
      g.stroke({ color: 0x4488ff, width: 1 });
      const ht = this._addText(s.hintText, S_BODY, sw / 2, sh * 0.7 + 14);
      ht.alpha = hintAlpha;
    }
  }

  private _renderPowerMeter(g: Graphics, sw: number, sh: number): void {
    const s = this._state;
    const meterW = 200, meterH = 16;
    const mx = sw / 2 - meterW / 2, my = sh * 0.76;

    // Background
    g.roundRect(mx, my, meterW, meterH, 4); g.fill({ color: 0x000000, alpha: 0.7 });

    // Weak zones (red edges)
    g.roundRect(mx, my, meterW, meterH, 4); g.fill({ color: 0x663322, alpha: 0.5 });
    // Good zones (use difficulty settings)
    const diff = DIFFICULTY_MAP[s.difficulty];
    const pz = diff.perfectZone * (s.playerAbility === "swiftStrike" ? 1.5 : 1);
    const gz = diff.goodZone * (s.playerAbility === "swiftStrike" ? 1.2 : 1);
    const goodStart = meterW * (0.5 - gz); const goodW = meterW * gz * 2;
    g.rect(mx + goodStart, my, goodW, meterH); g.fill({ color: 0x666622, alpha: 0.5 });
    // Perfect zone (green center)
    const perfStart = meterW * (0.5 - pz); const perfW = meterW * pz * 2;
    g.rect(mx + perfStart, my, perfW, meterH); g.fill({ color: 0x226633, alpha: 0.7 });

    // Border
    g.roundRect(mx, my, meterW, meterH, 4); g.stroke({ color: 0x888888, width: 1 });

    // Needle (triangular pointer polygon)
    const needleX = mx + s.powerMeterPos * meterW;
    if (!s.powerMeterLocked) {
      // Top pointer triangle
      g.moveTo(needleX, my - 5);
      g.lineTo(needleX - 4, my - 10);
      g.lineTo(needleX + 4, my - 10);
      g.fill(0xffffff);
      // Needle line
      g.rect(needleX - 1, my - 1, 2, meterH + 2); g.fill(0xffffff);
      // Bottom pointer triangle
      g.moveTo(needleX, my + meterH + 3);
      g.lineTo(needleX - 3, my + meterH + 7);
      g.lineTo(needleX + 3, my + meterH + 7);
      g.fill(0xffffff);
    } else {
      const color = s.powerRating === "perfect" ? 0x44ffaa : s.powerRating === "good" ? 0xcccc44 : 0x886644;
      // Locked pointer (diamond shape)
      g.moveTo(needleX, my - 6);
      g.lineTo(needleX - 5, my + meterH / 2);
      g.lineTo(needleX, my + meterH + 4);
      g.lineTo(needleX + 5, my + meterH / 2);
      g.fill(color);
      g.moveTo(needleX, my - 4);
      g.lineTo(needleX - 3, my + meterH / 2);
      g.lineTo(needleX, my + meterH + 2);
      g.lineTo(needleX + 3, my + meterH / 2);
      g.fill({ color: 0xffffff, alpha: 0.3 });
    }

    // Labels
    if (!s.powerMeterLocked) {
      this._addText("SPACE for timing!", S_AIM_INACTIVE, sw / 2, my + meterH + 12);
    } else {
      const ratingStyle = s.powerRating === "perfect" ? S_PERFECT : s.powerRating === "good" ? S_GOOD : S_WEAK;
      this._addText(s.powerRating.toUpperCase(), ratingStyle, sw / 2, my + meterH + 12);
    }
  }

  private _drawShadow(g: Graphics, x: number, y: number): void {
    // Organic horse shadow polygon (not a perfect ellipse)
    g.moveTo(x - 44, y);
    g.quadraticCurveTo(x - 30, y - 8, x - 5, y - 6);
    g.quadraticCurveTo(x + 20, y - 9, x + 48, y - 2);
    g.quadraticCurveTo(x + 40, y + 6, x + 10, y + 7);
    g.quadraticCurveTo(x - 15, y + 8, x - 44, y);
    g.fill({ color: 0x000000, alpha: 0.18 });
    // Inner darker center
    g.moveTo(x - 20, y + 1);
    g.quadraticCurveTo(x, y - 3, x + 20, y);
    g.quadraticCurveTo(x, y + 4, x - 20, y + 1);
    g.fill({ color: 0x000000, alpha: 0.08 });
  }

  // ---- Impact/Tilt/Match/End text (same logic as v2) ----------------------

  private _renderImpactText(sw: number, sh: number): void {
    const s = this._state; const opp = getOpponent(s);
    const ps = s.lastPlayerResult === "UNHORSED!" ? S_UNHORSE : s.lastPlayerResult === "STRONG HIT!" ? S_HIT : s.lastPlayerResult === "HIT!" ? S_HIT : s.lastPlayerResult === "GLANCE" ? S_GLANCE : S_BLOCK;
    this._addText(`Your lance: ${s.lastPlayerResult}`, ps, sw * 0.25, sh * 0.28);
    const as2 = s.lastAIResult === "UNHORSED!" ? S_UNHORSE : s.lastAIResult === "STRONG HIT!" ? S_HIT : s.lastAIResult === "HIT!" ? S_HIT : s.lastAIResult === "GLANCE" ? S_GLANCE : S_BLOCK;
    this._addText(`${opp.name}: ${s.lastAIResult}`, as2, sw * 0.75, sh * 0.28);
    this._addText(`Lance: ${s.playerLance} \u2192 Shield: ${s.aiShield}`, S_AIM_INACTIVE, sw * 0.25, sh * 0.34);
    this._addText(`Lance: ${s.aiLance} \u2192 Shield: ${s.playerShield}`, S_AIM_INACTIVE, sw * 0.75, sh * 0.34);
    // Show timing rating
    if (s.powerRating !== "none") {
      const rs = s.powerRating === "perfect" ? S_PERFECT : s.powerRating === "good" ? S_GOOD : S_WEAK;
      this._addText(`Timing: ${s.powerRating.toUpperCase()}`, rs, sw * 0.25, sh * 0.39);
    }
  }

  private _renderTiltResult(sw: number, sh: number): void {
    const g = this._gfx;
    this._renderImpactText(sw, sh);
    const s = this._state;
    const opp = getOpponent(s);
    this._addText(`Score: You ${s.playerScore} - ${s.opponentScore} ${opp.name.split(" ")[1]}`, S_RESULT, sw / 2, sh * 0.72);

    // Prominent stamina display after tilt
    const stY = sh * 0.80;
    g.roundRect(sw * 0.2, stY - 6, sw * 0.6, 28, 4); g.fill({ color: 0x000000, alpha: 0.5 });
    this._addText(`Stamina: ${Math.round(s.playerStamina)}/${MAX_STAMINA}`, S_BODY, sw * 0.35, stY + 6);
    this._renderStaminaBar(g, sw * 0.5, stY + 1, sw * 0.25, 8, s.playerStamina);

    // Tilt winner indicator
    if (s.lastTiltWinner === "player") {
      this._addText("\u2694 Tilt Won!", S_BRACKET_WON, sw / 2, sh * 0.68);
    } else if (s.lastTiltWinner === "ai") {
      this._addText("\u2620 Tilt Lost", S_AIM_INACTIVE, sw / 2, sh * 0.68);
    }

    // Feint dodge callout
    if (s.feintDodged) {
      this._addText("\u26A1 FEINT DODGE!", S_PERFECT, sw * 0.4, sh * 0.64);
    }

    // Flawless challenge hit counter
    if (s.challengeMode === "flawless") {
      const fColor = s.hitsTaken === 0 ? 0x44ffaa : s.hitsTaken === 1 ? 0xffaa44 : 0xff4444;
      const fStyle = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: fColor, fontWeight: "bold" });
      this._addText(`Hits taken: ${s.hitsTaken}/1`, fStyle, sw / 2, sh * 0.63);
    }

    this._addText("SPACE to continue", S_AIM_INACTIVE, sw / 2, sh * 0.90);
  }

  private _renderMatchResult(g: Graphics, sw: number, sh: number): void {
    this._renderArenaBackground(g, sw, sh);
    g.rect(0, 0, sw, sh); g.fill({ color: 0x000000, alpha: 0.6 });
    const s = this._state; const opp = getOpponent(s); const won = s.playerScore > s.opponentScore;

    const px = sw * 0.15, py = sh * 0.1, pw = sw * 0.7, ph = sh * 0.8;
    g.roundRect(px, py, pw, ph, 8); g.fill({ color: 0x0a0a18, alpha: 0.92 });
    g.roundRect(px, py, pw, ph, 8); g.stroke({ color: won ? 0xffd700 : 0x553333, width: 2 });

    if (won) {
      // Victory glow halo (polygon radial burst)
      const glowR = 50 + Math.sin(this._elapsed * 2) * 8;
      const glowCx = sw / 2, glowCy = py + ph * 0.1;
      for (let vgi = 0; vgi < 10; vgi++) {
        const va1 = (vgi / 10) * Math.PI * 2;
        const va2 = ((vgi + 1) / 10) * Math.PI * 2;
        g.moveTo(glowCx, glowCy);
        g.lineTo(glowCx + Math.cos(va1) * glowR, glowCy + Math.sin(va1) * glowR * 0.5);
        g.lineTo(glowCx + Math.cos(va2) * glowR, glowCy + Math.sin(va2) * glowR * 0.5);
        g.fill({ color: 0xffd700, alpha: 0.05 });
      }
      // Inner glow (hexagon)
      g.moveTo(glowCx + glowR * 0.6, glowCy);
      for (let vgi = 1; vgi <= 6; vgi++) {
        g.lineTo(glowCx + Math.cos((vgi / 6) * Math.PI * 2) * glowR * 0.6, glowCy + Math.sin((vgi / 6) * Math.PI * 2) * glowR * 0.35);
      }
      g.fill({ color: 0xffd700, alpha: 0.04 });
      // Victory sparkles
      for (let vs = 0; vs < 6; vs++) {
        const va = this._elapsed * 2 + vs * (Math.PI / 3);
        const vr = 35 + Math.sin(vs * 2.3) * 10;
        g.star(sw / 2 + Math.cos(va) * vr, py + ph * 0.1 + Math.sin(va) * vr * 0.4, 4, 2.5, 1);
        g.fill({ color: 0xffd700, alpha: 0.2 + Math.sin(this._elapsed * 3 + vs) * 0.15 });
      }
      // Decorative crossed swords behind title
      g.moveTo(sw / 2 - 60, py + ph * 0.06);
      g.lineTo(sw / 2 + 20, py + ph * 0.14);
      g.stroke({ color: 0xffd700, width: 1.5, alpha: 0.15 } as any);
      g.moveTo(sw / 2 + 60, py + ph * 0.06);
      g.lineTo(sw / 2 - 20, py + ph * 0.14);
      g.stroke({ color: 0xffd700, width: 1.5, alpha: 0.15 } as any);

      this._addText("VICTORY!", S_CROWN, sw / 2, py + ph * 0.1);
      this._addText(`You defeated ${opp.name} ${opp.title}`, S_BODY, sw / 2, py + ph * 0.24);
      this._addText(`${s.playerScore} - ${s.opponentScore}`, S_RESULT, sw / 2, py + ph * 0.34);
      this._addText(`Gold earned: ${s.gold}g`, S_GOLD, sw / 2, py + ph * 0.40);
      g.roundRect(sw * 0.22, py + ph * 0.46, sw * 0.56, 36, 6); g.fill({ color: 0x111122, alpha: 0.7 });
      this._addText(`"${opp.defeated}"`, S_BODY_ITALIC, sw / 2, py + ph * 0.485);
      if (s.roundIndex + 1 < TOURNAMENT_KNIGHTS.length) {
        const next = TOURNAMENT_KNIGHTS[s.roundIndex + 1];
        this._addText(`Next: ${next.name} ${next.title}`, S_SUBTITLE, sw / 2, py + ph * 0.58);
        this._addText("\u2605".repeat(Math.ceil(next.skill * 5)) + "\u2606".repeat(5 - Math.ceil(next.skill * 5)), S_AIM_LABEL, sw / 2, py + ph * 0.64);
        if (next.abilityName) {
          this._addText(`\u2694 ${next.abilityName}: ${next.abilityDesc}`, S_ABILITY, sw / 2, py + ph * 0.70);
        }
      }
    } else {
      // Defeat vignette (dark corners)
      const dvig = 0.2;
      g.moveTo(px, py); g.lineTo(px + pw * 0.3, py); g.lineTo(px, py + ph * 0.3); g.fill({ color: 0x000000, alpha: dvig });
      g.moveTo(px + pw, py); g.lineTo(px + pw * 0.7, py); g.lineTo(px + pw, py + ph * 0.3); g.fill({ color: 0x000000, alpha: dvig });
      g.moveTo(px, py + ph); g.lineTo(px + pw * 0.3, py + ph); g.lineTo(px, py + ph * 0.7); g.fill({ color: 0x000000, alpha: dvig });
      g.moveTo(px + pw, py + ph); g.lineTo(px + pw * 0.7, py + ph); g.lineTo(px + pw, py + ph * 0.7); g.fill({ color: 0x000000, alpha: dvig });
      // Broken lance icon
      g.moveTo(sw / 2 - 40, py + ph * 0.06); g.lineTo(sw / 2 - 5, py + ph * 0.14);
      g.stroke({ color: 0x664422, width: 2 });
      g.moveTo(sw / 2 - 5, py + ph * 0.14); g.lineTo(sw / 2 - 2, py + ph * 0.12);
      g.lineTo(sw / 2 + 3, py + ph * 0.16); g.stroke({ color: 0x664422, width: 1.5 }); // break point
      g.moveTo(sw / 2 + 5, py + ph * 0.12); g.lineTo(sw / 2 + 40, py + ph * 0.06);
      g.stroke({ color: 0x664422, width: 2 });

      if (s.challengeMode === "flawless" && s.hitsTaken >= 2) {
        this._addText("CHALLENGE FAILED", S_UNHORSE, sw / 2, py + ph * 0.12);
        this._addText(`${s.hitsTaken} hits taken — max 1 allowed!`, S_BODY, sw / 2, py + ph * 0.26);
      } else {
        this._addText("DEFEAT", S_HIT, sw / 2, py + ph * 0.12);
        this._addText(`${opp.name} ${opp.title} bested you`, S_BODY, sw / 2, py + ph * 0.26);
      }
      this._addText(`${s.playerScore} - ${s.opponentScore}`, S_RESULT, sw / 2, py + ph * 0.36);
      this._addText(`Tournament ends at Round ${s.roundIndex + 1}`, S_SUBTITLE, sw / 2, py + ph * 0.50);
    }
    this._addText("SPACE to continue", S_AIM_INACTIVE, sw / 2, py + ph * 0.88);
  }

  private _renderEvent(g: Graphics, sw: number, sh: number): void {
    this._renderArenaBackground(g, sw, sh);
    g.rect(0, 0, sw, sh); g.fill({ color: 0x000000, alpha: 0.65 });

    const s = this._state;
    const ev = s.currentEvent;
    if (!ev) return;

    const px = sw * 0.2, py = sh * 0.2, pw = sw * 0.6, ph = sh * 0.5;
    g.roundRect(px, py, pw, ph, 10); g.fill({ color: 0x0a0a18, alpha: 0.92 });
    g.roundRect(px, py, pw, ph, 10); g.stroke({ color: ev.color, width: 2 });

    // Animated aura ring (polygon — 10-sided pulsing)
    const iconX = sw / 2, iconY = py + 55;
    const auraR = 32 + Math.sin(this._elapsed * 2) * 4;
    // Outer aura polygon
    g.moveTo(iconX + auraR, iconY);
    for (let ai = 1; ai <= 10; ai++) {
      const aa = (ai / 10) * Math.PI * 2;
      const ar = auraR + Math.sin(this._elapsed * 1.5 + ai * 0.8) * 2;
      g.lineTo(iconX + Math.cos(aa) * ar, iconY + Math.sin(aa) * ar);
    }
    g.fill({ color: ev.color, alpha: 0.06 });
    // Inner aura polygon
    const ir = auraR * 0.75;
    g.moveTo(iconX + ir, iconY);
    for (let ai = 1; ai <= 8; ai++) {
      g.lineTo(iconX + Math.cos((ai / 8) * Math.PI * 2) * ir, iconY + Math.sin((ai / 8) * Math.PI * 2) * ir);
    }
    g.fill({ color: ev.color, alpha: 0.04 });
    // Outer ring stroke (polygon)
    g.moveTo(iconX + auraR, iconY);
    for (let ai = 1; ai <= 12; ai++) {
      const aa = (ai / 12) * Math.PI * 2;
      g.lineTo(iconX + Math.cos(aa) * auraR, iconY + Math.sin(aa) * auraR);
    }
    g.stroke({ color: ev.color, width: 1.5, alpha: 0.3 + Math.sin(this._elapsed * 3) * 0.15 } as any);

    // Event icon (star burst with more detail)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + this._elapsed * 1.5;
      const r1 = 10; const r2 = 24;
      g.moveTo(iconX, iconY);
      g.lineTo(iconX + Math.cos(a) * r2, iconY + Math.sin(a) * r2);
      g.lineTo(iconX + Math.cos(a + 0.25) * r1, iconY + Math.sin(a + 0.25) * r1);
      g.fill({ color: ev.color, alpha: 0.4 });
    }
    // Inner icon polygon (hexagon)
    g.moveTo(iconX + 10, iconY);
    for (let hi = 1; hi <= 6; hi++) {
      const ha = (hi / 6) * Math.PI * 2;
      g.lineTo(iconX + Math.cos(ha) * 10, iconY + Math.sin(ha) * 10);
    }
    g.fill(ev.color);
    // Inner highlight
    g.moveTo(iconX + 5, iconY);
    for (let hi = 1; hi <= 6; hi++) {
      const ha = (hi / 6) * Math.PI * 2;
      g.lineTo(iconX + Math.cos(ha) * 5, iconY + Math.sin(ha) * 5);
    }
    g.fill({ color: 0xffffff, alpha: 0.2 });

    // Spiraling particles outward
    for (let sp = 0; sp < 5; sp++) {
      const sa = this._elapsed * 2 + sp * (Math.PI * 2 / 5);
      const sr = 25 + (this._elapsed * 10 + sp * 8) % 30;
      const sx2 = iconX + Math.cos(sa) * sr;
      const sy2 = iconY + Math.sin(sa) * sr;
      g.star(sx2, sy2, 4, 2, 1); g.fill({ color: ev.color, alpha: 0.3 - (sr - 25) * 0.01 });
    }

    this._addText(ev.name, S_EVENT_TITLE, sw / 2, py + ph * 0.38);
    this._addText(ev.desc, S_BODY, sw / 2, py + ph * 0.52);

    const cont = this._addText("SPACE to continue", S_BTN, sw / 2, py + ph * 0.75);
    cont.alpha = 0.5 + Math.sin(this._elapsed * 3) * 0.5;
  }

  private _renderShop(g: Graphics, sw: number, sh: number): void {
    this._renderArenaBackground(g, sw, sh);
    g.rect(0, 0, sw, sh); g.fill({ color: 0x000000, alpha: 0.6 });
    const s = this._state;

    const px = sw * 0.2, py = sh * 0.08, pw = sw * 0.6, ph = sh * 0.84;
    g.roundRect(px, py, pw, ph, 8); g.fill({ color: 0x0a0a18, alpha: 0.92 });
    g.roundRect(px, py, pw, ph, 8); g.stroke({ color: 0xffd700, width: 2 });

    // Anvil decoration (top-right of panel)
    const anvilX = px + pw - 50, anvilY = py + 40;
    g.moveTo(anvilX - 15, anvilY + 10); g.lineTo(anvilX + 15, anvilY + 10);
    g.lineTo(anvilX + 12, anvilY + 5); g.lineTo(anvilX + 18, anvilY);
    g.lineTo(anvilX + 10, anvilY - 5); g.lineTo(anvilX - 10, anvilY - 5);
    g.lineTo(anvilX - 18, anvilY); g.lineTo(anvilX - 12, anvilY + 5);
    g.fill({ color: 0x445566, alpha: 0.4 });
    // Hammer
    g.moveTo(anvilX + 5, anvilY - 8); g.lineTo(anvilX + 12, anvilY - 20);
    g.stroke({ color: 0x886644, width: 2 });
    g.moveTo(anvilX + 8, anvilY - 20); g.lineTo(anvilX + 16, anvilY - 22);
    g.lineTo(anvilX + 16, anvilY - 16); g.lineTo(anvilX + 8, anvilY - 18);
    g.fill({ color: 0x556677, alpha: 0.5 });
    // Sparks from anvil (animated)
    for (let sp = 0; sp < 3; sp++) {
      const sa = this._elapsed * 5 + sp * 2.1;
      const sx2 = anvilX + Math.cos(sa) * (8 + sp * 3);
      const sy2 = anvilY - 8 + Math.sin(sa) * (5 + sp * 2);
      g.star(sx2, sy2, 4, 2, 1); g.fill({ color: 0xffaa44, alpha: 0.3 + Math.sin(sa * 2) * 0.2 });
    }

    this._addText("ARMORY", S_TITLE, sw / 2, py + 30);
    this._addText(`Gold: \u2B27 ${s.gold}g`, S_GOLD, sw / 2, py + 60);

    // Upgrade level indicators with pips
    const lvY = py + 78;
    this._addText("Lance", S_AIM_INACTIVE, px + pw * 0.2, lvY);
    // Level pips (diamond polygons)
    const drawPip = (px2: number, py2: number, filled: boolean) => {
      g.moveTo(px2, py2 - 3); g.lineTo(px2 + 3, py2); g.lineTo(px2, py2 + 3); g.lineTo(px2 - 3, py2);
      g.fill(filled ? 0xffd700 : 0x222233);
    };
    for (let lv = 0; lv < 2; lv++) drawPip(px + pw * 0.28 + lv * 10, lvY, lv < s.lanceLevel);
    this._addText("Shield", S_AIM_INACTIVE, px + pw * 0.42, lvY);
    for (let lv = 0; lv < 2; lv++) drawPip(px + pw * 0.52 + lv * 10, lvY, lv < s.shieldLevel);
    this._addText("Horse", S_AIM_INACTIVE, px + pw * 0.66, lvY);
    for (let lv = 0; lv < 2; lv++) drawPip(px + pw * 0.75 + lv * 10, lvY, lv < s.horseLevel);

    const items = this._getShopItems();
    const itemStartY = py + 110;
    const itemH = 55;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const iy = itemStartY + i * itemH;
      const selected = s.shopCursor === i;

      // Item box
      g.roundRect(px + 20, iy, pw - 40, itemH - 8, 4);
      g.fill({ color: selected ? 0x1a1a3a : 0x0a0a18, alpha: 0.8 });
      g.roundRect(px + 20, iy, pw - 40, itemH - 8, 4);
      g.stroke({ color: selected ? 0xffd700 : 0x333344, width: selected ? 2 : 1 });

      // Item icon (polygon symbol)
      const iconX2 = px + 36; const iconY2 = iy + (itemH - 8) / 2;
      const iconColor = selected ? 0xffd700 : 0x445566;
      if (item.name.includes("Lance")) {
        // Lance tip icon
        g.moveTo(iconX2, iconY2 - 8); g.lineTo(iconX2 + 3, iconY2); g.lineTo(iconX2, iconY2 + 8);
        g.lineTo(iconX2 - 2, iconY2 + 2); g.lineTo(iconX2 - 2, iconY2 - 2); g.fill(iconColor);
      } else if (item.name.includes("Shield")) {
        // Kite shield icon
        g.moveTo(iconX2, iconY2 - 7); g.quadraticCurveTo(iconX2 + 5, iconY2 - 5, iconX2 + 5, iconY2);
        g.lineTo(iconX2, iconY2 + 8); g.lineTo(iconX2 - 5, iconY2);
        g.quadraticCurveTo(iconX2 - 5, iconY2 - 5, iconX2, iconY2 - 7); g.fill(iconColor);
      } else if (item.name.includes("Horse")) {
        // Horse head icon
        g.moveTo(iconX2 - 4, iconY2 + 5); g.quadraticCurveTo(iconX2 - 5, iconY2 - 3, iconX2 - 2, iconY2 - 7);
        g.quadraticCurveTo(iconX2 + 2, iconY2 - 8, iconX2 + 5, iconY2 - 4);
        g.lineTo(iconX2 + 4, iconY2 + 2); g.quadraticCurveTo(iconX2, iconY2 + 4, iconX2 - 4, iconY2 + 5); g.fill(iconColor);
      } else {
        // Potion bottle icon
        g.moveTo(iconX2 - 2, iconY2 - 7); g.lineTo(iconX2 + 2, iconY2 - 7);
        g.lineTo(iconX2 + 2, iconY2 - 4); g.lineTo(iconX2 + 4, iconY2);
        g.lineTo(iconX2 + 4, iconY2 + 6); g.lineTo(iconX2 - 4, iconY2 + 6);
        g.lineTo(iconX2 - 4, iconY2); g.lineTo(iconX2 - 2, iconY2 - 4); g.fill(iconColor);
        // Potion liquid
        g.moveTo(iconX2 - 3, iconY2 + 2); g.lineTo(iconX2 + 3, iconY2 + 2);
        g.lineTo(iconX2 + 3, iconY2 + 5); g.lineTo(iconX2 - 3, iconY2 + 5); g.fill({ color: 0x44ccaa, alpha: 0.5 });
      }
      // Shimmer on selected item
      if (selected) {
        const shimmer = 0.06 + Math.sin(this._elapsed * 3) * 0.04;
        g.roundRect(px + 21, iy + 1, pw - 42, itemH - 10, 3); g.fill({ color: 0xffd700, alpha: shimmer });
      }

      const nameStyle = item.level >= item.maxLevel && item.maxLevel > 0 ? S_SHOP_MAXED : selected ? S_SHOP_ACTIVE : S_SHOP_ITEM;
      const prefix = selected ? "\u25B6 " : "  ";
      this._addText(`${prefix}${item.name}`, nameStyle, px + 55, iy + 14, 0);
      this._addText(item.desc, S_AIM_INACTIVE, px + 55, iy + 30, 0);

      if (item.cost > 0) {
        const costColor = item.canBuy ? 0xffd700 : 0x664444;
        const costStyle = new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: costColor, fontWeight: "bold" });
        this._addText(`${item.cost}g`, costStyle, px + pw - 50, iy + 20);
      } else if (item.maxLevel > 0) {
        this._addText("MAXED", S_SHOP_MAXED, px + pw - 50, iy + 20);
      }

      // Level pips
      if (item.maxLevel > 0) {
        for (let lv = 0; lv < item.maxLevel; lv++) {
          const pipX = px + pw - 90 + lv * 12;
          g.circle(pipX, iy + 34, 4);
          g.fill(lv < (item.level - (item.canBuy ? 0 : 0)) ? 0xffd700 :
                 lv < (item.maxLevel > 0 && item.level >= item.maxLevel ? item.maxLevel : item.level) ? 0xffd700 : 0x333344);
        }
      }
    }

    // Continue button
    const contY = itemStartY + items.length * itemH + 10;
    const contSelected = s.shopCursor === items.length;
    g.roundRect(px + 60, contY, pw - 120, 36, 6);
    g.fill({ color: contSelected ? 0x224422 : 0x111118, alpha: 0.8 });
    g.roundRect(px + 60, contY, pw - 120, 36, 6);
    g.stroke({ color: contSelected ? 0x44ff44 : 0x334433, width: contSelected ? 2 : 1 });
    this._addText(contSelected ? "\u25B6 CONTINUE TO NEXT MATCH" : "  CONTINUE TO NEXT MATCH",
      contSelected ? S_SHOP_ACTIVE : S_SHOP_ITEM, sw / 2, contY + 18);

    // Next opponent preview
    if (s.roundIndex < TOURNAMENT_KNIGHTS.length) {
      const next = getOpponent(s);
      this._addText(`Next: ${next.name} ${next.title}`, S_SUBTITLE, sw / 2, contY + 52);
      if (next.abilityName) {
        this._addText(`Ability: ${next.abilityName} — ${next.abilityDesc}`, S_ABILITY, sw / 2, contY + 70);
      }
    }

    this._addText("W/S: Navigate  |  SPACE: Buy / Continue", S_AIM_INACTIVE, sw / 2, py + ph - 16);
  }

  private _renderTournamentEnd(g: Graphics, sw: number, sh: number): void {
    this._renderArenaBackground(g, sw, sh);
    g.rect(0, 0, sw, sh); g.fill({ color: 0x000000, alpha: 0.6 });

    const px = sw * 0.1, py = sh * 0.05, pw = sw * 0.8, ph = sh * 0.9;
    g.roundRect(px, py, pw, ph, 8); g.fill({ color: 0x0a0a18, alpha: 0.92 });
    g.roundRect(px, py, pw, ph, 8); g.stroke({ color: 0xffd700, width: 3 });
    g.roundRect(px + 6, py + 6, pw - 12, ph - 12, 5); g.stroke({ color: 0x886622, width: 1 });
    for (const [cx, cy] of [[px + 10, py + 10], [px + pw - 10, py + 10], [px + 10, py + ph - 10], [px + pw - 10, py + ph - 10]]) {
      // Corner ornament (8-point star polygon)
      g.moveTo(cx, cy - 6); g.lineTo(cx + 2.5, cy - 2.5); g.lineTo(cx + 6, cy); g.lineTo(cx + 2.5, cy + 2.5);
      g.lineTo(cx, cy + 6); g.lineTo(cx - 2.5, cy + 2.5); g.lineTo(cx - 6, cy); g.lineTo(cx - 2.5, cy - 2.5);
      g.fill(0xffd700);
      g.moveTo(cx, cy - 3); g.lineTo(cx + 1.5, cy - 1.5); g.lineTo(cx + 3, cy); g.lineTo(cx + 1.5, cy + 1.5);
      g.lineTo(cx, cy + 3); g.lineTo(cx - 1.5, cy + 1.5); g.lineTo(cx - 3, cy); g.lineTo(cx - 1.5, cy - 1.5);
      g.fill(0x0a0a18);
    }

    const s = this._state; const wonAll = s.roundIndex >= TOURNAMENT_KNIGHTS.length;
    if (wonAll) {
      this._addText("\u2654", S_CROWN, sw / 2, py + ph * 0.06);
      this._addText("CHAMPION!", S_CROWN, sw / 2, py + ph * 0.18);
      this._addText("You have defeated all challengers!", S_SUBTITLE, sw / 2, py + ph * 0.28);
      this._addText("All hail the Grand Champion of Camelot!", S_BODY, sw / 2, py + ph * 0.35);
      // Trophy (elaborate polygon trophy with handles, jewels, light rays)
      const cx = sw / 2, cy = py + ph * 0.5;

      // Light rays behind trophy
      for (let lr = 0; lr < 10; lr++) {
        const la = (lr / 10) * Math.PI * 2 + this._elapsed * 0.3;
        const lLen = 50 + Math.sin(this._elapsed * 0.8 + lr) * 10;
        g.moveTo(cx, cy - 5);
        g.lineTo(cx + Math.cos(la - 0.05) * lLen, cy - 5 + Math.sin(la - 0.05) * lLen * 0.6);
        g.lineTo(cx + Math.cos(la + 0.05) * lLen, cy - 5 + Math.sin(la + 0.05) * lLen * 0.6);
        g.fill({ color: 0xffd700, alpha: 0.04 + Math.sin(this._elapsed * 1.5 + lr) * 0.02 });
      }

      // Base (3-tiered stepped platform)
      g.moveTo(cx - 30, cy + 28); g.lineTo(cx + 30, cy + 28);
      g.lineTo(cx + 28, cy + 24); g.lineTo(cx - 28, cy + 24); g.fill(0xccaa44);
      g.moveTo(cx - 24, cy + 24); g.lineTo(cx + 24, cy + 24);
      g.lineTo(cx + 22, cy + 20); g.lineTo(cx - 22, cy + 20); g.fill(0xddbb55);
      g.moveTo(cx - 18, cy + 20); g.lineTo(cx + 18, cy + 20);
      g.lineTo(cx + 16, cy + 16); g.lineTo(cx - 16, cy + 16); g.fill(0xeebb00);

      // Stem
      g.moveTo(cx - 5, cy + 16); g.lineTo(cx + 5, cy + 16);
      g.lineTo(cx + 4, cy + 2); g.lineTo(cx - 4, cy + 2); g.fill(0xffd700);
      // Stem knob
      g.moveTo(cx - 7, cy + 4); g.quadraticCurveTo(cx, cy + 8, cx + 7, cy + 4);
      g.quadraticCurveTo(cx, cy + 1, cx - 7, cy + 4); g.fill(0xeebb00);

      // Cup body (polygon with curves)
      g.moveTo(cx - 20, cy + 2);
      g.quadraticCurveTo(cx - 24, cy - 8, cx - 22, cy - 16);
      g.quadraticCurveTo(cx - 18, cy - 24, cx, cy - 26);
      g.quadraticCurveTo(cx + 18, cy - 24, cx + 22, cy - 16);
      g.quadraticCurveTo(cx + 24, cy - 8, cx + 20, cy + 2);
      g.fill(0xffd700);
      // Cup interior
      g.moveTo(cx - 16, cy - 2);
      g.quadraticCurveTo(cx - 18, cy - 10, cx - 16, cy - 16);
      g.quadraticCurveTo(cx - 12, cy - 22, cx, cy - 22);
      g.quadraticCurveTo(cx + 12, cy - 22, cx + 16, cy - 16);
      g.quadraticCurveTo(cx + 18, cy - 10, cx + 16, cy - 2);
      g.fill(0x0a0a18);
      // Cup rim
      g.moveTo(cx - 22, cy - 16); g.quadraticCurveTo(cx, cy - 14, cx + 22, cy - 16);
      g.stroke({ color: 0xffffff, width: 0.5, alpha: 0.2 } as any);

      // Handles (curved polygon arms)
      for (const hdir of [-1, 1]) {
        g.moveTo(cx + hdir * 20, cy - 10);
        g.quadraticCurveTo(cx + hdir * 30, cy - 14, cx + hdir * 32, cy - 6);
        g.quadraticCurveTo(cx + hdir * 30, cy + 4, cx + hdir * 20, cy + 2);
        g.quadraticCurveTo(cx + hdir * 26, cy - 2, cx + hdir * 26, cy - 8);
        g.quadraticCurveTo(cx + hdir * 24, cy - 12, cx + hdir * 20, cy - 10);
        g.fill(0xeebb00);
      }

      // Jewels on cup (polygon gem shapes)
      // Ruby (octagon with shine)
      g.moveTo(cx - 2, cy - 9); g.lineTo(cx + 2, cy - 9); g.lineTo(cx + 3, cy - 7);
      g.lineTo(cx + 3, cy - 5); g.lineTo(cx + 2, cy - 3); g.lineTo(cx - 2, cy - 3);
      g.lineTo(cx - 3, cy - 5); g.lineTo(cx - 3, cy - 7); g.fill(0xff2222);
      g.moveTo(cx - 1, cy - 8); g.lineTo(cx + 1, cy - 8); g.lineTo(cx + 1, cy - 6); g.lineTo(cx - 1, cy - 6);
      g.fill({ color: 0xffffff, alpha: 0.25 });
      // Sapphire (hexagon)
      g.moveTo(cx - 12, cy - 12); g.lineTo(cx - 10, cy - 12); g.lineTo(cx - 9, cy - 10);
      g.lineTo(cx - 10, cy - 8); g.lineTo(cx - 12, cy - 8); g.lineTo(cx - 13, cy - 10); g.fill(0x2244ff);
      // Emerald (hexagon)
      g.moveTo(cx + 10, cy - 12); g.lineTo(cx + 12, cy - 12); g.lineTo(cx + 13, cy - 10);
      g.lineTo(cx + 12, cy - 8); g.lineTo(cx + 10, cy - 8); g.lineTo(cx + 9, cy - 10); g.fill(0x22cc44);

      // Decorative bands on cup
      g.moveTo(cx - 18, cy - 4); g.quadraticCurveTo(cx, cy - 2, cx + 18, cy - 4);
      g.stroke({ color: 0xffffff, width: 0.8, alpha: 0.15 } as any);
      g.moveTo(cx - 20, cy + 0); g.quadraticCurveTo(cx, cy + 2, cx + 20, cy + 0);
      g.stroke({ color: 0xffffff, width: 0.8, alpha: 0.15 } as any);

      // Orbiting stars (more and varied)
      for (let i = 0; i < 12; i++) {
        const a = this._elapsed * 1.5 + i * (Math.PI * 2 / 12);
        const orbitR = 40 + Math.sin(i * 1.7) * 8;
        const sx2 = cx + Math.cos(a) * orbitR;
        const sy2 = cy - 8 + Math.sin(a) * orbitR * 0.55;
        const starAlpha = 0.2 + Math.sin(this._elapsed * 3 + i) * 0.2;
        g.star(sx2, sy2, 4, 3, 1.5); g.fill({ color: i % 3 === 0 ? 0xffffff : 0xffd700, alpha: starAlpha });
      }
      this._addText(TOURNAMENT_KNIGHTS.map(k => k.name.split(" ")[1]).join(" \u2192 "), S_STAMINA, sw / 2, py + ph * 0.65);
    } else {
      this._addText("TOURNAMENT OVER", S_RESULT, sw / 2, py + ph * 0.1);
      this._addText(`You defeated ${s.playerWins} of ${TOURNAMENT_KNIGHTS.length} knights`, S_SUBTITLE, sw / 2, py + ph * 0.22);
      if (s.playerWins > 0) {
        const def = TOURNAMENT_KNIGHTS.slice(0, s.playerWins);
        for (let i = 0; i < def.length; i++) {
          this._addText(`\u2713 ${def[i].name} ${def[i].title}`, S_BRACKET_WON, sw / 2, py + ph * 0.32 + i * 18);
        }
      } else { this._addText("No knights defeated. Train harder!", S_BODY, sw / 2, py + ph * 0.35); }
      this._addText("Train harder and return, brave knight!", S_BODY_ITALIC, sw / 2, py + ph * 0.65);
    }
    this._addText(`Personal Best: ${s.bestRound}/${TOURNAMENT_KNIGHTS.length}`, S_STAMINA, sw / 2, py + ph * 0.70);

    // Challenge completion badges
    const badges: string[] = [];
    if (s.mastery.challengeClears.normal) badges.push("\u2713 Tournament");
    if (s.mastery.challengeClears.ironGauntlet) badges.push("\u2713 Iron Gauntlet");
    if (s.mastery.challengeClears.flawless) badges.push("\u2713 Flawless");
    if (s.mastery.challengeClears.handicap) badges.push("\u2713 Handicap");
    if (badges.length > 0) {
      this._addText(`Challenges: ${badges.join("  ")}`, S_BRACKET_WON, sw / 2, py + ph * 0.73);
    }
    // Show current challenge result
    if (s.challengeMode !== "normal" && wonAll) {
      const ch = CHALLENGE_DEFS[s.challengeMode];
      const clrStyle = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: ch.color, fontWeight: "bold" });
      this._addText(`\u2B22 ${ch.name} CLEARED!`, clrStyle, sw / 2, py + ph * 0.67);
    }

    // Tournament stats panel
    const statY = py + ph * 0.74;
    g.roundRect(px + 25, statY, pw - 50, ph * 0.11, 4); g.fill({ color: 0x000000, alpha: 0.3 });
    const cols = [px + pw * 0.15, px + pw * 0.38, px + pw * 0.62, px + pw * 0.85];
    this._addText("Perfects", S_STAT_LABEL, cols[0], statY + 6);
    this._addText(`${s.totalPerfects}`, S_STAT_VALUE, cols[0], statY + 20);
    this._addText("Unhorsed", S_STAT_LABEL, cols[1], statY + 6);
    this._addText(`${s.totalUnhorses}`, S_STAT_VALUE, cols[1], statY + 20);
    this._addText("Gold", S_STAT_LABEL, cols[2], statY + 6);
    this._addText(`${s.totalGoldEarned}g`, S_STAT_VALUE, cols[2], statY + 20);
    this._addText("Streak", S_STAT_LABEL, cols[3], statY + 6);
    this._addText(`${s.bestStreakEver}x`, S_STAT_VALUE, cols[3], statY + 20);

    // New unlock reveal — check for newly earned cosmetics/challenges
    const newUnlocks = COSMETIC_UNLOCKS.filter(c => c.check(s.mastery) && !s.unlockedCosmetics.includes(c.id));
    if (newUnlocks.length > 0) {
      const nuy = py + ph * 0.85;
      g.roundRect(px + 30, nuy - 8, pw - 60, 22, 4); g.fill({ color: 0x224422, alpha: 0.5 });
      g.roundRect(px + 30, nuy - 8, pw - 60, 22, 4); g.stroke({ color: 0x44ff44, width: 1 });
      // Sparkle animation around unlock
      for (let ui = 0; ui < 4; ui++) {
        const ua = this._elapsed * 2 + ui * (Math.PI / 2);
        const ux = px + pw / 2 + Math.cos(ua) * (pw * 0.3);
        const uy2 = nuy + Math.sin(ua) * 8;
        g.star(ux, uy2, 4, 2.5, 1); g.fill({ color: 0x44ff44, alpha: 0.3 + Math.sin(this._elapsed * 3 + ui) * 0.2 });
      }
      const unlockNames = newUnlocks.map(u => u.name).join(", ");
      this._addText(`\u2B50 NEW UNLOCK: ${unlockNames}!`, S_BRACKET_WON, sw / 2, nuy + 3);
    }

    this._addText("PRESS SPACE to play again", S_BTN, sw / 2, py + ph * 0.91);
    this._addText("ESC to exit", S_AIM_INACTIVE, sw / 2, py + ph * 0.96);
  }

  // ---- UI helpers ---------------------------------------------------------

  private _renderStaminaBar(g: Graphics, x: number, y: number, w: number, h: number, stamina: number): void {
    // Danger glow when low
    const r = stamina / MAX_STAMINA;
    if (r < 0.25 && r > 0) {
      const dangerPulse = 0.1 + Math.sin(this._elapsed * 6) * 0.08;
      g.roundRect(x - 2, y - 2, w + 4, h + 4, h / 2 + 2);
      g.fill({ color: 0xff2222, alpha: dangerPulse });
    }
    // Background
    g.roundRect(x, y, w, h, h / 2); g.fill({ color: 0x000000, alpha: 0.5 });
    // Fill with smooth color interpolation
    if (r > 0) {
      // Blend between red/yellow/green based on ratio
      let cr: number, cg: number, cb: number;
      if (r > 0.5) {
        const t = (r - 0.5) * 2;
        cr = Math.floor(0xcc * (1 - t) + 0x44 * t);
        cg = Math.floor(0xaa * (1 - t) + 0xcc * t);
        cb = Math.floor(0x44 * (1 - t) + 0x66 * t);
      } else {
        const t = r * 4; // 0-1 over 0-0.25
        cr = Math.floor(0xcc);
        cg = Math.floor(0x44 * (1 - Math.max(0, 1 - t)) + 0xaa * Math.min(1, t));
        cb = Math.floor(0x44);
      }
      const c = (cr << 16) | (cg << 8) | cb;
      g.roundRect(x, y, w * r, h, h / 2); g.fill(c);
      // Stamina bar sheen (animated highlight sweep)
      const sheenX = x + ((this._elapsed * 0.3) % 1.2) * w;
      if (sheenX < x + w * r) {
        g.roundRect(sheenX, y, 8, h, h / 2);
        g.fill({ color: 0xffffff, alpha: 0.12 });
      }
    }
    g.roundRect(x, y, w, h, h / 2); g.stroke({ color: r < 0.25 ? 0xcc4444 : 0x666666, width: 1 });
  }

  private _renderScoreBar(g: Graphics, sw: number): void {
    const s = this._state; const opp = getOpponent(s);
    // Score bar with breathing border
    const breathe = 0.6 + Math.sin(this._elapsed * 1.5) * 0.4;
    g.roundRect(sw * 0.25, 6, sw * 0.5, 36, 6); g.fill({ color: 0x0a0a18, alpha: 0.8 });
    g.roundRect(sw * 0.25, 6, sw * 0.5, 36, 6); g.stroke({ color: 0xffd700, width: 0.8 + breathe * 0.4 });
    this._addText(`You: ${s.playerScore}`, S_SCORE, sw * 0.34, 24);
    const tc = tiltsForRound(s.roundIndex);
    this._addText(`Tilt ${s.tiltIndex + 1}/${tc}`, S_AIM_INACTIVE, sw / 2, 18);
    this._addText(`${s.opponentScore} :${opp.name.split(" ")[1]}`, S_SCORE, sw * 0.66, 24);
    for (let i = 0; i < tc; i++) {
      const dx = sw / 2 - ((tc - 1) / 2 - i) * 14, dy = 34;
      const dotColor = i < s.tiltIndex ? 0xffd700 : i === s.tiltIndex ? 0xffffff : 0x222233;
      // Diamond polygon indicator
      g.moveTo(dx, dy - 4); g.lineTo(dx + 4, dy); g.lineTo(dx, dy + 4); g.lineTo(dx - 4, dy); g.fill(dotColor);
      if (i < s.tiltIndex) {
        // Inner glow diamond
        g.moveTo(dx, dy - 2.5); g.lineTo(dx + 2.5, dy); g.lineTo(dx, dy + 2.5); g.lineTo(dx - 2.5, dy);
        g.fill(0xffaa00);
      }
    }
  }

  // ---- Draw helpers -------------------------------------------------------

  private _drawKnightSilhouette(g: Graphics, x: number, y: number, color: number, facingRight: boolean, heraldry: Heraldry, c1: number, c2: number): void {
    const dir = facingRight ? 1 : -1;
    // Horse body polygon (silhouette)
    g.moveTo(x - dir * 30, y + 20);
    g.quadraticCurveTo(x - dir * 35, y, x - dir * 20, y - 5);
    g.quadraticCurveTo(x, y - 10, x + dir * 20, y - 8);
    g.quadraticCurveTo(x + dir * 32, y - 4, x + dir * 30, y + 10);
    g.quadraticCurveTo(x + dir * 20, y + 25, x, y + 25);
    g.quadraticCurveTo(x - dir * 20, y + 25, x - dir * 30, y + 20);
    g.fill(0x333344);
    // Horse head polygon
    g.moveTo(x + dir * 28, y - 2);
    g.quadraticCurveTo(x + dir * 35, y - 15, x + dir * 40, y - 18);
    g.quadraticCurveTo(x + dir * 45, y - 12, x + dir * 42, y - 2);
    g.quadraticCurveTo(x + dir * 38, y + 2, x + dir * 28, y - 2);
    g.fill(0x333344);
    // Legs (tapered polygon)
    for (const lx of [-20, -8, 8, 20]) {
      g.moveTo(x + lx - 2, y + 23);
      g.lineTo(x + lx - 1.5, y + 43);
      g.lineTo(x + lx + 1.5, y + 43);
      g.lineTo(x + lx + 2, y + 23);
      g.fill(0x333344);
    }
    // Rider torso polygon
    g.moveTo(x - 8, y - 3);
    g.quadraticCurveTo(x - 10, y - 20, x - 8, y - 30);
    g.lineTo(x + 8, y - 30);
    g.quadraticCurveTo(x + 10, y - 20, x + 8, y - 3);
    g.fill(color);
    // Rider helm polygon
    g.moveTo(x - 8, y - 30);
    g.quadraticCurveTo(x - 10, y - 42, x, y - 46);
    g.quadraticCurveTo(x + 10, y - 42, x + 8, y - 30);
    g.fill(color);
    // Visor slit
    g.moveTo(x - 6, y - 38);
    g.lineTo(x + 6, y - 38);
    g.lineTo(x + 5, y - 36);
    g.lineTo(x - 5, y - 36);
    g.fill(0x111122);
    // Shield (kite polygon)
    const sx = x - dir * 14, sy = y - 15;
    g.moveTo(sx, sy - 10);
    g.quadraticCurveTo(sx + 7, sy - 8, sx + 7, sy);
    g.lineTo(sx + 4, sy + 8);
    g.lineTo(sx, sy + 12);
    g.lineTo(sx - 4, sy + 8);
    g.lineTo(sx - 7, sy);
    g.quadraticCurveTo(sx - 7, sy - 8, sx, sy - 10);
    g.fill(c1);
    this._drawHeraldry(g, sx, sy, 12, 18, heraldry, c1, c2);
    g.moveTo(sx, sy - 10);
    g.quadraticCurveTo(sx + 7, sy - 8, sx + 7, sy);
    g.lineTo(sx + 4, sy + 8);
    g.lineTo(sx, sy + 12);
    g.lineTo(sx - 4, sy + 8);
    g.lineTo(sx - 7, sy);
    g.quadraticCurveTo(sx - 7, sy - 8, sx, sy - 10);
    g.stroke({ color: 0xffd700, width: 1 });
    // Lance (tapered polygon)
    g.moveTo(x + dir * 10, y - 16);
    g.lineTo(x + dir * 70, y - 26);
    g.lineTo(x + dir * 70, y - 24);
    g.lineTo(x + dir * 10, y - 13);
    g.fill(0xccaa66);
    // Lance tip
    g.moveTo(x + dir * 70, y - 27);
    g.lineTo(x + dir * 78, y - 25);
    g.lineTo(x + dir * 70, y - 23);
    g.fill(0xaaaaaa);
  }

  private _drawKnightFull(
    g: Graphics, x: number, y: number,
    armorColor: number, armorColor2: number, horseColor: number,
    facingRight: boolean, lanceZone: Zone,
    chargeProgress: number, fallAngle: number, stamina: number,
    heraldry: Heraldry,
  ): void {
    const dir = facingRight ? 1 : -1;

    // === HORSE (polygon body) ===
    // Hindquarters polygon
    g.moveTo(x - dir * 35, y + 20);
    g.quadraticCurveTo(x - dir * 40, y - 5, x - dir * 25, y - 8);
    g.lineTo(x - dir * 10, y - 10);
    g.quadraticCurveTo(x - dir * 5, y + 15, x - dir * 20, y + 28);
    g.lineTo(x - dir * 35, y + 20);
    g.fill(horseColor);
    // Barrel (main body polygon)
    g.moveTo(x - dir * 10, y - 10);
    g.quadraticCurveTo(x + dir * 5, y - 14, x + dir * 20, y - 12);
    g.quadraticCurveTo(x + dir * 30, y - 8, x + dir * 35, y - 2);
    g.lineTo(x + dir * 25, y + 20);
    g.quadraticCurveTo(x + dir * 5, y + 28, x - dir * 20, y + 28);
    g.quadraticCurveTo(x - dir * 5, y + 15, x - dir * 10, y - 10);
    g.fill(horseColor);
    // Belly highlight polygon
    g.moveTo(x - dir * 15, y + 18);
    g.quadraticCurveTo(x, y + 24, x + dir * 15, y + 18);
    g.quadraticCurveTo(x, y + 14, x - dir * 15, y + 18);
    g.fill({ color: 0xffffff, alpha: 0.06 });
    // Withers/back ridge
    g.moveTo(x - dir * 15, y - 10);
    g.quadraticCurveTo(x, y - 14, x + dir * 15, y - 12);
    g.stroke({ color: 0x000000, width: 1, alpha: 0.08 } as any);
    // Neck polygon (muscular shape)
    g.moveTo(x + dir * 30, y - 6);
    g.quadraticCurveTo(x + dir * 36, y - 18, x + dir * 45, y - 22);
    g.quadraticCurveTo(x + dir * 50, y - 14, x + dir * 48, y - 2);
    g.quadraticCurveTo(x + dir * 42, y + 4, x + dir * 30, y + 2);
    g.fill(horseColor);
    // Neck muscle definition
    g.moveTo(x + dir * 34, y - 4);
    g.quadraticCurveTo(x + dir * 40, y - 16, x + dir * 46, y - 18);
    g.stroke({ color: 0x000000, width: 0.8, alpha: 0.06 } as any);
    // Head polygon (detailed jaw, brow)
    g.moveTo(x + dir * 45, y - 20);
    g.quadraticCurveTo(x + dir * 50, y - 24, x + dir * 54, y - 16);
    g.lineTo(x + dir * 58, y - 8);
    g.quadraticCurveTo(x + dir * 60, y - 2, x + dir * 56, y + 2);
    g.lineTo(x + dir * 48, y + 2);
    g.quadraticCurveTo(x + dir * 44, y - 4, x + dir * 44, y - 12);
    g.quadraticCurveTo(x + dir * 44, y - 18, x + dir * 45, y - 20);
    g.fill(horseColor);
    // Jaw line
    g.moveTo(x + dir * 48, y + 1);
    g.quadraticCurveTo(x + dir * 52, y - 2, x + dir * 56, y + 1);
    g.stroke({ color: 0x000000, width: 0.8, alpha: 0.08 } as any);
    // Chanfron (face armor — multi-segment polygon)
    g.moveTo(x + dir * 44, y - 20);
    g.lineTo(x + dir * 50, y - 22);
    g.lineTo(x + dir * 56, y - 12);
    g.lineTo(x + dir * 58, y - 6);
    g.lineTo(x + dir * 56, y - 2);
    g.lineTo(x + dir * 50, y - 4);
    g.lineTo(x + dir * 46, y - 12);
    g.fill({ color: armorColor, alpha: 0.55 });
    // Chanfron ridge/rivet line
    g.moveTo(x + dir * 48, y - 20);
    g.lineTo(x + dir * 54, y - 8);
    g.stroke({ color: 0xffd700, width: 0.8 });
    // Nostril polygon
    g.moveTo(x + dir * 57, y + 0.5);
    g.quadraticCurveTo(x + dir * 59, y - 1.5, x + dir * 58, y - 3);
    g.quadraticCurveTo(x + dir * 56, y - 1, x + dir * 57, y + 0.5);
    g.fill(0x222222);
    // Ears (two overlapping polygons)
    g.moveTo(x + dir * 48, y - 20);
    g.quadraticCurveTo(x + dir * 49, y - 30, x + dir * 52, y - 32);
    g.quadraticCurveTo(x + dir * 50, y - 26, x + dir * 47, y - 20);
    g.fill(horseColor);
    // Inner ear
    g.moveTo(x + dir * 49, y - 22);
    g.quadraticCurveTo(x + dir * 50, y - 28, x + dir * 51, y - 30);
    g.quadraticCurveTo(x + dir * 50, y - 25, x + dir * 48, y - 22);
    g.fill({ color: 0xddaa88, alpha: 0.4 });
    // Eye (polygon almond shape with iris and pupil)
    const ex = x + dir * 47, ey = y - 12;
    // Sclera (almond polygon)
    g.moveTo(ex - dir * 4, ey);
    g.quadraticCurveTo(ex - dir * 2, ey - 3, ex + dir * 1, ey - 2.5);
    g.quadraticCurveTo(ex + dir * 4, ey - 1.5, ex + dir * 4.5, ey + 0.5);
    g.quadraticCurveTo(ex + dir * 3, ey + 2.5, ex, ey + 2);
    g.quadraticCurveTo(ex - dir * 3, ey + 1.5, ex - dir * 4, ey);
    g.fill(0x222211);
    // Iris polygon (slightly oval)
    g.moveTo(ex - dir * 0.5, ey - 2);
    g.quadraticCurveTo(ex + dir * 2.5, ey - 1.5, ex + dir * 2.5, ey + 0.5);
    g.quadraticCurveTo(ex + dir * 1.5, ey + 2, ex - dir * 0.5, ey + 1.5);
    g.quadraticCurveTo(ex - dir * 2, ey + 0.5, ex - dir * 0.5, ey - 2);
    g.fill(0x443311);
    // Pupil (small polygon)
    g.moveTo(ex + dir * 0.5, ey - 1);
    g.quadraticCurveTo(ex + dir * 1.8, ey - 0.5, ex + dir * 1.5, ey + 0.8);
    g.quadraticCurveTo(ex + dir * 0.5, ey + 1.2, ex - dir * 0.3, ey + 0.5);
    g.quadraticCurveTo(ex - dir * 0.5, ey - 0.5, ex + dir * 0.5, ey - 1);
    g.fill(0x111111);
    // Highlight dot
    g.circle(ex + dir * 1.2, ey - 0.8, 0.5); g.fill(0x555544);
    // Brow ridge polygon
    g.moveTo(ex - dir * 4.5, ey - 2);
    g.quadraticCurveTo(ex - dir * 1, ey - 4, ex + dir * 3, ey - 2.5);
    g.quadraticCurveTo(ex + dir * 4.5, ey - 1.5, ex + dir * 5, ey - 1);
    g.stroke({ color: 0x000000, width: 1, alpha: 0.1 } as any);

    // Legs (tapered polygon legs with knee joint)
    const legPhase = this._elapsed * 10;
    for (let i = 0; i < 4; i++) {
      const lx = x + (i - 1.5) * 16; const ly = y + 30;
      const isChg = chargeProgress > 0;
      const kick = isChg ? Math.sin(legPhase + i * 1.8) * 12 : Math.sin(this._elapsed * 2 + i * 1.5) * 2;
      const kickY = isChg ? Math.abs(Math.cos(legPhase + i * 1.8)) * 6 : 0;
      const kneeX = lx + kick * 0.6; const kneeY = ly + 10 - kickY * 0.5;
      const hoofX = lx + kick; const hoofY = ly + 22 - kickY;
      // Upper leg (tapered polygon)
      g.moveTo(lx - 3, ly);
      g.lineTo(kneeX - 2.5, kneeY);
      g.lineTo(kneeX + 2.5, kneeY);
      g.lineTo(lx + 3, ly);
      g.fill(horseColor);
      // Knee joint polygon
      g.moveTo(kneeX - 3, kneeY - 1);
      g.quadraticCurveTo(kneeX + (kick > 0 ? 3 : -3), kneeY, kneeX - 1, kneeY + 3);
      g.quadraticCurveTo(kneeX - 3, kneeY + 1, kneeX - 3, kneeY - 1);
      g.fill(horseColor);
      // Lower leg (tapered polygon — cannon bone)
      g.moveTo(kneeX - 2, kneeY + 1);
      g.lineTo(hoofX - 1.5, hoofY - 2);
      g.lineTo(hoofX + 1.5, hoofY - 2);
      g.lineTo(kneeX + 2, kneeY + 1);
      g.fill(horseColor);
      // Fetlock (ankle tuft polygon)
      g.moveTo(hoofX - 3, hoofY - 3);
      g.quadraticCurveTo(hoofX - 5, hoofY, hoofX - 3, hoofY + 1);
      g.lineTo(hoofX + 3, hoofY + 1);
      g.quadraticCurveTo(hoofX + 5, hoofY, hoofX + 3, hoofY - 3);
      g.fill(horseColor);
      // Hoof polygon (trapezoid)
      g.moveTo(hoofX - 3.5, hoofY);
      g.lineTo(hoofX - 4, hoofY + 3);
      g.lineTo(hoofX + 4, hoofY + 3);
      g.lineTo(hoofX + 3.5, hoofY);
      g.fill(0x222222);
      // Hoof band
      g.moveTo(hoofX - 3.5, hoofY + 1);
      g.lineTo(hoofX + 3.5, hoofY + 1);
      g.stroke({ color: 0x333333, width: 0.8 });
    }

    // Tail (multi-strand flowing polygons)
    const tw1 = Math.sin(this._elapsed * 3) * 8; const tw2 = Math.sin(this._elapsed * 5) * 4;
    for (let s2 = 0; s2 < 4; s2++) {
      const offset = s2 * 1.5 - 2;
      const tw1b = tw1 + Math.sin(this._elapsed * 4 + s2) * 3;
      const tw2b = tw2 + Math.cos(this._elapsed * 3.5 + s2) * 2;
      g.moveTo(x - dir * 38, y + 5 + offset);
      g.quadraticCurveTo(x - dir * 52, y - 10 + tw1b + offset, x - dir * 62 + s2, y - 5 + tw2b + offset);
      g.stroke({ color: horseColor, width: 2.5 - s2 * 0.3 });
    }

    // Mane (feathered polygon strands)
    for (let i = 0; i < 8; i++) {
      const mx = x + dir * (30 + i * 2.2);
      const my = y - 16 + i * 1.8;
      const mw = Math.sin(this._elapsed * 4.5 + i * 0.8) * 4;
      const mLen = 8 + Math.sin(i * 1.3) * 3;
      // Feather-shaped polygon strand
      g.moveTo(mx, my);
      g.quadraticCurveTo(mx - dir * 3, my - mLen * 0.5 + mw, mx - dir * 7, my - mLen + mw);
      g.quadraticCurveTo(mx - dir * 5, my - mLen * 0.6 + mw * 0.7, mx - dir * 1, my - 1);
      g.fill(horseColor);
    }

    // Barding (caparison — with scalloped bottom edge polygon)
    g.moveTo(x - 30, y + 3); g.lineTo(x + 30, y + 3);
    g.lineTo(x + 26, y + 26);
    // Scalloped edge
    for (let s2 = 5; s2 >= -5; s2--) {
      const sx2 = x + s2 * 5;
      const sy = y + 26 + Math.sin(s2 * 1.2) * 3 + 2;
      g.lineTo(sx2, sy);
    }
    g.lineTo(x - 30, y + 3);
    g.fill({ color: armorColor, alpha: 0.5 });
    // Barding trim (scalloped gold edge)
    g.moveTo(x + 26, y + 26);
    for (let s2 = 5; s2 >= -5; s2--) {
      g.lineTo(x + s2 * 5, y + 26 + Math.sin(s2 * 1.2) * 3 + 2);
    }
    g.stroke({ color: 0xffd700, width: 1.5 });
    // Barding heraldry
    this._drawHeraldry(g, x, y + 14, 20, 16, heraldry, armorColor, armorColor2);
    // Chest plate (polygon armor segments)
    g.moveTo(x + dir * 20, y - 6);
    g.quadraticCurveTo(x + dir * 32, y - 2, x + dir * 30, y + 10);
    g.quadraticCurveTo(x + dir * 28, y + 18, x + dir * 18, y + 20);
    g.quadraticCurveTo(x + dir * 16, y + 8, x + dir * 20, y - 6);
    g.fill({ color: armorColor, alpha: 0.4 });
    // Chest plate rivets
    for (let r = 0; r < 3; r++) {
      g.circle(x + dir * (22 + r * 2), y + 2 + r * 6, 1);
      g.fill({ color: 0xffd700, alpha: 0.5 });
    }

    // Saddle (multi-polygon)
    // Saddle pad
    g.moveTo(x - 12, y - 4); g.lineTo(x + 12, y - 4);
    g.quadraticCurveTo(x + 14, y + 4, x + 10, y + 6);
    g.lineTo(x - 10, y + 6);
    g.quadraticCurveTo(x - 14, y + 4, x - 12, y - 4);
    g.fill(0x442211);
    // Saddle seat
    g.moveTo(x - 8, y - 6);
    g.quadraticCurveTo(x, y - 8, x + 8, y - 6);
    g.quadraticCurveTo(x + 6, y - 2, x - 6, y - 2);
    g.fill(0x553322);
    // Cantle (back of saddle)
    g.moveTo(x - 7, y - 4); g.lineTo(x - 9, y - 10);
    g.quadraticCurveTo(x - 6, y - 12, x - 4, y - 8);
    g.fill(0x553322);
    // Pommel (front of saddle)
    g.moveTo(x + 7, y - 4); g.lineTo(x + 9, y - 10);
    g.quadraticCurveTo(x + 6, y - 12, x + 4, y - 8);
    g.fill(0x553322);
    // Stirrup leather strap
    g.moveTo(x - dir * 7, y + 2);
    g.quadraticCurveTo(x - dir * 10, y + 10, x - dir * 12, y + 16);
    g.stroke({ color: 0x886644, width: 2 });
    // Stirrup (polygon D-shape)
    g.moveTo(x - dir * 14, y + 14);
    g.quadraticCurveTo(x - dir * 16, y + 18, x - dir * 14, y + 22);
    g.lineTo(x - dir * 10, y + 22);
    g.quadraticCurveTo(x - dir * 8, y + 18, x - dir * 10, y + 14);
    g.lineTo(x - dir * 14, y + 14);
    g.stroke({ color: 0x888888, width: 1.5 });
    // Stirrup base
    g.moveTo(x - dir * 14, y + 21);
    g.lineTo(x - dir * 10, y + 21);
    g.stroke({ color: 0x999999, width: 2 });

    // === RIDER ===
    const riderOffX = fallAngle > 0 ? Math.sin(fallAngle) * 45 * (-dir) : 0;
    const riderOffY = fallAngle > 0 ? (1 - Math.cos(fallAngle)) * 35 : 0;
    const rx = x + riderOffX; const ry = y + riderOffY;

    if (fallAngle < Math.PI / 3) {
      // Torso (polygon armor — shaped breastplate with waist taper)
      g.moveTo(rx - 12, ry - 38);
      g.quadraticCurveTo(rx - 14, ry - 30, rx - 13, ry - 20);
      g.lineTo(rx - 10, ry - 6);
      g.lineTo(rx + 10, ry - 6);
      g.lineTo(rx + 13, ry - 20);
      g.quadraticCurveTo(rx + 14, ry - 30, rx + 12, ry - 38);
      g.fill(armorColor);
      // Armor highlight strip
      g.moveTo(rx - 7, ry - 36);
      g.quadraticCurveTo(rx - 8, ry - 20, rx - 6, ry - 8);
      g.lineTo(rx - 4, ry - 8);
      g.quadraticCurveTo(rx - 5, ry - 20, rx - 4, ry - 36);
      g.fill({ color: 0xffffff, alpha: 0.08 });
      // Breastplate center ridge
      g.moveTo(rx, ry - 36);
      g.lineTo(rx, ry - 8);
      g.stroke({ color: 0x000000, width: 0.8, alpha: 0.12 } as any);
      // Belt polygon
      g.moveTo(rx - 11, ry - 7);
      g.lineTo(rx + 11, ry - 7);
      g.lineTo(rx + 10, ry - 4);
      g.lineTo(rx - 10, ry - 4);
      g.fill(0x886633);
      // Belt buckle (polygon)
      g.moveTo(rx - 2.5, ry - 7);
      g.lineTo(rx + 2.5, ry - 7);
      g.lineTo(rx + 3, ry - 4);
      g.lineTo(rx - 3, ry - 4);
      g.fill(0xffd700);
      g.circle(rx, ry - 5.5, 1); g.fill(0x0a0a18); // buckle prong
      // Tabard/surcoat (polygon with pointed bottom)
      g.moveTo(rx - 10, ry - 6);
      g.lineTo(rx + 10, ry - 6);
      g.lineTo(rx + 7, ry + 8);
      g.lineTo(rx, ry + 10);
      g.lineTo(rx - 7, ry + 8);
      g.fill({ color: armorColor, alpha: 0.7 });
      this._drawHeraldry(g, rx, ry + 1, 14, 12, heraldry, armorColor, armorColor2);
      // Armor plate segment lines
      g.moveTo(rx - 10, ry - 24); g.lineTo(rx + 10, ry - 24);
      g.stroke({ color: 0x000000, width: 1, alpha: 0.1 } as any);
      g.moveTo(rx - 10, ry - 16); g.lineTo(rx + 10, ry - 16);
      g.stroke({ color: 0x000000, width: 1, alpha: 0.1 } as any);

      // Pauldrons (segmented polygon armor plates)
      for (const side of [-1, 1]) {
        const px2 = rx + side * 15; const py2 = ry - 32;
        // Main pauldron plate
        g.moveTo(px2 - side * 2, py2 - 6);
        g.quadraticCurveTo(px2 + side * 4, py2 - 8, px2 + side * 8, py2 - 4);
        g.quadraticCurveTo(px2 + side * 6, py2 + 4, px2, py2 + 5);
        g.quadraticCurveTo(px2 - side * 4, py2 + 2, px2 - side * 2, py2 - 6);
        g.fill(armorColor);
        // Pauldron ridge
        g.moveTo(px2, py2 - 5);
        g.quadraticCurveTo(px2 + side * 5, py2 - 2, px2 + side * 3, py2 + 3);
        g.stroke({ color: 0xffffff, width: 0.5, alpha: 0.1 } as any);
        // Pauldron rivet
        g.circle(px2 + side * 3, py2, 1); g.fill({ color: 0xffd700, alpha: 0.5 });
      }

      // Arm (polygon upper arm + vambrace)
      const armSway = Math.sin(this._elapsed * 3) * 1;
      const elbowX = rx + dir * 18; const elbowY = ry - 22 + armSway;
      const handX = rx + dir * 22; const handY = ry - 14 + armSway;
      // Upper arm polygon
      g.moveTo(rx + dir * 12, ry - 30);
      g.lineTo(elbowX - dir * 1, elbowY - 3);
      g.lineTo(elbowX + dir * 1, elbowY + 3);
      g.lineTo(rx + dir * 14, ry - 26);
      g.fill(armorColor);
      // Vambrace (forearm armor polygon)
      g.moveTo(elbowX - dir * 1, elbowY);
      g.lineTo(handX - dir * 1, handY - 2);
      g.lineTo(handX + dir * 2, handY + 1);
      g.lineTo(elbowX + dir * 2, elbowY + 2);
      g.fill(armorColor);
      // Gauntlet (hand polygon)
      g.moveTo(handX - 1, handY - 2);
      g.lineTo(handX + dir * 4, handY - 1);
      g.lineTo(handX + dir * 3, handY + 3);
      g.lineTo(handX - 2, handY + 2);
      g.fill(armorColor);
      // Elbow cop (polygon segmented armor plate)
      g.moveTo(elbowX, elbowY - 4);
      g.quadraticCurveTo(elbowX + 4, elbowY - 2, elbowX + 4, elbowY + 1);
      g.quadraticCurveTo(elbowX + 3, elbowY + 4, elbowX, elbowY + 4);
      g.quadraticCurveTo(elbowX - 3, elbowY + 4, elbowX - 4, elbowY + 1);
      g.quadraticCurveTo(elbowX - 4, elbowY - 2, elbowX, elbowY - 4);
      g.fill(armorColor);
      // Cop ridge lines
      g.moveTo(elbowX - 3, elbowY); g.lineTo(elbowX + 3, elbowY);
      g.stroke({ color: 0x000000, width: 0.5, alpha: 0.15 } as any);
      // Center rivet polygon
      g.moveTo(elbowX, elbowY - 1.2);
      g.lineTo(elbowX + 1.2, elbowY);
      g.lineTo(elbowX, elbowY + 1.2);
      g.lineTo(elbowX - 1.2, elbowY);
      g.fill({ color: 0xffd700, alpha: 0.5 });

      // Helm (great helm polygon — faceted shape)
      g.moveTo(rx - 10, ry - 36);
      g.lineTo(rx - 11, ry - 50);
      g.quadraticCurveTo(rx - 10, ry - 58, rx - 4, ry - 59);
      g.lineTo(rx + 4, ry - 59);
      g.quadraticCurveTo(rx + 10, ry - 58, rx + 11, ry - 50);
      g.lineTo(rx + 10, ry - 36);
      g.fill(armorColor);
      // Helm face plate (separate polygon for depth)
      g.moveTo(rx - 9, ry - 50);
      g.lineTo(rx - 8, ry - 36);
      g.lineTo(rx + 8, ry - 36);
      g.lineTo(rx + 9, ry - 50);
      g.quadraticCurveTo(rx + 6, ry - 46, rx, ry - 44);
      g.quadraticCurveTo(rx - 6, ry - 46, rx - 9, ry - 50);
      g.fill({ color: armorColor, alpha: 0.85 });
      // Helm highlight
      g.moveTo(rx - 7, ry - 56);
      g.quadraticCurveTo(rx - 5, ry - 48, rx - 5, ry - 38);
      g.lineTo(rx - 3, ry - 38);
      g.quadraticCurveTo(rx - 3, ry - 48, rx - 5, ry - 56);
      g.fill({ color: 0xffffff, alpha: 0.06 });
      // Visor slit (polygon with slight angle)
      g.moveTo(rx - 9, ry - 48);
      g.lineTo(rx + 9, ry - 48);
      g.lineTo(rx + 8, ry - 45);
      g.lineTo(rx - 8, ry - 45);
      g.fill(0x0a0a0a);
      // Breathing holes (ventail dots)
      for (let bh = 0; bh < 3; bh++) {
        g.circle(rx + dir * 5, ry - 42 + bh * 2.5, 0.8);
        g.fill(0x0a0a0a);
      }
      // Visor nose guard polygon
      g.moveTo(rx - 1, ry - 49);
      g.lineTo(rx + 1, ry - 49);
      g.lineTo(rx + 1.5, ry - 42);
      g.lineTo(rx - 1.5, ry - 42);
      g.fill(armorColor);
      // Helm cross (reinforcement band)
      g.moveTo(rx - 10, ry - 48); g.lineTo(rx + 10, ry - 48);
      g.stroke({ color: 0x000000, width: 1, alpha: 0.15 } as any);
      g.moveTo(rx, ry - 58); g.lineTo(rx, ry - 36);
      g.stroke({ color: 0x000000, width: 1, alpha: 0.1 } as any);

      // Plume (multi-feather polygon)
      const pw1 = Math.sin(this._elapsed * 5) * 3;
      const pw2 = Math.sin(this._elapsed * 7) * 2;
      const pw3 = Math.sin(this._elapsed * 6.5) * 1.5;
      // Base feather (largest)
      g.moveTo(rx - dir * 1, ry - 58);
      g.quadraticCurveTo(rx - dir * 6, ry - 72 + pw1, rx - dir * 18, ry - 68 + pw2);
      g.quadraticCurveTo(rx - dir * 12, ry - 72 + pw1 * 0.8, rx - dir * 4, ry - 66 + pw3);
      g.quadraticCurveTo(rx - dir * 2, ry - 62, rx + dir * 1, ry - 58);
      g.fill(armorColor2);
      // Secondary feather
      g.moveTo(rx, ry - 58);
      g.quadraticCurveTo(rx - dir * 4, ry - 68 + pw2, rx - dir * 14, ry - 64 + pw1);
      g.quadraticCurveTo(rx - dir * 8, ry - 66 + pw3, rx + dir * 1, ry - 58);
      g.fill({ color: armorColor2, alpha: 0.7 });
      // Feather spine
      g.moveTo(rx, ry - 58);
      g.quadraticCurveTo(rx - dir * 5, ry - 66 + pw1, rx - dir * 14, ry - 63 + pw2);
      g.stroke({ color: 0x000000, width: 0.5, alpha: 0.2 } as any);

      // Dynamic specular highlights on armor (animated light sweep)
      const specT = (Math.sin(this._elapsed * 2 + rx * 0.01) + 1) / 2; // 0-1 sweep
      const specY = ry - 40 + specT * 20; // sweep from top to mid torso
      const specAlpha = 0.08 + Math.sin(this._elapsed * 3) * 0.03;
      // Breastplate gleam
      g.moveTo(rx - 8, specY - 3);
      g.quadraticCurveTo(rx, specY - 5, rx + 8, specY - 3);
      g.quadraticCurveTo(rx, specY + 2, rx - 8, specY - 3);
      g.fill({ color: 0xffffff, alpha: specAlpha });
      // Helm gleam
      const helmGleamY = ry - 56 + specT * 8;
      g.moveTo(rx - 5, helmGleamY);
      g.quadraticCurveTo(rx, helmGleamY - 3, rx + 5, helmGleamY);
      g.quadraticCurveTo(rx, helmGleamY + 2, rx - 5, helmGleamY);
      g.fill({ color: 0xffffff, alpha: specAlpha * 0.8 });

      // Shield (kite-shaped polygon with boss)
      const sx = rx - dir * 20; const sy = ry - 30;
      // Kite shield polygon
      g.moveTo(sx, sy - 14);
      g.quadraticCurveTo(sx + 9, sy - 12, sx + 9, sy - 2);
      g.lineTo(sx + 5, sy + 12);
      g.lineTo(sx, sy + 16);
      g.lineTo(sx - 5, sy + 12);
      g.lineTo(sx - 9, sy - 2);
      g.quadraticCurveTo(sx - 9, sy - 12, sx, sy - 14);
      g.fill(armorColor);
      // Shield boss (polygon faceted — octagonal)
      // Outer boss ring (octagon)
      g.moveTo(sx + 4, sy);
      for (let bi = 1; bi <= 8; bi++) {
        const ba = (bi / 8) * Math.PI * 2;
        g.lineTo(sx + Math.cos(ba) * 4, sy + Math.sin(ba) * 4);
      }
      g.fill({ color: 0xffd700, alpha: 0.6 });
      // Inner boss (hexagon)
      g.moveTo(sx + 2.5, sy);
      for (let bi = 1; bi <= 6; bi++) {
        const ba = (bi / 6) * Math.PI * 2;
        g.lineTo(sx + Math.cos(ba) * 2.5, sy + Math.sin(ba) * 2.5);
      }
      g.fill(armorColor);
      // Boss center point (diamond)
      g.moveTo(sx, sy - 1.2); g.lineTo(sx + 1.2, sy); g.lineTo(sx, sy + 1.2); g.lineTo(sx - 1.2, sy);
      g.fill({ color: 0xffd700, alpha: 0.5 });
      // Heraldry on shield
      this._drawHeraldry(g, sx, sy + 2, 14, 22, heraldry, armorColor, armorColor2);
      // Shield rim
      g.moveTo(sx, sy - 14);
      g.quadraticCurveTo(sx + 9, sy - 12, sx + 9, sy - 2);
      g.lineTo(sx + 5, sy + 12);
      g.lineTo(sx, sy + 16);
      g.lineTo(sx - 5, sy + 12);
      g.lineTo(sx - 9, sy - 2);
      g.quadraticCurveTo(sx - 9, sy - 12, sx, sy - 14);
      g.stroke({ color: 0xffd700, width: 1.2 });

      // Lance (tapered polygon shaft instead of stroked line)
      const sway = lanceSway(stamina, this._elapsed);
      const lby = lanceZone === "high" ? ry - 44 : lanceZone === "mid" ? ry - 30 : ry - 14;
      const lty = lanceZone === "high" ? ry - 54 : lanceZone === "mid" ? ry - 34 : ry - 12;
      const lanceLen = 80;
      // Interpolation helper
      const lerpY = (t: number) => lby + sway + (lty - lby + sway * -0.5) * t;
      // Lance shadow polygon
      const shOff = 3;
      g.moveTo(rx + dir * 16, lerpY(0) + shOff - 2);
      g.lineTo(rx + dir * (16 + lanceLen), lerpY(1) + shOff - 0.5);
      g.lineTo(rx + dir * (16 + lanceLen), lerpY(1) + shOff + 0.5);
      g.lineTo(rx + dir * 16, lerpY(0) + shOff + 2);
      g.fill({ color: 0x000000, alpha: 0.08 });
      // Lance shaft polygon (tapered)
      g.moveTo(rx + dir * 16, lerpY(0) - 3);
      g.lineTo(rx + dir * (16 + lanceLen), lerpY(1) - 1);
      g.lineTo(rx + dir * (16 + lanceLen), lerpY(1) + 1);
      g.lineTo(rx + dir * 16, lerpY(0) + 3);
      g.fill(0xccaa66);
      // Lance wood grain lines
      for (let gl = 0; gl < 3; gl++) {
        const t1 = 0.15 + gl * 0.25;
        const t2 = t1 + 0.2;
        const gly1 = lerpY(t1) + (gl - 1) * 0.8;
        const gly2 = lerpY(t2) + (gl - 1) * 0.6;
        g.moveTo(rx + dir * (16 + lanceLen * t1), gly1);
        g.lineTo(rx + dir * (16 + lanceLen * t2), gly2);
        g.stroke({ color: 0xbb9944, width: 0.5 });
      }
      // Lance grip (leather wrapping polygon)
      const gripEnd = 0.22;
      g.moveTo(rx + dir * 16, lerpY(0) - 2.5);
      g.lineTo(rx + dir * (16 + lanceLen * gripEnd), lerpY(gripEnd) - 2);
      g.lineTo(rx + dir * (16 + lanceLen * gripEnd), lerpY(gripEnd) + 2);
      g.lineTo(rx + dir * 16, lerpY(0) + 2.5);
      g.fill(0x775533);
      // Grip cross-hatching
      for (let ch = 0; ch < 4; ch++) {
        const t = 0.04 + ch * 0.05;
        const chx = rx + dir * (16 + lanceLen * t);
        g.moveTo(chx, lerpY(t) - 2);
        g.lineTo(chx + dir * 2, lerpY(t + 0.02) + 2);
        g.stroke({ color: 0x553311, width: 0.8 });
      }
      // Vamplate (hand guard — polygon cone shape)
      const vpT = 0.16;
      const vpx = rx + dir * (16 + lanceLen * vpT);
      const vpy = lerpY(vpT);
      g.moveTo(vpx - dir * 2, vpy - 6);
      g.lineTo(vpx + dir * 4, vpy - 3);
      g.lineTo(vpx + dir * 4, vpy + 3);
      g.lineTo(vpx - dir * 2, vpy + 6);
      g.fill(armorColor);
      g.moveTo(vpx - dir * 2, vpy - 5);
      g.lineTo(vpx + dir * 3, vpy - 2);
      g.stroke({ color: 0xffd700, width: 0.5 });
      // Lance tip (coronel — multi-point polygon)
      const tipX = rx + dir * (16 + lanceLen);
      const tipY = lerpY(1);
      g.moveTo(tipX, tipY - 3);
      g.lineTo(tipX + dir * 6, tipY - 2);
      g.lineTo(tipX + dir * 14, tipY);
      g.lineTo(tipX + dir * 6, tipY + 2);
      g.lineTo(tipX, tipY + 3);
      g.fill(0xbbbbbb);
      // Tip edge highlight
      g.moveTo(tipX + dir * 2, tipY - 2);
      g.lineTo(tipX + dir * 12, tipY);
      g.stroke({ color: 0xeeeeee, width: 0.5 });
      // Tip barb detail
      g.moveTo(tipX + dir * 8, tipY - 2);
      g.lineTo(tipX + dir * 10, tipY - 3.5);
      g.stroke({ color: 0xaaaaaa, width: 0.8 });
      g.moveTo(tipX + dir * 8, tipY + 2);
      g.lineTo(tipX + dir * 10, tipY + 3.5);
      g.stroke({ color: 0xaaaaaa, width: 0.8 });
    } else {
      // Fallen rider (detailed polygon body on ground)
      const gy = y + 42;
      // Body on ground (polygon splayed figure)
      g.moveTo(x - dir * 22, gy - 5);
      g.lineTo(x - dir * 40, gy - 3);
      g.quadraticCurveTo(x - dir * 44, gy + 2, x - dir * 40, gy + 6);
      g.lineTo(x - dir * 22, gy + 8);
      g.quadraticCurveTo(x - dir * 18, gy + 4, x - dir * 22, gy - 5);
      g.fill(armorColor);
      // Legs sprawled
      g.moveTo(x - dir * 22, gy + 2);
      g.lineTo(x - dir * 14, gy + 8);
      g.lineTo(x - dir * 8, gy + 12);
      g.lineTo(x - dir * 10, gy + 6);
      g.fill(armorColor);
      // Head (helm on side — polygon)
      g.moveTo(x - dir * 42, gy - 6);
      g.quadraticCurveTo(x - dir * 50, gy - 8, x - dir * 52, gy - 2);
      g.quadraticCurveTo(x - dir * 50, gy + 4, x - dir * 42, gy + 2);
      g.fill(armorColor);
      // Visor slit
      g.moveTo(x - dir * 46, gy - 4);
      g.lineTo(x - dir * 52, gy - 2);
      g.lineTo(x - dir * 52, gy);
      g.lineTo(x - dir * 46, gy - 2);
      g.fill(0x0a0a0a);
      // Arm outstretched
      g.moveTo(x - dir * 36, gy - 4);
      g.lineTo(x - dir * 28, gy - 12);
      g.lineTo(x - dir * 26, gy - 10);
      g.lineTo(x - dir * 34, gy - 2);
      g.fill(armorColor);
      // Shield fallen nearby (angled kite shape)
      g.moveTo(x - dir * 15, gy + 1);
      g.lineTo(x - dir * 10, gy - 2);
      g.lineTo(x - dir * 6, gy + 2);
      g.lineTo(x - dir * 8, gy + 8);
      g.lineTo(x - dir * 13, gy + 6);
      g.fill(armorColor);
      g.moveTo(x - dir * 15, gy + 1);
      g.lineTo(x - dir * 10, gy - 2);
      g.lineTo(x - dir * 6, gy + 2);
      g.lineTo(x - dir * 8, gy + 8);
      g.lineTo(x - dir * 13, gy + 6);
      g.stroke({ color: 0xffd700, width: 0.8 });
      // Stars (spinning, more detailed)
      for (let i = 0; i < 4; i++) {
        const sa = this._elapsed * 3 + i * (Math.PI * 2 / 4);
        const starX = x - dir * 40 + Math.cos(sa) * 18;
        const starY = gy - 22 + Math.sin(sa) * 6;
        g.star(starX, starY, 5, 4, 2); g.fill(0xffdd44);
        g.star(starX, starY, 5, 2.5, 1); g.fill({ color: 0xffffff, alpha: 0.4 }); // inner bright
      }
    }
  }
}
