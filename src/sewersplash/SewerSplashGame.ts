// ---------------------------------------------------------------------------
// SEWER SPLASH — 3D Endless Sewer Surfer
// Ride a wooden plank through Camelot's sewers as a heroic rat. Dodge pipes,
// jump grates, duck chains, collect cheese & gold, fight sewer beasts, and
// survive the rising tide. Three lanes, increasing speed, boss encounters,
// power-ups, and a leaderboard. Medieval Subway Surfers meets Temple Run
// in a torch-lit underground labyrinth beneath the holy city.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { viewManager } from "../view/ViewManager";
import { audioManager } from "../audio/AudioManager";

// ── Constants ────────────────────────────────────────────────────────────────

const TUNNEL_RADIUS = 4.5;
const TUNNEL_SEG_LENGTH = 30;
const TUNNEL_SEGMENTS_AHEAD = 6;
const TUNNEL_SEGMENTS_BEHIND = 1;

const LANE_WIDTH = 2.2;
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];

const BASE_SPEED = 12;
const MAX_SPEED = 32;
const SPEED_RAMP = 0.15; // per second acceleration
const JUMP_VELOCITY = 10;
const GRAVITY = 28;
const DUCK_DURATION = 0.6;

const PLAYER_Y_BASE = -TUNNEL_RADIUS + 1.0; // standing on water surface
const WATER_Y = -TUNNEL_RADIUS + 0.6;

const OBSTACLE_TYPES = ["pipe_low", "pipe_high", "grate", "barrel", "chain", "ramp"] as const;
type ObstacleType = (typeof OBSTACLE_TYPES)[number];

const COLLECTIBLE_TYPES = ["cheese", "gold", "shield", "magnet", "splash_bomb", "heart"] as const;
type CollectibleType = (typeof COLLECTIBLE_TYPES)[number];

const ENEMY_TYPES = ["rat_swarm", "slime", "croc"] as const;
type EnemyType = (typeof ENEMY_TYPES)[number];

// ── Tunnel Themes ────────────────────────────────────────────────────────────

type TunnelTheme = "sewer" | "toxic" | "catacombs" | "flooded";

interface ThemeDef {
  wallColor: number;
  floorColor: number;
  brickColor: number;
  fogColor: number;
  waterColor: number;
  waterEmissive: number;
  waterOpacity: number;
  torchColor: number;
  torchIntensity: number;
  ambientColor: number;
  ambientIntensity: number;
  stalColor: number;
  pipeColor: number;
  extraProps: boolean; // theme-specific decorations
}

const THEME_DEFS: Record<TunnelTheme, ThemeDef> = {
  sewer: {
    wallColor: 0x3a3028, floorColor: 0x222018, brickColor: 0x1a1510,
    fogColor: 0x050808, waterColor: 0x225533, waterEmissive: 0x112211,
    waterOpacity: 0.7, torchColor: 0xff6622, torchIntensity: 1.2,
    ambientColor: 0x223322, ambientIntensity: 0.3, stalColor: 0x445544,
    pipeColor: 0x556655, extraProps: false,
  },
  toxic: {
    wallColor: 0x2a3020, floorColor: 0x1a2010, brickColor: 0x152010,
    fogColor: 0x051005, waterColor: 0x33cc22, waterEmissive: 0x22aa11,
    waterOpacity: 0.8, torchColor: 0x44ff22, torchIntensity: 1.5,
    ambientColor: 0x224422, ambientIntensity: 0.4, stalColor: 0x335522,
    pipeColor: 0x446633, extraProps: true,
  },
  catacombs: {
    wallColor: 0x352820, floorColor: 0x201510, brickColor: 0x181010,
    fogColor: 0x080505, waterColor: 0x332222, waterEmissive: 0x221111,
    waterOpacity: 0.5, torchColor: 0xff4411, torchIntensity: 0.9,
    ambientColor: 0x221111, ambientIntensity: 0.2, stalColor: 0x443322,
    pipeColor: 0x554433, extraProps: true,
  },
  flooded: {
    wallColor: 0x283038, floorColor: 0x182028, brickColor: 0x101820,
    fogColor: 0x050810, waterColor: 0x224466, waterEmissive: 0x112244,
    waterOpacity: 0.85, torchColor: 0x4488ff, torchIntensity: 1.0,
    ambientColor: 0x112233, ambientIntensity: 0.35, stalColor: 0x334455,
    pipeColor: 0x445566, extraProps: true,
  },
};

const THEME_ORDER: TunnelTheme[] = ["sewer", "toxic", "catacombs", "flooded"];
const THEME_CHANGE_DISTANCE = 300; // switch theme every 300m

// ── Milestones ───────────────────────────────────────────────────────────────

interface Milestone {
  distance: number;
  label: string;
  reward: "hp" | "speed_cap" | "bomb" | "gold";
  given: boolean;
}

const MILESTONE_DEFS: { distance: number; label: string; reward: "hp" | "speed_cap" | "bomb" | "gold" }[] = [
  { distance: 100, label: "DEEP DIVE", reward: "gold" },
  { distance: 250, label: "SEWER RAT", reward: "bomb" },
  { distance: 500, label: "TUNNEL KING", reward: "hp" },
  { distance: 1000, label: "UNDERWORLD", reward: "gold" },
  { distance: 1500, label: "CATACOMBS", reward: "hp" },
  { distance: 2000, label: "FLOOD MASTER", reward: "bomb" },
  { distance: 3000, label: "SEWER LEGEND", reward: "gold" },
  { distance: 5000, label: "IMMORTAL RAT", reward: "hp" },
];

// ── Persistent Upgrades ──────────────────────────────────────────────────────

interface ShopUpgrade {
  id: string;
  name: string;
  desc: string;
  cost: number;
  maxLevel: number;
  effect: string;
}

const SHOP_UPGRADES: ShopUpgrade[] = [
  { id: "extra_hp", name: "Iron Fur", desc: "+1 starting heart", cost: 50, maxLevel: 3, effect: "hp" },
  { id: "magnet_dur", name: "Lodestone", desc: "+3s magnet duration", cost: 40, maxLevel: 3, effect: "magnet" },
  { id: "shield_dur", name: "Bubble Charm", desc: "+3s shield duration", cost: 40, maxLevel: 3, effect: "shield" },
  { id: "cheese_value", name: "Gourmand", desc: "+5 cheese score value", cost: 60, maxLevel: 3, effect: "cheese" },
  { id: "slow_start", name: "Easy Current", desc: "Start speed -2 m/s", cost: 80, maxLevel: 2, effect: "slow" },
  { id: "revive", name: "Second Wind", desc: "Revive once per run with 1 HP", cost: 150, maxLevel: 1, effect: "revive" },
];

// ── Interfaces ───────────────────────────────────────────────────────────────

interface TunnelSegment {
  group: THREE.Group;
  zStart: number;
  zEnd: number;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  enemies: Enemy[];
  isBoss: boolean;
  theme: TunnelTheme;
  movingDebris: MovingDebris[];
}

interface MovingDebris {
  mesh: THREE.Group;
  laneF: number; // floating-point lane position (-1 to 1)
  laneDir: number; // drift direction
  speed: number;
  z: number;
  hitbox: THREE.Box3;
  cleared: boolean;
}

interface Obstacle {
  mesh: THREE.Group;
  type: ObstacleType;
  lane: number; // -1, 0, 1
  z: number;
  hitbox: THREE.Box3;
  cleared: boolean;
}

interface Collectible {
  mesh: THREE.Group;
  type: CollectibleType;
  lane: number;
  z: number;
  collected: boolean;
  bobPhase: number;
}

interface Enemy {
  mesh: THREE.Group;
  type: EnemyType;
  lane: number;
  z: number;
  hp: number;
  maxHp: number;
  dead: boolean;
  attackTimer: number;
  hitFlash: number;
}

type BossVariant = "wyrm" | "toxic_spawn" | "croc_titan" | "slime_amalgam";

interface BossState {
  active: boolean;
  mesh: THREE.Group | null;
  hp: number;
  maxHp: number;
  phase: number;
  timer: number;
  attackPattern: number;
  tentacles: THREE.Mesh[];
  hitFlash: number;
  variant: BossVariant;
}

type Phase = "title" | "playing" | "dead" | "boss" | "paused";

// ── Main Class ───────────────────────────────────────────────────────────────

export class SewerSplashGame {
  // Three.js core
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _canvas!: HTMLCanvasElement;

  // Game state
  private _phase: Phase = "title";
  private _speed = BASE_SPEED;
  private _distance = 0;
  private _score = 0;
  private _cheese = 0;
  private _gold = 0;
  private _combo = 0;
  private _maxCombo = 0;
  private _hp = 3;
  private _maxHp = 3;
  private _invincibleTimer = 0;
  private _shieldTimer = 0;
  private _magnetTimer = 0;
  private _splashBombReady = false;

  // Player
  private _playerGroup!: THREE.Group;
  private _playerLane = 1; // 0, 1, 2 (index into LANES)
  private _playerX = 0;
  private _playerY = PLAYER_Y_BASE;
  private _playerVelY = 0;
  private _isJumping = false;
  private _isDucking = false;
  private _duckTimer = 0;
  private _laneChangeSpeed = 12;
  private _playerTilt = 0;
  private _playerLegs: THREE.Group[] = [];
  private _playerTail: THREE.Mesh | null = null;
  private _playerArms: THREE.Group[] = [];

  // Tunnel
  private _segments: TunnelSegment[] = [];
  private _nextSegZ = 0;
  // Reusable collision objects (avoid per-frame allocation)
  private _playerBox = new THREE.Box3();
  private _boxMin = new THREE.Vector3();
  private _boxMax = new THREE.Vector3();
  private _bossEvery = 500; // distance between bosses
  private _nextBossAt = 500;
  private _segmentsCreated = 0;

  // Theme
  private _currentTheme: TunnelTheme = "sewer";
  private _themeIndex = 0;
  private _lastThemeChangeDist = 0;

  // Milestones
  private _milestones: Milestone[] = [];
  private _milestonePopup = "";
  private _milestonePopupTimer = 0;

  // Countdown
  private _countdownTimer = 0;
  private _countdownPhase: "3" | "2" | "1" | "GO" | "done" = "done";

  // Water level
  private _waterLevel = WATER_Y;
  private _waterLevelTarget = WATER_Y;
  private _waterRiseTimer = 0;

  // Power-up visuals
  private _shieldBubble: THREE.Mesh | null = null;
  private _speedStreaks: THREE.Points | null = null;
  private _speedStreakVels: number[] = [];

  // Persistent upgrades
  private _upgradeLevels: Record<string, number> = {};
  private _totalGold = 0; // persisted across runs
  private _hasRevive = false;

  // New-best flash
  private _newBestFlash = false;

  // Ramp camera moment
  private _rampCamTimer = 0;

  // Death camera
  private _deathTimer = 0;
  private _deathSlowMo = false;

  // Hit speed penalty
  private _speedPenaltyTimer = 0;

  // Boss phase tracking
  private _bossPhaseAnnounced = [false, false, false]; // 75%, 50%, 25%
  private _bossMoveSide = 0; // side-to-side movement
  private _bossMoveDir = 1;

  // Ambient audio
  private _ambientDrip = 0;
  private _ambientHum: OscillatorNode | null = null;

  // Theme transition
  private _themeFadeTimer = 0;

  // Fever mode
  private _feverActive = false;
  private _feverTimer = 0;
  private _feverGlow: THREE.PointLight | null = null;

  // Air tricks
  private _airTrickInput = false; // true if A+D pressed mid-air
  private _airTrickDone = false;  // already tricked this jump
  private _airTrickSpin = 0;     // spin animation progress

  // Combo multiplier
  private _comboMult = 1; // 1x-3x

  // Procedural music
  private _musicOsc: OscillatorNode | null = null;
  private _musicGain: GainNode | null = null;
  private _musicBeatTimer = 0;
  // (kick drum is created per-beat in _updateMusic)

  // Screen juice
  private _screenZoomPulse = 0; // temporary zoom multiplier
  private _bossCount = 0;

  // Boss
  private _boss: BossState = {
    active: false, mesh: null, hp: 0, maxHp: 0,
    phase: 0, timer: 0, attackPattern: 0, tentacles: [], hitFlash: 0, variant: "wyrm",
  };

  // Timing
  private _dt = 0;
  private _time = 0;
  private _animFrame = 0;
  private _destroyed = false;

  // Input
  private _keys = new Set<string>();
  private _swipeStart: { x: number; y: number } | null = null;
  private _touchId: number | null = null;

  // Particles
  private _splashParticles!: THREE.Points;
  private _splashVelocities: THREE.Vector3[] = [];

  // Water flow mesh
  private _waterMesh!: THREE.Mesh;
  private _waterOffset = 0; // used in _updateWater

  // HUD
  private _hud!: HTMLDivElement;
  private _hudBuilt = false;
  private _hudScore!: HTMLDivElement;
  private _hudCheese!: HTMLDivElement;
  private _hudGold!: HTMLDivElement;
  private _hudHp!: HTMLDivElement;
  private _hudCombo!: HTMLDivElement;
  private _hudPowerup!: HTMLDivElement;
  private _hudBossHp!: HTMLDivElement;
  private _hudBossHpBar!: HTMLDivElement;
  private _hudSpeed!: HTMLDivElement;
  private _hudMilestone!: HTMLDivElement;
  private _hudDistBar!: HTMLDivElement;

  // Camera
  private _cameraShake = 0;
  private _cameraTilt = 0;

  // Visual effects
  private _vignetteEl: HTMLDivElement | null = null;
  private _fadeEl: HTMLDivElement | null = null;
  private _screenFlashTimer = 0;
  private _screenFlashColor = 0xffffff;

  // Audio
  private _audioCtx: AudioContext | null = null;

  // Best score persistence
  private _bestScore = 0;
  private _bestDistance = 0;

  // Input handlers (stored for cleanup)
  private _onKeyDown!: (e: KeyboardEvent) => void;
  private _onKeyUp!: (e: KeyboardEvent) => void;
  private _onResize!: () => void;
  private _onTouchStart!: (e: TouchEvent) => void;
  private _onTouchMove!: (e: TouchEvent) => void;
  private _onTouchEnd!: (e: TouchEvent) => void;
  private _onClick!: (e: MouseEvent) => void;

  // ── Boot / Destroy ──────────────────────────────────────────────────────

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();

    this._bestScore = parseInt(localStorage.getItem("sewer_splash_best") || "0", 10);
    this._bestDistance = parseInt(localStorage.getItem("sewer_splash_dist") || "0", 10);
    this._totalGold = parseInt(localStorage.getItem("sewer_splash_gold") || "0", 10);
    this._loadUpgrades();

    this._initThree();
    this._buildWater();
    this._buildSplashParticles();
    this._buildSpeedStreaks();
    this._createHUD();
    this._bindInput();

    this._phase = "title";
    this._showTitle();

    const clock = new THREE.Clock();
    const loop = () => {
      if (this._destroyed) return;
      this._animFrame = requestAnimationFrame(loop);
      this._dt = Math.min(clock.getDelta(), 0.05);
      this._time += this._dt;
      this._update();
      this._renderer.render(this._scene, this._camera);
    };
    loop();
  }

  destroy(): void {
    this._destroyed = true;
    cancelAnimationFrame(this._animFrame);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("touchstart", this._onTouchStart);
    window.removeEventListener("touchmove", this._onTouchMove);
    window.removeEventListener("touchend", this._onTouchEnd);
    window.removeEventListener("click", this._onClick);
    this._hud?.parentNode?.removeChild(this._hud);
    this._vignetteEl?.parentNode?.removeChild(this._vignetteEl);
    this._fadeEl?.parentNode?.removeChild(this._fadeEl);
    this._canvas?.parentNode?.removeChild(this._canvas);
    this._stopMusic();
    if (this._ambientHum) { try { this._ambientHum.stop(); } catch {} this._ambientHum = null; }
    this._audioCtx?.close().catch(() => {});
    this._audioCtx = null;
    this._renderer?.dispose();
    this._scene?.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        (obj as THREE.Mesh).geometry?.dispose();
        const mat = (obj as THREE.Mesh).material;
        if (mat instanceof THREE.Material) mat.dispose();
      }
    });
  }

  // ── Three.js setup ─────────────────────────────────────────────────────

  private _initThree(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this._canvas = document.createElement("canvas");
    this._canvas.id = "sewersplash-canvas";
    this._canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;";
    document.getElementById("pixi-container")!.appendChild(this._canvas);

    this._renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 0.5;

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x050808);
    this._scene.fog = new THREE.FogExp2(0x050808, 0.012);

    this._camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 200);
    this._camera.position.set(0, PLAYER_Y_BASE + 2.5, 5);
    this._camera.lookAt(0, PLAYER_Y_BASE + 0.5, -10);

    // Ambient
    this._scene.add(new THREE.AmbientLight(0x445544, 0.8));

    // Directional fill
    const dirLight = new THREE.DirectionalLight(0x889977, 0.6);
    dirLight.position.set(0, 5, -10);
    this._scene.add(dirLight);

    // Headlight following the player so the path ahead is always visible
    this._scene.add(new THREE.HemisphereLight(0x667766, 0x223322, 0.5));
  }

  // ── Water ──────────────────────────────────────────────────────────────

  private _buildWater(): void {
    const waterGeo = new THREE.PlaneGeometry(TUNNEL_RADIUS * 2.2, TUNNEL_SEG_LENGTH * (TUNNEL_SEGMENTS_AHEAD + TUNNEL_SEGMENTS_BEHIND + 1), 32, 64);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x225533,
      roughness: 0.2,
      metalness: 0.4,
      transparent: true,
      opacity: 0.7,
      emissive: 0x112211,
      emissiveIntensity: 0.3,
    });
    this._waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this._waterMesh.rotation.x = -Math.PI / 2;
    this._waterMesh.position.y = WATER_Y;
    this._scene.add(this._waterMesh);
  }

  // ── Splash Particles ──────────────────────────────────────────────────

  private _buildSplashParticles(): void {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    this._splashVelocities = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 0.3 + Math.random() * 0.3;
      colors[i * 3 + 1] = 0.6 + Math.random() * 0.2;
      colors[i * 3 + 2] = 0.3 + Math.random() * 0.2;
      this._splashVelocities.push(new THREE.Vector3());
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.15, vertexColors: true, transparent: true, opacity: 0.8 });
    this._splashParticles = new THREE.Points(geo, mat);
    this._scene.add(this._splashParticles);
  }

  private _emitSplash(x: number, y: number, z: number, count: number, color?: THREE.Color): void {
    const pos = this._splashParticles.geometry.attributes.position as THREE.BufferAttribute;
    const cols = this._splashParticles.geometry.attributes.color as THREE.BufferAttribute;
    let idx = 0;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < -50) { idx = i; break; }
      if (i === pos.count - 1) idx = Math.floor(Math.random() * pos.count);
    }
    for (let i = 0; i < count && i < 30; i++) {
      const pi = (idx + i) % pos.count;
      pos.setXYZ(pi, x + (Math.random() - 0.5) * 0.5, y, z + (Math.random() - 0.5) * 0.5);
      this._splashVelocities[pi].set(
        (Math.random() - 0.5) * 3,
        2 + Math.random() * 4,
        (Math.random() - 0.5) * 2 - 1,
      );
      if (color) {
        cols.setXYZ(pi, color.r, color.g, color.b);
      }
    }
    pos.needsUpdate = true;
    cols.needsUpdate = true;
  }

  // ── Player ────────────────────────────────────────────────────────────

  private _buildPlayer(): void {
    this._playerGroup = new THREE.Group();

    // Plank / surfboard
    const plankGeo = new THREE.BoxGeometry(1.2, 0.1, 2.0);
    const plankMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
    const plank = new THREE.Mesh(plankGeo, plankMat);
    plank.position.y = -0.2;
    this._playerGroup.add(plank);

    // Rat body
    const bodyGeo = new THREE.CapsuleGeometry(0.25, 0.5, 8, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    body.rotation.x = -0.2;
    this._playerGroup.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.22, 16, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x887766 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.7, -0.35);
    this._playerGroup.add(head);

    // Snout
    const snoutGeo = new THREE.ConeGeometry(0.1, 0.2, 12);
    const snoutMat = new THREE.MeshStandardMaterial({ color: 0xaa8877 });
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 0.65, -0.55);
    this._playerGroup.add(snout);

    // Ears
    for (const side of [-1, 1]) {
      const earGeo = new THREE.CircleGeometry(0.1, 8);
      const earMat = new THREE.MeshStandardMaterial({ color: 0xcc9988, side: THREE.DoubleSide });
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.position.set(side * 0.18, 0.88, -0.3);
      ear.rotation.y = side * 0.3;
      this._playerGroup.add(ear);
    }

    // Legs (animated)
    this._playerLegs = [];
    for (const side of [-1, 1]) {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.15, 0.15, 0.1);
      const legGeo = new THREE.CapsuleGeometry(0.05, 0.2, 4, 6);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x776655 });
      const leg = new THREE.Mesh(legGeo, legMat);
      legGroup.add(leg);
      this._playerGroup.add(legGroup);
      this._playerLegs.push(legGroup);
    }

    // Arms (animated)
    this._playerArms = [];
    for (const side of [-1, 1]) {
      const armGroup = new THREE.Group();
      armGroup.position.set(side * 0.25, 0.45, -0.1);
      const armGeo = new THREE.CapsuleGeometry(0.04, 0.18, 4, 6);
      const armMat = new THREE.MeshStandardMaterial({ color: 0x776655 });
      const arm = new THREE.Mesh(armGeo, armMat);
      armGroup.add(arm);
      this._playerGroup.add(armGroup);
      this._playerArms.push(armGroup);
    }

    // Tail
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.3, 0.3),
      new THREE.Vector3(0, 0.5, 0.8),
      new THREE.Vector3(0.1, 0.8, 1.2),
      new THREE.Vector3(0.2, 1.0, 1.5),
    ]);
    const tailGeo = new THREE.TubeGeometry(tailCurve, 12, 0.04, 6, false);
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xaa8877 });
    const tailMesh = new THREE.Mesh(tailGeo, tailMat);
    this._playerGroup.add(tailMesh);
    this._playerTail = tailMesh;

    // Eyes (beady)
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 12, 10);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x331111, emissiveIntensity: 0.5 });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.12, 0.76, -0.5);
      this._playerGroup.add(eye);
    }

    // Tiny crown (because this is a heroic rat)
    const crownGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.1, 12);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2, emissive: 0xaa8800, emissiveIntensity: 0.3 });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.set(0, 0.95, -0.3);
    this._playerGroup.add(crown);

    // Crown points
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const pointGeo = new THREE.ConeGeometry(0.03, 0.08, 10);
      const pointMesh = new THREE.Mesh(pointGeo, crownMat);
      pointMesh.position.set(Math.sin(angle) * 0.12, 1.03, -0.3 + Math.cos(angle) * 0.12);
      this._playerGroup.add(pointMesh);
    }

    this._playerGroup.position.set(LANES[1], PLAYER_Y_BASE, 0);
    this._scene.add(this._playerGroup);
  }

  // ── Tunnel Segment Generation ─────────────────────────────────────────

  private _generateSegment(zStart: number, isBoss: boolean): TunnelSegment {
    const group = new THREE.Group();
    const zEnd = zStart - TUNNEL_SEG_LENGTH;
    const theme = THEME_DEFS[this._currentTheme];

    // Tunnel walls (half-cylinder arch)
    const tunnelGeo = new THREE.CylinderGeometry(TUNNEL_RADIUS, TUNNEL_RADIUS, TUNNEL_SEG_LENGTH, 24, 1, true, 0, Math.PI);
    const tunnelMat = new THREE.MeshStandardMaterial({
      color: theme.wallColor,
      roughness: 0.95,
      metalness: 0.05,
      side: THREE.BackSide,
    });
    const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnel.rotation.z = Math.PI;
    tunnel.rotation.x = Math.PI / 2;
    tunnel.position.set(0, 0, zStart - TUNNEL_SEG_LENGTH / 2);
    group.add(tunnel);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(TUNNEL_RADIUS * 2, TUNNEL_SEG_LENGTH);
    const floorMat = new THREE.MeshStandardMaterial({ color: theme.floorColor, roughness: 0.95 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -TUNNEL_RADIUS, zStart - TUNNEL_SEG_LENGTH / 2);
    group.add(floor);

    // Brick lines
    for (let row = 0; row < 6; row++) {
      const y = -TUNNEL_RADIUS + 1 + row * 1.2;
      const lineGeo = new THREE.BoxGeometry(TUNNEL_RADIUS * 2.1, 0.03, TUNNEL_SEG_LENGTH);
      const lineMat = new THREE.MeshStandardMaterial({ color: theme.brickColor });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(0, y, zStart - TUNNEL_SEG_LENGTH / 2);
      group.add(line);
    }

    // Torches
    for (let i = 0; i < 3; i++) {
      const tz = zStart - 5 - i * 10;
      for (const side of [-1, 1]) {
        const bracketGeo = new THREE.BoxGeometry(0.15, 0.4, 0.15);
        const bracketMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6 });
        const bracket = new THREE.Mesh(bracketGeo, bracketMat);
        bracket.position.set(side * (TUNNEL_RADIUS - 0.3), 0.5, tz);
        group.add(bracket);

        const flameGeo = new THREE.SphereGeometry(0.15, 12, 10);
        const flameMat = new THREE.MeshStandardMaterial({
          color: theme.torchColor,
          emissive: theme.torchColor,
          emissiveIntensity: 2,
          transparent: true,
          opacity: 0.8,
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(side * (TUNNEL_RADIUS - 0.3), 0.8, tz);
        group.add(flame);

        const light = new THREE.PointLight(theme.torchColor, theme.torchIntensity, 12, 2);
        light.position.set(side * (TUNNEL_RADIUS - 0.5), 0.8, tz);
        group.add(light);
      }
    }

    // Stalactites
    for (let i = 0; i < 8; i++) {
      const dx = (Math.random() - 0.5) * TUNNEL_RADIUS * 1.5;
      const dz = zStart - Math.random() * TUNNEL_SEG_LENGTH;
      const stalGeo = new THREE.ConeGeometry(0.05, 0.2 + Math.random() * 0.3, 5);
      const stalMat = new THREE.MeshStandardMaterial({ color: theme.stalColor, roughness: 0.9 });
      const stal = new THREE.Mesh(stalGeo, stalMat);
      stal.rotation.x = Math.PI;
      const archY = Math.sqrt(Math.max(0, TUNNEL_RADIUS * TUNNEL_RADIUS - dx * dx));
      stal.position.set(dx, archY - 0.1, dz);
      group.add(stal);
    }

    // Wall pipes
    for (const side of [-1, 1]) {
      const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, TUNNEL_SEG_LENGTH, 8);
      const pipeMat = new THREE.MeshStandardMaterial({ color: theme.pipeColor, metalness: 0.4, roughness: 0.6 });
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(side * (TUNNEL_RADIUS - 0.6), -TUNNEL_RADIUS + 2.5, zStart - TUNNEL_SEG_LENGTH / 2);
      group.add(pipe);
    }

    // Theme-specific extra props
    if (theme.extraProps) {
      this._addThemeProps(group, zStart, this._currentTheme);
    }

    this._scene.add(group);

    const seg: TunnelSegment = {
      group, zStart, zEnd,
      obstacles: [], collectibles: [], enemies: [],
      isBoss, theme: this._currentTheme, movingDebris: [],
    };

    // Populate (skip first segment and boss segments)
    if (this._segmentsCreated > 0 && !isBoss) {
      this._populateSegment(seg);
    }

    if (isBoss) {
      this._spawnBoss(seg);
    }

    this._segmentsCreated++;
    return seg;
  }

  private _addThemeProps(group: THREE.Group, zStart: number, theme: TunnelTheme): void {
    switch (theme) {
      case "toxic": {
        // Toxic barrels along walls, dripping green puddles
        for (let i = 0; i < 3; i++) {
          const bz = zStart - 4 - i * 9;
          const side = i % 2 === 0 ? -1 : 1;
          const bGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.7, 8);
          const bMat = new THREE.MeshStandardMaterial({ color: 0x554411, roughness: 0.8 });
          const barrel = new THREE.Mesh(bGeo, bMat);
          barrel.position.set(side * (TUNNEL_RADIUS - 1.2), PLAYER_Y_BASE + 0.35, bz);
          group.add(barrel);
          // Toxic puddle glow
          const pGeo = new THREE.CircleGeometry(0.5, 8);
          const pMat = new THREE.MeshStandardMaterial({
            color: 0x33ff22, emissive: 0x22cc11, emissiveIntensity: 1.5,
            transparent: true, opacity: 0.4,
          });
          const puddle = new THREE.Mesh(pGeo, pMat);
          puddle.rotation.x = -Math.PI / 2;
          puddle.position.set(side * (TUNNEL_RADIUS - 1.2), PLAYER_Y_BASE - 0.29, bz + 0.5);
          group.add(puddle);
        }
        break;
      }
      case "catacombs": {
        // Skull niches in walls, cobwebs
        for (let i = 0; i < 4; i++) {
          const sz = zStart - 3 - i * 7;
          const side = i % 2 === 0 ? -1 : 1;
          // Skull (sphere + jaw)
          const skullGeo = new THREE.SphereGeometry(0.15, 12, 10);
          const skullMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa });
          const skull = new THREE.Mesh(skullGeo, skullMat);
          skull.position.set(side * (TUNNEL_RADIUS - 0.2), 0, sz);
          group.add(skull);
          // Eye sockets (dark spheres)
          for (const es of [-1, 1]) {
            const eyeGeo = new THREE.SphereGeometry(0.04, 12, 10);
            const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(side * (TUNNEL_RADIUS - 0.25) + es * 0.06, 0.04, sz - 0.12);
            group.add(eye);
          }
        }
        // Cobweb (thin planes)
        for (let i = 0; i < 2; i++) {
          const wz = zStart - 8 - i * 14;
          const wGeo = new THREE.PlaneGeometry(1.5, 1.5);
          const wMat = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa, transparent: true, opacity: 0.15, side: THREE.DoubleSide,
          });
          const web = new THREE.Mesh(wGeo, wMat);
          const archY = TUNNEL_RADIUS * 0.7;
          web.position.set((Math.random() - 0.5) * 2, archY, wz);
          web.rotation.set(Math.random() * 0.3, Math.random() * 0.5, Math.random() * 0.3);
          group.add(web);
        }
        break;
      }
      case "flooded": {
        // Floating debris (crates, planks along walls), blue bioluminescent mushrooms
        for (let i = 0; i < 3; i++) {
          const mz = zStart - 5 - i * 9;
          const side = i % 2 === 0 ? -1 : 1;
          // Glowing mushroom
          const stemGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.2, 12);
          const stemMat = new THREE.MeshStandardMaterial({ color: 0x445566 });
          const stem = new THREE.Mesh(stemGeo, stemMat);
          stem.position.set(side * (TUNNEL_RADIUS - 0.5), -TUNNEL_RADIUS + 1.1, mz);
          group.add(stem);
          const capGeo = new THREE.SphereGeometry(0.1, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
          const capMat = new THREE.MeshStandardMaterial({
            color: 0x4488ff, emissive: 0x2266dd, emissiveIntensity: 2,
            transparent: true, opacity: 0.8,
          });
          const cap = new THREE.Mesh(capGeo, capMat);
          cap.position.set(side * (TUNNEL_RADIUS - 0.5), -TUNNEL_RADIUS + 1.2, mz);
          group.add(cap);
          // Small glow light
          const mLight = new THREE.PointLight(0x4488ff, 0.3, 3, 2);
          mLight.position.set(side * (TUNNEL_RADIUS - 0.5), -TUNNEL_RADIUS + 1.3, mz);
          group.add(mLight);
        }
        break;
      }
    }
  }

  private _populateSegment(seg: TunnelSegment): void {
    // Difficulty never fully caps — keeps scaling slowly past 2000m
    const baseDiff = Math.min(1, this._distance / 2000);
    const lateDiff = Math.max(0, (this._distance - 2000) / 5000); // 0-1 over next 5000m
    const difficulty = baseDiff + lateDiff * 0.5; // total up to 1.5
    const baseObstacles = ["pipe_low", "pipe_high", "grate", "barrel", "chain"] as const;

    // Obstacles — keeps growing past 2000m
    const obstacleCount = 3 + Math.floor(Math.min(difficulty, 1) * 5) + Math.floor(lateDiff * 3);
    const spacing = TUNNEL_SEG_LENGTH / (obstacleCount + 1);

    for (let i = 0; i < obstacleCount; i++) {
      const z = seg.zStart - spacing * (i + 1) + (Math.random() - 0.5) * 3;
      const lane = Math.floor(Math.random() * 3) - 1;
      const type = baseObstacles[Math.floor(Math.random() * baseObstacles.length)];
      this._createObstacle(seg, type, lane, z);

      // Past 3000m: multi-lane obstacles (same z, different lanes)
      if (this._distance > 3000 && Math.random() < lateDiff * 0.3) {
        const lane2 = ((lane + 1 + Math.floor(Math.random() * 2)) % 3) - 1;
        if (lane2 !== lane) {
          this._createObstacle(seg, baseObstacles[Math.floor(Math.random() * baseObstacles.length)], lane2, z);
        }
      }
    }

    // Ramp (1 per 3 segments on average)
    if (Math.random() < 0.33) {
      const rampZ = seg.zStart - TUNNEL_SEG_LENGTH * 0.6 + (Math.random() - 0.5) * 6;
      const rampLane = Math.floor(Math.random() * 3) - 1;
      this._createObstacle(seg, "ramp", rampLane, rampZ);
    }

    // Collectibles — lines of cheese/gold
    const collectLines = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < collectLines; i++) {
      const startZ = seg.zStart - 3 - Math.random() * (TUNNEL_SEG_LENGTH - 6);
      const lane = Math.floor(Math.random() * 3) - 1;
      const count = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < count; j++) {
        const type: CollectibleType = Math.random() < 0.7 ? "cheese" : "gold";
        this._createCollectible(seg, type, lane, startZ - j * 1.5);
      }
    }

    // Heart (rare, 5% chance)
    if (Math.random() < 0.05 && this._hp < this._maxHp) {
      const hz = seg.zStart - TUNNEL_SEG_LENGTH / 2;
      const hLane = Math.floor(Math.random() * 3) - 1;
      this._createCollectible(seg, "heart", hLane, hz);
    }

    // Power-ups (rare)
    if (Math.random() < 0.18) {
      const pz = seg.zStart - TUNNEL_SEG_LENGTH / 2 + (Math.random() - 0.5) * 10;
      const pLane = Math.floor(Math.random() * 3) - 1;
      const roll = Math.random();
      const pType: CollectibleType = roll < 0.35 ? "shield" : roll < 0.65 ? "magnet" : "splash_bomb";
      this._createCollectible(seg, pType, pLane, pz);
    }

    // Enemies — more frequent and multiple past 2000m
    const enemyChance = 0.3 + Math.min(difficulty, 1) * 0.3 + lateDiff * 0.2;
    if (Math.random() < enemyChance) {
      const ez = seg.zStart - TUNNEL_SEG_LENGTH / 2 + (Math.random() - 0.5) * 8;
      const eLane = Math.floor(Math.random() * 3) - 1;
      const eType = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
      this._createEnemy(seg, eType, eLane, ez);

      // Past 2500m: occasional second enemy
      if (this._distance > 2500 && Math.random() < lateDiff * 0.4) {
        const eLane2 = ((eLane + 1 + Math.floor(Math.random() * 2)) % 3) - 1;
        const eType2 = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
        this._createEnemy(seg, eType2, eLane2, ez - 5);
      }
    }

    // Moving debris (difficulty-based, flooded theme more likely)
    const debrisChance = this._currentTheme === "flooded" ? 0.5 : 0.2;
    if (difficulty > 0.2 && Math.random() < debrisChance) {
      this._createMovingDebris(seg, seg.zStart - TUNNEL_SEG_LENGTH / 2 + (Math.random() - 0.5) * 10);
    }
  }

  // ── Obstacle Creation ─────────────────────────────────────────────────

  private _createObstacle(seg: TunnelSegment, type: ObstacleType, lane: number, z: number): void {
    const group = new THREE.Group();
    const x = LANES[lane + 1];

    switch (type) {
      case "pipe_low": {
        // Low pipe — jump over
        const geo = new THREE.CylinderGeometry(0.3, 0.3, LANE_WIDTH * 0.9, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0x667766, metalness: 0.5, roughness: 0.5 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.z = Math.PI / 2;
        mesh.position.y = PLAYER_Y_BASE + 0.3;
        group.add(mesh);
        // Drip
        const dripGeo = new THREE.SphereGeometry(0.06, 12, 10);
        const dripMat = new THREE.MeshStandardMaterial({ color: 0x44aa44, emissive: 0x226622, emissiveIntensity: 0.5, transparent: true, opacity: 0.7 });
        const drip = new THREE.Mesh(dripGeo, dripMat);
        drip.position.set(0, PLAYER_Y_BASE - 0.1, 0);
        group.add(drip);
        break;
      }
      case "pipe_high": {
        // High pipe — duck under
        const geo = new THREE.CylinderGeometry(0.35, 0.35, LANE_WIDTH * 0.9, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0x778877, metalness: 0.5, roughness: 0.5 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.z = Math.PI / 2;
        mesh.position.y = PLAYER_Y_BASE + 1.3;
        group.add(mesh);
        break;
      }
      case "grate": {
        // Floor grate — jump over
        const geo = new THREE.BoxGeometry(LANE_WIDTH * 0.8, 0.05, 1.5);
        const mat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = PLAYER_Y_BASE - 0.3;
        group.add(mesh);
        // Grate bars
        for (let b = 0; b < 5; b++) {
          const barGeo = new THREE.BoxGeometry(0.04, 0.08, 1.5);
          const bar = new THREE.Mesh(barGeo, mat);
          bar.position.set(-LANE_WIDTH * 0.35 + b * LANE_WIDTH * 0.18, PLAYER_Y_BASE - 0.25, 0);
          group.add(bar);
        }
        // Green glow from below
        const light = new THREE.PointLight(0x22ff22, 0.5, 3, 2);
        light.position.set(0, PLAYER_Y_BASE - 1, 0);
        group.add(light);
        break;
      }
      case "barrel": {
        // Toxic barrel — avoid
        const geo = new THREE.CylinderGeometry(0.4, 0.45, 0.9, 10);
        const mat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = PLAYER_Y_BASE + 0.5;
        group.add(mesh);
        // Toxic symbol (green ring)
        const ringGeo = new THREE.TorusGeometry(0.2, 0.03, 12, 12);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 1.5 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, PLAYER_Y_BASE + 0.5, -0.46);
        group.add(ring);
        break;
      }
      case "chain": {
        // Hanging chain — duck under
        for (let c = 0; c < 8; c++) {
          const linkGeo = new THREE.TorusGeometry(0.08, 0.025, 12, 8);
          const linkMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7 });
          const link = new THREE.Mesh(linkGeo, linkMat);
          link.position.y = PLAYER_Y_BASE + 2.5 - c * 0.2;
          link.rotation.x = c % 2 === 0 ? 0 : Math.PI / 2;
          group.add(link);
        }
        break;
      }
      case "ramp": {
        // Ramp — ride over for a big air bonus + collectible arc
        const rampGeo = new THREE.BoxGeometry(LANE_WIDTH * 0.85, 0.12, 2.0);
        const rampMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.7, metalness: 0.1 });
        const rampMesh = new THREE.Mesh(rampGeo, rampMat);
        rampMesh.rotation.x = -0.25; // angled up
        rampMesh.position.y = PLAYER_Y_BASE + 0.1;
        group.add(rampMesh);
        // Arrow markings
        const arrowGeo = new THREE.ConeGeometry(0.12, 0.3, 8);
        const arrowMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xaa8800, emissiveIntensity: 0.8 });
        for (let a = 0; a < 3; a++) {
          const arrow = new THREE.Mesh(arrowGeo, arrowMat);
          arrow.rotation.x = -Math.PI / 2;
          arrow.position.set(0, PLAYER_Y_BASE + 0.2, 0.3 - a * 0.5);
          group.add(arrow);
        }
        // Glow
        const rampLight = new THREE.PointLight(0xFFD700, 0.6, 4, 2);
        rampLight.position.set(0, PLAYER_Y_BASE + 0.5, 0);
        group.add(rampLight);
        break;
      }
    }

    group.position.set(x, 0, z);
    seg.group.add(group);

    // Hitbox
    const hitbox = new THREE.Box3();
    const isRamp = type === "ramp";
    const isLow = type === "pipe_low" || type === "grate";
    const isHigh = type === "pipe_high" || type === "chain";
    if (isRamp) {
      // Ramp has a special trigger hitbox (same lane, at feet level)
      hitbox.set(
        new THREE.Vector3(x - LANE_WIDTH * 0.4, PLAYER_Y_BASE - 0.5, z - 1.0),
        new THREE.Vector3(x + LANE_WIDTH * 0.4, PLAYER_Y_BASE + 0.4, z + 1.0),
      );
    } else if (isLow) {
      hitbox.set(
        new THREE.Vector3(x - LANE_WIDTH * 0.4, PLAYER_Y_BASE - 0.5, z - 0.7),
        new THREE.Vector3(x + LANE_WIDTH * 0.4, PLAYER_Y_BASE + 0.6, z + 0.7),
      );
    } else if (isHigh) {
      hitbox.set(
        new THREE.Vector3(x - LANE_WIDTH * 0.4, PLAYER_Y_BASE + 0.7, z - 0.5),
        new THREE.Vector3(x + LANE_WIDTH * 0.4, PLAYER_Y_BASE + 2.5, z + 0.5),
      );
    } else {
      hitbox.set(
        new THREE.Vector3(x - LANE_WIDTH * 0.35, PLAYER_Y_BASE - 0.3, z - 0.5),
        new THREE.Vector3(x + LANE_WIDTH * 0.35, PLAYER_Y_BASE + 1.2, z + 0.5),
      );
    }

    seg.obstacles.push({ mesh: group, type, lane, z, hitbox, cleared: false });
  }

  // ── Collectible Creation ──────────────────────────────────────────────

  private _createCollectible(seg: TunnelSegment, type: CollectibleType, lane: number, z: number): void {
    const group = new THREE.Group();
    const x = LANES[lane + 1];

    switch (type) {
      case "cheese": {
        // Cheese wedge
        const geo = new THREE.CylinderGeometry(0.2, 0.25, 0.15, 12);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xFFCC00,
          emissive: 0x886600,
          emissiveIntensity: 0.5,
          roughness: 0.6,
        });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);
        // Holes
        for (let h = 0; h < 3; h++) {
          const hGeo = new THREE.SphereGeometry(0.04, 12, 10);
          const hMat = new THREE.MeshStandardMaterial({ color: 0xCC9900 });
          const hole = new THREE.Mesh(hGeo, hMat);
          hole.position.set(
            (Math.random() - 0.5) * 0.15,
            (Math.random() - 0.5) * 0.08,
            (Math.random() - 0.5) * 0.15,
          );
          group.add(hole);
        }
        break;
      }
      case "gold": {
        const geo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 12);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xFFD700,
          metalness: 0.9,
          roughness: 0.1,
          emissive: 0xaa8800,
          emissiveIntensity: 0.6,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = Math.PI / 2;
        group.add(mesh);
        break;
      }
      case "shield": {
        const geo = new THREE.OctahedronGeometry(0.3, 0);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x44aaff,
          emissive: 0x2266cc,
          emissiveIntensity: 1,
          transparent: true,
          opacity: 0.8,
        });
        group.add(new THREE.Mesh(geo, mat));
        // Glow light
        const light = new THREE.PointLight(0x44aaff, 0.8, 4, 2);
        group.add(light);
        break;
      }
      case "magnet": {
        // U-shape magnet
        const mat = new THREE.MeshStandardMaterial({
          color: 0xff3333,
          emissive: 0xcc0000,
          emissiveIntensity: 0.8,
        });
        const leftGeo = new THREE.BoxGeometry(0.1, 0.5, 0.1);
        const left = new THREE.Mesh(leftGeo, mat);
        left.position.set(-0.15, 0, 0);
        group.add(left);
        const rightGeo = new THREE.BoxGeometry(0.1, 0.5, 0.1);
        const right = new THREE.Mesh(rightGeo, mat);
        right.position.set(0.15, 0, 0);
        group.add(right);
        const topGeo = new THREE.BoxGeometry(0.4, 0.1, 0.1);
        const top = new THREE.Mesh(topGeo, mat);
        top.position.y = 0.25;
        group.add(top);
        const light = new THREE.PointLight(0xff3333, 0.6, 3, 2);
        group.add(light);
        break;
      }
      case "splash_bomb": {
        const geo = new THREE.SphereGeometry(0.25, 16, 12);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x22ffaa,
          emissive: 0x11cc66,
          emissiveIntensity: 1.2,
          transparent: true,
          opacity: 0.85,
        });
        group.add(new THREE.Mesh(geo, mat));
        // Sparkle ring
        const ringGeo = new THREE.TorusGeometry(0.35, 0.02, 12, 16);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0x88ffcc, emissive: 0x44cc88, emissiveIntensity: 1 });
        group.add(new THREE.Mesh(ringGeo, ringMat));
        const light = new THREE.PointLight(0x22ffaa, 0.8, 5, 2);
        group.add(light);
        break;
      }
      case "heart": {
        // Heart pickup — restores 1 HP
        // Build heart from two spheres + cone
        const heartGroup = new THREE.Group();
        const hMat = new THREE.MeshStandardMaterial({
          color: 0xff2244, emissive: 0xcc1122, emissiveIntensity: 1.2,
        });
        for (const sx of [-0.08, 0.08]) {
          const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), hMat);
          lobe.position.set(sx, 0.06, 0);
          heartGroup.add(lobe);
        }
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.2, 12), hMat);
        tip.rotation.x = Math.PI;
        tip.position.set(0, -0.1, 0);
        heartGroup.add(tip);
        group.add(heartGroup);
        const hLight = new THREE.PointLight(0xff2244, 0.6, 3, 2);
        group.add(hLight);
        break;
      }
    }

    group.position.set(x, PLAYER_Y_BASE + 0.5, z);
    seg.group.add(group);

    seg.collectibles.push({
      mesh: group,
      type,
      lane,
      z,
      collected: false,
      bobPhase: Math.random() * Math.PI * 2,
    });
  }

  // ── Enemy Creation ────────────────────────────────────────────────────

  private _createEnemy(seg: TunnelSegment, type: EnemyType, lane: number, z: number): void {
    const group = new THREE.Group();
    const x = LANES[lane + 1];

    switch (type) {
      case "rat_swarm": {
        // Small dark rats swarming
        for (let i = 0; i < 5; i++) {
          const rGeo = new THREE.CapsuleGeometry(0.12, 0.2, 4, 6);
          const rMat = new THREE.MeshStandardMaterial({ color: 0x333322 });
          const rat = new THREE.Mesh(rGeo, rMat);
          rat.rotation.z = Math.PI / 2;
          rat.position.set(
            (Math.random() - 0.5) * 0.8,
            PLAYER_Y_BASE + 0.15,
            (Math.random() - 0.5) * 0.8,
          );
          group.add(rat);
          // Eyes
          const eyeGeo = new THREE.SphereGeometry(0.03, 12, 10);
          const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff0000, emissiveIntensity: 2 });
          const eye = new THREE.Mesh(eyeGeo, eyeMat);
          eye.position.set(rat.position.x, PLAYER_Y_BASE + 0.25, rat.position.z - 0.12);
          group.add(eye);
        }
        break;
      }
      case "slime": {
        const sGeo = new THREE.SphereGeometry(0.5, 16, 12);
        const sMat = new THREE.MeshStandardMaterial({
          color: 0x33cc33,
          emissive: 0x116611,
          emissiveIntensity: 0.6,
          transparent: true,
          opacity: 0.75,
          roughness: 0.2,
        });
        const slime = new THREE.Mesh(sGeo, sMat);
        slime.position.y = PLAYER_Y_BASE + 0.4;
        slime.scale.y = 0.7;
        group.add(slime);
        // Eyes
        for (const side of [-1, 1]) {
          const eyeGeo = new THREE.SphereGeometry(0.08, 12, 10);
          const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
          const eye = new THREE.Mesh(eyeGeo, eyeMat);
          eye.position.set(side * 0.18, PLAYER_Y_BASE + 0.55, -0.35);
          group.add(eye);
          const pupilGeo = new THREE.SphereGeometry(0.04, 12, 10);
          const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
          const pupil = new THREE.Mesh(pupilGeo, pupilMat);
          pupil.position.set(side * 0.18, PLAYER_Y_BASE + 0.55, -0.42);
          group.add(pupil);
        }
        const light = new THREE.PointLight(0x33cc33, 0.4, 3, 2);
        light.position.y = PLAYER_Y_BASE + 0.5;
        group.add(light);
        break;
      }
      case "croc": {
        // Crocodile snout sticking out of water
        const bodyGeo = new THREE.BoxGeometry(0.6, 0.4, 1.8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x335533, roughness: 0.8 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = PLAYER_Y_BASE + 0.1;
        group.add(body);
        // Snout
        const snoutGeo = new THREE.BoxGeometry(0.4, 0.2, 1.0);
        const snout = new THREE.Mesh(snoutGeo, bodyMat);
        snout.position.set(0, PLAYER_Y_BASE + 0.05, -1.2);
        group.add(snout);
        // Eyes
        for (const side of [-1, 1]) {
          const eyeGeo = new THREE.SphereGeometry(0.08, 12, 10);
          const eyeMat = new THREE.MeshStandardMaterial({ color: 0xccaa00, emissive: 0x886600, emissiveIntensity: 1 });
          const eye = new THREE.Mesh(eyeGeo, eyeMat);
          eye.position.set(side * 0.25, PLAYER_Y_BASE + 0.35, -0.5);
          group.add(eye);
        }
        // Teeth
        for (let t = 0; t < 6; t++) {
          const tGeo = new THREE.ConeGeometry(0.03, 0.1, 10);
          const tMat = new THREE.MeshStandardMaterial({ color: 0xeeeecc });
          const tooth = new THREE.Mesh(tGeo, tMat);
          tooth.rotation.x = Math.PI;
          tooth.position.set(
            (t % 2 === 0 ? -1 : 1) * 0.15,
            PLAYER_Y_BASE - 0.05,
            -0.9 - t * 0.12,
          );
          group.add(tooth);
        }
        break;
      }
    }

    group.position.set(x, 0, z);
    seg.group.add(group);

    const hpMap: Record<EnemyType, number> = { rat_swarm: 1, slime: 2, croc: 3 };
    seg.enemies.push({
      mesh: group,
      type,
      lane,
      z,
      hp: hpMap[type],
      maxHp: hpMap[type],
      dead: false,
      attackTimer: 0,
      hitFlash: 0,
    });
  }

  // ── Moving Debris ──────────────────────────────────────────────────────

  private _createMovingDebris(seg: TunnelSegment, z: number): void {
    const group = new THREE.Group();
    // Floating log/crate
    const isLog = Math.random() < 0.5;
    if (isLog) {
      const geo = new THREE.CylinderGeometry(0.2, 0.2, 1.8, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.z = Math.PI / 2;
      mesh.position.y = PLAYER_Y_BASE + 0.1;
      group.add(mesh);
    } else {
      const geo = new THREE.BoxGeometry(0.8, 0.5, 0.8);
      const mat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = PLAYER_Y_BASE + 0.25;
      group.add(mesh);
    }

    const startLane = (Math.random() - 0.5) * 2; // -1 to 1
    const x = startLane * LANE_WIDTH;
    group.position.set(x, 0, z);
    seg.group.add(group);

    const hitbox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, PLAYER_Y_BASE + 0.3, z),
      new THREE.Vector3(1.0, 0.8, 1.2),
    );

    seg.movingDebris.push({
      mesh: group,
      laneF: startLane,
      laneDir: (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5),
      speed: 1.5 + Math.random() * 1.5,
      z,
      hitbox,
      cleared: false,
    });
  }

  // ── Boss ──────────────────────────────────────────────────────────────

  private _spawnBoss(seg: TunnelSegment): void {
    const variant = this._pickBossVariant();
    const group = new THREE.Group();
    const z = seg.zStart - TUNNEL_SEG_LENGTH / 2;
    const tentacles: THREE.Mesh[] = [];

    switch (variant) {
      case "wyrm":
      default: {
        // Giant sewer wyrm — serpentine creature
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x446644, roughness: 0.6, emissive: 0x113311, emissiveIntensity: 0.3,
        });
        const head = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 10), bodyMat);
        head.scale.set(1, 0.8, 1.5);
        head.position.set(0, PLAYER_Y_BASE + 1, -4);
        group.add(head);
        for (const side of [-1, 1]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12),
            new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 2 }));
          eye.position.set(side * 0.7, PLAYER_Y_BASE + 1.5, -5.2);
          group.add(eye);
        }
        const maw = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x882222, emissive: 0x441111, emissiveIntensity: 0.5 }));
        maw.position.set(0, PLAYER_Y_BASE + 0.3, -5.5);
        group.add(maw);
        for (let t = 0; t < 8; t++) {
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 10),
            new THREE.MeshStandardMaterial({ color: 0xddddbb }));
          tooth.rotation.x = Math.PI;
          tooth.position.set(-0.6 + t * 0.17, PLAYER_Y_BASE + 0.55, -5.9);
          group.add(tooth);
        }
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(Math.cos(angle) * 1.5, PLAYER_Y_BASE + 0.5, -3),
            new THREE.Vector3(Math.cos(angle) * 2.5, PLAYER_Y_BASE + 1.5, -1),
            new THREE.Vector3(Math.cos(angle) * 3, PLAYER_Y_BASE + 0.5, 1),
          ]);
          const tent = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.15, 6, false),
            new THREE.MeshStandardMaterial({ color: 0x557755, emissive: 0x113311, emissiveIntensity: 0.3 }));
          group.add(tent);
          tentacles.push(tent);
        }
        const bossLight = new THREE.PointLight(0xff4422, 2, 15, 1.5);
        bossLight.position.set(0, PLAYER_Y_BASE + 2, -4);
        group.add(bossLight);
        break;
      }

      case "toxic_spawn": {
        // Toxic Spawn — pulsing blob of toxic waste with dripping appendages
        const blobMat = new THREE.MeshStandardMaterial({
          color: 0x44ff44, roughness: 0.3, emissive: 0x22cc22, emissiveIntensity: 0.8,
          transparent: true, opacity: 0.85,
        });
        // Main blob body
        const blob = new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 12), blobMat);
        blob.scale.set(1.2, 0.9, 1.3);
        blob.position.set(0, PLAYER_Y_BASE + 1.2, -4);
        group.add(blob);
        // Toxic bubbles (smaller spheres orbiting)
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 16, 12),
            new THREE.MeshStandardMaterial({ color: 0x88ff88, emissive: 0x44cc44, emissiveIntensity: 1, transparent: true, opacity: 0.6 }));
          bubble.position.set(Math.cos(angle) * 1.8, PLAYER_Y_BASE + 0.8 + Math.sin(angle) * 0.5, -4 + Math.sin(angle) * 1.5);
          group.add(bubble);
        }
        // Toxic eyes (3 eyes scattered on body)
        for (let i = 0; i < 3; i++) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12),
            new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xcc00cc, emissiveIntensity: 2 }));
          eye.position.set(-0.6 + i * 0.6, PLAYER_Y_BASE + 1.6, -5);
          group.add(eye);
        }
        // Dripping tentacle arms
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(Math.cos(angle) * 1.2, PLAYER_Y_BASE + 0.8, -3.5),
            new THREE.Vector3(Math.cos(angle) * 2.2, PLAYER_Y_BASE + 0.3, -1.5),
            new THREE.Vector3(Math.cos(angle) * 2.8, WATER_Y + 0.2, 0.5),
          ]);
          const tent = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.12, 5, false),
            new THREE.MeshStandardMaterial({ color: 0x66ff66, emissive: 0x33aa33, emissiveIntensity: 0.5 }));
          group.add(tent);
          tentacles.push(tent);
        }
        const toxicLight = new THREE.PointLight(0x44ff44, 3, 15, 1.5);
        toxicLight.position.set(0, PLAYER_Y_BASE + 2, -4);
        group.add(toxicLight);
        break;
      }

      case "croc_titan": {
        // Croc Titan — armored crocodile head filling the tunnel
        const armorMat = new THREE.MeshStandardMaterial({
          color: 0x556655, roughness: 0.8, metalness: 0.3, emissive: 0x112211, emissiveIntensity: 0.2,
        });
        // Massive head/snout
        const snout = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 3), armorMat);
        snout.position.set(0, PLAYER_Y_BASE + 0.8, -4.5);
        group.add(snout);
        // Upper jaw ridge
        const ridge = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 2.5),
          new THREE.MeshStandardMaterial({ color: 0x667766, roughness: 0.9, metalness: 0.4 }));
        ridge.position.set(0, PLAYER_Y_BASE + 1.5, -4);
        group.add(ridge);
        // Armored plates on top
        for (let i = 0; i < 4; i++) {
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.6),
            new THREE.MeshStandardMaterial({ color: 0x445544, metalness: 0.5, roughness: 0.7 }));
          plate.position.set((i - 1.5) * 0.7, PLAYER_Y_BASE + 1.8, -3.5 - i * 0.3);
          plate.rotation.z = (i - 1.5) * 0.1;
          group.add(plate);
        }
        // Red eyes
        for (const side of [-1, 1]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12),
            new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff0000, emissiveIntensity: 3 }));
          eye.position.set(side * 1, PLAYER_Y_BASE + 1.4, -5.5);
          group.add(eye);
        }
        // Massive teeth (jaws)
        for (let t = 0; t < 10; t++) {
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 10),
            new THREE.MeshStandardMaterial({ color: 0xeeeecc }));
          tooth.rotation.x = Math.PI;
          tooth.position.set(-1 + t * 0.22, PLAYER_Y_BASE + 0.15, -6);
          group.add(tooth);
        }
        // Tail-like appendages as tentacles (used for swiping)
        for (let i = 0; i < 3; i++) {
          const sx = (i - 1) * 1.5;
          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(sx, PLAYER_Y_BASE + 0.5, -2),
            new THREE.Vector3(sx * 1.5, PLAYER_Y_BASE + 1, 0),
            new THREE.Vector3(sx * 2, PLAYER_Y_BASE + 0.3, 2),
          ]);
          const tent = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.2, 6, false), armorMat);
          group.add(tent);
          tentacles.push(tent);
        }
        const crocLight = new THREE.PointLight(0xff2200, 2, 12, 1.5);
        crocLight.position.set(0, PLAYER_Y_BASE + 2, -5);
        group.add(crocLight);
        break;
      }

      case "slime_amalgam": {
        // Slime Amalgam — towering mass of fused slime creatures
        const slimeMat = new THREE.MeshStandardMaterial({
          color: 0x8844cc, roughness: 0.2, emissive: 0x6622aa, emissiveIntensity: 0.6,
          transparent: true, opacity: 0.75,
        });
        // Stacked blob tower
        for (let i = 0; i < 4; i++) {
          const r = 1.3 - i * 0.2;
          const blob = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), slimeMat);
          blob.scale.set(1, 0.7, 1);
          blob.position.set(Math.sin(i * 1.2) * 0.3, PLAYER_Y_BASE + i * 0.8 + 0.5, -4);
          group.add(blob);
        }
        // Absorbed creature faces (small spheres with eyes)
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const face = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xcccccc, emissiveIntensity: 1 }));
          face.position.set(Math.cos(angle) * 1.1, PLAYER_Y_BASE + 0.5 + i * 0.5, -4 + Math.sin(angle) * 0.8);
          group.add(face);
          // Tiny pupil
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10),
            new THREE.MeshStandardMaterial({ color: 0x000000 }));
          pupil.position.copy(face.position);
          pupil.position.z -= 0.15;
          group.add(pupil);
        }
        // Slime tendrils
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(Math.cos(angle) * 1, PLAYER_Y_BASE + 1, -3.5),
            new THREE.Vector3(Math.cos(angle) * 2, PLAYER_Y_BASE + 0.5 + Math.sin(i) * 0.5, -1.5),
            new THREE.Vector3(Math.cos(angle) * 2.5, WATER_Y + 0.3, 0.5),
          ]);
          const tent = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.1, 5, false),
            new THREE.MeshStandardMaterial({ color: 0xaa66dd, emissive: 0x7733bb, emissiveIntensity: 0.4, transparent: true, opacity: 0.6 }));
          group.add(tent);
          tentacles.push(tent);
        }
        const slimeLight = new THREE.PointLight(0xaa44ff, 2.5, 15, 1.5);
        slimeLight.position.set(0, PLAYER_Y_BASE + 2.5, -4);
        group.add(slimeLight);
        break;
      }
    }

    group.position.set(0, 0, z);
    seg.group.add(group);

    const bossNum = Math.floor(this._distance / this._bossEvery) + 1;
    // Different variants get different HP bonuses
    const variantHpMult = variant === "croc_titan" ? 1.3 : variant === "slime_amalgam" ? 1.1 : 1;
    const baseHp = Math.floor((20 + bossNum * 10) * variantHpMult);
    this._boss = {
      active: true,
      mesh: group,
      hp: baseHp,
      maxHp: baseHp,
      phase: 0,
      timer: 0,
      attackPattern: 0,
      tentacles,
      hitFlash: 0,
      variant,
    };
  }

  // ── HUD ───────────────────────────────────────────────────────────────

  private _createHUD(): void {
    if (this._hudBuilt) return;

    this._hud = document.createElement("div");
    this._hud.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:20;pointer-events:none;font-family:'Trebuchet MS',sans-serif;color:#eee;";

    // Score
    this._hudScore = document.createElement("div");
    this._hudScore.style.cssText = "position:absolute;top:16px;left:50%;transform:translateX(-50%);font-size:28px;font-weight:bold;text-shadow:0 2px 8px rgba(0,0,0,0.8);";
    this._hud.appendChild(this._hudScore);

    // Cheese counter
    this._hudCheese = document.createElement("div");
    this._hudCheese.style.cssText = "position:absolute;top:16px;left:20px;font-size:20px;text-shadow:0 2px 6px rgba(0,0,0,0.8);";
    this._hud.appendChild(this._hudCheese);

    // Gold counter
    this._hudGold = document.createElement("div");
    this._hudGold.style.cssText = "position:absolute;top:44px;left:20px;font-size:18px;color:#FFD700;text-shadow:0 2px 6px rgba(0,0,0,0.8);";
    this._hud.appendChild(this._hudGold);

    // HP
    this._hudHp = document.createElement("div");
    this._hudHp.style.cssText = "position:absolute;top:16px;right:20px;font-size:22px;text-shadow:0 2px 6px rgba(0,0,0,0.8);";
    this._hud.appendChild(this._hudHp);

    // Combo
    this._hudCombo = document.createElement("div");
    this._hudCombo.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:48px;font-weight:bold;text-shadow:0 3px 12px rgba(0,0,0,0.9);opacity:0;transition:opacity 0.15s;";
    this._hud.appendChild(this._hudCombo);

    // Power-up indicator
    this._hudPowerup = document.createElement("div");
    this._hudPowerup.style.cssText = "position:absolute;bottom:80px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:bold;text-shadow:0 2px 8px rgba(0,0,0,0.8);";
    this._hud.appendChild(this._hudPowerup);

    // Boss HP bar
    this._hudBossHp = document.createElement("div");
    this._hudBossHp.style.cssText = "position:absolute;bottom:30px;left:50%;transform:translateX(-50%);width:300px;height:16px;background:rgba(0,0,0,0.6);border:2px solid #882222;border-radius:8px;overflow:hidden;display:none;";
    this._hudBossHpBar = document.createElement("div");
    this._hudBossHpBar.style.cssText = "width:100%;height:100%;background:linear-gradient(90deg,#cc2222,#ff4444);transition:width 0.2s;";
    this._hudBossHp.appendChild(this._hudBossHpBar);
    this._hud.appendChild(this._hudBossHp);

    // Speed indicator
    this._hudSpeed = document.createElement("div");
    this._hudSpeed.style.cssText = "position:absolute;bottom:16px;right:20px;font-size:14px;color:#88aa88;text-shadow:0 2px 6px rgba(0,0,0,0.8);";
    this._hud.appendChild(this._hudSpeed);

    // Milestone popup (center, large)
    this._hudMilestone = document.createElement("div");
    this._hudMilestone.style.cssText = "position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);font-size:36px;font-weight:bold;text-shadow:0 0 20px rgba(255,215,0,0.6);color:#FFD700;opacity:0;transition:opacity 0.3s;pointer-events:none;text-align:center;";
    this._hud.appendChild(this._hudMilestone);

    // Distance bar (thin bar at bottom)
    this._hudDistBar = document.createElement("div");
    this._hudDistBar.style.cssText = "position:absolute;bottom:0;left:0;height:4px;background:linear-gradient(90deg,#44cc66,#FFD700);transition:width 0.5s;width:0%;";
    this._hud.appendChild(this._hudDistBar);

    // Vignette
    this._vignetteEl = document.createElement("div");
    this._vignetteEl.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:15;background:radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%);";
    document.getElementById("pixi-container")!.appendChild(this._vignetteEl);

    document.getElementById("pixi-container")!.appendChild(this._hud);
    this._hudBuilt = true;
  }

  private _updateHUD(): void {
    this._hudScore.textContent = `${Math.floor(this._score)}`;
    this._hudCheese.innerHTML = `&#x1F9C0; ${this._cheese}`;
    this._hudGold.textContent = `GOLD: ${this._gold}  |  ${Math.floor(this._distance)}m`;

    // HP as hearts
    let hearts = "";
    for (let i = 0; i < this._maxHp; i++) {
      hearts += i < this._hp ? "\u2764\uFE0F" : "\uD83D\uDDA4";
    }
    this._hudHp.innerHTML = hearts;

    // Speed
    this._hudSpeed.textContent = `${Math.floor(this._speed)} m/s`;

    // Power-ups
    const powers: string[] = [];
    if (this._shieldTimer > 0) powers.push(`SHIELD ${this._shieldTimer.toFixed(1)}s`);
    if (this._magnetTimer > 0) powers.push(`MAGNET ${this._magnetTimer.toFixed(1)}s`);
    if (this._splashBombReady) powers.push("SPLASH BOMB [SPACE]");
    if (this._hasRevive) powers.push("SECOND WIND");
    if (this._feverActive) powers.push(`FEVER ${Math.max(0, 10 - this._feverTimer).toFixed(1)}s`);
    if (this._comboMult > 1.1) powers.push(`${this._comboMult.toFixed(1)}x MULT`);
    this._hudPowerup.textContent = powers.join("  |  ");
    this._hudPowerup.style.color = this._feverActive ? "#ff4400" : this._shieldTimer > 0 ? "#44aaff" : this._magnetTimer > 0 ? "#ff4444" : "#22ffaa";

    // Boss HP
    if (this._boss.active) {
      this._hudBossHp.style.display = "block";
      this._hudBossHpBar.style.width = `${(this._boss.hp / this._boss.maxHp) * 100}%`;
      // Variant-specific bar color
      const barColor = this._boss.variant === "toxic_spawn" ? "linear-gradient(90deg,#22aa22,#44ff44)" :
        this._boss.variant === "croc_titan" ? "linear-gradient(90deg,#886622,#cc9944)" :
        this._boss.variant === "slime_amalgam" ? "linear-gradient(90deg,#6622aa,#aa44ff)" :
        "linear-gradient(90deg,#cc2222,#ff4444)";
      this._hudBossHpBar.style.background = barColor;
    } else {
      this._hudBossHp.style.display = "none";
    }

    // Milestone popup
    if (this._milestonePopupTimer > 0) {
      this._hudMilestone.textContent = this._milestonePopup;
      this._hudMilestone.style.opacity = String(Math.min(1, this._milestonePopupTimer * 2));
    } else {
      this._hudMilestone.style.opacity = "0";
    }

    // Distance bar — progress toward next milestone
    const nextMilestone = this._milestones.find(m => !m.given);
    if (nextMilestone) {
      const prevDist = this._milestones.filter(m => m.given).reduce((max, m) => Math.max(max, m.distance), 0);
      const progress = Math.min(1, (this._distance - prevDist) / (nextMilestone.distance - prevDist));
      this._hudDistBar.style.width = `${progress * 100}%`;
    } else {
      this._hudDistBar.style.width = "100%";
    }
  }

  // ── Title Screen ──────────────────────────────────────────────────────

  private _showTitle(): void {
    this._phase = "title";
    this._hudCombo.style.opacity = "0";
    this._hudScore.innerHTML = `
      <div style="text-align:center;margin-top:25vh;">
        <div style="font-size:64px;font-weight:bold;color:#44cc66;text-shadow:0 0 30px rgba(40,180,80,0.6);">SEWER SPLASH</div>
        <div style="font-size:20px;color:#88aa88;margin-top:12px;">Ride the sewers beneath Camelot</div>
        <div style="font-size:16px;color:#667766;margin-top:8px;">A / D or Arrow Keys: Switch lanes</div>
        <div style="font-size:16px;color:#667766;">W or Up: Jump &nbsp;&nbsp; S or Down: Duck</div>
        <div style="font-size:16px;color:#667766;">Space: Splash Bomb &nbsp;&nbsp; ESC: Quit</div>
        <div style="font-size:14px;color:#556655;margin-top:16px;">Best: ${this._bestScore} pts | ${this._bestDistance}m | Gold: ${this._totalGold}</div>
        <div style="font-size:13px;color:#445544;margin-top:4px;">Biomes: Sewer → Toxic → Catacombs → Flooded (every 300m)</div>
        <div style="font-size:22px;color:#ccddcc;margin-top:24px;animation:pulse 1.5s infinite;">Click or press ENTER to surf!</div>
      </div>
    `;
    // Add pulse animation
    const style = document.createElement("style");
    style.textContent = `@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`;
    this._hud.appendChild(style);
  }

  // ── Death Screen ──────────────────────────────────────────────────────

  private _showDeath(): void {
    this._phase = "dead";
    this._stopMusic();

    // Persist gold
    this._totalGold += this._gold;
    this._saveUpgrades();

    // Save best
    if (this._score > this._bestScore) {
      this._bestScore = Math.floor(this._score);
      localStorage.setItem("sewer_splash_best", String(this._bestScore));
    }
    if (this._distance > this._bestDistance) {
      this._bestDistance = Math.floor(this._distance);
      localStorage.setItem("sewer_splash_dist", String(this._bestDistance));
    }

    // Build shop HTML
    let shopHtml = `<div style="margin-top:12px;text-align:left;display:inline-block;">`;
    shopHtml += `<div style="font-size:16px;color:#FFD700;margin-bottom:8px;">UPGRADE SHOP (Total Gold: ${this._totalGold})</div>`;
    for (const up of SHOP_UPGRADES) {
      const lvl = this._getUpgrade(up.id);
      const maxed = lvl >= up.maxLevel;
      const canAfford = this._totalGold >= up.cost;
      const color = maxed ? "#666" : canAfford ? "#ccddcc" : "#884444";
      const label = maxed ? "MAX" : `${up.cost}g`;
      shopHtml += `<div style="color:${color};font-size:14px;margin:4px 0;pointer-events:auto;cursor:${maxed ? "default" : "pointer"};" `
        + `data-upgrade="${up.id}">`
        + `[${label}] ${up.name} (${lvl}/${up.maxLevel}) — ${up.desc}</div>`;
    }
    shopHtml += `</div>`;

    this._hudScore.style.pointerEvents = "auto";
    this._hudScore.innerHTML = `
      <div style="text-align:center;margin-top:12vh;">
        <div style="font-size:48px;font-weight:bold;color:#cc4444;text-shadow:0 0 20px rgba(200,50,50,0.5);">WIPEOUT!</div>
        <div style="font-size:24px;color:#ddd;margin-top:12px;">Score: ${Math.floor(this._score)}</div>
        <div style="font-size:16px;color:#aaa;margin-top:4px;">Distance: ${Math.floor(this._distance)}m | Cheese: ${this._cheese} | Combo: ${this._maxCombo}x</div>
        <div style="font-size:14px;color:#888;margin-top:4px;">Best: ${this._bestScore} pts | ${this._bestDistance}m</div>
        ${shopHtml}
        <div style="font-size:20px;color:#ccddcc;margin-top:16px;animation:pulse 1.5s infinite;">Click ENTER to retry | ESC to quit</div>
      </div>
    `;

    // Bind shop click events via delegation (no per-element listeners)
    const shopHandler = (e: Event) => {
      const target = (e.target as HTMLElement).closest("[data-upgrade]") as HTMLElement | null;
      if (!target) return;
      e.stopPropagation();
      this._buyUpgrade(target.dataset.upgrade!);
      // Re-render after purchase
      this._hudScore.removeEventListener("click", shopHandler);
    };
    setTimeout(() => {
      if (this._destroyed) return;
      this._hudScore.addEventListener("click", shopHandler);
    }, 50);
  }

  private _buyUpgrade(id: string): void {
    const def = SHOP_UPGRADES.find(u => u.id === id);
    if (!def) return;
    const lvl = this._getUpgrade(id);
    if (lvl >= def.maxLevel) return;
    if (this._totalGold < def.cost) return;

    this._totalGold -= def.cost;
    this._upgradeLevels[id] = lvl + 1;
    this._saveUpgrades();
    this._playSound("gold");

    // Re-render death screen to reflect changes
    this._showDeath();
  }

  // ── Start Game ────────────────────────────────────────────────────────

  private _startGame(): void {
    // Apply persistent upgrades
    const extraHp = this._getUpgrade("extra_hp");
    const slowStart = this._getUpgrade("slow_start");

    // Reset state
    this._speed = BASE_SPEED - slowStart * 2;
    this._distance = 0;
    this._score = 0;
    this._cheese = 0;
    this._gold = 0;
    this._combo = 0;
    this._maxCombo = 0;
    this._hp = 3 + extraHp;
    this._maxHp = 3 + extraHp;
    this._invincibleTimer = 0;
    this._shieldTimer = 0;
    this._magnetTimer = 0;
    this._splashBombReady = false;
    this._hasRevive = this._getUpgrade("revive") > 0;
    this._playerLane = 1;
    this._playerX = LANES[1];
    this._playerY = PLAYER_Y_BASE;
    this._playerVelY = 0;
    this._isJumping = false;
    this._isDucking = false;
    this._duckTimer = 0;
    this._playerTilt = 0;
    this._nextSegZ = 0;
    this._nextBossAt = 500;
    this._segmentsCreated = 0;
    this._boss = { active: false, mesh: null, hp: 0, maxHp: 0, phase: 0, timer: 0, attackPattern: 0, tentacles: [], hitFlash: 0, variant: "wyrm" };
    this._feverActive = false;
    this._feverTimer = 0;
    this._airTrickDone = false;
    this._airTrickSpin = 0;
    this._comboMult = 1;
    this._bossCount = 0;
    this._newBestFlash = false;

    // Theme reset
    this._currentTheme = "sewer";
    this._themeIndex = 0;
    this._lastThemeChangeDist = 0;

    // Milestones reset
    this._milestones = MILESTONE_DEFS.map(m => ({ ...m, given: false }));
    this._milestonePopup = "";
    this._milestonePopupTimer = 0;

    // Water level reset
    this._waterLevel = WATER_Y;
    this._waterLevelTarget = WATER_Y;
    this._waterRiseTimer = 0;

    // Clear old segments
    for (const seg of this._segments) {
      this._scene.remove(seg.group);
    }
    this._segments = [];

    // Build player
    if (this._playerGroup) this._scene.remove(this._playerGroup);
    this._buildPlayer();
    this._buildShieldBubble();

    // Generate initial tunnel
    for (let i = -TUNNEL_SEGMENTS_BEHIND; i < TUNNEL_SEGMENTS_AHEAD; i++) {
      const z = -i * TUNNEL_SEG_LENGTH;
      const seg = this._generateSegment(z, false);
      this._segments.push(seg);
      this._nextSegZ = z - TUNNEL_SEG_LENGTH;
    }

    // Reset HUD
    this._hudScore.innerHTML = "";
    this._hudScore.style.cssText = "position:absolute;top:16px;left:50%;transform:translateX(-50%);font-size:28px;font-weight:bold;text-shadow:0 2px 8px rgba(0,0,0,0.8);";

    // Start countdown
    this._countdownTimer = 3.0;
    this._countdownPhase = "3";
    this._phase = "playing";
    this._playSound("start");
    this._startMusic();
    this._applyUpgradeVisuals();
  }

  // ── Input ─────────────────────────────────────────────────────────────

  private _bindInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      this._keys.add(e.code);

      if (this._phase === "title" || this._phase === "dead") {
        if (e.code === "Enter" || e.code === "Space") {
          this._startGame();
          return;
        }
      }

      if (e.code === "Escape") {
        if (this._phase === "playing" || this._phase === "boss") {
          window.dispatchEvent(new Event("sewerSplashExit"));
          return;
        }
        if (this._phase === "title" || this._phase === "dead") {
          window.dispatchEvent(new Event("sewerSplashExit"));
          return;
        }
      }

      if (this._phase !== "playing" && this._phase !== "boss") return;

      // Lane switching
      if (e.code === "KeyA" || e.code === "ArrowLeft") {
        if (this._playerLane > 0) {
          this._playerLane--;
          this._playSound("swoosh");
        }
      }
      if (e.code === "KeyD" || e.code === "ArrowRight") {
        if (this._playerLane < 2) {
          this._playerLane++;
          this._playSound("swoosh");
        }
      }

      // Jump
      if ((e.code === "KeyW" || e.code === "ArrowUp") && !this._isJumping) {
        this._isJumping = true;
        this._playerVelY = JUMP_VELOCITY;
        this._isDucking = false;
        this._duckTimer = 0;
        this._emitSplash(this._playerX, WATER_Y, this._playerGroup.position.z, 15);
        this._playSound("jump");
      }

      // Duck
      if ((e.code === "KeyS" || e.code === "ArrowDown") && !this._isJumping) {
        this._isDucking = true;
        this._duckTimer = DUCK_DURATION;
      }

      // Splash bomb
      if (e.code === "Space" && this._splashBombReady) {
        this._useSplashBomb();
      }

      // Air trick — press A+D (or left+right) simultaneously while jumping
      if (this._isJumping && !this._airTrickDone) {
        if ((this._keys.has("KeyA") || this._keys.has("ArrowLeft")) &&
            (this._keys.has("KeyD") || this._keys.has("ArrowRight"))) {
          this._airTrickInput = true;
        }
      }
    };

    this._onKeyUp = (e: KeyboardEvent) => {
      this._keys.delete(e.code);
    };

    this._onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this._camera.aspect = w / h;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(w, h);
    };

    this._onClick = (e: MouseEvent) => {
      if (this._phase === "title") {
        this._startGame();
      }
      // On death screen, only Enter starts (not click, which could be buying upgrades)
      if (this._phase === "dead") {
        // Only start if clicking outside the shop area
        const target = e.target as HTMLElement;
        if (!target.dataset.upgrade) {
          // Don't auto-start on click in dead screen - use Enter key
        }
      }
    };

    // Touch controls
    this._onTouchStart = (e: TouchEvent) => {
      if (this._phase === "title" || this._phase === "dead") {
        this._startGame();
        return;
      }
      if (e.touches.length > 0) {
        const t = e.touches[0];
        this._swipeStart = { x: t.clientX, y: t.clientY };
        this._touchId = t.identifier;
      }
    };

    this._onTouchMove = (e: TouchEvent) => {
      if (!this._swipeStart) return;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (t.identifier === this._touchId) {
          const dx = t.clientX - this._swipeStart!.x;
          const dy = t.clientY - this._swipeStart!.y;
          const threshold = 40;

          if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0 && this._playerLane < 2) { this._playerLane++; this._playSound("swoosh"); }
            else if (dx < 0 && this._playerLane > 0) { this._playerLane--; this._playSound("swoosh"); }
            this._swipeStart = { x: t.clientX, y: t.clientY };
          } else if (dy < -threshold && Math.abs(dy) > Math.abs(dx) && !this._isJumping) {
            this._isJumping = true;
            this._playerVelY = JUMP_VELOCITY;
            this._emitSplash(this._playerX, WATER_Y, this._playerGroup.position.z, 15);
            this._playSound("jump");
            this._swipeStart = null;
          } else if (dy > threshold && Math.abs(dy) > Math.abs(dx) && !this._isJumping) {
            this._isDucking = true;
            this._duckTimer = DUCK_DURATION;
            this._swipeStart = null;
          }
        }
      }
    };

    this._onTouchEnd = () => {
      this._swipeStart = null;
      this._touchId = null;
    };

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("resize", this._onResize);
    window.addEventListener("touchstart", this._onTouchStart, { passive: true });
    window.addEventListener("touchmove", this._onTouchMove, { passive: true });
    window.addEventListener("touchend", this._onTouchEnd);
    window.addEventListener("click", this._onClick);
  }

  // ── Splash Bomb ───────────────────────────────────────────────────────

  private _useSplashBomb(): void {
    this._splashBombReady = false;
    this._playSound("bomb");
    this._cameraShake = 0.8;
    this._screenFlashTimer = 0.3;
    this._screenFlashColor = 0x22ffaa;

    // Giant splash
    this._emitSplash(this._playerX, WATER_Y, this._playerGroup.position.z, 60, new THREE.Color(0x22ffaa));

    // Kill all nearby enemies
    for (const seg of this._segments) {
      for (const enemy of seg.enemies) {
        if (!enemy.dead && Math.abs(enemy.z - this._playerGroup.position.z) < 20) {
          enemy.hp = 0;
          enemy.dead = true;
          enemy.mesh.visible = false;
          this._addScore(50);
          this._combo++;
        }
      }
    }

    // Damage boss
    if (this._boss.active) {
      this._boss.hp -= 5;
      this._boss.hitFlash = 0.3;
      if (this._boss.hp <= 0) {
        this._defeatBoss();
      }
    }
  }

  // ── Boss Defeat ───────────────────────────────────────────────────────

  private _defeatBoss(): void {
    this._boss.active = false;
    this._addScore(300);
    this._gold += 50;
    this._hp = Math.min(this._hp + 1, this._maxHp);
    this._cameraShake = 1.5;
    this._screenFlashTimer = 0.6;
    this._screenFlashColor = 0xFFD700;
    this._playSound("boss_defeat");

    // Massive death explosion — multiple splash bursts
    if (this._boss.mesh) {
      const bz = this._boss.mesh.position.z;
      const bx = this._boss.mesh.position.x;
      const deathColor = this._boss.variant === "toxic_spawn" ? 0x44ff44 :
        this._boss.variant === "slime_amalgam" ? 0xaa44ff :
        this._boss.variant === "croc_titan" ? 0x886644 : 0xff4422;
      this._emitSplash(bx, WATER_Y, bz, 60, new THREE.Color(deathColor));
      this._emitSplash(bx - 2, WATER_Y, bz + 1, 30, new THREE.Color(0xFFD700));
      this._emitSplash(bx + 2, WATER_Y, bz - 1, 30, new THREE.Color(deathColor));
    }

    // Reset boss phase for next boss
    this._bossPhaseAnnounced = [false, false, false];
    this._bossMoveSide = 0;
    this._bossMoveDir = 1;

    const defeatName = { wyrm: "WYRM", toxic_spawn: "TOXIC SPAWN", croc_titan: "CROC TITAN", slime_amalgam: "SLIME AMALGAM" }[this._boss.variant];
    this._milestonePopup = `${defeatName} DEFEATED!`;
    this._milestonePopupTimer = 3;
    this._screenZoomPulse = 0.4;

    this._nextBossAt = this._distance + this._bossEvery;
    this._phase = "playing";
  }

  // ── Main Update ───────────────────────────────────────────────────────

  private _update(): void {
    if (this._phase === "title" || this._phase === "dead" || this._phase === "paused") {
      this._updateWater();
      this._tickAmbientDrip();
      return;
    }

    // Death slow-mo sequence
    if (this._deathSlowMo) {
      this._updateCamera(); // camera spiral
      this._updateParticles();
      this._updateWater();
      return;
    }

    if (this._phase === "playing" || this._phase === "boss") {
      // Countdown freeze
      if (this._countdownPhase !== "done") {
        this._updateCountdown();
        this._updateWater();
        this._updateCamera();
        this._updateHUD();
        return;
      }

      this._updateMovement();
      this._updatePlayer();
      this._updateTunnel();
      this._updateCollisions();
      this._updateCollectibles();
      this._updateEnemies();
      this._updateMovingDebris();
      if (this._boss.active) this._updateBoss();
      this._updateParticles();
      this._updateWater();
      this._updateCamera();
      this._updateTimers();
      this._updateShieldBubble();
      this._updateSpeedStreaks();
      this._updateMilestones();
      this._updateTheme();
      this._updateWaterLevel();
      this._updatePlayerAnim();
      this._updateFever();
      this._updateMusic();
      this._updateScreenZoom();
      this._tickAmbientDrip();
      this._updateHUD();

      // Speed penalty recovery
      if (this._speedPenaltyTimer > 0) {
        this._speedPenaltyTimer -= this._dt;
      }

      // Increase speed (slower during penalty)
      const speedRamp = this._speedPenaltyTimer > 0 ? SPEED_RAMP * 0.3 : SPEED_RAMP;
      this._speed = Math.min(MAX_SPEED, this._speed + speedRamp * this._dt);

      // Distance & score
      this._distance += this._speed * this._dt;
      this._score += this._speed * this._dt * 0.5 * this._comboMult;

      // New best detection
      if (!this._newBestFlash && this._score > this._bestScore && this._bestScore > 0) {
        this._newBestFlash = true;
        this._screenFlashTimer = 0.4;
        this._screenFlashColor = 0xFFD700;
        this._milestonePopup = "NEW BEST!";
        this._milestonePopupTimer = 2.5;
        this._playSound("boss_defeat");
      }
    }
  }

  // ── Movement ──────────────────────────────────────────────────────────

  private _updateMovement(): void {
    const dt = this._dt;

    // Smoothly move to target lane
    const targetX = LANES[this._playerLane];
    const dx = targetX - this._playerX;
    this._playerX += dx * this._laneChangeSpeed * dt;
    if (Math.abs(dx) < 0.01) this._playerX = targetX;

    // Tilt on lane change
    this._playerTilt += (dx * 0.3 - this._playerTilt) * 8 * dt;

    // Jump physics
    if (this._isJumping) {
      this._playerVelY -= GRAVITY * dt;
      this._playerY += this._playerVelY * dt;
      if (this._playerY <= PLAYER_Y_BASE) {
        this._playerY = PLAYER_Y_BASE;
        this._playerVelY = 0;
        this._isJumping = false;
        // Landing splash
        this._emitSplash(this._playerX, WATER_Y, this._playerGroup.position.z, 10);
        this._playSound("splash");
      }
    }

    // Duck timer
    if (this._isDucking) {
      this._duckTimer -= dt;
      if (this._duckTimer <= 0) {
        this._isDucking = false;
      }
    }
  }

  private _updatePlayer(): void {
    if (!this._playerGroup) return;

    this._playerGroup.position.x = this._playerX;
    this._playerGroup.position.y = this._playerY;

    // Duck: scale Y down
    if (this._isDucking) {
      this._playerGroup.scale.y = 0.4;
    } else {
      this._playerGroup.scale.y += (1 - this._playerGroup.scale.y) * 10 * this._dt;
    }

    // Tilt
    this._playerGroup.rotation.z = this._playerTilt;

    // Bob on water
    if (!this._isJumping) {
      this._playerGroup.position.y += Math.sin(this._time * 3) * 0.05;
    }

    // Air trick
    if (this._isJumping && this._airTrickInput && !this._airTrickDone) {
      this._airTrickDone = true;
      this._airTrickInput = false;
      this._airTrickSpin = 0;
      this._combo += 5;
      this._addScore(75);
      if (this._combo > this._maxCombo) this._maxCombo = this._combo;
      this._showCombo();
      this._milestonePopup = "AIR TRICK!";
      this._milestonePopupTimer = 1;
      this._playSound("ramp");
      this._emitSplash(this._playerX, this._playerY, 0, 15, new THREE.Color(0xFFD700));
    }

    // Spin animation during trick
    if (this._airTrickDone && this._isJumping) {
      this._airTrickSpin += this._dt * 12;
      this._playerGroup.rotation.y = this._airTrickSpin;
    } else {
      this._playerGroup.rotation.y *= 0.9; // settle back
      if (Math.abs(this._playerGroup.rotation.y) < 0.01) this._playerGroup.rotation.y = 0;
    }

    // Reset trick flag on landing
    if (!this._isJumping) {
      this._airTrickDone = false;
      this._airTrickInput = false;
    }

    // Invincibility flash
    if (this._invincibleTimer > 0) {
      this._playerGroup.visible = Math.floor(this._time * 15) % 2 === 0;
    } else {
      this._playerGroup.visible = true;
    }

    // Fever glow
    if (this._feverActive) {
      if (!this._feverGlow) {
        this._feverGlow = new THREE.PointLight(0xff4400, 1.5, 6, 2);
        this._playerGroup.add(this._feverGlow);
      }
      this._feverGlow.intensity = 1.5 + Math.sin(this._time * 8) * 0.5;
      this._feverGlow.color.setHex(this._time % 0.4 < 0.2 ? 0xff4400 : 0xFFD700);
    } else if (this._feverGlow) {
      this._playerGroup.remove(this._feverGlow);
      this._feverGlow = null;
    }
  }

  // ── Tunnel Management ─────────────────────────────────────────────────

  private _updateTunnel(): void {
    // Move everything toward the player (player stays at z=0 effectively)
    const moveZ = this._speed * this._dt;

    for (const seg of this._segments) {
      seg.group.position.z += moveZ;
      seg.zStart += moveZ;
      seg.zEnd += moveZ;
      for (const o of seg.obstacles) { o.z += moveZ; o.hitbox.translate(new THREE.Vector3(0, 0, moveZ)); }
      for (const c of seg.collectibles) { c.z += moveZ; }
      for (const e of seg.enemies) { e.z += moveZ; }
      for (const d of seg.movingDebris) { d.z += moveZ; d.hitbox.translate(new THREE.Vector3(0, 0, moveZ)); }
    }

    if (this._boss.mesh) {
      this._boss.mesh.position.z += moveZ;
    }

    // Water position follows camera
    this._waterMesh.position.z = 0;

    // Remove segments that are behind — dispose GPU resources
    while (this._segments.length > 0 && this._segments[0].zStart > TUNNEL_SEG_LENGTH * 2) {
      const old = this._segments.shift()!;
      old.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else if (mat instanceof THREE.Material) mat.dispose();
        }
      });
      this._scene.remove(old.group);
    }

    // Generate new segments ahead
    while (this._segments.length < TUNNEL_SEGMENTS_AHEAD + TUNNEL_SEGMENTS_BEHIND + 1) {
      const lastSeg = this._segments[this._segments.length - 1];
      const newZ = lastSeg ? lastSeg.zEnd : this._nextSegZ;
      const isBoss = this._distance >= this._nextBossAt && !this._boss.active;
      if (isBoss) this._phase = "boss";
      const seg = this._generateSegment(newZ, isBoss);
      this._segments.push(seg);
    }
  }

  // ── Collisions ────────────────────────────────────────────────────────

  private _updateCollisions(): void {
    const playerBox = this._playerBox;
    const halfW = 0.4;
    const height = this._isDucking ? 0.4 : 1.0;
    playerBox.set(
      this._boxMin.set(this._playerX - halfW, this._playerY - 0.3, -1.0),
      this._boxMax.set(this._playerX + halfW, this._playerY + height, 0.5),
    );

    for (const seg of this._segments) {
      for (const obs of seg.obstacles) {
        if (obs.cleared) continue;
        if (obs.z > 5 || obs.z < -5) continue;

        if (playerBox.intersectsBox(obs.hitbox)) {
          obs.cleared = true;
          if (obs.type === "ramp") {
            // Launch into the air!
            if (!this._isJumping) {
              this._isJumping = true;
              this._playerVelY = JUMP_VELOCITY * 1.6;
              this._addScore(50);
              this._combo += 3;
              if (this._combo > this._maxCombo) this._maxCombo = this._combo;
              this._cameraShake = 0.25;
              this._rampCamTimer = 0.8; // dramatic camera pullback
              this._emitSplash(this._playerX, WATER_Y, 0, 25, new THREE.Color(0xFFD700));
              this._playSound("ramp");
              this._showCombo();
              // Spawn mid-air collectible arc
              this._spawnAirArc(obs.lane, obs.z);
            }
          } else {
            this._hitObstacle();
          }
        } else if (!obs.cleared && obs.type !== "ramp") {
          // Near miss bonus — obstacle just passed player and player was in adjacent lane
          if (obs.z > 0.5 && obs.z < 2.0) {
            const obsX = LANES[obs.lane + 1];
            const laneDist = Math.abs(obsX - this._playerX);
            // Must be in adjacent lane (close but not colliding)
            if (laneDist > LANE_WIDTH * 0.5 && laneDist < LANE_WIDTH * 1.5) {
              obs.cleared = true;
              this._combo++;
              if (this._combo > this._maxCombo) this._maxCombo = this._combo;
              this._addScore(this._combo * 3);
              this._showCombo();
              this._playSound("near_miss");
            }
          }
        }
      }

      // Moving debris collisions
      for (const deb of seg.movingDebris) {
        if (deb.cleared) continue;
        if (deb.z > 5 || deb.z < -5) continue;
        if (playerBox.intersectsBox(deb.hitbox)) {
          deb.cleared = true;
          this._hitObstacle();
        }
      }
    }
  }

  private _hitObstacle(): void {
    if (this._invincibleTimer > 0) return;

    if (this._shieldTimer > 0) {
      this._shieldTimer = 0;
      this._cameraShake = 0.3;
      this._playSound("shield_break");
      this._emitSplash(this._playerX, WATER_Y, 0, 20, new THREE.Color(0x44aaff));
      return;
    }

    this._hp--;
    this._combo = 0;
    this._comboMult = 1;
    this._feverActive = false;
    this._feverTimer = 0;
    this._invincibleTimer = 1.5;
    this._cameraShake = 0.6;
    this._screenFlashTimer = 0.25;
    this._screenFlashColor = 0xff0000;
    this._playSound("hit");
    this._emitSplash(this._playerX, WATER_Y, 0, 30, new THREE.Color(0xff4444));

    // Speed penalty — briefly slow down on hit
    this._speed = Math.max(BASE_SPEED, this._speed - 4);
    this._speedPenaltyTimer = 0.8;

    if (this._hp <= 0) {
      // Second Wind revive
      if (this._hasRevive) {
        this._hasRevive = false;
        this._hp = 1;
        this._invincibleTimer = 3;
        this._cameraShake = 0.8;
        this._screenFlashTimer = 0.5;
        this._screenFlashColor = 0xFFD700;
        this._milestonePopup = "SECOND WIND!";
        this._milestonePopupTimer = 2;
        this._playSound("boss_defeat");
        return;
      }
      this._deathSlowMo = true;
      this._deathTimer = 1.2; // slow-mo death sequence before showing death screen
    }
  }

  // ── Collectibles ──────────────────────────────────────────────────────

  private _updateCollectibles(): void {
    const magnetRange = this._magnetTimer > 0 ? 5 : 1.2;

    for (const seg of this._segments) {
      for (const col of seg.collectibles) {
        if (col.collected) continue;
        if (col.z > 5 || col.z < -5) continue;

        // Bob animation
        col.mesh.position.y = PLAYER_Y_BASE + 0.5 + Math.sin(this._time * 4 + col.bobPhase) * 0.15;
        col.mesh.rotation.y += this._dt * 2;

        // Magnet pull — eased curve toward player
        if (this._magnetTimer > 0 && (col.type === "cheese" || col.type === "gold")) {
          const dx = this._playerX - col.mesh.position.x;
          const dz = -col.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < magnetRange && dist > 0.1) {
            const pullStrength = 8 * (1 - dist / magnetRange); // stronger when closer
            col.mesh.position.x += dx / dist * pullStrength * this._dt;
            // Scale up slightly as it approaches (pop effect)
            const s = 1 + (1 - dist / magnetRange) * 0.3;
            col.mesh.scale.set(s, s, s);
          }
        }

        // Collection check
        const dx = this._playerX - col.mesh.position.x;
        const dz = col.z;
        const dy = this._playerY - col.mesh.position.y;
        const dist = Math.sqrt(dx * dx + dz * dz + dy * dy);

        if (dist < magnetRange) {
          col.collected = true;
          col.mesh.visible = false;
          this._collectItem(col.type);
        }
      }
    }
  }

  private _addScore(base: number): void {
    this._score += Math.floor(base * this._comboMult);
  }

  private _collectItem(type: CollectibleType): void {
    switch (type) {
      case "cheese":
        this._cheese++;
        this._addScore(10 + this._getUpgrade("cheese_value") * 5);
        this._combo++;
        if (this._combo > this._maxCombo) this._maxCombo = this._combo;
        this._playSound("cheese");
        this._showCombo();
        break;
      case "gold":
        this._gold++;
        this._addScore(25);
        this._combo++;
        if (this._combo > this._maxCombo) this._maxCombo = this._combo;
        this._playSound("gold");
        this._showCombo();
        break;
      case "shield":
        this._shieldTimer = 10 + this._getUpgrade("shield_dur") * 3;
        this._playSound("powerup");
        this._screenFlashTimer = 0.2;
        this._screenFlashColor = 0x44aaff;
        break;
      case "magnet":
        this._magnetTimer = 8 + this._getUpgrade("magnet_dur") * 3;
        this._playSound("powerup");
        this._screenFlashTimer = 0.2;
        this._screenFlashColor = 0xff4444;
        break;
      case "splash_bomb":
        this._splashBombReady = true;
        this._playSound("powerup");
        this._screenFlashTimer = 0.2;
        this._screenFlashColor = 0x22ffaa;
        break;
      case "heart":
        if (this._hp < this._maxHp) {
          this._hp++;
          this._playSound("powerup");
          this._screenFlashTimer = 0.2;
          this._screenFlashColor = 0xff2244;
        }
        break;
    }
  }

  private _showCombo(): void {
    // Update combo multiplier (1x at 0, scales to 3x at 30+)
    this._comboMult = Math.min(3, 1 + this._combo * 0.066);

    if (this._combo >= 3) {
      const multStr = this._comboMult >= 1.5 ? ` (${this._comboMult.toFixed(1)}x)` : "";
      this._hudCombo.textContent = `${this._combo}x COMBO!${multStr}`;
      this._hudCombo.style.opacity = "1";

      if (this._combo >= 20) {
        this._hudCombo.style.color = "#ff4444";
        this._hudCombo.style.fontSize = "56px";
      } else if (this._combo >= 10) {
        this._hudCombo.style.color = "#FFD700";
        this._hudCombo.style.fontSize = "52px";
      } else if (this._combo >= 5) {
        this._hudCombo.style.color = "#44aaff";
        this._hudCombo.style.fontSize = "48px";
      } else {
        this._hudCombo.style.color = "#44cc66";
        this._hudCombo.style.fontSize = "48px";
      }
      setTimeout(() => { if (!this._destroyed) this._hudCombo.style.opacity = "0"; }, 600);
    }

    // Fever mode trigger at 20+ combo
    if (this._combo >= 20 && !this._feverActive) {
      this._feverActive = true;
      this._feverTimer = 0;
      this._comboMult = Math.max(this._comboMult, 2); // minimum 2x during fever
      this._screenFlashTimer = 0.3;
      this._screenFlashColor = 0xff4400;
      this._milestonePopup = "FEVER MODE!";
      this._milestonePopupTimer = 1.5;
      this._playSound("boss_defeat");
    }

    // Screen zoom pulse on combo milestones
    if (this._combo === 10 || this._combo === 25 || this._combo === 50 || this._combo === 100) {
      this._screenZoomPulse = 0.3;
      this._cameraShake = 0.2;
      this._playSound("powerup");
    }
  }

  // ── Enemies ───────────────────────────────────────────────────────────

  private _updateEnemies(): void {
    for (const seg of this._segments) {
      for (const enemy of seg.enemies) {
        if (enemy.dead) continue;
        if (enemy.z > 10 || enemy.z < -10) continue;

        const dt = this._dt;
        const enemyX = enemy.mesh.position.x;

        // ── Per-type AI behavior ──
        if (enemy.type === "slime") {
          // Slime bobs and slowly drifts toward player lane
          enemy.mesh.scale.y = 0.7 + Math.sin(this._time * 5) * 0.15;
          enemy.mesh.scale.x = 1 + Math.sin(this._time * 5 + 1) * 0.1;
          // Drift toward player
          if (enemy.z < 6 && enemy.z > -4) {
            const targetX = this._playerX;
            enemy.mesh.position.x += (targetX - enemyX) * 0.8 * dt;
          }
        } else if (enemy.type === "croc") {
          // Croc lunges forward when player is close
          enemy.attackTimer += dt;
          if (enemy.z < 5 && enemy.z > -2) {
            // Lunge: croc surges forward (toward player z)
            if (enemy.attackTimer > 1.5) {
              enemy.mesh.position.z -= 3 * dt; // lunge
              enemy.mesh.rotation.x = -0.15; // tilt down
            }
          }
          // Jaw snap animation
          if (enemy.attackTimer > 1.5) {
            const snap = Math.sin(this._time * 12) * 0.1;
            if (enemy.mesh.children[1]) {
              enemy.mesh.children[1].position.y = PLAYER_Y_BASE + 0.05 + snap;
            }
          }
        } else if (enemy.type === "rat_swarm") {
          // Rat swarm scatters outward as player approaches, then converges
          if (enemy.z < 4 && enemy.z > -2) {
            for (let c = 0; c < enemy.mesh.children.length; c++) {
              const child = enemy.mesh.children[c];
              const scatter = Math.sin(this._time * 6 + c * 1.3) * 0.4;
              child.position.x += scatter * dt;
              child.position.z += Math.cos(this._time * 4 + c) * 0.3 * dt;
            }
          }
        }

        // Hit flash
        if (enemy.hitFlash > 0) {
          enemy.hitFlash -= dt;
          enemy.mesh.visible = Math.floor(this._time * 20) % 2 === 0;
        } else {
          enemy.mesh.visible = true;
        }

        // ── Collision detection ──
        const dx = Math.abs(this._playerX - enemy.mesh.position.x);
        const dz = Math.abs(enemy.z);

        if (dx < 1.0 && dz < 1.5) {
          if (this._isJumping && this._playerVelY < 0) {
            // Stomp!
            enemy.hp--;
            enemy.hitFlash = 0.2;
            this._playerVelY = JUMP_VELOCITY * 0.6;
            this._addScore(30);
            this._combo++;
            if (this._combo > this._maxCombo) this._maxCombo = this._combo;
            this._playSound("stomp");

            if (enemy.hp <= 0) {
              this._killEnemy(enemy);
            } else {
              this._emitSplash(enemy.mesh.position.x, WATER_Y, enemy.z, 15, new THREE.Color(0x33cc33));
            }
          } else if (this._invincibleTimer <= 0 && this._shieldTimer <= 0) {
            this._hitObstacle();
            this._killEnemy(enemy);
          }
        }
      }
    }
  }

  private _killEnemy(enemy: Enemy): void {
    enemy.dead = true;
    enemy.mesh.visible = false;
    this._addScore(20);

    // Death explosion — colored splash + camera bump
    const colors: Record<EnemyType, number> = { rat_swarm: 0x664422, slime: 0x33cc33, croc: 0x335533 };
    this._emitSplash(enemy.mesh.position.x, WATER_Y, enemy.z, 25, new THREE.Color(colors[enemy.type]));
    this._cameraShake = 0.15;
    this._playSound("enemy_die");
  }

  // ── Boss Update ───────────────────────────────────────────────────────

  private _updateBoss(): void {
    if (!this._boss.active || !this._boss.mesh) return;

    const dt = this._dt;
    this._boss.timer += dt;
    const hpFrac = this._boss.hp / this._boss.maxHp;

    // ── Phase transitions (variant-specific names) ──
    const vn = { wyrm: "WYRM", toxic_spawn: "TOXIC SPAWN", croc_titan: "CROC TITAN", slime_amalgam: "SLIME AMALGAM" }[this._boss.variant];
    if (hpFrac <= 0.75 && !this._bossPhaseAnnounced[0]) {
      this._bossPhaseAnnounced[0] = true;
      this._boss.phase = 1;
      this._milestonePopup = `${vn} ENRAGED!`;
      this._milestonePopupTimer = 1.5;
      this._cameraShake = 0.5;
      this._screenZoomPulse = 0.2;
      this._playSound("boss_defeat");
    }
    if (hpFrac <= 0.50 && !this._bossPhaseAnnounced[1]) {
      this._bossPhaseAnnounced[1] = true;
      this._boss.phase = 2;
      this._milestonePopup = `${vn} FURIOUS!`;
      this._milestonePopupTimer = 1.5;
      this._cameraShake = 0.6;
      this._screenZoomPulse = 0.25;
      this._playSound("boss_defeat");
    }
    if (hpFrac <= 0.25 && !this._bossPhaseAnnounced[2]) {
      this._bossPhaseAnnounced[2] = true;
      this._boss.phase = 3;
      this._milestonePopup = `${vn} DESPERATE!`;
      this._milestonePopupTimer = 2;
      this._cameraShake = 0.8;
      this._screenZoomPulse = 0.3;
      this._screenFlashTimer = 0.4;
      this._screenFlashColor = this._boss.variant === "toxic_spawn" ? 0x22ff22 :
        this._boss.variant === "slime_amalgam" ? 0xaa44ff : 0xff2200;
      this._playSound("boss_defeat");
    }

    // ── Boss side-to-side movement (phase 1+) ──
    if (this._boss.phase >= 1) {
      const moveSpeed = 1.5 + this._boss.phase * 0.8;
      this._bossMoveSide += this._bossMoveDir * moveSpeed * dt;
      if (Math.abs(this._bossMoveSide) > 2.5) {
        this._bossMoveDir *= -1;
      }
      // Move all boss children by adjusting group X
      this._boss.mesh.position.x = this._bossMoveSide;
    }

    // ── Tentacle animation (intensifies with phase) ──
    const tentacleSpeed = 2 + this._boss.phase * 1.5;
    const tentacleAmplitude = 0.3 + this._boss.phase * 0.2;
    for (let i = 0; i < this._boss.tentacles.length; i++) {
      const t = this._boss.tentacles[i];
      t.rotation.z = Math.sin(this._time * tentacleSpeed + i * 1.5) * tentacleAmplitude;
      t.rotation.y = Math.sin(this._time * (tentacleSpeed * 0.75) + i) * tentacleAmplitude * 0.7;
    }

    // ── Tentacle hazard zones (phase 2+) — hurt player if too close ──
    if (this._boss.phase >= 2 && this._invincibleTimer <= 0 && this._shieldTimer <= 0) {
      for (let i = 0; i < this._boss.tentacles.length; i++) {
        const t = this._boss.tentacles[i];
        const worldPos = new THREE.Vector3();
        t.getWorldPosition(worldPos);
        const tentDx = Math.abs(this._playerX - worldPos.x);
        const tentDz = Math.abs(worldPos.z);
        if (tentDx < 1.5 && tentDz < 2) {
          this._hitObstacle();
          break;
        }
      }
    }

    // ── Boss head bob ──
    const head = this._boss.mesh.children[0];
    if (head) {
      const bobSpeed = 1.5 + this._boss.phase * 0.5;
      head.position.y = PLAYER_Y_BASE + 1 + Math.sin(this._time * bobSpeed) * 0.3;
    }

    // ── Hit flash — boss mesh flashes red ──
    if (this._boss.hitFlash > 0) {
      this._boss.hitFlash -= dt;
      // Recoil effect
      this._boss.mesh.position.z += 0.3 * dt;
      // Flash visibility
      this._boss.mesh.visible = Math.floor(this._time * 15) % 2 === 0;
    } else {
      this._boss.mesh.visible = true;
    }

    // ── Attack patterns (speed up with phase) ──
    const attackInterval = Math.max(0.8, 2 - this._boss.phase * 0.4);
    if (this._boss.timer > attackInterval) {
      this._boss.timer = 0;
      this._boss.attackPattern = (this._boss.attackPattern + 1) % (3 + this._boss.phase);
      this._bossAttack();
    }

    // ── Player can damage boss by jumping on it ──
    if (this._boss.mesh.position.z > -8 && this._boss.mesh.position.z < 4) {
      const dx = Math.abs(this._playerX - this._boss.mesh.position.x);
      if (dx < 2.5 && this._isJumping && this._playerVelY < 0) {
        if (this._boss.hitFlash <= 0) {
          const dmg = 2 + (this._boss.phase >= 3 ? 1 : 0); // more damage when desperate
          this._boss.hp -= dmg;
          this._boss.hitFlash = 0.4;
          this._playerVelY = JUMP_VELOCITY * 0.7;
          this._cameraShake = 0.4 + this._boss.phase * 0.1;
          this._playSound("stomp");
          this._emitSplash(this._boss.mesh.position.x, WATER_Y, this._boss.mesh.position.z, 35, new THREE.Color(0xff4422));

          if (this._boss.hp <= 0) {
            this._defeatBoss();
          }
        }
      }
    }
  }

  private _bossAttack(): void {
    const seg = this._segments[this._segments.length - 1];
    if (!seg) return;
    const z = seg.zStart - TUNNEL_SEG_LENGTH / 2;
    const pattern = this._boss.attackPattern % (3 + this._boss.phase);

    // Telegraph: camera shake + sound
    this._cameraShake = 0.15;
    this._playSound("boss_attack");

    // Variant-specific attack patterns
    if (this._boss.variant === "toxic_spawn") {
      this._bossAttackToxic(seg, z, pattern);
    } else if (this._boss.variant === "croc_titan") {
      this._bossAttackCroc(seg, z, pattern);
    } else if (this._boss.variant === "slime_amalgam") {
      this._bossAttackSlime(seg, z, pattern);
    } else {
      this._bossAttackWyrm(seg, z, pattern);
    }
  }

  private _bossAttackWyrm(seg: TunnelSegment, z: number, pattern: number): void {
    switch (pattern) {
      case 0: {
        const open = Math.floor(Math.random() * 3) - 1;
        for (let l = -1; l <= 1; l++) { if (l !== open) this._createObstacle(seg, "barrel", l, z); }
        break;
      }
      case 1: { for (let l = -1; l <= 1; l++) this._createObstacle(seg, "pipe_low", l, z); break; }
      case 2: { for (let l = -1; l <= 1; l++) this._createObstacle(seg, "chain", l, z); break; }
      case 3: {
        this._createObstacle(seg, "pipe_low", -1, z);
        this._createObstacle(seg, "chain", 0, z);
        this._createObstacle(seg, "pipe_low", 1, z);
        break;
      }
      case 4: {
        for (let l = -1; l <= 1; l++) this._createObstacle(seg, "barrel", l, z);
        const open = Math.floor(Math.random() * 3) - 1;
        for (let l = -1; l <= 1; l++) { if (l !== open) this._createObstacle(seg, "chain", l, z - 4); }
        break;
      }
      case 5: {
        this._createObstacle(seg, "barrel", -1, z);
        this._createObstacle(seg, "pipe_low", 0, z);
        this._createObstacle(seg, "barrel", 1, z);
        for (let l = -1; l <= 1; l++) this._createObstacle(seg, "chain", l, z - 3);
        break;
      }
    }
  }

  private _bossAttackToxic(seg: TunnelSegment, z: number, pattern: number): void {
    // Toxic Spawn: poison puddle patterns (grates = toxic ground), spreads across lanes
    switch (pattern) {
      case 0: {
        // Toxic wave — all grates, must jump
        for (let l = -1; l <= 1; l++) this._createObstacle(seg, "grate", l, z);
        break;
      }
      case 1: {
        // Staggered poison lanes
        this._createObstacle(seg, "grate", -1, z);
        this._createObstacle(seg, "grate", 0, z - 3);
        this._createObstacle(seg, "grate", 1, z - 6);
        break;
      }
      case 2: {
        // Toxic ceiling drip — all chains + center barrel
        for (let l = -1; l <= 1; l++) this._createObstacle(seg, "chain", l, z);
        this._createObstacle(seg, "barrel", 0, z - 3);
        break;
      }
      case 3: {
        // Double toxic floor with narrow escape
        const open = Math.floor(Math.random() * 3) - 1;
        for (let l = -1; l <= 1; l++) { if (l !== open) this._createObstacle(seg, "grate", l, z); }
        for (let l = -1; l <= 1; l++) { if (l !== -open) this._createObstacle(seg, "grate", l, z - 4); }
        break;
      }
      case 4: {
        // Toxic corridor — walls of barrels with grate floor
        this._createObstacle(seg, "barrel", -1, z);
        this._createObstacle(seg, "barrel", 1, z);
        this._createObstacle(seg, "grate", 0, z - 3);
        this._createObstacle(seg, "grate", -1, z - 3);
        this._createObstacle(seg, "grate", 1, z - 3);
        break;
      }
      default: {
        // Triple wave chaos
        for (let w = 0; w < 3; w++) {
          const open = Math.floor(Math.random() * 3) - 1;
          for (let l = -1; l <= 1; l++) { if (l !== open) this._createObstacle(seg, "grate", l, z - w * 3); }
        }
        break;
      }
    }
    // Toxic spawn emits green splash on every attack
    this._emitSplash(0, WATER_Y, z, 20, new THREE.Color(0x44ff44));
  }

  private _bossAttackCroc(seg: TunnelSegment, z: number, pattern: number): void {
    // Croc Titan: aggressive lunge patterns — heavy on barrels and low pipes
    switch (pattern) {
      case 0: {
        // Jaw snap — rapid triple barrel line
        for (let l = -1; l <= 1; l++) this._createObstacle(seg, "barrel", l, z);
        break;
      }
      case 1: {
        // Tail swipe — low pipes sweeping left to right
        this._createObstacle(seg, "pipe_low", -1, z);
        this._createObstacle(seg, "pipe_low", 0, z - 2);
        this._createObstacle(seg, "pipe_low", 1, z - 4);
        break;
      }
      case 2: {
        // Death roll — alternating high/low across all lanes
        this._createObstacle(seg, "pipe_low", -1, z);
        this._createObstacle(seg, "chain", 0, z);
        this._createObstacle(seg, "pipe_low", 1, z);
        this._createObstacle(seg, "chain", -1, z - 3);
        this._createObstacle(seg, "pipe_low", 0, z - 3);
        this._createObstacle(seg, "chain", 1, z - 3);
        break;
      }
      case 3: {
        // Charging corridor — barrels down center, pipes on sides
        this._createObstacle(seg, "barrel", 0, z);
        this._createObstacle(seg, "barrel", 0, z - 3);
        this._createObstacle(seg, "pipe_low", -1, z - 1.5);
        this._createObstacle(seg, "pipe_low", 1, z - 1.5);
        break;
      }
      default: {
        // Croc fury — massive wall with tiny gap, twice
        for (let w = 0; w < 2; w++) {
          const open = Math.floor(Math.random() * 3) - 1;
          for (let l = -1; l <= 1; l++) {
            if (l !== open) {
              this._createObstacle(seg, "barrel", l, z - w * 4);
              this._createObstacle(seg, "pipe_low", l, z - w * 4 - 1.5);
            }
          }
        }
        break;
      }
    }
    // Croc shake effect
    this._cameraShake = Math.max(this._cameraShake, 0.3);
  }

  private _bossAttackSlime(seg: TunnelSegment, z: number, pattern: number): void {
    // Slime Amalgam: slows player, spawns in waves, walls of slime
    switch (pattern) {
      case 0: {
        // Slime puddle spread — grates everywhere, one safe spot
        const open = Math.floor(Math.random() * 3) - 1;
        for (let l = -1; l <= 1; l++) { if (l !== open) this._createObstacle(seg, "grate", l, z); }
        this._createObstacle(seg, "chain", open, z - 2);
        break;
      }
      case 1: {
        // Slime rain — all chains then all pipes
        for (let l = -1; l <= 1; l++) this._createObstacle(seg, "chain", l, z);
        for (let l = -1; l <= 1; l++) this._createObstacle(seg, "pipe_low", l, z - 4);
        break;
      }
      case 2: {
        // Absorb attack — walls closing in
        this._createObstacle(seg, "barrel", -1, z);
        this._createObstacle(seg, "barrel", 1, z);
        this._createObstacle(seg, "barrel", -1, z - 3);
        this._createObstacle(seg, "barrel", 1, z - 3);
        this._createObstacle(seg, "barrel", 0, z - 5);
        break;
      }
      case 3: {
        // Slime cascade — staggered falling obstacles
        for (let i = 0; i < 4; i++) {
          const l = (i % 3) - 1;
          this._createObstacle(seg, i % 2 === 0 ? "barrel" : "chain", l, z - i * 2.5);
        }
        break;
      }
      default: {
        // Full amalgam — everything everywhere
        for (let l = -1; l <= 1; l++) this._createObstacle(seg, "barrel", l, z);
        for (let l = -1; l <= 1; l++) this._createObstacle(seg, "chain", l, z - 3);
        const open = Math.floor(Math.random() * 3) - 1;
        for (let l = -1; l <= 1; l++) { if (l !== open) this._createObstacle(seg, "pipe_low", l, z - 6); }
        break;
      }
    }
    // Slime effect — purple splash
    this._emitSplash(0, WATER_Y, z, 18, new THREE.Color(0xaa44ff));
  }

  // ── Countdown ──────────────────────────────────────────────────────────

  private _updateCountdown(): void {
    this._countdownTimer -= this._dt;
    if (this._countdownTimer <= 2 && this._countdownPhase === "3") {
      this._countdownPhase = "2";
      this._playSound("start");
    } else if (this._countdownTimer <= 1 && this._countdownPhase === "2") {
      this._countdownPhase = "1";
      this._playSound("start");
    } else if (this._countdownTimer <= 0 && this._countdownPhase === "1") {
      this._countdownPhase = "GO";
      this._playSound("boss_defeat");
      this._countdownTimer = 0.6;
    } else if (this._countdownTimer <= 0 && this._countdownPhase === "GO") {
      this._countdownPhase = "done";
    }

    // Render countdown in HUD combo area
    if (this._countdownPhase !== "done") {
      const label = this._countdownPhase === "GO" ? "GO!" : this._countdownPhase;
      const color = this._countdownPhase === "GO" ? "#44cc66" : "#ffffff";
      const scale = this._countdownPhase === "GO" ? "72px" : "64px";
      this._hudCombo.innerHTML = `<span style="font-size:${scale};color:${color};">${label}</span>`;
      this._hudCombo.style.opacity = "1";
    } else {
      this._hudCombo.style.opacity = "0";
    }
  }

  // ── Moving Debris ──────────────────────────────────────────────────────

  private _updateMovingDebris(): void {
    for (const seg of this._segments) {
      for (const deb of seg.movingDebris) {
        if (deb.cleared) continue;
        if (deb.z > 10 || deb.z < -10) continue;

        // Drift side to side
        deb.laneF += deb.laneDir * deb.speed * this._dt;
        if (deb.laneF > 1.1) { deb.laneF = 1.1; deb.laneDir *= -1; }
        if (deb.laneF < -1.1) { deb.laneF = -1.1; deb.laneDir *= -1; }

        const x = deb.laneF * LANE_WIDTH;
        deb.mesh.position.x = x;
        // Bob
        deb.mesh.position.y = Math.sin(this._time * 2 + deb.z) * 0.08;

        // Update hitbox center
        deb.hitbox.setFromCenterAndSize(
          new THREE.Vector3(x, PLAYER_Y_BASE + 0.3, deb.z),
          new THREE.Vector3(1.0, 0.8, 1.2),
        );
      }
    }
  }

  // ── Theme ──────────────────────────────────────────────────────────────

  private _updateTheme(): void {
    // Theme transition fade effect
    if (this._themeFadeTimer > 0) {
      this._themeFadeTimer -= this._dt;
      if (this._vignetteEl) {
        const a = this._themeFadeTimer > 0.3 ? (0.6 - this._themeFadeTimer) * 1.5 : this._themeFadeTimer * 2;
        this._vignetteEl.style.background = `radial-gradient(ellipse at center, rgba(0,0,0,${a}) 30%, rgba(0,0,0,${0.7 + a * 0.3}) 100%)`;
      }
    }

    if (this._distance - this._lastThemeChangeDist >= THEME_CHANGE_DISTANCE) {
      this._lastThemeChangeDist = this._distance;
      this._themeIndex = (this._themeIndex + 1) % THEME_ORDER.length;
      this._currentTheme = THEME_ORDER[this._themeIndex];

      // Trigger fade
      this._themeFadeTimer = 0.6;

      // Update water color
      const theme = THEME_DEFS[this._currentTheme];
      const mat = this._waterMesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(theme.waterColor);
      mat.emissive.setHex(theme.waterEmissive);
      mat.opacity = theme.waterOpacity;

      // Update scene fog & background
      this._scene.fog = new THREE.FogExp2(theme.fogColor, 0.012);
      (this._scene.background as THREE.Color).setHex(theme.fogColor);

      // Update ambient hum
      this._updateAmbientHum();

      // Announce theme change
      const names: Record<TunnelTheme, string> = {
        sewer: "THE SEWERS", toxic: "TOXIC WASTE", catacombs: "THE CATACOMBS", flooded: "FLOODED DEPTHS",
      };
      this._milestonePopup = names[this._currentTheme];
      this._milestonePopupTimer = 2;
      this._playSound("theme_change");
    }
  }

  // ── Milestones ────────────────────────────────────────────────────────

  private _updateMilestones(): void {
    for (const m of this._milestones) {
      if (m.given) continue;
      if (this._distance >= m.distance) {
        m.given = true;
        this._milestonePopup = `${m.label} — ${Math.floor(m.distance)}m`;
        this._milestonePopupTimer = 3;
        this._screenFlashTimer = 0.3;
        this._screenFlashColor = 0xFFD700;

        switch (m.reward) {
          case "hp":
            this._maxHp++;
            this._hp = Math.min(this._hp + 1, this._maxHp);
            break;
          case "bomb":
            this._splashBombReady = true;
            break;
          case "gold":
            this._gold += 25;
            this._addScore(100);
            break;
        }
        this._playSound("boss_defeat");
      }
    }

    // Milestone popup timer
    if (this._milestonePopupTimer > 0) {
      this._milestonePopupTimer -= this._dt;
    }
  }

  // ── Water Level ───────────────────────────────────────────────────────

  private _updateWaterLevel(): void {
    // Water rises periodically in flooded theme
    if (this._currentTheme === "flooded") {
      this._waterRiseTimer += this._dt;
      // Oscillate water level
      this._waterLevelTarget = WATER_Y + Math.sin(this._waterRiseTimer * 0.3) * 0.5 + 0.3;
    } else {
      this._waterLevelTarget = WATER_Y;
    }
    this._waterLevel += (this._waterLevelTarget - this._waterLevel) * 2 * this._dt;
    this._waterMesh.position.y = this._waterLevel;
  }

  // ── Shield Bubble ─────────────────────────────────────────────────────

  private _buildShieldBubble(): void {
    if (this._shieldBubble) {
      this._scene.remove(this._shieldBubble);
    }
    const geo = new THREE.SphereGeometry(1.0, 16, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x44aaff,
      emissive: 0x2266cc,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    this._shieldBubble = new THREE.Mesh(geo, mat);
    this._shieldBubble.visible = false;
    this._scene.add(this._shieldBubble);
  }

  private _updateShieldBubble(): void {
    if (!this._shieldBubble || !this._playerGroup) return;
    if (this._shieldTimer > 0) {
      this._shieldBubble.visible = true;
      this._shieldBubble.position.copy(this._playerGroup.position);
      this._shieldBubble.position.y += 0.4;
      // Pulse
      const s = 1 + Math.sin(this._time * 6) * 0.08;
      this._shieldBubble.scale.set(s, s, s);
      // Fade when about to expire
      const mat = this._shieldBubble.material as THREE.MeshStandardMaterial;
      mat.opacity = this._shieldTimer < 2 ? 0.1 + Math.sin(this._time * 12) * 0.08 : 0.15;
    } else {
      this._shieldBubble.visible = false;
    }
  }

  // ── Speed Streaks ─────────────────────────────────────────────────────

  private _buildSpeedStreaks(): void {
    const count = 60;
    const positions = new Float32Array(count * 3);
    this._speedStreakVels = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * TUNNEL_RADIUS * 1.8;
      positions[i * 3 + 1] = PLAYER_Y_BASE + Math.random() * 4;
      positions[i * 3 + 2] = -Math.random() * 30;
      this._speedStreakVels.push(5 + Math.random() * 10);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xaaccaa,
      size: 0.06,
      transparent: true,
      opacity: 0,
    });
    this._speedStreaks = new THREE.Points(geo, mat);
    this._scene.add(this._speedStreaks);
  }

  private _updateSpeedStreaks(): void {
    if (!this._speedStreaks) return;
    const speedFrac = Math.max(0, (this._speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED));
    const mat = this._speedStreaks.material as THREE.PointsMaterial;
    mat.opacity = speedFrac * 0.6;
    mat.size = 0.04 + speedFrac * 0.12;

    if (speedFrac < 0.05) return;

    const pos = this._speedStreaks.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let z = pos.getZ(i) + this._speedStreakVels[i] * this._dt * speedFrac;
      if (z > 5) {
        z = -25 - Math.random() * 10;
        pos.setX(i, (Math.random() - 0.5) * TUNNEL_RADIUS * 1.8);
        pos.setY(i, PLAYER_Y_BASE + Math.random() * 4);
      }
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
  }

  // ── Player Animation ──────────────────────────────────────────────────

  private _updatePlayerAnim(): void {
    if (!this._playerGroup) return;

    // Legs paddle when on water
    for (let i = 0; i < this._playerLegs.length; i++) {
      const leg = this._playerLegs[i];
      if (!this._isJumping) {
        const phase = this._time * 8 + i * Math.PI;
        leg.rotation.x = Math.sin(phase) * 0.4;
      } else {
        // Legs tucked in jump
        leg.rotation.x = -0.3;
      }
    }

    // Arms out when jumping
    for (let i = 0; i < this._playerArms.length; i++) {
      const arm = this._playerArms[i];
      const side = i === 0 ? -1 : 1;
      if (this._isJumping) {
        arm.rotation.z = side * (1.2 + Math.sin(this._time * 5) * 0.2);
      } else {
        arm.rotation.z = side * (0.3 + Math.sin(this._time * 3 + i) * 0.1);
      }
    }

    // Tail wave
    if (this._playerTail) {
      this._playerTail.rotation.y = Math.sin(this._time * 4) * 0.3;
      this._playerTail.rotation.x = Math.sin(this._time * 3) * 0.1;
    }
  }

  // ── Persistent Upgrades ───────────────────────────────────────────────

  // ── Air Collectible Arc ────────────────────────────────────────────────

  private _spawnAirArc(lane: number, z: number): void {
    // Place gold coins in a parabolic arc matching the ramp trajectory
    const seg = this._segments.find(s => z >= s.zEnd && z <= s.zStart);
    if (!seg) return;
    for (let i = 0; i < 5; i++) {
      const t = (i + 1) / 6;
      const arcZ = z - t * 8; // spread along z
      const arcY = PLAYER_Y_BASE + 1.5 + t * (1 - t) * 8; // parabolic height
      // Create floating gold at arc position
      const group = new THREE.Group();
      const geo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 10);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xFFD700, metalness: 0.9, roughness: 0.1,
        emissive: 0xcc8800, emissiveIntensity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI / 2;
      group.add(mesh);
      // Small glow
      const light = new THREE.PointLight(0xFFD700, 0.4, 2, 2);
      group.add(light);
      group.position.set(LANES[lane + 1], arcY, arcZ);
      seg.group.add(group);
      seg.collectibles.push({
        mesh: group, type: "gold", lane, z: arcZ,
        collected: false, bobPhase: i * 0.5,
      });
    }
  }

  // ── Fever Mode ────────────────────────────────────────────────────────

  private _updateFever(): void {
    if (!this._feverActive) return;
    this._feverTimer += this._dt;

    // Fever ends when combo drops (on hit) or after 10 seconds
    if (this._combo < 15 || this._feverTimer > 10) {
      this._feverActive = false;
      this._feverTimer = 0;
      this._comboMult = Math.min(3, 1 + this._combo * 0.066);
    } else {
      // Fever keeps multiplier at minimum 2x
      this._comboMult = Math.max(2, Math.min(3, 1 + this._combo * 0.066));
    }
  }

  // ── Procedural Music ──────────────────────────────────────────────────

  private _startMusic(): void {
    try {
      if (!this._audioCtx) this._audioCtx = new AudioContext();
      // Bass line drone that syncs with speed
      const osc = this._audioCtx.createOscillator();
      const gain = this._audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = 55;
      gain.gain.value = 0.04;
      const filter = this._audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 200;
      osc.connect(filter).connect(gain).connect(this._audioCtx.destination);
      osc.start();
      this._musicOsc = osc;
      this._musicGain = gain;
    } catch {}
  }

  private _updateMusic(): void {
    if (!this._musicOsc || !this._audioCtx) return;

    // Sync bass frequency with speed
    const speedFrac = (this._speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
    this._musicOsc.frequency.value = 55 + speedFrac * 30;

    // Volume up during fever
    if (this._musicGain) {
      this._musicGain.gain.value = this._feverActive ? 0.07 : 0.04;
    }

    // Beat kicks synced to speed (BPM = 90 + speed * 2)
    const bpm = 90 + this._speed * 2;
    const beatInterval = 60 / bpm;
    this._musicBeatTimer += this._dt;
    if (this._musicBeatTimer >= beatInterval) {
      this._musicBeatTimer -= beatInterval;
      // Kick drum
      try {
        const ctx = this._audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(this._feverActive ? 0.12 : 0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } catch {}
    }
  }

  private _stopMusic(): void {
    if (this._musicOsc) { try { this._musicOsc.stop(); } catch {} this._musicOsc = null; }
    this._musicGain = null;
  }

  // ── Visible Upgrade Effects ──────────────────────────────────────────

  private _applyUpgradeVisuals(): void {
    if (!this._playerGroup) return;

    // HP upgrade → rat grows slightly per level
    const hpLvl = this._getUpgrade("extra_hp");
    if (hpLvl > 0) {
      const s = 1 + hpLvl * 0.08;
      this._playerGroup.scale.x = s;
      this._playerGroup.scale.z = s;
    }

    // Shield upgrade → blue shimmer aura
    const shieldLvl = this._getUpgrade("shield_dur");
    if (shieldLvl > 0) {
      const auraGeo = new THREE.RingGeometry(0.5, 0.6 + shieldLvl * 0.1, 16);
      const auraMat = new THREE.MeshStandardMaterial({
        color: 0x44aaff, emissive: 0x2266cc, emissiveIntensity: 0.5 + shieldLvl * 0.3,
        transparent: true, opacity: 0.2, side: THREE.DoubleSide,
      });
      const aura = new THREE.Mesh(auraGeo, auraMat);
      aura.rotation.x = -Math.PI / 2;
      aura.position.y = 0.1;
      this._playerGroup.add(aura);
    }

    // Magnet upgrade → spinning magnet particles
    const magnetLvl = this._getUpgrade("magnet_dur");
    if (magnetLvl > 0) {
      const ringGeo = new THREE.TorusGeometry(0.6 + magnetLvl * 0.1, 0.02, 10, 12);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xff3333, emissive: 0xcc0000, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.3,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.5;
      this._playerGroup.add(ring);
    }
  }

  // ── Screen Zoom Pulse ────────────────────────────────────────────────

  private _updateScreenZoom(): void {
    if (this._screenZoomPulse > 0) {
      this._screenZoomPulse -= this._dt;
      // Temporarily boost FOV for zoom pulse
      this._camera.fov -= this._screenZoomPulse * 8;
      this._camera.updateProjectionMatrix();
    }
  }

  // ── Boss Variant Selection ────────────────────────────────────────────

  private _pickBossVariant(): BossVariant {
    this._bossCount++;
    const variants: BossVariant[] = ["wyrm", "toxic_spawn", "croc_titan", "slime_amalgam"];
    // Cycle through variants, first is always wyrm
    if (this._bossCount <= 1) return "wyrm";
    return variants[this._bossCount % variants.length];
  }

  private _loadUpgrades(): void {
    try {
      const data = localStorage.getItem("sewer_splash_upgrades");
      this._upgradeLevels = data ? JSON.parse(data) : {};
    } catch {
      this._upgradeLevels = {};
    }
  }

  private _saveUpgrades(): void {
    localStorage.setItem("sewer_splash_upgrades", JSON.stringify(this._upgradeLevels));
    localStorage.setItem("sewer_splash_gold", String(this._totalGold));
  }

  private _getUpgrade(id: string): number {
    return this._upgradeLevels[id] || 0;
  }

  // ── Particles ─────────────────────────────────────────────────────────

  private _updateParticles(): void {
    const pos = this._splashParticles.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < -50) continue;
      const v = this._splashVelocities[i];
      v.y -= 12 * this._dt; // gravity
      pos.setX(i, pos.getX(i) + v.x * this._dt);
      pos.setY(i, pos.getY(i) + v.y * this._dt);
      pos.setZ(i, pos.getZ(i) + v.z * this._dt);
      if (pos.getY(i) < WATER_Y - 1) pos.setY(i, -100);
    }
    pos.needsUpdate = true;

    // Continuous wake trail from player plank
    if ((this._phase === "playing" || this._phase === "boss") && !this._isJumping) {
      // Structured V-wake behind plank
      const wakeIntensity = Math.min(1, this._speed / MAX_SPEED);
      const wakeCount = 3 + Math.floor(wakeIntensity * 5);
      for (let w = 0; w < wakeCount; w++) {
        const side = w % 2 === 0 ? -1 : 1;
        const spread = 0.3 + w * 0.08;
        this._emitSplash(
          this._playerX + side * spread,
          this._waterLevel,
          0.6 + w * 0.15,
          1,
        );
      }
    }
  }

  // ── Water ─────────────────────────────────────────────────────────────

  private _updateWater(): void {
    this._waterOffset += this._dt * (this._phase === "playing" || this._phase === "boss" ? this._speed * 0.3 : 2);
    const pos = this._waterMesh.geometry.attributes.position as THREE.BufferAttribute;
    const px = this._playerX;
    const speedWake = (this._phase === "playing" || this._phase === "boss") ? this._speed / MAX_SPEED : 0;
    const feverPulse = this._feverActive ? Math.sin(this._time * 12) * 0.04 : 0;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i); // note: plane is rotated so Y in geo = Z in world
      // Base ripple
      let h = Math.sin(x * 2 + this._time * 3) * 0.08 + Math.sin(z * 1.5 + this._time * 2) * 0.06;
      // Player wake displacement — V-shaped wake behind player position
      const dx = x - px;
      const wakeDist = Math.sqrt(dx * dx + z * z);
      if (wakeDist < 3 && z > -1) {
        const wakeStrength = (1 - wakeDist / 3) * speedWake * 0.12;
        h += Math.sin(wakeDist * 4 - this._time * 8) * wakeStrength;
      }
      // Fever water distortion
      h += feverPulse;
      pos.setZ(i, h);
    }
    pos.needsUpdate = true;
  }

  // ── Camera ────────────────────────────────────────────────────────────

  private _updateCamera(): void {
    const dt = this._dt;

    // ── Death spiral slow-mo ──
    if (this._deathSlowMo) {
      this._deathTimer -= dt;
      // Slow-mo effect: reduce effective dt for everything
      const deathFrac = Math.max(0, this._deathTimer / 1.2);
      // Camera pulls back and tilts
      this._camera.position.z += 2 * dt;
      this._camera.position.y += 1.5 * dt;
      this._camera.rotation.z += 0.5 * dt;
      this._camera.fov += 8 * dt;
      this._camera.updateProjectionMatrix();

      // Red vignette
      if (this._vignetteEl) {
        const a = 1 - deathFrac;
        this._vignetteEl.style.background = `radial-gradient(ellipse at center, rgba(200,0,0,${a * 0.4}) 20%, rgba(0,0,0,${0.5 + a * 0.3}) 100%)`;
      }

      if (this._deathTimer <= 0) {
        this._deathSlowMo = false;
        this._showDeath();
      }
      return;
    }

    // ── Follow player with slight lag ──
    const targetX = this._playerX * 0.4;
    let targetY = this._playerY + 2.5;
    let targetZ = 5;
    let lookY = this._playerY + 0.5;

    // Ramp camera: pull back and tilt up during big air
    if (this._rampCamTimer > 0) {
      this._rampCamTimer -= dt;
      const rampFrac = this._rampCamTimer / 0.8;
      targetY += rampFrac * 2;
      targetZ += rampFrac * 2;
      lookY += rampFrac * 1.5;
    }

    // Jump height: camera follows up
    if (this._isJumping) targetY += 0.5;

    // Boss encounter: zoom in slightly
    if (this._boss.active && this._boss.mesh) {
      const bossZ = this._boss.mesh.position.z;
      if (bossZ > -10 && bossZ < 5) {
        targetZ -= 0.5; // closer
        targetY += 0.3; // slightly higher to see boss
      }
    }

    this._camera.position.x += (targetX - this._camera.position.x) * 6 * dt;
    this._camera.position.y += (targetY - this._camera.position.y) * 4 * dt;
    this._camera.position.z += (targetZ - this._camera.position.z) * 4 * dt;

    // Look ahead
    this._camera.lookAt(this._playerX * 0.2, lookY, -15);

    // Speed-based FOV
    const targetFov = 70 + (this._speed - BASE_SPEED) * 0.5;
    this._camera.fov += (targetFov - this._camera.fov) * 3 * dt;
    this._camera.updateProjectionMatrix();

    // Camera shake
    if (this._cameraShake > 0) {
      this._camera.position.x += (Math.random() - 0.5) * this._cameraShake * 0.3;
      this._camera.position.y += (Math.random() - 0.5) * this._cameraShake * 0.2;
      this._cameraShake -= dt * 3;
    }

    // Camera tilt on lane changes
    this._cameraTilt += (this._playerTilt * 0.5 - this._cameraTilt) * 5 * dt;
    this._camera.rotation.z = this._cameraTilt;
  }

  // ── Timers ────────────────────────────────────────────────────────────

  private _updateTimers(): void {
    const dt = this._dt;

    if (this._invincibleTimer > 0) this._invincibleTimer -= dt;
    if (this._shieldTimer > 0) this._shieldTimer -= dt;
    if (this._magnetTimer > 0) this._magnetTimer -= dt;

    // Screen flash
    if (this._screenFlashTimer > 0) {
      this._screenFlashTimer -= dt;
      if (this._vignetteEl) {
        const c = new THREE.Color(this._screenFlashColor);
        const a = this._screenFlashTimer * 2;
        this._vignetteEl.style.background = `radial-gradient(ellipse at center, rgba(${c.r * 255},${c.g * 255},${c.b * 255},${a * 0.3}) 30%, rgba(0,0,0,0.7) 100%)`;
      }
    } else if (this._vignetteEl) {
      this._vignetteEl.style.background = "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)";
    }
  }

  // ── Procedural Audio ──────────────────────────────────────────────────

  private _playSound(type: string): void {
    try {
      if (!this._audioCtx) this._audioCtx = new AudioContext();
      const ctx = this._audioCtx;
      const now = ctx.currentTime;

      switch (type) {
        case "cheese": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }
        case "gold": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(1800, now + 0.12);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }
        case "jump": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }
        case "splash": {
          const bufferSize = ctx.sampleRate * 0.15;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.15;
          }
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 800;
          src.connect(filter).connect(ctx.destination);
          src.start(now);
          break;
        }
        case "hit": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
          break;
        }
        case "swoosh": {
          const bufferSize = ctx.sampleRate * 0.1;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.08;
          }
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = "highpass";
          filter.frequency.value = 2000;
          src.connect(filter).connect(ctx.destination);
          src.start(now);
          break;
        }
        case "stomp": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }
        case "powerup": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
          osc.frequency.exponentialRampToValueAtTime(1600, now + 0.3);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
          break;
        }
        case "bomb": {
          const bufferSize = ctx.sampleRate * 0.4;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2) * 0.3;
          }
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 400;
          src.connect(filter).connect(ctx.destination);
          src.start(now);
          break;
        }
        case "boss_defeat": {
          for (let n = 0; n < 4; n++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(400 + n * 200, now + n * 0.15);
            gain.gain.setValueAtTime(0.1, now + n * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + n * 0.15 + 0.3);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + n * 0.15);
            osc.stop(now + n * 0.15 + 0.3);
          }
          break;
        }
        case "start": {
          for (let n = 0; n < 3; n++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(300 + n * 150, now + n * 0.12);
            gain.gain.setValueAtTime(0.1, now + n * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + n * 0.12 + 0.25);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + n * 0.12);
            osc.stop(now + n * 0.12 + 0.25);
          }
          break;
        }
        case "shield_break": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
          break;
        }
        case "ramp": {
          // Rising whoosh + ding
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(1000, now + 0.25);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
          // Ding
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(1400, now + 0.1);
          gain2.gain.setValueAtTime(0.1, now + 0.1);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc2.connect(gain2).connect(ctx.destination);
          osc2.start(now + 0.1);
          osc2.stop(now + 0.35);
          break;
        }
        case "near_miss": {
          // Quick rising whistle
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(500, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }
        case "enemy_die": {
          // Crunchy splat
          const bufferSize = ctx.sampleRate * 0.2;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5) * 0.2;
          }
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 600;
          src.connect(filter).connect(ctx.destination);
          src.start(now);
          // Pop on top
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }
        case "boss_attack": {
          // Deep rumble warning
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(60, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
          break;
        }
        case "theme_change": {
          // Ethereal sweep
          for (let n = 0; n < 3; n++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(200 + n * 100, now + n * 0.1);
            osc.frequency.exponentialRampToValueAtTime(600 + n * 150, now + n * 0.1 + 0.3);
            gain.gain.setValueAtTime(0.06, now + n * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + n * 0.1 + 0.4);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + n * 0.1);
            osc.stop(now + n * 0.1 + 0.4);
          }
          break;
        }
        case "drip": {
          // Water drip
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(1800 + Math.random() * 600, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
          gain.gain.setValueAtTime(0.03 + Math.random() * 0.02, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }
      }
    } catch {
      // Audio not available
    }
  }

  // ── Ambient Audio ─────────────────────────────────────────────────────

  private _tickAmbientDrip(): void {
    this._ambientDrip += this._dt;
    // Random drip every 1-3 seconds
    if (this._ambientDrip > 1 + Math.random() * 2) {
      this._ambientDrip = 0;
      this._playSound("drip");
    }
  }

  private _updateAmbientHum(): void {
    try {
      if (!this._audioCtx) this._audioCtx = new AudioContext();

      // Stop old hum
      if (this._ambientHum) {
        this._ambientHum.stop();
        this._ambientHum.disconnect();
        this._ambientHum = null;
      }

      // Theme-specific ambient drone
      const freqMap: Record<TunnelTheme, number> = {
        sewer: 55, toxic: 65, catacombs: 45, flooded: 50,
      };
      const osc = this._audioCtx.createOscillator();
      const gain = this._audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freqMap[this._currentTheme];
      gain.gain.value = 0.02;

      const filter = this._audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 120;

      osc.connect(filter).connect(gain).connect(this._audioCtx.destination);
      osc.start();
      this._ambientHum = osc;
    } catch {
      // Audio not available
    }
  }
}
