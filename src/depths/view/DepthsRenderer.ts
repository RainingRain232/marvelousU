// ---------------------------------------------------------------------------
// Depths of Avalon — Three.js 3D renderer
// Underwater world with caustics, god rays, bioluminescence, and volumetric fog
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { DEPTHS } from "../config/DepthsConfig";
import type { DepthsState, DepthsEnemy, DepthsWorldProp } from "../state/DepthsState";

// ---------------------------------------------------------------------------
// Caustic shader
// ---------------------------------------------------------------------------

const CAUSTIC_VERT = `
varying vec3 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const CAUSTIC_FRAG = `
uniform float time;
uniform vec3 waterColor;
uniform float fogDensity;
varying vec3 vWorldPos;

float caustic(vec2 p) {
  float t = time * ${DEPTHS.CAUSTIC_SPEED};
  vec2 uv = p * 0.08;
  float c = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 q = uv * (1.0 + fi * 0.4);
    q.x += sin(q.y * 3.0 + t + fi * 1.3) * 0.3;
    q.y += cos(q.x * 2.5 + t * 0.7 + fi * 0.9) * 0.3;
    c += 0.33 * smoothstep(0.4, 0.0, abs(sin(q.x * 6.0 + t) * sin(q.y * 5.0 + t * 0.6) - 0.1));
  }
  return c;
}

void main() {
  float c = caustic(vWorldPos.xz);
  vec3 base = waterColor;
  vec3 col = base + vec3(0.15, 0.25, 0.3) * c;
  float d = length(vWorldPos);
  float fog = 1.0 - exp(-fogDensity * d);
  col = mix(col, waterColor * 0.3, fog);
  gl_FragColor = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------------------
// God ray shader
// ---------------------------------------------------------------------------

const GODRAY_VERT = `
varying vec2 vUv;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const GODRAY_FRAG = `
uniform float time;
uniform float opacity;
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  float beam = smoothstep(0.3, 0.5, vUv.x) * smoothstep(0.3, 0.5, 1.0 - vUv.x);
  beam *= smoothstep(0.0, 0.3, vUv.y);
  float shimmer = sin(vWorldPos.y * 0.5 + time * 0.8) * 0.3 + 0.7;
  float fade = 1.0 - vUv.y;
  float alpha = beam * shimmer * fade * opacity;
  gl_FragColor = vec4(0.6, 0.85, 1.0, alpha * 0.15);
}`;

// ---------------------------------------------------------------------------
// Post-processing: underwater distortion + bloom + chromatic aberration
// ---------------------------------------------------------------------------

const POST_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const POST_FRAG = `
uniform sampler2D tScene;
uniform float time;
uniform float distortionStrength;
uniform float bloomStrength;
uniform float chromaticAberration;
uniform float vignetteIntensity;
uniform float depthDarkness;
uniform vec3 zoneTint;
uniform float oxygenDistress;
uniform float damageFlash;
varying vec2 vUv;

// Caustic pattern for screen-space projection
float causticScreen(vec2 p) {
  float t = time * 0.35;
  vec2 uv = p * 2.5;
  float c = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 q = uv * (1.0 + fi * 0.3);
    q.x += sin(q.y * 2.5 + t + fi * 1.1) * 0.4;
    q.y += cos(q.x * 2.0 + t * 0.8 + fi * 0.7) * 0.4;
    c += 0.33 * smoothstep(0.35, 0.0, abs(sin(q.x * 5.0 + t) * sin(q.y * 4.0 + t * 0.5) - 0.15));
  }
  return c;
}

void main() {
  // Underwater distortion — wavy UV offset
  vec2 uv = vUv;
  float wave1 = sin(uv.y * 15.0 + time * 1.2) * 0.003 * distortionStrength;
  float wave2 = cos(uv.x * 12.0 + time * 0.9) * 0.002 * distortionStrength;
  float wave3 = sin((uv.x + uv.y) * 8.0 + time * 0.7) * 0.001 * distortionStrength;
  uv.x += wave1 + wave3;
  uv.y += wave2 + wave3;

  // Oxygen distress — heavier distortion when suffocating
  if (oxygenDistress > 0.0) {
    float breathWave = sin(time * 3.0 + uv.y * 5.0) * oxygenDistress * 0.008;
    uv.x += breathWave;
    uv.y += breathWave * 0.5;
  }

  // Chromatic aberration (increases with damage flash)
  float caStr = chromaticAberration + damageFlash * 0.005;
  vec2 caOffset = (uv - 0.5) * caStr;
  float r = texture2D(tScene, uv + caOffset).r;
  float g = texture2D(tScene, uv).g;
  float b = texture2D(tScene, uv - caOffset).b;
  vec3 col = vec3(r, g, b);

  // Bloom — sample surrounding pixels for glow
  vec3 bloom = vec3(0.0);
  float bSize = 0.004;
  for (int i = -2; i <= 2; i++) {
    for (int j = -2; j <= 2; j++) {
      vec2 off = vec2(float(i), float(j)) * bSize;
      vec3 s = texture2D(tScene, uv + off).rgb;
      float lum = dot(s, vec3(0.2126, 0.7152, 0.0722));
      bloom += s * max(0.0, lum - 0.4);
    }
  }
  bloom /= 25.0;
  col += bloom * bloomStrength;

  // Screen-space caustic overlay — projects light patterns onto everything
  float caustic = causticScreen(vUv + vec2(time * 0.02, 0.0));
  float causticFade = max(0.0, 1.0 - depthDarkness * 1.5); // fades in deep zones
  col += vec3(0.08, 0.12, 0.15) * caustic * causticFade;

  // Depth darkness
  col *= (1.0 - depthDarkness * 0.35);

  // Per-zone color grading — tint toward zone's signature color
  col = mix(col, col * zoneTint, 0.3);

  // Damage flash — brief red/white overlay
  if (damageFlash > 0.0) {
    col = mix(col, vec3(1.0, 0.3, 0.2), damageFlash * 0.3);
  }

  // Oxygen distress — desaturation + red tint
  if (oxygenDistress > 0.0) {
    float gray = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(gray), oxygenDistress * 0.4);
    col.r += oxygenDistress * 0.08;
    // Pulsing vignette at heartbeat frequency
    float heartPulse = sin(time * 5.0) * 0.5 + 0.5;
    float oxyVig = smoothstep(0.3, 1.2, length(vUv - 0.5) * 2.0) * oxygenDistress * heartPulse;
    col = mix(col, vec3(0.4, 0.0, 0.0), oxyVig * 0.5);
  }

  // Vignette
  float dist = length(vUv - 0.5) * 2.0;
  float vig = smoothstep(0.4, 1.4, dist) * vignetteIntensity;
  col *= (1.0 - vig);

  // Underwater light scatter
  float scatter = smoothstep(0.3, 1.0, dist) * 0.05 * (1.0 - depthDarkness);
  col += vec3(0.1, 0.2, 0.3) * scatter;

  // Film grain (subtle noise for underwater atmosphere)
  float grain = fract(sin(dot(vUv * time, vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * 0.015;

  gl_FragColor = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------------------
// Renderer class
// ---------------------------------------------------------------------------

export class DepthsRenderer {
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _canvas!: HTMLCanvasElement;

  // Lighting
  private _ambientLight!: THREE.AmbientLight;
  private _playerLight!: THREE.PointLight;
  private _sunLight!: THREE.DirectionalLight;

  // Fog
  private _fog!: THREE.FogExp2;

  // Post-processing
  private _renderTarget!: THREE.WebGLRenderTarget;
  private _postScene!: THREE.Scene;
  private _postCamera!: THREE.Camera;
  private _postMaterial!: THREE.ShaderMaterial;

  // Ground
  private _groundMesh!: THREE.Mesh;
  private _groundMat!: THREE.ShaderMaterial;

  // Water surface
  private _surfaceMesh!: THREE.Mesh;

  // God rays
  private _godRays: THREE.Mesh[] = [];
  private _godRayMats: THREE.ShaderMaterial[] = [];

  // Player mesh
  private _playerGroup!: THREE.Group;
  private _swordMesh!: THREE.Mesh;
  private _swordSwingAngle = 0;

  // Sword trail arc
  private _slashTrail!: THREE.Mesh;
  private _slashTrailMat!: THREE.MeshStandardMaterial;

  // Shockwave ring (charged attack)
  private _shockwaveRing!: THREE.Mesh;
  private _shockwaveMat!: THREE.MeshStandardMaterial;
  private _shockwaveScale = 0;
  private _shockwaveLife = 0;

  // Charge aura
  private _chargeAura!: THREE.Mesh;
  private _chargeAuraMat!: THREE.MeshStandardMaterial;

  // Cape mesh for cloth animation
  private _capeMesh!: THREE.Mesh;
  private _capeBasePositions!: Float32Array;

  // Floating debris
  private _debrisMeshes: THREE.Mesh[] = [];

  // Sediment particles
  private _sedimentMesh!: THREE.Points;

  // Enemy meshes
  private _enemyMeshes = new Map<number, THREE.Group>();

  // Enemy HP bars
  private _enemyHpBars = new Map<number, THREE.Sprite>();

  // Enemy name labels
  private _enemyNameLabels = new Map<number, THREE.Sprite>();

  // Air bubble meshes
  private _airBubbleMeshes = new Map<number, THREE.Mesh>();

  // Treasure meshes
  private _treasureMeshes = new Map<number, THREE.Group>();

  // Harpoon meshes (may be Group or Mesh)
  private _harpoonMeshes = new Map<number, THREE.Object3D>();

  // Siren projectile meshes (may be Group or Mesh)
  private _sirenProjMeshes = new Map<number, THREE.Object3D>();

  // Whirlpool meshes
  private _whirlpoolMeshes: THREE.Group[] = [];

  // Relic meshes
  private _relicMeshes = new Map<number, THREE.Group>();

  // Drop meshes
  private _dropMeshes = new Map<number, THREE.Mesh>();

  // Jellyfish meshes
  private _jellyfishMeshes: THREE.Group[] = [];

  // Fish school meshes
  private _fishSchoolMeshes: THREE.InstancedMesh[] = [];

  // Excalibur
  private _excaliburGroup: THREE.Group | null = null;

  // World props
  private _propGroups: THREE.Group[] = [];
  private _kelpGroups: { group: THREE.Group; baseRotations: number[] }[] = [];

  // Particle system
  private _particleMesh!: THREE.Points;
  private _particleGeo!: THREE.BufferGeometry;
  private _tmpColor = new THREE.Color();
  private _particlePositions!: Float32Array;
  private _particleColors!: Float32Array;
  private _particleSizes!: Float32Array;

  // Damage number sprites
  private _dmgSprites: THREE.Sprite[] = [];

  // Time
  private _time = 0;

  // Shared geometries
  private _sphereGeo!: THREE.SphereGeometry;
  private _boxGeo!: THREE.BoxGeometry;
  private _cylinderGeo!: THREE.CylinderGeometry;

  // Reusable canvas for HP bars
  private _hpBarCanvas!: HTMLCanvasElement;
  private _hpBarCtx!: CanvasRenderingContext2D;

  get canvas(): HTMLCanvasElement { return this._canvas; }

  init(w: number, h: number): void {
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 0.8;
    this._canvas = this._renderer.domElement;
    this._canvas.style.cssText = "position:fixed;top:0;left:0;z-index:5;";

    this._scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(DEPTHS.CAMERA_FOV, w / h, DEPTHS.CAMERA_NEAR, DEPTHS.CAMERA_FAR);

    this._fog = new THREE.FogExp2(0x1a5577, 0.015);
    this._scene.fog = this._fog;
    this._scene.background = new THREE.Color(0x0a3355);

    this._sphereGeo = new THREE.SphereGeometry(1, 12, 8);
    this._boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this._cylinderGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);

    // Reusable HP bar canvas
    this._hpBarCanvas = document.createElement("canvas");
    this._hpBarCanvas.width = 64;
    this._hpBarCanvas.height = 8;
    this._hpBarCtx = this._hpBarCanvas.getContext("2d")!;

    this._setupLighting();
    this._setupGround();
    this._setupSurface();
    this._setupGodRays();
    this._setupPlayer();
    this._setupDebris();
    this._setupParticles();
    this._setupPostProcessing(w, h);
  }

  private _setupLighting(): void {
    this._ambientLight = new THREE.AmbientLight(0x224466, 0.6);
    this._scene.add(this._ambientLight);

    this._sunLight = new THREE.DirectionalLight(0x4488aa, 0.4);
    this._sunLight.position.set(0, 50, 0);
    this._scene.add(this._sunLight);

    this._playerLight = new THREE.PointLight(0x88ccff, DEPTHS.PLAYER_LIGHT_INTENSITY, DEPTHS.PLAYER_LIGHT_RADIUS);
    this._playerLight.castShadow = true;
    this._scene.add(this._playerLight);
  }

  private _setupGround(): void {
    this._groundMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        waterColor: { value: new THREE.Color(0x1a5577) },
        fogDensity: { value: 0.015 },
      },
      vertexShader: CAUSTIC_VERT,
      fragmentShader: CAUSTIC_FRAG,
    });

    const groundGeo = new THREE.PlaneGeometry(300, 300, 60, 60);
    groundGeo.rotateX(-Math.PI / 2);
    // Generate terrain height variation — rolling hills, ridges, craters
    const gPos = groundGeo.attributes.position;
    const gArr = gPos.array as Float32Array;
    for (let i = 0; i < gPos.count; i++) {
      const x = gArr[i * 3];
      const z = gArr[i * 3 + 2];
      // Multi-octave height: gentle rolling + sharper ridges
      let h = Math.sin(x * 0.02) * Math.cos(z * 0.015) * 4;
      h += Math.sin(x * 0.05 + z * 0.04) * 2;
      h += Math.cos(x * 0.08 - z * 0.06) * 1.5;
      // Crater near center
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < 30) h -= (30 - distFromCenter) * 0.15;
      gArr[i * 3 + 1] = h;
    }
    groundGeo.computeVertexNormals();
    this._groundMesh = new THREE.Mesh(groundGeo, this._groundMat);
    this._groundMesh.position.y = -180;
    this._scene.add(this._groundMesh);
  }

  private _setupSurface(): void {
    const geo = new THREE.PlaneGeometry(400, 400, 100, 100);
    geo.rotateX(Math.PI / 2);
    // Primary surface — higher quality with computed normals
    const mat = new THREE.MeshStandardMaterial({
      color: 0x77ccee, transparent: true, opacity: 0.35,
      side: THREE.DoubleSide, metalness: 0.7, roughness: 0.15,
      emissive: 0x224466, emissiveIntensity: 0.3,
      envMapIntensity: 1.5,
    });
    this._surfaceMesh = new THREE.Mesh(geo, mat);
    this._surfaceMesh.position.y = 0;
    this._scene.add(this._surfaceMesh);

    // Shimmer layer — subtle bright highlights
    const shimmerGeo = new THREE.PlaneGeometry(400, 400, 40, 40);
    shimmerGeo.rotateX(Math.PI / 2);
    const shimmerMat = new THREE.MeshStandardMaterial({
      color: 0xccddff, transparent: true, opacity: 0.06,
      side: THREE.DoubleSide, emissive: 0xaaccee, emissiveIntensity: 0.6,
      metalness: 0.9, roughness: 0.1,
    });
    const shimmer = new THREE.Mesh(shimmerGeo, shimmerMat);
    shimmer.position.y = 0.15;
    this._scene.add(shimmer);

    // Secondary deeper refraction layer
    const refractGeo = new THREE.PlaneGeometry(400, 400, 30, 30);
    refractGeo.rotateX(Math.PI / 2);
    const refractMat = new THREE.MeshStandardMaterial({
      color: 0x4499bb, transparent: true, opacity: 0.04,
      side: THREE.DoubleSide, emissive: 0x336688, emissiveIntensity: 0.3,
    });
    const refract = new THREE.Mesh(refractGeo, refractMat);
    refract.position.y = -0.2;
    this._scene.add(refract);
  }

  private _setupGodRays(): void {
    for (let i = 0; i < DEPTHS.GOD_RAY_COUNT; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, opacity: { value: 1.0 } },
        vertexShader: GODRAY_VERT,
        fragmentShader: GODRAY_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const geo = new THREE.PlaneGeometry(8 + Math.random() * 12, 80, 1, 8);
      const mesh = new THREE.Mesh(geo, mat);
      const angle = (i / DEPTHS.GOD_RAY_COUNT) * Math.PI * 2 + Math.random();
      const dist = 10 + Math.random() * 30;
      mesh.position.set(Math.cos(angle) * dist, -30, Math.sin(angle) * dist);
      mesh.rotation.y = angle + Math.PI / 2;
      this._scene.add(mesh);
      this._godRays.push(mesh);
      this._godRayMats.push(mat);
    }
  }

  private _setupPlayer(): void {
    this._playerGroup = new THREE.Group();

    const armorMat = new THREE.MeshStandardMaterial({ color: 0x3366aa, metalness: 0.7, roughness: 0.3 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x223355, metalness: 0.5, roughness: 0.5 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x88ddff, emissive: 0x44aadd, emissiveIntensity: 2.0 });

    // Torso (slightly tapered)
    const torso = new THREE.Mesh(this._boxGeo, armorMat);
    torso.scale.set(0.65, 0.9, 0.4);
    torso.position.y = 0.1;
    this._playerGroup.add(torso);

    // Waist
    const waist = new THREE.Mesh(this._boxGeo, darkMat);
    waist.scale.set(0.55, 0.25, 0.35);
    waist.position.y = -0.35;
    this._playerGroup.add(waist);

    // Shoulder pauldrons
    for (const side of [-1, 1]) {
      const pauldron = new THREE.Mesh(this._sphereGeo, armorMat);
      pauldron.scale.set(0.2, 0.15, 0.2);
      pauldron.position.set(side * 0.42, 0.55, 0);
      this._playerGroup.add(pauldron);
    }

    // Arms
    for (const side of [-1, 1]) {
      const upperArm = new THREE.Mesh(this._boxGeo, darkMat);
      upperArm.scale.set(0.15, 0.4, 0.15);
      upperArm.position.set(side * 0.5, 0.2, 0);
      this._playerGroup.add(upperArm);
      const forearm = new THREE.Mesh(this._boxGeo, armorMat);
      forearm.scale.set(0.12, 0.35, 0.12);
      forearm.position.set(side * 0.5, -0.15, 0.1);
      this._playerGroup.add(forearm);
    }

    // Legs
    for (const side of [-1, 1]) {
      const thigh = new THREE.Mesh(this._boxGeo, darkMat);
      thigh.scale.set(0.18, 0.45, 0.18);
      thigh.position.set(side * 0.18, -0.7, 0);
      this._playerGroup.add(thigh);
      const shin = new THREE.Mesh(this._boxGeo, armorMat);
      shin.scale.set(0.14, 0.4, 0.14);
      shin.position.set(side * 0.18, -1.1, 0.05);
      this._playerGroup.add(shin);
    }

    // Helmet
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x4477bb, metalness: 0.8, roughness: 0.2 });
    const helmet = new THREE.Mesh(this._sphereGeo, helmetMat);
    helmet.scale.set(0.3, 0.35, 0.3);
    helmet.position.y = 0.8;
    this._playerGroup.add(helmet);

    // Visor slit (glowing)
    const visor = new THREE.Mesh(this._boxGeo, glowMat);
    visor.scale.set(0.22, 0.05, 0.04);
    visor.position.set(0, 0.8, 0.28);
    this._playerGroup.add(visor);

    // Helmet crest
    const crest = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({ color: 0xcc4444, roughness: 0.6 }));
    crest.scale.set(0.04, 0.2, 0.25);
    crest.position.set(0, 1.0, 0);
    this._playerGroup.add(crest);

    // Sword (better shape with guard and pommel)
    const swordBlade = new THREE.MeshStandardMaterial({ color: 0xccddee, metalness: 0.9, roughness: 0.1, emissive: 0x224466, emissiveIntensity: 0.5 });
    this._swordMesh = new THREE.Mesh(this._boxGeo, swordBlade);
    this._swordMesh.scale.set(0.05, 1.0, 0.1);
    this._swordMesh.position.set(0.55, 0.2, 0.25);
    this._playerGroup.add(this._swordMesh);
    // Guard
    const guard = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({ color: 0x886633, metalness: 0.6 }));
    guard.scale.set(0.25, 0.04, 0.06);
    guard.position.set(0.55, -0.25, 0.25);
    this._playerGroup.add(guard);

    // Shield (larger, with emblem)
    const shieldMat = new THREE.MeshStandardMaterial({ color: 0x2255aa, metalness: 0.5, roughness: 0.4 });
    const shield = new THREE.Mesh(this._boxGeo, shieldMat);
    shield.scale.set(0.08, 0.55, 0.4);
    shield.position.set(-0.5, 0.05, 0.15);
    this._playerGroup.add(shield);
    // Shield emblem (glowing circle)
    const emblem = new THREE.Mesh(this._sphereGeo, glowMat);
    emblem.scale.set(0.08, 0.08, 0.02);
    emblem.position.set(-0.54, 0.05, 0.15);
    this._playerGroup.add(emblem);

    // Cape (flowing behind — high subdivision for cloth sim)
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0x223366, side: THREE.DoubleSide, roughness: 0.7,
      emissive: 0x111833, emissiveIntensity: 0.15,
    });
    const capeGeo = new THREE.PlaneGeometry(0.55, 1.0, 4, 8);
    this._capeMesh = new THREE.Mesh(capeGeo, capeMat);
    this._capeMesh.position.set(0, -0.1, -0.25);
    this._capeMesh.rotation.x = 0.15;
    // Store base positions for cloth animation
    this._capeBasePositions = new Float32Array(capeGeo.attributes.position.array);
    this._playerGroup.add(this._capeMesh);

    this._scene.add(this._playerGroup);

    // Sword slash trail arc
    const slashGeo = new THREE.TorusGeometry(1.2, 0.06, 10, 16, Math.PI * 0.8);
    this._slashTrailMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff, emissive: 0x44aaff, emissiveIntensity: 3,
      transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
    });
    this._slashTrail = new THREE.Mesh(slashGeo, this._slashTrailMat);
    this._slashTrail.visible = false;
    this._scene.add(this._slashTrail);

    // Shockwave ring (charged attack)
    const shockGeo = new THREE.TorusGeometry(1, 0.15, 12, 32);
    this._shockwaveMat = new THREE.MeshStandardMaterial({
      color: 0xffaa22, emissive: 0xffcc44, emissiveIntensity: 3,
      transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
    });
    this._shockwaveRing = new THREE.Mesh(shockGeo, this._shockwaveMat);
    this._shockwaveRing.rotation.x = Math.PI / 2;
    this._shockwaveRing.visible = false;
    this._scene.add(this._shockwaveRing);

    // Charge aura
    const auraGeo = new THREE.SphereGeometry(1.5, 16, 12);
    this._chargeAuraMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff, emissive: 0x4488cc, emissiveIntensity: 1,
      transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false,
    });
    this._chargeAura = new THREE.Mesh(auraGeo, this._chargeAuraMat);
    this._chargeAura.visible = false;
    this._scene.add(this._chargeAura);

    // Ambient sediment motes
    const sedCount = 400;
    const sedPositions = new Float32Array(sedCount * 3);
    const sedSizes = new Float32Array(sedCount);
    for (let i = 0; i < sedCount; i++) {
      sedPositions[i * 3] = (Math.random() - 0.5) * 80;
      sedPositions[i * 3 + 1] = -Math.random() * 180;
      sedPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      sedSizes[i] = 0.02 + Math.random() * 0.04;
    }
    const sedGeo = new THREE.BufferGeometry();
    sedGeo.setAttribute("position", new THREE.BufferAttribute(sedPositions, 3));
    sedGeo.setAttribute("size", new THREE.BufferAttribute(sedSizes, 1));
    const sedMat = new THREE.PointsMaterial({
      size: 0.05, color: 0x667788, transparent: true, opacity: 0.3,
      sizeAttenuation: true, depthWrite: false,
    });
    this._sedimentMesh = new THREE.Points(sedGeo, sedMat);
    this._scene.add(this._sedimentMesh);
  }

  private _setupDebris(): void {
    const debrisColors = [0x225533, 0x334422, 0x443322, 0x224433, 0x553322];
    for (let i = 0; i < 25; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: debrisColors[i % debrisColors.length],
        roughness: 0.9, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
      });
      let geo: THREE.BufferGeometry;
      if (i % 3 === 0) {
        geo = new THREE.PlaneGeometry(0.15, 0.6 + Math.random() * 0.4, 1, 3);
      } else if (i % 3 === 1) {
        geo = new THREE.IcosahedronGeometry(0.08 + Math.random() * 0.06, 0);
      } else {
        geo = new THREE.PlaneGeometry(0.2, 0.12, 1, 1);
      }
      const debris = new THREE.Mesh(geo, mat);
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * DEPTHS.WORLD_RADIUS;
      debris.position.set(Math.cos(angle) * dist, -(2 + Math.random() * 160), Math.sin(angle) * dist);
      debris.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      debris.userData.driftSpeed = 0.2 + Math.random() * 0.5;
      debris.userData.driftAngle = Math.random() * Math.PI * 2;
      debris.userData.bobPhase = Math.random() * Math.PI * 2;
      this._scene.add(debris);
      this._debrisMeshes.push(debris);
    }
  }

  private _setupParticles(): void {
    const maxP = DEPTHS.PARTICLE_LIMIT;
    this._particlePositions = new Float32Array(maxP * 3);
    this._particleColors = new Float32Array(maxP * 3);
    this._particleSizes = new Float32Array(maxP);

    this._particleGeo = new THREE.BufferGeometry();
    this._particleGeo.setAttribute("position", new THREE.BufferAttribute(this._particlePositions, 3));
    this._particleGeo.setAttribute("color", new THREE.BufferAttribute(this._particleColors, 3));
    this._particleGeo.setAttribute("size", new THREE.BufferAttribute(this._particleSizes, 1));

    const pMat = new THREE.PointsMaterial({
      size: 0.2, vertexColors: true, transparent: true, opacity: 0.9,
      sizeAttenuation: true, depthWrite: false,
      blending: THREE.AdditiveBlending, // glow effect for all particles
    });

    this._particleMesh = new THREE.Points(this._particleGeo, pMat);
    this._scene.add(this._particleMesh);
  }

  // ---- Post-processing ----

  private _setupPostProcessing(w: number, h: number): void {
    this._renderTarget = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    this._postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: this._renderTarget.texture },
        time: { value: 0 },
        distortionStrength: { value: 1.0 },
        bloomStrength: { value: 2.0 },
        chromaticAberration: { value: 0.0 },
        vignetteIntensity: { value: 0.0 },
        depthDarkness: { value: 0.0 },
        zoneTint: { value: new THREE.Color(0.9, 0.95, 1.1) },
        oxygenDistress: { value: 0.0 },
        damageFlash: { value: 0.0 },
      },
      vertexShader: POST_VERT,
      fragmentShader: POST_FRAG,
      depthTest: false,
      depthWrite: false,
    });

    const quad = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(quad, this._postMaterial);
    this._postScene = new THREE.Scene();
    this._postScene.add(mesh);
    this._postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  // ---- Build world props ----

  buildWorldProps(props: DepthsWorldProp[]): void {
    for (const g of this._propGroups) {
      this._scene.remove(g);
      g.traverse(c => { if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose(); });
    }
    this._propGroups = [];
    this._kelpGroups = [];

    for (const prop of props) {
      const group = new THREE.Group();
      group.position.set(prop.x, prop.y, prop.z);
      group.rotation.y = prop.rotY;

      switch (prop.type) {
        case "coral": {
          const mat = new THREE.MeshStandardMaterial({
            color: prop.color, emissive: prop.color, emissiveIntensity: 0.5, roughness: 0.6,
          });
          const trunk = new THREE.Mesh(this._cylinderGeo, mat);
          trunk.scale.set(prop.scaleX * 0.3, prop.scaleY, prop.scaleZ * 0.3);
          group.add(trunk);

          for (let i = 0; i < 2 + prop.variant; i++) {
            const branch = new THREE.Mesh(this._cylinderGeo, mat);
            const a = (i / (2 + prop.variant)) * Math.PI * 2;
            branch.scale.set(prop.scaleX * 0.15, prop.scaleY * 0.6, prop.scaleZ * 0.15);
            branch.position.set(Math.cos(a) * prop.scaleX * 0.3, prop.scaleY * 0.3, Math.sin(a) * prop.scaleZ * 0.3);
            branch.rotation.z = (Math.random() - 0.5) * 0.8;
            group.add(branch);
          }

          const glow = new THREE.PointLight(prop.color, 0.5, 6);
          glow.position.y = prop.scaleY * 0.5;
          group.add(glow);
          break;
        }
        case "kelp": {
          const mat = new THREE.MeshStandardMaterial({
            color: prop.color, roughness: 0.8,
            emissive: prop.color, emissiveIntensity: 0.15, // bioluminescent glow
          });
          const segs = 4 + prop.variant * 2;
          const baseRots: number[] = [];
          for (let i = 0; i < segs; i++) {
            const seg = new THREE.Mesh(this._boxGeo, mat);
            seg.scale.set(prop.scaleX, prop.scaleY / segs, prop.scaleZ);
            seg.position.y = (i / segs) * prop.scaleY;
            const baseRot = Math.sin(i * 0.5) * 0.15;
            seg.rotation.z = baseRot;
            baseRots.push(baseRot);
            group.add(seg);
          }
          this._kelpGroups.push({ group, baseRotations: baseRots });
          break;
        }
        case "rock": {
          const mat = new THREE.MeshStandardMaterial({ color: prop.color, roughness: 0.9, metalness: 0.1 });
          // Main boulder — deformed icosahedron for irregular shape
          const rockGeo = new THREE.IcosahedronGeometry(1, 1);
          const rPos = rockGeo.attributes.position;
          const rArr = rPos.array as Float32Array;
          for (let vi = 0; vi < rPos.count; vi++) {
            const nx = rArr[vi * 3], ny = rArr[vi * 3 + 1], nz = rArr[vi * 3 + 2];
            const noise = Math.sin(nx * 3 + prop.rotY) * Math.cos(ny * 2.5) * 0.2;
            rArr[vi * 3] *= 1 + noise;
            rArr[vi * 3 + 1] *= 1 + Math.sin(ny * 4 + nz * 3) * 0.15;
            rArr[vi * 3 + 2] *= 1 + Math.cos(nz * 3.5 + nx * 2) * 0.18;
          }
          rockGeo.computeVertexNormals();
          const rock = new THREE.Mesh(rockGeo, mat);
          rock.scale.set(prop.scaleX, prop.scaleY, prop.scaleZ);
          group.add(rock);
          // Secondary smaller rock
          if (prop.variant > 0) {
            const rock2 = new THREE.Mesh(this._sphereGeo, mat);
            rock2.scale.set(prop.scaleX * 0.4, prop.scaleY * 0.5, prop.scaleZ * 0.4);
            rock2.position.set(prop.scaleX * 0.6, -prop.scaleY * 0.2, prop.scaleZ * 0.3);
            group.add(rock2);
          }
          break;
        }
        case "ruin": {
          const mat = new THREE.MeshStandardMaterial({ color: prop.color, roughness: 0.8, metalness: 0.2 });
          const wall = new THREE.Mesh(this._boxGeo, mat);
          wall.scale.set(prop.scaleX, prop.scaleY, prop.scaleZ * 0.3);
          group.add(wall);

          if (prop.variant > 1) {
            const col = new THREE.Mesh(this._cylinderGeo, mat);
            col.scale.set(0.4, prop.scaleY * 0.7, 0.4);
            col.position.set(prop.scaleX * 0.6, 0, 0);
            group.add(col);
          }
          if (prop.variant > 2) {
            const arch = new THREE.Mesh(this._boxGeo, mat);
            arch.scale.set(prop.scaleX * 0.8, 0.4, prop.scaleZ * 0.3);
            arch.position.y = prop.scaleY * 0.5;
            group.add(arch);
          }

          const ruinGlow = new THREE.PointLight(0x4488aa, 0.3, 8);
          ruinGlow.position.y = prop.scaleY * 0.3;
          group.add(ruinGlow);
          break;
        }
      }

      this._scene.add(group);
      this._propGroups.push(group);
    }
  }

  // ---- Main update ----

  update(state: DepthsState, dt: number): void {
    this._time += dt;

    const zone = DEPTHS.DEPTH_ZONES[state.depthZoneIndex];
    const targetColor = new THREE.Color(zone.color);
    const bgColor = this._scene.background as THREE.Color;
    bgColor.lerp(targetColor, dt * 2);
    this._fog.density += (zone.fogDensity - this._fog.density) * dt * 2;
    this._fog.color.copy(bgColor);

    this._groundMat.uniforms.time.value = this._time;
    this._groundMat.uniforms.waterColor.value.copy(bgColor);
    this._groundMat.uniforms.fogDensity.value = this._fog.density;

    this._animateSurface();
    this._animateKelp();
    this._updateGodRays(state);

    const depthFactor = Math.max(0.05, 1.0 - state.currentDepth / 180);
    this._ambientLight.intensity = 0.6 * depthFactor;
    this._sunLight.intensity = 0.4 * depthFactor;

    this._playerLight.position.set(state.player.x, state.player.y + 1, state.player.z);
    this._playerLight.intensity = DEPTHS.PLAYER_LIGHT_INTENSITY + Math.sin(this._time * 2) * 0.2;
    this._playerLight.distance = state.player.lightRadius;

    // FOV update
    this._camera.fov = state.currentFov;
    this._camera.updateProjectionMatrix();

    this._updatePlayer(state, dt);
    this._updateCamera(state, dt);
    this._updateEnemies(state);
    this._updateEnemyHpBars(state);
    this._updateEnemyNameLabels(state);
    this._updateAirBubbles(state);
    this._updateTreasures(state);
    this._updateHarpoons(state);
    this._updateSirenProjectiles(state);
    this._updateWhirlpools(state);
    this._updateRelics(state);
    this._updateDrops(state);
    this._updateFishSchools(state);
    this._updateJellyfish(state);
    this._updateExcalibur(state);
    this._updateEnemyTelegraphs(state);
    this._updateParticles(state);
    this._updateDamageNumbers(state);

    // Post-processing uniforms
    const pu = this._postMaterial.uniforms;
    pu.time.value = this._time;
    pu.distortionStrength.value = 0.6 + state.currentDepth * 0.003;
    pu.bloomStrength.value = 1.5 + state.currentDepth * 0.005;
    pu.depthDarkness.value = Math.min(0.8, state.currentDepth / 200);
    pu.vignetteIntensity.value = state.vignetteIntensity;

    // Chromatic aberration spikes on damage
    const caTarget = state.screenShake.intensity * 0.008 + (state.player.hp < state.player.maxHp * 0.2 ? 0.002 : 0);
    pu.chromaticAberration.value += (caTarget - pu.chromaticAberration.value) * 8 * 0.016;

    // Per-zone color grading tint
    const zoneColors: [number, number, number][] = [
      [0.95, 1.0, 1.1],   // Shallows: slight cool blue
      [0.85, 0.9, 1.15],  // Twilight Reef: deeper blue-purple
      [0.75, 0.8, 1.1],   // The Abyss: desaturated cold
      [0.7, 0.75, 1.2],   // Avalon's Heart: deep indigo
    ];
    const zc = zoneColors[state.depthZoneIndex] ?? [0.9, 0.95, 1.1];
    const zt = pu.zoneTint.value as THREE.Color;
    zt.r += (zc[0] - zt.r) * 2 * dt;
    zt.g += (zc[1] - zt.g) * 2 * dt;
    zt.b += (zc[2] - zt.b) * 2 * dt;

    // Oxygen distress (screen desaturation + red pulse when low O2)
    const o2Ratio = state.player.oxygen / state.player.maxOxygen;
    const targetOxyDistress = o2Ratio < 0.3 ? (1 - o2Ratio / 0.3) : 0;
    pu.oxygenDistress.value += (targetOxyDistress - pu.oxygenDistress.value) * 4 * dt;

    // Damage flash (spikes on screen shake, decays quickly)
    const targetDmgFlash = state.screenShake.intensity > 0.2 ? state.screenShake.intensity : 0;
    pu.damageFlash.value += (targetDmgFlash - pu.damageFlash.value) * 10 * dt;

    // Wave event atmosphere — boost bloom and add slight warm tint during waves
    if (state.waveActive) {
      pu.bloomStrength.value += 1.0;
      zt.r = Math.min(1.2, zt.r + 0.1 * dt);
    }

    this._renderer.setRenderTarget(this._renderTarget);
    this._renderer.render(this._scene, this._camera);
    this._renderer.setRenderTarget(null);
    this._renderer.render(this._postScene, this._postCamera);
  }

  private _animateSurface(): void {
    const pos = this._surfaceMesh.geometry.attributes.position;
    const arr = pos.array as Float32Array;
    const t = this._time;
    for (let i = 0; i < pos.count; i++) {
      const x = arr[i * 3];
      const z = arr[i * 3 + 2];
      // Multi-octave wave pattern — 5 layers for realistic water
      arr[i * 3 + 1] = Math.sin(x * 0.04 + t * 0.8) * 0.35
                      + Math.cos(z * 0.06 + t * 0.6) * 0.25
                      + Math.sin((x + z) * 0.08 + t * 1.1) * 0.15
                      + Math.cos(x * 0.12 - t * 0.5) * 0.08
                      + Math.sin(z * 0.15 + t * 1.4) * 0.05;
    }
    pos.needsUpdate = true;
    // Recompute normals for proper lighting on the wavy surface
    this._surfaceMesh.geometry.computeVertexNormals();
  }

  private _animateKelp(): void {
    // Kelp sway + bioluminescent pulse
    for (const kd of this._kelpGroups) {
      const children = kd.group.children;
      const pulsePhase = this._time * 1.2 + kd.group.position.x * 0.05;
      for (let i = 0; i < children.length; i++) {
        const base = kd.baseRotations[i] ?? 0;
        const sway = Math.sin(this._time * 0.8 + kd.group.position.x * 0.1 + i * 0.4) * 0.15 * (i / children.length);
        children[i].rotation.z = base + sway;
        const child = children[i] as THREE.Mesh;
        if (child.material && (child.material as THREE.MeshStandardMaterial).emissiveIntensity !== undefined) {
          const pulse = Math.max(0, Math.sin(pulsePhase - i * 0.5)) * 0.4;
          (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.15 + pulse;
        }
      }
    }

    // Coral glow pulse — synchronized pulsing per coral cluster
    for (const g of this._propGroups) {
      // Only coral groups have PointLight children at specific positions
      if (!g.children.some(c => c instanceof THREE.PointLight)) continue;
      g.traverse(c => {
        if ((c as THREE.Mesh).isMesh) {
          const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat.emissiveIntensity !== undefined && mat.emissiveIntensity > 0.1) {
            const pulse = 0.5 + Math.sin(this._time * 1.5 + g.position.x * 0.1 + g.position.z * 0.1) * 0.3;
            mat.emissiveIntensity = pulse;
          }
        }
        if (c instanceof THREE.PointLight) {
          c.intensity = 0.5 + Math.sin(this._time * 1.5 + g.position.x * 0.1) * 0.3;
        }
      });
    }
  }

  private _updateGodRays(state: DepthsState): void {
    const fade = Math.max(0, 1 - state.currentDepth / DEPTHS.GOD_RAY_MAX_DEPTH);
    const p = state.player;
    for (let i = 0; i < this._godRays.length; i++) {
      this._godRayMats[i].uniforms.time.value = this._time;
      this._godRayMats[i].uniforms.opacity.value = fade;
      this._godRays[i].visible = fade > 0.01;
      // Follow player loosely
      const ray = this._godRays[i];
      const angle = (i / this._godRays.length) * Math.PI * 2 + this._time * 0.02;
      const dist = 15 + i * 8;
      const targetX = p.x + Math.cos(angle) * dist;
      const targetZ = p.z + Math.sin(angle) * dist;
      ray.position.x += (targetX - ray.position.x) * 0.3 * 0.016;
      ray.position.z += (targetZ - ray.position.z) * 0.3 * 0.016;
      ray.position.y = Math.min(-5, p.y + 10); // stay above player
    }
  }

  private _updatePlayer(state: DepthsState, dt: number): void {
    const p = state.player;
    this._playerGroup.position.set(p.x, p.y, p.z);
    this._playerGroup.rotation.y = p.yaw + Math.PI;
    // Swim animation — bob + sway based on velocity
    const swimSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
    const swimFreq = 1.5 + swimSpeed * 0.15;
    this._playerGroup.position.y += Math.sin(this._time * swimFreq) * 0.1;
    this._playerGroup.rotation.z = Math.sin(this._time * swimFreq * 0.7) * swimSpeed * 0.015;
    this._playerGroup.rotation.x = p.pitch * 0.3;

    // Dash visual — tilt forward and glow
    if (p.dashTimer > 0) {
      this._playerGroup.rotation.x += 0.4;
      this._playerLight.intensity = 4.0;
    }

    // Charge visual — glow brighter with charge
    if (p.charging && p.chargeTimer > 0.2) {
      const chargePct = Math.min(p.chargeTimer / DEPTHS.CHARGE_TIME, 1);
      this._playerLight.intensity = DEPTHS.PLAYER_LIGHT_INTENSITY + chargePct * 3;
      this._playerLight.color.setHex(chargePct >= 1 ? 0xffaa22 : 0x88ccff);
    } else if (p.dashTimer <= 0) {
      this._playerLight.color.setHex(0x88ccff);
    }

    if (p.attackCooldown > DEPTHS.PLAYER_ATTACK_COOLDOWN * 0.5) {
      this._swordSwingAngle += dt * 15;
    } else {
      this._swordSwingAngle *= 0.9;
    }
    this._swordMesh.rotation.z = -this._swordSwingAngle * 0.5;
    this._swordMesh.rotation.x = Math.sin(this._swordSwingAngle) * 0.3;

    this._playerGroup.visible = p.invulnTimer <= 0 || Math.sin(this._time * 30) > 0;

    // Sword slash trail arc
    if (p.attackCooldown > DEPTHS.PLAYER_ATTACK_COOLDOWN * 0.3) {
      this._slashTrail.visible = true;
      const slashProg = 1 - p.attackCooldown / DEPTHS.PLAYER_ATTACK_COOLDOWN;
      this._slashTrailMat.opacity = (1 - slashProg) * 0.8;
      this._slashTrail.position.copy(this._playerGroup.position);
      this._slashTrail.position.y += 0.3;
      this._slashTrail.rotation.y = p.yaw + Math.PI + slashProg * 2;
      this._slashTrail.rotation.x = 0.3;
      this._slashTrail.scale.setScalar(0.8 + slashProg * 0.5);
    } else {
      this._slashTrail.visible = false;
    }

    // Shockwave ring (from charged attack)
    if (this._shockwaveLife > 0) {
      this._shockwaveRing.visible = true;
      this._shockwaveScale += dt * 20;
      this._shockwaveLife -= dt;
      this._shockwaveMat.opacity = this._shockwaveLife * 2;
      this._shockwaveRing.scale.setScalar(this._shockwaveScale);
    } else {
      this._shockwaveRing.visible = false;
    }
    // Trigger shockwave when charged attack fires
    if (p.attackCooldown > DEPTHS.PLAYER_ATTACK_COOLDOWN * 1.4 && this._shockwaveLife <= 0) {
      this._shockwaveLife = 0.5;
      this._shockwaveScale = 0.5;
      this._shockwaveRing.position.copy(this._playerGroup.position);
    }

    // Charge aura
    if (p.charging && p.chargeTimer > 0.15) {
      this._chargeAura.visible = true;
      const chPct = Math.min(p.chargeTimer / DEPTHS.CHARGE_TIME, 1);
      this._chargeAura.position.copy(this._playerGroup.position);
      this._chargeAuraMat.opacity = chPct * 0.25;
      this._chargeAuraMat.emissiveIntensity = chPct * 2;
      if (chPct >= 1) {
        this._chargeAuraMat.color.setHex(0xffaa22);
        this._chargeAuraMat.emissive.setHex(0xff8800);
      } else {
        this._chargeAuraMat.color.setHex(0x88ccff);
        this._chargeAuraMat.emissive.setHex(0x4488cc);
      }
      const auraPulse = 1 + Math.sin(this._time * 8) * 0.1 * chPct;
      this._chargeAura.scale.setScalar(1.0 + chPct * 0.8 * auraPulse);
    } else {
      this._chargeAura.visible = false;
    }

    // Cape cloth animation — vertex displacement based on velocity + time
    if (this._capeMesh && this._capeBasePositions) {
      const capePos = this._capeMesh.geometry.attributes.position;
      const cArr = capePos.array as Float32Array;
      const base = this._capeBasePositions;
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
      for (let i = 0; i < capePos.count; i++) {
        const bx = base[i * 3];
        const by = base[i * 3 + 1];
        const bz = base[i * 3 + 2];
        // Lower vertices wave more (row = normalized Y from top)
        const row = 1 - (by + 0.5); // 0 at top, 1 at bottom
        const wave = Math.sin(this._time * 3 + row * 4 + bx * 5) * row * 0.12;
        const speedWave = Math.sin(this._time * 5 + row * 3) * row * speed * 0.015;
        // Flow backward with speed
        cArr[i * 3] = bx + wave;
        cArr[i * 3 + 1] = by;
        cArr[i * 3 + 2] = bz - row * speed * 0.04 + speedWave;
      }
      capePos.needsUpdate = true;
      this._capeMesh.geometry.computeVertexNormals();
    }

    // Sprint visual — player light flares + body leans forward
    if (p.sprinting && swimSpeed > 3) {
      this._playerLight.intensity = DEPTHS.PLAYER_LIGHT_INTENSITY + 1.0;
      this._playerGroup.rotation.x += 0.15; // lean forward more
    }

    // Sediment motes follow player loosely
    this._sedimentMesh.position.x += (p.x - this._sedimentMesh.position.x) * 0.5 * dt;
    this._sedimentMesh.position.y += (p.y - this._sedimentMesh.position.y) * 0.3 * dt;
    this._sedimentMesh.position.z += (p.z - this._sedimentMesh.position.z) * 0.5 * dt;
    // Slow drift
    const sedPos = this._sedimentMesh.geometry.attributes.position;
    const sedArr = sedPos.array as Float32Array;
    for (let i = 0; i < sedPos.count; i++) {
      sedArr[i * 3 + 1] += Math.sin(this._time * 0.3 + i) * 0.003;
    }
    sedPos.needsUpdate = true;

    // Floating debris animation — drift, spin, bob
    for (const deb of this._debrisMeshes) {
      const ds = deb.userData.driftSpeed as number;
      const da = deb.userData.driftAngle as number;
      const bp = deb.userData.bobPhase as number;
      deb.position.x += Math.sin(da) * ds * dt * 0.3;
      deb.position.z += Math.cos(da) * ds * dt * 0.3;
      deb.position.y += Math.sin(this._time * 0.5 + bp) * 0.003;
      deb.rotation.x += dt * ds * 0.2;
      deb.rotation.z += dt * ds * 0.1;
      // Slowly change drift direction
      deb.userData.driftAngle = da + (Math.sin(this._time * 0.1 + bp) * 0.01);
    }
  }

  private _updateCamera(state: DepthsState, dt: number): void {
    const p = state.player;
    const cosYaw = Math.cos(p.yaw);
    const sinYaw = Math.sin(p.yaw);

    const targetX = p.x - sinYaw * DEPTHS.CAMERA_OFFSET_Z;
    const targetY = p.y + DEPTHS.CAMERA_OFFSET_Y;
    const targetZ = p.z - cosYaw * DEPTHS.CAMERA_OFFSET_Z;

    const lerp = DEPTHS.CAMERA_LERP * dt;
    this._camera.position.x += (targetX - this._camera.position.x) * lerp;
    this._camera.position.y += (targetY - this._camera.position.y) * lerp;
    this._camera.position.z += (targetZ - this._camera.position.z) * lerp;

    // Camera shake
    this._camera.position.x += state.screenShake.offsetX;
    this._camera.position.y += state.screenShake.offsetY;

    this._camera.lookAt(p.x, p.y, p.z);
  }

  // ---- Enemies ----

  private _updateEnemies(state: DepthsState): void {
    const alive = new Set<number>();

    for (const e of state.enemies) {
      alive.add(e.id);

      let group = this._enemyMeshes.get(e.id);
      if (!group) {
        group = this._createEnemyMesh(e);
        this._enemyMeshes.set(e.id, group);
        this._scene.add(group);
      }

      group.position.set(e.x, e.y, e.z);

      const dx = state.player.x - e.x;
      const dz = state.player.z - e.z;
      group.rotation.y = Math.atan2(dx, dz);
      group.position.y += Math.sin(this._time * 2 + e.id) * 0.15;

      // Boss: pulsate scale
      if (e.isBoss) {
        const pulse = 1 + Math.sin(this._time * 3) * 0.08;
        group.scale.set(e.radius * 1.5 * pulse, e.radius * 1.5 * pulse, e.radius * 1.5 * pulse);
      }

      // Type-specific idle animations
      const t = this._time;
      switch (e.type) {
        case "abyssal_eel": {
          // Serpentine undulation through body segments
          const children = group.children;
          for (let s = 0; s < children.length; s++) {
            if (children[s] instanceof THREE.PointLight) continue;
            children[s].position.x = Math.sin(t * 3 + s * 0.8) * 0.15 * s;
            children[s].position.y = Math.cos(t * 2.5 + s * 0.6) * 0.08 * s;
          }
          break;
        }
        case "siren": {
          // Tail sway + ethereal float
          const children2 = group.children;
          if (children2[1]) { // tail
            children2[1].rotation.x = 0.3 + Math.sin(t * 2 + e.id) * 0.3;
            children2[1].rotation.z = Math.sin(t * 1.5 + e.id) * 0.2;
          }
          break;
        }
        case "kraken_tentacle": {
          // Tentacle segments wave
          const children3 = group.children;
          for (let s = 0; s < children3.length; s++) {
            children3[s].rotation.z = Math.sin(t * 1.5 + s * 0.8) * 0.3 * (s + 1) * 0.2;
            children3[s].rotation.x = Math.cos(t * 1.2 + s * 0.6) * 0.15;
          }
          break;
        }
        case "phantom_leviathan": {
          // Jaw opening and closing
          const children4 = group.children;
          if (children4[1]) { // jaw
            children4[1].position.y = Math.sin(t * 1.5) * 0.15 - 0.1;
          }
          break;
        }
        case "abyssal_kraken": {
          // Tentacle wave (boss)
          let childIdx = 0;
          for (const child of group.children) {
            if (child instanceof THREE.PointLight) continue;
            if (childIdx > 2) { // tentacle segments
              child.rotation.z += Math.sin(t * 2 + childIdx * 0.4) * 0.01;
              child.rotation.x += Math.cos(t * 1.8 + childIdx * 0.3) * 0.01;
            }
            childIdx++;
          }
          break;
        }
        case "lady_of_the_lake": {
          // Floating robes sway, halo rotation
          for (const child of group.children) {
            if (child instanceof THREE.Mesh && child.geometry instanceof THREE.TorusGeometry) {
              child.rotation.z = Math.sin(t * 0.5) * 0.1; // halo tilt
            }
          }
          // Gentle body sway
          group.rotation.z = Math.sin(t * 0.7) * 0.05;
          break;
        }
        case "reef_guardian": {
          // Head bob
          for (const child of group.children) {
            if (child.position.z > 0.5 && child instanceof THREE.Mesh) {
              child.position.y = 0.1 + Math.sin(t * 1.2) * 0.08;
            }
          }
          break;
        }
        case "twilight_serpent": {
          // Body segments undulate
          let segIdx = 0;
          for (const child of group.children) {
            if (child instanceof THREE.PointLight || child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry) continue;
            if (child instanceof THREE.Mesh) {
              child.position.x = Math.sin(t * 2 + segIdx * 0.7) * 0.1 * segIdx;
              child.position.y = Math.cos(t * 1.8 + segIdx * 0.5) * 0.06 * segIdx;
              segIdx++;
            }
          }
          break;
        }
      }

      group.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat.emissiveIntensity !== undefined) {
            mat.emissiveIntensity = e.hitFlash > 0 ? 3.0 : (e.isBoss ? 1.0 : 0.5);
          }
        }
      });

      if (!e.alive) {
        // Dramatic death: expand briefly then shrink + spin + fade
        if (group.scale.x > e.radius * 1.4) {
          // Initial expand burst
          group.scale.multiplyScalar(1.02);
          group.rotation.y += 0.15;
        } else if (group.scale.x > e.radius * 0.8) {
          // First frame of death — expand briefly
          group.scale.multiplyScalar(1.08);
        }
        if (group.scale.x > e.radius * 1.5) {
          // Shrink phase
          group.scale.multiplyScalar(0.88);
          group.rotation.y += 0.2;
          group.position.y += 0.05; // float upward as it dissolves
          // Fade to transparent
          group.traverse(c => {
            if ((c as THREE.Mesh).isMesh) {
              const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
              if (m.transparent !== undefined) { m.transparent = true; m.opacity = Math.max(0, (m.opacity ?? 1) - 0.05); }
            }
          });
        }
        if (group.scale.x < 0.05) {
          this._scene.remove(group);
          this._enemyMeshes.delete(e.id);
        }
      }
    }

    for (const [id, group] of this._enemyMeshes) {
      if (!alive.has(id)) {
        this._scene.remove(group);
        this._enemyMeshes.delete(id);
      }
    }
  }

  private _createEnemyMesh(e: DepthsEnemy): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: e.color, emissive: e.glow, emissiveIntensity: e.isBoss ? 1.0 : 0.5,
      metalness: 0.3, roughness: 0.6,
    });

    switch (e.type) {
      case "drowned_knight": {
        const body = new THREE.Mesh(this._boxGeo, mat);
        body.scale.set(0.6, 1.0, 0.4);
        group.add(body);
        const head = new THREE.Mesh(this._sphereGeo, mat);
        head.scale.set(0.3, 0.35, 0.3);
        head.position.y = 0.7;
        group.add(head);
        const eyeMat = new THREE.MeshStandardMaterial({ color: e.glow, emissive: e.glow, emissiveIntensity: 3 });
        const eye1 = new THREE.Mesh(this._sphereGeo, eyeMat);
        eye1.scale.set(0.06, 0.06, 0.06);
        eye1.position.set(-0.1, 0.75, 0.25);
        group.add(eye1);
        const eye2 = eye1.clone();
        eye2.position.x = 0.1;
        group.add(eye2);
        break;
      }
      case "siren": {
        const body = new THREE.Mesh(this._sphereGeo, mat);
        body.scale.set(0.4, 0.6, 0.4);
        group.add(body);
        const tail = new THREE.Mesh(this._cylinderGeo, mat);
        tail.scale.set(0.25, 0.8, 0.15);
        tail.position.y = -0.6;
        tail.rotation.x = 0.3;
        group.add(tail);
        const aura = new THREE.PointLight(e.glow, 0.8, 5);
        group.add(aura);
        break;
      }
      case "abyssal_eel": {
        for (let i = 0; i < 6; i++) {
          const seg = new THREE.Mesh(this._sphereGeo, mat);
          seg.scale.set(0.2, 0.2, 0.3);
          seg.position.z = -i * 0.35;
          group.add(seg);
        }
        const eelGlow = new THREE.PointLight(e.glow, 0.6, 4);
        group.add(eelGlow);
        break;
      }
      case "kraken_tentacle": {
        for (let i = 0; i < 5; i++) {
          const seg = new THREE.Mesh(this._cylinderGeo, mat);
          const s = 1.0 - i * 0.15;
          seg.scale.set(s * 0.5, 1.0, s * 0.5);
          seg.position.y = i * 0.8;
          seg.rotation.z = Math.sin(i * 0.8) * 0.3;
          group.add(seg);
        }
        break;
      }
      case "phantom_leviathan": {
        const mainBody = new THREE.Mesh(this._sphereGeo, mat);
        mainBody.scale.set(1.5, 1.0, 2.5);
        group.add(mainBody);
        const jawMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: e.glow, emissiveIntensity: 2 });
        const jaw = new THREE.Mesh(this._boxGeo, jawMat);
        jaw.scale.set(1.2, 0.3, 0.8);
        jaw.position.z = 1.8;
        group.add(jaw);
        for (let i = 0; i < 3; i++) {
          const gl = new THREE.PointLight(e.glow, 1.0, 8);
          gl.position.set((Math.random() - 0.5) * 2, Math.random() - 0.5, (Math.random() - 0.5) * 3);
          group.add(gl);
        }
        break;
      }
      case "reef_guardian": {
        // Massive turtle-like shell with coral growths
        const shell = new THREE.Mesh(this._sphereGeo, mat);
        shell.scale.set(1.2, 0.7, 1.4);
        group.add(shell);
        // Coral growths on shell
        const coralMat = new THREE.MeshStandardMaterial({ color: 0x44ddaa, emissive: 0x22aa66, emissiveIntensity: 1.0 });
        for (let i = 0; i < 6; i++) {
          const coral = new THREE.Mesh(this._cylinderGeo, coralMat);
          coral.scale.set(0.1, 0.3 + Math.random() * 0.3, 0.1);
          const a = (i / 6) * Math.PI * 2;
          coral.position.set(Math.cos(a) * 0.7, 0.4 + Math.random() * 0.2, Math.sin(a) * 0.8);
          group.add(coral);
        }
        // Head
        const head = new THREE.Mesh(this._sphereGeo, mat);
        head.scale.set(0.4, 0.35, 0.4);
        head.position.set(0, 0.1, 1.0);
        group.add(head);
        // Glowing eyes
        const eyeMat = new THREE.MeshStandardMaterial({ emissive: e.glow, emissiveIntensity: 3 });
        for (const sx of [-0.12, 0.12]) {
          const eye = new THREE.Mesh(this._sphereGeo, eyeMat);
          eye.scale.set(0.06, 0.06, 0.06);
          eye.position.set(sx, 0.15, 1.3);
          group.add(eye);
        }
        // Aura
        const gl1 = new THREE.PointLight(e.glow, 2, 12);
        group.add(gl1);
        break;
      }
      case "twilight_serpent": {
        // Long serpentine body with fins
        const segMat = new THREE.MeshStandardMaterial({ color: e.color, emissive: e.glow, emissiveIntensity: 0.8, metalness: 0.4 });
        for (let i = 0; i < 8; i++) {
          const seg = new THREE.Mesh(this._sphereGeo, segMat);
          const s = 1 - i * 0.08;
          seg.scale.set(s * 0.4, s * 0.35, s * 0.5);
          seg.position.z = -i * 0.5;
          seg.position.y = Math.sin(i * 0.6) * 0.15;
          group.add(seg);
        }
        // Dorsal fin
        const finMat = new THREE.MeshStandardMaterial({ color: 0x5577cc, emissive: e.glow, emissiveIntensity: 0.5, side: THREE.DoubleSide });
        for (let i = 0; i < 4; i++) {
          const fin = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.4), finMat);
          fin.position.set(0, 0.3, -i * 0.5);
          fin.rotation.x = -0.2;
          group.add(fin);
        }
        // Jaws
        const jaw = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({ color: 0x223344, emissive: e.glow, emissiveIntensity: 2 }));
        jaw.scale.set(0.3, 0.15, 0.4);
        jaw.position.z = 0.5;
        group.add(jaw);
        for (let i = 0; i < 3; i++) {
          const gl = new THREE.PointLight(e.glow, 1.5, 10);
          gl.position.set(0, 0, -i * 1.2);
          group.add(gl);
        }
        break;
      }
      case "abyssal_kraken": {
        // Bulbous head with 8 long tentacles
        const headMesh = new THREE.Mesh(this._sphereGeo, mat);
        headMesh.scale.set(1.0, 1.2, 0.8);
        group.add(headMesh);
        // Massive eyes
        const kEyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff2222, emissiveIntensity: 3 });
        for (const sx of [-0.35, 0.35]) {
          const eye = new THREE.Mesh(this._sphereGeo, kEyeMat);
          eye.scale.set(0.15, 0.2, 0.1);
          eye.position.set(sx, 0.2, 0.6);
          group.add(eye);
        }
        // Tentacles — 8 arms
        const tentMat = new THREE.MeshStandardMaterial({ color: e.color, emissive: e.glow, emissiveIntensity: 0.4 });
        for (let t = 0; t < 8; t++) {
          const angle = (t / 8) * Math.PI * 2;
          for (let s = 0; s < 4; s++) {
            const seg = new THREE.Mesh(this._cylinderGeo, tentMat);
            const taper = 1 - s * 0.2;
            seg.scale.set(taper * 0.15, 0.5, taper * 0.15);
            const r = 0.4 + s * 0.35;
            seg.position.set(Math.cos(angle) * r, -0.6 - s * 0.3, Math.sin(angle) * r);
            seg.rotation.z = Math.cos(angle) * (0.3 + s * 0.15);
            seg.rotation.x = Math.sin(angle) * (0.3 + s * 0.15);
            group.add(seg);
          }
        }
        for (let i = 0; i < 5; i++) {
          const gl = new THREE.PointLight(e.glow, 1.5, 10);
          gl.position.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
          group.add(gl);
        }
        break;
      }
      case "lady_of_the_lake": {
        // Ethereal feminine form with flowing robes and crown
        const robeMat = new THREE.MeshStandardMaterial({
          color: 0xaaccff, emissive: 0x6688dd, emissiveIntensity: 1.5,
          transparent: true, opacity: 0.8, side: THREE.DoubleSide,
        });
        // Body/robe
        const robe = new THREE.Mesh(this._cylinderGeo, robeMat);
        robe.scale.set(0.5, 1.4, 0.5);
        group.add(robe);
        // Flowing lower robe (wider)
        const lowerRobe = new THREE.Mesh(this._cylinderGeo, robeMat);
        lowerRobe.scale.set(0.7, 0.8, 0.7);
        lowerRobe.position.y = -0.8;
        group.add(lowerRobe);
        // Head
        const headM = new THREE.Mesh(this._sphereGeo, new THREE.MeshStandardMaterial({
          color: 0xddeeff, emissive: 0xaaccff, emissiveIntensity: 1.0,
        }));
        headM.scale.set(0.25, 0.3, 0.25);
        headM.position.y = 1.0;
        group.add(headM);
        // Crown of light
        const crownMat = new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xffcc00, emissiveIntensity: 3 });
        for (let i = 0; i < 5; i++) {
          const spike = new THREE.Mesh(this._cylinderGeo, crownMat);
          spike.scale.set(0.03, 0.2, 0.03);
          const a = (i / 5) * Math.PI * 2;
          spike.position.set(Math.cos(a) * 0.2, 1.25, Math.sin(a) * 0.2);
          group.add(spike);
        }
        // Arms outstretched
        for (const side of [-1, 1]) {
          const arm = new THREE.Mesh(this._cylinderGeo, robeMat);
          arm.scale.set(0.1, 0.6, 0.1);
          arm.position.set(side * 0.6, 0.4, 0);
          arm.rotation.z = side * 0.6;
          group.add(arm);
        }
        // Halo ring
        const haloGeo = new THREE.TorusGeometry(0.4, 0.03, 8, 24);
        const haloMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.y = 1.35;
        halo.rotation.x = Math.PI / 2;
        group.add(halo);
        // Massive aura
        for (let i = 0; i < 6; i++) {
          const gl = new THREE.PointLight(e.glow, 2, 15);
          gl.position.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
          group.add(gl);
        }
        break;
      }
      default: {
        const body = new THREE.Mesh(this._sphereGeo, mat);
        body.scale.set(1, 1, 1);
        group.add(body);
        if (e.isBoss) {
          const gl = new THREE.PointLight(e.glow, 1.5, 12);
          group.add(gl);
        }
      }
    }

    group.scale.set(e.radius * 1.5, e.radius * 1.5, e.radius * 1.5);
    return group;
  }

  // ---- Enemy HP bars ----

  private _updateEnemyHpBars(state: DepthsState): void {
    const active = new Set<number>();

    for (const e of state.enemies) {
      if (!e.alive || e.hp >= e.maxHp) continue;
      active.add(e.id);

      // Draw HP bar to canvas
      const ctx = this._hpBarCtx;
      const w = 64, h = 8;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, w, h);
      const pct = e.hp / e.maxHp;
      ctx.fillStyle = e.isBoss ? "#ff44ff" : (pct > 0.3 ? "#44cc66" : "#ff4444");
      ctx.fillRect(1, 1, (w - 2) * pct, h - 2);
      if (e.isBoss) {
        ctx.strokeStyle = "#ffaaff";
        ctx.strokeRect(0, 0, w, h);
      }

      let sprite = this._enemyHpBars.get(e.id);
      if (!sprite) {
        const ownCanvas = document.createElement("canvas");
        ownCanvas.width = 64;
        ownCanvas.height = 8;
        const tex = new THREE.CanvasTexture(ownCanvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        sprite = new THREE.Sprite(mat);
        sprite.scale.set(e.isBoss ? 4 : 2, e.isBoss ? 0.4 : 0.25, 1);
        this._scene.add(sprite);
        this._enemyHpBars.set(e.id, sprite);
      }

      // Copy shared canvas to sprite's own canvas and flag update
      const tex = (sprite.material as THREE.SpriteMaterial).map as THREE.CanvasTexture;
      const ownCtx = tex.image.getContext("2d");
      if (ownCtx) ownCtx.drawImage(this._hpBarCanvas, 0, 0);
      tex.needsUpdate = true;

      sprite.position.set(e.x, e.y + e.radius * 2 + 0.5, e.z);
    }

    // Remove old HP bars
    for (const [id, sprite] of this._enemyHpBars) {
      if (!active.has(id)) {
        this._scene.remove(sprite);
        sprite.material.dispose();
        this._enemyHpBars.delete(id);
      }
    }
  }

  // ---- Enemy Name Labels ----

  private _updateEnemyNameLabels(state: DepthsState): void {
    const active = new Set<number>();
    const p = state.player;

    for (const e of state.enemies) {
      if (!e.alive) continue;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dz = p.z - e.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      // Show name when within 15m
      if (dist > 15) continue;
      active.add(e.id);

      let label = this._enemyNameLabels.get(e.id);
      if (!label) {
        const enemyDef = DEPTHS.ENEMY_TYPES[e.type] ?? DEPTHS.BOSSES[e.type];
        const baseName = enemyDef?.name ?? e.type;
        const name = e.isElite ? `[${e.eliteModifier}] ${baseName}` : baseName;
        const canvas = document.createElement("canvas");
        canvas.width = e.isElite ? 192 : 128;
        canvas.height = 24;
        const ctx = canvas.getContext("2d")!;
        ctx.font = `bold ${e.isBoss ? 14 : 11}px monospace`;
        ctx.fillStyle = e.isBoss ? "#ff88ff" : e.isElite ? "#ffaa44" : "#88bbcc";
        ctx.textAlign = "center";
        ctx.fillText(name, e.isElite ? 96 : 64, 16);
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0.8 });
        label = new THREE.Sprite(mat);
        label.scale.set(e.isBoss ? 3 : 2, e.isBoss ? 0.5 : 0.35, 1);
        this._scene.add(label);
        this._enemyNameLabels.set(e.id, label);
      }

      // Position above enemy (above HP bar)
      label.position.set(e.x, e.y + e.radius * 2 + 1.0, e.z);
      // Fade with distance
      (label.material as THREE.SpriteMaterial).opacity = Math.max(0.3, 1 - dist / 15);
    }

    // Remove labels for enemies no longer nearby
    for (const [id, label] of this._enemyNameLabels) {
      if (!active.has(id)) {
        this._scene.remove(label);
        label.material.dispose();
        this._enemyNameLabels.delete(id);
      }
    }
  }

  // ---- Harpoons ----

  private _updateHarpoons(state: DepthsState): void {
    const alive = new Set<number>();

    for (const h of state.harpoons) {
      if (!h.alive) continue;
      alive.add(h.id);

      let mesh = this._harpoonMeshes.get(h.id);
      if (!mesh) {
        // Harpoon: pointed shaft with barbed tip + glow trail
        const harpGroup = new THREE.Group();
        const shaftMat = new THREE.MeshStandardMaterial({
          color: 0xaaddff, emissive: 0x4488cc, emissiveIntensity: 1.5, metalness: 0.8, roughness: 0.2,
        });
        // Shaft
        const shaft = new THREE.Mesh(this._cylinderGeo, shaftMat);
        shaft.scale.set(0.04, 1.2, 0.04);
        harpGroup.add(shaft);
        // Pointed tip
        const tipGeo = new THREE.ConeGeometry(0.06, 0.25, 12);
        const tip = new THREE.Mesh(tipGeo, shaftMat);
        tip.position.y = 0.7;
        harpGroup.add(tip);
        // Barbs
        const barbMat = new THREE.MeshStandardMaterial({ color: 0x88bbdd, metalness: 0.7 });
        for (const side of [-1, 1]) {
          const barb = new THREE.Mesh(tipGeo, barbMat);
          barb.scale.set(0.4, 0.5, 0.4);
          barb.position.set(side * 0.05, 0.5, 0);
          barb.rotation.z = side * 0.6;
          harpGroup.add(barb);
        }
        // Trail light
        const gl = new THREE.PointLight(0x4488cc, 0.8, 5);
        gl.position.y = -0.3;
        harpGroup.add(gl);

        mesh = harpGroup;
        this._scene.add(harpGroup);
        this._harpoonMeshes.set(h.id, mesh);
      }

      mesh!.position.set(h.x, h.y, h.z);
      mesh!.lookAt(h.x + h.vx, h.y + h.vy, h.z + h.vz);
      mesh!.rotateX(Math.PI / 2);
    }

    for (const [id, mesh] of this._harpoonMeshes) {
      if (!alive.has(id)) {
        this._scene.remove(mesh);
        this._harpoonMeshes.delete(id);
      }
    }
  }

  // ---- Air bubbles ----

  private _updateAirBubbles(state: DepthsState): void {
    const alive = new Set<number>();

    for (const b of state.airBubbles) {
      if (!b.alive) continue;
      alive.add(b.id);

      let mesh = this._airBubbleMeshes.get(b.id);
      if (!mesh) {
        const mat = new THREE.MeshStandardMaterial({
          color: 0x88eeff, transparent: true, opacity: 0.4,
          metalness: 0.1, roughness: 0.1, emissive: 0x44aacc, emissiveIntensity: 0.5,
        });
        mesh = new THREE.Mesh(this._sphereGeo, mat);
        mesh.scale.set(DEPTHS.AIR_BUBBLE_RADIUS, DEPTHS.AIR_BUBBLE_RADIUS, DEPTHS.AIR_BUBBLE_RADIUS);
        this._scene.add(mesh);
        this._airBubbleMeshes.set(b.id, mesh);
      }

      mesh.position.set(b.x, b.y, b.z);
      const pulse = 1 + Math.sin(this._time * 3 + b.id) * 0.1;
      mesh.scale.setScalar(DEPTHS.AIR_BUBBLE_RADIUS * pulse);
    }

    for (const [id, mesh] of this._airBubbleMeshes) {
      if (!alive.has(id)) {
        this._scene.remove(mesh);
        this._airBubbleMeshes.delete(id);
      }
    }
  }

  // ---- Treasures ----

  private _updateTreasures(state: DepthsState): void {
    for (const t of state.treasures) {
      if (t.collected) {
        const g = this._treasureMeshes.get(t.id);
        if (g) { this._scene.remove(g); this._treasureMeshes.delete(t.id); }
        continue;
      }

      let group = this._treasureMeshes.get(t.id);
      if (!group) {
        group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({
          color: t.color, emissive: t.color, emissiveIntensity: 0.8, metalness: 0.7, roughness: 0.3,
        });
        const gem = new THREE.Mesh(this._sphereGeo, mat);
        gem.scale.set(0.3, 0.3, 0.3);
        group.add(gem);
        const gl = new THREE.PointLight(t.color, 0.6, 5);
        group.add(gl);
        this._scene.add(group);
        this._treasureMeshes.set(t.id, group);
      }

      group.position.set(t.x, t.y + Math.sin(t.bobPhase) * 0.3, t.z);
      group.rotation.y = this._time * 1.5;
    }
  }

  // ---- Particles ----

  private _updateParticles(state: DepthsState): void {
    const particles = state.particles;
    const maxP = DEPTHS.PARTICLE_LIMIT;
    const count = Math.min(particles.length, maxP);

    for (let i = 0; i < maxP; i++) {
      if (i < count) {
        const p = particles[i];
        this._particlePositions[i * 3] = p.x;
        this._particlePositions[i * 3 + 1] = p.y;
        this._particlePositions[i * 3 + 2] = p.z;
        this._tmpColor.setHex(p.color);
        const alpha = p.life / p.maxLife;
        this._particleColors[i * 3] = this._tmpColor.r * alpha;
        this._particleColors[i * 3 + 1] = this._tmpColor.g * alpha;
        this._particleColors[i * 3 + 2] = this._tmpColor.b * alpha;
        this._particleSizes[i] = p.size * 10 * alpha;
      } else {
        this._particleSizes[i] = 0;
      }
    }

    this._particleGeo.attributes.position.needsUpdate = true;
    this._particleGeo.attributes.color.needsUpdate = true;
    this._particleGeo.attributes.size.needsUpdate = true;
    this._particleGeo.setDrawRange(0, count);
  }

  // ---- Damage Numbers ----

  private _updateDamageNumbers(state: DepthsState): void {
    const needed = state.damageNumbers.length;

    // Grow pool if needed
    while (this._dmgSprites.length < needed) {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 32;
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(1.5, 0.75, 1);
      this._dmgSprites.push(sprite);
    }

    // Update active sprites
    for (let i = 0; i < needed; i++) {
      const dn = state.damageNumbers[i];
      const sprite = this._dmgSprites[i];
      const tex = (sprite.material as THREE.SpriteMaterial).map as THREE.CanvasTexture;
      const canvas = tex.image as HTMLCanvasElement;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 64, 32);
      ctx.font = "bold 24px monospace";
      ctx.fillStyle = dn.color === 0xff4444 ? "#ff4444" : "#ffcc00";
      ctx.textAlign = "center";
      ctx.fillText(String(dn.value), 32, 24);
      tex.needsUpdate = true;
      (sprite.material as THREE.SpriteMaterial).opacity = dn.life;
      sprite.position.set(dn.x, dn.y, dn.z);
      if (!sprite.parent) this._scene.add(sprite);
      sprite.visible = true;
    }

    // Hide excess sprites
    for (let i = needed; i < this._dmgSprites.length; i++) {
      if (this._dmgSprites[i].visible) {
        this._dmgSprites[i].visible = false;
      }
    }
  }

  // ---- Fish Schools ----

  private _updateFishSchools(state: DepthsState): void {
    // Remove excess schools
    while (this._fishSchoolMeshes.length > state.fishSchools.length) {
      const old = this._fishSchoolMeshes.pop()!;
      this._scene.remove(old);
      old.geometry.dispose();
      (old.material as THREE.Material).dispose();
    }
    // Lazy create instanced meshes
    while (this._fishSchoolMeshes.length < state.fishSchools.length) {
      const fishColors = [0xff8844, 0xffcc44, 0x44aadd, 0x88ccaa, 0xddaa66];
      const color = fishColors[this._fishSchoolMeshes.length % fishColors.length];
      const mat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.2, roughness: 0.7,
      });
      // Fish body — elongated ellipsoid with tail
      const fishGeo = new THREE.BufferGeometry();
      // Simple fish shape: body (tapered ellipsoid) + tail fin
      const fishVerts = new Float32Array([
        // Body (6 triangles — diamond cross-section)
        0, 0, 0.15,    0.04, 0.02, 0,    0, 0.04, 0,    // top-right
        0, 0, 0.15,    0, 0.04, 0,       -0.04, 0.02, 0,  // top-left
        0, 0, 0.15,    -0.04, -0.02, 0,  0, -0.04, 0,   // bottom-left
        0, 0, 0.15,    0, -0.04, 0,      0.04, -0.02, 0, // bottom-right
        // Rear body to tail
        0.04, 0, 0,    0, 0.02, -0.12,   -0.04, 0, 0,   // rear-top
        -0.04, 0, 0,   0, -0.02, -0.12,  0.04, 0, 0,    // rear-bottom
        // Tail fin (triangle)
        0, 0.02, -0.12,  0, 0.05, -0.2,  0, -0.05, -0.2,
        0, -0.02, -0.12, 0, 0.05, -0.2,  0, -0.05, -0.2,
      ]);
      fishGeo.setAttribute("position", new THREE.BufferAttribute(fishVerts, 3));
      fishGeo.computeVertexNormals();
      const im = new THREE.InstancedMesh(fishGeo, mat, DEPTHS.FISH_PER_SCHOOL);
      this._scene.add(im);
      this._fishSchoolMeshes.push(im);
    }

    const dummy = new THREE.Object3D();

    for (let s = 0; s < state.fishSchools.length; s++) {
      const school = state.fishSchools[s];
      const im = this._fishSchoolMeshes[s];

      for (let f = 0; f < school.fish.length; f++) {
        const fish = school.fish[f];
        dummy.position.set(
          school.cx + fish.ox,
          school.cy + fish.oy,
          school.cz + fish.oz,
        );
        // Face swim direction
        dummy.rotation.y = school.dirAngle + Math.PI;
        // Tail wiggle
        dummy.rotation.z = Math.sin(fish.phase * 2) * 0.3;
        dummy.updateMatrix();
        im.setMatrixAt(f, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    }
  }

  // ---- Drops ----

  private _updateDrops(state: DepthsState): void {
    const alive = new Set<number>();

    for (const d of state.drops) {
      if (d.life <= 0) continue;
      alive.add(d.id);

      let mesh = this._dropMeshes.get(d.id);
      if (!mesh) {
        const color = d.type === "hp" ? 0x44ff66 : 0x44aaff;
        const mat = new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity: 1.2,
          transparent: true, opacity: 0.8,
        });
        if (d.type === "hp") {
          // Cross shape for HP
          const g = new THREE.Group();
          const bar1 = new THREE.Mesh(this._boxGeo, mat);
          bar1.scale.set(0.35, 0.1, 0.1);
          g.add(bar1);
          const bar2 = new THREE.Mesh(this._boxGeo, mat);
          bar2.scale.set(0.1, 0.35, 0.1);
          g.add(bar2);
          // Wrap as single mesh for the map (use first child)
          mesh = bar1;
          this._scene.add(g);
          (mesh as any)._dropGroup = g;
        } else {
          // Bubble shape for O2
          mesh = new THREE.Mesh(this._sphereGeo, mat);
          mesh.scale.set(0.3, 0.3, 0.3);
          this._scene.add(mesh);
        }
        this._dropMeshes.set(d.id, mesh);
      }

      const target = (mesh as any)._dropGroup || mesh;
      target.position.set(d.x, d.y + Math.sin(d.bobPhase) * 0.2, d.z);
      target.rotation.y = this._time * 2;
      // Fade out when about to expire
      const dropMat = mesh.material as THREE.MeshStandardMaterial;
      dropMat.opacity = d.life < 3 ? d.life / 3 : 0.8;
    }

    for (const [id, mesh] of this._dropMeshes) {
      if (!alive.has(id)) {
        const grp = (mesh as any)._dropGroup;
        if (grp) this._scene.remove(grp);
        else this._scene.remove(mesh);
        this._dropMeshes.delete(id);
      }
    }
  }

  // ---- Jellyfish ----

  private _updateJellyfish(state: DepthsState): void {
    while (this._jellyfishMeshes.length < state.jellyfish.length) {
      const group = new THREE.Group();

      // Bell (dome)
      const bellMat = new THREE.MeshStandardMaterial({
        color: 0x88ccff, emissive: 0x4488cc, emissiveIntensity: 0.6,
        transparent: true, opacity: 0.6, side: THREE.DoubleSide,
      });
      const bellGeo = new THREE.SphereGeometry(0.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      const bell = new THREE.Mesh(bellGeo, bellMat);
      group.add(bell);

      // Tentacles
      const tentMat = new THREE.MeshStandardMaterial({
        color: 0x66aadd, emissive: 0x3366aa, emissiveIntensity: 0.4,
        transparent: true, opacity: 0.4,
      });
      for (let i = 0; i < 6; i++) {
        const t = new THREE.Mesh(this._cylinderGeo, tentMat);
        t.scale.set(0.03, 0.8 + Math.random() * 0.5, 0.03);
        const a = (i / 6) * Math.PI * 2;
        t.position.set(Math.cos(a) * 0.25, -0.5, Math.sin(a) * 0.25);
        group.add(t);
      }

      // Glow
      const gl = new THREE.PointLight(0x44aadd, 0.4, 4);
      group.add(gl);

      this._scene.add(group);
      this._jellyfishMeshes.push(group);
    }

    for (let i = 0; i < state.jellyfish.length; i++) {
      const jf = state.jellyfish[i];
      const group = this._jellyfishMeshes[i];
      group.position.set(jf.x, jf.y, jf.z);

      // Pulse animation
      const pulse = 1 + Math.sin(jf.pulsePhase * DEPTHS.JELLYFISH_PULSE_SPEED) * 0.2;
      group.scale.set(pulse, 1 / pulse, pulse);

      // Shock glow
      if (jf.shockCooldown > DEPTHS.JELLYFISH_SHOCK_COOLDOWN - 0.3) {
        group.traverse(c => {
          if ((c as THREE.Mesh).isMesh) {
            const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (m.emissiveIntensity !== undefined) m.emissiveIntensity = 3;
          }
        });
      }
    }
  }

  // ---- Excalibur shrine ----

  private _updateExcalibur(state: DepthsState): void {
    const ex = state.excalibur;
    if (ex.retrieved) {
      if (this._excaliburGroup) {
        this._scene.remove(this._excaliburGroup);
        this._excaliburGroup = null;
      }
      return;
    }

    // Only show after Lady of the Lake is defeated
    if (!state.bossesDefeated.has("lady_of_the_lake")) {
      if (this._excaliburGroup) this._excaliburGroup.visible = false;
      return;
    }

    if (!this._excaliburGroup) {
      this._excaliburGroup = new THREE.Group();

      // Sword blade
      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xffdd88, emissiveIntensity: 2.0,
        metalness: 0.9, roughness: 0.1,
      });
      const blade = new THREE.Mesh(this._boxGeo, bladeMat);
      blade.scale.set(0.1, 3, 0.25);
      blade.position.y = 1.5;
      this._excaliburGroup.add(blade);

      // Cross guard
      const guardMat = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa22, emissiveIntensity: 1.5 });
      const guard = new THREE.Mesh(this._boxGeo, guardMat);
      guard.scale.set(0.8, 0.1, 0.15);
      this._excaliburGroup.add(guard);

      // Handle
      const hilt = new THREE.Mesh(this._cylinderGeo, new THREE.MeshStandardMaterial({ color: 0x664422 }));
      hilt.scale.set(0.08, 0.6, 0.08);
      hilt.position.y = -0.3;
      this._excaliburGroup.add(hilt);

      // Massive glow
      const gl1 = new THREE.PointLight(0xffdd88, 3, 20);
      gl1.position.y = 1.5;
      this._excaliburGroup.add(gl1);
      const gl2 = new THREE.PointLight(0xffffff, 2, 30);
      gl2.position.y = 1;
      this._excaliburGroup.add(gl2);

      // Stone pedestal
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x556666, roughness: 0.9 });
      const stone = new THREE.Mesh(this._boxGeo, stoneMat);
      stone.scale.set(2, 1, 2);
      stone.position.y = -0.5;
      this._excaliburGroup.add(stone);

      // Light pillar — tall glowing beam rising from the sword
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0xffdd88, emissive: 0xffcc44, emissiveIntensity: 1.5,
        transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false,
      });
      const pillar = new THREE.Mesh(this._cylinderGeo, pillarMat);
      pillar.scale.set(1.5, 40, 1.5);
      pillar.position.y = 20;
      this._excaliburGroup.add(pillar);

      // Second narrower brighter pillar
      const pillar2Mat = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xffeecc, emissiveIntensity: 2.0,
        transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false,
      });
      const pillar2 = new THREE.Mesh(this._cylinderGeo, pillar2Mat);
      pillar2.scale.set(0.6, 50, 0.6);
      pillar2.position.y = 25;
      this._excaliburGroup.add(pillar2);

      this._scene.add(this._excaliburGroup);
    }

    this._excaliburGroup.visible = true;
    this._excaliburGroup.position.set(ex.x, ex.y, ex.z);
    // Gentle rotation
    this._excaliburGroup.children[0].rotation.y = Math.sin(this._time * 0.5) * 0.1;
  }

  // ---- Enemy attack telegraphs ----

  private _updateEnemyTelegraphs(state: DepthsState): void {
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const group = this._enemyMeshes.get(e.id);
      if (!group) continue;

      if (e.telegraphTimer > 0) {
        // Flash bright red during wind-up
        const flash = Math.sin(this._time * 20) > 0;
        group.traverse(c => {
          if ((c as THREE.Mesh).isMesh) {
            const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (m.emissive) m.emissive.setHex(flash ? 0xff2222 : e.glow);
            if (m.emissiveIntensity !== undefined) m.emissiveIntensity = flash ? 4.0 : 0.5;
          }
        });
        // Scale up slightly during wind-up
        const s = e.radius * 1.5 * (1 + (1 - e.telegraphTimer / DEPTHS.TELEGRAPH_DURATION) * 0.15);
        group.scale.set(s, s, s);
      }
    }
  }

  // ---- Siren Projectiles ----

  private _updateSirenProjectiles(state: DepthsState): void {
    const alive = new Set<number>();

    for (const proj of state.sirenProjectiles) {
      if (!proj.alive) continue;
      alive.add(proj.id);

      let mesh = this._sirenProjMeshes.get(proj.id);
      if (!mesh) {
        // Siren projectile — spiky magical orb (octahedron) with glow ring
        const projGroup = new THREE.Group();
        const coreMat = new THREE.MeshStandardMaterial({
          color: 0xbb66dd, emissive: 0xaa44cc, emissiveIntensity: 3.0,
          transparent: true, opacity: 0.9,
        });
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), coreMat);
        projGroup.add(core);
        // Spinning ring
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0xdd88ff, emissive: 0xcc66ee, emissiveIntensity: 2.0,
          transparent: true, opacity: 0.6, side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 10, 12), ringMat);
        projGroup.add(ring);
        // Glow
        const gl = new THREE.PointLight(0xaa44cc, 0.6, 4);
        projGroup.add(gl);

        mesh = projGroup;
        this._scene.add(projGroup);
        this._sirenProjMeshes.set(proj.id, mesh);
      }
      // Position and spin
      mesh!.position.set(proj.x, proj.y, proj.z);
      // Spiral rotation
      const ch = mesh!.children;
      if (ch[1]) { ch[1].rotation.x = this._time * 8 + proj.id; ch[1].rotation.y = this._time * 6; }
      if (ch[0]) ch[0].rotation.y = this._time * 4;
    }

    for (const [id, mesh] of this._sirenProjMeshes) {
      if (!alive.has(id)) {
        this._scene.remove(mesh);
        this._sirenProjMeshes.delete(id);
      }
    }
  }

  // ---- Whirlpools ----

  private _updateWhirlpools(state: DepthsState): void {
    // Remove excess whirlpools
    while (this._whirlpoolMeshes.length > state.whirlpools.length) {
      const old = this._whirlpoolMeshes.pop()!;
      this._scene.remove(old);
      old.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        if (child.dispose) child.dispose();
      });
    }
    // Lazy create
    while (this._whirlpoolMeshes.length < state.whirlpools.length) {
      const group = new THREE.Group();

      // Multiple concentric spiral rings for vortex effect
      for (let r = 0; r < 4; r++) {
        const radius = 1 + r * 1.2;
        const tubeRadius = 0.08 + r * 0.04;
        const ringGeo = new THREE.TorusGeometry(radius, tubeRadius, 12, 32);
        const opacity = 0.5 - r * 0.1;
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0x3355aa, emissive: 0x2244aa, emissiveIntensity: 0.6 + r * 0.2,
          transparent: true, opacity, side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -r * 0.4; // descending funnel shape
        ring.userData.ringIndex = r;
        group.add(ring);
      }

      // Bright core
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x1133aa, emissive: 0x4488ff, emissiveIntensity: 2.0,
        transparent: true, opacity: 0.7,
      });
      const core = new THREE.Mesh(this._sphereGeo, coreMat);
      core.scale.set(0.6, 0.3, 0.6);
      core.position.y = -1.5;
      group.add(core);

      // Danger light
      const light = new THREE.PointLight(0x4466ff, 1.0, 15);
      light.position.y = -0.5;
      group.add(light);

      this._scene.add(group);
      this._whirlpoolMeshes.push(group);
    }

    for (let i = 0; i < state.whirlpools.length; i++) {
      const w = state.whirlpools[i];
      const group = this._whirlpoolMeshes[i];
      group.position.set(w.x, w.y, w.z);

      const s = w.radius / DEPTHS.WHIRLPOOL_RADIUS;
      group.scale.set(s, s, s);

      // Animate each ring rotating at different speeds (spiral effect)
      for (const child of group.children) {
        if (child.userData.ringIndex !== undefined) {
          const r = child.userData.ringIndex as number;
          child.rotation.z = w.phase * (1.5 + r * 0.5); // outer rings rotate faster
          child.position.y = -r * 0.4 + Math.sin(this._time * 2 + r) * 0.1; // bob
        }
      }
    }
  }

  // ---- Relics ----

  private _updateRelics(state: DepthsState): void {
    for (const r of state.relics) {
      if (r.collected) {
        const g = this._relicMeshes.get(r.id);
        if (g) { this._scene.remove(g); this._relicMeshes.delete(r.id); }
        continue;
      }

      let group = this._relicMeshes.get(r.id);
      if (!group) {
        group = new THREE.Group();
        const def = DEPTHS.RELICS[r.key];
        const color = def ? def.color : 0xffffff;
        const rarity = def ? def.rarity : "common";

        // Diamond shape
        const gemGeo = new THREE.OctahedronGeometry(0.4, 0);
        const emissiveIntensity = rarity === "legendary" ? 2.0 : rarity === "rare" ? 1.2 : 0.6;
        const gemMat = new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity,
          metalness: 0.8, roughness: 0.2,
        });
        const gem = new THREE.Mesh(gemGeo, gemMat);
        group.add(gem);

        // Glow light
        const gl = new THREE.PointLight(color, rarity === "legendary" ? 1.5 : 0.8, rarity === "legendary" ? 10 : 6);
        group.add(gl);

        // Outer ring for legendary
        if (rarity === "legendary") {
          const ringGeo = new THREE.TorusGeometry(0.7, 0.04, 12, 16);
          const ringMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI / 2;
          group.add(ring);
        }

        this._scene.add(group);
        this._relicMeshes.set(r.id, group);
      }

      group.position.set(r.x, r.y + Math.sin(r.bobPhase) * 0.4, r.z);
      group.rotation.y = this._time * 2;
      group.rotation.x = Math.sin(this._time * 0.7) * 0.2;
    }
  }

  // ---- Cleanup ----

  cleanup(): void {
    if (this._canvas.parentElement) this._canvas.parentElement.removeChild(this._canvas);

    for (const [, g] of this._enemyMeshes) this._scene.remove(g);
    this._enemyMeshes.clear();
    for (const [, s] of this._enemyHpBars) { this._scene.remove(s); s.material.dispose(); }
    this._enemyHpBars.clear();
    for (const [, s] of this._enemyNameLabels) { this._scene.remove(s); s.material.dispose(); }
    this._enemyNameLabels.clear();
    for (const [, m] of this._airBubbleMeshes) this._scene.remove(m);
    this._airBubbleMeshes.clear();
    for (const [, g] of this._treasureMeshes) this._scene.remove(g);
    this._treasureMeshes.clear();
    for (const [, m] of this._harpoonMeshes) this._scene.remove(m);
    this._harpoonMeshes.clear();
    for (const [, m] of this._sirenProjMeshes) this._scene.remove(m);
    this._sirenProjMeshes.clear();
    for (const g of this._whirlpoolMeshes) this._scene.remove(g);
    this._whirlpoolMeshes = [];
    for (const [, g] of this._relicMeshes) this._scene.remove(g);
    this._relicMeshes.clear();
    for (const [, m] of this._dropMeshes) {
      const grp = (m as any)._dropGroup;
      if (grp) this._scene.remove(grp);
      else this._scene.remove(m);
    }
    this._dropMeshes.clear();
    for (const g of this._jellyfishMeshes) this._scene.remove(g);
    this._jellyfishMeshes = [];
    for (const im of this._fishSchoolMeshes) { this._scene.remove(im); im.geometry.dispose(); }
    this._fishSchoolMeshes = [];
    if (this._excaliburGroup) { this._scene.remove(this._excaliburGroup); this._excaliburGroup = null; }
    for (const d of this._debrisMeshes) { this._scene.remove(d); d.geometry.dispose(); }
    this._debrisMeshes = [];
    for (const g of this._propGroups) this._scene.remove(g);
    this._propGroups = [];
    this._kelpGroups = [];
    for (const s of this._dmgSprites) { this._scene.remove(s); s.material.dispose(); }
    this._dmgSprites = [];
    for (const m of this._godRays) this._scene.remove(m);
    this._godRays = [];
    this._godRayMats = [];

    // Dispose all remaining Three.js resources before clearing
    this._scene.traverse((obj) => {
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) {
        const mat = (obj as any).material;
        if (Array.isArray(mat)) {
          for (const m of mat) { if (m.map) m.map.dispose(); m.dispose(); }
        } else {
          if (mat.map) mat.map.dispose();
          mat.dispose();
        }
      }
    });
    this._scene.clear();
    if (this._renderTarget) this._renderTarget.dispose();
    if (this._postMaterial) this._postMaterial.dispose();
    this._renderer.dispose();
  }
}
