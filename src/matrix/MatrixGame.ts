/**
 * MATRIX — 3D Bullet-Time Dodge Arena
 *
 * Trapped in Morgan le Fay's simulation. Enemies fire projectiles — slow
 * time, dodge, deflect, and chain combos for style. Survive the waves.
 *
 * Controls:
 *   W/A/S/D     — move / dodge
 *   Mouse       — look (pointer lock)
 *   LMB         — sword slash / deflect
 *   RMB / SHIFT — activate bullet time
 *   SPACE       — dodge roll
 *   ESC         — pause
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// ─── constants ───────────────────────────────────────────────────────────────

const ARENA_RADIUS = 25;
const PLAYER_SPEED = 10;
const DODGE_SPEED = 22;
const DODGE_DURATION = 0.35;
const DODGE_COOLDOWN = 0.6;
const MOUSE_SENS = 0.002;
const PLAYER_HP = 100;

// bullet time
const BT_SLOW_FACTOR = 0.18; // world runs at 18% speed
const BT_MAX_ENERGY = 100;
const BT_DRAIN_DEFAULT = 30; void BT_DRAIN_DEFAULT; // used via difficulty
const BT_REGEN = 12; // per second when off
const BT_MIN_ACTIVATE = 15;

// projectiles
const ARROW_SPEED = 18;
const FIREBALL_SPEED = 12;
const AXE_SPEED = 14;
const PROJ_DAMAGE = 15;
const NEAR_MISS_DIST = 1.5;
const DEFLECT_DIST = 2.0;
const DEFLECT_ANGLE = 0.7; // radians cone

// scoring
const SCORE_DODGE = 50;
const SCORE_NEAR_MISS = 150;
const SCORE_DEFLECT = 200;
const SCORE_KILL = 100;
const COMBO_MULT_MAX = 8;
const COMBO_DECAY = 2.0; // seconds until combo resets

// waves
const WAVE_BASE_ENEMIES = 4;
const WAVE_ENEMY_GROWTH = 2;
const WAVE_BREAK = 3; // seconds between waves
const ENEMY_HP = 30;

// difficulty
type MatrixDifficulty = "recruit" | "agent" | "one";
const MATRIX_DIFFICULTY: Record<MatrixDifficulty, { label: string; hpMult: number; speedMult: number; fireMult: number; btDrain: number; desc: string }> = {
  recruit: { label: "RECRUIT", hpMult: 1.5, speedMult: 0.7, fireMult: 1.5, btDrain: 20, desc: "Slower projectiles, more HP, cheaper BT" },
  agent:   { label: "AGENT",   hpMult: 1.0, speedMult: 1.0, fireMult: 1.0, btDrain: 30, desc: "Standard challenge" },
  one:     { label: "THE ONE", hpMult: 0.7, speedMult: 1.3, fireMult: 0.7, btDrain: 40, desc: "Faster, harder, relentless" },
};

// ─── types ───────────────────────────────────────────────────────────────────

type Phase = "title" | "countdown" | "playing" | "wave_break" | "dead" | "paused";
type ProjectileType = "arrow" | "fireball" | "axe";

interface Projectile {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  type: ProjectileType;
  alive: boolean;
  trail: THREE.Mesh[];
}

interface Enemy {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  hp: number;
  angle: number;
  fireTimer: number;
  fireRate: number;
  type: ProjectileType;
  alive: boolean;
  hitFlash: number;
}

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

// ─── digital rain character set ──────────────────────────────────────────────

const RAIN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+-=<>(){}[]|/\\~^";

// ─── main game class ─────────────────────────────────────────────────────────

export class MatrixGame {
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
  private _gameTime = 0;
  private _timeScale = 1.0;
  private _pausedPhase: Phase = "playing";

  // player
  private _playerPos = new THREE.Vector3(0, 1, 0);
  private _playerAngle = 0;
  private _playerPitch = 0;
  private _playerHP = PLAYER_HP;
  private _playerMesh!: THREE.Group;
  private _dodgeTimer = 0;
  private _dodgeCooldown = 0;
  private _dodgeDir = new THREE.Vector3();
  private _slashing = false;
  private _slashTimer = 0;
  private _invulnTimer = 0;

  // bullet time
  private _btActive = false;
  private _btEnergy = BT_MAX_ENERGY;

  // combat
  private _projectiles: Projectile[] = [];
  private _enemies: Enemy[] = [];
  private _particles: Particle[] = [];

  // waves
  private _wave = 0;
  private _waveTimer = 0;
  private _enemiesRemaining = 0;

  // scoring
  private _score = 0;
  private _combo = 0;
  private _comboTimer = 0;
  private _maxCombo = 0;
  private _totalDeflects = 0;
  private _totalNearMisses = 0;
  private _totalDodges = 0;

  // digital rain overlay
  private _rainCanvas!: HTMLCanvasElement;
  private _rainCtx!: CanvasRenderingContext2D;
  private _rainDrops: { x: number; y: number; speed: number; chars: string; len: number }[] = [];

  // input
  private _keys = new Set<string>();
  private _mouseDown = { left: false, right: false };
  private _onKeyDown!: (e: KeyboardEvent) => void;
  private _onKeyUp!: (e: KeyboardEvent) => void;
  private _onMouseMove!: (e: MouseEvent) => void;
  private _onMouseDown!: (e: MouseEvent) => void;
  private _onMouseUp!: (e: MouseEvent) => void;
  private _onResize!: () => void;

  // HUD
  private _hud!: HTMLDivElement;
  private _hudHP!: HTMLDivElement;
  private _hudBT!: HTMLDivElement;
  private _hudScore!: HTMLDivElement;
  private _hudCombo!: HTMLDivElement;
  private _hudWave!: HTMLDivElement;
  private _hudCenter!: HTMLDivElement;

  // difficulty
  private _difficulty: MatrixDifficulty = "agent";

  // death sequence
  private _deathSequenceTimer = 0;
  private _deathSequenceActive = false;

  // BT warp visual
  private _btWarpOverlay!: HTMLDivElement;

  // visual effects
  private _damageFlashTimer = 0;
  private _cameraShake = 0;
  private _dodgeTrails: THREE.Mesh[] = [];
  private _scorePopups: { el: HTMLDivElement; timer: number }[] = [];
  private _healthPickups: { mesh: THREE.Mesh; pos: THREE.Vector3 }[] = [];

  // high score
  private _highScore = 0;

  // ambient
  private _droneOsc: OscillatorNode | null = null;
  private _droneGain: GainNode | null = null;

  // audio
  private _audioCtx: AudioContext | null = null;

  // ── public API ─────────────────────────────────────────────────────────────

  async boot(): Promise<void> {
    this._initThree();
    this._buildHUD();
    this._buildDigitalRain();
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
    window.removeEventListener("mouseup", this._onMouseUp);
    window.removeEventListener("resize", this._onResize);
    if (this._hud?.parentNode) this._hud.parentNode.removeChild(this._hud);
    if (this._rainCanvas?.parentNode) this._rainCanvas.parentNode.removeChild(this._rainCanvas);
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
    this._renderer.toneMappingExposure = 0.7;

    this._scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 200);

    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(new RenderPass(this._scene, this._camera));
    this._bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.8, 0.4, 0.7);
    this._composer.addPass(this._bloomPass);
    this._composer.addPass(new OutputPass());
  }

  // ── digital rain overlay ───────────────────────────────────────────────────

  private _buildDigitalRain(): void {
    this._rainCanvas = document.createElement("canvas");
    this._rainCanvas.width = window.innerWidth;
    this._rainCanvas.height = window.innerHeight;
    this._rainCanvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;pointer-events:none;opacity:0;transition:opacity 0.5s;mix-blend-mode:screen;";
    document.getElementById("pixi-container")!.appendChild(this._rainCanvas);
    this._rainCtx = this._rainCanvas.getContext("2d")!;

    // init rain columns
    const cols = Math.floor(this._rainCanvas.width / 14);
    for (let i = 0; i < cols; i++) {
      this._rainDrops.push({
        x: i * 14, y: Math.random() * this._rainCanvas.height,
        speed: 2 + Math.random() * 4,
        chars: "", len: 5 + Math.floor(Math.random() * 15),
      });
      // fill with random chars
      let s = "";
      for (let j = 0; j < 20; j++) s += RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)];
      this._rainDrops[i].chars = s;
    }
  }

  private _updateDigitalRain(): void {
    const ctx = this._rainCtx;
    const w = this._rainCanvas.width, h = this._rainCanvas.height;

    // fade previous frame
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(0, 0, w, h);

    ctx.font = "12px monospace";

    for (const drop of this._rainDrops) {
      drop.y += drop.speed * (this._btActive ? 0.3 : 1);
      if (drop.y > h + 200) {
        drop.y = -100;
        drop.speed = 2 + Math.random() * 4;
      }

      for (let j = 0; j < drop.len; j++) {
        const cy = drop.y - j * 14;
        if (cy < 0 || cy > h) continue;
        const alpha = 1 - j / drop.len;
        const charIdx = (Math.floor(this._time * 3) + j) % drop.chars.length;
        if (j === 0) {
          ctx.fillStyle = `rgba(180,255,180,${alpha * 0.9})`;
        } else {
          ctx.fillStyle = `rgba(0,${Math.floor(180 + alpha * 75)},0,${alpha * 0.5})`;
        }
        ctx.fillText(drop.chars[charIdx], drop.x, cy);
      }
    }

    // show rain when bullet time is active or on title
    this._rainCanvas.style.opacity = (this._btActive || this._phase === "title") ? "0.3" : "0.06";
  }

  // ── input ──────────────────────────────────────────────────────────────────

  private _bindInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      this._keys.add(k);

      if (k === "escape") {
        if (this._phase === "title") { window.dispatchEvent(new Event("matrixExit")); return; }
        if (this._phase === "playing" || this._phase === "wave_break") {
          this._pausedPhase = this._phase;
          this._phase = "paused";
          this._hudCenter.innerHTML =
            `<div style="background:rgba(0,0,0,0.85);border:1px solid rgba(0,255,0,0.3);border-radius:8px;padding:20px 25px;">` +
            `<div style="font-size:22px;color:#0f0;letter-spacing:3px;text-align:center;">PAUSED</div>` +
            `<div style="border-top:1px solid rgba(0,255,0,0.15);margin:10px 0;"></div>` +
            `<div style="font-size:11px;color:#0a0;line-height:2;">` +
            `Wave: <span style="color:#0f0;">${this._wave}</span> · Enemies: <span style="color:#0f0;">${this._enemiesRemaining}</span><br>` +
            `Score: <span style="color:#0f0;">${this._score}</span> · Combo: <span style="color:#0f0;">${this._combo}x</span><br>` +
            `HP: <span style="color:#0f0;">${Math.ceil(this._playerHP)}%</span> · BT: <span style="color:#0f0;">${Math.ceil(this._btEnergy)}%</span><br>` +
            `Deflects: <span style="color:#0f0;">${this._totalDeflects}</span> · Near Misses: <span style="color:#0f0;">${this._totalNearMisses}</span></div>` +
            `<div style="border-top:1px solid rgba(0,255,0,0.15);margin:10px 0;"></div>` +
            `<div style="font-size:12px;color:#080;text-align:center;">[ESC] Resume · [Q] Quit</div></div>`;
          if (document.pointerLockElement) document.exitPointerLock();
        } else if (this._phase === "paused") {
          this._phase = this._pausedPhase;
          this._hudCenter.textContent = "";
          this._canvas.requestPointerLock();
        } else if (this._phase === "dead") {
          window.dispatchEvent(new Event("matrixExit"));
        }
      }
      if (k === "q" && this._phase === "paused") this._showTitle();
      if ((k === "enter" || k === " ") && this._phase === "title") this._startGame();
      if ((k === "enter" || k === " ") && this._phase === "dead") this._startGame();
      if (this._phase === "title") {
        if (k === "1") { this._difficulty = "recruit"; this._showTitle(); }
        if (k === "2") { this._difficulty = "agent"; this._showTitle(); }
        if (k === "3") { this._difficulty = "one"; this._showTitle(); }
      }
      if (k === " " && (this._phase === "playing" || this._phase === "wave_break")) this._dodgeRoll();
    };

    this._onKeyUp = (e: KeyboardEvent) => { this._keys.delete(e.key.toLowerCase()); };

    this._onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== this._canvas) return;
      this._playerAngle -= e.movementX * MOUSE_SENS;
      this._playerPitch = Math.max(-1.2, Math.min(1.2, this._playerPitch - e.movementY * MOUSE_SENS));
    };

    this._onMouseDown = (e: MouseEvent) => {
      if (this._phase === "playing" || this._phase === "wave_break") {
        if (document.pointerLockElement !== this._canvas) { this._canvas.requestPointerLock(); return; }
        if (e.button === 0) { this._mouseDown.left = true; this._swordSlash(); }
        if (e.button === 2) this._mouseDown.right = true;
      }
    };

    this._onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) this._mouseDown.left = false;
      if (e.button === 2) this._mouseDown.right = false;
    };

    this._onResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      this._camera.aspect = w / h;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(w, h);
      this._composer.setSize(w, h);
      this._rainCanvas.width = w; this._rainCanvas.height = h;
    };

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
    window.addEventListener("resize", this._onResize);
    this._canvas.addEventListener("contextmenu", e => e.preventDefault());
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  private _buildHUD(): void {
    this._hud = document.createElement("div");
    this._hud.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:11;pointer-events:none;font-family:'Segoe UI',monospace;color:#0f0;";
    document.getElementById("pixi-container")!.appendChild(this._hud);

    this._hud.innerHTML = `
      <div style="position:absolute;bottom:30px;left:30px;width:200px;">
        <div style="font-size:9px;color:#0a0;margin-bottom:3px;">INTEGRITY</div>
        <div style="height:8px;background:rgba(0,255,0,0.08);border-radius:4px;border:1px solid rgba(0,255,0,0.2);overflow:hidden;">
          <div id="mx-hp" style="height:100%;width:100%;background:linear-gradient(90deg,#0a0,#0f0);border-radius:4px;transition:width 0.2s;"></div>
        </div>
      </div>
      <div style="position:absolute;bottom:55px;left:30px;width:200px;">
        <div style="font-size:9px;color:#0a0;margin-bottom:3px;">BULLET TIME</div>
        <div style="height:6px;background:rgba(0,255,0,0.08);border-radius:3px;border:1px solid rgba(0,255,0,0.15);overflow:hidden;">
          <div id="mx-bt" style="height:100%;width:100%;background:linear-gradient(90deg,#004400,#00ff88);border-radius:3px;transition:width 0.1s;"></div>
        </div>
      </div>
      <div id="mx-score" style="position:absolute;top:20px;right:30px;font-size:22px;color:#0f0;font-weight:bold;text-shadow:0 0 15px rgba(0,255,0,0.5);letter-spacing:2px;"></div>
      <div id="mx-combo" style="position:absolute;top:50px;right:30px;font-size:16px;color:#0f0;text-shadow:0 0 12px rgba(0,255,0,0.4);opacity:0;transition:opacity 0.2s;"></div>
      <div id="mx-wave" style="position:absolute;top:20px;left:30px;font-size:14px;color:#0a0;"></div>
      <div id="mx-center" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:24px;text-align:center;color:#0f0;text-shadow:0 0 25px rgba(0,255,0,0.7);white-space:pre-line;pointer-events:auto;line-height:1.6;"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;pointer-events:none;">
        <div style="position:absolute;top:50%;left:0;right:0;height:1px;background:rgba(0,255,0,0.4);"></div>
        <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(0,255,0,0.4);"></div>
      </div>
      <div id="mx-dmgflash" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;background:radial-gradient(ellipse at center,rgba(255,0,0,0.3) 0%,transparent 70%);opacity:0;transition:opacity 0.1s;"></div>
      <div id="mx-bttint" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;background:rgba(0,30,0,0.15);opacity:0;transition:opacity 0.3s;"></div>
      <div id="mx-popups" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:12;"></div>
      <div id="mx-btwarp" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity 0.15s;background:radial-gradient(ellipse at center,transparent 30%,rgba(0,255,0,0.12) 60%,rgba(0,60,0,0.25) 100%);"></div>
    `;

    this._hudHP = document.getElementById("mx-hp") as HTMLDivElement;
    this._hudBT = document.getElementById("mx-bt") as HTMLDivElement;
    this._hudScore = document.getElementById("mx-score") as HTMLDivElement;
    this._hudCombo = document.getElementById("mx-combo") as HTMLDivElement;
    this._hudWave = document.getElementById("mx-wave") as HTMLDivElement;
    this._hudCenter = document.getElementById("mx-center") as HTMLDivElement;
    this._btWarpOverlay = document.getElementById("mx-btwarp") as HTMLDivElement;
  }

  // ── title screen ───────────────────────────────────────────────────────────

  private _showTitle(): void {
    this._phase = "title";
    this._clearScene();
    this._scene.background = new THREE.Color(0x000800);
    this._scene.fog = new THREE.Fog(0x000800, 10, 50);

    this._scene.add(new THREE.AmbientLight(0x002200, 0.3));
    const light = new THREE.DirectionalLight(0x00ff44, 0.8);
    light.position.set(5, 10, 5); this._scene.add(light);

    // floating sword in green glow
    const swordGroup = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x88ff88, emissive: 0x00ff44, emissiveIntensity: 1.0, toneMapped: false, metalness: 0.9, roughness: 0.1 }));
    blade.position.y = 1.25; swordGroup.add(blade);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x00aa44, metalness: 0.8, roughness: 0.2 }));
    swordGroup.add(guard);
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 12),
      new THREE.MeshStandardMaterial({ color: 0x224422, roughness: 0.7 }));
    hilt.position.y = -0.25; swordGroup.add(hilt);
    swordGroup.position.set(0, 1.5, 0); swordGroup.name = "titleSword";
    this._scene.add(swordGroup);

    this._scene.add(new THREE.PointLight(0x00ff44, 2, 15));

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x001a00, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2; this._scene.add(ground);

    this._camera.position.set(0, 2, 5);
    this._camera.lookAt(0, 1.5, 0);

    const hs = this._loadHighScore();
    const diff = MATRIX_DIFFICULTY[this._difficulty];
    this._hudCenter.textContent = `M A T R I X\nBullet-Time Arena\n\nDodge. Deflect. Dominate.\n\n` +
      `${diff.label} [1/2/3]\n${diff.desc}` +
      (hs > 0 ? `\n\nHigh Score: ${hs}` : "") +
      `\n\nENTER to Begin  ·  ESC to Exit`;
    this._hudScore.textContent = "";
    this._hudCombo.style.opacity = "0";
    this._hudWave.textContent = "";
    this._hudHP.style.width = "100%";
    this._hudBT.style.width = "100%";

    if (document.pointerLockElement) document.exitPointerLock();
  }

  // ── game start ─────────────────────────────────────────────────────────────

  private _startGame(): void {
    this._wave = 0;
    this._score = 0;
    this._combo = 0;
    this._comboTimer = 0;
    this._maxCombo = 0;
    this._totalDeflects = 0;
    this._totalNearMisses = 0;
    this._totalDodges = 0;
    const diff = MATRIX_DIFFICULTY[this._difficulty];
    this._playerHP = PLAYER_HP * diff.hpMult;
    this._deathSequenceActive = false;
    this._deathSequenceTimer = 0;
    this._playerPos.set(0, 1, 0);
    this._playerAngle = 0;
    this._playerPitch = 0;
    this._btEnergy = BT_MAX_ENERGY;
    this._btActive = false;
    this._dodgeTimer = 0;
    this._dodgeCooldown = 0;
    this._slashing = false;
    this._invulnTimer = 0;
    this._projectiles = [];
    this._enemies = [];
    this._particles = [];
    this._gameTime = 0;
    this._timeScale = 1.0;

    this._clearScene();
    this._buildArena();
    this._buildPlayerMesh();

    this._phase = "countdown";
    this._waveTimer = 3;
    this._hudCenter.textContent = "3";
    this._hudCenter.style.fontSize = "72px";
    this._canvas.requestPointerLock();

    // tutorial hint on first play
    if (!localStorage.getItem("matrix_tutorial_seen")) {
      localStorage.setItem("matrix_tutorial_seen", "1");
      const tip = document.createElement("div");
      tip.style.cssText = "position:absolute;bottom:60px;left:50%;transform:translateX(-50%);font-size:11px;color:rgba(0,255,0,0.5);text-align:center;z-index:12;pointer-events:none;transition:opacity 1s;font-family:monospace;";
      tip.textContent = "WASD move · LMB slash/deflect · RMB/SHIFT bullet time · SPACE dodge";
      document.getElementById("pixi-container")!.appendChild(tip);
      setTimeout(() => { tip.style.opacity = "0"; }, 8000);
      setTimeout(() => { tip.parentNode?.removeChild(tip); }, 9500);
    }
    if (!this._audioCtx) this._audioCtx = new AudioContext();
    this._startAmbientDrone();
    this._highScore = this._loadHighScore();
  }

  // ── arena ──────────────────────────────────────────────────────────────────

  private _clearScene(): void {
    while (this._camera.children.length > 0) this._camera.remove(this._camera.children[0]);
    this._scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) { obj.geometry?.dispose(); (obj.material as THREE.Material)?.dispose(); }
    });
    while (this._scene.children.length > 0) this._scene.remove(this._scene.children[0]);
  }

  private _buildArena(): void {
    this._scene.background = new THREE.Color(0x000a00);
    this._scene.fog = new THREE.Fog(0x001a00, 15, 60);

    // dark green ambient
    this._scene.add(new THREE.AmbientLight(0x003300, 0.4));
    const sun = new THREE.DirectionalLight(0x00ff44, 0.6);
    sun.position.set(10, 20, 5); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
    this._scene.add(sun);

    // arena floor: dark stone with green grid lines
    const floorTex = this._createGridTexture();
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(ARENA_RADIUS + 2, 48),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    this._scene.add(floor);

    // arena walls: wireframe pillars
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const x = Math.cos(a) * (ARENA_RADIUS + 1);
      const z = Math.sin(a) * (ARENA_RADIUS + 1);

      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 5, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x003300, emissive: 0x004400, emissiveIntensity: 0.3, toneMapped: false })
      );
      pillar.position.set(x, 2.5, z); pillar.castShadow = true;
      this._scene.add(pillar);

      // glowing top
      const top = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 2.0, toneMapped: false })
      );
      top.position.set(x, 5.2, z);
      this._scene.add(top);
    }

    // central glow
    this._scene.add(new THREE.PointLight(0x00ff44, 0.5, 30));

    // arena obstacles: cover blocks and energy barriers
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.4, metalness: 0.6 });
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x003300, emissive: 0x004400, emissiveIntensity: 0.4, transparent: true, opacity: 0.7, toneMapped: false });

    // 6 cover blocks in inner ring
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const r = 10 + (i % 2) * 4;
      const block = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 1.5), coverMat);
      block.position.set(Math.cos(a) * r, 0.6, Math.sin(a) * r);
      block.castShadow = true; block.receiveShadow = true;
      this._scene.add(block);
      // green edge glow strip
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.05, 1.55),
        new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 1.0, toneMapped: false }));
      strip.position.set(Math.cos(a) * r, 1.22, Math.sin(a) * r);
      this._scene.add(strip);
    }

    // 3 tall energy barrier columns (transparent, glowing)
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const r = 16;
      const barrier = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4, 8), barrierMat);
      barrier.position.set(Math.cos(a) * r, 2, Math.sin(a) * r);
      this._scene.add(barrier);
      // top/bottom rings
      for (const y of [0.05, 4]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 16),
          new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 1.5, toneMapped: false }));
        ring.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
        ring.rotation.x = Math.PI / 2;
        this._scene.add(ring);
      }
    }

    // floor decoration: concentric grid circles
    for (const radius of [8, 16, ARENA_RADIUS]) {
      const circle = new THREE.Mesh(
        new THREE.RingGeometry(radius - 0.05, radius + 0.05, 64),
        new THREE.MeshBasicMaterial({ color: 0x004400, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
      );
      circle.rotation.x = -Math.PI / 2; circle.position.y = 0.02;
      this._scene.add(circle);
    }
  }

  private _createGridTexture(): THREE.CanvasTexture {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#050a05";
    ctx.fillRect(0, 0, 512, 512);
    // grid lines
    ctx.strokeStyle = "rgba(0,100,0,0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 512; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }

  // ── player mesh ────────────────────────────────────────────────────────────

  private _buildPlayerMesh(): void {
    this._playerMesh = new THREE.Group();
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.5 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 1.5, toneMapped: false });

    // torso (tapered)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.0, 8), darkMat);
    torso.position.y = 0.9; torso.castShadow = true; this._playerMesh.add(torso);

    // shoulders
    for (const sx of [-0.35, 0.35]) {
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), darkMat);
      shoulder.position.set(sx, 1.35, 0); this._playerMesh.add(shoulder);
      // green accent strip on shoulder
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.1), accentMat);
      strip.position.set(sx, 1.35, -0.1); this._playerMesh.add(strip);
    }

    // arms
    for (const sx of [-0.38, 0.38]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.6, 12), darkMat);
      arm.position.set(sx, 1.0, 0); arm.castShadow = true; this._playerMesh.add(arm);
    }

    // legs
    for (const sx of [-0.12, 0.12]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.7, 12), darkMat);
      leg.position.set(sx, 0.25, 0); leg.castShadow = true; this._playerMesh.add(leg);
      // boot
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.15), darkMat);
      boot.position.set(sx, -0.05, -0.02); this._playerMesh.add(boot);
    }

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), darkMat);
    head.position.y = 1.55; head.castShadow = true; this._playerMesh.add(head);

    // visor glow (wider, more prominent)
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.12), accentMat);
    visor.position.set(0, 1.55, -0.17); this._playerMesh.add(visor);

    // chest glow strip
    const chestStrip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.6, 0.05), accentMat);
    chestStrip.position.set(0, 0.9, -0.26); this._playerMesh.add(chestStrip);

    // cape (flows behind)
    const cape = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.9, 1, 4),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.5, side: THREE.DoubleSide })
    );
    cape.position.set(0, 1.0, 0.3); cape.name = "cape";
    this._playerMesh.add(cape);

    // sword (longer blade with guard)
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 1.3, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x88ff88, emissive: 0x00ff44, emissiveIntensity: 0.5, toneMapped: false, metalness: 0.9, roughness: 0.1 })
    );
    blade.position.set(0.42, 1.0, -0.25); blade.name = "sword"; this._playerMesh.add(blade);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x00aa44, metalness: 0.8, roughness: 0.2 }));
    guard.position.set(0.42, 0.4, -0.25); this._playerMesh.add(guard);

    this._playerMesh.position.copy(this._playerPos);
    this._scene.add(this._playerMesh);
  }

  // ── update loop ────────────────────────────────────────────────────────────

  private _update(): void {
    if (this._phase === "title") {
      const t = this._time * 0.3;
      this._camera.position.set(Math.cos(t) * 5, 2 + Math.sin(t * 0.5) * 0.3, Math.sin(t) * 5);
      this._camera.lookAt(0, 1.5, 0);
      const sword = this._scene.getObjectByName("titleSword");
      if (sword) { sword.rotation.y += this._dt; sword.position.y = 1.5 + Math.sin(this._time) * 0.2; }
      this._updateDigitalRain();
      return;
    }

    if (this._phase === "paused") return;

    // bullet time scale
    this._timeScale = this._btActive ? BT_SLOW_FACTOR : 1.0;
    const dt = this._dt * this._timeScale;

    if (this._phase === "countdown") {
      const prevNum = Math.ceil(this._waveTimer + this._dt);
      this._waveTimer -= this._dt;
      const num = Math.ceil(this._waveTimer);
      if (num > 0 && num <= 3) {
        if (num !== prevNum) {
          this._hudCenter.innerHTML = `<div style="font-size:90px;color:#0f0;text-shadow:0 0 40px rgba(0,255,0,0.8);transform:scale(1.5);transition:transform 0.5s;opacity:1;">${num}</div>`;
          this._playSound(440, 0.15, "sine", 0.15);
          setTimeout(() => {
            this._hudCenter.style.transform = "translate(-50%,-50%) scale(0.9)";
            this._hudCenter.style.opacity = "0.5";
          }, 100);
        }
      } else if (this._waveTimer <= 0) {
        if (prevNum > 0) {
          this._hudCenter.innerHTML = `<div style="font-size:60px;color:#0f0;text-shadow:0 0 50px rgba(0,255,0,0.9);letter-spacing:6px;">FIGHT</div>`;
          this._playSound(880, 0.2, "sine", 0.3);
        }
        if (this._waveTimer < -0.6) {
          this._phase = "playing";
          this._hudCenter.textContent = "";
          this._hudCenter.style.fontSize = "24px";
          this._hudCenter.style.transform = "translate(-50%,-50%)";
          this._hudCenter.style.opacity = "1";
          this._nextWave();
        }
      }
    }

    if (this._phase === "playing" || this._phase === "wave_break") {
      this._gameTime += dt;
      this._updatePlayerMovement(dt);
      this._updateBulletTime(this._dt); // BT energy uses real dt
      this._updateProjectiles(dt);
      this._updateEnemies(dt);
      this._updateParticles(dt);
      this._updateSlash(dt);
      this._updateCombo(this._dt);
      this._updateHUD();
      this._updateDamageFlash(this._dt);
      this._updateDodgeTrails(this._dt);
      this._updateBTVisuals();
      this._updateShieldVisual();
      this._updateScorePopups(this._dt);
      this._updateHealthPickups();
      this._updateCameraShake();

      // wave break timer with escalating tension
      if (this._phase === "wave_break") {
        this._waveTimer -= this._dt;
        // buildup effects: bloom + digital rain intensify as next wave approaches
        const progress = 1 - (this._waveTimer / WAVE_BREAK); // 0→1
        this._bloomPass.strength = 0.8 + progress * 0.6; // builds to 1.4
        this._rainCanvas.style.opacity = String(0.06 + progress * 0.2); // rain intensifies
        // ambient pitch rises
        if (this._droneGain) {
          this._droneGain.gain.setTargetAtTime(0.06 + progress * 0.06, this._audioCtx!.currentTime, 0.1);
        }
        // screen-edge warning pulse at last second
        if (this._waveTimer < 1) {
          const pulse = Math.sin((1 - this._waveTimer) * Math.PI * 4) * 0.5 + 0.5;
          const dmgEl = document.getElementById("mx-dmgflash");
          if (dmgEl) {
            dmgEl.style.background = `radial-gradient(ellipse at center, transparent 60%, rgba(0,255,0,${pulse * 0.15}) 100%)`;
            dmgEl.style.opacity = "1";
          }
        }
        if (this._waveTimer <= 0) {
          this._bloomPass.strength = 0.8;
          this._rainCanvas.style.opacity = "0.06";
          if (this._droneGain) this._droneGain.gain.setTargetAtTime(0.06, this._audioCtx!.currentTime, 0.1);
          const dmgEl = document.getElementById("mx-dmgflash");
          if (dmgEl) { dmgEl.style.background = "radial-gradient(ellipse at center,rgba(255,0,0,0.3) 0%,transparent 70%)"; dmgEl.style.opacity = "0"; }
          this._nextWave();
          this._phase = "playing";
        }
      }

      // check death — dramatic slow-mo sequence
      if (this._playerHP <= 0 && !this._deathSequenceActive) {
        this._deathSequenceActive = true;
        this._deathSequenceTimer = 2.5;
        this._timeScale = 0.1; // extreme slow-mo
        this._btActive = false;
        this._spawnSparks(this._playerPos.clone(), 0xff0000, 30);
        this._spawnSparks(this._playerPos.clone(), 0x00ff44, 15);
        this._bloomPass.strength = 2.0;
        this._playSound(60, 0.3, "sawtooth", 2.0);
      }

      if (this._deathSequenceActive) {
        this._deathSequenceTimer -= this._dt; // real dt, not scaled
        // dramatic camera orbit during death
        const dAngle = this._playerAngle + (2.5 - this._deathSequenceTimer) * 1.5;
        const dDist = 5 + (2.5 - this._deathSequenceTimer) * 2;
        this._camera.position.set(
          this._playerPos.x + Math.sin(dAngle) * dDist,
          this._playerPos.y + 2 + (2.5 - this._deathSequenceTimer) * 1.5,
          this._playerPos.z + Math.cos(dAngle) * dDist
        );
        this._camera.lookAt(this._playerPos.x, this._playerPos.y + 1, this._playerPos.z);
        // bloom fades back
        this._bloomPass.strength = Math.max(0.8, 2.0 - (2.5 - this._deathSequenceTimer) * 0.5);
        // player mesh falls over
        this._playerMesh.rotation.x = Math.min(Math.PI / 3, (2.5 - this._deathSequenceTimer) * 0.5);

        if (this._deathSequenceTimer <= 0) {
          this._phase = "dead";
          this._deathSequenceActive = false;
          this._timeScale = 1.0;
          if (document.pointerLockElement) document.exitPointerLock();
        } else {
          return; // skip normal death screen until sequence ends
        }
      }

      if (this._phase === "dead" && !this._deathSequenceActive && this._hudCenter.innerHTML.indexOf("SYSTEM FAILURE") === -1) {
        const newHigh = this._saveHighScore();
        this._hudCenter.innerHTML =
          `<div style="background:rgba(0,0,0,0.85);border:1px solid rgba(0,255,0,0.4);border-radius:10px;padding:25px 35px;max-width:350px;">` +
          `<div style="font-size:26px;color:#0f0;letter-spacing:3px;text-shadow:0 0 20px rgba(0,255,0,0.6);">SYSTEM FAILURE</div>` +
          (newHigh ? `<div style="font-size:13px;color:#0f0;margin-top:4px;text-shadow:0 0 10px #0f0;">NEW HIGH SCORE!</div>` : "") +
          `<div style="border-top:1px solid rgba(0,255,0,0.15);margin:12px 0;"></div>` +
          `<div style="font-size:13px;color:#0a0;line-height:2.2;">` +
          `Score: <span style="color:#0f0;font-size:18px;">${this._score}</span><br>` +
          `High Score: <span style="color:#0f0;">${Math.max(this._score, this._highScore)}</span><br>` +
          `Wave: <span style="color:#0f0;">${this._wave}</span><br>` +
          `Deflects: <span style="color:#0f0;">${this._totalDeflects}</span> · Near Misses: <span style="color:#0f0;">${this._totalNearMisses}</span><br>` +
          `Dodges: <span style="color:#0f0;">${this._totalDodges}</span> · Max Combo: <span style="color:#0f0;">${this._maxCombo}x</span></div>` +
          `<div style="border-top:1px solid rgba(0,255,0,0.15);margin:12px 0;"></div>` +
          `<div style="font-size:12px;color:#080;">ENTER to retry · ESC to exit</div></div>`;
        this._playSound(80, 0.3, "sawtooth", 1.0);
        // stop drone
        try { this._droneOsc?.stop(); } catch { /* */ }
        this._droneOsc = null;
      }
    }

    this._updateCamera();
    this._updateDigitalRain();

    // bloom intensifies during bullet time
    this._bloomPass.strength = this._btActive ? 1.2 : 0.8;
  }

  // ── player movement ────────────────────────────────────────────────────────

  private _updatePlayerMovement(dt: number): void {
    // dodge roll
    if (this._dodgeTimer > 0) {
      this._dodgeTimer -= dt;
      this._playerPos.add(this._dodgeDir.clone().multiplyScalar(DODGE_SPEED * dt));
      this._invulnTimer = 0.1;
    } else {
      // normal movement
      let mx = 0, mz = 0;
      if (this._keys.has("w") || this._keys.has("arrowup")) { mx += Math.sin(this._playerAngle); mz -= Math.cos(this._playerAngle); }
      if (this._keys.has("s") || this._keys.has("arrowdown")) { mx -= Math.sin(this._playerAngle); mz += Math.cos(this._playerAngle); }
      if (this._keys.has("a") || this._keys.has("arrowleft")) { mx -= Math.cos(this._playerAngle); mz -= Math.sin(this._playerAngle); }
      if (this._keys.has("d") || this._keys.has("arrowright")) { mx += Math.cos(this._playerAngle); mz += Math.sin(this._playerAngle); }
      const len = Math.sqrt(mx * mx + mz * mz);
      if (len > 0) { mx /= len; mz /= len; }
      this._playerPos.x += mx * PLAYER_SPEED * dt;
      this._playerPos.z += mz * PLAYER_SPEED * dt;
    }

    if (this._dodgeCooldown > 0) this._dodgeCooldown -= dt;
    if (this._invulnTimer > 0) this._invulnTimer -= dt;

    // clamp to arena
    const dist = Math.sqrt(this._playerPos.x ** 2 + this._playerPos.z ** 2);
    if (dist > ARENA_RADIUS) {
      this._playerPos.x *= ARENA_RADIUS / dist;
      this._playerPos.z *= ARENA_RADIUS / dist;
    }

    this._playerMesh.position.copy(this._playerPos);
    this._playerMesh.rotation.y = this._playerAngle;

    // idle breathing animation (subtle torso sway + bob)
    const isIdle = this._dodgeTimer <= 0 && !this._slashing;
    if (isIdle) {
      this._playerMesh.position.y = this._playerPos.y + Math.sin(this._time * 1.5) * 0.02;
      this._playerMesh.rotation.z = Math.sin(this._time * 0.8) * 0.01;
    }

    // lean into movement direction
    const moving = this._keys.has("w") || this._keys.has("s") || this._keys.has("a") || this._keys.has("d");
    if (moving && this._dodgeTimer <= 0) {
      this._playerMesh.rotation.x = 0.08; // slight forward lean when running
    } else if (this._dodgeTimer <= 0) {
      this._playerMesh.rotation.x *= 0.9; // ease back to upright
    }
  }

  private _dodgeRoll(): void {
    if (this._deathSequenceActive || this._phase === "dead") return;
    if (this._dodgeCooldown > 0 || this._dodgeTimer > 0) return;
    this._dodgeTimer = DODGE_DURATION;
    this._dodgeCooldown = DODGE_COOLDOWN;

    // dodge in movement direction, or backward if standing still
    let dx = 0, dz = 0;
    if (this._keys.has("w")) { dx += Math.sin(this._playerAngle); dz -= Math.cos(this._playerAngle); }
    if (this._keys.has("s")) { dx -= Math.sin(this._playerAngle); dz += Math.cos(this._playerAngle); }
    if (this._keys.has("a")) { dx -= Math.cos(this._playerAngle); dz -= Math.sin(this._playerAngle); }
    if (this._keys.has("d")) { dx += Math.cos(this._playerAngle); dz += Math.sin(this._playerAngle); }
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) { this._dodgeDir.set(dx / len, 0, dz / len); }
    else { this._dodgeDir.set(-Math.sin(this._playerAngle), 0, Math.cos(this._playerAngle)); }

    this._addScore(SCORE_DODGE);
    this._totalDodges++;
    this._playSound(200, 0.1, "sine", 0.15);

    // spawn ghost trail at current position
    for (let gi = 0; gi < 3; gi++) {
      const ghost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, 1.4, 12),
        new THREE.MeshBasicMaterial({ color: 0x00ff44, transparent: true, opacity: 0.3 - gi * 0.08, wireframe: true })
      );
      ghost.position.copy(this._playerPos);
      ghost.position.x -= this._dodgeDir.x * gi * 0.8;
      ghost.position.z -= this._dodgeDir.z * gi * 0.8;
      ghost.position.y = 0.7;
      ghost.rotation.y = this._playerAngle;
      this._scene.add(ghost);
      this._dodgeTrails.push(ghost);
    }
  }

  // ── bullet time ────────────────────────────────────────────────────────────

  private _updateBulletTime(realDt: number): void {
    const wantBT = !this._deathSequenceActive && (this._mouseDown.right || this._keys.has("shift")) && this._btEnergy > BT_MIN_ACTIVATE;
    if (wantBT && !this._btActive && this._btEnergy >= BT_MIN_ACTIVATE) {
      this._btActive = true;
      this._playSound(100, 0.15, "sine", 0.3);
      // time warp pulse on activation
      this._btWarpOverlay.style.opacity = "1";
      this._btWarpOverlay.style.transition = "opacity 0.15s";
      this._cameraShake = 0.08;
      // brief screen-space distortion: scale body slightly
      this._renderer.toneMappingExposure = 0.4;
      setTimeout(() => { this._renderer.toneMappingExposure = 0.7; }, 150);
    }
    if (!wantBT && this._btActive) {
      this._btActive = false;
      // exit warp pulse
      this._btWarpOverlay.style.opacity = "0";
      this._btWarpOverlay.style.transition = "opacity 0.4s";
      this._renderer.toneMappingExposure = 1.0;
      setTimeout(() => { this._renderer.toneMappingExposure = 0.7; }, 200);
      this._cameraShake = 0.06;
    }
    if (this._btActive) {
      this._btEnergy = Math.max(0, this._btEnergy - MATRIX_DIFFICULTY[this._difficulty].btDrain * realDt);
      if (this._btEnergy <= 0) this._btActive = false;
    } else {
      this._btEnergy = Math.min(BT_MAX_ENERGY, this._btEnergy + BT_REGEN * realDt);
    }
  }

  // ── sword slash ────────────────────────────────────────────────────────────

  private _swordSlash(): void {
    if (this._deathSequenceActive || this._phase === "dead") return;
    if (this._slashing) return;
    this._slashing = true;
    this._slashTimer = 0.3;
    this._playSound(800, 0.08, "sawtooth", 0.1);

    // check deflection: any projectile near and facing player
    const fwd = new THREE.Vector3(Math.sin(this._playerAngle), 0, -Math.cos(this._playerAngle));
    for (const proj of this._projectiles) {
      if (!proj.alive) continue;
      const toProj = new THREE.Vector3().subVectors(proj.mesh.position, this._playerPos);
      const dist = toProj.length();
      if (dist < DEFLECT_DIST) {
        toProj.normalize();
        if (fwd.dot(toProj) > Math.cos(DEFLECT_ANGLE)) {
          // deflect! reverse projectile
          proj.vel.multiplyScalar(-1.5);
          proj.mesh.material = new THREE.MeshStandardMaterial({
            color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 2.0, toneMapped: false,
          });
          this._addScore(SCORE_DEFLECT);
          this._totalDeflects++;
          this._spawnSparks(proj.mesh.position.clone(), 0x00ff44, 10);
          this._playSound(1200, 0.15, "sine", 0.2);
        }
      }
    }

    // check enemy hit
    for (const enemy of this._enemies) {
      if (!enemy.alive) continue;
      const toEnemy = new THREE.Vector3().subVectors(enemy.pos, this._playerPos);
      const dist = toEnemy.length();
      if (dist < 2.5) {
        toEnemy.normalize();
        if (fwd.dot(toEnemy) > 0.3) {
          enemy.hp -= 20;
          enemy.hitFlash = 0.2;
          this._spawnSparks(enemy.pos.clone(), 0x00ff44, 5);
          this._playSound(400, 0.1, "square", 0.08);
          if (enemy.hp <= 0) {
            enemy.alive = false;
            enemy.mesh.visible = false;
            this._enemiesRemaining--;
            this._addScore(SCORE_KILL);
            this._enemyDeathExplosion(enemy.pos.clone());
            if (this._enemiesRemaining <= 0) {
              this._phase = "wave_break";
              this._waveTimer = WAVE_BREAK;
              this._hudCenter.textContent = `WAVE ${this._wave} CLEARED`;
              setTimeout(() => { if (this._phase === "wave_break") this._hudCenter.textContent = ""; }, 1500);
              // spawn health pickup between waves
              if (this._playerHP < PLAYER_HP * 0.7) this._spawnHealthPickup();
            }
          }
        }
      }
    }
  }

  private _slashTrail: THREE.Mesh | null = null;

  private _updateSlash(dt: number): void {
    if (!this._slashing) {
      // remove trail
      if (this._slashTrail) {
        this._scene.remove(this._slashTrail);
        this._slashTrail.geometry.dispose(); (this._slashTrail.material as THREE.Material).dispose();
        this._slashTrail = null;
      }
      return;
    }
    this._slashTimer -= dt;
    if (this._slashTimer <= 0) this._slashing = false;

    // animate sword swing
    const sword = this._playerMesh.getObjectByName("sword");
    if (sword) {
      const swingAngle = Math.sin(this._slashTimer * 20) * 1.2;
      sword.rotation.z = this._slashing ? swingAngle : 0;
    }

    // slash arc trail
    if (this._slashing && !this._slashTrail) {
      const arcGeo = new THREE.RingGeometry(0.8, 1.6, 16, 1, 0, Math.PI * 0.8);
      const arcMat = new THREE.MeshStandardMaterial({
        color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 2.5,
        transparent: true, opacity: 0.6, toneMapped: false, side: THREE.DoubleSide,
      });
      this._slashTrail = new THREE.Mesh(arcGeo, arcMat);
      this._slashTrail.position.copy(this._playerPos);
      this._slashTrail.position.y = 1.2;
      this._slashTrail.rotation.y = this._playerAngle;
      this._scene.add(this._slashTrail);
    }
    if (this._slashTrail) {
      this._slashTrail.position.copy(this._playerPos);
      this._slashTrail.position.y = 1.2;
      this._slashTrail.rotation.y = this._playerAngle;
      this._slashTrail.rotation.x = Math.sin(this._slashTimer * 20) * 0.3;
      (this._slashTrail.material as THREE.MeshStandardMaterial).opacity = Math.max(0, this._slashTimer / 0.3 * 0.6);
    }
  }

  // ── enemies ────────────────────────────────────────────────────────────────

  private _nextWave(): void {
    this._wave++;
    const count = WAVE_BASE_ENEMIES + (this._wave - 1) * WAVE_ENEMY_GROWTH;
    this._enemiesRemaining = count;

    // wave announcement with dramatic effects
    this._hudCenter.innerHTML = `<div style="font-size:36px;color:#0f0;text-shadow:0 0 30px rgba(0,255,0,0.8);letter-spacing:4px;animation:none;">WAVE ${this._wave}</div><div style="font-size:14px;color:#0a0;margin-top:6px;">${count} AGENTS INCOMING</div>`;
    this._cameraShake = 0.2;
    this._playSound(150, 0.2, "sawtooth", 0.4);
    setTimeout(() => this._playSound(200, 0.15, "sawtooth", 0.3), 200);
    setTimeout(() => {
      if (this._phase === "playing") this._hudCenter.textContent = "";
    }, 2000);

    // spawn power-up on every 2nd wave
    if (this._wave > 1 && this._wave % 2 === 0) this._spawnRandomPowerUp();

    // arena lighting pulse on wave start
    this._bloomPass.strength = 1.5;
    setTimeout(() => { this._bloomPass.strength = this._btActive ? 1.2 : 0.8; }, 500);

    const types: ProjectileType[] = ["arrow", "fireball", "axe"];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const dist = ARENA_RADIUS * 0.7 + Math.random() * ARENA_RADIUS * 0.2;
      const pos = new THREE.Vector3(Math.cos(angle) * dist, 1, Math.sin(angle) * dist);

      const group = new THREE.Group();
      const eType = types[Math.floor(Math.random() * types.length)];

      // visual variety by projectile type
      const bodyColor = eType === "fireball" ? 0x220800 : eType === "axe" ? 0x0a0a15 : 0x110000;
      const eyeColor = eType === "fireball" ? 0xff4400 : eType === "axe" ? 0x8888ff : 0xff0000;
      const bodyH = eType === "axe" ? 1.5 : eType === "fireball" ? 1.0 : 1.2;
      const bodyW = eType === "axe" ? 0.35 : 0.25;

      // body
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(bodyW, bodyW + 0.05, bodyH, 12),
        new THREE.MeshStandardMaterial({ color: bodyColor, emissive: bodyColor, emissiveIntensity: 0.3 })
      );
      body.position.y = bodyH / 2; group.add(body);

      // head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(eType === "axe" ? 0.22 : 0.18, 12, 10),
        new THREE.MeshStandardMaterial({ color: bodyColor, emissive: bodyColor, emissiveIntensity: 0.4 })
      );
      head.position.y = bodyH + 0.15; group.add(head);

      // eyes (two for axe type, one for others)
      const eyeMat = new THREE.MeshStandardMaterial({ color: eyeColor, emissive: eyeColor, emissiveIntensity: 3.0, toneMapped: false });
      if (eType === "axe") {
        for (const ex of [-0.07, 0.07]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), eyeMat);
          eye.position.set(ex, bodyH + 0.15, -0.16); group.add(eye);
        }
      } else {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), eyeMat);
        eye.position.set(0, bodyH + 0.15, -0.15); group.add(eye);
      }

      // weapon visual
      if (eType === "arrow") {
        // bow: thin curve
        const bow = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 12, 12, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0x663300, roughness: 0.7 }));
        bow.position.set(-0.35, bodyH * 0.6, -0.1); bow.rotation.z = Math.PI / 2;
        group.add(bow);
      } else if (eType === "fireball") {
        // glowing hands
        for (const sx of [-0.25, 0.25]) {
          const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10),
            new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 1.5, toneMapped: false }));
          hand.position.set(sx, bodyH * 0.5, -0.2); group.add(hand);
        }
      } else {
        // axe weapon mesh
        const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.06),
          new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 }));
        axeHead.position.set(0.35, bodyH * 0.6, -0.1); group.add(axeHead);
        const axeHaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 10),
          new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 }));
        axeHaft.position.set(0.35, bodyH * 0.4, -0.1); group.add(axeHaft);
      }

      group.position.copy(pos);
      group.scale.setScalar(0.01); // start tiny, grow in
      this._scene.add(group);
      // spawn-in animation: scale up over 0.5s
      const startTime = this._time;
      const animateSpawn = () => {
        const elapsed = this._time - startTime;
        if (elapsed < 0.5) {
          group.scale.setScalar(Math.min(1, elapsed * 2));
          requestAnimationFrame(animateSpawn);
        } else { group.scale.setScalar(1); }
      };
      requestAnimationFrame(animateSpawn);
      // spawn flash
      this._spawnSparks(pos.clone(), 0xff0000, 5);

      this._enemies.push({
        mesh: group, pos: pos.clone(), hp: ENEMY_HP + this._wave * 5,
        angle: 0, fireTimer: 1 + Math.random() * 2,
        fireRate: (2.5 - Math.min(1.5, this._wave * 0.15)) * MATRIX_DIFFICULTY[this._difficulty].fireMult,
        type: eType,
        alive: true, hitFlash: 0,
      });
    }

    this._hudWave.textContent = `WAVE ${this._wave} · ${count} AGENTS`;
  }

  private _updateEnemies(dt: number): void {
    for (const e of this._enemies) {
      if (!e.alive) continue;

      // face player
      const dx = this._playerPos.x - e.pos.x;
      const dz = this._playerPos.z - e.pos.z;
      const distToPlayer = Math.sqrt(dx * dx + dz * dz);
      e.angle = Math.atan2(dx, -dz);
      e.mesh.rotation.y = e.angle;

      // enemy movement: strafe around player, close in slowly
      const strafeAngle = e.angle + Math.PI / 2;
      const strafeSpeed = 2 + Math.sin(this._time * 0.8 + e.pos.x) * 1.5;
      e.pos.x += Math.sin(strafeAngle) * strafeSpeed * dt;
      e.pos.z -= Math.cos(strafeAngle) * strafeSpeed * dt;
      // slowly close in if too far, back off if too close
      if (distToPlayer > 15) {
        e.pos.x += (dx / distToPlayer) * 3 * dt;
        e.pos.z += (dz / distToPlayer) * 3 * dt;
      } else if (distToPlayer < 8) {
        e.pos.x -= (dx / distToPlayer) * 2 * dt;
        e.pos.z -= (dz / distToPlayer) * 2 * dt;
      }
      // clamp to arena
      const eDist = Math.sqrt(e.pos.x ** 2 + e.pos.z ** 2);
      if (eDist > ARENA_RADIUS * 0.9) {
        e.pos.x *= ARENA_RADIUS * 0.9 / eDist;
        e.pos.z *= ARENA_RADIUS * 0.9 / eDist;
      }
      e.mesh.position.copy(e.pos);

      // fire projectile
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = e.fireRate + Math.random() * 0.5;
        this._spawnProjectile(e.pos.clone(), e.type);
      }

      // hit flash
      if (e.hitFlash > 0) {
        e.hitFlash -= dt;
        e.mesh.children.forEach(c => {
          if (c instanceof THREE.Mesh) {
            (c.material as THREE.MeshStandardMaterial).emissiveIntensity = e.hitFlash > 0 ? 2.0 : 0.3;
          }
        });
      }

      // check if hit by deflected projectile
      for (const proj of this._projectiles) {
        if (!proj.alive) continue;
        if (proj.vel.dot(new THREE.Vector3(dx, 0, dz).normalize()) < 0) continue; // only deflected ones moving toward enemy
        const d = proj.mesh.position.distanceTo(e.pos);
        if (d < 1.5) {
          e.hp -= 25;
          proj.alive = false;
          proj.mesh.visible = false;
          this._spawnSparks(e.pos.clone(), 0xff4444, 8);
          if (e.hp <= 0) {
            e.alive = false;
            e.mesh.visible = false;
            this._enemiesRemaining--;
            this._addScore(SCORE_KILL);
            this._enemyDeathExplosion(e.pos.clone());
            if (this._enemiesRemaining <= 0) {
              this._phase = "wave_break";
              this._waveTimer = WAVE_BREAK;
              this._hudCenter.textContent = `WAVE ${this._wave} CLEARED`;
              setTimeout(() => { if (this._phase === "wave_break") this._hudCenter.textContent = ""; }, 1500);
              if (this._playerHP < PLAYER_HP * 0.7) this._spawnHealthPickup();
            }
          }
        }
      }
    }
  }

  // ── projectiles ────────────────────────────────────────────────────────────

  private _spawnProjectile(from: THREE.Vector3, type: ProjectileType): void {
    const dir = new THREE.Vector3().subVectors(this._playerPos, from).normalize();
    // slight random spread
    dir.x += (Math.random() - 0.5) * 0.15;
    dir.z += (Math.random() - 0.5) * 0.15;
    dir.normalize();

    const baseSpeed = type === "arrow" ? ARROW_SPEED : type === "fireball" ? FIREBALL_SPEED : AXE_SPEED;
    const speed = baseSpeed * MATRIX_DIFFICULTY[this._difficulty].speedMult;
    const vel = dir.multiplyScalar(speed);

    let geo: THREE.BufferGeometry;
    let mat: THREE.MeshStandardMaterial;
    if (type === "arrow") {
      geo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 10);
      mat = new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff8800, emissiveIntensity: 1.0, toneMapped: false });
    } else if (type === "fireball") {
      geo = new THREE.SphereGeometry(0.2, 12, 10);
      mat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 2.0, toneMapped: false });
    } else {
      geo = new THREE.BoxGeometry(0.3, 0.3, 0.1);
      mat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, emissive: 0x888888, emissiveIntensity: 0.5, toneMapped: false, metalness: 0.8, roughness: 0.2 });
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(from);
    mesh.position.y = 1;
    this._scene.add(mesh);

    this._projectiles.push({ mesh, vel, type, alive: true, trail: [] });

    // enemy fire sound (distance-attenuated)
    const distToPlayer = from.distanceTo(this._playerPos);
    const vol = Math.max(0.01, 0.08 - distToPlayer * 0.003);
    if (type === "arrow") this._playSound(300 + Math.random() * 100, vol, "triangle", 0.08);
    else if (type === "fireball") this._playSound(150 + Math.random() * 50, vol, "sine", 0.12);
    else this._playSound(200 + Math.random() * 80, vol, "sawtooth", 0.06);
  }

  private _updateProjectiles(dt: number): void {
    for (let i = this._projectiles.length - 1; i >= 0; i--) {
      const proj = this._projectiles[i];
      if (!proj.alive) {
        this._scene.remove(proj.mesh);
        for (const t of proj.trail) { this._scene.remove(t); t.geometry.dispose(); (t.material as THREE.Material).dispose(); }
        this._projectiles.splice(i, 1);
        continue;
      }

      proj.mesh.position.add(proj.vel.clone().multiplyScalar(dt));

      // rotate axes
      if (proj.type === "axe") proj.mesh.rotation.x += dt * 15;
      if (proj.type === "arrow") {
        proj.mesh.rotation.x = Math.PI / 2;
        proj.mesh.lookAt(proj.mesh.position.clone().add(proj.vel));
      }

      // trail
      if (this._btActive && Math.random() > 0.5) {
        const trail = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 3, 3),
          new THREE.MeshBasicMaterial({ color: proj.type === "fireball" ? 0xff4400 : 0xffaa44, transparent: true, opacity: 0.5 })
        );
        trail.position.copy(proj.mesh.position);
        this._scene.add(trail);
        proj.trail.push(trail);
        if (proj.trail.length > 15) {
          const old = proj.trail.shift()!;
          this._scene.remove(old); old.geometry.dispose(); (old.material as THREE.Material).dispose();
        }
      }
      // fade trails
      for (let ti = 0; ti < proj.trail.length; ti++) {
        (proj.trail[ti].material as THREE.MeshBasicMaterial).opacity = (ti / proj.trail.length) * 0.4;
      }

      // check player hit
      const playerDist = proj.mesh.position.distanceTo(this._playerPos);
      if (playerDist < 0.8 && this._invulnTimer <= 0 && this._dodgeTimer <= 0) {
        this._playerHP -= PROJ_DAMAGE;
        proj.alive = false;
        this._spawnSparks(this._playerPos.clone(), 0xff0000, 8);
        this._playSound(200, 0.2, "square", 0.15);
        this._combo = 0;
        // damage feedback
        this._damageFlashTimer = 0.3;
        this._cameraShake = 0.3;
      }

      // near miss scoring
      if (playerDist < NEAR_MISS_DIST && playerDist > 0.8 && proj.alive) {
        // only score once per projectile pass
        if (!(proj as any)._nearMissed) {
          (proj as any)._nearMissed = true;
          this._addScore(SCORE_NEAR_MISS);
          this._totalNearMisses++;
          this._playSound(1500, 0.06, "sine", 0.1);
        }
      }

      // ground impact: projectiles that reach floor level
      if (proj.mesh.position.y < 0.1 && proj.alive) {
        proj.alive = false;
        const impactColor = proj.type === "fireball" ? 0xff4400 : proj.type === "arrow" ? 0xffaa44 : 0x888888;
        this._spawnSparks(proj.mesh.position.clone(), impactColor, 6);
        // floor scorch mark
        const scorch = new THREE.Mesh(
          new THREE.CircleGeometry(0.3 + Math.random() * 0.2, 8),
          new THREE.MeshBasicMaterial({ color: impactColor, transparent: true, opacity: 0.25, depthWrite: false })
        );
        scorch.rotation.x = -Math.PI / 2; scorch.position.copy(proj.mesh.position); scorch.position.y = 0.02;
        this._scene.add(scorch);
        // fade and remove scorch
        this._particles.push({
          mesh: scorch,
          vel: new THREE.Vector3(0, 0, 0),
          life: 3, maxLife: 3,
        });
      }

      // out of arena
      if (proj.mesh.position.length() > ARENA_RADIUS + 10) proj.alive = false;
    }
  }

  // ── scoring ────────────────────────────────────────────────────────────────

  private _addScore(base: number): void {
    this._combo++;
    this._comboTimer = COMBO_DECAY;
    const mult = Math.min(this._combo, COMBO_MULT_MAX);
    const total = base * mult;
    this._score += total;
    if (this._combo > this._maxCombo) this._maxCombo = this._combo;

    // floating score popup
    const label = base === SCORE_DEFLECT ? "DEFLECT" : base === SCORE_NEAR_MISS ? "NEAR MISS" : base === SCORE_KILL ? "KILL" : "DODGE";
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;left:${45 + Math.random() * 10}%;top:${35 + Math.random() * 10}%;font-size:${12 + mult * 1.5}px;color:#0f0;text-shadow:0 0 8px rgba(0,255,0,0.6);font-weight:bold;font-family:monospace;pointer-events:none;transition:all 1s;opacity:1;`;
    el.textContent = `+${total} ${label}${mult > 1 ? ` x${mult}` : ""}`;
    const container = document.getElementById("mx-popups");
    if (container) container.appendChild(el);
    requestAnimationFrame(() => { el.style.top = `${25 + Math.random() * 5}%`; el.style.opacity = "0"; });
    this._scorePopups.push({ el, timer: 1.2 });
  }

  private _updateCombo(realDt: number): void {
    if (this._comboTimer > 0) {
      this._comboTimer -= realDt;
      if (this._comboTimer <= 0) this._combo = 0;
    }
  }

  // ── camera ─────────────────────────────────────────────────────────────────

  private _camTargetDist = 6;
  private _camTargetHeight = 3;

  private _updateCamera(): void {
    if (this._phase !== "playing" && this._phase !== "wave_break" && this._phase !== "countdown" && this._phase !== "dead") return;

    // dynamic distance: pull back during BT, closer during slash
    const targetDist = this._btActive ? 8 : this._slashing ? 4.5 : 6;
    const targetHeight = this._btActive ? 4 : this._dodgeTimer > 0 ? 2 : 3;
    this._camTargetDist += (targetDist - this._camTargetDist) * 3 * this._dt;
    this._camTargetHeight += (targetHeight - this._camTargetHeight) * 3 * this._dt;

    // slight BT orbit: camera rotates around player slowly during bullet time
    const btOrbitOffset = this._btActive ? Math.sin(this._time * 0.5) * 0.3 : 0;

    const cx = this._playerPos.x - Math.sin(this._playerAngle + btOrbitOffset) * this._camTargetDist;
    const cz = this._playerPos.z + Math.cos(this._playerAngle + btOrbitOffset) * this._camTargetDist;
    this._camera.position.x += (cx - this._camera.position.x) * 6 * this._dt;
    this._camera.position.y += (this._playerPos.y + this._camTargetHeight - this._camera.position.y) * 6 * this._dt;
    this._camera.position.z += (cz - this._camera.position.z) * 6 * this._dt;

    this._camera.lookAt(
      this._playerPos.x + Math.sin(this._playerAngle) * 3,
      this._playerPos.y + 1.5 + this._playerPitch * 2,
      this._playerPos.z - Math.cos(this._playerAngle) * 3
    );

    // cape animation
    const cape = this._playerMesh.getObjectByName("cape");
    if (cape) {
      cape.rotation.x = 0.2 + (this._dodgeTimer > 0 ? 0.8 : 0) + Math.sin(this._time * 3) * 0.05;
    }
  }

  // ── particles ──────────────────────────────────────────────────────────────

  private _spawnSparks(pos: THREE.Vector3, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 3, 3),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.0, toneMapped: false })
      );
      mesh.position.copy(pos);
      this._scene.add(mesh);
      this._particles.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 5 + 2, (Math.random() - 0.5) * 8),
        life: 0.5 + Math.random() * 0.3, maxLife: 0.8,
      });
    }
  }

  private _updateParticles(dt: number): void {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this._scene.remove(p.mesh); p.mesh.geometry.dispose(); (p.mesh.material as THREE.Material).dispose();
        this._particles.splice(i, 1);
        continue;
      }
      p.vel.y -= 15 * dt;
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      (p.mesh.material as THREE.MeshStandardMaterial).opacity = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshStandardMaterial).transparent = true;
    }
  }

  // ── HUD update ─────────────────────────────────────────────────────────────

  private _updateHUD(): void {
    this._hudHP.style.width = `${Math.max(0, this._playerHP / PLAYER_HP * 100)}%`;
    if (this._playerHP < 30) this._hudHP.style.background = "linear-gradient(90deg,#a00,#f00)";
    else this._hudHP.style.background = "linear-gradient(90deg,#0a0,#0f0)";

    this._hudBT.style.width = `${this._btEnergy / BT_MAX_ENERGY * 100}%`;
    this._hudScore.textContent = `${this._score}`;
    this._hudWave.textContent = `WAVE ${this._wave} · ${this._enemiesRemaining} AGENTS`;

    if (this._combo > 1) {
      this._hudCombo.textContent = `${this._combo}x COMBO`;
      this._hudCombo.style.opacity = "1";
      this._hudCombo.style.fontSize = `${Math.min(24, 14 + this._combo)}px`;
    } else {
      this._hudCombo.style.opacity = "0";
    }
  }

  // ── damage flash ────────────────────────────────────────────────────────────

  private _updateDamageFlash(realDt: number): void {
    const el = document.getElementById("mx-dmgflash");
    if (!el) return;
    if (this._damageFlashTimer > 0) {
      this._damageFlashTimer -= realDt;
      el.style.opacity = String(Math.max(0, this._damageFlashTimer * 3));
    }
  }

  // ── camera shake ───────────────────────────────────────────────────────────

  private _updateCameraShake(): void {
    if (this._cameraShake > 0) {
      this._camera.position.x += (Math.random() - 0.5) * this._cameraShake * 0.3;
      this._camera.position.y += (Math.random() - 0.5) * this._cameraShake * 0.15;
      this._cameraShake = Math.max(0, this._cameraShake - this._dt * 2);
    }
  }

  // ── dodge ghost trail ──────────────────────────────────────────────────────

  private _updateDodgeTrails(realDt: number): void {
    for (let i = this._dodgeTrails.length - 1; i >= 0; i--) {
      const ghost = this._dodgeTrails[i];
      const mat = ghost.material as THREE.MeshBasicMaterial;
      mat.opacity -= realDt * 0.8;
      if (mat.opacity <= 0) {
        this._scene.remove(ghost); ghost.geometry.dispose(); mat.dispose();
        this._dodgeTrails.splice(i, 1);
      }
    }
  }

  // ── bullet time visuals ────────────────────────────────────────────────────

  private _updateBTVisuals(): void {
    const btTint = document.getElementById("mx-bttint");
    if (btTint) btTint.style.opacity = this._btActive ? "1" : "0";
    // FOV widens during BT for cinematic feel
    const targetFov = this._btActive ? 75 : 65;
    this._camera.fov += (targetFov - this._camera.fov) * 4 * this._dt;
    this._camera.updateProjectionMatrix();

    // high combo screen intensity: digital rain and bloom react
    if (this._combo >= 5) {
      const comboIntensity = Math.min(1, (this._combo - 4) / 8);
      this._rainCanvas.style.opacity = String(Math.max(parseFloat(this._rainCanvas.style.opacity) || 0.06, 0.06 + comboIntensity * 0.15));
      if (!this._btActive && this._phase === "playing") {
        this._bloomPass.strength = Math.max(this._bloomPass.strength, 0.8 + comboIntensity * 0.4);
      }
    }
  }

  // ── score popups ───────────────────────────────────────────────────────────

  private _updateScorePopups(realDt: number): void {
    for (let i = this._scorePopups.length - 1; i >= 0; i--) {
      const p = this._scorePopups[i];
      p.timer -= realDt;
      if (p.timer <= 0) {
        p.el.parentNode?.removeChild(p.el);
        this._scorePopups.splice(i, 1);
      }
    }
  }

  // ── shield visual ──────────────────────────────────────────────────────────

  private _shieldMesh: THREE.Mesh | null = null;

  private _updateShieldVisual(): void {
    if (this._invulnTimer > 0.5) {
      // show shield bubble
      if (!this._shieldMesh) {
        this._shieldMesh = new THREE.Mesh(
          new THREE.SphereGeometry(1.2, 16, 12),
          new THREE.MeshStandardMaterial({
            color: 0xffff44, emissive: 0xffff44, emissiveIntensity: 0.8,
            transparent: true, opacity: 0.15, toneMapped: false, wireframe: true,
          })
        );
        this._scene.add(this._shieldMesh);
      }
      this._shieldMesh.position.copy(this._playerPos);
      this._shieldMesh.position.y = 1;
      this._shieldMesh.rotation.y += this._dt * 2;
      (this._shieldMesh.material as THREE.MeshStandardMaterial).opacity = 0.1 + Math.sin(this._time * 6) * 0.06;
    } else {
      if (this._shieldMesh) {
        this._scene.remove(this._shieldMesh);
        this._shieldMesh.geometry.dispose(); (this._shieldMesh.material as THREE.Material).dispose();
        this._shieldMesh = null;
      }
    }
  }

  // ── health pickups ─────────────────────────────────────────────────────────

  private _spawnHealthPickup(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * (ARENA_RADIUS * 0.5);
    const pos = new THREE.Vector3(Math.cos(angle) * dist, 0.8, Math.sin(angle) * dist);
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3),
      new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 2.0, toneMapped: false })
    );
    mesh.position.copy(pos);
    this._scene.add(mesh);
    this._healthPickups.push({ mesh, pos });
  }

  private _spawnRandomPowerUp(): void {
    const types = ["health", "bt_refill", "damage_boost", "shield"];
    const type = types[Math.floor(Math.random() * types.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * 12;
    const pos = new THREE.Vector3(Math.cos(angle) * dist, 0.8, Math.sin(angle) * dist);

    const colors: Record<string, number> = { health: 0x00ff88, bt_refill: 0x4488ff, damage_boost: 0xff8800, shield: 0xffff44 };
    const color = colors[type] || 0x00ff88;

    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.0, toneMapped: false })
    );
    mesh.position.copy(pos); mesh.name = `powerup_${type}`;
    this._scene.add(mesh);
    this._healthPickups.push({ mesh, pos });
  }

  private _updateHealthPickups(): void {
    for (let i = this._healthPickups.length - 1; i >= 0; i--) {
      const hp = this._healthPickups[i];
      hp.mesh.rotation.y += this._dt * 3;
      hp.mesh.position.y = 0.8 + Math.sin(this._time * 2 + hp.pos.x) * 0.2;

      if (this._playerPos.distanceTo(hp.pos) < 1.5) {
        const type = hp.mesh.name.replace("powerup_", "");
        this._scene.remove(hp.mesh); hp.mesh.geometry.dispose(); (hp.mesh.material as THREE.Material).dispose();
        this._healthPickups.splice(i, 1);
        this._spawnSparks(hp.pos, 0x00ff44, 10);

        if (type === "bt_refill") {
          this._btEnergy = BT_MAX_ENERGY;
          this._addScore(50);
          this._playSound(400, 0.12, "sine", 0.2);
          setTimeout(() => this._playSound(600, 0.1, "sine", 0.15), 80);
        } else if (type === "damage_boost") {
          // temporary score doubler for 5 seconds — simplified as immediate 500 pts
          this._score += 500;
          this._playSound(500, 0.12, "sine", 0.2);
          setTimeout(() => this._playSound(700, 0.1, "sine", 0.15), 80);
        } else if (type === "shield") {
          this._invulnTimer = 3.0; // 3 seconds invulnerability
          this._playSound(300, 0.12, "triangle", 0.3);
          setTimeout(() => this._playSound(450, 0.1, "triangle", 0.2), 100);
        } else {
          // health
          this._playerHP = Math.min(PLAYER_HP, this._playerHP + 25);
          this._playSound(600, 0.12, "sine", 0.2);
          setTimeout(() => this._playSound(800, 0.1, "sine", 0.15), 80);
        }
      }
    }
  }

  // ── enemy death explosion ──────────────────────────────────────────────────

  private _enemyDeathExplosion(pos: THREE.Vector3): void {
    // big green spark burst
    this._spawnSparks(pos, 0x00ff44, 25);
    // temporary flash light
    const flash = new THREE.PointLight(0x00ff44, 3, 10);
    flash.position.copy(pos);
    this._scene.add(flash);
    setTimeout(() => { this._scene.remove(flash); }, 200);
    this._playSound(300, 0.15, "square", 0.2);
    setTimeout(() => this._playSound(150, 0.1, "sawtooth", 0.3), 100);
  }

  // ── high score ─────────────────────────────────────────────────────────────

  private _loadHighScore(): number {
    try { return parseInt(localStorage.getItem(`matrix_hs_${this._difficulty}`) || "0", 10); }
    catch { return 0; }
  }

  private _saveHighScore(): boolean {
    const current = this._loadHighScore();
    if (this._score > current) {
      localStorage.setItem(`matrix_hs_${this._difficulty}`, String(this._score));
      return true;
    }
    return false;
  }

  // ── ambient drone ──────────────────────────────────────────────────────────

  private _startAmbientDrone(): void {
    if (!this._audioCtx) return;
    const ctx = this._audioCtx;
    this._droneOsc = ctx.createOscillator();
    this._droneOsc.type = "sine";
    this._droneOsc.frequency.value = 55;
    const lfo = ctx.createOscillator();
    lfo.type = "sine"; lfo.frequency.value = 0.1;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 3;
    lfo.connect(lfoGain); lfoGain.connect(this._droneOsc.frequency); lfo.start();

    this._droneGain = ctx.createGain();
    this._droneGain.gain.value = 0.06;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = 120;
    this._droneOsc.connect(filter); filter.connect(this._droneGain); this._droneGain.connect(ctx.destination);
    this._droneOsc.start();
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
}
