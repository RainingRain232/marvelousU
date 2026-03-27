/**
 * EPSILON — 3D Arena Spell-Caster Survival
 *
 * Stand on a floating stone platform in the cosmic void.
 * Waves of ethereal geometric enemies (Epsilon Entities) materialize and close in.
 * Rotate, aim, and cast elemental spells to survive.
 * Between waves, pick upgrades to grow stronger.
 *
 * Mouse aim + Left click = fire spell
 * WASD = strafe on the platform
 * 1/2/3 = switch spell element (fire / ice / lightning)
 * SPACE = shield burst (cooldown)
 * ESC = pause
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { viewManager } from "@view/ViewManager";

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, offset: { value: 1.0 }, darkness: { value: 1.5 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform float offset; uniform float darkness; uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() { vec4 t = texture2D(tDiffuse, vUv); vec2 u = (vUv - vec2(0.5)) * vec2(offset); gl_FragColor = vec4(mix(t.rgb, vec3(1.0 - darkness), dot(u,u)), t.a); }`,
};
const ChromaticShader = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0.0 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; varying vec2 vUv;
    void main() { vec2 d = vUv - vec2(0.5); float l = length(d); vec2 o = d * l * amount;
    float r = texture2D(tDiffuse, vUv + o).r; float g = texture2D(tDiffuse, vUv).g; float b = texture2D(tDiffuse, vUv - o).b;
    gl_FragColor = vec4(r, g, b, 1.0); }`,
};

// ── constants ────────────────────────────────────────────────────────────────

const SIM_DT = 1 / 60;
const PLATFORM_RADIUS = 12;
const PLAYER_SPEED = 5;
const PLAYER_RADIUS = 0.4;

const SPELL_SPEED = 20;
const SPELL_RADIUS = 0.25;
const SPELL_LIFETIME = 120; // frames
const SPELL_COOLDOWN = 10; // frames between shots
const SHIELD_BURST_RADIUS = 4;
const SHIELD_BURST_COOLDOWN = 300; // 5 seconds

const WAVE_PAUSE = 180;
const BASE_ENEMIES_PER_WAVE = 5;
const SPAWN_RING_RADIUS = 20;

const DASH_SPEED = 18;
const DASH_DURATION = 10; // frames
const DASH_COOLDOWN = 60; // 1 second
const COMBO_DECAY = 120;
const XP_PER_KILL = 10;
const XP_PER_LEVEL = 50;
const BOSS_WAVE_INTERVAL = 5; // boss every 5 waves
const SECONDARY_COOLDOWN = 480; // 8 seconds
const XP_ORB_SPEED = 4;
const XP_ORB_RADIUS = 0.2;
const PLATFORM_SHRINK_START_WAVE = 10;
const SYNERGY_WINDOW = 30; // frames after switching element to get bonus
const SYNERGY_BONUS = 1.4; // 40% extra damage on quick switch
const HP_PICKUP_CHANCE = 0.08; // 8% chance per kill
const ELITE_CHANCE_BASE = 0.05;

const EPSILON_DIFFICULTY = {
  apprentice: { enemyHpMult: 0.7, enemySpeedMult: 0.8, spawnMult: 0.8, label: "APPRENTICE", color: "#44cc44" },
  archmage:   { enemyHpMult: 1.0, enemySpeedMult: 1.0, spawnMult: 1.0, label: "ARCHMAGE", color: "#ffaa00" },
  voidlord:   { enemyHpMult: 1.4, enemySpeedMult: 1.2, spawnMult: 1.3, label: "VOID LORD", color: "#ff4444" },
} as const;
type EpsilonDiffKey = keyof typeof EPSILON_DIFFICULTY;

interface WaveModifier {
  name: string;
  desc: string;
  color: string;
  apply: () => void;
  revert: () => void;
}

interface HpPickup {
  x: number; z: number;
  mesh: THREE.Mesh | null;
  life: number;
  healAmount: number;
}

// ── types ────────────────────────────────────────────────────────────────────

const enum EpsilonPhase { TITLE, PLAYING, WAVE_CLEAR, UPGRADE, GAME_OVER, PAUSED }
const enum SpellElement { FIRE = 0, ICE = 1, LIGHTNING = 2 }
const enum EnemyType { SEEKER, ORBITER, DASHER, TITAN, SPLITTER, BOSS }

interface Spell {
  x: number; z: number; y: number;
  vx: number; vz: number;
  element: SpellElement;
  life: number;
  mesh: THREE.Mesh | null;
}

interface Enemy {
  x: number; z: number; y: number;
  vx: number; vz: number;
  hp: number; maxHp: number;
  type: EnemyType;
  radius: number;
  speed: number;
  mesh: THREE.Group | null;
  hitFlash: number;
  orbitAngle: number;
  spawnTimer: number; // frames to fully materialize (scale 0->1)
  slowTimer: number; // ice slow effect
  burnTimer: number;
  burnDamage: number;
  attackTimer: number;
  isElite: boolean;
}

interface PlayerState {
  x: number; z: number;
  vx: number; vz: number; // for dash
  angle: number;
  hp: number; maxHp: number;
  element: SpellElement;
  spellCooldown: number;
  shieldCooldown: number;
  dashCooldown: number;
  dashTimer: number;
  spellDamage: number;
  spellPierce: number;
  castSpeed: number;
  score: number;
  kills: number;
  wave: number;
  xp: number;
  level: number;
  combo: number;
  comboTimer: number;
  maxCombo: number;
  secondaryCooldown: number;
  chargeFrames: number;
  multiShot: number; // 0=single, 1=triple spread, 2+=wider
  homing: number; // 0=none, homing strength per upgrade
  orbitSpells: number; // number of orbiting barrier spells
  xpMagnetRadius: number; // base 3, upgradeable
  lifeSteal: number;
  moveSpeed: number;
  lastElementSwitch: number; // frame when element was last changed
  upgradeHistory: string[]; // names of picked upgrades for run summary
}

interface XpOrb {
  x: number; z: number;
  mesh: THREE.Mesh | null;
  value: number;
  life: number;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function dist(ax: number, az: number, bx: number, bz: number) {
  const dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz);
}

const ELEMENT_COLORS: Record<number, number> = {
  [SpellElement.FIRE]: 0xff4422,
  [SpellElement.ICE]: 0x44ccff,
  [SpellElement.LIGHTNING]: 0xddaaff,
};
const ELEMENT_NAMES = ["FIRE", "ICE", "LIGHTNING"];
const ENEMY_COLORS: Record<number, number> = {
  [EnemyType.SEEKER]: 0xff3366,
  [EnemyType.ORBITER]: 0x66ff33,
  [EnemyType.DASHER]: 0xff9900,
  [EnemyType.TITAN]: 0xaa33ff,
  [EnemyType.SPLITTER]: 0x33ffcc,
  [EnemyType.BOSS]: 0xff00ff,
};

// ═════════════════════════════════════════════════════════════════════════════

export class EpsilonGame {
  private _canvas!: HTMLCanvasElement;
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _composer!: EffectComposer;
  private _bloomPass!: UnrealBloomPass;

  private _phase: EpsilonPhase = EpsilonPhase.TITLE;
  private _player!: PlayerState;
  private _playerMesh: THREE.Group | null = null;
  private _staffMesh: THREE.Group | null = null;
  private _shieldMesh: THREE.Mesh | null = null;
  private _spells: Spell[] = [];
  private _enemies: Enemy[] = [];
  private _frame = 0;
  private _waveTimer = 0;
  private _simAccum = 0;
  private _tickerCb: ((t: { deltaMS: number }) => void) | null = null;

  // input
  private _keys: Record<string, boolean> = {};
  private _mouseX = 0;
  private _mouseZ = 0;
  private _mouseDown = false;
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private _mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private _mouseDownHandler: ((e: MouseEvent) => void) | null = null;
  private _mouseUpHandler: ((e: MouseEvent) => void) | null = null;

  // scene
  private _platform!: THREE.Mesh;
  private _voidParticles!: THREE.Points;
  private _voidPositions!: Float32Array;
  private _spellParticles!: THREE.Points;
  private _spellPartPositions!: Float32Array;
  private _spellPartLife!: Float32Array;
  private _spellPartVelocities!: Float32Array;

  // HUD
  private _hudDiv: HTMLDivElement | null = null;
  private _overlayDiv: HTMLDivElement | null = null;
  private _hpBar: HTMLDivElement | null = null;
  private _shieldBar: HTMLDivElement | null = null;
  private _waveDiv: HTMLDivElement | null = null;
  private _scoreDiv: HTMLDivElement | null = null;
  private _elementDiv: HTMLDivElement | null = null;
  private _crosshair: HTMLDivElement | null = null;

  // effects
  private _shakeIntensity = 0;
  private _hitFreezeFrames = 0;
  private _iFrames = 0; // invincibility frames after taking damage
  private _damageFlashDiv: HTMLDivElement | null = null;
  private _waveBannerDiv: HTMLDivElement | null = null;
  private _radarCanvas: HTMLCanvasElement | null = null;
  private _radarCtx: CanvasRenderingContext2D | null = null;
  private _playerShadow: THREE.Mesh | null = null;
  private _arcaneRingMeshes: THREE.Mesh[] = [];
  private _pillarOrbs: THREE.Mesh[] = [];
  private _ambientDrone: AudioBufferSourceNode | null = null;
  private _xpOrbs: XpOrb[] = [];
  private _currentPlatformRadius = PLATFORM_RADIUS;
  private _secondaryBar: HTMLDivElement | null = null;
  private _chromaticPass: ShaderPass | null = null;
  private _chromaticTarget = 0;
  // edge warning
  private _edgeWarningRing: THREE.Mesh | null = null;
  // void tentacles
  private _tentacles: THREE.Mesh[] = [];
  // combo runes around player
  private _comboRuneRing: THREE.Group | null = null;
  // orbit barrier spells
  private _orbitSpellMeshes: THREE.Mesh[] = [];
  // kill shockwave rings
  private _killShockwaves: Array<{ mesh: THREE.Mesh; life: number }> = [];
  // boss HP bar
  private _bossHpContainer: HTMLDivElement | null = null;
  private _bossHpBar: HTMLDivElement | null = null;
  private _bossHpName: HTMLDivElement | null = null;
  // staff point light
  private _staffLight: THREE.PointLight | null = null;
  // danger indicators
  private _dangerDiv: HTMLDivElement | null = null;
  // nebula clouds
  private _nebulae: THREE.Mesh[] = [];
  // ruin chunks
  private _ruinChunks: THREE.Mesh[] = [];
  // platform underglow
  private _underGlow: THREE.Mesh | null = null;
  // pillar beam connections
  private _pillarBeams: THREE.Mesh[] = [];
  // muzzle flash
  private _muzzleFlash: THREE.Mesh | null = null;
  private _muzzleFlashTimer = 0;
  // dash afterimages
  private _dashGhosts: Array<{ mesh: THREE.Mesh; life: number }> = [];
  // shooting stars
  private _shootingStars: Array<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }> = [];
  // spawn portals
  private _spawnPortals: Array<{ mesh: THREE.Mesh; life: number }> = [];
  // player level aura
  private _levelAura: THREE.Mesh | null = null;
  // center glow
  private _centerGlow: THREE.Mesh | null = null;
  // wave clear particles
  private _waveClearBurst = 0;
  // boss atmosphere
  private _bossAtmosphere = 0;
  // scorch marks on platform
  private _scorchMarks: Array<{ mesh: THREE.Mesh; life: number }> = [];
  // void vortex
  private _vortexRings: THREE.Mesh[] = [];
  // crumble rocks
  private _crumbleRocks: Array<{ mesh: THREE.Mesh; vy: number; life: number }> = [];
  // enemy death dissolve queue
  private _deathDissolves: Array<{ mesh: THREE.Group; timer: number }> = [];
  // wave modifier
  private _activeModifier: WaveModifier | null = null;
  // HP pickups
  private _hpPickups: HpPickup[] = [];
  // dash cooldown indicator
  private _dashIndicator: HTMLDivElement | null = null;
  // difficulty
  private _difficulty: EpsilonDiffKey = "archmage";
  private _selectedDifficulty = 1;
  // slow-mo
  private _slowMoTimer = 0;
  private _slowMoScale = 1;
  // tutorial tips
  private _tipDiv: HTMLDivElement | null = null;
  private _tipShown = new Set<string>();
  // passive regen
  private _passiveRegen = 0; // HP/sec from upgrades
  // spell trail particles
  private _spellTrailPositions!: Float32Array;
  private _spellTrailLife!: Float32Array;
  private _spellTrailParticles!: THREE.Points;
  private _damageNumbers: Array<{ x: number; z: number; y: number; text: string; life: number; color: string; div: HTMLDivElement }> = [];
  private _comboDiv: HTMLDivElement | null = null;
  private _xpBar: HTMLDivElement | null = null;
  private _levelDiv: HTMLDivElement | null = null;
  // audio
  private _audioCtx: AudioContext | null = null;

  // ── boot / destroy ─────────────────────────────────────────────────────

  async boot(): Promise<void> {
    viewManager.clearWorld();
    this._initRenderer();
    this._initScene();
    this._initInput();
    this._initHUD();
    this._initPlayer();
    this._phase = EpsilonPhase.TITLE;
    this._showOverlay("title");

    this._tickerCb = (t) => this._update(t.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb as any);
  }

  destroy(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb as any); this._tickerCb = null; }
    if (this._keyDownHandler) window.removeEventListener("keydown", this._keyDownHandler);
    if (this._keyUpHandler) window.removeEventListener("keyup", this._keyUpHandler);
    if (this._mouseMoveHandler) window.removeEventListener("mousemove", this._mouseMoveHandler);
    if (this._mouseDownHandler) window.removeEventListener("mousedown", this._mouseDownHandler);
    if (this._mouseUpHandler) window.removeEventListener("mouseup", this._mouseUpHandler);
    if (this._hudDiv) { this._hudDiv.remove(); this._hudDiv = null; }
    if (this._ambientDrone) { try { this._ambientDrone.stop(); } catch {} this._ambientDrone = null; }
    if (this._canvas?.parentNode) this._canvas.parentNode.removeChild(this._canvas);
    if (this._composer) this._composer.dispose();
    if (this._renderer) this._renderer.dispose();
    if (this._audioCtx) { this._audioCtx.close(); this._audioCtx = null; }
    const pixiCanvas = viewManager.app.canvas as HTMLElement;
    pixiCanvas.style.zIndex = ""; pixiCanvas.style.pointerEvents = "";
    viewManager.app.renderer.background.color = 0x1a1a2e;
    viewManager.app.renderer.background.alpha = 1;
  }

  // ── audio ──────────────────────────────────────────────────────────────

  private _ensureAudio(): AudioContext {
    if (!this._audioCtx) this._audioCtx = new AudioContext();
    if (this._audioCtx.state === "suspended") this._audioCtx.resume();
    return this._audioCtx;
  }

  private _playSound(type: "fire" | "ice" | "lightning" | "hit" | "kill" | "shield" | "hurt" | "wave" | "death"): void {
    try {
      const ctx = this._ensureAudio();
      const now = ctx.currentTime;
      const g = ctx.createGain();
      g.connect(ctx.destination);

      if (type === "fire") {
        const o = ctx.createOscillator(); o.type = "sawtooth";
        o.frequency.setValueAtTime(200, now); o.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        o.connect(g); o.start(now); o.stop(now + 0.18);
      } else if (type === "ice") {
        const o = ctx.createOscillator(); o.type = "sine";
        o.frequency.setValueAtTime(800, now); o.frequency.exponentialRampToValueAtTime(400, now + 0.2);
        g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        o.connect(g); o.start(now); o.stop(now + 0.25);
      } else if (type === "lightning") {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
        const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() - 0.5) * 0.5;
        const n = ctx.createBufferSource(); n.buffer = buf;
        g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        n.connect(g); n.start(now); n.stop(now + 0.1);
      } else if (type === "hit") {
        const o = ctx.createOscillator(); o.type = "triangle";
        o.frequency.setValueAtTime(300, now); o.frequency.exponentialRampToValueAtTime(100, now + 0.08);
        g.gain.setValueAtTime(0.1, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        o.connect(g); o.start(now); o.stop(now + 0.1);
      } else if (type === "kill") {
        for (const freq of [400, 500, 600]) {
          const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq;
          const gg = ctx.createGain(); gg.gain.setValueAtTime(0.08, now); gg.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          o.connect(gg).connect(ctx.destination); o.start(now); o.stop(now + 0.3);
        }
      } else if (type === "shield") {
        const o = ctx.createOscillator(); o.type = "sine";
        o.frequency.setValueAtTime(300, now); o.frequency.linearRampToValueAtTime(600, now + 0.3);
        g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        o.connect(g); o.start(now); o.stop(now + 0.4);
      } else if (type === "hurt") {
        const o = ctx.createOscillator(); o.type = "square";
        o.frequency.setValueAtTime(150, now); o.frequency.exponentialRampToValueAtTime(60, now + 0.2);
        g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        o.connect(g); o.start(now); o.stop(now + 0.25);
      } else if (type === "wave") {
        const o = ctx.createOscillator(); o.type = "sine";
        o.frequency.setValueAtTime(500, now); o.frequency.setValueAtTime(700, now + 0.15);
        g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        o.connect(g); o.start(now); o.stop(now + 0.3);
      } else if (type === "death") {
        const o = ctx.createOscillator(); o.type = "sawtooth";
        o.frequency.setValueAtTime(200, now); o.frequency.exponentialRampToValueAtTime(30, now + 1.0);
        g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        o.connect(g); o.start(now); o.stop(now + 1.0);
      }
    } catch { /* audio unavailable */ }
  }

  // ── renderer ───────────────────────────────────────────────────────────

  private _initRenderer(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this._canvas = document.createElement("canvas");
    this._canvas.id = "epsilon-canvas";
    Object.assign(this._canvas.style, { position: "absolute", top: "0", left: "0", width: "100%", height: "100%", zIndex: "10" });
    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._canvas);

    this._renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.2;

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x020208);
    this._scene.fog = new THREE.FogExp2(0x020208, 0.015);

    this._camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
    this._camera.position.set(0, 18, 14);
    this._camera.lookAt(0, 0, 0);

    // post-processing
    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(new RenderPass(this._scene, this._camera));
    this._bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.8, 0.5, 0.4);
    this._composer.addPass(this._bloomPass);
    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms["darkness"].value = 1.5;
    this._composer.addPass(vignette);
    this._chromaticPass = new ShaderPass(ChromaticShader);
    this._composer.addPass(this._chromaticPass);
    this._composer.addPass(new OutputPass());

    const pixiCanvas = viewManager.app.canvas as HTMLElement;
    Object.assign(pixiCanvas.style, { position: "absolute", top: "0", left: "0", zIndex: "20", pointerEvents: "none" });
    viewManager.app.renderer.background.color = 0x000000;
    viewManager.app.renderer.background.alpha = 0;

    window.addEventListener("resize", this._onResize);
  }

  private _onResize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(w, h);
    if (this._composer) this._composer.setSize(w, h);
  };

  // ── scene ──────────────────────────────────────────────────────────────

  private _initScene(): void {
    // ambient
    this._scene.add(new THREE.AmbientLight(0x223344, 0.4));
    const hemi = new THREE.HemisphereLight(0x6644aa, 0x112233, 0.5);
    this._scene.add(hemi);

    // main light
    const dir = new THREE.DirectionalLight(0x8866cc, 0.6);
    dir.position.set(5, 15, 8); dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 1; dir.shadow.camera.far = 40;
    dir.shadow.camera.left = -15; dir.shadow.camera.right = 15;
    dir.shadow.camera.top = 15; dir.shadow.camera.bottom = -15;
    this._scene.add(dir);

    // floating platform
    const platGeo = new THREE.CylinderGeometry(PLATFORM_RADIUS, PLATFORM_RADIUS - 0.5, 1.5, 48);
    const platCanvas = document.createElement("canvas");
    platCanvas.width = 512; platCanvas.height = 512;
    const pctx = platCanvas.getContext("2d")!;
    // stone pattern
    pctx.fillStyle = "#3a3a44";
    pctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 200; i++) {
      const px = Math.random() * 512, py = Math.random() * 512;
      const s = 50 + Math.floor(Math.random() * 20);
      pctx.fillStyle = `rgb(${s},${s},${s + 10})`;
      pctx.fillRect(px, py, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }
    // arcane circle
    pctx.strokeStyle = "rgba(100,80,200,0.3)";
    pctx.lineWidth = 3;
    pctx.beginPath(); pctx.arc(256, 256, 200, 0, Math.PI * 2); pctx.stroke();
    pctx.beginPath(); pctx.arc(256, 256, 150, 0, Math.PI * 2); pctx.stroke();
    // rune marks
    for (let r = 0; r < 8; r++) {
      const rx = 256 + Math.cos(r * Math.PI / 4) * 175;
      const ry = 256 + Math.sin(r * Math.PI / 4) * 175;
      pctx.fillStyle = "rgba(130,100,220,0.4)";
      pctx.font = "bold 24px serif";
      pctx.fillText("ε", rx - 6, ry + 8);
    }
    const platTex = new THREE.CanvasTexture(platCanvas);
    platTex.wrapS = THREE.RepeatWrapping; platTex.wrapT = THREE.RepeatWrapping;
    this._platform = new THREE.Mesh(platGeo, new THREE.MeshStandardMaterial({ map: platTex, roughness: 0.8, metalness: 0.15 }));
    this._platform.position.y = -0.75;
    this._platform.receiveShadow = true;
    this._scene.add(this._platform);

    // platform edge glow ring
    const edgeGeo = new THREE.TorusGeometry(PLATFORM_RADIUS, 0.08, 8, 64);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x6644cc, transparent: true, opacity: 0.6 });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.rotation.x = Math.PI / 2; edge.position.y = 0.01;
    this._scene.add(edge);
    this._arcaneRingMeshes.push(edge);

    // inner arcane ring
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(PLATFORM_RADIUS * 0.6, 0.04, 6, 48),
      new THREE.MeshBasicMaterial({ color: 0x8866dd, transparent: true, opacity: 0.3 })
    );
    innerRing.rotation.x = Math.PI / 2; innerRing.position.y = 0.02;
    this._scene.add(innerRing);
    this._arcaneRingMeshes.push(innerRing);

    // second inner ring (rotating opposite direction)
    const innerRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(PLATFORM_RADIUS * 0.35, 0.03, 6, 36),
      new THREE.MeshBasicMaterial({ color: 0xaa88ff, transparent: true, opacity: 0.2 })
    );
    innerRing2.rotation.x = Math.PI / 2; innerRing2.position.y = 0.025;
    this._scene.add(innerRing2);
    this._arcaneRingMeshes.push(innerRing2);

    // player shadow blob
    this._playerShadow = new THREE.Mesh(
      new THREE.CircleGeometry(PLAYER_RADIUS * 1.5, 12),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false })
    );
    this._playerShadow.rotation.x = -Math.PI / 2;
    this._playerShadow.position.y = 0.01;
    this._scene.add(this._playerShadow);

    // void particles (cosmic dust in the abyss below)
    const voidCount = 500;
    this._voidPositions = new Float32Array(voidCount * 3);
    for (let i = 0; i < voidCount; i++) {
      this._voidPositions[i * 3] = (Math.random() - 0.5) * 80;
      this._voidPositions[i * 3 + 1] = -2 - Math.random() * 30;
      this._voidPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    const voidGeo = new THREE.BufferGeometry();
    voidGeo.setAttribute("position", new THREE.BufferAttribute(this._voidPositions, 3));
    this._voidParticles = new THREE.Points(voidGeo, new THREE.PointsMaterial({
      color: 0x6644aa, size: 0.15, transparent: true, opacity: 0.4, depthWrite: false,
    }));
    this._scene.add(this._voidParticles);

    // nebula clouds (large translucent colored planes floating in the void)
    const nebulaColors = [0x4422aa, 0x662288, 0x2244aa, 0x882266, 0x224488];
    for (let ni = 0; ni < 8; ni++) {
      const nw = 8 + Math.random() * 15, nh = 6 + Math.random() * 10;
      const nebMat = new THREE.MeshBasicMaterial({
        color: nebulaColors[ni % nebulaColors.length],
        transparent: true, opacity: 0.06 + Math.random() * 0.04,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const neb = new THREE.Mesh(new THREE.PlaneGeometry(nw, nh), nebMat);
      const na = Math.random() * Math.PI * 2;
      const nr = 20 + Math.random() * 25;
      neb.position.set(Math.cos(na) * nr, -5 - Math.random() * 15, Math.sin(na) * nr);
      neb.rotation.set(Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.3);
      this._scene.add(neb);
      this._nebulae.push(neb);
    }

    // distant floating ruin chunks
    for (let ri = 0; ri < 6; ri++) {
      const ra = (ri / 6) * Math.PI * 2 + Math.random() * 0.5;
      const rd = 22 + Math.random() * 10;
      const ruinGeo = new THREE.BoxGeometry(0.5 + Math.random() * 1.5, 0.3 + Math.random() * 1.0, 0.5 + Math.random() * 1.5);
      const ruinMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a35, roughness: 0.9, metalness: 0.1,
        emissive: 0x110022, emissiveIntensity: 0.3,
      });
      const ruin = new THREE.Mesh(ruinGeo, ruinMat);
      ruin.position.set(Math.cos(ra) * rd, -1 - Math.random() * 4, Math.sin(ra) * rd);
      ruin.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.3);
      this._scene.add(ruin);
      this._ruinChunks.push(ruin);
    }

    // platform underglow (emissive ring beneath the platform)
    const underGeo = new THREE.TorusGeometry(PLATFORM_RADIUS - 0.5, 0.5, 8, 48);
    this._underGlow = new THREE.Mesh(underGeo, new THREE.MeshBasicMaterial({
      color: 0x4422aa, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false,
    }));
    this._underGlow.rotation.x = Math.PI / 2;
    this._underGlow.position.y = -1.5;
    this._scene.add(this._underGlow);

    // pillar arcane beam connections (lines between adjacent pillars)
    for (let pi = 0; pi < 6; pi++) {
      const a1 = (pi / 6) * Math.PI * 2;
      const a2 = ((pi + 1) / 6) * Math.PI * 2;
      const pr = PLATFORM_RADIUS - 0.3;
      const x1 = Math.cos(a1) * pr, z1 = Math.sin(a1) * pr;
      const x2 = Math.cos(a2) * pr, z2 = Math.sin(a2) * pr;
      const dx = x2 - x1, dz = z2 - z1;
      const len = Math.sqrt(dx * dx + dz * dz);
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(len, 0.03, 0.03),
        new THREE.MeshBasicMaterial({ color: 0x6644cc, transparent: true, opacity: 0.15, depthWrite: false })
      );
      beam.position.set((x1 + x2) / 2, 2.1, (z1 + z2) / 2);
      beam.rotation.y = Math.atan2(dz, dx);
      this._scene.add(beam);
      this._pillarBeams.push(beam);
    }

    // muzzle flash (hidden sphere at staff tip)
    this._muzzleFlash = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0, depthWrite: false })
    );
    this._scene.add(this._muzzleFlash);

    // player level aura (circle on ground, grows with level)
    this._levelAura = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.8, 24),
      new THREE.MeshBasicMaterial({ color: 0x8866ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    this._levelAura.rotation.x = -Math.PI / 2;
    this._levelAura.position.y = 0.015;
    this._scene.add(this._levelAura);

    // element center glow on platform
    this._centerGlow = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 24),
      new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false })
    );
    this._centerGlow.rotation.x = -Math.PI / 2;
    this._centerGlow.position.y = 0.008;
    this._scene.add(this._centerGlow);

    // void vortex: concentric rings below platform center
    for (let vi = 0; vi < 4; vi++) {
      const vr = 2 + vi * 2.5;
      const vortex = new THREE.Mesh(
        new THREE.TorusGeometry(vr, 0.06, 6, 32),
        new THREE.MeshBasicMaterial({ color: 0x3311aa, transparent: true, opacity: 0.08 + vi * 0.02, side: THREE.DoubleSide, depthWrite: false })
      );
      vortex.rotation.x = Math.PI / 2;
      vortex.position.y = -2.5 - vi * 0.5;
      this._scene.add(vortex);
      this._vortexRings.push(vortex);
    }

    // spell hit particles
    const spPartCount = 200;
    this._spellPartPositions = new Float32Array(spPartCount * 3);
    this._spellPartLife = new Float32Array(spPartCount);
    this._spellPartVelocities = new Float32Array(spPartCount * 3);
    for (let i = 0; i < spPartCount; i++) this._spellPartPositions[i * 3 + 1] = -50;
    const spGeo = new THREE.BufferGeometry();
    spGeo.setAttribute("position", new THREE.BufferAttribute(this._spellPartPositions, 3));
    this._spellParticles = new THREE.Points(spGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.12, transparent: true, opacity: 0.7, depthWrite: false,
    }));
    this._scene.add(this._spellParticles);

    // rune pillars at platform edge (decorative)
    for (let p = 0; p < 6; p++) {
      const angle = (p / 6) * Math.PI * 2;
      const px = Math.cos(angle) * (PLATFORM_RADIUS - 0.3);
      const pz = Math.sin(angle) * (PLATFORM_RADIUS - 0.3);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 2.0, 6),
        new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.7, metalness: 0.3 }));
      pillar.position.set(px, 1.0, pz);
      pillar.castShadow = true;
      this._scene.add(pillar);
      // glowing orb on top
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x8866dd, emissive: 0x6644cc, emissiveIntensity: 1.5, roughness: 1, metalness: 0 }));
      orb.position.set(px, 2.2, pz);
      this._scene.add(orb);
      this._pillarOrbs.push(orb);
      // point light
      const pl = new THREE.PointLight(0x6644cc, 1.0, 8, 1.5);
      pl.position.set(px, 2.5, pz);
      this._scene.add(pl);
    }
    // edge warning ring (red, invisible by default)
    this._edgeWarningRing = new THREE.Mesh(
      new THREE.TorusGeometry(PLATFORM_RADIUS - 1, 0.15, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    this._edgeWarningRing.rotation.x = Math.PI / 2;
    this._edgeWarningRing.position.y = 0.03;
    this._scene.add(this._edgeWarningRing);

    // void tentacles (decorative animated meshes below platform)
    for (let ti = 0; ti < 5; ti++) {
      const ta = (ti / 5) * Math.PI * 2 + Math.random();
      const tx = Math.cos(ta) * (PLATFORM_RADIUS + 3);
      const tz = Math.sin(ta) * (PLATFORM_RADIUS + 3);
      const tentGeo = new THREE.CylinderGeometry(0.15, 0.4, 6, 6);
      const tentMat = new THREE.MeshStandardMaterial({
        color: 0x220044, emissive: 0x330066, emissiveIntensity: 0.3,
        transparent: true, opacity: 0.5, roughness: 0.8, metalness: 0.2,
      });
      const tent = new THREE.Mesh(tentGeo, tentMat);
      tent.position.set(tx, -4, tz);
      this._scene.add(tent);
      this._tentacles.push(tent);
    }

    // combo rune ring (invisible until high combo)
    this._comboRuneRing = new THREE.Group();
    for (let ci = 0; ci < 8; ci++) {
      const runeCanvas = document.createElement("canvas");
      runeCanvas.width = 32; runeCanvas.height = 32;
      const rctx = runeCanvas.getContext("2d")!;
      rctx.fillStyle = "rgba(200,150,255,0.8)";
      rctx.font = "bold 20px serif";
      rctx.textAlign = "center";
      const runeChars = ["ε", "Ω", "Δ", "Σ", "Ψ", "Φ", "Λ", "Θ"];
      rctx.fillText(runeChars[ci], 16, 24);
      const runeTex = new THREE.CanvasTexture(runeCanvas);
      const runeSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: runeTex, transparent: true, depthWrite: false }));
      runeSprite.scale.set(0.5, 0.5, 1);
      this._comboRuneRing.add(runeSprite);
    }
    this._comboRuneRing.visible = false;
    this._scene.add(this._comboRuneRing);

    // kill shockwave pool
    for (let sw = 0; sw < 5; sw++) {
      const swMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.5, 20),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
      );
      swMesh.rotation.x = -Math.PI / 2;
      swMesh.position.y = 0.05;
      swMesh.visible = false;
      this._scene.add(swMesh);
      this._killShockwaves.push({ mesh: swMesh, life: 0 });
    }

    // staff point light (follows staff gem)
    this._staffLight = new THREE.PointLight(0xff4422, 0.8, 5, 1.5);
    this._staffLight.position.set(0, 2, 0);
    this._scene.add(this._staffLight);

    this._buildSpellTrails();
  }

  private _buildSpellTrails(): void {
    const count = 300;
    this._spellTrailPositions = new Float32Array(count * 3);
    this._spellTrailLife = new Float32Array(count);
    for (let i = 0; i < count; i++) this._spellTrailPositions[i * 3 + 1] = -50;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._spellTrailPositions, 3));
    this._spellTrailParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xff4422, size: 0.1, transparent: true, opacity: 0.6, depthWrite: false,
    }));
    this._scene.add(this._spellTrailParticles);
  }

  // ── input ──────────────────────────────────────────────────────────────

  private _initInput(): void {
    this._keys = {};
    this._keyDownHandler = (e) => {
      this._keys[e.code] = true;
      if (e.code === "Escape") this._handleEscape();
      if (e.code === "Space") {
        e.preventDefault();
        if (this._phase === EpsilonPhase.TITLE) {
          this._difficulty = (["apprentice", "archmage", "voidlord"] as const)[this._selectedDifficulty];
          this._startGame();
        }
        else if (this._phase === EpsilonPhase.GAME_OVER) { this._phase = EpsilonPhase.TITLE; this._showOverlay("title"); }
        else if (this._phase === EpsilonPhase.PLAYING) { this._shieldBurst(); }
      }
      if (e.code === "Digit1" && this._player.element !== SpellElement.FIRE) { this._player.element = SpellElement.FIRE; this._player.lastElementSwitch = this._frame; }
      if (e.code === "Digit2" && this._player.element !== SpellElement.ICE) { this._player.element = SpellElement.ICE; this._player.lastElementSwitch = this._frame; }
      if (e.code === "Digit3" && this._player.element !== SpellElement.LIGHTNING) { this._player.element = SpellElement.LIGHTNING; this._player.lastElementSwitch = this._frame; }
      if (e.code === "KeyE" && this._phase === EpsilonPhase.PLAYING) this._secondaryAbility();
      if (e.code === "KeyA" && this._phase === EpsilonPhase.TITLE) { this._selectedDifficulty = Math.max(0, this._selectedDifficulty - 1); this._showOverlay("title"); }
      if (e.code === "KeyD" && this._phase === EpsilonPhase.TITLE) { this._selectedDifficulty = Math.min(2, this._selectedDifficulty + 1); this._showOverlay("title"); }
      // upgrade selection
      if (this._phase === EpsilonPhase.UPGRADE) {
        if (e.code === "Digit1" || e.code === "KeyA") this._pickUpgrade(0);
        if (e.code === "Digit2" || e.code === "KeyS") this._pickUpgrade(1);
        if (e.code === "Digit3" || e.code === "KeyD") this._pickUpgrade(2);
      }
    };
    this._keyUpHandler = (e) => { this._keys[e.code] = false; };
    this._mouseMoveHandler = (e) => {
      // project mouse to ground plane y=0
      const rect = this._canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), this._camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);
      if (target) { this._mouseX = target.x; this._mouseZ = target.z; }
    };
    this._mouseDownHandler = (e) => {
      if (e.button === 0) this._mouseDown = true;
      if (e.button === 2) { e.preventDefault(); this._dash(); }
    };
    this._mouseUpHandler = (e) => { if (e.button === 0) this._mouseDown = false; };
    // prevent context menu on right click
    this._canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
    window.addEventListener("mousemove", this._mouseMoveHandler);
    window.addEventListener("mousedown", this._mouseDownHandler);
    window.addEventListener("mouseup", this._mouseUpHandler);
  }

  private _handleEscape(): void {
    if (this._phase === EpsilonPhase.PLAYING) { this._phase = EpsilonPhase.PAUSED; this._showOverlay("pause"); }
    else if (this._phase === EpsilonPhase.PAUSED) { this._phase = EpsilonPhase.PLAYING; this._hideOverlay(); }
    else { this.destroy(); window.dispatchEvent(new Event("epsilonExit")); }
  }

  // ── HUD ────────────────────────────────────────────────────────────────

  private _initHUD(): void {
    this._hudDiv = document.createElement("div");
    Object.assign(this._hudDiv.style, { position: "absolute", top: "0", left: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "25", fontFamily: "'Georgia', serif" });
    document.body.appendChild(this._hudDiv);

    // HP bar (bottom left)
    const hpContainer = document.createElement("div");
    Object.assign(hpContainer.style, { position: "absolute", bottom: "20px", left: "20px", width: "180px", height: "12px", background: "rgba(0,0,0,0.6)", borderRadius: "6px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.15)" });
    this._hpBar = document.createElement("div");
    Object.assign(this._hpBar.style, { width: "100%", height: "100%", background: "linear-gradient(90deg, #cc2222, #ff4444)", borderRadius: "6px", transition: "width 0.2s" });
    hpContainer.appendChild(this._hpBar);
    this._hudDiv.appendChild(hpContainer);

    // shield bar
    const shContainer = document.createElement("div");
    Object.assign(shContainer.style, { position: "absolute", bottom: "38px", left: "20px", width: "180px", height: "6px", background: "rgba(0,0,0,0.4)", borderRadius: "3px", overflow: "hidden" });
    this._shieldBar = document.createElement("div");
    Object.assign(this._shieldBar.style, { width: "100%", height: "100%", background: "#6644cc", borderRadius: "3px", transition: "width 0.1s" });
    shContainer.appendChild(this._shieldBar);
    this._hudDiv.appendChild(shContainer);

    // wave / score (top)
    this._waveDiv = document.createElement("div");
    Object.assign(this._waveDiv.style, { position: "absolute", top: "14px", left: "20px", color: "#aaa", fontSize: "16px", textShadow: "0 1px 4px rgba(0,0,0,0.8)" });
    this._hudDiv.appendChild(this._waveDiv);
    this._scoreDiv = document.createElement("div");
    Object.assign(this._scoreDiv.style, { position: "absolute", top: "14px", right: "20px", color: "#ffd866", fontSize: "20px", fontWeight: "bold", textShadow: "0 2px 6px rgba(0,0,0,0.8)" });
    this._hudDiv.appendChild(this._scoreDiv);

    // XP bar
    const xpContainer = document.createElement("div");
    Object.assign(xpContainer.style, { position: "absolute", bottom: "52px", left: "20px", width: "180px", height: "4px", background: "rgba(0,0,0,0.4)", borderRadius: "2px", overflow: "hidden" });
    this._xpBar = document.createElement("div");
    Object.assign(this._xpBar.style, { width: "0%", height: "100%", background: "#ffd866", borderRadius: "2px", transition: "width 0.2s" });
    xpContainer.appendChild(this._xpBar);
    this._hudDiv.appendChild(xpContainer);

    // level display
    this._levelDiv = document.createElement("div");
    Object.assign(this._levelDiv.style, { position: "absolute", bottom: "58px", left: "20px", color: "#ffd866", fontSize: "11px", textShadow: "0 1px 3px rgba(0,0,0,0.8)" });
    this._hudDiv.appendChild(this._levelDiv);

    // secondary ability bar
    const secContainer = document.createElement("div");
    Object.assign(secContainer.style, { position: "absolute", bottom: "66px", left: "20px", width: "180px", height: "4px", background: "rgba(0,0,0,0.4)", borderRadius: "2px", overflow: "hidden" });
    this._secondaryBar = document.createElement("div");
    Object.assign(this._secondaryBar.style, { width: "100%", height: "100%", background: "#ff4422", borderRadius: "2px", transition: "width 0.1s" });
    secContainer.appendChild(this._secondaryBar);
    this._hudDiv.appendChild(secContainer);

    // combo display
    this._comboDiv = document.createElement("div");
    Object.assign(this._comboDiv.style, { position: "absolute", top: "40px", right: "20px", color: "#ff8844", fontSize: "16px", fontWeight: "bold", textShadow: "0 1px 4px rgba(0,0,0,0.8)", opacity: "0", transition: "opacity 0.2s" });
    this._hudDiv.appendChild(this._comboDiv);

    // element indicator (bottom center)
    this._elementDiv = document.createElement("div");
    Object.assign(this._elementDiv.style, { position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "12px" });
    this._hudDiv.appendChild(this._elementDiv);

    // crosshair
    this._crosshair = document.createElement("div");
    Object.assign(this._crosshair.style, {
      position: "absolute", width: "20px", height: "20px", border: "2px solid rgba(255,255,255,0.5)", borderRadius: "50%",
      pointerEvents: "none", transform: "translate(-50%,-50%)", zIndex: "30",
    });
    this._hudDiv.appendChild(this._crosshair);

    // damage flash
    this._damageFlashDiv = document.createElement("div");
    Object.assign(this._damageFlashDiv.style, {
      position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
      background: "radial-gradient(ellipse at center, transparent 40%, rgba(255,0,0,0.3) 100%)",
      opacity: "0", transition: "opacity 0.15s", pointerEvents: "none",
    });
    this._hudDiv.appendChild(this._damageFlashDiv);

    // wave banner
    this._waveBannerDiv = document.createElement("div");
    Object.assign(this._waveBannerDiv.style, {
      position: "absolute", top: "35%", left: "50%", transform: "translate(-50%,-50%)",
      color: "#8866dd", fontSize: "48px", fontWeight: "bold",
      textShadow: "0 3px 20px rgba(100,60,200,0.6)", opacity: "0",
      transition: "opacity 0.4s, transform 0.4s", pointerEvents: "none",
    });
    this._hudDiv.appendChild(this._waveBannerDiv);

    // radar minimap
    this._radarCanvas = document.createElement("canvas");
    this._radarCanvas.width = 100; this._radarCanvas.height = 100;
    Object.assign(this._radarCanvas.style, {
      position: "absolute", bottom: "20px", right: "20px",
      width: "100px", height: "100px", borderRadius: "50%",
      border: "1px solid rgba(100,60,200,0.3)", background: "rgba(0,0,0,0.4)",
    });
    this._radarCtx = this._radarCanvas.getContext("2d");
    this._hudDiv.appendChild(this._radarCanvas);

    // dash cooldown indicator
    this._dashIndicator = document.createElement("div");
    Object.assign(this._dashIndicator.style, {
      position: "absolute", bottom: "80px", left: "20px", width: "180px", height: "4px",
      background: "rgba(0,0,0,0.4)", borderRadius: "2px", overflow: "hidden",
    });
    const dashFill = document.createElement("div");
    Object.assign(dashFill.style, { width: "100%", height: "100%", background: "#88ddff", borderRadius: "2px", transition: "width 0.1s" });
    this._dashIndicator.appendChild(dashFill);
    this._hudDiv.appendChild(this._dashIndicator);

    // boss HP bar (top center, hidden by default)
    this._bossHpContainer = document.createElement("div");
    Object.assign(this._bossHpContainer.style, {
      position: "absolute", top: "50px", left: "50%", transform: "translateX(-50%)",
      width: "300px", display: "none", textAlign: "center",
    });
    this._bossHpName = document.createElement("div");
    Object.assign(this._bossHpName.style, { color: "#ff00ff", fontSize: "13px", fontWeight: "bold", marginBottom: "4px", textShadow: "0 1px 6px rgba(255,0,255,0.5)" });
    this._bossHpName.textContent = "EPSILON GUARDIAN";
    this._bossHpContainer.appendChild(this._bossHpName);
    const bossBarBg = document.createElement("div");
    Object.assign(bossBarBg.style, { width: "100%", height: "10px", background: "rgba(0,0,0,0.6)", borderRadius: "5px", overflow: "hidden", border: "1px solid rgba(255,0,255,0.3)" });
    this._bossHpBar = document.createElement("div");
    Object.assign(this._bossHpBar.style, { width: "100%", height: "100%", background: "linear-gradient(90deg, #aa00aa, #ff00ff)", borderRadius: "5px", transition: "width 0.15s" });
    bossBarBg.appendChild(this._bossHpBar);
    this._bossHpContainer.appendChild(bossBarBg);
    this._hudDiv.appendChild(this._bossHpContainer);

    // tutorial tip
    this._tipDiv = document.createElement("div");
    Object.assign(this._tipDiv.style, {
      position: "absolute", bottom: "100px", left: "50%", transform: "translateX(-50%)",
      color: "#9988bb", fontSize: "13px", fontStyle: "italic",
      textShadow: "0 1px 4px rgba(0,0,0,0.8)", opacity: "0",
      transition: "opacity 0.4s", whiteSpace: "nowrap", pointerEvents: "none",
    });
    this._hudDiv.appendChild(this._tipDiv);

    // danger indicator container
    this._dangerDiv = document.createElement("div");
    Object.assign(this._dangerDiv.style, { position: "absolute", top: "0", left: "0", width: "100%", height: "100%", pointerEvents: "none" });
    this._hudDiv.appendChild(this._dangerDiv);

    // overlay
    this._overlayDiv = document.createElement("div");
    Object.assign(this._overlayDiv.style, {
      position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", opacity: "0", transition: "opacity 0.3s", pointerEvents: "none", zIndex: "30",
    });
    this._hudDiv.appendChild(this._overlayDiv);
  }

  private _showOverlay(mode: "title" | "pause" | "gameover" | "upgrade"): void {
    if (!this._overlayDiv) return;
    let html = "";
    if (mode === "title") {
      html = `
        <div style="font-size:72px;font-weight:bold;color:#8866dd;text-shadow:0 4px 30px rgba(100,60,200,0.6);letter-spacing:8px;margin-bottom:8px">EPSILON</div>
        <div style="font-size:16px;color:#9988bb;margin-bottom:30px">Arcane Arena Survival</div>
        <div style="font-size:13px;color:#888;margin-bottom:6px">Survive waves of ethereal entities on a floating platform</div>
        <div style="font-size:13px;color:#888;margin-bottom:24px">LMB cast &nbsp;|&nbsp; RMB dash &nbsp;|&nbsp; E ultimate &nbsp;|&nbsp; WASD move &nbsp;|&nbsp; 1/2/3 element &nbsp;|&nbsp; SPACE shield</div>
        ${(() => { const hs = this._getHighscore(); return hs.score > 0 ? `<div style="font-size:11px;color:#555;margin-bottom:8px">Best: Wave ${hs.wave} — ${hs.score} pts</div>` : ""; })()}
        <div style="display:flex;gap:20px;margin-bottom:24px">
          <div style="text-align:center;padding:8px 16px;border:1px solid #ff4422;border-radius:6px"><div style="color:#ff4422;font-size:18px;font-weight:bold">1</div><div style="color:#888;font-size:11px">FIRE</div></div>
          <div style="text-align:center;padding:8px 16px;border:1px solid #44ccff;border-radius:6px"><div style="color:#44ccff;font-size:18px;font-weight:bold">2</div><div style="color:#888;font-size:11px">ICE</div></div>
          <div style="text-align:center;padding:8px 16px;border:1px solid #ddaaff;border-radius:6px"><div style="color:#ddaaff;font-size:18px;font-weight:bold">3</div><div style="color:#888;font-size:11px">LIGHTNING</div></div>
        </div>
        <div style="margin-bottom:16px;text-align:center">
          <div style="font-size:11px;color:#888;margin-bottom:4px">A/D — DIFFICULTY</div>
          <div style="display:flex;gap:14px;justify-content:center">
            ${(["APPRENTICE","ARCHMAGE","VOID LORD"] as const).map((d, i) => {
              const cols = ["#44cc44","#ffaa00","#ff4444"];
              return `<span style="font-size:${i === this._selectedDifficulty ? 16 : 12}px;color:${i === this._selectedDifficulty ? cols[i] : '#555'};font-weight:${i === this._selectedDifficulty ? 'bold' : 'normal'};transition:all 0.2s">${d}</span>`;
            }).join("")}
          </div>
        </div>
        <div style="font-size:20px;color:#8866dd;animation:pulse 1.5s infinite">Press SPACE to Begin</div>
        <div style="font-size:11px;color:#555;margin-top:10px">ESC to Quit</div>
        ${(() => {
          try {
            const runs = parseInt(localStorage.getItem("epsilon_runs") ?? "0");
            const kills = parseInt(localStorage.getItem("epsilon_totalkills") ?? "0");
            return runs > 0 ? `<div style="font-size:10px;color:#444;margin-top:6px">Career: ${runs} runs — ${kills} total kills</div>` : "";
          } catch { return ""; }
        })()}
        <style>@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}</style>`;
    } else if (mode === "pause") {
      html = `<div style="font-size:48px;font-weight:bold;color:#8866dd;margin-bottom:16px">PAUSED</div>
        <div style="font-size:15px;color:#ccc;margin-bottom:6px">ESC — Resume</div>
        <div style="font-size:15px;color:#ccc">Q — Quit</div>`;
    } else if (mode === "gameover") {
      const p = this._player;
      const hs = this._getHighscore();
      const isNewBest = p.score >= hs.score && p.score > 0;
      const diffInfo = EPSILON_DIFFICULTY[this._difficulty];
      html = `<div style="font-size:52px;font-weight:bold;color:#ff4444;text-shadow:0 3px 15px rgba(255,0,0,0.4);margin-bottom:12px">FALLEN</div>
        <div style="font-size:22px;color:#ffd866;margin-bottom:4px">Wave ${p.wave} — Score: ${p.score}${isNewBest ? " ★ NEW BEST!" : ""}</div>
        <div style="font-size:11px;color:${diffInfo.color};margin-bottom:8px">${diffInfo.label}</div>
        <div style="display:flex;gap:24px;font-size:13px;color:#aaa;margin-bottom:8px">
          <span>Level ${p.level}</span><span>Kills: ${p.kills}</span><span>Max Combo: ${p.maxCombo}x</span><span>Time: ${Math.floor(this._frame / 3600)}:${(Math.floor(this._frame / 60) % 60).toString().padStart(2, "0")}</span>
        </div>
        <div style="font-size:11px;color:#666;margin-bottom:8px">Best: Wave ${Math.max(hs.wave, p.wave)} — ${Math.max(hs.score, p.score)} pts</div>
        ${p.upgradeHistory.length > 0 ? `<div style="font-size:10px;color:#555;margin-bottom:12px">Upgrades: ${p.upgradeHistory.join(" → ")}</div>` : ""}
        <div style="font-size:18px;color:#8866dd;animation:pulse 1.5s infinite">Press SPACE to Try Again</div>
        <style>@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}</style>`;
    } else if (mode === "upgrade") {
      const upgrades = this._getUpgradeChoices();
      html = `<div style="font-size:36px;font-weight:bold;color:#ffd866;margin-bottom:16px">WAVE ${this._player.wave} CLEAR!</div>
        <div style="font-size:14px;color:#aaa;margin-bottom:20px">Choose an upgrade:</div>
        <div style="display:flex;gap:16px">${upgrades.map((u, i) =>
          `<div style="text-align:center;padding:12px 20px;border:1px solid ${u.color};border-radius:8px;min-width:120px;cursor:pointer">
            <div style="font-size:24px;margin-bottom:4px">${u.icon}</div>
            <div style="color:${u.color};font-size:14px;font-weight:bold;margin-bottom:4px">${u.name}</div>
            <div style="color:#888;font-size:11px">${u.desc}</div>
            <div style="color:#666;font-size:11px;margin-top:6px">Press ${i + 1}</div>
          </div>`).join("")}</div>`;
    }
    this._overlayDiv.innerHTML = html;
    this._overlayDiv.style.opacity = "1";
  }

  private _hideOverlay(): void { if (this._overlayDiv) this._overlayDiv.style.opacity = "0"; }

  private _updateHUD(): void {
    const p = this._player;
    if (this._hpBar) this._hpBar.style.width = `${(p.hp / p.maxHp) * 100}%`;
    if (this._shieldBar) this._shieldBar.style.width = `${Math.max(0, 1 - p.shieldCooldown / SHIELD_BURST_COOLDOWN) * 100}%`;
    const timeSec = Math.floor(this._frame / 60);
    const timeMin = Math.floor(timeSec / 60);
    const timeSec2 = timeSec % 60;
    if (this._waveDiv) this._waveDiv.textContent = `Wave ${p.wave} — ${this._enemies.length} enemies — ${timeMin}:${timeSec2.toString().padStart(2, "0")}`;
    if (this._scoreDiv) this._scoreDiv.textContent = `${p.score}`;
    // XP
    if (this._xpBar) {
      const xpNeeded = XP_PER_LEVEL + (p.level - 1) * 50;
      this._xpBar.style.width = `${(p.xp / xpNeeded) * 100}%`;
    }
    if (this._levelDiv) this._levelDiv.textContent = `Lvl ${p.level}`;
    // secondary bar
    if (this._secondaryBar) {
      const secPct = Math.max(0, 1 - p.secondaryCooldown / SECONDARY_COOLDOWN) * 100;
      this._secondaryBar.style.width = `${secPct}%`;
      const elCols = ["#ff4422", "#44ccff", "#ddaaff"];
      this._secondaryBar.style.background = elCols[p.element];
    }
    // dash indicator
    if (this._dashIndicator && this._dashIndicator.firstChild) {
      const dashPct = Math.max(0, 1 - p.dashCooldown / DASH_COOLDOWN) * 100;
      (this._dashIndicator.firstChild as HTMLElement).style.width = `${dashPct}%`;
    }
    // synergy indicator: crosshair pulses when synergy is active
    if (this._crosshair) {
      const switchAge = this._frame - p.lastElementSwitch;
      if (switchAge > 0 && switchAge < SYNERGY_WINDOW) {
        this._crosshair.style.boxShadow = `0 0 8px ${["#ff4422", "#44ccff", "#ddaaff"][p.element]}`;
        this._crosshair.style.transform = "translate(-50%,-50%) scale(1.3)";
      } else {
        this._crosshair.style.boxShadow = "none";
        this._crosshair.style.transform = "translate(-50%,-50%) scale(1)";
      }
    }
    // combo
    if (this._comboDiv) {
      if (p.combo >= 3) {
        this._comboDiv.style.opacity = "1";
        this._comboDiv.textContent = `${p.combo}x COMBO`;
        this._comboDiv.style.color = p.combo >= 10 ? "#ff4444" : p.combo >= 5 ? "#ffd866" : "#ff8844";
      } else {
        this._comboDiv.style.opacity = "0";
      }
    }
    // boss HP bar
    if (this._bossHpContainer && this._bossHpBar) {
      const boss = this._enemies.find(e => e.type === EnemyType.BOSS);
      if (boss) {
        this._bossHpContainer.style.display = "block";
        this._bossHpBar.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
      } else {
        this._bossHpContainer.style.display = "none";
      }
    }

    // danger indicators: arrows pointing toward off-screen enemies
    if (this._dangerDiv) {
      this._dangerDiv.innerHTML = "";
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      for (const e of this._enemies) {
        if (e.spawnTimer > 0) continue;
        const v = new THREE.Vector3(e.x, e.y, e.z);
        v.project(this._camera);
        const sx = (v.x + 1) / 2 * window.innerWidth;
        const sy = (-v.y + 1) / 2 * window.innerHeight;
        // only show for off-screen enemies
        if (sx < -20 || sx > window.innerWidth + 20 || sy < -20 || sy > window.innerHeight + 20) {
          const angle = Math.atan2(sy - cy, sx - cx);
          const edgeX = cx + Math.cos(angle) * Math.min(cx - 30, cy - 30);
          const edgeY = cy + Math.sin(angle) * Math.min(cx - 30, cy - 30);
          const dot = document.createElement("div");
          const col = (ENEMY_COLORS[e.type] ?? 0xff3366).toString(16).padStart(6, "0");
          Object.assign(dot.style, {
            position: "absolute", left: `${edgeX}px`, top: `${edgeY}px`,
            width: "8px", height: "8px", borderRadius: "50%",
            background: `#${col}`, transform: "translate(-50%,-50%)",
            boxShadow: `0 0 6px #${col}`,
          });
          this._dangerDiv.appendChild(dot);
        }
      }
    }

    // damage numbers
    for (let i = this._damageNumbers.length - 1; i >= 0; i--) {
      const dn = this._damageNumbers[i];
      dn.life--;
      dn.y += 0.05;
      if (dn.life <= 0) {
        dn.div.remove();
        this._damageNumbers.splice(i, 1);
        continue;
      }
      const v = new THREE.Vector3(dn.x, dn.y, dn.z);
      v.project(this._camera);
      dn.div.style.left = `${(v.x + 1) / 2 * window.innerWidth}px`;
      dn.div.style.top = `${(-v.y + 1) / 2 * window.innerHeight}px`;
      dn.div.style.opacity = `${dn.life / 40}`;
    }
    if (this._elementDiv) {
      const elColors = ["#ff4422", "#44ccff", "#ddaaff"];
      const elNames = ["FIRE", "ICE", "LIGHTNING"];
      this._elementDiv.innerHTML = elNames.map((n, i) =>
        `<div style="padding:4px 10px;border-radius:4px;font-size:12px;font-weight:bold;color:${i === p.element ? elColors[i] : '#444'};background:${i === p.element ? 'rgba(255,255,255,0.1)' : 'transparent'};border:1px solid ${i === p.element ? elColors[i] : '#333'}">${n}</div>`
      ).join("");
    }
    // crosshair follows projected mouse
    if (this._crosshair) {
      const v = new THREE.Vector3(this._mouseX, 0, this._mouseZ);
      v.project(this._camera);
      this._crosshair.style.left = `${(v.x + 1) / 2 * window.innerWidth}px`;
      this._crosshair.style.top = `${(-v.y + 1) / 2 * window.innerHeight}px`;
      const col = ["#ff4422", "#44ccff", "#ddaaff"][this._player.element];
      this._crosshair.style.borderColor = col;
    }
  }

  // ── player ─────────────────────────────────────────────────────────────

  private _initPlayer(): void {
    this._player = {
      x: 0, z: 0, vx: 0, vz: 0, angle: 0, hp: 100, maxHp: 100,
      element: SpellElement.FIRE, spellCooldown: 0, shieldCooldown: 0,
      dashCooldown: 0, dashTimer: 0,
      spellDamage: 20, spellPierce: 0, castSpeed: 1,
      score: 0, kills: 0, wave: 0,
      xp: 0, level: 1, combo: 0, comboTimer: 0, maxCombo: 0,
      secondaryCooldown: 0, chargeFrames: 0,
      multiShot: 0, homing: 0, orbitSpells: 0,
      xpMagnetRadius: 3, lifeSteal: 0, moveSpeed: 1,
      lastElementSwitch: 0, upgradeHistory: [],
    };
    this._buildPlayerMesh();
  }

  private _buildPlayerMesh(): void {
    if (this._playerMesh) this._scene.remove(this._playerMesh);
    const g = new THREE.Group();
    // robe body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a1a44, roughness: 0.8, metalness: 0.1 }));
    body.position.y = 0.6; body.castShadow = true;
    g.add(body);
    // head (hood)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9, metalness: 0 }));
    head.position.y = 1.35;
    g.add(head);
    // glowing eyes
    for (const sx of [-0.06, 0.06]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0x8866ff, emissive: 0x8866ff, emissiveIntensity: 2, roughness: 1 }));
      eye.position.set(sx, 1.38, 0.18);
      g.add(eye);
    }
    // arms (sleeve cylinders extending from body)
    for (const side of [-1, 1]) {
      const armPivot = new THREE.Group();
      armPivot.position.set(side * 0.3, 0.95, 0);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x221144, roughness: 0.85, metalness: 0.05 }));
      sleeve.position.y = -0.25;
      sleeve.rotation.z = side * 0.3;
      armPivot.add(sleeve);
      // hand sphere
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4),
        new THREE.MeshStandardMaterial({ color: 0x997788, roughness: 0.7, metalness: 0.1 }));
      hand.position.set(0, -0.52, 0);
      armPivot.add(hand);
      g.add(armPivot);
    }
    // robe hem detail (bottom fringe)
    const hem = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 4, 16),
      new THREE.MeshStandardMaterial({ color: 0x331155, roughness: 0.9, metalness: 0, emissive: 0x220044, emissiveIntensity: 0.3 }));
    hem.rotation.x = Math.PI / 2;
    hem.position.y = 0.02;
    g.add(hem);
    // robe collar
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 4, 12),
      new THREE.MeshStandardMaterial({ color: 0x331155, roughness: 0.8, metalness: 0.1, emissive: 0x220044, emissiveIntensity: 0.2 }));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.22;
    g.add(collar);

    // staff
    const staff = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.8, 6),
      new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.7, metalness: 0.1 }));
    pole.position.y = 0.9;
    staff.add(pole);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0),
      new THREE.MeshStandardMaterial({ color: 0xff4422, emissive: 0xff4422, emissiveIntensity: 1.5, roughness: 0.2, metalness: 0.5 }));
    gem.position.y = 1.85;
    staff.add(gem);
    staff.position.set(0.35, 0, 0.1);
    g.add(staff);
    this._staffMesh = staff;

    // shield burst visual (hidden ring)
    const shield = new THREE.Mesh(new THREE.TorusGeometry(SHIELD_BURST_RADIUS, 0.15, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x6644cc, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    shield.rotation.x = Math.PI / 2;
    shield.position.y = 0.5;
    g.add(shield);
    this._shieldMesh = shield;

    this._scene.add(g);
    this._playerMesh = g;
  }

  // ── game flow ──────────────────────────────────────────────────────────

  private _startGame(): void {
    this._player.hp = this._player.maxHp;
    this._player.score = 0; this._player.kills = 0; this._player.wave = 0;
    this._player.x = 0; this._player.z = 0; this._player.vx = 0; this._player.vz = 0;
    this._player.spellDamage = 20; this._player.spellPierce = 0; this._player.castSpeed = 1;
    this._player.spellCooldown = 0; this._player.shieldCooldown = 0;
    this._player.dashCooldown = 0; this._player.dashTimer = 0;
    this._player.xp = 0; this._player.level = 1;
    this._player.combo = 0; this._player.comboTimer = 0; this._player.maxCombo = 0;
    this._player.secondaryCooldown = 0; this._player.chargeFrames = 0;
    this._player.multiShot = 0; this._player.homing = 0; this._player.orbitSpells = 0;
    this._player.xpMagnetRadius = 3; this._player.lifeSteal = 0; this._player.moveSpeed = 1;
    this._player.lastElementSwitch = 0; this._player.upgradeHistory = [];
    this._currentPlatformRadius = PLATFORM_RADIUS;
    this._activeModifier = null;
    this._passiveRegen = 0;
    this._slowMoTimer = 0; this._slowMoScale = 1;
    for (const hp of this._hpPickups) { if (hp.mesh) this._scene.remove(hp.mesh); }
    this._hpPickups = [];
    // clear XP orbs
    for (const o of this._xpOrbs) { if (o.mesh) this._scene.remove(o.mesh); }
    this._xpOrbs = [];
    // clear entities
    for (const s of this._spells) { if (s.mesh) this._scene.remove(s.mesh); }
    this._spells = [];
    for (const e of this._enemies) { if (e.mesh) this._scene.remove(e.mesh); }
    this._enemies = [];
    this._frame = 0;
    this._phase = EpsilonPhase.PLAYING;
    this._hideOverlay();
    this._startWave();
  }

  private _startWave(): void {
    this._player.wave++;
    this._waveTimer = 60;
    this._playSound("wave");
    // wave banner
    if (this._waveBannerDiv) {
      this._waveBannerDiv.textContent = `WAVE ${this._player.wave}`;
      this._waveBannerDiv.style.opacity = "1";
      this._waveBannerDiv.style.transform = "translate(-50%,-50%) scale(1.2)";
      setTimeout(() => {
        if (this._waveBannerDiv) {
          this._waveBannerDiv.style.transform = "translate(-50%,-50%) scale(1)";
        }
      }, 100);
      setTimeout(() => { if (this._waveBannerDiv) this._waveBannerDiv.style.opacity = "0"; }, 1500);
    }
    // start ambient drone on first wave
    if (this._player.wave === 1) this._startAmbientDrone();
    // roll wave modifier
    this._rollWaveModifier();
  }

  private _startAmbientDrone(): void {
    try {
      const ctx = this._ensureAudio();
      if (this._ambientDrone) { this._ambientDrone.stop(); this._ambientDrone = null; }
      const dur = 300;
      const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() - 0.5) * 0.04;
      this._ambientDrone = ctx.createBufferSource();
      this._ambientDrone.buffer = buf;
      this._ambientDrone.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass"; filter.frequency.value = 200; filter.Q.value = 2;
      const gain = ctx.createGain(); gain.gain.value = 0.06;
      this._ambientDrone.connect(filter).connect(gain).connect(ctx.destination);
      this._ambientDrone.start();
    } catch {}
  }

  private _spawnWaveEnemies(): void {
    const w = this._player.wave;
    // boss wave
    if (w % BOSS_WAVE_INTERVAL === 0) this._spawnBoss();
    // platform shrink on late waves
    if (w >= PLATFORM_SHRINK_START_WAVE) {
      const oldR = this._currentPlatformRadius;
      this._currentPlatformRadius = Math.max(6, PLATFORM_RADIUS - (w - PLATFORM_SHRINK_START_WAVE) * 0.4);
      if (this._platform) this._platform.scale.setScalar(this._currentPlatformRadius / PLATFORM_RADIUS);
      // crumble rocks at the shrinking edge
      if (this._currentPlatformRadius < oldR) {
        for (let ci = 0; ci < 8; ci++) {
          const ca = Math.random() * Math.PI * 2;
          this._spawnCrumbleRocks(Math.cos(ca) * oldR, Math.sin(ca) * oldR);
        }
        this._shakeIntensity = 0.2;
        this._playSound("hit");
      }
    }
    const diff = EPSILON_DIFFICULTY[this._difficulty];
    const count = Math.floor((BASE_ENEMIES_PER_WAVE + Math.floor(w * 1.8)) * diff.spawnMult);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = SPAWN_RING_RADIUS + Math.random() * 5;
      const typeRoll = Math.random();
      let type: EnemyType;
      if (w >= 5 && typeRoll < 0.08) type = EnemyType.TITAN;
      else if (w >= 4 && typeRoll < 0.2) type = EnemyType.SPLITTER;
      else if (w >= 3 && typeRoll < 0.35) type = EnemyType.DASHER;
      else if (typeRoll < 0.5) type = EnemyType.ORBITER;
      else type = EnemyType.SEEKER;

      const baseHp = type === EnemyType.TITAN ? 120 : type === EnemyType.SPLITTER ? 50 : type === EnemyType.DASHER ? 30 : 40;
      const hp = Math.floor((baseHp + w * 5) * diff.enemyHpMult);
      const speed = (type === EnemyType.DASHER ? 6 : type === EnemyType.TITAN ? 1.5 : type === EnemyType.SPLITTER ? 2.2 : type === EnemyType.ORBITER ? 3 : 2.5) * diff.enemySpeedMult;
      const radius = type === EnemyType.TITAN ? 0.8 : 0.35;

      const enemy: Enemy = {
        x: Math.cos(angle) * r, z: Math.sin(angle) * r, y: 0.5,
        vx: 0, vz: 0, hp, maxHp: hp, type, radius, speed: speed + w * 0.1,
        mesh: null, hitFlash: 0, orbitAngle: Math.random() * Math.PI * 2,
        spawnTimer: 30, slowTimer: 0, burnTimer: 0, burnDamage: 0, attackTimer: 0,
        isElite: Math.random() < ELITE_CHANCE_BASE + w * 0.02,
      };
      // elite boost
      if (enemy.isElite) {
        enemy.hp *= 2; enemy.maxHp *= 2;
        enemy.speed *= 1.15;
        enemy.radius *= 1.2;
      }
      this._buildEnemyMesh(enemy);
      this._enemies.push(enemy);
      // spawn portal ring
      const portal = new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.5, radius * 1.5, 12),
        new THREE.MeshBasicMaterial({ color: ENEMY_COLORS[type], transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })
      );
      portal.rotation.x = -Math.PI / 2;
      portal.position.set(enemy.x, 0.1, enemy.z);
      this._scene.add(portal);
      this._spawnPortals.push({ mesh: portal, life: 30 });
    }
  }

  private _buildEnemyMesh(e: Enemy): void {
    const g = new THREE.Group();
    const color = ENEMY_COLORS[e.type] ?? 0xff3366;
    let geo: THREE.BufferGeometry;
    if (e.type === EnemyType.SEEKER) geo = new THREE.OctahedronGeometry(e.radius, 0);
    else if (e.type === EnemyType.ORBITER) geo = new THREE.TetrahedronGeometry(e.radius, 0);
    else if (e.type === EnemyType.DASHER) geo = new THREE.ConeGeometry(e.radius, e.radius * 2, 5);
    else if (e.type === EnemyType.TITAN) geo = new THREE.IcosahedronGeometry(e.radius, 1);
    else if (e.type === EnemyType.SPLITTER) geo = new THREE.DodecahedronGeometry(e.radius, 0);
    else geo = new THREE.IcosahedronGeometry(e.radius, 2); // boss — smooth sphere

    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    g.add(mesh);
    // wireframe overlay for ethereal holographic look
    const wireColor = e.isElite ? 0xffd866 : color; // elites have golden wireframe
    const wireMat = new THREE.MeshBasicMaterial({ color: wireColor, wireframe: true, transparent: true, opacity: e.isElite ? 0.5 : 0.25, depthWrite: false });
    const wire = new THREE.Mesh(geo.clone(), wireMat);
    wire.scale.setScalar(e.isElite ? 1.25 : 1.15);
    g.add(wire);
    // hp bar (small plane above)
    const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(e.radius * 2, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x333333, depthWrite: false }));
    hpBg.position.y = e.radius + 0.5;
    hpBg.rotation.x = -0.5; // tilt toward camera
    g.add(hpBg);
    const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(e.radius * 2, 0.08),
      new THREE.MeshBasicMaterial({ color, depthWrite: false }));
    hpFill.position.y = e.radius + 0.5;
    hpFill.rotation.x = -0.5;
    g.add(hpFill);

    g.position.set(e.x, e.y, e.z);
    this._scene.add(g);
    e.mesh = g;
  }

  // ── upgrades ───────────────────────────────────────────────────────────

  private _getUpgradeChoices(): Array<{ name: string; desc: string; icon: string; color: string; apply: () => void }> {
    const p = this._player;
    const all = [
      { name: "Power Up", desc: "+25% spell damage", icon: "⚔", color: "#ff4444", apply: () => { p.spellDamage *= 1.25; } },
      { name: "Piercing", desc: "Spells pierce +1 enemy", icon: "➤", color: "#ffaa00", apply: () => { p.spellPierce++; } },
      { name: "Quick Cast", desc: "20% faster casting", icon: "⚡", color: "#44ccff", apply: () => { p.castSpeed *= 0.8; } },
      { name: "Vitality", desc: "+30 max HP, heal full", icon: "❤", color: "#44ff44", apply: () => { p.maxHp += 30; p.hp = p.maxHp; } },
      { name: "Regeneration", desc: "Heal 40% HP", icon: "✚", color: "#44ff88", apply: () => { p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.4)); } },
      { name: "Multi-Shot", desc: "Fire 2 extra spells in a spread", icon: "⟐", color: "#ffcc44", apply: () => { p.multiShot++; } },
      { name: "Homing", desc: "Spells curve toward enemies", icon: "⟳", color: "#88ff88", apply: () => { p.homing++; } },
      { name: "Swiftness", desc: "+20% move speed", icon: "💨", color: "#88ddff", apply: () => { p.moveSpeed *= 1.2; } },
      { name: "Magnetism", desc: "+50% XP orb pickup range", icon: "✦", color: "#ffd866", apply: () => { p.xpMagnetRadius *= 1.5; } },
      { name: "Life Steal", desc: "Heal 5% of damage dealt on kill", icon: "♥", color: "#ff66aa", apply: () => { p.lifeSteal += 0.05; } },
      { name: "Arcane Fury", desc: "+15% damage & speed", icon: "⚡", color: "#aa66ff", apply: () => { p.spellDamage *= 1.15; p.moveSpeed *= 1.05; } },
      { name: "Glass Cannon", desc: "+50% damage, -20 max HP", icon: "💀", color: "#ff2222", apply: () => { p.spellDamage *= 1.5; p.maxHp = Math.max(30, p.maxHp - 20); p.hp = Math.min(p.hp, p.maxHp); } },
      { name: "Orbit Shield", desc: "+1 orbiting spell barrier", icon: "◎", color: "#aa88ff", apply: () => { p.orbitSpells++; } },
      { name: "Vampiric Orbs", desc: "XP orbs also heal 2 HP", icon: "♦", color: "#ff88aa", apply: () => { p.lifeSteal += 0.01; } },
      { name: "Passive Regen", desc: "Regen 1 HP every 2 sec", icon: "♻", color: "#44ff88", apply: () => { this._passiveRegen += 0.5; } },
      { name: "Thorns Aura", desc: "Enemies take 5 damage when they hit you", icon: "⚘", color: "#ff66cc", apply: () => {} },
    ];
    // pick 3 random
    const shuffled = all.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  private _upgradeChoices: Array<{ name: string; apply: () => void }> = [];

  private _pickUpgrade(idx: number): void {
    if (idx < this._upgradeChoices.length) {
      this._upgradeChoices[idx].apply();
      this._player.upgradeHistory.push(this._upgradeChoices[idx].name);
      this._phase = EpsilonPhase.PLAYING;
      this._hideOverlay();
      this._startWave();
    }
  }

  // ── spells ─────────────────────────────────────────────────────────────

  private _showTip(id: string, text: string): void {
    if (this._tipShown.has(id) || !this._tipDiv) return;
    this._tipShown.add(id);
    this._tipDiv.textContent = text;
    this._tipDiv.style.opacity = "1";
    setTimeout(() => { if (this._tipDiv) this._tipDiv.style.opacity = "0"; }, 4000);
  }

  private _spawnScorchMark(x: number, z: number, color: number): void {
    const scorch = new THREE.Mesh(
      new THREE.CircleGeometry(0.3 + Math.random() * 0.3, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })
    );
    scorch.rotation.x = -Math.PI / 2;
    scorch.position.set(x, 0.009, z);
    this._scene.add(scorch);
    this._scorchMarks.push({ mesh: scorch, life: 300 }); // 5 sec fade
  }

  private _spawnCrumbleRocks(x: number, z: number): void {
    for (let ci = 0; ci < 3; ci++) {
      const rock = new THREE.Mesh(
        new THREE.BoxGeometry(0.15 + Math.random() * 0.2, 0.1 + Math.random() * 0.15, 0.15 + Math.random() * 0.2),
        new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.9, metalness: 0.1 })
      );
      rock.position.set(x + (Math.random() - 0.5) * 0.5, 0.1, z + (Math.random() - 0.5) * 0.5);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      this._scene.add(rock);
      this._crumbleRocks.push({ mesh: rock, vy: 0, life: 120 });
    }
  }

  private _spawnHpPickup(x: number, z: number): void {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22ff22, emissiveIntensity: 1.5, transparent: true, opacity: 0.8 })
    );
    mesh.position.set(x, 0.6, z);
    this._scene.add(mesh);
    this._hpPickups.push({ x, z, mesh, life: 480, healAmount: 15 }); // 8 sec lifetime
  }

  private _updateHpPickups(): void {
    const p = this._player;
    for (let i = this._hpPickups.length - 1; i >= 0; i--) {
      const hp = this._hpPickups[i];
      hp.life--;
      if (hp.mesh) {
        hp.mesh.position.y = 0.5 + Math.sin(this._frame * 0.08 + i) * 0.2;
        hp.mesh.rotation.y += 0.04;
        if (hp.life < 120) (hp.mesh.material as THREE.MeshStandardMaterial).opacity = (hp.life / 120) * 0.8;
      }
      if (dist(hp.x, hp.z, p.x, p.z) < PLAYER_RADIUS + 0.3) {
        p.hp = Math.min(p.maxHp, p.hp + hp.healAmount);
        this._spawnDamageNumber(p.x, p.z, `+${hp.healAmount} HP`, "#44ff44");
        this._playSound("wave");
        if (hp.mesh) this._scene.remove(hp.mesh);
        this._hpPickups.splice(i, 1);
        continue;
      }
      if (hp.life <= 0) {
        if (hp.mesh) this._scene.remove(hp.mesh);
        this._hpPickups.splice(i, 1);
      }
    }
  }

  private _rollWaveModifier(): void {
    // revert previous modifier
    if (this._activeModifier) this._activeModifier.revert();
    // 40% chance of a modifier after wave 3
    if (this._player.wave < 3 || Math.random() > 0.4) { this._activeModifier = null; return; }
    const mods: WaveModifier[] = [
      { name: "SWARM", desc: "+50% enemies, -30% HP each", color: "#ff6644",
        apply: () => {}, revert: () => {} }, // applied in spawn logic
      { name: "ARMORED", desc: "All enemies +50% HP", color: "#aaaaaa",
        apply: () => { for (const e of this._enemies) { e.hp *= 1.5; e.maxHp *= 1.5; } }, revert: () => {} },
      { name: "HASTE", desc: "All enemies +30% speed", color: "#ffaa00",
        apply: () => { for (const e of this._enemies) { e.speed *= 1.3; } }, revert: () => {} },
      { name: "BOUNTY", desc: "Enemies drop 2x XP", color: "#ffd866",
        apply: () => {}, revert: () => {} }, // applied in XP drop logic
      { name: "VOID SURGE", desc: "Platform shrinks temporarily", color: "#6644cc",
        apply: () => { this._currentPlatformRadius = Math.max(5, this._currentPlatformRadius - 2); if (this._platform) this._platform.scale.setScalar(this._currentPlatformRadius / PLATFORM_RADIUS); },
        revert: () => { this._currentPlatformRadius = Math.max(6, PLATFORM_RADIUS - Math.max(0, this._player.wave - PLATFORM_SHRINK_START_WAVE) * 0.4); if (this._platform) this._platform.scale.setScalar(this._currentPlatformRadius / PLATFORM_RADIUS); } },
    ];
    this._activeModifier = mods[Math.floor(Math.random() * mods.length)];
    // show modifier banner
    if (this._waveBannerDiv) {
      setTimeout(() => {
        if (this._waveBannerDiv && this._activeModifier) {
          this._waveBannerDiv.innerHTML = `<span style="color:${this._activeModifier.color}">${this._activeModifier.name}</span><br><span style="font-size:18px;color:#888">${this._activeModifier.desc}</span>`;
          this._waveBannerDiv.style.opacity = "1";
          setTimeout(() => { if (this._waveBannerDiv) this._waveBannerDiv.style.opacity = "0"; }, 2000);
        }
      }, 1600); // show after wave number fades
    }
  }

  private _updateOrbitSpells(): void {
    const p = this._player;
    // create/destroy orbit meshes to match upgrade count
    while (this._orbitSpellMeshes.length < p.orbitSpells) {
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 6, 4),
        new THREE.MeshStandardMaterial({ color: ELEMENT_COLORS[p.element], emissive: ELEMENT_COLORS[p.element], emissiveIntensity: 1.5, transparent: true, opacity: 0.7 })
      );
      this._scene.add(orb);
      this._orbitSpellMeshes.push(orb);
    }
    while (this._orbitSpellMeshes.length > p.orbitSpells) {
      const orb = this._orbitSpellMeshes.pop()!;
      this._scene.remove(orb);
    }
    // orbit around player and damage enemies
    const orbitR = 1.8;
    const time = this._frame / 60;
    for (let oi = 0; oi < this._orbitSpellMeshes.length; oi++) {
      const orb = this._orbitSpellMeshes[oi];
      const angle = (oi / Math.max(1, this._orbitSpellMeshes.length)) * Math.PI * 2 + time * 3;
      const ox = p.x + Math.cos(angle) * orbitR;
      const oz = p.z + Math.sin(angle) * orbitR;
      orb.position.set(ox, 0.6, oz);
      // update color
      (orb.material as THREE.MeshStandardMaterial).color.setHex(ELEMENT_COLORS[p.element]);
      (orb.material as THREE.MeshStandardMaterial).emissive.setHex(ELEMENT_COLORS[p.element]);
      // damage enemies on contact
      for (let ei = this._enemies.length - 1; ei >= 0; ei--) {
        const e = this._enemies[ei];
        if (e.spawnTimer > 0) continue;
        if (dist(ox, oz, e.x, e.z) < 0.3 + e.radius && this._frame % 10 === 0) {
          e.hp -= p.spellDamage * 0.4;
          e.hitFlash = 3;
          if (e.hp <= 0) {
            p.score += 5; p.kills++; p.combo++; p.comboTimer = COMBO_DECAY;
            this._spawnSpellParticles(e.x, e.y, e.z, ENEMY_COLORS[e.type], 8);
            this._spawnXpOrb(e.x, e.z, XP_PER_KILL);
            if (e.mesh) this._scene.remove(e.mesh);
            this._enemies.splice(ei, 1);
            this._playSound("kill");
          }
        }
      }
    }
  }

  private _spawnKillShockwave(x: number, z: number, color: number): void {
    for (const sw of this._killShockwaves) {
      if (sw.life <= 0) {
        sw.mesh.position.set(x, 0.05, z);
        sw.mesh.scale.set(1, 1, 1);
        sw.mesh.visible = true;
        (sw.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
        (sw.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
        sw.life = 15;
        return;
      }
    }
  }

  private _updateKillShockwaves(): void {
    for (const sw of this._killShockwaves) {
      if (sw.life > 0) {
        sw.life--;
        const t = 1 - sw.life / 15;
        sw.mesh.scale.setScalar(1 + t * 5);
        (sw.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
        if (sw.life <= 0) sw.mesh.visible = false;
      }
    }
  }

  private _castSpell(): void {
    const p = this._player;
    if (p.spellCooldown > 0) return;
    p.spellCooldown = Math.max(3, SPELL_COOLDOWN * p.castSpeed);

    const dx = this._mouseX - p.x, dz = this._mouseZ - p.z;
    const baseAngle = Math.atan2(dz, dx);

    // determine shot count and spread
    const shots = p.multiShot >= 1 ? 3 + (p.multiShot - 1) * 2 : 1; // 1, 3, 5, 7...
    const spreadAngle = p.multiShot >= 1 ? 0.2 + p.multiShot * 0.05 : 0;

    for (let si = 0; si < shots; si++) {
      const angleOffset = shots === 1 ? 0 : (si - (shots - 1) / 2) * spreadAngle;
      const shotAngle = baseAngle + angleOffset;
      const svx = Math.cos(shotAngle) * SPELL_SPEED;
      const svz = Math.sin(shotAngle) * SPELL_SPEED;

      const spell: Spell = {
        x: p.x, z: p.z, y: 0.8,
        vx: svx, vz: svz,
        element: p.element, life: SPELL_LIFETIME, mesh: null,
      };
      const color = ELEMENT_COLORS[p.element];
      const geo = p.element === SpellElement.FIRE ? new THREE.SphereGeometry(SPELL_RADIUS, 6, 4)
        : p.element === SpellElement.ICE ? new THREE.OctahedronGeometry(SPELL_RADIUS, 0)
        : new THREE.TetrahedronGeometry(SPELL_RADIUS, 0);
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2, roughness: 0.2, metalness: 0.3 });
      const spellMesh = new THREE.Mesh(geo, mat);
      // glow aura halo around projectile
      const auraMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, depthWrite: false });
      const aura = new THREE.Mesh(new THREE.SphereGeometry(SPELL_RADIUS * 2.5, 6, 4), auraMat);
      spellMesh.add(aura);
      spell.mesh = spellMesh;
      spell.mesh.position.set(spell.x, spell.y, spell.z);
      this._scene.add(spell.mesh);
      this._spells.push(spell);
    }

    this._playSound(ELEMENT_NAMES[p.element].toLowerCase() as any);
    this._muzzleFlashTimer = 5;
    if (this._staffMesh) {
      const gem = this._staffMesh.children[1] as THREE.Mesh;
      const gmat = gem.material as THREE.MeshStandardMaterial;
      const color = ELEMENT_COLORS[p.element];
      gmat.color.setHex(color); gmat.emissive.setHex(color);
    }
  }

  private _shieldBurst(): void {
    const p = this._player;
    if (p.shieldCooldown > 0) return;
    p.shieldCooldown = SHIELD_BURST_COOLDOWN;
    this._playSound("shield");
    // damage + push all enemies within radius
    for (const e of this._enemies) {
      const d = dist(p.x, p.z, e.x, e.z);
      if (d < SHIELD_BURST_RADIUS) {
        e.hp -= 15;
        const nx = (e.x - p.x) / (d || 1), nz = (e.z - p.z) / (d || 1);
        e.vx += nx * 8; e.vz += nz * 8;
        e.hitFlash = 8;
      }
    }
    // animate shield ring
    if (this._shieldMesh) {
      (this._shieldMesh.material as THREE.MeshBasicMaterial).opacity = 0.6;
    }
  }

  private _secondaryAbility(): void {
    const p = this._player;
    if (p.secondaryCooldown > 0) return;
    p.secondaryCooldown = SECONDARY_COOLDOWN;

    if (p.element === SpellElement.FIRE) {
      // FIRE: meteor burst — damage all enemies within 6 units
      for (const e of this._enemies) {
        if (dist(p.x, p.z, e.x, e.z) < 6) {
          e.hp -= p.spellDamage * 2;
          e.hitFlash = 10;
          e.burnTimer = 180; e.burnDamage = p.spellDamage * 0.2;
          this._spawnSpellParticles(e.x, e.y, e.z, 0xff4422, 12);
        }
      }
      this._shakeIntensity = 0.4;
      this._playSound("fire");
      this._spawnDamageNumber(p.x, p.z, "METEOR!", "#ff4422");
    } else if (p.element === SpellElement.ICE) {
      // ICE: frost nova — freeze all enemies for 3 seconds
      for (const e of this._enemies) {
        e.slowTimer = Math.max(e.slowTimer, 180);
        e.hitFlash = 4;
      }
      this._playSound("ice");
      this._spawnDamageNumber(p.x, p.z, "FROST NOVA!", "#44ccff");
    } else {
      // LIGHTNING: storm — 8 bolts target random enemies
      const targets = [...this._enemies].sort(() => Math.random() - 0.5).slice(0, 8);
      for (const e of targets) {
        e.hp -= p.spellDamage * 1.5;
        e.hitFlash = 8;
        this._spawnSpellParticles(e.x, e.y, e.z, 0xddaaff, 10);
      }
      this._shakeIntensity = 0.3;
      this._playSound("lightning");
      this._spawnDamageNumber(p.x, p.z, "STORM!", "#ddaaff");
    }
  }

  private _spawnBoss(): void {
    const w = this._player.wave;
    const angle = Math.random() * Math.PI * 2;
    const boss: Enemy = {
      x: Math.cos(angle) * SPAWN_RING_RADIUS, z: Math.sin(angle) * SPAWN_RING_RADIUS, y: 1.0,
      vx: 0, vz: 0,
      hp: 200 + w * 30, maxHp: 200 + w * 30,
      type: EnemyType.BOSS, radius: 1.2, speed: 1.8 + w * 0.05,
      mesh: null, hitFlash: 0, orbitAngle: 0,
      spawnTimer: 60, slowTimer: 0, burnTimer: 0, burnDamage: 0, attackTimer: 0, isElite: false,
    };
    this._buildEnemyMesh(boss);
    this._enemies.push(boss);
    this._spawnDamageNumber(0, 0, "BOSS INCOMING!", "#ff00ff");
    this._shakeIntensity = 0.5;
    this._playSound("death"); // ominous sound for boss
  }

  private _spawnXpOrb(x: number, z: number, value: number): void {
    const geo = new THREE.SphereGeometry(XP_ORB_RADIUS, 6, 4);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffd866, emissive: 0xffaa00, emissiveIntensity: 1.5, roughness: 0.3, metalness: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.5, z);
    this._scene.add(mesh);
    this._xpOrbs.push({ x, z, mesh, value, life: 600 }); // 10 second lifetime
  }

  private _updateXpOrbs(): void {
    const p = this._player;
    for (let i = this._xpOrbs.length - 1; i >= 0; i--) {
      const o = this._xpOrbs[i];
      o.life--;
      // attract toward player when close
      const d = dist(o.x, o.z, p.x, p.z);
      if (d < this._player.xpMagnetRadius) {
        const dx = p.x - o.x, dz = p.z - o.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        o.x += (dx / len) * XP_ORB_SPEED * SIM_DT;
        o.z += (dz / len) * XP_ORB_SPEED * SIM_DT;
      }
      // collect
      if (d < PLAYER_RADIUS + XP_ORB_RADIUS) {
        p.xp += o.value;
        const xpNeeded = XP_PER_LEVEL + (p.level - 1) * 50;
        if (p.xp >= xpNeeded) {
          p.xp -= xpNeeded; p.level++;
          p.maxHp += 10; p.hp = Math.min(p.hp + 20, p.maxHp);
          this._spawnDamageNumber(p.x, p.z, "LEVEL UP!", "#ffd866");
          this._playSound("wave");
        }
        if (o.mesh) this._scene.remove(o.mesh);
        this._xpOrbs.splice(i, 1);
        continue;
      }
      // expire
      if (o.life <= 0) {
        if (o.mesh) this._scene.remove(o.mesh);
        this._xpOrbs.splice(i, 1);
        continue;
      }
      // bob
      if (o.mesh) {
        o.mesh.position.set(o.x, 0.4 + Math.sin(this._frame * 0.1 + i) * 0.15, o.z);
        // fade when expiring
        if (o.life < 120) (o.mesh.material as THREE.MeshStandardMaterial).opacity = o.life / 120;
      }
    }
  }

  private _dash(): void {
    const p = this._player;
    if (p.dashCooldown > 0 || p.dashTimer > 0 || this._phase !== EpsilonPhase.PLAYING) return;
    p.dashTimer = DASH_DURATION;
    p.dashCooldown = DASH_COOLDOWN;
    // dash toward mouse
    const dx = this._mouseX - p.x, dz = this._mouseZ - p.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    p.vx = (dx / len) * DASH_SPEED;
    p.vz = (dz / len) * DASH_SPEED;
    this._playSound("shield"); // reuse shield whoosh
  }

  private _spawnDamageNumber(x: number, z: number, text: string, color: string): void {
    if (!this._hudDiv) return;
    const div = document.createElement("div");
    Object.assign(div.style, {
      position: "absolute", color, fontSize: "16px", fontWeight: "bold",
      textShadow: "0 1px 4px rgba(0,0,0,0.8)", pointerEvents: "none",
      transition: "transform 0.5s, opacity 0.5s",
    });
    div.textContent = text;
    this._hudDiv.appendChild(div);
    this._damageNumbers.push({ x, z, y: 1.5, text, life: 40, color, div });
  }

  private _saveHighscore(): void {
    try {
      const raw = localStorage.getItem("epsilon_highscore");
      const old = raw ? parseInt(raw) : 0;
      if (this._player.score > old) localStorage.setItem("epsilon_highscore", String(this._player.score));
      const waveRaw = localStorage.getItem("epsilon_highwave");
      const oldWave = waveRaw ? parseInt(waveRaw) : 0;
      if (this._player.wave > oldWave) localStorage.setItem("epsilon_highwave", String(this._player.wave));
      // total kills career stat
      const totalKills = parseInt(localStorage.getItem("epsilon_totalkills") ?? "0") + this._player.kills;
      localStorage.setItem("epsilon_totalkills", String(totalKills));
      const totalRuns = parseInt(localStorage.getItem("epsilon_runs") ?? "0") + 1;
      localStorage.setItem("epsilon_runs", String(totalRuns));
    } catch {}
  }

  private _getHighscore(): { score: number; wave: number } {
    try {
      return {
        score: parseInt(localStorage.getItem("epsilon_highscore") ?? "0"),
        wave: parseInt(localStorage.getItem("epsilon_highwave") ?? "0"),
      };
    } catch { return { score: 0, wave: 0 }; }
  }

  // ── update ─────────────────────────────────────────────────────────────

  private _update(dtSec: number): void {
    if (this._phase === EpsilonPhase.TITLE || this._phase === EpsilonPhase.GAME_OVER || this._phase === EpsilonPhase.UPGRADE) {
      this._frame++;
      this._renderScene();
      return;
    }
    if (this._phase === EpsilonPhase.PAUSED) { this._renderScene(); return; }

    // hit freeze
    if (this._hitFreezeFrames > 0) { this._hitFreezeFrames--; this._render(); this._updateHUD(); return; }

    // slow-mo
    let effectiveDt = dtSec;
    if (this._slowMoTimer > 0) { this._slowMoTimer -= dtSec; effectiveDt *= this._slowMoScale; }

    this._simAccum += effectiveDt;
    while (this._simAccum >= SIM_DT) {
      this._simAccum -= SIM_DT;
      this._simTick();
    }
    this._render();
    this._updateHUD();
  }

  private _simTick(): void {
    this._frame++;
    const p = this._player;

    // wave spawning
    if (this._waveTimer > 0) {
      this._waveTimer--;
      if (this._waveTimer === 0) {
        this._spawnWaveEnemies();
        if (this._activeModifier) this._activeModifier.apply();
        this._playSound("shield"); // whoosh spawn sound
      }
    }

    // check wave clear
    if (this._enemies.length === 0 && this._waveTimer <= 0 && this._phase === EpsilonPhase.PLAYING) {
      this._phase = EpsilonPhase.WAVE_CLEAR;
      this._waveTimer = WAVE_PAUSE;
      this._waveClearBurst = 30; // celebration effect
      this._shakeIntensity = 0.15;
      // burst of particles at player position
      this._spawnSpellParticles(p.x, 1, p.z, 0xffd866, 25);
      this._playSound("kill");
    }
    if (this._phase === EpsilonPhase.WAVE_CLEAR) {
      this._waveTimer--;
      // regen HP between waves
      if (this._frame % 6 === 0 && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + 1);
      }
      // collect remaining XP orbs
      this._updateXpOrbs();
      if (this._waveTimer <= 0) {
        this._phase = EpsilonPhase.UPGRADE;
        this._upgradeChoices = this._getUpgradeChoices();
        this._showOverlay("upgrade");
      }
      return;
    }

    // player movement + dash
    if (p.dashTimer > 0) {
      p.dashTimer--;
      p.x += p.vx * SIM_DT;
      p.z += p.vz * SIM_DT;
      p.vx *= 0.92; p.vz *= 0.92;
    } else {
      let mx = 0, mz = 0;
      if (this._keys["KeyW"] || this._keys["ArrowUp"]) mz = -1;
      if (this._keys["KeyS"] || this._keys["ArrowDown"]) mz = 1;
      if (this._keys["KeyA"] || this._keys["ArrowLeft"]) mx = -1;
      if (this._keys["KeyD"] || this._keys["ArrowRight"]) mx = 1;
      if (mx !== 0 || mz !== 0) {
        const len = Math.sqrt(mx * mx + mz * mz);
        p.x += (mx / len) * PLAYER_SPEED * p.moveSpeed * SIM_DT;
        p.z += (mz / len) * PLAYER_SPEED * p.moveSpeed * SIM_DT;
      }
    }
    // clamp to platform (may shrink on late waves)
    const pd = Math.sqrt(p.x * p.x + p.z * p.z);
    const platR = this._currentPlatformRadius - PLAYER_RADIUS;
    if (pd > platR) { const s2 = platR / pd; p.x *= s2; p.z *= s2; }
    // aim angle
    p.angle = Math.atan2(this._mouseZ - p.z, this._mouseX - p.x);

    // cooldowns
    if (p.spellCooldown > 0) p.spellCooldown--;
    if (p.shieldCooldown > 0) p.shieldCooldown--;
    if (p.dashCooldown > 0) p.dashCooldown--;
    if (p.secondaryCooldown > 0) p.secondaryCooldown--;
    // tutorial tips
    if (p.wave === 1 && this._frame === 30) this._showTip("element", "Press 1/2/3 to switch elements — each is strong against different enemies");
    if (p.wave === 2 && this._waveTimer === 50) this._showTip("dash", "Right-click to dash — brief invulnerability while dashing");
    if (p.wave === 3 && this._waveTimer === 50) this._showTip("shield", "SPACE for shield burst — damages and pushes nearby enemies");
    if (p.wave === 4 && this._waveTimer === 50) this._showTip("ult", "Press E for your element's ultimate ability");
    if (p.wave === 5 && this._waveTimer === 50) this._showTip("synergy", "Switch elements rapidly then attack for +40% synergy damage!");
    if (p.hp < 30 && p.hp > 0 && !this._tipShown.has("lowhp")) this._showTip("lowhp", "Low HP! Look for green healing drops from enemies");

    // passive regen
    if (this._passiveRegen > 0 && this._frame % 60 === 0 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + this._passiveRegen);
    }
    // combo decay
    if (p.comboTimer > 0) { p.comboTimer--; }
    else if (p.combo > 0) { p.combo = 0; }

    // auto-fire on mouse hold
    if (this._mouseDown) this._castSpell();

    // update spells
    for (let i = this._spells.length - 1; i >= 0; i--) {
      const s = this._spells[i];
      // homing: slight pull toward nearest enemy
      if (p.homing > 0) {
        let nearDist = 8; let nearDx = 0, nearDz = 0;
        for (const e of this._enemies) {
          if (e.spawnTimer > 0) continue;
          const ed = dist(s.x, s.z, e.x, e.z);
          if (ed < nearDist) { nearDist = ed; nearDx = e.x - s.x; nearDz = e.z - s.z; }
        }
        if (nearDist < 8) {
          const hStr = p.homing * 0.5;
          const nl = Math.sqrt(nearDx * nearDx + nearDz * nearDz) || 1;
          s.vx += (nearDx / nl) * hStr;
          s.vz += (nearDz / nl) * hStr;
          // re-normalize to spell speed
          const sl = Math.sqrt(s.vx * s.vx + s.vz * s.vz);
          if (sl > 0) { s.vx = (s.vx / sl) * SPELL_SPEED; s.vz = (s.vz / sl) * SPELL_SPEED; }
        }
      }
      s.x += s.vx * SIM_DT; s.z += s.vz * SIM_DT;
      s.life--;
      if (s.mesh) s.mesh.position.set(s.x, s.y, s.z);
      // off platform?
      const sd = Math.sqrt(s.x * s.x + s.z * s.z);
      if (s.life <= 0 || sd > SPAWN_RING_RADIUS + 5) {
        if (s.mesh) this._scene.remove(s.mesh);
        this._spells.splice(i, 1);
        continue;
      }
      // hit enemies
      let pierceLeft = p.spellPierce;
      for (let j = this._enemies.length - 1; j >= 0; j--) {
        const e = this._enemies[j];
        if (dist(s.x, s.z, e.x, e.z) < SPELL_RADIUS + e.radius) {
          // damage with synergy bonus for rapid element switching
          let dmg = p.spellDamage;
          const switchAge = this._frame - p.lastElementSwitch;
          if (switchAge > 0 && switchAge < SYNERGY_WINDOW) {
            dmg *= SYNERGY_BONUS;
          }
          // elemental bonus: fire vs orbiter, ice vs dasher, lightning vs titan
          if ((s.element === SpellElement.FIRE && e.type === EnemyType.ORBITER) ||
              (s.element === SpellElement.ICE && e.type === EnemyType.DASHER) ||
              (s.element === SpellElement.LIGHTNING && e.type === EnemyType.TITAN)) {
            dmg *= 1.5;
          }
          e.hp -= dmg;
          e.hitFlash = 6;
          // elemental effects
          if (s.element === SpellElement.ICE) e.slowTimer = 90; // 1.5s slow
          if (s.element === SpellElement.FIRE) { e.burnTimer = 120; e.burnDamage = p.spellDamage * 0.15; } // burn DOT
          if (s.element === SpellElement.LIGHTNING) {
            // chain to nearest other enemy within 3 units
            let chainTarget: Enemy | null = null; let chainDist = 3;
            for (const ce of this._enemies) {
              if (ce === e) continue;
              const cd = dist(e.x, e.z, ce.x, ce.z);
              if (cd < chainDist) { chainDist = cd; chainTarget = ce; }
            }
            if (chainTarget) {
              chainTarget.hp -= dmg * 0.5;
              chainTarget.hitFlash = 4;
              this._spawnSpellParticles(chainTarget.x, chainTarget.y, chainTarget.z, 0xddaaff, 5);
            }
          }
          this._spawnSpellParticles(e.x, e.y, e.z, ELEMENT_COLORS[s.element], 8);
          // scorch mark on platform where spell hit
          if (Math.sqrt(e.x * e.x + e.z * e.z) < this._currentPlatformRadius) {
            this._spawnScorchMark(e.x, e.z, ELEMENT_COLORS[s.element]);
          }
          this._playSound("hit");
          // juicy: brief 1-frame freeze on every 3rd hit in combo
          if (p.combo > 0 && p.combo % 3 === 0) this._hitFreezeFrames = Math.max(this._hitFreezeFrames, 1);
          if (e.hp <= 0) {
            // combo
            p.combo++;
            p.comboTimer = COMBO_DECAY;
            if (p.combo > p.maxCombo) p.maxCombo = p.combo;
            const comboMult = 1 + Math.floor(p.combo / 5) * 0.5;
            const baseScore = (e.type === EnemyType.TITAN ? 50 : e.type === EnemyType.BOSS ? 200 : e.type === EnemyType.SPLITTER ? 15 : 10) * (e.isElite ? 3 : 1);
            const earnedScore = Math.floor(baseScore * comboMult);
            p.score += earnedScore;
            p.kills++;
            // XP orb drop
            const orbValue = e.type === EnemyType.BOSS ? 100 : e.type === EnemyType.TITAN ? 30 : XP_PER_KILL;
            this._spawnXpOrb(e.x, e.z, orbValue);
            // life steal
            if (p.lifeSteal > 0) { p.hp = Math.min(p.maxHp, p.hp + dmg * p.lifeSteal); }
            // HP pickup drop
            if (Math.random() < HP_PICKUP_CHANCE) this._spawnHpPickup(e.x, e.z);
            this._spawnSpellParticles(e.x, e.y, e.z, ENEMY_COLORS[e.type], 15);
            this._spawnKillShockwave(e.x, e.z, ENEMY_COLORS[e.type]);
            this._spawnDamageNumber(e.x, e.z, `${earnedScore}`, p.combo >= 5 ? "#ffd866" : "#fff");
            this._shakeIntensity = Math.max(this._shakeIntensity, e.type === EnemyType.TITAN ? 0.3 : e.type === EnemyType.BOSS ? 0.6 : 0.1);
            if (e.type === EnemyType.TITAN || e.type === EnemyType.BOSS) { this._hitFreezeFrames = e.type === EnemyType.BOSS ? 8 : 3; this._chromaticTarget = e.type === EnemyType.BOSS ? 0.12 : 0.04; }
            // boss death cinematic
            if (e.type === EnemyType.BOSS) {
              this._slowMoTimer = 1.5; this._slowMoScale = 0.2;
              this._spawnSpellParticles(e.x, e.y, e.z, 0xff00ff, 30);
              this._spawnSpellParticles(e.x, e.y + 1, e.z, 0xffd866, 20);
              this._spawnKillShockwave(e.x, e.z, 0xff00ff);
              if (this._bloomPass) this._bloomPass.strength = 2.0;
              this._spawnDamageNumber(e.x, e.z, "BOSS DEFEATED!", "#ffd866");
            }
            // splitter: spawn 2 smaller seekers on death
            if (e.type === EnemyType.SPLITTER) {
              for (let si = 0; si < 2; si++) {
                const sa = e.orbitAngle + si * Math.PI;
                const split: Enemy = {
                  x: e.x + Math.cos(sa) * 0.5, z: e.z + Math.sin(sa) * 0.5, y: 0.5,
                  vx: Math.cos(sa) * 3, vz: Math.sin(sa) * 3,
                  hp: 15 + p.wave * 2, maxHp: 15 + p.wave * 2,
                  type: EnemyType.SEEKER, radius: 0.25, speed: 3,
                  mesh: null, hitFlash: 0, orbitAngle: sa,
                  spawnTimer: 10, slowTimer: 0, burnTimer: 0, burnDamage: 0, attackTimer: 0, isElite: false,
                };
                this._buildEnemyMesh(split);
                this._enemies.push(split);
              }
            }
            // death dissolve: keep mesh for visual effect
            if (e.mesh) {
              this._deathDissolves.push({ mesh: e.mesh, timer: 15 });
              e.mesh = null; // detach from enemy
            }
            this._enemies.splice(j, 1);
            this._playSound("kill");
          }
          if (pierceLeft <= 0) {
            if (s.mesh) this._scene.remove(s.mesh);
            this._spells.splice(i, 1);
            break;
          }
          pierceLeft--;
        }
      }
    }

    // update enemies
    for (let ei = this._enemies.length - 1; ei >= 0; ei--) {
      const e = this._enemies[ei];
      if (e.hitFlash > 0) e.hitFlash--;
      // spawn animation: can't move or deal damage while spawning
      if (e.spawnTimer > 0) { e.spawnTimer--; continue; }
      // burn DOT
      if (e.burnTimer > 0) {
        e.burnTimer--;
        if (this._frame % 20 === 0) { e.hp -= e.burnDamage; e.hitFlash = 2; }
        if (e.hp <= 0) {
          p.score += 5; p.kills++; p.combo++; p.comboTimer = COMBO_DECAY;
          this._spawnSpellParticles(e.x, e.y, e.z, 0xff4422, 10);
          if (e.mesh) this._scene.remove(e.mesh);
          this._enemies.splice(ei, 1);
          this._playSound("kill");
          continue;
        }
      }
      if (e.slowTimer > 0) e.slowTimer--;
      const speedMult = e.slowTimer > 0 ? 0.4 : 1; // ice slow = 60% speed reduction

      const dx = p.x - e.x, dz = p.z - e.z;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;

      if (e.type === EnemyType.ORBITER) {
        e.orbitAngle += e.speed * 0.03 * SIM_DT;
        const targetDist = 6 + Math.sin(this._frame * 0.02) * 2;
        const tx = p.x + Math.cos(e.orbitAngle) * targetDist;
        const tz = p.z + Math.sin(e.orbitAngle) * targetDist;
        e.vx += (tx - e.x) * 0.05; e.vz += (tz - e.z) * 0.05;
        e.vx *= 0.95; e.vz *= 0.95;
      } else if (e.type === EnemyType.DASHER) {
        // charge in bursts with telegraph
        const chargePhase = this._frame % 120;
        if (chargePhase >= 100 && chargePhase < 120) {
          // wind-up telegraph: glow brighter before charging
          if (e.mesh) {
            const main = e.mesh.children[0] as THREE.Mesh;
            (main.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + (chargePhase - 100) * 0.1;
          }
        }
        if (chargePhase < 20) {
          e.vx += (dx / d) * e.speed * 0.5; e.vz += (dz / d) * e.speed * 0.5;
        }
        e.vx *= 0.97; e.vz *= 0.97;
      } else if (e.type === EnemyType.BOSS) {
        // boss: slow approach + periodic burst of 4 projectile seekers
        e.vx = (dx / d) * e.speed * 0.6;
        e.vz = (dz / d) * e.speed * 0.6;
        e.attackTimer++;
        // telegraph: boss glows before attack
        if (e.attackTimer >= 150 && e.attackTimer < 180 && e.mesh) {
          const main = e.mesh.children[0] as THREE.Mesh;
          (main.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0 + (e.attackTimer - 150) * 0.08;
        }
        if (e.attackTimer >= 180) {
          e.attackTimer = 0;
          // spawn 4 mini-seekers around boss
          for (let bi = 0; bi < 4; bi++) {
            const ba = (bi / 4) * Math.PI * 2;
            const minion: Enemy = {
              x: e.x + Math.cos(ba) * 1.5, z: e.z + Math.sin(ba) * 1.5, y: 0.5,
              vx: Math.cos(ba) * 4, vz: Math.sin(ba) * 4,
              hp: 10 + p.wave, maxHp: 10 + p.wave,
              type: EnemyType.SEEKER, radius: 0.2, speed: 4,
              mesh: null, hitFlash: 0, orbitAngle: ba,
              spawnTimer: 8, slowTimer: 0, burnTimer: 0, burnDamage: 0, attackTimer: 0, isElite: false,
            };
            this._buildEnemyMesh(minion);
            this._enemies.push(minion);
          }
          this._playSound("shield");
          this._spawnSpellParticles(e.x, e.y, e.z, 0xff00ff, 20);
        }
      } else {
        // seeker + titan: move toward player
        e.vx = (dx / d) * e.speed;
        e.vz = (dz / d) * e.speed;
      }

      e.x += e.vx * SIM_DT * speedMult; e.z += e.vz * SIM_DT * speedMult;
      e.y = 0.5 + Math.sin(this._frame * 0.05 + e.orbitAngle) * 0.2; // float bob

      // hit player (with i-frames)
      if (dist(e.x, e.z, p.x, p.z) < e.radius + PLAYER_RADIUS && this._iFrames <= 0) {
        const dmg = e.type === EnemyType.TITAN ? 20 : 10;
        p.hp -= dmg;
        this._iFrames = 30;
        this._shakeIntensity = Math.max(this._shakeIntensity, 0.2);
        this._chromaticTarget = 0.05;
        // thorns: damage enemy back
        e.hp -= 5; e.hitFlash = 4;
        if (this._damageFlashDiv) { this._damageFlashDiv.style.opacity = "1"; setTimeout(() => { if (this._damageFlashDiv) this._damageFlashDiv.style.opacity = "0"; }, 200); }
        this._playSound("hurt");
        // knockback enemy
        const nx = (e.x - p.x) / d, nz = (e.z - p.z) / d;
        e.vx += nx * 5; e.vz += nz * 5;
        e.x += nx * 0.5; e.z += nz * 0.5;
        if (p.hp <= 0) {
          this._phase = EpsilonPhase.GAME_OVER;
          this._saveHighscore();
          if (this._ambientDrone) { try { this._ambientDrone.stop(); } catch {} this._ambientDrone = null; }
          this._showOverlay("gameover");
          this._playSound("death");
          return;
        }
      }
    }

    // i-frames tick
    if (this._iFrames > 0) this._iFrames--;

    // enemy-enemy repulsion (prevent clumping)
    for (let i = 0; i < this._enemies.length; i++) {
      for (let j = i + 1; j < this._enemies.length; j++) {
        const a = this._enemies[i], b = this._enemies[j];
        const d2 = dist(a.x, a.z, b.x, b.z);
        const minD = a.radius + b.radius + 0.2;
        if (d2 < minD && d2 > 0.01) {
          const nx = (b.x - a.x) / d2, nz = (b.z - a.z) / d2;
          const push = (minD - d2) * 0.5;
          a.x -= nx * push; a.z -= nz * push;
          b.x += nx * push; b.z += nz * push;
        }
      }
    }

    // spell trail particles: spawn behind each active spell
    for (const s of this._spells) {
      for (let ti = 0; ti < this._spellTrailLife.length; ti++) {
        if (this._spellTrailLife[ti] <= 0) {
          this._spellTrailPositions[ti * 3] = s.x + (Math.random() - 0.5) * 0.15;
          this._spellTrailPositions[ti * 3 + 1] = s.y + (Math.random() - 0.5) * 0.15;
          this._spellTrailPositions[ti * 3 + 2] = s.z + (Math.random() - 0.5) * 0.15;
          this._spellTrailLife[ti] = 12 + Math.random() * 8;
          break;
        }
      }
    }
    for (let ti = 0; ti < this._spellTrailLife.length; ti++) {
      if (this._spellTrailLife[ti] > 0) { this._spellTrailLife[ti]--; }
      else { this._spellTrailPositions[ti * 3 + 1] = -50; }
    }
    (this._spellTrailParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this._spellTrailParticles.material as THREE.PointsMaterial).color.setHex(ELEMENT_COLORS[p.element]);

    // orbit spells
    this._updateOrbitSpells();
    // kill shockwaves
    this._updateKillShockwaves();
    // HP pickups
    this._updateHpPickups();
    // XP orbs
    this._updateXpOrbs();

    // streak announcements
    if (p.combo === 10) this._spawnDamageNumber(p.x, p.z, "UNSTOPPABLE!", "#ff8844");
    if (p.combo === 20) this._spawnDamageNumber(p.x, p.z, "GODLIKE!", "#ff4444");
    if (p.combo === 50) this._spawnDamageNumber(p.x, p.z, "LEGENDARY!", "#ffd866");

    // update spell particles
    for (let i = 0; i < this._spellPartLife.length; i++) {
      if (this._spellPartLife[i] > 0) {
        this._spellPartLife[i]--;
        this._spellPartPositions[i * 3] += this._spellPartVelocities[i * 3] * SIM_DT;
        this._spellPartPositions[i * 3 + 1] += this._spellPartVelocities[i * 3 + 1] * SIM_DT;
        this._spellPartPositions[i * 3 + 2] += this._spellPartVelocities[i * 3 + 2] * SIM_DT;
        this._spellPartVelocities[i * 3 + 1] -= 8 * SIM_DT;
      } else {
        this._spellPartPositions[i * 3 + 1] = -50;
      }
    }
    (this._spellParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // void particles drift
    for (let i = 0; i < this._voidPositions.length / 3; i++) {
      this._voidPositions[i * 3 + 1] += 0.01;
      if (this._voidPositions[i * 3 + 1] > -1) {
        this._voidPositions[i * 3 + 1] = -30;
        this._voidPositions[i * 3] = (Math.random() - 0.5) * 80;
        this._voidPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      }
    }
    (this._voidParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // shield burst decay
    if (this._shieldMesh) {
      const op = (this._shieldMesh.material as THREE.MeshBasicMaterial).opacity;
      if (op > 0.01) (this._shieldMesh.material as THREE.MeshBasicMaterial).opacity *= 0.9;
    }
  }

  private _spawnSpellParticles(x: number, y: number, z: number, color: number, count: number): void {
    (this._spellParticles.material as THREE.PointsMaterial).color.setHex(color);
    let spawned = 0;
    for (let i = 0; i < this._spellPartLife.length && spawned < count; i++) {
      if (this._spellPartLife[i] <= 0) {
        this._spellPartPositions[i * 3] = x; this._spellPartPositions[i * 3 + 1] = y; this._spellPartPositions[i * 3 + 2] = z;
        this._spellPartVelocities[i * 3] = (Math.random() - 0.5) * 6;
        this._spellPartVelocities[i * 3 + 1] = Math.random() * 4 + 1;
        this._spellPartVelocities[i * 3 + 2] = (Math.random() - 0.5) * 6;
        this._spellPartLife[i] = 20 + Math.random() * 20;
        spawned++;
      }
    }
  }

  // ── render ─────────────────────────────────────────────────────────────

  private _renderScene(): void {
    // title/gameover: rotate camera slowly
    const t = this._frame * 0.005;
    this._camera.position.set(Math.sin(t) * 20, 18, Math.cos(t) * 20);
    this._camera.lookAt(0, 0, 0);
    this._composer.render();
  }

  private _render(): void {
    const p = this._player;
    const time = this._frame / 60;

    // player mesh
    if (this._playerMesh) {
      this._playerMesh.position.set(p.x, 0, p.z);
      this._playerMesh.rotation.y = -p.angle + Math.PI / 2;
    }

    // spells: spin
    for (const s of this._spells) {
      if (s.mesh) {
        s.mesh.rotation.x += 0.1; s.mesh.rotation.y += 0.15;
      }
    }

    // player shadow
    if (this._playerShadow) this._playerShadow.position.set(p.x, 0.01, p.z);

    // player i-frame flash (blink visibility)
    if (this._playerMesh) this._playerMesh.visible = this._iFrames <= 0 || this._frame % 6 < 3;

    // enemies: spawn animation, bob, spin, hitflash, slow tint
    for (const e of this._enemies) {
      if (!e.mesh) continue;
      e.mesh.position.set(e.x, e.y, e.z);
      const main = e.mesh.children[0] as THREE.Mesh;
      main.rotation.x += 0.02; main.rotation.y += 0.03;
      // spawn animation: scale from 0 to 1
      const spawnFrac = e.spawnTimer > 0 ? 1 - e.spawnTimer / 30 : 1;
      e.mesh.scale.setScalar(spawnFrac);
      // hitflash + slow tint
      const mat = main.material as THREE.MeshStandardMaterial;
      if (e.hitFlash > 0) { mat.emissiveIntensity = 2.5; }
      else if (e.slowTimer > 0) { mat.emissive.setHex(0x44ccff); mat.emissiveIntensity = 1.0; }
      else if (e.burnTimer > 0) { mat.emissive.setHex(0xff4422); mat.emissiveIntensity = 1.0; }
      else { mat.emissive.setHex(ENEMY_COLORS[e.type]); mat.emissiveIntensity = 0.6; }
      // hp bar scale
      const hpFrac = e.hp / e.maxHp;
      if (e.mesh.children[3]) e.mesh.children[3].scale.x = Math.max(0.01, hpFrac);
      // wireframe overlay pulsing
      if (e.mesh.children[1]) {
        (e.mesh.children[1] as THREE.Mesh).scale.setScalar(1.15 + Math.sin(time * 4 + e.orbitAngle) * 0.05);
      }
    }

    // arcane ring rotation
    for (let ri = 0; ri < this._arcaneRingMeshes.length; ri++) {
      const ring = this._arcaneRingMeshes[ri];
      ring.rotation.z += (ri % 2 === 0 ? 0.003 : -0.004) * (ri + 1);
    }

    // pillar orbs match element color
    const elColor = ELEMENT_COLORS[p.element];
    for (const orb of this._pillarOrbs) {
      const om = orb.material as THREE.MeshStandardMaterial;
      om.color.lerp(new THREE.Color(elColor), 0.05);
      om.emissive.lerp(new THREE.Color(elColor), 0.05);
      // pulse
      om.emissiveIntensity = 1.2 + Math.sin(time * 4 + orb.position.x) * 0.4;
    }

    // radar minimap
    if (this._radarCtx) {
      const rc = this._radarCtx; const rw = 100;
      rc.clearRect(0, 0, rw, rw);
      rc.fillStyle = "rgba(10,5,20,0.5)"; rc.beginPath(); rc.arc(50, 50, 48, 0, Math.PI * 2); rc.fill();
      // platform circle
      rc.strokeStyle = "rgba(100,68,204,0.3)"; rc.lineWidth = 1; rc.beginPath(); rc.arc(50, 50, 28, 0, Math.PI * 2); rc.stroke();
      const mapScale = 28 / PLATFORM_RADIUS;
      // enemies
      for (const e of this._enemies) {
        if (e.spawnTimer > 0) continue;
        const ex = 50 + e.x * mapScale, ez = 50 + e.z * mapScale;
        rc.fillStyle = `#${(ENEMY_COLORS[e.type] ?? 0xff3366).toString(16).padStart(6, "0")}`;
        rc.beginPath(); rc.arc(ex, ez, e.type === EnemyType.TITAN ? 3 : 2, 0, Math.PI * 2); rc.fill();
      }
      // player
      rc.fillStyle = "#8866ff"; rc.beginPath(); rc.arc(50 + p.x * mapScale, 50 + p.z * mapScale, 3, 0, Math.PI * 2); rc.fill();
      rc.strokeStyle = "#fff"; rc.lineWidth = 1; rc.stroke();
    }

    // edge warning: glow red when near platform edge
    if (this._edgeWarningRing) {
      const edgeDist = Math.sqrt(p.x * p.x + p.z * p.z);
      const edgeFrac = Math.max(0, (edgeDist - this._currentPlatformRadius + 3) / 3);
      (this._edgeWarningRing.material as THREE.MeshBasicMaterial).opacity = edgeFrac * 0.4;
      this._edgeWarningRing.scale.setScalar(this._currentPlatformRadius / PLATFORM_RADIUS);
    }

    // void tentacles: sway and rise on late waves
    for (let ti = 0; ti < this._tentacles.length; ti++) {
      const tent = this._tentacles[ti];
      const waveRise = p.wave >= 8 ? Math.min((p.wave - 8) * 0.3, 2) : 0;
      tent.position.y = -4 + waveRise + Math.sin(time * 0.8 + ti * 1.5) * 0.5;
      tent.rotation.x = Math.sin(time * 0.5 + ti * 2) * 0.2;
      tent.rotation.z = Math.cos(time * 0.4 + ti * 1.7) * 0.15;
      (tent.material as THREE.MeshStandardMaterial).opacity = 0.3 + waveRise * 0.1;
    }

    // combo rune ring: visible at 5+ combo, orbits player
    if (this._comboRuneRing) {
      if (p.combo >= 5) {
        this._comboRuneRing.visible = true;
        this._comboRuneRing.position.set(p.x, 1.5, p.z);
        this._comboRuneRing.rotation.y += 0.02;
        const runeCount = this._comboRuneRing.children.length;
        for (let ci = 0; ci < runeCount; ci++) {
          const angle = (ci / runeCount) * Math.PI * 2 + time * 2;
          const cr = 1.0 + Math.sin(time * 3 + ci) * 0.2;
          this._comboRuneRing.children[ci].position.set(Math.cos(angle) * cr, Math.sin(time * 4 + ci) * 0.3, Math.sin(angle) * cr);
          // brightness scales with combo
          const brightness = Math.min(1, p.combo / 20);
          (this._comboRuneRing.children[ci] as THREE.Sprite).material.opacity = 0.3 + brightness * 0.7;
        }
      } else {
        this._comboRuneRing.visible = false;
      }
    }

    // staff wobble + gem spin + light
    if (this._staffMesh) {
      if (p.spellCooldown > 0) {
        this._staffMesh.rotation.z = Math.sin(time * 30) * 0.08;
      } else {
        this._staffMesh.rotation.z *= 0.9;
      }
      // gem spin
      const gem2 = this._staffMesh.children[1];
      if (gem2) { gem2.rotation.x += 0.03; gem2.rotation.y += 0.05; }
      // staff point light follows gem position
      if (this._staffLight && this._playerMesh) {
        this._staffLight.position.set(p.x + Math.cos(-p.angle + Math.PI / 2 + 0.3) * 0.35, 1.9, p.z + Math.sin(-p.angle + Math.PI / 2 + 0.3) * 0.35);
        this._staffLight.color.setHex(ELEMENT_COLORS[p.element]);
        this._staffLight.intensity = 0.6 + Math.sin(time * 6) * 0.2;
      }
    }

    // player eyes glow matching element
    if (this._playerMesh && this._playerMesh.children.length >= 4) {
      for (let ei = 2; ei <= 3; ei++) {
        const eye = this._playerMesh.children[ei] as THREE.Mesh;
        if (eye?.material) {
          (eye.material as THREE.MeshStandardMaterial).color.setHex(ELEMENT_COLORS[p.element]);
          (eye.material as THREE.MeshStandardMaterial).emissive.setHex(ELEMENT_COLORS[p.element]);
        }
      }
    }

    // player robe sway when moving
    if (this._playerMesh) {
      const moveSpeed = Math.sqrt(p.vx * p.vx + p.vz * p.vz);
      if (moveSpeed > 1 || p.dashTimer > 0) {
        this._playerMesh.children[0].rotation.x = Math.sin(time * 8) * 0.05;
      }
    }

    // death dissolve animations (scale down + spin + fade)
    for (let di = this._deathDissolves.length - 1; di >= 0; di--) {
      const dd = this._deathDissolves[di];
      dd.timer--;
      const t = dd.timer / 15;
      dd.mesh.scale.setScalar(t * 0.8);
      dd.mesh.rotation.y += 0.3;
      dd.mesh.position.y += 0.05;
      // fade all children
      for (const child of dd.mesh.children) {
        const cm = (child as THREE.Mesh).material;
        if (cm && "opacity" in cm) (cm as THREE.MeshBasicMaterial).opacity = t * 0.5;
      }
      if (dd.timer <= 0) {
        this._scene.remove(dd.mesh);
        this._deathDissolves.splice(di, 1);
      }
    }

    // scorch marks: fade over time
    for (let si = this._scorchMarks.length - 1; si >= 0; si--) {
      const sm = this._scorchMarks[si];
      sm.life--;
      (sm.mesh.material as THREE.MeshBasicMaterial).opacity = (sm.life / 300) * 0.25;
      if (sm.life <= 0) {
        this._scene.remove(sm.mesh);
        sm.mesh.geometry.dispose();
        (sm.mesh.material as THREE.Material).dispose();
        this._scorchMarks.splice(si, 1);
      }
    }

    // crumble rocks: fall into void
    for (let ci = this._crumbleRocks.length - 1; ci >= 0; ci--) {
      const cr = this._crumbleRocks[ci];
      cr.life--;
      cr.vy -= 0.01;
      cr.mesh.position.y += cr.vy;
      cr.mesh.rotation.x += 0.03;
      cr.mesh.rotation.z += 0.02;
      if (cr.life <= 0 || cr.mesh.position.y < -20) {
        this._scene.remove(cr.mesh);
        cr.mesh.geometry.dispose();
        (cr.mesh.material as THREE.Material).dispose();
        this._crumbleRocks.splice(ci, 1);
      }
    }

    // void vortex: rotate rings at different speeds
    for (let vi = 0; vi < this._vortexRings.length; vi++) {
      const vr = this._vortexRings[vi];
      vr.rotation.z += 0.005 * (vi % 2 === 0 ? 1 : -1) * (vi + 1);
      // pulse opacity with boss presence
      const baseOp = 0.08 + vi * 0.02;
      (vr.material as THREE.MeshBasicMaterial).opacity = baseOp + this._bossAtmosphere * 0.06;
    }

    // XP orb sparkle: emit tiny particles from orbs moving toward player
    for (const o of this._xpOrbs) {
      const od = dist(o.x, o.z, p.x, p.z);
      if (od < p.xpMagnetRadius && this._frame % 4 === 0) {
        this._spawnSpellParticles(o.x, 0.5, o.z, 0xffd866, 1);
      }
    }

    // shooting stars (random spawning)
    if (this._frame % 90 === 0 && Math.random() < 0.4) {
      const starGeo = new THREE.BoxGeometry(0.08, 0.08, 0.8);
      const starMat = new THREE.MeshBasicMaterial({ color: 0xccccff, transparent: true, opacity: 0.6, depthWrite: false });
      const star = new THREE.Mesh(starGeo, starMat);
      const sa = Math.random() * Math.PI * 2;
      star.position.set((Math.random() - 0.5) * 60, 8 + Math.random() * 15, (Math.random() - 0.5) * 60);
      star.rotation.set(Math.random(), sa, Math.random());
      this._scene.add(star);
      this._shootingStars.push({ mesh: star, vx: Math.cos(sa) * 0.8, vy: -0.3, vz: Math.sin(sa) * 0.8, life: 40 });
    }
    for (let si = this._shootingStars.length - 1; si >= 0; si--) {
      const ss = this._shootingStars[si];
      ss.life--;
      ss.mesh.position.x += ss.vx; ss.mesh.position.y += ss.vy; ss.mesh.position.z += ss.vz;
      (ss.mesh.material as THREE.MeshBasicMaterial).opacity = ss.life / 40 * 0.6;
      if (ss.life <= 0) { this._scene.remove(ss.mesh); ss.mesh.geometry.dispose(); (ss.mesh.material as THREE.Material).dispose(); this._shootingStars.splice(si, 1); }
    }

    // spawn portal rings: expand and fade
    for (let pi = this._spawnPortals.length - 1; pi >= 0; pi--) {
      const sp = this._spawnPortals[pi];
      sp.life--;
      const t = 1 - sp.life / 30;
      sp.mesh.scale.setScalar(1 + t * 2);
      (sp.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
      if (sp.life <= 0) { this._scene.remove(sp.mesh); sp.mesh.geometry.dispose(); (sp.mesh.material as THREE.Material).dispose(); this._spawnPortals.splice(pi, 1); }
    }

    // player level aura: visible and grows with level
    if (this._levelAura) {
      const auraScale = 0.8 + p.level * 0.15;
      this._levelAura.position.set(p.x, 0.015, p.z);
      this._levelAura.scale.setScalar(auraScale + Math.sin(time * 3) * 0.1);
      (this._levelAura.material as THREE.MeshBasicMaterial).opacity = Math.min(0.25, p.level * 0.03);
      (this._levelAura.material as THREE.MeshBasicMaterial).color.setHex(ELEMENT_COLORS[p.element]);
    }

    // center platform glow: matches element
    if (this._centerGlow) {
      (this._centerGlow.material as THREE.MeshBasicMaterial).color.setHex(ELEMENT_COLORS[p.element]);
      (this._centerGlow.material as THREE.MeshBasicMaterial).opacity = 0.05 + Math.sin(time * 1.5) * 0.03;
      this._centerGlow.scale.setScalar(this._currentPlatformRadius / PLATFORM_RADIUS);
    }

    // wave clear burst: bloom spike
    if (this._waveClearBurst > 0) {
      this._waveClearBurst--;
      if (this._bloomPass) this._bloomPass.strength = Math.max(this._bloomPass.strength, 1.5 * (this._waveClearBurst / 30));
    }

    // boss atmosphere: darken during boss fight
    const hasBoss = this._enemies.some(e => e.type === EnemyType.BOSS);
    this._bossAtmosphere += ((hasBoss ? 1 : 0) - this._bossAtmosphere) * 0.02;
    if (this._bossAtmosphere > 0.01) {
      const fogDensity = 0.015 + this._bossAtmosphere * 0.01;
      (this._scene.fog as THREE.FogExp2).density = fogDensity;
    }

    // nebula drift
    for (let ni = 0; ni < this._nebulae.length; ni++) {
      const neb = this._nebulae[ni];
      neb.rotation.z += 0.0003 * (ni % 2 === 0 ? 1 : -1);
      neb.position.y += Math.sin(time * 0.15 + ni * 2) * 0.003;
    }

    // ruin chunks: slow drift + rotation
    for (let ri = 0; ri < this._ruinChunks.length; ri++) {
      const ruin = this._ruinChunks[ri];
      ruin.position.y += Math.sin(time * 0.3 + ri * 1.5) * 0.003;
      ruin.rotation.x += 0.001; ruin.rotation.y += 0.0015;
    }

    // platform underglow pulse
    if (this._underGlow) {
      (this._underGlow.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(time * 2) * 0.05;
      this._underGlow.scale.setScalar(this._currentPlatformRadius / PLATFORM_RADIUS);
    }

    // pillar beam brightness pulse
    for (let bi = 0; bi < this._pillarBeams.length; bi++) {
      const beam = this._pillarBeams[bi];
      (beam.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.sin(time * 3 + bi * 1.2) * 0.08;
      (beam.material as THREE.MeshBasicMaterial).color.setHex(ELEMENT_COLORS[p.element]);
    }

    // muzzle flash at staff tip on cast
    if (this._muzzleFlash) {
      if (this._muzzleFlashTimer > 0) {
        this._muzzleFlashTimer--;
        this._muzzleFlash.visible = true;
        (this._muzzleFlash.material as THREE.MeshBasicMaterial).opacity = this._muzzleFlashTimer / 5;
        (this._muzzleFlash.material as THREE.MeshBasicMaterial).color.setHex(ELEMENT_COLORS[p.element]);
        const flashDist = 0.5;
        this._muzzleFlash.position.set(
          p.x + Math.cos(p.angle) * flashDist,
          1.85,
          p.z + Math.sin(p.angle) * flashDist
        );
        this._muzzleFlash.scale.setScalar(1 + (5 - this._muzzleFlashTimer) * 0.3);
      } else {
        this._muzzleFlash.visible = false;
      }
    }

    // dash afterimage ghosts
    if (p.dashTimer > 0 && this._frame % 3 === 0 && this._playerMesh) {
      const ghost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.4, 1.2, 6),
        new THREE.MeshBasicMaterial({ color: ELEMENT_COLORS[p.element], transparent: true, opacity: 0.3, depthWrite: false })
      );
      ghost.position.set(p.x, 0.6, p.z);
      ghost.rotation.y = this._playerMesh.rotation.y;
      this._scene.add(ghost);
      this._dashGhosts.push({ mesh: ghost, life: 12 });
    }
    for (let gi = this._dashGhosts.length - 1; gi >= 0; gi--) {
      const dg = this._dashGhosts[gi];
      dg.life--;
      (dg.mesh.material as THREE.MeshBasicMaterial).opacity = dg.life / 12 * 0.3;
      if (dg.life <= 0) {
        this._scene.remove(dg.mesh);
        dg.mesh.geometry.dispose();
        (dg.mesh.material as THREE.Material).dispose();
        this._dashGhosts.splice(gi, 1);
      }
    }

    // camera: follow player
    this._camera.position.set(p.x * 0.3, 18, 14 + p.z * 0.2);
    if (this._shakeIntensity > 0.001) {
      this._camera.position.x += (Math.random() - 0.5) * this._shakeIntensity * 2;
      this._camera.position.y += (Math.random() - 0.5) * this._shakeIntensity;
      this._shakeIntensity *= 0.85;
    }
    this._camera.lookAt(p.x * 0.5, 0, p.z * 0.3);

    // chromatic aberration decay
    if (this._chromaticPass) {
      const cur = this._chromaticPass.uniforms["amount"].value;
      this._chromaticPass.uniforms["amount"].value = cur + (this._chromaticTarget - cur) * 0.1;
      this._chromaticTarget *= 0.92;
    }

    // bloom: pulse on shield, higher on boss waves
    if (this._bloomPass) {
      let bloomTarget = 0.8;
      if (this._player.shieldCooldown > SHIELD_BURST_COOLDOWN - 20) bloomTarget = 1.3;
      else if (this._enemies.some(e => e.type === EnemyType.BOSS)) bloomTarget = 1.0;
      this._bloomPass.strength += (bloomTarget - this._bloomPass.strength) * 0.05;
    }

    this._composer.render();
  }
}
