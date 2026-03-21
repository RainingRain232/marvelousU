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
  // (ceiling removed — camera is inside dungeon)

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
    this._renderer.toneMappingExposure = 1.0;

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x080815);
    this._scene.fog = new THREE.FogExp2(0x080815, 0.022);

    this._camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);

    // Generate textures
    this._wallTex = createStoneTexture(128, 128, 42, 42, 58);
    this._wallNormal = createNormalMapFromCanvas(this._wallTex, 3);
    this._floorTex = createFloorTexture();
    this._floorNormal = createNormalMapFromCanvas(this._floorTex, 2);
    // (ceiling texture removed — no ceiling mesh)

    // Post-processing
    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(new RenderPass(this._scene, this._camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.75);
    this._composer.addPass(bloom);
    this._finalPass = new ShaderPass(FinalShader);
    this._composer.addPass(this._finalPass);
    this._composer.addPass(new OutputPass());

    // Lighting — brighter ambient so dungeon is visible
    this._scene.add(new THREE.AmbientLight(0x1a1a44, 0.5));
    const moon = new THREE.DirectionalLight(0x4466aa, 0.2);
    moon.position.set(20, 40, 10);
    this._scene.add(moon);
    this._scene.add(new THREE.HemisphereLight(0x222244, 0x0a0a15, 0.3));

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
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xddbb99, roughness: 0.6 });

    // Boots (heeled sorceress boots)
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2a, roughness: 0.7, metalness: 0.1 });
    const bootGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.2, 48);
    const bootL = new THREE.Mesh(bootGeo, bootMat); bootL.position.set(-0.12, 0.1, 0);
    const bootR = new THREE.Mesh(bootGeo, bootMat); bootR.position.set(0.12, 0.1, 0);
    this._playerMesh.add(bootL, bootR);
    // Boot heels
    const heelGeo = new THREE.BoxGeometry(0.05, 0.06, 0.04);
    const heelMat = new THREE.MeshStandardMaterial({ color: 0x0a0418, roughness: 0.5, metalness: 0.2 });
    const heelL = new THREE.Mesh(heelGeo, heelMat); heelL.position.set(-0.12, 0.02, -0.06);
    const heelR = new THREE.Mesh(heelGeo, heelMat); heelR.position.set(0.12, 0.02, -0.06);
    this._playerMesh.add(heelL, heelR);
    // Boot toe caps
    const toeMat = new THREE.MeshStandardMaterial({ color: 0x120822, roughness: 0.6, metalness: 0.15 });
    const toeGeo = new THREE.SphereGeometry(0.09, 40, 32, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const toeL = new THREE.Mesh(toeGeo, toeMat); toeL.position.set(-0.12, 0.02, 0.06); toeL.rotation.x = -Math.PI / 2;
    const toeR = new THREE.Mesh(toeGeo, toeMat); toeR.position.set(0.12, 0.02, 0.06); toeR.rotation.x = -Math.PI / 2;
    this._playerMesh.add(toeL, toeR);
    // Boot cuffs (folded top)
    const cuffGeo = new THREE.TorusGeometry(0.11, 0.015, 20, 48);
    const cuffMat = new THREE.MeshStandardMaterial({ color: 0x553388, metalness: 0.3 });
    const cuffL = new THREE.Mesh(cuffGeo, cuffMat); cuffL.position.set(-0.12, 0.2, 0); cuffL.rotation.x = Math.PI / 2;
    const cuffR = new THREE.Mesh(cuffGeo, cuffMat); cuffR.position.set(0.12, 0.2, 0); cuffR.rotation.x = Math.PI / 2;
    this._playerMesh.add(cuffL, cuffR);
    // Boot lacing detail
    const laceMat = new THREE.MeshStandardMaterial({ color: 0x9966cc, metalness: 0.3, roughness: 0.5 });
    for (let bl = 0; bl < 3; bl++) {
      const lace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.005, 0.005), laceMat);
      lace.position.set(-0.12, 0.06 + bl * 0.05, 0.1);
      const laceR2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.005, 0.005), laceMat);
      laceR2.position.set(0.12, 0.06 + bl * 0.05, 0.1);
      this._playerMesh.add(lace, laceR2);
    }

    // Legs (upper and lower segments)
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2a, roughness: 0.8 });
    const lowerLegGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.35, 48);
    const llL = new THREE.Mesh(lowerLegGeo, legMat); llL.position.set(-0.12, 0.38, 0);
    const llR = new THREE.Mesh(lowerLegGeo, legMat); llR.position.set(0.12, 0.38, 0);
    this._playerMesh.add(llL, llR);
    // Knees
    const kneeGeo = new THREE.SphereGeometry(0.075, 40, 32);
    const kneeL = new THREE.Mesh(kneeGeo, legMat); kneeL.position.set(-0.12, 0.53, 0);
    const kneeR = new THREE.Mesh(kneeGeo, legMat); kneeR.position.set(0.12, 0.53, 0);
    this._playerMesh.add(kneeL, kneeR);
    const upperLegGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.35, 48);
    const ulL = new THREE.Mesh(upperLegGeo, legMat); ulL.position.set(-0.12, 0.68, 0);
    const ulR = new THREE.Mesh(upperLegGeo, legMat); ulR.position.set(0.12, 0.68, 0);
    this._playerMesh.add(ulL, ulR);

    // Body (torso - sculpted with three segments for hourglass shape)
    const lowerTorsoGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.3, 56);
    const torsoMat = new THREE.MeshStandardMaterial({ color: PLAYER_COLOR, roughness: 0.5, metalness: 0.15 });
    const lowerTorso = new THREE.Mesh(lowerTorsoGeo, torsoMat);
    lowerTorso.position.y = 0.92; lowerTorso.castShadow = true;
    this._playerMesh.add(lowerTorso);
    // Waist (narrower)
    const waistGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.18, 56);
    const waistMesh = new THREE.Mesh(waistGeo, torsoMat);
    waistMesh.position.y = 1.1;
    this._playerMesh.add(waistMesh);
    // Corset/bodice detail
    const corsetMat = new THREE.MeshStandardMaterial({ color: 0x331155, roughness: 0.4, metalness: 0.2 });
    const corsetGeo = new THREE.CylinderGeometry(0.205, 0.245, 0.18, 56, 1, false, -Math.PI * 0.4, Math.PI * 0.8);
    const corset = new THREE.Mesh(corsetGeo, corsetMat);
    corset.position.y = 1.1;
    this._playerMesh.add(corset);
    // Corset lacing (front)
    const corsetLaceMat = new THREE.MeshStandardMaterial({ color: 0xccaa66, metalness: 0.4 });
    for (let cl = 0; cl < 4; cl++) {
      const clace = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.005, 0.005), corsetLaceMat);
      clace.position.set(0, 1.04 + cl * 0.04, 0.21);
      this._playerMesh.add(clace);
    }
    const upperTorsoGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.35, 56);
    this._playerBody = new THREE.Mesh(upperTorsoGeo, torsoMat);
    this._playerBody.position.y = 1.32;
    this._playerBody.castShadow = true;
    this._playerMesh.add(this._playerBody);
    // Collar bones
    const cboneMat = new THREE.MeshStandardMaterial({ color: 0xddbb99, roughness: 0.6 });
    const cboneGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.12, 20);
    const cboneL = new THREE.Mesh(cboneGeo, cboneMat); cboneL.position.set(-0.08, 1.48, 0.15); cboneL.rotation.z = Math.PI / 2.5; cboneL.rotation.x = -0.2;
    const cboneR = new THREE.Mesh(cboneGeo, cboneMat); cboneR.position.set(0.08, 1.48, 0.15); cboneR.rotation.z = -Math.PI / 2.5; cboneR.rotation.x = -0.2;
    this._playerMesh.add(cboneL, cboneR);

    // Skirt panels (layered under cloak for visible movement)
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0x220044, roughness: 0.85, side: THREE.DoubleSide });
    for (let sp = 0; sp < 6; sp++) {
      const skirtAngle = (sp / 6) * Math.PI * 2;
      const skirtPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.55),  skirtMat);
      skirtPanel.position.set(Math.cos(skirtAngle) * 0.26, 0.6, Math.sin(skirtAngle) * 0.26);
      skirtPanel.rotation.y = -skirtAngle + Math.PI / 2;
      skirtPanel.rotation.x = 0.15;
      this._playerMesh.add(skirtPanel);
    }

    // Belt / waist sash
    const beltGeo = new THREE.TorusGeometry(0.27, 0.025, 24, 56);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x553388, metalness: 0.4, roughness: 0.4 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 0.87; belt.rotation.x = Math.PI / 2;
    this._playerMesh.add(belt);
    // Belt buckle (ornate pentagonal)
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0x9966cc, metalness: 0.7, roughness: 0.2 });
    const buckle = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 2), buckleMat);
    buckle.position.set(0, 0.87, 0.27);
    this._playerMesh.add(buckle);
    // Potion vials on belt
    const vialMat = new THREE.MeshStandardMaterial({ color: 0x44cc66, emissive: 0x22aa44, emissiveIntensity: 0.5, transparent: true, opacity: 0.7 });
    const vialGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.08, 28);
    const vial1 = new THREE.Mesh(vialGeo, vialMat); vial1.position.set(-0.22, 0.87, 0.15);
    const vial2 = new THREE.Mesh(vialGeo, new THREE.MeshStandardMaterial({ color: 0xcc4466, emissive: 0xaa2244, emissiveIntensity: 0.5, transparent: true, opacity: 0.7 }));
    vial2.position.set(-0.25, 0.87, 0.08);
    const vialCork1 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.02, 20), new THREE.MeshStandardMaterial({ color: 0x886644 }));
    vialCork1.position.set(-0.22, 0.92, 0.15);
    const vialCork2 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.02, 20), new THREE.MeshStandardMaterial({ color: 0x886644 }));
    vialCork2.position.set(-0.25, 0.92, 0.08);
    this._playerMesh.add(vial1, vial2, vialCork1, vialCork2);
    // Sash drape
    const sashGeo = new THREE.PlaneGeometry(0.12, 0.5);
    const sashMat = new THREE.MeshStandardMaterial({ color: 0x6633aa, roughness: 0.85, side: THREE.DoubleSide });
    const sash = new THREE.Mesh(sashGeo, sashMat);
    sash.position.set(0.05, 0.65, 0.26); sash.rotation.x = 0.1;
    this._playerMesh.add(sash);
    // Sash tassel
    const tasselMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.5 });
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 24), tasselMat);
    tassel.position.set(0.05, 0.4, 0.27); tassel.rotation.x = Math.PI;
    this._playerMesh.add(tassel);

    // Shoulders (pauldron-style)
    const shoulderGeo = new THREE.SphereGeometry(0.14, 52, 44);
    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x553388, roughness: 0.5, metalness: 0.2 });
    const shL = new THREE.Mesh(shoulderGeo, shoulderMat); shL.position.set(-0.3, 1.4, 0);
    const shR = new THREE.Mesh(shoulderGeo, shoulderMat); shR.position.set(0.3, 1.4, 0);
    this._playerMesh.add(shL, shR);
    // Shoulder trims
    const sTrimGeo = new THREE.TorusGeometry(0.14, 0.012, 20, 48);
    const sTrimMat = new THREE.MeshStandardMaterial({ color: 0x9966cc, metalness: 0.5 });
    const stL = new THREE.Mesh(sTrimGeo, sTrimMat); stL.position.set(-0.3, 1.4, 0);
    const stR = new THREE.Mesh(sTrimGeo, sTrimMat); stR.position.set(0.3, 1.4, 0);
    this._playerMesh.add(stL, stR);

    // Arms (upper and lower segments)
    const armSkinMat = new THREE.MeshStandardMaterial({ color: 0xccaa88, roughness: 0.7 });
    const upperArmGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.3, 48);
    const uaL = new THREE.Mesh(upperArmGeo, armSkinMat); uaL.position.set(-0.34, 1.22, 0); uaL.rotation.z = 0.1;
    const uaR = new THREE.Mesh(upperArmGeo, armSkinMat); uaR.position.set(0.34, 1.22, 0); uaR.rotation.z = -0.1;
    this._playerMesh.add(uaL, uaR);
    // Elbows
    const elbowGeo = new THREE.SphereGeometry(0.055, 40, 32);
    const elL = new THREE.Mesh(elbowGeo, armSkinMat); elL.position.set(-0.36, 1.05, 0);
    const elR = new THREE.Mesh(elbowGeo, armSkinMat); elR.position.set(0.36, 1.05, 0);
    this._playerMesh.add(elL, elR);
    const forearmGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.3, 48);
    const faL = new THREE.Mesh(forearmGeo, armSkinMat); faL.position.set(-0.37, 0.88, 0); faL.rotation.z = 0.2;
    const faR = new THREE.Mesh(forearmGeo, armSkinMat); faR.position.set(0.37, 0.88, 0); faR.rotation.z = -0.2;
    this._playerMesh.add(faL, faR);
    // Wrist bracers with rune engravings
    const bracerGeo = new THREE.CylinderGeometry(0.055, 0.06, 0.08, 48);
    const bracerMat = new THREE.MeshStandardMaterial({ color: 0x553388, roughness: 0.5, metalness: 0.3 });
    const brL = new THREE.Mesh(bracerGeo, bracerMat); brL.position.set(-0.37, 0.77, 0);
    const brR = new THREE.Mesh(bracerGeo, bracerMat); brR.position.set(0.37, 0.77, 0);
    this._playerMesh.add(brL, brR);
    // Bracer rune glow lines
    const runeLineMat = new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6633cc, emissiveIntensity: 1.5 });
    const runeLineGeo = new THREE.TorusGeometry(0.058, 0.004, 12, 40);
    const rlL = new THREE.Mesh(runeLineGeo, runeLineMat); rlL.position.set(-0.37, 0.77, 0); rlL.rotation.x = Math.PI / 2;
    const rlR = new THREE.Mesh(runeLineGeo, runeLineMat); rlR.position.set(0.37, 0.77, 0); rlR.rotation.x = Math.PI / 2;
    this._playerMesh.add(rlL, rlR);
    // Hands (with finger detail)
    const handGeo = new THREE.SphereGeometry(0.035, 40, 32);
    const handL = new THREE.Mesh(handGeo, skinMat); handL.position.set(-0.38, 0.72, 0);
    const handR = new THREE.Mesh(handGeo, skinMat); handR.position.set(0.38, 0.72, 0);
    this._playerMesh.add(handL, handR);
    // Fingers (4 per hand + thumb)
    const fingerGeo = new THREE.CylinderGeometry(0.006, 0.008, 0.05, 16);
    const thumbGeo = new THREE.CylinderGeometry(0.007, 0.009, 0.04, 16);
    for (let fi = 0; fi < 4; fi++) {
      const fAngle = ((fi - 1.5) / 3.5) * 0.5;
      const fL = new THREE.Mesh(fingerGeo, skinMat);
      fL.position.set(-0.38 - Math.sin(fAngle) * 0.03, 0.695, 0.02 - fi * 0.012); fL.rotation.z = 0.3;
      const fR = new THREE.Mesh(fingerGeo, skinMat);
      fR.position.set(0.38 + Math.sin(fAngle) * 0.03, 0.695, 0.02 - fi * 0.012); fR.rotation.z = -0.3;
      this._playerMesh.add(fL, fR);
    }
    const thumbL = new THREE.Mesh(thumbGeo, skinMat); thumbL.position.set(-0.365, 0.71, 0.03); thumbL.rotation.z = -0.5;
    const thumbR = new THREE.Mesh(thumbGeo, skinMat); thumbR.position.set(0.365, 0.71, 0.03); thumbR.rotation.z = 0.5;
    this._playerMesh.add(thumbL, thumbR);
    // Fingernails (painted dark purple)
    const nailMat = new THREE.MeshStandardMaterial({ color: 0x553388, roughness: 0.3, metalness: 0.2 });
    const nailGeo = new THREE.BoxGeometry(0.008, 0.005, 0.008);
    for (let ni = 0; ni < 4; ni++) {
      const nfAngle = ((ni - 1.5) / 3.5) * 0.5;
      const nL = new THREE.Mesh(nailGeo, nailMat);
      nL.position.set(-0.38 - Math.sin(nfAngle) * 0.03 - 0.01, 0.672, 0.02 - ni * 0.012);
      const nR = new THREE.Mesh(nailGeo, nailMat);
      nR.position.set(0.38 + Math.sin(nfAngle) * 0.03 + 0.01, 0.672, 0.02 - ni * 0.012);
      this._playerMesh.add(nL, nR);
    }

    // Neck
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.15, 48),
      skinMat);
    neck.position.y = 1.57;
    this._playerMesh.add(neck);

    // Head (slightly elongated for elegance)
    const headMat = new THREE.MeshStandardMaterial({ color: 0xddbb99, roughness: 0.55 });
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 64, 56),
      headMat);
    head.position.y = 1.78; head.scale.set(1.0, 1.05, 0.95);
    head.castShadow = true;
    this._playerMesh.add(head);
    // Cheekbones
    const cheekGeo = new THREE.SphereGeometry(0.04, 32, 24);
    const cheekL = new THREE.Mesh(cheekGeo, headMat); cheekL.position.set(-0.15, 1.76, 0.12); cheekL.scale.set(1.2, 0.7, 0.8);
    const cheekR = new THREE.Mesh(cheekGeo, headMat); cheekR.position.set(0.15, 1.76, 0.12); cheekR.scale.set(1.2, 0.7, 0.8);
    this._playerMesh.add(cheekL, cheekR);
    // Chin (more defined, pointed)
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.055, 40, 32),
      headMat);
    chin.position.set(0, 1.62, 0.15); chin.scale.set(0.9, 1.1, 1.0);
    this._playerMesh.add(chin);
    // Jaw line
    const jawGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.1, 20);
    const jawL = new THREE.Mesh(jawGeo, headMat); jawL.position.set(-0.13, 1.66, 0.1); jawL.rotation.z = 0.6; jawL.rotation.x = -0.2;
    const jawR = new THREE.Mesh(jawGeo, headMat); jawR.position.set(0.13, 1.66, 0.1); jawR.rotation.z = -0.6; jawR.rotation.x = -0.2;
    this._playerMesh.add(jawL, jawR);
    // Eye sockets (subtle indentation)
    const socketMat = new THREE.MeshStandardMaterial({ color: 0xccaa88, roughness: 0.6 });
    const socketGeo = new THREE.SphereGeometry(0.042, 32, 24);
    const sockL = new THREE.Mesh(socketGeo, socketMat); sockL.position.set(-0.08, 1.8, 0.165);
    const sockR = new THREE.Mesh(socketGeo, socketMat); sockR.position.set(0.08, 1.8, 0.165);
    this._playerMesh.add(sockL, sockR);
    // Eyes
    const eyeWhiteGeo = new THREE.SphereGeometry(0.035, 36, 28);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const eyeL = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat); eyeL.position.set(-0.08, 1.8, 0.18);
    const eyeR = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat); eyeR.position.set(0.08, 1.8, 0.18);
    this._playerMesh.add(eyeL, eyeR);
    // Irises (glowing purple - sorcerous)
    const irisGeo = new THREE.SphereGeometry(0.018, 32, 28);
    const irisMat = new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 1.5 });
    const irisL = new THREE.Mesh(irisGeo, irisMat); irisL.position.set(-0.08, 1.8, 0.21);
    const irisR = new THREE.Mesh(irisGeo, irisMat); irisR.position.set(0.08, 1.8, 0.21);
    this._playerMesh.add(irisL, irisR);
    // Pupils
    const pupilGeo = new THREE.SphereGeometry(0.008, 24, 20);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x110022 });
    const pupL = new THREE.Mesh(pupilGeo, pupilMat); pupL.position.set(-0.08, 1.8, 0.225);
    const pupR = new THREE.Mesh(pupilGeo, pupilMat); pupR.position.set(0.08, 1.8, 0.225);
    this._playerMesh.add(pupL, pupR);
    // Eyelashes (upper, dark arcs)
    const lashMat = new THREE.MeshStandardMaterial({ color: 0x050210, roughness: 0.9 });
    const lashGeo = new THREE.TorusGeometry(0.036, 0.003, 8, 24, Math.PI);
    const lashL = new THREE.Mesh(lashGeo, lashMat); lashL.position.set(-0.08, 1.82, 0.2); lashL.rotation.x = -0.3;
    const lashR = new THREE.Mesh(lashGeo, lashMat); lashR.position.set(0.08, 1.82, 0.2); lashR.rotation.x = -0.3;
    this._playerMesh.add(lashL, lashR);
    // Brow ridge (arched, expressive)
    const browGeo = new THREE.TorusGeometry(0.045, 0.007, 12, 28, Math.PI * 0.8);
    const browMat = new THREE.MeshStandardMaterial({ color: 0x0a0520, roughness: 0.9 });
    const browL = new THREE.Mesh(browGeo, browMat); browL.position.set(-0.08, 1.845, 0.18); browL.rotation.x = -0.15; browL.rotation.z = 0.1;
    const browR = new THREE.Mesh(browGeo, browMat); browR.position.set(0.08, 1.845, 0.18); browR.rotation.x = -0.15; browR.rotation.z = -0.1;
    this._playerMesh.add(browL, browR);
    // Nose (bridge + tip + nostrils)
    const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.03),
      headMat);
    noseBridge.position.set(0, 1.78, 0.21);
    this._playerMesh.add(noseBridge);
    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.018, 28, 24),
      headMat);
    noseTip.position.set(0, 1.745, 0.23);
    this._playerMesh.add(noseTip);
    // Nostrils
    const nostrilGeo = new THREE.SphereGeometry(0.008, 20, 16);
    const nostrilMat = new THREE.MeshStandardMaterial({ color: 0xbb9977, roughness: 0.7 });
    const nostL = new THREE.Mesh(nostrilGeo, nostrilMat); nostL.position.set(-0.012, 1.74, 0.225);
    const nostR = new THREE.Mesh(nostrilGeo, nostrilMat); nostR.position.set(0.012, 1.74, 0.225);
    this._playerMesh.add(nostL, nostR);
    // Lips (upper and lower)
    const upperLipGeo = new THREE.TorusGeometry(0.028, 0.006, 16, 32, Math.PI);
    const lipMat = new THREE.MeshStandardMaterial({ color: 0xcc7766, roughness: 0.5 });
    const upperLip = new THREE.Mesh(upperLipGeo, lipMat);
    upperLip.position.set(0, 1.718, 0.2); upperLip.rotation.y = Math.PI;
    this._playerMesh.add(upperLip);
    const lowerLipGeo = new THREE.TorusGeometry(0.025, 0.007, 16, 32, Math.PI);
    const lowerLip = new THREE.Mesh(lowerLipGeo, new THREE.MeshStandardMaterial({ color: 0xdd8877, roughness: 0.45 }));
    lowerLip.position.set(0, 1.706, 0.198);
    this._playerMesh.add(lowerLip);
    // Cupid's bow (lip detail)
    const cupidGeo = new THREE.SphereGeometry(0.006, 16, 12);
    const cupid = new THREE.Mesh(cupidGeo, lipMat); cupid.position.set(0, 1.723, 0.215);
    this._playerMesh.add(cupid);
    // Ears (more detailed with helix)
    const earGeo = new THREE.SphereGeometry(0.04, 36, 28, 0, Math.PI);
    const earL = new THREE.Mesh(earGeo, skinMat); earL.position.set(-0.22, 1.78, 0); earL.rotation.y = Math.PI / 2;
    const earR = new THREE.Mesh(earGeo, skinMat); earR.position.set(0.22, 1.78, 0); earR.rotation.y = -Math.PI / 2;
    this._playerMesh.add(earL, earR);
    // Inner ear
    const innerEarGeo = new THREE.SphereGeometry(0.025, 28, 24, 0, Math.PI);
    const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xccaa88, roughness: 0.7 });
    const ieL = new THREE.Mesh(innerEarGeo, innerEarMat); ieL.position.set(-0.215, 1.78, 0.005); ieL.rotation.y = Math.PI / 2;
    const ieR = new THREE.Mesh(innerEarGeo, innerEarMat); ieR.position.set(0.215, 1.78, 0.005); ieR.rotation.y = -Math.PI / 2;
    this._playerMesh.add(ieL, ieR);
    // Earlobes
    const lobGeo = new THREE.SphereGeometry(0.012, 20, 16);
    const lobL = new THREE.Mesh(lobGeo, skinMat); lobL.position.set(-0.22, 1.74, 0.01);
    const lobR = new THREE.Mesh(lobGeo, skinMat); lobR.position.set(0.22, 1.74, 0.01);
    this._playerMesh.add(lobL, lobR);
    // Earrings (dangling chain with gem)
    const earringChainMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.8, roughness: 0.2 });
    const erChainGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.04, 12);
    const erChainL = new THREE.Mesh(erChainGeo, earringChainMat); erChainL.position.set(-0.23, 1.72, 0.01);
    const erChainR = new THREE.Mesh(erChainGeo, earringChainMat); erChainR.position.set(0.23, 1.72, 0.01);
    this._playerMesh.add(erChainL, erChainR);
    const earringMat = new THREE.MeshStandardMaterial({ color: 0xaa66ff, emissive: 0x8844ff, emissiveIntensity: 1.0, metalness: 0.8 });
    const earringGeo = new THREE.OctahedronGeometry(0.018, 3);
    const erL = new THREE.Mesh(earringGeo, earringMat); erL.position.set(-0.23, 1.695, 0.01);
    const erR = new THREE.Mesh(earringGeo, earringMat); erR.position.set(0.23, 1.695, 0.01);
    this._playerMesh.add(erL, erR);
    // Circlet / tiara
    const circletMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.85, roughness: 0.15 });
    const circletGeo = new THREE.TorusGeometry(0.23, 0.008, 16, 56);
    const circlet = new THREE.Mesh(circletGeo, circletMat);
    circlet.position.set(0, 1.87, 0); circlet.rotation.x = Math.PI / 8;
    this._playerMesh.add(circlet);
    // Circlet center gem
    const circletGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.02, 3),
      new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6633cc, emissiveIntensity: 2.5, metalness: 0.5 }));
    circletGem.position.set(0, 1.89, 0.2);
    this._playerMesh.add(circletGem);
    // Circlet side filigree
    const filMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.8, roughness: 0.2 });
    const filGeo = new THREE.TorusGeometry(0.012, 0.003, 8, 20);
    const filL = new THREE.Mesh(filGeo, filMat); filL.position.set(-0.12, 1.89, 0.16);
    const filR = new THREE.Mesh(filGeo, filMat); filR.position.set(0.12, 1.89, 0.16);
    this._playerMesh.add(filL, filR);

    // Hair (flowing, layered, volumetric)
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x0a0520, roughness: 0.95 });
    const hairHighlightMat = new THREE.MeshStandardMaterial({ color: 0x150835, roughness: 0.9 });
    // Hair top volume
    const hairGeo = new THREE.SphereGeometry(0.25, 64, 52, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.83;
    this._playerMesh.add(hair);
    // Hair volume layer (slight offset for fullness)
    const hairVol = new THREE.Mesh(new THREE.SphereGeometry(0.26, 56, 48, 0, Math.PI * 2, 0, Math.PI * 0.5), hairHighlightMat);
    hairVol.position.set(0, 1.84, -0.02);
    this._playerMesh.add(hairVol);
    // Hair back (main cascade - 3 overlapping tapers for volume)
    const hairBack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.03, 0.85, 52),
      hairMat);
    hairBack.position.set(0, 1.38, -0.14);
    this._playerMesh.add(hairBack);
    const hairBack2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.02, 0.75, 48),
      hairHighlightMat);
    hairBack2.position.set(0.04, 1.42, -0.16);
    this._playerMesh.add(hairBack2);
    const hairBack3 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.015, 0.7, 44),
      hairMat);
    hairBack3.position.set(-0.04, 1.44, -0.17);
    this._playerMesh.add(hairBack3);
    // Side hair strands (multiple per side for layered look)
    const strandGeo = new THREE.CylinderGeometry(0.035, 0.008, 0.5, 36);
    const strandSmGeo = new THREE.CylinderGeometry(0.025, 0.005, 0.4, 32);
    const strandL = new THREE.Mesh(strandGeo, hairMat); strandL.position.set(-0.19, 1.55, -0.04); strandL.rotation.z = 0.15;
    const strandR = new THREE.Mesh(strandGeo, hairMat); strandR.position.set(0.19, 1.55, -0.04); strandR.rotation.z = -0.15;
    this._playerMesh.add(strandL, strandR);
    // Inner side strands
    const strandL2 = new THREE.Mesh(strandSmGeo, hairHighlightMat); strandL2.position.set(-0.16, 1.58, 0.02); strandL2.rotation.z = 0.1;
    const strandR2 = new THREE.Mesh(strandSmGeo, hairHighlightMat); strandR2.position.set(0.16, 1.58, 0.02); strandR2.rotation.z = -0.1;
    this._playerMesh.add(strandL2, strandR2);
    // Wispy loose strands near face
    const wispGeo = new THREE.CylinderGeometry(0.008, 0.003, 0.2, 20);
    const wispL = new THREE.Mesh(wispGeo, hairMat); wispL.position.set(-0.2, 1.72, 0.08); wispL.rotation.z = 0.25;
    const wispR = new THREE.Mesh(wispGeo, hairMat); wispR.position.set(0.2, 1.72, 0.08); wispR.rotation.z = -0.25;
    this._playerMesh.add(wispL, wispR);
    // Front bangs (parted, two sections)
    const bangGeoL = new THREE.SphereGeometry(0.22, 48, 40, -Math.PI * 0.5, Math.PI * 0.45, 0, Math.PI * 0.22);
    const bangL2 = new THREE.Mesh(bangGeoL, hairMat);
    bangL2.position.set(-0.02, 1.85, 0.03);
    this._playerMesh.add(bangL2);
    const bangGeoR2 = new THREE.SphereGeometry(0.22, 48, 40, Math.PI * 0.05, Math.PI * 0.45, 0, Math.PI * 0.22);
    const bangR2 = new THREE.Mesh(bangGeoR2, hairMat);
    bangR2.position.set(0.02, 1.85, 0.03);
    this._playerMesh.add(bangR2);
    // Hair tips (wispy ends at bottom of cascade)
    for (let ht = 0; ht < 5; ht++) {
      const htAngle = ((ht - 2) / 4) * 0.6;
      const hairTip = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.1, 20),
        hairMat);
      hairTip.position.set(Math.sin(htAngle) * 0.06, 0.98, -0.15 + Math.abs(htAngle) * 0.05);
      hairTip.rotation.x = Math.PI; hairTip.rotation.z = htAngle * 0.3;
      this._playerMesh.add(hairTip);
    }

    // Cloak hood (resting on shoulders, more detailed)
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x1a0033, roughness: 0.85, side: THREE.DoubleSide });
    const hoodOuter = new THREE.Mesh(new THREE.SphereGeometry(0.22, 52, 44, 0, Math.PI * 2, 0, Math.PI * 0.45), hoodMat);
    hoodOuter.position.set(0, 1.55, -0.12);
    this._playerMesh.add(hoodOuter);
    // Hood inner lining
    const hoodInner = new THREE.Mesh(new THREE.SphereGeometry(0.19, 44, 36, 0, Math.PI * 2, 0, Math.PI * 0.42),
      new THREE.MeshStandardMaterial({ color: 0x331155, roughness: 0.9, side: THREE.DoubleSide }));
    hoodInner.position.set(0, 1.55, -0.11);
    this._playerMesh.add(hoodInner);
    // Hood point (draped tip at back)
    const hoodTip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 32),
      hoodMat);
    hoodTip.position.set(0, 1.42, -0.25); hoodTip.rotation.x = 0.8;
    this._playerMesh.add(hoodTip);

    // Cloak (layered for depth - outer with high subdivision)
    const cloakOuterGeo = new THREE.ConeGeometry(0.7, 1.8, 72, 6, true);
    this._playerCloak = new THREE.Mesh(cloakOuterGeo, new THREE.MeshStandardMaterial({
      color: 0x1a0033, roughness: 0.85, transparent: true, opacity: 0.88,
      side: THREE.DoubleSide,
    }));
    this._playerCloak.position.y = 0.9;
    this._playerMesh.add(this._playerCloak);
    // Inner cloak lining
    const cloakInnerGeo = new THREE.ConeGeometry(0.65, 1.7, 64, 5, true);
    const cloakInner = new THREE.Mesh(cloakInnerGeo, new THREE.MeshStandardMaterial({
      color: 0x331155, roughness: 0.9, transparent: true, opacity: 0.6,
      side: THREE.DoubleSide,
    }));
    cloakInner.position.y = 0.93;
    this._playerMesh.add(cloakInner);
    // Cloak fabric folds (vertical ridges for sculpted look)
    const foldMat = new THREE.MeshStandardMaterial({ color: 0x150028, roughness: 0.88, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    for (let fold = 0; fold < 8; fold++) {
      const foldAngle = (fold / 8) * Math.PI * 2;
      const foldGeo = new THREE.PlaneGeometry(0.04, 1.5, 1, 4);
      const foldMesh = new THREE.Mesh(foldGeo, foldMat);
      foldMesh.position.set(Math.cos(foldAngle) * 0.62, 0.95, Math.sin(foldAngle) * 0.62);
      foldMesh.rotation.y = -foldAngle + Math.PI / 2;
      this._playerMesh.add(foldMesh);
    }
    // Cloak collar
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.04, 32, 56),
      new THREE.MeshStandardMaterial({ color: 0x553388, metalness: 0.3 }));
    collar.position.y = 1.5;
    collar.rotation.x = Math.PI / 2;
    this._playerMesh.add(collar);
    // Cloak clasp (brooch)
    const clasp = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 3),
      new THREE.MeshStandardMaterial({ color: 0xcc88ff, emissive: 0x8844ff, emissiveIntensity: 1.5, metalness: 0.7 }));
    clasp.position.set(0, 1.5, 0.24);
    this._playerMesh.add(clasp);
    // Cloak hem trim
    const hemGeo = new THREE.TorusGeometry(0.7, 0.015, 16, 64);
    const hemMat = new THREE.MeshStandardMaterial({ color: 0x553388, metalness: 0.3, roughness: 0.5 });
    const hem = new THREE.Mesh(hemGeo, hemMat);
    hem.position.y = 0.02; hem.rotation.x = Math.PI / 2;
    this._playerMesh.add(hem);

    // Necklace / amulet
    const necklaceGeo = new THREE.TorusGeometry(0.12, 0.008, 16, 48);
    const necklaceMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.8, roughness: 0.2 });
    const necklace = new THREE.Mesh(necklaceGeo, necklaceMat);
    necklace.position.set(0, 1.52, 0.05); necklace.rotation.x = Math.PI / 2.5;
    this._playerMesh.add(necklace);
    // Pendant gem
    const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 2),
      new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6633cc, emissiveIntensity: 2.0 }));
    pendant.position.set(0, 1.45, 0.12);
    this._playerMesh.add(pendant);

    // Staff (more ornate with vine wrapping)
    const staffGeo = new THREE.CylinderGeometry(0.025, 0.04, 2.2, 48);
    this._playerStaff = new THREE.Mesh(staffGeo, new THREE.MeshStandardMaterial({
      color: 0x44220a, roughness: 0.7, metalness: 0.1,
    }));
    this._playerStaff.position.set(0.42, 1.1, 0);
    this._playerMesh.add(this._playerStaff);
    // Staff vine wrapping with leaves
    const vineMat = new THREE.MeshStandardMaterial({ color: 0x2a5522, roughness: 0.8 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x337733, roughness: 0.85, side: THREE.DoubleSide });
    for (let v = 0; v < 10; v++) {
      const vineGeo = new THREE.TorusGeometry(0.04, 0.007, 12, 32);
      const vine = new THREE.Mesh(vineGeo, vineMat);
      vine.position.set(0.42, 0.2 + v * 0.2, 0);
      vine.rotation.x = Math.PI / 2 + v * 0.35;
      vine.rotation.z = v * 0.4;
      this._playerMesh.add(vine);
      // Small leaves sprouting from vines
      if (v % 2 === 0) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.04), leafMat);
        const leafAngle = v * 0.8;
        leaf.position.set(0.42 + Math.cos(leafAngle) * 0.05, 0.22 + v * 0.2, Math.sin(leafAngle) * 0.05);
        leaf.rotation.y = leafAngle;
        leaf.rotation.x = 0.3;
        this._playerMesh.add(leaf);
      }
    }
    // Staff bark knots (natural wood detail)
    const knotMat = new THREE.MeshStandardMaterial({ color: 0x553310, roughness: 0.8 });
    const knotGeo = new THREE.SphereGeometry(0.015, 16, 12);
    const knot1 = new THREE.Mesh(knotGeo, knotMat); knot1.position.set(0.45, 0.6, 0.02);
    const knot2 = new THREE.Mesh(knotGeo, knotMat); knot2.position.set(0.39, 1.0, -0.02);
    const knot3 = new THREE.Mesh(knotGeo, knotMat); knot3.position.set(0.44, 1.6, 0.01);
    this._playerMesh.add(knot1, knot2, knot3);
    // Staff rings (metallic bands)
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x886644, metalness: 0.6 });
    for (let r = 0; r < 5; r++) {
      const sr = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 24, 48), ringMat);
      sr.position.set(0.42, 1.4 + r * 0.18, 0);
      sr.rotation.x = Math.PI / 2;
      this._playerMesh.add(sr);
    }
    // Staff head fork (Y-shaped cradle for crystal)
    const forkMat = new THREE.MeshStandardMaterial({ color: 0x44220a, roughness: 0.6, metalness: 0.15 });
    const forkL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.2, 32), forkMat);
    forkL.position.set(0.37, 2.2, 0); forkL.rotation.z = 0.6;
    const forkR = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.2, 32), forkMat);
    forkR.position.set(0.47, 2.2, 0); forkR.rotation.z = -0.6;
    this._playerMesh.add(forkL, forkR);

    // Staff crystal (bigger, multi-layered with orbiting shards)
    const crystalOuter = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 5),
      new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x8844ff, emissiveIntensity: 2.5, transparent: true, opacity: 0.7 }));
    crystalOuter.position.set(0.42, 2.3, 0);
    this._playerMesh.add(crystalOuter);
    this._staffCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.1, 5),
      new THREE.MeshStandardMaterial({ color: 0xcc88ff, emissive: 0xaa66ff, emissiveIntensity: 4.0 }));
    this._staffCrystal.position.set(0.42, 2.3, 0);
    this._playerMesh.add(this._staffCrystal);
    // Crystal floating shards (more, varied sizes)
    const shardMat = new THREE.MeshStandardMaterial({ color: 0xaa66ff, emissive: 0x8844ff, emissiveIntensity: 3.0, transparent: true, opacity: 0.6 });
    for (let s = 0; s < 6; s++) {
      const size = 0.02 + (s % 3) * 0.008;
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(size, 3), shardMat);
      const angle = (s / 6) * Math.PI * 2;
      const radius = 0.1 + (s % 2) * 0.06;
      shard.position.set(0.42 + Math.cos(angle) * radius, 2.3 + Math.sin(angle * 2) * 0.06, Math.sin(angle) * radius);
      this._playerMesh.add(shard);
    }
    // Crystal glow corona
    const coronaGeo = new THREE.RingGeometry(0.12, 0.22, 48);
    const coronaMat = new THREE.MeshBasicMaterial({ color: 0x8844ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const corona = new THREE.Mesh(coronaGeo, coronaMat);
    corona.position.set(0.42, 2.3, 0);
    this._playerMesh.add(corona);

    // Rune circle at feet (elaborate magical aura)
    const runeCircleMat = new THREE.MeshBasicMaterial({ color: 0x6633cc, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
    const runeCircleGeo = new THREE.RingGeometry(0.38, 0.42, 72);
    const runeCircle = new THREE.Mesh(runeCircleGeo, runeCircleMat);
    runeCircle.rotation.x = -Math.PI / 2; runeCircle.position.y = 0.03;
    this._playerMesh.add(runeCircle);
    // Middle rune ring
    const runeMidGeo = new THREE.RingGeometry(0.28, 0.31, 64);
    const runeMid = new THREE.Mesh(runeMidGeo, new THREE.MeshBasicMaterial({ color: 0x7744dd, transparent: true, opacity: 0.08, side: THREE.DoubleSide }));
    runeMid.rotation.x = -Math.PI / 2; runeMid.position.y = 0.032;
    this._playerMesh.add(runeMid);
    // Inner rune circle
    const runeInnerGeo = new THREE.RingGeometry(0.18, 0.21, 56);
    const runeInner = new THREE.Mesh(runeInnerGeo, new THREE.MeshBasicMaterial({ color: 0x8844ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide }));
    runeInner.rotation.x = -Math.PI / 2; runeInner.position.y = 0.035;
    this._playerMesh.add(runeInner);
    // Arcane spokes connecting rings
    const runeSpokesMat = new THREE.MeshBasicMaterial({ color: 0x6633cc, transparent: true, opacity: 0.06 });
    for (let rs = 0; rs < 8; rs++) {
      const rsAngle = (rs / 8) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.001, 0.22), runeSpokesMat);
      spoke.rotation.x = -Math.PI / 2; spoke.rotation.z = rsAngle;
      spoke.position.y = 0.033;
      this._playerMesh.add(spoke);
    }
    // Rune glyphs at cardinal points
    const glyphMat = new THREE.MeshBasicMaterial({ color: 0x8844ff, transparent: true, opacity: 0.12 });
    for (let rg = 0; rg < 6; rg++) {
      const rgAngle = (rg / 6) * Math.PI * 2;
      const glyph = new THREE.Mesh(new THREE.OctahedronGeometry(0.015, 1), glyphMat);
      glyph.position.set(Math.cos(rgAngle) * 0.4, 0.04, Math.sin(rgAngle) * 0.4);
      this._playerMesh.add(glyph);
    }

    // Player light
    this._playerLight = new THREE.PointLight(0x6633cc, 1.0, 10);
    this._playerLight.position.y = 2.0;
    this._playerMesh.add(this._playerLight);

    // Blob shadow on floor
    const shadowGeo = new THREE.CircleGeometry(0.5, 64);
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
    // Dark bolts: core + inner shell + outer glow + arcane ring + tendrils + trail segments
    const boltCore = new THREE.SphereGeometry(0.1, 48, 40);
    const boltInner = new THREE.SphereGeometry(0.18, 44, 38);
    const boltGlow = new THREE.SphereGeometry(0.32, 44, 36);
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(boltCore, new THREE.MeshStandardMaterial({
        color: 0xeeddff, emissive: 0xccaaff, emissiveIntensity: 6 }));
      const inner = new THREE.Mesh(boltInner, new THREE.MeshStandardMaterial({
        color: 0xaa77ff, emissive: 0x9955ff, emissiveIntensity: 4, transparent: true, opacity: 0.6 }));
      const glow = new THREE.Mesh(boltGlow, new THREE.MeshBasicMaterial({
        color: BOLT_COLOR, transparent: true, opacity: 0.2 }));
      g.add(core, inner, glow);
      // Arcane ring orbiting the bolt
      const boltRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.01, 12, 40),
        new THREE.MeshBasicMaterial({ color: 0xcc88ff, transparent: true, opacity: 0.5 }));
      g.add(boltRing);
      // Dark tendrils (elongated spikes radiating out)
      const tendrilMat = new THREE.MeshBasicMaterial({ color: 0x7744cc, transparent: true, opacity: 0.4 });
      for (let td = 0; td < 4; td++) {
        const tendril = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.2, 16), tendrilMat);
        const ta = (td / 4) * Math.PI * 2;
        tendril.position.set(Math.cos(ta) * 0.15, 0, Math.sin(ta) * 0.15);
        tendril.rotation.z = Math.PI / 2;
        tendril.rotation.y = ta;
        g.add(tendril);
      }
      g.visible = false;
      this._fxGroup.add(g);
      this._boltPool.push(g as unknown as THREE.Mesh);
      const l = new THREE.PointLight(BOLT_COLOR, 1.5, 6);
      l.visible = false;
      this._fxGroup.add(l);
      this._boltLights.push(l);
      // Trail segments (small spheres + octahedron shards that fade)
      for (let t = 0; t < 5; t++) {
        const trailG = new THREE.Group();
        const trailSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.07 - t * 0.012, 36, 28),
          new THREE.MeshBasicMaterial({ color: BOLT_COLOR, transparent: true, opacity: 0.4 - t * 0.08 }));
        trailG.add(trailSphere);
        if (t < 3) {
          const trailShard = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.03 - t * 0.008, 2),
            new THREE.MeshBasicMaterial({ color: 0xaa77ff, transparent: true, opacity: 0.3 - t * 0.08 }));
          trailShard.position.set((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, 0);
          trailG.add(trailShard);
        }
        (trailG as any).visible = false;
        this._fxGroup.add(trailG);
        this._boltTrailPool.push(trailG as unknown as THREE.Mesh);
      }
    }
    // Fireballs: core + mid shell + outer fire + corona ring + ember fragments
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 44, 36),
        new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffcc44, emissiveIntensity: 6 }));
      const mid = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 44, 36),
        new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 4, transparent: true, opacity: 0.6 }));
      const outer = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 40, 34),
        new THREE.MeshBasicMaterial({ color: FIREBALL_COLOR, transparent: true, opacity: 0.3 }));
      g.add(core, mid, outer);
      // Fire corona ring
      const fireRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 12, 40),
        new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.35 }));
      g.add(fireRing);
      // Ember fragments orbiting
      const emberMat = new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.6 });
      for (let em = 0; em < 5; em++) {
        const ember = new THREE.Mesh(new THREE.OctahedronGeometry(0.015, 1), emberMat);
        const ea = (em / 5) * Math.PI * 2;
        ember.position.set(Math.cos(ea) * 0.18, Math.sin(ea * 1.5) * 0.08, Math.sin(ea) * 0.18);
        g.add(ember);
      }
      // Smoke wisps (darker outer shell)
      const smokeShell = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 36, 28),
        new THREE.MeshBasicMaterial({ color: 0x332211, transparent: true, opacity: 0.1 }));
      g.add(smokeShell);
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
    // Portal pillars (archway frame)
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.6, metalness: 0.2 });
    const pillarGeo = new THREE.CylinderGeometry(0.12, 0.15, 2.5, 48);
    const pillarL = new THREE.Mesh(pillarGeo, pillarMat); pillarL.position.set(-1.3, 1.25, 0);
    const pillarR = new THREE.Mesh(pillarGeo, pillarMat); pillarR.position.set(1.3, 1.25, 0);
    this._exitMarker.add(pillarL, pillarR);
    // Pillar bases
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x2a3344, roughness: 0.7 });
    const baseGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.15, 48);
    const baseL = new THREE.Mesh(baseGeo, baseMat); baseL.position.set(-1.3, 0.075, 0);
    const baseR = new THREE.Mesh(baseGeo, baseMat); baseR.position.set(1.3, 0.075, 0);
    this._exitMarker.add(baseL, baseR);
    // Pillar capitals
    const capGeo = new THREE.CylinderGeometry(0.2, 0.12, 0.12, 48);
    const capL = new THREE.Mesh(capGeo, baseMat); capL.position.set(-1.3, 2.52, 0);
    const capR = new THREE.Mesh(capGeo, baseMat); capR.position.set(1.3, 2.52, 0);
    this._exitMarker.add(capL, capR);
    // Archway top
    const archGeo = new THREE.TorusGeometry(1.3, 0.1, 32, 64, Math.PI);
    const arch = new THREE.Mesh(archGeo, pillarMat);
    arch.position.y = 2.5; arch.rotation.z = Math.PI;
    this._exitMarker.add(arch);
    // Pillar rune carvings (glowing lines)
    const pillarRuneMat = new THREE.MeshStandardMaterial({ color: EXIT_COLOR, emissive: EXIT_COLOR, emissiveIntensity: 1.0 });
    for (let pr = 0; pr < 4; pr++) {
      const runeRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.008, 8, 32), pillarRuneMat);
      runeRing.position.set(-1.3, 0.5 + pr * 0.5, 0); runeRing.rotation.x = Math.PI / 2;
      const runeRingR = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.008, 8, 32), pillarRuneMat);
      runeRingR.position.set(1.3, 0.5 + pr * 0.5, 0); runeRingR.rotation.x = Math.PI / 2;
      this._exitMarker.add(runeRing, runeRingR);
    }
    // Keystone gem at arch top
    const keystone = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 4),
      new THREE.MeshStandardMaterial({ color: EXIT_COLOR, emissive: EXIT_COLOR, emissiveIntensity: 3.0 }));
    keystone.position.y = 3.75;
    this._exitMarker.add(keystone);

    // Outer ring (horizontal, spinning)
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.08, 32, 72),
      new THREE.MeshStandardMaterial({ color: EXIT_COLOR, emissive: EXIT_COLOR, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 }));
    ring1.rotation.x = Math.PI / 2; ring1.position.y = 1.0;
    this._exitMarker.add(ring1);
    // Middle ring
    const ring15 = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.05, 24, 64),
      new THREE.MeshStandardMaterial({ color: 0x33ddaa, emissive: 0x33ddaa, emissiveIntensity: 0.6, transparent: true, opacity: 0.4 }));
    ring15.rotation.x = Math.PI / 2; ring15.position.y = 1.0;
    this._exitMarker.add(ring15);
    // Inner ring (counter-rotating)
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.06, 28, 60),
      new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x44ffaa, emissiveIntensity: 1.0, transparent: true, opacity: 0.5 }));
    ring2.rotation.x = Math.PI / 2; ring2.position.y = 1.0;
    this._exitMarker.add(ring2);
    // Innermost ring
    const ring3 = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.04, 24, 52),
      new THREE.MeshStandardMaterial({ color: 0x66ffcc, emissive: 0x66ffcc, emissiveIntensity: 1.2, transparent: true, opacity: 0.3 }));
    ring3.rotation.x = Math.PI / 2; ring3.position.y = 1.0;
    this._exitMarker.add(ring3);
    // Portal fill (layered with inner glow)
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 72),
      new THREE.MeshBasicMaterial({ color: EXIT_COLOR, transparent: true, opacity: 0.1, side: THREE.DoubleSide }));
    fill.rotation.x = Math.PI / 2; fill.position.y = 1.0;
    this._exitMarker.add(fill);
    const fillInner = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 56),
      new THREE.MeshBasicMaterial({ color: 0x88ffdd, transparent: true, opacity: 0.08, side: THREE.DoubleSide }));
    fillInner.rotation.x = Math.PI / 2; fillInner.position.y = 1.01;
    this._exitMarker.add(fillInner);
    // Arcane symbols floating in portal
    const arcSymMat = new THREE.MeshBasicMaterial({ color: EXIT_COLOR, transparent: true, opacity: 0.3 });
    for (let asym = 0; asym < 6; asym++) {
      const symAngle = (asym / 6) * Math.PI * 2;
      const sym = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 2), arcSymMat);
      sym.position.set(Math.cos(symAngle) * 0.55, 1.0, Math.sin(symAngle) * 0.55);
      this._exitMarker.add(sym);
    }
    // Floor rune circle
    const floorRune = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.15, 72),
      new THREE.MeshBasicMaterial({ color: EXIT_COLOR, transparent: true, opacity: 0.15, side: THREE.DoubleSide }));
    floorRune.rotation.x = -Math.PI / 2; floorRune.position.y = 0.03;
    this._exitMarker.add(floorRune);
    const floorRuneInner = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.78, 64),
      new THREE.MeshBasicMaterial({ color: EXIT_COLOR, transparent: true, opacity: 0.1, side: THREE.DoubleSide }));
    floorRuneInner.rotation.x = -Math.PI / 2; floorRuneInner.position.y = 0.035;
    this._exitMarker.add(floorRuneInner);
    // Light
    const el = new THREE.PointLight(EXIT_COLOR, 1.2, 10);
    el.position.y = 1.5;
    this._exitMarker.add(el);
    // Secondary light (softer, broader)
    const el2 = new THREE.PointLight(0x44ffaa, 0.5, 6);
    el2.position.y = 2.5;
    this._exitMarker.add(el2);
    // Swirling particles (more)
    const epCount = 45;
    this._exitParticlePositions = new Float32Array(epCount * 3);
    const epGeo = new THREE.BufferGeometry();
    for (let i = 0; i < epCount; i++) {
      const a = (i / epCount) * Math.PI * 2;
      const r = 0.5 + (i % 3) * 0.2;
      this._exitParticlePositions[i * 3] = Math.cos(a) * r;
      this._exitParticlePositions[i * 3 + 1] = 0.5 + (i / epCount) * 1.5;
      this._exitParticlePositions[i * 3 + 2] = Math.sin(a) * r;
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
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.6, metalness: 0.05 });
    const lockedDoorMat = new THREE.MeshStandardMaterial({ color: 0x886633, roughness: 0.4, metalness: 0.35 });

    const wallGeo = new THREE.BoxGeometry(CELL_SIZE, 2.5, CELL_SIZE, 3, 4, 3);
    const floorGeo = new THREE.BoxGeometry(CELL_SIZE, 0.2, CELL_SIZE, 3, 1, 3);
    const doorGeo = new THREE.BoxGeometry(CELL_SIZE * 0.15, 2.5, CELL_SIZE, 2, 4, 3);

    // No ceiling mesh — camera is inside the dungeon looking at rooms from above/behind

    for (let y = 0; y < FLOOR_H; y++) {
      for (let x = 0; x < FLOOR_W; x++) {
        const tile = state.tiles[y][x];
        const wx = x * CELL_SIZE + CELL_SIZE / 2;
        const wz = y * CELL_SIZE + CELL_SIZE / 2;

        switch (tile) {
          case TileType.WALL: {
            const m = new THREE.Mesh(wallGeo, wallMat);
            m.position.set(wx, 1.25, wz);
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
            // Door planks (horizontal lines)
            const plankMat = new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 0.75 });
            for (let dp = 0; dp < 5; dp++) {
              const plank = new THREE.Mesh(new THREE.BoxGeometry(CELL_SIZE * 0.16, 0.02, CELL_SIZE * 1.01), plankMat);
              plank.position.set(wx, 0.3 + dp * 0.5, wz);
              this._mapGroup.add(plank);
            }
            // Door studs (nail heads)
            const studMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 });
            const studGeo = new THREE.SphereGeometry(0.015, 12, 8);
            for (let ds = 0; ds < 8; ds++) {
              const stud = new THREE.Mesh(studGeo, studMat);
              stud.position.set(wx + CELL_SIZE * 0.08, 0.3 + ds * 0.3, wz + (ds % 2 === 0 ? -0.25 : 0.25) * CELL_SIZE);
              this._mapGroup.add(stud);
            }
            // Door handle (ring pull)
            const doorRing = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 16, 32),
              new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.75, roughness: 0.25 }));
            doorRing.position.set(wx + CELL_SIZE * 0.08, 1.2, wz + 0.15);
            this._mapGroup.add(doorRing);
            // Door handle mount plate
            const mountPlate = new THREE.Mesh(new THREE.CircleGeometry(0.04, 28),
              new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7 }));
            mountPlate.position.set(wx + CELL_SIZE * 0.081, 1.2, wz + 0.15);
            mountPlate.rotation.y = Math.PI / 2;
            this._mapGroup.add(mountPlate);
            // Door frame posts
            const postGeo = new THREE.BoxGeometry(0.1, 2.5, 0.1);
            const postMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.7 });
            const p1 = new THREE.Mesh(postGeo, postMat); p1.position.set(wx - CELL_SIZE * 0.45, 1.25, wz);
            const p2 = new THREE.Mesh(postGeo, postMat); p2.position.set(wx + CELL_SIZE * 0.45, 1.25, wz);
            this._mapGroup.add(d, p1, p2);
            // Door frame lintel (top beam)
            const lintel = new THREE.Mesh(new THREE.BoxGeometry(CELL_SIZE * 1.0, 0.1, 0.12),
              new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.7 }));
            lintel.position.set(wx, 2.5, wz);
            this._mapGroup.add(lintel);
            // Hinges
            const hingeMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.25 });
            const hingeGeo = new THREE.BoxGeometry(0.04, 0.08, 0.02);
            const h1 = new THREE.Mesh(hingeGeo, hingeMat); h1.position.set(wx - CELL_SIZE * 0.08, 0.8, wz - CELL_SIZE * 0.48);
            const h2 = new THREE.Mesh(hingeGeo, hingeMat); h2.position.set(wx - CELL_SIZE * 0.08, 1.8, wz - CELL_SIZE * 0.48);
            this._mapGroup.add(h1, h2);
            // Hinge pins
            const pinGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.1, 12);
            const pin1 = new THREE.Mesh(pinGeo, hingeMat); pin1.position.set(wx - CELL_SIZE * 0.08, 0.8, wz - CELL_SIZE * 0.49);
            const pin2 = new THREE.Mesh(pinGeo, hingeMat); pin2.position.set(wx - CELL_SIZE * 0.08, 1.8, wz - CELL_SIZE * 0.49);
            this._mapGroup.add(pin1, pin2);
            break;
          }
          case TileType.LOCKED_DOOR: {
            this._mapGroup.add(new THREE.Mesh(floorGeo, floorMat).translateX(wx).translateZ(wz));
            const d = new THREE.Mesh(doorGeo, lockedDoorMat);
            d.position.set(wx, 1.25, wz);
            // Iron bands (3 bands)
            const bandGeo = new THREE.BoxGeometry(CELL_SIZE * 0.18, 0.06, CELL_SIZE * 1.02);
            const bandMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.3 });
            const b1 = new THREE.Mesh(bandGeo, bandMat); b1.position.set(wx, 0.6, wz);
            const b2 = new THREE.Mesh(bandGeo, bandMat); b2.position.set(wx, 1.2, wz);
            const b3 = new THREE.Mesh(bandGeo, bandMat); b3.position.set(wx, 1.8, wz);
            this._mapGroup.add(b1, b2, b3);
            // Band rivets
            const bStudMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.75 });
            for (let bnd = 0; bnd < 3; bnd++) {
              const bndY = 0.6 + bnd * 0.6;
              for (let bstud = 0; bstud < 4; bstud++) {
                const bStudMesh = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), bStudMat);
                bStudMesh.position.set(wx + CELL_SIZE * 0.09, bndY, wz - CELL_SIZE * 0.35 + bstud * CELL_SIZE * 0.23);
                this._mapGroup.add(bStudMesh);
              }
            }
            // Lock plate
            const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.06),
              new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.75, roughness: 0.3 }));
            lockPlate.position.set(wx + CELL_SIZE * 0.09, 1.2, wz);
            this._mapGroup.add(lockPlate);
            // Lock (ornate)
            const lock = new THREE.Mesh(
              new THREE.TorusGeometry(0.08, 0.02, 28, 48),
              new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.4, metalness: 0.9 }));
            lock.position.set(wx + CELL_SIZE * 0.1, 1.2, wz);
            this._mapGroup.add(lock);
            // Keyhole
            const keyhole = new THREE.Mesh(new THREE.CircleGeometry(0.015, 24),
              new THREE.MeshBasicMaterial({ color: 0x111111 }));
            keyhole.position.set(wx + CELL_SIZE * 0.11, 1.2, wz);
            keyhole.rotation.y = Math.PI / 2;
            this._mapGroup.add(keyhole);
            // Lock glow
            const lockGlow = new THREE.PointLight(0xffd700, 0.2, 2);
            lockGlow.position.set(wx + CELL_SIZE * 0.1, 1.2, wz);
            this._scene.add(lockGlow);
            this._torchLights.push(lockGlow);
            // Door frame
            const ldPostGeo = new THREE.BoxGeometry(0.12, 2.5, 0.12);
            const ldPostMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.6, metalness: 0.1 });
            const lp1 = new THREE.Mesh(ldPostGeo, ldPostMat); lp1.position.set(wx - CELL_SIZE * 0.45, 1.25, wz);
            const lp2 = new THREE.Mesh(ldPostGeo, ldPostMat); lp2.position.set(wx + CELL_SIZE * 0.45, 1.25, wz);
            this._mapGroup.add(d, lp1, lp2);
            // Warning skull above locked door
            const warnSkull = new THREE.Mesh(new THREE.SphereGeometry(0.06, 28, 24),
              new THREE.MeshStandardMaterial({ color: 0xddddbb, roughness: 0.7 }));
            warnSkull.position.set(wx, 2.55, wz);
            this._mapGroup.add(warnSkull);
            const skullJaw2 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 24, 20, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.6),
              new THREE.MeshStandardMaterial({ color: 0xddddbb, roughness: 0.7 }));
            skullJaw2.position.set(wx, 2.52, wz);
            this._mapGroup.add(skullJaw2);
            break;
          }
          case TileType.TORCH: {
            const w2 = new THREE.Mesh(wallGeo, wallMat);
            w2.position.set(wx, 1.25, wz);
            this._mapGroup.add(w2);
            // Bracket (iron mount with scroll ends)
            const bracketMat3 = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
            const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.35), bracketMat3);
            bracket.position.set(wx, 1.95, wz);
            this._mapGroup.add(bracket);
            // Bracket scroll ends
            const scrollEnd1 = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 12, 24, Math.PI), bracketMat3);
            scrollEnd1.position.set(wx, 1.95, wz + 0.18); scrollEnd1.rotation.y = Math.PI / 2;
            this._mapGroup.add(scrollEnd1);
            // Bracket wall plate
            const wallPlate = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.02), bracketMat3);
            wallPlate.position.set(wx, 1.95, wz - 0.17);
            this._mapGroup.add(wallPlate);
            // Bracket rivets
            const brvMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7 });
            const brv1 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), brvMat);
            brv1.position.set(wx - 0.04, 1.99, wz - 0.16);
            const brv2 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), brvMat);
            brv2.position.set(wx + 0.04, 1.91, wz - 0.16);
            this._mapGroup.add(brv1, brv2);
            // Torch handle (tapered with wrapping)
            const handle = new THREE.Mesh(
              new THREE.CylinderGeometry(0.035, 0.06, 0.5, 44),
              new THREE.MeshStandardMaterial({ color: 0x886633, roughness: 0.8 }));
            handle.position.set(wx, 2.15, wz);
            this._mapGroup.add(handle);
            // Handle wrapping bands
            const wrapMat2 = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
            for (let tw = 0; tw < 3; tw++) {
              const twrap = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 8, 24), wrapMat2);
              twrap.position.set(wx, 1.98 + tw * 0.12, wz); twrap.rotation.x = Math.PI / 2;
              this._mapGroup.add(twrap);
            }
            // Torch dish (top bowl)
            const dish = new THREE.Mesh(
              new THREE.CylinderGeometry(0.08, 0.05, 0.06, 40),
              new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 }));
            dish.position.set(wx, 2.4, wz);
            this._mapGroup.add(dish);
            // Flame (multi-layered for volume)
            const flameMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 4 });
            const flame1 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 44), flameMat);
            flame1.position.set(wx, 2.48, wz);
            const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 40),
              new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa00, emissiveIntensity: 5 }));
            flame2.position.set(wx, 2.5, wz);
            const flame3 = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 32),
              new THREE.MeshStandardMaterial({ color: 0xffeeaa, emissive: 0xffdd66, emissiveIntensity: 6 }));
            flame3.position.set(wx, 2.52, wz);
            // Flame base glow
            const flameBase = new THREE.Mesh(new THREE.SphereGeometry(0.07, 32, 24),
              new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.3 }));
            flameBase.position.set(wx, 2.42, wz);
            this._mapGroup.add(flame1, flame2, flame3, flameBase);
            this._torchFlames.push(flame1, flame2, flame3);
            // Torch light
            const light = new THREE.PointLight(0xff8844, 2.0, TORCH_RANGE * 2.0, 2);
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

    // Snap camera to player position immediately (no lerp lag on first frame)
    const p = state.player;
    const snapCamX = p.pos.x - Math.sin(p.angle) * CAM_DISTANCE;
    const snapCamZ = p.pos.z - Math.cos(p.angle) * CAM_DISTANCE;
    this._camPos.set(snapCamX, CAM_HEIGHT, snapCamZ);
    this._camTarget.set(p.pos.x + Math.sin(p.angle) * 1.5, 1.2, p.pos.z + Math.cos(p.angle) * 1.5);
    this._camera.position.copy(this._camPos);
    this._camera.lookAt(this._camTarget);

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
      const houndMat = new THREE.MeshStandardMaterial({ color: typeColor, roughness: 0.8 });
      // Body (rounded, muscular)
      const bodyGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.85, 48);
      const body = new THREE.Mesh(bodyGeo, houndMat);
      body.position.set(0, 0.35, 0); body.rotation.x = Math.PI / 2;
      body.castShadow = true; g.add(body);
      // Ribcage / chest bulge
      const chest = new THREE.Mesh(new THREE.SphereGeometry(0.22, 48, 40),
        new THREE.MeshStandardMaterial({ color: typeColor, roughness: 0.75 }));
      chest.position.set(0, 0.36, 0.2); chest.scale.set(1, 0.85, 1.1); g.add(chest);
      // Haunches
      const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.19, 44, 36),
        houndMat);
      haunch.position.set(0, 0.34, -0.32); haunch.scale.set(1.1, 0.9, 1); g.add(haunch);
      // Legs (upper + lower with joints)
      const upperLegGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.2, 44);
      const lowerLegGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.18, 44);
      const jointGeo = new THREE.SphereGeometry(0.04, 32, 28);
      const legMat = new THREE.MeshStandardMaterial({ color: typeColor, roughness: 0.7 });
      for (const [lx, lz, isFront] of [[-0.14, 0.28, true], [0.14, 0.28, true], [-0.14, -0.32, false], [0.14, -0.32, false]] as const) {
        const upper = new THREE.Mesh(upperLegGeo, legMat);
        upper.position.set(lx, 0.2, lz); g.add(upper);
        const joint = new THREE.Mesh(jointGeo, legMat);
        joint.position.set(lx, 0.1, lz); g.add(joint);
        const lower = new THREE.Mesh(lowerLegGeo, legMat);
        lower.position.set(lx, 0.05, lz); g.add(lower);
        // Paws
        const paw = new THREE.Mesh(new THREE.SphereGeometry(0.04, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.6),
          legMat);
        paw.position.set(lx, 0.0, lz + (isFront ? 0.02 : -0.02)); paw.rotation.x = -Math.PI / 2;
        g.add(paw);
      }
      // Neck
      const neckGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.2, 44);
      const neck = new THREE.Mesh(neckGeo, houndMat);
      neck.position.set(0, 0.42, 0.42); neck.rotation.x = -0.6; g.add(neck);
      // Head (more detailed - rounded instead of box)
      const headGeo = new THREE.SphereGeometry(0.16, 52, 44);
      const headMesh = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: typeColor, roughness: 0.7 }));
      headMesh.position.set(0, 0.48, 0.52); headMesh.scale.set(1, 0.9, 1.15); g.add(headMesh);
      // Snout (tapered cylinder for more realism)
      const snoutGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.22, 44);
      const snout = new THREE.Mesh(snoutGeo, houndMat);
      snout.position.set(0, 0.42, 0.7); snout.rotation.x = Math.PI / 2; g.add(snout);
      // Nose tip
      const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 32, 24),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 }));
      noseTip.position.set(0, 0.42, 0.82); g.add(noseTip);
      // Jaw (lower)
      const jawGeo = new THREE.CylinderGeometry(0.04, 0.07, 0.18, 40);
      const jaw = new THREE.Mesh(jawGeo, houndMat);
      jaw.position.set(0, 0.37, 0.67); jaw.rotation.x = Math.PI / 2; g.add(jaw);
      // Teeth (fangs)
      const fangMat = new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.3, metalness: 0.1 });
      const fangGeo = new THREE.ConeGeometry(0.012, 0.06, 24);
      const fangPosns: [number, number, number][] = [[-0.04, 0.38, 0.74], [0.04, 0.38, 0.74], [-0.06, 0.39, 0.68], [0.06, 0.39, 0.68]];
      for (const [fx, fy, fz] of fangPosns) {
        const fang = new THREE.Mesh(fangGeo, fangMat);
        fang.position.set(fx, fy, fz); fang.rotation.x = Math.PI; g.add(fang);
      }
      // Ears (pointed, upright)
      const earGeo = new THREE.ConeGeometry(0.05, 0.12, 36);
      const earMat = new THREE.MeshStandardMaterial({ color: typeColor, roughness: 0.8 });
      const earL = new THREE.Mesh(earGeo, earMat); earL.position.set(-0.1, 0.6, 0.48); earL.rotation.z = -0.3;
      const earR = new THREE.Mesh(earGeo, earMat); earR.position.set(0.1, 0.6, 0.48); earR.rotation.z = 0.3;
      g.add(earL, earR);
      // Eyes (glowing red)
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3 });
      const eyeGeo = new THREE.SphereGeometry(0.035, 44, 36);
      const eye1 = new THREE.Mesh(eyeGeo, eyeMat); eye1.position.set(-0.1, 0.52, 0.6); g.add(eye1);
      const eye2 = new THREE.Mesh(eyeGeo, eyeMat); eye2.position.set(0.1, 0.52, 0.6); g.add(eye2);
      // Pupils (slitted)
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x330000 });
      const pupilGeo = new THREE.BoxGeometry(0.005, 0.04, 0.005);
      const pup1 = new THREE.Mesh(pupilGeo, pupilMat); pup1.position.set(-0.1, 0.52, 0.635);
      const pup2 = new THREE.Mesh(pupilGeo, pupilMat); pup2.position.set(0.1, 0.52, 0.635);
      g.add(pup1, pup2);
      // Spiked collar
      const collarGeo = new THREE.TorusGeometry(0.14, 0.02, 20, 48);
      const collarMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.2 });
      const collarMesh = new THREE.Mesh(collarGeo, collarMat);
      collarMesh.position.set(0, 0.4, 0.38); collarMesh.rotation.x = -0.6; g.add(collarMesh);
      // Collar spikes
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.9, roughness: 0.1 });
      for (let s = 0; s < 6; s++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 24), spikeMat);
        const angle = (s / 6) * Math.PI * 2;
        spike.position.set(Math.cos(angle) * 0.14, 0.4 + Math.sin(angle) * 0.02, 0.38 + Math.sin(angle) * 0.14 * 0.3);
        g.add(spike);
      }
      // Spine ridges (bony protrusions along back)
      const spineMat = new THREE.MeshStandardMaterial({ color: typeColor, roughness: 0.6, metalness: 0.15 });
      for (let sr = 0; sr < 7; sr++) {
        const spineRidge = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 20), spineMat);
        spineRidge.position.set(0, 0.52, -0.3 + sr * 0.1);
        g.add(spineRidge);
      }
      // Ribcage ridges (visible musculature)
      const ribMat = new THREE.MeshStandardMaterial({ color: typeColor, roughness: 0.85 });
      for (let rb = 0; rb < 4; rb++) {
        const ribGeo = new THREE.TorusGeometry(0.16, 0.008, 8, 24, Math.PI * 0.6);
        const ribL = new THREE.Mesh(ribGeo, ribMat);
        ribL.position.set(-0.02, 0.35, 0.05 + rb * 0.08); ribL.rotation.y = Math.PI / 2; ribL.rotation.x = 0.3;
        const ribR = new THREE.Mesh(ribGeo, ribMat);
        ribR.position.set(0.02, 0.35, 0.05 + rb * 0.08); ribR.rotation.y = -Math.PI / 2; ribR.rotation.x = 0.3;
        g.add(ribL, ribR);
      }
      // Brow ridges over eyes
      const browRidgeMat = new THREE.MeshStandardMaterial({ color: typeColor, roughness: 0.7 });
      const browRidgeGeo = new THREE.BoxGeometry(0.06, 0.015, 0.03);
      const browRL = new THREE.Mesh(browRidgeGeo, browRidgeMat); browRL.position.set(-0.1, 0.56, 0.6);
      const browRR = new THREE.Mesh(browRidgeGeo, browRidgeMat); browRR.position.set(0.1, 0.56, 0.6);
      g.add(browRL, browRR);
      // Tongue (hanging out)
      const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xcc4444, roughness: 0.6 }));
      tongue.position.set(0, 0.34, 0.78); tongue.rotation.x = 0.3;
      g.add(tongue);
      // Claws on paws
      const clawMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.3 });
      const clawGeo = new THREE.ConeGeometry(0.006, 0.025, 16);
      for (const [lx, lz, isFront2] of [[-0.14, 0.28, true], [0.14, 0.28, true], [-0.14, -0.32, false], [0.14, -0.32, false]] as const) {
        for (let c = -1; c <= 1; c++) {
          const claw = new THREE.Mesh(clawGeo, clawMat);
          claw.position.set(lx + c * 0.015, -0.01, lz + (isFront2 ? 0.04 : -0.04));
          claw.rotation.x = isFront2 ? 0.3 : -0.3;
          g.add(claw);
        }
      }
      // Battle scars (thin dark lines)
      const scarMat = new THREE.MeshStandardMaterial({ color: 0x331111, roughness: 0.9 });
      const scarGeo = new THREE.BoxGeometry(0.003, 0.1, 0.003);
      const scar1 = new THREE.Mesh(scarGeo, scarMat); scar1.position.set(0.12, 0.38, 0.1); scar1.rotation.z = 0.4;
      const scar2 = new THREE.Mesh(scarGeo, scarMat); scar2.position.set(-0.08, 0.4, -0.1); scar2.rotation.z = -0.3;
      g.add(scar1, scar2);
      // Chain leash (broken, dangling)
      const chainMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.85, roughness: 0.15 });
      for (let ch = 0; ch < 4; ch++) {
        const chainLink = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.004, 12, 20), chainMat);
        chainLink.position.set(0.15 + ch * 0.02, 0.38 - ch * 0.04, 0.38);
        chainLink.rotation.y = ch % 2 === 0 ? 0 : Math.PI / 2;
        g.add(chainLink);
      }
      // Tail (segmented, 3 sections)
      const tailSeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.18, 36), houndMat);
      tailSeg1.position.set(0, 0.42, -0.48); tailSeg1.rotation.x = -0.4; g.add(tailSeg1);
      const tailJoint = new THREE.Mesh(new THREE.SphereGeometry(0.018, 24, 20), houndMat);
      tailJoint.position.set(0, 0.46, -0.56); g.add(tailJoint);
      const tailSeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.14, 36), houndMat);
      tailSeg2.position.set(0, 0.5, -0.62); tailSeg2.rotation.x = -0.7; g.add(tailSeg2);
      const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.04, 20), houndMat);
      tailTip.position.set(0, 0.55, -0.7); tailTip.rotation.x = -1.0; g.add(tailTip);
    } else {
      const bodyH = guard.guardType === GuardType.HEAVY ? 1.7 : 1.5;
      const bodyR = guard.guardType === GuardType.HEAVY ? 0.45 : 0.35;
      const armorMat = new THREE.MeshStandardMaterial({ color: typeColor, roughness: 0.45, metalness: 0.25 });

      // Boots (armored military boots)
      const bootMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7, metalness: 0.15 });
      const bootGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.2, 48);
      const bootL = new THREE.Mesh(bootGeo, bootMat); bootL.position.set(-0.12, 0.1, 0); g.add(bootL);
      const bootR = new THREE.Mesh(bootGeo, bootMat); bootR.position.set(0.12, 0.1, 0); g.add(bootR);
      // Boot toe caps (steel reinforcement)
      const gToeMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.35 });
      const gToeGeo = new THREE.SphereGeometry(0.09, 36, 28, 0, Math.PI * 2, 0, Math.PI * 0.45);
      const gToeL = new THREE.Mesh(gToeGeo, gToeMat); gToeL.position.set(-0.12, 0.02, 0.06); gToeL.rotation.x = -Math.PI / 2; g.add(gToeL);
      const gToeR = new THREE.Mesh(gToeGeo, gToeMat); gToeR.position.set(0.12, 0.02, 0.06); gToeR.rotation.x = -Math.PI / 2; g.add(gToeR);
      // Boot cuffs
      const gCuffGeo = new THREE.TorusGeometry(0.11, 0.012, 16, 40);
      const gCuffMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4 });
      const gCuffL = new THREE.Mesh(gCuffGeo, gCuffMat); gCuffL.position.set(-0.12, 0.2, 0); gCuffL.rotation.x = Math.PI / 2; g.add(gCuffL);
      const gCuffR = new THREE.Mesh(gCuffGeo, gCuffMat); gCuffR.position.set(0.12, 0.2, 0); gCuffR.rotation.x = Math.PI / 2; g.add(gCuffR);
      // Boot soles
      const soleGeo = new THREE.BoxGeometry(0.22, 0.03, 0.28);
      const soleL = new THREE.Mesh(soleGeo, bootMat); soleL.position.set(-0.12, 0.01, 0); g.add(soleL);
      const soleR = new THREE.Mesh(soleGeo, bootMat); soleR.position.set(0.12, 0.01, 0); g.add(soleR);
      // Boot buckle straps
      const gStrapMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.7, metalness: 0.15 });
      const gStrapGeo = new THREE.BoxGeometry(0.14, 0.012, 0.012);
      const gsL = new THREE.Mesh(gStrapGeo, gStrapMat); gsL.position.set(-0.12, 0.12, 0.08); g.add(gsL);
      const gsR = new THREE.Mesh(gStrapGeo, gStrapMat); gsR.position.set(0.12, 0.12, 0.08); g.add(gsR);
      // Strap buckles
      const gBuckleMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7 });
      const gBuckleGeo = new THREE.BoxGeometry(0.02, 0.02, 0.012);
      const gbL = new THREE.Mesh(gBuckleGeo, gBuckleMat); gbL.position.set(-0.06, 0.12, 0.085); g.add(gbL);
      const gbR = new THREE.Mesh(gBuckleGeo, gBuckleMat); gbR.position.set(0.18, 0.12, 0.085); g.add(gbR);

      // Legs (segmented: greaves + thighs)
      const greaveMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.3 });
      const greaveGeo = new THREE.CylinderGeometry(0.085, 0.1, 0.25, 48);
      const grL = new THREE.Mesh(greaveGeo, greaveMat); grL.position.set(-0.12, 0.3, 0); g.add(grL);
      const grR = new THREE.Mesh(greaveGeo, greaveMat); grR.position.set(0.12, 0.3, 0); g.add(grR);
      // Knee guards
      const kneeGeo = new THREE.SphereGeometry(0.07, 40, 32, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const kneeMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.6, roughness: 0.3 });
      const knL = new THREE.Mesh(kneeGeo, kneeMat); knL.position.set(-0.12, 0.42, 0.05); g.add(knL);
      const knR = new THREE.Mesh(kneeGeo, kneeMat); knR.position.set(0.12, 0.42, 0.05); g.add(knR);
      const thighGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.2, 48);
      const thL = new THREE.Mesh(thighGeo, greaveMat); thL.position.set(-0.12, 0.52, 0); g.add(thL);
      const thR = new THREE.Mesh(thighGeo, greaveMat); thR.position.set(0.12, 0.52, 0); g.add(thR);

      // Body (torso - segmented into chest and waist)
      const waistGeo = new THREE.CylinderGeometry(bodyR - 0.03, bodyR, bodyH * 0.4, 56);
      const waist = new THREE.Mesh(waistGeo, armorMat);
      waist.position.y = bodyH * 0.3 + 0.3; waist.castShadow = true; g.add(waist);
      const chestGeo = new THREE.CylinderGeometry(bodyR - 0.08, bodyR - 0.03, bodyH * 0.45, 56);
      const chestMesh = new THREE.Mesh(chestGeo, armorMat);
      chestMesh.position.y = bodyH * 0.65 + 0.1; chestMesh.castShadow = true; g.add(chestMesh);
      // Chest plate rivets
      const rivetMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });
      const rivetGeo = new THREE.SphereGeometry(0.012, 16, 12);
      for (let rv = 0; rv < 6; rv++) {
        const rvAngle = ((rv - 2.5) / 5) * 1.2;
        const rivet = new THREE.Mesh(rivetGeo, rivetMat);
        rivet.position.set(Math.sin(rvAngle) * (bodyR - 0.04), bodyH * 0.65 + 0.1 + (rv % 2 === 0 ? 0.08 : -0.08), Math.cos(rvAngle) * (bodyR - 0.04));
        g.add(rivet);
      }
      // Tabard / surcoat (cloth over armor)
      const tabardMat = new THREE.MeshStandardMaterial({ color: typeColor, roughness: 0.85, side: THREE.DoubleSide });
      const tabardFront = new THREE.Mesh(new THREE.PlaneGeometry(bodyR * 1.2, 0.6), tabardMat);
      tabardFront.position.set(0, bodyH * 0.35, bodyR + 0.01); g.add(tabardFront);
      const tabardBack = new THREE.Mesh(new THREE.PlaneGeometry(bodyR * 1.2, 0.6), tabardMat);
      tabardBack.position.set(0, bodyH * 0.35, -(bodyR + 0.01)); g.add(tabardBack);
      // Tabard trim
      const tabTrimMat = new THREE.MeshStandardMaterial({ color: 0xccaa00, metalness: 0.5 });
      const tabTrimGeo = new THREE.BoxGeometry(bodyR * 1.2, 0.015, 0.005);
      const ttFront = new THREE.Mesh(tabTrimGeo, tabTrimMat); ttFront.position.set(0, bodyH * 0.35 - 0.3, bodyR + 0.015); g.add(ttFront);
      // Chainmail skirt (below waist)
      const chainmailMat = new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.65, roughness: 0.35 });
      const chainmailGeo = new THREE.CylinderGeometry(bodyR + 0.02, bodyR + 0.05, 0.15, 56, 1, true);
      const chainmail = new THREE.Mesh(chainmailGeo, chainmailMat);
      chainmail.position.y = bodyH * 0.25 + 0.15; g.add(chainmail);

      // Belt
      const beltGeo = new THREE.TorusGeometry(bodyR - 0.01, 0.02, 20, 56);
      const beltMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.6, metalness: 0.2 });
      const beltMesh = new THREE.Mesh(beltGeo, beltMat);
      beltMesh.position.y = bodyH * 0.35 + 0.15; beltMesh.rotation.x = Math.PI / 2; g.add(beltMesh);
      // Belt buckle
      const buckleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xccaa00, metalness: 0.8, roughness: 0.2 }));
      buckleMesh.position.set(0, bodyH * 0.35 + 0.15, bodyR); g.add(buckleMesh);
      // Belt dagger (small weapon on hip)
      const daggerBlade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.15, 0.008),
        new THREE.MeshStandardMaterial({ color: 0xaaaabb, metalness: 0.85, roughness: 0.1 }));
      daggerBlade.position.set(bodyR * 0.7, bodyH * 0.3, bodyR * 0.5); daggerBlade.rotation.z = 0.1; g.add(daggerBlade);
      const daggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.01),
        new THREE.MeshStandardMaterial({ color: 0x886622, metalness: 0.6 }));
      daggerGuard.position.set(bodyR * 0.7, bodyH * 0.35 + 0.04, bodyR * 0.5); g.add(daggerGuard);
      const daggerGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 16),
        new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 }));
      daggerGrip.position.set(bodyR * 0.7, bodyH * 0.35 + 0.08, bodyR * 0.5); g.add(daggerGrip);

      // Pauldrons (shoulder armor)
      const pauldronGeo = new THREE.SphereGeometry(0.15, 48, 40, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const pauldronMat = new THREE.MeshStandardMaterial({ color: typeColor, metalness: 0.5, roughness: 0.35 });
      const pauL = new THREE.Mesh(pauldronGeo, pauldronMat); pauL.position.set(-bodyR - 0.05, bodyH * 0.7 + 0.15, 0); g.add(pauL);
      const pauR = new THREE.Mesh(pauldronGeo, pauldronMat); pauR.position.set(bodyR + 0.05, bodyH * 0.7 + 0.15, 0); g.add(pauR);
      // Pauldron trim rings
      const pTrimGeo = new THREE.TorusGeometry(0.13, 0.01, 16, 40);
      const pTrimMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.7 });
      const ptL = new THREE.Mesh(pTrimGeo, pTrimMat); ptL.position.set(-bodyR - 0.05, bodyH * 0.7 + 0.1, 0); g.add(ptL);
      const ptR = new THREE.Mesh(pTrimGeo, pTrimMat); ptR.position.set(bodyR + 0.05, bodyH * 0.7 + 0.1, 0); g.add(ptR);

      // Arms (upper + forearms with gauntlets)
      const armMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.3 });
      const upperArmGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.35, 48);
      const uaL = new THREE.Mesh(upperArmGeo, armMat); uaL.position.set(-bodyR - 0.05, bodyH * 0.45 + 0.1, 0); g.add(uaL);
      const uaR = new THREE.Mesh(upperArmGeo, armMat); uaR.position.set(bodyR + 0.05, bodyH * 0.45 + 0.1, 0); g.add(uaR);
      // Elbow joints
      const elbGeo = new THREE.SphereGeometry(0.055, 36, 28);
      const elbL = new THREE.Mesh(elbGeo, armMat); elbL.position.set(-bodyR - 0.05, bodyH * 0.35, 0); g.add(elbL);
      const elbR = new THREE.Mesh(elbGeo, armMat); elbR.position.set(bodyR + 0.05, bodyH * 0.35, 0); g.add(elbR);
      // Forearms / gauntlets
      const gauntletGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.3, 48);
      const gauntletMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.4, metalness: 0.45 });
      const gaL = new THREE.Mesh(gauntletGeo, gauntletMat); gaL.position.set(-bodyR - 0.05, bodyH * 0.2, 0); g.add(gaL);
      const gaR = new THREE.Mesh(gauntletGeo, gauntletMat); gaR.position.set(bodyR + 0.05, bodyH * 0.2, 0); g.add(gaR);
      // Gauntlet flares
      const gFlareGeo = new THREE.TorusGeometry(0.07, 0.012, 16, 40);
      const gfL = new THREE.Mesh(gFlareGeo, gauntletMat); gfL.position.set(-bodyR - 0.05, bodyH * 0.28, 0); gfL.rotation.x = Math.PI / 2; g.add(gfL);
      const gfR = new THREE.Mesh(gFlareGeo, gauntletMat); gfR.position.set(bodyR + 0.05, bodyH * 0.28, 0); gfR.rotation.x = Math.PI / 2; g.add(gfR);
      // Fists (armored)
      const fistGeo = new THREE.SphereGeometry(0.05, 36, 28);
      const fistMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.5, roughness: 0.35 });
      const fiL = new THREE.Mesh(fistGeo, fistMat); fiL.position.set(-bodyR - 0.05, bodyH * 0.08, 0); g.add(fiL);
      const fiR = new THREE.Mesh(fistGeo, fistMat); fiR.position.set(bodyR + 0.05, bodyH * 0.08, 0); g.add(fiR);

      // Gorget (neck armor)
      const gorgetGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.12, 48);
      const gorgetMat = new THREE.MeshStandardMaterial({ color: 0x777788, metalness: 0.6, roughness: 0.3 });
      const gorget = new THREE.Mesh(gorgetGeo, gorgetMat);
      gorget.position.y = bodyH + 0.02; g.add(gorget);

      // Helmet (more detailed)
      const helmSize = guard.isBoss ? 0.35 : (guard.guardType === GuardType.HEAVY ? 0.32 : 0.28);
      const helmColor = guard.guardType === GuardType.MAGE ? 0x4444aa : 0x888899;
      const helm = new THREE.Mesh(new THREE.SphereGeometry(helmSize, 56, 48),
        new THREE.MeshStandardMaterial({ color: helmColor, metalness: 0.75, roughness: 0.25 }));
      helm.position.y = bodyH + 0.15; helm.castShadow = true; g.add(helm);
      // Helmet ridge / crest
      const ridgeGeo = new THREE.BoxGeometry(0.025, helmSize * 0.6, helmSize * 1.8);
      const ridgeMat = new THREE.MeshStandardMaterial({ color: helmColor, metalness: 0.8, roughness: 0.2 });
      const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
      ridge.position.y = bodyH + 0.15 + helmSize * 0.3; g.add(ridge);
      // Visor slit (dark line on helmet)
      const visor = new THREE.Mesh(new THREE.BoxGeometry(helmSize * 1.2, 0.03, 0.01),
        new THREE.MeshBasicMaterial({ color: 0x111111 }));
      visor.position.set(0, bodyH + 0.13, helmSize - 0.02); g.add(visor);
      // Visor glow (faint eye glow behind slit)
      const visorGlow = new THREE.Mesh(new THREE.BoxGeometry(helmSize * 0.6, 0.02, 0.005),
        new THREE.MeshBasicMaterial({ color: guard.guardType === GuardType.MAGE ? 0x4444ff : 0xffaa44, transparent: true, opacity: 0.5 }));
      visorGlow.position.set(0, bodyH + 0.13, helmSize - 0.01); g.add(visorGlow);
      // Cheek guards
      const cheekGeo = new THREE.BoxGeometry(0.04, helmSize * 0.5, 0.03);
      const cheekMat = new THREE.MeshStandardMaterial({ color: helmColor, metalness: 0.7, roughness: 0.3 });
      const chkL = new THREE.Mesh(cheekGeo, cheekMat); chkL.position.set(-helmSize * 0.7, bodyH + 0.05, helmSize * 0.4); g.add(chkL);
      const chkR = new THREE.Mesh(cheekGeo, cheekMat); chkR.position.set(helmSize * 0.7, bodyH + 0.05, helmSize * 0.4); g.add(chkR);
      // Aventail (chainmail curtain from helmet)
      const aventailMat = new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide });
      const aventailGeo = new THREE.CylinderGeometry(helmSize * 0.9, helmSize * 1.1, helmSize * 0.5, 48, 1, true, Math.PI * 0.3, Math.PI * 1.4);
      const aventail = new THREE.Mesh(aventailGeo, aventailMat);
      aventail.position.y = bodyH - 0.02; g.add(aventail);
      // Nose guard (vertical bar on helmet)
      if (guard.guardType !== GuardType.MAGE) {
        const noseGuard = new THREE.Mesh(new THREE.BoxGeometry(0.015, helmSize * 0.7, 0.01),
          new THREE.MeshStandardMaterial({ color: helmColor, metalness: 0.8, roughness: 0.2 }));
        noseGuard.position.set(0, bodyH + 0.13, helmSize + 0.005); g.add(noseGuard);
      }
      // Heavy guard helmet plume
      if (guard.guardType === GuardType.HEAVY) {
        const plumeMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.9 });
        const plumeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.15, 32), plumeMat);
        plumeBase.position.set(0, bodyH + 0.15 + helmSize + 0.05, 0); g.add(plumeBase);
        const plumeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.3, 36), plumeMat);
        plumeBody.position.set(0, bodyH + 0.15 + helmSize - 0.05, -helmSize * 0.5);
        plumeBody.rotation.x = 0.8; g.add(plumeBody);
        const plumeTip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 28), plumeMat);
        plumeTip.position.set(0, bodyH + 0.05, -helmSize * 0.9); plumeTip.rotation.x = 1.2; g.add(plumeTip);
      }

      if (guard.guardType !== GuardType.MAGE) {
        // Shield (more detailed with rim and boss)
        const shieldW = guard.guardType === GuardType.HEAVY ? 0.6 : 0.5;
        const shield = new THREE.Mesh(
          new THREE.BoxGeometry(shieldW, 0.7, 0.06),
          new THREE.MeshStandardMaterial({ color: 0x994411, metalness: 0.35, roughness: 0.5 }));
        shield.position.set(-0.4, 0.9, 0.2); g.add(shield);
        // Shield rim
        const rimGeo = new THREE.TorusGeometry(Math.max(shieldW, 0.7) * 0.5, 0.015, 16, 56);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.position.set(-0.4, 0.9, 0.24); g.add(rim);
        // Shield boss (central dome)
        const boss = new THREE.Mesh(new THREE.SphereGeometry(0.08, 40, 32, 0, Math.PI * 2, 0, Math.PI * 0.5),
          new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.15 }));
        boss.position.set(-0.4, 0.9, 0.24); g.add(boss);
        // Shield emblem
        const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.1, 48),
          new THREE.MeshStandardMaterial({ color: 0xcc8800, metalness: 0.6 }));
        emblem.position.set(-0.4, 0.9, 0.26); g.add(emblem);
        // Sword (detailed: blade + guard + grip + pommel)
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, 0.015),
          new THREE.MeshStandardMaterial({ color: 0xbbbbcc, metalness: 0.85, roughness: 0.1 }));
        blade.position.set(0.35, 0.9, 0); g.add(blade);
        // Blade edge highlight
        const edgeGeo = new THREE.BoxGeometry(0.005, 0.65, 0.018);
        const edgeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, metalness: 0.9, roughness: 0.05 });
        const edgeL = new THREE.Mesh(edgeGeo, edgeMat); edgeL.position.set(0.33, 0.9, 0); g.add(edgeL);
        const edgeR = new THREE.Mesh(edgeGeo, edgeMat); edgeR.position.set(0.37, 0.9, 0); g.add(edgeR);
        // Sword tip
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 32),
          new THREE.MeshStandardMaterial({ color: 0xbbbbcc, metalness: 0.85, roughness: 0.1 }));
        tip.position.set(0.35, 1.27, 0); g.add(tip);
        // Cross guard
        const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.025, 0.025),
          new THREE.MeshStandardMaterial({ color: 0x886622, metalness: 0.6, roughness: 0.3 }));
        crossguard.position.set(0.35, 0.55, 0); g.add(crossguard);
        // Grip (wrapped)
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 32),
          new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 }));
        grip.position.set(0.35, 0.48, 0); g.add(grip);
        // Pommel
        const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.025, 32, 24),
          new THREE.MeshStandardMaterial({ color: 0x886622, metalness: 0.7, roughness: 0.3 }));
        pommel.position.set(0.35, 0.42, 0); g.add(pommel);
        // Grip leather wrapping
        const wrapMat = new THREE.MeshStandardMaterial({ color: 0x442211, roughness: 0.9 });
        for (let gw = 0; gw < 3; gw++) {
          const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 8, 20), wrapMat);
          wrap.position.set(0.35, 0.45 + gw * 0.03, 0); wrap.rotation.x = Math.PI / 2;
          g.add(wrap);
        }
        // Scabbard (on back/hip)
        const scabbardMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.6, metalness: 0.1 });
        const scabbardBody = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.03), scabbardMat);
        scabbardBody.position.set(-0.25, 0.7, -0.25); scabbardBody.rotation.z = -0.15; g.add(scabbardBody);
        const scabbardTip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 24),
          new THREE.MeshStandardMaterial({ color: 0x886622, metalness: 0.6 }));
        scabbardTip.position.set(-0.27, 0.34, -0.25); scabbardTip.rotation.x = Math.PI; g.add(scabbardTip);
        const scabbardMount = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x886622, metalness: 0.6 }));
        scabbardMount.position.set(-0.24, 1.0, -0.25); g.add(scabbardMount);
        // Shield straps (visible on back of shield)
        const strapMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 });
        const strap1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.01), strapMat);
        strap1.position.set(-0.4, 1.0, 0.17); g.add(strap1);
        const strap2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.01), strapMat);
        strap2.position.set(-0.4, 0.8, 0.17); g.add(strap2);
      }
      if (guard.guardType === GuardType.MAGE) {
        // Mage staff (ornate)
        const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.8, 48),
          new THREE.MeshStandardMaterial({ color: 0x332255 }));
        staff.position.set(0.35, 0.9, 0); g.add(staff);
        // Staff rune rings
        const runeRingMat = new THREE.MeshStandardMaterial({ color: 0x6644aa, emissive: 0x4422aa, emissiveIntensity: 0.8, metalness: 0.5 });
        for (let r = 0; r < 3; r++) {
          const rr = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 16, 40), runeRingMat);
          rr.position.set(0.35, 1.2 + r * 0.25, 0); rr.rotation.x = Math.PI / 2;
          g.add(rr);
        }
        // Orb (multi-layered glow)
        const orbOuter = new THREE.Mesh(new THREE.SphereGeometry(0.15, 52, 44),
          new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 1.5, transparent: true, opacity: 0.5 }));
        orbOuter.position.set(0.35, 1.9, 0); g.add(orbOuter);
        const orbInner = new THREE.Mesh(new THREE.SphereGeometry(0.1, 48, 40),
          new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 3.0 }));
        orbInner.position.set(0.35, 1.9, 0); g.add(orbInner);
        // Orb orbiting sparks
        const sparkMat = new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff6622, emissiveIntensity: 2.5 });
        for (let sp = 0; sp < 3; sp++) {
          const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.02, 2), sparkMat);
          const a = (sp / 3) * Math.PI * 2;
          spark.position.set(0.35 + Math.cos(a) * 0.12, 1.9 + Math.sin(a) * 0.06, Math.sin(a) * 0.12);
          g.add(spark);
        }
        // Mage hood (over helmet)
        const hoodGeo = new THREE.ConeGeometry(0.3, 0.35, 48, 2, true);
        const hoodMat = new THREE.MeshStandardMaterial({ color: 0x222266, roughness: 0.9, side: THREE.DoubleSide });
        const hoodMesh = new THREE.Mesh(hoodGeo, hoodMat);
        hoodMesh.position.y = bodyH + 0.35; g.add(hoodMesh);
        // Mage robe bottom (more segments)
        const robe = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.8, 56, 2, true),
          new THREE.MeshStandardMaterial({ color: 0x222266, roughness: 0.9, side: THREE.DoubleSide }));
        robe.position.y = 0.4; g.add(robe);
        // Robe trim
        const robeTrim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 12, 56),
          new THREE.MeshStandardMaterial({ color: 0x6644aa, emissive: 0x4422aa, emissiveIntensity: 0.4, metalness: 0.4 }));
        robeTrim.position.y = 0.02; robeTrim.rotation.x = Math.PI / 2; g.add(robeTrim);
        // Spell book on belt (with clasp and pages)
        const bookCover = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x442266, roughness: 0.7 }));
        bookCover.position.set(-0.3, bodyH * 0.35 + 0.1, 0.1); bookCover.rotation.z = 0.2; g.add(bookCover);
        const bookPages = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.12, 0.03),
          new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.9 }));
        bookPages.position.set(-0.3, bodyH * 0.35 + 0.1, 0.1); bookPages.rotation.z = 0.2; g.add(bookPages);
        const bookClasp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.01),
          new THREE.MeshStandardMaterial({ color: 0x886633, metalness: 0.7 }));
        bookClasp.position.set(-0.26, bodyH * 0.35 + 0.1, 0.12); g.add(bookClasp);
        // Scroll case on back
        const scrollCase = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 32),
          new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.6 }));
        scrollCase.position.set(0.1, bodyH * 0.5, -bodyR - 0.05); scrollCase.rotation.z = 0.3; g.add(scrollCase);
        const scrollCap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.015, 28),
          new THREE.MeshStandardMaterial({ color: 0x886633, metalness: 0.5 }));
        scrollCap1.position.set(0.05, bodyH * 0.5 + 0.14, -bodyR - 0.05); scrollCap1.rotation.z = 0.3; g.add(scrollCap1);
        const scrollCap2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.015, 28),
          new THREE.MeshStandardMaterial({ color: 0x886633, metalness: 0.5 }));
        scrollCap2.position.set(0.15, bodyH * 0.5 - 0.14, -bodyR - 0.05); scrollCap2.rotation.z = 0.3; g.add(scrollCap2);
        // Shoulder chains with arcane pendant
        const shoulderChainMat = new THREE.MeshStandardMaterial({ color: 0x6644aa, metalness: 0.7, roughness: 0.3 });
        const sChainGeo = new THREE.TorusGeometry(0.01, 0.003, 8, 16);
        for (let sc = 0; sc < 5; sc++) {
          const sChain = new THREE.Mesh(sChainGeo, shoulderChainMat);
          sChain.position.set(-0.15 + sc * 0.07, bodyH * 0.7 + 0.2 - Math.abs(sc - 2) * 0.02, bodyR * 0.6);
          g.add(sChain);
        }
        const arcanePendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.02, 2),
          new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 2.0 }));
        arcanePendant.position.set(0, bodyH * 0.7 + 0.15, bodyR * 0.6); g.add(arcanePendant);
        // Floating rune circle at feet
        const mageRuneGeo = new THREE.RingGeometry(0.4, 0.45, 64);
        const mageRuneMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
        const mageRune = new THREE.Mesh(mageRuneGeo, mageRuneMat);
        mageRune.rotation.x = -Math.PI / 2; mageRune.position.y = 0.04; g.add(mageRune);
        const mageRuneInner = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.28, 48),
          new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.06, side: THREE.DoubleSide }));
        mageRuneInner.rotation.x = -Math.PI / 2; mageRuneInner.position.y = 0.045; g.add(mageRuneInner);
        // Mage glowing eyes (visible through hood)
        const mageEyeMat = new THREE.MeshStandardMaterial({ color: 0x4444ff, emissive: 0x2222ff, emissiveIntensity: 4.0 });
        const mageEyeGeo = new THREE.SphereGeometry(0.02, 24, 20);
        const mEyeL = new THREE.Mesh(mageEyeGeo, mageEyeMat); mEyeL.position.set(-0.06, bodyH + 0.15, helmSize - 0.01);
        const mEyeR = new THREE.Mesh(mageEyeGeo, mageEyeMat); mEyeR.position.set(0.06, bodyH + 0.15, helmSize - 0.01);
        g.add(mEyeL, mEyeR);
      }
    }
    // Lantern (detailed with frame, glass panes, chain, candle)
    const lanternGroup = new THREE.Group();
    const lnMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 });
    // Lantern base
    const lnBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.06), lnMat);
    lnBase.position.y = -0.045; lanternGroup.add(lnBase);
    // Lantern corner posts (4 vertical bars)
    const lnPostGeo = new THREE.BoxGeometry(0.008, 0.1, 0.008);
    for (const [px, pz] of [[-0.025, -0.025], [0.025, -0.025], [-0.025, 0.025], [0.025, 0.025]]) {
      const lnPost = new THREE.Mesh(lnPostGeo, lnMat);
      lnPost.position.set(px, 0, pz); lanternGroup.add(lnPost);
    }
    // Glass panes (4 sides, warm glow)
    const glassMat2 = new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const glassGeo2 = new THREE.PlaneGeometry(0.04, 0.08);
    const glass1 = new THREE.Mesh(glassGeo2, glassMat2); glass1.position.set(0, 0, 0.028); lanternGroup.add(glass1);
    const glass2 = new THREE.Mesh(glassGeo2, glassMat2); glass2.position.set(0, 0, -0.028); lanternGroup.add(glass2);
    const glass3 = new THREE.Mesh(glassGeo2, glassMat2); glass3.position.set(0.028, 0, 0); glass3.rotation.y = Math.PI / 2; lanternGroup.add(glass3);
    const glass4 = new THREE.Mesh(glassGeo2, glassMat2); glass4.position.set(-0.028, 0, 0); glass4.rotation.y = Math.PI / 2; lanternGroup.add(glass4);
    // Lantern top (conical cap)
    const lnTop = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.04, 36), lnMat);
    lnTop.position.y = 0.07; lanternGroup.add(lnTop);
    // Lantern finial
    const lnFinial = new THREE.Mesh(new THREE.SphereGeometry(0.008, 16, 12), lnMat);
    lnFinial.position.y = 0.09; lanternGroup.add(lnFinial);
    // Tiny candle inside
    const candleMat2 = new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.8 });
    const lnCandle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.04, 16), candleMat2);
    lnCandle.position.y = -0.02; lanternGroup.add(lnCandle);
    const lnFlame = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.015, 16),
      new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 4 }));
    lnFlame.position.y = 0.01; lanternGroup.add(lnFlame);
    // Chain links (hanging from hand)
    const lnChainMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 });
    for (let lc = 0; lc < 3; lc++) {
      const lnChain = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 8, 16), lnChainMat);
      lnChain.position.y = 0.1 + lc * 0.02;
      lnChain.rotation.y = lc % 2 === 0 ? 0 : Math.PI / 2;
      lanternGroup.add(lnChain);
    }
    const lanternLight = new THREE.PointLight(0xffaa44, 0.5, 5);
    lanternGroup.add(lanternLight);
    lanternGroup.position.set(0.3, 1.0, 0.3);
    g.add(lanternGroup);
    // Vision cone
    const coneR = guard.guardType === GuardType.HOUND ? 2 : 3;
    const coneL = guard.guardType === GuardType.HOUND ? 5 : 8;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(coneR, coneL, 56, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.03, side: THREE.DoubleSide }));
    cone.rotation.x = Math.PI / 2;
    cone.position.set(0, guard.guardType === GuardType.HOUND ? 0.35 : 1, coneL / 2);
    g.add(cone);
    if (guard.isBoss) {
      // Crown (ornate with gems)
      const crownBase = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 32, 56),
        new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.6, metalness: 0.9 }));
      crownBase.position.y = 2.05; crownBase.rotation.x = Math.PI / 2; g.add(crownBase);
      // Crown points
      const pointMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
      for (let cp = 0; cp < 8; cp++) {
        const point = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 28), pointMat);
        const a = (cp / 8) * Math.PI * 2;
        point.position.set(Math.cos(a) * 0.3, 2.13, Math.sin(a) * 0.3);
        g.add(point);
      }
      // Crown gems
      const gemColors = [0xff0000, 0x0044ff, 0x00ff44, 0xff0000];
      for (let cg = 0; cg < 4; cg++) {
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 2),
          new THREE.MeshStandardMaterial({ color: gemColors[cg], emissive: gemColors[cg], emissiveIntensity: 1.5 }));
        const a = (cg / 4) * Math.PI * 2;
        gem.position.set(Math.cos(a) * 0.3, 2.07, Math.sin(a) * 0.3);
        g.add(gem);
      }
      // Boss cape (fuller, with trim)
      const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x990000, roughness: 0.85, side: THREE.DoubleSide }));
      cape.position.set(0, 1.0, -0.38); g.add(cape);
      // Cape fur collar (thicker)
      const furGeo = new THREE.TorusGeometry(0.3, 0.07, 28, 56, Math.PI);
      const furMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.95 });
      const fur = new THREE.Mesh(furGeo, furMat);
      fur.position.set(0, 1.65, -0.12); fur.rotation.y = Math.PI; g.add(fur);
      // Cape trim (gold border on sides and bottom)
      const capeTrimMat2 = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 });
      const capeTrimBot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.01), capeTrimMat2);
      capeTrimBot.position.set(0, 0.22, -0.38); g.add(capeTrimBot);
      const capeTrimL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.5, 0.01), capeTrimMat2);
      capeTrimL.position.set(-0.44, 0.98, -0.38); g.add(capeTrimL);
      const capeTrimR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.5, 0.01), capeTrimMat2);
      capeTrimR.position.set(0.44, 0.98, -0.38); g.add(capeTrimR);
      // Cape heraldic symbol (embroidered on back)
      const heraldGeo = new THREE.CircleGeometry(0.12, 48);
      const heraldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.5, roughness: 0.4 });
      const herald = new THREE.Mesh(heraldGeo, heraldMat);
      herald.position.set(0, 1.2, -0.375); herald.rotation.y = Math.PI; g.add(herald);
      const heraldInner = new THREE.Mesh(new THREE.CircleGeometry(0.06, 36),
        new THREE.MeshStandardMaterial({ color: 0x990000, roughness: 0.5 }));
      heraldInner.position.set(0, 1.2, -0.37); heraldInner.rotation.y = Math.PI; g.add(heraldInner);
      // Boss body dimensions (boss is always humanoid)
      const bBodyH = 1.7;
      const bBodyR = 0.45;
      // Ornate chest symbol (sigil)
      const sigilOuter = new THREE.Mesh(new THREE.CircleGeometry(0.08, 48),
        new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.15 }));
      sigilOuter.position.set(0, bBodyH * 0.65 + 0.1, bBodyR + 0.005); g.add(sigilOuter);
      const sigilStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 2),
        new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x880000, emissiveIntensity: 1.0 }));
      sigilStar.position.set(0, bBodyH * 0.65 + 0.1, bBodyR + 0.01); g.add(sigilStar);
      // Trophy skulls on belt (2 small skulls)
      const skullMat = new THREE.MeshStandardMaterial({ color: 0xddddbb, roughness: 0.7 });
      for (let sk = 0; sk < 2; sk++) {
        const skullGroup = new THREE.Group();
        const skullHead = new THREE.Mesh(new THREE.SphereGeometry(0.035, 32, 24), skullMat);
        skullGroup.add(skullHead);
        const skullJaw = new THREE.Mesh(new THREE.SphereGeometry(0.025, 28, 20, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.6), skullMat);
        skullJaw.position.y = -0.02; skullGroup.add(skullJaw);
        // Eye holes
        const holeGeo = new THREE.SphereGeometry(0.01, 16, 12);
        const holeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const hole1 = new THREE.Mesh(holeGeo, holeMat); hole1.position.set(-0.012, 0.005, 0.03);
        const hole2 = new THREE.Mesh(holeGeo, holeMat); hole2.position.set(0.012, 0.005, 0.03);
        skullGroup.add(hole1, hole2);
        const skAngle = sk === 0 ? -Math.PI * 0.4 : Math.PI * 0.4;
        skullGroup.position.set(Math.sin(skAngle) * (bBodyR + 0.03), bBodyH * 0.35 + 0.08, Math.cos(skAngle) * (bBodyR + 0.03));
        g.add(skullGroup);
      }
      // Boss aura light (stronger, menacing)
      const bossAura = new THREE.PointLight(0xff4400, 0.4, 6);
      bossAura.position.y = 1.5; g.add(bossAura);
      // Boss extra shoulder spikes
      const bossSpikeMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.8, roughness: 0.15 });
      const bsSpikeGeo = new THREE.ConeGeometry(0.025, 0.12, 28);
      const bsSpikeL = new THREE.Mesh(bsSpikeGeo, bossSpikeMat); bsSpikeL.position.set(-bBodyR - 0.12, bBodyH * 0.7 + 0.25, 0);
      bsSpikeL.rotation.z = 0.4;
      const bsSpikeR = new THREE.Mesh(bsSpikeGeo, bossSpikeMat); bsSpikeR.position.set(bBodyR + 0.12, bBodyH * 0.7 + 0.25, 0);
      bsSpikeR.rotation.z = -0.4;
      g.add(bsSpikeL, bsSpikeR);
    }
    // Blob shadow
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.4, 56),
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
    const artMat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 1.0, metalness: 0.45, roughness: 0.25 });
    switch (art.type) {
      case "chalice": {
        // Ornate chalice with stem and base
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.06, 0.2, 48), artMat);
        cup.position.y = 1.3; g.add(cup);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.01, 16, 48), artMat);
        rim.position.y = 1.4; rim.rotation.x = Math.PI / 2; g.add(rim);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.15, 32), artMat);
        stem.position.y = 1.12; g.add(stem);
        const knop = new THREE.Mesh(new THREE.SphereGeometry(0.035, 32, 24), artMat);
        knop.position.y = 1.1; g.add(knop);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.04, 40), artMat);
        base.position.y = 1.02; g.add(base);
        // Gems on cup
        const gemMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 2.0 });
        for (let cg = 0; cg < 4; cg++) {
          const a2 = (cg / 4) * Math.PI * 2;
          const gem2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.015, 2), gemMat);
          gem2.position.set(Math.cos(a2) * 0.11, 1.3, Math.sin(a2) * 0.11); g.add(gem2);
        }
        break;
      }
      case "scroll": {
        // Scroll with end caps and visible parchment
        const scrollBody = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 48), artMat);
        scrollBody.position.y = 1.2; g.add(scrollBody);
        const capMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, metalness: 0.7 });
        const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 40), capMat);
        cap1.position.y = 1.42; g.add(cap1);
        const cap2 = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 40), capMat);
        cap2.position.y = 0.98; g.add(cap2);
        // Finials
        const finMat = new THREE.MeshStandardMaterial({ color, metalness: 0.8, roughness: 0.15 });
        const fin1 = new THREE.Mesh(new THREE.SphereGeometry(0.025, 28, 24), finMat);
        fin1.position.y = 1.46; g.add(fin1);
        const fin2 = new THREE.Mesh(new THREE.SphereGeometry(0.025, 28, 24), finMat);
        fin2.position.y = 0.95; g.add(fin2);
        // Hanging parchment edge
        const parchment = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.12),
          new THREE.MeshStandardMaterial({ color: 0xeeddbb, roughness: 0.9, side: THREE.DoubleSide }));
        parchment.position.set(0.08, 1.15, 0); parchment.rotation.z = 0.2; g.add(parchment);
        // Seal
        const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.005, 28),
          new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.6 }));
        seal.position.set(0.08, 1.1, 0.01); g.add(seal);
        break;
      }
      case "crystal": {
        // Crystal cluster
        const mainGeo = new THREE.OctahedronGeometry(0.18, 5);
        const mesh = new THREE.Mesh(mainGeo, artMat);
        mesh.position.y = 1.25; mesh.castShadow = true; g.add(mesh);
        // Sub-crystals growing from base
        for (let sc = 0; sc < 5; sc++) {
          const a3 = (sc / 5) * Math.PI * 2;
          const subCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.06 + Math.random() * 0.04, 4),
            new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 }));
          subCrystal.position.set(Math.cos(a3) * 0.12, 1.1 + Math.random() * 0.1, Math.sin(a3) * 0.12);
          subCrystal.rotation.set(Math.random(), Math.random(), Math.random());
          g.add(subCrystal);
        }
        break;
      }
      case "tome": {
        // Detailed book with cover, pages, spine, clasps
        const cover = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 0.08), artMat);
        cover.position.y = 1.2; cover.castShadow = true; g.add(cover);
        const pages = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.32, 0.06),
          new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.9 }));
        pages.position.y = 1.2; g.add(pages);
        // Spine
        const spine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.35, 0.08),
          new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, metalness: 0.3 }));
        spine.position.set(-0.14, 1.2, 0); g.add(spine);
        // Corner clasps
        const claspMat = new THREE.MeshStandardMaterial({ color, metalness: 0.8, roughness: 0.15 });
        const corners: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (const [cx, cy] of corners) {
          const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), claspMat);
          clasp.position.set(cx * 0.13, 1.2 + cy * 0.16, 0.045); g.add(clasp);
        }
        // Center emblem
        const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 3),
          new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.5 }));
        emblem.position.set(0, 1.2, 0.045); g.add(emblem);
        break;
      }
      default: {
        // Ring artifact with gem setting
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 32, 56), artMat);
        ring2.position.y = 1.2; ring2.castShadow = true; g.add(ring2);
        const setting = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 3),
          new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3.0 }));
        setting.position.y = 1.37; g.add(setting);
        break;
      }
    }
    // Pedestal (ornate with base and top)
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.7 });
    const pedBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.08, 48), pedMat);
    pedBase.position.y = 0.04; g.add(pedBase);
    const pedColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.3, 48), pedMat);
    pedColumn.position.y = 0.23; g.add(pedColumn);
    const pedTop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.06, 48), pedMat);
    pedTop.position.y = 0.41; g.add(pedTop);
    // Pedestal trim rings
    const pedTrimMat = new THREE.MeshStandardMaterial({ color: 0x555560, metalness: 0.4 });
    const ptRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.01, 12, 48), pedTrimMat);
    ptRing1.position.y = 0.08; ptRing1.rotation.x = Math.PI / 2; g.add(ptRing1);
    const ptRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.01, 12, 48), pedTrimMat);
    ptRing2.position.y = 0.38; ptRing2.rotation.x = Math.PI / 2; g.add(ptRing2);
    // Glowing rings on floor (double ring)
    const glowRing1 = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.35, 72),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, side: THREE.DoubleSide }));
    glowRing1.rotation.x = -Math.PI / 2; glowRing1.position.y = 0.02; g.add(glowRing1);
    const glowRing2 = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.43, 64),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1, side: THREE.DoubleSide }));
    glowRing2.rotation.x = -Math.PI / 2; glowRing2.position.y = 0.02; g.add(glowRing2);
    // Floating sparkle motes around artifact
    const sparkMat2 = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 });
    for (let sm = 0; sm < 4; sm++) {
      const a4 = (sm / 4) * Math.PI * 2;
      const sparkle = new THREE.Mesh(new THREE.SphereGeometry(0.01, 12, 8), sparkMat2);
      sparkle.position.set(Math.cos(a4) * 0.2, 1.0 + sm * 0.15, Math.sin(a4) * 0.2);
      g.add(sparkle);
    }
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
      const keyMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, metalness: 0.8, roughness: 0.15 });
      // Key handle (ornate)
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 28, 48), keyMat);
      handle.position.y = 0.95; g.add(handle);
      // Handle cross detail
      const hCross1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.01), keyMat);
      hCross1.position.y = 0.95; g.add(hCross1);
      const hCross2 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.01), keyMat);
      hCross2.position.y = 0.95; g.add(hCross2);
      // Handle gem
      const keyGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.015, 2),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3.0 }));
      keyGem.position.y = 0.95; g.add(keyGem);
      // Shaft
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.2, 0.012), keyMat);
      shaft.position.y = 0.78; g.add(shaft);
      // Key teeth (bit)
      const teeth: [number, number][] = [[0, 0.7], [0.02, 0.7], [0, 0.72], [0.015, 0.74]];
      for (const [tx, ty] of teeth) {
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.012), keyMat);
        tooth.position.set(tx + 0.02, ty, 0); g.add(tooth);
      }
      // Key ward (tip)
      const ward = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.012), keyMat);
      ward.position.set(0.01, 0.685, 0); g.add(ward);
      // Floating glow ring
      const keyRing = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
      keyRing.position.y = 0.85; g.add(keyRing);
    } else {
      // Potion bottle (detailed with label and liquid)
      const glassMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, metalness: 0.2, roughness: 0.3, transparent: true, opacity: 0.8 });
      // Bottle body (rounded bottom)
      const bottleBody = new THREE.Mesh(new THREE.SphereGeometry(0.08, 40, 32, 0, Math.PI * 2, 0, Math.PI * 0.7), glassMat);
      bottleBody.position.y = 0.78; g.add(bottleBody);
      // Bottle neck
      const bottleNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.1, 36), glassMat);
      bottleNeck.position.y = 0.92; g.add(bottleNeck);
      // Bottle lip
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 12, 32),
        new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.3 }));
      lip.position.y = 0.97; lip.rotation.x = Math.PI / 2; g.add(lip);
      // Cork
      const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.04, 28),
        new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.8 }));
      cork.position.y = 0.99; g.add(cork);
      // Label
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xeeddbb, roughness: 0.9, side: THREE.DoubleSide }));
      label.position.set(0, 0.8, 0.075); g.add(label);
      // Liquid glow inside
      const liquid2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 }));
      liquid2.position.y = 0.76; g.add(liquid2);
      // Bottle base
      const bottleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.015, 32),
        new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.4 }));
      bottleBase.position.y = 0.715; g.add(bottleBase);
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
      // Outer rune circle
      const rune = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 64),
        new THREE.MeshBasicMaterial({ color: TRAP_WARD_COLOR, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
      rune.rotation.x = -Math.PI / 2; rune.position.y = 0.12; g.add(rune);
      // Middle rune ring
      const mid = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.32, 56),
        new THREE.MeshBasicMaterial({ color: TRAP_WARD_COLOR, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
      mid.rotation.x = -Math.PI / 2; mid.position.y = 0.125; g.add(mid);
      // Inner circle
      const inner = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.2, 48),
        new THREE.MeshBasicMaterial({ color: TRAP_WARD_COLOR, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
      inner.rotation.x = -Math.PI / 2; inner.position.y = 0.13; g.add(inner);
      // Center sigil (pentagram-like spokes)
      const spokeMat = new THREE.MeshBasicMaterial({ color: TRAP_WARD_COLOR, transparent: true, opacity: 0.4 });
      for (let sp = 0; sp < 6; sp++) {
        const a5 = (sp / 6) * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.001, 0.35), spokeMat);
        spoke.rotation.x = -Math.PI / 2; spoke.rotation.z = a5;
        spoke.position.y = 0.135; g.add(spoke);
      }
      // Rune symbols at cardinal points
      const symbolMat = new THREE.MeshBasicMaterial({ color: TRAP_WARD_COLOR, transparent: true, opacity: 0.6 });
      for (let sym = 0; sym < 4; sym++) {
        const a6 = (sym / 4) * Math.PI * 2;
        const symbol = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 1), symbolMat);
        symbol.position.set(Math.cos(a6) * 0.47, 0.14, Math.sin(a6) * 0.47);
        g.add(symbol);
      }
      // Tiny floating rune particles
      for (let rp = 0; rp < 6; rp++) {
        const a7 = (rp / 6) * Math.PI * 2;
        const particle = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8),
          new THREE.MeshBasicMaterial({ color: TRAP_WARD_COLOR, transparent: true, opacity: 0.5 }));
        particle.position.set(Math.cos(a7) * 0.35, 0.2 + rp * 0.03, Math.sin(a7) * 0.35);
        g.add(particle);
      }
      const light = new THREE.PointLight(TRAP_WARD_COLOR, 0.3, 3);
      light.position.y = 0.3; g.add(light);
    } else {
      // Pressure plate (detailed)
      const plateMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.7, metalness: 0.2 });
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.035, 0.55), plateMat);
      plate.position.y = 0.12; g.add(plate);
      // Plate border
      const borderMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.6, metalness: 0.3 });
      const bTop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.04), borderMat);
      bTop.position.set(0, 0.12, 0.28); g.add(bTop);
      const bBot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.04), borderMat);
      bBot.position.set(0, 0.12, -0.28); g.add(bBot);
      const bLft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.6), borderMat);
      bLft.position.set(-0.28, 0.12, 0); g.add(bLft);
      const bRgt = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.6), borderMat);
      bRgt.position.set(0.28, 0.12, 0); g.add(bRgt);
      // Corner rivets
      const cRivetMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 });
      const cRivetGeo = new THREE.SphereGeometry(0.015, 16, 12);
      for (const [rx, rz] of [[-0.25, -0.25], [-0.25, 0.25], [0.25, -0.25], [0.25, 0.25]]) {
        const rv2 = new THREE.Mesh(cRivetGeo, cRivetMat);
        rv2.position.set(rx, 0.14, rz); g.add(rv2);
      }
      // Center mechanism hint
      const mechGeo = new THREE.RingGeometry(0.06, 0.08, 32);
      const mech = new THREE.Mesh(mechGeo, new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }));
      mech.rotation.x = -Math.PI / 2; mech.position.y = 0.14; g.add(mech);
      // Gap lines (showing plate is separate from floor)
      const gapMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.5 });
      const gapGeo = new THREE.BoxGeometry(0.6, 0.005, 0.005);
      const gap1 = new THREE.Mesh(gapGeo, gapMat); gap1.position.set(0, 0.1, 0.285); g.add(gap1);
      const gap2 = new THREE.Mesh(gapGeo, gapMat); gap2.position.set(0, 0.1, -0.285); g.add(gap2);
      const gapGeo2 = new THREE.BoxGeometry(0.005, 0.005, 0.6);
      const gap3 = new THREE.Mesh(gapGeo2, gapMat); gap3.position.set(0.285, 0.1, 0); g.add(gap3);
      const gap4 = new THREE.Mesh(gapGeo2, gapMat); gap4.position.set(-0.285, 0.1, 0); g.add(gap4);
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
    this._playerLight.intensity = p.cloaked ? 0.15 : 1.0;

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
        if (loot.type === "gold") {
          // Gold coin stack
          const coinMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.0, metalness: 0.8, roughness: 0.15 });
          for (let ci = 0; ci < 4; ci++) {
            const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 40), coinMat);
            coin.position.set((Math.random() - 0.5) * 0.04, 0.35 + ci * 0.016, (Math.random() - 0.5) * 0.04);
            coin.rotation.x = (Math.random() - 0.5) * 0.15;
            g.add(coin);
          }
          // Coin face stamp
          const stampMat = new THREE.MeshStandardMaterial({ color: 0xeebb00, metalness: 0.9, roughness: 0.1 });
          const stamp = new THREE.Mesh(new THREE.CircleGeometry(0.03, 32), stampMat);
          stamp.position.set(0, 0.35 + 4 * 0.016, 0); stamp.rotation.x = -Math.PI / 2;
          g.add(stamp);
          // Scattered single coins
          for (let sc = 0; sc < 3; sc++) {
            const sCoin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 36), coinMat);
            sCoin.position.set((Math.random() - 0.5) * 0.2, 0.33, (Math.random() - 0.5) * 0.2);
            sCoin.rotation.x = Math.PI / 2 * Math.random(); sCoin.rotation.z = Math.random();
            g.add(sCoin);
          }
          // Gem (bonus)
          const gemLoot = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 3),
            new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xcc2222, emissiveIntensity: 1.5 }));
          gemLoot.position.set(0.08, 0.38, 0.05); g.add(gemLoot);
        } else if (loot.type === "health") {
          // Health potion vial
          const potionMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, metalness: 0.2, roughness: 0.3, transparent: true, opacity: 0.8 });
          const potionBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.18, 40), potionMat);
          potionBody.position.y = 0.38; g.add(potionBody);
          const potionNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.06, 32), potionMat);
          potionNeck.position.y = 0.5; g.add(potionNeck);
          const potionCork = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.03, 24),
            new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.8 }));
          potionCork.position.y = 0.55; g.add(potionCork);
          // Heart symbol on bottle
          const heartMat = new THREE.MeshStandardMaterial({ color: 0xff6666, emissive: 0xff3333, emissiveIntensity: 1.5 });
          const heartL = new THREE.Mesh(new THREE.SphereGeometry(0.015, 20, 16), heartMat);
          heartL.position.set(-0.01, 0.4, 0.065); g.add(heartL);
          const heartR = new THREE.Mesh(new THREE.SphereGeometry(0.015, 20, 16), heartMat);
          heartR.position.set(0.01, 0.4, 0.065); g.add(heartR);
          // Liquid glow inside
          const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.12, 36),
            new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.3 }));
          liquid.position.y = 0.36; g.add(liquid);
        } else {
          // Mana crystal cluster
          const manaMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5, metalness: 0.3, roughness: 0.2 });
          const mainCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 4), manaMat);
          mainCrystal.position.y = 0.42; g.add(mainCrystal);
          // Side crystals
          for (let mc = 0; mc < 4; mc++) {
            const a = (mc / 4) * Math.PI * 2 + 0.3;
            const sideCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 3),
              new THREE.MeshStandardMaterial({ color: 0x6688ff, emissive: 0x4466ff, emissiveIntensity: 1.0 }));
            sideCrystal.position.set(Math.cos(a) * 0.08, 0.37 + (mc % 2) * 0.04, Math.sin(a) * 0.08);
            sideCrystal.rotation.y = a;
            g.add(sideCrystal);
          }
          // Crystal glow ring
          const manaRing = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.12, 48),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, side: THREE.DoubleSide }));
          manaRing.position.y = 0.42; g.add(manaRing);
        }
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
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x443333, roughness: 0.9 });
      const armorMat2 = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.5, metalness: 0.3 });
      // Torso (on side)
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.7, 48), bodyMat);
      torso.position.set(0, 0.15, 0); torso.rotation.z = Math.PI / 2; torso.rotation.y = 0.3;
      g.add(torso);
      // Legs (sprawled)
      const legGeo2 = new THREE.CylinderGeometry(0.07, 0.09, 0.5, 36);
      const legA = new THREE.Mesh(legGeo2, bodyMat); legA.position.set(-0.4, 0.08, 0.15); legA.rotation.z = Math.PI / 2.5; g.add(legA);
      const legB = new THREE.Mesh(legGeo2, bodyMat); legB.position.set(-0.35, 0.08, -0.2); legB.rotation.z = Math.PI / 3; legB.rotation.y = 0.4; g.add(legB);
      // Boots
      const bootGeo2 = new THREE.CylinderGeometry(0.08, 0.1, 0.12, 32);
      const bootA = new THREE.Mesh(bootGeo2, new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 }));
      bootA.position.set(-0.6, 0.06, 0.2); g.add(bootA);
      const bootB = new THREE.Mesh(bootGeo2, new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 }));
      bootB.position.set(-0.55, 0.06, -0.3); g.add(bootB);
      // Arms (outstretched)
      const armGeo2 = new THREE.CylinderGeometry(0.05, 0.06, 0.4, 32);
      const armA = new THREE.Mesh(armGeo2, armorMat2); armA.position.set(0.15, 0.1, 0.35); armA.rotation.x = Math.PI / 2; g.add(armA);
      const armB = new THREE.Mesh(armGeo2, armorMat2); armB.position.set(0.3, 0.12, -0.1); armB.rotation.z = 0.8; g.add(armB);
      // Gauntlets
      const gauntGeo = new THREE.SphereGeometry(0.045, 28, 24);
      const gauntA = new THREE.Mesh(gauntGeo, armorMat2); gauntA.position.set(0.15, 0.1, 0.55); g.add(gauntA);
      const gauntB = new THREE.Mesh(gauntGeo, armorMat2); gauntB.position.set(0.5, 0.1, -0.1); g.add(gauntB);
      // Pauldron (visible on side)
      const pau = new THREE.Mesh(new THREE.SphereGeometry(0.1, 36, 28, 0, Math.PI * 2, 0, Math.PI * 0.5),
        armorMat2);
      pau.position.set(0.1, 0.28, 0); g.add(pau);
      // Helmet fallen off (dented, rolled away)
      const helmDist = 0.3 + Math.random() * 0.3;
      const helmAngle = Math.random() * Math.PI * 2;
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.18, 44, 36),
        new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.5, roughness: 0.4 }));
      helm.position.set(Math.cos(helmAngle) * helmDist, 0.1, Math.sin(helmAngle) * helmDist);
      helm.rotation.x = 0.8; helm.rotation.z = Math.random();
      g.add(helm);
      // Helmet visor slit
      const hVisor = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.008),
        new THREE.MeshBasicMaterial({ color: 0x111111 }));
      hVisor.position.set(Math.cos(helmAngle) * helmDist, 0.12, Math.sin(helmAngle) * helmDist + 0.15);
      g.add(hVisor);
      // Helmet ridge
      const hRidge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.6 }));
      hRidge.position.set(Math.cos(helmAngle) * helmDist, 0.22, Math.sin(helmAngle) * helmDist);
      hRidge.rotation.x = 0.8; g.add(hRidge);
      // Dropped sword
      const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, 0.012),
        new THREE.MeshStandardMaterial({ color: 0x999aaa, metalness: 0.85, roughness: 0.1 }));
      const swAngle = Math.random() * Math.PI * 2;
      swordBlade.position.set(Math.cos(swAngle) * 0.5, 0.02, Math.sin(swAngle) * 0.5);
      swordBlade.rotation.x = Math.PI / 2; swordBlade.rotation.y = swAngle;
      g.add(swordBlade);
      const swordGuard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x886622, metalness: 0.6 }));
      swordGuard.position.set(Math.cos(swAngle) * 0.25, 0.025, Math.sin(swAngle) * 0.25);
      swordGuard.rotation.y = swAngle; g.add(swordGuard);
      // Dropped shield (face down)
      const droppedShield = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x884411, roughness: 0.6, metalness: 0.2 }));
      droppedShield.position.set(-0.15, 0.03, 0.45 + Math.random() * 0.2);
      droppedShield.rotation.y = Math.random() * 0.5; g.add(droppedShield);
      // Shield boss on dropped shield
      const shBoss = new THREE.Mesh(new THREE.SphereGeometry(0.06, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.5),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.7 }));
      shBoss.position.set(-0.15, 0.06, 0.5); shBoss.rotation.x = -Math.PI / 2; g.add(shBoss);
      // Dark pool (blood)
      const pool = new THREE.Mesh(new THREE.CircleGeometry(0.55, 56),
        new THREE.MeshBasicMaterial({ color: 0x110808, transparent: true, opacity: 0.4 }));
      pool.rotation.x = -Math.PI / 2; pool.position.y = 0.015; g.add(pool);
      // Smaller splatter pools
      for (let sp = 0; sp < 3; sp++) {
        const splat = new THREE.Mesh(new THREE.CircleGeometry(0.1 + Math.random() * 0.1, 32),
          new THREE.MeshBasicMaterial({ color: 0x110808, transparent: true, opacity: 0.3 }));
        splat.rotation.x = -Math.PI / 2;
        splat.position.set((Math.random() - 0.5) * 0.8, 0.016, (Math.random() - 0.5) * 0.8);
        g.add(splat);
      }
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
    // Camera: look slightly ahead of the player at chest height
    const camTargetX = p.pos.x + Math.sin(p.angle) * 1.5;
    const camTargetZ = p.pos.z + Math.cos(p.angle) * 1.5;
    this._camTarget.lerp(new THREE.Vector3(camTargetX, 1.2, camTargetZ), CAM_LERP * dt);
    // Camera positioned behind and above the player
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
