// ---------------------------------------------------------------------------
// Mage Wars FPS – Complete self-contained game module
// ---------------------------------------------------------------------------

import * as THREE from "three";
import {
  WandDef, WAND_DEFS, MageClassDef, MAGE_CLASSES,
  VehicleDef, VEHICLE_DEFS, MapDef, MAP_DEFS, MW,
} from "./MageWarsConfig";

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
  MAIN_MENU = 0, CHAR_SELECT = 1, LOADOUT = 2, PLAYING = 3, PAUSED = 4, SCOREBOARD = 5, ROUND_END = 6, WARMUP = 7
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
  return VEHICLE_DEFS.find(v => v.id === id) || VEHICLE_DEFS[0];
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
    fireTimer: 0, mesh: null,
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

  // ---- Warmup -----
  private _warmupTimer = 0;
  private _warmupCountdownDiv: HTMLDivElement | null = null;

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
      if (this._phase === MWPhase.PLAYING || this._phase === MWPhase.WARMUP) {
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

    // Torso (cylinder)
    const torsoGeo = new THREE.CylinderGeometry(0.3, 0.35, 1.0, 8);
    const torsoMat = new THREE.MeshStandardMaterial({ color: cls.robeColor, roughness: 0.7 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.9;
    torso.castShadow = true;
    group.add(torso);

    // Cloak/cape - flat box behind torso
    const cloakGeo = new THREE.BoxGeometry(0.5, 0.9, 0.06);
    const cloakMat = new THREE.MeshStandardMaterial({ color: darkenColor(cls.robeColor, 0.7), roughness: 0.8 });
    const cloak = new THREE.Mesh(cloakGeo, cloakMat);
    cloak.position.set(0, 0.75, 0.22);
    group.add(cloak);

    // Robe skirt
    const skirtGeo = new THREE.CylinderGeometry(0.35, 0.5, 0.5, 8);
    const skirtMat = new THREE.MeshStandardMaterial({ color: cls.robeColor, roughness: 0.7 });
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.position.y = 0.35;
    group.add(skirt);

    // Boots
    const bootGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.18, 6);
    const bootMat = new THREE.MeshStandardMaterial({ color: darkenColor(cls.robeColor, 0.4), roughness: 0.8 });
    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(-0.15, 0.09, 0);
    group.add(leftBoot);
    const rightBoot = new THREE.Mesh(bootGeo, bootMat);
    rightBoot.position.set(0.15, 0.09, 0);
    group.add(rightBoot);

    // Head (sphere)
    const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xdebb99, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.6;
    head.castShadow = true;
    group.add(head);

    // Eyes
    const eyeWhiteGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilGeo = new THREE.SphereGeometry(0.02, 4, 4);
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    for (const ex of [-0.08, 0.08]) {
      const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
      eyeWhite.position.set(ex, 1.63, -0.17);
      group.add(eyeWhite);
      const eyePupil = new THREE.Mesh(eyePupilGeo, eyePupilMat);
      eyePupil.position.set(ex, 1.63, -0.2);
      group.add(eyePupil);
    }

    // Eyebrows (thin boxes)
    const browGeo = new THREE.BoxGeometry(0.07, 0.01, 0.02);
    const browMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.8 });
    for (const bx of [-0.08, 0.08]) {
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.position.set(bx, 1.68, -0.17);
      brow.rotation.z = bx < 0 ? 0.1 : -0.1;
      group.add(brow);
    }

    // Hat
    this._addHat(group, cls);

    // Shoulder pads
    const padGeo = new THREE.SphereGeometry(0.1, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const padMat = new THREE.MeshStandardMaterial({ color: cls.accentColor, roughness: 0.4, metalness: 0.5 });
    const leftPad = new THREE.Mesh(padGeo, padMat);
    leftPad.position.set(-0.4, 1.35, 0);
    leftPad.rotation.z = 0.5;
    group.add(leftPad);
    const rightPad = new THREE.Mesh(padGeo, padMat);
    rightPad.position.set(0.4, 1.35, 0);
    rightPad.rotation.z = -0.5;
    group.add(rightPad);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6);
    const armMat = new THREE.MeshStandardMaterial({ color: cls.robeColor, roughness: 0.7 });

    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.4, 1.1, 0);
    leftArm.rotation.z = 0.3;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.4, 1.1, -0.15);
    rightArm.rotation.z = -0.3;
    rightArm.rotation.x = -0.5;
    group.add(rightArm);

    // Hands
    const handGeo = new THREE.SphereGeometry(0.05, 6, 6);
    const handMat = new THREE.MeshStandardMaterial({ color: 0xdebb99, roughness: 0.6 });
    const leftHand = new THREE.Mesh(handGeo, handMat);
    leftHand.position.set(-0.48, 0.82, 0);
    group.add(leftHand);
    const rightHand = new THREE.Mesh(handGeo, handMat);
    rightHand.position.set(0.48, 0.82, -0.3);
    group.add(rightHand);

    // Wand in right hand - more detailed
    const wandGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.7, 6);
    const wandMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.5 });
    const wand = new THREE.Mesh(wandGeo, wandMat);
    wand.position.set(0.45, 0.9, -0.45);
    wand.rotation.x = -1.0;
    group.add(wand);

    // Wand grip rings
    const gripGeo = new THREE.TorusGeometry(0.035, 0.008, 4, 8);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.3 });
    for (let gi = 0; gi < 3; gi++) {
      const grip = new THREE.Mesh(gripGeo, gripMat);
      grip.position.set(0.45, 0.95 + gi * 0.08, -0.42 - gi * 0.06);
      group.add(grip);
    }

    // Wand guard/cross piece
    const guardGeo = new THREE.BoxGeometry(0.12, 0.02, 0.02);
    const guardMat = new THREE.MeshStandardMaterial({ color: cls.accentColor, roughness: 0.3, metalness: 0.6 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.set(0.45, 0.85, -0.52);
    group.add(guard);

    // Wand tip glow - larger orb
    const activeWand = this._getPlayerActiveWand(player);
    const tipGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const tipMat = new THREE.MeshBasicMaterial({ color: activeWand.projectileColor });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.set(0.45, 0.6, -0.75);
    group.add(tip);

    // Rune belt with glowing gems
    const beltGeo = new THREE.TorusGeometry(0.33, 0.04, 6, 12);
    const teamColor = player.team === 0 ? 0x4488ff : 0xff4444;
    const beltMat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.4, metalness: 0.5 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 0.65;
    belt.rotation.x = Math.PI / 2;
    group.add(belt);

    // Belt gems
    const gemGeo = new THREE.SphereGeometry(0.025, 4, 4);
    const gemMat = new THREE.MeshBasicMaterial({ color: cls.accentColor });
    for (let gi = 0; gi < 6; gi++) {
      const angle = (gi / 6) * Math.PI * 2;
      const gem = new THREE.Mesh(gemGeo, gemMat);
      gem.position.set(Math.cos(angle) * 0.34, 0.65, Math.sin(angle) * 0.34);
      group.add(gem);
    }

    // Team glow ring at feet
    const glowRingGeo = new THREE.TorusGeometry(0.5, 0.03, 4, 16);
    const glowRingMat = new THREE.MeshBasicMaterial({ color: teamColor, transparent: true, opacity: 0.5 });
    const glowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.y = 0.02;
    group.add(glowRing);

    group.castShadow = true;
    return group;
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
      // Box body
      const bodyGeo = new THREE.BoxGeometry(def.scaleX, def.scaleY, def.scaleZ);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      group.add(body);

      // Head at front
      const headGeo = new THREE.SphereGeometry(def.scaleX * 0.25, 8, 6);
      const headMesh = new THREE.Mesh(headGeo, accentMat);
      headMesh.position.set(0, def.scaleY * 0.2, -def.scaleZ * 0.55);
      group.add(headMesh);

      // Horns/tusks
      const hornGeo = new THREE.ConeGeometry(0.08, 0.6, 6);
      const hornL = new THREE.Mesh(hornGeo, new THREE.MeshStandardMaterial({ color: 0xccccaa }));
      hornL.position.set(-0.2, def.scaleY * 0.2, -def.scaleZ * 0.7);
      hornL.rotation.x = -Math.PI / 3;
      group.add(hornL);
      const hornR = new THREE.Mesh(hornGeo, new THREE.MeshStandardMaterial({ color: 0xccccaa }));
      hornR.position.set(0.2, def.scaleY * 0.2, -def.scaleZ * 0.7);
      hornR.rotation.x = -Math.PI / 3;
      group.add(hornR);

      // Glowing eyes
      const eyeGeo = new THREE.SphereGeometry(0.06, 4, 4);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-0.15, def.scaleY * 0.3, -def.scaleZ * 0.58);
      group.add(eyeL);
      const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
      eyeR.position.set(0.15, def.scaleY * 0.3, -def.scaleZ * 0.58);
      group.add(eyeR);

      // Armor plating on sides
      const plateGeo = new THREE.BoxGeometry(0.08, def.scaleY * 0.6, def.scaleZ * 0.4);
      const plateMat = new THREE.MeshStandardMaterial({ color: def.accentColor, roughness: 0.3, metalness: 0.7 });
      const plateL = new THREE.Mesh(plateGeo, plateMat);
      plateL.position.set(-def.scaleX * 0.52, 0, 0);
      group.add(plateL);
      const plateR = new THREE.Mesh(plateGeo, plateMat);
      plateR.position.set(def.scaleX * 0.52, 0, 0);
      group.add(plateR);

      // 4 legs with 2-segment joints
      const upperLegGeo = new THREE.CylinderGeometry(0.15, 0.18, def.scaleY * 0.35, 6);
      const lowerLegGeo = new THREE.CylinderGeometry(0.18, 0.15, def.scaleY * 0.35, 6);
      const offsets = [
        [-def.scaleX * 0.35, -def.scaleZ * 0.3],
        [def.scaleX * 0.35, -def.scaleZ * 0.3],
        [-def.scaleX * 0.35, def.scaleZ * 0.3],
        [def.scaleX * 0.35, def.scaleZ * 0.3],
      ];
      for (const [lx, lz] of offsets) {
        const upper = new THREE.Mesh(upperLegGeo, accentMat);
        upper.position.set(lx, -def.scaleY * 0.45, lz);
        group.add(upper);
        const lower = new THREE.Mesh(lowerLegGeo, bodyMat);
        lower.position.set(lx, -def.scaleY * 0.75, lz);
        group.add(lower);
      }

      // Spine ridges along top
      const spineGeo = new THREE.ConeGeometry(0.06, 0.2, 4);
      const spineMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.7), roughness: 0.6 });
      for (let si = 0; si < 5; si++) {
        const spine = new THREE.Mesh(spineGeo, spineMat);
        spine.position.set(0, def.scaleY * 0.52, -def.scaleZ * 0.3 + si * def.scaleZ * 0.15);
        group.add(spine);
      }

      // Tail
      const tailGeo = new THREE.ConeGeometry(0.1, 0.8, 6);
      const tail = new THREE.Mesh(tailGeo, accentMat);
      tail.position.set(0, def.scaleY * 0.1, def.scaleZ * 0.55);
      tail.rotation.x = Math.PI / 3;
      group.add(tail);

      // Tail tip tuft
      const tuftGeo = new THREE.SphereGeometry(0.08, 4, 4);
      const tuftMat = new THREE.MeshStandardMaterial({ color: darkenColor(def.bodyColor, 0.5), roughness: 0.8 });
      const tuft = new THREE.Mesh(tuftGeo, tuftMat);
      tuft.position.set(0, def.scaleY * 0.2, def.scaleZ * 0.85);
      group.add(tuft);

      // Nostrils (small dark spheres on face)
      const nostrilGeo = new THREE.SphereGeometry(0.03, 4, 4);
      const nostrilMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
      for (const nx of [-0.08, 0.08]) {
        const nostril = new THREE.Mesh(nostrilGeo, nostrilMat);
        nostril.position.set(nx, def.scaleY * 0.12, -def.scaleZ * 0.72);
        group.add(nostril);
      }

      // Saddle / rider seat
      const saddleGeo = new THREE.BoxGeometry(def.scaleX * 0.35, 0.08, def.scaleZ * 0.25);
      const saddleMat = new THREE.MeshStandardMaterial({ color: 0x442200, roughness: 0.8 });
      const saddle = new THREE.Mesh(saddleGeo, saddleMat);
      saddle.position.y = def.scaleY * 0.54;
      group.add(saddle);

      // Turret on top (with reinforced armor)
      const turretGeo = new THREE.BoxGeometry(def.scaleX * 0.4, def.scaleY * 0.3, def.scaleZ * 0.3);
      const turret = new THREE.Mesh(turretGeo, accentMat);
      turret.position.y = def.scaleY * 0.65;
      turret.castShadow = true;
      group.add(turret);

      // Turret rivet details
      const rivetGeo = new THREE.SphereGeometry(0.025, 4, 4);
      const rivetMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.8 });
      for (const corner of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const rivet = new THREE.Mesh(rivetGeo, rivetMat);
        rivet.position.set(
          corner[0] * def.scaleX * 0.18,
          def.scaleY * 0.82,
          corner[1] * def.scaleZ * 0.13,
        );
        group.add(rivet);
      }

      // Barrel with muzzle brake
      const barrelGeo = new THREE.CylinderGeometry(0.1, 0.1, def.scaleZ * 0.5, 6);
      const barrel = new THREE.Mesh(barrelGeo, darkMat);
      barrel.position.set(0, def.scaleY * 0.65, -def.scaleZ * 0.4);
      barrel.rotation.x = Math.PI / 2;
      group.add(barrel);

      // Muzzle brake
      const muzzleGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.08, 6);
      const muzzle = new THREE.Mesh(muzzleGeo, darkMat);
      muzzle.position.set(0, def.scaleY * 0.65, -def.scaleZ * 0.65);
      muzzle.rotation.x = Math.PI / 2;
      group.add(muzzle);

    } else if (def.type === "air_hover") {
      // Elongated body
      const bodyGeo = new THREE.BoxGeometry(def.scaleX, def.scaleY, def.scaleZ);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      group.add(body);

      // Head with snout
      const headGeo = new THREE.SphereGeometry(def.scaleX * 0.3, 8, 6);
      const headMesh = new THREE.Mesh(headGeo, accentMat);
      headMesh.position.set(0, def.scaleY * 0.15, -def.scaleZ * 0.55);
      headMesh.scale.set(0.8, 0.8, 1.2);
      group.add(headMesh);

      // Glowing eyes
      const eyeGeo = new THREE.SphereGeometry(0.06, 4, 4);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-def.scaleX * 0.15, def.scaleY * 0.25, -def.scaleZ * 0.6);
      group.add(eyeL);
      const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
      eyeR.position.set(def.scaleX * 0.15, def.scaleY * 0.25, -def.scaleZ * 0.6);
      group.add(eyeR);

      // Wings with membrane effect (thin triangular shapes)
      const wingVerts = new Float32Array([
        0, 0, -def.scaleZ * 0.3,
        -def.scaleX * 1.5, 0.1, 0,
        0, 0, def.scaleZ * 0.2,
      ]);
      const lwGeo = new THREE.BufferGeometry();
      lwGeo.setAttribute("position", new THREE.BufferAttribute(wingVerts, 3));
      lwGeo.computeVertexNormals();
      const wingMat = new THREE.MeshStandardMaterial({
        color: def.accentColor, roughness: 0.6, side: THREE.DoubleSide,
        transparent: true, opacity: 0.8,
      });
      const lw = new THREE.Mesh(lwGeo, wingMat);
      lw.position.set(-def.scaleX * 0.3, 0, 0);
      lw.name = "leftWing";
      group.add(lw);

      const rwVerts = new Float32Array([
        0, 0, -def.scaleZ * 0.3,
        def.scaleX * 1.5, 0.1, 0,
        0, 0, def.scaleZ * 0.2,
      ]);
      const rwGeo = new THREE.BufferGeometry();
      rwGeo.setAttribute("position", new THREE.BufferAttribute(rwVerts, 3));
      rwGeo.computeVertexNormals();
      const rw = new THREE.Mesh(rwGeo, wingMat);
      rw.position.set(def.scaleX * 0.3, 0, 0);
      rw.name = "rightWing";
      group.add(rw);

      // Tail
      const tailGeo = new THREE.ConeGeometry(0.15, def.scaleZ * 0.5, 6);
      const tail = new THREE.Mesh(tailGeo, accentMat);
      tail.position.set(0, 0.1, def.scaleZ * 0.55);
      tail.rotation.x = Math.PI / 2;
      group.add(tail);

    } else {
      // air_fly - streamlined body
      const bodyGeo = new THREE.SphereGeometry(1, 8, 6);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.scale.set(def.scaleX * 0.4, def.scaleY * 0.4, def.scaleZ * 0.5);
      body.castShadow = true;
      group.add(body);

      // Elongated neck
      const neckGeo = new THREE.CylinderGeometry(0.15, 0.25, def.scaleZ * 0.3, 6);
      const neck = new THREE.Mesh(neckGeo, bodyMat);
      neck.position.set(0, 0.1, -def.scaleZ * 0.45);
      neck.rotation.x = Math.PI / 2;
      group.add(neck);

      // Head with teeth/beak
      const headGeo = new THREE.SphereGeometry(0.3, 6, 6);
      const headMesh = new THREE.Mesh(headGeo, accentMat);
      headMesh.position.set(0, 0.15, -def.scaleZ * 0.65);
      headMesh.scale.set(0.8, 0.7, 1.2);
      group.add(headMesh);

      // Beak/snout
      const beakGeo = new THREE.ConeGeometry(0.1, 0.3, 4);
      const beak = new THREE.Mesh(beakGeo, darkMat);
      beak.position.set(0, 0.1, -def.scaleZ * 0.8);
      beak.rotation.x = -Math.PI / 2;
      group.add(beak);

      // Glowing eyes
      const eyeGeo = new THREE.SphereGeometry(0.06, 4, 4);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-0.15, 0.2, -def.scaleZ * 0.65);
      group.add(eyeL);
      const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
      eyeR.position.set(0.15, 0.2, -def.scaleZ * 0.65);
      group.add(eyeR);

      // Swept wings with proper wingspan
      const wingShape = new Float32Array([
        0, 0, 0,
        -def.scaleX * 1.0, 0, def.scaleZ * 0.15,
        -def.scaleX * 0.4, 0, def.scaleZ * 0.5,
      ]);
      const lwGeo = new THREE.BufferGeometry();
      lwGeo.setAttribute("position", new THREE.BufferAttribute(wingShape, 3));
      lwGeo.computeVertexNormals();
      const wMat = new THREE.MeshStandardMaterial({ color: def.accentColor, side: THREE.DoubleSide });
      const lwMesh = new THREE.Mesh(lwGeo, wMat);
      lwMesh.position.set(-0.3, 0, 0);
      lwMesh.name = "leftWing";
      group.add(lwMesh);

      const rwShape = new Float32Array([
        0, 0, 0,
        def.scaleX * 1.0, 0, def.scaleZ * 0.15,
        def.scaleX * 0.4, 0, def.scaleZ * 0.5,
      ]);
      const rwGeo = new THREE.BufferGeometry();
      rwGeo.setAttribute("position", new THREE.BufferAttribute(rwShape, 3));
      rwGeo.computeVertexNormals();
      const rwMesh = new THREE.Mesh(rwGeo, wMat);
      rwMesh.position.set(0.3, 0, 0);
      rwMesh.name = "rightWing";
      group.add(rwMesh);

      // Tail fins
      const tailGeo = new THREE.ConeGeometry(0.2, def.scaleZ * 0.4, 6);
      const tail = new THREE.Mesh(tailGeo, accentMat);
      tail.position.set(0, 0.3, def.scaleZ * 0.5);
      tail.rotation.x = Math.PI / 2;
      group.add(tail);

      // Vertical tail fin
      const vFinGeo = new THREE.BoxGeometry(0.05, 0.5, 0.4);
      const vFin = new THREE.Mesh(vFinGeo, accentMat);
      vFin.position.set(0, 0.5, def.scaleZ * 0.4);
      group.add(vFin);

      // Fire/glow trail cone behind
      const trailGeo = new THREE.ConeGeometry(0.2, 1.0, 6);
      const trailMat = new THREE.MeshBasicMaterial({ color: def.weaponProjectileColor, transparent: true, opacity: 0.4 });
      const trail = new THREE.Mesh(trailGeo, trailMat);
      trail.position.set(0, 0, def.scaleZ * 0.7);
      trail.rotation.x = -Math.PI / 2;
      group.add(trail);
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
      if (e.code === "Digit1") this._wantSlot = 0;
      if (e.code === "Digit2") this._wantSlot = 1;
      if (e.code === "Digit3") this._wantSlot = 2;
      if (e.code === "Tab") {
        e.preventDefault();
        if (this._phase === MWPhase.PLAYING) {
          this._phase = MWPhase.SCOREBOARD;
          this._showScoreboard();
        }
      }
    };
    this._keyUpHandler = (e: KeyboardEvent) => {
      this._keys[e.code] = false;
      if (e.code === "Tab" && this._phase === MWPhase.SCOREBOARD) {
        this._phase = MWPhase.PLAYING;
        this._hideScoreboard();
      }
    };
    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);

    this._mouseDownHandler = (e: MouseEvent) => {
      if (this._phase === MWPhase.PLAYING && !this._pointerLocked) {
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
      this._phase = MWPhase.PLAYING;
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
      `background:radial-gradient(ellipse at center,transparent 50%,rgba(200,0,0,0.4) 100%);transition:opacity 0.3s"></div>`;

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

    // Vehicle proximity prompt
    const vehPrompt = `<div id="mw-veh-prompt" style="position:absolute;bottom:140px;left:50%;transform:translateX(-50%);padding:8px 16px;background:rgba(0,0,0,0.6);border:1px solid #555;border-radius:4px;font-size:14px;color:#e0d5c0;display:none;pointer-events:none"></div>`;

    // Eliminated notification
    const eliminated = `<div id="mw-eliminated" style="position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);font-size:28px;font-weight:bold;color:#ff4444;text-shadow:0 0 15px rgba(255,0,0,0.5);opacity:0;pointer-events:none;letter-spacing:3px;transition:opacity 0.2s">ELIMINATED</div>`;

    // Center notification (streaks, multikills)
    const centerNotif = `<div id="mw-center-notif" style="position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);font-weight:bold;text-shadow:0 0 15px rgba(255,200,0,0.5);opacity:0;pointer-events:none;letter-spacing:2px;transition:opacity 0.3s"></div>`;

    this._hudDiv.innerHTML = ch + vch + hm + vig + lowHpVig + hitDir + hp + mana + staminaBar + ammo + wandSlots + kf + scores + cpHud + capMsg + mm + ab + respawn + headshot + vhp + floatDiv + vehPrompt + eliminated + centerNotif;

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
    if (s0) s0.textContent = `${this._teamScores[0]}`;
    if (s1) s1.textContent = `${this._teamScores[1]}`;

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
    if (vigEl) vigEl.style.opacity = `${clamp(this._damageVignetteTimer * 2, 0, 0.8)}`;

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
        respawnTimerEl.textContent = `Respawning in ${p.respawnTimer.toFixed(1)}s`;
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
  }


  // =====================================================================
  // MATCH START
  // =====================================================================

  private _startMatch(): void {
    const mapDef = getMapDef(this._mapId);
    const teamSize = this._customTeamSize;

    // Reset state
    this._players = [];
    this._vehicles = [];
    this._projectiles = [];
    this._killFeed = [];
    this._capturePoints = [];
    this._floatingTexts = [];
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
        this._phase = MWPhase.PLAYING;
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

    if (this._phase === MWPhase.PLAYING) {
      this._simAccum += dt;
      while (this._simAccum >= MW.SIM_RATE) {
        this._simTick(MW.SIM_RATE);
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
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) this._respawnPlayer(p, mapDef);
        continue;
      }
      if (p.vehicleId) continue;
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

    // Check win condition
    if (this._matchTimer <= 0 || this._teamScores[0] >= this._customScoreLimit || this._teamScores[1] >= this._customScoreLimit) {
      if (this._rafId) cancelAnimationFrame(this._rafId);
      this._rafId = 0;
      this._showRoundEnd();
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

    // Fire vehicle weapon
    if (this._mouseDown && veh.fireTimer <= 0) {
      this._fireVehicleWeapon(veh, p, mapDef);
      veh.fireTimer = 1 / def.weaponFireRate;
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
    if (!wasGrounded && p.grounded) {
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
      const geo = new THREE.SphereGeometry(wand.projectileSize, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color: wand.projectileColor });
      proj.mesh = new THREE.Mesh(geo, mat);
      proj.mesh.position.set(proj.x, proj.y, proj.z);
      this._scene.add(proj.mesh);

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

    const geo = new THREE.SphereGeometry(0.3, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: def.weaponProjectileColor });
    proj.mesh = new THREE.Mesh(geo, mat);
    proj.mesh.position.set(proj.x, proj.y, proj.z);
    this._scene.add(proj.mesh);

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

      if (proj.mesh) proj.mesh.position.set(proj.x, proj.y, proj.z);

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

      // Check collision with players
      let hit = false;
      for (const target of this._players) {
        if (!target.alive || target.id === proj.ownerId || target.team === proj.team) continue;
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

          const isHeadshot = proj.y > target.y + playerH * 0.8;
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
            this._damageVignetteTimer = 0.3;
            // Hit direction
            this._lastDamageDir.x = proj.dx;
            this._lastDamageDir.z = proj.dz;
            this._lastDamageDir.timer = 0.5;
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
        proj.mesh.geometry.dispose();
        (proj.mesh.material as THREE.Material).dispose();
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
      if (!target.alive || target.team === proj.team) continue;
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
        if (target.id === "player_0") this._damageVignetteTimer = 0.3;
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
          if (!target.alive || target.team === p.team) continue;
          const d = dist3(p.x, p.y, p.z, target.x, target.y, target.z);
          if (d < 8) {
            const dmg = 60 * (1 - d / 8) * (1 - target.armor / 100);
            target.hp -= dmg;
            if (target.id === "player_0") this._damageVignetteTimer = 0.3;
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
          if (!target.alive || target.team === p.team) continue;
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
            if (nearest.id === "player_0") this._damageVignetteTimer = 0.3;
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
          if (nearest.id === "player_0") this._damageVignetteTimer = 0.3;
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
      if (!ai.wanderTarget || dist2(p.x, p.z, ai.wanderTarget.x, ai.wanderTarget.z) < 3) {
        const spawnDist = mapDef.spawnDistance / 2;
        const baseX = p.team === 0 ? -spawnDist : spawnDist;
        ai.wanderTarget = {
          x: baseX + (Math.random() - 0.5) * MW.AI_WANDER_RADIUS * 2,
          z: (Math.random() - 0.5) * MW.AI_WANDER_RADIUS * 2,
        };
      }

      const toX = ai.wanderTarget.x - p.x;
      const toZ = ai.wanderTarget.z - p.z;
      const desiredYaw = Math.atan2(-toX, -toZ);
      p.yaw = lerp(p.yaw, desiredYaw, dt * 4);

      const sinY = Math.sin(p.yaw);
      const cosY = Math.cos(p.yaw);
      p.vx = -sinY * p.speed * MW.MOVE_SPEED * 0.7;
      p.vz = -cosY * p.speed * MW.MOVE_SPEED * 0.7;
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
      if (!t.alive || t.team === p.team || t.invisible) continue;
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
        camX = veh.x;
        camY = veh.y + def.scaleY;
        camZ = veh.z;
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
        const flapAngle = Math.sin(this._gameTime * 3) * 0.1;
        v.mesh.traverse(c => {
          if (c.name === "leftWing") c.rotation.z = -0.2 + flapAngle;
          if (c.name === "rightWing") c.rotation.z = 0.2 - flapAngle;
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

} // end class MageWarsGame
