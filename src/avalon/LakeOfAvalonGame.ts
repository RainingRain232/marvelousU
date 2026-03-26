// ---------------------------------------------------------------------------
// LAKE OF AVALON — 3D Mystical Lake Combat
// Pilot an enchanted skiff across the legendary lake at night. The water
// glows with ancient magic, fog drifts between ghostly islands, and creatures
// of the deep rise to challenge you. Cast spells, collect runes, survive
// waves of lake horrors, and seek the Lady of the Lake for Excalibur.
// WASD/Arrows to steer, mouse to aim, click to cast. Survive the lake.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { viewManager } from "../view/ViewManager";

// ── Constants ────────────────────────────────────────────────────────────────

const LAKE_RADIUS = 200;
const BOAT_SPEED = 18;
const BOAT_TURN_SPEED = 2.8;
const BOAT_DRAG = 0.94;
const BOAT_BOB_AMP = 0.15;
const BOAT_BOB_FREQ = 1.8;
const BOAT_ROCK_AMP = 0.04;

const SPELL_RADIUS = 0.6;

// Dodge / dash
const DASH_SPEED = 45;
const DASH_DURATION = 0.18;
const DASH_COOLDOWN = 1.2;
const DASH_IFRAMES = 0.25;

// Spell elements
type SpellElement = "arcane" | "fire" | "ice" | "lightning";

interface SpellElementDef {
  color: number;
  trailColor: number;
  damage: number;
  speed: number;
  cooldown: number;
  lifetime: number;
  size: number;
  pierce: boolean;
  homing: number;   // homing strength (0 = none)
  aoe: number;      // splash radius (0 = none)
  dot: number;       // damage-over-time ticks
  dotDuration: number;
  slow: number;      // slow duration applied on hit
  chain: number;     // chain lightning bounces
  knockback: number; // knockback force on hit
}

const SPELL_ELEMENTS: Record<SpellElement, SpellElementDef> = {
  arcane: {
    color: 0x9966ff, trailColor: 0x6633cc,
    damage: 1, speed: 32, cooldown: 0.28, lifetime: 4.0, size: 0.22,
    pierce: false, homing: 6.0, aoe: 0, dot: 0, dotDuration: 0, slow: 0, chain: 0,
    knockback: 2,
  },
  fire: {
    color: 0xff6622, trailColor: 0xff3300,
    damage: 2, speed: 35, cooldown: 0.45, lifetime: 2.5, size: 0.3,
    pierce: false, homing: 0, aoe: 5, dot: 2, dotDuration: 3, slow: 0, chain: 0,
    knockback: 4,
  },
  ice: {
    color: 0x66ccff, trailColor: 0x3388dd,
    damage: 1, speed: 38, cooldown: 0.36, lifetime: 3.5, size: 0.25,
    pierce: true, homing: 0, aoe: 0, dot: 0, dotDuration: 0, slow: 2.5, chain: 0,
    knockback: 1,
  },
  lightning: {
    color: 0xffff44, trailColor: 0xaaaa22,
    damage: 1, speed: 55, cooldown: 0.5, lifetime: 1.5, size: 0.15,
    pierce: false, homing: 0, aoe: 0, dot: 0, dotDuration: 0, slow: 0, chain: 2,
    knockback: 3,
  },
};

// Element synergies
const FROZEN_FIRE_SHATTER_MULT = 3.0; // fire on frozen enemy = shatter for 3x dmg
const FROZEN_LIGHTNING_CHAIN_BONUS = 2; // lightning on frozen = extra chains

// Boss
const BOSS_WAVE_INTERVAL = 5; // boss every 5 waves

// Persistent shop
const SHOP_UPGRADES_AVALON = [
  { id: "extra_hp", name: "Enchanted Hull", desc: "+1 starting HP", cost: 50, maxLevel: 3 },
  { id: "spell_dmg", name: "Runic Focus", desc: "+1 spell damage", cost: 80, maxLevel: 3 },
  { id: "dash_cd", name: "Mistwalker", desc: "-0.2s dash cooldown", cost: 60, maxLevel: 3 },
  { id: "rune_magnet", name: "Lodestone Keel", desc: "+50% rune collect radius", cost: 40, maxLevel: 2 },
  { id: "combo_window", name: "Battle Fury", desc: "+0.5s combo window", cost: 70, maxLevel: 3 },
  { id: "revive", name: "Lake's Blessing", desc: "Revive once per run with 2 HP", cost: 200, maxLevel: 1 },
];

// Gold / loot (boosted economy)
const GOLD_DROP_CHANCE = 0.75;
const GOLD_VALUE_BASE = 6;
const GOLD_COLLECT_RADIUS = 3.0;
const BOSS_KILL_GOLD_BONUS = 100;

// Ability cards (mid-run unlocks from boss kills)
interface AbilityCard {
  id: string;
  name: string;
  desc: string;
  color: number;
}

const ABILITY_POOL: AbilityCard[] = [
  { id: "echo_cast", name: "Echo Cast", desc: "Spells fire a weaker copy 0.2s later", color: 0x9966ff },
  { id: "chain_boost", name: "Arc Amplifier", desc: "Lightning chains +2 targets", color: 0xffff44 },
  { id: "pyroclasm", name: "Pyroclasm", desc: "Fire AoE radius +50%", color: 0xff6622 },
  { id: "permafrost", name: "Permafrost", desc: "Ice slow duration doubled", color: 0x66ccff },
  { id: "homing_boost", name: "Seeking Runes", desc: "Arcane homing strength +100%", color: 0x9966ff },
  { id: "vampiric", name: "Vampiric Strikes", desc: "Heal 1 HP every 15 kills", color: 0x44ff66 },
  { id: "ricochet", name: "Ricochet", desc: "Spells bounce to 1 nearby enemy on hit", color: 0xaaddff },
  { id: "gold_rush", name: "Gold Rush", desc: "Enemies drop 2x gold", color: 0xffcc00 },
  { id: "swift_cast", name: "Swift Cast", desc: "All spell cooldowns -20%", color: 0x88ccee },
  { id: "thorns", name: "Thorns", desc: "Enemies take 1 damage when they hit you", color: 0xff4444 },
  { id: "giant_nova", name: "Giant Nova", desc: "Frost Nova radius +60%", color: 0x66ccff },
  { id: "multishot", name: "Triple Bolt", desc: "Lightning fires 3 bolts in a spread", color: 0xffff44 },
];

// Inter-wave calm
const WAVE_CALM_DURATION = 4.0; // seconds of calm after clearing a wave

// Island sanctuary
const SANCTUARY_RADIUS = 6;
const _SANCTUARY_SLOW = 0.4; void _SANCTUARY_SLOW;
const SANCTUARY_DURATION = 5.0;

const RUNE_BOB_AMP = 0.3;
const RUNE_BOB_FREQ = 2.0;
const RUNE_SPIN_SPEED = 2.5;
const RUNE_COLLECT_RADIUS = 2.5;
const RUNE_SPAWN_INTERVAL = 4.0;
const MAX_RUNES = 12;

const WAVE_INTERVAL_BASE = 20;
const WAVE_INTERVAL_MIN = 10;
const ENEMY_SPAWN_RADIUS_MIN = 25;
const ENEMY_SPAWN_RADIUS_MAX = 50;

const ISLAND_COUNT = 8;
const ISLAND_MIN_DIST = 30;

const CAMERA_HEIGHT = 18;
const CAMERA_DIST = 22;
const CAMERA_LERP = 3.0;

// Whirlpools
const WHIRLPOOL_COUNT = 3;
const WHIRLPOOL_PULL_RADIUS = 18;
const WHIRLPOOL_DAMAGE_RADIUS = 4;
const WHIRLPOOL_PULL_FORCE = 8;
const WHIRLPOOL_DAMAGE = 1;
const WHIRLPOOL_DAMAGE_CD = 2.0;

// Frost nova (secondary spell)
const FROST_NOVA_COOLDOWN = 6.0;
const FROST_NOVA_RADIUS = 12;
const FROST_NOVA_DAMAGE = 3;
const FROST_NOVA_SLOW_DURATION = 3.0;

// Combo
const COMBO_WINDOW = 2.0; // seconds to chain kills
const COMBO_MAX_MULT = 5;

// Lightning storm
const STORM_INTERVAL_MIN = 40;
const STORM_INTERVAL_MAX = 70;
const STORM_DURATION = 8;
const STORM_STRIKE_INTERVAL = 0.6;
const STORM_STRIKE_RADIUS = 5;
const STORM_STRIKE_DAMAGE = 4;

// Damage numbers
const DMGNUM_RISE_SPEED = 3;
const DMGNUM_LIFETIME = 0.8;

// ── Enemy definitions ────────────────────────────────────────────────────────

type EnemyKind = "drowned_knight" | "water_serpent" | "wisp" | "kraken_arm" | "bog_wraith" | "sea_witch" | "leviathan" | "phantom_ship";

interface EnemyDef {
  hp: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  size: number;
  color: number;
  emissive: number;
  score: number;
  submerged: boolean;
}

const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  drowned_knight: {
    hp: 3, speed: 3.5, damage: 1, attackRange: 2.5, attackCooldown: 1.5,
    size: 1.2, color: 0x334455, emissive: 0x112233, score: 10, submerged: false,
  },
  water_serpent: {
    hp: 5, speed: 5.0, damage: 2, attackRange: 3.0, attackCooldown: 2.0,
    size: 1.5, color: 0x225544, emissive: 0x114433, score: 25, submerged: true,
  },
  wisp: {
    hp: 1, speed: 7.0, damage: 1, attackRange: 1.5, attackCooldown: 1.0,
    size: 0.5, color: 0x88ccff, emissive: 0x4488ff, score: 5, submerged: false,
  },
  kraken_arm: {
    hp: 8, speed: 2.0, damage: 3, attackRange: 4.0, attackCooldown: 2.5,
    size: 2.0, color: 0x443355, emissive: 0x221144, score: 40, submerged: true,
  },
  bog_wraith: {
    hp: 4, speed: 4.0, damage: 2, attackRange: 3.0, attackCooldown: 1.8,
    size: 1.4, color: 0x556633, emissive: 0x334411, score: 20, submerged: false,
  },
  sea_witch: {
    hp: 6, speed: 3.0, damage: 2, attackRange: 15.0, attackCooldown: 3.0,
    size: 1.3, color: 0x884488, emissive: 0x663366, score: 35, submerged: false,
  },
  leviathan: {
    hp: 12, speed: 6.0, damage: 3, attackRange: 5.0, attackCooldown: 2.0,
    size: 2.5, color: 0x224466, emissive: 0x113355, score: 60, submerged: true,
  },
  phantom_ship: {
    hp: 15, speed: 2.5, damage: 1, attackRange: 12.0, attackCooldown: 2.5,
    size: 3.0, color: 0x445566, emissive: 0x223344, score: 50, submerged: false,
  },
};

const WAVE_COMPOSITIONS: { minWave: number; enemies: { kind: EnemyKind; count: number }[] }[] = [
  { minWave: 1, enemies: [{ kind: "wisp", count: 4 }] },
  { minWave: 1, enemies: [{ kind: "drowned_knight", count: 2 }] },
  { minWave: 2, enemies: [{ kind: "drowned_knight", count: 3 }, { kind: "wisp", count: 2 }] },
  { minWave: 3, enemies: [{ kind: "water_serpent", count: 2 }] },
  { minWave: 3, enemies: [{ kind: "bog_wraith", count: 3 }, { kind: "wisp", count: 3 }] },
  { minWave: 4, enemies: [{ kind: "water_serpent", count: 2 }, { kind: "drowned_knight", count: 3 }] },
  { minWave: 5, enemies: [{ kind: "kraken_arm", count: 1 }, { kind: "wisp", count: 5 }] },
  { minWave: 6, enemies: [{ kind: "kraken_arm", count: 2 }, { kind: "water_serpent", count: 2 }] },
  { minWave: 7, enemies: [{ kind: "bog_wraith", count: 4 }, { kind: "drowned_knight", count: 4 }] },
  { minWave: 8, enemies: [{ kind: "kraken_arm", count: 3 }, { kind: "water_serpent", count: 3 }, { kind: "wisp", count: 5 }] },
  { minWave: 10, enemies: [{ kind: "sea_witch", count: 2 }, { kind: "drowned_knight", count: 4 }] },
  { minWave: 10, enemies: [{ kind: "sea_witch", count: 1 }, { kind: "bog_wraith", count: 3 }, { kind: "wisp", count: 6 }] },
  { minWave: 12, enemies: [{ kind: "leviathan", count: 1 }, { kind: "water_serpent", count: 3 }] },
  { minWave: 12, enemies: [{ kind: "phantom_ship", count: 1 }, { kind: "drowned_knight", count: 5 }, { kind: "wisp", count: 4 }] },
  { minWave: 15, enemies: [{ kind: "sea_witch", count: 3 }, { kind: "leviathan", count: 2 }] },
  { minWave: 15, enemies: [{ kind: "phantom_ship", count: 2 }, { kind: "kraken_arm", count: 2 }, { kind: "bog_wraith", count: 3 }] },
  { minWave: 18, enemies: [{ kind: "leviathan", count: 3 }, { kind: "sea_witch", count: 2 }, { kind: "water_serpent", count: 4 }] },
  { minWave: 20, enemies: [{ kind: "phantom_ship", count: 2 }, { kind: "leviathan", count: 2 }, { kind: "sea_witch", count: 2 }, { kind: "kraken_arm", count: 3 }] },
];

// ── Rune types ───────────────────────────────────────────────────────────────

type RuneKind = "heal" | "shield" | "speed" | "power" | "excalibur_shard";

interface RuneDef {
  color: number;
  emissive: number;
  effect: string;
  duration: number;
  rarity: number; // weight for spawn
}

const RUNE_DEFS: Record<RuneKind, RuneDef> = {
  heal:            { color: 0x44ff66, emissive: 0x22aa33, effect: "+1 HP", duration: 0, rarity: 30 },
  shield:          { color: 0x4488ff, emissive: 0x2244aa, effect: "Shield 8s", duration: 8, rarity: 20 },
  speed:           { color: 0xffcc22, emissive: 0xaa8811, effect: "Speed 6s", duration: 6, rarity: 20 },
  power:           { color: 0xff4444, emissive: 0xaa2222, effect: "2x Damage 8s", duration: 8, rarity: 15 },
  excalibur_shard: { color: 0xffffff, emissive: 0xaaaaff, effect: "Excalibur shard!", duration: 0, rarity: 5 },
};

const RUNE_KINDS = Object.keys(RUNE_DEFS) as RuneKind[];
const RUNE_TOTAL_WEIGHT = RUNE_KINDS.reduce((s, k) => s + RUNE_DEFS[k].rarity, 0);

function _pickRuneKind(): RuneKind {
  let r = Math.random() * RUNE_TOTAL_WEIGHT;
  for (const k of RUNE_KINDS) {
    r -= RUNE_DEFS[k].rarity;
    if (r <= 0) return k;
  }
  return "heal";
}

// ── Interfaces ───────────────────────────────────────────────────────────────

interface BoatState {
  x: number;
  z: number;
  vx: number;
  vz: number;
  angle: number;
  hp: number;
  maxHp: number;
  shieldTimer: number;
  speedTimer: number;
  powerTimer: number;
  spellCooldown: number;
  frostNovaCooldown: number;
  excaliburShards: number;
  invulnTimer: number;
  dashCooldown: number;
  dashTimer: number;
  dashDx: number;
  dashDz: number;
  reviveAvailable: boolean;
}

interface EnemyState {
  kind: EnemyKind;
  x: number;
  z: number;
  y: number;
  hp: number;
  maxHp: number;
  attackTimer: number;
  dead: boolean;
  deathTimer: number;
  mesh: THREE.Group;
  hpBarBg: THREE.Mesh | null;
  hpBarFill: THREE.Mesh | null;
  hitFlash: number;
  angle: number;
  emergeTimer: number;
  slowTimer: number;
  dotTimer: number;
  dotTickTimer: number;
  // Special ability state
  specialTimer: number;
  specialActive: boolean;
  circleAngle: number;    // serpent orbiting
  blockTimer: number;     // knight blocking
  teleportCd: number;     // wraith teleport
  isBoss: boolean;
  bossPhase: number;
}

interface SpellProjectile {
  x: number;
  z: number;
  dx: number;
  dz: number;
  life: number;
  mesh: THREE.Mesh;
  power: boolean;
  element: SpellElement;
  hitEnemies: Set<number>; // for pierce tracking
}

interface RunePickup {
  kind: RuneKind;
  x: number;
  z: number;
  mesh: THREE.Group;
  collected: boolean;
  age: number;
}

interface IslandData {
  x: number;
  z: number;
  radius: number;
  mesh: THREE.Group;
}

interface Particle {
  mesh: THREE.Mesh;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number;
  maxLife: number;
}

interface WhirlpoolData {
  x: number;
  z: number;
  mesh: THREE.Group;
  phase: number;
  damageCd: number;
}

interface DamageNumber {
  sprite: THREE.Sprite;
  x: number; y: number; z: number;
  life: number;
  text: string;
}

interface LightningStrike {
  x: number;
  z: number;
  mesh: THREE.Group;
  life: number;
}

interface GoldCoin {
  x: number;
  z: number;
  mesh: THREE.Mesh;
  value: number;
  age: number;
}

// ── Main Game Class ──────────────────────────────────────────────────────────

export class LakeOfAvalonGame {
  // Three.js
  private _scene: THREE.Scene | null = null;
  private _camera: THREE.PerspectiveCamera | null = null;
  private _renderer: THREE.WebGLRenderer | null = null;
  private _composer: EffectComposer | null = null;
  private _bloomPass: UnrealBloomPass | null = null;
  private _tickerCb: ((ticker: { deltaMS: number }) => void) | null = null;

  // Hit-stop
  private _hitStopTimer = 0;

  // Lighting
  private _moonLight: THREE.DirectionalLight | null = null;
  private _ambientLight: THREE.AmbientLight | null = null;
  private _pointLights: THREE.PointLight[] = [];

  // Water
  private _waterMesh: THREE.Mesh | null = null;
  private _waterTime = 0;

  // Boat
  private _boatGroup: THREE.Group | null = null;
  private _boatState: BoatState = {
    x: 0, z: 0, vx: 0, vz: 0, angle: 0,
    hp: 5, maxHp: 5, shieldTimer: 0, speedTimer: 0, powerTimer: 0,
    spellCooldown: 0, frostNovaCooldown: 0, excaliburShards: 0, invulnTimer: 0,
    dashCooldown: 0, dashTimer: 0, dashDx: 0, dashDz: 0, reviveAvailable: false,
  };

  // Game objects
  private _enemies: EnemyState[] = [];
  private _spells: SpellProjectile[] = [];
  private _runes: RunePickup[] = [];
  private _islands: IslandData[] = [];
  private _particles: Particle[] = [];
  private _whirlpools: WhirlpoolData[] = [];
  private _damageNumbers: DamageNumber[] = [];
  private _lightningStrikes: LightningStrike[] = [];
  private _goldCoins: GoldCoin[] = [];

  // Spell element
  private _currentElement: SpellElement = "arcane";

  // Gold (persistent currency)
  private _gold = 0;
  private _runGold = 0; // gold earned this run

  // Shop state
  private _shopActive = false;
  private _shopEl: HTMLDivElement | null = null;

  // Boss
  private _bossActive = false;
  private _bossEnemy: EnemyState | null = null;

  // Enemy ID counter for pierce tracking
  private _enemyIdCounter = 0;

  // Mid-run abilities
  private _unlockedAbilities: Set<string> = new Set();
  private _abilityCardEl: HTMLDivElement | null = null;
  private _abilityPickActive = false;
  private _vampiricKillCount = 0;

  // Inter-wave calm
  private _waveCalmTimer = 0;
  private _inWaveCalm = false;

  // Sanctuary
  private _sanctuaryTimer = 0;
  private _inSanctuary = false;

  // Endgame era
  private _currentEra: "dawn" | "dominion" | "abyss" | "ascension" = "dawn";

  // Wave system
  private _wave = 0;
  private _waveTimer = 5; // first wave after 5s
  private _enemiesAlive = 0;
  private _score = 0;
  private _highScore = 0;
  private _gameTime = 0;
  private _totalKills = 0;
  private _totalDamageDealt = 0;
  private _runesCollected = 0;
  private _peakCombo = 0;

  // Combo
  private _comboCount = 0;
  private _comboTimer = 0;
  private _comboMult = 1;

  // Lightning storm
  private _stormTimer = STORM_INTERVAL_MIN + Math.random() * (STORM_INTERVAL_MAX - STORM_INTERVAL_MIN);
  private _stormActive = false;
  private _stormDuration = 0;
  private _stormStrikeTimer = 0;

  // Screen shake
  private _shakeIntensity = 0;
  private _shakeDecay = 8;

  // Shield visual
  private _shieldMesh: THREE.Mesh | null = null;

  // Fog islands (ghostly floating islands that appear/disappear)
  private _fogIslandGroup: THREE.Group | null = null;
  private _fogIslandPhase = 0;

  // Minimap
  private _minimapCanvas: HTMLCanvasElement | null = null;
  private _minimapCtx: CanvasRenderingContext2D | null = null;

  // Cooldown rings
  private _cdRingCanvas: HTMLCanvasElement | null = null;
  private _cdRingCtx: CanvasRenderingContext2D | null = null;

  // Wave narrative
  private _narrativeShown: Set<number> = new Set();

  // HUD dirty tracking
  private _lastHudHash = "";

  // Input
  private _keys: Record<string, boolean> = {};
  private _mouseX = 0;
  private _mouseY = 0;
  private _mouseDown = false;
  private _aimAngle = 0;

  // UI overlay
  private _uiContainer: HTMLDivElement | null = null;
  private _hudEl: HTMLDivElement | null = null;
  private _msgEl: HTMLDivElement | null = null;
  private _crosshairEl: HTMLDivElement | null = null;
  private _msgTimer = 0;

  // State
  private _gameOver = false;
  private _paused = false;
  private _titleActive = true;
  private _titleEl: HTMLDivElement | null = null;

  // Element visual refs
  private _staffOrb: THREE.Mesh | null = null;
  private _staffOrbLight: THREE.PointLight | null = null;
  private _elementAura: THREE.Mesh | null = null;

  // Lady of the Lake event
  private _ladyActive = false;
  private _ladyMesh: THREE.Group | null = null;
  private _ladyTimer = 0;
  private _excaliburGranted = false;

  // Bound handlers
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _onKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private _onMouseMove: ((e: MouseEvent) => void) | null = null;
  private _onMouseDown: ((e: MouseEvent) => void) | null = null;
  private _onMouseUp: ((e: MouseEvent) => void) | null = null;
  private _onResize: (() => void) | null = null;

  // Audio
  private _audioCtx: AudioContext | null = null;

  // ── Boot ─────────────────────────────────────────────────────────────────

  async boot(): Promise<void> {
    viewManager.clearWorld();

    // Load persistent data
    try { this._highScore = parseInt(localStorage.getItem("avalon_hi") || "0", 10) || 0; } catch { /* */ }
    try { this._gold = parseInt(localStorage.getItem("avalon_gold") || "0", 10) || 0; } catch { /* */ }
    this._applyShopUpgrades();

    this._setupRenderer();
    this._setupScene();
    // Bloom setup (must be after scene + camera exist)
    if (this._renderer && this._scene && this._camera) {
      this._composer = new EffectComposer(this._renderer);
      this._composer.addPass(new RenderPass(this._scene, this._camera));
      this._bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.8, 0.5, 0.7,
      );
      this._composer.addPass(this._bloomPass);
    }
    this._buildWater();
    this._buildBoat();
    this._buildIslands();
    this._buildFogIslands();
    this._buildWhirlpools();
    this._buildShieldBubble();
    this._buildGlowPillars();
    this._buildBoatSail();
    this._buildVignette();
    this._initWakeMesh();
    this._setupInput();
    this._buildUI();
    this._buildMinimap();
    this._buildCooldownRings();
    this._startAmbientMusic();
    this._showTitleScreen();

    // Register ticker
    this._tickerCb = (ticker) => this._loop(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb as any);
  }

  // ── Destroy ──────────────────────────────────────────────────────────────

  destroy(): void {
    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb as any);
      this._tickerCb = null;
    }
    // Remove input
    if (this._onKeyDown) window.removeEventListener("keydown", this._onKeyDown);
    if (this._onKeyUp) window.removeEventListener("keyup", this._onKeyUp);
    if (this._onMouseMove) window.removeEventListener("mousemove", this._onMouseMove);
    if (this._onMouseDown) window.removeEventListener("mousedown", this._onMouseDown);
    if (this._onMouseUp) window.removeEventListener("mouseup", this._onMouseUp);
    if (this._onResize) window.removeEventListener("resize", this._onResize);

    // Stop music
    this._stopAmbientMusic();
    // Remove title screen and vignette if present
    if (this._titleEl && this._titleEl.parentNode) {
      this._titleEl.parentNode.removeChild(this._titleEl);
    }
    if (this._vignetteEl && this._vignetteEl.parentNode) {
      this._vignetteEl.parentNode.removeChild(this._vignetteEl);
    }

    // Remove UI
    if (this._uiContainer && this._uiContainer.parentNode) {
      this._uiContainer.parentNode.removeChild(this._uiContainer);
    }

    // Dispose composer and Three.js
    if (this._composer) {
      this._composer.dispose();
      this._composer = null;
    }
    if (this._renderer) {
      this._renderer.dispose();
      if (this._renderer.domElement.parentNode) {
        this._renderer.domElement.parentNode.removeChild(this._renderer.domElement);
      }
    }
    if (this._scene) {
      this._scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material?.dispose();
        }
      });
    }

    this._scene = null;
    this._camera = null;
    this._renderer = null;
    viewManager.clearWorld();
  }

  private _exit(): void {
    window.dispatchEvent(new Event("lakeOfAvalonExit"));
  }

  // ── Renderer setup ───────────────────────────────────────────────────────

  private _setupRenderer(): void {
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 0.8;
    document.body.appendChild(this._renderer.domElement);
    this._renderer.domElement.style.position = "fixed";
    this._renderer.domElement.style.top = "0";
    this._renderer.domElement.style.left = "0";
    this._renderer.domElement.style.zIndex = "10";

    this._camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 300);
    this._camera.position.set(0, CAMERA_HEIGHT, CAMERA_DIST);
    this._camera.lookAt(0, 0, 0);

    // Bloom is set up in boot() after _setupScene() creates the scene

    this._onResize = () => {
      if (!this._camera || !this._renderer || !this._composer) return;
      this._camera.aspect = window.innerWidth / window.innerHeight;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(window.innerWidth, window.innerHeight);
      this._composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", this._onResize);
  }

  // ── Scene setup ──────────────────────────────────────────────────────────

  private _setupScene(): void {
    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(0x050a15, 0.012);
    this._scene.background = new THREE.Color(0x050a15);

    // Moon light
    this._moonLight = new THREE.DirectionalLight(0x6688cc, 0.6);
    this._moonLight.position.set(-30, 60, -20);
    this._moonLight.castShadow = true;
    this._moonLight.shadow.mapSize.set(1024, 1024);
    this._moonLight.shadow.camera.near = 1;
    this._moonLight.shadow.camera.far = 150;
    this._moonLight.shadow.camera.left = -50;
    this._moonLight.shadow.camera.right = 50;
    this._moonLight.shadow.camera.top = 50;
    this._moonLight.shadow.camera.bottom = -50;
    this._scene.add(this._moonLight);

    // Ambient
    this._ambientLight = new THREE.AmbientLight(0x112244, 0.4);
    this._scene.add(this._ambientLight);

    // Moon orb with halo glow
    const moonGeo = new THREE.SphereGeometry(3, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xddeeff });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(-30, 60, -60);
    this._scene.add(moon);
    // Moon halo
    const haloGeo = new THREE.SphereGeometry(6, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x6688cc, transparent: true, opacity: 0.08, depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(moon.position);
    this._scene.add(halo);
    // Outer glow ring
    const halo2Geo = new THREE.SphereGeometry(12, 12, 12);
    const halo2Mat = new THREE.MeshBasicMaterial({
      color: 0x4466aa, transparent: true, opacity: 0.03, depthWrite: false,
    });
    const halo2 = new THREE.Mesh(halo2Geo, halo2Mat);
    halo2.position.copy(moon.position);
    this._scene.add(halo2);

    // Moon reflection on water (light column)
    const moonReflGeo = new THREE.PlaneGeometry(4, 80);
    const moonReflMat = new THREE.MeshBasicMaterial({
      color: 0x4466aa, transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false,
    });
    const moonRefl = new THREE.Mesh(moonReflGeo, moonReflMat);
    moonRefl.rotation.x = -Math.PI / 2;
    moonRefl.position.set(-15, 0.15, -30);
    moonRefl.rotation.z = 0.5;
    this._scene.add(moonRefl);

    // Distant mountain silhouette (ring of jagged peaks on horizon)
    this._buildMountainSilhouette();

    // Stars with color and size variation
    const starGeo = new THREE.BufferGeometry();
    const starPos: number[] = [];
    const starColors: number[] = [];
    const starSizes: number[] = [];
    for (let i = 0; i < 1200; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45;
      const r = 180 + Math.random() * 40;
      starPos.push(
        Math.cos(theta) * Math.sin(phi) * r,
        Math.cos(phi) * r,
        Math.sin(theta) * Math.sin(phi) * r,
      );
      // Star color variation (white, blue-white, pale yellow)
      const colorChoice = Math.random();
      if (colorChoice < 0.6) starColors.push(1, 1, 1);
      else if (colorChoice < 0.8) starColors.push(0.7, 0.8, 1.0);
      else starColors.push(1.0, 0.95, 0.8);
      starSizes.push(0.3 + Math.random() * 0.5);
    }
    // Per-star twinkle phases
    const starPhases: number[] = [];
    for (let i = 0; i < 1200; i++) starPhases.push(Math.random() * Math.PI * 2);
    this._starPhases = starPhases;
    this._starSizeAttr = starSizes;

    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
    starGeo.setAttribute("color", new THREE.Float32BufferAttribute(starColors, 3));
    starGeo.setAttribute("aSize", new THREE.Float32BufferAttribute(starSizes, 1));
    // ShaderMaterial for per-vertex sizes (PointsMaterial ignores vertex size attributes)
    const starMat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float aSize;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (200.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d);
          gl_FragColor = vec4(vColor, alpha * 0.9);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
    });
    this._starPoints = new THREE.Points(starGeo, starMat);
    this._scene.add(this._starPoints);

    // Aurora borealis — animated vertical planes
    this._buildAurora();
  }

  private _starPoints: THREE.Points | null = null;
  private _starPhases: number[] = [];
  private _starSizeAttr: number[] = [];

  private _auroraGroup: THREE.Group | null = null;

  private _buildAurora(): void {
    if (!this._scene) return;
    this._auroraGroup = new THREE.Group();
    const colors = [0x22ff88, 0x4488ff, 0x8844ff, 0x22ffcc];
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.PlaneGeometry(80, 15, 1, 1);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const a = (i / 4) * Math.PI * 2 + 0.3;
      mesh.position.set(Math.cos(a) * 120, 50 + i * 3, Math.sin(a) * 120);
      mesh.rotation.y = a + Math.PI / 2;
      mesh.rotation.x = 0.1 * (i % 2 === 0 ? 1 : -1);
      this._auroraGroup.add(mesh);
    }
    this._scene.add(this._auroraGroup);
  }

  // ── Water ────────────────────────────────────────────────────────────────

  private _buildWater(): void {
    if (!this._scene) return;

    // Custom shader for bioluminescent water
    const waterGeo = new THREE.CircleGeometry(LAKE_RADIUS, 128);
    waterGeo.rotateX(-Math.PI / 2);

    const waterMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0x051520) },
        uColor2: { value: new THREE.Color(0x0a3040) },
        uGlow: { value: new THREE.Color(0x22aacc) },
        uFogColor: { value: new THREE.Color(0x050a15) },
        uFogDensity: { value: 0.012 },
        uMoonDir: { value: new THREE.Vector3(-0.4, 0.8, -0.3).normalize() },
        uMoonColor: { value: new THREE.Color(0x6688cc) },
        uCameraPos: { value: new THREE.Vector3() },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        uniform float uTime;
        void main() {
          vUv = uv;
          vec3 pos = position;
          // Multi-octave wave displacement
          float wave1 = sin(pos.x * 0.3 + uTime * 0.8) * 0.22;
          float wave2 = sin(pos.z * 0.25 + uTime * 0.6 + 1.5) * 0.18;
          float wave3 = sin((pos.x + pos.z) * 0.15 + uTime * 1.2) * 0.12;
          float wave4 = sin(pos.x * 0.8 + pos.z * 0.6 + uTime * 2.0) * 0.05;
          pos.y += wave1 + wave2 + wave3 + wave4;

          // Compute normal from wave derivatives
          float eps = 0.5;
          float hL = sin((pos.x - eps) * 0.3 + uTime * 0.8) * 0.22
                   + sin(pos.z * 0.25 + uTime * 0.6 + 1.5) * 0.18;
          float hR = sin((pos.x + eps) * 0.3 + uTime * 0.8) * 0.22
                   + sin(pos.z * 0.25 + uTime * 0.6 + 1.5) * 0.18;
          float hD = sin(pos.x * 0.3 + uTime * 0.8) * 0.22
                   + sin((pos.z - eps) * 0.25 + uTime * 0.6 + 1.5) * 0.18;
          float hU = sin(pos.x * 0.3 + uTime * 0.8) * 0.22
                   + sin((pos.z + eps) * 0.25 + uTime * 0.6 + 1.5) * 0.18;
          vNormal = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));

          vWorldPos = pos;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uGlow;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform vec3 uMoonDir;
        uniform vec3 uMoonColor;
        uniform vec3 uCameraPos;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          float dist = length(vWorldPos.xz);
          float blend = smoothstep(0.0, 120.0, dist);
          vec3 base = mix(uColor2, uColor1, blend);

          // ── Specular highlight from moonlight ──
          vec3 viewDir = normalize(uCameraPos - vWorldPos);
          vec3 halfDir = normalize(uMoonDir + viewDir);
          float spec = pow(max(dot(vNormal, halfDir), 0.0), 64.0);
          vec3 specColor = uMoonColor * spec * 0.4;

          // ── Fresnel effect (edge glow) ──
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
          vec3 fresnelColor = uGlow * fresnel * 0.2;

          // ── Bioluminescent glow spots ──
          float glow = 0.0;
          for (int i = 0; i < 7; i++) {
            float fi = float(i);
            vec2 center = vec2(
              sin(uTime * 0.3 + fi * 2.1) * 45.0 + cos(uTime * 0.15 + fi) * 15.0,
              cos(uTime * 0.25 + fi * 1.7) * 45.0 + sin(uTime * 0.2 + fi * 0.8) * 15.0
            );
            float d = length(vWorldPos.xz - center);
            glow += smoothstep(18.0, 0.0, d) * 0.12;
          }

          // ── Caustic pattern (animated Voronoi-like) ──
          vec2 causticUv = vWorldPos.xz * 0.08 + uTime * 0.15;
          float caustic = 0.0;
          for (int i = 0; i < 3; i++) {
            float fi = float(i);
            vec2 p = causticUv * (1.0 + fi * 0.5);
            float c = sin(p.x * 6.28 + uTime * (0.8 + fi * 0.3)) * sin(p.y * 6.28 + uTime * (0.6 + fi * 0.2));
            caustic += c * c;
          }
          caustic = caustic / 3.0 * smoothstep(60.0, 5.0, dist) * 0.08;

          // ── Foam on wave peaks ──
          float waveHeight = vWorldPos.y;
          float foam = smoothstep(0.25, 0.4, waveHeight) * smoothstep(50.0, 5.0, dist) * 0.15;
          vec3 foamColor = vec3(0.6, 0.7, 0.8) * foam;

          // ── Ripple pattern ──
          float ripple = sin(dist * 0.8 - uTime * 2.0) * 0.5 + 0.5;
          ripple *= smoothstep(80.0, 10.0, dist) * 0.08;

          // ── Combine ──
          vec3 col = base + uGlow * (glow + ripple + caustic) + specColor + fresnelColor + foamColor;

          // ── Fog ──
          float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
          col = mix(col, uFogColor, fogFactor);

          gl_FragColor = vec4(col, 0.93);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });

    this._waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this._waterMesh.receiveShadow = true;
    this._scene.add(this._waterMesh);
  }

  // ── Boat ─────────────────────────────────────────────────────────────────

  private _buildBoat(): void {
    if (!this._scene) return;
    this._boatGroup = new THREE.Group();

    // Hull — elongated shape
    const hullGeo = new THREE.BoxGeometry(1.6, 0.5, 3.5);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x553311, roughness: 0.8, metalness: 0.1,
    });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 0.25;
    hull.castShadow = true;
    this._boatGroup.add(hull);

    // Bow (front taper)
    const bowGeo = new THREE.ConeGeometry(0.8, 1.2, 4);
    bowGeo.rotateX(-Math.PI / 2);
    const bow = new THREE.Mesh(bowGeo, hullMat);
    bow.position.set(0, 0.25, -2.1);
    bow.castShadow = true;
    this._boatGroup.add(bow);

    // Stern railing
    const railGeo = new THREE.BoxGeometry(1.4, 0.6, 0.1);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(0, 0.7, 1.6);
    this._boatGroup.add(rail);

    // Magical lantern at bow
    const lanternGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0x44ddff });
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(0, 0.8, -2.0);
    this._boatGroup.add(lantern);

    // Lantern light
    const lanternLight = new THREE.PointLight(0x44ddff, 2.0, 15);
    lanternLight.position.set(0, 1.2, -2.0);
    this._boatGroup.add(lanternLight);
    this._pointLights.push(lanternLight);

    // Player figure (simple standing figure)
    const bodyGeo = new THREE.CylinderGeometry(0.25, 0.3, 1.2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 1.3, 0);
    body.castShadow = true;
    this._boatGroup.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xddbb99, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 2.1, 0);
    head.castShadow = true;
    this._boatGroup.add(head);

    // Staff (spell casting)
    const staffGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.0, 6);
    const staffMat = new THREE.MeshStandardMaterial({ color: 0x886644 });
    const staff = new THREE.Mesh(staffGeo, staffMat);
    staff.position.set(0.35, 1.6, -0.2);
    staff.rotation.x = -0.3;
    this._boatGroup.add(staff);

    // Staff orb (element-reactive)
    const orbGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0x9966ff });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(0.35, 2.5, -0.55);
    this._boatGroup.add(orb);
    this._staffOrb = orb;

    const orbLight = new THREE.PointLight(0x9966ff, 1.5, 10);
    orbLight.position.copy(orb.position);
    this._staffOrbLight = orbLight;

    // Element aura around player
    const auraGeo = new THREE.RingGeometry(0.8, 1.2, 16);
    auraGeo.rotateX(-Math.PI / 2);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x9966ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false,
    });
    this._elementAura = new THREE.Mesh(auraGeo, auraMat);
    this._elementAura.position.y = 0.6;
    this._boatGroup.add(this._elementAura);
    this._boatGroup.add(orbLight);
    this._pointLights.push(orbLight);

    this._boatGroup.position.set(0, 0, 0);
    this._scene.add(this._boatGroup);
  }

  // ── Islands ──────────────────────────────────────────────────────────────

  private _buildIslands(): void {
    if (!this._scene) return;

    for (let i = 0; i < ISLAND_COUNT; i++) {
      let x: number, z: number, ok: boolean;
      // Place islands avoiding center and each other
      do {
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * (LAKE_RADIUS - 60);
        x = Math.cos(angle) * dist;
        z = Math.sin(angle) * dist;
        ok = true;
        for (const isl of this._islands) {
          if (Math.hypot(isl.x - x, isl.z - z) < ISLAND_MIN_DIST) { ok = false; break; }
        }
      } while (!ok);

      const radius = 4 + Math.random() * 6;
      const group = new THREE.Group();

      // Rock base
      const rockGeo = new THREE.DodecahedronGeometry(radius, 1);
      // Randomize vertices for organic look
      const posAttr = rockGeo.getAttribute("position");
      for (let j = 0; j < posAttr.count; j++) {
        const py = posAttr.getY(j);
        if (py < 0) {
          posAttr.setY(j, py * 1.5); // stretch downward
        } else {
          posAttr.setX(j, posAttr.getX(j) + (Math.random() - 0.5) * 1.5);
          posAttr.setY(j, py * 0.4 + Math.random() * 0.5);
          posAttr.setZ(j, posAttr.getZ(j) + (Math.random() - 0.5) * 1.5);
        }
      }
      rockGeo.computeVertexNormals();
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x334433, roughness: 0.95, metalness: 0.05,
      });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.castShadow = true;
      rock.receiveShadow = true;
      group.add(rock);

      // Ancient ruins on some islands
      if (Math.random() < 0.5) {
        this._addRuins(group, radius);
      }

      // Glowing mushrooms
      if (Math.random() < 0.6) {
        this._addMushrooms(group, radius);
      }

      // Ghostly tree
      if (Math.random() < 0.4) {
        this._addGhostTree(group, radius);
      }

      group.position.set(x, -1, z);
      this._scene.add(group);
      this._islands.push({ x, z, radius, mesh: group });
    }
  }

  private _addRuins(parent: THREE.Group, islandRadius: number): void {
    const ruinMat = new THREE.MeshStandardMaterial({
      color: 0x556666, roughness: 0.9, metalness: 0.1,
    });
    // Broken columns
    for (let i = 0; i < 3; i++) {
      const height = 2 + Math.random() * 3;
      const colGeo = new THREE.CylinderGeometry(0.3, 0.4, height, 6);
      const col = new THREE.Mesh(colGeo, ruinMat);
      const a = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
      const r = islandRadius * 0.4;
      col.position.set(Math.cos(a) * r, height / 2 + 0.5, Math.sin(a) * r);
      col.rotation.z = (Math.random() - 0.5) * 0.3;
      col.castShadow = true;
      parent.add(col);
    }
    // Arch fragment
    const archGeo = new THREE.TorusGeometry(1.5, 0.2, 6, 8, Math.PI * 0.6);
    const arch = new THREE.Mesh(archGeo, ruinMat);
    arch.position.set(0, 3, 0);
    arch.rotation.y = Math.random() * Math.PI;
    arch.castShadow = true;
    parent.add(arch);
  }

  private _addMushrooms(parent: THREE.Group, islandRadius: number): void {
    const glowColors = [0x22ff88, 0x44ccff, 0x8844ff, 0xffaa22];
    for (let i = 0; i < 4 + Math.floor(Math.random() * 4); i++) {
      const color = glowColors[i % glowColors.length];
      const stemGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.4, 5);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x888866 });
      const capGeo = new THREE.SphereGeometry(0.15, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const capMat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.5, roughness: 0.3,
      });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 0.25;

      const g = new THREE.Group();
      g.add(stem);
      g.add(cap);
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * islandRadius * 0.6;
      g.position.set(Math.cos(a) * r, 0.8 + Math.random() * 0.5, Math.sin(a) * r);
      g.scale.setScalar(0.5 + Math.random() * 1.0);
      parent.add(g);
    }
  }

  private _addGhostTree(parent: THREE.Group, _islandRadius: number): void {
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.35, 4, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x443344, roughness: 0.95 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(0, 2.5, 0);
    trunk.castShadow = true;
    parent.add(trunk);

    // Branches
    for (let i = 0; i < 5; i++) {
      const bGeo = new THREE.CylinderGeometry(0.02, 0.08, 1.5, 4);
      const bMat = new THREE.MeshStandardMaterial({ color: 0x554455 });
      const branch = new THREE.Mesh(bGeo, bMat);
      const a = (i / 5) * Math.PI * 2;
      branch.position.set(Math.cos(a) * 0.3, 3.5 + i * 0.3, Math.sin(a) * 0.3);
      branch.rotation.z = (Math.random() - 0.5) * 1.5;
      branch.rotation.x = (Math.random() - 0.5) * 0.5;
      parent.add(branch);
    }

    // Ghost leaves (transparent emissive)
    const leafGeo = new THREE.SphereGeometry(1.5, 8, 6);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x88aacc, emissive: 0x224466, emissiveIntensity: 0.3,
      transparent: true, opacity: 0.15, depthWrite: false,
    });
    const leaves = new THREE.Mesh(leafGeo, leafMat);
    leaves.position.set(0, 4.5, 0);
    parent.add(leaves);
  }

  // ── Fog Islands (ghostly floating) ───────────────────────────────────────

  private _buildFogIslands(): void {
    if (!this._scene) return;
    this._fogIslandGroup = new THREE.Group();

    for (let i = 0; i < 3; i++) {
      const geo = new THREE.DodecahedronGeometry(8 + Math.random() * 5, 1);
      // Flatten
      const posAttr = geo.getAttribute("position");
      for (let j = 0; j < posAttr.count; j++) {
        posAttr.setY(j, posAttr.getY(j) * 0.2);
      }
      geo.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({
        color: 0x445566, transparent: true, opacity: 0.25, depthWrite: false,
        emissive: 0x112233, emissiveIntensity: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const a = (i / 3) * Math.PI * 2;
      mesh.position.set(Math.cos(a) * 80, 5, Math.sin(a) * 80);
      this._fogIslandGroup.add(mesh);
    }
    this._scene.add(this._fogIslandGroup);
  }

  // ── Mountain Silhouette (distant horizon) ──────────────────────────────

  private _buildMountainSilhouette(): void {
    if (!this._scene) return;
    const mtGroup = new THREE.Group();
    const mtMat = new THREE.MeshBasicMaterial({ color: 0x0a0a15, side: THREE.DoubleSide });

    // Ring of mountain peaks on the far horizon
    const segments = 48;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const nextAngle = ((i + 1) / segments) * Math.PI * 2;
      const r = LAKE_RADIUS + 30;

      // Varying peak heights using pseudo-random from angle
      const peakH = 8 + Math.sin(i * 1.7) * 6 + Math.sin(i * 3.1) * 3;

      const geo = new THREE.BufferGeometry();
      const verts = new Float32Array([
        Math.cos(angle) * r, 0, Math.sin(angle) * r,
        Math.cos(nextAngle) * r, 0, Math.sin(nextAngle) * r,
        Math.cos((angle + nextAngle) / 2) * (r - 5), peakH, Math.sin((angle + nextAngle) / 2) * (r - 5),
        // Second triangle for wider base
        Math.cos(angle) * r, 0, Math.sin(angle) * r,
        Math.cos((angle + nextAngle) / 2) * (r - 5), peakH, Math.sin((angle + nextAngle) / 2) * (r - 5),
        Math.cos(angle) * (r + 10), -2, Math.sin(angle) * (r + 10),
      ]);
      geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      geo.computeVertexNormals();
      mtGroup.add(new THREE.Mesh(geo, mtMat));
    }
    this._scene.add(mtGroup);
  }

  // ── Mist Particles (rising from water) ────────────────────────────────

  private _mistTimer = 0;

  private _updateMist(dt: number): void {
    this._mistTimer += dt;
    if (this._mistTimer < 0.3) return;
    this._mistTimer = 0;

    // Spawn mist near the boat
    const b = this._boatState;
    const angle = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * 25;
    const x = b.x + Math.cos(angle) * dist;
    const z = b.z + Math.sin(angle) * dist;

    this._spawnParticle(
      x, 0.1, z,
      (Math.random() - 0.5) * 0.5, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.5,
      2.5 + Math.random() * 2, 0x223344, 0.3 + Math.random() * 0.2,
    );
  }

  // ── Underwater Glow Pillars ───────────────────────────────────────────

  private _buildGlowPillars(): void {
    if (!this._scene) return;
    for (const isl of this._islands) {
      // 1-2 glow pillars per island
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = isl.radius * 0.5 + Math.random() * 3;
        const px = isl.x + Math.cos(angle) * dist;
        const pz = isl.z + Math.sin(angle) * dist;

        const pillarGeo = new THREE.CylinderGeometry(0.3, 0.1, 6, 6, 1, true);
        const pillarMat = new THREE.MeshBasicMaterial({
          color: 0x22aacc, transparent: true, opacity: 0.08,
          side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
        });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(px, -2, pz);
        this._scene.add(pillar);

        // Light at base
        const light = new THREE.PointLight(0x22aacc, 0.5, 8);
        light.position.set(px, -1, pz);
        this._scene.add(light);
      }
    }
  }

  // ── Vignette Overlay ──────────────────────────────────────────────────

  private _vignetteEl: HTMLDivElement | null = null;

  private _buildVignette(): void {
    this._vignetteEl = document.createElement("div");
    this._vignetteEl.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 15;
      background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%);
    `;
    document.body.appendChild(this._vignetteEl);
  }

  // ── Boat Sail ─────────────────────────────────────────────────────────

  private _buildBoatSail(): void {
    if (!this._boatGroup) return;
    // Mast
    const mastGeo = new THREE.CylinderGeometry(0.04, 0.05, 3.5, 6);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0, 2.0, -0.5);
    mast.castShadow = true;
    this._boatGroup.add(mast);

    // Sail — triangular shape
    const sailGeo = new THREE.BufferGeometry();
    const sailVerts = new Float32Array([
      0, 0.8, -0.5,    // bottom-left
      0, 3.5, -0.5,    // top
      0, 1.2, -2.0,    // bottom-right (toward bow)
    ]);
    sailGeo.setAttribute("position", new THREE.Float32BufferAttribute(sailVerts, 3));
    sailGeo.computeVertexNormals();
    const sailMat = new THREE.MeshStandardMaterial({
      color: 0x445566, roughness: 0.8, side: THREE.DoubleSide,
      transparent: true, opacity: 0.7,
      emissive: 0x112233, emissiveIntensity: 0.15,
    });
    const sail = new THREE.Mesh(sailGeo, sailMat);
    sail.castShadow = true;
    this._boatGroup.add(sail);

    // Side rails
    const sideRailMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.9 });
    for (let side = -1; side <= 1; side += 2) {
      const railGeo = new THREE.BoxGeometry(0.06, 0.3, 3.0);
      const sideRail = new THREE.Mesh(railGeo, sideRailMat);
      sideRail.position.set(side * 0.75, 0.5, -0.2);
      this._boatGroup.add(sideRail);
    }
  }

  // ── Input ────────────────────────────────────────────────────────────────

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      this._keys[e.key.toLowerCase()] = true;
      if (e.key === "Escape") {
        if (this._gameOver) {
          this._exit();
        } else {
          this._paused = !this._paused;
          if (this._paused) this._showMessage("PAUSED", 999);
          else this._hideMessage();
        }
      }
      if (this._gameOver && (e.key === "Enter")) {
        this._restart();
      }
      if (this._gameOver && e.key === " ") {
        this._restart();
      }
      // Dismiss title screen with keyboard
      if (this._titleActive && (e.key === " " || e.key === "Enter")) {
        this._dismissTitle();
      }
      // Spell element switching
      if (e.key === "1") { this._currentElement = "arcane"; this._showMessage("ARCANE", 0.8); }
      if (e.key === "2") { this._currentElement = "fire"; this._showMessage("FIRE", 0.8); }
      if (e.key === "3") { this._currentElement = "ice"; this._showMessage("ICE", 0.8); }
      if (e.key === "4") { this._currentElement = "lightning"; this._showMessage("LIGHTNING", 0.8); }
      // Dash
      if (e.key === " " && !this._gameOver) { this._performDash(); }
      // Shop (Tab when dead or between waves)
      if (e.key === "Tab") { e.preventDefault(); if (!this._titleActive && !this._gameOver) this._toggleShop(); }
    };
    this._onKeyUp = (e: KeyboardEvent) => {
      this._keys[e.key.toLowerCase()] = false;
    };
    this._onMouseMove = (e: MouseEvent) => {
      this._mouseX = e.clientX;
      this._mouseY = e.clientY;
    };
    this._onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) this._mouseDown = true;
      if (e.button === 2) this._castFrostNova();
    };
    this._onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) this._mouseDown = false;
    };
    // Prevent context menu for right-click spell
    this._renderer?.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
  }

  // ── UI ───────────────────────────────────────────────────────────────────

  private _buildUI(): void {
    this._uiContainer = document.createElement("div");
    this._uiContainer.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 20; font-family: 'Segoe UI', Arial, sans-serif;
    `;
    document.body.appendChild(this._uiContainer);

    // HUD
    this._hudEl = document.createElement("div");
    this._hudEl.style.cssText = `
      position: absolute; top: 16px; left: 16px; right: 16px;
      display: flex; justify-content: space-between; align-items: flex-start;
      color: #cceeff; font-size: 15px; text-shadow: 0 0 8px #226;
    `;
    this._uiContainer.appendChild(this._hudEl);

    // Center message
    this._msgEl = document.createElement("div");
    this._msgEl.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: #ddeeff; font-size: 36px; font-weight: bold; text-align: center;
      text-shadow: 0 0 20px #44aaff, 0 0 40px #2266cc;
      opacity: 0; transition: opacity 0.4s;
      pointer-events: none;
    `;
    this._uiContainer.appendChild(this._msgEl);

    // Crosshair (mouse-tracking)
    this._crosshairEl = document.createElement("div");
    this._crosshairEl.style.cssText = `
      position: absolute; width: 24px; height: 24px;
      border: 2px solid rgba(136, 204, 255, 0.5);
      border-radius: 50%; pointer-events: none;
      transform: translate(-50%, -50%); transition: border-color 0.15s;
    `;
    const crossDot = document.createElement("div");
    crossDot.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 4px; height: 4px; background: rgba(136, 204, 255, 0.8); border-radius: 50%;
    `;
    this._crosshairEl.appendChild(crossDot);
    this._uiContainer.appendChild(this._crosshairEl);
  }

  private _updateHUD(): void {
    if (!this._hudEl) return;
    const b = this._boatState;
    const hearts = "❤".repeat(Math.max(0, b.hp)) + "♡".repeat(Math.max(0, b.maxHp - b.hp));
    const shieldIcon = b.shieldTimer > 0 ? ` 🛡${b.shieldTimer.toFixed(1)}s` : "";
    const speedIcon = b.speedTimer > 0 ? ` ⚡${b.speedTimer.toFixed(1)}s` : "";
    const powerIcon = b.powerTimer > 0 ? ` 🔥${b.powerTimer.toFixed(1)}s` : "";
    const shards = b.excaliburShards > 0 ? ` ⚔${b.excaliburShards}/5` : "";
    const excal = this._excaliburGranted ? " <span style='color:#ffdd44'>EXCALIBUR</span>" : "";
    const comboText = this._comboCount >= 2
      ? ` <span style="color:#ffaa22;font-weight:bold;">x${this._comboMult} COMBO (${this._comboCount})</span>` : "";
    const frostCd = b.frostNovaCooldown > 0
      ? `<span style="opacity:0.5">Frost: ${b.frostNovaCooldown.toFixed(1)}s</span>`
      : `<span style="color:#66ccff">Frost: READY</span>`;
    const dashCd = b.dashCooldown > 0
      ? `<span style="opacity:0.5">Dash: ${b.dashCooldown.toFixed(1)}s</span>`
      : `<span style="color:#88ccee">Dash: READY</span>`;
    const stormWarn = this._stormActive
      ? ` <span style="color:#ffff44;font-weight:bold;">⚡ STORM ⚡</span>` : "";

    // Element indicator
    const elemColors: Record<SpellElement, string> = {
      arcane: "#44ccff", fire: "#ff6622", ice: "#66ccff", lightning: "#ffff44",
    };
    const elemName = this._currentElement.toUpperCase();
    const elemColor = elemColors[this._currentElement];

    const bossHp = this._bossActive && this._bossEnemy && !this._bossEnemy.dead
      ? `<div style="margin-top:4px;"><span style="color:#ff4444;">BOSS HP: ${Math.ceil((this._bossEnemy.hp / this._bossEnemy.maxHp) * 100)}%</span></div>` : "";

    // Only rebuild DOM if values changed (avoid per-frame innerHTML thrash)
    const hash = `${b.hp}|${b.maxHp}|${this._wave}|${this._score}|${this._comboCount}|${this._currentElement}|${Math.floor(b.shieldTimer*2)}|${Math.floor(b.speedTimer*2)}|${Math.floor(b.powerTimer*2)}|${Math.floor(b.frostNovaCooldown*2)}|${Math.floor(b.dashCooldown*2)}|${b.excaliburShards}|${this._stormActive}|${this._bossActive}|${Math.floor(this._gameTime)}`;
    if (hash === this._lastHudHash) return;
    this._lastHudHash = hash;

    this._hudEl.innerHTML = `
      <div>
        <div style="font-size:22px; margin-bottom:4px;">${hearts}</div>
        <div>Wave ${this._wave}${shieldIcon}${speedIcon}${powerIcon}${shards}${excal}${stormWarn}</div>
        <div style="margin-top:3px;">
          <span style="color:${elemColor};font-weight:bold;">[${elemName}]</span>
          ${comboText}
        </div>
        ${bossHp}
      </div>
      <div style="text-align:right;">
        <div style="font-size:22px; margin-bottom:4px;">Score: ${this._score} <span style="color:#ffcc00;font-size:14px;">${this._gold}g</span></div>
        <div>Best: ${this._highScore} | ${this._gameTime.toFixed(0)}s</div>
        <div style="margin-top:3px;">${frostCd} · ${dashCd}</div>
        ${this._unlockedAbilities.size > 0 ? `<div style="font-size:11px; color:#ffdd44; margin-top:2px;">${Array.from(this._unlockedAbilities).map(id => ABILITY_POOL.find(a => a.id === id)?.name || id).join(" · ")}</div>` : ""}
        <div style="font-size:11px; opacity:0.6; margin-top:2px;">WASD · LMB · RMB nova · Space dash · 1-4 elem · Tab shop</div>
      </div>
    `;
  }

  private _showMessage(text: string, duration: number): void {
    if (!this._msgEl) return;
    this._msgEl.textContent = text;
    this._msgEl.style.opacity = "1";
    this._msgTimer = duration;
  }

  private _hideMessage(): void {
    if (!this._msgEl) return;
    this._msgEl.style.opacity = "0";
    this._msgTimer = 0;
  }

  // ── Main Loop ────────────────────────────────────────────────────────────

  private _loop(rawDt: number): void {
    const dt = Math.min(rawDt, 0.05);
    if (!this._scene || !this._camera || !this._renderer) return;

    // Hit-stop: freeze game for dramatic impact
    if (this._hitStopTimer > 0) {
      this._hitStopTimer -= rawDt;
      if (this._composer) this._composer.render();
      else this._renderer.render(this._scene, this._camera);
      return;
    }

    if (this._paused || this._titleActive) {
      this._waterTime += dt;
      if (this._waterMesh) {
        const wm = (this._waterMesh.material as THREE.ShaderMaterial).uniforms;
        wm.uTime.value = this._waterTime;
        if (this._camera) wm.uCameraPos.value.copy(this._camera.position);
      }
      // Animate fog islands + aurora even during title/pause
      if (this._fogIslandGroup) {
        this._fogIslandPhase += dt * 0.1;
        this._fogIslandGroup.children.forEach((child, i) => {
          child.position.y = 3 + Math.sin(this._fogIslandPhase + i * 2) * 2;
          (child as THREE.Mesh).material && ((child as any).material.opacity =
            0.12 + Math.sin(this._fogIslandPhase * 0.7 + i) * 0.08);
        });
      }
      this._updateAuroraAnimation(dt);

      // Cinematic camera orbit during title screen
      if (this._titleActive && this._camera) {
        const orbitSpeed = 0.06;
        const orbitR = 35;
        this._camera.position.x = Math.sin(this._waterTime * orbitSpeed) * orbitR;
        this._camera.position.z = Math.cos(this._waterTime * orbitSpeed) * orbitR;
        this._camera.position.y = 28 + Math.sin(this._waterTime * 0.15) * 3;
        this._camera.lookAt(0, 0, 0);
      }

      if (this._composer) this._composer.render();
      else this._renderer.render(this._scene, this._camera);
      return;
    }

    this._gameTime += dt;
    this._waterTime += dt;

    // Update water shader
    if (this._waterMesh) {
      (this._waterMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = this._waterTime;
    }

    // Fog islands drift
    if (this._fogIslandGroup) {
      this._fogIslandPhase += dt * 0.1;
      this._fogIslandGroup.children.forEach((child, i) => {
        child.position.y = 3 + Math.sin(this._fogIslandPhase + i * 2) * 2;
        (child as THREE.Mesh).material && ((child as any).material.opacity =
          0.12 + Math.sin(this._fogIslandPhase * 0.7 + i) * 0.08);
      });
    }

    // Message timer
    if (this._msgTimer > 0) {
      this._msgTimer -= dt;
      if (this._msgTimer <= 0) this._hideMessage();
    }

    if (!this._gameOver && !this._shopActive) {
      this._updateBoat(dt);
      this._updateDash(dt);
      this._updateAim();
      this._updateShooting(dt);
      this._updateSpells(dt);
      this._updateWaveSpawner(dt);
      this._updateEnemies(dt);
      this._updateEnemyDots(dt);
      this._updateRunes(dt);
      this._updateLady(dt);
      this._checkRuneSpawn(dt);
      this._updateWhirlpools(dt);
      this._updateCombo(dt);
      this._updateStorm(dt);
      this._updateBoatWake(dt);
      this._updateGoldCoins(dt);
      this._updateMist(dt);
      this._updateSanctuary(dt);
      this._updateDrownedKingBoss(dt);
      this._updatePendingSlams(dt);
      this._updateKnightShieldVisuals();
      this._updateWhirlpoolParticles(dt);
      this._updateEnemyWindups(dt);
    }

    this._updateParticles(dt);
    this._updateDamageNumbers(dt);
    this._updateLightningStrikes(dt);
    this._updateImpactRings(dt);
    this._updateTelegraphs(dt);
    this._updateShieldVisual();
    this._updateInvulnFlash(dt);
    this._updateElementVisuals();
    this._updateCamera(dt);
    this._updateHUD();
    this._updateMinimap();
    this._updateCooldownRings();
    this._updateCrosshair();
    this._updateAuroraAnimation(dt);

    if (this._composer) this._composer.render();
    else this._renderer.render(this._scene, this._camera);
  }

  // ── Boat movement ────────────────────────────────────────────────────────

  private _updateBoat(dt: number): void {
    const b = this._boatState;
    const speed = b.speedTimer > 0 ? BOAT_SPEED * 1.6 : BOAT_SPEED;

    // Input
    let thrust = 0;
    let turn = 0;
    if (this._keys["w"] || this._keys["arrowup"]) thrust += 1;
    if (this._keys["s"] || this._keys["arrowdown"]) thrust -= 0.5;
    if (this._keys["a"] || this._keys["arrowleft"]) turn += 1;
    if (this._keys["d"] || this._keys["arrowright"]) turn -= 1;

    b.angle += turn * BOAT_TURN_SPEED * dt;
    b.vx += Math.sin(b.angle) * thrust * speed * dt;
    b.vz += -Math.cos(b.angle) * thrust * speed * dt;
    b.vx *= BOAT_DRAG;
    b.vz *= BOAT_DRAG;

    b.x += b.vx * dt;
    b.z += b.vz * dt;

    // Clamp to lake
    const dist = Math.hypot(b.x, b.z);
    if (dist > LAKE_RADIUS - 5) {
      const n = LAKE_RADIUS - 5;
      b.x = (b.x / dist) * n;
      b.z = (b.z / dist) * n;
      b.vx *= 0.5;
      b.vz *= 0.5;
    }

    // Island collision
    for (const isl of this._islands) {
      const dx = b.x - isl.x;
      const dz = b.z - isl.z;
      const d = Math.hypot(dx, dz);
      const minDist = isl.radius + 2;
      if (d < minDist && d > 0) {
        b.x = isl.x + (dx / d) * minDist;
        b.z = isl.z + (dz / d) * minDist;
        b.vx *= -0.3;
        b.vz *= -0.3;
      }
    }

    // Timers
    if (b.shieldTimer > 0) b.shieldTimer -= dt;
    if (b.speedTimer > 0) b.speedTimer -= dt;
    if (b.powerTimer > 0) b.powerTimer -= dt;
    if (b.invulnTimer > 0) b.invulnTimer -= dt;
    if (b.spellCooldown > 0) b.spellCooldown -= dt;
    if (b.frostNovaCooldown > 0) b.frostNovaCooldown -= dt;

    // Update mesh
    if (this._boatGroup) {
      this._boatGroup.position.x = b.x;
      this._boatGroup.position.z = b.z;
      this._boatGroup.position.y = Math.sin(this._waterTime * BOAT_BOB_FREQ) * BOAT_BOB_AMP;
      this._boatGroup.rotation.y = b.angle;
      this._boatGroup.rotation.z = Math.sin(this._waterTime * BOAT_BOB_FREQ * 0.7 + 1) * BOAT_ROCK_AMP;
      this._boatGroup.rotation.x = Math.sin(this._waterTime * BOAT_BOB_FREQ * 0.5) * BOAT_ROCK_AMP * 0.5;
    }
  }

  // ── Aim ──────────────────────────────────────────────────────────────────

  private _updateAim(): void {
    if (!this._camera || !this._boatGroup) return;
    // Project mouse to world XZ plane at Y=0
    const ndc = new THREE.Vector2(
      (this._mouseX / window.innerWidth) * 2 - 1,
      -(this._mouseY / window.innerHeight) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this._camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, target);
    if (target) {
      this._aimAngle = Math.atan2(target.x - this._boatState.x, -(target.z - this._boatState.z));
    }
  }

  // ── Shooting ─────────────────────────────────────────────────────────────

  private _updateShooting(_dt: number): void {
    if (!this._mouseDown || !this._scene) return;
    const b = this._boatState;
    if (b.spellCooldown > 0) return;

    const elem = SPELL_ELEMENTS[this._currentElement];
    const cdMult = this._excaliburGranted ? 0.5 : 1.0;
    b.spellCooldown = elem.cooldown * cdMult;

    const dx = Math.sin(this._aimAngle);
    const dz = -Math.cos(this._aimAngle);

    const spellColor = this._excaliburGranted ? 0xffdd44 : elem.color;
    const sizeBoost = this._excaliburGranted ? 1.5 : 1.0;

    const geo = new THREE.SphereGeometry(elem.size * sizeBoost, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: spellColor });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(b.x + dx * 2, 1.5, b.z + dz * 2);
    this._scene.add(mesh);

    const light = new THREE.PointLight(spellColor, 1.5, 8);
    light.position.copy(mesh.position);
    mesh.add(light);

    // Element-specific projectile visuals
    if (this._currentElement === "fire") {
      // Fire: large flame cone + inner glow
      const trailGeo = new THREE.ConeGeometry(0.2, 1.2, 6);
      trailGeo.rotateX(Math.PI / 2);
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0xff4400, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const trail = new THREE.Mesh(trailGeo, trailMat);
      trail.position.z = 0.6;
      mesh.add(trail);
      // Outer heat haze
      const hazeGeo = new THREE.SphereGeometry(0.5, 6, 6);
      const hazeMat = new THREE.MeshBasicMaterial({
        color: 0xff8800, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      mesh.add(new THREE.Mesh(hazeGeo, hazeMat));
    } else if (this._currentElement === "ice") {
      // Ice: crystal shard shape (octahedron)
      const crystalGeo = new THREE.OctahedronGeometry(elem.size * sizeBoost * 1.5, 0);
      const crystalMat = new THREE.MeshBasicMaterial({
        color: 0xaaddff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      mesh.add(crystal);
      // Frost mist
      const mistGeo = new THREE.SphereGeometry(0.35, 6, 6);
      const mistMat = new THREE.MeshBasicMaterial({
        color: 0x66ccff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      mesh.add(new THREE.Mesh(mistGeo, mistMat));
    } else if (this._currentElement === "lightning") {
      // Lightning: thick glowing bolt core + electric aura
      const boltGeo = new THREE.BoxGeometry(0.08, 0.08, 1.5);
      const boltMat = new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending });
      mesh.add(new THREE.Mesh(boltGeo, boltMat));
      // Cross bolt for X-shape
      const boltGeo2 = new THREE.BoxGeometry(0.08, 1.5, 0.08);
      mesh.add(new THREE.Mesh(boltGeo2, boltMat));
      // Electric aura
      const auraGeo = new THREE.SphereGeometry(0.3, 6, 6);
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0xffff44, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      mesh.add(new THREE.Mesh(auraGeo, auraMat));
    } else {
      // Arcane: mystical swirl ring
      const ringGeo = new THREE.TorusGeometry(elem.size * sizeBoost * 1.2, 0.03, 4, 12);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xbb88ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      mesh.add(ring);
    }

    this._spells.push({
      x: mesh.position.x, z: mesh.position.z,
      dx: dx * elem.speed, dz: dz * elem.speed,
      life: elem.lifetime,
      mesh,
      power: b.powerTimer > 0 || this._excaliburGranted,
      element: this._currentElement,
      hitEnemies: new Set(),
    });

    // Muzzle flash
    for (let i = 0; i < 4; i++) {
      this._spawnParticle(
        b.x + dx * 2, 1.5, b.z + dz * 2,
        (Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3,
        0.3, spellColor, 0.15,
      );
    }

    this._playSound("spell_cast");

    // Echo Cast: fire a weaker copy 0.2s later
    if (this._unlockedAbilities.has("echo_cast") && this._scene) {
      const echoDx = dx, echoDz = dz, echoElem = this._currentElement;
      const echoScene = this._scene;
      const self = this;
      // Deferred via game timer approach — spawn echo on next few frames
      let echoDelay = 12; // ~12 frames ≈ 0.2s
      const echoCheck = () => {
        echoDelay--;
        if (echoDelay > 0) { requestAnimationFrame(echoCheck); return; }
        if (!echoScene || self._gameOver || self._paused) return;
        const eGeo = new THREE.SphereGeometry(elem.size * 0.7, 6, 6);
        const eMat = new THREE.MeshBasicMaterial({ color: spellColor, transparent: true, opacity: 0.6 });
        const eMesh = new THREE.Mesh(eGeo, eMat);
        eMesh.position.set(b.x + echoDx * 2, 1.5, b.z + echoDz * 2);
        echoScene.add(eMesh);
        self._spells.push({
          x: eMesh.position.x, z: eMesh.position.z,
          dx: echoDx * elem.speed * 0.8, dz: echoDz * elem.speed * 0.8,
          life: elem.lifetime * 0.7, mesh: eMesh,
          power: false, element: echoElem, hitEnemies: new Set(),
        });
      };
      echoCheck();
    }

    // Multishot (lightning triple bolt)
    if (this._unlockedAbilities.has("multishot") && this._currentElement === "lightning" && this._scene) {
      for (let spread = -1; spread <= 1; spread += 2) {
        const spreadAngle = this._aimAngle + spread * 0.2;
        const sdx = Math.sin(spreadAngle);
        const sdz = -Math.cos(spreadAngle);
        const sGeo = new THREE.SphereGeometry(elem.size * 0.7, 6, 6);
        const sMat = new THREE.MeshBasicMaterial({ color: 0xffff44 });
        const sMesh = new THREE.Mesh(sGeo, sMat);
        sMesh.position.set(b.x + sdx * 2, 1.5, b.z + sdz * 2);
        this._scene.add(sMesh);
        this._spells.push({
          x: sMesh.position.x, z: sMesh.position.z,
          dx: sdx * elem.speed, dz: sdz * elem.speed,
          life: elem.lifetime, mesh: sMesh,
          power: false, element: "lightning", hitEnemies: new Set(),
        });
      }
    }
  }

  private _updateSpells(dt: number): void {
    for (let i = this._spells.length - 1; i >= 0; i--) {
      const s = this._spells[i];
      const elemDef = SPELL_ELEMENTS[s.element];

      // Homing (arcane): steer toward nearest enemy
      const homingStr = elemDef.homing * (this._unlockedAbilities.has("homing_boost") ? 2 : 1);
      if (homingStr > 0) {
        let nearDist = 30;
        let nearX = 0, nearZ = 0;
        let found = false;
        for (const e of this._enemies) {
          if (e.dead) continue;
          const d = Math.hypot(e.x - s.x, e.z - s.z);
          if (d < nearDist) {
            nearDist = d;
            nearX = e.x;
            nearZ = e.z;
            found = true;
          }
        }
        if (found && nearDist > 1) {
          const toX = nearX - s.x;
          const toZ = nearZ - s.z;
          const toD = Math.hypot(toX, toZ);
          const curSpeed = Math.hypot(s.dx, s.dz);
          s.dx += (toX / toD) * homingStr * dt;
          s.dz += (toZ / toD) * homingStr * dt;
          // Normalize to maintain speed
          const newSpeed = Math.hypot(s.dx, s.dz);
          if (newSpeed > 0) { s.dx = (s.dx / newSpeed) * curSpeed; s.dz = (s.dz / newSpeed) * curSpeed; }
        }
      }

      s.x += s.dx * dt;
      s.z += s.dz * dt;
      s.life -= dt;
      s.mesh.position.set(s.x, 1.5, s.z);
      // Rotate mesh to face movement direction
      s.mesh.rotation.y = Math.atan2(s.dx, -s.dz);

      // Trail particles (element-colored)
      if (Math.random() < 0.4) {
        const col = s.power ? 0xff6644 : elemDef.trailColor;
        this._spawnParticle(s.x, 1.5, s.z,
          (Math.random() - 0.5) * 1, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 1,
          0.4, col, 0.06 + elemDef.size * 0.2);
      }

      // Enemy projectiles damage the player
      if (s.hitEnemies.has(-1)) {
        const b = this._boatState;
        const pd = Math.hypot(s.x - b.x, s.z - b.z);
        if (pd < 2.0) {
          this._damageBoat(1);
          this._scene?.remove(s.mesh);
          s.mesh.geometry.dispose();
          (s.mesh.material as THREE.Material).dispose();
          this._spells.splice(i, 1);
          continue;
        }
      }

      if (s.life <= 0 || Math.hypot(s.x, s.z) > LAKE_RADIUS + 10) {
        // Water splash on expired spells (missed shots)
        if (s.life <= 0 && !s.hitEnemies.has(-1)) {
          const elemDef = SPELL_ELEMENTS[s.element];
          // Splash ring
          this._spawnImpactRing(s.x, s.z, elemDef.trailColor, 2);
          // Splash particles
          for (let p = 0; p < 5; p++) {
            this._spawnParticle(
              s.x + (Math.random() - 0.5) * 1, 0.2, s.z + (Math.random() - 0.5) * 1,
              (Math.random() - 0.5) * 2, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 2,
              0.4, 0x88ccee, 0.05,
            );
          }
        }
        this._scene?.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
        this._spells.splice(i, 1);
      }
    }
  }

  // ── Wave spawner ─────────────────────────────────────────────────────────

  private _updateWaveSpawner(dt: number): void {
    // Inter-wave calm: don't spawn during downtime
    if (this._inWaveCalm) {
      this._waveCalmTimer -= dt;
      if (this._waveCalmTimer <= 0) {
        this._inWaveCalm = false;
      }
      return;
    }
    // Don't spawn during ability pick
    if (this._abilityPickActive) return;

    this._waveTimer -= dt;
    if (this._waveTimer <= 0 && this._enemiesAlive <= 2) {
      this._wave++;
      const interval = Math.max(WAVE_INTERVAL_MIN, WAVE_INTERVAL_BASE - this._wave * 0.8);
      this._waveTimer = interval;

      // Pick composition
      const eligible = WAVE_COMPOSITIONS.filter(w => w.minWave <= this._wave);
      const comp = eligible[Math.floor(Math.random() * eligible.length)];

      // Scale counts with wave
      const scale = 1 + Math.floor(this._wave / 5) * 0.3;
      for (const entry of comp.enemies) {
        const count = Math.ceil(entry.count * scale);
        for (let i = 0; i < count; i++) {
          this._spawnEnemy(entry.kind);
        }
      }

      // Boss wave: Drowned King at wave 25, regular bosses at other intervals
      if (this._wave === 25 && !this._bossActive) {
        this._spawnDrownedKing();
      } else if (this._wave % BOSS_WAVE_INTERVAL === 0 && this._wave !== 25 && !this._bossActive) {
        this._spawnBoss();
      }

      // Narrative events + era transitions
      this._checkNarrative();
      this._checkEraTransition();

      if (!this._narrativeShown.has(this._wave)) {
        this._showMessage(`WAVE ${this._wave}`, 2);
      }
      this._playSound("wave_start");
    }
  }

  private _checkEraTransition(): void {
    const oldEra = this._currentEra;
    if (this._wave >= 40) this._currentEra = "ascension";
    else if (this._wave >= 25) this._currentEra = "abyss";
    else if (this._wave >= 10) this._currentEra = "dominion";
    else this._currentEra = "dawn";

    if (this._currentEra !== oldEra) {
      const eraNames: Record<string, string> = {
        dominion: "ERA II: DOMINION — The lake's creatures grow cunning.",
        abyss: "ERA III: THE ABYSS — Ancient horrors awaken.",
        ascension: "ERA IV: ASCENSION — You challenge the lake itself.",
      };
      const msg = eraNames[this._currentEra];
      if (msg) {
        this._showMessage(msg, 4);
        this._shakeIntensity = 0.5;
        this._playSound("storm_start");
      }
    }
  }

  // ── Enemy spawn ──────────────────────────────────────────────────────────

  private _spawnEnemy(kind: EnemyKind): void {
    if (!this._scene) return;
    const def = ENEMY_DEFS[kind];
    const b = this._boatState;

    // Spawn around player
    const angle = Math.random() * Math.PI * 2;
    const dist = ENEMY_SPAWN_RADIUS_MIN + Math.random() * (ENEMY_SPAWN_RADIUS_MAX - ENEMY_SPAWN_RADIUS_MIN);
    let x = b.x + Math.cos(angle) * dist;
    let z = b.z + Math.sin(angle) * dist;

    // Clamp to lake
    const d = Math.hypot(x, z);
    if (d > LAKE_RADIUS - 10) {
      x = (x / d) * (LAKE_RADIUS - 10);
      z = (z / d) * (LAKE_RADIUS - 10);
    }

    const group = new THREE.Group();

    if (kind === "wisp") {
      // Glowing orb
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(def.size * 0.4, 8, 8),
        new THREE.MeshBasicMaterial({ color: def.color }),
      );
      group.add(core);
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(def.size * 0.7, 8, 8),
        new THREE.MeshBasicMaterial({ color: def.emissive, transparent: true, opacity: 0.3, depthWrite: false }),
      );
      group.add(halo);
      const light = new THREE.PointLight(def.color, 1.0, 8);
      group.add(light);
    } else if (kind === "water_serpent") {
      // Segmented body
      for (let s = 0; s < 5; s++) {
        const seg = new THREE.Mesh(
          new THREE.SphereGeometry(def.size * (1 - s * 0.15) * 0.5, 6, 6),
          new THREE.MeshStandardMaterial({ color: def.color, emissive: def.emissive, emissiveIntensity: 0.3, roughness: 0.4 }),
        );
        seg.position.z = s * 0.8;
        seg.castShadow = true;
        group.add(seg);
      }
    } else if (kind === "kraken_arm") {
      // Tentacle
      for (let s = 0; s < 8; s++) {
        const r = def.size * 0.3 * (1 - s * 0.1);
        const seg = new THREE.Mesh(
          new THREE.CylinderGeometry(r, r * 1.1, 0.6, 6),
          new THREE.MeshStandardMaterial({ color: def.color, emissive: def.emissive, emissiveIntensity: 0.2, roughness: 0.5 }),
        );
        seg.position.y = s * 0.5;
        seg.rotation.z = Math.sin(s * 0.8) * 0.3;
        seg.castShadow = true;
        group.add(seg);
      }
    } else if (kind === "bog_wraith") {
      // Ghostly humanoid
      const bodyMat = new THREE.MeshStandardMaterial({
        color: def.color, emissive: def.emissive, emissiveIntensity: 0.4,
        transparent: true, opacity: 0.7, depthWrite: false,
      });
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 1.5, 6), bodyMat);
      torso.position.y = 1;
      group.add(torso);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), bodyMat);
      head.position.y = 2;
      group.add(head);
      // Glowing eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
      for (let e = 0; e < 2; e++) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), eyeMat);
        eye.position.set(e === 0 ? -0.12 : 0.12, 2.05, -0.25);
        group.add(eye);
      }
    } else if (kind === "sea_witch") {
      // Sea Witch — hooded caster with glowing staff, ranged attacker
      const witchMat = new THREE.MeshStandardMaterial({
        color: def.color, emissive: def.emissive, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.85,
      });
      const robe = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.2, 6), witchMat);
      robe.position.y = 1.1;
      group.add(robe);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6), witchMat);
      head.position.y = 2.5;
      group.add(head);
      // Staff
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.5, 4),
        new THREE.MeshStandardMaterial({ color: 0x664488 }));
      staff.position.set(0.4, 1.8, -0.3);
      staff.rotation.x = -0.2;
      group.add(staff);
      // Staff orb
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xff44ff }));
      orb.position.set(0.4, 3.0, -0.6);
      group.add(orb);
      const orbLight = new THREE.PointLight(0xff44ff, 1.5, 10);
      orbLight.position.copy(orb.position);
      group.add(orbLight);

    } else if (kind === "leviathan") {
      // Leviathan — massive serpentine body, fast, emerges from deep
      const levMat = new THREE.MeshStandardMaterial({
        color: def.color, emissive: def.emissive, emissiveIntensity: 0.4, roughness: 0.3,
      });
      for (let s = 0; s < 8; s++) {
        const r = def.size * (1 - s * 0.08) * 0.4;
        const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 6), levMat);
        seg.position.z = s * 1.2;
        seg.castShadow = true;
        group.add(seg);
      }
      // Jaw / head
      const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x334466, emissive: 0x112244, emissiveIntensity: 0.3 }));
      jaw.position.set(0, 0, -1.0);
      jaw.rotation.x = -Math.PI / 2;
      group.add(jaw);
      // Glowing eyes
      for (let i = 0; i < 2; i++) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 4),
          new THREE.MeshBasicMaterial({ color: 0xff2222 }));
        eye.position.set(i === 0 ? -0.3 : 0.3, 0.2, -0.5);
        group.add(eye);
      }
      const headLight = new THREE.PointLight(0xff4444, 1.0, 8);
      headLight.position.set(0, 0.3, -0.5);
      group.add(headLight);

    } else if (kind === "phantom_ship") {
      // Phantom Ship — ghostly galleon that fires spectral cannons
      const shipMat = new THREE.MeshStandardMaterial({
        color: def.color, emissive: def.emissive, emissiveIntensity: 0.3,
        transparent: true, opacity: 0.6, depthWrite: false,
      });
      // Hull
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), shipMat);
      hull.position.y = 0.5;
      group.add(hull);
      // Bow
      const bow = new THREE.Mesh(new THREE.ConeGeometry(1, 1.5, 4), shipMat);
      bow.position.set(0, 0.5, -2.5);
      bow.rotation.x = -Math.PI / 2;
      group.add(bow);
      // Mast
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 4),
        new THREE.MeshStandardMaterial({ color: 0x556677 }));
      mast.position.set(0, 3, 0);
      group.add(mast);
      // Ghost sail
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.5),
        new THREE.MeshBasicMaterial({ color: 0x8899aa, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
      sail.position.set(0, 3.5, 0);
      group.add(sail);
      // Ghostly lanterns
      for (let i = 0; i < 3; i++) {
        const lantern = new THREE.PointLight(0x44aaff, 0.8, 6);
        lantern.position.set((i - 1) * 0.8, 1.5, (i - 1) * 1);
        group.add(lantern);
      }

    } else {
      // drowned_knight
      const armorMat = new THREE.MeshStandardMaterial({
        color: def.color, emissive: def.emissive, emissiveIntensity: 0.3,
        roughness: 0.5, metalness: 0.6,
      });
      // Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.5), armorMat);
      body.position.y = 1.2;
      body.castShadow = true;
      group.add(body);
      // Head (helmet)
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), armorMat);
      helm.position.y = 2.2;
      group.add(helm);
      // Shield
      const shield = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.7, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.8, roughness: 0.3 }),
      );
      shield.position.set(-0.5, 1.3, 0);
      group.add(shield);
      // Sword
      const sword = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 1.0, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x99aabb, metalness: 0.9, roughness: 0.2 }),
      );
      sword.position.set(0.5, 1.5, -0.3);
      sword.rotation.x = -0.4;
      group.add(sword);
    }

    // HP bar
    const hpBarWidth = 1.2;
    const hpBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(hpBarWidth, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x220000, transparent: true, opacity: 0.7, depthTest: false }),
    );
    const hpBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(hpBarWidth, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.9, depthTest: false }),
    );
    const hpBarY = def.size * 1.8 + 1.5;
    hpBarBg.position.y = hpBarY;
    hpBarFill.position.y = hpBarY;
    hpBarBg.renderOrder = 999;
    hpBarFill.renderOrder = 1000;
    group.add(hpBarBg);
    group.add(hpBarFill);

    const startY = def.submerged ? -3 : 0.5;
    group.position.set(x, startY, z);
    this._scene.add(group);

    const scaledHp = def.hp + Math.floor(this._wave / 4);
    const eid = this._enemyIdCounter++;
    this._enemies.push({
      kind, x, z, y: startY,
      hp: scaledHp,
      maxHp: scaledHp,
      attackTimer: def.attackCooldown,
      dead: false, deathTimer: 0, mesh: group,
      hpBarBg, hpBarFill,
      hitFlash: 0,
      angle: 0,
      emergeTimer: def.submerged ? 1.5 : 0,
      slowTimer: 0,
      dotTimer: 0, dotTickTimer: 0,
      specialTimer: 3 + Math.random() * 3,
      specialActive: false,
      circleAngle: Math.random() * Math.PI * 2,
      blockTimer: 0,
      teleportCd: 5 + Math.random() * 3,
      isBoss: false,
      bossPhase: 0,
    });
    void eid; // used for pierce tracking via index
    this._enemiesAlive++;
  }

  // ── Enemy update ─────────────────────────────────────────────────────────

  private _updateEnemies(dt: number): void {
    const b = this._boatState;

    for (let i = this._enemies.length - 1; i >= 0; i--) {
      const e = this._enemies[i];
      const def = ENEMY_DEFS[e.kind];

      if (e.dead) {
        e.deathTimer -= dt;
        const deathT = 1 - Math.max(0, e.deathTimer); // 0→1 over 1 second

        // Element-specific dissolve
        const lastElem = this._currentElement;
        if (lastElem === "fire") {
          // Charring: glow brighter, shrink, emit sparks
          e.mesh.position.y -= dt * 1.5;
          e.mesh.scale.multiplyScalar(0.95);
          e.mesh.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) {
              if (child.material instanceof THREE.MeshStandardMaterial) {
                child.material.emissiveIntensity = 2.0 * (1 - deathT);
                child.material.emissive.setHex(0xff4400);
              }
              if (child.material instanceof THREE.MeshBasicMaterial) {
                child.material.opacity = Math.max(0, 1 - deathT);
              }
            }
          });
        } else if (lastElem === "ice") {
          // Freeze + shatter: turn blue, fragment outward
          e.mesh.scale.multiplyScalar(0.92);
          e.mesh.children.forEach((child, ci) => {
            // Push children outward
            child.position.x += (child.position.x > 0 ? 1 : -1) * dt * 3;
            child.position.z += (child.position.z > 0 ? 1 : -1) * dt * 2;
            child.position.y += dt * (ci % 2 === 0 ? 2 : -1);
          });
          e.mesh.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
              child.material.color.setHex(0x88ccff);
              child.material.transparent = true;
              child.material.opacity = Math.max(0, 1 - deathT * 1.2);
            }
          });
        } else if (lastElem === "lightning") {
          // Electric disintegration: flicker visibility + jitter position
          e.mesh.visible = Math.random() > 0.3;
          e.mesh.position.x += (Math.random() - 0.5) * 0.3;
          e.mesh.position.z += (Math.random() - 0.5) * 0.3;
          e.mesh.scale.multiplyScalar(0.94);
          e.mesh.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
              child.material.emissive.setHex(0xffff44);
              child.material.emissiveIntensity = Math.random() * 2;
            }
          });
        } else {
          // Arcane: spiral upward while fading
          e.mesh.position.y += dt * 3;
          e.mesh.rotation.y += dt * 5;
          e.mesh.scale.multiplyScalar(0.95);
          e.mesh.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) {
              if (child.material instanceof THREE.MeshStandardMaterial) {
                child.material.transparent = true;
                child.material.opacity = Math.max(0, 1 - deathT * 1.3);
                child.material.emissive.setHex(0x9966ff);
                child.material.emissiveIntensity = 0.5;
              }
              if (child.material instanceof THREE.MeshBasicMaterial) {
                child.material.opacity = Math.max(0, 1 - deathT * 1.3);
              }
            }
          });
        }

        if (e.deathTimer <= 0) {
          e.mesh.visible = true; // reset before removal
          this._scene?.remove(e.mesh);
          this._enemies.splice(i, 1);
        }
        continue;
      }

      // Emerge
      if (e.emergeTimer > 0) {
        e.emergeTimer -= dt;
        e.y += dt * 2;
        e.mesh.position.y = e.y;
        continue;
      }

      // Slow debuff
      if (e.slowTimer > 0) e.slowTimer -= dt;

      // Difficulty scaling: speed/damage increase per wave
      const waveSpeedMult = 1 + this._wave * 0.03;
      const waveDmgMult = 1 + Math.floor(this._wave / 3) * 0.25;

      // Move toward player with SPECIAL ABILITIES per enemy type
      const dx = b.x - e.x;
      const dz = b.z - e.z;
      const dist = Math.hypot(dx, dz);
      e.angle = Math.atan2(dx, -dz);
      e.specialTimer -= dt;

      if (e.kind === "wisp") {
        // WISP: Erratic dodging movement — zig-zag approach
        const slowMult = e.slowTimer > 0 ? 0.3 : 1.0;
        const spd = def.speed * slowMult * waveSpeedMult * dt;
        if (dist > def.attackRange) {
          const dodge = Math.sin(this._waterTime * 8 + i * 3) * 0.7;
          const perpX = -dz / (dist || 1);
          const perpZ = dx / (dist || 1);
          e.x += ((dx / dist) + perpX * dodge) * spd;
          e.z += ((dz / dist) + perpZ * dodge) * spd;
        }
        e.y = 1.5 + Math.sin(this._waterTime * 3 + i) * 0.5;

      } else if (e.kind === "water_serpent") {
        // SERPENT: Circles the player then lunges
        const slowMult = e.slowTimer > 0 ? 0.3 : 1.0;
        const spd = def.speed * slowMult * waveSpeedMult * dt;
        if (e.specialTimer <= 0 && dist < 20) {
          // Circling phase
          e.specialActive = true;
          e.circleAngle += dt * 1.5;
          const circleR = 10;
          const targetX = b.x + Math.cos(e.circleAngle) * circleR;
          const targetZ = b.z + Math.sin(e.circleAngle) * circleR;
          const toX = targetX - e.x;
          const toZ = targetZ - e.z;
          const toD = Math.hypot(toX, toZ) || 1;
          e.x += (toX / toD) * spd * 1.3;
          e.z += (toZ / toD) * spd * 1.3;

          // After circling, lunge
          if (e.circleAngle > Math.PI * 2) {
            e.specialTimer = 4 + Math.random() * 3;
            e.specialActive = false;
            e.circleAngle = 0;
          }
        } else if (dist > def.attackRange) {
          e.x += (dx / dist) * spd;
          e.z += (dz / dist) * spd;
        }
        e.y = -0.2 + Math.sin(this._waterTime * 1.5 + i) * 0.4;
        // Undulation
        e.mesh.children.forEach((seg, si) => {
          if (si < e.mesh.children.length - 2) // skip HP bars
            seg.position.y = Math.sin(this._waterTime * 3 + si * 0.6) * 0.2;
        });

      } else if (e.kind === "kraken_arm") {
        // KRAKEN: Slow approach, periodic slam attack (AoE damage)
        const slowMult = e.slowTimer > 0 ? 0.3 : 1.0;
        const spd = def.speed * slowMult * waveSpeedMult * dt;
        if (dist > def.attackRange) {
          e.x += (dx / dist) * spd;
          e.z += (dz / dist) * spd;
        }
        // Slam attack
        if (e.specialTimer <= 0 && dist < 8) {
          e.specialTimer = 5 + Math.random() * 2;
          this._krakenSlam(e);
        }
        e.y = -0.5 + Math.sin(this._waterTime * 0.8 + i) * 0.3;
        e.mesh.children.forEach((seg, si) => {
          if (si < e.mesh.children.length - 2)
            seg.rotation.z = Math.sin(this._waterTime * 2 + si * 0.8) * 0.3;
        });

      } else if (e.kind === "bog_wraith") {
        // WRAITH: Teleports near player periodically
        const slowMult = e.slowTimer > 0 ? 0.3 : 1.0;
        const spd = def.speed * slowMult * waveSpeedMult * dt;
        e.teleportCd -= dt;
        if (e.teleportCd <= 0 && dist > 8) {
          e.teleportCd = 5 + Math.random() * 3;
          // Teleport to nearby player position
          const tAngle = Math.random() * Math.PI * 2;
          const tDist = 5 + Math.random() * 4;
          e.x = b.x + Math.cos(tAngle) * tDist;
          e.z = b.z + Math.sin(tAngle) * tDist;
          // Teleport particles at old and new position
          for (let p = 0; p < 8; p++) {
            this._spawnParticle(e.x, 1, e.z,
              (Math.random() - 0.5) * 4, 2, (Math.random() - 0.5) * 4,
              0.5, 0x556633, 0.1);
          }
          this._playSound("wraith_teleport");
        } else if (dist > def.attackRange) {
          e.x += (dx / dist) * spd;
          e.z += (dz / dist) * spd;
        }
        e.y = 0.5;

      } else if (e.kind === "sea_witch") {
        // SEA WITCH: Keeps distance, fires spectral projectiles (handled via ranged attack)
        const slowMult = e.slowTimer > 0 ? 0.3 : 1.0;
        const spd = def.speed * slowMult * waveSpeedMult * dt;
        const preferDist = 12;
        if (dist < preferDist - 2) {
          // Retreat from player
          e.x -= (dx / dist) * spd;
          e.z -= (dz / dist) * spd;
        } else if (dist > preferDist + 5) {
          e.x += (dx / dist) * spd;
          e.z += (dz / dist) * spd;
        }
        // Strafe sideways
        const perpX = -dz / (dist || 1);
        const perpZ = dx / (dist || 1);
        e.x += perpX * spd * 0.5 * Math.sin(this._waterTime * 2 + i);
        e.z += perpZ * spd * 0.5 * Math.sin(this._waterTime * 2 + i);
        e.y = 0.5 + Math.sin(this._waterTime * 2 + i) * 0.2;

        // Ranged attack: spawn projectile toward player
        if (dist < def.attackRange) {
          e.attackTimer -= dt;
          if (e.attackTimer <= 0) {
            e.attackTimer = def.attackCooldown;
            this._witchProjectile(e);
          }
        }

      } else if (e.kind === "leviathan") {
        // LEVIATHAN: Fast diving serpent, surfaces to attack then dives away
        const slowMult = e.slowTimer > 0 ? 0.3 : 1.0;
        const spd = def.speed * slowMult * waveSpeedMult * dt;
        if (dist > def.attackRange) {
          e.x += (dx / dist) * spd;
          e.z += (dz / dist) * spd;
        }
        // Undulation + dive behavior
        e.y = -0.5 + Math.sin(this._waterTime * 2 + i) * 1.0;
        e.mesh.children.forEach((seg, si) => {
          if (si < e.mesh.children.length - 2)
            seg.position.y = Math.sin(this._waterTime * 4 + si * 0.8) * 0.4;
        });

      } else if (e.kind === "phantom_ship") {
        // PHANTOM SHIP: Slow patrol, fires ghostly broadsides
        const slowMult = e.slowTimer > 0 ? 0.3 : 1.0;
        const spd = def.speed * slowMult * waveSpeedMult * dt;
        // Circle the player at medium distance
        e.circleAngle += dt * 0.4;
        const orbitR = 15;
        const targetX = b.x + Math.cos(e.circleAngle) * orbitR;
        const targetZ = b.z + Math.sin(e.circleAngle) * orbitR;
        const toX = targetX - e.x;
        const toZ = targetZ - e.z;
        const toD = Math.hypot(toX, toZ) || 1;
        e.x += (toX / toD) * spd;
        e.z += (toZ / toD) * spd;
        e.y = 0;
        // Ghost shimmer
        e.mesh.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.opacity = 0.4 + Math.sin(this._waterTime * 3 + i) * 0.15;
          }
        });

        // Broadside attack: fires 3 ghost projectiles
        if (dist < def.attackRange) {
          e.attackTimer -= dt;
          if (e.attackTimer <= 0) {
            e.attackTimer = def.attackCooldown;
            this._shipBroadside(e);
          }
        }

      } else {
        // DROWNED KNIGHT: Periodically raises shield (blocks frontal damage)
        const slowMult = e.slowTimer > 0 ? 0.3 : 1.0;
        const spd = def.speed * slowMult * waveSpeedMult * dt;
        if (e.specialTimer <= 0 && dist < 15) {
          e.blockTimer = 2.0;
          e.specialTimer = 6 + Math.random() * 3;
        }
        if (e.blockTimer > 0) e.blockTimer -= dt;
        if (dist > def.attackRange) {
          // Move slower while blocking
          const blockMult = e.blockTimer > 0 ? 0.5 : 1.0;
          e.x += (dx / dist) * spd * blockMult;
          e.z += (dz / dist) * spd * blockMult;
        }
        e.y = 0.5;
      }

      e.mesh.position.set(e.x, e.y, e.z);
      e.mesh.rotation.y = e.angle;

      // HP bar update + billboard to face camera
      if (e.hpBarFill && e.hpBarBg && this._camera) {
        const hpPct = Math.max(0, e.hp / e.maxHp);
        e.hpBarFill.scale.x = hpPct;
        e.hpBarFill.position.x = -(1 - hpPct) * 0.6;
        // Billboard: make HP bars face camera
        const camQ = this._camera.quaternion;
        e.hpBarBg.quaternion.copy(camQ);
        e.hpBarFill.quaternion.copy(camQ);
        // Frost tint when slowed
        if (e.slowTimer > 0) {
          (e.hpBarFill.material as THREE.MeshBasicMaterial).color.setHex(0x4488ff);
        } else {
          const barColor = hpPct > 0.5 ? 0x44ff44 : hpPct > 0.25 ? 0xffaa22 : 0xff2222;
          (e.hpBarFill.material as THREE.MeshBasicMaterial).color.setHex(barColor);
        }
      }

      // Hit flash
      if (e.hitFlash > 0) {
        e.hitFlash -= dt;
        e.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissiveIntensity = e.hitFlash > 0 ? 2.0 : 0.3;
          }
        });
      }

      // Attack (damage scales with wave)
      if (dist < def.attackRange) {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = def.attackCooldown;
          const scaledDmg = Math.ceil(def.damage * waveDmgMult);
          this._damageBoat(scaledDmg);
        }
      }

      // Check spell collisions
      for (let j = this._spells.length - 1; j >= 0; j--) {
        const s = this._spells[j];
        const sd = Math.hypot(s.x - e.x, s.z - e.z);
        if (sd < def.size + SPELL_RADIUS) {
          // Skip enemy projectiles — they only damage the player
          if (s.hitEnemies.has(-1)) continue;
          // Pierce tracking — ice goes through already-hit enemies
          if (s.hitEnemies.has(i)) continue;

          const elemDef = SPELL_ELEMENTS[s.element];

          // Knight blocking: frontal hits are halved when blocking
          let blockReduction = 1;
          if (e.kind === "drowned_knight" && e.blockTimer > 0) {
            // Check if spell hit from front
            const hitAngle = Math.atan2(s.x - e.x, -(s.z - e.z));
            const angleDiff = Math.abs(hitAngle - e.angle);
            if (angleDiff < Math.PI / 3 || angleDiff > Math.PI * 5 / 3) {
              blockReduction = 0.3;
              this._spawnParticle(e.x, e.y + 1.5, e.z, 0, 2, 0, 0.3, 0x888888, 0.15);
            }
          }

          const shopDmg = this._getUpgradeLevel("spell_dmg");
          const baseDmg = elemDef.damage + shopDmg;
          let dmgMult = (s.power ? 2 : 1) * blockReduction;

          // ── ELEMENT SYNERGIES ──
          // Fire on frozen enemy = SHATTER (3x damage, removes freeze)
          if (s.element === "fire" && e.slowTimer > 1.0) {
            dmgMult *= FROZEN_FIRE_SHATTER_MULT;
            e.slowTimer = 0;
            // Shatter burst!
            for (let p = 0; p < 15; p++) {
              this._spawnParticle(e.x, e.y + 1, e.z,
                (Math.random() - 0.5) * 8, 2 + Math.random() * 4, (Math.random() - 0.5) * 8,
                0.6, 0x66ccff, 0.12);
            }
            this._showMessage("SHATTER!", 0.8);
            this._hitStopTimer = 0.06;
            this._shakeIntensity = Math.max(this._shakeIntensity, 0.5);
          }

          const dmg = Math.max(1, Math.ceil(baseDmg * dmgMult));
          e.hp -= dmg;
          e.hitFlash = 0.2;
          this._totalDamageDealt += dmg;

          // ── KNOCKBACK ──
          if (elemDef.knockback > 0 && dist > 0) {
            const kbForce = elemDef.knockback * (s.power ? 1.5 : 1.0);
            const kbX = (e.x - this._boatState.x);
            const kbZ = (e.z - this._boatState.z);
            const kbD = Math.hypot(kbX, kbZ) || 1;
            e.x += (kbX / kbD) * kbForce;
            e.z += (kbZ / kbD) * kbForce;
          }

          // Element-specific effects
          const slowMult = this._unlockedAbilities.has("permafrost") ? 2 : 1;
          if (elemDef.slow > 0) e.slowTimer = Math.max(e.slowTimer, elemDef.slow * slowMult);
          if (elemDef.dot > 0 && elemDef.dotDuration > 0) {
            e.dotTimer = elemDef.dotDuration;
            e.dotTickTimer = 0;
          }

          // ── IMPACT VFX (element-specific) ──
          if (s.element === "fire") {
            // Fire explosion + expanding shockwave ring
            for (let p = 0; p < 16; p++) {
              const a = (p / 16) * Math.PI * 2;
              this._spawnParticle(e.x, 0.5, e.z,
                Math.cos(a) * 5, 2 + Math.random() * 3, Math.sin(a) * 5,
                0.7, Math.random() < 0.5 ? 0xff4400 : 0xff8800, 0.1 + Math.random() * 0.08);
            }
            // Shockwave ring mesh
            this._spawnImpactRing(e.x, e.z, 0xff4400, elemDef.aoe);
            this._shakeIntensity = Math.max(this._shakeIntensity, 0.25);
          } else if (s.element === "ice") {
            // Ice crystal shards + frost ring
            for (let p = 0; p < 10; p++) {
              this._spawnParticle(s.x, e.y + 0.5, s.z,
                (Math.random() - 0.5) * 5, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 5,
                0.5, Math.random() < 0.5 ? 0xaaddff : 0x88ccff, 0.08);
            }
            if (dmgMult > 2) {
              // Shatter ring on frozen+fire combo
              this._spawnImpactRing(e.x, e.z, 0x66ccff, 6);
            }
          } else if (s.element === "lightning") {
            // Electric burst + flash
            for (let p = 0; p < 10; p++) {
              this._spawnParticle(e.x, e.y + 0.5, e.z,
                (Math.random() - 0.5) * 7, Math.random() * 5, (Math.random() - 0.5) * 7,
                0.25, Math.random() < 0.3 ? 0xffffff : 0xffffaa, 0.06);
            }
            this._hitStopTimer = 0.03;
          } else {
            // Arcane sparkle burst
            for (let p = 0; p < 10; p++) {
              const a = Math.random() * Math.PI * 2;
              const r = Math.random() * 2;
              this._spawnParticle(
                s.x + Math.cos(a) * r, e.y + 0.5, s.z + Math.sin(a) * r,
                Math.cos(a) * 3, 1.5 + Math.random() * 2, Math.sin(a) * 3,
                0.5, 0xbb88ff, 0.08);
            }
          }

          // Pyroclasm ability: +50% fire AoE
          const aoeRadius = elemDef.aoe > 0
            ? elemDef.aoe * (this._unlockedAbilities.has("pyroclasm") ? 1.5 : 1) : 0;
          // Fire AoE splash
          if (aoeRadius > 0) {
            for (const other of this._enemies) {
              if (other === e || other.dead) continue;
              const aoeD = Math.hypot(other.x - e.x, other.z - e.z);
              if (aoeD < aoeRadius) {
                const aoeDmg = Math.max(1, Math.ceil(dmg * 0.5));
                other.hp -= aoeDmg;
                other.hitFlash = 0.1;
                this._spawnDamageNumber(other.x, other.y + 2, other.z, aoeDmg, 0xff6622);
                if (elemDef.dot > 0) { other.dotTimer = elemDef.dotDuration; other.dotTickTimer = 0; }
                // AoE knockback
                if (aoeD > 0) {
                  other.x += ((other.x - e.x) / aoeD) * 2;
                  other.z += ((other.z - e.z) / aoeD) * 2;
                }
              }
            }
          }

          // Chain lightning (bonus chains if target is frozen)
          if (elemDef.chain > 0) {
            const bonusChains = (e.slowTimer > 0 ? FROZEN_LIGHTNING_CHAIN_BONUS : 0)
              + (this._unlockedAbilities.has("chain_boost") ? 2 : 0);
            this._chainLightning(e, dmg, elemDef.chain + bonusChains, s.hitEnemies);
            if (bonusChains > 0) this._showMessage("SURGE!", 0.6);
          }

          // Ricochet ability: bounce to 1 nearby enemy
          if (this._unlockedAbilities.has("ricochet") && !elemDef.pierce && elemDef.chain === 0) {
            let nearDist = 10;
            let nearE: EnemyState | null = null;
            for (const oe of this._enemies) {
              if (oe.dead || oe === e) continue;
              const od = Math.hypot(oe.x - e.x, oe.z - e.z);
              if (od < nearDist) { nearDist = od; nearE = oe; }
            }
            if (nearE) {
              const ricDmg = Math.max(1, Math.ceil(dmg * 0.5));
              nearE.hp -= ricDmg;
              nearE.hitFlash = 0.1;
              this._spawnDamageNumber(nearE.x, nearE.y + 2, nearE.z, ricDmg, elemDef.color);
              for (let p = 0; p < 3; p++) {
                this._spawnParticle(nearE.x, nearE.y + 0.5, nearE.z,
                  (Math.random() - 0.5) * 3, 1, (Math.random() - 0.5) * 3,
                  0.3, elemDef.color, 0.06);
              }
              if (nearE.hp <= 0 && !nearE.dead) this._killEnemy(nearE, ENEMY_DEFS[nearE.kind]);
            }
          }

          this._spawnDamageNumber(e.x, e.y + 2, e.z, dmg, elemDef.color);

          // Pierce: ice goes through, others are consumed
          if (elemDef.pierce) {
            s.hitEnemies.add(i);
          } else {
            this._scene?.remove(s.mesh);
            s.mesh.geometry.dispose();
            (s.mesh.material as THREE.Material).dispose();
            this._spells.splice(j, 1);
          }

          if (e.hp <= 0 && !e.dead) {
            this._killEnemy(e, def);
          }
          if (!elemDef.pierce) break;
        }
      }
    }
  }

  // ── Kill enemy helper ─────────────────────────────────────────────────

  private _killEnemy(e: EnemyState, def: EnemyDef): void {
    e.dead = true;
    e.deathTimer = 1.0;
    this._enemiesAlive--;
    this._totalKills++;

    // Combo
    this._comboCount++;
    this._comboTimer = COMBO_WINDOW + this._getUpgradeLevel("combo_window") * 0.5;
    this._comboMult = Math.min(COMBO_MAX_MULT, 1 + Math.floor(this._comboCount / 3));
    if (this._comboCount > this._peakCombo) this._peakCombo = this._comboCount;
    this._score += def.score * this._comboMult;
    this._onComboMilestone();

    // Gold drop
    // Gold drop (scales harder in late game)
    const goldMult = this._unlockedAbilities.has("gold_rush") ? 2 : 1;
    const lateGameMult = this._wave >= 20 ? 2 : 1;
    if (Math.random() < GOLD_DROP_CHANCE) {
      this._spawnGoldCoin(e.x, e.z, (GOLD_VALUE_BASE + Math.floor(this._wave)) * goldMult * lateGameMult);
    }

    // Vampiric ability
    if (this._unlockedAbilities.has("vampiric")) {
      this._vampiricKillCount++;
      if (this._vampiricKillCount >= 15) {
        this._vampiricKillCount = 0;
        const b = this._boatState;
        if (b.hp < b.maxHp) {
          b.hp++;
          this._showMessage("+1 HP (Vampiric)", 0.8);
          for (let p = 0; p < 6; p++) {
            this._spawnParticle(b.x, 1.5, b.z,
              (Math.random() - 0.5) * 2, 2, (Math.random() - 0.5) * 2,
              0.5, 0x44ff66, 0.08);
          }
        }
      }
    }

    // Boss death
    if (e.isBoss) {
      this._bossActive = false;
      this._bossEnemy = null;
      this._score += 200 * this._wave;
      // Boss kill gold bonus
      for (let g = 0; g < 5; g++) {
        this._spawnGoldCoin(
          e.x + (Math.random() - 0.5) * 4, e.z + (Math.random() - 0.5) * 4,
          Math.floor(BOSS_KILL_GOLD_BONUS / 5),
        );
      }
      this._showMessage(`BOSS SLAIN! +${200 * this._wave}`, 3);
      this._playSound("excalibur_grant");
      // Offer ability card choice
      this._offerAbilityCards();
    }

    // Wave clear bonus (boosted)
    if (this._enemiesAlive <= 0 && this._wave > 0) {
      const clearBonus = this._wave * 50;
      this._score += clearBonus;
      // Start inter-wave calm
      this._inWaveCalm = true;
      this._waveCalmTimer = WAVE_CALM_DURATION;
      if (!e.isBoss) {
        this._showMessage(`WAVE ${this._wave} CLEAR! +${clearBonus}`, 2);
      }
      this._playSound("wave_clear");
    }

    // Element-specific death effects (based on last hit element)
    const lastElem = this._currentElement;
    if (lastElem === "fire") {
      // Fire death: embers rising, ash cloud
      for (let p = 0; p < 18; p++) {
        this._spawnParticle(e.x + (Math.random() - 0.5) * 1.5, e.y + Math.random() * 2, e.z + (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 2, 2 + Math.random() * 4, (Math.random() - 0.5) * 2,
          1.0 + Math.random() * 0.5, Math.random() < 0.4 ? 0xff4400 : 0xff8800, 0.06 + Math.random() * 0.06);
      }
      // Ash cloud (dark, slow, large)
      for (let p = 0; p < 6; p++) {
        this._spawnParticle(e.x, e.y + 1, e.z,
          (Math.random() - 0.5) * 3, 0.5 + Math.random(), (Math.random() - 0.5) * 3,
          1.5, 0x332211, 0.2);
      }
    } else if (lastElem === "ice") {
      // Ice death: crystal shatter — sharp outward burst
      for (let p = 0; p < 20; p++) {
        const a = (p / 20) * Math.PI * 2;
        this._spawnParticle(e.x, e.y + 0.5, e.z,
          Math.cos(a) * 5, 1 + Math.random() * 3, Math.sin(a) * 5,
          0.6, Math.random() < 0.5 ? 0xaaddff : 0x66ccff, 0.05 + Math.random() * 0.05);
      }
      this._spawnImpactRing(e.x, e.z, 0x66ccff, 4);
    } else if (lastElem === "lightning") {
      // Lightning death: electric disintegration — rapid sparks + flash
      for (let p = 0; p < 15; p++) {
        this._spawnParticle(e.x + (Math.random() - 0.5) * 2, e.y + Math.random() * 2, e.z + (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8,
          0.2 + Math.random() * 0.2, Math.random() < 0.3 ? 0xffffff : 0xffff44, 0.04);
      }
      this._hitStopTimer = Math.max(this._hitStopTimer, 0.02);
    } else {
      // Arcane death: soul wisps spiraling upward
      for (let p = 0; p < 14; p++) {
        const a = (p / 14) * Math.PI * 2;
        this._spawnParticle(e.x, e.y + 0.5, e.z,
          Math.cos(a) * 2, 3 + Math.random() * 3, Math.sin(a) * 2,
          1.0, 0x9966ff, 0.08);
      }
    }
    // Water splash (always)
    for (let p = 0; p < 6; p++) {
      this._spawnParticle(
        e.x + (Math.random() - 0.5) * 2, 0.2, e.z + (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 3, 3 + Math.random() * 3, (Math.random() - 0.5) * 3,
        0.6, 0x88ccff, 0.07,
      );
    }
    this._playSound("enemy_death");
  }

  // ── Chain lightning ───────────────────────────────────────────────────

  private _chainLightning(source: EnemyState, baseDmg: number, bounces: number, hitSet: Set<number>): void {
    let cx = source.x, cz = source.z;
    let remaining = bounces;

    for (let b = 0; b < remaining; b++) {
      let nearest: EnemyState | null = null;
      let nearDist = 12; // chain range
      for (const e of this._enemies) {
        if (e.dead || e === source || hitSet.has(this._enemies.indexOf(e))) continue;
        const d = Math.hypot(e.x - cx, e.z - cz);
        if (d < nearDist) {
          nearDist = d;
          nearest = e;
        }
      }
      if (!nearest) break;

      const chainDmg = Math.max(1, Math.ceil(baseDmg * 0.6));
      nearest.hp -= chainDmg;
      nearest.hitFlash = 0.15;
      hitSet.add(this._enemies.indexOf(nearest));
      this._spawnDamageNumber(nearest.x, nearest.y + 2, nearest.z, chainDmg, 0xffff44);

      // Lightning arc — glowing jagged bolt between targets
      if (this._scene) {
        const boltPoints: THREE.Vector3[] = [];
        const segs = 6;
        for (let s = 0; s <= segs; s++) {
          const t = s / segs;
          boltPoints.push(new THREE.Vector3(
            cx + (nearest.x - cx) * t + (s > 0 && s < segs ? (Math.random() - 0.5) * 2 : 0),
            1.5 + (Math.random() - 0.5) * 0.5,
            cz + (nearest.z - cz) * t + (s > 0 && s < segs ? (Math.random() - 0.5) * 2 : 0),
          ));
        }
        const boltGeo = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(boltPoints), segs * 2, 0.06, 4, false,
        );
        const boltMat = new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0.9,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const boltMesh = new THREE.Mesh(boltGeo, boltMat);
        this._scene.add(boltMesh);
        // Glow tube (wider, dimmer)
        const glowGeo = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(boltPoints), segs * 2, 0.2, 4, false,
        );
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0xffff44, transparent: true, opacity: 0.3,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        this._scene.add(glowMesh);
        // Track for cleanup
        const arcGroup = new THREE.Group();
        arcGroup.add(boltMesh); arcGroup.add(glowMesh);
        this._scene.add(arcGroup);
        this._lightningStrikes.push({ x: cx, z: cz, mesh: arcGroup, life: 0.25 });
      }
      // Spark particles along arc
      for (let p = 0; p < 6; p++) {
        const t = p / 5;
        this._spawnParticle(
          cx + (nearest.x - cx) * t, 1.5, cz + (nearest.z - cz) * t,
          (Math.random() - 0.5) * 3, 1.5 + Math.random(), (Math.random() - 0.5) * 3,
          0.25, 0xffffaa, 0.05,
        );
      }

      if (nearest.hp <= 0 && !nearest.dead) {
        this._killEnemy(nearest, ENEMY_DEFS[nearest.kind]);
      }

      cx = nearest.x;
      cz = nearest.z;
    }
  }

  // ── Enemy DoT (fire) ─────────────────────────────────────────────────

  private _updateEnemyDots(dt: number): void {
    for (const e of this._enemies) {
      if (e.dead || e.dotTimer <= 0) continue;
      e.dotTimer -= dt;
      e.dotTickTimer += dt;
      if (e.dotTickTimer >= 1.0) {
        e.dotTickTimer -= 1.0;
        e.hp -= 1;
        this._spawnDamageNumber(e.x, e.y + 2, e.z, 1, 0xff6622);
        this._spawnParticle(e.x, e.y + 1, e.z, 0, 1.5, 0, 0.3, 0xff3300, 0.08);
        this._totalDamageDealt += 1;
        if (e.hp <= 0 && !e.dead) {
          this._killEnemy(e, ENEMY_DEFS[e.kind]);
        }
      }
    }
  }

  // ── Kraken slam attack ────────────────────────────────────────────────

  private _krakenSlam(e: EnemyState): void {
    const b = this._boatState;
    const dist = Math.hypot(b.x - e.x, b.z - e.z);
    if (dist < 10) {
      this._damageBoat(2);
      this._shakeIntensity = 0.6;
    }
    // Visual slam
    for (let p = 0; p < 20; p++) {
      const a = (p / 20) * Math.PI * 2;
      this._spawnParticle(
        e.x, 0.3, e.z,
        Math.cos(a) * 5, 2 + Math.random() * 3, Math.sin(a) * 5,
        0.6, 0x443355, 0.12,
      );
    }
    this._playSound("kraken_slam");
  }

  // ── Boat damage ──────────────────────────────────────────────────────────

  private _damageBoat(amount: number): void {
    const b = this._boatState;
    if (b.invulnTimer > 0 || b.dashTimer > 0) return; // dash grants i-frames
    if (b.shieldTimer > 0) {
      b.shieldTimer = 0;
      this._showMessage("SHIELD BROKEN", 1);
      this._shieldImpactFlash();
      // Shield break particles
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        this._spawnParticle(
          b.x + Math.cos(a) * 2, 1.5, b.z + Math.sin(a) * 2,
          Math.cos(a) * 6, Math.random() * 4, Math.sin(a) * 6,
          0.6, 0x4488ff, 0.1,
        );
      }
      return;
    }

    b.hp -= amount;
    b.invulnTimer = 1.0;
    this._shakeIntensity = 0.8;

    // Thorns ability: reflect 1 damage to all nearby enemies
    if (this._unlockedAbilities.has("thorns")) {
      for (const e of this._enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - b.x, e.z - b.z);
        if (d < 5) {
          e.hp -= 1;
          e.hitFlash = 0.1;
          this._spawnParticle(e.x, e.y + 1, e.z, 0, 1, 0, 0.2, 0xff4444, 0.06);
          if (e.hp <= 0 && !e.dead) this._killEnemy(e, ENEMY_DEFS[e.kind]);
        }
      }
    }

    // Damage flash particles
    for (let i = 0; i < 8; i++) {
      this._spawnParticle(
        b.x, 1, b.z,
        (Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4,
        0.5, 0xff2222, 0.12,
      );
    }

    this._playSound("player_hit");

    if (b.hp <= 0) {
      if (b.reviveAvailable) {
        b.reviveAvailable = false;
        b.hp = 2;
        b.invulnTimer = 3.0;
        this._showMessage("LAKE'S BLESSING — REVIVED!", 2);
        this._playSound("excalibur_grant");
        // Burst of healing light
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          this._spawnParticle(b.x, 1, b.z,
            Math.cos(a) * 5, 3, Math.sin(a) * 5,
            0.8, 0x44ff66, 0.12);
        }
      } else {
        this._onGameOver();
      }
    }
  }

  // ── Runes ────────────────────────────────────────────────────────────────

  private _runeSpawnTimer = 0;

  private _checkRuneSpawn(dt: number): void {
    this._runeSpawnTimer += dt;
    if (this._runeSpawnTimer >= RUNE_SPAWN_INTERVAL && this._runes.length < MAX_RUNES) {
      this._runeSpawnTimer = 0;
      this._spawnRune();
    }
  }

  private _spawnRune(): void {
    if (!this._scene) return;
    const kind = _pickRuneKind();
    const def = RUNE_DEFS[kind];

    // Spawn within reasonable distance of player
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 40;
    let x = this._boatState.x + Math.cos(angle) * dist;
    let z = this._boatState.z + Math.sin(angle) * dist;

    // Clamp to lake
    const d = Math.hypot(x, z);
    if (d > LAKE_RADIUS - 10) {
      x = (x / d) * (LAKE_RADIUS - 10);
      z = (z / d) * (LAKE_RADIUS - 10);
    }

    const group = new THREE.Group();

    // Rune crystal
    const crystalGeo = new THREE.OctahedronGeometry(0.4, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: def.color, emissive: def.emissive, emissiveIntensity: 0.6,
      roughness: 0.2, metalness: 0.5, transparent: true, opacity: 0.85,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.castShadow = true;
    group.add(crystal);

    // Glow halo
    const haloGeo = new THREE.RingGeometry(0.5, 0.8, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: def.emissive, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    group.add(halo);

    // Point light
    const light = new THREE.PointLight(def.color, 1.0, 8);
    light.position.y = 0.5;
    group.add(light);

    group.position.set(x, 0.5, z);
    this._scene.add(group);

    this._runes.push({ kind, x, z, mesh: group, collected: false, age: 0 });
  }

  private _updateRunes(dt: number): void {
    const b = this._boatState;

    for (let i = this._runes.length - 1; i >= 0; i--) {
      const r = this._runes[i];
      if (r.collected) continue;

      r.age += dt;

      // Bob and spin
      r.mesh.position.y = 0.5 + Math.sin(r.age * RUNE_BOB_FREQ) * RUNE_BOB_AMP;
      r.mesh.children[0].rotation.y += RUNE_SPIN_SPEED * dt;

      // Check collection
      const dist = Math.hypot(b.x - r.x, b.z - r.z);
      if (dist < RUNE_COLLECT_RADIUS) {
        r.collected = true;
        this._applyRune(r.kind);

        // Collection particles
        const def = RUNE_DEFS[r.kind];
        for (let p = 0; p < 10; p++) {
          this._spawnParticle(
            r.x, 1, r.z,
            (Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4,
            0.6, def.color, 0.1,
          );
        }

        this._runesCollected++;
        this._scene?.remove(r.mesh);
        this._runes.splice(i, 1);
        this._playSound("rune_collect");
        continue;
      }

      // Despawn warning: flash when < 5s remaining
      if (r.age > 25) {
        const flash = Math.sin(r.age * 8) > 0;
        r.mesh.visible = flash;
      }

      // Timeout after 30s
      if (r.age > 30) {
        this._scene?.remove(r.mesh);
        this._runes.splice(i, 1);
      }
    }
  }

  private _applyRune(kind: RuneKind): void {
    const b = this._boatState;
    const def = RUNE_DEFS[kind];

    switch (kind) {
      case "heal":
        b.hp = Math.min(b.maxHp, b.hp + 1);
        break;
      case "shield":
        b.shieldTimer = def.duration;
        break;
      case "speed":
        b.speedTimer = def.duration;
        break;
      case "power":
        b.powerTimer = def.duration;
        break;
      case "excalibur_shard":
        b.excaliburShards++;
        if (b.excaliburShards >= 5 && !this._excaliburGranted) {
          this._triggerLady();
        }
        break;
    }

    this._showMessage(def.effect, 1.5);
    this._score += 5;
  }

  // ── Lady of the Lake ─────────────────────────────────────────────────────

  private _triggerLady(): void {
    if (this._ladyActive || !this._scene) return;
    this._ladyActive = true;
    this._ladyTimer = 8; // She stays for 8 seconds

    const group = new THREE.Group();

    // Ethereal figure
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeff, emissive: 0x8888ff, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.7, depthWrite: false,
    });

    // Flowing robes
    const robGeo = new THREE.ConeGeometry(1.2, 3.0, 8);
    const robe = new THREE.Mesh(robGeo, bodyMat);
    robe.position.y = 1.5;
    group.add(robe);

    // Head
    const headGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.y = 3.3;
    group.add(head);

    // Hair
    const hairGeo = new THREE.ConeGeometry(0.5, 1.5, 6);
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0xccccff, emissive: 0x6666aa, emissiveIntensity: 0.4,
      transparent: true, opacity: 0.5, depthWrite: false,
    });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 3.0;
    hair.rotation.x = 0.2;
    group.add(hair);

    // Arms extended holding sword
    const armGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.5, 6);
    for (let a = 0; a < 2; a++) {
      const arm = new THREE.Mesh(armGeo, bodyMat);
      arm.position.set(a === 0 ? -0.5 : 0.5, 2.8, -0.8);
      arm.rotation.x = -Math.PI / 3;
      group.add(arm);
    }

    // Excalibur (golden sword)
    const swordGroup = new THREE.Group();
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xffdd44, emissive: 0xffaa22, emissiveIntensity: 1.0,
      metalness: 0.9, roughness: 0.1,
    });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.0, 0.02), bladeMat);
    blade.position.y = 1.0;
    swordGroup.add(blade);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), bladeMat);
    guard.position.y = 0;
    swordGroup.add(guard);
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x886633 }));
    hilt.position.y = -0.25;
    swordGroup.add(hilt);

    swordGroup.position.set(0, 3.5, -1.2);
    swordGroup.rotation.x = -0.5;
    group.add(swordGroup);

    // Radiant light
    const light = new THREE.PointLight(0xaaaaff, 4.0, 25);
    light.position.y = 3;
    group.add(light);

    // Place in front of player
    const b = this._boatState;
    const angle = this._boatState.angle;
    group.position.set(
      b.x + Math.sin(angle) * 8,
      -1, // rises from water
      b.z - Math.cos(angle) * 8,
    );

    this._ladyMesh = group;
    this._scene.add(group);
    this._showMessage("THE LADY OF THE LAKE RISES", 3);
  }

  private _updateLady(dt: number): void {
    if (!this._ladyActive || !this._ladyMesh) return;

    this._ladyTimer -= dt;

    // Rise from water
    if (this._ladyMesh.position.y < 0) {
      this._ladyMesh.position.y += dt * 1.5;
    }

    // Gentle sway
    this._ladyMesh.rotation.y = Math.sin(this._waterTime * 0.5) * 0.1;

    // Water ripple particles around her
    if (Math.random() < 0.2) {
      this._spawnParticle(
        this._ladyMesh.position.x + (Math.random() - 0.5) * 3,
        0.2,
        this._ladyMesh.position.z + (Math.random() - 0.5) * 3,
        0, 1 + Math.random(), 0,
        0.8, 0xaabbff, 0.06,
      );
    }

    // Check if player is close enough to receive Excalibur
    const b = this._boatState;
    const dist = Math.hypot(b.x - this._ladyMesh.position.x, b.z - this._ladyMesh.position.z);
    if (dist < 6 && !this._excaliburGranted) {
      this._excaliburGranted = true;
      b.maxHp += 3;
      b.hp = b.maxHp;
      this._score += 500;
      this._showMessage("EXCALIBUR GRANTED!\n+3 Max HP · 2x Spell Power · Rapid Fire", 4);
      this._hitStopTimer = 0.12; // dramatic pause
      this._shakeIntensity = 1.0;
      if (this._bloomPass) this._bloomPass.strength = 1.2;
      // Fade bloom back after 2 seconds (gradual)
      setTimeout(() => { if (this._bloomPass) this._bloomPass.strength = 0.7; }, 2000);

      // Massive burst
      for (let p = 0; p < 40; p++) {
        const a = (p / 40) * Math.PI * 2;
        this._spawnParticle(
          this._ladyMesh.position.x, 2, this._ladyMesh.position.z,
          Math.cos(a) * 6, 3 + Math.random() * 4, Math.sin(a) * 6,
          1.2, 0xffdd44, 0.15,
        );
      }

      this._playSound("excalibur_grant");
    }

    // Lady disappears
    if (this._ladyTimer <= 0) {
      this._ladyMesh.position.y -= dt * 2;
      if (this._ladyMesh.position.y < -4) {
        this._scene?.remove(this._ladyMesh);
        this._ladyMesh = null;
        this._ladyActive = false;
      }
    }
  }

  // ── Particles ────────────────────────────────────────────────────────────

  private _spawnParticle(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, color: number, size: number): void {
    if (!this._scene || this._particles.length > 500) return;
    const geo = new THREE.SphereGeometry(size, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.9, depthWrite: false,
      blending: THREE.AdditiveBlending, // glow effect
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this._scene.add(mesh);
    this._particles.push({ mesh, x, y, z, vx, vy, vz, life, maxLife: life });
  }

  private _updateParticles(dt: number): void {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.life -= dt;
      p.vy -= 5 * dt; // gravity
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, p.y, p.z);

      const t = Math.max(0, p.life / p.maxLife);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = t * 0.9;
      // Scale down as particle fades
      p.mesh.scale.setScalar(0.5 + t * 0.5);

      if (p.life <= 0 || p.y < -2) {
        this._scene?.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this._particles.splice(i, 1);
      }
    }
  }

  // ── Camera ───────────────────────────────────────────────────────────────

  private _updateCamera(dt: number): void {
    if (!this._camera) return;
    const b = this._boatState;

    // Dynamic zoom: pull back when enemies are close, push in when calm
    const nearestEnemy = this._enemies.reduce((min, e) => {
      if (e.dead) return min;
      const d = Math.hypot(e.x - b.x, e.z - b.z);
      return d < min ? d : min;
    }, 999);
    const combatZoom = nearestEnemy < 15 ? 1.1 : nearestEnemy < 30 ? 1.0 : 0.9;
    const bossZoom = this._bossActive ? 1.2 : 1.0;
    const zoomFactor = combatZoom * bossZoom;

    // Speed zoom: FOV increases with boat speed
    const speed = Math.hypot(b.vx, b.vz);
    const speedFov = 55 + speed * 0.3 + (b.dashTimer > 0 ? 8 : 0);
    this._camera.fov += (speedFov - this._camera.fov) * dt * 3;
    this._camera.updateProjectionMatrix();

    const targetX = b.x - Math.sin(b.angle) * CAMERA_DIST * 0.3;
    const targetZ = b.z + Math.cos(b.angle) * CAMERA_DIST * 0.3 + CAMERA_DIST * 0.7;
    const targetY = CAMERA_HEIGHT * zoomFactor;

    const lerp = 1 - Math.exp(-CAMERA_LERP * dt);
    this._camera.position.x += (targetX - this._camera.position.x) * lerp;
    this._camera.position.y += (targetY - this._camera.position.y) * lerp;
    this._camera.position.z += (targetZ - this._camera.position.z) * lerp;

    // Screen shake
    if (this._shakeIntensity > 0.01) {
      this._camera.position.x += (Math.random() - 0.5) * this._shakeIntensity;
      this._camera.position.y += (Math.random() - 0.5) * this._shakeIntensity * 0.5;
      this._shakeIntensity *= Math.exp(-this._shakeDecay * dt);
    }

    this._camera.lookAt(b.x, 1, b.z);
  }

  // ── Game Over / Restart ──────────────────────────────────────────────────

  private _onGameOver(): void {
    this._gameOver = true;
    this._shakeIntensity = 1.5;
    const isNew = this._score > this._highScore;
    if (isNew) {
      this._highScore = this._score;
      try { localStorage.setItem("avalon_hi", String(this._highScore)); } catch { /* */ }
    }
    this._playSound("game_over");

    // Build rich game over overlay
    if (this._msgEl) {
      const newHi = isNew ? `<div style="color:#ffdd44;font-size:20px;margin:6px 0;">NEW HIGH SCORE!</div>` : "";
      this._msgEl.innerHTML = `
        <div style="font-size:42px;margin-bottom:12px;">LOST TO THE LAKE</div>
        ${newHi}
        <div style="font-size:18px;line-height:1.8;opacity:0.85;">
          Wave ${this._wave} · Score ${this._score} · Best ${this._highScore}<br>
          Kills: ${this._totalKills} · Damage: ${this._totalDamageDealt}<br>
          Runes: ${this._runesCollected} · Peak Combo: ${this._peakCombo}x<br>
          Gold earned: <span style="color:#ffcc00">${this._runGold}g</span> (Total: ${this._gold}g)<br>
          Time: ${this._gameTime.toFixed(0)}s${this._excaliburGranted ? " · Excalibur Wielder" : ""}
        </div>
        <div style="font-size:16px;margin-top:16px;opacity:0.6;">[Space] Retry · [Esc] Exit</div>
      `;
      this._msgEl.style.opacity = "1";
      this._msgTimer = 999;
    }
  }

  // ── Title Screen ──────────────────────────────────────────────────────

  private _showTitleScreen(): void {
    this._titleActive = true;
    this._titleEl = document.createElement("div");
    this._titleEl.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      z-index: 25; pointer-events: all;
      background: radial-gradient(ellipse at center, rgba(5,15,30,0.3) 0%, rgba(5,10,21,0.85) 70%);
      font-family: 'Segoe UI', Arial, sans-serif; color: #cceeff;
    `;
    this._titleEl.innerHTML = `
      <div style="font-size:56px; font-weight:bold; text-shadow: 0 0 30px #44aaff, 0 0 60px #2266cc; margin-bottom:8px; letter-spacing:4px;">
        LAKE OF AVALON
      </div>
      <div style="font-size:16px; opacity:0.6; margin-bottom:32px; max-width:500px; text-align:center; line-height:1.6;">
        The legendary lake stirs with ancient fury. Creatures of the deep rise against those who seek Excalibur.
        Pilot your enchanted skiff, master the four elements, and survive the lake's wrath.
      </div>
      <div style="font-size:14px; opacity:0.8; margin-bottom:24px; line-height:2.0; text-align:left; background: rgba(0,0,0,0.3); padding: 16px 24px; border-radius: 8px; border: 1px solid rgba(68,136,255,0.2);">
        <span style="color:#88ccee">WASD</span> Steer &nbsp;&nbsp;
        <span style="color:#88ccee">Mouse</span> Aim &nbsp;&nbsp;
        <span style="color:#88ccee">LMB</span> Cast Spell<br>
        <span style="color:#88ccee">RMB</span> Frost Nova &nbsp;&nbsp;
        <span style="color:#88ccee">Space</span> Dash &nbsp;&nbsp;
        <span style="color:#88ccee">1-4</span> Switch Element<br>
        <span style="color:#9966ff">1 Arcane</span> (homing) &nbsp;
        <span style="color:#ff6622">2 Fire</span> (AoE + burn) &nbsp;
        <span style="color:#66ccff">3 Ice</span> (pierce + slow) &nbsp;
        <span style="color:#ffff44">4 Lightning</span> (chain)<br>
        <span style="color:#88ccee">Tab</span> Shop &nbsp;&nbsp;
        <span style="color:#88ccee">Esc</span> Pause
      </div>
      <div style="font-size:14px; opacity:0.5; margin-bottom:8px;">
        Best: ${this._highScore} | Gold: <span style="color:#ffcc00">${this._gold}g</span>
      </div>
      <div style="font-size:22px; margin-top:16px; animation: pulse 1.5s ease-in-out infinite; cursor:pointer;">
        Click anywhere to begin
      </div>
      <style>@keyframes pulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }</style>
    `;
    document.body.appendChild(this._titleEl);

    this._titleEl.addEventListener("click", () => this._dismissTitle());
  }

  // ── Crosshair tracking ─────────────────────────────────────────────────

  private _updateCrosshair(): void {
    if (!this._crosshairEl) return;
    this._crosshairEl.style.left = `${this._mouseX}px`;
    this._crosshairEl.style.top = `${this._mouseY}px`;
    // Color matches current element
    const elemDef = SPELL_ELEMENTS[this._currentElement];
    const hex = "#" + elemDef.color.toString(16).padStart(6, "0");
    this._crosshairEl.style.borderColor = hex.replace(/(..)$/, "$180");
    (this._crosshairEl.firstChild as HTMLElement).style.background = hex;
  }

  // ── Aurora animation ──────────────────────────────────────────────────

  private _updateAuroraAnimation(_dt: number): void {
    if (!this._auroraGroup) return;
    const isTitleView = this._titleActive;
    this._auroraGroup.children.forEach((child, i) => {
      child.position.y = 50 + i * 3 + Math.sin(this._waterTime * 0.2 + i * 1.5) * 2;
      if (child instanceof THREE.Mesh) {
        const baseOp = isTitleView ? 0.08 : 0.04;
        const amp = isTitleView ? 0.04 : 0.025;
        (child.material as THREE.MeshBasicMaterial).opacity =
          baseOp + Math.sin(this._waterTime * 0.3 + i * 0.8) * amp;
      }
    });

    // Star twinkling — per-vertex size via aSize attribute
    if (this._starPoints && this._starPhases.length > 0) {
      const geo = this._starPoints.geometry;
      const sizeAttr = geo.getAttribute("aSize") as THREE.BufferAttribute;
      if (sizeAttr) {
        for (let i = 0; i < Math.min(this._starPhases.length, sizeAttr.count); i++) {
          const base = this._starSizeAttr[i] || 0.4;
          const twinkle = Math.sin(this._waterTime * (1.5 + (i % 7) * 0.3) + this._starPhases[i]);
          sizeAttr.setX(i, base * (0.5 + twinkle * 0.5));
        }
        sizeAttr.needsUpdate = true;
      }
    }
  }

  private _dismissTitle(): void {
    if (!this._titleActive) return;
    if (this._titleEl && this._titleEl.parentNode) {
      this._titleEl.parentNode.removeChild(this._titleEl);
    }
    this._titleEl = null;
    this._titleActive = false;
    this._showMessage("LAKE OF AVALON", 2);
  }

  // ── Element Visuals (staff orb + aura) ────────────────────────────────

  private _updateElementVisuals(): void {
    const elemDef = SPELL_ELEMENTS[this._currentElement];
    // Staff orb glow
    if (this._staffOrb) {
      (this._staffOrb.material as THREE.MeshBasicMaterial).color.setHex(elemDef.color);
      // Pulse the orb
      const pulse = 0.12 + Math.sin(this._waterTime * 4) * 0.03;
      this._staffOrb.scale.setScalar(pulse / 0.12);
    }
    if (this._staffOrbLight) {
      this._staffOrbLight.color.setHex(elemDef.color);
    }
    // Element aura ring
    if (this._elementAura) {
      (this._elementAura.material as THREE.MeshBasicMaterial).color.setHex(elemDef.color);
      this._elementAura.rotation.y += 0.02;
      (this._elementAura.material as THREE.MeshBasicMaterial).opacity =
        0.1 + Math.sin(this._waterTime * 3) * 0.05;
    }
  }

  // ── Knight Shield Visual ──────────────────────────────────────────────

  private _updateKnightShieldVisuals(): void {
    for (const e of this._enemies) {
      if (e.dead || e.kind !== "drowned_knight") continue;
      // Find shield mesh (4th child added to drowned knight group)
      const shieldChild = e.mesh.children.find(
        (c) => c instanceof THREE.Mesh && c.position.x < -0.3 && c.position.y > 1,
      );
      if (shieldChild && shieldChild instanceof THREE.Mesh) {
        const mat = shieldChild.material as THREE.MeshStandardMaterial;
        if (e.blockTimer > 0) {
          mat.emissive.setHex(0x4488ff);
          mat.emissiveIntensity = 0.8 + Math.sin(this._waterTime * 6) * 0.3;
        } else {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      }
    }
  }

  // ── Drowned King Boss Phases ──────────────────────────────────────────

  private _updateDrownedKingBoss(dt: number): void {
    if (!this._bossActive || !this._bossEnemy || this._bossEnemy.dead) return;
    const boss = this._bossEnemy;
    const b = this._boatState;
    const dist = Math.hypot(b.x - boss.x, b.z - boss.z);

    // Phase transitions based on HP %
    const hpPct = boss.hp / boss.maxHp;
    const newPhase = hpPct > 0.66 ? 0 : hpPct > 0.33 ? 1 : 2;
    if (newPhase > boss.bossPhase) {
      boss.bossPhase = newPhase;
      this._shakeIntensity = 0.8;
      const phaseNames = ["", "THE KING RAGES!", "FINAL FURY — THE LAKE TREMBLES!"];
      this._showMessage(phaseNames[newPhase], 3);
      this._playSound("storm_start");
      // Bloom intensifies per phase
      if (this._bloomPass) this._bloomPass.strength = 0.7 + newPhase * 0.15;
    }

    boss.specialTimer -= dt;
    if (boss.specialTimer > 0) return;

    // Phase-dependent attacks
    if (boss.bossPhase === 0) {
      // Phase 1: AoE water slam every 4s
      if (dist < 20) {
        boss.specialTimer = 4;
        this._kingSlam(boss);
      }
    } else if (boss.bossPhase === 1) {
      // Phase 2: Charge attack + summon 3 wisps
      boss.specialTimer = 3.5;
      if (dist > 8) {
        this._kingCharge(boss);
      } else {
        this._kingSlam(boss);
      }
      // Summon minions
      for (let i = 0; i < 3; i++) this._spawnEnemy("wisp");
      this._showMessage("THE KING SUMMONS HIS COURT!", 1.5);
    } else {
      // Phase 3: Rapid slams + summons + whirlpool burst
      boss.specialTimer = 2.5;
      this._kingSlam(boss);
      if (Math.random() < 0.5) {
        for (let i = 0; i < 2; i++) this._spawnEnemy("drowned_knight");
      }
    }
  }

  // Deferred slam actions (game-time based, respects pause)
  private _pendingSlams: { timer: number; bossX: number; bossZ: number; range: number; phase: number }[] = [];

  private _kingSlam(boss: EnemyState): void {
    const range = 15 + boss.bossPhase * 3;

    // Telegraph warning circle (appears before damage)
    this._spawnTelegraphCircle(boss.x, boss.z, range, 0.8);

    // Queue deferred slam (0.8s game-time, not real-time)
    this._pendingSlams.push({
      timer: 0.8,
      bossX: boss.x, bossZ: boss.z,
      range,
      phase: boss.bossPhase,
    });
  }

  private _updatePendingSlams(dt: number): void {
    for (let i = this._pendingSlams.length - 1; i >= 0; i--) {
      const s = this._pendingSlams[i];
      s.timer -= dt;
      if (s.timer <= 0) {
        this._pendingSlams.splice(i, 1);
        if (!this._bossActive) continue;

        const b = this._boatState;
        const dist = Math.hypot(b.x - s.bossX, b.z - s.bossZ);
        if (dist < s.range) {
          this._damageBoat(2 + s.phase);
        }
        this._shakeIntensity = 1.2;

        for (let p = 0; p < 40; p++) {
          const a = (p / 40) * Math.PI * 2;
          const r = s.range * (0.3 + Math.random() * 0.7);
          this._spawnParticle(
            s.bossX + Math.cos(a) * r, 0.3, s.bossZ + Math.sin(a) * r,
            Math.cos(a) * 7, 4 + Math.random() * 5, Math.sin(a) * 7,
            0.9, Math.random() < 0.5 ? 0x00ff44 : 0x22aa44, 0.1 + Math.random() * 0.06,
          );
        }
        this._spawnImpactRing(s.bossX, s.bossZ, 0x00ff44, s.range);
        this._playSound("kraken_slam");
      }
    }
  }

  private _kingCharge(boss: EnemyState): void {
    const b = this._boatState;
    const dx = b.x - boss.x;
    const dz = b.z - boss.z;
    const dist = Math.hypot(dx, dz) || 1;
    // Lunge toward player
    boss.x += (dx / dist) * 12;
    boss.z += (dz / dist) * 12;
    boss.mesh.position.set(boss.x, boss.y, boss.z);
    // Charge trail
    for (let p = 0; p < 15; p++) {
      this._spawnParticle(
        boss.x - (dx / dist) * p * 0.8, 1, boss.z - (dz / dist) * p * 0.8,
        (Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2,
        0.5, 0x224444, 0.1,
      );
    }
    this._shakeIntensity = 0.6;
    this._playSound("kraken_slam");
    // Check if charge hits player
    const newDist = Math.hypot(b.x - boss.x, b.z - boss.z);
    if (newDist < 5) this._damageBoat(3);
  }

  // ── Combo Visual Feedback ─────────────────────────────────────────────

  private _onComboMilestone(): void {
    if (this._comboCount === 5) { this._showMessage("COMBO x5!", 0.8); this._shakeIntensity = 0.15; }
    if (this._comboCount === 10) { this._showMessage("RAMPAGE!", 1); this._shakeIntensity = 0.25; this._playSound("wave_clear"); }
    if (this._comboCount === 20) { this._showMessage("GODLIKE!", 1.2); this._shakeIntensity = 0.4; this._playSound("excalibur_grant"); }
  }

  // ── Ability Card Choice (3-pick from boss kills) ───────────────────────

  private _offerAbilityCards(): void {
    // Pick 3 random abilities the player hasn't unlocked yet
    const available = ABILITY_POOL.filter(a => !this._unlockedAbilities.has(a.id));
    if (available.length === 0) return;
    const shuffled = available.sort(() => Math.random() - 0.5);
    const choices = shuffled.slice(0, Math.min(3, shuffled.length));

    this._abilityPickActive = true;
    this._paused = true;

    this._abilityCardEl = document.createElement("div");
    this._abilityCardEl.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      display: flex; gap: 16px; z-index: 30; pointer-events: all;
      font-family: 'Segoe UI', Arial, sans-serif;
    `;

    for (const card of choices) {
      const hex = "#" + card.color.toString(16).padStart(6, "0");
      const cardEl = document.createElement("div");
      cardEl.style.cssText = `
        background: rgba(5, 10, 21, 0.95); border: 2px solid ${hex}40;
        border-radius: 12px; padding: 20px 16px; width: 180px; text-align: center;
        color: #cceeff; cursor: pointer; transition: transform 0.15s, border-color 0.15s;
      `;
      cardEl.innerHTML = `
        <div style="font-size: 28px; margin-bottom: 8px; color: ${hex}; text-shadow: 0 0 12px ${hex};">&#9733;</div>
        <div style="font-size: 16px; font-weight: bold; color: ${hex}; margin-bottom: 6px;">${card.name}</div>
        <div style="font-size: 12px; opacity: 0.8; line-height: 1.4;">${card.desc}</div>
      `;
      cardEl.addEventListener("mouseenter", () => { cardEl.style.transform = "scale(1.08)"; cardEl.style.borderColor = hex; });
      cardEl.addEventListener("mouseleave", () => { cardEl.style.transform = "scale(1)"; cardEl.style.borderColor = hex + "40"; });
      cardEl.addEventListener("click", () => {
        this._unlockedAbilities.add(card.id);
        this._applyAbility(card.id);
        this._showMessage(`UNLOCKED: ${card.name}`, 2);
        this._playSound("rune_collect");
        this._closeAbilityCards();
      });
      this._abilityCardEl.appendChild(cardEl);
    }

    // Title
    const title = document.createElement("div");
    title.style.cssText = `
      position: fixed; top: 30%; left: 50%; transform: translateX(-50%);
      color: #ffdd44; font-size: 24px; font-weight: bold; z-index: 30; pointer-events: none;
      text-shadow: 0 0 20px #ffaa22; font-family: 'Segoe UI', Arial, sans-serif;
    `;
    title.textContent = "CHOOSE AN ABILITY";
    title.id = "ability-title";
    document.body.appendChild(title);
    document.body.appendChild(this._abilityCardEl);
  }

  private _closeAbilityCards(): void {
    if (this._abilityCardEl && this._abilityCardEl.parentNode) {
      this._abilityCardEl.parentNode.removeChild(this._abilityCardEl);
    }
    this._abilityCardEl = null;
    const title = document.getElementById("ability-title");
    if (title && title.parentNode) title.parentNode.removeChild(title);
    this._abilityPickActive = false;
    this._paused = false;
  }

  private _applyAbility(id: string): void {
    // Some abilities modify existing constants/behavior via flags
    // Others are checked at cast-time / hit-time via _unlockedAbilities.has()
    switch (id) {
      case "swift_cast": {
        // Reduce all element cooldowns by 20% (permanent for this run)
        for (const key of Object.keys(SPELL_ELEMENTS) as SpellElement[]) {
          (SPELL_ELEMENTS[key] as any).cooldown *= 0.8;
        }
        break;
      }
      case "giant_nova": {
        // Increase frost nova radius (store as a multiplier)
        // Checked in _castFrostNova
        break;
      }
      // Most abilities are checked dynamically via this._unlockedAbilities.has(id)
    }
  }

  // ── Island Sanctuaries ────────────────────────────────────────────────

  private _updateSanctuary(dt: number): void {
    const b = this._boatState;

    // Check if player is on an island
    let onIsland = false;
    for (const isl of this._islands) {
      const dist = Math.hypot(b.x - isl.x, b.z - isl.z);
      if (dist < isl.radius + SANCTUARY_RADIUS) {
        onIsland = true;
        break;
      }
    }

    if (onIsland && !this._inSanctuary) {
      this._inSanctuary = true;
      this._sanctuaryTimer = SANCTUARY_DURATION;
      this._showMessage("SANCTUARY — enemies slowed", 1.5);
      // Apply slow to all enemies
      for (const e of this._enemies) {
        if (!e.dead) e.slowTimer = Math.max(e.slowTimer, 3);
      }
    }

    if (this._inSanctuary) {
      this._sanctuaryTimer -= dt;
      // Spawn calming particles
      if (Math.random() < 0.15) {
        this._spawnParticle(
          b.x + (Math.random() - 0.5) * 4, 0.5, b.z + (Math.random() - 0.5) * 4,
          0, 1 + Math.random(), 0,
          0.8, 0x44ff88, 0.06,
        );
      }
      if (this._sanctuaryTimer <= 0 || !onIsland) {
        this._inSanctuary = false;
      }
    }
  }

  // ── Impact Ring (expanding shockwave) ──────────────────────────────────

  private _impactRings: { mesh: THREE.Mesh; life: number; maxLife: number; maxR: number }[] = [];

  private _spawnImpactRing(x: number, z: number, color: number, maxRadius: number): void {
    if (!this._scene) return;
    const ringGeo = new THREE.TorusGeometry(0.5, 0.15, 4, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, 0.3, z);
    this._scene.add(ring);
    this._impactRings.push({ mesh: ring, life: 0.5, maxLife: 0.5, maxR: maxRadius });
  }

  private _updateImpactRings(dt: number): void {
    for (let i = this._impactRings.length - 1; i >= 0; i--) {
      const r = this._impactRings[i];
      r.life -= dt;
      const t = 1 - Math.max(0, r.life / r.maxLife);
      r.mesh.scale.setScalar(0.5 + t * r.maxR);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - t);
      if (r.life <= 0) {
        this._scene?.remove(r.mesh);
        r.mesh.geometry.dispose();
        (r.mesh.material as THREE.Material).dispose();
        this._impactRings.splice(i, 1);
      }
    }
  }

  // ── Shield Impact Flash ───────────────────────────────────────────────

  private _shieldImpactFlash(): void {
    if (!this._shieldMesh || !this._scene) return;
    // Bright flash on shield
    const flashGeo = new THREE.SphereGeometry(3, 12, 8);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.copy(this._boatGroup!.position);
    flash.position.y += 1;
    this._scene.add(flash);
    this._lightningStrikes.push({ x: flash.position.x, z: flash.position.z, mesh: flash as any, life: 0.3 });

    // Expanding shield ripple ring
    this._spawnImpactRing(this._boatState.x, this._boatState.z, 0x4488ff, 4);
  }

  // ── Boss Slam Telegraph ───────────────────────────────────────────────

  private _telegraphs: { ring: THREE.Mesh; fill: THREE.Mesh; life: number; maxLife: number }[] = [];

  private _spawnTelegraphCircle(x: number, z: number, radius: number, duration: number): void {
    if (!this._scene) return;
    const ringGeo = new THREE.RingGeometry(radius - 0.3, radius, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff2222, transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, 0.2, z);
    this._scene.add(ring);

    const fillGeo = new THREE.CircleGeometry(radius, 32);
    fillGeo.rotateX(-Math.PI / 2);
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xff0000, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
    });
    const fill = new THREE.Mesh(fillGeo, fillMat);
    fill.position.set(x, 0.15, z);
    this._scene.add(fill);

    this._telegraphs.push({ ring, fill, life: duration, maxLife: duration });
  }

  private _updateTelegraphs(dt: number): void {
    for (let i = this._telegraphs.length - 1; i >= 0; i--) {
      const tg = this._telegraphs[i];
      tg.life -= dt;
      const t = 1 - Math.max(0, tg.life / tg.maxLife);
      const elapsed = (tg.maxLife - tg.life);
      (tg.ring.material as THREE.MeshBasicMaterial).opacity = 0.4 * t + Math.sin(elapsed * 12) * 0.1 * t;
      (tg.fill.material as THREE.MeshBasicMaterial).opacity = 0.06 * t;
      if (tg.life <= 0) {
        this._scene?.remove(tg.ring); this._scene?.remove(tg.fill);
        tg.ring.geometry.dispose(); (tg.ring.material as THREE.Material).dispose();
        tg.fill.geometry.dispose(); (tg.fill.material as THREE.Material).dispose();
        this._telegraphs.splice(i, 1);
      }
    }
  }

  // ── Whirlpool Suction Particles ───────────────────────────────────────

  private _whirlpoolParticleTimer = 0;

  private _updateWhirlpoolParticles(dt: number): void {
    this._whirlpoolParticleTimer += dt;
    if (this._whirlpoolParticleTimer < 0.15) return;
    this._whirlpoolParticleTimer = 0;

    for (const w of this._whirlpools) {
      // Spawn particles spiraling inward
      const angle = w.phase * 3 + Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 10;
      const px = w.x + Math.cos(angle) * dist;
      const pz = w.z + Math.sin(angle) * dist;
      // Velocity spirals inward
      const toCx = w.x - px;
      const toCz = w.z - pz;
      const td = Math.hypot(toCx, toCz) || 1;
      this._spawnParticle(
        px, 0.15, pz,
        (toCx / td) * 3 + (-toCz / td) * 2, 0.2, (toCz / td) * 3 + (toCx / td) * 2,
        1.0, 0x2288aa, 0.05,
      );
    }
  }

  // ── Enemy Attack Windups ──────────────────────────────────────────────

  private _updateEnemyWindups(_dt: number): void {
    for (const e of this._enemies) {
      if (e.dead || e.emergeTimer > 0) continue;
      const def = ENEMY_DEFS[e.kind];
      const b = this._boatState;
      const dist = Math.hypot(b.x - e.x, b.z - e.z);

      // Knight: shield glows brighter as block is about to activate
      // (already handled in _updateKnightShieldVisuals)

      // Kraken: pulse red before slam
      if (e.kind === "kraken_arm" && e.specialTimer < 1.0 && e.specialTimer > 0 && dist < 10) {
        e.mesh.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissiveIntensity = 0.5 + Math.sin(this._waterTime * 12) * 0.3;
            child.material.emissive.setHex(0xff2222);
          }
        });
      }

      // Witch: charge glow before firing
      if (e.kind === "sea_witch" && e.attackTimer < 0.8 && dist < def.attackRange) {
        // Glow the staff orb brighter
        for (let p = 0; p < 1; p++) {
          this._spawnParticle(e.x + 0.4, e.y + 3, e.z - 0.6,
            (Math.random() - 0.5), Math.random() * 0.5, (Math.random() - 0.5),
            0.2, 0xff44ff, 0.06);
        }
      }

      // Phantom ship: glow cannons before broadside
      if (e.kind === "phantom_ship" && e.attackTimer < 1.0 && dist < def.attackRange) {
        e.mesh.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.PointLight) {
            child.intensity = 1.5 + Math.sin(this._waterTime * 10) * 0.8;
          }
        });
      }
    }
  }

  // ── Sea Witch ranged attack ────────────────────────────────────────────

  private _witchProjectile(e: EnemyState): void {
    if (!this._scene) return;
    const b = this._boatState;
    const dx = b.x - e.x;
    const dz = b.z - e.z;
    const dist = Math.hypot(dx, dz) || 1;

    // Spawn a spectral bolt toward player
    const boltGeo = new THREE.SphereGeometry(0.2, 6, 6);
    const boltMat = new THREE.MeshBasicMaterial({ color: 0xff44ff });
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.set(e.x, 2, e.z);
    const light = new THREE.PointLight(0xff44ff, 1, 6);
    bolt.add(light);
    this._scene.add(bolt);

    // Use spells array to track enemy projectiles (treat as non-damaging to enemies)
    this._spells.push({
      x: e.x, z: e.z,
      dx: (dx / dist) * 20, dz: (dz / dist) * 20,
      life: 2.0, mesh: bolt, power: false,
      element: "arcane", hitEnemies: new Set([-1]), // -1 marks as enemy projectile
    });
    this._playSound("spell_cast");
  }

  // ── Phantom Ship broadside ────────────────────────────────────────────

  private _shipBroadside(e: EnemyState): void {
    if (!this._scene) return;
    const b = this._boatState;

    // Fire 3 ghostly cannonballs in a spread
    for (let i = -1; i <= 1; i++) {
      const dx = b.x - e.x;
      const dz = b.z - e.z;
      const baseAngle = Math.atan2(dx, -dz) + i * 0.3;
      const sdx = Math.sin(baseAngle) * 18;
      const sdz = -Math.cos(baseAngle) * 18;

      const ballGeo = new THREE.SphereGeometry(0.25, 6, 6);
      const ballMat = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.7 });
      const ball = new THREE.Mesh(ballGeo, ballMat);
      ball.position.set(e.x, 1.5, e.z);
      const light = new THREE.PointLight(0x44aaff, 0.8, 5);
      ball.add(light);
      this._scene.add(ball);

      this._spells.push({
        x: e.x, z: e.z,
        dx: sdx, dz: sdz,
        life: 2.5, mesh: ball, power: false,
        element: "arcane", hitEnemies: new Set([-1]),
      });
    }
    this._playSound("lightning");
    this._shakeIntensity = Math.max(this._shakeIntensity, 0.15);
  }

  // ── Wave Narrative Events ─────────────────────────────────────────────

  private _checkNarrative(): void {
    const w = this._wave;
    if (this._narrativeShown.has(w)) return;

    const narratives: Record<number, string> = {
      5: "The lake DARKENS... something ancient stirs below.",
      10: "THE DEEP ONES AWAKEN — Sea witches emerge from the mist!",
      15: "The water BOILS! A LEVIATHAN breaches the surface!",
      20: "PHANTOM SHIPS materialize from the fog — the lake's fallen fleet!",
      25: "THE DROWNED KING RISES — ruler of all that rots beneath the waves!",
      30: "The lake SCREAMS. Reality bends. You have angered forces beyond mortal ken.",
      40: "You stand where none have stood. The abyss gazes back.",
      50: "IMMORTAL. The lake bows to your will. You are the new sovereign of Avalon.",
    };

    const text = narratives[w];
    if (text) {
      this._narrativeShown.add(w);
      this._showMessage(text, 4);
      // Dramatic atmosphere change at milestones
      if (w >= 25 && this._scene) {
        this._scene.fog = new THREE.FogExp2(0x080005, 0.014);
        this._scene.background = new THREE.Color(0x080005);
        if (this._bloomPass) this._bloomPass.strength = 0.9;
      }
      if (w >= 15) this._shakeIntensity = 0.4;
    }
  }

  // ── Drowned King Boss (wave 25) ───────────────────────────────────────

  private _spawnDrownedKing(): void {
    if (!this._scene) return;
    this._bossActive = true;

    const group = new THREE.Group();
    const kingMat = new THREE.MeshStandardMaterial({
      color: 0x224444, emissive: 0x114433, emissiveIntensity: 0.6,
      metalness: 0.7, roughness: 0.3,
    });

    // Massive armored body
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 1.5), kingMat);
    torso.position.y = 2;
    torso.castShadow = true;
    group.add(torso);

    // Crown
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xddaa22, emissive: 0xaa8800, emissiveIntensity: 0.8,
      metalness: 0.9, roughness: 0.1,
    });
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 4), crownMat);
      const a = (i / 6) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.5, 4.3, Math.sin(a) * 0.5);
      group.add(spike);
    }

    // Helmet
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), kingMat);
    helm.position.y = 3.8;
    group.add(helm);

    // Glowing eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
    for (let i = 0; i < 2; i++) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), eyeMat);
      eye.position.set(i === 0 ? -0.2 : 0.2, 3.9, -0.5);
      group.add(eye);
    }

    // Giant sword
    const swordMat = new THREE.MeshStandardMaterial({
      color: 0x556666, emissive: 0x224444, emissiveIntensity: 0.5,
      metalness: 0.9, roughness: 0.2,
    });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4, 0.06), swordMat);
    blade.position.set(1.5, 2.5, -0.5);
    blade.rotation.z = -0.3;
    group.add(blade);

    // Aura rings
    for (let r = 0; r < 3; r++) {
      const auraGeo = new THREE.TorusGeometry(3 + r, 0.08, 4, 20);
      auraGeo.rotateX(-Math.PI / 2);
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0x00ff44, transparent: true, opacity: 0.3 - r * 0.08, depthWrite: false,
      });
      const aura = new THREE.Mesh(auraGeo, auraMat);
      aura.position.y = 0.5 + r * 0.3;
      group.add(aura);
    }

    // Massive light
    const light = new THREE.PointLight(0x00ff44, 4, 30);
    light.position.y = 3;
    group.add(light);

    // Place far from player
    const b = this._boatState;
    const angle = Math.random() * Math.PI * 2;
    group.position.set(b.x + Math.cos(angle) * 40, -5, b.z + Math.sin(angle) * 40);
    this._scene.add(group);

    const bossHp = 80 + this._wave * 5;
    this._enemies.push({
      kind: "kraken_arm", // reuse kind for base stats, override everything
      x: group.position.x, z: group.position.z, y: -5,
      hp: bossHp, maxHp: bossHp,
      attackTimer: 3,
      dead: false, deathTimer: 0, mesh: group,
      hpBarBg: null, hpBarFill: null,
      hitFlash: 0, angle: 0,
      emergeTimer: 3.0,
      slowTimer: 0, dotTimer: 0, dotTickTimer: 0,
      specialTimer: 5, specialActive: false,
      circleAngle: 0, blockTimer: 0, teleportCd: 0,
      isBoss: true, bossPhase: 0,
    });
    this._enemiesAlive++;
    this._bossEnemy = this._enemies[this._enemies.length - 1];
  }

  // ── Cooldown Rings ────────────────────────────────────────────────────

  private _buildCooldownRings(): void {
    this._cdRingCanvas = document.createElement("canvas");
    this._cdRingCanvas.width = 80;
    this._cdRingCanvas.height = 80;
    this._cdRingCanvas.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 80px; height: 80px; pointer-events: none;
    `;
    this._uiContainer?.appendChild(this._cdRingCanvas);
    this._cdRingCtx = this._cdRingCanvas.getContext("2d");
  }

  private _updateCooldownRings(): void {
    const ctx = this._cdRingCtx;
    if (!ctx) return;
    const b = this._boatState;
    ctx.clearRect(0, 0, 80, 80);
    const cx = 40, cy = 40;

    // Frost nova ring (outer, blue)
    const frostMax = this._excaliburGranted ? FROST_NOVA_COOLDOWN * 0.6 : FROST_NOVA_COOLDOWN;
    const frostPct = b.frostNovaCooldown > 0 ? 1 - b.frostNovaCooldown / frostMax : 1;
    ctx.strokeStyle = frostPct >= 1 ? "rgba(102,204,255,0.6)" : "rgba(102,204,255,0.25)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frostPct);
    ctx.stroke();

    // Dash ring (inner, white)
    const dashMax = DASH_COOLDOWN - this._getUpgradeLevel("dash_cd") * 0.2;
    const dashPct = b.dashCooldown > 0 ? 1 - b.dashCooldown / dashMax : 1;
    ctx.strokeStyle = dashPct >= 1 ? "rgba(136,204,238,0.6)" : "rgba(136,204,238,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * dashPct);
    ctx.stroke();

    // Element color dot
    const elemColors: Record<SpellElement, string> = {
      arcane: "#9966ff", fire: "#ff6622", ice: "#66ccff", lightning: "#ffff44",
    };
    ctx.fillStyle = elemColors[this._currentElement];
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Rune Despawn Warning ──────────────────────────────────────────────
  // (Flash runes when about to expire — added inline in _updateRunes)

  // ── Dash / dodge ───────────────────────────────────────────────────────

  private _performDash(): void {
    const b = this._boatState;
    if (b.dashCooldown > 0 || b.dashTimer > 0) return;

    const dashCdReduction = this._getUpgradeLevel("dash_cd") * 0.2;
    b.dashCooldown = DASH_COOLDOWN - dashCdReduction;
    b.dashTimer = DASH_DURATION;
    b.invulnTimer = Math.max(b.invulnTimer, DASH_IFRAMES);

    // Dash in movement direction (or facing direction if stationary)
    const speed = Math.hypot(b.vx, b.vz);
    if (speed > 1) {
      b.dashDx = (b.vx / speed) * DASH_SPEED;
      b.dashDz = (b.vz / speed) * DASH_SPEED;
    } else {
      b.dashDx = Math.sin(b.angle) * DASH_SPEED;
      b.dashDz = -Math.cos(b.angle) * DASH_SPEED;
    }

    // Dash trail particles
    for (let i = 0; i < 8; i++) {
      this._spawnParticle(
        b.x, 0.5, b.z,
        (Math.random() - 0.5) * 3, 0.5, (Math.random() - 0.5) * 3,
        0.3, 0x88ccff, 0.08,
      );
    }
    this._playSound("dash");
  }

  private _updateDash(dt: number): void {
    const b = this._boatState;
    if (b.dashCooldown > 0) b.dashCooldown -= dt;
    if (b.dashTimer > 0) {
      b.dashTimer -= dt;
      b.x += b.dashDx * dt;
      b.z += b.dashDz * dt;
      // Clamp to lake during dash
      const dist = Math.hypot(b.x, b.z);
      if (dist > LAKE_RADIUS - 5) {
        b.x = (b.x / dist) * (LAKE_RADIUS - 5);
        b.z = (b.z / dist) * (LAKE_RADIUS - 5);
      }
    }
  }

  // ── Boss Spawn ────────────────────────────────────────────────────────

  private _spawnBoss(): void {
    if (!this._scene) return;
    this._bossActive = true;

    // Pick boss type based on wave
    const bossKinds: EnemyKind[] = ["kraken_arm", "water_serpent", "bog_wraith"];
    const kind = bossKinds[Math.floor(this._wave / BOSS_WAVE_INTERVAL - 1) % bossKinds.length];

    // Spawn the enemy normally first
    this._spawnEnemy(kind);
    const boss = this._enemies[this._enemies.length - 1];

    // Buff it to boss status
    boss.isBoss = true;
    boss.hp = boss.maxHp * 5 + this._wave * 3;
    boss.maxHp = boss.hp;

    // Scale up visually
    boss.mesh.scale.setScalar(2.0);

    // Boss crown/aura
    const auraGeo = new THREE.TorusGeometry(2, 0.1, 6, 16);
    auraGeo.rotateX(-Math.PI / 2);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xff4444, transparent: true, opacity: 0.5, depthWrite: false,
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.y = 3;
    boss.mesh.add(aura);

    // Boss light
    const light = new THREE.PointLight(0xff4444, 2, 20);
    light.position.y = 2;
    boss.mesh.add(light);

    this._bossEnemy = boss;
    this._showMessage(`BOSS: ${kind.replace("_", " ").toUpperCase()}`, 3);
    this._playSound("storm_start");
    this._shakeIntensity = 0.5;
  }

  // ── Gold Coins ────────────────────────────────────────────────────────

  private _spawnGoldCoin(x: number, z: number, value: number): void {
    if (!this._scene) return;
    const geo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffcc00, emissive: 0xaa8800, emissiveIntensity: 0.5, metalness: 0.9, roughness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.5, z);
    mesh.rotation.x = Math.PI / 2;
    this._scene.add(mesh);
    this._goldCoins.push({ x, z, mesh, value, age: 0 });
  }

  private _updateGoldCoins(dt: number): void {
    const b = this._boatState;
    const magnetBonus = 1 + this._getUpgradeLevel("rune_magnet") * 0.5;
    const collectR = GOLD_COLLECT_RADIUS * magnetBonus;

    for (let i = this._goldCoins.length - 1; i >= 0; i--) {
      const g = this._goldCoins[i];
      g.age += dt;
      g.mesh.rotation.z += dt * 3;
      g.mesh.position.y = 0.5 + Math.sin(g.age * 3) * 0.15;

      const dist = Math.hypot(b.x - g.x, b.z - g.z);
      if (dist < collectR) {
        this._gold += g.value;
        this._runGold += g.value;
        this._scene?.remove(g.mesh);
        g.mesh.geometry.dispose();
        (g.mesh.material as THREE.Material).dispose();
        this._goldCoins.splice(i, 1);
        this._playSound("rune_collect");
        try { localStorage.setItem("avalon_gold", String(this._gold)); } catch { /* */ }
        continue;
      }

      // Timeout
      if (g.age > 15) {
        this._scene?.remove(g.mesh);
        g.mesh.geometry.dispose();
        (g.mesh.material as THREE.Material).dispose();
        this._goldCoins.splice(i, 1);
      }
    }
  }

  // ── Persistent Shop ───────────────────────────────────────────────────

  private _getUpgradeLevel(id: string): number {
    try { return parseInt(localStorage.getItem(`avalon_up_${id}`) || "0", 10) || 0; } catch { return 0; }
  }

  private _setUpgradeLevel(id: string, level: number): void {
    try { localStorage.setItem(`avalon_up_${id}`, String(level)); } catch { /* */ }
  }

  private _applyShopUpgrades(): void {
    const b = this._boatState;
    b.maxHp += this._getUpgradeLevel("extra_hp");
    b.hp = b.maxHp;
    if (this._getUpgradeLevel("revive") > 0) b.reviveAvailable = true;
  }

  private _toggleShop(): void {
    if (this._shopActive) {
      this._closeShop();
    } else {
      this._openShop();
    }
  }

  private _openShop(): void {
    if (this._shopActive) return;
    this._shopActive = true;
    this._paused = true;

    this._shopEl = document.createElement("div");
    this._shopEl.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(5, 10, 21, 0.95); border: 2px solid rgba(68, 136, 255, 0.4);
      border-radius: 12px; padding: 24px 32px; color: #cceeff; z-index: 30;
      font-family: 'Segoe UI', Arial, sans-serif; min-width: 340px;
      pointer-events: all;
    `;

    let html = `<div style="font-size:22px;font-weight:bold;margin-bottom:12px;text-align:center;">
      ENCHANTMENT SHOP <span style="color:#ffcc00;">Gold: ${this._gold}</span>
    </div>`;

    for (const up of SHOP_UPGRADES_AVALON) {
      const level = this._getUpgradeLevel(up.id);
      const maxed = level >= up.maxLevel;
      const cost = up.cost * (level + 1);
      const canBuy = !maxed && this._gold >= cost;
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid rgba(68,136,255,0.2);">
        <div>
          <div style="font-weight:bold;">${up.name} ${maxed ? "(MAX)" : `Lv.${level}`}</div>
          <div style="font-size:12px;opacity:0.7;">${up.desc}</div>
        </div>
        <button data-upgrade="${up.id}" data-cost="${cost}" style="
          background: ${canBuy ? "#224488" : "#222"};
          color: ${canBuy ? "#ffcc00" : "#666"};
          border: 1px solid ${canBuy ? "#4488ff" : "#333"};
          border-radius: 6px; padding: 6px 14px; cursor: ${canBuy ? "pointer" : "default"};
          font-size: 14px; pointer-events: all;
        " ${!canBuy ? "disabled" : ""}>${maxed ? "MAX" : `${cost}g`}</button>
      </div>`;
    }

    html += `<div style="text-align:center;margin-top:12px;font-size:12px;opacity:0.5;">Press TAB to close</div>`;
    this._shopEl.innerHTML = html;
    document.body.appendChild(this._shopEl);

    // Click handlers
    this._shopEl.querySelectorAll("button[data-upgrade]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).dataset.upgrade!;
        const cost = parseInt((btn as HTMLElement).dataset.cost!, 10);
        if (this._gold >= cost) {
          const up = SHOP_UPGRADES_AVALON.find(u => u.id === id)!;
          const level = this._getUpgradeLevel(id);
          if (level < up.maxLevel) {
            this._gold -= cost;
            this._setUpgradeLevel(id, level + 1);
            try { localStorage.setItem("avalon_gold", String(this._gold)); } catch { /* */ }
            this._playSound("rune_collect");
            this._closeShop();
            this._openShop(); // refresh
          }
        }
      });
    });
  }

  private _closeShop(): void {
    if (this._shopEl && this._shopEl.parentNode) {
      this._shopEl.parentNode.removeChild(this._shopEl);
    }
    this._shopEl = null;
    this._shopActive = false;
    this._paused = false;
  }

  // ── Whirlpools ─────────────────────────────────────────────────────────

  private _buildWhirlpools(): void {
    if (!this._scene) return;
    for (let i = 0; i < WHIRLPOOL_COUNT; i++) {
      const angle = (i / WHIRLPOOL_COUNT) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 50 + Math.random() * 80;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const group = new THREE.Group();

      // Concentric spinning rings
      for (let r = 0; r < 4; r++) {
        const ringGeo = new THREE.TorusGeometry(2 + r * 2, 0.15, 4, 24);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x2288aa, transparent: true, opacity: 0.25 - r * 0.05, depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = -0.3 - r * 0.1;
        group.add(ring);
      }

      // Center vortex cone (pointing down)
      const vortexGeo = new THREE.ConeGeometry(1.5, 3, 12, 1, true);
      const vortexMat = new THREE.MeshBasicMaterial({
        color: 0x115566, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false,
      });
      const vortex = new THREE.Mesh(vortexGeo, vortexMat);
      vortex.position.y = -1.5;
      group.add(vortex);

      // Glow light
      const light = new THREE.PointLight(0x2288aa, 1.5, 15);
      light.position.y = -0.5;
      group.add(light);

      group.position.set(x, 0.1, z);
      this._scene.add(group);
      this._whirlpools.push({ x, z, mesh: group, phase: Math.random() * Math.PI * 2, damageCd: 0 });
    }
  }

  private _updateWhirlpools(dt: number): void {
    const b = this._boatState;

    for (const w of this._whirlpools) {
      w.phase += dt * 1.5;
      if (w.damageCd > 0) w.damageCd -= dt;

      // Spin rings
      w.mesh.children.forEach((child, i) => {
        child.rotation.y = w.phase * (1 + i * 0.3) * (i % 2 === 0 ? 1 : -1);
      });

      // Pull force on boat
      const dx = w.x - b.x;
      const dz = w.z - b.z;
      const dist = Math.hypot(dx, dz);
      if (dist < WHIRLPOOL_PULL_RADIUS && dist > 0) {
        const strength = (1 - dist / WHIRLPOOL_PULL_RADIUS) * WHIRLPOOL_PULL_FORCE * dt;
        b.vx += (dx / dist) * strength;
        b.vz += (dz / dist) * strength;

        // Tangential swirl
        b.vx += (-dz / dist) * strength * 0.5;
        b.vz += (dx / dist) * strength * 0.5;
      }

      // Damage at center
      if (dist < WHIRLPOOL_DAMAGE_RADIUS && w.damageCd <= 0) {
        w.damageCd = WHIRLPOOL_DAMAGE_CD;
        this._damageBoat(WHIRLPOOL_DAMAGE);
        this._showMessage("WHIRLPOOL!", 1);
      }

      // Also pull enemies into whirlpool
      for (const e of this._enemies) {
        if (e.dead) continue;
        const edx = w.x - e.x;
        const edz = w.z - e.z;
        const ed = Math.hypot(edx, edz);
        if (ed < WHIRLPOOL_PULL_RADIUS * 0.6 && ed > 0) {
          const str = (1 - ed / (WHIRLPOOL_PULL_RADIUS * 0.6)) * WHIRLPOOL_PULL_FORCE * 0.3 * dt;
          e.x += (edx / ed) * str;
          e.z += (edz / ed) * str;
        }
      }
    }
  }

  // ── Shield Bubble Visual ──────────────────────────────────────────────

  private _buildShieldBubble(): void {
    const geo = new THREE.SphereGeometry(2.5, 16, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x4488ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
    });
    this._shieldMesh = new THREE.Mesh(geo, mat);
    this._shieldMesh.renderOrder = 500;
    this._boatGroup?.add(this._shieldMesh);
  }

  private _updateShieldVisual(): void {
    if (!this._shieldMesh) return;
    const b = this._boatState;
    const mat = this._shieldMesh.material as THREE.MeshBasicMaterial;
    if (b.shieldTimer > 0) {
      mat.opacity = 0.15 + Math.sin(this._waterTime * 4) * 0.05;
      this._shieldMesh.scale.setScalar(1 + Math.sin(this._waterTime * 2) * 0.03);
    } else {
      mat.opacity = 0;
    }
  }

  // ── Invuln Flash ──────────────────────────────────────────────────────

  private _updateInvulnFlash(_dt: number): void {
    if (!this._boatGroup) return;
    const b = this._boatState;
    if (b.invulnTimer > 0) {
      const flash = Math.sin(this._waterTime * 20) > 0;
      this._boatGroup.visible = flash;
    } else {
      this._boatGroup.visible = true;
    }
  }

  // ── Boat Wake Trail ───────────────────────────────────────────────────

  private _wakeTimer = 0;
  private _wakePoints: { x: number; z: number; age: number; width: number }[] = [];
  private _wakeMesh: THREE.Mesh | null = null;
  private _wakeGeo: THREE.BufferGeometry | null = null;
  private _wakeMaxPts = 80;

  private _initWakeMesh(): void {
    if (!this._scene) return;
    // Pre-allocate wake geometry to avoid per-frame GC
    this._wakeGeo = new THREE.BufferGeometry();
    const maxVerts = this._wakeMaxPts * 2 * 3;
    const maxIdx = (this._wakeMaxPts - 1) * 6;
    this._wakeGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(maxVerts), 3));
    this._wakeGeo.setIndex(new THREE.BufferAttribute(new Uint16Array(maxIdx), 1));
    this._wakeGeo.setDrawRange(0, 0);

    const mat = new THREE.MeshBasicMaterial({
      color: 0xaaddee, transparent: true, opacity: 0.12, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this._wakeMesh = new THREE.Mesh(this._wakeGeo, mat);
    this._scene.add(this._wakeMesh);
  }

  private _updateBoatWake(dt: number): void {
    const b = this._boatState;
    const speed = Math.hypot(b.vx, b.vz);

    this._wakeTimer += dt;
    if (this._wakeTimer >= 0.04 && speed > 1.5) {
      this._wakeTimer = 0;
      const backX = b.x - Math.sin(b.angle) * 2.5;
      const backZ = b.z + Math.cos(b.angle) * 2.5;
      this._wakePoints.push({ x: backX, z: backZ, age: 0, width: Math.min(speed * 0.1, 1.5) });

      for (let side = -1; side <= 1; side += 2) {
        const perpX = Math.cos(b.angle) * side;
        const perpZ = Math.sin(b.angle) * side;
        this._spawnParticle(
          backX + perpX * 0.8, 0.15, backZ + perpZ * 0.8,
          perpX * 1.5 + (Math.random() - 0.5), 0.5 + Math.random() * 0.8, perpZ * 1.5 + (Math.random() - 0.5),
          0.4, 0xaaddee, 0.04,
        );
      }
    }

    for (let i = this._wakePoints.length - 1; i >= 0; i--) {
      this._wakePoints[i].age += dt;
      if (this._wakePoints[i].age > 2.5) this._wakePoints.splice(i, 1);
    }
    if (this._wakePoints.length > this._wakeMaxPts) this._wakePoints.splice(0, this._wakePoints.length - this._wakeMaxPts);

    // Update pre-allocated geometry in-place (no GC)
    if (!this._wakeGeo || this._wakePoints.length < 3) {
      if (this._wakeGeo) this._wakeGeo.setDrawRange(0, 0);
      return;
    }

    const posAttr = this._wakeGeo.getAttribute("position") as THREE.BufferAttribute;
    const idxAttr = this._wakeGeo.getIndex()!;
    let vi = 0;

    for (let i = 0; i < this._wakePoints.length; i++) {
      const p = this._wakePoints[i];
      const t = p.age / 2.5;
      const w = p.width * (1 - t * 0.7);
      let dx = 0, dz = 1;
      if (i < this._wakePoints.length - 1) { dx = this._wakePoints[i + 1].x - p.x; dz = this._wakePoints[i + 1].z - p.z; }
      else if (i > 0) { dx = p.x - this._wakePoints[i - 1].x; dz = p.z - this._wakePoints[i - 1].z; }
      const len = Math.hypot(dx, dz) || 1;
      const px = -dz / len, pz = dx / len;
      posAttr.setXYZ(vi++, p.x + px * w, 0.12, p.z + pz * w);
      posAttr.setXYZ(vi++, p.x - px * w, 0.12, p.z - pz * w);
    }
    posAttr.needsUpdate = true;

    let ii = 0;
    for (let i = 0; i < this._wakePoints.length - 1; i++) {
      const a = i * 2, b2 = a + 1, c = a + 2, d = a + 3;
      idxAttr.setX(ii++, a); idxAttr.setX(ii++, c); idxAttr.setX(ii++, b2);
      idxAttr.setX(ii++, b2); idxAttr.setX(ii++, c); idxAttr.setX(ii++, d);
    }
    idxAttr.needsUpdate = true;
    this._wakeGeo.setDrawRange(0, ii);
  }

  // ── Combo System ──────────────────────────────────────────────────────

  private _updateCombo(dt: number): void {
    if (this._comboTimer > 0) {
      this._comboTimer -= dt;
      if (this._comboTimer <= 0) {
        this._comboCount = 0;
        this._comboMult = 1;
      }
    }
  }

  // ── Frost Nova (secondary spell, right-click) ────────────────────────

  private _castFrostNova(): void {
    if (this._gameOver || this._paused) return;
    const b = this._boatState;
    if (b.frostNovaCooldown > 0) return;

    b.frostNovaCooldown = this._excaliburGranted ? FROST_NOVA_COOLDOWN * 0.6 : FROST_NOVA_COOLDOWN;
    this._shakeIntensity = 0.4;
    this._playSound("frost_nova");

    const novaRadius = FROST_NOVA_RADIUS * (this._unlockedAbilities.has("giant_nova") ? 1.6 : 1);

    // Expanding ring visual
    if (this._scene) {
      const ringGeo = new THREE.TorusGeometry(novaRadius, 0.3, 6, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x66ccff, transparent: true, opacity: 0.7, depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(b.x, 0.5, b.z);
      this._scene.add(ring);
      // Track in _lightningStrikes for auto-cleanup (reuse the fade-out pattern)
      this._lightningStrikes.push({ x: b.x, z: b.z, mesh: ring as any, life: 0.6 });
    }

    // Frost burst particles
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      this._spawnParticle(
        b.x, 1, b.z,
        Math.cos(a) * 8, 1 + Math.random() * 2, Math.sin(a) * 8,
        0.7, 0x66ccff, 0.12,
      );
    }

    // Damage and slow all enemies in range
    for (const e of this._enemies) {
      if (e.dead) continue;
      const dist = Math.hypot(e.x - b.x, e.z - b.z);
      if (dist < novaRadius) {
        const dmg = this._excaliburGranted ? FROST_NOVA_DAMAGE * 2 : FROST_NOVA_DAMAGE;
        e.hp -= dmg;
        e.hitFlash = 0.2;
        e.slowTimer = FROST_NOVA_SLOW_DURATION;
        this._totalDamageDealt += dmg;
        this._spawnDamageNumber(e.x, e.y + 2, e.z, dmg, 0x66ccff);

        if (e.hp <= 0 && !e.dead) {
          e.dead = true;
          e.deathTimer = 1.0;
          this._enemiesAlive--;
          this._totalKills++;
          this._comboCount++;
          this._comboTimer = COMBO_WINDOW;
          this._comboMult = Math.min(COMBO_MAX_MULT, 1 + Math.floor(this._comboCount / 3));
          if (this._comboCount > this._peakCombo) this._peakCombo = this._comboCount;
          this._score += ENEMY_DEFS[e.kind].score * this._comboMult;
          this._playSound("enemy_death");
        }
      }
    }
  }

  // ── Lightning Storm ───────────────────────────────────────────────────

  private _updateStorm(dt: number): void {
    if (!this._stormActive) {
      this._stormTimer -= dt;
      if (this._stormTimer <= 0) {
        this._stormActive = true;
        this._stormDuration = STORM_DURATION;
        this._stormStrikeTimer = 0;
        this._showMessage("LIGHTNING STORM!", 2);
        this._playSound("storm_start");
        // Darken scene
        if (this._ambientLight) this._ambientLight.intensity = 0.15;
      }
      return;
    }

    this._stormDuration -= dt;
    this._stormStrikeTimer -= dt;

    // Periodic lightning strikes
    if (this._stormStrikeTimer <= 0) {
      this._stormStrikeTimer = STORM_STRIKE_INTERVAL;
      this._spawnLightningStrike();
    }

    // Ambient flicker
    if (this._ambientLight) {
      this._ambientLight.intensity = 0.15 + Math.random() * 0.3;
    }

    if (this._stormDuration <= 0) {
      this._stormActive = false;
      this._stormTimer = STORM_INTERVAL_MIN + Math.random() * (STORM_INTERVAL_MAX - STORM_INTERVAL_MIN);
      if (this._ambientLight) this._ambientLight.intensity = 0.4;
    }
  }

  private _spawnLightningStrike(): void {
    if (!this._scene) return;
    const b = this._boatState;
    // Strike near player or random
    const targetEnemy = this._enemies.find(e => !e.dead && Math.random() < 0.4);
    let sx: number, sz: number;
    if (targetEnemy) {
      sx = targetEnemy.x + (Math.random() - 0.5) * 5;
      sz = targetEnemy.z + (Math.random() - 0.5) * 5;
    } else {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * 30;
      sx = b.x + Math.cos(a) * d;
      sz = b.z + Math.sin(a) * d;
    }

    const group = new THREE.Group();

    // Lightning bolt (jagged line from sky)
    const points: THREE.Vector3[] = [];
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
      points.push(new THREE.Vector3(
        (Math.random() - 0.5) * 2 * (1 - i / segments),
        50 - (50 * i / segments),
        (Math.random() - 0.5) * 2 * (1 - i / segments),
      ));
    }
    const boltGeo = new THREE.BufferGeometry().setFromPoints(points);
    const boltMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    group.add(new THREE.Line(boltGeo, boltMat));

    // Impact flash
    const flashGeo = new THREE.SphereGeometry(2, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false,
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.y = 0.5;
    group.add(flash);

    // Impact light
    const light = new THREE.PointLight(0xaaccff, 8, 30);
    light.position.y = 2;
    group.add(light);

    group.position.set(sx, 0, sz);
    this._scene.add(group);
    this._lightningStrikes.push({ x: sx, z: sz, mesh: group as any, life: 0.4 });

    this._shakeIntensity = Math.max(this._shakeIntensity, 0.3);
    this._playSound("lightning");

    // Damage enemies in radius
    for (const e of this._enemies) {
      if (e.dead) continue;
      const dist = Math.hypot(e.x - sx, e.z - sz);
      if (dist < STORM_STRIKE_RADIUS) {
        e.hp -= STORM_STRIKE_DAMAGE;
        e.hitFlash = 0.2;
        this._spawnDamageNumber(e.x, e.y + 2, e.z, STORM_STRIKE_DAMAGE, 0xffffff);
        if (e.hp <= 0 && !e.dead) {
          e.dead = true;
          e.deathTimer = 1.0;
          this._enemiesAlive--;
          this._totalKills++;
          this._score += ENEMY_DEFS[e.kind].score;
          this._playSound("enemy_death");
        }
      }
    }

    // Damage player if too close
    const playerDist = Math.hypot(b.x - sx, b.z - sz);
    if (playerDist < STORM_STRIKE_RADIUS * 0.6) {
      this._damageBoat(1);
    }

    // Impact particles
    for (let i = 0; i < 15; i++) {
      this._spawnParticle(
        sx, 0.5, sz,
        (Math.random() - 0.5) * 8, 2 + Math.random() * 4, (Math.random() - 0.5) * 8,
        0.5, 0xaaccff, 0.1,
      );
    }
  }

  private _updateLightningStrikes(dt: number): void {
    for (let i = this._lightningStrikes.length - 1; i >= 0; i--) {
      const ls = this._lightningStrikes[i];
      ls.life -= dt;
      // Fade
      ls.mesh.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.opacity = Math.max(0, ls.life / 0.4) * 0.8;
        }
      });
      if (ls.life <= 0) {
        this._scene?.remove(ls.mesh);
        this._lightningStrikes.splice(i, 1);
      }
    }
  }

  // ── Damage Numbers ────────────────────────────────────────────────────

  private _spawnDamageNumber(x: number, y: number, z: number, amount: number, color: number): void {
    if (!this._scene) return;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 48;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const hex = "#" + color.toString(16).padStart(6, "0");
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = hex;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    const text = amount >= 3 ? `-${amount}!` : `-${amount}`;
    ctx.strokeText(text, 64, 36);
    ctx.fillText(text, 64, 36);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2, 0.75, 1);
    sprite.position.set(x, y, z);
    sprite.renderOrder = 1001;
    this._scene.add(sprite);
    this._damageNumbers.push({ sprite, x, y, z, life: DMGNUM_LIFETIME, text });
  }

  private _updateDamageNumbers(dt: number): void {
    for (let i = this._damageNumbers.length - 1; i >= 0; i--) {
      const dn = this._damageNumbers[i];
      dn.life -= dt;
      dn.y += DMGNUM_RISE_SPEED * dt;
      dn.sprite.position.y = dn.y;
      dn.sprite.material.opacity = Math.max(0, dn.life / DMGNUM_LIFETIME);
      if (dn.life <= 0) {
        this._scene?.remove(dn.sprite);
        dn.sprite.material.map?.dispose();
        dn.sprite.material.dispose();
        this._damageNumbers.splice(i, 1);
      }
    }
  }

  // ── Minimap ───────────────────────────────────────────────────────────

  private _buildMinimap(): void {
    this._minimapCanvas = document.createElement("canvas");
    this._minimapCanvas.width = 160;
    this._minimapCanvas.height = 160;
    this._minimapCanvas.style.cssText = `
      position: absolute; bottom: 16px; left: 16px;
      width: 160px; height: 160px; border-radius: 50%;
      border: 2px solid rgba(68, 136, 255, 0.4);
      background: rgba(5, 10, 21, 0.6);
      pointer-events: none;
    `;
    this._uiContainer?.appendChild(this._minimapCanvas);
    this._minimapCtx = this._minimapCanvas.getContext("2d");
  }

  private _updateMinimap(): void {
    const ctx = this._minimapCtx;
    if (!ctx) return;
    const b = this._boatState;
    const size = 160;
    const half = size / 2;
    const scale = half / 100; // 100 units = half the minimap

    ctx.clearRect(0, 0, size, size);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half - 2, 0, Math.PI * 2);
    ctx.clip();

    // Lake edge
    ctx.strokeStyle = "rgba(34, 136, 170, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(half - b.x * scale, half - b.z * scale, LAKE_RADIUS * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Islands
    ctx.fillStyle = "rgba(51, 68, 51, 0.6)";
    for (const isl of this._islands) {
      const ix = half + (isl.x - b.x) * scale;
      const iz = half + (isl.z - b.z) * scale;
      ctx.beginPath();
      ctx.arc(ix, iz, isl.radius * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Whirlpools
    ctx.strokeStyle = "rgba(34, 136, 170, 0.6)";
    ctx.lineWidth = 1.5;
    for (const w of this._whirlpools) {
      const wx = half + (w.x - b.x) * scale;
      const wz = half + (w.z - b.z) * scale;
      ctx.beginPath();
      ctx.arc(wx, wz, 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Runes
    for (const r of this._runes) {
      if (r.collected) continue;
      const rx = half + (r.x - b.x) * scale;
      const rz = half + (r.z - b.z) * scale;
      const def = RUNE_DEFS[r.kind];
      ctx.fillStyle = "#" + def.color.toString(16).padStart(6, "0");
      ctx.fillRect(rx - 2, rz - 2, 4, 4);
    }

    // Gold coins
    ctx.fillStyle = "#ffcc00";
    for (const g of this._goldCoins) {
      const gx = half + (g.x - b.x) * scale;
      const gz = half + (g.z - b.z) * scale;
      ctx.fillRect(gx - 1.5, gz - 1.5, 3, 3);
    }

    // Enemies
    for (const e of this._enemies) {
      if (e.dead) continue;
      const ex = half + (e.x - b.x) * scale;
      const ez = half + (e.z - b.z) * scale;
      const isBoss = e.isBoss;
      ctx.fillStyle = isBoss ? "#ff0000" : (e.slowTimer > 0 ? "#4488ff" : "#ff4444");
      ctx.beginPath();
      ctx.arc(ex, ez, isBoss ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lady
    if (this._ladyActive && this._ladyMesh) {
      const lx = half + (this._ladyMesh.position.x - b.x) * scale;
      const lz = half + (this._ladyMesh.position.z - b.z) * scale;
      ctx.fillStyle = "#aaaaff";
      ctx.beginPath();
      ctx.arc(lx, lz, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player (center)
    ctx.fillStyle = "#44ddff";
    ctx.beginPath();
    ctx.arc(half, half, 3, 0, Math.PI * 2);
    ctx.fill();
    // Direction indicator
    ctx.strokeStyle = "#44ddff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(half, half);
    ctx.lineTo(half + Math.sin(b.angle) * 8, half - Math.cos(b.angle) * 8);
    ctx.stroke();

    ctx.restore();
  }

  // ── Ambient Music ─────────────────────────────────────────────────────

  private _musicOscillators: OscillatorNode[] = [];
  private _musicGains: GainNode[] = [];

  private _startAmbientMusic(): void {
    try {
      if (!this._audioCtx) this._audioCtx = new AudioContext();
      const ctx = this._audioCtx;

      // Deep pad drone — layered detuned sines
      const baseFreqs = [55, 82.5, 110, 165]; // A1, E2, A2, E3
      for (let i = 0; i < baseFreqs.length; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = i < 2 ? "sine" : "triangle";
        osc.frequency.value = baseFreqs[i];
        osc.detune.value = (Math.random() - 0.5) * 10;

        filter.type = "lowpass";
        filter.frequency.value = 400;
        filter.Q.value = 1;

        gain.gain.value = 0;
        gain.gain.linearRampToValueAtTime(0.03 + (i === 0 ? 0.02 : 0), ctx.currentTime + 3);

        osc.connect(filter).connect(gain).connect(ctx.destination);
        osc.start();

        this._musicOscillators.push(osc);
        this._musicGains.push(gain);
      }

      // Slow LFO to modulate pad volume for ethereal feel
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = "sine";
      lfo.frequency.value = 0.1;
      lfoGain.gain.value = 0.01;
      lfo.connect(lfoGain);
      // Modulate the first pad's gain
      if (this._musicGains[0]) {
        lfoGain.connect(this._musicGains[0].gain);
      }
      lfo.start();
      this._musicOscillators.push(lfo);

      // Water ambience: filtered noise for gentle lapping waves
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        noiseData[j] = (Math.random() * 2 - 1) * 0.5;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 200;
      noiseFilter.Q.value = 0.5;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.015;
      // Modulate filter frequency for wave-like effect
      const noiseLfo = ctx.createOscillator();
      const noiseLfoGain = ctx.createGain();
      noiseLfo.type = "sine";
      noiseLfo.frequency.value = 0.15;
      noiseLfoGain.gain.value = 100;
      noiseLfo.connect(noiseLfoGain).connect(noiseFilter.frequency);
      noiseLfo.start();
      noiseSource.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
      noiseSource.start();
    } catch { /* audio not available */ }
  }

  private _stopAmbientMusic(): void {
    for (const osc of this._musicOscillators) {
      try { osc.stop(); } catch { /* */ }
    }
    this._musicOscillators = [];
    this._musicGains = [];
  }

  // ── Procedural Audio ────────────────────────────────────────────────────

  private _playSound(type: string): void {
    try {
      if (!this._audioCtx) this._audioCtx = new AudioContext();
      const ctx = this._audioCtx;
      const now = ctx.currentTime;

      switch (type) {
        case "spell_cast": {
          // Element-specific cast sounds
          const elem = this._currentElement;
          if (elem === "fire") {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now); osc.stop(now + 0.2);
          } else if (elem === "ice") {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now); osc.stop(now + 0.2);
          } else if (elem === "lightning") {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "square";
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now); osc.stop(now + 0.1);
          } else {
            // Arcane: mystical shimmer
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now); osc.stop(now + 0.2);
          }
          break;
        }
        case "enemy_death": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.3);
          break;
        }
        case "player_hit": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.2);
          break;
        }
        case "rune_collect": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(523, now);
          osc.frequency.setValueAtTime(659, now + 0.08);
          osc.frequency.setValueAtTime(784, now + 0.16);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.3);
          break;
        }
        case "wave_start": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.3);
          osc.frequency.exponentialRampToValueAtTime(150, now + 0.6);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.6);
          break;
        }
        case "excalibur_grant": {
          // Majestic ascending chord
          const freqs = [261, 329, 392, 523, 659];
          for (let i = 0; i < freqs.length; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freqs[i], now + i * 0.12);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.08, now + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + i * 0.12); osc.stop(now + 1.5);
          }
          break;
        }
        case "frost_nova": {
          // Icy whoosh
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noise = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.4);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.5);
          // Shimmer
          noise.type = "sawtooth";
          noise.frequency.setValueAtTime(3000, now);
          noise.frequency.exponentialRampToValueAtTime(500, now + 0.3);
          const ng = ctx.createGain();
          ng.gain.setValueAtTime(0.04, now);
          ng.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          noise.connect(ng).connect(ctx.destination);
          noise.start(now); noise.stop(now + 0.3);
          break;
        }
        case "wave_clear": {
          // Triumphant fanfare
          const notes = [523, 659, 784];
          for (let i = 0; i < notes.length; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(notes[i], now + i * 0.1);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + i * 0.1); osc.stop(now + 0.6);
          }
          break;
        }
        case "storm_start": {
          // Low rumble
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(40, now);
          osc.frequency.linearRampToValueAtTime(80, now + 0.8);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now); osc.stop(now + 1.0);
          break;
        }
        case "lightning": {
          // Sharp crack
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.15);
          // Rumble tail
          const osc2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          osc2.type = "sawtooth";
          osc2.frequency.setValueAtTime(50, now + 0.1);
          g2.gain.setValueAtTime(0.06, now + 0.1);
          g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc2.connect(g2).connect(ctx.destination);
          osc2.start(now + 0.1); osc2.stop(now + 0.5);
          break;
        }
        case "dash": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.15);
          break;
        }
        case "wraith_teleport": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.25);
          break;
        }
        case "kraken_slam": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(60, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now); osc.stop(now + 0.4);
          break;
        }
        case "game_over": {
          // Somber descending
          const notes = [392, 330, 262, 196];
          for (let i = 0; i < notes.length; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(notes[i], now + i * 0.25);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.1, now + i * 0.25);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + i * 0.25); osc.stop(now + 1.5);
          }
          break;
        }
      }
    } catch { /* audio not available */ }
  }

  private _restart(): void {
    // Clean up all game objects
    for (const e of this._enemies) this._scene?.remove(e.mesh);
    for (const s of this._spells) { this._scene?.remove(s.mesh); s.mesh.geometry.dispose(); }
    for (const r of this._runes) this._scene?.remove(r.mesh);
    for (const p of this._particles) { this._scene?.remove(p.mesh); p.mesh.geometry.dispose(); }
    for (const dn of this._damageNumbers) { this._scene?.remove(dn.sprite); dn.sprite.material.dispose(); }
    for (const ls of this._lightningStrikes) this._scene?.remove(ls.mesh);
    for (const ir of this._impactRings) { this._scene?.remove(ir.mesh); ir.mesh.geometry.dispose(); }
    for (const g of this._goldCoins) { this._scene?.remove(g.mesh); g.mesh.geometry.dispose(); }
    if (this._ladyMesh) { this._scene?.remove(this._ladyMesh); this._ladyMesh = null; }
    this._closeShop();

    this._enemies = [];
    this._spells = [];
    this._runes = [];
    this._particles = [];
    this._damageNumbers = [];
    this._lightningStrikes = [];
    this._impactRings = [];
    this._pendingSlams = [];
    for (const tg of this._telegraphs) { this._scene?.remove(tg.ring); this._scene?.remove(tg.fill); }
    this._telegraphs = [];
    this._goldCoins = [];
    this._wakePoints = [];
    if (this._wakeGeo) this._wakeGeo.setDrawRange(0, 0);
    this._enemiesAlive = 0;
    this._wave = 0;
    this._waveTimer = 5;
    this._score = 0;
    this._gameTime = 0;
    this._gameOver = false;
    this._ladyActive = false;
    this._excaliburGranted = false;
    this._runeSpawnTimer = 0;
    this._totalKills = 0;
    this._totalDamageDealt = 0;
    this._runesCollected = 0;
    this._peakCombo = 0;
    this._comboCount = 0;
    this._comboTimer = 0;
    this._comboMult = 1;
    this._stormTimer = STORM_INTERVAL_MIN + Math.random() * (STORM_INTERVAL_MAX - STORM_INTERVAL_MIN);
    this._stormActive = false;
    this._stormDuration = 0;
    this._shakeIntensity = 0;
    this._bossActive = false;
    this._bossEnemy = null;
    this._runGold = 0;
    this._currentElement = "arcane";
    this._enemyIdCounter = 0;
    this._hitStopTimer = 0;
    this._narrativeShown = new Set();
    this._unlockedAbilities = new Set();
    this._vampiricKillCount = 0;
    this._inWaveCalm = false;
    this._waveCalmTimer = 0;
    this._inSanctuary = false;
    this._sanctuaryTimer = 0;
    this._currentEra = "dawn";
    this._closeAbilityCards();
    if (this._ambientLight) this._ambientLight.intensity = 0.4;
    if (this._scene) {
      this._scene.fog = new THREE.FogExp2(0x050a15, 0.012);
      this._scene.background = new THREE.Color(0x050a15);
    }
    if (this._bloomPass) this._bloomPass.strength = 0.6;

    this._boatState = {
      x: 0, z: 0, vx: 0, vz: 0, angle: 0,
      hp: 5, maxHp: 5, shieldTimer: 0, speedTimer: 0, powerTimer: 0,
      spellCooldown: 0, frostNovaCooldown: 0, excaliburShards: 0, invulnTimer: 0,
      dashCooldown: 0, dashTimer: 0, dashDx: 0, dashDz: 0, reviveAvailable: false,
    };
    this._applyShopUpgrades();

    this._hideMessage();
    this._showMessage("LAKE OF AVALON", 2);
  }
}
