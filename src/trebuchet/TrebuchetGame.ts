// ---------------------------------------------------------------------------
// TREBUCHET — 3D Medieval Siege Defense
// Man the trebuchet atop Camelot's walls and rain destruction on waves of
// invaders marching toward your gates. Aim with mouse, set power with hold,
// launch boulders, fire pots, and holy water at foot soldiers, siege towers,
// battering rams, and boss warlords. Upgrade your trebuchet between waves.
// Physics-based 3D projectile arcs, destructible enemies, and medieval glory.
// ---------------------------------------------------------------------------

import * as THREE from "three";

// ── Constants ────────────────────────────────────────────────────────────────

const FIELD_LENGTH = 120; // depth of the battlefield (z axis, enemies march toward z=0)
const FIELD_WIDTH = 60; // width of the battlefield
const WALL_HEIGHT = 8;
const WALL_Z = 0; // player wall at z=0

const GRAVITY = -18;
const MIN_POWER = 15;
const MAX_POWER = 55;
const POWER_CHARGE_SPEED = 30; // units/sec while holding
const LAUNCH_HEIGHT = WALL_HEIGHT + 3; // trebuchet arm tip height

const GATE_MAX_HP = 200;
const GATE_WIDTH = 8;

// ── Ammo Types ───────────────────────────────────────────────────────────────

const AMMO_TYPES = ["boulder", "fire_pot", "holy_water", "chain_shot"] as const;
type AmmoType = (typeof AMMO_TYPES)[number];

interface AmmoDef {
  name: string;
  color: number;
  emissive: number;
  damage: number;
  splash: number; // splash radius
  special: string;
  unlockWave: number;
}

const AMMO_DEFS: Record<AmmoType, AmmoDef> = {
  boulder: {
    name: "Boulder",
    color: 0x888888,
    emissive: 0x000000,
    damage: 30,
    splash: 3,
    special: "none",
    unlockWave: 1,
  },
  fire_pot: {
    name: "Fire Pot",
    color: 0xff4400,
    emissive: 0x882200,
    damage: 20,
    splash: 5,
    special: "burn",
    unlockWave: 3,
  },
  holy_water: {
    name: "Holy Water",
    color: 0x44aaff,
    emissive: 0x2255aa,
    damage: 15,
    splash: 6,
    special: "slow",
    unlockWave: 5,
  },
  chain_shot: {
    name: "Chain Shot",
    color: 0x555555,
    emissive: 0x000000,
    damage: 50,
    splash: 1.5,
    special: "pierce",
    unlockWave: 8,
  },
};

// ── Enemy Types ──────────────────────────────────────────────────────────────

const ENEMY_TYPES = ["footman", "shieldbearer", "siege_tower", "battering_ram", "catapult", "cavalry"] as const;
type EnemyType = (typeof ENEMY_TYPES)[number];

interface EnemyDef {
  name: string;
  hp: number;
  speed: number;
  width: number;
  height: number;
  depth: number;
  color: number;
  gateDamage: number; // damage to gate on reaching wall
  points: number;
  firstWave: number;
}

const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  footman: { name: "Footman", hp: 20, speed: 4, width: 0.6, height: 1.6, depth: 0.6, color: 0xaa3333, gateDamage: 5, points: 10, firstWave: 1 },
  shieldbearer: { name: "Shieldbearer", hp: 50, speed: 3, width: 0.8, height: 1.8, depth: 0.8, color: 0x6666aa, gateDamage: 8, points: 25, firstWave: 2 },
  siege_tower: { name: "Siege Tower", hp: 200, speed: 1.5, width: 3, height: 6, depth: 3, color: 0x664422, gateDamage: 40, points: 100, firstWave: 4 },
  battering_ram: { name: "Battering Ram", hp: 150, speed: 2.5, width: 2, height: 2.5, depth: 5, color: 0x553311, gateDamage: 60, points: 80, firstWave: 6 },
  catapult: { name: "Catapult", hp: 100, speed: 2, width: 2.5, height: 3, depth: 3, color: 0x886633, gateDamage: 15, points: 60, firstWave: 7 },
  cavalry: { name: "Cavalry", hp: 40, speed: 8, width: 1, height: 2, depth: 2, color: 0xcc8844, gateDamage: 12, points: 35, firstWave: 3 },
};

// ── Upgrades ─────────────────────────────────────────────────────────────────

interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  baseCost: number;
  maxLevel: number;
}

const UPGRADE_DEFS: UpgradeDef[] = [
  { id: "power", name: "Counterweight", desc: "+10 max launch power", baseCost: 30, maxLevel: 5 },
  { id: "splash", name: "Shrapnel", desc: "+1.5 splash radius", baseCost: 40, maxLevel: 4 },
  { id: "reload", name: "Winch Crew", desc: "-0.3s reload time", baseCost: 50, maxLevel: 5 },
  { id: "gate", name: "Reinforce Gate", desc: "+40 gate max HP & repair", baseCost: 35, maxLevel: 5 },
  { id: "multishot", name: "Twin Arm", desc: "Chance to fire 2 projectiles", baseCost: 80, maxLevel: 3 },
];

// ── Wave Definitions ─────────────────────────────────────────────────────────

interface WaveSpawn {
  type: EnemyType;
  count: number;
  delay: number; // seconds between spawns
  laneSpread: number; // how wide they spread across x axis (0-1)
}

function generateWave(waveNum: number): WaveSpawn[] {
  const spawns: WaveSpawn[] = [];
  const n = waveNum;

  // Always footmen
  spawns.push({ type: "footman", count: 3 + n * 2, delay: 0.8 - Math.min(n * 0.03, 0.4), laneSpread: 0.6 + Math.min(n * 0.03, 0.35) });

  if (n >= 2) spawns.push({ type: "shieldbearer", count: Math.floor(n / 2) + 1, delay: 1.5, laneSpread: 0.5 });
  if (n >= 3) spawns.push({ type: "cavalry", count: Math.floor(n / 3) + 1, delay: 2.0, laneSpread: 0.8 });
  if (n >= 4 && n % 2 === 0) spawns.push({ type: "siege_tower", count: Math.floor(n / 4), delay: 5.0, laneSpread: 0.4 });
  if (n >= 6 && n % 3 === 0) spawns.push({ type: "battering_ram", count: Math.floor(n / 6), delay: 6.0, laneSpread: 0.3 });
  if (n >= 7) spawns.push({ type: "catapult", count: Math.floor((n - 5) / 3) + 1, delay: 4.0, laneSpread: 0.5 });

  return spawns;
}

// ── Wave Modifiers ───────────────────────────────────────────────────────────

const WAVE_MODIFIERS = [
  { id: "normal", name: "Standard", desc: "No modifier", color: "#aaa" },
  { id: "armored", name: "Ironclad", desc: "Enemies have +50% HP", color: "#8888cc" },
  { id: "swarm", name: "Swarm", desc: "Double enemies, half HP", color: "#ccaa44" },
  { id: "speed", name: "Blitz", desc: "Enemies move 40% faster", color: "#cc4444" },
  { id: "regen", name: "Cursed", desc: "Enemies slowly regenerate", color: "#44cc44" },
  { id: "shield", name: "Shielded", desc: "Enemies resist first hit (50% less)", color: "#4488cc" },
  { id: "bounty", name: "Bounty", desc: "Enemies drop 2x gold", color: "#ffd700" },
  { id: "fragile", name: "Glass Cannon", desc: "Half HP but +50% gate damage", color: "#ff6644" },
] as const;

function pickWaveModifier(waveNum: number): typeof WAVE_MODIFIERS[number] {
  if (waveNum <= 2) return WAVE_MODIFIERS[0]; // no modifier early
  if (waveNum % 5 === 0) return WAVE_MODIFIERS[0]; // boss waves are normal

  // Difficulty spike waves get the hardest modifiers
  if (waveNum === 12) return WAVE_MODIFIERS[1]; // Ironclad (armored)
  if (waveNum === 18) return WAVE_MODIFIERS[3]; // Blitz (speed)
  if (waveNum === 22) return WAVE_MODIFIERS[7]; // Glass Cannon (fragile but deadly)
  if (waveNum === 24) return WAVE_MODIFIERS[2]; // Swarm (overwhelm before final boss)

  // Deterministic but varied selection based on wave number
  const pool = WAVE_MODIFIERS.filter((m) => m.id !== "normal");
  const idx = ((waveNum * 7 + 3) % pool.length);
  return pool[idx];
}

// ── Elemental Weakness Table ─────────────────────────────────────────────────

const WEAKNESS_TABLE: Partial<Record<AmmoType, Partial<Record<EnemyType, number>>>> = {
  fire_pot: { shieldbearer: 1.5, siege_tower: 1.3 }, // fire melts shields, burns wood
  holy_water: { cavalry: 1.8, footman: 1.3, siege_tower: 1.4, catapult: 1.3 }, // holy water spooks horses, rots wood
  chain_shot: { siege_tower: 2.0, battering_ram: 2.0, catapult: 2.0 }, // anti-siege (existing, now in table)
  boulder: { catapult: 1.4 }, // rocks smash catapults
};

// ── Boss Definitions ─────────────────────────────────────────────────────────

interface BossDef {
  name: string;
  hp: number;
  speed: number;
  width: number;
  height: number;
  depth: number;
  color: number;
  gateDamage: number;
  points: number;
  ability: string;
}

const BOSSES: BossDef[] = [
  { name: "Mordred's Vanguard", hp: 500, speed: 2, width: 4, height: 5, depth: 4, color: 0x440000, gateDamage: 80, points: 500, ability: "shield" },
  { name: "The Iron Colossus", hp: 900, speed: 1.2, width: 5, height: 8, depth: 5, color: 0x333344, gateDamage: 120, points: 1000, ability: "armor" },
  { name: "Morgana's Siege Beast", hp: 1500, speed: 1.5, width: 6, height: 7, depth: 6, color: 0x550066, gateDamage: 150, points: 2000, ability: "regen" },
];

// ── Projectile State ─────────────────────────────────────────────────────────

interface Projectile {
  mesh: THREE.Mesh;
  trail: THREE.Points;
  trailPositions: THREE.Vector3[];
  velocity: THREE.Vector3;
  ammo: AmmoType;
  alive: boolean;
  time: number;
  directHit: boolean;
}

// ── Enemy State ──────────────────────────────────────────────────────────────

interface EnemyState {
  mesh: THREE.Group;
  type: EnemyType;
  hp: number;
  maxHp: number;
  x: number;
  z: number;
  speed: number;
  dead: boolean;
  hitFlash: number;
  burning: number; // burn DOT timer
  slowed: number; // slow timer
  isBoss: boolean;
  bossDef?: BossDef;
  bossShieldActive?: boolean;
  bossRegenTimer?: number;
  attackTimer?: number;
  gateDmgMult: number;
  goldMult: number;
  regenRate: number; // from wave modifier
  firstHitShield: boolean; // from "shielded" modifier
  hpBar?: THREE.Mesh;
  hpBarBg?: THREE.Mesh;
}

// ── Explosion FX ─────────────────────────────────────────────────────────────

interface Explosion {
  mesh: THREE.Group;
  time: number;
  maxTime: number;
  radius: number;
}

// ── Phases ───────────────────────────────────────────────────────────────────

type Phase = "title" | "playing" | "between_waves" | "boss" | "shop" | "victory" | "defeat" | "paused";

// ── Main Class ───────────────────────────────────────────────────────────────

export class TrebuchetGame {
  // Three.js core
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _animFrame = 0;
  private _destroyed = false;
  private _dt = 0;
  private _time = 0;

  // Game state
  private _phase: Phase = "title";
  private _lastRenderedPhase: Phase | null = null;
  private _hudDirty = true;
  private _wave = 0;
  private _score = 0;
  private _gold = 0;
  private _gateHp = GATE_MAX_HP;
  private _gateMaxHp = GATE_MAX_HP;

  // Trebuchet state
  private _aimAngleH = 0; // horizontal aim (radians, left-right across field)
  private _aimAngleV = 0.6; // vertical aim (radians, elevation)
  private _power = MIN_POWER;
  private _charging = false;
  private _reloadTimer = 0;
  private _reloadTime = 2.0;
  private _currentAmmo: AmmoType = "boulder";
  private _unlockedAmmo: AmmoType[] = ["boulder"];

  // Upgrades
  private _upgradeLevels: Record<string, number> = {};

  // Entities
  private _projectiles: Projectile[] = [];
  private _enemies: EnemyState[] = [];
  private _explosions: Explosion[] = [];

  // Wave spawning
  private _waveSpawns: WaveSpawn[] = [];
  private _spawnTimers: number[] = [];
  private _spawnCounts: number[] = [];
  private _waveEnemiesTotal = 0;
  private _waveEnemiesKilled = 0;

  // Scene objects
  private _trebuchetGroup!: THREE.Group;
  private _trebuchetArm!: THREE.Mesh;
  private _trebuchetSling!: THREE.Mesh;
  private _loadedAmmoMesh: THREE.Mesh | null = null;
  private _aimLine!: THREE.Line;
  private _groundPlane!: THREE.Mesh;
  private _wallMesh!: THREE.Group;
  private _gateMesh!: THREE.Mesh;
  private _gateCrackOverlay!: THREE.Mesh;
  private _crosshair!: THREE.Group;
  private _sunLight!: THREE.DirectionalLight;

  // Visual FX objects
  private _torches: { light: THREE.PointLight; mesh: THREE.Mesh }[] = [];
  private _clouds: THREE.Mesh[] = [];
  private _moatMesh!: THREE.Mesh;
  private _dustParticles!: THREE.Points;
  private _dustVelocities: Float32Array = new Float32Array(0);
  private _banners: THREE.Mesh[] = [];
  private _grassTufts: THREE.Mesh[] = [];
  private _screenShake = 0;
  private _screenShakeDir = new THREE.Vector2(0, 0); // directional shake
  private _armSwingTimer = -1; // <0 means idle
  private _freezeFrames = 0; // impact freeze (in frames)
  private _cameraZoomOffset = 0; // zoom during charge/kills
  private _cameraFollowProjectile: Projectile | null = null; // briefly follow last shot
  private _cameraFollowTimer = 0;
  private _lastComboMilestone = 0; // track when to play combo sting

  // Combo / kill streak
  private _comboCount = 0;
  private _comboTimer = 0;
  private _comboMultiplier = 1;
  private _maxCombo = 0;

  // Active abilities
  private _oilCooldown = 0;
  private _oilMaxCooldown = 15;
  private _volleyCooldown = 0;
  private _volleyMaxCooldown = 20;
  private _repairCooldown = 0;
  private _repairMaxCooldown = 30;

  // Wave modifier
  private _currentModifier: typeof WAVE_MODIFIERS[number] = WAVE_MODIFIERS[0];

  // Last Stand mode
  private _lastStandActive = false;

  // Catapult enemy projectiles
  private _enemyProjectiles: { mesh: THREE.Mesh; vel: THREE.Vector3; time: number }[] = [];

  // Stats tracking
  private _totalKills = 0;
  private _totalShots = 0;
  private _totalHits = 0;
  private _totalDamageDealt = 0;
  private _highscore = 0;
  private _bestWave = 0;

  // Floating damage numbers
  private _floatingTexts: { el: HTMLDivElement; startTime: number; x: number; y: number }[] = [];

  // Pause
  private _pausedPhase: Phase = "playing"; // phase to return to on unpause

  // Cached gate crack meshes (avoid scene.traverse)
  private _gateCrackMeshes: THREE.Mesh[] = [];

  // Dynamic atmosphere
  private _skyMat: THREE.ShaderMaterial | null = null;
  private _sceneFog: THREE.Fog | null = null;
  private _trebuchetRecoil = 0; // recoil animation timer
  private _chargeParticles: THREE.Points | null = null;

  // Centralized particle pool for fire/ice/dust sprites
  private _activeParticles: { mesh: THREE.Object3D; startTime: number; duration: number; update: (elapsed: number, dt: number) => void; cleanup: () => void }[] = [];

  // Late-game scaling
  private _difficultyMult = 1; // scales enemy HP and speed

  // Cached synergy list (recalculated once per wave start / upgrade purchase)
  private _cachedSynergies: string[] = [];
  private _particlesThisFrame = 0; // cap particle spawns per frame

  // Background music
  private _musicOsc: OscillatorNode | null = null;

  // HUD
  private _hudContainer!: HTMLDivElement;

  // Input
  private _mouseX = 0;
  private _mouseY = 0;
  private _keys: Set<string> = new Set();

  // Bound handlers
  private _onKeyDown!: (e: KeyboardEvent) => void;
  private _onKeyUp!: (e: KeyboardEvent) => void;
  private _onMouseMove!: (e: MouseEvent) => void;
  private _onMouseDown!: (e: MouseEvent) => void;
  private _onMouseUp!: (e: MouseEvent) => void;
  private _onResize!: () => void;
  private _onClick!: (e: MouseEvent) => void;

  // Audio
  private _audioCtx: AudioContext | null = null;

  // ── Boot ─────────────────────────────────────────────────────────────────

  async boot(): Promise<void> {
    this._initThree();
    this._buildScene();
    this._buildTrebuchet();
    this._buildHUD();
    this._bindInput();
    this._initAudio();

    // Init upgrade levels
    for (const u of UPGRADE_DEFS) this._upgradeLevels[u.id] = 0;

    // Load highscores
    try {
      this._highscore = parseInt(localStorage.getItem("trebuchet_highscore") || "0", 10);
      this._bestWave = parseInt(localStorage.getItem("trebuchet_bestwave") || "0", 10);
    } catch { /* ignore */ }

    this._phase = "title";

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

  // ── Destroy ──────────────────────────────────────────────────────────────

  destroy(): void {
    this._destroyed = true;
    cancelAnimationFrame(this._animFrame);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("mousedown", this._onMouseDown);
    window.removeEventListener("mouseup", this._onMouseUp);
    window.removeEventListener("click", this._onClick);
    window.removeEventListener("resize", this._onResize);

    if (this._hudContainer && this._hudContainer.parentNode) {
      this._hudContainer.parentNode.removeChild(this._hudContainer);
    }

    this._scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    this._renderer.dispose();
    if (this._renderer.domElement.parentNode) {
      this._renderer.domElement.parentNode.removeChild(this._renderer.domElement);
    }
    this._stopMusic();
    // Clean up floating texts
    for (const ft of this._floatingTexts) {
      if (ft.el.parentNode) ft.el.parentNode.removeChild(ft.el);
    }
    this._floatingTexts = [];
    // Clean up enemy projectiles
    for (const ep of this._enemyProjectiles) {
      this._scene.remove(ep.mesh);
      ep.mesh.geometry.dispose();
      (ep.mesh.material as THREE.Material).dispose();
    }
    this._enemyProjectiles = [];
    if (this._audioCtx) {
      this._audioCtx.close().catch(() => {});
    }
  }

  // ── Init Three.js ────────────────────────────────────────────────────────

  private _initThree(): void {
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.1;
    this._renderer.domElement.id = "trebuchet-canvas";
    this._renderer.domElement.style.position = "fixed";
    this._renderer.domElement.style.top = "0";
    this._renderer.domElement.style.left = "0";
    this._renderer.domElement.style.zIndex = "9999";
    document.body.appendChild(this._renderer.domElement);

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x667799);
    this._scene.fog = new THREE.Fog(0x667799, 80, FIELD_LENGTH + 30);

    // Camera: behind and above the wall, looking out over the field
    this._camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 300);
    this._camera.position.set(0, WALL_HEIGHT + 8, -10);
    this._camera.lookAt(0, 0, FIELD_LENGTH * 0.4);
  }

  // ── Build Scene ──────────────────────────────────────────────────────────

  private _buildScene(): void {
    // ── Sky dome ──
    const skyGeo = new THREE.SphereGeometry(200, 16, 12);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x3366aa) },
        bottomColor: { value: new THREE.Color(0xccbb99) },
        offset: { value: 20 },
        exponent: { value: 0.5 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
    });
    this._skyMat = skyMat;
    this._scene.add(new THREE.Mesh(skyGeo, skyMat));
    this._sceneFog = new THREE.Fog(0x99aabb, 80, FIELD_LENGTH + 40);
    this._scene.fog = this._sceneFog;

    // ── Clouds ──
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    for (let i = 0; i < 12; i++) {
      const cw = 15 + Math.random() * 25;
      const cd = 6 + Math.random() * 12;
      const cloud = new THREE.Mesh(new THREE.PlaneGeometry(cw, cd), cloudMat);
      cloud.rotation.x = -Math.PI / 2;
      cloud.position.set(
        (Math.random() - 0.5) * 200,
        50 + Math.random() * 30,
        Math.random() * FIELD_LENGTH * 1.5,
      );
      this._scene.add(cloud);
      this._clouds.push(cloud);
    }

    // ── Sunlight ──
    this._sunLight = new THREE.DirectionalLight(0xffeedd, 1.4);
    this._sunLight.position.set(20, 40, 30);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(2048, 2048);
    this._sunLight.shadow.camera.left = -60;
    this._sunLight.shadow.camera.right = 60;
    this._sunLight.shadow.camera.top = 60;
    this._sunLight.shadow.camera.bottom = -10;
    this._sunLight.shadow.camera.far = 150;
    this._scene.add(this._sunLight);

    // Secondary fill light (warm bounce from ground)
    const fillLight = new THREE.DirectionalLight(0xaa8855, 0.3);
    fillLight.position.set(-15, 5, 20);
    this._scene.add(fillLight);

    // Hemisphere light for natural sky/ground color bleed
    this._scene.add(new THREE.HemisphereLight(0x88aacc, 0x445522, 0.4));

    // ── Ground — multi-layer for depth ──
    const groundGeo = new THREE.PlaneGeometry(FIELD_WIDTH * 2, FIELD_LENGTH * 1.5, 32, 32);
    // Perturb ground vertices slightly for terrain feel
    const gPos = groundGeo.attributes.position;
    for (let i = 0; i < gPos.count; i++) {
      const x = gPos.getX(i);
      const y = gPos.getY(i);
      gPos.setZ(i, (Math.sin(x * 0.3) * Math.cos(y * 0.2) + Math.random() * 0.15) * 0.3);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a7a30, roughness: 0.95 });
    this._groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this._groundPlane.rotation.x = -Math.PI / 2;
    this._groundPlane.position.set(0, 0, FIELD_LENGTH * 0.5);
    this._groundPlane.receiveShadow = true;
    this._scene.add(this._groundPlane);

    // Dirt path (worn, multi-strip)
    const pathGeo = new THREE.PlaneGeometry(GATE_WIDTH + 2, FIELD_LENGTH);
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x665533, roughness: 1 });
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.02, FIELD_LENGTH * 0.5);
    path.receiveShadow = true;
    this._scene.add(path);

    // Wheel ruts on path
    const rutMat = new THREE.MeshStandardMaterial({ color: 0x554422, roughness: 1 });
    for (const rx of [-1.8, 1.8]) {
      const rut = new THREE.Mesh(new THREE.PlaneGeometry(0.4, FIELD_LENGTH * 0.8), rutMat);
      rut.rotation.x = -Math.PI / 2;
      rut.position.set(rx, 0.025, FIELD_LENGTH * 0.45);
      this._scene.add(rut);
    }

    // ── Scattered rocks on field ──
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.9 });
    for (let i = 0; i < 40; i++) {
      const rx = (Math.random() - 0.5) * FIELD_WIDTH * 0.9;
      const rz = 5 + Math.random() * (FIELD_LENGTH - 10);
      if (Math.abs(rx) < GATE_WIDTH && rz < 15) continue; // clear gate approach
      const s = 0.15 + Math.random() * 0.5;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(s, 0),
        rockMat,
      );
      rock.position.set(rx, s * 0.3, rz);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rock.castShadow = true;
      this._scene.add(rock);
    }

    // ── Grass tufts ──
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x55882a, side: THREE.DoubleSide });
    for (let i = 0; i < 80; i++) {
      const gx = (Math.random() - 0.5) * FIELD_WIDTH * 1.2;
      const gz = 3 + Math.random() * (FIELD_LENGTH + 10);
      if (Math.abs(gx) < GATE_WIDTH / 2 + 1 && gz < 12) continue;
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.15 + Math.random() * 0.1, 0.5 + Math.random() * 0.4, 4), grassMat);
      tuft.position.set(gx, 0.2, gz);
      this._scene.add(tuft);
      this._grassTufts.push(tuft);
    }

    // ── Castle wall ──
    this._wallMesh = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.75 });

    // Wall segments
    const wallSegWidth = FIELD_WIDTH / 2 - GATE_WIDTH / 2;
    const wallLeftGeo = new THREE.BoxGeometry(wallSegWidth, WALL_HEIGHT, 3);
    const wallLeft = new THREE.Mesh(wallLeftGeo, wallMat);
    wallLeft.position.set(-(GATE_WIDTH / 2 + wallSegWidth / 2), WALL_HEIGHT / 2, WALL_Z);
    wallLeft.castShadow = true;
    wallLeft.receiveShadow = true;
    this._wallMesh.add(wallLeft);

    const wallRight = new THREE.Mesh(wallLeftGeo, wallMat);
    wallRight.position.set(GATE_WIDTH / 2 + wallSegWidth / 2, WALL_HEIGHT / 2, WALL_Z);
    wallRight.castShadow = true;
    wallRight.receiveShadow = true;
    this._wallMesh.add(wallRight);

    // Stone block lines (horizontal grooves)
    const grooveMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.9 });
    for (let y = 1.5; y < WALL_HEIGHT; y += 1.5) {
      for (const side of [-1, 1]) {
        const groove = new THREE.Mesh(new THREE.BoxGeometry(wallSegWidth + 0.05, 0.04, 3.05), grooveMat);
        groove.position.set(side * (GATE_WIDTH / 2 + wallSegWidth / 2), y, WALL_Z);
        this._wallMesh.add(groove);
      }
    }

    // Crenellations (merlons)
    const merlonGeo = new THREE.BoxGeometry(1.2, 1.5, 1.5);
    for (let x = -FIELD_WIDTH / 2 + 1; x <= FIELD_WIDTH / 2 - 1; x += 2.5) {
      if (Math.abs(x) < GATE_WIDTH / 2 + 0.5) continue;
      const merlon = new THREE.Mesh(merlonGeo, wallMat);
      merlon.position.set(x, WALL_HEIGHT + 0.75, WALL_Z);
      merlon.castShadow = true;
      this._wallMesh.add(merlon);
    }

    // ── Towers with more detail ──
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.6 });
    for (const xSide of [-1, 1]) {
      const towerX = xSide * (FIELD_WIDTH / 2 + 1);
      const towerH = WALL_HEIGHT + 4;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, towerH, 12), towerMat);
      tower.position.set(towerX, towerH / 2, WALL_Z);
      tower.castShadow = true;
      this._wallMesh.add(tower);

      // Tower crenellations ring
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const tm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.8), wallMat);
        tm.position.set(towerX + Math.cos(a) * 2.7, towerH + 0.5, WALL_Z + Math.sin(a) * 2.7);
        this._wallMesh.add(tm);
      }

      // Roof
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(3.2, 3, 12),
        new THREE.MeshStandardMaterial({ color: 0x773333, roughness: 0.5 }),
      );
      roof.position.set(towerX, towerH + 2.5, WALL_Z);
      this._wallMesh.add(roof);

      // Tower window slits
      const slitMat = new THREE.MeshBasicMaterial({ color: 0x111100 });
      for (let sy = 3; sy < towerH - 1; sy += 3) {
        const slit = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.3), slitMat);
        slit.position.set(towerX + xSide * 2.6, sy, WALL_Z);
        this._wallMesh.add(slit);
      }
    }

    this._scene.add(this._wallMesh);

    // ── Gate with more detail ──
    const gateGeo = new THREE.BoxGeometry(GATE_WIDTH, WALL_HEIGHT, 2);
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.8 });
    this._gateMesh = new THREE.Mesh(gateGeo, gateMat);
    this._gateMesh.position.set(0, WALL_HEIGHT / 2, WALL_Z);
    this._gateMesh.castShadow = true;
    this._scene.add(this._gateMesh);

    // Gate iron bands
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.6 });
    for (let y = 1; y < WALL_HEIGHT; y += 2) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(GATE_WIDTH + 0.2, 0.3, 2.1), bandMat);
      band.position.set(0, y, WALL_Z);
      this._scene.add(band);
    }

    // Gate vertical planks (texture lines)
    const plankMat = new THREE.MeshStandardMaterial({ color: 0x553318, roughness: 0.9 });
    for (let px = -3; px <= 3; px += 1.5) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.06, WALL_HEIGHT - 0.2, 2.05), plankMat);
      plank.position.set(px, WALL_HEIGHT / 2, WALL_Z);
      this._scene.add(plank);
    }

    // Gate arch
    const archMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.6 });
    const archGeo = new THREE.TorusGeometry(GATE_WIDTH / 2, 0.5, 12, 12, Math.PI);
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(0, WALL_HEIGHT, WALL_Z + 0.5);
    arch.rotation.z = Math.PI;
    this._scene.add(arch);

    // Gate crack overlay (increases visibility as HP drops)
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, side: THREE.DoubleSide });
    this._gateCrackOverlay = new THREE.Mesh(new THREE.PlaneGeometry(GATE_WIDTH - 0.5, WALL_HEIGHT - 0.5), crackMat);
    this._gateCrackOverlay.position.set(0, WALL_HEIGHT / 2, WALL_Z - 1.05);
    this._scene.add(this._gateCrackOverlay);

    // Physical crack lines on gate (visible at different HP thresholds)
    const crackLineMat = new THREE.MeshBasicMaterial({ color: 0x111100, transparent: true, opacity: 0, side: THREE.DoubleSide });
    const crackDefs = [
      { w: 0.08, h: 3, x: 1.5, y: WALL_HEIGHT / 2 + 0.5, r: 0.15 },
      { w: 0.06, h: 2.5, x: -2, y: WALL_HEIGHT / 2 - 0.3, r: -0.2 },
      { w: 0.07, h: 4, x: 0.3, y: WALL_HEIGHT / 2, r: 0.08 },
      { w: 0.05, h: 2, x: -0.8, y: WALL_HEIGHT / 2 + 1.5, r: -0.3 },
      { w: 0.09, h: 3.5, x: 2.5, y: WALL_HEIGHT / 2 - 1, r: 0.25 },
    ];
    this._gateCrackMeshes = [];
    for (const cd of crackDefs) {
      const clMat = crackLineMat.clone();
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(cd.w, cd.h), clMat);
      crack.position.set(cd.x, cd.y, WALL_Z - 1.06);
      crack.rotation.z = cd.r;
      this._scene.add(crack);
      this._gateCrackMeshes.push(crack);
    }

    // ── Moat ──
    const moatGeo = new THREE.PlaneGeometry(FIELD_WIDTH * 2, 6);
    const moatMat = new THREE.MeshStandardMaterial({
      color: 0x224455, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.75,
    });
    this._moatMesh = new THREE.Mesh(moatGeo, moatMat);
    this._moatMesh.rotation.x = -Math.PI / 2;
    this._moatMesh.position.set(0, -0.1, WALL_Z + 4);
    this._scene.add(this._moatMesh);
    // Moat banks
    const bankMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 1 });
    for (const bz of [WALL_Z + 1.2, WALL_Z + 6.8]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(FIELD_WIDTH * 2, 0.4, 0.5), bankMat);
      bank.position.set(0, 0, bz);
      this._scene.add(bank);
    }

    // ── Wall torches ──
    const torchWoodMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 });
    for (let tx = -FIELD_WIDTH / 2 + 5; tx <= FIELD_WIDTH / 2 - 5; tx += 8) {
      if (Math.abs(tx) < GATE_WIDTH / 2 + 1) continue;
      // Torch bracket
      const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 12), torchWoodMat);
      bracket.position.set(tx, WALL_HEIGHT - 0.5, WALL_Z + 1.6);
      bracket.rotation.x = 0.3;
      this._scene.add(bracket);
      // Flame (emissive sphere)
      const flameMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2, transparent: true, opacity: 0.9 });
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), flameMat);
      flame.position.set(tx, WALL_HEIGHT + 0.1, WALL_Z + 1.85);
      this._scene.add(flame);
      // Point light
      const tLight = new THREE.PointLight(0xff6622, 1.5, 10);
      tLight.position.set(tx, WALL_HEIGHT + 0.3, WALL_Z + 1.85);
      this._scene.add(tLight);
      this._torches.push({ light: tLight, mesh: flame });
    }

    // ── Mountains (layered, with snow caps) ──
    for (let layer = 0; layer < 2; layer++) {
      const baseZ = FIELD_LENGTH + 20 + layer * 25;
      const mColor = layer === 0 ? 0x556655 : 0x445544;
      const mMat = new THREE.MeshStandardMaterial({ color: mColor, roughness: 1 });
      const snowMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8 });
      for (let i = 0; i < 6; i++) {
        const h = 18 + Math.random() * 30 + layer * 10;
        const w = 22 + Math.random() * 35;
        const m = new THREE.Mesh(new THREE.ConeGeometry(w, h, 5 + Math.floor(Math.random() * 3)), mMat);
        m.position.set(-80 + i * 30 + (Math.random() - 0.5) * 15, h / 2 - 3, baseZ + Math.random() * 20);
        this._scene.add(m);
        // Snow cap
        const snowH = h * 0.25;
        const snowW = w * 0.35;
        const snow = new THREE.Mesh(new THREE.ConeGeometry(snowW, snowH, 12), snowMat);
        snow.position.set(m.position.x, m.position.y + h / 2 - snowH / 2 + 0.5, m.position.z);
        this._scene.add(snow);
      }
    }

    // ── Trees (more variety, multiple canopy layers) ──
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x553322 });
    const leafMats = [
      new THREE.MeshStandardMaterial({ color: 0x336622 }),
      new THREE.MeshStandardMaterial({ color: 0x2a5a1a }),
      new THREE.MeshStandardMaterial({ color: 0x3d7a2e }),
    ];
    for (let i = 0; i < 40; i++) {
      const side = i < 20 ? -1 : 1;
      const tx = side * (FIELD_WIDTH / 2 + 3 + Math.random() * 12);
      const tz = 5 + Math.random() * (FIELD_LENGTH + 5);
      const treeGroup = new THREE.Group();
      const trunkH = 2.5 + Math.random() * 2;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, trunkH, 12), trunkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      treeGroup.add(trunk);
      // Multiple canopy layers
      const layers = 1 + Math.floor(Math.random() * 2);
      for (let l = 0; l < layers; l++) {
        const cr = 1.2 + Math.random() * 1.5 - l * 0.4;
        const ch = 2 + Math.random() * 2 - l * 0.5;
        const canopy = new THREE.Mesh(new THREE.ConeGeometry(cr, ch, 12), leafMats[Math.floor(Math.random() * leafMats.length)]);
        canopy.position.y = trunkH + l * 1.2 + Math.random() * 0.5;
        canopy.castShadow = true;
        treeGroup.add(canopy);
      }
      treeGroup.position.set(tx, 0, tz);
      this._scene.add(treeGroup);
    }

    // ── Banners on wall (now tracked for animation) ──
    this._banners = [];
    const bannerMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, side: THREE.DoubleSide });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    for (const xPos of [-14, -8, 8, 14]) {
      // Pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5, 12), poleMat);
      pole.position.set(xPos, WALL_HEIGHT + 2.5, WALL_Z - 0.8);
      this._scene.add(pole);
      // Banner (wider, with Pendragon cross pattern via second mesh)
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3.5), bannerMat);
      banner.position.set(xPos, WALL_HEIGHT + 1.8, WALL_Z - 0.8);
      this._scene.add(banner);
      this._banners.push(banner);
      // Gold cross on banner
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xddaa22, side: THREE.DoubleSide });
      const crossH = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.15), goldMat);
      crossH.position.set(xPos, WALL_HEIGHT + 2.2, WALL_Z - 0.82);
      this._scene.add(crossH);
      const crossV = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 1.2), goldMat);
      crossV.position.set(xPos, WALL_HEIGHT + 2.2, WALL_Z - 0.82);
      this._scene.add(crossV);
    }

    // ── Sun disc ──
    const sunGeo = new THREE.SphereGeometry(4, 16, 12);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffeeaa, transparent: true, opacity: 0.8 });
    const sunDisc = new THREE.Mesh(sunGeo, sunMat);
    sunDisc.position.set(50, 70, FIELD_LENGTH + 30);
    this._scene.add(sunDisc);
    // Sun glow halo
    const haloGeo = new THREE.SphereGeometry(8, 20, 16);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffddaa, transparent: true, opacity: 0.15 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(sunDisc.position);
    this._scene.add(halo);

    // ── Wildflowers ──
    const flowerColors = [0xee4444, 0xeeee44, 0xffffff, 0xcc66cc, 0x4488ff];
    for (let i = 0; i < 50; i++) {
      const fx = (Math.random() - 0.5) * FIELD_WIDTH * 1.1;
      const fz = 8 + Math.random() * (FIELD_LENGTH - 5);
      if (Math.abs(fx) < GATE_WIDTH / 2 + 2 && fz < 15) continue;
      const flowerGroup = new THREE.Group();
      // Stem
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.3 + Math.random() * 0.2, 3),
        new THREE.MeshStandardMaterial({ color: 0x337722 }),
      );
      stem.position.y = 0.15;
      flowerGroup.add(stem);
      // Petals (small sphere)
      const petal = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 20, 16),
        new THREE.MeshStandardMaterial({ color: flowerColors[Math.floor(Math.random() * flowerColors.length)] }),
      );
      petal.position.y = 0.3 + Math.random() * 0.15;
      flowerGroup.add(petal);
      flowerGroup.position.set(fx, 0, fz);
      this._scene.add(flowerGroup);
    }

    // ── Puddles (reflective ground patches) ──
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x445566, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.4,
    });
    for (let i = 0; i < 8; i++) {
      const px = (Math.random() - 0.5) * FIELD_WIDTH * 0.7;
      const pz = 15 + Math.random() * (FIELD_LENGTH - 20);
      const pr = 0.8 + Math.random() * 1.5;
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(pr, 10), puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(px, 0.04, pz);
      this._scene.add(puddle);
    }

    // ── Wall defender silhouettes ──
    const defenderMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
    for (let dx = -FIELD_WIDTH / 2 + 3; dx <= FIELD_WIDTH / 2 - 3; dx += 5) {
      if (Math.abs(dx) < GATE_WIDTH / 2 + 1) continue;
      if (Math.random() > 0.6) continue; // only some positions occupied
      const defGroup = new THREE.Group();
      // Tiny body
      const dBody = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.2), defenderMat);
      dBody.position.y = 0.25;
      defGroup.add(dBody);
      // Tiny head
      const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 16), defenderMat);
      dHead.position.y = 0.6;
      defGroup.add(dHead);
      // Spear
      const dSpear = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 12), defenderMat);
      dSpear.position.set(0.15, 0.6, 0);
      defGroup.add(dSpear);
      defGroup.position.set(dx, WALL_HEIGHT + 1.5, WALL_Z - 0.5);
      this._scene.add(defGroup);
    }

    // ── Dust particle system ──
    const dustCount = 200;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    this._dustVelocities = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * FIELD_WIDTH;
      dustPos[i * 3 + 1] = 0.5 + Math.random() * 8;
      dustPos[i * 3 + 2] = Math.random() * FIELD_LENGTH;
      this._dustVelocities[i * 3] = (Math.random() - 0.5) * 0.5;
      this._dustVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
      this._dustVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xccbb99, size: 0.12, transparent: true, opacity: 0.35, depthWrite: false,
    });
    this._dustParticles = new THREE.Points(dustGeo, dustMat);
    this._scene.add(this._dustParticles);

    // ── Crosshair with animated rings ──
    this._crosshair = new THREE.Group();
    // Outer ring
    const ringOuter = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 2.1, 32),
      new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }),
    );
    ringOuter.rotation.x = -Math.PI / 2;
    this._crosshair.add(ringOuter);
    // Inner ring
    const ringInner = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.0, 24),
      new THREE.MeshBasicMaterial({ color: 0xff6644, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }),
    );
    ringInner.rotation.x = -Math.PI / 2;
    this._crosshair.add(ringInner);
    // Center dot
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 10),
      new THREE.MeshBasicMaterial({ color: 0xff2200, side: THREE.DoubleSide }),
    );
    dot.rotation.x = -Math.PI / 2;
    this._crosshair.add(dot);
    // Cross lines
    const crossLineMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    for (let ci = 0; ci < 4; ci++) {
      const cLine = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.8), crossLineMat);
      cLine.rotation.x = -Math.PI / 2;
      cLine.rotation.z = ci * Math.PI / 2;
      cLine.position.y = 0.01;
      const offset = 1.4;
      cLine.position.x = Math.cos(ci * Math.PI / 2) * offset;
      cLine.position.z = Math.sin(ci * Math.PI / 2) * offset;
      this._crosshair.add(cLine);
    }
    this._crosshair.position.set(0, 0.1, 40);
    this._crosshair.visible = false;
    this._scene.add(this._crosshair);
  }

  // ── Build Trebuchet ──────────────────────────────────────────────────────

  private _buildTrebuchet(): void {
    this._trebuchetGroup = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x6a5010, roughness: 0.85 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.5 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xaa9966, roughness: 1 });

    // Base frame with cross braces
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.4, 4.5), woodMat);
    base.position.y = 0.2;
    base.castShadow = true;
    this._trebuchetGroup.add(base);

    // Cross braces on base
    for (const bz of [-1.2, 1.2]) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.15, 0.15), darkWoodMat);
      brace.position.set(0, 0.45, bz);
      this._trebuchetGroup.add(brace);
    }

    // A-frame uprights (angled inward at top)
    for (const xSide of [-1, 1]) {
      // Main upright
      const upright = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.2, 0.3), woodMat);
      upright.position.set(xSide * 1.0, 2.5, 0);
      upright.rotation.z = xSide * -0.08; // slight inward lean
      upright.castShadow = true;
      this._trebuchetGroup.add(upright);

      // Diagonal brace
      const diagBrace = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.0, 0.12), darkWoodMat);
      diagBrace.position.set(xSide * 0.8, 2, 0.8);
      diagBrace.rotation.z = xSide * -0.3;
      diagBrace.rotation.x = -0.2;
      this._trebuchetGroup.add(diagBrace);
    }

    // Cross beam (axle)
    const crossBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.4, 12), metalMat);
    crossBeam.rotation.z = Math.PI / 2;
    crossBeam.position.set(0, 4.5, 0);
    this._trebuchetGroup.add(crossBeam);

    // Metal axle plates
    for (const xSide of [-1, 1]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.6), metalMat);
      plate.position.set(xSide * 0.9, 4.5, 0);
      this._trebuchetGroup.add(plate);
    }

    // Throwing arm (tapers from thick to thin)
    const armGeo = new THREE.BoxGeometry(0.22, 0.28, 8.5);
    this._trebuchetArm = new THREE.Mesh(armGeo, woodMat);
    this._trebuchetArm.position.set(0, 4.5, 2);
    this._trebuchetArm.castShadow = true;
    this._trebuchetGroup.add(this._trebuchetArm);

    // Counterweight (iron box on chains)
    const cwFrame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 0.8), metalMat);
    cwFrame.position.set(0, 3.8, -1.8);
    this._trebuchetGroup.add(cwFrame);
    const cwWeight = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.7), metalMat);
    cwWeight.position.set(0, 3.2, -1.8);
    cwWeight.castShadow = true;
    this._trebuchetGroup.add(cwWeight);
    // Chains connecting to arm
    for (const cx of [-0.35, 0.35]) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 12), metalMat);
      chain.position.set(cx, 4.0, -1.8);
      this._trebuchetGroup.add(chain);
    }

    // Sling ropes
    for (const rx of [-0.12, 0.12]) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.5, 12), ropeMat);
      rope.position.set(rx, 4.0, 5.5);
      rope.rotation.x = 0.4;
      this._trebuchetGroup.add(rope);
    }

    // Sling pouch (net/bucket)
    this._trebuchetSling = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7),
      new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 1, side: THREE.DoubleSide }),
    );
    this._trebuchetSling.position.set(0, 3.2, 6.8);
    this._trebuchetGroup.add(this._trebuchetSling);

    // Loaded ammo visible in sling
    this._updateLoadedAmmo();

    // Wheels with spokes
    const wheelRimMat = new THREE.MeshStandardMaterial({ color: 0x6a5510, roughness: 0.7 });
    for (const xSide of [-1, 1]) {
      for (const zSide of [-1, 1]) {
        const wheelGroup = new THREE.Group();
        // Rim
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 12, 12), wheelRimMat);
        wheelGroup.add(rim);
        // Hub
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.15, 12), metalMat);
        hub.rotation.x = Math.PI / 2;
        wheelGroup.add(hub);
        // Spokes
        for (let s = 0; s < 6; s++) {
          const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 12), woodMat);
          spoke.rotation.z = (s * Math.PI) / 3;
          spoke.position.set(Math.cos((s * Math.PI) / 3) * 0.22, Math.sin((s * Math.PI) / 3) * 0.22, 0);
          wheelGroup.add(spoke);
        }
        wheelGroup.rotation.y = Math.PI / 2;
        wheelGroup.position.set(xSide * 1.6, 0.55, zSide * 1.8);
        this._trebuchetGroup.add(wheelGroup);
      }
    }

    this._trebuchetGroup.position.set(0, WALL_HEIGHT, WALL_Z - 2);
    this._scene.add(this._trebuchetGroup);

    // Aim trajectory — glowing dotted arc
    const aimGeo = new THREE.BufferGeometry();
    const aimPoints = new Float32Array(60 * 3);
    aimGeo.setAttribute("position", new THREE.BufferAttribute(aimPoints, 3));
    const aimMat = new THREE.LineDashedMaterial({
      color: 0xffff44,
      transparent: true,
      opacity: 0.6,
      dashSize: 0.8,
      gapSize: 0.4,
      linewidth: 1,
    });
    this._aimLine = new THREE.Line(aimGeo, aimMat);
    this._aimLine.visible = false;
    this._scene.add(this._aimLine);

    // Glow line (wider, more transparent, behind the dashed line)
    const glowGeo = new THREE.BufferGeometry();
    const glowPoints = new Float32Array(60 * 3);
    glowGeo.setAttribute("position", new THREE.BufferAttribute(glowPoints, 3));
    const glowMat = new THREE.PointsMaterial({
      color: 0xffff44,
      size: 0.35,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    const aimGlow = new THREE.Points(glowGeo, glowMat);
    aimGlow.visible = false;
    aimGlow.name = "aimGlow";
    this._scene.add(aimGlow);
  }

  // ── HUD ──────────────────────────────────────────────────────────────────

  private _buildHUD(): void {
    this._hudContainer = document.createElement("div");
    this._hudContainer.id = "trebuchet-hud";
    this._hudContainer.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 10000; font-family: 'Segoe UI', Arial, sans-serif;
    `;
    document.body.appendChild(this._hudContainer);
  }

  private _renderHUD(): void {
    // Static phases: only re-render when phase changes or explicitly marked dirty
    const isStaticPhase = this._phase === "title" || this._phase === "shop" || this._phase === "between_waves" || this._phase === "defeat" || this._phase === "victory" || this._phase === "paused";
    if (isStaticPhase && this._lastRenderedPhase === this._phase && !this._hudDirty) return;
    this._lastRenderedPhase = this._phase;
    this._hudDirty = false;

    if (this._phase === "title") {
      this._hudContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(0,0,0,0.5);">
          <div style="font-size:64px;font-weight:900;color:#f4c430;text-shadow:3px 3px 8px #000;letter-spacing:6px;">TREBUCHET</div>
          <div style="font-size:18px;color:#ddd;margin-top:8px;text-shadow:1px 1px 4px #000;">Defend the Gates of Camelot</div>
          <div style="margin-top:40px;font-size:20px;color:#ffdd66;animation:pulse 1.5s infinite alternate;">Click to Begin</div>
          ${this._highscore > 0 ? `<div style="margin-top:20px;font-size:14px;color:#888;">Highscore: ${this._highscore} (Wave ${this._bestWave})</div>` : ""}
          <div style="margin-top:40px;font-size:13px;color:#aaa;max-width:500px;text-align:center;line-height:1.6;">
            <b>MOUSE</b> — Aim &nbsp;|&nbsp; <b>HOLD LMB</b> — Charge &amp; Fire<br/>
            <b>1-4</b> — Ammo &nbsp;|&nbsp; <b>Q</b> — Oil &nbsp;|&nbsp; <b>E</b> — Volley &nbsp;|&nbsp; <b>R</b> — Repair &nbsp;|&nbsp; <b>P</b> — Pause
          </div>
        </div>
        <style>@keyframes pulse{from{opacity:0.5}to{opacity:1}}</style>
      `;
      return;
    }

    if (this._phase === "defeat") {
      const isNewHigh = this._score >= this._highscore && this._score > 0;
      const accuracy = this._totalShots > 0 ? Math.round(this._totalHits / this._totalShots * 100) : 0;
      this._hudContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(30,0,0,0.7);">
          <div style="font-size:52px;font-weight:900;color:#ff3333;text-shadow:3px 3px 8px #000;">CAMELOT HAS FALLEN</div>
          <div style="font-size:22px;color:#ddd;margin-top:12px;">Wave ${this._wave} &nbsp;|&nbsp; Score: ${this._score}</div>
          ${isNewHigh ? `<div style="font-size:16px;color:#ffd700;margin-top:6px;">NEW HIGHSCORE!</div>` : `<div style="font-size:14px;color:#888;margin-top:6px;">Best: ${this._highscore} (Wave ${this._bestWave})</div>`}
          <div style="margin-top:20px;font-size:13px;color:#aaa;line-height:1.8;text-align:center;">
            Kills: ${this._totalKills} &nbsp;|&nbsp; Shots: ${this._totalShots} &nbsp;|&nbsp; Accuracy: ${accuracy}%<br/>
            Damage Dealt: ${Math.floor(this._totalDamageDealt)} &nbsp;|&nbsp; Best Combo: ${this._maxCombo}x
          </div>
          <div style="margin-top:30px;font-size:18px;color:#ffaa44;animation:pulse 1.5s infinite alternate;">Click to return to menu</div>
        </div>
        <style>@keyframes pulse{from{opacity:0.5}to{opacity:1}}</style>
      `;
      return;
    }

    if (this._phase === "paused") {
      this._hudContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(0,0,0,0.6);">
          <div style="font-size:48px;font-weight:900;color:#fff;text-shadow:3px 3px 8px #000;">PAUSED</div>
          <div style="margin-top:20px;font-size:14px;color:#aaa;">Wave ${this._wave} &nbsp;|&nbsp; Score: ${this._score}</div>
          <div style="margin-top:30px;font-size:16px;color:#ffdd66;">Press P to resume &nbsp;|&nbsp; ESC to quit</div>
        </div>
      `;
      return;
    }

    if (this._phase === "victory") {
      const accuracy = this._totalShots > 0 ? Math.round(this._totalHits / this._totalShots * 100) : 0;
      this._hudContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(0,20,0,0.7);">
          <div style="font-size:52px;font-weight:900;color:#ffd700;text-shadow:3px 3px 8px #000;">CAMELOT STANDS!</div>
          <div style="font-size:20px;color:#44ff44;margin-top:12px;">All ${this._wave} waves defeated!</div>
          <div style="font-size:24px;color:#ffd700;margin-top:8px;">Final Score: ${this._score}</div>
          <div style="margin-top:16px;font-size:13px;color:#aaa;line-height:1.8;text-align:center;">
            Kills: ${this._totalKills} &nbsp;|&nbsp; Shots: ${this._totalShots} &nbsp;|&nbsp; Accuracy: ${accuracy}%<br/>
            Damage: ${Math.floor(this._totalDamageDealt)} &nbsp;|&nbsp; Best Combo: ${this._maxCombo}x &nbsp;|&nbsp; Gate HP: ${Math.ceil(this._gateHp)}/${this._gateMaxHp}
          </div>
          <div style="margin-top:30px;font-size:18px;color:#ffaa44;animation:pulse 1.5s infinite alternate;">Click to return to menu</div>
        </div>
        <style>@keyframes pulse{from{opacity:0.5}to{opacity:1}}</style>
      `;
      return;
    }

    if (this._phase === "shop") {
      this._renderShopHUD();
      return;
    }

    if (this._phase === "between_waves") {
      // Gate partial repair between waves
      const repairAmount = Math.floor(this._gateMaxHp * 0.1);
      // Generate next wave preview
      const nextWave = this._wave + 1;
      const isBossWave = nextWave % 5 === 0;
      const nextMod = pickWaveModifier(nextWave);
      let previewHtml = "";
      if (isBossWave) {
        const bossIdx = Math.min(Math.floor(nextWave / 5) - 1, BOSSES.length - 1);
        previewHtml = `<div style="color:#ff4444;font-size:14px;margin-top:8px;">BOSS: ${BOSSES[bossIdx].name}</div>`;
      } else {
        const spawns = generateWave(nextWave);
        const names = spawns.map((s) => `${ENEMY_DEFS[s.type].name} x${s.count}`).join(", ");
        previewHtml = `<div style="color:#aaa;font-size:13px;margin-top:8px;">Next: ${names}</div>`;
        if (nextMod.id !== "normal") {
          previewHtml += `<div style="color:${nextMod.color};font-size:13px;margin-top:4px;">Modifier: ${nextMod.name} — ${nextMod.desc}</div>`;
        }
      }
      this._hudContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(0,0,0,0.4);">
          <div style="font-size:42px;font-weight:900;color:#44ff44;text-shadow:2px 2px 6px #000;">WAVE ${this._wave} COMPLETE!</div>
          <div style="font-size:20px;color:#ffd700;margin-top:12px;">+${this._waveGoldReward()} Gold</div>
          <div style="font-size:14px;color:#88ff88;margin-top:6px;">Gate repaired +${repairAmount} HP</div>
          ${this._comboCount > 0 ? `<div style="font-size:14px;color:#ffaa44;margin-top:4px;">Best Combo: ${this._maxCombo}x</div>` : ""}
          ${previewHtml}
          <div style="margin-top:24px;font-size:18px;color:#ffdd66;animation:pulse 1.5s infinite alternate;">Click to open shop</div>
        </div>
        <style>@keyframes pulse{from{opacity:0.5}to{opacity:1}}</style>
      `;
      return;
    }

    // Playing / Boss phase HUD
    const gatePercent = Math.max(0, this._gateHp / this._gateMaxHp * 100);
    const gateColor = gatePercent > 50 ? "#44cc44" : gatePercent > 25 ? "#ccaa22" : "#cc3333";
    const reloadPercent = this._reloadTimer > 0 ? Math.max(0, (1 - this._reloadTimer / this._reloadTime) * 100) : 100;
    const powerPercent = this._charging ? ((this._power - MIN_POWER) / (this._getMaxPower() - MIN_POWER) * 100) : 0;
    const ammoDef = AMMO_DEFS[this._currentAmmo];

    let ammoBar = "";
    for (const at of this._unlockedAmmo) {
      const ad = AMMO_DEFS[at];
      const sel = at === this._currentAmmo;
      const idx = this._unlockedAmmo.indexOf(at) + 1;
      ammoBar += `<div style="padding:4px 10px;margin:0 3px;background:${sel ? "rgba(255,200,50,0.3)" : "rgba(0,0,0,0.3)"};border:${sel ? "2px solid #ffd700" : "1px solid #666"};border-radius:4px;font-size:12px;color:#fff;">
        <span style="color:#aaa;">[${idx}]</span> ${ad.name}
      </div>`;
    }

    let bossBar = "";
    if (this._phase === "boss") {
      const boss = this._enemies.find((e) => e.isBoss && !e.dead);
      if (boss && boss.bossDef) {
        const bossPercent = (boss.hp / boss.maxHp) * 100;
        bossBar = `
          <div style="position:absolute;top:60px;left:50%;transform:translateX(-50%);text-align:center;">
            <div style="font-size:16px;color:#ff4444;font-weight:bold;text-shadow:1px 1px 3px #000;">${boss.bossDef.name}</div>
            <div style="width:300px;height:12px;background:#333;border-radius:6px;margin-top:4px;overflow:hidden;">
              <div style="width:${bossPercent}%;height:100%;background:linear-gradient(90deg,#cc0000,#ff4444);border-radius:6px;transition:width 0.2s;"></div>
            </div>
          </div>`;
      }
    }

    // Combo display with tier-based colors
    let comboHtml = "";
    if (this._comboCount >= 3) {
      const tier = Math.floor(this._comboCount / 3);
      const comboColor = tier >= 4 ? "#ff22ff" : tier >= 3 ? "#ff4444" : tier >= 2 ? "#ff8844" : "#ffaa22";
      const comboGlow = tier >= 3 ? `0 0 20px ${comboColor}` : "2px 2px 6px #000";
      const comboScale = Math.min(28 + this._comboCount * 2, 52);
      comboHtml = `
        <div style="position:absolute;top:45%;left:50%;transform:translate(-50%,-50%);pointer-events:none;text-align:center;">
          <div style="font-size:${comboScale}px;font-weight:900;color:${comboColor};text-shadow:${comboGlow};opacity:${Math.min(1, this._comboTimer / 0.5)};">
            ${this._comboCount}x COMBO!
          </div>
          <div style="font-size:14px;color:#ffd700;margin-top:2px;">${this._comboMultiplier.toFixed(1)}x score &nbsp; +${Math.floor(this._comboMultiplier * 30)}% dmg</div>
        </div>`;
    }

    // Ability cooldowns
    const mkAbilityBar = (key: string, name: string, cd: number, maxCd: number, color: string) => {
      const ready = cd <= 0;
      const pct = ready ? 100 : Math.max(0, (1 - cd / maxCd) * 100);
      return `<div style="margin-bottom:6px;">
        <div style="font-size:11px;color:${ready ? color : "#555"};">[${key}] ${name}</div>
        <div style="width:70px;height:5px;background:#222;border-radius:2px;overflow:hidden;margin-top:2px;">
          <div style="width:${pct}%;height:100%;background:${ready ? color : "#333"};border-radius:2px;"></div>
        </div>
      </div>`;
    };
    const abilitiesHtml = `
      <div style="position:absolute;bottom:15px;left:15px;color:#fff;text-shadow:1px 1px 3px #000;">
        ${mkAbilityBar("Q", "Oil", this._oilCooldown, this._oilMaxCooldown, "#ff8844")}
        ${mkAbilityBar("E", "Volley", this._volleyCooldown, this._volleyMaxCooldown, "#88aaff")}
        ${mkAbilityBar("R", "Repair", this._repairCooldown, this._repairMaxCooldown, "#44ff44")}
      </div>`;

    // Wave modifier badge
    const modHtml = this._currentModifier.id !== "normal" ? `
      <div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);padding:3px 12px;background:rgba(0,0,0,0.5);border:1px solid ${this._currentModifier.color};border-radius:4px;">
        <span style="font-size:12px;font-weight:bold;color:${this._currentModifier.color};">${this._currentModifier.name}</span>
        <span style="font-size:10px;color:#aaa;margin-left:6px;">${this._currentModifier.desc}</span>
      </div>` : "";

    // Last Stand indicator
    const lastStandHtml = this._lastStandActive ? `
      <div style="position:absolute;top:75px;right:15px;padding:4px 10px;background:rgba(180,0,0,0.6);border:1px solid #ff4444;border-radius:4px;animation:pulse 0.8s infinite alternate;">
        <span style="font-size:13px;font-weight:bold;color:#ff4444;">LAST STAND</span>
        <span style="font-size:10px;color:#ffaa44;margin-left:4px;">+40% DMG, fast reload</span>
      </div>
      <style>@keyframes pulse{from{opacity:0.6}to{opacity:1}}</style>` : "";

    // Synergies display
    const synergies = this._getUpgradeSynergies();
    const synHtml = synergies.length > 0 ? `
      <div style="position:absolute;bottom:15px;right:15px;color:#aaa;text-shadow:1px 1px 2px #000;font-size:10px;">
        ${synergies.map((s) => `<div style="color:#bbaa44;">${s.toUpperCase()}</div>`).join("")}
      </div>` : "";

    this._hudContainer.innerHTML = `
      <div style="position:absolute;top:10px;left:15px;color:#fff;text-shadow:1px 1px 3px #000;">
        <div style="font-size:22px;font-weight:bold;">Wave ${this._wave}</div>
        <div style="font-size:14px;color:#aaa;margin-top:2px;">Score: ${this._score} &nbsp;|&nbsp; Gold: ${this._gold}</div>
        <div style="font-size:13px;color:#aaa;margin-top:2px;">Enemies: ${this._waveEnemiesKilled}/${this._waveEnemiesTotal}</div>
      </div>
      <div style="position:absolute;top:10px;right:15px;color:#fff;text-shadow:1px 1px 3px #000;text-align:right;">
        <div style="font-size:14px;">Gate HP</div>
        <div style="width:180px;height:14px;background:#333;border-radius:7px;overflow:hidden;margin-top:3px;">
          <div style="width:${gatePercent}%;height:100%;background:${gateColor};border-radius:7px;transition:width 0.3s;"></div>
        </div>
        <div style="font-size:12px;color:${gateColor};margin-top:2px;">${Math.ceil(this._gateHp)} / ${this._gateMaxHp}</div>
      </div>
      ${abilitiesHtml}
      ${modHtml}
      ${lastStandHtml}
      ${synHtml}
      <div style="position:absolute;bottom:15px;left:50%;transform:translateX(-50%);display:flex;align-items:center;">${ammoBar}</div>
      <div style="position:absolute;bottom:60px;left:50%;transform:translateX(-50%);text-align:center;">
        <div style="font-size:13px;color:#ddd;margin-bottom:4px;">${ammoDef.name} ${ammoDef.special !== "none" ? "(" + ammoDef.special + ")" : ""}</div>
        ${this._reloadTimer > 0
          ? `<div style="width:160px;height:8px;background:#333;border-radius:4px;overflow:hidden;">
               <div style="width:${reloadPercent}%;height:100%;background:#6688ff;border-radius:4px;transition:width 0.1s;"></div>
             </div>
             <div style="font-size:11px;color:#6688ff;margin-top:2px;">Reloading...</div>`
          : this._charging
            ? `<div style="width:160px;height:8px;background:#333;border-radius:4px;overflow:hidden;">
                 <div style="width:${powerPercent}%;height:100%;background:#ff8844;border-radius:4px;"></div>
               </div>
               <div style="font-size:11px;color:#ff8844;margin-top:2px;">Power: ${Math.floor(powerPercent)}%</div>`
            : `<div style="font-size:12px;color:#88ff88;">READY</div>`
        }
      </div>
      ${comboHtml}
      ${bossBar}
    `;
  }

  private _renderShopHUD(): void {
    // Compute exact current values for each upgrade
    const currentReload = Math.max(0.5, 2.0 - this._upgradeLevels["reload"] * 0.3);
    const currentMaxPower = MAX_POWER + this._upgradeLevels["power"] * 10;
    const currentSplash = this._upgradeLevels["splash"] * 1.5;
    const currentMulti = this._upgradeLevels["multishot"] * 20;

    const upgradeDetails: Record<string, string> = {
      power: `Max power: ${currentMaxPower}${this._upgradeLevels["power"] < 5 ? ` → ${currentMaxPower + 10}` : ""}`,
      splash: `Bonus radius: +${currentSplash.toFixed(1)}${this._upgradeLevels["splash"] < 4 ? ` → +${(currentSplash + 1.5).toFixed(1)}` : ""}`,
      reload: `Reload: ${currentReload.toFixed(1)}s${this._upgradeLevels["reload"] < 5 ? ` → ${Math.max(0.5, currentReload - 0.3).toFixed(1)}s` : ""}`,
      gate: `Gate HP: ${this._gateMaxHp}${this._upgradeLevels["gate"] < 5 ? ` → ${this._gateMaxHp + 40}` : ""}`,
      multishot: `Multi chance: ${currentMulti}%${this._upgradeLevels["multishot"] < 3 ? ` → ${currentMulti + 20}%` : ""}`,
    };

    // Recommend the most impactful upgrade
    const gateRatio = this._gateHp / this._gateMaxHp;
    let recommendId = "";
    if (gateRatio < 0.5 && this._upgradeLevels["gate"] < 5) recommendId = "gate";
    else if (this._upgradeLevels["reload"] < 3) recommendId = "reload";
    else if (this._upgradeLevels["splash"] < 3) recommendId = "splash";
    else if (this._upgradeLevels["power"] < 3) recommendId = "power";

    // Synergy progress
    const synergies = this._getUpgradeSynergies();
    let synergyHtml = "";
    const synDefs = [
      { name: "Devastation", needs: "Power 3 + Splash 3", active: synergies.includes("devastation"), progress: `${Math.min(this._upgradeLevels["power"], 3)}/3 + ${Math.min(this._upgradeLevels["splash"], 3)}/3` },
      { name: "Barrage", needs: "Reload 3 + Twin Arm 2", active: synergies.includes("barrage"), progress: `${Math.min(this._upgradeLevels["reload"], 3)}/3 + ${Math.min(this._upgradeLevels["multishot"], 2)}/2` },
      { name: "Fortress", needs: "Gate 3 + Reload 2", active: synergies.includes("fortress"), progress: `${Math.min(this._upgradeLevels["gate"], 3)}/3 + ${Math.min(this._upgradeLevels["reload"], 2)}/2` },
    ];
    synergyHtml = `<div style="margin-top:12px;padding:8px;background:rgba(30,30,40,0.6);border-radius:4px;">
      <div style="font-size:12px;color:#888;margin-bottom:4px;">SYNERGIES</div>
      ${synDefs.map((s) => `<div style="font-size:11px;color:${s.active ? "#bbaa44" : "#555"};margin:2px 0;">
        ${s.active ? "★" : "○"} ${s.name} <span style="color:#444;">(${s.active ? "ACTIVE" : s.progress})</span>
      </div>`).join("")}
    </div>`;

    let items = "";
    for (const u of UPGRADE_DEFS) {
      const lvl = this._upgradeLevels[u.id];
      const maxed = lvl >= u.maxLevel;
      const cost = Math.floor(u.baseCost * (1 + lvl * 0.5));
      const canBuy = !maxed && this._gold >= cost;
      const isRecommend = u.id === recommendId && canBuy;
      items += `
        <div class="treb-shop-item" data-id="${u.id}"
             style="padding:10px 14px;margin:4px 0;background:${canBuy ? "rgba(50,80,50,0.8)" : "rgba(40,40,40,0.8)"};border:1px solid ${isRecommend ? "#ffaa44" : canBuy ? "#66aa44" : "#555"};border-radius:6px;cursor:${canBuy ? "pointer" : "default"};pointer-events:auto;transition:background 0.15s;${isRecommend ? "box-shadow:0 0 8px rgba(255,170,68,0.3);" : ""}">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:14px;font-weight:bold;color:${maxed ? "#888" : "#fff"};">${u.name} ${maxed ? "(MAX)" : `Lv.${lvl + 1}`}</span>
            ${isRecommend ? `<span style="font-size:10px;color:#ffaa44;border:1px solid #ffaa44;padding:1px 5px;border-radius:3px;">REC</span>` : ""}
            ${!maxed ? `<span style="font-size:12px;color:${canBuy ? "#ffd700" : "#884400"};">${cost}g</span>` : ""}
          </div>
          <div style="font-size:11px;color:#aaa;margin-top:2px;">${u.desc}</div>
          <div style="font-size:10px;color:#668866;margin-top:1px;">${upgradeDetails[u.id] || ""}</div>
        </div>`;
    }

    // Ammo unlocks
    let ammoUnlocks = "";
    for (const at of AMMO_TYPES) {
      if (this._unlockedAmmo.includes(at)) continue;
      const ad = AMMO_DEFS[at];
      if (this._wave + 1 < ad.unlockWave) continue;
      const cost = 60 + ad.unlockWave * 15;
      const canBuy = this._gold >= cost;
      ammoUnlocks += `
        <div class="treb-shop-ammo" data-ammo="${at}"
             style="padding:10px 14px;margin:6px 0;background:${canBuy ? "rgba(60,50,80,0.8)" : "rgba(40,40,40,0.8)"};border:1px solid ${canBuy ? "#8866cc" : "#555"};border-radius:6px;cursor:${canBuy ? "pointer" : "default"};pointer-events:auto;">
          <div style="font-size:14px;font-weight:bold;color:#ddd;">Unlock: ${ad.name}</div>
          <div style="font-size:12px;color:#aaa;margin-top:2px;">Dmg: ${ad.damage} | Splash: ${ad.splash} | ${ad.special}</div>
          <div style="font-size:13px;color:${canBuy ? "#ffd700" : "#884400"};margin-top:3px;">Cost: ${cost} gold</div>
        </div>`;
    }

    this._hudContainer.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(0,0,0,0.6);">
        <div style="font-size:36px;font-weight:900;color:#ffd700;text-shadow:2px 2px 6px #000;margin-bottom:8px;">ARMORY</div>
        <div style="font-size:16px;color:#ffd700;margin-bottom:20px;">Gold: ${this._gold}</div>
        <div style="max-width:420px;width:90%;max-height:60vh;overflow-y:auto;pointer-events:auto;">
          ${items}
          ${ammoUnlocks}
          ${synergyHtml}
        </div>
        <div class="treb-shop-continue" style="margin-top:24px;padding:12px 40px;background:rgba(80,50,20,0.9);border:2px solid #cc8833;border-radius:8px;font-size:18px;color:#ffd700;cursor:pointer;pointer-events:auto;font-weight:bold;transition:background 0.15s;">
          NEXT WAVE ►
        </div>
      </div>
    `;

    // Wire shop clicks via event delegation (no listener leak)
    const shopHandler = (e: Event) => {
      const target = (e.target as HTMLElement).closest("[data-id],[data-ammo],.treb-shop-continue") as HTMLElement | null;
      if (!target) return;
      if (target.dataset.id) {
        this._buyUpgrade(target.dataset.id);
        this._hudContainer.removeEventListener("click", shopHandler);
      } else if (target.dataset.ammo) {
        this._buyAmmo(target.dataset.ammo as AmmoType);
        this._hudContainer.removeEventListener("click", shopHandler);
      } else if (target.classList.contains("treb-shop-continue")) {
        this._hudContainer.removeEventListener("click", shopHandler);
        this._startNextWave();
      }
    };
    this._hudContainer.addEventListener("click", shopHandler);
  }

  // ── Shop Logic ───────────────────────────────────────────────────────────

  private _buyUpgrade(id: string): void {
    const def = UPGRADE_DEFS.find((u) => u.id === id);
    if (!def) return;
    const lvl = this._upgradeLevels[id];
    if (lvl >= def.maxLevel) return;
    const cost = Math.floor(def.baseCost * (1 + lvl * 0.5));
    if (this._gold < cost) return;

    this._gold -= cost;
    this._upgradeLevels[id] = lvl + 1;

    // Apply upgrade effects
    if (id === "gate") {
      this._gateMaxHp += 40;
      this._gateHp = Math.min(this._gateHp + 40, this._gateMaxHp);
    }
    if (id === "reload") {
      this._reloadTime = Math.max(0.5, 2.0 - this._upgradeLevels["reload"] * 0.3);
    }

    this._cachedSynergies = this._getUpgradeSynergies();
    this._updateTrebuchetVisuals();
    this._playSound("buy");
    this._hudDirty = true;
  }

  private _updateTrebuchetVisuals(): void {
    const powerLvl = this._upgradeLevels["power"];
    const reloadLvl = this._upgradeLevels["reload"];
    const multiLvl = this._upgradeLevels["multishot"];
    const gateLvl = this._upgradeLevels["gate"];
    const splashLvl = this._upgradeLevels["splash"];

    // Power upgrade: counterweight grows
    const cw = this._trebuchetGroup.getObjectByName("counterweight");
    if (!cw && powerLvl > 0) {
      const cwMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.5 });
      const cwMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0 + powerLvl * 0.2, 1.0 + powerLvl * 0.15, 0.7 + powerLvl * 0.1), cwMat);
      cwMesh.position.set(0, 3.2, -1.8);
      cwMesh.name = "counterweight";
      cwMesh.castShadow = true;
      this._trebuchetGroup.add(cwMesh);
    } else if (cw && cw instanceof THREE.Mesh) {
      cw.geometry.dispose();
      cw.geometry = new THREE.BoxGeometry(1.0 + powerLvl * 0.2, 1.0 + powerLvl * 0.15, 0.7 + powerLvl * 0.1);
    }

    // Reload upgrade: add spinning gears
    if (reloadLvl > 0 && !this._trebuchetGroup.getObjectByName("gear1")) {
      const gearMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7, roughness: 0.3 });
      for (let gi = 0; gi < Math.min(reloadLvl, 3); gi++) {
        const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 12), gearMat);
        gear.position.set(1.2, 1 + gi * 1.2, -0.5);
        gear.rotation.z = Math.PI / 2;
        gear.name = `gear${gi + 1}`;
        this._trebuchetGroup.add(gear);
      }
    }

    // Multishot upgrade: add second arm hint (parallel rail)
    if (multiLvl > 0 && !this._trebuchetGroup.getObjectByName("twinRail")) {
      const railMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 6), railMat);
      rail.position.set(0.5, 4.5, 2.5);
      rail.name = "twinRail";
      rail.castShadow = true;
      this._trebuchetGroup.add(rail);
      // Bracket connecting to main arm
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5 }));
      bracket.position.set(0.25, 4.5, 3);
      bracket.name = "twinBracket";
      this._trebuchetGroup.add(bracket);
    }

    // Splash upgrade: metal bands on sling
    if (splashLvl > 0 && !this._trebuchetGroup.getObjectByName("slingBand")) {
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.3 });
      for (let sb = 0; sb < Math.min(splashLvl, 3); sb++) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.38 + sb * 0.05, 0.03, 12, 12), bandMat);
        band.position.set(0, 3.2 + sb * 0.15, 6.8);
        band.name = sb === 0 ? "slingBand" : `slingBand${sb}`;
        this._trebuchetGroup.add(band);
      }
    }

    // Gate upgrade: add iron reinforcement patches
    if (gateLvl > 0) {
      const patchName = `gatePatch${gateLvl}`;
      if (!this._scene.getObjectByName(patchName)) {
        const patchMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.6 });
        const patch = new THREE.Mesh(new THREE.BoxGeometry(1.5 + Math.random(), 1.5 + Math.random(), 0.1), patchMat);
        patch.position.set((Math.random() - 0.5) * (GATE_WIDTH - 2), 1 + Math.random() * (WALL_HEIGHT - 2), WALL_Z - 1.1);
        patch.name = patchName;
        this._scene.add(patch);
      }
    }
  }

  private _buyAmmo(ammo: AmmoType): void {
    if (this._unlockedAmmo.includes(ammo)) return;
    const ad = AMMO_DEFS[ammo];
    const cost = 60 + ad.unlockWave * 15;
    if (this._gold < cost) return;
    this._gold -= cost;
    this._unlockedAmmo.push(ammo);
    this._playSound("buy");
    this._hudDirty = true;
  }

  private _waveGoldReward(): number {
    return 20 + this._wave * 10;
  }

  // ── Input ────────────────────────────────────────────────────────────────

  private _bindInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      this._keys.add(e.code);

      if (e.code === "Escape") {
        if (this._phase === "paused") {
          this._phase = this._pausedPhase;
          return;
        }
        window.dispatchEvent(new Event("trebuchetExit"));
        return;
      }

      // Pause toggle
      if (e.code === "KeyP" && (this._phase === "playing" || this._phase === "boss")) {
        this._pausedPhase = this._phase;
        this._phase = "paused";
        this._stopMusic();
        return;
      }
      if (e.code === "KeyP" && this._phase === "paused") {
        this._phase = this._pausedPhase;
        this._startMusic();
        return;
      }

      // Ammo switching
      const prevAmmo = this._currentAmmo;
      if (e.code === "Digit1" && this._unlockedAmmo.length >= 1) this._currentAmmo = this._unlockedAmmo[0];
      if (e.code === "Digit2" && this._unlockedAmmo.length >= 2) this._currentAmmo = this._unlockedAmmo[1];
      if (e.code === "Digit3" && this._unlockedAmmo.length >= 3) this._currentAmmo = this._unlockedAmmo[2];
      if (e.code === "Digit4" && this._unlockedAmmo.length >= 4) this._currentAmmo = this._unlockedAmmo[3];
      if (this._currentAmmo !== prevAmmo) this._updateLoadedAmmo();

      // Active abilities
      if ((this._phase === "playing" || this._phase === "boss")) {
        if (e.code === "KeyQ" && this._oilCooldown <= 0) this._useBoilingOil();
        if (e.code === "KeyE" && this._volleyCooldown <= 0) this._useArrowVolley();
        if (e.code === "KeyR" && this._repairCooldown <= 0) this._useEmergencyRepair();
      }
    };

    this._onKeyUp = (e: KeyboardEvent) => {
      this._keys.delete(e.code);
    };

    this._onMouseMove = (e: MouseEvent) => {
      this._mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this._mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    this._onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      if (this._phase === "title") {
        this._wave = 0;
        this._score = 0;
        this._gold = 20;
        this._gateHp = GATE_MAX_HP;
        this._gateMaxHp = GATE_MAX_HP;
        this._currentAmmo = "boulder";
        this._unlockedAmmo = ["boulder"];
        for (const u of UPGRADE_DEFS) this._upgradeLevels[u.id] = 0;
        this._reloadTime = 2.0;
        this._comboCount = 0; this._comboTimer = 0; this._comboMultiplier = 1; this._maxCombo = 0;
        this._oilCooldown = 0; this._volleyCooldown = 0; this._repairCooldown = 0;
        this._lastStandActive = false; this._currentModifier = WAVE_MODIFIERS[0];
        this._totalKills = 0; this._totalShots = 0; this._totalHits = 0; this._totalDamageDealt = 0;
        this._enemyProjectiles = [];
        this._startMusic();
        // Go straight to shop so the player can prepare before wave 1
        this._phase = "shop";
        this._hudDirty = true;
        this._renderHUD();
        return;
      }

      if (this._phase === "defeat" || this._phase === "victory") {
        window.dispatchEvent(new Event("trebuchetExit"));
        return;
      }

      if (this._phase === "between_waves") {
        this._phase = "shop";
        this._gold += this._waveGoldReward();
        // Gate partial repair
        this._gateHp = Math.min(this._gateHp + Math.floor(this._gateMaxHp * 0.1), this._gateMaxHp);
        this._renderHUD();
        return;
      }

      if (this._phase === "playing" || this._phase === "boss") {
        if (this._reloadTimer <= 0) {
          this._charging = true;
          this._power = MIN_POWER;
        }
      }
    };

    this._onMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) return;

      if ((this._phase === "playing" || this._phase === "boss") && this._charging) {
        this._charging = false;
        this._fire();
      }
    };

    this._onClick = () => {}; // handled by mousedown/mouseup

    this._onResize = () => {
      this._camera.aspect = window.innerWidth / window.innerHeight;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
    window.addEventListener("click", this._onClick);
    window.addEventListener("resize", this._onResize);
  }

  // ── Aiming ───────────────────────────────────────────────────────────────

  private _updateAim(): void {
    // Arrow key aiming (incremental)
    const aimSpeed = 1.2; // radians per second
    const dt = 1 / 60; // approximate frame dt
    if (this._keys.has("ArrowLeft") || this._keys.has("KeyA")) this._mouseX -= aimSpeed * dt;
    if (this._keys.has("ArrowRight") || this._keys.has("KeyD")) this._mouseX += aimSpeed * dt;
    if (this._keys.has("ArrowUp") || this._keys.has("KeyW")) this._mouseY += aimSpeed * dt;
    if (this._keys.has("ArrowDown") || this._keys.has("KeyS")) this._mouseY -= aimSpeed * dt;
    this._mouseX = Math.max(-1, Math.min(1, this._mouseX));
    this._mouseY = Math.max(-1, Math.min(1, this._mouseY));

    // Map mouse X to horizontal angle (sweep across the field)
    this._aimAngleH = this._mouseX * 0.8; // ±0.8 radians

    // Map mouse Y to vertical angle (elevation) — mouse up = aim higher
    this._aimAngleV = 0.3 + ((this._mouseY + 1) / 2) * 0.8; // 0.3 to 1.1 radians

    // Calculate where the projectile would land given current power & angle
    const launchPos = new THREE.Vector3(0, LAUNCH_HEIGHT, WALL_Z);
    const power = this._charging ? this._power : (MIN_POWER + this._getMaxPower()) / 2;
    const vx = Math.sin(this._aimAngleH) * Math.cos(this._aimAngleV) * power;
    const vy = Math.sin(this._aimAngleV) * power;
    const vz = Math.cos(this._aimAngleH) * Math.cos(this._aimAngleV) * power;

    // Update trajectory line with ammo-colored glow
    const aimColor = this._currentAmmo === "fire_pot" ? 0xff6622 : this._currentAmmo === "holy_water" ? 0x44aaff : this._currentAmmo === "chain_shot" ? 0xaaaaaa : 0xffee44;
    (this._aimLine.material as THREE.LineDashedMaterial).color.setHex(aimColor);

    const positions = this._aimLine.geometry.attributes.position as THREE.BufferAttribute;
    const arr = positions.array as Float32Array;
    let drawCount = 0;
    for (let i = 0; i < 60; i++) {
      const t = i * 0.06;
      const px = launchPos.x + vx * t;
      const py = launchPos.y + vy * t + 0.5 * GRAVITY * t * t;
      const pz = launchPos.z + vz * t;
      if (py < 0 && i > 0) break;
      arr[i * 3] = px;
      arr[i * 3 + 1] = py;
      arr[i * 3 + 2] = pz;
      drawCount = i + 1;
    }
    positions.needsUpdate = true;
    this._aimLine.geometry.setDrawRange(0, drawCount);
    this._aimLine.computeLineDistances(); // required for dashed line

    // Update glow line (point cloud behind dashes)
    const aimGlow = this._scene.getObjectByName("aimGlow") as THREE.Points | undefined;
    if (aimGlow) {
      const gAttr = aimGlow.geometry.attributes.position as THREE.BufferAttribute;
      const gArr = gAttr.array as Float32Array;
      for (let i = 0; i < drawCount && i < 60; i++) {
        gArr[i * 3] = arr[i * 3];
        gArr[i * 3 + 1] = arr[i * 3 + 1];
        gArr[i * 3 + 2] = arr[i * 3 + 2];
      }
      gAttr.needsUpdate = true;
      aimGlow.geometry.setDrawRange(0, drawCount);
      (aimGlow.material as THREE.PointsMaterial).color.setHex(aimColor);
      // Pulsing opacity
      (aimGlow.material as THREE.PointsMaterial).opacity = 0.15 + Math.sin(this._time * 6) * 0.1;
      aimGlow.visible = this._aimLine.visible;
    }

    // Find impact point for crosshair
    const impactT = this._findImpactTime(launchPos, new THREE.Vector3(vx, vy, vz));
    if (impactT > 0) {
      const ix = launchPos.x + vx * impactT;
      const iz = launchPos.z + vz * impactT;
      this._crosshair.position.set(ix, 0.1, iz);
      this._crosshair.visible = true;

      // Scale crosshair by splash radius + color by ammo
      const splash = AMMO_DEFS[this._currentAmmo].splash + this._upgradeLevels["splash"] * 1.5;
      this._crosshair.scale.setScalar(splash / 2);
      // Tint crosshair rings by ammo color
      this._crosshair.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.color.setHex(aimColor);
        }
      });
    }

    // Rotate trebuchet arm to match aim
    this._trebuchetGroup.rotation.y = -this._aimAngleH;
    this._trebuchetArm.rotation.x = -this._aimAngleV * 0.5;
  }

  private _findImpactTime(pos: THREE.Vector3, vel: THREE.Vector3): number {
    // Solve for y=0: pos.y + vel.y*t + 0.5*GRAVITY*t^2 = 0
    const a = 0.5 * GRAVITY;
    const b = vel.y;
    const c = pos.y;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return -1;
    const t1 = (-b + Math.sqrt(disc)) / (2 * a);
    const t2 = (-b - Math.sqrt(disc)) / (2 * a);
    // We want the positive root when projectile comes down
    if (t1 > 0 && t2 > 0) return Math.min(t1, t2);
    if (t1 > 0) return t1;
    if (t2 > 0) return t2;
    return -1;
  }

  private _getMaxPower(): number {
    return MAX_POWER + this._upgradeLevels["power"] * 10;
  }

  private _updateLoadedAmmo(): void {
    if (this._loadedAmmoMesh) {
      this._trebuchetGroup.remove(this._loadedAmmoMesh);
      this._loadedAmmoMesh.geometry.dispose();
      (this._loadedAmmoMesh.material as THREE.Material).dispose();
      this._loadedAmmoMesh = null;
    }
    const def = AMMO_DEFS[this._currentAmmo];
    const s = this._currentAmmo === "chain_shot" ? 0.2 : 0.35;
    const mat = new THREE.MeshStandardMaterial({ color: def.color, emissive: def.emissive, emissiveIntensity: 0.6, roughness: 0.5 });
    this._loadedAmmoMesh = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 12), mat);
    this._loadedAmmoMesh.position.set(0, 3.4, 6.8);
    this._trebuchetGroup.add(this._loadedAmmoMesh);
  }

  // ── Fire ─────────────────────────────────────────────────────────────────

  private _fire(): void {
    const launchPos = new THREE.Vector3(
      this._trebuchetGroup.position.x,
      LAUNCH_HEIGHT,
      WALL_Z + 1,
    );

    const vx = Math.sin(this._aimAngleH) * Math.cos(this._aimAngleV) * this._power;
    const vy = Math.sin(this._aimAngleV) * this._power;
    const vz = Math.cos(this._aimAngleH) * Math.cos(this._aimAngleV) * this._power;

    this._spawnProjectile(launchPos, new THREE.Vector3(vx, vy, vz), this._currentAmmo);

    // Multishot chance
    const multiLvl = this._upgradeLevels["multishot"];
    const barrageSynergy = this._cachedSynergies.includes("barrage") ? 0.2 : 0;
    if (multiLvl > 0 && Math.random() < multiLvl * 0.2 + barrageSynergy) {
      // Slightly offset second shot
      const offset = (Math.random() - 0.5) * 4;
      const vx2 = vx + offset;
      setTimeout(() => {
        if (!this._destroyed) {
          this._spawnProjectile(launchPos.clone(), new THREE.Vector3(vx2, vy * 0.95, vz), this._currentAmmo);
        }
      }, 100);
    }

    this._reloadTimer = this._reloadTime;
    this._totalShots++;
    this._armSwingTimer = 0; // trigger arm swing animation

    // Directional recoil shake (opposite of aim direction)
    this._screenShake = Math.min(this._screenShake + 0.2, 0.6);
    this._screenShakeDir.set(-Math.sin(this._aimAngleH) * 0.7, 0.3);

    // Trebuchet mechanical recoil
    this._trebuchetRecoil = 0.5;

    // Dust kick-up from trebuchet base
    for (let dk = 0; dk < 4; dk++) {
      const dustMat = new THREE.MeshBasicMaterial({ color: 0xccbb99, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
      const dust = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), dustMat);
      dust.position.set(
        this._trebuchetGroup.position.x + (Math.random() - 0.5) * 2,
        WALL_HEIGHT + 0.2,
        WALL_Z - 2 + (Math.random() - 0.5),
      );
      dust.lookAt(this._camera.position);
      this._addParticle(dust, 0.8, (el) => {
        dust.position.y += 0.03;
        dust.scale.setScalar(1 + el * 3);
        dustMat.opacity = 0.4 * (1 - el / 0.8);
      });
    }

    // Camera briefly follows the projectile
    if (this._projectiles.length > 0) {
      this._cameraFollowProjectile = this._projectiles[this._projectiles.length - 1];
      this._cameraFollowTimer = 0.4; // follow for 0.4 seconds
    }

    // Reset zoom (was zoomed in during charge)
    this._cameraZoomOffset = 0;

    // Hide loaded ammo during flight
    if (this._loadedAmmoMesh) this._loadedAmmoMesh.visible = false;
    this._playSound("launch");
  }

  private _spawnProjectile(pos: THREE.Vector3, vel: THREE.Vector3, ammo: AmmoType): void {
    const def = AMMO_DEFS[ammo];
    const size = ammo === "chain_shot" ? 0.25 : 0.45;
    const geo = new THREE.SphereGeometry(size, 16, 12);
    const mat = new THREE.MeshStandardMaterial({ color: def.color, emissive: def.emissive, emissiveIntensity: ammo === "fire_pot" ? 1.5 : ammo === "holy_water" ? 1.0 : 0.3, roughness: 0.4 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.castShadow = true;
    this._scene.add(mesh);

    // Fire pot: attach glowing point light
    if (ammo === "fire_pot") {
      const fireGlow = new THREE.PointLight(0xff4400, 3, 8);
      mesh.add(fireGlow);
    }
    // Holy water: attach cool blue glow
    if (ammo === "holy_water") {
      const holyGlow = new THREE.PointLight(0x4488ff, 2, 6);
      mesh.add(holyGlow);
    }
    // Chain shot: add second linked sphere
    if (ammo === "chain_shot") {
      const link = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), mat);
      link.position.set(0, 0, 0.6);
      mesh.add(link);
      // Chain between them
      const chainMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5 });
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 12), chainMat);
      chain.position.set(0, 0, 0.3);
      chain.rotation.x = Math.PI / 2;
      mesh.add(chain);
    }

    // Trail particles (larger, more visible)
    const trailCount = 40;
    const trailGeo = new THREE.BufferGeometry();
    const trailArr = new Float32Array(trailCount * 3);
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailArr, 3));
    const trailColor = ammo === "fire_pot" ? 0xff6622 : ammo === "holy_water" ? 0x66aaff : ammo === "chain_shot" ? 0x888888 : 0xccbb88;
    const trailMat = new THREE.PointsMaterial({
      color: trailColor,
      size: ammo === "fire_pot" ? 0.5 : 0.35,
      transparent: true,
      opacity: ammo === "fire_pot" ? 0.75 : 0.5,
      depthWrite: false,
    });
    const trail = new THREE.Points(trailGeo, trailMat);
    this._scene.add(trail);

    this._projectiles.push({
      mesh,
      trail,
      trailPositions: [],
      velocity: vel,
      ammo,
      alive: true,
      time: 0,
      directHit: false,
    });
  }

  // ── Enemy Spawning ───────────────────────────────────────────────────────

  private _startNextWave(): void {
    this._wave++;
    this._waveEnemiesKilled = 0;

    // Late-game difficulty scaling: ramp starting at wave 8
    this._difficultyMult = 1 + Math.max(0, this._wave - 8) * 0.12;

    // Pick wave modifier
    this._currentModifier = pickWaveModifier(this._wave);

    // Play wave start horn
    this._playSound("wave_start");

    // Update cached synergies
    this._cachedSynergies = this._getUpgradeSynergies();

    // Wave announcement banner
    this._showWaveAnnouncement();

    // Check for boss wave (every 5 waves)
    if (this._wave % 5 === 0) {
      this._phase = "boss";
      const bossIdx = Math.min(Math.floor(this._wave / 5) - 1, BOSSES.length - 1);
      const bossDef = BOSSES[bossIdx];
      this._spawnBoss(bossDef);
      this._playSound("boss_roar");

      // Boss entrance cinematic: ground slam dust + dramatic darkness
      this._freezeFrames = 6;
      setTimeout(() => {
        if (this._destroyed) return;
        // Ground slam dust ring at boss spawn point
        for (let d = 0; d < 12; d++) {
          const angle = (d / 12) * Math.PI * 2;
          const dMat = new THREE.MeshBasicMaterial({ color: 0x998866, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
          const dPuff = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), dMat);
          dPuff.position.set(Math.cos(angle) * 3, 0.3, FIELD_LENGTH + 10 + Math.sin(angle) * 3);
          dPuff.lookAt(this._camera.position);
          this._addParticle(dPuff, 1.5, (el) => {
            dPuff.position.x += Math.cos(angle) * 0.05;
            dPuff.position.z += Math.sin(angle) * 0.05;
            dPuff.position.y += 0.02;
            dPuff.scale.setScalar(1 + el * 3);
            dMat.opacity = 0.5 * (1 - el / 1.5);
          });
        }
        this._screenShake = 0.8;
      }, 100);
      // Also spawn some adds
      this._waveSpawns = [{ type: "footman", count: 4 + this._wave, delay: 1.0, laneSpread: 0.7 }];
      this._spawnTimers = [0];
      this._spawnCounts = [0];
      this._waveEnemiesTotal = this._waveSpawns[0].count + 1; // +1 for boss
    } else {
      this._phase = "playing";
      this._waveSpawns = generateWave(this._wave);
      // Swarm modifier: double count
      if (this._currentModifier.id === "swarm") {
        for (const s of this._waveSpawns) s.count = Math.floor(s.count * 1.8);
      }
      this._spawnTimers = this._waveSpawns.map(() => 0);
      this._spawnCounts = this._waveSpawns.map(() => 0);
      this._waveEnemiesTotal = this._waveSpawns.reduce((sum, s) => sum + s.count, 0);
    }

    this._renderHUD();
  }

  private _spawnEnemy(type: EnemyType, x: number): void {
    const def = ENEMY_DEFS[type];
    const group = new THREE.Group();

    // ── Shadow blob beneath every enemy ──
    const shadowGeo = new THREE.CircleGeometry(Math.max(def.width, def.depth) * 0.6, 12);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    group.add(shadow);

    if (type === "footman" || type === "shieldbearer" || type === "cavalry") {
      const bodyMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.7 });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xddaa88, roughness: 0.8 });
      const armorMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.4, metalness: 0.4 });

      // Body (torso)
      const body = new THREE.Mesh(new THREE.BoxGeometry(def.width * 0.6, def.height * 0.35, def.depth * 0.45), bodyMat);
      body.position.y = def.height * 0.5;
      body.castShadow = true;
      group.add(body);

      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(def.width * 0.3, 16, 12), skinMat);
      head.position.y = def.height * 0.78;
      head.castShadow = true;
      group.add(head);

      // Helmet (slightly larger half-sphere on top)
      const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(def.width * 0.33, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
        armorMat,
      );
      helmet.position.y = def.height * 0.82;
      group.add(helmet);

      // Arms (with weapons)
      for (const armSide of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, def.height * 0.3, 0.12), skinMat);
        arm.position.set(armSide * def.width * 0.4, def.height * 0.45, 0);
        arm.name = armSide === -1 ? "armL" : "armR";
        group.add(arm);
      }

      // Weapon in right hand
      if (type === "footman") {
        // Sword
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.12), armorMat);
        blade.position.set(def.width * 0.4, def.height * 0.55, -0.2);
        blade.rotation.x = -0.4;
        group.add(blade);
        // Hilt
        const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0x553311 }));
        hilt.position.set(def.width * 0.4, def.height * 0.38, -0.1);
        group.add(hilt);
      }

      // Legs (named for animation)
      const legMat = new THREE.MeshStandardMaterial({ color: 0x443322 });
      const bootMat = new THREE.MeshStandardMaterial({ color: 0x332211 });
      for (const lSide of [-1, 1]) {
        const legGroup = new THREE.Group();
        legGroup.name = lSide === -1 ? "legL" : "legR";
        const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, def.height * 0.25, 0.18), legMat);
        thigh.position.y = def.height * 0.12;
        legGroup.add(thigh);
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.2, def.height * 0.1, 0.25), bootMat);
        boot.position.y = -0.02;
        boot.position.z = 0.03;
        legGroup.add(boot);
        legGroup.position.set(lSide * 0.15, def.height * 0.18, 0);
        group.add(legGroup);
      }

      if (type === "shieldbearer") {
        // Large kite shield
        const shieldGroup = new THREE.Group();
        const shieldBody = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 1.2, 0.08),
          new THREE.MeshStandardMaterial({ color: 0x3344aa, metalness: 0.4, roughness: 0.5 }),
        );
        shieldGroup.add(shieldBody);
        // Shield boss (center metal knob)
        const boss = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 20, 16),
          armorMat,
        );
        boss.position.z = -0.06;
        shieldGroup.add(boss);
        // Shield rim
        const rimMat = new THREE.MeshStandardMaterial({ color: 0x777788, metalness: 0.5 });
        const rim = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.05, 0.1), rimMat);
        rim.position.y = 0.58;
        shieldGroup.add(rim);
        shieldGroup.position.set(-def.width * 0.35, def.height * 0.48, -def.depth * 0.3);
        group.add(shieldGroup);

        // Spear in right hand
        const spearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 12), new THREE.MeshStandardMaterial({ color: 0x665522 }));
        spearShaft.position.set(def.width * 0.4, def.height * 0.6, 0);
        group.add(spearShaft);
        const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 12), armorMat);
        spearTip.position.set(def.width * 0.4, def.height * 0.6 + 1.1, 0);
        group.add(spearTip);
      }

      if (type === "cavalry") {
        // Horse
        const horseMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.8 });
        const horseBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 2.2), horseMat);
        horseBody.position.set(0, 0.7, 0);
        horseBody.castShadow = true;
        group.add(horseBody);
        // Horse head
        const horseHead = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.7), horseMat);
        horseHead.position.set(0, 1.0, -1.3);
        horseHead.rotation.x = 0.3;
        group.add(horseHead);
        // Horse legs (4)
        const hLegMat = new THREE.MeshStandardMaterial({ color: 0x553316 });
        for (const hx of [-0.3, 0.3]) {
          for (const hz of [-0.7, 0.7]) {
            const hLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), hLegMat);
            hLeg.position.set(hx, 0.15, hz);
            group.add(hLeg);
          }
        }
        // Saddle
        const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.7), new THREE.MeshStandardMaterial({ color: 0x882211 }));
        saddle.position.set(0, 1.2, 0);
        group.add(saddle);
        // Lance
        const lance = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 3.5, 12), new THREE.MeshStandardMaterial({ color: 0x665522 }));
        lance.position.set(0.4, 1.8, -0.5);
        lance.rotation.x = 0.3;
        group.add(lance);
        // Raise rider
        body.position.y += 0.8;
        head.position.y += 0.8;
        helmet.position.y += 0.8;
      }
    } else {
      // ── Siege equipment (more detailed) ──
      const mat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.8 });
      const metalMat2 = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.5 });

      if (type === "siege_tower") {
        // Multi-story wooden tower
        for (let floor = 0; floor < 3; floor++) {
          const fy = floor * (def.height / 3);
          const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height / 3 - 0.1, def.depth), mat);
          floorMesh.position.y = fy + def.height / 6;
          floorMesh.castShadow = true;
          group.add(floorMesh);
          // Floor separator
          const sep = new THREE.Mesh(new THREE.BoxGeometry(def.width + 0.1, 0.1, def.depth + 0.1), metalMat2);
          sep.position.y = fy + def.height / 3;
          group.add(sep);
        }
        // Ladders on front
        for (const lx of [-0.8, 0.8]) {
          const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.08, def.height, 0.08), new THREE.MeshStandardMaterial({ color: 0x887744 }));
          ladder.position.set(lx, def.height / 2, -def.depth / 2 - 0.1);
          group.add(ladder);
        }
        // Ladder rungs
        for (let ry = 0.5; ry < def.height; ry += 0.6) {
          const rung = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0x887744 }));
          rung.position.set(0, ry, -def.depth / 2 - 0.1);
          group.add(rung);
        }
        // Wheels
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x443322 });
        for (const wx of [-1, 1]) {
          for (const wz of [-1, 1]) {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 12), wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx * def.width / 2, 0.5, wz * def.depth / 3);
            group.add(wheel);
          }
        }
        // War flag on top
        const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 12), metalMat2);
        flagPole.position.set(0, def.height + 1.5, 0);
        group.add(flagPole);
        const flag = new THREE.Mesh(
          new THREE.PlaneGeometry(1.5, 1),
          new THREE.MeshStandardMaterial({ color: 0x880000, side: THREE.DoubleSide }),
        );
        flag.position.set(0.75, def.height + 2.5, 0);
        flag.name = "warFlag";
        group.add(flag);
      } else {
        const mainBody = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height, def.depth), mat);
        mainBody.position.y = def.height / 2;
        mainBody.castShadow = true;
        group.add(mainBody);
      }

      if (type === "battering_ram") {
        // Overhead cover (roof)
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x665530, roughness: 0.9 });
        const roof = new THREE.Mesh(new THREE.BoxGeometry(def.width + 0.3, 0.2, def.depth + 0.5), roofMat);
        roof.position.set(0, def.height + 0.1, 0);
        group.add(roof);
        // Support poles
        for (const px of [-0.8, 0.8]) {
          for (const pz of [-2, 2]) {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, def.height, 12), mat);
            pole.position.set(px, def.height / 2, pz);
            group.add(pole);
          }
        }
        // Ram pole (iron-tipped log)
        const ramPole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.15, def.depth + 2, 12),
          new THREE.MeshStandardMaterial({ color: 0x443322 }),
        );
        ramPole.rotation.x = Math.PI / 2;
        ramPole.position.set(0, 1.2, -0.5);
        group.add(ramPole);
        // Iron ram head
        const tip = new THREE.Mesh(
          new THREE.ConeGeometry(0.35, 1.0, 12),
          metalMat2,
        );
        tip.rotation.x = -Math.PI / 2;
        tip.position.set(0, 1.2, -def.depth / 2 - 1.8);
        group.add(tip);
        // Chains suspending ram
        for (const cz of [-1, 1]) {
          const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, def.height - 1, 12), metalMat2);
          chain.position.set(0, def.height * 0.6, cz * 1.5);
          group.add(chain);
        }
      }

      if (type === "catapult") {
        // Arm
        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.15, 4),
          new THREE.MeshStandardMaterial({ color: 0x997744 }),
        );
        arm.position.set(0, def.height, 0);
        arm.rotation.x = -0.3;
        group.add(arm);
        // Bucket
        const bucket = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), mat);
        bucket.position.set(0, def.height + 0.5, -1.8);
        group.add(bucket);
        // Wheels
        for (const wx of [-1, 1]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0x443322 }));
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wx * def.width / 2, 0.45, 0);
          group.add(wheel);
        }
      }
    }

    // HP bar
    const barW = def.width + 0.5;
    const hpBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(barW, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide, depthWrite: false }),
    );
    hpBarBg.position.set(0, def.height + 0.6, 0);
    hpBarBg.renderOrder = 1;
    group.add(hpBarBg);

    const hpBar = new THREE.Mesh(
      new THREE.PlaneGeometry(barW, 0.18),
      new THREE.MeshBasicMaterial({ color: 0x44cc44, side: THREE.DoubleSide, depthWrite: false }),
    );
    hpBar.position.set(0, def.height + 0.6, -0.01);
    hpBar.renderOrder = 2;
    group.add(hpBar);

    group.position.set(x, 0, FIELD_LENGTH);
    this._scene.add(group);

    // Apply late-game difficulty scaling + wave modifier
    let hpMult = this._difficultyMult;
    let speedMult = 1 + (this._difficultyMult - 1) * 0.3;
    let gateDmgMult = 1;
    const mod = this._currentModifier.id;
    if (mod === "armored") hpMult *= 1.5;
    if (mod === "swarm") hpMult *= 0.5;
    if (mod === "speed") speedMult *= 1.4;
    if (mod === "fragile") { hpMult *= 0.5; gateDmgMult = 1.5; }

    const scaledHp = Math.floor(def.hp * hpMult);
    const scaledSpeed = def.speed * speedMult;

    this._enemies.push({
      mesh: group,
      type,
      hp: scaledHp,
      maxHp: scaledHp,
      x,
      z: FIELD_LENGTH,
      speed: scaledSpeed,
      dead: false,
      hitFlash: 0,
      burning: 0,
      slowed: 0,
      isBoss: false,
      gateDmgMult,
      goldMult: mod === "bounty" ? 2 : 1,
      regenRate: mod === "regen" ? 3 : 0, // 3 HP/sec regen for cursed wave
      firstHitShield: mod === "shield",
      hpBar,
      hpBarBg,
    });
  }

  private _spawnBoss(bossDef: BossDef): void {
    const group = new THREE.Group();
    const w = bossDef.width;
    const h = bossDef.height;
    const d = bossDef.depth;
    const mat = new THREE.MeshStandardMaterial({ color: bossDef.color, roughness: 0.45, metalness: 0.35 });
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.3, metalness: 0.7 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.7 });
    const glowColor = bossDef.ability === "regen" ? 0x44ff44 : bossDef.ability === "armor" ? 0x8888ff : 0xff4444;
    const runeMat = new THREE.MeshStandardMaterial({ color: glowColor, emissive: glowColor, emissiveIntensity: 1.5, transparent: true, opacity: 0.9 });

    // Shadow blob
    const shadowGeo = new THREE.CircleGeometry(w * 0.8, 16);
    const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    group.add(shadow);

    // ── Torso (barrel-shaped) ──
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.35, w * 0.4, h * 0.4, 12), mat);
    torso.position.y = h * 0.5;
    torso.castShadow = true;
    group.add(torso);

    // Chest armor plate
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, h * 0.3, d * 0.15), armorMat);
    chestPlate.position.set(0, h * 0.52, -d * 0.2);
    group.add(chestPlate);

    // Shoulder pauldrons
    for (const sx of [-1, 1]) {
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(w * 0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), armorMat);
      pauldron.position.set(sx * w * 0.4, h * 0.7, 0);
      pauldron.castShadow = true;
      group.add(pauldron);
      // Spike on pauldron
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.8, 12), armorMat);
      spike.position.set(sx * w * 0.5, h * 0.78, 0);
      spike.rotation.z = sx * -0.5;
      group.add(spike);
    }

    // ── Arms ──
    for (const ax of [-1, 1]) {
      // Upper arm
      const upperArm = new THREE.Mesh(new THREE.BoxGeometry(w * 0.12, h * 0.25, d * 0.12), skinMat);
      upperArm.position.set(ax * w * 0.45, h * 0.5, 0);
      group.add(upperArm);
      // Forearm
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(w * 0.1, h * 0.22, d * 0.1), skinMat);
      forearm.position.set(ax * w * 0.48, h * 0.3, -d * 0.1);
      group.add(forearm);
      // Gauntlet
      const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(w * 0.12, h * 0.08, d * 0.14), armorMat);
      gauntlet.position.set(ax * w * 0.48, h * 0.22, -d * 0.1);
      group.add(gauntlet);
    }

    // ── Weapon (right hand — massive sword/axe) ──
    const weaponMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.8, roughness: 0.2 });
    // Sword blade
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15, h * 0.6, w * 0.2), weaponMat);
    blade.position.set(w * 0.5, h * 0.55, -d * 0.3);
    blade.rotation.x = -0.3;
    blade.castShadow = true;
    group.add(blade);
    // Weapon glow edge
    const edgeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.03, h * 0.55, w * 0.05), runeMat);
    edgeGlow.position.set(w * 0.5, h * 0.55, -d * 0.3 - w * 0.08);
    edgeGlow.rotation.x = -0.3;
    group.add(edgeGlow);

    // ── Legs ──
    for (const lx of [-1, 1]) {
      const legGroup = new THREE.Group();
      legGroup.name = lx === -1 ? "legL" : "legR";
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(w * 0.15, h * 0.25, d * 0.15), mat);
      thigh.position.y = h * 0.12;
      legGroup.add(thigh);
      // Greaves (armored shin)
      const greave = new THREE.Mesh(new THREE.BoxGeometry(w * 0.13, h * 0.15, d * 0.16), armorMat);
      greave.position.y = 0;
      legGroup.add(greave);
      // Boot
      const boot = new THREE.Mesh(new THREE.BoxGeometry(w * 0.14, h * 0.06, d * 0.2), armorMat);
      boot.position.set(0, -h * 0.07, 0.05);
      legGroup.add(boot);
      legGroup.position.set(lx * w * 0.18, h * 0.18, 0);
      group.add(legGroup);
    }

    // ── Head ──
    const headGroup = new THREE.Group();
    // Skull/helmet
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(w * 0.22, 16, 12), armorMat);
    headGroup.add(helmet);
    // Visor slit
    const visor = new THREE.Mesh(new THREE.BoxGeometry(w * 0.25, 0.08, w * 0.05), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    visor.position.set(0, -0.05, -w * 0.2);
    headGroup.add(visor);
    // Glowing eyes behind visor
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: glowColor, emissiveIntensity: 3 });
    for (const ex of [-0.15, 0.15]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16), eyeMat);
      eye.position.set(ex * w, -0.03, -w * 0.22);
      headGroup.add(eye);
    }
    // Eye glow light
    const eyeLight = new THREE.PointLight(glowColor, 2, 5);
    eyeLight.position.set(0, 0, -w * 0.25);
    headGroup.add(eyeLight);
    headGroup.position.y = h * 0.78;
    group.add(headGroup);

    // ── Horns/Crown ──
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xddaa00, metalness: 0.9, roughness: 0.1 });
    for (const hx of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.8, 12), hornMat);
      horn.position.set(hx * w * 0.2, h * 0.9, 0);
      horn.rotation.z = hx * 0.35;
      group.add(horn);
      // Second smaller horn
      const horn2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.0, 12), hornMat);
      horn2.position.set(hx * w * 0.32, h * 0.85, -d * 0.1);
      horn2.rotation.z = hx * 0.5;
      group.add(horn2);
    }

    // ── Cape / Cloak (flowing behind) ──
    const capeMat = new THREE.MeshStandardMaterial({ color: bossDef.color, side: THREE.DoubleSide, roughness: 0.8 });
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, h * 0.5), capeMat);
    cape.position.set(0, h * 0.5, d * 0.25);
    cape.rotation.x = 0.2;
    cape.name = "bossCape";
    group.add(cape);

    // ── Rune glow lines on body ──
    const runePositions: [number, number, number, number, number, number][] = [
      [0, h * 0.45, -d * 0.22, w * 0.5, 0.04, 0.04], // horizontal chest rune
      [0, h * 0.38, -d * 0.22, 0.04, h * 0.15, 0.04], // vertical chest rune
      [-w * 0.18, h * 0.15, 0, 0.04, h * 0.12, 0.04], // left leg rune
      [w * 0.18, h * 0.15, 0, 0.04, h * 0.12, 0.04], // right leg rune
    ];
    for (const [rx, ry, rz, rw, rh, rd] of runePositions) {
      const rune = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, rd), runeMat);
      rune.position.set(rx, ry, rz);
      rune.name = "bossRune";
      group.add(rune);
    }

    // ── Aura particles orbiting boss ──
    const auraCount = 24;
    const auraGeo = new THREE.BufferGeometry();
    const auraPos = new Float32Array(auraCount * 3);
    for (let i = 0; i < auraCount; i++) {
      const angle = (i / auraCount) * Math.PI * 2;
      auraPos[i * 3] = Math.cos(angle) * w * 0.6;
      auraPos[i * 3 + 1] = h * 0.3 + (i % 3) * h * 0.2;
      auraPos[i * 3 + 2] = Math.sin(angle) * d * 0.6;
    }
    auraGeo.setAttribute("position", new THREE.BufferAttribute(auraPos, 3));
    const auraMat = new THREE.PointsMaterial({ color: glowColor, size: 0.3, transparent: true, opacity: 0.7, depthWrite: false });
    const aura = new THREE.Points(auraGeo, auraMat);
    aura.name = "bossAura";
    group.add(aura);

    // ── Shield aura (for "shield" ability) ──
    if (bossDef.ability === "shield") {
      const shieldGeo = new THREE.SphereGeometry(w * 0.9, 20, 16);
      const shieldMat = new THREE.MeshBasicMaterial({ color: 0x4444ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
      const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
      shieldMesh.position.y = h * 0.45;
      shieldMesh.name = "bossShield";
      group.add(shieldMesh);
      // Hexagonal pattern overlay
      const hexMat = new THREE.MeshBasicMaterial({ color: 0x6666ff, transparent: true, opacity: 0.06, side: THREE.DoubleSide, wireframe: true });
      const hexMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(w * 0.92, 1), hexMat);
      hexMesh.position.y = h * 0.45;
      hexMesh.name = "bossShieldHex";
      group.add(hexMesh);
    }

    // ── Armor regen glow (for "regen" ability) ──
    if (bossDef.ability === "regen") {
      const regenGlow = new THREE.PointLight(0x44ff44, 1.5, 8);
      regenGlow.position.set(0, h * 0.5, 0);
      regenGlow.name = "bossRegenLight";
      group.add(regenGlow);
    }

    // ── Armor plates overlay (for "armor" ability) ──
    if (bossDef.ability === "armor") {
      const extraArmorMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.2, metalness: 0.9 });
      // Extra belly plate
      const belly = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, h * 0.15, d * 0.18), extraArmorMat);
      belly.position.set(0, h * 0.38, -d * 0.2);
      group.add(belly);
      // Thigh plates
      for (const tx of [-1, 1]) {
        const thighPlate = new THREE.Mesh(new THREE.BoxGeometry(w * 0.14, h * 0.12, d * 0.1), extraArmorMat);
        thighPlate.position.set(tx * w * 0.2, h * 0.22, -d * 0.1);
        group.add(thighPlate);
      }
    }

    // HP bar
    const barWidth = w + 3;
    const hpBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(barWidth, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide, depthWrite: false }),
    );
    hpBarBg.position.set(0, h + 1.5, 0);
    hpBarBg.renderOrder = 1;
    group.add(hpBarBg);

    const hpBar = new THREE.Mesh(
      new THREE.PlaneGeometry(barWidth, 0.35),
      new THREE.MeshBasicMaterial({ color: 0xff3333, side: THREE.DoubleSide, depthWrite: false }),
    );
    hpBar.position.set(0, h + 1.5, -0.01);
    hpBar.renderOrder = 2;
    group.add(hpBar);

    group.position.set(0, 0, FIELD_LENGTH + 10);
    this._scene.add(group);

    const scaledHp = bossDef.hp * (1 + (this._wave / 5 - 1) * 0.5);

    this._enemies.push({
      mesh: group,
      type: "footman",
      hp: scaledHp,
      maxHp: scaledHp,
      x: 0,
      z: FIELD_LENGTH + 10,
      speed: bossDef.speed,
      dead: false,
      hitFlash: 0,
      burning: 0,
      slowed: 0,
      isBoss: true,
      bossDef,
      bossShieldActive: bossDef.ability === "shield",
      bossRegenTimer: 0,
      gateDmgMult: 1,
      goldMult: 1,
      regenRate: 0,
      firstHitShield: false,
      hpBar,
      hpBarBg,
    });
  }

  // ── Explosions ───────────────────────────────────────────────────────────

  private _spawnExplosion(pos: THREE.Vector3, radius: number, ammo: AmmoType): void {
    const def = AMMO_DEFS[ammo];
    const group = new THREE.Group();

    // Core explosion — shape varies by ammo type
    let coreGeo: THREE.BufferGeometry;
    if (ammo === "fire_pot") {
      // Fireball: stretched vertically
      coreGeo = new THREE.SphereGeometry(1, 20, 16);
      coreGeo.scale(1, 1.4, 1);
    } else if (ammo === "holy_water") {
      // Crystal burst: icosahedron
      coreGeo = new THREE.IcosahedronGeometry(1, 1);
    } else if (ammo === "chain_shot") {
      // Shrapnel: jagged dodecahedron
      coreGeo = new THREE.DodecahedronGeometry(0.8, 0);
    } else {
      // Boulder: rocky sphere
      coreGeo = new THREE.SphereGeometry(1, 16, 12);
    }
    const sphereMat = new THREE.MeshBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.85,
    });
    group.add(new THREE.Mesh(coreGeo, sphereMat));

    // Secondary shockwave ring
    const ringGeo = new THREE.RingGeometry(0.5, 1, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.name = "shockRing";
    group.add(ring);

    // Spark particles
    const particleCount = 35;
    const particleGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * radius * 1.5;
      pPositions[i * 3 + 1] = Math.random() * radius * 1.2;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * radius * 1.5;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: ammo === "fire_pot" ? 0xff6600 : ammo === "holy_water" ? 0x88ccff : 0xddcc88,
      size: ammo === "fire_pot" ? 0.6 : 0.4,
      transparent: true,
      opacity: 0.95,
    });
    group.add(new THREE.Points(particleGeo, particleMat));

    // Light flash (brighter, wider)
    const flash = new THREE.PointLight(def.color, 8, radius * 4);
    group.add(flash);

    // Debris chunks (small boxes that fly out)
    const debrisCount = ammo === "boulder" ? 8 : ammo === "chain_shot" ? 5 : 4;
    const debrisMat = new THREE.MeshStandardMaterial({
      color: ammo === "fire_pot" ? 0x663300 : ammo === "holy_water" ? 0x88aacc : 0x666655,
      roughness: 0.9,
    });
    for (let d = 0; d < debrisCount; d++) {
      const ds = 0.1 + Math.random() * 0.25;
      const debris = new THREE.Mesh(new THREE.BoxGeometry(ds, ds, ds), debrisMat);
      debris.position.set(
        (Math.random() - 0.5) * radius * 0.5,
        Math.random() * 0.5,
        (Math.random() - 0.5) * radius * 0.5,
      );
      debris.name = "debris";
      // Store velocity in userData
      debris.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        3 + Math.random() * 8,
        (Math.random() - 0.5) * 12,
      );
      debris.castShadow = true;
      group.add(debris);
    }

    group.position.copy(pos);
    group.position.y = Math.max(0.1, pos.y);
    this._scene.add(group);

    // Screen shake (directional — away from explosion)
    this._screenShake = Math.min(this._screenShake + 0.3 + radius * 0.05, 1.0);
    const dirX = pos.x - this._camera.position.x;
    const dirZ = pos.z - this._camera.position.z;
    const dirLen = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
    this._screenShakeDir.set(-dirX / dirLen, -0.3);

    // Impact freeze frames (2-4 frames of slowdown for big hits)
    if (radius > 2) this._freezeFrames = Math.min(this._freezeFrames + 3, 5);

    this._explosions.push({
      mesh: group,
      time: 0,
      maxTime: 0.8,
      radius,
    });

    // Ground scorch mark (all ammo types now, with different colors)
    const scorchColor = ammo === "fire_pot" ? 0x221100 : ammo === "holy_water" ? 0x112233 : 0x222211;
    const scorchGeo = new THREE.CircleGeometry(radius * 0.7, 12);
    const scorchMat = new THREE.MeshBasicMaterial({ color: scorchColor, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
    const scorch = new THREE.Mesh(scorchGeo, scorchMat);
    scorch.rotation.x = -Math.PI / 2;
    scorch.position.set(pos.x, 0.03, pos.z);
    this._scene.add(scorch);
    setTimeout(() => {
      if (!this._destroyed) this._scene.remove(scorch);
      scorchGeo.dispose();
      scorchMat.dispose();
    }, 45000);

    // Impact crater (darker, slightly raised rim)
    if (radius > 2) {
      const craterGeo = new THREE.RingGeometry(radius * 0.3, radius * 0.6, 10);
      const craterMat = new THREE.MeshBasicMaterial({ color: 0x333322, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
      const crater = new THREE.Mesh(craterGeo, craterMat);
      crater.rotation.x = -Math.PI / 2;
      crater.position.set(pos.x, 0.04, pos.z);
      this._scene.add(crater);
      setTimeout(() => {
        if (!this._destroyed) this._scene.remove(crater);
        craterGeo.dispose();
        craterMat.dispose();
      }, 60000);
    }

    // Moat splash if impact is near moat (z near WALL_Z + 4)
    if (Math.abs(pos.z - (WALL_Z + 4)) < 8) {
      for (let sp = 0; sp < 5; sp++) {
        const splashMat = new THREE.MeshBasicMaterial({ color: 0x44aacc, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
        const splash = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), splashMat);
        splash.position.set(
          pos.x + (Math.random() - 0.5) * 3,
          0.1,
          WALL_Z + 4 + (Math.random() - 0.5) * 2,
        );
        const splVy = 3 + Math.random() * 4;
        this._addParticle(splash, 0.7, (el) => {
          splash.position.y = 0.1 + splVy * el - 18 * el * el * 0.5;
          splashMat.opacity = 0.6 * (1 - el / 0.7);
          splash.lookAt(this._camera.position);
        });
      }
      // Ripple ring on moat surface
      const rippleMat = new THREE.MeshBasicMaterial({ color: 0xaaddee, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
      const ripple = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.4, 16), rippleMat);
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.set(pos.x, 0.02, WALL_Z + 4);
      this._addParticle(ripple, 1.2, (el) => {
        ripple.scale.setScalar(1 + el * 6);
        rippleMat.opacity = 0.3 * (1 - el / 1.2);
      });
    }

    // Nearby trees/banners react to shockwave
    for (const banner of this._banners) {
      const bd = Math.sqrt(Math.pow(banner.position.x - pos.x, 2) + Math.pow(banner.position.z - pos.z, 2));
      if (bd < 20) {
        banner.rotation.y += (pos.x > banner.position.x ? -1 : 1) * 0.3 * (1 - bd / 20);
      }
    }
    for (const tuft of this._grassTufts) {
      const td = Math.sqrt(Math.pow(tuft.position.x - pos.x, 2) + Math.pow(tuft.position.z - pos.z, 2));
      if (td < 10) {
        const pushDir = tuft.position.x > pos.x ? 1 : -1;
        tuft.rotation.z += pushDir * 0.2 * (1 - td / 10);
      }
    }
  }

  // ── Update ───────────────────────────────────────────────────────────────

  private _update(): void {
    this._renderHUD();

    if (this._phase === "title" || this._phase === "between_waves" || this._phase === "shop" || this._phase === "defeat" || this._phase === "paused" || this._phase === "victory") {
      // Gentle camera sway on non-gameplay screens
      this._camera.position.set(
        Math.sin(this._time * 0.2) * 4,
        WALL_HEIGHT + 10 + Math.sin(this._time * 0.15) * 2,
        -12 + Math.sin(this._time * 0.1) * 3,
      );
      this._camera.lookAt(0, 4, FIELD_LENGTH * 0.3);

      // Still animate ambient elements
      for (const torch of this._torches) {
        const flicker = 1.2 + Math.sin(this._time * 12 + torch.mesh.position.x * 3) * 0.4;
        torch.light.intensity = flicker;
        torch.mesh.scale.setScalar(0.8 + Math.sin(this._time * 15 + torch.mesh.position.x) * 0.2);
      }
      for (const cloud of this._clouds) {
        cloud.position.x += this._dt * 1.5;
        if (cloud.position.x > 120) cloud.position.x = -120;
      }
      for (const banner of this._banners) {
        banner.rotation.y = Math.sin(this._time * 2.5 + banner.position.x * 0.5) * 0.15;
      }
      for (const tuft of this._grassTufts) {
        tuft.rotation.z = Math.sin(this._time * 2 + tuft.position.x * 0.3) * 0.1;
      }
      return;
    }

    if (this._phase === "playing" || this._phase === "boss") {
      // Impact freeze frames — skip entire simulation for dramatic pause
      if (this._freezeFrames > 0) {
        this._freezeFrames--;
        return; // don't update OR render new state
      }
      this._updateGameplay();
    }
  }

  private _updateGameplay(): void {
    const dt = this._dt;
    this._particlesThisFrame = 0; // reset particle budget

    // Charge power
    if (this._charging) {
      this._power = Math.min(this._power + POWER_CHARGE_SPEED * dt, this._getMaxPower());
      // Zoom in during charge for focus
      const chargeRatio = (this._power - MIN_POWER) / (this._getMaxPower() - MIN_POWER);
      this._cameraZoomOffset = chargeRatio * 3; // zoom closer
      // Loaded ammo glows brighter with charge
      if (this._loadedAmmoMesh && this._loadedAmmoMesh.material instanceof THREE.MeshStandardMaterial) {
        this._loadedAmmoMesh.material.emissiveIntensity = 0.6 + chargeRatio * 2;
      }
    }

    // Reload
    if (this._reloadTimer > 0) {
      this._reloadTimer -= dt;
    }

    // Aim
    this._updateAim();
    this._aimLine.visible = this._phase === "playing" || this._phase === "boss";

    // Spawn enemies
    this._updateSpawning(dt);

    // Update projectiles
    this._updateProjectiles(dt);

    // Update enemies
    this._updateEnemies(dt);

    // Update explosions
    this._updateExplosions(dt);

    // Update enemy projectiles
    this._updateEnemyProjectiles(dt);

    // Update combo timer
    this._updateCombo(dt);

    // Ability cooldowns
    if (this._oilCooldown > 0) this._oilCooldown -= dt;
    if (this._volleyCooldown > 0) this._volleyCooldown -= dt;
    if (this._repairCooldown > 0) this._repairCooldown -= dt;

    // Last Stand check
    this._checkLastStand();

    // Cleanup floating text elements
    this._cleanupFloatingTexts();

    // Update centralized particle system
    this._updateParticles(dt);

    // Enemy war cry — periodic when many enemies are alive
    const aliveEnemies = this._enemies.filter((e) => !e.dead);
    if (aliveEnemies.length > 5 && Math.random() < 0.003) {
      this._playSound("boss_roar"); // reuse roar as war cry at lower intensity
    }

    // Enemy catapult fire logic
    for (const enemy of this._enemies) {
      if (enemy.dead || enemy.type !== "catapult") continue;
      if (enemy.z < FIELD_LENGTH * 0.8 && enemy.z > 20) { // in range
        enemy.attackTimer = (enemy.attackTimer || 0) + dt;
        if (enemy.attackTimer > 4 + Math.random() * 2) { // fire every ~4-6 seconds
          enemy.attackTimer = 0;
          this._enemyCatapultFire(enemy);
        }
      }
    }

    // ── Arm swing animation ──
    if (this._armSwingTimer >= 0) {
      this._armSwingTimer += dt;
      const swingDur = 0.4;
      if (this._armSwingTimer < swingDur) {
        const t = this._armSwingTimer / swingDur;
        // Arm swings forward dramatically
        this._trebuchetArm.rotation.x = -this._aimAngleV * 0.5 - Math.sin(t * Math.PI) * 1.2;
      } else {
        // Return to idle
        this._armSwingTimer = -1;
        this._trebuchetArm.rotation.x = -this._aimAngleV * 0.5;
        // Show loaded ammo again after reload finishes
        if (this._loadedAmmoMesh) this._loadedAmmoMesh.visible = true;
        this._updateLoadedAmmo();
      }
    }

    // ── Screen shake decay ──
    this._screenShake *= Math.max(0, 1 - dt * 8);
    if (this._screenShake < 0.01) this._screenShake = 0;
    // Decay directional bias toward zero
    this._screenShakeDir.x *= Math.max(0, 1 - dt * 5);
    this._screenShakeDir.y *= Math.max(0, 1 - dt * 5);

    // ── Camera follow timer ──
    if (this._cameraFollowTimer > 0) this._cameraFollowTimer -= dt;

    // ── Zoom decay ──
    if (!this._charging) {
      this._cameraZoomOffset *= Math.max(0, 1 - dt * 4);
    }

    // ── Camera with directional shake + zoom + follow ──
    const shakeX = this._screenShake * (this._screenShakeDir.x + (Math.random() - 0.5) * 0.5);
    const shakeY = this._screenShake * (this._screenShakeDir.y + (Math.random() - 0.5) * 0.3);

    // Base camera position
    let camX = Math.sin(this._aimAngleH) * -5;
    let camY = WALL_HEIGHT + 8 + Math.sin(this._time * 0.5) * 0.3;
    let camZ = -10 + this._cameraZoomOffset; // zoom toward field when charging
    let lookX = Math.sin(this._aimAngleH) * 15;
    let lookY = 2;
    let lookZ = FIELD_LENGTH * 0.35;

    // Brief projectile follow after firing
    if (this._cameraFollowTimer > 0 && this._cameraFollowProjectile?.alive) {
      const followT = Math.min(1, this._cameraFollowTimer / 0.4) * 0.3; // blend factor
      const pp = this._cameraFollowProjectile.mesh.position;
      lookX += (pp.x - lookX) * followT;
      lookY += (pp.y - lookY) * followT * 0.5;
      lookZ += (pp.z - lookZ) * followT * 0.3;
    }

    // Multi-kill camera pull-back (combo > 5)
    if (this._comboCount > 5) {
      camZ -= Math.min((this._comboCount - 5) * 0.5, 4);
      camY += Math.min((this._comboCount - 5) * 0.3, 2);
    }

    this._camera.position.set(camX + shakeX, camY + shakeY, camZ);
    this._camera.lookAt(lookX, lookY, lookZ);

    // ── Sun position (slow day cycle) ──
    const dayPhase = this._time * 0.015;
    this._sunLight.position.set(
      20 * Math.cos(dayPhase),
      35 + 10 * Math.sin(dayPhase),
      30,
    );
    // Warm up color toward sunset
    const sunWarmth = Math.max(0, Math.sin(dayPhase * 0.5));
    this._sunLight.color.setHex(sunWarmth > 0.5 ? 0xffcc88 : 0xffeedd);

    // ── Dynamic atmosphere ──
    if (this._skyMat) {
      const gateRatio2 = this._gateHp / this._gateMaxHp;
      const isBossPhase = this._phase === "boss";

      // Sky darkens during boss fights
      const topR = isBossPhase ? 0.15 : 0.2;
      const topG = isBossPhase ? 0.15 : 0.4;
      const topB = isBossPhase ? 0.25 : 0.67;
      // Sky turns red/orange when gate is critical
      const dangerBlend = Math.max(0, 1 - gateRatio2 * 2); // 0 at >50% HP, 1 at 0%
      this._skyMat.uniforms.topColor.value.setRGB(
        topR + dangerBlend * 0.3,
        topG - dangerBlend * 0.2,
        topB - dangerBlend * 0.3,
      );
      this._skyMat.uniforms.bottomColor.value.setRGB(
        0.8 + dangerBlend * 0.15,
        0.73 - dangerBlend * 0.3,
        0.6 - dangerBlend * 0.3,
      );

      // Fog thickens during boss fights and late waves
      if (this._sceneFog) {
        const fogBase = isBossPhase ? 60 : 80;
        const fogFar = isBossPhase ? FIELD_LENGTH + 20 : FIELD_LENGTH + 40;
        this._sceneFog.near = fogBase - this._wave * 0.5;
        this._sceneFog.far = fogFar;
        // Fog color matches sky mood
        this._sceneFog.color.setRGB(
          0.6 + dangerBlend * 0.15,
          0.67 - dangerBlend * 0.2,
          0.73 - dangerBlend * 0.2,
        );
      }
    }

    // ── Trebuchet recoil animation ──
    if (this._trebuchetRecoil > 0) {
      this._trebuchetRecoil -= dt;
      const recoilT = Math.max(0, this._trebuchetRecoil) / 0.5;
      // Rock backward, then settle via damped spring
      const rockAngle = Math.sin(recoilT * Math.PI * 2) * recoilT * 0.08;
      this._trebuchetGroup.rotation.x = rockAngle;
      this._trebuchetGroup.position.z = WALL_Z - 2 - recoilT * 0.3;
    } else {
      this._trebuchetGroup.rotation.x = 0;
      this._trebuchetGroup.position.z = WALL_Z - 2;
    }

    // ── Charge buildup particles ──
    if (this._charging && this._loadedAmmoMesh) {
      // Swirl energy particles around the loaded ammo
      if (!this._chargeParticles) {
        const cpGeo = new THREE.BufferGeometry();
        const cpPos = new Float32Array(12 * 3);
        cpGeo.setAttribute("position", new THREE.BufferAttribute(cpPos, 3));
        const cpMat = new THREE.PointsMaterial({
          color: AMMO_DEFS[this._currentAmmo].color,
          size: 0.15,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
        });
        this._chargeParticles = new THREE.Points(cpGeo, cpMat);
        this._trebuchetGroup.add(this._chargeParticles);
      }
      // Animate charge particles in orbit
      const chargeRatio2 = (this._power - MIN_POWER) / (this._getMaxPower() - MIN_POWER);
      const cpAttr = this._chargeParticles.geometry.attributes.position as THREE.BufferAttribute;
      const cpArr = cpAttr.array as Float32Array;
      const orbitR = 0.5 + chargeRatio2 * 0.3;
      const orbitSpeed = 4 + chargeRatio2 * 8;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + this._time * orbitSpeed;
        const yOff = Math.sin(this._time * 6 + i) * 0.2;
        cpArr[i * 3] = Math.cos(angle) * orbitR;
        cpArr[i * 3 + 1] = 3.4 + yOff;
        cpArr[i * 3 + 2] = 6.8 + Math.sin(angle) * orbitR;
      }
      cpAttr.needsUpdate = true;
      (this._chargeParticles.material as THREE.PointsMaterial).opacity = 0.3 + chargeRatio2 * 0.6;
      (this._chargeParticles.material as THREE.PointsMaterial).size = 0.1 + chargeRatio2 * 0.2;
      this._chargeParticles.visible = true;
    } else if (this._chargeParticles) {
      this._chargeParticles.visible = false;
    }

    // ── Trebuchet gear spin ──
    const reloadLvl = this._upgradeLevels["reload"];
    if (reloadLvl > 0) {
      const gearSpeed = 2 + reloadLvl * 3;
      for (let gi = 1; gi <= Math.min(reloadLvl, 3); gi++) {
        const gear = this._trebuchetGroup.getObjectByName(`gear${gi}`);
        if (gear) gear.rotation.x += dt * gearSpeed * (gi % 2 === 0 ? -1 : 1);
      }
    }

    // ── Torch flicker ──
    for (const torch of this._torches) {
      const flicker = 1.2 + Math.sin(this._time * 12 + torch.mesh.position.x * 3) * 0.4 + Math.random() * 0.2;
      torch.light.intensity = flicker;
      torch.mesh.scale.setScalar(0.8 + Math.sin(this._time * 15 + torch.mesh.position.x) * 0.2);
    }

    // ── Cloud drift ──
    for (const cloud of this._clouds) {
      cloud.position.x += dt * 1.5;
      if (cloud.position.x > 120) cloud.position.x = -120;
    }

    // ── Dust particles ──
    const dustAttr = this._dustParticles.geometry.attributes.position as THREE.BufferAttribute;
    const dArr = dustAttr.array as Float32Array;
    for (let i = 0; i < dArr.length / 3; i++) {
      dArr[i * 3] += this._dustVelocities[i * 3] * dt + Math.sin(this._time * 0.5 + i) * dt * 0.3;
      dArr[i * 3 + 1] += this._dustVelocities[i * 3 + 1] * dt;
      dArr[i * 3 + 2] += this._dustVelocities[i * 3 + 2] * dt;
      // Wrap around
      if (dArr[i * 3] > FIELD_WIDTH / 2) dArr[i * 3] = -FIELD_WIDTH / 2;
      if (dArr[i * 3] < -FIELD_WIDTH / 2) dArr[i * 3] = FIELD_WIDTH / 2;
      if (dArr[i * 3 + 1] > 10) dArr[i * 3 + 1] = 0.5;
      if (dArr[i * 3 + 1] < 0.3) dArr[i * 3 + 1] = 8;
      if (dArr[i * 3 + 2] > FIELD_LENGTH) dArr[i * 3 + 2] = 0;
    }
    dustAttr.needsUpdate = true;

    // ── Banner sway ──
    for (const banner of this._banners) {
      banner.rotation.y = Math.sin(this._time * 2.5 + banner.position.x * 0.5) * 0.15;
      banner.rotation.z = Math.sin(this._time * 3 + banner.position.x) * 0.05;
    }

    // ── Grass tuft sway ──
    for (const tuft of this._grassTufts) {
      tuft.rotation.z = Math.sin(this._time * 2 + tuft.position.x * 0.3 + tuft.position.z * 0.2) * 0.1;
    }

    // ── Gate crack overlay + physical crack lines ──
    const gateRatio = this._gateHp / this._gateMaxHp;
    if (this._gateCrackOverlay) {
      (this._gateCrackOverlay.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - gateRatio) * 0.5);
    }
    // Show crack lines progressively as gate takes damage
    for (let ci = 0; ci < this._gateCrackMeshes.length; ci++) {
      const crack = this._gateCrackMeshes[ci];
      const threshold = 1 - (ci + 1) * 0.15;
      if (crack.material instanceof THREE.MeshBasicMaterial) {
        crack.material.opacity = gateRatio < threshold ? Math.min(0.8, (threshold - gateRatio) * 4) : 0;
      }
    }

    // ── Moat water shimmer ──
    if (this._moatMesh) {
      (this._moatMesh.material as THREE.MeshStandardMaterial).color.setHSL(
        0.55 + Math.sin(this._time * 0.5) * 0.02,
        0.4,
        0.2 + Math.sin(this._time * 1.5) * 0.03,
      );
    }

    // ── Crosshair rotation ──
    if (this._crosshair.visible) {
      this._crosshair.rotation.y = this._time * 0.8;
    }

    // Check wave complete
    if (this._phase === "playing") {
      const allSpawned = this._spawnCounts.every((c, i) => c >= this._waveSpawns[i].count);
      const allDead = this._enemies.every((e) => e.dead);
      if (allSpawned && allDead) {
        this._phase = "between_waves";
      }
    }

    if (this._phase === "boss") {
      const bossAlive = this._enemies.some((e) => e.isBoss && !e.dead);
      if (!bossAlive) {
        const allDead = this._enemies.every((e) => e.dead);
        if (allDead) {
          this._gold += 50; // Bonus boss gold
          // Victory at wave 25!
          if (this._wave >= 25) {
            this._phase = "victory";
            this._saveHighscore();
            this._stopMusic();
          } else {
            this._phase = "between_waves";
          }
        }
      }
    }

    // Check defeat — gate destruction cinematic
    if (this._gateHp <= 0) {
      this._phase = "defeat";
      this._gateHp = 0;
      this._saveHighscore();
      this._stopMusic();

      // Gate collapse: massive explosion + debris burst
      this._screenShake = 1.0;
      this._freezeFrames = 5;
      this._spawnExplosion(new THREE.Vector3(0, WALL_HEIGHT / 2, WALL_Z), 6, "fire_pot");

      // Scatter gate debris
      const gateMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
      for (let gc = 0; gc < 20; gc++) {
        const cs = 0.2 + Math.random() * 0.5;
        const chunk = new THREE.Mesh(
          new THREE.BoxGeometry(cs, cs, cs * 0.4),
          gateMat.clone(),
        );
        chunk.position.set(
          (Math.random() - 0.5) * GATE_WIDTH,
          WALL_HEIGHT * Math.random(),
          WALL_Z,
        );
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          3 + Math.random() * 6,
          -3 - Math.random() * 5,
        );
        chunk.castShadow = true;
        this._addParticle(chunk, 3.0, (_el, pdt) => {
          vel.y += GRAVITY * pdt;
          chunk.position.add(vel.clone().multiplyScalar(pdt));
          chunk.rotation.x += 0.12;
          chunk.rotation.z += 0.08;
          if (chunk.position.y < 0.05) {
            chunk.position.y = 0.05;
            vel.y *= -0.2;
            vel.x *= 0.6;
            vel.z *= 0.6;
          }
        });
      }

      // Iron band fragments
      const ironMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6 });
      for (let ib = 0; ib < 6; ib++) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(1 + Math.random(), 0.15, 0.15), ironMat.clone());
        band.position.set((Math.random() - 0.5) * 4, 1 + Math.random() * 5, WALL_Z);
        const bVel = new THREE.Vector3((Math.random() - 0.5) * 6, 4 + Math.random() * 4, -2 - Math.random() * 4);
        this._addParticle(band, 3.0, (_el, pdt) => {
          bVel.y += GRAVITY * pdt;
          band.position.add(bVel.clone().multiplyScalar(pdt));
          band.rotation.x += 0.15;
          band.rotation.y += 0.1;
          if (band.position.y < 0.05) { band.position.y = 0.05; bVel.y = 0; }
        });
      }

      // Hide the gate mesh (it's destroyed)
      this._gateMesh.visible = false;

      // Secondary delayed explosions along the gate
      for (let se = 0; se < 3; se++) {
        setTimeout(() => {
          if (this._destroyed) return;
          this._spawnExplosion(
            new THREE.Vector3((Math.random() - 0.5) * GATE_WIDTH, WALL_HEIGHT * Math.random(), WALL_Z),
            2 + Math.random() * 2,
            "boulder",
          );
          this._playSound("impact");
        }, 200 + se * 300);
      }

      // Screen red flash
      const flash = document.createElement("div");
      flash.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(200,0,0,0.4);z-index:10003;pointer-events:none;transition:opacity 1s;";
      document.body.appendChild(flash);
      setTimeout(() => { flash.style.opacity = "0"; }, 100);
      setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash); }, 1200);
    }

    // Update gate visual
    const gateHpRatio = this._gateHp / this._gateMaxHp;
    (this._gateMesh.material as THREE.MeshStandardMaterial).color.setHex(
      gateHpRatio > 0.5 ? 0x664422 : gateHpRatio > 0.25 ? 0x885522 : 0xaa3311,
    );
  }

  private _updateSpawning(dt: number): void {
    for (let i = 0; i < this._waveSpawns.length; i++) {
      const spawn = this._waveSpawns[i];
      if (this._spawnCounts[i] >= spawn.count) continue;

      this._spawnTimers[i] -= dt;
      if (this._spawnTimers[i] <= 0) {
        this._spawnTimers[i] = spawn.delay;
        this._spawnCounts[i]++;

        // Randomize x position within lane spread
        const x = (Math.random() - 0.5) * FIELD_WIDTH * spawn.laneSpread;
        this._spawnEnemy(spawn.type, x);
      }
    }
  }

  private _updateProjectiles(dt: number): void {
    for (const proj of this._projectiles) {
      if (!proj.alive) continue;

      proj.time += dt;
      proj.velocity.y += GRAVITY * dt;
      proj.mesh.position.add(proj.velocity.clone().multiplyScalar(dt));

      // Rotate projectile
      proj.mesh.rotation.x += dt * 5;
      proj.mesh.rotation.z += dt * 3;

      // Fire pot: spawn flame sprites along path (capped)
      if (proj.ammo === "fire_pot" && Math.random() < 0.6 && this._particlesThisFrame < 20) {
        this._particlesThisFrame++;
        const flameMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xff6600 : 0xffaa00, transparent: true, opacity: 0.7, depthWrite: false });
        const flameSize = 0.15 + Math.random() * 0.15;
        const flame = new THREE.Mesh(new THREE.PlaneGeometry(flameSize, flameSize), flameMat);
        flame.position.copy(proj.mesh.position);
        flame.position.x += (Math.random() - 0.5) * 0.3;
        flame.position.y += (Math.random() - 0.5) * 0.3;
        flame.lookAt(this._camera.position);
        this._scene.add(flame);
        const fStart = this._time;
        const animFlame = () => {
          if (this._destroyed) return;
          const el = this._time - fStart;
          if (el > 0.35) { this._scene.remove(flame); flame.geometry.dispose(); flameMat.dispose(); return; }
          flame.position.y += 0.02;
          flameMat.opacity = 0.7 * (1 - el / 0.35);
          flame.scale.setScalar(1 + el * 2);
          requestAnimationFrame(animFlame);
        };
        requestAnimationFrame(animFlame);
      }

      // Holy water: spawn shimmer sparkles (capped)
      if (proj.ammo === "holy_water" && Math.random() < 0.4 && this._particlesThisFrame < 20) {
        this._particlesThisFrame++;
        const sparkMat = new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.6, depthWrite: false });
        const spark = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), sparkMat);
        spark.position.copy(proj.mesh.position);
        spark.position.add(new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4));
        spark.lookAt(this._camera.position);
        this._scene.add(spark);
        const sStart = this._time;
        const animSpark = () => {
          if (this._destroyed) return;
          const el = this._time - sStart;
          if (el > 0.3) { this._scene.remove(spark); spark.geometry.dispose(); sparkMat.dispose(); return; }
          sparkMat.opacity = 0.6 * (1 - el / 0.3);
          requestAnimationFrame(animSpark);
        };
        requestAnimationFrame(animSpark);
      }

      // Update trail
      proj.trailPositions.push(proj.mesh.position.clone());
      if (proj.trailPositions.length > 40) proj.trailPositions.shift();
      const trailAttr = proj.trail.geometry.attributes.position as THREE.BufferAttribute;
      const trailArr = trailAttr.array as Float32Array;
      for (let i = 0; i < 40; i++) {
        const tp = proj.trailPositions[i];
        if (tp) {
          trailArr[i * 3] = tp.x;
          trailArr[i * 3 + 1] = tp.y;
          trailArr[i * 3 + 2] = tp.z;
        }
      }
      trailAttr.needsUpdate = true;
      proj.trail.geometry.setDrawRange(0, proj.trailPositions.length);

      // Check ground impact
      if (proj.mesh.position.y <= 0) {
        this._onProjectileImpact(proj);
        continue;
      }

      // Check out of bounds
      if (proj.mesh.position.z > FIELD_LENGTH + 20 || proj.mesh.position.z < -20 ||
          Math.abs(proj.mesh.position.x) > FIELD_WIDTH) {
        proj.alive = false;
        this._scene.remove(proj.mesh);
        this._scene.remove(proj.trail);
      }

      // Direct hit check on enemies
      for (const enemy of this._enemies) {
        if (enemy.dead) continue;
        const eDef = enemy.isBoss && enemy.bossDef
          ? enemy.bossDef
          : ENEMY_DEFS[enemy.type];
        const dx = proj.mesh.position.x - enemy.x;
        const dz = proj.mesh.position.z - enemy.z;
        const dy = proj.mesh.position.y - eDef.height / 2;
        if (Math.abs(dx) < eDef.width / 2 + 0.5 &&
            Math.abs(dz) < eDef.depth / 2 + 0.5 &&
            Math.abs(dy) < eDef.height / 2 + 0.5) {
          proj.directHit = true;
          this._onProjectileImpact(proj);
          break;
        }
      }
    }

    // Clean up dead projectiles
    this._projectiles = this._projectiles.filter((p) => p.alive);
  }

  private _onProjectileImpact(proj: Projectile): void {
    proj.alive = false;
    const impactPos = proj.mesh.position.clone();
    impactPos.y = Math.max(0, impactPos.y);

    const ammoDef = AMMO_DEFS[proj.ammo];
    const splashRadius = ammoDef.splash + this._upgradeLevels["splash"] * 1.5;
    const directHitMult = proj.directHit ? 1.5 : 1.0;

    // Direct hit feedback
    if (proj.directHit) {
      this._spawnFloatingText(impactPos.x, impactPos.z, 0, "#ffffff");
      const lastFt = this._floatingTexts[this._floatingTexts.length - 1];
      if (lastFt) {
        lastFt.el.textContent = "DIRECT HIT! +3g";
        lastFt.el.style.fontSize = "22px";
      }
      this._gold += 3;

      // Brief golden screen flash
      const dhFlash = document.createElement("div");
      dhFlash.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,220,100,0.15);z-index:10003;pointer-events:none;transition:opacity 0.3s;";
      document.body.appendChild(dhFlash);
      requestAnimationFrame(() => { dhFlash.style.opacity = "0"; });
      setTimeout(() => { if (dhFlash.parentNode) dhFlash.parentNode.removeChild(dhFlash); }, 350);

      // Extra freeze frame for direct hits
      this._freezeFrames = Math.max(this._freezeFrames, 2);
    }

    // Spawn explosion
    this._spawnExplosion(impactPos, splashRadius, proj.ammo);

    // Ammo-specific impact particles
    if (proj.ammo === "fire_pot" && this._particlesThisFrame < 20) {
      // Rising ember column
      for (let fe = 0; fe < 8; fe++) {
        this._particlesThisFrame++;
        const eMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xff4400 : 0xffaa00, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide });
        const ember = new THREE.Mesh(new THREE.PlaneGeometry(0.12 + Math.random() * 0.1, 0.12 + Math.random() * 0.1), eMat);
        ember.position.copy(impactPos);
        ember.position.x += (Math.random() - 0.5) * splashRadius * 0.5;
        ember.position.z += (Math.random() - 0.5) * splashRadius * 0.5;
        const riseSpeed = 2 + Math.random() * 4;
        this._addParticle(ember, 1.0, (el) => {
          ember.position.y += riseSpeed * 0.016;
          ember.position.x += Math.sin(el * 8 + fe) * 0.02;
          ember.lookAt(this._camera.position);
          eMat.opacity = 0.7 * (1 - el / 1.0);
        });
      }
    }
    if (proj.ammo === "holy_water" && this._particlesThisFrame < 20) {
      // Ice crystal cone burst
      for (let ic = 0; ic < 6; ic++) {
        this._particlesThisFrame++;
        const iMat = new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.6, depthWrite: false });
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.1 + Math.random() * 0.08, 0), iMat);
        crystal.position.copy(impactPos);
        const angle = (ic / 6) * Math.PI * 2;
        const outSpeed = 3 + Math.random() * 2;
        const vx2 = Math.cos(angle) * outSpeed;
        const vz2 = Math.sin(angle) * outSpeed;
        this._addParticle(crystal, 0.8, (el, pdt) => {
          crystal.position.x += vx2 * pdt;
          crystal.position.z += vz2 * pdt;
          crystal.position.y = impactPos.y + 1.5 * el - 4 * el * el;
          crystal.rotation.y += 0.1;
          iMat.opacity = 0.6 * (1 - el / 0.8);
        });
      }
      // Slowing mist cloud
      const mistMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
      const mist = new THREE.Mesh(new THREE.SphereGeometry(splashRadius * 0.6, 16, 12), mistMat);
      mist.position.copy(impactPos);
      mist.position.y = 0.5;
      this._addParticle(mist, 2.0, (el) => {
        mist.scale.setScalar(1 + el * 0.5);
        mistMat.opacity = 0.2 * (1 - el / 2.0);
      });
    }
    if (proj.ammo === "chain_shot" && this._particlesThisFrame < 20) {
      // Metal sparks burst
      for (let ms = 0; ms < 10; ms++) {
        this._particlesThisFrame++;
        const sMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xffdd88 : 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
        const spark = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.15), sMat);
        spark.position.copy(impactPos);
        const sAngle = Math.random() * Math.PI * 2;
        const sSpeed = 5 + Math.random() * 8;
        const sVy = 2 + Math.random() * 4;
        this._addParticle(spark, 0.5, (el, pdt) => {
          spark.position.x += Math.cos(sAngle) * sSpeed * pdt;
          spark.position.z += Math.sin(sAngle) * sSpeed * pdt;
          spark.position.y += (sVy - 20 * el) * pdt;
          spark.lookAt(this._camera.position);
          sMat.opacity = 0.9 * (1 - el / 0.5);
        });
      }
    }

    // Damage enemies in splash radius
    for (const enemy of this._enemies) {
      if (enemy.dead) continue;
      const dx = impactPos.x - enemy.x;
      const dz = impactPos.z - enemy.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < splashRadius) {
        const falloff = 1 - (dist / splashRadius) * 0.5; // 50-100% damage within radius
        let damage = ammoDef.damage * falloff * directHitMult;

        // Combo damage bonus (up to +30% at high combo)
        if (this._comboMultiplier > 1) {
          damage *= 1 + (this._comboMultiplier - 1) * 0.3;
        }

        // Devastation synergy: +25% base damage when splash is large
        if (this._cachedSynergies.includes("devastation")) {
          damage *= 1.25;
        }

        // Last Stand: +40% damage when gate is critical
        if (this._lastStandActive) {
          damage *= 1.4;
        }

        // Boss shield reduces damage
        if (enemy.isBoss && enemy.bossShieldActive) {
          damage *= 0.5;
        }

        // Boss armor reduces damage
        if (enemy.isBoss && enemy.bossDef?.ability === "armor") {
          damage *= 0.6;
        }

        // Elemental weakness bonus (rock-paper-scissors)
        const weakness = WEAKNESS_TABLE[proj.ammo]?.[enemy.type];
        if (weakness) damage *= weakness;

        // Shielded modifier: first hit reduced 50%
        if (enemy.firstHitShield) {
          damage *= 0.5;
          enemy.firstHitShield = false;
        }

        this._damageEnemy(enemy, damage);

        // Apply special effects
        if (ammoDef.special === "burn") {
          enemy.burning = Math.max(enemy.burning, 3.0);
        }
        if (ammoDef.special === "slow") {
          enemy.slowed = Math.max(enemy.slowed, 4.0);
        }
      }
    }

    this._scene.remove(proj.mesh);
    this._scene.remove(proj.trail);
    proj.mesh.geometry.dispose();
    (proj.mesh.material as THREE.Material).dispose();
    proj.trail.geometry.dispose();
    (proj.trail.material as THREE.Material).dispose();

    this._playSound("impact");
  }

  private _damageEnemy(enemy: EnemyState, damage: number): void {
    enemy.hp -= damage;
    enemy.hitFlash = 0.15;
    this._totalDamageDealt += damage;

    // Floating damage number
    if (damage > 0) {
      const color = damage >= 40 ? "#ff4444" : damage >= 20 ? "#ffaa44" : "#ffff66";
      this._spawnFloatingText(enemy.x, enemy.z, damage, color);
      this._totalHits++;
    }

    // Boss phase transition check
    this._checkBossPhaseTransition(enemy);

    if (enemy.hp <= 0) {
      enemy.dead = true;
      this._waveEnemiesKilled++;
      this._totalKills++;

      const def = enemy.isBoss && enemy.bossDef ? enemy.bossDef : ENEMY_DEFS[enemy.type];
      const comboBonus = Math.floor(def.points * (this._comboMultiplier - 1));
      this._score += def.points + comboBonus;
      const goldEarned = Math.floor((def.points + comboBonus) / 10) * enemy.goldMult;
      this._gold += goldEarned;
      this._registerKill();

      // Show gold earned on kill
      if (goldEarned > 0) {
        this._spawnFloatingText(enemy.x + 0.5, enemy.z, -goldEarned, "#ffd700");
        const gft = this._floatingTexts[this._floatingTexts.length - 1];
        if (gft) { gft.el.textContent = `+${goldEarned}g`; gft.el.style.fontSize = "13px"; }
      }

      // Death explosion
      this._spawnExplosion(
        new THREE.Vector3(enemy.x, def.height / 2, enemy.z),
        enemy.isBoss ? 3.0 : 1.5,
        "boulder",
      );

      // Scatter body fragments
      const fragCount = enemy.isBoss ? 12 : 5;
      const fragMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.8 });
      const metalFragMat = new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.5, roughness: 0.4 });
      for (let f = 0; f < fragCount; f++) {
        const fs = 0.1 + Math.random() * (enemy.isBoss ? 0.5 : 0.25);
        const frag = new THREE.Mesh(
          f % 3 === 0 ? new THREE.BoxGeometry(fs, fs, fs) : new THREE.DodecahedronGeometry(fs * 0.6, 0),
          f % 2 === 0 ? fragMat : metalFragMat,
        );
        frag.position.set(
          enemy.x + (Math.random() - 0.5) * def.width,
          def.height * 0.3 + Math.random() * def.height * 0.4,
          enemy.z + (Math.random() - 0.5) * (enemy.isBoss ? def.depth : 1),
        );
        frag.castShadow = true;
        this._scene.add(frag);
        // Animate fragments flying out then falling
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          4 + Math.random() * 8,
          (Math.random() - 0.5) * 10,
        );
        const startTime = this._time;
        const animFrag = () => {
          if (this._destroyed) return;
          const elapsed = this._time - startTime;
          if (elapsed > 2.5) {
            this._scene.remove(frag);
            frag.geometry.dispose();
            (frag.material as THREE.Material).dispose();
            return;
          }
          vel.y += GRAVITY * 0.016;
          frag.position.add(vel.clone().multiplyScalar(0.016));
          frag.rotation.x += 0.15;
          frag.rotation.z += 0.1;
          if (frag.position.y < 0.05) {
            frag.position.y = 0.05;
            vel.y *= -0.3;
            vel.x *= 0.7;
            vel.z *= 0.7;
          }
          // Fade out near end
          if (elapsed > 1.8 && frag.material instanceof THREE.MeshStandardMaterial) {
            frag.material.transparent = true;
            frag.material.opacity = Math.max(0, 1 - (elapsed - 1.8) / 0.7);
          }
          requestAnimationFrame(animFrag);
        };
        requestAnimationFrame(animFrag);
      }

      // Boss death: spectacular cinematic
      if (enemy.isBoss) {
        this._screenShake = 1.0;
        this._freezeFrames = 8; // longer freeze for boss kills

        // Screen white flash overlay
        const flash = document.createElement("div");
        flash.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:white;opacity:0.6;z-index:10003;pointer-events:none;transition:opacity 0.5s ease-out;";
        document.body.appendChild(flash);
        requestAnimationFrame(() => { flash.style.opacity = "0"; });
        setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash); }, 600);

        // Boss death text
        const deathText = document.createElement("div");
        deathText.style.cssText = "position:fixed;top:35%;left:50%;transform:translate(-50%,-50%) scale(0.3);font-size:42px;font-weight:900;color:#ffd700;text-shadow:0 0 20px rgba(255,200,0,0.6),3px 3px 8px #000;z-index:10003;pointer-events:none;transition:transform 0.5s cubic-bezier(0.2,1.5,0.4,1),opacity 0.8s;";
        deathText.textContent = `${enemy.bossDef?.name || "BOSS"} DEFEATED!`;
        document.body.appendChild(deathText);
        requestAnimationFrame(() => { deathText.style.transform = "translate(-50%,-50%) scale(1)"; });
        setTimeout(() => { deathText.style.opacity = "0"; }, 2000);
        setTimeout(() => { if (deathText.parentNode) deathText.parentNode.removeChild(deathText); }, 2800);

        // Extra large explosion
        const bDef = enemy.bossDef!;
        this._spawnExplosion(new THREE.Vector3(enemy.x, bDef.height * 0.7, enemy.z), bDef.width * 0.8, "fire_pot");
        // Secondary delayed explosions
        for (let se = 0; se < 3; se++) {
          setTimeout(() => {
            if (this._destroyed) return;
            this._spawnExplosion(
              new THREE.Vector3(enemy.x + (Math.random() - 0.5) * bDef.width, bDef.height * Math.random(), enemy.z + (Math.random() - 0.5) * bDef.depth),
              2 + Math.random() * 2,
              "boulder",
            );
          }, 100 + se * 200);
        }

        // Gold burst particles
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xffaa00, emissiveIntensity: 1.5 });
        for (let g = 0; g < 12; g++) {
          const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 12), goldMat.clone());
          coin.position.set(enemy.x + (Math.random() - 0.5) * 3, 2, enemy.z + (Math.random() - 0.5) * 3);
          const gVel = new THREE.Vector3((Math.random() - 0.5) * 8, 5 + Math.random() * 7, (Math.random() - 0.5) * 8);
          this._addParticle(coin, 2.5, (_el, pdt) => {
            gVel.y += GRAVITY * pdt;
            coin.position.add(gVel.clone().multiplyScalar(pdt));
            coin.rotation.x += 0.2;
            coin.rotation.y += 0.3;
            if (coin.position.y < 0.05) { coin.position.y = 0.05; gVel.y *= -0.3; }
          });
        }

        // Rune flare — bright glowing particles explode outward
        const runeFlareMat = new THREE.PointsMaterial({
          color: enemy.bossDef?.ability === "regen" ? 0x44ff44 : enemy.bossDef?.ability === "armor" ? 0x8888ff : 0xff4444,
          size: 0.5,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        });
        const rfCount = 30;
        const rfGeo = new THREE.BufferGeometry();
        const rfPos = new Float32Array(rfCount * 3);
        const rfVels: THREE.Vector3[] = [];
        for (let r = 0; r < rfCount; r++) {
          rfPos[r * 3] = 0;
          rfPos[r * 3 + 1] = bDef.height / 2;
          rfPos[r * 3 + 2] = 0;
          rfVels.push(new THREE.Vector3((Math.random() - 0.5) * 15, Math.random() * 10, (Math.random() - 0.5) * 15));
        }
        rfGeo.setAttribute("position", new THREE.BufferAttribute(rfPos, 3));
        const rfPoints = new THREE.Points(rfGeo, runeFlareMat);
        rfPoints.position.set(enemy.x, 0, enemy.z);
        this._addParticle(rfPoints, 1.5, (el, pdt) => {
          const attr = rfPoints.geometry.attributes.position as THREE.BufferAttribute;
          const arr = attr.array as Float32Array;
          for (let r = 0; r < rfCount; r++) {
            rfVels[r].y += GRAVITY * pdt * 0.3;
            arr[r * 3] += rfVels[r].x * pdt;
            arr[r * 3 + 1] += rfVels[r].y * pdt;
            arr[r * 3 + 2] += rfVels[r].z * pdt;
          }
          attr.needsUpdate = true;
          runeFlareMat.opacity = 0.9 * (1 - el / 1.5);
          runeFlareMat.size = 0.5 + el * 0.5;
        });
      }

      this._scene.remove(enemy.mesh);
      this._playSound("kill");
    }
  }

  private _updateEnemies(dt: number): void {
    for (const enemy of this._enemies) {
      if (enemy.dead) continue;

      // Wave modifier: cursed regen
      if (enemy.regenRate > 0 && !enemy.isBoss) {
        enemy.hp = Math.min(enemy.hp + enemy.regenRate * dt, enemy.maxHp);
      }

      // Burn damage (reduced by boss armor)
      if (enemy.burning > 0) {
        enemy.burning -= dt;
        let burnDmg = 8 * dt; // 8 DPS
        if (enemy.isBoss && enemy.bossDef?.ability === "armor") burnDmg *= 0.6;
        enemy.hp -= burnDmg;
        if (enemy.hp <= 0) {
          enemy.hp = 1; // let _damageEnemy handle the kill properly
          this._damageEnemy(enemy, 1);
          continue;
        }
      }

      // Slow effect
      if (enemy.slowed > 0) {
        enemy.slowed -= dt;
      }

      // Boss regen
      if (enemy.isBoss && enemy.bossDef?.ability === "regen") {
        enemy.bossRegenTimer = (enemy.bossRegenTimer || 0) + dt;
        if (enemy.bossRegenTimer! >= 1.0) {
          enemy.bossRegenTimer = 0;
          enemy.hp = Math.min(enemy.hp + enemy.maxHp * 0.02, enemy.maxHp);
        }
      }

      // Boss shield toggle (flickers on/off)
      if (enemy.isBoss && enemy.bossDef?.ability === "shield") {
        const shieldPhase = Math.floor(this._time / 3) % 2;
        enemy.bossShieldActive = shieldPhase === 0;
        const shieldMesh = enemy.mesh.getObjectByName("bossShield");
        if (shieldMesh) {
          shieldMesh.visible = enemy.bossShieldActive!;
          if (enemy.bossShieldActive) shieldMesh.rotation.y = this._time * 0.5;
        }
        const hexMesh = enemy.mesh.getObjectByName("bossShieldHex");
        if (hexMesh) {
          hexMesh.visible = enemy.bossShieldActive!;
          if (enemy.bossShieldActive) hexMesh.rotation.y = -this._time * 0.3;
        }
      }

      // Boss aura particle orbit
      if (enemy.isBoss) {
        const aura = enemy.mesh.getObjectByName("bossAura") as THREE.Points | undefined;
        if (aura) aura.rotation.y = this._time * 1.2;

        // Cape sway
        const cape = enemy.mesh.getObjectByName("bossCape") as THREE.Mesh | undefined;
        if (cape) {
          cape.rotation.x = 0.2 + Math.sin(this._time * 2) * 0.1;
          cape.rotation.y = Math.sin(this._time * 1.5 + 1) * 0.08;
        }

        // Rune glow pulse
        enemy.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name === "bossRune" && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissiveIntensity = 1.0 + Math.sin(this._time * 4) * 0.8;
          }
        });

        // Boss regen light pulse
        const regenLight = enemy.mesh.getObjectByName("bossRegenLight") as THREE.PointLight | undefined;
        if (regenLight) {
          regenLight.intensity = 1.5 + Math.sin(this._time * 3) * 1.0;
        }

        // Boss leg animation
        const bLegL = enemy.mesh.getObjectByName("legL");
        const bLegR = enemy.mesh.getObjectByName("legR");
        const bWalkPhase = this._time * 3 + enemy.x;
        if (bLegL) bLegL.rotation.x = Math.sin(bWalkPhase) * 0.35;
        if (bLegR) bLegR.rotation.x = Math.sin(bWalkPhase + Math.PI) * 0.35;
      }

      // Movement — with path variety + AI reactions
      const spdMult = enemy.slowed > 0 ? 0.4 : 1;
      enemy.z -= enemy.speed * spdMult * dt;

      // Near-miss dodge reaction: check if any projectile is close
      let dodgeImpulse = 0;
      for (const proj of this._projectiles) {
        if (!proj.alive) continue;
        const pdx = proj.mesh.position.x - enemy.x;
        const pdz = proj.mesh.position.z - enemy.z;
        const pDist = Math.sqrt(pdx * pdx + pdz * pdz);
        if (pDist < 5 && pDist > 1 && proj.mesh.position.y < 4) {
          // Dodge away from projectile
          dodgeImpulse += (pdx > 0 ? -1 : 1) * (5 - pDist) * 0.5;
        }
      }

      // Dodge visual telegraph: flash + dust poof
      if (Math.abs(dodgeImpulse) > 1.5 && this._particlesThisFrame < 20) {
        this._particlesThisFrame++;
        // Red awareness flash
        enemy.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissive.setHex(0xff3333);
            child.material.emissiveIntensity = 0.8;
          }
        });
        setTimeout(() => {
          if (this._destroyed || enemy.dead) return;
          enemy.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
              if (enemy.hitFlash <= 0 && enemy.burning <= 0) {
                child.material.emissive.setHex(0x000000);
                child.material.emissiveIntensity = 0;
              }
            }
          });
        }, 150);
        // Dust poof in dodge direction
        const eDef = enemy.isBoss && enemy.bossDef ? enemy.bossDef : ENEMY_DEFS[enemy.type];
        const dodgeDir = dodgeImpulse > 0 ? 1 : -1;
        const poofMat = new THREE.MeshBasicMaterial({ color: 0xccbb99, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
        for (let dp = 0; dp < 3; dp++) {
          const poof = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), poofMat.clone());
          poof.position.set(enemy.x - dodgeDir * 0.3 * dp, eDef.height * 0.2, enemy.z);
          poof.lookAt(this._camera.position);
          this._addParticle(poof, 0.4, (el) => {
            poof.position.x -= dodgeDir * el * 2;
            poof.position.y += 0.02;
            poof.scale.setScalar(1 + el * 4);
            (poof.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - el / 0.4);
          });
        }
      }

      // Cavalry zigzags laterally + dodge
      if (enemy.type === "cavalry") {
        enemy.x += Math.sin(this._time * 3 + enemy.z * 0.1) * dt * 3;
        enemy.x += dodgeImpulse * dt * 4; // cavalry dodges fast
        enemy.x = Math.max(-FIELD_WIDTH / 2, Math.min(FIELD_WIDTH / 2, enemy.x));
      }
      // Footmen drift + slight dodge
      else if (enemy.type === "footman") {
        enemy.x += Math.sin(this._time * 1.5 + enemy.x * 0.5 + enemy.z * 0.2) * dt * 0.5;
        enemy.x += dodgeImpulse * dt * 1.5;
      }
      // Shieldbearers: converge to center + slow dodge
      else if (enemy.type === "shieldbearer") {
        if (enemy.z < FIELD_LENGTH * 0.5) {
          enemy.x += -enemy.x * 0.3 * dt;
        }
        enemy.x += dodgeImpulse * dt * 0.8;
      }
      // Siege towers don't dodge (too heavy) but nearby units cluster behind them
      else if (enemy.type === "siege_tower") {
        // no dodge
      }
      // Other siege: minimal dodge
      else {
        enemy.x += dodgeImpulse * dt * 0.5;
      }

      // Formation bunching: units cluster near siege towers for "cover"
      if ((enemy.type === "footman" || enemy.type === "shieldbearer" || enemy.type === "cavalry") && enemy.z < FIELD_LENGTH * 0.7) {
        for (const other of this._enemies) {
          if (other.dead || other.type !== "siege_tower") continue;
          const sdx = other.x - enemy.x;
          const sdz = other.z - enemy.z;
          const sDist = Math.sqrt(sdx * sdx + sdz * sdz);
          if (sDist < 10 && sDist > 1) {
            // Drift toward siege tower — cavalry faster, shieldbearers slower
            const driftSpeed = enemy.type === "cavalry" ? 2.5 : enemy.type === "shieldbearer" ? 0.8 : 1.5;
            enemy.x += (sdx / sDist) * dt * driftSpeed;
            break;
          }
        }
      }

      enemy.x = Math.max(-FIELD_WIDTH / 2, Math.min(FIELD_WIDTH / 2, enemy.x));
      enemy.mesh.position.z = enemy.z;
      enemy.mesh.position.x = enemy.x;

      // Hit flash
      if (enemy.hitFlash > 0) {
        enemy.hitFlash -= dt;
        enemy.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissive.setHex(enemy.hitFlash > 0 ? 0xff4444 : 0x000000);
            child.material.emissiveIntensity = enemy.hitFlash > 0 ? 1.5 : 0;
          }
        });
      }

      // Burn visual + ember particles
      if (enemy.burning > 0) {
        enemy.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissive.setHex(0xff4400);
            child.material.emissiveIntensity = 0.5 + Math.sin(this._time * 10) * 0.3;
          }
        });
        // Spawn rising ember particles
        if (Math.random() < 0.3) {
          const eDef = enemy.isBoss && enemy.bossDef ? enemy.bossDef : ENEMY_DEFS[enemy.type];
          const emberMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xff4400 : 0xffaa00, transparent: true, opacity: 0.8, depthWrite: false });
          const ember = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), emberMat);
          ember.position.set(
            enemy.x + (Math.random() - 0.5) * eDef.width,
            eDef.height * Math.random(),
            enemy.z + (Math.random() - 0.5) * 0.5,
          );
          ember.lookAt(this._camera.position);
          this._scene.add(ember);
          const eStart = this._time;
          const animEmber = () => {
            if (this._destroyed) return;
            const el = this._time - eStart;
            if (el > 0.6) { this._scene.remove(ember); ember.geometry.dispose(); emberMat.dispose(); return; }
            ember.position.y += 0.04;
            ember.position.x += (Math.random() - 0.5) * 0.01;
            emberMat.opacity = 0.8 * (1 - el / 0.6);
            requestAnimationFrame(animEmber);
          };
          requestAnimationFrame(animEmber);
        }
      }

      // Slow visual — ice crystal particles
      if (enemy.slowed > 0 && Math.random() < 0.15) {
        const eDef = enemy.isBoss && enemy.bossDef ? enemy.bossDef : ENEMY_DEFS[enemy.type];
        const iceMat = new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.6, depthWrite: false });
        const iceSize = 0.06 + Math.random() * 0.06;
        const ice = new THREE.Mesh(new THREE.OctahedronGeometry(iceSize, 0), iceMat);
        ice.position.set(
          enemy.x + (Math.random() - 0.5) * eDef.width * 0.8,
          eDef.height * 0.2 + Math.random() * eDef.height * 0.6,
          enemy.z + (Math.random() - 0.5) * 0.4,
        );
        this._scene.add(ice);
        const iStart = this._time;
        const animIce = () => {
          if (this._destroyed) return;
          const el = this._time - iStart;
          if (el > 0.8) { this._scene.remove(ice); ice.geometry.dispose(); iceMat.dispose(); return; }
          ice.rotation.y += 0.05;
          ice.position.y -= 0.01;
          iceMat.opacity = 0.6 * (1 - el / 0.8);
          requestAnimationFrame(animIce);
        };
        requestAnimationFrame(animIce);
      }

      // Cavalry dust trail
      if (enemy.type === "cavalry" && !enemy.dead && Math.random() < 0.25) {
        const dustMat = new THREE.MeshBasicMaterial({ color: 0xccbb99, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
        const dustSize = 0.2 + Math.random() * 0.3;
        const dustPuff = new THREE.Mesh(new THREE.PlaneGeometry(dustSize, dustSize), dustMat);
        dustPuff.position.set(enemy.x + (Math.random() - 0.5) * 0.5, 0.1 + Math.random() * 0.3, enemy.z + 0.5 + Math.random() * 0.5);
        dustPuff.lookAt(this._camera.position);
        this._scene.add(dustPuff);
        const dStart = this._time;
        const animDust = () => {
          if (this._destroyed) return;
          const el = this._time - dStart;
          if (el > 0.7) { this._scene.remove(dustPuff); dustPuff.geometry.dispose(); dustMat.dispose(); return; }
          dustPuff.position.y += 0.015;
          dustPuff.scale.setScalar(1 + el * 2);
          dustMat.opacity = 0.35 * (1 - el / 0.7);
          requestAnimationFrame(animDust);
        };
        requestAnimationFrame(animDust);
      }

      // Update HP bar
      if (enemy.hpBar) {
        const ratio = Math.max(0, enemy.hp / enemy.maxHp);
        enemy.hpBar.scale.x = ratio;
        enemy.hpBar.position.x = -(1 - ratio) * ((enemy.isBoss ? (enemy.bossDef!.width + 2) : (ENEMY_DEFS[enemy.type].width + 0.5)) / 2);
        // HP bar faces camera
        if (enemy.hpBar) {
          enemy.hpBar.lookAt(this._camera.position);
        }
        if (enemy.hpBarBg) {
          enemy.hpBarBg.lookAt(this._camera.position);
        }
      }

      // Walking animation — bob + leg swing
      const walkSpeed = enemy.slowed > 0 ? 3 : 6;
      const walkPhase = this._time * walkSpeed + enemy.x * 2;
      const walkBob = Math.sin(walkPhase) * 0.08;
      enemy.mesh.position.y = Math.max(0, walkBob);

      // Animate legs if humanoid
      if (enemy.type === "footman" || enemy.type === "shieldbearer" || enemy.type === "cavalry") {
        const legL = enemy.mesh.getObjectByName("legL");
        const legR = enemy.mesh.getObjectByName("legR");
        if (legL) legL.rotation.x = Math.sin(walkPhase) * 0.5;
        if (legR) legR.rotation.x = Math.sin(walkPhase + Math.PI) * 0.5;
        // Arm swing
        const armR = enemy.mesh.getObjectByName("armR");
        if (armR) armR.rotation.x = Math.sin(walkPhase + Math.PI) * 0.3;
      }

      // Slowed visual — blue tint
      if (enemy.slowed > 0 && enemy.burning <= 0) {
        enemy.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissive.setHex(0x2244aa);
            child.material.emissiveIntensity = 0.3 + Math.sin(this._time * 4) * 0.15;
          }
        });
      } else if (enemy.burning <= 0 && enemy.hitFlash <= 0) {
        // Clear emissive when no effects active
        enemy.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial && child.material.emissiveIntensity > 0) {
            child.material.emissive.setHex(0x000000);
            child.material.emissiveIntensity = 0;
          }
        });
      }

      // War flag sway on siege towers
      if (enemy.type === "siege_tower") {
        const flag = enemy.mesh.getObjectByName("warFlag");
        if (flag) {
          flag.rotation.y = Math.sin(this._time * 3 + enemy.x) * 0.3;
        }
      }

      // Reached the wall?
      if (enemy.z <= WALL_Z + 2) {
        const def = enemy.isBoss && enemy.bossDef ? enemy.bossDef : ENEMY_DEFS[enemy.type];
        let gDmg = def.gateDamage * enemy.gateDmgMult;
        if (this._cachedSynergies.includes("fortress")) gDmg *= 0.85;
        this._gateHp -= gDmg;
        this._playSound("gate_hit");

        // Enemy is consumed on reaching wall
        enemy.dead = true;
        this._waveEnemiesKilled++;
        this._scene.remove(enemy.mesh);

        // Flash gate red
        (this._gateMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xff0000);
        (this._gateMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1;
        setTimeout(() => {
          if (!this._destroyed) {
            (this._gateMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
            (this._gateMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
          }
        }, 200);

        // Gate chunks fly off on heavy hits (>20 damage)
        if (gDmg > 20) {
          const chunkCount = Math.min(Math.floor(gDmg / 15), 5);
          const chunkMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
          for (let gc = 0; gc < chunkCount; gc++) {
            const cs = 0.15 + Math.random() * 0.3;
            const chunk = new THREE.Mesh(new THREE.BoxGeometry(cs, cs, cs * 0.5), chunkMat.clone());
            chunk.position.set(
              (Math.random() - 0.5) * GATE_WIDTH * 0.8,
              WALL_HEIGHT * Math.random(),
              WALL_Z - 1,
            );
            const cVel = new THREE.Vector3(
              (Math.random() - 0.5) * 4,
              2 + Math.random() * 4,
              -2 - Math.random() * 3,
            );
            this._addParticle(chunk, 2.0, (el, pdt) => {
              cVel.y += GRAVITY * pdt;
              chunk.position.add(cVel.clone().multiplyScalar(pdt));
              chunk.rotation.x += 0.1;
              chunk.rotation.z += 0.08;
              if (chunk.position.y < 0.05) {
                chunk.position.y = 0.05;
                cVel.y *= -0.2;
                cVel.x *= 0.5;
                cVel.z *= 0.5;
              }
              if (el > 1.5 && chunk.material instanceof THREE.MeshStandardMaterial) {
                chunk.material.transparent = true;
                chunk.material.opacity = Math.max(0, 1 - (el - 1.5) / 0.5);
              }
            });
          }
        }
      }
    }
  }

  private _updateExplosions(dt: number): void {
    for (const exp of this._explosions) {
      exp.time += dt;
      const progress = exp.time / exp.maxTime;

      if (progress >= 1) {
        this._scene.remove(exp.mesh);
        exp.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) child.material.dispose();
          }
        });
        continue;
      }

      // Expand core sphere (fast start, slow end)
      const expandT = 1 - Math.pow(1 - progress, 2);
      const scale = exp.radius * expandT * 1.8;
      exp.mesh.children[0].scale.setScalar(scale);
      const sphere = exp.mesh.children[0] as THREE.Mesh;
      if (sphere.material instanceof THREE.MeshBasicMaterial) {
        sphere.material.opacity = 0.85 * (1 - progress);
      }

      // Shockwave ring expands outward along ground
      const ring = exp.mesh.getObjectByName("shockRing") as THREE.Mesh | undefined;
      if (ring) {
        ring.scale.setScalar(exp.radius * progress * 3);
        if (ring.material instanceof THREE.MeshBasicMaterial) {
          ring.material.opacity = 0.5 * (1 - progress);
        }
      }

      // Particles rise and scatter
      const particles = exp.mesh.children[2] as THREE.Points;
      if (particles) {
        particles.position.y += dt * 4;
        if (particles.material instanceof THREE.PointsMaterial) {
          particles.material.opacity = 0.95 * Math.pow(1 - progress, 1.5);
          particles.material.size *= 1 + dt * 0.5; // grow slightly
        }
      }

      // Light fades
      const light = exp.mesh.children[3] as THREE.PointLight;
      if (light) {
        light.intensity = 8 * Math.pow(1 - progress, 2);
      }

      // Animate debris chunks (physics)
      exp.mesh.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.name === "debris") {
          const vel = child.userData.vel as THREE.Vector3;
          if (vel) {
            vel.y += GRAVITY * dt;
            child.position.add(vel.clone().multiplyScalar(dt));
            child.rotation.x += dt * 8;
            child.rotation.z += dt * 6;
            // Clamp to ground
            if (child.position.y < -exp.mesh.position.y + 0.05) {
              child.position.y = -exp.mesh.position.y + 0.05;
              vel.y = 0;
              vel.x *= 0.8;
              vel.z *= 0.8;
            }
          }
          // Fade debris
          if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.transparent = true;
            child.material.opacity = Math.max(0, 1 - progress * 1.5);
          }
        }
      });
    }

    this._explosions = this._explosions.filter((e) => e.time < e.maxTime);
  }

  // ── Wave Announcement Banner ─────────────────────────────────────────────

  private _showWaveAnnouncement(): void {
    const isBoss = this._wave % 5 === 0;
    const mod = this._currentModifier;
    const modText = mod.id !== "normal" ? `<div style="font-size:16px;color:${mod.color};margin-top:6px;">${mod.name}: ${mod.desc}</div>` : "";

    const banner = document.createElement("div");
    banner.style.cssText = `
      position:fixed;top:30%;left:50%;transform:translate(-50%,-50%) scale(0.5);
      pointer-events:none;z-index:10002;text-align:center;
      transition:transform 0.4s cubic-bezier(0.2,1.5,0.4,1),opacity 0.6s ease-out;
      opacity:0;
    `;
    banner.innerHTML = `
      <div style="font-size:${isBoss ? 56 : 42}px;font-weight:900;color:${isBoss ? "#ff4444" : "#ffd700"};text-shadow:3px 3px 10px #000,0 0 30px ${isBoss ? "rgba(255,0,0,0.5)" : "rgba(255,200,0,0.3)"};">
        ${isBoss ? "BOSS WAVE" : `WAVE ${this._wave}`}
      </div>
      ${isBoss ? `<div style="font-size:20px;color:#ff8844;margin-top:4px;">${BOSSES[Math.min(Math.floor(this._wave / 5) - 1, BOSSES.length - 1)].name}</div>` : ""}
      ${modText}
    `;
    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(() => {
      banner.style.transform = "translate(-50%,-50%) scale(1)";
      banner.style.opacity = "1";
    });

    // Fade out and remove
    setTimeout(() => {
      banner.style.opacity = "0";
      banner.style.transform = "translate(-50%,-50%) scale(1.2)";
    }, 1800);
    setTimeout(() => {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 2500);

    // Boss entrance: extra screen shake + boss roar is already called
    if (isBoss) {
      this._screenShake = 0.8;
    }
  }

  // ── Centralized Particle System ──────────────────────────────────────────

  private _addParticle(mesh: THREE.Object3D, duration: number, update: (elapsed: number, dt: number) => void, cleanup?: () => void): void {
    this._scene.add(mesh);
    this._activeParticles.push({
      mesh,
      startTime: this._time,
      duration,
      update,
      cleanup: cleanup || (() => {
        this._scene.remove(mesh);
        if (mesh instanceof THREE.Mesh) {
          mesh.geometry.dispose();
          if (mesh.material instanceof THREE.Material) mesh.material.dispose();
        }
      }),
    });
  }

  private _updateParticles(dt: number): void {
    this._activeParticles = this._activeParticles.filter((p) => {
      const elapsed = this._time - p.startTime;
      if (elapsed >= p.duration) {
        p.cleanup();
        return false;
      }
      p.update(elapsed, dt);
      return true;
    });
  }

  // ── Arrow Volley Ability (E key) ────────────────────────────────────────

  private _useArrowVolley(): void {
    this._volleyCooldown = this._volleyMaxCooldown;

    // Fire a barrage of 12 projectiles using current ammo across the field
    const launchY = LAUNCH_HEIGHT;
    const ammo = this._currentAmmo;
    const count = 12;
    const hasBarrage = this._cachedSynergies.includes("barrage");
    for (let i = 0; i < count; i++) {
      const angle = -0.7 + (i / (count - 1)) * 1.4; // wider spread
      const power = 30 + Math.random() * 15 + (hasBarrage ? 10 : 0);
      const vx = Math.sin(angle) * Math.cos(0.65) * power;
      const vy = Math.sin(0.65) * power;
      const vz = Math.cos(angle) * Math.cos(0.65) * power;
      setTimeout(() => {
        if (this._destroyed) return;
        this._spawnProjectile(
          new THREE.Vector3((Math.random() - 0.5) * 4, launchY, WALL_Z + 1),
          new THREE.Vector3(vx, vy, vz),
          ammo,
        );
        this._totalShots++;
      }, i * 50);
    }
    this._screenShake = 0.6;
    this._trebuchetRecoil = 0.5;
    this._playSound("launch");
    // Staggered second sound
    setTimeout(() => { if (!this._destroyed) this._playSound("launch"); }, 200);
  }

  // ── Emergency Repair Ability (R key) ───────────────────────────────────

  private _useEmergencyRepair(): void {
    this._repairCooldown = this._repairMaxCooldown;
    const repairAmt = Math.floor(this._gateMaxHp * 0.2);
    this._gateHp = Math.min(this._gateHp + repairAmt, this._gateMaxHp);
    this._spawnFloatingText(0, WALL_Z + 2, -repairAmt, "#44ff44");
    const rft = this._floatingTexts[this._floatingTexts.length - 1];
    if (rft) { rft.el.textContent = `+${repairAmt} HP`; rft.el.style.fontSize = "20px"; }
    this._playSound("buy");

    // Visual: green pulse on gate
    (this._gateMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x22ff22);
    (this._gateMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1;
    setTimeout(() => {
      if (this._destroyed) return;
      (this._gateMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
      (this._gateMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
    }, 400);
  }

  // ── Last Stand Mechanic ────────────────────────────────────────────────

  private _checkLastStand(): void {
    const ratio = this._gateHp / this._gateMaxHp;
    if (ratio <= 0.25 && !this._lastStandActive) {
      this._lastStandActive = true;
      // Reset oil cooldown
      this._oilCooldown = 0;
      // Temporary fire rate boost
      this._reloadTime = Math.max(0.3, this._reloadTime * 0.6);
      this._screenShake = 0.6;
    } else if (ratio > 0.35 && this._lastStandActive) {
      // Deactivate when gate is repaired above 35%
      this._lastStandActive = false;
      this._reloadTime = Math.max(0.5, 2.0 - this._upgradeLevels["reload"] * 0.3);
    }
  }

  // ── Upgrade Synergy Bonuses ────────────────────────────────────────────

  private _getUpgradeSynergies(): string[] {
    const synergies: string[] = [];
    // Counterweight + Shrapnel = "Devastation" (bigger explosions deal more base damage)
    if (this._upgradeLevels["power"] >= 3 && this._upgradeLevels["splash"] >= 3) {
      synergies.push("devastation");
    }
    // Reload + Twin Arm = "Barrage" (multishot has +20% extra proc chance)
    if (this._upgradeLevels["reload"] >= 3 && this._upgradeLevels["multishot"] >= 2) {
      synergies.push("barrage");
    }
    // Gate + Reload = "Fortress" (gate takes 15% less damage)
    if (this._upgradeLevels["gate"] >= 3 && this._upgradeLevels["reload"] >= 2) {
      synergies.push("fortress");
    }
    return synergies;
  }

  // ── Boiling Oil Ability ──────────────────────────────────────────────────

  private _useBoilingOil(): void {
    this._oilCooldown = this._oilMaxCooldown;
    this._playSound("launch");

    // Damage all enemies near the gate — scales with wave
    const oilZone = 20 + Math.min(this._wave, 15);
    const oilDamage = 35 + this._wave * 2;
    let hitCount = 0;
    for (const enemy of this._enemies) {
      if (enemy.dead || enemy.z > oilZone) continue;
      this._damageEnemy(enemy, oilDamage);
      enemy.burning = Math.max(enemy.burning, 5.0); // longer burn
      hitCount++;
      this._spawnFloatingText(enemy.x, enemy.z, oilDamage, "#ff8800");
    }

    // Visual: orange splash effect along the wall (uses centralized particle system)
    for (let ox = -FIELD_WIDTH / 2; ox < FIELD_WIDTH / 2; ox += 4) {
      const sMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
      const splash = new THREE.Mesh(new THREE.CircleGeometry(2, 8), sMat);
      splash.rotation.x = -Math.PI / 2;
      splash.position.set(ox + Math.random() * 3, 0.05, WALL_Z + 3 + Math.random() * oilZone * 0.8);
      this._addParticle(splash, 1.5, (elapsed) => {
        sMat.opacity = 0.5 * (1 - elapsed / 1.5);
        splash.scale.setScalar(1 + elapsed);
      });
    }

    this._screenShake = 0.4;
    if (hitCount > 0) this._playSound("impact");
  }

  // ── Floating Damage Numbers ────────────────────────────────────────────

  private _spawnFloatingText(worldX: number, worldZ: number, value: number, color: string): void {
    // Project world position to screen
    const vec = new THREE.Vector3(worldX, 2, worldZ);
    vec.project(this._camera);
    const sx = (vec.x + 1) / 2 * window.innerWidth;
    const sy = (-vec.y + 1) / 2 * window.innerHeight;

    const el = document.createElement("div");
    el.textContent = value > 0 ? `-${Math.round(value)}` : `+${Math.abs(Math.round(value))}`;
    el.style.cssText = `
      position:fixed;left:${sx}px;top:${sy}px;font-size:18px;font-weight:900;
      color:${color};text-shadow:1px 1px 3px #000;pointer-events:none;z-index:10001;
      transition:transform 0.8s ease-out,opacity 0.8s ease-out;
    `;
    this._hudContainer.appendChild(el);

    requestAnimationFrame(() => {
      el.style.transform = "translateY(-40px)";
      el.style.opacity = "0";
    });

    this._floatingTexts.push({ el, startTime: this._time, x: sx, y: sy });
  }

  private _cleanupFloatingTexts(): void {
    this._floatingTexts = this._floatingTexts.filter((ft) => {
      if (this._time - ft.startTime > 1.0) {
        if (ft.el.parentNode) ft.el.parentNode.removeChild(ft.el);
        return false;
      }
      return true;
    });
  }

  // ── Combo System ───────────────────────────────────────────────────────

  private _registerKill(): void {
    this._comboCount++;
    this._comboTimer = 2.5; // 2.5 second window to keep combo
    if (this._comboCount >= 3) {
      this._comboMultiplier = 1 + Math.floor(this._comboCount / 3) * 0.5; // 1.5x at 3, 2x at 6, etc.
    }
    if (this._comboCount > this._maxCombo) this._maxCombo = this._comboCount;

    // Combo milestone celebrations
    if (this._comboCount >= 3 && this._comboCount % 3 === 0 && this._comboCount > this._lastComboMilestone) {
      this._lastComboMilestone = this._comboCount;
      this._playSound("combo_sting");
      // Camera pull-back is handled in camera update (combo > 5)
      // Gold bonus for milestones
      this._gold += this._comboCount;
      this._spawnFloatingText(0, WALL_Z + 10, -this._comboCount, "#ffd700");
      const lastFt = this._floatingTexts[this._floatingTexts.length - 1];
      if (lastFt) lastFt.el.textContent = `${this._comboCount}x COMBO +${this._comboCount}g`;
    }
  }

  private _updateCombo(dt: number): void {
    if (this._comboTimer > 0) {
      this._comboTimer -= dt;
      if (this._comboTimer <= 0) {
        this._comboCount = 0;
        this._comboMultiplier = 1;
        this._lastComboMilestone = 0;
      }
    }
  }

  // ── Enemy Catapult Counter-fire ────────────────────────────────────────

  private _enemyCatapultFire(enemy: EnemyState): void {
    const projMat = new THREE.MeshStandardMaterial({ color: 0x665533, roughness: 0.8 });
    const proj = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), projMat);
    proj.position.set(enemy.x, ENEMY_DEFS.catapult.height + 1, enemy.z);
    proj.castShadow = true;
    this._scene.add(proj);

    // Arc toward gate
    const dx = (Math.random() - 0.5) * GATE_WIDTH * 1.5;
    const dz = enemy.z - WALL_Z;
    const flightTime = 1.5 + Math.random() * 0.5;
    const vx = dx / flightTime;
    const vz = -dz / flightTime;
    const vy = (0 - proj.position.y - 0.5 * GRAVITY * flightTime * flightTime) / flightTime;

    this._enemyProjectiles.push({
      mesh: proj,
      vel: new THREE.Vector3(vx, vy, vz),
      time: 0,
    });

    // Incoming projectile whistle warning sound
    if (this._audioCtx) {
      try {
        const ctx = this._audioCtx;
        const now = ctx.currentTime;
        const whistle = ctx.createOscillator();
        whistle.type = "sine";
        whistle.frequency.setValueAtTime(800, now);
        whistle.frequency.exponentialRampToValueAtTime(300, now + flightTime);
        const wGain = ctx.createGain();
        wGain.gain.setValueAtTime(0.03, now);
        wGain.gain.linearRampToValueAtTime(0.08, now + flightTime * 0.7);
        wGain.gain.exponentialRampToValueAtTime(0.001, now + flightTime);
        whistle.connect(wGain).connect(ctx.destination);
        whistle.start(now);
        whistle.stop(now + flightTime);
      } catch { /* */ }
    }
  }

  private _updateEnemyProjectiles(dt: number): void {
    for (const ep of this._enemyProjectiles) {
      ep.time += dt;
      ep.vel.y += GRAVITY * dt;
      ep.mesh.position.add(ep.vel.clone().multiplyScalar(dt));
      ep.mesh.rotation.x += dt * 4;

      // Hit ground / wall area
      if (ep.mesh.position.y <= 0 || ep.mesh.position.z <= WALL_Z + 1) {
        // Damage gate
        let catDmg = 8 + this._wave * 1.5;
        if (this._cachedSynergies.includes("fortress")) catDmg *= 0.85;
        this._gateHp -= catDmg;
        this._spawnFloatingText(ep.mesh.position.x, ep.mesh.position.z, catDmg, "#ff4444");
        this._screenShake = Math.min(this._screenShake + 0.15, 0.6);
        this._playSound("gate_hit");

        // Small impact
        this._spawnExplosion(ep.mesh.position.clone(), 1.0, "boulder");

        this._scene.remove(ep.mesh);
        ep.mesh.geometry.dispose();
        (ep.mesh.material as THREE.Material).dispose();
        ep.time = 999; // mark for removal
      }

      // Out of bounds
      if (ep.mesh.position.z < -30 || ep.time > 5) {
        this._scene.remove(ep.mesh);
        ep.mesh.geometry.dispose();
        (ep.mesh.material as THREE.Material).dispose();
        ep.time = 999;
      }
    }
    this._enemyProjectiles = this._enemyProjectiles.filter((ep) => ep.time < 100);
  }

  // ── Boss Phase Transitions ─────────────────────────────────────────────

  private _checkBossPhaseTransition(enemy: EnemyState): void {
    if (!enemy.isBoss || !enemy.bossDef || enemy.dead) return;
    const hpRatio = enemy.hp / enemy.maxHp;

    // At 50% HP: boss enrages
    if (hpRatio <= 0.5 && enemy.speed === enemy.bossDef.speed) {
      enemy.speed *= 1.5; // speed boost
      this._screenShake = 0.6;

      // Visual: red pulse
      enemy.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.emissive.setHex(0xff2200);
          child.material.emissiveIntensity = 2;
        }
      });
      setTimeout(() => {
        if (this._destroyed) return;
        enemy.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissive.setHex(0x000000);
            child.material.emissiveIntensity = 0;
          }
        });
      }, 500);

      // Spawn extra adds
      for (let i = 0; i < 3; i++) {
        const ax = (Math.random() - 0.5) * FIELD_WIDTH * 0.5;
        this._spawnEnemy("footman", ax);
        this._waveEnemiesTotal++;
      }
    }
  }

  // ── Highscore Persistence ──────────────────────────────────────────────

  private _saveHighscore(): void {
    try {
      if (this._score > this._highscore) {
        this._highscore = this._score;
        localStorage.setItem("trebuchet_highscore", String(this._highscore));
      }
      if (this._wave > this._bestWave) {
        this._bestWave = this._wave;
        localStorage.setItem("trebuchet_bestwave", String(this._bestWave));
      }
    } catch { /* ignore */ }
  }

  // ── Background Music ──────────────────────────────────────────────────

  private _startMusic(): void {
    if (!this._audioCtx) return;
    try {
      this._stopMusic();
      const ctx = this._audioCtx;

      // Layer 1: Low war drum drone
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 55;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.3;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 8;
      lfo.connect(lfoGain).connect(osc.frequency);
      lfo.start();
      const gain = ctx.createGain();
      gain.gain.value = 0.04;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 150;
      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc.start();
      this._musicOsc = osc;

      // Layer 2: Wind ambience (filtered noise)
      const windBufSize = ctx.sampleRate * 2;
      const windBuf = ctx.createBuffer(1, windBufSize, ctx.sampleRate);
      const windData = windBuf.getChannelData(0);
      for (let i = 0; i < windBufSize; i++) windData[i] = (Math.random() * 2 - 1) * 0.5;
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = windBuf;
      windSrc.loop = true;
      const windGain = ctx.createGain();
      windGain.gain.value = 0.015;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = "bandpass";
      windFilter.frequency.value = 400;
      windFilter.Q.value = 0.5;
      // Wind modulation
      const windLfo = ctx.createOscillator();
      windLfo.frequency.value = 0.15;
      const windLfoGain = ctx.createGain();
      windLfoGain.gain.value = 200;
      windLfo.connect(windLfoGain).connect(windFilter.frequency);
      windLfo.start();
      windSrc.connect(windFilter).connect(windGain).connect(ctx.destination);
      windSrc.start();

      // Layer 3: Distant drums (rhythmic pulse)
      const drumOsc = ctx.createOscillator();
      drumOsc.type = "sine";
      drumOsc.frequency.value = 40;
      const drumGain = ctx.createGain();
      drumGain.gain.value = 0;
      const drumLfo = ctx.createOscillator();
      drumLfo.frequency.value = 1.2; // ~72 BPM pulse
      const drumLfoGain = ctx.createGain();
      drumLfoGain.gain.value = 0.025;
      drumLfo.connect(drumLfoGain).connect(drumGain.gain);
      drumLfo.start();
      const drumFilter = ctx.createBiquadFilter();
      drumFilter.type = "lowpass";
      drumFilter.frequency.value = 80;
      drumOsc.connect(drumFilter).connect(drumGain).connect(ctx.destination);
      drumOsc.start();
    } catch { /* ignore */ }
  }

  private _stopMusic(): void {
    if (this._musicOsc) {
      try { this._musicOsc.stop(); } catch { /* */ }
      this._musicOsc = null;
    }
  }

  // ── Audio ────────────────────────────────────────────────────────────────

  private _initAudio(): void {
    try {
      this._audioCtx = new AudioContext();
    } catch {
      // Audio not available
    }
  }

  private _playSound(type: "launch" | "impact" | "kill" | "gate_hit" | "buy" | "wave_start" | "boss_roar" | "combo_sting"): void {
    if (!this._audioCtx) return;
    try {
      const ctx = this._audioCtx;
      const now = ctx.currentTime;

      if (type === "launch") {
        // Trebuchet whoosh
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);

        // Creak
        const creak = ctx.createOscillator();
        const creakGain = ctx.createGain();
        creak.type = "triangle";
        creak.frequency.setValueAtTime(400, now);
        creak.frequency.linearRampToValueAtTime(150, now + 0.2);
        creakGain.gain.setValueAtTime(0.06, now);
        creakGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        creak.connect(creakGain).connect(ctx.destination);
        creak.start(now);
        creak.stop(now + 0.3);
      }

      if (type === "impact") {
        // Boom
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);

        // Noise burst
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        noise.connect(noiseGain).connect(ctx.destination);
        noise.start(now);
      }

      if (type === "kill") {
        // Randomize pitch for variety
        const baseFreq = 400 + Math.random() * 400;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = Math.random() > 0.5 ? "square" : "triangle";
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.35, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      }

      if (type === "gate_hit") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      }

      if (type === "buy") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      }

      if (type === "wave_start") {
        // War horn — ascending brass-like tone
        for (const freq of [110, 165, 220]) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, now);
          osc.frequency.linearRampToValueAtTime(freq * 1.2, now + 0.6);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 600;
          osc.connect(filter).connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.8);
        }
      }

      if (type === "boss_roar") {
        // Deep rumbling growl
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.8);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 200;
        osc.connect(filter).connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.0);
        // Noise layer
        const bufferSize = Math.floor(ctx.sampleRate * 0.5);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.5;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.1, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        noise.connect(nGain).connect(ctx.destination);
        noise.start(now);
      }

      if (type === "combo_sting") {
        // Ascending triumphant arpeggio
        const notes = [330, 440, 550, 660];
        for (let i = 0; i < notes.length; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(notes[i], now + i * 0.08);
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.1, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.25);
        }
      }
    } catch {
      // Audio error, ignore
    }
  }
}
