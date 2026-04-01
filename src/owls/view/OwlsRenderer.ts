// ---------------------------------------------------------------------------
// Owls: Night Hunter — Three.js 3D renderer
// Enchanted moonlit forest with volumetric atmosphere
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { OWL } from "../config/OwlsConfig";
import type { OwlsState, Tree, Prey } from "../state/OwlsState";

// ---- Enchanted Night Palette ----
const COL = {
  SKY_TOP: 0x040318,
  SKY_HORIZON: 0x12082a,
  MOON: 0xeef0ff,
  MOON_GLOW: 0x7777bb,
  STAR: 0xffffff,
  AURORA_GREEN: 0x22ff88,
  AURORA_BLUE: 0x4488ff,
  GROUND: 0x0c1a0c,
  GROUND_CLEARING: 0x142814,
  FOG: 0x1a2030,
  TREE_OAK_TRUNK: 0x2a1a0c,
  TREE_PINE_TRUNK: 0x1a1208,
  TREE_BIRCH_TRUNK: 0xbbbbaa,
  CANOPY_OAK: 0x0c2a14,
  CANOPY_PINE: 0x082010,
  CANOPY_BIRCH: 0x1a3a20,
  MUSHROOM_GREEN: 0x22ffaa,
  MUSHROOM_BLUE: 0x4488ff,
  MUSHROOM_PURPLE: 0x8844ff,
  FIREFLY: 0xffee44,
  OWL_BODY: 0x7a6a5a,
  OWL_WING: 0x6a5a4a,
  OWL_WING_INNER: 0x8a7a6a,
  OWL_BELLY: 0xccbbaa,
  OWL_EYE: 0xffaa00,
  WATER: 0x0a1a2a,
  CATCH_FLASH: 0xffdd44,
  SCREECH_RING: 0x6688ff,
  ROCK: 0x3a3a3a,
  ROCK_MOSS: 0x2a3a2a,
};

// ---- Sky Shader ----
const SKY_VERT = `
varying vec3 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const SKY_FRAG = `
uniform vec3 topColor;
uniform vec3 botColor;
uniform float time;
varying vec3 vWorldPos;
void main() {
  float h = normalize(vWorldPos).y;
  float t = clamp(h * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(botColor, topColor, t);
  float horizonGlow = exp(-abs(h) * 8.0) * 0.15;
  col += vec3(0.15, 0.08, 0.25) * horizonGlow;
  gl_FragColor = vec4(col, 1.0);
}`;

// ---- Aurora Shader ----
const AURORA_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const AURORA_FRAG = `
uniform float time;
uniform vec3 color1;
uniform vec3 color2;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i); float b = hash(i + vec2(1,0));
  float c = hash(i + vec2(0,1)); float d = hash(i + vec2(1,1));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 uv = vUv;
  float n1 = noise(vec2(uv.x * 3.0 + time * 0.1, uv.y * 2.0 + time * 0.05));
  float n2 = noise(vec2(uv.x * 5.0 - time * 0.08, uv.y * 3.0 + time * 0.03));
  float band = sin(uv.x * 6.28 + n1 * 4.0) * 0.5 + 0.5;
  band *= smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);
  band *= (n2 * 0.5 + 0.5);
  vec3 col = mix(color1, color2, n1);
  float alpha = band * 0.35 * smoothstep(0.0, 0.15, band);
  gl_FragColor = vec4(col, alpha);
}`;

// ---- Ground Fog Shader ----
const FOG_VERT = `
varying vec2 vUv;
varying float vDist;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const FOG_FRAG = `
uniform float time;
uniform float fogDensity;
varying vec2 vUv;
varying float vDist;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i); float b = hash(i + vec2(1,0));
  float c = hash(i + vec2(0,1)); float d = hash(i + vec2(1,1));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 uv = vUv * 8.0;
  float n = noise(uv + time * 0.02) * 0.5 + noise(uv * 2.0 - time * 0.03) * 0.3 + noise(uv * 4.0 + time * 0.01) * 0.2;
  float alpha = n * fogDensity * smoothstep(250.0, 20.0, vDist);
  gl_FragColor = vec4(0.12, 0.15, 0.22, alpha * 0.6);
}`;

// ---- Ground Shader (noise-based forest floor) ----
const GROUND_VERT = `
varying vec2 vUv;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const GROUND_FRAG = `
uniform float time;
varying vec2 vUv;
varying vec3 vWorldPos;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p); vec2 f=fract(p);
  float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
}

void main() {
  vec2 wp = vWorldPos.xz;
  float dist = length(wp);
  float n1 = noise(wp*0.05);
  float n2 = noise(wp*0.15+42.0);
  float n3 = noise(wp*0.4+17.0);
  float n4 = noise(wp*1.2+7.0);
  float detail = n1*0.45 + n2*0.3 + n3*0.15 + n4*0.1;

  // Forest floor palette
  vec3 darkGreen = vec3(0.03, 0.07, 0.03);
  vec3 moss      = vec3(0.05, 0.11, 0.04);
  vec3 dirt      = vec3(0.07, 0.05, 0.03);
  vec3 deadLeaf  = vec3(0.09, 0.06, 0.02);
  vec3 wetEarth  = vec3(0.04, 0.04, 0.03);

  vec3 col = mix(darkGreen, moss, smoothstep(0.3, 0.65, detail));
  col = mix(col, dirt, smoothstep(0.55, 0.85, n2) * 0.6);
  col = mix(col, deadLeaf, smoothstep(0.7, 0.95, n3) * 0.35);
  col = mix(col, wetEarth, smoothstep(0.8, 0.98, n4) * 0.3);

  // Clearing: brighter, grassier center
  float clearFade = smoothstep(42.0, 20.0, dist);
  col = mix(col, vec3(0.07, 0.13, 0.05), clearFade * 0.7);

  // Subtle radial paths through forest
  float angle = atan(wp.y, wp.x);
  float pathN = noise(vec2(angle*2.5, dist*0.015));
  float onPath = smoothstep(0.62, 0.68, pathN) * smoothstep(200.0, 35.0, dist) * smoothstep(20.0, 40.0, dist);
  col = mix(col, vec3(0.04, 0.035, 0.025), onPath * 0.5);

  // Edge darkening
  col *= 1.0 - smoothstep(230.0, 280.0, dist) * 0.6;

  // Micro-variation (fine grain)
  col *= 0.9 + 0.1 * noise(wp * 3.0);

  gl_FragColor = vec4(col, 1.0);
}`;

// ---- Water Shader (animated ripples, moon reflection) ----
const WATER_VERT = `
varying vec2 vUv;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const WATER_FRAG = `
uniform float time;
varying vec2 vUv;
varying vec3 vWorldPos;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p); vec2 f=fract(p);
  float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
}

void main() {
  vec2 wp = vWorldPos.xz;

  // Layered animated ripples
  float r1 = noise(wp * 0.25 + vec2(time * 0.4, time * 0.15));
  float r2 = noise(wp * 0.6 + vec2(-time * 0.25, time * 0.35) + 42.0);
  float r3 = noise(wp * 1.5 + vec2(time * 0.1, -time * 0.2) + 99.0);
  float ripple = r1 * 0.5 + r2 * 0.35 + r3 * 0.15;

  // Deep water with dark blue-green palette
  vec3 deep    = vec3(0.015, 0.04, 0.08);
  vec3 shallow = vec3(0.03, 0.08, 0.14);
  vec3 col = mix(deep, shallow, ripple);

  // Moon reflection (elongated specular)
  vec2 moonPos = vec2(80.0, 60.0);
  float moonDist = length(wp - moonPos);
  float moonSpec = exp(-moonDist * 0.015) * 0.5;
  // Shimmer the reflection
  moonSpec *= 0.6 + 0.4 * sin(time * 2.5 + wp.x * 0.4 + wp.y * 0.3);
  moonSpec *= (0.7 + 0.3 * ripple);
  col += vec3(0.25, 0.25, 0.35) * moonSpec;

  // Bright ripple highlights (sparkle on peaks)
  float sparkle = pow(max(0.0, ripple - 0.6) * 2.5, 2.0);
  col += vec3(0.12, 0.14, 0.20) * sparkle;

  // Flow lines
  float flow = noise(vec2(wp.x * 0.1, wp.y * 0.02 + time * 0.8));
  col += vec3(0.02, 0.03, 0.05) * smoothstep(0.55, 0.7, flow);

  gl_FragColor = vec4(col, 0.8);
}`;

// ---- Cloud Shader ----
const CLOUD_FRAG = `
uniform float time;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p); vec2 f=fract(p);
  float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
}

void main() {
  vec2 uv = vUv;
  float n = noise(uv * 3.0 + time * 0.02) * 0.5
          + noise(uv * 6.0 - time * 0.015) * 0.3
          + noise(uv * 12.0 + time * 0.01) * 0.2;
  float alpha = smoothstep(0.35, 0.6, n) * 0.18;
  alpha *= smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
  alpha *= smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);
  gl_FragColor = vec4(0.08, 0.08, 0.14, alpha);
}`;

export class OwlsRenderer {
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _canvas!: HTMLCanvasElement;

  // Lighting
  private _ambientLight!: THREE.AmbientLight;
  private _moonLight!: THREE.DirectionalLight;
  private _hemiLight!: THREE.HemisphereLight;
  private _owlEyeLight!: THREE.SpotLight;

  // Sky
  private _skyDome!: THREE.Mesh;
  private _starPoints!: THREE.Points;
  private _starBaseSizes!: Float32Array;
  private _moonMesh!: THREE.Mesh;
  private _moonGlow!: THREE.Mesh;
  private _auroraMesh!: THREE.Mesh;
  private _auroraUniforms!: { time: THREE.IUniform; color1: THREE.IUniform; color2: THREE.IUniform };

  // Ground
  private _groundMesh!: THREE.Mesh;
  private _fogPlane!: THREE.Mesh;
  private _fogUniforms!: { time: THREE.IUniform; fogDensity: THREE.IUniform };
  private _waterMesh!: THREE.Mesh;

  // Trees (instanced)
  private _trunkMeshOak!: THREE.InstancedMesh;
  private _trunkMeshPine!: THREE.InstancedMesh;
  private _trunkMeshBirch!: THREE.InstancedMesh;
  private _canopyMeshOak!: THREE.InstancedMesh;
  private _canopyMeshPine!: THREE.InstancedMesh;
  private _canopyMeshBirch!: THREE.InstancedMesh;

  // Rocks (instanced)
  private _rockMesh!: THREE.InstancedMesh;

  // Mushrooms (instanced)
  private _mushroomMesh!: THREE.InstancedMesh;
  private _mushroomCapMesh!: THREE.InstancedMesh;

  // Fireflies
  private _fireflyPoints!: THREE.Points;

  // Ambient leaves (instanced)
  private _leafMesh!: THREE.InstancedMesh;

  // Owl model
  private _owlGroup!: THREE.Group;
  private _owlLeftWingInner!: THREE.Mesh;
  private _owlLeftWingOuter!: THREE.Mesh;
  private _owlRightWingInner!: THREE.Mesh;
  private _owlRightWingOuter!: THREE.Mesh;
  private _owlEyeMatL!: THREE.MeshStandardMaterial;
  private _owlEyeMatR!: THREE.MeshStandardMaterial;
  private _owlShadow!: THREE.Mesh;

  // Campfire
  private _campfireLight!: THREE.PointLight;
  private _campfireMesh!: THREE.Group;

  // Moonlight orbs (instanced)
  private _orbMesh!: THREE.InstancedMesh;
  private _orbGlowMesh!: THREE.InstancedMesh;

  // Alert pulse rings
  private _alertRings: { mesh: THREE.Mesh; life: number; maxLife: number }[] = [];

  // Dawn sky colors (lerp targets)
  private _nightSkyTop = new THREE.Color(COL.SKY_TOP);
  private _nightSkyBot = new THREE.Color(COL.SKY_HORIZON);
  private _dawnSkyTop = new THREE.Color(0x2a3050);
  private _dawnSkyBot = new THREE.Color(0x664422);

  // Prey meshes
  private _preyMeshes: Map<string, THREE.Group> = new Map();

  // Particles (instanced)
  private _particleMesh!: THREE.InstancedMesh;

  // Screech ring
  private _screechRing: THREE.Mesh | null = null;
  private _screechRingScale = 0;
  private _screechRingLife = 0;

  // Catch flash
  private _catchFlashLight: THREE.PointLight | null = null;
  private _catchFlashLife = 0;

  // Shooting star
  private _shootingStarLine: THREE.Line | null = null;

  // Camera smoothing
  private _camPos = new THREE.Vector3(0, 35, -10);
  private _camLook = new THREE.Vector3(0, 30, 0);

  // God rays from moon
  private _godRayMeshes: THREE.Mesh[] = [];

  // Torch posts
  private _torchLights: THREE.PointLight[] = [];
  private _torchMeshes: THREE.Group[] = [];

  // Additional fog layers
  private _fogPlane2!: THREE.Mesh;
  private _fogPlane3!: THREE.Mesh;
  private _fogUniforms2!: { time: THREE.IUniform; fogDensity: THREE.IUniform };
  private _fogUniforms3!: { time: THREE.IUniform; fogDensity: THREE.IUniform };

  // Firefly glow (second pass — larger, softer)
  private _fireflyGlowPoints!: THREE.Points;

  // Moon detail
  private _moonCraters: THREE.Mesh[] = [];
  private _moonHalo!: THREE.Mesh;

  // Second aurora
  private _aurora2Mesh!: THREE.Mesh;
  private _aurora2Uniforms!: { time: THREE.IUniform; color1: THREE.IUniform; color2: THREE.IUniform };

  // Grass tufts in clearing
  private _grassMesh!: THREE.InstancedMesh;

  // Fire particles (campfire)
  private _fireParticleMesh!: THREE.InstancedMesh;
  private _fireParticles: { x: number; y: number; z: number; vy: number; life: number; maxLife: number; size: number; heat: number }[] = [];

  // Cloud layer
  private _cloudMeshes: THREE.Mesh[] = [];

  // Mushroom glow lights
  private _mushroomLights: THREE.PointLight[] = [];

  // Ground uniforms
  private _groundUniforms!: { time: THREE.IUniform };

  // Water uniforms
  private _waterUniforms!: { time: THREE.IUniform };

  // Cloud uniforms
  private _cloudUniforms: { time: THREE.IUniform }[] = [];

  // Canopy sway data
  private _canopySwayPhases: Float32Array | null = null;

  // Track populated state
  private _populated = false;

  get canvas(): HTMLCanvasElement { return this._canvas; }

  // ==================================================================
  // INIT
  // ==================================================================
  init(sw: number, sh: number): void {
    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:5;";

    this._renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true, alpha: false });
    this._renderer.setSize(sw, sh);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 0.8;

    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(0x0a0e18, 0.004);

    this._camera = new THREE.PerspectiveCamera(OWL.CAMERA_FOV, sw / sh, 0.5, 500);
    this._camera.position.set(0, 35, -10);

    this._buildLighting();
    this._buildSky();
    this._buildGodRays();
    this._buildGround();
    this._buildWater();
    this._buildTrees();
    this._buildRocks();
    this._buildMushrooms();
    this._buildFireflies();
    this._buildLeaves();
    this._buildGrass();
    this._buildOwl();
    this._buildCampfire();
    this._buildTorches();
    this._buildClouds();
    this._buildOrbs();
    this._buildParticles();
    this._buildFireParticles();
    this._buildMushroomLights();
  }

  // ---- Lighting ----
  private _buildLighting(): void {
    this._ambientLight = new THREE.AmbientLight(0x1a1a3a, 0.4);
    this._scene.add(this._ambientLight);

    this._hemiLight = new THREE.HemisphereLight(0x2244aa, 0x0a1a0a, 0.3);
    this._scene.add(this._hemiLight);

    this._moonLight = new THREE.DirectionalLight(0x8888cc, 0.6);
    this._moonLight.position.set(80, 120, 60);
    this._moonLight.castShadow = true;
    this._moonLight.shadow.mapSize.set(2048, 2048);
    this._moonLight.shadow.camera.left = -100;
    this._moonLight.shadow.camera.right = 100;
    this._moonLight.shadow.camera.top = 100;
    this._moonLight.shadow.camera.bottom = -100;
    this._moonLight.shadow.camera.far = 300;
    this._moonLight.shadow.bias = -0.001;
    this._scene.add(this._moonLight);

    // Owl eye spotlight — forward-facing warm amber light
    this._owlEyeLight = new THREE.SpotLight(COL.OWL_EYE, 2, 40, Math.PI / 6, 0.5, 1.5);
    this._owlEyeLight.castShadow = false;
    this._scene.add(this._owlEyeLight);
    this._scene.add(this._owlEyeLight.target);
  }

  // ---- Sky ----
  private _buildSky(): void {
    const skyGeo = new THREE.SphereGeometry(400, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      uniforms: {
        topColor: { value: new THREE.Color(COL.SKY_TOP) },
        botColor: { value: new THREE.Color(COL.SKY_HORIZON) },
        time: { value: 0 },
      },
      side: THREE.BackSide, depthWrite: false,
    });
    this._skyDome = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(this._skyDome);

    // Stars
    const starCount = 2000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    this._starBaseSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.8 + 0.2);
      const r = 380;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const s = 1 + Math.random() * 3;
      starSizes[i] = s;
      this._starBaseSizes[i] = s;
    }
    // Star color variety
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const temp = Math.random();
      if (temp < 0.15) { // warm orange
        starColors[i*3] = 1; starColors[i*3+1] = 0.85; starColors[i*3+2] = 0.6;
      } else if (temp < 0.3) { // cool blue
        starColors[i*3] = 0.7; starColors[i*3+1] = 0.8; starColors[i*3+2] = 1;
      } else if (temp < 0.4) { // pale yellow
        starColors[i*3] = 1; starColors[i*3+1] = 1; starColors[i*3+2] = 0.8;
      } else { // white
        starColors[i*3] = 1; starColors[i*3+1] = 1; starColors[i*3+2] = 1;
      }
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 2, sizeAttenuation: false, vertexColors: true,
      transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending,
    });
    this._starPoints = new THREE.Points(starGeo, starMat);
    this._scene.add(this._starPoints);

    // Moon
    const moonGeo = new THREE.CircleGeometry(12, 32);
    const moonMat = new THREE.MeshBasicMaterial({ color: COL.MOON, side: THREE.DoubleSide });
    this._moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this._moonMesh.position.set(80, 120, 60);
    this._moonMesh.lookAt(0, 30, 0);
    this._scene.add(this._moonMesh);

    const glowGeo = new THREE.CircleGeometry(30, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: COL.MOON_GLOW, transparent: true, opacity: 0.15,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    this._moonGlow = new THREE.Mesh(glowGeo, glowMat);
    this._moonGlow.position.copy(this._moonMesh.position);
    this._moonGlow.lookAt(0, 30, 0);
    this._scene.add(this._moonGlow);

    // Aurora
    const auroraGeo = new THREE.PlaneGeometry(300, 60, 64, 8);
    this._auroraUniforms = {
      time: { value: 0 },
      color1: { value: new THREE.Color(COL.AURORA_GREEN) },
      color2: { value: new THREE.Color(COL.AURORA_BLUE) },
    };
    const auroraMat = new THREE.ShaderMaterial({
      vertexShader: AURORA_VERT, fragmentShader: AURORA_FRAG,
      uniforms: this._auroraUniforms,
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this._auroraMesh = new THREE.Mesh(auroraGeo, auroraMat);
    this._auroraMesh.position.set(0, 100, 150);
    this._auroraMesh.rotation.x = -0.3;
    this._scene.add(this._auroraMesh);

    // Second aurora band (pink/purple, different position)
    const aurora2Geo = new THREE.PlaneGeometry(250, 45, 48, 6);
    this._aurora2Uniforms = {
      time: { value: 0 },
      color1: { value: new THREE.Color(0xcc44aa) },
      color2: { value: new THREE.Color(0x6644cc) },
    };
    const aurora2Mat = new THREE.ShaderMaterial({
      vertexShader: AURORA_VERT, fragmentShader: AURORA_FRAG,
      uniforms: this._aurora2Uniforms,
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this._aurora2Mesh = new THREE.Mesh(aurora2Geo, aurora2Mat);
    this._aurora2Mesh.position.set(-120, 90, 100);
    this._aurora2Mesh.rotation.set(-0.2, 0.4, 0.1);
    this._scene.add(this._aurora2Mesh);

    // Moon crater detail (darker circles on the moon face)
    const craterData = [
      { x: -3, y: 2, r: 2.5 }, { x: 4, y: -1, r: 1.8 }, { x: -1, y: -3, r: 2 },
      { x: 2, y: 3, r: 1.5 }, { x: -4, y: -2, r: 1.2 }, { x: 1, y: 0, r: 3 },
    ];
    for (const c of craterData) {
      const craterGeo = new THREE.CircleGeometry(c.r, 12);
      const craterMat = new THREE.MeshBasicMaterial({
        color: 0xccccdd, transparent: true, opacity: 0.12, side: THREE.DoubleSide,
      });
      const crater = new THREE.Mesh(craterGeo, craterMat);
      crater.position.copy(this._moonMesh.position);
      crater.position.x += c.x * 0.8;
      crater.position.y += c.y * 0.8;
      crater.lookAt(this._camPos);
      this._scene.add(crater);
      this._moonCraters.push(crater);
    }

    // Moon halo (atmospheric ring)
    const haloGeo = new THREE.RingGeometry(14, 22, 64);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x8888bb, transparent: true, opacity: 0.06,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this._moonHalo = new THREE.Mesh(haloGeo, haloMat);
    this._moonHalo.position.copy(this._moonMesh.position);
    this._moonHalo.lookAt(0, 30, 0);
    this._scene.add(this._moonHalo);
  }

  // ---- God Rays ----
  private _buildGodRays(): void {
    // Fake volumetric light shafts from the moon direction
    const moonDir = new THREE.Vector3(80, 120, 60).normalize();
    for (let i = 0; i < 5; i++) {
      const length = 60 + Math.random() * 80;
      const width = 3 + Math.random() * 5;
      const rayGeo = new THREE.PlaneGeometry(width, length);
      const rayMat = new THREE.MeshBasicMaterial({
        color: 0x8888cc, transparent: true, opacity: 0.02 + Math.random() * 0.02,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const ray = new THREE.Mesh(rayGeo, rayMat);
      // Position along a line from above, angled down
      const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
      const spread = 30 + Math.random() * 60;
      ray.position.set(
        moonDir.x * 40 + Math.cos(angle) * spread,
        50 + Math.random() * 30,
        moonDir.z * 40 + Math.sin(angle) * spread,
      );
      ray.rotation.set(
        -0.3 + Math.random() * 0.2,
        angle + Math.PI / 2,
        0,
      );
      this._scene.add(ray);
      this._godRayMeshes.push(ray);
    }
  }

  // ---- Ground (noise-based forest floor shader) ----
  private _buildGround(): void {
    const groundGeo = new THREE.CircleGeometry(OWL.ARENA_RADIUS, 96);
    groundGeo.rotateX(-Math.PI / 2);
    this._groundUniforms = { time: { value: 0 } };
    const groundMat = new THREE.ShaderMaterial({
      vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG,
      uniforms: this._groundUniforms,
    });
    this._groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this._scene.add(this._groundMesh);

    const fogGeo = new THREE.PlaneGeometry(OWL.ARENA_RADIUS * 2, OWL.ARENA_RADIUS * 2, 1, 1);
    fogGeo.rotateX(-Math.PI / 2);
    this._fogUniforms = { time: { value: 0 }, fogDensity: { value: 0.7 } };
    const fogMat = new THREE.ShaderMaterial({
      vertexShader: FOG_VERT, fragmentShader: FOG_FRAG,
      uniforms: this._fogUniforms,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this._fogPlane = new THREE.Mesh(fogGeo, fogMat);
    this._fogPlane.position.y = 0.8;
    this._scene.add(this._fogPlane);

    // Second fog layer (higher, thinner)
    const fogGeo2 = new THREE.PlaneGeometry(OWL.ARENA_RADIUS * 2, OWL.ARENA_RADIUS * 2, 1, 1);
    fogGeo2.rotateX(-Math.PI / 2);
    this._fogUniforms2 = { time: { value: 0 }, fogDensity: { value: 0.35 } };
    const fogMat2 = new THREE.ShaderMaterial({
      vertexShader: FOG_VERT, fragmentShader: FOG_FRAG,
      uniforms: this._fogUniforms2,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this._fogPlane2 = new THREE.Mesh(fogGeo2, fogMat2);
    this._fogPlane2.position.y = 3.5;
    this._scene.add(this._fogPlane2);

    // Third fog layer (canopy height, very thin)
    const fogGeo3 = new THREE.PlaneGeometry(OWL.ARENA_RADIUS * 2, OWL.ARENA_RADIUS * 2, 1, 1);
    fogGeo3.rotateX(-Math.PI / 2);
    this._fogUniforms3 = { time: { value: 0 }, fogDensity: { value: 0.15 } };
    const fogMat3 = new THREE.ShaderMaterial({
      vertexShader: FOG_VERT, fragmentShader: FOG_FRAG,
      uniforms: this._fogUniforms3,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this._fogPlane3 = new THREE.Mesh(fogGeo3, fogMat3);
    this._fogPlane3.position.y = 12;
    this._scene.add(this._fogPlane3);
  }

  // ---- Water (animated ripple/reflection shader) ----
  private _buildWater(): void {
    const shape = new THREE.Shape();
    const w = OWL.STREAM_WIDTH / 2;
    const len = OWL.ARENA_RADIUS * 1.5;
    shape.moveTo(-len, -w);
    shape.quadraticCurveTo(-len * 0.5, -w + 20, 0, -w);
    shape.quadraticCurveTo(len * 0.5, -w - 20, len, -w);
    shape.lineTo(len, w);
    shape.quadraticCurveTo(len * 0.5, w - 20, 0, w);
    shape.quadraticCurveTo(-len * 0.5, w + 20, -len, w);
    shape.closePath();

    const waterGeo = new THREE.ShapeGeometry(shape);
    waterGeo.rotateX(-Math.PI / 2);
    this._waterUniforms = { time: { value: 0 } };
    const waterMat = new THREE.ShaderMaterial({
      vertexShader: WATER_VERT, fragmentShader: WATER_FRAG,
      uniforms: this._waterUniforms,
      transparent: true, depthWrite: false,
    });
    this._waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this._waterMesh.position.y = 0.12;
    this._scene.add(this._waterMesh);
  }

  // ---- Trees ----
  private _buildTrees(): void {
    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 1, 6);
    const canopyOakGeo = new THREE.SphereGeometry(1, 8, 6);
    const canopyPineGeo = new THREE.ConeGeometry(1, 2, 6);
    const canopyBirchGeo = new THREE.SphereGeometry(1, 8, 6);

    const oakTrunkMat = new THREE.MeshStandardMaterial({ color: COL.TREE_OAK_TRUNK, roughness: 0.95 });
    const pineTrunkMat = new THREE.MeshStandardMaterial({ color: COL.TREE_PINE_TRUNK, roughness: 0.95 });
    const birchTrunkMat = new THREE.MeshStandardMaterial({ color: COL.TREE_BIRCH_TRUNK, roughness: 0.8 });
    const oakCanopyMat = new THREE.MeshStandardMaterial({ color: COL.CANOPY_OAK, roughness: 0.9 });
    const pineCanopyMat = new THREE.MeshStandardMaterial({ color: COL.CANOPY_PINE, roughness: 0.9 });
    const birchCanopyMat = new THREE.MeshStandardMaterial({ color: COL.CANOPY_BIRCH, roughness: 0.85 });

    const maxPerType = OWL.TREE_COUNT;
    this._trunkMeshOak = new THREE.InstancedMesh(trunkGeo, oakTrunkMat, maxPerType);
    this._trunkMeshPine = new THREE.InstancedMesh(trunkGeo, pineTrunkMat, maxPerType);
    this._trunkMeshBirch = new THREE.InstancedMesh(trunkGeo, birchTrunkMat, maxPerType);
    this._canopyMeshOak = new THREE.InstancedMesh(canopyOakGeo, oakCanopyMat, maxPerType);
    this._canopyMeshPine = new THREE.InstancedMesh(canopyPineGeo, pineCanopyMat, maxPerType);
    this._canopyMeshBirch = new THREE.InstancedMesh(canopyBirchGeo, birchCanopyMat, maxPerType);

    [this._trunkMeshOak, this._trunkMeshPine, this._trunkMeshBirch,
     this._canopyMeshOak, this._canopyMeshPine, this._canopyMeshBirch].forEach(m => {
      m.castShadow = true; m.receiveShadow = true; this._scene.add(m);
    });
  }

  private _populateTrees(trees: Tree[]): void {
    const counts = { oak: 0, pine: 0, birch: 0 };
    const mat = new THREE.Matrix4();
    for (const t of trees) {
      const idx = counts[t.type]++;
      mat.makeScale(t.trunkRadius * 2, t.height, t.trunkRadius * 2);
      mat.setPosition(t.x, t.height / 2, t.z);
      const trunkMesh = t.type === "oak" ? this._trunkMeshOak : t.type === "pine" ? this._trunkMeshPine : this._trunkMeshBirch;
      trunkMesh.setMatrixAt(idx, mat);

      const cy = t.height * 0.85;
      mat.makeScale(t.canopyRadius * 2, t.canopyRadius * (t.type === "pine" ? 3 : 2), t.canopyRadius * 2);
      mat.setPosition(t.x, cy, t.z);
      const canopyMesh = t.type === "oak" ? this._canopyMeshOak : t.type === "pine" ? this._canopyMeshPine : this._canopyMeshBirch;
      canopyMesh.setMatrixAt(idx, mat);
    }
    this._trunkMeshOak.count = counts.oak;
    this._trunkMeshPine.count = counts.pine;
    this._trunkMeshBirch.count = counts.birch;
    this._canopyMeshOak.count = counts.oak;
    this._canopyMeshPine.count = counts.pine;
    this._canopyMeshBirch.count = counts.birch;
    [this._trunkMeshOak, this._trunkMeshPine, this._trunkMeshBirch,
     this._canopyMeshOak, this._canopyMeshPine, this._canopyMeshBirch].forEach(m => {
      m.instanceMatrix.needsUpdate = true;
    });
  }

  // ---- Rocks ----
  private _buildRocks(): void {
    // Irregular rock shape — squashed dodecahedron
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    rockGeo.scale(1, 0.6, 1);
    const rockMat = new THREE.MeshStandardMaterial({ color: COL.ROCK, roughness: 0.95 });
    this._rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, OWL.ROCK_COUNT);
    this._rockMesh.castShadow = true;
    this._rockMesh.receiveShadow = true;
    this._scene.add(this._rockMesh);
  }

  private _populateRocks(rocks: { x: number; z: number; scale: number; rotY: number; type: number }[]): void {
    const m4 = new THREE.Matrix4();
    const rot = new THREE.Matrix4();
    const colors = [new THREE.Color(COL.ROCK), new THREE.Color(COL.ROCK_MOSS), new THREE.Color(0x444440)];
    for (let i = 0; i < rocks.length; i++) {
      const r = rocks[i];
      const sy = r.type === 1 ? 0.3 : r.type === 2 ? 1.2 : 0.6;
      m4.makeScale(r.scale, r.scale * sy, r.scale);
      rot.makeRotationY(r.rotY);
      m4.multiply(rot);
      m4.setPosition(r.x, r.scale * sy * 0.3, r.z);
      this._rockMesh.setMatrixAt(i, m4);
      this._rockMesh.setColorAt(i, colors[r.type]);
    }
    this._rockMesh.count = rocks.length;
    this._rockMesh.instanceMatrix.needsUpdate = true;
    if (this._rockMesh.instanceColor) this._rockMesh.instanceColor.needsUpdate = true;
  }

  // ---- Mushrooms ----
  private _buildMushrooms(): void {
    const stemGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.4, 5);
    const capGeo = new THREE.SphereGeometry(0.25, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.8 });
    const capMat = new THREE.MeshStandardMaterial({
      color: COL.MUSHROOM_GREEN, emissive: COL.MUSHROOM_GREEN, emissiveIntensity: 0.8, roughness: 0.6,
    });
    this._mushroomMesh = new THREE.InstancedMesh(stemGeo, stemMat, OWL.MUSHROOM_COUNT);
    this._mushroomCapMesh = new THREE.InstancedMesh(capGeo, capMat, OWL.MUSHROOM_COUNT);
    this._mushroomMesh.castShadow = true;
    this._mushroomCapMesh.castShadow = true;
    this._scene.add(this._mushroomMesh);
    this._scene.add(this._mushroomCapMesh);
  }

  private _populateMushrooms(mushrooms: { x: number; z: number; scale: number; hue: number }[]): void {
    const mat = new THREE.Matrix4();
    const colors = [new THREE.Color(COL.MUSHROOM_GREEN), new THREE.Color(COL.MUSHROOM_BLUE), new THREE.Color(COL.MUSHROOM_PURPLE)];
    for (let i = 0; i < mushrooms.length; i++) {
      const m = mushrooms[i];
      mat.makeScale(m.scale, m.scale, m.scale);
      mat.setPosition(m.x, m.scale * 0.2, m.z);
      this._mushroomMesh.setMatrixAt(i, mat);
      mat.setPosition(m.x, m.scale * 0.4, m.z);
      this._mushroomCapMesh.setMatrixAt(i, mat);
      this._mushroomCapMesh.setColorAt(i, colors[m.hue]);
    }
    this._mushroomMesh.instanceMatrix.needsUpdate = true;
    this._mushroomCapMesh.instanceMatrix.needsUpdate = true;
    if (this._mushroomCapMesh.instanceColor) this._mushroomCapMesh.instanceColor.needsUpdate = true;
  }

  // ---- Fireflies ----
  private _buildFireflies(): void {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(OWL.FIREFLY_COUNT * 3);
    const sizes = new Float32Array(OWL.FIREFLY_COUNT);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({
      color: COL.FIREFLY, size: 1.5, sizeAttenuation: true,
      transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this._fireflyPoints = new THREE.Points(geo, mat);
    this._scene.add(this._fireflyPoints);

    // Glow halo pass (larger, softer, behind)
    const glowGeo = new THREE.BufferGeometry();
    const glowPos = new Float32Array(OWL.FIREFLY_COUNT * 3);
    const glowSizes = new Float32Array(OWL.FIREFLY_COUNT);
    glowGeo.setAttribute("position", new THREE.BufferAttribute(glowPos, 3));
    glowGeo.setAttribute("size", new THREE.BufferAttribute(glowSizes, 1));
    const glowMat = new THREE.PointsMaterial({
      color: 0xeedd44, size: 6, sizeAttenuation: true,
      transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this._fireflyGlowPoints = new THREE.Points(glowGeo, glowMat);
    this._scene.add(this._fireflyGlowPoints);
  }

  // ---- Ambient Leaves ----
  private _buildLeaves(): void {
    const geo = new THREE.PlaneGeometry(0.2, 0.12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x3a5a2a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false,
    });
    this._leafMesh = new THREE.InstancedMesh(geo, mat, OWL.LEAF_COUNT);
    this._leafMesh.count = 0;
    this._scene.add(this._leafMesh);
  }

  // ---- Grass Tufts (clearing detail) ----
  private _buildGrass(): void {
    const bladeGeo = new THREE.PlaneGeometry(0.08, 0.4);
    bladeGeo.translate(0, 0.2, 0); // pivot at base
    const bladeMat = new THREE.MeshBasicMaterial({
      color: 0x2a5a2a, transparent: true, opacity: 0.7,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const count = 400;
    this._grassMesh = new THREE.InstancedMesh(bladeGeo, bladeMat, count);
    const mat = new THREE.Matrix4();
    const grassColors = [0x1a4a1a, 0x2a5a2a, 0x2a4a1a, 0x1a3a2a, 0x3a5a3a];
    for (let i = 0; i < count; i++) {
      // Scatter in and near the clearing
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (OWL.CLEARING_RADIUS + 15);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      // Skip very center (campfire area)
      if (Math.sqrt(x * x + z * z) < 3) continue;
      const rotY = Math.random() * Math.PI;
      const s = 0.6 + Math.random() * 0.8;
      mat.makeRotationY(rotY);
      mat.scale(new THREE.Vector3(s, s + Math.random() * 0.4, s));
      mat.setPosition(x, 0, z);
      this._grassMesh.setMatrixAt(i, mat);
      this._grassMesh.setColorAt(i, new THREE.Color(grassColors[Math.floor(Math.random() * grassColors.length)]));
    }
    this._grassMesh.instanceMatrix.needsUpdate = true;
    if (this._grassMesh.instanceColor) this._grassMesh.instanceColor.needsUpdate = true;
    this._scene.add(this._grassMesh);
  }

  // ---- Owl Model (procedural, multi-segment wings) ----
  private _buildOwl(): void {
    this._owlGroup = new THREE.Group();

    // Body
    const bodyGeo = new THREE.SphereGeometry(0.8, 8, 6);
    bodyGeo.scale(1, 0.9, 1.3);
    const bodyMat = new THREE.MeshStandardMaterial({ color: COL.OWL_BODY, roughness: 0.9 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    this._owlGroup.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.55, 8, 6);
    const headMat = new THREE.MeshStandardMaterial({ color: COL.OWL_BODY, roughness: 0.9 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.5, 0.5);
    head.castShadow = true;
    this._owlGroup.add(head);

    // Ear tufts
    for (const side of [-1, 1]) {
      const tuftGeo = new THREE.ConeGeometry(0.12, 0.4, 4);
      const tuftMat = new THREE.MeshStandardMaterial({ color: COL.OWL_WING });
      const tuft = new THREE.Mesh(tuftGeo, tuftMat);
      tuft.position.set(side * 0.3, 0.9, 0.4);
      tuft.rotation.z = side * 0.3;
      this._owlGroup.add(tuft);
    }

    // Eyes (glowing amber)
    this._owlEyeMatL = new THREE.MeshStandardMaterial({ color: COL.OWL_EYE, emissive: COL.OWL_EYE, emissiveIntensity: 1.5 });
    this._owlEyeMatR = this._owlEyeMatL.clone();
    for (const [side, mat] of [[-1, this._owlEyeMatL], [1, this._owlEyeMatR]] as [number, THREE.MeshStandardMaterial][]) {
      const eyeGeo = new THREE.SphereGeometry(0.12, 6, 4);
      const eye = new THREE.Mesh(eyeGeo, mat);
      eye.position.set(side * 0.22, 0.55, 0.9);
      this._owlGroup.add(eye);
    }

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.08, 0.2, 4);
    const beakMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(0, 0.4, 1.0);
    beak.rotation.x = Math.PI / 2;
    this._owlGroup.add(beak);

    // Belly
    const bellyGeo = new THREE.SphereGeometry(0.6, 8, 6);
    bellyGeo.scale(0.8, 0.8, 0.9);
    const bellyMat = new THREE.MeshStandardMaterial({ color: COL.OWL_BELLY, roughness: 0.85 });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, -0.15, 0.2);
    this._owlGroup.add(belly);

    // Multi-segment wings (inner + outer for each side)
    const innerWingGeo = new THREE.BoxGeometry(1.3, 0.1, 1.0);
    const outerWingGeo = new THREE.BoxGeometry(1.4, 0.06, 0.8);
    const innerMat = new THREE.MeshStandardMaterial({ color: COL.OWL_WING_INNER, roughness: 0.9 });
    const outerMat = new THREE.MeshStandardMaterial({ color: COL.OWL_WING, roughness: 0.9 });

    this._owlLeftWingInner = new THREE.Mesh(innerWingGeo, innerMat);
    this._owlLeftWingInner.position.set(-0.9, 0.1, 0);
    this._owlLeftWingInner.castShadow = true;
    this._owlGroup.add(this._owlLeftWingInner);

    this._owlLeftWingOuter = new THREE.Mesh(outerWingGeo, outerMat);
    this._owlLeftWingOuter.position.set(-1.0, 0, 0);
    this._owlLeftWingOuter.castShadow = true;
    this._owlLeftWingInner.add(this._owlLeftWingOuter);

    this._owlRightWingInner = new THREE.Mesh(innerWingGeo, innerMat);
    this._owlRightWingInner.position.set(0.9, 0.1, 0);
    this._owlRightWingInner.castShadow = true;
    this._owlGroup.add(this._owlRightWingInner);

    this._owlRightWingOuter = new THREE.Mesh(outerWingGeo, outerMat);
    this._owlRightWingOuter.position.set(1.0, 0, 0);
    this._owlRightWingOuter.castShadow = true;
    this._owlRightWingInner.add(this._owlRightWingOuter);

    // Tail feathers (fan shape)
    for (let i = -2; i <= 2; i++) {
      const tailGeo = new THREE.BoxGeometry(0.15, 0.03, 0.6 + Math.abs(i) * 0.05);
      const tailMat = new THREE.MeshStandardMaterial({ color: COL.OWL_WING });
      const tail = new THREE.Mesh(tailGeo, tailMat);
      tail.position.set(i * 0.12, 0, -0.9);
      tail.rotation.y = i * 0.08;
      this._owlGroup.add(tail);
    }

    // Talons
    for (const side of [-0.3, 0.3]) {
      for (const fwd of [0, 0.15]) {
        const talonGeo = new THREE.ConeGeometry(0.03, 0.25, 4);
        const talonMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const talon = new THREE.Mesh(talonGeo, talonMat);
        talon.position.set(side, -0.7, 0.15 + fwd);
        talon.rotation.x = Math.PI;
        this._owlGroup.add(talon);
      }
    }

    this._owlGroup.scale.set(1.2, 1.2, 1.2);
    this._scene.add(this._owlGroup);

    // Owl shadow on ground (circle projected below)
    const shadowGeo = new THREE.CircleGeometry(1.5, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false,
    });
    this._owlShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this._scene.add(this._owlShadow);
  }

  // ---- Campfire in Clearing ----
  private _buildCampfire(): void {
    this._campfireMesh = new THREE.Group();

    // Stone ring
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const stoneGeo = new THREE.DodecahedronGeometry(0.4, 0);
      stoneGeo.scale(1, 0.5, 1);
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.95 });
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      stone.position.set(Math.cos(angle) * 1.5, 0.15, Math.sin(angle) * 1.5);
      stone.rotation.y = Math.random() * Math.PI;
      this._campfireMesh.add(stone);
    }

    // Log pieces
    for (let i = 0; i < 3; i++) {
      const logGeo = new THREE.CylinderGeometry(0.15, 0.12, 1.2, 5);
      const logMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
      const log = new THREE.Mesh(logGeo, logMat);
      log.position.set(0, 0.2, 0);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i / 3) * Math.PI;
      this._campfireMesh.add(log);
    }

    // Ember core (glowing)
    const emberGeo = new THREE.SphereGeometry(0.5, 6, 4);
    const emberMat = new THREE.MeshBasicMaterial({
      color: 0xff6622, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending,
    });
    const ember = new THREE.Mesh(emberGeo, emberMat);
    ember.position.y = 0.4;
    this._campfireMesh.add(ember);

    this._campfireMesh.position.set(0, 0, 0);
    this._scene.add(this._campfireMesh);

    // Campfire light
    this._campfireLight = new THREE.PointLight(0xff8833, 3, 30, 1.5);
    this._campfireLight.position.set(0, 2, 0);
    this._scene.add(this._campfireLight);
  }

  // ---- Torch Posts (ring around clearing) ----
  private _buildTorches(): void {
    const torchCount = 6;
    for (let i = 0; i < torchCount; i++) {
      const angle = (i / torchCount) * Math.PI * 2;
      const r = OWL.CLEARING_RADIUS - 3;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      const group = new THREE.Group();

      // Post
      const postGeo = new THREE.CylinderGeometry(0.08, 0.12, 3, 5);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.95 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 1.5;
      post.castShadow = true;
      group.add(post);

      // Bracket
      const bracketGeo = new THREE.BoxGeometry(0.3, 0.06, 0.06);
      const bracketMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
      const bracket = new THREE.Mesh(bracketGeo, bracketMat);
      bracket.position.set(0.15, 2.9, 0);
      group.add(bracket);

      // Flame (emissive sphere)
      const flameGeo = new THREE.SphereGeometry(0.15, 6, 4);
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xff8833, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(0.3, 3.05, 0);
      group.add(flame);

      group.position.set(x, 0, z);
      this._scene.add(group);
      this._torchMeshes.push(group);

      // Torch light
      const light = new THREE.PointLight(0xff7722, 1.5, 18, 2);
      light.position.set(x, 3.2, z);
      this._scene.add(light);
      this._torchLights.push(light);
    }
  }

  // ---- Clouds ----
  private _buildClouds(): void {
    for (let i = 0; i < 5; i++) {
      const w = 80 + Math.random() * 120;
      const h = 30 + Math.random() * 40;
      const geo = new THREE.PlaneGeometry(w, h);
      const uniforms = { time: { value: Math.random() * 100 } };
      this._cloudUniforms.push(uniforms);
      const mat = new THREE.ShaderMaterial({
        vertexShader: AURORA_VERT, fragmentShader: CLOUD_FRAG,
        uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
      const r = 100 + Math.random() * 150;
      mesh.position.set(Math.cos(angle) * r, 60 + Math.random() * 30, Math.sin(angle) * r);
      mesh.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      mesh.rotation.z = Math.random() * Math.PI;
      this._scene.add(mesh);
      this._cloudMeshes.push(mesh);
    }
  }

  // ---- Fire Particles (campfire) ----
  private _buildFireParticles(): void {
    const geo = new THREE.PlaneGeometry(0.3, 0.5);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff8833, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this._fireParticleMesh = new THREE.InstancedMesh(geo, mat, 40);
    this._fireParticleMesh.count = 0;
    this._scene.add(this._fireParticleMesh);
  }

  // ---- Mushroom Glow Lights ----
  private _buildMushroomLights(): void {
    // Place a few point lights at mushroom cluster centers (max 6 for perf)
    const colors = [0x22ffaa, 0x4488ff, 0x8844ff];
    for (let i = 0; i < Math.min(6, OWL.MUSHROOM_COUNT); i++) {
      const light = new THREE.PointLight(colors[i % 3], 0.5, 8, 2);
      light.position.set(0, -100, 0); // placed offscreen until populated
      this._scene.add(light);
      this._mushroomLights.push(light);
    }
  }

  // ---- Moonlight Orbs ----
  private _buildOrbs(): void {
    const orbGeo = new THREE.SphereGeometry(0.4, 8, 6);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1, transparent: true, opacity: 0.9,
    });
    this._orbMesh = new THREE.InstancedMesh(orbGeo, orbMat, 10);
    this._orbMesh.count = 0;
    this._scene.add(this._orbMesh);

    const glowGeo = new THREE.SphereGeometry(1.2, 8, 6);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this._orbGlowMesh = new THREE.InstancedMesh(glowGeo, glowMat, 10);
    this._orbGlowMesh.count = 0;
    this._scene.add(this._orbGlowMesh);
  }

  // ---- Particles ----
  private _buildParticles(): void {
    const geo = new THREE.SphereGeometry(0.15, 4, 3);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this._particleMesh = new THREE.InstancedMesh(geo, mat, 500);
    this._particleMesh.count = 0;
    this._scene.add(this._particleMesh);
  }

  // ==================================================================
  // UPDATE
  // ==================================================================
  update(state: OwlsState, rawDt: number): void {
    const p = state.player;
    const t = state.gameTime;

    // ---- Populate on first frame ----
    if (!this._populated) {
      this._populateTrees(state.trees);
      this._populateRocks(state.rocks);
      this._populateMushrooms(state.mushrooms);
      // Place mushroom lights at first 6 mushroom positions
      for (let i = 0; i < this._mushroomLights.length && i < state.mushrooms.length; i++) {
        const m = state.mushrooms[i * Math.floor(state.mushrooms.length / this._mushroomLights.length)];
        this._mushroomLights[i].position.set(m.x, 0.8, m.z);
      }
      // Init canopy sway phases
      this._canopySwayPhases = new Float32Array(state.trees.length);
      for (let i = 0; i < state.trees.length; i++) {
        this._canopySwayPhases[i] = Math.random() * Math.PI * 2;
      }
      this._populated = true;
    }

    // ---- Sky (with dawn transition) ----
    const skyMat = this._skyDome.material as THREE.ShaderMaterial;
    skyMat.uniforms.time.value = t;
    const dawn = state.dawnProgress;
    const skyTopColor = skyMat.uniforms.topColor.value as THREE.Color;
    const skyBotColor = skyMat.uniforms.botColor.value as THREE.Color;
    skyTopColor.copy(this._nightSkyTop).lerp(this._dawnSkyTop, dawn);
    skyBotColor.copy(this._nightSkyBot).lerp(this._dawnSkyBot, dawn);
    this._auroraUniforms.time.value = t;
    // Fade aurora and stars during dawn
    (this._auroraMesh.material as THREE.ShaderMaterial).opacity = 1 - dawn;
    (this._starPoints.material as THREE.PointsMaterial).opacity = 0.9 * (1 - dawn);
    // Brighten ambient during dawn
    this._ambientLight.intensity = 0.4 + dawn * 0.6;
    this._hemiLight.intensity = 0.3 + dawn * 0.4;
    this._moonLight.intensity = 0.6 * (1 - dawn * 0.5);

    // ---- Star twinkle ----
    const starSizes = this._starPoints.geometry.attributes.size as THREE.BufferAttribute;
    for (let i = 0; i < this._starBaseSizes.length; i++) {
      starSizes.array[i] = this._starBaseSizes[i] * (0.6 + 0.4 * Math.sin(t * 2 + i * 1.37));
    }
    starSizes.needsUpdate = true;

    // ---- Ground fog (wave modifier affects density) ----
    this._fogUniforms.time.value = t;
    const visionMult = 1 + p.upgrades.vision * 0.3;
    const waveMod = OWL.WAVE_MODIFIERS[state.waveModifierIndex];
    const fogMult = state.phase === "hunting" ? waveMod.fogMult : 1;
    (this._scene.fog as THREE.FogExp2).density = (0.004 * fogMult) / visionMult;
    this._fogUniforms.fogDensity.value = 0.7 * fogMult;

    // ---- Ground + Water shader time ----
    this._groundUniforms.time.value = t;
    this._waterUniforms.time.value = t;

    // ---- Clouds drift ----
    for (let i = 0; i < this._cloudMeshes.length; i++) {
      this._cloudUniforms[i].time.value = t;
      // Slow drift
      this._cloudMeshes[i].position.x += 0.3 * Math.sin(i * 1.7) * rawDt;
      this._cloudMeshes[i].position.z += 0.2 * Math.cos(i * 2.3) * rawDt;
    }

    // ---- Additional fog layers ----
    this._fogUniforms2.time.value = t + 50;
    this._fogUniforms2.fogDensity.value = 0.35 * fogMult;
    this._fogUniforms3.time.value = t + 100;
    this._fogUniforms3.fogDensity.value = 0.15 * fogMult;

    // ---- God ray sway ----
    for (let i = 0; i < this._godRayMeshes.length; i++) {
      const ray = this._godRayMeshes[i];
      ray.rotation.z = Math.sin(t * 0.2 + i * 1.5) * 0.04;
      (ray.material as THREE.MeshBasicMaterial).opacity = (0.02 + Math.sin(t * 0.5 + i * 2) * 0.01) * (1 - dawn);
    }

    // ---- Torch flicker ----
    for (let i = 0; i < this._torchLights.length; i++) {
      this._torchLights[i].intensity = 1.5 + Math.sin(t * 10 + i * 3.7) * 0.3 + Math.sin(t * 17 + i * 5) * 0.15;
      // Animate flame mesh scale
      if (this._torchMeshes[i] && this._torchMeshes[i].children.length >= 3) {
        const flame = this._torchMeshes[i].children[2];
        const flameScale = 0.8 + Math.sin(t * 12 + i * 4) * 0.3;
        flame.scale.set(flameScale, flameScale * 1.3, flameScale);
      }
    }

    // ---- Second aurora ----
    this._aurora2Uniforms.time.value = t * 0.8 + 30;
    (this._aurora2Mesh.material as THREE.ShaderMaterial).opacity = (1 - dawn) * 0.7;

    // ---- Moon detail follows moon ----
    for (const crater of this._moonCraters) {
      crater.position.copy(this._moonMesh.position);
      crater.lookAt(this._camPos);
    }
    this._moonHalo.position.copy(this._moonMesh.position);
    this._moonHalo.lookAt(this._camPos);
    (this._moonHalo.material as THREE.MeshBasicMaterial).opacity = 0.06 * (1 - dawn * 0.8);

    // ---- Campfire fire particles ----
    this._updateFireParticles(rawDt);

    // ---- Tree canopy sway ----
    this._updateCanopySway(state, t);

    // ---- Mushroom light pulse ----
    for (let i = 0; i < this._mushroomLights.length; i++) {
      this._mushroomLights[i].intensity = 0.3 + 0.2 * Math.sin(t * 1.5 + i * 2.1);
    }

    // ---- Fireflies ----
    const ffPos = this._fireflyPoints.geometry.attributes.position as THREE.BufferAttribute;
    const ffSize = this._fireflyPoints.geometry.attributes.size as THREE.BufferAttribute;
    for (let i = 0; i < state.fireflies.length; i++) {
      const f = state.fireflies[i];
      ffPos.array[i * 3] = f.x; ffPos.array[i * 3 + 1] = f.y; ffPos.array[i * 3 + 2] = f.z;
      ffSize.array[i] = f.brightness * 2.5;
    }
    ffPos.needsUpdate = true;
    ffSize.needsUpdate = true;

    // Firefly glow halos (sync with main fireflies)
    const glowPos = this._fireflyGlowPoints.geometry.attributes.position as THREE.BufferAttribute;
    const glowSize = this._fireflyGlowPoints.geometry.attributes.size as THREE.BufferAttribute;
    for (let i = 0; i < state.fireflies.length; i++) {
      const f = state.fireflies[i];
      glowPos.array[i * 3] = f.x; glowPos.array[i * 3 + 1] = f.y; glowPos.array[i * 3 + 2] = f.z;
      glowSize.array[i] = f.brightness * 8;
    }
    glowPos.needsUpdate = true;
    glowSize.needsUpdate = true;

    // ---- Mushroom glow ----
    if (this._mushroomCapMesh.instanceColor) {
      const colors = [new THREE.Color(COL.MUSHROOM_GREEN), new THREE.Color(COL.MUSHROOM_BLUE), new THREE.Color(COL.MUSHROOM_PURPLE)];
      for (let i = 0; i < state.mushrooms.length; i++) {
        const m = state.mushrooms[i];
        const pulse = 0.6 + 0.4 * Math.sin(t * 1.5 + m.glowPhase);
        const c = colors[m.hue].clone().multiplyScalar(pulse);
        this._mushroomCapMesh.setColorAt(i, c);
      }
      this._mushroomCapMesh.instanceColor.needsUpdate = true;
    }

    // ---- Ambient leaves ----
    this._updateLeaves(state);

    // ---- Owl position, banking, barrel roll ----
    this._owlGroup.position.set(p.x, p.y, p.z);
    this._owlGroup.rotation.set(0, 0, 0);
    this._owlGroup.rotateY(p.yaw + Math.PI);
    this._owlGroup.rotateX(-p.pitch);
    // Bank tilt
    const totalBank = p.bankAngle + (p.barrelRollTimer > 0 ? Math.sin(p.barrelRollAngle) : 0);
    this._owlGroup.rotateZ(totalBank);

    // Multi-segment wing flap
    const innerFlap = Math.sin(p.wingPhase) * 0.4 + p.wingAngle;
    const outerFlap = Math.sin(p.wingPhase + 0.4) * 0.3 + p.wingAngle * 0.6;
    this._owlLeftWingInner.rotation.z = innerFlap;
    this._owlLeftWingOuter.rotation.z = outerFlap;
    this._owlRightWingInner.rotation.z = -innerFlap;
    this._owlRightWingOuter.rotation.z = -outerFlap;

    // Eye glow
    const eyeIntensity = p.isDiving ? 2.5 : p.isSilentGlide ? 0.8 : 1.5;
    this._owlEyeMatL.emissiveIntensity = eyeIntensity;
    this._owlEyeMatR.emissiveIntensity = eyeIntensity;

    // Owl eye spotlight
    const fwdX = Math.sin(p.yaw) * Math.cos(p.pitch);
    const fwdY = Math.sin(p.pitch);
    const fwdZ = Math.cos(p.yaw) * Math.cos(p.pitch);
    this._owlEyeLight.position.set(p.x, p.y + 0.5, p.z);
    this._owlEyeLight.target.position.set(p.x + fwdX * 10, p.y + fwdY * 10 + 0.5, p.z + fwdZ * 10);
    this._owlEyeLight.intensity = eyeIntensity * 1.2;

    // Owl shadow on ground
    const shadowScale = Math.max(0.3, 1.5 - p.y * 0.015);
    this._owlShadow.position.set(p.x, 0.08, p.z);
    this._owlShadow.scale.set(shadowScale, 1, shadowScale);
    (this._owlShadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.05, 0.2 - p.y * 0.002);

    // ---- Campfire flicker ----
    this._campfireLight.intensity = 3 + Math.sin(t * 8) * 0.5 + Math.sin(t * 13) * 0.3;
    this._campfireLight.color.setHex(Math.random() > 0.95 ? 0xffaa44 : 0xff8833);

    // ---- Moonlight orbs ----
    this._updateOrbs(state);

    // ---- Alert pulse rings ----
    this._updateAlertRings(state, rawDt);

    // ---- Prey ----
    this._updatePreyMeshes(state);

    // ---- Particles ----
    this._updateParticles(state);

    // ---- Screech ring ----
    this._updateScreechRing(state, rawDt);

    // ---- Catch flash ----
    this._updateCatchFlash(state, rawDt);

    // ---- Shooting star ----
    this._updateShootingStar(state);

    // ---- Camera ----
    this._updateCamera(state, rawDt);

    // ---- Render ----
    this._renderer.render(this._scene, this._camera);
  }

  // ---- Ambient leaves ----
  private _updateLeaves(state: OwlsState): void {
    const count = Math.min(state.ambientLeaves.length, OWL.LEAF_COUNT);
    this._leafMesh.count = count;
    const mat = new THREE.Matrix4();
    const rot = new THREE.Euler();
    for (let i = 0; i < count; i++) {
      const l = state.ambientLeaves[i];
      rot.set(l.spin, l.spin * 0.7, l.spin * 0.3);
      mat.makeRotationFromEuler(rot);
      mat.scale(new THREE.Vector3(l.size, l.size, l.size));
      mat.setPosition(l.x, l.y, l.z);
      this._leafMesh.setMatrixAt(i, mat);
      this._leafMesh.setColorAt(i, new THREE.Color(l.color));
    }
    if (count > 0) {
      this._leafMesh.instanceMatrix.needsUpdate = true;
      if (this._leafMesh.instanceColor) this._leafMesh.instanceColor.needsUpdate = true;
    }
  }

  // ---- Orb rendering ----
  private _updateOrbs(state: OwlsState): void {
    const mat = new THREE.Matrix4();
    const activeOrbs = state.orbs.filter(o => !o.collected);
    this._orbMesh.count = activeOrbs.length;
    this._orbGlowMesh.count = activeOrbs.length;
    for (let i = 0; i < activeOrbs.length; i++) {
      const orb = activeOrbs[i];
      const orbType = OWL.ORB_TYPES[orb.typeIndex];
      const pulse = 0.8 + 0.2 * Math.sin(state.gameTime * 3 + orb.bobPhase);
      mat.makeScale(pulse, pulse, pulse);
      mat.setPosition(orb.x, orb.y, orb.z);
      this._orbMesh.setMatrixAt(i, mat);
      this._orbMesh.setColorAt(i, new THREE.Color(orbType.color));
      // Glow sphere
      const gs = 1 + 0.3 * Math.sin(state.gameTime * 2 + orb.bobPhase);
      mat.makeScale(gs, gs, gs);
      mat.setPosition(orb.x, orb.y, orb.z);
      this._orbGlowMesh.setMatrixAt(i, mat);
      this._orbGlowMesh.setColorAt(i, new THREE.Color(orbType.color));
    }
    if (activeOrbs.length > 0) {
      this._orbMesh.instanceMatrix.needsUpdate = true;
      this._orbGlowMesh.instanceMatrix.needsUpdate = true;
      if (this._orbMesh.instanceColor) this._orbMesh.instanceColor.needsUpdate = true;
      if (this._orbGlowMesh.instanceColor) this._orbGlowMesh.instanceColor.needsUpdate = true;
    }
  }

  // ---- Alert pulse rings ----
  private _updateAlertRings(state: OwlsState, dt: number): void {
    // Spawn new rings from state
    for (const ap of state.alertPulses) {
      const progress = 1 - ap.timer / ap.maxTimer;
      if (progress < 0.05) {
        // Just spawned — create ring mesh
        const geo = new THREE.RingGeometry(0.3, 0.8, 16);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xff8844, transparent: true, opacity: 0.5,
          side: THREE.DoubleSide, depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(ap.x, ap.y, ap.z);
        mesh.rotation.x = -Math.PI / 2;
        this._scene.add(mesh);
        this._alertRings.push({ mesh, life: ap.maxTimer, maxLife: ap.maxTimer });
      }
    }

    // Update existing rings
    for (let i = this._alertRings.length - 1; i >= 0; i--) {
      const ring = this._alertRings[i];
      ring.life -= dt;
      if (ring.life <= 0) {
        this._scene.remove(ring.mesh);
        this._alertRings.splice(i, 1);
        continue;
      }
      const progress = 1 - ring.life / ring.maxLife;
      const scale = 1 + progress * 8;
      ring.mesh.scale.set(scale, scale, scale);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.5;
    }
  }

  // ---- Prey ----
  private _updatePreyMeshes(state: OwlsState): void {
    const activePrey = new Set<string>();
    for (const prey of state.prey.values()) {
      activePrey.add(prey.id);
      let group = this._preyMeshes.get(prey.id);
      if (!group) {
        group = this._createPreyMesh(prey);
        this._preyMeshes.set(prey.id, group);
        this._scene.add(group);
      }
      group.position.set(prey.x, prey.y, prey.z);
      if (Math.abs(prey.vx) + Math.abs(prey.vz) > 0.5) {
        group.rotation.y = Math.atan2(prey.vx, prey.vz);
      }
      if (prey.state === "caught") {
        const s = 1 - prey.catchAnim;
        group.scale.set(s, s, s);
      } else {
        group.scale.set(1, 1, 1);
      }
      if (prey.state === "alert" || prey.state === "fleeing") {
        group.position.y += Math.abs(Math.sin(state.gameTime * 8)) * 0.2;
      }
      if (prey.state === "stunned") {
        group.rotation.y = state.gameTime * 5;
        group.position.y += 0.3;
      }
      // Moth wing flap animation
      if (prey.type === "moth" && group.children.length >= 3) {
        const flapAngle = Math.sin(state.gameTime * 12 + prey.x) * 0.6;
        group.children[1].rotation.z = -flapAngle;
        group.children[2].rotation.z = flapAngle;
      }
      group.visible = true;
    }
    for (const [id, group] of this._preyMeshes) {
      if (!activePrey.has(id)) {
        this._scene.remove(group);
        this._preyMeshes.delete(id);
      }
    }
  }

  private _createPreyMesh(prey: Prey): THREE.Group {
    const def = OWL.PREY_TYPES[prey.type];
    const group = new THREE.Group();
    const s = def.size;

    if (prey.type === "moth") {
      const bodyGeo = new THREE.SphereGeometry(s * 0.3, 4, 3);
      const bodyMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.8 });
      group.add(new THREE.Mesh(bodyGeo, bodyMat));
      for (const side of [-1, 1]) {
        const wingGeo = new THREE.PlaneGeometry(s * 0.8, s * 0.5);
        const wingMat = new THREE.MeshStandardMaterial({
          color: 0xddddcc, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.7,
        });
        const wing = new THREE.Mesh(wingGeo, wingMat);
        wing.position.set(side * s * 0.4, 0, 0);
        wing.rotation.z = side * 0.3;
        group.add(wing);
      }
    } else {
      const bodyGeo = new THREE.SphereGeometry(s * 0.5, 6, 4);
      bodyGeo.scale(1, 0.7, 1.3);
      const bodyMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.9 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(s * 0.25, 5, 4);
      const headMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.9 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(0, s * 0.1, s * 0.5);
      group.add(head);

      // Eyes (tiny glowing dots — visible from afar)
      for (const ex of [-0.06, 0.06]) {
        const eyeGeo = new THREE.SphereGeometry(s * 0.06, 4, 3);
        const eyeMat = new THREE.MeshStandardMaterial({
          color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 1.5,
        });
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(ex, s * 0.2, s * 0.65);
        group.add(eye);
      }

      if (prey.type === "rabbit") {
        for (const side of [-1, 1]) {
          const earGeo = new THREE.CylinderGeometry(0.04, 0.06, s * 0.5, 4);
          const earMat = new THREE.MeshStandardMaterial({ color: def.color });
          const ear = new THREE.Mesh(earGeo, earMat);
          ear.position.set(side * 0.08, s * 0.45, s * 0.4);
          ear.rotation.z = side * 0.2;
          group.add(ear);
        }
      }

      if (prey.type === "frog") {
        // Frog — wider body, big eyes
        body.scale.set(1.2, 0.6, 1);
        (bodyMat as THREE.MeshStandardMaterial).color.setHex(0x44aa44);
      }
    }
    return group;
  }

  // ---- Particles ----
  private _updateParticles(state: OwlsState): void {
    const mat = new THREE.Matrix4();
    const count = Math.min(state.particles.length, 500);
    this._particleMesh.count = count;
    for (let i = 0; i < count; i++) {
      const p = state.particles[i];
      const alpha = p.life / p.maxLife;
      const s = p.type === "speed_line" ? p.size * 0.5 : p.size * alpha;
      mat.makeScale(s, s, p.type === "speed_line" ? s * 5 : s);
      mat.setPosition(p.x, p.y, p.z);
      this._particleMesh.setMatrixAt(i, mat);
      this._particleMesh.setColorAt(i, new THREE.Color(p.color));
    }
    if (count > 0) {
      this._particleMesh.instanceMatrix.needsUpdate = true;
      if (this._particleMesh.instanceColor) this._particleMesh.instanceColor.needsUpdate = true;
    }
  }

  // ---- Screech ring ----
  private _updateScreechRing(state: OwlsState, dt: number): void {
    if (state.pendingScreechRing) {
      state.pendingScreechRing = false;
      if (this._screechRing) this._scene.remove(this._screechRing);
      const geo = new THREE.RingGeometry(0.5, 2, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: COL.SCREECH_RING, transparent: true, opacity: 0.6,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      this._screechRing = new THREE.Mesh(geo, mat);
      this._screechRing.position.set(state.player.x, state.player.y, state.player.z);
      this._screechRing.lookAt(this._camera.position);
      this._scene.add(this._screechRing);
      this._screechRingScale = 1;
      this._screechRingLife = 1;
    }
    if (this._screechRing && this._screechRingLife > 0) {
      this._screechRingLife -= dt * 1.5;
      this._screechRingScale += dt * 40;
      this._screechRing.scale.set(this._screechRingScale, this._screechRingScale, this._screechRingScale);
      (this._screechRing.material as THREE.MeshBasicMaterial).opacity = this._screechRingLife * 0.6;
      if (this._screechRingLife <= 0) { this._scene.remove(this._screechRing); this._screechRing = null; }
    }
  }

  // ---- Catch flash ----
  private _updateCatchFlash(state: OwlsState, dt: number): void {
    if (state.pendingCatchFlash) {
      const cf = state.pendingCatchFlash;
      state.pendingCatchFlash = null;
      if (this._catchFlashLight) this._scene.remove(this._catchFlashLight);
      this._catchFlashLight = new THREE.PointLight(COL.CATCH_FLASH, 5, 30);
      this._catchFlashLight.position.set(cf.x, cf.y, cf.z);
      this._scene.add(this._catchFlashLight);
      this._catchFlashLife = 0.5;
    }
    if (this._catchFlashLight && this._catchFlashLife > 0) {
      this._catchFlashLife -= dt;
      this._catchFlashLight.intensity = this._catchFlashLife * 10;
      if (this._catchFlashLife <= 0) { this._scene.remove(this._catchFlashLight); this._catchFlashLight = null; }
    }
  }

  // ---- Shooting star (multi-point fading trail) ----
  private _updateShootingStar(state: OwlsState): void {
    if (state.shootingStar) {
      const s = state.shootingStar;
      const trailLen = 8;
      if (!this._shootingStarLine) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(trailLen * 3), 3));
        geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(trailLen * 3), 3));
        const mat = new THREE.LineBasicMaterial({
          vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending,
        });
        this._shootingStarLine = new THREE.Line(geo, mat);
        this._scene.add(this._shootingStarLine);
      }
      const pa = this._shootingStarLine.geometry.attributes.position.array as Float32Array;
      const ca = this._shootingStarLine.geometry.attributes.color.array as Float32Array;
      for (let i = 0; i < trailLen; i++) {
        const t = i / (trailLen - 1); // 0 = head, 1 = tail
        pa[i * 3]     = s.x - s.vx * t * 0.15;
        pa[i * 3 + 1] = s.y - s.vy * t * 0.15;
        pa[i * 3 + 2] = s.z - s.vz * t * 0.15;
        const bright = (1 - t) * Math.min(s.life, 1);
        ca[i * 3]     = bright;
        ca[i * 3 + 1] = bright * 0.9;
        ca[i * 3 + 2] = bright * 0.7;
      }
      this._shootingStarLine.geometry.attributes.position.needsUpdate = true;
      this._shootingStarLine.geometry.attributes.color.needsUpdate = true;
      (this._shootingStarLine.material as THREE.LineBasicMaterial).opacity = Math.min(s.life, 1);
      this._shootingStarLine.visible = true;
    } else if (this._shootingStarLine) {
      this._shootingStarLine.visible = false;
    }
  }

  // ---- Camera ----
  private _updateCamera(state: OwlsState, dt: number): void {
    const p = state.player;
    const lerpSpeed = OWL.CAMERA_SMOOTHING * dt;

    if (state.phase === "menu") {
      const angle = state.gameTime * 0.15;
      this._camPos.lerp(new THREE.Vector3(Math.cos(angle) * 60, 45, Math.sin(angle) * 60), lerpSpeed * 0.5);
      this._camLook.lerp(new THREE.Vector3(0, 15, 0), lerpSpeed * 0.5);
    } else {
      const cosY = Math.cos(p.yaw), sinY = Math.sin(p.yaw);
      const behindX = -sinY * OWL.CAMERA_DISTANCE;
      const behindZ = -cosY * OWL.CAMERA_DISTANCE;
      const targetPos = new THREE.Vector3(p.x + behindX, p.y + OWL.CAMERA_HEIGHT + (p.isDiving ? -1 : 0), p.z + behindZ);
      const lookTarget = new THREE.Vector3(p.x + sinY * OWL.CAMERA_LOOK_AHEAD, p.y + Math.sin(p.pitch) * 5, p.z + cosY * OWL.CAMERA_LOOK_AHEAD);
      this._camPos.lerp(targetPos, lerpSpeed);
      this._camLook.lerp(lookTarget, lerpSpeed);

      const targetFOV = p.isDiving ? OWL.CAMERA_DIVE_FOV : OWL.CAMERA_FOV;
      this._camera.fov += (targetFOV - this._camera.fov) * dt * 3;
      this._camera.updateProjectionMatrix();
    }

    // Apply camera shake
    this._camera.position.set(
      this._camPos.x + state.cameraShakeX,
      this._camPos.y + state.cameraShakeY,
      this._camPos.z,
    );
    this._camera.lookAt(this._camLook);

    // Move sky with camera
    this._skyDome.position.set(this._camPos.x, 0, this._camPos.z);
    this._starPoints.position.set(this._camPos.x, 0, this._camPos.z);
    this._moonMesh.position.set(this._camPos.x + 80, 120, this._camPos.z + 60);
    this._moonGlow.position.copy(this._moonMesh.position);
    this._moonMesh.lookAt(this._camPos);
    this._moonGlow.lookAt(this._camPos);
    this._moonLight.position.set(this._camPos.x + 80, 120, this._camPos.z + 60);
    this._moonLight.target.position.set(this._camPos.x, 0, this._camPos.z);
    this._moonLight.target.updateMatrixWorld();

    // Move second aurora with camera
    this._aurora2Mesh.position.set(this._camPos.x - 120, 90, this._camPos.z + 100);
    this._auroraMesh.position.set(this._camPos.x, 100, this._camPos.z + 150);

    // Move god rays with camera
    const moonDirN = new THREE.Vector3(80, 120, 60).normalize();
    for (let i = 0; i < this._godRayMeshes.length; i++) {
      const ray = this._godRayMeshes[i];
      const angle = (i / 5) * Math.PI * 2;
      const spread = 30 + i * 12;
      ray.position.set(
        this._camPos.x + moonDirN.x * 40 + Math.cos(angle) * spread,
        50 + i * 5,
        this._camPos.z + moonDirN.z * 40 + Math.sin(angle) * spread,
      );
    }
  }

  // ---- Fire Particles Update ----
  private _updateFireParticles(dt: number): void {
    // Spawn new fire particles
    if (Math.random() < 0.6) {
      this._fireParticles.push({
        x: (Math.random() - 0.5) * 0.8,
        y: 0.3 + Math.random() * 0.3,
        z: (Math.random() - 0.5) * 0.8,
        vy: 2 + Math.random() * 3,
        life: 0.6 + Math.random() * 0.6,
        maxLife: 1.2,
        size: 0.15 + Math.random() * 0.25,
        heat: 0.5 + Math.random() * 0.5,
      });
    }

    // Update and render
    const mat = new THREE.Matrix4();
    for (let i = this._fireParticles.length - 1; i >= 0; i--) {
      const fp = this._fireParticles[i];
      fp.life -= dt;
      if (fp.life <= 0) { this._fireParticles.splice(i, 1); continue; }
      fp.y += fp.vy * dt;
      fp.x += (Math.random() - 0.5) * 0.5 * dt;
      fp.z += (Math.random() - 0.5) * 0.5 * dt;
      fp.vy *= 0.98;
    }

    const count = Math.min(this._fireParticles.length, 40);
    this._fireParticleMesh.count = count;
    for (let i = 0; i < count; i++) {
      const fp = this._fireParticles[i];
      const alpha = fp.life / fp.maxLife;
      const s = fp.size * (0.5 + 0.5 * alpha);
      mat.makeScale(s, s * 1.5, s);
      mat.setPosition(fp.x, fp.y, fp.z);
      this._fireParticleMesh.setMatrixAt(i, mat);
      // Color shifts from bright yellow to dark red as it rises
      const r = fp.heat > 0.6 ? 1 : 0.8;
      const g = alpha * 0.6 * fp.heat;
      const b = alpha * 0.1;
      this._fireParticleMesh.setColorAt(i, new THREE.Color(r, g, b));
    }
    if (count > 0) {
      this._fireParticleMesh.instanceMatrix.needsUpdate = true;
      if (this._fireParticleMesh.instanceColor) this._fireParticleMesh.instanceColor.needsUpdate = true;
    }
  }

  // ---- Tree Canopy Wind Sway ----
  private _updateCanopySway(state: OwlsState, t: number): void {
    if (!this._canopySwayPhases) return;

    const counts = { oak: 0, pine: 0, birch: 0 };
    const mat = new THREE.Matrix4();
    const rot = new THREE.Matrix4();

    for (let i = 0; i < state.trees.length; i++) {
      const tree = state.trees[i];
      const idx = counts[tree.type]++;
      const phase = this._canopySwayPhases[i];

      // Gentle sway
      const swayX = Math.sin(t * 0.8 + phase) * 0.015;
      const swayZ = Math.cos(t * 0.6 + phase * 1.3) * 0.012;

      const cy = tree.height * 0.85;
      const scaleY = tree.canopyRadius * (tree.type === "pine" ? 3 : 2);
      mat.makeScale(tree.canopyRadius * 2, scaleY, tree.canopyRadius * 2);
      rot.makeRotationFromEuler(new THREE.Euler(swayX, 0, swayZ));
      mat.premultiply(rot);
      mat.setPosition(tree.x, cy, tree.z);

      const canopyMesh = tree.type === "oak" ? this._canopyMeshOak : tree.type === "pine" ? this._canopyMeshPine : this._canopyMeshBirch;
      canopyMesh.setMatrixAt(idx, mat);
    }

    this._canopyMeshOak.instanceMatrix.needsUpdate = true;
    this._canopyMeshPine.instanceMatrix.needsUpdate = true;
    this._canopyMeshBirch.instanceMatrix.needsUpdate = true;
  }

  // ==================================================================
  // CLEANUP
  // ==================================================================
  cleanup(): void {
    if (this._canvas.parentNode) this._canvas.parentNode.removeChild(this._canvas);
    this._renderer.dispose();
    this._scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material?.dispose();
      }
    });
    for (const [, group] of this._preyMeshes) this._scene.remove(group);
    this._preyMeshes.clear();
  }
}
