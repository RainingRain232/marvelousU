// ---------------------------------------------------------------------------
// GRAIL KEEPER — 3D 360° Orbital Arena Defense
// You are a spectral guardian orbiting the Holy Grail on a floating island in
// the clouds. Demons, wraiths, and dark knights converge from all directions.
// Orbit the grail, fire holy bolts, dash through danger, raise shields, and
// unleash divine novas to protect the sacred chalice. Wave-based with bosses,
// upgrades between waves, and escalating chaos from every angle.
// ---------------------------------------------------------------------------

import * as THREE from "three";

// ── Constants ────────────────────────────────────────────────────────────────

const ARENA_RADIUS = 40; // radius of the floating island
const ORBIT_RADIUS = 12; // player orbit distance from grail
const ORBIT_MIN_Y = 2;
const ORBIT_MAX_Y = 18;
const GRAIL_Y = 5; // grail hover height

const PLAYER_SPEED = 3.0; // radians/sec orbit speed
const PLAYER_ALTITUDE_SPEED = 8;
const BOLT_SPEED = 50;
const BOLT_DAMAGE = 15;
const BOLT_COOLDOWN = 0.25;
const DASH_SPEED = 25;
const DASH_DURATION = 0.25;
const DASH_COOLDOWN = 2.0;
const SHIELD_DURATION = 1.5;
const SHIELD_COOLDOWN = 8.0;
const NOVA_DAMAGE = 40;
const NOVA_RADIUS = 18;
const NOVA_COOLDOWN = 20;
const SHIELD_BURST_COOLDOWN = 12;
const SHIELD_BURST_RADIUS = 15;
const SHIELD_BURST_PUSH = 8;

const GRAIL_MAX_HP = 300;

// ── Enemy Types ──────────────────────────────────────────────────────────────

const ENEMY_TYPES = ["imp", "wraith", "dark_knight", "gargoyle", "shadow_drake", "herald"] as const;
type EnemyType = (typeof ENEMY_TYPES)[number];

interface EnemyDef {
  name: string;
  hp: number;
  speed: number;
  size: number;
  color: number;
  damage: number; // per second drain on grail
  points: number;
  attackRange: number; // how close they need to get to grail
  canFly: boolean;
}

const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  imp: { name: "Imp", hp: 15, speed: 6, size: 0.6, color: 0xcc3333, damage: 5, points: 10, attackRange: 6, canFly: false },
  wraith: { name: "Wraith", hp: 25, speed: 4, size: 0.8, color: 0x6644aa, damage: 8, points: 20, attackRange: 8, canFly: true },
  dark_knight: { name: "Dark Knight", hp: 60, speed: 3, size: 1.2, color: 0x333344, damage: 12, points: 40, attackRange: 5, canFly: false },
  gargoyle: { name: "Gargoyle", hp: 45, speed: 5, size: 1.0, color: 0x556655, damage: 10, points: 30, attackRange: 7, canFly: true },
  shadow_drake: { name: "Shadow Drake", hp: 80, speed: 4.5, size: 1.8, color: 0x442244, damage: 15, points: 60, attackRange: 9, canFly: true },
  herald: { name: "Herald", hp: 35, speed: 3.5, size: 0.9, color: 0xcc8800, damage: 6, points: 25, attackRange: 12, canFly: true },
};

// ── Boss Definitions ─────────────────────────────────────────────────────────

interface BossDef {
  name: string;
  hp: number;
  speed: number;
  size: number;
  color: number;
  damage: number;
  points: number;
  ability: "summon" | "beam" | "vortex";
}

const BOSSES: BossDef[] = [
  { name: "The Hollow King", hp: 400, speed: 2, size: 3.5, color: 0x660000, damage: 20, points: 500, ability: "summon" },
  { name: "Void Seraph", hp: 700, speed: 2.5, size: 4, color: 0x220044, damage: 25, points: 1000, ability: "beam" },
  { name: "Abyssal Titan", hp: 1200, speed: 1.5, size: 5.5, color: 0x111122, damage: 35, points: 2000, ability: "vortex" },
];

// ── Upgrades ─────────────────────────────────────────────────────────────────

interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  baseCost: number;
  maxLevel: number;
}

const UPGRADE_DEFS: UpgradeDef[] = [
  { id: "bolt_dmg", name: "Sacred Fire", desc: "+5 bolt damage", baseCost: 25, maxLevel: 6 },
  { id: "bolt_rate", name: "Rapid Prayer", desc: "+15% fire rate", baseCost: 30, maxLevel: 5 },
  { id: "grail_hp", name: "Divine Ward", desc: "+50 grail max HP & heal", baseCost: 35, maxLevel: 5 },
  { id: "dash_cd", name: "Ethereal Step", desc: "-0.3s dash cooldown", baseCost: 40, maxLevel: 4 },
  { id: "nova_dmg", name: "Wrath of God", desc: "+15 nova damage & radius", baseCost: 60, maxLevel: 4 },
  { id: "shield_dur", name: "Aegis", desc: "+0.5s shield duration", baseCost: 45, maxLevel: 3 },
  { id: "pierce", name: "Holy Lance", desc: "Bolts pierce through enemies", baseCost: 55, maxLevel: 3 },
  { id: "homing", name: "Guided Light", desc: "Bolts curve toward nearest enemy", baseCost: 50, maxLevel: 3 },
  { id: "multi", name: "Trinity Shot", desc: "Fire 2-3 bolts in a spread", baseCost: 65, maxLevel: 3 },
];

// ── Interfaces ───────────────────────────────────────────────────────────────

interface Bolt {
  mesh: THREE.Mesh;
  dir: THREE.Vector3;
  alive: boolean;
  time: number;
  damage: number;
  trail: THREE.Points;
  pierceCount: number;
  isCharged: boolean;
}

interface EnemyBolt {
  mesh: THREE.Mesh;
  dir: THREE.Vector3;
  alive: boolean;
  time: number;
}

interface EnemyState {
  mesh: THREE.Group;
  type: EnemyType;
  hp: number;
  maxHp: number;
  pos: THREE.Vector3;
  dead: boolean;
  hitFlash: number;
  isBoss: boolean;
  bossDef?: BossDef;
  bossAbilityTimer: number;
  bossAbilityThreshold: number; // randomized threshold for next ability
  draining: boolean; // currently damaging grail
  angle: number; // approach angle (radians)
  altitude: number;
  hpBar: THREE.Mesh;
  hpBarBg: THREE.Mesh;
  spawnDelay: number; // spawn warning delay before enemy starts moving
  enraged: boolean; // boss enrage at 50% HP
}

interface Particle {
  mesh: THREE.Object3D;
  startTime: number;
  duration: number;
  update: (elapsed: number, dt: number) => void;
  cleanup: () => void;
}

type Phase = "title" | "playing" | "boss" | "between_waves" | "shop" | "victory" | "defeat" | "paused";

type WaveModifier = "swift" | "armored" | "swarm" | "bounty" | "twilight";
const WAVE_MODIFIERS: { id: WaveModifier; name: string; color: string }[] = [
  { id: "swift", name: "Swift", color: "#44ffaa" },
  { id: "armored", name: "Armored", color: "#aaaaaa" },
  { id: "swarm", name: "Swarm", color: "#ffaa44" },
  { id: "bounty", name: "Bounty", color: "#ffd700" },
  { id: "twilight", name: "Twilight", color: "#8888cc" },
];

// ── Wave Generation ──────────────────────────────────────────────────────────

interface WaveSpawn {
  type: EnemyType;
  count: number;
  delay: number;
}

function generateWave(waveNum: number): WaveSpawn[] {
  // Themed wave overrides
  if (waveNum === 7) {
    // "Swarm" — double imp count, no other types
    return [{ type: "imp", count: (4 + 7 * 2) * 2, delay: 0.5 }];
  }
  if (waveNum === 9) {
    // "Flying Assault" — only flying enemies (wraiths, gargoyles, shadow drakes)
    return [
      { type: "wraith", count: 6, delay: 1.5 },
      { type: "gargoyle", count: 4, delay: 2.0 },
      { type: "shadow_drake", count: 2, delay: 3.0 },
    ];
  }
  if (waveNum === 13) {
    // "Dark Legion" — only dark knights and heralds
    return [
      { type: "dark_knight", count: 8, delay: 2.0 },
      { type: "herald", count: 4, delay: 2.5 },
    ];
  }
  if (waveNum === 17) {
    // "Drake Storm" — heavy shadow drake focus
    return [
      { type: "shadow_drake", count: 8, delay: 2.0 },
      { type: "wraith", count: 3, delay: 3.0 },
      { type: "gargoyle", count: 3, delay: 3.0 },
    ];
  }

  const spawns: WaveSpawn[] = [];
  const n = waveNum;
  spawns.push({ type: "imp", count: 4 + n * 2, delay: 1.0 - Math.min(n * 0.04, 0.5) });
  if (n >= 2) spawns.push({ type: "wraith", count: 1 + Math.floor(n / 2), delay: 2.0 });
  if (n >= 3) spawns.push({ type: "gargoyle", count: Math.floor(n / 3), delay: 2.5 });
  if (n >= 4) spawns.push({ type: "dark_knight", count: Math.floor(n / 4) + 1, delay: 3.0 });
  if (n >= 6) spawns.push({ type: "shadow_drake", count: Math.floor((n - 4) / 3), delay: 4.0 });
  if (n >= 5) spawns.push({ type: "herald", count: Math.floor(n / 5), delay: 4.0 });
  return spawns;
}

const THEMED_WAVE_NAMES: Record<number, { name: string; color: string }> = {
  7: { name: "SWARM", color: "#ffaa44" },
  9: { name: "FLYING ASSAULT", color: "#6644aa" },
  13: { name: "DARK LEGION", color: "#333344" },
  17: { name: "DRAKE STORM", color: "#442244" },
};

// ── Synergy Definitions ─────────────────────────────────────────────────

interface SynergyDef {
  id: string;
  name: string;
  desc: string;
  color: string;
  requires: [string, string]; // upgrade IDs that must be maxed
}

const SYNERGY_DEFS: SynergyDef[] = [
  { id: "rapid_fire", name: "Rapid Fire", desc: "Bolts leave a damaging trail (1 DPS for 0.5s)", color: "#44aaff", requires: ["bolt_dmg", "bolt_rate"] },
  { id: "seeking_vengeance", name: "Seeking Vengeance", desc: "Pierced bolts gain +20% dmg instead of -40%", color: "#ff88ff", requires: ["pierce", "homing"] },
  { id: "divine_resonance", name: "Divine Resonance", desc: "Shield expiry triggers a mini-nova", color: "#ffdd44", requires: ["nova_dmg", "shield_dur"] },
];

// ── Main Class ───────────────────────────────────────────────────────────────

export class GrailKeeperGame {
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _animFrame = 0;
  private _destroyed = false;
  private _dt = 0;
  private _time = 0;

  // Game state
  private _phase: Phase = "title";
  private _pausedPhase: Phase = "playing";
  private _wave = 0;
  private _score = 0;
  private _souls = 0; // currency (like gold)
  private _grailHp = GRAIL_MAX_HP;
  private _grailMaxHp = GRAIL_MAX_HP;
  private _totalKills = 0;

  // Player state
  private _playerAngle = 0; // orbital position (radians)
  private _playerAltitude = 8;
  private _playerPos = new THREE.Vector3();
  private _boltCooldown = 0;
  private _dashCooldown = 0;
  private _dashTimer = 0;
  private _dashDir = new THREE.Vector3();
  private _shieldCooldown = 0;
  private _shieldTimer = 0;
  private _novaCooldown = 0;
  private _shieldBurstCooldown = 0;
  private _isInvulnerable = false;

  // Upgrades
  private _upgradeLevels: Record<string, number> = {};

  // Combo system
  private _comboCount = 0;
  private _comboTimer = 0;
  private _comboMultiplier = 1;

  // Wave modifier
  private _waveModifier: WaveModifier = "twilight";

  // Charge shot
  private _chargeTime = 0;
  private _lastMouseX = 0;
  private _lastMouseY = 0;

  // Entities
  private _bolts: Bolt[] = [];
  private _enemyBolts: EnemyBolt[] = [];
  private _enemies: EnemyState[] = [];
  private _particles: Particle[] = [];

  // Wave spawning
  private _waveSpawns: WaveSpawn[] = [];
  private _spawnTimers: number[] = [];
  private _spawnCounts: number[] = [];
  private _waveEnemiesTotal = 0;
  private _waveEnemiesKilled = 0;

  // Scene objects
  private _grailMesh!: THREE.Group;
  private _grailLight!: THREE.PointLight;
  private _playerMesh!: THREE.Group;
  private _playerGlow!: THREE.PointLight;
  private _shieldMesh!: THREE.Mesh;
  private _islandMesh!: THREE.Group;
  private _sunLight!: THREE.DirectionalLight;
  private _ambientParticles!: THREE.Points;
  private _trailParticles: THREE.Mesh[] = [];
  private _lastTrailTime = 0;

  // Input
  private _keys: Set<string> = new Set();
  private _mouseX = 0;
  private _mouseY = 0;
  private _mouseDown = false;

  // HUD
  private _hudContainer!: HTMLDivElement;

  // Audio
  private _audioCtx: AudioContext | null = null;
  private _musicOsc: OscillatorNode | null = null;
  private _musicOsc2: OscillatorNode | null = null;
  private _musicLfo: OscillatorNode | null = null;

  // Highscore
  private _highscore = 0;
  private _bestWave = 0;

  // Kill tracking per enemy type
  private _killsByType: Record<string, number> = {};

  // Auto-fire
  private _autoFire = false;

  // Boss death cinematic
  private _bossCinematicFreeze = 0;
  private _bossCinematicName = "";

  // Grail proximity healing
  private _grailHealActive = false;
  private _grailHealGlow: THREE.PointLight | null = null;

  // Player hit system
  private _playerHitCooldown = 0;
  private _screenFlashTimer = 0;

  // Grail overflow mechanic
  private _overflowCharge = 0;

  // Warning sound timer
  private _warningTimer = 0;

  // Souls-per-second tracking
  private _recentSouls: { time: number; amount: number }[] = [];
  private _currentSPS = 0;


  // Bound handlers
  private _onKeyDown!: (e: KeyboardEvent) => void;
  private _onKeyUp!: (e: KeyboardEvent) => void;
  private _onMouseMove!: (e: MouseEvent) => void;
  private _onMouseDown!: (e: MouseEvent) => void;
  private _onMouseUp!: (e: MouseEvent) => void;
  private _onResize!: () => void;

  // ── Boot ─────────────────────────────────────────────────────────────────

  async boot(): Promise<void> {
    this._initThree();
    this._buildScene();
    this._buildPlayer();
    this._buildGrail();
    this._buildHUD();
    this._bindInput();
    this._initAudio();
    for (const u of UPGRADE_DEFS) this._upgradeLevels[u.id] = 0;

    try {
      this._highscore = parseInt(localStorage.getItem("grailkeeper_highscore") || "0", 10);
      this._bestWave = parseInt(localStorage.getItem("grailkeeper_bestwave") || "0", 10);
    } catch { /* */ }

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
    window.removeEventListener("resize", this._onResize);
    this._stopMusic();
    if (this._hudContainer?.parentNode) this._hudContainer.parentNode.removeChild(this._hudContainer);
    this._scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    this._renderer.dispose();
    if (this._renderer.domElement.parentNode) this._renderer.domElement.parentNode.removeChild(this._renderer.domElement);
    if (this._audioCtx) this._audioCtx.close().catch(() => {});
  }

  // ── Init Three.js ────────────────────────────────────────────────────────

  private _initThree(): void {
    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.2;
    this._renderer.domElement.id = "grailkeeper-canvas";
    this._renderer.domElement.style.cssText = "position:fixed;top:0;left:0;z-index:9999;";
    document.body.appendChild(this._renderer.domElement);

    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(0x1a1a2e, 0.008);

    this._camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 300);
  }

  // ── Build Scene ──────────────────────────────────────────────────────────

  private _buildScene(): void {
    // Sky dome — dark purple-blue gradient
    const skyGeo = new THREE.SphereGeometry(200, 16, 12);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x0a0a1a) },
        bottomColor: { value: new THREE.Color(0x2a1a3a) },
        offset: { value: 20 }, exponent: { value: 0.4 },
      },
      vertexShader: `varying vec3 vWP; void main(){vec4 wp=modelMatrix*vec4(position,1.0);vWP=wp.xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform vec3 topColor;uniform vec3 bottomColor;uniform float offset;uniform float exponent;varying vec3 vWP;void main(){float h=normalize(vWP+offset).y;vec3 col=mix(bottomColor,topColor,max(pow(max(h,0.0),exponent),0.0));float nebula=sin(vWP.x*0.02+vWP.z*0.03)*0.15;col+=vec3(nebula*0.4,nebula*0.1,nebula*0.6);gl_FragColor=vec4(col,1.0);}`,
    });
    this._scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.8 + 0.2); // upper hemisphere
      const r = 150 + Math.random() * 40;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    this._scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.7 })));

    // Moonlight
    this._sunLight = new THREE.DirectionalLight(0x8888cc, 0.8);
    this._sunLight.position.set(-30, 50, 20);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(2048, 2048);
    this._sunLight.shadow.camera.left = -50; this._sunLight.shadow.camera.right = 50;
    this._sunLight.shadow.camera.top = 50; this._sunLight.shadow.camera.bottom = -50;
    this._scene.add(this._sunLight);

    // Ambient — very dim, atmospheric
    this._scene.add(new THREE.HemisphereLight(0x222244, 0x111100, 0.3));

    // ── Floating Island ──
    this._islandMesh = new THREE.Group();

    // Main rock body (irregular shape using dodecahedrons)
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x445544, roughness: 0.9 });
    const mainRock = new THREE.Mesh(new THREE.DodecahedronGeometry(ARENA_RADIUS * 0.6, 2), rockMat);
    mainRock.scale.set(1.2, 0.3, 1.2);
    mainRock.position.y = -2;
    mainRock.receiveShadow = true;
    this._islandMesh.add(mainRock);

    // Grass top
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x2a5522, roughness: 0.95 });
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_RADIUS * 0.7, ARENA_RADIUS * 0.65, 1, 24), grassMat);
    grass.position.y = 0;
    grass.receiveShadow = true;
    this._islandMesh.add(grass);

    // Dangling rocks underneath
    const hangMat = new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.9 });
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const r = ARENA_RADIUS * (0.3 + Math.random() * 0.4);
      const h = 3 + Math.random() * 8;
      const w = 1 + Math.random() * 3;
      const rock = new THREE.Mesh(new THREE.ConeGeometry(w, h, 10), hangMat);
      rock.position.set(Math.cos(angle) * r, -h / 2 - 1, Math.sin(angle) * r);
      rock.rotation.x = Math.PI;
      this._islandMesh.add(rock);
    }

    // Stone pillars on the island edge
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.7 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = ARENA_RADIUS * 0.55;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 5 + Math.random() * 3, 6), pillarMat);
      pillar.position.set(Math.cos(angle) * r, 2 + Math.random() * 2, Math.sin(angle) * r);
      pillar.castShadow = true;
      this._islandMesh.add(pillar);

      // Rune glow on pillar top
      const runeLight = new THREE.PointLight(0x4488ff, 0.5, 6);
      runeLight.position.set(Math.cos(angle) * r, 5 + Math.random() * 2, Math.sin(angle) * r);
      this._islandMesh.add(runeLight);
    }

    // Floating cloud wisps around island
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0x222233, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    for (let i = 0; i < 20; i++) {
      const cw = 8 + Math.random() * 15;
      const cloud = new THREE.Mesh(new THREE.PlaneGeometry(cw, 3 + Math.random() * 4), cloudMat);
      cloud.rotation.x = -Math.PI / 2;
      cloud.position.set(
        (Math.random() - 0.5) * ARENA_RADIUS * 3,
        -8 - Math.random() * 20,
        (Math.random() - 0.5) * ARENA_RADIUS * 3,
      );
      this._islandMesh.add(cloud);
    }

    // Ancient trees (dead, gnarled)
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 });
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 10 + Math.random() * 12;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.35, 4, 10), treeMat);
      trunk.position.y = 2;
      trunk.rotation.z = (Math.random() - 0.5) * 0.3;
      tree.add(trunk);
      // Bare branches
      for (let b = 0; b < 3; b++) {
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 2, 8), treeMat);
        branch.position.set(0, 3 + b * 0.5, 0);
        branch.rotation.z = (Math.random() - 0.5) * 1.2;
        branch.rotation.y = Math.random() * Math.PI;
        tree.add(branch);
      }
      tree.position.set(Math.cos(angle) * r, 0.5, Math.sin(angle) * r);
      tree.castShadow = true;
      this._islandMesh.add(tree);
    }

    this._scene.add(this._islandMesh);

    // Distant floating islands (backdrop)
    const distRockMat = new THREE.MeshStandardMaterial({ color: 0x334433, roughness: 1 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random();
      const dist = 80 + Math.random() * 60;
      const s = 5 + Math.random() * 15;
      const island = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), distRockMat);
      island.scale.set(1, 0.3, 1);
      island.position.set(Math.cos(angle) * dist, -10 + Math.random() * 20, Math.sin(angle) * dist);
      island.name = `distIsland${i}`;
      this._scene.add(island);
    }

    // Ambient floating particles
    const ambGeo = new THREE.BufferGeometry();
    const ambPos = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * 60;
      ambPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      ambPos[i * 3 + 1] = -10 + Math.random() * 35;
      ambPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    ambGeo.setAttribute("position", new THREE.BufferAttribute(ambPos, 3));
    this._ambientParticles = new THREE.Points(ambGeo, new THREE.PointsMaterial({ color: 0x6644aa, size: 0.15, transparent: true, opacity: 0.25, depthWrite: false }));
    this._scene.add(this._ambientParticles);

    // Island edge glow ring
    const edgeGlowMat = new THREE.MeshBasicMaterial({ color: 0x4422aa, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false });
    const edgeGlow = new THREE.Mesh(new THREE.TorusGeometry(ARENA_RADIUS * 0.68, 0.3, 12, 32), edgeGlowMat);
    edgeGlow.rotation.x = Math.PI / 2;
    edgeGlow.position.y = 0.5;
    this._scene.add(edgeGlow);
  }

  // ── Build Grail ──────────────────────────────────────────────────────────

  private _buildGrail(): void {
    this._grailMesh = new THREE.Group();

    // Chalice cup
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xffcc33, metalness: 0.9, roughness: 0.1 });
    const cup = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0, 0), new THREE.Vector2(0.3, 0.1), new THREE.Vector2(0.8, 0.8),
      new THREE.Vector2(0.9, 1.2), new THREE.Vector2(0.85, 1.5), new THREE.Vector2(0.7, 1.8),
      new THREE.Vector2(0.3, 2.0), new THREE.Vector2(0.15, 1.6), new THREE.Vector2(0.15, 1.0),
      new THREE.Vector2(0.3, 0.6), new THREE.Vector2(0.6, 0.3), new THREE.Vector2(0.6, 0.1),
    ].reverse(), 16), cupMat);
    cup.castShadow = true;
    this._grailMesh.add(cup);

    // Inner glow
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffeedd, transparent: true, opacity: 0.4 });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), glowMat);
    glow.position.y = 1.5;
    this._grailMesh.add(glow);

    // Holy light beam (vertical pillar of light)
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffeebb, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 2, 50, 8, 1, true), beamMat);
    beam.position.y = 25;
    beam.name = "grailBeam";
    this._grailMesh.add(beam);

    // Orbiting holy particles
    const holyGeo = new THREE.BufferGeometry();
    const holyPos = new Float32Array(30 * 3);
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      holyPos[i * 3] = Math.cos(a) * 2;
      holyPos[i * 3 + 1] = 1 + (i % 5) * 0.5;
      holyPos[i * 3 + 2] = Math.sin(a) * 2;
    }
    holyGeo.setAttribute("position", new THREE.BufferAttribute(holyPos, 3));
    const holyPts = new THREE.Points(holyGeo, new THREE.PointsMaterial({ color: 0xffeedd, size: 0.2, transparent: true, opacity: 0.6, depthWrite: false }));
    holyPts.name = "holyParticles";
    this._grailMesh.add(holyPts);

    // Pulsing golden aura sphere
    const grailAuraMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false });
    const grailAura = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 12), grailAuraMat);
    grailAura.name = "grailAura";
    this._grailMesh.add(grailAura);

    // Rotating rune ring
    const grailRuneMat = new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
    const grailRune = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.06, 12, 24), grailRuneMat);
    grailRune.name = "grailRune";
    grailRune.rotation.x = Math.PI / 2;
    this._grailMesh.add(grailRune);

    // 4 angled light pillars at cardinal directions
    const pillarLightMat = new THREE.MeshBasicMaterial({ color: 0xffeedd, transparent: true, opacity: 0.15, depthWrite: false });
    for (let lp = 0; lp < 4; lp++) {
      const lpAngle = (lp / 4) * Math.PI * 2;
      const lightPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 10), pillarLightMat);
      lightPillar.position.set(Math.cos(lpAngle) * 1.5, 2, Math.sin(lpAngle) * 1.5);
      // Tilt 30 degrees outward
      lightPillar.rotation.z = Math.cos(lpAngle) * (Math.PI / 6);
      lightPillar.rotation.x = -Math.sin(lpAngle) * (Math.PI / 6);
      this._grailMesh.add(lightPillar);
    }

    // Point light from grail
    this._grailLight = new THREE.PointLight(0xffcc44, 3, 30);
    this._grailLight.position.y = 2;
    this._grailLight.castShadow = true;
    this._grailMesh.add(this._grailLight);

    this._grailMesh.position.set(0, GRAIL_Y, 0);
    this._grailMesh.scale.setScalar(1.5);
    this._scene.add(this._grailMesh);
  }

  // ── Build Player ─────────────────────────────────────────────────────────

  private _buildPlayer(): void {
    this._playerMesh = new THREE.Group();

    // Spectral body (ethereal glowing figure)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x4466cc, emissiveIntensity: 0.8, transparent: true, opacity: 0.85 });
    // Core body
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 6, 8), bodyMat);
    body.position.y = 0.4;
    this._playerMesh.add(body);

    // Head (glowing orb)
    const headMat = new THREE.MeshStandardMaterial({ color: 0xaaccff, emissive: 0x6688ee, emissiveIntensity: 1.2, transparent: true, opacity: 0.9 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), headMat);
    head.position.y = 1.1;
    this._playerMesh.add(head);

    // Wings (ethereal planes)
    const wingMat = new THREE.MeshBasicMaterial({ color: 0x6688cc, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), wingMat);
      wing.position.set(side * 0.6, 0.6, 0.1);
      wing.rotation.y = side * 0.4;
      wing.name = side === -1 ? "wingL" : "wingR";
      this._playerMesh.add(wing);
    }

    // Trailing wisps
    for (let i = 0; i < 5; i++) {
      const wispMat = new THREE.MeshBasicMaterial({ color: 0x4466aa, transparent: true, opacity: 0.15, depthWrite: false });
      const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.1 + i * 0.02, 10, 8), wispMat);
      wisp.position.set(0, -0.2 - i * 0.15, 0.2 + i * 0.1);
      wisp.name = `wisp${i}`;
      this._playerMesh.add(wisp);
    }

    // Aura ring
    const playerAuraMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
    const playerAura = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.08, 12, 16), playerAuraMat);
    playerAura.name = "playerAura";
    playerAura.rotation.x = Math.PI / 2;
    this._playerMesh.add(playerAura);

    // Golden shoulder plates
    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0xddaa22, emissive: 0xddaa22, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.3 });
    for (const sx of [-1, 1]) {
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.15), shoulderMat);
      shoulder.position.set(sx * 0.35, 0.8, 0);
      this._playerMesh.add(shoulder);
    }

    // Player glow light
    this._playerGlow = new THREE.PointLight(0x6688ff, 2, 10);
    this._playerGlow.position.y = 0.5;
    this._playerMesh.add(this._playerGlow);

    // Shield mesh (invisible until activated)
    const shieldMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    this._shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), shieldMat);
    this._playerMesh.add(this._shieldMesh);

    this._scene.add(this._playerMesh);
  }

  // ── HUD ──────────────────────────────────────────────────────────────────

  private _buildHUD(): void {
    this._hudContainer = document.createElement("div");
    this._hudContainer.id = "grailkeeper-hud";
    this._hudContainer.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10000;font-family:'Segoe UI',Arial,sans-serif;";
    document.body.appendChild(this._hudContainer);
  }

  private _renderHUD(): void {
    if (this._phase === "title") {
      this._hudContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(10,5,20,0.6);">
          <div style="font-size:60px;font-weight:900;color:#ffd700;text-shadow:0 0 30px rgba(255,200,0,0.5),3px 3px 10px #000;letter-spacing:4px;">GRAIL KEEPER</div>
          <div style="font-size:16px;color:#aabbdd;margin-top:8px;text-shadow:1px 1px 4px #000;">Guardian of the Holy Grail</div>
          ${this._highscore > 0 ? `<div style="font-size:13px;color:#666;margin-top:16px;">Best: ${this._highscore} (Wave ${this._bestWave})</div>` : ""}
          <div style="margin-top:36px;font-size:18px;color:#88aaff;animation:pulse 1.5s infinite alternate;">Click to Begin</div>
          <div style="margin-top:50px;font-size:12px;color:#667;max-width:460px;text-align:center;line-height:1.7;">
            <b>A/D</b> — Orbit &nbsp;|&nbsp; <b>W/S</b> — Altitude &nbsp;|&nbsp; <b>LMB</b> — Fire bolt<br/>
            <b>SPACE</b> — Dash &nbsp;|&nbsp; <b>SHIFT</b> — Shield &nbsp;|&nbsp; <b>F</b> — Holy Nova &nbsp;|&nbsp; <b>G</b> — Grail Burst &nbsp;|&nbsp; <b>T</b> — Auto-fire &nbsp;|&nbsp; <b>P</b> — Pause
          </div>
        </div>
        <style>@keyframes pulse{from{opacity:0.4}to{opacity:1}}</style>`;
      return;
    }

    if (this._phase === "defeat") {
      this._hudContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(20,0,0,0.7);">
          <div style="font-size:48px;font-weight:900;color:#ff3333;text-shadow:0 0 20px rgba(255,0,0,0.4),3px 3px 8px #000;">THE GRAIL IS LOST</div>
          <div style="font-size:20px;color:#ddd;margin-top:12px;">Wave ${this._wave} &nbsp;|&nbsp; Score: ${this._score}</div>
          ${this._score >= this._highscore && this._score > 0 ? `<div style="font-size:15px;color:#ffd700;margin-top:6px;">NEW HIGHSCORE!</div>` : ""}
          <div style="font-size:13px;color:#888;margin-top:16px;">Kills: ${this._totalKills}</div>
          <div style="font-size:11px;color:#666;margin-top:8px;">${Object.entries(this._killsByType).map(([name, count]) => `${name}: ${count}`).join(" | ")}</div>
          <div style="margin-top:30px;font-size:16px;color:#ffaa44;animation:pulse 1.5s infinite alternate;">Click to return</div>
        </div>
        <style>@keyframes pulse{from{opacity:0.4}to{opacity:1}}</style>`;
      return;
    }

    if (this._phase === "victory") {
      this._hudContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(0,10,20,0.7);">
          <div style="font-size:52px;font-weight:900;color:#ffd700;text-shadow:0 0 30px rgba(255,200,0,0.5),3px 3px 8px #000;">THE GRAIL IS SAFE</div>
          <div style="font-size:20px;color:#88ff88;margin-top:12px;">All ${this._wave} waves defeated!</div>
          <div style="font-size:22px;color:#ffd700;margin-top:8px;">Score: ${this._score}</div>
          <div style="font-size:13px;color:#888;margin-top:12px;">Kills: ${this._totalKills}</div>
          <div style="font-size:11px;color:#666;margin-top:8px;">${Object.entries(this._killsByType).map(([name, count]) => `${name}: ${count}`).join(" | ")}</div>
          <div style="margin-top:30px;font-size:16px;color:#ffaa44;animation:pulse 1.5s infinite alternate;">Click to return</div>
        </div>
        <style>@keyframes pulse{from{opacity:0.4}to{opacity:1}}</style>`;
      return;
    }

    if (this._phase === "paused") {
      this._hudContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(0,0,0,0.6);">
          <div style="font-size:44px;font-weight:900;color:#fff;text-shadow:3px 3px 8px #000;">PAUSED</div>
          <div style="font-size:14px;color:#aaa;margin-top:12px;">Press P or ESC to resume</div>
        </div>`;
      return;
    }

    if (this._phase === "between_waves") {
      const nextWave = this._wave + 1;
      const isBoss = nextWave % 5 === 0;
      const spawns = isBoss ? [] : generateWave(nextWave);
      const modInfo = WAVE_MODIFIERS.find((m) => m.id === this._waveModifier);
      const modLine = !isBoss && modInfo && modInfo.id !== "twilight"
        ? `<div style="font-size:14px;color:${modInfo.color};margin-top:6px;font-weight:bold;">Modifier: ${modInfo.name}</div>`
        : "";
      const preview = isBoss
        ? `<div style="color:#ff4444;font-size:14px;">BOSS: ${BOSSES[Math.min(Math.floor(nextWave / 5) - 1, BOSSES.length - 1)].name}</div>`
        : `<div style="color:#aaa;font-size:12px;">${spawns.map((s) => `${ENEMY_DEFS[s.type].name} x${s.count}`).join(", ")}</div>${modLine}`;

      this._hudContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(0,0,20,0.5);">
          <div style="font-size:38px;font-weight:900;color:#44ff44;text-shadow:0 0 15px rgba(0,255,0,0.3),2px 2px 6px #000;">WAVE ${this._wave} COMPLETE</div>
          <div style="font-size:18px;color:#ffd700;margin-top:8px;">+${this._waveReward()} Souls</div>
          <div style="font-size:13px;color:#88ff88;margin-top:4px;">Grail restored +${Math.floor(this._grailMaxHp * 0.08)} HP</div>
          <div style="margin-top:12px;">${preview}</div>
          <div style="margin-top:24px;font-size:16px;color:#88aaff;animation:pulse 1.5s infinite alternate;">Click to open sanctum</div>
        </div>
        <style>
          @keyframes pulse{from{opacity:0.4}to{opacity:1}}
          @keyframes soulPopup{0%{transform:translate(-50%,-50%) scale(0.3);opacity:0}20%{transform:translate(-50%,-50%) scale(1.1);opacity:1}80%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-60%) scale(1.1);opacity:0}}
          @keyframes soulGlow{0%{text-shadow:0 0 30px rgba(255,200,0,0.2)}50%{text-shadow:0 0 50px rgba(255,200,0,0.8),0 0 80px rgba(255,150,0,0.4)}100%{text-shadow:0 0 30px rgba(255,200,0,0.2)}}
        </style>
        <div style="position:absolute;top:28%;left:50%;transform:translate(-50%,-50%);pointer-events:none;text-align:center;z-index:25;animation:soulPopup 2.5s ease-out forwards;">
          <div style="font-size:56px;font-weight:900;color:#ffd700;text-shadow:0 0 30px rgba(255,200,0,0.6),0 0 60px rgba(255,150,0,0.3),3px 3px 8px #000;animation:soulGlow 1s ease-in-out infinite;">+${this._waveReward()}</div>
          <div style="font-size:18px;color:#ffcc44;margin-top:4px;text-shadow:1px 1px 4px #000;">SOULS EARNED</div>
        </div>
        ${this._renderThreatDirections()}`;
      return;
    }

    if (this._phase === "shop") {
      this._renderShopHUD();
      return;
    }

    // Playing / Boss HUD
    const grailPct = Math.max(0, this._grailHp / this._grailMaxHp * 100);
    const grailColor = grailPct > 50 ? "#ffd700" : grailPct > 25 ? "#ff8844" : "#ff3333";

    const mkBar = (label: string, cd: number, maxCd: number, color: string, key: string) => {
      const ready = cd <= 0;
      const pct = ready ? 100 : Math.max(0, (1 - cd / maxCd) * 100);
      return `<div style="margin:3px 0;"><span style="font-size:10px;color:${ready ? color : "#444"};">[${key}] ${label}</span>
        <div style="width:60px;height:4px;background:#222;border-radius:2px;display:inline-block;vertical-align:middle;margin-left:4px;">
          <div style="width:${pct}%;height:100%;background:${ready ? color : "#333"};border-radius:2px;"></div>
        </div></div>`;
    };

    const dashMax = Math.max(0.5, DASH_COOLDOWN - this._upgradeLevels["dash_cd"] * 0.3);

    let bossBar = "";
    if (this._phase === "boss") {
      const boss = this._enemies.find((e) => e.isBoss && !e.dead);
      if (boss?.bossDef) {
        const bp = Math.max(0, boss.hp / boss.maxHp * 100);
        bossBar = `<div style="position:absolute;top:55px;left:50%;transform:translateX(-50%);text-align:center;">
          <div style="font-size:14px;color:#ff4444;font-weight:bold;text-shadow:1px 1px 3px #000;">${boss.bossDef.name}</div>
          <div style="width:280px;height:10px;background:#222;border-radius:5px;margin-top:3px;overflow:hidden;">
            <div style="width:${bp}%;height:100%;background:linear-gradient(90deg,#880000,#ff4444);border-radius:5px;"></div>
          </div></div>`;
      }
    }

    this._hudContainer.innerHTML = `
      <div style="position:absolute;top:10px;left:15px;color:#fff;text-shadow:1px 1px 3px #000;">
        <div style="font-size:20px;font-weight:bold;">Wave ${this._wave}</div>
        <div style="font-size:13px;color:#aaa;margin-top:2px;">Score: ${this._score} &nbsp;|&nbsp; Souls: ${this._souls}</div>
        <div style="font-size:11px;color:#888;">SPS: ${this._currentSPS.toFixed(1)}</div>
        <div style="font-size:12px;color:#aaa;">Enemies: ${this._waveEnemiesKilled}/${this._waveEnemiesTotal}</div>
      </div>
      <div style="position:absolute;top:10px;right:15px;text-align:right;color:#fff;text-shadow:1px 1px 3px #000;">
        <div style="font-size:13px;color:${grailColor};">Grail</div>
        <div style="width:160px;height:12px;background:#222;border-radius:6px;overflow:hidden;margin-top:3px;">
          <div style="width:${grailPct}%;height:100%;background:${grailColor};border-radius:6px;"></div>
        </div>
        <div style="font-size:11px;color:${grailColor};margin-top:2px;">${Math.ceil(this._grailHp)}/${this._grailMaxHp}</div>
        ${this._overflowCharge > 0 ? `<div style="font-size:10px;color:#44ff44;margin-top:4px;">Overflow</div>
        <div style="width:100px;height:5px;background:#222;border-radius:3px;overflow:hidden;margin-top:2px;">
          <div style="width:${this._overflowCharge}%;height:100%;background:linear-gradient(90deg,#22aa44,#44ff44);border-radius:3px;"></div>
        </div>` : ""}
      </div>
      <div style="position:absolute;bottom:15px;left:15px;color:#fff;text-shadow:1px 1px 2px #000;">
        ${mkBar("Dash", this._dashCooldown, dashMax, "#44aaff", "SPC")}
        ${mkBar("Shield", this._shieldCooldown, SHIELD_COOLDOWN, "#88ccff", "SHF")}
        ${mkBar("Nova", this._novaCooldown, NOVA_COOLDOWN, "#ffdd44", "F")}
        ${mkBar("Burst", this._shieldBurstCooldown, SHIELD_BURST_COOLDOWN, "#ffd700", "G")}
      </div>
      ${this._shieldTimer > 0 ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:14px;color:#88ccff;opacity:${Math.min(1, this._shieldTimer)};pointer-events:none;">SHIELDED</div>` : ""}
      ${bossBar}
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;">
        <div style="width:20px;height:20px;border:2px solid rgba(136,204,255,0.5);border-radius:50%;"></div>
        <div style="position:absolute;top:50%;left:50%;width:6px;height:6px;background:rgba(136,204,255,0.7);border-radius:50%;transform:translate(-50%,-50%);"></div>
      </div>
      ${this._comboCount >= 3 ? `<div style="position:absolute;top:85px;left:50%;transform:translateX(-50%);text-align:center;"><div style="font-size:20px;font-weight:bold;color:#ffdd44;text-shadow:0 0 10px rgba(255,200,0,0.5),1px 1px 3px #000;">${this._comboCount}x COMBO</div><div style="font-size:12px;color:#ffaa22;">${this._comboMultiplier}x multiplier</div></div>` : ""}
      ${this._chargeTime > 0 && this._boltCooldown <= 0 ? `<div style="position:absolute;top:calc(50% - 20px);left:50%;transform:translateX(-50%);width:30px;height:4px;background:#333;border-radius:2px;"><div style="width:${Math.min(100, this._chargeTime / 1.0 * 100)}%;height:100%;background:${this._chargeTime >= 1.0 ? "#ffdd44" : "#88aacc"};border-radius:2px;transition:background 0.1s;"></div></div>` : ""}
      ${this._waveModifier !== "twilight" ? `<div style="position:absolute;top:48px;left:15px;font-size:12px;color:${WAVE_MODIFIERS.find((m) => m.id === this._waveModifier)?.color || "#aaa"};text-shadow:1px 1px 2px #000;">${WAVE_MODIFIERS.find((m) => m.id === this._waveModifier)?.name || ""}</div>` : ""}
      ${this._grailHp / this._grailMaxHp < 0.25 ? `<div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;box-shadow:inset 0 0 80px rgba(255,0,0,0.3);"></div>` : ""}
      ${this._phase === "boss" ? `<div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;box-shadow:inset 0 0 120px rgba(40,0,0,0.5),inset 0 0 200px rgba(20,0,20,0.3);"></div>` : ""}
      ${this._grailHealActive ? `<div style="position:absolute;bottom:80px;left:50%;transform:translateX(-50%);font-size:13px;color:#44ff44;text-shadow:0 0 8px rgba(0,255,0,0.4),1px 1px 3px #000;opacity:${0.6 + Math.sin(this._time * 4) * 0.3};">HEALING GRAIL</div>` : ""}
      ${this._screenFlashTimer > 0 ? `<div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;background:rgba(255,0,0,${0.4 * (this._screenFlashTimer / 0.2)});"></div>` : ""}
      ${this._playerHitCooldown > 2.5 ? `<div style="position:absolute;top:55%;left:50%;transform:translate(-50%,-50%);font-size:24px;font-weight:bold;color:#ff4444;text-shadow:0 0 10px rgba(255,0,0,0.6),2px 2px 4px #000;pointer-events:none;">HIT!</div>` : ""}
      ${this._autoFire ? `<div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);font-size:14px;font-weight:bold;color:#44ff44;text-shadow:0 0 8px rgba(0,255,0,0.4),1px 1px 3px #000;">AUTO</div>` : ""}
      ${this._renderMinimap()}
    `;
  }

  private _renderMinimap(): string {
    const size = 120;
    const half = size / 2;
    const mapScale = half / (ARENA_RADIUS + 30); // scale world coords to minimap
    const angle = -this._playerAngle + Math.PI / 2; // rotate so "up" is forward

    let dots = "";

    // Grail dot (gold, center)
    dots += `<div style="position:absolute;left:${half - 3}px;top:${half - 3}px;width:6px;height:6px;background:#ffd700;border-radius:50%;box-shadow:0 0 4px #ffd700;"></div>`;

    // Player dot (blue)
    const px = this._playerPos.x * mapScale;
    const pz = this._playerPos.z * mapScale;
    const rpx = px * Math.cos(angle) - pz * Math.sin(angle);
    const rpz = px * Math.sin(angle) + pz * Math.cos(angle);
    dots += `<div style="position:absolute;left:${half + rpx - 3}px;top:${half - rpz - 3}px;width:6px;height:6px;background:#4488ff;border-radius:50%;box-shadow:0 0 4px #4488ff;"></div>`;

    // Enemy dots (red, smaller)
    for (const enemy of this._enemies) {
      if (enemy.dead) continue;
      const ex = enemy.pos.x * mapScale;
      const ez = enemy.pos.z * mapScale;
      const rex = ex * Math.cos(angle) - ez * Math.sin(angle);
      const rez = ex * Math.sin(angle) + ez * Math.cos(angle);
      // Clamp to minimap circle
      const edist = Math.sqrt(rex * rex + rez * rez);
      let dx = rex, dz = rez;
      if (edist > half - 4) {
        dx = rex / edist * (half - 4);
        dz = rez / edist * (half - 4);
      }
      const dotSize = enemy.isBoss ? 5 : 3;
      const dotColor = enemy.isBoss ? "#ff4444" : "#ff3333";
      dots += `<div style="position:absolute;left:${half + dx - dotSize / 2}px;top:${half - dz - dotSize / 2}px;width:${dotSize}px;height:${dotSize}px;background:${dotColor};border-radius:50%;"></div>`;
    }

    return `<div style="position:absolute;bottom:15px;right:15px;width:${size}px;height:${size}px;border-radius:50%;background:rgba(0,0,20,0.6);border:1px solid rgba(100,150,255,0.3);overflow:hidden;">${dots}</div>`;
  }

  private _renderThreatDirections(): string {
    // Generate 3-4 spawn angles for the next wave preview
    const nextWave = this._wave + 1;
    const isBossNext = nextWave % 5 === 0;
    const numChevrons = isBossNext ? 1 : 3 + (nextWave % 2); // 3-4 chevrons
    // Use wave number as seed for consistent angles per render
    const angles: number[] = [];
    for (let i = 0; i < numChevrons; i++) {
      // Deterministic pseudo-random based on wave and index
      const seed = (nextWave * 137 + i * 53) % 360;
      angles.push((seed / 360) * Math.PI * 2);
    }

    const size = 120;
    const half = size / 2;
    let chevrons = "";
    for (const angle of angles) {
      const cx = half + Math.cos(angle) * (half - 8);
      const cy = half - Math.sin(angle) * (half - 8);
      const rotDeg = -(angle * 180 / Math.PI) + 90; // CSS rotation
      chevrons += `<div style="position:absolute;left:${cx - 6}px;top:${cy - 6}px;width:12px;height:12px;color:#ff4444;font-size:14px;font-weight:bold;transform:rotate(${rotDeg}deg);text-shadow:0 0 4px #ff0000;line-height:12px;text-align:center;">V</div>`;
    }

    return `<div style="position:absolute;bottom:15px;right:15px;width:${size}px;height:${size}px;border-radius:50%;background:rgba(0,0,20,0.6);border:1px solid rgba(100,150,255,0.3);overflow:hidden;">
      <div style="position:absolute;left:${half - 3}px;top:${half - 3}px;width:6px;height:6px;background:#ffd700;border-radius:50%;box-shadow:0 0 4px #ffd700;"></div>
      ${chevrons}
      <div style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%);font-size:8px;color:#ff4444;white-space:nowrap;">THREATS</div>
    </div>`;
  }

  private _renderShopHUD(): void {
    let items = "";
    for (const u of UPGRADE_DEFS) {
      const lvl = this._upgradeLevels[u.id];
      const maxed = lvl >= u.maxLevel;
      const cost = Math.floor(u.baseCost * (1 + lvl * 0.5));
      const canBuy = !maxed && this._souls >= cost;
      items += `<div data-id="${u.id}" style="padding:10px 14px;margin:4px 0;background:${canBuy ? "rgba(40,50,80,0.8)" : "rgba(30,30,40,0.8)"};border:1px solid ${canBuy ? "#4466aa" : "#333"};border-radius:6px;cursor:${canBuy ? "pointer" : "default"};pointer-events:auto;">
        <div style="display:flex;justify-content:space-between;"><span style="font-size:14px;font-weight:bold;color:${maxed ? "#666" : "#ccc"};">${u.name} ${maxed ? "(MAX)" : `Lv.${lvl + 1}`}</span>
        ${!maxed ? `<span style="font-size:12px;color:${canBuy ? "#ffd700" : "#553300"};">${cost}</span>` : ""}</div>
        <div style="font-size:11px;color:#888;margin-top:2px;">${u.desc}</div></div>`;
    }
    this._hudContainer.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:rgba(5,5,15,0.7);">
        <div style="font-size:32px;font-weight:900;color:#88aaff;text-shadow:0 0 15px rgba(100,150,255,0.3),2px 2px 6px #000;">SANCTUM</div>
        <div style="font-size:15px;color:#ffd700;margin:8px 0 16px;">Souls: ${this._souls}</div>
        <div style="max-width:380px;width:90%;max-height:55vh;overflow-y:auto;pointer-events:auto;">${items}</div>
        ${this._renderSynergies()}
        ${this._renderShopStats()}
        <div style="margin-top:12px;font-size:11px;color:#556;text-align:center;">Press <b style="color:#888;">1</b>-<b style="color:#888;">${UPGRADE_DEFS.length}</b> to quick-buy &nbsp;|&nbsp; <b style="color:#888;">Enter</b> for next wave</div>
        <div class="gk-continue" style="margin-top:12px;padding:10px 36px;background:rgba(40,30,60,0.9);border:2px solid #6644aa;border-radius:8px;font-size:16px;color:#88aaff;cursor:pointer;pointer-events:auto;font-weight:bold;">NEXT WAVE ►</div>
      </div>`;
    const handler = (e: Event) => {
      const t = (e.target as HTMLElement).closest("[data-id],.gk-continue") as HTMLElement | null;
      if (!t) return;
      if (t.dataset.id) { this._buyUpgrade(t.dataset.id); this._hudContainer.removeEventListener("click", handler); }
      else if (t.classList.contains("gk-continue")) { this._hudContainer.removeEventListener("click", handler); this._startNextWave(); }
    };
    this._hudContainer.addEventListener("click", handler);
  }

  private _renderSynergies(): string {
    const active = SYNERGY_DEFS.filter((s) => this._hasSynergy(s.id));
    if (active.length === 0) return "";
    let html = `<div style="margin-top:12px;max-width:380px;width:90%;"><div style="font-size:12px;color:#888;margin-bottom:4px;">ACTIVE SYNERGIES</div>`;
    for (const syn of active) {
      html += `<div style="padding:6px 10px;margin:3px 0;background:rgba(50,40,20,0.8);border:1px solid ${syn.color};border-radius:4px;">
        <span style="font-size:13px;font-weight:bold;color:${syn.color};">${syn.name}</span>
        <span style="font-size:11px;color:#aaa;margin-left:8px;">${syn.desc}</span></div>`;
    }
    html += `</div>`;
    return html;
  }

  private _renderShopStats(): string {
    const boltDmg = BOLT_DAMAGE + (this._upgradeLevels["bolt_dmg"] || 0) * 5;
    const rate = 1 - (this._upgradeLevels["bolt_rate"] || 0) * 0.12;
    const fireRate = (1 / (BOLT_COOLDOWN * rate)).toFixed(1);
    const novaDmg = NOVA_DAMAGE + (this._upgradeLevels["nova_dmg"] || 0) * 15;
    const novaRad = NOVA_RADIUS + (this._upgradeLevels["nova_dmg"] || 0) * 3;
    const dashCd = Math.max(0.5, DASH_COOLDOWN - (this._upgradeLevels["dash_cd"] || 0) * 0.3).toFixed(1);
    const shieldDur = (SHIELD_DURATION + (this._upgradeLevels["shield_dur"] || 0) * 0.5).toFixed(1);
    const grailMaxHp = this._grailMaxHp;
    return `<div style="margin-top:12px;max-width:380px;width:90%;padding:10px 14px;background:rgba(20,20,40,0.8);border:1px solid #444;border-radius:6px;">
      <div style="font-size:12px;color:#888;margin-bottom:6px;">STATS</div>
      <div style="font-size:11px;color:#aaa;line-height:1.8;">
        Bolt damage: <span style="color:#88ccff;">${boltDmg}</span><br/>
        Fire rate: <span style="color:#88ccff;">${fireRate}/sec</span><br/>
        Nova damage: <span style="color:#ffdd44;">${novaDmg}</span> (radius <span style="color:#ffdd44;">${novaRad}</span>)<br/>
        Dash cooldown: <span style="color:#44aaff;">${dashCd}s</span><br/>
        Shield duration: <span style="color:#88ccff;">${shieldDur}s</span><br/>
        Grail max HP: <span style="color:#ffd700;">${grailMaxHp}</span>
      </div>
    </div>`;
  }

  // ── Shop ─────────────────────────────────────────────────────────────────

  private _buyUpgrade(id: string): void {
    const def = UPGRADE_DEFS.find((u) => u.id === id);
    if (!def) return;
    const lvl = this._upgradeLevels[id];
    if (lvl >= def.maxLevel) return;
    const cost = Math.floor(def.baseCost * (1 + lvl * 0.5));
    if (this._souls < cost) return;
    this._souls -= cost;
    this._upgradeLevels[id] = lvl + 1;
    if (id === "grail_hp") {
      this._grailMaxHp += 50;
      this._grailHp = Math.min(this._grailHp + 50, this._grailMaxHp);
    }
    this._playSound("buy");
    this._updatePlayerVisuals();
    this._renderShopHUD();
  }

  private _waveReward(): number { return 15 + this._wave * 8; }

  private _hasSynergy(synergyId: string): boolean {
    const syn = SYNERGY_DEFS.find((s) => s.id === synergyId);
    if (!syn) return false;
    return syn.requires.every((uid) => {
      const def = UPGRADE_DEFS.find((u) => u.id === uid);
      return def && this._upgradeLevels[uid] >= def.maxLevel;
    });
  }

  // ── Screen Shake ───────────────────────────────────────────────────────

  private _screenShake(intensity: number): void {
    const origPos = this._camera.position.clone();
    let frames = 0;
    const maxFrames = 12;
    const shake = () => {
      if (frames >= maxFrames || this._destroyed) return;
      frames++;
      const decay = 1 - frames / maxFrames;
      this._camera.position.x = origPos.x + (Math.random() - 0.5) * intensity * decay * 2;
      this._camera.position.y = origPos.y + (Math.random() - 0.5) * intensity * decay * 2;
      requestAnimationFrame(shake);
    };
    shake();
  }

  // ── Player Visual Upgrades ──────────────────────────────────────────────

  private _updatePlayerVisuals(): void {
    // bolt_dmg: increase body emissive intensity
    const boltDmgLvl = this._upgradeLevels["bolt_dmg"] || 0;
    const body = this._playerMesh.children.find((c) => c instanceof THREE.Mesh && (c as THREE.Mesh).geometry instanceof THREE.CapsuleGeometry) as THREE.Mesh | undefined;
    if (body && body.material instanceof THREE.MeshStandardMaterial) {
      body.material.emissiveIntensity = 0.8 + boltDmgLvl * 0.1;
    }

    // pierce: make body more transparent (more ethereal)
    const pierceLvl = this._upgradeLevels["pierce"] || 0;
    if (body && body.material instanceof THREE.MeshStandardMaterial) {
      body.material.opacity = Math.max(0.4, 0.85 - pierceLvl * 0.12);
      body.material.transparent = true;
    }

    // homing: orbiting eye/sensor around head
    const existingEye = this._playerMesh.getObjectByName("homingEye");
    const homingLvl = this._upgradeLevels["homing"] || 0;
    if (homingLvl > 0 && !existingEye) {
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xffaa00, emissiveIntensity: 2, transparent: true, opacity: 0.9 });
      const eyeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), eyeMat);
      eyeMesh.name = "homingEye";
      this._playerMesh.add(eyeMesh);
    }

    // multi: add extra arm/appendage cones
    const multiLvl = this._upgradeLevels["multi"] || 0;
    // Remove old appendages
    const oldAppendages = this._playerMesh.children.filter((c) => c.name.startsWith("multiArm"));
    for (const a of oldAppendages) { this._playerMesh.remove(a); if (a instanceof THREE.Mesh) { a.geometry.dispose(); (a.material as THREE.Material).dispose(); } }
    if (multiLvl > 0) {
      const armMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x4466cc, emissiveIntensity: 1, transparent: true, opacity: 0.7 });
      for (let mi = 0; mi < multiLvl; mi++) {
        const armAngle = ((mi + 1) / (multiLvl + 1)) * Math.PI - Math.PI / 2;
        const arm = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 10), armMat.clone());
        arm.name = `multiArm${mi}`;
        arm.position.set(Math.cos(armAngle) * 0.5, 0.5, Math.sin(armAngle) * 0.3);
        arm.rotation.z = armAngle;
        this._playerMesh.add(arm);
      }
    }
  }

  // ── Input ────────────────────────────────────────────────────────────────

  private _bindInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      this._keys.add(e.code);
      if (e.code === "Escape") {
        if (this._phase === "paused") { this._phase = this._pausedPhase; this._startMusic(); return; }
        window.dispatchEvent(new Event("grailkeeperExit")); return;
      }
      if (e.code === "KeyP" && (this._phase === "playing" || this._phase === "boss")) { this._pausedPhase = this._phase; this._phase = "paused"; this._stopMusic(); return; }
      if (e.code === "KeyP" && this._phase === "paused") { this._phase = this._pausedPhase; this._startMusic(); return; }
      if (this._phase === "shop") {
        // Quick-buy with number keys 1-9
        const digit = parseInt(e.code.replace("Digit", "").replace("Numpad", ""), 10);
        if (digit >= 1 && digit <= UPGRADE_DEFS.length) {
          this._buyUpgrade(UPGRADE_DEFS[digit - 1].id);
          return;
        }
        if (e.code === "Enter" || e.code === "Space") { this._startNextWave(); return; }
      }
      if ((this._phase === "playing" || this._phase === "boss")) {
        if (e.code === "Space" && this._dashCooldown <= 0 && this._dashTimer <= 0) this._startDash();
        if ((e.code === "ShiftLeft" || e.code === "ShiftRight") && this._shieldCooldown <= 0 && this._shieldTimer <= 0) this._activateShield();
        if (e.code === "KeyF" && this._novaCooldown <= 0) this._fireNova();
        if (e.code === "KeyG" && this._shieldBurstCooldown <= 0) this._fireShieldBurst();
        if (e.code === "KeyT") this._autoFire = !this._autoFire;
      }
    };
    this._onKeyUp = (e: KeyboardEvent) => { this._keys.delete(e.code); };
    this._onMouseMove = (e: MouseEvent) => {
      this._mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this._mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    this._onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      this._mouseDown = true;
      if (this._phase === "title") { this._startGame(); return; }
      if (this._phase === "defeat" || this._phase === "victory") { window.dispatchEvent(new Event("grailkeeperExit")); return; }
      if (this._phase === "between_waves") { this._phase = "shop"; this._souls += this._waveReward(); this._grailHp = Math.min(this._grailHp + Math.floor(this._grailMaxHp * 0.08), this._grailMaxHp); this._renderHUD(); return; }
    };
    this._onMouseUp = () => { this._mouseDown = false; };
    this._onResize = () => { this._camera.aspect = window.innerWidth / window.innerHeight; this._camera.updateProjectionMatrix(); this._renderer.setSize(window.innerWidth, window.innerHeight); };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
    window.addEventListener("resize", this._onResize);
  }

  private _startGame(): void {
    this._phase = "between_waves";
    this._wave = 0; this._score = 0; this._souls = 0; this._totalKills = 0;
    this._grailHp = GRAIL_MAX_HP; this._grailMaxHp = GRAIL_MAX_HP;
    this._playerAngle = 0; this._playerAltitude = 8;
    this._dashCooldown = 0; this._shieldCooldown = 0; this._novaCooldown = 0; this._shieldBurstCooldown = 0;
    this._dashTimer = 0; this._shieldTimer = 0;
    for (const u of UPGRADE_DEFS) this._upgradeLevels[u.id] = 0;
    // Clean up enemy meshes from scene (dispose geometry/materials)
    for (const e of this._enemies) {
      this._scene.remove(e.mesh);
      e.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else if (child.material) child.material.dispose();
        }
      });
    }
    // Clean up bolt meshes and trails from scene
    for (const b of this._bolts) {
      if (b.alive) {
        this._scene.remove(b.mesh); b.mesh.geometry.dispose(); (b.mesh.material as THREE.Material).dispose();
        this._scene.remove(b.trail); b.trail.geometry.dispose(); (b.trail.material as THREE.Material).dispose();
      }
    }
    // Clean up enemy bolt meshes from scene
    for (const eb of this._enemyBolts) {
      if (eb.alive) {
        this._scene.remove(eb.mesh); eb.mesh.geometry.dispose(); (eb.mesh.material as THREE.Material).dispose();
      }
    }
    // Clean up active particles
    for (const p of this._particles) { p.cleanup(); }
    this._particles = [];
    this._trailParticles = [];
    this._enemies = []; this._bolts = []; this._enemyBolts = [];
    this._comboCount = 0; this._comboTimer = 0; this._comboMultiplier = 1;
    this._waveModifier = "twilight"; this._chargeTime = 0;
    this._grailHealActive = false;
    if (this._grailHealGlow) { this._grailMesh.remove(this._grailHealGlow); this._grailHealGlow = null; }
    this._playerHitCooldown = 0; this._screenFlashTimer = 0;
    this._overflowCharge = 0;
    this._recentSouls = []; this._currentSPS = 0;
    this._warningTimer = 0;
    this._killsByType = {};
    this._autoFire = false;
    this._bossCinematicFreeze = 0;
    this._bossCinematicName = "";

    this._startMusic();
  }

  // ── Wave Management ──────────────────────────────────────────────────────

  private _startNextWave(): void {
    this._wave++;
    this._waveEnemiesKilled = 0;
    // Reset combo between waves
    this._comboCount = 0; this._comboTimer = 0; this._comboMultiplier = 1;
    // Clean up any leftover enemy bolts from previous wave
    for (const eb of this._enemyBolts) {
      if (eb.alive) {
        this._scene.remove(eb.mesh); eb.mesh.geometry.dispose(); (eb.mesh.material as THREE.Material).dispose();
      }
    }
    this._enemyBolts = [];

    // Pick wave modifier for non-boss waves
    if (this._wave % 5 === 0) {
      this._waveModifier = "twilight";
    } else {
      this._waveModifier = WAVE_MODIFIERS[Math.floor(Math.random() * WAVE_MODIFIERS.length)].id;
    }

    if (this._wave % 5 === 0) {
      this._phase = "boss";
      const bIdx = Math.min(Math.floor(this._wave / 5) - 1, BOSSES.length - 1);
      this._spawnBoss(BOSSES[bIdx]);
      this._waveSpawns = [{ type: "imp", count: 3 + this._wave, delay: 1.5 }];
      this._spawnTimers = [0]; this._spawnCounts = [0];
      this._waveEnemiesTotal = this._waveSpawns[0].count + 1;
      this._playSound("boss_roar");
    } else {
      this._phase = "playing";
      this._waveSpawns = generateWave(this._wave);
      // Swarm modifier: 1.5x enemy count
      if (this._waveModifier === "swarm") {
        for (const ws of this._waveSpawns) ws.count = Math.ceil(ws.count * 1.5);
      }
      this._spawnTimers = this._waveSpawns.map(() => 0);
      this._spawnCounts = this._waveSpawns.map(() => 0);
      this._waveEnemiesTotal = this._waveSpawns.reduce((s, w) => s + w.count, 0);
    }
    this._playSound("launch");

    // Wave announcement banner
    const banner = document.createElement("div");
    const isBossWave = this._wave % 5 === 0;
    const bossIdx = Math.min(Math.floor(this._wave / 5) - 1, BOSSES.length - 1);
    const themedWave = THEMED_WAVE_NAMES[this._wave];
    banner.innerHTML = isBossWave
      ? `<div style="font-size:48px;font-weight:900;color:#ff4444;text-shadow:0 0 20px rgba(255,0,0,0.5),3px 3px 8px #000;">BOSS</div><div style="font-size:22px;color:#ff6644;margin-top:4px;">${BOSSES[bossIdx].name}</div>`
      : themedWave
        ? `<div style="font-size:48px;font-weight:900;color:${themedWave.color};text-shadow:0 0 20px rgba(100,150,255,0.5),3px 3px 8px #000;">WAVE ${this._wave}</div><div style="font-size:22px;color:${themedWave.color};margin-top:4px;">${themedWave.name}</div>`
        : `<div style="font-size:48px;font-weight:900;color:#88ccff;text-shadow:0 0 20px rgba(100,150,255,0.5),3px 3px 8px #000;">WAVE ${this._wave}</div>`;
    banner.style.cssText = "position:absolute;top:30%;left:50%;transform:translate(-50%,-50%) scale(0.5);pointer-events:none;text-align:center;z-index:20;transition:all 0.4s ease-out;opacity:0;";
    this._hudContainer.appendChild(banner);
    requestAnimationFrame(() => {
      banner.style.transform = "translate(-50%,-50%) scale(1)";
      banner.style.opacity = "1";
    });
    setTimeout(() => {
      banner.style.opacity = "0";
      banner.style.transform = "translate(-50%,-50%) scale(1.2)";
    }, 1600);
    setTimeout(() => { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 2200);
  }

  // ── Player Actions ───────────────────────────────────────────────────────

  private _startDash(): void {
    this._dashTimer = DASH_DURATION;
    const dashMax = Math.max(0.5, DASH_COOLDOWN - this._upgradeLevels["dash_cd"] * 0.3);
    this._dashCooldown = dashMax;
    // Dash in current orbit direction
    const tangentAngle = this._playerAngle + Math.PI / 2;
    const dir = this._keys.has("KeyA") ? -1 : 1;
    this._dashDir.set(Math.cos(tangentAngle) * dir, 0, Math.sin(tangentAngle) * dir);
    this._isInvulnerable = true;
    this._playSound("dash");

    // Dash afterimage trail (emissive blue, player-colored)
    for (let di = 0; di < 8; di++) {
      const afterMat = new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x4466cc, emissiveIntensity: 1.5, transparent: true, opacity: 0.6, depthWrite: false });
      const afterMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 6), afterMat);
      const offset = this._dashDir.clone().multiplyScalar(di * DASH_SPEED * DASH_DURATION / 8);
      afterMesh.position.copy(this._playerPos).add(offset);
      afterMesh.lookAt(afterMesh.position.clone().add(this._dashDir));
      const delay = di * 0.03;
      this._addParticle(afterMesh, 0.5 + delay, (el) => {
        const t = Math.max(0, el - delay);
        afterMat.opacity = 0.6 * (1 - t / 0.5);
        afterMesh.scale.setScalar(1 - t / 0.5 * 0.7);
      });
    }

    // Speed line effect: thin stretched planes behind player in dash direction
    for (let sl = 0; sl < 5; sl++) {
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
      const lineMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 2.5), lineMat);
      const lateralOffset = new THREE.Vector3(-this._dashDir.z, 0, this._dashDir.x).multiplyScalar((sl - 2) * 0.4 + (Math.random() - 0.5) * 0.3);
      const behindOffset = this._dashDir.clone().multiplyScalar(-1 - Math.random() * 2);
      lineMesh.position.copy(this._playerPos).add(lateralOffset).add(behindOffset);
      lineMesh.position.y += (Math.random() - 0.5) * 1.0;
      lineMesh.lookAt(lineMesh.position.clone().add(this._dashDir));
      this._addParticle(lineMesh, 0.35, (el) => {
        lineMat.opacity = 0.5 * (1 - el / 0.35);
        lineMesh.scale.y = 1 + el * 3;
      });
    }

    // Flash the player's glow light brighter during dash
    const originalIntensity = this._playerGlow.intensity;
    this._playerGlow.intensity = 8;
    setTimeout(() => { this._playerGlow.intensity = originalIntensity; }, DASH_DURATION * 1000);
  }

  private _activateShield(): void {
    const dur = SHIELD_DURATION + this._upgradeLevels["shield_dur"] * 0.5;
    this._shieldTimer = dur;
    this._shieldCooldown = SHIELD_COOLDOWN;
    this._isInvulnerable = true;
    (this._shieldMesh.material as THREE.MeshBasicMaterial).opacity = 0.3;
    this._playSound("shield");

    // Hexagonal wireframe overlay inside shield sphere
    const icoMat = new THREE.MeshBasicMaterial({ color: 0x88ddff, wireframe: true, transparent: true, opacity: 0.5, depthWrite: false });
    const icoMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1), icoMat);
    icoMesh.position.copy(this._playerPos);
    this._addParticle(icoMesh, dur, (el) => {
      icoMesh.position.copy(this._playerPos);
      icoMesh.rotation.y = this._time * 2;
      icoMesh.rotation.x = this._time * 0.8;
      icoMat.opacity = 0.5 * (1 - el / dur);
    });

    // Shield activation flash of light
    const shieldFlash = new THREE.PointLight(0x88ccff, 10, 20);
    shieldFlash.position.copy(this._playerPos);
    this._addParticle(shieldFlash as unknown as THREE.Object3D, 0.3, (el) => {
      shieldFlash.position.copy(this._playerPos);
      (shieldFlash as THREE.PointLight).intensity = 10 * (1 - el / 0.3);
    }, () => { this._scene.remove(shieldFlash); });
    this._scene.add(shieldFlash);

    // Rotating shield rune particles around player
    for (let sr = 0; sr < 8; sr++) {
      const runeMat = new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide });
      const runeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25), runeMat);
      runeMesh.position.copy(this._playerPos);
      const baseAngle = (sr / 8) * Math.PI * 2;
      const runeY = (sr % 3 - 1) * 0.5;
      this._addParticle(runeMesh, dur, (el) => {
        const angle = baseAngle + this._time * 3;
        const radius = 1.8;
        runeMesh.position.set(
          this._playerPos.x + Math.cos(angle) * radius,
          this._playerPos.y + runeY + Math.sin(this._time * 4 + sr) * 0.2,
          this._playerPos.z + Math.sin(angle) * radius,
        );
        runeMesh.rotation.y = angle + Math.PI / 2;
        runeMat.opacity = 0.7 * (1 - el / dur);
      });
    }
  }

  private _fireShieldBurst(): void {
    this._shieldBurstCooldown = SHIELD_BURST_COOLDOWN;
    const grailPos = new THREE.Vector3(0, GRAIL_Y, 0);

    // Push all enemies within radius outward by SHIELD_BURST_PUSH units
    for (const enemy of this._enemies) {
      if (enemy.dead) continue;
      const dist = enemy.pos.distanceTo(grailPos);
      if (dist < SHIELD_BURST_RADIUS) {
        const pushDir = enemy.pos.clone().sub(grailPos).normalize();
        enemy.pos.add(pushDir.multiplyScalar(SHIELD_BURST_PUSH));
        enemy.mesh.position.copy(enemy.pos);
      }
    }

    // Visual: expanding golden ring from the grail
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.15, 8, 32), ringMat);
    ringMesh.position.copy(grailPos);
    ringMesh.rotation.x = Math.PI / 2;
    this._addParticle(ringMesh, 0.7, (el) => {
      ringMesh.scale.setScalar(1 + (SHIELD_BURST_RADIUS - 1) * (el / 0.7));
      ringMat.opacity = 0.6 * (1 - el / 0.7);
    });

    // Golden flash at grail
    const burstFlash = new THREE.PointLight(0xffd700, 10, 30);
    burstFlash.position.copy(grailPos);
    this._addParticle(burstFlash as unknown as THREE.Object3D, 0.4, (el) => {
      (burstFlash as THREE.PointLight).intensity = 10 * (1 - el / 0.4);
    }, () => { this._scene.remove(burstFlash); });
    this._scene.add(burstFlash);

    this._playSound("shield_burst");
  }

  private _fireNova(): void {
    this._novaCooldown = NOVA_COOLDOWN;
    const novaDmg = NOVA_DAMAGE + this._upgradeLevels["nova_dmg"] * 15;
    const novaRad = NOVA_RADIUS + this._upgradeLevels["nova_dmg"] * 3;

    // Damage all enemies in radius of player
    for (const enemy of this._enemies) {
      if (enemy.dead) continue;
      const dist = enemy.pos.distanceTo(this._playerPos);
      if (dist < novaRad) {
        const dmg = novaDmg * (1 - dist / novaRad * 0.5);
        this._damageEnemy(enemy, dmg);
      }
    }

    // Visual: expanding golden sphere
    const novaMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
    const novaMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), novaMat);
    novaMesh.position.copy(this._playerPos);
    this._addParticle(novaMesh, 0.8, (el) => {
      novaMesh.scale.setScalar(1 + (novaRad / 1) * el);
      novaMat.opacity = 0.4 * (1 - el / 0.8);
    });

    // Flash
    const flash = new THREE.PointLight(0xffdd44, 8, 40);
    flash.position.copy(this._playerPos);
    this._addParticle(flash as unknown as THREE.Object3D, 0.5, (el) => {
      (flash as THREE.PointLight).intensity = 8 * (1 - el / 0.5);
    }, () => { this._scene.remove(flash); });
    this._scene.add(flash);

    // Expanding nova ring
    const novaRingMat = new THREE.MeshBasicMaterial({ color: 0xffcc22, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    const novaRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.3, 8, 24), novaRingMat);
    novaRing.position.copy(this._playerPos);
    novaRing.rotation.x = Math.PI / 2;
    this._addParticle(novaRing, 0.6, (el) => {
      novaRing.scale.setScalar(1 + (novaRad - 1) * (el / 0.6));
      novaRingMat.opacity = 0.5 * (1 - el / 0.6);
    });

    // 12 radial spike cones
    for (let ns = 0; ns < 12; ns++) {
      const spikeAngle = (ns / 12) * Math.PI * 2;
      const spikeMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.7, depthWrite: false });
      const spikeMesh = new THREE.Mesh(new THREE.ConeGeometry(0.1, 2, 10), spikeMat);
      spikeMesh.position.copy(this._playerPos);
      spikeMesh.rotation.z = Math.PI / 2;
      spikeMesh.rotation.y = spikeAngle;
      this._addParticle(spikeMesh, 0.6, (el) => {
        const progress = el / 0.6;
        const dist = novaRad * progress;
        spikeMesh.position.set(
          this._playerPos.x + Math.cos(spikeAngle) * dist,
          this._playerPos.y,
          this._playerPos.z + Math.sin(spikeAngle) * dist,
        );
        spikeMesh.scale.setScalar(1 + progress * 2);
        spikeMat.opacity = 0.7 * (1 - progress);
      });
    }

    this._playSound("nova");
  }

  private _fireBolt(): void {
    if (this._boltCooldown > 0) return;
    const rate = 1 - this._upgradeLevels["bolt_rate"] * 0.12;
    this._boltCooldown = BOLT_COOLDOWN * rate;

    // Charge shot detection
    const charged = this._chargeTime >= 1.0;
    this._chargeTime = 0;

    let dmg = BOLT_DAMAGE + this._upgradeLevels["bolt_dmg"] * 5;
    if (charged) dmg *= 3;

    // Fire toward mouse direction (raycast from camera)
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(this._mouseX, this._mouseY), this._camera);
    const dir = ray.ray.direction.clone().normalize();

    const boltLevel = this._upgradeLevels["bolt_dmg"];
    let boltRadius = 0.15 + boltLevel * 0.02;
    let boltGlowIntensity = 1.5 + boltLevel * 0.5;
    let boltEmissiveIntensity = 2 + boltLevel * 0.4;
    if (charged) { boltRadius *= 1.5; boltGlowIntensity *= 2; boltEmissiveIntensity *= 1.5; }
    const boltColor = charged ? 0xffeedd : 0x88ccff;
    const boltEmissive = charged ? 0xffcc44 : 0x4488ff;
    const boltMat = new THREE.MeshStandardMaterial({ color: boltColor, emissive: boltEmissive, emissiveIntensity: boltEmissiveIntensity, transparent: true, opacity: 0.9 });
    const bolt = new THREE.Mesh(new THREE.SphereGeometry(boltRadius, 12, 10), boltMat);
    bolt.position.copy(this._playerPos);
    bolt.castShadow = true;
    this._scene.add(bolt);

    // Bolt glow (scales with level)
    const bGlow = new THREE.PointLight(charged ? 0xffcc44 : 0x4488ff, boltGlowIntensity, 5 + boltLevel);
    bolt.add(bGlow);

    // At max level, add a secondary orbiting particle around each bolt
    if (boltLevel >= 6) {
      const orbitMat = new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.8, depthWrite: false });
      const orbitMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), orbitMat);
      bolt.add(orbitMesh);
      orbitMesh.name = "boltOrbit";
    }

    // Bolt trail
    const trailCount = 20;
    const trailPositions = new Float32Array(trailCount * 3);
    for (let i = 0; i < trailCount; i++) {
      trailPositions[i * 3] = bolt.position.x;
      trailPositions[i * 3 + 1] = bolt.position.y;
      trailPositions[i * 3 + 2] = bolt.position.z;
    }
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({ color: charged ? 0xffcc44 : 0x4488ff, size: charged ? 0.18 : 0.12, transparent: true, opacity: 0.4, depthWrite: false });
    const trail = new THREE.Points(trailGeo, trailMat);
    this._scene.add(trail);

    this._bolts.push({ mesh: bolt, dir, alive: true, time: 0, damage: dmg, trail, pierceCount: 0, isCharged: charged });

    // Multi-bolt upgrade: fire additional bolts at angle offsets
    const multiLevel = this._upgradeLevels["multi"];
    if (multiLevel > 0) {
      const extraCount = multiLevel >= 2 ? 2 : 1; // level 1 = 1 extra (2 total), level 2-3 = 2 extra (3 total)
      const extraDmg = dmg * 0.7;
      for (let mi = 0; mi < extraCount; mi++) {
        const angleOffset = (mi === 0 ? -0.15 : 0.15) * (multiLevel >= 2 ? 1 : 1);
        // Rotate direction around up axis
        const extraDir = dir.clone();
        const cos = Math.cos(angleOffset);
        const sin = Math.sin(angleOffset);
        const rx = extraDir.x * cos - extraDir.z * sin;
        const rz = extraDir.x * sin + extraDir.z * cos;
        extraDir.x = rx;
        extraDir.z = rz;
        extraDir.normalize();

        const eBoltMat = new THREE.MeshStandardMaterial({ color: boltColor, emissive: boltEmissive, emissiveIntensity: boltEmissiveIntensity * 0.8, transparent: true, opacity: 0.8 });
        const eBolt = new THREE.Mesh(new THREE.SphereGeometry(boltRadius * 0.85, 12, 10), eBoltMat);
        eBolt.position.copy(this._playerPos);
        eBolt.castShadow = true;
        this._scene.add(eBolt);
        const eGlow = new THREE.PointLight(charged ? 0xffcc44 : 0x4488ff, boltGlowIntensity * 0.7, 4 + boltLevel);
        eBolt.add(eGlow);
        const eTrailCount = 20;
        const eTrailPositions = new Float32Array(eTrailCount * 3);
        for (let ti = 0; ti < eTrailCount; ti++) {
          eTrailPositions[ti * 3] = eBolt.position.x;
          eTrailPositions[ti * 3 + 1] = eBolt.position.y;
          eTrailPositions[ti * 3 + 2] = eBolt.position.z;
        }
        const eTrailGeo = new THREE.BufferGeometry();
        eTrailGeo.setAttribute("position", new THREE.BufferAttribute(eTrailPositions, 3));
        const eTrailMat = new THREE.PointsMaterial({ color: charged ? 0xffcc44 : 0x4488ff, size: 0.1, transparent: true, opacity: 0.3, depthWrite: false });
        const eTrail = new THREE.Points(eTrailGeo, eTrailMat);
        this._scene.add(eTrail);
        this._bolts.push({ mesh: eBolt, dir: extraDir, alive: true, time: 0, damage: extraDmg, trail: eTrail, pierceCount: 0, isCharged: charged });
      }
    }

    // Muzzle flash
    const muzzleMat = new THREE.MeshBasicMaterial({ color: charged ? 0xffeedd : 0x88ccff, transparent: true, opacity: 0.8, depthWrite: false });
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(charged ? 0.5 : 0.3, 12, 10), muzzleMat);
    muzzle.position.copy(this._playerPos);
    this._addParticle(muzzle, 0.1, (el) => {
      const progress = el / 0.1;
      muzzle.scale.setScalar(1 + progress);
      muzzleMat.opacity = 0.8 * (1 - progress);
    });

    this._playSound("bolt");
  }

  // ── Enemy Spawning ───────────────────────────────────────────────────────

  private _spawnEnemy(type: EnemyType): void {
    const def = ENEMY_DEFS[type];
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.7, emissive: def.color, emissiveIntensity: 0.2 });

    // Body
    if (def.canFly) {
      const body = new THREE.Mesh(new THREE.ConeGeometry(def.size * 0.4, def.size, 12), mat);
      body.rotation.x = Math.PI / 2;
      body.castShadow = true;
      group.add(body);
      // Wings
      const wingMat = new THREE.MeshStandardMaterial({ color: def.color, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(def.size * 0.8, def.size * 0.4), wingMat);
        wing.position.set(s * def.size * 0.5, 0, 0);
        wing.rotation.y = s * 0.3;
        wing.name = s === -1 ? "wL" : "wR";
        group.add(wing);
      }
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(def.size * 0.6, def.size, def.size * 0.5), mat);
      body.castShadow = true;
      group.add(body);
      // Eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
      for (const ex of [-0.15, 0.15]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), eyeMat);
        eye.position.set(ex * def.size, def.size * 0.3, -def.size * 0.25);
        group.add(eye);
      }
    }

    // Enemy-type-specific details
    if (def.canFly && type === "wraith") {
      const wraithTorusMat = new THREE.MeshBasicMaterial({ color: 0x8844cc, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
      const wraithTorus = new THREE.Mesh(new THREE.TorusGeometry(def.size * 0.6, 0.08, 12, 12), wraithTorusMat);
      wraithTorus.rotation.x = Math.PI / 2;
      wraithTorus.name = "wraithSwirl";
      group.add(wraithTorus);
    } else if (type === "dark_knight") {
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.8, roughness: 0.3 });
      for (const sx of [-1, 1]) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 10), spikeMat);
        spike.position.set(sx * def.size * 0.35, def.size * 0.4, 0);
        group.add(spike);
      }
      const shieldMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.7, roughness: 0.4 });
      const shield = new THREE.Mesh(new THREE.BoxGeometry(def.size * 0.5, def.size * 0.6, 0.08), shieldMat);
      shield.position.set(0, 0, -def.size * 0.3);
      group.add(shield);
    } else if (type === "shadow_drake") {
      const tailMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.7 });
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, def.size * 1.2, 10), tailMat);
      tail.position.set(0, 0, def.size * 0.5);
      tail.rotation.x = Math.PI / 2;
      group.add(tail);
      const spineMat = new THREE.MeshStandardMaterial({ color: 0x553355, roughness: 0.6 });
      for (let sr = 0; sr < 3; sr++) {
        const spine = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 10), spineMat);
        spine.position.set(0, def.size * 0.25, -def.size * 0.2 + sr * def.size * 0.25);
        group.add(spine);
      }
    } else if (type === "gargoyle") {
      const hornMat = new THREE.MeshStandardMaterial({ color: 0x667766, roughness: 0.6 });
      for (const hx of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 10), hornMat);
        horn.position.set(hx * def.size * 0.2, def.size * 0.4, 0);
        horn.rotation.z = hx * 0.4;
        group.add(horn);
      }
    } else if (type === "herald") {
      // Orange glow light
      const heraldGlow = new THREE.PointLight(0xcc8800, 2, 10);
      heraldGlow.position.y = def.size * 0.3;
      group.add(heraldGlow);
      // Crown mesh (small torus on top)
      const crownMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xcc8800, emissiveIntensity: 1.5, metalness: 0.8, roughness: 0.2 });
      const crown = new THREE.Mesh(new THREE.TorusGeometry(def.size * 0.3, 0.06, 12, 12), crownMat);
      crown.position.y = def.size * 0.5;
      crown.rotation.x = Math.PI / 2;
      crown.name = "heraldCrown";
      group.add(crown);
    }

    // HP bar
    const barW = def.size + 0.3;
    const hpBarBg = new THREE.Mesh(new THREE.PlaneGeometry(barW, 0.12), new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide, depthWrite: false }));
    hpBarBg.position.y = def.size * 0.6 + 0.3;
    hpBarBg.renderOrder = 1;
    group.add(hpBarBg);
    const hpBar = new THREE.Mesh(new THREE.PlaneGeometry(barW, 0.1), new THREE.MeshBasicMaterial({ color: 0xcc3333, side: THREE.DoubleSide, depthWrite: false }));
    hpBar.position.set(0, def.size * 0.6 + 0.3, -0.01);
    hpBar.renderOrder = 2;
    group.add(hpBar);

    // Spawn from random direction, far out
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = ARENA_RADIUS + 20 + Math.random() * 15;
    const alt = def.canFly ? 3 + Math.random() * 12 : 1;
    const pos = new THREE.Vector3(Math.cos(angle) * spawnDist, alt, Math.sin(angle) * spawnDist);
    group.position.copy(pos);
    this._scene.add(group);

    let scaledHp = Math.floor(def.hp * (1 + Math.max(0, this._wave - 5) * 0.1));
    // Wave modifier: HP adjustments (doubled intensity for waves 19-20)
    if (this._waveModifier === "armored") scaledHp = Math.floor(scaledHp * (this._wave >= 19 ? 1.8 : 1.4));
    else if (this._waveModifier === "swarm") scaledHp = Math.floor(scaledHp * 0.7);

    // Spawn warning: pulsing red sphere at spawn position for 0.5s
    const warningMat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.8, depthWrite: false });
    const warningMesh = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), warningMat);
    warningMesh.position.copy(pos);
    this._addParticle(warningMesh, 0.5, (el) => {
      const pulse = 0.8 + Math.sin(el * 20) * 0.4;
      warningMat.opacity = pulse * (1 - el / 0.5);
      warningMesh.scale.setScalar(0.8 + Math.sin(el * 16) * 0.3);
    });
    // Spawn warning glow light
    const warningLight = new THREE.PointLight(0xff2222, 3, 12);
    warningLight.position.copy(pos);
    this._addParticle(warningLight as unknown as THREE.Object3D, 0.5, (el) => {
      (warningLight as THREE.PointLight).intensity = 3 * (1 - el / 0.5) * (0.5 + Math.sin(el * 20) * 0.5);
    }, () => { this._scene.remove(warningLight); });
    this._scene.add(warningLight);

    this._enemies.push({
      mesh: group, type, hp: scaledHp, maxHp: scaledHp, pos, dead: false,
      hitFlash: 0, isBoss: false, bossAbilityTimer: 0, bossAbilityThreshold: 3 + Math.random() * 2,
      draining: false,
      angle, altitude: alt, hpBar, hpBarBg, spawnDelay: 0.5, enraged: false,
    });
  }

  private _spawnBoss(bossDef: BossDef): void {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: bossDef.color, roughness: 0.4, metalness: 0.3, emissive: bossDef.color, emissiveIntensity: 0.4 });

    // Massive body
    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(bossDef.size * 0.5, 1), mat);
    body.castShadow = true;
    group.add(body);

    // Horns/crown
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xaa0000, emissive: 0x660000, emissiveIntensity: 1 });
    for (const hx of [-1, 0, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2, 10), hornMat);
      horn.position.set(hx * bossDef.size * 0.3, bossDef.size * 0.5 + 0.5, 0);
      horn.rotation.z = hx * 0.3;
      group.add(horn);
    }

    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3 });
    for (const ex of [-0.5, 0.5]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), eyeMat);
      eye.position.set(ex, bossDef.size * 0.2, -bossDef.size * 0.4);
      group.add(eye);
    }

    // Dark aura (pulsing, expands/contracts)
    const auraMat = new THREE.MeshBasicMaterial({ color: bossDef.color, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
    const aura = new THREE.Mesh(new THREE.SphereGeometry(bossDef.size, 12, 8), auraMat);
    aura.name = "bossAura";
    group.add(aura);

    // Ground shadow circle beneath boss
    const groundShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
    const groundShadow = new THREE.Mesh(new THREE.CircleGeometry(bossDef.size * 1.5, 24), groundShadowMat);
    groundShadow.rotation.x = -Math.PI / 2;
    groundShadow.name = "bossGroundShadow";
    group.add(groundShadow);

    // Mark eyes with a name for dynamic glow
    const eyeChildren = group.children.filter((c) => c instanceof THREE.Mesh && (c as THREE.Mesh).material instanceof THREE.MeshStandardMaterial && ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).emissive.getHex() === 0xff0000);
    eyeChildren.forEach((e, i) => { e.name = `bossEye${i}`; });

    // Glow
    const bossLight = new THREE.PointLight(0xff2200, 2, 15);
    group.add(bossLight);

    // HP bar
    const bw = bossDef.size + 2;
    const hpBarBg = new THREE.Mesh(new THREE.PlaneGeometry(bw, 0.3), new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide, depthWrite: false }));
    hpBarBg.position.y = bossDef.size * 0.6 + 1;
    group.add(hpBarBg);
    const hpBar = new THREE.Mesh(new THREE.PlaneGeometry(bw, 0.25), new THREE.MeshBasicMaterial({ color: 0xff3333, side: THREE.DoubleSide, depthWrite: false }));
    hpBar.position.set(0, bossDef.size * 0.6 + 1, -0.01);
    group.add(hpBar);

    const angle = Math.random() * Math.PI * 2;
    const pos = new THREE.Vector3(Math.cos(angle) * (ARENA_RADIUS + 25), 8, Math.sin(angle) * (ARENA_RADIUS + 25));
    group.position.copy(pos);
    this._scene.add(group);

    const scaledHp = Math.floor(bossDef.hp * (1 + (this._wave / 5 - 1) * 0.4));

    this._enemies.push({
      mesh: group, type: "imp", hp: scaledHp, maxHp: scaledHp, pos, dead: false,
      hitFlash: 0, isBoss: true, bossDef, bossAbilityTimer: 0, bossAbilityThreshold: 0,
      draining: false,
      angle, altitude: 8, hpBar, hpBarBg, spawnDelay: 0, enraged: false,
    });
  }

  // ── Damage ───────────────────────────────────────────────────────────────

  private _spawnFloatingText(worldPos: THREE.Vector3, text: string, color: string): void {
    const pos3 = worldPos.clone();
    pos3.project(this._camera);
    const x = (pos3.x * 0.5 + 0.5) * 100;
    const y = (1 - (pos3.y * 0.5 + 0.5)) * 100;
    const el = document.createElement("div");
    el.textContent = text;
    el.style.cssText = `position:absolute;left:${x}%;top:${y}%;color:${color};font-size:18px;font-weight:bold;pointer-events:none;text-shadow:1px 1px 3px #000;transform:translate(-50%,-50%);z-index:10;transition:all 0.8s ease-out;opacity:1;`;
    this._hudContainer.appendChild(el);
    requestAnimationFrame(() => {
      el.style.top = `${y - 6}%`;
      el.style.opacity = "0";
    });
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 850);
  }

  private _damageEnemy(enemy: EnemyState, damage: number): void {
    enemy.hp -= damage;
    enemy.hitFlash = 0.12;
    this._spawnFloatingText(enemy.pos, `-${Math.floor(damage)}`, "#88ccff");
    if (enemy.hp <= 0) {
      enemy.dead = true;
      this._waveEnemiesKilled++;
      this._totalKills++;

      // Track kills per type
      const killTypeName = enemy.isBoss && enemy.bossDef ? enemy.bossDef.name : ENEMY_DEFS[enemy.type].name;
      this._killsByType[killTypeName] = (this._killsByType[killTypeName] || 0) + 1;

      // Combo system
      this._comboCount++;
      this._comboTimer = 2.0;
      if (this._comboCount >= 9) this._comboMultiplier = 2.5;
      else if (this._comboCount >= 6) this._comboMultiplier = 2.0;
      else if (this._comboCount >= 3) this._comboMultiplier = 1.5;
      else this._comboMultiplier = 1;

      const def = enemy.isBoss && enemy.bossDef ? enemy.bossDef : ENEMY_DEFS[enemy.type];

      // Close-range kill bonus (15 units covers enemies near the orbit path)
      const closeRange = enemy.pos.distanceTo(this._playerPos) < 15 ? 1.5 : 1;

      // Bounty wave modifier
      const bountyMult = this._waveModifier === "bounty" ? 2 : 1;

      this._score += Math.floor(def.points * this._comboMultiplier);
      const soulsEarned = Math.floor(def.points / 8 * closeRange * bountyMult * this._comboMultiplier);
      this._souls += soulsEarned;
      this._recentSouls.push({ time: this._time, amount: soulsEarned });
      // Type-specific death effects
      if (enemy.type === "wraith" && !enemy.isBoss) {
        for (let ww = 0; ww < 6; ww++) {
          const wispMat = new THREE.MeshBasicMaterial({ color: 0x8844cc, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
          const wispPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), wispMat);
          wispPlane.position.copy(enemy.pos);
          const wispAngle = (ww / 6) * Math.PI * 2;
          this._addParticle(wispPlane, 1.5, (el) => {
            const progress = el / 1.5;
            wispPlane.position.x = enemy.pos.x + Math.cos(wispAngle + progress * 4) * (0.5 + progress * 1.5);
            wispPlane.position.y = enemy.pos.y + progress * 3;
            wispPlane.position.z = enemy.pos.z + Math.sin(wispAngle + progress * 4) * (0.5 + progress * 1.5);
            wispPlane.rotation.y = progress * 6;
            wispMat.opacity = 0.5 * (1 - progress);
          });
        }
      } else if (enemy.type === "dark_knight" && !enemy.isBoss) {
        for (let af = 0; af < 4; af++) {
          const fragMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.7, roughness: 0.4, transparent: true, opacity: 0.9 });
          const frag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.08), fragMat);
          frag.position.copy(enemy.pos);
          const fragVel = new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 4 + 2, (Math.random() - 0.5) * 5);
          this._addParticle(frag, 1.2, (el, pdt) => {
            fragVel.y -= 12 * pdt;
            frag.position.add(fragVel.clone().multiplyScalar(pdt));
            frag.rotation.x += 0.15; frag.rotation.z += 0.1;
            fragMat.opacity = 0.9 * (1 - el / 1.2);
          });
        }
      } else if (enemy.isBoss) {
        // ── Boss Death Cinematic ──
        // 5-frame freeze
        this._bossCinematicFreeze = 5;
        this._bossCinematicName = enemy.bossDef?.name || "BOSS";

        // Screen white flash (0.4s fade)
        const flashEl = document.createElement("div");
        flashEl.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:white;z-index:10001;pointer-events:none;opacity:1;transition:opacity 0.4s ease-out;";
        document.body.appendChild(flashEl);
        requestAnimationFrame(() => { flashEl.style.opacity = "0"; });
        setTimeout(() => { if (flashEl.parentNode) flashEl.parentNode.removeChild(flashEl); }, 500);

        // Boss name "DEFEATED!" banner (scale-in, fades after 2s)
        const defeatBanner = document.createElement("div");
        defeatBanner.innerHTML = `<div style="font-size:42px;font-weight:900;color:#ffd700;text-shadow:0 0 20px rgba(255,200,0,0.6),0 0 40px rgba(255,150,0,0.3),3px 3px 8px #000;">${this._bossCinematicName}</div><div style="font-size:28px;font-weight:900;color:#ff4444;text-shadow:0 0 15px rgba(255,0,0,0.5),2px 2px 6px #000;margin-top:4px;">DEFEATED!</div>`;
        defeatBanner.style.cssText = "position:fixed;top:35%;left:50%;transform:translate(-50%,-50%) scale(0.3);pointer-events:none;text-align:center;z-index:10002;transition:all 0.3s ease-out;opacity:0;";
        document.body.appendChild(defeatBanner);
        requestAnimationFrame(() => { defeatBanner.style.transform = "translate(-50%,-50%) scale(1)"; defeatBanner.style.opacity = "1"; });
        setTimeout(() => { defeatBanner.style.opacity = "0"; defeatBanner.style.transform = "translate(-50%,-50%) scale(1.3)"; }, 2000);
        setTimeout(() => { if (defeatBanner.parentNode) defeatBanner.parentNode.removeChild(defeatBanner); }, 2500);

        // 3 staggered secondary explosions at boss position
        const bossDeathPos = enemy.pos.clone();
        for (let se = 0; se < 3; se++) {
          const delay = se * 0.2;
          const offset = new THREE.Vector3((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 4);
          const explosionPos = bossDeathPos.clone().add(offset);
          const explMat = new THREE.MeshBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
          const explMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), explMat);
          explMesh.position.copy(explosionPos);
          this._addParticle(explMesh, 0.8 + delay, (el) => {
            const t = Math.max(0, el - delay);
            if (t <= 0) return;
            explMesh.scale.setScalar(1 + 5 * (t / 0.8));
            explMat.opacity = 0.8 * (1 - t / 0.8);
          });
          // Explosion light
          const explLight = new THREE.PointLight(0xff8822, 8, 20);
          explLight.position.copy(explosionPos);
          this._addParticle(explLight as unknown as THREE.Object3D, 0.6 + delay, (el) => {
            const t = Math.max(0, el - delay);
            (explLight as THREE.PointLight).intensity = t > 0 ? 8 * (1 - t / 0.6) : 0;
          }, () => { this._scene.remove(explLight); });
          this._scene.add(explLight);
        }

        // Boss shockwave torus
        const bossSwMat = new THREE.MeshBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
        const bossSw = new THREE.Mesh(new THREE.TorusGeometry(1, 0.4, 8, 24), bossSwMat);
        bossSw.position.copy(enemy.pos);
        bossSw.rotation.x = Math.PI / 2;
        this._addParticle(bossSw, 0.8, (el) => {
          bossSw.scale.setScalar(1 + 8 * (el / 0.8));
          bossSwMat.opacity = 0.6 * (1 - el / 0.8);
        });
        // 20 Gold particle burst
        for (let gp = 0; gp < 20; gp++) {
          const gpMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.8, depthWrite: false });
          const gpMesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), gpMat);
          gpMesh.position.copy(enemy.pos);
          const gpVel = new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 10, (Math.random() - 0.5) * 12);
          this._addParticle(gpMesh, 1.2, (el, pdt) => {
            gpVel.y -= 10 * pdt;
            gpMesh.position.add(gpVel.clone().multiplyScalar(pdt));
            gpMat.opacity = 0.8 * (1 - el / 1.2);
          });
        }
        // Extra screen shake
        this._screenShake(1.0);
      }
      // Death particles
      for (let d = 0; d < (enemy.isBoss ? 15 : 5); d++) {
        const dMat = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.8, depthWrite: false });
        const dMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.2, 0), dMat);
        dMesh.position.copy(enemy.pos);
        const vel = new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8);
        this._addParticle(dMesh, 1.5, (_el, pdt) => {
          vel.y -= 15 * pdt;
          dMesh.position.add(vel.clone().multiplyScalar(pdt));
          dMesh.rotation.x += 0.1; dMesh.rotation.z += 0.08;
          dMat.opacity = Math.max(0, 0.8 - _el / 1.5);
        });
      }
      this._scene.remove(enemy.mesh);
      // Dispose all geometries and materials in the enemy group
      enemy.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else if (child.material) child.material.dispose();
        }
      });
      this._playSound("kill");
    }
  }

  // ── Particle System ──────────────────────────────────────────────────────

  private _addParticle(mesh: THREE.Object3D, duration: number, update: (el: number, dt: number) => void, cleanup?: () => void): void {
    this._scene.add(mesh);
    this._particles.push({
      mesh, startTime: this._time, duration, update,
      cleanup: cleanup || (() => { this._scene.remove(mesh); if (mesh instanceof THREE.Mesh) { mesh.geometry.dispose(); if (mesh.material instanceof THREE.Material) mesh.material.dispose(); } }),
    });
  }

  private _updateParticles(dt: number): void {
    this._particles = this._particles.filter((p) => {
      const el = this._time - p.startTime;
      if (el >= p.duration) { p.cleanup(); return false; }
      p.update(el, dt);
      return true;
    });
  }

  // ── Update ───────────────────────────────────────────────────────────────

  private _update(): void {
    this._renderHUD();

    if (this._phase === "title" || this._phase === "between_waves" || this._phase === "shop" || this._phase === "defeat" || this._phase === "paused" || this._phase === "victory") {
      // Idle camera orbits the grail
      const idleAngle = this._time * 0.2;
      this._camera.position.set(Math.cos(idleAngle) * 25, 15, Math.sin(idleAngle) * 25);
      this._camera.lookAt(0, GRAIL_Y, 0);
      // Animate grail
      this._grailMesh.rotation.y = this._time * 0.3;
      this._grailLight.intensity = 3 + Math.sin(this._time * 2) * 0.5;
      const hp = this._grailMesh.getObjectByName("holyParticles") as THREE.Points | undefined;
      if (hp) hp.rotation.y = this._time * 0.5;
      const idleRune = this._grailMesh.getObjectByName("grailRune") as THREE.Mesh | undefined;
      if (idleRune) idleRune.rotation.z = this._time * 1.2;
      const idleAura = this._grailMesh.getObjectByName("grailAura") as THREE.Mesh | undefined;
      if (idleAura) idleAura.scale.setScalar(1 + Math.sin(this._time * 1.5) * 0.12);
      // Grail beam animation (idle)
      const idleBeam = this._grailMesh.getObjectByName("grailBeam") as THREE.Mesh | undefined;
      if (idleBeam) {
        (idleBeam.material as THREE.MeshBasicMaterial).opacity = 0.06 + 0.04 * Math.sin(this._time * 2);
        idleBeam.rotation.y = this._time * 0.5;
      }
      // Ambient particles drift (idle)
      if (this._ambientParticles) {
        const aPos = this._ambientParticles.geometry.attributes.position as THREE.BufferAttribute;
        const aArr = aPos.array as Float32Array;
        for (let i = 0; i < 150; i++) {
          aArr[i * 3 + 1] += 0.003;
          aArr[i * 3] += Math.sin(this._time * 0.5 + i) * 0.002;
          aArr[i * 3 + 2] += Math.cos(this._time * 0.5 + i) * 0.002;
          if (aArr[i * 3 + 1] > 25) aArr[i * 3 + 1] = -10;
        }
        aPos.needsUpdate = true;
      }
      // Distant islands bob (idle)
      for (let i = 0; i < 8; i++) {
        const dIsland = this._scene.getObjectByName(`distIsland${i}`);
        if (dIsland) {
          if (dIsland.userData.baseY === undefined) dIsland.userData.baseY = dIsland.position.y;
          dIsland.position.y = dIsland.userData.baseY + Math.sin(this._time * 0.3 + i) * 0.15;
        }
      }
      return;
    }

    if (this._phase === "playing" || this._phase === "boss") {
      // Boss death cinematic freeze
      if (this._bossCinematicFreeze > 0) {
        this._bossCinematicFreeze--;
        return;
      }
      this._updateGameplay();
    }
  }

  private _updateGameplay(): void {
    const dt = this._dt;

    // ── Player Movement ──
    if (this._dashTimer > 0) {
      this._dashTimer -= dt;
      const dashVec = this._dashDir.clone().multiplyScalar(DASH_SPEED * dt);
      // Convert dash displacement back to orbital coordinates
      const newPos = this._playerPos.clone().add(dashVec);
      this._playerAngle = Math.atan2(newPos.z, newPos.x);
      if (this._dashTimer <= 0) this._isInvulnerable = false;
    } else {
      // Orbital movement
      if (this._keys.has("KeyA")) this._playerAngle -= PLAYER_SPEED * dt;
      if (this._keys.has("KeyD")) this._playerAngle += PLAYER_SPEED * dt;
      if (this._keys.has("KeyW")) this._playerAltitude = Math.min(ORBIT_MAX_Y, this._playerAltitude + PLAYER_ALTITUDE_SPEED * dt);
      if (this._keys.has("KeyS")) this._playerAltitude = Math.max(ORBIT_MIN_Y, this._playerAltitude - PLAYER_ALTITUDE_SPEED * dt);
    }

    // Calculate player world position
    this._playerPos.set(
      Math.cos(this._playerAngle) * ORBIT_RADIUS,
      this._playerAltitude,
      Math.sin(this._playerAngle) * ORBIT_RADIUS,
    );
    this._playerMesh.position.copy(this._playerPos);
    this._playerMesh.lookAt(0, GRAIL_Y, 0); // face the grail
    this._playerMesh.rotateY(Math.PI); // face outward

    // Wing flap animation (scales with bolt_rate upgrade)
    const wingFlapSpeed = 5 + (this._upgradeLevels["bolt_rate"] || 0) * 1.5;
    const wingL = this._playerMesh.getObjectByName("wingL") as THREE.Mesh;
    const wingR = this._playerMesh.getObjectByName("wingR") as THREE.Mesh;
    if (wingL) wingL.rotation.z = Math.sin(this._time * wingFlapSpeed) * 0.3;
    if (wingR) wingR.rotation.z = -Math.sin(this._time * wingFlapSpeed) * 0.3;

    // Homing eye orbit animation
    const homingEye = this._playerMesh.getObjectByName("homingEye");
    if (homingEye) {
      const eyeAngle = this._time * 4;
      const eyeRadius = 0.45;
      homingEye.position.set(Math.cos(eyeAngle) * eyeRadius, 1.1 + Math.sin(eyeAngle * 0.7) * 0.1, Math.sin(eyeAngle) * eyeRadius);
    }

    // Wisp trail
    for (let i = 0; i < 5; i++) {
      const wisp = this._playerMesh.getObjectByName(`wisp${i}`);
      if (wisp) {
        wisp.position.x = Math.sin(this._time * 3 + i * 0.8) * 0.15;
        wisp.position.z = 0.2 + i * 0.1 + Math.sin(this._time * 2 + i) * 0.05;
      }
    }

    // Animate player aura ring
    const pAura = this._playerMesh.getObjectByName("playerAura") as THREE.Mesh | undefined;
    if (pAura) pAura.rotation.z = this._time * 2.0;

    // ── Cooldowns ──
    if (this._boltCooldown > 0) this._boltCooldown -= dt;
    if (this._dashCooldown > 0) this._dashCooldown -= dt;
    if (this._shieldCooldown > 0) this._shieldCooldown -= dt;
    if (this._novaCooldown > 0) this._novaCooldown -= dt;
    if (this._shieldBurstCooldown > 0) this._shieldBurstCooldown -= dt;

    // Shield timer
    if (this._shieldTimer > 0) {
      this._shieldTimer -= dt;
      (this._shieldMesh.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(this._time * 10) * 0.1;
      if (this._shieldTimer <= 0) {
        this._isInvulnerable = false;
        (this._shieldMesh.material as THREE.MeshBasicMaterial).opacity = 0;
        // Synergy: "Divine Resonance" — shield expiry triggers a mini-nova
        if (this._hasSynergy("divine_resonance")) {
          const novaDmg = (NOVA_DAMAGE + this._upgradeLevels["nova_dmg"] * 15) * 0.5;
          const novaRad = (NOVA_RADIUS + this._upgradeLevels["nova_dmg"] * 3) * 0.5;
          for (const enemy of this._enemies) {
            if (enemy.dead) continue;
            const d = enemy.pos.distanceTo(this._playerPos);
            if (d < novaRad) {
              this._damageEnemy(enemy, novaDmg * (1 - d / novaRad * 0.5));
            }
          }
          // Visual: small golden burst
          const miniNovaMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
          const miniNovaMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), miniNovaMat);
          miniNovaMesh.position.copy(this._playerPos);
          this._addParticle(miniNovaMesh, 0.5, (el) => {
            miniNovaMesh.scale.setScalar(1 + novaRad * (el / 0.5));
            miniNovaMat.opacity = 0.3 * (1 - el / 0.5);
          });
          this._playSound("nova");
        }
      }
    }

    // ── Combo decay ──
    if (this._comboTimer > 0) {
      this._comboTimer -= dt;
      if (this._comboTimer <= 0) {
        this._comboCount = 0;
        this._comboMultiplier = 1;
      }
    }

    // ── Grail proximity healing ──
    const distToGrailY = Math.abs(this._playerAltitude - GRAIL_Y);
    const playerOrbitDist = Math.sqrt(this._playerPos.x * this._playerPos.x + this._playerPos.z * this._playerPos.z);
    if (distToGrailY < 3 && Math.abs(playerOrbitDist - ORBIT_RADIUS) < 2 && this._grailHp < this._grailMaxHp) {
      this._grailHp = Math.min(this._grailMaxHp, this._grailHp + 2 * dt);
      if (!this._grailHealActive) {
        this._grailHealActive = true;
        this._playSound("heal");
        // Add green healing glow to grail
        if (!this._grailHealGlow) {
          this._grailHealGlow = new THREE.PointLight(0x44ff44, 2, 15);
          this._grailHealGlow.position.y = 2;
          this._grailMesh.add(this._grailHealGlow);
        }
      }
      if (this._grailHealGlow) {
        this._grailHealGlow.intensity = 2 + Math.sin(this._time * 4) * 0.8;
      }
    } else {
      if (this._grailHealActive) {
        this._grailHealActive = false;
        if (this._grailHealGlow) {
          this._grailMesh.remove(this._grailHealGlow);
          this._grailHealGlow = null;
        }
      }
    }

    // ── Grail passive HP regeneration (0.5 HP/sec) ──
    if (this._grailHp > 0 && this._grailHp < this._grailMaxHp) {
      this._grailHp = Math.min(this._grailMaxHp, this._grailHp + 0.5 * dt);
    }

    // ── Charge shot accumulation ──
    const mouseDelta = Math.abs(this._mouseX - this._lastMouseX) + Math.abs(this._mouseY - this._lastMouseY);
    if (this._mouseDown && this._boltCooldown <= 0 && mouseDelta < 0.02) {
      this._chargeTime += dt;
    } else if (!this._mouseDown) {
      this._chargeTime = 0;
    }
    this._lastMouseX = this._mouseX;
    this._lastMouseY = this._mouseY;

    // ── Fire bolts ──
    if (this._mouseDown) this._fireBolt();
    // Auto-fire: fire at nearest enemy
    if (this._autoFire && !this._mouseDown && this._boltCooldown <= 0) {
      let nearestAutoEnemy: EnemyState | null = null;
      let nearestAutoDist = Infinity;
      for (const enemy of this._enemies) {
        if (enemy.dead) continue;
        const d = enemy.pos.distanceTo(this._playerPos);
        if (d < nearestAutoDist) { nearestAutoDist = d; nearestAutoEnemy = enemy; }
      }
      if (nearestAutoEnemy) {
        // Point mouse direction toward the nearest enemy (screen space)
        const enemyScreen = nearestAutoEnemy.pos.clone().project(this._camera);
        this._mouseX = enemyScreen.x;
        this._mouseY = enemyScreen.y;
        this._fireBolt();
      }
    }

    // ── Spawn enemies ──
    for (let i = 0; i < this._waveSpawns.length; i++) {
      if (this._spawnCounts[i] >= this._waveSpawns[i].count) continue;
      this._spawnTimers[i] -= dt;
      if (this._spawnTimers[i] <= 0) {
        this._spawnTimers[i] = this._waveSpawns[i].delay;
        this._spawnCounts[i]++;
        this._spawnEnemy(this._waveSpawns[i].type);
      }
    }

    // ── Update bolts ──
    for (const bolt of this._bolts) {
      if (!bolt.alive) continue;
      bolt.time += dt;
      bolt.mesh.position.add(bolt.dir.clone().multiplyScalar(BOLT_SPEED * dt));

      // Synergy: "Rapid Fire" — bolts leave a brief damaging trail
      if (this._hasSynergy("rapid_fire") && Math.random() < dt * 10) {
        const trailDmgMat = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.5, depthWrite: false });
        const trailDmgMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), trailDmgMat);
        trailDmgMesh.position.copy(bolt.mesh.position);
        const trailPos = bolt.mesh.position.clone();
        this._addParticle(trailDmgMesh, 0.5, (el) => {
          trailDmgMat.opacity = 0.5 * (1 - el / 0.5);
          // Damage enemies touching the trail
          for (const enemy of this._enemies) {
            if (enemy.dead) continue;
            if (enemy.pos.distanceTo(trailPos) < 1.0) {
              this._damageEnemy(enemy, 1 * this._dt);
            }
          }
        });
      }

      // Animate max-level orbiting particle
      const boltOrbit = bolt.mesh.getObjectByName("boltOrbit");
      if (boltOrbit) {
        const orbitAngle = this._time * 15;
        const orbitR = 0.3;
        boltOrbit.position.set(Math.cos(orbitAngle) * orbitR, Math.sin(orbitAngle) * orbitR, 0);
      }

      // Update trail positions (shift back, prepend current)
      const tPos = bolt.trail.geometry.attributes.position as THREE.BufferAttribute;
      const arr = tPos.array as Float32Array;
      for (let ti = arr.length - 3; ti >= 3; ti -= 3) {
        arr[ti] = arr[ti - 3]; arr[ti + 1] = arr[ti - 2]; arr[ti + 2] = arr[ti - 1];
      }
      arr[0] = bolt.mesh.position.x; arr[1] = bolt.mesh.position.y; arr[2] = bolt.mesh.position.z;
      tPos.needsUpdate = true;

      // Homing: curve toward nearest enemy
      const homingLevel = this._upgradeLevels["homing"];
      if (homingLevel > 0) {
        let nearestDist = 15;
        let nearestEnemy: EnemyState | null = null;
        for (const enemy of this._enemies) {
          if (enemy.dead) continue;
          // Fast pre-check
          if (Math.abs(bolt.mesh.position.x - enemy.pos.x) > nearestDist) continue;
          if (Math.abs(bolt.mesh.position.z - enemy.pos.z) > nearestDist) continue;
          const d = bolt.mesh.position.distanceTo(enemy.pos);
          if (d < nearestDist) { nearestDist = d; nearestEnemy = enemy; }
        }
        if (nearestEnemy) {
          const toEnemy = nearestEnemy.pos.clone().sub(bolt.mesh.position).normalize();
          const turnRate = (0.5 + homingLevel * 0.5) * dt;
          bolt.dir.lerp(toEnemy, turnRate).normalize();
        }
      }

      // Check hit enemies
      const pierceLevel = this._upgradeLevels["pierce"];
      for (const enemy of this._enemies) {
        if (enemy.dead) continue;
        const eDef = enemy.isBoss && enemy.bossDef ? enemy.bossDef : ENEMY_DEFS[enemy.type];
        // Fast axis-aligned distance pre-check to skip expensive distanceTo
        const hitRange = eDef.size + 0.3;
        const dx = bolt.mesh.position.x - enemy.pos.x;
        const dy = bolt.mesh.position.y - enemy.pos.y;
        const dz = bolt.mesh.position.z - enemy.pos.z;
        if (Math.abs(dx) > hitRange || Math.abs(dy) > hitRange || Math.abs(dz) > hitRange) continue;
        if (dx * dx + dy * dy + dz * dz < hitRange * hitRange) {
          this._damageEnemy(enemy, bolt.damage);
          // Impact flash
          const impactFlash = new THREE.PointLight(0x4488ff, 4, 8);
          impactFlash.position.copy(bolt.mesh.position);
          this._addParticle(impactFlash as unknown as THREE.Object3D, 0.3, (el) => {
            (impactFlash as THREE.PointLight).intensity = 4 * (1 - el / 0.3);
          }, () => { this._scene.remove(impactFlash); });
          this._scene.add(impactFlash);
          // Spark particles
          for (let sp = 0; sp < 6; sp++) {
            const sMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.8, depthWrite: false });
            const sMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), sMat);
            sMesh.position.copy(bolt.mesh.position);
            const sVel = new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
            this._addParticle(sMesh, 0.4, (el, pdt) => {
              sMesh.position.add(sVel.clone().multiplyScalar(pdt));
              sMat.opacity = 0.8 * (1 - el / 0.4);
            });
          }
          // Impact bloom sphere
          const bloomMat = new THREE.MeshBasicMaterial({ color: 0x44ccff, transparent: true, opacity: 0.6, depthWrite: false });
          const bloomMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), bloomMat);
          bloomMesh.position.copy(bolt.mesh.position);
          this._addParticle(bloomMesh, 0.2, (el) => {
            bloomMesh.scale.setScalar(0.2 + (0.8 - 0.2) * (el / 0.2));
            bloomMat.opacity = 0.6 * (1 - el / 0.2);
          });
          // Shockwave ring
          const swMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
          const swMesh = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 10, 12), swMat);
          swMesh.position.copy(bolt.mesh.position);
          swMesh.rotation.x = Math.PI / 2;
          this._addParticle(swMesh, 0.3, (el) => {
            swMesh.scale.setScalar(1 + (2.5 - 1) * (el / 0.3));
            swMat.opacity = 0.5 * (1 - el / 0.3);
          });

          // Pierce check: if pierce upgrade and not exceeded max pierce count
          if (pierceLevel > 0 && bolt.pierceCount < pierceLevel) {
            bolt.pierceCount++;
            // Synergy: "Seeking Vengeance" — pierced bolts gain +20% damage instead of losing 40%
            const hasSeekingVengeance = this._hasSynergy("seeking_vengeance");
            bolt.damage *= hasSeekingVengeance ? 1.2 : 0.6;
            // Ricochet: if the enemy died, seek the nearest alive enemy within 12 units
            if (enemy.dead) {
              let nearestRicochet: EnemyState | null = null;
              let nearestRicochetDist = 12;
              for (const other of this._enemies) {
                if (other.dead || other === enemy) continue;
                // Fast pre-check
                if (Math.abs(other.pos.x - enemy.pos.x) > nearestRicochetDist) continue;
                if (Math.abs(other.pos.z - enemy.pos.z) > nearestRicochetDist) continue;
                const d = other.pos.distanceTo(enemy.pos);
                if (d < nearestRicochetDist) { nearestRicochetDist = d; nearestRicochet = other; }
              }
              if (nearestRicochet) {
                bolt.dir = nearestRicochet.pos.clone().sub(bolt.mesh.position).normalize();
              }
            }
            // Don't kill the bolt, continue
          } else {
            bolt.alive = false;
            this._scene.remove(bolt.mesh);
            bolt.mesh.geometry.dispose();
            (bolt.mesh.material as THREE.Material).dispose();
            this._scene.remove(bolt.trail);
            bolt.trail.geometry.dispose();
            (bolt.trail.material as THREE.Material).dispose();
          }
          break;
        }
      }

      // Out of range
      if (bolt.time > 3) {
        bolt.alive = false;
        this._scene.remove(bolt.mesh);
        bolt.mesh.geometry.dispose();
        (bolt.mesh.material as THREE.Material).dispose();
        this._scene.remove(bolt.trail);
        bolt.trail.geometry.dispose();
        (bolt.trail.material as THREE.Material).dispose();
      }
    }
    this._bolts = this._bolts.filter((b) => b.alive);

    // ── Update enemies ──
    for (const enemy of this._enemies) {
      if (enemy.dead) continue;

      // Spawn delay: enemy is visible but doesn't move
      if (enemy.spawnDelay > 0) {
        enemy.spawnDelay -= dt;
        enemy.mesh.position.copy(enemy.pos);
        // Pulsing opacity during spawn delay
        enemy.mesh.traverse((c) => {
          if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
            c.material.opacity = 0.5 + Math.sin(this._time * 20) * 0.3;
            c.material.transparent = true;
          }
        });
        continue;
      }
      // Restore opacity after spawn delay
      enemy.mesh.traverse((c) => {
        if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
          c.material.opacity = 1.0;
          c.material.transparent = false;
        }
      });

      // Move toward grail
      const toGrail = new THREE.Vector3(0, GRAIL_Y, 0).sub(enemy.pos);
      const dist = toGrail.length();
      const eDef = ENEMY_DEFS[enemy.type]; // always use enemy type for base stats
      let speed = (enemy.isBoss && enemy.bossDef ? enemy.bossDef.speed : eDef.speed) * (1 + Math.max(0, this._wave - 5) * 0.03);
      // Late-wave speed scaling: +2% per wave beyond 15
      if (this._wave >= 15) speed *= 1 + (this._wave - 15) * 0.02;
      // Swift modifier: doubled intensity for waves 19-20
      const swiftMult = (this._waveModifier === "swift" && !enemy.isBoss) ? (this._wave >= 19 ? 1.6 : 1.3) : 1;
      speed *= swiftMult;
      if (enemy.isBoss && enemy.enraged) speed *= 1.4; // Enrage: 40% speed boost
      const attackRange = enemy.isBoss && enemy.bossDef ? 8 : eDef.attackRange;

      // Telegraph: red emissive glow when within 1.5x attack range
      const telegraphRange = attackRange * 1.5;
      if (dist < telegraphRange && dist > attackRange && !enemy.isBoss) {
        const telegraphIntensity = 1 - (dist - attackRange) / (telegraphRange - attackRange); // 0 at edge, 1 at attackRange
        enemy.mesh.traverse((c) => {
          if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
            c.material.emissive.setHex(0xff2200);
            c.material.emissiveIntensity = 0.2 + telegraphIntensity * 1.8;
          }
        });
      } else if (dist >= telegraphRange && !enemy.isBoss && enemy.hitFlash <= 0) {
        // Reset emissive to default when outside telegraph range (and not hit-flashing)
        const resetDef = ENEMY_DEFS[enemy.type];
        enemy.mesh.traverse((c) => {
          if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
            c.material.emissive.setHex(resetDef.color);
            c.material.emissiveIntensity = 0.2;
          }
        });
      }

      if (dist > attackRange) {
        const moveDir = toGrail.normalize().multiplyScalar(speed * dt);
        enemy.pos.add(moveDir);

        // Enemy approach movement variety
        if (!enemy.isBoss) {
          if (enemy.type === "shadow_drake") {
            // Shadow drakes spiral/circle slightly before closing in
            const spiralStrength = Math.min(1, dist / (ARENA_RADIUS * 0.5));
            const spiralAngle = this._time * 2 + enemy.angle * 3;
            enemy.pos.x += Math.cos(spiralAngle) * speed * dt * 0.4 * spiralStrength;
            enemy.pos.z += Math.sin(spiralAngle) * speed * dt * 0.4 * spiralStrength;
            enemy.pos.y = enemy.altitude + Math.sin(this._time * 1.5 + enemy.angle) * 1.5;
          } else if (eDef.canFly) {
            // Flying enemies bob up and down as they approach (sine wave on altitude)
            enemy.pos.y = enemy.altitude + Math.sin(this._time * 2.5 + enemy.angle * 5) * 1.2;
          } else {
            // Ground enemies have a subtle walking bob (small y oscillation at higher frequency)
            enemy.pos.y = 1 + Math.abs(Math.sin(this._time * 8 + enemy.angle * 7)) * 0.2;
          }
        }

        enemy.draining = false;
        // Remove drain light when not draining
        const existingDrainLight = enemy.mesh.getObjectByName("drainLight");
        if (existingDrainLight) enemy.mesh.remove(existingDrainLight);
      } else {
        // Draining the grail (reduced if player is shielded nearby)
        enemy.draining = true;
        // Drain ground glow
        if (!enemy.mesh.getObjectByName("drainLight")) {
          const drainLight = new THREE.PointLight(0xff2200, 2, 5);
          drainLight.name = "drainLight";
          drainLight.position.set(0, -enemy.pos.y + 0.5, 0);
          enemy.mesh.add(drainLight);
        }
        const dmgRate = enemy.isBoss && enemy.bossDef ? enemy.bossDef.damage : eDef.damage;
        const playerNear = enemy.pos.distanceTo(this._playerPos) < 5;
        const shieldReduction = playerNear && this._isInvulnerable ? 0.3 : 1;
        this._grailHp -= dmgRate * dt * shieldReduction;

        // Grail damage reaction — red flash on cup material
        if (Math.random() < dt * 2) {
          const cupMesh = this._grailMesh.children[0] as THREE.Mesh;
          if (cupMesh && cupMesh.material instanceof THREE.MeshStandardMaterial) {
            const origColor = cupMesh.material.emissive.getHex();
            cupMesh.material.emissive.setHex(0xff2200);
            cupMesh.material.emissiveIntensity = 2.0;
            setTimeout(() => {
              if (cupMesh.material instanceof THREE.MeshStandardMaterial) {
                cupMesh.material.emissive.setHex(origColor);
                cupMesh.material.emissiveIntensity = 0;
              }
            }, 120);
          }
          // Scatter holy particles briefly (burst of speed/chaos)
          for (let hp = 0; hp < 4; hp++) {
            const scatterMat = new THREE.MeshBasicMaterial({ color: 0xffeedd, transparent: true, opacity: 0.6, depthWrite: false });
            const scatterMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), scatterMat);
            scatterMesh.position.set(
              (Math.random() - 0.5) * 2,
              GRAIL_Y + 1 + Math.random() * 2,
              (Math.random() - 0.5) * 2,
            );
            const scatterVel = new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 4 + 2, (Math.random() - 0.5) * 8);
            this._addParticle(scatterMesh, 0.6, (el, pdt) => {
              scatterVel.y -= 8 * pdt;
              scatterMesh.position.add(scatterVel.clone().multiplyScalar(pdt));
              scatterMat.opacity = 0.6 * (1 - el / 0.6);
            });
          }
          // Light beam flickers (brief opacity drop)
          const beamObj = this._grailMesh.getObjectByName("grailBeam") as THREE.Mesh | undefined;
          if (beamObj) {
            const beamMatRef = beamObj.material as THREE.MeshBasicMaterial;
            const origOpacity = beamMatRef.opacity;
            beamMatRef.opacity = 0.01;
            setTimeout(() => { beamMatRef.opacity = origOpacity; }, 100);
          }
        }
        // Drain beam: spawn red orbs floating toward grail
        if (Math.random() < dt * 3) {
          const orbMat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.6, depthWrite: false });
          const orbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), orbMat);
          const startPos = enemy.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5));
          orbMesh.position.copy(startPos);
          const grailTarget = new THREE.Vector3(0, GRAIL_Y, 0);
          const orbDir = grailTarget.clone().sub(startPos).normalize();
          const orbSpeed = 10 + Math.random() * 5;
          this._addParticle(orbMesh, 0.6, (el, pdt) => {
            orbMesh.position.add(orbDir.clone().multiplyScalar(orbSpeed * pdt));
            orbMat.opacity = 0.6 * (1 - el / 0.6);
            orbMesh.scale.setScalar(1 - el / 0.6);
          });
        }
      }

      enemy.mesh.position.copy(enemy.pos);
      enemy.mesh.lookAt(0, GRAIL_Y, 0);

      // Hit flash
      if (enemy.hitFlash > 0) {
        enemy.hitFlash -= dt;
        enemy.mesh.traverse((c) => {
          if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
            c.material.emissive.setHex(enemy.hitFlash > 0 ? 0xffffff : eDef.color);
            c.material.emissiveIntensity = enemy.hitFlash > 0 ? 2 : 0.2;
          }
        });
      }

      // Wing flap for flying enemies
      if (!enemy.isBoss && eDef.canFly) {
        const wL = enemy.mesh.getObjectByName("wL");
        const wR = enemy.mesh.getObjectByName("wR");
        if (wL) wL.rotation.z = Math.sin(this._time * 6 + enemy.angle) * 0.5;
        if (wR) wR.rotation.z = -Math.sin(this._time * 6 + enemy.angle) * 0.5;
      }

      // HP bar
      const ratio = Math.max(0, enemy.hp / enemy.maxHp);
      enemy.hpBar.scale.x = ratio;
      enemy.hpBar.lookAt(this._camera.position);
      enemy.hpBarBg.lookAt(this._camera.position);

      // Herald buff: when herald reaches attack range, buff nearby enemies +30% speed
      if (!enemy.isBoss && enemy.type === "herald" && enemy.draining) {
        for (const other of this._enemies) {
          if (other === enemy || other.dead || other.isBoss) continue;
          // Fast axis-aligned pre-check before expensive distanceTo
          const hdx = Math.abs(other.pos.x - enemy.pos.x);
          const hdz = Math.abs(other.pos.z - enemy.pos.z);
          if (hdx > 10 || hdz > 10) continue;
          const heraldDist = other.pos.distanceTo(enemy.pos);
          if (heraldDist < 10) {
            // Apply speed buff by nudging enemy closer to grail
            const buffDir = new THREE.Vector3(0, GRAIL_Y, 0).sub(other.pos).normalize();
            const otherDef = ENEMY_DEFS[other.type];
            other.pos.add(buffDir.multiplyScalar(otherDef.speed * 0.3 * dt));
          }
        }
        // Animate herald crown spin
        const crownObj = enemy.mesh.getObjectByName("heraldCrown");
        if (crownObj) crownObj.rotation.z = this._time * 4;
      }

      // Boss abilities
      if (enemy.isBoss && enemy.bossDef) {
        // Boss enrage at 50% HP
        if (!enemy.enraged && enemy.hp <= enemy.maxHp * 0.5) {
          enemy.enraged = true;
          this._playSound("boss_roar");
          // Visual enrage burst
          const enrageMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
          const enrageMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), enrageMat);
          enrageMesh.position.copy(enemy.pos);
          this._addParticle(enrageMesh, 0.8, (el) => {
            enrageMesh.scale.setScalar(1 + 8 * (el / 0.8));
            enrageMat.opacity = 0.6 * (1 - el / 0.8);
          });
          // Enrage announcement
          const enrageBanner = document.createElement("div");
          enrageBanner.innerHTML = `<div style="font-size:28px;font-weight:900;color:#ff4444;text-shadow:0 0 15px rgba(255,0,0,0.6),2px 2px 6px #000;">ENRAGED!</div>`;
          enrageBanner.style.cssText = "position:absolute;top:38%;left:50%;transform:translate(-50%,-50%) scale(0.5);pointer-events:none;text-align:center;z-index:20;transition:all 0.3s ease-out;opacity:0;";
          this._hudContainer.appendChild(enrageBanner);
          requestAnimationFrame(() => { enrageBanner.style.transform = "translate(-50%,-50%) scale(1.2)"; enrageBanner.style.opacity = "1"; });
          setTimeout(() => { enrageBanner.style.opacity = "0"; enrageBanner.style.transform = "translate(-50%,-50%) scale(1.5)"; }, 1200);
          setTimeout(() => { if (enrageBanner.parentNode) enrageBanner.parentNode.removeChild(enrageBanner); }, 1800);
        }

        // Apply enrage: 40% speed boost handled in speed calc, ability cooldown halved
        const enrageAbilityMult = enemy.enraged ? 2.0 : 1.0;
        enemy.bossAbilityTimer += dt * enrageAbilityMult;

        // Enraged visual: red emissive pulse on boss body
        if (enemy.enraged) {
          const enragePulse = 0.4 + Math.sin(this._time * 6) * 0.3;
          enemy.mesh.traverse((c) => {
            if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial && c.name !== "bossAura") {
              c.material.emissive.setHex(0xff2200);
              c.material.emissiveIntensity = enragePulse;
            }
          });
          // Intensify aura when enraged
          const enrageAura = enemy.mesh.getObjectByName("bossAura");
          if (enrageAura) {
            const auraMtl = (enrageAura as THREE.Mesh).material as THREE.MeshBasicMaterial;
            auraMtl.color.setHex(0xff2200);
            auraMtl.opacity = 0.12 + Math.sin(this._time * 4) * 0.08;
          }
        }
        // Pulsing dark aura that expands/contracts
        const aura = enemy.mesh.getObjectByName("bossAura");
        if (aura) {
          aura.rotation.y = this._time;
          aura.rotation.x = this._time * 0.3;
          const pulseScale = 1 + Math.sin(this._time * 2) * 0.25;
          aura.scale.setScalar(pulseScale);
          const auraMtl = (aura as THREE.Mesh).material as THREE.MeshBasicMaterial;
          auraMtl.opacity = 0.06 + Math.sin(this._time * 3) * 0.04;
        }
        // Ground shadow follows boss, positioned at ground level
        const groundShadow = enemy.mesh.getObjectByName("bossGroundShadow");
        if (groundShadow) {
          groundShadow.position.y = -enemy.pos.y + 0.5;
        }
        // Emissive eye glow intensifies when ability is about to fire
        const abilityProgress = enemy.bossAbilityTimer / 4; // ramp up as ability timer grows
        for (let ei = 0; ei < 2; ei++) {
          const eye = enemy.mesh.getObjectByName(`bossEye${ei}`) as THREE.Mesh | undefined;
          if (eye && eye.material instanceof THREE.MeshStandardMaterial) {
            eye.material.emissiveIntensity = 3 + Math.min(abilityProgress, 1) * 5 + Math.sin(this._time * 6) * 1.5;
          }
        }

        if (enemy.bossDef.ability === "beam" && enemy.bossAbilityTimer > 4) {
          enemy.bossAbilityTimer = 0;
          // Fire a beam toward the grail
          const grailCenter = new THREE.Vector3(0, GRAIL_Y, 0);
          const beamDir = grailCenter.clone().sub(enemy.pos);
          const beamDist = beamDir.length();
          beamDir.normalize();
          const beamMidpoint = enemy.pos.clone().add(beamDir.clone().multiplyScalar(beamDist / 2));
          const beamGeo = new THREE.CylinderGeometry(0.3, 0.3, beamDist, 12);
          const beamMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.7, depthWrite: false });
          const beamMesh = new THREE.Mesh(beamGeo, beamMat);
          beamMesh.position.copy(beamMidpoint);
          beamMesh.lookAt(grailCenter);
          beamMesh.rotateX(Math.PI / 2);
          this._addParticle(beamMesh, 0.5, (el) => {
            beamMat.opacity = 0.7 * (1 - el / 0.5);
          });
          this._grailHp -= 30;
        } else if (enemy.bossDef.ability === "vortex" && enemy.bossAbilityTimer > 6) {
          enemy.bossAbilityTimer = 0;
          // Spawn a spinning ring at boss position
          const vortexGeo = new THREE.TorusGeometry(4, 0.3, 8, 24);
          const vortexMat = new THREE.MeshBasicMaterial({ color: 0x6600aa, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
          const vortexMesh = new THREE.Mesh(vortexGeo, vortexMat);
          vortexMesh.position.copy(enemy.pos);
          const vortexCenter = enemy.pos.clone();
          this._addParticle(vortexMesh, 3.0, (el, _pdt) => {
            vortexMesh.rotation.y += _pdt * 6;
            vortexMesh.rotation.x = Math.sin(el * 2) * 0.3;
            vortexMat.opacity = 0.5 * (1 - el / 3.0);
            // Deflect nearby bolts
            for (const bolt of this._bolts) {
              if (!bolt.alive) continue;
              const distToBoss = bolt.mesh.position.distanceTo(vortexCenter);
              if (distToBoss < 12) {
                const deflect = bolt.mesh.position.clone().sub(vortexCenter).normalize().multiplyScalar(0.02);
                const tangent = new THREE.Vector3(-deflect.z, 0, deflect.x);
                bolt.dir.add(tangent.multiplyScalar(0.15)).normalize();
              }
            }
          });
        } else if (enemy.bossAbilityTimer > 5) {
          enemy.bossAbilityTimer = 0;
          if (enemy.bossDef.ability === "summon") {
            for (let s = 0; s < 3; s++) { this._spawnEnemy("imp"); this._waveEnemiesTotal++; }
            // Wave 18+: summon bosses also gain beam
            if (this._wave >= 18) {
              const grailCenter = new THREE.Vector3(0, GRAIL_Y, 0);
              const beamDir2 = grailCenter.clone().sub(enemy.pos);
              const beamDist2 = beamDir2.length();
              beamDir2.normalize();
              const beamMidpoint2 = enemy.pos.clone().add(beamDir2.clone().multiplyScalar(beamDist2 / 2));
              const beamGeo2 = new THREE.CylinderGeometry(0.3, 0.3, beamDist2, 12);
              const beamMat2 = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.7, depthWrite: false });
              const beamMesh2 = new THREE.Mesh(beamGeo2, beamMat2);
              beamMesh2.position.copy(beamMidpoint2);
              beamMesh2.lookAt(grailCenter);
              beamMesh2.rotateX(Math.PI / 2);
              this._addParticle(beamMesh2, 0.5, (el) => { beamMat2.opacity = 0.7 * (1 - el / 0.5); });
              this._grailHp -= 20;
            }
          }
        }
        // Wave 18+: beam bosses also gain vortex, vortex bosses also gain summon (secondary abilities on separate timers)
        if (this._wave >= 18 && enemy.bossAbilityTimer > 3 && enemy.bossAbilityTimer < 3 + dt * 2) {
          if (enemy.bossDef.ability === "beam") {
            // Secondary: vortex
            const vortexGeo2 = new THREE.TorusGeometry(3, 0.2, 8, 24);
            const vortexMat2 = new THREE.MeshBasicMaterial({ color: 0x6600aa, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
            const vortexMesh2 = new THREE.Mesh(vortexGeo2, vortexMat2);
            vortexMesh2.position.copy(enemy.pos);
            const vc = enemy.pos.clone();
            this._addParticle(vortexMesh2, 2.0, (el, _pdt) => {
              vortexMesh2.rotation.y += _pdt * 6;
              vortexMat2.opacity = 0.4 * (1 - el / 2.0);
              for (const bolt of this._bolts) {
                if (!bolt.alive) continue;
                const d = bolt.mesh.position.distanceTo(vc);
                if (d < 10) {
                  const defl = bolt.mesh.position.clone().sub(vc).normalize();
                  const tang = new THREE.Vector3(-defl.z, 0, defl.x);
                  bolt.dir.add(tang.multiplyScalar(0.1)).normalize();
                }
              }
            });
          } else if (enemy.bossDef.ability === "vortex") {
            // Secondary: summon
            for (let s = 0; s < 2; s++) { this._spawnEnemy("imp"); this._waveEnemiesTotal++; }
          }
        }
      }
    }

    // ── Shadow drake projectile attacks ──
    for (const enemy of this._enemies) {
      if (enemy.dead || enemy.isBoss || enemy.type !== "shadow_drake") continue;
      enemy.bossAbilityTimer += dt;
      if (enemy.bossAbilityTimer >= enemy.bossAbilityThreshold) {
        enemy.bossAbilityTimer = 0;
        enemy.bossAbilityThreshold = 3 + Math.random() * 2; // randomize next threshold
        // Fire dark bolt toward grail
        const eBoltMat = new THREE.MeshStandardMaterial({ color: 0x6622aa, emissive: 0x440088, emissiveIntensity: 2, transparent: true, opacity: 0.9 });
        const eBoltMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), eBoltMat);
        eBoltMesh.position.copy(enemy.pos);
        this._scene.add(eBoltMesh);
        const eBoltGlow = new THREE.PointLight(0x6622aa, 1.5, 6);
        eBoltMesh.add(eBoltGlow);
        const eBoltDir = new THREE.Vector3(0, GRAIL_Y, 0).sub(enemy.pos).normalize();
        this._enemyBolts.push({ mesh: eBoltMesh, dir: eBoltDir, alive: true, time: 0 });
      }
    }

    // ── Update enemy bolts ──
    for (const eb of this._enemyBolts) {
      if (!eb.alive) continue;
      eb.time += dt;
      eb.mesh.position.add(eb.dir.clone().multiplyScalar(20 * dt));
      // Check if reached grail area
      const distToGrail = eb.mesh.position.distanceTo(new THREE.Vector3(0, GRAIL_Y, 0));
      if (distToGrail < 5) {
        this._grailHp -= 5;
        eb.alive = false;
        this._scene.remove(eb.mesh);
        eb.mesh.geometry.dispose();
        (eb.mesh.material as THREE.Material).dispose();
      }
      // Timeout
      if (eb.time > 5) {
        eb.alive = false;
        this._scene.remove(eb.mesh);
        eb.mesh.geometry.dispose();
        (eb.mesh.material as THREE.Material).dispose();
      }
    }
    this._enemyBolts = this._enemyBolts.filter((eb) => eb.alive);

    // ── Player proximity hit ──
    if (this._playerHitCooldown > 0) this._playerHitCooldown -= dt;
    if (this._screenFlashTimer > 0) this._screenFlashTimer -= dt;
    if (this._playerHitCooldown <= 0 && !this._isInvulnerable) {
      for (const enemy of this._enemies) {
        if (enemy.dead) continue;
        const distToPlayer = enemy.pos.distanceTo(this._playerPos);
        if (distToPlayer < 2) {
          // Player got hit
          this._playerHitCooldown = 3.0;
          this._screenFlashTimer = 0.2;
          this._grailHp -= 15;
          this._spawnFloatingText(this._playerPos, "HIT!", "#ff4444");
          this._playSound("kill");
          break;
        }
      }
    }

    // ── Grail overflow mechanic ──
    if (this._grailHealActive && this._grailHp >= this._grailMaxHp) {
      this._overflowCharge = Math.min(100, this._overflowCharge + 5 * dt);
      if (this._overflowCharge >= 100) {
        this._overflowCharge = 0;
        // Trigger a free nova (no cooldown cost)
        const novaDmg = NOVA_DAMAGE + this._upgradeLevels["nova_dmg"] * 15;
        const novaRad = NOVA_RADIUS + this._upgradeLevels["nova_dmg"] * 3;
        for (const enemy of this._enemies) {
          if (enemy.dead) continue;
          const dist = enemy.pos.distanceTo(this._playerPos);
          if (dist < novaRad) {
            const dmg = novaDmg * (1 - dist / novaRad * 0.5);
            this._damageEnemy(enemy, dmg);
          }
        }
        // Visual
        const novaMat = new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
        const novaMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), novaMat);
        novaMesh.position.copy(this._playerPos);
        this._addParticle(novaMesh, 0.8, (el) => {
          novaMesh.scale.setScalar(1 + (novaRad / 1) * el);
          novaMat.opacity = 0.4 * (1 - el / 0.8);
        });
        this._spawnFloatingText(this._playerPos, "OVERFLOW NOVA!", "#44ff44");
        this._playSound("nova");
      }
    } else if (!this._grailHealActive || this._grailHp < this._grailMaxHp) {
      // Decay overflow when not healing at max
      this._overflowCharge = Math.max(0, this._overflowCharge - 10 * dt);
    }

    // ── Low HP warning sound ──
    if (this._grailHp > 0 && this._grailHp / this._grailMaxHp < 0.3) {
      this._warningTimer -= dt;
      if (this._warningTimer <= 0) {
        this._playSound("warning");
        this._warningTimer = 2.0; // play every 2 seconds
      }
    } else {
      this._warningTimer = 0;
    }

    // ── SPS tracking ──
    this._recentSouls = this._recentSouls.filter((s) => this._time - s.time < 5);
    this._currentSPS = this._recentSouls.reduce((sum, s) => sum + s.amount, 0) / 5;

    // ── Difficulty scaling for late waves ──
    // (Speed scaling applied in enemy movement above via wave-based speed calc)

    // ── Update particles ──
    this._updateParticles(dt);

    // ── Camera ──
    const camDist = 22;
    const camHeight = this._playerAltitude + 8;
    const camAngle = this._playerAngle + Math.PI; // behind player
    this._camera.position.set(
      Math.cos(camAngle) * camDist,
      camHeight,
      Math.sin(camAngle) * camDist,
    );
    this._camera.lookAt(0, GRAIL_Y, 0);

    // ── Grail animation ──
    this._grailMesh.rotation.y = this._time * 0.3;
    const anyDraining = this._enemies.some((e) => !e.dead && e.draining);
    if (anyDraining) {
      // Pulse red more intensely when enemies are draining
      this._grailLight.intensity = 4 + Math.sin(this._time * 8) * 2;
      this._grailLight.color.setHex(0xff2200);
    } else {
      this._grailLight.intensity = 3 + Math.sin(this._time * 2) * 0.5;
    }
    const grailRatio = this._grailHp / this._grailMaxHp;
    if (!anyDraining) this._grailLight.color.setHSL(0.12 * grailRatio, 0.8, 0.5 + grailRatio * 0.2);
    const hp = this._grailMesh.getObjectByName("holyParticles") as THREE.Points | undefined;
    if (hp) hp.rotation.y = this._time * 0.5;
    const gpRune = this._grailMesh.getObjectByName("grailRune") as THREE.Mesh | undefined;
    if (gpRune) gpRune.rotation.z = this._time * 1.2;
    const gpAura = this._grailMesh.getObjectByName("grailAura") as THREE.Mesh | undefined;
    if (gpAura) gpAura.scale.setScalar(1 + Math.sin(this._time * 1.5) * 0.12);
    // Grail beam animation
    const gpBeam = this._grailMesh.getObjectByName("grailBeam") as THREE.Mesh | undefined;
    if (gpBeam) {
      (gpBeam.material as THREE.MeshBasicMaterial).opacity = 0.06 + 0.04 * Math.sin(this._time * 2);
      gpBeam.rotation.y = this._time * 0.5;
    }
    // Ambient particles drift
    if (this._ambientParticles) {
      const aPos = this._ambientParticles.geometry.attributes.position as THREE.BufferAttribute;
      const aArr = aPos.array as Float32Array;
      for (let i = 0; i < 150; i++) {
        aArr[i * 3 + 1] += 0.003;
        aArr[i * 3] += Math.sin(this._time * 0.5 + i) * 0.002;
        aArr[i * 3 + 2] += Math.cos(this._time * 0.5 + i) * 0.002;
        if (aArr[i * 3 + 1] > 25) aArr[i * 3 + 1] = -10;
      }
      aPos.needsUpdate = true;
    }
    // Distant islands bob
    for (let i = 0; i < 8; i++) {
      const dIsland = this._scene.getObjectByName(`distIsland${i}`);
      if (dIsland) dIsland.position.y += Math.sin(this._time * 0.3 + i) * 0.003;
    }
    // Player orbit trail
    if (this._time - this._lastTrailTime > 0.1) {
      this._lastTrailTime = this._time;
      if (this._trailParticles.length < 10) {
        const trMat = new THREE.MeshBasicMaterial({ color: 0x4466cc, transparent: true, opacity: 0.35, depthWrite: false });
        const trMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), trMat);
        trMesh.position.copy(this._playerPos);
        this._trailParticles.push(trMesh);
        this._addParticle(trMesh, 0.4, (el) => {
          trMat.opacity = 0.35 * (1 - el / 0.4);
          trMesh.scale.setScalar(1 - el / 0.4);
        }, () => {
          this._scene.remove(trMesh);
          trMesh.geometry.dispose();
          trMat.dispose();
          const idx = this._trailParticles.indexOf(trMesh);
          if (idx !== -1) this._trailParticles.splice(idx, 1);
        });
      }
    }

    // ── Wave complete check ──
    if (this._phase === "playing") {
      const allSpawned = this._spawnCounts.every((c, i) => c >= this._waveSpawns[i].count);
      if (allSpawned && this._enemies.every((e) => e.dead)) this._phase = "between_waves";
    }
    if (this._phase === "boss") {
      if (!this._enemies.some((e) => e.isBoss && !e.dead) && this._enemies.every((e) => e.dead)) {
        this._souls += 40;
        if (this._wave >= 20) { this._phase = "victory"; this._saveHighscore(); this._stopMusic(); }
        else this._phase = "between_waves";
      }
    }

    // ── Defeat ──
    if (this._grailHp <= 0) {
      this._grailHp = 0;
      this._phase = "defeat";
      this._saveHighscore();
      this._stopMusic();
    }
  }

  // ── Highscore ────────────────────────────────────────────────────────────

  private _saveHighscore(): void {
    try {
      if (this._score > this._highscore) { this._highscore = this._score; localStorage.setItem("grailkeeper_highscore", String(this._highscore)); }
      if (this._wave > this._bestWave) { this._bestWave = this._wave; localStorage.setItem("grailkeeper_bestwave", String(this._bestWave)); }
    } catch { /* */ }
  }

  // ── Audio ────────────────────────────────────────────────────────────────

  private _initAudio(): void { try { this._audioCtx = new AudioContext(); } catch { /* */ } }

  private _startMusic(): void {
    if (!this._audioCtx) return;
    try {
      this._stopMusic();
      const ctx = this._audioCtx;
      // Ethereal choir drone
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 110;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.2;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 5;
      lfo.connect(lfoG).connect(osc.frequency);
      lfo.start();
      const gain = ctx.createGain();
      gain.gain.value = 0.03;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 300;
      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc.start();
      this._musicOsc = osc;

      // Second layer: higher harmonic
      const osc2 = ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.value = 165;
      const gain2 = ctx.createGain();
      gain2.gain.value = 0.015;
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start();
      this._musicOsc2 = osc2;
      this._musicLfo = lfo;
    } catch { /* */ }
  }

  private _stopMusic(): void {
    if (this._musicOsc) { try { this._musicOsc.stop(); } catch { /* */ } this._musicOsc = null; }
    if (this._musicOsc2) { try { this._musicOsc2.stop(); } catch { /* */ } this._musicOsc2 = null; }
    if (this._musicLfo) { try { this._musicLfo.stop(); } catch { /* */ } this._musicLfo = null; }
  }

  private _playSound(type: "bolt" | "kill" | "buy" | "launch" | "dash" | "shield" | "nova" | "boss_roar" | "shield_burst" | "heal" | "warning"): void {
    if (!this._audioCtx) return;
    try {
      const ctx = this._audioCtx;
      const now = ctx.currentTime;

      if (type === "bolt") {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(800 + Math.random() * 200, now);
        o.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        o.connect(g).connect(ctx.destination); o.start(now); o.stop(now + 0.12);
      }
      if (type === "kill") {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "square"; o.frequency.setValueAtTime(500 + Math.random() * 300, now);
        o.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        g.gain.setValueAtTime(0.07, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        o.connect(g).connect(ctx.destination); o.start(now); o.stop(now + 0.2);
      }
      if (type === "buy") {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(400, now); o.frequency.linearRampToValueAtTime(800, now + 0.1);
        g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        o.connect(g).connect(ctx.destination); o.start(now); o.stop(now + 0.15);
      }
      if (type === "launch") {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "sawtooth"; o.frequency.setValueAtTime(300, now); o.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        o.connect(g).connect(ctx.destination); o.start(now); o.stop(now + 0.4);
      }
      if (type === "dash") {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(600, now); o.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        o.connect(g).connect(ctx.destination); o.start(now); o.stop(now + 0.2);
      }
      if (type === "shield") {
        for (const f of [330, 440, 550]) {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.type = "sine"; o.frequency.value = f;
          g.gain.setValueAtTime(0.04, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          o.connect(g).connect(ctx.destination); o.start(now); o.stop(now + 0.3);
        }
      }
      if (type === "nova") {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "sawtooth"; o.frequency.setValueAtTime(100, now); o.frequency.exponentialRampToValueAtTime(40, now + 0.5);
        g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 200;
        o.connect(f).connect(g).connect(ctx.destination); o.start(now); o.stop(now + 0.6);
      }
      if (type === "boss_roar") {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "sawtooth"; o.frequency.setValueAtTime(70, now); o.frequency.linearRampToValueAtTime(40, now + 0.8);
        g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + 1);
        const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 180;
        o.connect(f).connect(g).connect(ctx.destination); o.start(now); o.stop(now + 1);
      }
      if (type === "shield_burst") {
        // Whoosh sound: white noise burst with bandpass
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        const src = ctx.createBufferSource(); src.buffer = buffer;
        const bpf = ctx.createBiquadFilter(); bpf.type = "bandpass"; bpf.frequency.value = 600; bpf.Q.value = 1;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        src.connect(bpf).connect(g).connect(ctx.destination); src.start(now); src.stop(now + 0.3);
        // Golden chime accent
        const o = ctx.createOscillator(); const g2 = ctx.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(880, now); o.frequency.exponentialRampToValueAtTime(440, now + 0.2);
        g2.gain.setValueAtTime(0.06, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        o.connect(g2).connect(ctx.destination); o.start(now); o.stop(now + 0.25);
      }
      if (type === "heal") {
        // Ascending gentle sine arpeggio
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        for (let i = 0; i < notes.length; i++) {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.type = "sine"; o.frequency.value = notes[i];
          const t = now + i * 0.08;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.04, t + 0.04);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.2);
        }
      }
      if (type === "warning") {
        // Low pulsing tone
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "sine"; o.frequency.value = 80;
        const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
        lfo.type = "sine"; lfo.frequency.value = 4; lfoG.gain.value = 0.04;
        lfo.connect(lfoG).connect(g.gain);
        g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        o.connect(g).connect(ctx.destination); o.start(now); o.stop(now + 0.6); lfo.start(now); lfo.stop(now + 0.6);
      }
    } catch { /* */ }
  }
}
