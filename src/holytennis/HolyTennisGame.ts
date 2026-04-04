/**
 * HOLY TENNIS  --  3D Medieval Tennis with Swords & the Holy Grail
 *
 * Knights wield swords as rackets and volley a glowing Holy Grail across
 * a moonlit castle court.  Full tennis scoring, procedural audio, animation,
 * difficulty select, commentary, and multiple shot types.
 */

import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                          */
/* ------------------------------------------------------------------ */

const COURT_LENGTH  = 23.77;
const COURT_WIDTH   = 10.97;
const SINGLES_WIDTH =  8.23;
const SERVICE_LINE  =  6.40;
const BASELINE      = COURT_LENGTH / 2;
const NET_HEIGHT_C  =  0.914;
const NET_HEIGHT_P  =  1.07;

const GRAVITY         = -12.0;
const GRAIL_RADIUS    = 0.18;
const BOUNCE_DAMP     = 0.62;
const SPIN_FACTOR     = 0.25;
const AIR_DRAG        = 0.995;
const SERVE_SPEED_MIN = 14.0;
const SERVE_SPEED_MAX = 22.0;
const HIT_SPEED_MIN   = 12.0;
const HIT_SPEED_MAX   = 24.0;
const PLAYER_SPEED    = 9.5;
const PLAYER_SPRINT   = 13.0;
const SWING_DURATION  = 0.35;
const SWING_REACH     = 2.2;
const SWING_HIT_WINDOW = 0.12;

// AI difficulty params [squire, knight, king]
const AI_SPEEDS       = [6.5, 8.5, 11.0];
const AI_REACH_BONUS  = [0.6, 0.3, 0.0];   // extra reach tolerance
const AI_ERROR_RATE   = [0.25, 0.10, 0.02]; // chance of mis-hit
const AI_REACT_DELAY  = [0.30, 0.10, 0.02]; // seconds before AI starts moving

const COL_GRASS       = 0x2d6a1e;
const COL_GRASS_LIGHT = 0x3a8428;
const COL_LINE        = 0xffffff;
const COL_NET         = 0x888888;
const COL_GOLD        = 0xffd700;
const COL_GOLD_GLOW   = 0xffaa00;
const COL_STEEL       = 0xaabbcc;
const COL_GUARD       = 0xccaa33;
const COL_GRIP        = 0x553311;
const COL_SKY_TOP     = 0x1a1a3e;
const COL_SKY_BOT     = 0x4a6fa5;
const COL_STONE       = 0x888877;
const COL_BANNER_RED  = 0xaa2222;
const COL_BANNER_BLUE = 0x2244aa;
const COL_TORCH       = 0xff8833;

const POINT_NAMES = ["0", "15", "30", "40"];
const SETS_TO_WIN = 2;
const GAMES_TO_WIN_SET = 6;
const TIEBREAK_AT = 6;
const TIEBREAK_POINTS_TO_WIN = 7;

const enum ShotType { FLAT, LOB, DROP, POWER, SLICE }

// Medieval commentary lines
const COMMENTARY_ACE = ["An untouchable blow!", "The Grail hath spoken!", "Not even Lancelot could reach that!"];
const COMMENTARY_WINNER = ["Huzzah! A magnificent strike!", "By the Grail, what a shot!", "The crowd roars with delight!"];
const COMMENTARY_RALLY = ["A clash of titans!", "Steel rings across the court!", "Neither knight yields!", "The Grail flies like a golden eagle!"];
const COMMENTARY_FAULT = ["Alas, a fault!", "The Grail strays from its path!", "A wayward offering!"];
const COMMENTARY_DEUCE = ["Deuce! The battle is joined anew!", "All square! Who shall prevail?"];
const COMMENTARY_MATCH_POINT = ["Match point! The kingdom holds its breath!", "One strike from glory!"];
const COMMENTARY_NET = ["The net claims another soul!", "Stopped by the iron veil!"];
const COMMENTARY_DROP = ["A cunning drop shot!", "The Grail barely whispers over the net!", "Soft as a feather, deadly as a blade!"];
const COMMENTARY_LOB = ["A mighty lob! The Grail soars heavenward!", "Over the head! A shot fit for the angels!"];
const COMMENTARY_POWER = ["THUNDEROUS! The Grail screams across the court!", "A blow worthy of Excalibur itself!", "The crowd gasps at such raw power!"];
const COMMENTARY_PERFECT = ["A PERFECT strike! The crowd erupts!", "Flawless technique! Merlin himself would applaud!"];
const COMMENTARY_COMBO = ["A DIVINE COMBO! The Grail burns with holy fire!", "Unstoppable! The knight is possessed!"];
const COMMENTARY_LONG_RALLY = ["This rally shall be sung by bards for ages!", "Neither champion shall yield! What a spectacle!"];
const COMMENTARY_SET_WON = ["The set is claimed! Glory to the victor!", "One step closer to the Holy Grail!"];

// Wind
const WIND_MAX = 3.0;
const WIND_CHANGE_SPEED = 0.3;

// Camera modes
const enum CamMode { BEHIND, BROADCAST, HIGH }

// Score herald
const HERALD_POINTS: Record<string, string> = { "0": "Love", "15": "Fifteen", "30": "Thirty", "40": "Forty" };

// Approach bonus
const NET_APPROACH_ZONE = 3.0; // distance from net for bonus
const NET_APPROACH_BONUS = 0.15; // extra power %

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

interface Player {
  mesh: THREE.Group;
  swordGroup: THREE.Group;
  shadow: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  side: 1 | -1;
  isAI: boolean;
  swingTimer: number;
  isSwinging: boolean;
  swingDir: THREE.Vector3;
  score: number[];
  setsWon: number;
  gamesWon: number[];
  targetX: number;
  targetZ: number;
  runPhase: number;
  bodyLean: number;
  facingAngle: number;
  lastShotType: ShotType;
  staminaTimer: number;
  legMeshes: THREE.Mesh[];
  armMeshes: THREE.Mesh[];
  aiReactTimer: number;
  prevPosX: number;
  prevPosZ: number;
  footstepTimer: number;
  stamina: number;
  comboCount: number;
  walkTarget: THREE.Vector3 | null;
  celebTimer: number;       // celebration animation timer
  celebType: number;        // 0=none, 1=win, -1=lose
}

interface Grail {
  mesh: THREE.Group;
  shadow: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  bounceCount: number;
  lastHitBy: number;
  inPlay: boolean;
  isServe: boolean;
  faultCount: number;
  hasBounced: boolean;
  landedInBounds: boolean;
  trail: THREE.Vector3[];
  speed: number;
}

interface ChalkMark { mesh: THREE.Mesh; life: number; }
interface ShootingStar { pos: THREE.Vector3; vel: THREE.Vector3; mesh: THREE.Mesh; life: number; }
interface SwordTrailPoint { pos: THREE.Vector3; time: number; }

interface MatchStats {
  aces: [number, number];
  winners: [number, number];
  errors: [number, number];
  longestRally: number;
  totalPoints: [number, number];
  perfectHits: [number, number];
  maxServeSpeed: [number, number];
  maxCombo: [number, number];
}

interface Bat { mesh: THREE.Group; angle: number; height: number; radius: number; speed: number; towerIdx: number; }

type Phase = "title" | "serving" | "serveToss" | "servePower" | "rally" | "pointScored" | "gameOver" | "matchOver" | "paused";

type ServeSide = "deuce" | "ad";
type Difficulty = 0 | 1 | 2; // squire, knight, king

/* ------------------------------------------------------------------ */
/*  AUDIO                                                              */
/* ------------------------------------------------------------------ */

class TennisAudio {
  private _ctx: AudioContext | null = null;
  private _master: GainNode | null = null;
  private _crowdGain: GainNode | null = null;
  private _crowdNoise: AudioBufferSourceNode | null = null;
  private _musicGain: GainNode | null = null;
  private _musicInterval: number = 0;

  init(): void {
    try {
      this._ctx = new AudioContext();
      this._master = this._ctx.createGain();
      this._master.gain.value = 0.45;
      this._master.connect(this._ctx.destination);
      this._startCrowdAmbience();
      this._startMusic();
    } catch { /* no audio */ }
  }

  private _startCrowdAmbience(): void {
    if (!this._ctx || !this._master) return;
    const bufSize = this._ctx.sampleRate * 2;
    const buf = this._ctx.createBuffer(1, bufSize, this._ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * 0.15;
    const src = this._ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = this._ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 400;
    this._crowdGain = this._ctx.createGain(); this._crowdGain.gain.value = 0.05;
    src.connect(lp); lp.connect(this._crowdGain); this._crowdGain.connect(this._master);
    src.start(); this._crowdNoise = src;
  }

  private _startMusic(): void {
    if (!this._ctx || !this._master) return;
    this._musicGain = this._ctx.createGain();
    this._musicGain.gain.value = 0.04;
    this._musicGain.connect(this._master);
    // Medieval arpeggio loop
    const scale = [261, 293, 329, 349, 392, 440, 493, 523]; // C major
    let noteIdx = 0;
    let patternIdx = 0;
    const patterns = [
      [0, 2, 4, 7, 4, 2],  // up-down
      [0, 4, 7, 4, 2, 0],  // arch
      [7, 4, 2, 0, 2, 4],  // inverse
      [0, 3, 5, 7, 5, 3],  // alternate
    ];
    this._musicInterval = window.setInterval(() => {
      if (!this._ctx || !this._musicGain) return;
      const pattern = patterns[patternIdx % patterns.length];
      const idx = pattern[noteIdx % pattern.length];
      const freq = scale[idx];
      const t = this._ctx.currentTime;
      const osc = this._ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq * 0.5; // one octave lower for atmosphere
      const g = this._ctx.createGain();
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(g); g.connect(this._musicGain);
      osc.start(t); osc.stop(t + 0.6);
      // Second voice (fifth above, quieter)
      const osc2 = this._ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = freq * 0.75;
      const g2 = this._ctx.createGain();
      g2.gain.setValueAtTime(0.03, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc2.connect(g2); g2.connect(this._musicGain);
      osc2.start(t); osc2.stop(t + 0.5);
      noteIdx++;
      if (noteIdx >= pattern.length) { noteIdx = 0; patternIdx++; }
    }, 400);
  }

  setCrowdExcitement(v: number): void {
    if (this._crowdGain) this._crowdGain.gain.value = 0.04 + v * 0.15;
  }

  playSwordHit(power: number): void {
    if (!this._ctx || !this._master) return;
    const t = this._ctx.currentTime;
    // Metallic clang
    const osc = this._ctx.createOscillator();
    osc.type = "square"; osc.frequency.value = 800 + power * 400;
    const g = this._ctx.createGain();
    g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g); g.connect(this._master); osc.start(t); osc.stop(t + 0.15);
    // Thud
    const o2 = this._ctx.createOscillator();
    o2.type = "sine"; o2.frequency.setValueAtTime(150 + power * 100, t);
    o2.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    const g2 = this._ctx.createGain();
    g2.gain.setValueAtTime(0.25, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o2.connect(g2); g2.connect(this._master); o2.start(t); o2.stop(t + 0.12);
    // Ring
    const o3 = this._ctx.createOscillator();
    o3.type = "sine"; o3.frequency.value = 2200 + power * 600;
    const g3 = this._ctx.createGain();
    g3.gain.setValueAtTime(0.06, t); g3.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o3.connect(g3); g3.connect(this._master); o3.start(t); o3.stop(t + 0.3);
  }

  playSwordWhoosh(): void {
    if (!this._ctx || !this._master) return;
    const t = this._ctx.currentTime;
    const bufSize = Math.floor(this._ctx.sampleRate * 0.2);
    const buf = this._ctx.createBuffer(1, bufSize, this._ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const env = Math.sin((i / bufSize) * Math.PI);
      d[i] = (Math.random() * 2 - 1) * env * 0.3;
    }
    const src = this._ctx.createBufferSource(); src.buffer = buf;
    const bp = this._ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 2000; bp.Q.value = 1.5;
    const g = this._ctx.createGain(); g.gain.value = 0.12;
    src.connect(bp); bp.connect(g); g.connect(this._master); src.start(t);
  }

  playBounce(): void {
    if (!this._ctx || !this._master) return;
    const t = this._ctx.currentTime;
    const o = this._ctx.createOscillator();
    o.type = "sine"; o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(80, t + 0.08);
    const g = this._ctx.createGain();
    g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g); g.connect(this._master); o.start(t); o.stop(t + 0.1);
  }

  playFault(): void {
    if (!this._ctx || !this._master) return;
    const t = this._ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const o = this._ctx.createOscillator(); o.type = "sine"; o.frequency.value = 250 - i * 80;
      const g = this._ctx.createGain();
      g.gain.setValueAtTime(0.12, t + i * 0.12); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.2);
      o.connect(g); g.connect(this._master!); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.2);
    }
  }

  playCrowdCheer(): void {
    if (!this._ctx || !this._master) return;
    const t = this._ctx.currentTime;
    const buf = this._ctx.createBuffer(1, this._ctx.sampleRate, this._ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
    const src = this._ctx.createBufferSource(); src.buffer = buf;
    const bp = this._ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1200; bp.Q.value = 0.5;
    const g = this._ctx.createGain();
    g.gain.setValueAtTime(0.12, t); g.gain.linearRampToValueAtTime(0.2, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    src.connect(bp); bp.connect(g); g.connect(this._master); src.start(t); src.stop(t + 1.5);
  }

  playNetHit(): void {
    if (!this._ctx || !this._master) return;
    const t = this._ctx.currentTime;
    const buf = this._ctx.createBuffer(1, Math.floor(this._ctx.sampleRate * 0.15), this._ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.15));
    const src = this._ctx.createBufferSource(); src.buffer = buf;
    const lp = this._ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
    const g = this._ctx.createGain(); g.gain.value = 0.12;
    src.connect(lp); lp.connect(g); g.connect(this._master); src.start(t);
  }

  playMatchWin(): void {
    if (!this._ctx || !this._master) return;
    const t = this._ctx.currentTime;
    const notes = [523, 659, 784, 1047, 784, 1047, 1318]; // C E G C G C E6
    for (let i = 0; i < notes.length; i++) {
      const o = this._ctx.createOscillator(); o.type = "sine"; o.frequency.value = notes[i];
      const g = this._ctx.createGain();
      g.gain.setValueAtTime(0, t + i * 0.18);
      g.gain.linearRampToValueAtTime(0.12, t + i * 0.18 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.18 + 0.5);
      o.connect(g); g.connect(this._master!); o.start(t + i * 0.18); o.stop(t + i * 0.18 + 0.5);
    }
  }

  playServeCharge(power: number): void {
    if (!this._ctx || !this._master) return;
    const t = this._ctx.currentTime;
    const o = this._ctx.createOscillator(); o.type = "sine"; o.frequency.value = 200 + power * 600;
    const g = this._ctx.createGain(); g.gain.value = 0.04;
    o.connect(g); g.connect(this._master); o.start(t); o.stop(t + 0.04);
  }

  playFootstep(): void {
    if (!this._ctx || !this._master) return;
    const t = this._ctx.currentTime;
    const o = this._ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(60 + Math.random() * 30, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.06);
    const g = this._ctx.createGain();
    g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g); g.connect(this._master); o.start(t); o.stop(t + 0.08);
  }

  playServeToss(): void {
    if (!this._ctx || !this._master) return;
    const t = this._ctx.currentTime;
    const o = this._ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(400, t);
    o.frequency.linearRampToValueAtTime(800, t + 0.3);
    const g = this._ctx.createGain();
    g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(this._master); o.start(t); o.stop(t + 0.35);
  }

  destroy(): void {
    if (this._musicInterval) clearInterval(this._musicInterval);
    if (this._crowdNoise) { try { this._crowdNoise.stop(); } catch { /* */ } }
    if (this._ctx) { try { this._ctx.close(); } catch { /* */ } }
  }
}

/* ------------------------------------------------------------------ */
/*  MAIN CLASS                                                         */
/* ------------------------------------------------------------------ */

export class HolyTennisGame {
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _clock = new THREE.Clock();
  private _audio = new TennisAudio();

  private _players: Player[] = [];
  private _grail!: Grail;
  private _courtGroup!: THREE.Group;
  private _net!: THREE.Group;
  private _netMeshes: THREE.Mesh[] = [];
  private _trailMeshes: THREE.Mesh[] = [];
  private _particles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; maxLife: number }[] = [];
  private _torchLights: THREE.PointLight[] = [];
  private _torchFlames: THREE.Mesh[] = [];
  private _chalkMarks: ChalkMark[] = [];
  private _spectators: { mesh: THREE.Mesh; headMesh: THREE.Mesh; baseY: number; phase: number; speed: number }[] = [];
  private _shootingStars: ShootingStar[] = [];
  private _swordTrailPoints: [SwordTrailPoint[], SwordTrailPoint[]] = [[], []];
  private _swordTrailMeshes: THREE.Mesh[] = [];
  private _confetti: { mesh: THREE.Mesh; vel: THREE.Vector3; rot: THREE.Vector3; life: number }[] = [];
  private _trophyMesh: THREE.Group | null = null;

  // Difficulty
  private _difficulty: Difficulty = 1;
  private _difficultySelected = false;

  private _phase: Phase = "title";
  private _prevPhase: Phase = "title"; // for pause
  private _serveSide: ServeSide = "deuce";
  private _server = 0;
  private _currentSet = 0;
  private _isTiebreak = false;
  private _tiebreakPoints = [0, 0];
  private _pointsInTiebreak = 0;
  private _points = [0, 0];
  private _games: number[][] = [[0, 0]];
  private _sets = [0, 0];
  private _winner = -1;

  private _servePower = 0;
  private _servePowerDir = 1;
  private _serveAimX = 0;
  private _serveTossTimer = 0;
  private _serveTossDuration = 0.6;

  private _stats: MatchStats = { aces: [0, 0], winners: [0, 0], errors: [0, 0], longestRally: 0, totalPoints: [0, 0], perfectHits: [0, 0] };

  private _uiCanvas!: HTMLCanvasElement;
  private _uiCtx!: CanvasRenderingContext2D;

  private _keys = new Set<string>();
  private _mouseX = 0;
  private _mouseY = 0;

  private _pointTimer = 0;
  private _serveReady = false;
  private _rallyHits = 0;
  private _animFrame = 0;
  private _totalTime = 0;

  private _slowMo = 1.0;
  private _slowMoTimer = 0;
  private _isSetPoint = false;
  private _isMatchPoint = false;

  private _camTarget = new THREE.Vector3(0, 3, -16);
  private _camPos = new THREE.Vector3(0, 8, -18);
  private _camShake = 0;

  private _message = "";
  private _messageTimer = 0;
  private _showStats = false;

  // Commentary
  private _commentary = "";
  private _commentaryTimer = 0;

  // Hit timing
  private _hitTimingMsg = "";
  private _hitTimingTimer = 0;

  // Net wobble
  private _netWobble = 0;

  // Screen flash
  private _screenFlash = 0;

  // Wind
  private _wind = new THREE.Vector2(0, 0); // x, z wind force
  private _windTarget = new THREE.Vector2(0, 0);

  // Bats
  private _bats: Bat[] = [];

  // Visual enhancement objects
  private _starMat: THREE.PointsMaterial | null = null;
  private _clouds: { mesh: THREE.Mesh; speed: number; baseX: number }[] = [];
  private _embers: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; maxLife: number }[] = [];
  private _impactRings: { mesh: THREE.Mesh; life: number }[] = [];
  private _holyBeam: THREE.Mesh | null = null;
  private _holyBeamLight: THREE.SpotLight | null = null;
  private _mistMeshes: THREE.Mesh[] = [];
  private _auroraMesh: THREE.Mesh | null = null;
  private _auroraTime = 0;
  private _lastShotWasPower = false;
  private _grailSparkles: THREE.Points | null = null;
  private _grailSparkleGeo: THREE.BufferGeometry | null = null;
  private _fireflies: { mesh: THREE.Mesh; pos: THREE.Vector3; phase: number; speed: number }[] = [];
  private _bannerMeshes: THREE.Mesh[] = [];
  private _swordGlowLights: [THREE.PointLight | null, THREE.PointLight | null] = [null, null];
  private _bounceRings: { mesh: THREE.Mesh; life: number }[] = [];
  private _smokeParticles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; maxLife: number }[] = [];

  // Landing prediction
  private _predictedLanding: THREE.Vector3 | null = null;
  private _predictionArc: THREE.Vector3[] = [];

  // Walk between points
  private _walkPhase = false;
  private _walkTimer = 0;

  // Camera mode
  private _camMode: CamMode = CamMode.BEHIND;

  // Herald score announcement
  private _heraldMsg = "";
  private _heraldTimer = 0;

  // Dynamic court light
  private _courtLight: THREE.PointLight | null = null;

  // Replay camera after match win
  private _replayAngle = 0;

  // Umpire mesh
  private _umpireMesh: THREE.Group | null = null;

  /* ---------------------------------------------------------------- */
  /*  LIFECYCLE                                                        */
  /* ---------------------------------------------------------------- */

  async boot(): Promise<void> {
    this._initRenderer();
    this._initScene();
    this._initCourt();
    this._initNet();
    this._initPlayers();
    this._initGrail();
    this._initStadium();
    this._initUI();
    this._initInput();
    this._audio.init();
    this._phase = "title";
    this._message = "";
    this._loop();
  }

  destroy(): void {
    cancelAnimationFrame(this._animFrame);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("mousedown", this._onMouseDown);
    window.removeEventListener("mouseup", this._onMouseUp);
    window.removeEventListener("resize", this._onResize);
    if (this._uiCanvas.parentElement) this._uiCanvas.parentElement.removeChild(this._uiCanvas);
    if (this._renderer.domElement.parentElement) this._renderer.domElement.parentElement.removeChild(this._renderer.domElement);
    this._audio.destroy();
    this._renderer.dispose();
    this._scene.clear();
  }

  /* ---------------------------------------------------------------- */
  /*  INIT                                                             */
  /* ---------------------------------------------------------------- */

  private _initRenderer(): void {
    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.1;
    document.body.appendChild(this._renderer.domElement);
    Object.assign(this._renderer.domElement.style, { position: "fixed", top: "0", left: "0", zIndex: "9999" });
  }

  private _initScene(): void {
    this._scene = new THREE.Scene();
    // Sky
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { topColor: { value: new THREE.Color(COL_SKY_TOP) }, bottomColor: { value: new THREE.Color(COL_SKY_BOT) } },
      vertexShader: `varying vec3 vWP;void main(){vec4 wp=modelMatrix*vec4(position,1.0);vWP=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,
      fragmentShader: `uniform vec3 topColor;uniform vec3 bottomColor;varying vec3 vWP;void main(){float h=normalize(vWP).y;gl_FragColor=vec4(mix(bottomColor,topColor,max(h,0.0)),1.0);}`,
    });
    this._scene.add(new THREE.Mesh(new THREE.SphereGeometry(200, 32, 32), skyMat));

    // Twinkling stars
    const sp: number[] = [], starSizes: number[] = [];
    for (let i = 0; i < 1200; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.5;
      sp.push(180 * Math.sin(ph) * Math.cos(th), 180 * Math.cos(ph), 180 * Math.sin(ph) * Math.sin(th));
      starSizes.push(0.2 + Math.random() * 0.8);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    sg.setAttribute("size", new THREE.Float32BufferAttribute(starSizes, 1));
    this._starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true, transparent: true });
    this._scene.add(new THREE.Points(sg, this._starMat));

    // Clouds
    for (let i = 0; i < 8; i++) {
      const cGroup = new THREE.Group();
      const puffCount = 3 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffCount; p++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(4 + Math.random() * 6, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0x2a2a4a, transparent: true, opacity: 0.12 + Math.random() * 0.08 })
        );
        puff.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 4);
        puff.scale.y = 0.4;
        cGroup.add(puff);
      }
      const baseX = (Math.random() - 0.5) * 200;
      cGroup.position.set(baseX, 50 + Math.random() * 30, (Math.random() - 0.5) * 100);
      this._scene.add(cGroup);
      this._clouds.push({ mesh: cGroup as any, speed: 0.5 + Math.random() * 1.5, baseX });
    }

    // Aurora borealis
    const auroraGeo = new THREE.PlaneGeometry(160, 30, 64, 4);
    const auroraMat = new THREE.ShaderMaterial({
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
      uniforms: { time: { value: 0 } },
      vertexShader: `
        varying vec2 vUv; varying vec3 vPos;
        uniform float time;
        void main() {
          vUv = uv; vPos = position;
          vec3 p = position;
          p.y += sin(p.x * 0.05 + time * 0.5) * 3.0 + sin(p.x * 0.12 + time * 0.8) * 1.5;
          p.z += sin(p.x * 0.08 + time * 0.3) * 2.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv; varying vec3 vPos;
        uniform float time;
        void main() {
          float wave = sin(vUv.x * 6.28 + time * 0.4) * 0.5 + 0.5;
          float edge = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
          vec3 col1 = vec3(0.1, 0.8, 0.4);
          vec3 col2 = vec3(0.2, 0.4, 0.9);
          vec3 col3 = vec3(0.6, 0.2, 0.8);
          vec3 col = mix(col1, col2, wave);
          col = mix(col, col3, sin(vUv.x * 3.14 + time * 0.2) * 0.5 + 0.5);
          float alpha = edge * 0.06 * (0.7 + wave * 0.3);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    this._auroraMesh = new THREE.Mesh(auroraGeo, auroraMat);
    this._auroraMesh.position.set(0, 90, 30);
    this._auroraMesh.rotation.x = -0.3;
    this._scene.add(this._auroraMesh);

    // Ground mist
    for (let i = 0; i < 20; i++) {
      const mist = new THREE.Mesh(
        new THREE.PlaneGeometry(4 + Math.random() * 6, 1 + Math.random() * 1.5),
        new THREE.MeshBasicMaterial({ color: 0x667788, transparent: true, opacity: 0.04 + Math.random() * 0.04, side: THREE.DoubleSide, depthWrite: false })
      );
      mist.position.set((Math.random() - 0.5) * 30, 0.2 + Math.random() * 0.5, (Math.random() - 0.5) * 30);
      mist.rotation.y = Math.random() * Math.PI;
      mist.rotation.x = -0.1;
      this._scene.add(mist);
      this._mistMeshes.push(mist);
    }

    // Lights
    this._scene.add(new THREE.AmbientLight(0x334466, 0.6));
    const moon = new THREE.DirectionalLight(0x8899bb, 1.2);
    moon.position.set(-20, 40, -10); moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    const sc = moon.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 100;
    this._scene.add(moon);
    this._scene.add(new THREE.HemisphereLight(0xffaa66, 0x223344, 0.4));

    this._camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
    this._camera.position.copy(this._camPos);
    this._camera.lookAt(0, 1, 0);
    this._scene.fog = new THREE.FogExp2(0x1a1a3e, 0.008);
  }

  private _initCourt(): void {
    this._courtGroup = new THREE.Group();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x1a3a0a, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
    this._courtGroup.add(ground);

    const court = new THREE.Mesh(new THREE.PlaneGeometry(COURT_WIDTH + 4, COURT_LENGTH + 4), new THREE.MeshStandardMaterial({ color: COL_GRASS, roughness: 0.8 }));
    court.rotation.x = -Math.PI / 2; court.position.y = -0.01; court.receiveShadow = true;
    this._courtGroup.add(court);

    // Stripes
    const sC = 14, sL = COURT_LENGTH + 2, sW = (COURT_WIDTH + 2) / sC;
    for (let i = 1; i < sC; i += 2) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(sW, sL), new THREE.MeshStandardMaterial({ color: COL_GRASS_LIGHT, roughness: 0.8 }));
      s.rotation.x = -Math.PI / 2; s.position.set(-((COURT_WIDTH + 2) / 2) + sW * i + sW / 2, 0, 0); s.receiveShadow = true;
      this._courtGroup.add(s);
    }

    // Lines
    const lMat = new THREE.MeshStandardMaterial({ color: COL_LINE, roughness: 0.3, emissive: COL_LINE, emissiveIntensity: 0.15 });
    const addL = (x: number, z: number, w: number, d: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.01, d), lMat);
      m.position.set(x, 0.005, z); m.receiveShadow = true; this._courtGroup.add(m);
    };
    addL(0, -BASELINE, COURT_WIDTH, 0.05); addL(0, BASELINE, COURT_WIDTH, 0.05);
    addL(-SINGLES_WIDTH / 2, 0, 0.05, COURT_LENGTH); addL(SINGLES_WIDTH / 2, 0, 0.05, COURT_LENGTH);
    addL(-COURT_WIDTH / 2, 0, 0.05, COURT_LENGTH); addL(COURT_WIDTH / 2, 0, 0.05, COURT_LENGTH);
    addL(0, -SERVICE_LINE, SINGLES_WIDTH, 0.05); addL(0, SERVICE_LINE, SINGLES_WIDTH, 0.05);
    addL(0, 0, 0.05, SERVICE_LINE * 2);
    addL(0, -BASELINE + 0.2, 0.05, 0.4); addL(0, BASELINE - 0.2, 0.05, 0.4);
    this._scene.add(this._courtGroup);
  }

  private _initNet(): void {
    this._net = new THREE.Group();
    const pMat = new THREE.MeshStandardMaterial({ color: COL_STONE, roughness: 0.4, metalness: 0.6 });
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, NET_HEIGHT_P, 8), pMat);
      post.position.set(sx * (COURT_WIDTH / 2 + 0.3), NET_HEIGHT_P / 2, 0); post.castShadow = true; this._net.add(post);
      const fin = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshStandardMaterial({ color: COL_GOLD, metalness: 0.8, roughness: 0.2 }));
      fin.position.set(post.position.x, NET_HEIGHT_P + 0.1, 0); this._net.add(fin);
    }
    const nSegs = 40, nRows = 8, nW = COURT_WIDTH + 0.6;
    for (let r = 0; r < nRows; r++) {
      const y = (r / nRows) * NET_HEIGHT_C + 0.05;
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= nSegs; s++) {
        const x = -nW / 2 + (s / nSegs) * nW;
        const t = (s / nSegs) * 2 - 1;
        pts.push(new THREE.Vector3(x, y - (1 - t * t) * 0.08 * (1 - r / nRows), 0));
      }
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), nSegs, 0.008, 4, false),
        new THREE.MeshStandardMaterial({ color: COL_NET, metalness: 0.7, roughness: 0.3 })
      );
      this._net.add(tube); this._netMeshes.push(tube);
    }
    for (let s = 0; s <= nSegs; s += 2) {
      const v = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, NET_HEIGHT_C, 4),
        new THREE.MeshStandardMaterial({ color: COL_NET, metalness: 0.5, roughness: 0.4 }));
      v.position.set(-nW / 2 + (s / nSegs) * nW, NET_HEIGHT_C / 2, 0);
      this._net.add(v); this._netMeshes.push(v);
    }
    const topG = new THREE.CylinderGeometry(0.02, 0.02, nW, 8); topG.rotateZ(Math.PI / 2);
    const topC = new THREE.Mesh(topG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.1 }));
    topC.position.set(0, NET_HEIGHT_C, 0); this._net.add(topC);
    this._scene.add(this._net);
  }

  private _initPlayers(): void {
    this._players = [];
    for (let i = 0; i < 2; i++) {
      const side: 1 | -1 = i === 0 ? -1 : 1;
      const group = new THREE.Group();
      const col = i === 0 ? 0x3344aa : 0xaa3333;
      const colDark = i === 0 ? 0x222266 : 0x662222;
      const colBright = i === 0 ? 0x4455cc : 0xcc4444;
      const colBanner = i === 0 ? COL_BANNER_BLUE : COL_BANNER_RED;
      const bMat = new THREE.MeshStandardMaterial({ color: col, metalness: 0.6, roughness: 0.3 });

      // Body
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.2, 8), bMat);
      body.position.y = 1.0; body.castShadow = true; group.add(body);

      // Chest plate
      const cp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.08), new THREE.MeshStandardMaterial({ color: col, metalness: 0.7, roughness: 0.2 }));
      cp.position.set(0, 1.05, -0.35 * side); group.add(cp);

      // Pauldrons
      for (const sx of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), bMat);
        p.position.set(sx * 0.45, 1.5, 0); p.scale.set(1, 0.8, 1); p.castShadow = true; group.add(p);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 12), new THREE.MeshStandardMaterial({ color: COL_GOLD, metalness: 0.8, roughness: 0.2 }));
        rim.position.copy(p.position); rim.rotation.x = Math.PI / 2; group.add(rim);
      }

      // Helmet
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshStandardMaterial({ color: COL_STEEL, metalness: 0.8, roughness: 0.2 }));
      helm.position.y = 1.9; helm.castShadow = true; group.add(helm);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
      visor.position.set(0, 1.88, -0.2 * side); group.add(visor);
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, 0.3), new THREE.MeshStandardMaterial({ color: COL_STEEL, metalness: 0.8, roughness: 0.2 }));
      crest.position.set(0, 2.1, 0); group.add(crest);
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 6), new THREE.MeshStandardMaterial({ color: colBanner, roughness: 0.7 }));
      plume.position.set(0, 2.25, 0); group.add(plume);
      for (let f = 0; f < 3; f++) {
        const feather = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 4), new THREE.MeshStandardMaterial({ color: colBanner, roughness: 0.8 }));
        feather.position.set((f - 1) * 0.06, 2.15, 0.05); feather.rotation.z = (f - 1) * 0.2; group.add(feather);
      }

      // Legs
      const legMeshes: THREE.Mesh[] = [];
      for (const lx of [-0.15, 0.15]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.8, 6), new THREE.MeshStandardMaterial({ color: colDark, metalness: 0.3, roughness: 0.5 }));
        leg.position.set(lx, 0.4, 0); leg.castShadow = true; group.add(leg); legMeshes.push(leg);
        const knee = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshStandardMaterial({ color: COL_STEEL, metalness: 0.7, roughness: 0.3 }));
        knee.position.set(lx, 0.5, -0.1 * side); group.add(knee);
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.9 }));
        boot.position.set(lx, 0.04, -0.03 * side); group.add(boot);
      }

      // Arms
      const armMeshes: THREE.Mesh[] = [];
      for (const ax of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 6), bMat);
        arm.position.set(ax * 0.5, 1.2, 0); arm.rotation.z = ax * 0.3; arm.castShadow = true; group.add(arm); armMeshes.push(arm);
        const gauntlet = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), new THREE.MeshStandardMaterial({ color: COL_STEEL, metalness: 0.7, roughness: 0.3 }));
        gauntlet.position.set(ax * 0.55, 0.85, 0); group.add(gauntlet);
      }

      // Tabard + cross
      const tabard = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.8), new THREE.MeshStandardMaterial({ color: colBright, side: THREE.DoubleSide, roughness: 0.8 }));
      tabard.position.set(0, 0.8, -0.41 * side); group.add(tabard);
      const goldE = new THREE.MeshStandardMaterial({ color: COL_GOLD, emissive: COL_GOLD, emissiveIntensity: 0.3 });
      const cH = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.01), goldE); cH.position.set(0, 0.85, -0.42 * side); group.add(cH);
      const cV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.01), goldE); cV.position.set(0, 0.85, -0.42 * side); group.add(cV);

      // Cape (short cloak hanging from shoulders)
      const capeGeo = new THREE.PlaneGeometry(0.65, 1.0, 1, 4);
      const capeMat = new THREE.MeshStandardMaterial({ color: colBanner, side: THREE.DoubleSide, roughness: 0.85, transparent: true, opacity: 0.9 });
      const cape = new THREE.Mesh(capeGeo, capeMat);
      cape.position.set(0, 1.0, 0.4 * side); // behind the knight
      cape.name = "cape";
      group.add(cape);

      // Belt
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 6, 16), new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 }));
      belt.position.y = 0.6; belt.rotation.x = Math.PI / 2; group.add(belt);
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.04), new THREE.MeshStandardMaterial({ color: COL_GOLD, metalness: 0.8, roughness: 0.2 }));
      buckle.position.set(0, 0.6, -0.4 * side); group.add(buckle);

      // Sword
      const swordGroup = this._createSword();
      swordGroup.position.set(0.5, 1.0, 0); group.add(swordGroup);

      // Sword glow light (activated during swings)
      const swordGlow = new THREE.PointLight(i === 0 ? 0x4466ff : 0xff4422, 0, 3, 2);
      swordGlow.position.set(0, 1.0, 0);
      swordGroup.add(swordGlow);
      this._swordGlowLights[i] = swordGlow;

      // Player shadow
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.015;
      this._scene.add(shadow);

      const startZ = side * (BASELINE - 1);
      group.position.set(0, 0, startZ);
      this._scene.add(group);

      this._players.push({
        mesh: group, swordGroup, shadow, pos: new THREE.Vector3(0, 0, startZ), vel: new THREE.Vector3(),
        side, isAI: i === 1, swingTimer: 0, isSwinging: false, swingDir: new THREE.Vector3(0, 0, 1),
        score: [], setsWon: 0, gamesWon: [0], targetX: 0, targetZ: side * (BASELINE - 2),
        runPhase: 0, bodyLean: 0, facingAngle: side > 0 ? Math.PI : 0,
        lastShotType: ShotType.FLAT, staminaTimer: 0, legMeshes, armMeshes,
        aiReactTimer: 0, prevPosX: 0, prevPosZ: startZ, footstepTimer: 0,
        stamina: 1, comboCount: 0, walkTarget: null, celebTimer: 0, celebType: 0,
      });
    }
  }

  private _createSword(): THREE.Group {
    const g = new THREE.Group();
    const bs = new THREE.Shape();
    bs.moveTo(0, 0); bs.lineTo(0.03, 0); bs.lineTo(0.025, 1.1); bs.lineTo(0.015, 1.2);
    bs.lineTo(0, 1.25); bs.lineTo(-0.015, 1.2); bs.lineTo(-0.025, 1.1); bs.lineTo(-0.03, 0); bs.closePath();
    const blade = new THREE.Mesh(
      new THREE.ExtrudeGeometry(bs, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2 }),
      new THREE.MeshStandardMaterial({ color: COL_STEEL, metalness: 0.9, roughness: 0.1, emissive: 0x334455, emissiveIntensity: 0.1 })
    );
    blade.rotation.x = -Math.PI / 2; blade.position.y = 0.3; blade.castShadow = true; g.add(blade);
    // Fuller + edges
    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.8, 0.002), new THREE.MeshStandardMaterial({ color: 0x667788, metalness: 0.95, roughness: 0.05 }));
    fuller.position.set(0, 0.75, 0.01); g.add(fuller);
    for (const ex of [-0.03, 0.03]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.002, 1.0, 0.002),
        new THREE.MeshStandardMaterial({ color: 0xddeeff, metalness: 1, roughness: 0, emissive: 0x556677, emissiveIntensity: 0.2 }));
      edge.position.set(ex, 0.7, 0.005); g.add(edge);
    }
    // Guard
    const gMat = new THREE.MeshStandardMaterial({ color: COL_GUARD, metalness: 0.8, roughness: 0.2 });
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), gMat);
    guard.position.y = 0.28; guard.castShadow = true; g.add(guard);
    for (const gx of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 8, Math.PI), gMat);
      c.position.set(gx * 0.16, 0.28, 0); c.rotation.z = gx * Math.PI / 2; g.add(c);
    }
    // Grip
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.25, 8), new THREE.MeshStandardMaterial({ color: COL_GRIP, roughness: 0.9 }));
    grip.position.y = 0.13; g.add(grip);
    for (let w = 0; w < 5; w++) {
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.004, 4, 8), new THREE.MeshStandardMaterial({ color: 0x442200, roughness: 0.8 }));
      wrap.position.y = 0.04 + w * 0.045; wrap.rotation.x = Math.PI / 2; g.add(wrap);
    }
    // Pommel + gem
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), gMat); pommel.position.y = 0.0; g.add(pommel);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.02, 0),
      new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.6, metalness: 0.3, roughness: 0.1 }));
    gem.position.set(0, 0.0, 0.04); g.add(gem);
    return g;
  }

  private _initGrail(): void {
    const g = new THREE.Group();
    const profile: THREE.Vector2[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20; let r: number, y: number;
      if (t < 0.12) { r = 0.08 + t * 0.3; y = t * 0.5; }
      else if (t < 0.18) { const bt = (t - 0.12) / 0.06; r = 0.08 + 0.036 - bt * 0.03; y = 0.06 + bt * 0.08; }
      else if (t < 0.38) { const st = (t - 0.18) / 0.2; r = 0.03 + Math.sin(st * Math.PI) * 0.008; y = 0.14 + st * 0.4; }
      else if (t < 0.5) { const kt = (t - 0.38) / 0.12; r = 0.04 + Math.sin(kt * Math.PI) * 0.05; y = 0.34 + kt * 0.12; }
      else { const bt = (t - 0.5) / 0.5; r = 0.04 + Math.pow(bt, 0.7) * 0.13; y = 0.46 + bt * 0.38; }
      profile.push(new THREE.Vector2(r * 2.5, y * 2.5 - 0.3));
    }
    const cup = new THREE.Mesh(new THREE.LatheGeometry(profile, 32),
      new THREE.MeshStandardMaterial({ color: COL_GOLD, metalness: 0.95, roughness: 0.08, emissive: COL_GOLD_GLOW, emissiveIntensity: 0.3 }));
    cup.castShadow = true; g.add(cup);
    // Bands
    for (const by of [0.2, 0.45, 0.58]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(by < 0.3 ? 0.08 : by < 0.5 ? 0.12 : 0.31, 0.012, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.9, roughness: 0.12 }));
      band.position.y = by; band.rotation.x = Math.PI / 2; g.add(band);
    }
    // Gems
    const gc = [0xff0022, 0x0044ff, 0x00cc22, 0xcc00ff, 0xff8800, 0x00cccc, 0xff0088, 0xffff00];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0),
        new THREE.MeshStandardMaterial({ color: gc[i], emissive: gc[i], emissiveIntensity: 0.7, metalness: 0.3, roughness: 0.05 }));
      gem.position.set(Math.cos(a) * 0.32, 0.45, Math.sin(a) * 0.32); gem.rotation.y = a; g.add(gem);
    }
    // Rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.018, 8, 32),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.9, roughness: 0.1 }));
    rim.position.y = 0.58; rim.rotation.x = Math.PI / 2; g.add(rim);
    // Glow
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.1, 0.15, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffeedd, transparent: true, opacity: 0.15, side: THREE.BackSide }));
    inner.position.y = 0.52; g.add(inner);
    g.add(new THREE.PointLight(COL_GOLD_GLOW, 2.5, 10, 1.5));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: COL_GOLD_GLOW, transparent: true, opacity: 0.06 }));
    glow.position.y = 0.3; g.add(glow);

    g.scale.setScalar(0.5); g.position.set(0, 1.5, 0); this._scene.add(g);

    // Holy beam (vertical pillar of light, visible during long rallies)
    const beamGeo = new THREE.CylinderGeometry(0.15, 0.4, 12, 8, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({ color: COL_GOLD_GLOW, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    this._holyBeam = new THREE.Mesh(beamGeo, beamMat);
    this._holyBeam.position.set(0, 6, 0);
    this._scene.add(this._holyBeam);

    // Spotlight for holy beam
    this._holyBeamLight = new THREE.SpotLight(COL_GOLD_GLOW, 0, 20, Math.PI / 8, 0.8, 1.5);
    this._holyBeamLight.position.set(0, 15, 0);
    this._holyBeamLight.target.position.set(0, 0, 0);
    this._scene.add(this._holyBeamLight);
    this._scene.add(this._holyBeamLight.target);

    // Orbiting sparkle ring around the grail
    const sparkCount = 24;
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkSizes = new Float32Array(sparkCount);
    for (let i = 0; i < sparkCount; i++) {
      sparkPos[i * 3] = 0; sparkPos[i * 3 + 1] = 0; sparkPos[i * 3 + 2] = 0;
      sparkSizes[i] = 0.8 + Math.random() * 1.2;
    }
    this._grailSparkleGeo = new THREE.BufferGeometry();
    this._grailSparkleGeo.setAttribute("position", new THREE.Float32BufferAttribute(sparkPos, 3));
    this._grailSparkleGeo.setAttribute("size", new THREE.Float32BufferAttribute(sparkSizes, 1));
    this._grailSparkles = new THREE.Points(this._grailSparkleGeo,
      new THREE.PointsMaterial({ color: COL_GOLD, size: 0.08, sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false }));
    this._scene.add(this._grailSparkles);

    // Shadow
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; this._scene.add(shadow);

    this._grail = {
      mesh: g, shadow, pos: new THREE.Vector3(0, 1.5, 0), vel: new THREE.Vector3(), spin: new THREE.Vector3(),
      bounceCount: 0, lastHitBy: -1, inPlay: false, isServe: false, faultCount: 0, hasBounced: false,
      landedInBounds: false, trail: [], speed: 0,
    };
  }

  private _initStadium(): void {
    const wMat = new THREE.MeshStandardMaterial({ color: COL_STONE, roughness: 0.8, metalness: 0.1 });
    const walls = [{ x: 0, z: -20, w: 40, h: 8, d: 1 }, { x: 0, z: 20, w: 40, h: 8, d: 1 }, { x: -20, z: 0, w: 1, h: 8, d: 41 }, { x: 20, z: 0, w: 1, h: 8, d: 41 }];
    for (const wc of walls) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(wc.w, wc.h, wc.d), wMat);
      wall.position.set(wc.x, wc.h / 2, wc.z); wall.castShadow = true; wall.receiveShadow = true; this._scene.add(wall);
      const bR = Math.floor(wc.h / 0.5), bC = Math.floor(Math.max(wc.w, wc.d) / 0.8);
      for (let r = 0; r < bR; r++) { const off = (r % 2) * 0.4;
        for (let c = 0; c < bC; c++) { if (Math.random() > 0.3) continue;
          const brick = new THREE.Mesh(new THREE.BoxGeometry(wc.d > 1 ? 0.02 : 0.75, 0.02, wc.d > 1 ? 0.75 : 0.02),
            new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.9 }));
          brick.position.set(
            wc.d > 1 ? wc.x + (Math.random() > 0.5 ? 0.51 : -0.51) : wc.x - (Math.max(wc.w, wc.d) / 2) + off + c * 0.8,
            r * 0.5 + 0.25,
            wc.d > 1 ? wc.z - (wc.d / 2) + off + c * 0.8 : wc.z + (Math.random() > 0.5 ? 0.51 : -0.51));
          this._scene.add(brick);
        }
      }
    }
    // Crenellations
    for (const wc of walls) { const cc = Math.floor(Math.max(wc.w, wc.d) / 2);
      for (let i = 1; i < cc; i += 2) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(wc.d > 1 ? 1.2 : 1.5, 1.0, wc.d > 1 ? 1.5 : 1.2), wMat);
        c.position.set(wc.d > 1 ? wc.x : wc.x - (wc.w / 2) + i * 2 + 1, wc.h + 0.5, wc.d > 1 ? wc.z - (wc.d / 2) + i * 2 + 1 : wc.z);
        c.castShadow = true; this._scene.add(c);
      }
    }
    // Stained glass windows
    const windowColors = [0xff2244, 0x2244ff, 0xffcc00, 0x22cc44, 0xcc44ff, 0xff8800];
    const windowPositions: [number, number, number, number][] = [ // x, y, z, rotY
      [-19.4, 5.5, -7, Math.PI / 2], [-19.4, 5.5, 7, Math.PI / 2],
      [19.4, 5.5, -7, -Math.PI / 2], [19.4, 5.5, 7, -Math.PI / 2],
      [-5, 5.5, -19.4, 0], [5, 5.5, -19.4, 0],
      [-5, 5.5, 19.4, Math.PI], [5, 5.5, 19.4, Math.PI],
    ];
    for (let wi = 0; wi < windowPositions.length; wi++) {
      const [wx, wy, wz, wr] = windowPositions[wi];
      // Window frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 1.5), new THREE.MeshStandardMaterial({ color: 0x333322, roughness: 0.7 }));
      frame.position.set(wx, wy, wz); frame.rotation.y = wr; this._scene.add(frame);
      // Pointed arch top
      const archTop = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.8, 3), new THREE.MeshStandardMaterial({ color: 0x333322, roughness: 0.7 }));
      archTop.position.set(wx, wy + 1.65, wz); archTop.rotation.y = wr; archTop.rotation.z = Math.PI; this._scene.add(archTop);
      // Glowing glass pane
      const col = windowColors[wi % windowColors.length];
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.2),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
      glass.position.set(wx + (Math.abs(wr) > 1 ? (wr > 0 ? 0.06 : -0.06) : 0), wy, wz + (Math.abs(wr) < 1 ? (wr > 0 ? -0.06 : 0.06) : 0));
      glass.rotation.y = wr; this._scene.add(glass);
      // Light from window
      const wLight = new THREE.PointLight(col, 0.4, 6, 2);
      wLight.position.set(wx + (Math.abs(wr) > 1 ? (wr > 0 ? -1 : 1) : 0), wy, wz + (Math.abs(wr) < 1 ? (wr > 0 ? 1 : -1) : 0));
      this._scene.add(wLight);
    }

    // Ivy / moss on walls
    const ivyMat = new THREE.MeshStandardMaterial({ color: 0x225522, roughness: 0.9, side: THREE.DoubleSide });
    for (let iv = 0; iv < 40; iv++) {
      const wallIdx = Math.floor(Math.random() * 4);
      const wc = walls[wallIdx];
      const ivySize = 0.5 + Math.random() * 1.5;
      const ivy = new THREE.Mesh(new THREE.PlaneGeometry(ivySize, ivySize * (0.8 + Math.random() * 0.8)), ivyMat);
      const ivX = wc.d > 1 ? wc.x + (Math.random() > 0.5 ? 0.52 : -0.52) : wc.x - wc.w / 2 + Math.random() * wc.w;
      const ivZ = wc.d > 1 ? wc.z - wc.d / 2 + Math.random() * wc.d : wc.z + (Math.random() > 0.5 ? 0.52 : -0.52);
      const ivY = Math.random() * 4 + 1;
      ivy.position.set(ivX, ivY, ivZ);
      if (wc.d > 1) ivy.rotation.y = Math.PI / 2;
      this._scene.add(ivy);
      // Ivy leaf clusters
      for (let lf = 0; lf < 3; lf++) {
        const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.1 + Math.random() * 0.15, 5),
          new THREE.MeshStandardMaterial({ color: 0x336633 + Math.floor(Math.random() * 0x002200), roughness: 0.8, side: THREE.DoubleSide }));
        leaf.position.set(ivX + (Math.random() - 0.5) * ivySize * 0.6, ivY + (Math.random() - 0.5) * ivySize * 0.5, ivZ + (Math.random() > 0.5 ? 0.01 : -0.01));
        if (wc.d > 1) leaf.rotation.y = Math.PI / 2;
        this._scene.add(leaf);
      }
    }

    // Torches
    const tp = [[-19.3,4,-10],[-19.3,4,0],[-19.3,4,10],[19.3,4,-10],[19.3,4,0],[19.3,4,10],[-8,4,-19.3],[0,4,-19.3],[8,4,-19.3],[-8,4,19.3],[0,4,19.3],[8,4,19.3]];
    for (const p of tp) {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.3 }));
      br.position.set(p[0], p[1], p[2]); this._scene.add(br);
      const fg = new THREE.Group();
      for (let f = 0; f < 3; f++) {
        const fl = new THREE.Mesh(new THREE.ConeGeometry(0.08 + f * 0.02, 0.25 - f * 0.05, 5),
          new THREE.MeshBasicMaterial({ color: f === 0 ? 0xffdd44 : f === 1 ? COL_TORCH : 0xff4400, transparent: true, opacity: 0.9 - f * 0.2 }));
        fl.position.y = f * 0.04; fg.add(fl); this._torchFlames.push(fl);
      }
      fg.position.set(p[0], p[1] + 0.45, p[2]); this._scene.add(fg);
      const tl = new THREE.PointLight(COL_TORCH, 1.5, 15, 2); tl.position.set(p[0], p[1] + 0.5, p[2]); this._scene.add(tl); this._torchLights.push(tl);
    }
    // Banners
    const bConf = [{x:-19,z:-15,c:COL_BANNER_RED},{x:-19,z:5,c:COL_BANNER_BLUE},{x:19,z:-5,c:COL_BANNER_RED},{x:19,z:15,c:COL_BANNER_BLUE},{x:-19,z:-5,c:COL_BANNER_BLUE},{x:19,z:5,c:COL_BANNER_RED}];
    const goldS = new THREE.MeshStandardMaterial({ color: COL_GOLD, side: THREE.DoubleSide, emissive: COL_GOLD, emissiveIntensity: 0.2 });
    for (const bc of bConf) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3), new THREE.MeshStandardMaterial({ color: bc.c, side: THREE.DoubleSide, roughness: 0.8 }));
      b.position.set(bc.x > 0 ? bc.x - 0.6 : bc.x + 0.6, 5, bc.z); b.rotation.y = bc.x > 0 ? -Math.PI / 12 : Math.PI / 12; this._scene.add(b);
      const bCH = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.15), goldS);
      bCH.position.copy(b.position); bCH.position.z += bc.x > 0 ? -0.01 : 0.01; bCH.rotation.y = b.rotation.y; this._scene.add(bCH);
      const bCV = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.8), goldS);
      bCV.position.copy(bCH.position); bCV.rotation.y = b.rotation.y; this._scene.add(bCV);
    }
    // Spectators
    for (const sz of [-1, 1]) { for (let row = 0; row < 3; row++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(35, 0.5, 2), new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 }));
      st.position.set(0, 0.5 + row * 1.2, sz * (16 + row * 1.5)); st.receiveShadow = true; this._scene.add(st);
      for (let s = 0; s < 16; s++) {
        const sm = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.4, 4, 6),
          new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.4, 0.25 + Math.random() * 0.15), roughness: 0.9 }));
        const bY = 1.2 + row * 1.2;
        sm.position.set(-14 + s * 1.85 + (Math.random() - 0.5), bY, sz * (16 + row * 1.5)); this._scene.add(sm);
        const hd = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshStandardMaterial({ color: 0xddbb99, roughness: 0.8 }));
        hd.position.set(sm.position.x, bY + 0.4, sm.position.z); this._scene.add(hd);
        this._spectators.push({ mesh: sm, headMesh: hd, baseY: bY, phase: Math.random() * Math.PI * 2, speed: 1 + Math.random() * 2 });
      }
    }}
    // Spectator flags (some spectators hold team pennants)
    for (let fi = 0; fi < 12; fi++) {
      const spec = this._spectators[Math.floor(Math.random() * this._spectators.length)];
      const flagCol = Math.random() > 0.5 ? COL_BANNER_BLUE : COL_BANNER_RED;
      // Pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.0, 4),
        new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.8 }));
      pole.position.set(spec.mesh.position.x + 0.2, spec.baseY + 0.8, spec.mesh.position.z);
      this._scene.add(pole);
      // Flag cloth
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25, 4, 2),
        new THREE.MeshStandardMaterial({ color: flagCol, side: THREE.DoubleSide, roughness: 0.8 }));
      flag.position.set(spec.mesh.position.x + 0.4, spec.baseY + 1.15, spec.mesh.position.z);
      flag.name = "specFlag";
      this._scene.add(flag);
      this._bannerMeshes.push(flag);
    }

    // Cobblestone surround
    const cobbleMat = new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.95, metalness: 0.05 });
    for (let cz = -14; cz <= 14; cz += 2) {
      for (const cx of [-COURT_WIDTH / 2 - 2.5, COURT_WIDTH / 2 + 2.5]) {
        const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.3 + Math.random() * 0.2, 0.35 + Math.random() * 0.2, 0.06, 6),
          cobbleMat);
        stone.position.set(cx + (Math.random() - 0.5) * 0.5, 0.01, cz + (Math.random() - 0.5) * 0.5);
        stone.rotation.y = Math.random() * Math.PI;
        this._scene.add(stone);
      }
    }

    // Grass tufts around court edges
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x337722, roughness: 0.9, side: THREE.DoubleSide });
    for (let gi = 0; gi < 80; gi++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = COURT_WIDTH / 2 + 2 + Math.random() * 5;
      const gx = Math.cos(angle) * dist * 0.8;
      const gz = Math.sin(angle) * dist;
      if (Math.abs(gx) > 18 || Math.abs(gz) > 18) continue;
      const tuft = new THREE.Group();
      const bladeCount = 3 + Math.floor(Math.random() * 4);
      for (let b = 0; b < bladeCount; b++) {
        const bladeH = 0.15 + Math.random() * 0.25;
        const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.03, bladeH), grassMat);
        blade.position.set((Math.random() - 0.5) * 0.1, bladeH / 2, (Math.random() - 0.5) * 0.1);
        blade.rotation.y = Math.random() * Math.PI;
        blade.rotation.z = (Math.random() - 0.5) * 0.3;
        tuft.add(blade);
      }
      tuft.position.set(gx, 0, gz);
      this._scene.add(tuft);
    }

    // Fireflies
    for (let ff = 0; ff < 15; ff++) {
      const ffMesh = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xccff44, transparent: true, opacity: 0.6 }));
      const ffPos = new THREE.Vector3((Math.random() - 0.5) * 30, 0.5 + Math.random() * 2, (Math.random() - 0.5) * 30);
      ffMesh.position.copy(ffPos);
      this._scene.add(ffMesh);
      this._fireflies.push({ mesh: ffMesh, pos: ffPos, phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 1.5 });
    }

    // Arena entrance gate (back wall center)
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x444433, roughness: 0.7, metalness: 0.1 });
    // Stone arch
    const archL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5, 1.2), gateMat);
    archL.position.set(-2, 2.5, -20); this._scene.add(archL);
    const archR = archL.clone(); archR.position.x = 2; this._scene.add(archR);
    const archTop = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1, 1.2), gateMat);
    archTop.position.set(0, 5.5, -20); this._scene.add(archTop);
    // Keystone
    const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.3),
      new THREE.MeshStandardMaterial({ color: COL_GOLD, metalness: 0.6, roughness: 0.3 }));
    keystone.position.set(0, 5.5, -19.4); this._scene.add(keystone);
    // Portcullis bars
    const barMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.3 });
    for (let bar = -3; bar <= 3; bar++) {
      const vBar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.5, 4), barMat);
      vBar.position.set(bar * 0.5, 2.5, -19.6); this._scene.add(vBar);
    }
    for (let hBar = 0; hBar < 4; hBar++) {
      const hB = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.5, 4), barMat);
      hB.position.set(0, 1 + hBar * 1.2, -19.6); hB.rotation.z = Math.PI / 2; this._scene.add(hB);
    }

    // Enhanced moon with craters
    const moonGeo = new THREE.SphereGeometry(3, 24, 24);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xeeeedd });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(-60, 80, 40); this._scene.add(moonMesh);
    // Craters (darker circles on moon surface)
    const craters = [[0.5, 0.8, 0.4], [-0.3, 0.2, 0.6], [0.8, -0.4, 0.3], [-0.6, -0.6, 0.5], [0.1, -0.8, 0.35]];
    for (const [cx, cy, cSize] of craters) {
      const crater = new THREE.Mesh(new THREE.CircleGeometry(cSize, 8),
        new THREE.MeshBasicMaterial({ color: 0xccccaa }));
      const cPos = new THREE.Vector3(cx, cy, 1).normalize().multiplyScalar(3.01);
      crater.position.copy(moonMesh.position).add(cPos);
      crater.lookAt(moonMesh.position.clone().add(cPos.clone().multiplyScalar(2)));
      this._scene.add(crater);
    }
    // Moon glow layers
    for (let gl = 0; gl < 3; gl++) {
      const glowMesh = new THREE.Mesh(new THREE.SphereGeometry(4 + gl * 2, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xccccbb, transparent: true, opacity: 0.04 - gl * 0.01 }));
      glowMesh.position.copy(moonMesh.position); this._scene.add(glowMesh);
    }

    // Corner towers
    for (const tx of [-20, 20]) for (const tz of [-20, 20]) {
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 10, 8), wMat);
      tw.position.set(tx, 5, tz); tw.castShadow = true; this._scene.add(tw);
      const tt = new THREE.Mesh(new THREE.ConeGeometry(2, 3, 8), new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 }));
      tt.position.set(tx, 11.5, tz); this._scene.add(tt);
    }
    // Bats circling towers
    const towerPositions = [[-20,-20],[20,-20],[-20,20],[20,20]];
    for (let ti = 0; ti < towerPositions.length; ti++) {
      for (let b = 0; b < 3; b++) {
        const batG = new THREE.Group();
        // Body
        const batBody = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4), new THREE.MeshBasicMaterial({ color: 0x111122 }));
        batG.add(batBody);
        // Wings
        for (const wx of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.12), new THREE.MeshBasicMaterial({ color: 0x1a1a2a, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
          wing.position.set(wx * 0.2, 0, 0);
          batG.add(wing);
        }
        batG.position.set(towerPositions[ti][0], 10 + b * 1.5 + Math.random() * 3, towerPositions[ti][1]);
        this._scene.add(batG);
        this._bats.push({ mesh: batG, angle: Math.random() * Math.PI * 2, height: 10 + b * 1.5 + Math.random() * 3, radius: 3 + Math.random() * 2, speed: 1 + Math.random() * 1.5, towerIdx: ti });
      }
    }

    // Umpire on high chair
    const umpG = new THREE.Group();
    // Chair
    const chairLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.5, 0.08), new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 }));
    const chairLeg2 = chairLeg1.clone();
    chairLeg1.position.set(-0.3, 1.75, 0); chairLeg2.position.set(0.3, 1.75, 0);
    umpG.add(chairLeg1); umpG.add(chairLeg2);
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 }));
    chairSeat.position.y = 3.5; umpG.add(chairSeat);
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.06), new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 }));
    chairBack.position.set(0, 3.9, -0.22); umpG.add(chairBack);
    // Umpire body
    const umpBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 }));
    umpBody.position.y = 3.95; umpG.add(umpBody);
    const umpHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), new THREE.MeshStandardMaterial({ color: 0xddbb99, roughness: 0.8 }));
    umpHead.position.y = 4.5; umpG.add(umpHead);
    // Umpire hat (beret)
    const umpHat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 }));
    umpHat.position.y = 4.65; umpG.add(umpHat);
    umpG.position.set(COURT_WIDTH / 2 + 1.5, 0, 0);
    this._scene.add(umpG);
    this._umpireMesh = umpG;

    // Court-side decorations
    const decoMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: COL_STEEL, metalness: 0.6, roughness: 0.3 });
    // Weapon racks (both sides)
    for (const sx of [-1, 1]) {
      const rackX = sx * (COURT_WIDTH / 2 + 3);
      // Rack frame
      const rackBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.4), decoMat);
      rackBase.position.set(rackX, 0.05, -6); this._scene.add(rackBase);
      const rackUp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.08), decoMat);
      rackUp.position.set(rackX - 0.3, 0.75, -6); this._scene.add(rackUp);
      const rackUp2 = rackUp.clone(); rackUp2.position.x = rackX + 0.3; this._scene.add(rackUp2);
      const rackBar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.06), decoMat);
      rackBar.position.set(rackX, 1.2, -6); this._scene.add(rackBar);
      // Swords on rack
      for (let sw = 0; sw < 3; sw++) {
        const sword = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.0, 0.01), metalMat);
        sword.position.set(rackX - 0.2 + sw * 0.2, 0.8, -6);
        sword.rotation.z = 0.1 - sw * 0.1;
        this._scene.add(sword);
      }
      // Shield on wall nearby
      const shield = new THREE.Mesh(new THREE.CircleGeometry(0.4, 8), new THREE.MeshStandardMaterial({
        color: sx > 0 ? COL_BANNER_RED : COL_BANNER_BLUE, metalness: 0.4, roughness: 0.5,
      }));
      shield.position.set(rackX, 1.5, -8);
      shield.rotation.y = sx > 0 ? -Math.PI / 6 : Math.PI / 6;
      this._scene.add(shield);
      const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshStandardMaterial({ color: COL_GOLD, metalness: 0.8, roughness: 0.2 }));
      shieldBoss.position.copy(shield.position);
      shieldBoss.position.z += sx > 0 ? -0.01 : 0.01;
      this._scene.add(shieldBoss);
      // Water barrel
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 }));
      barrel.position.set(rackX, 0.3, 6); this._scene.add(barrel);
      // Barrel bands
      for (const bh of [0.15, 0.45]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.015, 4, 12), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.4 }));
        band.position.set(rackX, bh, 6); band.rotation.x = Math.PI / 2; this._scene.add(band);
      }
    }

    // Dynamic court light (overhead, for rally intensity)
    this._courtLight = new THREE.PointLight(COL_GOLD_GLOW, 0, 30, 1.5);
    this._courtLight.position.set(0, 15, 0);
    this._scene.add(this._courtLight);
  }

  private _initUI(): void {
    this._uiCanvas = document.createElement("canvas");
    Object.assign(this._uiCanvas.style, { position: "fixed", top: "0", left: "0", zIndex: "10000", pointerEvents: "none" });
    this._uiCanvas.width = window.innerWidth; this._uiCanvas.height = window.innerHeight;
    document.body.appendChild(this._uiCanvas);
    this._uiCtx = this._uiCanvas.getContext("2d")!;
  }

  private _initInput(): void {
    this._onKeyDown = this._onKeyDown.bind(this); this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this); this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this); this._onResize = this._onResize.bind(this);
    window.addEventListener("keydown", this._onKeyDown); window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove); window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp); window.addEventListener("resize", this._onResize);
  }

  private _onKeyDown(e: KeyboardEvent): void {
    this._keys.add(e.code);
    if (this._phase === "title") {
      if (!this._difficultySelected) {
        if (e.code === "Digit1") { this._difficulty = 0; this._difficultySelected = true; }
        else if (e.code === "Digit2") { this._difficulty = 1; this._difficultySelected = true; }
        else if (e.code === "Digit3") { this._difficulty = 2; this._difficultySelected = true; }
        else if (e.code === "Space" || e.code === "Enter") { this._difficultySelected = true; }
        if (this._difficultySelected) this._startMatch();
        return;
      }
    }
    if (this._phase === "paused" && e.code === "KeyP") { this._phase = this._prevPhase; return; }
    if (this._phase !== "title" && this._phase !== "paused" && this._phase !== "matchOver" && e.code === "KeyP") {
      this._prevPhase = this._phase; this._phase = "paused"; return;
    }
    if (this._phase === "serving" && e.code === "Space" && this._serveReady && this._server === 0) {
      this._startServeToss();
    }
    if (this._phase === "servePower" && e.code === "Space") { this._executeServe(0); }
    if (this._phase === "rally") {
      if (e.code === "Space" || e.code === "KeyJ") this._trySwing(0, ShotType.FLAT);
      else if (e.code === "KeyK") this._trySwing(0, ShotType.LOB);
      else if (e.code === "KeyL") this._trySwing(0, ShotType.DROP);
      else if (e.code === "KeyI") this._trySwing(0, ShotType.POWER);
    }
    if (this._phase === "matchOver" && e.code === "Tab") { e.preventDefault(); this._showStats = !this._showStats; }
    if (e.code === "KeyC" && this._phase !== "title") {
      this._camMode = (this._camMode + 1) % 3 as CamMode;
    }
    if (e.code === "Escape") window.dispatchEvent(new Event("holyTennisExit"));
  }

  private _onKeyUp(e: KeyboardEvent): void { this._keys.delete(e.code); }
  private _onMouseMove(e: MouseEvent): void { this._mouseX = (e.clientX / window.innerWidth) * 2 - 1; this._mouseY = (e.clientY / window.innerHeight) * 2 - 1; }

  private _onMouseDown(_e: MouseEvent): void {
    if (this._phase === "title") { this._difficultySelected = true; this._startMatch(); }
    else if (this._phase === "serving" && this._serveReady && this._server === 0) this._startServeToss();
    else if (this._phase === "servePower") this._executeServe(0);
    else if (this._phase === "rally" && !this._players[0].isSwinging) this._trySwing(0, this._keys.has("ShiftLeft") ? ShotType.POWER : ShotType.FLAT);
  }

  private _onMouseUp(_e: MouseEvent): void { /* noop */ }

  private _onResize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this._camera.aspect = w / h; this._camera.updateProjectionMatrix();
    this._renderer.setSize(w, h); this._uiCanvas.width = w; this._uiCanvas.height = h;
  }

  /* ---------------------------------------------------------------- */
  /*  GAME LOGIC                                                       */
  /* ---------------------------------------------------------------- */

  private _startMatch(): void {
    this._phase = "serving"; this._server = 0; this._currentSet = 0;
    this._sets = [0, 0]; this._games = [[0, 0]]; this._points = [0, 0];
    this._isTiebreak = false; this._tiebreakPoints = [0, 0]; this._pointsInTiebreak = 0;
    this._winner = -1; this._serveSide = "deuce"; this._grail.faultCount = 0;
    this._message = ""; this._showStats = false; this._commentary = "";
    this._stats = { aces: [0, 0], winners: [0, 0], errors: [0, 0], longestRally: 0, totalPoints: [0, 0], perfectHits: [0, 0], maxServeSpeed: [0, 0], maxCombo: [0, 0] };
    this._players[0].side = -1; this._players[1].side = 1;
    this._players[0].stamina = 1; this._players[1].stamina = 1;
    this._players[0].comboCount = 0; this._players[1].comboCount = 0;
    this._wind.set(0, 0); this._windTarget.set((Math.random() - 0.5) * WIND_MAX, (Math.random() - 0.5) * WIND_MAX);
    this._checkSetMatchPoint(); this._resetForServe();
    if (this._isMatchPoint) this._setCommentary(COMMENTARY_MATCH_POINT);
  }

  private _resetForServe(): void {
    const sP = this._players[this._server], rP = this._players[1 - this._server];
    // Set walk targets (players walk there instead of teleporting)
    const sX = this._serveSide === "deuce" ? 1.5 : -1.5;
    const rX = this._serveSide === "deuce" ? -2 : 2;
    sP.walkTarget = new THREE.Vector3(sX, 0, sP.side * (BASELINE - 0.5));
    rP.walkTarget = new THREE.Vector3(rX, 0, rP.side * (BASELINE - 2));
    sP.vel.set(0, 0, 0); rP.vel.set(0, 0, 0);
    sP.celebTimer = 0; sP.celebType = 0; rP.celebTimer = 0; rP.celebType = 0;

    this._grail.vel.set(0, 0, 0); this._grail.spin.set(0, 0, 0);
    this._grail.inPlay = false; this._grail.isServe = true; this._grail.bounceCount = 0;
    this._grail.lastHitBy = -1; this._grail.hasBounced = false; this._grail.landedInBounds = false;
    this._grail.trail = []; this._grail.speed = 0; this._rallyHits = 0;
    this._servePower = 0;
    this._serveAimX = this._serveSide === "deuce" ? (-sP.side > 0 ? 1 : -1) : (-sP.side > 0 ? -1 : 1);
    this._players[1].aiReactTimer = 0;

    // Start walk phase
    this._walkPhase = true; this._walkTimer = 0;
    this._serveReady = false;
    this._phase = "serving";

    // Herald score announcement
    this._announceScore();
  }

  private _updateWalkPhase(dt: number): void {
    if (!this._walkPhase) return;
    this._walkTimer += dt;
    let allArrived = true;
    for (const p of this._players) {
      if (!p.walkTarget) continue;
      const dx = p.walkTarget.x - p.pos.x;
      const dz = p.walkTarget.z - p.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.15) {
        allArrived = false;
        const walkSpd = 5.0;
        p.pos.x += (dx / dist) * Math.min(walkSpd * dt, dist);
        p.pos.z += (dz / dist) * Math.min(walkSpd * dt, dist);
        p.runPhase += dt * 8;
        p.bodyLean = THREE.MathUtils.lerp(p.bodyLean, Math.sign(dx) * 0.08, 4 * dt);
      } else {
        p.pos.copy(p.walkTarget);
        p.walkTarget = null;
        p.runPhase *= 0.9;
      }
    }
    // Keep grail above server during walk
    const sP = this._players[this._server];
    this._grail.pos.set(sP.pos.x, 2.0, sP.pos.z);
    this._grail.mesh.position.copy(this._grail.pos);
    this._grail.shadow.position.set(this._grail.pos.x, 0.02, this._grail.pos.z);

    if (allArrived || this._walkTimer > 2.5) {
      this._walkPhase = false;
      // Snap to final positions
      for (const p of this._players) { if (p.walkTarget) { p.pos.copy(p.walkTarget); p.walkTarget = null; } }
      this._grail.pos.set(sP.pos.x, 2.0, sP.pos.z);
      this._grail.mesh.position.copy(this._grail.pos);
      this._serveReady = true;
    }
  }

  private _announceScore(): void {
    if (this._isTiebreak) {
      this._heraldMsg = `Tiebreak: ${this._tiebreakPoints[0]} - ${this._tiebreakPoints[1]}`;
    } else {
      const s0 = this._points[0], s1 = this._points[1];
      if (s0 === 0 && s1 === 0) {
        // New game - announce game score
        const g = this._games[this._currentSet];
        if (g[0] === 0 && g[1] === 0 && this._currentSet === 0) {
          this._heraldMsg = "New match! En garde!";
        } else {
          this._heraldMsg = `Games: ${g[0]} - ${g[1]}`;
        }
      } else {
        const n0 = s0 >= 3 && s1 >= 3 ? (s0 > s1 ? "Advantage" : s0 === s1 ? "Deuce" : "Forty") : (HERALD_POINTS[POINT_NAMES[Math.min(s0, 3)]] || "Forty");
        const n1 = s0 >= 3 && s1 >= 3 ? (s1 > s0 ? "Advantage" : s0 === s1 ? "" : "Forty") : (HERALD_POINTS[POINT_NAMES[Math.min(s1, 3)]] || "Forty");
        if (s0 >= 3 && s1 >= 3 && s0 === s1) this._heraldMsg = "Deuce!";
        else if (s0 === s1) this._heraldMsg = `${n0} all!`;
        else this._heraldMsg = `${n0} - ${n1}`;
      }
    }
    this._heraldTimer = 2.5;
  }

  private _startServeToss(): void {
    this._phase = "serveToss"; this._serveTossTimer = 0;
    this._audio.playServeToss();
  }

  private _executeServe(pi: number): void {
    this._serveReady = false;
    const p = this._players[pi]; const ts = -p.side;
    const power = this._servePower;
    const speed = SERVE_SPEED_MIN + (SERVE_SPEED_MAX - SERVE_SPEED_MIN) * power;
    const aimX = this._serveAimX + this._mouseX * 2;
    const aimZ = ts * (SERVICE_LINE * 0.4 + power * SERVICE_LINE * 0.3);
    const dir = new THREE.Vector3(aimX - p.pos.x, 0, aimZ - p.pos.z).normalize();
    this._grail.vel.set(dir.x * speed, 3 + (1 - power) * 3, dir.z * speed);
    this._grail.spin.set((Math.random() - 0.5) * 3, Math.random() * 5, (Math.random() - 0.5) * 3);
    this._grail.inPlay = true; this._grail.isServe = true; this._grail.bounceCount = 0;
    this._grail.lastHitBy = pi; this._grail.hasBounced = false; this._grail.speed = speed;
    this._trySwing(pi, ShotType.FLAT); this._phase = "rally";
    this._audio.playSwordHit(power); this._spawnHitParticles(p.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), power);
    this._players[1].aiReactTimer = AI_REACT_DELAY[this._difficulty];
    const kmh = Math.floor(speed * 3.6);
    this._stats.maxServeSpeed[pi] = Math.max(this._stats.maxServeSpeed[pi], kmh);
  }

  private _doAIServe(): void {
    this._serveReady = false;
    const ai = this._players[1]; const ts = -ai.side;
    const power = 0.5 + Math.random() * 0.4;
    const speed = SERVE_SPEED_MIN + (SERVE_SPEED_MAX - SERVE_SPEED_MIN) * power;
    const tX = this._serveSide === "deuce" ? (ts > 0 ? -SINGLES_WIDTH / 4 : SINGLES_WIDTH / 4) : (ts > 0 ? SINGLES_WIDTH / 4 : -SINGLES_WIDTH / 4);
    const dir = new THREE.Vector3(tX + (Math.random() - 0.5) * 2 - ai.pos.x, 0, ts * SERVICE_LINE * 0.5 - ai.pos.z).normalize();
    this._grail.vel.set(dir.x * speed, 3.5 + Math.random() * 2, dir.z * speed);
    this._grail.spin.set((Math.random() - 0.5) * 3, Math.random() * 5, (Math.random() - 0.5) * 3);
    this._grail.inPlay = true; this._grail.isServe = true; this._grail.bounceCount = 0;
    this._grail.lastHitBy = 1; this._grail.hasBounced = false; this._grail.speed = speed;
    this._trySwing(1, ShotType.FLAT); this._phase = "rally";
    this._audio.playSwordHit(power); this._spawnHitParticles(ai.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), power);
  }

  private _trySwing(pi: number, shot: ShotType): void {
    const p = this._players[pi]; if (p.isSwinging) return;
    p.isSwinging = true; p.swingTimer = 0; p.lastShotType = shot;
    p.swingDir.subVectors(this._grail.pos, p.pos).normalize();
    this._audio.playSwordWhoosh();
    // Track sword trail
    this._swordTrailPoints[pi] = [];
  }

  private _checkHit(pi: number): boolean {
    const p = this._players[pi];
    const dx = p.pos.x - this._grail.pos.x, dy = 1.3 - this._grail.pos.y, dz = p.pos.z - this._grail.pos.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) < SWING_REACH && this._grail.inPlay;
  }

  private _hitGrail(pi: number): void {
    const p = this._players[pi]; const opp = this._players[1 - pi];
    this._rallyHits++; this._grail.lastHitBy = pi; this._grail.isServe = false;
    this._grail.bounceCount = 0; this._grail.hasBounced = false;

    // Hit timing: distance from grail determines quality
    const dx = p.pos.x - this._grail.pos.x, dz = p.pos.z - this._grail.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    let timingBonus = 0;
    if (dist < 0.8) {
      p.comboCount++;
      this._hitTimingMsg = p.comboCount >= 3 ? `PERFECT x${p.comboCount}!` : "PERFECT!";
      this._hitTimingTimer = 0.8; timingBonus = 0.2 + p.comboCount * 0.05; this._stats.perfectHits[pi]++;
      this._stats.maxCombo[pi] = Math.max(this._stats.maxCombo[pi], p.comboCount);
      if (p.comboCount === 3) this._setCommentary(COMMENTARY_PERFECT);
      if (p.comboCount >= 5) { this._setCommentary(COMMENTARY_COMBO); this._screenFlash = 0.4; }
    } else if (dist < 1.3) { this._hitTimingMsg = "Good"; this._hitTimingTimer = 0.6; timingBonus = 0.05; p.comboCount = 0; }
    else { this._hitTimingMsg = "Late"; this._hitTimingTimer = 0.5; timingBonus = -0.15; p.comboCount = 0; }

    // AI can mis-hit based on difficulty
    if (p.isAI && Math.random() < AI_ERROR_RATE[this._difficulty]) {
      timingBonus = -0.4; // force a weak/errant shot
    }

    let speed: number, loft: number, spinMult: number;
    switch (p.lastShotType) {
      case ShotType.LOB: speed = HIT_SPEED_MIN * 0.9; loft = 7 + Math.random() * 3; spinMult = 0.5; break;
      case ShotType.DROP: speed = HIT_SPEED_MIN * 0.6; loft = 2 + Math.random(); spinMult = 2.0; break;
      case ShotType.POWER: speed = HIT_SPEED_MAX + 2; loft = 1.5 + Math.random() * 1.5; spinMult = 0.3; break;
      case ShotType.SLICE: speed = HIT_SPEED_MIN + Math.random() * 4; loft = 2 + Math.random() * 2; spinMult = 3.0; break;
      default: speed = HIT_SPEED_MIN + Math.random() * (HIT_SPEED_MAX - HIT_SPEED_MIN); loft = 2 + Math.random() * 3; spinMult = 1.0;
    }
    speed *= (1 + timingBonus);

    // Approach shot bonus (near the net)
    const distToNet = Math.abs(p.pos.z);
    if (distToNet < NET_APPROACH_ZONE) {
      speed *= (1 + NET_APPROACH_BONUS);
      if (!p.isAI && timingBonus > 0) this._hitTimingMsg += " VOLLEY!";
    }

    const aimX = opp.pos.x + (Math.random() - 0.5) * 6;
    const aimZ = opp.side * (BASELINE * 0.5 + Math.random() * BASELINE * 0.4);
    const dir = new THREE.Vector3(aimX - this._grail.pos.x, 0, aimZ - this._grail.pos.z).normalize();
    if (!p.isAI) { dir.x += this._mouseX * 1.8; dir.z += this._mouseY * 0.6 * p.side; dir.normalize(); }

    this._grail.vel.set(dir.x * speed, loft, dir.z * speed);
    this._grail.spin.set((Math.random() - 0.5) * 5 * spinMult, (Math.random() - 0.5) * 5 * spinMult, (Math.random() - 0.5) * 5 * spinMult);
    this._grail.speed = speed;

    const power = speed / HIT_SPEED_MAX;
    this._camShake = 0.15 + power * 0.3;
    this._audio.playSwordHit(power);
    this._spawnHitParticles(this._grail.pos.clone(), power);
    this._spawnImpactRing(this._grail.pos.clone());

    // Power shot fire trail flag
    this._lastShotWasPower = p.lastShotType === ShotType.POWER;

    // Screen flash on power shots
    if (p.lastShotType === ShotType.POWER) this._screenFlash = 0.3;

    // Shot-specific commentary
    if (p.lastShotType === ShotType.DROP && this._rallyHits > 2) this._setCommentary(COMMENTARY_DROP);
    else if (p.lastShotType === ShotType.LOB && this._rallyHits > 2) this._setCommentary(COMMENTARY_LOB);
    else if (p.lastShotType === ShotType.POWER) this._setCommentary(COMMENTARY_POWER);
    // Rally commentary
    if (this._rallyHits === 8) this._setCommentary(COMMENTARY_RALLY);
    if (this._rallyHits === 15) this._setCommentary(COMMENTARY_LONG_RALLY);
    if (this._rallyHits === 20) this._setCommentary(["TWENTY EXCHANGES! This is LEGENDARY!"]);

    // Slow-mo
    if (this._isMatchPoint || (this._isSetPoint && this._rallyHits > 4)) { this._slowMo = 0.3; this._slowMoTimer = 0.6; }

    // AI react delay on opponent's shot
    opp.aiReactTimer = AI_REACT_DELAY[this._difficulty];
  }

  private _setCommentary(pool: string[]): void {
    this._commentary = pool[Math.floor(Math.random() * pool.length)];
    this._commentaryTimer = 3.0;
  }

  /* ---------- SCORING ---------- */

  private _awardPoint(toPlayer: number): void {
    this._phase = "pointScored"; this._pointTimer = 2.0; this._grail.inPlay = false;
    this._stats.totalPoints[toPlayer]++;
    // Celebration/dejection
    this._players[toPlayer].celebType = 1; this._players[toPlayer].celebTimer = 0;
    this._players[1 - toPlayer].celebType = -1; this._players[1 - toPlayer].celebTimer = 0;
    if (this._rallyHits <= 1 && toPlayer === this._grail.lastHitBy && this._grail.isServe) { this._stats.aces[toPlayer]++; this._setCommentary(COMMENTARY_ACE); }
    else if (this._rallyHits > 0 && toPlayer === this._grail.lastHitBy) { this._stats.winners[toPlayer]++; this._setCommentary(COMMENTARY_WINNER); }
    if (this._rallyHits > 0 && toPlayer !== this._grail.lastHitBy) this._stats.errors[1 - toPlayer]++;
    this._stats.longestRally = Math.max(this._stats.longestRally, this._rallyHits);
    this._audio.playCrowdCheer(); this._animateCrowdReaction();

    if (this._isTiebreak) {
      this._tiebreakPoints[toPlayer]++; this._pointsInTiebreak++;
      const p0 = this._tiebreakPoints[0], p1 = this._tiebreakPoints[1];
      if (Math.max(p0, p1) >= TIEBREAK_POINTS_TO_WIN && Math.abs(p0 - p1) >= 2) {
        this._message = (p0 > p1 ? 0 : 1) === 0 ? "You win the tiebreak!" : "Opponent wins the tiebreak!";
        this._winGame(p0 > p1 ? 0 : 1); return;
      }
      if (this._pointsInTiebreak % 2 === 1) this._server = 1 - this._server;
      if (this._pointsInTiebreak % 6 === 0 && this._pointsInTiebreak > 0) this._swapEnds();
      this._message = `Tiebreak: ${p0} - ${p1}`;
    } else {
      this._points[toPlayer]++;
      const p0 = this._points[0], p1 = this._points[1];
      if (p0 >= 4 || p1 >= 4) {
        if (p0 >= 4 && p1 < 3) { this._message = "You win the game!"; this._winGame(0); return; }
        if (p1 >= 4 && p0 < 3) { this._message = "Opponent wins the game!"; this._winGame(1); return; }
        if (p0 >= 3 && p1 >= 3) {
          if (p0 - p1 >= 2) { this._message = "You win the game!"; this._winGame(0); return; }
          if (p1 - p0 >= 2) { this._message = "Opponent wins the game!"; this._winGame(1); return; }
          if (p0 === p1) { this._message = "Deuce!"; this._setCommentary(COMMENTARY_DEUCE); }
          else this._message = p0 > p1 ? "Advantage You!" : "Advantage Opponent!";
        }
      } else this._message = `${this._getScoreStr(0)} - ${this._getScoreStr(1)}`;
      this._serveSide = this._serveSide === "deuce" ? "ad" : "deuce";
    }
    this._checkSetMatchPoint();
    if (this._isMatchPoint) this._setCommentary(COMMENTARY_MATCH_POINT);
  }

  private _getScoreStr(pi: number): string {
    if (this._isTiebreak) return String(this._tiebreakPoints[pi]);
    return this._points[pi] < 4 ? POINT_NAMES[this._points[pi]] : "40";
  }

  private _winGame(pi: number): void {
    this._games[this._currentSet][pi]++;
    const g0 = this._games[this._currentSet][0], g1 = this._games[this._currentSet][1];
    let setWon = false;
    if (this._isTiebreak) { this._sets[pi]++; setWon = true; this._isTiebreak = false; }
    else if ((g0 >= GAMES_TO_WIN_SET || g1 >= GAMES_TO_WIN_SET) && Math.abs(g0 - g1) >= 2) { this._sets[pi]++; setWon = true; }
    else if (g0 === TIEBREAK_AT && g1 === TIEBREAK_AT) { this._isTiebreak = true; this._tiebreakPoints = [0, 0]; this._pointsInTiebreak = 0; this._message = "Tiebreak!"; }
    if (setWon) {
      if (this._sets[pi] >= SETS_TO_WIN) {
        this._winner = pi; this._phase = "matchOver";
        this._message = pi === 0 ? "YOU WIN THE MATCH!" : "OPPONENT WINS THE MATCH!";
        this._pointTimer = 7; this._audio.playMatchWin(); this._slowMo = 0.3; this._slowMoTimer = 2.0;
        this._spawnConfetti(); this._createTrophy();
        return;
      }
      this._message = pi === 0 ? `You win set ${this._currentSet + 1}!` : `Opponent wins set ${this._currentSet + 1}!`;
      this._setCommentary(COMMENTARY_SET_WON);
      this._currentSet++; this._games.push([0, 0]);
      if (this._currentSet % 2 === 1) this._swapEnds();
    }
    if (!this._isTiebreak) { this._points = [0, 0]; this._server = 1 - this._server; }
    this._serveSide = "deuce"; this._grail.faultCount = 0; this._checkSetMatchPoint();
  }

  private _swapEnds(): void { for (const p of this._players) p.side = (p.side === 1 ? -1 : 1) as 1 | -1; }

  private _handleFault(): void {
    this._grail.faultCount++; this._audio.playFault(); this._setCommentary(COMMENTARY_FAULT);
    if (this._grail.faultCount >= 2) { this._message = "Double Fault!"; this._stats.errors[this._server]++; this._awardPoint(1 - this._server); }
    else { this._message = "Fault!"; this._phase = "pointScored"; this._pointTimer = 1.5; this._grail.inPlay = false; }
  }

  private _checkSetMatchPoint(): void {
    this._isSetPoint = false; this._isMatchPoint = false;
    for (let pi = 0; pi < 2; pi++) {
      const pts = this._isTiebreak ? this._tiebreakPoints[pi] : this._points[pi];
      const can = this._isTiebreak ? (pts >= TIEBREAK_POINTS_TO_WIN - 1 && pts > this._tiebreakPoints[1 - pi]) : (pts >= 3 && pts > this._points[1 - pi]);
      if (can) {
        const g = this._games[this._currentSet][pi] + 1, og = this._games[this._currentSet][1 - pi];
        if ((g >= GAMES_TO_WIN_SET && g - og >= 2) || this._isTiebreak) {
          if (this._sets[pi] >= SETS_TO_WIN - 1) this._isMatchPoint = true;
          this._isSetPoint = true;
        }
      }
    }
  }

  /* ---------- GRAIL PHYSICS ---------- */

  private _updateGrail(dt: number): void {
    if (!this._grail.inPlay) return;
    const g = this._grail;
    g.vel.y += GRAVITY * dt; g.vel.multiplyScalar(AIR_DRAG);
    g.vel.x += g.spin.z * SPIN_FACTOR * dt; g.vel.z -= g.spin.x * SPIN_FACTOR * dt;
    // Wind influence (stronger when grail is higher)
    const windFactor = Math.min(1, g.pos.y * 0.15);
    g.vel.x += this._wind.x * windFactor * dt;
    g.vel.z += this._wind.y * windFactor * dt;
    g.pos.add(g.vel.clone().multiplyScalar(dt)); g.speed = g.vel.length();
    g.mesh.position.copy(g.pos);
    g.mesh.rotation.x += g.spin.x * dt; g.mesh.rotation.y += g.spin.y * dt; g.mesh.rotation.z += g.spin.z * dt;
    // Shadow
    g.shadow.position.set(g.pos.x, 0.02, g.pos.z);
    const ss = Math.max(0.1, 1 - g.pos.y * 0.08);
    g.shadow.scale.setScalar(ss); (g.shadow.material as THREE.MeshBasicMaterial).opacity = 0.3 * ss;
    // Trail
    g.trail.push(g.pos.clone()); if (g.trail.length > 30) g.trail.shift();
    // Bounce
    if (g.pos.y <= GRAIL_RADIUS) {
      g.pos.y = GRAIL_RADIUS; g.vel.y = Math.abs(g.vel.y) * BOUNCE_DAMP; g.spin.multiplyScalar(0.7); g.bounceCount++;
      const inB = this._isInBounds(g.pos.x, g.pos.z);
      const inSB = this._isInServiceBox(g.pos.x, g.pos.z, g.lastHitBy);
      this._audio.playBounce(); this._spawnBounceParticles(g.pos.clone()); this._addChalkMark(g.pos.x, g.pos.z, inB);
      // Ground ripple ring on bounce
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.1, 16),
        new THREE.MeshBasicMaterial({ color: 0xaaddaa, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(g.pos.x, 0.02, g.pos.z);
      this._scene.add(ring); this._bounceRings.push({ mesh: ring, life: 0.4 });
      if (g.isServe && g.bounceCount === 1) { if (!inSB) { this._handleFault(); return; } g.hasBounced = true; }
      if (!g.isServe || g.hasBounced) {
        if (g.bounceCount >= 2) { if (g.lastHitBy >= 0) { this._message = "Double bounce!"; this._awardPoint(g.lastHitBy); } return; }
        if (!inB && g.bounceCount === 1) { if (g.lastHitBy >= 0) { this._message = "Out!"; this._awardPoint(1 - g.lastHitBy); } return; }
      }
    }
    // Net
    if (this._checkNetCollision(g)) {
      this._netWobble = 0.5;
      if (g.isServe && !g.hasBounced) {
        if (g.vel.y > 0 || g.pos.y > NET_HEIGHT_C + 0.1) { g.vel.z *= 0.5; g.vel.y = Math.abs(g.vel.y) * 0.3 + 1; this._message = "Let!"; }
        else { this._handleFault(); return; }
      } else {
        this._audio.playNetHit(); this._setCommentary(COMMENTARY_NET);
        if (g.lastHitBy >= 0) { this._message = "Net!"; this._awardPoint(1 - g.lastHitBy); } return;
      }
    }
    if (g.pos.y < -2 || Math.abs(g.pos.x) > 25 || Math.abs(g.pos.z) > 25) {
      if (g.lastHitBy >= 0) { this._message = "Out!"; this._awardPoint(1 - g.lastHitBy); }
    }
  }

  private _isInBounds(x: number, z: number): boolean { return Math.abs(x) <= SINGLES_WIDTH / 2 + 0.1 && Math.abs(z) <= BASELINE + 0.1; }

  private _isInServiceBox(x: number, z: number, si: number): boolean {
    if (si < 0) return false;
    const ss = this._players[si].side, ts = -ss;
    if (ts > 0 && z < 0) return false; if (ts < 0 && z > 0) return false;
    if (Math.abs(z) > SERVICE_LINE + 0.1 || Math.abs(x) > SINGLES_WIDTH / 2 + 0.1) return false;
    if (this._serveSide === "deuce") return ts > 0 ? (x >= -0.1 && x <= SINGLES_WIDTH / 2 + 0.1) : (x >= -SINGLES_WIDTH / 2 - 0.1 && x <= 0.1);
    return ts > 0 ? (x >= -SINGLES_WIDTH / 2 - 0.1 && x <= 0.1) : (x >= -0.1 && x <= SINGLES_WIDTH / 2 + 0.1);
  }

  private _checkNetCollision(g: Grail): boolean {
    const pz = g.pos.z - g.vel.z / 60;
    if ((pz < 0 && g.pos.z >= 0) || (pz > 0 && g.pos.z <= 0)) {
      if (Math.abs(g.pos.x) < COURT_WIDTH / 2 + 0.5) {
        const t = Math.abs(pz) / (Math.abs(pz) + Math.abs(g.pos.z));
        if (g.pos.y - g.vel.y / 60 * (1 - t) < this._netHeightAt(g.pos.x)) return true;
      }
    }
    return false;
  }

  private _netHeightAt(x: number): number { const t = Math.abs(x) / (COURT_WIDTH / 2); return NET_HEIGHT_C + (NET_HEIGHT_P - NET_HEIGHT_C) * t * t; }

  /* ---------- AI ---------- */

  private _updateAI(dt: number): void {
    const ai = this._players[1]; const g = this._grail;
    const aiSpeed = AI_SPEEDS[this._difficulty];

    if (this._phase === "serving" && this._server === 1) {
      if (this._serveReady && Math.random() < 0.015) this._doAIServe();
      return;
    }
    if (!g.inPlay) return;

    // React delay
    if (ai.aiReactTimer > 0) { ai.aiReactTimer -= dt; return; }

    let predX = g.pos.x, predZ = g.pos.z;
    const coming = g.vel.z * ai.side > 0 || Math.abs(g.pos.z - ai.pos.z) < 5;
    if (coming) {
      let sx = g.pos.x, sz = g.pos.z, sy = g.pos.y, vx = g.vel.x, vz = g.vel.z, vy = g.vel.y;
      for (let s = 0; s < 120; s++) {
        vy += GRAVITY / 60; sx += vx / 60; sz += vz / 60; sy += vy / 60; vx *= AIR_DRAG; vz *= AIR_DRAG;
        if (sy <= GRAIL_RADIUS) { predX = sx; predZ = sz; break; }
        if (Math.abs(sz - ai.pos.z) < 1.5 && sy < 3) { predX = sx; predZ = sz; break; }
      }
      predX = Math.max(-SINGLES_WIDTH / 2 - 1, Math.min(SINGLES_WIDTH / 2 + 1, predX));
    } else { predX = 0; predZ = ai.side * (BASELINE - 3); }

    ai.targetX = predX; ai.targetZ = Math.max(Math.min(predZ, ai.side > 0 ? BASELINE : 3), ai.side > 0 ? 2 : -BASELINE);
    const dx = ai.targetX - ai.pos.x, dz = ai.targetZ - ai.pos.z, dSq = dx * dx + dz * dz;
    if (dSq > 0.1) {
      const d = Math.sqrt(dSq); const spd = coming && d > 3 ? aiSpeed * 1.2 : aiSpeed;
      ai.pos.x += Math.min(Math.abs(dx), spd * dt) * Math.sign(dx);
      ai.pos.z += Math.min(Math.abs(dz), spd * dt) * Math.sign(dz);
    }

    // AI running animation
    const aiMoving = dSq > 0.3;
    if (aiMoving) ai.runPhase += dt * 10;
    else ai.runPhase *= 0.9;
    ai.bodyLean = THREE.MathUtils.lerp(ai.bodyLean, Math.sign(dx) * Math.min(Math.abs(dx), 1) * 0.1, 6 * dt);

    // Swing
    const reach = SWING_REACH + AI_REACH_BONUS[this._difficulty];
    const dg = Math.sqrt((ai.pos.x - g.pos.x) ** 2 + (1.3 - g.pos.y) ** 2 + (ai.pos.z - g.pos.z) ** 2);
    if (dg < reach && g.pos.y < 3 && g.pos.y > 0.2 && !ai.isSwinging) {
      let shot = ShotType.FLAT; const r = Math.random();
      if (this._players[0].pos.z * this._players[0].side > BASELINE * 0.5 && r < 0.3) shot = ShotType.DROP;
      else if (this._rallyHits > 5 && r < 0.2) shot = ShotType.LOB;
      else if (r < 0.15) shot = ShotType.POWER;
      this._trySwing(1, shot);
    }
  }

  /* ---------- PLAYER MOVEMENT ---------- */

  private _updatePlayer(dt: number): void {
    const p = this._players[0]; let mx = 0, mz = 0;
    if (this._keys.has("KeyW") || this._keys.has("ArrowUp")) mz = -1;
    if (this._keys.has("KeyS") || this._keys.has("ArrowDown")) mz = 1;
    if (this._keys.has("KeyA") || this._keys.has("ArrowLeft")) mx = -1;
    if (this._keys.has("KeyD") || this._keys.has("ArrowRight")) mx = 1;
    if (mx || mz) { const l = Math.sqrt(mx * mx + mz * mz); mx /= l; mz /= l; }
    const wantSprint = this._keys.has("ShiftLeft");
    const sprint = wantSprint && p.stamina > 0.05;
    const spd = sprint ? PLAYER_SPRINT : PLAYER_SPEED;
    // Stamina management
    if (sprint && (mx || mz)) p.stamina = Math.max(0, p.stamina - dt * 0.4);
    else p.stamina = Math.min(1, p.stamina + dt * (mx || mz ? 0.15 : 0.35));
    p.pos.x = Math.max(-COURT_WIDTH, Math.min(COURT_WIDTH, p.pos.x + mx * spd * dt));
    p.pos.z = Math.max(-BASELINE - 3, Math.min(BASELINE + 3, p.pos.z + mz * spd * dt));
    const moving = mx !== 0 || mz !== 0;
    if (moving) p.runPhase += dt * (sprint ? 14 : 10); else p.runPhase *= 0.9;
    p.bodyLean = THREE.MathUtils.lerp(p.bodyLean, mx * 0.15, 6 * dt);

    // Footstep dust + sound
    if (moving) {
      p.footstepTimer -= dt;
      if (p.footstepTimer <= 0) {
        p.footstepTimer = sprint ? 0.18 : 0.25;
        this._audio.playFootstep();
        this._spawnFootDust(p.pos);
      }
    }
  }

  /* ---------- ANIMATION ---------- */

  private _updatePlayerAnimation(dt: number): void {
    for (let i = 0; i < 2; i++) {
      const p = this._players[i];
      p.mesh.position.copy(p.pos);
      // Shadow
      p.shadow.position.set(p.pos.x, 0.015, p.pos.z);
      // Face ball
      let ta = this._grail.inPlay ? Math.atan2(-(this._grail.pos.x - p.pos.x), -(this._grail.pos.z - p.pos.z)) : (p.side > 0 ? Math.PI : 0);
      let ad = ta - p.facingAngle; while (ad > Math.PI) ad -= Math.PI * 2; while (ad < -Math.PI) ad += Math.PI * 2;
      p.facingAngle += ad * 6 * dt; p.mesh.rotation.y = p.facingAngle;
      p.mesh.rotation.z = p.bodyLean;
      // Cape sway (fake cloth physics)
      const cape = p.mesh.getObjectByName("cape") as THREE.Mesh | undefined;
      if (cape) {
        const runSway = Math.sin(p.runPhase * 0.8) * 0.15;
        const windSway = Math.sin(this._totalTime * 2 + i * 3) * 0.08;
        cape.rotation.x = -0.2 + runSway + windSway + Math.abs(p.bodyLean) * 0.5;
        cape.rotation.z = p.bodyLean * -0.3 + Math.sin(this._totalTime * 3 + i) * 0.05;
        // Cape vertices deform (simple wave on the geometry)
        const pos = cape.geometry.attributes.position;
        if (pos) {
          for (let vi = 0; vi < pos.count; vi++) {
            const vy = pos.getY(vi); // along cape length
            // Only deform lower vertices (cape bottom waves more)
            if (vy < -0.1) {
              const wave = Math.sin(this._totalTime * 4 + vi * 0.5 + i) * 0.04 * Math.abs(vy);
              pos.setZ(vi, wave);
            }
          }
          pos.needsUpdate = true;
        }
      }
      // Legs
      const ls = Math.sin(p.runPhase) * 0.4;
      if (p.legMeshes.length >= 2) {
        p.legMeshes[0].rotation.x = ls; p.legMeshes[1].rotation.x = -ls;
        p.legMeshes[0].position.y = 0.4 + Math.abs(Math.sin(p.runPhase)) * 0.05;
        p.legMeshes[1].position.y = 0.4 + Math.abs(Math.cos(p.runPhase)) * 0.05;
      }
      if (p.armMeshes.length >= 2 && !p.isSwinging) { p.armMeshes[0].rotation.x = -ls * 0.3; p.armMeshes[1].rotation.x = ls * 0.3; }
      // Celebration/dejection animation
      if (p.celebType !== 0) {
        p.celebTimer += dt;
        if (p.celebType === 1) {
          // Winner: raise sword triumphantly
          p.swordGroup.rotation.z = -Math.min(p.celebTimer * 4, 1) * Math.PI * 0.8;
          p.swordGroup.rotation.x = Math.sin(p.celebTimer * 3) * 0.3;
          if (p.armMeshes.length >= 2) p.armMeshes[1].rotation.z = -Math.min(p.celebTimer * 3, 1) * 0.8;
        } else {
          // Loser: hang head, lower sword
          p.mesh.rotation.x = Math.min(p.celebTimer * 2, 0.15);
          p.swordGroup.rotation.z = Math.min(p.celebTimer * 2, 0.5);
        }
      }
      // Swing
      if (p.isSwinging) {
        p.swingTimer += dt; const t = p.swingTimer / SWING_DURATION;
        const isLob = p.lastShotType === ShotType.LOB, isDrop = p.lastShotType === ShotType.DROP, isPow = p.lastShotType === ShotType.POWER;
        if (t < 0.4) {
          const bt = t / 0.4;
          p.swordGroup.rotation.z = -bt * (isPow ? Math.PI * 2 : Math.PI * 1.5);
          p.swordGroup.rotation.x = bt * (isLob ? 1.0 : isDrop ? 0.2 : 0.5);
          if (p.armMeshes.length >= 2) p.armMeshes[1].rotation.z = 0.3 - bt * 0.5;
        } else {
          const ft = (t - 0.4) / 0.6; const bZ = isPow ? Math.PI * 2 : Math.PI * 1.5;
          p.swordGroup.rotation.z = -(1 - ft) * bZ + ft * Math.PI * 0.3;
          p.swordGroup.rotation.x = (1 - ft) * (isLob ? 1.0 : isDrop ? 0.2 : 0.5);
          if (p.armMeshes.length >= 2) p.armMeshes[1].rotation.z = 0.3 - (1 - ft) * 0.5;
        }
        // Sword trail point
        const tipWorld = new THREE.Vector3(0, 1.5, 0);
        p.swordGroup.localToWorld(tipWorld);
        this._swordTrailPoints[i].push({ pos: tipWorld, time: this._totalTime });
        // Hit check
        if (p.swingTimer >= SWING_HIT_WINDOW && p.swingTimer < SWING_HIT_WINDOW + dt * 2) {
          if (this._checkHit(i)) this._hitGrail(i);
        }
        if (p.swingTimer >= SWING_DURATION) { p.isSwinging = false; p.swingTimer = 0; p.swordGroup.rotation.set(0, 0, 0); }
      }
    }
  }

  /* ---------- VFX ---------- */

  private _addChalkMark(x: number, z: number, inB: boolean): void {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.15, 8), new THREE.MeshBasicMaterial({ color: inB ? 0xccffcc : 0xff4444, transparent: true, opacity: 0.6 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.015, z); this._scene.add(m); this._chalkMarks.push({ mesh: m, life: 4.0 });
    for (let i = 0; i < 6; i++) {
      const pm = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4), new THREE.MeshBasicMaterial({ color: inB ? 0xccffcc : 0xff6666, transparent: true }));
      pm.position.set(x, 0.05, z); this._scene.add(pm);
      this._particles.push({ mesh: pm, vel: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2), life: 0.5, maxLife: 0.5 });
    }
  }

  private _spawnHitParticles(pos: THREE.Vector3, power: number): void {
    for (let i = 0; i < Math.floor(12 + power * 16); i++) {
      const isG = Math.random() > 0.3;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.02 + Math.random() * 0.04, 4, 4),
        new THREE.MeshBasicMaterial({ color: isG ? new THREE.Color().setHSL(0.1 + Math.random() * 0.08, 1, 0.5 + Math.random() * 0.3) : 0xffffff, transparent: true }));
      m.position.copy(pos); this._scene.add(m);
      const sp = 5 + power * 6;
      this._particles.push({ mesh: m, vel: new THREE.Vector3((Math.random() - 0.5) * sp, Math.random() * 5 + 2, (Math.random() - 0.5) * sp), life: 0.4 + Math.random() * 0.5, maxLife: 0.9 });
    }
  }

  private _spawnBounceParticles(pos: THREE.Vector3): void {
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.018, 4, 4), new THREE.MeshBasicMaterial({ color: 0x88cc44, transparent: true }));
      m.position.copy(pos); this._scene.add(m);
      this._particles.push({ mesh: m, vel: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2 + 0.5, (Math.random() - 0.5) * 3), life: 0.3 + Math.random() * 0.3, maxLife: 0.6 });
    }
  }

  private _spawnFootDust(pos: THREE.Vector3): void {
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), new THREE.MeshBasicMaterial({ color: 0x667744, transparent: true }));
      m.position.set(pos.x + (Math.random() - 0.5) * 0.3, 0.05, pos.z + (Math.random() - 0.5) * 0.3); this._scene.add(m);
      this._particles.push({ mesh: m, vel: new THREE.Vector3((Math.random() - 0.5), Math.random() * 0.5 + 0.3, (Math.random() - 0.5)), life: 0.3, maxLife: 0.3 });
    }
  }

  private _spawnConfetti(): void {
    for (let i = 0; i < 100; i++) {
      const col = [0xff4444, 0x4444ff, 0xffd700, 0x44ff44, 0xff44ff, 0x44ffff][Math.floor(Math.random() * 6)];
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.1 + Math.random() * 0.15, 0.05 + Math.random() * 0.1),
        new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true }));
      m.position.set((Math.random() - 0.5) * 10, 8 + Math.random() * 5, (Math.random() - 0.5) * 6);
      this._scene.add(m);
      this._confetti.push({
        mesh: m, vel: new THREE.Vector3((Math.random() - 0.5) * 3, -2 - Math.random() * 3, (Math.random() - 0.5) * 3),
        rot: new THREE.Vector3(Math.random() * 5, Math.random() * 5, Math.random() * 5), life: 5 + Math.random() * 3,
      });
    }
  }

  private _createTrophy(): void {
    if (this._trophyMesh) { this._scene.remove(this._trophyMesh); }
    const g = new THREE.Group();
    // Simple trophy: gold cup on pedestal
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.6), new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.6 }));
    ped.position.y = 0.2; g.add(ped);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: COL_GOLD, metalness: 0.9, roughness: 0.1, emissive: COL_GOLD_GLOW, emissiveIntensity: 0.3 }));
    cup.position.y = 0.65; g.add(cup);
    const handles = new THREE.MeshStandardMaterial({ color: COL_GOLD, metalness: 0.8, roughness: 0.2 });
    for (const sx of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 8, Math.PI), handles);
      h.position.set(sx * 0.22, 0.65, 0); h.rotation.z = sx * Math.PI / 2; g.add(h);
    }
    const light = new THREE.PointLight(COL_GOLD_GLOW, 1.5, 5);
    light.position.y = 1; g.add(light);
    g.position.set(0, 0.5, 0);
    this._scene.add(g); this._trophyMesh = g;
  }

  private _updateParticles(dt: number): void {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i]; p.vel.y += GRAVITY * 0.5 * dt;
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt)); p.life -= dt;
      const a = Math.max(0, p.life / p.maxLife);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = a; p.mesh.scale.setScalar(a);
      if (p.life <= 0) { this._scene.remove(p.mesh); p.mesh.geometry.dispose(); (p.mesh.material as THREE.Material).dispose(); this._particles.splice(i, 1); }
    }
  }

  private _updateChalkMarks(dt: number): void {
    for (let i = this._chalkMarks.length - 1; i >= 0; i--) {
      const c = this._chalkMarks[i]; c.life -= dt;
      (c.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, c.life * 0.15);
      if (c.life <= 0) { this._scene.remove(c.mesh); c.mesh.geometry.dispose(); (c.mesh.material as THREE.Material).dispose(); this._chalkMarks.splice(i, 1); }
    }
  }

  private _updateTrail(): void {
    for (const m of this._trailMeshes) { this._scene.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
    this._trailMeshes = [];
    if (!this._grail.inPlay || this._grail.trail.length < 3) return;
    const trail = this._grail.trail;
    const isPower = this._lastShotWasPower;
    const enchant = Math.min(1, this._rallyHits * 0.12);

    // Ribbon trail: connected quads facing camera
    for (let i = 1; i < trail.length; i++) {
      const t = i / trail.length;
      const width = (0.02 + t * 0.06) * (1 + enchant * 0.5);
      const col = isPower
        ? new THREE.Color().setHSL(0.05 + t * 0.05, 1, 0.4 + t * 0.3) // orange-red fire gradient
        : new THREE.Color(COL_GOLD_GLOW);

      // Cross-section perpendicular to direction, facing camera
      const dir = new THREE.Vector3().subVectors(trail[i], trail[Math.max(0, i - 1)]).normalize();
      const toCamera = new THREE.Vector3().subVectors(this._camera.position, trail[i]).normalize();
      const right = new THREE.Vector3().crossVectors(dir, toCamera).normalize().multiplyScalar(width);

      const geo = new THREE.BufferGeometry();
      const p0 = trail[i - 1], p1 = trail[i];
      const v = [
        p0.x - right.x, p0.y - right.y, p0.z - right.z,
        p0.x + right.x, p0.y + right.y, p0.z + right.z,
        p1.x + right.x, p1.y + right.y, p1.z + right.z,
        p1.x - right.x, p1.y - right.y, p1.z - right.z,
      ];
      geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
      geo.setIndex([0, 1, 2, 0, 2, 3]);

      const mat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: t * (isPower ? 0.6 : 0.4) * (0.5 + enchant * 0.5),
        side: THREE.DoubleSide, depthWrite: false,
      });
      const m = new THREE.Mesh(geo, mat);
      this._scene.add(m); this._trailMeshes.push(m);
    }

    // Power shot: extra fire sparks along trail
    if (isPower && Math.random() < 0.4 && trail.length > 5) {
      const rIdx = Math.floor(trail.length * 0.5 + Math.random() * trail.length * 0.5);
      const pt = trail[Math.min(rIdx, trail.length - 1)];
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.02, 3, 3),
        new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xff4400 : 0xffaa00, transparent: true }));
      spark.position.copy(pt).add(new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2));
      this._scene.add(spark);
      this._particles.push({ mesh: spark, vel: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() + 0.5, (Math.random() - 0.5) * 2), life: 0.3, maxLife: 0.3 });
    }
  }

  private _updateSwordTrails(): void {
    for (const m of this._swordTrailMeshes) { this._scene.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
    this._swordTrailMeshes = [];
    for (let pi = 0; pi < 2; pi++) {
      const pts = this._swordTrailPoints[pi];
      // Cull old points
      while (pts.length > 0 && this._totalTime - pts[0].time > 0.15) pts.shift();
      if (pts.length < 2) continue;
      for (let i = 1; i < pts.length; i++) {
        const t = i / pts.length;
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.01 + t * 0.02, 3, 3),
          new THREE.MeshBasicMaterial({ color: pi === 0 ? 0x6688ff : 0xff6644, transparent: true, opacity: t * 0.5 }));
        m.position.copy(pts[i].pos); this._scene.add(m); this._swordTrailMeshes.push(m);
      }
    }
  }

  private _updateShootingStars(dt: number): void {
    // Spawn
    if (Math.random() < 0.003) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 4, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      const pos = new THREE.Vector3((Math.random() - 0.5) * 200, 100 + Math.random() * 50, (Math.random() - 0.5) * 100);
      m.position.copy(pos); this._scene.add(m);
      this._shootingStars.push({ pos, vel: new THREE.Vector3((Math.random() - 0.5) * 40, -20 - Math.random() * 30, (Math.random() - 0.5) * 20), mesh: m, life: 1 + Math.random() });
    }
    for (let i = this._shootingStars.length - 1; i >= 0; i--) {
      const s = this._shootingStars[i]; s.pos.add(s.vel.clone().multiplyScalar(dt)); s.mesh.position.copy(s.pos);
      s.life -= dt; (s.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, s.life);
      if (s.life <= 0) { this._scene.remove(s.mesh); s.mesh.geometry.dispose(); (s.mesh.material as THREE.Material).dispose(); this._shootingStars.splice(i, 1); }
    }
  }

  private _updateConfetti(dt: number): void {
    for (let i = this._confetti.length - 1; i >= 0; i--) {
      const c = this._confetti[i]; c.vel.y += -1 * dt;
      c.mesh.position.add(c.vel.clone().multiplyScalar(dt));
      c.mesh.rotation.x += c.rot.x * dt; c.mesh.rotation.y += c.rot.y * dt; c.mesh.rotation.z += c.rot.z * dt;
      // Flutter
      c.vel.x += Math.sin(this._totalTime * 5 + i) * 2 * dt;
      c.life -= dt; (c.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1, c.life);
      if (c.life <= 0 || c.mesh.position.y < -1) { this._scene.remove(c.mesh); c.mesh.geometry.dispose(); (c.mesh.material as THREE.Material).dispose(); this._confetti.splice(i, 1); }
    }
  }

  private _updateBats(dt: number): void {
    const towerPos = [[-20,-20],[20,-20],[-20,20],[20,20]];
    for (const bat of this._bats) {
      bat.angle += bat.speed * dt;
      const tp = towerPos[bat.towerIdx];
      const x = tp[0] + Math.cos(bat.angle) * bat.radius;
      const z = tp[1] + Math.sin(bat.angle) * bat.radius;
      const y = bat.height + Math.sin(bat.angle * 2.5) * 1.5;
      bat.mesh.position.set(x, y, z);
      bat.mesh.rotation.y = bat.angle + Math.PI / 2;
      // Wing flap
      const wingFlap = Math.sin(this._totalTime * 12 + bat.angle * 3) * 0.4;
      if (bat.mesh.children.length >= 3) {
        bat.mesh.children[1].rotation.z = wingFlap;
        bat.mesh.children[2].rotation.z = -wingFlap;
      }
    }
  }

  private _updateLandingPrediction(): void {
    this._predictedLanding = null; this._predictionArc = [];
    if (!this._grail.inPlay) return;
    const g = this._grail;
    let sx = g.pos.x, sz = g.pos.z, sy = g.pos.y;
    let vx = g.vel.x, vz = g.vel.z, vy = g.vel.y;
    for (let s = 0; s < 180; s++) {
      const sdt = 1 / 60;
      vy += GRAVITY * sdt;
      const wf = Math.min(1, sy * 0.15);
      vx += this._wind.x * wf * sdt; vz += this._wind.y * wf * sdt;
      sx += vx * sdt; sz += vz * sdt; sy += vy * sdt;
      vx *= AIR_DRAG; vz *= AIR_DRAG;
      if (s % 3 === 0) this._predictionArc.push(new THREE.Vector3(sx, sy, sz));
      if (sy <= GRAIL_RADIUS) { this._predictedLanding = new THREE.Vector3(sx, 0, sz); break; }
    }
  }

  private _spawnImpactRing(pos: THREE.Vector3): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.15, 24),
      new THREE.MeshBasicMaterial({ color: COL_GOLD_GLOW, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.position.copy(pos);
    ring.lookAt(this._camera.position);
    this._scene.add(ring);
    this._impactRings.push({ mesh: ring, life: 0.5 });
  }

  private _spawnTorchEmbers(): void {
    if (Math.random() > 0.15) return; // spawn rate
    const torchIdx = Math.floor(Math.random() * this._torchLights.length);
    const tl = this._torchLights[torchIdx];
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.015 + Math.random() * 0.02, 3, 3),
      new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xffaa33 : 0xff6622, transparent: true })
    );
    m.position.set(tl.position.x + (Math.random() - 0.5) * 0.3, tl.position.y, tl.position.z + (Math.random() - 0.5) * 0.3);
    this._scene.add(m);
    this._embers.push({
      mesh: m,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.5, 1 + Math.random() * 2, (Math.random() - 0.5) * 0.5),
      life: 1 + Math.random() * 2,
      maxLife: 3,
    });
  }

  private _updateVisualEffects(dt: number): void {
    // Twinkling stars
    if (this._starMat) {
      this._starMat.opacity = 0.7 + Math.sin(this._totalTime * 0.5) * 0.3;
      this._starMat.size = 0.4 + Math.sin(this._totalTime * 1.2) * 0.15;
    }

    // Clouds drift
    for (const c of this._clouds) {
      c.mesh.position.x += c.speed * dt;
      if (c.mesh.position.x > 120) c.mesh.position.x = -120;
    }

    // Aurora
    if (this._auroraMesh) {
      this._auroraTime += dt;
      (this._auroraMesh.material as THREE.ShaderMaterial).uniforms.time.value = this._auroraTime;
    }

    // Mist sway
    for (const m of this._mistMeshes) {
      m.position.x += Math.sin(this._totalTime * 0.3 + m.position.z) * 0.005;
      m.position.z += Math.cos(this._totalTime * 0.2 + m.position.x) * 0.003;
    }

    // Torch embers
    this._spawnTorchEmbers();
    for (let i = this._embers.length - 1; i >= 0; i--) {
      const e = this._embers[i];
      e.vel.x += (Math.random() - 0.5) * 2 * dt; // wander
      e.mesh.position.add(e.vel.clone().multiplyScalar(dt));
      e.life -= dt;
      const a = Math.max(0, e.life / e.maxLife);
      (e.mesh.material as THREE.MeshBasicMaterial).opacity = a;
      e.mesh.scale.setScalar(0.5 + a * 0.5);
      if (e.life <= 0) { this._scene.remove(e.mesh); e.mesh.geometry.dispose(); (e.mesh.material as THREE.Material).dispose(); this._embers.splice(i, 1); }
    }

    // Impact rings expand and fade
    for (let i = this._impactRings.length - 1; i >= 0; i--) {
      const r = this._impactRings[i];
      r.life -= dt;
      const t = 1 - r.life / 0.5;
      r.mesh.scale.setScalar(1 + t * 8);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - t) * 0.8);
      r.mesh.lookAt(this._camera.position);
      if (r.life <= 0) { this._scene.remove(r.mesh); r.mesh.geometry.dispose(); (r.mesh.material as THREE.Material).dispose(); this._impactRings.splice(i, 1); }
    }

    // Grail sparkle ring
    if (this._grailSparkleGeo && this._grailSparkles) {
      const pos = this._grailSparkleGeo.attributes.position;
      const sparkCount = pos.count;
      for (let i = 0; i < sparkCount; i++) {
        const angle = (i / sparkCount) * Math.PI * 2 + this._totalTime * 2;
        const r = 0.4 + Math.sin(this._totalTime * 3 + i) * 0.1;
        const y = Math.sin(this._totalTime * 4 + i * 0.5) * 0.15;
        pos.setXYZ(i,
          this._grail.pos.x + Math.cos(angle) * r,
          this._grail.pos.y + y,
          this._grail.pos.z + Math.sin(angle) * r
        );
      }
      pos.needsUpdate = true;
      (this._grailSparkles.material as THREE.PointsMaterial).opacity = this._grail.inPlay ? 0.6 + Math.sin(this._totalTime * 5) * 0.2 : 0.3;
    }

    // Sword glow during swings
    for (let pi = 0; pi < 2; pi++) {
      const glow = this._swordGlowLights[pi];
      if (glow) {
        const p = this._players[pi];
        const targetIntensity = p.isSwinging ? 2.5 : 0;
        glow.intensity = THREE.MathUtils.lerp(glow.intensity, targetIntensity, 8 * dt);
      }
    }

    // Fireflies
    for (const ff of this._fireflies) {
      ff.phase += ff.speed * dt;
      ff.mesh.position.set(
        ff.pos.x + Math.sin(ff.phase * 0.7) * 1.5,
        ff.pos.y + Math.sin(ff.phase * 1.3) * 0.5,
        ff.pos.z + Math.cos(ff.phase * 0.9) * 1.5
      );
      (ff.mesh.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(ff.phase * 3) * 0.4;
    }

    // Banner wave
    for (const b of this._bannerMeshes) {
      const bPos = b.geometry.attributes.position;
      if (bPos) {
        for (let vi = 0; vi < bPos.count; vi++) {
          const x = bPos.getX(vi);
          if (x > 0) {
            bPos.setZ(vi, Math.sin(this._totalTime * 4 + x * 8) * 0.03 * x);
          }
        }
        bPos.needsUpdate = true;
      }
    }

    // Bounce rings
    for (let i = this._bounceRings.length - 1; i >= 0; i--) {
      const r = this._bounceRings[i]; r.life -= dt;
      const t = 1 - r.life / 0.4;
      r.mesh.scale.setScalar(1 + t * 5);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - t) * 0.5);
      if (r.life <= 0) { this._scene.remove(r.mesh); r.mesh.geometry.dispose(); (r.mesh.material as THREE.Material).dispose(); this._bounceRings.splice(i, 1); }
    }

    // Torch smoke
    if (Math.random() < 0.08) {
      const ti = Math.floor(Math.random() * this._torchLights.length);
      const tl = this._torchLights[ti];
      const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.15 }));
      smoke.position.set(tl.position.x + (Math.random() - 0.5) * 0.2, tl.position.y + 0.3, tl.position.z + (Math.random() - 0.5) * 0.2);
      this._scene.add(smoke);
      this._smokeParticles.push({
        mesh: smoke,
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.4 + Math.random() * 0.3, (Math.random() - 0.5) * 0.3),
        life: 2 + Math.random() * 2, maxLife: 4,
      });
    }
    for (let i = this._smokeParticles.length - 1; i >= 0; i--) {
      const s = this._smokeParticles[i];
      s.mesh.position.add(s.vel.clone().multiplyScalar(dt));
      s.mesh.scale.setScalar(1 + (1 - s.life / s.maxLife) * 3); // smoke expands
      s.life -= dt;
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (s.life / s.maxLife) * 0.12);
      if (s.life <= 0) { this._scene.remove(s.mesh); s.mesh.geometry.dispose(); (s.mesh.material as THREE.Material).dispose(); this._smokeParticles.splice(i, 1); }
    }

    // Holy beam (intensifies with rally)
    if (this._holyBeam && this._holyBeamLight) {
      const beamIntensity = this._grail.inPlay ? Math.min(1, this._rallyHits * 0.08) : 0;
      (this._holyBeam.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(
        (this._holyBeam.material as THREE.MeshBasicMaterial).opacity, beamIntensity * 0.12, 3 * dt);
      this._holyBeam.position.set(this._grail.pos.x, this._grail.pos.y + 6, this._grail.pos.z);
      this._holyBeam.rotation.y += dt * 0.5;
      this._holyBeamLight.position.set(this._grail.pos.x, 15, this._grail.pos.z);
      this._holyBeamLight.target.position.copy(this._grail.pos);
      this._holyBeamLight.intensity = THREE.MathUtils.lerp(this._holyBeamLight.intensity, beamIntensity * 3, 3 * dt);
    }
  }

  private _animateCrowdReaction(): void { for (const s of this._spectators) s.speed = 5 + Math.random() * 5; }
  private _updateCrowd(dt: number): void {
    for (const s of this._spectators) {
      s.phase += dt * s.speed; s.speed = THREE.MathUtils.lerp(s.speed, 1 + Math.random(), dt * 2);
      const b = Math.abs(Math.sin(s.phase)) * 0.08 * (s.speed / 3);
      s.mesh.position.y = s.baseY + b; s.headMesh.position.y = s.baseY + 0.4 + b;
    }
  }

  /* ---------------------------------------------------------------- */
  /*  MAIN LOOP                                                        */
  /* ---------------------------------------------------------------- */

  private _loop = (): void => {
    this._animFrame = requestAnimationFrame(this._loop);
    let dt = Math.min(this._clock.getDelta(), 0.05);
    if (this._slowMoTimer > 0) { this._slowMoTimer -= dt; dt *= this._slowMo; if (this._slowMoTimer <= 0) this._slowMo = 1.0; }
    this._totalTime += dt;
    this._update(dt); this._render(); this._renderUI();
  };

  private _update(dt: number): void {
    // Torch flicker + flames
    for (let i = 0; i < this._torchLights.length; i++) {
      this._torchLights[i].intensity = 1.2 + Math.sin(this._totalTime * 8 + this._torchLights[i].position.x) * 0.4 + Math.sin(this._totalTime * 13 + this._torchLights[i].position.z) * 0.3;
    }
    for (let i = 0; i < this._torchFlames.length; i++) {
      const f = this._torchFlames[i];
      f.scale.y = 0.8 + Math.sin(this._totalTime * 12 + i * 1.7) * 0.3;
      f.scale.x = 0.9 + Math.sin(this._totalTime * 9 + i * 2.3) * 0.15;
      f.rotation.z = Math.sin(this._totalTime * 7 + i) * 0.15;
    }
    this._updateCrowd(dt); this._updateChalkMarks(dt); this._updateShootingStars(dt);
    this._updateConfetti(dt); this._updateSwordTrails(); this._updateBats(dt);
    this._updateVisualEffects(dt);
    // Wind drift
    this._wind.lerp(this._windTarget, WIND_CHANGE_SPEED * dt);
    if (Math.random() < 0.005) this._windTarget.set((Math.random() - 0.5) * WIND_MAX * 2, (Math.random() - 0.5) * WIND_MAX * 2);

    // Net wobble
    if (this._netWobble > 0) {
      this._netWobble -= dt * 2;
      this._net.position.z = Math.sin(this._totalTime * 30) * this._netWobble * 0.05;
    } else { this._net.position.z = 0; }

    // Screen flash decay
    if (this._screenFlash > 0) this._screenFlash -= dt * 2;

    // Commentary timer
    if (this._commentaryTimer > 0) this._commentaryTimer -= dt;
    if (this._hitTimingTimer > 0) this._hitTimingTimer -= dt;

    // Herald timer
    if (this._heraldTimer > 0) this._heraldTimer -= dt;

    // Dynamic court light (rally intensity)
    if (this._courtLight) {
      const targetIntensity = this._phase === "rally" ? Math.min(2.5, this._rallyHits * 0.25) : 0;
      this._courtLight.intensity = THREE.MathUtils.lerp(this._courtLight.intensity, targetIntensity, 2 * dt);
    }

    if (this._phase === "title" || this._phase === "paused") return;

    if (this._phase === "pointScored" || this._phase === "matchOver") {
      this._pointTimer -= dt; this._messageTimer = this._pointTimer;
      if (this._phase === "matchOver" && this._trophyMesh) {
        this._trophyMesh.rotation.y += dt * 1.5;
        this._trophyMesh.position.y = 0.5 + Math.sin(this._totalTime * 2) * 0.15;
      }
      if (this._pointTimer <= 0) {
        if (this._phase === "matchOver") { this._phase = "title"; this._message = ""; this._difficultySelected = false;
          if (this._trophyMesh) { this._scene.remove(this._trophyMesh); this._trophyMesh = null; }
        } else this._resetForServe();
      }
      this._updateParticles(dt); this._updatePlayerAnimation(dt); this._updateCamera(dt); return;
    }

    // Walk to position between points
    if (this._walkPhase) {
      this._updateWalkPhase(dt);
      this._updatePlayerAnimation(dt); this._updateCamera(dt);
      return;
    }

    // Serve toss animation
    if (this._phase === "serveToss") {
      this._serveTossTimer += dt;
      const t = this._serveTossTimer / this._serveTossDuration;
      const sP = this._players[this._server];
      // Grail arcs up
      const tossY = 2.0 + Math.sin(t * Math.PI) * 2.0;
      this._grail.pos.set(sP.pos.x, tossY, sP.pos.z);
      this._grail.mesh.position.copy(this._grail.pos);
      this._grail.mesh.rotation.y += dt * 8;
      this._grail.shadow.position.set(this._grail.pos.x, 0.02, this._grail.pos.z);
      this._updatePlayerAnimation(dt); this._updateCamera(dt);
      if (this._serveTossTimer >= this._serveTossDuration) {
        this._phase = "servePower"; this._servePower = 0; this._servePowerDir = 1;
        // AI auto-serves
        if (this._server === 1) { this._servePower = 0.5 + Math.random() * 0.4; this._executeServe(1); }
      }
      return;
    }

    // Serve power meter
    if (this._phase === "servePower") {
      this._servePower += this._servePowerDir * dt * 1.8;
      if (this._servePower >= 1) { this._servePower = 1; this._servePowerDir = -1; }
      if (this._servePower <= 0) { this._servePower = 0; this._servePowerDir = 1; }
      this._audio.playServeCharge(this._servePower);
      this._serveAimX += this._mouseX * dt * 3;
      const sP = this._players[this._server];
      this._grail.pos.set(sP.pos.x, 3.5 + Math.sin(this._totalTime * 3) * 0.1, sP.pos.z);
      this._grail.mesh.position.copy(this._grail.pos);
      this._grail.shadow.position.set(this._grail.pos.x, 0.02, this._grail.pos.z);
      this._updatePlayerAnimation(dt); this._updateCamera(dt); return;
    }

    this._updatePlayer(dt); this._updateAI(dt); this._updatePlayerAnimation(dt);
    this._updateGrail(dt); this._updateParticles(dt); this._updateTrail(); this._updateCamera(dt);
    // Grail enchantment: glow intensifies with rally length
    const enchant = Math.min(1, this._rallyHits * 0.12);
    const baseScale = 0.5 + Math.sin(this._totalTime * 3) * 0.03;
    this._grail.mesh.scale.setScalar(baseScale + enchant * 0.05);
    // Update landing prediction
    this._updateLandingPrediction();
    this._audio.setCrowdExcitement(Math.min(1, this._rallyHits * 0.1));
  }

  private _updateCamera(dt: number): void {
    const p = this._players[0], g = this._grail;
    let tL: THREE.Vector3, cI: THREE.Vector3;

    // Match over replay: orbiting camera
    if (this._phase === "matchOver") {
      this._replayAngle += dt * 0.5;
      const r = 12;
      cI = new THREE.Vector3(Math.cos(this._replayAngle) * r, 5, Math.sin(this._replayAngle) * r);
      tL = new THREE.Vector3(0, 1.5, 0);
      this._camPos.lerp(cI, 2 * dt); this._camTarget.lerp(tL, 2 * dt);
      this._camera.position.copy(this._camPos); this._camera.lookAt(this._camTarget);
      return;
    }

    switch (this._camMode) {
      case CamMode.BROADCAST: {
        // Side-on TV broadcast angle
        const midZ = g.inPlay ? (p.pos.z + g.pos.z) * 0.5 : 0;
        tL = new THREE.Vector3(0, 1.5, midZ * 0.5);
        cI = new THREE.Vector3(-COURT_WIDTH - 6, 5, midZ * 0.3);
        break;
      }
      case CamMode.HIGH: {
        // Top-down overhead
        tL = new THREE.Vector3(0, 0, 0);
        cI = new THREE.Vector3(0, 22, -2);
        break;
      }
      default: {
        // Behind player, zoomed to keep both players in view
        const opp = this._players[1];
        const midX = (p.pos.x + opp.pos.x) * 0.5;
        const midZ = (p.pos.z + opp.pos.z) * 0.5;
        const spanZ = Math.abs(p.pos.z - opp.pos.z);
        const spanX = Math.abs(p.pos.x - opp.pos.x);
        // Extra pullback to fit both players: base 8 + half the court span
        const pullback = 8 + spanZ * 0.6 + spanX * 0.3;
        const extraHeight = spanZ * 0.2 + spanX * 0.15;
        tL = new THREE.Vector3(
          midX * 0.5 + (g.inPlay ? g.pos.x * 0.15 : 0),
          g.inPlay ? Math.min(g.pos.y * 0.3, 2.5) + 1 : 1.5,
          midZ * 0.5 + (g.inPlay ? g.pos.z * 0.15 : 0)
        );
        cI = new THREE.Vector3(
          midX * 0.4,
          7 + extraHeight,
          p.pos.z + p.side * (-pullback)
        );
      }
    }

    // Slow-mo zoom
    if (this._slowMoTimer > 0) {
      cI.y -= 1.5;
      const mid = new THREE.Vector3().addVectors(p.pos, g.pos).multiplyScalar(0.5);
      cI.x = THREE.MathUtils.lerp(cI.x, mid.x * 0.6, 0.5);
    }

    this._camPos.lerp(cI, 3 * dt); this._camTarget.lerp(tL, 4 * dt);
    let sx = 0, sy = 0;
    if (this._camShake > 0) { sx = (Math.random() - 0.5) * this._camShake * 0.3; sy = (Math.random() - 0.5) * this._camShake * 0.3; this._camShake -= dt * 2; }
    this._camera.position.set(this._camPos.x + sx, this._camPos.y + sy, this._camPos.z);
    this._camera.lookAt(this._camTarget);
  }

  private _render(): void { this._renderer.render(this._scene, this._camera); }

  /* ---------------------------------------------------------------- */
  /*  UI                                                               */
  /* ---------------------------------------------------------------- */

  private _renderUI(): void {
    const c = this._uiCtx, w = this._uiCanvas.width, h = this._uiCanvas.height;
    c.clearRect(0, 0, w, h);

    // Screen flash
    if (this._screenFlash > 0) {
      c.fillStyle = `rgba(255, 215, 0, ${this._screenFlash * 0.2})`;
      c.fillRect(0, 0, w, h);
    }
    // Vignette during slow-mo
    if (this._slowMoTimer > 0) {
      const vg = c.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, `rgba(0,0,0,${Math.min(0.5, this._slowMoTimer * 0.4)})`);
      c.fillStyle = vg; c.fillRect(0, 0, w, h);
    }

    if (this._phase === "title") { this._drawTitle(c, w, h); return; }
    if (this._phase === "paused") { this._drawPause(c, w, h); return; }

    this._drawScoreboard(c, w, h); this._drawMessage(c, w, h); this._drawGameInfo(c, w, h);
    if (this._phase === "servePower") this._drawServeMeter(c, w, h);
    if (this._phase === "serveToss") { c.save(); c.textAlign = "center"; c.font = `${Math.floor(w * 0.02)}px 'Times New Roman', serif`;
      c.fillStyle = "rgba(255,255,255,0.7)"; c.fillText("Tossing...", w / 2, h * 0.6); c.restore(); }
    if (this._grail.inPlay) this._drawSpeedometer(c, w, h);
    if (this._grail.inPlay && this._rallyHits > 0) this._drawRallyCounter(c, w, h);
    if (this._isMatchPoint) this._drawBanner(c, w, h, "MATCH POINT", "#ff3232", "#ff0000");
    else if (this._isSetPoint) this._drawBanner(c, w, h, "SET POINT", "#ffaa00", "#ff8800");
    if (this._commentaryTimer > 0) this._drawCommentary(c, w, h);
    if (this._hitTimingTimer > 0) this._drawHitTiming(c, w, h);
    if (this._phase === "matchOver" && this._showStats) this._drawStats(c, w, h);
    this._drawStaminaBar(c, w, h);
    this._drawWindIndicator(c, w, h);
    this._drawComboMeter(c, w, h);
    this._drawLandingPredictionUI(c, w, h);
    if (this._heraldTimer > 0) this._drawHerald(c, w, h);
    this._drawCamModeLabel(c, w, h);
    if (this._phase === "serving" && this._grail.faultCount === 1) this._drawSecondServe(c, w, h);
    this._drawMinimap(c, w, h);
  }

  private _drawTitle(c: CanvasRenderingContext2D, w: number, h: number): void {
    c.fillStyle = "rgba(0,0,0,0.65)"; c.fillRect(0, 0, w, h);
    c.save(); c.textAlign = "center"; c.textBaseline = "middle";
    // Border
    const bx = w * 0.12, by = h * 0.08, bw = w * 0.76, bh = h * 0.84;
    c.strokeStyle = "#ffd70044"; c.lineWidth = 2; c.beginPath(); c.roundRect(bx, by, bw, bh, 12); c.stroke();
    c.strokeStyle = "#ffd70022"; c.beginPath(); c.roundRect(bx + 6, by + 6, bw - 12, bh - 12, 10); c.stroke();
    // Title
    c.shadowColor = "#ffd700"; c.shadowBlur = 40;
    c.font = `bold ${Math.floor(w * 0.07)}px 'Times New Roman', serif`; c.fillStyle = "#ffd700";
    c.fillText("HOLY TENNIS", w / 2, h * 0.2); c.shadowBlur = 0;
    c.font = `italic ${Math.floor(w * 0.02)}px 'Times New Roman', serif`; c.fillStyle = "#ccaa77";
    c.fillText("Seek ye the Holy Grail upon the Court of Honour", w / 2, h * 0.28);
    c.font = `${Math.floor(w * 0.04)}px serif`; c.fillStyle = "#aabbcc"; c.fillText("\u2694", w / 2, h * 0.36);

    // Difficulty selection
    c.font = `bold ${Math.floor(w * 0.02)}px 'Times New Roman', serif`; c.fillStyle = "#ffd700";
    c.fillText("Choose thy Challenge", w / 2, h * 0.44);
    const diffs = [["1", "SQUIRE", "(Easy)", 0x44ff44], ["2", "KNIGHT", "(Medium)", 0xffaa00], ["3", "KING", "(Hard)", 0xff4444]] as const;
    for (let i = 0; i < 3; i++) {
      const y = h * 0.50 + i * h * 0.042;
      const sel = this._difficulty === i;
      c.font = `${sel ? "bold " : ""}${Math.floor(w * 0.016)}px 'Courier New', monospace`;
      c.fillStyle = sel ? "#ffd700" : "#888888";
      c.fillText(`[${diffs[i][0]}]  ${diffs[i][1]}  ${diffs[i][2]}${sel ? "  \u25C0" : ""}`, w / 2, y);
    }

    // Controls
    c.font = `${Math.floor(w * 0.013)}px 'Courier New', monospace`;
    const ctrls = [["WASD/Arrows","Move"],["Shift","Sprint"],["Space/Click","Flat"],["K","Lob"],["L","Drop"],["I","Power"],["C","Camera"],["P","Pause"],["ESC","Exit"]];
    const sY = h * 0.64;
    for (let i = 0; i < ctrls.length; i++) {
      const y = sY + i * h * 0.028;
      c.textAlign = "right"; c.fillStyle = "#ffd700"; c.fillText(ctrls[i][0], w / 2 - 10, y);
      c.textAlign = "left"; c.fillStyle = "#aaaaaa"; c.fillText(ctrls[i][1], w / 2 + 10, y);
    }

    const pulse = 0.4 + Math.sin(this._totalTime * 3) * 0.6;
    c.textAlign = "center"; c.font = `bold ${Math.floor(w * 0.02)}px 'Times New Roman', serif`;
    c.fillStyle = `rgba(255,215,0,${pulse})`;
    c.fillText("Press SPACE, CLICK, or choose difficulty to begin", w / 2, h * 0.93);
    c.restore();
  }

  private _drawPause(c: CanvasRenderingContext2D, w: number, h: number): void {
    c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(0, 0, w, h);
    c.save(); c.textAlign = "center"; c.textBaseline = "middle";
    c.shadowColor = "#ffd700"; c.shadowBlur = 20;
    c.font = `bold ${Math.floor(w * 0.05)}px 'Times New Roman', serif`; c.fillStyle = "#ffd700";
    c.fillText("PAUSED", w / 2, h * 0.45);
    c.shadowBlur = 0;
    c.font = `${Math.floor(w * 0.018)}px 'Times New Roman', serif`; c.fillStyle = "#cccccc";
    c.fillText("Press P to resume", w / 2, h * 0.55);
    c.restore();
  }

  private _drawScoreboard(c: CanvasRenderingContext2D, w: number, _h: number): void {
    const sW = Math.min(480, w * 0.42), sH = 86, sX = (w - sW) / 2, sY = 10;
    c.fillStyle = "rgba(8,6,18,0.88)"; c.beginPath(); c.roundRect(sX, sY, sW, sH, 6); c.fill();
    c.strokeStyle = "#ffd70055"; c.lineWidth = 1.5; c.beginPath(); c.roundRect(sX, sY, sW, sH, 6); c.stroke();
    c.save(); c.textBaseline = "middle";
    const fs = Math.floor(sW * 0.04), sf = Math.floor(sW * 0.03);
    const cN = sX + 10, nSP = this._games.length, cW = 32, cPX = sX + sW - 50;
    const cS: number[] = []; for (let s = 0; s < Math.max(nSP, 3); s++) cS.push(cPX - (Math.max(nSP, 3) - s) * cW);
    c.fillStyle = "#777"; c.font = `${sf}px 'Courier New', monospace`; c.textAlign = "center";
    for (let s = 0; s < Math.max(nSP, 3); s++) c.fillText(`S${s + 1}`, cS[s], sY + 17);
    c.fillText("PTS", cPX, sY + 17);
    const names = ["SIR YOU", "SIR OPP"], cols = ["#4488ff", "#ff4444"];
    for (let pi = 0; pi < 2; pi++) {
      const rY = sY + 36 + pi * 22;
      c.font = `bold ${fs}px 'Courier New', monospace`; c.textAlign = "left";
      if (this._server === pi) { c.fillStyle = "#ffd700"; c.fillText("\u25CF", cN, rY); }
      c.fillStyle = cols[pi]; c.fillText(names[pi], cN + 14, rY);
      c.textAlign = "center";
      for (let s = 0; s < nSP; s++) { c.fillStyle = s === this._currentSet ? "#fff" : "#555"; c.fillText(String(this._games[s][pi]), cS[s], rY); }
      for (let s = nSP; s < 3; s++) { c.fillStyle = "#333"; c.fillText("-", cS[s], rY); }
      c.fillStyle = "#ffd700"; c.font = `bold ${fs}px 'Courier New', monospace`;
      const pts0 = this._points[0], pts1 = this._points[1];
      let ptStr: string;
      if (this._isTiebreak) ptStr = String(this._tiebreakPoints[pi]);
      else if (pts0 >= 3 && pts1 >= 3) { if (pts0 === pts1) ptStr = "40"; else if (pi === 0 && pts0 > pts1) ptStr = "AD"; else if (pi === 1 && pts1 > pts0) ptStr = "AD"; else ptStr = "40"; }
      else ptStr = POINT_NAMES[Math.min(this._points[pi], 3)];
      c.fillText(ptStr, cPX, rY);
    }
    c.restore();
  }

  private _drawMessage(c: CanvasRenderingContext2D, w: number, h: number): void {
    if (!this._message) return;
    c.save(); c.textAlign = "center"; c.textBaseline = "middle";
    const fs = Math.floor(w * 0.032); c.font = `bold ${fs}px 'Times New Roman', serif`;
    const mt = c.measureText(this._message), mW = mt.width + 40, mH = fs + 20;
    c.fillStyle = "rgba(8,4,18,0.82)"; c.beginPath(); c.roundRect((w - mW) / 2, h * 0.45 - mH / 2, mW, mH, 8); c.fill();
    c.strokeStyle = "#ffd70044"; c.lineWidth = 1; c.beginPath(); c.roundRect((w - mW) / 2, h * 0.45 - mH / 2, mW, mH, 8); c.stroke();
    c.shadowColor = "#ffd700"; c.shadowBlur = 15; c.fillStyle = "#ffd700"; c.fillText(this._message, w / 2, h * 0.45);
    c.restore();
  }

  private _drawGameInfo(c: CanvasRenderingContext2D, w: number, h: number): void {
    if (this._phase === "serving" && this._server === 0 && this._serveReady) {
      c.save(); c.textAlign = "center"; c.textBaseline = "middle";
      c.font = `${Math.floor(w * 0.018)}px 'Times New Roman', serif`;
      const p = 0.5 + Math.sin(this._totalTime * 4) * 0.5;
      c.fillStyle = `rgba(255,255,255,${p})`; c.fillText("Press SPACE to serve", w / 2, h * 0.6); c.restore();
    }
    c.save(); c.textAlign = "right"; c.font = `${Math.floor(w * 0.011)}px 'Courier New', monospace`;
    c.fillStyle = "rgba(136,136,136,0.5)";
    const diff = ["Squire", "Knight", "King"][this._difficulty];
    c.fillText(`${diff} | ${this._serveSide === "deuce" ? "Deuce" : "Ad"} Court | Faults: ${this._grail.faultCount} | Rally: ${this._rallyHits}`, w - 15, h - 15);
    c.restore();
  }

  private _drawServeMeter(c: CanvasRenderingContext2D, w: number, h: number): void {
    const bW = 200, bH = 20, bX = (w - bW) / 2, bY = h * 0.7;
    c.fillStyle = "rgba(0,0,0,0.7)"; c.beginPath(); c.roundRect(bX - 5, bY - 5, bW + 10, bH + 10, 4); c.fill();
    const gr = c.createLinearGradient(bX, 0, bX + bW, 0);
    gr.addColorStop(0, "#44ff44"); gr.addColorStop(0.5, "#ffff00"); gr.addColorStop(0.8, "#ff8800"); gr.addColorStop(1, "#ff0000");
    c.fillStyle = gr; c.beginPath(); c.roundRect(bX, bY, bW * this._servePower, bH, 3); c.fill();
    c.strokeStyle = "#fff5"; c.lineWidth = 1; c.beginPath(); c.roundRect(bX, bY, bW, bH, 3); c.stroke();
    c.fillStyle = "#fff"; c.fillRect(bX + bW * 0.75 - 1, bY - 2, 2, bH + 4);
    c.textAlign = "center"; c.font = "bold 14px 'Courier New', monospace"; c.fillStyle = "#fff";
    c.fillText("POWER", w / 2, bY - 12); c.fillText(`${Math.floor(this._servePower * 100)}%`, w / 2, bY + bH + 16);
  }

  private _drawSpeedometer(c: CanvasRenderingContext2D, _w: number, _h: number): void {
    const kmh = Math.floor(this._grail.speed * 3.6);
    c.save(); c.textAlign = "left"; c.font = "bold 14px 'Courier New', monospace";
    c.fillStyle = kmh > 70 ? "#ff4444" : kmh > 50 ? "#ffaa00" : "#44ff44";
    c.fillText(`${kmh} km/h`, 15, 110); c.restore();
  }

  private _drawRallyCounter(c: CanvasRenderingContext2D, _w: number, _h: number): void {
    c.save(); c.textAlign = "left"; c.font = "bold 16px 'Courier New', monospace";
    c.fillStyle = this._rallyHits > 10 ? "#ffd700" : this._rallyHits > 5 ? "#ffaa44" : "#aaa";
    c.fillText(`Rally: ${this._rallyHits}`, 15, 130); c.restore();
  }

  private _drawBanner(c: CanvasRenderingContext2D, w: number, h: number, text: string, col: string, glow: string): void {
    const p = 0.6 + Math.sin(this._totalTime * 4) * 0.4;
    c.save(); c.textAlign = "center"; c.font = `bold ${Math.floor(w * 0.02)}px 'Times New Roman', serif`;
    c.fillStyle = col.replace(")", `,${p})`).replace("rgb", "rgba");
    c.shadowColor = glow; c.shadowBlur = 10;
    c.fillText(text, w / 2, h * 0.12); c.restore();
  }

  private _drawCommentary(c: CanvasRenderingContext2D, w: number, h: number): void {
    const a = Math.min(1, this._commentaryTimer);
    c.save(); c.textAlign = "center"; c.textBaseline = "middle";
    c.font = `italic ${Math.floor(w * 0.016)}px 'Times New Roman', serif`;
    c.fillStyle = `rgba(204,170,119,${a})`; c.fillText(this._commentary, w / 2, h * 0.38);
    c.restore();
  }

  private _drawHitTiming(c: CanvasRenderingContext2D, w: number, h: number): void {
    const a = Math.min(1, this._hitTimingTimer * 2);
    const isPerfect = this._hitTimingMsg === "PERFECT!";
    c.save(); c.textAlign = "center"; c.textBaseline = "middle";
    c.font = `bold ${Math.floor(w * (isPerfect ? 0.025 : 0.018))}px 'Courier New', monospace`;
    c.fillStyle = isPerfect ? `rgba(255,215,0,${a})` : this._hitTimingMsg === "Good" ? `rgba(100,255,100,${a})` : `rgba(255,100,100,${a})`;
    if (isPerfect) { c.shadowColor = "#ffd700"; c.shadowBlur = 10; }
    c.fillText(this._hitTimingMsg, w / 2, h * 0.55); c.restore();
  }

  private _drawStats(c: CanvasRenderingContext2D, w: number, h: number): void {
    const stats: [string, number[]][] = [
      ["Aces", [...this._stats.aces]], ["Winners", [...this._stats.winners]], ["Errors", [...this._stats.errors]],
      ["Perfect Hits", [...this._stats.perfectHits]], ["Max Combo", [...this._stats.maxCombo]],
      ["Max Serve km/h", [...this._stats.maxServeSpeed]], ["Points Won", [...this._stats.totalPoints]],
      ["Longest Rally", [this._stats.longestRally, this._stats.longestRally]],
    ];
    const sW = 400, sH = 50 + stats.length * 26 + 25, sX = (w - sW) / 2, sY = (h - sH) / 2;
    c.fillStyle = "rgba(5,3,15,0.92)"; c.beginPath(); c.roundRect(sX, sY, sW, sH, 8); c.fill();
    c.strokeStyle = "#ffd70066"; c.lineWidth = 1; c.beginPath(); c.roundRect(sX, sY, sW, sH, 8); c.stroke();
    c.save(); c.textAlign = "center"; c.font = "bold 18px 'Times New Roman', serif"; c.fillStyle = "#ffd700";
    c.fillText("MATCH STATISTICS", w / 2, sY + 25);
    // Column headers
    c.font = "bold 12px 'Courier New', monospace";
    c.textAlign = "right"; c.fillStyle = "#4488ff"; c.fillText("YOU", sX + 85, sY + 42);
    c.textAlign = "left"; c.fillStyle = "#ff4444"; c.fillText("OPP", sX + sW - 85, sY + 42);
    c.font = "14px 'Courier New', monospace";
    for (let i = 0; i < stats.length; i++) {
      const y = sY + 58 + i * 26;
      c.textAlign = "right"; c.fillStyle = "#4488ff"; c.fillText(String(stats[i][1][0]), sX + 85, y);
      c.textAlign = "center"; c.fillStyle = "#888"; c.fillText(stats[i][0], w / 2, y);
      c.textAlign = "left"; c.fillStyle = "#ff4444"; c.fillText(String(stats[i][1][1]), sX + sW - 85, y);
    }
    c.textAlign = "center"; c.fillStyle = "#666"; c.font = "12px 'Courier New', monospace";
    c.fillText("Press TAB to toggle", w / 2, sY + sH - 12); c.restore();
  }

  private _drawStaminaBar(c: CanvasRenderingContext2D, _w: number, _h: number): void {
    const p = this._players[0];
    const bX = 15, bY = 150, bW = 80, bH = 8;
    c.save();
    c.fillStyle = "rgba(0,0,0,0.5)"; c.beginPath(); c.roundRect(bX - 1, bY - 1, bW + 2, bH + 2, 3); c.fill();
    const stam = p.stamina;
    const col = stam > 0.5 ? "#44ff44" : stam > 0.2 ? "#ffaa00" : "#ff4444";
    c.fillStyle = col; c.beginPath(); c.roundRect(bX, bY, bW * stam, bH, 2); c.fill();
    c.font = "10px 'Courier New', monospace"; c.fillStyle = "#aaa"; c.textAlign = "left";
    c.fillText("STAMINA", bX, bY - 4);
    c.restore();
  }

  private _drawWindIndicator(c: CanvasRenderingContext2D, w: number, _h: number): void {
    const wStr = Math.sqrt(this._wind.x * this._wind.x + this._wind.y * this._wind.y);
    if (wStr < 0.2) return;
    const cx = w - 90, cy = 115, r = 18;
    c.save();
    c.fillStyle = "rgba(0,0,0,0.4)"; c.beginPath(); c.arc(cx, cy, r + 4, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "rgba(255,255,255,0.2)"; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    // Wind arrow
    const angle = Math.atan2(this._wind.y, this._wind.x);
    const len = Math.min(r - 2, (wStr / WIND_MAX) * r);
    const ex = cx + Math.cos(angle) * len, ey = cy + Math.sin(angle) * len;
    c.strokeStyle = wStr > 2 ? "#ff6644" : wStr > 1 ? "#ffaa44" : "#88ccff";
    c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(ex, ey); c.stroke();
    // Arrowhead
    const ah = 5;
    c.beginPath();
    c.moveTo(ex, ey);
    c.lineTo(ex - Math.cos(angle - 0.5) * ah, ey - Math.sin(angle - 0.5) * ah);
    c.moveTo(ex, ey);
    c.lineTo(ex - Math.cos(angle + 0.5) * ah, ey - Math.sin(angle + 0.5) * ah);
    c.stroke();
    c.font = "9px 'Courier New', monospace"; c.fillStyle = "#aaa"; c.textAlign = "center";
    c.fillText("WIND", cx, cy + r + 14);
    c.restore();
  }

  private _drawComboMeter(c: CanvasRenderingContext2D, _w: number, _h: number): void {
    const p = this._players[0];
    if (p.comboCount < 2) return;
    c.save();
    c.textAlign = "left"; c.font = "bold 14px 'Courier New', monospace";
    const glow = p.comboCount >= 5;
    if (glow) { c.shadowColor = "#ffd700"; c.shadowBlur = 8; }
    c.fillStyle = p.comboCount >= 5 ? "#ffd700" : p.comboCount >= 3 ? "#ff8844" : "#88ff88";
    c.fillText(`COMBO x${p.comboCount}`, 15, 170);
    // Combo bar
    const barW = Math.min(80, p.comboCount * 16);
    c.fillStyle = p.comboCount >= 5 ? "rgba(255,215,0,0.5)" : "rgba(255,136,68,0.3)";
    c.fillRect(15, 175, barW, 4);
    c.restore();
  }

  private _drawLandingPredictionUI(c: CanvasRenderingContext2D, w: number, h: number): void {
    if (!this._predictedLanding || !this._grail.inPlay) return;
    // Project predicted landing point to screen space
    const landing = this._predictedLanding.clone();
    landing.project(this._camera);
    const sx = (landing.x * 0.5 + 0.5) * w;
    const sy = (-landing.y * 0.5 + 0.5) * h;
    if (landing.z > 1 || landing.z < 0) return; // behind camera
    // Crosshair at landing point
    const inB = this._isInBounds(this._predictedLanding.x, this._predictedLanding.z);
    const col = inB ? "rgba(100,255,100,0.35)" : "rgba(255,80,80,0.35)";
    c.save();
    c.strokeStyle = col; c.lineWidth = 1.5;
    c.beginPath(); c.arc(sx, sy, 12, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(sx - 16, sy); c.lineTo(sx + 16, sy); c.moveTo(sx, sy - 16); c.lineTo(sx, sy + 16); c.stroke();
    // Dotted arc prediction
    if (this._predictionArc.length > 1) {
      c.strokeStyle = "rgba(255,215,0,0.15)"; c.lineWidth = 1; c.setLineDash([3, 6]);
      c.beginPath();
      for (let i = 0; i < this._predictionArc.length; i++) {
        const p = this._predictionArc[i].clone().project(this._camera);
        if (p.z > 1 || p.z < 0) continue;
        const px = (p.x * 0.5 + 0.5) * w, py = (-p.y * 0.5 + 0.5) * h;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.stroke(); c.setLineDash([]);
    }
    c.restore();
  }

  private _drawHerald(c: CanvasRenderingContext2D, w: number, h: number): void {
    const a = Math.min(1, this._heraldTimer * 0.6);
    c.save(); c.textAlign = "center"; c.textBaseline = "middle";
    // Background ribbon
    const rW = Math.min(400, w * 0.35), rH = 36;
    const rX = (w - rW) / 2, rY = h * 0.16;
    c.fillStyle = `rgba(80, 30, 10, ${a * 0.75})`;
    c.beginPath(); c.roundRect(rX, rY, rW, rH, 4); c.fill();
    c.strokeStyle = `rgba(255, 215, 0, ${a * 0.4})`;
    c.lineWidth = 1; c.beginPath(); c.roundRect(rX, rY, rW, rH, 4); c.stroke();
    // Herald icon
    c.font = `${Math.floor(w * 0.014)}px serif`;
    c.fillStyle = `rgba(255, 215, 0, ${a})`;
    c.fillText("\u266A", rX + 20, rY + rH / 2);
    // Score text
    c.font = `bold ${Math.floor(w * 0.016)}px 'Times New Roman', serif`;
    c.fillStyle = `rgba(255, 230, 180, ${a})`;
    c.fillText(this._heraldMsg, w / 2, rY + rH / 2);
    c.restore();
  }

  private _drawCamModeLabel(c: CanvasRenderingContext2D, w: number, _h: number): void {
    const labels = ["Behind", "Broadcast", "Overhead"];
    c.save(); c.textAlign = "left"; c.font = "10px 'Courier New', monospace";
    c.fillStyle = "rgba(136,136,136,0.4)";
    c.fillText(`CAM: ${labels[this._camMode]} [C]`, 15, 195);
    c.restore();
  }

  private _drawSecondServe(c: CanvasRenderingContext2D, w: number, h: number): void {
    const pulse = 0.5 + Math.sin(this._totalTime * 5) * 0.5;
    c.save(); c.textAlign = "center"; c.textBaseline = "middle";
    c.font = `bold ${Math.floor(w * 0.016)}px 'Courier New', monospace`;
    c.fillStyle = `rgba(255, 170, 50, ${pulse})`;
    c.fillText("SECOND SERVE", w / 2, h * 0.64);
    c.restore();
  }

  private _drawMinimap(c: CanvasRenderingContext2D, w: number, h: number): void {
    const mW = 70, mH = 100, mX = w - mW - 15, mY = h - mH - 30;
    const scX = mW / COURT_WIDTH, scZ = mH / COURT_LENGTH;
    c.fillStyle = "rgba(0,0,0,0.5)"; c.beginPath(); c.roundRect(mX - 2, mY - 2, mW + 4, mH + 4, 4); c.fill();
    c.fillStyle = "rgba(45,106,30,0.6)"; c.fillRect(mX, mY, mW, mH);
    c.strokeStyle = "rgba(255,255,255,0.3)"; c.lineWidth = 0.5; c.strokeRect(mX, mY, mW, mH);
    c.strokeStyle = "rgba(255,255,255,0.5)"; c.beginPath(); c.moveTo(mX, mY + mH / 2); c.lineTo(mX + mW, mY + mH / 2); c.stroke();
    c.strokeStyle = "rgba(255,255,255,0.2)"; c.beginPath();
    c.moveTo(mX, mY + mH / 2 - SERVICE_LINE * scZ); c.lineTo(mX + mW, mY + mH / 2 - SERVICE_LINE * scZ);
    c.moveTo(mX, mY + mH / 2 + SERVICE_LINE * scZ); c.lineTo(mX + mW, mY + mH / 2 + SERVICE_LINE * scZ); c.stroke();
    for (let i = 0; i < 2; i++) {
      const p = this._players[i];
      c.fillStyle = i === 0 ? "#4488ff" : "#ff4444"; c.beginPath();
      c.arc(mX + mW / 2 + p.pos.x * scX, mY + mH / 2 + p.pos.z * scZ, 3, 0, Math.PI * 2); c.fill();
    }
    if (this._grail.inPlay) {
      c.fillStyle = "#ffd700"; c.beginPath();
      c.arc(mX + mW / 2 + this._grail.pos.x * scX, mY + mH / 2 + this._grail.pos.z * scZ, 2.5, 0, Math.PI * 2); c.fill();
      // Predicted landing on minimap
      if (this._predictedLanding) {
        const lx = mX + mW / 2 + this._predictedLanding.x * scX;
        const lz = mY + mH / 2 + this._predictedLanding.z * scZ;
        c.strokeStyle = "rgba(255,215,0,0.5)"; c.lineWidth = 1;
        c.beginPath(); c.arc(lx, lz, 3, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.moveTo(lx - 4, lz); c.lineTo(lx + 4, lz); c.moveTo(lx, lz - 4); c.lineTo(lx, lz + 4); c.stroke();
      }
    }
  }
}
