// ---------------------------------------------------------------------------
// Mage Wars FPS – Complete self-contained game module
// ---------------------------------------------------------------------------

import * as THREE from "three";
import {
  WandDef, WAND_DEFS, MageClassDef, MAGE_CLASSES,
  VehicleDef, VEHICLE_DEFS, MapDef, MAP_DEFS, MW,
  MAP_VEHICLE_DEFS,
} from "./MageWarsConfig";
import type {
  RuneElement, RuneInventory, CraftedSpellDef,
  EnvSpellEntity, DragonRiderState, DragonTickInput,
  DuelMatchState, DuelLoadout,
} from "./MageWarsSystems";
import {
  // Spell Crafting
  createRuneInventory, craftSpell, computeSpellHit, getCraftedSpellDef,
  CRAFTED_SPELL_DEFS,
  // Environmental Spells
  createEnvSpellEntity, buildEnvSpellMesh, tickEnvSpellEntity,
  doesEnvSpellBlockProjectile,
  getEnvSpellDef, ENV_SPELL_DEFS,
  // Dragon Riding
  createDragonRider, buildDragonMesh, tickDragonRider,
  getDragonMountDef, DRAGON_MOUNT_DEFS,
  // Dueling Arena
  createDuelMatchState, tickDuelMatch, buildDuelArenaScene,
  getDuelArenaDef, DUEL_ARENA_DEFS,
  DUEL_MAX_SPELL_SLOTS,
  DUEL_COUNTDOWN_TIME, DUEL_ROUNDS_TO_WIN, DUEL_ROUND_TIME,
  createDefaultDuelLoadout,
} from "./MageWarsSystems";

// ---- State interfaces -----------------------------------------------------

interface MWPlayer {
  id: string;
  team: 0 | 1;
  classId: string;
  primaryWandId: string;
  secondaryWandId: string;
  heavyWandId: string;
  activeWandSlot: 0 | 1 | 2;
  hp: number; maxHp: number;
  mana: number; maxMana: number;
  manaRegen: number;
  armor: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  yaw: number; pitch: number;
  grounded: boolean;
  crouching: boolean;
  sprinting: boolean;
  alive: boolean;
  respawnTimer: number;
  ammo: [number, number, number];
  reloading: [boolean, boolean, boolean];
  reloadTimer: [number, number, number];
  abilityCooldown: number;
  kills: number; deaths: number; score: number;
  isAI: boolean;
  aiState: AIState;
  vehicleId: string | null;
  invisible: boolean;
  shieldHp: number;
  frozen: boolean;
  frozenTimer: number;
  mesh: THREE.Group | null;
  nameTag: THREE.Sprite | null;
  speed: number;
  // New fields
  spawnProtection: number;
  stamina: number;
  maxStamina: number;
  staminaRegenDelay: number;
  lastGroundedY: number;
  lastDamagers: Array<{id: string, time: number}>;
  assists: number;
  currentStreak: number;
  lastKillTime: number;
  spawnProtectionMesh: THREE.Mesh | null;
  // Spell crafting
  runeInventory: RuneInventory;
  craftedSpellCooldown: number;
  dotActive: boolean;
  dotDamage: number;
  dotTimer: number;
  dotOwnerId: string;
  stunned: boolean;
  stunTimer: number;
  slowed: boolean;
  slowTimer: number;
  slowFactor: number;
  blinded: boolean;
  blindTimer: number;
  // Dragon riding
  dragonState: DragonRiderState | null;
  // Environmental spells
  envSpellCooldown: number;
  activeEnvSpells: string[];   // ids of placed env entities
  selectedEnvSpellId: string;
  selectedCraftedSpellSlot: number;
  craftedSpellSlots: string[]; // crafted spell ids
}

interface AIState {
  targetId: string | null;
  reactionTimer: number;
  wanderTarget: { x: number; z: number } | null;
  repositionTimer: number;
  wantsFire: boolean;
  wantsVehicle: boolean;
  seekingVehicle: string | null;
  strafeDir: number;
}

interface MWVehicle {
  id: string;
  defId: string;
  team: 0 | 1 | -1;
  hp: number; maxHp: number;
  x: number; y: number; z: number;
  yaw: number; pitch: number;
  speed: number;
  driverId: string | null;
  passengers: string[];
  alive: boolean;
  respawnTimer: number;
  spawnX: number; spawnY: number; spawnZ: number;
  fireTimer: number;
  secondaryFireTimer: number;
  activeWeapon: 0 | 1;  // 0 = primary, 1 = secondary
  mesh: THREE.Group | null;
}

interface MWProjectile {
  id: string;
  ownerId: string;
  team: 0 | 1;
  x: number; y: number; z: number;
  dx: number; dy: number; dz: number;
  speed: number;
  damage: number;
  splashRadius: number;
  range: number;
  traveled: number;
  color: number;
  size: number;
  mesh: THREE.Mesh | null;
  fromVehicle: boolean;
}

interface KillFeedEntry {
  killer: string; victim: string; weapon: string; time: number;
  isAssist?: boolean;
}

interface CapturePoint {
  id: string; // "A", "B", "C"
  x: number; z: number;
  owner: -1 | 0 | 1; // -1 = neutral
  captureProgress: number; // 0-100, 50 = neutral
  tickTimer: number; // score tick timer
  ringMesh: THREE.Mesh | null;
  beamMesh: THREE.Mesh | null;
  flagMesh: THREE.Group | null;
}

interface FloatingText {
  text: string;
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  color: string;
  size: number;
}

enum MWPhase {
  MAIN_MENU = 0, CHAR_SELECT = 1, LOADOUT = 2, PLAYING = 3, PAUSED = 4, SCOREBOARD = 5, ROUND_END = 6, WARMUP = 7, ROYALE_PLAYING = 8,
  DUEL_MENU = 9, DUEL_SPELL_SELECT = 10, DUEL_PLAYING = 11, DUEL_ROUND_END = 12, DUEL_MATCH_END = 13,
  DRAGON_COMBAT = 14,
}

// ---- Mage Royale interfaces ------------------------------------------------

interface RoyaleScroll {
  id: string;
  x: number; y: number; z: number;
  wandId: string;
  picked: boolean;
  mesh: THREE.Group | null;
}

interface RoyaleArtifact {
  id: string;
  x: number; y: number; z: number;
  type: "hp_boost" | "mana_boost" | "speed_boost" | "damage_boost" | "shield";
  picked: boolean;
  mesh: THREE.Group | null;
}

interface RoyaleState {
  stormRadius: number;
  stormCenterX: number;
  stormCenterZ: number;
  stormDelay: number;
  stormMesh: THREE.Mesh | null;
  scrolls: RoyaleScroll[];
  artifacts: RoyaleArtifact[];
  playersAlive: number;
  placement: number;  // player's final placement
  stormShrinking: boolean;
  stormTargetX: number;
  stormTargetZ: number;
}

// ---- Visual-only interfaces -----------------------------------------------

interface VFXParticle {
  mesh: THREE.Mesh;
  vx: number; vy: number; vz: number;
  life: number; maxLife: number;
  gravity: boolean;
}

interface MuzzleFlash {
  mesh: THREE.Mesh;
  timer: number;
  maxTime: number;
}

interface TempVFX {
  mesh: THREE.Object3D;
  timer: number;
}

// ---- Helpers --------------------------------------------------------------

let _projIdCounter = 0;
function nextProjId(): string { return `p${_projIdCounter++}`; }

let _vehIdCounter = 0;
function nextVehId(): string { return `v${_vehIdCounter++}`; }

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v; }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function dist3(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  const dx = ax - bx, dy = ay - by, dz = az - bz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx, dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

function getWandDef(id: string): WandDef {
  return WAND_DEFS.find(w => w.id === id) || WAND_DEFS[0];
}
function getClassDef(id: string): MageClassDef {
  return MAGE_CLASSES.find(c => c.id === id) || MAGE_CLASSES[0];
}
function getVehicleDef(id: string): VehicleDef {
  return VEHICLE_DEFS.find(v => v.id === id) || MAP_VEHICLE_DEFS.find(v => v.id === id) || VEHICLE_DEFS[0];
}
function getMapDef(id: string): MapDef {
  return MAP_DEFS.find(m => m.id === id) || MAP_DEFS[0];
}

function getTerrainHeight(x: number, z: number, mapDef: MapDef): number {
  const a = mapDef.hillAmplitude;
  const f = mapDef.hillFrequency;
  return Math.sin(x * f) * a * 0.6 +
    Math.cos(z * f * 1.3) * a * 0.4 +
    Math.sin((x + z) * f * 0.7) * a * 0.3;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function brightenColor(color: number, factor: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) * factor) | 0;
  const g = Math.min(255, ((color >> 8) & 0xff) * factor) | 0;
  const b = Math.min(255, (color & 0xff) * factor) | 0;
  return (r << 16) | (g << 8) | b;
}

function darkenColor(color: number, factor: number): number {
  const r = (((color >> 16) & 0xff) * factor) | 0;
  const g = (((color >> 8) & 0xff) * factor) | 0;
  const b = ((color & 0xff) * factor) | 0;
  return (r << 16) | (g << 8) | b;
}

const AI_NAMES = [
  "Gandren", "Morgath", "Thalia", "Keldris", "Seraphine", "Volthar", "Elowen",
  "Drakken", "Nyvara", "Arcturus", "Fenwick", "Isolde", "Corvath", "Lunara",
  "Bramwell", "Zephyra", "Orinthal", "Vexia", "Tormund", "Celestia",
];


// ---- Player factory -------------------------------------------------------

function createPlayer(
  id: string, team: 0 | 1, classId: string, isAI: boolean,
  px: number, pz: number, mapDef: MapDef,
): MWPlayer {
  const cls = getClassDef(classId);
  const py = getTerrainHeight(px, pz, mapDef) + 0.01;
  return {
    id, team, classId,
    primaryWandId: cls.defaultPrimary,
    secondaryWandId: cls.defaultSecondary,
    heavyWandId: "meteor_launcher",
    activeWandSlot: 0,
    hp: cls.hp, maxHp: cls.hp,
    mana: cls.mana, maxMana: cls.mana,
    manaRegen: cls.manaRegen,
    armor: cls.armor,
    x: px, y: py, z: pz,
    vx: 0, vy: 0, vz: 0,
    yaw: team === 0 ? 0 : Math.PI,
    pitch: 0,
    grounded: true, crouching: false, sprinting: false,
    alive: true, respawnTimer: 0,
    ammo: [
      getWandDef(cls.defaultPrimary).magPerReload,
      getWandDef(cls.defaultSecondary).magPerReload,
      getWandDef("meteor_launcher").magPerReload,
    ],
    reloading: [false, false, false],
    reloadTimer: [0, 0, 0],
    abilityCooldown: 0,
    kills: 0, deaths: 0, score: 0,
    isAI,
    aiState: {
      targetId: null, reactionTimer: 0,
      wanderTarget: null, repositionTimer: MW.AI_REPOSITION_TIME,
      wantsFire: false, wantsVehicle: false, seekingVehicle: null, strafeDir: 1,
    },
    vehicleId: null,
    invisible: false, shieldHp: 0,
    frozen: false, frozenTimer: 0,
    mesh: null, nameTag: null,
    speed: cls.speed,
    // New fields
    spawnProtection: 0,
    stamina: MW.STAMINA_MAX,
    maxStamina: MW.STAMINA_MAX,
    staminaRegenDelay: 0,
    lastGroundedY: py,
    lastDamagers: [],
    assists: 0,
    currentStreak: 0,
    lastKillTime: 0,
    spawnProtectionMesh: null,
    // Spell crafting
    runeInventory: createRuneInventory(),
    craftedSpellCooldown: 0,
    dotActive: false, dotDamage: 0, dotTimer: 0, dotOwnerId: "",
    stunned: false, stunTimer: 0,
    slowed: false, slowTimer: 0, slowFactor: 1,
    blinded: false, blindTimer: 0,
    // Dragon riding
    dragonState: null,
    // Environmental spells
    envSpellCooldown: 0,
    activeEnvSpells: [],
    selectedEnvSpellId: "env_ice_wall",
    selectedCraftedSpellSlot: 0,
    craftedSpellSlots: [],
  };
}

// ---- Vehicle factory ------------------------------------------------------

function createVehicle(defId: string, team: 0 | 1 | -1, x: number, z: number, mapDef: MapDef): MWVehicle {
  const def = getVehicleDef(defId);
  const y = def.type === "ground" ? getTerrainHeight(x, z, mapDef) + def.scaleY * 0.5 :
    def.altitude;
  return {
    id: nextVehId(), defId, team,
    hp: def.hp, maxHp: def.hp,
    x, y, z, yaw: 0, pitch: 0, speed: 0,
    driverId: null, passengers: [],
    alive: true, respawnTimer: 0,
    spawnX: x, spawnY: y, spawnZ: z,
    fireTimer: 0, secondaryFireTimer: 0, activeWeapon: 0, mesh: null,
  };
}


// ===========================================================================
// MAIN CLASS
// ===========================================================================

export class MageWarsGame {
  // ---- Three.js core ------
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _canvas!: HTMLCanvasElement;

  // ---- Game state ---------
  private _phase: MWPhase = MWPhase.MAIN_MENU;
  private _players: MWPlayer[] = [];
  private _vehicles: MWVehicle[] = [];
  private _projectiles: MWProjectile[] = [];
  private _killFeed: KillFeedEntry[] = [];
  private _teamScores: [number, number] = [0, 0];
  private _matchTimer = MW.MATCH_TIME;
  private _mapId = "enchanted_forest";
  private _selectedClassId = "battlemage";
  private _selectedPrimary = "arcane_bolt";
  private _selectedSecondary = "arcane_pistol";
  private _selectedHeavy = "meteor_launcher";

  // ---- Capture points -----
  private _capturePoints: CapturePoint[] = [];

  // ---- Floating texts -----
  private _floatingTexts: FloatingText[] = [];

  // ---- Custom match settings -----
  private _customTeamSize = MW.TEAM_SIZE;
  private _customTimeLimit = MW.MATCH_TIME;
  private _customScoreLimit = MW.SCORE_TO_WIN;

  // ---- Match options -----
  private _optFriendlyFire = false;
  private _optVehiclesEnabled = true;
  private _optAbilitiesEnabled = true;
  private _optHeadshotsEnabled = true;
  private _optFallDamage = true;
  private _optCapturePoints = true;

  // ---- Warmup -----
  private _warmupTimer = 0;
  private _warmupCountdownDiv: HTMLDivElement | null = null;

  // ---- Mage Royale -----
  private _royaleState: RoyaleState | null = null;
  private _isRoyaleMode = false;

  // ---- Spell Crafting -----
  /** Whether the rune selection wheel is currently open */
  _runeSelectOpen = false;

  // ---- Environmental Spells -----
  private _envSpellEntities: EnvSpellEntity[] = [];

  // ---- Dragon Riding -----
  private _dragonRiders: DragonRiderState[] = [];
  private _isDragonMode = false;

  // ---- Dueling Arena -----
  private _duelState: DuelMatchState | null = null;
  private _isDuelMode = false;
  private _duelArenaId = "arena_stone_circle";
  private _duelArenaGroup: THREE.Group | null = null;
  private _duelOpponentClassId = "pyromancer";
  private _selectedDuelLoadout: DuelLoadout | null = null;

  // ---- Loop ---------------
  private _rafId = 0;
  private _lastTime = 0;
  private _simAccum = 0;

  // ---- Input state --------
  private _keys: Record<string, boolean> = {};
  private _mouseDown = false;
  private _mouseRightDown = false;
  private _pointerLocked = false;
  private _mouseDX = 0;
  private _mouseDY = 0;
  private _wantReload = false;
  private _wantAbility = false;
  private _wantInteract = false;
  private _wantWeaponSwitch = false;
  private _wantSlot = -1;

  // ---- HUD / UI -----------
  private _hudDiv: HTMLDivElement | null = null;
  private _menuDiv: HTMLDivElement | null = null;
  private _minimapCanvas: HTMLCanvasElement | null = null;
  private _minimapCtx: CanvasRenderingContext2D | null = null;
  private _hitMarkerTimer = 0;
  private _damageVignetteTimer = 0;
  private _fireTimer = 0;

  // ---- Scene objects ------
  private _sunLight!: THREE.DirectionalLight;
  private _propGroup!: THREE.Group;
  private _waterMesh: THREE.Mesh | null = null;

  // ---- VFX state (visual-only) ------
  private _particles: VFXParticle[] = [];
  private _muzzleFlashes: MuzzleFlash[] = [];
  private _tempVFX: TempVFX[] = [];
  private _projectileTrails: Map<string, THREE.Mesh> = new Map();
  private _projectileLights: Map<string, THREE.PointLight> = new Map();
  private _playerLights: Map<string, THREE.PointLight> = new Map();
  private _ambientParticles: VFXParticle[] = [];
  private _fpWand: THREE.Group | null = null;
  private _fpWandRecoil = 0;
  private _fpWandBob = 0;
  private _fpWandTipMesh: THREE.Mesh | null = null;
  private _shieldMeshes: Map<string, THREE.Mesh> = new Map();
  private _frozenLights: Map<string, THREE.PointLight> = new Map();
  private _lastDamageDir: { x: number; z: number; timer: number } = { x: 0, z: 0, timer: 0 };
  private _headshotTimer = 0;
  private _gameTime = 0;
  private _eliminatedTimer = 0;
  private _reloadFlashTimer = 0;
  private _abilityReadyTimer = 0;
  private _lastAbilityCooldown = 0;
  private _centerNotification: { text: string; color: string; timer: number; size: number } | null = null;

  // ---- Handlers (for cleanup) ----
  private _escHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private _mouseDownHandler: ((e: MouseEvent) => void) | null = null;
  private _mouseUpHandler: ((e: MouseEvent) => void) | null = null;
  private _mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private _pointerLockHandler: (() => void) | null = null;
  private _resizeHandler: (() => void) | null = null;
  private _wheelHandler: ((e: WheelEvent) => void) | null = null;

  // =====================================================================
  // BOOT / DESTROY
  // =====================================================================

  async boot(): Promise<void> {
    const pixiContainer = document.getElementById("pixi-container");
    if (pixiContainer) {
      for (const child of Array.from(pixiContainer.children)) {
        if (child.id !== "magewars-canvas" && child.id !== "magewars-hud") {
          (child as HTMLElement).style.display = "none";
        }
      }
    }

    this._initThreeJS();
    this._setupInputHandlers();

    this._escHandler = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      if (this._phase === MWPhase.PLAYING || this._phase === MWPhase.WARMUP || this._phase === MWPhase.ROYALE_PLAYING ||
          this._phase === MWPhase.DUEL_PLAYING || this._phase === MWPhase.DRAGON_COMBAT) {
        this._phase = MWPhase.PAUSED;
        document.exitPointerLock();
        this._showPauseMenu();
      } else if (this._phase === MWPhase.PAUSED) {
        this._resumeFromPause();
      } else if (this._phase === MWPhase.MAIN_MENU) {
        this._exit();
      }
    };
    window.addEventListener("keydown", this._escHandler);

    this._showMainMenu();
  }

  destroy(): void {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = 0;

    // Remove handlers
    if (this._escHandler) window.removeEventListener("keydown", this._escHandler);
    if (this._keyDownHandler) window.removeEventListener("keydown", this._keyDownHandler);
    if (this._keyUpHandler) window.removeEventListener("keyup", this._keyUpHandler);
    if (this._mouseDownHandler) this._canvas?.removeEventListener("mousedown", this._mouseDownHandler);
    if (this._mouseUpHandler) window.removeEventListener("mouseup", this._mouseUpHandler);
    if (this._mouseMoveHandler) document.removeEventListener("mousemove", this._mouseMoveHandler);
    if (this._pointerLockHandler) document.removeEventListener("pointerlockchange", this._pointerLockHandler);
    if (this._resizeHandler) window.removeEventListener("resize", this._resizeHandler);
    if (this._wheelHandler) this._canvas?.removeEventListener("wheel", this._wheelHandler);

    // Remove DOM
    this._removeMenu();
    if (this._warmupCountdownDiv?.parentNode) {
      this._warmupCountdownDiv.parentNode.removeChild(this._warmupCountdownDiv);
      this._warmupCountdownDiv = null;
    }
    if (this._hudDiv?.parentNode) this._hudDiv.parentNode.removeChild(this._hudDiv);
    if (this._canvas?.parentNode) this._canvas.parentNode.removeChild(this._canvas);

    // Dispose Three.js
    this._scene?.traverse((obj) => {
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
      const mat = (obj as THREE.Mesh).material;
      if (mat) {
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else (mat as THREE.Material).dispose();
      }
    });
    this._renderer?.dispose();

    // Show pixi elements again
    const pixiContainer = document.getElementById("pixi-container");
    if (pixiContainer) {
      for (const child of Array.from(pixiContainer.children)) {
        (child as HTMLElement).style.display = "";
      }
    }

    window.dispatchEvent(new Event("mageWarsExit"));
  }

  private _exit(): void {
    this.destroy();
  }


  // =====================================================================
  // THREE.JS INIT
  // =====================================================================

  private _initThreeJS(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this._canvas = document.createElement("canvas");
    this._canvas.id = "magewars-canvas";
    this._canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;";

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._canvas);

    this._renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.15;

    this._scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(MW.DEFAULT_FOV, w / h, 0.1, 500);
    this._camera.position.set(0, 5, 10);

    this._resizeHandler = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      this._renderer.setSize(nw, nh);
      this._camera.aspect = nw / nh;
      this._camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", this._resizeHandler);
  }

  // =====================================================================
  // SCENE BUILDING (per-map)
  // =====================================================================

  private _buildScene(mapDef: MapDef): void {
    while (this._scene.children.length > 0) {
      this._scene.remove(this._scene.children[0]);
    }

    // Clear VFX state
    this._particles = [];
    this._muzzleFlashes = [];
    this._tempVFX = [];
    this._projectileTrails.clear();
    this._projectileLights.clear();
    this._playerLights.clear();
    this._ambientParticles = [];
    this._shieldMeshes.clear();
    this._frozenLights.clear();
    if (this._fpWand) { this._fpWand = null; this._fpWandTipMesh = null; }

    // Fog
    this._scene.fog = new THREE.FogExp2(mapDef.fogColor, mapDef.fogDensity);
    this._scene.background = new THREE.Color(mapDef.skyHorizonColor);

    // Lighting
    const ambient = new THREE.AmbientLight(0x8090a8, mapDef.ambientIntensity);
    this._scene.add(ambient);

    const hemi = new THREE.HemisphereLight(mapDef.skyTopColor, mapDef.groundColor, 0.8);
    this._scene.add(hemi);

    this._sunLight = new THREE.DirectionalLight(mapDef.sunColor, mapDef.sunIntensity);
    this._sunLight.position.set(40, 60, 25);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(2048, 2048);
    this._sunLight.shadow.camera.near = 1;
    this._sunLight.shadow.camera.far = 300;
    this._sunLight.shadow.camera.left = -100;
    this._sunLight.shadow.camera.right = 100;
    this._sunLight.shadow.camera.top = 100;
    this._sunLight.shadow.camera.bottom = -100;
    this._sunLight.shadow.bias = -0.0005;
    this._scene.add(this._sunLight);
    this._scene.add(this._sunLight.target);

    const fill = new THREE.DirectionalLight(0x8aaecc, 0.3);
    fill.position.set(-30, 20, -15);
    this._scene.add(fill);

    // Sky dome
    this._addSkyDome(mapDef);

    // Terrain
    this._addTerrain(mapDef);

    // Water with wave displacement
    if (mapDef.waterLevel > -999) {
      const waterSegs = 64;
      const waterGeo = new THREE.PlaneGeometry(mapDef.size * 4, mapDef.size * 4, waterSegs, waterSegs);
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x2266aa, transparent: true, opacity: 0.55,
        roughness: 0.05, metalness: 0.4,
      });
      this._waterMesh = new THREE.Mesh(waterGeo, waterMat);
      this._waterMesh.rotation.x = -Math.PI / 2;
      this._waterMesh.position.y = mapDef.waterLevel;
      this._scene.add(this._waterMesh);

      // Foam ring around shoreline
      const foamGeo = new THREE.RingGeometry(mapDef.size * 0.8, mapDef.size * 0.85, 32);
      const foamMat = new THREE.MeshBasicMaterial({ color: 0xddeeee, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
      const foam = new THREE.Mesh(foamGeo, foamMat);
      foam.rotation.x = -Math.PI / 2;
      foam.position.y = mapDef.waterLevel + 0.02;
      this._scene.add(foam);

      // Caustic light patches under water
      const causticMat = new THREE.MeshBasicMaterial({ color: 0x66bbdd, transparent: true, opacity: 0.06, side: THREE.DoubleSide });
      const cRng = seededRandom(777);
      for (let ci = 0; ci < 8; ci++) {
        const causticGeo = new THREE.CircleGeometry(2 + cRng() * 4, 6);
        const caustic = new THREE.Mesh(causticGeo, causticMat);
        caustic.rotation.x = -Math.PI / 2;
        caustic.position.set((cRng() - 0.5) * mapDef.size, mapDef.waterLevel - 0.3, (cRng() - 0.5) * mapDef.size);
        this._scene.add(caustic);
      }
    } else {
      this._waterMesh = null;
    }

    // Props
    this._propGroup = new THREE.Group();
    this._scene.add(this._propGroup);
    this._addProps(mapDef);

    // Enhanced terrain decorations
    this._addGrassClumps(mapDef);
    this._addHorizonHills(mapDef);
    this._addCloudLayer(mapDef);
    this._addGodRays(mapDef);
    this._addMapSpecificDecor(mapDef);

    // Ambient particles
    this._spawnAmbientParticles(mapDef);

    // Spawn base structures
    this._buildSpawnBases(mapDef);

    // First-person wand
    this._buildFPWand();
  }

  private _buildSpawnBases(mapDef: MapDef): void {
    const spawnDist = mapDef.spawnDistance / 2;
    const teamColors = [0x4488ff, 0xff4444];
    const teamTints = [0x334466, 0x664433];

    for (let team = 0; team < 2; team++) {
      const sx = team === 0 ? -spawnDist : spawnDist;
      const sz = 0;
      const h = getTerrainHeight(sx, sz, mapDef);
      const group = new THREE.Group();

      // Stone platform
      const platGeo = new THREE.BoxGeometry(8, 0.3, 6);
      const platMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9 });
      const plat = new THREE.Mesh(platGeo, platMat);
      plat.position.set(0, 0.15, 0);
      plat.receiveShadow = true;
      group.add(plat);

      // Pillars
      const pillarGeo = new THREE.CylinderGeometry(0.4, 0.5, 4, 8);
      const pillarMat = new THREE.MeshStandardMaterial({ color: teamTints[team], roughness: 0.7 });
      const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
      leftPillar.position.set(-3, 2, 0);
      leftPillar.castShadow = true;
      group.add(leftPillar);
      const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
      rightPillar.position.set(3, 2, 0);
      rightPillar.castShadow = true;
      group.add(rightPillar);

      // Top slab (archway)
      const slabGeo = new THREE.BoxGeometry(7, 0.5, 1.2);
      const slabMat = new THREE.MeshStandardMaterial({ color: teamTints[team], roughness: 0.7 });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.set(0, 4.25, 0);
      slab.castShadow = true;
      group.add(slab);

      // Banner poles + flags
      for (const side of [-1, 1]) {
        const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 5, 4);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(side * 4.5, 2.5, 0);
        group.add(pole);

        const flagGeo = new THREE.BoxGeometry(1.2, 0.8, 0.05);
        const flagMat = new THREE.MeshStandardMaterial({ color: teamColors[team], roughness: 0.6, side: THREE.DoubleSide });
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(side * 4.5 + side * 0.7, 4.5, 0);
        group.add(flag);
      }

      // Torch lights with flame meshes
      for (const tx of [-3, 3]) {
        const torchLight = new THREE.PointLight(0xffaa44, 0.8, 10);
        torchLight.position.set(tx, 4.5, 0);
        group.add(torchLight);

        // Flame cone
        const flameGeo = new THREE.ConeGeometry(0.12, 0.4, 6);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8822, transparent: true, opacity: 0.8 });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(tx, 4.5, 0);
        group.add(flame);

        // Inner flame
        const innerFlameGeo = new THREE.ConeGeometry(0.06, 0.25, 4);
        const innerFlameMat = new THREE.MeshBasicMaterial({ color: 0xffee44 });
        const innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
        innerFlame.position.set(tx, 4.55, 0);
        group.add(innerFlame);

        // Ember particles (small spheres above)
        for (let ei = 0; ei < 3; ei++) {
          const emberGeo = new THREE.SphereGeometry(0.015, 4, 4);
          const emberMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.6 });
          const ember = new THREE.Mesh(emberGeo, emberMat);
          ember.position.set(tx + (Math.random() - 0.5) * 0.15, 4.7 + Math.random() * 0.3, (Math.random() - 0.5) * 0.15);
          group.add(ember);
        }
      }

      // Team insignia - runic circle on ground
      const insigniaGeo = new THREE.RingGeometry(1.5, 2.0, 16);
      const insigniaMat = new THREE.MeshBasicMaterial({ color: teamColors[team], transparent: true, opacity: 0.5, side: THREE.DoubleSide });
      const insignia = new THREE.Mesh(insigniaGeo, insigniaMat);
      insignia.rotation.x = -Math.PI / 2;
      insignia.position.set(0, 0.32, 0);
      group.add(insignia);

      // Inner rune ring
      const innerRingGeo = new THREE.RingGeometry(0.8, 1.0, 12);
      const innerRingMat = new THREE.MeshBasicMaterial({ color: teamColors[team], transparent: true, opacity: 0.3, side: THREE.DoubleSide });
      const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.position.set(0, 0.33, 0);
      group.add(innerRing);

      // Rune symbols (small glowing boxes along the ring)
      const runeGeo = new THREE.BoxGeometry(0.15, 0.01, 0.08);
      const runeMat = new THREE.MeshBasicMaterial({ color: teamColors[team], transparent: true, opacity: 0.6 });
      for (let ri = 0; ri < 8; ri++) {
        const angle = (ri / 8) * Math.PI * 2;
        const rune = new THREE.Mesh(runeGeo, runeMat);
        rune.position.set(Math.cos(angle) * 1.75, 0.33, Math.sin(angle) * 1.75);
        rune.rotation.y = angle;
        group.add(rune);
      }

      // Pillar top ornaments (small spheres)
      const ornGeo = new THREE.SphereGeometry(0.15, 6, 6);
      const ornMat = new THREE.MeshStandardMaterial({ color: teamColors[team], roughness: 0.3, metalness: 0.6 });
      const ornL = new THREE.Mesh(ornGeo, ornMat);
      ornL.position.set(-3, 4.2, 0);
      group.add(ornL);
      const ornR = new THREE.Mesh(ornGeo, ornMat);
      ornR.position.set(3, 4.2, 0);
      group.add(ornR);

      group.position.set(sx, h, sz);
      this._scene.add(group);
    }
  }

  private _addSkyDome(mapDef: MapDef): void {
    const skyGeo = new THREE.SphereGeometry(400, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const colors: number[] = [];
    const posAttr = skyGeo.attributes.position;
    const topC = new THREE.Color(mapDef.skyTopColor);
    const midC = new THREE.Color(mapDef.skyMidColor);
    const horC = new THREE.Color(mapDef.skyHorizonColor);

    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const t = clamp(y / 400, 0, 1);
      const col = new THREE.Color();
      if (t > 0.35) col.lerpColors(midC, topC, (t - 0.35) / 0.65);
      else col.lerpColors(horC, midC, t / 0.35);
      colors.push(col.r, col.g, col.b);
    }
    skyGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));

    const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false });
    this._scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Sun disc
    const sunGeo = new THREE.CircleGeometry(10, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffae0, fog: false });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(80, 140, 50).normalize().multiplyScalar(380);
    sun.lookAt(0, 0, 0);
    this._scene.add(sun);

    // Sun halo
    const haloGeo = new THREE.RingGeometry(10, 25, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffcc66, transparent: true, opacity: 0.18, side: THREE.DoubleSide, fog: false,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(sun.position);
    halo.lookAt(0, 0, 0);
    this._scene.add(halo);
  }

  private _addTerrain(mapDef: MapDef): void {
    const size = mapDef.size * 2;
    const segs = 128;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    const colors: number[] = [];
    const c1 = new THREE.Color(mapDef.groundColor);
    const c2 = new THREE.Color(mapDef.groundColor2);

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const h = getTerrainHeight(x, z, mapDef);
      posAttr.setY(i, h);
      const t = clamp((h / (mapDef.hillAmplitude + 0.1)) * 0.5 + 0.5, 0, 1);
      const col = new THREE.Color().lerpColors(c1, c2, t);
      colors.push(col.r, col.g, col.b);
    }

    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.9, metalness: 0,
    });
    const terrain = new THREE.Mesh(geo, mat);
    terrain.receiveShadow = true;
    this._scene.add(terrain);
  }

  private _addProps(mapDef: MapDef): void {
    const rng = seededRandom(42 + mapDef.id.length);
    const half = mapDef.size * 0.9;
    const spawnSafe = mapDef.spawnDistance * 0.15;

    const isSpawnArea = (x: number, z: number): boolean => {
      return (Math.abs(x) < spawnSafe + 5 && Math.abs(z) < spawnSafe + 5);
    };

    // Trees - multi-layered with roots, bark rings, and branch detail
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.3, 2.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 });
    const trunkDarkMat = new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 0.95 });

    for (let i = 0; i < mapDef.treeCount; i++) {
      const x = (rng() - 0.5) * 2 * half;
      const z = (rng() - 0.5) * 2 * half;
      if (isSpawnArea(x, z)) continue;
      const h = getTerrainHeight(x, z, mapDef);

      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.25;
      trunk.castShadow = true;
      tree.add(trunk);

      // Bark rings
      const barkRingGeo = new THREE.TorusGeometry(0.22, 0.03, 4, 8);
      for (let br = 0; br < 3; br++) {
        const ring = new THREE.Mesh(barkRingGeo, trunkDarkMat);
        ring.position.y = 0.5 + br * 0.7;
        ring.rotation.x = Math.PI / 2;
        tree.add(ring);
      }

      // Exposed roots
      const rootGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.8, 5);
      for (let r = 0; r < 3; r++) {
        const rootAngle = (r / 3) * Math.PI * 2 + rng() * 0.8;
        const root = new THREE.Mesh(rootGeo, trunkDarkMat);
        root.position.set(Math.cos(rootAngle) * 0.25, 0.15, Math.sin(rootAngle) * 0.25);
        root.rotation.z = Math.PI / 3 * (rng() > 0.5 ? 1 : -1);
        root.rotation.y = rootAngle;
        tree.add(root);
      }

      // Multi-layered foliage
      const leafColor = rng() > 0.5 ? mapDef.treeColor : mapDef.treeColor2;
      const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.8 });
      const leafLightMat = new THREE.MeshStandardMaterial({ color: brightenColor(leafColor, 1.2), roughness: 0.75 });

      // Lower wider cone
      const leafGeo1 = new THREE.ConeGeometry(1.8, 2.0, 8);
      const leaves1 = new THREE.Mesh(leafGeo1, leafMat);
      leaves1.position.y = 3.2;
      leaves1.castShadow = true;
      tree.add(leaves1);

      // Middle cone
      const leafGeo2 = new THREE.ConeGeometry(1.4, 2.2, 8);
      const leaves2 = new THREE.Mesh(leafGeo2, leafLightMat);
      leaves2.position.y = 4.3;
      leaves2.castShadow = true;
      tree.add(leaves2);

      // Top cone
      const leafGeo3 = new THREE.ConeGeometry(0.8, 1.5, 6);
      const leaves3 = new THREE.Mesh(leafGeo3, leafMat);
      leaves3.position.y = 5.3;
      leaves3.castShadow = true;
      tree.add(leaves3);

      tree.position.set(x, h, z);
      tree.scale.setScalar(0.7 + rng() * 0.6);
      this._propGroup.add(tree);
    }

    // Rocks - varied colors with moss patches
    const rockGeo = new THREE.DodecahedronGeometry(0.8, 1);
    const rockColors = [0x777777, 0x888880, 0x666655, 0x7a7a6a];

    for (let i = 0; i < mapDef.rockCount; i++) {
      const x = (rng() - 0.5) * 2 * half;
      const z = (rng() - 0.5) * 2 * half;
      if (isSpawnArea(x, z)) continue;
      const h = getTerrainHeight(x, z, mapDef);

      const rockGroup = new THREE.Group();
      const rockCol = rockColors[Math.floor(rng() * rockColors.length)];
      const rockMat = new THREE.MeshStandardMaterial({ color: rockCol, roughness: 0.95 });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.scale.set(0.5 + rng() * 1.5, 0.4 + rng() * 0.8, 0.5 + rng() * 1.5);
      rock.rotation.set(rng() * 0.5, rng() * Math.PI * 2, rng() * 0.5);
      rock.castShadow = true;
      rockGroup.add(rock);

      // Moss patches on larger rocks
      if (rng() > 0.4) {
        const mossGeo = new THREE.SphereGeometry(0.2 + rng() * 0.3, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const mossMat = new THREE.MeshStandardMaterial({ color: 0x446633, roughness: 0.95 });
        const moss = new THREE.Mesh(mossGeo, mossMat);
        moss.position.set((rng() - 0.5) * 0.3, 0.2 + rng() * 0.3, (rng() - 0.5) * 0.3);
        moss.rotation.set(rng() * 0.5, rng() * Math.PI, 0);
        rockGroup.add(moss);
      }

      // Small pebbles scattered around base
      if (rng() > 0.5) {
        const pebbleGeo = new THREE.DodecahedronGeometry(0.08, 0);
        const pebbleMat = new THREE.MeshStandardMaterial({ color: darkenColor(rockCol, 0.8), roughness: 1.0 });
        for (let pb = 0; pb < 2 + Math.floor(rng() * 3); pb++) {
          const pebble = new THREE.Mesh(pebbleGeo, pebbleMat);
          pebble.position.set((rng() - 0.5) * 1.5, -0.2, (rng() - 0.5) * 1.5);
          pebble.scale.setScalar(0.5 + rng());
          rockGroup.add(pebble);
        }
      }

      rockGroup.position.set(x, h + 0.3, z);
      this._propGroup.add(rockGroup);
    }

    // Bushes - multi-sphere clusters
    for (let i = 0; i < mapDef.bushCount; i++) {
      const x = (rng() - 0.5) * 2 * half;
      const z = (rng() - 0.5) * 2 * half;
      if (isSpawnArea(x, z)) continue;
      const h = getTerrainHeight(x, z, mapDef);

      const bushGroup = new THREE.Group();
      const bushScale = 0.5 + rng() * 1.0;
      const puffCount = 2 + Math.floor(rng() * 3);
      for (let p = 0; p < puffCount; p++) {
        const pSize = 0.3 + rng() * 0.4;
        const puffGeo = new THREE.SphereGeometry(pSize, 6, 5);
        const bushColor = rng() > 0.5 ? mapDef.treeColor : brightenColor(mapDef.treeColor, 1.15);
        const puffMat = new THREE.MeshStandardMaterial({ color: bushColor, roughness: 0.85 });
        const puff = new THREE.Mesh(puffGeo, puffMat);
        puff.position.set((rng() - 0.5) * 0.3, rng() * 0.2, (rng() - 0.5) * 0.3);
        bushGroup.add(puff);
      }
      bushGroup.position.set(x, h + 0.3, z);
      bushGroup.scale.setScalar(bushScale);
      this._propGroup.add(bushGroup);
    }
  }

  // ---- Enhanced terrain decorations ----

  private _addGrassClumps(mapDef: MapDef): void {
    const rng = seededRandom(100 + mapDef.id.length);
    const half = mapDef.size * 0.85;
    const grassColor = brightenColor(mapDef.groundColor2, 1.3);
    const grassMat = new THREE.MeshStandardMaterial({ color: grassColor, roughness: 0.9, side: THREE.DoubleSide });
    const count = Math.floor(mapDef.size * 1.5);

    for (let i = 0; i < count; i++) {
      const cx = (rng() - 0.5) * 2 * half;
      const cz = (rng() - 0.5) * 2 * half;
      const ch = getTerrainHeight(cx, cz, mapDef);
      const clump = new THREE.Group();

      const bladeCount = 3 + Math.floor(rng() * 3);
      for (let b = 0; b < bladeCount; b++) {
        const bx = (rng() - 0.5) * 0.4;
        const bz = (rng() - 0.5) * 0.4;
        const bladeH = 0.2 + rng() * 0.3;
        const verts = new Float32Array([
          bx - 0.02, 0, bz,
          bx + 0.02, 0, bz,
          bx + (rng() - 0.5) * 0.04, bladeH, bz + (rng() - 0.5) * 0.04,
        ]);
        const bladeGeo = new THREE.BufferGeometry();
        bladeGeo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
        bladeGeo.computeVertexNormals();
        const blade = new THREE.Mesh(bladeGeo, grassMat);
        clump.add(blade);
      }
      clump.position.set(cx, ch, cz);
      this._propGroup.add(clump);
    }
  }

  private _addHorizonHills(mapDef: MapDef): void {
    const hillGeo = new THREE.SphereGeometry(1, 8, 6);
    const hillColor = darkenColor(mapDef.groundColor, 0.6);
    const hillMat = new THREE.MeshStandardMaterial({ color: hillColor, roughness: 1.0 });
    const rng = seededRandom(200 + mapDef.id.length);

    // Inner ring
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + rng() * 0.3;
      const dist = mapDef.size * 1.3 + rng() * 20;
      const hill = new THREE.Mesh(hillGeo, hillMat);
      const sx = 15 + rng() * 20;
      const sy = 8 + rng() * 15;
      const sz = 15 + rng() * 20;
      hill.scale.set(sx, sy, sz);
      hill.position.set(Math.cos(angle) * dist, -sy * 0.3, Math.sin(angle) * dist);
      this._scene.add(hill);
    }

    // Outer ring
    const hillMat2 = new THREE.MeshStandardMaterial({ color: darkenColor(hillColor, 0.7), roughness: 1.0 });
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + rng() * 0.4;
      const d = mapDef.size * 1.8 + rng() * 30;
      const hill = new THREE.Mesh(hillGeo, hillMat2);
      const sx = 20 + rng() * 30;
      const sy = 12 + rng() * 25;
      const sz = 20 + rng() * 30;
      hill.scale.set(sx, sy, sz);
      hill.position.set(Math.cos(angle) * d, -sy * 0.3, Math.sin(angle) * d);
      this._scene.add(hill);
    }
  }

  private _addCloudLayer(_mapDef: MapDef): void {
    const rng = seededRandom(300);
    for (let i = 0; i < 16; i++) {
      const cloudGroup = new THREE.Group();
      const cx = (rng() - 0.5) * 350;
      const cy = 80 + rng() * 50;
      const cz = (rng() - 0.5) * 350;

      // Multi-puff volumetric cloud
      const puffCount = 3 + Math.floor(rng() * 4);
      for (let p = 0; p < puffCount; p++) {
        const size = 8 + rng() * 18;
        const puffGeo = new THREE.SphereGeometry(size, 8, 6);
        const opacity = 0.06 + rng() * 0.08;
        const puffMat = new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity, fog: false,
        });
        const puff = new THREE.Mesh(puffGeo, puffMat);
        puff.position.set(
          (rng() - 0.5) * size * 1.5,
          (rng() - 0.5) * size * 0.3,
          (rng() - 0.5) * size * 1.5,
        );
        puff.scale.set(1, 0.3 + rng() * 0.2, 1);
        cloudGroup.add(puff);
      }

      cloudGroup.position.set(cx, cy, cz);
      this._scene.add(cloudGroup);
    }
  }

  private _addGodRays(_mapDef: MapDef): void {
    // Multiple god rays for volumetric feel
    const rng = seededRandom(555);
    for (let i = 0; i < 4; i++) {
      const spreadAngle = (rng() - 0.5) * 0.6;
      const rayWidth = 15 + rng() * 25;
      const rayGeo = new THREE.ConeGeometry(rayWidth, 120, 6, 1, true);
      const rayMat = new THREE.MeshBasicMaterial({
        color: 0xfffae0, transparent: true, opacity: 0.02 + rng() * 0.02, side: THREE.DoubleSide, fog: false,
      });
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.position.set(80 + spreadAngle * 30, 80, 50 + spreadAngle * 20);
      ray.lookAt(spreadAngle * 30, 0, spreadAngle * 20);
      ray.rotateX(Math.PI / 2);
      this._scene.add(ray);
    }
  }

  private _addMapSpecificDecor(mapDef: MapDef): void {
    const rng = seededRandom(400 + mapDef.id.length);
    const half = mapDef.size * 0.85;

    if (mapDef.id === "enchanted_forest") {
      // Flowers
      const flowerColors = [0xff3333, 0xffff33, 0xaa33ff, 0xff66aa];
      for (let i = 0; i < 60; i++) {
        const fx = (rng() - 0.5) * 2 * half;
        const fz = (rng() - 0.5) * 2 * half;
        const fh = getTerrainHeight(fx, fz, mapDef);
        const stemGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x33aa22 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(fx, fh + 0.1, fz);
        this._propGroup.add(stem);

        const petalGeo = new THREE.SphereGeometry(0.04, 4, 4);
        const petalMat = new THREE.MeshStandardMaterial({ color: flowerColors[Math.floor(rng() * flowerColors.length)] });
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.position.set(fx, fh + 0.22, fz);
        this._propGroup.add(petal);
      }

      // Mushrooms
      for (let i = 0; i < 30; i++) {
        const mx = (rng() - 0.5) * 2 * half;
        const mz = (rng() - 0.5) * 2 * half;
        const mh = getTerrainHeight(mx, mz, mapDef);
        const stalkGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.15, 6);
        const stalkMat = new THREE.MeshStandardMaterial({ color: 0xddccaa });
        const stalk = new THREE.Mesh(stalkGeo, stalkMat);
        stalk.position.set(mx, mh + 0.075, mz);
        this._propGroup.add(stalk);

        const capGeo = new THREE.SphereGeometry(0.07, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const capMat = new THREE.MeshStandardMaterial({ color: rng() > 0.5 ? 0xcc2222 : 0xaa6622 });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(mx, mh + 0.15, mz);
        this._propGroup.add(cap);
      }

      // Fallen logs
      for (let i = 0; i < 10; i++) {
        const lx = (rng() - 0.5) * 2 * half;
        const lz = (rng() - 0.5) * 2 * half;
        const lh = getTerrainHeight(lx, lz, mapDef);
        const logGeo = new THREE.CylinderGeometry(0.15, 0.2, 2.5 + rng() * 2, 6);
        const logMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.95 });
        const log = new THREE.Mesh(logGeo, logMat);
        log.position.set(lx, lh + 0.1, lz);
        log.rotation.z = Math.PI / 2;
        log.rotation.y = rng() * Math.PI;
        this._propGroup.add(log);
      }
    }

    if (mapDef.id === "verdant_grasslands") {
      // Wildflower patches (clusters)
      const wildColors = [0xff9944, 0xffcc22, 0xffffff, 0xdd88cc, 0x88aaff];
      for (let i = 0; i < 40; i++) {
        const px = (rng() - 0.5) * 2 * half;
        const pz = (rng() - 0.5) * 2 * half;
        for (let f = 0; f < 3 + Math.floor(rng() * 4); f++) {
          const fx = px + (rng() - 0.5) * 1.5;
          const fz = pz + (rng() - 0.5) * 1.5;
          const fh = getTerrainHeight(fx, fz, mapDef);
          const stemGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.15 + rng() * 0.15, 3);
          const stemMat = new THREE.MeshStandardMaterial({ color: 0x44aa22 });
          const stem = new THREE.Mesh(stemGeo, stemMat);
          stem.position.set(fx, fh + 0.08, fz);
          this._propGroup.add(stem);
          const petalGeo = new THREE.SphereGeometry(0.03 + rng() * 0.02, 4, 4);
          const petalMat = new THREE.MeshStandardMaterial({ color: wildColors[Math.floor(rng() * wildColors.length)] });
          const petal = new THREE.Mesh(petalGeo, petalMat);
          petal.position.set(fx, fh + 0.18 + rng() * 0.05, fz);
          this._propGroup.add(petal);
        }
      }

      // Hay bales
      const hayGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 8);
      const hayMat = new THREE.MeshStandardMaterial({ color: 0xccaa55, roughness: 0.95 });
      for (let i = 0; i < 8; i++) {
        const hx = (rng() - 0.5) * 2 * half;
        const hz = (rng() - 0.5) * 2 * half;
        const hh = getTerrainHeight(hx, hz, mapDef);
        const hay = new THREE.Mesh(hayGeo, hayMat);
        hay.position.set(hx, hh + 0.3, hz);
        hay.rotation.z = Math.PI / 2;
        hay.rotation.y = rng() * Math.PI;
        hay.castShadow = true;
        this._propGroup.add(hay);
      }

      // Fence posts (small)
      for (let i = 0; i < 6; i++) {
        const fx = (rng() - 0.5) * 2 * half;
        const fz = (rng() - 0.5) * 2 * half;
        const fh = getTerrainHeight(fx, fz, mapDef);
        const postGeo = new THREE.BoxGeometry(0.08, 0.7, 0.08);
        const postMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 });
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(fx, fh + 0.35, fz);
        post.castShadow = true;
        this._propGroup.add(post);
        // Horizontal rail
        const railGeo = new THREE.BoxGeometry(0.04, 0.04, 1.5);
        const rail = new THREE.Mesh(railGeo, postMat);
        rail.position.set(fx, fh + 0.5, fz + 0.75);
        this._propGroup.add(rail);
      }
    }

    if (mapDef.id === "mystic_hills") {
      // Standing stones with runic carvings
      for (let i = 0; i < 15; i++) {
        const sx = (rng() - 0.5) * 2 * half;
        const sz = (rng() - 0.5) * 2 * half;
        const sh = getTerrainHeight(sx, sz, mapDef);
        const stoneH = 1.5 + rng() * 3;
        const stoneGeo = new THREE.BoxGeometry(0.3 + rng() * 0.3, stoneH, 0.2 + rng() * 0.2);
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.9 });
        const stone = new THREE.Mesh(stoneGeo, stoneMat);
        stone.position.set(sx, sh + stoneH * 0.5, sz);
        stone.rotation.y = rng() * Math.PI;
        stone.rotation.z = (rng() - 0.5) * 0.15;
        stone.castShadow = true;
        this._propGroup.add(stone);

        // Glowing rune mark on front of stone
        if (rng() > 0.4) {
          const runeGeo = new THREE.BoxGeometry(0.1, 0.15, 0.01);
          const runeMat = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.4 });
          const runeM = new THREE.Mesh(runeGeo, runeMat);
          runeM.position.set(sx, sh + stoneH * 0.5, sz - 0.12);
          this._propGroup.add(runeM);
        }
      }

      // Stone circles (ring arrangements)
      for (let c = 0; c < 2; c++) {
        const cx = (rng() - 0.5) * half;
        const cz = (rng() - 0.5) * half;
        const radius = 3 + rng() * 2;
        const count = 5 + Math.floor(rng() * 4);
        for (let si = 0; si < count; si++) {
          const angle = (si / count) * Math.PI * 2;
          const ssx = cx + Math.cos(angle) * radius;
          const ssz = cz + Math.sin(angle) * radius;
          const ssh = getTerrainHeight(ssx, ssz, mapDef);
          const pillarH = 0.5 + rng() * 1.5;
          const pillarGeo = new THREE.BoxGeometry(0.2, pillarH, 0.2);
          const pillarMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.9 });
          const pillar = new THREE.Mesh(pillarGeo, pillarMat);
          pillar.position.set(ssx, ssh + pillarH * 0.5, ssz);
          pillar.castShadow = true;
          this._propGroup.add(pillar);
        }
      }

      // Mist patches - denser, layered
      for (let i = 0; i < 25; i++) {
        const mx = (rng() - 0.5) * 2 * half;
        const mz = (rng() - 0.5) * 2 * half;
        const mh = getTerrainHeight(mx, mz, mapDef);
        const mistGeo = new THREE.SphereGeometry(3 + rng() * 5, 8, 6);
        const mistMat = new THREE.MeshBasicMaterial({
          color: 0xccccdd, transparent: true, opacity: 0.06 + rng() * 0.04,
        });
        const mist = new THREE.Mesh(mistGeo, mistMat);
        mist.position.set(mx, mh + 0.3 + rng() * 0.5, mz);
        mist.scale.set(1, 0.25, 1);
        this._propGroup.add(mist);
      }
    }

    // ---- NEW MAP DECORATIONS ----

    // Ancient Ruins: broken columns, crumbling walls, fallen statues, stone archways
    if (mapDef.id === "ancient_ruins") {
      // Broken columns
      for (let i = 0; i < 25; i++) {
        const cx = (rng() - 0.5) * 2 * half;
        const cz = (rng() - 0.5) * 2 * half;
        const ch = getTerrainHeight(cx, cz, mapDef);
        const colH = 0.5 + rng() * 2.5;
        const colGeo = new THREE.CylinderGeometry(0.25 + rng() * 0.1, 0.3 + rng() * 0.1, colH, 8);
        const colMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.9 });
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(cx, ch + colH * 0.5, cz);
        col.rotation.z = (rng() - 0.5) * 0.3;
        col.castShadow = true;
        this._propGroup.add(col);
        // Column cap
        if (rng() > 0.4) {
          const capGeo = new THREE.BoxGeometry(0.5, 0.1, 0.5);
          const cap = new THREE.Mesh(capGeo, colMat);
          cap.position.set(cx, ch + colH + 0.05, cz);
          this._propGroup.add(cap);
        }
      }
      // Crumbling walls
      for (let i = 0; i < 15; i++) {
        const wx = (rng() - 0.5) * 2 * half;
        const wz = (rng() - 0.5) * 2 * half;
        const wh = getTerrainHeight(wx, wz, mapDef);
        const wallH = 1 + rng() * 2;
        const wallW = 2 + rng() * 3;
        const wallGeo = new THREE.BoxGeometry(wallW, wallH, 0.3);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.95 });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(wx, wh + wallH * 0.5, wz);
        wall.rotation.y = rng() * Math.PI;
        wall.castShadow = true;
        this._propGroup.add(wall);
      }
      // Fallen statues
      for (let i = 0; i < 6; i++) {
        const sx = (rng() - 0.5) * 2 * half;
        const sz = (rng() - 0.5) * 2 * half;
        const sh = getTerrainHeight(sx, sz, mapDef);
        const statGroup = new THREE.Group();
        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.2, 6);
        const statMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8 });
        const body = new THREE.Mesh(bodyGeo, statMat);
        body.position.y = 0.3;
        statGroup.add(body);
        // Head (detached, nearby)
        const headGeo2 = new THREE.SphereGeometry(0.2, 6, 6);
        const headM = new THREE.Mesh(headGeo2, statMat);
        headM.position.set(0.5, 0.15, 0.3);
        statGroup.add(headM);
        statGroup.position.set(sx, sh, sz);
        statGroup.rotation.z = Math.PI / 2 * 0.7;
        statGroup.rotation.y = rng() * Math.PI;
        this._propGroup.add(statGroup);
      }
      // Overgrown vines on ruins
      for (let i = 0; i < 20; i++) {
        const vx = (rng() - 0.5) * 2 * half;
        const vz = (rng() - 0.5) * 2 * half;
        const vh = getTerrainHeight(vx, vz, mapDef);
        const vineGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.8 + rng() * 1.5, 4);
        const vineMat = new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.9 });
        const vine = new THREE.Mesh(vineGeo, vineMat);
        vine.position.set(vx, vh + 0.5, vz);
        vine.rotation.z = (rng() - 0.5) * 1.2;
        this._propGroup.add(vine);
      }
    }

    // Whispering Woods: hollow stumps, mushroom rings, fallen logs
    if (mapDef.id === "dense_forest") {
      // Massive ancient trees (extra large)
      for (let i = 0; i < 8; i++) {
        const tx = (rng() - 0.5) * 2 * half;
        const tz = (rng() - 0.5) * 2 * half;
        const th = getTerrainHeight(tx, tz, mapDef);
        const treeG = new THREE.Group();
        const trunkGeo2 = new THREE.CylinderGeometry(0.4, 0.6, 5, 10);
        const trunkMat2 = new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 0.95 });
        const trunk2 = new THREE.Mesh(trunkGeo2, trunkMat2);
        trunk2.position.y = 2.5;
        trunk2.castShadow = true;
        treeG.add(trunk2);
        // Giant canopy
        const canopyGeo = new THREE.SphereGeometry(3, 8, 6);
        const canopyMat = new THREE.MeshStandardMaterial({ color: mapDef.treeColor, roughness: 0.8 });
        const canopy = new THREE.Mesh(canopyGeo, canopyMat);
        canopy.position.y = 6;
        canopy.scale.set(1, 0.6, 1);
        canopy.castShadow = true;
        treeG.add(canopy);
        treeG.position.set(tx, th, tz);
        this._propGroup.add(treeG);
      }
      // Mushroom rings
      for (let i = 0; i < 8; i++) {
        const mx = (rng() - 0.5) * 2 * half;
        const mz = (rng() - 0.5) * 2 * half;
        const radius = 0.5 + rng() * 1;
        const count = 6 + Math.floor(rng() * 5);
        for (let mi = 0; mi < count; mi++) {
          const a = (mi / count) * Math.PI * 2;
          const mmx = mx + Math.cos(a) * radius;
          const mmz = mz + Math.sin(a) * radius;
          const mmh = getTerrainHeight(mmx, mmz, mapDef);
          const stalkGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.12, 4);
          const stalkMat = new THREE.MeshStandardMaterial({ color: 0xddccaa });
          const stalk = new THREE.Mesh(stalkGeo, stalkMat);
          stalk.position.set(mmx, mmh + 0.06, mmz);
          this._propGroup.add(stalk);
          const capGeo2 = new THREE.SphereGeometry(0.05, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
          const capMat = new THREE.MeshStandardMaterial({ color: rng() > 0.5 ? 0xcc3322 : 0xff9922 });
          const cap2 = new THREE.Mesh(capGeo2, capMat);
          cap2.position.set(mmx, mmh + 0.12, mmz);
          this._propGroup.add(cap2);
        }
      }
    }

    // Inferno Caldera: obsidian spires, lava geysers, volcanic vents
    if (mapDef.id === "volcanic_caldera") {
      // Obsidian spires
      for (let i = 0; i < 20; i++) {
        const sx = (rng() - 0.5) * 2 * half;
        const sz = (rng() - 0.5) * 2 * half;
        const sh = getTerrainHeight(sx, sz, mapDef);
        const spireH = 2 + rng() * 5;
        const spireGeo = new THREE.ConeGeometry(0.3 + rng() * 0.3, spireH, 5);
        const spireMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.3, metalness: 0.5 });
        const spire = new THREE.Mesh(spireGeo, spireMat);
        spire.position.set(sx, sh + spireH * 0.5, sz);
        spire.rotation.z = (rng() - 0.5) * 0.2;
        spire.castShadow = true;
        this._propGroup.add(spire);
      }
      // Lava geysers (glowing orange pools)
      for (let i = 0; i < 8; i++) {
        const gx = (rng() - 0.5) * 2 * half;
        const gz = (rng() - 0.5) * 2 * half;
        const gh = getTerrainHeight(gx, gz, mapDef);
        const poolGeo = new THREE.CylinderGeometry(0.5 + rng() * 0.5, 0.6 + rng() * 0.5, 0.1, 8);
        const poolMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.7 });
        const pool = new THREE.Mesh(poolGeo, poolMat);
        pool.position.set(gx, gh + 0.05, gz);
        this._propGroup.add(pool);
        // Glow light
        const glight = new THREE.PointLight(0xff4400, 0.5, 8);
        glight.position.set(gx, gh + 0.5, gz);
        this._propGroup.add(glight);
      }
      // Charred skeletons
      for (let i = 0; i < 10; i++) {
        const skx = (rng() - 0.5) * 2 * half;
        const skz = (rng() - 0.5) * 2 * half;
        const skh = getTerrainHeight(skx, skz, mapDef);
        const skMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.9 });
        const ribGeo = new THREE.TorusGeometry(0.1, 0.02, 4, 6, Math.PI);
        for (let r = 0; r < 3; r++) {
          const rib = new THREE.Mesh(ribGeo, skMat);
          rib.position.set(skx, skh + 0.1 + r * 0.06, skz);
          rib.rotation.y = rng() * Math.PI;
          this._propGroup.add(rib);
        }
      }
    }

    // Frostpeak Citadel: ice pillars, snow drifts, frozen waterfalls, ruined towers
    if (mapDef.id === "frozen_fortress") {
      // Ice pillars
      for (let i = 0; i < 15; i++) {
        const ix = (rng() - 0.5) * 2 * half;
        const iz = (rng() - 0.5) * 2 * half;
        const ih = getTerrainHeight(ix, iz, mapDef);
        const pillarH = 1.5 + rng() * 3;
        const pillarGeo = new THREE.CylinderGeometry(0.15 + rng() * 0.1, 0.2 + rng() * 0.15, pillarH, 6);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x88ccee, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.7 });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(ix, ih + pillarH * 0.5, iz);
        pillar.castShadow = true;
        this._propGroup.add(pillar);
      }
      // Ruined towers
      for (let i = 0; i < 4; i++) {
        const tx = (rng() - 0.5) * 2 * half;
        const tz = (rng() - 0.5) * 2 * half;
        const th = getTerrainHeight(tx, tz, mapDef);
        const towerH = 3 + rng() * 3;
        const towerGeo = new THREE.CylinderGeometry(0.8, 1.0, towerH, 8);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.9 });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.set(tx, th + towerH * 0.5, tz);
        tower.castShadow = true;
        this._propGroup.add(tower);
        // Broken top
        const topGeo = new THREE.CylinderGeometry(0.9, 0.8, 0.2, 8, 1, true);
        const top = new THREE.Mesh(topGeo, towerMat);
        top.position.set(tx, th + towerH + 0.1, tz);
        this._propGroup.add(top);
      }
      // Snow drifts
      for (let i = 0; i < 25; i++) {
        const dx2 = (rng() - 0.5) * 2 * half;
        const dz2 = (rng() - 0.5) * 2 * half;
        const dh = getTerrainHeight(dx2, dz2, mapDef);
        const driftGeo = new THREE.SphereGeometry(0.5 + rng() * 1, 6, 4);
        const driftMat = new THREE.MeshStandardMaterial({ color: 0xe8f0ff, roughness: 0.95 });
        const drift = new THREE.Mesh(driftGeo, driftMat);
        drift.position.set(dx2, dh + 0.1, dz2);
        drift.scale.set(1 + rng(), 0.3, 1 + rng());
        this._propGroup.add(drift);
      }
    }

    // Mirage Oasis: sand dunes, cacti, desert tents, oasis pools
    if (mapDef.id === "desert_oasis") {
      // Sand dunes
      for (let i = 0; i < 20; i++) {
        const dx3 = (rng() - 0.5) * 2 * half;
        const dz3 = (rng() - 0.5) * 2 * half;
        const dh = getTerrainHeight(dx3, dz3, mapDef);
        const duneGeo = new THREE.SphereGeometry(3 + rng() * 4, 8, 6);
        const duneMat = new THREE.MeshStandardMaterial({ color: 0xd8b868, roughness: 0.95 });
        const dune = new THREE.Mesh(duneGeo, duneMat);
        dune.position.set(dx3, dh - 1, dz3);
        dune.scale.set(1.5, 0.3, 1);
        this._propGroup.add(dune);
      }
      // Cacti
      for (let i = 0; i < 15; i++) {
        const cx = (rng() - 0.5) * 2 * half;
        const cz = (rng() - 0.5) * 2 * half;
        const ch = getTerrainHeight(cx, cz, mapDef);
        const cactG = new THREE.Group();
        const stemGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.8 + rng() * 0.5, 6);
        const cactMat = new THREE.MeshStandardMaterial({ color: 0x447733, roughness: 0.8 });
        const stem = new THREE.Mesh(stemGeo, cactMat);
        stem.position.y = 0.4;
        cactG.add(stem);
        // Arms
        if (rng() > 0.4) {
          const armGeo2 = new THREE.CylinderGeometry(0.05, 0.06, 0.3, 5);
          const arm = new THREE.Mesh(armGeo2, cactMat);
          arm.position.set(0.12, 0.5, 0);
          arm.rotation.z = -Math.PI / 3;
          cactG.add(arm);
        }
        cactG.position.set(cx, ch, cz);
        this._propGroup.add(cactG);
      }
      // Desert tents
      for (let i = 0; i < 6; i++) {
        const tx = (rng() - 0.5) * 2 * half;
        const tz = (rng() - 0.5) * 2 * half;
        const th = getTerrainHeight(tx, tz, mapDef);
        const tentGeo = new THREE.ConeGeometry(1.2, 1.8, 6);
        const tentMat = new THREE.MeshStandardMaterial({ color: 0xcc9944, roughness: 0.85, side: THREE.DoubleSide });
        const tent = new THREE.Mesh(tentGeo, tentMat);
        tent.position.set(tx, th + 0.9, tz);
        tent.castShadow = true;
        this._propGroup.add(tent);
      }
      // Central oasis pool
      const oasisGeo = new THREE.CylinderGeometry(5, 5.5, 0.2, 16);
      const oasisMat = new THREE.MeshStandardMaterial({ color: 0x2288aa, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.6 });
      const oasis = new THREE.Mesh(oasisGeo, oasisMat);
      const oh = getTerrainHeight(0, 0, mapDef);
      oasis.position.set(0, oh - 0.1, 0);
      this._propGroup.add(oasis);
      // Palm trees around oasis
      for (let i = 0; i < 8; i++) {
        const pa = (i / 8) * Math.PI * 2;
        const px = Math.cos(pa) * 6;
        const pz = Math.sin(pa) * 6;
        const ph = getTerrainHeight(px, pz, mapDef);
        const palmG = new THREE.Group();
        const trunkG = new THREE.CylinderGeometry(0.08, 0.12, 3, 6);
        const trunkM = new THREE.MeshStandardMaterial({ color: 0x6a5530, roughness: 0.9 });
        const trunk = new THREE.Mesh(trunkG, trunkM);
        trunk.position.y = 1.5;
        trunk.rotation.z = (rng() - 0.5) * 0.15;
        palmG.add(trunk);
        // Fronds
        for (let fi = 0; fi < 6; fi++) {
          const fa = (fi / 6) * Math.PI * 2;
          const frondGeo = new THREE.BoxGeometry(0.3, 0.02, 1.5);
          const frondMat = new THREE.MeshStandardMaterial({ color: 0x448833, roughness: 0.8 });
          const frond = new THREE.Mesh(frondGeo, frondMat);
          frond.position.set(Math.cos(fa) * 0.3, 3.2, Math.sin(fa) * 0.3);
          frond.rotation.x = Math.sin(fa) * 0.8;
          frond.rotation.z = Math.cos(fa) * 0.8;
          palmG.add(frond);
        }
        palmG.position.set(px, ph, pz);
        this._propGroup.add(palmG);
      }
    }

    // Haunted Graveyard: gravestones, crypts, dead trees, iron fences, ghost lanterns
    if (mapDef.id === "haunted_graveyard") {
      // Gravestones
      for (let i = 0; i < 40; i++) {
        const gx = (rng() - 0.5) * 2 * half;
        const gz = (rng() - 0.5) * 2 * half;
        const gh = getTerrainHeight(gx, gz, mapDef);
        const gsH = 0.3 + rng() * 0.5;
        const gsGeo = new THREE.BoxGeometry(0.3 + rng() * 0.2, gsH, 0.08);
        const gsMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
        const gs = new THREE.Mesh(gsGeo, gsMat);
        gs.position.set(gx, gh + gsH * 0.5, gz);
        gs.rotation.z = (rng() - 0.5) * 0.15;
        gs.rotation.y = rng() * Math.PI;
        gs.castShadow = true;
        this._propGroup.add(gs);
      }
      // Crypts
      for (let i = 0; i < 6; i++) {
        const cx2 = (rng() - 0.5) * 2 * half;
        const cz2 = (rng() - 0.5) * 2 * half;
        const ch2 = getTerrainHeight(cx2, cz2, mapDef);
        const cryptG = new THREE.Group();
        const baseGeo = new THREE.BoxGeometry(2, 1.5, 2);
        const cryptMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
        const base = new THREE.Mesh(baseGeo, cryptMat);
        base.position.y = 0.75;
        base.castShadow = true;
        cryptG.add(base);
        // Roof
        const roofGeo = new THREE.ConeGeometry(1.5, 0.8, 4);
        const roof = new THREE.Mesh(roofGeo, cryptMat);
        roof.position.y = 1.9;
        roof.rotation.y = Math.PI / 4;
        cryptG.add(roof);
        // Door
        const doorGeo = new THREE.BoxGeometry(0.5, 1, 0.05);
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 0.5, -1.01);
        cryptG.add(door);
        cryptG.position.set(cx2, ch2, cz2);
        cryptG.rotation.y = rng() * Math.PI;
        this._propGroup.add(cryptG);
      }
      // Ghost lanterns (floating green lights)
      for (let i = 0; i < 8; i++) {
        const lx = (rng() - 0.5) * 2 * half;
        const lz = (rng() - 0.5) * 2 * half;
        const lh = getTerrainHeight(lx, lz, mapDef);
        const lanternGeo = new THREE.SphereGeometry(0.08, 6, 6);
        const lanternMat = new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.6 });
        const lantern = new THREE.Mesh(lanternGeo, lanternMat);
        lantern.position.set(lx, lh + 1.5 + rng() * 1, lz);
        this._propGroup.add(lantern);
        const llight = new THREE.PointLight(0x44ff88, 0.3, 6);
        llight.position.set(lx, lh + 1.5, lz);
        this._propGroup.add(llight);
      }
    }

    // Skyshatter Isles: floating rocks, sky bridges, wind crystals
    if (mapDef.id === "floating_islands") {
      // Floating rocks in the sky
      for (let i = 0; i < 30; i++) {
        const fx = (rng() - 0.5) * mapDef.size * 2;
        const fz = (rng() - 0.5) * mapDef.size * 2;
        const fy = 10 + rng() * 30;
        const fSize = 1 + rng() * 3;
        const fGeo = new THREE.DodecahedronGeometry(fSize, 1);
        const fMat = new THREE.MeshStandardMaterial({ color: 0x667766, roughness: 0.9 });
        const fRock = new THREE.Mesh(fGeo, fMat);
        fRock.position.set(fx, fy, fz);
        fRock.scale.set(1, 0.5, 1);
        fRock.castShadow = true;
        this._propGroup.add(fRock);
        // Small vegetation on top
        if (rng() > 0.5) {
          const grassGeo = new THREE.ConeGeometry(fSize * 0.3, fSize * 0.4, 6);
          const grassM = new THREE.MeshStandardMaterial({ color: mapDef.treeColor, roughness: 0.8 });
          const grass = new THREE.Mesh(grassGeo, grassM);
          grass.position.set(fx, fy + fSize * 0.4, fz);
          this._propGroup.add(grass);
        }
      }
      // Wind crystals (glowing blue)
      for (let i = 0; i < 10; i++) {
        const wcx = (rng() - 0.5) * 2 * half;
        const wcz = (rng() - 0.5) * 2 * half;
        const wch = getTerrainHeight(wcx, wcz, mapDef);
        const wcGeo = new THREE.OctahedronGeometry(0.3 + rng() * 0.2);
        const wcMat = new THREE.MeshBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 0.6 });
        const wc = new THREE.Mesh(wcGeo, wcMat);
        wc.position.set(wcx, wch + 0.5 + rng() * 1, wcz);
        this._propGroup.add(wc);
        const wcLight = new THREE.PointLight(0x88ddff, 0.3, 5);
        wcLight.position.set(wcx, wch + 1, wcz);
        this._propGroup.add(wcLight);
      }
    }

    // Deepstone Caverns: stalactites, stalagmites, glowing mushrooms, crystal clusters
    if (mapDef.id === "underground_caverns") {
      // Stalactites (hanging from ceiling/high up)
      for (let i = 0; i < 30; i++) {
        const sx2 = (rng() - 0.5) * 2 * half;
        const sz2 = (rng() - 0.5) * 2 * half;
        const sLen = 0.5 + rng() * 2;
        const sGeo = new THREE.ConeGeometry(0.1 + rng() * 0.1, sLen, 5);
        const sMat = new THREE.MeshStandardMaterial({ color: 0x554455, roughness: 0.85 });
        const stalactite = new THREE.Mesh(sGeo, sMat);
        stalactite.position.set(sx2, 15 + rng() * 5, sz2);
        stalactite.rotation.x = Math.PI;
        this._propGroup.add(stalactite);
      }
      // Stalagmites (ground)
      for (let i = 0; i < 25; i++) {
        const smx = (rng() - 0.5) * 2 * half;
        const smz = (rng() - 0.5) * 2 * half;
        const smh = getTerrainHeight(smx, smz, mapDef);
        const smLen = 0.5 + rng() * 1.5;
        const smGeo = new THREE.ConeGeometry(0.12 + rng() * 0.1, smLen, 5);
        const smMat = new THREE.MeshStandardMaterial({ color: 0x554455, roughness: 0.85 });
        const stalagmite = new THREE.Mesh(smGeo, smMat);
        stalagmite.position.set(smx, smh + smLen * 0.5, smz);
        stalagmite.castShadow = true;
        this._propGroup.add(stalagmite);
      }
      // Glowing mushrooms
      for (let i = 0; i < 35; i++) {
        const gmx = (rng() - 0.5) * 2 * half;
        const gmz = (rng() - 0.5) * 2 * half;
        const gmh = getTerrainHeight(gmx, gmz, mapDef);
        const mushG = new THREE.Group();
        const mushStalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 5), new THREE.MeshStandardMaterial({ color: 0xddccaa }));
        mushStalk.position.y = 0.1;
        mushG.add(mushStalk);
        const mushCap = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5),
          new THREE.MeshBasicMaterial({ color: 0x44cc88, transparent: true, opacity: 0.8 }));
        mushCap.position.y = 0.2;
        mushG.add(mushCap);
        mushG.position.set(gmx, gmh, gmz);
        mushG.scale.setScalar(0.5 + rng() * 1.5);
        this._propGroup.add(mushG);
        // Dim glow
        if (rng() > 0.6) {
          const glow = new THREE.PointLight(0x44cc88, 0.15, 3);
          glow.position.set(gmx, gmh + 0.3, gmz);
          this._propGroup.add(glow);
        }
      }
      // Crystal clusters
      for (let i = 0; i < 15; i++) {
        const ccx = (rng() - 0.5) * 2 * half;
        const ccz = (rng() - 0.5) * 2 * half;
        const cch = getTerrainHeight(ccx, ccz, mapDef);
        const clusterG = new THREE.Group();
        const numCrystals = 3 + Math.floor(rng() * 4);
        for (let ci = 0; ci < numCrystals; ci++) {
          const cH = 0.3 + rng() * 0.8;
          const cGeo = new THREE.CylinderGeometry(0.03, 0.08, cH, 6);
          const cMat = new THREE.MeshBasicMaterial({ color: 0xaa44ff, transparent: true, opacity: 0.5 });
          const crystal = new THREE.Mesh(cGeo, cMat);
          crystal.position.set((rng() - 0.5) * 0.3, cH * 0.5, (rng() - 0.5) * 0.3);
          crystal.rotation.z = (rng() - 0.5) * 0.4;
          clusterG.add(crystal);
        }
        clusterG.position.set(ccx, cch, ccz);
        this._propGroup.add(clusterG);
        const ccLight = new THREE.PointLight(0xaa44ff, 0.2, 4);
        ccLight.position.set(ccx, cch + 0.5, ccz);
        this._propGroup.add(ccLight);
      }
    }

    // Stormbreaker Coast: lighthouse, shipwrecks, cliff faces, driftwood
    if (mapDef.id === "coastal_cliffs") {
      // Lighthouse
      for (let i = 0; i < 2; i++) {
        const lx = (rng() - 0.5) * half;
        const lz = (rng() - 0.5) * half;
        const lh = getTerrainHeight(lx, lz, mapDef);
        const lhGroup = new THREE.Group();
        const towerGeo2 = new THREE.CylinderGeometry(0.5, 0.7, 6, 8);
        const towerMat2 = new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.8 });
        const tower2 = new THREE.Mesh(towerGeo2, towerMat2);
        tower2.position.y = 3;
        tower2.castShadow = true;
        lhGroup.add(tower2);
        // Red stripe
        const stripeGeo = new THREE.CylinderGeometry(0.52, 0.65, 1, 8);
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.8 });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.y = 3;
        lhGroup.add(stripe);
        // Light dome
        const domeGeo = new THREE.SphereGeometry(0.4, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const domeMat = new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0.6 });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.y = 6.2;
        lhGroup.add(dome);
        const lhLight = new THREE.PointLight(0xffffcc, 0.8, 20);
        lhLight.position.y = 6.5;
        lhGroup.add(lhLight);
        lhGroup.position.set(lx, lh, lz);
        this._propGroup.add(lhGroup);
      }
      // Shipwrecks
      for (let i = 0; i < 3; i++) {
        const swx = (rng() - 0.5) * 2 * half;
        const swz = (rng() - 0.5) * 2 * half;
        const swh = getTerrainHeight(swx, swz, mapDef);
        const hullGeo = new THREE.BoxGeometry(2 + rng() * 2, 1, 4 + rng() * 3);
        const hullMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.95 });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.position.set(swx, swh + 0.3, swz);
        hull.rotation.z = (rng() - 0.5) * 0.4;
        hull.rotation.y = rng() * Math.PI;
        hull.castShadow = true;
        this._propGroup.add(hull);
        // Broken mast
        const mastGeo = new THREE.CylinderGeometry(0.06, 0.08, 2 + rng() * 2, 4);
        const mast = new THREE.Mesh(mastGeo, hullMat);
        mast.position.set(swx, swh + 1, swz);
        mast.rotation.z = (rng() - 0.5) * 0.8;
        this._propGroup.add(mast);
      }
      // Driftwood
      for (let i = 0; i < 15; i++) {
        const dwx = (rng() - 0.5) * 2 * half;
        const dwz = (rng() - 0.5) * 2 * half;
        const dwh = getTerrainHeight(dwx, dwz, mapDef);
        const dwGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.8 + rng() * 1.5, 4);
        const dwMat = new THREE.MeshStandardMaterial({ color: 0x6a5533, roughness: 0.95 });
        const dw = new THREE.Mesh(dwGeo, dwMat);
        dw.position.set(dwx, dwh + 0.1, dwz);
        dw.rotation.z = Math.PI / 2;
        dw.rotation.y = rng() * Math.PI;
        this._propGroup.add(dw);
      }
    }

    // Arcane Gardens: giant flowers, singing fountains, hedge mazes, marble statues, fairy rings
    if (mapDef.id === "enchanted_garden") {
      // Giant flowers
      const flowerColors2 = [0xff44aa, 0xff66cc, 0xaa44ff, 0xff4444, 0xffaa44, 0x44aaff];
      for (let i = 0; i < 20; i++) {
        const fx = (rng() - 0.5) * 2 * half;
        const fz = (rng() - 0.5) * 2 * half;
        const fh = getTerrainHeight(fx, fz, mapDef);
        const flowerG = new THREE.Group();
        // Stem
        const stemGeo2 = new THREE.CylinderGeometry(0.04, 0.06, 1.5 + rng() * 1, 5);
        const stemMat2 = new THREE.MeshStandardMaterial({ color: 0x33aa22, roughness: 0.8 });
        const stem2 = new THREE.Mesh(stemGeo2, stemMat2);
        stem2.position.y = 0.75;
        flowerG.add(stem2);
        // Petals
        const petalColor = flowerColors2[Math.floor(rng() * flowerColors2.length)];
        for (let pi = 0; pi < 6; pi++) {
          const pa2 = (pi / 6) * Math.PI * 2;
          const petalGeo2 = new THREE.SphereGeometry(0.15 + rng() * 0.1, 6, 4);
          const petalMat2 = new THREE.MeshStandardMaterial({ color: petalColor, roughness: 0.6 });
          const petal2 = new THREE.Mesh(petalGeo2, petalMat2);
          petal2.position.set(Math.cos(pa2) * 0.2, 1.6, Math.sin(pa2) * 0.2);
          petal2.scale.set(1, 0.5, 1.2);
          flowerG.add(petal2);
        }
        // Center
        const centerGeo = new THREE.SphereGeometry(0.08, 6, 6);
        const centerMat = new THREE.MeshStandardMaterial({ color: 0xffee44, roughness: 0.5 });
        const center = new THREE.Mesh(centerGeo, centerMat);
        center.position.y = 1.6;
        flowerG.add(center);
        flowerG.position.set(fx, fh, fz);
        this._propGroup.add(flowerG);
      }
      // Singing fountains
      for (let i = 0; i < 4; i++) {
        const fnx = (rng() - 0.5) * half;
        const fnz = (rng() - 0.5) * half;
        const fnh = getTerrainHeight(fnx, fnz, mapDef);
        const fnG = new THREE.Group();
        const basinGeo = new THREE.CylinderGeometry(1, 1.2, 0.5, 12);
        const basinMat = new THREE.MeshStandardMaterial({ color: 0x6688cc, roughness: 0.3, metalness: 0.4 });
        const basin = new THREE.Mesh(basinGeo, basinMat);
        basin.position.y = 0.25;
        fnG.add(basin);
        // Water surface
        const waterGeo2 = new THREE.CylinderGeometry(0.9, 0.9, 0.05, 12);
        const waterMat2 = new THREE.MeshStandardMaterial({ color: 0x4488cc, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.5 });
        const water2 = new THREE.Mesh(waterGeo2, waterMat2);
        water2.position.y = 0.48;
        fnG.add(water2);
        // Center spout
        const spoutGeo = new THREE.CylinderGeometry(0.05, 0.08, 1, 6);
        const spoutMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4 });
        const spout = new THREE.Mesh(spoutGeo, spoutMat);
        spout.position.y = 0.75;
        fnG.add(spout);
        fnG.position.set(fnx, fnh, fnz);
        this._propGroup.add(fnG);
      }
      // Marble statues
      for (let i = 0; i < 6; i++) {
        const msx = (rng() - 0.5) * 2 * half;
        const msz = (rng() - 0.5) * 2 * half;
        const msh = getTerrainHeight(msx, msz, mapDef);
        const statG2 = new THREE.Group();
        const pedGeo = new THREE.BoxGeometry(0.6, 0.4, 0.6);
        const statMat2 = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4 });
        const ped = new THREE.Mesh(pedGeo, statMat2);
        ped.position.y = 0.2;
        statG2.add(ped);
        const bodyGeo2 = new THREE.CylinderGeometry(0.15, 0.2, 1, 6);
        const body2 = new THREE.Mesh(bodyGeo2, statMat2);
        body2.position.y = 0.9;
        statG2.add(body2);
        const headGeo3 = new THREE.SphereGeometry(0.12, 6, 6);
        const head3 = new THREE.Mesh(headGeo3, statMat2);
        head3.position.y = 1.5;
        statG2.add(head3);
        statG2.position.set(msx, msh, msz);
        this._propGroup.add(statG2);
      }
      // Fairy rings (glowing ground circles)
      for (let i = 0; i < 5; i++) {
        const frx = (rng() - 0.5) * 2 * half;
        const frz = (rng() - 0.5) * 2 * half;
        const frh = getTerrainHeight(frx, frz, mapDef);
        const frGeo = new THREE.TorusGeometry(1 + rng() * 0.5, 0.03, 4, 24);
        const frMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.3 });
        const fr = new THREE.Mesh(frGeo, frMat);
        fr.position.set(frx, frh + 0.02, frz);
        fr.rotation.x = Math.PI / 2;
        this._propGroup.add(fr);
      }
    }

    // ---- ENVIRONMENTAL ANIMALS (for all maps with envAnimals) ----
    if (mapDef.envAnimals) {
      for (const animalDef of mapDef.envAnimals) {
        for (let i = 0; i < animalDef.count; i++) {
          const ax = (rng() - 0.5) * 2 * half;
          const az = (rng() - 0.5) * 2 * half;
          const ah = getTerrainHeight(ax, az, mapDef);
          const animalG = new THREE.Group();

          if (animalDef.type === "bird") {
            // Simple bird: body + two wing triangles
            const bBody = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), new THREE.MeshStandardMaterial({ color: 0x444444 }));
            animalG.add(bBody);
            for (const ws of [-1, 1]) {
              const wingGeo = new THREE.BufferGeometry();
              const wVerts = new Float32Array([0, 0, 0, ws * 0.08, 0.02, -0.02, ws * 0.06, 0, 0.03]);
              wingGeo.setAttribute("position", new THREE.BufferAttribute(wVerts, 3));
              wingGeo.computeVertexNormals();
              const wing = new THREE.Mesh(wingGeo, new THREE.MeshStandardMaterial({ color: 0x555555, side: THREE.DoubleSide }));
              wing.name = ws < 0 ? "birdLeftWing" : "birdRightWing";
              animalG.add(wing);
            }
            animalG.position.set(ax, ah + 5 + rng() * 15, az);
          } else if (animalDef.type === "deer") {
            const dBody = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshStandardMaterial({ color: 0x8a6633 }));
            dBody.scale.set(1, 0.8, 1.5);
            animalG.add(dBody);
            const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), new THREE.MeshStandardMaterial({ color: 0x8a6633 }));
            dHead.position.set(0, 0.06, -0.18);
            animalG.add(dHead);
            for (const lx of [-0.06, 0.06, -0.06, 0.06]) {
              const legGeo2 = new THREE.CylinderGeometry(0.015, 0.02, 0.15, 4);
              const legM = new THREE.Mesh(legGeo2, new THREE.MeshStandardMaterial({ color: 0x7a5522 }));
              legM.position.set(lx, -0.12, lx > 0 ? -0.08 : 0.06);
              animalG.add(legM);
            }
            animalG.position.set(ax, ah + 0.15, az);
          } else if (animalDef.type === "wolf") {
            const wBody = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshStandardMaterial({ color: 0x555566 }));
            wBody.scale.set(1, 0.8, 1.5);
            animalG.add(wBody);
            const wHead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), new THREE.MeshStandardMaterial({ color: 0x555566 }));
            wHead.position.set(0, 0.04, -0.16);
            animalG.add(wHead);
            // Ears
            for (const ex of [-0.03, 0.03]) {
              const earGeo2 = new THREE.ConeGeometry(0.015, 0.04, 3);
              const earM = new THREE.Mesh(earGeo2, new THREE.MeshStandardMaterial({ color: 0x555566 }));
              earM.position.set(ex, 0.1, -0.14);
              animalG.add(earM);
            }
            animalG.position.set(ax, ah + 0.12, az);
          } else if (animalDef.type === "butterfly") {
            const bfBody = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.03, 3), new THREE.MeshStandardMaterial({ color: 0x222222 }));
            bfBody.rotation.x = Math.PI / 2;
            animalG.add(bfBody);
            const bfColors = [0xff44aa, 0x44aaff, 0xffaa44, 0xaa44ff, 0x44ffaa];
            const bfCol = bfColors[Math.floor(rng() * bfColors.length)];
            for (const ws of [-1, 1]) {
              const wingGeo2 = new THREE.CircleGeometry(0.02, 5);
              const wingM = new THREE.Mesh(wingGeo2, new THREE.MeshBasicMaterial({ color: bfCol, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
              wingM.position.set(ws * 0.015, 0, 0);
              wingM.rotation.y = ws * 0.5;
              wingM.name = ws < 0 ? "bfLeftWing" : "bfRightWing";
              animalG.add(wingM);
            }
            animalG.position.set(ax, ah + 0.5 + rng() * 2, az);
          } else if (animalDef.type === "bat") {
            const batBody = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 4), new THREE.MeshStandardMaterial({ color: 0x222222 }));
            animalG.add(batBody);
            for (const ws of [-1, 1]) {
              const bwGeo = new THREE.BufferGeometry();
              const bwVerts = new Float32Array([0, 0, 0, ws * 0.06, 0.01, -0.01, ws * 0.04, -0.01, 0.02]);
              bwGeo.setAttribute("position", new THREE.BufferAttribute(bwVerts, 3));
              bwGeo.computeVertexNormals();
              const bw = new THREE.Mesh(bwGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, side: THREE.DoubleSide }));
              bw.name = ws < 0 ? "batLeftWing" : "batRightWing";
              animalG.add(bw);
            }
            animalG.position.set(ax, ah + 3 + rng() * 8, az);
          } else if (animalDef.type === "crab") {
            const crabBody = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshStandardMaterial({ color: 0xcc5533 }));
            crabBody.scale.set(1.3, 0.5, 1);
            animalG.add(crabBody);
            // Claws
            for (const cs of [-1, 1]) {
              const clawGeo = new THREE.SphereGeometry(0.02, 4, 4);
              const claw = new THREE.Mesh(clawGeo, new THREE.MeshStandardMaterial({ color: 0xcc5533 }));
              claw.position.set(cs * 0.06, 0, -0.03);
              animalG.add(claw);
            }
            animalG.position.set(ax, ah + 0.03, az);
          } else if (animalDef.type === "firefly") {
            const ffGeo = new THREE.SphereGeometry(0.015, 4, 4);
            const ffMat = new THREE.MeshBasicMaterial({ color: 0xffee44, transparent: true, opacity: 0.6 });
            const ff = new THREE.Mesh(ffGeo, ffMat);
            animalG.add(ff);
            animalG.position.set(ax, ah + 0.5 + rng() * 3, az);
          } else if (animalDef.type === "fish") {
            const fishBody = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshStandardMaterial({ color: 0x4488aa }));
            fishBody.scale.set(0.7, 0.6, 1.5);
            animalG.add(fishBody);
            const tailGeo = new THREE.BufferGeometry();
            const tVerts = new Float32Array([0, 0, 0.04, 0, 0.025, 0.08, 0, -0.025, 0.08]);
            tailGeo.setAttribute("position", new THREE.BufferAttribute(tVerts, 3));
            tailGeo.computeVertexNormals();
            const tail = new THREE.Mesh(tailGeo, new THREE.MeshStandardMaterial({ color: 0x4488aa, side: THREE.DoubleSide }));
            animalG.add(tail);
            animalG.position.set(ax, ah - 0.5, az);
          }

          animalG.name = `animal_${animalDef.type}_${i}`;
          animalG.userData.animalType = animalDef.type;
          animalG.userData.baseX = ax;
          animalG.userData.baseY = animalG.position.y;
          animalG.userData.baseZ = az;
          animalG.userData.phase = rng() * Math.PI * 2;
          this._propGroup.add(animalG);
        }
      }
    }
  }

  private _spawnAmbientParticles(mapDef: MapDef): void {
    const count = 30;
    const half = mapDef.size * 0.6;
    for (let i = 0; i < count; i++) {
      let color = 0xffffcc;
        if (mapDef.id === "enchanted_forest") {
        color = 0xaaff66;
      }
      const geo = new THREE.SphereGeometry(0.03, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      const px = (Math.random() - 0.5) * 2 * half;
      const pz = (Math.random() - 0.5) * 2 * half;
      const py = getTerrainHeight(px, pz, mapDef) + 1 + Math.random() * 4;
      mesh.position.set(px, py, pz);
      this._scene.add(mesh);
      this._ambientParticles.push({
        mesh, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.1, vz: (Math.random() - 0.5) * 0.3,
        life: 999, maxLife: 999, gravity: false,
      });
    }
  }


  // =====================================================================
  // MESH BUILDERS
  // =====================================================================

  private _buildMageMesh(player: MWPlayer): THREE.Group {
    const cls = getClassDef(player.classId);
    const group = new THREE.Group();
    const teamColor = player.team === 0 ? 0x4488ff : 0xff4444;
    const skinColor = 0xdebb99;
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const robeMat = new THREE.MeshStandardMaterial({ color: cls.robeColor, roughness: 0.7 });
    const robeDarkMat = new THREE.MeshStandardMaterial({ color: darkenColor(cls.robeColor, 0.7), roughness: 0.8 });
    const robeLightMat = new THREE.MeshStandardMaterial({ color: brightenColor(cls.robeColor, 1.2), roughness: 0.65 });
    const accentMat = new THREE.MeshStandardMaterial({ color: cls.accentColor, roughness: 0.4, metalness: 0.5 });

    // --- LEGS (under the robe) ---
    const legGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.45, 6);
    for (const lx of [-0.12, 0.12]) {
      const leg = new THREE.Mesh(legGeo, robeDarkMat);
      leg.position.set(lx, 0.22, 0);
      leg.name = lx < 0 ? "leftLeg" : "rightLeg";
      group.add(leg);
    }

    // Boots with detail
    const bootGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.2, 6);
    const bootMat = new THREE.MeshStandardMaterial({ color: darkenColor(cls.robeColor, 0.35), roughness: 0.8, metalness: 0.1 });
    const bootTopGeo = new THREE.TorusGeometry(0.1, 0.015, 4, 8);
    const bootTopMat = new THREE.MeshStandardMaterial({ color: darkenColor(cls.robeColor, 0.5), roughness: 0.7 });
    for (const bx of [-0.12, 0.12]) {
      const boot = new THREE.Mesh(bootGeo, bootMat);
      boot.position.set(bx, 0.08, 0);
      group.add(boot);
      // Boot cuff
      const cuff = new THREE.Mesh(bootTopGeo, bootTopMat);
      cuff.position.set(bx, 0.18, 0);
      cuff.rotation.x = Math.PI / 2;
      group.add(cuff);
      // Boot sole
      const soleGeo = new THREE.BoxGeometry(0.12, 0.03, 0.16);
      const sole = new THREE.Mesh(soleGeo, new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }));
      sole.position.set(bx, -0.01, 0);
      group.add(sole);
    }

    // --- ROBE SKIRT (layered for depth) ---
    const skirtGeo = new THREE.CylinderGeometry(0.32, 0.48, 0.55, 10);
    const skirt = new THREE.Mesh(skirtGeo, robeMat);
    skirt.position.y = 0.37;
    group.add(skirt);
    // Inner skirt layer for shading depth
    const innerSkirtGeo = new THREE.CylinderGeometry(0.28, 0.42, 0.5, 8);
    const innerSkirt = new THREE.Mesh(innerSkirtGeo, robeDarkMat);
    innerSkirt.position.y = 0.38;
    group.add(innerSkirt);
    // Skirt hem trim
    const hemGeo = new THREE.TorusGeometry(0.47, 0.02, 4, 16);
    const hemMat = new THREE.MeshStandardMaterial({ color: cls.accentColor, roughness: 0.5, metalness: 0.3 });
    const hem = new THREE.Mesh(hemGeo, hemMat);
    hem.position.y = 0.11;
    hem.rotation.x = Math.PI / 2;
    group.add(hem);

    // --- TORSO (shaped chest with shading panels) ---
    const torsoGeo = new THREE.CylinderGeometry(0.28, 0.33, 0.7, 10);
    const torso = new THREE.Mesh(torsoGeo, robeMat);
    torso.position.y = 0.95;
    torso.castShadow = true;
    group.add(torso);
    // Chest detail panel (lighter center strip)
    const chestPanelGeo = new THREE.BoxGeometry(0.16, 0.5, 0.01);
    const chestPanel = new THREE.Mesh(chestPanelGeo, robeLightMat);
    chestPanel.position.set(0, 0.95, -0.28);
    group.add(chestPanel);
    // Side robe seams
    for (const sx of [-0.28, 0.28]) {
      const seamGeo = new THREE.BoxGeometry(0.01, 0.6, 0.04);
      const seam = new THREE.Mesh(seamGeo, robeDarkMat);
      seam.position.set(sx, 0.95, 0);
      group.add(seam);
    }
    // Collar
    const collarGeo = new THREE.TorusGeometry(0.25, 0.035, 6, 12, Math.PI * 1.5);
    const collar = new THREE.Mesh(collarGeo, accentMat);
    collar.position.set(0, 1.32, -0.05);
    collar.rotation.x = Math.PI / 2;
    collar.rotation.z = Math.PI * 0.75;
    group.add(collar);

    // --- CLOAK/CAPE (animated via name) ---
    const cloakGeo = new THREE.BoxGeometry(0.52, 1.0, 0.04);
    const cloak = new THREE.Mesh(cloakGeo, robeDarkMat);
    cloak.position.set(0, 0.7, 0.26);
    cloak.name = "cloak";
    group.add(cloak);
    // Cape bottom fringe
    const fringeGeo = new THREE.BoxGeometry(0.5, 0.06, 0.03);
    const fringe = new THREE.Mesh(fringeGeo, accentMat);
    fringe.position.set(0, 0.22, 0.26);
    fringe.name = "cloakFringe";
    group.add(fringe);

    // --- BELT with runic gems ---
    const beltGeo = new THREE.TorusGeometry(0.31, 0.035, 6, 14);
    const beltMesh = new THREE.Mesh(beltGeo, new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.4, metalness: 0.5 }));
    beltMesh.position.y = 0.65;
    beltMesh.rotation.x = Math.PI / 2;
    group.add(beltMesh);
    // Belt buckle
    const buckleGeo = new THREE.BoxGeometry(0.08, 0.06, 0.03);
    const buckle = new THREE.Mesh(buckleGeo, new THREE.MeshStandardMaterial({ color: cls.accentColor, roughness: 0.2, metalness: 0.8 }));
    buckle.position.set(0, 0.65, -0.32);
    group.add(buckle);
    // Belt gems
    const gemGeo = new THREE.OctahedronGeometry(0.022);
    const gemMat = new THREE.MeshBasicMaterial({ color: cls.accentColor });
    for (let gi = 0; gi < 6; gi++) {
      const angle = (gi / 6) * Math.PI * 2;
      const gem = new THREE.Mesh(gemGeo, gemMat);
      gem.position.set(Math.cos(angle) * 0.32, 0.65, Math.sin(angle) * 0.32);
      group.add(gem);
    }

    // --- NECK ---
    const neckGeo = new THREE.CylinderGeometry(0.09, 0.12, 0.15, 6);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 1.4;
    group.add(neck);

    // --- HEAD (slightly oblong) ---
    const headGeo = new THREE.SphereGeometry(0.2, 10, 10);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.6;
    head.scale.set(1, 1.05, 0.95);
    head.castShadow = true;
    group.add(head);

    // Cheeks (subtle, warm toned)
    const cheekGeo = new THREE.SphereGeometry(0.05, 6, 4);
    const cheekMat = new THREE.MeshStandardMaterial({ color: 0xe8b090, roughness: 0.7 });
    for (const cx of [-0.12, 0.12]) {
      const cheek = new THREE.Mesh(cheekGeo, cheekMat);
      cheek.position.set(cx, 1.57, -0.14);
      group.add(cheek);
    }

    // Nose
    const noseGeo = new THREE.ConeGeometry(0.025, 0.06, 4);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 1.59, -0.2);
    nose.rotation.x = -Math.PI / 2;
    group.add(nose);

    // --- EYES (detailed: white, iris, pupil, highlight) ---
    const eyeWhiteGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3 });
    const eyeIrisGeo = new THREE.SphereGeometry(0.025, 6, 6);
    // Class-specific eye color
    const eyeColors: Record<string, number> = {
      battlemage: 0x3366aa, pyromancer: 0xcc4400, cryomancer: 0x44aadd,
      stormcaller: 0xccaa22, shadowmancer: 0x8833aa, druid: 0x33aa44,
      warlock: 0xcc2244, archmage: 0x8844ff,
    };
    const irisColor = eyeColors[player.classId] || 0x446688;
    const eyeIrisMat = new THREE.MeshStandardMaterial({ color: irisColor, roughness: 0.3 });
    const eyePupilGeo = new THREE.SphereGeometry(0.012, 4, 4);
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeHighGeo = new THREE.SphereGeometry(0.006, 4, 4);
    const eyeHighMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const ex of [-0.075, 0.075]) {
      const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
      eyeWhite.position.set(ex, 1.63, -0.17);
      group.add(eyeWhite);
      const iris = new THREE.Mesh(eyeIrisGeo, eyeIrisMat);
      iris.position.set(ex, 1.63, -0.2);
      group.add(iris);
      const pupil = new THREE.Mesh(eyePupilGeo, eyePupilMat);
      pupil.position.set(ex, 1.63, -0.215);
      group.add(pupil);
      const highlight = new THREE.Mesh(eyeHighGeo, eyeHighMat);
      highlight.position.set(ex + 0.01, 1.64, -0.22);
      group.add(highlight);
    }

    // Eyebrows (expressive, class-themed)
    const browGeo = new THREE.BoxGeometry(0.065, 0.012, 0.018);
    const browMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.8 });
    for (const bx of [-0.08, 0.08]) {
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.position.set(bx, 1.68, -0.17);
      brow.rotation.z = bx < 0 ? 0.12 : -0.12;
      group.add(brow);
    }

    // Mouth (small, subtle)
    const mouthGeo = new THREE.BoxGeometry(0.06, 0.008, 0.01);
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0xaa6655, roughness: 0.7 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 1.54, -0.19);
    group.add(mouth);

    // Chin
    const chinGeo = new THREE.SphereGeometry(0.04, 6, 4);
    const chin = new THREE.Mesh(chinGeo, skinMat);
    chin.position.set(0, 1.51, -0.16);
    group.add(chin);

    // Ears
    const earGeo = new THREE.SphereGeometry(0.04, 6, 4);
    for (const ex of [-0.2, 0.2]) {
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(ex, 1.6, -0.02);
      ear.scale.set(0.4, 1, 0.7);
      group.add(ear);
    }

    // --- HAT ---
    this._addHat(group, cls);

    // --- SHOULDER ARMOR (class-specific styling) ---
    const padGeo = new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
    for (const side of [-1, 1]) {
      const pad = new THREE.Mesh(padGeo, accentMat);
      pad.position.set(side * 0.38, 1.35, 0);
      pad.rotation.z = side * 0.4;
      pad.name = side < 0 ? "leftShoulder" : "rightShoulder";
      group.add(pad);
      // Shoulder spike/gem per class
      if (cls.id === "battlemage" || cls.id === "warlock") {
        const spikeGeo = new THREE.ConeGeometry(0.03, 0.1, 4);
        const spike = new THREE.Mesh(spikeGeo, accentMat);
        spike.position.set(side * 0.44, 1.42, 0);
        group.add(spike);
      } else {
        const sGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.025), new THREE.MeshBasicMaterial({ color: cls.accentColor }));
        sGem.position.set(side * 0.42, 1.38, -0.05);
        group.add(sGem);
      }
    }

    // --- ARMS (with forearm detail, animated via name) ---
    const upperArmGeo = new THREE.CylinderGeometry(0.06, 0.065, 0.35, 6);
    const foreArmGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.3, 6);
    const elbowGeo = new THREE.SphereGeometry(0.055, 6, 4);

    // Left arm
    const leftUpperArm = new THREE.Mesh(upperArmGeo, robeMat);
    leftUpperArm.position.set(-0.4, 1.15, 0);
    leftUpperArm.rotation.z = 0.25;
    leftUpperArm.name = "leftUpperArm";
    group.add(leftUpperArm);
    const leftElbow = new THREE.Mesh(elbowGeo, robeMat);
    leftElbow.position.set(-0.47, 0.98, 0);
    group.add(leftElbow);
    const leftForeArm = new THREE.Mesh(foreArmGeo, robeMat);
    leftForeArm.position.set(-0.48, 0.85, -0.08);
    leftForeArm.rotation.x = -0.3;
    leftForeArm.name = "leftForeArm";
    group.add(leftForeArm);
    // Forearm bracer
    const bracerGeo = new THREE.CylinderGeometry(0.065, 0.07, 0.1, 6);
    const leftBracer = new THREE.Mesh(bracerGeo, accentMat);
    leftBracer.position.set(-0.48, 0.83, -0.1);
    group.add(leftBracer);

    // Right arm (holding wand, angled forward)
    const rightUpperArm = new THREE.Mesh(upperArmGeo, robeMat);
    rightUpperArm.position.set(0.4, 1.15, -0.05);
    rightUpperArm.rotation.z = -0.25;
    rightUpperArm.rotation.x = -0.3;
    rightUpperArm.name = "rightUpperArm";
    group.add(rightUpperArm);
    const rightElbow = new THREE.Mesh(elbowGeo, robeMat);
    rightElbow.position.set(0.47, 0.98, -0.15);
    group.add(rightElbow);
    const rightForeArm = new THREE.Mesh(foreArmGeo, robeMat);
    rightForeArm.position.set(0.48, 0.85, -0.28);
    rightForeArm.rotation.x = -0.6;
    rightForeArm.name = "rightForeArm";
    group.add(rightForeArm);
    const rightBracer = new THREE.Mesh(bracerGeo, accentMat);
    rightBracer.position.set(0.48, 0.83, -0.3);
    group.add(rightBracer);

    // --- HANDS (with fingers) ---
    const handGeo = new THREE.SphereGeometry(0.045, 6, 6);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(-0.48, 0.72, -0.15);
    group.add(leftHand);
    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0.48, 0.72, -0.42);
    group.add(rightHand);
    // Finger detail (small cylinders grouped on hands)
    const fingerGeo = new THREE.CylinderGeometry(0.01, 0.008, 0.05, 4);
    for (let fi = 0; fi < 4; fi++) {
      const angle = ((fi - 1.5) / 4) * 0.3;
      const lf = new THREE.Mesh(fingerGeo, skinMat);
      lf.position.set(-0.48 + Math.sin(angle) * 0.03, 0.695, -0.15 + Math.cos(angle) * 0.03 - fi * 0.01);
      group.add(lf);
      const rf = new THREE.Mesh(fingerGeo, skinMat);
      rf.position.set(0.48 + Math.sin(angle) * 0.03, 0.695, -0.42 + Math.cos(angle) * 0.03 - fi * 0.01);
      group.add(rf);
    }

    // --- WAND (detailed, class-themed) ---
    const wandGroup = new THREE.Group();
    wandGroup.name = "wandGroup";
    // Wand shaft
    const wandShaftGeo = new THREE.CylinderGeometry(0.02, 0.028, 0.65, 6);
    const wandShaftMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.5 });
    const wandShaft = new THREE.Mesh(wandShaftGeo, wandShaftMat);
    wandShaft.position.y = 0;
    wandGroup.add(wandShaft);
    // Grip rings
    const wGripGeo = new THREE.TorusGeometry(0.032, 0.006, 4, 8);
    const wGripMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.3 });
    for (let gi = 0; gi < 3; gi++) {
      const grip = new THREE.Mesh(wGripGeo, wGripMat);
      grip.position.y = -0.15 + gi * 0.08;
      wandGroup.add(grip);
    }
    // Guard
    const wGuardGeo = new THREE.BoxGeometry(0.1, 0.015, 0.015);
    const wGuard = new THREE.Mesh(wGuardGeo, accentMat);
    wGuard.position.y = 0.08;
    wandGroup.add(wGuard);
    // Wand tip orb (class colored, pulsing via name)
    const activeWand = this._getPlayerActiveWand(player);
    const tipGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const tipMat = new THREE.MeshBasicMaterial({ color: activeWand.projectileColor, transparent: true, opacity: 0.9 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = 0.35;
    tip.name = "wandTip";
    wandGroup.add(tip);
    // Outer glow ring around tip
    const tipRingGeo = new THREE.TorusGeometry(0.09, 0.008, 4, 12);
    const tipRingMat = new THREE.MeshBasicMaterial({ color: activeWand.projectileColor, transparent: true, opacity: 0.3 });
    const tipRing = new THREE.Mesh(tipRingGeo, tipRingMat);
    tipRing.position.y = 0.35;
    tipRing.name = "wandTipRing";
    wandGroup.add(tipRing);
    // Prongs around tip
    const prongGeo = new THREE.ConeGeometry(0.008, 0.06, 4);
    const prongMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.2, metalness: 0.7 });
    for (let pi = 0; pi < 3; pi++) {
      const pAngle = (pi / 3) * Math.PI * 2;
      const prong = new THREE.Mesh(prongGeo, prongMat);
      prong.position.set(Math.cos(pAngle) * 0.04, 0.3, Math.sin(pAngle) * 0.04);
      prong.rotation.z = Math.cos(pAngle) * 0.35;
      prong.rotation.x = Math.sin(pAngle) * 0.35;
      wandGroup.add(prong);
    }
    wandGroup.position.set(0.46, 0.58, -0.55);
    wandGroup.rotation.x = -0.8;
    group.add(wandGroup);

    // --- CLASS-SPECIFIC VISUAL ELEMENTS ---
    this._addClassSpecificVisuals(group, cls, player);

    // --- TEAM GLOW RING at feet ---
    const glowRingGeo = new THREE.TorusGeometry(0.5, 0.025, 4, 20);
    const glowRingMat = new THREE.MeshBasicMaterial({ color: teamColor, transparent: true, opacity: 0.5 });
    const glowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.y = 0.02;
    glowRing.name = "teamRing";
    group.add(glowRing);

    // --- BREATHING/IDLE ANIMATION reference point ---
    group.userData.idleTime = Math.random() * Math.PI * 2; // randomize start phase
    group.castShadow = true;
    return group;
  }

  private _addClassSpecificVisuals(group: THREE.Group, cls: MageClassDef, player: MWPlayer): void {
    // Battlemage: shield on back, sword hilt accent
    if (cls.id === "battlemage") {
      // Shield on back
      const shieldGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.03, 8);
      const shieldMat = new THREE.MeshStandardMaterial({ color: cls.accentColor, roughness: 0.3, metalness: 0.7 });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.set(0.15, 1.05, 0.3);
      shield.rotation.x = Math.PI / 2;
      shield.rotation.z = 0.2;
      group.add(shield);
      // Shield emblem (team colored cross)
      const emblemGeo = new THREE.BoxGeometry(0.14, 0.03, 0.008);
      const emblemMat = new THREE.MeshBasicMaterial({ color: player.team === 0 ? 0x4488ff : 0xff4444 });
      const emH = new THREE.Mesh(emblemGeo, emblemMat);
      emH.position.set(0.15, 1.05, 0.285);
      emH.rotation.z = 0.2;
      group.add(emH);
      const emV = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.008), emblemMat);
      emV.position.set(0.15, 1.05, 0.285);
      emV.rotation.z = 0.2;
      group.add(emV);
    }
    // Pyromancer: flame particles orbiting, fiery glow
    if (cls.id === "pyromancer") {
      // Orbiting embers (small spheres that will be animated)
      for (let i = 0; i < 4; i++) {
        const emberGeo = new THREE.SphereGeometry(0.02, 4, 4);
        const emberMat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xff6600 : 0xff2200, transparent: true, opacity: 0.8 });
        const ember = new THREE.Mesh(emberGeo, emberMat);
        ember.name = `pyroEmber_${i}`;
        ember.position.set(0, 1.0, 0);
        group.add(ember);
      }
    }
    // Cryomancer: frost crystals floating, icy shimmer
    if (cls.id === "cryomancer") {
      for (let i = 0; i < 3; i++) {
        const crystalGeo = new THREE.OctahedronGeometry(0.025);
        const crystalMat = new THREE.MeshBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 0.6 });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.name = `cryoCrystal_${i}`;
        crystal.position.set(0, 1.2, 0);
        group.add(crystal);
      }
    }
    // Stormcaller: lightning sparks jumping
    if (cls.id === "stormcaller") {
      for (let i = 0; i < 3; i++) {
        const sparkGeo = new THREE.SphereGeometry(0.015, 4, 4);
        const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffff44, transparent: true, opacity: 0.7 });
        const spark = new THREE.Mesh(sparkGeo, sparkMat);
        spark.name = `stormSpark_${i}`;
        spark.position.set(0, 1.0, 0);
        group.add(spark);
      }
    }
    // Shadowmancer: dark mist swirling at feet
    if (cls.id === "shadowmancer") {
      for (let i = 0; i < 5; i++) {
        const mistGeo = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 4, 4);
        const mistMat = new THREE.MeshBasicMaterial({ color: 0x220044, transparent: true, opacity: 0.3 });
        const mist = new THREE.Mesh(mistGeo, mistMat);
        mist.name = `shadowMist_${i}`;
        mist.position.set((Math.random() - 0.5) * 0.6, 0.1 + Math.random() * 0.2, (Math.random() - 0.5) * 0.6);
        group.add(mist);
      }
    }
    // Druid: vine wrappings on arms, leaf particles
    if (cls.id === "druid") {
      // Vines on left arm
      const vineGeo = new THREE.TorusGeometry(0.08, 0.01, 4, 8, Math.PI * 1.5);
      const vineMat = new THREE.MeshStandardMaterial({ color: 0x338822, roughness: 0.8 });
      for (let vi = 0; vi < 3; vi++) {
        const vine = new THREE.Mesh(vineGeo, vineMat);
        vine.position.set(-0.48, 0.85 + vi * 0.1, -0.05);
        vine.rotation.y = vi * 0.5;
        group.add(vine);
      }
      // Floating leaves
      for (let i = 0; i < 3; i++) {
        const leafGeo = new THREE.BoxGeometry(0.03, 0.015, 0.02);
        const leafMat = new THREE.MeshBasicMaterial({ color: 0x44aa22, transparent: true, opacity: 0.7 });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.name = `druidLeaf_${i}`;
        leaf.position.set(0, 1.5, 0);
        group.add(leaf);
      }
    }
    // Warlock: dark aura, soul orbs
    if (cls.id === "warlock") {
      for (let i = 0; i < 3; i++) {
        const orbGeo = new THREE.SphereGeometry(0.02, 4, 4);
        const orbMat = new THREE.MeshBasicMaterial({ color: 0xcc2244, transparent: true, opacity: 0.6 });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.name = `warlockOrb_${i}`;
        orb.position.set(0, 1.0, 0);
        group.add(orb);
      }
    }
    // Archmage: staff glow rings, arcane symbols
    if (cls.id === "archmage") {
      // Arcane orbiting rune rings
      for (let i = 0; i < 2; i++) {
        const ringGeo = new THREE.TorusGeometry(0.3 + i * 0.15, 0.008, 4, 16);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xddaaff, transparent: true, opacity: 0.2 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.name = `archmageRing_${i}`;
        ring.position.y = 1.0;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
      }
    }
  }

  private _addHat(group: THREE.Group, cls: MageClassDef): void {
    const accentMat = new THREE.MeshStandardMaterial({ color: cls.accentColor, roughness: 0.5, metalness: 0.3 });

    switch (cls.hatStyle) {
      case "pointy": {
        const hatGeo = new THREE.ConeGeometry(0.25, 0.6, 8);
        const hat = new THREE.Mesh(hatGeo, accentMat);
        hat.position.y = 2.0;
        group.add(hat);
        const brimGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.04, 12);
        const brim = new THREE.Mesh(brimGeo, accentMat);
        brim.position.y = 1.72;
        group.add(brim);
        break;
      }
      case "hood": {
        const hoodGeo = new THREE.SphereGeometry(0.28, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const hood = new THREE.Mesh(hoodGeo, accentMat);
        hood.position.y = 1.65;
        hood.scale.set(1, 1.2, 1.3);
        group.add(hood);
        break;
      }
      case "crown": {
        const crownGeo = new THREE.TorusGeometry(0.22, 0.04, 6, 8);
        const crown = new THREE.Mesh(crownGeo, accentMat);
        crown.position.y = 1.82;
        crown.rotation.x = Math.PI / 2;
        group.add(crown);
        const spikeGeo = new THREE.ConeGeometry(0.03, 0.15, 4);
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const spike = new THREE.Mesh(spikeGeo, accentMat);
          spike.position.set(Math.cos(angle) * 0.22, 1.9, Math.sin(angle) * 0.22);
          group.add(spike);
        }
        break;
      }
      case "circlet": {
        const circletGeo = new THREE.TorusGeometry(0.24, 0.025, 6, 12);
        const circlet = new THREE.Mesh(circletGeo, accentMat);
        circlet.position.y = 1.78;
        circlet.rotation.x = Math.PI / 2;
        group.add(circlet);
        const gemGeo = new THREE.OctahedronGeometry(0.05);
        const gemMat = new THREE.MeshBasicMaterial({ color: cls.accentColor });
        const gem = new THREE.Mesh(gemGeo, gemMat);
        gem.position.set(0, 1.82, -0.24);
        group.add(gem);
        break;
      }
      case "skull": {
        const skullGeo = new THREE.SphereGeometry(0.22, 8, 8);
        const skullMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.6 });
        const skull = new THREE.Mesh(skullGeo, skullMat);
        skull.position.y = 1.65;
        skull.scale.set(1, 1.1, 1);
        group.add(skull);
        const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
        const eyeMat = new THREE.MeshBasicMaterial({ color: cls.accentColor });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.08, 1.68, -0.18);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.08, 1.68, -0.18);
        group.add(rightEye);
        break;
      }
      case "helm": {
        const helmGeo = new THREE.BoxGeometry(0.42, 0.35, 0.42);
        const helmMat = new THREE.MeshStandardMaterial({ color: cls.accentColor, roughness: 0.3, metalness: 0.7 });
        const helm = new THREE.Mesh(helmGeo, helmMat);
        helm.position.y = 1.7;
        group.add(helm);
        const slitGeo = new THREE.BoxGeometry(0.3, 0.04, 0.02);
        const slitMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const slit = new THREE.Mesh(slitGeo, slitMat);
        slit.position.set(0, 1.68, -0.22);
        group.add(slit);
        break;
      }
    }
  }

  private _buildNameTag(name: string, team: 0 | 1): THREE.Sprite {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = team === 0 ? "#88bbff" : "#ff8888";
    ctx.fillText(name, 128, 40);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.0, 0.5, 1);
    return sprite;
  }

  private _buildVehicleMesh(veh: MWVehicle): THREE.Group {
    const def = getVehicleDef(veh.defId);
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: def.bodyColor, roughness: 0.6, metalness: 0.3 });
    const accentMat = new THREE.MeshStandardMaterial({ color: def.accentColor, roughness: 0.4, metalness: 0.5 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });

    if (def.type === "ground") {
      // Organic rounded body
      const bodyGeo = new THREE.SphereGeometry(1, 10, 8);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.scale.set(def.scaleX * 0.45, def.scaleY * 0.4, def.scaleZ * 0.45);
      body.castShadow = true;
      group.add(body);

      // Lighter underbelly
      const bellyMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 1.25), roughness: 0.7 });
      const bellyGeo = new THREE.SphereGeometry(1, 8, 6);
      const belly = new THREE.Mesh(bellyGeo, bellyMat);
      belly.scale.set(def.scaleX * 0.38, def.scaleY * 0.28, def.scaleZ * 0.4);
      belly.position.y = -def.scaleY * 0.1;
      group.add(belly);

      // Shoulder / hip muscle bulges
      const muscleMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.92), roughness: 0.65 });
      for (const [mx, mz] of [[-1, -0.25], [1, -0.25], [-1, 0.2], [1, 0.2]]) {
        const musc = new THREE.Mesh(new THREE.SphereGeometry(def.scaleX * 0.18, 6, 5), muscleMat);
        musc.scale.set(0.7, 0.9, 1.0);
        musc.position.set(mx * def.scaleX * 0.32, def.scaleY * 0.05, mz * def.scaleZ);
        group.add(musc);
      }

      // --- Per-animal head & distinctive features ---
      if (def.id === "war_rhino") {
        // Wedge-shaped rhino head
        const headGeo = new THREE.SphereGeometry(def.scaleX * 0.28, 8, 6);
        const headMesh = new THREE.Mesh(headGeo, bodyMat);
        headMesh.scale.set(0.9, 0.7, 1.3);
        headMesh.position.set(0, def.scaleY * 0.05, -def.scaleZ * 0.5);
        headMesh.castShadow = true;
        group.add(headMesh);
        // Jaw / lower head
        const jawGeo = new THREE.SphereGeometry(def.scaleX * 0.22, 6, 4);
        const jaw = new THREE.Mesh(jawGeo, darkenColor(def.bodyColor, 0.9) as any === 0 ? bodyMat : new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 1.1), roughness: 0.7 }));
        jaw.scale.set(0.8, 0.5, 1.1);
        jaw.position.set(0, -def.scaleY * 0.08, -def.scaleZ * 0.52);
        group.add(jaw);
        // Large front horn
        const hornMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.5 });
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9, 6), hornMat);
        horn.position.set(0, def.scaleY * 0.25, -def.scaleZ * 0.6);
        horn.rotation.x = -Math.PI / 4;
        group.add(horn);
        // Smaller second horn
        const horn2 = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 6), hornMat);
        horn2.position.set(0, def.scaleY * 0.28, -def.scaleZ * 0.45);
        horn2.rotation.x = -Math.PI / 5;
        group.add(horn2);
        // Small rounded ears
        const earGeo = new THREE.SphereGeometry(0.1, 5, 4);
        for (const ex of [-0.22, 0.22]) {
          const ear = new THREE.Mesh(earGeo, bodyMat);
          ear.scale.set(0.6, 1.0, 0.5);
          ear.position.set(ex, def.scaleY * 0.22, -def.scaleZ * 0.35);
          group.add(ear);
        }
        // Wrinkled skin folds (ridges across body)
        const foldGeo = new THREE.TorusGeometry(def.scaleX * 0.4, 0.04, 4, 12, Math.PI);
        const foldMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.85), roughness: 0.8 });
        for (let fi = 0; fi < 3; fi++) {
          const fold = new THREE.Mesh(foldGeo, foldMat);
          fold.position.set(0, def.scaleY * 0.15, -def.scaleZ * 0.15 + fi * def.scaleZ * 0.2);
          fold.rotation.y = Math.PI / 2;
          group.add(fold);
        }
        // Thick hide ridges along spine
        const ridgeMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.75), roughness: 0.7 });
        for (let ri = 0; ri < 4; ri++) {
          const ridge = new THREE.Mesh(new THREE.BoxGeometry(def.scaleX * 0.2, 0.06, 0.15), ridgeMat);
          ridge.position.set(0, def.scaleY * 0.42, -def.scaleZ * 0.2 + ri * def.scaleZ * 0.15);
          group.add(ridge);
        }
      } else if (def.id === "iron_tortoise") {
        // Dome shell on top (half-sphere)
        const shellGeo = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const shellMat = new THREE.MeshStandardMaterial({ color: def.accentColor, roughness: 0.4, metalness: 0.6 });
        const shell = new THREE.Mesh(shellGeo, shellMat);
        shell.scale.set(def.scaleX * 0.52, def.scaleY * 0.45, def.scaleZ * 0.48);
        shell.position.y = def.scaleY * 0.05;
        shell.castShadow = true;
        group.add(shell);
        // Hexagonal shell plate pattern
        const plateMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.accentColor, 0.8), roughness: 0.45, metalness: 0.5 });
        for (let pi = 0; pi < 6; pi++) {
          const angle = (pi / 6) * Math.PI * 2;
          const plate = new THREE.Mesh(new THREE.CylinderGeometry(def.scaleX * 0.12, def.scaleX * 0.14, 0.04, 6), plateMat);
          plate.position.set(Math.sin(angle) * def.scaleX * 0.25, def.scaleY * 0.38, Math.cos(angle) * def.scaleZ * 0.2);
          plate.rotation.x = Math.PI / 2;
          group.add(plate);
        }
        // Central plate on top
        const centerPlate = new THREE.Mesh(new THREE.CylinderGeometry(def.scaleX * 0.15, def.scaleX * 0.15, 0.05, 6), plateMat);
        centerPlate.position.y = def.scaleY * 0.45;
        group.add(centerPlate);
        // Shell rim (ridge around shell edge)
        const rimGeo = new THREE.TorusGeometry(def.scaleX * 0.48, 0.06, 4, 16);
        const rimMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.accentColor, 0.65), roughness: 0.5, metalness: 0.4 });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = def.scaleY * 0.05;
        rim.scale.set(1, def.scaleZ / def.scaleX * 0.95, 1);
        group.add(rim);
        // Retracted head peeking out
        const headGeo = new THREE.SphereGeometry(def.scaleX * 0.2, 8, 6);
        const headMesh = new THREE.Mesh(headGeo, bodyMat);
        headMesh.scale.set(0.8, 0.7, 1.1);
        headMesh.position.set(0, -def.scaleY * 0.05, -def.scaleZ * 0.5);
        group.add(headMesh);
        // Beak-like mouth
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 4), new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.4 }));
        beak.position.set(0, -def.scaleY * 0.1, -def.scaleZ * 0.6);
        beak.rotation.x = -Math.PI / 2;
        group.add(beak);
        // Wrinkled neck skin folds
        for (let ni = 0; ni < 2; ni++) {
          const neckFold = new THREE.Mesh(new THREE.TorusGeometry(def.scaleX * 0.16, 0.025, 4, 8), new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.85), roughness: 0.8 }));
          neckFold.rotation.y = Math.PI / 2;
          neckFold.position.set(0, -def.scaleY * 0.04, -def.scaleZ * 0.42 - ni * 0.1);
          group.add(neckFold);
        }
      } else if (def.id === "dire_boar") {
        // Boar head - large, muscular
        const headGeo = new THREE.SphereGeometry(def.scaleX * 0.3, 8, 6);
        const headMesh = new THREE.Mesh(headGeo, bodyMat);
        headMesh.scale.set(0.8, 0.9, 1.4);
        headMesh.position.set(0, def.scaleY * 0.05, -def.scaleZ * 0.48);
        headMesh.castShadow = true;
        group.add(headMesh);
        // Snout / nose disc
        const snoutMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 1.2), roughness: 0.8 });
        const snout = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), snoutMat);
        snout.scale.set(1, 0.75, 1.1);
        snout.position.set(0, -def.scaleY * 0.02, -def.scaleZ * 0.62);
        group.add(snout);
        // Flat nose disc
        const nosePad = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 8), new THREE.MeshStandardMaterial({ color: 0x553333, roughness: 0.9 }));
        nosePad.position.set(0, -def.scaleY * 0.02, -def.scaleZ * 0.68);
        nosePad.rotation.x = Math.PI / 2;
        group.add(nosePad);
        // Large curved tusks
        const tuskMat = new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.3, metalness: 0.2 });
        for (const [tx, rz] of [[-0.16, Math.PI / 6], [0.16, -Math.PI / 6]] as [number, number][]) {
          const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.5, 6), tuskMat);
          tusk.position.set(tx, -def.scaleY * 0.05, -def.scaleZ * 0.58);
          tusk.rotation.z = rz;
          tusk.rotation.x = -Math.PI / 3.5;
          group.add(tusk);
        }
        // Pointed ears sticking up
        const earGeo = new THREE.ConeGeometry(0.08, 0.22, 4);
        for (const ex of [-0.2, 0.2]) {
          const ear = new THREE.Mesh(earGeo, bodyMat);
          ear.position.set(ex, def.scaleY * 0.3, -def.scaleZ * 0.33);
          ear.rotation.z = ex < 0 ? 0.2 : -0.2;
          group.add(ear);
        }
        // Bristle / mohawk ridge along spine
        const bristleMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.5), roughness: 0.9 });
        for (let bi = 0; bi < 10; bi++) {
          const h = 0.12 + Math.sin(bi / 9 * Math.PI) * 0.1;
          const bristle = new THREE.Mesh(new THREE.ConeGeometry(0.025, h, 3), bristleMat);
          bristle.position.set(0, def.scaleY * 0.42, -def.scaleZ * 0.35 + bi * def.scaleZ * 0.08);
          group.add(bristle);
        }
        // Muscular neck hump
        const hump = new THREE.Mesh(new THREE.SphereGeometry(def.scaleX * 0.2, 6, 5), muscleMat);
        hump.scale.set(1.0, 0.8, 1.2);
        hump.position.set(0, def.scaleY * 0.25, -def.scaleZ * 0.25);
        group.add(hump);
      } else {
        // war_elephant
        // Large head
        const headGeo = new THREE.SphereGeometry(def.scaleX * 0.27, 8, 6);
        const headMesh = new THREE.Mesh(headGeo, bodyMat);
        headMesh.scale.set(0.9, 1.0, 0.9);
        headMesh.position.set(0, def.scaleY * 0.18, -def.scaleZ * 0.45);
        headMesh.castShadow = true;
        group.add(headMesh);
        // Domed forehead
        const foreheadGeo = new THREE.SphereGeometry(def.scaleX * 0.2, 6, 5);
        const forehead = new THREE.Mesh(foreheadGeo, bodyMat);
        forehead.position.set(0, def.scaleY * 0.3, -def.scaleZ * 0.42);
        forehead.scale.set(1, 0.8, 0.7);
        group.add(forehead);
        // Trunk (segmented, curving downward)
        const trunkMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 1.1), roughness: 0.7 });
        for (let ti = 0; ti < 6; ti++) {
          const radius = 0.12 - ti * 0.013;
          const seg = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 0.01, 0.2, 6), trunkMat);
          seg.position.set(0, def.scaleY * 0.08 - ti * 0.16, -def.scaleZ * 0.52 - ti * 0.05);
          seg.rotation.x = -Math.PI / 8 - ti * 0.12;
          group.add(seg);
        }
        // Trunk tip (curled)
        const trunkTip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), trunkMat);
        trunkTip.position.set(0, def.scaleY * -0.8, -def.scaleZ * 0.72);
        group.add(trunkTip);
        // Large fan-shaped ears
        const earMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 1.12), roughness: 0.7, side: THREE.DoubleSide });
        for (const ex of [-1, 1]) {
          const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), earMat);
          ear.scale.set(0.025, def.scaleY * 0.25, def.scaleY * 0.2);
          ear.position.set(ex * def.scaleX * 0.4, def.scaleY * 0.15, -def.scaleZ * 0.32);
          ear.name = ex < 0 ? "leftEar" : "rightEar";
          group.add(ear);
          // Ear vein detail (inner line)
          const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, def.scaleY * 0.3, 4), new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.8), roughness: 0.7 }));
          vein.position.set(ex * def.scaleX * 0.39, def.scaleY * 0.15, -def.scaleZ * 0.32);
          group.add(vein);
        }
        // Curved ivory tusks
        const tuskMat = new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.3, metalness: 0.1 });
        for (const [tx, rz] of [[-0.22, Math.PI / 8], [0.22, -Math.PI / 8]] as [number, number][]) {
          const tusk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.08, 1.3, 6), tuskMat);
          tusk.position.set(tx, -def.scaleY * 0.15, -def.scaleZ * 0.5);
          tusk.rotation.z = rz;
          tusk.rotation.x = -Math.PI / 6;
          group.add(tusk);
          // Tusk tip
          const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 5), tuskMat);
          tip.position.set(tx + rz * 0.6, -def.scaleY * 0.5, -def.scaleZ * 0.65);
          tip.rotation.x = -Math.PI / 4;
          tip.rotation.z = rz * 0.5;
          group.add(tip);
        }
        // Wrinkled skin (torus rings)
        const wrinkleMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.85), roughness: 0.8 });
        for (let wi = 0; wi < 4; wi++) {
          const wrinkle = new THREE.Mesh(new THREE.TorusGeometry(def.scaleX * 0.38, 0.03, 4, 12), wrinkleMat);
          wrinkle.rotation.y = Math.PI / 2;
          wrinkle.position.set(0, 0, -def.scaleZ * 0.15 + wi * def.scaleZ * 0.13);
          group.add(wrinkle);
        }
      }

      // Eyes with whites (all ground animals)
      const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
      const eyeWhiteGeo = new THREE.SphereGeometry(0.08, 6, 6);
      const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
      const eyeY = def.id === "iron_tortoise" ? -def.scaleY * 0.02 : def.scaleY * 0.18;
      const eyeZ = def.id === "iron_tortoise" ? -def.scaleZ * 0.52 : -def.scaleZ * 0.5;
      for (const ex of [-0.15, 0.15]) {
        const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
        eyeWhite.position.set(ex, eyeY, eyeZ);
        group.add(eyeWhite);
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(ex, eyeY, eyeZ - 0.04);
        group.add(eye);
      }

      // Nostrils
      const nostrilGeo = new THREE.SphereGeometry(0.04, 4, 4);
      const nostrilMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
      const nostrilZ = def.id === "iron_tortoise" ? -def.scaleZ * 0.61 : def.id === "dire_boar" ? -def.scaleZ * 0.69 : -def.scaleZ * 0.65;
      const nostrilY = def.id === "iron_tortoise" ? -def.scaleY * 0.08 : def.scaleY * 0.02;
      for (const nx of [-0.07, 0.07]) {
        const nostril = new THREE.Mesh(nostrilGeo, nostrilMat);
        nostril.position.set(nx, nostrilY, nostrilZ);
        group.add(nostril);
      }

      // 4 legs with joints, muscles, and hooves
      const legThick = def.id === "war_elephant" ? 0.22 : def.id === "iron_tortoise" ? 0.2 : 0.16;
      const upperLegGeo = new THREE.CylinderGeometry(legThick * 0.85, legThick, def.scaleY * 0.32, 6);
      const lowerLegGeo = new THREE.CylinderGeometry(legThick, legThick * 0.75, def.scaleY * 0.28, 6);
      const jointGeo = new THREE.SphereGeometry(legThick * 1.05, 6, 4);
      const hoofGeo = new THREE.CylinderGeometry(legThick * 1.1, legThick * 1.2, 0.08, 6);
      const hoofMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
      const offsets = [
        [-def.scaleX * 0.32, -def.scaleZ * 0.28],
        [def.scaleX * 0.32, -def.scaleZ * 0.28],
        [-def.scaleX * 0.32, def.scaleZ * 0.25],
        [def.scaleX * 0.32, def.scaleZ * 0.25],
      ];
      for (const [lx, lz] of offsets) {
        const upper = new THREE.Mesh(upperLegGeo, bodyMat);
        upper.position.set(lx, -def.scaleY * 0.42, lz);
        group.add(upper);
        const joint = new THREE.Mesh(jointGeo, accentMat);
        joint.position.set(lx, -def.scaleY * 0.58, lz);
        group.add(joint);
        const lower = new THREE.Mesh(lowerLegGeo, bodyMat);
        lower.position.set(lx, -def.scaleY * 0.73, lz);
        group.add(lower);
        const hoof = new THREE.Mesh(hoofGeo, hoofMat);
        hoof.position.set(lx, -def.scaleY * 0.88, lz);
        group.add(hoof);
      }

      // Tail (per-animal variation)
      if (def.id === "iron_tortoise") {
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 5), bodyMat);
        tail.position.set(0, -def.scaleY * 0.1, def.scaleZ * 0.5);
        tail.rotation.x = Math.PI / 4;
        group.add(tail);
      } else if (def.id === "war_elephant") {
        // Thin rope-like tail with tuft
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.9, 4), bodyMat);
        tail.position.set(0, -def.scaleY * 0.1, def.scaleZ * 0.48);
        tail.rotation.x = Math.PI / 4;
        group.add(tail);
        const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.5), roughness: 0.9 }));
        tuft.position.set(0, -def.scaleY * 0.4, def.scaleZ * 0.72);
        group.add(tuft);
      } else if (def.id === "dire_boar") {
        // Short curly tail
        const tail = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 4, 8, Math.PI * 1.5), bodyMat);
        tail.position.set(0, def.scaleY * 0.1, def.scaleZ * 0.48);
        tail.rotation.y = Math.PI / 2;
        group.add(tail);
      } else {
        // Rhino - medium tail
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 6), accentMat);
        tail.position.set(0, def.scaleY * 0.05, def.scaleZ * 0.5);
        tail.rotation.x = Math.PI / 3;
        group.add(tail);
      }

      // Armor plating on sides
      const plateGeo = new THREE.BoxGeometry(0.08, def.scaleY * 0.5, def.scaleZ * 0.35);
      const plateMat = new THREE.MeshStandardMaterial({ color: def.accentColor, roughness: 0.3, metalness: 0.7 });
      const plateL = new THREE.Mesh(plateGeo, plateMat);
      plateL.position.set(-def.scaleX * 0.48, 0.05, 0);
      group.add(plateL);
      const plateR = new THREE.Mesh(plateGeo, plateMat);
      plateR.position.set(def.scaleX * 0.48, 0.05, 0);
      group.add(plateR);

      // Saddle / rider seat
      const saddleGeo = new THREE.BoxGeometry(def.scaleX * 0.35, 0.08, def.scaleZ * 0.25);
      const saddleMat = new THREE.MeshStandardMaterial({ color: 0x442200, roughness: 0.8 });
      const saddle = new THREE.Mesh(saddleGeo, saddleMat);
      saddle.position.y = def.scaleY * 0.44;
      group.add(saddle);

      // Turret on top
      const turretGeo = new THREE.BoxGeometry(def.scaleX * 0.4, def.scaleY * 0.3, def.scaleZ * 0.3);
      const turret = new THREE.Mesh(turretGeo, accentMat);
      turret.position.y = def.scaleY * 0.6;
      turret.castShadow = true;
      group.add(turret);

      // Turret rivet details
      const rivetGeo = new THREE.SphereGeometry(0.025, 4, 4);
      const rivetMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.8 });
      for (const corner of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const rivet = new THREE.Mesh(rivetGeo, rivetMat);
        rivet.position.set(
          corner[0] * def.scaleX * 0.18,
          def.scaleY * 0.77,
          corner[1] * def.scaleZ * 0.13,
        );
        group.add(rivet);
      }

      // Barrel with muzzle brake
      const barrelGeo = new THREE.CylinderGeometry(0.1, 0.1, def.scaleZ * 0.5, 6);
      const barrel = new THREE.Mesh(barrelGeo, darkMat);
      barrel.position.set(0, def.scaleY * 0.6, -def.scaleZ * 0.4);
      barrel.rotation.x = Math.PI / 2;
      group.add(barrel);
      const muzzleGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.08, 6);
      const muzzle = new THREE.Mesh(muzzleGeo, darkMat);
      muzzle.position.set(0, def.scaleY * 0.6, -def.scaleZ * 0.65);
      muzzle.rotation.x = Math.PI / 2;
      group.add(muzzle);

    } else if (def.type === "air_hover") {
      // Organic serpentine body
      const bodyGeo = new THREE.SphereGeometry(1, 10, 8);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.scale.set(def.scaleX * 0.4, def.scaleY * 0.35, def.scaleZ * 0.45);
      body.castShadow = true;
      group.add(body);

      // Belly ridge (lighter underside)
      const bellyMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 1.2), roughness: 0.65 });
      const bellyGeo = new THREE.SphereGeometry(1, 8, 6);
      const belly = new THREE.Mesh(bellyGeo, bellyMat);
      belly.scale.set(def.scaleX * 0.33, def.scaleY * 0.22, def.scaleZ * 0.4);
      belly.position.y = -def.scaleY * 0.08;
      group.add(belly);

      // --- Per-animal head & features ---
      if (def.id === "drake") {
        // Neck segment
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, def.scaleZ * 0.2, 6), bodyMat);
        neck.position.set(0, def.scaleY * 0.05, -def.scaleZ * 0.4);
        neck.rotation.x = Math.PI / 2;
        group.add(neck);
        // Angular reptilian head
        const headGeo = new THREE.SphereGeometry(def.scaleX * 0.25, 8, 6);
        const headMesh = new THREE.Mesh(headGeo, accentMat);
        headMesh.scale.set(0.75, 0.65, 1.3);
        headMesh.position.set(0, def.scaleY * 0.12, -def.scaleZ * 0.55);
        group.add(headMesh);
        // Lower jaw
        const jaw = new THREE.Mesh(new THREE.SphereGeometry(def.scaleX * 0.18, 6, 4), bodyMat);
        jaw.scale.set(0.7, 0.35, 1.2);
        jaw.position.set(0, -def.scaleY * 0.02, -def.scaleZ * 0.56);
        group.add(jaw);
        // Snout ridge
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, def.scaleZ * 0.15), accentMat);
        snout.position.set(0, def.scaleY * 0.18, -def.scaleZ * 0.6);
        group.add(snout);
        // Backward-curving horns
        const hornMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.accentColor, 0.6), roughness: 0.4 });
        for (const hx of [-0.12, 0.12]) {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.35, 5), hornMat);
          horn.position.set(hx, def.scaleY * 0.25, -def.scaleZ * 0.42);
          horn.rotation.x = Math.PI / 4;
          horn.rotation.z = hx < 0 ? 0.15 : -0.15;
          group.add(horn);
        }
        // Spine ridges along back
        const spineMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.7), roughness: 0.6 });
        for (let si = 0; si < 7; si++) {
          const h = 0.1 + Math.sin(si / 6 * Math.PI) * 0.08;
          const spine = new THREE.Mesh(new THREE.ConeGeometry(0.035, h, 4), spineMat);
          spine.position.set(0, def.scaleY * 0.36, -def.scaleZ * 0.3 + si * def.scaleZ * 0.1);
          group.add(spine);
        }
        // Clawed feet (hanging below)
        const clawMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4 });
        for (const [cx, cz] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.15], [0.3, 0.15]]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, def.scaleY * 0.3, 4), bodyMat);
          leg.position.set(cx * def.scaleX, -def.scaleY * 0.35, cz * def.scaleZ);
          group.add(leg);
          for (let ci = 0; ci < 3; ci++) {
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 3), clawMat);
            claw.position.set(cx * def.scaleX + (ci - 1) * 0.04, -def.scaleY * 0.52, cz * def.scaleZ - 0.03);
            claw.rotation.x = -Math.PI / 6;
            group.add(claw);
          }
        }
        // Spiked tail
        const tailBase = new THREE.Mesh(new THREE.ConeGeometry(0.15, def.scaleZ * 0.45, 6), accentMat);
        tailBase.position.set(0, 0.05, def.scaleZ * 0.5);
        tailBase.rotation.x = Math.PI / 2;
        group.add(tailBase);
        const tailSpike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), spineMat);
        tailSpike.position.set(0, 0.12, def.scaleZ * 0.72);
        group.add(tailSpike);
      } else if (def.id === "wyvern") {
        // Sleek crested head
        const headGeo = new THREE.SphereGeometry(def.scaleX * 0.25, 8, 6);
        const headMesh = new THREE.Mesh(headGeo, accentMat);
        headMesh.scale.set(0.7, 0.7, 1.4);
        headMesh.position.set(0, def.scaleY * 0.12, -def.scaleZ * 0.52);
        group.add(headMesh);
        // Pointed snout
        const snout = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 5), accentMat);
        snout.position.set(0, def.scaleY * 0.08, -def.scaleZ * 0.68);
        snout.rotation.x = -Math.PI / 2;
        group.add(snout);
        // Head crest (fin on top)
        const crest = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.25), new THREE.MeshStandardMaterial({ color: def.accentColor, roughness: 0.5, side: THREE.DoubleSide }));
        crest.position.set(0, def.scaleY * 0.25, -def.scaleZ * 0.4);
        group.add(crest);
        // Small legs with talons
        const clawMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4 });
        for (const [cx, cz] of [[-0.2, 0], [0.2, 0]]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, def.scaleY * 0.25, 4), bodyMat);
          leg.position.set(cx * def.scaleX, -def.scaleY * 0.3, cz * def.scaleZ);
          group.add(leg);
          for (let ci = 0; ci < 3; ci++) {
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.1, 3), clawMat);
            claw.position.set(cx * def.scaleX + (ci - 1) * 0.035, -def.scaleY * 0.44, cz * def.scaleZ - 0.02);
            claw.rotation.x = -Math.PI / 6;
            group.add(claw);
          }
        }
        // Barbed tail
        const tailBase = new THREE.Mesh(new THREE.ConeGeometry(0.12, def.scaleZ * 0.5, 6), accentMat);
        tailBase.position.set(0, 0.05, def.scaleZ * 0.5);
        tailBase.rotation.x = Math.PI / 2;
        group.add(tailBase);
        // Tail barb (diamond-shaped)
        const barb = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.15, 4), new THREE.MeshStandardMaterial({ color: darkenColor(def.accentColor, 0.7), roughness: 0.4 }));
        barb.position.set(0, 0.05, def.scaleZ * 0.75);
        barb.rotation.x = Math.PI / 2;
        group.add(barb);
        // Dorsal spine ridges
        for (let si = 0; si < 5; si++) {
          const spine = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 3), new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.7) }));
          spine.position.set(0, def.scaleY * 0.36, -def.scaleZ * 0.2 + si * def.scaleZ * 0.12);
          group.add(spine);
        }
      } else {
        // giant_bat
        // Compact, furry body
        const furMat = new THREE.MeshStandardMaterial({ color: def.bodyColor, roughness: 0.95 });
        const furBody = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), furMat);
        furBody.scale.set(def.scaleX * 0.3, def.scaleY * 0.35, def.scaleZ * 0.3);
        furBody.position.y = 0.05;
        group.add(furBody);
        // Flat-nosed bat face
        const headGeo = new THREE.SphereGeometry(def.scaleX * 0.2, 8, 6);
        const headMesh = new THREE.Mesh(headGeo, accentMat);
        headMesh.scale.set(0.9, 0.9, 0.8);
        headMesh.position.set(0, def.scaleY * 0.1, -def.scaleZ * 0.38);
        group.add(headMesh);
        // Pug nose
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 1.3), roughness: 0.8 }));
        nose.scale.set(1.2, 0.8, 0.7);
        nose.position.set(0, def.scaleY * 0.06, -def.scaleZ * 0.45);
        group.add(nose);
        // Large pointed ears (signature bat feature)
        const earMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.accentColor, 1.1), roughness: 0.7, side: THREE.DoubleSide });
        for (const ex of [-1, 1]) {
          // Outer ear
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 4), earMat);
          ear.position.set(ex * def.scaleX * 0.15, def.scaleY * 0.38, -def.scaleZ * 0.3);
          ear.rotation.z = ex * -0.2;
          group.add(ear);
          // Inner ear (pink)
          const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 4), new THREE.MeshStandardMaterial({ color: 0x664455, roughness: 0.7 }));
          innerEar.position.set(ex * def.scaleX * 0.15, def.scaleY * 0.37, -def.scaleZ * 0.28);
          innerEar.rotation.z = ex * -0.2;
          group.add(innerEar);
        }
        // Tiny fangs
        const fangMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3 });
        for (const fx of [-0.04, 0.04]) {
          const fang = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.08, 3), fangMat);
          fang.position.set(fx, -def.scaleY * 0.05, -def.scaleZ * 0.42);
          fang.rotation.x = Math.PI;
          group.add(fang);
        }
        // Small clawed feet
        const clawMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 });
        for (const cx of [-0.15, 0.15]) {
          const foot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), clawMat);
          foot.position.set(cx * def.scaleX, -def.scaleY * 0.35, 0);
          group.add(foot);
        }
        // Short tail
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 5), bodyMat);
        tail.position.set(0, 0, def.scaleZ * 0.35);
        tail.rotation.x = Math.PI / 3;
        group.add(tail);
      }

      // Glowing eyes (all hover animals)
      const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
      const eyeWhiteGeo = new THREE.SphereGeometry(0.075, 6, 6);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
      const hEyeY = def.id === "giant_bat" ? def.scaleY * 0.15 : def.scaleY * 0.2;
      const hEyeZ = def.id === "giant_bat" ? -def.scaleZ * 0.38 : -def.scaleZ * 0.55;
      const hEyeSpread = def.id === "giant_bat" ? 0.12 : def.scaleX * 0.14;
      for (const ex of [-hEyeSpread, hEyeSpread]) {
        const ew = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
        ew.position.set(ex, hEyeY, hEyeZ);
        group.add(ew);
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(ex, hEyeY, hEyeZ - 0.035);
        group.add(eye);
      }

      // Multi-segment membrane wings with finger bones
      const wingSpan = def.id === "giant_bat" ? def.scaleX * 2.0 : def.scaleX * 1.5;
      const wingMat = new THREE.MeshStandardMaterial({
        color: def.accentColor, roughness: 0.6, side: THREE.DoubleSide,
        transparent: true, opacity: def.id === "giant_bat" ? 0.7 : 0.8,
      });
      const boneMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.7), roughness: 0.4 });
      const fingerCount = def.id === "giant_bat" ? 4 : 3;

      for (const side of [-1, 1]) {
        const wingGroup = new THREE.Group();
        wingGroup.name = side < 0 ? "leftWing" : "rightWing";
        wingGroup.position.set(side * def.scaleX * 0.3, 0, 0);

        // Main wing bone (arm)
        const armBone = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, wingSpan * 0.45, 4), boneMat);
        armBone.position.set(side * wingSpan * 0.2, 0.02, -def.scaleZ * 0.05);
        armBone.rotation.z = side * Math.PI / 2;
        wingGroup.add(armBone);

        // Finger bones radiating outward
        for (let fi = 0; fi < fingerCount; fi++) {
          const angle = (-0.3 + fi * 0.6 / (fingerCount - 1));
          const boneLen = wingSpan * (0.3 + (fi === 1 ? 0.1 : 0));
          const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.012, boneLen, 3), boneMat);
          const bx = side * (wingSpan * 0.4 + Math.cos(angle) * boneLen * 0.3);
          const bz = -def.scaleZ * 0.15 + Math.sin(angle) * boneLen * 0.5 + fi * def.scaleZ * 0.12;
          bone.position.set(bx, 0.01, bz);
          bone.rotation.z = side * (Math.PI / 2 + angle * 0.3);
          wingGroup.add(bone);
        }

        // Membrane panels between finger bones
        for (let fi = 0; fi < fingerCount; fi++) {
          const t0 = fi / fingerCount;
          const t1 = (fi + 1) / fingerCount;
          const memVerts = new Float32Array([
            0, 0, -def.scaleZ * 0.25 + t0 * def.scaleZ * 0.6,
            side * wingSpan * 0.55, 0.02, -def.scaleZ * 0.2 + t0 * def.scaleZ * 0.55,
            side * wingSpan * 0.55, 0.02, -def.scaleZ * 0.2 + t1 * def.scaleZ * 0.55,
            0, 0, -def.scaleZ * 0.25 + t0 * def.scaleZ * 0.6,
            side * wingSpan * 0.55, 0.02, -def.scaleZ * 0.2 + t1 * def.scaleZ * 0.55,
            0, 0, -def.scaleZ * 0.25 + t1 * def.scaleZ * 0.6,
          ]);
          const memGeo = new THREE.BufferGeometry();
          memGeo.setAttribute("position", new THREE.BufferAttribute(memVerts, 3));
          memGeo.computeVertexNormals();
          const mem = new THREE.Mesh(memGeo, wingMat);
          wingGroup.add(mem);
        }

        group.add(wingGroup);
      }

    } else {
      // air_fly - per-animal distinct bodies

      if (def.id === "dragon") {
        // Massive muscular body
        const bodyGeo = new THREE.SphereGeometry(1, 10, 8);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.scale.set(def.scaleX * 0.42, def.scaleY * 0.4, def.scaleZ * 0.48);
        body.castShadow = true;
        group.add(body);
        // Chest / belly
        const chestMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 1.3), roughness: 0.6 });
        const chest = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), chestMat);
        chest.scale.set(def.scaleX * 0.35, def.scaleY * 0.3, def.scaleZ * 0.4);
        chest.position.y = -def.scaleY * 0.08;
        group.add(chest);
        // Thick muscular neck
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, def.scaleZ * 0.3, 6), bodyMat);
        neck.position.set(0, def.scaleY * 0.08, -def.scaleZ * 0.42);
        neck.rotation.x = Math.PI / 2.5;
        group.add(neck);
        // Large angular head
        const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), accentMat);
        headMesh.scale.set(0.85, 0.7, 1.4);
        headMesh.position.set(0, def.scaleY * 0.2, -def.scaleZ * 0.62);
        headMesh.castShadow = true;
        group.add(headMesh);
        // Lower jaw
        const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 4), bodyMat);
        jaw.scale.set(0.75, 0.35, 1.3);
        jaw.position.set(0, def.scaleY * 0.05, -def.scaleZ * 0.63);
        group.add(jaw);
        // Snout
        const snout = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.35, 5), accentMat);
        snout.position.set(0, def.scaleY * 0.15, -def.scaleZ * 0.82);
        snout.rotation.x = -Math.PI / 2;
        group.add(snout);
        // Multiple horns (2 large + 2 small)
        const hornMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.accentColor, 0.5), roughness: 0.4 });
        for (const [hx, hl, hz] of [[-0.15, 0.5, -0.5], [0.15, 0.5, -0.5], [-0.1, 0.25, -0.42], [0.1, 0.25, -0.42]] as [number, number, number][]) {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, hl, 5), hornMat);
          horn.position.set(hx, def.scaleY * 0.35, def.scaleZ * hz);
          horn.rotation.x = Math.PI / 3.5;
          horn.rotation.z = hx < 0 ? 0.15 : -0.15;
          group.add(horn);
        }
        // Spine ridge (prominent)
        const spineMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.65), roughness: 0.6 });
        for (let si = 0; si < 10; si++) {
          const h = 0.12 + Math.sin(si / 9 * Math.PI) * 0.12;
          const spine = new THREE.Mesh(new THREE.ConeGeometry(0.04, h, 4), spineMat);
          spine.position.set(0, def.scaleY * 0.4, -def.scaleZ * 0.3 + si * def.scaleZ * 0.08);
          group.add(spine);
        }
        // Four legs with claws
        const clawMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 });
        for (const [lx, lz] of [[-0.3, -0.2], [0.3, -0.2], [-0.25, 0.2], [0.25, 0.2]]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, def.scaleY * 0.35, 5), bodyMat);
          leg.position.set(lx * def.scaleX, -def.scaleY * 0.38, lz * def.scaleZ);
          group.add(leg);
          for (let ci = 0; ci < 3; ci++) {
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.15, 3), clawMat);
            claw.position.set(lx * def.scaleX + (ci - 1) * 0.05, -def.scaleY * 0.58, lz * def.scaleZ - 0.04);
            claw.rotation.x = -Math.PI / 5;
            group.add(claw);
          }
        }
        // Long spiked tail
        const tailGeo = new THREE.ConeGeometry(0.2, def.scaleZ * 0.5, 6);
        const tail = new THREE.Mesh(tailGeo, accentMat);
        tail.position.set(0, 0.1, def.scaleZ * 0.5);
        tail.rotation.x = Math.PI / 2;
        group.add(tail);
        // Tail spikes
        for (let ti = 0; ti < 3; ti++) {
          const ts = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 3), spineMat);
          ts.position.set(0, 0.2, def.scaleZ * 0.5 + ti * 0.15);
          group.add(ts);
        }
        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.07, 6, 6);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
        for (const ex of [-0.16, 0.16]) {
          const ew = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
          ew.position.set(ex, def.scaleY * 0.25, -def.scaleZ * 0.63);
          group.add(ew);
          const eye = new THREE.Mesh(eyeGeo, eyeMat);
          eye.position.set(ex, def.scaleY * 0.25, -def.scaleZ * 0.67);
          group.add(eye);
        }
        // Nostrils with smoke hint
        for (const nx of [-0.06, 0.06]) {
          const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 4), new THREE.MeshStandardMaterial({ color: 0x222222 }));
          nostril.position.set(nx, def.scaleY * 0.12, -def.scaleZ * 0.85);
          group.add(nostril);
          const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.3 }));
          smoke.position.set(nx, def.scaleY * 0.1, -def.scaleZ * 0.9);
          group.add(smoke);
        }
        // Fire trail
        const trailGeo = new THREE.ConeGeometry(0.22, 1.2, 6);
        const trailMat = new THREE.MeshBasicMaterial({ color: def.weaponProjectileColor, transparent: true, opacity: 0.4 });
        const trail = new THREE.Mesh(trailGeo, trailMat);
        trail.position.set(0, 0, def.scaleZ * 0.72);
        trail.rotation.x = -Math.PI / 2;
        group.add(trail);

      } else if (def.id === "phoenix") {
        // Elegant streamlined bird body
        const bodyGeo = new THREE.SphereGeometry(1, 10, 8);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.scale.set(def.scaleX * 0.32, def.scaleY * 0.3, def.scaleZ * 0.4);
        body.castShadow = true;
        group.add(body);
        // Breast (lighter fiery hue)
        const breastMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 1.3), roughness: 0.5 });
        const breast = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), breastMat);
        breast.scale.set(def.scaleX * 0.28, def.scaleY * 0.25, def.scaleZ * 0.3);
        breast.position.set(0, -def.scaleY * 0.05, -def.scaleZ * 0.08);
        group.add(breast);
        // Graceful curved neck
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, def.scaleZ * 0.25, 6), bodyMat);
        neck.position.set(0, def.scaleY * 0.12, -def.scaleZ * 0.38);
        neck.rotation.x = Math.PI / 2.8;
        group.add(neck);
        // Small elegant head
        const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), accentMat);
        headMesh.scale.set(0.8, 0.75, 1.1);
        headMesh.position.set(0, def.scaleY * 0.25, -def.scaleZ * 0.55);
        group.add(headMesh);
        // Hooked beak
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), new THREE.MeshStandardMaterial({ color: 0xddaa33, roughness: 0.4 }));
        beak.position.set(0, def.scaleY * 0.2, -def.scaleZ * 0.67);
        beak.rotation.x = -Math.PI / 2.2;
        group.add(beak);
        // Head crest (flowing feathers backward)
        const crestMat = new THREE.MeshStandardMaterial({ color: def.accentColor, roughness: 0.5 });
        for (let ci = 0; ci < 5; ci++) {
          const feather = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.2 + ci * 0.05, 3), crestMat);
          feather.position.set((ci - 2) * 0.03, def.scaleY * 0.35 - ci * 0.02, -def.scaleZ * 0.45 + ci * 0.04);
          feather.rotation.x = Math.PI / 3;
          group.add(feather);
        }
        // Eyes
        for (const ex of [-0.1, 0.1]) {
          const ew = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
          ew.position.set(ex, def.scaleY * 0.28, -def.scaleZ * 0.56);
          group.add(ew);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff6600 }));
          eye.position.set(ex, def.scaleY * 0.28, -def.scaleZ * 0.59);
          group.add(eye);
        }
        // Talons
        const clawMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.4 });
        for (const cx of [-0.2, 0.2]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, def.scaleY * 0.25, 4), new THREE.MeshStandardMaterial({ color: 0xddaa33, roughness: 0.5 }));
          leg.position.set(cx * def.scaleX, -def.scaleY * 0.3, 0);
          group.add(leg);
          for (let ci = 0; ci < 3; ci++) {
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.1, 3), clawMat);
            claw.position.set(cx * def.scaleX + (ci - 1) * 0.03, -def.scaleY * 0.44, -0.02);
            claw.rotation.x = -Math.PI / 5;
            group.add(claw);
          }
        }
        // Magnificent flowing tail feathers (multiple layered)
        const tailColors = [0xff4400, 0xffaa00, 0xffcc00, 0xff6600, 0xff2200];
        for (let ti = 0; ti < 5; ti++) {
          const featherLen = def.scaleZ * (0.35 + ti * 0.08);
          const feather = new THREE.Mesh(new THREE.ConeGeometry(0.04 + ti * 0.01, featherLen, 4), new THREE.MeshStandardMaterial({ color: tailColors[ti], roughness: 0.5, side: THREE.DoubleSide }));
          feather.position.set((ti - 2) * 0.06, 0.05 + ti * 0.03, def.scaleZ * 0.42 + ti * 0.06);
          feather.rotation.x = Math.PI / 2.5 + ti * 0.05;
          group.add(feather);
        }
        // Fire glow aura
        const aura = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.12 }));
        aura.scale.set(def.scaleX * 0.55, def.scaleY * 0.5, def.scaleZ * 0.55);
        group.add(aura);
        // Fire trail
        const trailGeo = new THREE.ConeGeometry(0.18, 1.0, 6);
        const trailMat = new THREE.MeshBasicMaterial({ color: def.weaponProjectileColor, transparent: true, opacity: 0.35 });
        const trail = new THREE.Mesh(trailGeo, trailMat);
        trail.position.set(0, 0, def.scaleZ * 0.8);
        trail.rotation.x = -Math.PI / 2;
        group.add(trail);

      } else {
        // griffin - eagle front, lion rear
        // Lion body (rear)
        const bodyGeo = new THREE.SphereGeometry(1, 10, 8);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.scale.set(def.scaleX * 0.38, def.scaleY * 0.35, def.scaleZ * 0.45);
        body.castShadow = true;
        group.add(body);
        // Lighter belly
        const bellyMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 1.25), roughness: 0.65 });
        const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), bellyMat);
        belly.scale.set(def.scaleX * 0.32, def.scaleY * 0.25, def.scaleZ * 0.38);
        belly.position.y = -def.scaleY * 0.06;
        group.add(belly);
        // Feathered chest / front shoulders
        const featherMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.accentColor, 1.15), roughness: 0.6 });
        const chest = new THREE.Mesh(new THREE.SphereGeometry(def.scaleX * 0.28, 8, 6), featherMat);
        chest.scale.set(1, 1.1, 0.8);
        chest.position.set(0, def.scaleY * 0.05, -def.scaleZ * 0.2);
        group.add(chest);
        // Muscular neck
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, def.scaleZ * 0.22, 6), featherMat);
        neck.position.set(0, def.scaleY * 0.12, -def.scaleZ * 0.38);
        neck.rotation.x = Math.PI / 2.5;
        group.add(neck);
        // Eagle head
        const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), featherMat);
        headMesh.scale.set(0.85, 0.8, 1.15);
        headMesh.position.set(0, def.scaleY * 0.22, -def.scaleZ * 0.52);
        group.add(headMesh);
        // Sharp hooked beak
        const beakMat = new THREE.MeshStandardMaterial({ color: 0xddaa33, roughness: 0.4 });
        const upperBeak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), beakMat);
        upperBeak.position.set(0, def.scaleY * 0.2, -def.scaleZ * 0.65);
        upperBeak.rotation.x = -Math.PI / 2.3;
        group.add(upperBeak);
        const lowerBeak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), beakMat);
        lowerBeak.position.set(0, def.scaleY * 0.12, -def.scaleZ * 0.6);
        lowerBeak.rotation.x = -Math.PI / 2;
        group.add(lowerBeak);
        // Head feather tufts (ear tufts)
        for (const ex of [-0.1, 0.1]) {
          const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 3), featherMat);
          tuft.position.set(ex, def.scaleY * 0.35, -def.scaleZ * 0.45);
          tuft.rotation.x = Math.PI / 5;
          tuft.rotation.z = ex < 0 ? 0.15 : -0.15;
          group.add(tuft);
        }
        // Fierce eyes
        for (const ex of [-0.12, 0.12]) {
          const ew = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
          ew.position.set(ex, def.scaleY * 0.25, -def.scaleZ * 0.53);
          group.add(ew);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff8800 }));
          eye.position.set(ex, def.scaleY * 0.25, -def.scaleZ * 0.56);
          group.add(eye);
        }
        // Front eagle talons
        const clawMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.4 });
        for (const cx of [-0.25, 0.25]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, def.scaleY * 0.3, 5), new THREE.MeshStandardMaterial({ color: 0xddaa33, roughness: 0.5 }));
          leg.position.set(cx * def.scaleX, -def.scaleY * 0.35, -def.scaleZ * 0.15);
          group.add(leg);
          for (let ci = 0; ci < 3; ci++) {
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 3), clawMat);
            claw.position.set(cx * def.scaleX + (ci - 1) * 0.04, -def.scaleY * 0.52, -def.scaleZ * 0.15 - 0.03);
            claw.rotation.x = -Math.PI / 5;
            group.add(claw);
          }
        }
        // Rear lion paws
        for (const cx of [-0.22, 0.22]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, def.scaleY * 0.32, 5), bodyMat);
          leg.position.set(cx * def.scaleX, -def.scaleY * 0.35, def.scaleZ * 0.2);
          group.add(leg);
          const paw = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.8), roughness: 0.6 }));
          paw.scale.set(1.2, 0.6, 1.3);
          paw.position.set(cx * def.scaleX, -def.scaleY * 0.52, def.scaleZ * 0.2);
          group.add(paw);
        }
        // Lion tail with tuft
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, def.scaleZ * 0.4, 4), bodyMat);
        tail.position.set(0, def.scaleY * 0.05, def.scaleZ * 0.48);
        tail.rotation.x = Math.PI / 3;
        group.add(tail);
        const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.6), roughness: 0.8 }));
        tuft.position.set(0, def.scaleY * 0.2, def.scaleZ * 0.72);
        group.add(tuft);
        // Fire trail
        const trailGeo = new THREE.ConeGeometry(0.18, 0.8, 6);
        const trailMat = new THREE.MeshBasicMaterial({ color: def.weaponProjectileColor, transparent: true, opacity: 0.35 });
        const trail = new THREE.Mesh(trailGeo, trailMat);
        trail.position.set(0, 0, def.scaleZ * 0.65);
        trail.rotation.x = -Math.PI / 2;
        group.add(trail);
      }

      // Multi-segment wings for air_fly creatures
      const isFeathered = def.id === "phoenix" || def.id === "griffin";
      const wingSpan = def.scaleX * 1.2;
      const wMat = new THREE.MeshStandardMaterial({
        color: def.accentColor, side: THREE.DoubleSide,
        roughness: isFeathered ? 0.55 : 0.5,
      });
      const boneMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.7), roughness: 0.4 });

      for (const side of [-1, 1]) {
        const wingGroup = new THREE.Group();
        wingGroup.name = side < 0 ? "leftWing" : "rightWing";
        wingGroup.position.set(side * 0.3, 0, 0);

        if (isFeathered) {
          // Feathered wings with layered flight feathers
          // Main wing bone
          const armBone = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, wingSpan * 0.5, 4), boneMat);
          armBone.position.set(side * wingSpan * 0.22, 0.02, 0);
          armBone.rotation.z = side * Math.PI / 2;
          wingGroup.add(armBone);

          // Primary flight feathers (long, at wingtip)
          const featherMat = new THREE.MeshStandardMaterial({ color: def.accentColor, roughness: 0.5, side: THREE.DoubleSide });
          for (let fi = 0; fi < 6; fi++) {
            const featherLen = wingSpan * (0.25 + fi * 0.03);
            const featherW = 0.06;
            const fVerts = new Float32Array([
              0, 0, 0,
              side * featherLen, 0.01, -featherW,
              side * featherLen * 0.85, 0.01, featherW,
            ]);
            const fGeo = new THREE.BufferGeometry();
            fGeo.setAttribute("position", new THREE.BufferAttribute(fVerts, 3));
            fGeo.computeVertexNormals();
            const feather = new THREE.Mesh(fGeo, featherMat);
            feather.position.set(side * wingSpan * 0.15, 0, -def.scaleZ * 0.1 + fi * def.scaleZ * 0.08);
            wingGroup.add(feather);
          }
          // Secondary feathers (shorter, closer to body)
          for (let fi = 0; fi < 4; fi++) {
            const featherLen = wingSpan * (0.15 + fi * 0.02);
            const fVerts = new Float32Array([
              0, 0, 0,
              side * featherLen, 0.01, -0.04,
              side * featherLen * 0.8, 0.01, 0.04,
            ]);
            const fGeo = new THREE.BufferGeometry();
            fGeo.setAttribute("position", new THREE.BufferAttribute(fVerts, 3));
            fGeo.computeVertexNormals();
            const feather = new THREE.Mesh(fGeo, featherMat);
            feather.position.set(side * wingSpan * 0.05, 0.01, def.scaleZ * 0.1 + fi * def.scaleZ * 0.06);
            wingGroup.add(feather);
          }
          // Covert feathers (wing surface fill)
          const covVerts = new Float32Array([
            0, 0.02, -def.scaleZ * 0.15,
            side * wingSpan * 0.45, 0.03, -def.scaleZ * 0.05,
            side * wingSpan * 0.2, 0.02, def.scaleZ * 0.3,
            0, 0.02, -def.scaleZ * 0.15,
            side * wingSpan * 0.2, 0.02, def.scaleZ * 0.3,
            0, 0.02, def.scaleZ * 0.2,
          ]);
          const covGeo = new THREE.BufferGeometry();
          covGeo.setAttribute("position", new THREE.BufferAttribute(covVerts, 3));
          covGeo.computeVertexNormals();
          const coverts = new THREE.Mesh(covGeo, wMat);
          wingGroup.add(coverts);
        } else {
          // Dragon membrane wings with finger bones
          const armBone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, wingSpan * 0.5, 4), boneMat);
          armBone.position.set(side * wingSpan * 0.22, 0.02, -def.scaleZ * 0.05);
          armBone.rotation.z = side * Math.PI / 2;
          wingGroup.add(armBone);

          // Finger bones
          for (let fi = 0; fi < 4; fi++) {
            const angle = -0.25 + fi * 0.5 / 3;
            const boneLen = wingSpan * (0.35 + (fi === 1 ? 0.1 : 0));
            const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, boneLen, 3), boneMat);
            const bx = side * (wingSpan * 0.42 + Math.cos(angle) * boneLen * 0.25);
            const bz = -def.scaleZ * 0.15 + fi * def.scaleZ * 0.1;
            bone.position.set(bx, 0.01, bz);
            bone.rotation.z = side * (Math.PI / 2 + angle * 0.3);
            wingGroup.add(bone);
          }

          // Membrane panels
          const memMat = new THREE.MeshStandardMaterial({
            color: def.accentColor, roughness: 0.6, side: THREE.DoubleSide,
            transparent: true, opacity: 0.75,
          });
          for (let fi = 0; fi < 4; fi++) {
            const t0 = fi / 4;
            const t1 = (fi + 1) / 4;
            const memVerts = new Float32Array([
              0, 0, -def.scaleZ * 0.2 + t0 * def.scaleZ * 0.55,
              side * wingSpan * 0.6, 0.02, -def.scaleZ * 0.15 + t0 * def.scaleZ * 0.5,
              side * wingSpan * 0.6, 0.02, -def.scaleZ * 0.15 + t1 * def.scaleZ * 0.5,
              0, 0, -def.scaleZ * 0.2 + t0 * def.scaleZ * 0.55,
              side * wingSpan * 0.6, 0.02, -def.scaleZ * 0.15 + t1 * def.scaleZ * 0.5,
              0, 0, -def.scaleZ * 0.2 + t1 * def.scaleZ * 0.55,
            ]);
            const memGeo = new THREE.BufferGeometry();
            memGeo.setAttribute("position", new THREE.BufferAttribute(memVerts, 3));
            memGeo.computeVertexNormals();
            wingGroup.add(new THREE.Mesh(memGeo, memMat));
          }
        }

        group.add(wingGroup);
      }
    }

    // ---- Map-specific vehicle meshes ----
    if (def.id === "magic_carpet") {
      // Flat ornate carpet
      const carpetGeo = new THREE.BoxGeometry(def.scaleX, 0.06, def.scaleZ);
      const carpetMat = new THREE.MeshStandardMaterial({ color: def.bodyColor, roughness: 0.8 });
      const carpet = new THREE.Mesh(carpetGeo, carpetMat);
      carpet.castShadow = true;
      group.add(carpet);
      // Ornate border trim
      const trimMat = new THREE.MeshStandardMaterial({ color: def.accentColor, roughness: 0.5, metalness: 0.4 });
      for (const [tx, tz, sx, sz] of [
        [0, -def.scaleZ / 2, def.scaleX, 0.12],
        [0, def.scaleZ / 2, def.scaleX, 0.12],
        [-def.scaleX / 2, 0, 0.12, def.scaleZ],
        [def.scaleX / 2, 0, 0.12, def.scaleZ],
      ] as [number, number, number, number][]) {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.08, sz), trimMat);
        trim.position.set(tx, 0.04, tz);
        group.add(trim);
      }
      // Central medallion pattern
      const medallion = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.02, 8), trimMat);
      medallion.position.y = 0.04;
      group.add(medallion);
      const innerMedal = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 6),
        new THREE.MeshBasicMaterial({ color: 0xffdd88, transparent: true, opacity: 0.6 }));
      innerMedal.position.y = 0.05;
      group.add(innerMedal);
      // Corner tassels
      for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.4, 4), trimMat);
        tassel.position.set(cx * def.scaleX * 0.48, -0.2, cz * def.scaleZ * 0.48);
        group.add(tassel);
      }
      // Floating sparkle particles
      const sparkleMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.5 });
      for (let si = 0; si < 6; si++) {
        const sparkle = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), sparkleMat);
        sparkle.position.set((Math.random() - 0.5) * def.scaleX * 0.8, -0.1 - Math.random() * 0.3, (Math.random() - 0.5) * def.scaleZ * 0.8);
        sparkle.name = `carpetSparkle_${si}`;
        group.add(sparkle);
      }
      // Cushions for riders
      const cushionMat = new THREE.MeshStandardMaterial({ color: 0x662244, roughness: 0.9 });
      for (let ci = 0; ci < def.seats; ci++) {
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.5), cushionMat);
        cushion.position.set(0, 0.1, -def.scaleZ * 0.15 + ci * 1.2);
        group.add(cushion);
      }
    } else if (def.id === "ghost_ship") {
      // Ghostly hull
      const hullMat = new THREE.MeshStandardMaterial({ color: def.bodyColor, roughness: 0.6, transparent: true, opacity: 0.8 });
      const hull = new THREE.Mesh(new THREE.BoxGeometry(def.scaleX * 0.7, def.scaleY * 0.5, def.scaleZ), hullMat);
      hull.position.y = -def.scaleY * 0.15;
      hull.castShadow = true;
      group.add(hull);
      // Keel
      const keelGeo = new THREE.BoxGeometry(0.15, def.scaleY * 0.3, def.scaleZ * 0.9);
      const keel = new THREE.Mesh(keelGeo, new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.7, transparent: true, opacity: 0.7 }));
      keel.position.y = -def.scaleY * 0.4;
      group.add(keel);
      // Deck planks
      const deckMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.8, transparent: true, opacity: 0.85 });
      const deck = new THREE.Mesh(new THREE.BoxGeometry(def.scaleX * 0.65, 0.08, def.scaleZ * 0.9), deckMat);
      deck.position.y = def.scaleY * 0.1;
      group.add(deck);
      // Railings
      const railMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.5, transparent: true, opacity: 0.75 });
      for (const side of [-1, 1]) {
        for (let ri = 0; ri < 5; ri++) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, def.scaleY * 0.4, 4), railMat);
          post.position.set(side * def.scaleX * 0.32, def.scaleY * 0.3, -def.scaleZ * 0.35 + ri * def.scaleZ * 0.18);
          group.add(post);
        }
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, def.scaleZ * 0.8), railMat);
        rail.position.set(side * def.scaleX * 0.32, def.scaleY * 0.5, 0);
        group.add(rail);
      }
      // Main mast
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.6, transparent: true, opacity: 0.8 });
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, def.scaleY * 1.5, 6), mastMat);
      mast.position.y = def.scaleY * 0.85;
      group.add(mast);
      // Ghostly sails
      const sailMat = new THREE.MeshBasicMaterial({ color: def.accentColor, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
      const sailGeo = new THREE.PlaneGeometry(def.scaleX * 0.6, def.scaleY * 0.8);
      const sail = new THREE.Mesh(sailGeo, sailMat);
      sail.position.set(0, def.scaleY * 1.0, 0);
      sail.name = "ghostSail";
      group.add(sail);
      // Bow figurehead - skull
      const skullMat = new THREE.MeshStandardMaterial({ color: 0xccddcc, roughness: 0.5, transparent: true, opacity: 0.9 });
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), skullMat);
      skull.position.set(0, def.scaleY * 0.05, -def.scaleZ * 0.55);
      skull.scale.set(1, 0.85, 1.2);
      group.add(skull);
      // Skull eye glow
      for (const ex of [-0.08, 0.08]) {
        const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), new THREE.MeshBasicMaterial({ color: def.accentColor }));
        eyeGlow.position.set(ex, def.scaleY * 0.08, -def.scaleZ * 0.6);
        group.add(eyeGlow);
      }
      // Ghost flame aura
      const auraMat = new THREE.MeshBasicMaterial({ color: def.accentColor, transparent: true, opacity: 0.15 });
      const aura = new THREE.Mesh(new THREE.SphereGeometry(def.scaleZ * 0.55, 8, 8), auraMat);
      aura.position.y = def.scaleY * 0.2;
      aura.name = "ghostAura";
      group.add(aura);
      // Cannon ports
      for (const side of [-1, 1]) {
        for (let ci = 0; ci < 3; ci++) {
          const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.4, 5), darkMat);
          cannon.position.set(side * def.scaleX * 0.36, def.scaleY * 0.05, -def.scaleZ * 0.2 + ci * def.scaleZ * 0.2);
          cannon.rotation.z = side * Math.PI / 2;
          group.add(cannon);
        }
      }
    } else if (def.id === "sky_gondola") {
      // Gondola basket
      const basketMat = new THREE.MeshStandardMaterial({ color: def.bodyColor, roughness: 0.7 });
      const basket = new THREE.Mesh(new THREE.BoxGeometry(def.scaleX * 0.6, def.scaleY * 0.35, def.scaleZ * 0.7), basketMat);
      basket.position.y = -def.scaleY * 0.1;
      basket.castShadow = true;
      group.add(basket);
      // Wicker weave texture lines
      const weaveMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.8), roughness: 0.8 });
      for (let wi = 0; wi < 4; wi++) {
        const weave = new THREE.Mesh(new THREE.BoxGeometry(def.scaleX * 0.62, 0.02, 0.03), weaveMat);
        weave.position.set(0, -def.scaleY * 0.22 + wi * 0.08, -def.scaleZ * 0.35);
        group.add(weave);
        const weaveB = new THREE.Mesh(new THREE.BoxGeometry(def.scaleX * 0.62, 0.02, 0.03), weaveMat);
        weaveB.position.set(0, -def.scaleY * 0.22 + wi * 0.08, def.scaleZ * 0.35);
        group.add(weaveB);
      }
      // Crystal power source (hovering above)
      const crystalMat = new THREE.MeshBasicMaterial({ color: def.accentColor, transparent: true, opacity: 0.7 });
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), crystalMat);
      crystal.position.y = def.scaleY * 0.8;
      crystal.name = "gondolaCrystal";
      group.add(crystal);
      // Crystal glow ring
      const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 16), new THREE.MeshBasicMaterial({ color: def.accentColor, transparent: true, opacity: 0.4 }));
      glowRing.position.y = def.scaleY * 0.8;
      glowRing.rotation.x = Math.PI / 2;
      glowRing.name = "gondolaGlowRing";
      group.add(glowRing);
      // Support ropes from crystal to basket
      const ropeMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.9 });
      for (const [rx, rz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, def.scaleY * 0.7, 3), ropeMat);
        rope.position.set(rx * def.scaleX * 0.2, def.scaleY * 0.4, rz * def.scaleZ * 0.25);
        rope.rotation.z = rx * 0.15;
        rope.rotation.x = rz * 0.1;
        group.add(rope);
      }
      // Ornate front lantern
      const lanternMat = new THREE.MeshStandardMaterial({ color: 0xddaa44, roughness: 0.4, metalness: 0.5 });
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffdd88 }));
      const lanternFrame = new THREE.Mesh(new THREE.OctahedronGeometry(0.15), lanternMat);
      lanternFrame.position.set(0, def.scaleY * 0.05, -def.scaleZ * 0.4);
      lantern.position.set(0, def.scaleY * 0.05, -def.scaleZ * 0.4);
      group.add(lanternFrame);
      group.add(lantern);
      // Small turret
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.2, 6), accentMat);
      turret.position.set(0, def.scaleY * 0.1, -def.scaleZ * 0.28);
      group.add(turret);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 4), darkMat);
      barrel.position.set(0, def.scaleY * 0.12, -def.scaleZ * 0.48);
      barrel.rotation.x = Math.PI / 2;
      group.add(barrel);
    }

    // Team color indicator ring
    const ringGeo = new THREE.TorusGeometry(Math.max(def.scaleX, def.scaleZ) * 0.5, 0.08, 6, 16);
    const teamColor = veh.team === 0 ? 0x4488ff : veh.team === 1 ? 0xff4444 : 0xaaaaaa;
    const ringMat = new THREE.MeshBasicMaterial({ color: teamColor });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -def.scaleY * 0.5;
    group.add(ring);

    return group;
  }

  // ---- First-Person Wand ----

  private _buildFPWand(): void {
    this._fpWand = new THREE.Group();

    // Handle (pommel end)
    const handleGeo = new THREE.CylinderGeometry(0.018, 0.024, 0.12, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x5a3520, roughness: 0.7 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.06;
    this._fpWand.add(handle);

    // Pommel gem
    const pommelGeo = new THREE.SphereGeometry(0.012, 6, 6);
    const pommelMat = new THREE.MeshBasicMaterial({ color: 0xaa4444 });
    const pommel = new THREE.Mesh(pommelGeo, pommelMat);
    pommel.position.y = -0.12;
    this._fpWand.add(pommel);

    // Grip rings (3)
    const gripGeo = new THREE.TorusGeometry(0.022, 0.004, 4, 8);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.3, metalness: 0.4 });
    for (let gi = 0; gi < 3; gi++) {
      const grip = new THREE.Mesh(gripGeo, gripMat);
      grip.position.y = -0.04 + gi * 0.03;
      this._fpWand.add(grip);
    }

    // Cross guard
    const guardGeo = new THREE.BoxGeometry(0.05, 0.006, 0.006);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0xbb9944, roughness: 0.3, metalness: 0.6 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.y = 0.01;
    this._fpWand.add(guard);

    // Shaft - twisted appearance with two segments
    const shaftLowerGeo = new THREE.CylinderGeometry(0.013, 0.016, 0.1, 6);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.5 });
    const shaftLower = new THREE.Mesh(shaftLowerGeo, shaftMat);
    shaftLower.position.y = 0.06;
    this._fpWand.add(shaftLower);

    // Rune ring in middle of shaft
    const runeRingGeo = new THREE.TorusGeometry(0.018, 0.003, 4, 8);
    const runeRingMat = new THREE.MeshBasicMaterial({ color: 0x6666cc, transparent: true, opacity: 0.7 });
    const runeRing = new THREE.Mesh(runeRingGeo, runeRingMat);
    runeRing.position.y = 0.11;
    this._fpWand.add(runeRing);

    const shaftUpperGeo = new THREE.CylinderGeometry(0.01, 0.013, 0.08, 6);
    const shaftUpper = new THREE.Mesh(shaftUpperGeo, shaftMat);
    shaftUpper.position.y = 0.15;
    this._fpWand.add(shaftUpper);

    // Crystal prongs around the tip (3 tiny cones angled outward)
    const prongGeo = new THREE.ConeGeometry(0.004, 0.03, 4);
    const prongMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.2, metalness: 0.7 });
    for (let pi = 0; pi < 3; pi++) {
      const angle = (pi / 3) * Math.PI * 2;
      const prong = new THREE.Mesh(prongGeo, prongMat);
      prong.position.set(Math.cos(angle) * 0.015, 0.185, Math.sin(angle) * 0.015);
      prong.rotation.z = Math.cos(angle) * 0.4;
      prong.rotation.x = Math.sin(angle) * 0.4;
      this._fpWand.add(prong);
    }

    // Tip orb - larger with inner glow
    const tipGeo = new THREE.SphereGeometry(0.022, 8, 8);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x8888ff });
    this._fpWandTipMesh = new THREE.Mesh(tipGeo, tipMat);
    this._fpWandTipMesh.position.y = 0.2;
    this._fpWand.add(this._fpWandTipMesh);

    // Outer glow ring around tip
    const glowRingGeo = new THREE.TorusGeometry(0.028, 0.003, 4, 8);
    const glowRingMat = new THREE.MeshBasicMaterial({ color: 0x8888ff, transparent: true, opacity: 0.3 });
    const glowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
    glowRing.position.y = 0.2;
    this._fpWand.add(glowRing);

    // Position relative to camera
    this._fpWand.position.set(0.3, -0.25, -0.5);
    this._fpWand.rotation.set(0.1, 0, -0.1);

    this._camera.add(this._fpWand);
    this._scene.add(this._camera);
  }


  // =====================================================================
  // INPUT SETUP
  // =====================================================================

  private _setupInputHandlers(): void {
    this._keyDownHandler = (e: KeyboardEvent) => {
      this._keys[e.code] = true;
      if (e.code === "KeyR") this._wantReload = true;
      if (e.code === "KeyQ") this._wantAbility = true;
      if (e.code === "KeyE") this._wantInteract = true;
      if (e.code === "KeyF") this._wantWeaponSwitch = true;
      if (e.code === "Digit1") this._wantSlot = 0;
      if (e.code === "Digit2") this._wantSlot = 1;
      if (e.code === "Digit3") this._wantSlot = 2;
      if (e.code === "Tab") {
        e.preventDefault();
        if (this._phase === MWPhase.PLAYING || this._phase === MWPhase.ROYALE_PLAYING) {
          this._phase = MWPhase.SCOREBOARD;
          this._showScoreboard();
        }
      }
    };
    this._keyUpHandler = (e: KeyboardEvent) => {
      this._keys[e.code] = false;
      if (e.code === "Tab" && this._phase === MWPhase.SCOREBOARD) {
        this._phase = this._isRoyaleMode ? MWPhase.ROYALE_PLAYING : MWPhase.PLAYING;
        this._hideScoreboard();
      }
    };
    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);

    this._mouseDownHandler = (e: MouseEvent) => {
      if ((this._phase === MWPhase.PLAYING || this._phase === MWPhase.ROYALE_PLAYING) && !this._pointerLocked) {
        this._canvas.requestPointerLock();
        return;
      }
      if (e.button === 0) this._mouseDown = true;
      if (e.button === 2) this._mouseRightDown = true;
    };
    this._mouseUpHandler = (e: MouseEvent) => {
      if (e.button === 0) this._mouseDown = false;
      if (e.button === 2) this._mouseRightDown = false;
    };
    this._canvas.addEventListener("mousedown", this._mouseDownHandler);
    window.addEventListener("mouseup", this._mouseUpHandler);

    this._canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    this._mouseMoveHandler = (e: MouseEvent) => {
      if (!this._pointerLocked) return;
      this._mouseDX += e.movementX;
      this._mouseDY += e.movementY;
    };
    document.addEventListener("mousemove", this._mouseMoveHandler);

    this._pointerLockHandler = () => {
      this._pointerLocked = document.pointerLockElement === this._canvas;
    };
    document.addEventListener("pointerlockchange", this._pointerLockHandler);

    this._wheelHandler = (e: WheelEvent) => {
      if (this._phase !== MWPhase.PLAYING) return;
      const p = this._getHumanPlayer();
      if (!p) return;
      if (e.deltaY > 0) p.activeWandSlot = ((p.activeWandSlot + 1) % 3) as 0 | 1 | 2;
      else p.activeWandSlot = ((p.activeWandSlot + 2) % 3) as 0 | 1 | 2;
    };
    this._canvas.addEventListener("wheel", this._wheelHandler);
  }

  // =====================================================================
  // MENUS
  // =====================================================================

  private _menuBtnStyle(bg = "#3a1515", border = "#daa520"): string {
    return `display:block;width:320px;padding:14px 24px;margin:5px 0;font-size:17px;font-weight:bold;` +
      `background:linear-gradient(180deg,${bg},${bg}cc);color:#e0d5c0;letter-spacing:1px;` +
      `border:1px solid ${border}88;border-radius:4px;cursor:pointer;text-align:center;` +
      `font-family:inherit;transition:all 0.15s;box-shadow:0 2px 8px rgba(0,0,0,0.3);`;
  }

  private _removeMenu(): void {
    if (this._menuDiv?.parentNode) {
      this._menuDiv.parentNode.removeChild(this._menuDiv);
      this._menuDiv = null;
    }
  }

  // ---- Main Menu ----
  private _showMainMenu(): void {
    this._phase = MWPhase.MAIN_MENU;
    this._removeMenu();
    this._menuDiv = document.createElement("div");
    this._menuDiv.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:30;` +
      `background:rgba(5,3,15,0.97);display:flex;flex-direction:column;align-items:center;justify-content:center;` +
      `font-family:'Segoe UI',sans-serif;color:#e0d5c0;`;

    this._menuDiv.innerHTML = `
      <div style="position:absolute;top:0;left:0;width:100%;height:100%;
        background:radial-gradient(ellipse at center,rgba(30,10,60,0.5) 0%,transparent 70%);pointer-events:none"></div>
      <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center">
        <div style="font-size:11px;letter-spacing:6px;color:#665588;margin-bottom:8px">MARVELOUS U PRESENTS</div>
        <h1 style="font-size:56px;color:#daa520;text-shadow:0 0 30px rgba(218,165,32,0.5),0 0 60px rgba(100,50,200,0.3),0 2px 4px rgba(0,0,0,0.8);margin:0 0 4px 0;letter-spacing:4px">
          MAGE WARS
        </h1>
        <div style="width:200px;height:2px;background:linear-gradient(90deg,transparent,#daa520,transparent);margin-bottom:6px"></div>
        <p style="color:#8877aa;margin:0 0 35px 0;font-size:14px;letter-spacing:2px">ARCANE WARFARE</p>

        <button id="mw-quickplay" style="${this._menuBtnStyle("#2a1540", "#aa66ff")}">
          Quick Play
          <span style="display:block;font-size:11px;color:#998877;margin-top:4px;font-weight:normal">Random map & class, jump right in</span>
        </button>

        <button id="mw-custom" style="${this._menuBtnStyle()}">
          Custom Match
          <span style="display:block;font-size:11px;color:#998877;margin-top:4px;font-weight:normal">Choose class, loadout & map</span>
        </button>

        <button id="mw-royale" style="${this._menuBtnStyle("#1a1a30", "#ff4488")}">
          Mage Royale
          <span style="display:block;font-size:11px;color:#998877;margin-top:4px;font-weight:normal">Last mage standing - 12 player FFA</span>
        </button>

        <button id="mw-duel" style="${this._menuBtnStyle("#1a1a2a", "#ffaa22")}">
          Wizard Duel
          <span style="display:block;font-size:11px;color:#998877;margin-top:4px;font-weight:normal">1v1 arena with spell loadout selection</span>
        </button>

        <button id="mw-dragon" style="${this._menuBtnStyle("#2a1010", "#ff6644")}">
          Dragon Riding
          <span style="display:block;font-size:11px;color:#998877;margin-top:4px;font-weight:normal">Aerial dragon combat with breath weapons</span>
        </button>

        <div style="width:120px;height:1px;background:linear-gradient(90deg,transparent,#44443a,transparent);margin:12px 0"></div>

        <button id="mw-back" style="${this._menuBtnStyle("#2a2a2a", "#555")}">
          Back to Hub
        </button>
      </div>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._menuDiv);

    document.getElementById("mw-quickplay")?.addEventListener("click", () => {
      this._removeMenu();
      const rngMap = MAP_DEFS[Math.floor(Math.random() * MAP_DEFS.length)];
      const rngClass = MAGE_CLASSES[Math.floor(Math.random() * MAGE_CLASSES.length)];
      this._mapId = rngMap.id;
      this._selectedClassId = rngClass.id;
      this._selectedPrimary = rngClass.defaultPrimary;
      this._selectedSecondary = rngClass.defaultSecondary;
      this._selectedHeavy = "meteor_launcher";
      this._startMatch();
    });
    document.getElementById("mw-custom")?.addEventListener("click", () => {
      this._removeMenu();
      this._showCharSelect();
    });
    document.getElementById("mw-royale")?.addEventListener("click", () => {
      this._removeMenu();
      this._showRoyaleClassSelect();
    });
    document.getElementById("mw-duel")?.addEventListener("click", () => {
      this._removeMenu();
      this._showDuelSetup();
    });
    document.getElementById("mw-dragon")?.addEventListener("click", () => {
      this._removeMenu();
      this._showDragonSetup();
    });
    document.getElementById("mw-back")?.addEventListener("click", () => { this._exit(); });
  }


  // ---- Character Select ----
  private _showCharSelect(): void {
    this._phase = MWPhase.CHAR_SELECT;
    this._removeMenu();
    this._menuDiv = document.createElement("div");
    this._menuDiv.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:30;` +
      `background:rgba(5,3,15,0.97);display:flex;flex-direction:column;align-items:center;` +
      `font-family:'Segoe UI',sans-serif;color:#e0d5c0;overflow-y:auto;padding:20px 0;`;

    let cardsHtml = "";
    for (const cls of MAGE_CLASSES) {
      const selected = cls.id === this._selectedClassId;
      const borderColor = selected ? "#daa520" : "#444";
      const bg = selected ? "rgba(80,50,10,0.5)" : "rgba(30,20,40,0.6)";
      const pWand = getWandDef(cls.defaultPrimary);
      const sWand = getWandDef(cls.defaultSecondary);
      cardsHtml += `
        <div class="mw-class-card" data-classid="${cls.id}" style="
          width:220px;padding:15px;margin:8px;border:2px solid ${borderColor};border-radius:8px;
          background:${bg};cursor:pointer;transition:all 0.2s;display:inline-block;vertical-align:top;
          text-align:center;">
          <div style="font-size:32px;margin-bottom:4px">${cls.icon}</div>
          <div style="font-size:18px;font-weight:bold;color:#daa520;margin-bottom:4px">${cls.name}</div>
          <div style="font-size:11px;color:#aaa;margin-bottom:8px;min-height:30px">${cls.desc}</div>
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
            <span>HP: ${cls.hp}</span><span>Mana: ${cls.mana}</span>
          </div>
          <div style="height:6px;background:#333;border-radius:3px;margin-bottom:3px">
            <div style="height:100%;width:${(cls.hp / 130) * 100}%;background:#cc3333;border-radius:3px"></div>
          </div>
          <div style="height:6px;background:#333;border-radius:3px;margin-bottom:6px">
            <div style="height:100%;width:${(cls.mana / 130) * 100}%;background:#3366cc;border-radius:3px"></div>
          </div>
          <div style="font-size:10px;color:#888;margin-bottom:2px">Speed: ${"*".repeat(Math.round(cls.speed * 5))}</div>
          <div style="font-size:10px;color:#888;margin-bottom:6px">Armor: ${cls.armor}%</div>
          <div style="font-size:11px;color:#aa88cc;margin-bottom:2px">${cls.ability}</div>
          <div style="font-size:10px;color:#777;margin-bottom:6px">${cls.abilityDesc} (${cls.abilityCooldown}s CD)</div>
          <div style="font-size:10px;color:#666">Default: ${pWand.name} / ${sWand.name}</div>
        </div>`;
    }

    this._menuDiv.innerHTML = `
      <h2 style="color:#daa520;margin-bottom:5px;font-size:28px;letter-spacing:2px">Choose Your Mage</h2>
      <div style="width:200px;height:2px;background:linear-gradient(90deg,transparent,#daa520,transparent);margin-bottom:20px"></div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;max-width:960px;margin:0 auto">
        ${cardsHtml}
      </div>
      <div style="margin-top:20px;display:flex;gap:12px">
        <button id="mw-cs-back" style="${this._menuBtnStyle("#2a2a2a", "#555")}">Back</button>
        <button id="mw-cs-next" style="${this._menuBtnStyle("#2a1540", "#daa520")}">Next: Loadout</button>
      </div>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._menuDiv);

    this._menuDiv.querySelectorAll(".mw-class-card").forEach((card) => {
      card.addEventListener("click", () => {
        const cid = (card as HTMLElement).dataset.classid!;
        this._selectedClassId = cid;
        const cls = getClassDef(cid);
        this._selectedPrimary = cls.defaultPrimary;
        this._selectedSecondary = cls.defaultSecondary;
        this._removeMenu();
        this._showCharSelect();
      });
    });

    document.getElementById("mw-cs-back")?.addEventListener("click", () => { this._removeMenu(); this._showMainMenu(); });
    document.getElementById("mw-cs-next")?.addEventListener("click", () => { this._removeMenu(); this._showLoadout(); });
  }

  // ---- Loadout Screen ----
  private _showLoadout(): void {
    this._phase = MWPhase.LOADOUT;
    this._removeMenu();
    this._menuDiv = document.createElement("div");
    this._menuDiv.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:30;` +
      `background:rgba(5,3,15,0.97);display:flex;flex-direction:column;align-items:center;` +
      `font-family:'Segoe UI',sans-serif;color:#e0d5c0;overflow-y:auto;padding:20px 0;`;

    const categories: Array<{ label: string; cat: "primary" | "secondary" | "heavy"; selected: string }> = [
      { label: "Primary Wand", cat: "primary", selected: this._selectedPrimary },
      { label: "Secondary Wand", cat: "secondary", selected: this._selectedSecondary },
      { label: "Heavy Wand", cat: "heavy", selected: this._selectedHeavy },
    ];

    let columnsHtml = "";
    for (const { label, cat, selected } of categories) {
      const wands = WAND_DEFS.filter(w => w.category === cat);
      let wandCards = "";
      for (const w of wands) {
        const sel = w.id === selected;
        const border = sel ? "#daa520" : "#444";
        const bg = sel ? "rgba(80,50,10,0.5)" : "rgba(30,20,40,0.4)";
        const maxDmg = cat === "heavy" ? 120 : cat === "primary" ? 55 : 18;
        const maxRate = cat === "heavy" ? 0.6 : 15;
        const maxRange = 150;
        wandCards += `
          <div class="mw-wand-card" data-wandid="${w.id}" data-cat="${cat}" style="
            padding:10px;margin:4px 0;border:2px solid ${border};border-radius:6px;
            background:${bg};cursor:pointer;transition:all 0.15s;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-size:14px;font-weight:bold;color:#daa520">${w.icon} ${w.name}</span>
            </div>
            <div style="font-size:10px;color:#888;margin-bottom:6px">${w.desc}</div>
            <div style="font-size:10px;display:flex;gap:10px;margin-bottom:4px">
              <span>DMG: ${w.damage}</span><span>Rate: ${w.fireRate}/s</span><span>Range: ${w.range}m</span>
            </div>
            <div style="font-size:10px;color:#777;margin-bottom:4px">Mag: ${w.magPerReload} | Reload: ${w.reloadTime}s | Cost: ${w.magicCost} mana</div>
            <div style="display:flex;gap:4px;align-items:center;font-size:9px;color:#666">
              <span>DMG</span>
              <div style="flex:1;height:4px;background:#333;border-radius:2px">
                <div style="height:100%;width:${(w.damage / maxDmg) * 100}%;background:#cc4444;border-radius:2px"></div>
              </div>
              <span>RATE</span>
              <div style="flex:1;height:4px;background:#333;border-radius:2px">
                <div style="height:100%;width:${(w.fireRate / maxRate) * 100}%;background:#44cc44;border-radius:2px"></div>
              </div>
              <span>RNG</span>
              <div style="flex:1;height:4px;background:#333;border-radius:2px">
                <div style="height:100%;width:${(w.range / maxRange) * 100}%;background:#4488cc;border-radius:2px"></div>
              </div>
            </div>
          </div>`;
      }
      columnsHtml += `
        <div style="flex:1;min-width:260px;max-width:320px;margin:0 8px">
          <h3 style="color:#daa520;text-align:center;margin-bottom:10px;font-size:16px">${label}</h3>
          ${wandCards}
        </div>`;
    }

    let mapOptions = "";
    for (const m of MAP_DEFS) {
      const sel = m.id === this._mapId ? "selected" : "";
      mapOptions += `<option value="${m.id}" ${sel}>${m.icon} ${m.name} - ${m.desc}</option>`;
    }

    // Map preview helper
    const selMap = getMapDef(this._mapId);
    const mapSizeLabel = selMap.size <= 100 ? "Small" : selMap.size <= 120 ? "Medium" : "Large";
    const mapBestFor = selMap.vehicleSpawnPoints >= 5 ? "Vehicles" : selMap.treeCount >= 80 ? "Infantry" : "Mixed";
    const groundHex = "#" + selMap.groundColor.toString(16).padStart(6, "0");
    const treeHex = "#" + selMap.treeColor.toString(16).padStart(6, "0");

    // Team size options
    const teamSizes = [2, 3, 4, 5, 8, 10];
    let teamSizeOpts = "";
    for (const ts of teamSizes) {
      const sel = ts === this._customTeamSize ? "selected" : "";
      teamSizeOpts += `<option value="${ts}" ${sel}>${ts}v${ts}</option>`;
    }
    // Time limit options
    const timeLimits = [180, 300, 480, 600];
    const timeLabels = ["3min", "5min", "8min", "10min"];
    let timeLimitOpts = "";
    for (let i = 0; i < timeLimits.length; i++) {
      const sel = timeLimits[i] === this._customTimeLimit ? "selected" : "";
      timeLimitOpts += `<option value="${timeLimits[i]}" ${sel}>${timeLabels[i]}</option>`;
    }
    // Score limit options
    const scoreLimits = [30, 50, 75, 100];
    let scoreLimitOpts = "";
    for (const sl of scoreLimits) {
      const sel = sl === this._customScoreLimit ? "selected" : "";
      scoreLimitOpts += `<option value="${sl}" ${sel}>${sl}</option>`;
    }

    const selectStyle = "padding:6px 12px;background:#1a1a2a;color:#e0d5c0;border:1px solid #555;border-radius:4px;font-size:12px;font-family:inherit;";

    this._menuDiv.innerHTML = `
      <h2 style="color:#daa520;margin-bottom:5px;font-size:28px;letter-spacing:2px">Loadout</h2>
      <div style="font-size:13px;color:#888;margin-bottom:15px">Class: ${getClassDef(this._selectedClassId).icon} ${getClassDef(this._selectedClassId).name}</div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;max-width:1050px;margin-bottom:20px">
        ${columnsHtml}
      </div>
      <div style="margin-bottom:10px;display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;justify-content:center">
        <div>
          <label style="font-size:13px;color:#aaa;margin-right:8px">Map:</label>
          <select id="mw-map-select" style="padding:8px 16px;background:#1a1a2a;color:#e0d5c0;border:1px solid #555;border-radius:4px;font-size:13px;font-family:inherit;min-width:300px;">
            ${mapOptions}
          </select>
          <div id="mw-map-preview" style="margin-top:8px;padding:10px 14px;background:rgba(20,15,30,0.7);border:1px solid #444;border-radius:6px;max-width:340px">
            <div style="font-size:16px;font-weight:bold;color:#daa520;margin-bottom:4px">${selMap.icon} ${selMap.name}</div>
            <div style="font-size:11px;color:#888;margin-bottom:4px">Size: ${mapSizeLabel} | Terrain: ${selMap.hillAmplitude > 3 ? "Hilly" : selMap.hillAmplitude > 1.5 ? "Rolling" : "Flat"}</div>
            <div style="font-size:11px;color:#888;margin-bottom:6px">Best for: ${mapBestFor}</div>
            <div style="display:flex;gap:4px;align-items:center">
              <div style="width:30px;height:20px;background:${groundHex};border-radius:2px;border:1px solid #555"></div>
              <div style="width:30px;height:20px;background:${treeHex};border-radius:2px;border:1px solid #555"></div>
              <span style="font-size:10px;color:#666;margin-left:4px">Map palette</span>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <div><label style="font-size:12px;color:#aaa;margin-right:6px">Team Size:</label><select id="mw-team-size" style="${selectStyle}">${teamSizeOpts}</select></div>
          <div><label style="font-size:12px;color:#aaa;margin-right:6px">Time Limit:</label><select id="mw-time-limit" style="${selectStyle}">${timeLimitOpts}</select></div>
          <div><label style="font-size:12px;color:#aaa;margin-right:6px">Score Limit:</label><select id="mw-score-limit" style="${selectStyle}">${scoreLimitOpts}</select></div>
        </div>
      </div>
      <div style="margin-bottom:15px;max-width:700px;width:100%">
        <h3 style="color:#daa520;text-align:center;margin-bottom:10px;font-size:16px">Match Options</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">
          <div id="mw-opt-ff" style="padding:8px 14px;border:2px solid ${this._optFriendlyFire ? "#cc4444" : "#444"};border-radius:6px;background:${this._optFriendlyFire ? "rgba(204,68,68,0.3)" : "rgba(30,30,30,0.3)"};cursor:pointer;font-size:12px;user-select:none;transition:all 0.15s;">
            <span style="margin-right:6px">⚔️</span> Friendly Fire
          </div>
          <div id="mw-opt-veh" style="padding:8px 14px;border:2px solid ${this._optVehiclesEnabled ? "#44cc44" : "#444"};border-radius:6px;background:${this._optVehiclesEnabled ? "rgba(68,204,68,0.3)" : "rgba(30,30,30,0.3)"};cursor:pointer;font-size:12px;user-select:none;transition:all 0.15s;">
            <span style="margin-right:6px">🐉</span> Vehicles
          </div>
          <div id="mw-opt-abil" style="padding:8px 14px;border:2px solid ${this._optAbilitiesEnabled ? "#aa44cc" : "#444"};border-radius:6px;background:${this._optAbilitiesEnabled ? "rgba(170,68,204,0.3)" : "rgba(30,30,30,0.3)"};cursor:pointer;font-size:12px;user-select:none;transition:all 0.15s;">
            <span style="margin-right:6px">✨</span> Abilities
          </div>
          <div id="mw-opt-hs" style="padding:8px 14px;border:2px solid ${this._optHeadshotsEnabled ? "#cccc44" : "#444"};border-radius:6px;background:${this._optHeadshotsEnabled ? "rgba(204,204,68,0.3)" : "rgba(30,30,30,0.3)"};cursor:pointer;font-size:12px;user-select:none;transition:all 0.15s;">
            <span style="margin-right:6px">🎯</span> Headshots
          </div>
          <div id="mw-opt-fall" style="padding:8px 14px;border:2px solid ${this._optFallDamage ? "#cc8844" : "#444"};border-radius:6px;background:${this._optFallDamage ? "rgba(204,136,68,0.3)" : "rgba(30,30,30,0.3)"};cursor:pointer;font-size:12px;user-select:none;transition:all 0.15s;">
            <span style="margin-right:6px">💀</span> Fall Damage
          </div>
          <div id="mw-opt-cp" style="padding:8px 14px;border:2px solid ${this._optCapturePoints ? "#44cccc" : "#444"};border-radius:6px;background:${this._optCapturePoints ? "rgba(68,204,204,0.3)" : "rgba(30,30,30,0.3)"};cursor:pointer;font-size:12px;user-select:none;transition:all 0.15s;">
            <span style="margin-right:6px">🚩</span> Capture Points
          </div>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-top:10px">
        <button id="mw-lo-back" style="${this._menuBtnStyle("#2a2a2a", "#555")}">Back</button>
        <button id="mw-lo-start" style="${this._menuBtnStyle("#1a3a1a", "#44cc44")}">Start Battle</button>
      </div>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._menuDiv);

    this._menuDiv.querySelectorAll(".mw-wand-card").forEach((card) => {
      card.addEventListener("click", () => {
        const wid = (card as HTMLElement).dataset.wandid!;
        const cat = (card as HTMLElement).dataset.cat!;
        if (cat === "primary") this._selectedPrimary = wid;
        else if (cat === "secondary") this._selectedSecondary = wid;
        else this._selectedHeavy = wid;
        this._removeMenu();
        this._showLoadout();
      });
    });

    document.getElementById("mw-map-select")?.addEventListener("change", (e) => {
      this._mapId = (e.target as HTMLSelectElement).value;
      this._removeMenu();
      this._showLoadout();
    });
    document.getElementById("mw-team-size")?.addEventListener("change", (e) => {
      this._customTeamSize = parseInt((e.target as HTMLSelectElement).value);
    });
    document.getElementById("mw-time-limit")?.addEventListener("change", (e) => {
      this._customTimeLimit = parseInt((e.target as HTMLSelectElement).value);
    });
    document.getElementById("mw-score-limit")?.addEventListener("change", (e) => {
      this._customScoreLimit = parseInt((e.target as HTMLSelectElement).value);
    });
    document.getElementById("mw-lo-back")?.addEventListener("click", () => { this._removeMenu(); this._showCharSelect(); });
    document.getElementById("mw-lo-start")?.addEventListener("click", () => { this._removeMenu(); this._startMatch(); });

    // Match option toggles
    const optToggles: Array<{ id: string; field: "_optFriendlyFire" | "_optVehiclesEnabled" | "_optAbilitiesEnabled" | "_optHeadshotsEnabled" | "_optFallDamage" | "_optCapturePoints" }> = [
      { id: "mw-opt-ff", field: "_optFriendlyFire" },
      { id: "mw-opt-veh", field: "_optVehiclesEnabled" },
      { id: "mw-opt-abil", field: "_optAbilitiesEnabled" },
      { id: "mw-opt-hs", field: "_optHeadshotsEnabled" },
      { id: "mw-opt-fall", field: "_optFallDamage" },
      { id: "mw-opt-cp", field: "_optCapturePoints" },
    ];
    for (const opt of optToggles) {
      document.getElementById(opt.id)?.addEventListener("click", () => {
        this[opt.field] = !this[opt.field];
        this._removeMenu();
        this._showLoadout();
      });
    }
  }


  // ===========================================================================
  // MAGE ROYALE MODE
  // ===========================================================================

  private _showRoyaleClassSelect(): void {
    this._removeMenu();
    this._menuDiv = document.createElement("div");
    this._menuDiv.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:30;` +
      `background:rgba(5,3,20,0.97);display:flex;flex-direction:column;align-items:center;justify-content:center;` +
      `font-family:'Segoe UI',sans-serif;color:#e0d5c0;overflow-y:auto;`;

    let classCards = "";
    for (const cls of MAGE_CLASSES) {
      const selected = cls.id === this._selectedClassId;
      classCards += `<div class="mw-royale-cls" data-clsid="${cls.id}" style="padding:12px 16px;border:2px solid ${selected ? "#ff4488" : "#44334a"};border-radius:8px;cursor:pointer;background:${selected ? "rgba(255,68,136,0.15)" : "rgba(30,20,40,0.5)"};min-width:120px;text-align:center;transition:all 0.15s">
        <div style="font-size:28px">${cls.icon}</div>
        <div style="font-size:13px;font-weight:bold;color:${selected ? "#ff4488" : "#ccc"}">${cls.name}</div>
        <div style="font-size:10px;color:#888;margin-top:2px">HP:${cls.hp} SPD:${cls.speed.toFixed(1)}</div>
      </div>`;
    }

    let mapOptions = "";
    for (const m of MAP_DEFS) {
      mapOptions += `<option value="${m.id}" ${m.id === this._mapId ? "selected" : ""}>${m.name}</option>`;
    }

    this._menuDiv.innerHTML = `
      <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;max-height:90vh;overflow-y:auto;padding:20px">
        <h1 style="font-size:38px;color:#ff4488;text-shadow:0 0 30px rgba(255,68,136,0.5);margin:0 0 4px 0;letter-spacing:3px">MAGE ROYALE</h1>
        <div style="width:180px;height:2px;background:linear-gradient(90deg,transparent,#ff4488,transparent);margin-bottom:4px"></div>
        <p style="color:#aa7799;margin:0 0 15px 0;font-size:13px;letter-spacing:1px">LAST MAGE STANDING - ${MW.ROYALE_PLAYERS} PLAYERS</p>

        <div style="margin-bottom:15px">
          <label style="font-size:12px;color:#888;margin-right:8px">Arena:</label>
          <select id="mw-royale-map" style="background:#1a1a2a;color:#e0d5c0;border:1px solid #555;padding:4px 8px;border-radius:4px;font-size:12px">
            ${mapOptions}
          </select>
        </div>

        <div style="font-size:12px;color:#888;margin-bottom:8px">Choose your class:</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:650px;margin-bottom:18px">
          ${classCards}
        </div>

        <div style="display:flex;gap:12px">
          <button id="mw-royale-back" style="${this._menuBtnStyle("#2a2a2a", "#555")}">Back</button>
          <button id="mw-royale-start" style="${this._menuBtnStyle("#2a0020", "#ff4488")}">Enter the Arena</button>
        </div>
      </div>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._menuDiv);

    this._menuDiv.querySelectorAll(".mw-royale-cls").forEach(card => {
      card.addEventListener("click", () => {
        this._selectedClassId = (card as HTMLElement).dataset.clsid!;
        this._removeMenu();
        this._showRoyaleClassSelect();
      });
    });
    document.getElementById("mw-royale-map")?.addEventListener("change", (e) => {
      this._mapId = (e.target as HTMLSelectElement).value;
    });
    document.getElementById("mw-royale-back")?.addEventListener("click", () => { this._removeMenu(); this._showMainMenu(); });
    document.getElementById("mw-royale-start")?.addEventListener("click", () => { this._removeMenu(); this._startMageRoyale(); });
  }

  private _startMageRoyale(): void {
    this._isRoyaleMode = true;
    const mapDef = getMapDef(this._mapId);

    // Reset state
    this._players = [];
    this._vehicles = [];
    this._projectiles = [];
    this._killFeed = [];
    this._capturePoints = [];
    this._floatingTexts = [];
    this._teamScores = [0, 0];
    this._matchTimer = 600; // 10 min max
    this._hitMarkerTimer = 0;
    this._damageVignetteTimer = 0;
    this._fireTimer = 0;
    this._headshotTimer = 0;
    this._gameTime = 0;
    this._eliminatedTimer = 0;
    this._reloadFlashTimer = 0;
    this._abilityReadyTimer = 0;
    this._lastAbilityCooldown = 0;
    this._centerNotification = null;
    this._lastDamageDir = { x: 0, z: 0, timer: 0 };
    _projIdCounter = 0;
    _vehIdCounter = 0;

    // Build scene
    this._buildScene(mapDef);

    const rng = seededRandom(Date.now() % 10000);
    const arenaRadius = mapDef.size * 0.4;

    // Create players scattered around the arena (all team 0 for FFA display, but FFA logic)
    const cls = getClassDef(this._selectedClassId);
    const humanAngle = rng() * Math.PI * 2;
    const humanDist = arenaRadius * 0.5 + rng() * arenaRadius * 0.3;
    const human = createPlayer(
      "player_0", 0, this._selectedClassId, false,
      Math.cos(humanAngle) * humanDist, Math.sin(humanAngle) * humanDist, mapDef,
    );
    human.primaryWandId = cls.defaultPrimary;
    human.secondaryWandId = cls.defaultSecondary;
    human.heavyWandId = "meteor_launcher";
    human.ammo = [
      getWandDef(cls.defaultPrimary).magPerReload,
      getWandDef(cls.defaultSecondary).magPerReload,
      getWandDef("meteor_launcher").magPerReload,
    ];
    this._players.push(human);

    // AI opponents (all unique classes scattered around)
    for (let i = 0; i < MW.ROYALE_PLAYERS - 1; i++) {
      const aiCls = MAGE_CLASSES[i % MAGE_CLASSES.length];
      const angle = (i / (MW.ROYALE_PLAYERS - 1)) * Math.PI * 2 + rng() * 0.5;
      const dist = arenaRadius * 0.4 + rng() * arenaRadius * 0.4;
      // All on team 0 but we use FFA targeting
      const ai = createPlayer(
        `ai_${AI_NAMES[i % AI_NAMES.length]}`, (i % 2) as 0 | 1, aiCls.id, true,
        Math.cos(angle) * dist, Math.sin(angle) * dist, mapDef,
      );
      this._players.push(ai);
    }

    // Create meshes for all players
    for (const p of this._players) {
      p.mesh = this._buildMageMesh(p);
      p.mesh.position.set(p.x, p.y, p.z);
      this._scene.add(p.mesh);

      if (p.id !== "player_0") {
        p.nameTag = this._buildNameTag(p.id.replace("ai_", ""), p.team);
        p.nameTag.position.set(p.x, p.y + MW.PLAYER_HEIGHT + 0.5, p.z);
        this._scene.add(p.nameTag);
      }

      const teamCol = p.team === 0 ? 0x4488ff : 0xff4444;
      const pl = new THREE.PointLight(teamCol, 0.3, 5);
      pl.position.set(p.x, p.y + 1, p.z);
      this._scene.add(pl);
      this._playerLights.set(p.id, pl);
    }

    // Initialize royale state
    const stormRadius = arenaRadius * 1.3;
    this._royaleState = {
      stormRadius,
      stormCenterX: 0,
      stormCenterZ: 0,
      stormDelay: MW.ROYALE_STORM_INITIAL_DELAY,
      stormMesh: null,
      scrolls: [],
      artifacts: [],
      playersAlive: this._players.length,
      placement: 0,
      stormShrinking: false,
      stormTargetX: (rng() - 0.5) * arenaRadius * 0.3,
      stormTargetZ: (rng() - 0.5) * arenaRadius * 0.3,
    };

    // Create storm wall visual (inverted cylinder)
    const stormGeo = new THREE.CylinderGeometry(stormRadius, stormRadius, 40, 64, 1, true);
    const stormMat = new THREE.MeshBasicMaterial({
      color: 0x9922ff, transparent: true, opacity: 0.12, side: THREE.BackSide,
    });
    const stormMesh = new THREE.Mesh(stormGeo, stormMat);
    stormMesh.position.set(0, 15, 0);
    this._scene.add(stormMesh);
    this._royaleState.stormMesh = stormMesh;

    // --- Royale Buildings & Ruins ---
    const buildingCount = 8;
    const ruinGeometries: THREE.BufferGeometry[] = [];
    const ruinMaterials: THREE.Material[] = [];
    for (let bi = 0; bi < buildingCount; bi++) {
      const angle = (bi / buildingCount) * Math.PI * 2 + rng() * 0.4;
      const radius = arenaRadius * (0.3 + rng() * 0.5);
      const bx = Math.cos(angle) * radius;
      const bz = Math.sin(angle) * radius;
      const by = getTerrainHeight(bx, bz, mapDef);
      const isRuin = rng() > 0.4;
      const building = new THREE.Group();

      if (isRuin) {
        // Crumbling stone ruin
        const wallH = 2 + rng() * 2;
        const wallW = 3 + rng() * 2;
        const wallD = 0.4;
        // Back wall
        const wallGeo = new THREE.BoxGeometry(wallW, wallH, wallD);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.9, metalness: 0.05 });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(0, wallH / 2, -wallW / 2);
        wall.castShadow = true;
        wall.receiveShadow = true;
        building.add(wall);
        ruinGeometries.push(wallGeo);
        ruinMaterials.push(wallMat);
        // Side wall (partial)
        const sideH = wallH * (0.5 + rng() * 0.4);
        const sideGeo = new THREE.BoxGeometry(wallD, sideH, wallW * 0.7);
        const side = new THREE.Mesh(sideGeo, wallMat);
        side.position.set(-wallW / 2, sideH / 2, -wallW * 0.15);
        side.castShadow = true;
        building.add(side);
        ruinGeometries.push(sideGeo);
        // Rubble pieces
        for (let ri = 0; ri < 3; ri++) {
          const rbGeo = new THREE.BoxGeometry(0.4 + rng() * 0.6, 0.3 + rng() * 0.4, 0.4 + rng() * 0.5);
          const rb = new THREE.Mesh(rbGeo, wallMat);
          rb.position.set((rng() - 0.5) * wallW, 0.2, (rng() - 0.5) * wallW * 0.5);
          rb.rotation.set(rng() * 0.3, rng() * Math.PI, rng() * 0.3);
          building.add(rb);
          ruinGeometries.push(rbGeo);
        }
        // Floor
        const floorGeo = new THREE.BoxGeometry(wallW + 0.5, 0.1, wallW * 0.7);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x6a6458, roughness: 0.95 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.set(0, 0.05, 0);
        floor.receiveShadow = true;
        building.add(floor);
        ruinGeometries.push(floorGeo);
        ruinMaterials.push(floorMat);
      } else {
        // Small intact stone building / tower
        const bW = 2.5 + rng() * 1.5;
        const bH = 3 + rng() * 2;
        const bodyGeo = new THREE.BoxGeometry(bW, bH, bW);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x9a9080, roughness: 0.85, metalness: 0.05 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(0, bH / 2, 0);
        body.castShadow = true;
        body.receiveShadow = true;
        building.add(body);
        ruinGeometries.push(bodyGeo);
        ruinMaterials.push(bodyMat);
        // Roof
        const roofGeo = new THREE.ConeGeometry(bW * 0.8, 1.5, 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, bH + 0.75, 0);
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        building.add(roof);
        ruinGeometries.push(roofGeo);
        ruinMaterials.push(roofMat);
        // Door opening (dark rectangle)
        const doorGeo = new THREE.PlaneGeometry(0.8, 1.6);
        const doorMat = new THREE.MeshBasicMaterial({ color: 0x1a1510, side: THREE.DoubleSide });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 0.8, bW / 2 + 0.01);
        building.add(door);
        ruinGeometries.push(doorGeo);
        ruinMaterials.push(doorMat);
      }

      building.position.set(bx, by, bz);
      building.rotation.y = rng() * Math.PI * 2;
      this._scene.add(building);
    }

    // Scatter spell scrolls on the ground
    for (let i = 0; i < MW.ROYALE_SCROLL_COUNT; i++) {
      const sx = (rng() - 0.5) * arenaRadius * 1.6;
      const sz = (rng() - 0.5) * arenaRadius * 1.6;
      const sy = getTerrainHeight(sx, sz, mapDef) + 0.5;
      const wandPool = WAND_DEFS.filter(w => w.category !== "heavy");
      const wandId = wandPool[Math.floor(rng() * wandPool.length)].id;
      const scroll: RoyaleScroll = { id: `scroll_${i}`, x: sx, y: sy, z: sz, wandId, picked: false, mesh: null };
      scroll.mesh = this._buildScrollMesh(scroll);
      scroll.mesh.position.set(sx, sy, sz);
      this._scene.add(scroll.mesh);
      this._royaleState.scrolls.push(scroll);
    }

    // Scatter artifacts
    const artifactTypes: RoyaleArtifact["type"][] = ["hp_boost", "mana_boost", "speed_boost", "damage_boost", "shield"];
    for (let i = 0; i < MW.ROYALE_ARTIFACT_COUNT; i++) {
      const ax = (rng() - 0.5) * arenaRadius * 1.4;
      const az = (rng() - 0.5) * arenaRadius * 1.4;
      const ay = getTerrainHeight(ax, az, mapDef) + 0.6;
      const aType = artifactTypes[Math.floor(rng() * artifactTypes.length)];
      const artifact: RoyaleArtifact = { id: `artifact_${i}`, x: ax, y: ay, z: az, type: aType, picked: false, mesh: null };
      artifact.mesh = this._buildArtifactMesh(artifact);
      artifact.mesh.position.set(ax, ay, az);
      this._scene.add(artifact.mesh);
      this._royaleState.artifacts.push(artifact);
    }

    // Spawn map vehicles if any
    if (this._optVehiclesEnabled && mapDef.mapVehicles) {
      for (const mv of mapDef.mapVehicles) {
        const mvDef = MAP_VEHICLE_DEFS.find(d => d.id === mv.defId);
        if (!mvDef) continue;
        for (let i = 0; i < mv.count; i++) {
          const vx = (rng() - 0.5) * mapDef.size * 0.6;
          const vz = (rng() - 0.5) * mapDef.size * 0.6;
          const veh = createVehicle(mv.defId, -1, vx, vz, mapDef);
          veh.mesh = this._buildVehicleMesh(veh);
          veh.mesh.position.set(veh.x, veh.y, veh.z);
          this._scene.add(veh.mesh);
          this._vehicles.push(veh);
        }
      }
    }

    // HUD
    this._createHUD();

    // Start with warmup
    this._phase = MWPhase.WARMUP;
    this._warmupTimer = MW.WARMUP_TIME;
    this._lastTime = performance.now();
    this._simAccum = 0;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._gameLoop(performance.now());
    this._showWarmupCountdown();
  }

  private _buildScrollMesh(scroll: RoyaleScroll): THREE.Group {
    const group = new THREE.Group();
    // Glowing scroll tube
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, roughness: 0.4, metalness: 0.3 });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), tubeMat);
    tube.rotation.z = Math.PI / 2;
    group.add(tube);
    // End caps
    const capMat = new THREE.MeshStandardMaterial({ color: 0xaa8844, roughness: 0.3, metalness: 0.5 });
    for (const cx of [-0.28, 0.28]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 8), capMat);
      cap.position.x = cx;
      cap.rotation.z = Math.PI / 2;
      group.add(cap);
    }
    // Glow aura
    const wandDef = getWandDef(scroll.wandId);
    const glowMat = new THREE.MeshBasicMaterial({ color: wandDef.projectileColor, transparent: true, opacity: 0.3 });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), glowMat);
    glow.name = "scrollGlow";
    group.add(glow);
    // Floating sparkle
    const sparkle = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    sparkle.position.y = 0.45;
    sparkle.name = "scrollSparkle";
    group.add(sparkle);
    group.userData.scrollId = scroll.id;
    return group;
  }

  private _buildArtifactMesh(artifact: RoyaleArtifact): THREE.Group {
    const group = new THREE.Group();
    const colorMap: Record<string, number> = {
      hp_boost: 0xff4444, mana_boost: 0x4488ff, speed_boost: 0x44ff44,
      damage_boost: 0xff8800, shield: 0xffdd44,
    };
    const color = colorMap[artifact.type] || 0xffffff;
    // Floating gem
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.6 }));
    gem.name = "artifactGem";
    group.add(gem);
    // Outer glow
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2 }));
    glow.name = "artifactGlow";
    group.add(glow);
    // Rotating ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 6, 16), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }));
    ring.name = "artifactRing";
    group.add(ring);
    // Label icon (small sprite-like indicator)
    const iconMap: Record<string, string> = {
      hp_boost: "+HP", mana_boost: "+MP", speed_boost: "+SPD",
      damage_boost: "+DMG", shield: "SHD",
    };
    group.userData.artifactId = artifact.id;
    group.userData.artifactLabel = iconMap[artifact.type] || "?";
    return group;
  }

  private _royaleSimTick(dt: number): void {
    const rs = this._royaleState;
    if (!rs) return;
    const mapDef = getMapDef(this._mapId);

    // Count alive players
    rs.playersAlive = this._players.filter(p => p.alive).length;

    // Storm delay countdown
    if (rs.stormDelay > 0) {
      rs.stormDelay -= dt;
      if (rs.stormDelay <= 0) {
        rs.stormShrinking = true;
        this._centerNotification = { text: "THE STORM IS CLOSING IN!", color: "#ff4488", timer: 3, size: 28 };
      }
    }

    // Shrink storm
    if (rs.stormShrinking && rs.stormRadius > MW.ROYALE_STORM_MIN_RADIUS) {
      rs.stormRadius -= MW.ROYALE_STORM_SHRINK_RATE * dt;
      if (rs.stormRadius < MW.ROYALE_STORM_MIN_RADIUS) rs.stormRadius = MW.ROYALE_STORM_MIN_RADIUS;

      // Slowly drift storm center toward target
      rs.stormCenterX = lerp(rs.stormCenterX, rs.stormTargetX, dt * 0.02);
      rs.stormCenterZ = lerp(rs.stormCenterZ, rs.stormTargetZ, dt * 0.02);

      // Update storm mesh scale
      if (rs.stormMesh) {
        const initRadius = mapDef.size * 0.4 * 1.3;
        const scaleFactor = rs.stormRadius / initRadius;
        rs.stormMesh.scale.set(scaleFactor, 1, scaleFactor);
        rs.stormMesh.position.set(rs.stormCenterX, 15, rs.stormCenterZ);
      }
    }

    // Storm damage to players outside the circle
    for (const p of this._players) {
      if (!p.alive) continue;
      const distToCenter = dist2(p.x, p.z, rs.stormCenterX, rs.stormCenterZ);
      if (distToCenter > rs.stormRadius) {
        p.hp -= MW.ROYALE_STORM_DAMAGE * dt;
        if (p.id === "player_0") this._damageVignetteTimer = Math.max(this._damageVignetteTimer, 0.2);
        if (p.hp <= 0) {
          p.hp = 0;
          p.alive = false;
          p.deaths++;
          rs.playersAlive = this._players.filter(pp => pp.alive).length;
          this._killFeed.push({
            killer: "Storm", victim: p.id,
            weapon: "Storm", time: this._gameTime,
          });
          if (p.id === "player_0") {
            rs.placement = rs.playersAlive + 1;
          }
        }
      }
    }

    // Pickup: scrolls
    for (const scroll of rs.scrolls) {
      if (scroll.picked) continue;
      for (const p of this._players) {
        if (!p.alive) continue;
        if (dist3(p.x, p.y, p.z, scroll.x, scroll.y, scroll.z) < 2.0) {
          scroll.picked = true;
          // Replace secondary wand with scroll wand
          p.secondaryWandId = scroll.wandId;
          p.ammo[1] = getWandDef(scroll.wandId).magPerReload;
          p.reloading[1] = false;
          p.reloadTimer[1] = 0;
          if (scroll.mesh) {
            this._scene.remove(scroll.mesh);
            scroll.mesh.traverse((child: any) => {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
                else child.material.dispose();
              }
            });
            scroll.mesh = null;
          }
          if (p.id === "player_0") {
            this._centerNotification = { text: `Picked up: ${getWandDef(scroll.wandId).name}`, color: "#ddcc88", timer: 2, size: 20 };
          }
          break;
        }
      }
    }

    // Pickup: artifacts
    for (const art of rs.artifacts) {
      if (art.picked) continue;
      for (const p of this._players) {
        if (!p.alive) continue;
        if (dist3(p.x, p.y, p.z, art.x, art.y, art.z) < 2.0) {
          art.picked = true;
          switch (art.type) {
            case "hp_boost": p.maxHp += 30; p.hp = Math.min(p.hp + 50, p.maxHp); break;
            case "mana_boost": p.maxMana += 25; p.mana = Math.min(p.mana + 40, p.maxMana); break;
            case "speed_boost": p.speed *= 1.15; break;
            case "damage_boost": p.armor += 5; break; // damage reduction
            case "shield": p.shieldHp += 50; break;
          }
          if (art.mesh) {
            this._scene.remove(art.mesh);
            art.mesh.traverse((child: any) => {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
                else child.material.dispose();
              }
            });
            art.mesh = null;
          }
          if (p.id === "player_0") {
            const labels: Record<string, string> = {
              hp_boost: "+HP Boost!", mana_boost: "+Mana Boost!", speed_boost: "+Speed Boost!",
              damage_boost: "+Armor Boost!", shield: "+Shield!",
            };
            const colors: Record<string, string> = {
              hp_boost: "#ff4444", mana_boost: "#4488ff", speed_boost: "#44ff44",
              damage_boost: "#ff8800", shield: "#ffdd44",
            };
            this._centerNotification = { text: labels[art.type] || "Artifact!", color: colors[art.type] || "#fff", timer: 2, size: 22 };
          }
          break;
        }
      }
    }

    // Animate scroll/artifact meshes
    const t = this._gameTime;
    for (const scroll of rs.scrolls) {
      if (scroll.picked || !scroll.mesh) continue;
      scroll.mesh.position.y = scroll.y + Math.sin(t * 2 + scroll.x) * 0.15;
      scroll.mesh.rotation.y = t * 1.5;
      scroll.mesh.traverse(c => {
        if (c.name === "scrollSparkle") c.rotation.y = t * 4;
        if (c.name === "scrollGlow") {
          (c as THREE.Mesh).scale.setScalar(1 + Math.sin(t * 3) * 0.15);
        }
      });
    }
    for (const art of rs.artifacts) {
      if (art.picked || !art.mesh) continue;
      art.mesh.position.y = art.y + Math.sin(t * 2.5 + art.z) * 0.2;
      art.mesh.traverse(c => {
        if (c.name === "artifactGem") c.rotation.y = t * 2;
        if (c.name === "artifactRing") {
          c.rotation.x = t * 1.5;
          c.rotation.z = t * 0.8;
        }
        if (c.name === "artifactGlow") {
          (c as THREE.Mesh).scale.setScalar(1 + Math.sin(t * 3.5) * 0.2);
        }
      });
    }

    // Check royale win condition (FFA: last alive wins)
    const humanAlive = this._players.find(p => p.id === "player_0")?.alive;
    if (rs.playersAlive <= 1 || !humanAlive) {
      if (humanAlive && rs.playersAlive <= 1) {
        rs.placement = 1;
      } else if (!humanAlive && rs.placement === 0) {
        rs.placement = rs.playersAlive + 1;
      }
      if (this._rafId) cancelAnimationFrame(this._rafId);
      this._rafId = 0;
      this._showRoyaleEnd();
    }

    // Override team targeting for AI: in royale, target anyone regardless of team
    for (const p of this._players) {
      if (!p.isAI || !p.alive) continue;
      // Storm awareness: if outside storm, move toward center
      if (rs.stormShrinking) {
        const dCenter = dist2(p.x, p.z, rs.stormCenterX, rs.stormCenterZ);
        if (dCenter > rs.stormRadius * 0.85) {
          // Override wander target to storm center
          p.aiState.wanderTarget = { x: rs.stormCenterX + (Math.random() - 0.5) * rs.stormRadius * 0.3, z: rs.stormCenterZ + (Math.random() - 0.5) * rs.stormRadius * 0.3 };
          p.aiState.targetId = null; // focus on survival
        }
      }

      // Seek nearby scrolls/artifacts
      if (!p.aiState.targetId && Math.random() < 0.01) {
        let nearestPickup: { x: number; z: number } | null = null;
        let nearestDist = 30;
        for (const scroll of rs.scrolls) {
          if (scroll.picked) continue;
          const d = dist2(p.x, p.z, scroll.x, scroll.z);
          if (d < nearestDist) { nearestDist = d; nearestPickup = { x: scroll.x, z: scroll.z }; }
        }
        for (const art of rs.artifacts) {
          if (art.picked) continue;
          const d = dist2(p.x, p.z, art.x, art.z);
          if (d < nearestDist) { nearestDist = d; nearestPickup = { x: art.x, z: art.z }; }
        }
        if (nearestPickup) {
          p.aiState.wanderTarget = nearestPickup;
        }
      }
    }
  }

  private _showRoyaleEnd(): void {
    this._phase = MWPhase.ROUND_END;
    this._isRoyaleMode = false;

    // Dispose storm mesh
    if (this._royaleState?.stormMesh) {
      this._scene.remove(this._royaleState.stormMesh);
      this._royaleState.stormMesh.geometry.dispose();
      (this._royaleState.stormMesh.material as THREE.Material).dispose();
      this._royaleState.stormMesh = null;
    }

    // Dispose remaining unpicked scrolls
    if (this._royaleState) {
      for (const s of this._royaleState.scrolls) {
        if (s.mesh) {
          this._scene.remove(s.mesh);
          s.mesh.traverse((child: any) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
              else child.material.dispose();
            }
          });
        }
      }
      for (const a of this._royaleState.artifacts) {
        if (a.mesh) {
          this._scene.remove(a.mesh);
          a.mesh.traverse((child: any) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
              else child.material.dispose();
            }
          });
        }
      }
    }

    document.exitPointerLock();
    this._removeMenu();
    this._menuDiv = document.createElement("div");
    this._menuDiv.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:35;` +
      `background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;` +
      `font-family:'Segoe UI',sans-serif;color:#e0d5c0;`;

    const rs = this._royaleState!;
    const placement = rs.placement;
    const isWinner = placement === 1;
    const placementColor = isWinner ? "#ffd700" : placement <= 3 ? "#c0c0c0" : "#cc6644";
    const placementLabel = isWinner ? "VICTORY ROYALE!" : `#${placement} of ${MW.ROYALE_PLAYERS}`;

    const allPlayers = [...this._players].sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return b.kills - a.kills;
    });
    let rows = "";
    let rank = 1;
    for (const p of allPlayers) {
      const cls = getClassDef(p.classId);
      const nameCol = p.id === "player_0" ? "#ffdd44" : "#ccc";
      const aliveCol = p.alive ? "#44ff44" : "#ff4444";
      rows += `<tr>
        <td style="padding:3px 10px;color:#888;font-size:12px">#${rank++}</td>
        <td style="padding:3px 10px;color:${nameCol}">${cls.icon} ${p.id === "player_0" ? "You" : p.id.replace("ai_", "")}</td>
        <td style="padding:3px 10px;text-align:center">${p.kills}</td>
        <td style="padding:3px 10px;text-align:center">${p.deaths}</td>
        <td style="padding:3px 10px;color:${aliveCol};text-align:center;font-size:11px">${p.alive ? "Alive" : "Eliminated"}</td>
      </tr>`;
    }

    this._menuDiv.innerHTML = `
      <h1 style="color:${placementColor};font-size:48px;margin-bottom:8px;text-shadow:0 0 30px ${placementColor}66">${placementLabel}</h1>
      <div style="font-size:16px;color:#aa7799;margin-bottom:20px">Mage Royale - ${MAP_DEFS.find(m => m.id === this._mapId)?.name || this._mapId}</div>

      <table style="background:rgba(20,10,30,0.6);border:1px solid #444;border-radius:8px;border-collapse:collapse;margin-bottom:20px;max-height:300px;overflow-y:auto;display:block">
        <tr style="color:#888;font-size:11px;border-bottom:1px solid #333">
          <th style="padding:5px 10px">Rank</th><th style="padding:5px 10px;text-align:left">Player</th>
          <th style="padding:5px 10px">Kills</th><th style="padding:5px 10px">Deaths</th><th style="padding:5px 10px">Status</th>
        </tr>
        ${rows}
      </table>

      <div style="display:flex;gap:12px">
        <button id="mw-royale-again" style="${this._menuBtnStyle("#2a0020", "#ff4488")}">Play Again</button>
        <button id="mw-royale-menu" style="${this._menuBtnStyle("#2a2a2a", "#555")}">Back to Menu</button>
      </div>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._menuDiv);

    document.getElementById("mw-royale-again")?.addEventListener("click", () => {
      this._removeMenu(); this._removeHUD();
      this._royaleState = null;
      this._startMageRoyale();
    });
    document.getElementById("mw-royale-menu")?.addEventListener("click", () => {
      this._removeMenu(); this._removeHUD();
      this._players = []; this._vehicles = []; this._projectiles = [];
      this._royaleState = null;
      if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = 0; }
      this._showMainMenu();
    });
  }


  // ---- Pause Menu ----
  private _showPauseMenu(): void {
    this._removeMenu();
    this._menuDiv = document.createElement("div");
    this._menuDiv.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:35;` +
      `background:rgba(0,0,0,0.7);display:flex;flex-direction:column;align-items:center;justify-content:center;` +
      `font-family:'Segoe UI',sans-serif;color:#e0d5c0;`;

    this._menuDiv.innerHTML = `
      <h2 style="color:#daa520;margin-bottom:20px;font-size:32px;letter-spacing:2px">PAUSED</h2>
      <button id="mw-resume" style="${this._menuBtnStyle("#1a3a1a", "#44cc44")}">Resume</button>
      <button id="mw-controls" style="${this._menuBtnStyle()}">Controls</button>
      <button id="mw-concepts" style="${this._menuBtnStyle()}">Game Concepts</button>
      <button id="mw-quit" style="${this._menuBtnStyle("#3a1a1a", "#cc4444")}">Quit to Menu</button>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._menuDiv);

    document.getElementById("mw-resume")?.addEventListener("click", () => { this._resumeFromPause(); });
    document.getElementById("mw-controls")?.addEventListener("click", () => { this._showControls(); });
    document.getElementById("mw-concepts")?.addEventListener("click", () => { this._showConcepts(); });
    document.getElementById("mw-quit")?.addEventListener("click", () => {
      this._removeMenu();
      this._removeHUD();
      this._phase = MWPhase.MAIN_MENU;
      this._players = [];
      this._vehicles = [];
      this._projectiles = [];
      if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = 0; }
      this._showMainMenu();
    });
  }

  private _resumeFromPause(): void {
    this._removeMenu();
    if (this._warmupTimer > 0) {
      this._phase = MWPhase.WARMUP;
    } else {
      this._phase = this._isRoyaleMode ? MWPhase.ROYALE_PLAYING : MWPhase.PLAYING;
    }
    if (this._pointerLocked === false) {
      this._canvas.requestPointerLock();
    }
  }

  // ---- Controls sub-screen ----
  private _showControls(): void {
    this._removeMenu();
    this._menuDiv = document.createElement("div");
    this._menuDiv.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:35;` +
      `background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;` +
      `font-family:'Segoe UI',sans-serif;color:#e0d5c0;`;

    const controls = [
      ["WASD", "Move"],
      ["Space", "Jump"],
      ["Shift", "Sprint"],
      ["Ctrl", "Crouch"],
      ["Left Click", "Fire Wand"],
      ["Right Click", "ADS (Aim Down Sights)"],
      ["1 / 2 / 3", "Switch Wand Slot"],
      ["Scroll Wheel", "Cycle Wand Slot"],
      ["R", "Reload"],
      ["Q", "Use Class Ability"],
      ["E", "Enter / Exit Vehicle"],
      ["Tab (hold)", "Scoreboard"],
      ["Esc", "Pause Menu"],
    ];
    let rows = "";
    for (const [key, desc] of controls) {
      rows += `<tr><td style="padding:6px 20px;text-align:right;color:#daa520;font-weight:bold;font-size:14px">${key}</td>` +
        `<td style="padding:6px 20px;text-align:left;color:#ccc;font-size:14px">${desc}</td></tr>`;
    }

    this._menuDiv.innerHTML = `
      <h2 style="color:#daa520;margin-bottom:20px;font-size:28px">Controls</h2>
      <table style="border-collapse:collapse;background:rgba(20,15,30,0.6);border-radius:8px;overflow:hidden;border:1px solid #444">
        ${rows}
      </table>
      <button id="mw-ctrl-back" style="${this._menuBtnStyle("#2a2a2a", "#555")};margin-top:20px">Back</button>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._menuDiv);
    document.getElementById("mw-ctrl-back")?.addEventListener("click", () => { this._showPauseMenu(); });
  }

  // ---- Game Concepts sub-screen ----
  private _showConcepts(): void {
    this._removeMenu();
    this._menuDiv = document.createElement("div");
    this._menuDiv.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:35;` +
      `background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;` +
      `font-family:'Segoe UI',sans-serif;color:#e0d5c0;overflow-y:auto;padding:30px 0;`;

    const sections = [
      { title: "Mage Classes", text: "8 unique mage classes, each with different HP, mana, speed, armor, and a special ability. Choose a class that matches your playstyle: tanky Battlemage, explosive Pyromancer, precise Cryomancer, fast Stormcaller, stealthy Shadowmancer, supportive Druid, life-stealing Warlock, or versatile Archmage." },
      { title: "Wand Types", text: "Primary wands are your main weapon (rifles, SMGs). Secondary wands are sidearms (pistols, shotguns). Heavy wands deal massive AoE damage (rocket launchers). Each wand has different damage, fire rate, range, mana cost, and magazine size." },
      { title: "Vehicles - Ground", text: "Ground vehicles (War Rhino, Iron Tortoise, Dire Boar, War Elephant) act as tanks. Slow but heavily armored with powerful weapons. Drive near one and press E to enter." },
      { title: "Vehicles - Air Hover", text: "Hover vehicles (War Drake, Wyvern, Giant Bat) act as attack helicopters. They hover at a set altitude and can strafe. Agile with rapid-fire weapons." },
      { title: "Vehicles - Air Fly", text: "Flying vehicles (Elder Dragon, Phoenix, Royal Griffin) act as fighter jets. Extremely fast with powerful weapons but harder to control. They fly at high altitude." },
      { title: "Team Play", text: "Two teams of 5 mages each. Blue team vs Red team. Work together to dominate the battlefield." },
      { title: "Scoring", text: `Kill an enemy mage: +${MW.KILL_SCORE} points. Destroy a vehicle: +${MW.VEHICLE_KILL_SCORE} points. First team to ${MW.SCORE_TO_WIN} points or highest score when time runs out wins.` },
      { title: "Abilities", text: "Each class has a unique ability on Q. Abilities have cooldowns. Examples: Shield (Battlemage), Fire Burst (Pyromancer), Freeze (Cryomancer), Chain Lightning (Stormcaller), Invisibility (Shadowmancer), Heal (Druid), Soul Drain (Warlock), Teleport (Archmage)." },
    ];
    let html = "";
    for (const s of sections) {
      html += `<div style="max-width:600px;margin-bottom:16px;padding:12px 18px;background:rgba(20,15,30,0.6);border:1px solid #444;border-radius:6px">` +
        `<h3 style="color:#daa520;margin:0 0 6px 0;font-size:16px">${s.title}</h3>` +
        `<p style="color:#bbb;margin:0;font-size:13px;line-height:1.5">${s.text}</p></div>`;
    }

    this._menuDiv.innerHTML = `
      <h2 style="color:#daa520;margin-bottom:20px;font-size:28px">Game Concepts</h2>
      ${html}
      <button id="mw-conc-back" style="${this._menuBtnStyle("#2a2a2a", "#555")};margin-top:10px">Back</button>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._menuDiv);
    document.getElementById("mw-conc-back")?.addEventListener("click", () => { this._showPauseMenu(); });
  }

  // ---- Scoreboard overlay ----
  private _scoreboardDiv: HTMLDivElement | null = null;

  private _showScoreboard(): void {
    if (this._scoreboardDiv) return;
    this._scoreboardDiv = document.createElement("div");
    this._scoreboardDiv.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:40;` +
      `background:rgba(5,3,15,0.9);border:1px solid #daa520;border-radius:8px;padding:20px;min-width:500px;` +
      `font-family:'Segoe UI',sans-serif;color:#e0d5c0;`;

    this._updateScoreboardContent();
    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._scoreboardDiv);
  }

  private _updateScoreboardContent(): void {
    if (!this._scoreboardDiv) return;
    const team0 = this._players.filter(p => p.team === 0).sort((a, b) => b.score - a.score);
    const team1 = this._players.filter(p => p.team === 1).sort((a, b) => b.score - a.score);

    const makeRows = (team: MWPlayer[]) => team.map(p => {
      const cls = getClassDef(p.classId);
      const nameCol = p.isAI ? "#ccc" : "#ffdd44";
      return `<tr><td style="padding:3px 10px;color:${nameCol};font-size:13px">${cls.icon} ${p.id === "player_0" ? "You" : p.id.replace("ai_", "")}</td>` +
        `<td style="padding:3px 10px;text-align:center;font-size:13px">${p.kills}</td>` +
        `<td style="padding:3px 10px;text-align:center;font-size:13px">${p.deaths}</td>` +
        `<td style="padding:3px 10px;text-align:center;font-size:13px">${p.assists}</td>` +
        `<td style="padding:3px 10px;text-align:center;font-size:13px;color:#daa520">${p.score}</td></tr>`;
    }).join("");

    this._scoreboardDiv.innerHTML = `
      <div style="text-align:center;margin-bottom:12px">
        <span style="color:#4488ff;font-size:24px;font-weight:bold">${this._teamScores[0]}</span>
        <span style="color:#888;font-size:18px;margin:0 15px">vs</span>
        <span style="color:#ff4444;font-size:24px;font-weight:bold">${this._teamScores[1]}</span>
      </div>
      <div style="display:flex;gap:20px">
        <div>
          <h4 style="color:#4488ff;margin:0 0 6px 0;text-align:center">Blue Team</h4>
          <table style="width:100%"><tr style="color:#888;font-size:11px"><th style="text-align:left;padding:2px 10px">Name</th><th>K</th><th>D</th><th>A</th><th>Score</th></tr>${makeRows(team0)}</table>
        </div>
        <div>
          <h4 style="color:#ff4444;margin:0 0 6px 0;text-align:center">Red Team</h4>
          <table style="width:100%"><tr style="color:#888;font-size:11px"><th style="text-align:left;padding:2px 10px">Name</th><th>K</th><th>D</th><th>A</th><th>Score</th></tr>${makeRows(team1)}</table>
        </div>
      </div>
    `;
  }

  private _hideScoreboard(): void {
    if (this._scoreboardDiv?.parentNode) {
      this._scoreboardDiv.parentNode.removeChild(this._scoreboardDiv);
      this._scoreboardDiv = null;
    }
  }

  // ---- Round End Screen ----
  private _showRoundEnd(): void {
    this._phase = MWPhase.ROUND_END;
    document.exitPointerLock();
    this._removeMenu();
    this._menuDiv = document.createElement("div");
    this._menuDiv.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:35;` +
      `background:rgba(0,0,0,0.8);display:flex;flex-direction:column;align-items:center;justify-content:center;` +
      `font-family:'Segoe UI',sans-serif;color:#e0d5c0;`;

    const winner = this._teamScores[0] >= this._teamScores[1] ? 0 : 1;
    const winColor = winner === 0 ? "#4488ff" : "#ff4444";
    const winLabel = winner === 0 ? "Blue Team Wins!" : "Red Team Wins!";

    const allPlayers = [...this._players].sort((a, b) => b.score - a.score);
    let rows = "";
    for (const p of allPlayers) {
      const cls = getClassDef(p.classId);
      const teamCol = p.team === 0 ? "#4488ff" : "#ff4444";
      const nameCol = p.isAI ? "#ccc" : "#ffdd44";
      rows += `<tr>
        <td style="padding:4px 12px;color:${teamCol}">${p.team === 0 ? "Blue" : "Red"}</td>
        <td style="padding:4px 12px;color:${nameCol}">${cls.icon} ${p.id === "player_0" ? "You" : p.id.replace("ai_", "")}</td>
        <td style="padding:4px 12px;text-align:center">${p.kills}</td>
        <td style="padding:4px 12px;text-align:center">${p.deaths}</td>
        <td style="padding:4px 12px;text-align:center">${p.assists}</td>
        <td style="padding:4px 12px;text-align:center;color:#daa520;font-weight:bold">${p.score}</td>
      </tr>`;
    }

    this._menuDiv.innerHTML = `
      <h1 style="color:${winColor};font-size:42px;margin-bottom:5px;text-shadow:0 0 20px ${winColor}66">${winLabel}</h1>
      <div style="font-size:24px;margin-bottom:20px">
        <span style="color:#4488ff">${this._teamScores[0]}</span>
        <span style="color:#888;margin:0 10px">-</span>
        <span style="color:#ff4444">${this._teamScores[1]}</span>
      </div>
      <table style="background:rgba(20,15,30,0.6);border:1px solid #444;border-radius:8px;border-collapse:collapse;margin-bottom:20px">
        <tr style="color:#888;font-size:12px;border-bottom:1px solid #333">
          <th style="padding:6px 12px;text-align:left">Team</th><th style="padding:6px 12px;text-align:left">Player</th>
          <th style="padding:6px 12px">Kills</th><th style="padding:6px 12px">Deaths</th><th style="padding:6px 12px">Assists</th><th style="padding:6px 12px">Score</th>
        </tr>
        ${rows}
      </table>
      <div style="display:flex;gap:12px">
        <button id="mw-re-again" style="${this._menuBtnStyle("#1a3a1a", "#44cc44")}">Play Again</button>
        <button id="mw-re-menu" style="${this._menuBtnStyle("#2a2a2a", "#555")}">Back to Menu</button>
      </div>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._menuDiv);

    document.getElementById("mw-re-again")?.addEventListener("click", () => { this._removeMenu(); this._removeHUD(); this._startMatch(); });
    document.getElementById("mw-re-menu")?.addEventListener("click", () => {
      this._removeMenu(); this._removeHUD();
      this._players = []; this._vehicles = []; this._projectiles = [];
      if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = 0; }
      this._showMainMenu();
    });
  }


  // =====================================================================
  // HUD
  // =====================================================================

  private _createHUD(): void {
    this._removeHUD();
    this._hudDiv = document.createElement("div");
    this._hudDiv.id = "magewars-hud";
    this._hudDiv.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:20;pointer-events:none;` +
      `font-family:'Segoe UI',sans-serif;color:#e0d5c0;`;

    // Enhanced crosshair with circle and gapped lines
    const ch = `<div id="mw-crosshair" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none">` +
      `<div style="position:absolute;width:4px;height:4px;border:1px solid rgba(255,255,255,0.9);border-radius:50%;left:-2px;top:-2px"></div>` +
      `<div style="position:absolute;width:16px;height:2px;background:rgba(255,255,255,0.8);left:6px;top:-1px"></div>` +
      `<div style="position:absolute;width:16px;height:2px;background:rgba(255,255,255,0.8);right:6px;top:-1px;transform:translateX(-100%)"></div>` +
      `<div style="position:absolute;width:2px;height:16px;background:rgba(255,255,255,0.8);left:-1px;top:6px"></div>` +
      `<div style="position:absolute;width:2px;height:16px;background:rgba(255,255,255,0.8);left:-1px;bottom:6px;transform:translateY(100%)"></div>` +
      `</div>`;

    // Vehicle crosshair (larger circle, hidden by default)
    const vch = `<div id="mw-vehicle-crosshair" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;display:none">` +
      `<div style="width:40px;height:40px;border:2px solid rgba(255,100,100,0.7);border-radius:50%"></div>` +
      `<div style="position:absolute;width:6px;height:2px;background:rgba(255,100,100,0.8);left:-8px;top:19px"></div>` +
      `<div style="position:absolute;width:6px;height:2px;background:rgba(255,100,100,0.8);right:-8px;top:19px"></div>` +
      `</div>`;

    // Hit marker
    const hm = `<div id="mw-hitmarker" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;opacity:0;transition:opacity 0.1s">` +
      `<div style="position:absolute;width:14px;height:2px;background:#fff;transform:rotate(45deg);left:-7px;top:-1px"></div>` +
      `<div style="position:absolute;width:14px;height:2px;background:#fff;transform:rotate(-45deg);left:-7px;top:-1px"></div>` +
      `</div>`;

    // Damage vignette
    const vig = `<div id="mw-vignette" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;opacity:0;` +
      `background:radial-gradient(ellipse at center,rgba(255,0,0,0.05) 0%,rgba(200,0,0,0.15) 40%,rgba(180,0,0,0.5) 80%,rgba(150,0,0,0.7) 100%);transition:opacity 0.15s"></div>`;

    // Low HP warning vignette
    const lowHpVig = `<div id="mw-lowhp-vignette" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;opacity:0;` +
      `background:radial-gradient(ellipse at center,transparent 40%,rgba(255,0,0,0.3) 100%);transition:opacity 0.5s"></div>`;

    // Hit direction indicator
    const hitDir = `<div id="mw-hitdir" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;opacity:0;transition:opacity 0.3s">` +
      `<div id="mw-hitdir-arrow" style="width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:20px solid rgba(255,0,0,0.7);position:absolute;top:-80px;left:-10px"></div>` +
      `</div>`;

    // Health bar (bottom left)
    const hp = `<div style="position:absolute;bottom:60px;left:20px">` +
      `<div style="font-size:12px;color:#cc4444;margin-bottom:2px">HP</div>` +
      `<div style="width:200px;height:16px;background:rgba(0,0,0,0.6);border:1px solid #555;border-radius:3px">` +
      `<div id="mw-hp-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#cc2222,#ff4444);border-radius:2px;transition:width 0.15s"></div></div>` +
      `<div id="mw-hp-text" style="font-size:11px;color:#ddd;margin-top:1px">100 / 100</div></div>`;

    // Mana bar
    const mana = `<div style="position:absolute;bottom:20px;left:20px">` +
      `<div style="font-size:12px;color:#4488ff;margin-bottom:2px">MANA</div>` +
      `<div style="width:200px;height:12px;background:rgba(0,0,0,0.6);border:1px solid #555;border-radius:3px">` +
      `<div id="mw-mana-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#2244cc,#4488ff);border-radius:2px;transition:width 0.15s"></div></div>` +
      `<div id="mw-mana-text" style="font-size:11px;color:#ddd;margin-top:1px">100 / 100</div></div>`;

    // Ammo (bottom right) with reload progress bar and timer
    const ammo = `<div style="position:absolute;bottom:40px;right:20px;text-align:right">` +
      `<div id="mw-wand-name" style="font-size:14px;color:#daa520;margin-bottom:4px">Arcane Bolt Wand</div>` +
      `<div id="mw-ammo-text" style="font-size:28px;color:#fff;font-weight:bold">12</div>` +
      `<div id="mw-reload-container" style="opacity:0;margin-top:4px;transition:opacity 0.15s">` +
        `<div style="display:flex;align-items:center;justify-content:flex-end;gap:8px">` +
          `<span id="mw-reload-text" style="font-size:12px;color:#ff8844;font-weight:bold">RELOADING</span>` +
          `<span id="mw-reload-timer" style="font-size:14px;color:#ffaa44;font-weight:bold;min-width:30px">1.2s</span>` +
        `</div>` +
        `<div style="width:160px;height:6px;background:rgba(0,0,0,0.6);border:1px solid #555;border-radius:3px;margin-top:3px;margin-left:auto">` +
          `<div id="mw-reload-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#ff6622,#ffaa44);border-radius:2px;transition:width 0.05s"></div>` +
        `</div>` +
      `</div>` +
      `<div id="mw-firerate-bar-container" style="margin-top:4px;opacity:0;transition:opacity 0.1s">` +
        `<div style="width:160px;height:3px;background:rgba(0,0,0,0.4);border-radius:2px;margin-left:auto">` +
          `<div id="mw-firerate-bar" style="height:100%;width:0%;background:rgba(255,255,255,0.5);border-radius:2px"></div>` +
        `</div>` +
      `</div>` +
    `</div>`;

    // Wand slot indicators (bottom center) with cooldown overlays
    const makeSlot = (i: number) => {
      return `<div id="mw-slot-${i}" class="mw-slot" style="width:50px;height:50px;border:2px solid ${i === 0 ? '#daa520' : '#555'};border-radius:4px;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;font-size:10px;flex-direction:column;position:relative;overflow:hidden">` +
        `<div id="mw-slot-cd-${i}" style="position:absolute;bottom:0;left:0;width:100%;height:0%;background:rgba(255,136,0,0.35);transition:height 0.05s;pointer-events:none"></div>` +
        `<span style="font-size:16px;position:relative;z-index:1" id="mw-slot-icon-${i}"></span>` +
        `<span style="font-size:8px;color:#888;position:relative;z-index:1">${i + 1}</span>` +
        `<span id="mw-slot-cd-text-${i}" style="position:absolute;font-size:9px;color:#ffaa44;font-weight:bold;bottom:2px;right:3px;z-index:2;opacity:0"></span>` +
      `</div>`;
    };
    const wandSlots = `<div id="mw-wand-slots" style="position:absolute;bottom:15px;left:50%;transform:translateX(-50%);display:flex;gap:8px">` +
      makeSlot(0) + makeSlot(1) + makeSlot(2) +
      `</div>`;

    // Kill feed (top right)
    const kf = `<div id="mw-killfeed" style="position:absolute;top:40px;right:20px;text-align:right;font-size:12px"></div>`;

    // Team scores (top center)
    const scores = `<div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:15px;font-size:20px;font-weight:bold">` +
      `<span id="mw-score-0" style="color:#4488ff">0</span>` +
      `<span id="mw-timer" style="color:#daa520;font-size:16px">5:00</span>` +
      `<span id="mw-score-1" style="color:#ff4444">0</span></div>`;

    // Minimap (top left)
    const mm = `<div style="position:absolute;top:10px;left:10px;border:2px solid #555;border-radius:4px;overflow:hidden">` +
      `<canvas id="mw-minimap" width="140" height="140" style="background:rgba(0,0,0,0.5)"></canvas></div>`;

    // Ability cooldown indicator
    const ab = `<div id="mw-ability" style="position:absolute;bottom:100px;left:50%;transform:translateX(-50%);text-align:center;font-size:12px">` +
      `<div id="mw-ability-name" style="color:#aa88cc"></div>` +
      `<div id="mw-ability-cd" style="color:#888;font-size:11px"></div></div>`;

    // Respawn overlay
    const respawn = `<div id="mw-respawn" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;display:none;` +
      `background:rgba(0,0,0,0.6);align-items:center;justify-content:center;flex-direction:column">` +
      `<div style="font-size:32px;color:#ff4444;font-weight:bold">YOU DIED</div>` +
      `<div id="mw-respawn-timer" style="font-size:20px;color:#daa520;margin-top:10px">Respawning in 5.0s</div></div>`;

    // Headshot notification
    const headshot = `<div id="mw-headshot" style="position:absolute;top:35%;left:50%;transform:translate(-50%,-50%);pointer-events:none;opacity:0;` +
      `font-size:24px;font-weight:bold;color:#ffdd44;text-shadow:0 0 10px rgba(255,221,68,0.5);transition:opacity 0.3s;letter-spacing:2px">HEADSHOT</div>`;

    // Vehicle HP bar
    const vhp = `<div id="mw-vehicle-hp" style="position:absolute;bottom:90px;left:50%;transform:translateX(-50%);display:none;text-align:center">` +
      `<div style="font-size:11px;color:#aaa;margin-bottom:2px">VEHICLE HP</div>` +
      `<div style="width:200px;height:10px;background:rgba(0,0,0,0.6);border:1px solid #555;border-radius:3px">` +
      `<div id="mw-vehicle-hp-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#cc8822,#ffaa44);border-radius:2px;transition:width 0.15s"></div></div></div>`;

    // Stamina bar (below mana)
    const staminaBar = `<div style="position:absolute;bottom:4px;left:20px">` +
      `<div style="font-size:10px;color:#ccaa22;margin-bottom:1px">STAMINA</div>` +
      `<div style="width:200px;height:8px;background:rgba(0,0,0,0.6);border:1px solid #555;border-radius:3px">` +
      `<div id="mw-stamina-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#aa8800,#ffcc22);border-radius:2px;transition:width 0.1s"></div></div></div>`;

    // Capture point indicators (top, below scores)
    const cpHud = `<div id="mw-cp-hud" style="position:absolute;top:36px;left:50%;transform:translateX(-50%);display:flex;gap:10px;font-size:12px"></div>`;

    // Capturing message
    const capMsg = `<div id="mw-cap-msg" style="position:absolute;top:60%;left:50%;transform:translateX(-50%);font-size:16px;color:#daa520;text-shadow:0 0 8px rgba(218,165,32,0.5);opacity:0;transition:opacity 0.3s;pointer-events:none"></div>`;

    // Floating texts container
    const floatDiv = `<div id="mw-float-texts" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden"></div>`;

    // Vehicle weapon info panel (left side, above HP) — shows both weapons + switch hint
    const vehWeaponPanel = `<div id="mw-veh-weapon" style="position:absolute;bottom:100px;left:20px;display:none;pointer-events:none">` +
      `<div style="background:rgba(0,0,0,0.55);border:1px solid #665520;border-radius:5px;padding:8px 12px;min-width:200px">` +
        `<div style="font-size:10px;color:#888;margin-bottom:6px;text-align:center;letter-spacing:1px">[F] SWITCH WEAPON</div>` +
        // Primary weapon row
        `<div id="mw-veh-w0" style="padding:4px 6px;border-radius:3px;margin-bottom:4px">` +
          `<div style="display:flex;align-items:center;justify-content:space-between">` +
            `<span id="mw-veh-w0-name" style="font-size:12px;font-weight:bold"></span>` +
            `<span style="font-size:9px;color:#888">PRIMARY</span>` +
          `</div>` +
          `<div style="display:flex;align-items:center;gap:6px;margin-top:2px">` +
            `<span style="font-size:9px;color:#999">DMG</span><span id="mw-veh-w0-dmg" style="font-size:11px;color:#e0d5c0"></span>` +
            `<span style="font-size:9px;color:#999;margin-left:4px">RATE</span><span id="mw-veh-w0-rate" style="font-size:11px;color:#e0d5c0"></span>` +
            `<span style="font-size:9px;color:#999;margin-left:4px">RNG</span><span id="mw-veh-w0-range" style="font-size:11px;color:#e0d5c0"></span>` +
          `</div>` +
          `<div style="display:flex;align-items:center;gap:4px;margin-top:2px">` +
            `<div style="flex:1;height:4px;background:rgba(255,255,255,0.1);border-radius:2px">` +
              `<div id="mw-veh-w0-cd" style="height:100%;width:100%;border-radius:2px;transition:width 0.05s"></div>` +
            `</div>` +
            `<span id="mw-veh-w0-cd-text" style="font-size:10px;min-width:26px;text-align:right"></span>` +
          `</div>` +
        `</div>` +
        // Secondary weapon row
        `<div id="mw-veh-w1" style="padding:4px 6px;border-radius:3px">` +
          `<div style="display:flex;align-items:center;justify-content:space-between">` +
            `<span id="mw-veh-w1-name" style="font-size:12px;font-weight:bold"></span>` +
            `<span style="font-size:9px;color:#888">SECONDARY</span>` +
          `</div>` +
          `<div style="display:flex;align-items:center;gap:6px;margin-top:2px">` +
            `<span style="font-size:9px;color:#999">DMG</span><span id="mw-veh-w1-dmg" style="font-size:11px;color:#e0d5c0"></span>` +
            `<span style="font-size:9px;color:#999;margin-left:4px">RATE</span><span id="mw-veh-w1-rate" style="font-size:11px;color:#e0d5c0"></span>` +
            `<span style="font-size:9px;color:#999;margin-left:4px">RNG</span><span id="mw-veh-w1-range" style="font-size:11px;color:#e0d5c0"></span>` +
          `</div>` +
          `<div style="display:flex;align-items:center;gap:4px;margin-top:2px">` +
            `<div style="flex:1;height:4px;background:rgba(255,255,255,0.1);border-radius:2px">` +
              `<div id="mw-veh-w1-cd" style="height:100%;width:100%;border-radius:2px;transition:width 0.05s"></div>` +
            `</div>` +
            `<span id="mw-veh-w1-cd-text" style="font-size:10px;min-width:26px;text-align:right"></span>` +
          `</div>` +
        `</div>` +
      `</div>` +
    `</div>`;

    // Vehicle proximity prompt
    const vehPrompt = `<div id="mw-veh-prompt" style="position:absolute;bottom:140px;left:50%;transform:translateX(-50%);padding:8px 16px;background:rgba(0,0,0,0.6);border:1px solid #555;border-radius:4px;font-size:14px;color:#e0d5c0;display:none;pointer-events:none"></div>`;

    // Eliminated notification
    const eliminated = `<div id="mw-eliminated" style="position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);font-size:28px;font-weight:bold;color:#ff4444;text-shadow:0 0 15px rgba(255,0,0,0.5);opacity:0;pointer-events:none;letter-spacing:3px;transition:opacity 0.2s">ELIMINATED</div>`;

    // Center notification (streaks, multikills)
    const centerNotif = `<div id="mw-center-notif" style="position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);font-weight:bold;text-shadow:0 0 15px rgba(255,200,0,0.5);opacity:0;pointer-events:none;letter-spacing:2px;transition:opacity 0.3s"></div>`;

    this._hudDiv.innerHTML = ch + vch + hm + vig + lowHpVig + hitDir + hp + mana + staminaBar + ammo + wandSlots + kf + scores + cpHud + capMsg + mm + ab + respawn + headshot + vhp + vehWeaponPanel + floatDiv + vehPrompt + eliminated + centerNotif;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._hudDiv);

    this._minimapCanvas = document.getElementById("mw-minimap") as HTMLCanvasElement;
    this._minimapCtx = this._minimapCanvas?.getContext("2d") || null;
  }

  private _removeHUD(): void {
    if (this._hudDiv?.parentNode) {
      this._hudDiv.parentNode.removeChild(this._hudDiv);
      this._hudDiv = null;
    }
    this._minimapCanvas = null;
    this._minimapCtx = null;
  }

  private _updateHUD(): void {
    const p = this._getHumanPlayer();
    if (!p || !this._hudDiv) return;

    // HP
    const hpBar = document.getElementById("mw-hp-bar") as HTMLElement;
    const hpText = document.getElementById("mw-hp-text") as HTMLElement;
    if (hpBar) hpBar.style.width = `${(p.hp / p.maxHp) * 100}%`;
    if (hpText) hpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;

    // Mana
    const manaBar = document.getElementById("mw-mana-bar") as HTMLElement;
    const manaText = document.getElementById("mw-mana-text") as HTMLElement;
    if (manaBar) manaBar.style.width = `${(p.mana / p.maxMana) * 100}%`;
    if (manaText) manaText.textContent = `${Math.ceil(p.mana)} / ${p.maxMana}`;

    // Ammo
    const wand = this._getPlayerActiveWand(p);
    const wandName = document.getElementById("mw-wand-name") as HTMLElement;
    const ammoText = document.getElementById("mw-ammo-text") as HTMLElement;
    if (wandName) wandName.textContent = `${wand.icon} ${wand.name}`;
    if (ammoText) ammoText.textContent = `${p.ammo[p.activeWandSlot]}`;

    // Reload progress bar + timer
    const reloadContainer = document.getElementById("mw-reload-container") as HTMLElement;
    const reloadTimerEl = document.getElementById("mw-reload-timer") as HTMLElement;
    const reloadBar = document.getElementById("mw-reload-bar") as HTMLElement;
    const isReloading = p.reloading[p.activeWandSlot];
    if (reloadContainer) reloadContainer.style.opacity = isReloading ? "1" : "0";
    if (isReloading) {
      const wandForSlot = getWandDef(this._getPlayerWandId(p, p.activeWandSlot));
      const totalReload = wandForSlot.reloadTime;
      const remaining = p.reloadTimer[p.activeWandSlot];
      const progress = clamp(1 - remaining / totalReload, 0, 1);
      if (reloadTimerEl) reloadTimerEl.textContent = `${remaining.toFixed(1)}s`;
      if (reloadBar) reloadBar.style.width = `${progress * 100}%`;
    }

    // Fire rate cooldown bar (visible for slow weapons, fireRate < 3)
    const fireRateContainer = document.getElementById("mw-firerate-bar-container") as HTMLElement;
    const fireRateBar = document.getElementById("mw-firerate-bar") as HTMLElement;
    if (fireRateContainer && fireRateBar) {
      const interval = 1 / wand.fireRate;
      if (this._fireTimer > 0 && interval > 0.35) {
        fireRateContainer.style.opacity = "1";
        const progress = clamp(1 - this._fireTimer / interval, 0, 1);
        fireRateBar.style.width = `${progress * 100}%`;
      } else {
        fireRateContainer.style.opacity = "0";
      }
    }

    // Wand slot indicators with cooldown overlays
    for (let si = 0; si < 3; si++) {
      const slotEl = document.getElementById(`mw-slot-${si}`) as HTMLElement;
      const iconEl = document.getElementById(`mw-slot-icon-${si}`) as HTMLElement;
      const cdOverlay = document.getElementById(`mw-slot-cd-${si}`) as HTMLElement;
      const cdText = document.getElementById(`mw-slot-cd-text-${si}`) as HTMLElement;
      if (slotEl) {
        slotEl.style.borderColor = si === p.activeWandSlot ? "#daa520" : "#555";
        slotEl.style.background = si === p.activeWandSlot ? "rgba(80,50,10,0.6)" : "rgba(0,0,0,0.6)";
      }
      if (iconEl) {
        const w = getWandDef(this._getPlayerWandId(p, si));
        iconEl.textContent = w.icon;
      }
      // Show reload cooldown sweep on slot
      if (cdOverlay && cdText) {
        if (p.reloading[si]) {
          const slotWand = getWandDef(this._getPlayerWandId(p, si));
          const totalReload = slotWand.reloadTime;
          const remaining = p.reloadTimer[si];
          const progress = clamp(remaining / totalReload, 0, 1);
          cdOverlay.style.height = `${progress * 100}%`;
          cdOverlay.style.background = "rgba(255,136,0,0.35)";
          cdText.style.opacity = "1";
          cdText.textContent = remaining.toFixed(1);
        } else if (p.ammo[si] <= 0) {
          // Empty mag indicator
          cdOverlay.style.height = "100%";
          cdOverlay.style.background = "rgba(255,50,50,0.25)";
          cdText.style.opacity = "1";
          cdText.textContent = "0";
        } else {
          cdOverlay.style.height = "0%";
          cdText.style.opacity = "0";
        }
      }
    }

    // Scores
    const s0 = document.getElementById("mw-score-0") as HTMLElement;
    const s1 = document.getElementById("mw-score-1") as HTMLElement;
    if (this._isRoyaleMode && this._royaleState) {
      const rs = this._royaleState;
      if (s0) s0.textContent = `Alive: ${rs.playersAlive}/${MW.ROYALE_PLAYERS}`;
      if (s1) {
        if (rs.stormDelay > 0) {
          s1.textContent = `Storm in: ${Math.ceil(rs.stormDelay)}s`;
        } else {
          s1.textContent = `Storm: ${Math.ceil(rs.stormRadius)}m`;
        }
      }
    } else {
      if (s0) s0.textContent = `${this._teamScores[0]}`;
      if (s1) s1.textContent = `${this._teamScores[1]}`;
    }

    // Timer
    const timer = document.getElementById("mw-timer") as HTMLElement;
    if (timer) {
      const mins = Math.floor(this._matchTimer / 60);
      const secs = Math.floor(this._matchTimer % 60);
      timer.textContent = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }

    // Kill feed
    const kfDiv = document.getElementById("mw-killfeed") as HTMLElement;
    if (kfDiv) {
      const recent = this._killFeed.slice(-5);
      kfDiv.innerHTML = recent.map(e => {
        const kColor = this._players.find(pp => pp.id === e.killer)?.team === 0 ? "#88bbff" : "#ff8888";
        const vColor = this._players.find(pp => pp.id === e.victim)?.team === 0 ? "#88bbff" : "#ff8888";
        if (e.isAssist) {
          return `<div style="margin-bottom:3px;opacity:${Math.max(0.3, 1 - (Date.now() / 1000 - e.time) / 8)};font-size:11px">` +
            `<span style="color:${kColor}">${e.killer === "player_0" ? "You" : e.killer.replace("ai_", "")}</span>` +
            ` <span style="color:#888">assisted</span></div>`;
        }
        return `<div style="margin-bottom:3px;opacity:${Math.max(0.3, 1 - (Date.now() / 1000 - e.time) / 8)}">` +
          `<span style="color:${kColor}">${e.killer === "player_0" ? "You" : e.killer.replace("ai_", "")}</span>` +
          ` <span style="color:#888">[${e.weapon}]</span> ` +
          `<span style="color:${vColor}">${e.victim === "player_0" ? "You" : e.victim.replace("ai_", "")}</span></div>`;
      }).join("");
    }

    // Hit marker
    const hmEl = document.getElementById("mw-hitmarker") as HTMLElement;
    if (hmEl) hmEl.style.opacity = this._hitMarkerTimer > 0 ? "1" : "0";

    // Damage vignette
    const vigEl = document.getElementById("mw-vignette") as HTMLElement;
    if (vigEl) vigEl.style.opacity = `${clamp(this._damageVignetteTimer * 3, 0, 1.0)}`;

    // Low HP warning
    const lowHpEl = document.getElementById("mw-lowhp-vignette") as HTMLElement;
    if (lowHpEl) {
      if (p.alive && p.hp < p.maxHp * 0.3) {
        const pulse = 0.3 + Math.sin(this._gameTime * 4) * 0.15;
        lowHpEl.style.opacity = `${pulse}`;
      } else {
        lowHpEl.style.opacity = "0";
      }
    }

    // Hit direction indicator
    const hitDirEl = document.getElementById("mw-hitdir") as HTMLElement;
    const hitDirArrow = document.getElementById("mw-hitdir-arrow") as HTMLElement;
    if (hitDirEl && hitDirArrow) {
      if (this._lastDamageDir.timer > 0) {
        hitDirEl.style.opacity = `${clamp(this._lastDamageDir.timer * 2, 0, 1)}`;
        const angle = Math.atan2(this._lastDamageDir.x, this._lastDamageDir.z) - p.yaw;
        hitDirEl.style.transform = `translate(-50%,-50%) rotate(${-angle}rad)`;
      } else {
        hitDirEl.style.opacity = "0";
      }
    }

    // Headshot notification
    const hsEl = document.getElementById("mw-headshot") as HTMLElement;
    if (hsEl) hsEl.style.opacity = this._headshotTimer > 0 ? "1" : "0";

    // Ability
    const abName = document.getElementById("mw-ability-name") as HTMLElement;
    const abCd = document.getElementById("mw-ability-cd") as HTMLElement;
    const cls = getClassDef(p.classId);
    if (abName) abName.textContent = `[Q] ${cls.ability}`;
    if (abCd) {
      if (p.abilityCooldown > 0) abCd.textContent = `CD: ${p.abilityCooldown.toFixed(1)}s`;
      else abCd.textContent = "READY";
    }

    // Respawn overlay
    const respawnEl = document.getElementById("mw-respawn") as HTMLElement;
    const respawnTimerEl = document.getElementById("mw-respawn-timer") as HTMLElement;
    if (respawnEl && respawnTimerEl) {
      if (!p.alive) {
        respawnEl.style.display = "flex";
        if (this._isRoyaleMode) {
          const rs = this._royaleState;
          respawnTimerEl.textContent = `Eliminated! Placement: #${rs?.placement || "?"}`;
        } else {
          respawnTimerEl.textContent = `Respawning in ${p.respawnTimer.toFixed(1)}s`;
        }
      } else {
        respawnEl.style.display = "none";
      }
    }

    // Vehicle HUD
    const vehCH = document.getElementById("mw-vehicle-crosshair") as HTMLElement;
    const normalCH = document.getElementById("mw-crosshair") as HTMLElement;
    const vehHpEl = document.getElementById("mw-vehicle-hp") as HTMLElement;
    const vehHpBar = document.getElementById("mw-vehicle-hp-bar") as HTMLElement;
    if (p.vehicleId) {
      const veh = this._vehicles.find(v => v.id === p.vehicleId);
      if (veh && vehCH && normalCH && vehHpEl && vehHpBar) {
        vehCH.style.display = "block";
        normalCH.style.display = "none";
        vehHpEl.style.display = "block";
        vehHpBar.style.width = `${(veh.hp / veh.maxHp) * 100}%`;
      }
    } else {
      if (vehCH) vehCH.style.display = "none";
      if (normalCH) normalCH.style.display = "block";
      if (vehHpEl) vehHpEl.style.display = "none";
    }

    // Vehicle weapon info panel — both primary & secondary
    const vehWeaponEl = document.getElementById("mw-veh-weapon") as HTMLElement;
    if (vehWeaponEl) {
      if (p.vehicleId) {
        const veh = this._vehicles.find(v => v.id === p.vehicleId);
        if (veh) {
          const vDef = getVehicleDef(veh.defId);
          vehWeaponEl.style.display = "block";

          // Highlight active weapon row
          const w0Row = document.getElementById("mw-veh-w0") as HTMLElement;
          const w1Row = document.getElementById("mw-veh-w1") as HTMLElement;
          if (w0Row) {
            w0Row.style.background = veh.activeWeapon === 0 ? "rgba(218,165,32,0.15)" : "transparent";
            w0Row.style.border = veh.activeWeapon === 0 ? "1px solid rgba(218,165,32,0.4)" : "1px solid transparent";
          }
          if (w1Row) {
            w1Row.style.background = veh.activeWeapon === 1 ? "rgba(100,180,255,0.15)" : "transparent";
            w1Row.style.border = veh.activeWeapon === 1 ? "1px solid rgba(100,180,255,0.4)" : "1px solid transparent";
          }

          // Primary weapon stats
          const w0Name = document.getElementById("mw-veh-w0-name") as HTMLElement;
          const w0Dmg = document.getElementById("mw-veh-w0-dmg") as HTMLElement;
          const w0Rate = document.getElementById("mw-veh-w0-rate") as HTMLElement;
          const w0Range = document.getElementById("mw-veh-w0-range") as HTMLElement;
          const w0Cd = document.getElementById("mw-veh-w0-cd") as HTMLElement;
          const w0CdText = document.getElementById("mw-veh-w0-cd-text") as HTMLElement;
          if (w0Name) { w0Name.textContent = `${vDef.icon} Main Cannon`; w0Name.style.color = veh.activeWeapon === 0 ? "#daa520" : "#888"; }
          if (w0Dmg) w0Dmg.textContent = `${vDef.weaponDamage}`;
          if (w0Rate) w0Rate.textContent = `${vDef.weaponFireRate.toFixed(1)}/s`;
          if (w0Range) w0Range.textContent = `${vDef.weaponRange}`;
          if (w0Cd) {
            const interval = 1 / vDef.weaponFireRate;
            const prog = veh.fireTimer > 0 ? clamp(1 - veh.fireTimer / interval, 0, 1) : 1;
            w0Cd.style.width = `${prog * 100}%`;
            w0Cd.style.background = "linear-gradient(90deg,#cc8822,#ffaa44)";
          }
          if (w0CdText) { w0CdText.textContent = veh.fireTimer > 0 ? `${veh.fireTimer.toFixed(1)}s` : "RDY"; w0CdText.style.color = "#ffaa44"; }

          // Secondary weapon stats
          const w1Name = document.getElementById("mw-veh-w1-name") as HTMLElement;
          const w1Dmg = document.getElementById("mw-veh-w1-dmg") as HTMLElement;
          const w1Rate = document.getElementById("mw-veh-w1-rate") as HTMLElement;
          const w1Range = document.getElementById("mw-veh-w1-range") as HTMLElement;
          const w1Cd = document.getElementById("mw-veh-w1-cd") as HTMLElement;
          const w1CdText = document.getElementById("mw-veh-w1-cd-text") as HTMLElement;
          if (w1Name) { w1Name.textContent = `${vDef.secondaryName}`; w1Name.style.color = veh.activeWeapon === 1 ? "#66aaff" : "#888"; }
          if (w1Dmg) w1Dmg.textContent = `${vDef.secondaryDamage}`;
          if (w1Rate) w1Rate.textContent = `${vDef.secondaryFireRate.toFixed(1)}/s`;
          if (w1Range) w1Range.textContent = `${vDef.secondaryRange}`;
          if (w1Cd) {
            const interval2 = 1 / vDef.secondaryFireRate;
            const prog2 = veh.secondaryFireTimer > 0 ? clamp(1 - veh.secondaryFireTimer / interval2, 0, 1) : 1;
            w1Cd.style.width = `${prog2 * 100}%`;
            w1Cd.style.background = "linear-gradient(90deg,#2266cc,#66aaff)";
          }
          if (w1CdText) { w1CdText.textContent = veh.secondaryFireTimer > 0 ? `${veh.secondaryFireTimer.toFixed(1)}s` : "RDY"; w1CdText.style.color = "#66aaff"; }
        }
      } else {
        vehWeaponEl.style.display = "none";
      }
    }

    // Stamina bar
    const staminaBar = document.getElementById("mw-stamina-bar") as HTMLElement;
    if (staminaBar) staminaBar.style.width = `${(p.stamina / p.maxStamina) * 100}%`;

    // Capture point HUD
    const cpHud = document.getElementById("mw-cp-hud") as HTMLElement;
    if (cpHud) {
      cpHud.innerHTML = this._capturePoints.map(cp => {
        const color = cp.owner === 0 ? "#4488ff" : cp.owner === 1 ? "#ff4444" : "#888";
        const border = cp.owner === -1 ? "#555" : color;
        return `<div style="width:28px;height:28px;border:2px solid ${border};background:${cp.owner === -1 ? 'rgba(60,60,60,0.6)' : color + '44'};` +
          `border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:${color}">${cp.id}</div>`;
      }).join("");
    }

    // Capturing message
    const capMsg = document.getElementById("mw-cap-msg") as HTMLElement;
    if (capMsg) {
      let capText = "";
      for (const cp of this._capturePoints) {
        const d = dist2(p.x, p.z, cp.x, cp.z);
        if (d < MW.CAPTURE_RADIUS) {
          capText = `Capturing Point ${cp.id}`;
          break;
        }
      }
      capMsg.textContent = capText;
      capMsg.style.opacity = capText ? "1" : "0";
    }

    // Vehicle proximity prompt
    const vehPrompt = document.getElementById("mw-veh-prompt") as HTMLElement;
    if (vehPrompt) {
      if (p.vehicleId) {
        vehPrompt.style.display = "block";
        vehPrompt.textContent = "[E] Exit Vehicle";
      } else {
        let nearVeh: MWVehicle | null = null;
        for (const v of this._vehicles) {
          if (!v.alive) continue;
          if (v.team !== -1 && v.team !== p.team) continue;
          const vDef = getVehicleDef(v.defId);
          const isFlying = vDef.type === "air_fly" || vDef.type === "air_hover";
          const d = isFlying ? dist2(p.x, p.z, v.x, v.z) : dist3(p.x, p.y, p.z, v.x, v.y, v.z);
          const maxRange = isFlying ? MW.AI_VEHICLE_ENTER_DIST * 3 : MW.AI_VEHICLE_ENTER_DIST;
          if (d < maxRange) {
            nearVeh = v;
            break;
          }
        }
        if (nearVeh) {
          const vDef = getVehicleDef(nearVeh.defId);
          vehPrompt.style.display = "block";
          vehPrompt.textContent = `[E] Enter ${vDef.name}`;
        } else {
          vehPrompt.style.display = "none";
        }
      }
    }

    // Floating texts
    const floatDiv = document.getElementById("mw-float-texts") as HTMLElement;
    if (floatDiv) {
      floatDiv.innerHTML = this._floatingTexts.map(ft => {
        const opacity = Math.min(1, ft.life * 2);
        return `<div style="position:absolute;left:${ft.x}px;top:${ft.y}px;color:${ft.color};font-size:${ft.size}px;font-weight:bold;opacity:${opacity};pointer-events:none;text-shadow:0 0 4px rgba(0,0,0,0.8);white-space:nowrap">${ft.text}</div>`;
      }).join("");
    }

    // Eliminated notification
    const elimEl = document.getElementById("mw-eliminated") as HTMLElement;
    if (elimEl) elimEl.style.opacity = this._eliminatedTimer > 0 ? "1" : "0";

    // Reload flash
    if (ammoText && this._reloadFlashTimer > 0) {
      ammoText.style.color = "#44ff44";
    } else if (ammoText) {
      ammoText.style.color = "#fff";
    }

    // Ability ready pulse
    if (abCd) {
      if (this._abilityReadyTimer > 0) {
        abCd.style.color = "#44ff44";
        abCd.style.textShadow = "0 0 8px rgba(68,255,68,0.6)";
      } else {
        abCd.style.textShadow = "none";
      }
    }

    // Center notification (streaks/multikills)
    const centerNotif = document.getElementById("mw-center-notif") as HTMLElement;
    if (centerNotif) {
      if (this._centerNotification && this._centerNotification.timer > 0) {
        const cn = this._centerNotification;
        const scale = 1 + (1 - Math.min(1, cn.timer / 1.5)) * 0.3;
        centerNotif.textContent = cn.text;
        centerNotif.style.color = cn.color;
        centerNotif.style.fontSize = `${cn.size}px`;
        centerNotif.style.opacity = `${Math.min(1, cn.timer * 2)}`;
        centerNotif.style.transform = `translate(-50%,-50%) scale(${scale})`;
      } else {
        centerNotif.style.opacity = "0";
      }
    }

    // Minimap
    this._drawMinimap();
  }

  private _drawMinimap(): void {
    const ctx = this._minimapCtx;
    if (!ctx || !this._minimapCanvas) return;
    const mapDef = getMapDef(this._mapId);
    const cw = this._minimapCanvas.width;
    const ch = this._minimapCanvas.height;
    const scale = cw / (mapDef.size * 2);

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, cw, ch);

    // Players
    for (const p of this._players) {
      if (!p.alive) continue;
      if (p.invisible && p.team !== this._getHumanPlayer()?.team) continue;
      const mx = (p.x + mapDef.size) * scale;
      const mz = (p.z + mapDef.size) * scale;
      ctx.fillStyle = p.team === 0 ? "#4488ff" : "#ff4444";
      if (p.id === "player_0") ctx.fillStyle = "#ffff00";
      ctx.beginPath();
      ctx.arc(mx, mz, p.id === "player_0" ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Capture points (diamonds)
    for (const cp of this._capturePoints) {
      const mx = (cp.x + mapDef.size) * scale;
      const mz = (cp.z + mapDef.size) * scale;
      ctx.fillStyle = cp.owner === 0 ? "#4488ff" : cp.owner === 1 ? "#ff4444" : "#cccc44";
      ctx.save();
      ctx.translate(mx, mz);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    }

    // Vehicles
    for (const v of this._vehicles) {
      if (!v.alive) continue;
      const mx = (v.x + mapDef.size) * scale;
      const mz = (v.z + mapDef.size) * scale;
      ctx.fillStyle = v.team === 0 ? "#2244aa" : v.team === 1 ? "#aa2222" : "#888888";
      ctx.fillRect(mx - 3, mz - 3, 6, 6);
    }

    // Royale storm circle
    if (this._isRoyaleMode && this._royaleState) {
      const rs = this._royaleState;
      const cx = (rs.stormCenterX + mapDef.size) * scale;
      const cz = (rs.stormCenterZ + mapDef.size) * scale;
      const r = rs.stormRadius * scale;
      ctx.strokeStyle = "#cc44ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cz, r, 0, Math.PI * 2);
      ctx.stroke();
      // Fill outside storm with translucent purple
      ctx.fillStyle = "rgba(100,20,160,0.25)";
      ctx.fillRect(0, 0, cw, ch);
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(cx, cz, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw scrolls as tiny gold dots
      for (const scroll of rs.scrolls) {
        if (scroll.picked) continue;
        const sx = (scroll.x + mapDef.size) * scale;
        const sz = (scroll.z + mapDef.size) * scale;
        ctx.fillStyle = "#ddcc44";
        ctx.fillRect(sx - 1, sz - 1, 2, 2);
      }
      // Draw artifacts as tiny colored diamonds
      for (const art of rs.artifacts) {
        if (art.picked) continue;
        const ax = (art.x + mapDef.size) * scale;
        const az = (art.z + mapDef.size) * scale;
        ctx.fillStyle = "#ff8800";
        ctx.save();
        ctx.translate(ax, az);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-2, -2, 4, 4);
        ctx.restore();
      }
    }
  }


  // =====================================================================
  // MATCH START
  // =====================================================================

  private _startMatch(): void {
    this._isRoyaleMode = false;
    this._isDuelMode = false;
    this._isDragonMode = false;
    this._royaleState = null;
    this._duelState = null;
    const mapDef = getMapDef(this._mapId);
    const teamSize = this._customTeamSize;

    // Reset state
    this._players = [];
    this._vehicles = [];
    this._projectiles = [];
    this._killFeed = [];
    this._capturePoints = [];
    this._floatingTexts = [];
    this._envSpellEntities = [];
    this._dragonRiders = [];
    this._teamScores = [0, 0];
    this._matchTimer = this._customTimeLimit;
    this._hitMarkerTimer = 0;
    this._damageVignetteTimer = 0;
    this._fireTimer = 0;
    this._headshotTimer = 0;
    this._gameTime = 0;
    this._eliminatedTimer = 0;
    this._reloadFlashTimer = 0;
    this._abilityReadyTimer = 0;
    this._lastAbilityCooldown = 0;
    this._centerNotification = null;
    this._lastDamageDir = { x: 0, z: 0, timer: 0 };
    _projIdCounter = 0;
    _vehIdCounter = 0;

    // Build scene
    this._buildScene(mapDef);

    const spawnDist = mapDef.spawnDistance / 2;

    // Create capture points (3: left-of-center, center, right-of-center)
    if (this._optCapturePoints) {
    const cpPositions = [
      { id: "A", x: -mapDef.size * 0.2, z: 0 },
      { id: "B", x: 0, z: 0 },
      { id: "C", x: mapDef.size * 0.2, z: 0 },
    ];
    for (const cpPos of cpPositions) {
      const cpH = getTerrainHeight(cpPos.x, cpPos.z, mapDef);
      // Ring mesh
      const ringGeo = new THREE.TorusGeometry(MW.CAPTURE_RADIUS, 0.15, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.set(cpPos.x, cpH + 0.1, cpPos.z);
      this._scene.add(ringMesh);

      // Beam of light
      const beamGeo = new THREE.CylinderGeometry(0.5, 0.5, 15, 8, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      beamMesh.position.set(cpPos.x, cpH + 7.5, cpPos.z);
      this._scene.add(beamMesh);

      // Flag group with decorative pillar
      const flagGroup = new THREE.Group();

      // Stone pedestal
      const pedestalGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.3, 8);
      const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.9 });
      const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
      pedestal.position.y = 0.15;
      pedestal.castShadow = true;
      flagGroup.add(pedestal);

      // Main pole (ornate)
      const poleGeo = new THREE.CylinderGeometry(0.05, 0.06, 3.5, 6);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.5, metalness: 0.4 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 2.05;
      flagGroup.add(pole);

      // Pole rings
      const pRingGeo = new THREE.TorusGeometry(0.07, 0.015, 4, 8);
      const pRingMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.3, metalness: 0.6 });
      for (const ry of [0.6, 1.6, 2.6]) {
        const pRing = new THREE.Mesh(pRingGeo, pRingMat);
        pRing.position.y = ry;
        pRing.rotation.x = Math.PI / 2;
        flagGroup.add(pRing);
      }

      // Flag
      const fGeo = new THREE.BoxGeometry(0.8, 0.5, 0.03);
      const fMat = new THREE.MeshBasicMaterial({ color: 0x888888, side: THREE.DoubleSide });
      const fMesh = new THREE.Mesh(fGeo, fMat);
      fMesh.position.set(0.45, 3.5, 0);
      flagGroup.add(fMesh);

      // Pole top ornament (diamond)
      const topGeo = new THREE.OctahedronGeometry(0.08);
      const topMat = new THREE.MeshBasicMaterial({ color: 0xdddd44 });
      const topOrn = new THREE.Mesh(topGeo, topMat);
      topOrn.position.y = 3.85;
      flagGroup.add(topOrn);

      // Ground rune circle around capture point
      const cpRuneGeo = new THREE.RingGeometry(MW.CAPTURE_RADIUS * 0.4, MW.CAPTURE_RADIUS * 0.45, 16);
      const cpRuneMat = new THREE.MeshBasicMaterial({ color: 0xddddaa, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
      const cpRune = new THREE.Mesh(cpRuneGeo, cpRuneMat);
      cpRune.rotation.x = -Math.PI / 2;
      cpRune.position.y = 0.05;
      flagGroup.add(cpRune);

      flagGroup.position.set(cpPos.x, cpH, cpPos.z);
      this._scene.add(flagGroup);

      this._capturePoints.push({
        id: cpPos.id,
        x: cpPos.x, z: cpPos.z,
        owner: -1,
        captureProgress: 50,
        tickTimer: 0,
        ringMesh, beamMesh, flagMesh: flagGroup,
      });
    }
    } // end if _optCapturePoints

    // Create human player (team 0, index 0)
    const human = createPlayer(
      "player_0", 0, this._selectedClassId, false,
      -spawnDist, (Math.random() - 0.5) * 10, mapDef,
    );
    human.primaryWandId = this._selectedPrimary;
    human.secondaryWandId = this._selectedSecondary;
    human.heavyWandId = this._selectedHeavy;
    human.ammo = [
      getWandDef(this._selectedPrimary).magPerReload,
      getWandDef(this._selectedSecondary).magPerReload,
      getWandDef(this._selectedHeavy).magPerReload,
    ];
    this._players.push(human);

    // AI teammates (team 0)
    for (let i = 0; i < teamSize - 1; i++) {
      const cls = MAGE_CLASSES[Math.floor(Math.random() * MAGE_CLASSES.length)];
      const ai = createPlayer(
        `ai_${AI_NAMES[i % AI_NAMES.length]}`, 0, cls.id, true,
        -spawnDist + (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 20, mapDef,
      );
      this._players.push(ai);
    }

    // AI enemies (team 1)
    for (let i = 0; i < teamSize; i++) {
      const cls = MAGE_CLASSES[Math.floor(Math.random() * MAGE_CLASSES.length)];
      const ai = createPlayer(
        `ai_${AI_NAMES[(teamSize - 1 + i) % AI_NAMES.length]}`, 1, cls.id, true,
        spawnDist + (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 20, mapDef,
      );
      this._players.push(ai);
    }

    // Create meshes for all players
    for (const p of this._players) {
      p.mesh = this._buildMageMesh(p);
      p.mesh.position.set(p.x, p.y, p.z);
      this._scene.add(p.mesh);

      if (p.id !== "player_0") {
        p.nameTag = this._buildNameTag(p.id.replace("ai_", ""), p.team);
        p.nameTag.position.set(p.x, p.y + MW.PLAYER_HEIGHT + 0.5, p.z);
        this._scene.add(p.nameTag);
      }

      // Player light (dim, team-colored)
      const teamCol = p.team === 0 ? 0x4488ff : 0xff4444;
      const pl = new THREE.PointLight(teamCol, 0.3, 5);
      pl.position.set(p.x, p.y + 1, p.z);
      this._scene.add(pl);
      this._playerLights.set(p.id, pl);
    }

    // Spawn vehicles
    if (this._optVehiclesEnabled) {
      const rng = seededRandom(Date.now() % 10000);
      for (const vDef of VEHICLE_DEFS) {
        for (let i = 0; i < vDef.spawnWeight; i++) {
          const vx = (rng() - 0.5) * spawnDist * 1.2;
          const vz = (rng() - 0.5) * mapDef.size * 0.8;
          const veh = createVehicle(vDef.id, -1, vx, vz, mapDef);
          veh.mesh = this._buildVehicleMesh(veh);
          veh.mesh.position.set(veh.x, veh.y, veh.z);
          this._scene.add(veh.mesh);
          this._vehicles.push(veh);
        }
      }

      // Spawn map-specific vehicles
      if (mapDef.mapVehicles) {
        for (const mv of mapDef.mapVehicles) {
          const mvDef = MAP_VEHICLE_DEFS.find(d => d.id === mv.defId);
          if (!mvDef) continue;
          for (let i = 0; i < mv.count; i++) {
            const vx = (rng() - 0.5) * mapDef.size * 0.7;
            const vz = (rng() - 0.5) * mapDef.size * 0.7;
            const veh = createVehicle(mv.defId, -1, vx, vz, mapDef);
            veh.mesh = this._buildVehicleMesh(veh);
            veh.mesh.position.set(veh.x, veh.y, veh.z);
            this._scene.add(veh.mesh);
            this._vehicles.push(veh);
          }
        }
      }
    }

    // HUD
    this._createHUD();

    // Start game loop with warmup
    this._phase = MWPhase.WARMUP;
    this._warmupTimer = MW.WARMUP_TIME;
    this._lastTime = performance.now();
    this._simAccum = 0;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._gameLoop(performance.now());

    // Show warmup countdown
    this._showWarmupCountdown();
  }

  private _showWarmupCountdown(): void {
    this._warmupCountdownDiv = document.createElement("div");
    this._warmupCountdownDiv.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:25;` +
      `display:flex;align-items:center;justify-content:center;pointer-events:none;`;
    this._warmupCountdownDiv.innerHTML = `<div id="mw-warmup-text" style="font-size:120px;font-weight:bold;color:#daa520;text-shadow:0 0 40px rgba(218,165,32,0.6),0 0 80px rgba(218,165,32,0.3);font-family:'Segoe UI',sans-serif;transition:transform 0.2s,opacity 0.2s">3</div>`;
    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._warmupCountdownDiv);
  }

  // =====================================================================
  // UTILITY
  // =====================================================================

  private _getHumanPlayer(): MWPlayer | null {
    return this._players.find(p => p.id === "player_0") || null;
  }

  private _getPlayerActiveWand(p: MWPlayer): WandDef {
    if (p.activeWandSlot === 0) return getWandDef(p.primaryWandId);
    if (p.activeWandSlot === 1) return getWandDef(p.secondaryWandId);
    return getWandDef(p.heavyWandId);
  }

  private _getPlayerWandId(p: MWPlayer, slot: number): string {
    if (slot === 0) return p.primaryWandId;
    if (slot === 1) return p.secondaryWandId;
    return p.heavyWandId;
  }


  // =====================================================================
  // GAME LOOP
  // =====================================================================

  private _gameLoop = (now: number): void => {
    this._rafId = requestAnimationFrame(this._gameLoop);

    const dt = Math.min((now - this._lastTime) / 1000, 0.1);
    this._lastTime = now;

    if (this._phase === MWPhase.WARMUP) {
      this._warmupTimer -= dt;
      // Update countdown display
      const warmupText = document.getElementById("mw-warmup-text") as HTMLElement;
      if (warmupText) {
        const num = Math.ceil(this._warmupTimer);
        if (num > 0) {
          warmupText.textContent = `${num}`;
          const frac = this._warmupTimer - Math.floor(this._warmupTimer);
          const scale = 1 + frac * 0.3;
          warmupText.style.transform = `scale(${scale})`;
          warmupText.style.opacity = "1";
        } else {
          warmupText.textContent = "GO!";
          warmupText.style.color = "#44ff44";
          warmupText.style.transform = "scale(1.5)";
        }
      }
      if (this._warmupTimer <= -0.5) {
        this._phase = this._isRoyaleMode ? MWPhase.ROYALE_PLAYING :
          this._isDuelMode ? MWPhase.DUEL_PLAYING :
          this._isDragonMode ? MWPhase.DRAGON_COMBAT :
          MWPhase.PLAYING;
        if (this._warmupCountdownDiv?.parentNode) {
          this._warmupCountdownDiv.parentNode.removeChild(this._warmupCountdownDiv);
          this._warmupCountdownDiv = null;
        }
        this._canvas.requestPointerLock();
      }
      // Allow mouse look during warmup
      const hp = this._getHumanPlayer();
      if (hp && this._pointerLocked) {
        const sens = MW.MOUSE_SENSITIVITY;
        hp.yaw -= this._mouseDX * sens;
        hp.pitch -= this._mouseDY * sens;
        hp.pitch = clamp(hp.pitch, -Math.PI / 2 * 0.98, Math.PI / 2 * 0.98);
      }
      this._mouseDX = 0;
      this._mouseDY = 0;
    }

    if (this._phase === MWPhase.PLAYING || this._phase === MWPhase.ROYALE_PLAYING ||
        this._phase === MWPhase.DUEL_PLAYING || this._phase === MWPhase.DRAGON_COMBAT) {
      this._simAccum += dt;
      while (this._simAccum >= MW.SIM_RATE) {
        this._simTick(MW.SIM_RATE);
        if (this._phase === MWPhase.ROYALE_PLAYING) this._royaleSimTick(MW.SIM_RATE);
        this._simAccum -= MW.SIM_RATE;
      }
    }

    this._renderFrame(dt);
    this._updateHUD();
  };

  // =====================================================================
  // SIMULATION TICK
  // =====================================================================

  private _simTick(dt: number): void {
    const mapDef = getMapDef(this._mapId);

    // Decrement timers
    this._matchTimer -= dt;
    if (this._hitMarkerTimer > 0) this._hitMarkerTimer -= dt;
    if (this._damageVignetteTimer > 0) this._damageVignetteTimer -= dt;
    if (this._fireTimer > 0) this._fireTimer -= dt;
    if (this._headshotTimer > 0) this._headshotTimer -= dt;
    if (this._lastDamageDir.timer > 0) this._lastDamageDir.timer -= dt;
    this._gameTime += dt;

    // Decrement new timers
    if (this._eliminatedTimer > 0) this._eliminatedTimer -= dt;
    if (this._reloadFlashTimer > 0) this._reloadFlashTimer -= dt;
    if (this._abilityReadyTimer > 0) this._abilityReadyTimer -= dt;
    if (this._centerNotification && this._centerNotification.timer > 0) this._centerNotification.timer -= dt;

    // Update floating texts
    for (let i = this._floatingTexts.length - 1; i >= 0; i--) {
      const ft = this._floatingTexts[i];
      ft.x += ft.vx * dt;
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life <= 0) this._floatingTexts.splice(i, 1);
    }

    // Spawn protection
    for (const p of this._players) {
      if (p.spawnProtection > 0) {
        p.spawnProtection -= dt;
        if (p.spawnProtection <= 0) {
          // Remove protection mesh
          if (p.spawnProtectionMesh) {
            this._scene.remove(p.spawnProtectionMesh);
            p.spawnProtectionMesh.geometry.dispose();
            (p.spawnProtectionMesh.material as THREE.Material).dispose();
            p.spawnProtectionMesh = null;
          }
        }
      }
    }

    // Stamina for all players
    for (const p of this._players) {
      if (!p.alive) continue;
      if (p.sprinting && p.stamina > 0) {
        p.stamina = Math.max(0, p.stamina - MW.STAMINA_DRAIN * dt);
        p.staminaRegenDelay = MW.STAMINA_REGEN_DELAY;
        if (p.stamina <= 0) p.sprinting = false;
      } else {
        if (p.staminaRegenDelay > 0) {
          p.staminaRegenDelay -= dt;
        } else {
          p.stamina = Math.min(p.maxStamina, p.stamina + MW.STAMINA_REGEN * dt);
        }
      }
    }

    // Capture points
    if (this._optCapturePoints)
    for (const cp of this._capturePoints) {
      // Count players on point per team
      let team0Count = 0;
      let team1Count = 0;
      for (const p of this._players) {
        if (!p.alive || p.vehicleId) continue;
        const d = dist2(p.x, p.z, cp.x, cp.z);
        if (d < MW.CAPTURE_RADIUS) {
          if (p.team === 0) team0Count++;
          else team1Count++;
        }
      }

      if (team0Count > 0 && team1Count === 0) {
        // Team 0 capturing
        const rate = (50 / MW.CAPTURE_TIME) * (1 + (team0Count - 1) * 0.5);
        cp.captureProgress = Math.max(0, cp.captureProgress - rate * dt);
        if (cp.captureProgress <= 0) {
          cp.owner = 0;
          cp.captureProgress = 0;
        }
      } else if (team1Count > 0 && team0Count === 0) {
        // Team 1 capturing
        const rate = (50 / MW.CAPTURE_TIME) * (1 + (team1Count - 1) * 0.5);
        cp.captureProgress = Math.min(100, cp.captureProgress + rate * dt);
        if (cp.captureProgress >= 100) {
          cp.owner = 1;
          cp.captureProgress = 100;
        }
      }
      // If no one on it, slowly drift to neutral (if not owned)
      if (team0Count === 0 && team1Count === 0) {
        if (cp.owner === -1) {
          if (cp.captureProgress < 50) cp.captureProgress = Math.min(50, cp.captureProgress + 5 * dt);
          else if (cp.captureProgress > 50) cp.captureProgress = Math.max(50, cp.captureProgress - 5 * dt);
        }
      }

      // Score tick for owned points
      if (cp.owner === 0 || cp.owner === 1) {
        cp.tickTimer += dt;
        if (cp.tickTimer >= MW.CAPTURE_SCORE_INTERVAL) {
          cp.tickTimer -= MW.CAPTURE_SCORE_INTERVAL;
          this._teamScores[cp.owner] += 1;
        }
      }

      // Update visuals
      const cpColor = cp.owner === 0 ? 0x4488ff : cp.owner === 1 ? 0xff4444 : 0x888888;
      if (cp.ringMesh) {
        (cp.ringMesh.material as THREE.MeshBasicMaterial).color.setHex(cpColor);
      }
      if (cp.beamMesh) {
        (cp.beamMesh.material as THREE.MeshBasicMaterial).color.setHex(cpColor);
        (cp.beamMesh.material as THREE.MeshBasicMaterial).opacity = cp.owner >= 0 ? 0.12 : 0.06;
      }
      if (cp.flagMesh) {
        const fMesh = cp.flagMesh.children[1] as THREE.Mesh;
        if (fMesh) (fMesh.material as THREE.MeshBasicMaterial).color.setHex(cpColor);
      }
    }

    // Ability ready tracking (for human player)
    const humanP = this._getHumanPlayer();
    if (humanP) {
      if (this._lastAbilityCooldown > 0 && humanP.abilityCooldown <= 0) {
        this._abilityReadyTimer = 0.5;
      }
      this._lastAbilityCooldown = humanP.abilityCooldown;
    }

    // Handle human input
    this._handleHumanInput(dt, mapDef);

    // Update AI
    for (const p of this._players) {
      if (p.isAI && p.alive) this._updateAI(p, dt, mapDef);
    }

    // Move players
    for (const p of this._players) {
      if (!p.alive) {
        if (!this._isRoyaleMode) {
          p.respawnTimer -= dt;
          if (p.respawnTimer <= 0) this._respawnPlayer(p, mapDef);
        }
        continue;
      }
      if (p.vehicleId) continue;
      if (p.dragonState) continue; // dragon movement handled separately
      if (p.stunned) continue; // stunned = can't move
      if (p.frozen) {
        p.frozenTimer -= dt;
        if (p.frozenTimer <= 0) p.frozen = false;
        continue;
      }
      this._movePlayer(p, dt, mapDef);
    }

    // Move vehicles
    for (const v of this._vehicles) {
      if (!v.alive) {
        v.respawnTimer -= dt;
        if (v.respawnTimer <= 0) this._respawnVehicle(v, mapDef);
        continue;
      }
      this._moveVehicle(v, dt, mapDef);
    }

    // Move projectiles & check collisions
    this._updateProjectiles(dt, mapDef);

    // Regenerate mana
    for (const p of this._players) {
      if (p.alive && !p.vehicleId) {
        p.mana = Math.min(p.maxMana, p.mana + p.manaRegen * dt);
      }
    }

    // Update reload timers
    for (const p of this._players) {
      if (!p.alive) continue;
      for (let s = 0; s < 3; s++) {
        if (p.reloading[s]) {
          p.reloadTimer[s] -= dt;
          if (p.reloadTimer[s] <= 0) {
            p.reloading[s] = false;
            const wand = getWandDef(this._getPlayerWandId(p, s));
            p.ammo[s] = wand.magPerReload;
            if (p.id === "player_0" && s === p.activeWandSlot) {
              this._reloadFlashTimer = 0.5;
            }
          }
        }
      }
    }

    // Update ability cooldowns
    for (const p of this._players) {
      if (p.abilityCooldown > 0) p.abilityCooldown -= dt;
    }

    // Update player status effects (DOT, stun, slow, blind from crafted spells)
    this._tickPlayerStatusEffects(dt);

    // Environmental spell entities tick
    this._tickEnvSpells(dt, mapDef);

    // Dragon riders tick
    if (this._isDragonMode) {
      this._tickDragonRiders(dt, mapDef);
    }

    // Duel mode tick
    if (this._isDuelMode) {
      this._tickDuel(dt);
    }

    // Check win condition (skip in Royale & Duel - handled separately)
    if (!this._isRoyaleMode && !this._isDuelMode) {
      if (this._matchTimer <= 0 || this._teamScores[0] >= this._customScoreLimit || this._teamScores[1] >= this._customScoreLimit) {
        if (this._rafId) cancelAnimationFrame(this._rafId);
        this._rafId = 0;
        this._showRoundEnd();
      }
    }
  }

  // =====================================================================
  // HUMAN INPUT
  // =====================================================================

  private _handleHumanInput(dt: number, mapDef: MapDef): void {
    const p = this._getHumanPlayer();
    if (!p || !p.alive || p.vehicleId) {
      if (p && p.vehicleId) this._handleVehicleInput(p, dt, mapDef);
      this._mouseDX = 0; this._mouseDY = 0;
      this._wantReload = false; this._wantAbility = false; this._wantInteract = false; this._wantSlot = -1;
      return;
    }

    // Mouse look
    if (this._pointerLocked) {
      const sens = this._mouseRightDown ? MW.MOUSE_SENSITIVITY * MW.ADS_SENSITIVITY_MULT : MW.MOUSE_SENSITIVITY;
      p.yaw -= this._mouseDX * sens;
      p.pitch -= this._mouseDY * sens;
      p.pitch = clamp(p.pitch, -Math.PI / 2 * 0.98, Math.PI / 2 * 0.98);
    }
    this._mouseDX = 0;
    this._mouseDY = 0;

    // Movement direction
    const forward = this._keys["KeyW"] ? 1 : this._keys["KeyS"] ? -1 : 0;
    const strafe = this._keys["KeyD"] ? 1 : this._keys["KeyA"] ? -1 : 0;
    p.sprinting = (!!this._keys["ShiftLeft"] || !!this._keys["ShiftRight"]) && p.stamina > 0;
    p.crouching = !!this._keys["ControlLeft"] || !!this._keys["ControlRight"];

    const speedMult = p.speed * MW.MOVE_SPEED *
      (p.sprinting ? MW.SPRINT_MULT : 1) *
      (p.crouching ? MW.CROUCH_MULT : 1) *
      (this._mouseRightDown ? 0.7 : 1);

    const sinY = Math.sin(p.yaw);
    const cosY = Math.cos(p.yaw);

    if (p.grounded) {
      p.vx = (-sinY * forward + cosY * strafe) * speedMult;
      p.vz = (-cosY * forward - sinY * strafe) * speedMult;
    } else {
      const ax = (-sinY * forward + cosY * strafe) * speedMult * MW.AIR_CONTROL;
      const az = (-cosY * forward - sinY * strafe) * speedMult * MW.AIR_CONTROL;
      p.vx += ax * dt;
      p.vz += az * dt;
    }

    // Jump
    if (this._keys["Space"] && p.grounded) {
      p.vy = MW.JUMP_VELOCITY;
      p.grounded = false;
    }

    // Wand switching
    if (this._wantSlot >= 0 && this._wantSlot <= 2) {
      p.activeWandSlot = this._wantSlot as 0 | 1 | 2;
      this._wantSlot = -1;
    }

    // Fire
    if (this._mouseDown && this._fireTimer <= 0 && !p.reloading[p.activeWandSlot]) {
      const wand = this._getPlayerActiveWand(p);
      if (p.ammo[p.activeWandSlot] > 0 && p.mana >= wand.magicCost) {
        // Break spawn protection on fire
        if (p.spawnProtection > 0) {
          p.spawnProtection = 0;
          if (p.spawnProtectionMesh) {
            this._scene.remove(p.spawnProtectionMesh);
            p.spawnProtectionMesh.geometry.dispose();
            (p.spawnProtectionMesh.material as THREE.Material).dispose();
            p.spawnProtectionMesh = null;
          }
        }
        this._fireWand(p, wand, mapDef);
        this._fireTimer = 1 / wand.fireRate;
        if (!wand.isAuto) this._mouseDown = false;
      } else if (p.ammo[p.activeWandSlot] <= 0) {
        this._startReload(p, p.activeWandSlot);
      }
    }

    // Reload
    if (this._wantReload) {
      this._startReload(p, p.activeWandSlot);
      this._wantReload = false;
    }

    // Ability
    if (this._wantAbility) {
      this._useAbility(p, mapDef);
      this._wantAbility = false;
    }

    // Interact (vehicle)
    if (this._wantInteract) {
      this._tryVehicleInteract(p, mapDef);
      this._wantInteract = false;
    }

    // Rune combination (B key) — combine two held runes into a crafted spell
    if (this._keys["KeyB"] && p.runeInventory.rune1 && p.runeInventory.rune2) {
      this._runeSelectOpen = false;
      this._craftPlayerSpell(p, p.runeInventory.rune1, p.runeInventory.rune2);
      this._keys["KeyB"] = false;
    }

    // Crafted spell firing (G key)
    if (this._keys["KeyG"] && p.craftedSpellSlots.length > 0 && p.craftedSpellCooldown <= 0) {
      const spellId = p.craftedSpellSlots[p.selectedCraftedSpellSlot % p.craftedSpellSlots.length];
      if (spellId) {
        this._fireCraftedSpell(p, spellId, mapDef);
      }
      this._keys["KeyG"] = false; // consume key press
    }

    // Cycle crafted spell slot (V key)
    if (this._keys["KeyV"] && p.craftedSpellSlots.length > 1) {
      p.selectedCraftedSpellSlot = (p.selectedCraftedSpellSlot + 1) % p.craftedSpellSlots.length;
      const spellId = p.craftedSpellSlots[p.selectedCraftedSpellSlot];
      const spell = getCraftedSpellDef(spellId);
      if (spell) {
        this._centerNotification = { text: spell.name, color: "#daa520", timer: 1.0, size: 20 };
      }
      this._keys["KeyV"] = false;
    }

    // Place environmental spell (F key)
    if (this._keys["KeyF"] && p.envSpellCooldown <= 0) {
      this._placeEnvSpell(p, p.selectedEnvSpellId, mapDef);
      this._keys["KeyF"] = false;
    }

    // Apply slow factor to movement
    if (p.slowed) {
      p.vx *= p.slowFactor;
      p.vz *= p.slowFactor;
    }
  }

  private _handleVehicleInput(p: MWPlayer, dt: number, mapDef: MapDef): void {
    if (!p.vehicleId) return;
    const veh = this._vehicles.find(v => v.id === p.vehicleId);
    if (!veh || !veh.alive) { p.vehicleId = null; return; }

    const def = getVehicleDef(veh.defId);

    // Mouse look
    if (this._pointerLocked) {
      const sens = MW.MOUSE_SENSITIVITY;
      veh.yaw -= this._mouseDX * sens;
      veh.pitch = clamp(veh.pitch - this._mouseDY * sens, -Math.PI / 2 * 0.98, Math.PI / 2 * 0.98);
    }
    this._mouseDX = 0;
    this._mouseDY = 0;

    // Movement
    const throttle = this._keys["KeyW"] ? 1 : this._keys["KeyS"] ? -0.5 : 0;
    const turn = this._keys["KeyD"] ? -1 : this._keys["KeyA"] ? 1 : 0;

    veh.yaw += turn * def.turnSpeed * dt;
    veh.speed = lerp(veh.speed, throttle * def.speed, dt * 3);

    // Switch vehicle weapon with F
    if (this._wantWeaponSwitch) {
      veh.activeWeapon = veh.activeWeapon === 0 ? 1 : 0;
      this._wantWeaponSwitch = false;
    }

    // Fire active vehicle weapon
    if (veh.activeWeapon === 0) {
      if (this._mouseDown && veh.fireTimer <= 0) {
        this._fireVehicleWeapon(veh, p, mapDef);
        veh.fireTimer = 1 / def.weaponFireRate;
      }
    } else {
      if (this._mouseDown && veh.secondaryFireTimer <= 0) {
        this._fireVehicleSecondary(veh, p, mapDef);
        veh.secondaryFireTimer = 1 / def.secondaryFireRate;
      }
    }

    // Exit vehicle
    if (this._wantInteract) {
      this._exitVehicle(p, veh, mapDef);
      this._wantInteract = false;
    }
  }


  // =====================================================================
  // PLAYER MOVEMENT
  // =====================================================================

  private _movePlayer(p: MWPlayer, dt: number, mapDef: MapDef): void {
    const wasGrounded = p.grounded;

    p.vy += MW.GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;

    const th = getTerrainHeight(p.x, p.z, mapDef);
    if (p.y <= th + 0.01) {
      p.y = th + 0.01;
      p.vy = 0;
      p.grounded = true;
    } else {
      p.grounded = false;
    }

    // Fall damage: check when transitioning from !grounded to grounded
    if (this._optFallDamage && !wasGrounded && p.grounded) {
      const fallDist = p.lastGroundedY - p.y;
      if (fallDist > MW.FALL_DAMAGE_THRESHOLD) {
        const dmg = (fallDist - MW.FALL_DAMAGE_THRESHOLD) * MW.FALL_DAMAGE_MULT;
        p.hp -= dmg;
        if (p.id === "player_0") this._damageVignetteTimer = 0.4;
        if (p.hp <= 0) {
          this._killPlayer(p, p.id, "Fall Damage");
        }
      }
    }

    // Track lastGroundedY
    if (p.grounded) {
      p.lastGroundedY = p.y;
    }

    const half = mapDef.size;
    p.x = clamp(p.x, -half, half);
    p.z = clamp(p.z, -half, half);

    if (p.grounded) {
      p.vx *= 0.85;
      p.vz *= 0.85;
    }

    // Player-to-player collision
    for (const other of this._players) {
      if (other.id === p.id || !other.alive || other.vehicleId) continue;
      const dx = p.x - other.x;
      const dz = p.z - other.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = MW.PLAYER_RADIUS * 2;
      if (dist < minDist && dist > 0.001) {
        const overlap = (minDist - dist) * 0.5;
        const nx = dx / dist;
        const nz = dz / dist;
        p.x += nx * overlap;
        p.z += nz * overlap;
        other.x -= nx * overlap;
        other.z -= nz * overlap;
      }
    }
  }

  // =====================================================================
  // VEHICLE MOVEMENT
  // =====================================================================

  private _moveVehicle(v: MWVehicle, dt: number, mapDef: MapDef): void {
    const def = getVehicleDef(v.defId);

    if (v.fireTimer > 0) v.fireTimer -= dt;
    if (v.secondaryFireTimer > 0) v.secondaryFireTimer -= dt;

    const sinY = Math.sin(v.yaw);
    const cosY = Math.cos(v.yaw);

    v.x += -sinY * v.speed * dt;
    v.z += -cosY * v.speed * dt;

    if (def.type === "ground") {
      const th = getTerrainHeight(v.x, v.z, mapDef) + def.scaleY * 0.5;
      v.y = th;
    } else if (def.type === "air_hover") {
      v.y = lerp(v.y, def.altitude, dt * 2);
    } else {
      v.y = lerp(v.y, def.altitude + Math.sin(Date.now() * 0.001) * 2, dt);
    }

    v.speed *= 0.97;

    const half = mapDef.size;
    v.x = clamp(v.x, -half, half);
    v.z = clamp(v.z, -half, half);

    if (v.driverId) {
      const driver = this._players.find(p => p.id === v.driverId);
      if (driver) {
        driver.x = v.x;
        driver.y = v.y + def.scaleY * 0.5;
        driver.z = v.z;
        driver.yaw = v.yaw;
        driver.pitch = v.pitch;
      }
    }
    for (let i = 0; i < v.passengers.length; i++) {
      const pass = this._players.find(p => p.id === v.passengers[i]);
      if (pass) {
        pass.x = v.x + Math.cos(v.yaw + (i + 1) * 1.2) * 1.5;
        pass.y = v.y + def.scaleY * 0.5;
        pass.z = v.z + Math.sin(v.yaw + (i + 1) * 1.2) * 1.5;
      }
    }
  }

  // =====================================================================
  // FIRING / PROJECTILES
  // =====================================================================

  private _buildProjectileMesh(color: number, size: number): THREE.Group {
    const group = new THREE.Group();

    // Core: glowing inner sphere
    const coreGeo = new THREE.SphereGeometry(size * 0.6, 10, 10);
    const coreMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 2.0,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // Outer shell: transparent sphere
    const shellGeo = new THREE.SphereGeometry(size * 1.0, 10, 10);
    const shellMat = new THREE.MeshStandardMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    group.add(shell);

    // Energy ring: thin torus rotating around the core
    const ringGeo = new THREE.TorusGeometry(size * 0.8, size * 0.12, 8, 16);
    const ringMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 1.5,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);

    // Spark points: 3-4 small spheres at random offsets
    const sparkCount = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < sparkCount; i++) {
      const sparkGeo = new THREE.SphereGeometry(size * 0.15, 4, 4);
      const sparkMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: color,
        emissiveIntensity: 3.0,
      });
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      spark.position.set(
        (Math.random() - 0.5) * size * 1.4,
        (Math.random() - 0.5) * size * 1.4,
        (Math.random() - 0.5) * size * 1.4,
      );
      group.add(spark);
    }

    return group;
  }

  private _fireWand(p: MWPlayer, wand: WandDef, _mapDef: MapDef): void {
    p.ammo[p.activeWandSlot]--;
    p.mana -= wand.magicCost;

    if (p.invisible) p.invisible = false;

    const spread = wand.spread;
    const yaw = p.yaw + (Math.random() - 0.5) * spread;
    const pitch = p.pitch + (Math.random() - 0.5) * spread;

    const dx = -Math.sin(yaw) * Math.cos(pitch);
    const dy = Math.sin(pitch);
    const dz = -Math.cos(yaw) * Math.cos(pitch);

    const pellets = wand.id === "fire_burst" ? 8 : 1;
    for (let i = 0; i < pellets; i++) {
      const pdx = dx + (pellets > 1 ? (Math.random() - 0.5) * spread * 3 : 0);
      const pdy = dy + (pellets > 1 ? (Math.random() - 0.5) * spread * 3 : 0);
      const pdz = dz + (pellets > 1 ? (Math.random() - 0.5) * spread * 3 : 0);
      const len = Math.sqrt(pdx * pdx + pdy * pdy + pdz * pdz);

      const eyeH = p.crouching ? MW.CROUCH_EYE_HEIGHT : MW.EYE_HEIGHT;
      const proj: MWProjectile = {
        id: nextProjId(), ownerId: p.id, team: p.team,
        x: p.x + pdx / len * 0.5, y: p.y + eyeH + pdy / len * 0.5, z: p.z + pdz / len * 0.5,
        dx: pdx / len, dy: pdy / len, dz: pdz / len,
        speed: wand.projectileSpeed,
        damage: pellets > 1 ? wand.damage : wand.damage,
        splashRadius: wand.splashRadius,
        range: wand.range, traveled: 0,
        color: wand.projectileColor, size: wand.projectileSize,
        mesh: null, fromVehicle: false,
      };

      // Create mesh
      const projGroup = this._buildProjectileMesh(wand.projectileColor, wand.projectileSize);
      projGroup.position.set(proj.x, proj.y, proj.z);
      proj.mesh = projGroup as any;
      this._scene.add(projGroup);

      // Projectile trail
      const trailGeo = new THREE.CylinderGeometry(wand.projectileSize * 0.3, wand.projectileSize * 0.5, 0.8, 4);
      const trailMat = new THREE.MeshBasicMaterial({ color: wand.projectileTrailColor, transparent: true, opacity: 0.6 });
      const trail = new THREE.Mesh(trailGeo, trailMat);
      trail.position.set(proj.x, proj.y, proj.z);
      this._scene.add(trail);
      this._projectileTrails.set(proj.id, trail);

      // Projectile light
      const light = new THREE.PointLight(wand.projectileColor, 0.5, 4);
      light.position.set(proj.x, proj.y, proj.z);
      this._scene.add(light);
      this._projectileLights.set(proj.id, light);

      this._projectiles.push(proj);
    }

    // Muzzle flash
    if (p.id === "player_0") {
      this._fpWandRecoil = 0.08;
    }
    const eyeH = p.crouching ? MW.CROUCH_EYE_HEIGHT : MW.EYE_HEIGHT;
    const flashGeo = new THREE.SphereGeometry(0.15, 6, 6);
    const flashMat = new THREE.MeshBasicMaterial({ color: wand.projectileColor, transparent: true, opacity: 0.8 });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.set(p.x + dx * 0.6, p.y + eyeH + dy * 0.6, p.z + dz * 0.6);
    this._scene.add(flash);
    this._muzzleFlashes.push({ mesh: flash, timer: 0.1, maxTime: 0.1 });
  }

  private _fireVehicleWeapon(v: MWVehicle, driver: MWPlayer, _mapDef: MapDef): void {
    const def = getVehicleDef(v.defId);
    const yaw = v.yaw;
    const pitch = v.pitch;

    const dx = -Math.sin(yaw) * Math.cos(pitch);
    const dy = Math.sin(pitch);
    const dz = -Math.cos(yaw) * Math.cos(pitch);

    const proj: MWProjectile = {
      id: nextProjId(), ownerId: driver.id, team: driver.team,
      x: v.x + dx * 2, y: v.y + def.scaleY * 0.3 + dy * 2, z: v.z + dz * 2,
      dx, dy, dz,
      speed: 80,
      damage: def.weaponDamage,
      splashRadius: def.weaponSplashRadius,
      range: def.weaponRange, traveled: 0,
      color: def.weaponProjectileColor, size: 0.3,
      mesh: null, fromVehicle: true,
    };

    const projGroup = this._buildProjectileMesh(def.weaponProjectileColor, 0.3);
    projGroup.position.set(proj.x, proj.y, proj.z);
    proj.mesh = projGroup as any;
    this._scene.add(projGroup);

    // Trail for vehicle projectile
    const trailGeo = new THREE.CylinderGeometry(0.1, 0.2, 1.2, 4);
    const trailMat = new THREE.MeshBasicMaterial({ color: def.weaponProjectileColor, transparent: true, opacity: 0.5 });
    const trail = new THREE.Mesh(trailGeo, trailMat);
    this._scene.add(trail);
    this._projectileTrails.set(proj.id, trail);

    // Projectile light
    const light = new THREE.PointLight(def.weaponProjectileColor, 0.6, 5);
    this._scene.add(light);
    this._projectileLights.set(proj.id, light);

    // Vehicle turret flash
    const flashGeo = new THREE.SphereGeometry(0.25, 6, 6);
    const flashMat = new THREE.MeshBasicMaterial({ color: def.weaponProjectileColor, transparent: true, opacity: 0.9 });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.set(proj.x, proj.y, proj.z);
    this._scene.add(flash);
    this._muzzleFlashes.push({ mesh: flash, timer: 0.1, maxTime: 0.1 });

    this._projectiles.push(proj);
  }

  private _fireVehicleSecondary(v: MWVehicle, driver: MWPlayer, _mapDef: MapDef): void {
    const def = getVehicleDef(v.defId);
    const yaw = v.yaw;
    const pitch = v.pitch;

    const dx = -Math.sin(yaw) * Math.cos(pitch);
    const dy = Math.sin(pitch);
    const dz = -Math.cos(yaw) * Math.cos(pitch);

    const proj: MWProjectile = {
      id: nextProjId(), ownerId: driver.id, team: driver.team,
      x: v.x + dx * 2, y: v.y + def.scaleY * 0.3 + dy * 2, z: v.z + dz * 2,
      dx, dy, dz,
      speed: def.secondaryProjectileSpeed,
      damage: def.secondaryDamage,
      splashRadius: def.secondarySplashRadius,
      range: def.secondaryRange, traveled: 0,
      color: def.secondaryProjectileColor, size: def.secondaryProjectileSize,
      mesh: null, fromVehicle: true,
    };

    const projGroup = this._buildProjectileMesh(def.secondaryProjectileColor, def.secondaryProjectileSize);
    projGroup.position.set(proj.x, proj.y, proj.z);
    proj.mesh = projGroup as any;
    this._scene.add(projGroup);

    const trailGeo = new THREE.CylinderGeometry(def.secondaryProjectileSize * 0.3, def.secondaryProjectileSize * 0.6, 1.0, 4);
    const trailMat = new THREE.MeshBasicMaterial({ color: def.secondaryProjectileColor, transparent: true, opacity: 0.5 });
    const trail = new THREE.Mesh(trailGeo, trailMat);
    this._scene.add(trail);
    this._projectileTrails.set(proj.id, trail);

    const light = new THREE.PointLight(def.secondaryProjectileColor, 0.4, 4);
    this._scene.add(light);
    this._projectileLights.set(proj.id, light);

    const flashGeo = new THREE.SphereGeometry(def.secondaryProjectileSize * 0.8, 6, 6);
    const flashMat = new THREE.MeshBasicMaterial({ color: def.secondaryProjectileColor, transparent: true, opacity: 0.9 });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.set(proj.x, proj.y, proj.z);
    this._scene.add(flash);
    this._muzzleFlashes.push({ mesh: flash, timer: 0.08, maxTime: 0.08 });

    this._projectiles.push(proj);
  }

  private _startReload(p: MWPlayer, slot: number): void {
    if (p.reloading[slot]) return;
    const wand = getWandDef(this._getPlayerWandId(p, slot));
    if (p.ammo[slot] >= wand.magPerReload) return;
    p.reloading[slot] = true;
    p.reloadTimer[slot] = wand.reloadTime;
  }

  private _updateProjectiles(dt: number, mapDef: MapDef): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this._projectiles.length; i++) {
      const proj = this._projectiles[i];

      if (proj.speed < 60) {
        proj.dy += MW.GRAVITY * 0.02 * dt;
      }

      const step = proj.speed * dt;
      proj.x += proj.dx * step;
      proj.y += proj.dy * step;
      proj.z += proj.dz * step;
      proj.traveled += step;

      if (proj.mesh) {
        proj.mesh.position.set(proj.x, proj.y, proj.z);
        // Spin the energy ring
        proj.mesh.rotation.x += dt * 8;
        proj.mesh.rotation.z += dt * 5;
      }

      // Update trail position and orientation
      const trail = this._projectileTrails.get(proj.id);
      if (trail) {
        trail.position.set(proj.x - proj.dx * 0.5, proj.y - proj.dy * 0.5, proj.z - proj.dz * 0.5);
        trail.lookAt(proj.x + proj.dx, proj.y + proj.dy, proj.z + proj.dz);
        trail.rotateX(Math.PI / 2);
      }
      // Update light
      const light = this._projectileLights.get(proj.id);
      if (light) light.position.set(proj.x, proj.y, proj.z);

      const th = getTerrainHeight(proj.x, proj.z, mapDef);
      if (proj.traveled > proj.range || proj.y < th) {
        if (proj.splashRadius > 0 && proj.y < th + 1) {
          this._applySplashDamage(proj, mapDef);
        }
        toRemove.push(i);
        continue;
      }

      // Check if blocked by environmental spell entities
      let envBlocked = false;
      for (const envEntity of this._envSpellEntities) {
        if (doesEnvSpellBlockProjectile(envEntity, proj.x, proj.y, proj.z)) {
          // Don't block own team's projectiles
          if (envEntity.team !== proj.team) {
            envBlocked = true;
            break;
          }
        }
      }
      if (envBlocked) {
        toRemove.push(i);
        continue;
      }

      // Check collision with players
      let hit = false;
      for (const target of this._players) {
        if (!target.alive || target.id === proj.ownerId) continue;
        if (!this._isRoyaleMode && !this._optFriendlyFire && target.team === proj.team) continue;
        if (target.vehicleId) continue;
        if (target.invisible) continue;

        const playerH = target.crouching ? MW.CROUCH_HEIGHT : MW.PLAYER_HEIGHT;
        const ddx = proj.x - target.x;
        const ddz = proj.z - target.z;
        const horizDist = Math.sqrt(ddx * ddx + ddz * ddz);
        const vertInRange = proj.y >= target.y && proj.y <= target.y + playerH;

        if (horizDist < MW.PLAYER_RADIUS + proj.size && vertInRange) {
          // Spawn protection: skip damage
          if (target.spawnProtection > 0) {
            hit = true;
            toRemove.push(i);
            break;
          }

          const isHeadshot = this._optHeadshotsEnabled && proj.y > target.y + playerH * 0.8;
          const owner = this._players.find(p => p.id === proj.ownerId);
          const wandDef = owner ? this._getPlayerActiveWand(owner) : null;
          const hsMult = isHeadshot && wandDef ? wandDef.headshotMult : 1;

          let dmg = proj.damage * hsMult;
          dmg *= (1 - target.armor / 100);

          if (target.shieldHp > 0) {
            const absorbed = Math.min(target.shieldHp, dmg);
            target.shieldHp -= absorbed;
            dmg -= absorbed;
          }

          target.hp -= dmg;

          // Track damagers for assists
          target.lastDamagers.push({ id: proj.ownerId, time: this._gameTime });

          if (proj.ownerId === "player_0") {
            this._hitMarkerTimer = 0.15;
            if (isHeadshot) this._headshotTimer = 1.0;
            // Floating damage number
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            const dmgText = Math.round(dmg).toString();
            this._floatingTexts.push({
              text: "+" + dmgText,
              x: cx + (Math.random() - 0.5) * 40,
              y: cy - 20,
              vx: (Math.random() - 0.5) * 30,
              vy: -60,
              life: 1.0,
              color: isHeadshot ? "#ff4444" : "#ffdd44",
              size: isHeadshot ? 20 : 16,
            });
            if (isHeadshot) {
              this._floatingTexts.push({
                text: "CRITICAL",
                x: cx + (Math.random() - 0.5) * 20,
                y: cy - 45,
                vx: 0,
                vy: -40,
                life: 1.2,
                color: "#ff6644",
                size: 14,
              });
            }
          }
          if (target.id === "player_0") {
            this._damageVignetteTimer = 0.5;
            // Hit direction
            this._lastDamageDir.x = proj.dx;
            this._lastDamageDir.z = proj.dz;
            this._lastDamageDir.timer = 0.5;
          }

          // Apply crafted spell effects if this is a crafted spell projectile
          if (proj.id.startsWith("cs_") && owner) {
            const csId = owner.craftedSpellSlots[owner.selectedCraftedSpellSlot];
            const csDef = csId ? getCraftedSpellDef(csId) : null;
            if (csDef) {
              this._applyCraftedSpellHit(csDef, owner, target);
            }
          }

          if (target.hp <= 0) {
            this._killPlayer(target, proj.ownerId, this._getPlayerActiveWand(owner || target).name);
          }

          if (proj.splashRadius > 0) {
            this._applySplashDamage(proj, mapDef);
          }

          hit = true;
          toRemove.push(i);
          break;
        }
      }
      if (hit) continue;

      // Check collision with vehicles
      for (const veh of this._vehicles) {
        if (!veh.alive) continue;
        const def = getVehicleDef(veh.defId);
        const ddx = Math.abs(proj.x - veh.x);
        const ddy = Math.abs(proj.y - veh.y);
        const ddz = Math.abs(proj.z - veh.z);
        if (ddx < def.scaleX * 0.6 && ddy < def.scaleY * 0.6 && ddz < def.scaleZ * 0.6) {
          veh.hp -= proj.damage;
          if (proj.ownerId === "player_0") this._hitMarkerTimer = 0.15;

          if (veh.hp <= 0) {
            this._destroyVehicle(veh, proj.ownerId);
          }

          if (proj.splashRadius > 0) {
            this._applySplashDamage(proj, mapDef);
          }
          toRemove.push(i);
          break;
        }
      }
    }

    // Remove projectiles in reverse order
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const proj = this._projectiles[idx];
      if (proj.mesh) {
        this._scene.remove(proj.mesh);
        proj.mesh.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
          if ((child as THREE.Mesh).material) ((child as THREE.Mesh).material as THREE.Material).dispose();
        });
      }
      // Clean up trail
      const trail = this._projectileTrails.get(proj.id);
      if (trail) {
        this._scene.remove(trail);
        trail.geometry.dispose();
        (trail.material as THREE.Material).dispose();
        this._projectileTrails.delete(proj.id);
      }
      // Clean up light
      const light = this._projectileLights.get(proj.id);
      if (light) {
        this._scene.remove(light);
        light.dispose();
        this._projectileLights.delete(proj.id);
      }
      this._projectiles.splice(idx, 1);
    }
  }

  private _applySplashDamage(proj: MWProjectile, _mapDef: MapDef): void {
    for (const target of this._players) {
      if (!target.alive) continue;
      if (!this._isRoyaleMode && !this._optFriendlyFire && target.team === proj.team) continue;
      const d = dist3(proj.x, proj.y, proj.z, target.x, target.y + MW.PLAYER_HEIGHT * 0.5, target.z);
      if (d < proj.splashRadius) {
        const falloff = 1 - (d / proj.splashRadius);
        let dmg = proj.damage * 0.5 * falloff;
        dmg *= (1 - target.armor / 100);
        if (target.shieldHp > 0) {
          const absorbed = Math.min(target.shieldHp, dmg);
          target.shieldHp -= absorbed;
          dmg -= absorbed;
        }
        target.hp -= dmg;
        if (target.id === "player_0") this._damageVignetteTimer = 0.5;
        if (proj.ownerId === "player_0") this._hitMarkerTimer = 0.15;
        if (target.hp <= 0) {
          const owner = this._players.find(p => p.id === proj.ownerId);
          this._killPlayer(target, proj.ownerId, owner ? this._getPlayerActiveWand(owner).name : "Splash");
        }
      }
    }
  }


  // =====================================================================
  // KILL / RESPAWN / VEHICLE INTERACT
  // =====================================================================

  private _killPlayer(target: MWPlayer, killerId: string, weaponName: string): void {
    target.alive = false;
    target.hp = 0;
    target.respawnTimer = MW.RESPAWN_TIME;
    target.deaths++;

    const killer = this._players.find(p => p.id === killerId);
    if (killer && killer.id !== target.id) {
      killer.kills++;
      killer.score += MW.KILL_SCORE;
      this._teamScores[killer.team] += MW.KILL_SCORE;

      // Kill streak tracking
      killer.currentStreak++;
      const timeSinceLastKill = this._gameTime - killer.lastKillTime;
      killer.lastKillTime = this._gameTime;

      // Show notifications for human player
      if (killer.id === "player_0") {
        this._eliminatedTimer = 1.0;

        // Multi-kill check
        if (timeSinceLastKill < MW.MULTIKILL_WINDOW && killer.kills >= 2) {
          // Count rapid kills (approximate from streak timing)
          let multiText = "";
          let multiColor = "#ffdd44";
          let multiSize = 28;
          if (timeSinceLastKill < MW.MULTIKILL_WINDOW) {
            // We track using currentStreak since it resets on death
            const recentKills = killer.currentStreak;
            if (recentKills >= 5) { multiText = "RAMPAGE!"; multiColor = "#aa44ff"; multiSize = 36; }
            else if (recentKills >= 4) { multiText = "QUAD KILL"; multiColor = "#ff4444"; multiSize = 32; }
            else if (recentKills >= 3) { multiText = "TRIPLE KILL"; multiColor = "#ff8844"; multiSize = 30; }
            else if (recentKills >= 2) { multiText = "DOUBLE KILL"; multiColor = "#ffdd44"; multiSize = 28; }
          }
          if (multiText) {
            this._centerNotification = { text: multiText, color: multiColor, timer: 2.0, size: multiSize };
          }
        }

        // Kill streak check
        const streak = killer.currentStreak;
        let streakText = "";
        let streakColor = "#daa520";
        let streakSize = 26;
        if (streak >= 10) { streakText = "LEGENDARY"; streakColor = "#ff44ff"; streakSize = 36; }
        else if (streak >= 7) { streakText = "GODLIKE"; streakColor = "#ff4444"; streakSize = 34; }
        else if (streak >= 5) { streakText = "UNSTOPPABLE"; streakColor = "#ff8844"; streakSize = 30; }
        else if (streak >= 3) { streakText = "KILLING SPREE"; streakColor = "#ffdd44"; streakSize = 28; }
        if (streakText && (!this._centerNotification || this._centerNotification.timer <= 0)) {
          this._centerNotification = { text: streakText, color: streakColor, timer: 2.0, size: streakSize };
        }
      }
    }

    // Reset target's streak
    target.currentStreak = 0;

    // Assist tracking: check all damagers in last ASSIST_WINDOW seconds
    const now = this._gameTime;
    for (const dmgEntry of target.lastDamagers) {
      if (dmgEntry.id !== killerId && (now - dmgEntry.time) < MW.ASSIST_WINDOW) {
        const assister = this._players.find(pp => pp.id === dmgEntry.id);
        if (assister && assister.team !== target.team) {
          // Award only once per kill
          const alreadyAssisted = this._killFeed.some(kf =>
            kf.victim === target.id && kf.killer === dmgEntry.id && kf.isAssist && Math.abs(kf.time - Date.now() / 1000) < 1
          );
          if (!alreadyAssisted) {
            assister.assists++;
            assister.score += 1;
            this._killFeed.push({
              killer: dmgEntry.id, victim: target.id, weapon: "assist", time: Date.now() / 1000, isAssist: true,
            });
          }
        }
      }
    }
    target.lastDamagers = [];

    this._killFeed.push({
      killer: killerId, victim: target.id, weapon: weaponName, time: Date.now() / 1000,
    });

    // Royale placement tracking
    if (this._isRoyaleMode && this._royaleState && target.id === "player_0") {
      const alive = this._players.filter(pp => pp.alive).length;
      this._royaleState.placement = alive + 1;
    }

    if (target.vehicleId) {
      const veh = this._vehicles.find(v => v.id === target.vehicleId);
      if (veh) {
        if (veh.driverId === target.id) veh.driverId = null;
        veh.passengers = veh.passengers.filter(id => id !== target.id);
      }
      target.vehicleId = null;
    }

    // Hide mesh
    if (target.mesh) target.mesh.visible = false;
    if (target.nameTag) target.nameTag.visible = false;
    // Clean up spawn protection mesh
    if (target.spawnProtectionMesh) {
      this._scene.remove(target.spawnProtectionMesh);
      target.spawnProtectionMesh.geometry.dispose();
      (target.spawnProtectionMesh.material as THREE.Material).dispose();
      target.spawnProtectionMesh = null;
    }
    target.spawnProtection = 0;

    // Death explosion particles
    const cls = getClassDef(target.classId);
    this._spawnDeathExplosion(target.x, target.y + MW.PLAYER_HEIGHT * 0.5, target.z, cls.robeColor);

    // Remove player light temporarily
    const pl = this._playerLights.get(target.id);
    if (pl) pl.intensity = 0;
  }

  private _spawnDeathExplosion(x: number, y: number, z: number, color: number): void {
    // Main burst
    const count = 35;
    for (let i = 0; i < count; i++) {
      const size = 0.03 + Math.random() * 0.05;
      const geo = new THREE.SphereGeometry(size, 4, 4);
      const pColor = Math.random() > 0.3 ? color : brightenColor(color, 1.5);
      const mat = new THREE.MeshBasicMaterial({ color: pColor, transparent: true, opacity: 1.0 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this._scene.add(mesh);
      this._particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 10,
        vy: Math.random() * 7 + 2,
        vz: (Math.random() - 0.5) * 10,
        life: 1.0 + Math.random() * 0.8,
        maxLife: 1.8,
        gravity: true,
      });
    }

    // Central flash sphere
    const flashGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({ color: brightenColor(color, 2.0), transparent: true, opacity: 0.7 });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.set(x, y, z);
    this._scene.add(flash);
    this._tempVFX.push({ mesh: flash, timer: 0.3 });

    // Rising soul wisps
    for (let i = 0; i < 6; i++) {
      const wispGeo = new THREE.SphereGeometry(0.03, 4, 4);
      const wispMat = new THREE.MeshBasicMaterial({ color: 0xeeddff, transparent: true, opacity: 0.8 });
      const wisp = new THREE.Mesh(wispGeo, wispMat);
      wisp.position.set(x + (Math.random() - 0.5) * 0.5, y, z + (Math.random() - 0.5) * 0.5);
      this._scene.add(wisp);
      this._particles.push({
        mesh: wisp,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 3 + Math.random() * 3,
        vz: (Math.random() - 0.5) * 0.5,
        life: 1.5 + Math.random() * 0.5,
        maxLife: 2.0,
        gravity: false,
      });
    }
  }

  private _spawnVehicleExplosion(x: number, y: number, z: number): void {
    // Inner bright core
    const coreGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffee44, transparent: true, opacity: 0.9 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(x, y, z);
    this._scene.add(core);
    this._tempVFX.push({ mesh: core, timer: 0.3 });

    // Outer fireball
    const sphereGeo = new THREE.SphereGeometry(0.8, 8, 8);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.7 });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.set(x, y, z);
    this._scene.add(sphere);
    this._tempVFX.push({ mesh: sphere, timer: 0.6 });

    // Smoke ring
    const smokeRingGeo = new THREE.TorusGeometry(1.5, 0.3, 6, 12);
    const smokeRingMat = new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.4 });
    const smokeRing = new THREE.Mesh(smokeRingGeo, smokeRingMat);
    smokeRing.position.set(x, y + 0.5, z);
    smokeRing.rotation.x = Math.PI / 2;
    this._scene.add(smokeRing);
    this._tempVFX.push({ mesh: smokeRing, timer: 0.8 });

    // Explosion flash light
    const exLight = new THREE.PointLight(0xff6600, 3, 20);
    exLight.position.set(x, y + 1, z);
    this._scene.add(exLight);
    setTimeout(() => { this._scene.remove(exLight); exLight.dispose(); }, 400);

    // Fire particles
    const count = 55;
    for (let i = 0; i < count; i++) {
      const size = 0.04 + Math.random() * 0.08;
      const geo = new THREE.SphereGeometry(size, 4, 4);
      const pColor = [0xff6600, 0xff3300, 0xff8800, 0xffaa00][Math.floor(Math.random() * 4)];
      const mat = new THREE.MeshBasicMaterial({ color: pColor, transparent: true, opacity: 1.0 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this._scene.add(mesh);
      this._particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 14,
        vy: Math.random() * 10 + 3,
        vz: (Math.random() - 0.5) * 14,
        life: 1.5 + Math.random() * 1.2,
        maxLife: 2.7,
        gravity: true,
      });
    }

    // Smoke particles (dark, slow-rising)
    for (let i = 0; i < 15; i++) {
      const geo = new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x + (Math.random() - 0.5) * 2, y, z + (Math.random() - 0.5) * 2);
      this._scene.add(mesh);
      this._particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 3,
        vz: (Math.random() - 0.5) * 2,
        life: 2.0 + Math.random() * 1.5,
        maxLife: 3.5,
        gravity: false,
      });
    }
  }

  private _respawnPlayer(p: MWPlayer, mapDef: MapDef): void {
    const cls = getClassDef(p.classId);
    const spawnDist = mapDef.spawnDistance / 2;
    const spawnX = p.team === 0 ? -spawnDist : spawnDist;

    p.alive = true;
    p.hp = cls.hp;
    p.mana = cls.mana;
    p.shieldHp = 0;
    p.invisible = false;
    p.frozen = false;
    p.x = spawnX + (Math.random() - 0.5) * 10;
    p.z = (Math.random() - 0.5) * 20;
    p.y = getTerrainHeight(p.x, p.z, mapDef) + 0.01;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.grounded = true;
    p.vehicleId = null;
    p.lastGroundedY = p.y;
    p.stamina = p.maxStamina;
    p.staminaRegenDelay = 0;

    // Spawn protection
    p.spawnProtection = MW.SPAWN_PROTECTION_TIME;
    // Golden glow sphere
    const spGeo = new THREE.SphereGeometry(1.0, 12, 12);
    const spMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    const spMesh = new THREE.Mesh(spGeo, spMat);
    spMesh.position.set(p.x, p.y + MW.PLAYER_HEIGHT * 0.5, p.z);
    this._scene.add(spMesh);
    p.spawnProtectionMesh = spMesh;

    for (let s = 0; s < 3; s++) {
      const wand = getWandDef(this._getPlayerWandId(p, s));
      p.ammo[s] = wand.magPerReload;
      p.reloading[s] = false;
    }

    if (p.mesh) {
      p.mesh.visible = true;
      p.mesh.position.set(p.x, p.y, p.z);
    }
    if (p.nameTag) {
      p.nameTag.visible = true;
    }

    // Restore player light
    const pl = this._playerLights.get(p.id);
    if (pl) pl.intensity = 0.3;
  }

  private _destroyVehicle(veh: MWVehicle, killerId: string): void {
    veh.alive = false;
    veh.hp = 0;
    veh.respawnTimer = 15;

    if (veh.driverId) {
      const driver = this._players.find(p => p.id === veh.driverId);
      if (driver) {
        driver.vehicleId = null;
        driver.hp -= 30;
        if (driver.hp <= 0) this._killPlayer(driver, killerId, "Vehicle Explosion");
      }
      veh.driverId = null;
    }
    for (const pid of veh.passengers) {
      const pass = this._players.find(p => p.id === pid);
      if (pass) {
        pass.vehicleId = null;
        pass.hp -= 30;
        if (pass.hp <= 0) this._killPlayer(pass, killerId, "Vehicle Explosion");
      }
    }
    veh.passengers = [];

    const killer = this._players.find(p => p.id === killerId);
    if (killer) {
      killer.score += MW.VEHICLE_KILL_SCORE;
      this._teamScores[killer.team] += MW.VEHICLE_KILL_SCORE;
    }

    if (veh.mesh) veh.mesh.visible = false;

    // Vehicle explosion VFX
    this._spawnVehicleExplosion(veh.x, veh.y, veh.z);
  }

  private _respawnVehicle(veh: MWVehicle, _mapDef: MapDef): void {
    const def = getVehicleDef(veh.defId);
    veh.alive = true;
    veh.hp = def.hp;
    veh.x = veh.spawnX;
    veh.y = veh.spawnY;
    veh.z = veh.spawnZ;
    veh.speed = 0;
    veh.yaw = 0;
    veh.team = -1;
    veh.driverId = null;
    veh.passengers = [];
    if (veh.mesh) {
      veh.mesh.visible = true;
      veh.mesh.position.set(veh.x, veh.y, veh.z);
    }
  }

  private _tryVehicleInteract(p: MWPlayer, mapDef: MapDef): void {
    if (p.vehicleId) {
      const veh = this._vehicles.find(v => v.id === p.vehicleId);
      if (veh) this._exitVehicle(p, veh, mapDef);
      return;
    }

    let bestVeh: MWVehicle | null = null;
    let bestDist = Infinity;
    for (const v of this._vehicles) {
      if (!v.alive) continue;
      if (v.team !== -1 && v.team !== p.team) continue;
      const vDef = getVehicleDef(v.defId);
      // For flying/hovering vehicles, use horizontal distance so players can board from below
      let d: number;
      let maxRange: number;
      if (vDef.type === "air_fly" || vDef.type === "air_hover") {
        d = dist2(p.x, p.z, v.x, v.z);
        maxRange = MW.AI_VEHICLE_ENTER_DIST * 3;
      } else {
        d = dist3(p.x, p.y, p.z, v.x, v.y, v.z);
        maxRange = MW.AI_VEHICLE_ENTER_DIST;
      }
      if (d < maxRange && d < bestDist) {
        bestDist = d;
        bestVeh = v;
      }
    }

    if (bestVeh) {
      this._enterVehicle(p, bestVeh);
    }
  }

  private _enterVehicle(p: MWPlayer, veh: MWVehicle): void {
    const def = getVehicleDef(veh.defId);
    if (!veh.driverId) {
      veh.driverId = p.id;
      veh.team = p.team;
    } else if (veh.passengers.length < def.seats - 1) {
      veh.passengers.push(p.id);
    } else {
      return;
    }
    p.vehicleId = veh.id;
    if (p.mesh) p.mesh.visible = false;
    if (p.nameTag) p.nameTag.visible = false;
  }

  private _exitVehicle(p: MWPlayer, veh: MWVehicle, mapDef: MapDef): void {
    if (veh.driverId === p.id) {
      veh.driverId = null;
      if (veh.passengers.length > 0) {
        veh.driverId = veh.passengers.shift()!;
      } else {
        veh.team = -1;
      }
    } else {
      veh.passengers = veh.passengers.filter(id => id !== p.id);
    }
    p.vehicleId = null;
    p.x = veh.x + 3;
    p.z = veh.z + 3;
    p.y = getTerrainHeight(p.x, p.z, mapDef) + 0.01;
    if (p.mesh) p.mesh.visible = true;
    if (p.nameTag) p.nameTag.visible = true;
  }


  // =====================================================================
  // ABILITIES
  // =====================================================================

  private _useAbility(p: MWPlayer, mapDef: MapDef): void {
    if (!this._optAbilitiesEnabled) return;
    if (p.abilityCooldown > 0) return;
    const cls = getClassDef(p.classId);
    p.abilityCooldown = cls.abilityCooldown;

    switch (cls.id) {
      case "battlemage": {
        p.shieldHp = 50;
        // VFX: translucent blue sphere
        const shieldGeo = new THREE.SphereGeometry(1.0, 12, 12);
        const shieldMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
        const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        shieldMesh.position.set(p.x, p.y + MW.PLAYER_HEIGHT * 0.5, p.z);
        this._scene.add(shieldMesh);
        this._shieldMeshes.set(p.id, shieldMesh);
        // Shield light
        const shieldLight = new THREE.PointLight(0x4488ff, 0.5, 5);
        shieldLight.position.copy(shieldMesh.position);
        this._scene.add(shieldLight);
        this._frozenLights.set("shield_" + p.id, shieldLight);
        setTimeout(() => {
          p.shieldHp = 0;
          const sm = this._shieldMeshes.get(p.id);
          if (sm) { this._scene.remove(sm); sm.geometry.dispose(); (sm.material as THREE.Material).dispose(); this._shieldMeshes.delete(p.id); }
          const sl = this._frozenLights.get("shield_" + p.id);
          if (sl) { this._scene.remove(sl); sl.dispose(); this._frozenLights.delete("shield_" + p.id); }
        }, 4000);
        break;
      }
      case "pyromancer": {
        for (const target of this._players) {
          if (!target.alive || target.id === p.id) continue;
          if (!this._isRoyaleMode && target.team === p.team) continue;
          const d = dist3(p.x, p.y, p.z, target.x, target.y, target.z);
          if (d < 8) {
            const dmg = 60 * (1 - d / 8) * (1 - target.armor / 100);
            target.hp -= dmg;
            if (target.id === "player_0") this._damageVignetteTimer = 0.5;
            if (target.hp <= 0) this._killPlayer(target, p.id, "Inferno Burst");
          }
        }
        // VFX: orange/red expanding ring of particles
        for (let i = 0; i < 30; i++) {
          const angle = (i / 30) * Math.PI * 2;
          const geo = new THREE.SphereGeometry(0.06, 4, 4);
          const mat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xff6600 : 0xff2200, transparent: true, opacity: 1.0 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(p.x, p.y + 1, p.z);
          this._scene.add(mesh);
          this._particles.push({
            mesh, vx: Math.cos(angle) * 6, vy: Math.random() * 2, vz: Math.sin(angle) * 6,
            life: 0.8, maxLife: 0.8, gravity: false,
          });
        }
        break;
      }
      case "cryomancer": {
        for (const target of this._players) {
          if (!target.alive || target.id === p.id) continue;
          if (!this._isRoyaleMode && target.team === p.team) continue;
          const d = dist3(p.x, p.y, p.z, target.x, target.y, target.z);
          if (d < 10) {
            target.frozen = true;
            target.frozenTimer = 2;
            // VFX: blue snowflake particles
            for (let si = 0; si < 8; si++) {
              const geo = new THREE.SphereGeometry(0.03, 4, 4);
              const mat = new THREE.MeshBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 1.0 });
              const mesh = new THREE.Mesh(geo, mat);
              mesh.position.set(target.x + (Math.random()-0.5)*0.8, target.y + Math.random()*1.5, target.z + (Math.random()-0.5)*0.8);
              this._scene.add(mesh);
              this._particles.push({
                mesh, vx: (Math.random()-0.5)*1, vy: Math.random()*1.5, vz: (Math.random()-0.5)*1,
                life: 1.5, maxLife: 1.5, gravity: false,
              });
            }
            // Frozen light
            const fl = new THREE.PointLight(0x88ddff, 0.4, 4);
            fl.position.set(target.x, target.y + 1, target.z);
            this._scene.add(fl);
            this._frozenLights.set("frozen_" + target.id, fl);
            setTimeout(() => {
              const ffl = this._frozenLights.get("frozen_" + target.id);
              if (ffl) { this._scene.remove(ffl); ffl.dispose(); this._frozenLights.delete("frozen_" + target.id); }
            }, 2200);
          }
        }
        break;
      }
      case "stormcaller": {
        let current = p;
        const hit = new Set<string>();
        const chainTargets: MWPlayer[] = [];
        for (let bounce = 0; bounce < 3; bounce++) {
          let nearest: MWPlayer | null = null;
          let nearDist = 20;
          for (const t of this._players) {
            if (!t.alive || t.team === p.team || hit.has(t.id)) continue;
            const d = dist3(current.x, current.y, current.z, t.x, t.y, t.z);
            if (d < nearDist) { nearDist = d; nearest = t; }
          }
          if (nearest) {
            hit.add(nearest.id);
            chainTargets.push(nearest);
            const dmg = 40 * (1 - nearest.armor / 100);
            nearest.hp -= dmg;
            if (nearest.id === "player_0") this._damageVignetteTimer = 0.5;
            if (p.id === "player_0") this._hitMarkerTimer = 0.15;
            if (nearest.hp <= 0) this._killPlayer(nearest, p.id, "Chain Lightning");
            current = nearest;
          } else break;
        }
        // VFX: yellow line meshes connecting targets
        let prevTarget: MWPlayer = p;
        for (const ct of chainTargets) {
          const points = [
            new THREE.Vector3(prevTarget.x, prevTarget.y + MW.EYE_HEIGHT, prevTarget.z),
            new THREE.Vector3(ct.x, ct.y + MW.PLAYER_HEIGHT * 0.5, ct.z),
          ];
          const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
          const lineMat = new THREE.LineBasicMaterial({ color: 0xffff44, linewidth: 2 });
          const line = new THREE.Line(lineGeo, lineMat);
          this._scene.add(line);
          this._tempVFX.push({ mesh: line, timer: 0.3 });
          prevTarget = ct;
        }
        break;
      }
      case "shadowmancer": {
        p.invisible = true;
        if (p.mesh) p.mesh.visible = false;
        // VFX: purple mist particles swirling
        for (let si = 0; si < 15; si++) {
          const angle = (si / 15) * Math.PI * 2;
          const geo = new THREE.SphereGeometry(0.05, 4, 4);
          const mat = new THREE.MeshBasicMaterial({ color: 0x8833aa, transparent: true, opacity: 0.7 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(p.x, p.y + 1, p.z);
          this._scene.add(mesh);
          this._particles.push({
            mesh, vx: Math.cos(angle) * 1.5, vy: Math.random() * 2, vz: Math.sin(angle) * 1.5,
            life: 1.0, maxLife: 1.0, gravity: false,
          });
        }
        setTimeout(() => {
          p.invisible = false;
          if (p.mesh && p.alive) p.mesh.visible = true;
        }, 5000);
        break;
      }
      case "druid": {
        p.hp = Math.min(p.maxHp, p.hp + 40);
        for (const ally of this._players) {
          if (!ally.alive || ally.team !== p.team || ally.id === p.id) continue;
          const d = dist3(p.x, p.y, p.z, ally.x, ally.y, ally.z);
          if (d < 12) {
            ally.hp = Math.min(ally.maxHp, ally.hp + 40);
          }
        }
        // VFX: green rising leaf particles
        for (let si = 0; si < 20; si++) {
          const geo = new THREE.SphereGeometry(0.04, 4, 4);
          const mat = new THREE.MeshBasicMaterial({ color: 0x44cc22, transparent: true, opacity: 1.0 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(p.x + (Math.random()-0.5)*2, p.y, p.z + (Math.random()-0.5)*2);
          this._scene.add(mesh);
          this._particles.push({
            mesh, vx: (Math.random()-0.5)*0.5, vy: 2 + Math.random()*2, vz: (Math.random()-0.5)*0.5,
            life: 1.5, maxLife: 1.5, gravity: false,
          });
        }
        break;
      }
      case "warlock": {
        let nearest: MWPlayer | null = null;
        let nearDist = 15;
        for (const t of this._players) {
          if (!t.alive || t.team === p.team) continue;
          const d = dist3(p.x, p.y, p.z, t.x, t.y, t.z);
          if (d < nearDist) { nearDist = d; nearest = t; }
        }
        if (nearest) {
          const dmg = 30 * (1 - nearest.armor / 100);
          nearest.hp -= dmg;
          p.hp = Math.min(p.maxHp, p.hp + 30);
          if (nearest.id === "player_0") this._damageVignetteTimer = 0.5;
          if (p.id === "player_0") this._hitMarkerTimer = 0.15;
          if (nearest.hp <= 0) this._killPlayer(nearest, p.id, "Soul Drain");
          // VFX: red beam line from target to caster
          const points = [
            new THREE.Vector3(nearest.x, nearest.y + MW.PLAYER_HEIGHT * 0.5, nearest.z),
            new THREE.Vector3(p.x, p.y + MW.EYE_HEIGHT, p.z),
          ];
          const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
          const lineMat = new THREE.LineBasicMaterial({ color: 0xcc2244 });
          const line = new THREE.Line(lineGeo, lineMat);
          this._scene.add(line);
          this._tempVFX.push({ mesh: line, timer: 0.4 });
        }
        break;
      }
      case "archmage": {
        const oldX = p.x, oldY = p.y, oldZ = p.z;
        const ddx = -Math.sin(p.yaw) * 15;
        const ddz = -Math.cos(p.yaw) * 15;
        p.x += ddx;
        p.z += ddz;
        const half = mapDef.size;
        p.x = clamp(p.x, -half, half);
        p.z = clamp(p.z, -half, half);
        p.y = getTerrainHeight(p.x, p.z, mapDef) + 0.01;
        // VFX: purple flash at origin and destination
        for (const pos of [[oldX, oldY + 1, oldZ], [p.x, p.y + 1, p.z]]) {
          for (let si = 0; si < 10; si++) {
            const geo = new THREE.SphereGeometry(0.05, 4, 4);
            const mat = new THREE.MeshBasicMaterial({ color: 0xaa44ff, transparent: true, opacity: 1.0 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(pos[0], pos[1], pos[2]);
            this._scene.add(mesh);
            this._particles.push({
              mesh, vx: (Math.random()-0.5)*4, vy: Math.random()*3, vz: (Math.random()-0.5)*4,
              life: 0.6, maxLife: 0.6, gravity: false,
            });
          }
        }
        break;
      }
    }
  }


  // =====================================================================
  // AI SYSTEM
  // =====================================================================

  private _updateAI(p: MWPlayer, dt: number, mapDef: MapDef): void {
    const ai = p.aiState;

    if (p.vehicleId) {
      this._updateAIVehicle(p, dt, mapDef);
      return;
    }

    if (ai.reactionTimer > 0) {
      ai.reactionTimer -= dt;
      return;
    }

    ai.reactionTimer = MW.AI_REACTION_TIME * (0.7 + Math.random() * 0.6);
    ai.targetId = this._findAITarget(p);

    ai.repositionTimer -= dt;
    if (ai.repositionTimer <= 0) {
      ai.repositionTimer = MW.AI_REPOSITION_TIME * (0.5 + Math.random());
      ai.strafeDir = Math.random() > 0.5 ? 1 : -1;
      // Occasionally jump while repositioning
      if (Math.random() < 0.1 && p.grounded) {
        p.vy = MW.JUMP_VELOCITY;
        p.grounded = false;
      }
    }

    // Retreat towards spawn when low HP
    if (p.hp < p.maxHp * 0.3 && !ai.targetId) {
      const spawnDist = mapDef.spawnDistance / 2;
      const baseX = p.team === 0 ? -spawnDist : spawnDist;
      ai.wanderTarget = { x: baseX + (Math.random() - 0.5) * 5, z: (Math.random() - 0.5) * 10 };
    }

    if (!ai.targetId && Math.random() < 0.002) {
      const nearVeh = this._findNearbyVehicle(p);
      if (nearVeh) {
        this._enterVehicle(p, nearVeh);
        return;
      }
    }

    if (ai.targetId) {
      const target = this._players.find(t => t.id === ai.targetId);
      if (!target || !target.alive) {
        ai.targetId = null;
        return;
      }

      const d = dist3(p.x, p.y, p.z, target.x, target.y, target.z);

      const toX = target.x - p.x;
      const toZ = target.z - p.z;
      const toY = (target.y + MW.PLAYER_HEIGHT * 0.5) - (p.y + MW.EYE_HEIGHT);
      const horizDist = Math.sqrt(toX * toX + toZ * toZ);
      const desiredYaw = Math.atan2(-toX, -toZ);
      const desiredPitch = Math.atan2(toY, horizDist);

      // Difficulty variation: find AI index
      const aiIndex = this._players.filter(pp => pp.isAI).indexOf(p);
      const allies = this._players.filter(pp => pp.isAI && pp.team === p.team);
      const allyIndex = allies.indexOf(p);
      let aimError = MW.AI_AIM_ERROR;
      // First 2 allies have lower aim error (better)
      if (p.team === 0 && allyIndex < 2) aimError *= 0.7;
      // Last 2 enemies have higher aim error (worse)
      const enemies = this._players.filter(pp => pp.isAI && pp.team === 1);
      const enemyIndex = enemies.indexOf(p);
      if (p.team === 1 && enemyIndex >= enemies.length - 2) aimError *= 1.4;
      void aiIndex; // suppress unused
      p.yaw = lerp(p.yaw, desiredYaw + (Math.random() - 0.5) * aimError, dt * 8);
      p.pitch = lerp(p.pitch, desiredPitch + (Math.random() - 0.5) * aimError, dt * 8);

      if (d > MW.AI_FIRE_RANGE * 0.8) {
        const sinY = Math.sin(p.yaw);
        const cosY = Math.cos(p.yaw);
        p.vx = -sinY * p.speed * MW.MOVE_SPEED;
        p.vz = -cosY * p.speed * MW.MOVE_SPEED;
      } else if (d > 10) {
        const sinY = Math.sin(p.yaw);
        const cosY = Math.cos(p.yaw);
        p.vx = cosY * ai.strafeDir * p.speed * MW.MOVE_SPEED * 0.6;
        p.vz = -sinY * ai.strafeDir * p.speed * MW.MOVE_SPEED * 0.6;
      } else {
        const sinY = Math.sin(p.yaw);
        const cosY = Math.cos(p.yaw);
        p.vx = sinY * p.speed * MW.MOVE_SPEED * 0.5;
        p.vz = cosY * p.speed * MW.MOVE_SPEED * 0.5;
      }

      // AI: switch wand when out of ammo instead of just reloading
      if (p.ammo[p.activeWandSlot] <= 0) {
        // Try switching to secondary, then heavy, then reload
        if (p.activeWandSlot === 0 && p.ammo[1] > 0) {
          p.activeWandSlot = 1;
        } else if (p.activeWandSlot === 1 && p.ammo[0] > 0) {
          p.activeWandSlot = 0;
        } else {
          this._startReload(p, p.activeWandSlot);
        }
      }

      // AI: use heavy wand against vehicles
      if (target.vehicleId) {
        if (p.ammo[2] > 0) p.activeWandSlot = 2;
      } else if (p.activeWandSlot === 2 && !target.vehicleId) {
        p.activeWandSlot = 0;
      }

      if (d < MW.AI_FIRE_RANGE) {
        const angleDiff = Math.abs(p.yaw - desiredYaw);
        if (angleDiff < 0.3 || angleDiff > Math.PI * 2 - 0.3) {
          // Break spawn protection on fire
          if (p.spawnProtection > 0) {
            p.spawnProtection = 0;
            if (p.spawnProtectionMesh) {
              this._scene.remove(p.spawnProtectionMesh);
              p.spawnProtectionMesh.geometry.dispose();
              (p.spawnProtectionMesh.material as THREE.Material).dispose();
              p.spawnProtectionMesh = null;
            }
          }
          const wand = this._getPlayerActiveWand(p);
          if (p.ammo[p.activeWandSlot] > 0 && p.mana >= wand.magicCost) {
            this._fireWand(p, wand, mapDef);
          } else if (p.ammo[p.activeWandSlot] <= 0) {
            this._startReload(p, p.activeWandSlot);
          }
        }
      }

      if (p.abilityCooldown <= 0 && Math.random() < 0.01) {
        this._useAbility(p, mapDef);
      }

    } else {
      // Smart wander: seek enemies, objectives, or strategic positions
      let goalX = 0;
      let goalZ = 0;
      let hasGoal = false;

      // In royale, move toward storm center to stay alive
      if (this._isRoyaleMode && this._royaleState) {
        goalX = this._royaleState.stormCenterX;
        goalZ = this._royaleState.stormCenterZ;
        hasGoal = true;
      }

      // Try to find any enemy within extended range
      if (!hasGoal) {
        let bestDist = MW.AI_FIRE_RANGE * 3;
        for (const other of this._players) {
          if (!other.alive || other.team === p.team) continue;
          const d = dist2(p.x, p.z, other.x, other.z);
          if (d < bestDist) {
            bestDist = d;
            goalX = other.x;
            goalZ = other.z;
            hasGoal = true;
          }
        }
      }

      // Friendly AI: stay near the human player
      if (!hasGoal && p.team === 0 && p.isAI) {
        const human = this._players.find(pl => !pl.isAI && pl.alive);
        if (human) {
          const d = dist2(p.x, p.z, human.x, human.z);
          if (d > 15) {
            goalX = human.x + (Math.random() - 0.5) * 10;
            goalZ = human.z + (Math.random() - 0.5) * 10;
            hasGoal = true;
          }
        }
      }

      // Default: move toward map center where action concentrates
      if (!hasGoal) {
        if (!ai.wanderTarget || dist2(p.x, p.z, ai.wanderTarget.x, ai.wanderTarget.z) < 3) {
          ai.wanderTarget = {
            x: (Math.random() - 0.5) * 40,
            z: (Math.random() - 0.5) * 40,
          };
        }
        goalX = ai.wanderTarget.x;
        goalZ = ai.wanderTarget.z;
      }

      const toX = goalX - p.x;
      const toZ = goalZ - p.z;
      const desiredYaw = Math.atan2(-toX, -toZ);
      p.yaw = lerp(p.yaw, desiredYaw, dt * 4);

      const sinY = Math.sin(p.yaw);
      const cosY = Math.cos(p.yaw);
      p.vx = -sinY * p.speed * MW.MOVE_SPEED * 0.85;
      p.vz = -cosY * p.speed * MW.MOVE_SPEED * 0.85;
    }
  }

  private _updateAIVehicle(p: MWPlayer, dt: number, mapDef: MapDef): void {
    const veh = this._vehicles.find(v => v.id === p.vehicleId);
    if (!veh || !veh.alive) { p.vehicleId = null; return; }

    if (veh.driverId !== p.id) return;

    const def = getVehicleDef(veh.defId);

    const target = this._findNearestEnemy(p);
    if (target) {
      const toX = target.x - veh.x;
      const toZ = target.z - veh.z;
      const desiredYaw = Math.atan2(-toX, -toZ);
      veh.yaw = lerp(veh.yaw, desiredYaw, dt * def.turnSpeed * 0.5);

      const d = dist3(veh.x, veh.y, veh.z, target.x, target.y, target.z);
      veh.speed = lerp(veh.speed, d > 20 ? def.speed : def.speed * 0.3, dt * 2);

      if (d < def.weaponRange && veh.fireTimer <= 0) {
        const angleDiff = Math.abs(veh.yaw - desiredYaw);
        if (angleDiff < 0.4 || angleDiff > Math.PI * 2 - 0.4) {
          this._fireVehicleWeapon(veh, p, mapDef);
          veh.fireTimer = 1 / def.weaponFireRate;
        }
      }
      // AI also fires secondary at close range
      if (d < def.secondaryRange && veh.secondaryFireTimer <= 0) {
        const angleDiff = Math.abs(veh.yaw - desiredYaw);
        if (angleDiff < 0.5 || angleDiff > Math.PI * 2 - 0.5) {
          this._fireVehicleSecondary(veh, p, mapDef);
          veh.secondaryFireTimer = 1 / def.secondaryFireRate;
        }
      }
    } else {
      veh.speed = lerp(veh.speed, 0, dt * 3);
    }

    if (Math.random() < 0.001) {
      this._exitVehicle(p, veh, mapDef);
    }
  }

  private _findAITarget(p: MWPlayer): string | null {
    let best: MWPlayer | null = null;
    let bestScore = -Infinity;

    for (const t of this._players) {
      if (!t.alive || t.id === p.id || t.invisible) continue;
      // In non-royale mode, skip same-team targets
      if (!this._isRoyaleMode && t.team === p.team) continue;
      const d = dist3(p.x, p.y, p.z, t.x, t.y, t.z);
      if (d > MW.AI_FIRE_RANGE * 2) continue;
      const toX = t.x - p.x;
      const toZ = t.z - p.z;
      const len = Math.sqrt(toX * toX + toZ * toZ);
      if (len < 0.1) continue;
      const facingX = -Math.sin(p.yaw);
      const facingZ = -Math.cos(p.yaw);
      const dot = (toX / len) * facingX + (toZ / len) * facingZ;
      if (dot > -0.2) {
        // Prioritize low-HP enemies and closer ones
        const hpFraction = t.hp / t.maxHp;
        const score = (1 - d / (MW.AI_FIRE_RANGE * 2)) * 50 + (1 - hpFraction) * 30;
        if (score > bestScore) {
          bestScore = score;
          best = t;
        }
      }
    }
    return best ? best.id : null;
  }

  private _findNearestEnemy(p: MWPlayer): MWPlayer | null {
    let best: MWPlayer | null = null;
    let bestDist = Infinity;
    for (const t of this._players) {
      if (!t.alive || t.team === p.team) continue;
      const d = dist3(p.x, p.y, p.z, t.x, t.y, t.z);
      if (d < bestDist) { bestDist = d; best = t; }
    }
    return best;
  }

  private _findNearbyVehicle(p: MWPlayer): MWVehicle | null {
    for (const v of this._vehicles) {
      if (!v.alive) continue;
      if (v.team !== -1 && v.team !== p.team) continue;
      if (v.driverId) continue;
      const d = dist3(p.x, p.y, p.z, v.x, v.y, v.z);
      if (d < MW.AI_VEHICLE_ENTER_DIST * 3) return v;
    }
    return null;
  }


  // =====================================================================
  // RENDERING
  // =====================================================================

  private _renderFrame(dt: number): void {
    const human = this._getHumanPlayer();
    if (!human) {
      this._renderer.render(this._scene, this._camera);
      return;
    }

    // FPS camera
    const eyeH = human.crouching ? MW.CROUCH_EYE_HEIGHT : MW.EYE_HEIGHT;
    let camX = human.x;
    let camY = human.y + eyeH;
    let camZ = human.z;

    if (human.vehicleId) {
      const veh = this._vehicles.find(v => v.id === human.vehicleId);
      if (veh) {
        const def = getVehicleDef(veh.defId);
        // Offset camera forward along vehicle facing so target is more visible
        const fwdOff = def.scaleZ * 0.35;
        camX = veh.x - Math.sin(veh.yaw) * fwdOff;
        camY = veh.y + def.scaleY * 1.1;
        camZ = veh.z - Math.cos(veh.yaw) * fwdOff;
      }
    }

    this._camera.position.set(camX, camY, camZ);

    // ADS zoom
    const targetFov = this._mouseRightDown ? MW.ADS_FOV : MW.DEFAULT_FOV;
    if (Math.abs(this._camera.fov - targetFov) > 0.5) {
      this._camera.fov = lerp(this._camera.fov, targetFov, dt * 12);
      this._camera.updateProjectionMatrix();
    }

    // Look direction
    const lookX = camX - Math.sin(human.yaw) * Math.cos(human.pitch);
    const lookY = camY + Math.sin(human.pitch);
    const lookZ = camZ - Math.cos(human.yaw) * Math.cos(human.pitch);
    this._camera.lookAt(lookX, lookY, lookZ);

    // Update first-person wand
    this._updateFPWand(human, dt);

    // Update player meshes
    for (const p of this._players) {
      if (!p.alive) continue;
      if (p.id === "player_0") {
        if (p.mesh) p.mesh.visible = false;
        continue;
      }
      if (p.vehicleId) continue;
      if (p.invisible) {
        if (p.mesh) {
          if (p.team === human.team) {
            p.mesh.visible = true;
            p.mesh.traverse(c => {
              if ((c as THREE.Mesh).material) {
                const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
                if (m.opacity !== undefined) { m.transparent = true; m.opacity = 0.3; }
              }
            });
          } else {
            p.mesh.visible = false;
          }
        }
        continue;
      }

      if (p.mesh) {
        p.mesh.visible = true;
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.rotation.y = p.yaw;
        p.mesh.traverse(c => {
          if ((c as THREE.Mesh).material) {
            const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (m.opacity !== undefined) { m.transparent = false; m.opacity = 1; }
          }
        });
        // --- Idle Animations ---
        this._animatePlayerMesh(p, dt);
      }
      if (p.nameTag) {
        p.nameTag.position.set(p.x, p.y + MW.PLAYER_HEIGHT + 0.5, p.z);
      }

      // Update player light
      const pl = this._playerLights.get(p.id);
      if (pl) pl.position.set(p.x, p.y + 1, p.z);

      // Update shield mesh position
      const sm = this._shieldMeshes.get(p.id);
      if (sm) sm.position.set(p.x, p.y + MW.PLAYER_HEIGHT * 0.5, p.z);

      // Update frozen light
      const fl = this._frozenLights.get("frozen_" + p.id);
      if (fl) fl.position.set(p.x, p.y + 1, p.z);
      const sl = this._frozenLights.get("shield_" + p.id);
      if (sl) sl.position.set(p.x, p.y + 1, p.z);

      // Update spawn protection mesh
      if (p.spawnProtectionMesh) {
        p.spawnProtectionMesh.position.set(p.x, p.y + MW.PLAYER_HEIGHT * 0.5, p.z);
        const spOpacity = clamp(p.spawnProtection / MW.SPAWN_PROTECTION_TIME, 0, 1) * 0.25;
        (p.spawnProtectionMesh.material as THREE.MeshBasicMaterial).opacity = spOpacity;
      }
    }

    // Update vehicle meshes
    for (const v of this._vehicles) {
      if (!v.alive || !v.mesh) continue;
      v.mesh.position.set(v.x, v.y, v.z);
      v.mesh.rotation.y = v.yaw;

      // Wing flap animation for air vehicles
      const def = getVehicleDef(v.defId);
      if (def.type === "air_hover" || def.type === "air_fly") {
        const flapAngle = Math.sin(this._gameTime * 3) * 0.15;
        v.mesh.traverse(c => {
          if (c.name === "leftWing") c.rotation.z = -0.25 + flapAngle;
          if (c.name === "rightWing") c.rotation.z = 0.25 - flapAngle;
        });
      }
      // Elephant ear flap
      if (v.defId === "war_elephant") {
        const earAngle = Math.sin(this._gameTime * 2) * 0.08;
        v.mesh.traverse(c => {
          if (c.name === "leftEar") c.rotation.y = -0.1 + earAngle;
          if (c.name === "rightEar") c.rotation.y = 0.1 - earAngle;
        });
      }
    }

    // Update particles
    this._updateParticles(dt);

    // Update muzzle flashes
    this._updateMuzzleFlashes(dt);

    // Update temp VFX
    this._updateTempVFX(dt);

    // Update ambient particles
    this._updateAmbientParticles(dt);

    // Animate environmental animals
    this._animateEnvironmentAnimals(dt);

    // Capture point beam pulsing
    for (const cp of this._capturePoints) {
      if (cp.beamMesh) {
        const pulse = 0.06 + Math.sin(this._gameTime * 2) * 0.02;
        (cp.beamMesh.material as THREE.MeshBasicMaterial).opacity = cp.owner >= 0 ? pulse * 2 : pulse;
      }
      if (cp.ringMesh) {
        const pulse = 0.4 + Math.sin(this._gameTime * 3) * 0.1;
        (cp.ringMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
      }
    }

    // Water wave animation with vertex displacement
    if (this._waterMesh) {
      const mapDef = getMapDef(this._mapId);
      this._waterMesh.position.y = mapDef.waterLevel + Math.sin(Date.now() * 0.0008) * 0.08;

      const waterGeo = this._waterMesh.geometry as THREE.PlaneGeometry;
      const posAttr = waterGeo.attributes.position;
      if (posAttr && posAttr.count > 100) {
        const t = Date.now() * 0.001;
        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i);
          const y = posAttr.getY(i);
          const wave = Math.sin(x * 0.08 + t * 1.5) * 0.15 +
                       Math.cos(y * 0.06 + t * 1.2) * 0.1 +
                       Math.sin((x + y) * 0.05 + t * 0.8) * 0.08;
          posAttr.setZ(i, wave);
        }
        posAttr.needsUpdate = true;
        waterGeo.computeVertexNormals();
      }
    }

    this._renderer.render(this._scene, this._camera);
  }

  private _updateFPWand(human: MWPlayer, dt: number): void {
    if (!this._fpWand) return;

    // Show/hide based on vehicle
    this._fpWand.visible = !human.vehicleId && human.alive;
    if (!this._fpWand.visible) return;

    // Reload state
    const isReloading = human.reloading[human.activeWandSlot];
    const wandDef = this._getPlayerActiveWand(human);
    const reloadFrac = isReloading ? clamp(1 - human.reloadTimer[human.activeWandSlot] / wandDef.reloadTime, 0, 1) : 0;

    // Update tip color - dim during reload
    if (this._fpWandTipMesh) {
      if (isReloading) {
        // Pulsing dim glow during reload
        const pulse = 0.2 + Math.sin(this._gameTime * 8) * 0.15;
        (this._fpWandTipMesh.material as THREE.MeshBasicMaterial).color.setHex(0x444444);
        (this._fpWandTipMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
        (this._fpWandTipMesh.material as THREE.MeshBasicMaterial).transparent = true;
      } else {
        (this._fpWandTipMesh.material as THREE.MeshBasicMaterial).color.setHex(wandDef.projectileColor);
        (this._fpWandTipMesh.material as THREE.MeshBasicMaterial).opacity = 1;
        (this._fpWandTipMesh.material as THREE.MeshBasicMaterial).transparent = false;
      }
    }

    // Movement bob
    const moving = Math.abs(human.vx) > 0.5 || Math.abs(human.vz) > 0.5;
    if (moving && human.grounded) {
      this._fpWandBob += dt * 8;
    } else {
      this._fpWandBob *= 0.9;
    }
    const bobY = Math.sin(this._fpWandBob) * 0.01;
    const bobX = Math.cos(this._fpWandBob * 0.5) * 0.005;

    // Strafe tilt
    const strafeDir = this._keys["KeyA"] ? 1 : this._keys["KeyD"] ? -1 : 0;
    const strafeTilt = strafeDir * 0.03;

    // Recoil
    this._fpWandRecoil = lerp(this._fpWandRecoil, 0, dt * 12);

    // Reload animation: wand tilts down then back up, with a spin
    let reloadOffsetY = 0;
    let reloadTilt = 0;
    let reloadSpin = 0;
    if (isReloading) {
      // Phase 1 (0-0.4): tilt wand down
      // Phase 2 (0.4-0.8): spin while charging
      // Phase 3 (0.8-1.0): snap back up
      if (reloadFrac < 0.4) {
        const t = reloadFrac / 0.4;
        reloadOffsetY = -0.08 * t;
        reloadTilt = 0.6 * t;
      } else if (reloadFrac < 0.8) {
        const t = (reloadFrac - 0.4) / 0.4;
        reloadOffsetY = -0.08;
        reloadTilt = 0.6;
        reloadSpin = t * Math.PI * 2;
      } else {
        const t = (reloadFrac - 0.8) / 0.2;
        reloadOffsetY = -0.08 * (1 - t);
        reloadTilt = 0.6 * (1 - t);
        reloadSpin = Math.PI * 2;
      }
    }

    this._fpWand.position.set(
      0.3 + bobX + strafeTilt,
      -0.25 + bobY - this._fpWandRecoil * 0.3 + reloadOffsetY,
      -0.5 + this._fpWandRecoil * 0.15
    );
    this._fpWand.rotation.set(
      0.1 - this._fpWandRecoil * 0.5 + reloadTilt,
      strafeTilt * 2 + reloadSpin,
      -0.1
    );
  }

  private _animatePlayerMesh(p: MWPlayer, _dt: number): void {
    if (!p.mesh) return;
    const t = this._gameTime;
    const idlePhase = p.mesh.userData.idleTime || 0;
    const phase = t * 1.5 + idlePhase;
    const cls = getClassDef(p.classId);

    // Breathing: subtle torso scale oscillation
    const breathe = Math.sin(phase) * 0.015;
    p.mesh.traverse(c => {
      // Cloak sway
      if (c.name === "cloak" || c.name === "cloakFringe") {
        c.rotation.x = Math.sin(phase * 0.7) * 0.04;
        c.rotation.z = Math.sin(phase * 0.5 + 1) * 0.02;
      }
      // Leg sway (very subtle idle)
      if (c.name === "leftLeg") {
        c.rotation.x = Math.sin(phase * 0.8) * 0.03;
      }
      if (c.name === "rightLeg") {
        c.rotation.x = -Math.sin(phase * 0.8) * 0.03;
      }
      // Arm sway
      if (c.name === "leftUpperArm") {
        c.rotation.x = Math.sin(phase * 0.6 + 0.5) * 0.04;
      }
      if (c.name === "leftForeArm") {
        c.rotation.x = -0.3 + Math.sin(phase * 0.7) * 0.03;
      }
      if (c.name === "rightUpperArm") {
        c.rotation.x = -0.3 + Math.sin(phase * 0.6 + 1.5) * 0.03;
      }
      // Wand sway
      if (c.name === "wandGroup") {
        c.rotation.z = Math.sin(phase * 0.8 + 2) * 0.03;
        c.rotation.y = Math.sin(phase * 0.5) * 0.02;
      }
      // Wand tip pulse
      if (c.name === "wandTip") {
        const pulse = 0.7 + Math.sin(phase * 2) * 0.3;
        c.scale.setScalar(pulse);
      }
      if (c.name === "wandTipRing") {
        c.rotation.z = t * 2;
      }
      // Team ring pulse
      if (c.name === "teamRing") {
        const ringPulse = 0.4 + Math.sin(phase * 1.5) * 0.15;
        ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = ringPulse;
      }
      // Shoulder bob
      if (c.name === "leftShoulder") {
        c.position.y = 1.35 + breathe;
      }
      if (c.name === "rightShoulder") {
        c.position.y = 1.35 + breathe;
      }
    });

    // Class-specific idle animations
    if (cls.id === "pyromancer") {
      p.mesh.traverse(c => {
        if (c.name.startsWith("pyroEmber_")) {
          const i = parseInt(c.name.split("_")[1]);
          const angle = t * 2.5 + i * (Math.PI * 2 / 4);
          const radius = 0.4 + Math.sin(t * 1.5 + i) * 0.1;
          c.position.set(Math.cos(angle) * radius, 1.0 + Math.sin(t * 3 + i * 2) * 0.2, Math.sin(angle) * radius);
        }
      });
    }
    if (cls.id === "cryomancer") {
      p.mesh.traverse(c => {
        if (c.name.startsWith("cryoCrystal_")) {
          const i = parseInt(c.name.split("_")[1]);
          const angle = t * 1.5 + i * (Math.PI * 2 / 3);
          c.position.set(Math.cos(angle) * 0.35, 1.3 + Math.sin(t * 2 + i) * 0.15, Math.sin(angle) * 0.35);
          c.rotation.x = t * 2;
          c.rotation.y = t * 1.5;
        }
      });
    }
    if (cls.id === "stormcaller") {
      p.mesh.traverse(c => {
        if (c.name.startsWith("stormSpark_")) {
          const i = parseInt(c.name.split("_")[1]);
          // Sparks jump to random positions periodically
          const jumpPhase = Math.floor(t * 4 + i * 1.3);
          const sparkRng = seededRandom(jumpPhase * 7 + i * 13);
          c.position.set((sparkRng() - 0.5) * 0.8, 0.5 + sparkRng() * 1.0, (sparkRng() - 0.5) * 0.8);
          const vis = Math.sin(t * 8 + i * 4) > 0.3;
          c.visible = vis;
        }
      });
    }
    if (cls.id === "shadowmancer") {
      p.mesh.traverse(c => {
        if (c.name.startsWith("shadowMist_")) {
          const i = parseInt(c.name.split("_")[1]);
          const angle = t * 0.5 + i * (Math.PI * 2 / 5);
          c.position.set(Math.cos(angle) * 0.35, 0.1 + Math.sin(t + i) * 0.08, Math.sin(angle) * 0.35);
          ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(t * 2 + i) * 0.1;
        }
      });
    }
    if (cls.id === "druid") {
      p.mesh.traverse(c => {
        if (c.name.startsWith("druidLeaf_")) {
          const i = parseInt(c.name.split("_")[1]);
          const angle = t * 1.2 + i * (Math.PI * 2 / 3);
          c.position.set(Math.cos(angle) * 0.5, 1.5 + Math.sin(t * 2 + i * 2) * 0.3, Math.sin(angle) * 0.5);
          c.rotation.y = t * 3;
          c.rotation.x = Math.sin(t * 2 + i) * 0.5;
        }
      });
    }
    if (cls.id === "warlock") {
      p.mesh.traverse(c => {
        if (c.name.startsWith("warlockOrb_")) {
          const i = parseInt(c.name.split("_")[1]);
          const angle = t * 1.8 + i * (Math.PI * 2 / 3);
          const radius = 0.4;
          c.position.set(Math.cos(angle) * radius, 0.9 + Math.sin(t * 2.5 + i) * 0.2, Math.sin(angle) * radius);
        }
      });
    }
    if (cls.id === "archmage") {
      p.mesh.traverse(c => {
        if (c.name.startsWith("archmageRing_")) {
          const i = parseInt(c.name.split("_")[1]);
          c.rotation.z = t * (1.5 + i * 0.5);
          c.rotation.x = Math.PI / 2 + Math.sin(t * 0.5 + i) * 0.2;
          c.position.y = 1.0 + Math.sin(t * 0.8 + i * 2) * 0.1;
        }
      });
    }
  }

  private _updateParticles(dt: number): void {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.gravity) {
        p.vy += MW.GRAVITY * 0.5 * dt;
      }
      p.life -= dt;
      const frac = clamp(p.life / p.maxLife, 0, 1);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = frac;
      if (p.life <= 0) {
        this._scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this._particles.splice(i, 1);
      }
    }
  }

  private _updateMuzzleFlashes(dt: number): void {
    for (let i = this._muzzleFlashes.length - 1; i >= 0; i--) {
      const mf = this._muzzleFlashes[i];
      mf.timer -= dt;
      const frac = clamp(mf.timer / mf.maxTime, 0, 1);
      mf.mesh.scale.setScalar(1 + (1 - frac) * 2);
      (mf.mesh.material as THREE.MeshBasicMaterial).opacity = frac * 0.8;
      if (mf.timer <= 0) {
        this._scene.remove(mf.mesh);
        mf.mesh.geometry.dispose();
        (mf.mesh.material as THREE.Material).dispose();
        this._muzzleFlashes.splice(i, 1);
      }
    }
  }

  private _updateTempVFX(dt: number): void {
    for (let i = this._tempVFX.length - 1; i >= 0; i--) {
      const vfx = this._tempVFX[i];
      vfx.timer -= dt;
      // For expanding spheres
      if ((vfx.mesh as THREE.Mesh).material) {
        const mat = (vfx.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat.opacity !== undefined) {
          mat.opacity = clamp(vfx.timer * 2, 0, 0.8);
        }
        const s = 1 + (1 - clamp(vfx.timer * 2, 0, 1)) * 4;
        vfx.mesh.scale.setScalar(s);
      }
      if (vfx.timer <= 0) {
        this._scene.remove(vfx.mesh);
        if ((vfx.mesh as THREE.Mesh).geometry) (vfx.mesh as THREE.Mesh).geometry.dispose();
        if ((vfx.mesh as THREE.Mesh).material) {
          const mat = (vfx.mesh as THREE.Mesh).material;
          if (mat) {
            if (Array.isArray(mat)) mat.forEach(m => m.dispose());
            else (mat as THREE.Material).dispose();
          }
        }
        this._tempVFX.splice(i, 1);
      }
    }
  }

  private _animateEnvironmentAnimals(_dt: number): void {
    if (!this._propGroup) return;
    const t = this._gameTime;
    this._propGroup.traverse(c => {
      if (!c.name.startsWith("animal_")) return;
      const ud = c.userData;
      const type = ud.animalType;
      const phase = ud.phase || 0;
      const bx = ud.baseX || 0;
      const by = ud.baseY || 0;
      const bz = ud.baseZ || 0;

      if (type === "bird") {
        // Circular flight pattern
        const radius = 8 + Math.sin(phase) * 3;
        c.position.x = bx + Math.cos(t * 0.3 + phase) * radius;
        c.position.y = by + Math.sin(t * 0.5 + phase) * 2;
        c.position.z = bz + Math.sin(t * 0.3 + phase) * radius;
        c.rotation.y = t * 0.3 + phase + Math.PI / 2;
        // Wing flap
        c.traverse(ch => {
          if (ch.name === "birdLeftWing") ch.rotation.z = Math.sin(t * 8 + phase) * 0.5;
          if (ch.name === "birdRightWing") ch.rotation.z = -Math.sin(t * 8 + phase) * 0.5;
        });
      } else if (type === "deer") {
        // Slow wandering
        c.position.x = bx + Math.sin(t * 0.1 + phase) * 3;
        c.position.z = bz + Math.cos(t * 0.08 + phase) * 3;
        c.rotation.y = Math.atan2(Math.cos(t * 0.1 + phase), -Math.sin(t * 0.08 + phase));
      } else if (type === "wolf") {
        // Patrol pattern
        c.position.x = bx + Math.sin(t * 0.15 + phase) * 5;
        c.position.z = bz + Math.cos(t * 0.12 + phase) * 5;
        c.rotation.y = Math.atan2(Math.cos(t * 0.15 + phase), -Math.sin(t * 0.12 + phase));
      } else if (type === "butterfly") {
        // Erratic fluttering
        c.position.x = bx + Math.sin(t * 0.6 + phase) * 2 + Math.sin(t * 1.5 + phase * 2) * 0.5;
        c.position.y = by + Math.sin(t * 0.8 + phase) * 0.5;
        c.position.z = bz + Math.cos(t * 0.5 + phase) * 2 + Math.cos(t * 1.3 + phase * 3) * 0.5;
        c.traverse(ch => {
          if (ch.name === "bfLeftWing") ch.rotation.y = -0.5 + Math.sin(t * 12 + phase) * 0.8;
          if (ch.name === "bfRightWing") ch.rotation.y = 0.5 - Math.sin(t * 12 + phase) * 0.8;
        });
      } else if (type === "bat") {
        // Swooping flight
        const batRadius = 5 + Math.sin(phase * 3) * 2;
        c.position.x = bx + Math.cos(t * 0.5 + phase) * batRadius;
        c.position.y = by + Math.sin(t * 0.8 + phase) * 2;
        c.position.z = bz + Math.sin(t * 0.5 + phase) * batRadius;
        c.rotation.y = t * 0.5 + phase + Math.PI / 2;
        c.traverse(ch => {
          if (ch.name === "batLeftWing") ch.rotation.z = Math.sin(t * 10 + phase) * 0.6;
          if (ch.name === "batRightWing") ch.rotation.z = -Math.sin(t * 10 + phase) * 0.6;
        });
      } else if (type === "crab") {
        // Sideways scuttle
        c.position.x = bx + Math.sin(t * 0.3 + phase) * 1.5;
        c.position.z = bz + Math.cos(t * 0.2 + phase) * 1.5;
      } else if (type === "firefly") {
        // Gentle drifting with glow pulsing
        c.position.x = bx + Math.sin(t * 0.4 + phase) * 2;
        c.position.y = by + Math.sin(t * 0.6 + phase * 2) * 0.5;
        c.position.z = bz + Math.cos(t * 0.3 + phase) * 2;
      } else if (type === "fish") {
        // Swimming in circles
        c.position.x = bx + Math.cos(t * 0.4 + phase) * 2;
        c.position.z = bz + Math.sin(t * 0.4 + phase) * 2;
        c.rotation.y = t * 0.4 + phase + Math.PI / 2;
      }
    });
  }

  private _updateAmbientParticles(dt: number): void {
    for (const ap of this._ambientParticles) {
      ap.mesh.position.x += ap.vx * dt;
      ap.mesh.position.y += ap.vy * dt + Math.sin(this._gameTime * 2 + ap.mesh.position.x) * 0.002;
      ap.mesh.position.z += ap.vz * dt;

      // Gentle drifting - change direction slowly
      ap.vx += (Math.random() - 0.5) * dt * 0.2;
      ap.vz += (Math.random() - 0.5) * dt * 0.2;
      ap.vx = clamp(ap.vx, -0.5, 0.5);
      ap.vz = clamp(ap.vz, -0.5, 0.5);

      // Pulsing glow
      const pulse = 0.5 + Math.sin(this._gameTime * 3 + ap.mesh.position.z * 0.5) * 0.3;
      (ap.mesh.material as THREE.MeshBasicMaterial).opacity = pulse;
      (ap.mesh.material as THREE.MeshBasicMaterial).transparent = true;
    }
  }

  // =====================================================================
  // SPELL CRAFTING – combine runes to create spells
  // =====================================================================

  private _craftPlayerSpell(p: MWPlayer, rune1: RuneElement, rune2: RuneElement): void {
    const result = craftSpell(rune1, rune2);
    if (result.success && result.spell) {
      p.runeInventory.craftedSpellId = result.spell.id;
      p.runeInventory.rune1 = null;
      p.runeInventory.rune2 = null;
      // Add to crafted spell slots (max 4)
      if (p.craftedSpellSlots.length < DUEL_MAX_SPELL_SLOTS) {
        p.craftedSpellSlots.push(result.spell.id);
      } else {
        // Replace the currently selected slot
        p.craftedSpellSlots[p.selectedCraftedSpellSlot] = result.spell.id;
      }
      if (p.id === "player_0") {
        this._centerNotification = { text: result.message, color: "#daa520", timer: 2.0, size: 24 };
      }
    }
  }

  private _fireCraftedSpell(p: MWPlayer, spellId: string, _mapDef: MapDef): void {
    const spell = getCraftedSpellDef(spellId);
    if (!spell) return;
    if (p.mana < spell.manaCost) return;
    if (p.craftedSpellCooldown > 0) return;

    p.mana -= spell.manaCost;
    p.craftedSpellCooldown = spell.cooldown;

    // Create projectile
    const cos = Math.cos(p.yaw);
    const sin = Math.sin(p.yaw);
    const cosP = Math.cos(p.pitch);
    const sinP = Math.sin(p.pitch);
    const dx = -sin * cosP;
    const dy = -sinP;
    const dz = -cos * cosP;

    const proj: MWProjectile = {
      id: `cs_${Date.now()}_${Math.random()}`,
      ownerId: p.id,
      team: p.team,
      x: p.x + dx * 0.8, y: p.y + MW.EYE_HEIGHT + dy * 0.8, z: p.z + dz * 0.8,
      dx, dy, dz,
      speed: spell.projectileSpeed,
      damage: spell.damage * (1 - (this._players.find(t => t.id !== p.id)?.armor || 0) / 100),
      splashRadius: spell.splashRadius,
      range: spell.range,
      traveled: 0,
      color: spell.projectileColor,
      size: spell.projectileSize,
      mesh: null,
      fromVehicle: false,
    };

    // Create mesh
    const geo = new THREE.SphereGeometry(spell.projectileSize, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: spell.projectileColor });
    proj.mesh = new THREE.Mesh(geo, mat);
    proj.mesh.position.set(proj.x, proj.y, proj.z);
    this._scene.add(proj.mesh);
    this._projectiles.push(proj);

    // VFX: muzzle flash
    const flashGeo = new THREE.SphereGeometry(spell.projectileSize * 2, 4, 4);
    const flashMat = new THREE.MeshBasicMaterial({ color: spell.projectileColor, transparent: true, opacity: 0.8 });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.set(proj.x, proj.y, proj.z);
    this._scene.add(flash);
    this._muzzleFlashes.push({ mesh: flash, timer: 0.1, maxTime: 0.1 });

    if (p.id === "player_0") this._hitMarkerTimer = 0;
  }

  private _applyCraftedSpellHit(spell: CraftedSpellDef, shooter: MWPlayer, target: MWPlayer): void {
    const dx = target.x - shooter.x;
    const dy = target.y - shooter.y;
    const dz = target.z - shooter.z;
    const hit = computeSpellHit(spell, target.armor, dx, dy, dz);

    target.hp -= hit.damageDealt;
    if (hit.healCaster > 0) {
      shooter.hp = Math.min(shooter.maxHp, shooter.hp + hit.healCaster);
    }
    if (hit.knockbackX !== 0 || hit.knockbackZ !== 0) {
      target.vx += hit.knockbackX;
      target.vy += hit.knockbackY;
      target.vz += hit.knockbackZ;
    }
    if (hit.applyFreeze) { target.frozen = true; target.frozenTimer = hit.freezeDuration; }
    if (hit.applyStun) { target.stunned = true; target.stunTimer = hit.stunDuration; }
    if (hit.applySlow) { target.slowed = true; target.slowFactor = hit.slowFactor; target.slowTimer = hit.slowDuration; }
    if (hit.applyBlind) { target.blinded = true; target.blindTimer = hit.blindDuration; }
    if (hit.applyDot) { target.dotActive = true; target.dotDamage = hit.dotDamage; target.dotTimer = hit.dotDuration; target.dotOwnerId = shooter.id; }

    if (target.hp <= 0) this._killPlayer(target, shooter.id, spell.name);
    if (target.id === "player_0") this._damageVignetteTimer = 0.5;
    if (shooter.id === "player_0") this._hitMarkerTimer = 0.15;
  }

  // =====================================================================
  // ENVIRONMENTAL SPELLS – persistent field entities
  // =====================================================================

  private _placeEnvSpell(p: MWPlayer, defId: string, mapDef: MapDef): void {
    const def = getEnvSpellDef(defId);
    if (p.mana < def.manaCost) return;
    if (p.envSpellCooldown > 0) return;
    if (p.activeEnvSpells.length >= MW.ENV_SPELL_MAX_PLACED) {
      // Remove oldest
      const oldestId = p.activeEnvSpells.shift()!;
      this._removeEnvSpell(oldestId);
    }

    p.mana -= def.manaCost;
    p.envSpellCooldown = def.cooldown;

    // Place in front of the player
    const cos = Math.cos(p.yaw);
    const sin = Math.sin(p.yaw);
    const placeX = p.x - sin * 4;
    const placeZ = p.z - cos * 4;
    const placeY = getTerrainHeight(placeX, placeZ, mapDef);

    const entity = createEnvSpellEntity(defId, p.id, p.team, placeX, placeY, placeZ, p.yaw);

    // Handle teleport portals — place a pair
    if (def.type === "teleport_portal") {
      const portal2X = p.x - sin * 15;
      const portal2Z = p.z - cos * 15;
      const portal2Y = getTerrainHeight(portal2X, portal2Z, mapDef);
      const entity2 = createEnvSpellEntity(defId, p.id, p.team, portal2X, portal2Y, portal2Z, p.yaw + Math.PI);
      entity.linkedPortalId = entity2.id;
      entity2.linkedPortalId = entity.id;
      entity2.mesh = buildEnvSpellMesh(entity2);
      this._scene.add(entity2.mesh);
      this._envSpellEntities.push(entity2);
      p.activeEnvSpells.push(entity2.id);
    }

    entity.mesh = buildEnvSpellMesh(entity);
    this._scene.add(entity.mesh);
    this._envSpellEntities.push(entity);
    p.activeEnvSpells.push(entity.id);

    if (p.id === "player_0") {
      this._centerNotification = { text: `${def.name} placed!`, color: "#44cc44", timer: 1.5, size: 22 };
    }
  }

  private _removeEnvSpell(entityId: string): void {
    const idx = this._envSpellEntities.findIndex(e => e.id === entityId);
    if (idx < 0) return;
    const entity = this._envSpellEntities[idx];
    if (entity.mesh) {
      this._scene.remove(entity.mesh);
      entity.mesh.traverse(child => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        const mat = (child as THREE.Mesh).material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
    }
    this._envSpellEntities.splice(idx, 1);
  }

  private _tickEnvSpells(dt: number, _mapDef: MapDef): void {
    const playersInfo = this._players
      .filter(p => p.alive)
      .map(p => ({ id: p.id, team: p.team, x: p.x, y: p.y, z: p.z, alive: p.alive }));

    for (let i = this._envSpellEntities.length - 1; i >= 0; i--) {
      const entity = this._envSpellEntities[i];
      const effects = tickEnvSpellEntity(entity, dt, playersInfo);

      // Apply effects
      for (const eff of effects) {
        if (!eff.targetId) continue;
        const target = this._players.find(p => p.id === eff.targetId);
        if (!target || !target.alive) continue;

        switch (eff.type) {
          case "damage":
            if (target.spawnProtection > 0) break;
            target.hp -= eff.value;
            if (target.id === "player_0") this._damageVignetteTimer = 0.3;
            if (target.hp <= 0) this._killPlayer(target, entity.ownerId, getEnvSpellDef(entity.defId).name);
            break;
          case "heal":
            target.hp = Math.min(target.maxHp, target.hp + eff.value);
            break;
          case "freeze":
            target.frozen = true;
            target.frozenTimer = eff.duration || 1.5;
            break;
          case "stun":
            target.stunned = true;
            target.stunTimer = eff.duration || 1;
            break;
          case "blind":
            target.blinded = true;
            target.blindTimer = eff.duration || 2;
            break;
          case "pull_launch":
            // Pull toward center then launch up
            const pullDx = entity.x - target.x;
            const pullDz = entity.z - target.z;
            const pullDist = Math.sqrt(pullDx * pullDx + pullDz * pullDz) || 1;
            target.vx += (pullDx / pullDist) * eff.value * dt * 10;
            target.vz += (pullDz / pullDist) * eff.value * dt * 10;
            if (pullDist < 1.5) target.vy += 12;
            break;
          case "teleport": {
            // Find linked portal
            const linked = this._envSpellEntities.find(e => e.id === entity.linkedPortalId);
            if (linked) {
              target.x = linked.x;
              target.y = linked.y + 0.5;
              target.z = linked.z;
            }
            break;
          }
          case "turret_fire": {
            // Create a projectile from turret to target
            if (eff.targetX !== undefined && eff.targetY !== undefined && eff.targetZ !== undefined) {
              const tdx = eff.targetX - entity.x;
              const tdy = eff.targetY - (entity.y + 1.5);
              const tdz = eff.targetZ - entity.z;
              const tlen = Math.sqrt(tdx * tdx + tdy * tdy + tdz * tdz) || 1;
              const tProj: MWProjectile = {
                id: `turret_${Date.now()}_${Math.random()}`,
                ownerId: entity.ownerId, team: entity.team,
                x: entity.x, y: entity.y + 1.5, z: entity.z,
                dx: tdx / tlen, dy: tdy / tlen, dz: tdz / tlen,
                speed: 80, damage: eff.value, splashRadius: 0,
                range: 30, traveled: 0,
                color: 0xaa88ff, size: 0.08,
                mesh: null, fromVehicle: false,
              };
              const tGeo = new THREE.SphereGeometry(0.08, 4, 4);
              const tMat = new THREE.MeshBasicMaterial({ color: 0xaa88ff });
              tProj.mesh = new THREE.Mesh(tGeo, tMat);
              tProj.mesh.position.set(tProj.x, tProj.y, tProj.z);
              this._scene.add(tProj.mesh);
              this._projectiles.push(tProj);
            }
            break;
          }
        }
      }

      // Remove expired entities
      if (entity.duration <= 0) {
        // Remove from owner's active list
        const owner = this._players.find(p => p.id === entity.ownerId);
        if (owner) {
          owner.activeEnvSpells = owner.activeEnvSpells.filter(id => id !== entity.id);
        }
        this._removeEnvSpell(entity.id);
      }
    }
  }

  // =====================================================================
  // DRAGON RIDING COMBAT – aerial dogfights
  // =====================================================================

  private _showDragonSetup(): void {
    this._phase = MWPhase.CHAR_SELECT;
    this._removeMenu();
    this._menuDiv = document.createElement("div");
    this._menuDiv.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:30;` +
      `background:rgba(5,3,15,0.97);display:flex;flex-direction:column;align-items:center;` +
      `font-family:'Segoe UI',sans-serif;color:#e0d5c0;overflow-y:auto;padding:20px 0;`;

    let dragonsHtml = "";
    for (const d of DRAGON_MOUNT_DEFS) {
      dragonsHtml += `
        <div class="mw-dragon-card" data-id="${d.id}" style="cursor:pointer;padding:12px;margin:6px;
          border:2px solid #444;border-radius:8px;width:250px;background:rgba(20,10,30,0.8);
          transition:border-color 0.2s">
          <div style="font-size:20px">${d.icon} <b>${d.name}</b></div>
          <div style="font-size:12px;color:#998877;margin-top:4px">${d.desc}</div>
          <div style="font-size:11px;color:#777;margin-top:6px">
            HP: ${d.hp} | Speed: ${d.speed}-${d.maxSpeed} | Breath: ${d.breathDamage}/tick
          </div>
        </div>`;
    }

    let classCardsHtml = "";
    for (const cls of MAGE_CLASSES) {
      classCardsHtml += `
        <div class="mw-drider-class" data-id="${cls.id}" style="cursor:pointer;padding:8px;margin:4px;
          border:2px solid ${cls.id === this._selectedClassId ? '#daa520' : '#333'};border-radius:6px;
          width:120px;background:rgba(20,10,30,0.8);text-align:center;font-size:12px">
          ${cls.icon} ${cls.name}
        </div>`;
    }

    let mapCardsHtml = "";
    for (const m of MAP_DEFS.slice(0, 6)) {
      mapCardsHtml += `
        <div class="mw-dmap" data-id="${m.id}" style="cursor:pointer;padding:6px;margin:3px;
          border:2px solid ${m.id === this._mapId ? '#daa520' : '#333'};border-radius:6px;
          width:100px;background:rgba(20,10,30,0.8);text-align:center;font-size:11px">
          ${m.icon} ${m.name}
        </div>`;
    }

    this._menuDiv.innerHTML = `
      <h2 style="color:#ff6644;margin:0 0 4px 0">DRAGON RIDING COMBAT</h2>
      <p style="color:#776655;margin:0 0 15px 0;font-size:12px">Choose your dragon, mage class, and map</p>

      <h3 style="color:#daa520;margin:0 0 8px 0;font-size:14px">Select Dragon</h3>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;max-width:600px" id="mw-dragon-list">
        ${dragonsHtml}
      </div>

      <h3 style="color:#daa520;margin:15px 0 8px 0;font-size:14px">Select Mage Class</h3>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;max-width:600px" id="mw-drider-classes">
        ${classCardsHtml}
      </div>

      <h3 style="color:#daa520;margin:15px 0 8px 0;font-size:14px">Select Map</h3>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;max-width:600px" id="mw-dragon-maps">
        ${mapCardsHtml}
      </div>

      <div style="margin-top:20px;display:flex;gap:10px">
        <button id="mw-dragon-back" style="${this._menuBtnStyle("#2a2a2a", "#555")}">Back</button>
        <button id="mw-dragon-start" style="${this._menuBtnStyle("#2a1010", "#ff6644")}">Mount Up!</button>
      </div>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._menuDiv);

    let selectedDragonId = DRAGON_MOUNT_DEFS[0].id;

    // Dragon card selection
    const dragonCards = this._menuDiv.querySelectorAll(".mw-dragon-card");
    dragonCards.forEach(card => {
      card.addEventListener("click", () => {
        dragonCards.forEach(c => (c as HTMLElement).style.borderColor = "#444");
        (card as HTMLElement).style.borderColor = "#ff6644";
        selectedDragonId = (card as HTMLElement).dataset.id || DRAGON_MOUNT_DEFS[0].id;
      });
    });
    // Highlight first card by default
    if (dragonCards.length > 0) (dragonCards[0] as HTMLElement).style.borderColor = "#ff6644";

    // Class selection
    const classCards = this._menuDiv.querySelectorAll(".mw-drider-class");
    classCards.forEach(card => {
      card.addEventListener("click", () => {
        classCards.forEach(c => (c as HTMLElement).style.borderColor = "#333");
        (card as HTMLElement).style.borderColor = "#daa520";
        this._selectedClassId = (card as HTMLElement).dataset.id || "battlemage";
      });
    });

    // Map selection
    const mapCards = this._menuDiv.querySelectorAll(".mw-dmap");
    mapCards.forEach(card => {
      card.addEventListener("click", () => {
        mapCards.forEach(c => (c as HTMLElement).style.borderColor = "#333");
        (card as HTMLElement).style.borderColor = "#daa520";
        this._mapId = (card as HTMLElement).dataset.id || "enchanted_forest";
      });
    });

    document.getElementById("mw-dragon-back")?.addEventListener("click", () => {
      this._removeMenu();
      this._showMainMenu();
    });
    document.getElementById("mw-dragon-start")?.addEventListener("click", () => {
      this._removeMenu();
      this._startDragonCombat(selectedDragonId);
    });
  }

  private _startDragonCombat(dragonDefId: string): void {
    this._isDragonMode = true;
    this._isRoyaleMode = false;
    this._isDuelMode = false;
    this._royaleState = null;
    this._duelState = null;
    const mapDef = getMapDef(this._mapId);

    // Reset base state
    this._players = [];
    this._vehicles = [];
    this._projectiles = [];
    this._killFeed = [];
    this._capturePoints = [];
    this._floatingTexts = [];
    this._envSpellEntities = [];
    this._dragonRiders = [];
    this._teamScores = [0, 0];
    this._matchTimer = 300;
    this._hitMarkerTimer = 0;
    this._damageVignetteTimer = 0;
    this._fireTimer = 0;
    this._gameTime = 0;
    this._centerNotification = null;

    // Build scene
    this._buildScene(mapDef);

    // Create human player + dragon
    const human = createPlayer("player_0", 0, this._selectedClassId, false, -30, 0, mapDef);
    this._players.push(human);
    const humanDragon = createDragonRider(dragonDefId, "player_0", 0, -30, 15, 0);
    humanDragon.mesh = buildDragonMesh(humanDragon);
    this._scene.add(humanDragon.mesh);
    this._dragonRiders.push(humanDragon);
    human.dragonState = humanDragon;

    // Create AI dragons
    const aiDragonDefs = DRAGON_MOUNT_DEFS;
    for (let i = 0; i < 4; i++) {
      const team = (i < 2 ? 0 : 1) as 0 | 1;
      const aiCls = MAGE_CLASSES[i % MAGE_CLASSES.length];
      const angle = (i / 4) * Math.PI * 2;
      const aiPlayer = createPlayer(
        `ai_dragon_${AI_NAMES[i]}`, team, aiCls.id, true,
        Math.cos(angle) * 40, Math.sin(angle) * 40, mapDef,
      );
      this._players.push(aiPlayer);
      const aiDragon = createDragonRider(
        aiDragonDefs[i % aiDragonDefs.length].id,
        aiPlayer.id, team,
        Math.cos(angle) * 40, 15 + Math.random() * 10, Math.sin(angle) * 40,
      );
      aiDragon.mesh = buildDragonMesh(aiDragon);
      this._scene.add(aiDragon.mesh);
      this._dragonRiders.push(aiDragon);
      aiPlayer.dragonState = aiDragon;
    }

    // Build HUD
    this._createHUD();
    this._phase = MWPhase.WARMUP;
    this._warmupTimer = MW.WARMUP_TIME;
    this._showWarmupCountdown();
    this._lastTime = performance.now();
    this._gameLoop(performance.now());
  }

  private _tickDragonRiders(dt: number, _mapDef: MapDef): void {
    for (const dragon of this._dragonRiders) {
      if (!dragon.alive) continue;

      const owner = this._players.find(p => p.id === dragon.riderId);
      if (!owner || !owner.alive) continue;

      // Build input
      let input: DragonTickInput;
      if (owner.id === "player_0") {
        const forward = this._keys["KeyW"] ? 1 : this._keys["KeyS"] ? -0.5 : 0;
        const yawInput = this._keys["KeyA"] ? 1 : this._keys["KeyD"] ? -1 : 0;
        input = {
          throttle: forward,
          yawInput: yawInput,
          pitchInput: this._keys["Space"] ? -1 : this._keys["ControlLeft"] ? 1 : 0,
          wantBreath: this._mouseDown,
          wantBarrelRoll: !!this._keys["KeyQ"],
          wantDiveBomb: !!this._keys["KeyE"],
        };
        // Mouse look also affects yaw/pitch
        if (this._pointerLocked) {
          dragon.yaw -= this._mouseDX * MW.MOUSE_SENSITIVITY;
          dragon.pitch -= this._mouseDY * MW.MOUSE_SENSITIVITY;
          dragon.pitch = clamp(dragon.pitch, -Math.PI / 3, Math.PI / 3);
        }
      } else {
        // AI dragon input — simple chase behavior
        const enemies = this._dragonRiders.filter(d =>
          d.riderId !== dragon.riderId && d.alive &&
          this._players.find(p => p.id === d.riderId)?.team !== owner.team
        );
        let targetDragon: DragonRiderState | null = null;
        let bestDist = 999;
        for (const e of enemies) {
          const d = dist3(dragon.x, dragon.y, dragon.z, e.x, e.y, e.z);
          if (d < bestDist) { bestDist = d; targetDragon = e; }
        }

        if (targetDragon) {
          const dx = targetDragon.x - dragon.x;
          const dz = targetDragon.z - dragon.z;
          const targetYaw = Math.atan2(-dx, -dz);
          let yawDiff = targetYaw - dragon.yaw;
          while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
          while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

          const dy = targetDragon.y - dragon.y;
          input = {
            throttle: bestDist > 20 ? 1 : 0.3,
            yawInput: clamp(yawDiff * 2, -1, 1),
            pitchInput: clamp(-dy * 0.1, -1, 1),
            wantBreath: bestDist < 25 && Math.abs(yawDiff) < 0.5,
            wantBarrelRoll: Math.random() < 0.002,
            wantDiveBomb: bestDist < 15 && dragon.y > targetDragon.y + 5,
          };
        } else {
          input = { throttle: 0.5, yawInput: Math.sin(this._gameTime * 0.3) * 0.3, pitchInput: 0, wantBreath: false, wantBarrelRoll: false, wantDiveBomb: false };
        }
      }

      // Build targets for the tick (enemies)
      const nearbyTargets = this._dragonRiders
        .filter(d => d.riderId !== dragon.riderId && d.alive)
        .map(d => ({ id: d.riderId, x: d.x, y: d.y, z: d.z, alive: d.alive }));

      // Also include ground players
      for (const p of this._players) {
        if (!p.alive || p.dragonState || p.id === dragon.riderId) continue;
        nearbyTargets.push({ id: p.id, x: p.x, y: p.y + MW.EYE_HEIGHT * 0.5, z: p.z, alive: true });
      }

      const result = tickDragonRider(dragon, input, dt, nearbyTargets);

      // Update rider position to match dragon
      owner.x = dragon.x;
      owner.y = dragon.y;
      owner.z = dragon.z;
      owner.yaw = dragon.yaw;

      // Apply breath/tail/divebomb hits
      for (const hit of [...result.breathHits, ...result.tailSwipeHits, ...result.diveBombHits]) {
        // Check if it hit a dragon or a player
        const targetDragon = this._dragonRiders.find(d => d.riderId === hit.targetId);
        if (targetDragon) {
          targetDragon.hp -= hit.damage;
          if (owner.id === "player_0") this._hitMarkerTimer = 0.15;
          if (targetDragon.hp <= 0) {
            targetDragon.alive = false;
            const targetPlayer = this._players.find(p => p.id === hit.targetId);
            if (targetPlayer) this._killPlayer(targetPlayer, dragon.riderId, "Dragon Attack");
          }
        } else {
          const targetPlayer = this._players.find(p => p.id === hit.targetId);
          if (targetPlayer && targetPlayer.alive) {
            targetPlayer.hp -= hit.damage;
            if (targetPlayer.id === "player_0") this._damageVignetteTimer = 0.3;
            if (owner.id === "player_0") this._hitMarkerTimer = 0.15;
            if (targetPlayer.hp <= 0) this._killPlayer(targetPlayer, dragon.riderId, "Dragon Attack");
          }
        }
      }

      // Breath VFX
      if (dragon.isBreathing && dragon.mesh) {
        const def = getDragonMountDef(dragon.dragonDefId);
        const bGeo = new THREE.SphereGeometry(0.1, 4, 4);
        const bMat = new THREE.MeshBasicMaterial({ color: def.breathColor, transparent: true, opacity: 0.8 });
        const bMesh = new THREE.Mesh(bGeo, bMat);
        const fwdX = -Math.sin(dragon.yaw) * Math.cos(dragon.pitch);
        const fwdY = -Math.sin(dragon.pitch);
        const fwdZ = -Math.cos(dragon.yaw) * Math.cos(dragon.pitch);
        bMesh.position.set(
          dragon.x + fwdX * 3 + (Math.random() - 0.5) * 0.5,
          dragon.y + fwdY * 3 + (Math.random() - 0.5) * 0.5,
          dragon.z + fwdZ * 3 + (Math.random() - 0.5) * 0.5,
        );
        this._scene.add(bMesh);
        this._particles.push({
          mesh: bMesh,
          vx: fwdX * 20 + (Math.random() - 0.5) * 3,
          vy: fwdY * 20 + (Math.random() - 0.5) * 3,
          vz: fwdZ * 20 + (Math.random() - 0.5) * 3,
          life: 0.4, maxLife: 0.4, gravity: false,
        });
      }
    }
  }

  // =====================================================================
  // DUELING ARENA – 1v1 wizard duels
  // =====================================================================

  private _showDuelSetup(): void {
    this._phase = MWPhase.DUEL_MENU;
    this._removeMenu();
    this._menuDiv = document.createElement("div");
    this._menuDiv.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:30;` +
      `background:rgba(5,3,15,0.97);display:flex;flex-direction:column;align-items:center;` +
      `font-family:'Segoe UI',sans-serif;color:#e0d5c0;overflow-y:auto;padding:20px 0;`;

    // Arena selection
    let arenaHtml = "";
    for (const a of DUEL_ARENA_DEFS) {
      arenaHtml += `
        <div class="mw-duel-arena" data-id="${a.id}" style="cursor:pointer;padding:10px;margin:5px;
          border:2px solid ${a.id === this._duelArenaId ? '#ffaa22' : '#333'};border-radius:6px;
          width:200px;background:rgba(20,10,30,0.8)">
          <div style="font-size:16px">${a.icon} <b>${a.name}</b></div>
          <div style="font-size:11px;color:#887766;margin-top:3px">${a.desc}</div>
          <div style="font-size:10px;color:#666;margin-top:3px">Hazards: ${a.hazards.length > 0 ? a.hazards.map(h => h.type.replace("_", " ")).join(", ") : "None"}</div>
        </div>`;
    }

    // Your class
    let classHtml = "";
    for (const cls of MAGE_CLASSES) {
      classHtml += `
        <div class="mw-duel-class" data-id="${cls.id}" style="cursor:pointer;padding:6px;margin:3px;
          border:2px solid ${cls.id === this._selectedClassId ? '#ffaa22' : '#333'};border-radius:6px;
          width:100px;background:rgba(20,10,30,0.8);text-align:center;font-size:11px">
          ${cls.icon} ${cls.name}
        </div>`;
    }

    // Opponent class
    let oppClassHtml = "";
    for (const cls of MAGE_CLASSES) {
      oppClassHtml += `
        <div class="mw-duel-opp" data-id="${cls.id}" style="cursor:pointer;padding:6px;margin:3px;
          border:2px solid ${cls.id === this._duelOpponentClassId ? '#ff4444' : '#333'};border-radius:6px;
          width:100px;background:rgba(20,10,30,0.8);text-align:center;font-size:11px">
          ${cls.icon} ${cls.name}
        </div>`;
    }

    // Crafted spell selection (pick up to 4)
    let spellHtml = "";
    for (const sp of CRAFTED_SPELL_DEFS) {
      spellHtml += `
        <div class="mw-duel-spell" data-id="${sp.id}" style="cursor:pointer;padding:5px;margin:3px;
          border:2px solid #333;border-radius:4px;width:180px;background:rgba(20,10,30,0.8);font-size:11px">
          ${sp.icon} <b>${sp.name}</b> - ${sp.damage}dmg, ${sp.manaCost}mana
          <div style="color:#776655;font-size:10px">${sp.desc}</div>
        </div>`;
    }

    // Env spell selection
    let envHtml = "";
    for (const env of ENV_SPELL_DEFS) {
      envHtml += `
        <div class="mw-duel-env" data-id="${env.id}" style="cursor:pointer;padding:5px;margin:3px;
          border:2px solid #333;border-radius:4px;width:180px;background:rgba(20,10,30,0.8);font-size:11px">
          ${env.icon} <b>${env.name}</b> - ${env.manaCost}mana, ${env.duration}s
          <div style="color:#776655;font-size:10px">${env.desc}</div>
        </div>`;
    }

    this._menuDiv.innerHTML = `
      <h2 style="color:#ffaa22;margin:0 0 4px 0">WIZARD DUEL</h2>
      <p style="color:#776655;margin:0 0 12px 0;font-size:12px">1v1 duel - Best of ${DUEL_ROUNDS_TO_WIN * 2 - 1} rounds</p>

      <div style="display:flex;gap:30px;flex-wrap:wrap;justify-content:center;max-width:800px">
        <div>
          <h3 style="color:#daa520;font-size:13px;margin:0 0 6px 0">Arena</h3>
          <div style="display:flex;flex-wrap:wrap;justify-content:center" id="mw-duel-arenas">${arenaHtml}</div>
        </div>
        <div>
          <h3 style="color:#daa520;font-size:13px;margin:0 0 6px 0">Your Class</h3>
          <div style="display:flex;flex-wrap:wrap;justify-content:center" id="mw-duel-classes">${classHtml}</div>
          <h3 style="color:#ff4444;font-size:13px;margin:10px 0 6px 0">Opponent Class</h3>
          <div style="display:flex;flex-wrap:wrap;justify-content:center" id="mw-duel-opps">${oppClassHtml}</div>
        </div>
      </div>

      <div style="display:flex;gap:20px;flex-wrap:wrap;justify-content:center;max-width:800px;margin-top:15px">
        <div>
          <h3 style="color:#daa520;font-size:13px;margin:0 0 6px 0">Crafted Spells (pick up to ${DUEL_MAX_SPELL_SLOTS})</h3>
          <div style="display:flex;flex-wrap:wrap;justify-content:center;max-height:200px;overflow-y:auto" id="mw-duel-spells">${spellHtml}</div>
        </div>
        <div>
          <h3 style="color:#daa520;font-size:13px;margin:0 0 6px 0">Environmental Spell (pick 1)</h3>
          <div style="display:flex;flex-wrap:wrap;justify-content:center;max-height:200px;overflow-y:auto" id="mw-duel-envs">${envHtml}</div>
        </div>
      </div>

      <div style="margin-top:20px;display:flex;gap:10px">
        <button id="mw-duel-back" style="${this._menuBtnStyle("#2a2a2a", "#555")}">Back</button>
        <button id="mw-duel-start" style="${this._menuBtnStyle("#1a1a2a", "#ffaa22")}">Begin Duel!</button>
      </div>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._menuDiv);

    const selectedSpells: string[] = [];
    let selectedEnvSpell: string | null = null;

    // Arena selection
    const arenaCards = this._menuDiv.querySelectorAll(".mw-duel-arena");
    arenaCards.forEach(card => {
      card.addEventListener("click", () => {
        arenaCards.forEach(c => (c as HTMLElement).style.borderColor = "#333");
        (card as HTMLElement).style.borderColor = "#ffaa22";
        this._duelArenaId = (card as HTMLElement).dataset.id || "arena_stone_circle";
      });
    });

    // Class selections
    const classCards = this._menuDiv.querySelectorAll(".mw-duel-class");
    classCards.forEach(card => {
      card.addEventListener("click", () => {
        classCards.forEach(c => (c as HTMLElement).style.borderColor = "#333");
        (card as HTMLElement).style.borderColor = "#ffaa22";
        this._selectedClassId = (card as HTMLElement).dataset.id || "battlemage";
      });
    });

    const oppCards = this._menuDiv.querySelectorAll(".mw-duel-opp");
    oppCards.forEach(card => {
      card.addEventListener("click", () => {
        oppCards.forEach(c => (c as HTMLElement).style.borderColor = "#333");
        (card as HTMLElement).style.borderColor = "#ff4444";
        this._duelOpponentClassId = (card as HTMLElement).dataset.id || "pyromancer";
      });
    });

    // Crafted spell multi-select (toggle up to 4)
    const spellCards = this._menuDiv.querySelectorAll(".mw-duel-spell");
    spellCards.forEach(card => {
      card.addEventListener("click", () => {
        const spellId = (card as HTMLElement).dataset.id || "";
        const idx = selectedSpells.indexOf(spellId);
        if (idx >= 0) {
          selectedSpells.splice(idx, 1);
          (card as HTMLElement).style.borderColor = "#333";
        } else if (selectedSpells.length < DUEL_MAX_SPELL_SLOTS) {
          selectedSpells.push(spellId);
          (card as HTMLElement).style.borderColor = "#ffaa22";
        }
      });
    });

    // Env spell single-select
    const envCards = this._menuDiv.querySelectorAll(".mw-duel-env");
    envCards.forEach(card => {
      card.addEventListener("click", () => {
        envCards.forEach(c => (c as HTMLElement).style.borderColor = "#333");
        (card as HTMLElement).style.borderColor = "#44cc44";
        selectedEnvSpell = (card as HTMLElement).dataset.id || null;
      });
    });

    document.getElementById("mw-duel-back")?.addEventListener("click", () => {
      this._removeMenu();
      this._showMainMenu();
    });
    document.getElementById("mw-duel-start")?.addEventListener("click", () => {
      const loadout: DuelLoadout = {
        ...createDefaultDuelLoadout(this._selectedClassId),
        craftedSpellIds: [...selectedSpells],
        envSpellId: selectedEnvSpell,
      };
      this._selectedDuelLoadout = loadout;
      this._removeMenu();
      this._startDuel(loadout);
    });
  }

  private _startDuel(playerLoadout: DuelLoadout): void {
    this._isDuelMode = true;
    this._isRoyaleMode = false;
    this._isDragonMode = false;
    this._royaleState = null;

    // Reset base state
    this._players = [];
    this._vehicles = [];
    this._projectiles = [];
    this._killFeed = [];
    this._capturePoints = [];
    this._floatingTexts = [];
    this._envSpellEntities = [];
    this._dragonRiders = [];
    this._teamScores = [0, 0];
    this._hitMarkerTimer = 0;
    this._damageVignetteTimer = 0;
    this._fireTimer = 0;
    this._gameTime = 0;
    this._centerNotification = null;

    // Build arena scene
    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(getDuelArenaDef(this._duelArenaId).fogColor, 0.02);
    this._duelArenaGroup = buildDuelArenaScene(this._duelArenaId, this._scene);

    const arena = getDuelArenaDef(this._duelArenaId);

    // Opponent loadout — AI picks random spells
    const oppLoadout: DuelLoadout = {
      ...createDefaultDuelLoadout(this._duelOpponentClassId),
      craftedSpellIds: CRAFTED_SPELL_DEFS.slice(0, DUEL_MAX_SPELL_SLOTS).map(s => s.id),
      envSpellId: ENV_SPELL_DEFS[Math.floor(Math.random() * ENV_SPELL_DEFS.length)].id,
    };

    this._duelState = createDuelMatchState(
      this._duelArenaId,
      this._selectedClassId, playerLoadout,
      this._duelOpponentClassId, oppLoadout,
      true,
    );

    // Create actual player objects for rendering
    const p1 = createPlayer("player_0", 0, this._selectedClassId, false,
      -arena.size * 0.4, 0, MAP_DEFS[0] /* not used for terrain height in arena */);
    p1.y = 0.01;
    p1.primaryWandId = playerLoadout.primaryWandId;
    p1.secondaryWandId = playerLoadout.secondaryWandId;
    p1.craftedSpellSlots = [...playerLoadout.craftedSpellIds];
    p1.selectedEnvSpellId = playerLoadout.envSpellId || "env_ice_wall";
    p1.yaw = 0;
    this._players.push(p1);

    const p2 = createPlayer("ai_duelist", 1, this._duelOpponentClassId, true,
      arena.size * 0.4, 0, MAP_DEFS[0]);
    p2.y = 0.01;
    p2.yaw = Math.PI;
    p2.craftedSpellSlots = [...oppLoadout.craftedSpellIds];
    p2.selectedEnvSpellId = oppLoadout.envSpellId || "env_fire_pit";
    this._players.push(p2);

    // Build player meshes
    for (const p of this._players) {
      p.mesh = this._buildMageMesh(p);
      p.mesh.position.set(p.x, p.y, p.z);
      this._scene.add(p.mesh);
      if (p.id !== "player_0") {
        p.nameTag = this._buildNameTag("Opponent", p.team);
        p.nameTag.position.set(p.x, p.y + MW.PLAYER_HEIGHT + 0.5, p.z);
        this._scene.add(p.nameTag);
      }
    }

    this._matchTimer = DUEL_ROUND_TIME;
    this._createHUD();
    this._phase = MWPhase.WARMUP;
    this._warmupTimer = DUEL_COUNTDOWN_TIME;
    this._showWarmupCountdown();
    this._lastTime = performance.now();
    this._gameLoop(performance.now());
  }

  private _tickDuel(dt: number): void {
    if (!this._duelState) return;

    // Sync player positions into duel state
    const p1 = this._players.find(p => p.id === "player_0");
    const p2 = this._players.find(p => p.id === "ai_duelist");
    if (p1 && this._duelState.player1) {
      this._duelState.player1.x = p1.x;
      this._duelState.player1.y = p1.y;
      this._duelState.player1.z = p1.z;
      this._duelState.player1.hp = p1.hp;
      this._duelState.player1.alive = p1.alive;
    }
    if (p2 && this._duelState.player2) {
      this._duelState.player2.x = p2.x;
      this._duelState.player2.y = p2.y;
      this._duelState.player2.z = p2.z;
      this._duelState.player2.hp = p2.hp;
      this._duelState.player2.alive = p2.alive;
    }

    const result = tickDuelMatch(this._duelState, dt);

    // Apply hazard damages
    for (const hd of result.hazardDamages) {
      const target = this._players.find(p => p.id === hd.playerId);
      if (target && target.alive) {
        target.hp -= hd.damage;
        if (target.id === "player_0") this._damageVignetteTimer = 0.2;
        if (target.hp <= 0) {
          target.hp = 0;
          target.alive = false;
        }
      }
    }

    if (result.phaseChanged) {
      if (result.newPhase === "round_end") {
        const winnerText = result.roundWinner === "player_0" ? "You win this round!" :
          result.roundWinner ? "Opponent wins this round!" : "Draw!";
        this._centerNotification = {
          text: `Round ${this._duelState.roundNumber} - ${winnerText}`,
          color: result.roundWinner === "player_0" ? "#44ff44" : "#ff4444",
          timer: 2.5, size: 28,
        };
      } else if (result.newPhase === "match_end") {
        const matchText = result.matchWinner === "player_0" ? "VICTORY!" : "DEFEAT!";
        const matchColor = result.matchWinner === "player_0" ? "#daa520" : "#ff4444";
        this._centerNotification = { text: matchText, color: matchColor, timer: 4.0, size: 36 };
        // End the game loop after a delay
        setTimeout(() => {
          if (this._rafId) cancelAnimationFrame(this._rafId);
          this._rafId = 0;
          this._showDuelEndScreen();
        }, 4000);
      } else if (result.newPhase === "countdown" && this._duelState.roundNumber > 1) {
        // Reset player positions and HP for next round
        if (p1) {
          const arena = getDuelArenaDef(this._duelArenaId);
          p1.x = -arena.size * 0.4; p1.y = 0.01; p1.z = 0;
          p1.hp = p1.maxHp; p1.alive = true; p1.mana = p1.maxMana;
          p1.frozen = false; p1.stunned = false; p1.slowed = false; p1.blinded = false;
          p1.dotActive = false;
        }
        if (p2) {
          const arena = getDuelArenaDef(this._duelArenaId);
          p2.x = arena.size * 0.4; p2.y = 0.01; p2.z = 0;
          p2.hp = p2.maxHp; p2.alive = true; p2.mana = p2.maxMana;
          p2.frozen = false; p2.stunned = false; p2.slowed = false; p2.blinded = false;
          p2.dotActive = false;
        }
        this._centerNotification = {
          text: `Round ${this._duelState.roundNumber}`,
          color: "#ffaa22", timer: 2.0, size: 30,
        };
      }
    }

    // Keep players in arena bounds
    const arena = getDuelArenaDef(this._duelArenaId);
    for (const p of this._players) {
      const d = dist2(p.x, p.z, 0, 0);
      if (d > arena.size - 1) {
        const angle = Math.atan2(p.x, p.z);
        p.x = Math.sin(angle) * (arena.size - 1);
        p.z = Math.cos(angle) * (arena.size - 1);
        p.vx *= -0.5;
        p.vz *= -0.5;
      }
    }
  }

  private _showDuelEndScreen(): void {
    if (!this._duelState) return;
    this._removeMenu();
    this._menuDiv = document.createElement("div");
    this._menuDiv.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:30;` +
      `background:rgba(5,3,15,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;` +
      `font-family:'Segoe UI',sans-serif;color:#e0d5c0;`;

    const isWin = this._duelState.player1Wins >= DUEL_ROUNDS_TO_WIN;
    this._menuDiv.innerHTML = `
      <h1 style="font-size:48px;color:${isWin ? '#daa520' : '#ff4444'};margin:0 0 10px 0">
        ${isWin ? 'VICTORY!' : 'DEFEAT!'}
      </h1>
      <div style="font-size:18px;color:#998877;margin-bottom:20px">
        Score: ${this._duelState.player1Wins} - ${this._duelState.player2Wins}
      </div>
      <div style="font-size:14px;color:#776655;margin-bottom:30px">
        Rounds played: ${this._duelState.roundNumber}
      </div>
      <div style="display:flex;gap:10px">
        <button id="mw-duel-again" style="${this._menuBtnStyle("#1a1a2a", "#ffaa22")}">Duel Again</button>
        <button id="mw-duel-menu" style="${this._menuBtnStyle("#2a2a2a", "#555")}">Back to Menu</button>
      </div>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._menuDiv);

    document.getElementById("mw-duel-again")?.addEventListener("click", () => {
      this._removeMenu();
      this._removeHUD();
      if (this._selectedDuelLoadout) {
        this._startDuel(this._selectedDuelLoadout);
      } else {
        this._showDuelSetup();
      }
    });
    document.getElementById("mw-duel-menu")?.addEventListener("click", () => {
      this._removeMenu();
      this._removeHUD();
      this._isDuelMode = false;
      this._duelState = null;
      if (this._duelArenaGroup) {
        this._scene?.remove(this._duelArenaGroup);
        this._duelArenaGroup = null;
      }
      this._showMainMenu();
    });
  }

  // =====================================================================
  // STATUS EFFECT UPDATES (used by all modes)
  // =====================================================================

  private _tickPlayerStatusEffects(dt: number): void {
    for (const p of this._players) {
      if (!p.alive) continue;

      // DOT
      if (p.dotActive) {
        p.hp -= p.dotDamage * dt;
        p.dotTimer -= dt;
        if (p.dotTimer <= 0) p.dotActive = false;
        if (p.hp <= 0) this._killPlayer(p, p.dotOwnerId, "Burn");
      }
      // Stun
      if (p.stunned) {
        p.stunTimer -= dt;
        if (p.stunTimer <= 0) p.stunned = false;
      }
      // Slow
      if (p.slowed) {
        p.slowTimer -= dt;
        if (p.slowTimer <= 0) { p.slowed = false; p.slowFactor = 1; }
      }
      // Blind
      if (p.blinded) {
        p.blindTimer -= dt;
        if (p.blindTimer <= 0) p.blinded = false;
      }
      // Crafted spell cooldown
      if (p.craftedSpellCooldown > 0) p.craftedSpellCooldown -= dt;
      // Env spell cooldown
      if (p.envSpellCooldown > 0) p.envSpellCooldown -= dt;
    }
  }

} // end class MageWarsGame
