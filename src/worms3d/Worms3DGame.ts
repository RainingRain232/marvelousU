/**
 * WORMS 3D — Camelot Edition
 *
 * A full Worms 3D–style turn-based artillery game with Arthurian characters,
 * destructible terrain, dozens of weapons, wind, water, physics, and
 * visually impressive medieval environments.
 */

import * as THREE from "three";

/* ───────────────────────── constants ───────────────────────── */

const TERRAIN_SIZE = 120;
const TERRAIN_RES = 192;
const TERRAIN_HEIGHT = 18;
const WATER_LEVEL = -2;
const GRAVITY = -28;
const WORM_RADIUS = 0.55;
const WORM_HEIGHT = 1.4;
const WORM_HP = 100;
const TURN_TIME = 45;
const RETREAT_TIME = 5;
const TEAM_COLORS = [0x3366ff, 0xcc2222, 0x22bb44, 0xffaa00];
const TEAM_NAMES = [
  ["Arthur", "Lancelot", "Gawain", "Percival"],
  ["Mordred", "Agravaine", "Morgause", "Gareth"],
  ["Merlin", "Nimue", "Viviane", "Taliesin"],
  ["Galahad", "Bors", "Tristan", "Kay"],
];

const EXPLOSION_TERRAIN_RADIUS = 3.5;

/* ───────────────────── weapon definitions ──────────────────── */

interface WeaponDef {
  name: string;
  icon: string;
  ammo: number; // -1 = infinite
  damage: number;
  radius: number;
  type: "projectile" | "grenade" | "hitscan" | "melee" | "airstrike" | "placed" | "teleport" | "rope" | "strike";
  fuseTime?: number;
  clusterCount?: number;
  knockback: number;
  description: string;
}

const WEAPONS: WeaponDef[] = [
  { name: "Bazooka", icon: "🚀", ammo: -1, damage: 45, radius: 3.5, type: "projectile", knockback: 12, description: "Classic rocket launcher" },
  { name: "Grenade", icon: "💣", ammo: -1, damage: 45, radius: 3.5, type: "grenade", fuseTime: 3, knockback: 12, description: "Bouncing timed explosive" },
  { name: "Shotgun", icon: "🔫", ammo: -1, damage: 25, radius: 1.5, type: "hitscan", knockback: 8, description: "Two shots, close range" },
  { name: "Fire Punch", icon: "🔥", ammo: -1, damage: 30, radius: 1.2, type: "melee", knockback: 20, description: "Fiery uppercut" },
  { name: "Baseball Bat", icon: "🏏", ammo: -1, damage: 15, radius: 1.5, type: "melee", knockback: 30, description: "Knock 'em flying" },
  { name: "Dynamite", icon: "🧨", ammo: 2, damage: 75, radius: 5, type: "placed", fuseTime: 4, knockback: 20, description: "Massive placed explosive" },
  { name: "Mine", icon: "💥", ammo: 3, damage: 50, radius: 3.5, type: "placed", knockback: 15, description: "Proximity mine" },
  { name: "Air Strike", icon: "✈️", ammo: 1, damage: 30, radius: 3, type: "airstrike", knockback: 10, description: "Five missiles from the sky" },
  { name: "Holy Hand Grenade", icon: "✝️", ammo: 1, damage: 100, radius: 7, type: "grenade", fuseTime: 3, knockback: 35, description: "One… two… FIVE!" },
  { name: "Banana Bomb", icon: "🍌", ammo: 1, damage: 35, radius: 3, type: "grenade", fuseTime: 3, clusterCount: 5, knockback: 12, description: "Splits into cluster bombs" },
  { name: "Dragon Punch", icon: "🐉", ammo: 2, damage: 35, radius: 1.5, type: "melee", knockback: 25, description: "Rising dragon strike" },
  { name: "Prod", icon: "👉", ammo: -1, damage: 1, radius: 0.8, type: "melee", knockback: 5, description: "A little push…" },
  { name: "Teleport", icon: "🌀", ammo: 2, damage: 0, radius: 0, type: "teleport", knockback: 0, description: "Teleport anywhere" },
  { name: "Ninja Rope", icon: "🪢", ammo: 3, damage: 0, radius: 0, type: "rope", knockback: 0, description: "Swing to new positions" },
  { name: "Catapult", icon: "⚔️", ammo: 2, damage: 55, radius: 4, type: "projectile", knockback: 18, description: "Medieval siege projectile" },
  { name: "Holy Water", icon: "💧", ammo: 2, damage: 20, radius: 4, type: "grenade", fuseTime: 2, knockback: 5, description: "Burns unholy ground" },
  { name: "Excalibur Strike", icon: "⚡", ammo: 1, damage: 80, radius: 6, type: "strike", knockback: 25, description: "Legendary blade from the heavens" },
  { name: "Concrete Donkey", icon: "🫏", ammo: 1, damage: 60, radius: 4, type: "strike", knockback: 30, description: "Unstoppable descending beast" },
  { name: "Cluster Bomb", icon: "🎆", ammo: 2, damage: 25, radius: 2.5, type: "grenade", fuseTime: 3, clusterCount: 4, knockback: 10, description: "Scatters bomblets" },
  { name: "Mortar", icon: "🏰", ammo: 2, damage: 35, radius: 3, type: "projectile", knockback: 14, description: "High-arcing siege mortar" },
  { name: "Flaming Arrow", icon: "🏹", ammo: 3, damage: 20, radius: 2, type: "projectile", knockback: 6, description: "Fiery ranged attack" },
  { name: "Meteor", icon: "☄️", ammo: 1, damage: 90, radius: 8, type: "strike", knockback: 30, description: "Merlin's cosmic fury" },
  { name: "Girder", icon: "🪵", ammo: 3, damage: 0, radius: 0, type: "placed", knockback: 0, description: "Place a steel bridge/shield" },
  { name: "Earthquake", icon: "🌋", ammo: 1, damage: 15, radius: 50, type: "strike", knockback: 8, description: "Shakes all worms loose" },
  { name: "Sheep", icon: "🐑", ammo: 2, damage: 75, radius: 5, type: "projectile", knockback: 22, description: "Walking explosive sheep" },
  { name: "Carpet Bomb", icon: "💣", ammo: 1, damage: 25, radius: 2.5, type: "airstrike", knockback: 8, description: "Twelve bombs in a line" },
  { name: "Mole Bomb", icon: "🐛", ammo: 2, damage: 30, radius: 3, type: "projectile", knockback: 10, description: "Burrows through terrain" },
  { name: "Poison Strike", icon: "☠️", ammo: 2, damage: 10, radius: 3, type: "grenade", fuseTime: 2, knockback: 3, description: "Poisons hit worms for 5 turns" },
  { name: "Freeze Blast", icon: "❄️", ammo: 1, damage: 5, radius: 4, type: "grenade", fuseTime: 2, knockback: 1, description: "Freezes worms for 1 turn" },
];

/* ────────────────────── type interfaces ────────────────────── */

interface Worm {
  name: string;
  teamIndex: number;
  hp: number;
  maxHp: number;
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  onGround: boolean;
  alive: boolean;
  facing: number; // radians Y
  aimAngle: number; // radians up/down
  grounded: boolean;
  fallDamageVel: number;
  poisoned: number; // turns remaining
  frozen: number; // turns remaining
  doubleDamageNext: boolean;
}

interface Projectile {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  weapon: WeaponDef;
  fuseTimer: number;
  bounces: number;
  owner: Worm;
  trail: THREE.Points | null;
  trailPositions: number[];
  age: number;
}

interface Explosion {
  pos: THREE.Vector3;
  radius: number;
  timer: number;
  maxTimer: number;
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  ring: THREE.Mesh;
}

interface AirStrikeTarget {
  x: number;
  z: number;
  missiles: { pos: THREE.Vector3; vel: THREE.Vector3; mesh: THREE.Mesh; landed: boolean }[];
  weapon: WeaponDef;
}

interface StrikeEffect {
  pos: THREE.Vector3;
  weapon: WeaponDef;
  timer: number;
  mesh: THREE.Mesh | null;
  phase: "descend" | "impact";
  owner: Worm;
}

interface FloatingText {
  el: HTMLDivElement;
  timer: number;
  worldPos: THREE.Vector3;
}

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
}

interface Gravestone {
  mesh: THREE.Group;
  pos: THREE.Vector3;
}

interface SupplyCrate {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  landed: boolean;
  type: "weapon" | "health" | "utility";
  parachute: THREE.Mesh;
}

interface OilBarrel {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  hp: number;
  alive: boolean;
}

interface TorchPillar {
  mesh: THREE.Group;
  light: THREE.PointLight;
  pos: THREE.Vector3;
}

type Phase = "title" | "playing" | "aiming" | "firing" | "resolving" | "retreat" | "camera_pan" | "victory" | "weapon_select";

/* ═══════════════════════════════════════════════════════════════
   Worms3DGame
   ═══════════════════════════════════════════════════════════════ */

export class Worms3DGame {
  /* ── three.js core ── */
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _animFrame = 0;
  private _destroyed = false;
  private _dt = 0;
  private _time = 0;

  /* ── terrain ── */
  private _terrainMesh!: THREE.Mesh;
  private _terrainGeo!: THREE.BufferGeometry;
  private _heightData: Float32Array = new Float32Array(0);
  private _terrainNeedsUpdate = false;

  /* ── water ── */
  private _waterMesh!: THREE.Mesh;

  /* ── game state ── */
  private _phase: Phase = "title";
  private _worms: Worm[] = [];
  private _teamCount = 2;
  private _wormsPerTeam = 4;
  private _currentTeam = 0;
  private _currentWormIndices: number[] = [];
  private _turnTimer = TURN_TIME;
  private _retreatTimer = 0;
  private _wind = 0; // -1 to 1
  private _selectedWeaponIndex = 0;
  private _aimPower = 0.6;
  private _projectiles: Projectile[] = [];
  private _explosions: Explosion[] = [];
  private _airStrikes: AirStrikeTarget[] = [];
  private _strikes: StrikeEffect[] = [];
  private _particles: Particle[] = [];
  private _particleSystem!: THREE.Points;
  private _particleGeo!: THREE.BufferGeometry;
  private _floatingTexts: FloatingText[] = [];
  private _roundNumber = 0;
  private _turnActive = false;
  private _hasFired = false;
  private _weaponAmmo: number[] = [];
  private _suddenDeath = false;
  private _suddenDeathTimer = 300; // 5 minutes until sudden death

  /* ── camera control ── */
  private _camTheta = 0;
  private _camPhi = 0.6;
  private _camDist = 15;
  private _camTarget = new THREE.Vector3(0, 5, 0);
  private _camSmooth = new THREE.Vector3(0, 5, 0);
  private _isDragging = false;
  private _lastMouse = { x: 0, y: 0 };

  /* ── input ── */
  private _keys: Set<string> = new Set();
  private _onKeyDown!: (e: KeyboardEvent) => void;
  private _onKeyUp!: (e: KeyboardEvent) => void;
  private _onMouseDown!: (e: MouseEvent) => void;
  private _onMouseUp!: (e: MouseEvent) => void;
  private _onMouseMove!: (e: MouseEvent) => void;
  private _onWheel!: (e: WheelEvent) => void;
  private _onClick!: (e: MouseEvent) => void;
  private _onResize!: () => void;
  private _onContextMenu!: (e: Event) => void;

  /* ── HUD ── */
  private _hudContainer!: HTMLDivElement;
  private _weaponPanel!: HTMLDivElement;
  private _weaponPanelVisible = false;
  private _crosshair!: HTMLDivElement;
  private _titleOverlay!: HTMLDivElement;

  /* ── environment ── */
  private _sunLight!: THREE.DirectionalLight;
  private _ambientLight!: THREE.AmbientLight;
  private _castles: THREE.Group[] = [];
  private _clouds: THREE.Mesh[] = [];
  private _trees: THREE.Group[] = [];
  private _banners: THREE.Mesh[] = [];
  private _skyDome!: THREE.Mesh;

  /* ── audio ── */
  private _audioCtx: AudioContext | null = null;

  /* ── teleport mode ── */
  private _teleportMode = false;
  private _teleportMarker!: THREE.Mesh;
  private _raycaster = new THREE.Raycaster();

  /* ── ninja rope ── */
  private _ropeActive = false;
  private _ropeAnchor = new THREE.Vector3();
  private _ropeLine: THREE.Line | null = null;
  private _ropeLength = 0;

  /* ── AI ── */
  private _aiControlled: boolean[] = []; // which teams are AI
  private _aiThinkTimer = 0;
  private _aiState: "thinking" | "moving" | "aiming" | "firing" | "idle" = "idle";
  private _aiTarget: Worm | null = null;
  private _aiMoveTimer = 0;
  private _aiAimTimer = 0;

  /* ── trajectory preview ── */
  private _trajectoryLine: THREE.Line | null = null;
  private _trajectoryPoints: THREE.Vector3[] = [];

  /* ── screen shake ── */
  private _shakeIntensity = 0;
  private _shakeDecay = 8;

  /* ── gravestones ── */
  private _gravestones: Gravestone[] = [];

  /* ── aim arrow (3D) ── */
  private _aimArrow: THREE.Group | null = null;

  /* ── active worm indicator ── */
  private _activeIndicator: THREE.Group | null = null;

  /* ── turn announcement ── */
  private _turnAnnouncement: HTMLDivElement | null = null;
  private _turnAnnouncementTimer = 0;

  /* ── sun mesh ── */
  private _sunMesh: THREE.Mesh | null = null;

  /* ── birds ── */
  private _birds: { mesh: THREE.Group; pos: THREE.Vector3; vel: THREE.Vector3; flapPhase: number }[] = [];

  /* ── smoke trails ── */
  private _smokeTrails: { pos: THREE.Vector3; life: number; mesh: THREE.Mesh }[] = [];

  /* ── shotgun shots remaining ── */
  private _shotgunShotsLeft = 0;

  /* ── supply crates ── */
  private _supplyCrates: SupplyCrate[] = [];
  private _crateDropTimer = 0;

  /* ── oil barrels ── */
  private _oilBarrels: OilBarrel[] = [];

  /* ── torch pillars ── */
  private _torchPillars: TorchPillar[] = [];

  /* ── slow-mo kill cam ── */
  private _slowMo = false;
  private _slowMoTimer = 0;
  private _slowMoTarget: THREE.Vector3 | null = null;
  private _timeScale = 1;

  /* ── minimap ── */
  private _minimapCanvas: HTMLCanvasElement | null = null;
  private _minimapCtx: CanvasRenderingContext2D | null = null;

  /* ── pause ── */
  private _paused = false;
  private _pauseOverlay: HTMLDivElement | null = null;

  /* ── kill tracking ── */
  private _killStreak = 0;
  private _lastKillTeam = -1;
  private _totalDamageThisTurn = 0;

  /* ── held weapon visual ── */
  private _weaponModel: THREE.Group | null = null;

  /* ── walking state ── */
  private _walkCycle = 0;

  /* ── map type ── */
  private _mapType: "island" | "volcanic" | "arctic" | "desert" | "wasteland" | "enchanted" | "volcanic_isle" = "island";

  /* ── weather ── */
  private _weatherType: "clear" | "rain" | "snow" | "storm" = "clear";
  private _raindrops: THREE.Points | null = null;
  private _rainGeo: THREE.BufferGeometry | null = null;
  private _lightningTimer = 0;
  private _lightningFlash: THREE.DirectionalLight | null = null;

  /* ── wind particles ── */
  private _windParticles: { pos: THREE.Vector3; vel: THREE.Vector3; life: number; mesh: THREE.Mesh }[] = [];

  /* ── fire zones ── */
  private _fireZones: { pos: THREE.Vector3; radius: number; life: number; light: THREE.PointLight; particles: THREE.Mesh }[] = [];

  /* ── worm taunts ── */
  private _tauntBubble: THREE.Sprite | null = null;
  private _tauntTimer = 0;

  /* ── damage summary ── */
  private _turnDamageLog: { wormName: string; damage: number; teamIndex: number }[] = [];

  /* ── procedural music ── */
  private _musicOsc: OscillatorNode | null = null;
  private _musicGain: GainNode | null = null;
  private _musicPlaying = false;

  /* ── shooting stars ── */
  private _shootingStars: { pos: THREE.Vector3; vel: THREE.Vector3; life: number; trail: THREE.Line }[] = [];

  /* ── footstep dust ── */
  private _footstepTimer = 0;

  /* ── game options ── */
  private _optTurnTime = TURN_TIME;
  private _optStartHp = WORM_HP;
  private _optSuddenDeathTime = 300;
  private _aiDifficulty: "easy" | "medium" | "hard" = "medium";

  /* ── girders ── */
  private _girders: THREE.Mesh[] = [];

  /* ── skip turn ── */
  private _skippedTurn = false;

  /* ── per-worm stats ── */
  private _wormStats: Map<string, { damageDealt: number; kills: number; damageReceived: number; biggestHit: number }> = new Map();

  /* ── undo movement ── */
  private _turnStartPos: THREE.Vector3 | null = null;

  /* ── free camera ── */
  private _freeCamera = false;

  /* ── ambient sounds ── */
  private _ambientWind: OscillatorNode | null = null;
  private _ambientGain: GainNode | null = null;

  /* ── round start flyover ── */
  private _flyoverTimer = 0;
  private _flyoverActive = false;

  /* ── loading tips ── */
  private _currentTip = "";
  private readonly _tips = [
    "Use backflip (S+Space) to escape tight spots!",
    "The Mole Bomb tunnels through terrain before exploding!",
    "Wind affects projectiles — check the indicator!",
    "Sheep walk forward and explode after 3 seconds!",
    "Place Girders to create bridges over gaps!",
    "Poison Strike deals 5 damage per turn for 5 turns!",
    "Freeze Blast makes enemies skip their next turn!",
    "Press G to skip your turn strategically!",
    "Press T to taunt your enemies!",
    "The Holy Hand Grenade does 100 damage in a huge radius!",
    "Oil barrels chain-explode when damaged!",
    "Supply crates drop between turns — grab them for bonuses!",
    "Earthquake shakes ALL worms on the map!",
    "Carpet Bomb drops 12 bombs in a line!",
    "Use Teleport to reach high ground safely!",
    "The Ninja Rope lets you swing to new positions!",
    "Collect blue utility crates for super weapons!",
    "Hard AI calculates precise ballistic trajectories!",
    "Watch out for lightning during thunderstorms!",
  ];

  /* ── drowning bubbles ── */
  private _drowningBubbles: { pos: THREE.Vector3; life: number; mesh: THREE.Mesh }[] = [];

  /* ── 3D debris ── */
  private _debris: { mesh: THREE.Mesh; pos: THREE.Vector3; vel: THREE.Vector3; rotVel: THREE.Vector3; life: number }[] = [];

  /* ── melee arcs ── */
  private _meleeArcs: { mesh: THREE.Mesh; timer: number }[] = [];

  /* ── turn transition ── */
  private _turnTransition: HTMLDivElement | null = null;
  private _turnTransitionTimer = 0;

  /* ── sprint ── */
  private _sprinting = false;
  private _sprintEnergy = 1.0;

  /* ── music state ── */
  private _musicIntensity = 0; // 0 = calm, 1 = combat
  private _musicMelodyOsc: OscillatorNode | null = null;
  private _musicMelodyGain: GainNode | null = null;
  private _musicBeatTimer = 0;
  private _musicNoteIndex = 0;

  /* ── destructible env tracking ── */
  private _destructibleTrees: { group: THREE.Group; pos: THREE.Vector3; alive: boolean }[] = [];

  /* ── flinch tracking ── */
  private _flinchWorms: Map<Worm, number> = new Map();

  /* ── multi-player hot-seat ── */
  private _humanTeams: boolean[] = []; // which teams are human-controlled

  /* ── spawn parachutes ── */
  private _spawnChutes: { mesh: THREE.Group; worm: Worm; timer: number }[] = [];

  /* ── smooth HP animation ── */
  private _displayHp: Map<Worm, number> = new Map();

  /* ── victory dance ── */
  private _victoryDanceTimer = 0;

  /* ── camera zoom for melee ── */
  private _meleeZoom = false;
  private _meleeZoomTimer = 0;
  private _preMeleeZoomDist = 15;

  /* ── eliminated teams ── */
  private _eliminatedTeams: Set<number> = new Set();

  /* ── ancient ruins ── */
  private _ruins: THREE.Group[] = [];

  /* ── water splashes ── */
  private _splashes: { mesh: THREE.Mesh; timer: number }[] = [];

  /* ── post-processing ── */
  private _bloomPass: { target: THREE.WebGLRenderTarget; quad: THREE.Mesh; blurTarget: THREE.WebGLRenderTarget } | null = null;
  private _compositeScene!: THREE.Scene;
  private _compositeCamera!: THREE.OrthographicCamera;

  /* ── god rays ── */
  private _godRays: THREE.Mesh[] = [];

  /* ── heat shimmer ── */
  private _heatShimmerMeshes: { mesh: THREE.Mesh; pos: THREE.Vector3 }[] = [];

  /* ── dynamic shadow target ── */
  private _shadowTarget = new THREE.Vector3();

  /* ═══════════ boot ═══════════ */

  async boot(): Promise<void> {
    this._initRenderer();
    this._buildScene();
    this._buildTerrain();
    this._buildWater();
    this._buildEnvironment();
    this._buildSkyDome();
    this._buildSun();
    this._buildBirds();
    this._buildParticleSystem();
    this._buildAimArrow();
    this._buildActiveIndicator();
    this._buildTorchPillars();
    this._buildOilBarrels();
    this._initHUD();
    this._buildMinimap();
    this._initInput();
    this._showTitle();

    const clock = new THREE.Clock();
    const loop = () => {
      if (this._destroyed) return;
      this._animFrame = requestAnimationFrame(loop);
      this._dt = Math.min(clock.getDelta(), 0.05);
      this._time += this._dt;
      this._update();

      // Dynamic shadow camera follows action
      const worm = this._getCurrentWorm();
      if (worm) this._shadowTarget.lerp(worm.pos, 0.05);
      this._sunLight.target.position.copy(this._shadowTarget);
      this._sunLight.position.set(this._shadowTarget.x + 40, 60, this._shadowTarget.z + 30);
      this._sunLight.target.updateMatrixWorld();

      // Render main scene
      this._renderer.render(this._scene, this._camera);

      // Bloom pass: render scene to small target, then composite additively
      if (this._bloomPass) {
        this._renderer.setRenderTarget(this._bloomPass.target);
        this._renderer.render(this._scene, this._camera);
        this._renderer.setRenderTarget(null);
        // Composite bloom on top — don't clear the main scene we just rendered
        this._renderer.autoClear = false;
        this._renderer.render(this._compositeScene, this._compositeCamera);
        this._renderer.autoClear = true;
      }
    };
    loop();
  }

  /* ═══════════ renderer ═══════════ */

  private _initRenderer(): void {
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.4;
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.domElement.id = "worms3d-canvas";
    this._renderer.domElement.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:50;";
    document.body.appendChild(this._renderer.domElement);

    // Post-processing bloom render targets
    this._initBloom();
  }

  private _initBloom(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio, 2);

    const target = new THREE.WebGLRenderTarget(w * pr * 0.5, h * pr * 0.5, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat,
    });
    const blurTarget = new THREE.WebGLRenderTarget(w * pr * 0.25, h * pr * 0.25, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat,
    });

    // Full-screen quad for compositing
    this._compositeScene = new THREE.Scene();
    this._compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const quadMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        tScene: { value: null },
        tBloom: { value: target.texture },
        bloomStrength: { value: 0.35 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: `
        uniform sampler2D tBloom;
        uniform float bloomStrength;
        varying vec2 vUv;
        void main() {
          vec4 bloom = texture2D(tBloom, vUv);
          // Only output the bloom additive glow
          float lum = dot(bloom.rgb, vec3(0.299, 0.587, 0.114));
          float threshold = smoothstep(0.5, 1.0, lum);
          gl_FragColor = vec4(bloom.rgb * threshold * bloomStrength, threshold * bloomStrength);
        }
      `,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const quad = new THREE.Mesh(quadGeo, quadMat);
    this._compositeScene.add(quad);
    this._bloomPass = { target, quad, blurTarget };
  }

  /* ═══════════ scene ═══════════ */

  private _buildScene(): void {
    this._scene = new THREE.Scene();

    // Gradient sky background
    this._scene.background = new THREE.Color(0x4488cc);
    this._scene.fog = new THREE.FogExp2(0x8899bb, 0.006);

    // Sunlight
    this._sunLight = new THREE.DirectionalLight(0xffeedd, 2.5);
    this._sunLight.position.set(40, 60, 30);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(4096, 4096);
    this._sunLight.shadow.camera.left = -60;
    this._sunLight.shadow.camera.right = 60;
    this._sunLight.shadow.camera.top = 60;
    this._sunLight.shadow.camera.bottom = -60;
    this._sunLight.shadow.camera.near = 1;
    this._sunLight.shadow.camera.far = 150;
    this._sunLight.shadow.bias = -0.002;
    this._scene.add(this._sunLight);

    // Ambient
    this._ambientLight = new THREE.AmbientLight(0x6688aa, 0.8);
    this._scene.add(this._ambientLight);

    // Hemisphere light for natural feel
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x556B2F, 0.6);
    this._scene.add(hemiLight);

    // Camera
    this._camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 500);
    this._camera.position.set(0, 30, -30);
  }

  /* ═══════════ sky dome ═══════════ */

  private _buildSkyDome(): void {
    const skyGeo = new THREE.SphereGeometry(200, 64, 48);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x0044aa) },
        midColor: { value: new THREE.Color(0x88bbee) },
        bottomColor: { value: new THREE.Color(0xffeebb) },
        offset: { value: 20 },
        exponent: { value: 0.4 },
        uTime: { value: 0 },
        uSunPos: { value: new THREE.Vector3(40, 60, 30).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vDirection;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        uniform float uTime;
        uniform vec3 uSunPos;
        varying vec3 vWorldPosition;
        varying vec3 vDirection;

        // Simple hash noise
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0;
          v += noise(p) * 0.5;
          v += noise(p * 2.0 + 10.0) * 0.25;
          v += noise(p * 4.0 + 20.0) * 0.125;
          v += noise(p * 8.0 + 30.0) * 0.0625;
          return v;
        }

        void main() {
          float h = normalize(vWorldPosition + offset).y;
          float t = max(pow(max(h, 0.0), exponent), 0.0);
          vec3 sky = mix(midColor, topColor, t);
          float b = max(-h * 2.0, 0.0);
          sky = mix(sky, bottomColor, b);

          // Procedural cloud layer
          if (h > 0.02) {
            vec2 cloudUv = vDirection.xz / (vDirection.y + 0.3) * 3.0;
            cloudUv += vec2(uTime * 0.02, uTime * 0.01);
            float cloud = fbm(cloudUv);
            cloud = smoothstep(0.35, 0.65, cloud);
            // Cloud brightness — lit by sun
            float sunDot = max(dot(normalize(vDirection), uSunPos), 0.0);
            vec3 cloudColor = mix(vec3(0.85, 0.88, 0.95), vec3(1.0, 0.98, 0.9), sunDot);
            // Cloud shadow (darker underside)
            cloudColor *= mix(0.6, 1.0, smoothstep(0.35, 0.55, cloud));
            sky = mix(sky, cloudColor, cloud * 0.7 * smoothstep(0.02, 0.15, h));
          }

          // Sun halo / atmospheric scattering
          float sunAngle = max(dot(normalize(vDirection), uSunPos), 0.0);
          // Mie scattering (tight halo)
          float mie = pow(sunAngle, 32.0) * 0.4;
          // Rayleigh (wide warm glow)
          float rayleigh = pow(sunAngle, 4.0) * 0.15;
          sky += vec3(1.0, 0.9, 0.7) * mie;
          sky += vec3(1.0, 0.8, 0.5) * rayleigh;

          // Horizon haze
          float haze = pow(1.0 - abs(h), 8.0);
          sky = mix(sky, midColor * 1.1, haze * 0.3);

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
    });
    this._skyDome = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(this._skyDome);
  }

  /* ═══════════ sun ═══════════ */

  private _buildSun(): void {
    const sunPos = new THREE.Vector3(40, 60, 30);

    // Sun core (bright, emissive)
    const sunGeo = new THREE.SphereGeometry(4, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffdd });
    this._sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this._sunMesh.position.copy(sunPos);
    this._scene.add(this._sunMesh);

    // Inner corona
    const corona1 = new THREE.Mesh(
      new THREE.SphereGeometry(7, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.25, depthWrite: false }),
    );
    corona1.position.copy(sunPos);
    this._scene.add(corona1);

    // Outer corona
    const corona2 = new THREE.Mesh(
      new THREE.SphereGeometry(12, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffdd66, transparent: true, opacity: 0.1, depthWrite: false }),
    );
    corona2.position.copy(sunPos);
    this._scene.add(corona2);

    // Atmospheric scatter haze
    const haze = new THREE.Mesh(
      new THREE.SphereGeometry(20, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffcc88, transparent: true, opacity: 0.04, depthWrite: false }),
    );
    haze.position.copy(sunPos);
    this._scene.add(haze);

    // God rays — radial light shafts using tapered planes
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const length = 25 + Math.random() * 15;
      const width = 1.5 + Math.random() * 1.5;

      const rayGeo = new THREE.PlaneGeometry(width, length);
      // Taper by shrinking top vertices
      const rayPos = rayGeo.attributes.position;
      for (let v = 0; v < rayPos.count; v++) {
        const vy = rayPos.getY(v);
        if (vy > 0) {
          rayPos.setX(v, rayPos.getX(v) * 0.15); // narrow tip
        }
      }
      rayGeo.computeVertexNormals();

      const rayMat = new THREE.MeshBasicMaterial({
        color: 0xffee88, transparent: true, opacity: 0.04 + Math.random() * 0.03,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.position.copy(sunPos);
      ray.rotation.z = angle;
      ray.lookAt(this._camera.position);
      this._scene.add(ray);
      this._godRays.push(ray);
    }

    // Lens flare elements (screen-space sprites near sun)
    const flareColors = [0xffffff, 0xffee88, 0x88aaff, 0xffaa44, 0xaaddff];
    const flareSizes = [1.5, 0.8, 0.5, 0.3, 1.0];
    for (let i = 0; i < 5; i++) {
      const flareMat = new THREE.SpriteMaterial({
        color: flareColors[i],
        transparent: true,
        opacity: 0.08 + Math.random() * 0.05,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      });
      const flare = new THREE.Sprite(flareMat);
      const offset = (i - 2) * 8;
      flare.position.copy(sunPos).add(new THREE.Vector3(offset * 0.3, offset * 0.2, offset * 0.1));
      flare.scale.setScalar(flareSizes[i] * 3);
      this._scene.add(flare);
    }
  }

  /* ═══════════ birds ═══════════ */

  private _buildBirds(): void {
    for (let i = 0; i < 15; i++) {
      const bird = new THREE.Group();
      const birdMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
      const birdLight = new THREE.MeshStandardMaterial({ color: 0x444433 });

      // Body (smooth ellipsoid)
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 16, 12),
        birdMat,
      );
      body.scale.set(1, 0.7, 2);
      bird.add(body);

      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), birdMat);
      head.position.set(0, 0.05, 0.28);
      bird.add(head);

      // Beak
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 10), new THREE.MeshStandardMaterial({ color: 0xcc8800 }));
      beak.position.set(0, 0.02, 0.36);
      beak.rotation.x = Math.PI / 2;
      bird.add(beak);

      // Tail
      const tail = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.2, 10),
        birdMat,
      );
      tail.position.set(0, 0.03, -0.28);
      tail.rotation.x = -Math.PI / 2 - 0.3;
      tail.scale.x = 0.4;
      bird.add(tail);

      // Wings (more detailed shape with taper)
      for (const side of [-1, 1]) {
        const wingGeo = new THREE.PlaneGeometry(0.7, 0.3, 4, 1);
        // Taper wing tip
        const wp = wingGeo.attributes.position;
        for (let v = 0; v < wp.count; v++) {
          const wx = wp.getX(v);
          if (Math.abs(wx) > 0.2) {
            wp.setY(v, wp.getY(v) * (1 - Math.abs(wx) * 0.8));
          }
        }
        wingGeo.computeVertexNormals();
        const wing = new THREE.Mesh(wingGeo, new THREE.MeshStandardMaterial({
          color: 0x333333, side: THREE.DoubleSide,
        }));
        wing.position.set(side * 0.35, 0, 0);
        wing.name = "wing";
        bird.add(wing);
      }

      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 60;
      const height = 25 + Math.random() * 25;
      const pos = new THREE.Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      const speed = 5 + Math.random() * 4;
      const vel = new THREE.Vector3(-Math.sin(angle) * speed, 0, Math.cos(angle) * speed);

      bird.position.copy(pos);
      this._scene.add(bird);
      this._birds.push({ mesh: bird, pos: pos.clone(), vel, flapPhase: Math.random() * Math.PI * 2 });
    }
  }

  /* ═══════════ aim arrow ═══════════ */

  private _buildAimArrow(): void {
    this._aimArrow = new THREE.Group();

    // Arrow shaft
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.5, 12),
      new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.8 }),
    );
    shaft.position.y = 0.75;
    shaft.rotation.z = -Math.PI / 2;
    this._aimArrow.add(shaft);

    // Arrowhead
    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.25, 12),
      new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.9 }),
    );
    head.position.set(1.5, 0, 0);
    head.rotation.z = -Math.PI / 2;
    this._aimArrow.add(head);

    this._aimArrow.visible = false;
    this._scene.add(this._aimArrow);
  }

  /* ═══════════ active worm indicator ═══════════ */

  private _buildActiveIndicator(): void {
    this._activeIndicator = new THREE.Group();

    // Downward-pointing arrow above worm
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 0.5, 16),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.8 }),
    );
    arrow.rotation.x = Math.PI;
    arrow.position.y = 0;
    this._activeIndicator.add(arrow);

    // Glowing ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.04, 12, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.5 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.3;
    this._activeIndicator.add(ring);

    this._activeIndicator.visible = false;
    this._scene.add(this._activeIndicator);
  }

  /* ═══════════ torch pillars ═══════════ */

  private _buildTorchPillars(): void {
    for (let i = 0; i < 10; i++) {
      const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.6;
      const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.6;
      const h = this._getTerrainHeight(x, z);
      if (h < 2 || h > 12) continue;

      const g = new THREE.Group();

      // Stone pillar (high-poly, tapered)
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.22, 2, 16, 6),
        new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.9 }),
      );
      pillar.position.y = 1;
      pillar.castShadow = true;
      g.add(pillar);

      // Pillar base (wider ring)
      const pillarBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.28, 0.15, 16),
        new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.9 }),
      );
      pillarBase.position.y = 0.075;
      g.add(pillarBase);

      // Pillar ring detail
      const pillarRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.17, 0.02, 6, 16),
        new THREE.MeshStandardMaterial({ color: 0x444433, roughness: 0.8 }),
      );
      pillarRing.position.y = 1.5;
      pillarRing.rotation.x = Math.PI / 2;
      g.add(pillarRing);

      // Brazier top (high-poly iron bowl)
      const brazier = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.18, 0.3, 16, 4),
        new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.8, metalness: 0.3 }),
      );
      brazier.position.y = 2.15;
      g.add(brazier);

      // Brazier rim
      const brazierRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.025, 8, 20),
        new THREE.MeshStandardMaterial({ color: 0x333322, metalness: 0.4, roughness: 0.6 }),
      );
      brazierRim.position.y = 2.3;
      brazierRim.rotation.x = Math.PI / 2;
      g.add(brazierRim);

      // Fire (emissive sphere — high-poly)
      const fire = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8 }),
      );
      fire.position.y = 2.4;
      fire.name = "fire";
      g.add(fire);

      // Inner fire (white-hot core)
      const innerFire = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.6 }),
      );
      innerFire.position.y = 2.38;
      g.add(innerFire);

      // Point light
      const light = new THREE.PointLight(0xff8844, 2, 12);
      light.position.y = 2.5;
      g.add(light);

      g.position.set(x, h, z);
      this._scene.add(g);
      this._torchPillars.push({ mesh: g, light, pos: new THREE.Vector3(x, h, z) });
    }
  }

  /* ═══════════ oil barrels ═══════════ */

  private _buildOilBarrels(): void {
    for (let i = 0; i < 8; i++) {
      const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.5;
      const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.5;
      const h = this._getTerrainHeight(x, z);
      if (h < 1 || h > 10) continue;

      const g = new THREE.Group();

      // Barrel body (high-poly for smooth cylinder)
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.8, 20, 4),
        new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.7, metalness: 0.2 }),
      );
      barrel.position.y = 0.4;
      barrel.castShadow = true;
      g.add(barrel);

      // Barrel bulge (slight widening in the middle for realism)
      const bulge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.37, 0.37, 0.3, 20),
        new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.7, metalness: 0.2 }),
      );
      bulge.position.y = 0.4;
      g.add(bulge);

      // Metal bands (high-poly, more of them)
      for (const by of [0.1, 0.35, 0.5, 0.7]) {
        const band = new THREE.Mesh(
          new THREE.TorusGeometry(0.36, 0.02, 8, 24),
          new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.6, roughness: 0.4 }),
        );
        band.position.y = by;
        band.rotation.x = Math.PI / 2;
        g.add(band);
      }

      // Top lid
      const lid = new THREE.Mesh(
        new THREE.CircleGeometry(0.34, 16),
        new THREE.MeshStandardMaterial({ color: 0x774422, roughness: 0.8 }),
      );
      lid.position.y = 0.8;
      lid.rotation.x = -Math.PI / 2;
      g.add(lid);

      // Skull/danger symbol (small plane)
      const danger = new THREE.Mesh(
        new THREE.PlaneGeometry(0.25, 0.25),
        new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.9 }),
      );
      danger.position.set(0, 0.4, 0.36);
      g.add(danger);

      // Rivets on bands
      for (let ri = 0; ri < 6; ri++) {
        const ra = (ri / 6) * Math.PI * 2;
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 10),
          new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7 }));
        rivet.position.set(Math.cos(ra) * 0.36, 0.35, Math.sin(ra) * 0.36);
        g.add(rivet);
      }

      g.position.set(x, h, z);
      this._scene.add(g);
      this._oilBarrels.push({ mesh: g, pos: new THREE.Vector3(x, h, z), hp: 30, alive: true });
    }
  }

  /* ═══════════ minimap ═══════════ */

  private _buildMinimap(): void {
    this._minimapCanvas = document.createElement("canvas");
    this._minimapCanvas.width = 150;
    this._minimapCanvas.height = 150;
    this._minimapCanvas.style.cssText = `
      position: absolute; bottom: 15px; right: 15px; width: 150px; height: 150px;
      border: 2px solid rgba(200,170,100,0.5); border-radius: 8px;
      background: rgba(10,10,20,0.7); pointer-events: none;
    `;
    this._hudContainer.appendChild(this._minimapCanvas);
    this._minimapCtx = this._minimapCanvas.getContext("2d")!;
  }

  private _renderMinimap(): void {
    if (!this._minimapCtx || !this._minimapCanvas) return;
    const ctx = this._minimapCtx;
    const w = 150, h = 150;
    ctx.clearRect(0, 0, w, h);

    // Draw terrain heightmap
    const res = 30;
    const cellW = w / res;
    const cellH = h / res;
    for (let z = 0; z < res; z++) {
      for (let x = 0; x < res; x++) {
        const wx = ((x / res) - 0.5) * TERRAIN_SIZE;
        const wz = ((z / res) - 0.5) * TERRAIN_SIZE;
        const th = this._getTerrainHeight(wx, wz);
        if (th < WATER_LEVEL + this._waterMesh.position.y) {
          ctx.fillStyle = `rgba(20,60,120,0.6)`;
        } else {
          const brightness = Math.floor(40 + Math.min(th / TERRAIN_HEIGHT, 1) * 80);
          ctx.fillStyle = `rgb(${brightness - 10},${brightness + 20},${brightness - 15})`;
        }
        ctx.fillRect(x * cellW, z * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // Draw worms
    for (const worm of this._worms) {
      if (!worm.alive) continue;
      const mx = ((worm.pos.x / TERRAIN_SIZE) + 0.5) * w;
      const mz = ((worm.pos.z / TERRAIN_SIZE) + 0.5) * h;
      const c = TEAM_COLORS[worm.teamIndex];
      ctx.fillStyle = `#${c.toString(16).padStart(6, "0")}`;
      ctx.beginPath();
      ctx.arc(mx, mz, worm === this._getCurrentWorm() ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();
      if (worm === this._getCurrentWorm()) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Draw crates
    ctx.fillStyle = "#ffdd44";
    for (const crate of this._supplyCrates) {
      const mx = ((crate.pos.x / TERRAIN_SIZE) + 0.5) * w;
      const mz = ((crate.pos.z / TERRAIN_SIZE) + 0.5) * h;
      ctx.fillRect(mx - 2, mz - 2, 4, 4);
    }

    // Draw barrels
    ctx.fillStyle = "#ff6644";
    for (const barrel of this._oilBarrels) {
      if (!barrel.alive) continue;
      const mx = ((barrel.pos.x / TERRAIN_SIZE) + 0.5) * w;
      const mz = ((barrel.pos.z / TERRAIN_SIZE) + 0.5) * h;
      ctx.fillRect(mx - 2, mz - 2, 4, 4);
    }
  }

  /* ═══════════ terrain ═══════════ */

  private _buildTerrain(): void {
    const res = TERRAIN_RES;
    const size = TERRAIN_SIZE;
    this._heightData = new Float32Array((res + 1) * (res + 1));

    // Generate interesting terrain using layered noise
    for (let z = 0; z <= res; z++) {
      for (let x = 0; x <= res; x++) {
        const nx = x / res - 0.5;
        const nz = z / res - 0.5;

        // Island shape - fade to water at edges
        const distFromCenter = Math.sqrt(nx * nx + nz * nz) * 2;
        const islandMask = Math.max(0, 1 - distFromCenter * distFromCenter) * 1.2;

        // Layered noise
        let h = 0;
        h += this._noise(nx * 3, nz * 3) * 1.0;
        h += this._noise(nx * 6 + 10, nz * 6 + 10) * 0.5;
        h += this._noise(nx * 12 + 20, nz * 12 + 20) * 0.25;
        h += this._noise(nx * 24 + 30, nz * 24 + 30) * 0.12;

        // Create some plateaus and valleys
        h = h * 0.5 + 0.5; // normalize 0-1
        h = Math.pow(h, 0.8); // flatten lows

        // Add some ridge features
        const ridge = Math.abs(this._noise(nx * 5 + 50, nz * 5 + 50));
        h += ridge * 0.3;

        h *= islandMask * TERRAIN_HEIGHT;
        h -= 1; // sink edges below water

        this._heightData[z * (res + 1) + x] = isNaN(h) ? 0 : h;
      }
    }

    // Create geometry
    this._terrainGeo = new THREE.PlaneGeometry(size, size, res, res);
    this._terrainGeo.rotateX(-Math.PI / 2);
    const positions = this._terrainGeo.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const h = this._heightData[i];
      positions.setY(i, isNaN(h) ? 0 : h);
      // Also sanitize X/Z in case rotateX produced NaN
      if (isNaN(positions.getX(i))) positions.setX(i, 0);
      if (isNaN(positions.getZ(i))) positions.setZ(i, 0);
    }
    positions.needsUpdate = true;
    this._terrainGeo.computeVertexNormals();
    this._terrainGeo.computeBoundingSphere();

    // Color by height — lush greens, rocky grays, sandy beaches
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      let color: THREE.Color;
      if (y < WATER_LEVEL + 0.5) {
        color = new THREE.Color(0xd4b896); // sand
      } else if (y < 3) {
        const t = (y - WATER_LEVEL - 0.5) / (3 - WATER_LEVEL - 0.5);
        color = new THREE.Color(0xd4b896).lerp(new THREE.Color(0x4a8c3f), t); // sand → grass
      } else if (y < 8) {
        const t = (y - 3) / 5;
        color = new THREE.Color(0x4a8c3f).lerp(new THREE.Color(0x3a7030), t); // light→dark grass
      } else if (y < 12) {
        const t = (y - 8) / 4;
        color = new THREE.Color(0x3a7030).lerp(new THREE.Color(0x888878), t); // grass → rock
      } else {
        color = new THREE.Color(0x999988); // rock/snow
      }
      // Add slight variation
      const variation = (Math.random() - 0.5) * 0.05;
      colors[i * 3] = Math.max(0, Math.min(1, color.r + variation));
      colors[i * 3 + 1] = Math.max(0, Math.min(1, color.g + variation));
      colors[i * 3 + 2] = Math.max(0, Math.min(1, color.b + variation));
    }
    this._terrainGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Custom terrain shader for slope-based detail, AO in crevices, and normal perturbation
    const terrainMat = new THREE.ShaderMaterial({
      lights: true,
      uniforms: {
        ...THREE.UniformsLib.lights,
        ...THREE.UniformsLib.fog,
        uTime: { value: 0 },
      },
      vertexShader: `
        #include <common>
        #include <fog_pars_vertex>
        #include <shadowmap_pars_vertex>
        attribute vec3 color;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vHeight;
        varying float vSlope;
        void main() {
          vColor = color;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vHeight = position.y;
          vSlope = 1.0 - abs(normal.y);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          vec3 transformedNormal = normalize(normalMatrix * normal);
          vec4 worldPosition = worldPos;
          #include <fog_vertex>
          #include <shadowmap_vertex>
        }
      `,
      fragmentShader: `
        #include <common>
        #include <packing>
        #include <fog_pars_fragment>
        #include <lights_pars_begin>
        #include <shadowmap_pars_fragment>
        uniform float uTime;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vHeight;
        varying float vSlope;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise2d(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
        }

        void main() {
          vec3 baseColor = vColor;

          // Slope-based rock blending — steeper areas look more rocky
          vec3 rockColor = vec3(0.45, 0.42, 0.38);
          float rockBlend = smoothstep(0.4, 0.8, vSlope);
          baseColor = mix(baseColor, rockColor, rockBlend * 0.7);

          // Micro detail noise to break up flat color
          float detail = noise2d(vWorldPos.xz * 2.0) * 0.08 - 0.04;
          float detail2 = noise2d(vWorldPos.xz * 8.0) * 0.04 - 0.02;
          baseColor += vec3(detail + detail2);

          // Ambient occlusion in crevices (approximate via height-based darkening at low slopes)
          float ao = smoothstep(-1.0, 3.0, vHeight) * 0.3 + 0.7;
          // Extra darkening in valleys between peaks
          float valleyDark = 1.0 - smoothstep(0.0, 0.5, vSlope) * 0.15;
          ao *= valleyDark;

          // Perturbed normal for micro surface detail
          vec3 n = normalize(vNormal);
          float nx = noise2d(vWorldPos.xz * 4.0 + 100.0) * 2.0 - 1.0;
          float nz = noise2d(vWorldPos.xz * 4.0 + 200.0) * 2.0 - 1.0;
          n = normalize(n + vec3(nx, 0.0, nz) * 0.08);

          // Simple lighting (Lambert + ambient)
          vec3 lightDir = normalize(vec3(0.4, 0.6, 0.3));
          float lambert = max(dot(n, lightDir), 0.0);
          vec3 ambient = vec3(0.3, 0.35, 0.45);
          vec3 diffuse = vec3(1.0, 0.95, 0.85) * lambert;

          vec3 finalColor = baseColor * (ambient + diffuse * 0.8) * ao;

          // Rim highlight for depth at edges
          float rimDot = 1.0 - max(dot(n, normalize(cameraPosition - vWorldPos)), 0.0);
          float rim = pow(rimDot, 3.0) * 0.08;
          finalColor += vec3(0.6, 0.7, 0.9) * rim;

          gl_FragColor = vec4(finalColor, 1.0);
          #include <fog_fragment>
        }
      `,
      fog: true,
    });

    this._terrainMesh = new THREE.Mesh(this._terrainGeo, terrainMat);
    this._terrainMesh.castShadow = true;
    this._terrainMesh.receiveShadow = true;
    this._scene.add(this._terrainMesh);
  }

  /** Simple pseudo-noise (deterministic, no external dependency) */
  private _noise(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const h = (a: number, b: number) => {
      const n = a * 12345 + b * 67890;
      const s = Math.sin(n * 43758.5453123);
      return s - Math.floor(s);
    };
    const n00 = h(ix, iy) * 2 - 1;
    const n10 = h(ix + 1, iy) * 2 - 1;
    const n01 = h(ix, iy + 1) * 2 - 1;
    const n11 = h(ix + 1, iy + 1) * 2 - 1;
    const nx0 = n00 + sx * (n10 - n00);
    const nx1 = n01 + sx * (n11 - n01);
    return nx0 + sy * (nx1 - nx0);
  }

  /* ═══════════ water ═══════════ */

  private _buildWater(): void {
    const waterGeo = new THREE.PlaneGeometry(400, 400, 200, 200);
    waterGeo.rotateX(-Math.PI / 2);

    const waterMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uWaterColor: { value: new THREE.Color(0x1166aa) },
        uDeepColor: { value: new THREE.Color(0x042244) },
        uFoamColor: { value: new THREE.Color(0xaaddff) },
        uCameraPos: { value: new THREE.Vector3() },
        uSunDir: { value: new THREE.Vector3(0.4, 0.6, 0.3).normalize() },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vWave;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vec3 pos = position;
          // Multi-octave waves
          float wave = sin(pos.x * 0.3 + uTime * 1.5) * 0.3
                     + sin(pos.z * 0.4 + uTime * 1.2) * 0.2
                     + sin((pos.x + pos.z) * 0.2 + uTime * 0.8) * 0.15
                     + sin(pos.x * 0.8 - uTime * 2.0) * 0.08
                     + sin(pos.z * 1.1 + uTime * 1.8) * 0.06;
          pos.y += wave + ${WATER_LEVEL.toFixed(1)};
          vWave = wave;
          // Approximate normal from wave derivatives
          float dx = cos(pos.x * 0.3 + uTime * 1.5) * 0.09 + cos(pos.x * 0.8 - uTime * 2.0) * 0.064;
          float dz = cos(pos.z * 0.4 + uTime * 1.2) * 0.08 + cos(pos.z * 1.1 + uTime * 1.8) * 0.066;
          vNormal = normalize(vec3(-dx, 1.0, -dz));
          vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uWaterColor;
        uniform vec3 uDeepColor;
        uniform vec3 uFoamColor;
        uniform float uTime;
        uniform vec3 uCameraPos;
        uniform vec3 uSunDir;
        varying vec2 vUv;
        varying float vWave;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          float depth = smoothstep(-0.3, 0.3, vWave);
          vec3 color = mix(uDeepColor, uWaterColor, depth);

          // Foam on wave crests
          float foam = smoothstep(0.22, 0.32, vWave);
          color = mix(color, uFoamColor, foam * 0.5);

          // Caustics pattern (animated voronoi-like)
          vec2 cuv = vWorldPos.xz * 0.15;
          float caustic = sin(cuv.x * 5.0 + uTime * 2.0) * sin(cuv.y * 5.0 + uTime * 1.7)
                        + sin(cuv.x * 7.0 - uTime * 1.3) * sin(cuv.y * 7.0 + uTime * 2.2);
          caustic = max(caustic, 0.0) * 0.15;
          color += vec3(caustic) * depth;

          // Specular reflection (Blinn-Phong)
          vec3 viewDir = normalize(uCameraPos - vWorldPos);
          vec3 halfDir = normalize(uSunDir + viewDir);
          float spec = pow(max(dot(vNormal, halfDir), 0.0), 64.0);
          color += vec3(1.0, 0.95, 0.8) * spec * 0.6;

          // Fresnel (more reflective at grazing angles)
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
          float alpha = mix(0.7, 0.95, fresnel);

          // Shore foam — near terrain edges (where uv is near center)
          float distFromCenter = length(vUv - 0.5) * 2.0;
          float shoreFoam = smoothstep(0.3, 0.35, distFromCenter) * (1.0 - smoothstep(0.35, 0.45, distFromCenter));
          float foamPattern = sin(vWorldPos.x * 2.0 + uTime * 3.0) * sin(vWorldPos.z * 2.0 + uTime * 2.5);
          shoreFoam *= max(foamPattern, 0.0);
          color = mix(color, vec3(0.9, 0.95, 1.0), shoreFoam * 0.4);

          gl_FragColor = vec4(color, alpha);
        }
      `,
    });

    this._waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this._scene.add(this._waterMesh);
  }

  /* ═══════════ environment ═══════════ */

  private _buildEnvironment(): void {
    this._buildCastles();
    this._buildClouds();
    this._buildTrees();
    this._buildBanners();
    this._buildRocks();
    this._buildGrassAndFlowers();
    this._buildMountains();
    this._buildRuins();
  }

  private _buildCastles(): void {
    // Build distant castles on the horizon for atmosphere
    const castlePositions = [
      { x: -80, z: 80, scale: 1.2, rot: 0.3 },
      { x: 80, z: 70, scale: 0.9, rot: -0.5 },
      { x: 0, z: 90, scale: 1.5, rot: 0 },
      { x: -60, z: -80, scale: 1.0, rot: 0.8 },
      { x: 70, z: -75, scale: 1.1, rot: -0.2 },
    ];

    for (const cp of castlePositions) {
      const castle = this._createCastle(cp.scale);
      castle.position.set(cp.x, this._getTerrainHeight(cp.x, cp.z) - 1, cp.z);
      castle.rotation.y = cp.rot;
      this._scene.add(castle);
      this._castles.push(castle);
    }
  }

  private _createCastle(scale: number): THREE.Group {
    const g = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.9, metalness: 0.1 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.95, metalness: 0.05 });
    const lightStoneMat = new THREE.MeshStandardMaterial({ color: 0xaa9988, roughness: 0.85, metalness: 0.1 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.4 });
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x442200, roughness: 0.8 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xddaa44, metalness: 0.8, roughness: 0.3 });
    const windowGlow = new THREE.MeshBasicMaterial({ color: 0xffdd88, transparent: true, opacity: 0.8 });

    // Foundation platform
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 12, 6, 1, 6), darkStoneMat);
    foundation.position.y = -0.5;
    foundation.castShadow = true;
    g.add(foundation);

    // Main keep (multi-tiered)
    const keepBase = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 6, 4, 4, 4), stoneMat);
    keepBase.position.y = 4;
    keepBase.castShadow = true;
    g.add(keepBase);

    // Keep upper section (narrower)
    const keepUpper = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5, 3, 3, 3), lightStoneMat);
    keepUpper.position.y = 10.5;
    keepUpper.castShadow = true;
    g.add(keepUpper);

    // Keep roof (pyramid)
    const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(4, 3, 4, 2), roofMat);
    keepRoof.position.y = 14.5;
    keepRoof.rotation.y = Math.PI / 4;
    g.add(keepRoof);

    // Keep stone ledge between tiers
    const keepLedge = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.3, 6.5, 4, 1, 4), darkStoneMat);
    keepLedge.position.y = 8;
    g.add(keepLedge);

    // Keep battlements
    for (let bx = -2; bx <= 2; bx += 1) {
      for (const bz of [-2.6, 2.6]) {
        const bm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.4, 2, 2, 2), stoneMat);
        bm.position.set(bx, 13.3, bz);
        g.add(bm);
      }
      for (const bzz of [-2.6, 2.6]) {
        const bm2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.4, 2, 2, 2), stoneMat);
        bm2.position.set(bzz, 13.3, bx);
        g.add(bm2);
      }
    }

    // Corner towers (4 tall round towers)
    for (const dx of [-5, 5]) {
      for (const dz of [-5, 5]) {
        // Tower base (wider)
        const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 3, 24, 4), darkStoneMat);
        towerBase.position.set(dx, 1.5, dz);
        towerBase.castShadow = true;
        g.add(towerBase);

        // Tower shaft
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 12, 24, 8), stoneMat);
        tower.position.set(dx, 9, dz);
        tower.castShadow = true;
        g.add(tower);

        // Tower upper widening (machicolation)
        const towerTop = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.4, 1.5, 24, 2), darkStoneMat);
        towerTop.position.set(dx, 15.75, dz);
        g.add(towerTop);

        // Tower roof (conical with finial)
        const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 4, 24, 4), roofMat);
        roof.position.set(dx, 18.5, dz);
        g.add(roof);

        // Roof finial (gold spire)
        const finial = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.8, 8), goldMat);
        finial.position.set(dx, 20.8, dz);
        g.add(finial);

        // Battlements around tower top
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
          const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.4, 2, 2, 2), stoneMat);
          merlon.position.set(dx + Math.cos(a) * 1.75, 16.5, dz + Math.sin(a) * 1.75);
          g.add(merlon);
        }

        // Tower windows (arrow slits)
        for (const wy of [6, 9, 12]) {
          for (let wa = 0; wa < Math.PI * 2; wa += Math.PI / 2) {
            const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.6), windowGlow);
            slit.position.set(dx + Math.cos(wa) * 1.61, wy, dz + Math.sin(wa) * 1.61);
            slit.rotation.y = -wa + Math.PI / 2;
            g.add(slit);
          }
        }

        // Tower base ring
        const baseRing = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.12, 8, 24), darkStoneMat);
        baseRing.position.set(dx, 0.12, dz);
        baseRing.rotation.x = Math.PI / 2;
        g.add(baseRing);
      }
    }

    // Curtain walls (connecting towers)
    const wallConfigs = [
      { x: 0, z: -5, ry: 0, len: 10 }, { x: 0, z: 5, ry: 0, len: 10 },
      { x: -5, z: 0, ry: Math.PI / 2, len: 10 }, { x: 5, z: 0, ry: Math.PI / 2, len: 10 },
    ];
    for (const wc of wallConfigs) {
      // Wall body
      const wall = new THREE.Mesh(new THREE.BoxGeometry(wc.len, 9, 1.2, 6, 4, 1), stoneMat);
      wall.position.set(wc.x, 4.5, wc.z);
      wall.rotation.y = wc.ry;
      wall.castShadow = true;
      g.add(wall);

      // Wall-walk
      const walkway = new THREE.Mesh(new THREE.BoxGeometry(wc.len, 0.25, 2.0, 6, 1, 1), darkStoneMat);
      walkway.position.set(wc.x, 9.1, wc.z);
      walkway.rotation.y = wc.ry;
      g.add(walkway);

      // Wall buttresses (supports every ~3 units)
      for (let bi = -4; bi <= 4; bi += 2.5) {
        const buttress = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 0.8, 2, 3, 2), darkStoneMat);
        if (wc.ry === 0) {
          buttress.position.set(wc.x + bi, 3, wc.z + (wc.z > 0 ? 0.8 : -0.8));
        } else {
          buttress.position.set(wc.x + (wc.x > 0 ? 0.8 : -0.8), 3, wc.z + bi);
        }
        buttress.castShadow = true;
        g.add(buttress);
      }

      // Wall merlons
      for (let m = -4; m <= 4; m += 0.9) {
        const wMerlon = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.4, 2, 2, 2), stoneMat);
        if (wc.ry === 0) {
          wMerlon.position.set(wc.x + m, 9.6, wc.z + (wc.z > 0 ? 0.7 : -0.7));
        } else {
          wMerlon.position.set(wc.x + (wc.x > 0 ? 0.7 : -0.7), 9.6, wc.z + m);
        }
        g.add(wMerlon);
      }
    }

    // Gatehouse (front entrance — more elaborate)
    const gatehouse = new THREE.Mesh(new THREE.BoxGeometry(4, 10, 3, 3, 5, 2), darkStoneMat);
    gatehouse.position.set(0, 5, -5);
    gatehouse.castShadow = true;
    g.add(gatehouse);

    // Gatehouse battlements
    for (let gm = -1.5; gm <= 1.5; gm += 0.8) {
      const ghMerlon = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 0.35, 2, 2, 2), stoneMat);
      ghMerlon.position.set(gm, 10.3, -5.5);
      g.add(ghMerlon);
    }

    // Gatehouse arch
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.2, 8, 16, Math.PI), darkStoneMat);
    arch.position.set(0, 3, -6.5);
    g.add(arch);

    // Gate door (heavy oak)
    const gate = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3, 0.15, 3, 5, 1), gateMat);
    gate.position.set(0, 1.5, -6.6);
    g.add(gate);

    // Door iron bands
    for (const dy of [0.4, 1.2, 2.0, 2.8]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.02), ironMat);
      band.position.set(0, dy, -6.53);
      g.add(band);
    }

    // Door ring knocker
    const knocker = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 12), ironMat);
    knocker.position.set(0, 1.5, -6.68);
    g.add(knocker);

    // Portcullis
    for (let px = -0.7; px <= 0.7; px += 0.18) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3, 8), ironMat);
      bar.position.set(px, 1.5, -5.8);
      g.add(bar);
    }
    for (let py = 0.3; py <= 2.7; py += 0.35) {
      const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 8), ironMat);
      cb.rotation.z = Math.PI / 2;
      cb.position.set(0, py, -5.8);
      g.add(cb);
    }

    // Keep windows (larger, with stone frames)
    for (const wy of [4, 6.5, 9, 11]) {
      for (const side of [-1, 1]) {
        for (const face of [-1, 1]) {
          // Window frame
          const frame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.15, 2, 2, 1), darkStoneMat);
          const faceOffset = face * 3.01;
          if (Math.abs(face) === 1) {
            frame.position.set(side * 1.5, wy, faceOffset);
          }
          g.add(frame);
          // Window glow
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.8), windowGlow);
          win.position.set(side * 1.5, wy, faceOffset + face * 0.01);
          if (face < 0) win.rotation.y = Math.PI;
          g.add(win);
        }
      }
    }

    // Interior lights (warm glow through windows)
    for (const ly of [5, 8, 11]) {
      const light = new THREE.PointLight(0xffcc66, 1.2, 8);
      light.position.set(0, ly, 0);
      g.add(light);
    }

    // Chapel tower (smaller tower on one side)
    const chapel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 8, 16, 4), lightStoneMat);
    chapel.position.set(3, 4, 3);
    chapel.castShadow = true;
    g.add(chapel);

    const chapelRoof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.5, 16, 2), roofMat);
    chapelRoof.position.set(3, 9.25, 3);
    g.add(chapelRoof);

    // Chapel cross
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), goldMat);
    crossV.position.set(3, 10.8, 3);
    g.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06), goldMat);
    crossH.position.set(3, 10.9, 3);
    g.add(crossH);

    // Multiple flag poles on towers
    for (const [fx, fz] of [[-5, -5], [5, 5], [0, 0]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4, 10),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 }));
      pole.position.set(fx, fx === 0 ? 16 : 21, fz);
      g.add(pole);

      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), goldMat);
      tip.position.set(fx, fx === 0 ? 18 : 23, fz);
      g.add(tip);

      const flagColor = TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)];
      const flagGeo = new THREE.PlaneGeometry(2, 1.2, 8, 4);
      const fp = flagGeo.attributes.position;
      for (let fi = 0; fi < fp.count; fi++) {
        fp.setZ(fi, Math.sin(fp.getX(fi) * 2) * 0.15);
      }
      flagGeo.computeVertexNormals();
      const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({
        color: flagColor, side: THREE.DoubleSide, roughness: 0.6,
      }));
      flag.position.set(fx + 1, fx === 0 ? 17.4 : 22.4, fz);
      g.add(flag);
    }

    // Moat (water ring around castle)
    const moat = new THREE.Mesh(
      new THREE.RingGeometry(6, 8, 32),
      new THREE.MeshStandardMaterial({ color: 0x224466, transparent: true, opacity: 0.6, roughness: 0.2 }),
    );
    moat.position.y = -0.3;
    moat.rotation.x = -Math.PI / 2;
    g.add(moat);

    // Drawbridge
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 3, 4, 1, 4), gateMat);
    bridge.position.set(0, -0.2, -8);
    g.add(bridge);

    // Drawbridge chains
    for (const cx of [-0.9, 0.9]) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4, 6), ironMat);
      chain.position.set(cx, 2, -6.5);
      chain.rotation.x = 0.5;
      g.add(chain);
    }

    g.scale.setScalar(scale);
    return g;
  }

  private _buildClouds(): void {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, transparent: true, opacity: 0.7, roughness: 1, metalness: 0,
    });
    const shadowMat = new THREE.MeshStandardMaterial({
      color: 0xccccdd, transparent: true, opacity: 0.5, roughness: 1, metalness: 0,
    });

    for (let i = 0; i < 40; i++) {
      const cloudGroup = new THREE.Group();
      const isLarge = Math.random() < 0.3;
      const puffCount = isLarge ? 10 + Math.floor(Math.random() * 8) : 5 + Math.floor(Math.random() * 6);
      const spread = isLarge ? 12 : 7;

      for (let j = 0; j < puffCount; j++) {
        const radius = (isLarge ? 3 : 2) + Math.random() * (isLarge ? 5 : 3);
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 16, 12),
          j < puffCount * 0.3 ? shadowMat : cloudMat, // bottom puffs are darker (shadow)
        );
        const px = (Math.random() - 0.5) * spread;
        const py = (Math.random() - 0.5) * (isLarge ? 3 : 1.5);
        const pz = (Math.random() - 0.5) * (spread * 0.7);
        puff.position.set(px, py, pz);
        puff.scale.y = 0.35 + Math.random() * 0.25; // flat
        puff.scale.x = 0.8 + Math.random() * 0.5;
        puff.scale.z = 0.8 + Math.random() * 0.4;
        cloudGroup.add(puff);
      }

      // Add wispy tendrils hanging below large clouds
      if (isLarge) {
        for (let w = 0; w < 3; w++) {
          const wisp = new THREE.Mesh(
            new THREE.SphereGeometry(1.5 + Math.random() * 2, 10, 8),
            new THREE.MeshStandardMaterial({
              color: 0xeeeeff, transparent: true, opacity: 0.3, roughness: 1,
            }),
          );
          wisp.position.set(
            (Math.random() - 0.5) * 8,
            -2 - Math.random() * 2,
            (Math.random() - 0.5) * 5,
          );
          wisp.scale.y = 0.6;
          wisp.scale.x = 1.5;
          cloudGroup.add(wisp);
        }
      }

      cloudGroup.position.set(
        (Math.random() - 0.5) * 250,
        32 + Math.random() * 35,
        (Math.random() - 0.5) * 250,
      );

      this._scene.add(cloudGroup);
      this._clouds.push(cloudGroup as unknown as THREE.Mesh);
    }
  }

  private _buildTrees(): void {
    this._destructibleTrees = [];
    // Place trees on terrain
    for (let i = 0; i < 60; i++) {
      const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
      const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
      const h = this._getTerrainHeight(x, z);
      if (h < 1 || h > 10) continue; // only on mid-height terrain

      const tree = this._createTree();
      tree.position.set(x, h, z);
      tree.rotation.y = Math.random() * Math.PI * 2;
      const s = 0.7 + Math.random() * 0.6;
      tree.scale.setScalar(s);
      this._scene.add(tree);
      this._trees.push(tree);
      this._destructibleTrees.push({ group: tree, pos: new THREE.Vector3(x, h, z), alive: true });
    }
  }

  private _createTree(): THREE.Group {
    const g = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x337722, roughness: 0.8 });
    const darkLeafMat = new THREE.MeshStandardMaterial({ color: 0x2a5518, roughness: 0.8 });

    // Trunk (tapered, higher poly)
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.28, 2.2, 12, 4), trunkMat);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    g.add(trunk);

    // Root flares
    for (let r = 0; r < 4; r++) {
      const angle = (r / 4) * Math.PI * 2 + Math.random() * 0.5;
      const root = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.08, 0.6, 10),
        trunkMat,
      );
      root.position.set(Math.cos(angle) * 0.2, 0.15, Math.sin(angle) * 0.2);
      root.rotation.z = Math.cos(angle) * 0.8;
      root.rotation.x = Math.sin(angle) * 0.8;
      g.add(root);
    }

    // Branches (small cylinders reaching outward)
    for (let b = 0; b < 3; b++) {
      const bAngle = Math.random() * Math.PI * 2;
      const bHeight = 1.5 + Math.random() * 0.8;
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.05, 0.8, 10),
        trunkMat,
      );
      branch.position.set(Math.cos(bAngle) * 0.3, bHeight, Math.sin(bAngle) * 0.3);
      branch.rotation.z = Math.cos(bAngle) * 0.8;
      branch.rotation.x = Math.sin(bAngle) * 0.8;
      g.add(branch);
    }

    // Layered foliage (more layers, higher poly cones, variation in size)
    for (let i = 0; i < 5; i++) {
      const radius = 1.6 - i * 0.25;
      const height = 1.4 - i * 0.1;
      const mat = i % 2 === 0 ? leafMat : darkLeafMat;
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, 12, 2),
        mat,
      );
      leaf.position.y = 2.0 + i * 0.65;
      leaf.rotation.y = i * 0.5; // offset each layer
      leaf.castShadow = true;
      g.add(leaf);
    }

    // Top tuft
    const tuft = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 14, 14),
      leafMat,
    );
    tuft.position.y = 2.0 + 5 * 0.65 + 0.2;
    g.add(tuft);

    return g;
  }

  private _buildBanners(): void {
    // Place banners/standards on terrain peaks
    for (let i = 0; i < 8; i++) {
      const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.6;
      const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.6;
      const h = this._getTerrainHeight(x, z);
      if (h < 4) continue;

      const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 10), poleMat);
      pole.position.set(x, h + 1.5, z);
      this._scene.add(pole);

      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 0.7),
        new THREE.MeshStandardMaterial({
          color: TEAM_COLORS[i % TEAM_COLORS.length],
          side: THREE.DoubleSide,
          roughness: 0.5,
        }),
      );
      banner.position.set(x + 0.5, h + 2.7, z);
      this._scene.add(banner);
      this._banners.push(banner);
    }
  }

  private _buildRocks(): void {
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
      const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
      const h = this._getTerrainHeight(x, z);
      if (h < WATER_LEVEL + 0.3) continue;

      const rockGeo = new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.6, 2);
      // Slightly randomize vertices for natural look
      const pos = rockGeo.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        pos.setX(j, pos.getX(j) + (Math.random() - 0.5) * 0.15);
        pos.setY(j, pos.getY(j) * (0.5 + Math.random() * 0.5));
        pos.setZ(j, pos.getZ(j) + (Math.random() - 0.5) * 0.15);
      }
      rockGeo.computeVertexNormals();

      const rock = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.4 + Math.random() * 0.15, 0.38 + Math.random() * 0.12, 0.33 + Math.random() * 0.1),
        roughness: 0.95,
      }));
      rock.position.set(x, h, z);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      this._scene.add(rock);
    }
  }

  /* ═══════════ grass & flowers ═══════════ */

  private _buildGrassAndFlowers(): void {
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x44882a, roughness: 0.9, side: THREE.DoubleSide,
    });

    // Grass tufts on flat areas
    for (let i = 0; i < 300; i++) {
      const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.7;
      const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.7;
      const h = this._getTerrainHeight(x, z);
      if (h < 1 || h > 8) continue;

      // Check slope is gentle
      const normal = this._getTerrainNormal(x, z);
      if (normal.y < 0.85) continue;

      const tuft = new THREE.Group();
      const bladeCount = 3 + Math.floor(Math.random() * 4);
      for (let b = 0; b < bladeCount; b++) {
        const bladeGeo = new THREE.PlaneGeometry(0.06, 0.3 + Math.random() * 0.2, 1, 3);
        const blade = new THREE.Mesh(bladeGeo, grassMat);
        blade.position.set((Math.random() - 0.5) * 0.15, 0.15, (Math.random() - 0.5) * 0.15);
        blade.rotation.y = Math.random() * Math.PI;
        blade.rotation.x = (Math.random() - 0.5) * 0.3;
        tuft.add(blade);
      }
      tuft.position.set(x, h, z);
      this._scene.add(tuft);
    }

    // Wildflowers
    const flowerColors = [0xff4466, 0xffdd44, 0xaa44ff, 0xff8844, 0x4488ff, 0xffffff];
    for (let i = 0; i < 80; i++) {
      const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.6;
      const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.6;
      const h = this._getTerrainHeight(x, z);
      if (h < 2 || h > 7) continue;

      const normal = this._getTerrainNormal(x, z);
      if (normal.y < 0.9) continue;

      const flower = new THREE.Group();

      // Stem
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.015, 0.25, 8),
        new THREE.MeshStandardMaterial({ color: 0x338822 }),
      );
      stem.position.y = 0.125;
      flower.add(stem);

      // Petals (tiny colored circle)
      const petalColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      const petals = new THREE.Mesh(
        new THREE.CircleGeometry(0.04, 12),
        new THREE.MeshStandardMaterial({ color: petalColor, side: THREE.DoubleSide }),
      );
      petals.position.y = 0.27;
      petals.rotation.x = -Math.PI / 4;
      flower.add(petals);

      // Center
      const center = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffee44 }),
      );
      center.position.y = 0.27;
      flower.add(center);

      flower.position.set(x, h, z);
      flower.rotation.y = Math.random() * Math.PI * 2;
      this._scene.add(flower);
    }
  }

  /* ═══════════ distant mountains ═══════════ */

  private _buildMountains(): void {
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x556677, roughness: 0.95, metalness: 0.05,
    });
    const darkRockMat = new THREE.MeshStandardMaterial({
      color: 0x445566, roughness: 0.95,
    });
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeff, roughness: 0.8,
    });

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const dist = 125 + Math.random() * 35;
      const height = 22 + Math.random() * 30;
      const width = 16 + Math.random() * 22;

      const mountain = new THREE.Group();

      // Main peak (high-poly with vertex displacement for rocky surface)
      const peakGeo = new THREE.ConeGeometry(width, height, 16, 8);
      const peakPos = peakGeo.attributes.position;
      for (let v = 0; v < peakPos.count; v++) {
        const vy = peakPos.getY(v);
        const heightRatio = (vy + height / 2) / height;
        const displacement = (1 - heightRatio) * 2 * (Math.sin(v * 17.3) * 0.5 + 0.5);
        peakPos.setX(v, peakPos.getX(v) + (Math.sin(v * 7.1) - 0.5) * displacement);
        peakPos.setZ(v, peakPos.getZ(v) + (Math.cos(v * 11.3) - 0.5) * displacement);
      }
      peakGeo.computeVertexNormals();
      const peak = new THREE.Mesh(peakGeo, mountainMat);
      peak.position.y = height / 2 - 5;
      peak.castShadow = true;
      mountain.add(peak);

      // Snow cap (high-poly)
      const snowCap = new THREE.Mesh(
        new THREE.ConeGeometry(width * 0.35, height * 0.25, 16, 4),
        snowMat,
      );
      snowCap.position.y = height * 0.75 - 5;
      mountain.add(snowCap);

      // Sub-peaks (more of them, higher poly, with displaced vertices)
      for (let j = 0; j < 4; j++) {
        const subH = height * (0.3 + Math.random() * 0.35);
        const subW = width * (0.3 + Math.random() * 0.35);
        const subGeo = new THREE.ConeGeometry(subW, subH, 12, 6);
        const subPos = subGeo.attributes.position;
        for (let v = 0; v < subPos.count; v++) {
          const vy = subPos.getY(v);
          const hr = (vy + subH / 2) / subH;
          const disp = (1 - hr) * 1.5 * (Math.sin(v * 13.7 + j * 50) * 0.5 + 0.5);
          subPos.setX(v, subPos.getX(v) + (Math.sin(v * 9.3 + j * 30) - 0.5) * disp);
          subPos.setZ(v, subPos.getZ(v) + (Math.cos(v * 7.7 + j * 20) - 0.5) * disp);
        }
        subGeo.computeVertexNormals();
        const sub = new THREE.Mesh(subGeo, j % 2 === 0 ? mountainMat : darkRockMat);
        sub.position.set(
          (Math.random() - 0.5) * width * 0.7,
          subH / 2 - 5,
          (Math.random() - 0.5) * width * 0.5,
        );
        sub.castShadow = true;
        mountain.add(sub);

        // Sub-peak snow cap
        if (subH > height * 0.4) {
          const subSnow = new THREE.Mesh(
            new THREE.ConeGeometry(subW * 0.3, subH * 0.2, 10, 2),
            snowMat,
          );
          subSnow.position.set(sub.position.x, sub.position.y + subH * 0.35, sub.position.z);
          mountain.add(subSnow);
        }
      }

      // Foothills (wider, shorter mounds at base)
      for (let f = 0; f < 5; f++) {
        const fh = 3 + Math.random() * 8;
        const fw = 6 + Math.random() * 12;
        const fhGeo = new THREE.ConeGeometry(fw, fh, 12, 4);
        // Displace foothills for organic shape
        const fhPos = fhGeo.attributes.position;
        for (let v = 0; v < fhPos.count; v++) {
          const vy = fhPos.getY(v);
          const hr = (vy + fh / 2) / fh;
          const d = (1 - hr) * 1.0 * (Math.sin(v * 11 + f * 40) * 0.5 + 0.5);
          fhPos.setX(v, fhPos.getX(v) + (Math.sin(v * 5 + f * 20) - 0.5) * d);
          fhPos.setZ(v, fhPos.getZ(v) + (Math.cos(v * 7 + f * 30) - 0.5) * d);
        }
        fhGeo.computeVertexNormals();
        const foothill = new THREE.Mesh(fhGeo, f % 3 === 0 ? darkRockMat : mountainMat);
        foothill.position.set(
          (Math.random() - 0.5) * width * 0.9,
          fh / 2 - 5,
          (Math.random() - 0.5) * width * 0.7,
        );
        foothill.castShadow = true;
        mountain.add(foothill);
      }

      // Ridge lines (thin walls of rock connecting peaks)
      for (let r = 0; r < 2; r++) {
        const ridgeAngle = Math.random() * Math.PI;
        const ridgeLen = width * 0.4 + Math.random() * width * 0.3;
        const ridgeH = height * 0.3 + Math.random() * height * 0.2;
        const ridgeGeo = new THREE.BoxGeometry(ridgeLen, ridgeH, 0.8, 6, 4, 1);
        // Curve ridge
        const ridgeP = ridgeGeo.attributes.position;
        for (let v = 0; v < ridgeP.count; v++) {
          const rx = ridgeP.getX(v);
          const ry = ridgeP.getY(v);
          ridgeP.setY(v, ry - Math.abs(rx) * 0.3);
          ridgeP.setZ(v, ridgeP.getZ(v) + Math.sin(rx * 0.5) * 0.5);
        }
        ridgeGeo.computeVertexNormals();
        const ridge = new THREE.Mesh(ridgeGeo, darkRockMat);
        ridge.position.set(0, ridgeH * 0.3 - 3, 0);
        ridge.rotation.y = ridgeAngle;
        ridge.castShadow = true;
        mountain.add(ridge);
      }

      // Scree/talus fields (scattered rock debris at base)
      for (let sc = 0; sc < 8; sc++) {
        const scAngle = Math.random() * Math.PI * 2;
        const scDist = width * 0.5 + Math.random() * width * 0.3;
        const screeGeo = new THREE.DodecahedronGeometry(0.5 + Math.random() * 1.5, 1);
        const screePos = screeGeo.attributes.position;
        for (let v = 0; v < screePos.count; v++) {
          screePos.setY(v, screePos.getY(v) * (0.3 + Math.random() * 0.3));
        }
        screeGeo.computeVertexNormals();
        const scree = new THREE.Mesh(screeGeo, new THREE.MeshStandardMaterial({
          color: new THREE.Color(0.35 + Math.random() * 0.1, 0.33 + Math.random() * 0.08, 0.3 + Math.random() * 0.08),
          roughness: 0.95,
        }));
        scree.position.set(Math.cos(scAngle) * scDist, -4, Math.sin(scAngle) * scDist);
        mountain.add(scree);
      }

      // Pine trees on lower slopes
      const treeMat = new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.9 });
      const trunkMat2 = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 });
      for (let t = 0; t < 6; t++) {
        const tAngle = Math.random() * Math.PI * 2;
        const tDist = width * 0.35 + Math.random() * width * 0.2;
        const treeG = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.5, 8), trunkMat2);
        trunk.position.y = 0.75;
        treeG.add(trunk);
        for (let l = 0; l < 4; l++) {
          const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.8 - l * 0.15, 1.2, 8), treeMat);
          leaf.position.y = 1.5 + l * 0.5;
          treeG.add(leaf);
        }
        treeG.position.set(Math.cos(tAngle) * tDist, -3 + Math.random() * 2, Math.sin(tAngle) * tDist);
        const tScale = 0.8 + Math.random() * 0.6;
        treeG.scale.setScalar(tScale);
        mountain.add(treeG);
      }

      mountain.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      this._scene.add(mountain);
    }
  }

  /* ═══════════ particle system ═══════════ */

  private _buildParticleSystem(): void {
    const maxParticles = 2000;
    this._particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);
    this._particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this._particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this._particleGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const particleMat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.3,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });

    this._particleSystem = new THREE.Points(this._particleGeo, particleMat);
    this._scene.add(this._particleSystem);
  }

  /* ═══════════ worms (characters) ═══════════ */

  private _createWorm(name: string, teamIndex: number, x: number, z: number): Worm {
    const mesh = new THREE.Group();

    const teamColor = TEAM_COLORS[teamIndex];
    const teamColorObj = new THREE.Color(teamColor);
    const darkerTeam = teamColorObj.clone().multiplyScalar(0.6);
    const bodyMat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.5, metalness: 0.2 });
    const bodyDarkMat = new THREE.MeshStandardMaterial({ color: darkerTeam, roughness: 0.5, metalness: 0.2 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.6 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.3, metalness: 0.7 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xddaa44, roughness: 0.3, metalness: 0.8 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.85 });

    // Body (armored torso with chest plate — high-poly)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.9, 16, 4), bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    mesh.add(body);

    // Chest plate (front armor detail)
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.08, 3, 3, 1), metalMat);
    chestPlate.position.set(0, 0.6, 0.2);
    mesh.add(chestPlate);

    // Chest plate rivets
    for (const ry of [-0.15, 0, 0.15]) {
      for (const rx of [-0.15, 0.15]) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 10), goldMat);
        rivet.position.set(rx, 0.6 + ry, 0.245);
        mesh.add(rivet);
      }
    }

    // Belt
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 8, 24), leatherMat);
    belt.position.y = 0.2;
    belt.rotation.x = Math.PI / 2;
    mesh.add(belt);

    // Belt buckle (detailed)
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.04, 2, 2, 1), goldMat);
    buckle.position.set(0, 0.2, 0.38);
    mesh.add(buckle);

    // Shoulder guards (pauldrons — high-poly)
    for (const side of [-1, 1]) {
      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
        metalMat,
      );
      pauldron.position.set(side * 0.42, 1.0, 0);
      pauldron.rotation.z = side * 0.4;
      mesh.add(pauldron);

      // Pauldron rim
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 8, 20), goldMat);
      rim.position.set(side * 0.42, 0.98, 0);
      rim.rotation.x = Math.PI / 2;
      rim.rotation.z = side * 0.4;
      mesh.add(rim);

      // Pauldron edge plates (layered)
      const edgePlate = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.4),
        bodyMat,
      );
      edgePlate.position.set(side * 0.42, 0.93, 0);
      edgePlate.rotation.z = side * 0.4;
      mesh.add(edgePlate);
    }

    // Head (high-poly)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), skinMat);
    head.position.y = 1.2;
    head.castShadow = true;
    mesh.add(head);

    // Helmet (great helm style — high-poly)
    const helmetBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.32, 0.35, 20, 4),
      metalMat,
    );
    helmetBody.position.y = 1.32;
    mesh.add(helmetBody);

    // Helmet top (rounded — high-poly)
    const helmetTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.29, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      metalMat,
    );
    helmetTop.position.y = 1.49;
    helmetTop.castShadow = true;
    mesh.add(helmetTop);

    // Helmet nose guard (detailed)
    const noseGuard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.12, 2, 3, 2), metalMat);
    noseGuard.position.set(0, 1.25, 0.3);
    mesh.add(noseGuard);

    // Visor slit (detailed)
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.06), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    visor.position.set(0, 1.2, 0.3);
    mesh.add(visor);

    // Helmet decoration (team-specific)
    if (teamIndex === 0) {
      // Team 0 (Blue/Round Table): Feathered plume
      const plumeColor = teamColorObj.clone().lerp(new THREE.Color(0xffffff), 0.3);
      const plumeMat = new THREE.MeshStandardMaterial({ color: plumeColor, roughness: 0.7 });
      for (let i = 0; i < 8; i++) {
        const featherGeo = new THREE.BoxGeometry(0.035, 0.28 - i * 0.02, 0.06, 1, 3, 1);
        const fp = featherGeo.attributes.position;
        for (let v = 0; v < fp.count; v++) {
          const fy = fp.getY(v);
          fp.setZ(v, fp.getZ(v) - fy * fy * 0.5);
        }
        featherGeo.computeVertexNormals();
        const feather = new THREE.Mesh(featherGeo, plumeMat);
        feather.position.set(0, 1.62 + i * 0.04, -0.03 - i * 0.03);
        feather.rotation.x = -0.3 - i * 0.06;
        mesh.add(feather);
      }
    } else if (teamIndex === 1) {
      // Team 1 (Red/Mordred): Horns
      const hornMat = new THREE.MeshStandardMaterial({ color: 0x881111, roughness: 0.5, metalness: 0.3 });
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 8), hornMat);
        horn.position.set(side * 0.18, 1.55, 0);
        horn.rotation.z = side * -0.5;
        mesh.add(horn);
      }
    } else if (teamIndex === 2) {
      // Team 2 (Green/Merlin): Wizard hat point with gold star
      const wizardMat = new THREE.MeshStandardMaterial({ color: 0x6633aa, roughness: 0.5 });
      const hatPoint = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 10), wizardMat);
      hatPoint.position.set(0, 1.65, 0);
      mesh.add(hatPoint);
      const starMat = new THREE.MeshStandardMaterial({ color: 0xddaa44, roughness: 0.3, metalness: 0.8, emissive: 0x665522 });
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), starMat);
      star.position.set(0, 1.82, 0);
      mesh.add(star);
    } else if (teamIndex === 3) {
      // Team 3 (Orange/Grail): Wings on helm sides
      const wingMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5, side: THREE.DoubleSide });
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.12), wingMat);
        wing.position.set(side * 0.22, 1.50, 0);
        wing.rotation.y = side * 0.6;
        wing.rotation.z = side * -0.3;
        mesh.add(wing);
      }
    }

    // Helmet gold trim (high-poly)
    const helmetTrim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.018, 8, 24), goldMat);
    helmetTrim.position.y = 1.15;
    helmetTrim.rotation.x = Math.PI / 2;
    mesh.add(helmetTrim);

    // Second trim at top
    const helmetTrim2 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.012, 6, 20), goldMat);
    helmetTrim2.position.y = 1.49;
    helmetTrim2.rotation.x = Math.PI / 2;
    mesh.add(helmetTrim2);

    // Eyes (visible through visor slit — glowing, high-poly)
    for (const side of [-0.07, 0.07]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      eye.position.set(side, 1.2, 0.32);
      mesh.add(eye);
    }

    // Arms with gauntlets (high-poly)
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.4, 12, 3), bodyMat);
      arm.position.set(side * 0.48, 0.8, 0);
      arm.rotation.z = side * 0.3;
      mesh.add(arm);

      // Elbow guard
      const elbowGuard = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), metalMat);
      elbowGuard.position.set(side * 0.52, 0.68, 0);
      mesh.add(elbowGuard);

      // Forearm (gauntlet — high-poly)
      const gauntlet = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.25, 12, 3), metalMat);
      gauntlet.position.set(side * 0.55, 0.55, 0);
      gauntlet.rotation.z = side * 0.15;
      mesh.add(gauntlet);

      // Gauntlet flare
      const flare = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 12), goldMat);
      flare.position.set(side * 0.54, 0.43, 0);
      flare.rotation.x = Math.PI / 2;
      mesh.add(flare);

      // Hand (high-poly)
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), skinMat);
      hand.position.set(side * 0.58, 0.42, 0);
      mesh.add(hand);
    }

    // Legs with greaves (high-poly)
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.35, 12, 3), bodyDarkMat);
      leg.position.set(side * 0.15, 0.18, 0);
      mesh.add(leg);

      // Knee guard
      const kneeGuard = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), metalMat);
      kneeGuard.position.set(side * 0.15, 0.28, 0.06);
      kneeGuard.scale.z = 0.6;
      mesh.add(kneeGuard);

      // Greave (shin armor — high-poly)
      const greave = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.22, 12, 3), metalMat);
      greave.position.set(side * 0.15, 0.08, 0.04);
      mesh.add(greave);

      // Boot (more detailed, higher poly)
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.26, 2, 2, 2), leatherMat);
      boot.position.set(side * 0.15, -0.02, 0.04);
      mesh.add(boot);

      // Boot toe (high-poly)
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), leatherMat);
      toe.position.set(side * 0.15, -0.02, 0.17);
      toe.scale.y = 0.5;
      mesh.add(toe);

      // Boot strap
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.01, 4, 12), leatherMat);
      strap.position.set(side * 0.15, 0.01, 0.04);
      strap.rotation.x = Math.PI / 2;
      mesh.add(strap);
    }

    // Cape (flowing from shoulders — higher poly for smoother wave)
    const capeMat = new THREE.MeshStandardMaterial({
      color: teamColor, roughness: 0.6, side: THREE.DoubleSide,
    });
    const capeGeo = new THREE.PlaneGeometry(0.7, 0.85, 4, 8);
    const capePositions = capeGeo.attributes.position;
    for (let i = 0; i < capePositions.count; i++) {
      const y = capePositions.getY(i);
      const x = capePositions.getX(i);
      capePositions.setZ(i, capePositions.getZ(i) - Math.pow(Math.abs(y), 1.5) * 0.3 - Math.abs(x) * 0.05);
    }
    capeGeo.computeVertexNormals();
    const cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(0, 0.6, -0.25);
    cape.name = "cape";
    mesh.add(cape);

    // Cape clasp (gold fastener at neck)
    const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), goldMat);
    clasp.position.set(0, 1.0, -0.18);
    mesh.add(clasp);

    // Heraldic shield (high-poly with team emblem)
    const shieldGroup = new THREE.Group();
    // Shield body (heater shape — higher-poly circle)
    const shieldBody = new THREE.Mesh(
      new THREE.CircleGeometry(0.24, 16),
      new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.5, metalness: 0.3 }),
    );
    shieldGroup.add(shieldBody);

    // Shield boss (center knob — high-poly)
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), goldMat);
    boss.position.z = 0.02;
    shieldGroup.add(boss);

    // Shield rim (high-poly)
    const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.018, 8, 24), goldMat);
    shieldGroup.add(shieldRim);

    // Inner rim
    const innerRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.01, 6, 20), goldMat);
    innerRim.position.z = 0.005;
    shieldGroup.add(innerRim);

    // Team-specific shield emblem
    if (teamIndex === 0) {
      // Team 0: White cross
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.01, 1, 3, 1),
        new THREE.MeshStandardMaterial({ color: 0xffffff }));
      crossV.position.z = 0.01;
      shieldGroup.add(crossV);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.01, 3, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xffffff }));
      crossH.position.set(0, 0.03, 0.01);
      shieldGroup.add(crossH);
    } else if (teamIndex === 1) {
      // Team 1: Red diagonal X (two crossing bars)
      const xMat = new THREE.MeshStandardMaterial({ color: 0xcc2222 });
      const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.25, 0.01, 1, 3, 1), xMat);
      bar1.position.z = 0.01;
      bar1.rotation.z = Math.PI / 4;
      shieldGroup.add(bar1);
      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.25, 0.01, 1, 3, 1), xMat);
      bar2.position.z = 0.01;
      bar2.rotation.z = -Math.PI / 4;
      shieldGroup.add(bar2);
    } else if (teamIndex === 2) {
      // Team 2: Green gem in center
      const gemMat = new THREE.MeshStandardMaterial({ color: 0x22bb44, roughness: 0.2, metalness: 0.5, emissive: 0x115522 });
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), gemMat);
      gem.position.z = 0.02;
      shieldGroup.add(gem);
    } else if (teamIndex === 3) {
      // Team 3: Gold cross
      const goldCrossMat = new THREE.MeshStandardMaterial({ color: 0xddaa44, roughness: 0.3, metalness: 0.7 });
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.01, 1, 3, 1), goldCrossMat);
      crossV.position.z = 0.01;
      shieldGroup.add(crossV);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.01, 3, 1, 1), goldCrossMat);
      crossH.position.set(0, 0.03, 0.01);
      shieldGroup.add(crossH);
    }

    // Shield studs (corner rivets)
    for (const sx of [-0.12, 0.12]) {
      for (const sy of [-0.1, 0.12]) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 10), goldMat);
        stud.position.set(sx, sy, 0.015);
        shieldGroup.add(stud);
      }
    }

    shieldGroup.position.set(-0.55, 0.65, 0.15);
    shieldGroup.rotation.y = -0.5;
    mesh.add(shieldGroup);

    // Name label (sprite)
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.roundRect(0, 10, 256, 44, 8);
    ctx.fill();
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(name, 128, 42);

    const labelTex = new THREE.CanvasTexture(canvas);
    const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false });
    const label = new THREE.Sprite(labelMat);
    label.position.y = 2.0;
    label.scale.set(2, 0.5, 1);
    mesh.add(label);

    // HP bar background
    const hpBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.15),
      new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.7, depthWrite: false }),
    );
    hpBarBg.position.y = 1.7;
    hpBarBg.name = "hpBarBg";
    mesh.add(hpBarBg);

    // HP bar fill
    const hpBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.13),
      new THREE.MeshBasicMaterial({ color: 0x44dd44, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    hpBarFill.position.y = 1.7;
    hpBarFill.position.z = 0.001;
    hpBarFill.name = "hpBarFill";
    mesh.add(hpBarFill);

    const terrainH = this._getTerrainHeight(x, z);
    const pos = new THREE.Vector3(x, terrainH + WORM_HEIGHT / 2, z);
    mesh.position.copy(pos);
    this._scene.add(mesh);

    return {
      name,
      teamIndex,
      hp: this._optStartHp,
      maxHp: this._optStartHp,
      mesh,
      pos: pos.clone(),
      vel: new THREE.Vector3(),
      onGround: true,
      alive: true,
      facing: 0,
      aimAngle: 0.3,
      grounded: true,
      fallDamageVel: 0,
      poisoned: 0,
      frozen: 0,
      doubleDamageNext: false,
    };
  }

  private _spawnWorms(): void {
    // Clear existing
    for (const w of this._worms) {
      this._scene.remove(w.mesh);
    }
    this._worms = [];
    this._currentWormIndices = new Array(this._teamCount).fill(0);

    for (let t = 0; t < this._teamCount; t++) {
      for (let i = 0; i < this._wormsPerTeam; i++) {
        // Find a suitable spawn position
        let x = 0, z = 0, h = -10;
        let attempts = 0;
        while (h < 2 && attempts < 100) {
          x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.5;
          z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.5;
          h = this._getTerrainHeight(x, z);
          attempts++;
        }
        const worm = this._createWorm(TEAM_NAMES[t][i], t, x, z);
        this._worms.push(worm);
      }
    }

    // Init ammo
    this._weaponAmmo = WEAPONS.map((w) => w.ammo);
  }

  /* ═══════════ terrain height & deformation ═══════════ */

  private _getTerrainHeight(worldX: number, worldZ: number): number {
    const res = TERRAIN_RES;
    const half = TERRAIN_SIZE / 2;
    const tx = ((worldX + half) / TERRAIN_SIZE) * res;
    const tz = ((worldZ + half) / TERRAIN_SIZE) * res;

    const ix = Math.floor(tx);
    const iz = Math.floor(tz);
    if (ix < 0 || ix >= res || iz < 0 || iz >= res) return WATER_LEVEL - 5;

    const fx = tx - ix;
    const fz = tz - iz;

    const idx00 = iz * (res + 1) + ix;
    const idx10 = iz * (res + 1) + ix + 1;
    const idx01 = (iz + 1) * (res + 1) + ix;
    const idx11 = (iz + 1) * (res + 1) + ix + 1;

    const h00 = this._heightData[idx00] ?? 0;
    const h10 = this._heightData[idx10] ?? 0;
    const h01 = this._heightData[idx01] ?? 0;
    const h11 = this._heightData[idx11] ?? 0;

    const hx0 = h00 + fx * (h10 - h00);
    const hx1 = h01 + fx * (h11 - h01);
    const result = hx0 + fz * (hx1 - hx0);
    return isNaN(result) ? 0 : result;
  }

  private _deformTerrain(cx: number, cz: number, radius: number, depth: number): void {
    const res = TERRAIN_RES;
    const half = TERRAIN_SIZE / 2;
    const cellSize = TERRAIN_SIZE / res;

    const minX = Math.max(0, Math.floor(((cx - radius + half) / TERRAIN_SIZE) * res) - 1);
    const maxX = Math.min(res, Math.ceil(((cx + radius + half) / TERRAIN_SIZE) * res) + 1);
    const minZ = Math.max(0, Math.floor(((cz - radius + half) / TERRAIN_SIZE) * res) - 1);
    const maxZ = Math.min(res, Math.ceil(((cz + radius + half) / TERRAIN_SIZE) * res) + 1);

    const positions = this._terrainGeo.attributes.position;

    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const worldX = (x / res) * TERRAIN_SIZE - half;
        const worldZ = (z / res) * TERRAIN_SIZE - half;
        const dx = worldX - cx;
        const dz = worldZ - cz;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < radius) {
          const factor = 1 - (dist / radius);
          const crater = depth * factor * factor; // smooth falloff
          const idx = z * (res + 1) + x;
          this._heightData[idx] -= crater;
          if (isNaN(this._heightData[idx])) this._heightData[idx] = 0;
          positions.setY(idx, this._heightData[idx]);
        }
      }
    }

    positions.needsUpdate = true;
    this._terrainGeo.computeVertexNormals();
    this._terrainGeo.computeBoundingSphere();
    this._terrainNeedsUpdate = true;
  }

  private _getTerrainNormal(wx: number, wz: number): THREE.Vector3 {
    const d = 0.5;
    const hL = this._getTerrainHeight(wx - d, wz);
    const hR = this._getTerrainHeight(wx + d, wz);
    const hU = this._getTerrainHeight(wx, wz - d);
    const hD = this._getTerrainHeight(wx, wz + d);
    const n = new THREE.Vector3(hL - hR, 2 * d, hU - hD).normalize();
    return n;
  }

  /* ═══════════ HUD ═══════════ */

  private _initHUD(): void {
    this._hudContainer = document.createElement("div");
    this._hudContainer.id = "worms3d-hud";
    this._hudContainer.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 51; font-family: 'Segoe UI', Arial, sans-serif;
    `;
    document.body.appendChild(this._hudContainer);

    // Crosshair
    this._crosshair = document.createElement("div");
    this._crosshair.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 30px; height: 30px; display: none;
    `;
    this._crosshair.innerHTML = `
      <svg width="30" height="30" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r="10" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"/>
        <line x1="15" y1="2" x2="15" y2="8" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"/>
        <line x1="15" y1="22" x2="15" y2="28" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"/>
        <line x1="2" y1="15" x2="8" y2="15" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"/>
        <line x1="22" y1="15" x2="28" y2="15" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"/>
        <circle cx="15" cy="15" r="2" fill="rgba(255,50,50,0.9)"/>
      </svg>
    `;
    this._hudContainer.appendChild(this._crosshair);

    // Weapon select panel
    this._weaponPanel = document.createElement("div");
    this._weaponPanel.style.cssText = `
      position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: rgba(10, 10, 20, 0.88); border: 2px solid rgba(200, 170, 100, 0.6);
      border-radius: 12px; padding: 12px; display: none; pointer-events: auto;
      max-width: 90vw; backdrop-filter: blur(8px);
    `;
    this._hudContainer.appendChild(this._weaponPanel);

    // Teleport marker
    const markerGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 24);
    this._teleportMarker = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6 }));
    this._teleportMarker.visible = false;
    this._scene.add(this._teleportMarker);
  }

  private _renderHUD(): void {
    // Remove old HUD elements except weapon panel, crosshair, title
    const oldEls = this._hudContainer.querySelectorAll(".hud-dynamic");
    oldEls.forEach((el) => el.remove());

    if (this._phase === "title" || this._phase === "victory") {
      if (this._minimapCanvas) this._minimapCanvas.style.display = "none";
      return;
    }
    if (this._minimapCanvas) this._minimapCanvas.style.display = "block";

    const currentWorm = this._getCurrentWorm();

    // Top bar: turn info, wind, timer
    const topBar = document.createElement("div");
    topBar.className = "hud-dynamic";
    topBar.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%;
      background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%);
      padding: 10px 20px; display: flex; justify-content: space-between; align-items: center;
      color: white; font-size: 16px;
    `;

    const teamColor = currentWorm ? `#${TEAM_COLORS[currentWorm.teamIndex].toString(16).padStart(6, "0")}` : "#fff";

    topBar.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:22px;font-weight:bold;color:${teamColor};text-shadow:0 0 10px ${teamColor};">
          ${currentWorm ? `${currentWorm.name}'s Turn` : ""}
        </div>
        <div style="font-size:14px;color:#ccc;">Round ${this._roundNumber}</div>
        ${this._suddenDeath ? '<div style="color:#ff4444;font-weight:bold;animation:pulse 0.5s infinite alternate;">⚠ SUDDEN DEATH ⚠</div>' : ""}
      </div>
      <div style="display:flex;align-items:center;gap:20px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:12px;color:#aaa;">WIND</span>
          ${this._renderWindIndicator()}
        </div>
        <div style="font-size:28px;font-weight:bold;color:${this._turnTimer < 10 ? "#ff4444" : "#ffdd44"};font-variant-numeric:tabular-nums;">
          ${Math.ceil(this._turnTimer)}
        </div>
      </div>
    `;
    this._hudContainer.appendChild(topBar);

    // Current weapon display
    if (currentWorm && this._phase !== "weapon_select") {
      const weaponBar = document.createElement("div");
      weaponBar.className = "hud-dynamic";
      weaponBar.style.cssText = `
        position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%);
        background: rgba(10, 10, 20, 0.85); border: 2px solid rgba(200, 170, 100, 0.5);
        border-radius: 10px; padding: 8px 20px; display: flex; align-items: center; gap: 15px;
        color: white; font-size: 15px; backdrop-filter: blur(6px);
      `;
      const w = WEAPONS[this._selectedWeaponIndex];
      const ammo = this._weaponAmmo[this._selectedWeaponIndex];
      weaponBar.innerHTML = `
        <span style="font-size:24px;">${w.icon}</span>
        <span style="font-weight:bold;font-size:17px;">${w.name}</span>
        <span style="color:#aaa;font-size:13px;">${ammo === -1 ? "∞" : `×${ammo}`}</span>
        <span style="color:#888;font-size:12px;">| Right-click: weapon menu</span>
      `;
      this._hudContainer.appendChild(weaponBar);
    }

    // Power bar (when aiming)
    if (this._phase === "aiming" && currentWorm) {
      const powerBar = document.createElement("div");
      powerBar.className = "hud-dynamic";
      powerBar.style.cssText = `
        position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%);
        width: 200px; height: 14px; background: rgba(0,0,0,0.6); border-radius: 7px;
        border: 1px solid rgba(255,255,255,0.3); overflow: hidden;
      `;
      const fill = document.createElement("div");
      const powerPct = this._aimPower * 100;
      const hue = 120 - powerPct * 1.2; // green→red
      fill.style.cssText = `
        width: ${powerPct}%; height: 100%; background: hsl(${hue}, 80%, 50%);
        border-radius: 7px; transition: width 0.05s;
        box-shadow: 0 0 8px hsl(${hue}, 80%, 50%);
      `;
      powerBar.appendChild(fill);
      this._hudContainer.appendChild(powerBar);
    }

    // Team HP panels (sides)
    for (let t = 0; t < this._teamCount; t++) {
      const teamWorms = this._worms.filter((w) => w.teamIndex === t);
      const panel = document.createElement("div");
      panel.className = "hud-dynamic";
      // Position: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
      const positions = [
        "top: 70px; left: 15px",
        "top: 70px; right: 15px",
        "bottom: 80px; left: 15px",
        "bottom: 80px; right: 15px",
      ];
      panel.style.cssText = `
        position: absolute; ${positions[t] || positions[0]};
        background: rgba(10, 10, 20, 0.75); border-radius: 10px; padding: 10px;
        border: 1px solid rgba(${this._hexToRgb(TEAM_COLORS[t])}, 0.5);
        min-width: 140px; backdrop-filter: blur(4px);
      `;

      const isAI = this._aiControlled[t];
      const isEliminated = this._eliminatedTeams.has(t);
      const humanCount = this._humanTeams.filter(Boolean).length;
      const teamTag = isAI ? "AI" : humanCount > 1 ? `P${this._humanTeams.slice(0, t + 1).filter(Boolean).length}` : "You";
      const teamLabel = isEliminated ? `Team ${t + 1} (OUT)` : `Team ${t + 1} (${teamTag})`;
      let html = `<div style="color:#${TEAM_COLORS[t].toString(16).padStart(6, "0")};font-weight:bold;font-size:14px;margin-bottom:6px;text-align:center;">
        ${teamLabel}</div>`;
      for (const w of teamWorms) {
        const hpPct = Math.max(0, (w.hp / w.maxHp) * 100);
        const hpColor = hpPct > 50 ? "#44dd44" : hpPct > 25 ? "#ddaa22" : "#dd3333";
        html += `<div style="margin:3px 0;${w.alive ? "" : "opacity:0.3;"}">
          <div style="display:flex;justify-content:space-between;color:#ddd;font-size:12px;">
            <span>${w.name}${w.poisoned > 0 ? " ☠" : ""}${w.frozen > 0 ? " ❄" : ""}</span><span style="color:${hpColor}">${Math.max(0, Math.round(w.hp))}</span>
          </div>
          <div style="height:4px;background:rgba(0,0,0,0.5);border-radius:2px;margin-top:2px;">
            <div style="width:${hpPct}%;height:100%;background:${hpColor};border-radius:2px;"></div>
          </div>
        </div>`;
      }
      panel.innerHTML = html;
      this._hudContainer.appendChild(panel);
    }

    // Aim direction indicator (arrow showing aim angle)
    if ((this._phase === "aiming" || this._phase === "playing") && currentWorm) {
      this._crosshair.style.display = "block";
    } else {
      this._crosshair.style.display = "none";
    }

    // Loading tip during camera pan
    if (this._phase === "camera_pan" && this._currentTip) {
      const tipEl = document.createElement("div");
      tipEl.className = "hud-dynamic";
      tipEl.style.cssText = `
        position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%);
        background: rgba(10,10,20,0.7); border: 1px solid rgba(200,170,100,0.3);
        border-radius: 8px; padding: 8px 16px; color: #ccbb88; font-size: 13px;
        font-style: italic; pointer-events: none; max-width: 400px; text-align: center;
      `;
      tipEl.textContent = `Tip: ${this._currentTip}`;
      this._hudContainer.appendChild(tipEl);
    }

    // Sprint energy bar
    if (this._sprintEnergy < 1 && (this._phase === "playing" || this._phase === "retreat")) {
      const sprintBar = document.createElement("div");
      sprintBar.className = "hud-dynamic";
      sprintBar.style.cssText = `
        position: absolute; bottom: 75px; left: 50%; transform: translateX(-50%);
        width: 100px; height: 6px; background: rgba(0,0,0,0.5); border-radius: 3px;
      `;
      const sprintFill = document.createElement("div");
      sprintFill.style.cssText = `
        width: ${this._sprintEnergy * 100}%; height: 100%; background: #44ddff;
        border-radius: 3px; transition: width 0.1s;
      `;
      sprintBar.appendChild(sprintFill);
      this._hudContainer.appendChild(sprintBar);
    }

    // Free camera indicator
    if (this._freeCamera) {
      const freeCamEl = document.createElement("div");
      freeCamEl.className = "hud-dynamic";
      freeCamEl.style.cssText = `
        position: absolute; top: 55px; left: 50%; transform: translateX(-50%);
        color: #88ddff; font-size: 12px; pointer-events: none;
      `;
      freeCamEl.textContent = "FREE CAMERA (C to toggle)";
      this._hudContainer.appendChild(freeCamEl);
    }

    // Status effects on active worm
    if (currentWorm) {
      const statuses: string[] = [];
      if (currentWorm.poisoned > 0) statuses.push(`☠ Poisoned (${currentWorm.poisoned} turns)`);
      if (currentWorm.frozen > 0) statuses.push(`❄ Frozen (${currentWorm.frozen} turns)`);
      if (statuses.length > 0) {
        const statusEl = document.createElement("div");
        statusEl.className = "hud-dynamic";
        statusEl.style.cssText = `
          position: absolute; top: 55px; right: 180px;
          color: #ff8888; font-size: 12px; pointer-events: none; text-align: right;
        `;
        statusEl.innerHTML = statuses.join("<br>");
        this._hudContainer.appendChild(statusEl);
      }
    }
  }

  private _renderWindIndicator(): string {
    const strength = Math.abs(this._wind);
    const direction = this._wind >= 0 ? "→" : "←";
    const barCount = Math.ceil(strength * 5);
    const color = strength > 0.7 ? "#ff4444" : strength > 0.4 ? "#ffaa22" : "#44aaff";
    let bars = "";
    for (let i = 0; i < 5; i++) {
      bars += `<div style="width:6px;height:${8 + i * 2}px;background:${i < barCount ? color : "rgba(255,255,255,0.15)"};border-radius:2px;"></div>`;
    }
    return `<div style="display:flex;align-items:flex-end;gap:2px;">${this._wind < 0 ? `<span style="color:${color};font-size:18px;">${direction}</span>` : ""}${bars}${this._wind >= 0 ? `<span style="color:${color};font-size:18px;">${direction}</span>` : ""}</div>`;
  }

  private _hexToRgb(hex: number): string {
    return `${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255}`;
  }

  private _showWeaponPanel(): void {
    this._weaponPanelVisible = true;
    this._weaponPanel.style.display = "block";
    this._phase = "weapon_select";

    // Organize by category
    const categories: { name: string; color: string; indices: number[] }[] = [
      { name: "Ranged", color: "#ff8844", indices: [] },
      { name: "Explosives", color: "#44dd44", indices: [] },
      { name: "Melee", color: "#ff4444", indices: [] },
      { name: "Special", color: "#44aaff", indices: [] },
      { name: "Super", color: "#ff44ff", indices: [] },
    ];
    WEAPONS.forEach((w, i) => {
      if (w.type === "projectile" || w.type === "hitscan") categories[0].indices.push(i);
      else if (w.type === "grenade" || w.type === "placed") categories[1].indices.push(i);
      else if (w.type === "melee") categories[2].indices.push(i);
      else if (w.type === "teleport" || w.type === "rope" || w.type === "airstrike") categories[3].indices.push(i);
      else categories[4].indices.push(i);
    });

    let html = "";
    for (const cat of categories) {
      html += `<div style="margin-bottom:8px;">
        <div style="color:${cat.color};font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;padding-left:4px;">${cat.name}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:4px;">`;
      for (const i of cat.indices) {
        const w = WEAPONS[i];
        const ammo = this._weaponAmmo[i];
        const available = ammo !== 0;
        const selected = i === this._selectedWeaponIndex;
        html += `<div data-weapon="${i}" style="
          padding:6px 8px;border-radius:6px;cursor:${available ? "pointer" : "not-allowed"};
          background:${selected ? "rgba(200,170,100,0.3)" : "rgba(255,255,255,0.05)"};
          border:1px solid ${selected ? "rgba(200,170,100,0.6)" : "rgba(255,255,255,0.08)"};
          opacity:${available ? "1" : "0.3"};display:flex;align-items:center;gap:6px;
          transition:background 0.12s;pointer-events:${available ? "auto" : "none"};
        " onmouseenter="this.style.background='rgba(200,170,100,0.2)'"
           onmouseleave="this.style.background='${selected ? "rgba(200,170,100,0.3)" : "rgba(255,255,255,0.05)"}'">
          <span style="font-size:18px;">${w.icon}</span>
          <div>
            <div style="color:#eee;font-size:12px;font-weight:bold;">${w.name}</div>
            <div style="color:#777;font-size:10px;">${ammo === -1 ? "∞" : `×${ammo}`} — ${w.damage > 0 ? w.damage + " dmg" : w.description}</div>
          </div>
        </div>`;
      }
      html += "</div></div>";
    }
    this._weaponPanel.innerHTML = html;

    // Bind clicks
    this._weaponPanel.querySelectorAll("[data-weapon]").forEach((el) => {
      (el as HTMLElement).addEventListener("click", () => {
        const idx = parseInt((el as HTMLElement).dataset.weapon!);
        this._selectedWeaponIndex = idx;
        this._hideWeaponPanel();
      });
    });
  }

  private _hideWeaponPanel(): void {
    this._weaponPanelVisible = false;
    this._weaponPanel.style.display = "none";
    if (this._phase === "weapon_select") {
      this._phase = "playing";
    }
  }

  /* ═══════════ title screen ═══════════ */

  private _showTitle(): void {
    this._phase = "title";
    this._titleOverlay = document.createElement("div");
    this._titleOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 52;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%);
      font-family: 'Segoe UI', Arial, sans-serif; cursor: pointer;
    `;
    this._titleOverlay.innerHTML = `
      <div style="margin-bottom: 40px;">
        <h1 style="
          font-size: 72px; color: #ffd700; text-shadow: 0 0 30px rgba(255,215,0,0.5), 0 4px 8px rgba(0,0,0,0.5);
          margin: 0; letter-spacing: 6px; font-weight: 900;
        ">WORMS 3D</h1>
        <div style="
          font-size: 28px; color: #cc9944; text-shadow: 0 0 15px rgba(200,150,50,0.4);
          letter-spacing: 8px; margin-top: 8px; text-align: center;
        ">CAMELOT EDITION</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;align-items:center;pointer-events:auto;">
        <div class="worms-menu-btn" data-teams="2" style="
          padding: 14px 50px; font-size: 20px; font-weight: bold; color: #fff;
          background: linear-gradient(135deg, #884400 0%, #cc7722 100%);
          border: 2px solid #ffa544; border-radius: 8px; cursor: pointer;
          text-shadow: 0 1px 3px rgba(0,0,0,0.4); letter-spacing: 2px;
          transition: transform 0.15s, box-shadow 0.15s;
        " onmouseenter="this.style.transform='scale(1.05)';this.style.boxShadow='0 0 20px rgba(255,165,0,0.4)'"
           onmouseleave="this.style.transform='scale(1)';this.style.boxShadow='none'">
          ⚔️ 2 TEAMS
        </div>
        <div class="worms-menu-btn" data-teams="3" style="
          padding: 14px 50px; font-size: 20px; font-weight: bold; color: #fff;
          background: linear-gradient(135deg, #445500 0%, #88aa22 100%);
          border: 2px solid #aacc44; border-radius: 8px; cursor: pointer;
          text-shadow: 0 1px 3px rgba(0,0,0,0.4); letter-spacing: 2px;
          transition: transform 0.15s, box-shadow 0.15s;
        " onmouseenter="this.style.transform='scale(1.05)';this.style.boxShadow='0 0 20px rgba(100,180,0,0.4)'"
           onmouseleave="this.style.transform='scale(1)';this.style.boxShadow='none'">
          ⚔️ 3 TEAMS
        </div>
        <div class="worms-menu-btn" data-teams="4" style="
          padding: 14px 50px; font-size: 20px; font-weight: bold; color: #fff;
          background: linear-gradient(135deg, #553300 0%, #aa6622 100%);
          border: 2px solid #cc8844; border-radius: 8px; cursor: pointer;
          text-shadow: 0 1px 3px rgba(0,0,0,0.4); letter-spacing: 2px;
          transition: transform 0.15s, box-shadow 0.15s;
        " onmouseenter="this.style.transform='scale(1.05)';this.style.boxShadow='0 0 20px rgba(180,100,0,0.4)'"
           onmouseleave="this.style.transform='scale(1)';this.style.boxShadow='none'">
          ⚔️ 4 TEAMS
        </div>
      </div>

      <div style="margin-top: 16px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; pointer-events:auto; justify-content:center;">
        <span style="color:#aaa;font-size:12px;">Map:</span>
        <select id="worms3d-map" style="background:#222;color:#eee;border:1px solid #666;border-radius:4px;padding:3px 6px;font-size:12px;">
          <option value="island">Emerald Isle</option>
          <option value="volcanic">Volcanic Wastes</option>
          <option value="arctic">Frozen North</option>
          <option value="desert">Desert Sands</option>
          <option value="wasteland">Desolate Wasteland</option>
          <option value="enchanted">Enchanted Forest</option>
          <option value="volcanic_isle">Volcanic Island</option>
        </select>
        <span style="color:#aaa;font-size:12px;">Weather:</span>
        <select id="worms3d-weather" style="background:#222;color:#eee;border:1px solid #666;border-radius:4px;padding:3px 6px;font-size:12px;">
          <option value="clear">Clear</option>
          <option value="rain">Rain</option>
          <option value="snow">Snowfall</option>
          <option value="storm">Thunderstorm</option>
        </select>
        <span style="color:#aaa;font-size:12px;">Mode:</span>
        <select id="worms3d-mode" style="background:#222;color:#eee;border:1px solid #666;border-radius:4px;padding:3px 6px;font-size:12px;">
          <option value="vsai" selected>vs AI</option>
          <option value="hotseat">Hot-Seat (All Human)</option>
          <option value="coop">Co-op (Team 1+2 vs AI)</option>
        </select>
        <span style="color:#aaa;font-size:12px;">AI:</span>
        <select id="worms3d-ai" style="background:#222;color:#eee;border:1px solid #666;border-radius:4px;padding:3px 6px;font-size:12px;">
          <option value="easy">Easy</option>
          <option value="medium" selected>Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      <div style="margin-top: 8px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; pointer-events:auto; justify-content:center;">
        <span style="color:#aaa;font-size:12px;">Turn time:</span>
        <select id="worms3d-turntime" style="background:#222;color:#eee;border:1px solid #666;border-radius:4px;padding:3px 6px;font-size:12px;">
          <option value="30">30s</option>
          <option value="45" selected>45s</option>
          <option value="60">60s</option>
          <option value="90">90s</option>
        </select>
        <span style="color:#aaa;font-size:12px;">HP:</span>
        <select id="worms3d-hp" style="background:#222;color:#eee;border:1px solid #666;border-radius:4px;padding:3px 6px;font-size:12px;">
          <option value="50">50</option>
          <option value="100" selected>100</option>
          <option value="150">150</option>
          <option value="200">200</option>
        </select>
        <span style="color:#aaa;font-size:12px;">Sudden Death:</span>
        <select id="worms3d-sd" style="background:#222;color:#eee;border:1px solid #666;border-radius:4px;padding:3px 6px;font-size:12px;">
          <option value="180">3 min</option>
          <option value="300" selected>5 min</option>
          <option value="600">10 min</option>
          <option value="0">Off</option>
        </select>
      </div>

      <div style="margin-top: 18px; color: #aaa; font-size: 13px; max-width:500px; text-align:center; line-height:1.6;">
        vs AI: Team 1 is yours. Hot-Seat: pass the controls each turn. Co-op: Teams 1+2 are human.
      </div>

      <div style="margin-top: 18px; color: #999; font-size: 14px;">
        Press ESC to return to main menu
      </div>
      <div style="margin-top: 8px; color: #666; font-size: 12px; max-width:600px; text-align:center; line-height:1.5;">
        WASD: Move (Shift: Sprint) | Mouse drag: Camera | Scroll: Zoom | Q/E: Rotate | R/F: Up/Down<br>
        Left click (hold): Aim & fire | Right click: Weapon menu<br>
        Space: Jump (S+Space: Backflip) | Tab: Cycle weapons | P: Pause<br>
        T: Taunt | G: Skip turn | U: Undo move | C: Free camera<br>
        1-9: Quick select | F: Fuse timer
      </div>
    `;
    document.body.appendChild(this._titleOverlay);

    // Bind menu buttons
    this._titleOverlay.querySelectorAll(".worms-menu-btn").forEach((btn) => {
      (btn as HTMLElement).addEventListener("click", (e) => {
        e.stopPropagation();
        const teams = parseInt((btn as HTMLElement).dataset.teams!);
        this._startGame(teams);
      });
    });
  }

  private _startGame(teamCount: number): void {
    this._teamCount = teamCount;

    // Read all options from selects
    const mapSelect = this._titleOverlay?.querySelector("#worms3d-map") as HTMLSelectElement | null;
    const weatherSelect = this._titleOverlay?.querySelector("#worms3d-weather") as HTMLSelectElement | null;
    const aiSelect = this._titleOverlay?.querySelector("#worms3d-ai") as HTMLSelectElement | null;
    const turnTimeSelect = this._titleOverlay?.querySelector("#worms3d-turntime") as HTMLSelectElement | null;
    const hpSelect = this._titleOverlay?.querySelector("#worms3d-hp") as HTMLSelectElement | null;
    const sdSelect = this._titleOverlay?.querySelector("#worms3d-sd") as HTMLSelectElement | null;
    this._mapType = (mapSelect?.value as any) || "island";
    this._weatherType = (weatherSelect?.value as any) || "clear";
    this._aiDifficulty = (aiSelect?.value as any) || "medium";
    this._optTurnTime = parseInt(turnTimeSelect?.value || "45");
    this._optStartHp = parseInt(hpSelect?.value || "100");
    this._optSuddenDeathTime = parseInt(sdSelect?.value || "300");

    if (this._titleOverlay?.parentNode) {
      this._titleOverlay.parentNode.removeChild(this._titleOverlay);
    }

    // Apply map theme
    this._applyMapTheme();

    // Setup weather
    this._setupWeather();

    // Start music & ambient sounds
    this._startMusic();
    this._startAmbientSounds();

    // First round flyover
    this._startFlyover();

    this._spawnWorms();
    this._spawnWithParachutes();
    this._displayHp = new Map();
    this._roundNumber = 1;
    this._currentTeam = 0;
    this._wind = (Math.random() - 0.5) * 2;
    this._suddenDeath = false;
    this._suddenDeathTimer = this._optSuddenDeathTime;

    // Init per-worm stats
    this._wormStats = new Map();
    this._skippedTurn = false;

    // Clear girders
    for (const grd of this._girders) this._scene.remove(grd);
    this._girders = [];

    // Configure human/AI teams based on mode
    const modeSelect = this._titleOverlay?.querySelector("#worms3d-mode") as HTMLSelectElement | null;
    const mode = modeSelect?.value || "vsai";
    this._aiControlled = [];
    this._humanTeams = [];
    for (let i = 0; i < teamCount; i++) {
      if (mode === "hotseat") {
        this._aiControlled.push(false);
        this._humanTeams.push(true);
      } else if (mode === "coop") {
        this._aiControlled.push(i >= 2);
        this._humanTeams.push(i < 2);
      } else {
        this._aiControlled.push(i > 0);
        this._humanTeams.push(i === 0);
      }
    }
    this._aiState = "idle";
    this._eliminatedTeams = new Set();

    // Clear old gravestones and crates
    for (const gs of this._gravestones) this._scene.remove(gs.mesh);
    this._gravestones = [];
    for (const c of this._supplyCrates) this._scene.remove(c.mesh);
    this._supplyCrates = [];
    this._crateDropTimer = 0;
    this._killStreak = 0;
    this._lastKillTeam = -1;
    this._slowMo = false;
    this._timeScale = 1;

    // Reset oil barrels
    for (const b of this._oilBarrels) {
      b.alive = true;
      b.hp = 30;
      b.mesh.visible = true;
    }

    this._phase = "camera_pan";

    // Snap camera to first worm so it doesn't start pointing at the sky
    const firstWorm = this._getCurrentWorm();
    if (firstWorm) {
      this._camTarget.copy(firstWorm.pos);
      this._camSmooth.copy(firstWorm.pos);
    }

    this._startTurn();
  }

  /* ═══════════ turn management ═══════════ */

  private _getCurrentWorm(): Worm | null {
    const teamWorms = this._worms.filter((w) => w.teamIndex === this._currentTeam && w.alive);
    if (teamWorms.length === 0) return null;
    const idx = this._currentWormIndices[this._currentTeam] % teamWorms.length;
    return teamWorms[idx];
  }

  private _startTurn(): void {
    // Check victory conditions
    const aliveTeams = new Set(this._worms.filter((w) => w.alive).map((w) => w.teamIndex));
    if (aliveTeams.size <= 1) {
      this._phase = "victory";
      this._showVictory(aliveTeams.values().next().value ?? -1);
      return;
    }

    // Skip dead teams
    let attempts = 0;
    while (!this._worms.some((w) => w.teamIndex === this._currentTeam && w.alive) && attempts < this._teamCount) {
      this._currentTeam = (this._currentTeam + 1) % this._teamCount;
      attempts++;
    }

    this._turnTimer = this._optTurnTime;
    this._hasFired = false;
    this._turnActive = true;
    this._skippedTurn = false;
    this._wind = this._wind + (Math.random() - 0.5) * 0.4;
    this._wind = Math.max(-1, Math.min(1, this._wind));

    // Apply poison damage to current team's worms at turn start
    const poisonedWorms = this._worms.filter((w) => w.teamIndex === this._currentTeam && w.alive && w.poisoned > 0);
    for (const tw of poisonedWorms) {
      const poisonDmg = 5;
      tw.hp -= poisonDmg;
      tw.poisoned--;
      this._addFloatingText(`☠-${poisonDmg}`, tw.pos.clone().add(new THREE.Vector3(0, 2, 0)), "#88ff00");
      this._spawnExplosionParticles(tw.pos, 0.3, new THREE.Color(0x88ff00), 5);
      if (tw.hp <= 0) {
        tw.hp = 0;
        tw.alive = false;
        this._addFloatingText(`☠ ${tw.name}`, tw.pos.clone().add(new THREE.Vector3(0, 3, 0)), "#88ff00", 2);
        this._spawnGravestone(tw);
      }
    }

    // Camera pan to current worm
    const worm = this._getCurrentWorm();
    if (worm) {
      // Check if frozen — auto-skip turn
      if (worm.frozen > 0) {
        worm.frozen--;
        this._addFloatingText("❄ FROZEN!", worm.pos.clone().add(new THREE.Vector3(0, 2, 0)), "#88ddff", 2);
        this._spawnExplosionParticles(worm.pos, 0.5, new THREE.Color(0x88ddff), 10);
        this._camTarget.copy(worm.pos);
        this._phase = "camera_pan";
        setTimeout(() => { if (!this._destroyed) this._endTurn(); }, 1500);
        return;
      }

      // Init stats tracking for this worm
      if (!this._wormStats.has(worm.name)) {
        this._wormStats.set(worm.name, { damageDealt: 0, kills: 0, damageReceived: 0, biggestHit: 0 });
      }

      // Save start position for undo
      this._turnStartPos = worm.pos.clone();

      // Show loading tip during camera pan
      this._currentTip = this._tips[Math.floor(Math.random() * this._tips.length)];

      this._camTarget.copy(worm.pos);
      this._phase = "camera_pan";
      this._showTurnAnnouncement(worm);
      this._aiState = "idle";

      setTimeout(() => {
        if (!this._destroyed && this._phase === "camera_pan") {
          this._phase = "playing";
        }
      }, 1200);
    }
  }

  private _endTurn(): void {
    this._turnActive = false;
    this._hasFired = false;
    this._teleportMode = false;
    this._ropeActive = false;
    this._totalDamageThisTurn = 0;
    this._sprintEnergy = 1.0;
    this._freeCamera = false;

    // Screen wipe transition
    this._showTurnTransition();

    // Random supply crate drop (20% chance per turn)
    this._crateDropTimer++;
    if (this._crateDropTimer >= 3 && Math.random() < 0.3) {
      this._spawnCrate();
      this._crateDropTimer = 0;
    }
    if (this._ropeLine) {
      this._scene.remove(this._ropeLine);
      this._ropeLine = null;
    }
    this._teleportMarker.visible = false;

    // Show damage summary
    this._showDamageSummary();

    // Advance to next team
    this._currentWormIndices[this._currentTeam]++;
    this._currentTeam = (this._currentTeam + 1) % this._teamCount;
    if (this._currentTeam === 0) this._roundNumber++;

    // Sudden death countdown
    this._suddenDeathTimer -= TURN_TIME;
    if (this._suddenDeathTimer <= 0 && !this._suddenDeath) {
      this._suddenDeath = true;
      // In sudden death, all worms go to 1 HP
      for (const w of this._worms) {
        if (w.alive) w.hp = 1;
      }
      this._addFloatingText("☠ SUDDEN DEATH ☠", new THREE.Vector3(0, 20, 0), "#ff4444", 3);
      // Dramatic effects
      this._shakeIntensity = 1.5;
      this._playSound(80, 0.4, "sawtooth", 1.0);
      // Darken sky
      const sdSkyMat = this._skyDome.material as THREE.ShaderMaterial;
      sdSkyMat.uniforms.topColor.value.multiplyScalar(0.4);
      sdSkyMat.uniforms.midColor.value.multiplyScalar(0.6);
      // Red-tint water
      const sdWaterMat = this._waterMesh.material as THREE.ShaderMaterial;
      sdWaterMat.uniforms.uWaterColor.value.set(0x882222);
      sdWaterMat.uniforms.uDeepColor.value.set(0x440000);
      // Dim sun
      this._sunLight.intensity *= 0.5;
      this._sunLight.color.set(0xff6644);
    }

    // Water rises in sudden death
    if (this._suddenDeath) {
      this._waterMesh.position.y += 0.35;
    }

    this._startTurn();
  }

  /* ═══════════ input ═══════════ */

  private _initInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      this._keys.add(e.key.toLowerCase());

      if (e.key === "Escape") {
        if (this._paused) {
          this._togglePause();
        } else if (this._weaponPanelVisible) {
          this._hideWeaponPanel();
        } else if (this._phase === "title") {
          window.dispatchEvent(new Event("worms3dExit"));
        } else if (this._phase === "victory") {
          window.dispatchEvent(new Event("worms3dExit"));
        } else {
          this._togglePause();
        }
        return;
      }

      // P: pause
      if (e.key === "p" || e.key === "P") {
        this._togglePause();
        return;
      }

      if (this._phase === "title" || this._phase === "victory") return;

      // T: taunt
      if (e.key === "t" || e.key === "T") {
        this._wormTaunt();
        return;
      }

      // C: toggle free camera
      if (e.key === "c" || e.key === "C") {
        this._freeCamera = !this._freeCamera;
        this._addFloatingText(this._freeCamera ? "Free Camera" : "Follow Camera",
          this._camera.position.clone().add(new THREE.Vector3(0, -2, 0)), "#aaddff");
        return;
      }

      // U: undo movement (before firing)
      if ((e.key === "u" || e.key === "U") && this._phase === "playing" && !this._hasFired && !this._isAiTurn()) {
        const w = this._getCurrentWorm();
        if (w && this._turnStartPos) {
          w.pos.copy(this._turnStartPos);
          w.mesh.position.copy(w.pos);
          w.vel.set(0, 0, 0);
          this._addFloatingText("Undo!", w.pos.clone().add(new THREE.Vector3(0, 2, 0)), "#ffaa44");
          this._playSound(500, 0.1, "sine", 0.1);
        }
        return;
      }

      // G: skip turn
      if ((e.key === "g" || e.key === "G") && this._phase === "playing" && !this._hasFired && !this._isAiTurn()) {
        this._skippedTurn = true;
        this._addFloatingText("Turn Skipped", this._getCurrentWorm()?.pos.clone().add(new THREE.Vector3(0, 2, 0)) || new THREE.Vector3(), "#aaaaaa");
        this._endTurn();
        return;
      }

      // Tab: cycle weapon
      if (e.key === "Tab") {
        e.preventDefault();
        this._selectedWeaponIndex = (this._selectedWeaponIndex + 1) % WEAPONS.length;
        while (this._weaponAmmo[this._selectedWeaponIndex] === 0) {
          this._selectedWeaponIndex = (this._selectedWeaponIndex + 1) % WEAPONS.length;
        }
      }

      // Number keys: quick weapon select (categories)
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && num <= WEAPONS.length) {
        this._selectedWeaponIndex = num - 1;
      }

      // Space: jump
      if (e.key === " " && (this._phase === "playing" || this._phase === "aiming")) {
        const w = this._getCurrentWorm();
        if (w && w.grounded) {
          // Backflip if holding backward
          const isBackflip = this._keys.has("s") || this._keys.has("arrowdown");
          w.vel.y = isBackflip ? 11 : 8;
          if (isBackflip) {
            // Launch backward
            w.vel.x -= Math.sin(w.facing) * 5;
            w.vel.z -= Math.cos(w.facing) * 5;
          }
          w.grounded = false;
          w.onGround = false;
          this._playWormVoice(w, "jump");
        }
      }

      // Enter/click: fire/interact
      if (e.key === "Enter" && (this._phase === "playing" || this._phase === "aiming")) {
        if (!this._hasFired) {
          if (this._phase === "playing") {
            this._phase = "aiming";
            this._aimPower = 0;
          } else if (this._phase === "aiming") {
            this._fire();
          }
        }
      }

      // Backspace: cancel aim
      if (e.key === "Backspace" && this._phase === "aiming") {
        this._phase = "playing";
      }

      // F: cycle grenade fuse
      if (e.key === "f" || e.key === "F") {
        const w = WEAPONS[this._selectedWeaponIndex];
        if (w.fuseTime !== undefined) {
          (w as any).fuseTime = ((w.fuseTime || 3) % 5) + 1;
        }
      }
    };

    this._onKeyUp = (e: KeyboardEvent) => {
      this._keys.delete(e.key.toLowerCase());
    };

    this._onMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        // Right click: weapon menu
        if (this._phase === "playing" || this._phase === "aiming") {
          this._showWeaponPanel();
        }
        return;
      }

      if (e.button === 0) {
        if (this._phase === "weapon_select") return;

        // Teleport click
        if (this._teleportMode) {
          this._executeTeleport(e);
          return;
        }

        this._isDragging = true;
        this._lastMouse = { x: e.clientX, y: e.clientY };

        // Start aiming
        if (this._phase === "playing" && !this._hasFired) {
          this._phase = "aiming";
          this._aimPower = 0;
        }
      }
    };

    this._onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        if (this._phase === "aiming" && !this._teleportMode) {
          this._fire();
        }
        this._isDragging = false;
      }
    };

    this._onMouseMove = (e: MouseEvent) => {
      if (this._isDragging && this._phase !== "aiming") {
        const dx = e.clientX - this._lastMouse.x;
        const dy = e.clientY - this._lastMouse.y;
        this._camTheta -= dx * 0.005;
        this._camPhi = Math.max(0.1, Math.min(Math.PI * 0.45, this._camPhi + dy * 0.005));
        this._lastMouse = { x: e.clientX, y: e.clientY };
      }

      // Aim direction with mouse in aiming mode
      if (this._phase === "aiming" || this._phase === "playing") {
        const worm = this._getCurrentWorm();
        if (worm) {
          const dx = (e.clientX / window.innerWidth - 0.5) * 2;
          const dy = -(e.clientY / window.innerHeight - 0.5) * 2;
          worm.aimAngle = Math.max(-0.8, Math.min(1.2, dy * 1.5));

          // Facing direction from camera
          worm.facing = this._camTheta + Math.PI + dx * 0.5;
        }
      }

      // Teleport marker
      if (this._teleportMode) {
        this._updateTeleportMarker(e);
      }
    };

    this._onWheel = (e: WheelEvent) => {
      this._camDist = Math.max(5, Math.min(40, this._camDist + e.deltaY * 0.01));
    };

    this._onClick = (_e: MouseEvent) => {};

    this._onResize = () => {
      this._camera.aspect = window.innerWidth / window.innerHeight;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(window.innerWidth, window.innerHeight);
      // Resize bloom targets
      if (this._bloomPass) {
        const pr = Math.min(window.devicePixelRatio, 2);
        this._bloomPass.target.setSize(window.innerWidth * pr * 0.5, window.innerHeight * pr * 0.5);
        this._bloomPass.blurTarget.setSize(window.innerWidth * pr * 0.25, window.innerHeight * pr * 0.25);
      }
    };

    this._onContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("wheel", this._onWheel);
    window.addEventListener("click", this._onClick);
    window.addEventListener("resize", this._onResize);
    window.addEventListener("contextmenu", this._onContextMenu);
  }

  /* ═══════════ firing & weapons ═══════════ */

  private _fire(): void {
    const worm = this._getCurrentWorm();
    if (!worm || this._hasFired) return;

    const weapon = WEAPONS[this._selectedWeaponIndex];
    if (this._weaponAmmo[this._selectedWeaponIndex] === 0) return;

    // Check for special weapon types
    if (weapon.type === "teleport") {
      this._teleportMode = true;
      this._teleportMarker.visible = true;
      this._phase = "playing";
      return;
    }

    if (weapon.type === "melee") {
      this._fireMelee(worm, weapon);
      return;
    }

    if (weapon.type === "airstrike") {
      this._fireAirStrike(worm, weapon);
      return;
    }

    if (weapon.type === "strike") {
      this._fireStrike(worm, weapon);
      return;
    }

    if (weapon.type === "placed") {
      this._firePlaced(worm, weapon);
      return;
    }

    if (weapon.type === "hitscan") {
      this._fireHitscan(worm, weapon);
      return;
    }

    // Special weapons
    if (weapon.name === "Girder") {
      this._placeGirder(worm);
      return;
    }

    if (weapon.name === "Sheep") {
      this._fireSheep(worm, weapon);
      return;
    }

    if (weapon.name === "Carpet Bomb") {
      this._fireCarpetBomb(worm, weapon);
      return;
    }

    if (weapon.name === "Mole Bomb") {
      this._fireMoleBomb(worm, weapon);
      return;
    }

    if (weapon.type === "rope") {
      this._fireRope(worm);
      return;
    }

    // Projectile or grenade
    this._fireProjectile(worm, weapon);
  }

  private _fireProjectile(worm: Worm, weapon: WeaponDef): void {
    const dir = new THREE.Vector3(
      Math.sin(worm.facing) * Math.cos(worm.aimAngle),
      Math.sin(worm.aimAngle),
      Math.cos(worm.facing) * Math.cos(worm.aimAngle),
    ).normalize();

    const speed = 20 + this._aimPower * 35;
    const vel = dir.multiplyScalar(speed);

    // Detailed projectile mesh based on weapon
    let projMesh: THREE.Mesh;
    if (weapon.type === "grenade") {
      // Round grenade with fuse
      const grenadeGroup = new THREE.Group();
      const grenadeBody = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 14, 14),
        new THREE.MeshStandardMaterial({ color: 0x44aa44, emissive: 0x224422, emissiveIntensity: 0.5, roughness: 0.4 }),
      );
      grenadeGroup.add(grenadeBody);
      // Fuse cap
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.06, 12),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6 }));
      cap.position.y = 0.14;
      grenadeGroup.add(cap);
      // Glowing fuse tip
      const fuse = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff4400 }));
      fuse.position.y = 0.18;
      grenadeGroup.add(fuse);
      projMesh = grenadeBody; // keep reference for material access
      grenadeGroup.position.copy(worm.pos).add(new THREE.Vector3(0, 0.5, 0));
      this._scene.add(grenadeGroup);
      // The group children get positioned via the group
      projMesh = grenadeGroup as unknown as THREE.Mesh;
    } else {
      // Rocket/missile projectile
      const rocketGroup = new THREE.Group();
      // Body
      const rocketBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 0.4, 12),
        new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.5, roughness: 0.3 }),
      );
      rocketBody.rotation.z = Math.PI / 2;
      rocketGroup.add(rocketBody);
      // Nose cone
      const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.15, 12),
        new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0x661100, emissiveIntensity: 0.3 }),
      );
      nose.rotation.z = -Math.PI / 2;
      nose.position.x = 0.27;
      rocketGroup.add(nose);
      // Fins
      for (let fi = 0; fi < 4; fi++) {
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.08, 0.01),
          new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.4 }),
        );
        fin.position.set(-0.18, 0, 0);
        fin.rotation.x = (fi / 4) * Math.PI * 2;
        rocketGroup.add(fin);
      }
      // Exhaust glow
      const exhaust = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.7 }),
      );
      exhaust.position.x = -0.22;
      exhaust.name = "exhaust";
      rocketGroup.add(exhaust);

      rocketGroup.position.copy(worm.pos).add(new THREE.Vector3(0, 0.5, 0));
      this._scene.add(rocketGroup);
      projMesh = rocketGroup as unknown as THREE.Mesh;
    }

    this._projectiles.push({
      mesh: projMesh,
      pos: projMesh.position.clone(),
      vel,
      weapon,
      fuseTimer: weapon.fuseTime ?? 999,
      bounces: 0,
      owner: worm,
      trail: null,
      trailPositions: [],
      age: 0,
    });

    this._hasFired = true;
    if (this._weaponAmmo[this._selectedWeaponIndex] > 0) {
      this._weaponAmmo[this._selectedWeaponIndex]--;
    }
    this._phase = "firing";
    this._playWeaponSound(weapon);
    this._playWormVoice(worm, "fire");
  }

  private _placeGirder(worm: Worm): void {
    const dir = new THREE.Vector3(Math.sin(worm.facing), 0, Math.cos(worm.facing));
    const pos = worm.pos.clone().add(dir.multiplyScalar(3));
    const terrainH = this._getTerrainHeight(pos.x, pos.z);

    const girder = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.2, 1, 4, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.4, metalness: 0.6 }),
    );
    girder.position.set(pos.x, Math.max(terrainH + 1, worm.pos.y), pos.z);
    girder.rotation.y = worm.facing;
    girder.castShadow = true;
    girder.receiveShadow = true;
    this._scene.add(girder);
    this._girders.push(girder);

    // Modify terrain heightmap to include girder as walkable surface
    // (We fake it by raising terrain under the girder)
    const gLen = 2, gWid = 0.5;
    for (let gx = -gLen; gx <= gLen; gx += 0.5) {
      for (let gz = -gWid; gz <= gWid; gz += 0.5) {
        const wx = pos.x + Math.sin(worm.facing) * gx + Math.cos(worm.facing) * gz;
        const wz = pos.z + Math.cos(worm.facing) * gx - Math.sin(worm.facing) * gz;
        const curH = this._getTerrainHeight(wx, wz);
        if (curH < girder.position.y - 0.1) {
          // Raise terrain to girder level
          this._setTerrainHeight(wx, wz, girder.position.y - 0.1);
        }
      }
    }

    this._hasFired = true;
    if (this._weaponAmmo[this._selectedWeaponIndex] > 0) this._weaponAmmo[this._selectedWeaponIndex]--;
    this._phase = "retreat";
    this._retreatTimer = RETREAT_TIME;
    this._playSound(400, 0.15, "square", 0.2);
    this._addFloatingText("Girder placed!", worm.pos.clone().add(new THREE.Vector3(0, 2, 0)), "#8888ff");
  }

  private _setTerrainHeight(wx: number, wz: number, h: number): void {
    const res = TERRAIN_RES;
    const half = TERRAIN_SIZE / 2;
    const tx = Math.round(((wx + half) / TERRAIN_SIZE) * res);
    const tz = Math.round(((wz + half) / TERRAIN_SIZE) * res);
    if (tx < 0 || tx > res || tz < 0 || tz > res) return;
    const idx = tz * (res + 1) + tx;
    if (h > this._heightData[idx]) {
      this._heightData[idx] = h;
      const positions = this._terrainGeo.attributes.position;
      positions.setY(idx, h);
      positions.needsUpdate = true;
    }
  }

  private _fireSheep(worm: Worm, weapon: WeaponDef): void {
    const dir = new THREE.Vector3(Math.sin(worm.facing), 0, Math.cos(worm.facing)).normalize();

    // Create sheep mesh
    const sheepGroup = new THREE.Group();
    const woolMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 });
    const faceMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

    const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), woolMat);
    bodyMesh.scale.set(1.3, 1, 1);
    sheepGroup.add(bodyMesh);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), faceMat);
    headMesh.position.set(0.3, 0.05, 0);
    sheepGroup.add(headMesh);

    // Legs
    for (const lx of [-0.12, 0.12]) {
      for (const lz of [-0.1, 0.1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.15, 6), faceMat);
        leg.position.set(lx, -0.15, lz);
        sheepGroup.add(leg);
      }
    }

    sheepGroup.position.copy(worm.pos).add(new THREE.Vector3(dir.x * 1.5, 0.3, dir.z * 1.5));
    sheepGroup.rotation.y = worm.facing;
    this._scene.add(sheepGroup);

    // Sheep walks forward then explodes after 3 seconds
    const sheepVel = dir.clone().multiplyScalar(6);
    this._projectiles.push({
      mesh: sheepGroup as unknown as THREE.Mesh,
      pos: sheepGroup.position.clone(),
      vel: sheepVel,
      weapon,
      fuseTimer: 3,
      bounces: 0,
      owner: worm,
      trail: null,
      trailPositions: [],
      age: 0,
    });

    this._hasFired = true;
    if (this._weaponAmmo[this._selectedWeaponIndex] > 0) this._weaponAmmo[this._selectedWeaponIndex]--;
    this._phase = "firing";
    this._playSound(500, 0.12, "sine", 0.3); // "baa"
    this._addFloatingText("🐑 Baa!", worm.pos.clone().add(new THREE.Vector3(0, 2, 0)), "#ffffff");
  }

  private _fireCarpetBomb(worm: Worm, weapon: WeaponDef): void {
    const dir = new THREE.Vector3(Math.sin(worm.facing), 0, Math.cos(worm.facing));
    const targetPos = worm.pos.clone().add(dir.multiplyScalar(15));

    const missiles: AirStrikeTarget["missiles"] = [];
    for (let i = 0; i < 12; i++) {
      const mx = targetPos.x + (i - 6) * 2.5 * dir.x + (Math.random() - 0.5) * 2;
      const mz = targetPos.z + (i - 6) * 2.5 * dir.z + (Math.random() - 0.5) * 2;
      const missilePos = new THREE.Vector3(mx, 55 + i * 2, mz);
      const missileVel = new THREE.Vector3(0, -22 - Math.random() * 5, 0);
      const missileMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 14, 14),
        new THREE.MeshStandardMaterial({ color: 0x444444, emissive: 0x661100, emissiveIntensity: 0.5 }),
      );
      missileMesh.position.copy(missilePos);
      this._scene.add(missileMesh);
      missiles.push({ pos: missilePos, vel: missileVel, mesh: missileMesh, landed: false });
    }

    this._airStrikes.push({ x: targetPos.x, z: targetPos.z, missiles, weapon });

    this._hasFired = true;
    if (this._weaponAmmo[this._selectedWeaponIndex] > 0) this._weaponAmmo[this._selectedWeaponIndex]--;
    this._phase = "firing";
    this._playSound(120, 0.3, "sawtooth", 0.6);
  }

  private _fireMoleBomb(worm: Worm, weapon: WeaponDef): void {
    const dir = new THREE.Vector3(
      Math.sin(worm.facing) * Math.cos(worm.aimAngle),
      Math.sin(worm.aimAngle),
      Math.cos(worm.facing) * Math.cos(worm.aimAngle),
    ).normalize();

    const speed = 15 + this._aimPower * 20;
    const vel = dir.multiplyScalar(speed);

    // Mole mesh
    const moleGroup = new THREE.Group();
    const moleMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 });
    const moleBody = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 14), moleMat);
    moleBody.scale.set(1, 0.7, 1.3);
    moleGroup.add(moleBody);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xff8888 }));
    nose.position.z = 0.18;
    moleGroup.add(nose);

    moleGroup.position.copy(worm.pos).add(new THREE.Vector3(0, 0.5, 0));
    this._scene.add(moleGroup);

    this._projectiles.push({
      mesh: moleGroup as unknown as THREE.Mesh,
      pos: moleGroup.position.clone(),
      vel,
      weapon,
      fuseTimer: 999,
      bounces: 0,
      owner: worm,
      trail: null,
      trailPositions: [],
      age: 0,
    });

    this._hasFired = true;
    if (this._weaponAmmo[this._selectedWeaponIndex] > 0) this._weaponAmmo[this._selectedWeaponIndex]--;
    this._phase = "firing";
    this._playSound(300, 0.15, "sine", 0.15);
  }

  private _fireHitscan(worm: Worm, weapon: WeaponDef): void {
    const dir = new THREE.Vector3(
      Math.sin(worm.facing) * Math.cos(worm.aimAngle),
      Math.sin(worm.aimAngle),
      Math.cos(worm.facing) * Math.cos(worm.aimAngle),
    ).normalize();

    const origin = worm.pos.clone().add(new THREE.Vector3(0, 0.5, 0));
    const maxRange = 25;

    // Two shots for shotgun
    const shotCount = weapon.name === "Shotgun" ? 2 : 1;
    this._shotgunShotsLeft = shotCount;

    for (let s = 0; s < shotCount; s++) {
      // Slight spread per shot
      const spread = new THREE.Vector3(
        dir.x + (Math.random() - 0.5) * 0.05,
        dir.y + (Math.random() - 0.5) * 0.05,
        dir.z + (Math.random() - 0.5) * 0.05,
      ).normalize();

      // Check hits against all worms
      let closestHit: { worm: Worm; dist: number } | null = null;
      for (const target of this._worms) {
        if (target === worm || !target.alive) continue;
        // Simple sphere intersection
        const toTarget = target.pos.clone().sub(origin);
        const along = toTarget.dot(spread);
        if (along < 0 || along > maxRange) continue;
        const closest = origin.clone().add(spread.clone().multiplyScalar(along));
        const perpDist = closest.distanceTo(target.pos);
        if (perpDist < WORM_RADIUS + 0.3) {
          if (!closestHit || along < closestHit.dist) {
            closestHit = { worm: target, dist: along };
          }
        }
      }

      // Visual tracer line
      const endPoint = closestHit
        ? origin.clone().add(spread.clone().multiplyScalar(closestHit.dist))
        : origin.clone().add(spread.clone().multiplyScalar(maxRange));

      const tracerGeo = new THREE.BufferGeometry().setFromPoints([origin.clone(), endPoint]);
      const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({
        color: 0xffff44, transparent: true, opacity: 0.9,
      }));
      this._scene.add(tracer);
      setTimeout(() => { this._scene.remove(tracer); tracerGeo.dispose(); }, 200);

      // Muzzle flash
      this._spawnExplosionParticles(origin.clone().add(spread.clone().multiplyScalar(0.5)), 0.3, new THREE.Color(0xffff44), 5);

      if (closestHit) {
        this._damageWorm(closestHit.worm, weapon.damage, origin, weapon.knockback);
        this._spawnExplosionParticles(endPoint, 0.5, new THREE.Color(0xff4444), 8);
      } else {
        // Terrain hit check
        this._raycaster.set(origin, spread);
        const terrainHits = this._raycaster.intersectObject(this._terrainMesh);
        if (terrainHits.length > 0 && terrainHits[0].distance < maxRange) {
          this._spawnExplosionParticles(terrainHits[0].point, 0.3, new THREE.Color(0x886644), 6);
          this._deformTerrain(terrainHits[0].point.x, terrainHits[0].point.z, 0.5, 0.3);
        }
      }

      this._playSound(800, 0.25, "square", 0.08);
    }

    this._hasFired = true;
    if (this._weaponAmmo[this._selectedWeaponIndex] > 0) {
      this._weaponAmmo[this._selectedWeaponIndex]--;
    }
    this._phase = "retreat";
    this._retreatTimer = RETREAT_TIME;
  }

  private _fireMelee(worm: Worm, weapon: WeaponDef): void {
    const dir = new THREE.Vector3(Math.sin(worm.facing), 0, Math.cos(worm.facing));
    const hitPos = worm.pos.clone().add(dir.clone().multiplyScalar(1.5));
    hitPos.y += 0.5;

    // Check for hits
    for (const target of this._worms) {
      if (target === worm || !target.alive) continue;
      const dist = target.pos.distanceTo(hitPos);
      if (dist < weapon.radius + WORM_RADIUS) {
        this._damageWorm(target, weapon.damage, hitPos, weapon.knockback);
      }
    }

    // Camera zoom for melee
    this._triggerMeleeZoom();
    // Visual effect — melee arc + particles
    this._spawnMeleeArc(worm, weapon);
    this._spawnExplosionParticles(hitPos, 0.5, new THREE.Color(weapon.name === "Fire Punch" ? 0xff4400 : weapon.name === "Dragon Punch" ? 0x44ff88 : 0xff8800), 10);
    this._playWeaponSound(weapon);

    this._hasFired = true;
    if (this._weaponAmmo[this._selectedWeaponIndex] > 0) {
      this._weaponAmmo[this._selectedWeaponIndex]--;
    }

    // Start retreat timer
    this._phase = "retreat";
    this._retreatTimer = RETREAT_TIME;
  }

  private _fireAirStrike(worm: Worm, weapon: WeaponDef): void {
    // Target where camera is looking
    const dir = new THREE.Vector3(Math.sin(worm.facing), 0, Math.cos(worm.facing));
    const targetPos = worm.pos.clone().add(dir.multiplyScalar(15));
    const targetX = targetPos.x;
    const targetZ = targetPos.z;

    const missiles: AirStrikeTarget["missiles"] = [];
    for (let i = 0; i < 5; i++) {
      const mx = targetX + (i - 2) * 3;
      const mz = targetZ + (Math.random() - 0.5) * 2;
      const missilePos = new THREE.Vector3(mx, 60, mz);
      const missileVel = new THREE.Vector3(0, -25, 0);
      const missileMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 0.8, 12),
        new THREE.MeshStandardMaterial({ color: 0x444444, emissive: 0x661100, emissiveIntensity: 0.5 }),
      );
      missileMesh.position.copy(missilePos);
      missileMesh.rotation.x = Math.PI;
      this._scene.add(missileMesh);
      missiles.push({ pos: missilePos, vel: missileVel, mesh: missileMesh, landed: false });
    }

    this._airStrikes.push({ x: targetX, z: targetZ, missiles, weapon });

    this._hasFired = true;
    if (this._weaponAmmo[this._selectedWeaponIndex] > 0) {
      this._weaponAmmo[this._selectedWeaponIndex]--;
    }
    this._phase = "firing";
    this._playSound(150, 0.3, "sawtooth", 0.5);
  }

  private _fireStrike(worm: Worm, weapon: WeaponDef): void {
    const dir = new THREE.Vector3(Math.sin(worm.facing), 0, Math.cos(worm.facing));
    const targetPos = worm.pos.clone().add(dir.multiplyScalar(12));
    targetPos.y = this._getTerrainHeight(targetPos.x, targetPos.z);

    let strikeMesh: THREE.Mesh;
    const strikeGroup = new THREE.Group();
    if (weapon.name === "Excalibur Strike") {
      // Detailed golden sword
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 1.0, metalness: 0.9 });
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4, 0.35, 1, 6, 1), bladeMat);
      // Taper blade tip
      const bp = blade.geometry.attributes.position;
      for (let v = 0; v < bp.count; v++) {
        const by = bp.getY(v);
        if (by > 1.5) bp.setX(v, bp.getX(v) * (1 - (by - 1.5) * 0.5));
      }
      blade.geometry.computeVertexNormals();
      strikeGroup.add(blade);
      // Cross-guard
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.15), bladeMat);
      guard.position.y = -2;
      strikeGroup.add(guard);
      // Grip
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 14), new THREE.MeshStandardMaterial({ color: 0x442200 }));
      grip.position.y = -2.3;
      strikeGroup.add(grip);
      // Pommel
      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 14), bladeMat);
      pommel.position.y = -2.6;
      strikeGroup.add(pommel);
      // Light beam
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.02, 8, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.15, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      strikeGroup.add(beam);
      // Point light
      const swordLight = new THREE.PointLight(0xffd700, 5, 15);
      strikeGroup.add(swordLight);
      strikeMesh = strikeGroup as unknown as THREE.Mesh;
    } else if (weapon.name === "Meteor") {
      // Detailed flaming meteor
      const core = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 24), new THREE.MeshStandardMaterial({
        color: 0x884422, roughness: 0.8, metalness: 0.3,
      }));
      strikeGroup.add(core);
      // Magma veins (glowing spots)
      for (let v = 0; v < 8; v++) {
        const vein = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), new THREE.MeshBasicMaterial({
          color: 0xff4400, transparent: true, opacity: 0.8,
        }));
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI;
        vein.position.set(Math.sin(angle1) * Math.sin(angle2) * 1.0, Math.cos(angle2) * 1.0, Math.cos(angle1) * Math.sin(angle2) * 1.0);
        strikeGroup.add(vein);
      }
      // Fire aura
      const aura = new THREE.Mesh(new THREE.SphereGeometry(1.8, 20, 20), new THREE.MeshBasicMaterial({
        color: 0xff6600, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      strikeGroup.add(aura);
      // Light
      const meteorLight = new THREE.PointLight(0xff4400, 8, 20);
      strikeGroup.add(meteorLight);
      strikeMesh = strikeGroup as unknown as THREE.Mesh;
    } else if (weapon.name === "Earthquake") {
      // No visual strike mesh for earthquake
      strikeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ visible: false }));
    } else {
      // Concrete Donkey (more detailed)
      const donkeyBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 1.2, 2, 2, 2), new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 }));
      strikeGroup.add(donkeyBody);
      // Head
      const donkeyHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 }));
      donkeyHead.position.set(0, 0.3, 0.6);
      strikeGroup.add(donkeyHead);
      // Ears
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 12), new THREE.MeshStandardMaterial({ color: 0x999999 }));
        ear.position.set(side * 0.15, 0.65, 0.6);
        strikeGroup.add(ear);
      }
      strikeMesh = strikeGroup as unknown as THREE.Mesh;
    }

    strikeMesh.position.set(targetPos.x, 50, targetPos.z);
    this._scene.add(strikeMesh);

    this._strikes.push({
      pos: targetPos.clone(),
      weapon,
      timer: 0,
      mesh: strikeMesh,
      phase: "descend",
      owner: worm,
    });

    this._hasFired = true;
    if (this._weaponAmmo[this._selectedWeaponIndex] > 0) {
      this._weaponAmmo[this._selectedWeaponIndex]--;
    }
    this._phase = "firing";
    this._playSound(100, 0.4, "sawtooth", 0.8);
  }

  private _firePlaced(worm: Worm, weapon: WeaponDef): void {
    const dir = new THREE.Vector3(Math.sin(worm.facing), 0, Math.cos(worm.facing));
    const placePos = worm.pos.clone().add(dir.multiplyScalar(1.5));
    placePos.y = this._getTerrainHeight(placePos.x, placePos.z) + 0.2;

    const projMesh = new THREE.Mesh(
      weapon.name === "Mine" ?
        new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16) :
        new THREE.CylinderGeometry(0.12, 0.12, 0.5, 14),
      new THREE.MeshStandardMaterial({
        color: weapon.name === "Mine" ? 0x444444 : 0xff2200,
        emissive: weapon.name === "Mine" ? 0x111111 : 0x880000,
        emissiveIntensity: 0.5,
      }),
    );
    projMesh.position.copy(placePos);
    this._scene.add(projMesh);

    this._projectiles.push({
      mesh: projMesh,
      pos: placePos.clone(),
      vel: new THREE.Vector3(),
      weapon,
      fuseTimer: weapon.fuseTime ?? 999,
      bounces: 0,
      owner: worm,
      trail: null,
      trailPositions: [],
      age: 0,
    });

    this._hasFired = true;
    if (this._weaponAmmo[this._selectedWeaponIndex] > 0) {
      this._weaponAmmo[this._selectedWeaponIndex]--;
    }

    this._phase = "retreat";
    this._retreatTimer = RETREAT_TIME;
    this._playSound(500, 0.1, "sine", 0.1);
  }

  private _fireRope(worm: Worm): void {
    const dir = new THREE.Vector3(
      Math.sin(worm.facing) * Math.cos(worm.aimAngle),
      Math.sin(worm.aimAngle),
      Math.cos(worm.facing) * Math.cos(worm.aimAngle),
    ).normalize();

    // Raycast for anchor point
    this._raycaster.set(worm.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), dir);
    const hits = this._raycaster.intersectObject(this._terrainMesh);
    if (hits.length > 0 && hits[0].distance < 30) {
      this._ropeActive = true;
      this._ropeAnchor.copy(hits[0].point);
      this._ropeLength = worm.pos.distanceTo(this._ropeAnchor);

      if (this._ropeLine) this._scene.remove(this._ropeLine);
      const ropeGeo = new THREE.BufferGeometry().setFromPoints([worm.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), this._ropeAnchor]);
      this._ropeLine = new THREE.Line(ropeGeo, new THREE.LineBasicMaterial({ color: 0x886644, linewidth: 2 }));
      this._scene.add(this._ropeLine);

      this._hasFired = true;
      if (this._weaponAmmo[this._selectedWeaponIndex] > 0) {
        this._weaponAmmo[this._selectedWeaponIndex]--;
      }
      this._playSound(600, 0.1, "sine", 0.2);
    }
  }

  private _executeTeleport(e: MouseEvent): void {
    const worm = this._getCurrentWorm();
    if (!worm) return;

    // Raycast from camera through mouse position
    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1,
    );
    this._raycaster.setFromCamera(mouse, this._camera);
    const hits = this._raycaster.intersectObject(this._terrainMesh);
    if (hits.length > 0) {
      const target = hits[0].point;
      worm.pos.set(target.x, target.y + WORM_HEIGHT / 2, target.z);
      worm.mesh.position.copy(worm.pos);
      worm.vel.set(0, 0, 0);

      this._spawnExplosionParticles(worm.pos, 1, new THREE.Color(0x00ffff), 20);
      this._playSound(800, 0.2, "sine", 0.3);
    }

    this._teleportMode = false;
    this._teleportMarker.visible = false;
    this._hasFired = true;
    if (this._weaponAmmo[this._selectedWeaponIndex] > 0) {
      this._weaponAmmo[this._selectedWeaponIndex]--;
    }
    this._phase = "retreat";
    this._retreatTimer = RETREAT_TIME;
  }

  private _updateTeleportMarker(e: MouseEvent): void {
    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1,
    );
    this._raycaster.setFromCamera(mouse, this._camera);
    const hits = this._raycaster.intersectObject(this._terrainMesh);
    if (hits.length > 0) {
      this._teleportMarker.position.copy(hits[0].point);
      this._teleportMarker.position.y += 0.1;
      this._teleportMarker.visible = true;
    }
  }

  /* ═══════════ explosions & damage ═══════════ */

  private _createExplosion(pos: THREE.Vector3, weapon: WeaponDef): void {
    // Deform terrain
    this._deformTerrain(pos.x, pos.z, weapon.radius * 0.8, weapon.radius * 0.5);

    // Damage worms
    for (const worm of this._worms) {
      if (!worm.alive) continue;
      const dist = worm.pos.distanceTo(pos);
      if (dist < weapon.radius + WORM_RADIUS) {
        const falloff = 1 - dist / (weapon.radius + WORM_RADIUS);
        const damage = Math.ceil(weapon.damage * falloff);
        this._damageWorm(worm, damage, pos, weapon.knockback * falloff);
      }
    }

    // Multi-layer explosion visual
    // Inner white-hot core
    const coreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(weapon.radius * 0.25, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffee, transparent: true, opacity: 1.0 }),
    );
    coreMesh.position.copy(pos);
    this._scene.add(coreMesh);

    // Outer fireball
    const explosionMesh = new THREE.Mesh(
      new THREE.SphereGeometry(weapon.radius * 0.5, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.85 }),
    );
    explosionMesh.position.copy(pos);
    this._scene.add(explosionMesh);

    // Strong point light + secondary fill
    const explosionLight = new THREE.PointLight(0xff6600, 8, weapon.radius * 6);
    explosionLight.position.copy(pos);
    this._scene.add(explosionLight);

    const fillLight = new THREE.PointLight(0xff2200, 3, weapon.radius * 3);
    fillLight.position.copy(pos).add(new THREE.Vector3(0, 2, 0));
    this._scene.add(fillLight);

    // Shockwave ring (ground-hugging)
    const ringGeo = new THREE.RingGeometry(0.1, weapon.radius * 1.2, 48);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: 0xffaa44, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
    }));
    ring.position.copy(pos);
    ring.rotation.x = -Math.PI / 2;
    this._scene.add(ring);

    this._explosions.push({
      pos: pos.clone(),
      radius: weapon.radius,
      timer: 0,
      maxTimer: 1.0,
      mesh: explosionMesh,
      light: explosionLight,
      ring,
    });

    // Remove core and fill light after brief flash
    setTimeout(() => {
      this._scene.remove(coreMesh);
      coreMesh.geometry.dispose();
      (coreMesh.material as THREE.Material).dispose();
      this._scene.remove(fillLight);
    }, 150);

    // Rising smoke column
    for (let s = 0; s < 6; s++) {
      const delay = s * 80;
      setTimeout(() => {
        if (this._destroyed) return;
        const smokeGeo = new THREE.SphereGeometry(weapon.radius * 0.2 + s * 0.15, 12, 12);
        const smokeMat = new THREE.MeshBasicMaterial({
          color: 0x444444, transparent: true, opacity: 0.4, depthWrite: false,
        });
        const smoke = new THREE.Mesh(smokeGeo, smokeMat);
        smoke.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 1 + s * 0.8, (Math.random() - 0.5) * 0.5));
        this._scene.add(smoke);
        this._smokeTrails.push({ pos: smoke.position.clone(), life: 2.0 + s * 0.3, mesh: smoke });
      }, delay);
    }

    // Multi-color particles — layered for realism
    // White-hot core sparks
    this._spawnExplosionParticles(pos, weapon.radius * 0.2, new THREE.Color(0xffffff), 6 + weapon.radius);
    // Bright yellow fire
    this._spawnExplosionParticles(pos, weapon.radius * 0.4, new THREE.Color(0xffdd00), 12 + weapon.radius * 3);
    // Orange fire
    this._spawnExplosionParticles(pos, weapon.radius * 0.7, new THREE.Color(0xff6600), 20 + weapon.radius * 4);
    // Dark red embers
    this._spawnExplosionParticles(pos, weapon.radius, new THREE.Color(0xcc2200), 15 + weapon.radius * 2);
    // Debris (terrain-colored)
    const debrisColor = this._mapType === "arctic" ? 0xbbccdd : this._mapType === "desert" ? 0xccaa77 : this._mapType === "volcanic" ? 0x333333 : 0x553311;
    this._spawnExplosionParticles(pos, weapon.radius * 0.8, new THREE.Color(debrisColor), 25);
    // Upward ember shower
    for (let e = 0; e < 8 + weapon.radius * 2; e++) {
      this._particles.push({
        pos: pos.clone(),
        vel: new THREE.Vector3((Math.random() - 0.5) * 3, 5 + Math.random() * 8, (Math.random() - 0.5) * 3),
        life: 1.5 + Math.random() * 1.5,
        maxLife: 3,
        color: new THREE.Color(0xff8800).lerp(new THREE.Color(0xffee00), Math.random()),
        size: 0.05 + Math.random() * 0.1,
      });
    }

    // Sound
    this._playExplosionSound(weapon.radius);

    // Holy Hand Grenade hallelujah sound
    if (weapon.name === "Holy Hand Grenade") {
      try {
        const ctx = this._getAudioCtx();
        const now = ctx.currentTime;
        const chords = [523, 659, 784, 1047]; // C E G C (major chord rising)
        for (let ci = 0; ci < chords.length; ci++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(chords[ci], now + ci * 0.15);
          gain.gain.setValueAtTime(0.08, now + ci * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + ci * 0.15 + 0.8);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(now + ci * 0.15); osc.stop(now + ci * 0.15 + 0.8);
        }
      } catch (_) {}
    }

    // Cluster bombs
    if (weapon.clusterCount && weapon.clusterCount > 0) {
      for (let i = 0; i < weapon.clusterCount; i++) {
        const angle = (i / weapon.clusterCount) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 8 + Math.random() * 6;
        const clusterVel = new THREE.Vector3(
          Math.cos(angle) * speed,
          6 + Math.random() * 4,
          Math.sin(angle) * speed,
        );
        const clusterMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0x44aa44, emissive: 0x224422, emissiveIntensity: 0.5 }),
        );
        clusterMesh.position.copy(pos);
        this._scene.add(clusterMesh);

        const clusterWeapon: WeaponDef = {
          ...weapon,
          clusterCount: 0,
          damage: weapon.damage * 0.6,
          radius: weapon.radius * 0.7,
        };

        this._projectiles.push({
          mesh: clusterMesh,
          pos: pos.clone(),
          vel: clusterVel,
          weapon: clusterWeapon,
          fuseTimer: 1.5 + Math.random(),
          bounces: 0,
          owner: this._getCurrentWorm()!,
          trail: null,
          trailPositions: [],
          age: 0,
        });
      }
    }

    // Screen shake proportional to explosion size
    this._shakeIntensity = Math.max(this._shakeIntensity, weapon.radius * 0.15);

    // Scorch terrain colors at crater
    this._scorchTerrain(pos.x, pos.z, weapon.radius * 0.8);

    // Check oil barrel chain explosions
    this._checkBarrelDamage(pos, weapon.radius);

    // Destroy nearby trees
    this._checkTreeDestruction(pos, weapon.radius);

    // 3D terrain debris
    this._spawnDebris(pos, Math.floor(4 + weapon.radius * 2));

    // Flinch nearby worms
    this._triggerFlinch(pos, weapon.radius);

    // Fire zones for fire weapons
    if (weapon.name === "Flaming Arrow" || weapon.name === "Holy Water" || weapon.name === "Meteor") {
      this._spawnFireZone(pos.clone(), weapon.radius * 0.6);
    }

    // Poison Strike — poison all hit worms
    if (weapon.name === "Poison Strike") {
      for (const w of this._worms) {
        if (!w.alive) continue;
        if (w.pos.distanceTo(pos) < weapon.radius + WORM_RADIUS) {
          w.poisoned = 5;
          this._addFloatingText("POISONED!", w.pos.clone().add(new THREE.Vector3(0, 2.5, 0)), "#88ff00");
        }
      }
    }

    // Freeze Blast — freeze all hit worms
    if (weapon.name === "Freeze Blast") {
      for (const w of this._worms) {
        if (!w.alive) continue;
        if (w.pos.distanceTo(pos) < weapon.radius + WORM_RADIUS) {
          w.frozen = 1;
          this._addFloatingText("FROZEN!", w.pos.clone().add(new THREE.Vector3(0, 2.5, 0)), "#88ddff");
          // Visual ice effect
          this._spawnExplosionParticles(w.pos, 1, new THREE.Color(0x88ddff), 15);
        }
      }
    }

    // Earthquake — apply to ALL worms on the map
    if (weapon.name === "Earthquake") {
      for (const w of this._worms) {
        if (!w.alive) continue;
        w.vel.y += 6 + Math.random() * 4;
        w.vel.x += (Math.random() - 0.5) * 8;
        w.vel.z += (Math.random() - 0.5) * 8;
        w.grounded = false;
        const eqDmg = Math.floor(10 + Math.random() * 10);
        w.hp -= eqDmg;
        this._addFloatingText(`-${eqDmg}`, w.pos.clone().add(new THREE.Vector3(0, 2, 0)), "#ffaa00");
        if (w.hp <= 0) {
          w.hp = 0;
          w.alive = false;
          this._spawnGravestone(w);
        }
      }
      this._shakeIntensity = 2.0;
    }
  }

  private _damageWorm(worm: Worm, damage: number, sourcePos: THREE.Vector3, knockback: number): void {
    // Track stats
    const activeWorm = this._getCurrentWorm();
    if (activeWorm && activeWorm !== worm) {
      const stats = this._wormStats.get(activeWorm.name);
      if (stats) {
        stats.damageDealt += damage;
        stats.biggestHit = Math.max(stats.biggestHit, damage);
      }
      const targetStats = this._wormStats.get(worm.name) || { damageDealt: 0, kills: 0, damageReceived: 0, biggestHit: 0 };
      targetStats.damageReceived += damage;
      this._wormStats.set(worm.name, targetStats);
    }

    worm.hp -= damage;
    const dir = worm.pos.clone().sub(sourcePos).normalize();
    dir.y = Math.max(0.3, dir.y + 0.5);
    worm.vel.add(dir.multiplyScalar(knockback));
    worm.grounded = false;
    worm.onGround = false;

    // Floating damage text - scale size for big hits
    const dmgSize = damage >= 50 ? "32px" : damage >= 30 ? "26px" : "22px";
    const dmgEl = document.createElement("div");
    dmgEl.style.cssText = `
      position: absolute; font-size: ${dmgSize}; font-weight: bold; color: #ff4444;
      text-shadow: 0 0 6px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5);
      pointer-events: none; white-space: nowrap; z-index: 53;
    `;
    dmgEl.textContent = `-${damage}`;
    this._hudContainer.appendChild(dmgEl);
    this._floatingTexts.push({ el: dmgEl, timer: 1.5, worldPos: worm.pos.clone().add(new THREE.Vector3(0, 2, 0)) });

    this._playWormVoice(worm, "damage");
    this._totalDamageThisTurn += damage;

    if (worm.hp <= 0) {
      worm.hp = 0;
      worm.alive = false;
      // Death animation - worm flies away
      worm.vel.y += 10;
      this._addFloatingText(`☠ ${worm.name}`, worm.pos.clone().add(new THREE.Vector3(0, 3, 0)), "#ff0000", 2);
      this._playWormVoice(worm, "death");
      // Spawn gravestone at death position
      this._spawnGravestone(worm);
      // Check team eliminations
      this._checkEliminations();
      // Track kill stat
      if (activeWorm && activeWorm !== worm) {
        const kStats = this._wormStats.get(activeWorm.name);
        if (kStats) kStats.kills++;
      }
      // Kill streak
      this._checkKillStreak(worm);
      // Slow-mo kill cam
      this._triggerSlowMo(worm.pos);
    }
  }

  private _spawnExplosionParticles(pos: THREE.Vector3, radius: number, color: THREE.Color, count: number): void {
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.5 + 0.5,
        (Math.random() - 0.5) * 2,
      ).normalize();
      const speed = radius * (2 + Math.random() * 4);

      this._particles.push({
        pos: pos.clone(),
        vel: dir.multiplyScalar(speed),
        life: 0.5 + Math.random() * 1.0,
        maxLife: 0.5 + Math.random() * 1.0,
        color: color.clone(),
        size: 0.15 + Math.random() * 0.3,
      });
    }
  }

  private _addFloatingText(text: string, worldPos: THREE.Vector3, color: string, duration = 1.5): void {
    const el = document.createElement("div");
    el.style.cssText = `
      position: absolute; font-size: 22px; font-weight: bold; color: ${color};
      text-shadow: 0 0 6px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5);
      pointer-events: none; white-space: nowrap; z-index: 53;
    `;
    el.textContent = text;
    this._hudContainer.appendChild(el);
    this._floatingTexts.push({ el, timer: duration, worldPos });
  }

  /* ═══════════ gravestone ═══════════ */

  private _spawnGravestone(worm: Worm): void {
    const g = new THREE.Group();

    // Stone slab
    const stone = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.9, 0.15, 3, 4, 1),
      new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.95 }),
    );
    stone.position.y = 0.45;
    stone.castShadow = true;
    g.add(stone);

    // Rounded top
    const top = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.95 }),
    );
    top.position.y = 0.9;
    g.add(top);

    // Cross on stone
    const crossV = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.35, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x888888 }),
    );
    crossV.position.set(0, 0.55, 0.08);
    g.add(crossV);
    const crossH = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.05, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x888888 }),
    );
    crossH.position.set(0, 0.6, 0.08);
    g.add(crossH);

    // Name label
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#aaa";
    ctx.fillText(worm.name, 64, 20);
    const tex = new THREE.CanvasTexture(canvas);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    label.position.y = 1.3;
    label.scale.set(1, 0.25, 1);
    g.add(label);

    const terrainH = this._getTerrainHeight(worm.pos.x, worm.pos.z);
    g.position.set(worm.pos.x, terrainH, worm.pos.z);
    g.rotation.y = Math.random() * 0.4 - 0.2;
    this._scene.add(g);
    this._gravestones.push({ mesh: g, pos: g.position.clone() });
  }

  /* ═══════════ AI system ═══════════ */

  private _isAiTurn(): boolean {
    return this._aiControlled[this._currentTeam] ?? false;
  }

  private _aiTakeTurn(dt: number): void {
    const worm = this._getCurrentWorm();
    if (!worm || !worm.alive) { this._endTurn(); return; }

    switch (this._aiState) {
      case "idle":
        // Start thinking
        this._aiState = "thinking";
        const thinkTime = this._aiDifficulty === "easy" ? 0.8 + Math.random() * 0.5 : this._aiDifficulty === "hard" ? 0.2 + Math.random() * 0.3 : 0.5 + Math.random() * 0.5;
        this._aiThinkTimer = thinkTime;
        this._aiTarget = this._aiFindBestTarget(worm);
        // Choose a weapon
        this._aiChooseWeapon(worm);
        break;

      case "thinking":
        this._aiThinkTimer -= dt;
        if (this._aiThinkTimer <= 0) {
          this._aiState = "moving";
          this._aiMoveTimer = 0.3 + Math.random() * 1.5;
        }
        break;

      case "moving":
        // Optionally move toward a better position
        this._aiMoveTimer -= dt;
        if (this._aiTarget && this._aiMoveTimer > 0 && worm.grounded) {
          const toTarget = this._aiTarget.pos.clone().sub(worm.pos);
          toTarget.y = 0;
          const dist = toTarget.length();
          if (dist > 8) {
            // Move closer
            toTarget.normalize();
            worm.pos.x += toTarget.x * 4 * dt;
            worm.pos.z += toTarget.z * 4 * dt;
            worm.facing = Math.atan2(toTarget.x, toTarget.z);
            const newH = this._getTerrainHeight(worm.pos.x, worm.pos.z);
            const slope = newH - (worm.pos.y - WORM_HEIGHT / 2);
            if (slope > 0 && slope < 1.5) worm.pos.y = newH + WORM_HEIGHT / 2;
            else if (slope >= 1.5) {
              worm.pos.x -= toTarget.x * 4 * dt;
              worm.pos.z -= toTarget.z * 4 * dt;
            }
          }
        }
        if (this._aiMoveTimer <= 0) {
          this._aiState = "aiming";
          this._aiAimTimer = 0.8 + Math.random() * 0.5;
          // Face target
          if (this._aiTarget) {
            const toT = this._aiTarget.pos.clone().sub(worm.pos);
            worm.facing = Math.atan2(toT.x, toT.z);
          }
        }
        break;

      case "aiming":
        this._aiAimTimer -= dt;
        // Calculate aim
        if (this._aiTarget) {
          const toT = this._aiTarget.pos.clone().sub(worm.pos);
          const hDist = Math.sqrt(toT.x * toT.x + toT.z * toT.z);
          const dY = toT.y;
          // Simple ballistic estimate
          const speed = 35;
          const g = Math.abs(GRAVITY);
          // Aim angle for ballistic trajectory — accuracy varies by difficulty
          const aimAngle = Math.atan2(dY + 0.5 * g * (hDist / speed) * (hDist / speed), hDist);
          const aimError = this._aiDifficulty === "easy" ? 0.35 : this._aiDifficulty === "hard" ? 0.05 : 0.15;
          worm.aimAngle = Math.max(-0.5, Math.min(1.0, aimAngle + (Math.random() - 0.5) * aimError));
          worm.facing = Math.atan2(toT.x, toT.z);

          // Set power based on distance — hard AI is more precise
          const powerError = this._aiDifficulty === "easy" ? 0.2 : this._aiDifficulty === "hard" ? 0.03 : 0.1;
          this._aimPower = Math.min(1, Math.max(0.3, hDist / 40 + (Math.random() - 0.5) * powerError));
        }

        if (this._aiAimTimer <= 0) {
          this._aiState = "firing";
        }
        break;

      case "firing":
        // Fire!
        const weapon = WEAPONS[this._selectedWeaponIndex];
        if (weapon.type === "teleport" || weapon.type === "rope") {
          // AI doesn't use utility weapons well, pick bazooka instead
          this._selectedWeaponIndex = 0;
        }
        this._fire();
        this._aiState = "idle";
        break;
    }
  }

  private _aiFindBestTarget(worm: Worm): Worm | null {
    let best: Worm | null = null;
    let bestScore = -Infinity;

    for (const target of this._worms) {
      if (!target.alive || target.teamIndex === worm.teamIndex) continue;
      const dist = worm.pos.distanceTo(target.pos);
      // Prefer closer targets with lower HP
      const score = (100 - target.hp) + (50 - Math.min(50, dist)) + (target.hp <= 30 ? 30 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = target;
      }
    }
    return best;
  }

  private _aiChooseWeapon(worm: Worm): void {
    if (!this._aiTarget) { this._selectedWeaponIndex = 0; return; }

    const dist = worm.pos.distanceTo(this._aiTarget.pos);
    const targetHp = this._aiTarget.hp;

    // Prefer super weapons on high HP targets at medium range
    if (targetHp > 60 && this._weaponAmmo[9] !== 0) {
      this._selectedWeaponIndex = 8; // Holy Hand Grenade
      return;
    }

    if (dist < 3) {
      // Melee range
      const meleeIdx = [3, 4, 11]; // Fire Punch, Baseball Bat, Prod
      for (const idx of meleeIdx) {
        if (this._weaponAmmo[idx] !== 0) {
          this._selectedWeaponIndex = idx;
          return;
        }
      }
    }

    if (dist < 10 && this._weaponAmmo[2] !== 0) {
      this._selectedWeaponIndex = 2; // Shotgun
      return;
    }

    if (dist > 20 && this._weaponAmmo[7] !== 0) {
      this._selectedWeaponIndex = 7; // Air Strike
      return;
    }

    // Default: cycle between bazooka and grenade
    if (Math.random() < 0.5 || this._weaponAmmo[1] === 0) {
      this._selectedWeaponIndex = 0; // Bazooka
    } else {
      this._selectedWeaponIndex = 1; // Grenade
    }
  }

  /* ═══════════ turn announcement ═══════════ */

  private _showTurnAnnouncement(worm: Worm): void {
    if (this._turnAnnouncement) this._turnAnnouncement.remove();

    this._turnAnnouncement = document.createElement("div");
    const teamHex = `#${TEAM_COLORS[worm.teamIndex].toString(16).padStart(6, "0")}`;
    const isAI = this._isAiTurn();
    this._turnAnnouncement.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      z-index: 54; pointer-events: none; text-align: center;
      animation: worms3d-announce 1.5s ease-out forwards;
    `;
    this._turnAnnouncement.innerHTML = `
      <style>
        @keyframes worms3d-announce {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          30% { transform: translate(-50%, -50%) scale(1); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -60%) scale(0.95); }
        }
      </style>
      <div style="font-size:40px;font-weight:bold;color:${teamHex};text-shadow:0 0 20px ${teamHex},0 3px 6px rgba(0,0,0,0.6);">
        ${worm.name}
      </div>
      <div style="font-size:18px;color:#ccc;text-shadow:0 2px 4px rgba(0,0,0,0.5);margin-top:5px;">
        ${isAI ? "AI thinking..." : this._humanTeams.filter(Boolean).length > 1 ? `Player ${this._humanTeams.slice(0, worm.teamIndex + 1).filter(Boolean).length}'s Turn!` : "Your Turn!"}
      </div>
    `;
    this._hudContainer.appendChild(this._turnAnnouncement);
    this._turnAnnouncementTimer = 1.5;
  }

  /* ═══════════ trajectory preview ═══════════ */

  private _updateTrajectoryPreview(): void {
    // Remove old
    if (this._trajectoryLine) {
      this._scene.remove(this._trajectoryLine);
      this._trajectoryLine.geometry.dispose();
      this._trajectoryLine = null;
    }

    const worm = this._getCurrentWorm();
    if (!worm || this._phase !== "aiming" || this._isAiTurn()) return;

    const weapon = WEAPONS[this._selectedWeaponIndex];
    if (weapon.type !== "projectile" && weapon.type !== "grenade") return;

    const dir = new THREE.Vector3(
      Math.sin(worm.facing) * Math.cos(worm.aimAngle),
      Math.sin(worm.aimAngle),
      Math.cos(worm.facing) * Math.cos(worm.aimAngle),
    ).normalize();

    const speed = 20 + this._aimPower * 35;
    const vel = dir.clone().multiplyScalar(speed);
    const pos = worm.pos.clone().add(new THREE.Vector3(0, 0.5, 0));

    const points: THREE.Vector3[] = [];
    const simDt = 0.05;
    const simVel = vel.clone();
    const simPos = pos.clone();

    for (let step = 0; step < 60; step++) {
      points.push(simPos.clone());
      simVel.y += GRAVITY * simDt;
      if (weapon.type === "projectile") simVel.x += this._wind * 8 * simDt;
      simPos.add(simVel.clone().multiplyScalar(simDt));

      const tH = this._getTerrainHeight(simPos.x, simPos.z);
      if (simPos.y <= tH || simPos.y < WATER_LEVEL) break;
    }

    if (points.length > 1) {
      // Dashed line using alternating visible segments
      const dashPoints: THREE.Vector3[] = [];
      for (let i = 0; i < points.length; i++) {
        if (i % 3 < 2) dashPoints.push(points[i]); // 2 on, 1 off
      }
      if (dashPoints.length > 1) {
        const geo = new THREE.BufferGeometry().setFromPoints(dashPoints);
        this._trajectoryLine = new THREE.Line(geo, new THREE.LineBasicMaterial({
          color: 0xffff44, transparent: true, opacity: 0.5, linewidth: 1,
        }));
        this._scene.add(this._trajectoryLine);
      }
    }
  }

  /* ═══════════ supply crates ═══════════ */

  private _spawnCrate(): void {
    const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.5;
    const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.5;
    const h = this._getTerrainHeight(x, z);
    if (h < 1) return; // don't drop into water

    const g = new THREE.Group();

    // Crate box
    const typeRoll = Math.random();
    const type: SupplyCrate["type"] = typeRoll < 0.4 ? "weapon" : typeRoll < 0.7 ? "health" : "utility";
    const crateColor = type === "weapon" ? 0x8B4513 : type === "health" ? 0xcc2222 : 0x2255aa;

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.8, 0.8, 3, 3, 3),
      new THREE.MeshStandardMaterial({ color: crateColor, roughness: 0.7 }),
    );
    box.castShadow = true;
    g.add(box);

    // Cross or symbol on front
    const symbol = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.3),
      new THREE.MeshBasicMaterial({
        color: type === "health" ? 0xffffff : 0xffdd44,
        transparent: true, opacity: 0.9,
      }),
    );
    symbol.position.z = 0.41;
    g.add(symbol);

    // Parachute
    const chute = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({
        color: 0xeeeeee, side: THREE.DoubleSide, transparent: true, opacity: 0.8,
      }),
    );
    chute.position.y = 2;
    chute.name = "chute";
    g.add(chute);

    // Ropes
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const ropeGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(a) * 0.3, 0.4, Math.sin(a) * 0.3),
        new THREE.Vector3(Math.cos(a) * 1.0, 2, Math.sin(a) * 1.0),
      ]);
      const rope = new THREE.Line(ropeGeo, new THREE.LineBasicMaterial({ color: 0x886644 }));
      g.add(rope);
    }

    const startY = 50;
    g.position.set(x, startY, z);
    this._scene.add(g);

    this._supplyCrates.push({
      mesh: g,
      pos: new THREE.Vector3(x, startY, z),
      vel: new THREE.Vector3(0, -4, 0), // slow fall with parachute
      landed: false,
      type,
      parachute: chute,
    });

    this._addFloatingText("Supply Drop!", new THREE.Vector3(x, startY - 5, z), "#ffdd44", 2);
  }

  private _updateCrates(dt: number): void {
    for (let i = this._supplyCrates.length - 1; i >= 0; i--) {
      const c = this._supplyCrates[i];

      if (!c.landed) {
        c.vel.y = Math.max(c.vel.y, -4); // parachute drag
        c.pos.add(c.vel.clone().multiplyScalar(dt));
        c.mesh.position.copy(c.pos);
        c.mesh.rotation.y += dt * 0.5;

        // Parachute sway
        c.parachute.rotation.x = Math.sin(this._time * 2) * 0.1;
        c.parachute.rotation.z = Math.cos(this._time * 1.5) * 0.1;

        const terrainH = this._getTerrainHeight(c.pos.x, c.pos.z);
        if (c.pos.y <= terrainH + 0.4) {
          c.pos.y = terrainH + 0.4;
          c.landed = true;
          c.vel.set(0, 0, 0);
          // Remove parachute
          c.mesh.remove(c.parachute);
          this._playSound(300, 0.1, "sine", 0.15);
        }

        if (c.pos.y < WATER_LEVEL) {
          this._scene.remove(c.mesh);
          this._supplyCrates.splice(i, 1);
          continue;
        }
      }

      // Check if a worm picks it up
      if (c.landed) {
        for (const worm of this._worms) {
          if (!worm.alive) continue;
          if (worm.pos.distanceTo(c.pos) < 1.5) {
            this._collectCrate(c, worm);
            this._scene.remove(c.mesh);
            this._supplyCrates.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  private _collectCrate(crate: SupplyCrate, worm: Worm): void {
    if (crate.type === "health") {
      const heal = 25;
      worm.hp = Math.min(worm.maxHp, worm.hp + heal);
      this._addFloatingText(`+${heal} HP`, worm.pos.clone().add(new THREE.Vector3(0, 2, 0)), "#44ff44");
      this._playVoice("collect");
    } else if (crate.type === "weapon") {
      // Give ammo for a random limited weapon
      const limitedWeapons = WEAPONS.map((w, i) => ({ w, i })).filter((x) => x.w.ammo > 0);
      if (limitedWeapons.length > 0) {
        const pick = limitedWeapons[Math.floor(Math.random() * limitedWeapons.length)];
        this._weaponAmmo[pick.i] += 2;
        this._addFloatingText(`+2 ${pick.w.name}`, worm.pos.clone().add(new THREE.Vector3(0, 2, 0)), "#ffdd44");
      }
      this._playVoice("collect");
    } else {
      // Utility: random bonus
      const bonus = Math.random();
      if (bonus < 0.5) {
        worm.hp = Math.min(150, worm.hp + 50); // over-heal!
        worm.maxHp = Math.max(worm.maxHp, worm.hp);
        this._addFloatingText("MEGA HP!", worm.pos.clone().add(new THREE.Vector3(0, 2, 0)), "#44ffff");
      } else {
        // Double damage next turn (just give super weapons)
        this._weaponAmmo[16] += 1; // Excalibur
        this._weaponAmmo[20] += 1; // Meteor
        this._addFloatingText("SUPER WEAPONS!", worm.pos.clone().add(new THREE.Vector3(0, 2, 0)), "#ff44ff");
      }
      this._playVoice("powerup");
    }
    this._playSound(600, 0.15, "sine", 0.2);
    this._spawnExplosionParticles(worm.pos, 1, new THREE.Color(0xffdd44), 15);
  }

  /* ═══════════ oil barrel damage ═══════════ */

  private _checkBarrelDamage(pos: THREE.Vector3, radius: number): void {
    for (const barrel of this._oilBarrels) {
      if (!barrel.alive) continue;
      const dist = barrel.pos.distanceTo(pos);
      if (dist < radius + 0.5) {
        barrel.hp -= 50;
        if (barrel.hp <= 0) {
          barrel.alive = false;
          barrel.mesh.visible = false;
          // Chain explosion!
          const barrelWeapon: WeaponDef = {
            name: "Barrel", icon: "", ammo: 0, damage: 60, radius: 5,
            type: "projectile", knockback: 20, description: "",
          };
          this._createExplosion(barrel.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), barrelWeapon);
          this._spawnExplosionParticles(barrel.pos, 3, new THREE.Color(0xff4400), 40);
          this._spawnExplosionParticles(barrel.pos, 2, new THREE.Color(0x111111), 25);
          this._addFloatingText("BARREL!", barrel.pos.clone().add(new THREE.Vector3(0, 3, 0)), "#ff8800", 2);
        }
      }
    }
  }

  /* ═══════════ slow-mo kill cam ═══════════ */

  private _triggerSlowMo(target: THREE.Vector3): void {
    this._slowMo = true;
    this._slowMoTimer = 1.5;
    this._slowMoTarget = target.clone();
    this._timeScale = 0.2;
  }

  /* ═══════════ kill streak ═══════════ */

  private _checkKillStreak(worm: Worm): void {
    if (this._lastKillTeam === this._currentTeam) {
      this._killStreak++;
    } else {
      this._killStreak = 1;
      this._lastKillTeam = this._currentTeam;
    }

    const streakTexts: Record<number, string> = {
      2: "DOUBLE KILL!",
      3: "TRIPLE KILL!",
      4: "MEGA KILL!",
      5: "ULTRA KILL!",
    };
    const text = streakTexts[this._killStreak];
    if (text) {
      this._addFloatingText(text, worm.pos.clone().add(new THREE.Vector3(0, 4, 0)), "#ff44ff", 2.5);
      this._playVoice("streak");
    }
  }

  /* ═══════════ worm voices ═══════════ */

  private _playVoice(type: "fire" | "damage" | "death" | "collect" | "powerup" | "streak" | "victory" | "jump"): void {
    try {
      const ctx = this._getAudioCtx();
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      switch (type) {
        case "fire":
          osc1.type = "square"; osc1.frequency.setValueAtTime(200, now);
          osc1.frequency.linearRampToValueAtTime(400, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc1.connect(gain); gain.connect(ctx.destination);
          osc1.start(now); osc1.stop(now + 0.15);
          break;
        case "damage":
          osc1.type = "sawtooth"; osc1.frequency.setValueAtTime(300, now);
          osc1.frequency.linearRampToValueAtTime(150, now + 0.2);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc1.connect(gain); gain.connect(ctx.destination);
          osc1.start(now); osc1.stop(now + 0.25);
          break;
        case "death":
          osc1.type = "sawtooth"; osc1.frequency.setValueAtTime(400, now);
          osc1.frequency.linearRampToValueAtTime(80, now + 0.5);
          osc2.type = "sine"; osc2.frequency.setValueAtTime(200, now);
          osc2.frequency.linearRampToValueAtTime(40, now + 0.5);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
          osc1.start(now); osc1.stop(now + 0.6);
          osc2.start(now); osc2.stop(now + 0.6);
          break;
        case "collect":
          osc1.type = "sine"; osc1.frequency.setValueAtTime(400, now);
          osc1.frequency.setValueAtTime(500, now + 0.08);
          osc1.frequency.setValueAtTime(600, now + 0.16);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc1.connect(gain); gain.connect(ctx.destination);
          osc1.start(now); osc1.stop(now + 0.3);
          break;
        case "powerup":
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(300, now);
          osc1.frequency.linearRampToValueAtTime(900, now + 0.4);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc1.connect(gain); gain.connect(ctx.destination);
          osc1.start(now); osc1.stop(now + 0.5);
          break;
        case "streak":
          osc1.type = "square";
          for (let i = 0; i < 4; i++) {
            osc1.frequency.setValueAtTime(400 + i * 100, now + i * 0.08);
          }
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc1.connect(gain); gain.connect(ctx.destination);
          osc1.start(now); osc1.stop(now + 0.4);
          break;
        case "victory":
          osc1.type = "sine";
          const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
          notes.forEach((f, i) => { osc1.frequency.setValueAtTime(f, now + i * 0.15); });
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          osc1.connect(gain); gain.connect(ctx.destination);
          osc1.start(now); osc1.stop(now + 0.8);
          break;
        case "jump":
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(300, now);
          osc1.frequency.linearRampToValueAtTime(500, now + 0.1);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc1.connect(gain); gain.connect(ctx.destination);
          osc1.start(now); osc1.stop(now + 0.12);
          break;
      }
    } catch (_) {}
  }

  /* ═══════════ pause menu ═══════════ */

  private _togglePause(): void {
    if (this._phase === "title" || this._phase === "victory") return;

    this._paused = !this._paused;
    if (this._paused) {
      this._pauseOverlay = document.createElement("div");
      this._pauseOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 55;
        background: rgba(0,0,0,0.75); display: flex; flex-direction: column;
        justify-content: center; align-items: center;
        font-family: 'Segoe UI', Arial, sans-serif; pointer-events: auto;
      `;
      const btnStyle = `padding:14px 50px;font-size:18px;color:#fff;border-radius:8px;cursor:pointer;
        margin-bottom:10px;transition:transform 0.15s,background 0.2s;width:260px;text-align:center;box-sizing:border-box;`;
      const panelStyle = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:560px;max-height:80vh;background:linear-gradient(180deg,#1a1510,#0d0a06);border:2px solid #665533;
        border-radius:12px;padding:30px;overflow-y:auto;color:#ccbb99;font-size:14px;line-height:1.7;`;

      this._pauseOverlay.innerHTML = `
        <div id="w3d-pause-main" style="display:flex;flex-direction:column;align-items:center;">
          <div style="font-size:48px;font-weight:bold;color:#ffd700;text-shadow:0 0 20px rgba(255,215,0,0.4);margin-bottom:8px;">
            PAUSED
          </div>
          <div style="color:#886633;font-size:14px;margin-bottom:24px;">Press ESC to return to battle</div>
          <div id="w3d-resume" style="${btnStyle}background:linear-gradient(135deg,#446600,#88aa22);border:2px solid #aacc44;font-weight:bold;"
            onmouseenter="this.style.transform='scale(1.05)'" onmouseleave="this.style.transform='scale(1)'">
            Resume
          </div>
          <div id="w3d-controls-btn" style="${btnStyle}background:rgba(100,80,40,0.4);border:1px solid #665533;"
            onmouseenter="this.style.transform='scale(1.05)'" onmouseleave="this.style.transform='scale(1)'">
            Controls
          </div>
          <div id="w3d-intro-btn" style="${btnStyle}background:rgba(100,80,40,0.4);border:1px solid #665533;"
            onmouseenter="this.style.transform='scale(1.05)'" onmouseleave="this.style.transform='scale(1)'">
            Introduction
          </div>
          <div id="w3d-quit" style="${btnStyle}background:rgba(150,40,40,0.3);border:1px solid #884444;color:#ff8866;margin-top:10px;"
            onmouseenter="this.style.transform='scale(1.05)'" onmouseleave="this.style.transform='scale(1)'">
            Quit to Menu
          </div>
        </div>
        <div id="w3d-controls-panel" style="${panelStyle}display:none;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h2 style="margin:0;color:#ffd700;font-size:24px;">Controls</h2>
            <div id="w3d-controls-back" style="padding:6px 18px;background:rgba(100,80,40,0.5);border:1px solid #665533;
              border-radius:6px;cursor:pointer;color:#ccaa66;font-size:13px;">&#8592; Back</div>
          </div>
          <h3 style="color:#ddbb66;margin:16px 0 8px;">Movement</h3>
          <div><b style="color:#ffd700">W/A/S/D</b> — Move forward, left, backward, right</div>
          <div><b style="color:#ffd700">Space</b> — Jump / Backflip (with S)</div>
          <div><b style="color:#ffd700">Shift</b> — Sprint (uses energy)</div>
          <h3 style="color:#ddbb66;margin:16px 0 8px;">Combat</h3>
          <div><b style="color:#ffd700">Mouse</b> — Look / Aim direction</div>
          <div><b style="color:#ffd700">Right-click drag</b> — Rotate camera</div>
          <div><b style="color:#ffd700">Enter (hold)</b> — Charge shot power</div>
          <div><b style="color:#ffd700">Enter (release)</b> — Fire weapon</div>
          <div><b style="color:#ffd700">Click</b> — Aim target (airstrikes, teleport)</div>
          <h3 style="color:#ddbb66;margin:16px 0 8px;">Weapons & Tools</h3>
          <div><b style="color:#ffd700">1-9</b> — Quick-select weapon by slot</div>
          <div><b style="color:#ffd700">Tab / Right-click</b> — Open weapon panel</div>
          <div><b style="color:#ffd700">U</b> — Undo movement (before firing)</div>
          <div><b style="color:#ffd700">G</b> — Skip turn</div>
          <h3 style="color:#ddbb66;margin:16px 0 8px;">Camera</h3>
          <div><b style="color:#ffd700">Scroll wheel</b> — Zoom in/out</div>
          <div><b style="color:#ffd700">Q / E</b> — Rotate camera left/right</div>
          <div><b style="color:#ffd700">R / F</b> — Camera up/down (pitch)</div>
          <div><b style="color:#ffd700">F</b> — Toggle free camera mode</div>
          <div><b style="color:#ffd700">T</b> — Taunt</div>
          <h3 style="color:#ddbb66;margin:16px 0 8px;">System</h3>
          <div><b style="color:#ffd700">ESC</b> — Pause menu</div>
        </div>
        <div id="w3d-intro-panel" style="${panelStyle}display:none;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h2 style="margin:0;color:#ffd700;font-size:24px;">Introduction</h2>
            <div id="w3d-intro-back" style="padding:6px 18px;background:rgba(100,80,40,0.5);border:1px solid #665533;
              border-radius:6px;cursor:pointer;color:#ccaa66;font-size:13px;">&#8592; Back</div>
          </div>
          <h3 style="color:#ddbb66;margin:16px 0 8px;">What is Worms 3D?</h3>
          <div>Worms 3D is a turn-based artillery game set in the world of Camelot. Teams of medieval knights take turns moving across a 3D destructible landscape, aiming, and firing an arsenal of weapons to eliminate the opposition.</div>
          <h3 style="color:#ddbb66;margin:16px 0 8px;">Objective</h3>
          <div>Be the last team standing. Reduce enemy worms' HP to zero through weapon damage, fall damage, or by knocking them into the water. Use the terrain, wind, and your weapon arsenal strategically.</div>
          <h3 style="color:#ddbb66;margin:16px 0 8px;">Turn Structure</h3>
          <div>Each turn you have a time limit to move your worm and fire one weapon. After firing, you get a short retreat phase to move to safety. Then the next team takes their turn. Wind changes each turn and affects projectiles.</div>
          <h3 style="color:#ddbb66;margin:16px 0 8px;">Terrain & Environment</h3>
          <div>The island terrain is fully destructible — explosions carve craters, creating new paths and hazards. The map features medieval castles, ruins, trees, and rocks. Oil barrels can be detonated for chain explosions. Supply crates drop periodically with bonus weapons.</div>
          <h3 style="color:#ddbb66;margin:16px 0 8px;">Sudden Death</h3>
          <div>After the sudden death timer expires, all worms are set to 1 HP and the water begins to rise, forcing a dramatic endgame confrontation.</div>
          <h3 style="color:#ddbb66;margin:16px 0 8px;">Teams of Camelot</h3>
          <div><b style="color:#6699ff">Round Table</b> — Arthur, Lancelot, Gawain, Percival</div>
          <div><b style="color:#ff5555">Mordred's Host</b> — Mordred, Agravaine, Morgause, Gareth</div>
          <div><b style="color:#55ee77">Merlin's Circle</b> — Merlin, Nimue, Viviane, Taliesin</div>
          <div><b style="color:#ffcc44">Grail Knights</b> — Galahad, Bors, Tristan, Kay</div>
        </div>
      `;
      document.body.appendChild(this._pauseOverlay);

      const mainPanel = this._pauseOverlay.querySelector("#w3d-pause-main") as HTMLElement;
      const controlsPanel = this._pauseOverlay.querySelector("#w3d-controls-panel") as HTMLElement;
      const introPanel = this._pauseOverlay.querySelector("#w3d-intro-panel") as HTMLElement;

      this._pauseOverlay.querySelector("#w3d-resume")!.addEventListener("click", () => this._togglePause());
      this._pauseOverlay.querySelector("#w3d-quit")!.addEventListener("click", () => {
        this._paused = false; this._pauseOverlay?.remove(); this._pauseOverlay = null;
        window.dispatchEvent(new Event("worms3dExit"));
      });
      this._pauseOverlay.querySelector("#w3d-controls-btn")!.addEventListener("click", () => {
        mainPanel.style.display = "none"; controlsPanel.style.display = "block";
      });
      this._pauseOverlay.querySelector("#w3d-intro-btn")!.addEventListener("click", () => {
        mainPanel.style.display = "none"; introPanel.style.display = "block";
      });
      this._pauseOverlay.querySelector("#w3d-controls-back")!.addEventListener("click", () => {
        controlsPanel.style.display = "none"; mainPanel.style.display = "flex";
      });
      this._pauseOverlay.querySelector("#w3d-intro-back")!.addEventListener("click", () => {
        introPanel.style.display = "none"; mainPanel.style.display = "flex";
      });
    } else {
      this._pauseOverlay?.remove();
      this._pauseOverlay = null;
    }
  }

  /* ═══════════ crater scorching ═══════════ */

  private _scorchTerrain(cx: number, cz: number, radius: number): void {
    const res = TERRAIN_RES;
    const half = TERRAIN_SIZE / 2;
    const colors = this._terrainGeo.attributes.color as THREE.BufferAttribute;
    if (!colors) return;

    const minX = Math.max(0, Math.floor(((cx - radius + half) / TERRAIN_SIZE) * res) - 1);
    const maxX = Math.min(res, Math.ceil(((cx + radius + half) / TERRAIN_SIZE) * res) + 1);
    const minZ = Math.max(0, Math.floor(((cz - radius + half) / TERRAIN_SIZE) * res) - 1);
    const maxZ = Math.min(res, Math.ceil(((cz + radius + half) / TERRAIN_SIZE) * res) + 1);

    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const worldX = (x / res) * TERRAIN_SIZE - half;
        const worldZ = (z / res) * TERRAIN_SIZE - half;
        const dx = worldX - cx;
        const dz = worldZ - cz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < radius) {
          const factor = (1 - dist / radius) * 0.6;
          const idx = z * (res + 1) + x;
          // Darken toward scorched brown/black
          colors.setXYZ(idx,
            colors.getX(idx) * (1 - factor) + 0.15 * factor,
            colors.getY(idx) * (1 - factor) + 0.1 * factor,
            colors.getZ(idx) * (1 - factor) + 0.05 * factor,
          );
        }
      }
    }
    colors.needsUpdate = true;
  }

  /* ═══════════ map themes ═══════════ */

  private _applyMapTheme(): void {
    const skyMat = this._skyDome.material as THREE.ShaderMaterial;
    const fogColor = new THREE.Color();

    switch (this._mapType) {
      case "volcanic":
        skyMat.uniforms.topColor.value.set(0x220000);
        skyMat.uniforms.midColor.value.set(0x553322);
        skyMat.uniforms.bottomColor.value.set(0xff4400);
        fogColor.set(0x442211);
        this._scene.fog = new THREE.FogExp2(0x442211, 0.008);
        this._sunLight.color.set(0xff8844);
        this._sunLight.intensity = 1.8;
        // Recolor terrain toward volcanic
        this._recolorTerrain("volcanic");
        // Lava water
        (this._waterMesh.material as THREE.ShaderMaterial).uniforms.uWaterColor.value.set(0xff4400);
        (this._waterMesh.material as THREE.ShaderMaterial).uniforms.uDeepColor.value.set(0x881100);
        (this._waterMesh.material as THREE.ShaderMaterial).uniforms.uFoamColor.value.set(0xffaa44);
        break;
      case "arctic":
        skyMat.uniforms.topColor.value.set(0x223344);
        skyMat.uniforms.midColor.value.set(0xaabbcc);
        skyMat.uniforms.bottomColor.value.set(0xddeeff);
        this._scene.fog = new THREE.FogExp2(0xccddee, 0.005);
        this._sunLight.color.set(0xddeeff);
        this._sunLight.intensity = 2.0;
        this._recolorTerrain("arctic");
        (this._waterMesh.material as THREE.ShaderMaterial).uniforms.uWaterColor.value.set(0x4488aa);
        (this._waterMesh.material as THREE.ShaderMaterial).uniforms.uDeepColor.value.set(0x223344);
        break;
      case "desert":
        skyMat.uniforms.topColor.value.set(0x4466aa);
        skyMat.uniforms.midColor.value.set(0xddbb88);
        skyMat.uniforms.bottomColor.value.set(0xffddaa);
        this._scene.fog = new THREE.FogExp2(0xddcc99, 0.004);
        this._sunLight.color.set(0xffeecc);
        this._sunLight.intensity = 3.0;
        this._recolorTerrain("desert");
        (this._waterMesh.material as THREE.ShaderMaterial).uniforms.uWaterColor.value.set(0x88aacc);
        (this._waterMesh.material as THREE.ShaderMaterial).uniforms.uDeepColor.value.set(0x445566);
        break;
      case "wasteland":
        this._scene.background = new THREE.Color(0x665544);
        this._scene.fog = new THREE.FogExp2(0x887766, 0.008);
        this._sunLight.color.set(0xffaa66);
        this._sunLight.intensity = 2.0;
        this._ambientLight.color.set(0x776655);
        this._ambientLight.intensity = 0.5;
        this._recolorTerrain("wasteland");
        break;
      case "enchanted":
        this._scene.background = new THREE.Color(0x2a1a4a);
        this._scene.fog = new THREE.FogExp2(0x443366, 0.005);
        this._sunLight.color.set(0xccaaff);
        this._sunLight.intensity = 2.0;
        this._ambientLight.color.set(0x6644aa);
        this._ambientLight.intensity = 0.9;
        this._recolorTerrain("enchanted");
        break;
      case "volcanic_isle":
        this._scene.background = new THREE.Color(0x331100);
        this._scene.fog = new THREE.FogExp2(0x442200, 0.009);
        this._sunLight.color.set(0xff6622);
        this._sunLight.intensity = 3.0;
        this._ambientLight.color.set(0x883300);
        this._ambientLight.intensity = 0.6;
        this._recolorTerrain("volcanic_isle");
        (this._waterMesh.material as THREE.ShaderMaterial).uniforms.uWaterColor.value.set(0xff4400);
        (this._waterMesh.material as THREE.ShaderMaterial).uniforms.uDeepColor.value.set(0x881100);
        (this._waterMesh.material as THREE.ShaderMaterial).uniforms.uFoamColor.value.set(0xffaa44);
        break;
      default: // island - already set
        break;
    }
  }

  private _recolorTerrain(theme: "volcanic" | "arctic" | "desert" | "wasteland" | "enchanted" | "volcanic_isle"): void {
    const positions = this._terrainGeo.attributes.position;
    const colors = this._terrainGeo.attributes.color as THREE.BufferAttribute;

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      let color: THREE.Color;

      if (theme === "volcanic") {
        if (y < WATER_LEVEL + 0.5) color = new THREE.Color(0x222222);
        else if (y < 3) color = new THREE.Color(0x333333).lerp(new THREE.Color(0x554433), (y - WATER_LEVEL) / 3);
        else if (y < 8) color = new THREE.Color(0x443322).lerp(new THREE.Color(0x332211), (y - 3) / 5);
        else color = new THREE.Color(0x221111).lerp(new THREE.Color(0x442200), Math.min(1, (y - 8) / 6));
      } else if (theme === "arctic") {
        if (y < WATER_LEVEL + 0.5) color = new THREE.Color(0x99aabb);
        else if (y < 3) color = new THREE.Color(0x99aabb).lerp(new THREE.Color(0xccddee), (y - WATER_LEVEL) / 3);
        else if (y < 8) color = new THREE.Color(0xaabbcc).lerp(new THREE.Color(0xddeeff), (y - 3) / 5);
        else color = new THREE.Color(0xeeeeff);
      } else if (theme === "wasteland") {
        if (y < WATER_LEVEL + 0.5) color = new THREE.Color(0x443322);
        else if (y < 3) color = new THREE.Color(0x554433).lerp(new THREE.Color(0x665544), (y - WATER_LEVEL) / 3);
        else if (y < 8) color = new THREE.Color(0x665544).lerp(new THREE.Color(0x776655), (y - 3) / 5);
        else color = new THREE.Color(0x554433).lerp(new THREE.Color(0x443322), Math.min(1, (y - 8) / 6));
      } else if (theme === "enchanted") {
        if (y < WATER_LEVEL + 0.5) color = new THREE.Color(0x221144);
        else if (y < 3) color = new THREE.Color(0x332255).lerp(new THREE.Color(0x225522), (y - WATER_LEVEL) / 3);
        else if (y < 8) color = new THREE.Color(0x226633).lerp(new THREE.Color(0x338844), (y - 3) / 5);
        else color = new THREE.Color(0x44aa55).lerp(new THREE.Color(0x336644), Math.min(1, (y - 8) / 6));
      } else if (theme === "volcanic_isle") {
        if (y < WATER_LEVEL + 0.5) color = new THREE.Color(0x221100);
        else if (y < 3) color = new THREE.Color(0x331100).lerp(new THREE.Color(0x442200), (y - WATER_LEVEL) / 3);
        else if (y < 8) color = new THREE.Color(0x553311).lerp(new THREE.Color(0x442200), (y - 3) / 5);
        else color = new THREE.Color(0x331100).lerp(new THREE.Color(0x551100), Math.min(1, (y - 8) / 6));
      } else { // desert
        if (y < WATER_LEVEL + 0.5) color = new THREE.Color(0xccaa77);
        else if (y < 3) color = new THREE.Color(0xccaa77).lerp(new THREE.Color(0xddbb88), (y - WATER_LEVEL) / 3);
        else if (y < 8) color = new THREE.Color(0xddbb88).lerp(new THREE.Color(0xccaa66), (y - 3) / 5);
        else color = new THREE.Color(0xaa8855).lerp(new THREE.Color(0x887744), Math.min(1, (y - 8) / 6));
      }

      const v = (Math.random() - 0.5) * 0.04;
      colors.setXYZ(i, Math.max(0, Math.min(1, color.r + v)), Math.max(0, Math.min(1, color.g + v)), Math.max(0, Math.min(1, color.b + v)));
    }
    colors.needsUpdate = true;
  }

  /* ═══════════ weather ═══════════ */

  private _setupWeather(): void {
    // Clean old
    if (this._raindrops) { this._scene.remove(this._raindrops); this._raindrops = null; }
    if (this._lightningFlash) { this._scene.remove(this._lightningFlash); this._lightningFlash = null; }

    if (this._weatherType === "clear") return;

    // Create rain/snow particle system
    const count = this._weatherType === "snow" ? 3000 : 5000;
    this._rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 150;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
    }
    this._rainGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const isSnow = this._weatherType === "snow";
    const mat = new THREE.PointsMaterial({
      color: isSnow ? 0xffffff : 0xaaccff,
      size: isSnow ? 0.15 : 0.05,
      transparent: true,
      opacity: isSnow ? 0.8 : 0.4,
      depthWrite: false,
    });
    this._raindrops = new THREE.Points(this._rainGeo, mat);
    this._scene.add(this._raindrops);

    // Lightning for storms
    if (this._weatherType === "storm") {
      this._lightningFlash = new THREE.DirectionalLight(0xffffff, 0);
      this._lightningFlash.position.set(0, 50, 0);
      this._scene.add(this._lightningFlash);
    }
  }

  private _updateWeather(dt: number): void {
    if (!this._rainGeo || !this._raindrops) return;

    const positions = this._rainGeo.attributes.position as THREE.BufferAttribute;
    const isSnow = this._weatherType === "snow";
    const fallSpeed = isSnow ? 3 : 20;
    const windDrift = this._wind * (isSnow ? 5 : 2);

    for (let i = 0; i < positions.count; i++) {
      let y = positions.getY(i) - fallSpeed * dt;
      let x = positions.getX(i) + windDrift * dt;
      if (isSnow) x += Math.sin(this._time * 2 + i) * 0.5 * dt; // snow flutter

      if (y < WATER_LEVEL) {
        y = 50 + Math.random() * 10;
        x = (Math.random() - 0.5) * 150;
        positions.setZ(i, (Math.random() - 0.5) * 150);
      }
      positions.setY(i, y);
      positions.setX(i, x);
    }
    positions.needsUpdate = true;

    // Lightning
    if (this._weatherType === "storm" && this._lightningFlash) {
      this._lightningTimer -= dt;
      if (this._lightningTimer <= 0) {
        this._lightningTimer = 3 + Math.random() * 8;
        this._lightningFlash.intensity = 8;

        // Lightning strike damage (rare, hits random terrain spot)
        if (Math.random() < 0.15) {
          const lx = (Math.random() - 0.5) * TERRAIN_SIZE * 0.6;
          const lz = (Math.random() - 0.5) * TERRAIN_SIZE * 0.6;
          const lh = this._getTerrainHeight(lx, lz);
          if (lh > WATER_LEVEL + 1) {
            const lightningWeapon: WeaponDef = {
              name: "Lightning", icon: "", ammo: 0, damage: 25, radius: 3,
              type: "strike", knockback: 15, description: "",
            };
            this._createExplosion(new THREE.Vector3(lx, lh, lz), lightningWeapon);
            this._addFloatingText("LIGHTNING!", new THREE.Vector3(lx, lh + 5, lz), "#aaddff", 2);
          }
        }

        // Thunder sound
        this._playSound(60, 0.3, "sawtooth", 0.8);
      }
      // Flash decay
      if (this._lightningFlash.intensity > 0) {
        this._lightningFlash.intensity *= Math.pow(0.05, dt);
        if (this._lightningFlash.intensity < 0.1) this._lightningFlash.intensity = 0;
      }
    }
  }

  /* ═══════════ wind particles ═══════════ */

  private _updateWindParticles(dt: number): void {
    // Spawn wind-blown leaves/dust
    if (Math.abs(this._wind) > 0.2 && Math.random() < Math.abs(this._wind) * 0.3) {
      const isSnowy = this._mapType === "arctic";
      const isDesert = this._mapType === "desert";
      const color = isSnowy ? 0xddeeff : isDesert ? 0xccaa77 : 0x88aa44;
      const geo = isDesert
        ? new THREE.PlaneGeometry(0.08, 0.08)
        : new THREE.PlaneGeometry(0.12, 0.08);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false,
      }));

      const camPos = this._camera.position;
      mesh.position.set(
        camPos.x + (Math.random() - 0.5) * 30,
        camPos.y + (Math.random() - 0.5) * 10,
        camPos.z + (Math.random() - 0.5) * 30,
      );
      this._scene.add(mesh);
      this._windParticles.push({
        pos: mesh.position.clone(),
        vel: new THREE.Vector3(this._wind * 12 + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3),
        life: 2 + Math.random() * 2,
        mesh,
      });
    }

    for (let i = this._windParticles.length - 1; i >= 0; i--) {
      const p = this._windParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this._scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this._windParticles.splice(i, 1);
        continue;
      }
      p.pos.add(p.vel.clone().multiplyScalar(dt));
      p.vel.y -= 0.5 * dt;
      p.mesh.position.copy(p.pos);
      p.mesh.rotation.x += dt * 3;
      p.mesh.rotation.z += dt * 2;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.6, p.life * 0.3);
    }
  }

  /* ═══════════ fire zones ═══════════ */

  private _spawnFireZone(pos: THREE.Vector3, radius: number): void {
    const light = new THREE.PointLight(0xff4400, 3, radius * 3);
    light.position.copy(pos).add(new THREE.Vector3(0, 0.5, 0));
    this._scene.add(light);

    const fireMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 0.1, 24),
      new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    fireMesh.position.copy(pos);
    this._scene.add(fireMesh);

    this._fireZones.push({ pos: pos.clone(), radius, life: 8, light, particles: fireMesh });
  }

  private _updateFireZones(dt: number): void {
    for (let i = this._fireZones.length - 1; i >= 0; i--) {
      const fz = this._fireZones[i];
      fz.life -= dt;

      if (fz.life <= 0) {
        this._scene.remove(fz.light);
        this._scene.remove(fz.particles);
        fz.particles.geometry.dispose();
        (fz.particles.material as THREE.Material).dispose();
        this._fireZones.splice(i, 1);
        continue;
      }

      // Flicker
      fz.light.intensity = 2 + Math.sin(this._time * 10) * 1 + Math.random() * 0.5;
      (fz.particles.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(this._time * 6) * 0.1;

      // Damage worms standing in fire
      for (const worm of this._worms) {
        if (!worm.alive) continue;
        const dist = new THREE.Vector2(worm.pos.x - fz.pos.x, worm.pos.z - fz.pos.z).length();
        if (dist < fz.radius && worm.pos.y < fz.pos.y + 2) {
          // 5 damage per second
          worm.hp -= 5 * dt;
          if (Math.random() < dt * 2) {
            this._spawnExplosionParticles(worm.pos.clone(), 0.3, new THREE.Color(0xff6600), 2);
          }
          if (worm.hp <= 0) {
            worm.hp = 0;
            worm.alive = false;
            this._addFloatingText(`🔥 ${worm.name}`, worm.pos.clone().add(new THREE.Vector3(0, 2, 0)), "#ff4400", 2);
            this._playVoice("death");
            this._spawnGravestone(worm);
            this._checkKillStreak(worm);
          }
        }
      }

      // Fire particles rising
      if (Math.random() < dt * 8) {
        this._spawnExplosionParticles(
          fz.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * fz.radius, 0.5, (Math.random() - 0.5) * fz.radius)),
          0.2, new THREE.Color(0xff6600), 1,
        );
      }

      // Heat shimmer particles (rising distortion-like sprites)
      if (Math.random() < dt * 3) {
        const shimmerGeo = new THREE.PlaneGeometry(0.5 + Math.random() * 0.5, 0.3);
        const shimmerMat = new THREE.MeshBasicMaterial({
          color: 0xffeecc, transparent: true, opacity: 0.04, side: THREE.DoubleSide,
          depthWrite: false, blending: THREE.AdditiveBlending,
        });
        const shimmer = new THREE.Mesh(shimmerGeo, shimmerMat);
        shimmer.position.copy(fz.pos).add(new THREE.Vector3((Math.random() - 0.5) * fz.radius, 1, (Math.random() - 0.5) * fz.radius));
        this._scene.add(shimmer);
        this._heatShimmerMeshes.push({ mesh: shimmer, pos: shimmer.position.clone() });
      }
    }
  }

  /* ═══════════ worm taunts ═══════════ */

  private _wormTaunt(): void {
    const worm = this._getCurrentWorm();
    if (!worm || this._isAiTurn()) return;

    const taunts = [
      "By the Round Table!",
      "For Camelot!",
      "Thou art doomed!",
      "Have at thee!",
      "I fart in your general direction!",
      "Tis but a scratch!",
      "Bring me a shrubbery!",
      "None shall pass!",
      "Run away! Run away!",
      "We are the knights who say NI!",
      "Your mother was a hamster!",
      "I shall smite thee!",
      "Excalibur hungers!",
      "The Grail shall be mine!",
      "Merlin would be proud!",
      "Chivalry is dead... like you!",
      "Prepare for glory!",
      "A plague upon thee!",
    ];

    const taunt = taunts[Math.floor(Math.random() * taunts.length)];
    this._addFloatingText(`"${taunt}"`, worm.pos.clone().add(new THREE.Vector3(0, 3, 0)), "#ffeeaa", 3);
    this._playVoice("fire"); // reuse as taunt sound
  }

  /* ═══════════ shooting stars ═══════════ */

  private _updateShootingStars(dt: number): void {
    // Occasionally spawn
    if (Math.random() < dt * 0.05) {
      const startPos = new THREE.Vector3(
        (Math.random() - 0.5) * 200,
        40 + Math.random() * 30,
        (Math.random() - 0.5) * 200,
      );
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        -10 - Math.random() * 10,
        (Math.random() - 0.5) * 40,
      );
      const geo = new THREE.BufferGeometry().setFromPoints([startPos.clone(), startPos.clone().add(vel.clone().normalize().multiplyScalar(-3))]);
      const trail = new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.6,
      }));
      this._scene.add(trail);
      this._shootingStars.push({ pos: startPos.clone(), vel, life: 1.5 + Math.random(), trail });
    }

    for (let i = this._shootingStars.length - 1; i >= 0; i--) {
      const s = this._shootingStars[i];
      s.life -= dt;
      if (s.life <= 0 || s.pos.y < 0) {
        this._scene.remove(s.trail);
        s.trail.geometry.dispose();
        this._shootingStars.splice(i, 1);
        continue;
      }
      s.pos.add(s.vel.clone().multiplyScalar(dt));
      const tailPos = s.pos.clone().add(s.vel.clone().normalize().multiplyScalar(-3));
      const newGeo = new THREE.BufferGeometry().setFromPoints([s.pos.clone(), tailPos]);
      s.trail.geometry.dispose();
      s.trail.geometry = newGeo;
      (s.trail.material as THREE.LineBasicMaterial).opacity = s.life * 0.4;
    }
  }

  /* ═══════════ footstep dust ═══════════ */

  private _spawnFootstepDust(pos: THREE.Vector3): void {
    const dustColor = this._mapType === "arctic" ? new THREE.Color(0xddeeff)
      : this._mapType === "desert" ? new THREE.Color(0xccaa77)
      : this._mapType === "volcanic" ? new THREE.Color(0x444444)
      : new THREE.Color(0x886644);

    for (let i = 0; i < 3; i++) {
      this._particles.push({
        pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.1, (Math.random() - 0.5) * 0.3)),
        vel: new THREE.Vector3((Math.random() - 0.5) * 1, 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 1),
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        color: dustColor.clone(),
        size: 0.1 + Math.random() * 0.1,
      });
    }
  }

  /* ═══════════ water splashes ═══════════ */

  private _spawnWaterSplash(pos: THREE.Vector3): void {
    // Ring splash
    const ringGeo = new THREE.RingGeometry(0.2, 1.5, 32);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: 0xaaddff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false,
    }));
    ring.position.set(pos.x, WATER_LEVEL + this._waterMesh.position.y + 0.1, pos.z);
    ring.rotation.x = -Math.PI / 2;
    this._scene.add(ring);
    this._splashes.push({ mesh: ring, timer: 0.8 });

    // Spray particles
    for (let i = 0; i < 12; i++) {
      this._particles.push({
        pos: new THREE.Vector3(pos.x, WATER_LEVEL + this._waterMesh.position.y, pos.z),
        vel: new THREE.Vector3((Math.random() - 0.5) * 4, 3 + Math.random() * 4, (Math.random() - 0.5) * 4),
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        color: new THREE.Color(0x88bbff),
        size: 0.1 + Math.random() * 0.15,
      });
    }

    this._playSound(150, 0.15, "sine", 0.3);
  }

  private _updateSplashes(dt: number): void {
    for (let i = this._splashes.length - 1; i >= 0; i--) {
      const s = this._splashes[i];
      s.timer -= dt;
      if (s.timer <= 0) {
        this._scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
        this._splashes.splice(i, 1);
        continue;
      }
      s.mesh.scale.setScalar(1 + (0.8 - s.timer) * 3);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = s.timer * 0.7;
    }
  }

  /* ═══════════ procedural music ═══════════ */

  private _startMusic(): void {
    try {
      const ctx = this._getAudioCtx();
      this._musicGain = ctx.createGain();
      this._musicGain.gain.setValueAtTime(0.03, ctx.currentTime);
      this._musicGain.connect(ctx.destination);

      // Create a medieval-ish drone
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(110, ctx.currentTime); // A2 drone
      osc1.connect(this._musicGain);
      osc1.start();
      this._musicOsc = osc1;

      // Second voice - fifth
      const osc2 = ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(165, ctx.currentTime); // E3
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.015, ctx.currentTime);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();

      this._musicPlaying = true;
    } catch (_) {}
  }

  private _stopMusic(): void {
    if (this._musicOsc) {
      try { this._musicOsc.stop(); } catch (_) {}
      this._musicOsc = null;
    }
    this._musicPlaying = false;
  }

  /* ═══════════ damage summary ═══════════ */

  private _showDamageSummary(): void {
    if (this._totalDamageThisTurn <= 0) return;

    const summary = document.createElement("div");
    summary.className = "hud-dynamic";
    summary.style.cssText = `
      position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%);
      background: rgba(10,10,20,0.85); border: 1px solid rgba(255,200,100,0.4);
      border-radius: 8px; padding: 8px 16px; color: #ffcc44; font-size: 14px;
      font-weight: bold; z-index: 53; pointer-events: none;
      animation: worms3d-announce 2s ease-out forwards;
    `;
    summary.textContent = `Total damage this turn: ${Math.round(this._totalDamageThisTurn)}`;
    this._hudContainer.appendChild(summary);
  }

  /* ═══════════ held weapon visual ═══════════ */

  private _updateWeaponModel(): void {
    const worm = this._getCurrentWorm();
    if (this._weaponModel) {
      this._scene.remove(this._weaponModel);
      this._weaponModel = null;
    }

    if (!worm || !worm.alive || this._phase === "title" || this._phase === "victory") return;

    const weapon = WEAPONS[this._selectedWeaponIndex];
    const g = new THREE.Group();

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.8 });

    if (weapon.type === "projectile" || weapon.type === "hitscan") {
      // Gun/launcher shape
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.7, 12), metalMat);
      barrel.rotation.z = -Math.PI / 2;
      barrel.position.x = 0.35;
      g.add(barrel);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.08), woodMat);
      stock.position.x = -0.05;
      g.add(stock);
    } else if (weapon.type === "grenade" || weapon.type === "placed") {
      // Round object in hand
      const bomb = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 12, 12),
        new THREE.MeshStandardMaterial({ color: weapon.type === "placed" ? 0xff2200 : 0x44aa44, emissive: 0x222222, emissiveIntensity: 0.3 }),
      );
      g.add(bomb);
    } else if (weapon.type === "melee") {
      // Sword/bat shape
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.02),
        weapon.name.includes("Bat") ? woodMat : metalMat);
      blade.position.y = 0.25;
      g.add(blade);
      const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), new THREE.MeshStandardMaterial({ color: 0x884400 }));
      g.add(hilt);
    } else if (weapon.type === "strike") {
      // Glowing orb
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 14, 14),
        new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 }),
      );
      g.add(orb);
    }

    // Position on worm's right hand area
    g.position.copy(worm.pos).add(new THREE.Vector3(
      Math.sin(worm.facing + 0.5) * 0.6,
      0.5,
      Math.cos(worm.facing + 0.5) * 0.6,
    ));
    g.rotation.y = worm.facing;

    this._scene.add(g);
    this._weaponModel = g;
  }

  /* ═══════════ victory ═══════════ */

  /* ═══════════ 3D terrain debris ═══════════ */

  private _spawnDebris(pos: THREE.Vector3, count: number): void {
    const debrisColor = this._mapType === "arctic" ? 0xbbccdd : this._mapType === "desert" ? 0xccaa77 : this._mapType === "volcanic" ? 0x333333 : 0x665533;
    for (let i = 0; i < count; i++) {
      const size = 0.1 + Math.random() * 0.25;
      const geo = Math.random() < 0.5
        ? new THREE.BoxGeometry(size, size * 0.6, size * 0.8)
        : new THREE.DodecahedronGeometry(size * 0.5, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(debrisColor).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1),
        roughness: 0.9,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.castShadow = true;
      this._scene.add(mesh);
      this._debris.push({
        mesh,
        pos: pos.clone(),
        vel: new THREE.Vector3((Math.random() - 0.5) * 12, 5 + Math.random() * 10, (Math.random() - 0.5) * 12),
        rotVel: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        life: 2 + Math.random() * 2,
      });
    }
  }

  private _updateDebris(dt: number): void {
    for (let i = this._debris.length - 1; i >= 0; i--) {
      const d = this._debris[i];
      d.life -= dt;
      if (d.life <= 0) {
        this._scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        (d.mesh.material as THREE.Material).dispose();
        this._debris.splice(i, 1);
        continue;
      }
      d.vel.y += GRAVITY * dt;
      d.pos.add(d.vel.clone().multiplyScalar(dt));
      d.mesh.position.copy(d.pos);
      d.mesh.rotation.x += d.rotVel.x * dt;
      d.mesh.rotation.y += d.rotVel.y * dt;
      d.mesh.rotation.z += d.rotVel.z * dt;

      // Bounce off terrain
      const th = this._getTerrainHeight(d.pos.x, d.pos.z);
      if (d.pos.y < th) {
        d.pos.y = th;
        d.vel.y = Math.abs(d.vel.y) * 0.3;
        d.vel.x *= 0.6;
        d.vel.z *= 0.6;
        d.rotVel.multiplyScalar(0.5);
      }

      // Fade when dying
      if (d.life < 0.5) {
        (d.mesh.material as THREE.MeshStandardMaterial).opacity = d.life * 2;
        (d.mesh.material as THREE.MeshStandardMaterial).transparent = true;
      }
    }
  }

  /* ═══════════ melee attack arcs ═══════════ */

  private _spawnMeleeArc(worm: Worm, weapon: WeaponDef): void {
    const arcColor = weapon.name === "Fire Punch" ? 0xff4400 : weapon.name === "Dragon Punch" ? 0x44ff88 : 0xdddddd;
    const arcGeo = new THREE.TorusGeometry(1, 0.08, 12, 32, Math.PI * 0.8);
    const arcMat = new THREE.MeshBasicMaterial({
      color: arcColor, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const arc = new THREE.Mesh(arcGeo, arcMat);
    arc.position.copy(worm.pos).add(new THREE.Vector3(0, 0.5, 0));
    arc.rotation.y = worm.facing;
    this._scene.add(arc);
    this._meleeArcs.push({ mesh: arc, timer: 0.4 });

    // Fire particles for fire weapons
    if (weapon.name === "Fire Punch" || weapon.name === "Dragon Punch") {
      const dir = new THREE.Vector3(Math.sin(worm.facing), 0, Math.cos(worm.facing));
      for (let i = 0; i < 15; i++) {
        this._particles.push({
          pos: worm.pos.clone().add(dir.clone().multiplyScalar(0.5 + Math.random())).add(new THREE.Vector3(0, 0.5 + Math.random(), 0)),
          vel: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3),
          life: 0.3 + Math.random() * 0.3,
          maxLife: 0.6,
          color: new THREE.Color(weapon.name === "Fire Punch" ? 0xff6600 : 0x44ff88),
          size: 0.1 + Math.random() * 0.15,
        });
      }
    }
  }

  private _updateMeleeArcs(dt: number): void {
    for (let i = this._meleeArcs.length - 1; i >= 0; i--) {
      const a = this._meleeArcs[i];
      a.timer -= dt;
      if (a.timer <= 0) {
        this._scene.remove(a.mesh);
        a.mesh.geometry.dispose();
        (a.mesh.material as THREE.Material).dispose();
        this._meleeArcs.splice(i, 1);
        continue;
      }
      a.mesh.scale.setScalar(1 + (0.4 - a.timer) * 3);
      (a.mesh.material as THREE.MeshBasicMaterial).opacity = a.timer * 1.5;
    }
  }

  /* ═══════════ destructible trees ═══════════ */

  private _checkTreeDestruction(pos: THREE.Vector3, radius: number): void {
    for (const tree of this._destructibleTrees) {
      if (!tree.alive) continue;
      const dist = new THREE.Vector2(tree.pos.x - pos.x, tree.pos.z - pos.z).length();
      if (dist < radius + 2) {
        tree.alive = false;
        // Topple animation — apply rotation and then remove after delay
        const treeGroup = tree.group;
        const fallDir = new THREE.Vector3(tree.pos.x - pos.x, 0, tree.pos.z - pos.z).normalize();
        const fallAngle = Math.atan2(fallDir.x, fallDir.z);

        // Spawn wood debris
        this._spawnDebris(tree.pos.clone().add(new THREE.Vector3(0, 2, 0)), 5);
        this._spawnExplosionParticles(tree.pos.clone().add(new THREE.Vector3(0, 2, 0)), 1, new THREE.Color(0x337722), 10);

        // Animate fall
        let fallTimer = 0;
        const fallInterval = setInterval(() => {
          if (this._destroyed) { clearInterval(fallInterval); return; }
          fallTimer += 0.03;
          treeGroup.rotation.x = Math.sin(fallAngle) * fallTimer * 2;
          treeGroup.rotation.z = Math.cos(fallAngle) * fallTimer * 2;
          treeGroup.position.y -= 0.05;
          if (fallTimer > 1) {
            clearInterval(fallInterval);
            this._scene.remove(treeGroup);
          }
        }, 30);

        this._playSound(200, 0.1, "sawtooth", 0.3);
      }
    }
  }

  /* ═══════════ turn transition ═══════════ */

  private _showTurnTransition(): void {
    if (this._turnTransition) this._turnTransition.remove();
    this._turnTransition = document.createElement("div");
    this._turnTransition.style.cssText = `
      position: fixed; top: 0; left: -100%; width: 100%; height: 100%; z-index: 55;
      background: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.5) 60%, transparent 100%);
      pointer-events: none;
      animation: worms3d-wipe 0.6s ease-in-out forwards;
    `;
    this._turnTransition.innerHTML = `
      <style>
        @keyframes worms3d-wipe {
          0% { left: -100%; }
          50% { left: 0%; }
          100% { left: 100%; }
        }
      </style>
    `;
    document.body.appendChild(this._turnTransition);
    this._turnTransitionTimer = 0.6;
  }

  /* ═══════════ worm flinch ═══════════ */

  private _triggerFlinch(pos: THREE.Vector3, radius: number): void {
    for (const worm of this._worms) {
      if (!worm.alive) continue;
      const dist = worm.pos.distanceTo(pos);
      if (dist < radius * 2 && dist > radius * 0.3) {
        this._flinchWorms.set(worm, 0.3);
      }
    }
  }

  private _updateFlinches(dt: number): void {
    for (const [worm, time] of this._flinchWorms) {
      const remaining = time - dt;
      if (remaining <= 0) {
        this._flinchWorms.delete(worm);
        continue;
      }
      this._flinchWorms.set(worm, remaining);
      // Flinch visual — crouch and sway
      if (worm.alive && worm !== this._getCurrentWorm()) {
        worm.mesh.scale.y = 0.85 + remaining * 0.5;
        worm.mesh.rotation.z = Math.sin(this._time * 20) * 0.1 * remaining;
      }
    }
  }

  /* ═══════════ dynamic music ═══════════ */

  private _updateMusic(dt: number): void {
    if (!this._musicPlaying) return;

    // Intensity based on game state
    const targetIntensity = (this._phase === "firing" || this._phase === "resolving") ? 1.0
      : this._phase === "aiming" ? 0.7
      : this._suddenDeath ? 0.8
      : 0.2;
    this._musicIntensity += (targetIntensity - this._musicIntensity) * dt * 2;

    // Adjust drone volume
    if (this._musicGain) {
      this._musicGain.gain.setTargetAtTime(0.02 + this._musicIntensity * 0.04, this._getAudioCtx().currentTime, 0.1);
    }

    // Medieval melody — play notes on beat
    this._musicBeatTimer -= dt;
    if (this._musicBeatTimer <= 0 && this._musicIntensity > 0.3) {
      const beatInterval = 0.4 - this._musicIntensity * 0.15; // faster when intense
      this._musicBeatTimer = beatInterval;

      // Pentatonic medieval scale in A minor
      const scale = [220, 261, 293, 349, 392, 440, 523, 587]; // A3 C4 D4 F4 G4 A4 C5 D5
      const melodyPatterns = [
        [0, 2, 4, 5, 4, 2, 0, 3],  // calm
        [4, 5, 7, 5, 4, 2, 4, 5],  // mid
        [7, 5, 4, 7, 5, 4, 2, 0],  // tense
      ];
      const patternIdx = this._musicIntensity > 0.7 ? 2 : this._musicIntensity > 0.4 ? 1 : 0;
      const pattern = melodyPatterns[patternIdx];
      const noteIdx = pattern[this._musicNoteIndex % pattern.length];
      this._musicNoteIndex++;

      try {
        const ctx = this._getAudioCtx();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = this._musicIntensity > 0.6 ? "square" : "triangle";
        osc.frequency.setValueAtTime(scale[noteIdx], now);
        const vol = 0.03 + this._musicIntensity * 0.04;
        const dur = beatInterval * 0.7;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + dur);
      } catch (_) {}
    }
  }

  /* ═══════════ weapon-specific fire sounds ═══════════ */

  private _playWeaponSound(weapon: WeaponDef): void {
    try {
      const ctx = this._getAudioCtx();
      const now = ctx.currentTime;

      if (weapon.name === "Bazooka" || weapon.name === "Catapult" || weapon.name === "Mortar") {
        // Whoosh + thump
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
        g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.25);
      } else if (weapon.name === "Flaming Arrow") {
        // Fiery whoosh
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
        g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.3);
      } else if (weapon.name === "Dynamite") {
        // Fuse sizzle
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.05;
        const src = ctx.createBufferSource(); src.buffer = buf;
        const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.setValueAtTime(3000, now);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.1, now);
        src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(now);
      } else if (weapon.name === "Grenade" || weapon.name === "Cluster Bomb") {
        // Pop + pin pull
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, now); osc.frequency.setValueAtTime(400, now + 0.05);
        g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.1);
      }
    } catch (_) {}
  }

  /* ═══════════ sprint mechanic ═══════════ */

  private _isSprinting(): boolean {
    return this._keys.has("shift") && this._sprintEnergy > 0;
  }

  /* ═══════════ ambient environment sounds ═══════════ */

  private _startAmbientSounds(): void {
    try {
      const ctx = this._getAudioCtx();
      // Gentle wind noise
      const bufSize = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.02;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(300, ctx.currentTime);
      this._ambientGain = ctx.createGain();
      this._ambientGain.gain.setValueAtTime(0.08, ctx.currentTime);
      src.connect(filter);
      filter.connect(this._ambientGain);
      this._ambientGain.connect(ctx.destination);
      src.start();
    } catch (_) {}
  }

  /* ═══════════ drowning animation ═══════════ */

  private _spawnDrowningBubbles(pos: THREE.Vector3): void {
    const waterY = WATER_LEVEL + this._waterMesh.position.y;
    for (let i = 0; i < 8; i++) {
      const delay = i * 0.15;
      setTimeout(() => {
        if (this._destroyed) return;
        const bubble = new THREE.Mesh(
          new THREE.SphereGeometry(0.04 + Math.random() * 0.06, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.6, depthWrite: false }),
        );
        bubble.position.set(
          pos.x + (Math.random() - 0.5) * 0.5,
          waterY - 0.2 - Math.random() * 0.5,
          pos.z + (Math.random() - 0.5) * 0.5,
        );
        this._scene.add(bubble);
        this._drowningBubbles.push({ pos: bubble.position.clone(), life: 1.0 + Math.random() * 0.5, mesh: bubble });
      }, delay * 1000);
    }
  }

  private _updateDrowningBubbles(dt: number): void {
    for (let i = this._drowningBubbles.length - 1; i >= 0; i--) {
      const b = this._drowningBubbles[i];
      b.life -= dt;
      b.pos.y += dt * 1.5;
      b.pos.x += Math.sin(this._time * 5 + b.pos.y * 10) * dt * 0.3;
      b.mesh.position.copy(b.pos);
      b.mesh.scale.setScalar(1 + (1 - b.life) * 0.5);
      (b.mesh.material as THREE.MeshBasicMaterial).opacity = b.life * 0.6;
      if (b.life <= 0) {
        this._scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        this._drowningBubbles.splice(i, 1);
      }
    }
  }

  /* ═══════════ round start flyover ═══════════ */

  private _startFlyover(): void {
    this._flyoverActive = true;
    this._flyoverTimer = 3.0;
  }

  /* ═══════════ post-game awards ═══════════ */

  private _generateAwards(): string {
    const awards: string[] = [];
    let mostDamage = { name: "", val: 0 };
    let mostKills = { name: "", val: 0 };
    let biggestHit = { name: "", val: 0 };
    let leastDamageReceived = { name: "", val: Infinity };
    let pacifist = { name: "", val: Infinity };

    this._wormStats.forEach((stats, name) => {
      if (stats.damageDealt > mostDamage.val) mostDamage = { name, val: stats.damageDealt };
      if (stats.kills > mostKills.val) mostKills = { name, val: stats.kills };
      if (stats.biggestHit > biggestHit.val) biggestHit = { name, val: stats.biggestHit };
      if (stats.damageReceived < leastDamageReceived.val && stats.damageReceived > 0) leastDamageReceived = { name, val: stats.damageReceived };
      if (stats.damageDealt < pacifist.val) pacifist = { name, val: stats.damageDealt };
    });

    if (mostDamage.name) awards.push(`<span style="color:#ff6644;">Most Dangerous:</span> ${mostDamage.name} (${Math.round(mostDamage.val)} dmg)`);
    if (mostKills.name && mostKills.val > 0) awards.push(`<span style="color:#ff4444;">Most Kills:</span> ${mostKills.name} (${mostKills.val})`);
    if (biggestHit.name && biggestHit.val > 0) awards.push(`<span style="color:#ffaa00;">Biggest Hit:</span> ${biggestHit.name} (${Math.round(biggestHit.val)} dmg)`);
    if (leastDamageReceived.name && leastDamageReceived.val < Infinity) awards.push(`<span style="color:#44ddff;">Iron Wall:</span> ${leastDamageReceived.name} (only ${Math.round(leastDamageReceived.val)} taken)`);
    if (pacifist.name && pacifist.val === 0) awards.push(`<span style="color:#88ff88;">Pacifist:</span> ${pacifist.name} (0 damage dealt)`);

    // Find the worm that fell in water most (from gravestones near water)
    const waterDeaths = this._worms.filter((w) => !w.alive && w.pos.y < WATER_LEVEL + 2);
    if (waterDeaths.length > 0) awards.push(`<span style="color:#4488ff;">Wet Noodle:</span> ${waterDeaths[0].name} (drowned)`);

    return awards.length > 0 ? awards.join("<br>") : "No special awards this round.";
  }

  /* ═══════════ spawn parachutes ═══════════ */

  private _spawnWithParachutes(): void {
    for (const worm of this._worms) {
      const targetY = worm.pos.y;
      const startY = targetY + 20 + Math.random() * 10;
      worm.pos.y = startY;
      worm.mesh.position.y = startY;

      // Create parachute above worm
      const chuteGroup = new THREE.Group();
      const chuteMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
        new THREE.MeshStandardMaterial({
          color: TEAM_COLORS[worm.teamIndex], side: THREE.DoubleSide, transparent: true, opacity: 0.85,
        }),
      );
      chuteMesh.position.y = 2;
      chuteGroup.add(chuteMesh);

      // Ropes
      for (let r = 0; r < 4; r++) {
        const a = (r / 4) * Math.PI * 2;
        const ropeGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0.5, 0),
          new THREE.Vector3(Math.cos(a) * 0.8, 2, Math.sin(a) * 0.8),
        ]);
        chuteGroup.add(new THREE.Line(ropeGeo, new THREE.LineBasicMaterial({ color: 0x886644 })));
      }

      chuteGroup.position.copy(worm.mesh.position);
      this._scene.add(chuteGroup);
      this._spawnChutes.push({ mesh: chuteGroup, worm, timer: 2 + Math.random() * 2 });
    }
  }

  private _updateSpawnChutes(dt: number): void {
    for (let i = this._spawnChutes.length - 1; i >= 0; i--) {
      const sc = this._spawnChutes[i];
      sc.timer -= dt;

      if (sc.timer <= 0) {
        this._scene.remove(sc.mesh);
        this._spawnChutes.splice(i, 1);
        // Ensure worm is on ground
        const th = this._getTerrainHeight(sc.worm.pos.x, sc.worm.pos.z) + WORM_HEIGHT / 2;
        sc.worm.pos.y = th;
        sc.worm.mesh.position.y = th;
        sc.worm.grounded = true;
        continue;
      }

      // Drift down slowly
      const fallSpeed = 4;
      sc.worm.pos.y -= fallSpeed * dt;
      sc.worm.mesh.position.copy(sc.worm.pos);
      sc.mesh.position.copy(sc.worm.pos);

      // Sway
      sc.mesh.rotation.z = Math.sin(this._time * 2 + sc.worm.pos.x) * 0.08;
      sc.mesh.rotation.x = Math.cos(this._time * 1.5 + sc.worm.pos.z) * 0.06;

      // Check if landed
      const th = this._getTerrainHeight(sc.worm.pos.x, sc.worm.pos.z) + WORM_HEIGHT / 2;
      if (sc.worm.pos.y <= th) {
        sc.worm.pos.y = th;
        sc.worm.mesh.position.y = th;
        sc.worm.grounded = true;
        this._scene.remove(sc.mesh);
        this._spawnChutes.splice(i, 1);
        this._spawnExplosionParticles(sc.worm.pos.clone(), 0.3, new THREE.Color(0x886644), 5);
      }
    }
  }

  /* ═══════════ smooth HP animation ═══════════ */

  private _getDisplayHp(worm: Worm): number {
    if (!this._displayHp.has(worm)) this._displayHp.set(worm, worm.hp);
    let display = this._displayHp.get(worm)!;
    // Smoothly animate toward actual HP
    display += (worm.hp - display) * Math.min(1, this._dt * 5);
    this._displayHp.set(worm, display);
    return display;
  }

  /* ═══════════ ancient ruins ═══════════ */

  private _buildRuins(): void {
    const ruinMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.95, metalness: 0.05 });
    const mossyMat = new THREE.MeshStandardMaterial({ color: 0x667755, roughness: 0.9 });
    const darkRuinMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.95 });
    const ivyMat = new THREE.MeshStandardMaterial({ color: 0x3a6630, roughness: 0.85 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.4 });

    for (let i = 0; i < 8; i++) {
      const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.55;
      const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.55;
      const h = this._getTerrainHeight(x, z);
      if (h < 2 || h > 9) continue;

      const ruin = new THREE.Group();
      const type = Math.floor(Math.random() * 5);

      if (type === 0) {
        // Broken column row (temple ruins)
        for (let c = 0; c < 4; c++) {
          const colH = 1.5 + Math.random() * 1.5;
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, colH, 20, 6), ruinMat);
          col.position.set(c * 1.2 - 1.8, colH / 2, 0);
          col.castShadow = true;
          ruin.add(col);
          // Column base
          const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.7, 2, 1, 2), darkRuinMat);
          base.position.set(c * 1.2 - 1.8, 0.075, 0);
          ruin.add(base);
          // Capital if tall enough
          if (colH > 2) {
            const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.2, 20), ruinMat);
            cap.position.set(c * 1.2 - 1.8, colH + 0.1, 0);
            ruin.add(cap);
          }
        }
        // Fallen column piece
        const fallen = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2, 16), mossyMat);
        fallen.position.set(1.5, 0.12, 1.2);
        fallen.rotation.z = Math.PI / 2;
        fallen.rotation.y = 0.4;
        ruin.add(fallen);
        // Scattered stone blocks
        for (let sb = 0; sb < 5; sb++) {
          const block = new THREE.Mesh(
            new THREE.BoxGeometry(0.3 + Math.random() * 0.3, 0.2 + Math.random() * 0.2, 0.3 + Math.random() * 0.2, 2, 2, 2),
            Math.random() < 0.4 ? mossyMat : ruinMat,
          );
          block.position.set((Math.random() - 0.5) * 4, 0.1, (Math.random() - 0.5) * 2);
          block.rotation.y = Math.random() * Math.PI;
          ruin.add(block);
        }
      } else if (type === 1) {
        // Stone arch with ivy
        const pillarH = 2.5 + Math.random() * 0.5;
        for (const side of [-1, 1]) {
          const lp = new THREE.Mesh(new THREE.BoxGeometry(0.55, pillarH, 0.55, 3, 4, 3), ruinMat);
          lp.position.set(side * 1.1, pillarH / 2, 0);
          lp.castShadow = true;
          ruin.add(lp);
          // Pillar base molding
          const baseMold = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.7, 2, 1, 2), darkRuinMat);
          baseMold.position.set(side * 1.1, 0.075, 0);
          ruin.add(baseMold);
          // Ivy on pillars
          for (let iv = 0; iv < 3; iv++) {
            const ivy = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4 + Math.random() * 0.3, 1, 2), ivyMat);
            ivy.position.set(side * 1.1 + side * 0.28, 0.5 + iv * 0.7, (Math.random() - 0.5) * 0.3);
            ivy.rotation.y = side * Math.PI / 2;
            ruin.add(ivy);
          }
        }
        // Arch (semicircle)
        const archMesh = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.2, 10, 20, Math.PI), ruinMat);
        archMesh.position.y = pillarH;
        archMesh.rotation.z = Math.PI;
        archMesh.rotation.y = Math.PI / 2;
        ruin.add(archMesh);
        // Keystone
        const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.35, 2, 2, 2), darkRuinMat);
        keystone.position.set(0, pillarH + 1.1, 0);
        ruin.add(keystone);
      } else if (type === 2) {
        // Standing stones (fuller Stonehenge)
        const stoneCount = 7 + Math.floor(Math.random() * 4);
        const rad = 2 + Math.random();
        for (let s = 0; s < stoneCount; s++) {
          const angle = (s / stoneCount) * Math.PI * 2;
          const stoneH = 1.2 + Math.random() * 1.5;
          const stone = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, stoneH, 0.25, 2, 4, 2),
            Math.random() < 0.3 ? mossyMat : ruinMat,
          );
          stone.position.set(Math.cos(angle) * rad, stoneH / 2, Math.sin(angle) * rad);
          stone.rotation.y = angle + Math.random() * 0.3;
          stone.rotation.z = (Math.random() - 0.5) * 0.12;
          stone.castShadow = true;
          ruin.add(stone);
        }
        // Center altar stone
        const altar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.8, 3, 2, 3), darkRuinMat);
        altar.position.y = 0.25;
        altar.castShadow = true;
        ruin.add(altar);
      } else if (type === 3) {
        // Crumbling wall section
        const wallLen = 3 + Math.random() * 3;
        const wallH = 1.5 + Math.random() * 2;
        const wallGeo = new THREE.BoxGeometry(wallLen, wallH, 0.5, 6, 4, 1);
        // Crumble top edge
        const wp = wallGeo.attributes.position;
        for (let v = 0; v < wp.count; v++) {
          if (wp.getY(v) > wallH * 0.3) {
            wp.setY(v, wp.getY(v) - Math.random() * 0.5);
            wp.setX(v, wp.getX(v) + (Math.random() - 0.5) * 0.1);
          }
        }
        wallGeo.computeVertexNormals();
        const wallMesh = new THREE.Mesh(wallGeo, ruinMat);
        wallMesh.position.y = wallH / 2;
        wallMesh.castShadow = true;
        ruin.add(wallMesh);
        // Wall rubble at base
        for (let rb = 0; rb < 6; rb++) {
          const rubble = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.15, 1),
            Math.random() < 0.3 ? mossyMat : ruinMat,
          );
          rubble.position.set((Math.random() - 0.5) * wallLen, 0.1, 0.5 + Math.random() * 0.5);
          ruin.add(rubble);
        }
        // Ivy patches on wall
        for (let iv = 0; iv < 4; iv++) {
          const ivy = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5 + Math.random() * 0.5, 0.4 + Math.random() * 0.4, 2, 2),
            ivyMat,
          );
          ivy.position.set((Math.random() - 0.5) * wallLen * 0.7, 0.5 + Math.random() * wallH * 0.5, 0.26);
          ruin.add(ivy);
        }
      } else {
        // Well / fountain
        const wellMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 });
        const wellRing = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.15, 12, 20), wellMat);
        wellRing.position.y = 0.6;
        wellRing.rotation.x = Math.PI / 2;
        ruin.add(wellRing);
        // Well wall
        const wellWall = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.6, 20, 3), darkRuinMat);
        wellWall.position.y = 0.3;
        wellWall.castShadow = true;
        ruin.add(wellWall);
        // Water inside
        const water = new THREE.Mesh(
          new THREE.CircleGeometry(0.5, 16),
          new THREE.MeshBasicMaterial({ color: 0x224488, transparent: true, opacity: 0.6 }),
        );
        water.position.y = 0.45;
        water.rotation.x = -Math.PI / 2;
        ruin.add(water);
        // Support posts
        for (const sx of [-0.4, 0.4]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x553322 }));
          post.position.set(sx, 1.35, 0);
          ruin.add(post);
        }
        // Cross beam
        const beam = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: 0x553322 }));
        beam.position.y = 2.1;
        ruin.add(beam);
        // Rope
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6), new THREE.MeshStandardMaterial({ color: 0x886644 }));
        rope.position.set(0, 1.5, 0);
        ruin.add(rope);
        // Bucket
        const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.15, 8), ironMat);
        bucket.position.set(0, 0.85, 0);
        ruin.add(bucket);
      }

      ruin.position.set(x, h, z);
      ruin.rotation.y = Math.random() * Math.PI * 2;
      this._scene.add(ruin);
      this._ruins.push(ruin);
    }
  }

  /* ═══════════ team elimination ═══════════ */

  private _checkEliminations(): void {
    for (let t = 0; t < this._teamCount; t++) {
      if (this._eliminatedTeams.has(t)) continue;
      const alive = this._worms.filter((w) => w.teamIndex === t && w.alive);
      if (alive.length === 0) {
        this._eliminatedTeams.add(t);
        const teamHex = `#${TEAM_COLORS[t].toString(16).padStart(6, "0")}`;
        this._addFloatingText(`Team ${t + 1} ELIMINATED!`, new THREE.Vector3(0, 18, 0), teamHex, 3);
        this._playSound(100, 0.3, "sawtooth", 0.5);
        this._shakeIntensity = 0.5;
      }
    }
  }

  /* ═══════════ per-worm voice pitch ═══════════ */

  private _playWormVoice(worm: Worm, type: "fire" | "damage" | "death" | "jump"): void {
    try {
      const ctx = this._getAudioCtx();
      const now = ctx.currentTime;
      // Each worm has a unique pitch based on name hash
      let nameHash = 0;
      for (let c = 0; c < worm.name.length; c++) nameHash += worm.name.charCodeAt(c);
      const pitchMult = 0.7 + (nameHash % 10) * 0.06; // 0.7 to 1.24

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      switch (type) {
        case "fire":
          osc.type = "square";
          osc.frequency.setValueAtTime(200 * pitchMult, now);
          osc.frequency.linearRampToValueAtTime(400 * pitchMult, now + 0.12);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          break;
        case "damage":
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(350 * pitchMult, now);
          osc.frequency.linearRampToValueAtTime(150 * pitchMult, now + 0.2);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          break;
        case "death":
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(400 * pitchMult, now);
          osc.frequency.linearRampToValueAtTime(60 * pitchMult, now + 0.6);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
          break;
        case "jump":
          osc.type = "sine";
          osc.frequency.setValueAtTime(300 * pitchMult, now);
          osc.frequency.linearRampToValueAtTime(550 * pitchMult, now + 0.1);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          break;
      }
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    } catch (_) {}
  }

  /* ═══════════ melee camera zoom ═══════════ */

  private _triggerMeleeZoom(): void {
    this._meleeZoom = true;
    this._meleeZoomTimer = 0.6;
    this._preMeleeZoomDist = this._camDist;
    this._camDist = 6;
  }

  private _showVictory(winningTeam: number): void {
    this._phase = "victory";
    this._playVoice("victory");
    this._victoryDanceTimer = 0;
    const overlay = document.createElement("div");
    overlay.className = "hud-dynamic";
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      background: rgba(0,0,0,0.6); pointer-events: auto; z-index: 53;
    `;

    const teamColor = winningTeam >= 0 ? `#${TEAM_COLORS[winningTeam].toString(16).padStart(6, "0")}` : "#fff";
    const teamWorms = winningTeam >= 0 ? this._worms.filter((w) => w.teamIndex === winningTeam) : [];

    const totalKills = this._gravestones.length;
    const rounds = this._roundNumber;
    const survivors = teamWorms.filter((w) => w.alive);
    const survivorHp = survivors.reduce((sum, w) => sum + w.hp, 0);

    overlay.innerHTML = `
      <div style="font-size:60px;font-weight:bold;color:${teamColor};text-shadow:0 0 30px ${teamColor};margin-bottom:10px;">
        🏆 VICTORY! 🏆
      </div>
      <div style="font-size:28px;color:#ffd700;margin-bottom:15px;">
        ${winningTeam >= 0 ? `Team ${winningTeam + 1} Wins!` : "Draw!"}
      </div>
      <div style="font-size:18px;color:#ccc;margin-bottom:8px;">
        ${survivors.map((w) => `${w.name} (${w.hp}HP)`).join(" • ")}
      </div>
      <div style="font-size:14px;color:#aaa;margin-bottom:15px;line-height:1.6;">
        Rounds: ${rounds} | Total casualties: ${totalKills} | Remaining HP: ${survivorHp}
        ${this._suddenDeath ? " | Sudden Death!" : ""} | AI: ${this._aiDifficulty}
      </div>
      <div style="max-height:150px;overflow-y:auto;margin-bottom:15px;width:100%;max-width:500px;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;color:#ccc;">
          <tr style="color:#999;border-bottom:1px solid #444;">
            <th style="text-align:left;padding:3px 6px;">Worm</th>
            <th style="text-align:right;padding:3px 6px;">Dmg Dealt</th>
            <th style="text-align:right;padding:3px 6px;">Kills</th>
            <th style="text-align:right;padding:3px 6px;">Dmg Taken</th>
            <th style="text-align:right;padding:3px 6px;">Status</th>
          </tr>
          ${this._worms.map((w) => {
            const s = this._wormStats.get(w.name) || { damageDealt: 0, kills: 0, damageReceived: 0 };
            const tc = `#${TEAM_COLORS[w.teamIndex].toString(16).padStart(6, "0")}`;
            return `<tr style="border-bottom:1px solid #333;">
              <td style="padding:2px 6px;color:${tc};">${w.name}</td>
              <td style="text-align:right;padding:2px 6px;">${Math.round(s.damageDealt)}</td>
              <td style="text-align:right;padding:2px 6px;">${s.kills}</td>
              <td style="text-align:right;padding:2px 6px;">${Math.round(s.damageReceived)}</td>
              <td style="text-align:right;padding:2px 6px;">${w.alive ? `${w.hp}HP` : "Dead"}</td>
            </tr>`;
          }).join("")}
        </table>
      </div>
      <div style="font-size:12px;color:#ccc;margin-bottom:15px;line-height:1.6;text-align:center;max-width:400px;">
        <div style="color:#ffd700;font-size:14px;font-weight:bold;margin-bottom:5px;">Awards</div>
        ${this._generateAwards()}
      </div>
      <div style="display:flex;gap:15px;pointer-events:auto;">
        <div style="padding:12px 30px;background:linear-gradient(135deg,#884400,#cc7722);border:2px solid #ffa544;
          border-radius:8px;cursor:pointer;color:white;font-weight:bold;font-size:16px;
          transition:transform 0.15s;"
          onmouseenter="this.style.transform='scale(1.05)'" onmouseleave="this.style.transform='scale(1)'"
          id="worms3d-play-again">Play Again</div>
        <div style="padding:12px 30px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.3);
          border-radius:8px;cursor:pointer;color:#ccc;font-size:16px;
          transition:transform 0.15s;"
          onmouseenter="this.style.transform='scale(1.05)'" onmouseleave="this.style.transform='scale(1)'"
          id="worms3d-exit">Exit to Menu</div>
      </div>
    `;

    setTimeout(() => {
      overlay.querySelector("#worms3d-play-again")?.addEventListener("click", () => {
        overlay.remove();
        this._startGame(this._teamCount);
      });
      overlay.querySelector("#worms3d-exit")?.addEventListener("click", () => {
        overlay.remove();
        window.dispatchEvent(new Event("worms3dExit"));
      });
    }, 100);

    this._hudContainer.appendChild(overlay);
  }

  /* ═══════════ update loop ═══════════ */

  private _update(): void {
    if (this._paused) return;

    // Slow-mo
    if (this._slowMo) {
      this._slowMoTimer -= this._dt;
      if (this._slowMoTimer <= 0) {
        this._slowMo = false;
        this._timeScale = 1;
      } else {
        this._timeScale = 0.2 + 0.8 * Math.max(0, 1 - this._slowMoTimer / 0.5);
        if (this._slowMoTarget) {
          this._camTarget.lerp(this._slowMoTarget, this._dt * 3);
          this._camDist = Math.max(8, this._camDist - this._dt * 10);
        }
      }
    }

    const dt = this._dt * this._timeScale;

    // Animate water
    const waterMat = this._waterMesh.material as THREE.ShaderMaterial;
    waterMat.uniforms.uTime.value = this._time;
    if (waterMat.uniforms.uCameraPos) waterMat.uniforms.uCameraPos.value.copy(this._camera.position);

    // Animate sky dome clouds
    const skyMat = this._skyDome.material as THREE.ShaderMaterial;
    if (skyMat.uniforms.uTime) skyMat.uniforms.uTime.value = this._time;

    // God rays face camera
    for (const ray of this._godRays) {
      ray.lookAt(this._camera.position);
    }

    // Animate clouds
    for (const cloud of this._clouds) {
      cloud.position.x += dt * 1.5;
      if (cloud.position.x > 150) cloud.position.x = -150;
    }

    // Animate banners
    for (const banner of this._banners) {
      banner.rotation.y = Math.sin(this._time * 2 + banner.position.x) * 0.15;
    }

    // Teleport marker pulse
    if (this._teleportMarker.visible) {
      this._teleportMarker.scale.setScalar(1 + Math.sin(this._time * 5) * 0.2);
      (this._teleportMarker.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(this._time * 3) * 0.2;
    }

    // Update birds
    for (const bird of this._birds) {
      bird.flapPhase += dt * 8;
      bird.pos.add(bird.vel.clone().multiplyScalar(dt));
      // Circle around center
      const toCenter = new THREE.Vector3(-bird.pos.x, 0, -bird.pos.z).normalize();
      bird.vel.add(toCenter.multiplyScalar(dt * 2));
      bird.vel.y = Math.sin(this._time * 0.5 + bird.flapPhase) * 0.3;
      bird.mesh.position.copy(bird.pos);
      // Face direction of movement
      bird.mesh.lookAt(bird.pos.clone().add(bird.vel));
      // Flap wings
      bird.mesh.children.forEach((child) => {
        if (child.name === "wing") {
          child.rotation.z = Math.sin(bird.flapPhase) * 0.6;
        }
      });
      // Wrap around
      if (bird.pos.length() > 130) {
        bird.pos.multiplyScalar(0.5);
        bird.mesh.position.copy(bird.pos);
      }
    }

    // Turn announcement timer
    if (this._turnAnnouncementTimer > 0) {
      this._turnAnnouncementTimer -= dt;
      if (this._turnAnnouncementTimer <= 0 && this._turnAnnouncement) {
        this._turnAnnouncement.remove();
        this._turnAnnouncement = null;
      }
    }

    // Title/victory camera
    if (this._phase === "title" || this._phase === "victory") {
      const angle = this._time * 0.1;
      this._camera.position.set(
        Math.sin(angle) * 40,
        20 + Math.sin(this._time * 0.3) * 3,
        Math.cos(angle) * 40,
      );
      this._camera.lookAt(0, 5, 0);

      // Victory dance — surviving worms jump and spin
      if (this._phase === "victory") {
        this._victoryDanceTimer += this._dt;
        for (const worm of this._worms) {
          if (!worm.alive) continue;
          // Jumping
          worm.mesh.position.y = worm.pos.y + Math.abs(Math.sin(this._victoryDanceTimer * 4 + worm.pos.x)) * 0.8;
          // Spinning
          worm.mesh.rotation.y += this._dt * 3;
          // Arms up (scale body Y)
          worm.mesh.scale.y = 1 + Math.sin(this._victoryDanceTimer * 6) * 0.08;

          // Celebration particles
          if (Math.random() < this._dt * 3) {
            const teamCol = new THREE.Color(TEAM_COLORS[worm.teamIndex]);
            this._particles.push({
              pos: worm.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)),
              vel: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3),
              life: 1 + Math.random(),
              maxLife: 2,
              color: teamCol,
              size: 0.1 + Math.random() * 0.1,
            });
          }
        }
        this._updateParticles(this._dt);
      }

      this._renderHUD();
      return;
    }

    // Update game
    this._updateWormPhysics(dt);
    this._updateProjectiles(dt);
    this._updateExplosions(dt);
    this._updateAirStrikes(dt);
    this._updateStrikes(dt);
    this._updateParticles(dt);
    this._updateFloatingTexts(dt);
    this._updateCamera(dt);
    this._updateRope(dt);
    this._updateSmokeTrails(dt);
    this._updateCrates(dt);
    this._updateTrajectoryPreview();

    // Update aim arrow
    this._updateAimArrow();

    // Update active indicator
    this._updateActiveIndicator();

    // Update weapon model
    this._updateWeaponModel();

    // Torch flickering
    for (const torch of this._torchPillars) {
      torch.light.intensity = 1.5 + Math.sin(this._time * 8 + torch.pos.x) * 0.5 + Math.random() * 0.3;
      const fire = torch.mesh.getObjectByName("fire");
      if (fire) {
        fire.scale.setScalar(0.8 + Math.sin(this._time * 10 + torch.pos.z) * 0.3);
      }
    }

    // Minimap
    this._renderMinimap();

    // Weather
    this._updateWeather(dt);

    // Wind particles
    this._updateWindParticles(dt);

    // Fire zones
    this._updateFireZones(dt);

    // Heat shimmer
    for (let i = this._heatShimmerMeshes.length - 1; i >= 0; i--) {
      const hs = this._heatShimmerMeshes[i];
      hs.pos.y += dt * 2;
      hs.mesh.position.copy(hs.pos);
      hs.mesh.position.x += Math.sin(this._time * 8 + hs.pos.y * 3) * 0.1;
      hs.mesh.lookAt(this._camera.position);
      const o = (hs.mesh.material as THREE.MeshBasicMaterial).opacity;
      (hs.mesh.material as THREE.MeshBasicMaterial).opacity = o - dt * 0.02;
      if (o <= 0 || hs.pos.y > hs.mesh.position.y + 5) {
        this._scene.remove(hs.mesh);
        hs.mesh.geometry.dispose();
        (hs.mesh.material as THREE.Material).dispose();
        this._heatShimmerMeshes.splice(i, 1);
      }
    }

    // Shooting stars
    this._updateShootingStars(dt);

    // Water splashes
    this._updateSplashes(dt);

    // Drowning bubbles
    this._updateDrowningBubbles(dt);

    // 3D debris
    this._updateDebris(dt);

    // Melee arcs
    this._updateMeleeArcs(dt);

    // Flinch reactions
    this._updateFlinches(dt);

    // Dynamic music
    this._updateMusic(dt);

    // Spawn parachutes
    this._updateSpawnChutes(dt);

    // Melee zoom
    if (this._meleeZoom) {
      this._meleeZoomTimer -= this._dt;
      if (this._meleeZoomTimer <= 0) {
        this._meleeZoom = false;
        this._camDist = this._preMeleeZoomDist;
      }
    }

    // Turn transition
    if (this._turnTransitionTimer > 0) {
      this._turnTransitionTimer -= this._dt;
      if (this._turnTransitionTimer <= 0 && this._turnTransition) {
        this._turnTransition.remove();
        this._turnTransition = null;
      }
    }

    // Round start flyover camera
    if (this._flyoverActive) {
      this._flyoverTimer -= this._dt; // use real dt, not scaled
      if (this._flyoverTimer <= 0) {
        this._flyoverActive = false;
      } else {
        const t = 1 - this._flyoverTimer / 3.0;
        const fAngle = t * Math.PI * 0.6;
        this._camera.position.set(
          Math.sin(fAngle) * 50,
          25 + Math.sin(t * Math.PI) * 10,
          Math.cos(fAngle) * 50,
        );
        this._camera.lookAt(0, 5, 0);
        // Don't update game during flyover
        this._renderHUD();
        return;
      }
    }

    // Screen shake decay
    if (this._shakeIntensity > 0) {
      this._shakeIntensity = Math.max(0, this._shakeIntensity - this._shakeDecay * dt);
      this._camera.position.x += (Math.random() - 0.5) * this._shakeIntensity;
      this._camera.position.y += (Math.random() - 0.5) * this._shakeIntensity * 0.5;
    }

    // Turn timer
    if ((this._phase === "playing" || this._phase === "aiming") && this._turnActive) {
      this._turnTimer -= dt;
      if (this._turnTimer <= 0) {
        this._turnTimer = 0;
        this._endTurn();
      }
    }

    // Retreat timer
    if (this._phase === "retreat") {
      this._retreatTimer -= dt;
      if (this._retreatTimer <= 0) {
        this._endTurn();
      }
    }

    // AI control
    if (this._isAiTurn() && (this._phase === "playing" || this._phase === "aiming") && this._turnActive) {
      this._aiTakeTurn(dt);
    }

    // Aiming: power charge
    if (this._phase === "aiming") {
      this._aimPower = Math.min(1, this._aimPower + dt * 0.7);
    }

    // Worm movement (only for human player)
    if ((this._phase === "playing" || this._phase === "aiming" || this._phase === "retreat") && !this._isAiTurn()) {
      this._handleWormMovement(dt);
    }

    // Update worm visuals
    this._updateWormVisuals();

    // Camera follows projectile during firing
    if (this._phase === "firing" || this._phase === "resolving") {
      if (this._projectiles.length > 0) {
        this._camTarget.lerp(this._projectiles[0].pos, dt * 5);
      } else if (this._strikes.length > 0 && this._strikes[0].mesh) {
        this._camTarget.lerp(this._strikes[0].mesh.position, dt * 5);
      } else if (this._airStrikes.length > 0) {
        const firstMissile = this._airStrikes[0].missiles.find((m) => !m.landed);
        if (firstMissile) this._camTarget.lerp(firstMissile.pos, dt * 5);
      }
    }

    // Check if all projectiles/explosions resolved → end turn
    if (this._phase === "firing" || this._phase === "resolving") {
      if (this._projectiles.length === 0 && this._explosions.length === 0 &&
          this._airStrikes.length === 0 && this._strikes.length === 0) {
        // Check if all worms are grounded
        const allSettled = this._worms.every((w) => !w.alive || (w.grounded && w.vel.length() < 0.5));
        if (allSettled) {
          this._phase = "retreat";
          this._retreatTimer = this._isAiTurn() ? 1 : RETREAT_TIME;
        } else {
          this._phase = "resolving";
        }
      }
    }

    this._renderHUD();
  }

  /* ═══════════ worm physics ═══════════ */

  private _updateWormPhysics(dt: number): void {
    for (const worm of this._worms) {
      if (!worm.alive) {
        // Dead worm sinks/fades
        worm.mesh.position.y -= dt * 2;
        if (worm.mesh.position.y < WATER_LEVEL - 5) {
          worm.mesh.visible = false;
        }
        continue;
      }

      // Gravity
      if (!worm.grounded) {
        worm.vel.y += GRAVITY * dt;
      }

      // Apply velocity
      worm.pos.add(worm.vel.clone().multiplyScalar(dt));

      // Terrain collision
      const terrainH = this._getTerrainHeight(worm.pos.x, worm.pos.z);
      const groundY = terrainH + WORM_HEIGHT / 2;

      if (worm.pos.y <= groundY) {
        // Fall damage
        if (worm.vel.y < -15) {
          const fallDmg = Math.floor(Math.abs(worm.vel.y + 15) * 1.5);
          if (fallDmg > 0) {
            worm.hp -= fallDmg;
            this._addFloatingText(`-${fallDmg}`, worm.pos.clone().add(new THREE.Vector3(0, 2, 0)), "#ffaa00");
            if (worm.hp <= 0) {
              worm.hp = 0;
              worm.alive = false;
              this._addFloatingText(`☠ ${worm.name}`, worm.pos.clone().add(new THREE.Vector3(0, 3, 0)), "#ff0000", 2);
            }
          }
        }
        worm.pos.y = groundY;
        worm.vel.y = 0;
        worm.grounded = true;
        worm.onGround = true;

        // Friction
        worm.vel.x *= 0.85;
        worm.vel.z *= 0.85;
        if (Math.abs(worm.vel.x) < 0.1) worm.vel.x = 0;
        if (Math.abs(worm.vel.z) < 0.1) worm.vel.z = 0;
      } else {
        worm.grounded = false;
      }

      // Water death with drowning animation
      if (worm.pos.y < WATER_LEVEL + this._waterMesh.position.y) {
        worm.alive = false;
        worm.hp = 0;
        this._addFloatingText(`🌊 ${worm.name}`, worm.pos.clone().add(new THREE.Vector3(0, 2, 0)), "#4488ff", 2);
        this._spawnWaterSplash(worm.pos);
        this._spawnDrowningBubbles(worm.pos);
        this._playVoice("death");
      }

      // Boundary check
      const boundary = TERRAIN_SIZE * 0.55;
      if (Math.abs(worm.pos.x) > boundary || Math.abs(worm.pos.z) > boundary) {
        worm.alive = false;
        worm.hp = 0;
        this._addFloatingText(`💨 ${worm.name}`, worm.pos.clone().add(new THREE.Vector3(0, 2, 0)), "#aaaaaa", 2);
      }

      // Update mesh position
      worm.mesh.position.copy(worm.pos);
    }
  }

  private _handleWormMovement(dt: number): void {
    const worm = this._getCurrentWorm();
    if (!worm || !worm.grounded) return;

    // Sprint with Shift
    this._sprinting = this._isSprinting();
    if (this._sprinting) {
      this._sprintEnergy = Math.max(0, this._sprintEnergy - dt * 0.4);
    } else {
      this._sprintEnergy = Math.min(1, this._sprintEnergy + dt * 0.15);
    }
    const moveSpeed = this._sprinting ? 10 : 6;
    const moveDir = new THREE.Vector3();

    if (this._keys.has("w") || this._keys.has("arrowup")) {
      moveDir.x += Math.sin(this._camTheta + Math.PI);
      moveDir.z += Math.cos(this._camTheta + Math.PI);
    }
    if (this._keys.has("s") || this._keys.has("arrowdown")) {
      moveDir.x -= Math.sin(this._camTheta + Math.PI);
      moveDir.z -= Math.cos(this._camTheta + Math.PI);
    }
    if (this._keys.has("a") || this._keys.has("arrowleft")) {
      moveDir.x += Math.cos(this._camTheta + Math.PI);
      moveDir.z -= Math.sin(this._camTheta + Math.PI);
    }
    if (this._keys.has("d") || this._keys.has("arrowright")) {
      moveDir.x -= Math.cos(this._camTheta + Math.PI);
      moveDir.z += Math.sin(this._camTheta + Math.PI);
    }

    if (moveDir.length() > 0) {
      moveDir.normalize();
      worm.pos.x += moveDir.x * moveSpeed * dt;
      worm.pos.z += moveDir.z * moveSpeed * dt;
      worm.facing = Math.atan2(moveDir.x, moveDir.z);

      // Footstep dust
      this._footstepTimer += dt;
      if (this._footstepTimer > 0.25) {
        this._footstepTimer = 0;
        this._spawnFootstepDust(worm.pos.clone());
      }

      // Slope following
      const newTerrainH = this._getTerrainHeight(worm.pos.x, worm.pos.z);
      const slope = newTerrainH - (worm.pos.y - WORM_HEIGHT / 2);
      if (slope > 0 && slope < 1.5) {
        worm.pos.y = newTerrainH + WORM_HEIGHT / 2;
      } else if (slope >= 1.5) {
        // Too steep, push back
        worm.pos.x -= moveDir.x * moveSpeed * dt;
        worm.pos.z -= moveDir.z * moveSpeed * dt;
      } else if (slope < -0.3) {
        worm.grounded = false;
      }
    }
  }

  /* ═══════════ projectile update ═══════════ */

  private _updateProjectiles(dt: number): void {
    for (let i = this._projectiles.length - 1; i >= 0; i--) {
      const p = this._projectiles[i];
      p.age += dt;

      // Sheep walks on terrain instead of flying
      if (p.weapon.name === "Sheep") {
        p.vel.y = 0;
        const sheepH = this._getTerrainHeight(p.pos.x, p.pos.z);
        p.pos.y = sheepH + 0.2;
        // Sheep fuse timer
        p.fuseTimer -= dt;
        if (p.fuseTimer <= 0) {
          this._createExplosion(p.pos.clone(), p.weapon);
          this._scene.remove(p.mesh);
          this._projectiles.splice(i, 1);
          continue;
        }
        // Bounce at terrain edges
        if (sheepH < WATER_LEVEL) {
          this._createExplosion(p.pos.clone(), p.weapon);
          this._scene.remove(p.mesh);
          this._projectiles.splice(i, 1);
          continue;
        }
        p.pos.add(p.vel.clone().multiplyScalar(dt));
        p.mesh.position.copy(p.pos);
        p.mesh.rotation.y += dt * 2;
        continue;
      }

      // Mole burrows through terrain on impact
      if (p.weapon.name === "Mole Bomb" && p.bounces > 0) {
        // Mole is underground, deform terrain as it goes
        p.vel.y = -2; // travel slightly downward
        p.pos.add(p.vel.clone().multiplyScalar(dt));
        p.mesh.position.copy(p.pos);
        p.mesh.visible = false;
        this._deformTerrain(p.pos.x, p.pos.z, 1.5, 0.8);

        // Spawn dirt particles at surface
        const surfH = this._getTerrainHeight(p.pos.x, p.pos.z);
        if (Math.random() < 0.3) {
          this._spawnExplosionParticles(new THREE.Vector3(p.pos.x, surfH, p.pos.z), 0.5, new THREE.Color(0x664422), 3);
        }

        p.fuseTimer -= dt;
        if (p.fuseTimer <= 0 || p.age > 4) {
          p.mesh.visible = true;
          this._createExplosion(new THREE.Vector3(p.pos.x, surfH, p.pos.z), p.weapon);
          this._scene.remove(p.mesh);
          this._projectiles.splice(i, 1);
          continue;
        }
        continue;
      }

      // Gravity
      p.vel.y += GRAVITY * dt;

      // Wind (horizontal only for projectiles in air)
      if (p.weapon.type === "projectile") {
        p.vel.x += this._wind * 8 * dt;
      }

      // Move
      p.pos.add(p.vel.clone().multiplyScalar(dt));
      p.mesh.position.copy(p.pos);

      // Orient toward velocity
      if (p.weapon.type === "projectile" && p.vel.length() > 1) {
        const lookTarget = p.pos.clone().add(p.vel.clone().normalize());
        p.mesh.lookAt(lookTarget);
      } else {
        p.mesh.rotation.x += dt * 5;
      }

      // Exhaust flicker for rockets
      if (p.weapon.type === "projectile") {
        const exhaust = (p.mesh as any).getObjectByName?.("exhaust");
        if (exhaust) {
          exhaust.scale.setScalar(0.7 + Math.random() * 0.6);
        }
      }

      // Terrain collision
      const terrainH = this._getTerrainHeight(p.pos.x, p.pos.z);
      if (p.pos.y <= terrainH) {
        if (p.weapon.name === "Mole Bomb" && p.bounces === 0) {
          // Start burrowing
          p.bounces = 1;
          p.fuseTimer = 2.5;
          p.vel.set(p.vel.x * 0.3, -2, p.vel.z * 0.3);
          this._playSound(200, 0.15, "sine", 0.2);
          this._addFloatingText("*burrow*", p.pos.clone().add(new THREE.Vector3(0, 1, 0)), "#664422");
          continue;
        }
        if (p.weapon.type === "grenade") {
          // Bounce
          p.pos.y = terrainH + 0.2;
          p.vel.y = Math.abs(p.vel.y) * 0.4;
          p.vel.x *= 0.7;
          p.vel.z *= 0.7;
          p.bounces++;
          this._playSound(300, 0.05, "sine", 0.05);
        } else {
          // Impact
          this._createExplosion(p.pos.clone(), p.weapon);
          this._scene.remove(p.mesh);
          if (p.trail) this._scene.remove(p.trail);
          this._projectiles.splice(i, 1);
          continue;
        }
      }

      // Water check
      if (p.pos.y < WATER_LEVEL + this._waterMesh.position.y) {
        this._spawnWaterSplash(p.pos);
        this._scene.remove(p.mesh);
        if (p.trail) this._scene.remove(p.trail);
        this._projectiles.splice(i, 1);
        continue;
      }

      // Fuse timer (grenades, placed)
      if (p.weapon.type === "grenade" || p.weapon.type === "placed") {
        p.fuseTimer -= dt;
        // Blink faster as fuse runs out
        const blinkRate = Math.max(0.05, p.fuseTimer * 0.3);
        const blink = Math.sin(this._time / blinkRate) > 0;
        const blinkMesh = p.mesh.material ? p.mesh : (p.mesh as unknown as THREE.Group).children[0] as THREE.Mesh;
        (blinkMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = blink ? 1.5 : 0.2;

        if (p.fuseTimer <= 0) {
          this._createExplosion(p.pos.clone(), p.weapon);
          this._scene.remove(p.mesh);
          if (p.trail) this._scene.remove(p.trail);
          this._projectiles.splice(i, 1);
          continue;
        }
      }

      // Out of bounds
      if (Math.abs(p.pos.x) > TERRAIN_SIZE || Math.abs(p.pos.z) > TERRAIN_SIZE || p.pos.y > 100) {
        this._scene.remove(p.mesh);
        if (p.trail) this._scene.remove(p.trail);
        this._projectiles.splice(i, 1);
        continue;
      }

      // Mine proximity check
      if (p.weapon.name === "Mine" && p.age > 1) {
        for (const worm of this._worms) {
          if (!worm.alive || worm === p.owner) continue;
          if (worm.pos.distanceTo(p.pos) < 2) {
            this._createExplosion(p.pos.clone(), p.weapon);
            this._scene.remove(p.mesh);
            this._projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  /* ═══════════ explosions update ═══════════ */

  private _updateExplosions(dt: number): void {
    for (let i = this._explosions.length - 1; i >= 0; i--) {
      const e = this._explosions[i];
      e.timer += dt;
      const t = e.timer / e.maxTimer;

      if (t >= 1) {
        this._scene.remove(e.mesh);
        this._scene.remove(e.light);
        this._scene.remove(e.ring);
        this._explosions.splice(i, 1);
        continue;
      }

      // Expand and fade
      const scale = 1 + t * 3;
      e.mesh.scale.setScalar(scale);
      (e.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.8;

      e.light.intensity = (1 - t) * 5;

      // Ring expands
      e.ring.scale.setScalar(1 + t * 4);
      (e.ring.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.4;

      // Color transition: orange → dark
      const color = new THREE.Color().lerpColors(
        new THREE.Color(0xff8800),
        new THREE.Color(0x331100),
        t,
      );
      (e.mesh.material as THREE.MeshBasicMaterial).color = color;
    }
  }

  /* ═══════════ air strikes ═══════════ */

  private _updateAirStrikes(dt: number): void {
    for (let i = this._airStrikes.length - 1; i >= 0; i--) {
      const as = this._airStrikes[i];
      let allLanded = true;

      for (const missile of as.missiles) {
        if (missile.landed) continue;
        allLanded = false;

        missile.pos.add(missile.vel.clone().multiplyScalar(dt));
        missile.mesh.position.copy(missile.pos);

        const terrainH = this._getTerrainHeight(missile.pos.x, missile.pos.z);
        if (missile.pos.y <= terrainH) {
          missile.landed = true;
          this._createExplosion(missile.pos.clone(), as.weapon);
          this._scene.remove(missile.mesh);
        }
      }

      if (allLanded) {
        this._airStrikes.splice(i, 1);
      }
    }
  }

  /* ═══════════ strikes (excalibur, meteor, donkey) ═══════════ */

  private _updateStrikes(dt: number): void {
    for (let i = this._strikes.length - 1; i >= 0; i--) {
      const s = this._strikes[i];
      s.timer += dt;

      if (s.phase === "descend" && s.mesh) {
        s.mesh.position.y -= dt * 40;
        s.mesh.rotation.y += dt * 5;

        // Light trail
        if (Math.random() < 0.3) {
          this._spawnExplosionParticles(s.mesh.position.clone(), 0.5, new THREE.Color(0xffaa00), 3);
        }

        const terrainH = this._getTerrainHeight(s.mesh.position.x, s.mesh.position.z);
        if (s.mesh.position.y <= terrainH) {
          s.phase = "impact";
          this._createExplosion(s.mesh.position.clone(), s.weapon);
          this._scene.remove(s.mesh);
          s.mesh = null;

          // Concrete donkey bounces and hits again
          if (s.weapon.name === "Concrete Donkey" && s.timer < 3) {
            const newMesh = new THREE.Mesh(
              new THREE.BoxGeometry(0.8, 1.2, 1.5),
              new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 }),
            );
            newMesh.position.set(s.pos.x + (Math.random() - 0.5) * 4, 30, s.pos.z + (Math.random() - 0.5) * 4);
            this._scene.add(newMesh);
            s.mesh = newMesh;
            s.phase = "descend";
          }
        }
      } else if (s.phase === "impact") {
        // Done
        this._strikes.splice(i, 1);
      }

      // Timeout
      if (s.timer > 5) {
        if (s.mesh) this._scene.remove(s.mesh);
        this._strikes.splice(i, 1);
      }
    }
  }

  /* ═══════════ particles ═══════════ */

  private _updateParticles(dt: number): void {
    const positions = this._particleGeo.attributes.position as THREE.BufferAttribute;
    const colors = this._particleGeo.attributes.color as THREE.BufferAttribute;
    const sizes = this._particleGeo.attributes.size as THREE.BufferAttribute;

    let activeCount = 0;

    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this._particles.splice(i, 1);
        continue;
      }

      // Physics
      p.vel.y += GRAVITY * 0.3 * dt;
      p.pos.add(p.vel.clone().multiplyScalar(dt));

      if (activeCount < 2000) {
        positions.setXYZ(activeCount, p.pos.x, p.pos.y, p.pos.z);
        const fade = p.life / p.maxLife;
        colors.setXYZ(activeCount, p.color.r * fade, p.color.g * fade, p.color.b * fade);
        sizes.setX(activeCount, p.size * fade);
        activeCount++;
      }
    }

    // Zero out unused
    for (let i = activeCount; i < Math.min(activeCount + 10, 2000); i++) {
      positions.setXYZ(i, 0, -1000, 0);
      sizes.setX(i, 0);
    }

    this._particleGeo.setDrawRange(0, activeCount);
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
  }

  /* ═══════════ floating texts ═══════════ */

  private _updateFloatingTexts(dt: number): void {
    for (let i = this._floatingTexts.length - 1; i >= 0; i--) {
      const ft = this._floatingTexts[i];
      ft.timer -= dt;
      ft.worldPos.y += dt * 2;

      if (ft.timer <= 0) {
        ft.el.remove();
        this._floatingTexts.splice(i, 1);
        continue;
      }

      // Project world position to screen
      const screenPos = ft.worldPos.clone().project(this._camera);
      const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

      if (screenPos.z < 1) {
        ft.el.style.left = `${x}px`;
        ft.el.style.top = `${y}px`;
        ft.el.style.opacity = `${ft.timer}`;
        ft.el.style.display = "block";
      } else {
        ft.el.style.display = "none";
      }
    }
  }

  /* ═══════════ ninja rope ═══════════ */

  private _updateRope(dt: number): void {
    if (!this._ropeActive) return;
    const worm = this._getCurrentWorm();
    if (!worm) return;

    // Swing physics
    const toAnchor = this._ropeAnchor.clone().sub(worm.pos);
    const dist = toAnchor.length();

    if (dist > this._ropeLength) {
      toAnchor.normalize();
      worm.pos.copy(this._ropeAnchor.clone().sub(toAnchor.multiplyScalar(this._ropeLength)));
      // Remove velocity component along rope
      const velDot = worm.vel.dot(toAnchor);
      if (velDot < 0) {
        worm.vel.sub(toAnchor.multiplyScalar(velDot));
      }
    }

    worm.vel.y += GRAVITY * dt;

    // Swing with keys
    if (this._keys.has("a") || this._keys.has("arrowleft")) {
      worm.vel.x -= 15 * dt;
    }
    if (this._keys.has("d") || this._keys.has("arrowright")) {
      worm.vel.x += 15 * dt;
    }

    worm.pos.add(worm.vel.clone().multiplyScalar(dt));
    worm.mesh.position.copy(worm.pos);

    // Update rope line
    if (this._ropeLine) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        worm.pos.clone().add(new THREE.Vector3(0, 0.5, 0)),
        this._ropeAnchor,
      ]);
      this._ropeLine.geometry.dispose();
      this._ropeLine.geometry = lineGeo;
    }

    // Release with space or enter
    if (this._keys.has(" ") || this._keys.has("enter")) {
      this._ropeActive = false;
      if (this._ropeLine) {
        this._scene.remove(this._ropeLine);
        this._ropeLine = null;
      }
    }
  }

  /* ═══════════ smoke trails ═══════════ */

  private _updateSmokeTrails(dt: number): void {
    // Spawn smoke behind projectiles
    for (const p of this._projectiles) {
      if (p.weapon.type === "projectile" && Math.random() < 0.4) {
        const smokeGeo = new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 10, 10);
        const smoke = new THREE.Mesh(smokeGeo, new THREE.MeshBasicMaterial({
          color: 0xaaaaaa, transparent: true, opacity: 0.5, depthWrite: false,
        }));
        smoke.position.copy(p.pos);
        this._scene.add(smoke);
        this._smokeTrails.push({ pos: p.pos.clone(), life: 0.8, mesh: smoke });
      }
    }

    // Update existing smoke
    for (let i = this._smokeTrails.length - 1; i >= 0; i--) {
      const s = this._smokeTrails[i];
      s.life -= dt;
      if (s.life <= 0) {
        this._scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
        this._smokeTrails.splice(i, 1);
        continue;
      }
      const t = 1 - s.life / 0.8;
      s.mesh.scale.setScalar(1 + t * 2);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
      s.mesh.position.y += dt * 0.5; // smoke rises
    }
  }

  /* ═══════════ aim arrow ═══════════ */

  private _updateAimArrow(): void {
    if (!this._aimArrow) return;
    const worm = this._getCurrentWorm();
    if (!worm || (this._phase !== "playing" && this._phase !== "aiming") || this._isAiTurn()) {
      this._aimArrow.visible = false;
      return;
    }

    this._aimArrow.visible = true;
    this._aimArrow.position.copy(worm.pos).add(new THREE.Vector3(0, 0.5, 0));

    // Point in aim direction
    const dir = new THREE.Vector3(
      Math.sin(worm.facing) * Math.cos(worm.aimAngle),
      Math.sin(worm.aimAngle),
      Math.cos(worm.facing) * Math.cos(worm.aimAngle),
    ).normalize();

    const lookTarget = this._aimArrow.position.clone().add(dir);
    this._aimArrow.lookAt(lookTarget);
  }

  /* ═══════════ active indicator ═══════════ */

  private _updateActiveIndicator(): void {
    if (!this._activeIndicator) return;
    const worm = this._getCurrentWorm();
    if (!worm || this._phase === "title" || this._phase === "victory") {
      this._activeIndicator.visible = false;
      return;
    }

    this._activeIndicator.visible = true;
    this._activeIndicator.position.set(worm.pos.x, worm.pos.y + 2.5 + Math.sin(this._time * 3) * 0.15, worm.pos.z);
    this._activeIndicator.rotation.y += this._dt * 2;
  }

  /* ═══════════ camera ═══════════ */

  private _updateCamera(dt: number): void {
    // Free camera mode — WASD moves camera independent of worms
    if (this._freeCamera) {
      const speed = 20;
      const fwd = new THREE.Vector3(-Math.sin(this._camTheta), 0, -Math.cos(this._camTheta));
      const right = new THREE.Vector3(-Math.cos(this._camTheta), 0, Math.sin(this._camTheta));
      if (this._keys.has("w") || this._keys.has("arrowup")) this._camSmooth.add(fwd.clone().multiplyScalar(speed * dt));
      if (this._keys.has("s") || this._keys.has("arrowdown")) this._camSmooth.add(fwd.clone().multiplyScalar(-speed * dt));
      if (this._keys.has("a") || this._keys.has("arrowleft")) this._camSmooth.add(right.clone().multiplyScalar(-speed * dt));
      if (this._keys.has("d") || this._keys.has("arrowright")) this._camSmooth.add(right.clone().multiplyScalar(speed * dt));
      this._camTarget.copy(this._camSmooth);
    } else {
      const worm = this._getCurrentWorm();
      if (worm) {
        this._camTarget.lerp(worm.pos, dt * 3);
      }
      this._camSmooth.lerp(this._camTarget, dt * 4);
    }

    // Calculate camera position from spherical coordinates
    const x = this._camSmooth.x + this._camDist * Math.sin(this._camTheta) * Math.sin(this._camPhi);
    const y = this._camSmooth.y + this._camDist * Math.cos(this._camPhi);
    const z = this._camSmooth.z + this._camDist * Math.cos(this._camTheta) * Math.sin(this._camPhi);

    this._camera.position.set(x, Math.max(WATER_LEVEL + 2, y), z);
    this._camera.lookAt(this._camSmooth);

    // Keyboard camera rotation
    if (this._keys.has("q")) this._camTheta += dt * 2;
    if (this._keys.has("e")) this._camTheta -= dt * 2;
    // Keyboard camera up/down
    if (this._keys.has("r")) this._camPhi = Math.max(0.1, this._camPhi - dt * 1.5);
    if (this._keys.has("f") && !this._freeCamera) this._camPhi = Math.min(Math.PI * 0.45, this._camPhi + dt * 1.5);
  }

  /* ═══════════ worm visuals ═══════════ */

  private _updateWormVisuals(): void {
    for (const worm of this._worms) {
      if (!worm.alive) continue;

      // Face direction
      worm.mesh.rotation.y = worm.facing;

      // Animate cape
      const cape = worm.mesh.getObjectByName("cape");
      if (cape && cape instanceof THREE.Mesh) {
        const capePos = cape.geometry.attributes.position;
        for (let ci = 0; ci < capePos.count; ci++) {
          const cy = capePos.getY(ci);
          const wave = Math.sin(this._time * 4 + cy * 3 + worm.pos.x) * 0.08
                     + Math.sin(this._time * 6 + cy * 5) * 0.04;
          capePos.setZ(ci, -Math.pow(Math.abs(cy), 1.5) * 0.3 + wave);
        }
        capePos.needsUpdate = true;
        cape.geometry.computeVertexNormals();
      }

      // Update HP bar
      const hpBar = worm.mesh.getObjectByName("hpBarFill");
      if (hpBar) {
        const displayHp = this._getDisplayHp(worm);
        const pct = Math.max(0, displayHp / worm.maxHp);
        hpBar.scale.x = pct;
        hpBar.position.x = -(1 - pct) * 0.6;
        const mat = (hpBar as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (pct > 0.5) mat.color.setHex(0x44dd44);
        else if (pct > 0.25) mat.color.setHex(0xddaa22);
        else mat.color.setHex(0xdd3333);
      }

      // Make HP bars face camera
      const hpBg = worm.mesh.getObjectByName("hpBarBg");
      if (hpBg && hpBar) {
        hpBg.lookAt(this._camera.position);
        hpBar.lookAt(this._camera.position);
      }

      // Current worm highlight and walking animation
      const isActive = worm === this._getCurrentWorm();
      if (isActive) {
        const isMoving = worm.grounded && worm.vel.length() > 0.5;
        if (isMoving) {
          this._walkCycle += this._dt * 12;
          // Leg swing animation
          worm.mesh.children.forEach((child, idx) => {
            // Legs are children ~8-11 (after body, head, helmet, visor, eyes, arms, hands)
            if (child.position && Math.abs(child.position.y) < 0.2 && idx >= 10 && idx <= 13) {
              if (idx % 2 === 0) {
                child.rotation.x = Math.sin(this._walkCycle) * 0.4;
              } else {
                child.rotation.x = -Math.sin(this._walkCycle) * 0.4;
              }
            }
          });
          // Body bob
          worm.mesh.position.y = worm.pos.y + Math.abs(Math.sin(this._walkCycle * 2)) * 0.06;
        } else {
          // Idle bob + fidgets
          worm.mesh.position.y = worm.pos.y + Math.sin(this._time * 3) * 0.05;
          // Slight body sway
          worm.mesh.rotation.z = Math.sin(this._time * 1.5 + worm.pos.x) * 0.03;
          // Reset leg rotations
          worm.mesh.children.forEach((child, idx) => {
            if (idx >= 10 && idx <= 13) child.rotation.x = 0;
          });
          // Occasional head turn (look around)
          const headTurn = Math.sin(this._time * 0.8 + worm.pos.z * 2) * 0.15;
          worm.mesh.rotation.y = worm.facing + headTurn;
        }
      }
    }
  }

  /* ═══════════ audio ═══════════ */

  private _getAudioCtx(): AudioContext {
    if (!this._audioCtx) {
      this._audioCtx = new AudioContext();
    }
    return this._audioCtx;
  }

  private _playSound(freq: number, vol: number, type: OscillatorType, duration: number): void {
    try {
      const ctx = this._getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.3, ctx.currentTime + duration);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  private _playExplosionSound(radius: number): void {
    try {
      const ctx = this._getAudioCtx();
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 8) * (radius / 5);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch (_) {}
  }

  /* ═══════════ destroy ═══════════ */

  destroy(): void {
    this._destroyed = true;
    cancelAnimationFrame(this._animFrame);

    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("mousedown", this._onMouseDown);
    window.removeEventListener("mouseup", this._onMouseUp);
    window.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("wheel", this._onWheel);
    window.removeEventListener("click", this._onClick);
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("contextmenu", this._onContextMenu);

    // Remove DOM
    this._hudContainer?.parentNode?.removeChild(this._hudContainer);
    this._titleOverlay?.parentNode?.removeChild(this._titleOverlay);
    this._turnAnnouncement?.remove();
    this._pauseOverlay?.remove();
    this._stopMusic();

    // Remove weather particles
    if (this._raindrops) { this._scene.remove(this._raindrops); }
    if (this._lightningFlash) { this._scene.remove(this._lightningFlash); }

    // Remove wind particles
    for (const wp of this._windParticles) { this._scene.remove(wp.mesh); }

    // Remove fire zones
    for (const fz of this._fireZones) { this._scene.remove(fz.light); this._scene.remove(fz.particles); }

    // Remove shooting stars
    for (const ss of this._shootingStars) { this._scene.remove(ss.trail); }

    // Remove splashes, bubbles, debris, arcs
    for (const sp of this._splashes) { this._scene.remove(sp.mesh); }
    for (const db of this._drowningBubbles) { this._scene.remove(db.mesh); }
    for (const d of this._debris) { this._scene.remove(d.mesh); }
    for (const ma of this._meleeArcs) { this._scene.remove(ma.mesh); }
    this._turnTransition?.remove();

    // Remove heat shimmer
    for (const hs of this._heatShimmerMeshes) { this._scene.remove(hs.mesh); }

    // Dispose bloom targets
    if (this._bloomPass) {
      this._bloomPass.target.dispose();
      this._bloomPass.blurTarget.dispose();
    }

    // Remove trajectory line
    if (this._trajectoryLine) {
      this._scene.remove(this._trajectoryLine);
      this._trajectoryLine.geometry.dispose();
    }

    // Remove smoke trails
    for (const s of this._smokeTrails) {
      this._scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
    }

    // Dispose Three.js
    this._scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        (obj as THREE.Mesh).geometry?.dispose();
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat instanceof THREE.Material) mat.dispose();
      }
    });

    this._renderer.dispose();
    if (this._renderer.domElement.parentNode) {
      this._renderer.domElement.parentNode.removeChild(this._renderer.domElement);
    }

    this._audioCtx?.close().catch(() => {});
  }
}
