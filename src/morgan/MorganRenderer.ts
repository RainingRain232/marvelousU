// ---------------------------------------------------------------------------
// Morgan -- 3D Renderer (Three.js)
// Rich atmospheric castle interiors: procedural stone textures, normal maps,
// volumetric particles, spell VFX trails, environmental props (banners,
// chandeliers, weapon racks, cobwebs, chains), camera shake, guard death
// dissolve, footstep dust, enhanced post-processing (bloom, vignette,
// chromatic aberration, color grading), animated player & guards.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import {
  CELL_SIZE, FLOOR_W, FLOOR_H, TileType, GuardState, GuardType, PickupType,
  CAM_HEIGHT, CAM_DISTANCE, CAM_LERP, TORCH_RANGE,
  SLEEP_MIST_RADIUS,
} from "./MorganConfig";
import { v2Dist, type MorganGameState, type Guard, type Artifact, type Pickup, type Trap } from "./MorganState";

// ---------------------------------------------------------------------------
// Procedural texture generators
// ---------------------------------------------------------------------------

function createStoneTexture(w: number, h: number, baseR: number, baseG: number, baseB: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
  ctx.fillRect(0, 0, w, h);
  // Stone blocks with mortar lines
  const bw = w / 4, bh = h / 4;
  for (let by = 0; by < 4; by++) {
    for (let bx = 0; bx < 4; bx++) {
      const ox = (by % 2) * bw * 0.5; // offset alternating rows
      const x = bx * bw + ox;
      const y = by * bh;
      // Each block slightly different shade
      const shade = 0.85 + Math.random() * 0.3;
      ctx.fillStyle = `rgb(${(baseR * shade) | 0},${(baseG * shade) | 0},${(baseB * shade) | 0})`;
      ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      // Noise grain
      for (let i = 0; i < 30; i++) {
        const nx = x + Math.random() * bw;
        const ny = y + Math.random() * bh;
        const a = Math.random() * 0.15;
        ctx.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.5})`;
        ctx.fillRect(nx, ny, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
    }
    // Horizontal mortar
    ctx.fillStyle = `rgb(${(baseR * 0.5) | 0},${(baseG * 0.5) | 0},${(baseB * 0.5) | 0})`;
    ctx.fillRect(0, by * bh, w, 1);
  }
  // Vertical mortar
  for (let by = 0; by < 4; by++) {
    const ox = (by % 2) * bw * 0.5;
    for (let bx = 0; bx <= 4; bx++) {
      ctx.fillStyle = `rgb(${(baseR * 0.5) | 0},${(baseG * 0.5) | 0},${(baseB * 0.5) | 0})`;
      ctx.fillRect(bx * bw + ox, by * bh, 1, bh);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createNormalMapFromCanvas(base: THREE.CanvasTexture, strength = 2): THREE.CanvasTexture {
  const src = base.image as HTMLCanvasElement;
  const w = src.width, h = src.height;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const srcCtx = src.getContext("2d")!;
  const data = srcCtx.getImageData(0, 0, w, h).data;
  const out = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const l = x > 0 ? data[((y * w + x - 1) * 4)] : data[idx];
      const r = x < w - 1 ? data[((y * w + x + 1) * 4)] : data[idx];
      const u = y > 0 ? data[(((y - 1) * w + x) * 4)] : data[idx];
      const d = y < h - 1 ? data[(((y + 1) * w + x) * 4)] : data[idx];
      out.data[idx] = 128 + (l - r) * strength;
      out.data[idx + 1] = 128 + (u - d) * strength;
      out.data[idx + 2] = 255;
      out.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createFloorTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1a1a2a";
  ctx.fillRect(0, 0, 128, 128);
  // Flagstone pattern
  const tiles = [[0, 0, 64, 64], [64, 0, 64, 64], [0, 64, 42, 64], [42, 64, 44, 64], [86, 64, 42, 64]];
  for (const [x, y, w, h] of tiles) {
    const shade = 0.9 + Math.random() * 0.2;
    ctx.fillStyle = `rgb(${(26 * shade) | 0},${(26 * shade) | 0},${(42 * shade) | 0})`;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    // Wear marks
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
      ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
  }
  // Grout
  ctx.fillStyle = "rgba(10,10,15,0.8)";
  ctx.fillRect(0, 0, 128, 1); ctx.fillRect(0, 64, 128, 1);
  ctx.fillRect(0, 0, 1, 128); ctx.fillRect(64, 0, 1, 64);
  ctx.fillRect(42, 64, 1, 64); ctx.fillRect(86, 64, 1, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createCeilingTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#121218";
  ctx.fillRect(0, 0, 64, 64);
  // Wooden beam pattern
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = `rgb(${30 + Math.random() * 10},${22 + Math.random() * 8},${15 + Math.random() * 6})`;
    ctx.fillRect(0, i * 22, 64, 4);
  }
  // Cobweb hints
  for (let i = 0; i < 8; i++) {
    ctx.strokeStyle = `rgba(80,80,90,${Math.random() * 0.15})`;
    ctx.beginPath();
    ctx.moveTo(Math.random() * 64, Math.random() * 64);
    ctx.lineTo(Math.random() * 64, Math.random() * 64);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ---------------------------------------------------------------------------
// Combined post-processing shader: vignette + chromatic aberration + color grading
// ---------------------------------------------------------------------------
const FinalShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    darkness: { value: 0.55 },
    offset: { value: 0.75 },
    damageFlash: { value: 0.0 },
    hpRatio: { value: 1.0 },
    time: { value: 0.0 },
    chromaticAberration: { value: 0.003 },
    cloaked: { value: 0.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float darkness, offset, damageFlash, hpRatio, time, chromaticAberration, cloaked;
    varying vec2 vUv;
    void main(){
      vec2 uv = vUv;
      // Chromatic aberration
      float ca = chromaticAberration * (1.0 + damageFlash * 3.0);
      vec2 dir = (uv - 0.5) * ca;
      float r = texture2D(tDiffuse, uv + dir).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - dir).b;
      vec3 col = vec3(r, g, b);
      // Vignette
      vec2 vc = (uv - 0.5) * 2.0;
      float vig = 1.0 - smoothstep(offset, offset + 0.65, length(vc));
      col *= mix(1.0, vig, darkness);
      // Low HP red pulse at edges
      float hpPulse = (1.0 - hpRatio) * 0.4 * (0.6 + 0.4 * sin(time * 4.0));
      float edgeDist = length(vc);
      col.r += hpPulse * smoothstep(0.4, 1.2, edgeDist);
      // Damage flash
      col.r += damageFlash * 0.35;
      col.g += damageFlash * 0.05;
      // Color grading: cool shadows, warm highlights
      col.b += (1.0 - col.r) * 0.04; // blue push in darks
      col.r += col.r * 0.03; // slight warmth in brights
      // Cloaked desaturation + purple tint
      if (cloaked > 0.0) {
        float grey = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(col, vec3(grey * 0.7, grey * 0.5, grey * 1.0), cloaked * 0.5);
      }
      // Film grain
      float grain = (fract(sin(dot(uv * time * 0.01, vec2(12.9898,78.233))) * 43758.5453) - 0.5) * 0.04;
      col += grain;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
const GUARD_COLOR = 0xcc3333;
const GUARD_ALERT_COLOR = 0xff4444;
const GUARD_SLEEP_COLOR = 0x6666aa;
const BOSS_COLOR = 0xff0000;
const HEAVY_COLOR = 0x666688;
const MAGE_COLOR = 0x4444cc;
const HOUND_COLOR = 0x885522;
const PLAYER_COLOR = 0x6633cc;
const PLAYER_CLOAK_COLOR = 0x220066;
const BOLT_COLOR = 0x8844ff;
const FIREBALL_COLOR = 0xff6600;
const MIST_COLOR = 0x4466aa;
const DECOY_COLOR = 0xaa66ff;
const TRAP_WARD_COLOR = 0xff4400;
const EXIT_COLOR = 0x00ff88;

const ARTIFACT_COLORS: Record<string, number> = {
  chalice: 0xffd700, scroll: 0xeeddaa, amulet: 0x44ddff, crystal: 0xff44ff, tome: 0x66ff66,
};
const PICKUP_COLORS: Record<string, number> = {
  [PickupType.HEALTH_POTION]: 0xff3333,
  [PickupType.MANA_POTION]: 0x4444ff,
  [PickupType.KEY]: 0xffd700,
};

const DUST_COUNT = 200;
const SPARK_COUNT = 60;
const SPELL_TRAIL_COUNT = 80;
const CLOAK_PARTICLE_COUNT = 50;
const DEATH_PARTICLE_COUNT = 60;
const FOOTSTEP_POOL = 30;

export class MorganRenderer {
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _composer!: EffectComposer;
  private _canvas!: HTMLCanvasElement;
  private _finalPass!: ShaderPass;

  // Groups
  private _mapGroup = new THREE.Group();
  private _propsGroup = new THREE.Group();
  private _entityGroup = new THREE.Group();
  private _fxGroup = new THREE.Group();

  // Textures
  private _wallTex!: THREE.CanvasTexture;
  private _wallNormal!: THREE.CanvasTexture;
  private _floorTex!: THREE.CanvasTexture;
  private _floorNormal!: THREE.CanvasTexture;
  private _ceilTex!: THREE.CanvasTexture;

  // Player
  private _playerMesh!: THREE.Group;
  private _playerBody!: THREE.Mesh;
  private _playerCloak!: THREE.Mesh;
  private _playerStaff!: THREE.Mesh;
  private _playerLight!: THREE.PointLight;
  private _staffCrystal!: THREE.Mesh;
  private _playerShadow!: THREE.Mesh; // blob shadow on floor

  // Guards
  private _guardMeshes = new Map<number, THREE.Group>();
  private _guardDetectionBars = new Map<number, THREE.Mesh>();

  // Artifacts / pickups / traps
  private _artifactMeshes = new Map<number, THREE.Group>();
  private _pickupMeshes = new Map<number, THREE.Group>();
  private _trapMeshes = new Map<number, THREE.Group>();

  // Loot / corpses
  private _lootMeshes = new Map<number, THREE.Group>();
  private _corpseMeshes: THREE.Group[] = [];

  // Projectiles
  private _boltPool: THREE.Mesh[] = [];
  private _boltLights: THREE.PointLight[] = [];
  private _boltTrailPool: THREE.Mesh[] = []; // trail segments behind bolts
  private _fireballPool: THREE.Mesh[] = [];
  private _fireballLights: THREE.PointLight[] = [];

  // FX pools
  private _mistMeshes: THREE.Mesh[] = [];
  private _decoyMeshes: THREE.Mesh[] = [];
  private _torchLights: THREE.PointLight[] = [];
  private _torchFlames: THREE.Mesh[] = [];
  private _torchSmoke: THREE.Points[] = [];
  private _soundRingPool: THREE.Mesh[] = [];

  // Particle systems
  private _dustParticles!: THREE.Points;
  private _dustPositions!: Float32Array;
  private _dustVelocities!: Float32Array;
  private _sparkParticles!: THREE.Points;
  private _sparkPositions!: Float32Array;
  private _sparkVelocities!: Float32Array;
  private _spellTrailParticles!: THREE.Points;
  private _spellTrailPositions!: Float32Array;
  private _spellTrailAlphas!: Float32Array;
  private _spellTrailIdx = 0;
  private _cloakParticles!: THREE.Points;
  private _cloakPositions!: Float32Array;
  private _deathParticles!: THREE.Points;
  private _deathPositions!: Float32Array;
  private _deathVelocities!: Float32Array;
  private _deathAlphas!: Float32Array;
  private _footstepPool: THREE.Mesh[] = [];
  private _footstepIdx = 0;
  private _footstepTimer = 0;

  // Exit
  private _exitMarker!: THREE.Group;
  private _exitParticles!: THREE.Points;
  private _exitParticlePositions!: Float32Array;

  // Boss VFX
  private _bossAuraLight: THREE.PointLight | null = null;
  private _shockwaveRing: THREE.Mesh | null = null;
  private _shockwaveTimer = 0;

  // Detection
  private _detectionRing!: THREE.Mesh;

  // Camera
  private _camTarget = new THREE.Vector3();
  private _camPos = new THREE.Vector3();
  private _camShake = new THREE.Vector3();
  private _camShakeIntensity = 0;

  private _time = 0;
  private _prevHP = 100;
  private _prevGuardHPs = new Map<number, number>();

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  init(): void {
    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:5;";
    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._canvas);

    this._renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true, powerPreference: "high-performance" });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 0.7;

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x030308);
    this._scene.fog = new THREE.FogExp2(0x030308, 0.038);

    this._camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.3, 200);

    // Generate textures
    this._wallTex = createStoneTexture(128, 128, 42, 42, 58);
    this._wallNormal = createNormalMapFromCanvas(this._wallTex, 3);
    this._floorTex = createFloorTexture();
    this._floorNormal = createNormalMapFromCanvas(this._floorTex, 2);
    this._ceilTex = createCeilingTexture();

    // Post-processing
    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(new RenderPass(this._scene, this._camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.75);
    this._composer.addPass(bloom);
    this._finalPass = new ShaderPass(FinalShader);
    this._composer.addPass(this._finalPass);
    this._composer.addPass(new OutputPass());

    // Lighting
    this._scene.add(new THREE.AmbientLight(0x0a0a22, 0.2));
    const moon = new THREE.DirectionalLight(0x334488, 0.08);
    moon.position.set(20, 40, 10);
    this._scene.add(moon);
    // Hemisphere for subtle indirect fill
    this._scene.add(new THREE.HemisphereLight(0x111133, 0x050510, 0.12));

    this._scene.add(this._mapGroup);
    this._scene.add(this._propsGroup);
    this._scene.add(this._entityGroup);
    this._scene.add(this._fxGroup);

    this._createPlayerMesh();
    this._createProjectilePools();
    this._createExitMarker();
    this._createDetectionRing();
    this._createParticleSystems();
    this._createSoundRingPool();
    this._createFootstepPool();

    // Boss VFX
    this._shockwaveRing = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 1.0, 72),
      new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    this._shockwaveRing.rotation.x = -Math.PI / 2;
    this._shockwaveRing.visible = false;
    this._fxGroup.add(this._shockwaveRing);
    this._bossAuraLight = new THREE.PointLight(0xff2200, 0, 10);
    this._bossAuraLight.position.y = 1.5;
    this._scene.add(this._bossAuraLight);

    window.addEventListener("resize", this._onResize);
  }

  // ---------------------------------------------------------------------------
  // Player mesh: detailed Morgan le Fay with animated parts
  // ---------------------------------------------------------------------------
  private _createPlayerMesh(): void {
    this._playerMesh = new THREE.Group();

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2a, roughness: 0.8 });
    const legGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.7, 36);
    const legL = new THREE.Mesh(legGeo, legMat); legL.position.set(-0.12, 0.35, 0);
    const legR = new THREE.Mesh(legGeo, legMat); legR.position.set(0.12, 0.35, 0);
    this._playerMesh.add(legL, legR);

    // Body (torso)
    const bodyGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.8, 44);
    this._playerBody = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
      color: PLAYER_COLOR, roughness: 0.5, metalness: 0.15,
    }));
    this._playerBody.position.y = 1.1;
    this._playerBody.castShadow = true;
    this._playerMesh.add(this._playerBody);

    // Shoulders
    const shoulderGeo = new THREE.SphereGeometry(0.14, 40, 32);
    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x553388, roughness: 0.5, metalness: 0.2 });
    const shL = new THREE.Mesh(shoulderGeo, shoulderMat); shL.position.set(-0.3, 1.4, 0);
    const shR = new THREE.Mesh(shoulderGeo, shoulderMat); shR.position.set(0.3, 1.4, 0);
    this._playerMesh.add(shL, shR);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.6, 36);
    const armL = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: 0xccaa88, roughness: 0.7 }));
    armL.position.set(-0.35, 1.05, 0); armL.rotation.z = 0.15;
    const armR = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: 0xccaa88, roughness: 0.7 }));
    armR.position.set(0.35, 1.05, 0); armR.rotation.z = -0.15;
    this._playerMesh.add(armL, armR);

    // Neck
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.15, 40),
      new THREE.MeshStandardMaterial({ color: 0xddbb99 }));
    neck.position.y = 1.57;
    this._playerMesh.add(neck);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 52, 44),
      new THREE.MeshStandardMaterial({ color: 0xddbb99, roughness: 0.6 }));
    head.position.y = 1.78;
    head.castShadow = true;
    this._playerMesh.add(head);

    // Hair (flowing)
    const hairGeo = new THREE.SphereGeometry(0.25, 44, 36, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hair = new THREE.Mesh(hairGeo, new THREE.MeshStandardMaterial({ color: 0x0a0520, roughness: 0.95 }));
    hair.position.y = 1.83;
    this._playerMesh.add(hair);
    // Hair back (long flowing down)
    const hairBack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.02, 0.8, 36),
      new THREE.MeshStandardMaterial({ color: 0x0a0520, roughness: 0.95 }));
    hairBack.position.set(0, 1.4, -0.15);
    this._playerMesh.add(hairBack);

    // Cloak (layered for depth)
    const cloakGeo = new THREE.ConeGeometry(0.7, 1.8, 48, 3, true);
    this._playerCloak = new THREE.Mesh(cloakGeo, new THREE.MeshStandardMaterial({
      color: 0x1a0033, roughness: 0.85, transparent: true, opacity: 0.88,
      side: THREE.DoubleSide,
    }));
    this._playerCloak.position.y = 0.9;
    this._playerMesh.add(this._playerCloak);
    // Cloak collar
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.04, 24, 48),
      new THREE.MeshStandardMaterial({ color: 0x553388, metalness: 0.3 }));
    collar.position.y = 1.5;
    collar.rotation.x = Math.PI / 2;
    this._playerMesh.add(collar);

    // Staff
    const staffGeo = new THREE.CylinderGeometry(0.025, 0.04, 2.2, 40);
    this._playerStaff = new THREE.Mesh(staffGeo, new THREE.MeshStandardMaterial({
      color: 0x44220a, roughness: 0.7, metalness: 0.1,
    }));
    this._playerStaff.position.set(0.42, 1.1, 0);
    this._playerMesh.add(this._playerStaff);
    // Staff rings
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x886644, metalness: 0.6 });
    for (let r = 0; r < 3; r++) {
      const sr = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 20, 40), ringMat);
      sr.position.set(0.42, 1.5 + r * 0.25, 0);
      sr.rotation.x = Math.PI / 2;
      this._playerMesh.add(sr);
    }

    // Staff crystal (bigger, multi-layered)
    const crystalOuter = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 4),
      new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x8844ff, emissiveIntensity: 2.5, transparent: true, opacity: 0.7 }));
    crystalOuter.position.set(0.42, 2.3, 0);
    this._playerMesh.add(crystalOuter);
    this._staffCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.1, 4),
      new THREE.MeshStandardMaterial({ color: 0xcc88ff, emissive: 0xaa66ff, emissiveIntensity: 4.0 }));
    this._staffCrystal.position.set(0.42, 2.3, 0);
    this._playerMesh.add(this._staffCrystal);

    // Player light
    this._playerLight = new THREE.PointLight(0x6633cc, 0.6, 7);
    this._playerLight.position.y = 2.0;
    this._playerMesh.add(this._playerLight);

    // Blob shadow on floor
    const shadowGeo = new THREE.CircleGeometry(0.5, 56);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 });
    this._playerShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this._playerShadow.rotation.x = -Math.PI / 2;
    this._playerShadow.position.y = 0.02;
    this._entityGroup.add(this._playerShadow);

    this._entityGroup.add(this._playerMesh);
  }

  // ---------------------------------------------------------------------------
  // Projectile pools with trail geometry
  // ---------------------------------------------------------------------------
  private _createProjectilePools(): void {
    // Dark bolts: core + outer glow + trail segments
    const boltCore = new THREE.SphereGeometry(0.15, 44, 38);
    const boltGlow = new THREE.SphereGeometry(0.3, 40, 34);
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(boltCore, new THREE.MeshStandardMaterial({
        color: 0xccaaff, emissive: 0xccaaff, emissiveIntensity: 5 }));
      const glow = new THREE.Mesh(boltGlow, new THREE.MeshBasicMaterial({
        color: BOLT_COLOR, transparent: true, opacity: 0.25 }));
      g.add(core, glow);
      g.visible = false;
      this._fxGroup.add(g);
      this._boltPool.push(g as unknown as THREE.Mesh); // group used as mesh slot
      const l = new THREE.PointLight(BOLT_COLOR, 1.5, 6);
      l.visible = false;
      this._fxGroup.add(l);
      this._boltLights.push(l);
      // Trail segments (small spheres that fade)
      for (let t = 0; t < 4; t++) {
        const trail = new THREE.Mesh(
          new THREE.SphereGeometry(0.08 - t * 0.015, 36, 28),
          new THREE.MeshBasicMaterial({ color: BOLT_COLOR, transparent: true, opacity: 0.4 - t * 0.1 }));
        trail.visible = false;
        this._fxGroup.add(trail);
        this._boltTrailPool.push(trail);
      }
    }
    // Fireballs: core + outer fire + smoke plume
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 40, 34),
        new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa00, emissiveIntensity: 5 }));
      const outer = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 40, 34),
        new THREE.MeshBasicMaterial({ color: FIREBALL_COLOR, transparent: true, opacity: 0.35 }));
      g.add(core, outer);
      g.visible = false;
      this._fxGroup.add(g);
      this._fireballPool.push(g as unknown as THREE.Mesh);
      const l = new THREE.PointLight(FIREBALL_COLOR, 2.0, 8);
      l.visible = false;
      this._fxGroup.add(l);
      this._fireballLights.push(l);
    }
  }

  private _createExitMarker(): void {
    this._exitMarker = new THREE.Group();
    // Outer ring
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.08, 24, 64),
      new THREE.MeshStandardMaterial({ color: EXIT_COLOR, emissive: EXIT_COLOR, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 }));
    ring1.rotation.x = Math.PI / 2; ring1.position.y = 1.0;
    this._exitMarker.add(ring1);
    // Inner ring (counter-rotating)
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.06, 24, 56),
      new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x44ffaa, emissiveIntensity: 1.0, transparent: true, opacity: 0.5 }));
    ring2.rotation.x = Math.PI / 2; ring2.position.y = 1.0;
    this._exitMarker.add(ring2);
    // Portal fill
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 64),
      new THREE.MeshBasicMaterial({ color: EXIT_COLOR, transparent: true, opacity: 0.1, side: THREE.DoubleSide }));
    fill.rotation.x = Math.PI / 2; fill.position.y = 1.0;
    this._exitMarker.add(fill);
    // Light
    const el = new THREE.PointLight(EXIT_COLOR, 1.2, 10);
    el.position.y = 1.5;
    this._exitMarker.add(el);
    // Swirling particles
    const epCount = 30;
    this._exitParticlePositions = new Float32Array(epCount * 3);
    const epGeo = new THREE.BufferGeometry();
    for (let i = 0; i < epCount; i++) {
      const a = (i / epCount) * Math.PI * 2;
      this._exitParticlePositions[i * 3] = Math.cos(a) * 0.9;
      this._exitParticlePositions[i * 3 + 1] = 1.0;
      this._exitParticlePositions[i * 3 + 2] = Math.sin(a) * 0.9;
    }
    epGeo.setAttribute("position", new THREE.BufferAttribute(this._exitParticlePositions, 3));
    this._exitParticles = new THREE.Points(epGeo,
      new THREE.PointsMaterial({ color: EXIT_COLOR, size: 0.08, transparent: true, opacity: 0.7 }));
    this._exitMarker.add(this._exitParticles);
    this._entityGroup.add(this._exitMarker);
  }

  private _createDetectionRing(): void {
    const geo = new THREE.RingGeometry(1.3, 1.5, 96);
    this._detectionRing = new THREE.Mesh(geo,
      new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    this._detectionRing.rotation.x = -Math.PI / 2;
    this._entityGroup.add(this._detectionRing);
  }

  // ---------------------------------------------------------------------------
  // Particle systems
  // ---------------------------------------------------------------------------
  private _createParticleSystems(): void {
    // Dust motes
    this._dustPositions = new Float32Array(DUST_COUNT * 3);
    this._dustVelocities = new Float32Array(DUST_COUNT * 3);
    const dustGeo = new THREE.BufferGeometry();
    for (let i = 0; i < DUST_COUNT; i++) {
      this._dustPositions[i * 3] = Math.random() * FLOOR_W * CELL_SIZE;
      this._dustPositions[i * 3 + 1] = 0.3 + Math.random() * 2.5;
      this._dustPositions[i * 3 + 2] = Math.random() * FLOOR_H * CELL_SIZE;
      this._dustVelocities[i * 3] = (Math.random() - 0.5) * 0.2;
      this._dustVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      this._dustVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(this._dustPositions, 3));
    this._dustParticles = new THREE.Points(dustGeo,
      new THREE.PointsMaterial({ color: 0x8888aa, size: 0.05, transparent: true, opacity: 0.25 }));
    this._fxGroup.add(this._dustParticles);

    // Torch sparks
    this._sparkPositions = new Float32Array(SPARK_COUNT * 3);
    this._sparkVelocities = new Float32Array(SPARK_COUNT * 3);
    const sparkGeo = new THREE.BufferGeometry();
    for (let i = 0; i < SPARK_COUNT; i++) {
      this._sparkPositions[i * 3 + 1] = -10;
    }
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(this._sparkPositions, 3));
    this._sparkParticles = new THREE.Points(sparkGeo,
      new THREE.PointsMaterial({ color: 0xffaa44, size: 0.08, transparent: true, opacity: 0.9 }));
    this._fxGroup.add(this._sparkParticles);

    // Spell trail particles (for dark bolts)
    this._spellTrailPositions = new Float32Array(SPELL_TRAIL_COUNT * 3);
    this._spellTrailAlphas = new Float32Array(SPELL_TRAIL_COUNT);
    const trailGeo = new THREE.BufferGeometry();
    for (let i = 0; i < SPELL_TRAIL_COUNT; i++) {
      this._spellTrailPositions[i * 3 + 1] = -20;
    }
    trailGeo.setAttribute("position", new THREE.BufferAttribute(this._spellTrailPositions, 3));
    this._spellTrailParticles = new THREE.Points(trailGeo,
      new THREE.PointsMaterial({ color: 0xaa66ff, size: 0.07, transparent: true, opacity: 0.6 }));
    this._fxGroup.add(this._spellTrailParticles);

    // Cloak swirl particles
    this._cloakPositions = new Float32Array(CLOAK_PARTICLE_COUNT * 3);
    const cloakGeo = new THREE.BufferGeometry();
    for (let i = 0; i < CLOAK_PARTICLE_COUNT; i++) this._cloakPositions[i * 3 + 1] = -20;
    cloakGeo.setAttribute("position", new THREE.BufferAttribute(this._cloakPositions, 3));
    this._cloakParticles = new THREE.Points(cloakGeo,
      new THREE.PointsMaterial({ color: 0x4422aa, size: 0.06, transparent: true, opacity: 0.4 }));
    this._fxGroup.add(this._cloakParticles);

    // Death dissolve particles
    this._deathPositions = new Float32Array(DEATH_PARTICLE_COUNT * 3);
    this._deathVelocities = new Float32Array(DEATH_PARTICLE_COUNT * 3);
    this._deathAlphas = new Float32Array(DEATH_PARTICLE_COUNT);
    const deathGeo = new THREE.BufferGeometry();
    for (let i = 0; i < DEATH_PARTICLE_COUNT; i++) this._deathPositions[i * 3 + 1] = -20;
    deathGeo.setAttribute("position", new THREE.BufferAttribute(this._deathPositions, 3));
    this._deathParticles = new THREE.Points(deathGeo,
      new THREE.PointsMaterial({ color: 0xff4444, size: 0.1, transparent: true, opacity: 0.8 }));
    this._fxGroup.add(this._deathParticles);
  }

  private _createSoundRingPool(): void {
    for (let i = 0; i < 8; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.65, 72),
        new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      this._fxGroup.add(ring);
      this._soundRingPool.push(ring);
    }
  }

  private _createFootstepPool(): void {
    const geo = new THREE.CircleGeometry(0.15, 44);
    const mat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    for (let i = 0; i < FOOTSTEP_POOL; i++) {
      const m = new THREE.Mesh(geo, mat.clone());
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      this._fxGroup.add(m);
      this._footstepPool.push(m);
    }
  }

  // ---------------------------------------------------------------------------
  // Build level geometry with textured walls/floors
  // ---------------------------------------------------------------------------
  buildLevel(state: MorganGameState): void {
    while (this._mapGroup.children.length) this._mapGroup.remove(this._mapGroup.children[0]);
    while (this._propsGroup.children.length) this._propsGroup.remove(this._propsGroup.children[0]);
    this._guardMeshes.forEach(m => this._entityGroup.remove(m));
    this._guardMeshes.clear();
    this._guardDetectionBars.forEach(m => { if (m.parent) m.parent.parent?.remove(m.parent); });
    this._guardDetectionBars.clear();
    this._artifactMeshes.forEach(m => this._entityGroup.remove(m));
    this._artifactMeshes.clear();
    this._pickupMeshes.forEach(m => this._entityGroup.remove(m));
    this._pickupMeshes.clear();
    this._trapMeshes.forEach(m => this._entityGroup.remove(m));
    this._trapMeshes.clear();
    this._lootMeshes.forEach(m => this._fxGroup.remove(m));
    this._lootMeshes.clear();
    this._corpseMeshes.forEach(m => this._entityGroup.remove(m));
    this._corpseMeshes = [];
    this._torchLights.forEach(l => this._scene.remove(l));
    this._torchLights = [];
    this._torchFlames = [];
    this._torchSmoke.forEach(s => this._fxGroup.remove(s));
    this._torchSmoke = [];
    this._mistMeshes.forEach(m => this._fxGroup.remove(m));
    this._mistMeshes = [];
    this._decoyMeshes.forEach(m => this._fxGroup.remove(m));
    this._decoyMeshes = [];
    this._prevHP = state.player.hp;
    this._prevGuardHPs.clear();
    for (const g of state.guards) this._prevGuardHPs.set(g.id, g.hp);

    // Materials with procedural textures
    const wallMat = new THREE.MeshStandardMaterial({
      map: this._wallTex, normalMap: this._wallNormal, normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: 0.82, metalness: 0.05 });
    const floorMat = new THREE.MeshStandardMaterial({
      map: this._floorTex, normalMap: this._floorNormal, normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.88 });
    const shadowFloorMat = new THREE.MeshStandardMaterial({
      map: this._floorTex, normalMap: this._floorNormal, normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.95, color: 0x666688 }); // tinted darker
    const ceilMat = new THREE.MeshStandardMaterial({
      map: this._ceilTex, roughness: 0.95, side: THREE.DoubleSide });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.6, metalness: 0.05 });
    const lockedDoorMat = new THREE.MeshStandardMaterial({ color: 0x886633, roughness: 0.4, metalness: 0.35 });

    const wallGeo = new THREE.BoxGeometry(CELL_SIZE, 3, CELL_SIZE, 3, 4, 3);
    const floorGeo = new THREE.BoxGeometry(CELL_SIZE, 0.2, CELL_SIZE, 3, 1, 3);
    const doorGeo = new THREE.BoxGeometry(CELL_SIZE * 0.15, 2.5, CELL_SIZE, 2, 4, 3);

    // Ceiling
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(FLOOR_W * CELL_SIZE, FLOOR_H * CELL_SIZE, 8, 8), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(FLOOR_W * CELL_SIZE / 2, 3, FLOOR_H * CELL_SIZE / 2);
    this._mapGroup.add(ceil);

    for (let y = 0; y < FLOOR_H; y++) {
      for (let x = 0; x < FLOOR_W; x++) {
        const tile = state.tiles[y][x];
        const wx = x * CELL_SIZE + CELL_SIZE / 2;
        const wz = y * CELL_SIZE + CELL_SIZE / 2;

        switch (tile) {
          case TileType.WALL: {
            const m = new THREE.Mesh(wallGeo, wallMat);
            m.position.set(wx, 1.5, wz);
            m.castShadow = true; m.receiveShadow = true;
            this._mapGroup.add(m);
            break;
          }
          case TileType.FLOOR: case TileType.EXIT: case TileType.TRAP_PRESSURE: case TileType.TRAP_WARD: {
            const m = new THREE.Mesh(floorGeo, floorMat);
            m.position.set(wx, 0, wz);
            m.receiveShadow = true;
            this._mapGroup.add(m);
            break;
          }
          case TileType.WATER: {
            // Water surface: reflective rippling plane
            const waterMat = new THREE.MeshStandardMaterial({
              color: 0x1a3355, roughness: 0.15, metalness: 0.6,
              transparent: true, opacity: 0.8 });
            const wm = new THREE.Mesh(floorGeo, waterMat);
            wm.position.set(wx, -0.05, wz);
            wm.receiveShadow = true;
            this._mapGroup.add(wm);
            // Ripple rings on surface
            for (let ri = 0; ri < 2; ri++) {
              const ripple = new THREE.Mesh(
                new THREE.RingGeometry(0.15 + ri * 0.25, 0.2 + ri * 0.25, 56),
                new THREE.MeshBasicMaterial({ color: 0x3366aa, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
              ripple.rotation.x = -Math.PI / 2;
              ripple.position.set(wx + (Math.random() - 0.5) * 0.5, 0.02, wz + (Math.random() - 0.5) * 0.5);
              this._propsGroup.add(ripple);
            }
            // Depth darkening underneath
            const depth = new THREE.Mesh(floorGeo,
              new THREE.MeshStandardMaterial({ color: 0x0a1a2a, roughness: 0.95 }));
            depth.position.set(wx, -0.15, wz);
            this._mapGroup.add(depth);
            break;
          }
          case TileType.FIRE_GRATE: {
            // Metal grate floor
            const grateMat = new THREE.MeshStandardMaterial({
              color: 0x333333, roughness: 0.3, metalness: 0.8 });
            const gm = new THREE.Mesh(floorGeo, grateMat);
            gm.position.set(wx, 0, wz);
            gm.receiveShadow = true;
            this._mapGroup.add(gm);
            // Grate bars
            const barMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 });
            for (let bi = 0; bi < 4; bi++) {
              const bar = new THREE.Mesh(
                new THREE.BoxGeometry(CELL_SIZE, 0.04, 0.04),
                barMat);
              bar.position.set(wx, 0.12, wz - CELL_SIZE * 0.3 + bi * CELL_SIZE * 0.2);
              this._mapGroup.add(bar);
            }
            // Fire glow underneath
            const fireGlow = new THREE.PointLight(0xff4400, 0.8, 3, 2);
            fireGlow.position.set(wx, -0.3, wz);
            this._scene.add(fireGlow);
            this._torchLights.push(fireGlow); // reuse for cleanup
            // Fire particles rising through grate
            const firePartCount = 6;
            const firePartPos = new Float32Array(firePartCount * 3);
            const firePartGeo = new THREE.BufferGeometry();
            for (let fi = 0; fi < firePartCount; fi++) {
              firePartPos[fi * 3] = wx + (Math.random() - 0.5) * CELL_SIZE * 0.6;
              firePartPos[fi * 3 + 1] = 0.1 + Math.random() * 0.4;
              firePartPos[fi * 3 + 2] = wz + (Math.random() - 0.5) * CELL_SIZE * 0.6;
            }
            firePartGeo.setAttribute("position", new THREE.BufferAttribute(firePartPos, 3));
            const fireParts = new THREE.Points(firePartGeo,
              new THREE.PointsMaterial({ color: 0xff6622, size: 0.1, transparent: true, opacity: 0.7 }));
            this._fxGroup.add(fireParts);
            this._torchSmoke.push(fireParts); // reuse for animation
            break;
          }
          case TileType.SHADOW: {
            const m = new THREE.Mesh(floorGeo, shadowFloorMat);
            m.position.set(wx, 0, wz);
            m.receiveShadow = true;
            this._mapGroup.add(m);
            // Shadow ground fog
            const fogGeo = new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE);
            const fog = new THREE.Mesh(fogGeo, new THREE.MeshBasicMaterial({
              color: 0x110022, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
            fog.rotation.x = -Math.PI / 2;
            fog.position.set(wx, 0.12, wz);
            this._propsGroup.add(fog);
            break;
          }
          case TileType.DOOR: {
            this._mapGroup.add(new THREE.Mesh(floorGeo, floorMat).translateX(wx).translateZ(wz));
            const d = new THREE.Mesh(doorGeo, doorMat);
            d.position.set(wx, 1.25, wz);
            // Door frame posts
            const postGeo = new THREE.BoxGeometry(0.1, 2.5, 0.1);
            const postMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.7 });
            const p1 = new THREE.Mesh(postGeo, postMat); p1.position.set(wx - CELL_SIZE * 0.45, 1.25, wz);
            const p2 = new THREE.Mesh(postGeo, postMat); p2.position.set(wx + CELL_SIZE * 0.45, 1.25, wz);
            this._mapGroup.add(d, p1, p2);
            break;
          }
          case TileType.LOCKED_DOOR: {
            this._mapGroup.add(new THREE.Mesh(floorGeo, floorMat).translateX(wx).translateZ(wz));
            const d = new THREE.Mesh(doorGeo, lockedDoorMat);
            d.position.set(wx, 1.25, wz);
            // Iron bands
            const bandGeo = new THREE.BoxGeometry(CELL_SIZE * 0.18, 0.06, CELL_SIZE * 1.02);
            const bandMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.3 });
            const b1 = new THREE.Mesh(bandGeo, bandMat); b1.position.set(wx, 0.8, wz);
            const b2 = new THREE.Mesh(bandGeo, bandMat); b2.position.set(wx, 1.6, wz);
            // Lock
            const lock = new THREE.Mesh(
              new THREE.TorusGeometry(0.1, 0.025, 24, 44),
              new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.4, metalness: 0.9 }));
            lock.position.set(wx + CELL_SIZE * 0.09, 1.2, wz);
            this._mapGroup.add(d, b1, b2, lock);
            break;
          }
          case TileType.TORCH: {
            const w2 = new THREE.Mesh(wallGeo, wallMat);
            w2.position.set(wx, 1.5, wz);
            this._mapGroup.add(w2);
            // Bracket
            const bracket = new THREE.Mesh(
              new THREE.BoxGeometry(0.08, 0.08, 0.35),
              new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 }));
            bracket.position.set(wx, 1.95, wz);
            this._mapGroup.add(bracket);
            // Torch handle
            const handle = new THREE.Mesh(
              new THREE.CylinderGeometry(0.035, 0.06, 0.5, 36),
              new THREE.MeshStandardMaterial({ color: 0x886633, roughness: 0.8 }));
            handle.position.set(wx, 2.15, wz);
            this._mapGroup.add(handle);
            // Flame (multi-cone for volume)
            const flameMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 4 });
            const flame1 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 40), flameMat);
            flame1.position.set(wx, 2.48, wz);
            const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 36),
              new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa00, emissiveIntensity: 5 }));
            flame2.position.set(wx, 2.5, wz);
            this._mapGroup.add(flame1, flame2);
            this._torchFlames.push(flame1, flame2);
            // Torch light
            const light = new THREE.PointLight(0xff8844, 1.4, TORCH_RANGE * 1.6, 2);
            light.position.set(wx, 2.35, wz);
            light.castShadow = true;
            light.shadow.mapSize.set(256, 256);
            light.shadow.bias = -0.002;
            this._scene.add(light);
            this._torchLights.push(light);
            // Smoke particles above torch
            const smokeCount = 8;
            const smokePos = new Float32Array(smokeCount * 3);
            const smokeGeo = new THREE.BufferGeometry();
            for (let s = 0; s < smokeCount; s++) {
              smokePos[s * 3] = wx + (Math.random() - 0.5) * 0.2;
              smokePos[s * 3 + 1] = 2.6 + Math.random() * 0.4;
              smokePos[s * 3 + 2] = wz + (Math.random() - 0.5) * 0.2;
            }
            smokeGeo.setAttribute("position", new THREE.BufferAttribute(smokePos, 3));
            const smoke = new THREE.Points(smokeGeo,
              new THREE.PointsMaterial({ color: 0x444444, size: 0.12, transparent: true, opacity: 0.2 }));
            this._fxGroup.add(smoke);
            this._torchSmoke.push(smoke);
            break;
          }
        }
      }
    }

    this._placeProps(state);
    this._exitMarker.position.set(state.exitPos.x, 0, state.exitPos.z);

    for (const guard of state.guards) this._createGuardMesh(guard);
    for (const art of state.artifacts) this._createArtifactMesh(art);
    for (const pickup of state.pickups) this._createPickupMesh(pickup);
    for (const trap of state.traps) this._createTrapMesh(trap);
  }

  // ---------------------------------------------------------------------------
  // Environmental props: banners, chandeliers, weapon racks, cobwebs, chains, tables
  // ---------------------------------------------------------------------------
  private _placeProps(state: MorganGameState): void {
    for (let y = 1; y < FLOOR_H - 1; y++) {
      for (let x = 1; x < FLOOR_W - 1; x++) {
        if (state.tiles[y][x] !== TileType.FLOOR) continue;
        const wx = x * CELL_SIZE + CELL_SIZE / 2;
        const wz = y * CELL_SIZE + CELL_SIZE / 2;
        const r = Math.random();
        // Wall-adjacent props (check if next to a wall)
        const adjWall = (
          (x > 0 && state.tiles[y][x - 1] === TileType.WALL) ||
          (x < FLOOR_W - 1 && state.tiles[y][x + 1] === TileType.WALL) ||
          (y > 0 && state.tiles[y - 1][x] === TileType.WALL) ||
          (y < FLOOR_H - 1 && state.tiles[y + 1][x] === TileType.WALL));

        if (adjWall && r < 0.04) {
          // Banner on wall
          const bannerGeo = new THREE.PlaneGeometry(0.4, 1.2);
          const bannerColor = [0x992222, 0x222299, 0x229922, 0x992299][Math.floor(Math.random() * 4)];
          const banner = new THREE.Mesh(bannerGeo, new THREE.MeshStandardMaterial({
            color: bannerColor, roughness: 0.9, side: THREE.DoubleSide }));
          banner.position.set(wx, 1.8, wz);
          // Face away from wall
          if (x > 0 && state.tiles[y][x - 1] === TileType.WALL) banner.rotation.y = Math.PI / 2;
          else if (x < FLOOR_W - 1 && state.tiles[y][x + 1] === TileType.WALL) banner.rotation.y = -Math.PI / 2;
          else if (y > 0 && state.tiles[y - 1][x] === TileType.WALL) banner.rotation.y = Math.PI;
          // Banner pole
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.015, 0.5, 36),
            new THREE.MeshStandardMaterial({ color: 0x886644, metalness: 0.5 }));
          pole.rotation.z = Math.PI / 2;
          pole.position.set(wx, 2.45, wz);
          this._propsGroup.add(banner, pole);
        } else if (adjWall && r < 0.055) {
          // Weapon rack: crossed swords on wall
          const swordMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.8, roughness: 0.2 });
          const blade = new THREE.CylinderGeometry(0.015, 0.02, 0.8, 36);
          const s1 = new THREE.Mesh(blade, swordMat);
          s1.position.set(wx, 1.6, wz); s1.rotation.z = 0.4;
          const s2 = new THREE.Mesh(blade, swordMat);
          s2.position.set(wx, 1.6, wz); s2.rotation.z = -0.4;
          this._propsGroup.add(s1, s2);
        } else if (adjWall && r < 0.065) {
          // Chain hanging from ceiling
          const chainMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.7, roughness: 0.3 });
          for (let c = 0; c < 4; c++) {
            const link = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 20, 40), chainMat);
            link.position.set(wx, 2.8 - c * 0.2, wz);
            link.rotation.x = c % 2 === 0 ? 0 : Math.PI / 2;
            this._propsGroup.add(link);
          }
        } else if (!adjWall && r < 0.02) {
          // Pillar
          const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.25, 3, 44),
            new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.65, metalness: 0.08 }));
          pillar.position.set(wx, 1.5, wz);
          pillar.castShadow = true;
          // Pillar base
          const base = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.35, 0.15, 44),
            new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.7 }));
          base.position.set(wx, 0.08, wz);
          // Pillar capital
          const cap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.2, 0.12, 44),
            new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.7 }));
          cap.position.set(wx, 2.95, wz);
          this._propsGroup.add(pillar, base, cap);
        } else if (!adjWall && r < 0.03) {
          // Barrel stack
          const barrelMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.85 });
          const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 40), barrelMat);
          b1.position.set(wx, 0.3, wz); b1.castShadow = true;
          // Metal band
          const band = new THREE.Mesh(
            new THREE.TorusGeometry(0.26, 0.015, 20, 48),
            new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7 }));
          band.position.set(wx, 0.3, wz);
          band.rotation.x = Math.PI / 2;
          this._propsGroup.add(b1, band);
          if (Math.random() < 0.5) {
            const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 40), barrelMat);
            b2.position.set(wx + 0.35, 0.25, wz); b2.castShadow = true;
            this._propsGroup.add(b2);
          }
        } else if (!adjWall && r < 0.035) {
          // Table
          const tableMat = new THREE.MeshStandardMaterial({ color: 0x44331a, roughness: 0.8 });
          const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.6), tableMat);
          top.position.set(wx, 0.75, wz); top.castShadow = true;
          const legGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.72, 36);
          const l1 = new THREE.Mesh(legGeo, tableMat); l1.position.set(wx - 0.5, 0.36, wz - 0.22);
          const l2 = new THREE.Mesh(legGeo, tableMat); l2.position.set(wx + 0.5, 0.36, wz - 0.22);
          const l3 = new THREE.Mesh(legGeo, tableMat); l3.position.set(wx - 0.5, 0.36, wz + 0.22);
          const l4 = new THREE.Mesh(legGeo, tableMat); l4.position.set(wx + 0.5, 0.36, wz + 0.22);
          this._propsGroup.add(top, l1, l2, l3, l4);
        }
        // Cobwebs in corners (check two adjacent walls) — multi-strand
        if (x > 0 && y > 0 && state.tiles[y][x - 1] === TileType.WALL && state.tiles[y - 1][x] === TileType.WALL && Math.random() < 0.35) {
          const webMat = new THREE.MeshBasicMaterial({ color: 0x777788, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
          const vx = wx - CELL_SIZE / 2, vz = wz - CELL_SIZE / 2;
          // Main web triangle
          const webGeo = new THREE.BufferGeometry();
          webGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
            vx, 2.85, vz, vx + 0.9, 2.85, vz, vx, 2.85, vz + 0.9,
          ]), 3));
          webGeo.setIndex([0, 1, 2]);
          this._propsGroup.add(new THREE.Mesh(webGeo, webMat));
          // Web strands (lines)
          for (let ws = 0; ws < 3; ws++) {
            const strand = new THREE.BufferGeometry();
            strand.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
              vx, 2.85, vz,
              vx + Math.random() * 0.8, 2.85 - Math.random() * 0.3, vz + Math.random() * 0.8,
            ]), 3));
            const line = new THREE.Line(strand, new THREE.LineBasicMaterial({ color: 0x666677, transparent: true, opacity: 0.08 }));
            this._propsGroup.add(line);
          }
        }

        // Wall baseboard trim (stone molding at wall-floor junction)
        if (adjWall && Math.random() < 0.12) {
          const trimMat = new THREE.MeshStandardMaterial({ color: 0x252535, roughness: 0.7, metalness: 0.1 });
          // Determine which wall side
          if (x > 0 && state.tiles[y][x - 1] === TileType.WALL) {
            const trim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, CELL_SIZE * 0.9), trimMat);
            trim.position.set(wx - CELL_SIZE / 2 + 0.04, 0.18, wz);
            this._propsGroup.add(trim);
          }
          if (x < FLOOR_W - 1 && state.tiles[y][x + 1] === TileType.WALL) {
            const trim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, CELL_SIZE * 0.9), trimMat);
            trim.position.set(wx + CELL_SIZE / 2 - 0.04, 0.18, wz);
            this._propsGroup.add(trim);
          }
        }

        // Wall sconce (empty bracket, decorative)
        if (adjWall && Math.random() < 0.03) {
          const sconceMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.7, roughness: 0.3 });
          const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.25), sconceMat);
          arm.position.set(wx, 1.5, wz);
          const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.08, 32), sconceMat);
          cup.position.set(wx, 1.5, wz);
          this._propsGroup.add(arm, cup);
        }

        // Floor cracks / wear marks (subtle detail meshes)
        if (!adjWall && Math.random() < 0.04) {
          const crackMat = new THREE.MeshBasicMaterial({ color: 0x0a0a15, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
          const crackLen = 0.3 + Math.random() * 0.6;
          const crackAngle = Math.random() * Math.PI;
          const crackGeo = new THREE.PlaneGeometry(crackLen, 0.02);
          const crack = new THREE.Mesh(crackGeo, crackMat);
          crack.rotation.x = -Math.PI / 2;
          crack.rotation.z = crackAngle;
          crack.position.set(wx + (Math.random() - 0.5) * 0.8, 0.11, wz + (Math.random() - 0.5) * 0.8);
          this._propsGroup.add(crack);
        }

        // Rubble / scattered stones
        if (!adjWall && Math.random() < 0.02) {
          const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.85 });
          for (let ri = 0; ri < 3; ri++) {
            const size = 0.04 + Math.random() * 0.08;
            const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 2), rubbleMat);
            rubble.position.set(
              wx + (Math.random() - 0.5) * 0.8,
              size,
              wz + (Math.random() - 0.5) * 0.8);
            rubble.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
            this._propsGroup.add(rubble);
          }
        }

        // Candelabra (floor-standing)
        if (!adjWall && Math.random() < 0.008) {
          const candleMat = new THREE.MeshStandardMaterial({ color: 0x666655, metalness: 0.6, roughness: 0.3 });
          // Pole
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.2, 32), candleMat);
          pole.position.set(wx, 0.6, wz);
          this._propsGroup.add(pole);
          // Base
          const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.06, 36), candleMat);
          base.position.set(wx, 0.03, wz);
          this._propsGroup.add(base);
          // Arms and candles
          for (let ci = 0; ci < 3; ci++) {
            const angle = (ci / 3) * Math.PI * 2;
            const armLen = 0.15;
            const ax = wx + Math.cos(angle) * armLen;
            const az = wz + Math.sin(angle) * armLen;
            const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, armLen, 24), candleMat);
            arm2.position.set((wx + ax) / 2, 1.15, (wz + az) / 2);
            arm2.rotation.z = Math.PI / 2;
            arm2.rotation.y = -angle;
            this._propsGroup.add(arm2);
            // Candle
            const candle = new THREE.Mesh(
              new THREE.CylinderGeometry(0.02, 0.025, 0.15, 28),
              new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.8 }));
            candle.position.set(ax, 1.27, az);
            this._propsGroup.add(candle);
            // Tiny flame
            const tinyFlame = new THREE.Mesh(
              new THREE.ConeGeometry(0.015, 0.04, 28),
              new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 3 }));
            tinyFlame.position.set(ax, 1.37, az);
            this._propsGroup.add(tinyFlame);
            this._torchFlames.push(tinyFlame);
          }
          // Dim candelabra light
          const candleLight = new THREE.PointLight(0xff8844, 0.3, 3);
          candleLight.position.set(wx, 1.4, wz);
          this._scene.add(candleLight);
          this._torchLights.push(candleLight);
        }
      }
    }

    // Ceiling beams across rooms (detect room spans)
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.85, metalness: 0.05 });
    for (let y = 2; y < FLOOR_H - 2; y += 4) {
      for (let x = 1; x < FLOOR_W - 1; x++) {
        if (state.tiles[y][x] === TileType.FLOOR && state.tiles[y][x - 1] === TileType.FLOOR &&
            (x + 1 >= FLOOR_W || state.tiles[y][x + 1] === TileType.FLOOR)) {
          // Check for horizontal beam span
          let spanEnd = x;
          while (spanEnd < FLOOR_W - 1 && state.tiles[y][spanEnd + 1] !== TileType.WALL) spanEnd++;
          const spanLen = (spanEnd - x + 1) * CELL_SIZE;
          if (spanLen > CELL_SIZE * 2 && spanLen < CELL_SIZE * 8 && Math.random() < 0.15) {
            const midX = (x + spanEnd) / 2 * CELL_SIZE + CELL_SIZE / 2;
            const beam = new THREE.Mesh(new THREE.BoxGeometry(spanLen, 0.12, 0.18), beamMat);
            beam.position.set(midX, 2.9, y * CELL_SIZE + CELL_SIZE / 2);
            beam.castShadow = true;
            this._propsGroup.add(beam);
            // Support brackets at beam ends
            const bracketMat2 = new THREE.MeshStandardMaterial({ color: 0x1a100a, roughness: 0.8 });
            const bk1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.12), bracketMat2);
            bk1.position.set(x * CELL_SIZE + CELL_SIZE / 2, 2.85, y * CELL_SIZE + CELL_SIZE / 2);
            const bk2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.12), bracketMat2);
            bk2.position.set(spanEnd * CELL_SIZE + CELL_SIZE / 2, 2.85, y * CELL_SIZE + CELL_SIZE / 2);
            this._propsGroup.add(bk1, bk2);
            x = spanEnd; // skip past this beam
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Guard meshes (same as before but kept for brevity)
  // ---------------------------------------------------------------------------
  private _createGuardMesh(guard: Guard): void {
    const g = new THREE.Group();
    const typeColor = guard.isBoss ? BOSS_COLOR :
      guard.guardType === GuardType.HEAVY ? HEAVY_COLOR :
      guard.guardType === GuardType.MAGE ? MAGE_COLOR :
      guard.guardType === GuardType.HOUND ? HOUND_COLOR : GUARD_COLOR;

    if (guard.guardType === GuardType.HOUND) {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.9),
        new THREE.MeshStandardMaterial({ color: typeColor, roughness: 0.8 }));
      body.position.y = 0.32; body.castShadow = true; g.add(body);
      // Legs
      const legGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.3, 36);
      const legMat = new THREE.MeshStandardMaterial({ color: typeColor });
      for (const [lx, lz] of [[-0.15, -0.3], [0.15, -0.3], [-0.15, 0.3], [0.15, 0.3]]) {
        const leg = new THREE.Mesh(legGeo, legMat); leg.position.set(lx, 0.12, lz); g.add(leg);
      }
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.25, 0.3),
        new THREE.MeshStandardMaterial({ color: typeColor }));
      head.position.set(0, 0.42, 0.5); g.add(head);
      // Snout
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.2),
        new THREE.MeshStandardMaterial({ color: typeColor }));
      snout.position.set(0, 0.38, 0.7); g.add(snout);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3 });
      const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 36, 28), eyeMat);
      eye1.position.set(-0.1, 0.48, 0.63); g.add(eye1);
      const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 36, 28), eyeMat);
      eye2.position.set(0.1, 0.48, 0.63); g.add(eye2);
      // Tail
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.01, 0.3, 36),
        new THREE.MeshStandardMaterial({ color: typeColor }));
      tail.position.set(0, 0.4, -0.5); tail.rotation.x = -0.5; g.add(tail);
    } else {
      const bodyH = guard.guardType === GuardType.HEAVY ? 1.7 : 1.5;
      const bodyR = guard.guardType === GuardType.HEAVY ? 0.45 : 0.35;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(bodyR - 0.05, bodyR, bodyH, 44),
        new THREE.MeshStandardMaterial({ color: typeColor, roughness: 0.45, metalness: 0.25 }));
      body.position.y = bodyH / 2; body.castShadow = true; g.add(body);
      // Legs (visible below body)
      const legMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.4, 36), legMat);
      legL.position.set(-0.12, 0.2, 0); g.add(legL);
      const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.4, 36), legMat);
      legR.position.set(0.12, 0.2, 0); g.add(legR);
      const helmSize = guard.isBoss ? 0.35 : (guard.guardType === GuardType.HEAVY ? 0.32 : 0.28);
      const helm = new THREE.Mesh(new THREE.SphereGeometry(helmSize, 48, 40),
        new THREE.MeshStandardMaterial({
          color: guard.guardType === GuardType.MAGE ? 0x4444aa : 0x888899,
          metalness: 0.75, roughness: 0.25 }));
      helm.position.y = bodyH + 0.15; helm.castShadow = true; g.add(helm);
      // Visor slit (dark line on helmet)
      const visor = new THREE.Mesh(new THREE.BoxGeometry(helmSize * 1.2, 0.03, 0.01),
        new THREE.MeshBasicMaterial({ color: 0x111111 }));
      visor.position.set(0, bodyH + 0.13, helmSize - 0.02); g.add(visor);
      if (guard.guardType !== GuardType.MAGE) {
        const shield = new THREE.Mesh(
          new THREE.BoxGeometry(guard.guardType === GuardType.HEAVY ? 0.6 : 0.5, 0.7, 0.06),
          new THREE.MeshStandardMaterial({ color: 0x994411, metalness: 0.35, roughness: 0.5 }));
        shield.position.set(-0.4, 0.9, 0.2); g.add(shield);
        // Shield emblem
        const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.1, 40),
          new THREE.MeshStandardMaterial({ color: 0xcc8800, metalness: 0.6 }));
        emblem.position.set(-0.4, 0.9, 0.24); g.add(emblem);
        // Sword
        const sword = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 0.02),
          new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.15 }));
        sword.position.set(0.35, 0.8, 0); g.add(sword);
      }
      if (guard.guardType === GuardType.MAGE) {
        const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.8, 36),
          new THREE.MeshStandardMaterial({ color: 0x332255 }));
        staff.position.set(0.35, 0.9, 0); g.add(staff);
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 44, 38),
          new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 2.0 }));
        orb.position.set(0.35, 1.9, 0); g.add(orb);
        // Mage robe bottom
        const robe = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.8, 40, 1, true),
          new THREE.MeshStandardMaterial({ color: 0x222266, roughness: 0.9, side: THREE.DoubleSide }));
        robe.position.y = 0.4; g.add(robe);
      }
    }
    // Lantern
    const lantern = new THREE.PointLight(0xffaa44, 0.5, 5);
    lantern.position.set(0.3, 1.0, 0.3); g.add(lantern);
    // Vision cone
    const coneR = guard.guardType === GuardType.HOUND ? 2 : 3;
    const coneL = guard.guardType === GuardType.HOUND ? 5 : 8;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(coneR, coneL, 48, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.03, side: THREE.DoubleSide }));
    cone.rotation.x = Math.PI / 2;
    cone.position.set(0, guard.guardType === GuardType.HOUND ? 0.35 : 1, coneL / 2);
    g.add(cone);
    if (guard.isBoss) {
      const crown = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 24, 44),
        new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.6, metalness: 0.9 }));
      crown.position.y = 2.05; crown.rotation.x = Math.PI / 2; g.add(crown);
      // Boss cape
      const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x990000, roughness: 0.9, side: THREE.DoubleSide }));
      cape.position.set(0, 1.0, -0.35); g.add(cape);
    }
    // Blob shadow
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.4, 48),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; g.add(shadow);

    this._entityGroup.add(g);
    this._guardMeshes.set(guard.id, g);
    // Detection bar
    const barBg = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    barBg.position.y = guard.guardType === GuardType.HOUND ? 1.0 : 2.3;
    const barFg = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    barFg.position.y = guard.guardType === GuardType.HOUND ? 1.0 : 2.3;
    barFg.position.z = 0.001;
    const barGroup = new THREE.Group();
    barGroup.add(barBg, barFg);
    this._entityGroup.add(barGroup);
    this._guardDetectionBars.set(guard.id, barFg);
  }

  private _createArtifactMesh(art: Artifact): void {
    const g = new THREE.Group();
    const color = ARTIFACT_COLORS[art.type] || 0xffffff;
    let geo: THREE.BufferGeometry;
    switch (art.type) {
      case "chalice": geo = new THREE.CylinderGeometry(0.12, 0.2, 0.35, 44); break;
      case "scroll": geo = new THREE.CylinderGeometry(0.07, 0.07, 0.45, 40); break;
      case "crystal": geo = new THREE.OctahedronGeometry(0.18, 5); break;
      case "tome": geo = new THREE.BoxGeometry(0.28, 0.35, 0.08); break;
      default: geo = new THREE.TorusGeometry(0.13, 0.04, 24, 52); break;
    }
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 1.0, metalness: 0.45, roughness: 0.25 }));
    mesh.position.y = 1.2; mesh.castShadow = true; g.add(mesh);
    // Pedestal
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.4, 40),
      new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.7 }));
    ped.position.y = 0.2; g.add(ped);
    // Glowing ring on floor
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.3, 72),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
    const light = new THREE.PointLight(color, 0.5, 5);
    light.position.y = 1.2; g.add(light);
    g.position.set(art.pos.x, 0, art.pos.z);
    this._entityGroup.add(g);
    this._artifactMeshes.set(art.id, g);
  }

  private _createPickupMesh(pickup: Pickup): void {
    const g = new THREE.Group();
    const color = PICKUP_COLORS[pickup.type] || 0xffffff;
    if (pickup.type === PickupType.KEY) {
      // Key shape: handle (torus) + shaft
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 24, 44),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, metalness: 0.8, roughness: 0.15 }));
      handle.position.y = 0.95;
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.015),
        new THREE.MeshStandardMaterial({ color, metalness: 0.8, roughness: 0.15 }));
      shaft.position.y = 0.78;
      g.add(handle, shaft);
    } else {
      // Potion bottle
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.25, 40),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, metalness: 0.2, roughness: 0.3 }));
      bottle.position.y = 0.8;
      const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.06, 36),
        new THREE.MeshStandardMaterial({ color: 0x886644 }));
      cork.position.y = 0.96;
      g.add(bottle, cork);
    }
    const light = new THREE.PointLight(color, 0.25, 3);
    light.position.y = 0.8; g.add(light);
    g.position.set(pickup.pos.x, 0, pickup.pos.z);
    this._entityGroup.add(g);
    this._pickupMeshes.set(pickup.id, g);
  }

  private _createTrapMesh(trap: Trap): void {
    const g = new THREE.Group();
    if (trap.type === "ward") {
      // Rune circle with inner symbol
      const rune = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 44),
        new THREE.MeshBasicMaterial({ color: TRAP_WARD_COLOR, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
      rune.rotation.x = -Math.PI / 2; rune.position.y = 0.12; g.add(rune);
      const inner = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.2, 36),
        new THREE.MeshBasicMaterial({ color: TRAP_WARD_COLOR, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
      inner.rotation.x = -Math.PI / 2; inner.position.y = 0.13; g.add(inner);
      const light = new THREE.PointLight(TRAP_WARD_COLOR, 0.3, 3);
      light.position.y = 0.3; g.add(light);
    } else {
      // Pressure plate (visible when detected)
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.7, metalness: 0.2 }));
      plate.position.y = 0.12; g.add(plate);
    }
    g.position.set(trap.pos.x, 0, trap.pos.z);
    g.visible = trap.visible;
    this._entityGroup.add(g);
    this._trapMeshes.set(trap.id, g);
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------
  update(state: MorganGameState, dt: number): void {
    this._time += dt;
    const p = state.player;

    // Post-processing uniforms
    this._finalPass.uniforms.hpRatio.value = p.hp / p.maxHp;
    this._finalPass.uniforms.time.value = this._time;
    this._finalPass.uniforms.cloaked.value = p.cloaked ? 1.0 : 0.0;
    const dmgFlash = p.hp < this._prevHP ? 0.6 : 0;
    this._finalPass.uniforms.damageFlash.value = Math.max(0,
      (this._finalPass.uniforms.damageFlash.value as number) * 0.88 + dmgFlash);
    if (dmgFlash > 0) this._camShakeIntensity = Math.max(this._camShakeIntensity, 0.15);
    this._prevHP = p.hp;

    // Camera shake decay
    if (this._camShakeIntensity > 0.001) {
      this._camShake.set(
        (Math.random() - 0.5) * this._camShakeIntensity,
        (Math.random() - 0.5) * this._camShakeIntensity * 0.5,
        (Math.random() - 0.5) * this._camShakeIntensity);
      this._camShakeIntensity *= 0.9;
    } else {
      this._camShake.set(0, 0, 0);
    }

    // Player
    this._playerMesh.position.set(p.pos.x, 0, p.pos.z);
    this._playerMesh.rotation.y = p.angle;
    if (p.moving) {
      const bobSpeed = p.sprinting ? 14 : p.sneaking ? 5 : 9;
      this._playerMesh.position.y = Math.sin(this._time * bobSpeed) * (p.sneaking ? 0.02 : 0.05);
      // Leg animation
      const legSwing = Math.sin(this._time * bobSpeed) * (p.sprinting ? 0.3 : 0.15);
      if (this._playerMesh.children[0]) this._playerMesh.children[0].rotation.x = legSwing;
      if (this._playerMesh.children[1]) this._playerMesh.children[1].rotation.x = -legSwing;
    }
    // Player shadow
    this._playerShadow.position.set(p.pos.x, 0.02, p.pos.z);

    // Cloak sway
    const cloakMat = this._playerCloak.material as THREE.MeshStandardMaterial;
    cloakMat.opacity = p.cloaked ? 0.12 + Math.sin(this._time * 4) * 0.08 : 0.88;
    cloakMat.color.set(p.cloaked ? PLAYER_CLOAK_COLOR : 0x1a0033);
    if (p.moving) this._playerCloak.rotation.z = Math.sin(this._time * 3) * 0.05;
    this._playerLight.intensity = p.cloaked ? 0.08 : 0.6;

    // Staff crystal pulse
    if (this._staffCrystal) {
      (this._staffCrystal.material as THREE.MeshStandardMaterial).emissiveIntensity =
        3.0 + Math.sin(this._time * 3) * 1.0 + Math.sin(this._time * 7) * 0.5;
      this._staffCrystal.rotation.y = this._time * 2;
    }

    // Cloak particles
    if (p.cloaked) {
      for (let i = 0; i < CLOAK_PARTICLE_COUNT; i++) {
        const a = this._time * 2 + (i / CLOAK_PARTICLE_COUNT) * Math.PI * 2;
        const r = 0.5 + Math.sin(this._time * 3 + i) * 0.3;
        this._cloakPositions[i * 3] = p.pos.x + Math.cos(a) * r;
        this._cloakPositions[i * 3 + 1] = 0.3 + (i / CLOAK_PARTICLE_COUNT) * 1.8 + Math.sin(this._time * 4 + i * 0.5) * 0.2;
        this._cloakPositions[i * 3 + 2] = p.pos.z + Math.sin(a) * r;
      }
    } else {
      for (let i = 0; i < CLOAK_PARTICLE_COUNT; i++) this._cloakPositions[i * 3 + 1] = -20;
    }
    (this._cloakParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // Footstep dust
    if (p.moving && !p.cloaked) {
      this._footstepTimer += dt;
      const interval = p.sprinting ? 0.15 : p.sneaking ? 0.6 : 0.3;
      if (this._footstepTimer > interval) {
        this._footstepTimer = 0;
        const fp = this._footstepPool[this._footstepIdx % FOOTSTEP_POOL];
        fp.visible = true;
        fp.position.set(p.pos.x + (Math.random() - 0.5) * 0.3, 0.03, p.pos.z + (Math.random() - 0.5) * 0.3);
        fp.scale.setScalar(0.5 + Math.random() * 0.5);
        (fp.material as THREE.MeshBasicMaterial).opacity = p.sprinting ? 0.2 : 0.1;
        this._footstepIdx++;
      }
    }
    // Fade footsteps
    for (const fp of this._footstepPool) {
      if (fp.visible) {
        const mat = fp.material as THREE.MeshBasicMaterial;
        mat.opacity *= 0.97;
        if (mat.opacity < 0.01) fp.visible = false;
      }
    }

    // Detection ring
    const maxDet = Math.max(0, ...state.guards.filter(g => g.hp > 0).map(g => g.detection));
    const ringMat = this._detectionRing.material as THREE.MeshBasicMaterial;
    ringMat.opacity = maxDet * 0.8;
    ringMat.color.set(maxDet >= 1 ? 0xff0000 : 0xffaa00);
    this._detectionRing.position.set(p.pos.x, 0.05, p.pos.z);
    this._detectionRing.scale.setScalar(1 + maxDet * 0.5);

    // Guards
    for (const guard of state.guards) {
      const mesh = this._guardMeshes.get(guard.id);
      if (!mesh) continue;
      // Guard death: spawn particles
      const prevHP = this._prevGuardHPs.get(guard.id) || 0;
      if (guard.hp <= 0 && prevHP > 0) {
        for (let i = 0; i < DEATH_PARTICLE_COUNT; i++) {
          this._deathPositions[i * 3] = guard.pos.x + (Math.random() - 0.5) * 0.8;
          this._deathPositions[i * 3 + 1] = 0.5 + Math.random() * 1.5;
          this._deathPositions[i * 3 + 2] = guard.pos.z + (Math.random() - 0.5) * 0.8;
          this._deathVelocities[i * 3] = (Math.random() - 0.5) * 3;
          this._deathVelocities[i * 3 + 1] = Math.random() * 3 + 1;
          this._deathVelocities[i * 3 + 2] = (Math.random() - 0.5) * 3;
          this._deathAlphas[i] = 1;
        }
        this._camShakeIntensity = Math.max(this._camShakeIntensity, guard.isBoss ? 0.3 : 0.1);
      }
      this._prevGuardHPs.set(guard.id, guard.hp);

      if (guard.hp <= 0) { mesh.visible = false; continue; }
      mesh.visible = true;
      mesh.position.set(guard.pos.x, 0, guard.pos.z);
      mesh.rotation.y = guard.angle;
      // Guard idle sway
      if (guard.state === GuardState.PATROL && guard.waitTimer > 0) {
        mesh.rotation.y += Math.sin(this._time * 1.5 + guard.id) * 0.03;
      }

      const body = mesh.children[0] as THREE.Mesh;
      const mat = body.material as THREE.MeshStandardMaterial;
      switch (guard.state) {
        case GuardState.SLEEPING: mat.color.set(GUARD_SLEEP_COLOR); break;
        case GuardState.ALERT: mat.color.set(GUARD_ALERT_COLOR); break;
        case GuardState.STUNNED: mat.color.set(0x888888); break;
        default:
          mat.color.set(guard.isBoss ? BOSS_COLOR :
            guard.guardType === GuardType.HEAVY ? HEAVY_COLOR :
            guard.guardType === GuardType.MAGE ? MAGE_COLOR :
            guard.guardType === GuardType.HOUND ? HOUND_COLOR : GUARD_COLOR);
      }
      // Vision cone
      const coneChild = mesh.children.find(c => c instanceof THREE.Mesh && c.material instanceof THREE.MeshBasicMaterial
        && (c.geometry as THREE.ConeGeometry)?.parameters?.radiusTop !== undefined) as THREE.Mesh | undefined;
      if (coneChild && coneChild.material instanceof THREE.MeshBasicMaterial) {
        coneChild.visible = guard.state !== GuardState.SLEEPING && guard.state !== GuardState.STUNNED;
        coneChild.material.opacity = guard.state === GuardState.ALERT ? 0.08 : 0.03;
        coneChild.material.color.set(guard.state === GuardState.ALERT ? 0xff4444 : 0xffff00);
      }
      // Detection bar
      const bar = this._guardDetectionBars.get(guard.id);
      if (bar && bar.parent) {
        bar.parent.position.set(guard.pos.x, 0, guard.pos.z);
        bar.parent.lookAt(this._camera.position);
        bar.scale.x = guard.detection;
        (bar.material as THREE.MeshBasicMaterial).opacity = guard.detection > 0.05 ? 0.8 : 0;
        (bar.material as THREE.MeshBasicMaterial).color.set(guard.detection >= 1 ? 0xff0000 : 0xffaa00);
        const bg = bar.parent.children[0] as THREE.Mesh;
        (bg.material as THREE.MeshBasicMaterial).opacity = guard.detection > 0.05 ? 0.4 : 0;
      }
    }

    // Boss VFX
    const boss = state.guards.find(g => g.isBoss && g.hp > 0);
    if (boss && this._bossAuraLight) {
      this._bossAuraLight.position.set(boss.pos.x, 1.5, boss.pos.z);
      const phase = boss.bossPhase || 1;
      // Aura intensifies with phase
      this._bossAuraLight.intensity = phase * 0.5 + Math.sin(this._time * 4) * 0.2;
      this._bossAuraLight.color.set(phase >= 3 ? 0xff0000 : phase >= 2 ? 0xff4400 : 0xff6600);
    } else if (this._bossAuraLight) {
      this._bossAuraLight.intensity = 0;
    }
    // Shockwave animation
    if (this._shockwaveRing) {
      if (this._shockwaveTimer > 0) {
        this._shockwaveTimer -= dt;
        this._shockwaveRing.visible = true;
        const progress = 1 - this._shockwaveTimer / 0.5;
        this._shockwaveRing.scale.setScalar(1 + progress * 8);
        (this._shockwaveRing.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.6;
      } else {
        this._shockwaveRing.visible = false;
      }
    }
    // Trigger shockwave visual when boss uses it (detect via player HP drop near boss)
    if (boss && boss.bossPhase > 0 && state.player.hp < this._prevHP &&
        v2Dist(state.player.pos, boss.pos) < 8 && this._shockwaveRing) {
      this._shockwaveTimer = 0.5;
      this._shockwaveRing.position.set(boss.pos.x, 0.15, boss.pos.z);
    }

    // Death particles physics
    let anyDeathActive = false;
    for (let i = 0; i < DEATH_PARTICLE_COUNT; i++) {
      if (this._deathAlphas[i] > 0.01) {
        this._deathPositions[i * 3] += this._deathVelocities[i * 3] * dt;
        this._deathPositions[i * 3 + 1] += this._deathVelocities[i * 3 + 1] * dt;
        this._deathPositions[i * 3 + 2] += this._deathVelocities[i * 3 + 2] * dt;
        this._deathVelocities[i * 3 + 1] -= 5 * dt;
        this._deathAlphas[i] *= 0.96;
        anyDeathActive = true;
      }
    }
    if (anyDeathActive) {
      (this._deathParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (this._deathParticles.material as THREE.PointsMaterial).opacity = 0.8;
    } else {
      (this._deathParticles.material as THREE.PointsMaterial).opacity = 0;
    }

    // Artifacts
    for (const art of state.artifacts) {
      const mesh = this._artifactMeshes.get(art.id);
      if (!mesh) continue;
      if (art.collected) { mesh.visible = false; continue; }
      const obj = mesh.children[0] as THREE.Mesh;
      if (obj) {
        obj.position.y = 1.2 + Math.sin(this._time * 2 + art.id) * 0.12;
        obj.rotation.y = this._time * 1.2;
      }
      const ring = mesh.children[2] as THREE.Mesh;
      if (ring) ring.rotation.z = this._time * 0.5;
    }

    // Pickups
    for (const pickup of state.pickups) {
      const mesh = this._pickupMeshes.get(pickup.id);
      if (!mesh) continue;
      if (pickup.collected) { mesh.visible = false; continue; }
      const first = mesh.children[0];
      if (first) first.position.y = (pickup.type === PickupType.KEY ? 0.95 : 0.8) + Math.sin(this._time * 3 + pickup.id) * 0.08;
      if (first) first.rotation.y = this._time * 1.5;
    }

    // Traps
    for (const trap of state.traps) {
      const mesh = this._trapMeshes.get(trap.id);
      if (!mesh) continue;
      mesh.visible = trap.visible && !trap.triggered;
      if (trap.type === "ward" && !trap.triggered && mesh.children[0]) {
        (mesh.children[0] as THREE.Mesh).rotation.z = this._time * 0.8;
        if (mesh.children[1]) (mesh.children[1] as THREE.Mesh).rotation.z = -this._time * 1.2;
      }
    }

    // Loot drops (create dynamically as they appear)
    for (const loot of state.lootDrops) {
      if (loot.collected) {
        const m = this._lootMeshes.get(loot.id);
        if (m) { m.visible = false; }
        continue;
      }
      if (!this._lootMeshes.has(loot.id)) {
        const g = new THREE.Group();
        const lootColors = { gold: 0xffd700, health: 0xff3333, mana: 0x4466ff };
        const color = lootColors[loot.type] || 0xffffff;
        let geo: THREE.BufferGeometry;
        if (loot.type === "gold") {
          geo = new THREE.DodecahedronGeometry(0.12, 3);
        } else {
          geo = new THREE.SphereGeometry(0.1, 32, 24);
        }
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity: 1.2, metalness: 0.5, roughness: 0.3 }));
        mesh.position.y = 0.4;
        g.add(mesh);
        const light = new THREE.PointLight(color, 0.3, 2);
        light.position.y = 0.4;
        g.add(light);
        g.position.set(loot.pos.x, 0, loot.pos.z);
        this._fxGroup.add(g);
        this._lootMeshes.set(loot.id, g);
      }
      const m = this._lootMeshes.get(loot.id)!;
      m.visible = true;
      const obj = m.children[0] as THREE.Mesh;
      if (obj) {
        obj.position.y = 0.4 + Math.sin(this._time * 4 + loot.id) * 0.1;
        obj.rotation.y = this._time * 2;
        // Fade out as timer runs low
        (obj.material as THREE.MeshStandardMaterial).opacity = Math.min(1, loot.timer / 5);
      }
    }

    // Corpses (create dynamically)
    while (this._corpseMeshes.length < state.corpses.length) {
      const corpse = state.corpses[this._corpseMeshes.length];
      const g = new THREE.Group();
      // Fallen guard body — flat on ground
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x443333, roughness: 0.9 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.25, 36), bodyMat);
      body.position.y = 0.12;
      body.rotation.x = Math.PI / 2 * 0.8; // slightly tilted
      g.add(body);
      // Helmet fallen off
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 24),
        new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.4 }));
      helm.position.set(0.3 + Math.random() * 0.3, 0.1, Math.random() * 0.4 - 0.2);
      g.add(helm);
      // Dark pool (shadow underneath)
      const pool = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40),
        new THREE.MeshBasicMaterial({ color: 0x110808, transparent: true, opacity: 0.4 }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.y = 0.02;
      g.add(pool);
      g.position.set(corpse.pos.x, 0, corpse.pos.z);
      this._entityGroup.add(g);
      this._corpseMeshes.push(g);
    }

    // Dark bolts + spell trail particles
    this._boltPool.forEach((b, i) => { b.visible = false; this._boltLights[i].visible = false; });
    for (let i = 0; i < state.darkBolts.length && i < this._boltPool.length; i++) {
      const bolt = state.darkBolts[i];
      this._boltPool[i].visible = true;
      (this._boltPool[i] as unknown as THREE.Group).position.set(bolt.pos.x, 1.2, bolt.pos.z);
      this._boltLights[i].visible = true;
      this._boltLights[i].position.set(bolt.pos.x, 1.2, bolt.pos.z);
      this._boltLights[i].intensity = 1.2 + Math.sin(this._time * 20) * 0.5;
      // Emit trail particles
      const ti = this._spellTrailIdx % SPELL_TRAIL_COUNT;
      this._spellTrailPositions[ti * 3] = bolt.pos.x + (Math.random() - 0.5) * 0.3;
      this._spellTrailPositions[ti * 3 + 1] = 1.2 + (Math.random() - 0.5) * 0.3;
      this._spellTrailPositions[ti * 3 + 2] = bolt.pos.z + (Math.random() - 0.5) * 0.3;
      this._spellTrailAlphas[ti] = 1;
      this._spellTrailIdx++;
    }
    // Fade trail particles
    for (let i = 0; i < SPELL_TRAIL_COUNT; i++) {
      if (this._spellTrailAlphas[i] > 0) {
        this._spellTrailAlphas[i] *= 0.92;
        this._spellTrailPositions[i * 3 + 1] += 0.02;
        if (this._spellTrailAlphas[i] < 0.01) this._spellTrailPositions[i * 3 + 1] = -20;
      }
    }
    (this._spellTrailParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // Fireballs
    this._fireballPool.forEach((f, i) => { f.visible = false; this._fireballLights[i].visible = false; });
    for (let i = 0; i < state.fireballs.length && i < this._fireballPool.length; i++) {
      const fb = state.fireballs[i];
      this._fireballPool[i].visible = true;
      (this._fireballPool[i] as unknown as THREE.Group).position.set(fb.pos.x, 1.0, fb.pos.z);
      this._fireballPool[i].scale.setScalar(1 + Math.sin(this._time * 15) * 0.25);
      this._fireballLights[i].visible = true;
      this._fireballLights[i].position.set(fb.pos.x, 1.0, fb.pos.z);
      this._fireballLights[i].intensity = 1.5 + Math.sin(this._time * 12) * 0.8;
    }

    // Mist zones
    while (this._mistMeshes.length < state.mistZones.length) {
      const mist = new THREE.Mesh(
        new THREE.CylinderGeometry(SLEEP_MIST_RADIUS, SLEEP_MIST_RADIUS, 2, 56, 1, true),
        new THREE.MeshBasicMaterial({ color: MIST_COLOR, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
      this._fxGroup.add(mist); this._mistMeshes.push(mist);
    }
    for (let i = 0; i < this._mistMeshes.length; i++) {
      if (i < state.mistZones.length) {
        const zone = state.mistZones[i];
        this._mistMeshes[i].visible = true;
        this._mistMeshes[i].position.set(zone.pos.x, 1, zone.pos.z);
        this._mistMeshes[i].rotation.y = this._time * 0.3;
        this._mistMeshes[i].scale.y = 0.8 + Math.sin(this._time * 2) * 0.2;
        (this._mistMeshes[i].material as THREE.MeshBasicMaterial).opacity = 0.12 * Math.min(1, zone.timer / 2);
      } else { this._mistMeshes[i].visible = false; }
    }

    // Decoys
    while (this._decoyMeshes.length < state.decoys.length) {
      const decoy = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.5, 44, 1, true),
        new THREE.MeshStandardMaterial({ color: DECOY_COLOR, emissive: DECOY_COLOR, emissiveIntensity: 0.6,
          transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
      this._fxGroup.add(decoy); this._decoyMeshes.push(decoy);
    }
    for (let i = 0; i < this._decoyMeshes.length; i++) {
      if (i < state.decoys.length) {
        const d = state.decoys[i];
        this._decoyMeshes[i].visible = true;
        this._decoyMeshes[i].position.set(d.pos.x, 0.75, d.pos.z);
        this._decoyMeshes[i].rotation.y = this._time * 2;
        (this._decoyMeshes[i].material as THREE.MeshStandardMaterial).opacity = 0.35 + Math.sin(this._time * 3) * 0.15;
      } else { this._decoyMeshes[i].visible = false; }
    }

    // Sound rings
    let ringIdx = 0;
    for (const sound of state.soundEvents) {
      if (ringIdx >= this._soundRingPool.length) break;
      const ring = this._soundRingPool[ringIdx++];
      ring.visible = true;
      ring.position.set(sound.pos.x, 0.08, sound.pos.z);
      const expand = 1 + (0.5 - sound.timer) * sound.radius * 2;
      ring.scale.setScalar(Math.max(0.1, expand));
      (ring.material as THREE.MeshBasicMaterial).opacity = sound.timer * 0.25;
    }
    for (let i = ringIdx; i < this._soundRingPool.length; i++) this._soundRingPool[i].visible = false;

    // Exit portal
    this._exitMarker.visible = state.exitOpen;
    if (state.exitOpen) {
      const r1 = this._exitMarker.children[0] as THREE.Mesh;
      if (r1) r1.rotation.z = this._time * 1.5;
      const r2 = this._exitMarker.children[1] as THREE.Mesh;
      if (r2) r2.rotation.z = -this._time * 2.0;
      // Swirl particles
      for (let i = 0; i < this._exitParticlePositions.length / 3; i++) {
        const a = this._time * 2 + (i / (this._exitParticlePositions.length / 3)) * Math.PI * 2;
        const r = 0.7 + Math.sin(this._time * 3 + i) * 0.2;
        this._exitParticlePositions[i * 3] = Math.cos(a) * r;
        this._exitParticlePositions[i * 3 + 1] = 1.0 + Math.sin(this._time * 4 + i * 0.5) * 0.3;
        this._exitParticlePositions[i * 3 + 2] = Math.sin(a) * r;
      }
      (this._exitParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    // Torch effects
    for (let i = 0; i < this._torchLights.length; i++) {
      this._torchLights[i].intensity = 1.2 + Math.sin(this._time * 9 + i * 7.3) * 0.35
        + Math.sin(this._time * 14 + i * 3.1) * 0.2
        + Math.sin(this._time * 23 + i * 11.7) * 0.1;
    }
    for (let i = 0; i < this._torchFlames.length; i++) {
      const flame = this._torchFlames[i];
      flame.scale.y = 1 + Math.sin(this._time * 12 + flame.position.x * 5) * 0.35;
      flame.scale.x = 1 + Math.sin(this._time * 8 + flame.position.z * 3) * 0.2;
      flame.position.y += Math.sin(this._time * 15 + i) * 0.001;
    }
    // Torch smoke drift
    for (const smoke of this._torchSmoke) {
      const pos = smoke.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i);
        y += dt * (0.3 + Math.random() * 0.2);
        if (y > 3) y = 2.6;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(this._time * 2 + i) * dt * 0.05);
      }
      pos.needsUpdate = true;
    }

    // Dust drift
    for (let i = 0; i < DUST_COUNT; i++) {
      this._dustPositions[i * 3] += this._dustVelocities[i * 3] * dt;
      this._dustPositions[i * 3 + 1] += Math.sin(this._time * 0.5 + i * 0.7) * 0.003;
      this._dustPositions[i * 3 + 2] += this._dustVelocities[i * 3 + 2] * dt;
      if (this._dustPositions[i * 3 + 1] > 2.8) this._dustPositions[i * 3 + 1] = 0.3;
      if (this._dustPositions[i * 3 + 1] < 0.2) this._dustPositions[i * 3 + 1] = 2.7;
    }
    (this._dustParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // Torch sparks
    for (let i = 0; i < SPARK_COUNT; i++) {
      this._sparkPositions[i * 3] += this._sparkVelocities[i * 3] * dt;
      this._sparkPositions[i * 3 + 1] += this._sparkVelocities[i * 3 + 1] * dt;
      this._sparkPositions[i * 3 + 2] += this._sparkVelocities[i * 3 + 2] * dt;
      this._sparkVelocities[i * 3 + 1] -= 3 * dt;
      if (this._sparkPositions[i * 3 + 1] < 0 || Math.random() < dt * 0.4) {
        if (this._torchLights.length > 0) {
          const torch = this._torchLights[Math.floor(Math.random() * this._torchLights.length)];
          this._sparkPositions[i * 3] = torch.position.x + (Math.random() - 0.5) * 0.15;
          this._sparkPositions[i * 3 + 1] = torch.position.y + 0.1;
          this._sparkPositions[i * 3 + 2] = torch.position.z + (Math.random() - 0.5) * 0.15;
          this._sparkVelocities[i * 3] = (Math.random() - 0.5) * 1.2;
          this._sparkVelocities[i * 3 + 1] = Math.random() * 2.5 + 0.5;
          this._sparkVelocities[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
        }
      }
    }
    (this._sparkParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // Camera with shake
    const camTargetX = p.pos.x - Math.sin(p.angle) * 2;
    const camTargetZ = p.pos.z - Math.cos(p.angle) * 2;
    this._camTarget.lerp(new THREE.Vector3(camTargetX, 1.5, camTargetZ), CAM_LERP * dt);
    const idealCamX = p.pos.x - Math.sin(p.angle) * CAM_DISTANCE;
    const idealCamZ = p.pos.z - Math.cos(p.angle) * CAM_DISTANCE;
    this._camPos.lerp(new THREE.Vector3(idealCamX, CAM_HEIGHT, idealCamZ), CAM_LERP * dt);
    this._camera.position.copy(this._camPos).add(this._camShake);
    this._camera.lookAt(this._camTarget);

    this._composer.render();
  }

  destroy(): void {
    window.removeEventListener("resize", this._onResize);
    this._torchLights.forEach(l => this._scene.remove(l));
    if (this._bossAuraLight) this._scene.remove(this._bossAuraLight);
    this._renderer.dispose();
    this._composer.dispose();
    this._canvas.parentNode?.removeChild(this._canvas);
  }

  private _onResize = (): void => {
    const w = window.innerWidth, h = window.innerHeight;
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(w, h);
    this._composer.setSize(w, h);
  };
}
