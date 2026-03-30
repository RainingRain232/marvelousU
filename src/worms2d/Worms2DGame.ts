// /home/rain/Bureaublad/workspace/src/worms2d/Worms2DGame.ts
//
// WORMS 2D — Full-screen Canvas 2D turn-based artillery game
// Camelot-themed with medieval knights
// REWRITTEN with major visual and gameplay improvements

// ─── Constants ──────────────────────────────────────────────────────────────

const GRAVITY = 400;
const WORM_RADIUS = 14;
const WORM_HP = 100;
const TURN_TIME = 45;
const RETREAT_TIME = 5;
const WATER_LEVEL = 50;
const TERRAIN_WIDTH = 3200;
const TERRAIN_HEIGHT = 1200;

const MOVE_SPEED = 80;
const JUMP_FORCE = -250;
const FALL_DAMAGE_THRESHOLD = 300;
const FALL_DAMAGE_MULTIPLIER = 0.12;
const MAX_POWER = 1.0;
const CHARGE_RATE = 0.6;

const SUDDEN_DEATH_TURN = 30;
const SUPPLY_DROP_INTERVAL = 5;
const WORM_DRAW_HEIGHT = 55;

const MEDIEVAL_QUIPS = [
  "For the realm!", "Have at thee!", "By Excalibur!", "To arms!",
  "Thou shalt fall!", "For Camelot!", "A pox upon thee!", "En garde!",
  "Feel my wrath!", "Cry havoc!", "Deus vult!", "Tally ho!",
  "Smite them!", "Onwards!", "Victory awaits!", "Chaaarge!",
];

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Vec2 { x: number; y: number; }

interface Worm {
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number; name: string; team: number;
  alive: boolean; facing: number; aimAngle: number; grounded: boolean;
  frozen: number; poisoned: number; animFrame: number; animTimer: number;
  breathTimer: number; kills: number;
}

interface Projectile {
  x: number; y: number; vx: number; vy: number;
  type: string; timer: number; bounces: number; owner: number;
  trail: Vec2[]; clusterCount?: number; fuseTime?: number;
  active: boolean; angle: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
  gravity: boolean;
  type: 'circle' | 'spark' | 'smoke' | 'debris' | 'fire' | 'text' | 'ember' | 'shockwave' | 'bubble';
  text?: string; rotation?: number; rotSpeed?: number; alpha?: number;
}

interface WeaponDef {
  name: string; icon: string; ammo: number; damage: number; radius: number;
  type: 'projectile' | 'grenade' | 'hitscan' | 'melee' | 'airstrike' | 'placed' | 'teleport' | 'strike' | 'rope';
  fuseTime?: number; clusterCount?: number; knockback: number; speed?: number;
  description: string; windAffected?: boolean;
}

interface Team {
  name: string; color: string; darkColor: string; lightColor: string;
  worms: Worm[]; ammo: Map<string, number>; damageDealt: number;
}

type Phase = 'title' | 'playing' | 'aiming' | 'firing' | 'resolving' | 'retreat' | 'weapon_select' | 'victory';

interface Cloud { x: number; y: number; width: number; height: number; speed: number; opacity: number; bumps: number[]; }
interface Star { x: number; y: number; size: number; twinkleOffset: number; twinkleSpeed: number; }
interface MountainPeak { x: number; height: number; width: number; }

interface CastleSilhouette {
  x: number; width: number; baseHeight: number;
  towers: { xOff: number; width: number; height: number; battlement: boolean }[];
  windows: { tx: number; ty: number }[];
  flags: { tx: number; ty: number; color: string }[];
}

interface TreeSilhouette { x: number; height: number; width: number; type: 'round' | 'pointed' | 'oak'; }
interface TitleButton { x: number; y: number; w: number; h: number; text: string; action: () => void; hover: boolean; }

interface AirStrikeData {
  x: number; projectiles: number; delay: number; timer: number; spawned: number; weaponKey: string;
}

interface RopeState {
  active: boolean; anchorX: number; anchorY: number; length: number; angle: number; angularVel: number;
}

interface Gravestone { x: number; y: number; name: string; teamColor: string; }
interface SupplyCrate { x: number; y: number; vy: number; landed: boolean; parachuteOpen: boolean; }
interface KillFeedEntry { text: string; color: string; timer: number; }
interface BirdGroup { x: number; y: number; speed: number; count: number; phase: number; }
interface CraterGlow { x: number; y: number; radius: number; timer: number; maxTimer: number; }

// ─── Weapons ────────────────────────────────────────────────────────────────

const WEAPONS: Record<string, WeaponDef> = {
  bazooka: { name: "Bazooka", icon: "🚀", ammo: -1, damage: 45, radius: 35, type: "projectile", knockback: 200, speed: 600, description: "Standard rocket launcher", windAffected: true },
  grenade: { name: "Grenade", icon: "💣", ammo: -1, damage: 50, radius: 40, type: "grenade", fuseTime: 3, knockback: 180, speed: 500, description: "Bouncing explosive", windAffected: true },
  shotgun: { name: "Shotgun", icon: "🔫", ammo: -1, damage: 25, radius: 10, type: "hitscan", knockback: 120, description: "Two shots per turn" },
  fire_punch: { name: "Fire Punch", icon: "🔥", ammo: -1, damage: 30, radius: 15, type: "melee", knockback: 250, description: "Flaming uppercut" },
  baseball_bat: { name: "Baseball Bat", icon: "🏏", ammo: -1, damage: 15, radius: 12, type: "melee", knockback: 400, description: "Massive knockback" },
  dynamite: { name: "Dynamite", icon: "🧨", ammo: 2, damage: 75, radius: 55, type: "placed", fuseTime: 4, knockback: 250, description: "Powerful placed bomb" },
  mine: { name: "Mine", icon: "💥", ammo: 3, damage: 50, radius: 40, type: "placed", knockback: 200, description: "Proximity mine" },
  holy_hand_grenade: { name: "Holy Hand Grenade", icon: "✝️", ammo: 1, damage: 100, radius: 70, type: "grenade", fuseTime: 3, knockback: 350, speed: 400, description: "The ultimate weapon", windAffected: true },
  banana_bomb: { name: "Banana Bomb", icon: "🍌", ammo: 1, damage: 40, radius: 30, type: "grenade", fuseTime: 3, clusterCount: 5, knockback: 150, speed: 450, description: "Splits into cluster bombs", windAffected: true },
  cluster_bomb: { name: "Cluster Bomb", icon: "🎆", ammo: 3, damage: 30, radius: 25, type: "grenade", fuseTime: 2.5, clusterCount: 4, knockback: 120, speed: 480, description: "Splits into bomblets", windAffected: true },
  sheep: { name: "Sheep", icon: "🐑", ammo: 2, damage: 70, radius: 50, type: "projectile", knockback: 250, speed: 200, description: "Walking explosive sheep" },
  catapult: { name: "Catapult", icon: "⚔️", ammo: 3, damage: 55, radius: 45, type: "projectile", knockback: 200, speed: 550, description: "Siege weapon projectile", windAffected: true },
  excalibur: { name: "Excalibur Strike", icon: "⚡", ammo: 1, damage: 80, radius: 60, type: "strike", knockback: 300, description: "Legendary blade from the sky" },
  holy_water: { name: "Holy Water", icon: "💧", ammo: 3, damage: 25, radius: 35, type: "grenade", fuseTime: 2, knockback: 50, speed: 400, description: "Burns unholy ground", windAffected: true },
  mortar: { name: "Mortar", icon: "🏰", ammo: 3, damage: 40, radius: 35, type: "projectile", knockback: 180, speed: 700, description: "High-arcing siege round", windAffected: true },
  flaming_arrow: { name: "Flaming Arrow", icon: "🏹", ammo: -1, damage: 20, radius: 15, type: "projectile", knockback: 80, speed: 900, description: "Fast ranged attack", windAffected: true },
  meteor: { name: "Meteor", icon: "☄️", ammo: 1, damage: 90, radius: 65, type: "airstrike", knockback: 350, description: "Merlin's cosmic fury" },
  air_strike: { name: "Air Strike", icon: "✈️", ammo: 1, damage: 30, radius: 25, type: "airstrike", knockback: 120, description: "5 missiles from the sky" },
  carpet_bomb: { name: "Carpet Bomb", icon: "🎯", ammo: 1, damage: 25, radius: 20, type: "airstrike", knockback: 100, description: "12 bombs in a line" },
  teleport: { name: "Teleport", icon: "🌀", ammo: 2, damage: 0, radius: 0, type: "teleport", knockback: 0, description: "Reposition your worm" },
  ninja_rope: { name: "Ninja Rope", icon: "🪢", ammo: 3, damage: 0, radius: 0, type: "rope", knockback: 0, description: "Swing across terrain" },
  girder: { name: "Girder", icon: "🪵", ammo: 3, damage: 0, radius: 0, type: "placed", knockback: 0, description: "Place a bridge" },
  earthquake: { name: "Earthquake", icon: "🌋", ammo: 1, damage: 15, radius: 0, type: "strike", knockback: 80, description: "Shakes all worms" },
  concrete_donkey: { name: "Concrete Donkey", icon: "🫏", ammo: 1, damage: 60, radius: 50, type: "airstrike", knockback: 280, description: "Descending beast of destruction" },
  freeze_blast: { name: "Freeze Blast", icon: "❄️", ammo: 2, damage: 10, radius: 30, type: "grenade", fuseTime: 2, knockback: 20, speed: 500, description: "Freezes worms for 1 turn", windAffected: true },
  poison_strike: { name: "Poison Strike", icon: "☠️", ammo: 2, damage: 10, radius: 25, type: "grenade", fuseTime: 2, knockback: 30, speed: 450, description: "Poisons worms over time", windAffected: true },
  dragon_breath: { name: "Dragon Breath", icon: "🐉", ammo: 1, damage: 35, radius: 40, type: "hitscan", knockback: 150, description: "Cone of medieval fire" },
  lance_charge: { name: "Lance Charge", icon: "🐴", ammo: 2, damage: 35, radius: 15, type: "melee", knockback: 350, description: "Mounted knight charge" },
  trebuchet: { name: "Trebuchet", icon: "🪨", ammo: 2, damage: 55, radius: 45, type: "projectile", knockback: 220, speed: 500, description: "Heavy siege boulder", windAffected: true },
  mole_bomb: { name: "Mole Bomb", icon: "🐛", ammo: 2, damage: 40, radius: 35, type: "projectile", knockback: 150, speed: 300, description: "Burrows through terrain" },
  grail_strike: { name: "Holy Grail", icon: "🏆", ammo: 1, damage: 95, radius: 70, type: "airstrike", knockback: 380, description: "Divine wrath from above" },
  lightning_bolt: { name: "Lightning Bolt", icon: "⚡", ammo: 2, damage: 35, radius: 20, type: "strike", knockback: 200, description: "Strike from the heavens" },
};

// ─── Team Configs ───────────────────────────────────────────────────────────

const TEAM_CONFIGS = [
  { name: "Round Table", color: "#3366ff", darkColor: "#1a3399", lightColor: "#6699ff", names: ["Arthur", "Lancelot", "Gawain", "Percival"] },
  { name: "Mordred's Host", color: "#cc2222", darkColor: "#881111", lightColor: "#ff5555", names: ["Mordred", "Agravaine", "Morgause", "Gareth"] },
  { name: "Merlin's Circle", color: "#22bb44", darkColor: "#117722", lightColor: "#55ee77", names: ["Merlin", "Nimue", "Viviane", "Taliesin"] },
  { name: "Grail Knights", color: "#ffaa00", darkColor: "#aa7700", lightColor: "#ffcc44", names: ["Galahad", "Bors", "Tristan", "Kay"] },
];

const WEAPON_KEYS = Object.keys(WEAPONS);

// ─── Utility ────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function clamp(v: number, min: number, max: number): number { return v < min ? min : v > max ? max : v; }
function dist(ax: number, ay: number, bx: number, by: number): number { const dx = ax - bx; const dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
function randRange(min: number, max: number): number { return min + Math.random() * (max - min); }
function randInt(min: number, max: number): number { return Math.floor(randRange(min, max + 1)); }
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 255, g: 255, b: 255 };
}

// ─── Main Game Class ────────────────────────────────────────────────────────

export class Worms2DGame {
  private _canvas!: HTMLCanvasElement;
  private _ctx!: CanvasRenderingContext2D;
  private _terrainCanvas!: HTMLCanvasElement;
  private _terrainCtx!: CanvasRenderingContext2D;
  private _bgCanvas!: HTMLCanvasElement;
  private _bgCtx!: CanvasRenderingContext2D;

  private _terrainMask!: Uint8Array;
  private _terrainDirty = true;
  private _terrainDirtyRegion: { x1: number; y1: number; x2: number; y2: number } | null = null;

  private _phase: Phase = 'title';
  private _teams: Team[] = [];
  private _currentTeam = 0;
  private _currentWormIndex = 0;
  private _turnTimer = TURN_TIME;
  private _retreatTimer = RETREAT_TIME;
  private _wind = 0;
  private _gameTime = 0;
  private _turnNumber = 0;
  private _teamCount = 2;
  private _winningTeam = -1;
  private _shotsFired = 0;
  private _suddenDeath = false;
  private _suddenDeathWaterExtra = 0;

  private _projectiles: Projectile[] = [];
  private _particles: Particle[] = [];
  private _airStrikes: AirStrikeData[] = [];

  private _rope: RopeState = { active: false, anchorX: 0, anchorY: 0, length: 0, angle: 0, angularVel: 0 };

  private _camX = 0;
  private _camY = 0;
  private _camTargetX = 0;
  private _camTargetY = 0;
  private _camZoom = 1;
  private _camTargetZoom = 1;

  private _shakeAmount = 0;
  private _shakeTime = 0;
  private _screenFlashAlpha = 0;
  private _screenFlashTimer = 0;

  private _keys: Set<string> = new Set();
  private _mouseX = 0;
  private _mouseY = 0;
  private _mouseWorldX = 0;
  private _mouseWorldY = 0;
  private _mouseDown = false;
  private _charging = false;
  private _chargeTime = 0;
  private _power = 0;

  private _currentWeapon = 'bazooka';
  private _weaponSelectOpen = false;
  private _shotgunShotsLeft = 0;

  private _aiActive = false;
  private _aiTimer = 0;
  private _aiPhase: 'thinking' | 'moving' | 'aiming' | 'firing' | 'waiting' = 'thinking';
  private _aiTargetAngle = 0;
  private _aiTargetPower = 0;
  private _aiMoveDir = 0;
  private _aiMoveTime = 0;

  private _teamIsHuman: boolean[] = [false, false, false, false];

  private _rafId = 0;
  private _lastTime = 0;

  private _clouds: Cloud[] = [];
  private _stars: Star[] = [];
  private _mountains: MountainPeak[][] = [];
  private _castles: CastleSilhouette[] = [];
  private _trees: TreeSilhouette[][] = [];
  private _birds: BirdGroup[] = [];

  private _titleButtons: TitleButton[] = [];
  private _victoryButtons: TitleButton[] = [];

  private _mines: { x: number; y: number; team: number }[] = [];
  private _placingGirder = false;
  private _girderAngle = 0;
  private _teleportMode = false;

  private _audioCtx: AudioContext | null = null;
  private _bgMusicGain: GainNode | null = null;
  private _bgMusicPlaying = false;
  private _windGainNode: GainNode | null = null;

  private _boundHandlers: { type: string; handler: (e: any) => void; options?: any }[] = [];
  private _pendingExplosions: { x: number; y: number; radius: number; damage: number; knockback: number; owner: number; weaponKey: string }[] = [];

  private _resolveTimer = 0;
  private _resolvePhaseDelay = 0;
  private _nextTurnDelay = 0;
  private _edgeScrollMargin = 60;
  private _edgeScrollSpeed = 500;
  private _wormFallVelocities: Map<string, number> = new Map();

  private _flashText = '';
  private _flashTimer = 0;
  private _bgHueShift = 0;
  private _waterOffset = 0;
  private _crosshairPulse = 0;

  private _gravestones: Gravestone[] = [];
  private _supplyCrates: SupplyCrate[] = [];
  private _killFeed: KillFeedEntry[] = [];
  private _craterGlows: CraterGlow[] = [];
  private _speechBubble: { text: string; timer: number; x: number; y: number } | null = null;
  private _vignetteAlpha = 0.25;
  private _titleTorchFlicker = 0;

  // Escape / pause menu
  private _pauseMenuOpen = false;
  private _pauseMenuTab: 'main' | 'controls' | 'intro' | 'concepts' | 'weapons' | 'tips' = 'main';
  private _pauseMenuScroll = 0;

  // ─── BOOT ──────────────────────────────────────────────────────────────────

  boot(): void {
    this._canvas = document.createElement('canvas');
    this._canvas.style.position = 'fixed';
    this._canvas.style.top = '0';
    this._canvas.style.left = '0';
    this._canvas.style.width = '100%';
    this._canvas.style.height = '100%';
    this._canvas.style.zIndex = '9999';
    this._canvas.style.cursor = 'crosshair';
    this._canvas.style.background = '#000';
    document.body.appendChild(this._canvas);

    const ctx = this._canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this._ctx = ctx;

    this._terrainCanvas = document.createElement('canvas');
    this._terrainCanvas.width = TERRAIN_WIDTH;
    this._terrainCanvas.height = TERRAIN_HEIGHT;
    const tCtx = this._terrainCanvas.getContext('2d');
    if (!tCtx) throw new Error('Cannot get terrain 2D context');
    this._terrainCtx = tCtx;

    this._bgCanvas = document.createElement('canvas');
    this._bgCanvas.width = TERRAIN_WIDTH;
    this._bgCanvas.height = TERRAIN_HEIGHT;
    const bgCtx = this._bgCanvas.getContext('2d');
    if (!bgCtx) throw new Error('Cannot get bg 2D context');
    this._bgCtx = bgCtx;

    this._resizeCanvas();
    const resizeHandler = () => this._resizeCanvas();
    window.addEventListener('resize', resizeHandler);
    this._boundHandlers.push({ type: 'resize', handler: resizeHandler });

    this._setupInput();
    this._generateBackgroundObjects();
    this._renderStaticBackground();
    this._initAudio();

    this._phase = 'title';
    this._buildTitleButtons();

    this._lastTime = performance.now();
    const loop = (time: number) => {
      const dt = Math.min((time - this._lastTime) / 1000, 0.05);
      this._lastTime = time;
      this._update(dt);
      this._render();
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  // ─── DESTROY ───────────────────────────────────────────────────────────────

  destroy(): void {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = 0; }
    for (const { type, handler } of this._boundHandlers) { window.removeEventListener(type, handler); }
    this._boundHandlers = [];
    if (this._canvas && this._canvas.parentNode) { this._canvas.parentNode.removeChild(this._canvas); }
    this._stopBackgroundMusic();
    if (this._audioCtx) { this._audioCtx.close().catch(() => {}); this._audioCtx = null; }
  }

  private _resizeCanvas(): void {
    this._canvas.width = window.innerWidth;
    this._canvas.height = window.innerHeight;
  }

  // ─── INPUT ─────────────────────────────────────────────────────────────────

  private _setupInput(): void {
    const keydown = (e: KeyboardEvent) => {
      this._keys.add(e.key.toLowerCase());
      const gameKeys = ['w','a','s','d',' ','e','tab','escape','1','2','3','4','5','6','7','8','9','0','arrowleft','arrowright','arrowup','arrowdown'];
      if (gameKeys.includes(e.key.toLowerCase())) e.preventDefault();
      this._handleKeyDown(e.key.toLowerCase());
    };
    const keyup = (e: KeyboardEvent) => { this._keys.delete(e.key.toLowerCase()); };
    const mousemove = (e: MouseEvent) => {
      this._mouseX = e.clientX; this._mouseY = e.clientY;
      this._mouseWorldX = (e.clientX - this._canvas.width / 2) / this._camZoom + this._camX;
      this._mouseWorldY = (e.clientY - this._canvas.height / 2) / this._camZoom + this._camY;
    };
    const mousedown = (e: MouseEvent) => { if (e.button === 0) { this._mouseDown = true; this._handleMouseDown(); } };
    const mouseup = (e: MouseEvent) => { if (e.button === 0) { this._mouseDown = false; this._handleMouseUp(); } };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (this._pauseMenuOpen) { this._pauseMenuScroll = clamp(this._pauseMenuScroll + (e.deltaY > 0 ? 40 : -40), 0, 2000); return; }
      this._camTargetZoom = clamp(this._camTargetZoom + (e.deltaY > 0 ? -0.1 : 0.1), 0.5, 2.0);
    };
    const contextmenu = (e: Event) => { e.preventDefault(); };

    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('mousemove', mousemove);
    window.addEventListener('mousedown', mousedown);
    window.addEventListener('mouseup', mouseup);
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('contextmenu', contextmenu);
    this._boundHandlers.push(
      { type: 'keydown', handler: keydown }, { type: 'keyup', handler: keyup },
      { type: 'mousemove', handler: mousemove }, { type: 'mousedown', handler: mousedown },
      { type: 'mouseup', handler: mouseup }, { type: 'wheel', handler: wheel },
      { type: 'contextmenu', handler: contextmenu },
    );
  }

  private _handleKeyDown(key: string): void {
    if (this._phase === 'title') return;
    if (key === 'escape') {
      if (this._pauseMenuOpen) { this._pauseMenuOpen = false; this._pauseMenuTab = 'main'; this._pauseMenuScroll = 0; return; }
      if (this._weaponSelectOpen) { this._weaponSelectOpen = false; return; }
      if (this._teleportMode) { this._teleportMode = false; return; }
      if (this._placingGirder) { this._placingGirder = false; return; }
      if (this._rope.active) { this._rope.active = false; return; }
      this._pauseMenuOpen = true; this._pauseMenuTab = 'main'; this._pauseMenuScroll = 0;
      this._playSound('click');
      return;
    }
    if (this._pauseMenuOpen) return;
    if (key === 'e' && (this._phase === 'playing' || this._phase === 'aiming') && !this._aiActive) {
      this._weaponSelectOpen = !this._weaponSelectOpen;
      if (this._weaponSelectOpen) this._playSound('click');
      return;
    }
    if (key === 'tab' && this._phase !== 'title' && this._phase !== 'victory') { this._cycleCameraToNextWorm(); return; }
    if (key >= '1' && key <= '9' && (this._phase === 'playing' || this._phase === 'aiming')) {
      const idx = parseInt(key) - 1;
      if (idx < WEAPON_KEYS.length) this._selectWeapon(WEAPON_KEYS[idx]);
      return;
    }
    if (key === ' ' && (this._phase === 'playing' || this._phase === 'aiming') && !this._aiActive) {
      const w = this._getActiveWorm();
      if (w && w.grounded) {
        w.vy = JUMP_FORCE;
        // Apply horizontal momentum based on held direction
        if (this._keys.has('a') || this._keys.has('arrowleft')) { w.vx = -MOVE_SPEED * 1.2; w.facing = -1; }
        else if (this._keys.has('d') || this._keys.has('arrowright')) { w.vx = MOVE_SPEED * 1.2; w.facing = 1; }
        w.grounded = false;
        this._playSound('jump');
      }
      return;
    }
    if (this._placingGirder && (key === 'arrowleft' || key === 'arrowright' || key === 'a' || key === 'd')) {
      this._girderAngle += ((key === 'arrowleft' || key === 'a') ? -1 : 1) * Math.PI / 8;
    }
  }

  private _handleMouseDown(): void {
    if (this._phase === 'title') { this._checkTitleButtons(); return; }
    if (this._phase === 'victory') { this._checkVictoryButtons(); return; }
    if (this._pauseMenuOpen) { this._checkPauseMenuClick(); return; }
    if (this._weaponSelectOpen) { this._checkWeaponSelectClick(); return; }
    if (this._teleportMode && (this._phase === 'playing' || this._phase === 'aiming')) { this._executeTeleport(); return; }
    if (this._placingGirder && (this._phase === 'playing' || this._phase === 'aiming')) { this._placeGirder(); return; }
    if ((this._phase === 'playing' || this._phase === 'aiming') && !this._aiActive) {
      this._phase = 'aiming'; this._charging = true; this._chargeTime = 0; this._power = 0;
    }
  }

  private _handleMouseUp(): void {
    if (this._charging && this._phase === 'aiming' && !this._aiActive) {
      this._fireWeapon(this._power); this._charging = false; this._chargeTime = 0;
    }
  }

  // ─── AUDIO ─────────────────────────────────────────────────────────────────

  private _initAudio(): void {
    try { this._audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { this._audioCtx = null; }
  }

  private _ensureAudioContext(): void {
    if (this._audioCtx && this._audioCtx.state === 'suspended') this._audioCtx.resume().catch(() => {});
  }

  private _startBackgroundMusic(): void {
    if (!this._audioCtx || this._bgMusicPlaying) return;
    this._ensureAudioContext();
    const ctx = this._audioCtx;
    try {
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.06;
      masterGain.connect(ctx.destination);
      this._bgMusicGain = masterGain;
      const melody = [262, 294, 330, 262, 330, 349, 392, 349, 330, 294, 262, 294, 262, 247, 262];
      const dur = 0.45;
      this._bgMusicPlaying = true;
      const playLoop = () => {
        if (!this._bgMusicPlaying || !this._audioCtx) return;
        const now = this._audioCtx.currentTime;
        for (let i = 0; i < melody.length; i++) {
          const osc = this._audioCtx.createOscillator();
          osc.type = 'triangle'; osc.frequency.value = melody[i];
          const g = this._audioCtx.createGain();
          g.gain.setValueAtTime(0.5, now + i * dur);
          g.gain.exponentialRampToValueAtTime(0.01, now + i * dur + dur * 0.9);
          osc.connect(g); g.connect(masterGain);
          osc.start(now + i * dur); osc.stop(now + i * dur + dur);
        }
        setTimeout(playLoop, melody.length * dur * 1000);
      };
      playLoop();
      // Ambient wind
      const windBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const windData = windBuf.getChannelData(0);
      for (let i = 0; i < windData.length; i++) windData[i] = (Math.random() * 2 - 1) * 0.5;
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = windBuf; windSrc.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'lowpass'; windFilter.frequency.value = 300;
      const windGain = ctx.createGain(); windGain.gain.value = 0.03;
      windSrc.connect(windFilter); windFilter.connect(windGain); windGain.connect(ctx.destination);
      windSrc.start(); this._windGainNode = windGain;
    } catch {}
  }

  private _stopBackgroundMusic(): void {
    this._bgMusicPlaying = false;
    if (this._bgMusicGain) { try { this._bgMusicGain.disconnect(); } catch {} this._bgMusicGain = null; }
    if (this._windGainNode) { try { this._windGainNode.disconnect(); } catch {} this._windGainNode = null; }
  }

  private _playSound(type: string): void {
    if (!this._audioCtx) return;
    this._ensureAudioContext();
    const ctx = this._audioCtx; const now = ctx.currentTime;
    try {
      switch (type) {
        case 'explosion': {
          const bs = ctx.sampleRate * 0.3; const buf = ctx.createBuffer(1, bs, ctx.sampleRate);
          const d = buf.getChannelData(0); for (let i = 0; i < bs; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bs, 2);
          const src = ctx.createBufferSource(); src.buffer = buf;
          const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.setValueAtTime(2000, now); flt.frequency.exponentialRampToValueAtTime(200, now + 0.3);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.5, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          src.connect(flt); flt.connect(g); g.connect(ctx.destination); src.start(now); src.stop(now + 0.3); break;
        }
        case 'big_explosion': {
          const bs = ctx.sampleRate * 0.6; const buf = ctx.createBuffer(1, bs, ctx.sampleRate);
          const d = buf.getChannelData(0); for (let i = 0; i < bs; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bs, 1.5);
          const src = ctx.createBufferSource(); src.buffer = buf;
          const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.setValueAtTime(400, now); flt.frequency.exponentialRampToValueAtTime(60, now + 0.6);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.7, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
          src.connect(flt); flt.connect(g); g.connect(ctx.destination); src.start(now); src.stop(now + 0.6); break;
        }
        case 'fire': {
          const osc = ctx.createOscillator(); osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.15); break;
        }
        case 'splash': {
          const bs = ctx.sampleRate * 0.4; const buf = ctx.createBuffer(1, bs, ctx.sampleRate);
          const d = buf.getChannelData(0); for (let i = 0; i < bs; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bs, 3) * 0.5;
          const src = ctx.createBufferSource(); src.buffer = buf;
          const flt = ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.setValueAtTime(800, now);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          src.connect(flt); flt.connect(g); g.connect(ctx.destination); src.start(now); src.stop(now + 0.4); break;
        }
        case 'victory': {
          [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = freq;
            const g = ctx.createGain(); g.gain.setValueAtTime(0, now + i * 0.15); g.gain.linearRampToValueAtTime(0.2, now + i * 0.15 + 0.05); g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.8);
            osc.connect(g); g.connect(ctx.destination); osc.start(now + i * 0.15); osc.stop(now + i * 0.15 + 0.8);
          }); break;
        }
        case 'turn': {
          const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 880;
          const g = ctx.createGain(); g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.2); break;
        }
        case 'click': {
          const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = 1200;
          const g = ctx.createGain(); g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.05); break;
        }
        case 'jump': {
          const osc = ctx.createOscillator(); osc.type = 'sine';
          osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.1); break;
        }
        case 'hit': {
          const osc = ctx.createOscillator(); osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.25, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.2); break;
        }
        case 'death': {
          const osc = ctx.createOscillator(); osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.25, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.5); break;
        }
        case 'bounce': {
          const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 300;
          const g = ctx.createGain(); g.gain.setValueAtTime(0.1, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.05); break;
        }
        case 'charge': {
          const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(200 + this._power * 800, now);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.05); break;
        }
        case 'sudden_death': {
          for (let i = 0; i < 3; i++) {
            const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = 800;
            const g = ctx.createGain(); g.gain.setValueAtTime(0, now + i * 0.3); g.gain.linearRampToValueAtTime(0.3, now + i * 0.3 + 0.05); g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.3 + 0.25);
            osc.connect(g); g.connect(ctx.destination); osc.start(now + i * 0.3); osc.stop(now + i * 0.3 + 0.25);
          } break;
        }
        case 'crate': {
          const osc = ctx.createOscillator(); osc.type = 'triangle';
          osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.15); break;
        }
      }
    } catch {}
  }

  // ─── BACKGROUND GENERATION ─────────────────────────────────────────────────

  private _generateBackgroundObjects(): void {
    this._stars = [];
    for (let i = 0; i < 200; i++) {
      this._stars.push({ x: Math.random() * TERRAIN_WIDTH, y: Math.random() * TERRAIN_HEIGHT * 0.4, size: randRange(0.5, 2.5), twinkleOffset: Math.random() * Math.PI * 2, twinkleSpeed: randRange(1, 4) });
    }
    this._clouds = [];
    for (let i = 0; i < 12; i++) {
      const bumps: number[] = []; const bc = randInt(3, 7); for (let j = 0; j < bc; j++) bumps.push(randRange(0.4, 1.0));
      this._clouds.push({ x: Math.random() * TERRAIN_WIDTH * 1.5, y: randRange(50, TERRAIN_HEIGHT * 0.35), width: randRange(120, 300), height: randRange(40, 80), speed: randRange(5, 20), opacity: randRange(0.15, 0.45), bumps });
    }
    this._mountains = [];
    for (let layer = 0; layer < 3; layer++) {
      const peaks: MountainPeak[] = []; const count = randInt(6, 12);
      for (let i = 0; i < count; i++) peaks.push({ x: (i / count) * TERRAIN_WIDTH + randRange(-100, 100), height: randRange(100, 250) * (1 - layer * 0.2), width: randRange(150, 400) });
      this._mountains.push(peaks);
    }
    this._castles = [];
    const castleCount = randInt(2, 4);
    for (let i = 0; i < castleCount; i++) {
      const tc = randInt(2, 5); const towers: CastleSilhouette['towers'] = []; const w = randRange(150, 300);
      const windows: CastleSilhouette['windows'] = []; const flags: CastleSilhouette['flags'] = [];
      for (let t = 0; t < tc; t++) {
        const tw = randRange(20, 40); const th = randRange(60, 130);
        towers.push({ xOff: (t / (tc - 1 || 1)) * w - w / 2, width: tw, height: th, battlement: Math.random() > 0.3 });
        // Add lit windows
        const winCount = randInt(1, 3);
        for (let wn = 0; wn < winCount; wn++) {
          windows.push({ tx: (t / (tc - 1 || 1)) * w - w / 2 + randRange(-tw * 0.3, tw * 0.3), ty: -th * randRange(0.3, 0.8) });
        }
        // Add flag on top
        if (Math.random() > 0.4) {
          flags.push({ tx: (t / (tc - 1 || 1)) * w - w / 2, ty: -th - 20, color: `hsl(${randRange(0, 360)}, 70%, 50%)` });
        }
      }
      this._castles.push({ x: (i + 0.5) / castleCount * TERRAIN_WIDTH + randRange(-200, 200), width: w, baseHeight: randRange(40, 70), towers, windows, flags });
    }
    this._trees = [];
    for (let layer = 0; layer < 2; layer++) {
      const treeLine: TreeSilhouette[] = []; const count = randInt(15, 30);
      for (let i = 0; i < count; i++) {
        const types: ('round' | 'pointed' | 'oak')[] = ['round', 'pointed', 'oak'];
        treeLine.push({ x: (i / count) * TERRAIN_WIDTH + randRange(-50, 50), height: randRange(40, 90) * (1 - layer * 0.2), width: randRange(30, 60), type: types[randInt(0, 2)] });
      }
      this._trees.push(treeLine);
    }
    // Birds
    this._birds = [];
    for (let i = 0; i < 3; i++) {
      this._birds.push({ x: randRange(-200, TERRAIN_WIDTH), y: randRange(50, TERRAIN_HEIGHT * 0.3), speed: randRange(30, 60), count: randInt(3, 7), phase: Math.random() * Math.PI * 2 });
    }
  }

  // ─── STATIC BACKGROUND ─────────────────────────────────────────────────────

  private _renderStaticBackground(): void {
    const ctx = this._bgCtx; const w = TERRAIN_WIDTH; const h = TERRAIN_HEIGHT;

    // Richer sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#050520');
    skyGrad.addColorStop(0.1, '#0a0a2e');
    skyGrad.addColorStop(0.2, '#1a1a4e');
    skyGrad.addColorStop(0.35, '#2d1b4e');
    skyGrad.addColorStop(0.45, '#4a1e5e');
    skyGrad.addColorStop(0.55, '#6b2d5b');
    skyGrad.addColorStop(0.62, '#a03e3e');
    skyGrad.addColorStop(0.7, '#c44e2e');
    skyGrad.addColorStop(0.78, '#e8842a');
    skyGrad.addColorStop(0.86, '#f0c040');
    skyGrad.addColorStop(0.93, '#f5e080');
    skyGrad.addColorStop(1.0, '#faf0b0');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Sun with radial gradient glow
    const sunX = w * 0.75; const sunY = h * 0.6;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 200);
    sunGrad.addColorStop(0, 'rgba(255, 250, 200, 1)');
    sunGrad.addColorStop(0.1, 'rgba(255, 230, 150, 0.9)');
    sunGrad.addColorStop(0.3, 'rgba(255, 200, 80, 0.4)');
    sunGrad.addColorStop(0.6, 'rgba(255, 150, 50, 0.1)');
    sunGrad.addColorStop(1, 'rgba(255, 100, 30, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(sunX - 200, sunY - 200, 400, 400);

    // God rays
    ctx.save();
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const rayLen = randRange(300, 600);
      const rayW = randRange(15, 40);
      ctx.fillStyle = '#fffae0';
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.cos(angle - 0.02) * rayLen, sunY + Math.sin(angle - 0.02) * rayLen);
      ctx.lineTo(sunX + Math.cos(angle + 0.02) * rayLen + Math.cos(angle + Math.PI / 2) * rayW, sunY + Math.sin(angle + 0.02) * rayLen + Math.sin(angle + Math.PI / 2) * rayW);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Stars
    for (const star of this._stars) {
      ctx.fillStyle = `rgba(255, 255, 240, ${0.5 + 0.5 * Math.sin(star.twinkleOffset)})`;
      ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill();
    }

    // Mountains with snow caps
    for (let layer = 0; layer < this._mountains.length; layer++) {
      const depth = layer / this._mountains.length; const alpha = 0.3 + depth * 0.2;
      const r = 30 + layer * 15; const g = 25 + layer * 10; const b = 50 + layer * 15;
      const baseY = h * (0.55 + layer * 0.08);

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, baseY);
      for (const peak of this._mountains[layer]) {
        ctx.lineTo(peak.x - peak.width / 2, baseY);
        ctx.lineTo(peak.x, baseY - peak.height);
        ctx.lineTo(peak.x + peak.width / 2, baseY);
      }
      ctx.lineTo(w, baseY); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();

      // Snow caps on peaks
      if (layer === 0) {
        ctx.fillStyle = `rgba(240, 245, 255, ${alpha * 0.8})`;
        for (const peak of this._mountains[layer]) {
          const snowH = peak.height * 0.2;
          ctx.beginPath();
          ctx.moveTo(peak.x, baseY - peak.height);
          ctx.lineTo(peak.x - peak.width * 0.12, baseY - peak.height + snowH);
          ctx.lineTo(peak.x + peak.width * 0.12, baseY - peak.height + snowH);
          ctx.closePath(); ctx.fill();
        }
      }
    }

    // Castles with lit windows and flags
    const castleBaseY = h * 0.65;
    for (const castle of this._castles) {
      ctx.fillStyle = 'rgba(25, 20, 40, 0.35)';
      ctx.fillRect(castle.x - castle.width / 2, castleBaseY - castle.baseHeight, castle.width, castle.baseHeight);
      for (const tower of castle.towers) {
        const tx = castle.x + tower.xOff; const ty = castleBaseY - castle.baseHeight - tower.height;
        ctx.fillRect(tx - tower.width / 2, ty, tower.width, tower.height + castle.baseHeight);
        if (tower.battlement) {
          const bw = tower.width * 0.3;
          for (let b = 0; b < 3; b++) ctx.fillRect(tx - tower.width / 2 + b * bw * 1.2, ty - 8, bw, 8);
        }
        ctx.beginPath(); ctx.moveTo(tx - tower.width / 2 - 3, ty); ctx.lineTo(tx, ty - 20); ctx.lineTo(tx + tower.width / 2 + 3, ty); ctx.closePath(); ctx.fill();
      }
      // Battlements on wall
      for (let b = 0; b < castle.width / 12; b++) {
        if (b % 2 === 0) ctx.fillRect(castle.x - castle.width / 2 + b * 12, castleBaseY - castle.baseHeight - 8, 10, 8);
      }
      // Lit windows
      for (const win of castle.windows) {
        const wx = castle.x + win.tx; const wy = castleBaseY - castle.baseHeight + win.ty;
        ctx.fillStyle = `rgba(${200 + randInt(0, 55)}, ${150 + randInt(0, 50)}, ${30 + randInt(0, 40)}, 0.7)`;
        ctx.fillRect(wx - 2, wy - 2, 4, 5);
      }
      // Flags on towers
      for (const flag of castle.flags) {
        const fx = castle.x + flag.tx; const fy = castleBaseY - castle.baseHeight + flag.ty;
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 15); ctx.stroke();
        ctx.fillStyle = flag.color;
        ctx.beginPath(); ctx.moveTo(fx, fy - 15); ctx.lineTo(fx + 10, fy - 12); ctx.lineTo(fx, fy - 9); ctx.closePath(); ctx.fill();
      }
    }

    // Trees
    for (let layer = 0; layer < this._trees.length; layer++) {
      const baseY = h * (0.7 + layer * 0.05); const alpha = 0.2 + layer * 0.15;
      ctx.fillStyle = `rgba(15, 25, 15, ${alpha})`;
      for (const tree of this._trees[layer]) {
        const tx = tree.x; const ty = baseY;
        if (tree.type === 'pointed') {
          ctx.beginPath(); ctx.moveTo(tx, ty - tree.height); ctx.lineTo(tx - tree.width / 2, ty); ctx.lineTo(tx + tree.width / 2, ty); ctx.closePath(); ctx.fill();
          ctx.fillRect(tx - 3, ty, 6, 10);
        } else if (tree.type === 'round') {
          ctx.beginPath(); ctx.arc(tx, ty - tree.height * 0.6, tree.width / 2, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(tx - 3, ty - tree.height * 0.3, 6, tree.height * 0.3);
        } else {
          const r = tree.width / 2;
          ctx.beginPath(); ctx.arc(tx - r * 0.4, ty - tree.height * 0.6, r * 0.7, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(tx + r * 0.4, ty - tree.height * 0.55, r * 0.65, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(tx, ty - tree.height * 0.75, r * 0.6, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(tx - 4, ty - tree.height * 0.35, 8, tree.height * 0.35);
        }
      }
    }
  }

  // ─── TERRAIN ───────────────────────────────────────────────────────────────

  private _generateTerrain(): void {
    this._terrainMask = new Uint8Array(TERRAIN_WIDTH * TERRAIN_HEIGHT);
    const heightMap: number[] = new Array(TERRAIN_WIDTH);
    for (let x = 0; x < TERRAIN_WIDTH; x++) {
      let h = TERRAIN_HEIGHT * 0.45;
      h += Math.sin(x * 0.002) * 120; h += Math.sin(x * 0.005 + 1.3) * 60;
      h += Math.sin(x * 0.01 + 2.7) * 30; h += Math.sin(x * 0.02 + 0.5) * 15;
      h += Math.sin(x * 0.04 + 3.1) * 8;
      const midDist = Math.abs(x - TERRAIN_WIDTH / 2) / (TERRAIN_WIDTH * 0.1);
      if (midDist < 1) { const flat = TERRAIN_HEIGHT * 0.5; h = lerp(flat, h, midDist); }
      h += Math.sin(x * 0.1 + x * 0.037) * 5;
      heightMap[x] = h;
    }
    for (let x = 0; x < TERRAIN_WIDTH; x++) {
      const surfaceY = Math.floor(heightMap[x]);
      for (let y = surfaceY; y < TERRAIN_HEIGHT; y++) this._terrainMask[y * TERRAIN_WIDTH + x] = 1;
    }
    // Caves
    const caveCount = randInt(5, 10);
    for (let c = 0; c < caveCount; c++) {
      const cx = randRange(200, TERRAIN_WIDTH - 200); const cy = randRange(TERRAIN_HEIGHT * 0.5, TERRAIN_HEIGHT * 0.85);
      const cw = randRange(30, 80); const ch = randRange(20, 50);
      for (let dx = -cw; dx <= cw; dx++) for (let dy = -ch; dy <= ch; dy++) {
        if ((dx / cw) * (dx / cw) + (dy / ch) * (dy / ch) <= 1) {
          const px = Math.floor(cx + dx); const py = Math.floor(cy + dy);
          if (px >= 0 && px < TERRAIN_WIDTH && py >= 0 && py < TERRAIN_HEIGHT) this._terrainMask[py * TERRAIN_WIDTH + px] = 0;
        }
      }
    }
    // Tunnels
    const tunnelCount = randInt(2, 5);
    for (let t = 0; t < tunnelCount; t++) {
      let tx = randRange(300, TERRAIN_WIDTH - 300); let ty = randRange(TERRAIN_HEIGHT * 0.55, TERRAIN_HEIGHT * 0.8);
      const angle = randRange(-0.3, 0.3); const length = randInt(80, 200); const radius = randRange(8, 18);
      for (let s = 0; s < length; s++) {
        tx += Math.cos(angle) * 2; ty += Math.sin(angle) * 2 + Math.sin(s * 0.05) * 0.5;
        for (let dx = -radius; dx <= radius; dx++) for (let dy = -radius; dy <= radius; dy++) {
          if (dx * dx + dy * dy <= radius * radius) {
            const px = Math.floor(tx + dx); const py = Math.floor(ty + dy);
            if (px >= 0 && px < TERRAIN_WIDTH && py >= 0 && py < TERRAIN_HEIGHT) this._terrainMask[py * TERRAIN_WIDTH + px] = 0;
          }
        }
      }
    }
    this._renderTerrainFull();
    this._terrainDirty = false;
  }

  private _renderTerrainFull(): void {
    const ctx = this._terrainCtx; const w = TERRAIN_WIDTH; const h = TERRAIN_HEIGHT;
    ctx.clearRect(0, 0, w, h);
    const imageData = ctx.createImageData(w, h); const pixels = imageData.data;

    // Pre-compute a seeded random for strata bands and gems
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (this._terrainMask[idx] === 0) continue;
        const pi = idx * 4;

        let surfaceDist = 0;
        for (let sy = y - 1; sy >= 0; sy--) {
          if (this._terrainMask[sy * w + x] === 0) { surfaceDist = y - sy; break; }
          if (y - sy > 100) { surfaceDist = 100; break; }
        }

        let r: number, g: number, b: number;
        if (surfaceDist <= 2) {
          r = 40 + Math.random() * 20; g = 120 + Math.random() * 40; b = 30 + Math.random() * 15;
        } else if (surfaceDist <= 8) {
          const t = (surfaceDist - 2) / 6;
          r = lerp(60, 100, t) + Math.random() * 10; g = lerp(110, 70, t) + Math.random() * 10; b = lerp(30, 30, t) + Math.random() * 5;
        } else if (surfaceDist <= 40) {
          const t = (surfaceDist - 8) / 32;
          r = lerp(100, 80, t) + Math.random() * 8; g = lerp(70, 55, t) + Math.random() * 8; b = lerp(30, 25, t) + Math.random() * 5;
        } else {
          r = 60 + Math.random() * 15; g = 40 + Math.random() * 10; b = 20 + Math.random() * 8;
          if (Math.random() < 0.02) { r += 30; g += 25; b += 20; }
        }

        // Rock strata bands
        if (surfaceDist > 15) {
          const strataPhase = Math.sin(y * 0.08 + x * 0.002) * 0.5 + Math.sin(y * 0.15) * 0.3;
          if (strataPhase > 0.4) { r += 12; g += 8; b += 5; }
          if (strataPhase < -0.4) { r -= 8; g -= 5; b -= 3; }
        }

        // Embedded gems/minerals (rare)
        if (surfaceDist > 20 && Math.random() < 0.001) {
          const gemType = Math.random();
          if (gemType < 0.33) { r = 80; g = 120; b = 220; } // blue
          else if (gemType < 0.66) { r = 80; g = 200; b = 100; } // green
          else { r = 160; g = 80; b = 200; } // purple
        }

        // Roots near grass layer
        if (surfaceDist > 3 && surfaceDist < 20) {
          const rootChance = Math.sin(x * 0.3 + surfaceDist * 0.5) * Math.cos(x * 0.17 + y * 0.1);
          if (rootChance > 0.85) { r = 70; g = 45; b = 20; }
        }

        const noise = (Math.random() - 0.5) * 10;
        pixels[pi] = clamp(r + noise, 0, 255);
        pixels[pi + 1] = clamp(g + noise, 0, 255);
        pixels[pi + 2] = clamp(b + noise, 0, 255);
        pixels[pi + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    this._drawGrassAndFlowers(ctx);
    this._drawMushrooms(ctx);
  }

  private _drawGrassAndFlowers(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (let x = 0; x < TERRAIN_WIDTH; x += 2) {
      let surfaceY = -1;
      for (let y = 0; y < TERRAIN_HEIGHT; y++) { if (this._terrainMask[y * TERRAIN_WIDTH + x] === 1) { surfaceY = y; break; } }
      if (surfaceY < 0 || surfaceY >= TERRAIN_HEIGHT - WATER_LEVEL) continue;
      if (surfaceY <= 0 || this._terrainMask[(surfaceY - 1) * TERRAIN_WIDTH + x] === 1) continue;

      const bladeHeight = randRange(4, 12); const lean = randRange(-3, 3);
      const greenVal = 100 + Math.random() * 80;
      ctx.strokeStyle = `rgb(${30 + Math.random() * 20}, ${greenVal}, ${20 + Math.random() * 15})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, surfaceY);
      ctx.quadraticCurveTo(x + lean * 0.5, surfaceY - bladeHeight * 0.6, x + lean, surfaceY - bladeHeight);
      ctx.stroke();

      // Wildflowers (occasional)
      if (Math.random() < 0.03) {
        const flowerColors = ['#ff4444', '#ffff44', '#ff44ff', '#4488ff', '#ff8844'];
        ctx.fillStyle = flowerColors[randInt(0, flowerColors.length - 1)];
        ctx.beginPath();
        ctx.arc(x + lean, surfaceY - bladeHeight - 1, randRange(1, 2.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private _drawMushrooms(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (let x = 20; x < TERRAIN_WIDTH - 20; x += randInt(80, 200)) {
      let surfaceY = -1;
      for (let y = 0; y < TERRAIN_HEIGHT; y++) { if (this._terrainMask[y * TERRAIN_WIDTH + x] === 1) { surfaceY = y; break; } }
      if (surfaceY < 0 || surfaceY >= TERRAIN_HEIGHT - WATER_LEVEL) continue;
      if (surfaceY <= 0 || this._terrainMask[(surfaceY - 1) * TERRAIN_WIDTH + x] === 1) continue;

      // Stem
      ctx.fillStyle = '#ddd8c0';
      ctx.fillRect(x - 1, surfaceY - 5, 2, 5);
      // Cap
      const capColor = Math.random() > 0.5 ? '#cc3333' : '#aa7733';
      ctx.fillStyle = capColor;
      ctx.beginPath(); ctx.arc(x, surfaceY - 5, 4, Math.PI, 0); ctx.fill();
      // Spots
      if (capColor === '#cc3333') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(x - 1, surfaceY - 6, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 1.5, surfaceY - 6.5, 0.8, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  private _renderTerrainRegion(x1: number, y1: number, x2: number, y2: number): void {
    x1 = clamp(Math.floor(x1) - 2, 0, TERRAIN_WIDTH - 1);
    y1 = clamp(Math.floor(y1) - 2, 0, TERRAIN_HEIGHT - 1);
    x2 = clamp(Math.ceil(x2) + 2, 0, TERRAIN_WIDTH);
    y2 = clamp(Math.ceil(y2) + 2, 0, TERRAIN_HEIGHT);
    const w = x2 - x1; const h = y2 - y1;
    if (w <= 0 || h <= 0) return;

    const imageData = this._terrainCtx.createImageData(w, h); const pixels = imageData.data;
    for (let ly = 0; ly < h; ly++) {
      for (let lx = 0; lx < w; lx++) {
        const gx = x1 + lx; const gy = y1 + ly;
        if (this._terrainMask[gy * TERRAIN_WIDTH + gx] === 0) continue;
        const pi = (ly * w + lx) * 4;
        let surfaceDist = 0;
        for (let sy = gy - 1; sy >= 0; sy--) { if (this._terrainMask[sy * TERRAIN_WIDTH + gx] === 0) { surfaceDist = gy - sy; break; } if (gy - sy > 100) { surfaceDist = 100; break; } }
        let r: number, g: number, b: number;
        if (surfaceDist <= 2) { r = 40 + Math.random() * 20; g = 120 + Math.random() * 40; b = 30 + Math.random() * 15; }
        else if (surfaceDist <= 8) { const t = (surfaceDist - 2) / 6; r = lerp(60, 100, t) + Math.random() * 10; g = lerp(110, 70, t) + Math.random() * 10; b = lerp(30, 30, t) + Math.random() * 5; }
        else if (surfaceDist <= 40) { const t = (surfaceDist - 8) / 32; r = lerp(100, 80, t) + Math.random() * 8; g = lerp(70, 55, t) + Math.random() * 8; b = lerp(30, 25, t) + Math.random() * 5; }
        else { r = 60 + Math.random() * 15; g = 40 + Math.random() * 10; b = 20 + Math.random() * 8; }
        if (surfaceDist > 15) { const sp = Math.sin(gy * 0.08 + gx * 0.002) * 0.5 + Math.sin(gy * 0.15) * 0.3; if (sp > 0.4) { r += 12; g += 8; b += 5; } if (sp < -0.4) { r -= 8; g -= 5; b -= 3; } }
        const noise = (Math.random() - 0.5) * 10;
        pixels[pi] = clamp(r + noise, 0, 255); pixels[pi + 1] = clamp(g + noise, 0, 255); pixels[pi + 2] = clamp(b + noise, 0, 255); pixels[pi + 3] = 255;
      }
    }
    this._terrainCtx.clearRect(x1, y1, w, h);
    this._terrainCtx.putImageData(imageData, x1, y1);

    // Re-draw grass
    this._terrainCtx.save();
    for (let x = x1; x < x2; x += 2) {
      let surfaceY = -1;
      for (let y = Math.max(0, y1 - 15); y < Math.min(TERRAIN_HEIGHT, y2 + 5); y++) { if (this._terrainMask[y * TERRAIN_WIDTH + x] === 1) { surfaceY = y; break; } }
      if (surfaceY < 0 || surfaceY < y1 - 15 || surfaceY > y2 + 5) continue;
      if (surfaceY <= 0 || this._terrainMask[(surfaceY - 1) * TERRAIN_WIDTH + x] === 1) continue;
      if (surfaceY >= TERRAIN_HEIGHT - WATER_LEVEL) continue;
      const bladeHeight = randRange(4, 12); const lean = randRange(-3, 3);
      this._terrainCtx.strokeStyle = `rgb(${30 + Math.random() * 20}, ${100 + Math.random() * 80}, ${20 + Math.random() * 15})`;
      this._terrainCtx.lineWidth = 1;
      this._terrainCtx.beginPath(); this._terrainCtx.moveTo(x, surfaceY);
      this._terrainCtx.quadraticCurveTo(x + lean * 0.5, surfaceY - bladeHeight * 0.6, x + lean, surfaceY - bladeHeight);
      this._terrainCtx.stroke();
    }
    this._terrainCtx.restore();
  }

  private _destroyTerrain(cx: number, cy: number, radius: number): void {
    const x1 = Math.max(0, Math.floor(cx - radius)); const y1 = Math.max(0, Math.floor(cy - radius));
    const x2 = Math.min(TERRAIN_WIDTH, Math.ceil(cx + radius)); const y2 = Math.min(TERRAIN_HEIGHT, Math.ceil(cy + radius));
    const r2 = radius * radius;
    for (let y = y1; y < y2; y++) for (let x = x1; x < x2; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) this._terrainMask[y * TERRAIN_WIDTH + x] = 0;
    }
    this._renderTerrainRegion(x1, y1, x2, y2);
  }

  private _isTerrainSolid(x: number, y: number): boolean {
    const ix = Math.floor(x); const iy = Math.floor(y);
    if (ix < 0 || ix >= TERRAIN_WIDTH || iy < 0 || iy >= TERRAIN_HEIGHT) return false;
    return this._terrainMask[iy * TERRAIN_WIDTH + ix] === 1;
  }

  private _findSurfaceY(x: number, startY: number = 0): number {
    const ix = clamp(Math.floor(x), 0, TERRAIN_WIDTH - 1);
    for (let y = Math.max(0, Math.floor(startY)); y < TERRAIN_HEIGHT; y++) {
      if (this._terrainMask[y * TERRAIN_WIDTH + ix] === 1) return y;
    }
    return TERRAIN_HEIGHT;
  }

  private _placeGirder(): void {
    const cx = Math.floor(this._mouseWorldX); const cy = Math.floor(this._mouseWorldY);
    const length = 60; const thickness = 6;
    const cos = Math.cos(this._girderAngle); const sin = Math.sin(this._girderAngle);
    for (let l = -length; l <= length; l++) for (let t = -thickness; t <= thickness; t++) {
      const px = Math.floor(cx + l * cos - t * sin); const py = Math.floor(cy + l * sin + t * cos);
      if (px >= 0 && px < TERRAIN_WIDTH && py >= 0 && py < TERRAIN_HEIGHT) this._terrainMask[py * TERRAIN_WIDTH + px] = 1;
    }
    this._renderTerrainRegion(cx - length - thickness, cy - length - thickness, cx + length + thickness, cy + length + thickness);
    this._placingGirder = false; this._useAmmo('girder'); this._endTurn();
  }

  private _addTerrain(cx: number, cy: number, radius: number): void {
    const x1 = Math.max(0, Math.floor(cx - radius)); const y1 = Math.max(0, Math.floor(cy - radius));
    const x2 = Math.min(TERRAIN_WIDTH, Math.ceil(cx + radius)); const y2 = Math.min(TERRAIN_HEIGHT, Math.ceil(cy + radius));
    const r2 = radius * radius;
    for (let y = y1; y < y2; y++) for (let x = x1; x < x2; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) this._terrainMask[y * TERRAIN_WIDTH + x] = 1;
    }
    this._renderTerrainRegion(x1, y1, x2, y2);
  }

  // ─── TEAMS / WORMS ─────────────────────────────────────────────────────────

  private _createTeams(): void {
    this._teams = [];
    for (let t = 0; t < this._teamCount; t++) {
      const cfg = TEAM_CONFIGS[t];
      const team: Team = { name: cfg.name, color: cfg.color, darkColor: cfg.darkColor, lightColor: cfg.lightColor, worms: [], ammo: new Map(), damageDealt: 0 };
      for (const [key, weapon] of Object.entries(WEAPONS)) { if (weapon.ammo !== -1) team.ammo.set(key, weapon.ammo); }
      for (let w = 0; w < 4; w++) {
        team.worms.push({ x: 0, y: 0, vx: 0, vy: 0, hp: WORM_HP, maxHp: WORM_HP, name: cfg.names[w], team: t, alive: true, facing: t % 2 === 0 ? 1 : -1, aimAngle: -Math.PI / 4, grounded: false, frozen: 0, poisoned: 0, animFrame: 0, animTimer: 0, breathTimer: Math.random() * Math.PI * 2, kills: 0 });
      }
      this._teams.push(team);
    }
    this._placeWorms();
  }

  private _placeWorms(): void {
    const spacing = TERRAIN_WIDTH / (this._teamCount + 1);
    for (let t = 0; t < this._teams.length; t++) {
      const team = this._teams[t]; const baseX = spacing * (t + 1);
      for (let w = 0; w < team.worms.length; w++) {
        const worm = team.worms[w]; const offsetX = (w - 1.5) * 50;
        const x = clamp(baseX + offsetX, 50, TERRAIN_WIDTH - 50); const y = this._findSurfaceY(x);
        worm.x = x; worm.y = y - WORM_RADIUS;
      }
    }
  }

  private _getActiveWorm(): Worm | null {
    if (this._teams.length === 0) return null;
    const team = this._teams[this._currentTeam]; if (!team) return null;
    const worm = team.worms[this._currentWormIndex]; if (!worm || !worm.alive) return null;
    return worm;
  }
  private _getAllWorms(): Worm[] { const all: Worm[] = []; for (const team of this._teams) for (const worm of team.worms) all.push(worm); return all; }
  private _getAliveWorms(): Worm[] { return this._getAllWorms().filter(w => w.alive); }

  // ─── WEAPON SELECTION ──────────────────────────────────────────────────────

  private _selectWeapon(key: string): void {
    const weapon = WEAPONS[key]; if (!weapon) return;
    const team = this._teams[this._currentTeam]; if (!team) return;
    if (weapon.ammo !== -1) { const ammo = team.ammo.get(key) ?? 0; if (ammo <= 0) return; }
    this._currentWeapon = key; this._weaponSelectOpen = false; this._teleportMode = false; this._placingGirder = false; this._rope.active = false;
    if (weapon.type === 'teleport') this._teleportMode = true;
    else if (key === 'girder') { this._placingGirder = true; this._girderAngle = 0; }
    this._playSound('click');
  }

  private _useAmmo(key: string): void {
    const weapon = WEAPONS[key]; if (!weapon || weapon.ammo === -1) return;
    const team = this._teams[this._currentTeam]; if (!team) return;
    const current = team.ammo.get(key) ?? 0; if (current > 0) team.ammo.set(key, current - 1);
  }

  // ─── TELEPORT ──────────────────────────────────────────────────────────────

  private _executeTeleport(): void {
    const worm = this._getActiveWorm(); if (!worm) return;
    const tx = this._mouseWorldX; const ty = this._mouseWorldY;
    if (this._isTerrainSolid(tx, ty)) return;
    this._spawnTeleportParticles(worm.x, worm.y);
    worm.x = tx; worm.y = ty; worm.vx = 0; worm.vy = 0;
    this._spawnTeleportParticles(worm.x, worm.y);
    this._teleportMode = false; this._useAmmo('teleport'); this._playSound('fire'); this._endTurn();
  }

  private _spawnTeleportParticles(x: number, y: number): void {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2; const speed = randRange(50, 200);
      this._particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: randRange(0.3, 0.8), maxLife: 0.8, color: `hsl(${randRange(180, 280)}, 100%, ${randRange(50, 80)}%)`, size: randRange(2, 5), gravity: false, type: 'spark' });
    }
  }

  // ─── WEAPON FIRING ─────────────────────────────────────────────────────────

  private _fireWeapon(power: number): void {
    const worm = this._getActiveWorm(); if (!worm) return;
    const weapon = WEAPONS[this._currentWeapon]; if (!weapon) return;
    this._playSound('fire');
    const aimAngle = worm.aimAngle;
    const dirX = Math.cos(aimAngle) * worm.facing; const dirY = Math.sin(aimAngle);
    const speed = (weapon.speed || 500) * Math.max(power, 0.1);

    switch (weapon.type) {
      case 'projectile': {
        this._projectiles.push({ x: worm.x + dirX * 20, y: worm.y - 10 + dirY * 20, vx: dirX * speed, vy: dirY * speed, type: this._currentWeapon, timer: 0, bounces: 0, owner: this._currentTeam, trail: [], active: true, angle: aimAngle });
        this._useAmmo(this._currentWeapon); this._phase = 'firing'; this._shotsFired++; break;
      }
      case 'grenade': {
        this._projectiles.push({ x: worm.x + dirX * 20, y: worm.y - 10 + dirY * 20, vx: dirX * speed, vy: dirY * speed, type: this._currentWeapon, timer: 0, bounces: 0, owner: this._currentTeam, trail: [], fuseTime: weapon.fuseTime || 3, clusterCount: weapon.clusterCount, active: true, angle: aimAngle });
        this._useAmmo(this._currentWeapon); this._phase = 'firing'; this._shotsFired++; break;
      }
      case 'hitscan': {
        if (this._currentWeapon === 'shotgun') this._fireShotgun(worm, aimAngle);
        else if (this._currentWeapon === 'dragon_breath') this._fireDragonBreath(worm, aimAngle);
        this._useAmmo(this._currentWeapon); this._shotsFired++; break;
      }
      case 'melee': { this._fireMelee(worm, aimAngle); this._useAmmo(this._currentWeapon); this._shotsFired++; break; }
      case 'placed': {
        if (this._currentWeapon === 'dynamite') {
          this._projectiles.push({ x: worm.x + worm.facing * 15, y: worm.y - 5, vx: 0, vy: 0, type: 'dynamite', timer: 0, bounces: 0, owner: this._currentTeam, trail: [], fuseTime: weapon.fuseTime || 4, active: true, angle: 0 });
          this._useAmmo(this._currentWeapon); this._phase = 'firing'; this._shotsFired++;
        } else if (this._currentWeapon === 'mine') {
          this._mines.push({ x: worm.x + worm.facing * 15, y: worm.y, team: this._currentTeam });
          this._useAmmo(this._currentWeapon); this._endTurn(); this._shotsFired++;
        }
        break;
      }
      case 'airstrike': {
        this._airStrikes.push({
          x: this._mouseWorldX,
          projectiles: this._currentWeapon === 'carpet_bomb' ? 12 : this._currentWeapon === 'air_strike' ? 5 : this._currentWeapon === 'grail_strike' ? 1 : this._currentWeapon === 'concrete_donkey' ? 1 : this._currentWeapon === 'meteor' ? 1 : 5,
          delay: this._currentWeapon === 'carpet_bomb' ? 0.08 : 0.15,
          timer: 0, spawned: 0, weaponKey: this._currentWeapon,
        });
        this._useAmmo(this._currentWeapon); this._phase = 'firing'; this._shotsFired++; break;
      }
      case 'strike': {
        if (this._currentWeapon === 'earthquake') { this._doEarthquake(); this._useAmmo(this._currentWeapon); this._shotsFired++; }
        else if (this._currentWeapon === 'excalibur') { this._doExcaliburStrike(this._mouseWorldX, this._mouseWorldY); this._useAmmo(this._currentWeapon); this._shotsFired++; }
        else if (this._currentWeapon === 'lightning_bolt') { this._doLightningStrike(this._mouseWorldX, this._mouseWorldY); this._useAmmo(this._currentWeapon); this._shotsFired++; }
        break;
      }
      case 'rope': { this._fireRope(worm, aimAngle); this._useAmmo(this._currentWeapon); break; }
      case 'teleport': break;
    }
  }

  // ─── SPECIALIZED WEAPONS ───────────────────────────────────────────────────

  private _fireShotgun(worm: Worm, aimAngle: number): void {
    const weapon = WEAPONS['shotgun'];
    for (let shot = 0; shot < 2; shot++) {
      const spread = (Math.random() - 0.5) * 0.1;
      const sdx = Math.cos(aimAngle + spread) * worm.facing; const sdy = Math.sin(aimAngle + spread);
      let hx = worm.x; let hy = worm.y - 10; let hitWorm: Worm | null = null; let hitTerrain = false;
      for (let step = 0; step < 600; step += 3) {
        hx = worm.x + sdx * step; hy = worm.y - 10 + sdy * step;
        if (this._isTerrainSolid(hx, hy)) { hitTerrain = true; break; }
        for (const w of this._getAliveWorms()) { if (w === worm) continue; if (dist(hx, hy, w.x, w.y - 10) < WORM_RADIUS + 5) { hitWorm = w; break; } }
        if (hitWorm) break;
      }
      const steps = dist(worm.x, worm.y - 10, hx, hy) / 10;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        this._particles.push({ x: lerp(worm.x + sdx * 20, hx, t), y: lerp(worm.y - 20, hy, t), vx: 0, vy: 0, life: 0.15, maxLife: 0.15, color: '#ffff44', size: 2, gravity: false, type: 'spark' });
      }
      if (hitWorm) this._damageWorm(hitWorm, weapon.damage, hx, hy, weapon.knockback, sdx, sdy, this._currentTeam);
      if (hitTerrain) this._destroyTerrain(hx, hy, weapon.radius);
    }
    this._phase = 'resolving'; this._resolveTimer = 0; this._resolvePhaseDelay = 1.0;
  }

  private _fireDragonBreath(worm: Worm, aimAngle: number): void {
    const weapon = WEAPONS['dragon_breath']; const coneAngle = 0.4; const range = 200;
    const dirX = Math.cos(aimAngle) * worm.facing; const dirY = Math.sin(aimAngle);
    for (let i = 0; i < 50; i++) {
      const a = aimAngle + (Math.random() - 0.5) * coneAngle; const dx = Math.cos(a) * worm.facing; const dy = Math.sin(a); const spd = randRange(200, 500);
      this._particles.push({ x: worm.x + dirX * 15, y: worm.y - 10 + dirY * 15, vx: dx * spd, vy: dy * spd, life: randRange(0.3, 0.7), maxLife: 0.7, color: `hsl(${randRange(0, 40)}, 100%, ${randRange(50, 80)}%)`, size: randRange(3, 8), gravity: false, type: 'fire' });
    }
    for (const w of this._getAliveWorms()) {
      if (w === worm) continue;
      const dx = w.x - worm.x; const dy = (w.y - 10) - (worm.y - 10); const d = Math.sqrt(dx * dx + dy * dy);
      if (d > range) continue;
      const angle = Math.atan2(dy, dx * worm.facing);
      if (Math.abs(angle - aimAngle) < coneAngle) this._damageWorm(w, weapon.damage, w.x, w.y, weapon.knockback, dirX, dirY, this._currentTeam);
    }
    this._phase = 'resolving'; this._resolveTimer = 0; this._resolvePhaseDelay = 1.0;
  }

  private _fireMelee(worm: Worm, aimAngle: number): void {
    const weapon = WEAPONS[this._currentWeapon]; const range = 40; const dirX = worm.facing;
    for (const w of this._getAliveWorms()) {
      if (w === worm) continue;
      const dx = w.x - worm.x; const dy = (w.y - 10) - (worm.y - 10); const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= range + WORM_RADIUS) {
        let kbx = dx / (d || 1); let kby = dy / (d || 1);
        if (this._currentWeapon === 'fire_punch') { kby = -1; kbx = worm.facing * 0.5; }
        else if (this._currentWeapon === 'lance_charge') { kbx = worm.facing; kby = -0.3; }
        this._damageWorm(w, weapon.damage, w.x, w.y, weapon.knockback, kbx, kby, this._currentTeam);
        for (let i = 0; i < 15; i++) {
          const pa = Math.random() * Math.PI * 2; const ps = randRange(50, 150);
          const color = this._currentWeapon === 'fire_punch' ? `hsl(${randRange(0, 40)}, 100%, 60%)` : this._currentWeapon === 'lance_charge' ? '#aaaaaa' : '#ffffff';
          this._particles.push({ x: w.x, y: w.y - 10, vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps, life: 0.3, maxLife: 0.3, color, size: randRange(2, 5), gravity: false, type: 'spark' });
        }
      }
    }
    if (this._currentWeapon === 'fire_punch') { worm.vx = worm.facing * 100; worm.vy = -50; }
    else if (this._currentWeapon === 'lance_charge') { worm.vx = worm.facing * 200; worm.vy = -30; worm.grounded = false; }
    this._phase = 'resolving'; this._resolveTimer = 0; this._resolvePhaseDelay = 1.0;
  }

  private _fireRope(worm: Worm, aimAngle: number): void {
    const dirX = Math.cos(aimAngle) * worm.facing; const dirY = Math.sin(aimAngle);
    let ax = worm.x; let ay = worm.y - 10;
    for (let step = 0; step < 400; step += 3) {
      ax = worm.x + dirX * step; ay = worm.y - 10 + dirY * step;
      if (this._isTerrainSolid(ax, ay)) {
        this._rope.active = true; this._rope.anchorX = ax; this._rope.anchorY = ay;
        this._rope.length = dist(worm.x, worm.y, ax, ay);
        this._rope.angle = Math.atan2(worm.y - ay, worm.x - ax); this._rope.angularVel = 0;
        return;
      }
    }
  }

  private _doEarthquake(): void {
    this._shakeAmount = 15; this._shakeTime = 2.0;
    for (const w of this._getAliveWorms()) {
      w.vy = -randRange(100, 250); w.vx = randRange(-100, 100); w.grounded = false;
      this._damageWorm(w, WEAPONS['earthquake'].damage, w.x, w.y, WEAPONS['earthquake'].knockback, 0, -1, this._currentTeam);
    }
    this._playSound('explosion');
    this._phase = 'resolving'; this._resolveTimer = 0; this._resolvePhaseDelay = 2.5;
  }

  private _doExcaliburStrike(tx: number, ty: number): void {
    const weapon = WEAPONS['excalibur'];
    for (let i = 0; i < 60; i++) {
      this._particles.push({ x: tx + randRange(-20, 20), y: ty - 600 + i * 10, vx: randRange(-30, 30), vy: randRange(100, 300), life: randRange(0.5, 1.5), maxLife: 1.5, color: `hsl(${randRange(40, 60)}, 100%, ${randRange(60, 90)}%)`, size: randRange(3, 8), gravity: false, type: 'spark' });
    }
    setTimeout(() => { this._createExplosion(tx, ty, weapon.radius, weapon.damage, weapon.knockback, this._currentTeam, 'excalibur'); }, 200);
    this._shakeAmount = 10; this._shakeTime = 0.5;
    this._phase = 'resolving'; this._resolveTimer = 0; this._resolvePhaseDelay = 1.5;
  }

  private _doLightningStrike(tx: number, ty: number): void {
    const weapon = WEAPONS['lightning_bolt'];
    for (let i = 0; i < 40; i++) {
      this._particles.push({ x: tx + randRange(-5, 5), y: ty - 800 + i * 20 + randRange(-10, 10), vx: randRange(-50, 50), vy: randRange(0, 100), life: randRange(0.1, 0.4), maxLife: 0.4, color: '#ffffff', size: randRange(2, 6), gravity: false, type: 'spark' });
    }
    for (let i = 0; i < 25; i++) {
      const a = Math.random() * Math.PI * 2; const s = randRange(50, 200);
      this._particles.push({ x: tx, y: ty, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: randRange(0.2, 0.5), maxLife: 0.5, color: `hsl(${randRange(200, 280)}, 100%, ${randRange(70, 100)}%)`, size: randRange(1, 4), gravity: false, type: 'spark' });
    }
    this._createExplosion(tx, ty, weapon.radius, weapon.damage, weapon.knockback, this._currentTeam, 'lightning_bolt');
    this._shakeAmount = 8; this._shakeTime = 0.3;
    this._phase = 'resolving'; this._resolveTimer = 0; this._resolvePhaseDelay = 1.0;
  }

  // ─── EXPLOSION ─────────────────────────────────────────────────────────────

  private _createExplosion(x: number, y: number, radius: number, damage: number, knockback: number, owner: number, weaponKey: string): void {
    this._destroyTerrain(x, y, radius);
    this._shakeAmount = Math.max(this._shakeAmount, radius * 0.2);
    this._shakeTime = Math.max(this._shakeTime, 0.3);

    // Big explosion gets bass rumble and screen flash
    if (radius >= 40) {
      this._playSound('big_explosion');
      this._screenFlashAlpha = 0.4;
      this._screenFlashTimer = 0.15;
    } else {
      this._playSound('explosion');
    }

    this._spawnExplosionParticles(x, y, radius);

    // Crater afterglow
    this._craterGlows.push({ x, y, radius: radius * 0.8, timer: 2.0, maxTimer: 2.0 });

    // Shockwave ring particle
    this._particles.push({ x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, color: 'rgba(255,255,200,0.6)', size: radius * 0.3, gravity: false, type: 'shockwave' });

    // Damage worms
    for (const w of this._getAliveWorms()) {
      const d = dist(x, y, w.x, w.y - 5);
      if (d < radius + WORM_RADIUS) {
        const dmgFactor = 1 - d / (radius + WORM_RADIUS);
        const dmg = Math.floor(damage * dmgFactor);
        const dx = (w.x - x) / (d || 1); const dy = ((w.y - 5) - y) / (d || 1);
        this._damageWorm(w, dmg, x, y, knockback * dmgFactor, dx, dy, owner);
        if (weaponKey === 'freeze_blast') w.frozen = 2;
        if (weaponKey === 'poison_strike') w.poisoned = 3;
      }
    }

    // Chain-detonate mines
    const minesToDetonate: { x: number; y: number; team: number }[] = [];
    this._mines = this._mines.filter(m => { if (dist(x, y, m.x, m.y) < radius + 20) { minesToDetonate.push(m); return false; } return true; });
    for (const m of minesToDetonate) {
      setTimeout(() => { this._createExplosion(m.x, m.y, WEAPONS['mine'].radius, WEAPONS['mine'].damage, WEAPONS['mine'].knockback, m.team, 'mine'); }, 100);
    }
  }

  private _spawnExplosionParticles(x: number, y: number, radius: number): void {
    const count = Math.floor(radius * 2);
    // Fire core
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2; const speed = randRange(50, radius * 5);
      this._particles.push({ x: x + randRange(-5, 5), y: y + randRange(-5, 5), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: randRange(0.3, 0.8), maxLife: 0.8, color: `hsl(${randRange(0, 50)}, 100%, ${randRange(50, 90)}%)`, size: randRange(2, 6), gravity: true, type: 'fire' });
    }
    // Sparks
    for (let i = 0; i < count * 0.5; i++) {
      const angle = Math.random() * Math.PI * 2; const speed = randRange(100, radius * 8);
      this._particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: randRange(0.2, 0.6), maxLife: 0.6, color: '#ffff88', size: randRange(1, 3), gravity: true, type: 'spark' });
    }
    // Smoke
    for (let i = 0; i < count * 0.3; i++) {
      const angle = Math.random() * Math.PI * 2; const speed = randRange(20, 60);
      this._particles.push({ x: x + randRange(-radius * 0.3, radius * 0.3), y: y + randRange(-radius * 0.3, radius * 0.3), vx: Math.cos(angle) * speed, vy: -Math.abs(Math.sin(angle)) * speed - 20, life: randRange(0.5, 1.5), maxLife: 1.5, color: `rgba(${80 + randInt(0, 40)}, ${70 + randInt(0, 30)}, ${60 + randInt(0, 30)}, 0.6)`, size: randRange(5, 15), gravity: false, type: 'smoke' });
    }
    // Debris
    for (let i = 0; i < count * 0.4; i++) {
      const angle = Math.random() * Math.PI * 2; const speed = randRange(80, radius * 6);
      this._particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 50, life: randRange(0.5, 1.2), maxLife: 1.2, color: `rgb(${80 + randInt(0, 40)}, ${50 + randInt(0, 30)}, ${20 + randInt(0, 20)})`, size: randRange(2, 5), gravity: true, type: 'debris', rotation: Math.random() * Math.PI * 2, rotSpeed: randRange(-10, 10) });
    }
    // Embers (float upward slowly)
    for (let i = 0; i < count * 0.6; i++) {
      this._particles.push({ x: x + randRange(-radius, radius), y: y + randRange(-radius * 0.5, 0), vx: randRange(-15, 15), vy: randRange(-40, -80), life: randRange(1.0, 3.0), maxLife: 3.0, color: `hsl(${randRange(15, 45)}, 100%, ${randRange(50, 80)}%)`, size: randRange(1, 3), gravity: false, type: 'ember' });
    }
  }

  // ─── DAMAGE ────────────────────────────────────────────────────────────────

  private _damageWorm(worm: Worm, damage: number, fromX: number, fromY: number, knockback: number, kbDirX: number, kbDirY: number, owner: number): void {
    if (!worm.alive) return;
    if (worm.frozen > 0) { damage = Math.floor(damage * 0.5); knockback *= 0.3; }
    worm.hp -= damage;

    // Track damage dealt
    if (owner >= 0 && owner < this._teams.length) this._teams[owner].damageDealt += damage;

    const kbMag = knockback; const len = Math.sqrt(kbDirX * kbDirX + kbDirY * kbDirY) || 1;
    worm.vx += (kbDirX / len) * kbMag; worm.vy += (kbDirY / len) * kbMag; worm.grounded = false;

    this._particles.push({ x: worm.x, y: worm.y - 30, vx: randRange(-20, 20), vy: -60, life: 1.5, maxLife: 1.5, color: '#ff3333', size: 14, gravity: false, type: 'text', text: `-${damage}` });
    this._playSound('hit');

    if (worm.hp <= 0) {
      worm.hp = 0; worm.alive = false;
      this._playSound('death');

      // Track kills
      if (owner >= 0 && owner < this._teams.length && owner !== worm.team) {
        const activeWorm = this._getActiveWorm();
        if (activeWorm) activeWorm.kills++;
      }

      // Kill feed entry
      const killerTeam = owner >= 0 && owner < this._teams.length ? this._teams[owner] : null;
      const victimTeam = this._teams[worm.team];
      this._killFeed.push({ text: `${killerTeam ? killerTeam.name : '???'} killed ${worm.name} (${victimTeam.name})`, color: victimTeam.color, timer: 6 });
      if (this._killFeed.length > 5) this._killFeed.shift();

      // Gravestone
      this._gravestones.push({ x: worm.x, y: worm.y, name: worm.name, teamColor: victimTeam.color });

      // Death particles
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2; const s = randRange(50, 150);
        this._particles.push({ x: worm.x, y: worm.y - 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: randRange(0.5, 1.0), maxLife: 1.0, color: this._teams[worm.team].color, size: randRange(3, 6), gravity: true, type: 'debris', rotation: Math.random() * Math.PI * 2, rotSpeed: randRange(-8, 8) });
      }
      this._spawnExplosionParticles(worm.x, worm.y - 5, 15);
    }
  }

  // ─── UPDATE LOOP ───────────────────────────────────────────────────────────

  private _update(dt: number): void {
    if (this._pauseMenuOpen) return;
    this._gameTime += dt; this._waterOffset += dt * 30; this._bgHueShift += dt * 2; this._crosshairPulse += dt * 5;
    if (this._shakeTime > 0) { this._shakeTime -= dt; if (this._shakeTime <= 0) this._shakeAmount = 0; }
    if (this._screenFlashTimer > 0) { this._screenFlashTimer -= dt; this._screenFlashAlpha *= 0.9; if (this._screenFlashTimer <= 0) this._screenFlashAlpha = 0; }

    // Update crater glows
    for (let i = this._craterGlows.length - 1; i >= 0; i--) { this._craterGlows[i].timer -= dt; if (this._craterGlows[i].timer <= 0) this._craterGlows.splice(i, 1); }

    // Update kill feed timers
    for (let i = this._killFeed.length - 1; i >= 0; i--) { this._killFeed[i].timer -= dt; if (this._killFeed[i].timer <= 0) this._killFeed.splice(i, 1); }

    // Update speech bubble
    if (this._speechBubble) { this._speechBubble.timer -= dt; if (this._speechBubble.timer <= 0) this._speechBubble = null; }

    // Birds
    for (const bird of this._birds) { bird.x += bird.speed * dt; bird.phase += dt * 3; if (bird.x > TERRAIN_WIDTH + 200) bird.x = -200; }

    this._updateParticles(dt);

    if (this._phase === 'title') { this._updateTitle(dt); return; }
    if (this._phase === 'victory') { this._updateVictory(dt); return; }
    if (this._flashTimer > 0) this._flashTimer -= dt;

    this._updateWormPhysics(dt);
    this._updateProjectiles(dt);
    this._updateAirStrikes(dt);
    if (this._rope.active) this._updateRope(dt);
    this._updateMines();
    this._updateSupplyCrates(dt);

    switch (this._phase) {
      case 'playing': case 'aiming': this._updatePlayingPhase(dt); break;
      case 'firing': this._updateFiringPhase(dt); break;
      case 'resolving': this._updateResolvingPhase(dt); break;
      case 'retreat': this._updateRetreatPhase(dt); break;
    }
    this._updateCamera(dt);
    this._checkWinCondition();
  }

  private _updateTitle(dt: number): void {
    this._titleTorchFlicker += dt * 10;
    for (const cloud of this._clouds) { cloud.x += cloud.speed * dt; if (cloud.x > TERRAIN_WIDTH * 1.5) cloud.x = -cloud.width; }
  }

  private _updateVictory(dt: number): void {
    if (Math.random() < 5 * dt) {
      this._particles.push({ x: randRange(this._camX - 400, this._camX + 400), y: this._camY - 300, vx: randRange(-50, 50), vy: randRange(50, 150), life: randRange(2, 4), maxLife: 4, color: `hsl(${randRange(0, 360)}, 100%, 60%)`, size: randRange(3, 7), gravity: true, type: 'debris', rotation: Math.random() * Math.PI * 2, rotSpeed: randRange(-5, 5) });
    }
  }

  private _updatePlayingPhase(dt: number): void {
    const worm = this._getActiveWorm();
    if (!worm) { this._advanceToNextWorm(); return; }
    this._turnTimer -= dt;
    if (this._turnTimer <= 0) { this._endTurn(); return; }
    if (this._charging) {
      this._chargeTime += dt; this._power = Math.min(this._chargeTime * CHARGE_RATE, MAX_POWER);
      if (this._chargeTime % 0.1 < dt) this._playSound('charge');
    }

    if (this._aiActive) { this._updateAI(dt); return; }

    // Player input — ground movement + air control
    if (!this._charging && !this._rope.active) {
      if (worm.grounded) {
        if (this._keys.has('a') || this._keys.has('arrowleft')) { worm.vx = -MOVE_SPEED; worm.facing = -1; }
        else if (this._keys.has('d') || this._keys.has('arrowright')) { worm.vx = MOVE_SPEED; worm.facing = 1; }
        else worm.vx = 0;
      } else {
        // Air control at 40% strength
        const airControl = MOVE_SPEED * 0.4;
        if (this._keys.has('a') || this._keys.has('arrowleft')) { worm.vx = clamp(worm.vx - airControl * dt * 8, -MOVE_SPEED * 1.2, MOVE_SPEED * 1.2); worm.facing = -1; }
        else if (this._keys.has('d') || this._keys.has('arrowright')) { worm.vx = clamp(worm.vx + airControl * dt * 8, -MOVE_SPEED * 1.2, MOVE_SPEED * 1.2); worm.facing = 1; }
      }
    }
    if (worm) {
      const dx = this._mouseWorldX - worm.x; const dy = this._mouseWorldY - (worm.y - 10);
      if (dx !== 0 || dy !== 0) {
        worm.facing = dx >= 0 ? 1 : -1;
        worm.aimAngle = clamp(Math.atan2(dy, Math.abs(dx)), -Math.PI / 2, Math.PI / 2);
      }
    }
    this._camTargetX = worm.x; this._camTargetY = worm.y;
  }

  private _updateFiringPhase(dt: number): void {
    if (this._projectiles.length > 0) {
      const activeProj = this._projectiles.find(p => p.active);
      if (activeProj) { this._camTargetX = activeProj.x; this._camTargetY = activeProj.y; }
    }
    if (!this._projectiles.some(p => p.active) && this._airStrikes.length === 0) {
      this._phase = 'resolving'; this._resolveTimer = 0; this._resolvePhaseDelay = 1.0;
    }
  }

  private _updateResolvingPhase(dt: number): void {
    this._resolveTimer += dt;
    let allSettled = true;
    for (const w of this._getAliveWorms()) { if (!w.grounded || Math.abs(w.vx) > 5 || Math.abs(w.vy) > 5) { allSettled = false; break; } }
    if (this._resolveTimer > this._resolvePhaseDelay && allSettled && this._projectiles.every(p => !p.active)) this._endTurn();
    if (this._resolveTimer > 8) this._endTurn();
  }

  private _updateRetreatPhase(dt: number): void {
    this._retreatTimer -= dt;
    const worm = this._getActiveWorm();
    if (worm && !this._aiActive) {
      if (worm.grounded) {
        if (this._keys.has('a') || this._keys.has('arrowleft')) { worm.vx = -MOVE_SPEED; worm.facing = -1; }
        else if (this._keys.has('d') || this._keys.has('arrowright')) { worm.vx = MOVE_SPEED; worm.facing = 1; }
        else worm.vx = 0;
      } else {
        const airControl = MOVE_SPEED * 0.4;
        if (this._keys.has('a') || this._keys.has('arrowleft')) { worm.vx = clamp(worm.vx - airControl * dt * 8, -MOVE_SPEED * 1.2, MOVE_SPEED * 1.2); worm.facing = -1; }
        else if (this._keys.has('d') || this._keys.has('arrowright')) { worm.vx = clamp(worm.vx + airControl * dt * 8, -MOVE_SPEED * 1.2, MOVE_SPEED * 1.2); worm.facing = 1; }
      }
      this._camTargetX = worm.x; this._camTargetY = worm.y;
    }
    if (this._retreatTimer <= 0) this._advanceToNextTeam();
  }

  // ─── TURN MANAGEMENT ──────────────────────────────────────────────────────

  private _endTurn(): void {
    this._charging = false; this._chargeTime = 0; this._rope.active = false;
    this._teleportMode = false; this._placingGirder = false; this._weaponSelectOpen = false;
    const worm = this._getActiveWorm();
    if (worm && worm.poisoned > 0) {
      worm.poisoned--;
      this._damageWorm(worm, 5, worm.x, worm.y, 0, 0, 0, -1);
      this._particles.push({ x: worm.x, y: worm.y - 30, vx: 0, vy: -40, life: 1.0, maxLife: 1.0, color: '#44ff44', size: 12, gravity: false, type: 'text', text: 'POISON -5' });
    }
    if (this._currentWeapon === 'shotgun' && this._shotgunShotsLeft > 0) { this._shotgunShotsLeft--; this._phase = 'playing'; return; }
    this._phase = 'retreat'; this._retreatTimer = RETREAT_TIME;
  }

  private _advanceToNextTeam(): void {
    this._turnNumber++;

    // Sudden death check
    if (this._turnNumber >= SUDDEN_DEATH_TURN && !this._suddenDeath) {
      this._suddenDeath = true;
      this._flashText = 'SUDDEN DEATH!';
      this._flashTimer = 3.0;
      this._playSound('sudden_death');
    }
    if (this._suddenDeath) {
      this._suddenDeathWaterExtra += 2;
    }

    // Supply crate drop every N turns
    if (this._turnNumber > 0 && this._turnNumber % SUPPLY_DROP_INTERVAL === 0) {
      const cx = randRange(200, TERRAIN_WIDTH - 200);
      this._supplyCrates.push({ x: cx, y: -30, vy: 0, landed: false, parachuteOpen: true });
    }

    for (const w of this._getAliveWorms()) { if (w.frozen > 0) w.frozen--; }

    let nextTeam = (this._currentTeam + 1) % this._teams.length; let attempts = 0;
    while (attempts < this._teams.length) { if (this._teams[nextTeam].worms.some(w => w.alive)) break; nextTeam = (nextTeam + 1) % this._teams.length; attempts++; }
    this._currentTeam = nextTeam;
    this._advanceToNextWorm();
    this._wind = randRange(-1, 1);
    this._turnTimer = TURN_TIME; this._currentWeapon = 'bazooka'; this._phase = 'playing'; this._shotsFired = 0;

    // Determine AI vs human
    this._aiActive = !this._teamIsHuman[this._currentTeam];
    this._aiPhase = 'thinking'; this._aiTimer = 0;

    const worm = this._getActiveWorm();
    if (worm) {
      this._flashText = `${this._teams[this._currentTeam].name}: ${worm.name}'s turn`;
      this._flashTimer = 2.0;
      this._camTargetX = worm.x; this._camTargetY = worm.y;
      // Speech bubble
      this._speechBubble = { text: MEDIEVAL_QUIPS[randInt(0, MEDIEVAL_QUIPS.length - 1)], timer: 2.0, x: worm.x, y: worm.y - 60 };
    }
    this._playSound('turn');
  }

  private _advanceToNextWorm(): void {
    const team = this._teams[this._currentTeam]; if (!team) return;
    let startIdx = this._currentWormIndex;
    for (let i = 0; i < team.worms.length; i++) {
      const idx = (startIdx + 1 + i) % team.worms.length;
      if (team.worms[idx].alive) { this._currentWormIndex = idx; return; }
    }
  }

  private _cycleCameraToNextWorm(): void {
    const allAlive = this._getAliveWorms(); if (allAlive.length === 0) return;
    const others = allAlive.filter(w => w.team !== this._currentTeam);
    const target = others.length > 0 ? others[randInt(0, others.length - 1)] : allAlive[0];
    this._camTargetX = target.x; this._camTargetY = target.y;
  }

  // ─── SUPPLY CRATES ─────────────────────────────────────────────────────────

  private _updateSupplyCrates(dt: number): void {
    for (let i = this._supplyCrates.length - 1; i >= 0; i--) {
      const crate = this._supplyCrates[i];
      if (!crate.landed) {
        crate.vy += GRAVITY * 0.2 * dt; // Slow fall with parachute
        crate.y += crate.vy * dt;
        if (this._isTerrainSolid(crate.x, crate.y + 10)) { crate.landed = true; crate.vy = 0; crate.parachuteOpen = false; }
        if (crate.y > TERRAIN_HEIGHT) { this._supplyCrates.splice(i, 1); continue; }
      }
      // Check if a worm walks over it
      for (const w of this._getAliveWorms()) {
        if (dist(w.x, w.y, crate.x, crate.y) < 25) {
          // Give random ammo
          const team = this._teams[w.team];
          const limitedWeapons = WEAPON_KEYS.filter(k => WEAPONS[k].ammo !== -1);
          const rk = limitedWeapons[randInt(0, limitedWeapons.length - 1)];
          const cur = team.ammo.get(rk) ?? 0;
          team.ammo.set(rk, cur + 1);
          this._killFeed.push({ text: `${w.name} found ${WEAPONS[rk].name}!`, color: '#ffdd44', timer: 4 });
          this._playSound('crate');
          this._supplyCrates.splice(i, 1);
          break;
        }
      }
    }
  }

  // ─── AI ────────────────────────────────────────────────────────────────────

  private _updateAI(dt: number): void {
    const worm = this._getActiveWorm();
    if (!worm) { this._advanceToNextWorm(); return; }
    if (worm.frozen > 0) { this._aiTimer += dt; if (this._aiTimer > 1.0) this._endTurn(); return; }
    this._aiTimer += dt;
    switch (this._aiPhase) {
      case 'thinking': {
        if (this._aiTimer > 0.8) { this._aiSelectWeapon(worm); this._aiPhase = 'moving'; this._aiTimer = 0; this._aiMoveTime = randRange(0, 1.0); this._aiMoveDir = Math.random() > 0.5 ? 1 : -1; }
        break;
      }
      case 'moving': {
        if (this._aiTimer < this._aiMoveTime && worm.grounded) { worm.vx = this._aiMoveDir * MOVE_SPEED; worm.facing = this._aiMoveDir; }
        else { worm.vx = 0; this._aiPhase = 'aiming'; this._aiTimer = 0; this._aiCalculateShot(worm); }
        this._camTargetX = worm.x; this._camTargetY = worm.y; break;
      }
      case 'aiming': {
        worm.aimAngle = lerp(worm.aimAngle, this._aiTargetAngle, dt * 1.5);
        if (this._aiTimer > 1.0) { this._aiPhase = 'firing'; this._aiTimer = 0; }
        break;
      }
      case 'firing': {
        const weapon = WEAPONS[this._currentWeapon]; if (!weapon) { this._endTurn(); return; }
        if (weapon.type === 'teleport') {
          const tx = worm.x + randRange(-200, 200); const ty = this._findSurfaceY(tx) - WORM_RADIUS;
          this._spawnTeleportParticles(worm.x, worm.y); worm.x = tx; worm.y = ty; this._spawnTeleportParticles(worm.x, worm.y);
          this._useAmmo('teleport'); this._playSound('fire'); this._endTurn(); return;
        }
        if (weapon.type === 'strike') {
          const target = this._findNearestEnemy(worm);
          if (target) {
            if (this._currentWeapon === 'earthquake') this._doEarthquake();
            else if (this._currentWeapon === 'excalibur') this._doExcaliburStrike(target.x, target.y);
            else if (this._currentWeapon === 'lightning_bolt') this._doLightningStrike(target.x, target.y);
            this._useAmmo(this._currentWeapon);
          } else this._endTurn();
          return;
        }
        if (weapon.type === 'airstrike') {
          const target = this._findNearestEnemy(worm);
          if (target) {
            this._airStrikes.push({ x: target.x, projectiles: this._currentWeapon === 'carpet_bomb' ? 12 : this._currentWeapon === 'air_strike' ? 5 : this._currentWeapon === 'concrete_donkey' ? 1 : this._currentWeapon === 'meteor' ? 1 : this._currentWeapon === 'grail_strike' ? 1 : 5, delay: this._currentWeapon === 'carpet_bomb' ? 0.08 : 0.15, timer: 0, spawned: 0, weaponKey: this._currentWeapon });
            this._useAmmo(this._currentWeapon); this._phase = 'firing';
          } else this._endTurn();
          return;
        }
        if (weapon.type === 'melee') { this._fireMelee(worm, worm.aimAngle); this._useAmmo(this._currentWeapon); return; }
        if (weapon.type === 'hitscan') {
          if (this._currentWeapon === 'shotgun') this._fireShotgun(worm, worm.aimAngle);
          else if (this._currentWeapon === 'dragon_breath') this._fireDragonBreath(worm, worm.aimAngle);
          this._useAmmo(this._currentWeapon); return;
        }
        if (weapon.type === 'placed') {
          if (this._currentWeapon === 'dynamite') {
            this._projectiles.push({ x: worm.x + worm.facing * 15, y: worm.y - 5, vx: 0, vy: 0, type: 'dynamite', timer: 0, bounces: 0, owner: this._currentTeam, trail: [], fuseTime: weapon.fuseTime || 4, active: true, angle: 0 });
            this._useAmmo(this._currentWeapon); this._phase = 'firing';
          } else if (this._currentWeapon === 'mine') {
            this._mines.push({ x: worm.x + worm.facing * 20, y: worm.y, team: this._currentTeam }); this._useAmmo(this._currentWeapon); this._endTurn();
          } else if (this._currentWeapon === 'girder') {
            const gx = worm.x + worm.facing * 40; const gy = worm.y - 30;
            for (let lx = -30; lx <= 30; lx++) for (let ly = -3; ly <= 3; ly++) { const px = Math.floor(gx + lx); const py = Math.floor(gy + ly); if (px >= 0 && px < TERRAIN_WIDTH && py >= 0 && py < TERRAIN_HEIGHT) this._terrainMask[py * TERRAIN_WIDTH + px] = 1; }
            this._renderTerrainRegion(gx - 35, gy - 8, gx + 35, gy + 8); this._useAmmo(this._currentWeapon); this._endTurn();
          }
          return;
        }
        this._playSound('fire'); this._fireWeaponAI(worm, this._aiTargetPower); this._aiPhase = 'waiting'; this._aiTimer = 0; break;
      }
      case 'waiting': { if (this._aiTimer > 0.5 && this._phase === 'playing') this._endTurn(); break; }
    }
  }

  private _aiSelectWeapon(worm: Worm): void {
    const team = this._teams[worm.team]; const target = this._findNearestEnemy(worm);
    const targetDist = target ? dist(worm.x, worm.y, target.x, target.y) : 1000;
    const candidates: { key: string; weight: number }[] = [];
    for (const [key, weapon] of Object.entries(WEAPONS)) {
      if (weapon.ammo !== -1) { const ammo = team.ammo.get(key) ?? 0; if (ammo <= 0) continue; }
      let weight = 1;
      if (weapon.type === 'projectile') weight += 3; if (weapon.type === 'grenade') weight += 2;
      if (weapon.type === 'melee') { if (targetDist < 50) weight += 5; else weight = 0; }
      if (weapon.type === 'airstrike') weight += 1;
      weight += weapon.damage / 30;
      if (weapon.type === 'teleport' || weapon.type === 'rope' || key === 'girder') weight = 0.3;
      if (weight > 0) candidates.push({ key, weight });
    }
    const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
    let r = Math.random() * totalWeight; let selected = 'bazooka';
    for (const c of candidates) { r -= c.weight; if (r <= 0) { selected = c.key; break; } }
    this._currentWeapon = selected;
  }

  private _aiCalculateShot(worm: Worm): void {
    const target = this._findNearestEnemy(worm);
    if (!target) { this._aiTargetAngle = -Math.PI / 4; this._aiTargetPower = 0.5; return; }
    const dx = target.x - worm.x; const dy = (target.y - 10) - (worm.y - 10); const d = Math.sqrt(dx * dx + dy * dy);
    worm.facing = dx >= 0 ? 1 : -1;
    const weapon = WEAPONS[this._currentWeapon]; const speed = weapon.speed || 500;
    const absDx = Math.abs(dx);
    let angle = Math.atan2(dy - d * 0.3, absDx); angle = clamp(angle, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1); angle += randRange(-0.15, 0.15);
    let power = clamp(d / (speed * 1.2), 0.2, 1.0); power += randRange(-0.1, 0.1); power = clamp(power, 0.1, 1.0);
    this._aiTargetAngle = angle; this._aiTargetPower = power;
  }

  private _fireWeaponAI(worm: Worm, power: number): void {
    const weapon = WEAPONS[this._currentWeapon]; if (!weapon) return;
    const aimAngle = worm.aimAngle; const dirX = Math.cos(aimAngle) * worm.facing; const dirY = Math.sin(aimAngle);
    const speed = (weapon.speed || 500) * Math.max(power, 0.1);
    if (weapon.type === 'projectile' || weapon.type === 'grenade') {
      this._projectiles.push({ x: worm.x + dirX * 20, y: worm.y - 10 + dirY * 20, vx: dirX * speed, vy: dirY * speed, type: this._currentWeapon, timer: 0, bounces: 0, owner: this._currentTeam, trail: [], fuseTime: weapon.fuseTime, clusterCount: weapon.clusterCount, active: true, angle: aimAngle });
      this._useAmmo(this._currentWeapon); this._phase = 'firing';
    }
  }

  private _findNearestEnemy(worm: Worm): Worm | null {
    let nearest: Worm | null = null; let nearestDist = Infinity;
    for (const w of this._getAliveWorms()) { if (w.team === worm.team) continue; const d = dist(worm.x, worm.y, w.x, w.y); if (d < nearestDist) { nearestDist = d; nearest = w; } }
    return nearest;
  }

  // ─── PHYSICS ───────────────────────────────────────────────────────────────

  private _updateWormPhysics(dt: number): void {
    for (const w of this._getAllWorms()) {
      if (!w.alive) continue;
      w.breathTimer += dt * 2.5;
      const key = `${w.team}_${w.name}`;
      if (!w.grounded) { const prevVel = this._wormFallVelocities.get(key) || 0; this._wormFallVelocities.set(key, Math.max(prevVel, w.vy)); }
      if (!w.grounded) w.vy += GRAVITY * dt;
      w.x += w.vx * dt; w.y += w.vy * dt;
      if (w.grounded) { w.vx *= 0.85; if (Math.abs(w.vx) < 1) w.vx = 0; } else w.vx *= 0.99;

      w.grounded = false;
      if (this._isTerrainSolid(w.x, w.y + WORM_RADIUS)) {
        let pushUp = 0; while (pushUp < 20 && this._isTerrainSolid(w.x, w.y + WORM_RADIUS - pushUp)) pushUp++;
        w.y -= pushUp; w.grounded = true;
        const fallVel = this._wormFallVelocities.get(key) || 0;
        if (fallVel > FALL_DAMAGE_THRESHOLD) { const dmg = Math.floor((fallVel - FALL_DAMAGE_THRESHOLD) * FALL_DAMAGE_MULTIPLIER); if (dmg > 0) this._damageWorm(w, dmg, w.x, w.y, 0, 0, 0, -1); }
        this._wormFallVelocities.delete(key);
        if (w.vy > 0) w.vy = 0;
      }
      if (this._isTerrainSolid(w.x, w.y - WORM_RADIUS)) { w.y += 2; if (w.vy < 0) w.vy = 0; }
      if (this._isTerrainSolid(w.x + WORM_RADIUS, w.y)) { w.x -= 2; w.vx = 0; }
      if (this._isTerrainSolid(w.x - WORM_RADIUS, w.y)) { w.x += 2; w.vx = 0; }
      if (w.grounded && Math.abs(w.vx) > 5) {
        if (this._isTerrainSolid(w.x + Math.sign(w.vx) * WORM_RADIUS, w.y - 2)) {
          if (!this._isTerrainSolid(w.x + Math.sign(w.vx) * WORM_RADIUS, w.y - 8)) w.y -= 4; else w.vx = 0;
        }
      }
      w.x = clamp(w.x, WORM_RADIUS, TERRAIN_WIDTH - WORM_RADIUS);

      // Water death (with sudden death water rise)
      const waterY = TERRAIN_HEIGHT - WATER_LEVEL - this._suddenDeathWaterExtra;
      if (w.y > waterY) {
        if (w.alive) {
          w.alive = false; w.hp = 0;
          this._playSound('splash'); this._spawnWaterSplash(w.x, waterY); this._playSound('death');
          this._gravestones.push({ x: w.x, y: waterY, name: w.name, teamColor: this._teams[w.team].color });
          this._killFeed.push({ text: `${w.name} drowned!`, color: this._teams[w.team].color, timer: 5 });
          // Bubbles
          for (let b = 0; b < 10; b++) {
            this._particles.push({ x: w.x + randRange(-10, 10), y: waterY + randRange(5, 30), vx: randRange(-5, 5), vy: randRange(-30, -60), life: randRange(0.5, 1.5), maxLife: 1.5, color: 'rgba(200, 230, 255, 0.6)', size: randRange(2, 5), gravity: false, type: 'bubble' });
          }
        }
      }
      w.animTimer += dt; if (w.animTimer > 0.15) { w.animTimer = 0; w.animFrame = (w.animFrame + 1) % 4; }
    }
  }

  private _spawnWaterSplash(x: number, y: number): void {
    for (let i = 0; i < 30; i++) {
      const angle = -Math.PI / 2 + randRange(-0.8, 0.8); const speed = randRange(100, 300);
      this._particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: randRange(0.3, 0.8), maxLife: 0.8, color: `hsl(${randRange(190, 220)}, 80%, ${randRange(50, 80)}%)`, size: randRange(2, 5), gravity: true, type: 'circle' });
    }
  }

  // ─── PROJECTILES ───────────────────────────────────────────────────────────

  private _updateProjectiles(dt: number): void {
    for (const proj of this._projectiles) {
      if (!proj.active) continue;
      proj.timer += dt; proj.vy += GRAVITY * dt;
      const weapon = WEAPONS[proj.type];
      if (weapon && weapon.windAffected) proj.vx += this._wind * 100 * dt;
      proj.x += proj.vx * dt; proj.y += proj.vy * dt;
      proj.angle = Math.atan2(proj.vy, proj.vx);
      if (proj.trail.length === 0 || dist(proj.x, proj.y, proj.trail[proj.trail.length - 1].x, proj.trail[proj.trail.length - 1].y) > 5) {
        proj.trail.push({ x: proj.x, y: proj.y }); if (proj.trail.length > 30) proj.trail.shift();
      }
      if (Math.random() < 0.3) {
        let trailColor = '#ffaa33';
        if (proj.type === 'holy_hand_grenade') trailColor = '#ffff88';
        else if (proj.type === 'freeze_blast') trailColor = '#88ddff';
        else if (proj.type === 'poison_strike') trailColor = '#88ff88';
        else if (proj.type === 'mole_bomb') trailColor = '#884422';
        else if (proj.type === 'holy_water') trailColor = '#4488ff';
        this._particles.push({ x: proj.x, y: proj.y, vx: randRange(-20, 20), vy: randRange(-20, 20), life: 0.3, maxLife: 0.3, color: trailColor, size: randRange(1, 3), gravity: false, type: 'smoke' });
      }
      if (proj.x < -50 || proj.x > TERRAIN_WIDTH + 50 || proj.y > TERRAIN_HEIGHT + 50) { proj.active = false; continue; }

      if (this._isTerrainSolid(proj.x, proj.y)) {
        if (weapon && weapon.type === 'grenade') {
          if (proj.bounces < 5) {
            proj.bounces++;
            const td = 3;
            const sL = this._isTerrainSolid(proj.x - td, proj.y); const sR = this._isTerrainSolid(proj.x + td, proj.y);
            const sU = this._isTerrainSolid(proj.x, proj.y - td); const sD = this._isTerrainSolid(proj.x, proj.y + td);
            if (sD && !sU) { proj.vy = -Math.abs(proj.vy) * 0.5; proj.y -= 3; } else if (sU && !sD) { proj.vy = Math.abs(proj.vy) * 0.5; proj.y += 3; } else proj.vy = -proj.vy * 0.5;
            if (sL && !sR) { proj.vx = Math.abs(proj.vx) * 0.5; proj.x += 3; } else if (sR && !sL) { proj.vx = -Math.abs(proj.vx) * 0.5; proj.x -= 3; } else proj.vx = -proj.vx * 0.5;
            proj.vx *= 0.7; proj.vy *= 0.7; this._playSound('bounce');
            if (Math.abs(proj.vx) < 5 && Math.abs(proj.vy) < 5) { proj.vx = 0; proj.vy = 0; }
          }
        } else if (proj.type === 'mole_bomb') {
          this._destroyTerrain(proj.x, proj.y, 8); proj.vy = Math.max(proj.vy, 50);
          if (proj.timer > 3) { this._createExplosion(proj.x, proj.y, weapon!.radius, weapon!.damage, weapon!.knockback, proj.owner, proj.type); proj.active = false; }
          continue;
        } else if (proj.type === 'sheep') {
          let pushed = false;
          for (let i = 0; i < 20; i++) { if (!this._isTerrainSolid(proj.x, proj.y - i)) { proj.y -= i; proj.vy = 0; pushed = true; break; } }
          if (!pushed) { this._createExplosion(proj.x, proj.y, weapon!.radius, weapon!.damage, weapon!.knockback, proj.owner, proj.type); proj.active = false; continue; }
          proj.vx = (proj.vx > 0 ? 1 : -1) * 80;
          for (const w of this._getAliveWorms()) {
            if (dist(proj.x, proj.y, w.x, w.y) < 30) { this._createExplosion(proj.x, proj.y, weapon!.radius, weapon!.damage, weapon!.knockback, proj.owner, proj.type); proj.active = false; break; }
          }
          if (proj.timer > 6) { this._createExplosion(proj.x, proj.y, weapon!.radius, weapon!.damage, weapon!.knockback, proj.owner, proj.type); proj.active = false; }
          continue;
        } else {
          if (weapon) this._createExplosion(proj.x, proj.y, weapon.radius, weapon.damage, weapon.knockback, proj.owner, proj.type);
          proj.active = false; continue;
        }
      }
      // Grenade fuse
      if (proj.fuseTime !== undefined && proj.timer >= proj.fuseTime) {
        if (weapon) {
          this._createExplosion(proj.x, proj.y, weapon.radius, weapon.damage, weapon.knockback, proj.owner, proj.type);
          if (proj.clusterCount && proj.clusterCount > 0) {
            for (let c = 0; c < proj.clusterCount; c++) {
              const angle = -Math.PI / 2 + randRange(-0.8, 0.8); const speed = randRange(150, 350);
              this._projectiles.push({ x: proj.x, y: proj.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, type: proj.type, timer: 0, bounces: 0, owner: proj.owner, trail: [], fuseTime: randRange(0.5, 1.5), active: true, angle });
            }
          }
        }
        proj.active = false; continue;
      }
      // Dynamite
      if (proj.type === 'dynamite') {
        proj.vx = 0;
        if (Math.random() < 0.5) this._particles.push({ x: proj.x, y: proj.y - 8, vx: randRange(-30, 30), vy: randRange(-60, -20), life: 0.3, maxLife: 0.3, color: '#ffaa00', size: randRange(1, 3), gravity: false, type: 'spark' });
      }
      // Direct hit for projectiles
      if (weapon && weapon.type === 'projectile' && proj.type !== 'sheep') {
        for (const w of this._getAliveWorms()) {
          if (dist(proj.x, proj.y, w.x, w.y - 5) < WORM_RADIUS + 5) { this._createExplosion(proj.x, proj.y, weapon.radius, weapon.damage, weapon.knockback, proj.owner, proj.type); proj.active = false; break; }
        }
      }
    }
    this._projectiles = this._projectiles.filter(p => p.active);
  }

  private _updateAirStrikes(dt: number): void {
    for (let i = this._airStrikes.length - 1; i >= 0; i--) {
      const as = this._airStrikes[i]; as.timer += dt;
      if (as.timer >= as.delay * as.spawned && as.spawned < as.projectiles) {
        const weapon = WEAPONS[as.weaponKey]; if (!weapon) continue;
        let px: number; let py = -50; let pvx = 0; let pvy = 300;
        if (as.weaponKey === 'carpet_bomb') { px = as.x + (as.spawned - as.projectiles / 2) * 25; pvy = 400; }
        else if (as.weaponKey === 'concrete_donkey') { px = as.x; pvy = 500; }
        else if (as.weaponKey === 'meteor') { px = as.x + randRange(-30, 30); pvy = 600; }
        else if (as.weaponKey === 'grail_strike') { px = as.x; pvy = 350; }
        else { px = as.x + (as.spawned - as.projectiles / 2) * 30; pvy = 350; }
        this._projectiles.push({ x: px, y: py, vx: pvx, vy: pvy, type: as.weaponKey, timer: 0, bounces: 0, owner: this._currentTeam, trail: [], active: true, angle: Math.PI / 2 });
        as.spawned++;
      }
      if (as.spawned >= as.projectiles && as.timer > as.delay * as.projectiles + 0.5) this._airStrikes.splice(i, 1);
    }
  }

  private _updateMines(): void {
    for (let i = this._mines.length - 1; i >= 0; i--) {
      const mine = this._mines[i];
      for (const w of this._getAliveWorms()) {
        if (w.team === mine.team) continue;
        if (dist(mine.x, mine.y, w.x, w.y) < 30) { this._createExplosion(mine.x, mine.y, WEAPONS['mine'].radius, WEAPONS['mine'].damage, WEAPONS['mine'].knockback, mine.team, 'mine'); this._mines.splice(i, 1); break; }
      }
    }
  }

  private _updateRope(dt: number): void {
    const worm = this._getActiveWorm(); if (!worm || !this._rope.active) return;
    this._rope.angularVel += (-GRAVITY / this._rope.length) * Math.sin(this._rope.angle) * dt;
    if (this._keys.has('a') || this._keys.has('arrowleft')) this._rope.angularVel -= 3 * dt;
    if (this._keys.has('d') || this._keys.has('arrowright')) this._rope.angularVel += 3 * dt;
    this._rope.angularVel *= 0.995; this._rope.angle += this._rope.angularVel * dt;
    worm.x = this._rope.anchorX + Math.cos(this._rope.angle) * this._rope.length;
    worm.y = this._rope.anchorY + Math.sin(this._rope.angle) * this._rope.length;
    if (this._keys.has(' ')) { worm.vx = -Math.sin(this._rope.angle) * this._rope.angularVel * this._rope.length; worm.vy = Math.cos(this._rope.angle) * this._rope.angularVel * this._rope.length; this._rope.active = false; }
    if (this._keys.has('w') || this._keys.has('arrowup')) this._rope.length = Math.max(20, this._rope.length - 100 * dt);
    if (this._keys.has('s') || this._keys.has('arrowdown')) this._rope.length = Math.min(300, this._rope.length + 100 * dt);
    this._camTargetX = worm.x; this._camTargetY = worm.y;
  }

  private _updateParticles(dt: number): void {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i]; p.life -= dt;
      if (p.life <= 0) { this._particles.splice(i, 1); continue; }
      if (p.gravity) p.vy += GRAVITY * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.rotation !== undefined && p.rotSpeed !== undefined) p.rotation += p.rotSpeed * dt;
      if (p.type === 'smoke') { p.vx *= 0.95; p.vy *= 0.95; p.size += dt * 3; }
      if (p.type === 'ember') { p.vx += randRange(-5, 5) * dt; p.vy -= 10 * dt; } // Embers drift
      if (p.type === 'shockwave') { p.size += dt * 400; } // Expanding ring
      if (p.type === 'bubble') { p.vy -= 20 * dt; p.vx += Math.sin(this._gameTime * 5 + p.x) * 10 * dt; }
    }
    if (this._particles.length > 2000) this._particles.splice(0, this._particles.length - 1500);
  }

  private _updateCamera(dt: number): void {
    if (this._phase !== 'title' && this._phase !== 'victory') {
      const margin = this._edgeScrollMargin;
      if (this._mouseX < margin) this._camTargetX -= this._edgeScrollSpeed * dt;
      else if (this._mouseX > this._canvas.width - margin) this._camTargetX += this._edgeScrollSpeed * dt;
      if (this._mouseY < margin) this._camTargetY -= this._edgeScrollSpeed * dt;
      else if (this._mouseY > this._canvas.height - margin) this._camTargetY += this._edgeScrollSpeed * dt;
    }
    const halfW = (this._canvas.width / 2) / this._camZoom; const halfH = (this._canvas.height / 2) / this._camZoom;
    this._camTargetX = clamp(this._camTargetX, halfW, TERRAIN_WIDTH - halfW);
    this._camTargetY = clamp(this._camTargetY, halfH, TERRAIN_HEIGHT - halfH);
    const camLerp = 1 - Math.pow(0.01, dt);
    this._camX = lerp(this._camX, this._camTargetX, camLerp);
    this._camY = lerp(this._camY, this._camTargetY, camLerp);
    this._camZoom = lerp(this._camZoom, this._camTargetZoom, camLerp);
  }

  private _checkWinCondition(): void {
    if (this._phase === 'victory' || this._phase === 'title') return;
    let aliveTeams = 0; let lastAliveTeam = -1;
    for (let t = 0; t < this._teams.length; t++) { if (this._teams[t].worms.some(w => w.alive)) { aliveTeams++; lastAliveTeam = t; } }
    if (aliveTeams <= 1) { this._winningTeam = lastAliveTeam; this._phase = 'victory'; this._buildVictoryButtons(); this._playSound('victory'); this._stopBackgroundMusic(); }
  }

  // ─── WEAPON SELECT CLICK ───────────────────────────────────────────────────

  private _checkWeaponSelectClick(): void {
    const cols = 6; const cellW = 130; const cellH = 50;
    const startX = (this._canvas.width - cols * cellW) / 2; const startY = 80;
    const keys = Object.keys(WEAPONS);
    for (let i = 0; i < keys.length; i++) {
      const col = i % cols; const row = Math.floor(i / cols);
      const x = startX + col * cellW; const y = startY + row * cellH;
      if (this._mouseX >= x && this._mouseX <= x + cellW && this._mouseY >= y && this._mouseY <= y + cellH) { this._selectWeapon(keys[i]); return; }
    }
    this._weaponSelectOpen = false;
  }

  // ─── TITLE SCREEN ──────────────────────────────────────────────────────────

  private _buildTitleButtons(): void {
    this._titleButtons = [];
    for (let i = 2; i <= 4; i++) {
      this._titleButtons.push({ x: -120 + (i - 2) * 100, y: 100, w: 80, h: 45, text: `${i} Teams`, action: () => { this._teamCount = i; this._playSound('click'); }, hover: false });
    }
    // Human/AI toggle per team
    const teamLabels = ['Round Table', "Mordred's Host", "Merlin's Circle", 'Grail Knights'];
    const teamColors = ['#3366ff', '#cc2222', '#22bb44', '#ffaa00'];
    for (let t = 0; t < this._teamCount; t++) {
      const teamIdx = t;
      const label = this._teamIsHuman[t] ? 'HUMAN' : 'AI';
      const xOff = this._teamCount <= 2 ? (t === 0 ? -110 : 10) : -110 + t * (220 / this._teamCount);
      const bw = this._teamCount <= 2 ? 100 : Math.floor(200 / this._teamCount);
      this._titleButtons.push({
        x: xOff, y: 160, w: bw, h: 45,
        text: `${teamLabels[t].split(' ')[0]}: ${label}`,
        action: () => { this._teamIsHuman[teamIdx] = !this._teamIsHuman[teamIdx]; this._buildTitleButtons(); this._playSound('click'); },
        hover: false,
      });
    }
    this._titleButtons.push({ x: -100, y: 220, w: 200, h: 55, text: 'START BATTLE', action: () => { this._playSound('click'); this._startGame(); }, hover: false });
    this._titleButtons.push({ x: -100, y: 290, w: 200, h: 45, text: 'BACK TO MENU', action: () => { this._playSound('click'); window.dispatchEvent(new CustomEvent('worms2dExit')); }, hover: false });
  }

  private _checkTitleButtons(): void {
    const cx = this._canvas.width / 2; const cy = this._canvas.height / 2 - 40;
    for (const btn of this._titleButtons) {
      const bx = cx + btn.x; const by = cy + btn.y;
      if (this._mouseX >= bx && this._mouseX <= bx + btn.w && this._mouseY >= by && this._mouseY <= by + btn.h) { btn.action(); return; }
    }
  }

  private _startGame(): void {
    this._generateTerrain(); this._createTeams();
    this._currentTeam = 0; this._currentWormIndex = 0; this._turnTimer = TURN_TIME;
    this._wind = randRange(-1, 1); this._turnNumber = 0;
    this._projectiles = []; this._particles = []; this._mines = []; this._airStrikes = [];
    this._currentWeapon = 'bazooka'; this._gravestones = []; this._supplyCrates = [];
    this._killFeed = []; this._craterGlows = []; this._suddenDeath = false; this._suddenDeathWaterExtra = 0;
    this._speechBubble = null;

    this._phase = 'playing';
    this._aiActive = !this._teamIsHuman[this._currentTeam];
    this._aiPhase = 'thinking'; this._aiTimer = 0;

    const worm = this._getActiveWorm();
    if (worm) { this._camX = worm.x; this._camY = worm.y; this._camTargetX = worm.x; this._camTargetY = worm.y; }
    this._flashText = `${this._teams[0].name}: ${this._teams[0].worms[0].name}'s turn`;
    this._flashTimer = 2.0; this._playSound('turn');
    this._startBackgroundMusic();
  }

  private _buildVictoryButtons(): void {
    this._victoryButtons = [
      { x: -100, y: 200, w: 200, h: 50, text: 'PLAY AGAIN', action: () => { this._playSound('click'); this._startGame(); }, hover: false },
      { x: -100, y: 270, w: 200, h: 50, text: 'MENU', action: () => { this._playSound('click'); this._phase = 'title'; this._buildTitleButtons(); }, hover: false },
    ];
  }

  private _checkVictoryButtons(): void {
    const cx = this._canvas.width / 2; const cy = this._canvas.height / 2 - 40;
    for (const btn of this._victoryButtons) {
      const bx = cx + btn.x; const by = cy + btn.y;
      if (this._mouseX >= bx && this._mouseX <= bx + btn.w && this._mouseY >= by && this._mouseY <= by + btn.h) { btn.action(); return; }
    }
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────

  private _render(): void {
    const ctx = this._ctx; const w = this._canvas.width; const h = this._canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (this._phase === 'title') { this._renderTitleScreen(ctx, w, h); return; }

    ctx.save();
    let shakeX = 0; let shakeY = 0;
    if (this._shakeTime > 0) { shakeX = (Math.random() - 0.5) * this._shakeAmount * 2; shakeY = (Math.random() - 0.5) * this._shakeAmount * 2; }
    ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
    ctx.scale(this._camZoom, this._camZoom);
    ctx.translate(-this._camX, -this._camY);

    this._renderBackground(ctx);
    this._renderClouds(ctx);
    this._renderBirds(ctx);
    ctx.drawImage(this._terrainCanvas, 0, 0);

    // Crater glows
    for (const cg of this._craterGlows) {
      const alpha = (cg.timer / cg.maxTimer) * 0.4;
      const grad = ctx.createRadialGradient(cg.x, cg.y, 0, cg.x, cg.y, cg.radius);
      grad.addColorStop(0, `rgba(255, 120, 30, ${alpha})`);
      grad.addColorStop(0.5, `rgba(255, 60, 10, ${alpha * 0.5})`);
      grad.addColorStop(1, `rgba(200, 30, 0, 0)`);
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cg.x, cg.y, cg.radius, 0, Math.PI * 2); ctx.fill();
    }

    this._renderGravestones(ctx);
    this._renderSupplyCrates(ctx);
    this._renderMines(ctx);
    this._renderWorms(ctx);
    this._renderProjectiles(ctx);
    this._renderParticles(ctx);
    if (this._rope.active) this._renderRope(ctx);
    this._renderWater(ctx);
    if (this._placingGirder) this._renderGirderPreview(ctx);

    // Speech bubble
    if (this._speechBubble && this._speechBubble.timer > 0) {
      const sb = this._speechBubble; const alpha = Math.min(1, sb.timer);
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '11px sans-serif'; const tw = ctx.measureText(sb.text).width + 12;
      this._roundRect(ctx, sb.x - tw / 2, sb.y - 12, tw, 20, 6); ctx.fill();
      ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(sb.text, sb.x, sb.y - 2);
      // Tail
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.moveTo(sb.x - 5, sb.y + 8); ctx.lineTo(sb.x + 5, sb.y + 8); ctx.lineTo(sb.x, sb.y + 16); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // Screen flash
    if (this._screenFlashAlpha > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this._screenFlashAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Vignette
    if (this._phase !== 'title') {
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${this._vignetteAlpha})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    }

    this._renderHUD(ctx, w, h);
    if (this._weaponSelectOpen) this._renderWeaponSelect(ctx, w, h);
    if (this._phase === 'victory') this._renderVictoryScreen(ctx, w, h);
    if (this._pauseMenuOpen) this._renderPauseMenu(ctx, w, h);
  }

  // ─── TITLE SCREEN RENDER ──────────────────────────────────────────────────

  private _renderTitleScreen(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const bgScale = w / TERRAIN_WIDTH;
    ctx.save(); ctx.scale(bgScale, bgScale * (h / TERRAIN_HEIGHT)); ctx.drawImage(this._bgCanvas, 0, 0); ctx.restore();
    ctx.save(); ctx.scale(bgScale, bgScale);
    for (const cloud of this._clouds) { ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity * 0.5})`; this._drawCloud(ctx, cloud.x, cloud.y, cloud.width, cloud.height, cloud.bumps); }
    ctx.restore();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'; ctx.fillRect(0, 0, w, h);
    const cx = w / 2; const cy = h / 2 - 40;

    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    // Knight silhouettes flanking title
    for (const side of [-1, 1]) {
      const kx = cx + side * 250; const ky = cy - 80;
      ctx.fillStyle = 'rgba(200, 170, 80, 0.3)';
      // Head
      ctx.beginPath(); ctx.arc(kx, ky - 40, 14, 0, Math.PI * 2); ctx.fill();
      // Body
      ctx.fillRect(kx - 10, ky - 26, 20, 35);
      // Legs
      ctx.fillRect(kx - 8, ky + 9, 6, 20); ctx.fillRect(kx + 2, ky + 9, 6, 20);
      // Sword
      ctx.fillStyle = 'rgba(220, 200, 100, 0.4)';
      ctx.fillRect(kx + side * 14, ky - 30, 2, 40);
      ctx.fillRect(kx + side * 10, ky - 10, 10, 2);
      // Shield
      ctx.beginPath();
      ctx.moveTo(kx - side * 12, ky - 20);
      ctx.lineTo(kx - side * 20, ky - 15);
      ctx.lineTo(kx - side * 20, ky);
      ctx.lineTo(kx - side * 12, ky + 5);
      ctx.closePath(); ctx.fill();
    }

    // Torchlight flicker on sides
    const flickerA = 0.15 + Math.sin(this._titleTorchFlicker) * 0.05 + Math.sin(this._titleTorchFlicker * 1.7) * 0.03;
    for (const side of [-1, 1]) {
      const tx = cx + side * 300; const ty = cy - 40;
      const tg = ctx.createRadialGradient(tx, ty, 5, tx, ty, 120);
      tg.addColorStop(0, `rgba(255, 180, 50, ${flickerA})`);
      tg.addColorStop(0.5, `rgba(255, 120, 20, ${flickerA * 0.4})`);
      tg.addColorStop(1, 'rgba(255, 80, 0, 0)');
      ctx.fillStyle = tg; ctx.fillRect(tx - 120, ty - 120, 240, 240);
    }

    // Glowing title
    const glow = Math.sin(this._gameTime * 2) * 5 + 5;
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 20 + glow;
    ctx.font = 'bold 72px serif'; ctx.fillStyle = '#ffd700'; ctx.fillText('WORMS 2D', cx, cy - 120);
    ctx.shadowBlur = 0;
    ctx.font = 'italic 24px serif'; ctx.fillStyle = '#ddc080'; ctx.fillText('A Camelot Artillery Battle', cx, cy - 70);

    // Crossed swords under title
    ctx.strokeStyle = '#ccaa44'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 60, cy - 50); ctx.lineTo(cx + 60, cy - 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 60, cy - 50); ctx.lineTo(cx - 60, cy - 30); ctx.stroke();
    // Hilts
    ctx.strokeStyle = '#886622'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(cx - 55, cy - 48); ctx.lineTo(cx - 65, cy - 52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 55, cy - 48); ctx.lineTo(cx + 65, cy - 52); ctx.stroke();

    // Decorative line
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 200, cy - 15); ctx.lineTo(cx + 200, cy - 15); ctx.stroke();

    ctx.font = '18px serif'; ctx.fillStyle = '#ccaa66'; ctx.fillText('Choose Teams:', cx, cy + 80);

    // Label for human/AI row
    ctx.font = '14px serif'; ctx.fillStyle = '#998866';
    ctx.fillText('Team Control:', cx, cy + 145);

    for (const btn of this._titleButtons) {
      const bx = cx + btn.x; const by = cy + btn.y;
      btn.hover = this._mouseX >= bx && this._mouseX <= bx + btn.w && this._mouseY >= by && this._mouseY <= by + btn.h;
      const isTeamCountBtn = btn.text.includes('Teams');
      const isTeamCountSelected = isTeamCountBtn && btn.text.startsWith(`${this._teamCount}`);
      const isHumanBtn = btn.text.includes('HUMAN');
      const isAiBtn = btn.text.includes(': AI');
      const isHighlighted = isTeamCountSelected || isHumanBtn;

      const grad = ctx.createLinearGradient(bx, by, bx, by + btn.h);
      if (isHumanBtn) {
        grad.addColorStop(0, btn.hover ? '#2a5533' : '#1a4422');
        grad.addColorStop(1, btn.hover ? '#1a3316' : '#0d220d');
      } else if (isHighlighted) {
        grad.addColorStop(0, '#886622'); grad.addColorStop(1, '#664411');
      } else if (btn.hover) {
        grad.addColorStop(0, '#554422'); grad.addColorStop(1, '#443311');
      } else {
        grad.addColorStop(0, '#332211'); grad.addColorStop(1, '#221100');
      }
      ctx.fillStyle = grad;
      this._roundRect(ctx, bx, by, btn.w, btn.h, 8); ctx.fill();
      ctx.strokeStyle = isHumanBtn ? '#44dd66' : isHighlighted ? '#ffd700' : (btn.hover ? '#ccaa44' : '#886633');
      ctx.lineWidth = isHighlighted || isHumanBtn ? 2 : 1;
      this._roundRect(ctx, bx, by, btn.w, btn.h, 8); ctx.stroke();

      ctx.fillStyle = isHumanBtn ? '#44ff66' : (btn.hover || isHighlighted) ? '#ffd700' : '#ccaa66';
      ctx.font = btn.text === 'START BATTLE' ? 'bold 22px serif' : (isHumanBtn || isAiBtn) ? 'bold 13px sans-serif' : '16px serif';
      ctx.fillText(btn.text, bx + btn.w / 2, by + btn.h / 2);
    }
    ctx.restore();
  }

  // ─── BACKGROUND / CLOUDS / BIRDS ──────────────────────────────────────────

  private _renderBackground(ctx: CanvasRenderingContext2D): void {
    const px = this._camX * 0.3; const py = this._camY * 0.3;
    ctx.save(); ctx.translate(px, py);
    ctx.drawImage(this._bgCanvas, -px, -py);
    for (const star of this._stars) {
      const alpha = 0.3 + 0.7 * Math.abs(Math.sin(this._gameTime * star.twinkleSpeed + star.twinkleOffset));
      ctx.fillStyle = `rgba(255, 255, 240, ${alpha})`;
      ctx.beginPath(); ctx.arc(star.x - px, star.y - py, star.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  private _renderClouds(ctx: CanvasRenderingContext2D): void {
    for (const cloud of this._clouds) {
      cloud.x += cloud.speed * 0.016; if (cloud.x > TERRAIN_WIDTH + cloud.width) cloud.x = -cloud.width;
      const px = cloud.x - this._camX * 0.1; const py = cloud.y - this._camY * 0.05;
      // Softer clouds with multiple layers
      ctx.save();
      ctx.globalAlpha = cloud.opacity * 0.6;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      this._drawCloud(ctx, px, py, cloud.width, cloud.height, cloud.bumps);
      ctx.globalAlpha = cloud.opacity * 0.3;
      ctx.fillStyle = 'rgba(240, 245, 255, 0.6)';
      this._drawCloud(ctx, px + 5, py + 3, cloud.width * 0.9, cloud.height * 0.8, cloud.bumps);
      ctx.restore();
    }
  }

  private _renderBirds(ctx: CanvasRenderingContext2D): void {
    ctx.save(); ctx.strokeStyle = 'rgba(30, 20, 10, 0.4)'; ctx.lineWidth = 1.5;
    for (const group of this._birds) {
      for (let b = 0; b < group.count; b++) {
        const bx = group.x + b * 15 - (group.count * 7); const by = group.y + Math.abs(b - group.count / 2) * 5;
        const wingPhase = Math.sin(group.phase + b * 0.5) * 4;
        ctx.beginPath(); ctx.moveTo(bx - 5, by + wingPhase); ctx.quadraticCurveTo(bx, by - 2, bx + 5, by + wingPhase); ctx.stroke();
      }
    }
    ctx.restore();
  }

  private _drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, bumps: number[]): void {
    ctx.beginPath();
    const bw = w / bumps.length;
    for (let i = 0; i < bumps.length; i++) {
      const bx = x + i * bw + bw / 2; const by = y; const br = (bw / 2) * bumps[i];
      ctx.moveTo(bx + br, by); ctx.arc(bx, by - h * bumps[i] * 0.3, br, 0, Math.PI * 2);
    }
    ctx.rect(x, y - h * 0.1, w, h * 0.5); ctx.fill();
  }

  // ─── WATER ─────────────────────────────────────────────────────────────────

  private _renderWater(ctx: CanvasRenderingContext2D): void {
    const waterTop = TERRAIN_HEIGHT - WATER_LEVEL - this._suddenDeathWaterExtra;
    const grad = ctx.createLinearGradient(0, waterTop, 0, TERRAIN_HEIGHT);
    grad.addColorStop(0, 'rgba(20, 80, 160, 0.7)'); grad.addColorStop(0.3, 'rgba(15, 60, 130, 0.8)'); grad.addColorStop(1, 'rgba(5, 20, 60, 0.95)');
    ctx.fillStyle = grad; ctx.fillRect(0, waterTop, TERRAIN_WIDTH, TERRAIN_HEIGHT - waterTop + 50);

    // Wave with multiple harmonics
    ctx.beginPath(); ctx.moveTo(0, waterTop);
    for (let x = 0; x < TERRAIN_WIDTH; x += 4) {
      const waveY = waterTop + Math.sin((x + this._waterOffset) * 0.03) * 3 + Math.sin((x + this._waterOffset * 0.7) * 0.05) * 2 + Math.sin((x + this._waterOffset * 1.3) * 0.08) * 1;
      ctx.lineTo(x, waveY);
    }
    ctx.lineTo(TERRAIN_WIDTH, waterTop + 10); ctx.lineTo(0, waterTop + 10); ctx.closePath();
    const waveGrad = ctx.createLinearGradient(0, waterTop - 3, 0, waterTop + 10);
    waveGrad.addColorStop(0, 'rgba(100, 180, 255, 0.5)'); waveGrad.addColorStop(1, 'rgba(20, 80, 160, 0.7)');
    ctx.fillStyle = waveGrad; ctx.fill();

    // Foam line
    ctx.save(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < TERRAIN_WIDTH; x += 6) {
      const fy = waterTop + Math.sin((x + this._waterOffset) * 0.03) * 3 + Math.sin((x + this._waterOffset * 0.7) * 0.05) * 2 - 1;
      if (x === 0) ctx.moveTo(x, fy); else ctx.lineTo(x, fy);
    }
    ctx.stroke(); ctx.restore();

    // Shimmer / caustic
    ctx.save();
    for (let i = 0; i < 20; i++) {
      const sx = ((i * 173 + this._waterOffset * 0.5) % TERRAIN_WIDTH);
      const sy = waterTop + 3 + Math.sin(sx * 0.02 + this._gameTime) * 2;
      const shimmerAlpha = 0.3 + 0.2 * Math.sin(this._gameTime * 3 + i);
      ctx.fillStyle = `rgba(200, 230, 255, ${shimmerAlpha})`; ctx.fillRect(sx, sy, randRange(20, 60), 1);
    }
    // Underwater caustic shimmer
    for (let i = 0; i < 15; i++) {
      const cx = ((i * 213 + this._gameTime * 20) % TERRAIN_WIDTH);
      const cy = waterTop + 15 + i * 3;
      const ca = 0.08 + Math.sin(this._gameTime * 2 + i) * 0.04;
      ctx.fillStyle = `rgba(150, 200, 255, ${ca})`;
      ctx.beginPath(); ctx.ellipse(cx, cy, 30 + Math.sin(this._gameTime + i) * 10, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ─── WORM RENDERING ───────────────────────────────────────────────────────

  private _renderWorms(ctx: CanvasRenderingContext2D): void {
    for (const team of this._teams) for (const worm of team.worms) { if (worm.alive) this._drawWorm(ctx, worm, team); }
  }

  private _drawWorm(ctx: CanvasRenderingContext2D, worm: Worm, team: Team): void {
    ctx.save();
    ctx.translate(worm.x, worm.y);
    const isActive = this._getActiveWorm() === worm;
    const scale = worm.facing;
    const breathBob = Math.sin(worm.breathTimer) * 1.2; // Animated breathing

    if (worm.frozen > 0) ctx.globalAlpha = 0.7;
    ctx.save();
    ctx.scale(scale, 1);
    ctx.translate(0, breathBob);

    // === CAPE (more flowing) ===
    const cw1 = Math.sin(this._gameTime * 4 + worm.x * 0.1) * 4;
    const cw2 = Math.sin(this._gameTime * 3.5 + worm.x * 0.08 + 1) * 2;
    ctx.fillStyle = team.color;
    ctx.beginPath(); ctx.moveTo(-5, -24);
    ctx.bezierCurveTo(-14 - cw1, -14, -16 - cw2, -2, -12 - cw1 * 1.5, 8);
    ctx.bezierCurveTo(-10 - cw2, 4, -6, -2, -5, -8);
    ctx.closePath(); ctx.fill();
    // Cape highlight
    ctx.fillStyle = team.lightColor; ctx.globalAlpha = (worm.frozen > 0 ? 0.15 : 0.25);
    ctx.beginPath(); ctx.moveTo(-5, -24);
    ctx.bezierCurveTo(-12 - cw1 * 0.5, -18, -10 - cw2 * 0.5, -8, -8 - cw1 * 0.5, 0);
    ctx.lineTo(-5, -12); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = worm.frozen > 0 ? 0.7 : 1.0;

    // === TABARD (team-colored surcoat) ===
    ctx.fillStyle = team.color;
    this._roundRect(ctx, -6, -14, 12, 14, 2); ctx.fill();
    // Heraldic pattern on tabard (simple cross or stripe)
    ctx.strokeStyle = team.lightColor; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(0, -1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(4, -8); ctx.stroke();

    // === ARMORED BODY ===
    const bodyGrad = ctx.createLinearGradient(-9, -28, 9, 0);
    bodyGrad.addColorStop(0, '#b8b8b8'); bodyGrad.addColorStop(0.4, '#909090'); bodyGrad.addColorStop(1, '#686868');
    ctx.fillStyle = bodyGrad;
    this._roundRect(ctx, -8, -26, 16, 22, 3); ctx.fill();
    // Armor highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    this._roundRect(ctx, -5, -25, 5, 20, 2); ctx.fill();

    // === SHOULDER PAULDRONS ===
    for (const sx of [-10, 6]) {
      const pGrad = ctx.createRadialGradient(sx + 2, -22, 1, sx + 2, -22, 6);
      pGrad.addColorStop(0, '#cccccc'); pGrad.addColorStop(1, '#777777');
      ctx.fillStyle = pGrad;
      ctx.beginPath(); ctx.ellipse(sx + 2, -22, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#555'; ctx.lineWidth = 0.5; ctx.stroke();
    }

    // === GAUNTLETS / ARMS ===
    const walkOffset = isActive && Math.abs(worm.vx) > 5 ? Math.sin(this._gameTime * 12) * 2 : 0;
    // Left arm (shield side)
    ctx.fillStyle = '#888'; ctx.fillRect(-12, -18, 4, 12);
    ctx.fillStyle = '#777'; ctx.fillRect(-13, -10, 5, 4); // gauntlet
    // Right arm (weapon side)
    ctx.fillStyle = '#888'; ctx.fillRect(8, -18, 4, 12);
    ctx.fillStyle = '#777'; ctx.fillRect(8, -10, 5, 4); // gauntlet

    // === BELT WITH SCABBARD ===
    ctx.fillStyle = '#553311'; ctx.fillRect(-8, -5, 16, 3);
    ctx.fillStyle = '#886633'; ctx.fillRect(-2, -6, 4, 5); // buckle
    // Scabbard (when not active or not holding melee)
    if (!isActive || (this._currentWeapon !== 'baseball_bat' && this._currentWeapon !== 'fire_punch' && this._currentWeapon !== 'lance_charge')) {
      ctx.fillStyle = '#553311'; ctx.fillRect(-10, -4, 3, 12); // scabbard
      ctx.fillStyle = '#aa8844'; ctx.fillRect(-11, -5, 5, 2); // hilt
    }

    // === LEGS WITH GREAVES ===
    // Left leg
    ctx.fillStyle = '#666'; ctx.fillRect(-6, -2, 5, 12 + walkOffset);
    ctx.fillStyle = '#888'; ctx.fillRect(-6, -2, 5, 4); // shin guard
    // Boot
    ctx.fillStyle = '#443322'; ctx.fillRect(-7, 9 + walkOffset, 6, 5);
    ctx.fillStyle = '#554433'; ctx.fillRect(-8, 13 + walkOffset, 8, 2); // sole
    // Right leg
    ctx.fillStyle = '#777'; ctx.fillRect(1, -2, 5, 12 - walkOffset);
    ctx.fillStyle = '#999'; ctx.fillRect(1, -2, 5, 4); // shin guard
    ctx.fillStyle = '#443322'; ctx.fillRect(1, 9 - walkOffset, 6, 5);
    ctx.fillStyle = '#554433'; ctx.fillRect(0, 13 - walkOffset, 8, 2);

    // === SHIELD (improved with heraldic design) ===
    ctx.save(); ctx.translate(-12, -16);
    const shieldGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 9);
    shieldGrad.addColorStop(0, team.lightColor); shieldGrad.addColorStop(1, team.darkColor);
    ctx.fillStyle = shieldGrad;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(7, -5); ctx.lineTo(7, 4); ctx.lineTo(0, 9); ctx.lineTo(-7, 4); ctx.lineTo(-7, -5); ctx.closePath();
    ctx.fill(); ctx.strokeStyle = '#ddddaa'; ctx.lineWidth = 0.8; ctx.stroke();
    // Heraldic design: simple lion rampant (stick figure style)
    ctx.strokeStyle = '#ffdd88'; ctx.lineWidth = 1;
    ctx.beginPath();
    // Body
    ctx.moveTo(-1, 2); ctx.lineTo(0, -2); ctx.lineTo(2, -4);
    // Head
    ctx.moveTo(2, -4); ctx.lineTo(3, -5);
    // Front legs
    ctx.moveTo(0, -2); ctx.lineTo(2, 0); ctx.moveTo(0, -1); ctx.lineTo(-2, -3);
    // Back legs
    ctx.moveTo(-1, 2); ctx.lineTo(-3, 4); ctx.moveTo(-1, 2); ctx.lineTo(1, 4);
    // Tail
    ctx.moveTo(-1, 2); ctx.lineTo(-3, 0);
    ctx.stroke();
    ctx.restore();

    // === HELM (improved with nose guard, visor, chin guard) ===
    ctx.save(); ctx.translate(0, -31);
    const helmGrad = ctx.createLinearGradient(-7, -9, 7, 9);
    helmGrad.addColorStop(0, '#cccccc'); helmGrad.addColorStop(0.3, '#b0b0b0'); helmGrad.addColorStop(1, '#787878');
    ctx.fillStyle = helmGrad;
    // Helm shape
    ctx.beginPath(); ctx.moveTo(-8, -7); ctx.lineTo(8, -7); ctx.lineTo(9, 7); ctx.lineTo(6, 10); ctx.lineTo(-6, 10); ctx.lineTo(-9, 7); ctx.closePath();
    ctx.fill(); ctx.strokeStyle = '#666'; ctx.lineWidth = 0.8; ctx.stroke();
    // Nose guard
    ctx.fillStyle = '#aaa'; ctx.fillRect(-1, -2, 2, 8);
    // Visor slit
    ctx.fillStyle = '#222'; ctx.fillRect(-6, 0, 5, 2); ctx.fillRect(1, 0, 5, 2);
    // Chin guard
    ctx.fillStyle = '#999'; ctx.beginPath(); ctx.moveTo(-6, 7); ctx.lineTo(6, 7); ctx.lineTo(5, 10); ctx.lineTo(-5, 10); ctx.closePath(); ctx.fill();
    // Rivets
    ctx.fillStyle = '#ddd';
    for (const [rx, ry] of [[-6, -5], [6, -5], [-7, 5], [7, 5], [0, -7]]) { ctx.beginPath(); ctx.arc(rx, ry, 1, 0, Math.PI * 2); ctx.fill(); }
    // Eyes through visor
    ctx.fillStyle = isActive ? '#ffffff' : '#aaaaaa';
    ctx.fillRect(-4, 0, 2, 1.5); ctx.fillRect(2, 0, 2, 1.5);
    // Plume
    ctx.fillStyle = team.color;
    const pw = Math.sin(this._gameTime * 3 + worm.x * 0.05);
    ctx.beginPath(); ctx.moveTo(-2, -7);
    ctx.quadraticCurveTo(0, -18, 5 + pw * 2, -16);
    ctx.quadraticCurveTo(3, -14, 4 + pw, -11);
    ctx.quadraticCurveTo(1, -9, 2, -7);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = team.lightColor; ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.moveTo(-1, -7); ctx.quadraticCurveTo(0, -16, 4 + pw, -13); ctx.quadraticCurveTo(1, -11, 1, -7); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = worm.frozen > 0 ? 0.7 : 1.0;
    ctx.restore(); // helm

    // === WEAPON IN HAND (weapon-specific visuals) ===
    if (isActive) {
      ctx.save(); ctx.translate(8, -18); ctx.rotate(worm.aimAngle);
      this._drawWeaponInHand(ctx, this._currentWeapon);
      ctx.restore();
    }

    ctx.restore(); // facing scale + breathBob

    // === FROZEN OVERLAY ===
    if (worm.frozen > 0) {
      ctx.fillStyle = 'rgba(150, 200, 255, 0.3)'; ctx.beginPath(); ctx.arc(0, -10, 18, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1.0;
    }
    // === POISONED ===
    if (worm.poisoned > 0) {
      ctx.fillStyle = 'rgba(0, 255, 0, 0.25)'; ctx.beginPath(); ctx.arc(0, -10, 16, 0, Math.PI * 2); ctx.fill();
      ctx.font = '10px sans-serif'; ctx.fillStyle = '#00ff00'; ctx.textAlign = 'center'; ctx.fillText('☠', 0, -38);
    }

    // === HEALTH BAR ===
    const hpPct = worm.hp / worm.maxHp; const barW = 34; const barH = 4; const barY = -50;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = hpPct > 0.5 ? '#44ff44' : hpPct > 0.25 ? '#ffaa00' : '#ff3333';
    ctx.fillRect(-barW / 2, barY, barW * hpPct, barH);

    // === NAME ===
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = team.color; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2;
    ctx.strokeText(worm.name, 0, barY - 2); ctx.fillText(worm.name, 0, barY - 2);

    // === ACTIVE INDICATOR ===
    if (isActive) {
      const arrowY = -60 + Math.sin(this._gameTime * 5) * 3;
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, arrowY); ctx.lineTo(-5, arrowY - 8); ctx.lineTo(5, arrowY - 8); ctx.closePath(); ctx.fill();
      // Aim line
      if (this._phase === 'aiming' || this._phase === 'playing') {
        const aimLen = 50; const ax = Math.cos(worm.aimAngle) * worm.facing * aimLen; const ay = Math.sin(worm.aimAngle) * aimLen;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(worm.facing * 8, -18); ctx.lineTo(worm.facing * 8 + ax, -18 + ay); ctx.stroke(); ctx.setLineDash([]);
      }
      // Trajectory preview (dotted arc)
      if ((this._phase === 'aiming' || this._phase === 'playing') && !this._aiActive) {
        const weapon = WEAPONS[this._currentWeapon];
        if (weapon && (weapon.type === 'projectile' || weapon.type === 'grenade')) {
          const spd = (weapon.speed || 500) * Math.max(this._power, 0.1);
          const dirX = Math.cos(worm.aimAngle) * worm.facing; const dirY = Math.sin(worm.aimAngle);
          let px = worm.facing * 8 + dirX * 20; let py = -18 + dirY * 20;
          let pvx = dirX * spd; let pvy = dirY * spd;
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          for (let s = 0; s < 40; s++) {
            pvx += (weapon.windAffected ? this._wind * 100 : 0) * 0.02;
            pvy += GRAVITY * 0.02; px += pvx * 0.02; py += pvy * 0.02;
            if (s % 3 === 0) { ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill(); }
          }
        }
      }
    }
    ctx.restore();
  }

  private _drawWeaponInHand(ctx: CanvasRenderingContext2D, weaponKey: string): void {
    switch (weaponKey) {
      case 'bazooka': case 'mortar':
        ctx.fillStyle = '#555'; ctx.fillRect(0, -3, 22, 5); ctx.fillStyle = '#444'; ctx.fillRect(18, -4, 6, 7);
        ctx.fillStyle = '#666'; ctx.fillRect(0, -2, 4, 3); break;
      case 'shotgun':
        ctx.fillStyle = '#775533'; ctx.fillRect(0, -2, 12, 3);
        ctx.fillStyle = '#555'; ctx.fillRect(10, -3, 12, 2); ctx.fillRect(10, 0, 12, 2); break;
      case 'flaming_arrow':
        ctx.fillStyle = '#775533'; ctx.fillRect(-8, -1, 28, 2); // shaft
        ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(24, -3); ctx.lineTo(24, 3); ctx.closePath(); ctx.fill();
        // Bow
        ctx.strokeStyle = '#664422'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(-4, 0, 12, -Math.PI * 0.4, Math.PI * 0.4); ctx.stroke();
        ctx.strokeStyle = '#ccccaa'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(-4 + Math.cos(-Math.PI * 0.4) * 12, Math.sin(-Math.PI * 0.4) * 12);
        ctx.lineTo(-4 + Math.cos(Math.PI * 0.4) * 12, Math.sin(Math.PI * 0.4) * 12); ctx.stroke();
        break;
      case 'grenade': case 'cluster_bomb': case 'banana_bomb': case 'holy_hand_grenade':
      case 'freeze_blast': case 'poison_strike': case 'holy_water':
        ctx.fillStyle = '#888'; ctx.fillRect(0, -2, 6, 4); // hand holding
        ctx.fillStyle = weaponKey === 'freeze_blast' ? '#88ccff' : weaponKey === 'poison_strike' ? '#44cc44' : '#555';
        ctx.beginPath(); ctx.arc(8, 0, 5, 0, Math.PI * 2); ctx.fill(); break;
      case 'dynamite':
        ctx.fillStyle = '#cc3333'; ctx.fillRect(2, -3, 14, 6);
        ctx.fillStyle = '#ffcc00'; ctx.fillRect(2, -4, 2, 8);
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(16, -3); ctx.lineTo(20, -6); ctx.stroke(); break;
      case 'fire_punch': case 'baseball_bat': case 'lance_charge':
        if (weaponKey === 'lance_charge') {
          ctx.fillStyle = '#886644'; ctx.fillRect(0, -1.5, 30, 3); ctx.fillStyle = '#aaa'; ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(35, -3); ctx.lineTo(35, 3); ctx.closePath(); ctx.fill();
        } else if (weaponKey === 'baseball_bat') {
          ctx.fillStyle = '#aa8855'; ctx.fillRect(0, -2, 20, 4); ctx.fillRect(18, -3, 5, 6);
        } else {
          ctx.fillStyle = '#ff4400'; ctx.beginPath(); ctx.arc(10, 0, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffaa00'; ctx.beginPath(); ctx.arc(10, -2, 3, 0, Math.PI * 2); ctx.fill();
        }
        break;
      case 'dragon_breath':
        ctx.fillStyle = '#886644'; ctx.fillRect(0, -2, 20, 4);
        ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(28, -5); ctx.lineTo(28, 5); ctx.closePath(); ctx.fill(); break;
      case 'catapult': case 'trebuchet':
        ctx.fillStyle = '#886644'; ctx.fillRect(0, -2, 18, 3);
        ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(16, 0, 5, 0, Math.PI * 2); ctx.fill(); break;
      default:
        ctx.fillStyle = '#886644'; ctx.fillRect(0, -2, 18, 3);
        if (WEAPONS[weaponKey] && (WEAPONS[weaponKey].type === 'projectile' || WEAPONS[weaponKey].type === 'airstrike')) {
          ctx.fillStyle = '#444'; ctx.fillRect(14, -3, 6, 5);
        }
        break;
    }
  }

  // ─── PROJECTILE / PARTICLE / MISC RENDERING ───────────────────────────────

  private _renderProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const proj of this._projectiles) {
      if (!proj.active) continue;
      if (proj.trail.length > 1) {
        ctx.save();
        for (let i = 1; i < proj.trail.length; i++) {
          const alpha = i / proj.trail.length;
          ctx.strokeStyle = `rgba(255, 200, 100, ${alpha * 0.5})`; ctx.lineWidth = alpha * 3;
          ctx.beginPath(); ctx.moveTo(proj.trail[i - 1].x, proj.trail[i - 1].y); ctx.lineTo(proj.trail[i].x, proj.trail[i].y); ctx.stroke();
        }
        ctx.restore();
      }
      ctx.save(); ctx.translate(proj.x, proj.y); ctx.rotate(proj.angle);
      if (proj.type === 'dynamite') {
        ctx.fillStyle = '#cc3333'; ctx.fillRect(-8, -3, 16, 6);
        ctx.fillStyle = '#ffcc00'; ctx.fillRect(-8, -4, 2, 8);
        const fuseLeft = (proj.fuseTime! - proj.timer) / proj.fuseTime!;
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(8 + fuseLeft * 8, -6); ctx.stroke();
        if (Math.random() > 0.3) { ctx.fillStyle = '#ffaa00'; ctx.beginPath(); ctx.arc(8 + fuseLeft * 8, -6, 2, 0, Math.PI * 2); ctx.fill(); }
      } else if (proj.type === 'sheep') {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(7, -2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, -3, 1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#222'; ctx.fillRect(-4, 5, 2, 4); ctx.fillRect(2, 5, 2, 4);
      } else if (proj.type === 'holy_hand_grenade') {
        ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#aa8800'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillRect(-1, -8, 2, 5); ctx.fillRect(-3, -6, 6, 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + Math.sin(this._gameTime * 10) * 0.2})`; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
      } else if (proj.type === 'banana_bomb') {
        ctx.fillStyle = '#ffee00'; ctx.beginPath(); ctx.arc(0, -3, 5, 0, Math.PI); ctx.fill();
        ctx.fillStyle = '#ccbb00'; ctx.beginPath(); ctx.arc(0, -3, 3, 0, Math.PI); ctx.fill();
      } else if (proj.type === 'freeze_blast') {
        ctx.fillStyle = '#88ccff'; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(4, 0); ctx.lineTo(0, 5); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = `rgba(200, 230, 255, ${0.3 + Math.sin(this._gameTime * 8) * 0.2})`; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      } else if (proj.type === 'poison_strike') {
        ctx.fillStyle = '#44cc44'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#22ff22'; ctx.beginPath(); ctx.arc(-1, -1, 2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-4, -3); ctx.lineTo(-4, 3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255, 200, 50, 0.3)'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      }
      if (proj.fuseTime !== undefined) {
        ctx.rotate(-proj.angle); const timeLeft = Math.ceil(proj.fuseTime - proj.timer);
        ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${timeLeft}`, 0, -12);
      }
      ctx.restore();
    }
  }

  private _renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this._particles) {
      const alpha = p.life / p.maxLife;
      ctx.save(); ctx.globalAlpha = p.alpha !== undefined ? p.alpha * alpha : alpha;
      ctx.translate(p.x, p.y);
      if (p.rotation !== undefined) ctx.rotate(p.rotation);
      switch (p.type) {
        case 'circle': case 'fire':
          ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill(); break;
        case 'spark': {
          ctx.fillStyle = p.color; const len = Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.02 + 1;
          ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.fillRect(-len, -p.size / 2, len * 2, p.size); break;
        }
        case 'smoke':
          ctx.fillStyle = p.color; ctx.globalAlpha = alpha * 0.5;
          ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill(); break;
        case 'debris':
          ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); break;
        case 'text':
          ctx.font = `bold ${p.size}px sans-serif`; ctx.fillStyle = p.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.strokeText(p.text || '', 0, 0); ctx.fillText(p.text || '', 0, 0); break;
        case 'ember':
          ctx.fillStyle = p.color; ctx.globalAlpha = alpha * 0.8;
          ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill(); break;
        case 'shockwave':
          ctx.strokeStyle = p.color; ctx.lineWidth = 3 * alpha; ctx.globalAlpha = alpha * 0.6;
          ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.stroke(); break;
        case 'bubble':
          ctx.strokeStyle = p.color; ctx.lineWidth = 1; ctx.globalAlpha = alpha * 0.6;
          ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(-p.size * 0.3, -p.size * 0.3, p.size * 0.3, 0, Math.PI * 2); ctx.fill(); break;
      }
      ctx.restore();
    }
  }

  private _renderGravestones(ctx: CanvasRenderingContext2D): void {
    for (const gs of this._gravestones) {
      ctx.save(); ctx.translate(gs.x, gs.y);
      // Stone
      ctx.fillStyle = '#666'; ctx.beginPath();
      ctx.moveTo(-6, 0); ctx.lineTo(-6, -14); ctx.arc(0, -14, 6, Math.PI, 0); ctx.lineTo(6, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();
      // Cross
      ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, -6); ctx.moveTo(-3, -12); ctx.lineTo(3, -12); ctx.stroke();
      // Name
      ctx.font = '6px sans-serif'; ctx.fillStyle = gs.teamColor; ctx.textAlign = 'center'; ctx.fillText(gs.name, 0, -3);
      ctx.restore();
    }
  }

  private _renderSupplyCrates(ctx: CanvasRenderingContext2D): void {
    for (const crate of this._supplyCrates) {
      ctx.save(); ctx.translate(crate.x, crate.y);
      // Parachute
      if (crate.parachuteOpen && !crate.landed) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath(); ctx.arc(0, -30, 18, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#888'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(-12, -26); ctx.lineTo(-6, -5); ctx.moveTo(0, -30); ctx.lineTo(0, -5);
        ctx.moveTo(12, -26); ctx.lineTo(6, -5); ctx.stroke();
      }
      // Crate box
      ctx.fillStyle = '#aa7733'; ctx.fillRect(-8, -8, 16, 16);
      ctx.strokeStyle = '#664422'; ctx.lineWidth = 1; ctx.strokeRect(-8, -8, 16, 16);
      // Cross planks
      ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(8, 8); ctx.moveTo(8, -8); ctx.lineTo(-8, 8); ctx.stroke();
      // Question mark
      ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, 0);
      ctx.restore();
    }
  }

  private _renderMines(ctx: CanvasRenderingContext2D): void {
    for (const mine of this._mines) {
      ctx.save(); ctx.translate(mine.x, mine.y);
      ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(0, -3, 6, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2; ctx.fillStyle = '#555';
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 4, -3 + Math.sin(a) * 4);
        ctx.lineTo(Math.cos(a) * 9, -3 + Math.sin(a) * 9);
        ctx.lineTo(Math.cos(a + 0.2) * 4, -3 + Math.sin(a + 0.2) * 4); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = Math.sin(this._gameTime * 4) > 0 ? '#ff0000' : '#880000';
      ctx.beginPath(); ctx.arc(0, -3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  private _renderRope(ctx: CanvasRenderingContext2D): void {
    const worm = this._getActiveWorm(); if (!worm) return;
    ctx.strokeStyle = '#886644'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(this._rope.anchorX, this._rope.anchorY); ctx.lineTo(worm.x, worm.y - 10); ctx.stroke();
    ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(this._rope.anchorX, this._rope.anchorY, 3, 0, Math.PI * 2); ctx.fill();
  }

  private _renderGirderPreview(ctx: CanvasRenderingContext2D): void {
    ctx.save(); ctx.translate(this._mouseWorldX, this._mouseWorldY); ctx.rotate(this._girderAngle);
    ctx.fillStyle = 'rgba(139, 90, 43, 0.5)'; ctx.fillRect(-60, -6, 120, 12);
    ctx.strokeStyle = 'rgba(100, 60, 20, 0.5)'; ctx.lineWidth = 1;
    for (let x = -55; x < 55; x += 15) {
      ctx.beginPath(); ctx.moveTo(x, -6); ctx.lineTo(x + 15, 6); ctx.moveTo(x + 15, -6); ctx.lineTo(x, 6); ctx.stroke();
    }
    ctx.restore();
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────

  private _renderHUD(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this._phase === 'title' || this._phase === 'victory') return;
    ctx.save();

    // Top bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.fillRect(0, 0, w, 50);
    const barWidth = (w - 40) / this._teams.length;
    for (let t = 0; t < this._teams.length; t++) {
      const team = this._teams[t]; const bx = 20 + t * barWidth; const by = 8; const bw = barWidth - 10; const bh = 14;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; this._roundRect(ctx, bx, by, bw, bh, 4); ctx.fill();
      const totalHp = team.worms.reduce((s, w) => s + Math.max(0, w.hp), 0); const maxHp = team.worms.length * WORM_HP; const pct = totalHp / maxHp;
      const hpGrad = ctx.createLinearGradient(bx, by, bx + bw * pct, by);
      hpGrad.addColorStop(0, team.color); hpGrad.addColorStop(1, team.lightColor);
      ctx.fillStyle = hpGrad; this._roundRect(ctx, bx, by, bw * pct, bh, 4); ctx.fill();
      if (t === this._currentTeam) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; this._roundRect(ctx, bx, by, bw, bh, 4); ctx.stroke(); }
      ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const controlLabel = this._teamIsHuman[t] ? 'You' : 'AI';
      ctx.fillText(`${team.name} (${controlLabel}) ${totalHp}HP`, bx + bw / 2, by + bh / 2);
    }

    // Current worm info
    const worm = this._getActiveWorm();
    if (worm) {
      const team = this._teams[this._currentTeam];
      ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = team.color; ctx.fillText(`${team.name}: ${worm.name}`, 20, 30);
    }

    // Turn timer
    ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = this._turnTimer <= 5 ? '#ff3333' : this._turnTimer <= 15 ? '#ffaa00' : '#ffffff';
    ctx.fillText(`${Math.ceil(this._turnTimer)}`, w / 2, 28);

    // Turn counter
    ctx.font = '12px sans-serif'; ctx.fillStyle = '#aaa'; ctx.fillText(`Turn ${this._turnNumber}`, w / 2, 5);

    // Sudden death warning
    if (this._suddenDeath) {
      const sdAlpha = 0.5 + Math.sin(this._gameTime * 4) * 0.3;
      ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = `rgba(255, 50, 50, ${sdAlpha})`;
      ctx.fillText('SUDDEN DEATH', w / 2, 50);
    } else if (this._turnNumber >= SUDDEN_DEATH_TURN - 5) {
      ctx.font = '11px sans-serif'; ctx.fillStyle = '#ff8844';
      ctx.fillText(`Sudden Death in ${SUDDEN_DEATH_TURN - this._turnNumber} turns`, w / 2, 50);
    }

    // Wind
    const windX = w - 120; const windY = 30;
    ctx.font = '12px sans-serif'; ctx.fillStyle = '#aaa'; ctx.textAlign = 'center'; ctx.fillText('Wind', windX, windY - 5);
    const windLen = this._wind * 40;
    ctx.strokeStyle = this._wind > 0 ? '#66aaff' : '#ff6666'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(windX - windLen, windY + 10); ctx.lineTo(windX + windLen, windY + 10); ctx.stroke();
    if (Math.abs(this._wind) > 0.05) {
      const dir = Math.sign(this._wind); ctx.beginPath();
      ctx.moveTo(windX + windLen, windY + 10); ctx.lineTo(windX + windLen - dir * 8, windY + 5); ctx.lineTo(windX + windLen - dir * 8, windY + 15);
      ctx.closePath(); ctx.fill();
    }

    // Current weapon
    const weaponDef = WEAPONS[this._currentWeapon];
    if (weaponDef) {
      const wx = 20; const wy = h - 50;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; this._roundRect(ctx, wx, wy, 180, 40, 6); ctx.fill();
      ctx.font = '20px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(weaponDef.icon, wx + 10, wy + 20);
      ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(weaponDef.name, wx + 38, wy + 15);
      const team = this._teams[this._currentTeam]; let ammoText = '∞';
      if (weaponDef.ammo !== -1 && team) { ammoText = `${team.ammo.get(this._currentWeapon) ?? 0}`; }
      ctx.font = '11px sans-serif'; ctx.fillStyle = '#aaa'; ctx.fillText(`Ammo: ${ammoText}`, wx + 38, wy + 30);
      ctx.fillStyle = '#666'; ctx.fillText('E: Weapons', wx + 110, wy + 30);
    }

    // Power bar (glowing when charging)
    if (this._charging) {
      const pbX = w / 2 - 100; const pbY = h - 80; const pbW = 200; const pbH = 16;
      // Pulsing glow edge
      const pulseAlpha = 0.3 + Math.sin(this._gameTime * 8) * 0.15;
      ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 8 + Math.sin(this._gameTime * 8) * 4;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; this._roundRect(ctx, pbX - 2, pbY - 2, pbW + 4, pbH + 4, 4); ctx.fill();
      ctx.shadowBlur = 0;
      const powerGrad = ctx.createLinearGradient(pbX, pbY, pbX + pbW, pbY);
      powerGrad.addColorStop(0, '#44ff44'); powerGrad.addColorStop(0.5, '#ffff00'); powerGrad.addColorStop(1, '#ff3333');
      ctx.fillStyle = powerGrad; this._roundRect(ctx, pbX, pbY, pbW * this._power, pbH, 3); ctx.fill();
      // Pulsing edge on the fill
      ctx.strokeStyle = `rgba(255, 255, 200, ${pulseAlpha})`; ctx.lineWidth = 2;
      this._roundRect(ctx, pbX, pbY, pbW * this._power, pbH, 3); ctx.stroke();
      ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText(`Power: ${Math.floor(this._power * 100)}%`, pbX + pbW / 2, pbY + pbH / 2 + 1);
    }

    // Crosshair
    if (this._phase === 'playing' || this._phase === 'aiming') {
      const cx = this._mouseX; const cy = this._mouseY; const cSize = 12 + Math.sin(this._crosshairPulse) * 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - cSize, cy); ctx.lineTo(cx - 4, cy); ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + cSize, cy);
      ctx.moveTo(cx, cy - cSize); ctx.lineTo(cx, cy - 4); ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + cSize);
      ctx.stroke();
      ctx.fillStyle = '#ff3333'; ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
    }

    // Kill feed (bottom-right)
    if (this._killFeed.length > 0) {
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      let fy = h - 70;
      for (let i = this._killFeed.length - 1; i >= 0; i--) {
        const kf = this._killFeed[i]; const ka = Math.min(1, kf.timer);
        ctx.globalAlpha = ka; ctx.font = '12px sans-serif';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        const tw = ctx.measureText(kf.text).width + 10;
        this._roundRect(ctx, w - 15 - tw, fy - 14, tw, 18, 4); ctx.fill();
        ctx.fillStyle = kf.color; ctx.fillText(kf.text, w - 20, fy);
        fy -= 22;
      }
      ctx.globalAlpha = 1;
    }

    // Minimap
    this._renderMinimap(ctx, w, h);

    // Flash text
    if (this._flashTimer > 0) {
      const flashAlpha = Math.min(1, this._flashTimer);
      ctx.globalAlpha = flashAlpha; ctx.font = 'bold 28px serif'; ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)'; ctx.lineWidth = 3; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeText(this._flashText, w / 2, h / 2 - 100); ctx.fillText(this._flashText, w / 2, h / 2 - 100);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private _renderMinimap(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    const mmW = 180; const mmH = 70; const mmX = screenW - mmW - 15; const mmY = screenH - mmH - 15;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; ctx.lineWidth = 1;
    this._roundRect(ctx, mmX, mmY, mmW, mmH, 4); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); this._roundRect(ctx, mmX, mmY, mmW, mmH, 4); ctx.clip();
    const scaleX = mmW / TERRAIN_WIDTH; const scaleY = mmH / TERRAIN_HEIGHT;
    ctx.fillStyle = '#445533'; ctx.beginPath(); ctx.moveTo(mmX, mmY + mmH);
    for (let sx = 0; sx < mmW; sx += 2) { const worldX = Math.floor(sx / scaleX); ctx.lineTo(mmX + sx, mmY + this._findSurfaceY(worldX) * scaleY); }
    ctx.lineTo(mmX + mmW, mmY + mmH); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(30, 80, 150, 0.6)';
    const waterMmY = (TERRAIN_HEIGHT - WATER_LEVEL - this._suddenDeathWaterExtra) * scaleY;
    ctx.fillRect(mmX, mmY + waterMmY, mmW, mmH - waterMmY);
    for (const team of this._teams) for (const worm of team.worms) {
      if (!worm.alive) continue;
      ctx.fillStyle = team.color; ctx.beginPath(); ctx.arc(mmX + worm.x * scaleX, mmY + worm.y * scaleY, 2, 0, Math.PI * 2); ctx.fill();
    }
    const vpX = this._camX - (screenW / 2) / this._camZoom; const vpY = this._camY - (screenH / 2) / this._camZoom;
    const vpW = screenW / this._camZoom; const vpH = screenH / this._camZoom;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.lineWidth = 1;
    ctx.strokeRect(mmX + vpX * scaleX, mmY + vpY * scaleY, vpW * scaleX, vpH * scaleY);
    ctx.restore();
  }

  // ─── WEAPON SELECT RENDER ──────────────────────────────────────────────────

  private _renderWeaponSelect(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, w, h);
    ctx.font = 'bold 28px serif'; ctx.fillStyle = '#ffd700'; ctx.textAlign = 'center'; ctx.fillText('Weapon Arsenal', w / 2, 45);
    const cols = 6; const cellW = 130; const cellH = 50;
    const startX = (w - cols * cellW) / 2; const startY = 80;
    const team = this._teams[this._currentTeam]; const keys = Object.keys(WEAPONS);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]; const weapon = WEAPONS[key];
      const col = i % cols; const row = Math.floor(i / cols);
      const x = startX + col * cellW; const y = startY + row * cellH;
      let ammo = -1; if (weapon.ammo !== -1) ammo = team ? (team.ammo.get(key) ?? 0) : 0;
      const hasAmmo = ammo === -1 || ammo > 0; const isSelected = key === this._currentWeapon;
      const hover = this._mouseX >= x && this._mouseX <= x + cellW && this._mouseY >= y && this._mouseY <= y + cellH;
      if (isSelected) ctx.fillStyle = 'rgba(200, 170, 50, 0.3)';
      else if (hover && hasAmmo) ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
      else ctx.fillStyle = 'rgba(40, 40, 40, 0.3)';
      this._roundRect(ctx, x + 2, y + 2, cellW - 4, cellH - 4, 4); ctx.fill();
      if (isSelected) { ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; this._roundRect(ctx, x + 2, y + 2, cellW - 4, cellH - 4, 4); ctx.stroke(); }
      ctx.globalAlpha = hasAmmo ? 1 : 0.3;
      ctx.font = '18px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(weapon.icon, x + 6, y + cellH / 2);
      ctx.font = '11px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(weapon.name, x + 28, y + 18);
      ctx.font = '9px sans-serif'; ctx.fillStyle = '#aaa'; ctx.fillText(`Ammo: ${ammo === -1 ? '∞' : ammo}  Dmg: ${weapon.damage}`, x + 28, y + 35);
      if (i < 9) { ctx.font = '9px sans-serif'; ctx.fillStyle = '#666'; ctx.textAlign = 'right'; ctx.fillText(`${i + 1}`, x + cellW - 8, y + 14); }
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }
    ctx.font = '14px sans-serif'; ctx.fillStyle = '#888'; ctx.textAlign = 'center'; ctx.fillText('Click to select • ESC to close', w / 2, h - 30);
  }

  // ─── VICTORY SCREEN RENDER ─────────────────────────────────────────────────

  private _renderVictoryScreen(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; ctx.fillRect(0, 0, w, h);
    const cx = w / 2; const cy = h / 2 - 40;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    // Animated trophy/grail
    const trophyBob = Math.sin(this._gameTime * 3) * 5;
    const trophyY = cy - 100 + trophyBob;
    // Cup base
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.moveTo(cx - 8, trophyY + 20); ctx.lineTo(cx + 8, trophyY + 20); ctx.lineTo(cx + 12, trophyY + 25); ctx.lineTo(cx - 12, trophyY + 25); ctx.closePath(); ctx.fill();
    // Stem
    ctx.fillRect(cx - 3, trophyY + 10, 6, 10);
    // Cup
    ctx.beginPath(); ctx.moveTo(cx - 15, trophyY - 10); ctx.quadraticCurveTo(cx - 15, trophyY + 12, cx, trophyY + 10);
    ctx.quadraticCurveTo(cx + 15, trophyY + 12, cx + 15, trophyY - 10); ctx.lineTo(cx - 15, trophyY - 10); ctx.closePath(); ctx.fill();
    // Glow
    ctx.fillStyle = `rgba(255, 215, 0, ${0.2 + Math.sin(this._gameTime * 4) * 0.1})`;
    ctx.beginPath(); ctx.arc(cx, trophyY, 30, 0, Math.PI * 2); ctx.fill();

    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 20;
    ctx.font = 'bold 48px serif'; ctx.fillStyle = '#ffd700'; ctx.fillText('VICTORY!', cx, cy - 40);
    ctx.shadowBlur = 0;

    if (this._winningTeam >= 0) {
      const team = this._teams[this._winningTeam];
      ctx.font = 'bold 32px serif'; ctx.fillStyle = team.color; ctx.fillText(`${team.name} Wins!`, cx, cy + 10);
    } else {
      ctx.font = 'bold 32px serif'; ctx.fillStyle = '#aaa'; ctx.fillText('Draw!', cx, cy + 10);
    }

    ctx.font = '16px sans-serif'; ctx.fillStyle = '#ccc'; ctx.fillText(`Battle lasted ${this._turnNumber} turns`, cx, cy + 50);

    // Per-team stats with kills and damage
    let statY = cy + 80;
    for (const team of this._teams) {
      const alive = team.worms.filter(w => w.alive).length;
      const totalHp = team.worms.reduce((s, w) => s + Math.max(0, w.hp), 0);
      const totalKills = team.worms.reduce((s, w) => s + w.kills, 0);
      ctx.fillStyle = team.color; ctx.font = '14px sans-serif';
      ctx.fillText(`${team.name}: ${alive}/4 alive, ${totalHp}HP | Kills: ${totalKills} | Dmg: ${team.damageDealt}`, cx, statY);
      statY += 22;
    }

    // MVP (most kills)
    let mvp: Worm | null = null; let mvpKills = -1;
    for (const team of this._teams) for (const w of team.worms) { if (w.kills > mvpKills) { mvpKills = w.kills; mvp = w; } }
    if (mvp && mvpKills > 0) {
      ctx.font = 'bold 16px serif'; ctx.fillStyle = '#ffdd44';
      ctx.fillText(`MVP: ${mvp.name} (${mvpKills} kills)`, cx, statY + 10);
    }

    // Buttons
    for (const btn of this._victoryButtons) {
      const bx = cx + btn.x; const by = cy + btn.y;
      btn.hover = this._mouseX >= bx && this._mouseX <= bx + btn.w && this._mouseY >= by && this._mouseY <= by + btn.h;
      const grad = ctx.createLinearGradient(bx, by, bx, by + btn.h);
      if (btn.hover) { grad.addColorStop(0, '#554422'); grad.addColorStop(1, '#443311'); }
      else { grad.addColorStop(0, '#332211'); grad.addColorStop(1, '#221100'); }
      ctx.fillStyle = grad; ctx.strokeStyle = btn.hover ? '#ffd700' : '#886633'; ctx.lineWidth = btn.hover ? 2 : 1;
      this._roundRect(ctx, bx, by, btn.w, btn.h, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = btn.hover ? '#ffd700' : '#ccaa66'; ctx.font = 'bold 18px serif'; ctx.fillText(btn.text, bx + btn.w / 2, by + btn.h / 2);
    }
    ctx.restore();
  }

  // ─── PAUSE MENU ─────────────────────────────────────────────────────────────

  private _pauseMenuButtons(): { x: number; y: number; w: number; h: number; label: string; tab: typeof this._pauseMenuTab | 'resume' | 'quit' }[] {
    const bw = 220; const bh = 42; const gap = 10; const startY = -130;
    return [
      { x: -bw / 2, y: startY, w: bw, h: bh, label: 'RESUME', tab: 'resume' as const },
      { x: -bw / 2, y: startY + (bh + gap), w: bw, h: bh, label: 'CONTROLS', tab: 'controls' as const },
      { x: -bw / 2, y: startY + (bh + gap) * 2, w: bw, h: bh, label: 'INTRODUCTION', tab: 'intro' as const },
      { x: -bw / 2, y: startY + (bh + gap) * 3, w: bw, h: bh, label: 'GAME CONCEPTS', tab: 'concepts' as const },
      { x: -bw / 2, y: startY + (bh + gap) * 4, w: bw, h: bh, label: 'WEAPONS GUIDE', tab: 'weapons' as const },
      { x: -bw / 2, y: startY + (bh + gap) * 5, w: bw, h: bh, label: 'TIPS & TRICKS', tab: 'tips' as const },
      { x: -bw / 2, y: startY + (bh + gap) * 6 + 10, w: bw, h: bh, label: 'QUIT TO MENU', tab: 'quit' as const },
    ];
  }

  private _checkPauseMenuClick(): void {
    const cx = this._canvas.width / 2;
    const cy = this._canvas.height / 2;

    if (this._pauseMenuTab !== 'main') {
      // Back button
      const backX = cx - 250; const backY = cy - this._canvas.height * 0.4 + 10;
      if (this._mouseX >= backX && this._mouseX <= backX + 80 && this._mouseY >= backY && this._mouseY <= backY + 30) {
        this._pauseMenuTab = 'main'; this._pauseMenuScroll = 0; this._playSound('click'); return;
      }
      return;
    }

    for (const btn of this._pauseMenuButtons()) {
      const bx = cx + btn.x; const by = cy + btn.y;
      if (this._mouseX >= bx && this._mouseX <= bx + btn.w && this._mouseY >= by && this._mouseY <= by + btn.h) {
        this._playSound('click');
        if (btn.tab === 'resume') { this._pauseMenuOpen = false; this._pauseMenuTab = 'main'; }
        else if (btn.tab === 'quit') { this._pauseMenuOpen = false; window.dispatchEvent(new CustomEvent('worms2dExit')); }
        else { this._pauseMenuTab = btn.tab as any; this._pauseMenuScroll = 0; }
        return;
      }
    }
  }

  private _renderPauseMenu(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Dim overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    if (this._pauseMenuTab === 'main') {
      this._renderPauseMenuMain(ctx, cx, cy);
    } else {
      this._renderPauseMenuTab(ctx, w, h, cx, cy);
    }
  }

  private _renderPauseMenuMain(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 15;
    ctx.font = 'bold 42px serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('PAUSED', cx, cy - 200);
    ctx.shadowBlur = 0;

    // Decorative line
    ctx.strokeStyle = '#886633'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 120, cy - 175); ctx.lineTo(cx + 120, cy - 175); ctx.stroke();

    // Subtitle
    ctx.font = 'italic 14px serif'; ctx.fillStyle = '#aa8855';
    ctx.fillText('Press ESC to return to battle', cx, cy - 160);

    // Buttons
    for (const btn of this._pauseMenuButtons()) {
      const bx = cx + btn.x; const by = cy + btn.y;
      const hover = this._mouseX >= bx && this._mouseX <= bx + btn.w && this._mouseY >= by && this._mouseY <= by + btn.h;

      const grad = ctx.createLinearGradient(bx, by, bx, by + btn.h);
      if (btn.tab === 'quit') {
        if (hover) { grad.addColorStop(0, '#662222'); grad.addColorStop(1, '#441111'); }
        else { grad.addColorStop(0, '#3a1111'); grad.addColorStop(1, '#2a0808'); }
      } else if (hover) {
        grad.addColorStop(0, '#554422'); grad.addColorStop(1, '#443311');
      } else {
        grad.addColorStop(0, '#2a2010'); grad.addColorStop(1, '#1a1508');
      }

      ctx.fillStyle = grad;
      this._roundRect(ctx, bx, by, btn.w, btn.h, 8); ctx.fill();
      ctx.strokeStyle = hover ? '#ffd700' : (btn.tab === 'quit' ? '#aa4444' : '#665533');
      ctx.lineWidth = hover ? 2 : 1;
      this._roundRect(ctx, bx, by, btn.w, btn.h, 8); ctx.stroke();

      ctx.fillStyle = hover ? '#ffd700' : (btn.tab === 'quit' ? '#ff6644' : '#ccaa66');
      ctx.font = btn.tab === 'resume' ? 'bold 18px serif' : '16px serif';
      ctx.fillText(btn.label, bx + btn.w / 2, by + btn.h / 2);
    }

    // Turn info at bottom
    if (this._teams.length > 0) {
      ctx.font = '12px sans-serif'; ctx.fillStyle = '#777766';
      ctx.fillText(`Turn ${this._turnNumber} \u2022 ${this._teams.filter(t => t.worms.some(w => w.alive)).length} teams alive`, cx, cy + 220);
    }

    ctx.restore();
  }

  private _renderPauseMenuTab(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number): void {
    ctx.save();

    // Panel
    const pw = 520; const ph = h * 0.8;
    const px = cx - pw / 2; const py = cy - ph / 2;

    // Panel background
    const panelGrad = ctx.createLinearGradient(px, py, px, py + ph);
    panelGrad.addColorStop(0, '#1a1510'); panelGrad.addColorStop(1, '#0d0a06');
    ctx.fillStyle = panelGrad;
    this._roundRect(ctx, px, py, pw, ph, 12); ctx.fill();
    ctx.strokeStyle = '#665533'; ctx.lineWidth = 2;
    this._roundRect(ctx, px, py, pw, ph, 12); ctx.stroke();

    // Inner border
    ctx.strokeStyle = '#332a11'; ctx.lineWidth = 1;
    this._roundRect(ctx, px + 4, py + 4, pw - 8, ph - 8, 10); ctx.stroke();

    // Header bar
    ctx.fillStyle = '#2a2010';
    this._roundRect(ctx, px + 6, py + 6, pw - 12, 40, 8); ctx.fill();

    // Tab title
    const titles: Record<string, string> = {
      controls: 'CONTROLS',
      intro: 'INTRODUCTION',
      concepts: 'GAME CONCEPTS',
      weapons: 'WEAPONS GUIDE',
      tips: 'TIPS & TRICKS',
    };

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px serif'; ctx.fillStyle = '#ffd700';
    ctx.fillText(titles[this._pauseMenuTab] || '', cx, py + 26);

    // Back button
    const backX = px + 12; const backY = py + 12;
    const backHover = this._mouseX >= backX && this._mouseX <= backX + 80 && this._mouseY >= backY && this._mouseY <= backY + 30;
    ctx.fillStyle = backHover ? '#443322' : '#2a1a10';
    this._roundRect(ctx, backX, backY, 80, 30, 6); ctx.fill();
    ctx.strokeStyle = backHover ? '#ffd700' : '#554433'; ctx.lineWidth = 1;
    this._roundRect(ctx, backX, backY, 80, 30, 6); ctx.stroke();
    ctx.font = '13px serif'; ctx.fillStyle = backHover ? '#ffd700' : '#aa9966'; ctx.textAlign = 'center';
    ctx.fillText('\u2190 Back', backX + 40, backY + 15);

    // Content area with clipping
    const contentX = px + 15; const contentY = py + 55;
    const contentW = pw - 30; const contentH = ph - 70;

    ctx.save();
    ctx.beginPath(); ctx.rect(contentX, contentY, contentW, contentH); ctx.clip();
    ctx.translate(0, -this._pauseMenuScroll);

    const lx = contentX + 10; let ly = contentY + 20;

    const heading = (text: string) => {
      ctx.font = 'bold 16px serif'; ctx.fillStyle = '#ffd700'; ctx.textAlign = 'left';
      ctx.fillText(text, lx, ly); ly += 26;
    };
    const line = (text: string, color = '#ccbb99') => {
      ctx.font = '13px sans-serif'; ctx.fillStyle = color; ctx.textAlign = 'left';
      // Word wrap
      const words = text.split(' '); let row = ''; const maxW = contentW - 30;
      for (const word of words) {
        const test = row + (row ? ' ' : '') + word;
        if (ctx.measureText(test).width > maxW && row) {
          ctx.fillText(row, lx, ly); ly += 18; row = word;
        } else { row = test; }
      }
      if (row) { ctx.fillText(row, lx, ly); ly += 18; }
      ly += 4;
    };
    const gap = () => { ly += 10; };

    switch (this._pauseMenuTab) {
      case 'controls':
        heading('Movement');
        line('A / Left Arrow  -  Move left'); line('D / Right Arrow  -  Move right');
        line('W / Up Arrow  -  Aim up (on rope: shorten)'); line('S / Down Arrow  -  Aim down (on rope: lengthen)');
        line('Space  -  Jump / Release rope');
        gap();
        heading('Combat');
        line('Mouse  -  Aim weapon toward cursor');
        line('Left Click (hold)  -  Charge shot power'); line('Left Click (release)  -  Fire weapon');
        line('E  -  Open weapon select menu'); line('1-9  -  Quick-select weapon by slot');
        gap();
        heading('Camera');
        line('Mouse Wheel  -  Zoom in/out (0.5x - 2.0x)');
        line('Mouse at screen edge  -  Scroll camera');
        line('Tab  -  Jump camera to enemy worm');
        gap();
        heading('Interface');
        line('ESC  -  Pause menu / Close overlays');
        break;

      case 'intro':
        heading('What is Worms 2D?');
        line('Worms 2D is a turn-based artillery game set in the world of Camelot. Teams of medieval knights take turns moving, aiming, and firing weapons across a destructible landscape.');
        gap();
        heading('Objective');
        line('Eliminate all enemy worms by reducing their HP to zero. The last team standing wins the battle. Worms can die from weapon damage, fall damage, or drowning in water.');
        gap();
        heading('Teams');
        line('Round Table (Blue) - Led by King Arthur, featuring Lancelot, Gawain, and Percival.');
        line("Mordred's Host (Red) - Led by Mordred, with Agravaine, Morgause, and Gareth.");
        line("Merlin's Circle (Green) - Led by the great wizard Merlin, with Nimue, Viviane, and Taliesin.");
        line('Grail Knights (Gold) - Led by Sir Galahad, with Bors, Tristan, and Kay.');
        gap();
        heading('Turn Structure');
        line('Each turn lasts 45 seconds. You can move, aim, and fire one weapon. After firing, you get a 5-second retreat phase to move to safety. Then the next team takes their turn.');
        break;

      case 'concepts':
        heading('Destructible Terrain');
        line('Explosions carve holes in the terrain. Use this strategically - blast tunnels to reach enemies, collapse ground beneath them, or create shelter. Terrain shapes determine the flow of battle.');
        gap();
        heading('Wind');
        line('Wind changes direction each turn and affects most projectile weapons. Check the wind indicator at the top-right and adjust your aim accordingly. Stronger wind means bigger adjustments.');
        gap();
        heading('Fall Damage');
        line('Worms take damage from long falls. Knocking an enemy off a cliff can be just as deadly as a direct hit. Be careful of your own positioning near ledges!');
        gap();
        heading('Water');
        line('Water at the bottom of the map is instant death. Any worm that falls into water is immediately eliminated. Use knockback weapons to push enemies toward the water!');
        gap();
        heading('Sudden Death');
        line('After turn 30, Sudden Death activates. The water level rises by 2 pixels each turn, gradually shrinking the battlefield and forcing close-quarters combat.');
        gap();
        heading('Supply Crates');
        line('Every 5 turns, a supply crate parachutes onto the battlefield. Walk a worm over it to receive bonus ammunition for a random weapon. Crates can change the tide of battle!');
        gap();
        heading('Status Effects');
        line('Freeze Blast - Encases the target in ice for 1 turn, reducing their damage taken but preventing them from acting.');
        line('Poison Strike - Applies poison that deals 5 damage at the end of each turn for 3 turns.');
        break;

      case 'weapons': {
        heading('Weapon Types');
        line('Projectile - Fired at an angle, affected by gravity and wind. Explodes on contact with terrain or worms.');
        line('Grenade - Bounces off surfaces and explodes after a fuse timer. Can be bounced around corners.');
        line('Hitscan - Instant hit in a line (shotgun) or cone (dragon breath). No travel time.');
        line('Melee - Close range attacks with high knockback. Great for punting enemies into water.');
        line('Airstrike - Target a position and missiles rain from the sky. Choose the drop zone wisely.');
        line('Strike - Targeted attacks like lightning or Excalibur that hit a specific point.');
        line('Utility - Teleport, ninja rope, and girder help with positioning and defense.');
        gap();

        heading('All Weapons');
        const weaponKeys = Object.keys(WEAPONS);
        for (let i = 0; i < weaponKeys.length; i++) {
          const wk = weaponKeys[i]; const wd = WEAPONS[wk];
          const ammoStr = wd.ammo === -1 ? 'Unlimited' : `${wd.ammo} per team`;
          ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#eedd99'; ctx.textAlign = 'left';
          ctx.fillText(`${wd.icon} ${wd.name}`, lx, ly);
          ctx.font = '11px sans-serif'; ctx.fillStyle = '#998866';
          ctx.fillText(`${wd.type.toUpperCase()} \u2022 Dmg: ${wd.damage} \u2022 Blast: ${wd.radius} \u2022 ${ammoStr}`, lx + 160, ly);
          ly += 16;
          ctx.font = '12px sans-serif'; ctx.fillStyle = '#aa9977';
          ctx.fillText(wd.description + (wd.windAffected ? ' (wind affected)' : ''), lx + 20, ly);
          ly += 20;
        }
        break;
      }

      case 'tips':
        heading('Beginner Tips');
        line('Start with the Bazooka - it has unlimited ammo and is reliable at most ranges.');
        line('Always account for wind. A strong headwind can turn your rocket back on you!');
        line('Use grenades to hit enemies behind cover. The bounce mechanic lets you reach tricky spots.');
        gap();
        heading('Intermediate Strategy');
        line('Dig tunnels with weak explosions to create protected positions for your worms.');
        line('Use the Baseball Bat near water for easy eliminations - its massive knockback is devastating near edges.');
        line('Save powerful limited weapons (Holy Hand Grenade, Meteor, Holy Grail) for clustered enemies or dire situations.');
        line('Place mines on narrow paths that enemies must cross.');
        gap();
        heading('Advanced Tactics');
        line("Chain explosions: shoot an oil barrel or mine near enemies for bonus damage and area denial.");
        line('The Ninja Rope lets you reach elevated positions and attack from unexpected angles.');
        line('Earthquake affects ALL worms equally - use it when enemies are near edges and your worms are safe.');
        line('Teleport is an escape tool. Use it to reposition a worm that would otherwise be trapped.');
        line('Dragon Breath hits everything in a cone - line up multiple enemies for maximum value.');
        gap();
        heading('Sudden Death Strategy');
        line('As water rises, high ground becomes critical. Use Girders to build platforms above the rising waterline.');
        line('Knock enemies downhill toward the encroaching water for easy kills.');
        line('Save a Teleport for emergency repositioning when the water gets close.');
        break;
    }

    ctx.restore();

    // Scroll indicator if content overflows
    const maxScroll = Math.max(0, ly + this._pauseMenuScroll - (contentY + contentH));
    if (maxScroll > 0) {
      const scrollPct = this._pauseMenuScroll / maxScroll;
      const trackH = contentH - 20;
      const thumbH = Math.max(30, trackH * (contentH / (ly + this._pauseMenuScroll - contentY)));
      const thumbY = contentY + 10 + scrollPct * (trackH - thumbH);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
      this._roundRect(ctx, contentX + contentW - 8, contentY + 10, 6, trackH, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
      this._roundRect(ctx, contentX + contentW - 8, thumbY, 6, thumbH, 3); ctx.fill();
    }

    ctx.restore();
  }

  // ─── UTILITY ───────────────────────────────────────────────────────────────

  private _roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
}
