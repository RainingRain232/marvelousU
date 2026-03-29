/**
 * KNIGHT BALL — Medieval 3D Arena Ball Sport
 *
 * 2v2 armored knights in a torch-lit stone arena.
 * Score by smashing a leather ball into the opponent's goal.
 * WASD move, hold SPACE to charge kick, SHIFT sprint, E tackle.
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { viewManager } from "@view/ViewManager";

// ── custom shaders ───────────────────────────────────────────────────────────

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, offset: { value: 1.0 }, darkness: { value: 1.2 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform float offset; uniform float darkness; uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() { vec4 t = texture2D(tDiffuse, vUv); vec2 u = (vUv - vec2(0.5)) * vec2(offset); gl_FragColor = vec4(mix(t.rgb, vec3(1.0 - darkness), dot(u,u)), t.a); }`,
};

const ChromaticAberrationShader = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0.0 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; varying vec2 vUv;
    void main() { vec2 d = vUv - vec2(0.5); float l = length(d); vec2 o = d * l * amount;
    float r = texture2D(tDiffuse, vUv + o).r; float g = texture2D(tDiffuse, vUv).g; float b = texture2D(tDiffuse, vUv - o).b;
    gl_FragColor = vec4(r, g, b, 1.0); }`,
};

// ── constants ────────────────────────────────────────────────────────────────

const SIM_DT = 1 / 60;

// arena
const ARENA_W = 28;
const ARENA_H = 18;
const WALL_HEIGHT = 4;
const GOAL_WIDTH = 4;
const GOAL_DEPTH = 2.5;
const GOAL_HEIGHT = 3;

// ball
const BALL_RADIUS = 0.45;
const BALL_FRICTION = 0.985;
const BALL_BOUNCE = 0.7;
const BALL_MAX_SPEED = 22;

// knight
const KNIGHT_RADIUS = 0.55;
const KNIGHT_SPEED = 6.0;
const KNIGHT_SPRINT_SPEED = 9.5;
const KNIGHT_KICK_POWER = 12;
const KNIGHT_KICK_CHARGE_BONUS = 10;
const KNIGHT_TACKLE_POWER = 10;
const KNIGHT_TACKLE_COOLDOWN = 60;
const KNIGHT_SPRINT_MAX = 180;
const KNIGHT_SPRINT_REGEN = 0.6;
const KICK_CHARGE_MAX = 50;
const HEADER_HEIGHT = 1.2;

// match
const MATCH_DURATION = 180;
const HALFTIME_DURATION = 3;
const GOAL_CELEBRATION = 2.5;
const KICKOFF_DELAY = 1.5;
const GOAL_SLOWMO_DURATION = 1.2;

// camera
const CAM_HEIGHT = 12;
const CAM_DIST = 16;
const CAM_LERP = 0.04;

// power-ups
const POWERUP_SPAWN_INTERVAL = 15; // seconds between spawns
const POWERUP_DURATION = 6; // seconds active on knight
const POWERUP_RADIUS = 0.6;

// shield bash
const SHIELD_BASH_RANGE = 1.8;
const SHIELD_BASH_COOLDOWN = 45;
const SHIELD_BASH_PUSH = 5;

// replay
const REPLAY_BUFFER_SECS = 3;
const REPLAY_BUFFER_LEN = Math.ceil(REPLAY_BUFFER_SECS * 60);

// fouls
const FREE_KICK_SETUP_TIME = 1.5; // seconds before free kick is taken

// difficulty multipliers
const DIFFICULTY = {
  easy:   { aiSpeed: 0.7, aiKickPower: 0.8, aiReaction: 0.6, label: "SQUIRE" },
  medium: { aiSpeed: 0.9, aiKickPower: 1.0, aiReaction: 0.85, label: "KNIGHT" },
  hard:   { aiSpeed: 1.05, aiKickPower: 1.15, aiReaction: 1.0, label: "CHAMPION" },
} as const;
type DifficultyKey = keyof typeof DIFFICULTY;

// ── types ────────────────────────────────────────────────────────────────────

const enum Team { BLUE = 0, RED = 1 }
const enum KnightState { IDLE, RUN, SPRINT, KICK, TACKLE, STUNNED, CELEBRATE, CHARGING, DIVING }
const enum MatchPhase { KICKOFF, PLAYING, GOAL_SCORED, HALFTIME, OVERTIME, ENDED, FREE_KICK, GOAL_KICK }
const enum GameScreen { TITLE, PLAYING, PAUSED, RESULT }
const enum PowerUpType { SPEED, MEGA_KICK, FREEZE }

interface KnightData {
  team: Team;
  x: number;
  z: number;
  vx: number;
  vz: number;
  angle: number;
  state: KnightState;
  stateTimer: number;
  tackleCooldown: number;
  sprintStamina: number;
  isPlayer: boolean;
  mesh: THREE.Group | null;
  aiRole: "attacker" | "defender";
  chargeFrames: number;
  // power-up
  activePowerUp: PowerUpType | null;
  powerUpTimer: number;
  bashCooldown: number;
  // stats
  shots: number;
  tackles: number;
  goals: number;
}

interface BallData {
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  vy: number;
  spin: number;
  lastKickerTeam: Team;
  lastKickerIdx: number; // index in knights array of last kicker
  prevKickerIdx: number; // kicker before lastKicker (for assists)
  mesh: THREE.Mesh | null;
  trail: THREE.Points | null;
  trailPositions: Float32Array;
  trailIdx: number;
}

interface PowerUpItem {
  type: PowerUpType;
  x: number;
  z: number;
  mesh: THREE.Mesh | null;
  active: boolean;
}

interface MatchStats {
  possession: [number, number];
  shotsOnGoal: [number, number];
  tackles: [number, number];
  assists: [number, number];
  goalDistances: number[]; // distances of each goal for quality scoring
}

interface MatchState {
  phase: MatchPhase;
  timer: number;
  phaseTimer: number;
  score: [number, number];
  half: 1 | 2;
  knights: KnightData[];
  ball: BallData;
  lastScorer: Team | null;
  frame: number;
  kickingTeam: Team;
  slowMoTimer: number;
  slowMoScale: number;
  // power-ups
  powerUps: PowerUpItem[];
  nextPowerUpTime: number;
  // stats
  stats: MatchStats;
  // tournament
  tournamentRound: number;
  tournamentScore: [number, number];
  // replay
  replayBuffer: Array<{ knights: Array<{x: number; z: number; angle: number; state: KnightState}>; bx: number; bz: number; by: number }>;
  replayIdx: number;
  isReplaying: boolean;
  replayFrame: number;
  // fouls
  fouls: [number, number];
  freeKickTeam: Team;
  freeKickPos: { x: number; z: number };
  // keeper
  keeperHasBall: boolean;
  keeperThrowTimer: number;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) { return v < lo ? lo : v > hi ? hi : v; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function dist(ax: number, az: number, bx: number, bz: number) {
  const dx = ax - bx, dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}
function normalize(x: number, z: number) {
  const len = Math.sqrt(x * x + z * z) || 1;
  return { x: x / len, z: z / len };
}

// ═════════════════════════════════════════════════════════════════════════════
// KnightBallGame
// ═════════════════════════════════════════════════════════════════════════════

export class KnightBallGame {
  // three.js
  private _canvas!: HTMLCanvasElement;
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;

  // state
  private _state!: MatchState;
  private _screen: GameScreen = GameScreen.TITLE;
  private _simAccum = 0;
  private _tickerCb: ((t: { deltaMS: number }) => void) | null = null;

  // input
  private _keys: Record<string, boolean> = {};
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  // meshes
  private _floorMesh!: THREE.Mesh;
  private _goalMeshes: THREE.Group[] = [];
  private _wallMeshes: THREE.Mesh[] = [];
  private _torchLights: THREE.PointLight[] = [];
  private _bannerMeshes: THREE.Mesh[] = [];
  private _lineMesh!: THREE.Mesh;
  private _ballShadow!: THREE.Mesh;

  // crowd
  private _crowdMesh: THREE.InstancedMesh | null = null;
  private _crowdBaseMatrices: THREE.Matrix4[] = [];
  private _crowdExcitement = 0;

  // HUD
  private _hudDiv: HTMLDivElement | null = null;
  private _scoreDiv: HTMLDivElement | null = null;
  private _timerDiv: HTMLDivElement | null = null;
  private _phaseDiv: HTMLDivElement | null = null;
  private _controlsDiv: HTMLDivElement | null = null;
  private _staminaBar: HTMLDivElement | null = null;
  private _chargeBar: HTMLDivElement | null = null;
  private _chargeContainer: HTMLDivElement | null = null;
  private _overlayDiv: HTMLDivElement | null = null;
  private _flashDiv: HTMLDivElement | null = null;
  private _minimapCanvas: HTMLCanvasElement | null = null;
  private _minimapCtx: CanvasRenderingContext2D | null = null;

  // commentary
  private _commentaryDiv: HTMLDivElement | null = null;
  private _commentaryTimeout: ReturnType<typeof setTimeout> | null = null;

  // weather
  private _weather: "day" | "sunset" | "night" | "rain" = "day";
  private _rainParticles: THREE.Points | null = null;
  private _rainPositions: Float32Array | null = null;
  private _dirLight: THREE.DirectionalLight | null = null;
  private _ambientLight: THREE.AmbientLight | null = null;

  // cached HUD values
  private _lastScoreHtml = "";
  private _lastTimerText = "";

  // particles
  private _dustParticles!: THREE.Points;
  private _dustPositions!: Float32Array;
  private _dustVelocities!: Float32Array;
  private _dustLife!: Float32Array;

  // effects
  private _shakeIntensity = 0;
  private _titleCamAngle = 0;

  // spark particles (tackles)
  private _sparkParticles!: THREE.Points;
  private _sparkPositions!: Float32Array;
  private _sparkVelocities!: Float32Array;
  private _sparkLife!: Float32Array;

  // confetti (goals)
  private _confettiParticles!: THREE.Points;
  private _confettiPositions!: Float32Array;
  private _confettiVelocities!: Float32Array;
  private _confettiLife!: Float32Array;
  private _confettiColors!: Float32Array;

  // tournament & settings
  private _difficulty: DifficultyKey = "medium";
  private _tournamentMode = false;
  private _selectedDifficulty = 1;
  private _selectedMode = 0; // 0=quick match, 1=tournament
  private _selectedTeamSize = 0; // 0=2v2, 1=3v3
  private _selectedMap = 0; // 0=stone arena, 1=frozen lake, 2=volcanic pit
  private _teamSize = 2;

  // power-up HUD indicator
  private _powerUpIndicator: HTMLDivElement | null = null;
  // half indicator
  private _halfDiv: HTMLDivElement | null = null;
  // sky
  private _skyMesh: THREE.Mesh | null = null;
  // corner flags
  private _cornerFlags: THREE.Mesh[] = [];
  // net deformation
  private _goalNetDeform: [number, number] = [0, 0];
  // flame meshes for animation
  private _flameMeshes: THREE.Mesh[] = [];
  // volumetric light cones
  private _lightCones: THREE.Mesh[] = [];
  // ambient floating motes
  private _motesParticles!: THREE.Points;
  private _motesPositions!: Float32Array;
  private _motesVelocities!: Float32Array;
  // crowd heads mesh
  private _crowdHeadsMesh: THREE.InstancedMesh | null = null;
  // knight shadow blobs
  private _knightShadows: THREE.Mesh[] = [];
  // player highlight ring
  private _playerRing: THREE.Mesh | null = null;
  // charge ground ring
  private _chargeRing: THREE.Mesh | null = null;
  // shockwave rings (reusable pool)
  private _shockwaves: Array<{ mesh: THREE.Mesh; life: number }> = [];
  // post-processing
  private _composer!: EffectComposer;
  private _bloomPass!: UnrealBloomPass;
  private _vignettePass!: ShaderPass;
  private _chromaticPass!: ShaderPass;
  private _chromaticTarget = 0;
  // hit freeze
  private _hitFreezeFrames = 0;
  // kick direction arrow
  private _kickArrow: THREE.Mesh | null = null;
  // possession bar
  private _possBarInner: HTMLDivElement | null = null;
  // goal log
  private _goalLog: Array<{ team: Team; time: number; quality: string }> = [];
  // speed line particles
  private _speedLineParticles!: THREE.Points;
  private _speedLinePositions!: Float32Array;
  private _speedLineLife!: Float32Array;
  // fire particles (above torches)
  private _fireParticles!: THREE.Points;
  private _firePositions!: Float32Array;
  private _fireVelocities!: Float32Array;
  private _fireLife!: Float32Array;
  private _fireSources: Array<[number, number]> = []; // torch positions
  // ground mist
  private _mistPlanes: THREE.Mesh[] = [];

  // ambient
  private _ambientNoiseNode: AudioBufferSourceNode | null = null;

  // audio
  private _audioCtx: AudioContext | null = null;

  // ── boot / destroy ─────────────────────────────────────────────────────

  async boot(): Promise<void> {
    viewManager.clearWorld();
    this._initRenderer();
    this._initScene();
    this._initInput();
    this._initHUD();
    this._initMatchState();
    this._screen = GameScreen.TITLE;
    this._showOverlay("title");

    this._tickerCb = (t) => this._update(t.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb as any);
  }

  destroy(): void {
    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb as any);
      this._tickerCb = null;
    }
    if (this._keyDownHandler) {
      window.removeEventListener("keydown", this._keyDownHandler);
      this._keyDownHandler = null;
    }
    if (this._keyUpHandler) {
      window.removeEventListener("keyup", this._keyUpHandler);
      this._keyUpHandler = null;
    }
    if (this._hudDiv) { this._hudDiv.remove(); this._hudDiv = null; }
    if (this._canvas?.parentNode) this._canvas.parentNode.removeChild(this._canvas);
    if (this._composer) this._composer.dispose();
    if (this._renderer) this._renderer.dispose();
    if (this._ambientNoiseNode) { try { this._ambientNoiseNode.stop(); } catch {} this._ambientNoiseNode = null; }
    if (this._audioCtx) { this._audioCtx.close(); this._audioCtx = null; }

    const pixiCanvas = viewManager.app.canvas as HTMLElement;
    pixiCanvas.style.zIndex = "";
    pixiCanvas.style.pointerEvents = "";
    viewManager.app.renderer.background.color = 0x1a1a2e;
    viewManager.app.renderer.background.alpha = 1;
  }

  // ── audio ──────────────────────────────────────────────────────────────

  private _ensureAudio(): AudioContext {
    if (!this._audioCtx) this._audioCtx = new AudioContext();
    if (this._audioCtx.state === "suspended") this._audioCtx.resume();
    return this._audioCtx;
  }

  private _playSound(type: "kick" | "tackle" | "goal" | "whistle" | "bounce" | "stun" | "crowd" | "charge_release" | "ping" | "step"): void {
    try {
      const ctx = this._ensureAudio();
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);

      if (type === "kick" || type === "charge_release") {
        const power = type === "charge_release" ? 0.5 : 0.3;
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(type === "charge_release" ? 150 : 100, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain.gain.setValueAtTime(power, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.2);
        // noise burst
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() - 0.5) * 0.4;
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.25, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        noise.connect(ng).connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.08);
      } else if (type === "tackle") {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === "stun") {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === "goal") {
        // triumphant chord C-E-G
        for (const freq of [262, 330, 392]) {
          const o = ctx.createOscillator();
          o.type = "sine";
          o.frequency.value = freq;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.15, now + 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          o.connect(g).connect(ctx.destination);
          o.start(now);
          o.stop(now + 0.8);
        }
        // crowd roar (filtered noise)
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() - 0.5) * 0.5;
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 600;
        filter.Q.value = 1.5;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0, now);
        ng.gain.linearRampToValueAtTime(0.35, now + 0.15);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        noise.connect(filter).connect(ng).connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.8);
      } else if (type === "whistle") {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(900, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === "bounce") {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() - 0.5) * 0.2;
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        noise.connect(gain);
        noise.start(now);
        noise.stop(now + 0.05);
      } else if (type === "ping") {
        // metallic ring for post/crossbar hits
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.5);
        // harmonic overtone
        const osc2 = ctx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(2400, now);
        osc2.frequency.exponentialRampToValueAtTime(1600, now + 0.3);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.08, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc2.connect(g2).connect(ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.3);
      } else if (type === "step") {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() - 0.5) * 0.1;
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        noise.connect(gain);
        noise.start(now);
        noise.stop(now + 0.04);
      } else if (type === "crowd") {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() - 0.5) * 0.3;
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 500;
        filter.Q.value = 1;
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        noise.connect(filter).connect(gain);
        noise.start(now);
        noise.stop(now + 0.5);
      }
    } catch { /* audio not available */ }
  }

  // ── renderer ───────────────────────────────────────────────────────────

  private _initRenderer(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this._canvas = document.createElement("canvas");
    this._canvas.id = "knightball-canvas";
    Object.assign(this._canvas.style, {
      position: "absolute", top: "0", left: "0",
      width: "100%", height: "100%", zIndex: "10",
    });
    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._canvas);

    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas, antialias: true, alpha: false,
      powerPreference: "high-performance",
    });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.1;

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x0d0d1a);
    this._scene.fog = new THREE.FogExp2(0x0d0d1a, 0.018);

    this._camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 120);
    this._camera.position.set(0, CAM_HEIGHT, CAM_DIST);
    this._camera.lookAt(0, 0, 0);

    // post-processing pipeline
    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(new RenderPass(this._scene, this._camera));
    this._bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.4, 0.6, 0.85);
    this._composer.addPass(this._bloomPass);
    this._vignettePass = new ShaderPass(VignetteShader);
    this._vignettePass.uniforms["darkness"].value = 1.3;
    this._vignettePass.uniforms["offset"].value = 1.0;
    this._composer.addPass(this._vignettePass);
    this._chromaticPass = new ShaderPass(ChromaticAberrationShader);
    this._composer.addPass(this._chromaticPass);
    this._composer.addPass(new OutputPass());

    const pixiCanvas = viewManager.app.canvas as HTMLElement;
    pixiCanvas.style.position = "absolute";
    pixiCanvas.style.top = "0";
    pixiCanvas.style.left = "0";
    pixiCanvas.style.zIndex = "20";
    pixiCanvas.style.pointerEvents = "none";
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

  // ── scene build ────────────────────────────────────────────────────────

  private _initScene(): void {
    this._ambientLight = new THREE.AmbientLight(0x334455, 0.5);
    this._scene.add(this._ambientLight);
    const hemi = new THREE.HemisphereLight(0xffd8a8, 0x223344, 0.6);
    this._scene.add(hemi);

    this._dirLight = new THREE.DirectionalLight(0xccddff, 0.8);
    const dir = this._dirLight;
    dir.position.set(8, 20, 12);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 60;
    dir.shadow.camera.left = -20;
    dir.shadow.camera.right = 20;
    dir.shadow.camera.top = 15;
    dir.shadow.camera.bottom = -15;
    this._scene.add(dir);

    // Map theme colors
    const mapThemes = [
      { // Stone Arena (default)
        floorBase: "#5a5545", slabRange: [75, 95], pitchA: "#4e6232", pitchB: "#456028",
        fogColor: 0x1a1a2e, ambientColor: 0x334455, dirColor: 0xffeedd, bgColor: 0x1a1a2e,
        wallColor: 0x665544,
      },
      { // Frozen Lake
        floorBase: "#7788aa", slabRange: [130, 160], pitchA: "#88aacc", pitchB: "#7799bb",
        fogColor: 0x2a3a5a, ambientColor: 0x6688aa, dirColor: 0xccddff, bgColor: 0x2a3a5a,
        wallColor: 0x6688aa,
      },
      { // Volcanic Pit
        floorBase: "#3a2a1a", slabRange: [45, 70], pitchA: "#4a3020", pitchB: "#3a2818",
        fogColor: 0x1a0a05, ambientColor: 0x553322, dirColor: 0xff8844, bgColor: 0x1a0a05,
        wallColor: 0x553322,
      },
    ];
    const theme = mapThemes[this._selectedMap] || mapThemes[0];

    // Apply map theme to scene
    this._scene.background = new THREE.Color(theme.bgColor);
    this._scene.fog = new THREE.FogExp2(theme.fogColor, 0.015);

    // floor with stone surround texture
    const floorCanvas = document.createElement("canvas");
    floorCanvas.width = 256; floorCanvas.height = 256;
    const fctx = floorCanvas.getContext("2d")!;
    fctx.fillStyle = theme.floorBase;
    fctx.fillRect(0, 0, 256, 256);
    // stone slab pattern
    for (let sr = 0; sr < 8; sr++) {
      for (let sc = 0; sc < 8; sc++) {
        const sx2 = sc * 32 + (sr % 2) * 16;
        const sy2 = sr * 32;
        const shade = theme.slabRange[0] + Math.floor(Math.random() * (theme.slabRange[1] - theme.slabRange[0]));
        const tint = this._selectedMap === 1 ? `rgb(${shade - 10},${shade},${shade + 10})` :
          this._selectedMap === 2 ? `rgb(${shade},${shade - 15},${shade - 25})` :
          `rgb(${shade},${shade - 5},${shade - 10})`;
        fctx.fillStyle = tint;
        fctx.fillRect(sx2 + 1, sy2 + 1, 30, 30);
        fctx.strokeStyle = `rgba(40,35,30,0.3)`;
        fctx.lineWidth = 1;
        if (Math.random() > 0.6) {
          fctx.beginPath();
          fctx.moveTo(sx2 + Math.random() * 30, sy2 + Math.random() * 30);
          fctx.lineTo(sx2 + Math.random() * 30, sy2 + Math.random() * 30);
          fctx.stroke();
        }
        // Frozen: ice cracks / Volcanic: lava veins
        if (this._selectedMap === 1 && Math.random() > 0.7) {
          fctx.strokeStyle = "rgba(200,220,255,0.15)";
          fctx.beginPath(); fctx.moveTo(sx2, sy2 + 15); fctx.lineTo(sx2 + 30, sy2 + 15 + (Math.random() - 0.5) * 10); fctx.stroke();
        }
        if (this._selectedMap === 2 && Math.random() > 0.8) {
          fctx.strokeStyle = "rgba(255,100,20,0.2)";
          fctx.lineWidth = 2;
          fctx.beginPath(); fctx.moveTo(sx2 + Math.random() * 30, sy2); fctx.lineTo(sx2 + Math.random() * 30, sy2 + 30); fctx.stroke();
        }
      }
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.wrapS = THREE.RepeatWrapping; floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(5, 3);
    const floorGeo = new THREE.PlaneGeometry(ARENA_W + 8, ARENA_H + 8);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.92, metalness: 0.05 });
    this._floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this._floorMesh.rotation.x = -Math.PI / 2;
    this._floorMesh.receiveShadow = true;
    this._scene.add(this._floorMesh);

    // pitch (with procedural grass texture)
    const grassCanvas = document.createElement("canvas");
    grassCanvas.width = 512; grassCanvas.height = 512;
    const gctx = grassCanvas.getContext("2d")!;
    // base color with mowing stripes (themed)
    for (let row = 0; row < 512; row++) {
      const stripe = Math.floor(row / 32) % 2 === 0;
      gctx.fillStyle = stripe ? theme.pitchA : theme.pitchB;
      gctx.fillRect(0, row, 512, 1);
    }
    // scattered grass detail
    for (let i = 0; i < 3000; i++) {
      const gx = Math.random() * 512, gy = Math.random() * 512;
      const shade = 60 + Math.floor(Math.random() * 40);
      gctx.fillStyle = `rgb(${shade - 10},${shade + 20},${shade - 30})`;
      gctx.fillRect(gx, gy, 1 + Math.random() * 2, 1);
    }
    const grassTex = new THREE.CanvasTexture(grassCanvas);
    grassTex.wrapS = THREE.RepeatWrapping; grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(4, 3);
    const lineGeo = new THREE.PlaneGeometry(ARENA_W, ARENA_H);
    const lineMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.92, metalness: 0 });
    this._lineMesh = new THREE.Mesh(lineGeo, lineMat);
    this._lineMesh.rotation.x = -Math.PI / 2;
    this._lineMesh.position.y = 0.005;
    this._scene.add(this._lineMesh);

    // center circle & dot
    const circleMat = new THREE.MeshBasicMaterial({ color: 0xccccaa, side: THREE.DoubleSide });
    const circle = new THREE.Mesh(new THREE.RingGeometry(2.8, 3.0, 48), circleMat);
    circle.rotation.x = -Math.PI / 2; circle.position.y = 0.01;
    this._scene.add(circle);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), circleMat);
    dot.rotation.x = -Math.PI / 2; dot.position.y = 0.012;
    this._scene.add(dot);

    // halfway line
    const halfLine = new THREE.Mesh(new THREE.PlaneGeometry(0.12, ARENA_H), circleMat);
    halfLine.rotation.x = -Math.PI / 2; halfLine.position.y = 0.01;
    this._scene.add(halfLine);

    // pitch lines
    this._drawLine(-ARENA_W / 2, -ARENA_H / 2, ARENA_W / 2, -ARENA_H / 2);
    this._drawLine(-ARENA_W / 2, ARENA_H / 2, ARENA_W / 2, ARENA_H / 2);
    this._drawLine(-ARENA_W / 2, -ARENA_H / 2, -ARENA_W / 2, ARENA_H / 2);
    this._drawLine(ARENA_W / 2, -ARENA_H / 2, ARENA_W / 2, ARENA_H / 2);

    // penalty areas
    for (const sx of [-1, 1]) {
      const bx = sx * ARENA_W / 2;
      this._drawLine(bx, -GOAL_WIDTH - 1, bx + sx * -5, -GOAL_WIDTH - 1);
      this._drawLine(bx + sx * -5, -GOAL_WIDTH - 1, bx + sx * -5, GOAL_WIDTH + 1);
      this._drawLine(bx, GOAL_WIDTH + 1, bx + sx * -5, GOAL_WIDTH + 1);
    }

    // ball shadow
    const shadowGeo = new THREE.CircleGeometry(BALL_RADIUS * 0.9, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false });
    this._ballShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this._ballShadow.rotation.x = -Math.PI / 2;
    this._ballShadow.position.y = 0.02;
    this._scene.add(this._ballShadow);

    // knight shadow blobs (one per max team size * 2 teams)
    for (let i = 0; i < 6; i++) {
      const ksGeo = new THREE.CircleGeometry(KNIGHT_RADIUS * 0.8, 12);
      const ksMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false });
      const ks = new THREE.Mesh(ksGeo, ksMat);
      ks.rotation.x = -Math.PI / 2;
      ks.position.y = 0.015;
      ks.visible = false;
      this._scene.add(ks);
      this._knightShadows.push(ks);
    }

    // player highlight ring
    const ringGeo = new THREE.RingGeometry(0.7, 0.85, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
    this._playerRing = new THREE.Mesh(ringGeo, ringMat);
    this._playerRing.rotation.x = -Math.PI / 2;
    this._playerRing.position.y = 0.02;
    this._scene.add(this._playerRing);

    // charge ground ring (grows while charging)
    const chargeRingGeo = new THREE.RingGeometry(0.5, 0.6, 32);
    const chargeRingMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    this._chargeRing = new THREE.Mesh(chargeRingGeo, chargeRingMat);
    this._chargeRing.rotation.x = -Math.PI / 2;
    this._chargeRing.position.y = 0.025;
    this._scene.add(this._chargeRing);

    // shockwave ring pool (3 reusable)
    for (let i = 0; i < 3; i++) {
      const swGeo = new THREE.RingGeometry(0.3, 0.5, 24);
      const swMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
      const sw = new THREE.Mesh(swGeo, swMat);
      sw.rotation.x = -Math.PI / 2;
      sw.position.y = 0.03;
      sw.visible = false;
      this._scene.add(sw);
      this._shockwaves.push({ mesh: sw, life: 0 });
    }

    // wall decorations (shields and crossed swords between torches)
    const wallDecoMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.4, metalness: 0.6 });
    for (const zSide of [-1, 1]) {
      const wz = zSide * (ARENA_H / 2 + 0.05);
      for (let wx = -ARENA_W / 2 + 3; wx <= ARENA_W / 2 - 3; wx += 5) {
        // wall shield
        const ws = new THREE.Mesh(new THREE.CircleGeometry(0.4, 6), wallDecoMat);
        ws.position.set(wx, WALL_HEIGHT * 0.6, wz);
        ws.rotation.y = zSide > 0 ? Math.PI : 0;
        this._scene.add(ws);
        // crossed swords behind shield
        for (const angle of [-0.4, 0.4]) {
          const sword = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.0, 0.01),
            new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.8 }));
          sword.position.set(wx, WALL_HEIGHT * 0.6, wz + zSide * -0.02);
          sword.rotation.z = angle;
          this._scene.add(sword);
        }
      }
    }

    // kick direction arrow (hidden by default)
    const arrowGeo = new THREE.ConeGeometry(0.2, 1.5, 10);
    arrowGeo.rotateX(Math.PI / 2);
    this._kickArrow = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({
      color: 0xffdd44, transparent: true, opacity: 0.6, depthWrite: false,
    }));
    this._kickArrow.visible = false;
    this._kickArrow.position.y = 0.15;
    this._scene.add(this._kickArrow);

    // sky dome
    const skyGeo = new THREE.SphereGeometry(55, 32, 16);
    const skyCanvas = document.createElement("canvas");
    skyCanvas.width = 256; skyCanvas.height = 256;
    const sctx = skyCanvas.getContext("2d")!;
    const grad = sctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#0a0a1e");
    grad.addColorStop(0.4, "#111128");
    grad.addColorStop(0.7, "#1a1a30");
    grad.addColorStop(1, "#0d0d1a");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 256, 256);
    // stars
    for (let i = 0; i < 200; i++) {
      const sx = Math.random() * 256, sy = Math.random() * 180;
      const bright = 150 + Math.floor(Math.random() * 105);
      sctx.fillStyle = `rgba(${bright},${bright},${bright + 20},${0.3 + Math.random() * 0.7})`;
      sctx.fillRect(sx, sy, Math.random() > 0.8 ? 2 : 1, 1);
    }
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    this._skyMesh = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide }));
    this._scene.add(this._skyMesh);

    // corner flags
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xffdd44, side: THREE.DoubleSide });
    for (const cx of [-ARENA_W / 2, ARENA_W / 2]) {
      for (const cz of [-ARENA_H / 2, ARENA_H / 2]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 10),
          new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5, metalness: 0.3 }));
        pole.position.set(cx, 0.75, cz);
        this._scene.add(pole);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), flagMat);
        flag.position.set(cx + 0.2, 1.4, cz);
        this._scene.add(flag);
        this._cornerFlags.push(flag);
      }
    }

    this._buildWalls();
    this._buildGoals();
    this._buildTorches();
    this._buildBanners();
    this._buildCrowd();
    this._buildMapDecorations();
    this._buildDustParticles();
    this._buildSparkParticles();
    this._buildConfettiParticles();
    this._buildAmbientMotes();
    this._buildSpeedLines();
    this._buildFireParticles();
    this._buildGroundMist();
    this._buildStadiumDetails();
    this._buildGrassBlades();
    this._buildRoyalBox();
  }

  private _drawLine(x1: number, z1: number, x2: number, z2: number): void {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    const geo = new THREE.PlaneGeometry(len, 0.1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xccccaa, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = Math.atan2(dz, dx);
    m.position.set((x1 + x2) / 2, 0.011, (z1 + z2) / 2);
    this._scene.add(m);
  }

  private _buildWalls(): void {
    // procedural stone brick texture
    const wallCanvas = document.createElement("canvas");
    wallCanvas.width = 256; wallCanvas.height = 128;
    const wctx = wallCanvas.getContext("2d")!;
    wctx.fillStyle = "#6a6a5e";
    wctx.fillRect(0, 0, 256, 128);
    // draw brick rows
    const brickH = 16;
    for (let row = 0; row < 8; row++) {
      const offset = row % 2 === 0 ? 0 : 32;
      for (let col = -1; col < 5; col++) {
        const bx = col * 64 + offset;
        const by = row * brickH;
        // mortar lines
        wctx.strokeStyle = "#4a4a3e";
        wctx.lineWidth = 2;
        wctx.strokeRect(bx + 1, by + 1, 62, brickH - 2);
        // brick color variation
        const shade = 90 + Math.floor(Math.random() * 30);
        wctx.fillStyle = `rgb(${shade},${shade - 5},${shade - 15})`;
        wctx.fillRect(bx + 2, by + 2, 60, brickH - 4);
        // noise detail
        for (let n = 0; n < 8; n++) {
          const nx = bx + 2 + Math.random() * 58, ny = by + 2 + Math.random() * (brickH - 4);
          const nShade = shade + Math.floor((Math.random() - 0.5) * 20);
          wctx.fillStyle = `rgb(${nShade},${nShade - 5},${nShade - 15})`;
          wctx.fillRect(nx, ny, 2 + Math.random() * 3, 1 + Math.random() * 2);
        }
      }
    }
    const wallTex = new THREE.CanvasTexture(wallCanvas);
    wallTex.wrapS = THREE.RepeatWrapping; wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(6, 2);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85, metalness: 0.1 });

    for (const side of [-1, 1]) {
      const geo = new THREE.BoxGeometry(ARENA_W + 4, WALL_HEIGHT, 2);
      const wall = new THREE.Mesh(geo, wallMat);
      wall.position.set(0, WALL_HEIGHT / 2, side * (ARENA_H / 2 + 1));
      wall.castShadow = true; wall.receiveShadow = true;
      this._scene.add(wall); this._wallMeshes.push(wall);

      // crenellations (battlements)
      const crenMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8, metalness: 0.12 });
      for (let cx = -ARENA_W / 2; cx <= ARENA_W / 2; cx += 2.5) {
        const cren = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 2.2), crenMat);
        cren.position.set(cx, WALL_HEIGHT + 0.4, side * (ARENA_H / 2 + 1));
        cren.castShadow = true;
        this._scene.add(cren);
      }
    }
    for (const side of [-1, 1]) {
      const sideLen = (ARENA_H - GOAL_WIDTH * 2) / 2;
      for (const gz of [-1, 1]) {
        const geo = new THREE.BoxGeometry(2, WALL_HEIGHT, sideLen);
        const wall = new THREE.Mesh(geo, wallMat);
        wall.position.set(side * (ARENA_W / 2 + 1), WALL_HEIGHT / 2, gz * (GOAL_WIDTH + sideLen / 2));
        wall.castShadow = true; wall.receiveShadow = true;
        this._scene.add(wall); this._wallMeshes.push(wall);
      }
    }
  }

  private _buildGoals(): void {
    for (const side of [-1, 1]) {
      const group = new THREE.Group();
      const goalX = side * (ARENA_W / 2);
      const netColor = side === -1 ? 0x4488ff : 0xff4444;
      const netMat = new THREE.MeshStandardMaterial({
        color: netColor, transparent: true, opacity: 0.25, side: THREE.DoubleSide, roughness: 1, metalness: 0,
      });
      // proper grid net: horizontal + vertical lines on sides
      const cordMat = new THREE.MeshBasicMaterial({ color: netColor, transparent: true, opacity: 0.4 });
      // side net grid lines (vertical wires)
      for (let gz = -GOAL_WIDTH; gz <= GOAL_WIDTH; gz += 0.5) {
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, GOAL_HEIGHT, 8), cordMat);
        wire.position.set(goalX + side * GOAL_DEPTH, GOAL_HEIGHT / 2, gz);
        group.add(wire);
      }
      // side net grid lines (horizontal wires on back)
      for (let gy = 0.5; gy <= GOAL_HEIGHT; gy += 0.5) {
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, GOAL_WIDTH * 2, 8), cordMat);
        wire.rotation.x = Math.PI / 2;
        wire.position.set(goalX + side * GOAL_DEPTH, gy, 0);
        group.add(wire);
      }
      // depth wires (connecting goal line to back)
      for (let gz = -GOAL_WIDTH; gz <= GOAL_WIDTH; gz += 1) {
        for (let gy = 0; gy <= GOAL_HEIGHT; gy += 1) {
          const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, GOAL_DEPTH, 8), cordMat);
          wire.rotation.z = Math.PI / 2;
          wire.position.set(goalX + side * GOAL_DEPTH / 2, gy, gz);
          group.add(wire);
        }
      }
      // translucent back panel
      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_WIDTH * 2, GOAL_HEIGHT), netMat);
      backWall.position.set(goalX + side * GOAL_DEPTH, GOAL_HEIGHT / 2, 0);
      backWall.rotation.y = side === -1 ? -Math.PI / 2 : Math.PI / 2;
      group.add(backWall);

      const postMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3, metalness: 0.7 });
      for (const pz of [-GOAL_WIDTH, GOAL_WIDTH]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, GOAL_HEIGHT, 8), postMat);
        post.position.set(goalX, GOAL_HEIGHT / 2, pz);
        post.castShadow = true;
        group.add(post);
      }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, GOAL_WIDTH * 2, 8), postMat);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(goalX, GOAL_HEIGHT, 0);
      bar.castShadow = true;
      group.add(bar);

      this._scene.add(group);
      this._goalMeshes.push(group);
    }
  }

  private _buildTorches(): void {
    const torchPositions = [
      [-ARENA_W / 2 - 1.5, ARENA_H / 2 + 1.5], [ARENA_W / 2 + 1.5, ARENA_H / 2 + 1.5],
      [-ARENA_W / 2 - 1.5, -ARENA_H / 2 - 1.5], [ARENA_W / 2 + 1.5, -ARENA_H / 2 - 1.5],
      [0, ARENA_H / 2 + 1.5], [0, -ARENA_H / 2 - 1.5],
      [-ARENA_W / 4, ARENA_H / 2 + 1.5], [ARENA_W / 4, ARENA_H / 2 + 1.5],
      [-ARENA_W / 4, -ARENA_H / 2 - 1.5], [ARENA_W / 4, -ARENA_H / 2 - 1.5],
    ];
    for (const [tx, tz] of torchPositions) {
      // pole with bracket
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, WALL_HEIGHT + 1, 12), poleMat);
      pole.position.set(tx, (WALL_HEIGHT + 1) / 2, tz);
      this._scene.add(pole);
      // brazier bowl at top
      const brazierMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.8 });
      const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.15, 0.2, 8), brazierMat);
      brazier.position.set(tx, WALL_HEIGHT + 0.85, tz);
      this._scene.add(brazier);
      // brazier rim
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 10, 8), brazierMat);
      rim.position.set(tx, WALL_HEIGHT + 0.95, tz);
      rim.rotation.x = Math.PI / 2;
      this._scene.add(rim);
      // embers in brazier (small emissive sphere)
      const embers = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 1.5, roughness: 1, metalness: 0 }));
      embers.position.set(tx, WALL_HEIGHT + 0.9, tz);
      this._scene.add(embers);

      // multi-layer flame (3 overlapping cones for fire shape)
      const flameColors = [0xff4400, 0xff6600, 0xffaa22];
      for (let fi = 0; fi < 3; fi++) {
        const fgeo = new THREE.ConeGeometry(0.12 + fi * 0.04, 0.35 - fi * 0.06, 10);
        const fmat = new THREE.MeshStandardMaterial({
          color: flameColors[fi], emissive: flameColors[fi],
          emissiveIntensity: 2.5 - fi * 0.5, transparent: true, opacity: 0.8 - fi * 0.15,
          roughness: 1, metalness: 0, side: THREE.DoubleSide,
        });
        const flame = new THREE.Mesh(fgeo, fmat);
        flame.position.set(tx + fi * 0.02, WALL_HEIGHT + 1.15 + fi * 0.05, tz);
        this._scene.add(flame);
        this._flameMeshes.push(flame);
      }

      // volumetric light cone (transparent downward cone)
      const coneGeo = new THREE.ConeGeometry(2.5, 5, 12, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xff8833, transparent: true, opacity: 0.04,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(tx, WALL_HEIGHT - 1, tz);
      cone.rotation.x = Math.PI; // point downward
      this._scene.add(cone);
      this._lightCones.push(cone);

      // point light
      const light = new THREE.PointLight(0xff8833, 2.5, 18, 1.5);
      light.position.set(tx, WALL_HEIGHT + 1.5, tz);
      this._scene.add(light);
      this._torchLights.push(light);
    }
  }

  private _buildBanners(): void {
    const bannerMat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, side: THREE.DoubleSide });
    const positions = [
      { x: -ARENA_W / 2 - 1.5, z: 0, color: 0x2244aa }, { x: ARENA_W / 2 + 1.5, z: 0, color: 0xaa2222 },
      { x: -ARENA_W / 4, z: ARENA_H / 2 + 1.8, color: 0x2244aa }, { x: ARENA_W / 4, z: ARENA_H / 2 + 1.8, color: 0xaa2222 },
      { x: -ARENA_W / 4, z: -ARENA_H / 2 - 1.8, color: 0x2244aa }, { x: ARENA_W / 4, z: -ARENA_H / 2 - 1.8, color: 0xaa2222 },
    ];
    for (const p of positions) {
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.5), bannerMat(p.color));
      banner.position.set(p.x, WALL_HEIGHT + 2, p.z);
      this._scene.add(banner); this._bannerMeshes.push(banner);
      const shield = new THREE.Mesh(new THREE.CircleGeometry(0.3, 6),
        new THREE.MeshStandardMaterial({ color: 0xddcc88, roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide }));
      shield.position.set(p.x, WALL_HEIGHT + 2.3, p.z + 0.01);
      this._scene.add(shield);
    }
  }

  private _buildCrowd(): void {
    const count = 400;
    // Larger, rounder bodies
    const crowdGeo = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.22, 0.28, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.8 }),
      count
    );
    const dummy = new THREE.Object3D();
    let idx = 0;
    const blueColors = [0x3355aa, 0x4466bb, 0x2244aa, 0x5577cc, 0x336699, 0x4488dd, 0x224488, 0x5599ee, 0x2255bb, 0x3366cc];
    const redColors = [0xaa3333, 0xbb4444, 0xaa2222, 0xcc5555, 0x993333, 0xdd4444, 0x882222, 0xee5555, 0xbb2233, 0xcc3344];
    this._crowdBaseMatrices = [];

    // More rows, denser packing, both sides + ends
    for (const zSide of [-1, 1]) {
      for (let row = 0; row < 4; row++) {
        const perRow = 40;
        for (let i = 0; i < perRow && idx < count; i++) {
          const x = -ARENA_W / 2 - 1 + i * ((ARENA_W + 2) / perRow) + (Math.random() - 0.5) * 0.3;
          const z = zSide * (ARENA_H / 2 + 2.0 + row * 0.7);
          const y = WALL_HEIGHT + 0.3 + row * 0.75;
          dummy.position.set(x, y, z);
          dummy.scale.set(0.85 + Math.random() * 0.3, 0.7 + Math.random() * 0.6, 0.85 + Math.random() * 0.3);
          dummy.updateMatrix();
          crowdGeo.setMatrixAt(idx, dummy.matrix);
          this._crowdBaseMatrices.push(dummy.matrix.clone());
          const isBlueSection = x < 0;
          const sectionColors = isBlueSection ? blueColors : redColors;
          crowdGeo.setColorAt(idx, new THREE.Color(sectionColors[idx % sectionColors.length]));
          idx++;
        }
      }
    }
    // Behind goals (shorter sections)
    for (const xSide of [-1, 1]) {
      for (let row = 0; row < 3; row++) {
        const perRow = 12;
        for (let i = 0; i < perRow && idx < count; i++) {
          const z = -ARENA_H / 2 + 1 + i * ((ARENA_H - 2) / perRow) + (Math.random() - 0.5) * 0.3;
          const x = xSide * (ARENA_W / 2 + 2.0 + row * 0.7);
          const y = WALL_HEIGHT + 0.3 + row * 0.75;
          dummy.position.set(x, y, z);
          dummy.scale.set(0.85 + Math.random() * 0.3, 0.7 + Math.random() * 0.6, 0.85 + Math.random() * 0.3);
          dummy.updateMatrix();
          crowdGeo.setMatrixAt(idx, dummy.matrix);
          this._crowdBaseMatrices.push(dummy.matrix.clone());
          const sectionColors = xSide < 0 ? blueColors : redColors;
          crowdGeo.setColorAt(idx, new THREE.Color(sectionColors[idx % sectionColors.length]));
          idx++;
        }
      }
    }
    (crowdGeo as any).instanceColor!.needsUpdate = true;
    crowdGeo.instanceMatrix.needsUpdate = true;
    crowdGeo.castShadow = true;
    this._scene.add(crowdGeo);
    this._crowdMesh = crowdGeo;

    // Crowd heads — larger, skin-toned
    const skinColors = [0xffcc99, 0xeebb88, 0xddaa77, 0xccaa88, 0xddbb99, 0xeeccaa];
    const headMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.2, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xccaa88, roughness: 0.7 }),
      idx
    );
    const headDummy = new THREE.Object3D();
    for (let i = 0; i < this._crowdBaseMatrices.length; i++) {
      headDummy.matrix.copy(this._crowdBaseMatrices[i]);
      headDummy.matrix.decompose(headDummy.position, headDummy.quaternion, headDummy.scale);
      headDummy.position.y += 0.55;
      headDummy.scale.set(1, 1, 1);
      headDummy.updateMatrix();
      headMesh.setMatrixAt(i, headDummy.matrix);
      headMesh.setColorAt(i, new THREE.Color(skinColors[i % skinColors.length]));
    }
    headMesh.instanceMatrix.needsUpdate = true;
    (headMesh as any).instanceColor!.needsUpdate = true;
    this._scene.add(headMesh);
    this._crowdHeadsMesh = headMesh;

    // Crowd arms (raised for excitement) — separate instanced mesh
    const armMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.06, 0.05, 0.5, 4),
      new THREE.MeshStandardMaterial({ color: 0xccaa88, roughness: 0.8 }),
      Math.min(idx, 200) // arms for front rows only
    );
    const armDummy = new THREE.Object3D();
    for (let i = 0; i < Math.min(this._crowdBaseMatrices.length, 200); i++) {
      armDummy.matrix.copy(this._crowdBaseMatrices[i]);
      armDummy.matrix.decompose(armDummy.position, armDummy.quaternion, armDummy.scale);
      armDummy.position.y += 0.7;
      armDummy.position.x += (Math.random() - 0.5) * 0.2;
      armDummy.scale.set(1, 1, 1);
      armDummy.rotation.z = (Math.random() - 0.5) * 0.8;
      armDummy.updateMatrix();
      armMesh.setMatrixAt(i, armDummy.matrix);
      armMesh.setColorAt(i, new THREE.Color(skinColors[i % skinColors.length]));
    }
    armMesh.instanceMatrix.needsUpdate = true;
    (armMesh as any).instanceColor!.needsUpdate = true;
    this._scene.add(armMesh);
  }

  private _buildMapDecorations(): void {
    if (this._selectedMap === 1) {
      // Frozen Lake: ice pillars, snowdrifts, frozen crystals
      const iceMat = new THREE.MeshStandardMaterial({ color: 0x88bbdd, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.7 });
      const snowMat = new THREE.MeshStandardMaterial({ color: 0xddeeff, roughness: 0.9 });
      // Ice pillars around the arena
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const r = Math.max(ARENA_W, ARENA_H) / 2 + 6;
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 3 + Math.random() * 2, 6), iceMat);
        pillar.position.set(Math.cos(angle) * r, WALL_HEIGHT + 1.5, Math.sin(angle) * r);
        this._scene.add(pillar);
        // Icicles hanging from pillar
        for (let ic = 0; ic < 3; ic++) {
          const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4 + Math.random() * 0.3, 4), iceMat);
          icicle.position.set(pillar.position.x + (Math.random() - 0.5) * 0.4, pillar.position.y + 1.5, pillar.position.z + (Math.random() - 0.5) * 0.4);
          icicle.rotation.x = Math.PI;
          this._scene.add(icicle);
        }
      }
      // Snowdrifts along walls
      for (let sd = 0; sd < 12; sd++) {
        const sx = (Math.random() - 0.5) * (ARENA_W + 4);
        const sz = (Math.random() > 0.5 ? 1 : -1) * (ARENA_H / 2 + 1.5);
        const drift = new THREE.Mesh(new THREE.SphereGeometry(0.5 + Math.random() * 0.8, 8, 6), snowMat);
        drift.scale.set(1 + Math.random(), 0.3, 1 + Math.random() * 0.5);
        drift.position.set(sx, WALL_HEIGHT * 0.5, sz);
        this._scene.add(drift);
      }
      // Frost mist (ground fog)
      const mistMat = new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false });
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_W + 2, ARENA_H + 2), mistMat);
      mist.rotation.x = -Math.PI / 2;
      mist.position.y = 0.15;
      this._scene.add(mist);
    } else if (this._selectedMap === 2) {
      // Volcanic Pit: lava pools, ember particles, obsidian rocks
      const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8, roughness: 0.3 });
      const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.6 });
      // Lava pools outside arena
      for (let lp = 0; lp < 8; lp++) {
        const angle = (lp / 8) * Math.PI * 2 + 0.3;
        const r = Math.max(ARENA_W, ARENA_H) / 2 + 5 + Math.random() * 3;
        const pool = new THREE.Mesh(new THREE.CircleGeometry(0.8 + Math.random() * 1.2, 12), lavaMat);
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(Math.cos(angle) * r, 0.05, Math.sin(angle) * r);
        this._scene.add(pool);
        // Lava glow light
        const lavaLight = new THREE.PointLight(0xff4400, 0.5, 5);
        lavaLight.position.set(pool.position.x, 0.5, pool.position.z);
        this._scene.add(lavaLight);
      }
      // Obsidian spikes
      for (let os = 0; os < 10; os++) {
        const angle = (os / 10) * Math.PI * 2;
        const r = Math.max(ARENA_W, ARENA_H) / 2 + 4 + Math.random() * 6;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.3 + Math.random() * 0.3, 1.5 + Math.random() * 2, 5), obsidianMat);
        spike.position.set(Math.cos(angle) * r, WALL_HEIGHT * 0.5 + Math.random(), Math.sin(angle) * r);
        spike.rotation.set(Math.random() * 0.2, Math.random(), Math.random() * 0.2);
        this._scene.add(spike);
      }
      // Smoke/heat haze (subtle overlay)
      const smokeMat = new THREE.MeshBasicMaterial({ color: 0x331100, transparent: true, opacity: 0.03, side: THREE.DoubleSide, depthWrite: false });
      const smoke = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_W + 6, ARENA_H + 6), smokeMat);
      smoke.rotation.x = -Math.PI / 2;
      smoke.position.y = 1.5;
      this._scene.add(smoke);
    }
  }

  private _buildDustParticles(): void {
    const count = 150;
    this._dustPositions = new Float32Array(count * 3);
    this._dustVelocities = new Float32Array(count * 3);
    this._dustLife = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this._dustPositions[i * 3 + 1] = -10; // hidden
      this._dustLife[i] = 0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._dustPositions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xccbb99, size: 0.15, transparent: true, opacity: 0.4, depthWrite: false });
    this._dustParticles = new THREE.Points(geo, mat);
    this._scene.add(this._dustParticles);
  }

  private _buildSparkParticles(): void {
    const count = 80;
    this._sparkPositions = new Float32Array(count * 3);
    this._sparkVelocities = new Float32Array(count * 3);
    this._sparkLife = new Float32Array(count);
    for (let i = 0; i < count; i++) this._sparkPositions[i * 3 + 1] = -10;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._sparkPositions, 3));
    this._sparkParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffdd44, size: 0.12, transparent: true, opacity: 0.9, depthWrite: false,
    }));
    this._scene.add(this._sparkParticles);
  }

  private _buildConfettiParticles(): void {
    const count = 200;
    this._confettiPositions = new Float32Array(count * 3);
    this._confettiVelocities = new Float32Array(count * 3);
    this._confettiLife = new Float32Array(count);
    this._confettiColors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) this._confettiPositions[i * 3 + 1] = -10;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._confettiPositions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this._confettiColors, 3));
    this._confettiParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.18, transparent: true, opacity: 0.8, depthWrite: false, vertexColors: true,
    }));
    this._scene.add(this._confettiParticles);
  }

  private _buildAmbientMotes(): void {
    const count = 80;
    this._motesPositions = new Float32Array(count * 3);
    this._motesVelocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this._motesPositions[i * 3] = (Math.random() - 0.5) * ARENA_W * 1.2;
      this._motesPositions[i * 3 + 1] = 1 + Math.random() * 6;
      this._motesPositions[i * 3 + 2] = (Math.random() - 0.5) * ARENA_H * 1.2;
      this._motesVelocities[i * 3] = (Math.random() - 0.5) * 0.3;
      this._motesVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      this._motesVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._motesPositions, 3));
    this._motesParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffddaa, size: 0.08, transparent: true, opacity: 0.35, depthWrite: false,
    }));
    this._scene.add(this._motesParticles);
  }

  private _updateMotes(): void {
    for (let i = 0; i < this._motesPositions.length / 3; i++) {
      this._motesPositions[i * 3] += this._motesVelocities[i * 3] * SIM_DT;
      this._motesPositions[i * 3 + 1] += this._motesVelocities[i * 3 + 1] * SIM_DT;
      this._motesPositions[i * 3 + 2] += this._motesVelocities[i * 3 + 2] * SIM_DT;
      // gentle drift change
      this._motesVelocities[i * 3] += (Math.random() - 0.5) * 0.02;
      this._motesVelocities[i * 3 + 1] += (Math.random() - 0.5) * 0.01;
      this._motesVelocities[i * 3 + 2] += (Math.random() - 0.5) * 0.02;
      // clamp velocity
      this._motesVelocities[i * 3] = clamp(this._motesVelocities[i * 3], -0.5, 0.5);
      this._motesVelocities[i * 3 + 1] = clamp(this._motesVelocities[i * 3 + 1], -0.15, 0.15);
      // wrap around arena
      if (Math.abs(this._motesPositions[i * 3]) > ARENA_W) this._motesPositions[i * 3] *= -0.9;
      if (this._motesPositions[i * 3 + 1] < 0.5) this._motesPositions[i * 3 + 1] = 6;
      if (this._motesPositions[i * 3 + 1] > 8) this._motesPositions[i * 3 + 1] = 1;
    }
    (this._motesParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private _buildSpeedLines(): void {
    const count = 40;
    this._speedLinePositions = new Float32Array(count * 3);
    this._speedLineLife = new Float32Array(count);
    for (let i = 0; i < count; i++) this._speedLinePositions[i * 3 + 1] = -10;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._speedLinePositions, 3));
    this._speedLineParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.06, transparent: true, opacity: 0.5, depthWrite: false,
    }));
    this._scene.add(this._speedLineParticles);
  }

  private _buildFireParticles(): void {
    const count = 120;
    this._firePositions = new Float32Array(count * 3);
    this._fireVelocities = new Float32Array(count * 3);
    this._fireLife = new Float32Array(count);
    for (let i = 0; i < count; i++) { this._firePositions[i * 3 + 1] = -20; this._fireLife[i] = 0; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._firePositions, 3));
    this._fireParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xff6622, size: 0.12, transparent: true, opacity: 0.7, depthWrite: false,
    }));
    this._scene.add(this._fireParticles);
    // store torch source positions
    const tp = [
      [-ARENA_W / 2 - 1.5, ARENA_H / 2 + 1.5], [ARENA_W / 2 + 1.5, ARENA_H / 2 + 1.5],
      [-ARENA_W / 2 - 1.5, -ARENA_H / 2 - 1.5], [ARENA_W / 2 + 1.5, -ARENA_H / 2 - 1.5],
      [0, ARENA_H / 2 + 1.5], [0, -ARENA_H / 2 - 1.5],
      [-ARENA_W / 4, ARENA_H / 2 + 1.5], [ARENA_W / 4, ARENA_H / 2 + 1.5],
      [-ARENA_W / 4, -ARENA_H / 2 - 1.5], [ARENA_W / 4, -ARENA_H / 2 - 1.5],
    ];
    this._fireSources = tp.map(p => [p[0], p[1]] as [number, number]);
  }

  private _updateFireParticles(): void {
    // spawn new fire particles from torch sources
    for (let i = 0; i < this._fireLife.length; i++) {
      if (this._fireLife[i] > 0) {
        this._fireLife[i]--;
        this._firePositions[i * 3] += this._fireVelocities[i * 3] * SIM_DT;
        this._firePositions[i * 3 + 1] += this._fireVelocities[i * 3 + 1] * SIM_DT;
        this._firePositions[i * 3 + 2] += this._fireVelocities[i * 3 + 2] * SIM_DT;
        this._fireVelocities[i * 3] *= 0.98;
      } else {
        // respawn at a random torch
        const src = this._fireSources[Math.floor(Math.random() * this._fireSources.length)];
        this._firePositions[i * 3] = src[0] + (Math.random() - 0.5) * 0.2;
        this._firePositions[i * 3 + 1] = WALL_HEIGHT + 1.1;
        this._firePositions[i * 3 + 2] = src[1] + (Math.random() - 0.5) * 0.2;
        this._fireVelocities[i * 3] = (Math.random() - 0.5) * 1.5;
        this._fireVelocities[i * 3 + 1] = 1 + Math.random() * 2;
        this._fireVelocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
        this._fireLife[i] = 15 + Math.random() * 25;
      }
    }
    (this._fireParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private _buildGroundMist(): void {
    // semi-transparent ground-hugging fog planes at pitch edges
    const mistMat = new THREE.MeshBasicMaterial({
      color: 0x889988, transparent: true, opacity: 0.06,
      side: THREE.DoubleSide, depthWrite: false,
    });
    for (let i = 0; i < 6; i++) {
      const w = 4 + Math.random() * 8;
      const h = 3 + Math.random() * 5;
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mistMat.clone());
      mist.rotation.x = -Math.PI / 2;
      mist.position.set(
        (Math.random() - 0.5) * ARENA_W * 0.8,
        0.15 + Math.random() * 0.2,
        (Math.random() - 0.5) * ARENA_H * 0.8
      );
      this._scene.add(mist);
      this._mistPlanes.push(mist);
    }
  }

  private _buildStadiumDetails(): void {
    // stone archway entrances at midfield sides
    const archMat = new THREE.MeshStandardMaterial({ color: 0x6a6a5e, roughness: 0.8, metalness: 0.15 });
    for (const zSide of [-1, 1]) {
      const archZ = zSide * (ARENA_H / 2 + 1);
      // two pillars
      for (const xOff of [-1.8, 1.8]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, WALL_HEIGHT + 1.5, 8), archMat);
        pillar.position.set(xOff, (WALL_HEIGHT + 1.5) / 2, archZ);
        pillar.castShadow = true;
        this._scene.add(pillar);
      }
      // arch top (half torus)
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(1.8, 0.2, 12, 12, Math.PI),
        archMat
      );
      arch.position.set(0, WALL_HEIGHT + 1.5, archZ);
      arch.rotation.x = Math.PI / 2;
      arch.rotation.z = Math.PI / 2;
      this._scene.add(arch);
      // banner above arch
      const archBanner = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xddcc88, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide }));
      archBanner.position.set(0, WALL_HEIGHT + 2.5, archZ);
      this._scene.add(archBanner);
    }

    // penalty spot dots
    for (const sx of [-1, 1]) {
      const spotX = sx * (ARENA_W / 2 - 4);
      const spotDot = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12),
        new THREE.MeshBasicMaterial({ color: 0xccccaa, side: THREE.DoubleSide }));
      spotDot.rotation.x = -Math.PI / 2;
      spotDot.position.set(spotX, 0.013, 0);
      this._scene.add(spotDot);
    }

    // goal area glow rings (subtle emissive rings around each goal)
    for (const sx of [-1, 1]) {
      const gx = sx * (ARENA_W / 2);
      const ring = new THREE.Mesh(new THREE.RingGeometry(GOAL_WIDTH + 0.5, GOAL_WIDTH + 0.8, 32, 1, 0, Math.PI),
        new THREE.MeshBasicMaterial({
          color: sx === -1 ? 0x2244aa : 0xaa2222,
          transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false,
        }));
      ring.rotation.x = -Math.PI / 2;
      ring.rotation.z = sx === -1 ? -Math.PI / 2 : Math.PI / 2;
      ring.position.set(gx, 0.015, 0);
      this._scene.add(ring);
    }
  }

  private _buildGrassBlades(): void {
    // instanced grass blades along pitch edges (decorative 3D grass)
    const bladeCount = 300;
    const bladeGeo = new THREE.PlaneGeometry(0.06, 0.25);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x5a7a2a, roughness: 0.9, metalness: 0,
      side: THREE.DoubleSide, transparent: true, opacity: 0.8,
    });
    const blades = new THREE.InstancedMesh(bladeGeo, bladeMat, bladeCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < bladeCount; i++) {
      // place along pitch boundary
      const edge = Math.random();
      let gx: number, gz: number;
      if (edge < 0.25) { gx = -ARENA_W / 2 + Math.random() * ARENA_W; gz = -ARENA_H / 2 - Math.random() * 0.5; }
      else if (edge < 0.5) { gx = -ARENA_W / 2 + Math.random() * ARENA_W; gz = ARENA_H / 2 + Math.random() * 0.5; }
      else if (edge < 0.75) { gx = -ARENA_W / 2 - Math.random() * 0.5; gz = -ARENA_H / 2 + Math.random() * ARENA_H; }
      else { gx = ARENA_W / 2 + Math.random() * 0.5; gz = -ARENA_H / 2 + Math.random() * ARENA_H; }
      dummy.position.set(gx, 0.12, gz);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.scale.set(0.6 + Math.random() * 0.8, 0.5 + Math.random(), 1);
      dummy.updateMatrix();
      blades.setMatrixAt(i, dummy.matrix);
      const shade = 0.3 + Math.random() * 0.3;
      blades.setColorAt(i, new THREE.Color(shade * 0.6, shade, shade * 0.3));
    }
    blades.instanceMatrix.needsUpdate = true;
    (blades as any).instanceColor!.needsUpdate = true;
    this._scene.add(blades);
  }

  private _buildRoyalBox(): void {
    // royal viewing box: special section at center of one long wall
    const boxZ = -(ARENA_H / 2 + 1);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.5, metalness: 0.4 });

    // elevated platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 2), boxMat);
    platform.position.set(0, WALL_HEIGHT + 0.5, boxZ);
    this._scene.add(platform);

    // gold railing posts
    const railMat = new THREE.MeshStandardMaterial({ color: 0xddaa22, roughness: 0.3, metalness: 0.7 });
    for (const rx of [-2.8, -1.4, 0, 1.4, 2.8]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 12), railMat);
      post.position.set(rx, WALL_HEIGHT + 1, boxZ + 0.9);
      this._scene.add(post);
    }
    // gold railing bar
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 5.6, 12), railMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, WALL_HEIGHT + 1.4, boxZ + 0.9);
    this._scene.add(rail);

    // royal canopy (red cloth)
    const canopy = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x881122, roughness: 0.8, metalness: 0.05, side: THREE.DoubleSide }));
    canopy.position.set(0, WALL_HEIGHT + 2.5, boxZ);
    canopy.rotation.x = -0.1;
    this._scene.add(canopy);

    // royal crown emblem
    const crownGeo = new THREE.OctahedronGeometry(0.2, 0);
    const crown = new THREE.Mesh(crownGeo, new THREE.MeshStandardMaterial({
      color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.7 }));
    crown.position.set(0, WALL_HEIGHT + 3.0, boxZ + 0.5);
    this._scene.add(crown);

    // bench dugouts (wooden benches on each end)
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85, metalness: 0.05 });
    for (const sx of [-1, 1]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 0.5), benchMat);
      bench.position.set(sx * (ARENA_W / 2 + 1), 0.5, 0);
      this._scene.add(bench);
      // bench legs
      for (const lx of [-1.3, 1.3]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.4), benchMat);
        leg.position.set(sx * (ARENA_W / 2 + 1) + lx, 0.25, 0);
        this._scene.add(leg);
      }
    }
  }

  private _spawnSparks(x: number, y: number, z: number, count: number): void {
    let spawned = 0;
    for (let i = 0; i < this._sparkLife.length && spawned < count; i++) {
      if (this._sparkLife[i] <= 0) {
        this._sparkPositions[i * 3] = x; this._sparkPositions[i * 3 + 1] = y; this._sparkPositions[i * 3 + 2] = z;
        this._sparkVelocities[i * 3] = (Math.random() - 0.5) * 8;
        this._sparkVelocities[i * 3 + 1] = Math.random() * 6 + 2;
        this._sparkVelocities[i * 3 + 2] = (Math.random() - 0.5) * 8;
        this._sparkLife[i] = 15 + Math.random() * 15;
        spawned++;
      }
    }
  }

  private _spawnConfetti(x: number, z: number, team: Team): void {
    const colors = team === Team.BLUE
      ? [[0.3,0.5,1],[0.5,0.7,1],[1,1,1],[0.2,0.4,0.9]]
      : [[1,0.3,0.3],[1,0.5,0.3],[1,1,0.3],[0.9,0.2,0.2]];
    let spawned = 0;
    for (let i = 0; i < this._confettiLife.length && spawned < 80; i++) {
      if (this._confettiLife[i] <= 0) {
        this._confettiPositions[i * 3] = x + (Math.random() - 0.5) * 4;
        this._confettiPositions[i * 3 + 1] = 3 + Math.random() * 2;
        this._confettiPositions[i * 3 + 2] = z + (Math.random() - 0.5) * 4;
        this._confettiVelocities[i * 3] = (Math.random() - 0.5) * 4;
        this._confettiVelocities[i * 3 + 1] = Math.random() * 3 + 2;
        this._confettiVelocities[i * 3 + 2] = (Math.random() - 0.5) * 4;
        const c = colors[Math.floor(Math.random() * colors.length)];
        this._confettiColors[i * 3] = c[0]; this._confettiColors[i * 3 + 1] = c[1]; this._confettiColors[i * 3 + 2] = c[2];
        this._confettiLife[i] = 60 + Math.random() * 90;
        spawned++;
      }
    }
    (this._confettiParticles.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  private _spawnShockwave(x: number, z: number, color: number = 0xffffff): void {
    for (const sw of this._shockwaves) {
      if (sw.life <= 0) {
        sw.mesh.position.set(x, 0.03, z);
        sw.mesh.scale.set(1, 1, 1);
        sw.mesh.visible = true;
        (sw.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
        (sw.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
        sw.life = 20;
        return;
      }
    }
  }

  private _updateShockwaves(): void {
    for (const sw of this._shockwaves) {
      if (sw.life > 0) {
        sw.life--;
        const t = 1 - sw.life / 20;
        const scale = 1 + t * 6; // expand to 7x
        sw.mesh.scale.set(scale, scale, 1);
        (sw.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
        if (sw.life <= 0) sw.mesh.visible = false;
      }
    }
  }

  private _updateSparks(): void {
    for (let i = 0; i < this._sparkLife.length; i++) {
      if (this._sparkLife[i] > 0) {
        this._sparkLife[i]--;
        this._sparkPositions[i * 3] += this._sparkVelocities[i * 3] * SIM_DT;
        this._sparkPositions[i * 3 + 1] += this._sparkVelocities[i * 3 + 1] * SIM_DT;
        this._sparkPositions[i * 3 + 2] += this._sparkVelocities[i * 3 + 2] * SIM_DT;
        this._sparkVelocities[i * 3 + 1] -= 15 * SIM_DT;
      } else {
        this._sparkPositions[i * 3 + 1] = -10;
      }
    }
    (this._sparkParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private _updateConfetti(): void {
    for (let i = 0; i < this._confettiLife.length; i++) {
      if (this._confettiLife[i] > 0) {
        this._confettiLife[i]--;
        this._confettiPositions[i * 3] += this._confettiVelocities[i * 3] * SIM_DT;
        this._confettiPositions[i * 3 + 1] += this._confettiVelocities[i * 3 + 1] * SIM_DT;
        this._confettiPositions[i * 3 + 2] += this._confettiVelocities[i * 3 + 2] * SIM_DT;
        this._confettiVelocities[i * 3 + 1] -= 3 * SIM_DT;
        // flutter
        this._confettiVelocities[i * 3] += (Math.random() - 0.5) * 0.5;
      } else {
        this._confettiPositions[i * 3 + 1] = -10;
      }
    }
    (this._confettiParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  // ── input ──────────────────────────────────────────────────────────────

  private _initInput(): void {
    this._keys = {};
    this._keyDownHandler = (e) => {
      this._keys[e.code] = true;
      if (e.code === "Escape") this._handleEscape();
      if (e.code === "Space") {
        e.preventDefault();
        if (this._screen === GameScreen.TITLE) {
          this._difficulty = (["easy", "medium", "hard"] as const)[this._selectedDifficulty];
          this._tournamentMode = this._selectedMode === 1;
          this._teamSize = this._selectedTeamSize === 0 ? 2 : 3;
          this._rebuildTeams();
          this._screen = GameScreen.PLAYING;
          this._startMatch();
          this._hideOverlay();
        } else if (this._screen === GameScreen.RESULT) {
          if (this._tournamentMode && this._state.tournamentRound < 3 &&
              this._state.tournamentScore[0] < 2 && this._state.tournamentScore[1] < 2) {
            // next tournament round
            this._screen = GameScreen.PLAYING;
            this._state.tournamentRound++;
            this._startMatch();
            this._hideOverlay();
          } else {
            // back to title
            this._screen = GameScreen.TITLE;
            this._state.tournamentRound = 0;
            this._state.tournamentScore = [0, 0];
            this._showOverlay("title");
          }
        }
      }
      if ((e.code === "ArrowLeft" || e.code === "KeyA") && this._screen === GameScreen.TITLE) {
        this._selectedDifficulty = Math.max(0, this._selectedDifficulty - 1);
        this._showOverlay("title");
      }
      if ((e.code === "ArrowRight" || e.code === "KeyD") && this._screen === GameScreen.TITLE) {
        this._selectedDifficulty = Math.min(2, this._selectedDifficulty + 1);
        this._showOverlay("title");
      }
      if ((e.code === "ArrowUp" || e.code === "KeyW") && this._screen === GameScreen.TITLE) {
        // cycle: mode (0=quick,1=tournament) -> team size (0=2v2,1=3v3)
        this._selectedMode = (this._selectedMode + 1) % 2;
        this._showOverlay("title");
      }
      if ((e.code === "ArrowDown" || e.code === "KeyS") && this._screen === GameScreen.TITLE) {
        this._selectedTeamSize = (this._selectedTeamSize + 1) % 2;
        this._showOverlay("title");
      }
      if (e.code === "KeyM" && this._screen === GameScreen.TITLE) {
        this._selectedMap = (this._selectedMap + 1) % 3;
        this._showOverlay("title");
      }
      if (e.code === "KeyQ" && this._screen === GameScreen.PAUSED) {
        this.destroy();
        window.dispatchEvent(new Event("knightBallExit"));
      }
      if (e.code === "KeyR" && this._screen === GameScreen.PLAYING) {
        this._startMatch();
      }
      if (e.code === "Tab" && this._screen === GameScreen.PLAYING) {
        e.preventDefault();
        this._switchPlayer();
      }
    };
    this._keyUpHandler = (e) => { this._keys[e.code] = false; };
    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
  }

  private _handleEscape(): void {
    if (this._screen === GameScreen.PLAYING) {
      this._screen = GameScreen.PAUSED;
      this._showOverlay("pause");
    } else if (this._screen === GameScreen.PAUSED) {
      this._screen = GameScreen.PLAYING;
      this._hideOverlay();
    } else if (this._screen === GameScreen.RESULT || this._screen === GameScreen.TITLE) {
      this.destroy();
      window.dispatchEvent(new Event("knightBallExit"));
    }
  }

  private _switchPlayer(): void {
    if (!this._state || this._teamSize < 2) return;
    const blueKnights = this._state.knights.filter(k => k.team === Team.BLUE);
    const currentIdx = blueKnights.findIndex(k => k.isPlayer);
    if (currentIdx < 0) return;
    // find nearest blue knight to ball that isn't the current player
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < blueKnights.length; i++) {
      if (i === currentIdx) continue;
      const d = dist(blueKnights[i].x, blueKnights[i].z, this._state.ball.x, this._state.ball.z);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    if (bestIdx >= 0) {
      blueKnights[currentIdx].isPlayer = false;
      blueKnights[bestIdx].isPlayer = true;
      // rebuild meshes to update labels
      this._buildKnightMeshes();
      this._showCommentary("Player switched!");
    }
  }

  // ── HUD ────────────────────────────────────────────────────────────────

  private _initHUD(): void {
    this._hudDiv = document.createElement("div");
    Object.assign(this._hudDiv.style, {
      position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
      pointerEvents: "none", zIndex: "25", fontFamily: "'Georgia', serif",
    });
    document.body.appendChild(this._hudDiv);

    // score
    this._scoreDiv = document.createElement("div");
    Object.assign(this._scoreDiv.style, {
      position: "absolute", top: "14px", left: "50%", transform: "translateX(-50%)",
      display: "flex", gap: "12px", alignItems: "center",
      fontSize: "42px", fontWeight: "bold", textShadow: "0 2px 8px rgba(0,0,0,0.8)",
    });
    this._hudDiv.appendChild(this._scoreDiv);

    // timer
    this._timerDiv = document.createElement("div");
    Object.assign(this._timerDiv.style, {
      position: "absolute", top: "64px", left: "50%", transform: "translateX(-50%)",
      color: "#ccccaa", fontSize: "20px", textShadow: "0 1px 4px rgba(0,0,0,0.7)",
    });
    this._hudDiv.appendChild(this._timerDiv);

    // phase announcements
    this._phaseDiv = document.createElement("div");
    Object.assign(this._phaseDiv.style, {
      position: "absolute", top: "38%", left: "50%", transform: "translate(-50%,-50%)",
      color: "#ffd866", fontSize: "56px", fontWeight: "bold",
      textShadow: "0 3px 16px rgba(0,0,0,0.9), 0 0 40px rgba(255,200,50,0.3)",
      opacity: "0", transition: "opacity 0.3s, transform 0.3s",
    });
    this._hudDiv.appendChild(this._phaseDiv);

    // controls hint
    this._controlsDiv = document.createElement("div");
    Object.assign(this._controlsDiv.style, {
      position: "absolute", bottom: "14px", left: "50%", transform: "translateX(-50%)",
      color: "#999", fontSize: "12px", textShadow: "0 1px 3px rgba(0,0,0,0.7)",
      background: "rgba(0,0,0,0.35)", padding: "5px 14px", borderRadius: "6px",
    });
    this._controlsDiv.textContent = "WASD Move | SPACE Charge | Q Pass (Shift+Q Through) | F Bash | E Tackle | Tab Switch | R Restart";
    this._hudDiv.appendChild(this._controlsDiv);

    // stamina bar
    const staminaContainer = document.createElement("div");
    Object.assign(staminaContainer.style, {
      position: "absolute", bottom: "50px", left: "50%", transform: "translateX(-50%)",
      width: "140px", height: "6px", background: "rgba(0,0,0,0.5)", borderRadius: "3px", overflow: "hidden",
    });
    this._staminaBar = document.createElement("div");
    Object.assign(this._staminaBar.style, {
      width: "100%", height: "100%", background: "linear-gradient(90deg, #ffaa00, #ffdd44)",
      borderRadius: "3px", transition: "width 0.1s",
    });
    staminaContainer.appendChild(this._staminaBar);
    this._hudDiv.appendChild(staminaContainer);

    // charge bar
    this._chargeContainer = document.createElement("div");
    Object.assign(this._chargeContainer.style, {
      position: "absolute", bottom: "62px", left: "50%", transform: "translateX(-50%)",
      width: "140px", height: "8px", background: "rgba(0,0,0,0.5)", borderRadius: "4px", overflow: "hidden",
      opacity: "0", transition: "opacity 0.15s",
    });
    this._chargeBar = document.createElement("div");
    Object.assign(this._chargeBar.style, {
      width: "0%", height: "100%", borderRadius: "4px",
      background: "linear-gradient(90deg, #44aaff, #ff4444)",
      transition: "width 0.05s",
    });
    this._chargeContainer.appendChild(this._chargeBar);
    this._hudDiv.appendChild(this._chargeContainer);

    // flash overlay for goal impacts
    this._flashDiv = document.createElement("div");
    Object.assign(this._flashDiv.style, {
      position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
      background: "white", opacity: "0", pointerEvents: "none",
      transition: "opacity 0.1s",
    });
    this._hudDiv.appendChild(this._flashDiv);

    // overlay for title/pause/result
    this._overlayDiv = document.createElement("div");
    Object.assign(this._overlayDiv.style, {
      position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", opacity: "0", transition: "opacity 0.3s",
      pointerEvents: "none", zIndex: "30",
    });
    this._hudDiv.appendChild(this._overlayDiv);

    // commentary feed
    this._commentaryDiv = document.createElement("div");
    Object.assign(this._commentaryDiv.style, {
      position: "absolute", top: "94px", left: "50%", transform: "translateX(-50%)",
      color: "#eee", fontSize: "14px", fontStyle: "italic",
      textShadow: "0 1px 4px rgba(0,0,0,0.8)",
      opacity: "0", transition: "opacity 0.3s",
      whiteSpace: "nowrap",
    });
    this._hudDiv.appendChild(this._commentaryDiv);

    // possession bar
    const possContainer = document.createElement("div");
    Object.assign(possContainer.style, {
      position: "absolute", top: "106px", left: "50%", transform: "translateX(-50%)",
      width: "120px", height: "4px", background: "rgba(255,80,80,0.4)",
      borderRadius: "2px", overflow: "hidden",
    });
    this._possBarInner = document.createElement("div");
    Object.assign(this._possBarInner.style, {
      width: "50%", height: "100%", background: "rgba(80,140,255,0.6)",
      borderRadius: "2px", transition: "width 0.5s",
    });
    possContainer.appendChild(this._possBarInner);
    this._hudDiv.appendChild(possContainer);
    // half indicator
    this._halfDiv = document.createElement("div");
    Object.assign(this._halfDiv.style, {
      position: "absolute", top: "88px", left: "50%", transform: "translateX(-50%)",
      color: "#777", fontSize: "11px", textShadow: "0 1px 3px rgba(0,0,0,0.6)",
    });
    this._hudDiv.appendChild(this._halfDiv);

    // power-up indicator
    this._powerUpIndicator = document.createElement("div");
    Object.assign(this._powerUpIndicator.style, {
      position: "absolute", bottom: "76px", left: "50%", transform: "translateX(-50%)",
      fontSize: "13px", fontWeight: "bold", textShadow: "0 1px 4px rgba(0,0,0,0.8)",
      opacity: "0", transition: "opacity 0.2s",
    });
    this._hudDiv.appendChild(this._powerUpIndicator);

    // minimap
    this._minimapCanvas = document.createElement("canvas");
    this._minimapCanvas.width = 140;
    this._minimapCanvas.height = 90;
    Object.assign(this._minimapCanvas.style, {
      position: "absolute", bottom: "14px", right: "14px",
      width: "140px", height: "90px", borderRadius: "6px",
      border: "1px solid rgba(255,255,255,0.15)",
      background: "rgba(0,0,0,0.4)",
    });
    this._minimapCtx = this._minimapCanvas.getContext("2d");
    this._hudDiv.appendChild(this._minimapCanvas);
  }

  private _showOverlay(mode: "title" | "pause" | "result"): void {
    if (!this._overlayDiv) return;
    let html = "";
    if (mode === "title") {
      const diffs = ["SQUIRE", "KNIGHT", "CHAMPION"];
      const diffColors = ["#44cc44", "#ffaa00", "#ff4444"];
      const modes = ["QUICK MATCH", "TOURNAMENT (Best of 3)"];
      html = `
        <div style="font-size:64px;font-weight:bold;color:#ffd866;text-shadow:0 4px 20px rgba(255,200,50,0.4);margin-bottom:4px;letter-spacing:4px">KNIGHT BALL</div>
        <div style="font-size:18px;color:#ccccaa;margin-bottom:24px">Medieval Arena Sport</div>
        <div style="display:flex;gap:40px;margin-bottom:20px">
          <div style="text-align:center">
            <div style="font-size:28px;color:#6699ff;font-weight:bold">BLUE</div>
            <div style="font-size:12px;color:#888">You + AI</div>
          </div>
          <div style="font-size:28px;color:#666;font-weight:bold;line-height:28px">VS</div>
          <div style="text-align:center">
            <div style="font-size:28px;color:#ff5555;font-weight:bold">RED</div>
            <div style="font-size:12px;color:#888">AI Team</div>
          </div>
        </div>
        <div style="display:flex;gap:30px;margin-bottom:12px">
          <div style="text-align:center">
            <div style="font-size:12px;color:#888;margin-bottom:4px">W — MODE</div>
            <div style="font-size:16px;color:#ffd866;font-weight:bold">${modes[this._selectedMode]}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:12px;color:#888;margin-bottom:4px">S — TEAM SIZE</div>
            <div style="font-size:16px;color:#ffd866;font-weight:bold">${this._selectedTeamSize === 0 ? "2 vs 2" : "3 vs 3"}</div>
          </div>
        </div>
        <div style="margin-bottom:20px;text-align:center">
          <div style="font-size:12px;color:#888;margin-bottom:4px">A/D — DIFFICULTY</div>
          <div style="display:flex;gap:16px;justify-content:center">
            ${diffs.map((d, i) => `<span style="font-size:${i === this._selectedDifficulty ? 20 : 14}px;color:${i === this._selectedDifficulty ? diffColors[i] : '#555'};font-weight:${i === this._selectedDifficulty ? 'bold' : 'normal'};transition:all 0.2s">${d}</span>`).join("")}
          </div>
        </div>
        <div style="margin-bottom:14px;text-align:center">
          <div style="font-size:12px;color:#888;margin-bottom:4px">M — MAP</div>
          <div style="display:flex;gap:16px;justify-content:center">
            ${["Stone Arena", "Frozen Lake", "Volcanic Pit"].map((m, i) => `<span style="font-size:${i === this._selectedMap ? 16 : 12}px;color:${i === this._selectedMap ? (i === 0 ? '#aabb88' : i === 1 ? '#88ccff' : '#ff8844') : '#555'};font-weight:${i === this._selectedMap ? 'bold' : 'normal'};transition:all 0.2s">${m}</span>`).join("")}
          </div>
        </div>
        <div style="font-size:12px;color:#aaa;margin-bottom:20px">
          SPACE Charge &nbsp;|&nbsp; Q Pass &nbsp;|&nbsp; F Bash &nbsp;|&nbsp; E Tackle &nbsp;|&nbsp; Tab Switch &nbsp;|&nbsp; SHIFT Sprint
        </div>
        <div style="font-size:20px;color:#ffd866;animation:pulse 1.5s infinite">Press SPACE to Start</div>
        <div style="font-size:12px;color:#666;margin-top:10px">ESC to Quit</div>
        ${(() => {
          const c = this._getCareerStats();
          return c.matches > 0 ? `<div style="margin-top:14px;font-size:11px;color:#666;display:flex;gap:12px"><span>Record: ${c.wins}W-${c.losses}L-${c.draws}D</span><span>Goals: ${c.goalsFor}-${c.goalsAgainst}</span>${c.tournamentWins > 0 ? `<span>Trophies: ${c.tournamentWins}</span>` : ""}</div>` : "";
        })()}
        <style>@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }</style>
      `;
    } else if (mode === "pause") {
      html = `
        <div style="font-size:42px;font-weight:bold;color:#ffd866;margin-bottom:16px;letter-spacing:4px;text-shadow:0 2px 10px rgba(255,216,102,0.3)">PAUSED</div>
        <div style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,216,102,0.2);border-radius:8px;padding:16px 24px;margin-bottom:16px;max-width:420px;text-align:left">
          <div style="font-size:14px;color:#ffd866;font-weight:bold;margin-bottom:8px;letter-spacing:1px">KNIGHT BALL</div>
          <div style="font-size:12px;color:#aaa;line-height:1.6;margin-bottom:12px">
            2v2 medieval arena sport. Smash the leather ball into the opponent's goal
            using kicks, tackles and shield bashes in a torch-lit stone arena.
            First to 5 goals wins — or highest score when time runs out.
          </div>
          <div style="font-size:13px;color:#ffd866;font-weight:bold;margin-bottom:6px;letter-spacing:1px">CONTROLS</div>
          <div style="font-size:12px;color:#bbb;line-height:1.8;display:grid;grid-template-columns:auto 1fr;gap:2px 12px">
            <span style="color:#ffd866;font-weight:bold">WASD</span><span>Move</span>
            <span style="color:#ffd866;font-weight:bold">SPACE</span><span>Charge kick (hold longer = harder)</span>
            <span style="color:#ffd866;font-weight:bold">SHIFT</span><span>Sprint</span>
            <span style="color:#ffd866;font-weight:bold">E</span><span>Tackle opponent</span>
            <span style="color:#ffd866;font-weight:bold">F</span><span>Shield bash</span>
            <span style="color:#ffd866;font-weight:bold">Q</span><span>Pass to teammate</span>
            <span style="color:#ffd866;font-weight:bold">TAB</span><span>Switch controlled knight</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:center">
          <button onclick="document.dispatchEvent(new Event('pauseResume'))" style="padding:10px 40px;font-size:16px;font-weight:bold;background:linear-gradient(180deg,#886622,#554411);color:#ffd866;border:2px solid #aa8833;border-radius:6px;cursor:pointer;letter-spacing:2px;pointer-events:auto">RESUME</button>
          <button onclick="document.dispatchEvent(new Event('pauseQuit'))" style="padding:8px 32px;font-size:13px;background:none;color:#888;border:1px solid #555;border-radius:4px;cursor:pointer;pointer-events:auto">RETURN TO MENU</button>
        </div>
      `;
    } else if (mode === "result") {
      const s = this._state;
      const winner = s.score[0] > s.score[1] ? "BLUE WINS!" : s.score[1] > s.score[0] ? "RED WINS!" : "DRAW!";
      const winColor = s.score[0] > s.score[1] ? "#6699ff" : s.score[1] > s.score[0] ? "#ff5555" : "#ffd866";
      const totalPoss = s.stats.possession[0] + s.stats.possession[1] || 1;
      const possPct0 = Math.round((s.stats.possession[0] / totalPoss) * 100);
      const possPct1 = 100 - possPct0;
      const isTournament = this._tournamentMode;
      const tRound = s.tournamentRound;
      const tScore = s.tournamentScore;
      const tournamentOver = isTournament && (tScore[0] >= 2 || tScore[1] >= 2 || tRound >= 3);
      const tournamentWinner = tScore[0] > tScore[1] ? "BLUE" : tScore[1] > tScore[0] ? "RED" : null;
      const nextLabel = isTournament && !tournamentOver ? "Press SPACE for Next Match" : isTournament && tournamentOver ? "Press SPACE for Title Screen" : "Press SPACE to Play Again";
      html = `
        <div style="font-size:48px;font-weight:bold;color:${winColor};text-shadow:0 4px 20px rgba(0,0,0,0.5);margin-bottom:10px">${winner}</div>
        <div style="font-size:56px;font-weight:bold;margin-bottom:16px">
          <span style="color:#6699ff">${s.score[0]}</span>
          <span style="color:#666;font-size:28px;margin:0 10px">—</span>
          <span style="color:#ff5555">${s.score[1]}</span>
        </div>
        ${isTournament ? `<div style="font-size:16px;color:#ccc;margin-bottom:12px">Tournament: <span style="color:#6699ff">${tScore[0]}</span> — <span style="color:#ff5555">${tScore[1]}</span> (Round ${tRound}/3)${tournamentOver && tournamentWinner ? ` &nbsp; <span style="color:${tournamentWinner === 'BLUE' ? '#6699ff' : '#ff5555'};font-weight:bold">${tournamentWinner} WINS TOURNAMENT!</span>` : ""}</div>` : ""}
        <div style="display:flex;gap:24px;margin-bottom:12px;font-size:13px;color:#aaa">
          <div style="text-align:center"><div style="color:#888;margin-bottom:2px">POSSESSION</div><span style="color:#6699ff">${possPct0}%</span> — <span style="color:#ff5555">${possPct1}%</span></div>
          <div style="text-align:center"><div style="color:#888;margin-bottom:2px">SHOTS</div><span style="color:#6699ff">${s.stats.shotsOnGoal[0]}</span> — <span style="color:#ff5555">${s.stats.shotsOnGoal[1]}</span></div>
          <div style="text-align:center"><div style="color:#888;margin-bottom:2px">TACKLES</div><span style="color:#6699ff">${s.stats.tackles[0]}</span> — <span style="color:#ff5555">${s.stats.tackles[1]}</span></div>
          <div style="text-align:center"><div style="color:#888;margin-bottom:2px">ASSISTS</div><span style="color:#6699ff">${s.stats.assists[0]}</span> — <span style="color:#ff5555">${s.stats.assists[1]}</span></div>
        </div>
        ${(() => {
          // man of the match calculation
          let bestRating = 0; let mvpLabel = "";
          for (const k of s.knights) {
            const rating = k.goals * 10 + k.shots * 2 + k.tackles * 3;
            if (rating > bestRating) {
              bestRating = rating;
              const team = k.team === Team.BLUE ? "Blue" : "Red";
              const role = k.isPlayer ? "YOU" : k.aiRole === "attacker" ? "Attacker" : "Defender";
              mvpLabel = `${team} ${role}`;
            }
          }
          return bestRating > 0 ? `<div style="font-size:12px;color:#ffd866;margin-bottom:6px">Man of the Match: ${mvpLabel}</div>` : "";
        })()}
        ${this._goalLog.length > 0 ? `<div style="font-size:11px;color:#999;margin-bottom:8px">${this._goalLog.map(g => {
          const min = Math.floor(g.time / 60); const sec = Math.floor(g.time % 60);
          const col = g.team === Team.BLUE ? "#6699ff" : "#ff5555";
          return `<span style="color:${col}">${min}:${sec.toString().padStart(2, "0")} ${g.quality || "GOAL"}</span>`;
        }).join(" &nbsp; ")}</div>` : ""}
        <div style="font-size:18px;color:#ffd866;animation:pulse 1.5s infinite">${nextLabel}</div>
        <div style="font-size:13px;color:#666;margin-top:8px">ESC to Quit</div>
        <style>@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }</style>
      `;
    }
    this._overlayDiv.innerHTML = html;
    this._overlayDiv.style.opacity = "1";
    // Wire up pause menu buttons
    if (mode === "pause") {
      this._overlayDiv.querySelector("[onclick*='pauseResume']")?.addEventListener("click", () => this._handleEscape());
      this._overlayDiv.querySelector("[onclick*='pauseQuit']")?.addEventListener("click", () => {
        this.destroy();
        window.dispatchEvent(new Event("knightBallExit"));
      });
    }
  }

  private _hideOverlay(): void {
    if (this._overlayDiv) this._overlayDiv.style.opacity = "0";
  }

  private _updateHUD(): void {
    const s = this._state;
    // score (only update on change)
    const scoreHtml = `<span style="color:#6699ff;font-size:14px;margin-right:4px">BLUE</span><span style="color:#6699ff">${s.score[0]}</span><span style="color:#555;font-size:22px;margin:0 8px">—</span><span style="color:#ff5555">${s.score[1]}</span><span style="color:#ff5555;font-size:14px;margin-left:4px">RED</span>`;
    if (scoreHtml !== this._lastScoreHtml && this._scoreDiv) {
      this._scoreDiv.innerHTML = scoreHtml;
      this._lastScoreHtml = scoreHtml;
    }
    // timer
    const mins = Math.floor(s.timer / 60);
    const secs = Math.floor(s.timer % 60);
    const timerText = `${mins}:${secs.toString().padStart(2, "0")}${s.phase === MatchPhase.OVERTIME ? " OT" : ""}`;
    if (timerText !== this._lastTimerText && this._timerDiv) {
      this._timerDiv.textContent = timerText;
      this._timerDiv.style.color = s.timer < 30 ? "#ff6644" : "#ccccaa";
      this._lastTimerText = timerText;
    }
    // stamina
    const player = s.knights.find(k => k.isPlayer);
    if (player && this._staminaBar) {
      this._staminaBar.style.width = `${(player.sprintStamina / KNIGHT_SPRINT_MAX) * 100}%`;
    }
    // charge bar
    if (player && this._chargeContainer && this._chargeBar) {
      if (player.state === KnightState.CHARGING) {
        this._chargeContainer.style.opacity = "1";
        this._chargeBar.style.width = `${(player.chargeFrames / KICK_CHARGE_MAX) * 100}%`;
      } else {
        this._chargeContainer.style.opacity = "0";
      }
    }
    // half indicator
    if (this._halfDiv) {
      const weatherIcons: Record<string, string> = { day: "☀", sunset: "🌅", night: "🌙", rain: "🌧" };
      this._halfDiv.textContent = `${s.half === 1 ? "1st Half" : "2nd Half"} ${weatherIcons[this._weather] || ""} ${DIFFICULTY[this._difficulty].label}`;
    }
    // power-up indicator
    if (player && this._powerUpIndicator) {
      if (player.activePowerUp !== null) {
        const puNames: Record<number, [string, string]> = { [PowerUpType.SPEED]: ["SPEED BOOST", "#44ff44"], [PowerUpType.MEGA_KICK]: ["MEGA KICK", "#ff8800"], [PowerUpType.FREEZE]: ["FREEZE TACKLE", "#44ddff"] };
        const [name, color] = puNames[player.activePowerUp] ?? ["", "#fff"];
        this._powerUpIndicator.textContent = `${name} (${Math.ceil(player.powerUpTimer / 60)}s)`;
        this._powerUpIndicator.style.color = color;
        this._powerUpIndicator.style.opacity = "1";
      } else {
        this._powerUpIndicator.style.opacity = "0";
      }
    }
    // possession bar
    if (this._possBarInner) {
      const totalP = s.stats.possession[0] + s.stats.possession[1] || 1;
      this._possBarInner.style.width = `${(s.stats.possession[0] / totalP) * 100}%`;
    }
    // minimap
    this._updateMinimap();
    // hide controls hint after a while
    if (this._controlsDiv && s.frame > 300) this._controlsDiv.style.opacity = "0.3";
  }

  private _updateMinimap(): void {
    const ctx = this._minimapCtx;
    if (!ctx || !this._state) return;
    const s = this._state;
    const cw = 140, ch = 90;

    ctx.clearRect(0, 0, cw, ch);
    // pitch
    ctx.fillStyle = "rgba(60,80,40,0.6)";
    ctx.fillRect(5, 5, cw - 10, ch - 10);
    // center line
    ctx.strokeStyle = "rgba(200,200,170,0.3)";
    ctx.beginPath(); ctx.moveTo(cw / 2, 5); ctx.lineTo(cw / 2, ch - 5); ctx.stroke();
    // goals
    const gw = (GOAL_WIDTH * 2 / ARENA_H) * (ch - 10);
    ctx.fillStyle = "rgba(68,136,255,0.4)";
    ctx.fillRect(2, (ch - gw) / 2, 4, gw);
    ctx.fillStyle = "rgba(255,68,68,0.4)";
    ctx.fillRect(cw - 6, (ch - gw) / 2, 4, gw);

    const mapX = (x: number) => ((x + ARENA_W / 2) / ARENA_W) * (cw - 10) + 5;
    const mapZ = (z: number) => ((z + ARENA_H / 2) / ARENA_H) * (ch - 10) + 5;

    // knights
    for (const k of s.knights) {
      const mx = mapX(k.x), mz = mapZ(k.z);
      ctx.beginPath();
      ctx.arc(mx, mz, k.isPlayer ? 4 : 3, 0, Math.PI * 2);
      ctx.fillStyle = k.team === Team.BLUE ? "#4488ff" : "#ff4444";
      ctx.fill();
      if (k.isPlayer) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    // ball
    ctx.beginPath();
    ctx.arc(mapX(s.ball.x), mapZ(s.ball.z), 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ffdd44";
    ctx.fill();
  }

  private _showAnnouncement(text: string, duration: number = 2): void {
    if (!this._phaseDiv) return;
    this._phaseDiv.textContent = text;
    this._phaseDiv.style.opacity = "1";
    this._phaseDiv.style.transform = "translate(-50%,-50%) scale(1.1)";
    setTimeout(() => {
      if (this._phaseDiv) this._phaseDiv.style.transform = "translate(-50%,-50%) scale(1)";
    }, 100);
    setTimeout(() => {
      if (this._phaseDiv) this._phaseDiv.style.opacity = "0";
    }, duration * 1000);
  }

  private _triggerFlash(): void {
    if (!this._flashDiv) return;
    this._flashDiv.style.opacity = "0.35";
    setTimeout(() => { if (this._flashDiv) this._flashDiv.style.opacity = "0"; }, 120);
  }

  private _triggerShake(intensity: number): void {
    this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
  }

  private _showCommentary(text: string): void {
    if (!this._commentaryDiv) return;
    this._commentaryDiv.textContent = text;
    this._commentaryDiv.style.opacity = "1";
    if (this._commentaryTimeout) clearTimeout(this._commentaryTimeout);
    this._commentaryTimeout = setTimeout(() => {
      if (this._commentaryDiv) this._commentaryDiv.style.opacity = "0";
    }, 2500);
  }

  private _setWeather(weather: "day" | "sunset" | "night" | "rain"): void {
    this._weather = weather;
    if (!this._dirLight || !this._ambientLight) return;

    // remove old rain
    if (this._rainParticles) { this._scene.remove(this._rainParticles); this._rainParticles = null; }

    // update sky dome material tint per weather
    const updateSky = (tint: number) => {
      if (this._skyMesh) (this._skyMesh.material as THREE.MeshBasicMaterial).color.setHex(tint);
    };

    if (weather === "day") {
      this._dirLight.color.setHex(0xccddff); this._dirLight.intensity = 0.8;
      this._ambientLight.color.setHex(0x334455); this._ambientLight.intensity = 0.5;
      this._scene.background = new THREE.Color(0x0d0d1a);
      this._scene.fog = new THREE.FogExp2(0x0d0d1a, 0.018);
      updateSky(0xffffff); // neutral
    } else if (weather === "sunset") {
      this._dirLight.color.setHex(0xff8844); this._dirLight.intensity = 1.0;
      this._dirLight.position.set(-10, 8, 12);
      this._ambientLight.color.setHex(0x553322); this._ambientLight.intensity = 0.4;
      this._scene.background = new THREE.Color(0x1a0d0a);
      this._scene.fog = new THREE.FogExp2(0x1a0d0a, 0.015);
      updateSky(0xffaa66); // warm orange tint
    } else if (weather === "night") {
      this._dirLight.color.setHex(0x4466aa); this._dirLight.intensity = 0.3;
      this._ambientLight.color.setHex(0x112233); this._ambientLight.intensity = 0.25;
      this._scene.background = new THREE.Color(0x050510);
      this._scene.fog = new THREE.FogExp2(0x050510, 0.025);
      updateSky(0x8888ff); // cool blue tint — stars brighter
      // brighter torches at night
      for (const t of this._torchLights) t.intensity = 4.0;
    } else if (weather === "rain") {
      this._dirLight.color.setHex(0x99aacc); this._dirLight.intensity = 0.5;
      this._ambientLight.color.setHex(0x334455); this._ambientLight.intensity = 0.35;
      this._scene.background = new THREE.Color(0x0a0a12);
      this._scene.fog = new THREE.FogExp2(0x0a0a12, 0.022);
      updateSky(0x667788); // grey overcast tint
      // rain particles
      const count = 400;
      this._rainPositions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        this._rainPositions[i * 3] = (Math.random() - 0.5) * ARENA_W * 1.3;
        this._rainPositions[i * 3 + 1] = Math.random() * 15;
        this._rainPositions[i * 3 + 2] = (Math.random() - 0.5) * ARENA_H * 1.3;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(this._rainPositions, 3));
      this._rainParticles = new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0x8899bb, size: 0.06, transparent: true, opacity: 0.5, depthWrite: false,
      }));
      this._scene.add(this._rainParticles);
      // wet floor
      (this._floorMesh.material as THREE.MeshStandardMaterial).metalness = 0.3;
      (this._lineMesh.material as THREE.MeshStandardMaterial).metalness = 0.25;
    }
  }

  private _updateRain(): void {
    if (!this._rainPositions || !this._rainParticles) return;
    for (let i = 0; i < this._rainPositions.length / 3; i++) {
      this._rainPositions[i * 3 + 1] -= 0.5; // fall speed
      if (this._rainPositions[i * 3 + 1] < 0) {
        this._rainPositions[i * 3 + 1] = 12 + Math.random() * 3;
        this._rainPositions[i * 3] = (Math.random() - 0.5) * ARENA_W * 1.3;
        this._rainPositions[i * 3 + 2] = (Math.random() - 0.5) * ARENA_H * 1.3;
      }
    }
    (this._rainParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  // ── career stats ────────────────────────────────────────────────────────

  private _saveCareerStats(): void {
    try {
      const raw = localStorage.getItem("knightball_career");
      const career = raw ? JSON.parse(raw) : { wins: 0, losses: 0, draws: 0, goalsFor: 0, goalsAgainst: 0, matches: 0, tournamentWins: 0 };
      const s = this._state;
      career.matches++;
      career.goalsFor += s.score[0];
      career.goalsAgainst += s.score[1];
      if (s.score[0] > s.score[1]) career.wins++;
      else if (s.score[1] > s.score[0]) career.losses++;
      else career.draws++;
      if (this._tournamentMode && s.tournamentScore[0] >= 2) career.tournamentWins++;
      localStorage.setItem("knightball_career", JSON.stringify(career));
    } catch { /* storage not available */ }
  }

  private _getCareerStats(): { wins: number; losses: number; draws: number; goalsFor: number; goalsAgainst: number; matches: number; tournamentWins: number } {
    try {
      const raw = localStorage.getItem("knightball_career");
      if (raw) return JSON.parse(raw);
    } catch {}
    return { wins: 0, losses: 0, draws: 0, goalsFor: 0, goalsAgainst: 0, matches: 0, tournamentWins: 0 };
  }

  // ── match state ────────────────────────────────────────────────────────

  private _makeKnight(team: Team, isPlayer: boolean, role: "attacker" | "defender"): KnightData {
    return {
      team, x: 0, z: 0, vx: 0, vz: 0,
      angle: team === Team.BLUE ? 0 : Math.PI,
      state: KnightState.IDLE, stateTimer: 0,
      tackleCooldown: 0, sprintStamina: KNIGHT_SPRINT_MAX,
      isPlayer, mesh: null, aiRole: role,
      chargeFrames: 0, activePowerUp: null, powerUpTimer: 0,
      bashCooldown: 0, shots: 0, tackles: 0, goals: 0,
    };
  }

  private _rebuildTeams(): void {
    // remove old meshes
    if (this._state) {
      for (const k of this._state.knights) { if (k.mesh) this._scene.remove(k.mesh); }
    }
    const n = this._teamSize;
    const knights: KnightData[] = [];
    // blue: player=attacker, rest=AI
    knights.push(this._makeKnight(Team.BLUE, true, "attacker"));
    for (let i = 1; i < n; i++) knights.push(this._makeKnight(Team.BLUE, false, i === n - 1 ? "defender" : "attacker"));
    // red: all AI
    for (let i = 0; i < n; i++) knights.push(this._makeKnight(Team.RED, false, i === n - 1 ? "defender" : "attacker"));
    if (this._state) {
      this._state.knights = knights;
      this._buildKnightMeshes();
    }
  }

  private _initMatchState(): void {
    const knights: KnightData[] = [];
    for (let i = 0; i < 4; i++) {
      knights.push(this._makeKnight(i < 2 ? Team.BLUE : Team.RED, i === 0, i % 2 === 0 ? "attacker" : "defender"));
    }
    this._state = {
      phase: MatchPhase.KICKOFF, timer: MATCH_DURATION, phaseTimer: KICKOFF_DELAY,
      score: [0, 0], half: 1, knights, ball: {
        x: 0, z: 0, y: BALL_RADIUS, vx: 0, vz: 0, vy: 0, spin: 0,
        lastKickerTeam: Team.BLUE, lastKickerIdx: 0, prevKickerIdx: -1,
        mesh: null, trail: null, trailPositions: new Float32Array(60 * 3), trailIdx: 0,
      },
      lastScorer: null, frame: 0, kickingTeam: Team.BLUE,
      slowMoTimer: 0, slowMoScale: 1,
      powerUps: [], nextPowerUpTime: MATCH_DURATION - POWERUP_SPAWN_INTERVAL,
      stats: { possession: [0, 0], shotsOnGoal: [0, 0], tackles: [0, 0], assists: [0, 0], goalDistances: [] },
      tournamentRound: 0, tournamentScore: [0, 0],
      replayBuffer: [], replayIdx: 0, isReplaying: false, replayFrame: 0,
      fouls: [0, 0], freeKickTeam: Team.BLUE, freeKickPos: { x: 0, z: 0 },
      keeperHasBall: false, keeperThrowTimer: 0,
    };
    this._buildKnightMeshes();
    this._buildBallMesh();
    this._resetPositions(Team.BLUE);
  }

  private _startMatch(): void {
    const s = this._state;
    s.phase = MatchPhase.KICKOFF;
    s.timer = MATCH_DURATION;
    s.phaseTimer = KICKOFF_DELAY;
    s.score = [0, 0];
    s.half = 1;
    s.lastScorer = null;
    s.frame = 0;
    s.kickingTeam = Team.BLUE;
    s.slowMoTimer = 0;
    s.slowMoScale = 1;
    s.nextPowerUpTime = MATCH_DURATION - POWERUP_SPAWN_INTERVAL;
    s.replayBuffer = [];
    s.replayIdx = 0;
    s.isReplaying = false;
    s.replayFrame = 0;
    s.fouls = [0, 0];
    s.keeperHasBall = false;
    this._goalLog = [];
    s.keeperThrowTimer = 0;
    s.stats = { possession: [0, 0], shotsOnGoal: [0, 0], tackles: [0, 0], assists: [0, 0], goalDistances: [] };
    // remove old power-up meshes
    for (const pu of s.powerUps) { if (pu.mesh) { this._scene.remove(pu.mesh); } }
    s.powerUps = [];
    for (const k of s.knights) {
      k.state = KnightState.IDLE; k.stateTimer = 0;
      k.tackleCooldown = 0; k.sprintStamina = KNIGHT_SPRINT_MAX;
      k.chargeFrames = 0; k.activePowerUp = null; k.powerUpTimer = 0;
      k.shots = 0; k.tackles = 0; k.goals = 0;
    }
    this._resetPositions(Team.BLUE);
    const roundLabel = this._tournamentMode && s.tournamentRound > 0
      ? `ROUND ${s.tournamentRound}` : "KNIGHT BALL!";
    this._showAnnouncement(roundLabel, 2.5);
    this._playSound("whistle");
    this._startAmbientCrowd();
    // random weather per match
    const weathers: Array<"day" | "sunset" | "night" | "rain"> = ["day", "day", "sunset", "night", "rain"];
    this._setWeather(weathers[Math.floor(Math.random() * weathers.length)]);
  }

  private _resetPositions(kickingTeam: Team): void {
    const s = this._state;
    const n = this._teamSize;
    // position blue team on left, red on right
    const blueKnights = s.knights.filter(k => k.team === Team.BLUE);
    const redKnights = s.knights.filter(k => k.team === Team.RED);
    const spreadZ = n >= 3 ? [-3, 0, 3] : [0, 0];
    for (let i = 0; i < blueKnights.length; i++) {
      blueKnights[i].x = i === 0 ? -5 : -8 - i * 2;
      blueKnights[i].z = spreadZ[i] ?? 0;
      blueKnights[i].angle = 0;
    }
    for (let i = 0; i < redKnights.length; i++) {
      redKnights[i].x = i === 0 ? 5 : 8 + i * 2;
      redKnights[i].z = spreadZ[i] ?? 0;
      redKnights[i].angle = Math.PI;
    }
    s.ball.x = 0; s.ball.z = 0; s.ball.y = BALL_RADIUS;
    s.ball.vx = 0; s.ball.vz = 0; s.ball.vy = 0; s.ball.spin = 0;
    if (kickingTeam === Team.BLUE) blueKnights[0].x = -1.5;
    else redKnights[0].x = 1.5;
    for (const k of s.knights) { k.vx = 0; k.vz = 0; k.state = KnightState.IDLE; k.stateTimer = 0; k.chargeFrames = 0; k.bashCooldown = 0; }
  }

  // ── mesh builders ──────────────────────────────────────────────────────

  private _buildKnightMeshes(): void {
    for (const k of this._state.knights) {
      if (k.mesh) { this._scene.remove(k.mesh); }
      const group = new THREE.Group();
      const bodyColor = k.team === Team.BLUE ? 0x3366cc : 0xcc3333;
      const armorColor = k.team === Team.BLUE ? 0x5588dd : 0xdd5555;

      // body
      const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.4, metalness: 0.6 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.0, 8), bodyMat);
      body.position.y = 0.8; body.castShadow = true;
      group.add(body); // [0] body

      // helmet
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.8 }));
      helm.position.y = 1.45; helm.castShadow = true;
      group.add(helm); // [1] helmet

      // visor
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x111111 }));
      visor.position.set(0, 1.45, 0.2);
      group.add(visor); // [2] visor

      // gorget (neck guard)
      const gorget = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.15, 8),
        new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.35, metalness: 0.75 }));
      gorget.position.y = 1.28;
      group.add(gorget);

      // tabard / surcoat (cloth drape over body)
      const tabardColor = k.team === Team.BLUE ? 0x2244aa : 0xaa2222;
      const tabardGeo = new THREE.BoxGeometry(0.6, 0.55, 0.02);
      const tabardMat = new THREE.MeshStandardMaterial({ color: tabardColor, roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide });
      const tabardFront = new THREE.Mesh(tabardGeo, tabardMat);
      tabardFront.position.set(0, 0.55, 0.2);
      group.add(tabardFront);
      const tabardBack = new THREE.Mesh(tabardGeo, tabardMat);
      tabardBack.position.set(0, 0.55, -0.2);
      group.add(tabardBack);
      // tabard belt
      const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 8),
        new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.7, metalness: 0.2 }));
      belt.position.y = 0.52;
      group.add(belt);

      // helmet plume (feathered crest)
      const plumeColor = k.team === Team.BLUE ? 0x4488ff : 0xff4444;
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 10),
        new THREE.MeshStandardMaterial({ color: plumeColor, roughness: 0.7, metalness: 0.1 }));
      plume.position.set(0, 1.75, -0.05);
      plume.rotation.x = -0.2; // tilt slightly back
      group.add(plume);
      // plume base
      const plumeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.1, 12),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.7 }));
      plumeBase.position.set(0, 1.6, -0.05);
      group.add(plumeBase);

      // pauldrons
      for (const side of [-1, 1]) {
        const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10),
          new THREE.MeshStandardMaterial({ color: armorColor, roughness: 0.35, metalness: 0.7 }));
        pauldron.position.set(side * 0.45, 1.2, 0);
        pauldron.scale.set(1, 0.7, 0.8);
        group.add(pauldron); // [3],[4] pauldrons
      }

      // legs
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.6, 12),
          new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.4 }));
        leg.position.set(side * 0.18, 0.3, 0);
        group.add(leg); // [5],[6] legs
      }

      // arms
      const armMat = new THREE.MeshStandardMaterial({ color: armorColor, roughness: 0.45, metalness: 0.55 });
      for (const side of [-1, 1]) {
        const armPivot = new THREE.Group();
        armPivot.position.set(side * 0.42, 1.05, 0);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.55, 12), armMat);
        arm.position.y = -0.28; // hang down from pivot
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0x997755, roughness: 0.7, metalness: 0.1 }));
        hand.position.y = -0.58;
        armPivot.add(arm);
        armPivot.add(hand);
        group.add(armPivot); // [7],[8] arms (pivots)
      }

      // shield (attached to left arm) with team emblem texture
      const shieldCanvas = document.createElement("canvas");
      shieldCanvas.width = 64; shieldCanvas.height = 64;
      const sctx2 = shieldCanvas.getContext("2d")!;
      // shield background
      sctx2.fillStyle = k.team === Team.BLUE ? "#2255bb" : "#bb2222";
      sctx2.fillRect(0, 0, 64, 64);
      // diagonal band
      sctx2.fillStyle = k.team === Team.BLUE ? "#3377dd" : "#dd4444";
      sctx2.beginPath();
      sctx2.moveTo(0, 20); sctx2.lineTo(64, 44); sctx2.lineTo(64, 64); sctx2.lineTo(0, 40);
      sctx2.fill();
      // center emblem (crown for blue, sword for red)
      sctx2.fillStyle = "#ddcc88";
      sctx2.font = "bold 24px serif";
      sctx2.textAlign = "center";
      sctx2.fillText(k.team === Team.BLUE ? "\u265A" : "\u2694", 32, 40);
      // gold border
      sctx2.strokeStyle = "#ccaa44";
      sctx2.lineWidth = 3;
      sctx2.strokeRect(2, 2, 60, 60);
      const shieldTex = new THREE.CanvasTexture(shieldCanvas);
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.35),
        new THREE.MeshStandardMaterial({ map: shieldTex, roughness: 0.4, metalness: 0.5 }));
      shield.position.set(0, -0.35, 0.15);
      // find the left arm pivot — it's a Group among the children
      const leftArmPivot = group.children.find((c, ci) => c instanceof THREE.Group && ci >= 7) as THREE.Group;
      if (leftArmPivot) leftArmPivot.add(shield);

      // boot (kicking foot)
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.35),
        new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8, metalness: 0.1 }));
      boot.position.set(0.1, 0.08, 0.25);
      group.add(boot); // [9] boot

      // player indicator
      if (k.isPlayer) {
        const indicator = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 10),
          new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xffaa00, emissiveIntensity: 0.5 }));
        indicator.position.y = 2.0;
        indicator.rotation.x = Math.PI;
        group.add(indicator); // [10] indicator
      }

      // role label sprite (ATK / DEF / GK / YOU)
      const labelCanvas = document.createElement("canvas");
      labelCanvas.width = 64; labelCanvas.height = 24;
      const lctx = labelCanvas.getContext("2d")!;
      lctx.font = "bold 16px Georgia";
      lctx.textAlign = "center";
      lctx.fillStyle = k.isPlayer ? "#ffdd00" : k.team === Team.BLUE ? "#88bbff" : "#ff8888";
      const label = k.isPlayer ? "YOU" : k.aiRole === "attacker" ? "ATK" : "DEF";
      lctx.fillText(label, 32, 18);
      const labelTex = new THREE.CanvasTexture(labelCanvas);
      const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false }));
      labelSprite.scale.set(1.0, 0.4, 1);
      labelSprite.position.y = k.isPlayer ? 2.4 : 2.0;
      group.add(labelSprite);

      group.position.set(k.x, 0, k.z);
      this._scene.add(group);
      k.mesh = group;
    }
  }

  private _buildBallMesh(): void {
    const ball = this._state.ball;
    if (ball.mesh) { this._scene.remove(ball.mesh); }
    if (ball.trail) { this._scene.remove(ball.trail); }

    // procedural leather ball texture
    const ballCanvas = document.createElement("canvas");
    ballCanvas.width = 128; ballCanvas.height = 64;
    const bctx = ballCanvas.getContext("2d")!;
    // leather base
    bctx.fillStyle = "#bb8844";
    bctx.fillRect(0, 0, 128, 64);
    // panel lines
    bctx.strokeStyle = "#7a5522";
    bctx.lineWidth = 2;
    for (let px = 0; px < 128; px += 32) {
      bctx.beginPath(); bctx.moveTo(px, 0); bctx.lineTo(px, 64); bctx.stroke();
    }
    for (let py = 0; py < 64; py += 16) {
      bctx.beginPath(); bctx.moveTo(0, py); bctx.lineTo(128, py); bctx.stroke();
    }
    // stitching dots along seams
    bctx.fillStyle = "#664422";
    for (let px = 0; px < 128; px += 32) {
      for (let py = 2; py < 64; py += 4) {
        bctx.fillRect(px - 1, py, 2, 2);
      }
    }
    // leather grain noise
    for (let i = 0; i < 400; i++) {
      const nx = Math.random() * 128, ny = Math.random() * 64;
      const shade = 160 + Math.floor(Math.random() * 30);
      bctx.fillStyle = `rgb(${shade},${shade - 40},${shade - 80})`;
      bctx.fillRect(nx, ny, 1 + Math.random(), 1);
    }
    const ballTex = new THREE.CanvasTexture(ballCanvas);

    const geo = new THREE.SphereGeometry(BALL_RADIUS, 16, 12);
    const mat = new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.7, metalness: 0.1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.position.set(ball.x, ball.y, ball.z);
    this._scene.add(mesh);
    ball.mesh = mesh;

    const stitchMat = new THREE.MeshBasicMaterial({ color: 0x664422 });
    for (let i = 0; i < 3; i++) {
      const stitch = new THREE.Mesh(new THREE.TorusGeometry(BALL_RADIUS + 0.01, 0.015, 10, 24), stitchMat);
      stitch.rotation.set(i * Math.PI / 3, i * 0.5, 0);
      mesh.add(stitch);
    }

    // ribbon trail mesh (triangle strip)
    const TRAIL_LEN = 20;
    const trailVerts = new Float32Array(TRAIL_LEN * 2 * 3); // 2 verts per point (top/bottom of ribbon)
    const trailAlphas = new Float32Array(TRAIL_LEN * 2);
    const trailColors = new Float32Array(TRAIL_LEN * 2 * 3);
    for (let i = 0; i < TRAIL_LEN; i++) {
      const a = 1 - i / TRAIL_LEN;
      trailAlphas[i * 2] = a; trailAlphas[i * 2 + 1] = a;
      trailColors[i * 6] = 1; trailColors[i * 6 + 1] = 0.75; trailColors[i * 6 + 2] = 0.2;
      trailColors[i * 6 + 3] = 1; trailColors[i * 6 + 4] = 0.75; trailColors[i * 6 + 5] = 0.2;
    }
    const indices: number[] = [];
    for (let i = 0; i < TRAIL_LEN - 1; i++) {
      const a = i * 2, b2 = a + 1, c = a + 2, d = a + 3;
      indices.push(a, b2, c, b2, d, c);
    }
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailVerts, 3));
    trailGeo.setAttribute("alpha", new THREE.BufferAttribute(trailAlphas, 1));
    trailGeo.setAttribute("color", new THREE.BufferAttribute(trailColors, 3));
    trailGeo.setIndex(indices);
    const trailMat = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.5,
      side: THREE.DoubleSide, depthWrite: false,
    });
    ball.trail = new THREE.Mesh(trailGeo, trailMat) as any;
    this._scene.add(ball.trail as any);
  }

  // ── update loop ────────────────────────────────────────────────────────

  private _update(dtSec: number): void {
    if (!this._state) return;

    // title screen: slow camera pan
    if (this._screen === GameScreen.TITLE) {
      this._titleCamAngle += dtSec * 0.15;
      this._camera.position.set(
        Math.sin(this._titleCamAngle) * 18,
        CAM_HEIGHT + 2,
        Math.cos(this._titleCamAngle) * 18
      );
      this._camera.lookAt(0, 1, 0);
      this._renderScene();
      return;
    }

    // paused: just render frozen
    if (this._screen === GameScreen.PAUSED) {
      this._renderScene();
      return;
    }

    // result screen: slow camera orbit around arena
    if (this._screen === GameScreen.RESULT) {
      this._titleCamAngle += dtSec * 0.2;
      this._camera.position.set(
        Math.sin(this._titleCamAngle) * 14,
        CAM_HEIGHT - 2,
        Math.cos(this._titleCamAngle) * 14
      );
      this._camera.lookAt(0, 1, 0);
      this._renderScene();
      return;
    }

    // hit freeze: skip sim for a few frames on big impacts
    if (this._hitFreezeFrames > 0) {
      this._hitFreezeFrames--;
      this._render();
      this._updateHUD();
      return;
    }

    // slow-mo support
    const s = this._state;
    let effectiveDt = dtSec;
    if (s.slowMoTimer > 0) {
      s.slowMoTimer -= dtSec;
      effectiveDt *= s.slowMoScale;
    }

    this._simAccum += effectiveDt;
    while (this._simAccum >= SIM_DT) {
      this._simAccum -= SIM_DT;
      this._simTick();
    }
    this._render();
    this._updateHUD();
  }

  private _simTick(): void {
    const s = this._state;
    s.frame++;

    if (s.phase === MatchPhase.KICKOFF) {
      s.phaseTimer -= SIM_DT;
      if (s.phaseTimer <= 0) {
        s.phase = MatchPhase.PLAYING;
        this._showAnnouncement("PLAY!", 1);
        this._playSound("whistle");
      }
      return;
    }

    if (s.phase === MatchPhase.GOAL_SCORED) {
      s.phaseTimer -= SIM_DT;
      // keep ball moving during celebration (slow-mo handles the feel)
      this._updateBall();
      if (s.phaseTimer <= 0) {
        s.phase = MatchPhase.KICKOFF;
        s.phaseTimer = KICKOFF_DELAY;
        const concedingTeam = s.lastScorer === Team.BLUE ? Team.RED : Team.BLUE;
        s.kickingTeam = concedingTeam;
        this._resetPositions(concedingTeam);
      }
      return;
    }

    if (s.phase === MatchPhase.HALFTIME) {
      s.phaseTimer -= SIM_DT;
      if (s.phaseTimer <= 0) {
        s.phase = MatchPhase.KICKOFF;
        s.phaseTimer = KICKOFF_DELAY;
        s.half = 2;
        s.kickingTeam = Team.RED;
        this._resetPositions(Team.RED);
        this._showAnnouncement("2ND HALF!", 2);
        this._playSound("whistle");
      }
      return;
    }

    if (s.phase === MatchPhase.ENDED) {
      s.phaseTimer -= SIM_DT;
      if (s.phaseTimer <= 0) {
        this._screen = GameScreen.RESULT;
        this._showOverlay("result");
      }
      return;
    }

    if (s.phase === MatchPhase.FREE_KICK || s.phase === MatchPhase.GOAL_KICK) {
      s.phaseTimer -= SIM_DT;
      if (s.phaseTimer <= 0) {
        if (s.phase === MatchPhase.FREE_KICK) {
          // auto-kick for AI, player kicks manually
          const kicker = s.knights.find(k => k.team === s.freeKickTeam && k.isPlayer);
          if (!kicker) {
            // AI takes the free kick
            const attackGoalX = s.freeKickTeam === Team.BLUE ? ARENA_W / 2 : -ARENA_W / 2;
            const aiKicker = s.knights.find(k => k.team === s.freeKickTeam && k.aiRole === "attacker");
            if (aiKicker) {
              aiKicker.angle = Math.atan2(-s.ball.z * 0.3, attackGoalX - s.ball.x);
              this._kickBall(aiKicker, KNIGHT_KICK_POWER + 3);
              this._playSound("kick");
            }
          }
        }
        s.phase = MatchPhase.PLAYING;
        this._showAnnouncement("PLAY!", 0.8);
      }
      return;
    }

    if (s.phase !== MatchPhase.PLAYING && s.phase !== MatchPhase.OVERTIME) return;

    s.timer -= SIM_DT;

    if (s.half === 1 && s.timer <= MATCH_DURATION / 2) {
      s.phase = MatchPhase.HALFTIME;
      s.phaseTimer = HALFTIME_DURATION;
      this._showAnnouncement("HALFTIME", 2.5);
      this._playSound("whistle");
      return;
    }

    if (s.timer <= 0) {
      s.timer = 0;
      if (s.score[0] === s.score[1] && s.phase !== MatchPhase.OVERTIME) {
        s.phase = MatchPhase.OVERTIME;
        s.timer = 60;
        this._showAnnouncement("OVERTIME!", 2);
        this._playSound("whistle");
        return;
      }
      s.phase = MatchPhase.ENDED;
      s.phaseTimer = 3;
      this._saveCareerStats();
      // tournament scoring
      if (this._tournamentMode) {
        if (s.score[0] > s.score[1]) s.tournamentScore[0]++;
        else if (s.score[1] > s.score[0]) s.tournamentScore[1]++;
      }
      const winner = s.score[0] > s.score[1] ? "BLUE WINS!" : s.score[1] > s.score[0] ? "RED WINS!" : "DRAW!";
      this._showAnnouncement(winner, 2.5);
      this._playSound("whistle");
      if (this._ambientNoiseNode) { this._ambientNoiseNode.stop(); this._ambientNoiseNode = null; }
      for (const k of s.knights) {
        if ((k.team === Team.BLUE && s.score[0] > s.score[1]) ||
            (k.team === Team.RED && s.score[1] > s.score[0])) {
          k.state = KnightState.CELEBRATE;
        }
      }
      return;
    }

    for (const k of s.knights) {
      if (k.isPlayer) this._updatePlayer(k);
      else this._updateAI(k);
      this._updateKnightPhysics(k);
    }
    this._updateBall();
    this._checkGoals();
    this._checkKeeperCatch();
    this._checkOutOfBounds();
    this._updateDust();
    this._updateSparks();
    this._updateConfetti();
    this._updatePowerUps();
    this._trackPossession();
    if (this._weather === "rain") this._updateRain();
    this._updateMotes();
    this._updateShockwaves();
    this._updateFireParticles();

    // record replay buffer
    const snap = {
      knights: s.knights.map(k => ({ x: k.x, z: k.z, angle: k.angle, state: k.state })),
      bx: s.ball.x, bz: s.ball.z, by: s.ball.y,
    };
    if (s.replayBuffer.length < REPLAY_BUFFER_LEN) s.replayBuffer.push(snap);
    else { s.replayBuffer[s.replayIdx % REPLAY_BUFFER_LEN] = snap; }
    s.replayIdx++;

    // timed commentary
    if (s.frame % 600 === 0 && s.frame > 0) { // every 10 seconds
      const poss = s.stats.possession;
      const total = poss[0] + poss[1] || 1;
      const bluePct = Math.round((poss[0] / total) * 100);
      if (bluePct > 65) this._showCommentary("Blue dominating possession!");
      else if (bluePct < 35) this._showCommentary("Red controlling the ball!");
    }
    if (s.timer < 60 && s.frame % 900 === 0 && s.score[0] === s.score[1]) {
      this._showCommentary("Tense final minute — still level!");
    }

    // crowd excitement decay
    if (this._crowdExcitement > 0) this._crowdExcitement *= 0.98;
  }

  // ── player input ───────────────────────────────────────────────────────

  private _updatePlayer(k: KnightData): void {
    if (k.state === KnightState.STUNNED || k.state === KnightState.KICK || k.state === KnightState.TACKLE) {
      k.stateTimer--;
      if (k.stateTimer <= 0) k.state = KnightState.IDLE;
      if (k.state === KnightState.KICK || k.state === KnightState.TACKLE) return;
    }
    if (k.tackleCooldown > 0) k.tackleCooldown--;
    if (k.bashCooldown > 0) k.bashCooldown--;

    let mx = 0, mz = 0;
    if (this._keys["KeyW"] || this._keys["ArrowUp"]) mz = -1;
    if (this._keys["KeyS"] || this._keys["ArrowDown"]) mz = 1;
    if (this._keys["KeyA"] || this._keys["ArrowLeft"]) mx = -1;
    if (this._keys["KeyD"] || this._keys["ArrowRight"]) mx = 1;

    const sprinting = this._keys["ShiftLeft"] || this._keys["ShiftRight"];

    // charge kick: hold space near ball
    const ballDist = dist(k.x, k.z, this._state.ball.x, this._state.ball.z);
    if (this._keys["Space"] && ballDist < KNIGHT_RADIUS + BALL_RADIUS + 1.5) {
      k.chargeFrames = Math.min(k.chargeFrames + 1, KICK_CHARGE_MAX);
      k.state = KnightState.CHARGING;
      // face the ball while charging
      k.angle = Math.atan2(this._state.ball.z - k.z, this._state.ball.x - k.x);
      // slow movement while charging
      if (mx !== 0 || mz !== 0) {
        const n = normalize(mx, mz);
        k.vx = n.x * KNIGHT_SPEED * 0.3;
        k.vz = n.z * KNIGHT_SPEED * 0.3;
      } else {
        k.vx *= 0.8; k.vz *= 0.8;
      }
      return;
    }

    // release charged kick
    if (k.chargeFrames > 0 && !this._keys["Space"]) {
      const chargeFrac = k.chargeFrames / KICK_CHARGE_MAX;
      if (ballDist < KNIGHT_RADIUS + BALL_RADIUS + 1.5) {
        k.state = KnightState.KICK;
        k.stateTimer = 15;
        this._kickBall(k, KNIGHT_KICK_POWER + chargeFrac * KNIGHT_KICK_CHARGE_BONUS);
        this._playSound(chargeFrac > 0.5 ? "charge_release" : "kick");
        if (chargeFrac > 0.6) { this._triggerShake(0.08 + chargeFrac * 0.1); this._hitFreezeFrames = 2; }
      }
      k.chargeFrames = 0;
      return;
    }
    k.chargeFrames = 0;

    if (mx !== 0 || mz !== 0) {
      const n = normalize(mx, mz);
      let speed = sprinting && k.sprintStamina > 0 ? KNIGHT_SPRINT_SPEED : KNIGHT_SPEED;
      if (k.activePowerUp === PowerUpType.SPEED) speed *= 1.3;
      k.vx = n.x * speed;
      k.vz = n.z * speed;
      k.angle = Math.atan2(n.z, n.x);
      k.state = sprinting && k.sprintStamina > 0 ? KnightState.SPRINT : KnightState.RUN;
      if (sprinting && k.sprintStamina > 0) k.sprintStamina -= 1;
      // footstep sound (player only, every 12 frames)
      if (this._state.frame % 12 === 0) this._playSound("step");
    } else {
      k.vx *= 0.8; k.vz *= 0.8;
      k.state = KnightState.IDLE;
    }
    if (!sprinting) k.sprintStamina = Math.min(KNIGHT_SPRINT_MAX, k.sprintStamina + KNIGHT_SPRINT_REGEN);

    // tackle
    if (this._keys["KeyE"]) {
      this._keys["KeyE"] = false;
      if (k.tackleCooldown <= 0) {
        k.state = KnightState.TACKLE;
        k.stateTimer = 20;
        k.tackleCooldown = KNIGHT_TACKLE_COOLDOWN;
        k.vx = Math.cos(k.angle) * KNIGHT_TACKLE_POWER;
        k.vz = Math.sin(k.angle) * KNIGHT_TACKLE_POWER;
        this._checkTackleHits(k);
        this._playSound("tackle");
      }
    }

    // shield bash (F)
    if (this._keys["KeyF"]) {
      this._keys["KeyF"] = false;
      if (k.bashCooldown <= 0) {
        k.bashCooldown = SHIELD_BASH_COOLDOWN;
        // push nearby opponents + deflect ball
        for (const opp of this._state.knights) {
          if (opp.team === k.team) continue;
          const d = dist(k.x, k.z, opp.x, opp.z);
          if (d < SHIELD_BASH_RANGE) {
            const nx = (opp.x - k.x) / (d || 1), nz = (opp.z - k.z) / (d || 1);
            opp.vx += nx * SHIELD_BASH_PUSH;
            opp.vz += nz * SHIELD_BASH_PUSH;
            this._spawnSparks((k.x + opp.x) / 2, 1.0, (k.z + opp.z) / 2, 8);
          }
        }
        // deflect ball
        const bd = dist(k.x, k.z, this._state.ball.x, this._state.ball.z);
        if (bd < SHIELD_BASH_RANGE) {
          const nx = (this._state.ball.x - k.x) / (bd || 1);
          const nz = (this._state.ball.z - k.z) / (bd || 1);
          this._state.ball.vx += nx * 8;
          this._state.ball.vz += nz * 8;
          this._state.ball.vy += 2;
        }
        this._playSound("tackle");
        this._showCommentary("Shield bash!");
        // arm animation: left arm (shield) thrust forward is handled in render
        k.state = KnightState.KICK; // reuse kick state for brief animation
        k.stateTimer = 10;
      }
    }

    // pass to teammate (Q = direct pass, hold Q = through-ball / leading pass)
    if (this._keys["KeyQ"]) {
      this._keys["KeyQ"] = false;
      const ballDist2 = dist(k.x, k.z, this._state.ball.x, this._state.ball.z);
      if (ballDist2 < KNIGHT_RADIUS + BALL_RADIUS + 1.5) {
        const mate = this._state.knights.find(kk => kk !== k && kk.team === k.team);
        if (mate) {
          const sprinting2 = this._keys["ShiftLeft"] || this._keys["ShiftRight"];
          if (sprinting2) {
            // through-ball: lead the pass ahead of teammate's movement
            const leadTime = 0.6;
            const targetX = mate.x + mate.vx * leadTime * 10;
            const targetZ = mate.z + mate.vz * leadTime * 10;
            k.angle = Math.atan2(targetZ - k.z, targetX - k.x);
            k.state = KnightState.KICK;
            k.stateTimer = 12;
            this._kickBall(k, KNIGHT_KICK_POWER * 0.85);
            this._showCommentary("Through ball!");
            this._playSound("kick");
          } else {
            // direct pass
            k.angle = Math.atan2(mate.z - k.z, mate.x - k.x);
            k.state = KnightState.KICK;
            k.stateTimer = 12;
            this._kickBall(k, KNIGHT_KICK_POWER * 0.7);
            this._showCommentary("Pass!");
            this._playSound("kick");
          }
        }
      }
    }
  }

  // ── AI ─────────────────────────────────────────────────────────────────

  private _updateAI(k: KnightData): void {
    if (k.state === KnightState.STUNNED || k.state === KnightState.KICK || k.state === KnightState.TACKLE || k.state === KnightState.DIVING) {
      k.stateTimer--;
      if (k.stateTimer <= 0) k.state = KnightState.IDLE;
      return;
    }
    if (k.state === KnightState.CELEBRATE) return;
    if (k.tackleCooldown > 0) k.tackleCooldown--;

    const s = this._state;
    const ball = s.ball;
    const ownGoalX = k.team === Team.BLUE ? -ARENA_W / 2 : ARENA_W / 2;
    const attackGoalX = k.team === Team.BLUE ? ARENA_W / 2 : -ARENA_W / 2;
    const ownSideSign = k.team === Team.BLUE ? -1 : 1;

    // adaptive AI: match state awareness
    const myScore = s.score[k.team];
    const oppScore = s.score[k.team === Team.BLUE ? Team.RED : Team.BLUE];
    const isLosing = myScore < oppScore;
    const isDesperate = isLosing && s.timer < 60; // last minute and behind

    // ball prediction (0.5s ahead, faster prediction when desperate)
    const predTime = isDesperate ? 0.7 : 0.5;
    const predBallX = ball.x + ball.vx * predTime;
    const predBallZ = ball.z + ball.vz * predTime;

    let targetX: number, targetZ: number;

    if (k.aiRole === "defender") {
      // GOALKEEPER: hug the goal line, track ball's z
      const ballInOwnHalf = (ownSideSign > 0) ? ball.x > 0 : ball.x < 0;
      const ballHeadingToGoal = (ownSideSign > 0) ? ball.vx > 1 : ball.vx < -1;

      if (ballInOwnHalf || ballHeadingToGoal) {
        // stay on goal line, intercept ball's projected z
        const projZ = ballHeadingToGoal ? predBallZ : ball.z;
        targetX = ownGoalX * 0.88;
        targetZ = clamp(projZ, -GOAL_WIDTH * 1.3, GOAL_WIDTH * 1.3);
      } else {
        // ball is far away, push up to midfield as sweeper (further up when desperate)
        const pushUp = isDesperate ? 0.2 : isLosing ? 0.3 : 0.4;
        targetX = ownGoalX * pushUp;
        targetZ = clamp(ball.z * 0.3, -ARENA_H / 4, ARENA_H / 4);
      }

      // goalkeeper dive: when ball is fast and heading toward goal
      const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vz * ball.vz);
      const ballHeadingFast = (k.team === Team.BLUE ? ball.vx < -6 : ball.vx > 6);
      const ballNearGoalLine = Math.abs(ball.x - ownGoalX) < 6;
      if (ballHeadingFast && ballNearGoalLine && ballSpeed > 8 && Math.abs(ball.z - k.z) > 0.8 && Math.abs(ball.z) < GOAL_WIDTH + 1) {
        // dive laterally toward ball's z
        k.state = KnightState.DIVING;
        k.stateTimer = 25;
        k.vx = 0;
        k.vz = (ball.z > k.z ? 1 : -1) * 12;
        this._spawnDustBurst(k.x, k.z, 6);
        const saveComments = ["What a save!", "Incredible reflexes!", "Keeper comes up big!", "Denied!", "Spectacular dive!"];
        this._showCommentary(saveComments[Math.floor(Math.random() * saveComments.length)]);
        this._playSound("tackle");
        // save slow-mo
        this._state.slowMoTimer = 0.6;
        this._state.slowMoScale = 0.35;
        this._crowdExcitement = Math.max(this._crowdExcitement, 0.8);
        return;
      }

      // if ball is very close, go clear it
      const distToBall = dist(k.x, k.z, ball.x, ball.z);
      if (distToBall < 3.5) {
        targetX = predBallX;
        targetZ = predBallZ;
        if (distToBall < KNIGHT_RADIUS + BALL_RADIUS + 0.6) {
          k.angle = Math.atan2(-ball.z * 0.3, attackGoalX - k.x);
          k.state = KnightState.KICK;
          k.stateTimer = 12;
          this._kickBall(k, KNIGHT_KICK_POWER + 2);
          this._playSound("kick");
          this._showCommentary("Great clearance!");
          return;
        }
      }
    } else {
      // ATTACKER: chase predicted ball position, aim at goal
      // check if teammate is closer to ball
      const teammate = s.knights.find(kk => kk !== k && kk.team === k.team);
      const myDistToBall = dist(k.x, k.z, ball.x, ball.z);
      const mateDistToBall = teammate ? dist(teammate.x, teammate.z, ball.x, ball.z) : 999;

      if (mateDistToBall < myDistToBall - 2 && myDistToBall > 4) {
        // teammate has the ball, position for a pass/shot
        targetX = attackGoalX * 0.4;
        targetZ = ball.z + (k.z > ball.z ? 3 : -3);
        targetZ = clamp(targetZ, -ARENA_H / 3, ARENA_H / 3);
      } else {
        // chase ball
        targetX = predBallX;
        targetZ = predBallZ;
      }

      const distToBall = dist(k.x, k.z, ball.x, ball.z);
      if (distToBall < KNIGHT_RADIUS + BALL_RADIUS + 0.6) {
        const teammate = s.knights.find(kk => kk !== k && kk.team === k.team);
        const distToGoal = Math.abs(attackGoalX - k.x);
        // decide: pass or shoot
        const shouldPass = teammate && distToGoal > 12 && Math.random() < 0.35 &&
          dist(teammate.x, teammate.z, attackGoalX, 0) < distToGoal;
        if (shouldPass && teammate) {
          // pass to teammate
          k.angle = Math.atan2(teammate.z - k.z, teammate.x - k.x);
          k.state = KnightState.KICK;
          k.stateTimer = 12;
          this._kickBall(k, KNIGHT_KICK_POWER * 0.65);
          this._playSound("kick");
          this._showCommentary("Nice pass!");
        } else {
          // aim at goal with some randomness
          const aimZ = (Math.random() - 0.5) * GOAL_WIDTH * 0.8;
          k.angle = Math.atan2(aimZ - k.z, attackGoalX - k.x);
          k.state = KnightState.KICK;
          k.stateTimer = 12;
          const diff = DIFFICULTY[this._difficulty];
          this._kickBall(k, (KNIGHT_KICK_POWER + 1) * (k.team === Team.RED ? diff.aiKickPower : 1));
          this._playSound("kick");
        }
        return;
      }

      // tackle nearby opponents who have the ball
      if (k.tackleCooldown <= 0) {
        for (const opp of s.knights) {
          if (opp.team === k.team) continue;
          const oppDist = dist(k.x, k.z, opp.x, opp.z);
          const oppBallDist = dist(opp.x, opp.z, ball.x, ball.z);
          if (oppDist < 2.0 && oppBallDist < 3) {
            k.angle = Math.atan2(opp.z - k.z, opp.x - k.x);
            k.state = KnightState.TACKLE;
            k.stateTimer = 20;
            k.tackleCooldown = KNIGHT_TACKLE_COOLDOWN;
            k.vx = Math.cos(k.angle) * KNIGHT_TACKLE_POWER * 0.8;
            k.vz = Math.sin(k.angle) * KNIGHT_TACKLE_POWER * 0.8;
            this._checkTackleHits(k);
            this._playSound("tackle");
            return;
          }
        }
      }
    }

    // move toward target (with difficulty scaling for enemy AI)
    const dx = targetX - k.x;
    const dz = targetZ - k.z;
    const distToTarget = Math.sqrt(dx * dx + dz * dz);
    const diff = DIFFICULTY[this._difficulty];
    const speedMult = k.team === Team.RED ? diff.aiSpeed : 1; // only red team (enemy) scales
    const hasSpeedBoost = k.activePowerUp === PowerUpType.SPEED;

    if (distToTarget > 0.5) {
      const n = normalize(dx, dz);
      let speed = (distToTarget > 5 ? KNIGHT_SPRINT_SPEED * 0.85 : KNIGHT_SPEED * 0.9) * speedMult;
      if (hasSpeedBoost) speed *= 1.3;
      k.vx = n.x * speed;
      k.vz = n.z * speed;
      k.angle = Math.atan2(n.z, n.x);
      k.state = KnightState.RUN;
    } else {
      k.vx *= 0.8; k.vz *= 0.8;
      k.state = KnightState.IDLE;
    }

    // AI picks up nearby power-ups opportunistically
    for (const pu of this._state.powerUps) {
      if (!pu.active) continue;
      if (dist(k.x, k.z, pu.x, pu.z) < 5 && k.activePowerUp === null) {
        // divert toward power-up if nearby
        const pdx = pu.x - k.x, pdz = pu.z - k.z;
        const pn = normalize(pdx, pdz);
        k.vx = pn.x * KNIGHT_SPEED * speedMult;
        k.vz = pn.z * KNIGHT_SPEED * speedMult;
        k.angle = Math.atan2(pn.z, pn.x);
        break;
      }
    }
  }

  // ── power-ups ────────────────────────────────────────────────────────

  private _updatePowerUps(): void {
    const s = this._state;

    // spawn new power-ups
    if (s.timer <= s.nextPowerUpTime && s.powerUps.filter(p => p.active).length < 2) {
      s.nextPowerUpTime -= POWERUP_SPAWN_INTERVAL;
      const types = [PowerUpType.SPEED, PowerUpType.MEGA_KICK, PowerUpType.FREEZE];
      const type = types[Math.floor(Math.random() * types.length)];
      const x = (Math.random() - 0.5) * (ARENA_W * 0.6);
      const z = (Math.random() - 0.5) * (ARENA_H * 0.6);

      const colors: Record<number, number> = { [PowerUpType.SPEED]: 0x44ff44, [PowerUpType.MEGA_KICK]: 0xff8800, [PowerUpType.FREEZE]: 0x44ddff };
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(POWERUP_RADIUS, 0),
        new THREE.MeshStandardMaterial({ color: colors[type], emissive: colors[type], emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.5 })
      );
      mesh.position.set(x, 1.0, z);
      this._scene.add(mesh);
      s.powerUps.push({ type, x, z, mesh, active: true });
      this._playSound("bounce");
    }

    // check pickup
    for (const pu of s.powerUps) {
      if (!pu.active) continue;
      // bob animation
      if (pu.mesh) {
        pu.mesh.position.y = 1.0 + Math.sin(s.frame * 0.08) * 0.3;
        pu.mesh.rotation.y += 0.03;
      }
      for (const k of s.knights) {
        if (dist(k.x, k.z, pu.x, pu.z) < KNIGHT_RADIUS + POWERUP_RADIUS) {
          pu.active = false;
          if (pu.mesh) { this._scene.remove(pu.mesh); pu.mesh = null; }
          k.activePowerUp = pu.type;
          k.powerUpTimer = POWERUP_DURATION * 60;
          this._playSound("whistle");
          const puC: Record<number, number> = { [PowerUpType.SPEED]: 0x44ff44, [PowerUpType.MEGA_KICK]: 0xff8800, [PowerUpType.FREEZE]: 0x44ddff };
          this._spawnShockwave(pu.x, pu.z, puC[pu.type] ?? 0xffffff);
          this._spawnSparks(pu.x, 1.0, pu.z, 10);
          break;
        }
      }
    }

    // tick active power-ups on knights
    for (const k of s.knights) {
      if (k.activePowerUp !== null) {
        k.powerUpTimer--;
        if (k.powerUpTimer <= 0) {
          k.activePowerUp = null;
        }
      }
    }
  }

  private _lastPossTeam: Team = Team.BLUE;
  private _trackPossession(): void {
    const s = this._state;
    let closestTeam = Team.BLUE;
    let closestDist = 999;
    for (const k of s.knights) {
      const d = dist(k.x, k.z, s.ball.x, s.ball.z);
      if (d < closestDist) { closestDist = d; closestTeam = k.team; }
    }
    s.stats.possession[closestTeam]++;
    // auto-switch: when opponent takes possession, switch to nearest blue knight to ball
    if (closestTeam === Team.RED && this._lastPossTeam === Team.BLUE && this._teamSize >= 2) {
      let bestIdx = -1; let bestD = Infinity;
      const blueKnights = s.knights.filter(k => k.team === Team.BLUE);
      for (let i = 0; i < blueKnights.length; i++) {
        const d = dist(blueKnights[i].x, blueKnights[i].z, s.ball.x, s.ball.z);
        if (d < bestD && !blueKnights[i].isPlayer) { bestD = d; bestIdx = i; }
      }
      if (bestIdx >= 0 && bestD < dist(blueKnights.find(k => k.isPlayer)!.x, blueKnights.find(k => k.isPlayer)!.z, s.ball.x, s.ball.z) * 0.7) {
        const currentPlayer = blueKnights.find(k => k.isPlayer);
        if (currentPlayer) currentPlayer.isPlayer = false;
        blueKnights[bestIdx].isPlayer = true;
        this._buildKnightMeshes();
      }
    }
    this._lastPossTeam = closestTeam;
  }

  private _startAmbientCrowd(): void {
    try {
      const ctx = this._ensureAudio();
      if (this._ambientNoiseNode) { this._ambientNoiseNode.stop(); this._ambientNoiseNode = null; }
      const duration = MATCH_DURATION + 30;
      const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() - 0.5) * 0.08;
      this._ambientNoiseNode = ctx.createBufferSource();
      this._ambientNoiseNode.buffer = buf;
      this._ambientNoiseNode.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass"; filter.frequency.value = 400; filter.Q.value = 0.8;
      const gain = ctx.createGain(); gain.gain.value = 0.08;
      this._ambientNoiseNode.connect(filter).connect(gain).connect(ctx.destination);
      this._ambientNoiseNode.start();
    } catch { /* audio not available */ }
  }

  // ── physics ────────────────────────────────────────────────────────────

  private _updateKnightPhysics(k: KnightData): void {
    k.x += k.vx * SIM_DT;
    k.z += k.vz * SIM_DT;
    const kFriction = this._weather === "rain" ? 0.93 : 0.9; // rain = slightly less control
    if (k.state !== KnightState.TACKLE) { k.vx *= kFriction; k.vz *= kFriction; }
    else { k.vx *= 0.95; k.vz *= 0.95; }

    const hw = ARENA_W / 2 - KNIGHT_RADIUS;
    const hh = ARENA_H / 2 - KNIGHT_RADIUS;
    k.x = clamp(k.x, -hw, hw);
    k.z = clamp(k.z, -hh, hh);

    for (const other of this._state.knights) {
      if (other === k) continue;
      const d = dist(k.x, k.z, other.x, other.z);
      const minDist = KNIGHT_RADIUS * 2;
      if (d < minDist && d > 0.01) {
        const overlap = minDist - d;
        const nx = (k.x - other.x) / d, nz = (k.z - other.z) / d;
        k.x += nx * overlap * 0.5; k.z += nz * overlap * 0.5;
        other.x -= nx * overlap * 0.5; other.z -= nz * overlap * 0.5;
      }
    }
  }

  private _updateBall(): void {
    const b = this._state.ball;

    // apply spin (curve)
    if (Math.abs(b.spin) > 0.01) {
      b.vz += b.spin * SIM_DT * 3;
      b.spin *= 0.995; // decay spin
    }

    b.x += b.vx * SIM_DT;
    b.z += b.vz * SIM_DT;
    b.y += b.vy * SIM_DT;
    b.vy -= 20 * SIM_DT;

    if (b.y < BALL_RADIUS) {
      b.y = BALL_RADIUS;
      b.vy = Math.abs(b.vy) * BALL_BOUNCE;
      if (Math.abs(b.vy) < 0.5) b.vy = 0;
    }

    // weather-affected friction
    const frictionMod = this._weather === "rain" ? 0.992 : BALL_FRICTION; // rain = slippery, less friction
    b.vx *= frictionMod;
    b.vz *= frictionMod;
    const spd = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
    if (spd > BALL_MAX_SPEED) { b.vx = (b.vx / spd) * BALL_MAX_SPEED; b.vz = (b.vz / spd) * BALL_MAX_SPEED; }

    const hw = ARENA_W / 2 - BALL_RADIUS;
    const hh = ARENA_H / 2 - BALL_RADIUS;

    if (b.z < -hh) { b.z = -hh; b.vz = Math.abs(b.vz) * BALL_BOUNCE; if (Math.abs(b.vz) > 1) this._playSound("bounce"); }
    if (b.z > hh) { b.z = hh; b.vz = -Math.abs(b.vz) * BALL_BOUNCE; if (Math.abs(b.vz) > 1) this._playSound("bounce"); }

    if (b.x < -hw) {
      if (Math.abs(b.z) < GOAL_WIDTH && b.y < GOAL_HEIGHT) { /* goal */ }
      else {
        b.x = -hw; b.vx = Math.abs(b.vx) * BALL_BOUNCE;
        // post bounce detection
        if (Math.abs(Math.abs(b.z) - GOAL_WIDTH) < 0.5 && b.y < GOAL_HEIGHT) {
          this._spawnSparks(-ARENA_W / 2, b.y, b.z, 10);
          this._triggerShake(0.1);
          this._crowdExcitement = Math.max(this._crowdExcitement, 0.7);
          this._playSound("tackle");
        } else if (Math.abs(b.vx) > 1) { this._playSound("bounce"); }
      }
    }
    if (b.x > hw) {
      if (Math.abs(b.z) < GOAL_WIDTH && b.y < GOAL_HEIGHT) { /* goal */ }
      else {
        b.x = hw; b.vx = -Math.abs(b.vx) * BALL_BOUNCE;
        if (Math.abs(Math.abs(b.z) - GOAL_WIDTH) < 0.5 && b.y < GOAL_HEIGHT) {
          this._spawnSparks(ARENA_W / 2, b.y, b.z, 10);
          this._triggerShake(0.1);
          this._crowdExcitement = Math.max(this._crowdExcitement, 0.7);
          this._playSound("tackle");
        } else if (Math.abs(b.vx) > 1) { this._playSound("bounce"); }
      }
    }

    // goalpost & crossbar collisions
    for (const side of [-1, 1]) {
      const postX = side * (ARENA_W / 2);
      for (const postZ of [-GOAL_WIDTH, GOAL_WIDTH]) {
        // vertical post: cylinder at (postX, 0..GOAL_HEIGHT, postZ), radius 0.12
        const dx = b.x - postX, dz2 = b.z - postZ;
        const postDist = Math.sqrt(dx * dx + dz2 * dz2);
        const minDist = BALL_RADIUS + 0.12;
        if (postDist < minDist && postDist > 0.01 && b.y < GOAL_HEIGHT) {
          const nx = dx / postDist, nz2 = dz2 / postDist;
          b.x = postX + nx * minDist;
          b.z = postZ + nz2 * minDist;
          // reflect velocity
          const dot = b.vx * nx + b.vz * nz2;
          b.vx -= 2 * dot * nx * 0.7;
          b.vz -= 2 * dot * nz2 * 0.7;
          this._spawnSparks(postX, b.y, postZ, 12);
          this._triggerShake(0.12);
          this._crowdExcitement = Math.max(this._crowdExcitement, 0.8);
          this._playSound("ping");
          this._showCommentary("Off the post!");
        }
      }
      // crossbar: horizontal at y=GOAL_HEIGHT, from z=-GOAL_WIDTH to z=+GOAL_WIDTH at x=postX
      if (Math.abs(b.x - postX) < BALL_RADIUS + 0.15 && Math.abs(b.z) < GOAL_WIDTH &&
          Math.abs(b.y - GOAL_HEIGHT) < BALL_RADIUS + 0.1) {
        b.vy = -Math.abs(b.vy) * BALL_BOUNCE;
        b.y = GOAL_HEIGHT - BALL_RADIUS - 0.1;
        this._spawnSparks(postX, GOAL_HEIGHT, b.z, 10);
        this._triggerShake(0.12);
        this._crowdExcitement = Math.max(this._crowdExcitement, 0.8);
        this._playSound("ping");
        this._showCommentary("Off the crossbar!");
      }
    }

    // knight-ball contact
    for (const k of this._state.knights) {
      const d = dist(k.x, k.z, b.x, b.z);
      const minDist = KNIGHT_RADIUS + BALL_RADIUS;
      if (d < minDist && d > 0.01) {
        const nx = (b.x - k.x) / d, nz = (b.z - k.z) / d;
        b.x = k.x + nx * minDist;
        b.z = k.z + nz * minDist;
        b.vx += nx * 3; b.vz += nz * 3;
      }
    }

    // dribble: ball gently follows nearest knight when both are slow and close
    const bspd2 = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
    if (bspd2 < 3 && b.y < BALL_RADIUS + 0.1) {
      for (const k of this._state.knights) {
        const kspd = Math.sqrt(k.vx * k.vx + k.vz * k.vz);
        if (kspd > 1 && kspd < 5) {
          const d = dist(k.x, k.z, b.x, b.z);
          if (d < KNIGHT_RADIUS + BALL_RADIUS + 0.4 && d > KNIGHT_RADIUS) {
            // gently pull ball to follow the knight's front
            const frontX = k.x + Math.cos(k.angle) * (KNIGHT_RADIUS + BALL_RADIUS + 0.1);
            const frontZ = k.z + Math.sin(k.angle) * (KNIGHT_RADIUS + BALL_RADIUS + 0.1);
            b.vx += (frontX - b.x) * 2;
            b.vz += (frontZ - b.z) * 2;
            break;
          }
        }
      }
    }

    // ribbon trail update
    const ti = b.trailIdx % 20;
    b.trailPositions[ti * 3] = b.x;
    b.trailPositions[ti * 3 + 1] = b.y;
    b.trailPositions[ti * 3 + 2] = b.z;
    b.trailIdx++;
    if (b.trail) {
      const spd = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
      const ribbonWidth = clamp(spd * 0.02, 0.02, 0.25);
      const geo = (b.trail as any).geometry as THREE.BufferGeometry;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const col = geo.attributes.color as THREE.BufferAttribute;
      for (let i = 0; i < 20; i++) {
        const idx = (b.trailIdx - 1 - i + 200) % 20;
        const px = b.trailPositions[idx * 3];
        const py = b.trailPositions[idx * 3 + 1];
        const pz = b.trailPositions[idx * 3 + 2];
        const fade = 1 - i / 20;
        const w = ribbonWidth * fade;
        pos.setXYZ(i * 2, px, py + w, pz);
        pos.setXYZ(i * 2 + 1, px, py - w, pz);
        // color: gold at head, red when fast
        const r = spd > 12 ? 1 : 1;
        const g2 = spd > 12 ? 0.3 + fade * 0.3 : 0.7 * fade;
        const b2 = spd > 12 ? 0.1 : 0.2 * fade;
        col.setXYZ(i * 2, r, g2, b2);
        col.setXYZ(i * 2 + 1, r, g2, b2);
      }
      pos.needsUpdate = true;
      col.needsUpdate = true;
      (b.trail as any).material.opacity = clamp(spd * 0.05, 0, 0.6);
    }
  }

  private _kickBall(k: KnightData, power: number = KNIGHT_KICK_POWER): void {
    const b = this._state.ball;
    const d = dist(k.x, k.z, b.x, b.z);
    if (d > KNIGHT_RADIUS + BALL_RADIUS + 1.5) return;

    // mega kick power-up
    if (k.activePowerUp === PowerUpType.MEGA_KICK) {
      power *= 1.5;
      k.activePowerUp = null; k.powerUpTimer = 0;
      this._triggerShake(0.2);
      this._triggerFlash();
      this._showCommentary("MEGA KICK!");
      this._playSound("charge_release");
      // brief slow-mo for dramatic effect
      this._state.slowMoTimer = 0.4;
      this._state.slowMoScale = 0.3;
    }

    // track kicker for assists
    b.prevKickerIdx = b.lastKickerIdx;
    b.lastKickerIdx = this._state.knights.indexOf(k);
    b.lastKickerTeam = k.team;

    // fatigue: low stamina reduces kick power
    const fatigueMult = k.sprintStamina < 30 ? 0.75 + (k.sprintStamina / 30) * 0.25 : 1;
    power *= fatigueMult;

    const isHeader = b.y > HEADER_HEIGHT;
    const kickDir = normalize(Math.cos(k.angle), Math.sin(k.angle));
    const effectivePower = isHeader ? power * 0.7 : power;
    b.vx = kickDir.x * effectivePower;
    b.vz = kickDir.z * effectivePower;
    b.vy = isHeader ? 1 + Math.random() : 3 + Math.random() * 2 + (power - KNIGHT_KICK_POWER) * 0.3;

    // ball spin/curve from knight lateral velocity
    const lateralSpeed = -Math.sin(k.angle) * k.vx + Math.cos(k.angle) * k.vz;
    b.spin = lateralSpeed * 0.4;

    // stats: track shots toward goal
    const attackGoalX = k.team === Team.BLUE ? ARENA_W / 2 : -ARENA_W / 2;
    if ((k.team === Team.BLUE && b.vx > 3) || (k.team === Team.RED && b.vx < -3)) {
      const projZ = b.z + b.vz * (Math.abs(attackGoalX - b.x) / (Math.abs(b.vx) || 1));
      if (Math.abs(projZ) < GOAL_WIDTH * 1.5) {
        this._state.stats.shotsOnGoal[k.team]++;
        k.shots++;
      }
    }

    this._spawnDustBurst(b.x, b.z, isHeader ? 4 : 8 + Math.floor(power - KNIGHT_KICK_POWER));
  }

  private _checkTackleHits(tackler: KnightData): void {
    for (const k of this._state.knights) {
      if (k === tackler || k.team === tackler.team) continue;
      if (k.state === KnightState.STUNNED) continue;
      const d = dist(tackler.x, tackler.z, k.x, k.z);
      if (d < KNIGHT_RADIUS * 2 + 1.0) {
        // freeze power-up: longer stun
        const stunDuration = tackler.activePowerUp === PowerUpType.FREEZE ? 80 : 40;
        k.state = KnightState.STUNNED;
        k.stateTimer = stunDuration;
        const nx = (k.x - tackler.x) / (d || 1);
        const nz = (k.z - tackler.z) / (d || 1);
        k.vx = nx * 6; k.vz = nz * 6;
        // strip power-up from victim
        if (k.activePowerUp !== null) { k.activePowerUp = null; k.powerUpTimer = 0; }
        this._spawnDustBurst(k.x, k.z, 12);
        this._spawnSparks((k.x + tackler.x) / 2, 1.0, (k.z + tackler.z) / 2, 15);
        this._spawnShockwave((k.x + tackler.x) / 2, (k.z + tackler.z) / 2, 0xffaa44);
        this._triggerShake(0.15);
        this._hitFreezeFrames = 3;
        this._playSound("stun");

        // foul detection: tackle from behind
        const tackleAngle = Math.atan2(tackler.z - k.z, tackler.x - k.x);
        const victimFacing = k.angle;
        let angleDiff = Math.abs(tackleAngle - victimFacing);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        if (angleDiff < Math.PI / 3) {
          // tackle came from the direction the victim was facing = from behind
          this._state.fouls[tackler.team]++;
          this._showAnnouncement("FOUL!", 1.5);
          this._showCommentary(["Foul! That was from behind!", "The referee blows his whistle!", "Dangerous tackle — foul!"][Math.floor(Math.random() * 3)]);
          this._playSound("whistle");
          // award free kick
          this._state.phase = MatchPhase.FREE_KICK;
          this._state.phaseTimer = FREE_KICK_SETUP_TIME;
          this._state.freeKickTeam = k.team;
          this._state.freeKickPos = { x: k.x, z: k.z };
          // place ball at foul spot
          this._state.ball.x = k.x; this._state.ball.z = k.z;
          this._state.ball.vx = 0; this._state.ball.vz = 0; this._state.ball.vy = 0;
          this._state.ball.y = BALL_RADIUS;
        } else {
          const tackleComments = ["Crunching tackle!", "What a hit!", "Armor clash!", "Down he goes!", "Bone-rattling!"];
          this._showCommentary(tackleComments[Math.floor(Math.random() * tackleComments.length)]);
        }
        // stats
        this._state.stats.tackles[tackler.team]++;
        tackler.tackles++;
      }
    }
  }

  private _checkGoals(): void {
    const b = this._state.ball;
    if (b.x > ARENA_W / 2 && Math.abs(b.z) < GOAL_WIDTH && b.y < GOAL_HEIGHT) { this._onGoal(Team.BLUE); return; }
    if (b.x < -ARENA_W / 2 && Math.abs(b.z) < GOAL_WIDTH && b.y < GOAL_HEIGHT) { this._onGoal(Team.RED); return; }

    // near miss: ball hits end wall near goal -> crowd excitement
    if ((Math.abs(b.x) > ARENA_W / 2 - 1) && Math.abs(b.z) < GOAL_WIDTH + 2 && Math.abs(b.z) > GOAL_WIDTH) {
      this._crowdExcitement = Math.max(this._crowdExcitement, 0.5);
      this._playSound("crowd");
      const nearMiss = ["Near miss!", "So close!", "Just wide!", "Off the mark!", "Agonizingly close!"];
      this._showCommentary(nearMiss[Math.floor(Math.random() * nearMiss.length)]);
    }
  }

  private _onGoal(scoringTeam: Team): void {
    const s = this._state;
    s.score[scoringTeam]++;
    s.lastScorer = scoringTeam;
    // log goal with time
    const matchTime = MATCH_DURATION - s.timer;
    s.phase = MatchPhase.GOAL_SCORED;
    s.phaseTimer = GOAL_CELEBRATION;

    // goal quality scoring
    const b = s.ball;
    const ballSpeed = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
    const goalX = scoringTeam === Team.BLUE ? ARENA_W / 2 : -ARENA_W / 2;
    const scorer = s.knights[b.lastKickerIdx];
    const kickDist = scorer ? Math.abs(scorer.x - goalX) : 10;
    const isHeader = b.y > 1.5;
    const isLongRange = kickDist > 15;
    const isScreener = ballSpeed > 16;
    const hasCurve = Math.abs(b.spin) > 0.3;

    // quality tiers
    let qualityLabel = "";
    let shakeIntensity = 0.4;
    let slowMoDuration = GOAL_SLOWMO_DURATION;
    if (isLongRange && isScreener) {
      qualityLabel = "SCREAMER!";
      shakeIntensity = 0.6; slowMoDuration = 1.8;
    } else if (isHeader) {
      qualityLabel = "HEADER!";
      shakeIntensity = 0.5; slowMoDuration = 1.5;
    } else if (hasCurve) {
      qualityLabel = "CURLER!";
      shakeIntensity = 0.5; slowMoDuration = 1.5;
    } else if (isLongRange) {
      qualityLabel = "LONG RANGE!";
      shakeIntensity = 0.5; slowMoDuration = 1.5;
    }
    s.slowMoTimer = slowMoDuration;
    s.slowMoScale = 0.25;
    s.stats.goalDistances.push(kickDist);
    this._goalLog.push({ team: scoringTeam, time: matchTime, quality: qualityLabel });

    // assist tracking
    const prevKicker = b.prevKickerIdx >= 0 ? s.knights[b.prevKickerIdx] : null;
    const hasAssist = prevKicker && prevKicker.team === scoringTeam && b.prevKickerIdx !== b.lastKickerIdx;
    if (hasAssist) s.stats.assists[scoringTeam]++;

    // announcement
    const teamName = scoringTeam === Team.BLUE ? "BLUE" : "RED";
    const mainAnnouncement = qualityLabel ? `${qualityLabel} ${teamName}!` : `GOAL! ${teamName}!`;
    this._showAnnouncement(mainAnnouncement, 2.5);
    this._playSound("goal");

    // context commentary
    const isLateGoal = s.timer < 30;
    const isEqualizer = s.score[0] === s.score[1];
    const isGoAhead = (scoringTeam === Team.BLUE ? s.score[0] : s.score[1]) > (scoringTeam === Team.BLUE ? s.score[1] : s.score[0]);
    let goalComments: string[];
    if (qualityLabel === "SCREAMER!") goalComments = ["What a thunderbolt!", "Absolutely unstoppable!", "From downtown!", "The keeper never saw it!"];
    else if (qualityLabel === "HEADER!") goalComments = ["Powerful header!", "Rose like a salmon!", "Head and shoulders above!", "Textbook header!"];
    else if (qualityLabel === "CURLER!") goalComments = ["Bent it beautifully!", "Curled into the corner!", "What a strike!", "The spin was incredible!"];
    else if (isLateGoal) goalComments = ["Last-minute goal!", "A dramatic late strike!", "What timing!", "In the dying moments!"];
    else if (isEqualizer) goalComments = ["The equalizer!", "They've leveled it!", "Game on!", "All square now!"];
    else if (isGoAhead) goalComments = ["They take the lead!", "Ahead now!", "That could be decisive!"];
    else goalComments = ["Magnificent strike!", "Into the net!", "The crowd goes wild!", "Brilliant finish!", "Clinical!", "A thing of beauty!"];
    let comment = goalComments[Math.floor(Math.random() * goalComments.length)];
    if (hasAssist) comment += " Great team play!";
    this._showCommentary(comment);

    this._triggerShake(shakeIntensity);
    this._triggerFlash();
    this._chromaticTarget = qualityLabel ? 0.08 : 0.06;
    this._crowdExcitement = 1;

    // confetti + net deform
    this._spawnConfetti(goalX, 0, scoringTeam);
    this._goalNetDeform[scoringTeam === Team.BLUE ? 1 : 0] = 1.0; // deform the goal that was scored on

    // trigger replay
    s.isReplaying = true;
    s.replayFrame = 0;

    for (const k of s.knights) {
      if (k.team === scoringTeam) {
        k.state = KnightState.CELEBRATE;
        k.stateTimer = GOAL_CELEBRATION * 60;
      }
    }
    s.ball.vx *= 0.3;
    s.ball.vz *= 0.3;
  }

  // ── keeper catch + out of bounds ─────────────────────────────────────

  private _checkKeeperCatch(): void {
    const s = this._state;
    if (s.keeperHasBall) {
      s.keeperThrowTimer--;
      if (s.keeperThrowTimer <= 0) {
        // throw ball out
        const keeper = s.knights.find(k => k.aiRole === "defender" && !k.isPlayer && s.keeperHasBall);
        if (keeper) {
          const attackGoalX = keeper.team === Team.BLUE ? ARENA_W / 2 : -ARENA_W / 2;
          keeper.angle = Math.atan2(0, attackGoalX - keeper.x);
          this._kickBall(keeper, KNIGHT_KICK_POWER * 0.8);
          this._playSound("kick");
          this._showCommentary("Keeper distributes!");
        }
        s.keeperHasBall = false;
      }
      return;
    }
    // check if a defender can catch a slow-moving ball near their goal
    const b = s.ball;
    const bspd = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
    if (bspd > 5 || b.y > 2) return; // only catch slow, low balls
    for (const k of s.knights) {
      if (k.aiRole !== "defender" || k.isPlayer) continue;
      const d = dist(k.x, k.z, b.x, b.z);
      const ownGoalX = k.team === Team.BLUE ? -ARENA_W / 2 : ARENA_W / 2;
      const nearGoal = Math.abs(k.x - ownGoalX) < 5;
      if (d < KNIGHT_RADIUS + BALL_RADIUS + 0.3 && nearGoal && bspd < 4) {
        s.keeperHasBall = true;
        s.keeperThrowTimer = 90; // 1.5 sec hold
        b.vx = 0; b.vz = 0; b.vy = 0;
        b.x = k.x; b.z = k.z; b.y = 1.2; // hold ball up
        this._showCommentary("Keeper holds it!");
        this._playSound("bounce");
        break;
      }
    }
  }

  private _checkOutOfBounds(): void {
    const s = this._state;
    const b = s.ball;
    // ball went over end line but not into goal (already handled by wall bounce + goal check)
    // detect: ball deep in goal area without triggering goal = out of play
    if (Math.abs(b.x) > ARENA_W / 2 + GOAL_DEPTH + 0.5) {
      // ball went too far behind goal — goal kick for defending team
      const defendingTeam = b.x > 0 ? Team.RED : Team.BLUE;
      const goalX = defendingTeam === Team.BLUE ? -ARENA_W / 2 : ARENA_W / 2;
      b.x = goalX * 0.8; b.z = 0; b.y = BALL_RADIUS;
      b.vx = 0; b.vz = 0; b.vy = 0;
      s.phase = MatchPhase.GOAL_KICK;
      s.phaseTimer = 1.0;
      s.freeKickTeam = defendingTeam;
      this._showAnnouncement("GOAL KICK", 1.2);
    }
  }

  // ── dust particles ─────────────────────────────────────────────────────

  private _spawnDustBurst(x: number, z: number, count: number): void {
    let spawned = 0;
    for (let i = 0; i < this._dustLife.length && spawned < count; i++) {
      if (this._dustLife[i] <= 0) {
        this._dustPositions[i * 3] = x + (Math.random() - 0.5) * 0.5;
        this._dustPositions[i * 3 + 1] = 0.2;
        this._dustPositions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.5;
        this._dustVelocities[i * 3] = (Math.random() - 0.5) * 3;
        this._dustVelocities[i * 3 + 1] = Math.random() * 3 + 1;
        this._dustVelocities[i * 3 + 2] = (Math.random() - 0.5) * 3;
        this._dustLife[i] = 30 + Math.random() * 30;
        spawned++;
      }
    }
  }

  private _updateDust(): void {
    for (let i = 0; i < this._dustLife.length; i++) {
      if (this._dustLife[i] > 0) {
        this._dustLife[i]--;
        this._dustPositions[i * 3] += this._dustVelocities[i * 3] * SIM_DT;
        this._dustPositions[i * 3 + 1] += this._dustVelocities[i * 3 + 1] * SIM_DT;
        this._dustPositions[i * 3 + 2] += this._dustVelocities[i * 3 + 2] * SIM_DT;
        this._dustVelocities[i * 3 + 1] -= 5 * SIM_DT;
      } else {
        this._dustPositions[i * 3 + 1] = -10;
      }
    }
    (this._dustParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  // ── render ─────────────────────────────────────────────────────────────

  private _renderScene(): void {
    const time = (this._state?.frame ?? 0) / 60;
    for (const light of this._torchLights) light.intensity = 2.5 + Math.sin(time * 8 + light.position.x) * 0.5;
    for (const banner of this._bannerMeshes) banner.rotation.y = Math.sin(time * 2 + banner.position.x) * 0.15;
    this._composer.render();
  }

  private _render(): void {
    if (!this._state) return;
    const s = this._state;
    const time = s.frame / 60;

    // update knight meshes
    for (const k of s.knights) {
      if (!k.mesh) continue;
      k.mesh.position.set(k.x, 0, k.z);
      k.mesh.rotation.y = -k.angle + Math.PI / 2;

      if (k.state === KnightState.RUN || k.state === KnightState.SPRINT) {
        const speed = k.state === KnightState.SPRINT ? 15 : 12;
        const bob = Math.sin(time * speed) * 0.08;
        k.mesh.position.y = bob;
        // leg animation
        k.mesh.children[5].position.y = 0.3 + Math.sin(time * speed) * 0.1;
        k.mesh.children[6].position.y = 0.3 + Math.sin(time * speed + Math.PI) * 0.1;
        // arm swing
        (k.mesh.children[7] as THREE.Group).rotation.x = Math.sin(time * speed) * 0.6;
        (k.mesh.children[8] as THREE.Group).rotation.x = Math.sin(time * speed + Math.PI) * 0.6;
        // sprint dust trail
        if (k.state === KnightState.SPRINT && s.frame % 2 === 0) {
          this._spawnDustBurst(k.x - Math.cos(k.angle) * 0.5, k.z - Math.sin(k.angle) * 0.5, 2);
        }
      } else if (k.state === KnightState.CELEBRATE) {
        k.mesh.position.y = Math.abs(Math.sin(time * 6)) * 0.5;
        // fist pump arms
        (k.mesh.children[7] as THREE.Group).rotation.x = -Math.abs(Math.sin(time * 6)) * 1.2;
        (k.mesh.children[8] as THREE.Group).rotation.x = -Math.abs(Math.sin(time * 6 + 0.5)) * 1.2;
      } else if (k.state === KnightState.DIVING) {
        // lateral dive animation
        const diveT = 1 - k.stateTimer / 25;
        k.mesh.rotation.z = (k.vz > 0 ? -1 : 1) * Math.min(diveT * 3, 1.3);
        k.mesh.position.y = Math.max(0, 0.3 - diveT * 0.4);
        // arms stretched out
        (k.mesh.children[7] as THREE.Group).rotation.x = -1.2;
        (k.mesh.children[8] as THREE.Group).rotation.x = -1.2;
      } else if (k.state === KnightState.STUNNED) {
        k.mesh.rotation.z = Math.sin(time * 15) * 0.3;
      } else if (k.state === KnightState.CHARGING) {
        const intensity = k.chargeFrames / KICK_CHARGE_MAX;
        k.mesh.position.y = Math.sin(time * 20) * 0.03 * intensity;
        const bodyMesh = k.mesh.children[0] as THREE.Mesh;
        const mat = bodyMesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0xffaa00);
        mat.emissiveIntensity = intensity * 0.6;
      } else if (k.state === KnightState.TACKLE) {
        // tackle lunge pose
        (k.mesh.children[7] as THREE.Group).rotation.x = -0.8; // arms forward
        (k.mesh.children[8] as THREE.Group).rotation.x = -0.8;
      } else {
        k.mesh.position.y = 0;
        k.mesh.rotation.z = 0;
        const bodyMesh = k.mesh.children[0] as THREE.Mesh;
        const mat = bodyMesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0;
        // arms idle
        (k.mesh.children[7] as THREE.Group).rotation.x = 0;
        (k.mesh.children[8] as THREE.Group).rotation.x = 0;
      }

      // power-up glow
      if (k.activePowerUp !== null) {
        const bodyMesh = k.mesh.children[0] as THREE.Mesh;
        const mat = bodyMesh.material as THREE.MeshStandardMaterial;
        const puColors: Record<number, number> = { [PowerUpType.SPEED]: 0x44ff44, [PowerUpType.MEGA_KICK]: 0xff8800, [PowerUpType.FREEZE]: 0x44ddff };
        mat.emissive.setHex(puColors[k.activePowerUp] ?? 0);
        mat.emissiveIntensity = 0.3 + Math.sin(time * 8) * 0.15;
      }

      // kick animation
      if (k.state === KnightState.KICK) {
        const t = 1 - k.stateTimer / 15;
        const kickAngle = Math.sin(t * Math.PI) * 0.8;
        k.mesh.children[9].position.z = 0.25 + kickAngle * 0.4;
        k.mesh.children[9].position.y = 0.08 + kickAngle * 0.2;
        // right arm follows through on kick
        (k.mesh.children[8] as THREE.Group).rotation.x = -kickAngle * 0.5;
      } else {
        k.mesh.children[9].position.z = 0.25;
        k.mesh.children[9].position.y = 0.08;
      }
    }

    // knight shadow circles
    for (let i = 0; i < s.knights.length && i < this._knightShadows.length; i++) {
      const k = s.knights[i];
      const ks = this._knightShadows[i];
      ks.visible = true;
      ks.position.set(k.x, 0.015, k.z);
    }
    for (let i = s.knights.length; i < this._knightShadows.length; i++) {
      this._knightShadows[i].visible = false;
    }

    // player highlight ring (pulsing around controlled knight)
    if (this._playerRing) {
      const pk = s.knights.find(k2 => k2.isPlayer);
      if (pk) {
        this._playerRing.visible = true;
        this._playerRing.position.set(pk.x, 0.02, pk.z);
        const pulse = 0.85 + Math.sin(time * 4) * 0.15;
        this._playerRing.scale.set(pulse, pulse, 1);
        (this._playerRing.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(time * 3) * 0.1;
      }
    }

    // charge ground ring (grows + brightens while charging)
    if (this._chargeRing) {
      const charger2 = s.knights.find(k2 => k2.state === KnightState.CHARGING && k2.isPlayer);
      if (charger2) {
        const chT = charger2.chargeFrames / KICK_CHARGE_MAX;
        this._chargeRing.visible = true;
        this._chargeRing.position.set(charger2.x, 0.025, charger2.z);
        const ringScale = 1 + chT * 2;
        this._chargeRing.scale.set(ringScale, ringScale, 1);
        (this._chargeRing.material as THREE.MeshBasicMaterial).opacity = chT * 0.5;
        (this._chargeRing.material as THREE.MeshBasicMaterial).color.setHex(
          chT > 0.7 ? 0xff4444 : chT > 0.3 ? 0xffaa00 : 0xffdd44
        );
      } else {
        this._chargeRing.visible = false;
      }
    }

    // kick direction arrow (visible while charging)
    if (this._kickArrow) {
      const charger = s.knights.find(k => k.state === KnightState.CHARGING && k.isPlayer);
      if (charger) {
        this._kickArrow.visible = true;
        const arrowDist = 1.5 + (charger.chargeFrames / KICK_CHARGE_MAX) * 1.5;
        this._kickArrow.position.set(
          charger.x + Math.cos(charger.angle) * arrowDist,
          0.15,
          charger.z + Math.sin(charger.angle) * arrowDist
        );
        this._kickArrow.rotation.y = -charger.angle + Math.PI / 2;
        const t2 = charger.chargeFrames / KICK_CHARGE_MAX;
        (this._kickArrow.material as THREE.MeshBasicMaterial).color.setHex(
          t2 > 0.7 ? 0xff4444 : t2 > 0.3 ? 0xffaa44 : 0xffdd44
        );
        (this._kickArrow.material as THREE.MeshBasicMaterial).opacity = 0.3 + t2 * 0.5;
      } else {
        this._kickArrow.visible = false;
      }
    }

    // speed lines on sprinting player
    if (this._speedLineParticles) {
      const player2 = s.knights.find(k => k.isPlayer);
      if (player2 && player2.state === KnightState.SPRINT && s.frame % 2 === 0) {
        for (let i = 0; i < this._speedLineLife.length; i++) {
          if (this._speedLineLife[i] <= 0) {
            this._speedLinePositions[i * 3] = player2.x + (Math.random() - 0.5) * 1.5;
            this._speedLinePositions[i * 3 + 1] = 0.5 + Math.random() * 1.0;
            this._speedLinePositions[i * 3 + 2] = player2.z + (Math.random() - 0.5) * 1.5;
            this._speedLineLife[i] = 8 + Math.random() * 8;
            break;
          }
        }
      }
      for (let i = 0; i < this._speedLineLife.length; i++) {
        if (this._speedLineLife[i] > 0) {
          this._speedLineLife[i]--;
          this._speedLinePositions[i * 3] -= Math.cos(player2?.angle ?? 0) * 0.3;
          this._speedLinePositions[i * 3 + 2] -= Math.sin(player2?.angle ?? 0) * 0.3;
        } else {
          this._speedLinePositions[i * 3 + 1] = -10;
        }
      }
      (this._speedLineParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    // ball
    const b = s.ball;
    if (b.mesh) {
      b.mesh.position.set(b.x, b.y, b.z);
      const spd = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
      b.mesh.rotation.x += spd * SIM_DT * 2;
      b.mesh.rotation.z += b.vz * SIM_DT;
    }

    // ball shadow
    if (this._ballShadow) {
      this._ballShadow.position.set(b.x, 0.02, b.z);
      const shadowScale = clamp(1 - (b.y - BALL_RADIUS) * 0.08, 0.2, 1.0);
      this._ballShadow.scale.set(shadowScale, shadowScale, 1);
      (this._ballShadow.material as THREE.MeshBasicMaterial).opacity = 0.3 * shadowScale;
    }

    // camera
    const ballNearGoal = Math.abs(b.x) > ARENA_W / 3;
    const camHeightTarget = ballNearGoal ? CAM_HEIGHT - 2 : CAM_HEIGHT;
    const camDistTarget = ballNearGoal ? CAM_DIST - 2 : CAM_DIST;

    // goal replay: overlay knight positions from buffer with cinematic camera
    if (s.isReplaying && s.replayBuffer.length > 0) {
      const bufLen = Math.min(s.replayBuffer.length, REPLAY_BUFFER_LEN);
      const startIdx = (s.replayIdx - bufLen + REPLAY_BUFFER_LEN * 10) % (bufLen || 1);
      const frameIdx = Math.min(s.replayFrame, bufLen - 1);
      const snap = s.replayBuffer[(startIdx + frameIdx) % bufLen];
      if (snap) {
        // move knights/ball to replay positions
        for (let i = 0; i < Math.min(snap.knights.length, s.knights.length); i++) {
          const k = s.knights[i];
          if (!k.mesh) continue;
          k.mesh.position.set(snap.knights[i].x, 0, snap.knights[i].z);
          k.mesh.rotation.y = -snap.knights[i].angle + Math.PI / 2;
        }
        if (b.mesh) b.mesh.position.set(snap.bx, snap.by, snap.bz);
        if (this._ballShadow) this._ballShadow.position.set(snap.bx, 0.02, snap.bz);
      }
      s.replayFrame += 2; // 2x speed replay
      if (s.replayFrame >= bufLen) {
        s.isReplaying = false; // end replay
      }
      // cinematic camera: orbit the goal
      const goalX = s.lastScorer === Team.BLUE ? ARENA_W / 2 : -ARENA_W / 2;
      const replayT = s.replayFrame / bufLen;
      this._camera.position.set(
        goalX + Math.sin(replayT * Math.PI) * 8,
        4 + replayT * 3,
        Math.cos(replayT * Math.PI) * 10
      );
      this._camera.lookAt(goalX, 1, 0);
      // show REPLAY label
      if (this._phaseDiv && s.replayFrame < 10) {
        this._phaseDiv.textContent = "REPLAY";
        this._phaseDiv.style.opacity = "0.7";
        this._phaseDiv.style.fontSize = "32px";
      }
    }

    // goal celebration zoom
    let zoomOffset = 0;
    if (s.phase === MatchPhase.GOAL_SCORED && !s.isReplaying) {
      const celebT = 1 - s.phaseTimer / GOAL_CELEBRATION;
      zoomOffset = -Math.sin(celebT * Math.PI) * 3;
    }

    const camTargetX = b.x * 0.7;
    const camTargetZ = b.z * 0.3;
    this._camera.position.x = lerp(this._camera.position.x, camTargetX, CAM_LERP);
    this._camera.position.y = lerp(this._camera.position.y, camHeightTarget + zoomOffset, CAM_LERP);
    this._camera.position.z = lerp(this._camera.position.z, camDistTarget + camTargetZ, CAM_LERP);

    // screen shake
    if (this._shakeIntensity > 0.001) {
      this._camera.position.x += (Math.random() - 0.5) * this._shakeIntensity * 2;
      this._camera.position.y += (Math.random() - 0.5) * this._shakeIntensity;
      this._shakeIntensity *= 0.85;
    }

    this._camera.lookAt(
      lerp(this._camera.position.x, b.x * 0.5, 0.1),
      0,
      lerp(0, b.z * 0.2, 0.1)
    );

    // crowd wave + excitement bounce
    if (this._crowdMesh) {
      const dummy = new THREE.Object3D();
      const needsUpdate = this._crowdExcitement > 0.01 || s.frame % 3 === 0;
      if (needsUpdate) {
        for (let i = 0; i < this._crowdBaseMatrices.length; i++) {
          dummy.matrix.copy(this._crowdBaseMatrices[i]);
          dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
          // Mexican wave pattern (slow traveling wave through crowd)
          const wavePhase = i * 0.15 - time * 2;
          const wave = Math.max(0, Math.sin(wavePhase)) * 0.2;
          // excitement bounce
          const exciteBounce = this._crowdExcitement > 0.01
            ? Math.sin(time * 15 + i * 0.7) * this._crowdExcitement * 0.3 : 0;
          dummy.position.y += wave + exciteBounce;
          dummy.updateMatrix();
          this._crowdMesh.setMatrixAt(i, dummy.matrix);
        }
        this._crowdMesh.instanceMatrix.needsUpdate = true;
        // sync crowd heads
        if (this._crowdHeadsMesh) {
          for (let i = 0; i < this._crowdBaseMatrices.length; i++) {
            dummy.matrix.copy(this._crowdBaseMatrices[i]);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
            const wavePhase2 = i * 0.15 - time * 2;
            const wave2 = Math.max(0, Math.sin(wavePhase2)) * 0.2;
            const excite2 = this._crowdExcitement > 0.01
              ? Math.sin(time * 15 + i * 0.7) * this._crowdExcitement * 0.3 : 0;
            dummy.position.y += 0.55 + wave2 + excite2;
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            this._crowdHeadsMesh.setMatrixAt(i, dummy.matrix);
          }
          this._crowdHeadsMesh.instanceMatrix.needsUpdate = true;
        }
      }
    }

    // ground mist drift
    for (let mi = 0; mi < this._mistPlanes.length; mi++) {
      const mist = this._mistPlanes[mi];
      mist.position.x += Math.sin(time * 0.3 + mi * 2) * 0.01;
      mist.position.z += Math.cos(time * 0.2 + mi * 1.5) * 0.008;
      (mist.material as THREE.MeshBasicMaterial).opacity = 0.04 + Math.sin(time * 0.5 + mi) * 0.02;
    }

    // flame animation
    for (let fi = 0; fi < this._flameMeshes.length; fi++) {
      const flame = this._flameMeshes[fi];
      const offset = fi * 1.7;
      flame.scale.y = 0.8 + Math.sin(time * 12 + offset) * 0.3;
      flame.scale.x = 0.9 + Math.sin(time * 9 + offset + 1) * 0.15;
      flame.position.y += Math.sin(time * 15 + offset) * 0.002; // slight vertical jitter
    }

    // volumetric cone opacity pulse
    for (const cone of this._lightCones) {
      (cone.material as THREE.MeshBasicMaterial).opacity = 0.03 + Math.sin(time * 6 + cone.position.x) * 0.015;
    }

    // torch flicker & banner wave
    for (const light of this._torchLights) light.intensity = 2.5 + Math.sin(time * 8 + light.position.x) * 0.5;
    for (const banner of this._bannerMeshes) banner.rotation.y = Math.sin(time * 2 + banner.position.x) * 0.15;

    // corner flag wave
    for (const flag of this._cornerFlags) flag.rotation.y = Math.sin(time * 3 + flag.position.x) * 0.2;

    // goal net deformation (bulge effect)
    for (let g = 0; g < 2 && g < this._goalMeshes.length; g++) {
      if (this._goalNetDeform[g] > 0.01) {
        const deform = this._goalNetDeform[g];
        const goalGroup = this._goalMeshes[g];
        for (const child of goalGroup.children) {
          if ((child as THREE.Mesh).material && ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).transparent) {
            // push net planes outward
            const origX = child.position.x;
            const pushDir = g === 0 ? -1 : 1; // left goal pushes left, right goal pushes right
            child.position.x = origX + pushDir * deform * 0.5;
          }
        }
        this._goalNetDeform[g] *= 0.95; // decay
      }
    }

    // ball glow: speed-based + keeper hold
    if (b.mesh) {
      const bmat = b.mesh.material as THREE.MeshStandardMaterial;
      const bspd = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
      if (s.keeperHasBall) {
        bmat.emissive.setHex(0x554400);
        bmat.emissiveIntensity = 0.3;
      } else if (bspd > 10) {
        // hot glow when ball is fast
        const t = clamp((bspd - 10) / 10, 0, 1);
        const r = 1.0, g = 0.6 - t * 0.4, b2 = 0.1;
        bmat.emissive.setRGB(r, g, b2);
        bmat.emissiveIntensity = t * 0.8;
      } else {
        bmat.emissiveIntensity = 0;
      }
    }

    // chromatic aberration decay
    if (this._chromaticPass) {
      const cur = this._chromaticPass.uniforms["amount"].value;
      this._chromaticPass.uniforms["amount"].value = lerp(cur, this._chromaticTarget, 0.1);
      this._chromaticTarget *= 0.92;
    }
    // bloom intensity: boost during goals
    if (this._bloomPass) {
      const goalBoost = s.phase === MatchPhase.GOAL_SCORED ? 0.7 : 0.4;
      this._bloomPass.strength = lerp(this._bloomPass.strength, goalBoost, 0.05);
    }

    // score pop animation
    if (this._scoreDiv && s.phase === MatchPhase.GOAL_SCORED && s.phaseTimer > GOAL_CELEBRATION - 0.3) {
      this._scoreDiv.style.transform = "translateX(-50%) scale(1.3)";
      this._scoreDiv.style.transition = "transform 0.3s";
    } else if (this._scoreDiv) {
      this._scoreDiv.style.transform = "translateX(-50%) scale(1)";
    }

    this._composer.render();
  }
}
