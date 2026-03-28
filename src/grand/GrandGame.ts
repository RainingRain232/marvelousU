/**
 * GRAND — 3D Medieval Chariot Grand Prix
 *
 * Race armored war chariots around a floating sky track.
 * Dodge obstacles, collect power-ups, use medieval weapons.
 * 3 laps, 4 racers, winner takes the Grail Cup.
 *
 * WASD / Arrows = steer + accelerate/brake
 * SPACE = use power-up
 * ESC = pause
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, offset: { value: 1.0 }, darkness: { value: 1.2 } },
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
import { viewManager } from "@view/ViewManager";

// ── constants ────────────────────────────────────────────────────────────────

const SIM_DT = 1 / 60;
const TRACK_SEGMENTS = 80;
const TRACK_RADIUS = 40; // overall track loop radius
const TRACK_WIDTH = 8;
const TRACK_Y_BASE = 0;
const LAPS_TO_WIN = 3;
const NUM_RACERS = 4;
const MAX_SPEED = 18;
const ACCEL = 12;
const BRAKE_DECEL = 20;
const FRICTION = 0.97;
const STEER_SPEED = 2.2;
const AI_SKILL = [0.85, 0.9, 0.95]; // AI speed multipliers
const BOOST_SPEED = 28;
const BOOST_DURATION = 90; // frames
const POWERUP_RESPAWN = 300;
const RUBBER_BAND_STRENGTH = 0.3;
const OBSTACLE_COUNT = 8;
const JUMP_RAMP_COUNT = 3;
const DRIFT_SPARK_RATE = 3;
const EDGE_FALL_LATERAL = 1.15;
const TURBO_START_WINDOW = 15; // frames around "GO" where space = turbo start
const TURBO_START_BOOST = 60; // frames of boost from perfect start

// track layout presets
const TRACK_LAYOUTS = [
  { name: "SKY LOOP", r: 40, a: 12, b: 8, ya: 3, yb: 2, freq: [2, 3] },
  { name: "SERPENT'S COIL", r: 35, a: 18, b: 5, ya: 5, yb: 1, freq: [3, 2] },
  { name: "THUNDER RING", r: 50, a: 6, b: 15, ya: 2, yb: 4, freq: [1, 4] },
  { name: "VOID SPIRAL", r: 30, a: 20, b: 12, ya: 4, yb: 3, freq: [2, 5] },
] as const;

// ── types ────────────────────────────────────────────────────────────────────

const enum GrandPhase { TITLE, COUNTDOWN, RACING, FINISHED, PAUSED }
const enum PowerUpKind { BOOST, SHIELD, BOLT, OIL, MISSILE }

interface TrackPoint { x: number; y: number; z: number; angle: number }

interface Racer {
  trackPos: number; // 0..TRACK_SEGMENTS (fractional)
  lateralOffset: number; // -1..1 across track width
  speed: number;
  lap: number;
  finished: boolean;
  finishTime: number;
  mesh: THREE.Group | null;
  isPlayer: boolean;
  color: number;
  name: string;
  powerUp: PowerUpKind | null;
  boostTimer: number;
  shieldTimer: number;
  stunTimer: number;
  eliminated: boolean;
  // AI
  targetLateral: number;
  steerSmooth: number;
}

interface TrackPickup {
  segIdx: number;
  lateral: number;
  kind: PowerUpKind;
  mesh: THREE.Mesh | null;
  active: boolean;
  respawnTimer: number;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// ═════════════════════════════════════════════════════════════════════════════

export class GrandGame {
  private _canvas!: HTMLCanvasElement;
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _composer!: EffectComposer;
  private _bloomPass!: UnrealBloomPass;
  private _chromaticPass: ShaderPass | null = null;

  private _phase: GrandPhase = GrandPhase.TITLE;
  private _frame = 0;
  private _simAccum = 0;
  private _tickerCb: ((t: { deltaMS: number }) => void) | null = null;
  private _countdown = 0;

  // track
  private _trackPoints: TrackPoint[] = [];
  private _trackMesh: THREE.Mesh | null = null;
  private _trackRails: THREE.Mesh[] = [];
  private _skybox: THREE.Mesh | null = null;
  private _clouds: THREE.Mesh[] = [];
  private _pillars: THREE.Mesh[] = [];

  // racers
  private _racers: Racer[] = [];

  // pickups
  private _pickups: TrackPickup[] = [];

  // input
  private _keys: Record<string, boolean> = {};
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  // HUD
  private _hudDiv: HTMLDivElement | null = null;
  private _overlayDiv: HTMLDivElement | null = null;
  private _speedDiv: HTMLDivElement | null = null;
  private _lapDiv: HTMLDivElement | null = null;
  private _posDiv: HTMLDivElement | null = null;
  private _powerUpDiv: HTMLDivElement | null = null;
  private _countdownDiv: HTMLDivElement | null = null;

  // particles
  private _dustPositions!: Float32Array;
  private _dustLife!: Float32Array;
  private _dustVelocities!: Float32Array;
  private _dustParticles!: THREE.Points;

  // effects
  private _shakeIntensity = 0;
  private _boostTrailPositions!: Float32Array;
  private _boostTrailLife!: Float32Array;
  private _boostTrailParticles!: THREE.Points;
  private _torchLights: THREE.PointLight[] = [];
  private _announcementDiv: HTMLDivElement | null = null;
  private _minimapCanvas: HTMLCanvasElement | null = null;
  private _minimapCtx: CanvasRenderingContext2D | null = null;
  private _timerDiv: HTMLDivElement | null = null;
  private _bestLapTime = Infinity;
  private _lapStartFrame = 0;
  private _engineNode: OscillatorNode | null = null;
  private _engineGain: GainNode | null = null;

  // obstacles & ramps
  private _obstacles: Array<{ segIdx: number; lateral: number; mesh: THREE.Mesh }> = [];
  private _ramps: Array<{ segIdx: number; mesh: THREE.Mesh }> = [];
  // speed lines
  private _speedLinePositions!: Float32Array;
  private _speedLineLife!: Float32Array;
  private _speedLineParticles!: THREE.Points;
  // championship
  private _championshipMode = false;
  private _championshipRace = 0;
  private _championshipPoints: number[] = [0, 0, 0, 0];
  private _selectedMode = 0; // 0=single, 1=championship
  // vignette / chromatic
  private _chromaticTarget = 0;
  // slipstream
  private _slipstreamDiv: HTMLDivElement | null = null;
  // position tracking
  private _lastPosition = 1;
  // scenery
  private _floatingIslands: THREE.Mesh[] = [];
  // final lap
  private _finalLapTriggered = false;
  // weapon visuals
  private _boltProjectiles: Array<{ mesh: THREE.Mesh; targetIdx: number; life: number }> = [];
  private _oilPuddles: Array<{ segIdx: number; lateral: number; mesh: THREE.Mesh; life: number }> = [];
  // racer shadows
  private _racerShadows: THREE.Mesh[] = [];
  // drift
  private _driftSparks!: THREE.Points;
  private _driftSparkPositions!: Float32Array;
  private _driftSparkLife!: Float32Array;
  private _driftSparkVelocities!: Float32Array;
  private _isDrifting = false;
  // crowd at start/finish
  private _crowdMeshes: THREE.Mesh[] = [];
  // corner sharpness cached per segment
  private _cornerSharpness: Float32Array = new Float32Array(TRACK_SEGMENTS);
  // track layout
  private _trackLayout = 0;
  private _trackNameDiv: HTMLDivElement | null = null;
  // turbo start
  private _turboStartUsed = false;
  // weather
  private _weather: "clear" | "rain" | "fog" = "clear";
  // confetti
  private _confettiPositions: Float32Array | null = null;
  private _confettiLife: Float32Array | null = null;
  private _confettiVelocities: Float32Array | null = null;
  private _confettiParticles: THREE.Points | null = null;
  // split times
  private _splitDiv: HTMLDivElement | null = null;
  // wrong way
  private _wrongWayDiv: HTMLDivElement | null = null;
  private _prevTrackPos = 0;
  // AI personalities
  private _aiPersonality: Array<"aggressive" | "defensive" | "dirty"> = [];
  // sun/moon
  private _sunMesh: THREE.Mesh | null = null;
  // track banners
  private _trackBanners: THREE.Mesh[] = [];
  // speed rumble
  private _speedRumbleIntensity = 0;
  // void debris (falling rocks below track)
  private _voidDebris: Array<{ mesh: THREE.Mesh; vy: number }> = [];
  // waterfalls
  private _waterfallParticles: THREE.Points | null = null;
  private _waterfallPositions: Float32Array | null = null;
  // flying creatures
  private _birds: Array<{ mesh: THREE.Mesh; angle: number; speed: number; radius: number; y: number }> = [];
  // track edge glow strips
  private _edgeGlowMeshes: THREE.Mesh[] = [];
  // track underside
  private _trackUnderside: THREE.Mesh | null = null;
  // stalactites
  private _stalactites: THREE.Mesh[] = [];
  // checkpoint gates
  private _checkpointGates: Array<{ segIdx: number; meshes: THREE.Mesh[] }> = [];
  // ambient motes
  private _ambientMotes!: THREE.Points;
  private _ambientMotePositions!: Float32Array;
  // commentary
  private _commentaryDiv: HTMLDivElement | null = null;
  private _commentaryTimeout: ReturnType<typeof setTimeout> | null = null;
  // wind sound
  private _windNode: OscillatorNode | null = null;
  private _windGain: GainNode | null = null;
  // rear view
  private _rearView = false;
  // missile projectiles
  private _missiles: Array<{ mesh: THREE.Mesh; trackPos: number; lateral: number; speed: number; life: number }> = [];
  // stun spark particles
  private _stunSparkPositions!: Float32Array;
  private _stunSparkLife!: Float32Array;
  private _stunSparkVelocities!: Float32Array;
  private _stunSparkParticles!: THREE.Points;
  // persistence

  // audio
  private _audioCtx: AudioContext | null = null;

  // ── boot / destroy ─────────────────────────────────────────────────────

  async boot(): Promise<void> {
    viewManager.clearWorld();
    this._generateTrack();
    this._initRenderer();
    this._initScene();
    this._initInput();
    this._initHUD();
    this._phase = GrandPhase.TITLE;
    this._showOverlay("title");

    this._tickerCb = (t) => this._update(t.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb as any);
  }

  destroy(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb as any); this._tickerCb = null; }
    if (this._keyDownHandler) window.removeEventListener("keydown", this._keyDownHandler);
    if (this._keyUpHandler) window.removeEventListener("keyup", this._keyUpHandler);
    if (this._hudDiv) { this._hudDiv.remove(); this._hudDiv = null; }
    this._stopEngine();
    if (this._windNode) { try { (this._windNode as any).stop(); } catch {} this._windNode = null; }
    if (this._canvas?.parentNode) this._canvas.parentNode.removeChild(this._canvas);
    if (this._composer) this._composer.dispose();
    if (this._renderer) this._renderer.dispose();
    if (this._audioCtx) { this._audioCtx.close(); this._audioCtx = null; }
    const pc = viewManager.app.canvas as HTMLElement;
    pc.style.zIndex = ""; pc.style.pointerEvents = "";
    viewManager.app.renderer.background.color = 0x1a1a2e;
    viewManager.app.renderer.background.alpha = 1;
  }

  // ── audio ──────────────────────────────────────────────────────────────

  private _ensureAudio(): AudioContext {
    if (!this._audioCtx) this._audioCtx = new AudioContext();
    if (this._audioCtx.state === "suspended") this._audioCtx.resume();
    return this._audioCtx;
  }

  private _playSound(type: "boost" | "bolt" | "hit" | "lap" | "finish" | "countdown" | "go"): void {
    try {
      const ctx = this._ensureAudio();
      const now = ctx.currentTime;
      const g = ctx.createGain();
      g.connect(ctx.destination);
      if (type === "boost") {
        const o = ctx.createOscillator(); o.type = "sawtooth";
        o.frequency.setValueAtTime(150, now); o.frequency.exponentialRampToValueAtTime(400, now + 0.3);
        g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        o.connect(g); o.start(now); o.stop(now + 0.35);
      } else if (type === "bolt") {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() - 0.5) * 0.4;
        const n = ctx.createBufferSource(); n.buffer = buf;
        g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        n.connect(g); n.start(now); n.stop(now + 0.12);
      } else if (type === "hit") {
        const o = ctx.createOscillator(); o.type = "square";
        o.frequency.setValueAtTime(120, now); o.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        o.connect(g); o.start(now); o.stop(now + 0.25);
      } else if (type === "lap" || type === "finish") {
        for (const freq of [330, 440, 550]) {
          const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq;
          const gg = ctx.createGain(); gg.gain.setValueAtTime(0.1, now); gg.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          o.connect(gg).connect(ctx.destination); o.start(now); o.stop(now + 0.4);
        }
      } else if (type === "countdown") {
        const o = ctx.createOscillator(); o.type = "sine";
        o.frequency.setValueAtTime(440, now);
        g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        o.connect(g); o.start(now); o.stop(now + 0.2);
      } else if (type === "go") {
        const o = ctx.createOscillator(); o.type = "sine";
        o.frequency.setValueAtTime(660, now);
        g.gain.setValueAtTime(0.18, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        o.connect(g); o.start(now); o.stop(now + 0.3);
      }
    } catch {}
  }

  // ── track generation ───────────────────────────────────────────────────

  private _generateTrack(): void {
    this._trackPoints = [];
    const layout = TRACK_LAYOUTS[this._trackLayout % TRACK_LAYOUTS.length];
    for (let i = 0; i < TRACK_SEGMENTS; i++) {
      const t = (i / TRACK_SEGMENTS) * Math.PI * 2;
      const x = Math.cos(t) * layout.r + Math.sin(t * layout.freq[0]) * layout.a;
      const z = Math.sin(t) * layout.r + Math.cos(t * layout.freq[1]) * layout.b;
      const y = TRACK_Y_BASE + Math.sin(t * layout.freq[0]) * layout.ya + Math.cos(t * layout.freq[1]) * layout.yb;
      // facing angle = tangent of track
      const nextT = ((i + 1) / TRACK_SEGMENTS) * Math.PI * 2;
      const nx = Math.cos(nextT) * layout.r + Math.sin(nextT * layout.freq[0]) * layout.a;
      const nz = Math.sin(nextT) * layout.r + Math.cos(nextT * layout.freq[1]) * layout.b;
      const angle = Math.atan2(nz - z, nx - x);
      this._trackPoints.push({ x, y, z, angle });
    }
    // compute corner sharpness (angle difference between consecutive segments)
    this._cornerSharpness = new Float32Array(TRACK_SEGMENTS);
    for (let i = 0; i < TRACK_SEGMENTS; i++) {
      const a1 = this._trackPoints[i].angle;
      const a2 = this._trackPoints[(i + 1) % TRACK_SEGMENTS].angle;
      let diff = Math.abs(a2 - a1);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      this._cornerSharpness[i] = diff;
    }
  }

  private _getTrackPosWorld(trackPos: number, lateral: number): { x: number; y: number; z: number; angle: number } {
    const idx = Math.floor(trackPos) % TRACK_SEGMENTS;
    const frac = trackPos - Math.floor(trackPos);
    const a = this._trackPoints[idx];
    const b = this._trackPoints[(idx + 1) % TRACK_SEGMENTS];
    const x = lerp(a.x, b.x, frac);
    const y = lerp(a.y, b.y, frac);
    const z = lerp(a.z, b.z, frac);
    let angleDiff = b.angle - a.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    const angle = a.angle + angleDiff * frac;
    // offset laterally perpendicular to track direction
    const perpX = -Math.sin(angle);
    const perpZ = Math.cos(angle);
    return {
      x: x + perpX * lateral * (TRACK_WIDTH / 2),
      y: y + 0.3,
      z: z + perpZ * lateral * (TRACK_WIDTH / 2),
      angle,
    };
  }

  // ── renderer ───────────────────────────────────────────────────────────

  private _initRenderer(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this._canvas = document.createElement("canvas");
    this._canvas.id = "grand-canvas";
    Object.assign(this._canvas.style, { position: "absolute", top: "0", left: "0", width: "100%", height: "100%", zIndex: "10" });
    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._canvas);

    this._renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.3;

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x1a2a4a);
    this._scene.fog = new THREE.FogExp2(0x224466, 0.004);

    this._camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 300);

    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(new RenderPass(this._scene, this._camera));
    this._bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.4, 0.6, 0.85);
    this._composer.addPass(this._bloomPass);
    const vig = new ShaderPass(VignetteShader);
    vig.uniforms["darkness"].value = 1.2;
    this._composer.addPass(vig);
    this._chromaticPass = new ShaderPass(ChromaticShader);
    this._composer.addPass(this._chromaticPass);
    this._composer.addPass(new OutputPass());

    const pc = viewManager.app.canvas as HTMLElement;
    Object.assign(pc.style, { position: "absolute", top: "0", left: "0", zIndex: "20", pointerEvents: "none" });
    viewManager.app.renderer.background.color = 0x000000;
    viewManager.app.renderer.background.alpha = 0;
    window.addEventListener("resize", this._onResize);
  }

  private _onResize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    this._camera.aspect = w / h; this._camera.updateProjectionMatrix();
    this._renderer.setSize(w, h);
    if (this._composer) this._composer.setSize(w, h);
  };

  // ── scene ──────────────────────────────────────────────────────────────

  private _initScene(): void {
    // lighting — warm sunset sky
    this._scene.add(new THREE.AmbientLight(0x667799, 0.5));
    const hemi = new THREE.HemisphereLight(0xffd8a8, 0x334466, 0.6);
    this._scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffddaa, 0.8);
    dir.position.set(30, 40, 20); dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 1; dir.shadow.camera.far = 120;
    dir.shadow.camera.left = -60; dir.shadow.camera.right = 60;
    dir.shadow.camera.top = 60; dir.shadow.camera.bottom = -60;
    this._scene.add(dir);

    // sky gradient dome
    const skyGeo = new THREE.SphereGeometry(150, 32, 16);
    const skyCanvas = document.createElement("canvas");
    skyCanvas.width = 256; skyCanvas.height = 256;
    const sctx = skyCanvas.getContext("2d")!;
    const grad = sctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#1a2a5a"); grad.addColorStop(0.3, "#3a4a7a");
    grad.addColorStop(0.5, "#ff8844"); grad.addColorStop(0.7, "#ffaa66");
    grad.addColorStop(1, "#ffddaa");
    sctx.fillStyle = grad; sctx.fillRect(0, 0, 256, 256);
    // stars in upper portion
    for (let i = 0; i < 80; i++) {
      sctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.7})`;
      sctx.fillRect(Math.random() * 256, Math.random() * 100, Math.random() > 0.8 ? 2 : 1, 1);
    }
    this._skybox = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(skyCanvas), side: THREE.BackSide }));
    this._scene.add(this._skybox);

    // clouds
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffeedd, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
    for (let ci = 0; ci < 20; ci++) {
      const cw = 5 + Math.random() * 15, ch = 2 + Math.random() * 5;
      const cloud = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), cloudMat.clone());
      cloud.position.set((Math.random() - 0.5) * 200, -10 + Math.random() * 30, (Math.random() - 0.5) * 200);
      cloud.rotation.x = -0.3 + Math.random() * 0.2;
      cloud.rotation.y = Math.random() * Math.PI;
      this._scene.add(cloud); this._clouds.push(cloud);
    }

    // sun/moon
    this._sunMesh = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffdd88, transparent: true, opacity: 0.9 }));
    this._sunMesh.position.set(80, 50, -40);
    this._scene.add(this._sunMesh);
    // sun glow halo
    const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.15, depthWrite: false }));
    sunGlow.position.copy(this._sunMesh.position);
    this._scene.add(sunGlow);

    // build track mesh
    this._buildTrackMesh();
    this._buildTrackDetails();
    this._buildPickups();
    this._buildRacers();
    this._buildDustParticles();
    this._buildBoostTrail();
    this._buildTrackTorches();
    this._buildTrackBanners();
    this._buildObstacles();
    this._buildRamps();
    this._buildSpeedLines();
    this._buildScenery();
    this._buildRacerShadows();
    this._buildDriftSparks();
    this._buildCrowd();
    this._buildVoidDebris();
    this._buildWaterfalls();
    this._buildBirds();
    this._buildEdgeGlow();
    this._buildTrackUnderside();
    this._buildCheckpointGates();
    this._buildAmbientMotes();
    this._buildStunSparks();
  }

  private _buildTrackMesh(): void {
    // create a ribbon mesh following the track points
    const verts: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    for (let i = 0; i <= TRACK_SEGMENTS; i++) {
      const p = this._trackPoints[i % TRACK_SEGMENTS];
      const perpX = -Math.sin(p.angle);
      const perpZ = Math.cos(p.angle);
      const hw = TRACK_WIDTH / 2;
      // left edge
      verts.push(p.x + perpX * hw, p.y, p.z + perpZ * hw);
      // right edge
      verts.push(p.x - perpX * hw, p.y, p.z - perpZ * hw);
      uvs.push(i / TRACK_SEGMENTS * 10, 0, i / TRACK_SEGMENTS * 10, 1);
      if (i < TRACK_SEGMENTS) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        indices.push(a, b, c, b, d, c);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    // stone track texture
    const trackCanvas = document.createElement("canvas");
    trackCanvas.width = 128; trackCanvas.height = 64;
    const tctx = trackCanvas.getContext("2d")!;
    tctx.fillStyle = "#5a5a55"; tctx.fillRect(0, 0, 128, 64);
    for (let i = 0; i < 100; i++) {
      const sh = 70 + Math.floor(Math.random() * 20);
      tctx.fillStyle = `rgb(${sh},${sh},${sh - 5})`;
      tctx.fillRect(Math.random() * 128, Math.random() * 64, 2 + Math.random() * 4, 2 + Math.random() * 3);
    }
    // center line
    tctx.fillStyle = "#ddcc88"; tctx.fillRect(60, 0, 8, 64);
    const trackTex = new THREE.CanvasTexture(trackCanvas);
    trackTex.wrapS = THREE.RepeatWrapping; trackTex.wrapT = THREE.RepeatWrapping;
    trackTex.repeat.set(10, 1);

    this._trackMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: trackTex, roughness: 0.85, metalness: 0.1 }));
    this._trackMesh.receiveShadow = true;
    this._scene.add(this._trackMesh);

    // track edge rails (glowing)
    for (const side of [-1, 1]) {
      const railVerts: number[] = [];
      for (let i = 0; i <= TRACK_SEGMENTS; i++) {
        const p = this._trackPoints[i % TRACK_SEGMENTS];
        const perpX = -Math.sin(p.angle); const perpZ = Math.cos(p.angle);
        railVerts.push(p.x + perpX * side * (TRACK_WIDTH / 2 + 0.2), p.y + 0.3, p.z + perpZ * side * (TRACK_WIDTH / 2 + 0.2));
      }
      const railGeo = new THREE.BufferGeometry();
      railGeo.setAttribute("position", new THREE.Float32BufferAttribute(railVerts, 3));
      const rail = new THREE.Line(railGeo, new THREE.LineBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.5 }));
      this._scene.add(rail as any);
      this._trackRails.push(rail as any);
    }
  }

  private _buildTrackDetails(): void {
    // support pillars beneath the track
    for (let i = 0; i < TRACK_SEGMENTS; i += 8) {
      const p = this._trackPoints[i];
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.6, 20, 12),
        new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8, metalness: 0.2 })
      );
      pillar.position.set(p.x, p.y - 10, p.z);
      this._scene.add(pillar); this._pillars.push(pillar);
    }
    // archways at start/finish
    const sp = this._trackPoints[0];
    const archMat = new THREE.MeshStandardMaterial({ color: 0xddaa44, roughness: 0.4, metalness: 0.5 });
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 5, 8), archMat);
      const perpX = -Math.sin(sp.angle); const perpZ = Math.cos(sp.angle);
      post.position.set(sp.x + perpX * side * (TRACK_WIDTH / 2 + 0.5), sp.y + 2.5, sp.z + perpZ * side * (TRACK_WIDTH / 2 + 0.5));
      post.castShadow = true;
      this._scene.add(post);
    }
    const archBar = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH + 2, 0.4, 0.4), archMat);
    archBar.position.set(sp.x, sp.y + 5, sp.z);
    archBar.rotation.y = sp.angle;
    this._scene.add(archBar);
    // checkered banner
    const bannerCanvas = document.createElement("canvas");
    bannerCanvas.width = 64; bannerCanvas.height = 32;
    const bctx = bannerCanvas.getContext("2d")!;
    for (let bx = 0; bx < 8; bx++) for (let by = 0; by < 4; by++) {
      bctx.fillStyle = (bx + by) % 2 === 0 ? "#111111" : "#eeeeee";
      bctx.fillRect(bx * 8, by * 8, 8, 8);
    }
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_WIDTH + 1, 2),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bannerCanvas), side: THREE.DoubleSide }));
    banner.position.set(sp.x, sp.y + 6, sp.z);
    banner.rotation.y = sp.angle + Math.PI / 2;
    this._scene.add(banner);
  }

  private _buildPickups(): void {
    this._pickups = [];
    const kinds = [PowerUpKind.BOOST, PowerUpKind.SHIELD, PowerUpKind.BOLT, PowerUpKind.OIL, PowerUpKind.MISSILE];
    const colors: Record<number, number> = { [PowerUpKind.BOOST]: 0x44ff44, [PowerUpKind.SHIELD]: 0x4488ff, [PowerUpKind.BOLT]: 0xffaa00, [PowerUpKind.OIL]: 0x884422, [PowerUpKind.MISSILE]: 0xff4466 };
    for (let i = 0; i < 12; i++) {
      const segIdx = Math.floor((i / 12) * TRACK_SEGMENTS + Math.random() * 3) % TRACK_SEGMENTS;
      const lateral = (Math.random() - 0.5) * 1.2;
      const kind = kinds[i % kinds.length];
      const pos = this._getTrackPosWorld(segIdx, lateral);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshStandardMaterial({ color: colors[kind], emissive: colors[kind], emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.5 }));
      mesh.position.set(pos.x, pos.y + 0.6, pos.z);
      this._scene.add(mesh);
      this._pickups.push({ segIdx, lateral, kind, mesh, active: true, respawnTimer: 0 });
    }
  }

  private _buildRacers(): void {
    this._racers = [];
    const names = ["SIR LANCELOT", "BLACK KNIGHT", "MORGANA", "PERCIVAL"];
    const colors = [0x3366cc, 0x222222, 0xcc3366, 0x33cc66];
    for (let i = 0; i < NUM_RACERS; i++) {
      const racer: Racer = {
        trackPos: i * 2, lateralOffset: (i - 1.5) * 0.4,
        speed: 0, lap: 0, finished: false, finishTime: 0,
        mesh: null, isPlayer: i === 0, color: colors[i], name: names[i],
        powerUp: null, boostTimer: 0, shieldTimer: 0, stunTimer: 0,
        eliminated: false, targetLateral: 0, steerSmooth: 0,
      };
      this._buildRacerMesh(racer);
      this._racers.push(racer);
    }
  }

  private _buildRacerMesh(r: Racer): void {
    const g = new THREE.Group();
    // chariot body
    const bodyMat = new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.5, metalness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 1.8), bodyMat);
    body.position.y = 0.4; body.castShadow = true;
    g.add(body);
    // wheels with spokes + axle
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.7, metalness: 0.2 });
    const spokeMat = new THREE.MeshStandardMaterial({ color: 0x776644, roughness: 0.6, metalness: 0.15 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x888866, roughness: 0.4, metalness: 0.5 });
    for (const side of [-1, 1]) {
      const wheelGroup = new THREE.Group();
      // outer rim
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.04, 12, 16), rimMat);
      wheelGroup.add(rim);
      // hub
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8), wheelMat);
      hub.rotation.x = Math.PI / 2;
      wheelGroup.add(hub);
      // spokes
      for (let si = 0; si < 6; si++) {
        const sa = (si / 6) * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.02), spokeMat);
        spoke.position.set(Math.cos(sa) * 0.16, Math.sin(sa) * 0.16, 0);
        spoke.rotation.z = sa;
        wheelGroup.add(spoke);
      }
      wheelGroup.rotation.z = Math.PI / 2;
      wheelGroup.position.set(side * 0.65, 0.25, -0.4);
      g.add(wheelGroup);
    }
    // axle
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 12),
      new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.5, metalness: 0.4 }));
    axle.rotation.z = Math.PI / 2;
    axle.position.set(0, 0.25, -0.4);
    g.add(axle);
    // rider (simple knight)
    const rider = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.7, 12),
      new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.4, metalness: 0.6 }));
    rider.position.set(0, 0.95, -0.2);
    g.add(rider);
    // helmet
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.8 }));
    helm.position.set(0, 1.35, -0.2);
    g.add(helm);
    // shield indicator (invisible, shown when shield active)
    const shield = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    shield.position.y = 0.5;
    g.add(shield);
    // horses (2 simplified horse shapes in front)
    for (const side of [-0.3, 0.3]) {
      const horse = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x775533, roughness: 0.8, metalness: 0.05 }));
      horse.position.set(side, 0.4, 1.0);
      g.add(horse);
      // horse head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.8 }));
      head.position.set(side, 0.65, 1.4);
      head.rotation.x = -0.3;
      g.add(head);
    }
    // horse manes + tails
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.9 });
    for (const side of [-0.3, 0.3]) {
      // mane (small box on top of head)
      const mane = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.2), maneMat);
      mane.position.set(side, 0.78, 1.35);
      g.add(mane);
      // tail (thin box behind body)
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.35), maneMat);
      tail.position.set(side, 0.5, 0.4);
      tail.rotation.x = 0.3;
      g.add(tail);
    }
    // reins (connecting rod)
    const reins = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x553322 }));
    reins.position.set(0, 0.55, 0.5);
    g.add(reins);
    // pennant flag
    const flagMat = new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.8, side: THREE.DoubleSide, emissive: r.color, emissiveIntensity: 0.2 });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.6), flagMat);
    flag.position.set(0.4, 1.5, -0.5);
    g.add(flag);
    // flag pole
    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 10),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 }));
    flagPole.position.set(0.4, 1.0, -0.5);
    g.add(flagPole);

    // player arrow
    if (r.isPlayer) {
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 10),
        new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xffaa00, emissiveIntensity: 0.8 }));
      arrow.position.y = 1.8; arrow.rotation.x = Math.PI;
      g.add(arrow);
    }
    this._scene.add(g);
    r.mesh = g;
  }

  private _buildDustParticles(): void {
    const count = 100;
    this._dustPositions = new Float32Array(count * 3);
    this._dustLife = new Float32Array(count);
    this._dustVelocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) this._dustPositions[i * 3 + 1] = -100;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._dustPositions, 3));
    this._dustParticles = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xaa9977, size: 0.15, transparent: true, opacity: 0.5, depthWrite: false }));
    this._scene.add(this._dustParticles);
  }

  private _buildBoostTrail(): void {
    const count = 80;
    this._boostTrailPositions = new Float32Array(count * 3);
    this._boostTrailLife = new Float32Array(count);
    for (let i = 0; i < count; i++) this._boostTrailPositions[i * 3 + 1] = -100;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._boostTrailPositions, 3));
    this._boostTrailParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x44ff44, size: 0.2, transparent: true, opacity: 0.7, depthWrite: false,
    }));
    this._scene.add(this._boostTrailParticles);
  }

  private _buildTrackTorches(): void {
    for (let i = 0; i < TRACK_SEGMENTS; i += 4) {
      const p = this._trackPoints[i];
      for (const side of [-1, 1]) {
        const perpX = -Math.sin(p.angle); const perpZ = Math.cos(p.angle);
        const tx = p.x + perpX * side * (TRACK_WIDTH / 2 + 0.8);
        const tz = p.z + perpZ * side * (TRACK_WIDTH / 2 + 0.8);
        // torch pole
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.5, 10),
          new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 }));
        pole.position.set(tx, p.y + 0.75, tz);
        this._scene.add(pole);
        // flame
        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2, roughness: 1 }));
        flame.position.set(tx, p.y + 1.6, tz);
        this._scene.add(flame);
        // light (only every other torch to save perf)
        if (i % 8 === 0) {
          const light = new THREE.PointLight(0xff8833, 1.5, 8, 1.5);
          light.position.set(tx, p.y + 1.8, tz);
          this._scene.add(light);
          this._torchLights.push(light);
        }
      }
    }
  }

  private _buildTrackBanners(): void {
    const bannerColors = [0x3366cc, 0xcc3366, 0x33cc66, 0xddaa44];
    for (let i = 0; i < TRACK_SEGMENTS; i += 10) {
      const p = this._trackPoints[i];
      const side = (i / 10) % 2 === 0 ? -1 : 1;
      const perpX = -Math.sin(p.angle); const perpZ = Math.cos(p.angle);
      const bx = p.x + perpX * side * (TRACK_WIDTH / 2 + 1.2);
      const bz = p.z + perpZ * side * (TRACK_WIDTH / 2 + 1.2);
      // pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 10),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.5 }));
      pole.position.set(bx, p.y + 1.25, bz);
      this._scene.add(pole);
      // banner
      const col = bannerColors[Math.floor(i / 10) % bannerColors.length];
      const ban = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.8, side: THREE.DoubleSide, emissive: col, emissiveIntensity: 0.1 }));
      ban.position.set(bx, p.y + 2.0, bz);
      ban.rotation.y = p.angle;
      this._scene.add(ban);
      this._trackBanners.push(ban);
    }
  }

  private _buildObstacles(): void {
    for (let i = 0; i < OBSTACLE_COUNT; i++) {
      const segIdx = (10 + Math.floor((i / OBSTACLE_COUNT) * TRACK_SEGMENTS)) % TRACK_SEGMENTS;
      const lateral = (Math.random() - 0.5) * 1.6;
      const pos = this._getTrackPosWorld(segIdx, lateral);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.8, 12),
        new THREE.MeshStandardMaterial({ color: 0x885533, roughness: 0.8, metalness: 0.1 }));
      mesh.position.set(pos.x, pos.y + 0.4, pos.z);
      mesh.castShadow = true;
      this._scene.add(mesh);
      this._obstacles.push({ segIdx, lateral, mesh });
    }
  }

  private _buildRamps(): void {
    for (let i = 0; i < JUMP_RAMP_COUNT; i++) {
      const segIdx = (20 + Math.floor((i / JUMP_RAMP_COUNT) * TRACK_SEGMENTS)) % TRACK_SEGMENTS;
      const pos = this._getTrackPosWorld(segIdx, 0);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH * 0.6, 0.15, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xddaa44, roughness: 0.5, metalness: 0.3, emissive: 0xaa8822, emissiveIntensity: 0.3 }));
      mesh.position.set(pos.x, pos.y + 0.08, pos.z);
      mesh.rotation.y = pos.angle;
      this._scene.add(mesh);
      this._ramps.push({ segIdx, mesh });
    }
  }

  private _buildSpeedLines(): void {
    const count = 40;
    this._speedLinePositions = new Float32Array(count * 3);
    this._speedLineLife = new Float32Array(count);
    for (let i = 0; i < count; i++) this._speedLinePositions[i * 3 + 1] = -100;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._speedLinePositions, 3));
    this._speedLineParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.08, transparent: true, opacity: 0.4, depthWrite: false,
    }));
    this._scene.add(this._speedLineParticles);
  }

  private _buildScenery(): void {
    // floating islands around the track
    const islandMat = new THREE.MeshStandardMaterial({ color: 0x445533, roughness: 0.9, metalness: 0.05 });
    for (let si = 0; si < 8; si++) {
      const angle = (si / 8) * Math.PI * 2 + Math.random() * 0.5;
      const rd = TRACK_RADIUS * 1.3 + Math.random() * 20;
      const iw = 3 + Math.random() * 8, ih = 1 + Math.random() * 3, id = 3 + Math.random() * 6;
      const island = new THREE.Mesh(new THREE.BoxGeometry(iw, ih, id), islandMat);
      island.position.set(Math.cos(angle) * rd, -3 - Math.random() * 8, Math.sin(angle) * rd);
      island.rotation.set(Math.random() * 0.2, Math.random() * Math.PI, Math.random() * 0.1);
      this._scene.add(island);
      this._floatingIslands.push(island);
      // grass on top
      const grass = new THREE.Mesh(new THREE.BoxGeometry(iw * 0.9, 0.2, id * 0.9),
        new THREE.MeshStandardMaterial({ color: 0x5a7a3a, roughness: 0.9 }));
      grass.position.set(island.position.x, island.position.y + ih / 2 + 0.1, island.position.z);
      this._scene.add(grass);
      // occasional tree on island
      if (Math.random() > 0.5) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5, 10),
          new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 }));
        trunk.position.set(island.position.x, island.position.y + ih / 2 + 0.85, island.position.z);
        this._scene.add(trunk);
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0x447733, roughness: 0.9 }));
        canopy.position.set(island.position.x, island.position.y + ih / 2 + 2, island.position.z);
        this._scene.add(canopy);
      }
    }
    // distant ruins
    for (let ri = 0; ri < 4; ri++) {
      const ra = (ri / 4) * Math.PI * 2 + 0.5;
      const rd2 = TRACK_RADIUS * 2 + Math.random() * 15;
      const ruin = new THREE.Mesh(new THREE.BoxGeometry(2 + Math.random() * 3, 4 + Math.random() * 6, 1.5 + Math.random() * 2),
        new THREE.MeshStandardMaterial({ color: 0x555550, roughness: 0.85, metalness: 0.1 }));
      ruin.position.set(Math.cos(ra) * rd2, -2 + Math.random() * 4, Math.sin(ra) * rd2);
      ruin.rotation.y = Math.random() * Math.PI;
      this._scene.add(ruin);
    }
  }

  private _buildRacerShadows(): void {
    for (let i = 0; i < NUM_RACERS; i++) {
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.6, 8),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false })
      );
      shadow.rotation.x = -Math.PI / 2;
      this._scene.add(shadow);
      this._racerShadows.push(shadow);
    }
  }

  private _buildDriftSparks(): void {
    const count = 60;
    this._driftSparkPositions = new Float32Array(count * 3);
    this._driftSparkLife = new Float32Array(count);
    this._driftSparkVelocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) this._driftSparkPositions[i * 3 + 1] = -100;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._driftSparkPositions, 3));
    this._driftSparks = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffdd44, size: 0.1, transparent: true, opacity: 0.8, depthWrite: false,
    }));
    this._scene.add(this._driftSparks);
  }

  private _buildCrowd(): void {
    const sp = this._trackPoints[0];
    const perpX = -Math.sin(sp.angle); const perpZ = Math.cos(sp.angle);
    for (let ci = 0; ci < 20; ci++) {
      const side = ci < 10 ? -1 : 1;
      const along = (ci % 10 - 5) * 0.8;
      const cx = sp.x + perpX * side * (TRACK_WIDTH / 2 + 1.5) + Math.cos(sp.angle) * along;
      const cz = sp.z + perpZ * side * (TRACK_WIDTH / 2 + 1.5) + Math.sin(sp.angle) * along;
      const crowd = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.25),
        new THREE.MeshStandardMaterial({ color: [0x884444, 0x448844, 0x444488, 0x888844][ci % 4], roughness: 0.9 }));
      crowd.position.set(cx, sp.y + 0.35, cz);
      this._scene.add(crowd);
      this._crowdMeshes.push(crowd);
      // head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xccaa88, roughness: 0.8 }));
      head.position.set(cx, sp.y + 0.8, cz);
      this._scene.add(head);
    }
  }

  private _buildVoidDebris(): void {
    for (let vi = 0; vi < 15; vi++) {
      const size = 0.3 + Math.random() * 0.8;
      const rock = new THREE.Mesh(
        new THREE.BoxGeometry(size, size * 0.6, size),
        new THREE.MeshStandardMaterial({ color: 0x444440, roughness: 0.9, metalness: 0.05 })
      );
      rock.position.set(
        (Math.random() - 0.5) * TRACK_RADIUS * 2,
        -5 - Math.random() * 20,
        (Math.random() - 0.5) * TRACK_RADIUS * 2
      );
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random());
      this._scene.add(rock);
      this._voidDebris.push({ mesh: rock, vy: -0.01 - Math.random() * 0.02 });
    }
  }

  private _buildWaterfalls(): void {
    const count = 100;
    this._waterfallPositions = new Float32Array(count * 3);
    // position waterfalls off island edges
    for (let i = 0; i < count; i++) {
      const islandIdx = Math.floor(Math.random() * this._floatingIslands.length);
      const island = this._floatingIslands[islandIdx];
      if (!island) { this._waterfallPositions[i * 3 + 1] = -100; continue; }
      this._waterfallPositions[i * 3] = island.position.x + (Math.random() - 0.5) * 3;
      this._waterfallPositions[i * 3 + 1] = island.position.y - Math.random() * 8;
      this._waterfallPositions[i * 3 + 2] = island.position.z + (Math.random() - 0.5) * 3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._waterfallPositions, 3));
    this._waterfallParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x88bbff, size: 0.12, transparent: true, opacity: 0.4, depthWrite: false,
    }));
    this._scene.add(this._waterfallParticles);
  }

  private _buildBirds(): void {
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    for (let bi = 0; bi < 6; bi++) {
      const birdGroup = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 8), birdMat);
      birdGroup.rotation.x = Math.PI / 2;
      const angle = Math.random() * Math.PI * 2;
      const radius = 30 + Math.random() * 50;
      const y = 15 + Math.random() * 25;
      birdGroup.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      this._scene.add(birdGroup);
      this._birds.push({ mesh: birdGroup, angle, speed: 0.003 + Math.random() * 0.005, radius, y });
    }
  }

  private _buildEdgeGlow(): void {
    // glowing ribbon strips along both track edges
    for (const side of [-1, 1]) {
      const glowVerts: number[] = [];
      for (let i = 0; i <= TRACK_SEGMENTS; i++) {
        const p = this._trackPoints[i % TRACK_SEGMENTS];
        const perpX = -Math.sin(p.angle); const perpZ = Math.cos(p.angle);
        const hw = TRACK_WIDTH / 2;
        const ex = p.x + perpX * side * (hw + 0.05);
        const ez = p.z + perpZ * side * (hw + 0.05);
        glowVerts.push(ex, p.y + 0.05, ez);
        glowVerts.push(ex, p.y + 0.25, ez);
      }
      const glowIndices: number[] = [];
      for (let i = 0; i < TRACK_SEGMENTS; i++) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        glowIndices.push(a, b, c, b, d, c);
      }
      const glowGeo = new THREE.BufferGeometry();
      glowGeo.setAttribute("position", new THREE.Float32BufferAttribute(glowVerts, 3));
      glowGeo.setIndex(glowIndices);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      this._scene.add(glow);
      this._edgeGlowMeshes.push(glow);
    }
  }

  private _buildTrackUnderside(): void {
    // dark rock slab below the track ribbon
    const underVerts: number[] = [];
    const underIndices: number[] = [];
    for (let i = 0; i <= TRACK_SEGMENTS; i++) {
      const p = this._trackPoints[i % TRACK_SEGMENTS];
      const perpX = -Math.sin(p.angle); const perpZ = Math.cos(p.angle);
      const hw = TRACK_WIDTH / 2 + 0.5;
      underVerts.push(p.x + perpX * hw, p.y - 1.5, p.z + perpZ * hw);
      underVerts.push(p.x - perpX * hw, p.y - 1.5, p.z - perpZ * hw);
      if (i < TRACK_SEGMENTS) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        underIndices.push(a, c, b, b, c, d); // reversed winding for underside
      }
    }
    const underGeo = new THREE.BufferGeometry();
    underGeo.setAttribute("position", new THREE.Float32BufferAttribute(underVerts, 3));
    underGeo.setIndex(underIndices);
    this._trackUnderside = new THREE.Mesh(underGeo, new THREE.MeshStandardMaterial({ color: 0x333330, roughness: 0.9, metalness: 0.05 }));
    this._scene.add(this._trackUnderside);

    // stalactites hanging from underside
    for (let si = 0; si < TRACK_SEGMENTS; si += 6) {
      const p = this._trackPoints[si];
      const stMesh = new THREE.Mesh(new THREE.ConeGeometry(0.15 + Math.random() * 0.2, 0.5 + Math.random() * 1.5, 4),
        new THREE.MeshStandardMaterial({ color: 0x3a3a35, roughness: 0.9, metalness: 0.05 }));
      stMesh.position.set(p.x + (Math.random() - 0.5) * 3, p.y - 1.5 - Math.random() * 0.5, p.z + (Math.random() - 0.5) * 3);
      stMesh.rotation.x = Math.PI; // point downward
      this._scene.add(stMesh);
      this._stalactites.push(stMesh);
    }
  }

  private _buildCheckpointGates(): void {
    const gateMat = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false });
    for (let ci = 20; ci < TRACK_SEGMENTS; ci += 20) {
      const p = this._trackPoints[ci];
      const perpX = -Math.sin(p.angle); const perpZ = Math.cos(p.angle);
      const meshes: THREE.Mesh[] = [];
      // two vertical posts
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 12),
          new THREE.MeshStandardMaterial({ color: 0x4488cc, roughness: 0.3, metalness: 0.6, emissive: 0x2266aa, emissiveIntensity: 0.4 }));
        post.position.set(p.x + perpX * side * (TRACK_WIDTH / 2 + 0.3), p.y + 1.5, p.z + perpZ * side * (TRACK_WIDTH / 2 + 0.3));
        this._scene.add(post);
        meshes.push(post);
      }
      // connecting light beam
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_WIDTH + 0.6, 3), gateMat);
      beam.position.set(p.x, p.y + 1.5, p.z);
      beam.rotation.y = p.angle + Math.PI / 2;
      this._scene.add(beam);
      meshes.push(beam);
      this._checkpointGates.push({ segIdx: ci, meshes });
    }
  }

  private _buildAmbientMotes(): void {
    const count = 60;
    this._ambientMotePositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const p = this._trackPoints[Math.floor(Math.random() * TRACK_SEGMENTS)];
      this._ambientMotePositions[i * 3] = p.x + (Math.random() - 0.5) * TRACK_WIDTH;
      this._ambientMotePositions[i * 3 + 1] = p.y + 0.5 + Math.random() * 3;
      this._ambientMotePositions[i * 3 + 2] = p.z + (Math.random() - 0.5) * TRACK_WIDTH;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._ambientMotePositions, 3));
    this._ambientMotes = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffddaa, size: 0.08, transparent: true, opacity: 0.4, depthWrite: false }));
    this._scene.add(this._ambientMotes);
  }

  private _buildStunSparks(): void {
    const count = 50;
    this._stunSparkPositions = new Float32Array(count * 3);
    this._stunSparkLife = new Float32Array(count);
    this._stunSparkVelocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) this._stunSparkPositions[i * 3 + 1] = -100;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._stunSparkPositions, 3));
    this._stunSparkParticles = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffaa00, size: 0.12, transparent: true, opacity: 0.8, depthWrite: false }));
    this._scene.add(this._stunSparkParticles);
  }

  private _spawnStunSparks(x: number, y: number, z: number): void {
    let spawned = 0;
    for (let i = 0; i < this._stunSparkLife.length && spawned < 10; i++) {
      if (this._stunSparkLife[i] <= 0) {
        this._stunSparkPositions[i * 3] = x; this._stunSparkPositions[i * 3 + 1] = y; this._stunSparkPositions[i * 3 + 2] = z;
        this._stunSparkVelocities[i * 3] = (Math.random() - 0.5) * 5;
        this._stunSparkVelocities[i * 3 + 1] = Math.random() * 3 + 1;
        this._stunSparkVelocities[i * 3 + 2] = (Math.random() - 0.5) * 5;
        this._stunSparkLife[i] = 12 + Math.random() * 12;
        spawned++;
      }
    }
  }

  // ── input ──────────────────────────────────────────────────────────────

  private _initInput(): void {
    this._keys = {};
    this._keyDownHandler = (e) => {
      this._keys[e.code] = true;
      if (e.code === "Escape") this._handleEscape();
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this._rearView = true;
      if ((e.code === "KeyW" || e.code === "ArrowUp") && this._phase === GrandPhase.TITLE) { this._selectedMode = this._selectedMode === 0 ? 1 : 0; this._showOverlay("title"); }
      if (e.code === "KeyQ" && this._phase === GrandPhase.PAUSED) { this.destroy(); window.dispatchEvent(new Event("grandExit")); }
      if (e.code === "Space") {
        e.preventDefault();
        if (this._phase === GrandPhase.TITLE) {
          this._championshipMode = this._selectedMode === 1;
          if (this._championshipMode) { this._championshipRace = 0; this._championshipPoints = [0, 0, 0, 0]; }
          this._startRace();
        }
        else if (this._phase === GrandPhase.FINISHED) {
          if (this._championshipMode && this._championshipRace < 2) {
            this._championshipRace++;
            this._startRace();
          } else {
            this._phase = GrandPhase.TITLE; this._showOverlay("title");
          }
        }
        else if (this._phase === GrandPhase.COUNTDOWN && !this._turboStartUsed && this._countdown <= TURBO_START_WINDOW) {
          this._turboStartUsed = true;
          this._racers[0].boostTimer = TURBO_START_BOOST;
          this._showAnnouncement("TURBO START!", 1.5);
          this._playSound("boost");
        }
        else if (this._phase === GrandPhase.RACING) this._usePlayerPowerUp();
      }
    };
    this._keyUpHandler = (e) => { this._keys[e.code] = false; if (e.code === "ShiftLeft" || e.code === "ShiftRight") this._rearView = false; };
    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
  }

  private _handleEscape(): void {
    if (this._phase === GrandPhase.RACING) { this._phase = GrandPhase.PAUSED; this._showOverlay("pause"); }
    else if (this._phase === GrandPhase.PAUSED) { this._phase = GrandPhase.RACING; this._hideOverlay(); }
    else { this.destroy(); window.dispatchEvent(new Event("grandExit")); }
  }

  // ── HUD ────────────────────────────────────────────────────────────────

  private _initHUD(): void {
    this._hudDiv = document.createElement("div");
    Object.assign(this._hudDiv.style, { position: "absolute", top: "0", left: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "25", fontFamily: "'Georgia', serif" });
    document.body.appendChild(this._hudDiv);

    this._speedDiv = document.createElement("div");
    Object.assign(this._speedDiv.style, { position: "absolute", bottom: "20px", left: "20px", color: "#ffd866", fontSize: "28px", fontWeight: "bold", textShadow: "0 2px 6px rgba(0,0,0,0.8)" });
    this._hudDiv.appendChild(this._speedDiv);

    this._lapDiv = document.createElement("div");
    Object.assign(this._lapDiv.style, { position: "absolute", top: "14px", left: "50%", transform: "translateX(-50%)", color: "#ffddaa", fontSize: "20px", fontWeight: "bold", textShadow: "0 2px 6px rgba(0,0,0,0.8)" });
    this._hudDiv.appendChild(this._lapDiv);

    this._posDiv = document.createElement("div");
    Object.assign(this._posDiv.style, { position: "absolute", top: "14px", right: "20px", color: "#fff", fontSize: "24px", fontWeight: "bold", textShadow: "0 2px 6px rgba(0,0,0,0.8)" });
    this._hudDiv.appendChild(this._posDiv);

    this._powerUpDiv = document.createElement("div");
    Object.assign(this._powerUpDiv.style, { position: "absolute", bottom: "60px", left: "20px", color: "#fff", fontSize: "16px", textShadow: "0 1px 4px rgba(0,0,0,0.8)" });
    this._hudDiv.appendChild(this._powerUpDiv);

    this._countdownDiv = document.createElement("div");
    Object.assign(this._countdownDiv.style, { position: "absolute", top: "35%", left: "50%", transform: "translate(-50%,-50%)", color: "#ffd866", fontSize: "80px", fontWeight: "bold", textShadow: "0 4px 20px rgba(0,0,0,0.8)", opacity: "0", transition: "opacity 0.2s" });
    this._hudDiv.appendChild(this._countdownDiv);

    // commentary feed
    this._commentaryDiv = document.createElement("div");
    Object.assign(this._commentaryDiv.style, {
      position: "absolute", bottom: "120px", left: "20px", color: "#ddd", fontSize: "13px",
      fontStyle: "italic", textShadow: "0 1px 4px rgba(0,0,0,0.8)", opacity: "0", transition: "opacity 0.3s",
    });
    this._hudDiv.appendChild(this._commentaryDiv);

    // split time display
    this._splitDiv = document.createElement("div");
    Object.assign(this._splitDiv.style, { position: "absolute", top: "60px", left: "50%", transform: "translateX(-50%)", color: "#44ff44", fontSize: "14px", fontWeight: "bold", textShadow: "0 1px 4px rgba(0,0,0,0.8)", opacity: "0", transition: "opacity 0.3s" });
    this._hudDiv.appendChild(this._splitDiv);

    // wrong way warning
    this._wrongWayDiv = document.createElement("div");
    Object.assign(this._wrongWayDiv.style, { position: "absolute", top: "20%", left: "50%", transform: "translate(-50%,-50%)", color: "#ff4444", fontSize: "36px", fontWeight: "bold", textShadow: "0 3px 10px rgba(255,0,0,0.5)", opacity: "0", transition: "opacity 0.2s" });
    this._wrongWayDiv.textContent = "WRONG WAY!";
    this._hudDiv.appendChild(this._wrongWayDiv);

    // track name
    this._trackNameDiv = document.createElement("div");
    Object.assign(this._trackNameDiv.style, { position: "absolute", top: "80px", left: "50%", transform: "translateX(-50%)", color: "#888", fontSize: "12px", textShadow: "0 1px 3px rgba(0,0,0,0.6)" });
    this._hudDiv.appendChild(this._trackNameDiv);

    // slipstream indicator
    this._slipstreamDiv = document.createElement("div");
    Object.assign(this._slipstreamDiv.style, {
      position: "absolute", bottom: "90px", left: "20px", color: "#44ccff", fontSize: "14px",
      fontWeight: "bold", textShadow: "0 1px 4px rgba(0,0,0,0.8)", opacity: "0", transition: "opacity 0.2s",
    });
    this._slipstreamDiv.textContent = "SLIPSTREAM!";
    this._hudDiv.appendChild(this._slipstreamDiv);

    // minimap
    this._minimapCanvas = document.createElement("canvas");
    this._minimapCanvas.width = 120; this._minimapCanvas.height = 120;
    Object.assign(this._minimapCanvas.style, { position: "absolute", bottom: "14px", right: "14px", width: "120px", height: "120px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.4)" });
    this._minimapCtx = this._minimapCanvas.getContext("2d");
    this._hudDiv.appendChild(this._minimapCanvas);

    // race timer
    this._timerDiv = document.createElement("div");
    Object.assign(this._timerDiv.style, { position: "absolute", top: "40px", left: "50%", transform: "translateX(-50%)", color: "#aaa", fontSize: "14px", textShadow: "0 1px 4px rgba(0,0,0,0.7)" });
    this._hudDiv.appendChild(this._timerDiv);

    // announcements
    this._announcementDiv = document.createElement("div");
    Object.assign(this._announcementDiv.style, { position: "absolute", top: "25%", left: "50%", transform: "translate(-50%,-50%)", color: "#ffd866", fontSize: "36px", fontWeight: "bold", textShadow: "0 3px 15px rgba(0,0,0,0.8)", opacity: "0", transition: "opacity 0.3s" });
    this._hudDiv.appendChild(this._announcementDiv);

    this._overlayDiv = document.createElement("div");
    Object.assign(this._overlayDiv.style, { position: "absolute", top: "0", left: "0", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", opacity: "0", transition: "opacity 0.3s", pointerEvents: "none", zIndex: "30" });
    this._hudDiv.appendChild(this._overlayDiv);
  }

  private _showOverlay(mode: "title" | "pause" | "results"): void {
    if (!this._overlayDiv) return;
    let html = "";
    if (mode === "title") {
      html = `
        <div style="font-size:64px;font-weight:bold;color:#ffd866;text-shadow:0 4px 20px rgba(255,200,50,0.4);letter-spacing:6px;margin-bottom:8px">GRAND</div>
        <div style="font-size:18px;color:#ddbb88;margin-bottom:24px">Medieval Chariot Grand Prix</div>
        <div style="font-size:13px;color:#aaa;margin-bottom:6px">Race 3 laps around a floating sky track against 3 AI opponents</div>
        <div style="font-size:13px;color:#aaa;margin-bottom:20px">W/↑ Accelerate &nbsp;|&nbsp; S/↓ Brake &nbsp;|&nbsp; A/D/←/→ Steer &nbsp;|&nbsp; SPACE Use Power-Up</div>
        <div style="display:flex;gap:14px;margin-bottom:20px;font-size:12px">
          <div style="padding:6px 12px;border:1px solid #44ff44;border-radius:4px;color:#44ff44">BOOST</div>
          <div style="padding:6px 12px;border:1px solid #4488ff;border-radius:4px;color:#4488ff">SHIELD</div>
          <div style="padding:6px 12px;border:1px solid #ffaa00;border-radius:4px;color:#ffaa00">BOLT</div>
          <div style="padding:6px 12px;border:1px solid #884422;border-radius:4px;color:#aa6644">OIL</div>
          <div style="padding:6px 12px;border:1px solid #ff4466;border-radius:4px;color:#ff4466">MISSILE</div>
        </div>
        <div style="font-size:11px;color:#777;margin-bottom:12px">SHIFT = rear view</div>
        <div style="margin-bottom:16px;text-align:center">
          <div style="font-size:11px;color:#888;margin-bottom:3px">W — MODE</div>
          <div style="font-size:16px;color:#ffd866;font-weight:bold">${this._selectedMode === 0 ? "SINGLE RACE" : "CHAMPIONSHIP (3 Races)"}</div>
        </div>
        <div style="font-size:20px;color:#ffd866;animation:pulse 1.5s infinite">Press SPACE to Race</div>
        <div style="font-size:11px;color:#555;margin-top:10px">ESC to Quit</div>
        ${(() => { try { const w = parseInt(localStorage.getItem("grand_wins") ?? "0"); return w > 0 ? `<div style="font-size:10px;color:#444;margin-top:6px">Victories: ${w}</div>` : ""; } catch { return ""; } })()}
        <style>@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}</style>`;
    } else if (mode === "pause") {
      html = `<div style="font-size:48px;font-weight:bold;color:#ffd866;margin-bottom:16px">PAUSED</div>
        <div style="font-size:15px;color:#ccc;margin-bottom:6px">ESC — Resume</div>
        <div style="font-size:15px;color:#ccc">Q — Quit</div>`;
    } else if (mode === "results") {
      const sorted = [...this._racers].sort((a, b) => {
        if (a.finished && !b.finished) return -1;
        if (!a.finished && b.finished) return 1;
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        return (b.lap * TRACK_SEGMENTS + b.trackPos) - (a.lap * TRACK_SEGMENTS + a.trackPos);
      });
      const playerPos = sorted.findIndex(r => r.isPlayer) + 1;
      const posLabels = ["1ST", "2ND", "3RD", "4TH"];
      // save win
      if (playerPos === 1) { try { const w = parseInt(localStorage.getItem("grand_wins") ?? "0"); localStorage.setItem("grand_wins", String(w + 1)); } catch {} }
      // championship points
      if (this._championshipMode) {
        const pts = [10, 6, 3, 1];
        for (let si = 0; si < sorted.length; si++) {
          const ri = this._racers.indexOf(sorted[si]);
          this._championshipPoints[ri] += pts[si];
        }
      }
      const champInfo = this._championshipMode ? `<div style="font-size:14px;color:#ccc;margin-bottom:8px">Race ${this._championshipRace + 1}/3 — Points: ${this._racers.map((r, i) => `<span style="color:#${r.color.toString(16).padStart(6, "0")}">${r.name.split(" ")[1] ?? r.name}: ${this._championshipPoints[i]}</span>`).join(" | ")}</div>` : "";
      const champOver = this._championshipMode && this._championshipRace >= 2;
      const champWinner = champOver ? this._racers[this._championshipPoints.indexOf(Math.max(...this._championshipPoints))].name : "";
      const nextLabel = this._championshipMode && !champOver ? "Press SPACE for Next Race" : "Press SPACE to Race Again";
      html = `<div style="font-size:48px;font-weight:bold;color:${playerPos === 1 ? '#ffd866' : '#ff6644'};text-shadow:0 3px 15px rgba(0,0,0,0.5);margin-bottom:16px">${playerPos === 1 ? "VICTORY!" : `${posLabels[playerPos - 1]} PLACE`}</div>
        ${champInfo}
        ${champOver ? `<div style="font-size:20px;color:#ffd866;margin-bottom:12px;font-weight:bold">CHAMPION: ${champWinner}</div>` : ""}
        <div style="margin-bottom:20px">${sorted.map((r, i) => `<div style="color:${r.isPlayer ? '#ffd866' : '#aaa'};font-size:16px;margin:4px 0">${posLabels[i]} — ${r.name}${r.finished ? ` (${(r.finishTime / 60).toFixed(1)}s)` : ""}</div>`).join("")}</div>
        ${this._bestLapTime < Infinity ? `<div style="font-size:12px;color:#888;margin-bottom:12px">Best Lap: ${this._bestLapTime.toFixed(1)}s</div>` : ""}
        <div style="font-size:18px;color:#ffd866;animation:pulse 1.5s infinite">${nextLabel}</div>
        <style>@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}</style>`;
    }
    this._overlayDiv.innerHTML = html;
    this._overlayDiv.style.opacity = "1";
  }

  private _hideOverlay(): void { if (this._overlayDiv) this._overlayDiv.style.opacity = "0"; }

  private _updateHUD(): void {
    const p = this._racers[0];
    if (this._speedDiv) this._speedDiv.textContent = `${Math.floor(p.speed * 10)} km/h`;
    if (this._lapDiv) this._lapDiv.textContent = `Lap ${Math.min(p.lap + 1, LAPS_TO_WIN)} / ${LAPS_TO_WIN}`;
    // race position
    const sorted = [...this._racers].sort((a, b) => (b.lap * TRACK_SEGMENTS + b.trackPos) - (a.lap * TRACK_SEGMENTS + a.trackPos));
    const pos = sorted.findIndex(r => r.isPlayer) + 1;
    const posLabels = ["1ST", "2ND", "3RD", "4TH"];
    if (this._posDiv) { this._posDiv.textContent = posLabels[pos - 1]; this._posDiv.style.color = pos === 1 ? "#ffd866" : "#fff"; }
    // power-up
    if (this._powerUpDiv) {
      const puNames: Record<number, [string, string]> = { [PowerUpKind.BOOST]: ["BOOST", "#44ff44"], [PowerUpKind.SHIELD]: ["SHIELD", "#4488ff"], [PowerUpKind.BOLT]: ["BOLT", "#ffaa00"], [PowerUpKind.OIL]: ["OIL", "#aa6644"], [PowerUpKind.MISSILE]: ["MISSILE", "#ff4466"] };
      if (p.powerUp !== null) {
        const [name, col] = puNames[p.powerUp];
        this._powerUpDiv.innerHTML = `<span style="color:${col}">[SPACE] ${name}</span>`;
      } else { this._powerUpDiv.textContent = ""; }
    }
    // timer
    if (this._timerDiv) {
      const sec = this._frame / 60;
      const min = Math.floor(sec / 60); const s = (sec % 60).toFixed(1);
      this._timerDiv.textContent = `${min}:${parseFloat(s) < 10 ? "0" : ""}${s}${this._bestLapTime < Infinity ? ` | Best: ${this._bestLapTime.toFixed(1)}s` : ""}`;
    }
    // minimap
    if (this._minimapCtx) {
      const mc = this._minimapCtx; const mw = 120;
      mc.clearRect(0, 0, mw, mw);
      mc.strokeStyle = "rgba(255,200,100,0.3)"; mc.lineWidth = 2; mc.beginPath();
      for (let i = 0; i <= TRACK_SEGMENTS; i++) {
        const tp = this._trackPoints[i % TRACK_SEGMENTS];
        const mx = 60 + (tp.x / TRACK_RADIUS) * 45, mz = 60 + (tp.z / TRACK_RADIUS) * 45;
        if (i === 0) mc.moveTo(mx, mz); else mc.lineTo(mx, mz);
      }
      mc.closePath(); mc.stroke();
      const rColors = [0x3366cc, 0x444444, 0xcc3366, 0x33cc66];
      for (let ri = 0; ri < this._racers.length; ri++) {
        const r = this._racers[ri];
        const rw = this._getTrackPosWorld(r.trackPos, 0);
        const mx = 60 + (rw.x / TRACK_RADIUS) * 45, mz = 60 + (rw.z / TRACK_RADIUS) * 45;
        mc.beginPath(); mc.arc(mx, mz, r.isPlayer ? 4 : 3, 0, Math.PI * 2);
        mc.fillStyle = `#${rColors[ri].toString(16).padStart(6, "0")}`;
        mc.fill();
        if (r.isPlayer) { mc.strokeStyle = "#fff"; mc.lineWidth = 1.5; mc.stroke(); }
      }
    }
    // engine pitch
    if (this._engineNode && this._engineGain) {
      this._engineNode.frequency.value = 60 + p.speed * 8;
      this._engineGain.gain.value = 0.02 + p.speed * 0.002;
    }
  }

  // ── game flow ──────────────────────────────────────────────────────────

  private _startRace(): void {
    for (let i = 0; i < this._racers.length; i++) {
      const r = this._racers[i];
      r.trackPos = i * 2; r.lateralOffset = (i - 1.5) * 0.4;
      r.speed = 0; r.lap = 0; r.finished = false; r.finishTime = 0;
      r.powerUp = null; r.boostTimer = 0; r.shieldTimer = 0; r.stunTimer = 0; r.eliminated = false;
    }
    for (const pu of this._pickups) { pu.active = true; pu.respawnTimer = 0; if (pu.mesh) pu.mesh.visible = true; }
    this._frame = 0;
    this._countdown = 180; // 3 seconds
    this._phase = GrandPhase.COUNTDOWN;
    this._hideOverlay();
    this._bestLapTime = Infinity;
    this._lapStartFrame = 0;
    this._finalLapTriggered = false;
    this._turboStartUsed = false;
    this._prevTrackPos = 0;
    // random track layout per race
    if (this._championshipMode) this._trackLayout = this._championshipRace;
    else this._trackLayout = Math.floor(Math.random() * TRACK_LAYOUTS.length);
    // random weather
    const weathers: Array<"clear" | "rain" | "fog"> = ["clear", "clear", "rain", "fog"];
    this._weather = weathers[Math.floor(Math.random() * weathers.length)];
    // AI personalities
    this._aiPersonality = ["aggressive", "defensive", "dirty"];
    this._lastPosition = 1;
    // clear weapon visuals
    for (const bp of this._boltProjectiles) { this._scene.remove(bp.mesh); }
    this._boltProjectiles = [];
    for (const op of this._oilPuddles) { this._scene.remove(op.mesh); }
    this._oilPuddles = [];
    this._startEngine();
    this._startWind();
    // clear missiles
    for (const m of this._missiles) { this._scene.remove(m.mesh); } this._missiles = [];
    // track name
    const layoutName = TRACK_LAYOUTS[this._trackLayout % TRACK_LAYOUTS.length].name;
    if (this._trackNameDiv) this._trackNameDiv.textContent = `${layoutName}${this._weather !== "clear" ? ` — ${this._weather.toUpperCase()}` : ""}`;
    // apply weather
    if (this._weather === "rain") {
      this._scene.fog = new THREE.FogExp2(0x223344, 0.006);
      this._scene.background = new THREE.Color(0x112233);
    } else if (this._weather === "fog") {
      (this._scene.fog as THREE.FogExp2).density = 0.008;
    } else {
      this._scene.fog = new THREE.FogExp2(0x224466, 0.004);
      this._scene.background = new THREE.Color(0x1a2a4a);
    }
  }

  private _usePlayerPowerUp(): void {
    const p = this._racers[0];
    if (p.powerUp === null) return;
    if (p.powerUp === PowerUpKind.BOOST) { p.boostTimer = BOOST_DURATION; this._playSound("boost"); }
    else if (p.powerUp === PowerUpKind.SHIELD) { p.shieldTimer = 300; this._playSound("boost"); }
    else if (p.powerUp === PowerUpKind.BOLT) {
      // hit the racer directly ahead
      let target: Racer | null = null; let bestDist = 999;
      for (const r of this._racers) {
        if (r === p || r.finished) continue;
        const ahead = (r.lap * TRACK_SEGMENTS + r.trackPos) - (p.lap * TRACK_SEGMENTS + p.trackPos);
        if (ahead > 0 && ahead < bestDist) { bestDist = ahead; target = r; }
      }
      if (target) {
        target.stunTimer = 60; target.speed *= 0.3; this._playSound("bolt");
        // spawn bolt projectile visual
        const pw = this._getTrackPosWorld(p.trackPos, p.lateralOffset);
        const boltMesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 2, transparent: true, opacity: 0.8 }));
        boltMesh.position.set(pw.x, pw.y + 0.8, pw.z);
        this._scene.add(boltMesh);
        this._boltProjectiles.push({ mesh: boltMesh, targetIdx: this._racers.indexOf(target), life: 30 });
        this._chromaticTarget = 0.03;
      }
    } else if (p.powerUp === PowerUpKind.OIL) {
      // drop oil puddle behind
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(1.0, 8),
        new THREE.MeshBasicMaterial({ color: 0x442211, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
      const pw2 = this._getTrackPosWorld(p.trackPos - 2, p.lateralOffset);
      puddle.position.set(pw2.x, pw2.y + 0.02, pw2.z);
      puddle.rotation.x = -Math.PI / 2;
      this._scene.add(puddle);
      this._oilPuddles.push({ segIdx: Math.floor(p.trackPos - 2 + TRACK_SEGMENTS) % TRACK_SEGMENTS, lateral: p.lateralOffset, mesh: puddle, life: 600 });
      this._playSound("hit");
    } else if (p.powerUp === PowerUpKind.MISSILE) {
      const mMesh = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 10),
        new THREE.MeshStandardMaterial({ color: 0xff4466, emissive: 0xff2244, emissiveIntensity: 1.5 }));
      mMesh.rotation.x = Math.PI / 2;
      const pw2 = this._getTrackPosWorld(p.trackPos, p.lateralOffset);
      mMesh.position.set(pw2.x, pw2.y + 0.5, pw2.z);
      this._scene.add(mMesh);
      this._missiles.push({ mesh: mMesh, trackPos: p.trackPos + 1, lateral: p.lateralOffset, speed: 1.2, life: 180 });
      this._playSound("bolt");
      this._showCommentary("Missile launched!");
    }
    p.powerUp = null;
  }

  private _spawnConfetti(): void {
    if (this._confettiParticles) { this._scene.remove(this._confettiParticles); }
    const count = 150;
    this._confettiPositions = new Float32Array(count * 3);
    this._confettiLife = new Float32Array(count);
    this._confettiVelocities = new Float32Array(count * 3);
    const pr3 = this._racers[0];
    const prw = this._getTrackPosWorld(pr3.trackPos, pr3.lateralOffset);
    for (let i = 0; i < count; i++) {
      this._confettiPositions[i * 3] = prw.x + (Math.random() - 0.5) * 4;
      this._confettiPositions[i * 3 + 1] = prw.y + 2 + Math.random() * 3;
      this._confettiPositions[i * 3 + 2] = prw.z + (Math.random() - 0.5) * 4;
      this._confettiVelocities[i * 3] = (Math.random() - 0.5) * 4;
      this._confettiVelocities[i * 3 + 1] = Math.random() * 3 + 1;
      this._confettiVelocities[i * 3 + 2] = (Math.random() - 0.5) * 4;
      this._confettiLife[i] = 60 + Math.random() * 120;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._confettiPositions, 3));
    this._confettiParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffd866, size: 0.15, transparent: true, opacity: 0.8, depthWrite: false,
    }));
    this._scene.add(this._confettiParticles);
  }

  private _showCommentary(text: string): void {
    if (!this._commentaryDiv) return;
    this._commentaryDiv.textContent = text;
    this._commentaryDiv.style.opacity = "1";
    if (this._commentaryTimeout) clearTimeout(this._commentaryTimeout);
    this._commentaryTimeout = setTimeout(() => { if (this._commentaryDiv) this._commentaryDiv.style.opacity = "0"; }, 2500);
  }

  private _startWind(): void {
    try {
      const ctx = this._ensureAudio();
      if (this._windNode) { this._windNode.stop(); this._windNode = null; }
      const buf = ctx.createBuffer(1, ctx.sampleRate * 10, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() - 0.5) * 0.06;
      this._windNode = ctx.createOscillator(); // placeholder - use noise instead
      // use buffer source for noise-based wind
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = buf; windSrc.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass"; filter.frequency.value = 300; filter.Q.value = 0.5;
      this._windGain = ctx.createGain(); this._windGain.gain.value = 0;
      windSrc.connect(filter).connect(this._windGain).connect(ctx.destination);
      windSrc.start();
      this._windNode = windSrc as any; // store for stopping
    } catch {}
  }

  private _showAnnouncement(text: string, duration: number = 2): void {
    if (!this._announcementDiv) return;
    this._announcementDiv.textContent = text;
    this._announcementDiv.style.opacity = "1";
    setTimeout(() => { if (this._announcementDiv) this._announcementDiv.style.opacity = "0"; }, duration * 1000);
  }

  private _startEngine(): void {
    try {
      const ctx = this._ensureAudio();
      if (this._engineNode) { this._engineNode.stop(); this._engineNode = null; }
      this._engineNode = ctx.createOscillator();
      this._engineNode.type = "sawtooth";
      this._engineNode.frequency.value = 60;
      this._engineGain = ctx.createGain();
      this._engineGain.gain.value = 0.03;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass"; filter.frequency.value = 150;
      this._engineNode.connect(filter).connect(this._engineGain).connect(ctx.destination);
      this._engineNode.start();
    } catch {}
  }

  private _stopEngine(): void {
    if (this._engineNode) { try { this._engineNode.stop(); } catch {} this._engineNode = null; }
  }

  // ── update ─────────────────────────────────────────────────────────────

  private _update(dtSec: number): void {
    if (this._phase === GrandPhase.TITLE || this._phase === GrandPhase.FINISHED) {
      this._frame++;
      this._renderTitle();
      return;
    }
    if (this._phase === GrandPhase.PAUSED) { this._render(); return; }

    this._simAccum += dtSec;
    while (this._simAccum >= SIM_DT) {
      this._simAccum -= SIM_DT;
      this._simTick();
    }
    this._render();
    this._updateHUD();
  }

  private _simTick(): void {
    this._frame++;

    // countdown
    if (this._phase === GrandPhase.COUNTDOWN) {
      this._countdown--;
      const sec = Math.ceil(this._countdown / 60);
      if (this._countdownDiv) {
        if (this._countdown > 0) {
          this._countdownDiv.textContent = `${sec}`;
          this._countdownDiv.style.opacity = "1";
          if (this._countdown % 60 === 0) this._playSound("countdown");
        } else {
          this._countdownDiv.textContent = "GO!";
          this._countdownDiv.style.color = "#44ff44";
          this._playSound("go");
          setTimeout(() => { if (this._countdownDiv) { this._countdownDiv.style.opacity = "0"; this._countdownDiv.style.color = "#ffd866"; } }, 800);
          this._phase = GrandPhase.RACING;
        }
      }
      return;
    }

    // update racers
    for (let i = 0; i < this._racers.length; i++) {
      const r = this._racers[i];
      if (r.finished) continue;
      if (r.stunTimer > 0) {
        r.stunTimer--;
        r.speed *= 0.97;
        // recovery boost: brief speed burst when stun ends
        if (r.stunTimer === 0) { r.speed = Math.max(r.speed, MAX_SPEED * 0.6); if (r.isPlayer) this._playSound("boost"); }
      }

      if (r.isPlayer) this._updatePlayerRacer(r);
      else this._updateAIRacer(r, i);

      // boost
      if (r.boostTimer > 0) {
        r.boostTimer--;
        r.speed = Math.min(r.speed + 0.5, BOOST_SPEED);
      }
      // timers
      if (r.shieldTimer > 0) r.shieldTimer--;

      // move along track
      const spd = r.speed * SIM_DT;
      r.trackPos += spd * 0.5;
      // wrap track
      if (r.trackPos >= TRACK_SEGMENTS) {
        r.trackPos -= TRACK_SEGMENTS;
        r.lap++;
        if (r.isPlayer) {
          this._playSound("lap");
          const lapTime = (this._frame - this._lapStartFrame) / 60;
          const isBest = lapTime < this._bestLapTime;
          if (isBest) this._bestLapTime = lapTime;
          this._lapStartFrame = this._frame;
          if (r.lap < LAPS_TO_WIN) this._showAnnouncement(`LAP ${r.lap + 1}`, 1.5);
          // split time display
          if (this._splitDiv) {
            this._splitDiv.textContent = `${lapTime.toFixed(1)}s${isBest ? " ★ BEST!" : ""}`;
            this._splitDiv.style.color = isBest ? "#ffd866" : "#44ff44";
            this._splitDiv.style.opacity = "1";
            setTimeout(() => { if (this._splitDiv) this._splitDiv.style.opacity = "0"; }, 2500);
          }
        }
        if (r.lap >= LAPS_TO_WIN) {
          r.finished = true; r.finishTime = this._frame;
          if (r.isPlayer) {
            this._playSound("finish"); this._stopEngine();
            if (this._windNode) { try { (this._windNode as any).stop(); } catch {} this._windNode = null; }
            this._shakeIntensity = 0.2;
            this._chromaticTarget = 0.05;
            if (this._bloomPass) this._bloomPass.strength = 1.5;
            // confetti burst
            this._spawnConfetti();
          }
          // check if all finished
          if (this._racers.every(rr => rr.finished)) {
            this._phase = GrandPhase.FINISHED;
            this._showOverlay("results");
          } else if (r.isPlayer) {
            // player finished, wait for others
            setTimeout(() => {
              for (const rr of this._racers) { if (!rr.finished) { rr.finished = true; rr.finishTime = this._frame + 60; } }
              this._phase = GrandPhase.FINISHED;
              this._showOverlay("results");
            }, 2000);
          }
        }
      }
      r.lateralOffset = Math.max(-1, Math.min(1, r.lateralOffset));
    }

    // racer-racer collision
    for (let i = 0; i < this._racers.length; i++) {
      for (let j = i + 1; j < this._racers.length; j++) {
        const a = this._racers[i], b = this._racers[j];
        if (a.finished || b.finished) continue;
        const aw = this._getTrackPosWorld(a.trackPos, a.lateralOffset);
        const bw = this._getTrackPosWorld(b.trackPos, b.lateralOffset);
        const dx = aw.x - bw.x, dz = aw.z - bw.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < 1.5 && d > 0.01) {
          // push apart laterally
          const push = (1.5 - d) * 0.02;
          if (a.lateralOffset < b.lateralOffset) { a.lateralOffset -= push; b.lateralOffset += push; }
          else { a.lateralOffset += push; b.lateralOffset -= push; }
          // shield deflection
          if (a.shieldTimer > 0 && b.shieldTimer <= 0) { b.speed *= 0.5; b.stunTimer = Math.max(b.stunTimer, 20); this._shakeIntensity = 0.15; this._playSound("hit"); const bw2 = this._getTrackPosWorld(b.trackPos, b.lateralOffset); this._spawnStunSparks(bw2.x, bw2.y + 0.5, bw2.z); }
          if (b.shieldTimer > 0 && a.shieldTimer <= 0) { a.speed *= 0.5; a.stunTimer = Math.max(a.stunTimer, 20); this._shakeIntensity = 0.15; this._playSound("hit"); const aw2 = this._getTrackPosWorld(a.trackPos, a.lateralOffset); this._spawnStunSparks(aw2.x, aw2.y + 0.5, aw2.z); }
          // bump sound for player
          if ((a.isPlayer || b.isPlayer) && this._frame % 30 === 0) this._playSound("hit");
        }
      }
    }

    // wrong way detection
    if (this._wrongWayDiv) {
      const pr0 = this._racers[0];
      const delta = pr0.trackPos - this._prevTrackPos;
      const isWrongWay = delta < -0.1 && Math.abs(delta) < TRACK_SEGMENTS / 2;
      this._wrongWayDiv.style.opacity = isWrongWay ? "1" : "0";
      this._prevTrackPos = pr0.trackPos;
    }

    // weather: rain affects friction
    if (this._weather === "rain") {
      for (const r of this._racers) {
        if (!r.finished) r.speed *= 0.998; // slight extra friction in rain
      }
    }

    // slipstream: player gets speed boost when directly behind another racer
    const pr = this._racers[0];
    let inSlipstream = false;
    if (!pr.finished) {
      for (const r of this._racers) {
        if (r === pr || r.finished) continue;
        const ahead = (r.lap * TRACK_SEGMENTS + r.trackPos) - (pr.lap * TRACK_SEGMENTS + pr.trackPos);
        if (ahead > 0 && ahead < 3 && Math.abs(r.lateralOffset - pr.lateralOffset) < 0.4) {
          inSlipstream = true;
          pr.speed = Math.min(pr.speed + 0.15, MAX_SPEED * 1.1);
          break;
        }
      }
    }
    if (this._slipstreamDiv) this._slipstreamDiv.style.opacity = inSlipstream ? "1" : "0";

    // position change callout
    const sorted2 = [...this._racers].sort((a, b) => (b.lap * TRACK_SEGMENTS + b.trackPos) - (a.lap * TRACK_SEGMENTS + a.trackPos));
    const currentPos = sorted2.findIndex(r2 => r2.isPlayer) + 1;
    if (currentPos !== this._lastPosition && this._lastPosition > 0 && this._phase === GrandPhase.RACING) {
      const posLabels2 = ["1ST", "2ND", "3RD", "4TH"];
      const gained = currentPos < this._lastPosition;
      this._showAnnouncement(`${posLabels2[currentPos - 1]}!`, 1);
      if (gained) {
        this._playSound("boost");
        const overtook = sorted2[currentPos]; // racer we passed
        if (overtook) this._showCommentary(`Overtook ${overtook.name}!`);
      } else {
        const passedBy = sorted2[currentPos - 2];
        if (passedBy) this._showCommentary(`${passedBy.name} takes the position!`);
      }
    }
    this._lastPosition = currentPos;

    // final lap warning
    if (pr.lap === LAPS_TO_WIN - 1 && !this._finalLapTriggered) {
      this._finalLapTriggered = true;
      this._showAnnouncement("FINAL LAP!", 2);
      this._shakeIntensity = 0.1;
      if (this._bloomPass) this._bloomPass.strength = 1.0;
    }

    // update bolt projectiles
    for (let bi = this._boltProjectiles.length - 1; bi >= 0; bi--) {
      const bp = this._boltProjectiles[bi];
      bp.life--;
      const target = this._racers[bp.targetIdx];
      if (target && !target.finished) {
        const tw = this._getTrackPosWorld(target.trackPos, target.lateralOffset);
        bp.mesh.position.lerp(new THREE.Vector3(tw.x, tw.y + 0.5, tw.z), 0.15);
        if (bp.mesh.position.distanceTo(new THREE.Vector3(tw.x, tw.y + 0.5, tw.z)) < 1) bp.life = 0;
      }
      if (bp.life <= 0) { this._scene.remove(bp.mesh); bp.mesh.geometry.dispose(); (bp.mesh.material as THREE.Material).dispose(); this._boltProjectiles.splice(bi, 1); }
    }

    // update oil puddles
    for (let oi = this._oilPuddles.length - 1; oi >= 0; oi--) {
      const op = this._oilPuddles[oi];
      op.life--;
      if (op.life <= 0) { this._scene.remove(op.mesh); op.mesh.geometry.dispose(); (op.mesh.material as THREE.Material).dispose(); this._oilPuddles.splice(oi, 1); continue; }
      // check racers hitting puddle
      const ow = this._getTrackPosWorld(op.segIdx, op.lateral);
      for (const r of this._racers) {
        if (r.finished || r.shieldTimer > 0) continue;
        const rw = this._getTrackPosWorld(r.trackPos, r.lateralOffset);
        const dx = rw.x - ow.x, dz = rw.z - ow.z;
        if (dx * dx + dz * dz < 1.5) { r.speed *= 0.4; r.stunTimer = Math.max(r.stunTimer, 30); if (r.isPlayer) { this._shakeIntensity = 0.15; this._playSound("hit"); } }
      }
    }

    // update missiles (homing along track)
    for (let mi = this._missiles.length - 1; mi >= 0; mi--) {
      const m = this._missiles[mi];
      m.life--;
      m.trackPos += m.speed;
      if (m.trackPos >= TRACK_SEGMENTS) m.trackPos -= TRACK_SEGMENTS;
      const mw = this._getTrackPosWorld(m.trackPos, m.lateral);
      m.mesh.position.set(mw.x, mw.y + 0.5, mw.z);
      m.mesh.rotation.y = -mw.angle + Math.PI / 2;
      // hit racers
      let hit = false;
      for (const r of this._racers) {
        if (r.isPlayer || r.finished || r.shieldTimer > 0) continue;
        const rw = this._getTrackPosWorld(r.trackPos, r.lateralOffset);
        const dx = mw.x - rw.x, dz = mw.z - rw.z;
        if (dx * dx + dz * dz < 2) {
          r.stunTimer = 90; r.speed *= 0.2;
          this._spawnStunSparks(rw.x, rw.y + 0.5, rw.z);
          this._shakeIntensity = 0.2; this._chromaticTarget = 0.04;
          this._playSound("hit");
          this._showCommentary(`${r.name} hit by missile!`);
          hit = true; break;
        }
      }
      if (hit || m.life <= 0) { this._scene.remove(m.mesh); m.mesh.geometry.dispose(); (m.mesh.material as THREE.Material).dispose(); this._missiles.splice(mi, 1); }
    }

    // pickup collision
    for (const pu of this._pickups) {
      if (!pu.active) {
        pu.respawnTimer--;
        if (pu.respawnTimer <= 0) {
          pu.active = true;
          if (pu.mesh) { pu.mesh.visible = true; pu.mesh.scale.setScalar(0.01); } // spawn small, will grow
        }
        continue;
      }
      // grow-in animation after respawn
      if (pu.mesh && pu.mesh.scale.x < 0.95) pu.mesh.scale.setScalar(Math.min(1, pu.mesh.scale.x + 0.05));
      const puWorld = this._getTrackPosWorld(pu.segIdx, pu.lateral);
      for (const r of this._racers) {
        const rWorld = this._getTrackPosWorld(r.trackPos, r.lateralOffset);
        const dx = rWorld.x - puWorld.x, dz = rWorld.z - puWorld.z;
        if (dx * dx + dz * dz < 2.5) {
          if (r.powerUp === null) {
            r.powerUp = pu.kind;
            pu.active = false;
            pu.respawnTimer = POWERUP_RESPAWN;
            if (pu.mesh) pu.mesh.visible = false;
            if (r.isPlayer) this._playSound("boost");
            // AI auto-use power-ups offensively
            if (!r.isPlayer) setTimeout(() => {
              if (r.powerUp === null) return;
              if (r.powerUp === PowerUpKind.BOOST) { r.boostTimer = BOOST_DURATION; }
              else if (r.powerUp === PowerUpKind.SHIELD) { r.shieldTimer = 300; }
              else if (r.powerUp === PowerUpKind.BOLT) {
                // target player if they're ahead
                const pr2 = this._racers[0];
                const ahead = (pr2.lap * TRACK_SEGMENTS + pr2.trackPos) - (r.lap * TRACK_SEGMENTS + r.trackPos);
                if (ahead > 0 && ahead < 20) { pr2.stunTimer = 60; pr2.speed *= 0.3; this._shakeIntensity = 0.2; this._chromaticTarget = 0.04; this._playSound("bolt"); this._showAnnouncement("BOLT!", 1); }
              } else if (r.powerUp === PowerUpKind.OIL) {
                // drop oil behind
                const ow = this._getTrackPosWorld(r.trackPos - 2, r.lateralOffset);
                const puddle = new THREE.Mesh(new THREE.CircleGeometry(1.0, 8), new THREE.MeshBasicMaterial({ color: 0x442211, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
                puddle.position.set(ow.x, ow.y + 0.02, ow.z); puddle.rotation.x = -Math.PI / 2;
                this._scene.add(puddle);
                this._oilPuddles.push({ segIdx: Math.floor(r.trackPos - 2 + TRACK_SEGMENTS) % TRACK_SEGMENTS, lateral: r.lateralOffset, mesh: puddle, life: 600 });
              }
              r.powerUp = null;
            }, 1500 + Math.random() * 2000);
          }
          break;
        }
      }
    }

    // obstacle collision
    for (const obs of this._obstacles) {
      const ow = this._getTrackPosWorld(obs.segIdx, obs.lateral);
      for (const r of this._racers) {
        if (r.finished) continue;
        const rw = this._getTrackPosWorld(r.trackPos, r.lateralOffset);
        const dx = rw.x - ow.x, dz = rw.z - ow.z;
        if (dx * dx + dz * dz < 1.0 && r.shieldTimer <= 0) {
          r.speed *= 0.4;
          r.stunTimer = Math.max(r.stunTimer, 15);
          this._spawnStunSparks(ow.x, ow.y + 0.5, ow.z);
          if (r.isPlayer) { this._shakeIntensity = 0.2; this._chromaticTarget = 0.04; this._playSound("hit"); }
        }
      }
    }

    // ramp jump
    for (const ramp of this._ramps) {
      for (const r of this._racers) {
        if (r.finished) continue;
        const segDist = Math.abs(r.trackPos - ramp.segIdx);
        if ((segDist < 0.8 || segDist > TRACK_SEGMENTS - 0.8) && r.speed > 8) {
          r.speed *= 1.05; // slight speed boost on ramp
          if (r.isPlayer && this._frame % 60 > 55) this._playSound("boost");
        }
      }
    }

    // dust from racers
    for (const r of this._racers) {
      if (r.speed > 5 && this._frame % 3 === 0) {
        const world = this._getTrackPosWorld(r.trackPos, r.lateralOffset);
        this._spawnDust(world.x, world.y, world.z);
      }
    }
    // update dust
    for (let i = 0; i < this._dustLife.length; i++) {
      if (this._dustLife[i] > 0) {
        this._dustLife[i]--;
        this._dustPositions[i * 3] += this._dustVelocities[i * 3] * SIM_DT;
        this._dustPositions[i * 3 + 1] += this._dustVelocities[i * 3 + 1] * SIM_DT;
        this._dustPositions[i * 3 + 2] += this._dustVelocities[i * 3 + 2] * SIM_DT;
        this._dustVelocities[i * 3 + 1] -= 3 * SIM_DT;
      } else {
        this._dustPositions[i * 3 + 1] = -100;
      }
    }
    (this._dustParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // drift sparks update
    for (let si = 0; si < this._driftSparkLife.length; si++) {
      if (this._driftSparkLife[si] > 0) {
        this._driftSparkLife[si]--;
        this._driftSparkPositions[si * 3] += this._driftSparkVelocities[si * 3] * SIM_DT;
        this._driftSparkPositions[si * 3 + 1] += this._driftSparkVelocities[si * 3 + 1] * SIM_DT;
        this._driftSparkPositions[si * 3 + 2] += this._driftSparkVelocities[si * 3 + 2] * SIM_DT;
        this._driftSparkVelocities[si * 3 + 1] -= 10 * SIM_DT;
      } else {
        this._driftSparkPositions[si * 3 + 1] = -100;
      }
    }
    (this._driftSparks.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private _spawnDust(x: number, y: number, z: number): void {
    for (let i = 0; i < this._dustLife.length; i++) {
      if (this._dustLife[i] <= 0) {
        this._dustPositions[i * 3] = x + (Math.random() - 0.5) * 0.5;
        this._dustPositions[i * 3 + 1] = y;
        this._dustPositions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.5;
        this._dustVelocities[i * 3] = (Math.random() - 0.5) * 2;
        this._dustVelocities[i * 3 + 1] = Math.random() * 2 + 0.5;
        this._dustVelocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
        this._dustLife[i] = 20 + Math.random() * 20;
        return;
      }
    }
  }

  private _updatePlayerRacer(r: Racer): void {
    if (r.stunTimer > 0 || r.eliminated) return;
    const accel = this._keys["KeyW"] || this._keys["ArrowUp"];
    const brake = this._keys["KeyS"] || this._keys["ArrowDown"];
    const left = this._keys["KeyA"] || this._keys["ArrowLeft"];
    const right = this._keys["KeyD"] || this._keys["ArrowRight"];

    // corner speed penalty: sharp turns slow you down
    const segIdx = Math.floor(r.trackPos) % TRACK_SEGMENTS;
    const sharpness = this._cornerSharpness[segIdx] ?? 0;
    const cornerPenalty = 1 - sharpness * 2; // sharper = more penalty
    const effectiveMax = r.boostTimer > 0 ? BOOST_SPEED : MAX_SPEED * Math.max(0.6, cornerPenalty);

    if (accel) r.speed = Math.min(r.speed + ACCEL * SIM_DT, effectiveMax);
    else if (brake) r.speed = Math.max(0, r.speed - BRAKE_DECEL * SIM_DT);
    r.speed *= FRICTION;

    // drift: brake + steer = faster turning with sparks
    const steering = left || right;
    this._isDrifting = brake && steering && r.speed > 6;
    const steerMult = this._isDrifting ? 1.8 : 1;
    if (left) r.lateralOffset -= STEER_SPEED * steerMult * SIM_DT;
    if (right) r.lateralOffset += STEER_SPEED * steerMult * SIM_DT;

    // drift sparks
    if (this._isDrifting && this._frame % DRIFT_SPARK_RATE === 0) {
      const rw = this._getTrackPosWorld(r.trackPos, r.lateralOffset);
      for (let si = 0; si < this._driftSparkLife.length; si++) {
        if (this._driftSparkLife[si] <= 0) {
          this._driftSparkPositions[si * 3] = rw.x + (Math.random() - 0.5) * 0.3;
          this._driftSparkPositions[si * 3 + 1] = rw.y + 0.1;
          this._driftSparkPositions[si * 3 + 2] = rw.z + (Math.random() - 0.5) * 0.3;
          this._driftSparkVelocities[si * 3] = (Math.random() - 0.5) * 3;
          this._driftSparkVelocities[si * 3 + 1] = Math.random() * 2 + 1;
          this._driftSparkVelocities[si * 3 + 2] = (Math.random() - 0.5) * 3;
          this._driftSparkLife[si] = 10 + Math.random() * 10;
          break;
        }
      }
    }

    // edge elimination check
    if (Math.abs(r.lateralOffset) > EDGE_FALL_LATERAL && r.shieldTimer <= 0) {
      r.eliminated = true;
      r.speed = 0;
      if (r.mesh) r.mesh.visible = false;
      this._shakeIntensity = 0.3;
      this._chromaticTarget = 0.06;
      this._playSound("hit");
      this._showAnnouncement("FELL OFF!", 2);
      // respawn after 2 seconds
      setTimeout(() => {
        r.eliminated = false;
        r.lateralOffset = 0;
        r.speed = MAX_SPEED * 0.5;
        r.stunTimer = 30;
        if (r.mesh) r.mesh.visible = true;
      }, 2000);
    }
  }

  private _updateAIRacer(r: Racer, idx: number): void {
    if (r.stunTimer > 0 || r.eliminated) return;
    const skill = AI_SKILL[Math.min(idx - 1, AI_SKILL.length - 1)] ?? 0.9;
    // rubber-banding: AI speeds up when behind player, slows when ahead
    const playerProgress = this._racers[0].lap * TRACK_SEGMENTS + this._racers[0].trackPos;
    const myProgress = r.lap * TRACK_SEGMENTS + r.trackPos;
    const gap = playerProgress - myProgress;
    const rubberBand = 1 + Math.max(-0.15, Math.min(RUBBER_BAND_STRENGTH, gap * 0.005));
    const targetSpeed = MAX_SPEED * skill * rubberBand * (0.9 + Math.sin(this._frame * 0.01 + idx * 2) * 0.1);
    r.speed += (targetSpeed - r.speed) * 0.05;
    r.speed *= FRICTION;

    // personality-based steering
    const personality = this._aiPersonality[idx - 1] ?? "defensive";
    const laneChangeFreq = personality === "aggressive" ? 80 : personality === "dirty" ? 100 : 150;
    if (this._frame % laneChangeFreq === idx * 20) {
      // aggressive: tries to block player's lane
      if (personality === "aggressive") {
        r.targetLateral = this._racers[0].lateralOffset + (Math.random() - 0.5) * 0.3;
      } else {
        r.targetLateral = (Math.random() - 0.5) * 1.4;
      }
    }
    r.steerSmooth += (r.targetLateral - r.lateralOffset) * 0.03;
    r.steerSmooth *= 0.95;
    r.lateralOffset += r.steerSmooth * SIM_DT * 3;
  }

  // ── render ─────────────────────────────────────────────────────────────

  private _renderTitle(): void {
    const t = this._frame * 0.003;
    const tp = this._trackPoints[Math.floor(t * 5) % TRACK_SEGMENTS];
    this._camera.position.set(tp.x + 10, tp.y + 8, tp.z + 10);
    this._camera.lookAt(tp.x, tp.y, tp.z);
    this._animateClouds();
    this._composer.render();
  }

  private _render(): void {
    const pr = this._racers[0];
    const world = this._getTrackPosWorld(pr.trackPos, pr.lateralOffset);

    // update racer meshes
    for (const r of this._racers) {
      if (!r.mesh) continue;
      const rw = this._getTrackPosWorld(r.trackPos, r.lateralOffset);
      r.mesh.position.set(rw.x, rw.y, rw.z);
      r.mesh.rotation.y = -rw.angle + Math.PI / 2;
      // shield visual
      const shieldMesh = r.mesh.children[4] as THREE.Mesh;
      if (shieldMesh) (shieldMesh.material as THREE.MeshBasicMaterial).opacity = r.shieldTimer > 0 ? 0.3 : 0;
      // stun visual
      if (r.stunTimer > 0) r.mesh.rotation.z = Math.sin(this._frame * 15) * 0.2;
      else {
        // body tilt when steering (player only for responsiveness feel)
        const steerTilt = r.isPlayer ? (this._keys["KeyA"] || this._keys["ArrowLeft"] ? 0.15 : this._keys["KeyD"] || this._keys["ArrowRight"] ? -0.15 : 0) : r.steerSmooth * 0.3;
        r.mesh.rotation.z = lerp(r.mesh.rotation.z, steerTilt, 0.1);
      }
      // wheel spin (children[1] and [2] are wheel groups)
      for (let wi = 1; wi <= 2; wi++) {
        if (r.mesh.children[wi]) r.mesh.children[wi].rotation.x += r.speed * 0.1;
      }
    }

    // racer shadows
    for (let ri = 0; ri < this._racers.length && ri < this._racerShadows.length; ri++) {
      const r = this._racers[ri];
      const rw = this._getTrackPosWorld(r.trackPos, r.lateralOffset);
      this._racerShadows[ri].position.set(rw.x, rw.y - 0.28, rw.z);
    }

    // horse gallop animation (bob horse bodies based on speed)
    for (const r of this._racers) {
      if (!r.mesh) continue;
      const time2 = this._frame / 60;
      const gallop = r.speed > 2 ? Math.sin(time2 * 12 + r.trackPos) * 0.06 : 0;
      // horses are children[5] and [7] (body meshes after body/wheels/rider/helm/shield)
      for (let hi = 5; hi < r.mesh.children.length; hi += 2) {
        if (hi < r.mesh.children.length) r.mesh.children[hi].position.y = 0.4 + gallop;
      }
    }

    // floating islands gentle bob
    const time3 = this._frame / 60;
    for (let fi = 0; fi < this._floatingIslands.length; fi++) {
      this._floatingIslands[fi].position.y += Math.sin(time3 * 0.3 + fi * 2) * 0.003;
    }

    // pickups: bob and spin
    for (const pu of this._pickups) {
      if (pu.mesh && pu.active) {
        pu.mesh.rotation.y += 0.03;
        pu.mesh.position.y = this._getTrackPosWorld(pu.segIdx, pu.lateral).y + 0.6 + Math.sin(this._frame * 0.05) * 0.2;
      }
    }

    // ambient motes drift
    for (let mi = 0; mi < this._ambientMotePositions.length / 3; mi++) {
      this._ambientMotePositions[mi * 3 + 1] += Math.sin(this._frame * 0.03 + mi * 2) * 0.005;
      this._ambientMotePositions[mi * 3] += Math.sin(this._frame * 0.01 + mi) * 0.003;
    }
    (this._ambientMotes.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // stun spark update
    for (let si = 0; si < this._stunSparkLife.length; si++) {
      if (this._stunSparkLife[si] > 0) {
        this._stunSparkLife[si]--;
        this._stunSparkPositions[si * 3] += this._stunSparkVelocities[si * 3] * SIM_DT;
        this._stunSparkPositions[si * 3 + 1] += this._stunSparkVelocities[si * 3 + 1] * SIM_DT;
        this._stunSparkPositions[si * 3 + 2] += this._stunSparkVelocities[si * 3 + 2] * SIM_DT;
        this._stunSparkVelocities[si * 3 + 1] -= 12 * SIM_DT;
      } else { this._stunSparkPositions[si * 3 + 1] = -100; }
    }
    (this._stunSparkParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // checkpoint gate glow pulse
    const time6 = this._frame / 60;
    for (const cg of this._checkpointGates) {
      for (const m of cg.meshes) {
        if ((m.material as THREE.MeshBasicMaterial).transparent) {
          (m.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.sin(time6 * 3 + cg.segIdx * 0.1) * 0.06;
        }
      }
    }

    // edge glow opacity pulse
    for (let ei = 0; ei < this._edgeGlowMeshes.length; ei++) {
      (this._edgeGlowMeshes[ei].material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(time6 * 2 + ei) * 0.05;
    }

    // rider lean: forward when accel, back when brake
    for (const r of this._racers) {
      if (!r.mesh || !r.mesh.children[3]) continue;
      const rider = r.mesh.children[3]; // rider mesh
      if (r.isPlayer) {
        const accel2 = this._keys["KeyW"] || this._keys["ArrowUp"];
        const brake2 = this._keys["KeyS"] || this._keys["ArrowDown"];
        const targetLean = accel2 ? -0.15 : brake2 ? 0.2 : 0;
        rider.rotation.x = lerp(rider.rotation.x, targetLean, 0.1);
      } else {
        rider.rotation.x = lerp(rider.rotation.x, r.speed > 12 ? -0.1 : 0, 0.05);
      }
    }

    // void debris: slow fall + rotation
    for (const vd of this._voidDebris) {
      vd.mesh.position.y += vd.vy;
      vd.mesh.rotation.x += 0.002; vd.mesh.rotation.z += 0.001;
      if (vd.mesh.position.y < -30) {
        vd.mesh.position.y = -3;
        vd.mesh.position.x = (Math.random() - 0.5) * TRACK_RADIUS * 2;
        vd.mesh.position.z = (Math.random() - 0.5) * TRACK_RADIUS * 2;
      }
    }

    // waterfall particles: fall down
    if (this._waterfallPositions && this._waterfallParticles) {
      for (let wi = 0; wi < this._waterfallPositions.length / 3; wi++) {
        this._waterfallPositions[wi * 3 + 1] -= 0.08;
        if (this._waterfallPositions[wi * 3 + 1] < -20) {
          const islandIdx = Math.floor(Math.random() * this._floatingIslands.length);
          const island = this._floatingIslands[islandIdx];
          if (island) {
            this._waterfallPositions[wi * 3] = island.position.x + (Math.random() - 0.5) * 3;
            this._waterfallPositions[wi * 3 + 1] = island.position.y;
            this._waterfallPositions[wi * 3 + 2] = island.position.z + (Math.random() - 0.5) * 3;
          }
        }
      }
      (this._waterfallParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    // birds circling
    for (const bird of this._birds) {
      bird.angle += bird.speed;
      bird.mesh.position.set(
        Math.cos(bird.angle) * bird.radius,
        bird.y + Math.sin(bird.angle * 3) * 2,
        Math.sin(bird.angle) * bird.radius
      );
      bird.mesh.rotation.y = -bird.angle + Math.PI / 2;
    }

    // chariot boost body glow
    for (const r of this._racers) {
      if (!r.mesh) continue;
      const bodyMesh = r.mesh.children[0] as THREE.Mesh;
      if (bodyMesh?.material) {
        const bm = bodyMesh.material as THREE.MeshStandardMaterial;
        if (r.boostTimer > 0) {
          bm.emissive.setHex(0x44ff44);
          bm.emissiveIntensity = 0.4 + Math.sin(this._frame * 0.2) * 0.2;
        } else {
          bm.emissiveIntensity = 0;
        }
      }
    }

    // banner wave animation
    const time5 = this._frame / 60;
    for (let bi = 0; bi < this._trackBanners.length; bi++) {
      this._trackBanners[bi].rotation.z = Math.sin(time5 * 3 + bi * 1.5) * 0.15;
    }

    // speed-dependent camera rumble
    this._speedRumbleIntensity = pr.speed > 14 ? (pr.speed - 14) * 0.003 : 0;
    if (this._speedRumbleIntensity > 0.001) {
      this._camera.position.x += (Math.random() - 0.5) * this._speedRumbleIntensity;
      this._camera.position.y += (Math.random() - 0.5) * this._speedRumbleIntensity * 0.5;
    }

    // crowd wave at start/finish line
    const time4 = this._frame / 60;
    for (let ci = 0; ci < this._crowdMeshes.length; ci++) {
      this._crowdMeshes[ci].position.y = this._trackPoints[0].y + 0.35 + Math.max(0, Math.sin(time4 * 4 + ci * 0.5)) * 0.15;
    }

    // camera: chase behind player (or rear view)
    const camDist = this._rearView ? -4 : 6;
    const camHeight = this._rearView ? 2 : 3;
    const behindX = world.x - Math.cos(world.angle) * camDist;
    const behindZ = world.z - Math.sin(world.angle) * camDist;
    this._camera.position.x = lerp(this._camera.position.x, behindX, this._rearView ? 0.15 : 0.06);
    this._camera.position.y = lerp(this._camera.position.y, world.y + camHeight, 0.06);
    this._camera.position.z = lerp(this._camera.position.z, behindZ, this._rearView ? 0.15 : 0.06);
    const lookDir = this._rearView ? -4 : 4;
    this._camera.lookAt(
      world.x + Math.cos(world.angle) * lookDir,
      world.y + 1,
      world.z + Math.sin(world.angle) * lookDir
    );

    // wind sound scales with speed
    if (this._windGain) this._windGain.gain.value = Math.min(0.06, pr.speed * 0.003);

    // screen shake
    if (this._shakeIntensity > 0.001) {
      this._camera.position.x += (Math.random() - 0.5) * this._shakeIntensity;
      this._camera.position.y += (Math.random() - 0.5) * this._shakeIntensity * 0.5;
      this._shakeIntensity *= 0.85;
    }

    // boost trail particles
    if (pr.boostTimer > 0 && this._frame % 2 === 0) {
      for (let bi = 0; bi < this._boostTrailLife.length; bi++) {
        if (this._boostTrailLife[bi] <= 0) {
          this._boostTrailPositions[bi * 3] = world.x + (Math.random() - 0.5) * 0.5;
          this._boostTrailPositions[bi * 3 + 1] = world.y + Math.random() * 0.3;
          this._boostTrailPositions[bi * 3 + 2] = world.z + (Math.random() - 0.5) * 0.5;
          this._boostTrailLife[bi] = 15 + Math.random() * 10;
          break;
        }
      }
    }
    for (let bi = 0; bi < this._boostTrailLife.length; bi++) {
      if (this._boostTrailLife[bi] > 0) this._boostTrailLife[bi]--;
      else this._boostTrailPositions[bi * 3 + 1] = -100;
    }
    (this._boostTrailParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // torch flicker
    const time = this._frame / 60;
    for (const tl of this._torchLights) tl.intensity = 1.5 + Math.sin(time * 8 + tl.position.x) * 0.4;

    // speed lines during boost
    if (pr.speed > 14 && this._frame % 2 === 0) {
      for (let si = 0; si < this._speedLineLife.length; si++) {
        if (this._speedLineLife[si] <= 0) {
          const ahead = 3 + Math.random() * 8;
          this._speedLinePositions[si * 3] = world.x + Math.cos(world.angle) * ahead + (Math.random() - 0.5) * 4;
          this._speedLinePositions[si * 3 + 1] = world.y + Math.random() * 2 - 0.5;
          this._speedLinePositions[si * 3 + 2] = world.z + Math.sin(world.angle) * ahead + (Math.random() - 0.5) * 4;
          this._speedLineLife[si] = 6 + Math.random() * 6;
          break;
        }
      }
    }
    for (let si = 0; si < this._speedLineLife.length; si++) {
      if (this._speedLineLife[si] > 0) { this._speedLineLife[si]--; this._speedLinePositions[si * 3] -= Math.cos(world.angle) * 0.8; this._speedLinePositions[si * 3 + 2] -= Math.sin(world.angle) * 0.8; }
      else this._speedLinePositions[si * 3 + 1] = -100;
    }
    (this._speedLineParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // chromatic aberration decay
    if (this._chromaticPass) {
      const cur = this._chromaticPass.uniforms["amount"].value;
      this._chromaticPass.uniforms["amount"].value = cur + (this._chromaticTarget - cur) * 0.1;
      this._chromaticTarget *= 0.92;
    }

    // flag wave animation
    for (const r of this._racers) {
      if (!r.mesh) continue;
      // find the flag mesh (it's a plane near the back of the chariot)
      for (const child of r.mesh.children) {
        if ((child as THREE.Mesh).geometry?.type === "PlaneGeometry") {
          child.rotation.y = Math.sin(time * 6 + r.trackPos) * 0.3;
          break;
        }
      }
    }

    // boost FOV effect
    const targetFov = pr.boostTimer > 0 ? 80 : 65;
    this._camera.fov = lerp(this._camera.fov, targetFov, 0.05);
    this._camera.updateProjectionMatrix();

    // bloom boost
    if (this._bloomPass) this._bloomPass.strength = pr.boostTimer > 0 ? 0.8 : 0.4;

    // confetti update
    if (this._confettiPositions && this._confettiLife && this._confettiVelocities && this._confettiParticles) {
      for (let ci = 0; ci < this._confettiLife.length; ci++) {
        if (this._confettiLife[ci] > 0) {
          this._confettiLife[ci]--;
          this._confettiPositions[ci * 3] += this._confettiVelocities[ci * 3] * SIM_DT;
          this._confettiPositions[ci * 3 + 1] += this._confettiVelocities[ci * 3 + 1] * SIM_DT;
          this._confettiPositions[ci * 3 + 2] += this._confettiVelocities[ci * 3 + 2] * SIM_DT;
          this._confettiVelocities[ci * 3 + 1] -= 3 * SIM_DT;
          this._confettiVelocities[ci * 3] += (Math.random() - 0.5) * 0.3;
        }
      }
      (this._confettiParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    this._animateClouds();
    this._composer.render();
  }

  private _animateClouds(): void {
    const t = this._frame * 0.001;
    for (const cloud of this._clouds) {
      cloud.position.x += Math.sin(t + cloud.position.z * 0.01) * 0.02;
    }
  }
}
