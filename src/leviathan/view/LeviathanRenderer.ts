// ---------------------------------------------------------------------------
// Leviathan — The Deep Descent — Three.js underwater 3D renderer
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { LEVIATHAN } from "../config/LeviathanConfig";
import type { LeviathanState } from "../state/LeviathanState";

function dist3Inner(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

const COL = {
  WATER_DEEP: 0x040810, WATER_SHALLOW: 0x0a1520,
  SAND: 0x332820, STONE: 0x3a3530, CORAL_BASE: 0x445544,
  PLAYER: 0x556688, PLAYER_ARMOR: 0x667799, LANTERN: 0xffcc66,
  ANGLER: 0x334433, ANGLER_LURE: 0x44ff88,
  JELLYFISH: 0xff88cc, CORAL_GOLEM: 0x668866, TENTACLE: 0x443355,
  SIREN: 0x8844aa, ABYSSAL: 0x443344,
  FRAGMENT: 0xffcc44, AIR_POCKET: 0x88ddff, RELIC: 0x44ffaa,
  HARPOON: 0xaabbcc, SIREN_BOLT: 0xff44aa,
};

export class LeviathanRenderer {
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _canvas!: HTMLCanvasElement;
  private _composer!: EffectComposer;
  private _bloomPass!: UnrealBloomPass;
  private _underwaterPass!: ShaderPass;
  private _cameraTarget = new THREE.Vector3();

  // Lighting
  private _ambientLight!: THREE.AmbientLight;
  private _playerLantern!: THREE.PointLight;
  private _playerLanternFlare!: THREE.PointLight;

  // Fog
  private _fog!: THREE.FogExp2;

  // Static world
  private _pillarMeshes: THREE.Mesh[] = [];
  private _coralMeshes: THREE.Group[] = [];
  private _ruinMeshes: THREE.Mesh[] = [];
  private _airPocketMeshes: THREE.Mesh[] = [];
  private _fragmentMeshes: THREE.Mesh[] = [];
  private _fragmentLights: THREE.PointLight[] = [];
  private _currentVisuals: THREE.Mesh[] = [];
  private _worldBuilt = false;

  // Player
  private _playerGroup!: THREE.Group;

  // Dynamic pools
  private _enemyMeshes = new Map<string, THREE.Group>();
  private _projPool: THREE.Mesh[] = [];
  private _particlePool: THREE.Mesh[] = [];
  private _shardPool: THREE.Mesh[] = [];
  private _sonarRings: THREE.Mesh[] = [];

  // Reusable
  private _boxGeo!: THREE.BoxGeometry;
  private _sphereGeo!: THREE.SphereGeometry;

  // Caustic light pattern
  private _causticLight!: THREE.SpotLight;

  // Cathedral structure
  private _cathedralFloor!: THREE.Mesh;
  private _cathedralWalls: THREE.Mesh[] = [];
  // Ceiling is built as arch segments in _buildCathedralStructure

  // Floating plankton (instanced mesh)
  private _planktonMesh!: THREE.InstancedMesh;
  private _planktonData: { pos: THREE.Vector3; vel: THREE.Vector3; phase: number }[] = [];
  private _planktonDummy = new THREE.Object3D();

  // Kelp/seaweed
  private _kelpMeshes: THREE.Mesh[] = [];

  // God ray planes
  private _godRays: THREE.Mesh[] = [];

  // Pressure wave ring pool
  private _waveRings: THREE.Mesh[] = [];
  private _waveRingTimer = 0;
  private _waveRingPos = new THREE.Vector3();

  // Hazard visuals
  private _ventMeshes: THREE.Group[] = [];
  private _mineMeshes: THREE.Group[] = [];
  private _poisonCloudPool: THREE.Mesh[] = [];

  // Escape phase visuals
  private _escapeActive = false;

  // Falling debris meshes for escape
  private _debrisFallMeshes: THREE.Mesh[] = [];

  get canvas(): HTMLCanvasElement { return this._canvas; }

  init(w: number, h: number): void {
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._canvas = this._renderer.domElement;
    this._canvas.style.cssText = "position:fixed;top:0;left:0;z-index:5;";

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(COL.WATER_DEEP);
    this._fog = new THREE.FogExp2(COL.WATER_DEEP, 0.025);
    this._scene.fog = this._fog;

    this._camera = new THREE.PerspectiveCamera(LEVIATHAN.CAMERA_FOV, w / h, 0.3, 200);

    this._boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this._sphereGeo = new THREE.SphereGeometry(0.5, 8, 6);

    // Lighting — very dark ambient, player lantern is primary light
    this._ambientLight = new THREE.AmbientLight(0x081015, 0.3);
    this._scene.add(this._ambientLight);

    // Player lantern
    this._playerLantern = new THREE.PointLight(COL.LANTERN, 2, LEVIATHAN.LANTERN_RANGE);
    this._playerLantern.castShadow = true;
    this._playerLantern.shadow.mapSize.set(512, 512);
    this._scene.add(this._playerLantern);

    // Flare light (brighter, toggled)
    this._playerLanternFlare = new THREE.PointLight(0xffffcc, 0, LEVIATHAN.LANTERN_FLARE_RADIUS);
    this._scene.add(this._playerLanternFlare);

    // Caustic light from above (faint, simulates surface light filtering down)
    this._causticLight = new THREE.SpotLight(0x224466, 0.4, 100, Math.PI / 4, 0.8);
    this._causticLight.position.set(0, 10, 0);
    this._causticLight.target.position.set(0, -50, 0);
    this._scene.add(this._causticLight);
    this._scene.add(this._causticLight.target);

    this._buildPlayer();
    this._buildPools();
    this._buildPostProcessing(w, h);
  }

  private _buildPlayer(): void {
    this._playerGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: COL.PLAYER, metalness: 0.5, roughness: 0.5 });
    const armorMat = new THREE.MeshStandardMaterial({ color: COL.PLAYER_ARMOR, metalness: 0.6, roughness: 0.4 });

    // Diving suit body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.5), bodyMat);
    body.position.y = 0; body.castShadow = true;
    this._playerGroup.add(body);

    // Helmet (dome)
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.7, roughness: 0.3 });
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), helmetMat);
    helmet.position.y = 0.8; helmet.castShadow = true;
    this._playerGroup.add(helmet);

    // Visor (glowing)
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x44ccff, emissive: 0x44ccff, emissiveIntensity: 0.8 });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.05), visorMat);
    visor.position.set(0, 0.82, 0.32);
    this._playerGroup.add(visor);

    // Arms
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), armorMat);
    armL.position.set(-0.5, 0, 0);
    const armR = armL.clone(); armR.position.set(0.5, 0, 0);
    this._playerGroup.add(armL, armR);

    // Trident (right hand) — shaft + 3 prongs
    const tridentMat = new THREE.MeshStandardMaterial({ color: 0xaabbcc, metalness: 0.9, roughness: 0.2, emissive: 0x4488aa, emissiveIntensity: 0.3 });
    const shaftGroup = new THREE.Group();
    shaftGroup.position.set(0.5, 0.5, -0.3);
    shaftGroup.rotation.x = -0.2;
    // Main shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 4), tridentMat);
    shaftGroup.add(shaft);
    // Center prong (longest)
    const prongMat = new THREE.MeshStandardMaterial({ color: 0xbbccdd, metalness: 0.95, roughness: 0.1, emissive: 0x44aacc, emissiveIntensity: 0.4 });
    const prongC = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.5, 4), prongMat);
    prongC.position.y = 1.25;
    shaftGroup.add(prongC);
    // Left prong
    const prongL = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.4, 4), prongMat.clone());
    prongL.position.set(-0.08, 1.15, 0);
    prongL.rotation.z = 0.15;
    shaftGroup.add(prongL);
    // Right prong
    const prongR = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.4, 4), prongMat.clone());
    prongR.position.set(0.08, 1.15, 0);
    prongR.rotation.z = -0.15;
    shaftGroup.add(prongR);
    // Cross-guard
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.05), tridentMat);
    guard.position.y = 0.95;
    shaftGroup.add(guard);
    this._playerGroup.add(shaftGroup);

    // Lantern (left hand) — glowing sphere
    const lanternMat = new THREE.MeshStandardMaterial({ color: COL.LANTERN, emissive: COL.LANTERN, emissiveIntensity: 1.0 });
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), lanternMat);
    lantern.position.set(-0.55, 0.1, -0.2);
    this._playerGroup.add(lantern);

    // Flippers
    const flipMat = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.3, roughness: 0.7 });
    const flipL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.6), flipMat);
    flipL.position.set(-0.15, -0.7, 0.15);
    const flipR = flipL.clone(); flipR.position.set(0.15, -0.7, 0.15);
    this._playerGroup.add(flipL, flipR);

    this._scene.add(this._playerGroup);
  }

  private _buildPools(): void {
    // Projectiles
    for (let i = 0; i < 20; i++) {
      const mat = new THREE.MeshStandardMaterial({ emissiveIntensity: 0.8 });
      const mesh = new THREE.Mesh(this._sphereGeo, mat);
      mesh.visible = false; this._scene.add(mesh); this._projPool.push(mesh);
    }
    // Particles
    for (let i = 0; i < 200; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true });
      const mesh = new THREE.Mesh(this._sphereGeo, mat);
      mesh.visible = false; this._scene.add(mesh); this._particlePool.push(mesh);
    }
    // Relic shards
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: COL.RELIC, emissive: COL.RELIC, emissiveIntensity: 0.6 });
      const mesh = new THREE.Mesh(this._sphereGeo, mat);
      mesh.scale.setScalar(0.2); mesh.visible = false;
      this._scene.add(mesh); this._shardPool.push(mesh);
    }
    // Pressure wave expanding rings
    for (let i = 0; i < 2; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 24), mat);
      mesh.visible = false; this._scene.add(mesh); this._waveRings.push(mesh);
    }
    // Falling debris for escape phase
    const debrisMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 });
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(this._boxGeo, debrisMat.clone());
      mesh.scale.set(0.3 + Math.random() * 0.5, 0.2 + Math.random() * 0.3, 0.3 + Math.random() * 0.4);
      mesh.visible = false; mesh.castShadow = true;
      this._scene.add(mesh); this._debrisFallMeshes.push(mesh);
    }
    // Sonar ping rings (stronger opacity)
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 32), mat);
      mesh.visible = false; this._scene.add(mesh); this._sonarRings.push(mesh);
    }
  }

  private _buildPostProcessing(sw: number, sh: number): void {
    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(new RenderPass(this._scene, this._camera));

    // Bloom — bioluminescence glow
    this._bloomPass = new UnrealBloomPass(new THREE.Vector2(sw, sh), 0.8, 0.6, 0.7);
    this._composer.addPass(this._bloomPass);

    // Underwater distortion + color grading
    this._underwaterPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uDepth: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uDepth;
        varying vec2 vUv;
        void main() {
          float depthFactor = clamp(uDepth / 150.0, 0.0, 1.0);
          // Underwater waviness — increases with depth (more turbulent at pressure)
          float waveAmp = 0.003 * (1.0 + depthFactor * 3.0);
          float waveFreq = 15.0 * (1.0 + depthFactor * 1.5);
          vec2 uv = vUv;
          uv.x += sin(uv.y * waveFreq + uTime * 2.0) * waveAmp;
          uv.y += cos(uv.x * (waveFreq * 0.8) + uTime * 1.5) * waveAmp * 0.7;
          vec4 tex = texture2D(tDiffuse, uv);
          // Depth color grading — deeper = more blue/dark
          tex.r *= 1.0 - depthFactor * 0.6;
          tex.g *= 1.0 - depthFactor * 0.3;
          tex.b *= 1.0 + depthFactor * 0.15;
          // Chromatic pressure effect at extreme depth
          if (depthFactor > 0.7) {
            float chromaShift = (depthFactor - 0.7) * 0.005;
            tex.r = texture2D(tDiffuse, uv + vec2(chromaShift, 0.0)).r * (1.0 - depthFactor * 0.6);
            tex.b = texture2D(tDiffuse, uv - vec2(chromaShift, 0.0)).b * (1.0 + depthFactor * 0.15);
          }
          // Vignette — darker at depth
          float dist = distance(vUv, vec2(0.5));
          float vig = smoothstep(0.25, 0.85, dist);
          tex.rgb *= 1.0 - vig * (0.45 + depthFactor * 0.35);
          gl_FragColor = tex;
        }
      `,
    });
    this._composer.addPass(this._underwaterPass);
  }

  private _buildCathedralStructure(): void {
    const w = LEVIATHAN.CATHEDRAL_WIDTH;
    const depth = LEVIATHAN.MAX_DEPTH;

    // Floor — sandy/stone floor running the length of the cathedral
    const floorMat = new THREE.MeshStandardMaterial({
      color: COL.SAND, roughness: 0.95, metalness: 0.1,
    });
    this._cathedralFloor = new THREE.Mesh(new THREE.PlaneGeometry(w, depth * 1.2), floorMat);
    this._cathedralFloor.rotation.x = -Math.PI / 2;
    this._cathedralFloor.rotation.z = Math.PI / 2;
    this._cathedralFloor.position.set(0, -depth - 5, 0);
    this._cathedralFloor.receiveShadow = true;
    this._scene.add(this._cathedralFloor);

    // Side walls (two long walls along the cathedral)
    const wallMat = new THREE.MeshStandardMaterial({
      color: COL.STONE, roughness: 0.85, metalness: 0.15, side: THREE.DoubleSide,
    });
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(depth * 1.2, 30), wallMat.clone());
      wall.position.set(side * (w / 2 + 0.5), -depth / 2, 0);
      wall.rotation.y = side * Math.PI / 2;
      wall.receiveShadow = true;
      this._scene.add(wall);
      this._cathedralWalls.push(wall);
    }

    // Vaulted ceiling (arched — series of torus segments)
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a30, roughness: 0.9, metalness: 0.1, side: THREE.DoubleSide,
    });
    for (let i = 0; i < 8; i++) {
      const y = -(i / 8) * depth;
      const arch = new THREE.Mesh(new THREE.TorusGeometry(w / 2 - 2, 0.8, 4, 12, Math.PI), ceilingMat.clone());
      arch.position.set(0, y + 12, 0);
      arch.rotation.z = Math.PI / 2;
      arch.rotation.y = Math.PI / 2;
      this._scene.add(arch);
    }
  }

  private _buildPlankton(): void {
    const count = 120;
    const sparkGeo = new THREE.SphereGeometry(0.03, 3, 2);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0x88bbcc, transparent: true, opacity: 0.5 });
    this._planktonMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, count);
    this._planktonMesh.frustumCulled = false;
    this._scene.add(this._planktonMesh);

    for (let i = 0; i < count; i++) {
      this._planktonData.push({
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * LEVIATHAN.CATHEDRAL_WIDTH * 0.8,
          -(Math.random() * LEVIATHAN.MAX_DEPTH),
          (Math.random() - 0.5) * 25,
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          0.05 + Math.random() * 0.1,
          (Math.random() - 0.5) * 0.1,
        ),
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private _buildKelp(): void {
    // Kelp strands near pillars — swaying tall planes
    const kelpMat = new THREE.MeshStandardMaterial({
      color: 0x336644, emissive: 0x224422, emissiveIntensity: 0.1,
      side: THREE.DoubleSide, transparent: true, opacity: 0.7,
    });
    for (let i = 0; i < 24; i++) {
      const x = (Math.random() - 0.5) * LEVIATHAN.CATHEDRAL_WIDTH * 0.8;
      const y = -(Math.random() * LEVIATHAN.MAX_DEPTH * 0.9);
      const z = (Math.random() - 0.5) * 20;
      const h = 3 + Math.random() * 6;
      const kelp = new THREE.Mesh(new THREE.PlaneGeometry(0.4, h), kelpMat.clone());
      kelp.position.set(x, y + h / 2, z);
      kelp.rotation.y = Math.random() * Math.PI;
      this._scene.add(kelp);
      this._kelpMeshes.push(kelp);
    }
  }

  private _buildGodRays(): void {
    // Faint god ray shafts from surface — angled light planes
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0x4488aa, transparent: true, opacity: 0.02,
      side: THREE.DoubleSide, depthWrite: false,
    });
    for (let i = 0; i < 5; i++) {
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(3, 80), rayMat.clone());
      ray.position.set(
        (Math.random() - 0.5) * 30,
        -20,
        (Math.random() - 0.5) * 15,
      );
      ray.rotation.y = Math.random() * Math.PI;
      ray.rotation.z = (Math.random() - 0.5) * 0.3;
      this._scene.add(ray);
      this._godRays.push(ray);
    }
  }

  private _buildWorld(state: LeviathanState): void {
    // Cathedral structure first
    this._buildCathedralStructure();
    this._buildPlankton();
    this._buildKelp();
    this._buildGodRays();
    // Cathedral pillars — with ornamental base and capital
    const pillarMat = new THREE.MeshStandardMaterial({ color: COL.STONE, roughness: 0.8, metalness: 0.2 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 0.7, metalness: 0.25 });
    for (const pil of state.cathedralPillars) {
      const h = pil.broken ? pil.height * 0.6 : pil.height;
      // Main shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, h, 8), pillarMat.clone());
      shaft.position.set(pil.pos.x, pil.pos.y + h / 2, pil.pos.z);
      shaft.rotation.z = pil.leanAngle;
      shaft.castShadow = true; shaft.receiveShadow = true;
      this._scene.add(shaft); this._pillarMeshes.push(shaft);
      // Base (wider)
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 1.0, 8), capMat.clone());
      base.position.set(pil.pos.x, pil.pos.y + 0.5, pil.pos.z);
      this._scene.add(base);
      // Capital (ornamental top) — only if not broken
      if (!pil.broken) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.8, 0.8, 8), capMat.clone());
        cap.position.set(pil.pos.x, pil.pos.y + h - 0.4, pil.pos.z);
        this._scene.add(cap);
        // Ring decoration
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.1, 4, 8), capMat.clone());
        ring.position.set(pil.pos.x, pil.pos.y + h * 0.5, pil.pos.z);
        ring.rotation.x = Math.PI / 2;
        this._scene.add(ring);
      }
    }

    // Corals (bioluminescent)
    for (const coral of state.corals) {
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({
        color: coral.glowColor, emissive: coral.glowColor,
        emissiveIntensity: 0.4, roughness: 0.6, metalness: 0.2,
      });
      let mesh: THREE.Mesh;
      switch (coral.type) {
        case "brain": mesh = new THREE.Mesh(new THREE.SphereGeometry(coral.size, 8, 6), mat); break;
        case "fan": mesh = new THREE.Mesh(new THREE.PlaneGeometry(coral.size * 2, coral.size * 1.5), mat.clone()); mesh.material = new THREE.MeshStandardMaterial({ ...mat, side: THREE.DoubleSide, color: coral.glowColor, emissive: coral.glowColor, emissiveIntensity: 0.4 }); break;
        case "tube": mesh = new THREE.Mesh(new THREE.CylinderGeometry(coral.size * 0.3, coral.size * 0.3, coral.size * 2, 5), mat); break;
        default: mesh = new THREE.Mesh(new THREE.ConeGeometry(coral.size * 0.5, coral.size * 1.5, 5), mat); break;
      }
      mesh.position.set(0, coral.size * 0.5, 0);
      group.add(mesh);
      // Point light only on every 3rd coral (performance — limit total lights)
      if (state.corals.indexOf(coral) % 3 === 0) {
        const glow = new THREE.PointLight(coral.glowColor, 0.4, 8);
        glow.position.set(0, coral.size, 0);
        group.add(glow);
      }
      group.position.set(coral.pos.x, coral.pos.y, coral.pos.z);
      this._scene.add(group); this._coralMeshes.push(group);
    }

    // Ruins — altars get special glowing treatment
    const ruinMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9, metalness: 0.1 });
    const altarMat = new THREE.MeshStandardMaterial({
      color: 0x556655, roughness: 0.6, metalness: 0.3,
      emissive: 0x44ccaa, emissiveIntensity: 0.3,
    });
    for (const ruin of state.ruins) {
      let mesh: THREE.Mesh;
      const mat = ruin.type === "altar" ? altarMat.clone() : ruinMat.clone();
      switch (ruin.type) {
        case "arch": mesh = new THREE.Mesh(new THREE.TorusGeometry(ruin.size, 0.5, 6, 8, Math.PI), mat); break;
        case "wall": mesh = new THREE.Mesh(new THREE.BoxGeometry(ruin.size * 3, ruin.size * 2, 0.5), mat); break;
        case "altar": {
          mesh = new THREE.Mesh(new THREE.BoxGeometry(ruin.size * 2, ruin.size * 0.6, ruin.size * 1.2), mat);
          // Altar ornamental ring
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(ruin.size * 0.8, 0.1, 4, 12),
            new THREE.MeshStandardMaterial({ color: 0x44ccaa, emissive: 0x44ccaa, emissiveIntensity: 0.5 }),
          );
          ring.position.set(ruin.pos.x, ruin.pos.y + ruin.size * 0.4, ruin.pos.z);
          ring.rotation.x = Math.PI / 2;
          this._scene.add(ring);
          // Altar point light — golden/teal beacon
          const altarLight = new THREE.PointLight(0x44ccaa, 0.8, 12);
          altarLight.position.set(ruin.pos.x, ruin.pos.y + 2, ruin.pos.z);
          this._scene.add(altarLight);
          // Floating crystal above altar
          const crystalMat = new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x44ffaa, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 });
          const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), crystalMat);
          crystal.position.set(ruin.pos.x, ruin.pos.y + 2.5, ruin.pos.z);
          this._scene.add(crystal);
          break;
        }
        case "statue": mesh = new THREE.Mesh(new THREE.CylinderGeometry(ruin.size * 0.4, ruin.size * 0.5, ruin.size * 2.5, 6), mat); break;
        default: mesh = new THREE.Mesh(this._boxGeo, mat); mesh.scale.set(ruin.size, ruin.size * 0.5, ruin.size); break;
      }
      mesh.position.set(ruin.pos.x, ruin.pos.y, ruin.pos.z);
      mesh.rotation.y = ruin.rotation;
      mesh.castShadow = true;
      this._scene.add(mesh); this._ruinMeshes.push(mesh);
    }

    // Air pockets (glowing bubble spheres)
    for (const pocket of state.airPockets) {
      const mat = new THREE.MeshStandardMaterial({
        color: COL.AIR_POCKET, emissive: COL.AIR_POCKET,
        emissiveIntensity: 0.5, transparent: true, opacity: 0.3,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(pocket.radius, 12, 8), mat);
      mesh.position.set(pocket.pos.x, pocket.pos.y, pocket.pos.z);
      this._scene.add(mesh); this._airPocketMeshes.push(mesh);
      // Glow light
      const light = new THREE.PointLight(COL.AIR_POCKET, 0.5, pocket.radius * 3);
      light.position.copy(mesh.position);
      this._scene.add(light);
    }

    // Fragments (golden glowing)
    for (const frag of state.fragments) {
      const mat = new THREE.MeshStandardMaterial({
        color: COL.FRAGMENT, emissive: COL.FRAGMENT, emissiveIntensity: 1.0,
        metalness: 0.9, roughness: 0.1,
      });
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), mat);
      mesh.position.set(frag.pos.x, frag.pos.y, frag.pos.z);
      this._scene.add(mesh); this._fragmentMeshes.push(mesh);
      const light = new THREE.PointLight(COL.FRAGMENT, 1, LEVIATHAN.FRAGMENT_GLOW_RANGE);
      light.position.copy(mesh.position);
      this._scene.add(light);
      this._fragmentLights.push(light);
    }

    // Current visuals (translucent stream indicators)
    for (const current of state.currents) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x44aacc, transparent: true, opacity: 0.06, side: THREE.DoubleSide });
      const len = 20;
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(current.width * 0.5, current.width * 0.5, len, 8, 1, true), mat);
      const mid = { x: (current.startPos.x + current.endPos.x) / 2, y: (current.startPos.y + current.endPos.y) / 2, z: (current.startPos.z + current.endPos.z) / 2 };
      mesh.position.set(mid.x, mid.y, mid.z);
      mesh.rotation.z = Math.atan2(current.direction.y, 1) || 0;
      mesh.rotation.y = Math.atan2(current.direction.x, current.direction.z);
      this._scene.add(mesh); this._currentVisuals.push(mesh);
    }

    // ---- Hazard meshes ----

    // Abyssal vents — glowing cracks in the floor
    for (const vent of state.vents) {
      const group = new THREE.Group();
      // Base crack ring
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xff4422, emissive: 0xff4422, emissiveIntensity: 0.4,
        transparent: true, opacity: 0.6, side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(vent.radius * 0.3, vent.radius, 12), ringMat);
      ring.rotation.x = -Math.PI / 2;
      group.add(ring);
      // Glow column (visible when active)
      const colMat = new THREE.MeshBasicMaterial({
        color: 0xff6622, transparent: true, opacity: 0.08, side: THREE.DoubleSide,
      });
      const col = new THREE.Mesh(new THREE.CylinderGeometry(vent.radius * 0.8, vent.radius, 6, 8, 1, true), colMat);
      col.position.y = 3;
      group.add(col);
      // Point light
      const light = new THREE.PointLight(0xff4422, 0.5, vent.radius * 3);
      light.position.y = 1;
      group.add(light);
      group.position.set(vent.pos.x, vent.pos.y, vent.pos.z);
      this._scene.add(group);
      this._ventMeshes.push(group);
    }

    // Bioluminescent mines — glowing orbs with danger aura
    for (const mine of state.mines) {
      const group = new THREE.Group();
      // Core orb
      const orbMat = new THREE.MeshStandardMaterial({
        color: 0xffaa44, emissive: 0xffaa44, emissiveIntensity: 0.8,
        metalness: 0.3, roughness: 0.2,
      });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), orbMat);
      group.add(orb);
      // Danger ring
      const dangerMat = new THREE.MeshBasicMaterial({
        color: 0xff6644, transparent: true, opacity: 0.1, side: THREE.DoubleSide,
      });
      const dangerRing = new THREE.Mesh(new THREE.RingGeometry(mine.radius - 0.2, mine.radius, 16), dangerMat);
      dangerRing.rotation.x = -Math.PI / 2;
      group.add(dangerRing);
      // Tendril spikes
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0xcc8833, emissive: 0xff8844, emissiveIntensity: 0.3 });
      for (let s = 0; s < 4; s++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 3), spikeMat);
        const angle = (s / 4) * Math.PI * 2;
        spike.position.set(Math.cos(angle) * 0.25, 0, Math.sin(angle) * 0.25);
        spike.rotation.z = angle;
        group.add(spike);
      }
      // Light
      const light = new THREE.PointLight(0xffaa44, 0.4, 6);
      group.add(light);
      group.position.set(mine.pos.x, mine.pos.y, mine.pos.z);
      this._scene.add(group);
      this._mineMeshes.push(group);
    }

    // Poison cloud pool (max 8)
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x44aa44, transparent: true, opacity: 0.1, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), mat);
      mesh.visible = false;
      this._scene.add(mesh);
      this._poisonCloudPool.push(mesh);
    }

    this._worldBuilt = true;
  }

  update(state: LeviathanState, _dt: number): void {
    if (!this._worldBuilt && state.phase !== "menu") {
      this._buildWorld(state);
    }

    // Menu ambient scene — gentle camera drift through dark water with particles
    if (state.phase === "menu") {
      this._camera.position.set(
        Math.sin(state.gameTime * 0.1) * 5,
        -5 + Math.sin(state.gameTime * 0.2) * 2,
        Math.cos(state.gameTime * 0.1) * 5,
      );
      this._camera.lookAt(0, -10, 0);
      this._playerLantern.position.copy(this._camera.position);
      this._playerLantern.intensity = 1.5 + Math.sin(state.gameTime * 4) * 0.3;
      this._composer.render();
      return;
    }

    const p = state.player;

    // Camera
    const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
    this._cameraTarget.set(
      p.pos.x + sinY * LEVIATHAN.CAMERA_FOLLOW_DIST,
      p.pos.y + LEVIATHAN.CAMERA_FOLLOW_HEIGHT,
      p.pos.z + cosY * LEVIATHAN.CAMERA_FOLLOW_DIST,
    );
    this._camera.position.lerp(this._cameraTarget, LEVIATHAN.CAMERA_LERP);
    this._camera.lookAt(p.pos.x, p.pos.y, p.pos.z);

    if (state.screenShake > 0) {
      this._camera.position.x += (Math.random() - 0.5) * state.screenShakeIntensity * 0.1;
      this._camera.position.y += (Math.random() - 0.5) * state.screenShakeIntensity * 0.1;
    }

    // Player
    this._playerGroup.position.set(p.pos.x, p.pos.y, p.pos.z);
    this._playerGroup.rotation.y = p.yaw + Math.PI;
    // Swimming bob
    if (p.action === "swimming" || p.action === "sprinting") {
      const freq = p.action === "sprinting" ? 10 : 6;
      this._playerGroup.rotation.z = Math.sin(state.gameTime * freq) * 0.08;
      // Flipper kick
      // Children: 7=flipL, 8=flipR
      const flipL = this._playerGroup.children[7] as THREE.Mesh;
      const flipR = this._playerGroup.children[8] as THREE.Mesh;
      if (flipL && flipR) {
        flipL.rotation.x = Math.sin(state.gameTime * freq) * 0.4;
        flipR.rotation.x = -Math.sin(state.gameTime * freq) * 0.4;
      }
    } else {
      this._playerGroup.rotation.z = 0;
    }

    // Lantern follows player
    const lanternFlicker = 1 + Math.sin(state.gameTime * 8) * 0.1 * LEVIATHAN.LANTERN_FLICKER_AMP;
    const lanternRange = LEVIATHAN.LANTERN_RANGE + p.lanternLevel * 3;
    this._playerLantern.position.set(p.pos.x, p.pos.y + 0.5, p.pos.z);
    this._playerLantern.intensity = 2 * lanternFlicker;
    this._playerLantern.distance = lanternRange;

    // Lantern flare
    this._playerLanternFlare.position.copy(this._playerLantern.position);
    this._playerLanternFlare.intensity = p.lanternFlareTimer > 0 ? 4 : 0;

    // Fog density based on depth (deeper = thicker)
    const depthFog = 0.02 + p.depth * 0.0003;
    this._fog.density = depthFog;
    this._fog.color.setHex(p.depth > 100 ? 0x020408 : p.depth > 50 ? 0x040810 : 0x081520);

    // Caustic light follows player from above
    this._causticLight.position.set(p.pos.x, p.pos.y + 30, p.pos.z);
    this._causticLight.target.position.set(p.pos.x, p.pos.y - 20, p.pos.z);
    // Caustics fade with depth
    this._causticLight.intensity = Math.max(0, 0.4 - p.depth * 0.003);

    // Ambient dims with depth
    this._ambientLight.intensity = Math.max(0.05, 0.3 - p.depth * 0.002);

    // Fragment animation — hide light when collected
    for (let i = 0; i < state.fragments.length && i < this._fragmentMeshes.length; i++) {
      const frag = state.fragments[i];
      const mesh = this._fragmentMeshes[i];
      mesh.visible = !frag.collected;
      if (i < this._fragmentLights.length) {
        this._fragmentLights[i].intensity = frag.collected ? 0 : 1;
      }
      if (!frag.collected) {
        mesh.rotation.y = state.gameTime * 1.5 + frag.glowPhase;
        mesh.rotation.x = Math.sin(state.gameTime + frag.glowPhase) * 0.3;
        mesh.position.y = frag.pos.y + Math.sin(state.gameTime * 2 + frag.glowPhase) * 0.5;
        if (i < this._fragmentLights.length) {
          this._fragmentLights[i].position.y = mesh.position.y;
        }
      }
    }

    // Air pocket bubbling
    for (let i = 0; i < state.airPockets.length && i < this._airPocketMeshes.length; i++) {
      const pocket = state.airPockets[i];
      const mesh = this._airPocketMeshes[i];
      const scale = 1 + Math.sin(state.gameTime * 2 + pocket.bubblePhase) * 0.1;
      mesh.scale.setScalar(scale);
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0.25 + Math.sin(state.gameTime * 3 + pocket.bubblePhase) * 0.05;
    }

    // Coral glow pulse
    for (const group of this._coralMeshes) {
      const light = group.children[1] as THREE.PointLight;
      if (light) light.intensity = 0.2 + Math.sin(state.gameTime * 1.5 + group.position.x) * 0.15;
    }

    // Current shimmer
    for (const cv of this._currentVisuals) {
      (cv.material as THREE.MeshBasicMaterial).opacity = 0.04 + Math.sin(state.gameTime * 2 + cv.position.y) * 0.02;
    }

    // Floating plankton
    if (this._planktonMesh && this._planktonData.length > 0) {
      for (let i = 0; i < this._planktonData.length; i++) {
        const pk = this._planktonData[i];
        pk.pos.x += pk.vel.x * _dt + Math.sin(state.gameTime * 0.5 + pk.phase) * _dt * 0.2;
        pk.pos.y += pk.vel.y * _dt;
        pk.pos.z += pk.vel.z * _dt + Math.cos(state.gameTime * 0.3 + pk.phase) * _dt * 0.15;
        // Reset if drifted too far from player
        if (Math.abs(pk.pos.y - p.pos.y) > 30) {
          pk.pos.y = p.pos.y + (Math.random() - 0.5) * 20;
          pk.pos.x = p.pos.x + (Math.random() - 0.5) * LEVIATHAN.CATHEDRAL_WIDTH * 0.6;
        }
        this._planktonDummy.position.copy(pk.pos);
        const brightness = 0.5 + Math.sin(state.gameTime * 2 + pk.phase) * 0.3;
        this._planktonDummy.scale.setScalar(0.5 + brightness * 0.5);
        this._planktonDummy.updateMatrix();
        this._planktonMesh.setMatrixAt(i, this._planktonDummy.matrix);
      }
      this._planktonMesh.instanceMatrix.needsUpdate = true;
    }

    // Kelp swaying
    for (let i = 0; i < this._kelpMeshes.length; i++) {
      const kelp = this._kelpMeshes[i];
      kelp.rotation.z = Math.sin(state.gameTime * 0.8 + i * 0.7) * 0.15;
      kelp.rotation.x = Math.sin(state.gameTime * 0.5 + i * 1.1) * 0.08;
    }

    // ---- Hazard visuals ----

    // Abyssal vents — pulse glow when active
    for (let i = 0; i < state.vents.length && i < this._ventMeshes.length; i++) {
      const vent = state.vents[i];
      const group = this._ventMeshes[i];
      const col = group.children[1] as THREE.Mesh; // glow column
      const light = group.children[2] as THREE.PointLight;
      const ring = group.children[0] as THREE.Mesh;
      if (vent.active) {
        (col.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(state.gameTime * 4 + i) * 0.04;
        col.visible = true;
        light.intensity = 0.6 + Math.sin(state.gameTime * 3) * 0.2;
        (ring.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6;
      } else {
        col.visible = false;
        light.intensity = 0.1;
        (ring.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1;
      }
    }

    // Bioluminescent mines — pulse when armed, dim when disarmed
    for (let i = 0; i < state.mines.length && i < this._mineMeshes.length; i++) {
      const mine = state.mines[i];
      const group = this._mineMeshes[i];
      const orb = group.children[0] as THREE.Mesh;
      const light = group.children[group.children.length - 1] as THREE.PointLight;
      if (mine.armed) {
        (orb.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.sin(state.gameTime * 3 + mine.glowPhase) * 0.3;
        orb.scale.setScalar(1 + Math.sin(state.gameTime * 4 + mine.glowPhase) * 0.1);
        if (light.isLight) light.intensity = 0.4 + Math.sin(state.gameTime * 3) * 0.15;
        // Proximity warning — mine brightens when player near
        const dToMine = dist3Inner(p.pos, mine.pos);
        if (dToMine < LEVIATHAN.MINE_TRIGGER_RADIUS * 2) {
          (orb.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
          orb.scale.setScalar(1.3);
          if (light.isLight) light.intensity = 0.8;
        }
      } else {
        (orb.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.05;
        orb.scale.setScalar(0.5);
        if (light.isLight) light.intensity = 0.05;
      }
    }

    // Poison clouds — show/hide pooled meshes
    for (const m of this._poisonCloudPool) m.visible = false;
    for (let i = 0; i < state.poisonClouds.length && i < this._poisonCloudPool.length; i++) {
      const cloud = state.poisonClouds[i];
      const mesh = this._poisonCloudPool[i];
      mesh.position.set(cloud.pos.x, cloud.pos.y, cloud.pos.z);
      mesh.scale.setScalar(cloud.radius * (1 + Math.sin(state.gameTime * 2 + i) * 0.15));
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.08 + (cloud.timer / LEVIATHAN.POISON_CLOUD_DURATION) * 0.06;
      mesh.visible = true;
    }

    // God rays — shift with time, fade with depth
    for (let i = 0; i < this._godRays.length; i++) {
      const ray = this._godRays[i];
      const rayMat = ray.material as THREE.MeshBasicMaterial;
      // Rays only visible in shallow water
      const rayOpacity = Math.max(0, 0.025 - p.depth * 0.0002);
      rayMat.opacity = rayOpacity + Math.sin(state.gameTime * 0.4 + i * 1.3) * 0.008;
      // Slight horizontal drift
      ray.position.x += Math.sin(state.gameTime * 0.1 + i) * _dt * 0.5;
      ray.position.y = p.pos.y + 10; // follow player depth
    }

    // ---- Charged attack glow on player ----
    if (state.chargeHoldTimer > 0.1) {
      const chargeT = Math.min(1, state.chargeHoldTimer / LEVIATHAN.HEAVY_ATTACK_CHARGE_TIME);
      const body0 = this._playerGroup.children[0] as THREE.Mesh;
      if (body0) {
        (body0.material as THREE.MeshStandardMaterial).emissive.setHex(chargeT >= 1 ? 0xffcc44 : 0x4488cc);
        (body0.material as THREE.MeshStandardMaterial).emissiveIntensity = chargeT * 0.8;
      }
      // Trident shaft glows during charge
      const sg = this._playerGroup.children[5] as THREE.Group;
      if (sg?.children?.[0]) {
        ((sg.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + chargeT * 1.5;
      }
      // Lantern flickers faster during charge
      this._playerLantern.intensity = 2 * (1 + chargeT * 0.5) * lanternFlicker;
    }

    // ---- Escape urgency: red pulse at <15s ----
    if (state.escaping && state.escapeTimer > 0 && state.escapeTimer < 15) {
      const urgency = 1 - state.escapeTimer / 15;
      const pulse = 0.5 + Math.sin(state.gameTime * (6 + urgency * 8)) * 0.3;
      this._ambientLight.color.setHex(0x1a0505);
      this._ambientLight.intensity = 0.1 + pulse * urgency * 0.15;
      this._fog.color.setHex(0x0a0204);
    }

    // ---- Grabbed visual: purple tint + shake ----
    if (p.grabbedTimer > 0) {
      this._playerGroup.position.x += Math.sin(state.gameTime * 20) * 0.05;
      this._playerGroup.position.z += Math.cos(state.gameTime * 25) * 0.04;
      // Purple tint on player body
      const body0 = this._playerGroup.children[0] as THREE.Mesh;
      if (body0) {
        (body0.material as THREE.MeshStandardMaterial).emissive.setHex(0x664488);
        (body0.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + Math.sin(state.gameTime * 6) * 0.2;
      }
    } else {
      const body0 = this._playerGroup.children[0] as THREE.Mesh;
      if (body0 && !state.escaping) {
        (body0.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      }
    }

    // ---- Damage flash: player body white flash ----
    if (state.screenFlash.timer > 0 && state.screenFlash.color === "#ff4444") {
      const body0 = this._playerGroup.children[0] as THREE.Mesh;
      if (body0) {
        (body0.material as THREE.MeshStandardMaterial).emissive.setHex(0xff4444);
        (body0.material as THREE.MeshStandardMaterial).emissiveIntensity = state.screenFlash.timer * 3;
      }
    }

    // ---- Air pocket refill visual ----
    for (const pocket of state.airPockets) {
      if (dist3Inner(p.pos, pocket.pos) < pocket.radius) {
        // Player is in air pocket — reduce fog locally, lantern brightens
        this._playerLantern.intensity = 3 * lanternFlicker;
        this._fog.density = Math.max(0.005, depthFog * 0.4);
        // Visor glow green
        const visor = this._playerGroup.children[2] as THREE.Mesh;
        if (visor) {
          (visor.material as THREE.MeshStandardMaterial).emissive.setHex(0x44ffaa);
        }
        break;
      } else {
        const visor = this._playerGroup.children[2] as THREE.Mesh;
        if (visor) {
          (visor.material as THREE.MeshStandardMaterial).emissive.setHex(0x44ccff);
        }
      }
    }

    // ---- Sonar: temporary scene brightness boost ----
    if (p.sonarActive > 0) {
      const sonarBoost = Math.min(1, p.sonarActive / 2);
      this._ambientLight.intensity = Math.max(0.05, 0.3 - p.depth * 0.002) + sonarBoost * 0.3;
      this._playerLantern.distance = lanternRange + sonarBoost * 15;
    }

    // ---- Lantern flare: bloom spike + fog whiteout ----
    if (p.lanternFlareTimer > 0) {
      const flareT = p.lanternFlareTimer / LEVIATHAN.LANTERN_FLARE_DURATION;
      this._bloomPass.strength = 0.7 + p.depth * 0.003 + flareT * 1.5;
      this._fog.color.setHex(0x223344);
      this._playerLanternFlare.intensity = 6 * flareT;
    }

    // ---- Depth zone ambient color signatures ----
    if (!state.escaping && !p.lanternFlareTimer) {
      const zone = p.depthLevel;
      const zoneColors = [0x081520, 0x061218, 0x060a14, 0x040610, 0x020408];
      const zoneAmbient = [0x081520, 0x0a1218, 0x080a18, 0x060818, 0x040410];
      this._scene.background = new THREE.Color(zoneColors[zone] || 0x020408);
      if (p.sonarActive <= 0) {
        this._ambientLight.color.setHex(zoneAmbient[zone] || 0x040410);
      }
    }

    // Player trident attack animation
    // Children: 0=body, 1=helmet, 2=visor, 3=armL, 4=armR, 5=shaftGroup(Group), 6=lantern, 7=flipL, 8=flipR
    const armR = this._playerGroup.children[4] as THREE.Mesh;
    const shaftGroup = this._playerGroup.children[5] as THREE.Group;
    const shaftMesh = shaftGroup?.children?.[0] as THREE.Mesh | undefined;
    if (armR && shaftGroup && p.tridentCD > LEVIATHAN.TRIDENT_COOLDOWN * 0.4) {
      const t = (p.tridentCD - LEVIATHAN.TRIDENT_COOLDOWN * 0.4) / (LEVIATHAN.TRIDENT_COOLDOWN * 0.6);
      armR.rotation.x = -t * 1.5;
      shaftGroup.rotation.x = -0.2 - t * 1.0;
      // Trident glow on thrust — access actual shaft mesh material
      if (shaftMesh) {
        (shaftMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + t * 1.2;
      }
    } else if (shaftGroup) {
      shaftGroup.rotation.x = -0.2;
      if (shaftMesh) {
        (shaftMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;
      }
    }

    // Player lantern bob on left arm
    const armL = this._playerGroup.children[3] as THREE.Mesh;
    if (armL && (p.action === "swimming" || p.action === "sprinting")) {
      armL.rotation.x = Math.sin(state.gameTime * 4) * 0.15;
    }

    // Escape phase visuals — red-shifted lighting, falling debris particles
    if (state.escaping && !this._escapeActive) {
      this._escapeActive = true;
    }
    if (this._escapeActive) {
      // Red emergency lighting
      this._ambientLight.color.setHex(0x1a0808);
      this._playerLantern.color.setHex(0xffaa66);
      // Screen shake rumble
      if (state.tick % 60 === 0) {
        state.screenShake = Math.max(state.screenShake, 0.1);
        state.screenShakeIntensity = Math.max(state.screenShakeIntensity, 2);
      }
    }

    // ---- Pressure wave expanding ring ----
    if (p.pressureWaveCD > LEVIATHAN.PRESSURE_WAVE_COOLDOWN * 0.85) {
      const t = (p.pressureWaveCD - LEVIATHAN.PRESSURE_WAVE_COOLDOWN * 0.85) / (LEVIATHAN.PRESSURE_WAVE_COOLDOWN * 0.15);
      this._waveRingTimer = t;
      this._waveRingPos.copy(this._playerGroup.position);
    }
    for (let i = 0; i < this._waveRings.length; i++) {
      const ring = this._waveRings[i];
      if (this._waveRingTimer > 0) {
        ring.visible = true;
        const expand = (1 - this._waveRingTimer) * LEVIATHAN.PRESSURE_WAVE_RADIUS * (1 + i * 0.3);
        ring.scale.setScalar(expand);
        ring.position.copy(this._waveRingPos);
        ring.quaternion.copy(this._camera.quaternion);
        (ring.material as THREE.MeshBasicMaterial).opacity = this._waveRingTimer * 0.5;
      } else {
        ring.visible = false;
      }
    }
    if (this._waveRingTimer > 0) this._waveRingTimer -= _dt * 3;

    // ---- Escape phase falling debris meshes ----
    if (this._escapeActive) {
      for (let i = 0; i < this._debrisFallMeshes.length; i++) {
        const dm = this._debrisFallMeshes[i];
        if (!dm.visible || dm.position.y < p.pos.y - 15) {
          // Reset to random position above player
          dm.position.set(
            p.pos.x + (Math.random() - 0.5) * 25,
            p.pos.y + 12 + Math.random() * 8,
            p.pos.z + (Math.random() - 0.5) * 15,
          );
          dm.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
          dm.visible = true;
        }
        // Fall
        dm.position.y -= _dt * (3 + i * 0.5);
        dm.rotation.x += _dt * 2;
        dm.rotation.z += _dt * 1.5;
      }
    }

    // ---- Player death camera: slow drift upward ----
    if (p.action === "dead") {
      this._camera.position.y += _dt * 1.5;
      this._camera.position.x += Math.sin(state.gameTime * 0.3) * _dt * 0.3;
      this._camera.lookAt(p.pos.x, p.pos.y, p.pos.z);
      // Player sinks and rotates
      this._playerGroup.rotation.z += _dt * 0.5;
      this._playerGroup.position.y -= _dt * 0.3;
      // Darken scene
      this._ambientLight.intensity = Math.max(0, this._ambientLight.intensity - _dt * 0.1);
    }

    // Update dynamic entities
    this._updateEnemies(state);
    this._updateProjectiles(state);
    this._updateParticles(state);
    this._updateShards(state);
    this._updateSonarPings(state);

    // Post-processing uniforms
    this._underwaterPass.uniforms.uTime.value = state.gameTime;
    this._underwaterPass.uniforms.uDepth.value = p.depth;

    // Bloom stronger at depth (more contrast with bioluminescence)
    this._bloomPass.strength = 0.7 + p.depth * 0.003;

    this._composer.render();
  }

  private _updateEnemies(state: LeviathanState): void {
    for (const [id, group] of this._enemyMeshes) {
      if (!state.enemies.has(id)) {
        group.traverse(c => { if ((c as THREE.Mesh).isMesh) { const m = (c as THREE.Mesh).material; if (Array.isArray(m)) m.forEach(mm => mm.dispose()); else if (m) m.dispose(); } });
        this._scene.remove(group); this._enemyMeshes.delete(id);
      }
    }

    const enemyColors: Record<string, { body: number; glow: number }> = {
      angler: { body: COL.ANGLER, glow: COL.ANGLER_LURE },
      jellyfish: { body: 0x442244, glow: COL.JELLYFISH },
      coral_golem: { body: COL.CORAL_GOLEM, glow: 0x44aa44 },
      tentacle: { body: COL.TENTACLE, glow: 0x6644aa },
      siren: { body: COL.SIREN, glow: 0xaa44ff },
      abyssal_knight: { body: COL.ABYSSAL, glow: 0xff4444 },
    };

    for (const [id, enemy] of state.enemies) {
      let group = this._enemyMeshes.get(id);
      if (!group) {
        group = new THREE.Group();
        const colors = enemyColors[enemy.type] || { body: 0x444444, glow: 0x448844 };
        const mat = new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.6, metalness: 0.3 });
        const glowMat = new THREE.MeshStandardMaterial({ color: colors.glow, emissive: colors.glow, emissiveIntensity: 0.6 });

        switch (enemy.type) {
          case "angler": {
            // Bulbous body with dangling lure
            const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), mat);
            body.scale.set(1.2, 0.8, 1); body.castShadow = true;
            group.add(body);
            // Huge jaw
            const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.5), mat);
            jaw.position.set(0, -0.3, 0.4);
            group.add(jaw);
            // Dangling lure on stalk
            const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), mat);
            stalk.position.set(0, 0.7, 0.3); stalk.rotation.z = 0.3;
            group.add(stalk);
            const lure = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), glowMat);
            lure.position.set(0.3, 1.1, 0.3);
            group.add(lure);
            const light = new THREE.PointLight(colors.glow, 0.6, 10);
            light.position.set(0.3, 1.1, 0.3);
            group.add(light);
            break;
          }
          case "jellyfish": {
            // Dome + trailing tentacles
            const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), glowMat);
            dome.castShadow = true;
            group.add(dome);
            // Tentacles (4 trailing cylinders)
            const tentMat = new THREE.MeshStandardMaterial({ color: colors.glow, emissive: colors.glow, emissiveIntensity: 0.3, transparent: true, opacity: 0.6 });
            for (let t = 0; t < 4; t++) {
              const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.01, 1.2, 3), tentMat);
              tent.position.set((t - 1.5) * 0.15, -0.6, 0);
              group.add(tent);
            }
            const light = new THREE.PointLight(colors.glow, 0.4, 6);
            light.position.y = 0; group.add(light);
            break;
          }
          case "coral_golem": {
            // Massive rocky body with coral growths
            const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 1.5), mat);
            torso.castShadow = true; group.add(torso);
            // Coral growths on shoulders
            const coralMat = new THREE.MeshStandardMaterial({ color: 0x44aa66, emissive: 0x44aa66, emissiveIntensity: 0.3 });
            const coralL = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1, 5), coralMat);
            coralL.position.set(-1.2, 1, 0); group.add(coralL);
            const coralR = coralL.clone(); coralR.position.x = 1.2; group.add(coralR);
            // Fists
            const fist = new THREE.Mesh(this._sphereGeo, mat);
            fist.scale.setScalar(0.8); fist.position.set(-1.3, -0.5, 0); group.add(fist);
            const fistR = fist.clone(); fistR.position.x = 1.3; group.add(fistR);
            const light = new THREE.PointLight(colors.glow, 0.3, 8);
            light.position.y = 1; group.add(light);
            break;
          }
          case "tentacle": {
            // Thick segmented tentacle rising from floor
            const segMat = new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.7, metalness: 0.2 });
            for (let s = 0; s < 5; s++) {
              const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.5 - s * 0.06, 0.5 - (s - 1) * 0.06, 1.5, 6), segMat);
              seg.position.y = s * 1.3; seg.castShadow = true;
              seg.rotation.z = Math.sin(s * 0.8) * 0.15;
              group.add(seg);
            }
            // Suction cups (glow)
            const cupMat = new THREE.MeshStandardMaterial({ color: colors.glow, emissive: colors.glow, emissiveIntensity: 0.4 });
            for (let c = 0; c < 3; c++) {
              const cup = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 4), cupMat);
              cup.position.set(0.4, c * 1.5 + 0.5, 0); group.add(cup);
            }
            const light = new THREE.PointLight(colors.glow, 0.4, 8);
            light.position.y = 3; group.add(light);
            break;
          }
          case "siren": {
            // Ghostly humanoid figure
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.8, 6), mat);
            body.castShadow = true; group.add(body);
            const head = new THREE.Mesh(this._sphereGeo, mat);
            head.scale.setScalar(0.5); head.position.y = 1.2; group.add(head);
            // Flowing "hair" (trailing planes)
            const hairMat = new THREE.MeshStandardMaterial({ color: colors.glow, emissive: colors.glow, emissiveIntensity: 0.4, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
            const hair = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.5), hairMat);
            hair.position.set(0, 0.5, -0.3); group.add(hair);
            // Glowing eyes
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), glowMat);
            eye.position.set(-0.12, 1.25, 0.2); group.add(eye);
            const eyeR = eye.clone(); eyeR.position.x = 0.12; group.add(eyeR);
            const light = new THREE.PointLight(colors.glow, 0.5, 10);
            light.position.y = 1; group.add(light);
            break;
          }
          case "abyssal_knight": {
            // Corrupted armored knight — large, dark, menacing
            const torso = new THREE.Mesh(this._boxGeo, mat);
            torso.scale.set(2, 2.5, 1.5); torso.castShadow = true; group.add(torso);
            const helm = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 6), mat);
            helm.position.y = 1.8; helm.scale.y = 0.8; group.add(helm);
            // Corrupted sword
            const swordMat = new THREE.MeshStandardMaterial({ color: 0x884444, emissive: 0xff4444, emissiveIntensity: 0.5, metalness: 0.9 });
            const sword = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3, 0.06), swordMat);
            sword.position.set(1.3, 0.5, 0); group.add(sword);
            // Shield
            const shieldMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.6 });
            const shield = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.5, 1), shieldMat);
            shield.position.set(-1.3, 0.3, 0); group.add(shield);
            // Glowing visor
            const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.05), glowMat);
            visor.position.set(0, 1.85, 0.55); group.add(visor);
            // Dark aura
            const auraMat = new THREE.MeshBasicMaterial({ color: 0x441122, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
            const aura = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), auraMat);
            group.add(aura);
            const light = new THREE.PointLight(colors.glow, 1.5, 20);
            light.position.y = 1; group.add(light);
            break;
          }
          default: {
            const body = new THREE.Mesh(this._boxGeo, mat);
            body.castShadow = true; group.add(body);
            const glowOrb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), glowMat);
            glowOrb.position.set(0, 0.8, 0.4); group.add(glowOrb);
            const light = new THREE.PointLight(colors.glow, 0.5, 8);
            light.position.y = 0.5; group.add(light);
            break;
          }
        }

        group.traverse(c => { if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).castShadow = true; });
        group.scale.setScalar(0.01);
        this._scene.add(group); this._enemyMeshes.set(id, group);
      }

      group.position.set(enemy.pos.x, enemy.pos.y, enemy.pos.z);
      group.rotation.y = enemy.rotation;

      // Spawn grow-in
      if (enemy.behavior !== "dead" && group.scale.x < 0.99) {
        group.scale.setScalar(Math.min(1, group.scale.x + 0.06));
      }

      // Death dissolve — glow burst + spin + shrink
      if (enemy.behavior === "dead") {
        const deathT = Math.max(0, enemy.deathTimer / 0.6);
        group.scale.setScalar(deathT);
        group.rotation.y += (1 - deathT) * 0.3;
        group.rotation.x += (1 - deathT) * 0.15;
        // Body glows brighter as it dissolves
        const bodyM = group.children[0] as THREE.Mesh;
        if (bodyM) {
          const mat = bodyM.material as THREE.MeshStandardMaterial;
          const colors = enemyColors[enemy.type];
          if (colors) mat.emissive.setHex(colors.glow);
          mat.emissiveIntensity = (1 - deathT) * 3;
        }
        // Glow orb intensifies
        const glowLight = group.children[group.children.length - 1] as THREE.PointLight;
        if (glowLight && glowLight.isLight) {
          glowLight.intensity = (1 - deathT) * 2;
        }
      }

      // Glow intensity
      const light = group.children[2] as THREE.PointLight;
      if (light) light.intensity = enemy.glowIntensity * (enemy.revealed ? 1.5 : 1);
      const glowOrb = group.children[1] as THREE.Mesh;
      if (glowOrb) (glowOrb.material as THREE.MeshStandardMaterial).emissiveIntensity = enemy.glowIntensity;

      // Hit flash
      if (enemy.hitFlash > 0) {
        const body = group.children[0] as THREE.Mesh;
        (body.material as THREE.MeshStandardMaterial).emissive.setHex(0xffffff);
        (body.material as THREE.MeshStandardMaterial).emissiveIntensity = enemy.hitFlash * 4;
      } else if (enemy.behavior !== "dead") {
        const body = group.children[0] as THREE.Mesh;
        (body.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      }

      // Bob + type-specific animation
      if (enemy.behavior !== "dead") {
        group.position.y += Math.sin(state.gameTime * 2 + enemy.bobPhase) * 0.15;
        // Idle sway
        group.rotation.z = Math.sin(state.gameTime * 1.5 + enemy.bobPhase) * 0.06;

        switch (enemy.type) {
          case "jellyfish": {
            // Dome pulse + tentacle sway
            const dome = group.children[0] as THREE.Mesh;
            if (dome) dome.scale.y = 1 + Math.sin(state.gameTime * 3 + enemy.bobPhase) * 0.15;
            for (let t = 1; t < Math.min(5, group.children.length); t++) {
              const tent = group.children[t] as THREE.Mesh;
              if (tent) tent.rotation.z = Math.sin(state.gameTime * 2 + t * 0.8 + enemy.bobPhase) * 0.3;
            }
            break;
          }
          case "tentacle": {
            // Writhing segments
            for (let s = 0; s < Math.min(5, group.children.length); s++) {
              const seg = group.children[s] as THREE.Mesh;
              if (seg) seg.rotation.z = Math.sin(state.gameTime * 1.5 + s * 0.6 + enemy.bobPhase) * (0.1 + s * 0.05);
            }
            break;
          }
          case "siren": {
            // Flowing hair sway
            const hair = group.children[3] as THREE.Mesh;
            if (hair) {
              hair.rotation.z = Math.sin(state.gameTime * 1.2 + enemy.bobPhase) * 0.2;
              hair.rotation.y = Math.sin(state.gameTime * 0.8 + enemy.bobPhase) * 0.15;
            }
            break;
          }
          case "angler": {
            // Lure sway on stalk
            const lure = group.children[3] as THREE.Mesh;
            if (lure) {
              lure.position.x = 0.3 + Math.sin(state.gameTime * 3 + enemy.bobPhase) * 0.2;
              lure.position.y = 1.1 + Math.sin(state.gameTime * 2 + enemy.bobPhase) * 0.15;
            }
            break;
          }
          case "abyssal_knight": {
            // Sword sway + aura pulse
            const sword = group.children[2] as THREE.Mesh;
            if (sword) sword.rotation.z = Math.sin(state.gameTime * 2) * 0.1;
            const aura = group.children[6] as THREE.Mesh;
            if (aura) {
              const aMat = aura.material as THREE.MeshBasicMaterial;
              aMat.opacity = 0.06 + Math.sin(state.gameTime * 2 + enemy.bobPhase) * 0.03;
              aura.scale.setScalar(3 + Math.sin(state.gameTime * 1.5) * 0.3);
            }
            break;
          }
          case "coral_golem": {
            // Heavy stomp bob
            group.rotation.z = Math.sin(state.gameTime * 1 + enemy.bobPhase) * 0.03;
            break;
          }
        }

        // Attack wind-up: lean toward player
        if (enemy.behavior === "attacking") {
          const dx = state.player.pos.x - enemy.pos.x;
          const dz = state.player.pos.z - enemy.pos.z;
          group.rotation.x = Math.atan2(0, Math.sqrt(dx * dx + dz * dz)) * 0.1;
        } else {
          group.rotation.x = 0;
        }
      }
    }
  }

  private _updateProjectiles(state: LeviathanState): void {
    for (const m of this._projPool) m.visible = false;
    const count = Math.min(state.projectiles.length, this._projPool.length);
    for (let i = 0; i < count; i++) {
      const proj = state.projectiles[i];
      const mesh = this._projPool[i];
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const color = proj.type === "harpoon" ? COL.HARPOON : COL.SIREN_BOLT;
      mat.color.setHex(color); mat.emissive.setHex(color);
      mesh.scale.setScalar(proj.type === "harpoon" ? 0.2 : 0.15);
      mesh.position.set(proj.pos.x, proj.pos.y, proj.pos.z);
      mesh.visible = true;
    }
  }

  private _updateParticles(state: LeviathanState): void {
    for (const m of this._particlePool) m.visible = false;
    const count = Math.min(state.particles.length, this._particlePool.length);
    for (let i = 0; i < count; i++) {
      const part = state.particles[i];
      const mesh = this._particlePool[i];
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const alpha = part.life / part.maxLife;
      mat.color.setHex(part.color); mat.opacity = alpha;
      mesh.scale.setScalar(part.size * (part.type === "bubble" ? (1 + (1 - alpha) * 0.5) : alpha));
      mesh.position.set(part.pos.x, part.pos.y, part.pos.z);
      mesh.visible = true;
    }
  }

  private _updateShards(state: LeviathanState): void {
    for (const m of this._shardPool) m.visible = false;
    const count = Math.min(state.relicShards.length, this._shardPool.length);
    for (let i = 0; i < count; i++) {
      const shard = state.relicShards[i];
      const mesh = this._shardPool[i];
      mesh.position.set(shard.pos.x, shard.pos.y, shard.pos.z);
      mesh.rotation.y = state.gameTime * 3;
      mesh.visible = true;
    }
  }

  private _updateSonarPings(state: LeviathanState): void {
    for (const m of this._sonarRings) m.visible = false;
    for (let i = 0; i < state.sonarPings.length && i < this._sonarRings.length; i++) {
      const ping = state.sonarPings[i];
      const mesh = this._sonarRings[i];
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, ping.timer / 1.5) * 0.3;
      mesh.scale.setScalar(ping.radius);
      mesh.position.set(ping.pos.x, ping.pos.y, ping.pos.z);
      mesh.quaternion.copy(this._camera.quaternion);
      mesh.visible = true;
    }
  }

  resize(w: number, h: number): void {
    this._renderer.setSize(w, h);
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    if (this._composer) this._composer.setSize(w, h);
  }

  cleanup(): void {
    if (this._canvas.parentNode) this._canvas.parentNode.removeChild(this._canvas);
    this._renderer.dispose();
    this._scene.clear();
  }
}
