// GTA3DRenderer.ts — Three.js 3D renderer for Medieval GTA: Camelot
import * as THREE from "three";
import type {
  GTA3DState,
  Building3D,
  NPC3D,
  Horse3D,
  Item3D,
  Particle3D,
} from "../state/GTA3DState";
import { GTA3D } from "../config/GTA3DConfig";

// ─── Shared Geometries ───────────────────────────────────────────────
const _sphere = new THREE.SphereGeometry(0.5, 16, 14);

// ─── Colour helpers ──────────────────────────────────────────────────
function col(hex: number) {
  return new THREE.Color(hex);
}
function mat(hex: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: hex, ...opts });
}
function basicMat(hex: number, opts: Partial<THREE.MeshBasicMaterialParameters> = {}): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: hex, ...opts });
}

// ─── Utility ─────────────────────────────────────────────────────────
function v3(x: number, y: number, z: number) {
  return new THREE.Vector3(x, y, z);
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ─── Materials (reused) ──────────────────────────────────────────────
const MAT_STONE       = mat(0x887766);
const MAT_STONE_LIGHT = mat(0x999988);
const MAT_WOOD        = mat(0x8B6914);
const MAT_WOOD_DARK   = mat(0x5A3E1B);
const MAT_THATCH      = mat(0xAA8844);
const MAT_GRASS       = mat(0x4A7A3A);
const MAT_COBBLE      = mat(0x666666, { roughness: 0.95 });
const MAT_ROAD        = mat(0x555555, { roughness: 0.9 });
const MAT_WATER       = mat(0x3388BB, { transparent: true, opacity: 0.65, roughness: 0.2, metalness: 0.1 });
const MAT_RED_BANNER  = mat(0x993333, { side: THREE.DoubleSide });
const MAT_RED         = mat(0xCC2222);
const MAT_IRON        = mat(0x444444, { metalness: 0.6, roughness: 0.4 });
const MAT_GOLD_MAT    = mat(0xFFD700, { metalness: 0.7, roughness: 0.3 });
const MAT_SKIN        = mat(0xDEB887);
const MAT_BLUE_TUNIC  = mat(0x3355AA);
const MAT_GREY_ARMOR  = mat(0xAAAAAA, { metalness: 0.5, roughness: 0.4 });
const MAT_HAY         = mat(0xCCBB44);
const MAT_ROOF_TILE   = mat(0x884422);
const MAT_GLOW_YELLOW = basicMat(0xFFDD55, { transparent: true, opacity: 0.9 });
const MAT_GLOW_ORANGE = basicMat(0xFF8833, { transparent: true, opacity: 0.85 });
const MAT_POTION_RED  = mat(0xCC1111, { transparent: true, opacity: 0.8 });
const MAT_ARROW       = mat(0x6B4226);
const MAT_ARROW_TIP   = mat(0x888888, { metalness: 0.5 });
const MAT_STAINED_R   = basicMat(0xFF3344, { transparent: true, opacity: 0.7, side: THREE.DoubleSide });
const MAT_STAINED_B   = basicMat(0x3344FF, { transparent: true, opacity: 0.7, side: THREE.DoubleSide });
const MAT_STAINED_G   = basicMat(0x22CC44, { transparent: true, opacity: 0.7, side: THREE.DoubleSide });
const MAT_CROSS       = mat(0xCCBB99);
const MAT_CHIMNEY     = mat(0x665544);

const CANOPY_COLORS = [0xCC3333, 0x3366CC, 0xCCAA33, 0x33AA66, 0xAA33AA, 0xCC6633];

// ─── Renderer ────────────────────────────────────────────────────────
export class GTA3DRenderer {
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;

  // Lights
  private _ambientLight!: THREE.AmbientLight;
  private _sunLight!: THREE.DirectionalLight;
  private _hemiLight!: THREE.HemisphereLight;

  // Environment groups
  private _groundGroup!: THREE.Group;
  private _wallGroup!: THREE.Group;
  private _forestGroup!: THREE.Group;
  private _riverMesh!: THREE.Mesh;

  // Entity mesh maps
  private _buildingMeshes: Map<string, THREE.Group> = new Map();
  private _npcMeshes: Map<string, THREE.Group> = new Map();
  private _horseMeshes: Map<string, THREE.Group> = new Map();
  private _itemMeshes: Map<string, THREE.Group> = new Map();
  private _projectileMeshes: Map<string, THREE.Group> = new Map();

  // Player
  private _playerGroup!: THREE.Group;
  private _playerWeapon!: THREE.Group;
  private _playerCape!: THREE.Mesh;

  // Particles
  private _particleGeom!: THREE.BufferGeometry;
  private _particlePoints!: THREE.Points;
  private _maxParticles = 512;

  // Windmill tracking for rotation
  private _windmillBlades: THREE.Group[] = [];

  // Tree canopies for sway
  private _treeCanopies: THREE.Mesh[] = [];

  // Torch / window glow point lights at night
  private _torchLights: THREE.PointLight[] = [];
  private _windowGlowPlanes: THREE.Mesh[] = [];

  // Sky dome
  private _skyDome!: THREE.Mesh;
  private _skyUniforms!: { topColor: { value: THREE.Color }, bottomColor: { value: THREE.Color }, offset: { value: number }, exponent: { value: number } };

  // Grass tufts
  private _grassBlades: THREE.Mesh[] = [];
  private _grassGroup!: THREE.Group;

  // Torch flames
  private _torchFlames: THREE.Mesh[] = [];

  // Internal
  private _buildingsCreated = false;
  private _environmentCreated = false;
  private _elapsed = 0;
  private _camPos = v3(0, GTA3D.CAMERA_HEIGHT, GTA3D.CAMERA_DISTANCE);

  // ─── Public ──────────────────────────────────────────────
  get canvas(): HTMLCanvasElement {
    return this._renderer.domElement;
  }

  init(sw: number, sh: number): void {
    // Renderer
    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setSize(sw, sh);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.1;
    this._renderer.domElement.style.position = "absolute";
    this._renderer.domElement.style.top = "0";
    this._renderer.domElement.style.left = "0";
    this._renderer.domElement.style.zIndex = "0";

    // Scene
    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(0x99BBDD, 0.006);

    // Camera
    this._camera = new THREE.PerspectiveCamera(55, sw / sh, 0.5, 500);
    this._camera.position.set(0, GTA3D.CAMERA_HEIGHT, GTA3D.CAMERA_DISTANCE);

    // Lights
    this._setupLights();

    // Sky dome
    this._skyUniforms = {
      topColor: { value: new THREE.Color(0x4488CC) },
      bottomColor: { value: new THREE.Color(0xAACCEE) },
      offset: { value: 33.0 },
      exponent: { value: 0.6 },
    };
    const skyGeo = new THREE.SphereGeometry(250, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this._skyUniforms,
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    this._skyDome = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(this._skyDome);

    // Ground & environment
    this._groundGroup = new THREE.Group();
    this._scene.add(this._groundGroup);

    // Player mesh
    this._buildPlayerMesh();

    // Particle system
    this._initParticles();
  }

  update(state: GTA3DState, dt: number): void {
    this._elapsed += dt;

    // Lazy-create environment once we have state
    if (!this._environmentCreated) {
      this._createEnvironment(state);
      this._environmentCreated = true;
    }

    // Lazy-create buildings
    if (!this._buildingsCreated && state.buildings.length > 0) {
      this._createBuildings(state.buildings);
      this._buildingsCreated = true;
    }

    // Day/night
    this._updateDayNight(state.dayTime);

    // Camera
    this._updateCamera(state);

    // Player
    this._updatePlayer(state);

    // NPCs
    this._syncNPCs(state);

    // Horses
    this._syncHorses(state);

    // Items
    this._syncItems(state);

    // Projectiles
    this._syncProjectiles(state);

    // Particles
    this._updateParticles(state.particles);

    // Animated elements
    this._animateWindmills(dt);
    this._animateTreeSway();
    this._animateRiver();
    this._animateTorchFlames();

    // Render
    this._renderer.render(this._scene, this._camera);
  }

  resize(sw: number, sh: number): void {
    this._camera.aspect = sw / sh;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(sw, sh);
  }

  cleanup(): void {
    this._scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material?.dispose();
      }
    });
    this._renderer.dispose();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  LIGHTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private _setupLights(): void {
    // Warm ambient
    this._ambientLight = new THREE.AmbientLight(0xFFEECC, 0.35);
    this._scene.add(this._ambientLight);

    // Sun
    this._sunLight = new THREE.DirectionalLight(0xFFFFDD, 1.2);
    this._sunLight.position.set(30, 50, 20);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(2048, 2048);
    this._sunLight.shadow.camera.left = -80;
    this._sunLight.shadow.camera.right = 80;
    this._sunLight.shadow.camera.top = 80;
    this._sunLight.shadow.camera.bottom = -80;
    this._sunLight.shadow.camera.near = 0.5;
    this._sunLight.shadow.camera.far = 200;
    this._sunLight.shadow.bias = -0.001;
    this._scene.add(this._sunLight);

    // Hemisphere (sky/ground)
    this._hemiLight = new THREE.HemisphereLight(0x88BBFF, 0x445522, 0.5);
    this._scene.add(this._hemiLight);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  ENVIRONMENT — ground, cobblestone, roads, river, walls, forests
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private _createEnvironment(state: GTA3DState): void {
    const ws = state.worldSize || GTA3D.WORLD_SIZE;
    const cr = state.cityRadius || GTA3D.CITY_RADIUS;

    // ── Grass ground ──
    const groundGeo = new THREE.PlaneGeometry(ws, ws, 1, 1);
    const groundMesh = new THREE.Mesh(groundGeo, MAT_GRASS);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this._groundGroup.add(groundMesh);

    // ── Cobblestone city disk ──
    const cobbleGeo = new THREE.CircleGeometry(cr, 48);
    const cobbleMesh = new THREE.Mesh(cobbleGeo, MAT_COBBLE);
    cobbleMesh.rotation.x = -Math.PI / 2;
    cobbleMesh.position.y = 0.02;
    this._groundGroup.add(cobbleMesh);

    // ── Grass tufts outside city ──
    this._grassGroup = new THREE.Group();
    this._groundGroup.add(this._grassGroup);
    this._createGrassTufts(ws, cr);

    // ── Cross-roads ──
    this._createRoads(cr);

    // ── Rolling hills outside city ──
    this._createHills(ws, cr);

    // ── River ──
    this._createRiver(ws);

    // ── Stone bridge over river ──
    this._createBridge(ws);

    // ── City walls ──
    this._wallGroup = new THREE.Group();
    this._scene.add(this._wallGroup);
    this._createCityWalls(cr);

    // ── Street torches / lanterns ──
    this._createStreetTorches(cr);

    // ── Decorative elements around buildings ──
    this._createDecorations(state);

    // ── Forests ──
    this._forestGroup = new THREE.Group();
    this._scene.add(this._forestGroup);
    this._createForests(ws, cr);
  }

  // ── Roads ──
  private _createRoads(cr: number): void {
    const roadW = 4;
    const roadLen = cr * 2 + 20;
    // N-S road
    const ns = new THREE.Mesh(
      new THREE.BoxGeometry(roadW, 0.05, roadLen),
      MAT_ROAD
    );
    ns.position.y = 0.03;
    ns.receiveShadow = true;
    this._groundGroup.add(ns);

    // N-S road stones
    for (let s = 0; s < 30; s++) {
      const sw2 = 0.3 + Math.random() * 0.3;
      const sd = 0.3 + Math.random() * 0.3;
      const grey = 0x555555 + Math.floor(Math.random() * 0x222222);
      const stone = new THREE.Mesh(
        new THREE.BoxGeometry(sw2, 0.03, sd),
        mat(grey, { roughness: 0.95 })
      );
      stone.position.set(
        (Math.random() - 0.5) * (roadW - 0.4),
        0.065,
        (Math.random() - 0.5) * roadLen
      );
      stone.rotation.y = Math.random() * Math.PI;
      stone.receiveShadow = true;
      this._groundGroup.add(stone);
    }

    // E-W road
    const ew = new THREE.Mesh(
      new THREE.BoxGeometry(roadLen, 0.05, roadW),
      MAT_ROAD
    );
    ew.position.y = 0.03;
    ew.receiveShadow = true;
    this._groundGroup.add(ew);

    // E-W road stones
    for (let s = 0; s < 30; s++) {
      const sw2 = 0.3 + Math.random() * 0.3;
      const sd = 0.3 + Math.random() * 0.3;
      const grey = 0x555555 + Math.floor(Math.random() * 0x222222);
      const stone = new THREE.Mesh(
        new THREE.BoxGeometry(sw2, 0.03, sd),
        mat(grey, { roughness: 0.95 })
      );
      stone.position.set(
        (Math.random() - 0.5) * roadLen,
        0.065,
        (Math.random() - 0.5) * (roadW - 0.4)
      );
      stone.rotation.y = Math.random() * Math.PI;
      stone.receiveShadow = true;
      this._groundGroup.add(stone);
    }
  }

  // ── Hills ──
  private _createHills(ws: number, cr: number): void {
    const hillsGeo = new THREE.PlaneGeometry(ws, ws, 48, 48);
    const pos = hillsGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      if (dist > cr + 10) {
        const factor = clamp((dist - cr - 10) / 30, 0, 1);
        const h =
          factor *
          (Math.sin(x * 0.08) * 2.5 +
            Math.cos(y * 0.06 + 1.3) * 3.0 +
            Math.sin(x * 0.03 + y * 0.04) * 4.0);
        pos.setZ(i, Math.max(0, h));
      }
    }
    hillsGeo.computeVertexNormals();
    const hillsMesh = new THREE.Mesh(hillsGeo, mat(0x558844));
    hillsMesh.rotation.x = -Math.PI / 2;
    hillsMesh.position.y = 0.01;
    hillsMesh.receiveShadow = true;
    this._groundGroup.add(hillsMesh);
  }

  // ── River ──
  private _createRiver(ws: number): void {
    const riverGeo = new THREE.PlaneGeometry(14, ws, 20, 40);
    this._riverMesh = new THREE.Mesh(riverGeo, MAT_WATER);
    this._riverMesh.rotation.x = -Math.PI / 2;
    this._riverMesh.position.set(ws * 0.35, 0.08, 0);
    this._groundGroup.add(this._riverMesh);
  }

  private _animateRiver(): void {
    if (!this._riverMesh) return;
    const geo = this._riverMesh.geometry as THREE.PlaneGeometry;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, Math.sin(x * 0.4 + this._elapsed * 1.8) * 0.18 + Math.cos(y * 0.15 + this._elapsed * 1.2) * 0.12);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  // ── City walls ──
  private _createCityWalls(cr: number): void {
    const segments = 24;
    const wallH = GTA3D.WALL_HEIGHT;
    const wallT = GTA3D.WALL_THICKNESS;
    // Gate angles (N=π/2, E=0, S=-π/2, W=π)
    const gateAngles = [Math.PI / 2, 0, -Math.PI / 2, Math.PI];
    const gateAngleSet = new Set<number>();
    gateAngles.forEach((a) => {
      const norm = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      gateAngleSet.add(Math.round(norm * 1000));
    });

    // Determine which segment indices correspond to gate angles
    const gateSegments = new Set<number>();
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      for (const ga of gateAngles) {
        const norm = ((ga % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const diff = Math.abs(angle - norm);
        if (diff < Math.PI / segments || Math.abs(diff - Math.PI * 2) < Math.PI / segments) {
          gateSegments.add(i);
        }
      }
    }

    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const mx = Math.cos((a0 + a1) / 2) * cr;
      const mz = Math.sin((a0 + a1) / 2) * cr;
      const segLen = 2 * cr * Math.sin(Math.PI / segments);

      if (gateSegments.has(i)) {
        // Gate opening — place tower on each side
        this._createGateTower(mx + Math.cos((a0 + a1) / 2 + 0.15) * 2, mz + Math.sin((a0 + a1) / 2 + 0.15) * 2, (a0 + a1) / 2);
        this._createGateTower(mx + Math.cos((a0 + a1) / 2 - 0.15) * 2, mz + Math.sin((a0 + a1) / 2 - 0.15) * 2, (a0 + a1) / 2);
        continue;
      }

      // Wall segment — lower stone base
      const wallSeg = new THREE.Mesh(
        new THREE.BoxGeometry(segLen, wallH, wallT),
        MAT_STONE
      );
      wallSeg.position.set(mx, wallH / 2, mz);
      wallSeg.rotation.y = -(a0 + a1) / 2 + Math.PI / 2;
      wallSeg.castShadow = true;
      wallSeg.receiveShadow = true;
      this._wallGroup.add(wallSeg);

      // Darker stone course at the bottom (foundation)
      const foundation = new THREE.Mesh(
        new THREE.BoxGeometry(segLen + 0.3, wallH * 0.15, wallT + 0.3),
        mat(0x665544, { roughness: 1 })
      );
      foundation.position.set(mx, wallH * 0.075, mz);
      foundation.rotation.y = wallSeg.rotation.y;
      foundation.receiveShadow = true;
      this._wallGroup.add(foundation);

      // Horizontal stone course line (mortar strip)
      const midAng = (a0 + a1) / 2;
      for (const stripY of [wallH * 0.33, wallH * 0.66]) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(segLen + 0.1, 0.06, wallT + 0.08),
          mat(0x776655, { roughness: 1 })
        );
        strip.position.set(mx, stripY, mz);
        strip.rotation.y = wallSeg.rotation.y;
        this._wallGroup.add(strip);
      }

      // Arrow slits / embrasures along the wall
      const slitCount = Math.max(1, Math.floor(segLen / 4));
      const perpXSeg = -Math.sin(midAng);
      const perpZSeg = Math.cos(midAng);
      const outNormX = Math.cos(midAng);
      const outNormZ = Math.sin(midAng);
      for (let sl = 0; sl < slitCount; sl++) {
        const slitT = (sl + 0.5) / slitCount - 0.5;
        // Dark narrow rectangle on the outer face
        const slit = new THREE.Mesh(
          new THREE.PlaneGeometry(0.08, wallH * 0.3),
          mat(0x222222)
        );
        slit.position.set(
          mx + perpXSeg * slitT * segLen + outNormX * (wallT / 2 + 0.01),
          wallH * 0.55,
          mz + perpZSeg * slitT * segLen + outNormZ * (wallT / 2 + 0.01)
        );
        slit.rotation.y = -(midAng) + Math.PI / 2;
        this._wallGroup.add(slit);
      }

      // Walkway / parapet on top of the wall
      const walkway = new THREE.Mesh(
        new THREE.BoxGeometry(segLen, 0.12, wallT + 1.0),
        mat(0x777766, { roughness: 0.9 })
      );
      walkway.position.set(mx, wallH, mz);
      walkway.rotation.y = wallSeg.rotation.y;
      walkway.receiveShadow = true;
      this._wallGroup.add(walkway);

      // Crenellations (merlons + embrasures)
      const crenCount = Math.floor(segLen / 1.2);
      for (let c = 0; c < crenCount; c++) {
        if (c % 2 === 0) continue; // gaps (embrasures)
        const t = (c + 0.5) / crenCount - 0.5;
        // Merlon (taller, slightly tapered)
        const cren = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, wallT + 0.3), MAT_STONE);
        const perpX = -Math.sin(midAng);
        const perpZ = Math.cos(midAng);
        cren.position.set(
          mx + perpX * t * segLen,
          wallH + 0.45,
          mz + perpZ * t * segLen
        );
        cren.rotation.y = wallSeg.rotation.y;
        cren.castShadow = true;
        this._wallGroup.add(cren);

        // Small cap on top of each merlon
        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.08, wallT + 0.4),
          mat(0x776666, { roughness: 1 })
        );
        cap.position.set(
          mx + perpX * t * segLen,
          wallH + 0.94,
          mz + perpZ * t * segLen
        );
        cap.rotation.y = wallSeg.rotation.y;
        this._wallGroup.add(cap);
      }

      // Wall-mounted torch every other segment
      if (i % 2 === 0) {
        const torchHolder = new THREE.Group();
        const bracket = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.06, 0.4),
          MAT_IRON
        );
        bracket.position.z = 0.2;
        torchHolder.add(bracket);
        const torchPole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.035, 0.5, 10),
          MAT_WOOD_DARK
        );
        torchPole.position.set(0, 0.25, 0.4);
        torchHolder.add(torchPole);
        const flame = new THREE.Mesh(
          new THREE.ConeGeometry(0.06, 0.15, 10),
          MAT_GLOW_ORANGE
        );
        flame.position.set(0, 0.55, 0.4);
        torchHolder.add(flame);
        this._torchFlames.push(flame);
        const wallTorch = new THREE.PointLight(0xFF8833, 0.5, 8);
        wallTorch.position.set(0, 0.5, 0.5);
        torchHolder.add(wallTorch);
        this._torchLights.push(wallTorch);
        // Position on outer face of wall
        torchHolder.position.set(
          mx + outNormX * (wallT / 2),
          wallH * 0.6,
          mz + outNormZ * (wallT / 2)
        );
        torchHolder.rotation.y = -(midAng) + Math.PI / 2;
        this._wallGroup.add(torchHolder);
      }

      // Corner towers at every 3rd segment
      if (i % 3 === 0) {
        this._createCornerTower(
          Math.cos(a0) * cr,
          Math.sin(a0) * cr
        );
      }
    }
  }

  private _createGateTower(x: number, z: number, _angle: number): void {
    const g = new THREE.Group();
    const tH = GTA3D.WALL_HEIGHT + 3;

    // Foundation ring
    const foundation = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.7, 0.6, 20),
      mat(0x665544, { roughness: 1 })
    );
    foundation.position.y = 0.3;
    g.add(foundation);

    // Main tower cylinder (slightly tapered)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, tH, 20), MAT_STONE);
    base.position.y = tH / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    // Mid-height stone band
    const midBand = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.3, 0.15, 20),
      mat(0x776655)
    );
    midBand.position.y = tH * 0.45;
    g.add(midBand);

    // Platform at top
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 0.15, 20),
      mat(0x777766)
    );
    platform.position.y = tH;
    platform.receiveShadow = true;
    g.add(platform);

    // Cone roof — smooth
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 3, 20), MAT_ROOF_TILE);
    roof.position.y = tH + 1.5;
    roof.castShadow = true;
    g.add(roof);

    // Roof tip finial (gold sphere with spike)
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), MAT_GOLD_MAT);
    finial.position.y = tH + 3.1;
    g.add(finial);
    const finialSpike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 10), MAT_GOLD_MAT);
    finialSpike.position.y = tH + 3.3;
    g.add(finialSpike);

    // Crenellations with caps
    for (let i = 0; i < 8; i++) {
      const ca = (i / 8) * Math.PI * 2;
      if (i % 2 === 0) {
        const cren = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.55), MAT_STONE);
        cren.position.set(Math.cos(ca) * 2.3, tH + 0.4, Math.sin(ca) * 2.3);
        cren.castShadow = true;
        g.add(cren);
      }
    }

    // Arrow slits
    for (let i = 0; i < 4; i++) {
      const sa = (i / 4) * Math.PI * 2;
      const slit = new THREE.Mesh(
        new THREE.PlaneGeometry(0.06, tH * 0.18),
        mat(0x222222)
      );
      slit.position.set(Math.cos(sa) * 2.41, tH * 0.5, Math.sin(sa) * 2.41);
      slit.rotation.y = -sa + Math.PI / 2;
      g.add(slit);
    }

    // Banner hanging from tower
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 2.0),
      MAT_RED_BANNER
    );
    banner.position.set(2.42, tH * 0.55, 0);
    banner.rotation.y = Math.PI / 2;
    g.add(banner);

    // Torch with bracket on outer wall
    const bracketMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 0.35),
      MAT_IRON
    );
    bracketMesh.position.set(2.35, tH * 0.35, 0);
    g.add(bracketMesh);
    const flameMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.2, 12),
      MAT_GLOW_ORANGE
    );
    flameMesh.position.set(2.55, tH * 0.4, 0);
    g.add(flameMesh);
    this._torchFlames.push(flameMesh);
    const torch = new THREE.PointLight(0xFF8833, 0.8, 12);
    torch.position.set(2.55, tH * 0.4, 0);
    g.add(torch);
    this._torchLights.push(torch);

    g.position.set(x, 0, z);
    this._wallGroup.add(g);
  }

  private _createCornerTower(x: number, z: number): void {
    const g = new THREE.Group();
    const h = GTA3D.WALL_HEIGHT + 2;
    // Slightly tapered base — smoother
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.1, h, 20), MAT_STONE);
    base.position.y = h / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    // Stone foundation ring
    const foundRing = new THREE.Mesh(
      new THREE.CylinderGeometry(2.15, 2.3, 0.5, 20),
      mat(0x665544, { roughness: 1 })
    );
    foundRing.position.y = 0.25;
    g.add(foundRing);

    // Mid-height stone band
    const midBand = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 1.9, 0.12, 20),
      mat(0x776655)
    );
    midBand.position.y = h * 0.5;
    g.add(midBand);

    // Walkway platform on top
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 0.15, 20),
      mat(0x777766)
    );
    platform.position.y = h;
    platform.receiveShadow = true;
    g.add(platform);

    // Crenellations with gaps
    for (let i = 0; i < 8; i++) {
      const ca = (i / 8) * Math.PI * 2;
      if (i % 2 === 0) {
        const cren = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.55), MAT_STONE);
        cren.position.set(Math.cos(ca) * 1.9, h + 0.35, Math.sin(ca) * 1.9);
        cren.castShadow = true;
        g.add(cren);
        // Small cap
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.65), mat(0x776666));
        cap.position.set(Math.cos(ca) * 1.9, h + 0.73, Math.sin(ca) * 1.9);
        g.add(cap);
      }
    }

    // Arrow slits on the tower body
    for (let i = 0; i < 4; i++) {
      const sa = (i / 4) * Math.PI * 2 + 0.4;
      const slit = new THREE.Mesh(
        new THREE.PlaneGeometry(0.06, h * 0.2),
        mat(0x222222)
      );
      slit.position.set(Math.cos(sa) * 2.01, h * 0.5, Math.sin(sa) * 2.01);
      slit.rotation.y = -sa + Math.PI / 2;
      g.add(slit);
    }

    // Torch
    const torch = new THREE.PointLight(0xFF8833, 0.6, 10);
    torch.position.set(0, h * 0.65, 2.1);
    g.add(torch);
    this._torchLights.push(torch);

    g.position.set(x, 0, z);
    this._wallGroup.add(g);
  }

  // ── Grass tufts ──
  private _createGrassTufts(ws: number, cr: number): void {
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = cr + 5 + Math.random() * (ws * 0.4 - cr);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      // Skip if on river
      if (x > ws * 0.30 && x < ws * 0.40) continue;

      const tufts = new THREE.Group();
      const grassColor = 0x3A6A2A + Math.floor(Math.random() * 0x112200);
      // 3 blades per tuft for more fullness
      const bladeCount = 2 + Math.floor(Math.random() * 2);
      for (let b = 0; b < bladeCount; b++) {
        const h = 0.25 + Math.random() * 0.25;
        const blade = new THREE.Mesh(
          new THREE.ConeGeometry(0.06, h, 10),
          mat(grassColor + Math.floor(Math.random() * 0x050500))
        );
        blade.position.set(
          (Math.random() - 0.5) * 0.12,
          h * 0.5,
          (Math.random() - 0.5) * 0.12
        );
        blade.rotation.x = (Math.random() - 0.5) * 0.4;
        blade.rotation.z = (Math.random() - 0.5) * 0.4;
        tufts.add(blade);
      }
      tufts.position.set(x, 0, z);
      this._grassGroup.add(tufts);
      // Track first blade for animation
      this._grassBlades.push(tufts.children[0] as THREE.Mesh);
    }
  }

  // ── Stone bridge ──
  private _createBridge(ws: number): void {
    const bridgeX = ws * 0.35;
    const bridgeZ = 0;
    const bridgeGroup = new THREE.Group();

    // Arch base (torus segment underneath)
    const archGeo = new THREE.TorusGeometry(3, 0.6, 14, 20, Math.PI);
    const arch = new THREE.Mesh(archGeo, MAT_STONE);
    arch.rotation.x = Math.PI / 2;
    arch.rotation.z = Math.PI / 2;
    arch.position.set(0, 0.5, 0);
    bridgeGroup.add(arch);

    // Flat walkway on top
    const walkway = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.4, 10),
      MAT_STONE_LIGHT
    );
    walkway.position.set(0, 3.2, 0);
    walkway.receiveShadow = true;
    walkway.castShadow = true;
    bridgeGroup.add(walkway);

    // Left railing
    const railL = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 1.0, 10),
      MAT_STONE
    );
    railL.position.set(-2.3, 3.9, 0);
    railL.castShadow = true;
    bridgeGroup.add(railL);

    // Right railing
    const railR = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 1.0, 10),
      MAT_STONE
    );
    railR.position.set(2.3, 3.9, 0);
    railR.castShadow = true;
    bridgeGroup.add(railR);

    // Railing pillars
    for (let side = -1; side <= 1; side += 2) {
      for (let p = -4; p <= 4; p += 2) {
        const pillar = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 1.4, 0.3),
          MAT_STONE
        );
        pillar.position.set(side * 2.3, 3.9, p);
        bridgeGroup.add(pillar);
      }
    }

    bridgeGroup.position.set(bridgeX, 0, bridgeZ);
    this._groundGroup.add(bridgeGroup);
  }

  // ── Street torches / lanterns ──
  private _createStreetTorches(cr: number): void {
    const torchPositions: [number, number][] = [];
    // Along N-S road inside city
    for (let z = -cr + 5; z < cr - 5; z += Math.floor(cr / 3)) {
      torchPositions.push([2.5, z]);
      torchPositions.push([-2.5, z]);
    }
    // Along E-W road inside city
    for (let x = -cr + 5; x < cr - 5; x += Math.floor(cr / 3)) {
      torchPositions.push([x, 2.5]);
      torchPositions.push([x, -2.5]);
    }

    // Take up to 12
    const positions = torchPositions.slice(0, 12);
    for (const [tx, tz] of positions) {
      const torchGroup = new THREE.Group();
      // Wooden pole — smooth
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.1, 3, 14),
        MAT_WOOD_DARK
      );
      pole.position.y = 1.5;
      pole.castShadow = true;
      torchGroup.add(pole);
      // Iron bracket holding the flame dish
      const bracket = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, 0.2),
        MAT_IRON
      );
      bracket.position.set(0, 2.95, 0.08);
      torchGroup.add(bracket);
      // Flame dish
      const dish = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.08, 0.06, 14),
        MAT_IRON
      );
      dish.position.y = 3.0;
      torchGroup.add(dish);

      // Flame — cone shape instead of box
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xFF8833,
        transparent: true,
        opacity: 0.85,
      });
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.3, 12),
        flameMat
      );
      flame.position.y = 3.2;
      torchGroup.add(flame);
      // Inner flame (brighter core)
      const innerFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.2, 10),
        new THREE.MeshBasicMaterial({ color: 0xFFCC44, transparent: true, opacity: 0.7 })
      );
      innerFlame.position.y = 3.15;
      torchGroup.add(innerFlame);
      this._torchFlames.push(flame);

      // Point light
      const light = new THREE.PointLight(0xFF8833, 0.6, 10);
      light.position.y = 3.2;
      torchGroup.add(light);
      this._torchLights.push(light);

      torchGroup.position.set(tx, 0, tz);
      this._groundGroup.add(torchGroup);
    }
  }

  // ── Decorative elements ──
  private _createDecorations(state: GTA3DState): void {
    const buildings = state.buildings || [];
    for (const b of buildings) {
      if (b.type === "tavern" || b.type === "blacksmith_shop") {
        // Barrels near tavern and blacksmith
        for (let i = 0; i < 4; i++) {
          const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.35, 0.7, 14),
            mat(0x6B4226)
          );
          barrel.position.set(
            b.pos.x + b.size.x * 0.5 + 0.5 + Math.random() * 0.8,
            0.35,
            b.pos.z + (Math.random() - 0.5) * b.size.z * 0.6
          );
          barrel.castShadow = true;
          this._groundGroup.add(barrel);
        }
      }

      if (b.type === "market_stall" || b.type === "stable") {
        // Crates near market and stable
        for (let i = 0; i < 3; i++) {
          const size = 0.4 + Math.random() * 0.3;
          const crate = new THREE.Mesh(
            new THREE.BoxGeometry(size, size, size),
            mat(0x8B7355)
          );
          crate.position.set(
            b.pos.x - b.size.x * 0.5 - 0.5 - Math.random() * 0.6,
            size * 0.5,
            b.pos.z + (Math.random() - 0.5) * b.size.z * 0.5
          );
          crate.rotation.y = Math.random() * 0.5;
          crate.castShadow = true;
          this._groundGroup.add(crate);
        }
      }

      if (b.type === "fountain") {
        // A well near the fountain area
        const wellGroup = new THREE.Group();
        // Stone cylinder base
        const wellBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.8, 0.9, 0.8, 12),
          MAT_STONE
        );
        wellBase.position.y = 0.4;
        wellGroup.add(wellBase);

        // Two support posts
        for (let side = -1; side <= 1; side += 2) {
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 1.8, 12),
            MAT_WOOD_DARK
          );
          post.position.set(side * 0.6, 1.7, 0);
          wellGroup.add(post);
        }

        // Small roof beam
        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 0.1, 0.8),
          MAT_WOOD
        );
        beam.position.y = 2.6;
        wellGroup.add(beam);

        // Roof
        const wellRoof = new THREE.Mesh(
          new THREE.ConeGeometry(1.0, 0.6, 14),
          MAT_ROOF_TILE
        );
        wellRoof.position.y = 3.0;
        wellRoof.rotation.y = Math.PI / 4;
        wellGroup.add(wellRoof);

        wellGroup.position.set(b.pos.x + 4, 0, b.pos.z + 3);
        this._groundGroup.add(wellGroup);
      }
    }
  }

  // ── Forests ──
  private _createForests(ws: number, cr: number): void {
    // Create clusters of trees outside the walls
    const clusterCount = 18;
    for (let c = 0; c < clusterCount; c++) {
      const angle = (c / clusterCount) * Math.PI * 2 + Math.random() * 0.3;
      const dist = cr + 15 + Math.random() * 25;
      const cx = Math.cos(angle) * dist;
      const cz = Math.sin(angle) * dist;
      // Skip if on river side
      if (cx > ws * 0.28) continue;
      const treeCount = 4 + Math.floor(Math.random() * 6);
      for (let t = 0; t < treeCount; t++) {
        const tx = cx + (Math.random() - 0.5) * 10;
        const tz = cz + (Math.random() - 0.5) * 10;
        this._createTree(tx, tz, 2 + Math.random() * 3);
      }
    }
  }

  private _createTree(x: number, z: number, height: number): void {
    const g = new THREE.Group();
    // Trunk — tapered with bark-like irregularity
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.32, height * 0.5, 12),
      MAT_WOOD_DARK
    );
    trunk.position.y = height * 0.25;
    trunk.castShadow = true;
    g.add(trunk);

    // Root flare at base
    const rootFlare = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.45, height * 0.1, 12),
      MAT_WOOD_DARK
    );
    rootFlare.position.y = height * 0.02;
    g.add(rootFlare);

    // Exposed roots (2-3)
    const rootCount = 2 + Math.floor(Math.random() * 2);
    for (let r = 0; r < rootCount; r++) {
      const ra = (r / rootCount) * Math.PI * 2 + Math.random() * 0.5;
      const root = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.08, 0.5, 12),
        MAT_WOOD_DARK
      );
      root.position.set(Math.cos(ra) * 0.35, 0.05, Math.sin(ra) * 0.35);
      root.rotation.z = Math.cos(ra) * 0.8;
      root.rotation.x = Math.sin(ra) * 0.8;
      g.add(root);
    }

    // Main branch (one or two visible from trunk)
    const branchAngle = Math.random() * Math.PI * 2;
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.1, height * 0.3, 12),
      MAT_WOOD_DARK
    );
    branch.position.set(
      Math.cos(branchAngle) * 0.25,
      height * 0.4,
      Math.sin(branchAngle) * 0.25
    );
    branch.rotation.z = Math.cos(branchAngle) * 0.7;
    branch.rotation.x = Math.sin(branchAngle) * 0.7;
    g.add(branch);

    // Canopy — randomize cone vs sphere, higher segments
    const useCone = Math.random() > 0.4;
    let canopy: THREE.Mesh;
    const canopyColor = mat(0x2E7D32 + Math.floor(Math.random() * 0x112200));
    if (useCone) {
      canopy = new THREE.Mesh(
        new THREE.ConeGeometry(height * 0.45, height * 0.65, 16),
        canopyColor
      );
    } else {
      canopy = new THREE.Mesh(
        new THREE.SphereGeometry(height * 0.4, 16, 12),
        canopyColor
      );
    }
    canopy.position.y = height * 0.55 + height * 0.2;
    canopy.castShadow = true;
    g.add(canopy);
    this._treeCanopies.push(canopy);

    // Secondary smaller canopy cluster for fullness
    const subCanopy = new THREE.Mesh(
      new THREE.SphereGeometry(height * 0.25, 12, 10),
      canopyColor
    );
    subCanopy.position.set(
      Math.cos(branchAngle) * height * 0.2,
      height * 0.5 + height * 0.15,
      Math.sin(branchAngle) * height * 0.2
    );
    subCanopy.castShadow = true;
    g.add(subCanopy);

    g.position.set(x, 0, z);
    this._forestGroup.add(g);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  BUILDINGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private _createBuildings(buildings: Building3D[]): void {
    for (const b of buildings) {
      let mesh: THREE.Group;
      switch (b.type) {
        case "castle":       mesh = this._buildCastle(b); break;
        case "church":       mesh = this._buildChurch(b); break;
        case "tavern":       mesh = this._buildTavern(b); break;
        case "blacksmith_shop": mesh = this._buildBlacksmith(b); break;
        case "market_stall": mesh = this._buildMarketStall(b); break;
        case "stable":       mesh = this._buildStable(b); break;
        case "house_large":  mesh = this._buildHouse(b, "large"); break;
        case "house_medium": mesh = this._buildHouse(b, "medium"); break;
        case "house_small":  mesh = this._buildHouse(b, "small"); break;
        case "wall_tower":   mesh = this._buildWallTower(b); break;
        case "fountain":     mesh = this._buildFountain(b); break;
        case "tree_cluster": mesh = this._buildTreeCluster(b); break;
        case "farmhouse":    mesh = this._buildFarmhouse(b); break;
        case "mill":         mesh = this._buildMill(b); break;
        case "farm_field":   mesh = this._buildFarmField(b); break;
        default:             mesh = this._buildGenericBuilding(b); break;
      }
      mesh.position.set(b.pos.x, b.pos.y, b.pos.z);
      mesh.rotation.y = b.rotation;
      this._scene.add(mesh);
      this._buildingMeshes.set(b.id, mesh);
    }
  }

  // ── Brick Mortar Helper ──
  private _addBrickMortar(
    group: THREE.Group,
    w: number, h: number, d: number,
    cx: number, cy: number, cz: number
  ): void {
    const mortarMat = new THREE.MeshStandardMaterial({ color: 0x8a7a60, roughness: 0.95 });
    const mortarThick = 0.03;
    const rowSpacing = 0.4;
    const brickLen = 0.8;
    const nudge = 0.005; // offset from wall surface

    // Front/back faces (normal along Z)
    for (const sign of [-1, 1]) {
      const fz = cz + sign * (d / 2 + nudge);
      // Horizontal mortar lines
      const rows = Math.floor(h / rowSpacing);
      for (let r = 1; r < rows; r++) {
        const hy = cy - h / 2 + r * rowSpacing;
        if (hy > cy + h / 2 - 0.05) break;
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(w, mortarThick, mortarThick),
          mortarMat
        );
        line.position.set(cx, hy, fz);
        group.add(line);
      }
      // Vertical brick joints
      const cols = Math.max(1, Math.floor(w / brickLen));
      const actualBrick = w / cols;
      for (let r = 1; r < rows; r++) {
        const hy = cy - h / 2 + r * rowSpacing;
        if (hy > cy + h / 2 - 0.05) break;
        const offset = (r % 2 === 0) ? 0 : actualBrick / 2;
        for (let c = 0; c <= cols; c++) {
          const jx = cx - w / 2 + c * actualBrick + offset;
          if (jx < cx - w / 2 + 0.05 || jx > cx + w / 2 - 0.05) continue;
          const joint = new THREE.Mesh(
            new THREE.BoxGeometry(mortarThick, rowSpacing, mortarThick),
            mortarMat
          );
          joint.position.set(jx, hy - rowSpacing / 2, fz);
          group.add(joint);
        }
      }
    }

    // Left/right faces (normal along X)
    for (const sign of [-1, 1]) {
      const fx = cx + sign * (w / 2 + nudge);
      // Horizontal mortar lines
      const rows = Math.floor(h / rowSpacing);
      for (let r = 1; r < rows; r++) {
        const hy = cy - h / 2 + r * rowSpacing;
        if (hy > cy + h / 2 - 0.05) break;
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(mortarThick, mortarThick, d),
          mortarMat
        );
        line.position.set(fx, hy, cz);
        group.add(line);
      }
      // Vertical brick joints
      const cols = Math.max(1, Math.floor(d / brickLen));
      const actualBrick = d / cols;
      for (let r = 1; r < rows; r++) {
        const hy = cy - h / 2 + r * rowSpacing;
        if (hy > cy + h / 2 - 0.05) break;
        const offset = (r % 2 === 0) ? 0 : actualBrick / 2;
        for (let c = 0; c <= cols; c++) {
          const jz = cz - d / 2 + c * actualBrick + offset;
          if (jz < cz - d / 2 + 0.05 || jz > cz + d / 2 - 0.05) continue;
          const joint = new THREE.Mesh(
            new THREE.BoxGeometry(mortarThick, rowSpacing, mortarThick),
            mortarMat
          );
          joint.position.set(fx, hy - rowSpacing / 2, jz);
          group.add(joint);
        }
      }
    }
  }

  // Helper for adding mortar rings to cylindrical towers
  private _addTowerMortar(
    group: THREE.Group,
    radius: number, height: number,
    tx: number, ty: number, tz: number
  ): void {
    const mortarMat = new THREE.MeshStandardMaterial({ color: 0x8a7a60, roughness: 0.95 });
    const rowSpacing = 0.4;
    const rows = Math.floor(height / rowSpacing);
    for (let r = 1; r < rows; r++) {
      const hy = ty - height / 2 + r * rowSpacing;
      if (hy > ty + height / 2 - 0.05) break;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius + 0.005, 0.015, 4, 24),
        mortarMat
      );
      ring.position.set(tx, hy, tz);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }
  }

  // ── Castle ──
  private _buildCastle(b: Building3D): THREE.Group {
    const g = new THREE.Group();
    const w = b.size.x;
    const h = b.size.y;
    const d = b.size.z;

    // Main keep
    const keep = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, h, d * 0.5), mat(0x888877));
    keep.position.y = h / 2;
    keep.castShadow = true;
    keep.receiveShadow = true;
    g.add(keep);

    // Mortar on keep
    this._addBrickMortar(g, w * 0.5, h, d * 0.5, 0, h / 2, 0);

    // Central tower (taller) — smooth
    const centralH = h * 1.5;
    const central = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.12, w * 0.14, centralH, 20), mat(0x888877));
    central.position.y = centralH / 2;
    central.castShadow = true;
    g.add(central);
    this._addTowerMortar(g, w * 0.13, centralH, 0, centralH / 2, 0);
    // Stone band around central tower mid-height
    const centralBand = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.145, w * 0.145, 0.2, 20), mat(0x777766));
    centralBand.position.y = centralH * 0.5;
    g.add(centralBand);
    // Central cone roof — smooth
    const centralRoof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.16, 3, 20), MAT_ROOF_TILE);
    centralRoof.position.y = centralH + 1.5;
    g.add(centralRoof);
    // Finial on central tower
    const centralFinial = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), MAT_GOLD_MAT);
    centralFinial.position.y = centralH + 3.05;
    g.add(centralFinial);

    // 4 Corner towers
    const corners = [
      [-w * 0.4, -d * 0.4],
      [w * 0.4, -d * 0.4],
      [-w * 0.4, d * 0.4],
      [w * 0.4, d * 0.4],
    ];
    for (const [cx, cz] of corners) {
      const towerH = h * 1.15;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, towerH, 20), mat(0x888877));
      tower.position.set(cx, towerH / 2, cz);
      tower.castShadow = true;
      g.add(tower);
      // Stone band
      const tBand = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.15, 20), mat(0x777766));
      tBand.position.set(cx, towerH * 0.5, cz);
      g.add(tBand);
      this._addTowerMortar(g, 1.6, towerH, cx, towerH / 2, cz);

      const tRoof = new THREE.Mesh(new THREE.ConeGeometry(2, 2.5, 20), MAT_RED);
      tRoof.position.set(cx, towerH + 1.25, cz);
      g.add(tRoof);
      // Finial
      const tFinial = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), MAT_GOLD_MAT);
      tFinial.position.set(cx, towerH + 2.55, cz);
      g.add(tFinial);

      // Crenellations
      for (let i = 0; i < 6; i++) {
        const ca = (i / 6) * Math.PI * 2;
        const cr = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), mat(0x888877));
        cr.position.set(cx + Math.cos(ca) * 1.4, towerH + 0.25, cz + Math.sin(ca) * 1.4);
        g.add(cr);
      }
    }

    // Courtyard walls connecting towers
    const wallPairs: [number[], number[]][] = [
      [corners[0], corners[1]],
      [corners[1], corners[3]],
      [corners[3], corners[2]],
      [corners[2], corners[0]],
    ];
    for (const [p1, p2] of wallPairs) {
      const dx = p2[0] - p1[0];
      const dz = p2[1] - p1[1];
      const len = Math.sqrt(dx * dx + dz * dz);
      const courtWall = new THREE.Mesh(new THREE.BoxGeometry(len, h * 0.5, 0.8), mat(0x888877));
      courtWall.position.set(
        (p1[0] + p2[0]) / 2,
        h * 0.25,
        (p1[1] + p2[1]) / 2
      );
      courtWall.rotation.y = Math.atan2(dz, dx);
      courtWall.castShadow = true;
      g.add(courtWall);
    }

    // Red banners (4 hanging from keep)
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(1, h * 0.5),
        MAT_RED_BANNER
      );
      banner.position.set(
        Math.cos(angle) * (w * 0.26),
        h * 0.75,
        Math.sin(angle) * (d * 0.26)
      );
      banner.rotation.y = angle;
      g.add(banner);
    }

    // Drawbridge (flat plank in front)
    const drawbridge = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 4), MAT_WOOD_DARK);
    drawbridge.position.set(0, 0.08, d * 0.4 + 2);
    drawbridge.receiveShadow = true;
    g.add(drawbridge);

    return g;
  }

  // ── Church ──
  private _buildChurch(b: Building3D): THREE.Group {
    const g = new THREE.Group();
    const w = b.size.x;
    const h = b.size.y;
    const d = b.size.z;

    // Main building
    const main = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MAT_STONE_LIGHT);
    main.position.y = h / 2;
    main.castShadow = true;
    main.receiveShadow = true;
    g.add(main);
    this._addBrickMortar(g, w, h, d, 0, h / 2, 0);

    // Peaked roof — triangular prism via extrude
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-w / 2 - 0.3, 0);
    roofShape.lineTo(0, h * 0.45);
    roofShape.lineTo(w / 2 + 0.3, 0);
    roofShape.lineTo(-w / 2 - 0.3, 0);
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: d + 0.3, bevelEnabled: false });
    const roof = new THREE.Mesh(roofGeo, MAT_ROOF_TILE);
    roof.position.set(0, h, -d / 2 - 0.15);
    roof.castShadow = true;
    g.add(roof);

    // Bell tower
    const towerW = w * 0.3;
    const towerH = h * 1.8;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(towerW, towerH, towerW), MAT_STONE_LIGHT);
    tower.position.set(0, towerH / 2, -d / 2 + towerW / 2);
    tower.castShadow = true;
    g.add(tower);
    this._addBrickMortar(g, towerW, towerH, towerW, 0, towerH / 2, -d / 2 + towerW / 2);

    // Pyramid top
    const pyTop = new THREE.Mesh(new THREE.ConeGeometry(towerW * 0.75, 2.5, 12), MAT_ROOF_TILE);
    pyTop.position.set(0, towerH + 1.25, -d / 2 + towerW / 2);
    pyTop.rotation.y = Math.PI / 4;
    g.add(pyTop);

    // Cross on top
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.5, 0.15), MAT_CROSS);
    crossV.position.set(0, towerH + 3, -d / 2 + towerW / 2);
    g.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.15), MAT_CROSS);
    crossH.position.set(0, towerH + 3.3, -d / 2 + towerW / 2);
    g.add(crossH);

    // Stained glass windows (3 on each side)
    const stainedMats = [MAT_STAINED_R, MAT_STAINED_B, MAT_STAINED_G];
    for (let i = 0; i < 3; i++) {
      const zPos = -d / 2 + (i + 1) * (d / 4);
      // Left side
      const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.5), stainedMats[i % 3]);
      wl.position.set(-w / 2 - 0.01, h * 0.6, zPos);
      wl.rotation.y = -Math.PI / 2;
      g.add(wl);
      // Right side
      const wr = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.5), stainedMats[(i + 1) % 3]);
      wr.position.set(w / 2 + 0.01, h * 0.6, zPos);
      wr.rotation.y = Math.PI / 2;
      g.add(wr);
    }

    // Door
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.5), MAT_WOOD_DARK);
    door.position.set(0, 1.25, d / 2 + 0.01);
    g.add(door);

    return g;
  }

  // ── Tavern ──
  private _buildTavern(b: Building3D): THREE.Group {
    const g = new THREE.Group();
    const w = b.size.x;
    const h = b.size.y;
    const d = b.size.z;

    // First floor
    const floor1 = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.5, d), mat(0xCCAA77));
    floor1.position.y = h * 0.25;
    floor1.castShadow = true;
    floor1.receiveShadow = true;
    g.add(floor1);
    this._addBrickMortar(g, w, h * 0.5, d, 0, h * 0.25, 0);

    // Second floor (slightly overhanging)
    const floor2 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, h * 0.5, d + 0.4), mat(0xCCAA77));
    floor2.position.y = h * 0.75;
    floor2.castShadow = true;
    g.add(floor2);
    this._addBrickMortar(g, w + 0.4, h * 0.5, d + 0.4, 0, h * 0.75, 0);

    // Timber frame beams (vertical)
    const beamMat = MAT_WOOD_DARK;
    const beamPositions = [
      [-w / 2, d / 2], [w / 2, d / 2], [-w / 2, -d / 2], [w / 2, -d / 2],
      [0, d / 2], [0, -d / 2],
    ];
    for (const [bx, bz] of beamPositions) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.15, h, 0.15), beamMat);
      beam.position.set(bx, h / 2, bz);
      g.add(beam);
    }

    // Horizontal beams
    for (const yy of [h * 0.5, h]) {
      for (const zz of [d / 2 + 0.01, -d / 2 - 0.01]) {
        const hBeam = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.12), beamMat);
        hBeam.position.set(0, yy, zz);
        g.add(hBeam);
      }
    }

    // Thatched roof
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-w / 2 - 0.5, 0);
    roofShape.lineTo(0, h * 0.4);
    roofShape.lineTo(w / 2 + 0.5, 0);
    roofShape.lineTo(-w / 2 - 0.5, 0);
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: d + 0.6, bevelEnabled: false });
    const roof = new THREE.Mesh(roofGeo, MAT_THATCH);
    roof.position.set(0, h, -d / 2 - 0.3);
    roof.castShadow = true;
    g.add(roof);

    // Chimney
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.8, h * 0.5, 0.8), MAT_CHIMNEY);
    chimney.position.set(w * 0.3, h + h * 0.25, -d * 0.3);
    chimney.castShadow = true;
    g.add(chimney);

    // Hanging tavern sign
    const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), MAT_WOOD_DARK);
    signPost.position.set(w / 2 + 0.5, h * 0.45, d / 2);
    g.add(signPost);
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.05), MAT_WOOD);
    signBoard.position.set(w / 2 + 0.5 + 0.7, h * 0.55, d / 2);
    g.add(signBoard);

    // Glowing windows (visible at night)
    const windowPositions = [
      [w / 2 + 0.02, h * 0.35, d * 0.15],
      [w / 2 + 0.02, h * 0.35, -d * 0.15],
      [w / 2 + 0.02, h * 0.75, d * 0.15],
      [w / 2 + 0.02, h * 0.75, -d * 0.15],
      [-w / 2 - 0.02, h * 0.75, 0],
    ];
    for (const [wx, wy, wz] of windowPositions) {
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), MAT_GLOW_YELLOW);
      glow.position.set(wx, wy, wz);
      glow.rotation.y = wx > 0 ? Math.PI / 2 : -Math.PI / 2;
      glow.visible = false;
      g.add(glow);
      this._windowGlowPlanes.push(glow);
    }

    // Door
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2), MAT_WOOD_DARK);
    door.position.set(0, 1, d / 2 + 0.02);
    g.add(door);

    return g;
  }

  // ── Blacksmith Shop ──
  private _buildBlacksmith(b: Building3D): THREE.Group {
    const g = new THREE.Group();
    const w = b.size.x;
    const h = b.size.y;
    const d = b.size.z;

    // Back wall and sides (open front)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), MAT_STONE);
    backWall.position.set(0, h / 2, -d / 2);
    backWall.castShadow = true;
    g.add(backWall);
    this._addBrickMortar(g, w, h, 0.4, 0, h / 2, -d / 2);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, d), MAT_WOOD);
    leftWall.position.set(-w / 2, h / 2, 0);
    leftWall.castShadow = true;
    g.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, d * 0.4), MAT_WOOD);
    rightWall.position.set(w / 2, h / 2, -d * 0.3);
    rightWall.castShadow = true;
    g.add(rightWall);

    // Roof (slanted)
    const roofM = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.15, d + 0.6), MAT_WOOD_DARK);
    roofM.position.set(0, h + 0.3, 0);
    roofM.rotation.x = -0.15;
    roofM.castShadow = true;
    g.add(roofM);

    // Support posts
    for (const px of [-w / 2 + 0.2, w / 2 - 0.2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, h, 14), MAT_WOOD_DARK);
      post.position.set(px, h / 2, d / 2 - 0.3);
      g.add(post);
    }

    // Stone chimney
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.5, h * 1.2, 1.5), MAT_STONE);
    chimney.position.set(-w * 0.3, h * 0.6, -d / 2 + 1);
    chimney.castShadow = true;
    g.add(chimney);
    this._addBrickMortar(g, 1.5, h * 1.2, 1.5, -w * 0.3, h * 0.6, -d / 2 + 1);

    // Anvil
    const anvilBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.4), MAT_IRON);
    anvilBase.position.set(w * 0.1, 0.25, 0);
    g.add(anvilBase);
    const anvilTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.5), MAT_IRON);
    anvilTop.position.set(w * 0.1, 0.55, 0);
    g.add(anvilTop);

    // Forge glow
    const forgeGlow = new THREE.PointLight(0xFF5500, 1.2, 10);
    forgeGlow.position.set(-w * 0.3, 1.5, -d / 2 + 1.5);
    g.add(forgeGlow);
    this._torchLights.push(forgeGlow);

    // Forge emissive
    const forgeEmissive = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 0.8),
      MAT_GLOW_ORANGE
    );
    forgeEmissive.position.set(-w * 0.3, 1, -d / 2 + 0.21);
    g.add(forgeEmissive);

    return g;
  }

  // ── Market Stall ──
  private _buildMarketStall(b: Building3D): THREE.Group {
    const g = new THREE.Group();
    const w = b.size.x;
    const h = b.size.y;
    const d = b.size.z;

    // 4 wooden posts
    const postH = h;
    const posts: [number, number][] = [
      [-w / 2, -d / 2], [w / 2, -d / 2],
      [-w / 2, d / 2], [w / 2, d / 2],
    ];
    for (const [px, pz] of posts) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, postH, 14), MAT_WOOD);
      post.position.set(px, postH / 2, pz);
      post.castShadow = true;
      g.add(post);
    }

    // Counter / table
    const counter = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), MAT_WOOD);
    counter.position.y = h * 0.4;
    counter.receiveShadow = true;
    g.add(counter);

    // Canopy (angled fabric)
    const canopyIdx = Math.floor(Math.random() * CANOPY_COLORS.length);
    const canopyMat = mat(CANOPY_COLORS[canopyIdx], { side: THREE.DoubleSide });
    const canopy = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.4, d + 0.4), canopyMat);
    canopy.position.y = postH + 0.1;
    canopy.rotation.x = -Math.PI / 2 + 0.15;
    canopy.receiveShadow = true;
    g.add(canopy);

    // Some wares on counter
    for (let i = 0; i < 3; i++) {
      const ware = new THREE.Mesh(
        _sphere,
        mat(0xCC8844 + Math.floor(Math.random() * 0x333333))
      );
      ware.scale.set(0.25, 0.25, 0.25);
      ware.position.set((i - 1) * w * 0.3, h * 0.4 + 0.2, 0);
      g.add(ware);
    }

    return g;
  }

  // ── Stable ──
  private _buildStable(b: Building3D): THREE.Group {
    const g = new THREE.Group();
    const w = b.size.x;
    const h = b.size.y;
    const d = b.size.z;

    // Back wall
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), MAT_WOOD);
    back.position.set(0, h / 2, -d / 2);
    back.castShadow = true;
    g.add(back);
    this._addBrickMortar(g, w, h, 0.3, 0, h / 2, -d / 2);

    // Side walls
    for (const side of [-1, 1]) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(0.3, h, d), MAT_WOOD);
      sw.position.set(side * w / 2, h / 2, 0);
      sw.castShadow = true;
      g.add(sw);
      this._addBrickMortar(g, 0.3, h, d, side * w / 2, h / 2, 0);
    }

    // Roof (slanted)
    const roofM = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.12, d + 0.5), MAT_THATCH);
    roofM.position.set(0, h + 0.3, 0);
    roofM.rotation.x = -0.1;
    roofM.castShadow = true;
    g.add(roofM);

    // Support posts along open front
    for (let i = 0; i < 4; i++) {
      const px = -w / 2 + 0.15 + i * (w / 3);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, h, 14), MAT_WOOD_DARK);
      post.position.set(px, h / 2, d / 2);
      g.add(post);
    }

    // Stall dividers
    const stallCount = 3;
    for (let i = 1; i < stallCount; i++) {
      const div = new THREE.Mesh(new THREE.BoxGeometry(0.1, h * 0.6, d * 0.8), MAT_WOOD_DARK);
      div.position.set(-w / 2 + i * (w / stallCount), h * 0.3, -d * 0.1);
      g.add(div);
    }

    // Hay bales
    for (let i = 0; i < stallCount; i++) {
      const hay = new THREE.Mesh(new THREE.BoxGeometry(w / stallCount * 0.6, 0.5, 0.8), MAT_HAY);
      hay.position.set(-w / 2 + (i + 0.5) * (w / stallCount), 0.25, -d * 0.3);
      g.add(hay);
    }

    return g;
  }

  // ── Houses (large / medium / small) ──
  private _buildHouse(b: Building3D, size: "large" | "medium" | "small"): THREE.Group {
    const g = new THREE.Group();
    const w = b.size.x;
    const h = b.size.y;
    const d = b.size.z;

    const isTimber = size !== "large";
    const wallMat = isTimber ? mat(0xCCAA77) : MAT_STONE_LIGHT;

    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    this._addBrickMortar(g, w, h, d, 0, h / 2, 0);

    // Timber beams for timber frame houses
    if (isTimber) {
      // Vertical corner beams
      for (const cx of [-w / 2, w / 2]) {
        for (const cz of [-d / 2, d / 2]) {
          const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.12), MAT_WOOD_DARK);
          beam.position.set(cx, h / 2, cz);
          g.add(beam);
        }
      }
      // Mid horizontal beam
      for (const zz of [d / 2 + 0.01, -d / 2 - 0.01]) {
        const hb = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.1), MAT_WOOD_DARK);
        hb.position.set(0, h * 0.5, zz);
        g.add(hb);
      }
    }

    // Peaked roof
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-w / 2 - 0.3, 0);
    roofShape.lineTo(0, h * 0.4);
    roofShape.lineTo(w / 2 + 0.3, 0);
    roofShape.lineTo(-w / 2 - 0.3, 0);
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: d + 0.3, bevelEnabled: false });
    const roofMat = size === "large" ? MAT_ROOF_TILE : MAT_THATCH;
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, h, -d / 2 - 0.15);
    roof.castShadow = true;
    g.add(roof);

    // Door
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), MAT_WOOD_DARK);
    door.position.set(0, 0.9, d / 2 + 0.02);
    g.add(door);

    // Windows (dark rectangles) on sides
    for (const side of [-1, 1]) {
      const winCount = size === "small" ? 1 : size === "medium" ? 2 : 3;
      for (let i = 0; i < winCount; i++) {
        const wz = -d / 2 + (i + 1) * (d / (winCount + 1));
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.7), MAT_WOOD_DARK);
        win.position.set(side * (w / 2 + 0.02), h * 0.55, wz);
        win.rotation.y = side * Math.PI / 2;
        g.add(win);

        // Glow plane behind window
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.65), MAT_GLOW_YELLOW);
        glow.position.set(side * (w / 2 + 0.03), h * 0.55, wz);
        glow.rotation.y = side * Math.PI / 2;
        glow.visible = false;
        g.add(glow);
        this._windowGlowPlanes.push(glow);
      }
    }

    // Large house extras
    if (size === "large") {
      // Chimney
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.7, h * 0.4, 0.7), MAT_CHIMNEY);
      chimney.position.set(w * 0.3, h + h * 0.35, -d * 0.2);
      chimney.castShadow = true;
      g.add(chimney);

      // Dormer windows (small box protrusion on roof)
      for (const dx of [-w * 0.2, w * 0.2]) {
        const dormer = new THREE.Mesh(new THREE.BoxGeometry(1, 0.9, 0.8), wallMat);
        dormer.position.set(dx, h + h * 0.15, d / 2 + 0.1);
        g.add(dormer);
        const dormerRoof = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.5, 12), MAT_ROOF_TILE);
        dormerRoof.position.set(dx, h + h * 0.15 + 0.7, d / 2 + 0.1);
        dormerRoof.rotation.y = Math.PI / 4;
        g.add(dormerRoof);
      }
    }

    return g;
  }

  // ── Wall Tower ──
  private _buildWallTower(b: Building3D): THREE.Group {
    const g = new THREE.Group();
    const h = b.size.y;
    const r = Math.max(b.size.x, b.size.z) * 0.4;

    const tower = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, h, 20), MAT_STONE);
    tower.position.y = h / 2;
    tower.castShadow = true;
    g.add(tower);

    // Crenellations
    for (let i = 0; i < 8; i++) {
      const ca = (i / 8) * Math.PI * 2;
      if (i % 2 === 0) {
        const cren = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), MAT_STONE);
        cren.position.set(Math.cos(ca) * (r + 0.1), h + 0.35, Math.sin(ca) * (r + 0.1));
        g.add(cren);
      }
    }

    // Torch
    const torch = new THREE.PointLight(0xFF8833, 0.7, 10);
    torch.position.set(0, h * 0.7, r + 0.3);
    g.add(torch);
    this._torchLights.push(torch);

    return g;
  }

  // ── Fountain ──
  private _buildFountain(b: Building3D): THREE.Group {
    const g = new THREE.Group();
    const r = Math.max(b.size.x, b.size.z) * 0.4;

    // Stepped base platform
    const baseStep = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.5, r + 0.6, 0.2, 24), MAT_STONE_LIGHT);
    baseStep.position.y = 0.1;
    g.add(baseStep);
    const upperStep = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.2, r + 0.4, 0.2, 24), MAT_STONE_LIGHT);
    upperStep.position.y = 0.3;
    g.add(upperStep);

    // Basin (torus) — smooth
    const basin = new THREE.Mesh(new THREE.TorusGeometry(r, 0.3, 16, 32), MAT_STONE_LIGHT);
    basin.position.y = 0.8;
    basin.rotation.x = Math.PI / 2;
    g.add(basin);
    // Basin inner lip
    const basinLip = new THREE.Mesh(new THREE.TorusGeometry(r - 0.15, 0.08, 10, 28), MAT_STONE);
    basinLip.position.y = 0.85;
    basinLip.rotation.x = Math.PI / 2;
    g.add(basinLip);

    // Water surface inside basin
    const water = new THREE.Mesh(new THREE.CircleGeometry(r - 0.1, 32), MAT_WATER);
    water.position.y = 0.72;
    water.rotation.x = -Math.PI / 2;
    g.add(water);

    // Base pedestal — fluted column base
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.42, 0.8, 20), MAT_STONE_LIGHT);
    pedestal.position.y = 0.4;
    g.add(pedestal);
    // Pedestal molding ring
    const pedestalRing = new THREE.Mesh(new THREE.TorusGeometry(r * 0.35, 0.04, 8, 20), MAT_STONE);
    pedestalRing.position.y = 0.8;
    pedestalRing.rotation.x = Math.PI / 2;
    g.add(pedestalRing);

    // Central pillar — smooth with capital and base
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.6, 18), MAT_STONE);
    pillar.position.y = 1.6;
    g.add(pillar);
    // Pillar base molding
    const pillarBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.12, 16), MAT_STONE);
    pillarBase.position.y = 0.86;
    g.add(pillarBase);
    // Pillar capital (wider top)
    const pillarCap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.15, 16), MAT_STONE);
    pillarCap.position.y = 2.45;
    g.add(pillarCap);

    // Top decoration — ornate sphere with water spout arms
    const topDec = new THREE.Mesh(new THREE.SphereGeometry(0.25, 18, 14), MAT_STONE);
    topDec.position.y = 2.7;
    g.add(topDec);
    // 4 water spout arms
    for (let sp = 0; sp < 4; sp++) {
      const spAngle = (sp / 4) * Math.PI * 2;
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.35, 10), MAT_STONE);
      spout.position.set(Math.cos(spAngle) * 0.2, 2.55, Math.sin(spAngle) * 0.2);
      spout.rotation.z = Math.cos(spAngle) * 0.8;
      spout.rotation.x = Math.sin(spAngle) * 0.8;
      g.add(spout);
    }
    // Finial spike
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 12), MAT_STONE);
    finial.position.y = 2.98;
    g.add(finial);

    return g;
  }

  // ── Tree Cluster ──
  private _buildTreeCluster(b: Building3D): THREE.Group {
    const g = new THREE.Group();
    const count = 3 + Math.floor(Math.random() * 6);
    const spread = Math.max(b.size.x, b.size.z) * 0.5;
    for (let i = 0; i < count; i++) {
      const tx = (Math.random() - 0.5) * spread * 2;
      const tz = (Math.random() - 0.5) * spread * 2;
      const th = 2.5 + Math.random() * 3.5;

      // Trunk — smooth
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.27, th * 0.5, 12),
        MAT_WOOD_DARK
      );
      trunk.position.set(tx, th * 0.25, tz);
      trunk.castShadow = true;
      g.add(trunk);

      // Canopy — higher segments
      const useCone = Math.random() > 0.3;
      const greenShade = 0x2E7D32 + Math.floor(Math.random() * 0x112200);
      let canopy: THREE.Mesh;
      if (useCone) {
        canopy = new THREE.Mesh(new THREE.ConeGeometry(th * 0.4, th * 0.6, 14), mat(greenShade));
      } else {
        canopy = new THREE.Mesh(new THREE.SphereGeometry(th * 0.38, 14, 10), mat(greenShade));
      }
      canopy.position.set(tx, th * 0.55 + th * 0.2, tz);
      canopy.castShadow = true;
      g.add(canopy);
      this._treeCanopies.push(canopy);
    }
    return g;
  }

  // ── Farmhouse ──
  private _buildFarmhouse(b: Building3D): THREE.Group {
    const g = new THREE.Group();
    const w = b.size.x;
    const h = b.size.y;
    const d = b.size.z;

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(0xBB9966));
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    this._addBrickMortar(g, w, h, d, 0, h / 2, 0);

    // Thatched roof
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-w / 2 - 0.4, 0);
    roofShape.lineTo(0, h * 0.45);
    roofShape.lineTo(w / 2 + 0.4, 0);
    roofShape.lineTo(-w / 2 - 0.4, 0);
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: d + 0.4, bevelEnabled: false });
    const roof = new THREE.Mesh(roofGeo, MAT_THATCH);
    roof.position.set(0, h, -d / 2 - 0.2);
    roof.castShadow = true;
    g.add(roof);

    // Door
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.5), MAT_WOOD_DARK);
    door.position.set(0, 0.75, d / 2 + 0.02);
    g.add(door);

    // Small window
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), MAT_WOOD_DARK);
    win.position.set(w / 2 + 0.02, h * 0.6, 0);
    win.rotation.y = Math.PI / 2;
    g.add(win);

    // Window glow
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.45), MAT_GLOW_YELLOW);
    glow.position.set(w / 2 + 0.03, h * 0.6, 0);
    glow.rotation.y = Math.PI / 2;
    glow.visible = false;
    g.add(glow);
    this._windowGlowPlanes.push(glow);

    return g;
  }

  // ── Mill / Windmill ──
  private _buildMill(b: Building3D): THREE.Group {
    const g = new THREE.Group();
    const w = b.size.x;
    const h = b.size.y;

    // Tower body (tapered cylinder)
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(w * 0.3, w * 0.4, h, 10),
      MAT_STONE_LIGHT
    );
    tower.position.y = h / 2;
    tower.castShadow = true;
    g.add(tower);
    this._addTowerMortar(g, w * 0.35, h, 0, h / 2, 0);

    // Cone roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.38, 2, 10), MAT_THATCH);
    roof.position.y = h + 1;
    roof.castShadow = true;
    g.add(roof);

    // Windmill blades — 4 thin boxes in a cross
    const bladesGroup = new THREE.Group();
    bladesGroup.position.set(0, h * 0.7, w * 0.35);
    const bladeLen = h * 0.6;
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, bladeLen, 0.06),
        MAT_WOOD
      );
      blade.position.y = bladeLen / 2;
      blade.rotation.z = (i / 4) * Math.PI * 2;
      // Pivot blade around center
      const pivotGroup = new THREE.Group();
      pivotGroup.add(blade);
      pivotGroup.rotation.z = (i / 4) * Math.PI * 2;
      bladesGroup.add(pivotGroup);
    }
    // Use a single cross group for rotation
    const crossGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, bladeLen, 0.05),
        MAT_WOOD
      );
      arm.position.y = bladeLen / 2;
      const armG = new THREE.Group();
      armG.add(arm);
      armG.rotation.z = (i / 4) * Math.PI * 2;
      crossGroup.add(armG);
    }
    // Hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 14), MAT_IRON);
    hub.rotation.x = Math.PI / 2;
    crossGroup.add(hub);

    crossGroup.position.set(0, h * 0.7, w * 0.35);
    g.add(crossGroup);
    this._windmillBlades.push(crossGroup);

    // Door
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6), MAT_WOOD_DARK);
    door.position.set(0, 0.8, w * 0.4 + 0.02);
    g.add(door);

    return g;
  }

  // ── Farm Field ──
  private _buildFarmField(b: Building3D): THREE.Group {
    const g = new THREE.Group();
    const w = b.size.x;
    const d = b.size.z;

    // Base field plane
    const field = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(0x6B5B3A));
    field.rotation.x = -Math.PI / 2;
    field.position.y = 0.03;
    field.receiveShadow = true;
    g.add(field);

    // Row lines (lighter strips)
    const rowCount = Math.floor(d / 1.2);
    for (let i = 0; i < rowCount; i++) {
      const row = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.9, 0.02, 0.3),
        mat(0x557733)
      );
      row.position.set(0, 0.04, -d / 2 + (i + 0.5) * (d / rowCount));
      g.add(row);
    }

    return g;
  }

  // ── Generic / fallback ──
  private _buildGenericBuilding(b: Building3D): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(b.size.x, b.size.y, b.size.z),
      MAT_STONE
    );
    body.position.y = b.size.y / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    this._addBrickMortar(g, b.size.x, b.size.y, b.size.z, 0, b.size.y / 2, 0);
    return g;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  PLAYER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private _buildPlayerMesh(): void {
    this._playerGroup = new THREE.Group();

    // ── Torso — tapered for a more human silhouette ──
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.7, 0.32),
      MAT_BLUE_TUNIC
    );
    torso.position.y = 1.35;
    torso.castShadow = true;
    this._playerGroup.add(torso);

    // Lower tunic / skirt piece (slightly wider, covers hips)
    const tunicSkirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.35, 0.34),
      MAT_BLUE_TUNIC
    );
    tunicSkirt.position.y = 0.88;
    tunicSkirt.castShadow = true;
    this._playerGroup.add(tunicSkirt);

    // ── Head — smooth sphere with detailed face ──
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 20), MAT_SKIN);
    head.position.y = 2.0;
    head.scale.set(1, 1.08, 0.95);
    head.castShadow = true;
    this._playerGroup.add(head);

    // Eyes — white sclera + iris + pupil
    for (const side of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 14, 12),
        mat(0xEEEEDD)
      );
      eyeWhite.position.set(side * 0.08, 2.03, 0.17);
      eyeWhite.scale.set(1, 0.7, 0.5);
      this._playerGroup.add(eyeWhite);
      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 12, 10),
        mat(0x4477AA)
      );
      iris.position.set(side * 0.08, 2.03, 0.19);
      this._playerGroup.add(iris);
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.009, 12, 10),
        mat(0x111111)
      );
      pupil.position.set(side * 0.08, 2.03, 0.195);
      this._playerGroup.add(pupil);
      // Eyelid crease
      const lid = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.006, 0.01),
        mat(0xBB9977)
      );
      lid.position.set(side * 0.08, 2.055, 0.18);
      this._playerGroup.add(lid);
    }

    // Eyebrows
    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.012, 0.015),
        mat(0x3A2718)
      );
      brow.position.set(side * 0.08, 2.065, 0.18);
      brow.rotation.z = side * -0.15;
      this._playerGroup.add(brow);
    }

    // Nose — smooth rounded shape
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.025, 0.06, 12),
      MAT_SKIN
    );
    nose.position.set(0, 1.97, 0.22);
    nose.rotation.x = -Math.PI / 2;
    this._playerGroup.add(nose);
    // Nose bridge
    const noseBridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.04, 0.02),
      MAT_SKIN
    );
    noseBridge.position.set(0, 2.0, 0.2);
    this._playerGroup.add(noseBridge);

    // Mouth
    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.008, 0.01),
      mat(0xAA6655)
    );
    mouth.position.set(0, 1.93, 0.2);
    this._playerGroup.add(mouth);

    // Chin
    const chin = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 10),
      MAT_SKIN
    );
    chin.position.set(0, 1.9, 0.14);
    chin.scale.set(1.2, 0.5, 0.8);
    this._playerGroup.add(chin);

    // Ears
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 14, 12),
        MAT_SKIN
      );
      ear.position.set(side * 0.21, 2.0, 0);
      ear.scale.set(0.4, 0.8, 0.6);
      this._playerGroup.add(ear);
    }

    // Hair — smooth cap with fringe
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.235, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
      mat(0x4A3728)
    );
    hair.position.y = 2.04;
    hair.scale.set(1, 1.05, 1.05);
    this._playerGroup.add(hair);
    // Hair fringe over forehead
    const fringe = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.03, 0.08),
      mat(0x4A3728)
    );
    fringe.position.set(0, 2.12, 0.14);
    this._playerGroup.add(fringe);
    // Hair back/sides covering ears
    const hairBack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.08, 0.18, 12),
      mat(0x4A3728)
    );
    hairBack.position.set(0, 1.9, -0.12);
    this._playerGroup.add(hairBack);

    // Neck — smooth
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.15, 16),
      MAT_SKIN
    );
    neck.position.y = 1.78;
    this._playerGroup.add(neck);

    // ── Arms — upper + forearm with skin-colored hands ──
    for (const [side, armName] of [[-1, "left_arm"], [1, "right_arm"]] as [number, string][]) {
      const armGroup = new THREE.Group();
      armGroup.name = armName;
      // Upper arm (tunic color)
      const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.45, 0.16), MAT_BLUE_TUNIC);
      upperArm.position.y = -0.15;
      upperArm.castShadow = true;
      armGroup.add(upperArm);
      // Forearm (skin)
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.35, 0.13), MAT_SKIN);
      forearm.position.y = -0.45;
      forearm.castShadow = true;
      armGroup.add(forearm);
      // Hand (smooth sphere)
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 12), MAT_SKIN);
      hand.position.y = -0.65;
      armGroup.add(hand);
      // Fingers hint (subtle bumps on front of hand)
      const fingers = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.03, 0.04),
        MAT_SKIN
      );
      fingers.position.set(0, -0.71, 0.03);
      armGroup.add(fingers);
      armGroup.position.set(side * 0.38, 1.6, 0);
      this._playerGroup.add(armGroup);
    }

    // Shoulder pauldrons (smooth metal domes with rim)
    for (const side of [-1, 1]) {
      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
        MAT_GREY_ARMOR
      );
      pauldron.position.set(side * 0.38, 1.72, 0);
      pauldron.castShadow = true;
      this._playerGroup.add(pauldron);
      // Pauldron rim
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.015, 8, 20),
        MAT_GREY_ARMOR
      );
      rim.position.set(side * 0.38, 1.68, 0);
      rim.rotation.x = Math.PI / 2;
      this._playerGroup.add(rim);
      // Decorative rivet on pauldron
      const rivet = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 14, 12),
        MAT_GOLD_MAT
      );
      rivet.position.set(side * 0.38, 1.75, 0.1);
      this._playerGroup.add(rivet);
    }

    // ── Legs — upper thigh + lower shin ──
    for (const [side, legName] of [[-1, "left_leg"], [1, "right_leg"]] as [number, string][]) {
      const legGroup = new THREE.Group();
      legGroup.name = legName;
      // Thigh (pants color)
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.2), mat(0x554433));
      thigh.position.y = -0.15;
      thigh.castShadow = true;
      legGroup.add(thigh);
      // Shin
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.18), mat(0x554433));
      shin.position.y = -0.5;
      shin.castShadow = true;
      legGroup.add(shin);
      legGroup.position.set(side * 0.14, 0.7, 0);
      this._playerGroup.add(legGroup);
    }

    // Boots (with slight heel)
    for (const side of [-1, 1]) {
      const boot = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.3),
        mat(0x3A2211)
      );
      boot.position.set(side * 0.14, 0.11, 0.03);
      boot.castShadow = true;
      this._playerGroup.add(boot);
    }

    // Belt with pouch
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.07, 0.38),
      mat(0x4A3020)
    );
    belt.position.set(0, 0.93, 0);
    this._playerGroup.add(belt);
    const buckle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16),
      MAT_GOLD_MAT
    );
    buckle.position.set(0, 0.93, 0.2);
    buckle.rotation.x = Math.PI / 2;
    this._playerGroup.add(buckle);
    // Buckle center detail
    const buckleInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.025, 10),
      mat(0xBB8822)
    );
    buckleInner.position.set(0, 0.93, 0.21);
    buckleInner.rotation.x = Math.PI / 2;
    this._playerGroup.add(buckleInner);
    // Belt pouch (rounded)
    const pouch = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 12, 10),
      mat(0x5A3E1B)
    );
    pouch.position.set(0.22, 0.9, 0.18);
    pouch.scale.set(0.9, 0.8, 0.7);
    this._playerGroup.add(pouch);
    // Pouch flap
    const pouchFlap = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.03, 0.08),
      mat(0x5A3E1B)
    );
    pouchFlap.position.set(0.22, 0.95, 0.18);
    this._playerGroup.add(pouchFlap);

    // Cape (attached at shoulders, flowing down back)
    this._playerCape = new THREE.Mesh(
      new THREE.PlaneGeometry(0.65, 1.2),
      mat(0x1A1A55, { side: THREE.DoubleSide })
    );
    this._playerCape.position.set(0, 1.15, -0.2);
    this._playerGroup.add(this._playerCape);
    // Cape bottom (lighter)
    const capeLower = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.4),
      mat(0x2A2A77, { side: THREE.DoubleSide })
    );
    capeLower.position.set(0, 0.72, -0.19);
    capeLower.name = "cape_lower";
    this._playerGroup.add(capeLower);

    // Cape collar (small ring at neck)
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.03, 10, 16, Math.PI),
      mat(0x1A1A55)
    );
    collar.position.set(0, 1.73, -0.12);
    collar.rotation.x = Math.PI / 4;
    this._playerGroup.add(collar);

    // Weapon container
    this._playerWeapon = new THREE.Group();
    this._playerWeapon.position.set(0.5, 1.3, 0.15);
    this._playerGroup.add(this._playerWeapon);

    this._scene.add(this._playerGroup);
  }

  private _updatePlayer(state: GTA3DState): void {
    const p = state.player;

    if (p.onHorse) {
      // When mounted, raise player mesh
      this._playerGroup.position.set(p.pos.x, p.pos.y + 1.4, p.pos.z);
    } else {
      this._playerGroup.position.set(p.pos.x, p.pos.y, p.pos.z);
    }
    this._playerGroup.rotation.y = p.rotation;

    // Cape sway animation
    this._playerCape.rotation.x = Math.sin(this._elapsed * 3) * 0.08;
    const capeLowerMesh = this._playerGroup.getObjectByName("cape_lower") as THREE.Mesh | undefined;
    if (capeLowerMesh) {
      capeLowerMesh.rotation.x = Math.sin(this._elapsed * 3 + 0.5) * 0.1;
    }

    // Walk/run limb animation
    if (p.state === "walking" || p.state === "running") {
      const animSpeed = p.state === "running" ? 12 : 8;
      const animAmplitude = p.state === "running" ? 0.5 : 0.3;
      const leftLeg = this._playerGroup.getObjectByName("left_leg") as THREE.Mesh | undefined;
      const rightLeg = this._playerGroup.getObjectByName("right_leg") as THREE.Mesh | undefined;
      const leftArm = this._playerGroup.getObjectByName("left_arm") as THREE.Mesh | undefined;
      const rightArm = this._playerGroup.getObjectByName("right_arm") as THREE.Mesh | undefined;
      const sineVal = Math.sin(this._elapsed * animSpeed);
      if (leftLeg) leftLeg.rotation.x = sineVal * animAmplitude;
      if (rightLeg) rightLeg.rotation.x = -sineVal * animAmplitude;
      if (leftArm) leftArm.rotation.x = -sineVal * animAmplitude;
      if (rightArm) rightArm.rotation.x = sineVal * animAmplitude;
      // Vertical bob
      this._playerGroup.position.y += Math.abs(Math.sin(this._elapsed * animSpeed)) * 0.05;
    } else {
      // Reset limb rotations when not walking/running
      const leftLeg = this._playerGroup.getObjectByName("left_leg") as THREE.Mesh | undefined;
      const rightLeg = this._playerGroup.getObjectByName("right_leg") as THREE.Mesh | undefined;
      const leftArm = this._playerGroup.getObjectByName("left_arm") as THREE.Mesh | undefined;
      const rightArm = this._playerGroup.getObjectByName("right_arm") as THREE.Mesh | undefined;
      if (leftLeg) leftLeg.rotation.x = 0;
      if (rightLeg) rightLeg.rotation.x = 0;
      if (leftArm) leftArm.rotation.x = 0;
      if (rightArm) rightArm.rotation.x = 0;
    }

    // Update weapon mesh
    this._updatePlayerWeapon(p.weapon);

    // Attack animation: rotate weapon forward
    if (p.state === "attacking" && p.attackTimer > 0) {
      const t = p.attackTimer / 0.3;
      this._playerWeapon.rotation.x = -Math.PI * 0.6 * (1 - t);
    } else {
      this._playerWeapon.rotation.x = 0;
    }

    // Dead state
    if (p.state === "dead") {
      this._playerGroup.rotation.x = -Math.PI / 2;
      this._playerGroup.position.y = 0.3;
    } else {
      this._playerGroup.rotation.x = 0;
    }
  }

  private _currentWeapon: string = "";
  private _updatePlayerWeapon(weapon: string): void {
    if (weapon === this._currentWeapon) return;
    this._currentWeapon = weapon;

    // Clear old weapon
    while (this._playerWeapon.children.length > 0) {
      this._playerWeapon.remove(this._playerWeapon.children[0]);
    }

    switch (weapon) {
      case "sword": {
        // Blade — tapered
        const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.03, 0.8, 12), MAT_GREY_ARMOR);
        blade.position.y = 0.4;
        this._playerWeapon.add(blade);
        // Blade edge highlight
        const bladeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.7, 0.05), mat(0xDDDDEE, { metalness: 1.0, roughness: 0.0 }));
        bladeEdge.position.y = 0.38;
        this._playerWeapon.add(bladeEdge);
        // Fuller (central groove)
        const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.5, 0.008), mat(0x777788));
        fuller.position.set(0, 0.35, 0);
        this._playerWeapon.add(fuller);
        // Guard — swept curves
        const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.2, 12), MAT_GOLD_MAT);
        guard.position.y = 0;
        guard.rotation.z = Math.PI / 2;
        this._playerWeapon.add(guard);
        // Guard tips
        for (const side of [-1, 1]) {
          const gTip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 10), MAT_GOLD_MAT);
          gTip.position.set(side * 0.1, 0, 0);
          this._playerWeapon.add(gTip);
        }
        // Handle — wrapped grip
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.2, 14), MAT_WOOD_DARK);
        handle.position.y = -0.12;
        this._playerWeapon.add(handle);
        // Grip wraps
        for (let gw = 0; gw < 4; gw++) {
          const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.004, 8, 14), MAT_WOOD_DARK);
          wrap.position.y = -0.06 - gw * 0.04;
          wrap.rotation.x = Math.PI / 2;
          this._playerWeapon.add(wrap);
        }
        // Pommel
        const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), MAT_GOLD_MAT);
        pommel.position.y = -0.24;
        this._playerWeapon.add(pommel);
        break;
      }
      case "axe": {
        // Handle — smooth wood
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.7, 14), MAT_WOOD);
        handle.position.y = 0.1;
        this._playerWeapon.add(handle);
        // Axe head — curved blade
        const headGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.05, 16, 1, false, 0, Math.PI);
        const head = new THREE.Mesh(headGeo, MAT_IRON);
        head.position.set(0.08, 0.45, 0);
        head.rotation.z = Math.PI / 2;
        this._playerWeapon.add(head);
        // Axe eye (hole where handle goes through)
        const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 10), MAT_WOOD);
        eye.position.set(0, 0.45, 0);
        eye.rotation.x = Math.PI / 2;
        this._playerWeapon.add(eye);
        // Blade edge
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.22, 0.055), mat(0xCCCCDD, { metalness: 1.0, roughness: 0.0 }));
        edge.position.set(0.2, 0.45, 0);
        this._playerWeapon.add(edge);
        break;
      }
      case "mace": {
        // Handle
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.6, 14), MAT_WOOD);
        handle.position.y = 0.1;
        this._playerWeapon.add(handle);
        // Sphere head — smooth
        const headM = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 16), MAT_IRON);
        headM.position.y = 0.5;
        this._playerWeapon.add(headM);
        // Crown ring around head
        const crown = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 20), MAT_IRON);
        crown.position.y = 0.5;
        crown.rotation.x = Math.PI / 2;
        this._playerWeapon.add(crown);
        // Flanges (6 radial spikes)
        for (let f = 0; f < 6; f++) {
          const fa = (f / 6) * Math.PI * 2;
          const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.02, 0.08, 12), MAT_IRON);
          flange.position.set(Math.cos(fa) * 0.08, 0.5, Math.sin(fa) * 0.08);
          flange.rotation.z = Math.PI / 2;
          flange.rotation.y = fa;
          this._playerWeapon.add(flange);
        }
        // Pommel
        const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.025, 14, 12), MAT_IRON);
        pommel.position.y = -0.2;
        this._playerWeapon.add(pommel);
        break;
      }
      case "spear": {
        // Long shaft
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.5, 14), MAT_WOOD);
        shaft.position.y = 0.4;
        this._playerWeapon.add(shaft);
        // Spearhead — leaf-shaped
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.25, 12), MAT_GREY_ARMOR);
        tip.position.y = 1.22;
        this._playerWeapon.add(tip);
        // Socket (connects head to shaft)
        const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.08, 12), MAT_GREY_ARMOR);
        socket.position.y = 1.08;
        this._playerWeapon.add(socket);
        // Butt cap
        const butt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.04, 10), MAT_IRON);
        butt.position.y = -0.37;
        this._playerWeapon.add(butt);
        break;
      }
      case "bow": {
        // Bow arc — smooth torus
        const bowGeo = new THREE.TorusGeometry(0.4, 0.02, 12, 24, Math.PI);
        const bowMesh = new THREE.Mesh(bowGeo, MAT_WOOD_DARK);
        bowMesh.position.y = 0.2;
        bowMesh.rotation.z = Math.PI / 2;
        this._playerWeapon.add(bowMesh);
        // Bow tips (nocks)
        for (const yOff of [-0.2, 0.6]) {
          const nock = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 10), MAT_WOOD_DARK);
          nock.position.set(-0.4, yOff, 0);
          this._playerWeapon.add(nock);
        }
        // Grip wrapping in center
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 10), mat(0x6B4226));
        grip.position.set(0, 0.2, 0);
        this._playerWeapon.add(grip);
        // String (smooth)
        const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.8, 10), mat(0xCCCCBB));
        str.position.set(0, 0.2, 0);
        this._playerWeapon.add(str);
        break;
      }
      case "crossbow": {
        // Stock — tapered
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.06), MAT_WOOD);
        stock.position.y = 0.1;
        this._playerWeapon.add(stock);
        // Stock butt plate
        const buttPlate = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.08), mat(0x4A3020));
        buttPlate.position.y = -0.16;
        this._playerWeapon.add(buttPlate);
        // Cross piece (limbs) — slightly curved
        const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.5, 10), MAT_WOOD_DARK);
        limb.position.y = 0.35;
        limb.rotation.z = Math.PI / 2;
        this._playerWeapon.add(limb);
        // Limb tips
        for (const side of [-1, 1]) {
          const limbTip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), MAT_WOOD_DARK);
          limbTip.position.set(side * 0.25, 0.35, 0);
          this._playerWeapon.add(limbTip);
        }
        // String (smooth)
        const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 10), mat(0xCCCCBB));
        str.position.y = 0.35;
        str.rotation.z = Math.PI / 2;
        this._playerWeapon.add(str);
        // Trigger mechanism
        const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), MAT_IRON);
        trigger.position.set(0, 0.2, -0.04);
        this._playerWeapon.add(trigger);
        // Bolt rail groove
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.25, 0.01), MAT_IRON);
        rail.position.set(0, 0.28, 0.035);
        this._playerWeapon.add(rail);
        break;
      }
      case "fists":
      default:
        // No weapon mesh
        break;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  NPCs
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private _syncNPCs(state: GTA3DState): void {
    const activeIds = new Set<string>();

    state.npcs.forEach((npc, id) => {
      activeIds.add(id);
      let mesh = this._npcMeshes.get(id);
      if (!mesh) {
        mesh = this._createNPCMesh(npc);
        this._scene.add(mesh);
        this._npcMeshes.set(id, mesh);
      }
      // Update position
      mesh.position.set(npc.pos.x, npc.pos.y, npc.pos.z);
      mesh.rotation.y = npc.rotation;

      // Dead: lay flat
      if (npc.dead || npc.behavior === "dead") {
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.3;
      } else {
        mesh.rotation.x = 0;
      }

      // Alert indicator
      const indicator = mesh.getObjectByName("alert_indicator");
      if (indicator) {
        indicator.visible =
          npc.behavior === "chase_player" || npc.behavior === "attack_player";
        if (indicator.visible) {
          indicator.position.y = 2.6 + Math.sin(this._elapsed * 5) * 0.1;
        }
      }

      // Health bar (billboard, only visible when damaged)
      const hpBarGroup = mesh.getObjectByName("hp_bar_group");
      if (hpBarGroup && !npc.dead) {
        if (npc.hp < npc.maxHp) {
          hpBarGroup.visible = true;
          // Billboard: face the camera
          hpBarGroup.quaternion.copy(this._camera.quaternion);
          // Scale the fill bar by hp ratio
          const hpFill = hpBarGroup.getObjectByName("hp_bar_fill");
          if (hpFill) {
            const ratio = Math.max(0, npc.hp / npc.maxHp);
            hpFill.scale.x = ratio;
            hpFill.position.x = -0.3 * (1 - ratio); // keep left-aligned
          }
        } else {
          hpBarGroup.visible = false;
        }
      } else if (hpBarGroup && npc.dead) {
        hpBarGroup.visible = false;
      }

      // NPC walking animation (leg swing based on velocity)
      if (!npc.dead && npc.behavior !== "dead") {
        const npcSpeed = Math.sqrt(npc.vel.x * npc.vel.x + npc.vel.z * npc.vel.z);
        const npcLeftLeg = mesh.getObjectByName("npc_left_leg") as THREE.Mesh | undefined;
        const npcRightLeg = mesh.getObjectByName("npc_right_leg") as THREE.Mesh | undefined;
        if (npcSpeed > 0.3) {
          const legSwing = Math.sin(this._elapsed * 8) * 0.35;
          if (npcLeftLeg) npcLeftLeg.rotation.x = legSwing;
          if (npcRightLeg) npcRightLeg.rotation.x = -legSwing;
        } else {
          if (npcLeftLeg) npcLeftLeg.rotation.x = 0;
          if (npcRightLeg) npcRightLeg.rotation.x = 0;
        }
      }
    });

    // Remove stale meshes
    for (const [id, mesh] of this._npcMeshes) {
      if (!activeIds.has(id)) {
        this._scene.remove(mesh);
        this._npcMeshes.delete(id);
      }
    }
  }

  private _createNPCMesh(npc: NPC3D): THREE.Group {
    const g = new THREE.Group();

    let bodyColor: number;
    let headType: "helmet" | "hood" | "hat" | "bare" = "bare";
    let hasShield = false;
    let hasSword = false;
    let hasBow = false;
    let isLarger = false;
    let useDressShape = false;

    switch (npc.type) {
      case "guard":
        bodyColor = 0xBB3333; headType = "helmet"; hasShield = true; hasSword = true;
        break;
      case "knight":
        bodyColor = 0xAAAAAA; headType = "helmet"; hasShield = true; hasSword = true; isLarger = true;
        break;
      case "archer":
        bodyColor = 0x336633; headType = "hood"; hasBow = true;
        break;
      case "soldier":
        bodyColor = 0x885533; headType = "helmet"; hasSword = true;
        break;
      case "criminal":
      case "bandit":
      case "assassin":
        bodyColor = 0x333333; headType = "hood"; hasSword = true;
        break;
      case "merchant":
        bodyColor = 0x886644; headType = "hat";
        break;
      case "civilian_f":
        bodyColor = 0x8866AA + (npc.colorVariant * 0x111100 & 0xFFFFFF);
        useDressShape = true;
        break;
      case "priest":
        bodyColor = 0x444444;
        break;
      case "bard":
        bodyColor = 0xCC8833;
        break;
      default:
        bodyColor = 0x7A6644 + (npc.colorVariant * 0x111100 & 0xFFFFFF);
        break;
    }

    const s = isLarger ? 1.15 : 1.0;
    const bodyMat = mat(bodyColor);
    const skinTone = npc.colorVariant % 2 === 0 ? MAT_SKIN : mat(0xC8A882); // varied skin

    // ── Body ──
    if (useDressShape) {
      // Long dress (cylinder + cone bottom for a flowing look)
      const dressTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.42 * s, 0.5 * s, 0.3 * s),
        bodyMat
      );
      dressTop.position.y = 1.2 * s;
      dressTop.castShadow = true;
      g.add(dressTop);
      // Skirt (wider cone-like shape)
      const skirt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15 * s, 0.42 * s, 0.8 * s, 16),
        bodyMat
      );
      skirt.position.y = 0.55 * s;
      skirt.castShadow = true;
      g.add(skirt);
      // Waist belt / sash
      const sash = new THREE.Mesh(
        new THREE.BoxGeometry(0.44 * s, 0.05, 0.32 * s),
        mat(0xAA8855)
      );
      sash.position.y = 0.95 * s;
      g.add(sash);
    } else {
      // Torso
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.48 * s, 0.6 * s, 0.3 * s),
        bodyMat
      );
      torso.position.y = 1.3 * s;
      torso.castShadow = true;
      g.add(torso);
      // Lower tunic
      const lowerTunic = new THREE.Mesh(
        new THREE.BoxGeometry(0.5 * s, 0.3 * s, 0.32 * s),
        bodyMat
      );
      lowerTunic.position.y = 0.88 * s;
      lowerTunic.castShadow = true;
      g.add(lowerTunic);
    }

    // Neck
    const neckMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07 * s, 0.09 * s, 0.12, 12),
      skinTone
    );
    neckMesh.position.y = 1.68 * s;
    g.add(neckMesh);

    // ── Head — with face ──
    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.2 * s, 20, 16),
      skinTone
    );
    headMesh.position.y = 1.85 * s;
    headMesh.scale.set(1, 1.05, 0.95);
    headMesh.castShadow = true;
    g.add(headMesh);

    // Eyes — white sclera + dark iris
    for (const side of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(0.028 * s, 12, 10),
        mat(0xEEEEDD)
      );
      eyeWhite.position.set(side * 0.07 * s, 1.88 * s, 0.155 * s);
      eyeWhite.scale.set(1, 0.7, 0.5);
      g.add(eyeWhite);
      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.016 * s, 14, 12),
        mat(0x3A2818)
      );
      iris.position.set(side * 0.07 * s, 1.88 * s, 0.17 * s);
      g.add(iris);
      // Pupil
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.008 * s, 12, 10),
        mat(0x111111)
      );
      pupil.position.set(side * 0.07 * s, 1.88 * s, 0.175 * s);
      g.add(pupil);
    }

    // Nose — smooth rounded shape
    const noseMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.022 * s, 0.05, 10),
      skinTone
    );
    noseMesh.position.set(0, 1.83 * s, 0.19 * s);
    noseMesh.rotation.x = -Math.PI / 2;
    g.add(noseMesh);

    // Mouth line
    const mouthMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.06 * s, 0.008 * s, 0.01),
      mat(0x995544)
    );
    mouthMesh.position.set(0, 1.78 * s, 0.18 * s);
    g.add(mouthMesh);

    // Chin
    const chinMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 * s, 14, 12),
      skinTone
    );
    chinMesh.position.set(0, 1.75 * s, 0.12 * s);
    chinMesh.scale.set(1.2, 0.6, 0.8);
    g.add(chinMesh);

    // Ears
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 * s, 12, 10),
        skinTone
      );
      ear.position.set(side * 0.19 * s, 1.85 * s, 0);
      ear.scale.set(0.4, 0.8, 0.6);
      g.add(ear);
    }

    // Hair (varies by type)
    if (headType === "bare") {
      const hairColors = [0x4A3728, 0x2A1B0E, 0x6B4423, 0x1A1A1A, 0x8B7355];
      const hairColor = hairColors[npc.colorVariant % hairColors.length];
      if (useDressShape) {
        // Longer hair for women — sphere cap + flowing back
        const hairTop = new THREE.Mesh(
          new THREE.SphereGeometry(0.22 * s, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
          mat(hairColor)
        );
        hairTop.position.y = 1.89 * s;
        g.add(hairTop);
        // Hair flowing down back (tapered cylinder instead of flat plane)
        const hairBack = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12 * s, 0.06 * s, 0.5 * s, 10),
          mat(hairColor)
        );
        hairBack.position.set(0, 1.6 * s, -0.15 * s);
        g.add(hairBack);
        // Side locks
        for (const side of [-1, 1]) {
          const lock = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03 * s, 0.02 * s, 0.25 * s, 12),
            mat(hairColor)
          );
          lock.position.set(side * 0.17 * s, 1.72 * s, 0.02 * s);
          g.add(lock);
        }
      } else {
        // Short hair cap
        const hairCap = new THREE.Mesh(
          new THREE.SphereGeometry(0.21 * s, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
          mat(hairColor)
        );
        hairCap.position.y = 1.89 * s;
        g.add(hairCap);
      }
    }

    // ── Headgear ──
    switch (headType) {
      case "helmet": {
        const helmet = new THREE.Mesh(
          new THREE.SphereGeometry(0.23 * s, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.6),
          MAT_GREY_ARMOR
        );
        helmet.position.y = 1.9 * s;
        g.add(helmet);
        // Visor / face guard (thin box in front)
        const visor = new THREE.Mesh(
          new THREE.BoxGeometry(0.16 * s, 0.08, 0.02),
          MAT_GREY_ARMOR
        );
        visor.position.set(0, 1.87 * s, 0.2 * s);
        g.add(visor);
        // Nose guard
        const noseGuard = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, 0.1, 0.02),
          MAT_GREY_ARMOR
        );
        noseGuard.position.set(0, 1.86 * s, 0.21 * s);
        g.add(noseGuard);
        // Knights get a plume
        if (npc.type === "knight") {
          const plume = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.35, 0.25),
            MAT_RED
          );
          plume.position.set(0, 2.15 * s, -0.02);
          g.add(plume);
        }
        break;
      }
      case "hood": {
        const hood = new THREE.Mesh(
          new THREE.SphereGeometry(0.24 * s, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
          mat(bodyColor)
        );
        hood.position.y = 1.88 * s;
        hood.scale.set(1, 1.1, 1.1);
        g.add(hood);
        // Hood draping down back
        const hoodBack = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18 * s, 0.12 * s, 0.3 * s, 12),
          mat(bodyColor)
        );
        hoodBack.position.set(0, 1.75 * s, -0.12);
        g.add(hoodBack);
        // Hood point
        const hoodTip = new THREE.Mesh(
          new THREE.ConeGeometry(0.08 * s, 0.2 * s, 12),
          mat(bodyColor)
        );
        hoodTip.position.set(0, 2.12 * s, -0.08);
        hoodTip.rotation.x = 0.3;
        g.add(hoodTip);
        break;
      }
      case "hat": {
        // Wide brimmed hat
        const brim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.36, 0.04, 20),
          mat(0x554422)
        );
        brim.position.y = 2.05 * s;
        g.add(brim);
        const crown = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.18, 0.22, 16),
          mat(0x554422)
        );
        crown.position.y = 2.16 * s;
        g.add(crown);
        // Feather in hat (merchants)
        const feather = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, 0.15, 0.04),
          mat(0x44AA44)
        );
        feather.position.set(0.15, 2.28 * s, 0);
        feather.rotation.z = -0.3;
        g.add(feather);
        break;
      }
    }

    // ── Legs — with boots, named for animation ──
    for (const [side, legName] of [[-1, "npc_left_leg"], [1, "npc_right_leg"]] as [number, string][]) {
      const legGroup = new THREE.Group();
      legGroup.name = legName;
      const thigh = new THREE.Mesh(
        new THREE.BoxGeometry(0.17 * s, 0.35 * s, 0.17 * s),
        mat(0x444433)
      );
      thigh.position.y = -0.1;
      thigh.castShadow = true;
      legGroup.add(thigh);
      const shin = new THREE.Mesh(
        new THREE.BoxGeometry(0.15 * s, 0.3 * s, 0.15 * s),
        mat(0x444433)
      );
      shin.position.y = -0.4;
      shin.castShadow = true;
      legGroup.add(shin);
      // Boot
      const boot = new THREE.Mesh(
        new THREE.BoxGeometry(0.18 * s, 0.12, 0.22 * s),
        mat(0x3A2211)
      );
      boot.position.y = -0.58;
      boot.position.z = 0.02;
      legGroup.add(boot);
      legGroup.position.set(side * 0.11 * s, 0.63 * s, 0);
      g.add(legGroup);
    }

    // ── Arms — with hands ──
    for (const side of [-1, 1]) {
      const armGroup = new THREE.Group();
      const upperArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.13 * s, 0.38 * s, 0.13 * s),
        bodyMat
      );
      upperArm.position.y = -0.12;
      upperArm.castShadow = true;
      armGroup.add(upperArm);
      // Forearm (skin)
      const forearm = new THREE.Mesh(
        new THREE.BoxGeometry(0.11 * s, 0.28 * s, 0.11 * s),
        skinTone
      );
      forearm.position.y = -0.38;
      armGroup.add(forearm);
      // Hand
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05 * s, 12, 10), skinTone);
      hand.position.y = -0.55;
      armGroup.add(hand);
      armGroup.position.set(side * 0.34 * s, 1.55 * s, 0);
      g.add(armGroup);
    }

    // Shield (disc on left arm)
    if (hasShield) {
      const shield = new THREE.Mesh(
        new THREE.CircleGeometry(0.25 * s, 20),
        mat(0x663322, { side: THREE.DoubleSide })
      );
      shield.position.set(-0.5 * s, 1.2 * s, 0.1);
      shield.rotation.y = -Math.PI / 4;
      g.add(shield);
    }

    // Sword on right side
    if (hasSword) {
      const sword = new THREE.Mesh(
        new THREE.BoxGeometry(0.04 * s, 0.6, 0.02),
        MAT_GREY_ARMOR
      );
      sword.position.set(0.5 * s, 1.1 * s, 0.15);
      g.add(sword);
    }

    // Bow on back
    if (hasBow) {
      const bowGeo = new THREE.TorusGeometry(0.3, 0.015, 10, 16, Math.PI);
      const bow = new THREE.Mesh(bowGeo, MAT_WOOD_DARK);
      bow.position.set(0, 1.4 * s, -0.22);
      bow.rotation.z = Math.PI / 2;
      g.add(bow);
      // Quiver
      const quiver = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.4, 0.08),
        mat(0x664422)
      );
      quiver.position.set(0.15, 1.5 * s, -0.22);
      g.add(quiver);
    }

    // Merchant wider body adjustment
    if (npc.type === "merchant") {
      const belly = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 14, 12),
        mat(bodyColor)
      );
      belly.position.y = 1.0;
      belly.scale.set(1, 0.7, 0.8);
      g.add(belly);
    }

    // Alert indicator (red sphere floating above)
    const alertSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 14, 12),
      basicMat(0xFF0000)
    );
    alertSphere.position.y = 2.6;
    alertSphere.name = "alert_indicator";
    alertSphere.visible = false;
    g.add(alertSphere);

    // Health bar above NPC
    const hpBarGroup = new THREE.Group();
    hpBarGroup.name = "hp_bar_group";
    hpBarGroup.position.y = 2.4;
    hpBarGroup.visible = false; // only shown when damaged
    // Background (dark red)
    const hpBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.06),
      basicMat(0x661111)
    );
    hpBg.name = "hp_bar_bg";
    hpBarGroup.add(hpBg);
    // Fill (green)
    const hpFill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.06),
      basicMat(0x22CC22)
    );
    hpFill.name = "hp_bar_fill";
    hpFill.position.z = 0.001; // slightly in front of background
    hpBarGroup.add(hpFill);
    g.add(hpBarGroup);

    return g;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  HORSES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private _syncHorses(state: GTA3DState): void {
    const activeIds = new Set<string>();

    state.horses.forEach((horse, id) => {
      activeIds.add(id);
      let mesh = this._horseMeshes.get(id);
      if (!mesh) {
        mesh = this._createHorseMesh(horse);
        this._scene.add(mesh);
        this._horseMeshes.set(id, mesh);
      }

      // Don't render if ridden by player (player mesh handles position)
      if (horse.state === "ridden_by_player") {
        mesh.position.set(state.player.pos.x, state.player.pos.y, state.player.pos.z);
        mesh.rotation.y = state.player.rotation;
      } else {
        mesh.position.set(horse.pos.x, horse.pos.y, horse.pos.z);
        mesh.rotation.y = horse.rotation;
      }

      // Idle leg animation
      const legs = mesh.getObjectByName("horse_legs") as THREE.Group | undefined;
      if (legs) {
        const speed = Math.sqrt(horse.vel.x * horse.vel.x + horse.vel.z * horse.vel.z);
        if (speed > 0.5) {
          const legAnim = Math.sin(this._elapsed * 8) * 0.25;
          legs.children.forEach((leg, i) => {
            (leg as THREE.Mesh).rotation.x = legAnim * (i % 2 === 0 ? 1 : -1);
          });
        } else {
          legs.children.forEach((leg) => {
            (leg as THREE.Mesh).rotation.x = Math.sin(this._elapsed * 1.5) * 0.03;
          });
        }
      }
    });

    // Remove stale
    for (const [id, mesh] of this._horseMeshes) {
      if (!activeIds.has(id)) {
        this._scene.remove(mesh);
        this._horseMeshes.delete(id);
      }
    }
  }

  private _createHorseMesh(horse: Horse3D): THREE.Group {
    const g = new THREE.Group();

    // Base color from horse.color
    let baseColor: number;
    switch (horse.color) {
      case "brown":    baseColor = 0x8B5E3C; break;
      case "black":    baseColor = 0x2A2A2A; break;
      case "white":    baseColor = 0xDDDDCC; break;
      case "grey":     baseColor = 0x888888; break;
      case "chestnut": baseColor = 0xA0522D; break;
      default:         baseColor = 0x8B5E3C;
    }
    const horseMat = mat(baseColor);

    // Body — rounded barrel shape instead of box
    const bodyMain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.38, 1.7, 16),
      horseMat
    );
    bodyMain.position.y = 1.2;
    bodyMain.rotation.x = Math.PI / 2;
    bodyMain.castShadow = true;
    g.add(bodyMain);
    // Chest (front bulge)
    const chest = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
      horseMat
    );
    chest.position.set(0, 1.25, -0.75);
    chest.rotation.x = 0.3;
    g.add(chest);
    // Hindquarters (rear bulge)
    const hind = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
      horseMat
    );
    hind.position.set(0, 1.25, 0.7);
    hind.rotation.x = Math.PI - 0.3;
    g.add(hind);

    // Legs — with knee joints and hooves
    const legsGroup = new THREE.Group();
    legsGroup.name = "horse_legs";
    const legPositions: [number, number][] = [
      [-0.25, -0.6], [0.25, -0.6],
      [-0.25, 0.6], [0.25, 0.6],
    ];
    for (const [lx, lz] of legPositions) {
      // Upper leg
      const upperLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.07, 0.55, 12),
        horseMat
      );
      upperLeg.position.set(lx, 0.75, lz);
      upperLeg.castShadow = true;
      legsGroup.add(upperLeg);
      // Knee joint
      const knee = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 14, 12),
        horseMat
      );
      knee.position.set(lx, 0.5, lz);
      legsGroup.add(knee);
      // Lower leg
      const lowerLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.04, 0.45, 12),
        horseMat
      );
      lowerLeg.position.set(lx, 0.25, lz);
      lowerLeg.castShadow = true;
      legsGroup.add(lowerLeg);
      // Hoof
      const hoof = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.06, 0.06, 12),
        mat(0x333333)
      );
      hoof.position.set(lx, 0.02, lz);
      legsGroup.add(hoof);
    }
    g.add(legsGroup);

    // Neck — smooth curved cylinder
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, 0.85, 14),
      horseMat
    );
    neck.position.set(0, 1.6, -0.8);
    neck.rotation.x = -0.5;
    neck.castShadow = true;
    g.add(neck);

    // Head — elongated ellipsoid instead of box
    const headMain = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 12),
      horseMat
    );
    headMain.position.set(0, 1.88, -1.1);
    headMain.scale.set(0.75, 0.85, 1.4);
    headMain.castShadow = true;
    g.add(headMain);
    // Muzzle
    const muzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 10),
      horseMat
    );
    muzzle.position.set(0, 1.82, -1.35);
    muzzle.scale.set(0.8, 0.7, 1.0);
    g.add(muzzle);
    // Nostrils
    for (const side of [-1, 1]) {
      const nostril = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 12, 10),
        mat(0x222222)
      );
      nostril.position.set(side * 0.06, 1.8, -1.44);
      g.add(nostril);
    }

    // Ears — smooth cones
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.15, 12),
        horseMat
      );
      ear.position.set(side * 0.1, 2.1, -1.05);
      g.add(ear);
    }

    // Eyes — proper with whites and iris
    for (const side of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 12, 10),
        mat(0xEEEEDD)
      );
      eyeWhite.position.set(side * 0.15, 1.92, -1.18);
      eyeWhite.scale.set(0.5, 0.7, 0.5);
      g.add(eyeWhite);
      const eyeIris = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 14, 12),
        mat(0x3A2211)
      );
      eyeIris.position.set(side * 0.16, 1.92, -1.2);
      g.add(eyeIris);
    }

    // Reins — smooth cylinder
    const rein = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.9, 10),
      mat(0x443322)
    );
    rein.position.set(0, 1.55, -0.7);
    rein.rotation.x = -0.5;
    g.add(rein);
    // Bridle on head
    const bridle = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.01, 8, 16),
      mat(0x443322)
    );
    bridle.position.set(0, 1.85, -1.2);
    bridle.rotation.y = Math.PI / 2;
    g.add(bridle);

    // Stirrups
    for (const side of [-1, 1]) {
      const stirrup = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.015, 8, 16),
        MAT_GREY_ARMOR
      );
      stirrup.position.set(side * 0.48, 0.9, 0);
      stirrup.rotation.y = Math.PI / 2;
      g.add(stirrup);
    }

    // Mane — flowing strips instead of boxes
    const maneColor = horse.color === "white" ? 0xBBBBAA : 0x222211;
    for (let i = 0; i < 7; i++) {
      const mane = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.03, 0.18, 12),
        mat(maneColor)
      );
      const t = i / 6;
      mane.position.set((Math.random() - 0.5) * 0.06, 1.5 + t * 0.35, -0.5 - t * 0.45);
      mane.rotation.z = (Math.random() - 0.5) * 0.4;
      g.add(mane);
    }

    // Tail — multi-strand
    const tailBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 0.2, 12),
      mat(maneColor)
    );
    tailBase.position.set(0, 1.15, 0.88);
    tailBase.rotation.x = 0.4;
    g.add(tailBase);
    for (let t = 0; t < 4; t++) {
      const strand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.02, 0.45, 12),
        mat(maneColor)
      );
      strand.position.set((Math.random() - 0.5) * 0.04, 0.95 - t * 0.02, 1.0 + t * 0.04);
      strand.rotation.x = 0.6 + t * 0.1;
      g.add(strand);
    }

    // Saddle — with pommel and cantle
    const saddleSeat = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.08, 0.45),
      mat(0x3A2211)
    );
    saddleSeat.position.set(0, 1.65, 0);
    g.add(saddleSeat);
    // Pommel (front rise)
    const pommel = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
      mat(0x3A2211)
    );
    pommel.position.set(0, 1.72, -0.18);
    g.add(pommel);
    // Cantle (back rise)
    const cantle = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.12, 0.04),
      mat(0x3A2211)
    );
    cantle.position.set(0, 1.72, 0.2);
    g.add(cantle);
    // Saddle blanket
    const blanket = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.03, 0.6),
      mat(0x882222)
    );
    blanket.position.set(0, 1.6, 0);
    g.add(blanket);

    return g;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  ITEMS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private _syncItems(state: GTA3DState): void {
    const activeIds = new Set<string>();

    for (const item of state.items) {
      if (item.collected) continue;
      activeIds.add(item.id);

      let mesh = this._itemMeshes.get(item.id);
      if (!mesh) {
        mesh = this._createItemMesh(item);
        this._scene.add(mesh);
        this._itemMeshes.set(item.id, mesh);
      }

      mesh.position.set(item.pos.x, item.pos.y + 0.3 + Math.sin(this._elapsed * 2 + item.pos.x) * 0.15, item.pos.z);
      mesh.rotation.y = this._elapsed * 1.5;
    }

    for (const [id, mesh] of this._itemMeshes) {
      if (!activeIds.has(id)) {
        this._scene.remove(mesh);
        this._itemMeshes.delete(id);
      }
    }
  }

  private _createItemMesh(item: Item3D): THREE.Group {
    const g = new THREE.Group();

    if (item.type === "gold" || item.type === "gold_pile") {
      // Proper coin shapes (flat cylinders) instead of spheres
      const count = Math.min(item.amount, 5);
      for (let i = 0; i < count; i++) {
        const coin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16),
          MAT_GOLD_MAT
        );
        coin.position.set(
          (Math.random() - 0.5) * 0.25,
          i * 0.03 + 0.01,
          (Math.random() - 0.5) * 0.25
        );
        coin.rotation.x = Math.random() * 0.3;
        coin.rotation.z = Math.random() * 0.3;
        g.add(coin);
        // Coin rim detail
        if (i === count - 1) {
          const rimRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.085, 0.005, 8, 16),
            MAT_GOLD_MAT
          );
          rimRing.position.copy(coin.position);
          rimRing.position.y += 0.01;
          g.add(rimRing);
        }
      }
      // Small sparkle sphere
      const sparkle = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 14, 12),
        mat(0xFFFF88, { transparent: true, opacity: 0.4, emissive: 0xFFDD44, emissiveIntensity: 1.0 })
      );
      sparkle.position.y = count * 0.04;
      g.add(sparkle);
    } else if (item.type === "health_potion") {
      // Smooth potion bottle
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.1, 0.25, 14),
        MAT_POTION_RED
      );
      g.add(bottle);
      // Bottle neck
      const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.065, 0.08, 12),
        MAT_POTION_RED
      );
      neck.position.y = 0.16;
      g.add(neck);
      // Cork
      const cork = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.035, 0.04, 10),
        mat(0x8B6914)
      );
      cork.position.y = 0.22;
      g.add(cork);
      // Liquid glow
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 14, 12),
        mat(0xFF4444, { transparent: true, opacity: 0.3, emissive: 0xFF2222, emissiveIntensity: 0.8 })
      );
      glow.position.y = 0.0;
      g.add(glow);
    } else if (item.type === "treasure_chest") {
      // Brown box with rounded lid, gold trim, and lock
      const chestBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.2, 0.3),
        MAT_WOOD
      );
      chestBase.position.y = -0.05;
      g.add(chestBase);
      // Arched lid
      const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.5, 12, 1, false, 0, Math.PI),
        MAT_WOOD
      );
      lid.position.y = 0.05;
      lid.rotation.z = Math.PI / 2;
      g.add(lid);
      // Gold trim bands
      for (const tz of [-0.1, 0, 0.1]) {
        const trim = new THREE.Mesh(
          new THREE.BoxGeometry(0.52, 0.03, 0.04),
          MAT_GOLD_MAT
        );
        trim.position.set(0, 0.05, tz);
        g.add(trim);
      }
      // Lock
      const lock = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.05, 0.02),
        MAT_GOLD_MAT
      );
      lock.position.set(0, 0, 0.16);
      g.add(lock);
      // Keyhole
      const keyhole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.025, 12),
        mat(0x111111)
      );
      keyhole.position.set(0, -0.01, 0.175);
      keyhole.rotation.x = Math.PI / 2;
      g.add(keyhole);
    } else if (item.type.includes("sword") || item.type.includes("axe") || item.type.includes("mace") || item.type.includes("spear") || item.type.includes("bow") || item.type.includes("crossbow")) {
      // Miniature weapon with proper blade + handle
      const blade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.025, 0.35, 10),
        MAT_GREY_ARMOR
      );
      blade.position.y = 0.1;
      g.add(blade);
      // Handle
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.12, 10),
        mat(0x6B4226)
      );
      handle.position.y = -0.12;
      g.add(handle);
      // Guard
      const guard = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.015, 0.025),
        MAT_GOLD_MAT
      );
      guard.position.y = -0.05;
      g.add(guard);
    } else {
      // Generic pickup — smooth sphere with glow
      const generic = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 16, 12),
        MAT_GOLD_MAT
      );
      g.add(generic);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 12, 10),
        mat(0xFFDD44, { transparent: true, opacity: 0.15 })
      );
      g.add(glow);
    }

    return g;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  PROJECTILES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private _syncProjectiles(state: GTA3DState): void {
    const activeIds = new Set<string>();

    for (const proj of state.projectiles) {
      activeIds.add(proj.id);
      let mesh = this._projectileMeshes.get(proj.id);
      if (!mesh) {
        mesh = this._createProjectileMesh();
        this._scene.add(mesh);
        this._projectileMeshes.set(proj.id, mesh);
      }
      mesh.position.set(proj.pos.x, proj.pos.y + 1.2, proj.pos.z);
      // Orient in direction of travel
      const speed = Math.sqrt(proj.vel.x * proj.vel.x + proj.vel.z * proj.vel.z);
      if (speed > 0.01) {
        mesh.rotation.y = Math.atan2(proj.vel.x, proj.vel.z);
        mesh.rotation.x = -Math.atan2(proj.vel.y, speed);
      }
    }

    for (const [id, mesh] of this._projectileMeshes) {
      if (!activeIds.has(id)) {
        this._scene.remove(mesh);
        this._projectileMeshes.delete(id);
      }
    }
  }

  private _createProjectileMesh(): THREE.Group {
    const g = new THREE.Group();
    // Arrow shaft — smooth cylinder
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.015, 0.6, 10),
      MAT_ARROW
    );
    shaft.rotation.x = Math.PI / 2;
    g.add(shaft);
    // Arrow tip — sharp cone
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.025, 0.1, 10),
      MAT_ARROW_TIP
    );
    tip.position.z = -0.35;
    tip.rotation.x = -Math.PI / 2;
    g.add(tip);
    // Nock (back end notch)
    const nock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.012, 0.03, 12),
      mat(0x332211)
    );
    nock.position.z = 0.31;
    nock.rotation.x = Math.PI / 2;
    g.add(nock);
    // Fletching — angled vanes
    for (let i = 0; i < 3; i++) {
      const fletch = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.08, 0.01),
        mat(0xCCCCCC)
      );
      const fa = (i / 3) * Math.PI * 2;
      fletch.position.set(Math.cos(fa) * 0.02, Math.sin(fa) * 0.02, 0.24);
      fletch.rotation.z = fa;
      g.add(fletch);
    }
    return g;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  PARTICLES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private _initParticles(): void {
    this._particleGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(this._maxParticles * 3);
    const colors = new Float32Array(this._maxParticles * 3);
    const sizes = new Float32Array(this._maxParticles);

    this._particleGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this._particleGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this._particleGeom.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const particleMat = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    this._particlePoints = new THREE.Points(this._particleGeom, particleMat);
    this._scene.add(this._particlePoints);
  }

  private _updateParticles(particles: Particle3D[]): void {
    const posArr = this._particleGeom.attributes.position as THREE.BufferAttribute;
    const colArr = this._particleGeom.attributes.color as THREE.BufferAttribute;
    const sizeArr = this._particleGeom.attributes.size as THREE.BufferAttribute;

    const count = Math.min(particles.length, this._maxParticles);
    const tmpColor = new THREE.Color();

    for (let i = 0; i < this._maxParticles; i++) {
      if (i < count) {
        const p = particles[i];
        posArr.setXYZ(i, p.pos.x, p.pos.y + 0.5, p.pos.z);
        tmpColor.set(p.color);
        colArr.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
        const lifeRatio = p.life / p.maxLife;
        sizeArr.setX(i, p.size * lifeRatio);
      } else {
        posArr.setXYZ(i, 0, -100, 0); // hide
        sizeArr.setX(i, 0);
      }
    }

    posArr.needsUpdate = true;
    colArr.needsUpdate = true;
    sizeArr.needsUpdate = true;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  DAY / NIGHT CYCLE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private _updateDayNight(dayTime: number): void {
    // dayTime: 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
    const t = dayTime;
    const sunAngle = t * Math.PI * 2 - Math.PI / 2; // sun arc

    // Sun position
    const sunX = Math.cos(sunAngle) * 60;
    const sunY = Math.sin(sunAngle) * 60;
    this._sunLight.position.set(sunX, Math.max(sunY, 2), 20);

    // Determine if night
    const isNight = sunY < -5;
    const isDusk = t > 0.65 && t < 0.82;
    const isDawn = t > 0.18 && t < 0.32;

    // Sun intensity
    if (isNight) {
      this._sunLight.intensity = 0.08;
      this._sunLight.color.set(0x4466AA);
      this._ambientLight.intensity = 0.1;
      this._ambientLight.color.set(0x223355);
      this._hemiLight.color.set(0x112244);
      this._hemiLight.groundColor.set(0x111122);
      this._hemiLight.intensity = 0.2;
      if (this._scene.fog instanceof THREE.FogExp2) {
        this._scene.fog.color.set(0x0A0E1A);
      }
    } else if (isDusk) {
      const duskT = (t - 0.65) / 0.17;
      this._sunLight.intensity = lerp(1.2, 0.4, duskT);
      this._sunLight.color.set(new THREE.Color().lerpColors(col(0xFFFFDD), col(0xFF8844), duskT));
      this._ambientLight.intensity = lerp(0.35, 0.15, duskT);
      this._ambientLight.color.set(new THREE.Color().lerpColors(col(0xFFEECC), col(0xFF9966), duskT));
      this._hemiLight.color.set(new THREE.Color().lerpColors(col(0x88BBFF), col(0xFF7744), duskT));
      this._hemiLight.intensity = lerp(0.5, 0.3, duskT);
      if (this._scene.fog instanceof THREE.FogExp2) {
        this._scene.fog.color.set(new THREE.Color().lerpColors(col(0x99BBDD), col(0x553322), duskT));
      }
    } else if (isDawn) {
      const dawnT = (t - 0.18) / 0.14;
      this._sunLight.intensity = lerp(0.2, 1.0, dawnT);
      this._sunLight.color.set(new THREE.Color().lerpColors(col(0x8888CC), col(0xFFEECC), dawnT));
      this._ambientLight.intensity = lerp(0.12, 0.3, dawnT);
      this._ambientLight.color.set(new THREE.Color().lerpColors(col(0x445566), col(0xFFDDAA), dawnT));
      this._hemiLight.color.set(new THREE.Color().lerpColors(col(0x334466), col(0x88BBFF), dawnT));
      this._hemiLight.intensity = lerp(0.2, 0.5, dawnT);
      if (this._scene.fog instanceof THREE.FogExp2) {
        this._scene.fog.color.set(new THREE.Color().lerpColors(col(0x223344), col(0x99BBDD), dawnT));
      }
    } else {
      // Daytime
      this._sunLight.intensity = 1.2;
      this._sunLight.color.set(0xFFFFDD);
      this._ambientLight.intensity = 0.35;
      this._ambientLight.color.set(0xFFEECC);
      this._hemiLight.color.set(0x88BBFF);
      this._hemiLight.groundColor.set(0x445522);
      this._hemiLight.intensity = 0.5;
      if (this._scene.fog instanceof THREE.FogExp2) {
        this._scene.fog.color.set(0x99BBDD);
      }
    }

    // Sky dome color updates
    if (this._skyUniforms) {
      if (isNight) {
        this._skyUniforms.topColor.value.set(0x0A0E2A);
        this._skyUniforms.bottomColor.value.set(0x1A2040);
      } else if (isDusk) {
        const duskT2 = (t - 0.65) / 0.17;
        this._skyUniforms.topColor.value.set(new THREE.Color().lerpColors(col(0x4488CC), col(0xAA4455), duskT2));
        this._skyUniforms.bottomColor.value.set(new THREE.Color().lerpColors(col(0xAACCEE), col(0xFF8855), duskT2));
      } else if (isDawn) {
        const dawnT2 = (t - 0.18) / 0.14;
        this._skyUniforms.topColor.value.set(new THREE.Color().lerpColors(col(0x0A0E2A), col(0x445577), dawnT2));
        this._skyUniforms.bottomColor.value.set(new THREE.Color().lerpColors(col(0x1A2040), col(0x88AACC), dawnT2));
      } else {
        this._skyUniforms.topColor.value.set(0x4488CC);
        this._skyUniforms.bottomColor.value.set(0xAACCEE);
      }
    }

    // Window glow and torch visibility based on night
    const glowVisible = isNight || isDusk;
    for (const glow of this._windowGlowPlanes) {
      glow.visible = glowVisible;
    }
    for (const torch of this._torchLights) {
      torch.intensity = glowVisible ? 0.9 + Math.sin(this._elapsed * 4 + torch.position.x) * 0.2 : 0.15;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  CAMERA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private _updateCamera(state: GTA3DState): void {
    const p = state.player;
    const lerpFactor = GTA3D.CAMERA_LERP;
    const camDist = GTA3D.CAMERA_DISTANCE;
    const camH = GTA3D.CAMERA_HEIGHT;
    // Target position: behind and above the player
    const targetX = p.pos.x - Math.sin(p.rotation) * camDist * 0.3;
    const targetZ = p.pos.z - Math.cos(p.rotation) * camDist * 0.3;
    const targetY = p.pos.y + camH;

    // Smooth lerp
    this._camPos.x = lerp(this._camPos.x, targetX, lerpFactor);
    this._camPos.y = lerp(this._camPos.y, targetY, lerpFactor);
    this._camPos.z = lerp(this._camPos.z, targetZ + camDist, lerpFactor);

    this._camera.position.copy(this._camPos);
    this._camera.lookAt(p.pos.x, p.pos.y + 1.5, p.pos.z);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  ANIMATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private _animateWindmills(dt: number): void {
    for (const blades of this._windmillBlades) {
      blades.rotation.z += dt * 0.8;
    }
  }

  private _animateTreeSway(): void {
    for (let i = 0; i < this._treeCanopies.length; i++) {
      const canopy = this._treeCanopies[i];
      canopy.rotation.z = Math.sin(this._elapsed * 0.8 + i * 0.7) * 0.025;
      canopy.rotation.x = Math.cos(this._elapsed * 0.6 + i * 1.1) * 0.02;
    }
    // Grass blade sway
    for (let i = 0; i < this._grassBlades.length; i++) {
      const blade = this._grassBlades[i];
      blade.rotation.z = Math.sin(this._elapsed * 1.2 + i * 0.5) * 0.08;
      blade.rotation.x = Math.cos(this._elapsed * 0.9 + i * 0.8) * 0.06;
    }
  }

  private _animateTorchFlames(): void {
    for (let i = 0; i < this._torchFlames.length; i++) {
      const flame = this._torchFlames[i];
      const flicker = 0.8 + Math.sin(this._elapsed * 8 + i * 2.3) * 0.2 + Math.cos(this._elapsed * 12 + i * 1.7) * 0.1;
      flame.scale.set(flicker, 0.7 + Math.random() * 0.5, flicker);
      flame.position.x = Math.sin(this._elapsed * 6 + i) * 0.02;
      flame.position.z = Math.cos(this._elapsed * 7 + i) * 0.02;
    }
  }
}
