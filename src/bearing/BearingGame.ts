/**
 * BEARING — 3D First-Person Compass Navigation
 *
 * Navigate fog-shrouded Arthurian wilderness using only a compass,
 * landmark clues, and the stars. Find sacred waypoints before sunset.
 *
 * Controls:
 *   W/↑     — walk forward
 *   S/↓     — walk backward
 *   A/←     — strafe left
 *   D/→     — strafe right
 *   Mouse   — look around (pointer lock)
 *   SHIFT   — sprint
 *   TAB     — toggle map
 *   C       — check compass (zoom)
 *   ESC     — pause
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// ─── constants ───────────────────────────────────────────────────────────────

const WORLD_SIZE = 600;
const WALK_SPEED = 8;
const SPRINT_SPEED = 14;
const MOUSE_SENS = 0.002;
const GRAVITY = 20;
const JUMP_VEL = 8;
const PLAYER_HEIGHT = 1.7;
const WAYPOINT_RADIUS = 4;
const FOG_BASE_FAR = 80;
const FOG_NIGHT_FAR = 40;
const TERRAIN_SEGMENTS = 128;
const TERRAIN_HEIGHT = 12;

// stamina
const STAMINA_MAX = 100;
const STAMINA_DRAIN = 25; // per second while sprinting
const STAMINA_REGEN = 15; // per second while walking
const STAMINA_EXHAUSTED_THRESHOLD = 10;

// head bob
const BOB_WALK_SPEED = 8;
const BOB_WALK_AMP = 0.04;
const BOB_SPRINT_SPEED = 12;
const BOB_SPRINT_AMP = 0.07;

// torch
const TORCH_RANGE = 18;
const TORCH_INTENSITY = 1.5;

// difficulty
type BearingDifficulty = "pilgrim" | "knight" | "hermit";
const BEARING_DIFFICULTIES: Record<BearingDifficulty, { waypoints: number; time: number; fogMult: number; label: string }> = {
  pilgrim: { waypoints: 4, time: 420, fogMult: 1.2, label: "PILGRIM" },
  knight:  { waypoints: 6, time: 300, fogMult: 1.0, label: "KNIGHT" },
  hermit:  { waypoints: 8, time: 240, fogMult: 0.7, label: "HERMIT" },
};

// weather
type BearingWeather = "clear" | "foggy" | "rain";
const BEARING_WEATHERS: BearingWeather[] = ["clear", "foggy", "rain"];

// challenge modifiers
type ChallengeMode = "normal" | "no_compass" | "speed_run" | "explorer";
const CHALLENGE_MODES: Record<ChallengeMode, { label: string; desc: string }> = {
  normal: { label: "NORMAL", desc: "Standard navigation" },
  no_compass: { label: "NO COMPASS", desc: "Compass arrow hidden — navigate by clue text only" },
  speed_run: { label: "SPEED RUN", desc: "Half time, double sprint speed" },
  explorer: { label: "EXPLORER", desc: "No time limit — find all landmarks + waypoints" },
};
const CHALLENGE_KEYS: ChallengeMode[] = ["normal", "no_compass", "speed_run", "explorer"];

// localStorage
const LS_BEARING_BEST = "bearing_best_times";

// waypoint types
const WAYPOINT_NAMES = [
  "The Grail Stone", "Merlin's Oak", "The Lady's Pool", "Excalibur's Rest",
  "The Round Table", "The Siege Perilous", "The Fisher King's Tower",
  "Nimue's Circle", "The Questing Beast's Lair", "Avalon's Gate",
];

const LANDMARK_TYPES = ["stone_circle", "ruined_tower", "ancient_tree", "monolith", "cairn", "shrine"] as const;

// ─── types ───────────────────────────────────────────────────────────────────

type Phase = "title" | "playing" | "found" | "victory" | "timeout" | "paused";

interface Waypoint {
  pos: THREE.Vector3;
  name: string;
  found: boolean;
  mesh: THREE.Group | null;
  light: THREE.PointLight | null;
  clue: string;
}

interface Landmark {
  pos: THREE.Vector3;
  type: (typeof LANDMARK_TYPES)[number];
  name: string;
  discovered: boolean;
}

// ─── seeded RNG ──────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── compass direction helpers ───────────────────────────────────────────────

function bearingToCardinal(rad: number): string {
  const deg = ((rad * 180 / Math.PI) % 360 + 360) % 360;
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function generateClue(
  fromPos: THREE.Vector3, toPos: THREE.Vector3, name: string,
  rng: () => number, landmarks: Landmark[], heightmap: Float32Array | null
): string {
  const dx = toPos.x - fromPos.x;
  const dz = toPos.z - fromPos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const bearing = Math.atan2(dx, -dz);
  const cardinal = bearingToCardinal(bearing);
  const paces = Math.round(dist / 2);

  // find nearest landmark to the waypoint for reference
  let nearestLM = "";
  let nearestLMDist = Infinity;
  let nearestLMDir = "";
  for (const lm of landmarks) {
    const ld = lm.pos.distanceTo(toPos);
    if (ld < nearestLMDist && ld < 80) {
      nearestLMDist = ld;
      nearestLM = lm.name;
      const ldx = toPos.x - lm.pos.x;
      const ldz = toPos.z - lm.pos.z;
      nearestLMDir = bearingToCardinal(Math.atan2(ldx, -ldz));
    }
  }

  // terrain description at waypoint
  let terrain = "";
  if (heightmap) {
    const h = getHeight(heightmap, TERRAIN_SEGMENTS, toPos.x, toPos.z) / TERRAIN_HEIGHT;
    if (h < 0.15) terrain = "in the marshy lowlands";
    else if (h < 0.3) terrain = "upon the gentle meadows";
    else if (h < 0.5) terrain = "within the deep forest";
    else if (h < 0.7) terrain = "among the foothills";
    else terrain = "high upon the stony ridge";
  }

  // rich template pool
  const templates: string[] = [
    `"${name} lies ${paces} paces to the ${cardinal}."`,
    `"Seek ${name} — walk ${cardinal}, roughly ${paces} paces."`,
    `"The spirits whisper: ${cardinal}, ${paces} paces to ${name}."`,
    `"Follow your bearing ${cardinal}. ${name} awaits ${terrain}."`,
    `"Set your compass ${cardinal} and walk ${paces} paces to find ${name}."`,
    `"${name} rests ${terrain}, ${paces} paces ${cardinal} of here."`,
  ];

  if (nearestLM) {
    templates.push(
      `"Near ${nearestLM}, look ${nearestLMDir}. There ${name} awaits, ${paces} paces from you."`,
      `"From ${nearestLM}, bear ${nearestLMDir}. ${name} lies ${terrain}."`,
      `"Seek the shadow of ${nearestLM} — then ${cardinal}, ${paces} paces to ${name}."`,
      `"The wise know: ${nearestLM} marks the way. ${cardinal}, ${paces} paces to ${name}."`,
    );
  }

  if (paces > 100) {
    templates.push(`"A long journey ${cardinal}: ${paces} paces to ${name}. Rest not until you arrive."`);
    templates.push(`"${name} is far — ${paces} paces ${cardinal}. Conserve your strength."`);
  } else if (paces < 40) {
    templates.push(`"${name} is near! Merely ${paces} paces ${cardinal} ${terrain}."`);
    templates.push(`"Close at hand: ${name}, ${paces} paces ${cardinal}. Open your eyes."`);
  }

  return templates[Math.floor(rng() * templates.length)];
}

// ─── terrain generation ──────────────────────────────────────────────────────

function generateHeightmap(seed: number, size: number): Float32Array {
  const rng = mulberry32(seed);
  const data = new Float32Array(size * size);

  // multi-octave noise approximation
  for (let octave = 0; octave < 4; octave++) {
    const freq = Math.pow(2, octave);
    const amp = TERRAIN_HEIGHT / Math.pow(2, octave);
    const offX = rng() * 1000, offZ = rng() * 1000;

    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        const nx = (x / size) * freq + offX;
        const nz = (z / size) * freq + offZ;
        // simple value noise with interpolation
        const ix = Math.floor(nx), iz = Math.floor(nz);
        const fx = nx - ix, fz = nz - iz;
        const sfx = fx * fx * (3 - 2 * fx), sfz = fz * fz * (3 - 2 * fz);

        const hash = (a: number, b: number) => {
          let h = (a * 127 + b * 311 + seed * 17) | 0;
          h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
          h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
          return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
        };

        const v00 = hash(ix, iz), v10 = hash(ix + 1, iz);
        const v01 = hash(ix, iz + 1), v11 = hash(ix + 1, iz + 1);
        const v0 = v00 + sfx * (v10 - v00);
        const v1 = v01 + sfx * (v11 - v01);
        const v = v0 + sfz * (v1 - v0);

        data[z * size + x] += v * amp;
      }
    }
  }

  // flatten center area for player spawn
  const cx = size / 2, cz = size / 2;
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (z - cz) ** 2) / (size * 0.05);
      if (d < 1) data[z * size + x] *= d;
    }
  }

  return data;
}

function getHeight(heightmap: Float32Array, size: number, worldX: number, worldZ: number): number {
  const tx = ((worldX + WORLD_SIZE / 2) / WORLD_SIZE) * (size - 1);
  const tz = ((worldZ + WORLD_SIZE / 2) / WORLD_SIZE) * (size - 1);
  const ix = Math.floor(tx), iz = Math.floor(tz);
  const fx = tx - ix, fz = tz - iz;

  if (ix < 0 || ix >= size - 1 || iz < 0 || iz >= size - 1) return 0;

  const v00 = heightmap[iz * size + ix];
  const v10 = heightmap[iz * size + ix + 1];
  const v01 = heightmap[(iz + 1) * size + ix];
  const v11 = heightmap[(iz + 1) * size + ix + 1];
  return v00 + fx * (v10 - v00) + fz * (v01 - v00) + fx * fz * (v11 - v10 - v01 + v00);
}

// ─── main game class ─────────────────────────────────────────────────────────

export class BearingGame {
  // Three.js
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _canvas!: HTMLCanvasElement;
  private _composer!: EffectComposer;
  private _bloomPass!: UnrealBloomPass;
  private _clock = new THREE.Clock();
  private _animFrame = 0;

  // state
  private _phase: Phase = "title";
  private _dt = 0;
  private _time = 0;
  private _gameTime = 0; // elapsed
  private _seed = 42;
  private _pausedPhase: Phase = "playing";

  // player
  private _yaw = 0;
  private _pitch = 0;
  private _playerPos = new THREE.Vector3(0, 5, 0);
  private _playerVelY = 0;
  private _onGround = false;
  private _keys = new Set<string>();

  // terrain
  private _heightmap!: Float32Array;
  private _terrainMesh!: THREE.Mesh;

  // waypoints & landmarks
  private _waypoints: Waypoint[] = [];
  private _currentWaypoint = 0;
  private _landmarks: Landmark[] = [];
  private _waypointsFound = 0;
  private _totalWaypoints = 6;

  // sun / time of day
  private _sunLight!: THREE.DirectionalLight;
  private _sunAngle = 0;

  // compass
  private _compassZoom = false;

  // map overlay
  private _mapVisible = false;
  private _mapCanvas!: HTMLCanvasElement;
  private _mapCtx!: CanvasRenderingContext2D;

  // HUD
  private _hud!: HTMLDivElement;
  private _hudCompass!: HTMLCanvasElement;
  private _compassCtx!: CanvasRenderingContext2D;
  private _hudCenter!: HTMLDivElement;
  private _hudClue!: HTMLDivElement;
  private _hudTimer!: HTMLDivElement;
  private _hudProgress!: HTMLDivElement;
  private _hudBearing!: HTMLDivElement;

  // input handlers
  private _onKeyDown!: (e: KeyboardEvent) => void;
  private _onKeyUp!: (e: KeyboardEvent) => void;
  private _onMouseMove!: (e: MouseEvent) => void;
  private _onMouseDown!: (e: MouseEvent) => void;
  private _onResize!: () => void;

  // audio
  private _audioCtx: AudioContext | null = null;
  private _windGain: GainNode | null = null;
  private _ambientTimer = 0;

  // stamina
  private _stamina = STAMINA_MAX;
  private _exhausted = false;

  // head bob
  private _bobPhase = 0;
  private _bobOffset = 0;

  // torch
  private _torchLight: THREE.PointLight | null = null;
  private _torchMesh: THREE.Mesh | null = null;

  // particles
  private _fireflies: { mesh: THREE.Mesh; basePos: THREE.Vector3; phase: number }[] = [];

  // difficulty & weather
  private _difficulty: BearingDifficulty = "knight";
  private _weather: BearingWeather = "clear";
  private _challenge: ChallengeMode = "normal";
  private _rainDrops: THREE.Points | null = null;
  private _rainPositions: Float32Array | null = null;

  // HUD extras
  private _hudStamina!: HTMLDivElement;
  private _hudAltitude!: HTMLDivElement;
  private _hudBiome!: HTMLDivElement;

  // compass needle wobble
  private _needleWobble = 0;
  private _needleWobbleTarget = 0;

  // wildlife
  private _birds: { mesh: THREE.Group; basePos: THREE.Vector3; phase: number; circleR: number }[] = [];

  // campfire
  private _campfireLight: THREE.PointLight | null = null;

  // water body positions for collision
  private _waterBodies: { pos: THREE.Vector3; radius: number }[] = [];
  private _inWater = false;

  // footprints
  private _footprints: THREE.Mesh[] = [];
  private _footprintTimer = 0;

  // time bonus pickups
  private _timeBonuses: { mesh: THREE.Mesh; pos: THREE.Vector3; collected: boolean }[] = [];

  // stats
  private _distWalked = 0;
  private _lastPlayerPos = new THREE.Vector3();

  // tutorial
  private _tutorialShown = false;
  private _tutorialTimer = 0;

  // achievements
  private _achievementsUnlocked: Set<string> = new Set();
  private _achievementPopupTimer = 0;

  // minimap
  private _minimapCanvas!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;
  private _hudInteract!: HTMLDivElement;

  // journal
  private _journalVisible = false;
  private _journalEl!: HTMLDivElement;

  // seed input
  private _seedInputMode = false;
  private _seedInputBuffer = "";

  // water ambient audio
  private _waterAudioGain: GainNode | null = null;

  // pending timeout IDs to cancel on phase change
  private _pendingTimeouts: number[] = [];

  // ── public API ─────────────────────────────────────────────────────────────

  async boot(): Promise<void> {
    this._initThree();
    this._buildHUD();
    this._bindInput();
    this._showTitle();

    const loop = () => {
      this._animFrame = requestAnimationFrame(loop);
      this._dt = Math.min(this._clock.getDelta(), 0.05);
      this._time += this._dt;
      this._update();
      this._composer.render();
    };
    loop();
  }

  destroy(): void {
    cancelAnimationFrame(this._animFrame);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("mousedown", this._onMouseDown);
    window.removeEventListener("resize", this._onResize);
    if (this._hud?.parentNode) this._hud.parentNode.removeChild(this._hud);
    if (this._mapCanvas?.parentNode) this._mapCanvas.parentNode.removeChild(this._mapCanvas);
    if (this._canvas?.parentNode) this._canvas.parentNode.removeChild(this._canvas);
    this._renderer?.dispose();
    this._audioCtx?.close();
  }

  // ── Three.js init ──────────────────────────────────────────────────────────

  private _initThree(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;";
    document.getElementById("pixi-container")!.appendChild(this._canvas);

    this._renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 0.9;

    this._scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 500);

    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(new RenderPass(this._scene, this._camera));
    this._bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.7, 0.4, 0.75);
    this._composer.addPass(this._bloomPass);
    this._composer.addPass(new OutputPass());
  }

  // ── input ──────────────────────────────────────────────────────────────────

  private _bindInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      this._keys.add(k);

      if (k === "escape") {
        if (this._phase === "title") { window.dispatchEvent(new Event("bearingExit")); return; }
        if (this._phase === "playing") {
          this._pausedPhase = this._phase;
          this._phase = "paused";
          const totalTime = BEARING_DIFFICULTIES[this._difficulty].time;
          const rem = Math.max(0, totalTime - this._gameTime);
          const mins = Math.floor(rem / 60), secs = Math.floor(rem % 60);
          this._hudCenter.innerHTML = `<div style="font-size:28px;color:#daa520;margin-bottom:15px;">PAUSED</div>` +
            `<div style="font-size:12px;color:#888;line-height:2;">` +
            `Waypoints: ${this._waypointsFound} / ${this._totalWaypoints}<br>` +
            `Time left: ${mins}:${String(secs).padStart(2, "0")}<br>` +
            `Distance: ${Math.floor(this._distWalked)} paces<br>` +
            `Landmarks: ${this._landmarks.filter(l => l.discovered).length} / ${this._landmarks.length}<br>` +
            `Difficulty: ${BEARING_DIFFICULTIES[this._difficulty].label}<br>` +
            `Seed: ${this._seed}</div>` +
            `<div style="font-size:14px;color:#aaa;margin-top:15px;">[ESC] Resume &nbsp; [Q] Quit</div>`;
          if (document.pointerLockElement) document.exitPointerLock();
        } else if (this._phase === "paused") {
          this._phase = this._pausedPhase;
          this._hudCenter.textContent = "";
          this._canvas.requestPointerLock();
        } else if (this._phase === "victory" || this._phase === "timeout") {
          window.dispatchEvent(new Event("bearingExit"));
        }
      }

      if (k === "q" && this._phase === "paused") {
        this._showTitle();
        if (document.pointerLockElement) document.exitPointerLock();
      }

      if (k === "tab" && this._phase === "playing") {
        e.preventDefault();
        this._journalVisible = false; this._journalEl.style.display = "none";
        this._mapVisible = !this._mapVisible;
        this._mapCanvas.style.display = this._mapVisible ? "block" : "none";
        if (this._mapVisible) this._drawMap();
      }

      if (k === "j" && this._phase === "playing") {
        this._mapVisible = false; this._mapCanvas.style.display = "none";
        this._journalVisible = !this._journalVisible;
        if (this._journalVisible) this._drawJournal();
        this._journalEl.style.display = this._journalVisible ? "block" : "none";
      }

      if (k === "c" && this._phase === "playing") {
        this._compassZoom = true;
      }

      // seed input mode on title
      if (this._phase === "title" && this._seedInputMode) {
        if (k === "escape" || k === "enter") {
          this._seedInputMode = false;
          if (k === "enter" && this._seedInputBuffer.length > 0) {
            const parsed = parseInt(this._seedInputBuffer, 10);
            if (!isNaN(parsed)) { this._seed = parsed; }
          }
          this._seedInputBuffer = "";
          this._showTitle();
          return;
        }
        if (k === "backspace") { this._seedInputBuffer = this._seedInputBuffer.slice(0, -1); }
        else if (k.length === 1 && k >= "0" && k <= "9") { this._seedInputBuffer += k; }
        this._hudCenter.textContent = `Enter Seed:\n${this._seedInputBuffer || "_"}\n\nENTER to confirm  ·  ESC to cancel`;
        return;
      }

      if ((k === "enter" || k === " ") && this._phase === "title") {
        this._startGame();
      }
      if (this._phase === "title") {
        if (k === "1") { this._difficulty = "pilgrim"; this._showTitle(); }
        if (k === "2") { this._difficulty = "knight"; this._showTitle(); }
        if (k === "3") { this._difficulty = "hermit"; this._showTitle(); }
        if (k === "w" || k === "arrowup") {
          const idx = BEARING_WEATHERS.indexOf(this._weather);
          this._weather = BEARING_WEATHERS[(idx + 1) % BEARING_WEATHERS.length];
          this._showTitle();
        }
        if (k === "c") {
          const idx = CHALLENGE_KEYS.indexOf(this._challenge);
          this._challenge = CHALLENGE_KEYS[(idx + 1) % CHALLENGE_KEYS.length];
          this._showTitle();
        }
        if (k === "s") {
          this._seedInputMode = true;
          this._seedInputBuffer = "";
          this._hudCenter.textContent = `Enter Seed:\n_\n\nENTER to confirm  ·  ESC to cancel`;
        }
      }
      if ((k === "enter" || k === " ") && (this._phase === "victory" || this._phase === "timeout")) {
        this._showTitle();
      }
    };

    this._onKeyUp = (e: KeyboardEvent) => {
      this._keys.delete(e.key.toLowerCase());
      if (e.key.toLowerCase() === "c") this._compassZoom = false;
    };

    this._onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== this._canvas) return;
      this._yaw -= e.movementX * MOUSE_SENS;
      this._pitch = Math.max(-1.4, Math.min(1.4, this._pitch - e.movementY * MOUSE_SENS));
    };

    this._onMouseDown = (e: MouseEvent) => {
      if (this._phase === "playing" && document.pointerLockElement !== this._canvas) {
        this._canvas.requestPointerLock();
      }
      void e; // click handled by pointer lock
    };

    this._onResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      this._camera.aspect = w / h;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(w, h);
      this._composer.setSize(w, h);
    };

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("resize", this._onResize);
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  private _buildHUD(): void {
    this._hud = document.createElement("div");
    this._hud.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:11;pointer-events:none;font-family:'Segoe UI',monospace;color:#ddd;";
    document.getElementById("pixi-container")!.appendChild(this._hud);

    this._hud.innerHTML = `
      <div style="position:absolute;top:15px;left:50%;transform:translateX(-50%);width:200px;height:200px;border-radius:50%;background:rgba(0,0,0,0.4);box-shadow:0 0 20px rgba(0,0,0,0.3);"></div>
      <canvas id="bg-compass" width="200" height="200" style="position:absolute;top:15px;left:50%;transform:translateX(-50%);transition:transform 0.3s;"></canvas>
      <div id="bg-bearing" style="position:absolute;top:220px;left:50%;transform:translateX(-50%);font-size:14px;color:#daa520;letter-spacing:2px;text-shadow:0 0 10px rgba(218,165,32,0.5);"></div>
      <div id="bg-clue" style="position:absolute;bottom:80px;left:50%;transform:translateX(-50%);font-size:14px;color:#ccaa66;text-shadow:0 1px 4px rgba(0,0,0,0.8);text-align:center;max-width:500px;font-style:italic;line-height:1.6;"></div>
      <div id="bg-timer" style="position:absolute;top:20px;right:30px;font-size:18px;color:#cc8844;font-weight:bold;text-shadow:0 0 8px rgba(204,136,68,0.4);"></div>
      <div id="bg-progress" style="position:absolute;top:50px;right:30px;font-size:13px;color:#888;"></div>
      <div id="bg-center" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:24px;text-align:center;color:#daa520;text-shadow:0 0 20px rgba(218,165,32,0.7);white-space:pre-line;pointer-events:auto;line-height:1.6;"></div>
      <div id="bg-crosshair" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,0.3);"></div>
      <div id="bg-vignette" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity 0.3s;background:radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,0.35) 100%);"></div>
      <div id="bg-distance" style="position:absolute;bottom:50px;left:50%;transform:translateX(-50%);font-size:12px;color:#666;"></div>
      <div style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);width:120px;">
        <div style="font-size:8px;color:#556;text-align:center;margin-bottom:2px;">STAMINA</div>
        <div style="height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
          <div id="bg-stamina" style="height:100%;width:100%;background:linear-gradient(90deg,#44aa44,#88cc44);border-radius:3px;transition:width 0.1s;"></div>
        </div>
      </div>
      <div id="bg-seed" style="position:absolute;bottom:10px;right:20px;font-size:9px;color:#444;"></div>
      <div id="bg-altitude" style="position:absolute;top:240px;left:50%;transform:translateX(-50%);font-size:11px;color:#888;"></div>
      <div id="bg-biome" style="position:absolute;top:20px;left:30px;font-size:12px;color:#667766;font-style:italic;text-shadow:0 1px 3px rgba(0,0,0,0.5);"></div>
      <div id="bg-tutorial" style="position:absolute;bottom:130px;left:50%;transform:translateX(-50%);font-size:11px;color:rgba(255,255,255,0.5);text-align:center;transition:opacity 0.5s;"></div>
      <canvas id="bg-minimap" width="120" height="120" style="position:absolute;bottom:15px;right:15px;border:1px solid rgba(218,165,32,0.25);border-radius:50%;background:rgba(0,0,0,0.5);"></canvas>
      <div id="bg-interact" style="position:absolute;top:60%;left:50%;transform:translateX(-50%);font-size:13px;color:rgba(218,165,32,0.7);opacity:0;transition:opacity 0.3s;text-shadow:0 1px 4px rgba(0,0,0,0.8);"></div>
    `;

    this._hudCompass = document.getElementById("bg-compass") as HTMLCanvasElement;
    this._compassCtx = this._hudCompass.getContext("2d")!;
    this._hudCenter = document.getElementById("bg-center") as HTMLDivElement;
    this._hudClue = document.getElementById("bg-clue") as HTMLDivElement;
    this._hudTimer = document.getElementById("bg-timer") as HTMLDivElement;
    this._hudProgress = document.getElementById("bg-progress") as HTMLDivElement;
    this._hudBearing = document.getElementById("bg-bearing") as HTMLDivElement;
    this._hudStamina = document.getElementById("bg-stamina") as HTMLDivElement;
    this._minimapCanvas = document.getElementById("bg-minimap") as HTMLCanvasElement;
    this._minimapCtx = this._minimapCanvas.getContext("2d")!;
    this._hudInteract = document.getElementById("bg-interact") as HTMLDivElement;
    this._hudAltitude = document.getElementById("bg-altitude") as HTMLDivElement;
    this._hudBiome = document.getElementById("bg-biome") as HTMLDivElement;
    this._tutorialShown = localStorage.getItem("bearing_tutorial_seen") === "1";

    // map overlay (hidden by default)
    this._mapCanvas = document.createElement("canvas");
    this._mapCanvas.width = 400;
    this._mapCanvas.height = 400;
    this._mapCanvas.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:12;border:2px solid rgba(218,165,32,0.4);border-radius:8px;background:rgba(10,8,6,0.85);display:none;";
    document.getElementById("pixi-container")!.appendChild(this._mapCanvas);
    this._mapCtx = this._mapCanvas.getContext("2d")!;

    // discovery journal overlay
    this._journalEl = document.createElement("div");
    this._journalEl.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:13;max-width:500px;max-height:70vh;overflow-y:auto;background:rgba(10,8,6,0.9);border:1px solid rgba(218,165,32,0.4);border-radius:8px;padding:20px 25px;display:none;font-family:monospace;color:#ddd;pointer-events:auto;";
    document.getElementById("pixi-container")!.appendChild(this._journalEl);
  }

  // ── title screen ───────────────────────────────────────────────────────────

  private _showTitle(): void {
    this._phase = "title";
    this._seed = 0;
    this._seedInputMode = false;
    this._journalVisible = false; this._journalEl.style.display = "none";
    // cancel any pending timeouts from previous game
    for (const id of this._pendingTimeouts) clearTimeout(id);
    this._pendingTimeouts = [];
    this._clearScene();
    this._scene.background = new THREE.Color(0x0a0808);
    this._scene.fog = new THREE.Fog(0x0a0808, 10, 50);

    this._scene.add(new THREE.AmbientLight(0x223344, 0.4));
    const moon = new THREE.DirectionalLight(0x8899bb, 0.6);
    moon.position.set(5, 15, -3); this._scene.add(moon);

    // standing stones on title
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 6;
      const stone = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 2 + Math.random() * 2, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x667766, roughness: 0.9 })
      );
      stone.position.set(Math.cos(a) * r, 1.5, Math.sin(a) * r);
      stone.rotation.y = a + 0.3;
      stone.rotation.z = (Math.random() - 0.5) * 0.15;
      stone.castShadow = true;
      this._scene.add(stone);
    }

    // glowing compass on ground center
    const compassGlow = new THREE.Mesh(
      new THREE.CircleGeometry(1.5, 32),
      new THREE.MeshStandardMaterial({ color: 0xdaa520, emissive: 0xdaa520, emissiveIntensity: 0.8, toneMapped: false })
    );
    compassGlow.rotation.x = -Math.PI / 2; compassGlow.position.y = 0.05;
    this._scene.add(compassGlow);
    this._scene.add(new THREE.PointLight(0xdaa520, 1.5, 15));

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x334422, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    this._scene.add(ground);

    // stars
    const starPos = new Float32Array(1200 * 3);
    for (let i = 0; i < 1200; i++) {
      const theta = Math.random() * Math.PI * 2, phi = Math.random() * Math.PI * 0.45, r = 200;
      starPos[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
      starPos[i * 3 + 1] = Math.cos(phi) * r;
      starPos[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
    this._scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true })));

    this._camera.position.set(0, 3, 10);
    this._camera.lookAt(0, 1, 0);

    const diff = BEARING_DIFFICULTIES[this._difficulty];
    const bestKey = `${this._difficulty}_${this._weather}_${this._challenge}`;
    const bests = this._loadBestTimes();
    const bestStr = bests[bestKey] ? `Best: ${Math.floor(bests[bestKey] / 60)}:${String(Math.floor(bests[bestKey] % 60)).padStart(2, "0")}` : "";
    this._hudCenter.textContent = `B E A R I N G\nCompass Navigation\n\n` +
      `${diff.label} [1/2/3]  ·  ${diff.waypoints} waypoints  ·  ${Math.floor(diff.time / 60)}min\n` +
      `Weather: ${this._weather.toUpperCase()} [W]  ·  ${CHALLENGE_MODES[this._challenge].label} [C]\n` +
      (this._challenge !== "normal" ? `${CHALLENGE_MODES[this._challenge].desc}\n` : "") +
      (bestStr ? `${bestStr}\n` : "") +
      `\nFind the sacred waypoints\nbefore sunset claims the land.\n\nENTER to Begin  ·  [S] Set Seed  ·  ESC to Exit`;

    // load achievements for count display
    try {
      const saved: string[] = JSON.parse(localStorage.getItem("bearing_achievements") || "[]");
      if (saved.length > 0) {
        this._hudCenter.textContent += `\n${saved.length}/${this._bearingAchievements.length} Achievements`;
      }
    } catch { /* */ }
    this._hudClue.textContent = "";
    this._hudTimer.textContent = "";
    this._hudProgress.textContent = "";
    this._hudBearing.textContent = "";
    this._compassCtx.clearRect(0, 0, 200, 200);
    this._minimapCtx.clearRect(0, 0, 120, 120);
    this._mapCanvas.style.display = "none";

    // clear all remaining HUD elements
    const clearIds = ["bg-distance", "bg-altitude", "bg-biome", "bg-tutorial", "bg-interact", "bg-seed"];
    for (const id of clearIds) {
      const el = document.getElementById(id);
      if (el) el.textContent = "";
    }
    this._hudStamina.style.width = "100%";
    const vignetteEl = document.getElementById("bg-vignette");
    if (vignetteEl) vignetteEl.style.opacity = "0";
  }

  // ── game start ─────────────────────────────────────────────────────────────

  private _startGame(): void {
    if (!this._seed || this._seed <= 0) this._seed = Math.floor(Math.random() * 10000);
    const diff = BEARING_DIFFICULTIES[this._difficulty];
    this._totalWaypoints = diff.waypoints;
    this._gameTime = 0;
    this._waypointsFound = 0;
    this._currentWaypoint = 0;
    this._playerPos.set(0, 5, 0);
    this._yaw = 0; this._pitch = 0;
    this._playerVelY = 0;
    this._stamina = STAMINA_MAX;
    this._exhausted = false;
    this._bobPhase = 0;
    this._compassZoom = false;
    this._mapVisible = false;
    this._mapCanvas.style.display = "none";
    this._fireflies = [];

    this._clearScene();
    this._buildWorld();
    this._generateWaypoints();
    this._generateLandmarks();

    // apply difficulty fog
    (this._scene.fog as THREE.Fog).far *= diff.fogMult;

    // apply challenge modifiers
    if (this._challenge === "speed_run") {
      // half time
      // (time is already set from diff.time, we halve it)
    }
    if (this._challenge === "explorer") {
      // no time limit — set to 30 minutes
    }

    // weather effects
    if (this._weather === "foggy") {
      (this._scene.fog as THREE.Fog).far *= 0.5;
      (this._scene.fog as THREE.Fog).near = 5;
    }
    if (this._weather === "foggy") this._buildFogWisps();
    if (this._weather === "rain") {
      this._buildRain();
      (this._scene.fog as THREE.Fog).far *= 0.7;
    }

    // torch (attached to camera, becomes visible at dusk)
    this._torchLight = new THREE.PointLight(0xffaa44, 0, TORCH_RANGE);
    this._torchLight.position.set(0.3, -0.3, -0.5);
    this._camera.add(this._torchLight);
    this._scene.add(this._camera);
    this._torchMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0xff8833, emissive: 0xff8833, emissiveIntensity: 1.5, toneMapped: false })
    );
    this._torchMesh.position.set(0.3, -0.3, -0.5);
    this._camera.add(this._torchMesh);

    // cloud dome
    this._buildCloudDome();

    // spawn fireflies (appear at dusk)
    this._spawnFireflies();

    // water ponds
    this._buildWaterBodies();

    // wildlife
    this._spawnBirds();

    // campfire at spawn
    this._buildCampfire();

    // time bonus pickups + ground details + dust motes
    this._spawnTimeBonuses();
    this._buildDustMotes();
    this._buildGroundDetails();

    // reset stats
    this._distWalked = 0;
    this._lastPlayerPos.copy(this._playerPos);
    this._footprints = [];
    this._footprintTimer = 0;
    this._tutorialTimer = 0;
    this._ambientTimer = 0;
    this._achievementPopupTimer = 0;
    this._pendingTimeouts = [];
    this._waterAudioGain = null;
    this._dustMotes = null;
    this._dustMotePositions = null;

    this._phase = "playing";
    this._hudCenter.textContent = "";
    this._canvas.requestPointerLock();

    // audio
    if (!this._audioCtx) this._audioCtx = new AudioContext();
    this._startAmbientAudio();
    this._startWaterAudio();

    // seed display
    const seedEl = document.getElementById("bg-seed");
    if (seedEl) seedEl.textContent = `Seed: ${this._seed}`;

    this._showCurrentClue();
  }

  // ── world building ─────────────────────────────────────────────────────────

  private _clearScene(): void {
    // clean camera children (torch light + mesh)
    while (this._camera.children.length > 0) this._camera.remove(this._camera.children[0]);
    this._torchLight = null;
    this._torchMesh = null;

    this._scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) { obj.geometry?.dispose(); (obj.material as THREE.Material)?.dispose(); }
      if (obj instanceof THREE.Points) { obj.geometry?.dispose(); (obj.material as THREE.Material)?.dispose(); }
    });
    while (this._scene.children.length > 0) this._scene.remove(this._scene.children[0]);
    this._discoveryParticles = [];
  }

  private _buildWorld(): void {
    const rng = mulberry32(this._seed);

    // sky
    this._scene.background = new THREE.Color(0x5577aa);
    this._scene.fog = new THREE.Fog(0x88aacc, 20, FOG_BASE_FAR);

    // lights
    this._scene.add(new THREE.AmbientLight(0x445566, 0.5));
    this._sunLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    this._sunLight.position.set(50, 80, 30);
    this._sunLight.castShadow = true;

    // visible sun disk
    const sunGeo = new THREE.SphereGeometry(8, 16, 12);
    const sunMesh = new THREE.Mesh(sunGeo, new THREE.MeshBasicMaterial({
      color: 0xffeedd, transparent: true, opacity: 0.9,
    }));
    sunMesh.name = "sunDisk";
    sunMesh.position.copy(this._sunLight.position);
    this._scene.add(sunMesh);
    // sun glow halo (larger, dimmer)
    const sunHalo = new THREE.Mesh(
      new THREE.SphereGeometry(20, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffeedd, emissive: 0xffeedd, emissiveIntensity: 1.5, transparent: true, opacity: 0.15, toneMapped: false })
    );
    sunHalo.name = "sunHalo";
    sunHalo.position.copy(this._sunLight.position);
    this._scene.add(sunHalo);
    this._sunLight.shadow.mapSize.set(2048, 2048);
    this._sunLight.shadow.camera.left = -80; this._sunLight.shadow.camera.right = 80;
    this._sunLight.shadow.camera.top = 80; this._sunLight.shadow.camera.bottom = -80;
    this._sunLight.shadow.camera.far = 200;
    this._scene.add(this._sunLight);
    this._scene.add(new THREE.HemisphereLight(0x88aacc, 0x445533, 0.3));

    // terrain
    this._heightmap = generateHeightmap(this._seed, TERRAIN_SEGMENTS);
    const terrGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, TERRAIN_SEGMENTS - 1, TERRAIN_SEGMENTS - 1);
    const posAttr = terrGeo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < posAttr.count; i++) {
      const h = this._heightmap[i];
      posAttr.setZ(i, h);
      // vertex coloring: green at low, brown at mid, gray at high
      const t = h / TERRAIN_HEIGHT;
      if (t < 0.3) { colors[i * 3] = 0.25 + t; colors[i * 3 + 1] = 0.4 + t * 0.3; colors[i * 3 + 2] = 0.15; }
      else if (t < 0.6) { colors[i * 3] = 0.35 + t * 0.3; colors[i * 3 + 1] = 0.3 + t * 0.1; colors[i * 3 + 2] = 0.2; }
      else { colors[i * 3] = 0.45 + t * 0.2; colors[i * 3 + 1] = 0.42 + t * 0.15; colors[i * 3 + 2] = 0.38 + t * 0.1; }
    }
    terrGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    terrGeo.computeVertexNormals();

    // procedural terrain texture for fine detail
    const terrTexCanvas = document.createElement("canvas");
    terrTexCanvas.width = 256; terrTexCanvas.height = 256;
    const ttCtx = terrTexCanvas.getContext("2d")!;
    ttCtx.fillStyle = "#888";
    ttCtx.fillRect(0, 0, 256, 256);
    const ttData = ttCtx.getImageData(0, 0, 256, 256);
    for (let i = 0; i < ttData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 40;
      ttData.data[i] = 128 + n; ttData.data[i + 1] = 128 + n; ttData.data[i + 2] = 128 + n; ttData.data[i + 3] = 255;
    }
    ttCtx.putImageData(ttData, 0, 0);
    const terrTex = new THREE.CanvasTexture(terrTexCanvas);
    terrTex.wrapS = terrTex.wrapT = THREE.RepeatWrapping;
    terrTex.repeat.set(40, 40);

    this._terrainMesh = new THREE.Mesh(terrGeo, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.85, metalness: 0, map: terrTex,
    }));
    this._terrainMesh.rotation.x = -Math.PI / 2;
    this._terrainMesh.receiveShadow = true;
    this._scene.add(this._terrainMesh);

    // sky gradient dome (horizon lighter than zenith)
    const skyGeo = new THREE.SphereGeometry(270, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const skyColors = new Float32Array(skyGeo.attributes.position.count * 3);
    for (let i = 0; i < skyGeo.attributes.position.count; i++) {
      const y = skyGeo.attributes.position.getY(i);
      const t = Math.max(0, y) / 270; // 0 at horizon, 1 at zenith
      // horizon: warm light, zenith: deep blue
      skyColors[i * 3] = 0.7 - t * 0.4;     // R
      skyColors[i * 3 + 1] = 0.75 - t * 0.25; // G
      skyColors[i * 3 + 2] = 0.9 - t * 0.15;  // B
    }
    skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(skyColors, 3));
    const skyDome = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({
      vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false,
    }));
    skyDome.name = "skyDome";
    skyDome.renderOrder = -1;
    this._scene.add(skyDome);

    // trees: 5 distinct types based on elevation
    const treePalette = [
      { foliage: 0x335522, trunk: 0x553322 }, // dark green
      { foliage: 0x447733, trunk: 0x664433 }, // mid green
      { foliage: 0x556622, trunk: 0x443322 }, // olive
      { foliage: 0x224411, trunk: 0x332211 }, // deep forest
      { foliage: 0x668833, trunk: 0x554422 }, // light green
    ];
    for (let i = 0; i < 500; i++) {
      const x = (rng() - 0.5) * WORLD_SIZE * 0.9;
      const z = (rng() - 0.5) * WORLD_SIZE * 0.9;
      const h = getHeight(this._heightmap, TERRAIN_SEGMENTS, x, z);
      if (h < 0.5 || h > TERRAIN_HEIGHT * 0.7) continue;

      const palette = treePalette[Math.floor(rng() * treePalette.length)];
      const trunkH = 1.5 + rng() * 3.5;
      const trunkW = 0.1 + rng() * 0.12;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(trunkW * 0.6, trunkW, trunkH, 12),
        new THREE.MeshStandardMaterial({ color: palette.trunk, roughness: 0.9 })
      );
      trunk.position.set(x, h + trunkH / 2, z); trunk.castShadow = true;
      // slight random lean for natural look
      trunk.rotation.z = (rng() - 0.5) * 0.1;
      trunk.rotation.x = (rng() - 0.5) * 0.1;
      this._scene.add(trunk);

      const canopySize = 0.8 + rng() * 1.8;
      const treeType = rng();
      let canopyGeo: THREE.BufferGeometry;
      if (treeType < 0.3) {
        // tall pine cone
        canopyGeo = new THREE.ConeGeometry(canopySize * 0.7, canopySize * 2.5, 12);
      } else if (treeType < 0.5) {
        // round deciduous
        canopyGeo = new THREE.SphereGeometry(canopySize, 16, 12);
      } else if (treeType < 0.7) {
        // wide flat-top (like an acacia)
        canopyGeo = new THREE.CylinderGeometry(canopySize * 1.2, canopySize * 0.8, canopySize * 0.5, 16);
      } else if (treeType < 0.85) {
        // cluster: two overlapping spheres
        canopyGeo = new THREE.SphereGeometry(canopySize * 0.8, 20, 16);
      } else {
        // tall narrow cypress
        canopyGeo = new THREE.ConeGeometry(canopySize * 0.4, canopySize * 3, 12);
      }

      const foliageColor = new THREE.Color(palette.foliage).offsetHSL(0, 0, (rng() - 0.5) * 0.06);
      const canopy = new THREE.Mesh(canopyGeo, new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.8 }));
      canopy.position.set(x, h + trunkH + canopySize * 0.4, z); canopy.castShadow = true;
      canopy.name = "treeCanopy";
      this._scene.add(canopy);

      // second canopy sphere for cluster type
      if (treeType >= 0.7 && treeType < 0.85) {
        const c2 = new THREE.Mesh(
          new THREE.SphereGeometry(canopySize * 0.6, 20, 16),
          new THREE.MeshStandardMaterial({ color: foliageColor.clone().offsetHSL(0, 0, 0.03), roughness: 0.8 })
        );
        c2.position.set(x + (rng() - 0.5) * canopySize, h + trunkH + canopySize * 0.7, z + (rng() - 0.5) * canopySize);
        c2.castShadow = true; this._scene.add(c2);
      }
    }

    // rocks
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.9 });
    for (let i = 0; i < 80; i++) {
      const x = (rng() - 0.5) * WORLD_SIZE * 0.8;
      const z = (rng() - 0.5) * WORLD_SIZE * 0.8;
      const h = getHeight(this._heightmap, TERRAIN_SEGMENTS, x, z);
      const size = 0.3 + rng() * 1.5;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), rockMat);
      rock.position.set(x, h + size * 0.3, z);
      rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      rock.castShadow = true;
      this._scene.add(rock);
    }

    // stars (visible at dusk)
    const starPos = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) {
      const theta = Math.random() * Math.PI * 2, phi = Math.random() * Math.PI * 0.4, r = 250;
      starPos[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
      starPos[i * 3 + 1] = Math.cos(phi) * r;
      starPos[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0 }));
    stars.name = "stars";
    this._scene.add(stars);
  }

  // ── waypoint generation ────────────────────────────────────────────────────

  private _generateWaypoints(): void {
    this._waypoints = [];
    const rng = mulberry32(this._seed + 100);

    for (let i = 0; i < this._totalWaypoints; i++) {
      const angle = (i / this._totalWaypoints) * Math.PI * 2 + rng() * 0.8;
      const dist = 60 + rng() * 150;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const h = getHeight(this._heightmap, TERRAIN_SEGMENTS, x, z);

      const pos = new THREE.Vector3(x, h + 0.5, z);
      const name = WAYPOINT_NAMES[i % WAYPOINT_NAMES.length];

      // waypoint beacon mesh
      const group = new THREE.Group();

      // stone pillar
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.5, 2, 16),
        new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.7 })
      );
      pillar.position.y = 1; pillar.castShadow = true;
      group.add(pillar);

      // glowing orb on top
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xddaa44, emissive: 0xddaa44, emissiveIntensity: 1.5, toneMapped: false })
      );
      orb.position.y = 2.5; orb.name = "orb";
      group.add(orb);

      // vertical beam of light
      const beamGeo = new THREE.CylinderGeometry(0.08, 0.35, 12, 16);
      const beam = new THREE.Mesh(beamGeo, new THREE.MeshStandardMaterial({
        color: 0xddaa44, emissive: 0xddaa44, emissiveIntensity: 0.8,
        transparent: true, opacity: 0.25, toneMapped: false,
      }));
      beam.position.y = 8; beam.name = "beam";
      group.add(beam);

      group.position.copy(pos);
      group.visible = i === 0; // only first waypoint visible
      this._scene.add(group);

      const light = new THREE.PointLight(0xddaa44, 3, 35);
      light.position.copy(pos); light.position.y += 3;
      light.visible = i === 0;
      this._scene.add(light);

      // clues generated in second pass below
      this._waypoints.push({ pos, name, found: false, mesh: group, light, clue: "" });
    }

    // generate clues referencing landmarks and terrain
    const clueRng = mulberry32(this._seed + 200);
    for (let i = 0; i < this._waypoints.length; i++) {
      const from = i === 0 ? new THREE.Vector3(0, 0, 0) : this._waypoints[i - 1].pos;
      this._waypoints[i].clue = generateClue(from, this._waypoints[i].pos, this._waypoints[i].name, clueRng, this._landmarks, this._heightmap);
    }
  }

  // ── landmark generation ────────────────────────────────────────────────────

  private _generateLandmarks(): void {
    this._landmarks = [];
    const rng = mulberry32(this._seed + 300);
    const landmarkNames = [
      "The Crooked Oak", "Gawain's Cairn", "The Weeping Stone", "The Wolf's Den",
      "The Hermit's Shrine", "The Broken Arch", "The Eagle's Perch", "The Druid's Ring",
      "The Mossy Monolith", "The King's Road Marker", "The Hollow Tree", "The Watchtower Ruin",
    ];

    for (let i = 0; i < 12; i++) {
      const x = (rng() - 0.5) * WORLD_SIZE * 0.7;
      const z = (rng() - 0.5) * WORLD_SIZE * 0.7;
      const h = getHeight(this._heightmap, TERRAIN_SEGMENTS, x, z);
      const type = LANDMARK_TYPES[Math.floor(rng() * LANDMARK_TYPES.length)];
      const pos = new THREE.Vector3(x, h, z);

      this._landmarks.push({ pos, type, name: landmarkNames[i], discovered: false });
      this._buildLandmark(pos, type, rng);
    }
  }

  private _buildLandmark(pos: THREE.Vector3, type: string, rng: () => number): void {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x778877, roughness: 0.8 });

    switch (type) {
      case "stone_circle": {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const stone = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5 + rng(), 0.3), stoneMat);
          stone.position.copy(pos);
          stone.position.x += Math.cos(a) * 4;
          stone.position.z += Math.sin(a) * 4;
          stone.position.y += 1;
          stone.rotation.y = a;
          stone.castShadow = true;
          this._scene.add(stone);
        }
        break;
      }
      case "ruined_tower": {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 6, 16, 1, true), stoneMat);
        tower.position.copy(pos); tower.position.y += 3;
        tower.castShadow = true; this._scene.add(tower);
        // rubble
        for (let j = 0; j < 5; j++) {
          const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + rng() * 0.5), stoneMat);
          rubble.position.copy(pos);
          rubble.position.x += (rng() - 0.5) * 4;
          rubble.position.z += (rng() - 0.5) * 4;
          rubble.position.y += 0.3;
          this._scene.add(rubble);
        }
        break;
      }
      case "ancient_tree": {
        const bigTrunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.6, 1, 6, 16),
          new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 })
        );
        bigTrunk.position.copy(pos); bigTrunk.position.y += 3; bigTrunk.castShadow = true;
        this._scene.add(bigTrunk);
        const bigCanopy = new THREE.Mesh(
          new THREE.SphereGeometry(3, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0x224411, roughness: 0.8 })
        );
        bigCanopy.position.copy(pos); bigCanopy.position.y += 7; bigCanopy.castShadow = true;
        this._scene.add(bigCanopy);
        break;
      }
      case "monolith": {
        const mono = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 0.5), stoneMat);
        mono.position.copy(pos); mono.position.y += 2;
        mono.rotation.z = (rng() - 0.5) * 0.1;
        mono.castShadow = true; this._scene.add(mono);
        break;
      }
      case "cairn": {
        for (let j = 0; j < 8; j++) {
          const s = 0.3 + rng() * 0.4;
          const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s), stoneMat);
          rock.position.copy(pos);
          rock.position.x += (rng() - 0.5) * 1.5;
          rock.position.z += (rng() - 0.5) * 1.5;
          rock.position.y += j * 0.3 + 0.3;
          this._scene.add(rock);
        }
        break;
      }
      case "shrine": {
        // small stone structure with glow
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.5), stoneMat);
        base.position.copy(pos); base.position.y += 0.3; this._scene.add(base);
        const top = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.2, 12),
          new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.7 }));
        top.position.copy(pos); top.position.y += 1.2; this._scene.add(top);
        const glow = new THREE.PointLight(0x88aaff, 0.6, 10);
        glow.position.copy(pos); glow.position.y += 1.5; this._scene.add(glow);
        break;
      }
    }
  }

  // ── update loop ────────────────────────────────────────────────────────────

  private _update(): void {
    if (this._phase === "title") {
      const t = this._time * 0.15;
      this._camera.position.set(Math.cos(t) * 12, 3.5 + Math.sin(t * 2) * 0.3, Math.sin(t) * 12);
      this._camera.lookAt(0, 0.5, 0);
      // animate standing stones
      let stoneIdx = 0;
      this._scene.traverse(obj => {
        if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.BoxGeometry && obj.position.y > 1) {
          obj.rotation.z = Math.sin(this._time * 0.5 + stoneIdx * 0.8) * 0.02;
          stoneIdx++;
        }
      });
      // pulse compass glow
      this._scene.traverse(obj => {
        if (obj instanceof THREE.PointLight && obj.color.r > 0.8 && obj.color.g > 0.6) {
          obj.intensity = 1.2 + Math.sin(this._time * 2) * 0.5;
        }
      });
      return;
    }

    if (this._phase === "paused") return;

    if (this._phase === "playing") {
      const totalTime = BEARING_DIFFICULTIES[this._difficulty].time;
      this._gameTime += this._dt;
      this._updatePlayer(this._dt);
      this._updateStamina(this._dt);
      this._updateHeadBob(this._dt);
      this._updateTorch();
      this._updateTimeOfDay();
      this._updateWaypointCheck();
      this._updateLandmarkDiscovery();
      this._updateCompassHUD();
      this._updateTimerHUD();
      this._animateWaypoints();
      this._updateFireflies(this._dt);
      this._updateRain(this._dt);
      this._updateFogWisps(this._dt);
      this._updateWaterAnimation(this._dt);
      this._updateTreeSway();
      this._updateDustMotes();
      this._updateLandmarkGlow();
      this._updateWaterAudio();
      this._updateCompassBacklight();
      this._updateAmbientSounds(this._dt);
      this._updateStaminaHUD();
      this._updateBirds(this._dt);
      this._updateDiscoveryParticles(this._dt);
      this._updateFootprints(this._dt);
      this._updateTimeBonuses();
      this._updateBiomeLabel();
      this._updateAltitudeIndicator();
      this._updateCampfire();
      this._updateTutorialHints();
      this._updateMinimap();
      this._updateInteractPrompt();
      this._trackDistance();
      this._checkAchievements();

      // timeout (no timeout in explorer mode)
      const effectiveTime = this._challenge === "explorer" ? 1800 : (this._challenge === "speed_run" ? totalTime * 0.5 : totalTime);
      if (this._gameTime >= effectiveTime) {
        this._phase = "timeout";
        if (document.pointerLockElement) document.exitPointerLock();

        // dramatic fade-to-dark overlay
        const fadeEl = document.createElement("div");
        fadeEl.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:13;pointer-events:none;background:radial-gradient(ellipse at center,rgba(20,8,0,0.3) 0%,rgba(0,0,0,0.8) 100%);opacity:0;transition:opacity 2s;";
        document.getElementById("pixi-container")!.appendChild(fadeEl);
        requestAnimationFrame(() => { fadeEl.style.opacity = "1"; });

        // descending minor chord for dramatic sunset
        this._playSound(196, 0.2, "sine", 1.5);
        this._pendingTimeouts.push(window.setTimeout(() => this._playSound(165, 0.15, "sine", 1.2), 300));
        this._pendingTimeouts.push(window.setTimeout(() => this._playSound(131, 0.12, "sine", 1.0), 600));

        // styled timeout screen after fade (guarded against phase change)
        this._pendingTimeouts.push(window.setTimeout(() => {
          if (this._phase !== "timeout") { fadeEl.parentNode?.removeChild(fadeEl); return; }
          this._hudCenter.innerHTML =
            `<div style="background:rgba(0,0,0,0.7);border:1px solid rgba(180,80,20,0.4);border-radius:10px;padding:25px 35px;max-width:380px;">` +
            `<div style="font-size:24px;color:#cc6622;text-align:center;text-shadow:0 0 20px rgba(204,100,34,0.6);letter-spacing:3px;">SUNSET</div>` +
            `<div style="font-size:13px;color:#886644;text-align:center;margin-top:6px;font-style:italic;">The darkness claims the land.</div>` +
            `<div style="border-top:1px solid rgba(255,255,255,0.1);margin:12px 0;"></div>` +
            `<div style="font-size:13px;color:#888;line-height:2;">` +
            `Waypoints found: <span style="color:#ddd;">${this._waypointsFound} / ${this._totalWaypoints}</span><br>` +
            `Distance: <span style="color:#ddd;">${Math.floor(this._distWalked)} paces</span><br>` +
            `Landmarks: <span style="color:#ddd;">${this._landmarks.filter(l => l.discovered).length}/${this._landmarks.length}</span>` +
            `</div>` +
            `<div style="font-size:10px;color:#555;margin-top:8px;">Seed: ${this._seed}</div>` +
            `<div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:12px;padding-top:10px;font-size:12px;color:#888;text-align:center;">ENTER to try again &nbsp;·&nbsp; ESC to exit</div>` +
            `</div>`;
          this._pendingTimeouts.push(window.setTimeout(() => { fadeEl.parentNode?.removeChild(fadeEl); }, 500));
        }, 2000));
      }
    }
  }

  // ── player movement ────────────────────────────────────────────────────────

  private _updatePlayer(dt: number): void {
    const wantSprint = this._keys.has("shift") && !this._exhausted;
    const sprint = wantSprint && this._stamina > 0;
    const sprintMult = this._challenge === "speed_run" ? 1.6 : 1.0;
    const speed = (sprint ? SPRINT_SPEED : WALK_SPEED) * sprintMult;

    // sprint FOV + vignette
    const targetFov = sprint ? 78 : 70;
    this._camera.fov += (targetFov - this._camera.fov) * 4 * dt;
    this._camera.updateProjectionMatrix();

    const vignetteEl = document.getElementById("bg-vignette");
    if (vignetteEl) vignetteEl.style.opacity = sprint ? "1" : "0";

    // dynamic bloom: slightly stronger at dusk for atmospheric glow
    const totalTime = BEARING_DIFFICULTIES[this._difficulty].time;
    const dayT = Math.min(1, this._gameTime / totalTime);
    this._bloomPass.strength = 0.7 + dayT * 0.4; // 0.7 noon → 1.1 sunset

    // movement relative to yaw
    let moveX = 0, moveZ = 0;
    if (this._keys.has("w") || this._keys.has("arrowup")) { moveX += Math.sin(this._yaw); moveZ -= Math.cos(this._yaw); }
    if (this._keys.has("s") || this._keys.has("arrowdown")) { moveX -= Math.sin(this._yaw); moveZ += Math.cos(this._yaw); }
    if (this._keys.has("a") || this._keys.has("arrowleft")) { moveX -= Math.cos(this._yaw); moveZ -= Math.sin(this._yaw); }
    if (this._keys.has("d") || this._keys.has("arrowright")) { moveX += Math.cos(this._yaw); moveZ += Math.sin(this._yaw); }

    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 0) { moveX /= len; moveZ /= len; }

    // slope affects speed: sample height ahead vs behind
    const sampleDist = 1.5;
    const hAhead = getHeight(this._heightmap, TERRAIN_SEGMENTS,
      this._playerPos.x + moveX * sampleDist, this._playerPos.z + moveZ * sampleDist);
    const hHere = getHeight(this._heightmap, TERRAIN_SEGMENTS, this._playerPos.x, this._playerPos.z);
    const slope = (hAhead - hHere) / sampleDist;
    const slopeMult = slope > 0.3 ? Math.max(0.3, 1 - slope * 1.2) : slope < -0.2 ? Math.min(1.4, 1 - slope * 0.6) : 1;

    // water slowdown check
    this._inWater = false;
    let waterMult = 1.0;
    for (const wb of this._waterBodies) {
      const dx = this._playerPos.x - wb.pos.x, dz = this._playerPos.z - wb.pos.z;
      if (dx * dx + dz * dz < wb.radius * wb.radius) {
        this._inWater = true;
        waterMult = 0.5; // 50% speed in water
        break;
      }
    }

    this._playerPos.x += moveX * speed * slopeMult * waterMult * dt;
    this._playerPos.z += moveZ * speed * slopeMult * waterMult * dt;

    // clamp to world
    const half = WORLD_SIZE / 2 - 10;
    this._playerPos.x = Math.max(-half, Math.min(half, this._playerPos.x));
    this._playerPos.z = Math.max(-half, Math.min(half, this._playerPos.z));

    // gravity + terrain following
    const groundH = getHeight(this._heightmap, TERRAIN_SEGMENTS, this._playerPos.x, this._playerPos.z) + PLAYER_HEIGHT;
    this._playerVelY -= GRAVITY * dt;
    this._playerPos.y += this._playerVelY * dt;

    if (this._playerPos.y <= groundH) {
      this._playerPos.y = groundH;
      this._playerVelY = 0;
      this._onGround = true;
    } else {
      this._onGround = false;
    }

    // jump
    if (this._keys.has(" ") && this._onGround) {
      this._playerVelY = JUMP_VEL;
      this._onGround = false;
    }

    // camera
    this._camera.position.copy(this._playerPos);
    this._camera.rotation.order = "YXZ";
    this._camera.rotation.y = this._yaw;
    this._camera.rotation.x = this._pitch;

    // footstep sound with terrain variation
    if (len > 0 && this._onGround && this._audioCtx && Math.random() < (sprint ? 0.06 : 0.03)) {
      if (this._inWater) {
        this._playFootstep(200, 0.08); // splash
        // water splash particle
        const splash = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 20, 16),
          new THREE.MeshBasicMaterial({ color: 0x6699cc, transparent: true, opacity: 0.5 })
        );
        splash.position.copy(this._playerPos); splash.position.y -= PLAYER_HEIGHT - 0.2;
        this._scene.add(splash);
        this._discoveryParticles.push({
          mesh: splash,
          vel: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 3, (Math.random() - 0.5) * 2),
          life: 0.4, maxLife: 0.4,
        });
      } else {
        const terrainH = hHere / TERRAIN_HEIGHT;
        if (terrainH < 0.15) this._playFootstep(300, 0.06);
        else if (terrainH > 0.5) this._playFootstep(900, 0.03);
        else this._playFootstep(600, 0.04);
      }
    }
  }

  // ── time of day ────────────────────────────────────────────────────────────

  private _updateTimeOfDay(): void {
    const totalTime = BEARING_DIFFICULTIES[this._difficulty].time;
    const t = Math.min(1, this._gameTime / totalTime); // 0..1
    this._sunAngle = Math.PI * 0.4 * (1 - t); // sun descends

    // sun position
    this._sunLight.position.set(
      Math.cos(this._sunAngle * 0.5) * 80,
      Math.sin(this._sunAngle) * 80 + 5,
      30
    );
    this._sunLight.intensity = Math.max(0.1, 1.2 * (1 - t * 0.8));

    // sky color: blue -> orange -> dark
    const skyR = 0.33 + t * 0.5, skyG = 0.47 - t * 0.3, skyB = 0.67 - t * 0.5;
    this._scene.background = new THREE.Color(skyR, skyG, skyB);

    // fog tightens as sun sets
    const fog = this._scene.fog as THREE.Fog;
    fog.far = FOG_BASE_FAR - t * (FOG_BASE_FAR - FOG_NIGHT_FAR);
    fog.color.setRGB(skyR, skyG, skyB);

    // sun color shifts to orange/red
    this._sunLight.color.setRGB(1, 0.9 - t * 0.4, 0.85 - t * 0.6);

    // animate sun disk + halo
    const sunDisk = this._scene.getObjectByName("sunDisk") as THREE.Mesh | undefined;
    const sunHalo = this._scene.getObjectByName("sunHalo") as THREE.Mesh | undefined;
    if (sunDisk) {
      sunDisk.position.copy(this._sunLight.position);
      (sunDisk.material as THREE.MeshBasicMaterial).color.setRGB(1, 0.85 - t * 0.4, 0.7 - t * 0.5);
      (sunDisk.material as THREE.MeshBasicMaterial).opacity = Math.max(0.2, 0.9 - t * 0.5);
    }
    if (sunHalo) {
      sunHalo.position.copy(this._sunLight.position);
      (sunHalo.material as THREE.MeshStandardMaterial).color.setRGB(1, 0.8 - t * 0.5, 0.6 - t * 0.5);
      (sunHalo.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + t * 1.0; // glows more at sunset
      (sunHalo.material as THREE.MeshStandardMaterial).opacity = 0.1 + t * 0.15;
    }

    // stars fade in at dusk + twinkle
    const stars = this._scene.getObjectByName("stars") as THREE.Points | undefined;
    if (stars) {
      const starMat = stars.material as THREE.PointsMaterial;
      starMat.opacity = Math.max(0, (t - 0.5) * 2);
      // twinkle: vary size slightly over time
      starMat.size = 0.4 + Math.sin(this._time * 1.5) * 0.15;
    }

    // ambient darkens
    this._scene.children.forEach(c => {
      if (c instanceof THREE.AmbientLight) c.intensity = 0.5 - t * 0.35;
    });

    // sky dome gradient shifts with sunset
    const skyDome = this._scene.getObjectByName("skyDome") as THREE.Mesh | undefined;
    if (skyDome) {
      const skyColArr = skyDome.geometry.attributes.color as THREE.BufferAttribute;
      const posArr = skyDome.geometry.attributes.position;
      for (let i = 0; i < posArr.count; i++) {
        const y = posArr.getY(i);
        const h = Math.max(0, y) / 270;
        // noon: blue gradient, sunset: orange/red at horizon, dark purple at zenith
        skyColArr.setXYZ(i,
          skyR + (1 - h) * t * 0.3,
          skyG + (1 - h) * Math.max(0, 0.2 - t * 0.3),
          skyB + h * (0.15 - t * 0.15)
        );
      }
      skyColArr.needsUpdate = true;
    }

    // cloud dome darkens and warms with sunset
    const dome = this._scene.getObjectByName("cloudDome");
    if (dome) {
      const mat = (dome as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 - t * 0.3;
      mat.color.setRGB(1, 1 - t * 0.3, 1 - t * 0.5); // white → warm orange → dark
    }
  }

  // ── waypoint checking ──────────────────────────────────────────────────────

  private _updateWaypointCheck(): void {
    if (this._currentWaypoint >= this._waypoints.length) return;
    const wp = this._waypoints[this._currentWaypoint];
    const dist = this._playerPos.distanceTo(wp.pos);

    // distance indicator
    const distEl = document.getElementById("bg-distance");
    if (distEl) {
      const paces = Math.round(dist / 2);
      distEl.textContent = paces < 20 ? `${paces} paces away — you're close!` : `~${paces} paces`;
      distEl.style.color = paces < 20 ? "#44dd44" : paces < 50 ? "#ddaa44" : "#666";
    }

    if (dist < WAYPOINT_RADIUS) {
      // found it!
      wp.found = true;
      this._waypointsFound++;
      this._phase = "found";

      // dramatic celebration: particles + sound + screen flash + light pulse
      this._spawnDiscoveryParticles(wp.pos);
      this._playSound(523, 0.2, "sine", 0.3);
      setTimeout(() => this._playSound(659, 0.2, "sine", 0.3), 120);
      setTimeout(() => this._playSound(784, 0.2, "sine", 0.4), 240);
      setTimeout(() => this._playSound(1047, 0.15, "sine", 0.5), 360);

      // screen golden flash
      const flashEl = document.createElement("div");
      flashEl.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:13;pointer-events:none;background:radial-gradient(ellipse at center,rgba(218,165,32,0.3) 0%,transparent 70%);transition:opacity 1s;";
      document.getElementById("pixi-container")!.appendChild(flashEl);
      setTimeout(() => { flashEl.style.opacity = "0"; }, 100);
      setTimeout(() => { flashEl.parentNode?.removeChild(flashEl); }, 1200);

      // pulse the waypoint light intensely
      if (wp.light) {
        wp.light.intensity = 8;
        setTimeout(() => { if (wp.light) wp.light.intensity = 2; }, 500);
      }

      // show found message
      const remaining = this._totalWaypoints - this._waypointsFound;
      if (remaining > 0) {
        this._hudCenter.innerHTML = `<div style="font-size:28px;color:#daa520;text-shadow:0 0 30px rgba(218,165,32,0.8);">${wp.name}</div><div style="font-size:16px;color:#aaa;margin-top:8px;">DISCOVERED</div><div style="font-size:13px;color:#666;margin-top:12px;">${remaining} waypoint${remaining > 1 ? "s" : ""} remaining</div>`;
        setTimeout(() => {
          this._currentWaypoint++;
          if (this._currentWaypoint < this._waypoints.length) {
            // reveal next waypoint
            const next = this._waypoints[this._currentWaypoint];
            if (next.mesh) next.mesh.visible = true;
            if (next.light) next.light.visible = true;
            this._showCurrentClue();
          }
          this._phase = "playing";
          this._hudCenter.textContent = "";
        }, 2000);
      } else {
        // all found! Victory!
        this._phase = "victory";
        const totalTime = BEARING_DIFFICULTIES[this._difficulty].time;
        const timeLeft = Math.max(0, totalTime - this._gameTime);
        const mins = Math.floor(this._gameTime / 60);
        const secs = Math.floor(this._gameTime % 60);
        const newBest = this._saveBestTime();
        const lmFound = this._landmarks.filter(l => l.discovered).length;
        this._hudCenter.innerHTML =
          `<div style="background:rgba(0,0,0,0.7);border:1px solid rgba(218,165,32,0.5);border-radius:10px;padding:25px 35px;max-width:400px;">` +
          `<div style="font-size:26px;color:#daa520;text-align:center;text-shadow:0 0 25px rgba(218,165,32,0.8);letter-spacing:3px;">ALL WAYPOINTS FOUND!</div>` +
          (newBest ? `<div style="font-size:14px;color:#ffdd44;text-align:center;margin-top:6px;text-shadow:0 0 12px rgba(255,221,68,0.6);">NEW BEST TIME!</div>` : "") +
          `<div style="border-top:1px solid rgba(255,255,255,0.1);margin:12px 0;"></div>` +
          `<div style="font-size:13px;color:#aaa;line-height:2;">` +
          `Time: <span style="color:#ddd;">${mins}:${String(secs).padStart(2, "0")}</span><br>` +
          `Remaining: <span style="color:#ddd;">${Math.floor(timeLeft)}s</span><br>` +
          `Waypoints: <span style="color:#44cc44;">${this._totalWaypoints}/${this._totalWaypoints}</span><br>` +
          `Distance: <span style="color:#ddd;">${Math.floor(this._distWalked)} paces</span><br>` +
          `Landmarks: <span style="color:#ddd;">${lmFound}/${this._landmarks.length}</span>` +
          (this._challenge !== "normal" ? `<br>Challenge: <span style="color:#daa520;">${CHALLENGE_MODES[this._challenge].label}</span>` : "") +
          `</div>` +
          `<div style="font-size:10px;color:#555;margin-top:8px;">Seed: ${this._seed}</div>` +
          `<div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:12px;padding-top:10px;font-size:12px;color:#888;text-align:center;">ENTER to play again &nbsp;·&nbsp; ESC to exit</div>` +
          `</div>`;
        if (document.pointerLockElement) document.exitPointerLock();

        // victory sound
        [523, 659, 784, 1047].forEach((f, i) => {
          setTimeout(() => this._playSound(f, 0.12, "sine", 0.4), i * 150);
        });
      }
    }
  }

  private _showCurrentClue(): void {
    if (this._currentWaypoint < this._waypoints.length) {
      this._hudClue.textContent = this._waypoints[this._currentWaypoint].clue;
    }
  }

  // ── landmark discovery ─────────────────────────────────────────────────────

  private _updateLandmarkDiscovery(): void {
    for (const lm of this._landmarks) {
      if (lm.discovered) continue;
      const dist = this._playerPos.distanceTo(lm.pos);
      if (dist < 15) {
        lm.discovered = true;
        // brief notification
        const prev = this._hudClue.textContent;
        this._hudClue.textContent = `Landmark discovered: ${lm.name}`;
        setTimeout(() => { this._hudClue.textContent = prev || ""; }, 2500);
        this._playSound(440, 0.1, "triangle", 0.15);
      }
    }
  }

  // ── compass HUD ────────────────────────────────────────────────────────────

  private _updateCompassHUD(): void {
    const ctx = this._compassCtx;
    const size = 200;
    const cx = size / 2, cy = size / 2;
    const r = this._compassZoom ? 85 : 75;
    ctx.clearRect(0, 0, size, size);

    // zoom effect
    this._hudCompass.style.transform = this._compassZoom
      ? "translateX(-50%) scale(1.5)" : "translateX(-50%) scale(1)";

    // compass ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(218,165,32,0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // inner ring
    ctx.beginPath();
    ctx.arc(cx, cy, r - 8, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(218,165,32,0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // cardinal directions (rotate by player yaw)
    const dirs = [
      { label: "N", angle: 0, color: "#cc3333" },
      { label: "E", angle: Math.PI / 2, color: "#daa520" },
      { label: "S", angle: Math.PI, color: "#daa520" },
      { label: "W", angle: -Math.PI / 2, color: "#daa520" },
    ];

    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const d of dirs) {
      const a = d.angle - this._yaw;
      const lx = cx + Math.sin(a) * (r - 18);
      const ly = cy - Math.cos(a) * (r - 18);
      ctx.fillStyle = d.color;
      ctx.fillText(d.label, lx, ly);

      // tick mark
      const tx1 = cx + Math.sin(a) * (r - 5);
      const ty1 = cy - Math.cos(a) * (r - 5);
      const tx2 = cx + Math.sin(a) * r;
      const ty2 = cy - Math.cos(a) * r;
      ctx.beginPath();
      ctx.moveTo(tx1, ty1); ctx.lineTo(tx2, ty2);
      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.label === "N" ? 3 : 1.5;
      ctx.stroke();
    }

    // inter-cardinal ticks
    for (let i = 0; i < 16; i++) {
      if (i % 4 === 0) continue;
      const a = (i / 16) * Math.PI * 2 - this._yaw;
      const tx1 = cx + Math.sin(a) * (r - 3);
      const ty1 = cy - Math.cos(a) * (r - 3);
      const tx2 = cx + Math.sin(a) * r;
      const ty2 = cy - Math.cos(a) * r;
      ctx.beginPath(); ctx.moveTo(tx1, ty1); ctx.lineTo(tx2, ty2);
      ctx.strokeStyle = "rgba(218,165,32,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // needle pointing north with wobble
    this._needleWobbleTarget = (Math.random() - 0.5) * 0.06;
    this._needleWobble += (this._needleWobbleTarget - this._needleWobble) * 0.1;
    const needleAngle = -this._yaw + this._needleWobble;
    // red north end
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(needleAngle) * (r - 25), cy - Math.cos(needleAngle) * (r - 25));
    ctx.strokeStyle = "#cc3333";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#cc3333"; ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // white south end
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - Math.sin(needleAngle) * (r - 30), cy + Math.cos(needleAngle) * (r - 30));
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#daa520";
    ctx.fill();

    // extra detail when zoomed: degree numbers, inter-cardinal labels, distance ring
    if (this._compassZoom) {
      // degree markings every 30 degrees
      ctx.font = "8px monospace";
      ctx.fillStyle = "rgba(218,165,32,0.3)";
      for (let deg = 0; deg < 360; deg += 30) {
        if (deg % 90 === 0) continue; // skip N/E/S/W
        const a = (deg * Math.PI / 180) - this._yaw;
        const lx = cx + Math.sin(a) * (r - 26);
        const ly = cy - Math.cos(a) * (r - 26);
        ctx.fillText(`${deg}`, lx, ly);
      }
      // inter-cardinal labels (NE, SE, SW, NW)
      ctx.font = "9px monospace";
      ctx.fillStyle = "rgba(218,165,32,0.25)";
      const icDirs = [
        { label: "NE", angle: Math.PI / 4 }, { label: "SE", angle: 3 * Math.PI / 4 },
        { label: "SW", angle: 5 * Math.PI / 4 }, { label: "NW", angle: 7 * Math.PI / 4 },
      ];
      for (const ic of icDirs) {
        const a = ic.angle - this._yaw;
        ctx.fillText(ic.label, cx + Math.sin(a) * (r - 34), cy - Math.cos(a) * (r - 34));
      }
      // distance to waypoint as arc
      if (this._currentWaypoint < this._waypoints.length) {
        const dist = this._playerPos.distanceTo(this._waypoints[this._currentWaypoint].pos);
        ctx.fillStyle = "rgba(218,165,32,0.4)";
        ctx.font = "10px monospace";
        ctx.fillText(`${Math.round(dist / 2)} paces`, cx, cy + r - 8);
      }
    }

    // waypoint indicator: arrow pointing to current waypoint (hidden in no_compass mode)
    if (this._currentWaypoint < this._waypoints.length && this._challenge !== "no_compass") {
      const wp = this._waypoints[this._currentWaypoint];
      const dx = wp.pos.x - this._playerPos.x;
      const dz = wp.pos.z - this._playerPos.z;
      const wpAngle = Math.atan2(dx, -dz) - this._yaw;

      // golden arrow at compass edge
      const ax = cx + Math.sin(wpAngle) * (r + 6);
      const ay = cy - Math.cos(wpAngle) * (r + 6);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + Math.sin(wpAngle + 2.5) * 5, ay - Math.cos(wpAngle + 2.5) * 5);
      ctx.lineTo(ax + Math.sin(wpAngle - 2.5) * 5, ay - Math.cos(wpAngle - 2.5) * 5);
      ctx.closePath();
      ctx.fillStyle = "#daa520";
      ctx.shadowColor = "#daa520"; ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // bearing text
    const bearingDeg = (((-this._yaw * 180 / Math.PI) % 360) + 360) % 360;
    const cardinal = bearingToCardinal(-this._yaw + Math.PI);
    this._hudBearing.textContent = `${Math.round(bearingDeg)}° ${cardinal}`;
  }

  // ── timer HUD ──────────────────────────────────────────────────────────────

  private _updateTimerHUD(): void {
    const remaining = Math.max(0, BEARING_DIFFICULTIES[this._difficulty].time - this._gameTime);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    this._hudTimer.textContent = `${mins}:${String(secs).padStart(2, "0")}`;
    this._hudTimer.style.color = remaining < 60 ? "#ff4444" : remaining < 120 ? "#ffaa44" : "#cc8844";

    this._hudProgress.textContent = `Waypoints: ${this._waypointsFound} / ${this._totalWaypoints}`;
  }

  // ── animate waypoint beacons ───────────────────────────────────────────────

  private _animateWaypoints(): void {
    for (const wp of this._waypoints) {
      if (!wp.mesh || !wp.mesh.visible) continue;
      const orb = wp.mesh.getObjectByName("orb");
      if (orb) {
        orb.position.y = 2.5 + Math.sin(this._time * 2) * 0.3;
        orb.rotation.y += this._dt;
      }
      const beam = wp.mesh.getObjectByName("beam");
      if (beam) {
        ((beam as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.2 + Math.sin(this._time * 3) * 0.08;
      }
    }
  }

  // ── map overlay ────────────────────────────────────────────────────────────

  private _drawMap(): void {
    const ctx = this._mapCtx;
    const w = 400, h = 400;
    ctx.clearRect(0, 0, w, h);

    // biome-colored terrain heightmap
    const imgData = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const wx = ((x / w) - 0.5) * WORLD_SIZE;
        const wz = ((y / h) - 0.5) * WORLD_SIZE;
        const height = getHeight(this._heightmap, TERRAIN_SEGMENTS, wx, wz);
        const t = height / TERRAIN_HEIGHT;
        const idx = (y * w + x) * 4;
        if (t < 0.1) {
          // marsh: dark blue-green
          imgData.data[idx] = 25; imgData.data[idx + 1] = 45; imgData.data[idx + 2] = 50;
        } else if (t < 0.25) {
          // meadow: bright green
          imgData.data[idx] = 40 + t * 80; imgData.data[idx + 1] = 70 + t * 100; imgData.data[idx + 2] = 25;
        } else if (t < 0.5) {
          // forest: dark green
          imgData.data[idx] = 25 + t * 40; imgData.data[idx + 1] = 50 + t * 50; imgData.data[idx + 2] = 20;
        } else if (t < 0.7) {
          // foothills: brown
          imgData.data[idx] = 70 + t * 40; imgData.data[idx + 1] = 55 + t * 30; imgData.data[idx + 2] = 35;
        } else {
          // peaks: gray
          const g = 60 + t * 50;
          imgData.data[idx] = g; imgData.data[idx + 1] = g; imgData.data[idx + 2] = g + 5;
        }
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const toMap = (p: THREE.Vector3) => ({
      x: (p.x / WORLD_SIZE + 0.5) * w,
      y: (p.z / WORLD_SIZE + 0.5) * h,
    });

    // water bodies in blue
    this._scene.traverse(obj => {
      if (obj.name === "water" && obj instanceof THREE.Mesh) {
        const s = toMap(obj.position);
        const r = 8;
        ctx.fillStyle = "rgba(30,60,120,0.6)";
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
      }
    });

    // footprint trail
    if (this._footprints.length > 1) {
      ctx.strokeStyle = "rgba(255,255,200,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < this._footprints.length; i++) {
        const s = toMap(this._footprints[i].position);
        i === 0 ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y);
      }
      ctx.stroke();
    }

    // campfire at center
    const cf = toMap(new THREE.Vector3(0, 0, 0));
    ctx.fillStyle = "#ff8844";
    ctx.shadowColor = "#ff8844"; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(cf.x, cf.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffaa66"; ctx.font = "8px monospace"; ctx.textAlign = "center";
    ctx.fillText("Camp", cf.x, cf.y - 7);

    // discovered landmarks
    for (const lm of this._landmarks) {
      if (!lm.discovered) continue;
      const s = toMap(lm.pos);
      ctx.fillStyle = "#998877";
      ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#bbaa99";
      ctx.font = "7px monospace"; ctx.textAlign = "center";
      ctx.fillText(lm.name, s.x, s.y - 5);
    }

    // time bonus crystals (uncollected)
    for (const tb of this._timeBonuses) {
      if (tb.collected) continue;
      const s = toMap(tb.pos);
      ctx.fillStyle = "#44ddff";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 3); ctx.lineTo(s.x + 2, s.y); ctx.lineTo(s.x, s.y + 3); ctx.lineTo(s.x - 2, s.y);
      ctx.closePath(); ctx.fill();
    }

    // waypoints
    for (let i = 0; i < this._waypoints.length; i++) {
      const wp = this._waypoints[i];
      if (!wp.found && i !== this._currentWaypoint) continue;
      const s = toMap(wp.pos);
      if (i === this._currentWaypoint && !wp.found) {
        // pulsing gold for current target
        ctx.shadowColor = "#daa520"; ctx.shadowBlur = 8;
        ctx.fillStyle = "#daa520";
        ctx.beginPath(); ctx.arc(s.x, s.y, 6 + Math.sin(this._time * 3) * 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = "#44cc44";
        ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#ffffff";
      ctx.font = "8px monospace"; ctx.textAlign = "center";
      ctx.fillText(wp.name, s.x, s.y - 9);
    }

    // player position + direction
    const ps = toMap(this._playerPos);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffffff"; ctx.shadowBlur = 8;
    ctx.beginPath();
    const pa = -this._yaw;
    ctx.moveTo(ps.x + Math.sin(pa) * 8, ps.y - Math.cos(pa) * 8);
    ctx.lineTo(ps.x + Math.sin(pa + 2.5) * 5, ps.y - Math.cos(pa + 2.5) * 5);
    ctx.lineTo(ps.x + Math.sin(pa - 2.5) * 5, ps.y - Math.cos(pa - 2.5) * 5);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;

    // legend + stats
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "9px monospace"; ctx.textAlign = "left";
    ctx.fillText(`Dist: ${Math.floor(this._distWalked)} paces`, 8, h - 25);
    ctx.fillText(`Found: ${this._waypointsFound}/${this._totalWaypoints}`, 8, h - 14);
    ctx.textAlign = "center";
    ctx.fillText("[TAB] close", w / 2, h - 6);
  }

  // ── stamina system ──────────────────────────────────────────────────────────

  private _updateStamina(dt: number): void {
    const moving = this._keys.has("w") || this._keys.has("s") || this._keys.has("a") || this._keys.has("d")
      || this._keys.has("arrowup") || this._keys.has("arrowdown") || this._keys.has("arrowleft") || this._keys.has("arrowright");
    const sprinting = this._keys.has("shift") && moving && !this._exhausted;

    if (sprinting && this._stamina > 0) {
      this._stamina = Math.max(0, this._stamina - STAMINA_DRAIN * dt);
      if (this._stamina <= 0) this._exhausted = true;
    } else {
      this._stamina = Math.min(STAMINA_MAX, this._stamina + STAMINA_REGEN * dt);
      if (this._stamina > STAMINA_EXHAUSTED_THRESHOLD) this._exhausted = false;
    }
  }

  private _updateStaminaHUD(): void {
    const pct = (this._stamina / STAMINA_MAX) * 100;
    this._hudStamina.style.width = `${pct}%`;
    this._hudStamina.style.background = this._exhausted ? "linear-gradient(90deg,#cc4444,#aa4444)"
      : pct < 30 ? "linear-gradient(90deg,#ccaa44,#cc8844)" : "linear-gradient(90deg,#44aa44,#88cc44)";
  }

  // ── head bob ───────────────────────────────────────────────────────────────

  private _updateHeadBob(dt: number): void {
    const moving = this._keys.has("w") || this._keys.has("s") || this._keys.has("a") || this._keys.has("d")
      || this._keys.has("arrowup") || this._keys.has("arrowdown") || this._keys.has("arrowleft") || this._keys.has("arrowright");
    const sprinting = this._keys.has("shift") && !this._exhausted && this._stamina > 0;

    if (moving && this._onGround) {
      const bobSpeed = sprinting ? BOB_SPRINT_SPEED : BOB_WALK_SPEED;
      const bobAmp = sprinting ? BOB_SPRINT_AMP : BOB_WALK_AMP;
      this._bobPhase += dt * bobSpeed;
      this._bobOffset = Math.sin(this._bobPhase * Math.PI * 2) * bobAmp;
    } else {
      this._bobOffset *= 0.9; // smooth return
    }
    this._camera.position.y += this._bobOffset;
  }

  // ── torch ──────────────────────────────────────────────────────────────────

  private _updateTorch(): void {
    const totalTime = BEARING_DIFFICULTIES[this._difficulty].time;
    const t = this._gameTime / totalTime;
    // torch activates after 50% time (dusk)
    const torchIntensity = t > 0.5 ? Math.min(TORCH_INTENSITY, (t - 0.5) * 2 * TORCH_INTENSITY) : 0;
    if (this._torchLight) {
      this._torchLight.intensity = torchIntensity + Math.sin(this._time * 8) * 0.15 * torchIntensity; // flicker
    }
    if (this._torchMesh) {
      this._torchMesh.visible = torchIntensity > 0.1;
    }
  }

  // ── firefly particles ──────────────────────────────────────────────────────

  private _spawnFireflies(): void {
    const rng = mulberry32(this._seed + 500);
    for (let i = 0; i < 60; i++) {
      const x = (rng() - 0.5) * WORLD_SIZE * 0.6;
      const z = (rng() - 0.5) * WORLD_SIZE * 0.6;
      const h = getHeight(this._heightmap, TERRAIN_SEGMENTS, x, z);
      if (h < 1) continue;

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 20, 16),
        new THREE.MeshStandardMaterial({ color: 0xccff44, emissive: 0xccff44, emissiveIntensity: 2.0, toneMapped: false })
      );
      const basePos = new THREE.Vector3(x, h + 1 + rng() * 2, z);
      mesh.position.copy(basePos);
      mesh.visible = false; // visible at dusk
      this._scene.add(mesh);
      this._fireflies.push({ mesh, basePos, phase: rng() * Math.PI * 2 });
    }
  }

  private _updateFireflies(dt: number): void {
    const totalTime = BEARING_DIFFICULTIES[this._difficulty].time;
    const t = this._gameTime / totalTime;
    const visible = t > 0.4;

    for (const ff of this._fireflies) {
      ff.mesh.visible = visible;
      if (!visible) continue;
      ff.phase += dt * (1.5 + Math.sin(ff.phase * 0.3) * 0.5);
      ff.mesh.position.x = ff.basePos.x + Math.sin(ff.phase) * 1.5;
      ff.mesh.position.y = ff.basePos.y + Math.sin(ff.phase * 0.7) * 0.5;
      ff.mesh.position.z = ff.basePos.z + Math.cos(ff.phase * 0.8) * 1.5;
      // pulse opacity
      const mat = ff.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.0 + Math.sin(ff.phase * 3) * 1.0;
    }
  }

  // ── cloud dome ─────────────────────────────────────────────────────────────

  private _buildCloudDome(): void {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, 256, 256);
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 256, y = Math.random() * 256, r = 15 + Math.random() * 35;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(255,255,255,${0.03 + Math.random() * 0.05})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(280, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.5, side: THREE.BackSide, depthWrite: false })
    );
    dome.name = "cloudDome";
    dome.position.y = -5;
    this._scene.add(dome);
  }

  // ── water bodies ───────────────────────────────────────────────────────────

  private _buildWaterBodies(): void {
    this._waterBodies = [];
    const rng = mulberry32(this._seed + 600);
    for (let i = 0; i < 5; i++) {
      const x = (rng() - 0.5) * WORLD_SIZE * 0.6;
      const z = (rng() - 0.5) * WORLD_SIZE * 0.6;
      const h = getHeight(this._heightmap, TERRAIN_SEGMENTS, x, z);
      if (h > 3) continue;
      const size = 8 + rng() * 15;
      const water = new THREE.Mesh(
        new THREE.CircleGeometry(size, 24),
        new THREE.MeshStandardMaterial({ color: 0x2255aa, transparent: true, opacity: 0.6, roughness: 0.05, metalness: 0.4 })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(x, h + 0.1, z);
      water.name = "water";
      this._scene.add(water);
      this._waterBodies.push({ pos: new THREE.Vector3(x, h, z), radius: size });
    }
  }

  // ── rain ───────────────────────────────────────────────────────────────────

  private _buildRain(): void {
    const count = 2000;
    this._rainPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this._rainPositions[i * 3] = (Math.random() - 0.5) * 150;
      this._rainPositions[i * 3 + 1] = Math.random() * 50;
      this._rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 150;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(this._rainPositions, 3));
    this._rainDrops = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xaaaacc, size: 0.08, transparent: true, opacity: 0.4, sizeAttenuation: true,
    }));
    this._scene.add(this._rainDrops);
  }

  private _updateRain(dt: number): void {
    if (!this._rainDrops || !this._rainPositions) return;
    for (let i = 0; i < this._rainPositions.length / 3; i++) {
      this._rainPositions[i * 3 + 1] -= 50 * dt;
      if (this._rainPositions[i * 3 + 1] < -2) {
        this._rainPositions[i * 3] = this._playerPos.x + (Math.random() - 0.5) * 150;
        this._rainPositions[i * 3 + 1] = 40 + Math.random() * 15;
        this._rainPositions[i * 3 + 2] = this._playerPos.z + (Math.random() - 0.5) * 150;
      }
    }
    this._rainDrops.geometry.attributes.position.needsUpdate = true;
  }

  // ── achievements ───────────────────────────────────────────────────────────

  private _bearingAchievements = [
    { id: "bg_first_find", name: "PATHFINDER", desc: "Find your first waypoint", check: () => this._waypointsFound >= 1 },
    { id: "bg_all_found", name: "GRAIL SEEKER", desc: "Find all waypoints", check: () => this._phase === "victory" },
    { id: "bg_speedster", name: "SWIFT PILGRIM", desc: "Complete in under 2 minutes", check: () => this._phase === "victory" && this._gameTime < 120 },
    { id: "bg_explorer", name: "CARTOGRAPHER", desc: "Discover all 12 landmarks", check: () => this._landmarks.every(l => l.discovered) },
    { id: "bg_marathon", name: "MARATHON", desc: "Walk 500+ paces in one game", check: () => this._distWalked >= 500 },
    { id: "bg_no_compass", name: "TRUE NAVIGATOR", desc: "Win in No Compass mode", check: () => this._phase === "victory" && this._challenge === "no_compass" },
    { id: "bg_hermit", name: "HERMIT'S WAY", desc: "Win on Hermit difficulty", check: () => this._phase === "victory" && this._difficulty === "hermit" },
    { id: "bg_crystal", name: "CRYSTAL HUNTER", desc: "Collect 5+ time crystals", check: () => this._timeBonuses.filter(t => t.collected).length >= 5 },
    { id: "bg_dry", name: "DRY FEET", desc: "Win without entering water", check: () => this._phase === "victory" && !this._inWater },
  ];

  private _checkAchievements(): void {
    try {
      const saved: string[] = JSON.parse(localStorage.getItem("bearing_achievements") || "[]");
      this._achievementsUnlocked = new Set(saved);
    } catch { /* */ }

    let newUnlock = false;
    for (const a of this._bearingAchievements) {
      if (this._achievementsUnlocked.has(a.id)) continue;
      if (a.check()) {
        this._achievementsUnlocked.add(a.id);
        newUnlock = true;
        // show popup
        this._hudClue.innerHTML = `<span style="color:#ffd700;">ACHIEVEMENT: ${a.name}</span><br><span style="font-size:11px;color:#aaa;">${a.desc}</span>`;
        this._achievementPopupTimer = 3;
        this._playSound(660, 0.12, "sine", 0.2);
        setTimeout(() => this._playSound(880, 0.1, "sine", 0.25), 120);
      }
    }
    if (newUnlock) {
      localStorage.setItem("bearing_achievements", JSON.stringify([...this._achievementsUnlocked]));
    }

    // restore clue after popup
    if (this._achievementPopupTimer > 0) {
      this._achievementPopupTimer -= this._dt;
      if (this._achievementPopupTimer <= 0) this._showCurrentClue();
    }
  }

  // ── tree wind sway ──────────────────────────────────────────────────────────

  private _treeSwaySample = 0;

  private _updateTreeSway(): void {
    // only update every 3rd frame for performance (500+ trees)
    this._treeSwaySample++;
    if (this._treeSwaySample % 3 !== 0) return;

    const windStr = 0.015 + Math.sin(this._time * 0.3) * 0.008; // wind gusts
    const windDir = this._time * 0.1; // slowly shifting wind direction

    this._scene.traverse(obj => {
      if (obj.name === "treeCanopy") {
        const phase = obj.position.x * 0.05 + obj.position.z * 0.03;
        obj.rotation.z = Math.sin(this._time * 1.2 + phase) * windStr;
        obj.rotation.x = Math.cos(this._time * 0.9 + phase + windDir) * windStr * 0.7;
      }
    });
  }

  // ── floating dust motes ────────────────────────────────────────────────────

  private _dustMotes: THREE.Points | null = null;
  private _dustMotePositions: Float32Array | null = null;

  private _buildDustMotes(): void {
    const count = 150;
    this._dustMotePositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this._dustMotePositions[i * 3] = (Math.random() - 0.5) * 40;
      this._dustMotePositions[i * 3 + 1] = 1 + Math.random() * 6;
      this._dustMotePositions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(this._dustMotePositions, 3));
    this._dustMotes = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffdd, size: 0.06, transparent: true, opacity: 0.3, sizeAttenuation: true,
    }));
    this._dustMotes.name = "dustMotes";
    this._scene.add(this._dustMotes);
  }

  private _updateDustMotes(): void {
    if (!this._dustMotes || !this._dustMotePositions) return;
    const totalTime = BEARING_DIFFICULTIES[this._difficulty].time;
    const t = this._gameTime / totalTime;
    // dust motes only visible in sunlight (not at night)
    (this._dustMotes.material as THREE.PointsMaterial).opacity = Math.max(0, 0.3 - t * 0.4);

    for (let i = 0; i < this._dustMotePositions.length / 3; i++) {
      // slow upward drift + gentle horizontal wander
      this._dustMotePositions[i * 3] += Math.sin(this._time * 0.5 + i) * 0.01;
      this._dustMotePositions[i * 3 + 1] += 0.005;
      this._dustMotePositions[i * 3 + 2] += Math.cos(this._time * 0.4 + i * 0.7) * 0.008;
      // recenter near player
      if (this._dustMotePositions[i * 3 + 1] > 8) {
        this._dustMotePositions[i * 3] = this._playerPos.x + (Math.random() - 0.5) * 40;
        this._dustMotePositions[i * 3 + 1] = 1;
        this._dustMotePositions[i * 3 + 2] = this._playerPos.z + (Math.random() - 0.5) * 40;
      }
    }
    this._dustMotes.geometry.attributes.position.needsUpdate = true;
  }

  // ── landmark emissive accents at dusk ──────────────────────────────────────

  private _updateLandmarkGlow(): void {
    const totalTime = BEARING_DIFFICULTIES[this._difficulty].time;
    const t = this._gameTime / totalTime;
    if (t < 0.4) return; // no glow before dusk

    // add faint glow to discovered stone circles and monoliths
    const glowIntensity = (t - 0.4) * 0.5;
    for (const lm of this._landmarks) {
      if (!lm.discovered) continue;
      if (lm.type === "stone_circle" || lm.type === "monolith" || lm.type === "ruined_tower") {
        // check if we already added a glow light for this landmark
        const glowName = `lmGlow_${lm.name}`;
        let glow = this._scene.getObjectByName(glowName);
        if (!glow) {
          const light = new THREE.PointLight(0x6688aa, 0, 12);
          light.name = glowName;
          light.position.copy(lm.pos);
          light.position.y += 2;
          this._scene.add(light);
          glow = light;
        }
        (glow as THREE.PointLight).intensity = glowIntensity * (0.3 + Math.sin(this._time * 1.5 + lm.pos.x) * 0.15);
      }
    }
  }

  // ── water animation ─────────────────────────────────────────────────────────

  private _updateWaterAnimation(_dt: number): void {
    this._scene.traverse(obj => {
      if (obj.name === "water" && obj instanceof THREE.Mesh) {
        // gentle bob
        const baseY = obj.userData.baseY ?? obj.position.y;
        if (!obj.userData.baseY) obj.userData.baseY = obj.position.y;
        obj.position.y = baseY + Math.sin(this._time * 1.2 + obj.position.x * 0.05) * 0.08;
        // subtle rotation for ripple illusion
        obj.rotation.z = Math.sin(this._time * 0.6 + obj.position.z * 0.03) * 0.01;
        // color shimmer
        const mat = obj.material as THREE.MeshStandardMaterial;
        const phase = Math.sin(this._time * 0.5 + obj.position.x * 0.02) * 0.5 + 0.5;
        mat.color.setRGB(0.12 + phase * 0.04, 0.33 + phase * 0.04, 0.65 + phase * 0.04);
        mat.roughness = 0.02 + Math.sin(this._time * 2) * 0.02;
      }
    });
  }

  // ── fog wisps (visible particles for foggy weather) ─────────────────────────

  private _fogWisps: THREE.Mesh[] = [];

  private _buildFogWisps(): void {
    this._fogWisps = [];
    if (this._weather !== "foggy") return;
    for (let i = 0; i < 40; i++) {
      const geo = new THREE.SphereGeometry(2 + Math.random() * 3, 20, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.06 + Math.random() * 0.04, depthWrite: false });
      const wisp = new THREE.Mesh(geo, mat);
      wisp.position.set(
        (Math.random() - 0.5) * WORLD_SIZE * 0.5,
        1 + Math.random() * 4,
        (Math.random() - 0.5) * WORLD_SIZE * 0.5
      );
      wisp.name = `fogWisp_${i}`;
      this._scene.add(wisp);
      this._fogWisps.push(wisp);
    }
  }

  private _updateFogWisps(dt: number): void {
    for (const wisp of this._fogWisps) {
      wisp.position.x += Math.sin(this._time * 0.3 + wisp.position.z * 0.01) * 0.3 * dt;
      wisp.position.z += Math.cos(this._time * 0.2 + wisp.position.x * 0.01) * 0.2 * dt;
      // keep near player
      const dx = wisp.position.x - this._playerPos.x;
      const dz = wisp.position.z - this._playerPos.z;
      if (dx * dx + dz * dz > 80 * 80) {
        wisp.position.x = this._playerPos.x + (Math.random() - 0.5) * 80;
        wisp.position.z = this._playerPos.z + (Math.random() - 0.5) * 80;
      }
    }
  }

  // ── ambient audio ──────────────────────────────────────────────────────────

  private _startAmbientAudio(): void {
    if (!this._audioCtx) return;
    const ctx = this._audioCtx;

    // rain ambient (continuous hiss) if raining
    if (this._weather === "rain") {
      const rainBufSize = ctx.sampleRate * 2;
      const rainBuf = ctx.createBuffer(1, rainBufSize, ctx.sampleRate);
      const rd = rainBuf.getChannelData(0);
      for (let i = 0; i < rainBufSize; i++) rd[i] = (Math.random() * 2 - 1) * 0.3;
      const rainSrc = ctx.createBufferSource();
      rainSrc.buffer = rainBuf; rainSrc.loop = true;
      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = "highpass"; rainFilter.frequency.value = 3000;
      const rainGain = ctx.createGain();
      rainGain.gain.value = 0.04;
      rainSrc.connect(rainFilter); rainFilter.connect(rainGain); rainGain.connect(ctx.destination);
      rainSrc.start();
    }

    // continuous wind: brown noise through bandpass
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufSize; i++) {
      last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02;
      d[i] = last * 3;
    }
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = buf; windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 300;
    windFilter.Q.value = 0.5;

    this._windGain = ctx.createGain();
    this._windGain.gain.value = 0.06;

    windSrc.connect(windFilter);
    windFilter.connect(this._windGain);
    this._windGain.connect(ctx.destination);
    windSrc.start();
  }

  private _updateAmbientSounds(dt: number): void {
    // wind intensity varies with elevation
    if (this._windGain && this._audioCtx) {
      const elevation = this._playerPos.y / TERRAIN_HEIGHT;
      this._windGain.gain.setTargetAtTime(0.04 + elevation * 0.05, this._audioCtx.currentTime, 0.3);
    }

    // occasional bird calls
    this._ambientTimer -= dt;
    if (this._ambientTimer <= 0 && this._audioCtx) {
      this._ambientTimer = 3 + Math.random() * 8;
      const totalTime = BEARING_DIFFICULTIES[this._difficulty].time;
      const t = this._gameTime / totalTime;
      if (t < 0.7) {
        // bird chirp: quick frequency sweep
        const freq = 1500 + Math.random() * 2000;
        this._playSound(freq, 0.03, "sine", 0.08);
        setTimeout(() => this._playSound(freq * 1.1, 0.025, "sine", 0.06), 80);
        if (Math.random() > 0.5) setTimeout(() => this._playSound(freq * 0.9, 0.02, "sine", 0.07), 200);
      } else {
        // cricket chirps at dusk
        for (let c = 0; c < 3; c++) {
          setTimeout(() => this._playSound(4000 + Math.random() * 1000, 0.015, "square", 0.03), c * 60);
        }
      }
    }
  }

  // ── best times ─────────────────────────────────────────────────────────────

  private _loadBestTimes(): Record<string, number> {
    try { return JSON.parse(localStorage.getItem(LS_BEARING_BEST) || "{}"); }
    catch { return {}; }
  }

  private _saveBestTime(): boolean {
    const key = `${this._difficulty}_${this._weather}_${this._challenge}`;
    const bests = this._loadBestTimes();
    if (!bests[key] || this._gameTime < bests[key]) {
      bests[key] = this._gameTime;
      localStorage.setItem(LS_BEARING_BEST, JSON.stringify(bests));
      return true;
    }
    return false;
  }

  // ── discovery journal ───────────────────────────────────────────────────────

  private _drawJournal(): void {
    let html = `<div style="font-size:18px;color:#daa520;text-align:center;margin-bottom:12px;letter-spacing:2px;">DISCOVERY JOURNAL</div>`;
    html += `<div style="border-top:1px solid rgba(218,165,32,0.3);margin-bottom:10px;"></div>`;

    // waypoints section
    html += `<div style="font-size:13px;color:#daa520;margin:8px 0 4px;">WAYPOINTS (${this._waypointsFound}/${this._totalWaypoints})</div>`;
    for (let i = 0; i < this._waypoints.length; i++) {
      const wp = this._waypoints[i];
      if (wp.found) {
        html += `<div style="font-size:11px;color:#aaa;margin:3px 0;padding:4px 8px;background:rgba(68,204,68,0.08);border-left:2px solid #44cc44;border-radius:2px;">`;
        html += `<span style="color:#44cc44;">${wp.name}</span><br>`;
        html += `<span style="color:#777;font-style:italic;">${wp.clue}</span></div>`;
      } else if (i === this._currentWaypoint) {
        html += `<div style="font-size:11px;color:#daa520;margin:3px 0;padding:4px 8px;background:rgba(218,165,32,0.08);border-left:2px solid #daa520;border-radius:2px;">`;
        html += `<span style="color:#daa520;">${wp.name}</span> — seeking...<br>`;
        html += `<span style="color:#888;font-style:italic;">${wp.clue}</span></div>`;
      } else {
        html += `<div style="font-size:11px;color:#444;margin:3px 0;padding:4px 8px;">???</div>`;
      }
    }

    // landmarks section
    const discoveredLM = this._landmarks.filter(l => l.discovered);
    html += `<div style="font-size:13px;color:#daa520;margin:12px 0 4px;">LANDMARKS (${discoveredLM.length}/${this._landmarks.length})</div>`;
    for (const lm of this._landmarks) {
      if (lm.discovered) {
        html += `<div style="font-size:11px;color:#998877;margin:2px 0;padding:3px 8px;border-left:2px solid #887766;border-radius:2px;">`;
        html += `${lm.name} <span style="color:#555;">(${lm.type.replace("_", " ")})</span></div>`;
      }
    }
    if (discoveredLM.length === 0) {
      html += `<div style="font-size:11px;color:#444;margin:2px 0;">No landmarks discovered yet.</div>`;
    }

    // stats
    html += `<div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:10px;padding-top:8px;font-size:10px;color:#555;">`;
    html += `Distance: ${Math.floor(this._distWalked)} paces · Seed: ${this._seed}</div>`;
    html += `<div style="font-size:10px;color:#444;text-align:center;margin-top:8px;">[J] close</div>`;

    this._journalEl.innerHTML = html;
  }

  // ── ambient water audio ────────────────────────────────────────────────────

  private _startWaterAudio(): void {
    if (!this._audioCtx || this._waterBodies.length === 0) return;
    const ctx = this._audioCtx;

    // gentle flowing water noise
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let prev = 0;
    for (let i = 0; i < bufSize; i++) {
      prev = (prev + (Math.random() * 2 - 1) * 0.015) / 1.015;
      d[i] = prev * 2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass"; filter.frequency.value = 800; filter.Q.value = 0.8;

    this._waterAudioGain = ctx.createGain();
    this._waterAudioGain.gain.value = 0;

    src.connect(filter); filter.connect(this._waterAudioGain); this._waterAudioGain.connect(ctx.destination);
    src.start();
  }

  private _updateWaterAudio(): void {
    if (!this._waterAudioGain || !this._audioCtx) return;
    // volume based on distance to nearest water
    let minDist = Infinity;
    for (const wb of this._waterBodies) {
      const d = this._playerPos.distanceTo(wb.pos);
      if (d < minDist) minDist = d;
    }
    const vol = minDist < 5 ? 0.06 : minDist < 15 ? 0.04 * (1 - (minDist - 5) / 10) : 0;
    this._waterAudioGain.gain.setTargetAtTime(vol, this._audioCtx.currentTime, 0.3);
  }

  // ── compass backlight ──────────────────────────────────────────────────────

  private _updateCompassBacklight(): void {
    const totalTime = BEARING_DIFFICULTIES[this._difficulty].time;
    const t = this._gameTime / totalTime;
    // compass background plate brightens at dusk for readability
    const compassBg = this._hud.querySelector("div:first-child") as HTMLDivElement | null;
    if (compassBg && compassBg.style.borderRadius === "50%") {
      const bgAlpha = t > 0.5 ? 0.4 + (t - 0.5) * 0.6 : 0.4;
      compassBg.style.background = `rgba(0,0,0,${bgAlpha})`;
      if (t > 0.6) {
        compassBg.style.boxShadow = `0 0 ${10 + (t - 0.6) * 30}px rgba(218,165,32,${(t - 0.6) * 0.3})`;
      }
    }
  }

  // ── discovery particles ─────────────────────────────────────────────────────

  private _discoveryParticles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; maxLife: number }[] = [];

  private _spawnDiscoveryParticles(pos: THREE.Vector3): void {
    for (let i = 0; i < 30; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 20, 16),
        new THREE.MeshStandardMaterial({ color: 0xddaa44, emissive: 0xddaa44, emissiveIntensity: 2.0, toneMapped: false, transparent: true })
      );
      mesh.position.copy(pos);
      mesh.position.y += 2;
      this._scene.add(mesh);
      this._discoveryParticles.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 8 + 3, (Math.random() - 0.5) * 6),
        life: 1.5 + Math.random(),
        maxLife: 2.5,
      });
    }
  }

  private _updateDiscoveryParticles(dt: number): void {
    for (let i = this._discoveryParticles.length - 1; i >= 0; i--) {
      const p = this._discoveryParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this._scene.remove(p.mesh); p.mesh.geometry.dispose(); (p.mesh.material as THREE.Material).dispose();
        this._discoveryParticles.splice(i, 1);
        continue;
      }
      p.vel.y -= 12 * dt;
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      (p.mesh.material as THREE.MeshStandardMaterial).opacity = p.life / p.maxLife;
    }
  }

  // ── birds ──────────────────────────────────────────────────────────────────

  private _spawnBirds(): void {
    this._birds = [];
    const rng = mulberry32(this._seed + 700);
    for (let i = 0; i < 15; i++) {
      const x = (rng() - 0.5) * WORLD_SIZE * 0.6;
      const z = (rng() - 0.5) * WORLD_SIZE * 0.6;
      const h = getHeight(this._heightmap, TERRAIN_SEGMENTS, x, z);
      const group = new THREE.Group();
      // bird body
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16),
        new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 }));
      group.add(body);
      // wings
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide, roughness: 0.7 }));
        wing.position.set(side * 0.2, 0, 0);
        wing.name = `wing_${side}`;
        group.add(wing);
      }
      const basePos = new THREE.Vector3(x, h + 15 + rng() * 10, z);
      group.position.copy(basePos);
      this._scene.add(group);
      this._birds.push({ mesh: group, basePos, phase: rng() * Math.PI * 2, circleR: 8 + rng() * 15 });
    }
  }

  private _updateBirds(dt: number): void {
    for (const bird of this._birds) {
      bird.phase += dt * 0.3;
      bird.mesh.position.x = bird.basePos.x + Math.cos(bird.phase) * bird.circleR;
      bird.mesh.position.z = bird.basePos.z + Math.sin(bird.phase) * bird.circleR;
      bird.mesh.position.y = bird.basePos.y + Math.sin(bird.phase * 2) * 2;
      bird.mesh.rotation.y = bird.phase + Math.PI / 2;
      // wing flap
      bird.mesh.children.forEach(c => {
        if (c.name.startsWith("wing_")) {
          const side = c.name === "wing_-1" ? -1 : 1;
          c.rotation.z = side * Math.sin(this._time * 6 + bird.phase) * 0.5;
        }
      });
    }
  }

  // ── campfire at spawn ──────────────────────────────────────────────────────

  private _buildCampfire(): void {
    const pos = new THREE.Vector3(0, getHeight(this._heightmap, TERRAIN_SEGMENTS, 0, 0), 0);
    // stone ring
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2),
        new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 }));
      rock.position.set(pos.x + Math.cos(a) * 0.6, pos.y + 0.1, pos.z + Math.sin(a) * 0.6);
      this._scene.add(rock);
    }
    // multi-layered fire: outer orange, middle yellow, inner white core
    const fireColors = [
      { color: 0xff4400, emissive: 0xff4400, size: 0.35, height: 0.9, opacity: 0.6, yOff: 0.35 },
      { color: 0xff8822, emissive: 0xff8822, size: 0.25, height: 0.7, opacity: 0.7, yOff: 0.4 },
      { color: 0xffcc44, emissive: 0xffcc44, size: 0.15, height: 0.5, opacity: 0.8, yOff: 0.45 },
      { color: 0xffeeaa, emissive: 0xffeeaa, size: 0.08, height: 0.3, opacity: 0.9, yOff: 0.5 },
    ];
    for (let fi = 0; fi < fireColors.length; fi++) {
      const fc = fireColors[fi];
      const flame = new THREE.Mesh(new THREE.ConeGeometry(fc.size, fc.height, 12),
        new THREE.MeshStandardMaterial({ color: fc.color, emissive: fc.emissive, emissiveIntensity: 2.0 + fi * 0.5, toneMapped: false, transparent: true, opacity: fc.opacity }));
      flame.position.copy(pos); flame.position.y += fc.yOff;
      flame.name = fi === 0 ? "campfire" : `campflame_${fi}`;
      this._scene.add(flame);
    }
    // log embers (small horizontal cylinders)
    for (let li = 0; li < 3; li++) {
      const a = (li / 3) * Math.PI * 2 + 0.3;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.5, 12),
        new THREE.MeshStandardMaterial({ color: 0x331100, emissive: 0xff3300, emissiveIntensity: 0.8, toneMapped: false, roughness: 0.9 }));
      log.position.copy(pos); log.position.y += 0.08;
      log.rotation.z = Math.PI / 2; log.rotation.y = a;
      this._scene.add(log);
    }
    // warm light
    this._campfireLight = new THREE.PointLight(0xff8844, 2.0, 20);
    this._campfireLight.position.copy(pos); this._campfireLight.position.y += 1;
    this._scene.add(this._campfireLight);
  }

  private _updateCampfire(): void {
    if (!this._campfireLight) return;
    this._campfireLight.intensity = 1.5 + Math.sin(this._time * 7) * 0.5 + Math.random() * 0.3;
    const fire = this._scene.getObjectByName("campfire");
    if (fire) {
      fire.scale.y = 0.8 + Math.sin(this._time * 5) * 0.2;
      fire.rotation.y += this._dt * 2;
    }

    // animate additional flame layers
    for (let fi = 1; fi <= 3; fi++) {
      const flame = this._scene.getObjectByName(`campflame_${fi}`);
      if (flame) {
        flame.scale.y = 0.7 + Math.sin(this._time * (5 + fi * 2) + fi) * 0.3;
        flame.scale.x = 0.8 + Math.sin(this._time * (4 + fi) + fi * 0.5) * 0.2;
        flame.rotation.y += this._dt * (1 + fi * 0.5);
      }
    }

    // spark particles bursting upward
    if (Math.random() < 0.08) {
      const sparkPos = new THREE.Vector3(0, getHeight(this._heightmap, TERRAIN_SEGMENTS, 0, 0) + 0.8, 0);
      sparkPos.x += (Math.random() - 0.5) * 0.3;
      sparkPos.z += (Math.random() - 0.5) * 0.3;
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0xffaa33, emissiveIntensity: 3.0, toneMapped: false })
      );
      spark.position.copy(sparkPos);
      this._scene.add(spark);
      this._discoveryParticles.push({
        mesh: spark,
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 3 + Math.random() * 4, (Math.random() - 0.5) * 1.5),
        life: 0.6 + Math.random() * 0.8,
        maxLife: 1.4,
      });
    }

    // smoke particles rising from campfire
    if (Math.random() < 0.15) {
      const smokePos = new THREE.Vector3(0, getHeight(this._heightmap, TERRAIN_SEGMENTS, 0, 0) + 1.2, 0);
      smokePos.x += (Math.random() - 0.5) * 0.4;
      smokePos.z += (Math.random() - 0.5) * 0.4;
      const smoke = new THREE.Mesh(
        new THREE.SphereGeometry(0.15 + Math.random() * 0.2, 20, 16),
        new THREE.MeshBasicMaterial({ color: 0x555544, transparent: true, opacity: 0.2, depthWrite: false })
      );
      smoke.position.copy(smokePos);
      this._scene.add(smoke);
      this._discoveryParticles.push({
        mesh: smoke,
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.5, 1.5 + Math.random() * 0.8, (Math.random() - 0.5) * 0.5),
        life: 2.5 + Math.random() * 1.5,
        maxLife: 4,
      });
    }
  }

  // ── footprints ─────────────────────────────────────────────────────────────

  private _updateFootprints(dt: number): void {
    const moving = this._keys.has("w") || this._keys.has("s") || this._keys.has("a") || this._keys.has("d")
      || this._keys.has("arrowup") || this._keys.has("arrowdown") || this._keys.has("arrowleft") || this._keys.has("arrowright");
    if (!moving || !this._onGround) return;

    this._footprintTimer -= dt;
    if (this._footprintTimer > 0) return;
    this._footprintTimer = 0.5;

    const mark = new THREE.Mesh(
      new THREE.CircleGeometry(0.15, 6),
      new THREE.MeshBasicMaterial({ color: 0x222211, transparent: true, opacity: 0.3, depthWrite: false })
    );
    mark.rotation.x = -Math.PI / 2;
    mark.position.copy(this._playerPos);
    mark.position.y = getHeight(this._heightmap, TERRAIN_SEGMENTS, this._playerPos.x, this._playerPos.z) + 0.02;
    this._scene.add(mark);
    this._footprints.push(mark);

    // fade and remove old ones
    if (this._footprints.length > 100) {
      const old = this._footprints.shift()!;
      this._scene.remove(old); old.geometry.dispose(); (old.material as THREE.Material).dispose();
    }
    // fade all gradually
    for (const fp of this._footprints) {
      (fp.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (fp.material as THREE.MeshBasicMaterial).opacity - dt * 0.02);
    }
  }

  // ── time bonus pickups ─────────────────────────────────────────────────────

  private _spawnTimeBonuses(): void {
    this._timeBonuses = [];
    const rng = mulberry32(this._seed + 800);
    for (let i = 0; i < 8; i++) {
      const x = (rng() - 0.5) * WORLD_SIZE * 0.7;
      const z = (rng() - 0.5) * WORLD_SIZE * 0.7;
      const h = getHeight(this._heightmap, TERRAIN_SEGMENTS, x, z);
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.3),
        new THREE.MeshStandardMaterial({ color: 0x44ddff, emissive: 0x44ddff, emissiveIntensity: 1.5, toneMapped: false, transparent: true, opacity: 0.8 })
      );
      const pos = new THREE.Vector3(x, h + 1.5, z);
      mesh.position.copy(pos);
      this._scene.add(mesh);
      this._timeBonuses.push({ mesh, pos, collected: false });
    }
  }

  private _updateTimeBonuses(): void {
    for (const tb of this._timeBonuses) {
      if (tb.collected) continue;
      tb.mesh.rotation.y += this._dt * 2;
      tb.mesh.position.y = tb.pos.y + Math.sin(this._time * 2 + tb.pos.x) * 0.3;

      if (this._playerPos.distanceTo(tb.pos) < 3) {
        tb.collected = true;
        tb.mesh.visible = false;
        this._gameTime = Math.max(0, this._gameTime - 15); // +15 seconds
        this._playSound(880, 0.15, "sine", 0.2);
        setTimeout(() => this._playSound(1100, 0.12, "sine", 0.15), 80);
        // flash clue area
        this._hudClue.textContent = "+15 SECONDS!";
        this._hudClue.style.color = "#44ddff";
        setTimeout(() => {
          this._hudClue.style.color = "#ccaa66";
          this._showCurrentClue();
        }, 1500);
      }
    }
  }

  // ── biome label ────────────────────────────────────────────────────────────

  private _updateBiomeLabel(): void {
    const h = getHeight(this._heightmap, TERRAIN_SEGMENTS, this._playerPos.x, this._playerPos.z);
    const t = h / TERRAIN_HEIGHT;
    let biome: string;
    if (t < 0.1) biome = "The Marshlands";
    else if (t < 0.25) biome = "The Meadows";
    else if (t < 0.45) biome = "The Greenwood";
    else if (t < 0.6) biome = "The Foothills";
    else if (t < 0.75) biome = "The Highlands";
    else biome = "The Stony Peaks";
    this._hudBiome.textContent = biome;
  }

  // ── altitude indicator ─────────────────────────────────────────────────────

  private _updateAltitudeIndicator(): void {
    if (this._currentWaypoint >= this._waypoints.length) { this._hudAltitude.textContent = ""; return; }
    const wp = this._waypoints[this._currentWaypoint];
    const diff = wp.pos.y - this._playerPos.y;
    if (Math.abs(diff) < 2) {
      this._hudAltitude.textContent = "~ same elevation";
      this._hudAltitude.style.color = "#888";
    } else if (diff > 0) {
      this._hudAltitude.textContent = `\u25B2 ${Math.round(diff)}m above you`;
      this._hudAltitude.style.color = "#cc8844";
    } else {
      this._hudAltitude.textContent = `\u25BC ${Math.round(-diff)}m below you`;
      this._hudAltitude.style.color = "#4488cc";
    }
  }

  // ── distance tracking ──────────────────────────────────────────────────────

  private _trackDistance(): void {
    const d = this._playerPos.distanceTo(this._lastPlayerPos);
    if (d < 5) this._distWalked += d / 2; // convert to paces
    this._lastPlayerPos.copy(this._playerPos);
  }

  // ── tutorial hints ─────────────────────────────────────────────────────────

  private _updateTutorialHints(): void {
    if (this._tutorialShown) return;
    const el = document.getElementById("bg-tutorial");
    if (!el) return;

    this._tutorialTimer += this._dt;
    if (this._tutorialTimer < 2) el.textContent = "Use the compass to navigate. Follow the clue below.";
    else if (this._tutorialTimer < 6) el.textContent = "Hold [C] zoom compass  ·  [TAB] map  ·  [J] journal  ·  [SHIFT] sprint";
    else if (this._tutorialTimer < 10) el.textContent = "Collect blue crystals for bonus time. Watch your stamina!";
    else {
      el.style.opacity = "0";
      this._tutorialShown = true;
      localStorage.setItem("bearing_tutorial_seen", "1");
    }
  }

  // ── always-visible minimap ──────────────────────────────────────────────────

  private _updateMinimap(): void {
    const ctx = this._minimapCtx;
    const s = 120;
    const cx = s / 2, cy = s / 2;
    ctx.clearRect(0, 0, s, s);

    // circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 1, 0, Math.PI * 2);
    ctx.clip();

    // player-centered terrain view (40-unit radius around player)
    const viewR = 60;
    const px = this._playerPos.x, pz = this._playerPos.z;
    const resolution = 4; // sample every 4px
    for (let y = 0; y < s; y += resolution) {
      for (let x = 0; x < s; x += resolution) {
        const wx = px + ((x / s) - 0.5) * viewR * 2;
        const wz = pz + ((y / s) - 0.5) * viewR * 2;
        const h = getHeight(this._heightmap, TERRAIN_SEGMENTS, wx, wz);
        const t = h / TERRAIN_HEIGHT;
        let r, g, b;
        if (t < 0.1) { r = 25; g = 45; b = 50; }
        else if (t < 0.3) { r = 40 + t * 80; g = 65 + t * 90; b = 25; }
        else if (t < 0.5) { r = 30 + t * 40; g = 50 + t * 40; b = 20; }
        else { r = 60 + t * 40; g = 55 + t * 30; b = 40; }
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, resolution, resolution);
      }
    }

    // water bodies
    for (const wb of this._waterBodies) {
      const mx = ((wb.pos.x - px) / (viewR * 2) + 0.5) * s;
      const my = ((wb.pos.z - pz) / (viewR * 2) + 0.5) * s;
      const mr = (wb.radius / (viewR * 2)) * s;
      ctx.fillStyle = "rgba(30,60,130,0.5)";
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    }

    // landmarks (discovered)
    for (const lm of this._landmarks) {
      if (!lm.discovered) continue;
      const mx = ((lm.pos.x - px) / (viewR * 2) + 0.5) * s;
      const my = ((lm.pos.z - pz) / (viewR * 2) + 0.5) * s;
      if (mx > 0 && mx < s && my > 0 && my < s) {
        ctx.fillStyle = "#887766";
        ctx.beginPath(); ctx.arc(mx, my, 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    // current waypoint
    if (this._currentWaypoint < this._waypoints.length) {
      const wp = this._waypoints[this._currentWaypoint];
      const mx = ((wp.pos.x - px) / (viewR * 2) + 0.5) * s;
      const my = ((wp.pos.z - pz) / (viewR * 2) + 0.5) * s;
      ctx.fillStyle = "#daa520"; ctx.shadowColor = "#daa520"; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(mx, my, 3 + Math.sin(this._time * 3) * 1, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // player arrow at center (always points up = forward)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx - 3, cy + 3);
    ctx.lineTo(cx + 3, cy + 3);
    ctx.closePath();
    ctx.fill();

    // north indicator on minimap edge
    const northAngle = -this._yaw;
    const nx = cx + Math.sin(northAngle) * (cx - 6);
    const ny = cy - Math.cos(northAngle) * (cy - 6);
    ctx.fillStyle = "#cc3333";
    ctx.font = "bold 8px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("N", nx, ny);

    ctx.restore();
  }

  // ── interaction prompts ────────────────────────────────────────────────────

  private _updateInteractPrompt(): void {
    let prompt = "";

    // check nearby landmarks
    for (const lm of this._landmarks) {
      if (lm.discovered) continue;
      const dist = this._playerPos.distanceTo(lm.pos);
      if (dist < 20) {
        prompt = `Approaching unknown landmark...`;
        if (dist < 15) prompt = `${lm.name}`;
      }
    }

    // check nearby waypoints
    if (this._currentWaypoint < this._waypoints.length) {
      const wp = this._waypoints[this._currentWaypoint];
      const dist = this._playerPos.distanceTo(wp.pos);
      if (dist < 8 && dist > WAYPOINT_RADIUS) {
        prompt = `${wp.name} — approach to discover`;
      }
    }

    // water warning
    if (this._inWater) {
      prompt = "Wading through water — movement slowed";
    }

    this._hudInteract.textContent = prompt;
    this._hudInteract.style.opacity = prompt ? "1" : "0";
  }

  // ── ground detail (flowers, mushrooms) ─────────────────────────────────────

  private _buildGroundDetails(): void {
    const rng = mulberry32(this._seed + 900);
    const flowerColors = [0xdd4466, 0xeedd44, 0x8844cc, 0xddddff, 0xff8844];

    // flowers in meadow areas
    for (let i = 0; i < 200; i++) {
      const x = (rng() - 0.5) * WORLD_SIZE * 0.7;
      const z = (rng() - 0.5) * WORLD_SIZE * 0.7;
      const h = getHeight(this._heightmap, TERRAIN_SEGMENTS, x, z);
      const t = h / TERRAIN_HEIGHT;
      if (t < 0.1 || t > 0.4) continue; // only in meadows/forest edge

      const color = flowerColors[Math.floor(rng() * flowerColors.length)];
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 + rng() * 0.06, 20, 16),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2, roughness: 0.6 })
      );
      flower.position.set(x, h + 0.15, z);
      this._scene.add(flower);

      // stem
      if (rng() > 0.5) {
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.01, 0.2, 12),
          new THREE.MeshStandardMaterial({ color: 0x337722, roughness: 0.8 })
        );
        stem.position.set(x, h + 0.08, z);
        this._scene.add(stem);
      }
    }

    // mushrooms in forest areas
    for (let i = 0; i < 60; i++) {
      const x = (rng() - 0.5) * WORLD_SIZE * 0.6;
      const z = (rng() - 0.5) * WORLD_SIZE * 0.6;
      const h = getHeight(this._heightmap, TERRAIN_SEGMENTS, x, z);
      const t = h / TERRAIN_HEIGHT;
      if (t < 0.25 || t > 0.55) continue;

      // stem
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.04, 0.12, 12),
        new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.7 })
      );
      stem.position.set(x, h + 0.06, z);
      this._scene.add(stem);
      // cap
      const capColor = rng() > 0.5 ? 0xcc3322 : 0x885533;
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.6 })
      );
      cap.position.set(x, h + 0.13, z);
      this._scene.add(cap);
    }

    // fallen logs in forest
    for (let i = 0; i < 30; i++) {
      const x = (rng() - 0.5) * WORLD_SIZE * 0.6;
      const z = (rng() - 0.5) * WORLD_SIZE * 0.6;
      const h = getHeight(this._heightmap, TERRAIN_SEGMENTS, x, z);
      const t = h / TERRAIN_HEIGHT;
      if (t < 0.2 || t > 0.6) continue;

      const logLen = 1.5 + rng() * 3;
      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, logLen, 12),
        new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.9 })
      );
      log.position.set(x, h + 0.1, z);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = rng() * Math.PI;
      log.castShadow = true;
      this._scene.add(log);
    }
  }

  // ── audio helpers ──────────────────────────────────────────────────────────

  private _playSound(freq: number, vol: number, type: OscillatorType, dur: number): void {
    if (!this._audioCtx) return;
    const ctx = this._audioCtx;
    const osc = ctx.createOscillator();
    osc.type = type; osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur);
  }

  private _playFootstep(freq = 600, vol = 0.04): void {
    if (!this._audioCtx) return;
    const ctx = this._audioCtx;
    const bufSize = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.1));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter); filter.connect(g); g.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 0.05);
  }
}
