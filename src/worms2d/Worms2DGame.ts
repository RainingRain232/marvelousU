// /home/rain/Bureaublad/workspace/src/worms2d/Worms2DGame.ts
//
// WORMS 2D — Full-screen Canvas 2D turn-based artillery game
// Camelot-themed with medieval knights

// ─── Constants ──────────────────────────────────────────────────────────────

const GRAVITY = 400;
const WORM_RADIUS = 10;
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

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Vec2 {
  x: number;
  y: number;
}

interface Worm {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  name: string;
  team: number;
  alive: boolean;
  facing: number;
  aimAngle: number;
  grounded: boolean;
  frozen: number;
  poisoned: number;
  animFrame: number;
  animTimer: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: string;
  timer: number;
  bounces: number;
  owner: number;
  trail: Vec2[];
  clusterCount?: number;
  fuseTime?: number;
  active: boolean;
  angle: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  gravity: boolean;
  type: 'circle' | 'spark' | 'smoke' | 'debris' | 'fire' | 'text';
  text?: string;
  rotation?: number;
  rotSpeed?: number;
}

interface WeaponDef {
  name: string;
  icon: string;
  ammo: number;
  damage: number;
  radius: number;
  type: 'projectile' | 'grenade' | 'hitscan' | 'melee' | 'airstrike' | 'placed' | 'teleport' | 'strike' | 'rope';
  fuseTime?: number;
  clusterCount?: number;
  knockback: number;
  speed?: number;
  description: string;
  windAffected?: boolean;
}

interface Team {
  name: string;
  color: string;
  darkColor: string;
  lightColor: string;
  worms: Worm[];
  ammo: Map<string, number>;
}

type Phase = 'title' | 'playing' | 'aiming' | 'firing' | 'resolving' | 'retreat' | 'weapon_select' | 'victory';

interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  opacity: number;
  bumps: number[];
}

interface Star {
  x: number;
  y: number;
  size: number;
  twinkleOffset: number;
  twinkleSpeed: number;
}

interface MountainPeak {
  x: number;
  height: number;
  width: number;
}

interface CastleSilhouette {
  x: number;
  width: number;
  baseHeight: number;
  towers: { xOff: number; width: number; height: number; battlement: boolean }[];
}

interface TreeSilhouette {
  x: number;
  height: number;
  width: number;
  type: 'round' | 'pointed' | 'oak';
}

interface TitleButton {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  action: () => void;
  hover: boolean;
}

interface AirStrikeData {
  x: number;
  projectiles: number;
  delay: number;
  timer: number;
  spawned: number;
  weaponKey: string;
}

interface RopeState {
  active: boolean;
  anchorX: number;
  anchorY: number;
  length: number;
  angle: number;
  angularVel: number;
}

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

// ─── Weapon key list for quick-select ───────────────────────────────────────
const WEAPON_KEYS = Object.keys(WEAPONS);

// ─── Utility ────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 255, g: 255, b: 255 };
}

// ─── Main Game Class ────────────────────────────────────────────────────────

export class Worms2DGame {
  // Canvas and rendering
  private _canvas!: HTMLCanvasElement;
  private _ctx!: CanvasRenderingContext2D;
  private _terrainCanvas!: HTMLCanvasElement;
  private _terrainCtx!: CanvasRenderingContext2D;
  private _bgCanvas!: HTMLCanvasElement;
  private _bgCtx!: CanvasRenderingContext2D;

  // Terrain data
  private _terrainMask!: Uint8Array;
  private _terrainDirty = true;
  private _terrainDirtyRegion: { x1: number; y1: number; x2: number; y2: number } | null = null;

  // Game state
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

  // Projectiles and particles
  private _projectiles: Projectile[] = [];
  private _particles: Particle[] = [];
  private _airStrikes: AirStrikeData[] = [];

  // Rope
  private _rope: RopeState = { active: false, anchorX: 0, anchorY: 0, length: 0, angle: 0, angularVel: 0 };

  // Camera
  private _camX = 0;
  private _camY = 0;
  private _camTargetX = 0;
  private _camTargetY = 0;
  private _camZoom = 1;
  private _camTargetZoom = 1;

  // Screen shake
  private _shakeAmount = 0;
  private _shakeTime = 0;

  // Input state
  private _keys: Set<string> = new Set();
  private _mouseX = 0;
  private _mouseY = 0;
  private _mouseWorldX = 0;
  private _mouseWorldY = 0;
  private _mouseDown = false;
  private _charging = false;
  private _chargeTime = 0;
  private _power = 0;

  // Weapon
  private _currentWeapon = 'bazooka';
  private _weaponSelectOpen = false;
  private _shotgunShotsLeft = 0;

  // AI
  private _aiActive = false;
  private _aiTimer = 0;
  private _aiPhase: 'thinking' | 'moving' | 'aiming' | 'firing' | 'waiting' = 'thinking';
  private _aiTargetAngle = 0;
  private _aiTargetPower = 0;
  private _aiMoveDir = 0;
  private _aiMoveTime = 0;

  // Animation frame
  private _rafId = 0;
  private _lastTime = 0;

  // Background objects
  private _clouds: Cloud[] = [];
  private _stars: Star[] = [];
  private _mountains: MountainPeak[][] = [];
  private _castles: CastleSilhouette[] = [];
  private _trees: TreeSilhouette[][] = [];

  // Title screen buttons
  private _titleButtons: TitleButton[] = [];

  // Victory buttons
  private _victoryButtons: TitleButton[] = [];

  // Placed mines
  private _mines: { x: number; y: number; team: number }[] = [];

  // Girder placement
  private _placingGirder = false;
  private _girderAngle = 0;

  // Teleport mode
  private _teleportMode = false;

  // Audio context
  private _audioCtx: AudioContext | null = null;

  // Event handler references for cleanup
  private _boundHandlers: { type: string; handler: (e: any) => void }[] = [];

  // Explosions pending (for resolving phase)
  private _pendingExplosions: { x: number; y: number; radius: number; damage: number; knockback: number; owner: number; weaponKey: string }[] = [];

  // Resolve timer
  private _resolveTimer = 0;
  private _resolvePhaseDelay = 0;

  // Transition delay for next turn
  private _nextTurnDelay = 0;

  // Scroll margins
  private _edgeScrollMargin = 60;
  private _edgeScrollSpeed = 500;

  // Track worm fall start velocity for fall damage
  private _wormFallVelocities: Map<string, number> = new Map();

  // Text flash
  private _flashText = '';
  private _flashTimer = 0;

  // Background color cycle
  private _bgHueShift = 0;

  // Water animation offset
  private _waterOffset = 0;

  // Crosshair angle indicator
  private _crosshairPulse = 0;

  // ───────────────────────────────────────────────────────────────────────────
  // BOOT
  // ───────────────────────────────────────────────────────────────────────────

  boot(): void {
    // Create main canvas
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

    // Create offscreen terrain canvas
    this._terrainCanvas = document.createElement('canvas');
    this._terrainCanvas.width = TERRAIN_WIDTH;
    this._terrainCanvas.height = TERRAIN_HEIGHT;
    const tCtx = this._terrainCanvas.getContext('2d');
    if (!tCtx) throw new Error('Cannot get terrain 2D context');
    this._terrainCtx = tCtx;

    // Create offscreen background canvas
    this._bgCanvas = document.createElement('canvas');
    this._bgCanvas.width = TERRAIN_WIDTH;
    this._bgCanvas.height = TERRAIN_HEIGHT;
    const bgCtx = this._bgCanvas.getContext('2d');
    if (!bgCtx) throw new Error('Cannot get bg 2D context');
    this._bgCtx = bgCtx;

    // Resize handler
    this._resizeCanvas();
    const resizeHandler = () => this._resizeCanvas();
    window.addEventListener('resize', resizeHandler);
    this._boundHandlers.push({ type: 'resize', handler: resizeHandler });

    // Input handlers
    this._setupInput();

    // Generate background objects
    this._generateBackgroundObjects();

    // Render static background
    this._renderStaticBackground();

    // Init audio
    this._initAudio();

    // Show title
    this._phase = 'title';
    this._buildTitleButtons();

    // Start game loop
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

  // ───────────────────────────────────────────────────────────────────────────
  // DESTROY
  // ───────────────────────────────────────────────────────────────────────────

  destroy(): void {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }

    // Remove event listeners
    for (const { type, handler } of this._boundHandlers) {
      window.removeEventListener(type, handler);
    }
    this._boundHandlers = [];

    // Remove canvas
    if (this._canvas && this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }

    // Close audio
    if (this._audioCtx) {
      this._audioCtx.close().catch(() => {});
      this._audioCtx = null;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CANVAS RESIZE
  // ───────────────────────────────────────────────────────────────────────────

  private _resizeCanvas(): void {
    this._canvas.width = window.innerWidth;
    this._canvas.height = window.innerHeight;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // INPUT SETUP
  // ───────────────────────────────────────────────────────────────────────────

  private _setupInput(): void {
    const keydown = (e: KeyboardEvent) => {
      this._keys.add(e.key.toLowerCase());

      // Prevent default on game keys
      const gameKeys = ['w', 'a', 's', 'd', ' ', 'e', 'tab', 'escape', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'];
      if (gameKeys.includes(e.key.toLowerCase())) {
        e.preventDefault();
      }

      this._handleKeyDown(e.key.toLowerCase());
    };

    const keyup = (e: KeyboardEvent) => {
      this._keys.delete(e.key.toLowerCase());
    };

    const mousemove = (e: MouseEvent) => {
      this._mouseX = e.clientX;
      this._mouseY = e.clientY;
      // Convert to world coordinates
      this._mouseWorldX = (e.clientX - this._canvas.width / 2) / this._camZoom + this._camX;
      this._mouseWorldY = (e.clientY - this._canvas.height / 2) / this._camZoom + this._camY;
    };

    const mousedown = (e: MouseEvent) => {
      if (e.button === 0) {
        this._mouseDown = true;
        this._handleMouseDown();
      }
    };

    const mouseup = (e: MouseEvent) => {
      if (e.button === 0) {
        this._mouseDown = false;
        this._handleMouseUp();
      }
    };

    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
      this._camTargetZoom = clamp(this._camTargetZoom + zoomDelta, 0.5, 2.0);
    };

    const contextmenu = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('mousemove', mousemove);
    window.addEventListener('mousedown', mousedown);
    window.addEventListener('mouseup', mouseup);
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('contextmenu', contextmenu);

    this._boundHandlers.push(
      { type: 'keydown', handler: keydown },
      { type: 'keyup', handler: keyup },
      { type: 'mousemove', handler: mousemove },
      { type: 'mousedown', handler: mousedown },
      { type: 'mouseup', handler: mouseup },
      { type: 'wheel', handler: wheel },
      { type: 'contextmenu', handler: contextmenu },
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // KEY HANDLING
  // ───────────────────────────────────────────────────────────────────────────

  private _handleKeyDown(key: string): void {
    if (this._phase === 'title') return;

    if (key === 'escape') {
      if (this._weaponSelectOpen) {
        this._weaponSelectOpen = false;
      } else if (this._teleportMode) {
        this._teleportMode = false;
      } else if (this._placingGirder) {
        this._placingGirder = false;
      } else if (this._rope.active) {
        this._rope.active = false;
      }
      return;
    }

    if (key === 'e' && (this._phase === 'playing' || this._phase === 'aiming') && !this._aiActive) {
      this._weaponSelectOpen = !this._weaponSelectOpen;
      if (this._weaponSelectOpen) {
        this._playSound('click');
      }
      return;
    }

    if (key === 'tab' && this._phase !== 'title' && this._phase !== 'victory') {
      this._cycleCameraToNextWorm();
      return;
    }

    // Number keys for quick weapon select
    if (key >= '1' && key <= '9' && (this._phase === 'playing' || this._phase === 'aiming')) {
      const idx = parseInt(key) - 1;
      if (idx < WEAPON_KEYS.length) {
        this._selectWeapon(WEAPON_KEYS[idx]);
      }
      return;
    }

    // Space to jump
    if (key === ' ' && (this._phase === 'playing' || this._phase === 'aiming') && !this._aiActive) {
      const w = this._getActiveWorm();
      if (w && w.grounded) {
        w.vy = JUMP_FORCE;
        w.grounded = false;
        this._playSound('jump');
      }
      return;
    }

    // Girder rotation
    if (this._placingGirder && (key === 'arrowleft' || key === 'arrowright' || key === 'a' || key === 'd')) {
      const dir = (key === 'arrowleft' || key === 'a') ? -1 : 1;
      this._girderAngle += dir * Math.PI / 8;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MOUSE HANDLING
  // ───────────────────────────────────────────────────────────────────────────

  private _handleMouseDown(): void {
    if (this._phase === 'title') {
      this._checkTitleButtons();
      return;
    }
    if (this._phase === 'victory') {
      this._checkVictoryButtons();
      return;
    }
    if (this._weaponSelectOpen) {
      this._checkWeaponSelectClick();
      return;
    }
    if (this._teleportMode && (this._phase === 'playing' || this._phase === 'aiming')) {
      this._executeTeleport();
      return;
    }
    if (this._placingGirder && (this._phase === 'playing' || this._phase === 'aiming')) {
      this._placeGirder();
      return;
    }
    if ((this._phase === 'playing' || this._phase === 'aiming') && !this._aiActive) {
      this._phase = 'aiming';
      this._charging = true;
      this._chargeTime = 0;
      this._power = 0;
    }
  }

  private _handleMouseUp(): void {
    if (this._charging && (this._phase === 'aiming') && !this._aiActive) {
      this._fireWeapon(this._power);
      this._charging = false;
      this._chargeTime = 0;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // AUDIO
  // ───────────────────────────────────────────────────────────────────────────

  private _initAudio(): void {
    try {
      this._audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      this._audioCtx = null;
    }
  }

  private _ensureAudioContext(): void {
    if (this._audioCtx && this._audioCtx.state === 'suspended') {
      this._audioCtx.resume().catch(() => {});
    }
  }

  private _playSound(type: string): void {
    if (!this._audioCtx) return;
    this._ensureAudioContext();
    const ctx = this._audioCtx;
    const now = ctx.currentTime;

    try {
      switch (type) {
        case 'explosion': {
          // Noise burst with lowpass filter
          const bufferSize = ctx.sampleRate * 0.3;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
          }
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2000, now);
          filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          source.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          source.start(now);
          source.stop(now + 0.3);
          break;
        }
        case 'fire': {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }
        case 'splash': {
          const bufferSize = ctx.sampleRate * 0.4;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3) * 0.5;
          }
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(800, now);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          source.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          source.start(now);
          source.stop(now + 0.4);
          break;
        }
        case 'victory': {
          // Ascending major chord
          const notes = [523.25, 659.25, 783.99, 1046.50];
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now + i * 0.15);
            gain.gain.linearRampToValueAtTime(0.2, now + i * 0.15 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.8);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.8);
          });
          break;
        }
        case 'turn': {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = 880;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }
        case 'click': {
          const osc = ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.value = 1200;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }
        case 'jump': {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }
        case 'hit': {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }
        case 'death': {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.5);
          break;
        }
        case 'bounce': {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = 300;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }
        case 'charge': {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(200 + this._power * 800, now);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }
      }
    } catch {
      // Audio errors are non-fatal
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BACKGROUND OBJECTS GENERATION
  // ───────────────────────────────────────────────────────────────────────────

  private _generateBackgroundObjects(): void {
    // Stars
    this._stars = [];
    for (let i = 0; i < 200; i++) {
      this._stars.push({
        x: Math.random() * TERRAIN_WIDTH,
        y: Math.random() * TERRAIN_HEIGHT * 0.4,
        size: randRange(0.5, 2.5),
        twinkleOffset: Math.random() * Math.PI * 2,
        twinkleSpeed: randRange(1, 4),
      });
    }

    // Clouds
    this._clouds = [];
    for (let i = 0; i < 12; i++) {
      const bumps: number[] = [];
      const bumpCount = randInt(3, 7);
      for (let j = 0; j < bumpCount; j++) {
        bumps.push(randRange(0.4, 1.0));
      }
      this._clouds.push({
        x: Math.random() * TERRAIN_WIDTH * 1.5,
        y: randRange(50, TERRAIN_HEIGHT * 0.35),
        width: randRange(120, 300),
        height: randRange(40, 80),
        speed: randRange(5, 20),
        opacity: randRange(0.15, 0.45),
        bumps,
      });
    }

    // Mountains (3 layers)
    this._mountains = [];
    for (let layer = 0; layer < 3; layer++) {
      const peaks: MountainPeak[] = [];
      const count = randInt(6, 12);
      for (let i = 0; i < count; i++) {
        peaks.push({
          x: (i / count) * TERRAIN_WIDTH + randRange(-100, 100),
          height: randRange(100, 250) * (1 - layer * 0.2),
          width: randRange(150, 400),
        });
      }
      this._mountains.push(peaks);
    }

    // Castles
    this._castles = [];
    const castleCount = randInt(2, 4);
    for (let i = 0; i < castleCount; i++) {
      const towerCount = randInt(2, 5);
      const towers: { xOff: number; width: number; height: number; battlement: boolean }[] = [];
      const w = randRange(150, 300);
      for (let t = 0; t < towerCount; t++) {
        towers.push({
          xOff: (t / (towerCount - 1 || 1)) * w - w / 2,
          width: randRange(20, 40),
          height: randRange(60, 130),
          battlement: Math.random() > 0.3,
        });
      }
      this._castles.push({
        x: (i + 0.5) / castleCount * TERRAIN_WIDTH + randRange(-200, 200),
        width: w,
        baseHeight: randRange(40, 70),
        towers,
      });
    }

    // Trees (2 layers)
    this._trees = [];
    for (let layer = 0; layer < 2; layer++) {
      const treeLine: TreeSilhouette[] = [];
      const count = randInt(15, 30);
      for (let i = 0; i < count; i++) {
        const types: ('round' | 'pointed' | 'oak')[] = ['round', 'pointed', 'oak'];
        treeLine.push({
          x: (i / count) * TERRAIN_WIDTH + randRange(-50, 50),
          height: randRange(40, 90) * (1 - layer * 0.2),
          width: randRange(30, 60),
          type: types[randInt(0, 2)],
        });
      }
      this._trees.push(treeLine);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATIC BACKGROUND RENDERING
  // ───────────────────────────────────────────────────────────────────────────

  private _renderStaticBackground(): void {
    const ctx = this._bgCtx;
    const w = TERRAIN_WIDTH;
    const h = TERRAIN_HEIGHT;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#0a0a2e');
    skyGrad.addColorStop(0.2, '#1a1a4e');
    skyGrad.addColorStop(0.4, '#2d1b4e');
    skyGrad.addColorStop(0.55, '#6b2d5b');
    skyGrad.addColorStop(0.65, '#c44e2e');
    skyGrad.addColorStop(0.75, '#e8842a');
    skyGrad.addColorStop(0.85, '#f0c040');
    skyGrad.addColorStop(1.0, '#f5e080');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    for (const star of this._stars) {
      ctx.fillStyle = `rgba(255, 255, 240, ${0.5 + 0.5 * Math.sin(star.twinkleOffset)})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distant mountains (layer 0 - furthest)
    for (let layer = 0; layer < this._mountains.length; layer++) {
      const depth = layer / this._mountains.length;
      const alpha = 0.3 + depth * 0.2;
      const r = 30 + layer * 15;
      const g = 25 + layer * 10;
      const b = 50 + layer * 15;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

      const baseY = h * (0.55 + layer * 0.08);
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, baseY);

      for (const peak of this._mountains[layer]) {
        ctx.lineTo(peak.x - peak.width / 2, baseY);
        ctx.lineTo(peak.x, baseY - peak.height);
        ctx.lineTo(peak.x + peak.width / 2, baseY);
      }

      ctx.lineTo(w, baseY);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }

    // Castle silhouettes
    const castleBaseY = h * 0.65;
    for (const castle of this._castles) {
      ctx.fillStyle = 'rgba(25, 20, 40, 0.35)';

      // Base wall
      ctx.fillRect(castle.x - castle.width / 2, castleBaseY - castle.baseHeight, castle.width, castle.baseHeight);

      // Towers
      for (const tower of castle.towers) {
        const tx = castle.x + tower.xOff;
        const ty = castleBaseY - castle.baseHeight - tower.height;
        ctx.fillRect(tx - tower.width / 2, ty, tower.width, tower.height + castle.baseHeight);

        // Battlement
        if (tower.battlement) {
          const bw = tower.width * 0.3;
          for (let b = 0; b < 3; b++) {
            ctx.fillRect(tx - tower.width / 2 + b * bw * 1.2, ty - 8, bw, 8);
          }
        }

        // Pointed roof
        ctx.beginPath();
        ctx.moveTo(tx - tower.width / 2 - 3, ty);
        ctx.lineTo(tx, ty - 20);
        ctx.lineTo(tx + tower.width / 2 + 3, ty);
        ctx.closePath();
        ctx.fill();
      }

      // Wall battlements
      for (let b = 0; b < castle.width / 12; b++) {
        if (b % 2 === 0) {
          ctx.fillRect(castle.x - castle.width / 2 + b * 12, castleBaseY - castle.baseHeight - 8, 10, 8);
        }
      }
    }

    // Tree silhouettes
    for (let layer = 0; layer < this._trees.length; layer++) {
      const baseY = h * (0.7 + layer * 0.05);
      const alpha = 0.2 + layer * 0.15;
      ctx.fillStyle = `rgba(15, 25, 15, ${alpha})`;

      for (const tree of this._trees[layer]) {
        const tx = tree.x;
        const ty = baseY;

        if (tree.type === 'pointed') {
          // Pine tree
          ctx.beginPath();
          ctx.moveTo(tx, ty - tree.height);
          ctx.lineTo(tx - tree.width / 2, ty);
          ctx.lineTo(tx + tree.width / 2, ty);
          ctx.closePath();
          ctx.fill();
          // Trunk
          ctx.fillRect(tx - 3, ty, 6, 10);
        } else if (tree.type === 'round') {
          // Round tree
          ctx.beginPath();
          ctx.arc(tx, ty - tree.height * 0.6, tree.width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(tx - 3, ty - tree.height * 0.3, 6, tree.height * 0.3);
        } else {
          // Oak - multi-blob
          const r = tree.width / 2;
          ctx.beginPath();
          ctx.arc(tx - r * 0.4, ty - tree.height * 0.6, r * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(tx + r * 0.4, ty - tree.height * 0.55, r * 0.65, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(tx, ty - tree.height * 0.75, r * 0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(tx - 4, ty - tree.height * 0.35, 8, tree.height * 0.35);
        }
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TERRAIN GENERATION
  // ───────────────────────────────────────────────────────────────────────────

  private _generateTerrain(): void {
    this._terrainMask = new Uint8Array(TERRAIN_WIDTH * TERRAIN_HEIGHT);

    // Base height profile using layered sine waves
    const heightMap: number[] = new Array(TERRAIN_WIDTH);
    for (let x = 0; x < TERRAIN_WIDTH; x++) {
      let h = TERRAIN_HEIGHT * 0.45;
      // Major hills
      h += Math.sin(x * 0.002) * 120;
      h += Math.sin(x * 0.005 + 1.3) * 60;
      h += Math.sin(x * 0.01 + 2.7) * 30;
      // Smaller bumps
      h += Math.sin(x * 0.02 + 0.5) * 15;
      h += Math.sin(x * 0.04 + 3.1) * 8;

      // Flat area in the middle
      const midDist = Math.abs(x - TERRAIN_WIDTH / 2) / (TERRAIN_WIDTH * 0.1);
      if (midDist < 1) {
        const flat = TERRAIN_HEIGHT * 0.5;
        h = lerp(flat, h, midDist);
      }

      // Random bumps
      h += (Math.sin(x * 0.1 + x * 0.037) * 5);

      heightMap[x] = h;
    }

    // Fill terrain mask
    for (let x = 0; x < TERRAIN_WIDTH; x++) {
      const surfaceY = Math.floor(heightMap[x]);
      for (let y = surfaceY; y < TERRAIN_HEIGHT; y++) {
        this._terrainMask[y * TERRAIN_WIDTH + x] = 1;
      }
    }

    // Carve caves
    const caveCount = randInt(5, 10);
    for (let c = 0; c < caveCount; c++) {
      const cx = randRange(200, TERRAIN_WIDTH - 200);
      const cy = randRange(TERRAIN_HEIGHT * 0.5, TERRAIN_HEIGHT * 0.85);
      const caveW = randRange(30, 80);
      const caveH = randRange(20, 50);

      for (let dx = -caveW; dx <= caveW; dx++) {
        for (let dy = -caveH; dy <= caveH; dy++) {
          const nx = (dx / caveW);
          const ny = (dy / caveH);
          if (nx * nx + ny * ny <= 1) {
            const px = Math.floor(cx + dx);
            const py = Math.floor(cy + dy);
            if (px >= 0 && px < TERRAIN_WIDTH && py >= 0 && py < TERRAIN_HEIGHT) {
              this._terrainMask[py * TERRAIN_WIDTH + px] = 0;
            }
          }
        }
      }
    }

    // Carve tunnels
    const tunnelCount = randInt(2, 5);
    for (let t = 0; t < tunnelCount; t++) {
      let tx = randRange(300, TERRAIN_WIDTH - 300);
      let ty = randRange(TERRAIN_HEIGHT * 0.55, TERRAIN_HEIGHT * 0.8);
      const angle = randRange(-0.3, 0.3);
      const length = randInt(80, 200);
      const radius = randRange(8, 18);

      for (let s = 0; s < length; s++) {
        tx += Math.cos(angle) * 2;
        ty += Math.sin(angle) * 2 + Math.sin(s * 0.05) * 0.5;

        for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
            if (dx * dx + dy * dy <= radius * radius) {
              const px = Math.floor(tx + dx);
              const py = Math.floor(ty + dy);
              if (px >= 0 && px < TERRAIN_WIDTH && py >= 0 && py < TERRAIN_HEIGHT) {
                this._terrainMask[py * TERRAIN_WIDTH + px] = 0;
              }
            }
          }
        }
      }
    }

    // Render terrain to offscreen canvas
    this._renderTerrainFull();
    this._terrainDirty = false;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TERRAIN RENDERING
  // ───────────────────────────────────────────────────────────────────────────

  private _renderTerrainFull(): void {
    const ctx = this._terrainCtx;
    const w = TERRAIN_WIDTH;
    const h = TERRAIN_HEIGHT;

    ctx.clearRect(0, 0, w, h);

    // Create ImageData
    const imageData = ctx.createImageData(w, h);
    const pixels = imageData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (this._terrainMask[idx] === 0) continue;

        const pi = idx * 4;

        // Find surface distance (how far below the surface this pixel is)
        let surfaceDist = 0;
        for (let sy = y - 1; sy >= 0; sy--) {
          if (this._terrainMask[sy * w + x] === 0) {
            surfaceDist = y - sy;
            break;
          }
          if (y - sy > 100) { surfaceDist = 100; break; }
        }

        // Color based on depth
        let r: number, g: number, b: number;
        if (surfaceDist <= 2) {
          // Grass top
          r = 40 + Math.random() * 20;
          g = 120 + Math.random() * 40;
          b = 30 + Math.random() * 15;
        } else if (surfaceDist <= 8) {
          // Light soil
          const t = (surfaceDist - 2) / 6;
          r = lerp(60, 100, t) + Math.random() * 10;
          g = lerp(110, 70, t) + Math.random() * 10;
          b = lerp(30, 30, t) + Math.random() * 5;
        } else if (surfaceDist <= 40) {
          // Medium earth
          const t = (surfaceDist - 8) / 32;
          r = lerp(100, 80, t) + Math.random() * 8;
          g = lerp(70, 55, t) + Math.random() * 8;
          b = lerp(30, 25, t) + Math.random() * 5;
        } else {
          // Dark soil/rock
          r = 60 + Math.random() * 15;
          g = 40 + Math.random() * 10;
          b = 20 + Math.random() * 8;

          // Random rock specks
          if (Math.random() < 0.02) {
            r += 30;
            g += 25;
            b += 20;
          }
        }

        // Add noise texture
        const noise = (Math.random() - 0.5) * 10;
        r = clamp(r + noise, 0, 255);
        g = clamp(g + noise, 0, 255);
        b = clamp(b + noise, 0, 255);

        pixels[pi] = r;
        pixels[pi + 1] = g;
        pixels[pi + 2] = b;
        pixels[pi + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw grass blades on top edges
    this._drawGrassBlades(ctx);
  }

  private _drawGrassBlades(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (let x = 0; x < TERRAIN_WIDTH; x += 2) {
      // Find surface Y
      let surfaceY = -1;
      for (let y = 0; y < TERRAIN_HEIGHT; y++) {
        if (this._terrainMask[y * TERRAIN_WIDTH + x] === 1) {
          surfaceY = y;
          break;
        }
      }
      if (surfaceY < 0 || surfaceY >= TERRAIN_HEIGHT - WATER_LEVEL) continue;

      // Check that there's air above
      if (surfaceY <= 0 || this._terrainMask[(surfaceY - 1) * TERRAIN_WIDTH + x] === 1) continue;

      const bladeHeight = randRange(4, 12);
      const lean = randRange(-3, 3);

      const greenVal = 100 + Math.random() * 80;
      ctx.strokeStyle = `rgb(${30 + Math.random() * 20}, ${greenVal}, ${20 + Math.random() * 15})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, surfaceY);
      ctx.quadraticCurveTo(x + lean * 0.5, surfaceY - bladeHeight * 0.6, x + lean, surfaceY - bladeHeight);
      ctx.stroke();
    }
    ctx.restore();
  }

  private _renderTerrainRegion(x1: number, y1: number, x2: number, y2: number): void {
    // Re-render a specific damaged region
    x1 = clamp(Math.floor(x1) - 2, 0, TERRAIN_WIDTH - 1);
    y1 = clamp(Math.floor(y1) - 2, 0, TERRAIN_HEIGHT - 1);
    x2 = clamp(Math.ceil(x2) + 2, 0, TERRAIN_WIDTH);
    y2 = clamp(Math.ceil(y2) + 2, 0, TERRAIN_HEIGHT);

    const w = x2 - x1;
    const h = y2 - y1;
    if (w <= 0 || h <= 0) return;

    const imageData = this._terrainCtx.createImageData(w, h);
    const pixels = imageData.data;

    for (let ly = 0; ly < h; ly++) {
      for (let lx = 0; lx < w; lx++) {
        const gx = x1 + lx;
        const gy = y1 + ly;
        const idx = gy * TERRAIN_WIDTH + gx;
        if (this._terrainMask[idx] === 0) continue;

        const pi = (ly * w + lx) * 4;

        let surfaceDist = 0;
        for (let sy = gy - 1; sy >= 0; sy--) {
          if (this._terrainMask[sy * TERRAIN_WIDTH + gx] === 0) {
            surfaceDist = gy - sy;
            break;
          }
          if (gy - sy > 100) { surfaceDist = 100; break; }
        }

        let r: number, g: number, b: number;
        if (surfaceDist <= 2) {
          r = 40 + Math.random() * 20;
          g = 120 + Math.random() * 40;
          b = 30 + Math.random() * 15;
        } else if (surfaceDist <= 8) {
          const t = (surfaceDist - 2) / 6;
          r = lerp(60, 100, t) + Math.random() * 10;
          g = lerp(110, 70, t) + Math.random() * 10;
          b = lerp(30, 30, t) + Math.random() * 5;
        } else if (surfaceDist <= 40) {
          const t = (surfaceDist - 8) / 32;
          r = lerp(100, 80, t) + Math.random() * 8;
          g = lerp(70, 55, t) + Math.random() * 8;
          b = lerp(30, 25, t) + Math.random() * 5;
        } else {
          r = 60 + Math.random() * 15;
          g = 40 + Math.random() * 10;
          b = 20 + Math.random() * 8;
        }

        const noise = (Math.random() - 0.5) * 10;
        pixels[pi] = clamp(r + noise, 0, 255);
        pixels[pi + 1] = clamp(g + noise, 0, 255);
        pixels[pi + 2] = clamp(b + noise, 0, 255);
        pixels[pi + 3] = 255;
      }
    }

    // Clear the region first, then put new imageData
    this._terrainCtx.clearRect(x1, y1, w, h);
    this._terrainCtx.putImageData(imageData, x1, y1);

    // Re-draw grass blades in that region
    this._terrainCtx.save();
    for (let x = x1; x < x2; x += 2) {
      let surfaceY = -1;
      for (let y = Math.max(0, y1 - 15); y < Math.min(TERRAIN_HEIGHT, y2 + 5); y++) {
        if (this._terrainMask[y * TERRAIN_WIDTH + x] === 1) {
          surfaceY = y;
          break;
        }
      }
      if (surfaceY < 0 || surfaceY < y1 - 15 || surfaceY > y2 + 5) continue;
      if (surfaceY <= 0 || this._terrainMask[(surfaceY - 1) * TERRAIN_WIDTH + x] === 1) continue;
      if (surfaceY >= TERRAIN_HEIGHT - WATER_LEVEL) continue;

      const bladeHeight = randRange(4, 12);
      const lean = randRange(-3, 3);
      const greenVal = 100 + Math.random() * 80;
      this._terrainCtx.strokeStyle = `rgb(${30 + Math.random() * 20}, ${greenVal}, ${20 + Math.random() * 15})`;
      this._terrainCtx.lineWidth = 1;
      this._terrainCtx.beginPath();
      this._terrainCtx.moveTo(x, surfaceY);
      this._terrainCtx.quadraticCurveTo(x + lean * 0.5, surfaceY - bladeHeight * 0.6, x + lean, surfaceY - bladeHeight);
      this._terrainCtx.stroke();
    }
    this._terrainCtx.restore();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TERRAIN DESTRUCTION
  // ───────────────────────────────────────────────────────────────────────────

  private _destroyTerrain(cx: number, cy: number, radius: number): void {
    const x1 = Math.max(0, Math.floor(cx - radius));
    const y1 = Math.max(0, Math.floor(cy - radius));
    const x2 = Math.min(TERRAIN_WIDTH, Math.ceil(cx + radius));
    const y2 = Math.min(TERRAIN_HEIGHT, Math.ceil(cy + radius));
    const r2 = radius * radius;

    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          this._terrainMask[y * TERRAIN_WIDTH + x] = 0;
        }
      }
    }

    // Re-render damaged region
    this._renderTerrainRegion(x1, y1, x2, y2);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TERRAIN QUERIES
  // ───────────────────────────────────────────────────────────────────────────

  private _isTerrainSolid(x: number, y: number): boolean {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= TERRAIN_WIDTH || iy < 0 || iy >= TERRAIN_HEIGHT) return false;
    return this._terrainMask[iy * TERRAIN_WIDTH + ix] === 1;
  }

  private _findSurfaceY(x: number, startY: number = 0): number {
    const ix = clamp(Math.floor(x), 0, TERRAIN_WIDTH - 1);
    for (let y = Math.max(0, Math.floor(startY)); y < TERRAIN_HEIGHT; y++) {
      if (this._terrainMask[y * TERRAIN_WIDTH + ix] === 1) {
        return y;
      }
    }
    return TERRAIN_HEIGHT;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GIRDER PLACEMENT
  // ───────────────────────────────────────────────────────────────────────────

  private _placeGirder(): void {
    const cx = Math.floor(this._mouseWorldX);
    const cy = Math.floor(this._mouseWorldY);
    const length = 60;
    const thickness = 6;
    const cos = Math.cos(this._girderAngle);
    const sin = Math.sin(this._girderAngle);

    for (let l = -length; l <= length; l++) {
      for (let t = -thickness; t <= thickness; t++) {
        const px = Math.floor(cx + l * cos - t * sin);
        const py = Math.floor(cy + l * sin + t * cos);
        if (px >= 0 && px < TERRAIN_WIDTH && py >= 0 && py < TERRAIN_HEIGHT) {
          this._terrainMask[py * TERRAIN_WIDTH + px] = 1;
        }
      }
    }

    const x1 = cx - length - thickness;
    const y1 = cy - length - thickness;
    const x2 = cx + length + thickness;
    const y2 = cy + length + thickness;
    this._renderTerrainRegion(x1, y1, x2, y2);

    this._placingGirder = false;
    this._useAmmo('girder');
    this._endTurn();
  }

  // Add terrain (for girder)
  private _addTerrain(cx: number, cy: number, radius: number): void {
    const x1 = Math.max(0, Math.floor(cx - radius));
    const y1 = Math.max(0, Math.floor(cy - radius));
    const x2 = Math.min(TERRAIN_WIDTH, Math.ceil(cx + radius));
    const y2 = Math.min(TERRAIN_HEIGHT, Math.ceil(cy + radius));
    const r2 = radius * radius;

    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          this._terrainMask[y * TERRAIN_WIDTH + x] = 1;
        }
      }
    }

    this._renderTerrainRegion(x1, y1, x2, y2);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEAM / WORM CREATION
  // ───────────────────────────────────────────────────────────────────────────

  private _createTeams(): void {
    this._teams = [];
    for (let t = 0; t < this._teamCount; t++) {
      const cfg = TEAM_CONFIGS[t];
      const team: Team = {
        name: cfg.name,
        color: cfg.color,
        darkColor: cfg.darkColor,
        lightColor: cfg.lightColor,
        worms: [],
        ammo: new Map(),
      };

      // Init ammo
      for (const [key, weapon] of Object.entries(WEAPONS)) {
        if (weapon.ammo !== -1) {
          team.ammo.set(key, weapon.ammo);
        }
      }

      // Create worms
      for (let w = 0; w < 4; w++) {
        team.worms.push({
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          hp: WORM_HP,
          maxHp: WORM_HP,
          name: cfg.names[w],
          team: t,
          alive: true,
          facing: t % 2 === 0 ? 1 : -1,
          aimAngle: -Math.PI / 4,
          grounded: false,
          frozen: 0,
          poisoned: 0,
          animFrame: 0,
          animTimer: 0,
        });
      }

      this._teams.push(team);
    }

    // Place worms
    this._placeWorms();
  }

  private _placeWorms(): void {
    const spacing = TERRAIN_WIDTH / (this._teamCount + 1);

    for (let t = 0; t < this._teams.length; t++) {
      const team = this._teams[t];
      const baseX = spacing * (t + 1);

      for (let w = 0; w < team.worms.length; w++) {
        const worm = team.worms[w];
        const offsetX = (w - 1.5) * 50;
        const x = clamp(baseX + offsetX, 50, TERRAIN_WIDTH - 50);
        const y = this._findSurfaceY(x);

        worm.x = x;
        worm.y = y - WORM_RADIUS;
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GET ACTIVE WORM
  // ───────────────────────────────────────────────────────────────────────────

  private _getActiveWorm(): Worm | null {
    if (this._teams.length === 0) return null;
    const team = this._teams[this._currentTeam];
    if (!team) return null;
    const worm = team.worms[this._currentWormIndex];
    if (!worm || !worm.alive) return null;
    return worm;
  }

  private _getAllWorms(): Worm[] {
    const all: Worm[] = [];
    for (const team of this._teams) {
      for (const worm of team.worms) {
        all.push(worm);
      }
    }
    return all;
  }

  private _getAliveWorms(): Worm[] {
    return this._getAllWorms().filter(w => w.alive);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WEAPON SELECTION
  // ───────────────────────────────────────────────────────────────────────────

  private _selectWeapon(key: string): void {
    const weapon = WEAPONS[key];
    if (!weapon) return;

    const team = this._teams[this._currentTeam];
    if (!team) return;

    // Check ammo
    if (weapon.ammo !== -1) {
      const ammo = team.ammo.get(key) ?? 0;
      if (ammo <= 0) return;
    }

    this._currentWeapon = key;
    this._weaponSelectOpen = false;
    this._teleportMode = false;
    this._placingGirder = false;
    this._rope.active = false;

    if (weapon.type === 'teleport') {
      this._teleportMode = true;
    } else if (key === 'girder') {
      this._placingGirder = true;
      this._girderAngle = 0;
    } else if (weapon.type === 'rope') {
      // Rope handled on fire
    }

    this._playSound('click');
  }

  private _useAmmo(key: string): void {
    const weapon = WEAPONS[key];
    if (!weapon || weapon.ammo === -1) return;
    const team = this._teams[this._currentTeam];
    if (!team) return;
    const current = team.ammo.get(key) ?? 0;
    if (current > 0) {
      team.ammo.set(key, current - 1);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TELEPORT
  // ───────────────────────────────────────────────────────────────────────────

  private _executeTeleport(): void {
    const worm = this._getActiveWorm();
    if (!worm) return;

    const tx = this._mouseWorldX;
    const ty = this._mouseWorldY;

    // Make sure target is in air
    if (this._isTerrainSolid(tx, ty)) return;

    // Teleport particles at old position
    this._spawnTeleportParticles(worm.x, worm.y);

    worm.x = tx;
    worm.y = ty;
    worm.vx = 0;
    worm.vy = 0;

    // Teleport particles at new position
    this._spawnTeleportParticles(worm.x, worm.y);

    this._teleportMode = false;
    this._useAmmo('teleport');
    this._playSound('fire');
    this._endTurn();
  }

  private _spawnTeleportParticles(x: number, y: number): void {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randRange(50, 200);
      this._particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randRange(0.3, 0.8),
        maxLife: 0.8,
        color: `hsl(${randRange(180, 280)}, 100%, ${randRange(50, 80)}%)`,
        size: randRange(2, 5),
        gravity: false,
        type: 'spark',
      });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WEAPON FIRING
  // ───────────────────────────────────────────────────────────────────────────

  private _fireWeapon(power: number): void {
    const worm = this._getActiveWorm();
    if (!worm) return;

    const weapon = WEAPONS[this._currentWeapon];
    if (!weapon) return;

    this._playSound('fire');

    const aimAngle = worm.aimAngle;
    const dirX = Math.cos(aimAngle) * worm.facing;
    const dirY = Math.sin(aimAngle);

    const speed = (weapon.speed || 500) * Math.max(power, 0.1);

    switch (weapon.type) {
      case 'projectile': {
        const proj: Projectile = {
          x: worm.x + dirX * 20,
          y: worm.y - 10 + dirY * 20,
          vx: dirX * speed,
          vy: dirY * speed,
          type: this._currentWeapon,
          timer: 0,
          bounces: 0,
          owner: this._currentTeam,
          trail: [],
          active: true,
          angle: aimAngle,
        };
        this._projectiles.push(proj);
        this._useAmmo(this._currentWeapon);
        this._phase = 'firing';
        this._shotsFired++;
        break;
      }

      case 'grenade': {
        const proj: Projectile = {
          x: worm.x + dirX * 20,
          y: worm.y - 10 + dirY * 20,
          vx: dirX * speed,
          vy: dirY * speed,
          type: this._currentWeapon,
          timer: 0,
          bounces: 0,
          owner: this._currentTeam,
          trail: [],
          fuseTime: weapon.fuseTime || 3,
          clusterCount: weapon.clusterCount,
          active: true,
          angle: aimAngle,
        };
        this._projectiles.push(proj);
        this._useAmmo(this._currentWeapon);
        this._phase = 'firing';
        this._shotsFired++;
        break;
      }

      case 'hitscan': {
        if (this._currentWeapon === 'shotgun') {
          this._fireShotgun(worm, aimAngle);
        } else if (this._currentWeapon === 'dragon_breath') {
          this._fireDragonBreath(worm, aimAngle);
        }
        this._useAmmo(this._currentWeapon);
        this._shotsFired++;
        break;
      }

      case 'melee': {
        this._fireMelee(worm, aimAngle);
        this._useAmmo(this._currentWeapon);
        this._shotsFired++;
        break;
      }

      case 'placed': {
        if (this._currentWeapon === 'dynamite') {
          const proj: Projectile = {
            x: worm.x + worm.facing * 15,
            y: worm.y - 5,
            vx: 0, vy: 0,
            type: 'dynamite',
            timer: 0,
            bounces: 0,
            owner: this._currentTeam,
            trail: [],
            fuseTime: weapon.fuseTime || 4,
            active: true,
            angle: 0,
          };
          this._projectiles.push(proj);
          this._useAmmo(this._currentWeapon);
          this._phase = 'firing';
          this._shotsFired++;
        } else if (this._currentWeapon === 'mine') {
          this._mines.push({
            x: worm.x + worm.facing * 15,
            y: worm.y,
            team: this._currentTeam,
          });
          this._useAmmo(this._currentWeapon);
          this._endTurn();
          this._shotsFired++;
        }
        break;
      }

      case 'airstrike': {
        this._airStrikes.push({
          x: this._mouseWorldX,
          projectiles: this._currentWeapon === 'carpet_bomb' ? 12 :
            this._currentWeapon === 'air_strike' ? 5 :
              this._currentWeapon === 'grail_strike' ? 1 :
                this._currentWeapon === 'concrete_donkey' ? 1 :
                  this._currentWeapon === 'meteor' ? 1 : 5,
          delay: this._currentWeapon === 'carpet_bomb' ? 0.08 : 0.15,
          timer: 0,
          spawned: 0,
          weaponKey: this._currentWeapon,
        });
        this._useAmmo(this._currentWeapon);
        this._phase = 'firing';
        this._shotsFired++;
        break;
      }

      case 'strike': {
        if (this._currentWeapon === 'earthquake') {
          this._doEarthquake();
          this._useAmmo(this._currentWeapon);
          this._shotsFired++;
        } else if (this._currentWeapon === 'excalibur') {
          this._doExcaliburStrike(this._mouseWorldX, this._mouseWorldY);
          this._useAmmo(this._currentWeapon);
          this._shotsFired++;
        } else if (this._currentWeapon === 'lightning_bolt') {
          this._doLightningStrike(this._mouseWorldX, this._mouseWorldY);
          this._useAmmo(this._currentWeapon);
          this._shotsFired++;
        }
        break;
      }

      case 'rope': {
        // Fire rope anchor toward aim direction
        this._fireRope(worm, aimAngle);
        this._useAmmo(this._currentWeapon);
        break;
      }

      case 'teleport': {
        // Handled in mouse down
        break;
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SPECIALIZED WEAPON METHODS
  // ───────────────────────────────────────────────────────────────────────────

  private _fireShotgun(worm: Worm, aimAngle: number): void {
    const weapon = WEAPONS['shotgun'];
    const dirX = Math.cos(aimAngle) * worm.facing;
    const dirY = Math.sin(aimAngle);

    // Fire two shots
    for (let shot = 0; shot < 2; shot++) {
      const spread = (Math.random() - 0.5) * 0.1;
      const sdx = Math.cos(aimAngle + spread) * worm.facing;
      const sdy = Math.sin(aimAngle + spread);

      // Raycast
      let hx = worm.x;
      let hy = worm.y - 10;
      let hitWorm: Worm | null = null;
      let hitTerrain = false;

      for (let step = 0; step < 600; step += 3) {
        hx = worm.x + sdx * step;
        hy = worm.y - 10 + sdy * step;

        // Check terrain
        if (this._isTerrainSolid(hx, hy)) {
          hitTerrain = true;
          break;
        }

        // Check worms
        for (const w of this._getAliveWorms()) {
          if (w === worm) continue;
          if (dist(hx, hy, w.x, w.y - 10) < WORM_RADIUS + 5) {
            hitWorm = w;
            break;
          }
        }
        if (hitWorm) break;
      }

      // Tracer line particles
      const steps = dist(worm.x, worm.y - 10, hx, hy) / 10;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        this._particles.push({
          x: lerp(worm.x + dirX * 20, hx, t),
          y: lerp(worm.y - 20, hy, t),
          vx: 0, vy: 0,
          life: 0.15,
          maxLife: 0.15,
          color: '#ffff44',
          size: 2,
          gravity: false,
          type: 'spark',
        });
      }

      if (hitWorm) {
        this._damageWorm(hitWorm, weapon.damage, hx, hy, weapon.knockback, dirX, dirY, this._currentTeam);
      }
      if (hitTerrain) {
        this._destroyTerrain(hx, hy, weapon.radius);
      }
    }

    this._phase = 'resolving';
    this._resolveTimer = 0;
    this._resolvePhaseDelay = 1.0;
  }

  private _fireDragonBreath(worm: Worm, aimAngle: number): void {
    const weapon = WEAPONS['dragon_breath'];
    const coneAngle = 0.4;
    const range = 200;
    const dirX = Math.cos(aimAngle) * worm.facing;
    const dirY = Math.sin(aimAngle);

    // Spawn fire particles in a cone
    for (let i = 0; i < 50; i++) {
      const a = aimAngle + (Math.random() - 0.5) * coneAngle;
      const dx = Math.cos(a) * worm.facing;
      const dy = Math.sin(a);
      const spd = randRange(200, 500);
      this._particles.push({
        x: worm.x + dirX * 15,
        y: worm.y - 10 + dirY * 15,
        vx: dx * spd,
        vy: dy * spd,
        life: randRange(0.3, 0.7),
        maxLife: 0.7,
        color: `hsl(${randRange(0, 40)}, 100%, ${randRange(50, 80)}%)`,
        size: randRange(3, 8),
        gravity: false,
        type: 'fire',
      });
    }

    // Damage worms in cone
    for (const w of this._getAliveWorms()) {
      if (w === worm) continue;
      const dx = w.x - worm.x;
      const dy = (w.y - 10) - (worm.y - 10);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > range) continue;

      const angle = Math.atan2(dy, dx * worm.facing);
      if (Math.abs(angle - aimAngle) < coneAngle) {
        this._damageWorm(w, weapon.damage, w.x, w.y, weapon.knockback, dirX, dirY, this._currentTeam);
      }
    }

    this._phase = 'resolving';
    this._resolveTimer = 0;
    this._resolvePhaseDelay = 1.0;
  }

  private _fireMelee(worm: Worm, aimAngle: number): void {
    const weapon = WEAPONS[this._currentWeapon];
    const range = 40;
    const dirX = worm.facing;
    const dirY = Math.sin(aimAngle);

    // Check worms in range
    for (const w of this._getAliveWorms()) {
      if (w === worm) continue;
      const dx = w.x - worm.x;
      const dy = (w.y - 10) - (worm.y - 10);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= range + WORM_RADIUS) {
        // Knockback direction depends on weapon
        let kbx = dx / (d || 1);
        let kby = dy / (d || 1);
        if (this._currentWeapon === 'fire_punch') {
          kby = -1; // Uppercut
          kbx = worm.facing * 0.5;
        } else if (this._currentWeapon === 'lance_charge') {
          kbx = worm.facing;
          kby = -0.3;
        }
        this._damageWorm(w, weapon.damage, w.x, w.y, weapon.knockback, kbx, kby, this._currentTeam);

        // Melee particles
        for (let i = 0; i < 15; i++) {
          const pa = Math.random() * Math.PI * 2;
          const ps = randRange(50, 150);
          const color = this._currentWeapon === 'fire_punch' ? `hsl(${randRange(0, 40)}, 100%, 60%)` :
            this._currentWeapon === 'lance_charge' ? '#aaaaaa' : '#ffffff';
          this._particles.push({
            x: w.x, y: w.y - 10,
            vx: Math.cos(pa) * ps,
            vy: Math.sin(pa) * ps,
            life: 0.3,
            maxLife: 0.3,
            color,
            size: randRange(2, 5),
            gravity: false,
            type: 'spark',
          });
        }
      }
    }

    // Fire punch visual: launch the worm forward a bit
    if (this._currentWeapon === 'fire_punch') {
      worm.vx = worm.facing * 100;
      worm.vy = -50;
    } else if (this._currentWeapon === 'lance_charge') {
      worm.vx = worm.facing * 200;
      worm.vy = -30;
      worm.grounded = false;
    }

    this._phase = 'resolving';
    this._resolveTimer = 0;
    this._resolvePhaseDelay = 1.0;
  }

  private _fireRope(worm: Worm, aimAngle: number): void {
    const dirX = Math.cos(aimAngle) * worm.facing;
    const dirY = Math.sin(aimAngle);

    // Cast a ray to find anchor point
    let ax = worm.x;
    let ay = worm.y - 10;

    for (let step = 0; step < 400; step += 3) {
      ax = worm.x + dirX * step;
      ay = worm.y - 10 + dirY * step;

      if (this._isTerrainSolid(ax, ay)) {
        // Found anchor
        this._rope.active = true;
        this._rope.anchorX = ax;
        this._rope.anchorY = ay;
        this._rope.length = dist(worm.x, worm.y, ax, ay);
        this._rope.angle = Math.atan2(worm.y - ay, worm.x - ax);
        this._rope.angularVel = 0;
        return;
      }
    }
  }

  private _doEarthquake(): void {
    this._shakeAmount = 15;
    this._shakeTime = 2.0;

    for (const w of this._getAliveWorms()) {
      w.vy = -randRange(100, 250);
      w.vx = randRange(-100, 100);
      w.grounded = false;

      // Small damage
      this._damageWorm(w, WEAPONS['earthquake'].damage, w.x, w.y, WEAPONS['earthquake'].knockback, 0, -1, this._currentTeam);
    }

    this._playSound('explosion');
    this._phase = 'resolving';
    this._resolveTimer = 0;
    this._resolvePhaseDelay = 2.5;
  }

  private _doExcaliburStrike(tx: number, ty: number): void {
    const weapon = WEAPONS['excalibur'];

    // Visual: golden light from above
    for (let i = 0; i < 60; i++) {
      this._particles.push({
        x: tx + randRange(-20, 20),
        y: ty - 600 + i * 10,
        vx: randRange(-30, 30),
        vy: randRange(100, 300),
        life: randRange(0.5, 1.5),
        maxLife: 1.5,
        color: `hsl(${randRange(40, 60)}, 100%, ${randRange(60, 90)}%)`,
        size: randRange(3, 8),
        gravity: false,
        type: 'spark',
      });
    }

    // Explosion at target
    setTimeout(() => {
      this._createExplosion(tx, ty, weapon.radius, weapon.damage, weapon.knockback, this._currentTeam, 'excalibur');
    }, 200);

    this._shakeAmount = 10;
    this._shakeTime = 0.5;
    this._phase = 'resolving';
    this._resolveTimer = 0;
    this._resolvePhaseDelay = 1.5;
  }

  private _doLightningStrike(tx: number, ty: number): void {
    const weapon = WEAPONS['lightning_bolt'];

    // Lightning flash
    for (let i = 0; i < 40; i++) {
      this._particles.push({
        x: tx + randRange(-5, 5),
        y: ty - 800 + i * 20 + randRange(-10, 10),
        vx: randRange(-50, 50),
        vy: randRange(0, 100),
        life: randRange(0.1, 0.4),
        maxLife: 0.4,
        color: '#ffffff',
        size: randRange(2, 6),
        gravity: false,
        type: 'spark',
      });
    }

    // Electric sparks at impact
    for (let i = 0; i < 25; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = randRange(50, 200);
      this._particles.push({
        x: tx, y: ty,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: randRange(0.2, 0.5),
        maxLife: 0.5,
        color: `hsl(${randRange(200, 280)}, 100%, ${randRange(70, 100)}%)`,
        size: randRange(1, 4),
        gravity: false,
        type: 'spark',
      });
    }

    this._createExplosion(tx, ty, weapon.radius, weapon.damage, weapon.knockback, this._currentTeam, 'lightning_bolt');
    this._shakeAmount = 8;
    this._shakeTime = 0.3;
    this._phase = 'resolving';
    this._resolveTimer = 0;
    this._resolvePhaseDelay = 1.0;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EXPLOSION
  // ───────────────────────────────────────────────────────────────────────────

  private _createExplosion(x: number, y: number, radius: number, damage: number, knockback: number, owner: number, weaponKey: string): void {
    // Destroy terrain
    this._destroyTerrain(x, y, radius);

    // Screen shake
    this._shakeAmount = Math.max(this._shakeAmount, radius * 0.2);
    this._shakeTime = Math.max(this._shakeTime, 0.3);

    // Sound
    this._playSound('explosion');

    // Spawn explosion particles
    this._spawnExplosionParticles(x, y, radius);

    // Damage worms
    for (const w of this._getAliveWorms()) {
      const d = dist(x, y, w.x, w.y - 5);
      if (d < radius + WORM_RADIUS) {
        const dmgFactor = 1 - d / (radius + WORM_RADIUS);
        const dmg = Math.floor(damage * dmgFactor);
        const dx = (w.x - x) / (d || 1);
        const dy = ((w.y - 5) - y) / (d || 1);

        this._damageWorm(w, dmg, x, y, knockback * dmgFactor, dx, dy, owner);

        // Special effects
        if (weaponKey === 'freeze_blast') {
          w.frozen = 2;
        }
        if (weaponKey === 'poison_strike') {
          w.poisoned = 3;
        }
      }
    }

    // Check mines in blast radius
    const minesToDetonate: { x: number; y: number; team: number }[] = [];
    this._mines = this._mines.filter(m => {
      if (dist(x, y, m.x, m.y) < radius + 20) {
        minesToDetonate.push(m);
        return false;
      }
      return true;
    });

    // Chain-detonate mines
    for (const m of minesToDetonate) {
      setTimeout(() => {
        this._createExplosion(m.x, m.y, WEAPONS['mine'].radius, WEAPONS['mine'].damage, WEAPONS['mine'].knockback, m.team, 'mine');
      }, 100);
    }
  }

  private _spawnExplosionParticles(x: number, y: number, radius: number): void {
    const count = Math.floor(radius * 2);

    // Fire/explosion core
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randRange(50, radius * 5);
      const hue = randRange(0, 50);
      this._particles.push({
        x: x + randRange(-5, 5),
        y: y + randRange(-5, 5),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randRange(0.3, 0.8),
        maxLife: 0.8,
        color: `hsl(${hue}, 100%, ${randRange(50, 90)}%)`,
        size: randRange(2, 6),
        gravity: true,
        type: 'fire',
      });
    }

    // Sparks
    for (let i = 0; i < count * 0.5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randRange(100, radius * 8);
      this._particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randRange(0.2, 0.6),
        maxLife: 0.6,
        color: '#ffff88',
        size: randRange(1, 3),
        gravity: true,
        type: 'spark',
      });
    }

    // Smoke
    for (let i = 0; i < count * 0.3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randRange(20, 60);
      this._particles.push({
        x: x + randRange(-radius * 0.3, radius * 0.3),
        y: y + randRange(-radius * 0.3, radius * 0.3),
        vx: Math.cos(angle) * speed,
        vy: -Math.abs(Math.sin(angle)) * speed - 20,
        life: randRange(0.5, 1.5),
        maxLife: 1.5,
        color: `rgba(${80 + randInt(0, 40)}, ${70 + randInt(0, 30)}, ${60 + randInt(0, 30)}, 0.6)`,
        size: randRange(5, 15),
        gravity: false,
        type: 'smoke',
      });
    }

    // Debris
    for (let i = 0; i < count * 0.4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randRange(80, radius * 6);
      this._particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: randRange(0.5, 1.2),
        maxLife: 1.2,
        color: `rgb(${80 + randInt(0, 40)}, ${50 + randInt(0, 30)}, ${20 + randInt(0, 20)})`,
        size: randRange(2, 5),
        gravity: true,
        type: 'debris',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: randRange(-10, 10),
      });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DAMAGE
  // ───────────────────────────────────────────────────────────────────────────

  private _damageWorm(worm: Worm, damage: number, fromX: number, fromY: number, knockback: number, kbDirX: number, kbDirY: number, _owner: number): void {
    if (!worm.alive) return;
    if (worm.frozen > 0) {
      damage = Math.floor(damage * 0.5);
      knockback *= 0.3;
    }

    worm.hp -= damage;

    // Knockback
    const kbMag = knockback;
    const len = Math.sqrt(kbDirX * kbDirX + kbDirY * kbDirY) || 1;
    worm.vx += (kbDirX / len) * kbMag;
    worm.vy += (kbDirY / len) * kbMag;
    worm.grounded = false;

    // Damage number particle
    this._particles.push({
      x: worm.x,
      y: worm.y - 30,
      vx: randRange(-20, 20),
      vy: -60,
      life: 1.5,
      maxLife: 1.5,
      color: '#ff3333',
      size: 14,
      gravity: false,
      type: 'text',
      text: `-${damage}`,
    });

    this._playSound('hit');

    if (worm.hp <= 0) {
      worm.hp = 0;
      worm.alive = false;
      this._playSound('death');

      // Death particles
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = randRange(50, 150);
        this._particles.push({
          x: worm.x, y: worm.y - 10,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: randRange(0.5, 1.0),
          maxLife: 1.0,
          color: this._teams[worm.team].color,
          size: randRange(3, 6),
          gravity: true,
          type: 'debris',
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: randRange(-8, 8),
        });
      }

      // Small explosion where they die
      this._spawnExplosionParticles(worm.x, worm.y - 5, 15);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UPDATE LOOP
  // ───────────────────────────────────────────────────────────────────────────

  private _update(dt: number): void {
    this._gameTime += dt;
    this._waterOffset += dt * 30;
    this._bgHueShift += dt * 2;
    this._crosshairPulse += dt * 5;

    // Update screen shake
    if (this._shakeTime > 0) {
      this._shakeTime -= dt;
      if (this._shakeTime <= 0) {
        this._shakeAmount = 0;
      }
    }

    // Update particles regardless of phase
    this._updateParticles(dt);

    if (this._phase === 'title') {
      this._updateTitle(dt);
      return;
    }

    if (this._phase === 'victory') {
      this._updateVictory(dt);
      return;
    }

    // Flash text timer
    if (this._flashTimer > 0) {
      this._flashTimer -= dt;
    }

    // Update physics for all worms
    this._updateWormPhysics(dt);

    // Update projectiles
    this._updateProjectiles(dt);

    // Update airstrikes
    this._updateAirStrikes(dt);

    // Update rope
    if (this._rope.active) {
      this._updateRope(dt);
    }

    // Update mines (proximity check)
    this._updateMines();

    // Phase-specific logic
    switch (this._phase) {
      case 'playing':
      case 'aiming':
        this._updatePlayingPhase(dt);
        break;
      case 'firing':
        this._updateFiringPhase(dt);
        break;
      case 'resolving':
        this._updateResolvingPhase(dt);
        break;
      case 'retreat':
        this._updateRetreatPhase(dt);
        break;
    }

    // Camera
    this._updateCamera(dt);

    // Win condition check
    this._checkWinCondition();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE UPDATES
  // ───────────────────────────────────────────────────────────────────────────

  private _updateTitle(dt: number): void {
    // Animate clouds for title screen
    for (const cloud of this._clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x > TERRAIN_WIDTH * 1.5) cloud.x = -cloud.width;
    }
  }

  private _updateVictory(dt: number): void {
    // Spawn confetti
    if (Math.random() < 5 * dt) {
      this._particles.push({
        x: randRange(this._camX - 400, this._camX + 400),
        y: this._camY - 300,
        vx: randRange(-50, 50),
        vy: randRange(50, 150),
        life: randRange(2, 4),
        maxLife: 4,
        color: `hsl(${randRange(0, 360)}, 100%, 60%)`,
        size: randRange(3, 7),
        gravity: true,
        type: 'debris',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: randRange(-5, 5),
      });
    }
  }

  private _updatePlayingPhase(dt: number): void {
    const worm = this._getActiveWorm();
    if (!worm) {
      this._advanceToNextWorm();
      return;
    }

    // Turn timer
    this._turnTimer -= dt;
    if (this._turnTimer <= 0) {
      this._endTurn();
      return;
    }

    // Charging power
    if (this._charging) {
      this._chargeTime += dt;
      this._power = Math.min(this._chargeTime * CHARGE_RATE, MAX_POWER);
      if (this._chargeTime % 0.1 < dt) {
        this._playSound('charge');
      }
    }

    // AI logic
    if (this._aiActive) {
      this._updateAI(dt);
      return;
    }

    // Player input (all teams are AI, but this supports manual play if needed)
    // Movement
    if (worm.grounded && !this._charging && !this._rope.active) {
      if (this._keys.has('a') || this._keys.has('arrowleft')) {
        worm.vx = -MOVE_SPEED;
        worm.facing = -1;
      } else if (this._keys.has('d') || this._keys.has('arrowright')) {
        worm.vx = MOVE_SPEED;
        worm.facing = 1;
      } else {
        worm.vx = 0;
      }
    }

    // Aim with mouse
    if (worm) {
      const dx = this._mouseWorldX - worm.x;
      const dy = this._mouseWorldY - (worm.y - 10);
      if (dx !== 0 || dy !== 0) {
        worm.facing = dx >= 0 ? 1 : -1;
        worm.aimAngle = Math.atan2(dy, Math.abs(dx));
        worm.aimAngle = clamp(worm.aimAngle, -Math.PI / 2, Math.PI / 2);
      }
    }

    // Camera target
    this._camTargetX = worm.x;
    this._camTargetY = worm.y;
  }

  private _updateFiringPhase(dt: number): void {
    // Follow projectile with camera
    if (this._projectiles.length > 0) {
      const activeProj = this._projectiles.find(p => p.active);
      if (activeProj) {
        this._camTargetX = activeProj.x;
        this._camTargetY = activeProj.y;
      }
    }

    // If no active projectiles and no airstrikes, resolve
    const hasActive = this._projectiles.some(p => p.active);
    const hasAirStrike = this._airStrikes.length > 0;
    if (!hasActive && !hasAirStrike) {
      this._phase = 'resolving';
      this._resolveTimer = 0;
      this._resolvePhaseDelay = 1.0;
    }
  }

  private _updateResolvingPhase(dt: number): void {
    this._resolveTimer += dt;

    // Wait for all worms to settle
    let allSettled = true;
    for (const w of this._getAliveWorms()) {
      if (!w.grounded || Math.abs(w.vx) > 5 || Math.abs(w.vy) > 5) {
        allSettled = false;
        break;
      }
    }

    if (this._resolveTimer > this._resolvePhaseDelay && allSettled && this._projectiles.every(p => !p.active)) {
      this._endTurn();
    }

    // Safety timeout
    if (this._resolveTimer > 8) {
      this._endTurn();
    }
  }

  private _updateRetreatPhase(dt: number): void {
    this._retreatTimer -= dt;
    const worm = this._getActiveWorm();

    if (worm && !this._aiActive) {
      // Allow movement during retreat
      if (worm.grounded) {
        if (this._keys.has('a') || this._keys.has('arrowleft')) {
          worm.vx = -MOVE_SPEED;
          worm.facing = -1;
        } else if (this._keys.has('d') || this._keys.has('arrowright')) {
          worm.vx = MOVE_SPEED;
          worm.facing = 1;
        } else {
          worm.vx = 0;
        }
      }
      this._camTargetX = worm.x;
      this._camTargetY = worm.y;
    }

    if (this._retreatTimer <= 0) {
      this._advanceToNextTeam();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TURN MANAGEMENT
  // ───────────────────────────────────────────────────────────────────────────

  private _endTurn(): void {
    this._charging = false;
    this._chargeTime = 0;
    this._rope.active = false;
    this._teleportMode = false;
    this._placingGirder = false;
    this._weaponSelectOpen = false;

    // Apply poison
    const worm = this._getActiveWorm();
    if (worm && worm.poisoned > 0) {
      worm.poisoned--;
      this._damageWorm(worm, 5, worm.x, worm.y, 0, 0, 0, -1);
      this._particles.push({
        x: worm.x, y: worm.y - 30,
        vx: 0, vy: -40,
        life: 1.0, maxLife: 1.0,
        color: '#44ff44',
        size: 12,
        gravity: false,
        type: 'text',
        text: 'POISON -5',
      });
    }

    // If shotgun and shots left, allow another shot
    if (this._currentWeapon === 'shotgun' && this._shotgunShotsLeft > 0) {
      this._shotgunShotsLeft--;
      this._phase = 'playing';
      return;
    }

    this._phase = 'retreat';
    this._retreatTimer = RETREAT_TIME;
  }

  private _advanceToNextTeam(): void {
    this._turnNumber++;

    // Apply poison to all affected worms at turn start
    for (const w of this._getAliveWorms()) {
      if (w.poisoned > 0 && w.team !== this._currentTeam) {
        // Already handled in endTurn for active worm
      }
      if (w.frozen > 0) {
        w.frozen--;
      }
    }

    // Find next alive team
    let nextTeam = (this._currentTeam + 1) % this._teams.length;
    let attempts = 0;
    while (attempts < this._teams.length) {
      if (this._teams[nextTeam].worms.some(w => w.alive)) break;
      nextTeam = (nextTeam + 1) % this._teams.length;
      attempts++;
    }

    this._currentTeam = nextTeam;
    this._advanceToNextWorm();

    // Randomize wind
    this._wind = randRange(-1, 1);

    // Reset turn
    this._turnTimer = TURN_TIME;
    this._currentWeapon = 'bazooka';
    this._phase = 'playing';
    this._shotsFired = 0;

    // All teams are AI
    this._aiActive = true;
    this._aiPhase = 'thinking';
    this._aiTimer = 0;

    // Flash turn text
    const worm = this._getActiveWorm();
    if (worm) {
      this._flashText = `${this._teams[this._currentTeam].name}: ${worm.name}'s turn`;
      this._flashTimer = 2.0;
      this._camTargetX = worm.x;
      this._camTargetY = worm.y;
    }

    this._playSound('turn');
  }

  private _advanceToNextWorm(): void {
    const team = this._teams[this._currentTeam];
    if (!team) return;

    // Find next alive worm
    let startIdx = this._currentWormIndex;
    for (let i = 0; i < team.worms.length; i++) {
      const idx = (startIdx + 1 + i) % team.worms.length;
      if (team.worms[idx].alive) {
        this._currentWormIndex = idx;
        return;
      }
    }
  }

  private _cycleCameraToNextWorm(): void {
    const allAlive = this._getAliveWorms();
    if (allAlive.length === 0) return;

    // Find a random alive worm from a different team to look at
    const others = allAlive.filter(w => w.team !== this._currentTeam);
    const target = others.length > 0 ? others[randInt(0, others.length - 1)] : allAlive[0];
    this._camTargetX = target.x;
    this._camTargetY = target.y;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // AI SYSTEM
  // ───────────────────────────────────────────────────────────────────────────

  private _updateAI(dt: number): void {
    const worm = this._getActiveWorm();
    if (!worm) {
      this._advanceToNextWorm();
      return;
    }

    if (worm.frozen > 0) {
      // Frozen, skip turn
      this._aiTimer += dt;
      if (this._aiTimer > 1.0) {
        this._endTurn();
      }
      return;
    }

    this._aiTimer += dt;

    switch (this._aiPhase) {
      case 'thinking': {
        if (this._aiTimer > 0.8) {
          // Pick a weapon
          this._aiSelectWeapon(worm);
          this._aiPhase = 'moving';
          this._aiTimer = 0;
          this._aiMoveTime = randRange(0, 1.0);
          this._aiMoveDir = Math.random() > 0.5 ? 1 : -1;
        }
        break;
      }

      case 'moving': {
        if (this._aiTimer < this._aiMoveTime && worm.grounded) {
          worm.vx = this._aiMoveDir * MOVE_SPEED;
          worm.facing = this._aiMoveDir;
        } else {
          worm.vx = 0;
          this._aiPhase = 'aiming';
          this._aiTimer = 0;
          this._aiCalculateShot(worm);
        }
        this._camTargetX = worm.x;
        this._camTargetY = worm.y;
        break;
      }

      case 'aiming': {
        // Smoothly move aim toward target
        const aimSpeed = 1.5;
        worm.aimAngle = lerp(worm.aimAngle, this._aiTargetAngle, dt * aimSpeed);

        if (this._aiTimer > 1.0) {
          this._aiPhase = 'firing';
          this._aiTimer = 0;
        }
        break;
      }

      case 'firing': {
        const weapon = WEAPONS[this._currentWeapon];
        if (!weapon) {
          this._endTurn();
          return;
        }

        if (weapon.type === 'teleport') {
          // Find a safe spot
          const tx = worm.x + randRange(-200, 200);
          const ty = this._findSurfaceY(tx) - WORM_RADIUS;
          this._spawnTeleportParticles(worm.x, worm.y);
          worm.x = tx;
          worm.y = ty;
          this._spawnTeleportParticles(worm.x, worm.y);
          this._useAmmo('teleport');
          this._playSound('fire');
          this._endTurn();
          return;
        }

        if (weapon.type === 'strike') {
          // Find nearest enemy for strike target
          const target = this._findNearestEnemy(worm);
          if (target) {
            if (this._currentWeapon === 'earthquake') {
              this._doEarthquake();
            } else if (this._currentWeapon === 'excalibur') {
              this._doExcaliburStrike(target.x, target.y);
            } else if (this._currentWeapon === 'lightning_bolt') {
              this._doLightningStrike(target.x, target.y);
            }
            this._useAmmo(this._currentWeapon);
          } else {
            this._endTurn();
          }
          return;
        }

        if (weapon.type === 'airstrike') {
          const target = this._findNearestEnemy(worm);
          if (target) {
            this._airStrikes.push({
              x: target.x,
              projectiles: this._currentWeapon === 'carpet_bomb' ? 12 :
                this._currentWeapon === 'air_strike' ? 5 :
                  this._currentWeapon === 'concrete_donkey' ? 1 :
                    this._currentWeapon === 'meteor' ? 1 :
                      this._currentWeapon === 'grail_strike' ? 1 : 5,
              delay: this._currentWeapon === 'carpet_bomb' ? 0.08 : 0.15,
              timer: 0,
              spawned: 0,
              weaponKey: this._currentWeapon,
            });
            this._useAmmo(this._currentWeapon);
            this._phase = 'firing';
          } else {
            this._endTurn();
          }
          return;
        }

        if (weapon.type === 'melee') {
          this._fireMelee(worm, worm.aimAngle);
          this._useAmmo(this._currentWeapon);
          return;
        }

        if (weapon.type === 'hitscan') {
          if (this._currentWeapon === 'shotgun') {
            this._fireShotgun(worm, worm.aimAngle);
          } else if (this._currentWeapon === 'dragon_breath') {
            this._fireDragonBreath(worm, worm.aimAngle);
          }
          this._useAmmo(this._currentWeapon);
          return;
        }

        if (weapon.type === 'placed') {
          if (this._currentWeapon === 'dynamite') {
            const proj: Projectile = {
              x: worm.x + worm.facing * 15,
              y: worm.y - 5,
              vx: 0, vy: 0,
              type: 'dynamite',
              timer: 0,
              bounces: 0,
              owner: this._currentTeam,
              trail: [],
              fuseTime: weapon.fuseTime || 4,
              active: true,
              angle: 0,
            };
            this._projectiles.push(proj);
            this._useAmmo(this._currentWeapon);
            this._phase = 'firing';
          } else if (this._currentWeapon === 'mine') {
            this._mines.push({
              x: worm.x + worm.facing * 20,
              y: worm.y,
              team: this._currentTeam,
            });
            this._useAmmo(this._currentWeapon);
            this._endTurn();
          } else if (this._currentWeapon === 'girder') {
            // AI places girder near self for cover
            const gx = worm.x + worm.facing * 40;
            const gy = worm.y - 30;
            for (let lx = -30; lx <= 30; lx++) {
              for (let ly = -3; ly <= 3; ly++) {
                const px = Math.floor(gx + lx);
                const py = Math.floor(gy + ly);
                if (px >= 0 && px < TERRAIN_WIDTH && py >= 0 && py < TERRAIN_HEIGHT) {
                  this._terrainMask[py * TERRAIN_WIDTH + px] = 1;
                }
              }
            }
            this._renderTerrainRegion(gx - 35, gy - 8, gx + 35, gy + 8);
            this._useAmmo(this._currentWeapon);
            this._endTurn();
          }
          return;
        }

        // Projectile / grenade: fire with calculated power
        this._playSound('fire');
        this._fireWeaponAI(worm, this._aiTargetPower);
        this._aiPhase = 'waiting';
        this._aiTimer = 0;
        break;
      }

      case 'waiting': {
        // Wait for resolution
        if (this._aiTimer > 0.5 && this._phase === 'playing') {
          this._endTurn();
        }
        break;
      }
    }
  }

  private _aiSelectWeapon(worm: Worm): void {
    const team = this._teams[worm.team];
    const target = this._findNearestEnemy(worm);
    const targetDist = target ? dist(worm.x, worm.y, target.x, target.y) : 1000;

    // Weight weapons based on situation
    const candidates: { key: string; weight: number }[] = [];

    for (const [key, weapon] of Object.entries(WEAPONS)) {
      // Check ammo
      if (weapon.ammo !== -1) {
        const ammo = team.ammo.get(key) ?? 0;
        if (ammo <= 0) continue;
      }

      let weight = 1;

      // Prefer projectiles and grenades
      if (weapon.type === 'projectile') weight += 3;
      if (weapon.type === 'grenade') weight += 2;

      // Melee only if close
      if (weapon.type === 'melee') {
        if (targetDist < 50) weight += 5;
        else weight = 0;
      }

      // Airstrike for far targets
      if (weapon.type === 'airstrike') weight += 1;

      // Prefer high damage
      weight += weapon.damage / 30;

      // Avoid utility if there's enemies to attack
      if (weapon.type === 'teleport' || weapon.type === 'rope' || key === 'girder') {
        weight = 0.3;
      }

      if (weight > 0) {
        candidates.push({ key, weight });
      }
    }

    // Weighted random selection
    const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
    let r = Math.random() * totalWeight;
    let selected = 'bazooka';
    for (const c of candidates) {
      r -= c.weight;
      if (r <= 0) {
        selected = c.key;
        break;
      }
    }

    this._currentWeapon = selected;
  }

  private _aiCalculateShot(worm: Worm): void {
    const target = this._findNearestEnemy(worm);
    if (!target) {
      this._aiTargetAngle = -Math.PI / 4;
      this._aiTargetPower = 0.5;
      return;
    }

    const dx = target.x - worm.x;
    const dy = (target.y - 10) - (worm.y - 10);
    const d = Math.sqrt(dx * dx + dy * dy);

    worm.facing = dx >= 0 ? 1 : -1;

    // Calculate angle - simple arc calculation
    const weapon = WEAPONS[this._currentWeapon];
    const speed = (weapon.speed || 500);

    // Use projectile motion to calculate angle
    const absDx = Math.abs(dx);
    const g = GRAVITY;

    // Approximate good angle
    let angle = Math.atan2(dy - d * 0.3, absDx);
    angle = clamp(angle, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);

    // Add some randomness for imperfection
    angle += randRange(-0.15, 0.15);

    // Calculate power based on distance
    let power = clamp(d / (speed * 1.2), 0.2, 1.0);
    power += randRange(-0.1, 0.1);
    power = clamp(power, 0.1, 1.0);

    this._aiTargetAngle = angle;
    this._aiTargetPower = power;
  }

  private _fireWeaponAI(worm: Worm, power: number): void {
    const weapon = WEAPONS[this._currentWeapon];
    if (!weapon) return;

    const aimAngle = worm.aimAngle;
    const dirX = Math.cos(aimAngle) * worm.facing;
    const dirY = Math.sin(aimAngle);
    const speed = (weapon.speed || 500) * Math.max(power, 0.1);

    if (weapon.type === 'projectile' || weapon.type === 'grenade') {
      const proj: Projectile = {
        x: worm.x + dirX * 20,
        y: worm.y - 10 + dirY * 20,
        vx: dirX * speed,
        vy: dirY * speed,
        type: this._currentWeapon,
        timer: 0,
        bounces: 0,
        owner: this._currentTeam,
        trail: [],
        fuseTime: weapon.fuseTime,
        clusterCount: weapon.clusterCount,
        active: true,
        angle: aimAngle,
      };
      this._projectiles.push(proj);
      this._useAmmo(this._currentWeapon);
      this._phase = 'firing';
    }
  }

  private _findNearestEnemy(worm: Worm): Worm | null {
    let nearest: Worm | null = null;
    let nearestDist = Infinity;

    for (const w of this._getAliveWorms()) {
      if (w.team === worm.team) continue;
      const d = dist(worm.x, worm.y, w.x, w.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = w;
      }
    }

    return nearest;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PHYSICS
  // ───────────────────────────────────────────────────────────────────────────

  private _updateWormPhysics(dt: number): void {
    for (const w of this._getAllWorms()) {
      if (!w.alive) continue;

      // Track velocity for fall damage
      const key = `${w.team}_${w.name}`;
      if (!w.grounded) {
        const prevVel = this._wormFallVelocities.get(key) || 0;
        this._wormFallVelocities.set(key, Math.max(prevVel, w.vy));
      }

      // Gravity
      if (!w.grounded) {
        w.vy += GRAVITY * dt;
      }

      // Apply velocity
      w.x += w.vx * dt;
      w.y += w.vy * dt;

      // Friction
      if (w.grounded) {
        w.vx *= 0.85;
        if (Math.abs(w.vx) < 1) w.vx = 0;
      } else {
        w.vx *= 0.99;
      }

      // Terrain collision
      w.grounded = false;

      // Check feet (bottom of worm)
      if (this._isTerrainSolid(w.x, w.y + WORM_RADIUS)) {
        // Push up
        let pushUp = 0;
        while (pushUp < 20 && this._isTerrainSolid(w.x, w.y + WORM_RADIUS - pushUp)) {
          pushUp++;
        }
        w.y -= pushUp;
        w.grounded = true;

        // Fall damage
        const fallVel = this._wormFallVelocities.get(key) || 0;
        if (fallVel > FALL_DAMAGE_THRESHOLD) {
          const dmg = Math.floor((fallVel - FALL_DAMAGE_THRESHOLD) * FALL_DAMAGE_MULTIPLIER);
          if (dmg > 0) {
            this._damageWorm(w, dmg, w.x, w.y, 0, 0, 0, -1);
          }
        }
        this._wormFallVelocities.delete(key);

        if (w.vy > 0) w.vy = 0;
      }

      // Head collision
      if (this._isTerrainSolid(w.x, w.y - WORM_RADIUS)) {
        w.y += 2;
        if (w.vy < 0) w.vy = 0;
      }

      // Side collisions
      if (this._isTerrainSolid(w.x + WORM_RADIUS, w.y)) {
        w.x -= 2;
        w.vx = 0;
      }
      if (this._isTerrainSolid(w.x - WORM_RADIUS, w.y)) {
        w.x += 2;
        w.vx = 0;
      }

      // Climbing small slopes while moving
      if (w.grounded && Math.abs(w.vx) > 5) {
        if (this._isTerrainSolid(w.x + Math.sign(w.vx) * WORM_RADIUS, w.y - 2)) {
          // Try to step up
          if (!this._isTerrainSolid(w.x + Math.sign(w.vx) * WORM_RADIUS, w.y - 8)) {
            w.y -= 4;
          } else {
            w.vx = 0;
          }
        }
      }

      // Bounds
      w.x = clamp(w.x, WORM_RADIUS, TERRAIN_WIDTH - WORM_RADIUS);

      // Water death
      if (w.y > TERRAIN_HEIGHT - WATER_LEVEL) {
        if (w.alive) {
          w.alive = false;
          w.hp = 0;
          this._playSound('splash');
          this._spawnWaterSplash(w.x, TERRAIN_HEIGHT - WATER_LEVEL);
          this._playSound('death');
        }
      }

      // Animation
      w.animTimer += dt;
      if (w.animTimer > 0.15) {
        w.animTimer = 0;
        w.animFrame = (w.animFrame + 1) % 4;
      }
    }
  }

  private _spawnWaterSplash(x: number, y: number): void {
    for (let i = 0; i < 30; i++) {
      const angle = -Math.PI / 2 + randRange(-0.8, 0.8);
      const speed = randRange(100, 300);
      this._particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randRange(0.3, 0.8),
        maxLife: 0.8,
        color: `hsl(${randRange(190, 220)}, 80%, ${randRange(50, 80)}%)`,
        size: randRange(2, 5),
        gravity: true,
        type: 'circle',
      });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PROJECTILE UPDATES
  // ───────────────────────────────────────────────────────────────────────────

  private _updateProjectiles(dt: number): void {
    for (const proj of this._projectiles) {
      if (!proj.active) continue;

      proj.timer += dt;

      // Gravity
      proj.vy += GRAVITY * dt;

      // Wind (if affected)
      const weapon = WEAPONS[proj.type];
      if (weapon && weapon.windAffected) {
        proj.vx += this._wind * 100 * dt;
      }

      // Move
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;

      // Update angle
      proj.angle = Math.atan2(proj.vy, proj.vx);

      // Trail
      if (proj.trail.length === 0 || dist(proj.x, proj.y, proj.trail[proj.trail.length - 1].x, proj.trail[proj.trail.length - 1].y) > 5) {
        proj.trail.push({ x: proj.x, y: proj.y });
        if (proj.trail.length > 30) proj.trail.shift();
      }

      // Trail particles
      if (Math.random() < 0.3) {
        let trailColor = '#ffaa33';
        if (proj.type === 'holy_hand_grenade') trailColor = '#ffff88';
        else if (proj.type === 'freeze_blast') trailColor = '#88ddff';
        else if (proj.type === 'poison_strike') trailColor = '#88ff88';
        else if (proj.type === 'mole_bomb') trailColor = '#884422';
        else if (proj.type === 'holy_water') trailColor = '#4488ff';

        this._particles.push({
          x: proj.x, y: proj.y,
          vx: randRange(-20, 20),
          vy: randRange(-20, 20),
          life: 0.3,
          maxLife: 0.3,
          color: trailColor,
          size: randRange(1, 3),
          gravity: false,
          type: 'smoke',
        });
      }

      // Check out of bounds
      if (proj.x < -50 || proj.x > TERRAIN_WIDTH + 50 || proj.y > TERRAIN_HEIGHT + 50) {
        proj.active = false;
        continue;
      }

      // Terrain collision
      if (this._isTerrainSolid(proj.x, proj.y)) {
        if (weapon && weapon.type === 'grenade') {
          // Bounce
          if (proj.bounces < 5) {
            proj.bounces++;

            // Simple bounce: reflect velocity
            // Try to determine surface normal
            const testDist = 3;
            const solidLeft = this._isTerrainSolid(proj.x - testDist, proj.y);
            const solidRight = this._isTerrainSolid(proj.x + testDist, proj.y);
            const solidUp = this._isTerrainSolid(proj.x, proj.y - testDist);
            const solidDown = this._isTerrainSolid(proj.x, proj.y + testDist);

            if (solidDown && !solidUp) {
              proj.vy = -Math.abs(proj.vy) * 0.5;
              proj.y -= 3;
            } else if (solidUp && !solidDown) {
              proj.vy = Math.abs(proj.vy) * 0.5;
              proj.y += 3;
            } else {
              proj.vy = -proj.vy * 0.5;
            }

            if (solidLeft && !solidRight) {
              proj.vx = Math.abs(proj.vx) * 0.5;
              proj.x += 3;
            } else if (solidRight && !solidLeft) {
              proj.vx = -Math.abs(proj.vx) * 0.5;
              proj.x -= 3;
            } else {
              proj.vx = -proj.vx * 0.5;
            }

            // Dampen
            proj.vx *= 0.7;
            proj.vy *= 0.7;

            this._playSound('bounce');

            // Stop if very slow
            if (Math.abs(proj.vx) < 5 && Math.abs(proj.vy) < 5) {
              proj.vx = 0;
              proj.vy = 0;
            }
          }
        } else if (proj.type === 'mole_bomb') {
          // Mole bomb: burrow through terrain
          this._destroyTerrain(proj.x, proj.y, 8);
          proj.vy = Math.max(proj.vy, 50);
          // Eventually explode
          if (proj.timer > 3) {
            this._createExplosion(proj.x, proj.y, weapon!.radius, weapon!.damage, weapon!.knockback, proj.owner, proj.type);
            proj.active = false;
          }
          continue;
        } else if (proj.type === 'sheep') {
          // Sheep walks on terrain
          // Push up
          let pushed = false;
          for (let i = 0; i < 20; i++) {
            if (!this._isTerrainSolid(proj.x, proj.y - i)) {
              proj.y -= i;
              proj.vy = 0;
              pushed = true;
              break;
            }
          }
          if (!pushed) {
            // Stuck, explode
            this._createExplosion(proj.x, proj.y, weapon!.radius, weapon!.damage, weapon!.knockback, proj.owner, proj.type);
            proj.active = false;
            continue;
          }
          // Walk forward
          proj.vx = (proj.vx > 0 ? 1 : -1) * 80;
          // Check worm proximity
          for (const w of this._getAliveWorms()) {
            if (dist(proj.x, proj.y, w.x, w.y) < 30) {
              this._createExplosion(proj.x, proj.y, weapon!.radius, weapon!.damage, weapon!.knockback, proj.owner, proj.type);
              proj.active = false;
              break;
            }
          }
          // Timer
          if (proj.timer > 6) {
            this._createExplosion(proj.x, proj.y, weapon!.radius, weapon!.damage, weapon!.knockback, proj.owner, proj.type);
            proj.active = false;
          }
          continue;
        } else {
          // Standard projectile: explode on impact
          if (weapon) {
            this._createExplosion(proj.x, proj.y, weapon.radius, weapon.damage, weapon.knockback, proj.owner, proj.type);
          }
          proj.active = false;
          continue;
        }
      }

      // Grenade fuse
      if (proj.fuseTime !== undefined) {
        if (proj.timer >= proj.fuseTime) {
          if (weapon) {
            this._createExplosion(proj.x, proj.y, weapon.radius, weapon.damage, weapon.knockback, proj.owner, proj.type);

            // Cluster bombs
            if (proj.clusterCount && proj.clusterCount > 0) {
              for (let c = 0; c < proj.clusterCount; c++) {
                const angle = -Math.PI / 2 + randRange(-0.8, 0.8);
                const speed = randRange(150, 350);
                const cluster: Projectile = {
                  x: proj.x,
                  y: proj.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  type: proj.type,
                  timer: 0,
                  bounces: 0,
                  owner: proj.owner,
                  trail: [],
                  fuseTime: randRange(0.5, 1.5),
                  active: true,
                  angle: angle,
                };
                this._projectiles.push(cluster);
              }
            }
          }
          proj.active = false;
          continue;
        }
      }

      // Dynamite: just sits and counts down
      if (proj.type === 'dynamite') {
        proj.vx = 0;
        // Fuse sparks
        if (Math.random() < 0.5) {
          this._particles.push({
            x: proj.x, y: proj.y - 8,
            vx: randRange(-30, 30),
            vy: randRange(-60, -20),
            life: 0.3,
            maxLife: 0.3,
            color: '#ffaa00',
            size: randRange(1, 3),
            gravity: false,
            type: 'spark',
          });
        }
      }

      // Worm direct hit (for projectiles, not grenades)
      if (weapon && weapon.type === 'projectile' && proj.type !== 'sheep') {
        for (const w of this._getAliveWorms()) {
          if (dist(proj.x, proj.y, w.x, w.y - 5) < WORM_RADIUS + 5) {
            this._createExplosion(proj.x, proj.y, weapon.radius, weapon.damage, weapon.knockback, proj.owner, proj.type);
            proj.active = false;
            break;
          }
        }
      }
    }

    // Clean up inactive projectiles
    this._projectiles = this._projectiles.filter(p => p.active);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // AIRSTRIKE UPDATES
  // ───────────────────────────────────────────────────────────────────────────

  private _updateAirStrikes(dt: number): void {
    for (let i = this._airStrikes.length - 1; i >= 0; i--) {
      const as = this._airStrikes[i];
      as.timer += dt;

      if (as.timer >= as.delay * as.spawned && as.spawned < as.projectiles) {
        const weapon = WEAPONS[as.weaponKey];
        if (!weapon) continue;

        let px: number;
        let py = -50;
        let pvx = 0;
        let pvy = 300;

        if (as.weaponKey === 'carpet_bomb') {
          const spread = (as.spawned - as.projectiles / 2) * 25;
          px = as.x + spread;
          pvy = 400;
        } else if (as.weaponKey === 'concrete_donkey') {
          px = as.x;
          pvy = 500;
        } else if (as.weaponKey === 'meteor') {
          px = as.x + randRange(-30, 30);
          pvy = 600;
        } else if (as.weaponKey === 'grail_strike') {
          px = as.x;
          pvy = 350;
        } else {
          const spread = (as.spawned - as.projectiles / 2) * 30;
          px = as.x + spread;
          pvy = 350;
        }

        const proj: Projectile = {
          x: px,
          y: py,
          vx: pvx,
          vy: pvy,
          type: as.weaponKey,
          timer: 0,
          bounces: 0,
          owner: this._currentTeam,
          trail: [],
          active: true,
          angle: Math.PI / 2,
        };
        this._projectiles.push(proj);
        as.spawned++;
      }

      if (as.spawned >= as.projectiles && as.timer > as.delay * as.projectiles + 0.5) {
        this._airStrikes.splice(i, 1);
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MINES
  // ───────────────────────────────────────────────────────────────────────────

  private _updateMines(): void {
    for (let i = this._mines.length - 1; i >= 0; i--) {
      const mine = this._mines[i];

      // Proximity check
      for (const w of this._getAliveWorms()) {
        if (w.team === mine.team) continue;
        if (dist(mine.x, mine.y, w.x, w.y) < 30) {
          this._createExplosion(mine.x, mine.y, WEAPONS['mine'].radius, WEAPONS['mine'].damage, WEAPONS['mine'].knockback, mine.team, 'mine');
          this._mines.splice(i, 1);
          break;
        }
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ROPE
  // ───────────────────────────────────────────────────────────────────────────

  private _updateRope(dt: number): void {
    const worm = this._getActiveWorm();
    if (!worm || !this._rope.active) return;

    // Pendulum physics
    const g = GRAVITY;
    const l = this._rope.length;

    // Angular acceleration from gravity
    this._rope.angularVel += (-g / l) * Math.sin(this._rope.angle) * dt;

    // Input: left/right accelerate
    if (this._keys.has('a') || this._keys.has('arrowleft')) {
      this._rope.angularVel -= 3 * dt;
    }
    if (this._keys.has('d') || this._keys.has('arrowright')) {
      this._rope.angularVel += 3 * dt;
    }

    // Damping
    this._rope.angularVel *= 0.995;

    this._rope.angle += this._rope.angularVel * dt;

    // Update worm position
    worm.x = this._rope.anchorX + Math.cos(this._rope.angle) * this._rope.length;
    worm.y = this._rope.anchorY + Math.sin(this._rope.angle) * this._rope.length;

    // Release on space
    if (this._keys.has(' ')) {
      worm.vx = -Math.sin(this._rope.angle) * this._rope.angularVel * this._rope.length;
      worm.vy = Math.cos(this._rope.angle) * this._rope.angularVel * this._rope.length;
      this._rope.active = false;
    }

    // Shorten/lengthen
    if (this._keys.has('w') || this._keys.has('arrowup')) {
      this._rope.length = Math.max(20, this._rope.length - 100 * dt);
    }
    if (this._keys.has('s') || this._keys.has('arrowdown')) {
      this._rope.length = Math.min(300, this._rope.length + 100 * dt);
    }

    this._camTargetX = worm.x;
    this._camTargetY = worm.y;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PARTICLES
  // ───────────────────────────────────────────────────────────────────────────

  private _updateParticles(dt: number): void {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this._particles.splice(i, 1);
        continue;
      }

      if (p.gravity) {
        p.vy += GRAVITY * dt;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.rotation !== undefined && p.rotSpeed !== undefined) {
        p.rotation += p.rotSpeed * dt;
      }

      // Fade velocity for smoke
      if (p.type === 'smoke') {
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.size += dt * 3;
      }
    }

    // Cap particles
    if (this._particles.length > 2000) {
      this._particles.splice(0, this._particles.length - 1500);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CAMERA
  // ───────────────────────────────────────────────────────────────────────────

  private _updateCamera(dt: number): void {
    // Edge scrolling
    if (this._phase !== 'title' && this._phase !== 'victory') {
      const margin = this._edgeScrollMargin;
      if (this._mouseX < margin) {
        this._camTargetX -= this._edgeScrollSpeed * dt;
      } else if (this._mouseX > this._canvas.width - margin) {
        this._camTargetX += this._edgeScrollSpeed * dt;
      }
      if (this._mouseY < margin) {
        this._camTargetY -= this._edgeScrollSpeed * dt;
      } else if (this._mouseY > this._canvas.height - margin) {
        this._camTargetY += this._edgeScrollSpeed * dt;
      }
    }

    // Clamp target
    const halfW = (this._canvas.width / 2) / this._camZoom;
    const halfH = (this._canvas.height / 2) / this._camZoom;
    this._camTargetX = clamp(this._camTargetX, halfW, TERRAIN_WIDTH - halfW);
    this._camTargetY = clamp(this._camTargetY, halfH, TERRAIN_HEIGHT - halfH);

    // Smooth lerp
    const camLerp = 1 - Math.pow(0.01, dt);
    this._camX = lerp(this._camX, this._camTargetX, camLerp);
    this._camY = lerp(this._camY, this._camTargetY, camLerp);
    this._camZoom = lerp(this._camZoom, this._camTargetZoom, camLerp);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WIN CONDITION
  // ───────────────────────────────────────────────────────────────────────────

  private _checkWinCondition(): void {
    if (this._phase === 'victory' || this._phase === 'title') return;

    let aliveTeams = 0;
    let lastAliveTeam = -1;

    for (let t = 0; t < this._teams.length; t++) {
      if (this._teams[t].worms.some(w => w.alive)) {
        aliveTeams++;
        lastAliveTeam = t;
      }
    }

    if (aliveTeams <= 1) {
      this._winningTeam = lastAliveTeam;
      this._phase = 'victory';
      this._buildVictoryButtons();
      this._playSound('victory');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WEAPON SELECT CLICK
  // ───────────────────────────────────────────────────────────────────────────

  private _checkWeaponSelectClick(): void {
    const cols = 6;
    const cellW = 130;
    const cellH = 50;
    const startX = (this._canvas.width - cols * cellW) / 2;
    const startY = 80;

    const keys = Object.keys(WEAPONS);
    for (let i = 0; i < keys.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * cellW;
      const y = startY + row * cellH;

      if (this._mouseX >= x && this._mouseX <= x + cellW &&
        this._mouseY >= y && this._mouseY <= y + cellH) {
        this._selectWeapon(keys[i]);
        return;
      }
    }

    // Click outside closes
    this._weaponSelectOpen = false;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TITLE SCREEN
  // ───────────────────────────────────────────────────────────────────────────

  private _buildTitleButtons(): void {
    const cx = 0; // Will be computed relative to canvas in render
    this._titleButtons = [];

    // Team count buttons
    for (let i = 2; i <= 4; i++) {
      this._titleButtons.push({
        x: -120 + (i - 2) * 100,
        y: 80,
        w: 80,
        h: 45,
        text: `${i} Teams`,
        action: () => {
          this._teamCount = i;
          this._playSound('click');
        },
        hover: false,
      });
    }

    // Start button
    this._titleButtons.push({
      x: -100,
      y: 160,
      w: 200,
      h: 55,
      text: 'START BATTLE',
      action: () => {
        this._playSound('click');
        this._startGame();
      },
      hover: false,
    });

    // Back to menu
    this._titleButtons.push({
      x: -100,
      y: 240,
      w: 200,
      h: 45,
      text: 'BACK TO MENU',
      action: () => {
        this._playSound('click');
        window.dispatchEvent(new CustomEvent('worms2dExit'));
      },
      hover: false,
    });
  }

  private _checkTitleButtons(): void {
    const cx = this._canvas.width / 2;
    const cy = this._canvas.height / 2 - 40;

    for (const btn of this._titleButtons) {
      const bx = cx + btn.x;
      const by = cy + btn.y;
      if (this._mouseX >= bx && this._mouseX <= bx + btn.w &&
        this._mouseY >= by && this._mouseY <= by + btn.h) {
        btn.action();
        return;
      }
    }
  }

  private _startGame(): void {
    this._generateTerrain();
    this._createTeams();
    this._currentTeam = 0;
    this._currentWormIndex = 0;
    this._turnTimer = TURN_TIME;
    this._wind = randRange(-1, 1);
    this._turnNumber = 0;
    this._projectiles = [];
    this._particles = [];
    this._mines = [];
    this._airStrikes = [];
    this._currentWeapon = 'bazooka';

    this._phase = 'playing';
    this._aiActive = true;
    this._aiPhase = 'thinking';
    this._aiTimer = 0;

    // Focus camera on first worm
    const worm = this._getActiveWorm();
    if (worm) {
      this._camX = worm.x;
      this._camY = worm.y;
      this._camTargetX = worm.x;
      this._camTargetY = worm.y;
    }

    this._flashText = `${this._teams[0].name}: ${this._teams[0].worms[0].name}'s turn`;
    this._flashTimer = 2.0;
    this._playSound('turn');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VICTORY SCREEN
  // ───────────────────────────────────────────────────────────────────────────

  private _buildVictoryButtons(): void {
    this._victoryButtons = [
      {
        x: -100,
        y: 120,
        w: 200,
        h: 50,
        text: 'PLAY AGAIN',
        action: () => {
          this._playSound('click');
          this._startGame();
        },
        hover: false,
      },
      {
        x: -100,
        y: 190,
        w: 200,
        h: 50,
        text: 'MENU',
        action: () => {
          this._playSound('click');
          this._phase = 'title';
          this._buildTitleButtons();
        },
        hover: false,
      },
    ];
  }

  private _checkVictoryButtons(): void {
    const cx = this._canvas.width / 2;
    const cy = this._canvas.height / 2 - 40;

    for (const btn of this._victoryButtons) {
      const bx = cx + btn.x;
      const by = cy + btn.y;
      if (this._mouseX >= bx && this._mouseX <= bx + btn.w &&
        this._mouseY >= by && this._mouseY <= by + btn.h) {
        btn.action();
        return;
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────

  private _render(): void {
    const ctx = this._ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (this._phase === 'title') {
      this._renderTitleScreen(ctx, w, h);
      return;
    }

    // Apply camera transform
    ctx.save();

    // Screen shake
    let shakeX = 0;
    let shakeY = 0;
    if (this._shakeTime > 0) {
      shakeX = (Math.random() - 0.5) * this._shakeAmount * 2;
      shakeY = (Math.random() - 0.5) * this._shakeAmount * 2;
    }

    ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
    ctx.scale(this._camZoom, this._camZoom);
    ctx.translate(-this._camX, -this._camY);

    // Draw background (with parallax)
    this._renderBackground(ctx);

    // Draw clouds (animated)
    this._renderClouds(ctx);

    // Draw terrain
    ctx.drawImage(this._terrainCanvas, 0, 0);

    // Draw mines
    this._renderMines(ctx);

    // Draw worms
    this._renderWorms(ctx);

    // Draw projectiles
    this._renderProjectiles(ctx);

    // Draw particles
    this._renderParticles(ctx);

    // Draw rope
    if (this._rope.active) {
      this._renderRope(ctx);
    }

    // Draw water
    this._renderWater(ctx);

    // Draw girder preview
    if (this._placingGirder) {
      this._renderGirderPreview(ctx);
    }

    ctx.restore();

    // HUD (screen space)
    this._renderHUD(ctx, w, h);

    // Weapon select overlay
    if (this._weaponSelectOpen) {
      this._renderWeaponSelect(ctx, w, h);
    }

    // Victory screen
    if (this._phase === 'victory') {
      this._renderVictoryScreen(ctx, w, h);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TITLE SCREEN RENDER
  // ───────────────────────────────────────────────────────────────────────────

  private _renderTitleScreen(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Background
    const bgScale = w / TERRAIN_WIDTH;
    ctx.save();
    ctx.scale(bgScale, bgScale * (h / TERRAIN_HEIGHT));
    ctx.drawImage(this._bgCanvas, 0, 0);
    ctx.restore();

    // Animated clouds
    ctx.save();
    ctx.scale(bgScale, bgScale);
    for (const cloud of this._clouds) {
      ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity * 0.5})`;
      this._drawCloud(ctx, cloud.x, cloud.y, cloud.width, cloud.height, cloud.bumps);
    }
    ctx.restore();

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 - 40;

    // Title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Glowing title effect
    const glow = Math.sin(this._gameTime * 2) * 5 + 5;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20 + glow;
    ctx.font = 'bold 72px serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('WORMS 2D', cx, cy - 120);

    ctx.shadowBlur = 0;
    ctx.font = 'italic 24px serif';
    ctx.fillStyle = '#ddc080';
    ctx.fillText('A Camelot Artillery Battle', cx, cy - 70);

    // Decorative line
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 200, cy - 45);
    ctx.lineTo(cx + 200, cy - 45);
    ctx.stroke();

    // Team count label
    ctx.font = '18px serif';
    ctx.fillStyle = '#ccaa66';
    ctx.fillText('Choose Teams:', cx, cy + 60);

    // Buttons
    for (const btn of this._titleButtons) {
      const bx = cx + btn.x;
      const by = cy + btn.y;

      // Hover detection
      btn.hover = this._mouseX >= bx && this._mouseX <= bx + btn.w &&
        this._mouseY >= by && this._mouseY <= by + btn.h;

      // Team count buttons - highlight selected
      const isTeamBtn = btn.text.includes('Teams');
      const isSelected = isTeamBtn && btn.text.startsWith(`${this._teamCount}`);

      // Draw button
      const grad = ctx.createLinearGradient(bx, by, bx, by + btn.h);
      if (isSelected) {
        grad.addColorStop(0, '#886622');
        grad.addColorStop(1, '#664411');
      } else if (btn.hover) {
        grad.addColorStop(0, '#554422');
        grad.addColorStop(1, '#443311');
      } else {
        grad.addColorStop(0, '#332211');
        grad.addColorStop(1, '#221100');
      }
      ctx.fillStyle = grad;
      ctx.strokeStyle = isSelected ? '#ffd700' : (btn.hover ? '#ccaa44' : '#886633');
      ctx.lineWidth = isSelected ? 2 : 1;

      this._roundRect(ctx, bx, by, btn.w, btn.h, 8);
      ctx.fill();
      ctx.stroke();

      // Button text
      ctx.fillStyle = btn.hover || isSelected ? '#ffd700' : '#ccaa66';
      ctx.font = btn.text === 'START BATTLE' ? 'bold 22px serif' : '16px serif';
      ctx.fillText(btn.text, bx + btn.w / 2, by + btn.h / 2);
    }

    ctx.restore();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BACKGROUND RENDER
  // ───────────────────────────────────────────────────────────────────────────

  private _renderBackground(ctx: CanvasRenderingContext2D): void {
    // Draw the pre-rendered background with slight parallax
    const parallaxX = this._camX * 0.3;
    const parallaxY = this._camY * 0.3;

    ctx.save();
    ctx.translate(parallaxX, parallaxY);

    // Draw scaled to fill view
    ctx.drawImage(this._bgCanvas, -parallaxX, -parallaxY);

    // Animated stars twinkling
    for (const star of this._stars) {
      const alpha = 0.3 + 0.7 * Math.abs(Math.sin(this._gameTime * star.twinkleSpeed + star.twinkleOffset));
      ctx.fillStyle = `rgba(255, 255, 240, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x - parallaxX, star.y - parallaxY, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CLOUDS RENDER
  // ───────────────────────────────────────────────────────────────────────────

  private _renderClouds(ctx: CanvasRenderingContext2D): void {
    for (const cloud of this._clouds) {
      // Animate
      cloud.x += cloud.speed * 0.016;
      if (cloud.x > TERRAIN_WIDTH + cloud.width) cloud.x = -cloud.width;

      // Parallax
      const px = cloud.x - this._camX * 0.1;
      const py = cloud.y - this._camY * 0.05;

      ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;
      this._drawCloud(ctx, px, py, cloud.width, cloud.height, cloud.bumps);
    }
  }

  private _drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, bumps: number[]): void {
    ctx.beginPath();
    const bumpWidth = w / bumps.length;
    for (let i = 0; i < bumps.length; i++) {
      const bx = x + i * bumpWidth + bumpWidth / 2;
      const by = y;
      const br = (bumpWidth / 2) * bumps[i];
      ctx.moveTo(bx + br, by);
      ctx.arc(bx, by - h * bumps[i] * 0.3, br, 0, Math.PI * 2);
    }
    // Fill bottom
    ctx.rect(x, y - h * 0.1, w, h * 0.5);
    ctx.fill();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WATER RENDER
  // ───────────────────────────────────────────────────────────────────────────

  private _renderWater(ctx: CanvasRenderingContext2D): void {
    const waterTop = TERRAIN_HEIGHT - WATER_LEVEL;

    // Water gradient
    const grad = ctx.createLinearGradient(0, waterTop, 0, TERRAIN_HEIGHT);
    grad.addColorStop(0, 'rgba(20, 80, 160, 0.7)');
    grad.addColorStop(0.3, 'rgba(15, 60, 130, 0.8)');
    grad.addColorStop(1, 'rgba(5, 20, 60, 0.95)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, waterTop, TERRAIN_WIDTH, WATER_LEVEL);

    // Wave pattern on top
    ctx.beginPath();
    ctx.moveTo(0, waterTop);
    for (let x = 0; x < TERRAIN_WIDTH; x += 4) {
      const waveY = waterTop + Math.sin((x + this._waterOffset) * 0.03) * 3 +
        Math.sin((x + this._waterOffset * 0.7) * 0.05) * 2;
      ctx.lineTo(x, waveY);
    }
    ctx.lineTo(TERRAIN_WIDTH, waterTop + 10);
    ctx.lineTo(0, waterTop + 10);
    ctx.closePath();

    const waveGrad = ctx.createLinearGradient(0, waterTop - 3, 0, waterTop + 10);
    waveGrad.addColorStop(0, 'rgba(100, 180, 255, 0.5)');
    waveGrad.addColorStop(1, 'rgba(20, 80, 160, 0.7)');
    ctx.fillStyle = waveGrad;
    ctx.fill();

    // Shimmer highlights
    ctx.save();
    for (let i = 0; i < 20; i++) {
      const sx = ((i * 173 + this._waterOffset * 0.5) % TERRAIN_WIDTH);
      const sy = waterTop + 3 + Math.sin(sx * 0.02 + this._gameTime) * 2;
      const shimmerAlpha = 0.3 + 0.2 * Math.sin(this._gameTime * 3 + i);
      ctx.fillStyle = `rgba(200, 230, 255, ${shimmerAlpha})`;
      ctx.fillRect(sx, sy, randRange(20, 60), 1);
    }
    ctx.restore();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WORM RENDERING
  // ───────────────────────────────────────────────────────────────────────────

  private _renderWorms(ctx: CanvasRenderingContext2D): void {
    for (const team of this._teams) {
      for (const worm of team.worms) {
        if (!worm.alive) continue;
        this._drawWorm(ctx, worm, team);
      }
    }
  }

  private _drawWorm(ctx: CanvasRenderingContext2D, worm: Worm, team: Team): void {
    ctx.save();
    ctx.translate(worm.x, worm.y);

    const isActive = this._getActiveWorm() === worm;
    const scale = worm.facing;

    // Frozen effect
    if (worm.frozen > 0) {
      ctx.globalAlpha = 0.7;
    }

    // Poisoned: green tint via overlay later
    ctx.save();
    ctx.scale(scale, 1);

    // === CAPE ===
    const capeWave = Math.sin(this._gameTime * 4 + worm.x * 0.1) * 3;
    ctx.fillStyle = team.color;
    ctx.beginPath();
    ctx.moveTo(-4, -18);
    ctx.quadraticCurveTo(-12 - capeWave, -8, -10 - capeWave * 1.5, 5);
    ctx.quadraticCurveTo(-8 - capeWave, 0, -4, -5);
    ctx.closePath();
    ctx.fill();

    // Cape highlight
    ctx.fillStyle = team.lightColor;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(-4, -18);
    ctx.quadraticCurveTo(-10 - capeWave * 0.5, -12, -8 - capeWave, -5);
    ctx.lineTo(-4, -10);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = worm.frozen > 0 ? 0.7 : 1.0;

    // === BODY (ARMORED TORSO) ===
    // Chainmail/plate body
    const bodyGrad = ctx.createLinearGradient(-8, -22, 8, 2);
    bodyGrad.addColorStop(0, '#aaaaaa');
    bodyGrad.addColorStop(0.5, '#888888');
    bodyGrad.addColorStop(1, '#666666');
    ctx.fillStyle = bodyGrad;
    this._roundRect(ctx, -7, -20, 14, 18, 3);
    ctx.fill();

    // Armor highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this._roundRect(ctx, -5, -19, 5, 16, 2);
    ctx.fill();

    // Belt
    ctx.fillStyle = '#553311';
    ctx.fillRect(-7, -4, 14, 3);
    ctx.fillStyle = '#886633';
    ctx.fillRect(-2, -5, 4, 5);

    // === LEGS ===
    const walkOffset = isActive && Math.abs(worm.vx) > 5 ? Math.sin(this._gameTime * 12) * 3 : 0;

    // Left leg
    ctx.fillStyle = '#555555';
    ctx.fillRect(-5, -2, 4, 10 + walkOffset);
    // Boot
    ctx.fillStyle = '#443322';
    ctx.fillRect(-6, 7 + walkOffset, 5, 4);

    // Right leg
    ctx.fillStyle = '#666666';
    ctx.fillRect(1, -2, 4, 10 - walkOffset);
    // Boot
    ctx.fillStyle = '#443322';
    ctx.fillRect(1, 7 - walkOffset, 5, 4);

    // === SHIELD (left side) ===
    ctx.save();
    ctx.translate(-10, -12);
    // Shield body
    const shieldGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 8);
    shieldGrad.addColorStop(0, team.lightColor);
    shieldGrad.addColorStop(1, team.darkColor);
    ctx.fillStyle = shieldGrad;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(6, -4);
    ctx.lineTo(6, 3);
    ctx.lineTo(0, 8);
    ctx.lineTo(-6, 3);
    ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ddddaa';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Cross on shield
    ctx.strokeStyle = '#ffdd88';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, 5);
    ctx.moveTo(-3, 0);
    ctx.lineTo(3, 0);
    ctx.stroke();
    ctx.restore();

    // === HEAD / GREAT HELM ===
    ctx.save();
    ctx.translate(0, -25);

    // Helm base (bucket shape)
    const helmGrad = ctx.createLinearGradient(-6, -8, 6, 8);
    helmGrad.addColorStop(0, '#cccccc');
    helmGrad.addColorStop(0.4, '#aaaaaa');
    helmGrad.addColorStop(1, '#777777');
    ctx.fillStyle = helmGrad;

    // Flat top helm
    ctx.beginPath();
    ctx.moveTo(-7, -6);
    ctx.lineTo(7, -6);
    ctx.lineTo(8, 6);
    ctx.lineTo(5, 8);
    ctx.lineTo(-5, 8);
    ctx.lineTo(-8, 6);
    ctx.closePath();
    ctx.fill();

    // Helm outline
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Visor slit
    ctx.fillStyle = '#222222';
    ctx.fillRect(-5, 0, 10, 2);

    // Rivets
    ctx.fillStyle = '#dddddd';
    const rivetPositions = [[-5, -4], [5, -4], [-6, 4], [6, 4]];
    for (const [rx, ry] of rivetPositions) {
      ctx.beginPath();
      ctx.arc(rx, ry, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes through visor
    if (isActive) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, 0, 2, 1.5);
      ctx.fillRect(2, 0, 2, 1.5);
    } else {
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(-3, 0, 2, 1.5);
      ctx.fillRect(2, 0, 2, 1.5);
    }

    // Plume/crest on top
    ctx.fillStyle = team.color;
    ctx.beginPath();
    ctx.moveTo(-2, -6);
    const plumeWave = Math.sin(this._gameTime * 3 + worm.x * 0.05);
    ctx.quadraticCurveTo(0, -16, 4 + plumeWave * 2, -14);
    ctx.quadraticCurveTo(2, -12, 3 + plumeWave, -10);
    ctx.quadraticCurveTo(1, -8, 2, -6);
    ctx.closePath();
    ctx.fill();

    // Plume highlight
    ctx.fillStyle = team.lightColor;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(-1, -6);
    ctx.quadraticCurveTo(0, -14, 3 + plumeWave, -12);
    ctx.quadraticCurveTo(1, -10, 1, -6);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = worm.frozen > 0 ? 0.7 : 1.0;

    ctx.restore(); // head

    // === WEAPON IN HAND ===
    if (isActive) {
      const weaponDef = WEAPONS[this._currentWeapon];
      if (weaponDef) {
        ctx.save();
        ctx.translate(6, -14);
        ctx.rotate(worm.aimAngle);

        // Simple weapon representation
        ctx.fillStyle = '#886644';
        ctx.fillRect(0, -2, 18, 3); // Staff/barrel

        // Weapon head
        if (this._currentWeapon === 'bazooka' || this._currentWeapon === 'mortar') {
          ctx.fillStyle = '#444444';
          ctx.fillRect(14, -3, 6, 5);
        } else if (this._currentWeapon === 'flaming_arrow') {
          ctx.fillStyle = '#ff6600';
          ctx.beginPath();
          ctx.moveTo(18, -1);
          ctx.lineTo(22, 0);
          ctx.lineTo(18, 1);
          ctx.closePath();
          ctx.fill();
        } else if (this._currentWeapon === 'shotgun') {
          ctx.fillStyle = '#555555';
          ctx.fillRect(12, -3, 8, 2);
          ctx.fillRect(12, 1, 8, 2);
        }

        ctx.restore();
      }
    }

    ctx.restore(); // facing scale

    // === FROZEN OVERLAY ===
    if (worm.frozen > 0) {
      ctx.fillStyle = 'rgba(150, 200, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(0, -10, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // === POISONED INDICATOR ===
    if (worm.poisoned > 0) {
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(0, -10, 12, 0, Math.PI * 2);
      ctx.fill();
      // Skull icon
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#00ff00';
      ctx.textAlign = 'center';
      ctx.fillText('☠', 0, -30);
    }

    // === HEALTH BAR ===
    const hpPct = worm.hp / worm.maxHp;
    const barW = 30;
    const barH = 4;
    const barY = -42;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2);

    const hpColor = hpPct > 0.5 ? '#44ff44' : hpPct > 0.25 ? '#ffaa00' : '#ff3333';
    ctx.fillStyle = hpColor;
    ctx.fillRect(-barW / 2, barY, barW * hpPct, barH);

    // === NAME LABEL ===
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = team.color;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeText(worm.name, 0, barY - 2);
    ctx.fillText(worm.name, 0, barY - 2);

    // === ACTIVE INDICATOR ===
    if (isActive) {
      const arrowY = -52 + Math.sin(this._gameTime * 5) * 3;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, arrowY);
      ctx.lineTo(-5, arrowY - 8);
      ctx.lineTo(5, arrowY - 8);
      ctx.closePath();
      ctx.fill();

      // Aim line
      if (this._phase === 'aiming' || this._phase === 'playing') {
        const aimLen = 50;
        const ax = Math.cos(worm.aimAngle) * worm.facing * aimLen;
        const ay = Math.sin(worm.aimAngle) * aimLen;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(worm.facing * 6, -14);
        ctx.lineTo(worm.facing * 6 + ax, -14 + ay);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PROJECTILE RENDERING
  // ───────────────────────────────────────────────────────────────────────────

  private _renderProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const proj of this._projectiles) {
      if (!proj.active) continue;

      // Trail
      if (proj.trail.length > 1) {
        ctx.save();
        for (let i = 1; i < proj.trail.length; i++) {
          const alpha = i / proj.trail.length;
          ctx.strokeStyle = `rgba(255, 200, 100, ${alpha * 0.5})`;
          ctx.lineWidth = alpha * 3;
          ctx.beginPath();
          ctx.moveTo(proj.trail[i - 1].x, proj.trail[i - 1].y);
          ctx.lineTo(proj.trail[i].x, proj.trail[i].y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Projectile body
      ctx.save();
      ctx.translate(proj.x, proj.y);
      ctx.rotate(proj.angle);

      const weapon = WEAPONS[proj.type];

      if (proj.type === 'dynamite') {
        // Draw dynamite stick
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(-8, -3, 16, 6);
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(-8, -4, 2, 8);
        // Fuse
        const fuseLeft = (proj.fuseTime! - proj.timer) / proj.fuseTime!;
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(8, -3);
        ctx.lineTo(8 + fuseLeft * 8, -6);
        ctx.stroke();
        // Spark
        if (Math.random() > 0.3) {
          ctx.fillStyle = '#ffaa00';
          ctx.beginPath();
          ctx.arc(8 + fuseLeft * 8, -6, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (proj.type === 'sheep') {
        // Draw sheep
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.arc(7, -2, 3, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(8, -3, 1, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        ctx.fillStyle = '#222222';
        ctx.fillRect(-4, 5, 2, 4);
        ctx.fillRect(2, 5, 2, 4);
      } else if (proj.type === 'holy_hand_grenade') {
        // Golden orb with cross
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#aa8800';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Cross
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, -8, 2, 5);
        ctx.fillRect(-3, -6, 6, 2);
        // Glow
        ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + Math.sin(this._gameTime * 10) * 0.2})`;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (proj.type === 'banana_bomb') {
        // Yellow banana shape
        ctx.fillStyle = '#ffee00';
        ctx.beginPath();
        ctx.arc(0, -3, 5, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#ccbb00';
        ctx.beginPath();
        ctx.arc(0, -3, 3, 0, Math.PI);
        ctx.fill();
      } else if (proj.type === 'freeze_blast') {
        // Blue-white crystal
        ctx.fillStyle = '#88ccff';
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 5);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(200, 230, 255, ${0.3 + Math.sin(this._gameTime * 8) * 0.2})`;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (proj.type === 'poison_strike') {
        // Green globe
        ctx.fillStyle = '#44cc44';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22ff22';
        ctx.beginPath();
        ctx.arc(-1, -1, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Default projectile
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-4, -3);
        ctx.lineTo(-4, 3);
        ctx.closePath();
        ctx.fill();

        // Glow
        ctx.fillStyle = 'rgba(255, 200, 50, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fuse countdown text for grenades
      if (proj.fuseTime !== undefined) {
        ctx.rotate(-proj.angle); // Unrotate for text
        const timeLeft = Math.ceil(proj.fuseTime - proj.timer);
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${timeLeft}`, 0, -12);
      }

      ctx.restore();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PARTICLE RENDERING
  // ───────────────────────────────────────────────────────────────────────────

  private _renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this._particles) {
      const alpha = p.life / p.maxLife;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);

      if (p.rotation !== undefined) {
        ctx.rotate(p.rotation);
      }

      switch (p.type) {
        case 'circle':
        case 'fire': {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'spark': {
          ctx.fillStyle = p.color;
          const len = Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.02 + 1;
          const angle = Math.atan2(p.vy, p.vx);
          ctx.rotate(angle);
          ctx.fillRect(-len, -p.size / 2, len * 2, p.size);
          break;
        }
        case 'smoke': {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.5;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'debris': {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          break;
        }
        case 'text': {
          ctx.font = `bold ${p.size}px sans-serif`;
          ctx.fillStyle = p.color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = 'rgba(0,0,0,0.5)';
          ctx.lineWidth = 2;
          ctx.strokeText(p.text || '', 0, 0);
          ctx.fillText(p.text || '', 0, 0);
          break;
        }
      }

      ctx.restore();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MINES RENDERING
  // ───────────────────────────────────────────────────────────────────────────

  private _renderMines(ctx: CanvasRenderingContext2D): void {
    for (const mine of this._mines) {
      ctx.save();
      ctx.translate(mine.x, mine.y);

      // Mine body
      ctx.fillStyle = '#444444';
      ctx.beginPath();
      ctx.arc(0, -3, 6, 0, Math.PI * 2);
      ctx.fill();

      // Spikes
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.fillStyle = '#555555';
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 4, -3 + Math.sin(a) * 4);
        ctx.lineTo(Math.cos(a) * 9, -3 + Math.sin(a) * 9);
        ctx.lineTo(Math.cos(a + 0.2) * 4, -3 + Math.sin(a + 0.2) * 4);
        ctx.closePath();
        ctx.fill();
      }

      // Blinking light
      const blink = Math.sin(this._gameTime * 4) > 0;
      ctx.fillStyle = blink ? '#ff0000' : '#880000';
      ctx.beginPath();
      ctx.arc(0, -3, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ROPE RENDERING
  // ───────────────────────────────────────────────────────────────────────────

  private _renderRope(ctx: CanvasRenderingContext2D): void {
    const worm = this._getActiveWorm();
    if (!worm) return;

    ctx.strokeStyle = '#886644';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this._rope.anchorX, this._rope.anchorY);
    ctx.lineTo(worm.x, worm.y - 10);
    ctx.stroke();

    // Anchor point
    ctx.fillStyle = '#666666';
    ctx.beginPath();
    ctx.arc(this._rope.anchorX, this._rope.anchorY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GIRDER PREVIEW
  // ───────────────────────────────────────────────────────────────────────────

  private _renderGirderPreview(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this._mouseWorldX, this._mouseWorldY);
    ctx.rotate(this._girderAngle);

    ctx.fillStyle = 'rgba(139, 90, 43, 0.5)';
    ctx.fillRect(-60, -6, 120, 12);

    // Cross pattern
    ctx.strokeStyle = 'rgba(100, 60, 20, 0.5)';
    ctx.lineWidth = 1;
    for (let x = -55; x < 55; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, -6);
      ctx.lineTo(x + 15, 6);
      ctx.moveTo(x + 15, -6);
      ctx.lineTo(x, 6);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // HUD RENDERING
  // ───────────────────────────────────────────────────────────────────────────

  private _renderHUD(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this._phase === 'title' || this._phase === 'victory') return;

    ctx.save();

    // ─── TOP BAR ───
    // Semi-transparent bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, 50);

    // Team health bars
    const barWidth = (w - 40) / this._teams.length;
    for (let t = 0; t < this._teams.length; t++) {
      const team = this._teams[t];
      const bx = 20 + t * barWidth;
      const by = 8;
      const bw = barWidth - 10;
      const bh = 14;

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      this._roundRect(ctx, bx, by, bw, bh, 4);
      ctx.fill();

      // Health
      const totalHp = team.worms.reduce((s, w) => s + Math.max(0, w.hp), 0);
      const maxHp = team.worms.length * WORM_HP;
      const pct = totalHp / maxHp;

      const hpGrad = ctx.createLinearGradient(bx, by, bx + bw * pct, by);
      hpGrad.addColorStop(0, team.color);
      hpGrad.addColorStop(1, team.lightColor);
      ctx.fillStyle = hpGrad;
      this._roundRect(ctx, bx, by, bw * pct, bh, 4);
      ctx.fill();

      // Border for active team
      if (t === this._currentTeam) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        this._roundRect(ctx, bx, by, bw, bh, 4);
        ctx.stroke();
      }

      // Team name
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${team.name} (${totalHp}HP)`, bx + bw / 2, by + bh / 2);
    }

    // ─── CURRENT WORM INFO ───
    const worm = this._getActiveWorm();
    if (worm) {
      const team = this._teams[this._currentTeam];

      // Worm name
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = team.color;
      ctx.fillText(`${team.name}: ${worm.name}`, 20, 30);
    }

    // ─── TURN TIMER ───
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const timerColor = this._turnTimer <= 5 ? '#ff3333' : this._turnTimer <= 15 ? '#ffaa00' : '#ffffff';
    ctx.fillStyle = timerColor;
    ctx.fillText(`${Math.ceil(this._turnTimer)}`, w / 2, 28);

    // ─── WIND INDICATOR ───
    const windX = w - 120;
    const windY = 30;

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.textAlign = 'center';
    ctx.fillText('Wind', windX, windY - 5);

    // Wind arrow
    const windLen = this._wind * 40;
    ctx.strokeStyle = this._wind > 0 ? '#66aaff' : '#ff6666';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(windX - windLen, windY + 10);
    ctx.lineTo(windX + windLen, windY + 10);
    ctx.stroke();

    // Arrowhead
    if (Math.abs(this._wind) > 0.05) {
      const dir = Math.sign(this._wind);
      ctx.beginPath();
      ctx.moveTo(windX + windLen, windY + 10);
      ctx.lineTo(windX + windLen - dir * 8, windY + 5);
      ctx.lineTo(windX + windLen - dir * 8, windY + 15);
      ctx.closePath();
      ctx.fill();
    }

    // ─── CURRENT WEAPON ───
    const weaponDef = WEAPONS[this._currentWeapon];
    if (weaponDef) {
      const wx = 20;
      const wy = h - 50;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this._roundRect(ctx, wx, wy, 180, 40, 6);
      ctx.fill();

      ctx.font = '20px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(weaponDef.icon, wx + 10, wy + 20);

      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(weaponDef.name, wx + 38, wy + 15);

      // Ammo
      const team = this._teams[this._currentTeam];
      let ammoText = '∞';
      if (weaponDef.ammo !== -1 && team) {
        const ammo = team.ammo.get(this._currentWeapon) ?? 0;
        ammoText = `${ammo}`;
      }
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText(`Ammo: ${ammoText}`, wx + 38, wy + 30);

      // Hint
      ctx.fillStyle = '#666666';
      ctx.fillText('E: Weapons', wx + 110, wy + 30);
    }

    // ─── POWER BAR ───
    if (this._charging) {
      const pbX = w / 2 - 100;
      const pbY = h - 80;
      const pbW = 200;
      const pbH = 16;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this._roundRect(ctx, pbX - 2, pbY - 2, pbW + 4, pbH + 4, 4);
      ctx.fill();

      // Power fill
      const powerGrad = ctx.createLinearGradient(pbX, pbY, pbX + pbW, pbY);
      powerGrad.addColorStop(0, '#44ff44');
      powerGrad.addColorStop(0.5, '#ffff00');
      powerGrad.addColorStop(1, '#ff3333');
      ctx.fillStyle = powerGrad;
      this._roundRect(ctx, pbX, pbY, pbW * this._power, pbH, 3);
      ctx.fill();

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`Power: ${Math.floor(this._power * 100)}%`, pbX + pbW / 2, pbY + pbH / 2 + 1);
    }

    // ─── CROSSHAIR ───
    if (this._phase === 'playing' || this._phase === 'aiming') {
      const cx = this._mouseX;
      const cy = this._mouseY;
      const cSize = 12 + Math.sin(this._crosshairPulse) * 2;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;

      // Cross lines
      ctx.beginPath();
      ctx.moveTo(cx - cSize, cy);
      ctx.lineTo(cx - 4, cy);
      ctx.moveTo(cx + 4, cy);
      ctx.lineTo(cx + cSize, cy);
      ctx.moveTo(cx, cy - cSize);
      ctx.lineTo(cx, cy - 4);
      ctx.moveTo(cx, cy + 4);
      ctx.lineTo(cx, cy + cSize);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = '#ff3333';
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // ─── MINIMAP ───
    this._renderMinimap(ctx, w, h);

    // ─── FLASH TEXT ───
    if (this._flashTimer > 0) {
      const flashAlpha = Math.min(1, this._flashTimer);
      ctx.globalAlpha = flashAlpha;
      ctx.font = 'bold 28px serif';
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(this._flashText, w / 2, h / 2 - 100);
      ctx.fillText(this._flashText, w / 2, h / 2 - 100);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MINIMAP
  // ───────────────────────────────────────────────────────────────────────────

  private _renderMinimap(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    const mmW = 180;
    const mmH = 70;
    const mmX = screenW - mmW - 15;
    const mmY = screenH - mmH - 15;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    this._roundRect(ctx, mmX, mmY, mmW, mmH, 4);
    ctx.fill();
    ctx.stroke();

    // Simplified terrain outline
    ctx.save();
    ctx.beginPath();
    this._roundRect(ctx, mmX, mmY, mmW, mmH, 4);
    ctx.clip();

    const scaleX = mmW / TERRAIN_WIDTH;
    const scaleY = mmH / TERRAIN_HEIGHT;

    // Draw rough terrain
    ctx.fillStyle = '#445533';
    ctx.beginPath();
    ctx.moveTo(mmX, mmY + mmH);
    for (let sx = 0; sx < mmW; sx += 2) {
      const worldX = Math.floor(sx / scaleX);
      const surfaceY = this._findSurfaceY(worldX);
      ctx.lineTo(mmX + sx, mmY + surfaceY * scaleY);
    }
    ctx.lineTo(mmX + mmW, mmY + mmH);
    ctx.closePath();
    ctx.fill();

    // Water
    ctx.fillStyle = 'rgba(30, 80, 150, 0.6)';
    ctx.fillRect(mmX, mmY + mmH - WATER_LEVEL * scaleY, mmW, WATER_LEVEL * scaleY);

    // Worm dots
    for (const team of this._teams) {
      for (const worm of team.worms) {
        if (!worm.alive) continue;
        ctx.fillStyle = team.color;
        ctx.beginPath();
        ctx.arc(mmX + worm.x * scaleX, mmY + worm.y * scaleY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Camera viewport rectangle
    const vpX = this._camX - (screenW / 2) / this._camZoom;
    const vpY = this._camY - (screenH / 2) / this._camZoom;
    const vpW = screenW / this._camZoom;
    const vpH = screenH / this._camZoom;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX + vpX * scaleX, mmY + vpY * scaleY, vpW * scaleX, vpH * scaleY);

    ctx.restore();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WEAPON SELECT RENDER
  // ───────────────────────────────────────────────────────────────────────────

  private _renderWeaponSelect(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.font = 'bold 28px serif';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText('Weapon Arsenal', w / 2, 45);

    const cols = 6;
    const cellW = 130;
    const cellH = 50;
    const startX = (w - cols * cellW) / 2;
    const startY = 80;

    const team = this._teams[this._currentTeam];
    const keys = Object.keys(WEAPONS);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const weapon = WEAPONS[key];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * cellW;
      const y = startY + row * cellH;

      // Check ammo
      let ammo = -1;
      if (weapon.ammo !== -1) {
        ammo = team ? (team.ammo.get(key) ?? 0) : 0;
      }
      const hasAmmo = ammo === -1 || ammo > 0;
      const isSelected = key === this._currentWeapon;

      // Hover check
      const hover = this._mouseX >= x && this._mouseX <= x + cellW &&
        this._mouseY >= y && this._mouseY <= y + cellH;

      // Cell background
      if (isSelected) {
        ctx.fillStyle = 'rgba(200, 170, 50, 0.3)';
      } else if (hover && hasAmmo) {
        ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
      } else {
        ctx.fillStyle = 'rgba(40, 40, 40, 0.3)';
      }
      this._roundRect(ctx, x + 2, y + 2, cellW - 4, cellH - 4, 4);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        this._roundRect(ctx, x + 2, y + 2, cellW - 4, cellH - 4, 4);
        ctx.stroke();
      }

      ctx.globalAlpha = hasAmmo ? 1 : 0.3;

      // Icon
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(weapon.icon, x + 6, y + cellH / 2);

      // Name
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(weapon.name, x + 28, y + 18);

      // Ammo
      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#aaaaaa';
      const ammoStr = ammo === -1 ? '∞' : `${ammo}`;
      ctx.fillText(`Ammo: ${ammoStr}  Dmg: ${weapon.damage}`, x + 28, y + 35);

      // Shortcut number
      if (i < 9) {
        ctx.font = '9px sans-serif';
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'right';
        ctx.fillText(`${i + 1}`, x + cellW - 8, y + 14);
      }

      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }

    // ESC hint
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.fillText('Click to select • ESC to close', w / 2, h - 30);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VICTORY SCREEN RENDER
  // ───────────────────────────────────────────────────────────────────────────

  private _renderVictoryScreen(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 - 40;

    // Victory text
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20;
    ctx.font = 'bold 48px serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('VICTORY!', cx, cy - 60);
    ctx.shadowBlur = 0;

    if (this._winningTeam >= 0) {
      const team = this._teams[this._winningTeam];
      ctx.font = 'bold 32px serif';
      ctx.fillStyle = team.color;
      ctx.fillText(`${team.name} Wins!`, cx, cy);
    } else {
      ctx.font = 'bold 32px serif';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('Draw!', cx, cy);
    }

    // Stats
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`Battle lasted ${this._turnNumber} turns`, cx, cy + 50);

    // Stats per team
    let statY = cy + 80;
    for (const team of this._teams) {
      const alive = team.worms.filter(w => w.alive).length;
      const totalHp = team.worms.reduce((s, w) => s + Math.max(0, w.hp), 0);
      ctx.fillStyle = team.color;
      ctx.font = '14px sans-serif';
      ctx.fillText(`${team.name}: ${alive}/4 alive, ${totalHp}HP remaining`, cx, statY);
      statY += 22;
    }

    // Buttons
    for (const btn of this._victoryButtons) {
      const bx = cx + btn.x;
      const by = cy + btn.y;

      btn.hover = this._mouseX >= bx && this._mouseX <= bx + btn.w &&
        this._mouseY >= by && this._mouseY <= by + btn.h;

      const grad = ctx.createLinearGradient(bx, by, bx, by + btn.h);
      if (btn.hover) {
        grad.addColorStop(0, '#554422');
        grad.addColorStop(1, '#443311');
      } else {
        grad.addColorStop(0, '#332211');
        grad.addColorStop(1, '#221100');
      }
      ctx.fillStyle = grad;
      ctx.strokeStyle = btn.hover ? '#ffd700' : '#886633';
      ctx.lineWidth = btn.hover ? 2 : 1;

      this._roundRect(ctx, bx, by, btn.w, btn.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = btn.hover ? '#ffd700' : '#ccaa66';
      ctx.font = 'bold 18px serif';
      ctx.fillText(btn.text, bx + btn.w / 2, by + btn.h / 2);
    }

    ctx.restore();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UTILITY DRAWING METHODS
  // ───────────────────────────────────────────────────────────────────────────

  private _roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
