// ---------------------------------------------------------------------------
// LANCELOT — 3D Third-Person Sword Combat Arena
// Play as Sir Lancelot du Lac in dark, atmospheric duels against increasingly
// deadly knights. Souls-like combat: directional attacks, parries, dodge rolls,
// stamina management, combos, ripostes, and a tournament of 8 foes in a
// torch-lit stone colosseum with crowd, banners, and special enemy abilities.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { viewManager } from "../view/ViewManager";
import { audioManager } from "../audio/AudioManager";

// ── Constants ────────────────────────────────────────────────────────────────

const ARENA_RADIUS = 18;
const WALL_HEIGHT = 8;
const MOVE_SPEED = 5.5;
const SPRINT_SPEED = 9;
const DODGE_SPEED = 14;
const DODGE_DURATION = 0.35;
const DODGE_IFRAME = 0.25;
const DODGE_COST = 20;
const ATTACK_COST = 12;
const HEAVY_ATTACK_COST = 22;
const PARRY_COST = 8;
const STAMINA_MAX = 100;
const STAMINA_REGEN = 28;
const STAMINA_REGEN_DELAY = 0.6;
const PARRY_WINDOW = 0.25;
const STAGGER_DURATION = 0.8;
const RIPOSTE_WINDOW = 0.55;
const COMBO_WINDOW = 0.5;

const ATTACK_WINDUP = 0.25;
const ATTACK_ACTIVE = 0.2;
const ATTACK_RECOVERY = 0.3;
const HEAVY_WINDUP = 0.4;
const HEAVY_ACTIVE = 0.25;
const HEAVY_RECOVERY = 0.4;

const CAMERA_DISTANCE = 8.5;
const CAMERA_HEIGHT = 4.2;
const CAMERA_SMOOTHING = 8;
const MOUSE_SENS = 0.003;

const PLAYER_MAX_HP = 120;
const PLAYER_DAMAGE_BASE = 15;
const RIPOSTE_DAMAGE_MULT = 2.5;
const COMBO_DAMAGE_MULT = [1.0, 1.15, 1.4]; // 3-hit combo scaling
const HEAVY_DAMAGE_MULT = 1.8;
const KICK_COST = 15;
const KICK_DAMAGE = 5;
const KICK_DURATION = 0.4;
const KICK_RANGE = 2.2;
const SLOWMO_DURATION = 0.8;
const SLOWMO_SCALE = 0.15;
const PERFECT_PARRY_WINDOW = 0.1; // first 0.1s of parry = perfect
const PERFECT_RIPOSTE_MULT = 3.5;
const BACKSTAB_MULT = 1.6;
const BLEED_DPS = 4;
const BLEED_DURATION = 3;

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = "title" | "intro" | "fighting" | "victory" | "defeat" | "shop" | "tournament_end" | "paused";
type AttackDir = "left" | "right" | "overhead" | "thrust";
type FighterAction = "idle" | "walk" | "sprint" | "attack" | "heavy" | "parry" | "dodge" | "stagger" | "riposte" | "kick" | "unblockable" | "dead";

interface Fighter {
  mesh: THREE.Group;
  swordGroup: THREE.Object3D;
  shieldGroup: THREE.Object3D;
  bodyMesh: THREE.Mesh;
  swordMesh: THREE.Mesh;
  shieldMesh: THREE.Mesh;
  pos: THREE.Vector3;
  rot: number;
  hp: number;
  maxHp: number;
  stamina: number;
  action: FighterAction;
  actionTimer: number;
  attackDir: AttackDir;
  staminaRegenDelay: number;
  invincible: boolean;
  dodgeDir: THREE.Vector3;
  color: number;
  swordColor: number;
  comboCount: number;
  comboTimer: number;
  riposteReady: boolean;
  riposteTimer: number;
  hitThisSwing: boolean;
  trailPoints: THREE.Vector3[];
  perfectParry: boolean;
  bleedTimer: number;
  bleedDps: number;
  retreatTimer: number;
  abilityGlow: THREE.PointLight | null;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

type EnemyAbility =
  | "none"
  | "ironSkin"      // takes reduced damage
  | "rage"          // gets faster as HP drops
  | "poisonBlade"   // hits apply DOT
  | "mirrorParry"   // ripostes when player attacks recklessly
  | "tankGuard"     // much higher block, slower attacks
  | "shadowStep"    // teleports behind player
  | "sunStrength"   // first hit each exchange is boosted
  | "deathMark";    // deals more damage to low-HP player

interface EnemyDef {
  name: string;
  title: string;
  color: number;
  swordColor: number;
  hp: number;
  damage: number;
  blockChance: number;
  parryChance: number;
  aggression: number;
  speed: number;
  taunt: string;
  defeated: string;
  ability: EnemyAbility;
  abilityDesc: string;
}

// ── Enemy definitions ────────────────────────────────────────────────────────

const ENEMIES: EnemyDef[] = [
  {
    name: "Sir Cedric", title: "the Green",
    color: 0x44aa44, swordColor: 0x888888, hp: 80, damage: 8,
    blockChance: 0.15, parryChance: 0.02, aggression: 0.3, speed: 0.7,
    ability: "none", abilityDesc: "",
    taunt: "A practice bout, nothing more!",
    defeated: "I yield... you are swift indeed.",
  },
  {
    name: "Sir Hector", title: "Ironside",
    color: 0x777788, swordColor: 0x9999aa, hp: 110, damage: 10,
    blockChance: 0.25, parryChance: 0.05, aggression: 0.4, speed: 0.8,
    ability: "ironSkin", abilityDesc: "IRON SKIN — takes 30% reduced damage",
    taunt: "My armor is forged from mountain ore. Strike all you wish.",
    defeated: "Iron bends before the Lake Knight...",
  },
  {
    name: "Sir Gaheris", title: "of Orkney",
    color: 0xcc8844, swordColor: 0xaa7733, hp: 100, damage: 13,
    blockChance: 0.2, parryChance: 0.08, aggression: 0.55, speed: 0.9,
    ability: "rage", abilityDesc: "ORKNEY RAGE — faster and harder hitting below 50% HP",
    taunt: "Orkney fury burns in my blood!",
    defeated: "The fury... is quenched.",
  },
  {
    name: "Lady Isolde", title: "Thornblade",
    color: 0xaa3366, swordColor: 0xdd5588, hp: 90, damage: 14,
    blockChance: 0.15, parryChance: 0.15, aggression: 0.65, speed: 1.1,
    ability: "poisonBlade", abilityDesc: "VENOM EDGE — hits poison for 3 damage/sec over 4 seconds",
    taunt: "My blade carries poison and grace in equal measure.",
    defeated: "Graceful... you have bested the Thorn.",
  },
  {
    name: "Sir Bors", title: "the Relentless",
    color: 0x5555aa, swordColor: 0x6666cc, hp: 140, damage: 14,
    blockChance: 0.4, parryChance: 0.1, aggression: 0.45, speed: 0.8,
    ability: "tankGuard", abilityDesc: "IRON GUARD — blocks most attacks, counterattacks after blocking",
    taunt: "I do not tire. I do not falter. Come.",
    defeated: "At last... I may rest.",
  },
  {
    name: "Sir Agravain", title: "the Shadow",
    color: 0x333344, swordColor: 0x4444aa, hp: 100, damage: 18,
    blockChance: 0.2, parryChance: 0.2, aggression: 0.7, speed: 1.15,
    ability: "shadowStep", abilityDesc: "SHADOW STEP — teleports behind you after dodging",
    taunt: "You will not see the blade that ends you.",
    defeated: "The shadow... fades.",
  },
  {
    name: "Sir Gawain", title: "Sun Knight",
    color: 0xddaa22, swordColor: 0xffcc44, hp: 150, damage: 20,
    blockChance: 0.3, parryChance: 0.18, aggression: 0.6, speed: 1.0,
    ability: "sunStrength", abilityDesc: "SUN'S MIGHT — first strike each exchange deals double damage",
    taunt: "While the sun shines, I cannot be defeated!",
    defeated: "The sun... sets on my pride.",
  },
  {
    name: "The Black Knight", title: "Nameless",
    color: 0x111111, swordColor: 0xcc0000, hp: 200, damage: 24,
    blockChance: 0.35, parryChance: 0.25, aggression: 0.75, speed: 1.05,
    ability: "deathMark", abilityDesc: "DEATH MARK — deals 50% more damage when you are below 40% HP",
    taunt: "...",
    defeated: "......",
  },
];

// ── Shop items ───────────────────────────────────────────────────────────────

interface ShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  oneTime: boolean;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: "potion", name: "Health Potion", desc: "Restore 30% max HP during battle (Q key)", cost: 30, oneTime: false },
  { id: "heal", name: "Field Surgery", desc: "Restore 50 HP now", cost: 25, oneTime: false },
  { id: "full_heal", name: "Blessing of the Lake", desc: "Fully restore HP", cost: 60, oneTime: false },
  { id: "dmg_up", name: "Whetstone", desc: "Permanently +3 base damage", cost: 80, oneTime: false },
  { id: "hp_up", name: "Enchanted Chainmail", desc: "Permanently +20 max HP", cost: 70, oneTime: false },
  { id: "stamina_up", name: "Endurance Tonic", desc: "Permanently +15 max stamina", cost: 50, oneTime: false },
  { id: "extra_potion", name: "Potion Belt Upgrade", desc: "Carry +1 extra potion permanently", cost: 100, oneTime: true },
];

// ── Main Class ───────────────────────────────────────────────────────────────

export class LancelotGame {
  // Three.js core
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _canvas!: HTMLCanvasElement;

  // Game state
  private _phase: Phase = "title";
  private _player!: Fighter;
  private _enemy!: Fighter;
  private _currentEnemyIdx = 0;
  private _cameraAngleY = 0;
  private _cameraAngleX = 0.15;
  private _keys = new Set<string>();
  private _mouseDown = { left: false, right: false };
  private _dt = 0;
  private _animFrame = 0;
  private _introTimer = 0;
  private _resultTimer = 0;
  private _time = 0;

  // Persistent player stats (carry between duels)
  private _potions = 3;
  private _maxPotions = 3;
  private _playerHp = PLAYER_MAX_HP;
  private _playerMaxHp = PLAYER_MAX_HP;
  private _playerDamage = PLAYER_DAMAGE_BASE;
  private _playerMaxStamina = STAMINA_MAX;
  private _gold = 0;
  private _purchasedOneTime = new Set<string>();

  // Poison DOT state
  private _poisonTimer = 0;
  private _poisonDps = 0;

  // Camera shake
  private _shakeIntensity = 0;
  private _shakeDecay = 8;

  // Sword trail
  private _trailMesh: THREE.Mesh | null = null;

  // Enemy ability state
  private _enemySunUsed = false;
  private _enemySunResetTimer = 0; // resets sun flag after 3s of no combat
  private _enemyComboLeft = 0;
  private _bloodDecals: THREE.Mesh[] = [];
  private _victoryPoseTimer = 0;

  // Input buffer
  private _inputBuffer: { action: "attack" | "heavy" | "parry" | "kick"; time: number } | null = null;
  private _inputBufferWindow = 0.2; // 200ms buffer

  // Combat stats
  private _stats = { hits: 0, parries: 0, perfectParries: 0, ripostes: 0, backstabs: 0, maxCombo: 0, potionsUsed: 0, dmgDealt: 0, dmgTaken: 0 };

  // Slow-mo kill cam
  private _slowmoTimer = 0;
  private _timeScale = 1;

  // Lock-on ring
  private _lockOnRing: THREE.Mesh | null = null;

  // Dodge afterimage ghosts
  private _afterimages: { mesh: THREE.Group; timer: number }[] = [];

  // Cape
  private _capeSegments: THREE.Mesh[] = [];

  // Crowd reaction state
  private _crowdExcitement = 0; // 0-1 excitement level

  // Pause
  private _pauseOverlay: HTMLDivElement | null = null;
  private _vignetteEl: HTMLDivElement | null = null;
  private _phaseBeforePause: Phase = "fighting";
  private _destroyed = false;

  // Dynamic camera
  private _cameraZoomTarget = CAMERA_DISTANCE;
  private _cameraFovTarget = 55;

  // Difficulty & NG+
  private _difficulty: "squire" | "knight" | "champion" = "knight";
  private _ngPlus = 0; // 0 = first run, 1 = NG+, etc.
  private _diffMult = { enemyHp: 1, enemyDmg: 1, goldMult: 1, playerDmg: 1 };
  private _sprintDustTimer = 0;

  // Arena objects
  private _torches: THREE.PointLight[] = [];
  private _torchFlicker: number[] = [];
  private _dustParticles!: THREE.Points;
  private _emberParticles!: THREE.Points;
  private _banners: THREE.Mesh[] = [];
  private _flameMeshes: THREE.Mesh[] = [];
  private _playerShadow: THREE.Mesh | null = null;
  private _enemyShadow: THREE.Mesh | null = null;
  private _crosshairEl: HTMLDivElement | null = null;

  // Procedural audio
  private _audioCtx: AudioContext | null = null;

  // Fade overlay
  private _fadeEl: HTMLDivElement | null = null;
  private _crowdDots: THREE.InstancedMesh | null = null;

  // HUD — persistent DOM refs
  private _hud!: HTMLDivElement;
  private _hudPlayerHp!: HTMLDivElement;
  private _hudPlayerHpGhost!: HTMLDivElement;
  private _hudPlayerSt!: HTMLDivElement;
  private _hudEnemyHp!: HTMLDivElement;
  private _hudEnemyHpGhost!: HTMLDivElement;
  private _hudInfo!: HTMLDivElement;
  private _hudHints!: HTMLDivElement;
  private _hudCombo!: HTMLDivElement;
  private _hudPoison!: HTMLDivElement;
  private _hudRiposte!: HTMLDivElement;
  private _hudBleed!: HTMLDivElement;
  private _hudCharge!: HTMLDivElement;
  private _hudChargeFill!: HTMLDivElement;
  private _hudBuilt = false;

  // Input handlers (stored for cleanup)
  private _onKeyDown!: (e: KeyboardEvent) => void;
  private _onKeyUp!: (e: KeyboardEvent) => void;
  private _onMouseDown!: (e: MouseEvent) => void;
  private _onMouseUp!: (e: MouseEvent) => void;
  private _onMouseMove!: (e: MouseEvent) => void;
  private _onResize!: () => void;
  private _onContextMenu!: (e: Event) => void;

  // ── Boot ─────────────────────────────────────────────────────────────────

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();

    this._initThree();
    this._buildArena();
    this._buildCrowd();
    this._buildBanners();
    this._buildDust();
    this._buildLockOnRing();
    this._createHUD();
    this._bindInput();

    this._phase = "title";
    this._currentEnemyIdx = 0;
    this._potions = 3;
    this._maxPotions = 3;
    this._playerHp = PLAYER_MAX_HP;
    this._playerMaxHp = PLAYER_MAX_HP;
    this._playerDamage = PLAYER_DAMAGE_BASE;
    this._playerMaxStamina = STAMINA_MAX;
    this._gold = 0;
    this._purchasedOneTime.clear();
    this._showTitle();

    const clock = new THREE.Clock();
    const loop = () => {
      this._animFrame = requestAnimationFrame(loop);
      this._dt = Math.min(clock.getDelta(), 0.05);
      this._time += this._dt;
      this._update();
      this._renderer.render(this._scene, this._camera);
    };
    loop();
  }

  destroy(): void {
    cancelAnimationFrame(this._animFrame);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("mousedown", this._onMouseDown);
    window.removeEventListener("mouseup", this._onMouseUp);
    window.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("contextmenu", this._onContextMenu);
    if (document.pointerLockElement === this._canvas) {
      document.exitPointerLock();
    }
    this._pauseOverlay?.parentNode?.removeChild(this._pauseOverlay);
    this._fadeEl?.parentNode?.removeChild(this._fadeEl);
    this._vignetteEl?.parentNode?.removeChild(this._vignetteEl);
    this._hud?.parentNode?.removeChild(this._hud);
    this._canvas?.parentNode?.removeChild(this._canvas);
    // Clean afterimages
    for (const ai of this._afterimages) {
      this._scene?.remove(ai.mesh);
    }
    this._afterimages = [];
    // Clean blood decals
    for (const d of this._bloodDecals) { this._scene?.remove(d); }
    this._bloodDecals = [];
    // Clean trail mesh
    if (this._trailMesh) { this._scene?.remove(this._trailMesh); this._trailMesh = null; }
    this._destroyed = true;
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
    this._canvas.id = "lancelot-canvas";
    this._canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;cursor:crosshair;";
    document.getElementById("pixi-container")!.appendChild(this._canvas);

    this._renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.8;

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x1a1515);
    this._scene.fog = new THREE.Fog(0x1a1515, 30, 60);

    this._camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100);
  }

  // ── Arena ──────────────────────────────────────────────────────────────

  private _buildArena(): void {
    // ── Sky dome (starfield) ──
    const skyGeo = new THREE.SphereGeometry(50, 16, 12);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x0a0a1a, side: THREE.BackSide });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.y = 5;
    this._scene.add(sky);
    // Stars
    const starCount = 150;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.4; // upper hemisphere only
      const r = 48;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi) + 5;
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xccccdd, size: 0.2, transparent: true, opacity: 0.8 });
    this._scene.add(new THREE.Points(starGeo, starMat));

    // ── Ground (stone tiles with vertex color variation) ──
    const groundGeo = new THREE.CircleGeometry(ARENA_RADIUS + 2, 64);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9, metalness: 0.1, vertexColors: true });
    // Add vertex color noise for tile variation
    const gCount = groundGeo.attributes.position.count;
    const gColors = new Float32Array(gCount * 3);
    for (let i = 0; i < gCount; i++) {
      const base = 0.14 + Math.random() * 0.06; // subtle variation
      gColors[i * 3] = base + 0.02;
      gColors[i * 3 + 1] = base;
      gColors[i * 3 + 2] = base - 0.04;
    }
    groundGeo.setAttribute("color", new THREE.BufferAttribute(gColors, 3));
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this._scene.add(ground);

    // Concentric stone rings (more of them, varied thickness)
    for (let r = 2; r <= ARENA_RADIUS; r += 2) {
      const thick = r % 4 === 0 ? 0.12 : 0.06;
      const ringGeo = new THREE.RingGeometry(r - thick, r + thick, 64);
      const shade = 0x3d2e1e + (r % 6 === 0 ? 0x0a0805 : 0);
      const ringMat = new THREE.MeshStandardMaterial({ color: shade, roughness: 0.8 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      this._scene.add(ring);
    }

    // Radial lines (16 spoke pattern like a compass rose)
    for (let i = 0; i < 16; i++) {
      const thick = i % 4 === 0 ? 0.1 : 0.05;
      const len = i % 4 === 0 ? ARENA_RADIUS * 1.6 : ARENA_RADIUS * 0.9;
      const lineGeo = new THREE.PlaneGeometry(thick, len);
      const lineMat = new THREE.MeshStandardMaterial({ color: i % 4 === 0 ? 0x443322 : 0x3a2e1e, roughness: 0.85 });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.rotation.z = (i * Math.PI) / 8;
      line.position.y = 0.01;
      this._scene.add(line);
    }

    // Center emblem — nested rings
    for (const [inner, outer, col] of [[1.8, 2.2, 0x665522], [1.4, 1.5, 0x554418], [2.5, 2.6, 0x554418]] as const) {
      const eGeo = new THREE.RingGeometry(inner, outer, 32);
      const eMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, metalness: 0.3 });
      const em = new THREE.Mesh(eGeo, eMat);
      em.rotation.x = -Math.PI / 2;
      em.position.y = 0.02;
      this._scene.add(em);
    }

    // Center cross emblem on floor
    for (let i = 0; i < 2; i++) {
      const cGeo = new THREE.PlaneGeometry(i === 0 ? 0.15 : 1.2, i === 0 ? 1.2 : 0.15);
      const cMat = new THREE.MeshStandardMaterial({ color: 0x776633, roughness: 0.6, metalness: 0.3 });
      const c = new THREE.Mesh(cGeo, cMat);
      c.rotation.x = -Math.PI / 2;
      c.position.y = 0.025;
      this._scene.add(c);
    }

    // ── Walls (with stone block lines) ──
    const wallGeo = new THREE.CylinderGeometry(ARENA_RADIUS + 1, ARENA_RADIUS + 1.5, WALL_HEIGHT, 48, 4, true);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 1, metalness: 0, side: THREE.BackSide, vertexColors: true });
    // Add block pattern via vertex colors
    const wCount = wallGeo.attributes.position.count;
    const wColors = new Float32Array(wCount * 3);
    for (let i = 0; i < wCount; i++) {
      const y = wallGeo.attributes.position.getY(i);
      const blockNoise = Math.sin(i * 3.7) * 0.02 + Math.sin(y * 4) * 0.015;
      wColors[i * 3] = 0.22 + blockNoise;
      wColors[i * 3 + 1] = 0.19 + blockNoise;
      wColors[i * 3 + 2] = 0.16 + blockNoise;
    }
    wallGeo.setAttribute("color", new THREE.BufferAttribute(wColors, 3));
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = WALL_HEIGHT / 2;
    wall.receiveShadow = true;
    this._scene.add(wall);

    // Horizontal mortar lines on wall
    for (let h = 1; h < WALL_HEIGHT; h += 1.5) {
      const mortarGeo = new THREE.TorusGeometry(ARENA_RADIUS + 1.2, 0.03, 3, 48);
      const mortarMat = new THREE.MeshStandardMaterial({ color: 0x221a12, roughness: 1 });
      const mortar = new THREE.Mesh(mortarGeo, mortarMat);
      mortar.position.y = h;
      mortar.rotation.x = Math.PI / 2;
      this._scene.add(mortar);
    }

    // Upper gallery wall
    const gallery = new THREE.CylinderGeometry(ARENA_RADIUS + 2, ARENA_RADIUS + 2, 3, 48, 1, true);
    const galleryMat = new THREE.MeshStandardMaterial({ color: 0x2a2218, roughness: 1, side: THREE.BackSide });
    const galleryMesh = new THREE.Mesh(gallery, galleryMat);
    galleryMesh.position.y = WALL_HEIGHT + 1.5;
    this._scene.add(galleryMesh);

    // ── Contact shadows (blob shadows under fighters) ──
    const shadowGeo = new THREE.CircleGeometry(0.5, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
    this._playerShadow = new THREE.Mesh(shadowGeo, shadowMat.clone());
    this._playerShadow.rotation.x = -Math.PI / 2;
    this._playerShadow.position.y = 0.015;
    this._scene.add(this._playerShadow);
    this._enemyShadow = new THREE.Mesh(shadowGeo.clone(), shadowMat.clone());
    this._enemyShadow.rotation.x = -Math.PI / 2;
    this._enemyShadow.position.y = 0.015;
    this._scene.add(this._enemyShadow);

    // Pillars + torches
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const px = Math.cos(angle) * (ARENA_RADIUS + 0.3);
      const pz = Math.sin(angle) * (ARENA_RADIUS + 0.3);

      const pillarGeo = new THREE.CylinderGeometry(0.45, 0.55, WALL_HEIGHT + 3, 12);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.9 });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, (WALL_HEIGHT + 3) / 2, pz);
      pillar.castShadow = true;
      this._scene.add(pillar);

      // Pillar capital (decorative top)
      const capGeo = new THREE.CylinderGeometry(0.6, 0.45, 0.3, 12);
      const capMat = new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.7, metalness: 0.2 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(px, WALL_HEIGHT + 3 + 0.15, pz);
      this._scene.add(cap);

      // Torch bracket (small geometry)
      const bracketGeo = new THREE.BoxGeometry(0.08, 0.4, 0.08);
      const bracketMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.4 });
      const bracket = new THREE.Mesh(bracketGeo, bracketMat);
      bracket.position.set(px * 0.95, WALL_HEIGHT - 0.5, pz * 0.95);
      this._scene.add(bracket);

      // Torch light
      const torch = new THREE.PointLight(0xff8833, 3.0, 22, 2);
      torch.position.set(px * 0.92, WALL_HEIGHT - 0.8, pz * 0.92);
      torch.castShadow = i % 3 === 0; // shadow every 3rd torch for perf
      if (torch.castShadow) torch.shadow.mapSize.set(256, 256);
      this._scene.add(torch);
      this._torches.push(torch);
      this._torchFlicker.push(Math.random() * Math.PI * 2);

      // Multi-layer flame (core + outer + halo) — stored for animation
      const fPos = torch.position.clone();
      const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 12), new THREE.MeshBasicMaterial({ color: 0xffdd55 }));
      flameCore.position.copy(fPos);
      this._scene.add(flameCore);
      this._flameMeshes.push(flameCore);
      const flameOuter = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 12), new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.6 }));
      flameOuter.position.copy(fPos);
      this._scene.add(flameOuter);
      this._flameMeshes.push(flameOuter);
      const flameHalo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.15 }));
      flameHalo.position.copy(fPos);
      this._scene.add(flameHalo);

      // Archway between every other pair of pillars
      if (i % 2 === 0) {
        const nextAngle = ((i + 1) / 12) * Math.PI * 2;
        const nx = Math.cos(nextAngle) * (ARENA_RADIUS + 0.3);
        const nz = Math.sin(nextAngle) * (ARENA_RADIUS + 0.3);
        const midX = (px + nx) / 2;
        const midZ = (pz + nz) / 2;
        const archGeo = new THREE.TorusGeometry(0.8, 0.1, 12, 8, Math.PI);
        const archMat = new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.9 });
        const arch = new THREE.Mesh(archGeo, archMat);
        arch.position.set(midX, WALL_HEIGHT - 0.5, midZ);
        arch.rotation.y = angle + Math.PI / 12;
        this._scene.add(arch);
      }
    }

    // Ground braziers at compass points
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const bx = Math.cos(angle) * (ARENA_RADIUS - 3);
      const bz = Math.sin(angle) * (ARENA_RADIUS - 3);

      // Brazier bowl
      const bowlGeo = new THREE.CylinderGeometry(0.4, 0.25, 0.5, 12);
      const bowlMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6, metalness: 0.7 });
      const bowl = new THREE.Mesh(bowlGeo, bowlMat);
      bowl.position.set(bx, 0.8, bz);
      this._scene.add(bowl);

      // Brazier stand with cross-legs
      const standGeo = new THREE.CylinderGeometry(0.08, 0.18, 0.8, 12);
      const standMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8, metalness: 0.5 });
      const stand = new THREE.Mesh(standGeo, standMat);
      stand.position.set(bx, 0.4, bz);
      this._scene.add(stand);

      // Multi-layer brazier fire
      const fireCore = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 12), new THREE.MeshBasicMaterial({ color: 0xffdd44 }));
      fireCore.position.set(bx, 1.15, bz);
      this._scene.add(fireCore);
      const fireOuter = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 12), new THREE.MeshBasicMaterial({ color: 0xff5511, transparent: true, opacity: 0.5 }));
      fireOuter.position.set(bx, 1.15, bz);
      this._scene.add(fireOuter);
      const fireGlow = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 16), new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.12 }));
      fireGlow.position.set(bx, 1.2, bz);
      this._scene.add(fireGlow);

      const bLight = new THREE.PointLight(0xff6622, 2.5, 18, 2);
      bLight.position.set(bx, 1.5, bz);
      this._scene.add(bLight);
      this._torches.push(bLight);
      this._torchFlicker.push(Math.random() * Math.PI * 2);
    }

    // Weapon rack props (2 racks on arena edge)
    for (let i = 0; i < 2; i++) {
      const rAngle = (i === 0 ? 0.15 : 0.65) * Math.PI * 2;
      const rx = Math.cos(rAngle) * (ARENA_RADIUS - 1.5);
      const rz = Math.sin(rAngle) * (ARENA_RADIUS - 1.5);
      // Rack frame
      const rackGeo = new THREE.BoxGeometry(0.08, 1.2, 0.6);
      const rackMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 });
      const rack = new THREE.Mesh(rackGeo, rackMat);
      rack.position.set(rx, 0.6, rz);
      rack.rotation.y = rAngle;
      this._scene.add(rack);
      // Decorative swords on rack
      for (let s = 0; s < 3; s++) {
        const rSword = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.8, 0.06), new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.9, roughness: 0.2 }));
        rSword.position.set(rx + Math.cos(rAngle) * 0.06, 0.5 + s * 0.2, rz + Math.sin(rAngle) * 0.06 + (s - 1) * 0.15);
        rSword.rotation.z = 0.1 * (s - 1);
        this._scene.add(rSword);
      }
    }

    // Gallery railing
    const railGeo = new THREE.TorusGeometry(ARENA_RADIUS + 1.5, 0.06, 10, 48);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.8, metalness: 0.3 });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.y = WALL_HEIGHT + 0.2;
    rail.rotation.x = Math.PI / 2;
    this._scene.add(rail);

    // Ground fog layer
    const fogGeo = new THREE.CircleGeometry(ARENA_RADIUS - 1, 32);
    const fogMat = new THREE.MeshBasicMaterial({ color: 0x221815, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const fogLayer = new THREE.Mesh(fogGeo, fogMat);
    fogLayer.rotation.x = -Math.PI / 2;
    fogLayer.position.y = 0.05;
    this._scene.add(fogLayer);

    // Ambient
    const ambient = new THREE.AmbientLight(0x665850, 1.4);
    this._scene.add(ambient);

    // Hemisphere fill light
    const hemi = new THREE.HemisphereLight(0x667788, 0x332222, 0.8);
    this._scene.add(hemi);

    // Moonlight
    const moon = new THREE.DirectionalLight(0x8899bb, 1.2);
    moon.position.set(5, 20, -5);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.near = 1;
    moon.shadow.camera.far = 40;
    moon.shadow.camera.left = -20;
    moon.shadow.camera.right = 20;
    moon.shadow.camera.top = 20;
    moon.shadow.camera.bottom = -20;
    this._scene.add(moon);
  }

  // ── Crowd (instanced dots on stands) ───────────────────────────────────

  private _buildCrowd(): void {
    const count = 300;
    const dummy = new THREE.Object3D();
    const geo = new THREE.SphereGeometry(0.18, 20, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 1 });
    this._crowdDots = new THREE.InstancedMesh(geo, mat, count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = ARENA_RADIUS + 1.2 + Math.random() * 1.5;
      const y = WALL_HEIGHT + 0.3 + Math.random() * 2;
      dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
      dummy.scale.setScalar(0.6 + Math.random() * 0.5);
      dummy.updateMatrix();
      this._crowdDots.setMatrixAt(i, dummy.matrix);
    }
    this._crowdDots.instanceMatrix.needsUpdate = true;
    this._scene.add(this._crowdDots);
  }

  // ── Banners ────────────────────────────────────────────────────────────

  private _buildBanners(): void {
    const bannerColors = [0xcc2222, 0x2244aa, 0xdaa520, 0x22aa44, 0x8833aa, 0xaa4422];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const bx = Math.cos(angle) * (ARENA_RADIUS + 0.5);
      const bz = Math.sin(angle) * (ARENA_RADIUS + 0.5);

      // Banner pole
      const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 4, 10);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(bx, WALL_HEIGHT + 2, bz);
      this._scene.add(pole);

      // Banner cloth
      const clothGeo = new THREE.PlaneGeometry(0.8, 2.5, 4, 8);
      const clothMat = new THREE.MeshStandardMaterial({
        color: bannerColors[i % bannerColors.length],
        side: THREE.DoubleSide,
        roughness: 0.8,
      });
      const cloth = new THREE.Mesh(clothGeo, clothMat);
      cloth.position.set(bx * 0.98, WALL_HEIGHT + 2.5, bz * 0.98);
      cloth.rotation.y = angle + Math.PI / 2;
      this._scene.add(cloth);
      this._banners.push(cloth);
    }
  }

  // ── Dust particles ─────────────────────────────────────────────────────

  private _buildDust(): void {
    const count = 250;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * ARENA_RADIUS * 2;
      positions[i * 3 + 1] = Math.random() * WALL_HEIGHT;
      positions[i * 3 + 2] = (Math.random() - 0.5) * ARENA_RADIUS * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x665544, size: 0.06, transparent: true, opacity: 0.4 });
    this._dustParticles = new THREE.Points(geo, mat);
    this._scene.add(this._dustParticles);

    // Ember particles (rising from braziers) — orange/red small points
    const emberCount = 60;
    const emberPos = new Float32Array(emberCount * 3);
    for (let i = 0; i < emberCount; i++) {
      const bAngle = ((i % 4) / 4) * Math.PI * 2 + Math.PI / 4;
      const bx = Math.cos(bAngle) * (ARENA_RADIUS - 3);
      const bz = Math.sin(bAngle) * (ARENA_RADIUS - 3);
      emberPos[i * 3] = bx + (Math.random() - 0.5) * 1.5;
      emberPos[i * 3 + 1] = 1 + Math.random() * 4;
      emberPos[i * 3 + 2] = bz + (Math.random() - 0.5) * 1.5;
    }
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
    const emberMat = new THREE.PointsMaterial({ color: 0xff6622, size: 0.05, transparent: true, opacity: 0.7 });
    this._emberParticles = new THREE.Points(emberGeo, emberMat);
    this._scene.add(this._emberParticles);
  }

  // ── Lock-on ring ────────────────────────────────────────────────────────

  private _buildLockOnRing(): void {
    const ringGeo = new THREE.RingGeometry(0.6, 0.75, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xcc4444, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    this._lockOnRing = new THREE.Mesh(ringGeo, ringMat);
    this._lockOnRing.rotation.x = -Math.PI / 2;
    this._lockOnRing.visible = false;
    this._scene.add(this._lockOnRing);
  }

  // ── Cape (added to player after fighter creation) ──────────────────────

  private _addCape(fighter: Fighter): void {
    this._capeSegments = [];
    const segCount = 5;
    for (let i = 0; i < segCount; i++) {
      const segGeo = new THREE.PlaneGeometry(0.6, 0.35, 3, 1);
      const segMat = new THREE.MeshStandardMaterial({
        color: 0x1a2244,
        side: THREE.DoubleSide,
        roughness: 0.9,
      });
      const seg = new THREE.Mesh(segGeo, segMat);
      seg.position.set(0, 1.8 - i * 0.3, -0.3);
      fighter.mesh.add(seg);
      this._capeSegments.push(seg);
    }
  }

  // ── Fighter creation ───────────────────────────────────────────────────

  private _createFighter(color: number, swordColor: number, x: number, z: number, rot: number, maxHp: number): Fighter {
    const group = new THREE.Group();
    const armorMat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.65 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.5 });
    const chainmail = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7, metalness: 0.55 });

    // ── Lower body ──
    // Waist / belt
    const waistGeo = new THREE.CylinderGeometry(0.32, 0.35, 0.25, 10);
    const waist = new THREE.Mesh(waistGeo, new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.85, metalness: 0.2 }));
    waist.position.y = 0.7;
    group.add(waist);

    // Belt buckle
    const buckleGeo = new THREE.BoxGeometry(0.12, 0.1, 0.06);
    const buckle = new THREE.Mesh(buckleGeo, new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.8, roughness: 0.3 }));
    buckle.position.set(0, 0.72, 0.33);
    group.add(buckle);

    // Legs (in pivot groups for animation)
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.16, 0.55, 0); // hip pivot point
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.16, 0.55, 0);

    for (const [_side, legGroup] of [[-1, leftLegGroup], [1, rightLegGroup]] as const) {
      // Upper leg (chainmail)
      const thighGeo = new THREE.CylinderGeometry(0.13, 0.12, 0.5, 12);
      const thigh = new THREE.Mesh(thighGeo, chainmail.clone());
      thigh.position.set(0, -0.1, 0);
      legGroup.add(thigh);
      // Knee guard
      const kneeGeo = new THREE.SphereGeometry(0.09, 20, 16);
      const knee = new THREE.Mesh(kneeGeo, armorMat.clone());
      knee.position.set(0, -0.33, 0.06);
      legGroup.add(knee);
      // Lower leg (greave)
      const greaveGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.4, 12);
      const greave = new THREE.Mesh(greaveGeo, darkMetal.clone());
      greave.position.set(0, -0.45, 0);
      greave.castShadow = true;
      legGroup.add(greave);
      // Boot
      const bootGeo = new THREE.BoxGeometry(0.14, 0.08, 0.22);
      const boot = new THREE.Mesh(bootGeo, new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 }));
      boot.position.set(0, -0.61, 0.03);
      legGroup.add(boot);
      group.add(legGroup);
    }

    // ── Upper body ──
    // Torso (cuirass)
    const bodyGeo = new THREE.CylinderGeometry(0.33, 0.36, 1.1, 10);
    const body = new THREE.Mesh(bodyGeo, armorMat);
    body.position.y = 1.35;
    body.castShadow = true;
    group.add(body);

    // Chest plate ridge (center line detail)
    const ridgeGeo = new THREE.BoxGeometry(0.04, 0.6, 0.04);
    const ridge = new THREE.Mesh(ridgeGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.8 }));
    ridge.position.set(0, 1.35, 0.34);
    group.add(ridge);

    // Gorget (neck guard)
    const gorgetGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.2, 10);
    const gorget = new THREE.Mesh(gorgetGeo, armorMat.clone());
    gorget.position.y = 1.95;
    group.add(gorget);

    // Shoulder pauldrons (large, layered)
    for (const side of [-1, 1]) {
      // Main pauldron dome
      const paulGeo = new THREE.SphereGeometry(0.22, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const paul = new THREE.Mesh(paulGeo, armorMat.clone());
      paul.position.set(side * 0.42, 1.92, 0);
      paul.castShadow = true;
      group.add(paul);
      // Pauldron rim
      const paulRimGeo = new THREE.TorusGeometry(0.2, 0.025, 10, 12);
      const paulRim = new THREE.Mesh(paulRimGeo, new THREE.MeshStandardMaterial({ color: 0x887744, metalness: 0.7, roughness: 0.3 }));
      paulRim.position.set(side * 0.42, 1.88, 0);
      paulRim.rotation.x = Math.PI / 2;
      group.add(paulRim);
    }

    // ── Head ──
    // Helmet (great helm shape: cylinder + dome)
    const helmBaseGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.22, 12);
    const helmBase = new THREE.Mesh(helmBaseGeo, new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.35, metalness: 0.75 }));
    helmBase.position.y = 2.05;
    group.add(helmBase);
    const helmDomeGeo = new THREE.SphereGeometry(0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const helmDome = new THREE.Mesh(helmDomeGeo, new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.35, metalness: 0.75 }));
    helmDome.position.y = 2.16;
    helmDome.castShadow = true;
    group.add(helmDome);

    // Visor slit (dark horizontal line)
    const visorGeo = new THREE.BoxGeometry(0.18, 0.03, 0.06);
    const visor = new THREE.Mesh(visorGeo, new THREE.MeshStandardMaterial({ color: 0x050505 }));
    visor.position.set(0, 2.08, 0.2);
    group.add(visor);

    // Breathing holes (3 small dots below visor)
    for (let i = -1; i <= 1; i++) {
      const holeGeo = new THREE.CircleGeometry(0.015, 4);
      const hole = new THREE.Mesh(holeGeo, new THREE.MeshBasicMaterial({ color: 0x050505 }));
      hole.position.set(i * 0.04, 2.02, 0.215);
      group.add(hole);
    }

    // Helmet crest (taller, more prominent)
    const crestGeo = new THREE.BoxGeometry(0.035, 0.18, 0.25);
    const crest = new THREE.Mesh(crestGeo, armorMat.clone());
    crest.position.set(0, 2.3, -0.02);
    group.add(crest);

    // ── Tabard (front + back) ──
    const tabardFGeo = new THREE.PlaneGeometry(0.4, 0.65, 2, 3);
    const tabardFMat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.85 });
    const tabardF = new THREE.Mesh(tabardFGeo, tabardFMat);
    tabardF.position.set(0, 0.7, 0.2);
    group.add(tabardF);
    const tabardBGeo = new THREE.PlaneGeometry(0.4, 0.65, 2, 3);
    const tabardB = new THREE.Mesh(tabardBGeo, tabardFMat.clone());
    tabardB.position.set(0, 0.7, -0.2);
    group.add(tabardB);

    // Tabard cross emblem (front)
    const crossV = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.3), new THREE.MeshStandardMaterial({ color: 0xddcc88, roughness: 0.8 }));
    crossV.position.set(0, 0.75, 0.21);
    group.add(crossV);
    const crossH = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.06), crossV.material);
    crossH.position.set(0, 0.8, 0.21);
    group.add(crossH);

    // ── Sword arm group ──
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0.5, 1.5, 0);
    swordGroup.name = "swordGroup";

    // Upper arm (armor)
    const uArmGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.35, 12);
    const uArm = new THREE.Mesh(uArmGeo, armorMat.clone());
    uArm.position.y = -0.05;
    swordGroup.add(uArm);
    // Forearm (chainmail)
    const fArmGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.3, 12);
    const fArm = new THREE.Mesh(fArmGeo, chainmail.clone());
    fArm.position.y = -0.3;
    swordGroup.add(fArm);
    // Gauntlet
    const gauntGeo = new THREE.BoxGeometry(0.1, 0.08, 0.1);
    const gaunt = new THREE.Mesh(gauntGeo, darkMetal.clone());
    gaunt.position.y = -0.48;
    swordGroup.add(gaunt);

    // Sword handle (leather wrap)
    const handleGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.22, 12);
    const handle = new THREE.Mesh(handleGeo, new THREE.MeshStandardMaterial({ color: 0x443311, roughness: 0.9 }));
    handle.position.y = -0.55;
    swordGroup.add(handle);

    // Crossguard (wider, curved)
    const guardGeo = new THREE.BoxGeometry(0.32, 0.04, 0.04);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x998855, roughness: 0.25, metalness: 0.85 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.y = -0.64;
    swordGroup.add(guard);

    // Sword blade (tapered)
    const bladeGeo = new THREE.CylinderGeometry(0.005, 0.04, 1.15, 10);
    const bladeMat = new THREE.MeshStandardMaterial({ color: swordColor, roughness: 0.1, metalness: 0.95 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = -1.25;
    blade.castShadow = true;
    swordGroup.add(blade);

    // Fuller (blood groove line on blade)
    const fullerGeo = new THREE.BoxGeometry(0.005, 0.7, 0.015);
    const fullerMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.8 });
    const fuller = new THREE.Mesh(fullerGeo, fullerMat);
    fuller.position.y = -1.0;
    swordGroup.add(fuller);

    // Pommel
    const pommelGeo = new THREE.SphereGeometry(0.04, 20, 16);
    const pommelMat = new THREE.MeshStandardMaterial({ color: 0xbb9955, metalness: 0.8, roughness: 0.25 });
    const pommel = new THREE.Mesh(pommelGeo, pommelMat);
    pommel.position.y = -0.44;
    swordGroup.add(pommel);

    group.add(swordGroup);

    // ── Shield arm group ──
    const shieldGroup = new THREE.Group();
    shieldGroup.position.set(-0.5, 1.3, 0.15);
    shieldGroup.name = "shieldGroup";

    // Upper arm + forearm
    const sArmGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.35, 12);
    const sArm = new THREE.Mesh(sArmGeo, armorMat.clone());
    sArm.position.y = 0.05;
    shieldGroup.add(sArm);
    const sfArmGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.25, 12);
    const sfArm = new THREE.Mesh(sfArmGeo, chainmail.clone());
    sfArm.position.y = -0.2;
    shieldGroup.add(sfArm);

    // Shield (heater shape — wider top, narrow bottom)
    const shieldGeo = new THREE.CylinderGeometry(0.22, 0.12, 0.7, 12);
    const shieldMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.position.set(-0.12, -0.1, 0.05);
    shield.rotation.z = Math.PI / 2;
    shieldGroup.add(shield);

    // Shield boss
    const bossGeo = new THREE.SphereGeometry(0.1, 16, 12, 0, Math.PI);
    const bossMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, metalness: 0.75, roughness: 0.25 });
    const boss = new THREE.Mesh(bossGeo, bossMat);
    boss.position.set(-0.15, -0.1, 0.1);
    boss.rotation.y = -Math.PI / 2;
    shieldGroup.add(boss);

    // Shield rim
    const rimGeo = new THREE.TorusGeometry(0.28, 0.02, 10, 16);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x887744, metalness: 0.65, roughness: 0.35 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(-0.14, -0.1, 0.06);
    rim.rotation.y = -Math.PI / 2;
    shieldGroup.add(rim);

    group.add(shieldGroup);

    group.position.set(x, 0, z);
    group.rotation.y = rot;
    this._scene.add(group);

    return {
      mesh: group,
      swordGroup,
      shieldGroup,
      bodyMesh: body,
      swordMesh: blade,
      shieldMesh: shield,
      pos: new THREE.Vector3(x, 0, z),
      rot,
      hp: maxHp,
      maxHp,
      stamina: STAMINA_MAX,
      action: "idle",
      actionTimer: 0,
      attackDir: "overhead",
      staminaRegenDelay: 0,
      invincible: false,
      dodgeDir: new THREE.Vector3(),
      color,
      swordColor,
      comboCount: 0,
      comboTimer: 0,
      riposteReady: false,
      riposteTimer: 0,
      hitThisSwing: false,
      trailPoints: [],
      perfectParry: false,
      bleedTimer: 0,
      bleedDps: 0,
      retreatTimer: 0,
      abilityGlow: null,
      leftLeg: leftLegGroup,
      rightLeg: rightLegGroup,
    };
  }

  // ── HUD (persistent DOM) ───────────────────────────────────────────────

  private _createHUD(): void {
    this._hud = document.createElement("div");
    this._hud.id = "lancelot-hud";
    this._hud.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:11;pointer-events:none;font-family:'Segoe UI',monospace;";
    document.getElementById("pixi-container")!.appendChild(this._hud);
    this._hudBuilt = false;

    // Vignette overlay
    this._vignetteEl = document.createElement("div");
    this._vignetteEl.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;pointer-events:none;background:radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.3) 100%);";
    document.getElementById("pixi-container")!.appendChild(this._vignetteEl);
  }

  private _buildFightHUD(): void {
    const def = ENEMIES[this._currentEnemyIdx];
    this._hud.innerHTML = `
      <div id="lhud-crosshair" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;border:1px solid rgba(255,200,100,0.3);border-radius:50%;transition:all 0.15s;"></div>
      <div style="position:absolute;bottom:60px;left:40px;width:300px;">
        <div style="font-size:11px;color:#daa520;letter-spacing:3px;margin-bottom:4px;">SIR LANCELOT</div>
        <div style="height:14px;background:#1a1210;border:1px solid #443322;border-radius:2px;overflow:hidden;margin-bottom:4px;position:relative;">
          <div id="lhud-php-ghost" style="position:absolute;height:100%;width:100%;background:#aa8866;transition:width 0.8s ease-out;"></div>
          <div id="lhud-php" style="position:absolute;height:100%;width:100%;background:linear-gradient(90deg,#8b0000,#cc2222);transition:width 0.15s;"></div>
        </div>
        <div style="height:8px;background:#1a1210;border:1px solid #333322;border-radius:2px;overflow:hidden;">
          <div id="lhud-pst" style="height:100%;width:100%;background:linear-gradient(90deg,#2a6a2a,#44aa44);transition:width 0.15s;"></div>
        </div>
      </div>
      <div style="position:absolute;top:40px;left:50%;transform:translateX(-50%);width:420px;text-align:center;">
        <div id="lhud-ename" style="font-size:11px;letter-spacing:3px;margin-bottom:4px;color:#${def.color.toString(16).padStart(6, "0")};">
          ${def.name.toUpperCase()} — ${def.title.toUpperCase()}
        </div>
        <div style="height:14px;background:#1a1210;border:1px solid #443322;border-radius:2px;overflow:hidden;margin-bottom:3px;position:relative;">
          <div id="lhud-ehp-ghost" style="position:absolute;height:100%;width:100%;background:#aa8866;transition:width 0.8s ease-out;"></div>
          <div id="lhud-ehp" style="position:absolute;height:100%;width:100%;background:linear-gradient(90deg,#8b0000,#cc2222);transition:width 0.15s;"></div>
        </div>
        ${def.abilityDesc ? `<div style="font-size:9px;color:#887766;letter-spacing:1px;">${def.abilityDesc}</div>` : ""}
      </div>
      <div id="lhud-info" style="position:absolute;top:40px;right:40px;font-size:11px;color:#665544;letter-spacing:2px;text-align:right;"></div>
      <div id="lhud-hints" style="position:absolute;bottom:130px;left:50%;transform:translateX(-50%);font-size:11px;color:#665544;letter-spacing:2px;text-align:center;"></div>
      <div id="lhud-combo" style="position:absolute;bottom:110px;right:40px;font-size:18px;font-weight:bold;color:#daa520;letter-spacing:2px;opacity:0;transition:opacity 0.3s;"></div>
      <div id="lhud-poison" style="position:absolute;bottom:100px;left:40px;font-size:11px;color:#44dd44;letter-spacing:1px;opacity:0;transition:opacity 0.3s;"></div>
      <div id="lhud-riposte" style="position:absolute;top:50%;left:50%;transform:translate(-50%,30px);font-size:14px;font-weight:bold;color:#ffd700;letter-spacing:3px;opacity:0;transition:opacity 0.2s;text-shadow:0 0 12px rgba(255,215,0,0.6);"></div>
      <div id="lhud-bleed" style="position:absolute;top:72px;left:50%;transform:translateX(-50%);font-size:9px;color:#cc4444;letter-spacing:1px;opacity:0;transition:opacity 0.3s;"></div>
      <div id="lhud-charge" style="position:absolute;bottom:145px;left:50%;transform:translateX(-50%);width:60px;height:4px;background:#1a1210;border:1px solid #443322;border-radius:2px;overflow:hidden;opacity:0;transition:opacity 0.15s;"><div id="lhud-charge-fill" style="height:100%;width:0%;background:#ff8833;transition:width 0.05s;"></div></div>
    `;
    this._hudPlayerHp = document.getElementById("lhud-php") as HTMLDivElement;
    this._hudPlayerHpGhost = document.getElementById("lhud-php-ghost") as HTMLDivElement;
    this._hudPlayerSt = document.getElementById("lhud-pst") as HTMLDivElement;
    this._hudEnemyHp = document.getElementById("lhud-ehp") as HTMLDivElement;
    this._hudEnemyHpGhost = document.getElementById("lhud-ehp-ghost") as HTMLDivElement;
    this._hudInfo = document.getElementById("lhud-info") as HTMLDivElement;
    this._hudHints = document.getElementById("lhud-hints") as HTMLDivElement;
    this._hudCombo = document.getElementById("lhud-combo") as HTMLDivElement;
    this._hudPoison = document.getElementById("lhud-poison") as HTMLDivElement;
    this._hudRiposte = document.getElementById("lhud-riposte") as HTMLDivElement;
    this._hudBleed = document.getElementById("lhud-bleed") as HTMLDivElement;
    this._hudCharge = document.getElementById("lhud-charge") as HTMLDivElement;
    this._hudChargeFill = document.getElementById("lhud-charge-fill") as HTMLDivElement;
    this._crosshairEl = document.getElementById("lhud-crosshair") as HTMLDivElement;
    this._hudBuilt = true;
  }

  private _updateHUD(): void {
    if (!this._hudBuilt || !this._player || !this._enemy) return;

    const p = this._player;
    const e = this._enemy;

    const phpPct = `${Math.max(0, p.hp / p.maxHp) * 100}%`;
    const ehpPct = `${Math.max(0, e.hp / e.maxHp) * 100}%`;
    this._hudPlayerHp.style.width = phpPct;
    this._hudPlayerHpGhost.style.width = phpPct; // ghost trails behind via slower CSS transition
    this._hudPlayerSt.style.width = `${(p.stamina / this._playerMaxStamina) * 100}%`;
    this._hudEnemyHp.style.width = ehpPct;
    this._hudEnemyHpGhost.style.width = ehpPct;

    const diffTag = this._difficulty === "champion" ? `<span style="color:#cc4444;">${this._difficulty.toUpperCase()}</span>` : `<span style="color:#887766;">${this._difficulty.toUpperCase()}</span>`;
    const ngTag = this._ngPlus > 0 ? ` <span style="color:#ff8833;">NG+${this._ngPlus}</span>` : "";
    this._hudInfo.innerHTML = `${diffTag}${ngTag} · DUEL ${this._currentEnemyIdx + 1} / ${ENEMIES.length}<br>` +
      `<span style="color:#daa520;">POTIONS: ${"♦".repeat(this._potions)}${"♢".repeat(Math.max(0, this._maxPotions - this._potions))}</span><br>` +
      `<span style="color:#ccaa44;">GOLD: ${this._gold}</span>`;

    // Action hints
    const canAct = p.action === "idle" || p.action === "walk" || p.action === "sprint";
    this._hudHints.textContent = canAct
      ? `LMB Attack · Hold LMB Heavy · RMB Parry · F Kick · SPACE Dodge · SHIFT Sprint · Q Potion (${this._potions})`
      : "";

    // Combo display
    if (p.comboCount > 0 && p.comboTimer > 0) {
      this._hudCombo.textContent = `COMBO x${p.comboCount}`;
      this._hudCombo.style.opacity = "1";
    } else {
      this._hudCombo.style.opacity = "0";
    }

    // Poison
    this._hudPoison.style.opacity = this._poisonTimer > 0 ? "1" : "0";
    if (this._poisonTimer > 0) {
      this._hudPoison.textContent = `POISONED (${this._poisonTimer.toFixed(1)}s)`;
    }

    // Riposte prompt
    // Enemy bleed indicator
    if (this._enemy.bleedTimer > 0) {
      this._hudBleed.style.opacity = "1";
      this._hudBleed.textContent = `BLEEDING (${this._enemy.bleedTimer.toFixed(1)}s)`;
    } else {
      this._hudBleed.style.opacity = "0";
    }

    // Heavy charge indicator
    if (this._holdingLMB && this._holdTimer > 0.05) {
      this._hudCharge.style.opacity = "1";
      this._hudChargeFill.style.width = `${Math.min(100, (this._holdTimer / 0.3) * 100)}%`;
      this._hudChargeFill.style.background = this._holdTimer >= 0.3 ? "#ffd700" : "#ff8833";
    } else {
      this._hudCharge.style.opacity = "0";
    }

    // Crosshair feedback
    if (this._crosshairEl) {
      if (p.riposteReady && p.riposteTimer > 0) {
        this._crosshairEl.style.borderColor = "rgba(255,215,0,0.8)";
        this._crosshairEl.style.width = "28px";
        this._crosshairEl.style.height = "28px";
        this._crosshairEl.style.boxShadow = "0 0 8px rgba(255,215,0,0.4)";
      } else if (p.action === "attack" || p.action === "heavy" || p.action === "riposte") {
        this._crosshairEl.style.borderColor = "rgba(255,100,50,0.6)";
        this._crosshairEl.style.width = "16px";
        this._crosshairEl.style.height = "16px";
        this._crosshairEl.style.boxShadow = "none";
      } else if (p.stamina < 20) {
        this._crosshairEl.style.borderColor = "rgba(255,80,80,0.4)";
        this._crosshairEl.style.width = "24px";
        this._crosshairEl.style.height = "24px";
        this._crosshairEl.style.boxShadow = "none";
      } else {
        this._crosshairEl.style.borderColor = "rgba(255,200,100,0.3)";
        this._crosshairEl.style.width = "20px";
        this._crosshairEl.style.height = "20px";
        this._crosshairEl.style.boxShadow = "none";
      }
    }

    if (p.riposteReady && p.riposteTimer > 0) {
      this._hudRiposte.textContent = p.perfectParry ? "PERFECT RIPOSTE!" : "RIPOSTE!";
      this._hudRiposte.style.opacity = "1";
    } else {
      this._hudRiposte.style.opacity = "0";
    }
  }

  // ── Title screen ───────────────────────────────────────────────────────

  private _showTitle(): void {
    this._phase = "title";
    this._hud.style.pointerEvents = "auto";
    this._hudBuilt = false;

    const bestScore = localStorage.getItem("lancelot_best") || "—";
    const ngLabel = this._ngPlus > 0 ? ` <span style="color:#ff8833;">NG+${this._ngPlus}</span>` : "";

    this._hud.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(5,3,2,0.7);">
        <div style="font-size:11px;letter-spacing:8px;color:#665533;margin-bottom:8px;">THE TRIALS OF</div>
        <h1 style="font-size:56px;color:#daa520;text-shadow:0 0 40px rgba(218,165,32,0.4);margin:0 0 4px;letter-spacing:6px;font-family:serif;">
          LANCELOT
        </h1>
        <div style="width:200px;height:2px;background:linear-gradient(90deg,transparent,#daa520,transparent);margin-bottom:6px;"></div>
        <p style="color:#887755;margin:0 0 16px;font-size:13px;letter-spacing:2px;">SWORD OF THE LAKE${ngLabel}</p>

        <div style="display:flex;gap:8px;margin-bottom:20px;">
          <button class="ldiff-btn" data-diff="squire" style="padding:8px 16px;font-size:11px;border:1px solid ${this._difficulty === "squire" ? "#daa520" : "#554422"};border-radius:4px;background:${this._difficulty === "squire" ? "rgba(218,165,32,0.15)" : "transparent"};color:${this._difficulty === "squire" ? "#daa520" : "#776655"};cursor:pointer;font-family:monospace;">SQUIRE<br><span style="font-size:9px;">Easy</span></button>
          <button class="ldiff-btn" data-diff="knight" style="padding:8px 16px;font-size:11px;border:1px solid ${this._difficulty === "knight" ? "#daa520" : "#554422"};border-radius:4px;background:${this._difficulty === "knight" ? "rgba(218,165,32,0.15)" : "transparent"};color:${this._difficulty === "knight" ? "#daa520" : "#776655"};cursor:pointer;font-family:monospace;">KNIGHT<br><span style="font-size:9px;">Normal</span></button>
          <button class="ldiff-btn" data-diff="champion" style="padding:8px 16px;font-size:11px;border:1px solid ${this._difficulty === "champion" ? "#cc4444" : "#554422"};border-radius:4px;background:${this._difficulty === "champion" ? "rgba(204,68,68,0.15)" : "transparent"};color:${this._difficulty === "champion" ? "#cc4444" : "#776655"};cursor:pointer;font-family:monospace;">CHAMPION<br><span style="font-size:9px;">Hard</span></button>
        </div>

        ${bestScore !== "—" ? `<div style="font-size:10px;color:#665544;margin-bottom:16px;">Best: ${bestScore} duels won</div>` : ""}

        <button id="lancelot-start" style="
          padding:14px 50px;font-size:16px;font-weight:bold;letter-spacing:4px;
          border:2px solid #daa520;border-radius:4px;background:rgba(40,30,15,0.8);
          color:#daa520;cursor:pointer;font-family:serif;transition:all 0.3s;
        ">ENTER THE ARENA</button>
        <button id="lancelot-back" style="
          margin-top:12px;padding:8px 24px;font-size:12px;
          border:1px solid #555;border-radius:4px;background:transparent;
          color:#666;cursor:pointer;font-family:monospace;
        ">← BACK TO MENU</button>
        <button id="lancelot-controls" style="
          margin-top:6px;padding:6px 20px;font-size:11px;
          border:1px solid #554422;border-radius:4px;background:transparent;
          color:#887755;cursor:pointer;font-family:monospace;
        ">CONTROLS</button>
        <div id="lancelot-controls-panel" style="display:none;margin-top:12px;max-width:480px;text-align:left;font-size:11px;color:#998866;line-height:1.8;background:rgba(20,15,8,0.9);padding:16px;border:1px solid #443322;border-radius:4px;">
          <div style="color:#daa520;font-weight:bold;margin-bottom:6px;letter-spacing:2px;">COMBAT CONTROLS</div>
          <b style="color:#ccbb99;">LMB</b> Light Attack · <b style="color:#ccbb99;">Hold LMB</b> Heavy Attack (charge 0.3s)<br>
          <b style="color:#ccbb99;">RMB</b> Parry (0.25s window) · <b style="color:#ffd700;">Perfect Parry</b> = first 0.1s → 3.5x riposte<br>
          <b style="color:#ccbb99;">F</b> Shield Bash — breaks enemy guard<br>
          <b style="color:#ccbb99;">SPACE</b> Dodge Roll (i-frames) · <b style="color:#ccbb99;">SHIFT</b> Sprint<br>
          <b style="color:#ccbb99;">Q</b> Health Potion (heals 30% max HP) · <b style="color:#ccbb99;">ESC</b> Pause<br>
          <div style="margin-top:8px;color:#daa520;font-weight:bold;letter-spacing:2px;">TIPS</div>
          <b>Combo:</b> Chain 3 light attacks for 1.0x → 1.15x → 1.4x damage<br>
          <b>Riposte:</b> After parrying, attack for 2.5x damage (3.5x if perfect)<br>
          <b>Backstab:</b> Hit enemy from behind for 1.6x damage<br>
          <b>Heavy:</b> Applies bleed DOT (4 dps / 3s). Spawns ground impact.<br>
          <b>Kick:</b> Low damage but breaks parry stance. Use vs. guard-heavy foes.
        </div>
      </div>
    `;

    document.getElementById("lancelot-start")!.addEventListener("click", () => {
      this._hud.style.pointerEvents = "none";
      this._canvas.requestPointerLock();
      this._startDuel(0);
    });
    document.getElementById("lancelot-back")!.addEventListener("click", () => {
      window.dispatchEvent(new Event("lancelotExit"));
    });
    document.getElementById("lancelot-controls")!.addEventListener("click", () => {
      const panel = document.getElementById("lancelot-controls-panel")!;
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });
    this._hud.querySelectorAll(".ldiff-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this._difficulty = (btn as HTMLElement).dataset.diff as "squire" | "knight" | "champion";
        this._applyDifficulty();
        this._showTitle(); // re-render to update highlight
      });
    });
  }

  private _applyDifficulty(): void {
    const ngScale = 1 + this._ngPlus * 0.25; // NG+ adds 25% per cycle
    switch (this._difficulty) {
      case "squire":
        this._diffMult = { enemyHp: 0.7 * ngScale, enemyDmg: 0.7 * ngScale, goldMult: 1.3, playerDmg: 1.15 };
        break;
      case "knight":
        this._diffMult = { enemyHp: 1.0 * ngScale, enemyDmg: 1.0 * ngScale, goldMult: 1.0, playerDmg: 1.0 };
        break;
      case "champion":
        this._diffMult = { enemyHp: 1.4 * ngScale, enemyDmg: 1.4 * ngScale, goldMult: 0.8, playerDmg: 0.85 };
        break;
    }
  }

  // ── Start a duel ──────────────────────────────────────────────────────

  private _startDuel(idx: number): void {
    this._currentEnemyIdx = idx;
    const def = ENEMIES[idx];

    if (this._player?.mesh) this._scene.remove(this._player.mesh);
    if (this._enemy?.mesh) this._scene.remove(this._enemy.mesh);

    // Create player — carry persistent stats
    this._player = this._createFighter(0xccccdd, 0xeeeeff, 0, 0, 0, this._playerMaxHp);
    this._player.hp = this._playerHp;
    this._player.stamina = this._playerMaxStamina;

    // Create enemy (scaled by difficulty + NG+)
    const scaledHp = Math.round(def.hp * this._diffMult.enemyHp);
    this._enemy = this._createFighter(def.color, def.swordColor, 0, 0, Math.PI, scaledHp);

    this._player.pos.set(0, 0, 8);
    this._player.rot = Math.PI;
    this._enemy.pos.set(0, 0, -8);
    this._enemy.rot = 0;

    this._cameraAngleY = Math.PI;
    this._cameraAngleX = 0.15;
    this._poisonTimer = 0;
    this._poisonDps = 0;
    this._enemySunUsed = false;
    this._enemySunResetTimer = 0;
    this._enemyComboLeft = 0;
    this._slowmoTimer = 0;
    this._timeScale = 1;
    this._crowdExcitement = 0;
    this._victoryPoseTimer = 0;
    this._inputBuffer = null;
    this._stats = { hits: 0, parries: 0, perfectParries: 0, ripostes: 0, backstabs: 0, maxCombo: 0, potionsUsed: 0, dmgDealt: 0, dmgTaken: 0 };

    // Clean old blood decals
    for (const d of this._bloodDecals) { this._scene.remove(d); d.geometry.dispose(); (d.material as THREE.Material).dispose(); }
    this._bloodDecals = [];

    // Add ability glow to enemy
    this._addAbilityGlow(this._enemy, def);
    // Per-duel atmosphere shift
    this._setArenaAtmosphere(idx);

    // Add cape to Lancelot
    this._addCape(this._player);

    this._phase = "intro";
    this._introTimer = 2 + idx * 0.4; // scales: 2s for duel 1 → 4.8s for duel 8
    this._hud.style.pointerEvents = "none";
    this._hudBuilt = false;

    this._hud.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(5,3,2,${idx >= 6 ? 0.7 : 0.5});">
        <div style="font-size:11px;letter-spacing:6px;color:#665533;margin-bottom:8px;">DUEL ${idx + 1} OF ${ENEMIES.length}</div>
        <h2 style="font-size:32px;color:#${def.color.toString(16).padStart(6, "0")};text-shadow:0 0 20px rgba(${(def.color >> 16) & 255},${(def.color >> 8) & 255},${def.color & 255},0.5);margin:0 0 4px;letter-spacing:3px;font-family:serif;">
          ${def.name.toUpperCase()}
        </h2>
        <div style="font-size:14px;color:#887766;letter-spacing:2px;margin-bottom:8px;">${def.title}</div>
        ${def.abilityDesc ? `<div style="font-size:11px;color:#aa8855;letter-spacing:1px;margin-bottom:12px;">${def.abilityDesc}</div>` : ""}
        <p style="color:#aa9977;font-style:italic;font-size:14px;">"${def.taunt}"</p>
      </div>
    `;
  }

  // ── Input binding ──────────────────────────────────────────────────────

  private _holdTimer = 0;
  private _holdingLMB = false;

  private _bindInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      this._keys.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === "q" && this._phase === "fighting") {
        this._usePotion();
      }
      if (e.key.toLowerCase() === "f" && this._phase === "fighting") {
        this._tryKick();
      }
      if (e.key === "Escape") {
        if (this._phase === "paused") {
          this._resumeGame();
        } else if (this._phase === "fighting") {
          this._pauseGame();
        } else if (document.pointerLockElement === this._canvas) {
          document.exitPointerLock();
        } else {
          window.dispatchEvent(new Event("lancelotExit"));
        }
      }
    };
    this._onKeyUp = (e: KeyboardEvent) => {
      this._keys.delete(e.key.toLowerCase());
    };
    this._onMouseDown = (e: MouseEvent) => {
      if (this._phase !== "fighting") return;
      if (document.pointerLockElement !== this._canvas) {
        this._canvas.requestPointerLock();
        return;
      }
      if (e.button === 0) {
        this._mouseDown.left = true;
        this._holdingLMB = true;
        this._holdTimer = 0;
      }
      if (e.button === 2) this._mouseDown.right = true;
    };
    this._onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        this._mouseDown.left = false;
        this._holdingLMB = false;
      }
      if (e.button === 2) this._mouseDown.right = false;
    };
    this._onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== this._canvas) return;
      this._cameraAngleY -= e.movementX * MOUSE_SENS;
      this._cameraAngleX = Math.max(-0.5, Math.min(0.8, this._cameraAngleX - e.movementY * MOUSE_SENS));
    };
    this._onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this._camera.aspect = w / h;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(w, h);
    };
    this._onContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("resize", this._onResize);
    window.addEventListener("contextmenu", this._onContextMenu);
  }

  // ── Main update ────────────────────────────────────────────────────────

  private _update(): void {
    // Slow-mo handling
    if (this._slowmoTimer > 0) {
      this._slowmoTimer -= this._dt;
      this._timeScale = SLOWMO_SCALE + (1 - SLOWMO_SCALE) * Math.max(0, 1 - this._slowmoTimer / SLOWMO_DURATION);
      if (this._slowmoTimer <= 0) { this._timeScale = 1; this._slowmoTimer = 0; }
    }
    const dt = this._dt * this._timeScale;

    if (this._phase === "paused") return;

    // Title/shop/end: slow orbit camera around arena
    if (this._phase === "title" || this._phase === "shop" || this._phase === "tournament_end") {
      const orbitSpeed = 0.15;
      const angle = this._time * orbitSpeed;
      this._camera.position.set(Math.sin(angle) * 18, 6, Math.cos(angle) * 18);
      this._camera.lookAt(0, 2, 0);
    }

    // Torch + flame mesh animation
    for (let i = 0; i < this._torches.length; i++) {
      this._torchFlicker[i] += dt * (3 + Math.random() * 2);
      this._torches[i].intensity = 2.5 + Math.sin(this._torchFlicker[i]) * 0.5 + Math.random() * 0.3;
    }
    // Flame mesh scale/height flickering
    for (let i = 0; i < this._flameMeshes.length; i++) {
      const fm = this._flameMeshes[i];
      const flick = Math.sin(this._time * 8 + i * 2.3) * 0.3 + Math.random() * 0.15;
      fm.scale.set(1 + flick * 0.4, 1 + flick, 1 + flick * 0.4);
      fm.position.y += Math.sin(this._time * 12 + i * 1.7) * 0.001;
    }

    // Contact shadows follow fighters
    if (this._playerShadow && this._player) {
      this._playerShadow.position.set(this._player.pos.x, 0.015, this._player.pos.z);
      (this._playerShadow.material as THREE.MeshBasicMaterial).opacity = this._player.action === "dodge" ? 0.1 : 0.35;
    }
    if (this._enemyShadow && this._enemy) {
      this._enemyShadow.position.set(this._enemy.pos.x, 0.015, this._enemy.pos.z);
      const eAlive = this._enemy.action !== "dead";
      (this._enemyShadow.material as THREE.MeshBasicMaterial).opacity = eAlive ? 0.35 : 0.15;
    }
    for (const banner of this._banners) {
      const geo = banner.geometry as THREE.PlaneGeometry;
      const posAttr = geo.attributes.position;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < posAttr.count; i++) {
        const origX = (i % 5) / 4 - 0.5;
        arr[i * 3] = origX * 0.8 + Math.sin(this._time * 2 + i * 0.5) * 0.06 * (i % 5) / 4;
      }
      posAttr.needsUpdate = true;
    }

    // Dust drift
    if (this._dustParticles) {
      const posArr = this._dustParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < posArr.length; i += 3) {
        posArr[i] += Math.sin(posArr[i + 1] * 2 + this._torchFlicker[0]) * dt * 0.3;
        posArr[i + 1] += dt * 0.15;
        if (posArr[i + 1] > WALL_HEIGHT) posArr[i + 1] = 0;
      }
      this._dustParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Ember rise animation
    if (this._emberParticles) {
      const eArr = this._emberParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < eArr.length; i += 3) {
        eArr[i] += Math.sin(this._time * 2 + i) * dt * 0.15;
        eArr[i + 1] += dt * (0.8 + Math.sin(i) * 0.3);
        eArr[i + 2] += Math.cos(this._time * 1.5 + i) * dt * 0.15;
        if (eArr[i + 1] > 6) {
          eArr[i + 1] = 1;
          const bAngle = ((Math.floor(i / 3) % 4) / 4) * Math.PI * 2 + Math.PI / 4;
          eArr[i] = Math.cos(bAngle) * (ARENA_RADIUS - 3) + (Math.random() - 0.5);
          eArr[i + 2] = Math.sin(bAngle) * (ARENA_RADIUS - 3) + (Math.random() - 0.5);
        }
      }
      this._emberParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Camera shake decay
    this._shakeIntensity = Math.max(0, this._shakeIntensity - this._shakeDecay * dt);

    // Crowd excitement decay
    this._crowdExcitement = Math.max(0, this._crowdExcitement - dt * 0.5);

    // Update lock-on ring
    if (this._lockOnRing && this._enemy && this._phase !== "title" && this._phase !== "shop" && this._phase !== "tournament_end") {
      this._lockOnRing.visible = true;
      this._lockOnRing.position.set(this._enemy.pos.x, 0.05, this._enemy.pos.z);
      this._lockOnRing.rotation.z = this._time * 1.5;
      const mat = this._lockOnRing.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + Math.sin(this._time * 3) * 0.15;
    } else if (this._lockOnRing) {
      this._lockOnRing.visible = false;
    }

    // Ability glow pulse
    if (this._enemy?.abilityGlow) {
      this._enemy.abilityGlow.intensity = 1.2 + Math.sin(this._time * 3) * 0.5;
    }

    // Afterimage decay
    for (let i = this._afterimages.length - 1; i >= 0; i--) {
      const ai = this._afterimages[i];
      ai.timer -= this._dt; // use real dt for afterimage decay
      if (ai.timer <= 0) {
        this._scene.remove(ai.mesh);
        ai.mesh.traverse(obj => {
          if (obj instanceof THREE.Mesh) { obj.geometry?.dispose(); if (obj.material instanceof THREE.Material) obj.material.dispose(); }
        });
        this._afterimages.splice(i, 1);
      } else {
        ai.mesh.traverse(obj => {
          if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
            obj.material.opacity = ai.timer / 0.3;
          }
        });
      }
    }

    // Cape physics
    this._updateCape(dt);

    // Crowd animation
    this._updateCrowdAnimation(dt);

    if (this._phase === "intro") {
      this._introTimer -= this._dt; // real dt for intro timer
      this._updateFighterMesh(this._player);
      this._updateFighterMesh(this._enemy);
      // Cinematic orbit camera during intro
      this._updateIntroCamera(dt);
      if (this._introTimer <= 0) {
        this._phase = "fighting";
        this._buildFightHUD();
      }
      return;
    }

    if (this._phase === "fighting") {
      if (this._holdingLMB) this._holdTimer += dt;

      this._updatePlayer(dt);
      this._updateEnemy(dt);
      this._checkCombat();
      this._updatePoison(dt);
      this._updateBleed(dt);
      this._updateSunReset(dt);
      this._updateFighterMesh(this._player);
      this._updateFighterMesh(this._enemy);
      this._updateSwordTrail();
      this._updateEnemyTelegraph();
      this._updateCamera(dt);
      this._updateHUD();

      if (this._enemy.hp <= 0 && this._enemy.action !== "dead") {
        this._enemy.action = "dead";
        this._enemy.actionTimer = 0;
        this._resultTimer = 2.5;
        this._phase = "victory";
        this._gold += Math.round((40 + this._currentEnemyIdx * 15) * this._diffMult.goldMult);
        this._playerHp = this._player.hp;
        this._slowmoTimer = SLOWMO_DURATION;
        this._timeScale = SLOWMO_SCALE;
        this._crowdExcitement = 1;
        this._spawnConfetti();
        this._sfxVictory();
      }
      if (this._player.hp <= 0 && this._player.action !== "dead") {
        this._player.action = "dead";
        this._player.actionTimer = 0;
        this._resultTimer = 2.5;
        this._phase = "defeat";
        this._slowmoTimer = SLOWMO_DURATION * 0.6;
        this._timeScale = SLOWMO_SCALE;
        this._sfxDeath();
      }
      return;
    }

    if (this._phase === "victory") {
      this._resultTimer -= this._dt;
      this._victoryPoseTimer += this._dt;
      this._updateVictoryPose();
      this._updateFighterMesh(this._player);
      this._updateFighterMesh(this._enemy);
      this._updateCamera(dt);
      if (this._resultTimer <= 0) {
        this._resultTimer = -999; // prevent re-trigger
        this._fadeOut(0.6, () => {
          if (this._currentEnemyIdx + 1 >= ENEMIES.length) {
            this._showTournamentEnd();
          } else {
            this._showShop();
          }
        });
      }
      return;
    }

    if (this._phase === "defeat") {
      this._resultTimer -= this._dt;
      this._updateFighterMesh(this._player);
      this._updateFighterMesh(this._enemy);
      this._updateCamera(dt);
      if (this._resultTimer <= 0) { this._resultTimer = -999; this._fadeOut(0.8, () => this._showDefeatScreen()); }
      return;
    }
  }

  // ── Poison DOT ─────────────────────────────────────────────────────────

  private _updatePoison(dt: number): void {
    if (this._poisonTimer <= 0) return;
    this._poisonTimer -= dt;
    this._player.hp -= this._poisonDps * dt;
    if (this._poisonTimer <= 0) {
      this._poisonTimer = 0;
      this._poisonDps = 0;
    }
  }

  // ── Player update ─────────────────────────────────────────────────────

  private _updatePlayer(dt: number): void {
    const p = this._player;

    // Stamina regen
    p.staminaRegenDelay = Math.max(0, p.staminaRegenDelay - dt);
    if (p.staminaRegenDelay <= 0 && p.action !== "dodge") {
      p.stamina = Math.min(this._playerMaxStamina, p.stamina + STAMINA_REGEN * dt);
    }

    // Combo timer
    p.comboTimer -= dt;
    if (p.comboTimer <= 0) p.comboCount = 0;

    // Riposte timer
    if (p.riposteReady) {
      p.riposteTimer -= dt;
      if (p.riposteTimer <= 0) {
        p.riposteReady = false;
      }
    }

    // Action timer + input buffer consumption
    if (p.action === "attack" || p.action === "heavy" || p.action === "parry" || p.action === "dodge" || p.action === "stagger" || p.action === "riposte" || p.action === "kick") {
      p.actionTimer -= dt;

      // Buffer inputs during recovery frames
      if (p.actionTimer < ATTACK_RECOVERY && p.actionTimer > 0) {
        if (this._mouseDown.left || this._holdTimer > 0) {
          this._inputBuffer = { action: this._holdTimer >= 0.3 ? "heavy" : "attack", time: this._inputBufferWindow };
        } else if (this._mouseDown.right) {
          this._inputBuffer = { action: "parry", time: this._inputBufferWindow };
        }
      }

      if (p.actionTimer <= 0) {
        p.action = "idle";
        p.invincible = false;
        p.hitThisSwing = false;

        // Execute buffered input
        if (this._inputBuffer && this._inputBuffer.time > 0) {
          const buf = this._inputBuffer;
          this._inputBuffer = null;
          if (buf.action === "attack" && p.stamina >= ATTACK_COST) {
            p.stamina -= ATTACK_COST;
            p.staminaRegenDelay = STAMINA_REGEN_DELAY;
            p.action = p.riposteReady ? "riposte" : "attack";
            p.actionTimer = p.action === "riposte" ? ATTACK_WINDUP * 0.5 + ATTACK_ACTIVE + ATTACK_RECOVERY : ATTACK_WINDUP + ATTACK_ACTIVE + ATTACK_RECOVERY;
            if (p.action === "riposte") p.riposteReady = false;
            else { p.comboCount = Math.min(p.comboCount + 1, 3); p.comboTimer = COMBO_WINDOW + ATTACK_WINDUP + ATTACK_ACTIVE + ATTACK_RECOVERY; }
            p.attackDir = this._getAttackDir();
            p.hitThisSwing = false;
            const toE = new THREE.Vector3().subVectors(this._enemy.pos, p.pos);
            p.rot = Math.atan2(-toE.x, -toE.z);
          } else if (buf.action === "heavy" && p.stamina >= HEAVY_ATTACK_COST) {
            p.stamina -= HEAVY_ATTACK_COST;
            p.staminaRegenDelay = STAMINA_REGEN_DELAY;
            p.action = "heavy";
            p.actionTimer = HEAVY_WINDUP + HEAVY_ACTIVE + HEAVY_RECOVERY;
            p.attackDir = this._getAttackDir();
            p.hitThisSwing = false;
            const toE = new THREE.Vector3().subVectors(this._enemy.pos, p.pos);
            p.rot = Math.atan2(-toE.x, -toE.z);
          } else if (buf.action === "parry" && p.stamina >= PARRY_COST) {
            p.stamina -= PARRY_COST;
            p.staminaRegenDelay = STAMINA_REGEN_DELAY;
            p.action = "parry";
            p.actionTimer = PARRY_WINDOW + 0.3;
            const toE = new THREE.Vector3().subVectors(this._enemy.pos, p.pos);
            p.rot = Math.atan2(-toE.x, -toE.z);
          }
          this._holdTimer = 0;
          this._mouseDown.left = false;
          this._mouseDown.right = false;
        }
      }
    }
    // Decay input buffer
    if (this._inputBuffer) {
      this._inputBuffer.time -= dt;
      if (this._inputBuffer.time <= 0) this._inputBuffer = null;
    }

    // Movement
    if (p.action === "idle" || p.action === "walk" || p.action === "sprint") {
      const forward = new THREE.Vector3(-Math.sin(this._cameraAngleY), 0, -Math.cos(this._cameraAngleY));
      const right = new THREE.Vector3(-forward.z, 0, forward.x);
      const dir = new THREE.Vector3();
      if (this._keys.has("w")) dir.add(forward);
      if (this._keys.has("s")) dir.sub(forward);
      if (this._keys.has("a")) dir.sub(right);
      if (this._keys.has("d")) dir.add(right);

      if (dir.lengthSq() > 0) {
        dir.normalize();
        const sprinting = this._keys.has("shift") && p.stamina > 5;
        const speed = sprinting ? SPRINT_SPEED : MOVE_SPEED;
        p.pos.addScaledVector(dir, speed * dt);
        p.action = sprinting ? "sprint" : "walk";
        // Lock-on: face enemy while strafing (unless sprinting away)
        if (!sprinting) {
          this._applyLockOnStrafe(p, dir);
        } else {
          p.rot = Math.atan2(-dir.x, -dir.z);
        }
        if (sprinting) {
          p.stamina = Math.max(0, p.stamina - 15 * dt);
          p.staminaRegenDelay = STAMINA_REGEN_DELAY;
          // Sprint dust puffs
          this._sprintDustTimer -= dt;
          if (this._sprintDustTimer <= 0) {
            this._sprintDustTimer = 0.15;
            this._spawnSmallDust(p.pos);
            this._sfxStep();
          }
        }
      } else {
        p.action = "idle";
      }

      // Face enemy when idle
      if (p.action === "idle") {
        const toEnemy = new THREE.Vector3().subVectors(this._enemy.pos, p.pos);
        p.rot = Math.atan2(-toEnemy.x, -toEnemy.z);
      }

      // Dodge (space)
      if (this._keys.has(" ") && p.stamina >= DODGE_COST) {
        p.stamina -= DODGE_COST;
        p.staminaRegenDelay = STAMINA_REGEN_DELAY;
        p.action = "dodge";
        p.actionTimer = DODGE_DURATION;
        p.invincible = true;
        p.dodgeDir.copy(dir.lengthSq() > 0 ? dir : new THREE.Vector3(-Math.sin(p.rot), 0, -Math.cos(p.rot)).negate());
        this._sfxDodge();
        this._keys.delete(" ");
      }

      // Attack: LMB release → heavy if held 0.3s+, else normal (or riposte)
      if (this._mouseDown.left && !this._holdingLMB) {
        // Already consumed
      }
      if (!this._mouseDown.left && this._holdTimer > 0) {
        const isHeavy = this._holdTimer >= 0.3;
        this._holdTimer = 0;
        const cost = isHeavy ? HEAVY_ATTACK_COST : ATTACK_COST;

        if (p.stamina >= cost) {
          p.stamina -= cost;
          p.staminaRegenDelay = STAMINA_REGEN_DELAY;

          // Riposte check
          if (p.riposteReady && !isHeavy) {
            p.action = "riposte";
            p.actionTimer = ATTACK_WINDUP * 0.5 + ATTACK_ACTIVE + ATTACK_RECOVERY;
            p.riposteReady = false;
          } else if (isHeavy) {
            p.action = "heavy";
            p.actionTimer = HEAVY_WINDUP + HEAVY_ACTIVE + HEAVY_RECOVERY;
          } else {
            p.action = "attack";
            p.actionTimer = ATTACK_WINDUP + ATTACK_ACTIVE + ATTACK_RECOVERY;
            p.comboCount = Math.min(p.comboCount + 1, 3);
            p.comboTimer = COMBO_WINDOW + ATTACK_WINDUP + ATTACK_ACTIVE + ATTACK_RECOVERY;
          }
          p.attackDir = this._getAttackDir();
          p.hitThisSwing = false;
          const toEnemy = new THREE.Vector3().subVectors(this._enemy.pos, p.pos);
          p.rot = Math.atan2(-toEnemy.x, -toEnemy.z);
        }
      }
      if (!this._holdingLMB) this._holdTimer = 0;

      // Parry (RMB)
      if (this._mouseDown.right && p.stamina >= PARRY_COST) {
        p.stamina -= PARRY_COST;
        p.staminaRegenDelay = STAMINA_REGEN_DELAY;
        p.action = "parry";
        p.actionTimer = PARRY_WINDOW + 0.3;
        this._mouseDown.right = false;
        const toEnemy = new THREE.Vector3().subVectors(this._enemy.pos, p.pos);
        p.rot = Math.atan2(-toEnemy.x, -toEnemy.z);
      }
    }

    // Dodge movement + afterimage
    if (p.action === "dodge") {
      p.pos.addScaledVector(p.dodgeDir, DODGE_SPEED * dt);
      if (p.actionTimer < DODGE_DURATION - DODGE_IFRAME) p.invincible = false;
      // Spawn afterimage at dodge start
      if (p.actionTimer > DODGE_DURATION - 0.05) {
        this._spawnAfterimage(p);
      }
    }

    // Arena bounds + edge sparks
    const dist = Math.sqrt(p.pos.x * p.pos.x + p.pos.z * p.pos.z);
    if (dist > ARENA_RADIUS - 1) {
      this._spawnEdgeSparks(p.pos);
      p.pos.multiplyScalar((ARENA_RADIUS - 1) / dist);
    }
  }

  private _getAttackDir(): AttackDir {
    const dirs: AttackDir[] = ["left", "right", "overhead", "thrust"];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // ── Enemy AI ──────────────────────────────────────────────────────────

  private _updateEnemy(dt: number): void {
    const e = this._enemy;
    const def = ENEMIES[this._currentEnemyIdx];
    if (e.action === "dead") return;

    // Stamina regen
    e.staminaRegenDelay = Math.max(0, e.staminaRegenDelay - dt);
    if (e.staminaRegenDelay <= 0) {
      e.stamina = Math.min(STAMINA_MAX, e.stamina + STAMINA_REGEN * 0.8 * dt);
    }

    // Rage ability — speed/aggression boost at low HP
    let speedMult = def.speed;
    let aggroMult = def.aggression;
    if (def.ability === "rage" && e.hp < e.maxHp * 0.5) {
      speedMult *= 1.4;
      aggroMult = Math.min(1, aggroMult * 1.5);
    }

    // Action timer
    const prevAction = e.action;
    if (e.action === "attack" || e.action === "heavy" || e.action === "parry" || e.action === "dodge" || e.action === "stagger" || e.action === "riposte" || e.action === "kick" || e.action === "unblockable") {
      e.actionTimer -= dt;
      if (e.actionTimer <= 0) {
        e.action = "idle";
        e.invincible = false;
        e.hitThisSwing = false;

        // Shadow step: teleport behind player only after DODGE ends
        if (def.ability === "shadowStep" && prevAction === "dodge" && Math.random() < 0.5) {
          const behind = new THREE.Vector3(
            Math.sin(this._player.rot),
            0,
            Math.cos(this._player.rot),
          ).multiplyScalar(2);
          const teleportPos = this._player.pos.clone().add(behind);
          const distFromCenter = teleportPos.length();
          if (distFromCenter < ARENA_RADIUS - 2) {
            e.pos.copy(teleportPos);
            this._spawnShadowPuff(e.pos);
            // Immediate counter-attack after teleport
            e.action = "attack";
            e.actionTimer = ATTACK_WINDUP * 0.6 + ATTACK_ACTIVE + ATTACK_RECOVERY;
            e.hitThisSwing = false;
          }
        }

        // Enemy combo chain: if more attacks queued, launch next immediately
        if (this._enemyComboLeft > 0 && prevAction === "attack") {
          this._enemyComboLeft--;
          e.action = "attack";
          e.actionTimer = ATTACK_WINDUP * 0.7 + ATTACK_ACTIVE + ATTACK_RECOVERY;
          e.attackDir = (["left", "right", "overhead", "thrust"] as AttackDir[])[Math.floor(Math.random() * 4)];
          e.hitThisSwing = false;
          e.stamina -= ATTACK_COST * 0.5;
          e.staminaRegenDelay = STAMINA_REGEN_DELAY;
        }
      }
      if (e.action === "dodge") {
        e.pos.addScaledVector(e.dodgeDir, DODGE_SPEED * 0.8 * dt);
      }
      const edist = Math.sqrt(e.pos.x * e.pos.x + e.pos.z * e.pos.z);
      if (edist > ARENA_RADIUS - 1) e.pos.multiplyScalar((ARENA_RADIUS - 1) / edist);
      return;
    }

    const toPlayer = new THREE.Vector3().subVectors(this._player.pos, e.pos);
    const distToPlayer = toPlayer.length();
    e.rot = Math.atan2(-toPlayer.x, -toPlayer.z);

    const attackRange = 2.5;
    const preferredDist = 2.0;

    // Retreat after taking damage
    if (e.retreatTimer > 0) {
      e.retreatTimer -= dt;
      const away = toPlayer.clone().normalize().negate();
      e.pos.addScaledVector(away, MOVE_SPEED * speedMult * 0.6 * dt);
      e.action = "walk";
    } else if (distToPlayer > attackRange + 1) {
      const moveDir = toPlayer.clone().normalize();
      e.pos.addScaledVector(moveDir, MOVE_SPEED * speedMult * dt);
      e.action = "walk";
    } else if (distToPlayer < preferredDist - 0.5) {
      const moveDir = toPlayer.clone().normalize().negate();
      e.pos.addScaledVector(moveDir, MOVE_SPEED * speedMult * 0.5 * dt);
      e.action = "walk";
    } else {
      const roll = Math.random();

      // React to player attack (also react to heavy)
      const pAttacking = (this._player.action === "attack" && this._player.actionTimer > ATTACK_ACTIVE + ATTACK_RECOVERY)
        || (this._player.action === "heavy" && this._player.actionTimer > HEAVY_ACTIVE + HEAVY_RECOVERY);
      if (pAttacking) {
        // Exhaustion: parry/dodge fail when stamina is low
        const exhausted = e.stamina < 15;
        const effectiveParry = exhausted ? 0 : (def.ability === "tankGuard" ? 0.6 : def.parryChance);
        if (roll < effectiveParry) {
          e.action = "parry";
          e.actionTimer = PARRY_WINDOW + 0.3;
          e.stamina -= PARRY_COST;
          e.staminaRegenDelay = STAMINA_REGEN_DELAY;
          return;
        }
        if (!exhausted && roll < effectiveParry + def.blockChance * 0.5) {
          e.action = "dodge";
          e.actionTimer = DODGE_DURATION;
          e.invincible = true;
          e.stamina -= DODGE_COST;
          e.staminaRegenDelay = STAMINA_REGEN_DELAY;
          // Variable dodge: 60% sideways, 20% backward, 20% diagonal
          const dodgeRoll = Math.random();
          if (dodgeRoll < 0.6) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const rDir = new THREE.Vector3(toPlayer.z, 0, -toPlayer.x).normalize();
            e.dodgeDir.copy(rDir).multiplyScalar(side);
          } else if (dodgeRoll < 0.8) {
            e.dodgeDir.copy(toPlayer).normalize().negate();
          } else {
            const side = Math.random() > 0.5 ? 1 : -1;
            const rDir = new THREE.Vector3(toPlayer.z, 0, -toPlayer.x).normalize();
            e.dodgeDir.copy(rDir).multiplyScalar(side).add(toPlayer.clone().normalize().negate()).normalize();
          }
          return;
        }
      }

      // Attack initiative — frame-rate independent
      const attackChance = 1 - Math.pow(1 - aggroMult, dt * 4);
      if (roll < attackChance && e.stamina >= ATTACK_COST) {
        const eidx = this._currentEnemyIdx;
        // Unblockable attack (rare, enemies 5+, must dodge)
        if (eidx >= 5 && Math.random() < 0.1 && e.stamina >= 30) {
          e.action = "unblockable";
          e.actionTimer = 0.8 + ATTACK_ACTIVE + ATTACK_RECOVERY; // long windup telegraph
          e.stamina -= 30;
          e.staminaRegenDelay = STAMINA_REGEN_DELAY;
          e.hitThisSwing = false;
          this._spawnLabel(e.pos, "UNBLOCKABLE!", "#ff2222");
          this._sfxUnblockable();
        } else if (eidx >= 6 && Math.random() < 0.25 && e.stamina >= HEAVY_ATTACK_COST) {
          // Late enemies use heavy attacks
          e.action = "heavy";
          e.actionTimer = HEAVY_WINDUP + HEAVY_ACTIVE + HEAVY_RECOVERY;
          e.stamina -= HEAVY_ATTACK_COST;
        } else {
          e.action = "attack";
          // Varied windup speed per enemy: later = faster
          const windupMod = Math.max(0.6, 1 - eidx * 0.04);
          e.actionTimer = ATTACK_WINDUP * windupMod + ATTACK_ACTIVE + ATTACK_RECOVERY;
          e.stamina -= ATTACK_COST;
        }
        // Attack direction: later enemies prefer overhead/thrust (harder to read)
        if (eidx >= 4 && Math.random() < 0.5) {
          e.attackDir = Math.random() < 0.5 ? "overhead" : "thrust";
        } else {
          e.attackDir = (["left", "right", "overhead", "thrust"] as AttackDir[])[Math.floor(Math.random() * 4)];
        }
        e.staminaRegenDelay = STAMINA_REGEN_DELAY;
        e.hitThisSwing = false;
        const maxCombo = eidx >= 5 ? 2 : eidx >= 3 ? 1 : 0;
        this._enemyComboLeft = maxCombo > 0 && Math.random() < 0.4 ? Math.ceil(Math.random() * maxCombo) : 0;
      } else {
        // Less predictable strafe — direction changes randomly, not on fixed sin wave
        const rDir = new THREE.Vector3(toPlayer.z, 0, -toPlayer.x).normalize();
        const strafeDir = Math.sin(this._time * 1.3 + this._currentEnemyIdx * 2.7 + e.pos.x * 0.3) > 0 ? 1 : -1;
        e.pos.addScaledVector(rDir, MOVE_SPEED * speedMult * 0.4 * strafeDir * dt);
        e.action = "walk";
      }
    }

    const edist = Math.sqrt(e.pos.x * e.pos.x + e.pos.z * e.pos.z);
    if (edist > ARENA_RADIUS - 1) e.pos.multiplyScalar((ARENA_RADIUS - 1) / edist);
  }

  // ── Combat resolution ─────────────────────────────────────────────────

  private _checkCombat(): void {
    const p = this._player;
    const e = this._enemy;
    const def = ENEMIES[this._currentEnemyIdx];
    const dist = p.pos.distanceTo(e.pos);
    const hitRange = 2.8;

    // --- Kick hits enemy ---
    if (p.action === "kick" && !p.hitThisSwing) {
      const kickElapsed = KICK_DURATION - p.actionTimer;
      if (kickElapsed >= 0.15 && kickElapsed < 0.3 && dist < KICK_RANGE && !e.invincible) {
        p.hitThisSwing = true;
        e.hp -= KICK_DAMAGE;
        e.action = "stagger";
        e.actionTimer = STAGGER_DURATION * 0.8;
        this._shakeCamera(0.15);
        this._spawnGroundDust(e.pos);
        this._crowdExcitement = Math.min(1, this._crowdExcitement + 0.3);
        // Kick breaks any parry stance
        this._spawnDamageNumber(e.pos, KICK_DAMAGE, false);
      }
    }

    // --- Player attacks enemy ---
    const pIsAttacking = p.action === "attack" || p.action === "heavy" || p.action === "riposte";
    if (pIsAttacking && !p.hitThisSwing) {
      const windup = p.action === "heavy" ? HEAVY_WINDUP : p.action === "riposte" ? ATTACK_WINDUP * 0.5 : ATTACK_WINDUP;
      const active = p.action === "heavy" ? HEAVY_ACTIVE : ATTACK_ACTIVE;
      const recovery = p.action === "heavy" ? HEAVY_RECOVERY : ATTACK_RECOVERY;
      const totalDur = windup + active + recovery;
      const elapsed = totalDur - p.actionTimer;
      const inActive = elapsed >= windup && elapsed < windup + active;

      if (inActive && dist < hitRange && !e.invincible) {
        p.hitThisSwing = true;

        // Check enemy parry
        if (e.action === "parry" && e.actionTimer > 0.3) {
          p.action = "stagger";
          p.actionTimer = STAGGER_DURATION;
          this._spawnSparks(p.pos, e.pos);
          this._shakeCamera(0.15);
          // mirrorParry: enemy counter-attacks instantly
          if (def.ability === "mirrorParry") {
            e.action = "attack";
            e.actionTimer = ATTACK_WINDUP * 0.3 + ATTACK_ACTIVE + ATTACK_RECOVERY;
            e.hitThisSwing = false;
          }
        } else {
          // Damage calculation
          let dmg = this._playerDamage;
          const isRiposte = p.action === "riposte";
          if (isRiposte) {
            dmg = Math.round(dmg * (p.perfectParry ? PERFECT_RIPOSTE_MULT : RIPOSTE_DAMAGE_MULT));
          } else if (p.action === "heavy") {
            dmg = Math.round(dmg * HEAVY_DAMAGE_MULT);
          } else if (p.comboCount >= 1) {
            dmg = Math.round(dmg * COMBO_DAMAGE_MULT[Math.min(p.comboCount - 1, 2)]);
          }

          // Backstab bonus: if hitting enemy from behind
          const toEnemy = new THREE.Vector3().subVectors(e.pos, p.pos).normalize();
          const enemyFacing = new THREE.Vector3(-Math.sin(e.rot), 0, -Math.cos(e.rot));
          if (toEnemy.dot(enemyFacing) > 0.5) {
            dmg = Math.round(dmg * BACKSTAB_MULT);
          }

          // ironSkin reduces damage
          if (def.ability === "ironSkin") dmg = Math.round(dmg * 0.7);

          e.hp -= dmg;
          e.action = "stagger";
          e.actionTimer = isRiposte ? STAGGER_DURATION : STAGGER_DURATION * 0.6;
          // Enemy retreats scaled by damage
          e.retreatTimer = 0.3 + (dmg / 40) * 1.2;
          if (isRiposte || p.action === "heavy") this._sfxHeavyHit(); else this._sfxHit();
          this._spawnSparks(e.pos, p.pos);
          this._spawnDamageNumber(e.pos, dmg, isRiposte || p.perfectParry);
          this._shakeCamera(isRiposte ? 0.4 : p.action === "heavy" ? 0.35 : 0.2);
          this._spawnBloodDecal(e.pos);
          // Blood spray particles on heavy/riposte
          if (p.action === "heavy" || isRiposte) {
            this._spawnGroundDust(e.pos);
            this._spawnBloodSpray(e.pos, p.pos);
          }
          if (p.action === "heavy" && e.bleedTimer <= 0) {
            e.bleedTimer = BLEED_DURATION;
            e.bleedDps = BLEED_DPS;
          }
          this._enemySunResetTimer = 3;
          // Track stats
          this._stats.hits++;
          this._stats.dmgDealt += dmg;
          if (isRiposte) this._stats.ripostes++;
          if (p.perfectParry) this._stats.perfectParries++;
          const toE2 = new THREE.Vector3().subVectors(e.pos, p.pos).normalize();
          const eFace = new THREE.Vector3(-Math.sin(e.rot), 0, -Math.cos(e.rot));
          if (toE2.dot(eFace) > 0.5) this._stats.backstabs++;
          this._stats.maxCombo = Math.max(this._stats.maxCombo, p.comboCount);
          this._crowdExcitement = Math.min(1, this._crowdExcitement + (isRiposte ? 0.8 : p.action === "heavy" ? 0.5 : 0.2));

          // Damage labels
          if (isRiposte && p.perfectParry) this._spawnLabel(e.pos, "PERFECT!", "#ffd700");
          else if (isRiposte) this._spawnLabel(e.pos, "RIPOSTE!", "#ffaa33");
          if (toE2.dot(eFace) > 0.5) this._spawnLabel(e.pos, "BACKSTAB!", "#cc88ff");
          if (p.action === "heavy") this._spawnLabel(e.pos, "BLEED!", "#cc4444");
          // Combo finisher on 3rd hit
          if (p.comboCount >= 3) {
            this._spawnComboFinisher(e.pos);
            this._spawnLabel(e.pos, "COMBO FINISH!", "#ffcc44");
            this._shakeCamera(0.35);
          }
        }
      }
    }

    // --- Enemy unblockable attack ---
    if (e.action === "unblockable" && !e.hitThisSwing) {
      const ubDur = 0.8 + ATTACK_ACTIVE + ATTACK_RECOVERY;
      const ubElapsed = ubDur - e.actionTimer;
      if (ubElapsed >= 0.8 && ubElapsed < 0.8 + ATTACK_ACTIVE && dist < 3.2 && !p.invincible) {
        e.hitThisSwing = true;
        // Cannot be parried — only dodged
        if (p.action !== "stagger" && p.action !== "dead") {
          const ubDmg = Math.round(def.damage * 2 * this._diffMult.enemyDmg);
          p.hp -= ubDmg;
          this._stats.dmgTaken += ubDmg;
          this._sfxHeavyHit();
          const ubKnock = new THREE.Vector3().subVectors(p.pos, e.pos).normalize();
          p.pos.addScaledVector(ubKnock, 1.2);
          p.action = "stagger";
          p.actionTimer = STAGGER_DURATION * 0.8;
          this._spawnSparks(p.pos, e.pos);
          this._spawnDamageNumber(p.pos, ubDmg, false);
          this._spawnBloodSpray(p.pos, e.pos);
          this._shakeCamera(0.5);
          this._flashScreen(0xff0000, 0.3, true);
        }
      }
    }

    // --- Enemy attacks player ---
    if (e.action === "attack" && !e.hitThisSwing) {
      const totalDur = ATTACK_WINDUP + ATTACK_ACTIVE + ATTACK_RECOVERY;
      const elapsed = totalDur - e.actionTimer;
      const inActive = elapsed >= ATTACK_WINDUP && elapsed < ATTACK_WINDUP + ATTACK_ACTIVE;

      if (inActive && dist < hitRange && !p.invincible) {
        e.hitThisSwing = true;

        // Check player parry (with perfect parry detection)
        if (p.action === "parry" && p.actionTimer > 0.3) {
          const parryElapsed = (PARRY_WINDOW + 0.3) - p.actionTimer;
          const isPerfect = parryElapsed <= PERFECT_PARRY_WINDOW;
          this._stats.parries++;
          if (isPerfect) { this._stats.perfectParries++; this._sfxPerfectParry(); } else { this._sfxParry(); }
          e.action = "stagger";
          e.actionTimer = isPerfect ? STAGGER_DURATION * 1.3 : STAGGER_DURATION;
          p.action = "idle";
          p.actionTimer = 0;
          p.riposteReady = true;
          p.perfectParry = isPerfect;
          p.riposteTimer = isPerfect ? RIPOSTE_WINDOW * 1.5 : RIPOSTE_WINDOW;
          this._spawnSparks(p.pos, e.pos);
          this._shakeCamera(isPerfect ? 0.35 : 0.2);
          if (isPerfect) {
            this._flashScreen(0xffd700, 0.15, true);
            this._crowdExcitement = Math.min(1, this._crowdExcitement + 0.6);
            this._spawnPerfectParryRing(p.pos);
          }
        } else if (p.action !== "stagger" && p.action !== "dead") {
          let dmg = Math.round(def.damage * this._diffMult.enemyDmg);
          // Sun strength: first hit is boosted
          if (def.ability === "sunStrength" && !this._enemySunUsed) {
            dmg = Math.round(dmg * 2);
            this._enemySunUsed = true;
          }
          // Death mark: extra damage when player is low
          if (def.ability === "deathMark" && p.hp < p.maxHp * 0.4) {
            dmg = Math.round(dmg * 1.5);
          }
          // Rage: bonus damage at low HP
          if (def.ability === "rage" && e.hp < e.maxHp * 0.5) {
            dmg = Math.round(dmg * 1.3);
          }

          p.hp -= dmg;
          this._stats.dmgTaken += dmg;
          this._sfxHit();
          p.action = "stagger";
          p.actionTimer = STAGGER_DURATION * 0.5;
          // Knockback
          const knockDir = new THREE.Vector3().subVectors(p.pos, e.pos).normalize();
          p.pos.addScaledVector(knockDir, 0.5 + dmg * 0.02);
          this._spawnSparks(p.pos, e.pos);
          this._spawnDamageNumber(p.pos, dmg, false);
          this._shakeCamera(0.3);
          this._flashScreen(0xcc0000, 0.2, dmg >= 20);

          // Poison blade: apply DOT (don't stack, just refresh duration)
          if (def.ability === "poisonBlade" && this._poisonTimer <= 0) {
            this._poisonTimer = 4;
            this._poisonDps = 3;
          }
        }
      }
    }
  }

  // ── VFX ────────────────────────────────────────────────────────────────

  private _shakeCamera(intensity: number): void {
    this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
  }

  private _flashScreen(color: number, opacity: number, chromatic = false): void {
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    const flash = document.createElement("div");
    flash.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:12;pointer-events:none;background:rgba(${r},${g},${b},${opacity});transition:opacity 0.4s;`;
    document.getElementById("pixi-container")!.appendChild(flash);
    requestAnimationFrame(() => { flash.style.opacity = "0"; });
    setTimeout(() => flash.parentNode?.removeChild(flash), 400);

    // Chromatic aberration effect for big hits
    if (chromatic) {
      const ca = document.createElement("div");
      ca.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:12;pointer-events:none;
        box-shadow:inset 3px 0 12px rgba(255,0,0,0.3), inset -3px 0 12px rgba(0,0,255,0.3);
        transition:opacity 0.3s;`;
      document.getElementById("pixi-container")!.appendChild(ca);
      requestAnimationFrame(() => { ca.style.opacity = "0"; });
      setTimeout(() => ca.parentNode?.removeChild(ca), 300);
    }
  }

  private _spawnSparks(at: THREE.Vector3, from: THREE.Vector3): void {
    const dir = new THREE.Vector3().subVectors(at, from).normalize();
    const mid = at.clone().add(from).multiplyScalar(0.5);
    mid.y = 1.5;

    // Larger sparks, more of them, varying colors
    for (let i = 0; i < 15; i++) {
      const size = 0.04 + Math.random() * 0.04;
      const sparkColors = [0xffcc44, 0xffaa33, 0xff8822, 0xffdd66];
      const sparkGeo = new THREE.SphereGeometry(size, 20, 16);
      const sparkMat = new THREE.MeshBasicMaterial({ color: sparkColors[i % sparkColors.length], transparent: true });
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      spark.position.copy(mid);
      this._scene.add(spark);

      const speed = 1.5 + Math.random() * 2;
      const vel = new THREE.Vector3(
        dir.x * speed + (Math.random() - 0.5) * 3,
        Math.random() * 3 + 1.5,
        dir.z * speed + (Math.random() - 0.5) * 3,
      );
      const startTime = performance.now();
      const scene = this._scene; const gameRef = this;
      const dur = 0.5 + Math.random() * 0.3;

      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > dur || gameRef._destroyed) {
          scene.remove(spark);
          spark.geometry.dispose();
          (spark.material as THREE.Material).dispose();
          return;
        }
        spark.position.addScaledVector(vel, 0.016);
        vel.y -= 9.8 * 0.016;
        sparkMat.opacity = 1 - elapsed / dur;
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }

    // Flash defender body white on impact
    const defenderMesh = (at === this._enemy?.pos) ? this._enemy?.bodyMesh : this._player?.bodyMesh;
    if (defenderMesh && defenderMesh.material instanceof THREE.MeshStandardMaterial) {
      const origEmissive = defenderMesh.material.emissive.getHex();
      defenderMesh.material.emissive.setHex(0xffffff);
      defenderMesh.material.emissiveIntensity = 1.5;
      setTimeout(() => {
        if (defenderMesh.material instanceof THREE.MeshStandardMaterial) {
          defenderMesh.material.emissive.setHex(origEmissive);
          defenderMesh.material.emissiveIntensity = 0;
        }
      }, 80);
    }
  }

  private _spawnShadowPuff(pos: THREE.Vector3): void {
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.SphereGeometry(0.15, 20, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0x222244, transparent: true, opacity: 0.7 });
      const puff = new THREE.Mesh(geo, mat);
      puff.position.copy(pos);
      puff.position.y = 1 + Math.random();
      this._scene.add(puff);

      const vel = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2);
      const startTime = performance.now();
      const scene = this._scene; const gameRef = this;

      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > 0.6 || gameRef._destroyed) {
          scene.remove(puff);
          geo.dispose();
          mat.dispose();
          return;
        }
        puff.position.addScaledVector(vel, 0.016);
        puff.scale.setScalar(1 + elapsed * 2);
        mat.opacity = 0.7 * (1 - elapsed / 0.6);
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }

  private _spawnDamageNumber(pos: THREE.Vector3, dmg: number, crit: boolean): void {
    const el = document.createElement("div");
    el.style.cssText = `
      position:absolute;z-index:12;pointer-events:none;font-family:serif;font-weight:bold;
      font-size:${crit ? 30 : 22}px;
      color:${crit ? "#ffd700" : "#ff4444"};
      text-shadow:0 0 10px ${crit ? "rgba(255,215,0,0.7)" : "rgba(255,0,0,0.5)"};
      transition:all 0.8s ease-out;
    `;
    el.textContent = crit ? `${dmg}!` : `${dmg}`;

    const screenPos = pos.clone();
    screenPos.y = 2.5;
    screenPos.project(this._camera);
    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth + (Math.random() - 0.5) * 30;
    const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    document.getElementById("pixi-container")!.appendChild(el);
    requestAnimationFrame(() => {
      el.style.top = `${y - 70}px`;
      el.style.opacity = "0";
    });
    setTimeout(() => el.parentNode?.removeChild(el), 800);
  }

  // ── Sword trail ────────────────────────────────────────────────────────

  private _updateSwordTrail(): void {
    // Remove old trail
    if (this._trailMesh) {
      this._scene.remove(this._trailMesh);
      this._trailMesh.geometry.dispose();
      (this._trailMesh.material as THREE.Material).dispose();
      this._trailMesh = null;
    }

    const p = this._player;
    if (p.action !== "attack" && p.action !== "heavy" && p.action !== "riposte") {
      p.trailPoints = [];
      return;
    }

    // Get sword tip world position
    const tipLocal = new THREE.Vector3(0, -1.5, 0);
    const tipWorld = tipLocal.clone();
    p.swordGroup.localToWorld(tipWorld);
    p.mesh.localToWorld(tipWorld.sub(p.mesh.position).add(p.pos));

    p.trailPoints.push(tipWorld.clone());
    if (p.trailPoints.length > 12) p.trailPoints.shift();
    if (p.trailPoints.length < 2) return;

    const pts = p.trailPoints;
    const positions: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const up = 0.3;
      positions.push(a.x, a.y, a.z, a.x, a.y + up, a.z, b.x, b.y, b.z);
      positions.push(b.x, b.y, b.z, a.x, a.y + up, a.z, b.x, b.y + up, b.z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

    const trailColor = p.action === "riposte" ? 0xffd700 : 0xaabbcc;
    const isRiposteTrail = p.action === "riposte";
    const mat = new THREE.MeshBasicMaterial({
      color: trailColor,
      transparent: true,
      opacity: isRiposteTrail ? 0.6 : 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._trailMesh = new THREE.Mesh(geo, mat);
    this._scene.add(this._trailMesh);
  }

  // ── Fighter mesh update (animation) ───────────────────────────────────

  private _updateFighterMesh(f: Fighter): void {
    f.mesh.position.copy(f.pos);
    f.mesh.rotation.y = f.rot;
    f.mesh.rotation.z = 0;
    f.mesh.position.y = 0;

    const sg = f.swordGroup;
    const shg = f.shieldGroup;

    // Reset
    sg.rotation.set(0, 0, 0);
    sg.position.set(0.5, 1.5, 0);
    shg.rotation.set(0, 0, 0);
    shg.position.set(-0.5, 1.3, 0.15);
    f.leftLeg.rotation.set(0, 0, 0);
    f.rightLeg.rotation.set(0, 0, 0);

    const t = this._time;

    switch (f.action) {
      case "idle": {
        const exhausted = f.stamina < 20;
        sg.rotation.z = Math.sin(t * 1.5) * 0.05;
        sg.rotation.x = exhausted ? -0.5 : -0.3; // sword droops when tired
        shg.rotation.x = exhausted ? -0.15 : 0;
        // Heavier breathing bob when exhausted
        f.mesh.position.y = Math.sin(t * (exhausted ? 4 : 2)) * (exhausted ? 0.03 : 0.01);
        // Hunched posture
        if (exhausted) f.mesh.rotation.x = -0.06;
        f.leftLeg.rotation.x = 0.05;
        f.rightLeg.rotation.x = -0.05;
        break;
      }
      case "walk": {
        const walkExhausted = f.stamina < 20;
        const walkSpeed = walkExhausted ? 4 : 6;
        const walkAmp = walkExhausted ? 0.1 : 0.15;
        sg.rotation.x = -0.3 + Math.sin(t * walkSpeed) * walkAmp;
        shg.rotation.x = Math.sin(t * walkSpeed + Math.PI) * 0.1;
        f.mesh.position.y = Math.abs(Math.sin(t * walkSpeed)) * 0.04;
        if (walkExhausted) f.mesh.rotation.x = -0.04;
        f.leftLeg.rotation.x = Math.sin(t * walkSpeed) * (walkExhausted ? 0.25 : 0.4);
        f.rightLeg.rotation.x = Math.sin(t * walkSpeed + Math.PI) * (walkExhausted ? 0.25 : 0.4);
        break;
      }
      case "sprint": {
        sg.rotation.x = -0.5 + Math.sin(t * 10) * 0.2;
        shg.rotation.x = Math.sin(t * 10 + Math.PI) * 0.15;
        f.mesh.position.y = Math.abs(Math.sin(t * 10)) * 0.06;
        // Leg sprint cycle — faster, wider swing
        f.leftLeg.rotation.x = Math.sin(t * 10) * 0.6;
        f.rightLeg.rotation.x = Math.sin(t * 10 + Math.PI) * 0.6;
        break;
      }
      case "attack": {
        const totalDur = ATTACK_WINDUP + ATTACK_ACTIVE + ATTACK_RECOVERY;
        const elapsed = totalDur - f.actionTimer;
        const progress = elapsed / totalDur;
        this._animateAttackDir(sg, shg, f.attackDir, progress, ATTACK_WINDUP / totalDur, (ATTACK_WINDUP + ATTACK_ACTIVE) / totalDur);
        break;
      }
      case "heavy": {
        const totalDur = HEAVY_WINDUP + HEAVY_ACTIVE + HEAVY_RECOVERY;
        const elapsed = totalDur - f.actionTimer;
        const progress = elapsed / totalDur;
        const windupEnd = HEAVY_WINDUP / totalDur;
        const activeEnd = (HEAVY_WINDUP + HEAVY_ACTIVE) / totalDur;

        if (progress < windupEnd) {
          const wp = progress / windupEnd;
          sg.rotation.x = -0.3 - wp * 2.0;
          sg.rotation.z = wp * 0.4;
          // Glow buildup
          if (f.swordMesh.material instanceof THREE.MeshStandardMaterial) {
            f.swordMesh.material.emissive.setHex(0xff6600);
            f.swordMesh.material.emissiveIntensity = wp * 1.5;
          }
        } else if (progress < activeEnd) {
          const ap = (progress - windupEnd) / (activeEnd - windupEnd);
          sg.rotation.x = -2.3 + ap * 3.5;
          sg.rotation.z = 0.4 - ap * 0.8;
        } else {
          const rp = (progress - activeEnd) / (1 - activeEnd);
          sg.rotation.x = 1.2 - rp * 1.5;
          if (f.swordMesh.material instanceof THREE.MeshStandardMaterial) {
            f.swordMesh.material.emissiveIntensity = (1 - rp) * 1.5;
          }
        }
        break;
      }
      case "riposte": {
        const dur = ATTACK_WINDUP * 0.5 + ATTACK_ACTIVE + ATTACK_RECOVERY;
        const elapsed = dur - f.actionTimer;
        const progress = elapsed / dur;
        sg.rotation.x = -2.0 + progress * 3.2;
        sg.rotation.z = Math.sin(progress * Math.PI) * 0.5;
        if (f.swordMesh.material instanceof THREE.MeshStandardMaterial) {
          f.swordMesh.material.emissive.setHex(0xffdd00);
          f.swordMesh.material.emissiveIntensity = (1 - progress) * 2.5;
        }
        break;
      }
      case "unblockable": {
        // Slow overhead raise with red glow, then slam down
        const ubDur = 0.8 + ATTACK_ACTIVE + ATTACK_RECOVERY;
        const ubElapsed = ubDur - f.actionTimer;
        if (ubElapsed < 0.8) {
          // Windup: raise sword high overhead slowly
          const wp = ubElapsed / 0.8;
          sg.rotation.x = -0.3 - wp * 2.5;
          sg.rotation.z = Math.sin(wp * 4) * 0.1; // slight tremor
          if (f.swordMesh.material instanceof THREE.MeshStandardMaterial) {
            f.swordMesh.material.emissive.setHex(0xff2200);
            f.swordMesh.material.emissiveIntensity = wp * 2;
          }
          if (f.bodyMesh.material instanceof THREE.MeshStandardMaterial) {
            f.bodyMesh.material.emissive.setHex(0xff0000);
            f.bodyMesh.material.emissiveIntensity = wp * 0.4;
          }
        } else if (ubElapsed < 0.8 + ATTACK_ACTIVE) {
          // Slam down
          const ap = (ubElapsed - 0.8) / ATTACK_ACTIVE;
          sg.rotation.x = -2.8 + ap * 4.0;
        } else {
          const rp = (ubElapsed - 0.8 - ATTACK_ACTIVE) / ATTACK_RECOVERY;
          sg.rotation.x = 1.2 - rp * 1.5;
          if (f.swordMesh.material instanceof THREE.MeshStandardMaterial) {
            f.swordMesh.material.emissiveIntensity = (1 - rp) * 2;
          }
        }
        break;
      }
      case "kick": {
        // Shield bash forward
        const kickProg = (KICK_DURATION - f.actionTimer) / KICK_DURATION;
        if (kickProg < 0.4) {
          // Wind up
          shg.position.set(-0.3, 1.5, 0.15 - kickProg * 0.3);
        } else if (kickProg < 0.7) {
          // Thrust shield forward
          const thrust = (kickProg - 0.4) / 0.3;
          shg.position.set(-0.3, 1.5, -0.15 + thrust * 0.8);
          shg.rotation.x = -thrust * 0.4;
        } else {
          // Recover
          const rec = (kickProg - 0.7) / 0.3;
          shg.position.set(-0.3, 1.5, 0.65 - rec * 0.5);
          shg.rotation.x = -0.4 * (1 - rec);
        }
        sg.rotation.x = -0.5;
        break;
      }
      case "parry": {
        shg.position.set(-0.3, 1.6, 0.4);
        shg.rotation.x = -0.3;
        sg.rotation.x = -0.8;
        sg.rotation.z = 0.5;
        break;
      }
      case "dodge": {
        // Actual barrel roll
        const dodgeProg = 1 - f.actionTimer / DODGE_DURATION; // 0 → 1
        const rollAngle = dodgeProg * Math.PI * 2; // full 360° rotation
        f.mesh.rotation.z = Math.sin(rollAngle) * 0.8;
        f.mesh.rotation.x = Math.cos(rollAngle) * 0.3;
        // Arc up then down
        f.mesh.position.y = Math.sin(dodgeProg * Math.PI) * 0.25;
        // Tuck legs during roll peak
        f.leftLeg.rotation.x = -dodgeProg * 0.5;
        f.rightLeg.rotation.x = -dodgeProg * 0.5;
        break;
      }
      case "stagger": {
        const stProg = f.actionTimer / STAGGER_DURATION;
        f.mesh.rotation.z = Math.sin(stProg * 10) * 0.25;
        sg.rotation.x = -0.5 + Math.sin(stProg * 6) * 0.3;
        // Flash body red
        if (f.bodyMesh.material instanceof THREE.MeshStandardMaterial) {
          f.bodyMesh.material.emissive.setHex(0xff0000);
          f.bodyMesh.material.emissiveIntensity = stProg * 0.5;
        }
        break;
      }
      case "dead": {
        // Multi-stage death: stagger back → kneel → collapse
        f.actionTimer += this._dt;
        const deathT = f.actionTimer;
        if (deathT < 0.5) {
          // Stage 1: stagger backward
          f.mesh.rotation.x = -deathT * 0.4;
          f.mesh.position.y = 0;
          const backDir = new THREE.Vector3(Math.sin(f.rot), 0, Math.cos(f.rot));
          f.pos.addScaledVector(backDir, this._dt * 1.5);
        } else if (deathT < 1.2) {
          // Stage 2: drop to knees
          const kneelT = (deathT - 0.5) / 0.7;
          f.mesh.position.y = -kneelT * 0.6;
          f.mesh.rotation.x = -0.2 - kneelT * 0.15;
          sg.rotation.x = -0.5 - kneelT * 0.5; // sword drops
        } else {
          // Stage 3: collapse forward
          const collapseT = Math.min(1, (deathT - 1.2) / 0.6);
          f.mesh.rotation.z = collapseT * (Math.PI / 2);
          f.mesh.position.y = -0.6 - collapseT * 0.3;
          sg.rotation.x = -1.0;
        }
        break;
      }
    }

    // Reset emissives for non-special states
    if (f.action !== "riposte" && f.action !== "heavy") {
      if (f.swordMesh.material instanceof THREE.MeshStandardMaterial) {
        f.swordMesh.material.emissiveIntensity *= 0.9;
      }
    }
    if (f.action !== "stagger") {
      if (f.bodyMesh.material instanceof THREE.MeshStandardMaterial) {
        f.bodyMesh.material.emissiveIntensity *= 0.85;
      }
    }
  }

  private _animateAttackDir(sg: THREE.Object3D, _shg: THREE.Object3D, dir: AttackDir, progress: number, windupEnd: number, activeEnd: number): void {
    if (progress < windupEnd) {
      const wp = progress / windupEnd;
      switch (dir) {
        case "left":
          sg.rotation.z = wp * 1.2;
          sg.rotation.x = -0.3 - wp * 0.9;
          sg.position.z = -wp * 0.3;
          break;
        case "right":
          sg.rotation.z = -wp * 1.2;
          sg.rotation.x = -0.3 - wp * 0.9;
          sg.position.z = -wp * 0.3;
          break;
        case "overhead":
          sg.rotation.x = -0.3 - wp * 2.0;
          sg.rotation.z = wp * 0.2;
          sg.position.z = -wp * 0.25;
          break;
        case "thrust":
          sg.rotation.x = -0.3 - wp * 0.8;
          sg.position.z = -wp * 0.4;
          break;
      }
    } else if (progress < activeEnd) {
      const ap = (progress - windupEnd) / (activeEnd - windupEnd);
      switch (dir) {
        case "left":
          sg.rotation.z = 1.2 - ap * 2.4;
          sg.rotation.x = -1.2 + ap * 1.0;
          sg.position.z = -0.3 - ap * 0.5;
          break;
        case "right":
          sg.rotation.z = -1.2 + ap * 2.4;
          sg.rotation.x = -1.2 + ap * 1.0;
          sg.position.z = -0.3 - ap * 0.5;
          break;
        case "overhead":
          sg.rotation.x = -2.3 + ap * 3.2;
          sg.rotation.z = 0.2 - ap * 0.4;
          sg.position.z = -0.25 - ap * 0.55;
          break;
        case "thrust":
          sg.rotation.x = -1.1 + ap * 0.5;
          sg.position.z = -0.4 - ap * 0.7;
          break;
      }
    } else {
      const rp = (progress - activeEnd) / (1 - activeEnd);
      sg.rotation.x = (dir === "thrust" ? -0.6 : 0.5) * (1 - rp) + (-0.3 * rp);
      sg.rotation.z *= (1 - rp);
      sg.position.z *= (1 - rp);
    }
  }

  // ── Procedural audio (Web Audio API) ────────────────────────────────────

  private _ensureAudio(): AudioContext {
    if (!this._audioCtx) this._audioCtx = new AudioContext();
    if (this._audioCtx.state === "suspended") this._audioCtx.resume();
    return this._audioCtx;
  }

  private _playTone(freq: number, dur: number, vol: number, type: OscillatorType = "square"): void {
    try {
      const ctx = this._ensureAudio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch { /* audio context may not be available */ }
  }

  private _playNoise(dur: number, vol: number): void {
    try {
      const ctx = this._ensureAudio();
      const bufferSize = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * vol;
      // Quick fade envelope
      for (let i = 0; i < Math.min(200, bufferSize); i++) data[i] *= i / 200;
      for (let i = Math.max(0, bufferSize - 500); i < bufferSize; i++) data[i] *= (bufferSize - i) / 500;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      source.connect(gain).connect(ctx.destination);
      source.start();
    } catch { /* audio context may not be available */ }
  }

  private _sfxHit(): void {
    this._playNoise(0.08, 0.3);
    this._playTone(200 + Math.random() * 100, 0.1, 0.15, "sawtooth");
  }

  private _sfxHeavyHit(): void {
    this._playNoise(0.12, 0.4);
    this._playTone(120, 0.15, 0.2, "sawtooth");
    this._playTone(80, 0.2, 0.15, "sine");
  }

  private _sfxParry(): void {
    this._playTone(800, 0.08, 0.2, "square");
    this._playTone(1200, 0.06, 0.15, "square");
    this._playNoise(0.05, 0.2);
  }

  private _sfxPerfectParry(): void {
    this._playTone(1000, 0.1, 0.25, "sine");
    this._playTone(1500, 0.15, 0.2, "sine");
    this._playTone(2000, 0.12, 0.15, "sine");
  }

  private _sfxDodge(): void {
    this._playNoise(0.15, 0.12);
    this._playTone(300, 0.1, 0.05, "sine");
  }

  private _sfxKick(): void {
    this._playNoise(0.1, 0.25);
    this._playTone(150, 0.12, 0.15, "sawtooth");
  }

  private _sfxDeath(): void {
    this._playTone(200, 0.3, 0.2, "sawtooth");
    this._playTone(150, 0.4, 0.15, "sine");
    this._playTone(100, 0.5, 0.1, "sine");
  }

  private _sfxVictory(): void {
    this._playTone(523, 0.2, 0.15, "sine"); // C5
    setTimeout(() => this._playTone(659, 0.2, 0.15, "sine"), 150); // E5
    setTimeout(() => this._playTone(784, 0.3, 0.2, "sine"), 300); // G5
    setTimeout(() => this._playTone(1047, 0.4, 0.2, "sine"), 500); // C6
  }

  private _sfxPotion(): void {
    this._playTone(400, 0.1, 0.1, "sine");
    this._playTone(600, 0.15, 0.1, "sine");
  }

  private _sfxStep(): void {
    this._playNoise(0.04, 0.05 + Math.random() * 0.03);
  }

  private _sfxUnblockable(): void {
    this._playTone(100, 0.6, 0.2, "sawtooth");
    this._playTone(60, 0.8, 0.15, "sine");
  }

  // ── Fade transitions ──────────────────────────────────────────────────

  private _fadeOut(dur: number, cb: () => void): void {
    if (this._fadeEl) this._fadeEl.parentNode?.removeChild(this._fadeEl);
    this._fadeEl = document.createElement("div");
    this._fadeEl.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;z-index:14;pointer-events:none;background:#000;opacity:0;transition:opacity ${dur}s;`;
    document.getElementById("pixi-container")!.appendChild(this._fadeEl);
    requestAnimationFrame(() => { this._fadeEl!.style.opacity = "1"; });
    setTimeout(() => { cb(); this._fadeIn(dur * 0.7); }, dur * 1000);
  }

  private _fadeIn(dur: number): void {
    if (!this._fadeEl) return;
    this._fadeEl.style.transition = `opacity ${dur}s`;
    this._fadeEl.style.opacity = "0";
    setTimeout(() => { this._fadeEl?.parentNode?.removeChild(this._fadeEl); this._fadeEl = null; }, dur * 1000);
  }

  // ── Arena edge sparks ─────────────────────────────────────────────────

  private _spawnEdgeSparks(pos: THREE.Vector3): void {
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.SphereGeometry(0.03, 6, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true });
      const sp = new THREE.Mesh(geo, mat);
      sp.position.copy(pos);
      sp.position.y = 0.3 + Math.random() * 0.5;
      this._scene.add(sp);
      const vel = new THREE.Vector3(-pos.x, 1 + Math.random(), -pos.z).normalize().multiplyScalar(2);
      const startTime = performance.now();
      const scene = this._scene; const gameRef = this;
      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > 0.3 || gameRef._destroyed) { scene.remove(sp); geo.dispose(); mat.dispose(); return; }
        sp.position.addScaledVector(vel, 0.016);
        vel.y -= 6 * 0.016;
        mat.opacity = 1 - elapsed / 0.3;
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }

  // ── Arena atmosphere per duel ───────────────────────────────────────────

  private _setArenaAtmosphere(idx: number): void {
    // Shift scene fog color and background for each duel — gets darker and more ominous
    const fogColors = [
      0x0a0808, // warm dark
      0x0a0808, // same
      0x0a0a0e, // slightly blue
      0x0c0808, // red tint
      0x080a0c, // cool
      0x060608, // dark purple
      0x080606, // very dark warm
      0x030303, // near black for final boss
    ];
    const fogColor = fogColors[Math.min(idx, fogColors.length - 1)];
    this._scene.background = new THREE.Color(fogColor);
    (this._scene.fog as THREE.Fog).color.setHex(fogColor);
    (this._scene.fog as THREE.Fog).near = 20 - idx * 1.5; // fog closes in for later enemies
    (this._scene.fog as THREE.Fog).far = 45 - idx * 2;

    // Exposure dims slightly for later enemies
    this._renderer.toneMappingExposure = 0.6 - idx * 0.03;
  }

  // ── Lock-on strafing ──────────────────────────────────────────────────

  private _applyLockOnStrafe(p: Fighter, dir: THREE.Vector3): void {
    // When moving, always face enemy (strafe style)
    if (dir.lengthSq() > 0) {
      const toEnemy = new THREE.Vector3().subVectors(this._enemy.pos, p.pos);
      p.rot = Math.atan2(-toEnemy.x, -toEnemy.z);
    }
  }

  // ── Damage label spawner ──────────────────────────────────────────────

  private _spawnLabel(pos: THREE.Vector3, text: string, labelColor: string): void {
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;z-index:12;pointer-events:none;font-family:serif;font-weight:bold;
      font-size:14px;color:${labelColor};letter-spacing:2px;
      text-shadow:0 0 8px ${labelColor};transition:all 1s ease-out;`;
    el.textContent = text;
    const screenPos = pos.clone();
    screenPos.y = 3.0;
    screenPos.project(this._camera);
    const sx = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-screenPos.y * 0.5 + 0.5) * window.innerHeight - 20;
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;
    document.getElementById("pixi-container")!.appendChild(el);
    requestAnimationFrame(() => { el.style.top = `${sy - 50}px`; el.style.opacity = "0"; });
    setTimeout(() => el.parentNode?.removeChild(el), 1000);
  }

  // ── Combo finisher VFX ────────────────────────────────────────────────

  private _spawnComboFinisher(pos: THREE.Vector3): void {
    // Expanding shockwave ring + radial sparks
    const ringGeo = new THREE.RingGeometry(0.3, 0.5, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(pos.x, 1.2, pos.z);
    ring.rotation.x = -Math.PI / 2;
    this._scene.add(ring);
    const startTime = performance.now();
    const scene = this._scene; const gameRef = this;
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed > 0.4 || gameRef._destroyed) { scene.remove(ring); ringGeo.dispose(); ringMat.dispose(); return; }
      ring.scale.setScalar(1 + elapsed * 6);
      ringMat.opacity = 0.7 * (1 - elapsed / 0.4);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  // ── Bleed DOT (enemy) ──────────────────────────────────────────────────

  private _updateBleed(dt: number): void {
    if (!this._enemy || this._enemy.bleedTimer <= 0) return;
    this._enemy.bleedTimer -= dt;
    this._enemy.hp -= this._enemy.bleedDps * dt;
    if (this._enemy.bleedTimer <= 0) {
      this._enemy.bleedTimer = 0;
      this._enemy.bleedDps = 0;
    }
  }

  // ── Sun strength reset timer ──────────────────────────────────────────

  private _updateSunReset(dt: number): void {
    if (this._enemySunResetTimer > 0) {
      this._enemySunResetTimer -= dt;
      if (this._enemySunResetTimer <= 0) {
        this._enemySunUsed = false; // reset for next engagement
      }
    }
  }

  // ── Enemy ability VFX (glow per ability) ──────────────────────────────

  private _addAbilityGlow(fighter: Fighter, def: EnemyDef): void {
    if (def.ability === "none") return;
    const colorMap: Record<EnemyAbility, number> = {
      none: 0, ironSkin: 0x8888aa, rage: 0xff4422, poisonBlade: 0x44ff44,
      mirrorParry: 0xcc88ff, tankGuard: 0x4488ff, shadowStep: 0x4422aa,
      sunStrength: 0xffcc22, deathMark: 0xff2222,
    };
    const glowColor = colorMap[def.ability];
    // Larger, brighter glow
    const glow = new THREE.PointLight(glowColor, 1.2, 6, 2);
    glow.position.set(0, 1.5, 0);
    fighter.mesh.add(glow);
    fighter.abilityGlow = glow;

    // Body emissive tint matching ability
    if (fighter.bodyMesh.material instanceof THREE.MeshStandardMaterial) {
      fighter.bodyMesh.material.emissive.setHex(glowColor);
      fighter.bodyMesh.material.emissiveIntensity = 0.15;
    }
  }

  // ── Blood decal ───────────────────────────────────────────────────────

  private _spawnBloodDecal(pos: THREE.Vector3): void {
    const size = 0.3 + Math.random() * 0.4;
    const geo = new THREE.CircleGeometry(size, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x550000 + Math.floor(Math.random() * 0x220000),
      roughness: 1, transparent: true, opacity: 0.6,
    });
    const decal = new THREE.Mesh(geo, mat);
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(pos.x + (Math.random() - 0.5) * 0.5, 0.02, pos.z + (Math.random() - 0.5) * 0.5);
    this._scene.add(decal);
    this._bloodDecals.push(decal);
    // Max 20 decals
    if (this._bloodDecals.length > 20) {
      const old = this._bloodDecals.shift()!;
      this._scene.remove(old);
      old.geometry.dispose();
      (old.material as THREE.Material).dispose();
    }
  }

  // ── Perfect parry ring VFX ────────────────────────────────────────────

  // ── Blood spray particles ──────────────────────────────────────────────

  private _spawnBloodSpray(at: THREE.Vector3, from: THREE.Vector3): void {
    const dir = new THREE.Vector3().subVectors(at, from).normalize();
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.SphereGeometry(0.04, 20, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0xaa0000 + Math.floor(Math.random() * 0x330000), transparent: true });
      const drop = new THREE.Mesh(geo, mat);
      drop.position.set(at.x, 1.5, at.z);
      this._scene.add(drop);
      const vel = new THREE.Vector3(
        dir.x * 2 + (Math.random() - 0.5) * 3,
        Math.random() * 2 + 0.5,
        dir.z * 2 + (Math.random() - 0.5) * 3,
      );
      const startTime = performance.now();
      const scene = this._scene; const gameRef = this;
      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > 0.8 || gameRef._destroyed) { scene.remove(drop); geo.dispose(); mat.dispose(); return; }
        drop.position.addScaledVector(vel, 0.016);
        vel.y -= 9 * 0.016;
        mat.opacity = 1 - elapsed / 0.8;
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }

  // ── Victory confetti ──────────────────────────────────────────────────

  private _spawnConfetti(): void {
    for (let i = 0; i < 40; i++) {
      const geo = new THREE.PlaneGeometry(0.1, 0.15);
      const colors = [0xffd700, 0xcc2222, 0x2244aa, 0xffffff, 0x44aa44];
      const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide, transparent: true });
      const piece = new THREE.Mesh(geo, mat);
      piece.position.set(
        this._player.pos.x + (Math.random() - 0.5) * 6,
        5 + Math.random() * 3,
        this._player.pos.z + (Math.random() - 0.5) * 6,
      );
      piece.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this._scene.add(piece);
      const spinX = (Math.random() - 0.5) * 8;
      const spinY = (Math.random() - 0.5) * 8;
      const drift = (Math.random() - 0.5) * 0.5;
      const startTime = performance.now();
      const scene = this._scene; const gameRef = this;
      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > 3 || gameRef._destroyed) { scene.remove(piece); geo.dispose(); mat.dispose(); return; }
        piece.position.y -= 1.5 * 0.016;
        piece.position.x += drift * 0.016;
        piece.rotation.x += spinX * 0.016;
        piece.rotation.y += spinY * 0.016;
        mat.opacity = elapsed > 2 ? 1 - (elapsed - 2) : 1;
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }

  // ── Enemy attack telegraph (sword glints before swing) ────────────────

  private _updateEnemyTelegraph(): void {
    if (!this._enemy) return;
    const e = this._enemy;
    if (e.action !== "attack") return;
    const totalDur = ATTACK_WINDUP + ATTACK_ACTIVE + ATTACK_RECOVERY;
    const elapsed = totalDur - e.actionTimer;
    // Flash sword during windup
    if (elapsed < ATTACK_WINDUP && e.swordMesh.material instanceof THREE.MeshStandardMaterial) {
      const windupProg = elapsed / ATTACK_WINDUP;
      e.swordMesh.material.emissive.setHex(0xff4422);
      e.swordMesh.material.emissiveIntensity = windupProg * 1.5;
    } else if (e.swordMesh.material instanceof THREE.MeshStandardMaterial) {
      e.swordMesh.material.emissiveIntensity *= 0.85;
    }
  }

  private _spawnPerfectParryRing(pos: THREE.Vector3): void {
    const ringGeo = new THREE.RingGeometry(0.5, 0.6, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(pos.x, 1.5, pos.z);
    ring.rotation.x = -Math.PI / 2;
    this._scene.add(ring);

    const startTime = performance.now();
    const scene = this._scene; const gameRef = this;
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed > 0.5 || gameRef._destroyed) { scene.remove(ring); ringGeo.dispose(); ringMat.dispose(); return; }
      ring.scale.setScalar(1 + elapsed * 4);
      ringMat.opacity = 0.8 * (1 - elapsed / 0.5);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  // ── Victory pose ──────────────────────────────────────────────────────

  private _updateVictoryPose(): void {
    if (!this._player || this._player.action === "dead") return;
    const t = this._victoryPoseTimer;
    // Raise sword overhead
    const sg = this._player.swordGroup;
    sg.rotation.x = Math.min(-2.0, -0.3 - t * 3);
    sg.rotation.z = Math.sin(t * 2) * 0.1;
    // Face camera
    this._player.rot = this._cameraAngleY + Math.PI;
  }

  // ── Sprint dust ────────────────────────────────────────────────────────

  private _spawnSmallDust(pos: THREE.Vector3): void {
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.SphereGeometry(0.05, 6, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0x665544, transparent: true, opacity: 0.4 });
      const puff = new THREE.Mesh(geo, mat);
      puff.position.set(pos.x + (Math.random() - 0.5) * 0.3, 0.05, pos.z + (Math.random() - 0.5) * 0.3);
      this._scene.add(puff);
      const startTime = performance.now();
      const scene = this._scene; const gameRef = this;
      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > 0.35 || gameRef._destroyed) { scene.remove(puff); geo.dispose(); mat.dispose(); return; }
        puff.position.y += 0.008;
        puff.scale.setScalar(1 + elapsed * 2);
        mat.opacity = 0.4 * (1 - elapsed / 0.35);
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }

  // ── Kick ────────────────────────────────────────────────────────────────

  private _tryKick(): void {
    const p = this._player;
    if (p.action !== "idle" && p.action !== "walk" && p.action !== "sprint") return;
    if (p.stamina < KICK_COST) return;
    p.stamina -= KICK_COST;
    p.staminaRegenDelay = STAMINA_REGEN_DELAY;
    p.action = "kick";
    p.actionTimer = KICK_DURATION;
    p.hitThisSwing = false;
    this._sfxKick();
    const toEnemy = new THREE.Vector3().subVectors(this._enemy.pos, p.pos);
    p.rot = Math.atan2(-toEnemy.x, -toEnemy.z);
    // Small forward lunge
    p.dodgeDir.copy(toEnemy).normalize();
    p.pos.addScaledVector(p.dodgeDir, 0.5);
  }

  // ── Afterimage ─────────────────────────────────────────────────────────

  private _spawnAfterimage(f: Fighter): void {
    const ghost = new THREE.Group();
    // Clone simple body shape as translucent ghost
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.4, 1.4, 12);
    const ghostMat = new THREE.MeshStandardMaterial({ color: 0x4466aa, transparent: true, opacity: 0.4, metalness: 0.3, roughness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, ghostMat);
    body.position.y = 1.2;
    ghost.add(body);
    const headGeo = new THREE.SphereGeometry(0.2, 20, 16);
    const head = new THREE.Mesh(headGeo, ghostMat.clone());
    head.position.y = 2.0;
    (head.material as THREE.MeshStandardMaterial).opacity = 0.3;
    ghost.add(head);

    ghost.position.copy(f.pos);
    ghost.rotation.y = f.rot;
    this._scene.add(ghost);
    this._afterimages.push({ mesh: ghost, timer: 0.3 });
  }

  // ── Ground impact dust ────────────────────────────────────────────────

  private _spawnGroundDust(pos: THREE.Vector3): void {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2;
      const geo = new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 20, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0x887766, transparent: true, opacity: 0.6 });
      const dust = new THREE.Mesh(geo, mat);
      dust.position.set(pos.x, 0.1, pos.z);
      this._scene.add(dust);

      const vel = new THREE.Vector3(Math.cos(angle) * speed, 0.5 + Math.random(), Math.sin(angle) * speed);
      const startTime = performance.now();
      const scene = this._scene; const gameRef = this;

      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > 0.6 || gameRef._destroyed) { scene.remove(dust); geo.dispose(); mat.dispose(); return; }
        dust.position.addScaledVector(vel, 0.016);
        vel.y -= 4 * 0.016;
        if (dust.position.y < 0) dust.position.y = 0;
        dust.scale.setScalar(1 + elapsed * 1.5);
        mat.opacity = 0.6 * (1 - elapsed / 0.6);
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }

  // ── Cape physics ──────────────────────────────────────────────────────

  private _updateCape(_dt: number): void {
    if (this._capeSegments.length === 0 || !this._player) return;
    for (let i = 0; i < this._capeSegments.length; i++) {
      const seg = this._capeSegments[i];
      // Sway based on movement and action
      const swayAmount = this._player.action === "sprint" ? 0.3 : this._player.action === "dodge" ? 0.5 : 0.1;
      const phase = this._time * 3 + i * 0.8;
      seg.rotation.x = Math.sin(phase) * swayAmount * (i + 1) * 0.15;
      seg.rotation.z = Math.cos(phase * 0.7) * swayAmount * 0.1 * (i + 1);
      // Billow backward when sprinting
      if (this._player.action === "sprint" || this._player.action === "dodge") {
        seg.position.z = -0.3 - i * 0.05;
      } else {
        seg.position.z = -0.3;
      }
    }
  }

  // ── Crowd animation ───────────────────────────────────────────────────

  private _updateCrowdAnimation(_dt: number): void {
    if (!this._crowdDots) return;
    const dummy = new THREE.Object3D();
    const count = 300;
    for (let i = 0; i < count; i++) {
      this._crowdDots.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      // Bob up/down based on excitement
      const bobAmount = this._crowdExcitement * 0.3;
      const baseY = dummy.position.y;
      dummy.position.y = baseY + Math.sin(this._time * 6 + i * 1.7) * bobAmount;
      dummy.updateMatrix();
      this._crowdDots.setMatrixAt(i, dummy.matrix);
    }
    this._crowdDots.instanceMatrix.needsUpdate = true;
  }

  // ── Cinematic intro camera ────────────────────────────────────────────

  private _updateIntroCamera(_dt: number): void {
    if (!this._enemy) return;
    const introDuration = 2 + this._currentEnemyIdx * 0.4;
    const t = 1 - this._introTimer / introDuration; // 0→1
    const isFinalBoss = this._currentEnemyIdx >= 7;
    const orbitAngle = t * Math.PI * (isFinalBoss ? 1.2 : 0.6) + Math.PI * 0.7;
    const orbitDist = (isFinalBoss ? 4 : 5) + (1 - t) * 3;
    const camX = this._enemy.pos.x + Math.sin(orbitAngle) * orbitDist;
    const camZ = this._enemy.pos.z + Math.cos(orbitAngle) * orbitDist;
    const camY = (isFinalBoss ? 1.8 : 2.5) + (1 - t) * 2;
    this._camera.position.set(camX, camY, camZ);
    const lookAt = this._enemy.pos.clone();
    lookAt.y = 1.5;
    this._camera.lookAt(lookAt);
  }

  // ── Pause menu ────────────────────────────────────────────────────────

  private _pauseGame(): void {
    this._phaseBeforePause = this._phase;
    this._phase = "paused";
    if (document.pointerLockElement === this._canvas) document.exitPointerLock();
    this._hud.style.pointerEvents = "auto";

    this._pauseOverlay = document.createElement("div");
    this._pauseOverlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:13;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(5,3,2,0.85);font-family:monospace;";
    this._pauseOverlay.innerHTML = `
      <div style="font-size:28px;color:#daa520;letter-spacing:6px;margin-bottom:30px;font-family:serif;">PAUSED</div>
      <button id="lpause-resume" style="padding:10px 40px;font-size:14px;font-weight:bold;letter-spacing:3px;border:2px solid #daa520;border-radius:4px;background:rgba(40,30,15,0.8);color:#daa520;cursor:pointer;font-family:serif;margin-bottom:10px;">RESUME</button>
      <button id="lpause-exit" style="padding:8px 30px;font-size:12px;border:1px solid #555;border-radius:4px;background:transparent;color:#888;cursor:pointer;font-family:monospace;">EXIT TO MENU</button>
    `;
    document.getElementById("pixi-container")!.appendChild(this._pauseOverlay);
    document.getElementById("lpause-resume")!.addEventListener("click", () => this._resumeGame());
    document.getElementById("lpause-exit")!.addEventListener("click", () => {
      this._resumeGame();
      window.dispatchEvent(new Event("lancelotExit"));
    });
  }

  private _resumeGame(): void {
    this._phase = this._phaseBeforePause;
    this._hud.style.pointerEvents = "none";
    if (this._pauseOverlay) {
      this._pauseOverlay.parentNode?.removeChild(this._pauseOverlay);
      this._pauseOverlay = null;
    }
    this._canvas.requestPointerLock();
  }

  // ── Camera ─────────────────────────────────────────────────────────────

  private _updateCamera(dt: number): void {
    if (!this._player) return;

    // Dynamic zoom: parry pulls in, dodge pulls out, death zooms in close
    const p = this._player;
    if (p.action === "parry" || (p.riposteReady && p.riposteTimer > 0)) {
      this._cameraZoomTarget = CAMERA_DISTANCE * 0.7; // zoom in during parry/riposte window
      this._cameraFovTarget = 48;
    } else if (p.action === "dodge") {
      this._cameraZoomTarget = CAMERA_DISTANCE * 1.1; // pull back during dodge
      this._cameraFovTarget = 60;
    } else if (p.action === "dead" || (this._enemy && this._enemy.action === "dead")) {
      this._cameraZoomTarget = CAMERA_DISTANCE * 0.55; // close on death
      this._cameraFovTarget = 45;
    } else {
      this._cameraZoomTarget = CAMERA_DISTANCE;
      this._cameraFovTarget = 55;
    }

    // Smooth zoom and FOV
    const currentDist = this._cameraZoomTarget;
    this._camera.fov += (this._cameraFovTarget - this._camera.fov) * 4 * dt;
    this._camera.updateProjectionMatrix();

    const camOffset = new THREE.Vector3(
      Math.sin(this._cameraAngleY) * currentDist * Math.cos(this._cameraAngleX),
      CAMERA_HEIGHT + Math.sin(this._cameraAngleX) * currentDist,
      Math.cos(this._cameraAngleY) * currentDist * Math.cos(this._cameraAngleX),
    );

    // During death/victory, look between player and enemy
    let lookTarget: THREE.Vector3;
    if (this._enemy && this._enemy.action === "dead" && this._phase === "victory") {
      const mid = this._player.pos.clone().add(this._enemy.pos).multiplyScalar(0.5);
      mid.y = 1.5;
      lookTarget = mid;
    } else {
      lookTarget = this._player.pos.clone();
      lookTarget.y = 1.5;
    }

    const desiredPos = this._player.pos.clone().add(camOffset);
    this._camera.position.lerp(desiredPos, CAMERA_SMOOTHING * dt);

    // Camera shake
    if (this._shakeIntensity > 0.01) {
      this._camera.position.x += (Math.random() - 0.5) * this._shakeIntensity;
      this._camera.position.y += (Math.random() - 0.5) * this._shakeIntensity * 0.5;
      this._camera.position.z += (Math.random() - 0.5) * this._shakeIntensity;
    }

    this._camera.lookAt(lookTarget);
  }

  // ── Potion ─────────────────────────────────────────────────────────────

  private _usePotion(): void {
    if (this._potions <= 0 || this._player.hp >= this._player.maxHp) return;
    const a = this._player.action;
    if (a !== "idle" && a !== "walk" && a !== "sprint") return; // can't drink mid-action
    this._potions--;
    this._stats.potionsUsed++;
    this._sfxPotion();
    const healAmt = Math.round(this._player.maxHp * 0.3);
    this._player.hp = Math.min(this._player.maxHp, this._player.hp + healAmt);
    this._flashScreen(0x00bb44, 0.15);
  }

  // ── Shop (between duels) ──────────────────────────────────────────────

  private _showShop(): void {
    this._phase = "shop";
    this._hud.style.pointerEvents = "auto";
    this._hudBuilt = false;
    if (document.pointerLockElement === this._canvas) document.exitPointerLock();

    const def = ENEMIES[this._currentEnemyIdx];
    const nextDef = ENEMIES[this._currentEnemyIdx + 1];
    const hpPct = Math.round((this._playerHp / this._playerMaxHp) * 100);

    // Stat preview helper
    const preview = (id: string): string => {
      switch (id) {
        case "dmg_up": return `<span style="color:#44aa44;font-size:10px;margin-left:4px;">(${this._playerDamage} → ${this._playerDamage + 3})</span>`;
        case "hp_up": return `<span style="color:#44aa44;font-size:10px;margin-left:4px;">(${this._playerMaxHp} → ${this._playerMaxHp + 20})</span>`;
        case "stamina_up": return `<span style="color:#44aa44;font-size:10px;margin-left:4px;">(${this._playerMaxStamina} → ${this._playerMaxStamina + 15})</span>`;
        case "heal": return `<span style="color:#44aa44;font-size:10px;margin-left:4px;">(${Math.round(this._playerHp)} → ${Math.min(this._playerMaxHp, Math.round(this._playerHp + 50))})</span>`;
        case "full_heal": return `<span style="color:#44aa44;font-size:10px;margin-left:4px;">(${Math.round(this._playerHp)} → ${this._playerMaxHp})</span>`;
        case "potion": return `<span style="color:#44aa44;font-size:10px;margin-left:4px;">(${this._potions} → ${Math.min(this._potions + 1, this._maxPotions)})</span>`;
        default: return "";
      }
    };

    const shopItemsHtml = SHOP_ITEMS
      .filter(item => !item.oneTime || !this._purchasedOneTime.has(item.id))
      .map(item => {
        const canAfford = this._gold >= item.cost;
        const maxedPotion = item.id === "potion" && this._potions >= this._maxPotions;
        const maxedHp = (item.id === "heal" || item.id === "full_heal") && this._playerHp >= this._playerMaxHp;
        const disabled = !canAfford || maxedPotion || maxedHp;
        return `
        <button class="lshop-btn" data-id="${item.id}" style="
          display:flex;justify-content:space-between;align-items:center;
          width:100%;padding:10px 14px;margin-bottom:6px;
          border:1px solid ${disabled ? "#332211" : "#554422"};border-radius:4px;
          background:rgba(30,22,12,${disabled ? "0.5" : "0.9"});color:${disabled ? "#665544" : "#ccbb99"};cursor:${disabled ? "not-allowed" : "pointer"};
          font-family:monospace;font-size:12px;text-align:left;transition:border-color 0.2s,background 0.2s;
        " ${disabled ? "" : `onmouseover="this.style.borderColor='#daa520'" onmouseout="this.style.borderColor='#554422'"`}>
          <div>
            <span style="color:${disabled ? "#776644" : "#daa520"};font-weight:bold;">${item.name}</span>
            ${preview(item.id)}
            <span style="color:#776644;margin-left:8px;font-size:11px;">${item.desc}</span>
          </div>
          <span style="color:${canAfford && !maxedPotion && !maxedHp ? "#ffcc44" : "#663333"};font-weight:bold;white-space:nowrap;margin-left:12px;">${maxedPotion || maxedHp ? "MAX" : item.cost + "g"}</span>
        </button>
      `}).join("");

    this._hud.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(5,3,2,0.85);">
        <div style="font-size:11px;letter-spacing:6px;color:#daa520;margin-bottom:6px;">VICTORY</div>
        <h2 style="font-size:24px;color:#daa520;margin:0 0 4px;letter-spacing:3px;font-family:serif;">
          ${def.name} has fallen
        </h2>
        <p style="color:#887766;font-style:italic;margin-bottom:10px;font-size:13px;">"${def.defeated}"</p>

        <div style="display:flex;gap:12px;margin-bottom:8px;font-size:10px;color:#776655;flex-wrap:wrap;justify-content:center;max-width:450px;">
          <span>Hits: ${this._stats.hits}</span>
          <span>Damage: ${this._stats.dmgDealt}</span>
          <span>Taken: ${this._stats.dmgTaken}</span>
          <span>Parries: ${this._stats.parries}</span>
          <span style="color:#ffd700;">Perfect: ${this._stats.perfectParries}</span>
          <span style="color:#daa520;">Ripostes: ${this._stats.ripostes}</span>
          <span>Max Combo: ${this._stats.maxCombo}</span>
          <span>Backstabs: ${this._stats.backstabs}</span>
          <span>Potions: ${this._stats.potionsUsed}</span>
        </div>

        <div style="display:flex;gap:30px;margin-bottom:12px;font-size:12px;">
          <span style="color:#cc8888;">HP: ${Math.round(this._playerHp)} / ${this._playerMaxHp} (${hpPct}%)</span>
          <span style="color:#ccaa44;">GOLD: ${this._gold}</span>
          <span style="color:#aabb88;">POTIONS: ${this._potions} / ${this._maxPotions}</span>
          <span style="color:#bbaa88;">DMG: ${this._playerDamage}</span>
        </div>

        <div style="font-size:11px;color:#665544;letter-spacing:2px;margin-bottom:12px;">
          NEXT: <span style="color:#${nextDef.color.toString(16).padStart(6, "0")};">${nextDef.name} — ${nextDef.title}</span>
          ${nextDef.abilityDesc ? `<span style="color:#887744;margin-left:8px;font-size:10px;">(${nextDef.abilityDesc})</span>` : ""}
        </div>

        <div style="width:380px;max-height:280px;overflow-y:auto;margin-bottom:16px;">
          ${shopItemsHtml}
        </div>

        <button id="lancelot-next-duel" style="
          padding:12px 40px;font-size:14px;font-weight:bold;letter-spacing:3px;
          border:2px solid #daa520;border-radius:4px;background:rgba(40,30,15,0.8);
          color:#daa520;cursor:pointer;font-family:serif;
        ">NEXT DUEL</button>
        <button id="lancelot-exit-shop" style="
          margin-top:8px;padding:6px 20px;font-size:11px;
          border:1px solid #555;border-radius:4px;background:transparent;
          color:#666;cursor:pointer;font-family:monospace;
        ">EXIT</button>
      </div>
    `;

    // Shop button handlers
    this._hud.querySelectorAll(".lshop-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).dataset.id!;
        const item = SHOP_ITEMS.find(i => i.id === id)!;
        if (this._gold < item.cost) return;
        this._gold -= item.cost;

        switch (id) {
          case "potion":
            this._potions = Math.min(this._potions + 1, this._maxPotions);
            break;
          case "heal":
            this._playerHp = Math.min(this._playerMaxHp, this._playerHp + 50);
            break;
          case "full_heal":
            this._playerHp = this._playerMaxHp;
            break;
          case "dmg_up":
            this._playerDamage += 3;
            break;
          case "hp_up":
            this._playerMaxHp += 20;
            this._playerHp += 20;
            break;
          case "stamina_up":
            this._playerMaxStamina += 15;
            break;
          case "extra_potion":
            this._maxPotions += 1;
            this._potions += 1;
            this._purchasedOneTime.add(id);
            break;
        }
        // Re-render shop
        this._showShop();
      });
    });

    document.getElementById("lancelot-next-duel")!.addEventListener("click", () => {
      this._hud.style.pointerEvents = "none";
      this._canvas.requestPointerLock();
      this._startDuel(this._currentEnemyIdx + 1);
    });
    document.getElementById("lancelot-exit-shop")!.addEventListener("click", () => {
      window.dispatchEvent(new Event("lancelotExit"));
    });
  }

  // ── Defeat screen ─────────────────────────────────────────────────────

  private _showDefeatScreen(): void {
    this._hud.style.pointerEvents = "auto";
    this._hudBuilt = false;
    if (document.pointerLockElement === this._canvas) document.exitPointerLock();
    const def = ENEMIES[this._currentEnemyIdx];

    this._hud.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(5,3,2,0.8);">
        <div style="font-size:11px;letter-spacing:6px;color:#cc2222;margin-bottom:8px;">DEFEATED</div>
        <h2 style="font-size:28px;color:#cc4444;margin:0 0 8px;letter-spacing:3px;font-family:serif;">
          ${def.name} prevails
        </h2>
        <p style="color:#665544;margin-bottom:10px;font-size:13px;">Even the Knight of the Lake may fall. Rise again.</p>
        <div style="display:flex;gap:12px;margin-bottom:20px;font-size:10px;color:#554433;">
          <span>Hits: ${this._stats.hits}</span>
          <span>Damage: ${this._stats.dmgDealt}</span>
          <span>Taken: ${this._stats.dmgTaken}</span>
          <span>Parries: ${this._stats.parries}</span>
        </div>
        <button id="lancelot-retry" style="
          padding:12px 40px;font-size:14px;font-weight:bold;letter-spacing:3px;
          border:2px solid #cc4444;border-radius:4px;background:rgba(40,15,15,0.8);
          color:#cc4444;cursor:pointer;font-family:serif;
        ">RETRY THIS DUEL</button>
        <button id="lancelot-restart" style="
          margin-top:8px;padding:8px 30px;font-size:12px;
          border:1px solid #885533;border-radius:4px;background:rgba(30,20,10,0.8);
          color:#aa7744;cursor:pointer;font-family:monospace;
        ">RESTART TOURNAMENT</button>
        <button id="lancelot-exit-d" style="
          margin-top:8px;padding:6px 20px;font-size:11px;
          border:1px solid #555;border-radius:4px;background:transparent;
          color:#666;cursor:pointer;font-family:monospace;
        ">EXIT</button>
      </div>
    `;

    document.getElementById("lancelot-retry")!.addEventListener("click", () => {
      this._hud.style.pointerEvents = "none";
      this._playerHp = this._playerMaxHp;
      this._potions = this._maxPotions;
      this._canvas.requestPointerLock();
      this._startDuel(this._currentEnemyIdx);
    });
    document.getElementById("lancelot-restart")!.addEventListener("click", () => {
      this._hud.style.pointerEvents = "none";
      this._playerHp = PLAYER_MAX_HP;
      this._playerMaxHp = PLAYER_MAX_HP;
      this._playerDamage = PLAYER_DAMAGE_BASE;
      this._playerMaxStamina = STAMINA_MAX;
      this._potions = 3;
      this._maxPotions = 3;
      this._gold = 0;
      this._purchasedOneTime.clear();
      this._canvas.requestPointerLock();
      this._startDuel(0);
    });
    document.getElementById("lancelot-exit-d")!.addEventListener("click", () => {
      window.dispatchEvent(new Event("lancelotExit"));
    });
  }

  // ── Tournament end ────────────────────────────────────────────────────

  private _showTournamentEnd(): void {
    this._phase = "tournament_end";
    this._hud.style.pointerEvents = "auto";
    this._hudBuilt = false;
    if (document.pointerLockElement === this._canvas) document.exitPointerLock();

    // Save high score
    const prevBest = parseInt(localStorage.getItem("lancelot_best") || "0", 10);
    const totalWins = 8 + this._ngPlus * 8;
    if (totalWins > prevBest) localStorage.setItem("lancelot_best", String(totalWins));

    const diffLabel = this._difficulty.toUpperCase();
    const ngLabel = this._ngPlus > 0 ? ` (NG+${this._ngPlus})` : "";

    this._hud.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(5,3,2,0.7);">
        <div style="font-size:11px;letter-spacing:8px;color:#daa520;margin-bottom:12px;">THE TRIALS ARE OVER</div>
        <h1 style="font-size:44px;color:#ffd700;text-shadow:0 0 40px rgba(255,215,0,0.5);margin:0 0 8px;letter-spacing:4px;font-family:serif;">
          CHAMPION
        </h1>
        <div style="width:200px;height:2px;background:linear-gradient(90deg,transparent,#ffd700,transparent);margin-bottom:12px;"></div>
        <p style="color:#aa9966;text-align:center;max-width:500px;line-height:1.7;font-size:14px;margin-bottom:20px;">
          All eight challengers have fallen before your blade. Sir Lancelot du Lac
          stands undefeated — the greatest knight the realm has ever known.
          The crowd roars. The torches blaze. Your legend is etched in stone.
        </p>
        <div style="font-size:12px;color:#887766;margin-bottom:8px;">
          ${diffLabel}${ngLabel} · HP: ${Math.round(this._playerHp)} / ${this._playerMaxHp} · Gold: ${this._gold} · Damage: ${this._playerDamage}
        </div>
        <div style="font-size:10px;color:#665544;margin-bottom:20px;">
          Best: ${Math.max(totalWins, prevBest)} duels won
        </div>
        <button id="lancelot-ngplus" style="
          padding:12px 40px;font-size:14px;font-weight:bold;letter-spacing:3px;
          border:2px solid #ff8833;border-radius:4px;background:rgba(60,30,10,0.8);
          color:#ff8833;cursor:pointer;font-family:serif;margin-bottom:8px;
        ">NEW GAME+ (enemies +25%)</button>
        <button id="lancelot-again" style="
          padding:10px 30px;font-size:12px;letter-spacing:2px;
          border:1px solid #daa520;border-radius:4px;background:rgba(40,30,15,0.8);
          color:#daa520;cursor:pointer;font-family:serif;
        ">RESTART</button>
        <button id="lancelot-exit-w" style="
          margin-top:10px;padding:8px 24px;font-size:12px;
          border:1px solid #555;border-radius:4px;background:transparent;
          color:#666;cursor:pointer;font-family:monospace;
        ">EXIT</button>
      </div>
    `;

    document.getElementById("lancelot-ngplus")!.addEventListener("click", () => {
      this._hud.style.pointerEvents = "none";
      this._ngPlus++;
      this._applyDifficulty();
      // Keep current stats but reset gold and potions
      this._potions = this._maxPotions;
      this._gold = 0;
      this._purchasedOneTime.clear();
      this._canvas.requestPointerLock();
      this._startDuel(0);
    });
    document.getElementById("lancelot-again")!.addEventListener("click", () => {
      this._hud.style.pointerEvents = "none";
      this._ngPlus = 0;
      this._applyDifficulty();
      this._playerHp = PLAYER_MAX_HP;
      this._playerMaxHp = PLAYER_MAX_HP;
      this._playerDamage = PLAYER_DAMAGE_BASE;
      this._playerMaxStamina = STAMINA_MAX;
      this._potions = 3;
      this._maxPotions = 3;
      this._gold = 0;
      this._purchasedOneTime.clear();
      this._canvas.requestPointerLock();
      this._startDuel(0);
    });
    document.getElementById("lancelot-exit-w")!.addEventListener("click", () => {
      window.dispatchEvent(new Event("lancelotExit"));
    });
  }
}
