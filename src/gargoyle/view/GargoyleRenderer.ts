// ---------------------------------------------------------------------------
// Gargoyle: Cathedral Guardian — Three.js 3D renderer (visual overhaul)
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { GARG } from "../config/GargoyleConfig";
import type { GargoyleState, Demon } from "../state/GargoyleState";

// ---- Gothic Color Palette ----
const COL = {
  STONE_LIGHT: 0x8899aa,
  STONE_MID: 0x778899,
  STONE_DARK: 0x556677,
  STONE_WARM: 0x998877,
  ROOF_DARK: 0x2a2a3a,
  ROOF_SLATE: 0x334455,
  WINDOW_GLOW: 0xffcc44,
  GROUND_NIGHT: 0x151a1a,
  GROUND_DAY: 0x446644,
  PATH_STONE: 0x3a3a44,
  SKY_NIGHT_TOP: 0x060412,
  SKY_NIGHT_BOT: 0x140e28,
  SKY_DAY_TOP: 0x4488cc,
  SKY_DAY_BOT: 0xccddee,
  DEMON_DARK: 0x441111,
  IMP_COLOR: 0xcc4433,
  FIEND_COLOR: 0x883322,
  BRUTE_COLOR: 0x553322,
  WRAITH_COLOR: 0x6644aa,
  HELLION_COLOR: 0xff2200,
  GARGOYLE: 0x6a7d92,
  GARGOYLE_DARK: 0x4a5a6a,
  SOUL_PURPLE: 0x8844ff,
  TORCH_FLAME: 0xff8833,
  PERCH_GLOW: 0x44aaff,
};

export class GargoyleRenderer {
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _canvas!: HTMLCanvasElement;

  // Lighting
  private _ambientLight!: THREE.AmbientLight;
  private _moonLight!: THREE.DirectionalLight;
  private _hemiLight!: THREE.HemisphereLight;
  private _torchLights: THREE.PointLight[] = [];

  // Sky
  private _skyDome!: THREE.Mesh;
  private _skyUniforms!: Record<string, THREE.IUniform>;
  private _starPoints!: THREE.Points;
  private _moonMesh!: THREE.Mesh;
  private _moonGlow!: THREE.Mesh;

  // Cathedral
  private _cathedralGroup!: THREE.Group;
  private _windowGlowMeshes: THREE.Mesh[] = [];
  private _cathedralCrackOverlay!: THREE.Mesh;
  private _torchMeshes: THREE.Mesh[] = [];

  // Entities
  private _playerMesh!: THREE.Group;
  private _playerEyeMat!: THREE.MeshStandardMaterial;
  private _demonMeshes: Map<string, THREE.Group> = new Map();
  private _demonScales: Map<string, number> = new Map();
  private _particleMesh!: THREE.InstancedMesh;
  private _perchMarkers: THREE.Mesh[] = [];
  private _soulOrbMesh!: THREE.InstancedMesh;
  private _healthOrbMesh!: THREE.InstancedMesh;
  private _projectileMesh!: THREE.InstancedMesh;

  // Ambient particles
  private _emberMesh!: THREE.InstancedMesh;
  private _emberData: { pos: THREE.Vector3; vel: THREE.Vector3; life: number }[] = [];

  // Fury effect
  private _furyLight!: THREE.PointLight;

  // Sacred ground circle
  private _sacredCircle!: THREE.Mesh;

  // Bell shockwave
  private _bellRing: THREE.Mesh | null = null;
  private _bellRingScale = 0;
  private _bellRingLife = 0;

  // Target FOV for smooth transitions
  private _targetFOV = GARG.CAMERA_FOV;

  // Perch light beams
  private _perchBeams: THREE.Mesh[] = [];

  // Star twinkle
  private _starBaseSizes!: Float32Array;

  // Phase transition camera smoothing
  private _phaseCamLerp = 0; // 0-1 blend for orbit cameras

  // Ground
  private _groundMesh!: THREE.Mesh;
  private _groundFog!: THREE.Mesh;
  private _pathMesh!: THREE.Mesh;

  // Clouds
  private _cloudMeshes: THREE.Mesh[] = [];

  // God rays (fake volumetric)
  private _godRay!: THREE.Mesh;

  // Aurora
  private _auroraMesh!: THREE.Mesh;
  private _auroraUniforms!: { time: THREE.IUniform; color1: THREE.IUniform; color2: THREE.IUniform };

  // Bats
  private _batMesh!: THREE.InstancedMesh;
  private _batData: { angle: number; height: number; radius: number; speed: number; flapPhase: number }[] = [];

  // Lightning
  private _lightningTimer = 0;
  private _lightningFlash = 0;

  // Dive bomb crater
  private _craters: { mesh: THREE.Mesh; life: number }[] = [];

  // Additive fire particle system (separate for glow-through)
  private _fireParticleMesh!: THREE.InstancedMesh;

  // Consecrate ring
  private _consecrateRing: THREE.Mesh | null = null;
  private _consecrateRingScale = 0;
  private _consecrateRingLife = 0;

  // Gust ring
  private _gustRing: THREE.Mesh | null = null;
  private _gustRingScale = 0;
  private _gustRingLife = 0;

  // Breath cone
  private _breathCone: THREE.Mesh | null = null;
  private _breathConeLife = 0;

  // Camera
  private _camTarget = new THREE.Vector3();
  private _camLookTarget = new THREE.Vector3();

  get canvas(): HTMLCanvasElement { return this._canvas; }

  // ======================================================================
  // Init
  // ======================================================================

  init(sw: number, sh: number): void {
    this._renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this._renderer.setSize(sw, sh);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 0.8;
    this._canvas = this._renderer.domElement;
    this._canvas.style.cssText = "position:absolute;top:0;left:0;z-index:0;";

    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(0x060412, GARG.FOG_DENSITY_NIGHT);

    this._camera = new THREE.PerspectiveCamera(GARG.CAMERA_FOV, sw / sh, 0.3, 350);
    this._camera.position.set(0, GARG.SPIRE_HEIGHT + 5, -25);

    this._setupLighting();
    this._createSky();
    this._createGround();
    this._buildCathedral();
    this._buildEnvironment();
    this._buildPlayerMesh();
    this._buildParticleSystem();
    this._buildSoulOrbSystem();
    this._buildHealthOrbSystem();
    this._buildProjectileSystem();
    this._buildEmberSystem();
    this._buildSacredCircle();
    this._buildFuryLight();
    this._buildClouds();
    this._buildGodRay();
    this._buildAurora();
    this._buildBats();
    this._buildFireParticles();

    this._onResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      this._camera.aspect = w / h;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(w, h);
    };
    window.addEventListener("resize", this._onResize);
  }

  private _onResize: (() => void) | null = null;

  // ======================================================================
  // Lighting
  // ======================================================================

  private _setupLighting(): void {
    this._ambientLight = new THREE.AmbientLight(0x0e0a20, 0.25);
    this._scene.add(this._ambientLight);

    this._hemiLight = new THREE.HemisphereLight(0x1a1a66, 0x0a1a0a, 0.35);
    this._scene.add(this._hemiLight);

    this._moonLight = new THREE.DirectionalLight(0x8899cc, 1.6);
    this._moonLight.position.set(-30, 50, -20);
    this._moonLight.castShadow = true;
    this._moonLight.shadow.mapSize.set(2048, 2048);
    this._moonLight.shadow.camera.left = -60;
    this._moonLight.shadow.camera.right = 60;
    this._moonLight.shadow.camera.top = 60;
    this._moonLight.shadow.camera.bottom = -60;
    this._moonLight.shadow.camera.near = 1;
    this._moonLight.shadow.camera.far = 150;
    this._moonLight.shadow.bias = -0.001;
    this._moonLight.shadow.normalBias = 0.02;
    this._scene.add(this._moonLight);

    // Warm interior glow (through windows and doorway)
    const interiorLight = new THREE.PointLight(0xffaa44, 0.8, 50);
    interiorLight.position.set(0, 10, 0);
    this._scene.add(interiorLight);

    // Entrance warm spill
    const hw = GARG.CATHEDRAL_WIDTH / 2;
    const hl = GARG.CATHEDRAL_LENGTH / 2;
    const entranceLight = new THREE.SpotLight(0xffcc66, 1.2, 20, Math.PI / 4, 0.5);
    entranceLight.position.set(0, 6, -hl - 2);
    entranceLight.target.position.set(0, 0, -hl - 8);
    this._scene.add(entranceLight);
    this._scene.add(entranceLight.target);

    // Torch wall sconces (6 per side)
    const torchY = GARG.CATHEDRAL_HEIGHT * 0.45;
    for (let i = 0; i < 6; i++) {
      const z = -hl + 5 + i * (GARG.CATHEDRAL_LENGTH - 10) / 5;
      for (const side of [-1, 1]) {
        const light = new THREE.PointLight(COL.TORCH_FLAME, 0.6, 12);
        light.position.set(side * (hw + 1.8), torchY, z);
        this._scene.add(light);
        this._torchLights.push(light);
      }
    }
  }

  // ======================================================================
  // Sky dome
  // ======================================================================

  private _createSky(): void {
    const geo = new THREE.SphereGeometry(250, 48, 32);
    this._skyUniforms = {
      topColor: { value: new THREE.Color(COL.SKY_NIGHT_TOP) },
      bottomColor: { value: new THREE.Color(COL.SKY_NIGHT_BOT) },
      offset: { value: 10 },
      exponent: { value: 0.5 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this._skyUniforms,
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;
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
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h,0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide, depthWrite: false,
    });
    this._skyDome = new THREE.Mesh(geo, mat);
    this._scene.add(this._skyDome);

    // Stars — varied sizes with twinkle potential
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1200;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.85 + 0.15);
      const r = 220;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xeeeeff, size: 0.4, sizeAttenuation: true, transparent: true, opacity: 0.9 });
    this._starPoints = new THREE.Points(starGeo, starMat);
    this._scene.add(this._starPoints);
    // Save base sizes for twinkle
    this._starBaseSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) this._starBaseSizes[i] = 0.3 + Math.random() * 0.7;

    // Moon with crater-like detail
    const moonGeo = new THREE.SphereGeometry(5, 24, 24);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xdde4f0 });
    this._moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this._moonMesh.position.set(-60, 95, -40);
    this._scene.add(this._moonMesh);

    // Moon halo — layered glow
    for (const [r, op] of [[10, 0.06], [16, 0.03], [24, 0.015]] as [number, number][]) {
      const gGeo = new THREE.SphereGeometry(r, 16, 16);
      const gMat = new THREE.MeshBasicMaterial({ color: 0x6688bb, transparent: true, opacity: op });
      const g = new THREE.Mesh(gGeo, gMat);
      g.position.copy(this._moonMesh.position);
      this._scene.add(g);
      if (r === 10) this._moonGlow = g;
    }
  }

  // ======================================================================
  // Ground
  // ======================================================================

  private _createGround(): void {
    const size = GARG.GROUND_SIZE;
    const geo = new THREE.PlaneGeometry(size, size, 80, 80);
    geo.rotateX(-Math.PI / 2);

    // Terrain noise
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const n = Math.sin(x * 0.04) * Math.cos(z * 0.06) * 0.6
        + Math.sin(x * 0.11 + z * 0.09) * 0.3
        + Math.sin(x * 0.23 - z * 0.17) * 0.15;
      pos.setY(i, n);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ color: COL.GROUND_NIGHT, roughness: 0.95, metalness: 0.0 });
    this._groundMesh = new THREE.Mesh(geo, mat);
    this._groundMesh.receiveShadow = true;
    this._scene.add(this._groundMesh);

    // Stone path from entrance
    const hl = GARG.CATHEDRAL_LENGTH / 2;
    const pathGeo = new THREE.PlaneGeometry(4, 20, 1, 10);
    pathGeo.rotateX(-Math.PI / 2);
    const pathMat = new THREE.MeshStandardMaterial({ color: COL.PATH_STONE, roughness: 0.85, metalness: 0.05 });
    this._pathMesh = new THREE.Mesh(pathGeo, pathMat);
    this._pathMesh.position.set(0, 0.05, -hl - 10);
    this._pathMesh.receiveShadow = true;
    this._scene.add(this._pathMesh);

    // Low-lying fog layers (two for depth)
    for (const [y, op, sz] of [[0.3, 0.1, 0.8], [1.0, 0.06, 0.6]] as [number, number, number][]) {
      const fGeo = new THREE.PlaneGeometry(size * sz, size * sz);
      fGeo.rotateX(-Math.PI / 2);
      const fMat = new THREE.MeshBasicMaterial({ color: 0x182830, transparent: true, opacity: op, depthWrite: false });
      const fMesh = new THREE.Mesh(fGeo, fMat);
      fMesh.position.y = y;
      this._scene.add(fMesh);
      if (y < 0.5) this._groundFog = fMesh;
    }
  }

  // ======================================================================
  // Cathedral — enhanced gothic architecture
  // ======================================================================

  private _buildCathedral(): void {
    this._cathedralGroup = new THREE.Group();

    const sL = new THREE.MeshStandardMaterial({ color: COL.STONE_LIGHT, roughness: 0.82, metalness: 0.05 });
    const sM = new THREE.MeshStandardMaterial({ color: COL.STONE_MID, roughness: 0.85, metalness: 0.05 });
    const sD = new THREE.MeshStandardMaterial({ color: COL.STONE_DARK, roughness: 0.9, metalness: 0.05 });
    const roof = new THREE.MeshStandardMaterial({ color: COL.ROOF_DARK, roughness: 0.7, metalness: 0.1 });
    const slate = new THREE.MeshStandardMaterial({ color: COL.ROOF_SLATE, roughness: 0.75, metalness: 0.08 });
    const wGlow = new THREE.MeshStandardMaterial({ color: COL.WINDOW_GLOW, emissive: COL.WINDOW_GLOW, emissiveIntensity: 0.8, roughness: 0.3 });
    const torchMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.8 });

    const hw = GARG.CATHEDRAL_WIDTH / 2;
    const hl = GARG.CATHEDRAL_LENGTH / 2;
    const h = GARG.CATHEDRAL_HEIGHT;
    const tH = GARG.TOWER_HEIGHT;

    // ---- Main nave ----
    const nave = new THREE.Mesh(new THREE.BoxGeometry(GARG.CATHEDRAL_WIDTH, h, GARG.CATHEDRAL_LENGTH), sL);
    nave.position.y = h / 2; nave.castShadow = true; nave.receiveShadow = true;
    this._cathedralGroup.add(nave);

    // ---- Transept (cross arms) ----
    const transW = GARG.CATHEDRAL_WIDTH * 1.4;
    const transD = 10;
    const transept = new THREE.Mesh(new THREE.BoxGeometry(transW, h * 0.9, transD), sM);
    transept.position.set(0, h * 0.45, 2); transept.castShadow = true;
    this._cathedralGroup.add(transept);

    // Transept roof peaks
    for (const side of [-1, 1]) {
      const tRoofShape = new THREE.Shape();
      tRoofShape.moveTo(-transD / 2 - 0.5, 0);
      tRoofShape.lineTo(0, 6);
      tRoofShape.lineTo(transD / 2 + 0.5, 0);
      tRoofShape.closePath();
      const tRoof = new THREE.Mesh(new THREE.ExtrudeGeometry(tRoofShape, { depth: 2, bevelEnabled: false }), slate);
      tRoof.rotation.y = Math.PI / 2;
      tRoof.position.set(side * transW / 2, h * 0.9, 2 - transD / 2 - 0.5);
      tRoof.castShadow = true;
      this._cathedralGroup.add(tRoof);
    }

    // ---- Apse (rounded back) ----
    const apseGeo = new THREE.CylinderGeometry(hw * 0.7, hw * 0.7, h * 0.85, 12, 1, false, 0, Math.PI);
    const apse = new THREE.Mesh(apseGeo, sM);
    apse.position.set(0, h * 0.425, hl); apse.rotation.y = Math.PI / 2;
    apse.castShadow = true;
    this._cathedralGroup.add(apse);

    // ---- Main pitched roof ----
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-hw - 1.5, 0); roofShape.lineTo(0, 9); roofShape.lineTo(hw + 1.5, 0); roofShape.closePath();
    const mainRoof = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roofShape, { depth: GARG.CATHEDRAL_LENGTH + 2, bevelEnabled: false }), roof,
    );
    mainRoof.position.set(0, h, -hl - 1); mainRoof.castShadow = true;
    this._cathedralGroup.add(mainRoof);

    // Roof ridge ornaments
    for (let i = 0; i < 8; i++) {
      const z = -hl + 3 + i * (GARG.CATHEDRAL_LENGTH - 6) / 7;
      const ornament = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.2, 4), sD);
      ornament.position.set(0, h + 9.5, z);
      this._cathedralGroup.add(ornament);
    }

    // ---- Corner towers with crenellations ----
    const tR = 3.2;
    const tGeo = new THREE.CylinderGeometry(tR, tR + 0.6, tH, 10);
    const capGeo = new THREE.ConeGeometry(tR + 1, 7, 10);

    for (const [tx, tz] of [[-hw, -hl], [hw, -hl], [-hw, hl], [hw, hl]]) {
      const tower = new THREE.Mesh(tGeo, sD);
      tower.position.set(tx, tH / 2, tz); tower.castShadow = true;
      this._cathedralGroup.add(tower);

      const cap = new THREE.Mesh(capGeo, roof);
      cap.position.set(tx, tH + 3.5, tz); cap.castShadow = true;
      this._cathedralGroup.add(cap);

      // Crenellations (merlons) around tower top
      for (let m = 0; m < 8; m++) {
        const a = (m / 8) * Math.PI * 2;
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 0.6), sD);
        merlon.position.set(tx + Math.cos(a) * (tR + 0.3), tH + 0.75, tz + Math.sin(a) * (tR + 0.3));
        merlon.rotation.y = a;
        this._cathedralGroup.add(merlon);
      }

      // Tower window slit
      const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 2), wGlow);
      slit.position.set(tx + (tx > 0 ? tR + 0.1 : -tR - 0.1), tH * 0.6, tz);
      slit.rotation.y = tx > 0 ? Math.PI / 2 : -Math.PI / 2;
      this._cathedralGroup.add(slit);
      this._windowGlowMeshes.push(slit);
    }

    // ---- Front spire ----
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.5, GARG.SPIRE_HEIGHT - h, 8), sD);
    spire.position.set(0, h + (GARG.SPIRE_HEIGHT - h) / 2, -hl + 2); spire.castShadow = true;
    this._cathedralGroup.add(spire);

    // Cross on top of spire
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2, 0.15), sL);
    crossV.position.set(0, GARG.SPIRE_HEIGHT + 1, -hl + 2);
    this._cathedralGroup.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 0.15), sL);
    crossH.position.set(0, GARG.SPIRE_HEIGHT + 1.5, -hl + 2);
    this._cathedralGroup.add(crossH);

    // ---- Entrance arch ----
    const archOuter = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 2), sD);
    archOuter.position.set(0, 4, -hl - 0.5); archOuter.castShadow = true;
    this._cathedralGroup.add(archOuter);
    // Doorway (emissive warm glow)
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x332211, emissive: 0x443322, emissiveIntensity: 0.5, roughness: 0.9 });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 6), doorMat);
    door.position.set(0, 3, -hl - 1.6); door.rotation.y = Math.PI;
    this._cathedralGroup.add(door);

    // Stone steps
    for (let s = 0; s < 4; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(6 + s * 0.8, 0.3, 1), sM);
      step.position.set(0, -s * 0.3, -hl - 2 - s); step.receiveShadow = true;
      this._cathedralGroup.add(step);
    }

    // ---- Rose window (front, larger) ----
    const rose = new THREE.Mesh(new THREE.CircleGeometry(3.5, 24), wGlow);
    rose.position.set(0, h * 0.7, -hl - 0.15); rose.rotation.y = Math.PI;
    this._cathedralGroup.add(rose); this._windowGlowMeshes.push(rose);

    // Rose window frame rings
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.6, metalness: 0.3 });
    for (const r of [2.0, 3.0]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.08, 6, 24), ringMat);
      ring.position.set(0, h * 0.7, -hl - 0.2); ring.rotation.x = Math.PI / 2;
      this._cathedralGroup.add(ring);
    }

    // ---- Side windows (stained glass, pointed arch shape) ----
    const stainedColors = [0xffcc44, 0xcc4444, 0x4466cc, 0x44aa44, 0xcc88ff, 0xffaa22, 0x44cccc];
    for (let i = 0; i < 7; i++) {
      const z = -hl + 4 + i * (GARG.CATHEDRAL_LENGTH - 8) / 6;
      const glassColor = stainedColors[i % stainedColors.length];
      const glassMat = new THREE.MeshStandardMaterial({
        color: glassColor, emissive: glassColor, emissiveIntensity: 0.7, roughness: 0.3, transparent: true, opacity: 0.85,
      });
      for (const side of [-1, 1]) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.5), glassMat.clone());
        win.position.set(side * (hw + 0.12), h * 0.5, z);
        win.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        this._cathedralGroup.add(win);
        this._windowGlowMeshes.push(win);

        const archTop = new THREE.Mesh(new THREE.CircleGeometry(0.7, 8, 0, Math.PI), glassMat.clone());
        archTop.position.set(side * (hw + 0.12), h * 0.5 + 1.75, z);
        archTop.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        this._cathedralGroup.add(archTop);

        // Stone window frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4, 1.6), sD);
        frame.position.set(side * (hw + 0.3), h * 0.5, z);
        this._cathedralGroup.add(frame);
      }
    }

    // ---- Flying buttresses (angled supports) ----
    for (let i = 0; i < 6; i++) {
      const z = -hl + 5 + i * 6.5;
      for (const side of [-1, 1]) {
        // Pier (outer column)
        const pier = new THREE.Mesh(new THREE.BoxGeometry(1, 14, 1.2), sM);
        pier.position.set(side * (hw + 5), 7, z); pier.castShadow = true;
        this._cathedralGroup.add(pier);

        // Arch connector
        const arch = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 1.8), sL);
        arch.position.set(side * (hw + 2.5), 12, z);
        arch.rotation.z = side * 0.35;
        arch.castShadow = true;
        this._cathedralGroup.add(arch);

        // Pinnacle on pier
        const pinnacle = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2, 4), sD);
        pinnacle.position.set(side * (hw + 5), 15, z);
        this._cathedralGroup.add(pinnacle);
      }
    }

    // ---- Torch sconces on walls ----
    const torchGeo = new THREE.CylinderGeometry(0.06, 0.1, 0.6, 5);
    for (let i = 0; i < 6; i++) {
      const z = -hl + 5 + i * (GARG.CATHEDRAL_LENGTH - 10) / 5;
      for (const side of [-1, 1]) {
        const torch = new THREE.Mesh(torchGeo, torchMat);
        torch.position.set(side * (hw + 0.8), h * 0.45, z);
        this._cathedralGroup.add(torch);
        this._torchMeshes.push(torch);

        // Flame mesh (emissive sphere)
        const flame = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 6, 6),
          new THREE.MeshBasicMaterial({ color: COL.TORCH_FLAME }),
        );
        flame.position.set(side * (hw + 0.8), h * 0.45 + 0.4, z);
        flame.name = "flame";
        this._cathedralGroup.add(flame);
        this._torchMeshes.push(flame);
      }
    }

    // ---- Gargoyle statues ----
    for (let i = 0; i < 5; i++) {
      const z = -hl + 6 + i * 8;
      for (const side of [-1, 1]) {
        const g = this._makeStatueGargoyle();
        g.position.set(side * (hw + 1.8), h * 0.7, z);
        g.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        this._cathedralGroup.add(g);
      }
    }

    // ---- Damage crack overlay ----
    const crackMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    this._cathedralCrackOverlay = new THREE.Mesh(
      new THREE.BoxGeometry(GARG.CATHEDRAL_WIDTH + 0.5, h + 0.5, GARG.CATHEDRAL_LENGTH + 0.5), crackMat,
    );
    this._cathedralCrackOverlay.position.y = h / 2;
    this._cathedralGroup.add(this._cathedralCrackOverlay);

    this._scene.add(this._cathedralGroup);
  }

  private _makeStatueGargoyle(): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: COL.GARGOYLE_DARK, roughness: 0.9, metalness: 0.05 });
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.8), mat), { castShadow: true })); // body
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.4), mat);
    head.position.set(0, 0.3, 0.3); g.add(head);
    // Snout
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.25), mat);
    snout.position.set(0, 0.25, 0.5); g.add(snout);
    // Mini wings
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.1), mat);
      w.position.set(s * 0.4, 0.15, -0.1); w.rotation.z = s * 0.4;
      g.add(w);
    }
    return g;
  }

  // ======================================================================
  // Environment
  // ======================================================================

  private _buildEnvironment(): void {
    const stone = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.9 });
    const tree = new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: 0.85 });
    const moss = new THREE.MeshStandardMaterial({ color: 0x1a3322, roughness: 0.9 });

    // Gravestones with cross shapes
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 24 + Math.random() * 55;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      const group = new THREE.Group();

      if (Math.random() < 0.3) {
        // Cross gravestone
        const v = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4 + Math.random() * 0.6, 0.15), stone);
        v.position.y = 0.8; group.add(v);
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.15), stone);
        h.position.y = 1.2; group.add(h);
      } else {
        // Slab
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.5 + Math.random() * 0.3, 1.0 + Math.random() * 0.8, 0.15), stone);
        s.position.y = 0.6;
        s.rotation.z = (Math.random() - 0.5) * 0.15;
        s.rotation.y = Math.random() * 0.4 - 0.2;
        group.add(s);
      }
      // Moss patch
      if (Math.random() < 0.4) {
        const mPatch = new THREE.Mesh(new THREE.SphereGeometry(0.3, 4, 4), moss);
        mPatch.position.set(0.2, 0.1, 0.1); mPatch.scale.y = 0.3;
        group.add(mPatch);
      }
      group.position.set(x, 0, z);
      this._scene.add(group);
    }

    // Dead trees with more branches
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 28 + Math.random() * 60;
      const group = new THREE.Group();
      const trunkH = 5 + Math.random() * 5;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.55, trunkH, 6), tree);
      trunk.position.y = trunkH / 2; trunk.castShadow = true;
      trunk.rotation.z = (Math.random() - 0.5) * 0.15;
      group.add(trunk);

      // Branches
      for (let b = 0; b < 5 + Math.floor(Math.random() * 4); b++) {
        const bLen = 1.5 + Math.random() * 2.5;
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.12, bLen, 4), tree);
        const bAngle = Math.random() * Math.PI * 2;
        const bH = 2 + Math.random() * (trunkH - 2);
        branch.position.set(Math.cos(bAngle) * 0.6, bH, Math.sin(bAngle) * 0.6);
        branch.rotation.x = (Math.random() - 0.5) * 1.2;
        branch.rotation.z = (Math.random() - 0.5) * 1.2;
        group.add(branch);
      }
      group.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      this._scene.add(group);
    }

    // Iron fence with spikes
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.5, metalness: 0.6 });
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const r = 22;
      // Horizontal bar
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 3.2), fenceMat);
      bar.position.set(Math.cos(a) * r, 0.9, Math.sin(a) * r);
      bar.rotation.y = a + Math.PI / 2; bar.castShadow = true;
      this._scene.add(bar);
      // Spikes
      for (let s = -1; s <= 1; s++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.5, 4), fenceMat);
        spike.position.set(
          Math.cos(a) * r + Math.cos(a + Math.PI / 2) * s * 0.8,
          2.0,
          Math.sin(a) * r + Math.sin(a + Math.PI / 2) * s * 0.8,
        );
        this._scene.add(spike);
      }
    }

    // Perch markers
    const perchGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const perchMat = new THREE.MeshBasicMaterial({ color: COL.PERCH_GLOW, transparent: true, opacity: 0.5 });
    this._perchMarkers = [];
    this._perchBeams = [];
    for (let i = 0; i < 12; i++) {
      const marker = new THREE.Mesh(perchGeo, perchMat.clone());
      marker.visible = false;
      this._scene.add(marker);
      this._perchMarkers.push(marker);

      // Vertical light beam for each perch
      const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 6, 4);
      const beamMat = new THREE.MeshBasicMaterial({
        color: COL.PERCH_GLOW, transparent: true, opacity: 0.1, depthWrite: false,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.visible = false;
      this._scene.add(beam);
      this._perchBeams.push(beam);
    }
  }

  // ======================================================================
  // Player gargoyle — enhanced mesh
  // ======================================================================

  private _buildPlayerMesh(): void {
    this._playerMesh = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: COL.GARGOYLE, roughness: 0.65, metalness: 0.18 });
    const dark = new THREE.MeshStandardMaterial({ color: COL.GARGOYLE_DARK, roughness: 0.8 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.7, 0.9), mat);
    torso.castShadow = true;
    this._playerMesh.add(torso);

    // Shoulders (wider)
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.7), mat);
    shoulders.position.y = 0.7;
    this._playerMesh.add(shoulders);

    // Head with snout
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.55), mat);
    head.position.set(0, 1.15, 0.1);
    this._playerMesh.add(head);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.35), dark);
    snout.position.set(0, 1.0, 0.4);
    this._playerMesh.add(snout);
    // Jaw
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), dark);
    jaw.position.set(0, 0.9, 0.4);
    this._playerMesh.add(jaw);

    // Horns (curved)
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 5), dark);
      horn.position.set(side * 0.28, 1.5, -0.05);
      horn.rotation.z = side * 0.5; horn.rotation.x = -0.2;
      this._playerMesh.add(horn);
    }

    // Eyes
    this._playerEyeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 3 });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), this._playerEyeMat);
      eye.position.set(side * 0.16, 1.2, 0.35);
      this._playerMesh.add(eye);
    }

    // Arms
    for (const side of [-1, 1]) {
      const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), dark);
      upperArm.position.set(side * 0.9, 0.3, 0);
      this._playerMesh.add(upperArm);
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), dark);
      forearm.position.set(side * 0.9, -0.3, 0.15);
      this._playerMesh.add(forearm);
      // Claws
      for (let c = -1; c <= 1; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.2, 3), dark);
        claw.position.set(side * 0.9 + c * 0.06, -0.65, 0.15);
        claw.rotation.x = 0.3;
        this._playerMesh.add(claw);
      }
    }

    // Wings (bat-like with finger bones)
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x4a5a6a, roughness: 0.75, side: THREE.DoubleSide });
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(0.5, 0.8); wingShape.lineTo(1.5, 1.2); wingShape.lineTo(2.8, 1.0);
    wingShape.lineTo(3.2, 0.3); wingShape.lineTo(2.5, -0.2); wingShape.lineTo(1.8, -0.1);
    wingShape.lineTo(1.2, -0.4); wingShape.lineTo(0.6, -0.3); wingShape.lineTo(0, -0.15);
    const wingGeo = new THREE.ShapeGeometry(wingShape);

    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(side * -0.65, 0.4, -0.15);
      wing.rotation.y = side > 0 ? Math.PI / 2 - 0.3 : -Math.PI / 2 + 0.3;
      wing.rotation.x = 0.1;
      wing.scale.x = side > 0 ? -1 : 1;
      wing.name = side > 0 ? "rightWing" : "leftWing";
      this._playerMesh.add(wing);

      // Wing finger bones
      const boneMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5a, roughness: 0.8 });
      for (let b = 0; b < 3; b++) {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.5 + b * 0.4, 3), boneMat);
        bone.position.set(side * -(0.8 + b * 0.5), 0.5 + b * 0.15, -0.15);
        bone.rotation.z = side * (0.3 + b * 0.15);
        bone.rotation.x = 0.1;
        this._playerMesh.add(bone);
      }
    }

    // Tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 1.8, 5), dark);
    tail.position.set(0, -0.3, -0.7); tail.rotation.x = -0.7;
    this._playerMesh.add(tail);
    // Tail spike
    const tailSpike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 4), dark);
    tailSpike.position.set(0, -0.5, -1.4); tailSpike.rotation.x = -1.2;
    this._playerMesh.add(tailSpike);

    // Feet with talons
    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.45), dark);
      foot.position.set(side * 0.35, -0.95, 0.1);
      this._playerMesh.add(foot);
      for (let t = -1; t <= 1; t++) {
        const talon = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 3), dark);
        talon.position.set(side * 0.35 + t * 0.1, -1.0, 0.35);
        talon.rotation.x = 0.5;
        this._playerMesh.add(talon);
      }
    }

    this._playerMesh.castShadow = true;
    this._scene.add(this._playerMesh);
  }

  // ======================================================================
  // Instanced systems
  // ======================================================================

  private _buildParticleSystem(): void {
    const geo = new THREE.SphereGeometry(0.15, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this._particleMesh = new THREE.InstancedMesh(geo, mat, 800);
    this._particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._particleMesh.count = 0;
    this._scene.add(this._particleMesh);
  }

  private _buildSoulOrbSystem(): void {
    const geo = new THREE.SphereGeometry(0.25, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: COL.SOUL_PURPLE });
    this._soulOrbMesh = new THREE.InstancedMesh(geo, mat, 50);
    this._soulOrbMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._soulOrbMesh.count = 0;
    this._scene.add(this._soulOrbMesh);
  }

  private _buildHealthOrbSystem(): void {
    const geo = new THREE.SphereGeometry(0.3, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x44ff44 });
    this._healthOrbMesh = new THREE.InstancedMesh(geo, mat, 20);
    this._healthOrbMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._healthOrbMesh.count = 0;
    this._scene.add(this._healthOrbMesh);
  }

  private _buildProjectileSystem(): void {
    const geo = new THREE.SphereGeometry(0.2, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    this._projectileMesh = new THREE.InstancedMesh(geo, mat, 30);
    this._projectileMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._projectileMesh.count = 0;
    this._scene.add(this._projectileMesh);
  }

  private _buildEmberSystem(): void {
    const geo = new THREE.SphereGeometry(0.06, 3, 3);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff8844 });
    this._emberMesh = new THREE.InstancedMesh(geo, mat, 80);
    this._emberMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._emberMesh.count = 0;
    this._scene.add(this._emberMesh);

    // Pre-populate embers
    for (let i = 0; i < 40; i++) {
      this._emberData.push({
        pos: new THREE.Vector3((Math.random() - 0.5) * 30, Math.random() * 40, (Math.random() - 0.5) * 30),
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.5 + Math.random() * 1.5, (Math.random() - 0.5) * 0.5),
        life: Math.random() * 8,
      });
    }
  }

  private _buildSacredCircle(): void {
    // Glowing ring around cathedral base
    const geo = new THREE.RingGeometry(20, 21, 48);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x4466aa, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide,
    });
    this._sacredCircle = new THREE.Mesh(geo, mat);
    this._sacredCircle.position.y = 0.1;
    this._scene.add(this._sacredCircle);

    // Inner rune ring
    const inner = new THREE.Mesh(
      new THREE.RingGeometry(16, 16.3, 48),
      new THREE.MeshBasicMaterial({ color: 0x6688cc, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide }),
    );
    inner.rotateX(-Math.PI / 2); inner.position.y = 0.1;
    this._scene.add(inner);
  }

  private _buildFuryLight(): void {
    this._furyLight = new THREE.PointLight(0xff2200, 0, 10);
    this._furyLight.position.set(0, 0, 0);
    this._scene.add(this._furyLight);
  }

  private _buildClouds(): void {
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0x1a1a2a, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide,
    });
    for (let i = 0; i < 12; i++) {
      // Soft ellipsoid clouds at high altitude
      const w = 15 + Math.random() * 25;
      const d = 8 + Math.random() * 12;
      const geo = new THREE.PlaneGeometry(w, d);
      geo.rotateX(-Math.PI / 2);
      const cloud = new THREE.Mesh(geo, cloudMat.clone());
      cloud.position.set(
        (Math.random() - 0.5) * 180,
        70 + Math.random() * 30,
        (Math.random() - 0.5) * 180,
      );
      cloud.rotation.y = Math.random() * Math.PI;
      cloud.userData = { speed: 0.3 + Math.random() * 0.8 };
      this._scene.add(cloud);
      this._cloudMeshes.push(cloud);
    }
  }

  private _buildGodRay(): void {
    // Fake volumetric cone from moon direction
    const geo = new THREE.CylinderGeometry(0.5, 12, 80, 8, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x6688aa, transparent: true, opacity: 0.02, depthWrite: false, side: THREE.DoubleSide,
    });
    this._godRay = new THREE.Mesh(geo, mat);
    this._godRay.position.set(-15, 40, -10);
    this._godRay.rotation.z = 0.4;
    this._godRay.rotation.x = -0.2;
    this._scene.add(this._godRay);
  }

  private _buildAurora(): void {
    // Animated aurora borealis band using a custom shader on a wide plane
    this._auroraUniforms = {
      time: { value: 0 },
      color1: { value: new THREE.Color(0x2244aa) },
      color2: { value: new THREE.Color(0x22aa66) },
    };
    const geo = new THREE.PlaneGeometry(250, 40, 64, 4);
    const mat = new THREE.ShaderMaterial({
      uniforms: this._auroraUniforms,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying float vDisplace;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float wave = sin(pos.x * 0.04 + time * 0.3) * 5.0 + sin(pos.x * 0.08 + time * 0.5) * 3.0;
          pos.y += wave;
          vDisplace = wave * 0.1;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float time;
        varying vec2 vUv;
        varying float vDisplace;
        void main() {
          float t = vUv.x + sin(time * 0.2 + vUv.x * 3.0) * 0.1;
          vec3 col = mix(color1, color2, t);
          float alpha = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
          alpha *= 0.06 + abs(vDisplace) * 0.02;
          alpha *= 0.5 + sin(time * 0.4 + vUv.x * 5.0) * 0.2;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    this._auroraMesh = new THREE.Mesh(geo, mat);
    this._auroraMesh.position.set(0, 100, -60);
    this._auroraMesh.rotation.x = -0.3;
    this._scene.add(this._auroraMesh);
  }

  private _buildBats(): void {
    // Simple bat shapes using instanced flat quads
    const geo = new THREE.PlaneGeometry(0.6, 0.3);
    const mat = new THREE.MeshBasicMaterial({ color: 0x111118, side: THREE.DoubleSide });
    this._batMesh = new THREE.InstancedMesh(geo, mat, 20);
    this._batMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._batMesh.count = 0;
    this._scene.add(this._batMesh);

    // Pre-populate bat flight paths (circle around tower tops)
    for (let i = 0; i < 16; i++) {
      this._batData.push({
        angle: Math.random() * Math.PI * 2,
        height: GARG.TOWER_HEIGHT + 2 + Math.random() * 10,
        radius: 5 + Math.random() * 8,
        speed: 1.5 + Math.random() * 2,
        flapPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  private _buildFireParticles(): void {
    // Separate instanced mesh with additive blending for fire glow
    const geo = new THREE.SphereGeometry(0.12, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff6622, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this._fireParticleMesh = new THREE.InstancedMesh(geo, mat, 200);
    this._fireParticleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._fireParticleMesh.count = 0;
    this._scene.add(this._fireParticleMesh);
  }

  // ======================================================================
  // Demon meshes — enhanced per-type
  // ======================================================================

  private _getDemonMesh(demon: Demon): THREE.Group {
    let mesh = this._demonMeshes.get(demon.id);
    if (mesh) return mesh;

    mesh = new THREE.Group();
    const colors: Record<string, number> = {
      imp: COL.IMP_COLOR, fiend: COL.FIEND_COLOR, brute: COL.BRUTE_COLOR,
      wraith: COL.WRAITH_COLOR, hellion: COL.HELLION_COLOR, necromancer: 0x225544,
    };
    const baseColor = colors[demon.type] ?? 0xaa2222;
    const mat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.7, metalness: 0.1 });
    const dark = new THREE.MeshStandardMaterial({ color: COL.DEMON_DARK, roughness: 0.8 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xff8800, emissiveIntensity: 2.5 });

    let scale = 1;
    switch (demon.type) {
      case "imp": scale = 0.6; break;
      case "fiend": scale = 1.0; break;
      case "brute": scale = 1.6; break;
      case "wraith": scale = 0.9; break;
      case "hellion": scale = 2.2; break;
      case "necromancer": scale = 1.1; break;
    }

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.6), mat);
    body.castShadow = true; body.name = "body";
    mesh.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), mat);
    head.position.y = 0.9; head.name = "head";
    mesh.add(head);

    // Eyes
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), eyeMat);
      eye.position.set(s * 0.12, 0.95, 0.28);
      mesh.add(eye);
    }

    // ---- Type-specific features ----
    if (demon.type === "imp") {
      // Spiky back
      for (let i = 0; i < 3; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 3), dark);
        spike.position.set(0, 0.3 + i * 0.25, -0.35);
        spike.rotation.x = -0.5;
        mesh.add(spike);
      }
      // Tail
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.8, 4), dark);
      tail.position.set(0, -0.3, -0.4); tail.rotation.x = -0.6;
      mesh.add(tail);
    }

    if (demon.type === "fiend") {
      // Horns
      for (const s of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 4), dark);
        horn.position.set(s * 0.2, 1.3, 0); horn.rotation.z = s * 0.35;
        mesh.add(horn);
      }
      // Arms
      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), mat);
        arm.position.set(s * 0.55, 0.15, 0.1);
        mesh.add(arm);
      }
    }

    if (demon.type === "brute") {
      // Horns
      for (const s of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 4), dark);
        horn.position.set(s * 0.25, 1.35, 0); horn.rotation.z = s * 0.3;
        mesh.add(horn);
      }
      // Massive shoulders
      const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x442211, roughness: 0.7 });
      for (const s of [-1, 1]) {
        const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), shoulderMat);
        shoulder.position.set(s * 0.55, 0.6, 0); shoulder.scale.y = 0.7;
        mesh.add(shoulder);
      }
      // Thick arms with fists
      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), mat);
        arm.position.set(s * 0.65, -0.1, 0.1);
        mesh.add(arm);
        const fist = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), mat);
        fist.position.set(s * 0.65, -0.6, 0.1);
        mesh.add(fist);
      }
    }

    if (demon.type === "wraith") {
      // Ghostly robe (transparent cone)
      const robeMat = new THREE.MeshStandardMaterial({
        color: COL.WRAITH_COLOR, transparent: true, opacity: 0.35, roughness: 0.5, side: THREE.DoubleSide,
      });
      const robe = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.5, 8), robeMat);
      robe.position.y = -0.2; robe.name = "robe";
      mesh.add(robe);

      // Inner glow
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 8),
        new THREE.MeshBasicMaterial({ color: COL.WRAITH_COLOR, transparent: true, opacity: 0.15 }),
      );
      glow.name = "wraithGlow";
      mesh.add(glow);

      // No legs visible (hidden by robe)
      body.visible = false;
    }

    if (demon.type === "hellion") {
      // Horns (large, curved)
      for (const s of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.8, 5), dark);
        horn.position.set(s * 0.3, 1.4, -0.1); horn.rotation.z = s * 0.25; horn.rotation.x = -0.2;
        mesh.add(horn);
      }
      // Fire crown
      const fireMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 3 });
      const crown = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 6, 16), fireMat);
      crown.position.y = 1.5; crown.rotation.x = Math.PI / 2;
      mesh.add(crown);

      // Wings
      const wingMat = new THREE.MeshStandardMaterial({
        color: 0x551100, emissive: 0x330000, emissiveIntensity: 0.5, roughness: 0.6, side: THREE.DoubleSide,
      });
      const wShape = new THREE.Shape();
      wShape.moveTo(0, 0); wShape.lineTo(1, 0.8); wShape.lineTo(1.8, 0.5);
      wShape.lineTo(1.5, -0.2); wShape.lineTo(0.8, -0.3); wShape.lineTo(0, -0.1);
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.ShapeGeometry(wShape), wingMat);
        w.position.set(s * -0.4, 0.5, -0.3);
        w.rotation.y = s > 0 ? Math.PI / 2 - 0.3 : -Math.PI / 2 + 0.3;
        w.scale.x = s > 0 ? -1 : 1;
        mesh.add(w);
      }

      // Point light
      mesh.add(Object.assign(new THREE.PointLight(0xff4400, 1.2, 18), { position: new THREE.Vector3(0, 1, 0) }));
    }

    if (demon.type === "necromancer") {
      // Hooded robe (cone)
      const robeMat = new THREE.MeshStandardMaterial({
        color: 0x1a3322, roughness: 0.7, side: THREE.DoubleSide,
      });
      const robe = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 8), robeMat);
      robe.position.y = -0.1;
      mesh.add(robe);

      // Staff
      const staffMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.8 });
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 4), staffMat);
      staff.position.set(0.5, 0.3, 0);
      mesh.add(staff);

      // Staff orb (glowing green)
      const orbMat = new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x22cc66, emissiveIntensity: 2 });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), orbMat);
      orb.position.set(0.5, 1.35, 0);
      orb.name = "necroOrb";
      mesh.add(orb);

      // Green glow light
      mesh.add(Object.assign(new THREE.PointLight(0x44ff88, 0.6, 8), { position: new THREE.Vector3(0, 1, 0) }));
    }

    // HP bar
    const hpBg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide, depthWrite: false }),
    );
    hpBg.position.y = 1.6; hpBg.name = "hpBg"; mesh.add(hpBg);
    const hpFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.18, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xcc2222, side: THREE.DoubleSide, depthWrite: false }),
    );
    hpFill.position.set(0, 1.6, 0.001); hpFill.name = "hpFill"; mesh.add(hpFill);

    mesh.scale.setScalar(scale);
    this._demonScales.set(demon.id, scale);
    this._scene.add(mesh);
    this._demonMeshes.set(demon.id, mesh);
    return mesh;
  }

  private _cleanupDemonMeshes(state: GargoyleState): void {
    const rm: string[] = [];
    this._demonMeshes.forEach((mesh, id) => {
      if (!state.demons.has(id)) { this._scene.remove(mesh); rm.push(id); }
    });
    for (const id of rm) { this._demonMeshes.delete(id); this._demonScales.delete(id); }
  }

  // ======================================================================
  // Frame update
  // ======================================================================

  update(state: GargoyleState, _dt: number): void {
    this._updateLighting(state);
    this._updatePlayer(state);
    this._updateDemons(state);
    this._updateParticles(state);
    this._updateSoulOrbs(state);
    this._updateHealthOrbs(state);
    this._updateProjectiles(state);
    this._updateEmbers(state);
    this._updateCamera(state);
    this._updateTorches(state);
    this._updateWindows(state);
    this._updatePerchMarkers(state);
    this._updateCathedralDamage(state);
    this._updateGroundFog(state);
    this._updateFogModifier(state);
    this._updateBloodMoon(state);
    this._updateFury(state);
    this._updateSacredCircle(state);
    this._updateBellRing(state);
    this._updateDynamicFOV(state);
    this._updateClouds(state);
    this._updateGodRay(state);
    this._updateAurora(state);
    this._updateBats(state);
    this._updateFireParticles(state);
    this._updateLightning(state);
    this._updateCraters(state);
    this._updateConsecrateRing(state);
    this._updateGustRing(state);
    this._updateBreathCone(state);
    this._consumePendingEvents(state);
    this._cleanupDemonMeshes(state);

    this._renderer.render(this._scene, this._camera);
  }

  private _updateLighting(state: GargoyleState): void {
    const isNight = state.phase === "night" || state.phase === "menu";
    const isDawn = state.phase === "dawn";
    const isDay = state.phase === "day";
    const isDusk = state.phase === "dusk";

    this._starPoints.visible = !isDay;
    // Star twinkle
    if (!isDay) {
      const starMat = this._starPoints.material as THREE.PointsMaterial;
      starMat.size = 0.4 + Math.sin(state.gameTime * 0.3) * 0.05;
    }

    if (isNight || state.phase === "menu") {
      this._ambientLight.intensity = 0.25;
      this._moonLight.intensity = 1.6; this._moonLight.color.set(0x8899cc);
      this._hemiLight.intensity = 0.35;
      (this._scene.fog as THREE.FogExp2).density = GARG.FOG_DENSITY_NIGHT;
      this._skyUniforms.topColor.value.set(COL.SKY_NIGHT_TOP);
      this._skyUniforms.bottomColor.value.set(COL.SKY_NIGHT_BOT);
      this._renderer.toneMappingExposure = 0.75;
      (this._groundMesh.material as THREE.MeshStandardMaterial).color.set(COL.GROUND_NIGHT);
    } else if (isDawn) {
      const t = 1 - state.phaseTimer / GARG.DAWN_DURATION;
      this._ambientLight.intensity = 0.25 + t * 0.45;
      this._moonLight.intensity = 1.6 - t * 0.9;
      this._renderer.toneMappingExposure = 0.75 + t * 0.55;
      (this._scene.fog as THREE.FogExp2).density = GARG.FOG_DENSITY_NIGHT + (GARG.FOG_DENSITY_DAY - GARG.FOG_DENSITY_NIGHT) * t;
      this._skyUniforms.topColor.value.copy(new THREE.Color(COL.SKY_NIGHT_TOP).lerp(new THREE.Color(COL.SKY_DAY_TOP), t));
      this._skyUniforms.bottomColor.value.copy(new THREE.Color(COL.SKY_NIGHT_BOT).lerp(new THREE.Color(COL.SKY_DAY_BOT), t));
    } else if (isDay) {
      this._ambientLight.intensity = 0.7;
      this._moonLight.intensity = 0.7; this._moonLight.color.set(0xffeedd);
      this._hemiLight.intensity = 0.6;
      (this._scene.fog as THREE.FogExp2).density = GARG.FOG_DENSITY_DAY;
      this._skyUniforms.topColor.value.set(COL.SKY_DAY_TOP);
      this._skyUniforms.bottomColor.value.set(COL.SKY_DAY_BOT);
      this._renderer.toneMappingExposure = 1.3;
      (this._groundMesh.material as THREE.MeshStandardMaterial).color.set(COL.GROUND_DAY);
    } else if (isDusk) {
      const t = 1 - state.phaseTimer / GARG.DUSK_DURATION;
      this._ambientLight.intensity = 0.7 - t * 0.45;
      this._moonLight.intensity = 0.7 + t * 0.9; this._moonLight.color.set(0x8899cc);
      this._renderer.toneMappingExposure = 1.3 - t * 0.55;
      this._skyUniforms.topColor.value.copy(new THREE.Color(COL.SKY_DAY_TOP).lerp(new THREE.Color(COL.SKY_NIGHT_TOP), t));
      this._skyUniforms.bottomColor.value.copy(new THREE.Color(COL.SKY_DAY_BOT).lerp(new THREE.Color(COL.SKY_NIGHT_BOT), t));
    }
  }

  private _updateTorches(state: GargoyleState): void {
    // Flickering torch lights
    for (let i = 0; i < this._torchLights.length; i++) {
      const base = 0.5;
      const flicker = base + Math.sin(state.gameTime * 8 + i * 1.7) * 0.15
        + Math.sin(state.gameTime * 13 + i * 3.1) * 0.1
        + Math.random() * 0.05;
      this._torchLights[i].intensity = flicker;
    }
    // Animate flame meshes
    for (const m of this._torchMeshes) {
      if (m.name === "flame") {
        const s = 0.8 + Math.sin(state.gameTime * 10 + m.position.x * 3) * 0.2;
        m.scale.setScalar(s);
      }
    }
  }

  private _updatePlayer(state: GargoyleState): void {
    const p = state.player;
    this._playerMesh.position.set(p.pos.x, p.pos.y, p.pos.z);
    this._playerMesh.rotation.y = p.yaw + Math.PI;

    const speed = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
    this._playerMesh.rotation.x = p.action === "diving" ? -0.8 : Math.min(speed * 0.03, 0.4);

    const lw = this._playerMesh.getObjectByName("leftWing") as THREE.Mesh | undefined;
    const rw = this._playerMesh.getObjectByName("rightWing") as THREE.Mesh | undefined;

    if (p.action === "flying" || p.action === "gliding") {
      const flapS = p.action === "flying" ? 8 : 3;
      const flapA = p.action === "flying" ? 0.5 : 0.2;
      const flap = Math.sin(state.gameTime * flapS) * flapA;
      if (lw) lw.rotation.x = 0.1 + flap;
      if (rw) rw.rotation.x = 0.1 + flap;
    } else if (p.action === "perched") {
      if (lw) lw.rotation.x = 0.5;
      if (rw) rw.rotation.x = 0.5;
      this._playerMesh.rotation.x = 0;
    } else if (p.action === "diving") {
      if (lw) lw.rotation.x = -0.5;
      if (rw) rw.rotation.x = -0.5;
    }

    // Eyes — fury makes them burn brighter, frozen dims them
    const fury = p.hp > 0 && p.hp < p.maxHp * 0.25 && p.action !== "frozen";
    if (p.action === "frozen") {
      this._playerEyeMat.emissiveIntensity = 0.2;
      this._playerEyeMat.color.set(0x333333);
      this._playerEyeMat.emissive.set(0x333333);
    } else if (fury) {
      const pulse = 3 + Math.sin(state.gameTime * 8) * 2;
      this._playerEyeMat.emissiveIntensity = pulse;
      this._playerEyeMat.color.set(0xff2200);
      this._playerEyeMat.emissive.set(0xff2200);
    } else {
      this._playerEyeMat.emissiveIntensity = 3;
      this._playerEyeMat.color.set(0xff4400);
      this._playerEyeMat.emissive.set(0xff4400);
    }

    // Damage blink
    if (p.invincibleTimer > 0 && p.invincibleTimer < 0.25) {
      this._playerMesh.visible = Math.sin(state.gameTime * 30) > 0;
    } else {
      this._playerMesh.visible = true;
    }

    // Stone skin grey tint
    const bodyMesh = this._playerMesh.children[0] as THREE.Mesh;
    if (bodyMesh.material instanceof THREE.MeshStandardMaterial) {
      if (p.stoneSkinTimer > 0) {
        bodyMesh.material.color.set(0xbbbbcc);
        bodyMesh.material.metalness = 0.5;
      } else if (p.action !== "frozen") {
        bodyMesh.material.color.set(COL.GARGOYLE);
        bodyMesh.material.metalness = 0.18;
      }
    }

    // Body roll on attack + slash arc particles
    if (p.attacking) {
      this._playerMesh.rotation.z = Math.sin(state.gameTime * 25) * 0.15;
      // Spawn slash arc particles in front of player
      if (state.tick % 2 === 0) {
        const slashAngle = state.gameTime * 25;
        const fwd = Math.sin(p.yaw);
        const side = Math.cos(p.yaw);
        const arcX = p.pos.x + fwd * 2 + Math.cos(slashAngle) * side * 1.5;
        const arcZ = p.pos.z + Math.cos(p.yaw) * 2 - Math.cos(slashAngle) * fwd * 1.5;
        state.particles.push({
          pos: { x: arcX, y: p.pos.y + Math.sin(slashAngle) * 0.8, z: arcZ },
          vel: { x: fwd * 3, y: 1, z: Math.cos(p.yaw) * 3 },
          life: 0.15, maxLife: 0.15, color: 0xccddff, size: 0.12, type: "trail",
        });
      }
    } else {
      this._playerMesh.rotation.z *= 0.8;
    }
  }

  private _updateDemons(state: GargoyleState): void {
    state.demons.forEach(demon => {
      const mesh = this._getDemonMesh(demon);
      mesh.position.set(demon.pos.x, demon.pos.y, demon.pos.z);
      mesh.rotation.y = demon.rotation;

      // Walk bob
      if (demon.behavior === "approaching" || demon.behavior === "chasing" || demon.behavior === "charging") {
        mesh.position.y += Math.sin(demon.bobPhase) * 0.15;
      }

      // Brute charge glow — lean forward and red emissive
      if (demon.type === "brute" && demon.behavior === "charging") {
        mesh.rotation.x = -0.4; // lean forward
        const bm = mesh.getObjectByName("body") as THREE.Mesh | undefined;
        if (bm?.material instanceof THREE.MeshStandardMaterial) {
          bm.material.emissive.set(0xcc4400);
          bm.material.emissiveIntensity = 0.8 + Math.sin(state.gameTime * 10) * 0.3;
        }
      } else if (demon.type === "brute" && demon.behavior !== "dead" && demon.behavior !== "stunned") {
        mesh.rotation.x = 0;
      }

      // Necromancer casting glow
      if (demon.type === "necromancer" && demon.behavior === "casting") {
        const nOrb = mesh.getObjectByName("necroOrb") as THREE.Mesh | undefined;
        if (nOrb?.material instanceof THREE.MeshStandardMaterial) {
          nOrb.material.emissiveIntensity = 3 + Math.sin(state.gameTime * 10) * 2;
        }
      }

      // Wraith float wobble + transparency pulse
      if (demon.type === "wraith" && demon.behavior !== "dead") {
        mesh.position.y += Math.sin(state.gameTime * 2 + demon.bobPhase) * 0.4;
        const glow = mesh.getObjectByName("wraithGlow") as THREE.Mesh | undefined;
        if (glow?.material instanceof THREE.MeshBasicMaterial) {
          glow.material.opacity = 0.1 + Math.sin(state.gameTime * 3 + demon.bobPhase) * 0.08;
        }
        const robe = mesh.getObjectByName("robe") as THREE.Mesh | undefined;
        if (robe?.material instanceof THREE.MeshStandardMaterial) {
          robe.material.opacity = 0.3 + Math.sin(state.gameTime * 2) * 0.1;
        }
      }

      // HP bar
      const hpBg = mesh.getObjectByName("hpBg") as THREE.Mesh | undefined;
      const hpFill = mesh.getObjectByName("hpFill") as THREE.Mesh | undefined;
      if (hpBg && hpFill) {
        const pct = Math.max(0, demon.hp / demon.maxHp);
        hpFill.scale.x = pct; hpFill.position.x = (pct - 1) * 0.59;
        hpBg.lookAt(this._camera.position); hpFill.lookAt(this._camera.position);
        const show = pct < 1 && demon.behavior !== "dead";
        hpBg.visible = show; hpFill.visible = show;
      }

      // Hit flash
      if (demon.hitFlash > 0) {
        const bm = mesh.getObjectByName("body") as THREE.Mesh | undefined;
        if (bm?.material instanceof THREE.MeshStandardMaterial) {
          bm.material.emissive.set(0xffffff); bm.material.emissiveIntensity = demon.hitFlash * 6;
        }
      } else if (demon.behavior === "stunned") {
        const bm = mesh.getObjectByName("body") as THREE.Mesh | undefined;
        if (bm?.material instanceof THREE.MeshStandardMaterial) {
          bm.material.emissive.set(0x888888); bm.material.emissiveIntensity = 0.3;
        }
      } else if (demon.behavior === "dead") {
        // Dissolve upward with spin
        const origScale = this._demonScales.get(demon.id) ?? 1;
        const t = demon.deathTimer / 2;
        mesh.scale.setScalar(origScale * Math.max(0.01, t));
        mesh.rotation.y += 0.05;
        mesh.position.y += 0.02;
      } else {
        const bm = mesh.getObjectByName("body") as THREE.Mesh | undefined;
        if (bm?.material instanceof THREE.MeshStandardMaterial) {
          bm.material.emissive.set(0x000000); bm.material.emissiveIntensity = 0;
        }
      }

      mesh.visible = true;
    });
  }

  private _updateEmbers(state: GargoyleState): void {
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const dt = 0.016;

    for (const e of this._emberData) {
      e.pos.add(e.vel.clone().multiplyScalar(dt));
      e.pos.x += Math.sin(state.gameTime + e.life) * 0.02;
      e.life -= dt;
      if (e.life <= 0) {
        e.pos.set((Math.random() - 0.5) * 30, Math.random() * 3, (Math.random() - 0.5) * 30);
        e.vel.set((Math.random() - 0.5) * 0.3, 0.5 + Math.random() * 1.5, (Math.random() - 0.5) * 0.3);
        e.life = 4 + Math.random() * 6;
      }
    }

    const count = Math.min(this._emberData.length, 80);
    this._emberMesh.count = count;
    for (let i = 0; i < count; i++) {
      const e = this._emberData[i];
      dummy.position.copy(e.pos);
      const s = 0.5 + Math.sin(state.gameTime * 4 + i) * 0.3;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      this._emberMesh.setMatrixAt(i, dummy.matrix);
      col.setHex(Math.random() < 0.5 ? 0xff8844 : 0xffaa22);
      this._emberMesh.setColorAt(i, col);
    }
    this._emberMesh.instanceMatrix.needsUpdate = true;
    if (this._emberMesh.instanceColor) this._emberMesh.instanceColor.needsUpdate = true;
  }

  private _updateParticles(state: GargoyleState): void {
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const count = Math.min(state.particles.length, 800);
    this._particleMesh.count = count;
    for (let i = 0; i < count; i++) {
      const p = state.particles[i];
      dummy.position.set(p.pos.x, p.pos.y, p.pos.z);
      dummy.scale.setScalar(p.size * (p.life / p.maxLife));
      dummy.updateMatrix();
      this._particleMesh.setMatrixAt(i, dummy.matrix);
      col.set(p.color);
      this._particleMesh.setColorAt(i, col);
    }
    this._particleMesh.instanceMatrix.needsUpdate = true;
    if (this._particleMesh.instanceColor) this._particleMesh.instanceColor.needsUpdate = true;
  }

  private _updateSoulOrbs(state: GargoyleState): void {
    const dummy = new THREE.Object3D();
    const col = new THREE.Color(COL.SOUL_PURPLE);
    const count = Math.min(state.soulOrbs.length, 50);
    this._soulOrbMesh.count = count;
    for (let i = 0; i < count; i++) {
      const o = state.soulOrbs[i];
      dummy.position.set(o.pos.x, o.pos.y, o.pos.z);
      dummy.scale.setScalar(0.8 + Math.sin(state.gameTime * 6 + i) * 0.2);
      dummy.updateMatrix();
      this._soulOrbMesh.setMatrixAt(i, dummy.matrix);
      this._soulOrbMesh.setColorAt(i, col);
    }
    this._soulOrbMesh.instanceMatrix.needsUpdate = true;
    if (this._soulOrbMesh.instanceColor) this._soulOrbMesh.instanceColor.needsUpdate = true;
  }

  private _updateHealthOrbs(state: GargoyleState): void {
    const dummy = new THREE.Object3D();
    const col = new THREE.Color(0x44ff44);
    const count = Math.min(state.healthOrbs.length, 20);
    this._healthOrbMesh.count = count;
    for (let i = 0; i < count; i++) {
      const o = state.healthOrbs[i];
      dummy.position.set(o.pos.x, o.pos.y, o.pos.z);
      dummy.scale.setScalar(0.7 + Math.sin(state.gameTime * 4 + i * 2) * 0.3);
      dummy.updateMatrix();
      this._healthOrbMesh.setMatrixAt(i, dummy.matrix);
      this._healthOrbMesh.setColorAt(i, col);
    }
    this._healthOrbMesh.instanceMatrix.needsUpdate = true;
    if (this._healthOrbMesh.instanceColor) this._healthOrbMesh.instanceColor.needsUpdate = true;
  }

  private _updateProjectiles(state: GargoyleState): void {
    const dummy = new THREE.Object3D();
    const col = new THREE.Color(0xff6600);
    const count = Math.min(state.projectiles.length, 30);
    this._projectileMesh.count = count;
    for (let i = 0; i < count; i++) {
      const p = state.projectiles[i];
      dummy.position.set(p.pos.x, p.pos.y, p.pos.z);
      dummy.scale.setScalar(0.8 + Math.sin(state.gameTime * 10 + i) * 0.3);
      dummy.updateMatrix();
      this._projectileMesh.setMatrixAt(i, dummy.matrix);
      this._projectileMesh.setColorAt(i, col);
    }
    this._projectileMesh.instanceMatrix.needsUpdate = true;
    if (this._projectileMesh.instanceColor) this._projectileMesh.instanceColor.needsUpdate = true;
  }

  private _updateCamera(state: GargoyleState): void {
    const p = state.player;

    // Orbit cameras for non-gameplay phases — use lerp for smooth transitions
    const orbitPhase = state.phase === "menu" || state.phase === "game_over" || state.phase === "day";
    if (orbitPhase) {
      let targetPos: THREE.Vector3;
      let lookAt: THREE.Vector3;

      if (state.phase === "menu") {
        const t = state.gameTime * 0.08;
        targetPos = new THREE.Vector3(Math.cos(t) * 55, 38, Math.sin(t) * 55);
        lookAt = new THREE.Vector3(0, 22, 0);
      } else if (state.phase === "game_over") {
        const t = state.gameTime * 0.04;
        targetPos = new THREE.Vector3(Math.cos(t) * 65, 42, Math.sin(t) * 65);
        lookAt = new THREE.Vector3(0, 18, 0);
      } else {
        const t = state.gameTime * 0.07;
        targetPos = new THREE.Vector3(Math.cos(t) * 42, 48, Math.sin(t) * 42);
        lookAt = new THREE.Vector3(0, 22, 0);
      }

      // Smooth transition into orbit mode
      this._phaseCamLerp = Math.min(1, this._phaseCamLerp + 0.02);
      this._camera.position.lerp(targetPos, this._phaseCamLerp * 0.05 + 0.02);
      this._camLookTarget.lerp(lookAt, 0.05);
      this._camera.lookAt(this._camLookTarget);
      return;
    }

    // Reset phase lerp when entering gameplay
    this._phaseCamLerp = 0;

    const dist = GARG.CAMERA_FOLLOW_DIST;
    this._camTarget.set(
      p.pos.x - Math.sin(p.yaw) * dist,
      p.pos.y + GARG.CAMERA_FOLLOW_HEIGHT + Math.sin(p.pitch) * dist * 0.5,
      p.pos.z - Math.cos(p.yaw) * dist,
    );
    this._camLookTarget.set(
      p.pos.x + Math.sin(p.yaw) * 5,
      p.pos.y - Math.sin(p.pitch) * 3,
      p.pos.z + Math.cos(p.yaw) * 5,
    );
    this._camera.position.lerp(this._camTarget, GARG.CAMERA_LERP * 3);

    if (state.screenShake > 0) {
      const i = state.screenShakeIntensity * (state.screenShake / 0.5);
      this._camera.position.x += (Math.random() - 0.5) * i;
      this._camera.position.y += (Math.random() - 0.5) * i;
      this._camera.position.z += (Math.random() - 0.5) * i;
    }
    this._camera.lookAt(this._camLookTarget);
  }

  private _updateWindows(state: GargoyleState): void {
    const f = 0.6 + Math.sin(state.gameTime * 2.5) * 0.12 + Math.sin(state.gameTime * 6.7) * 0.08 + Math.sin(state.gameTime * 11.3) * 0.05;
    for (const w of this._windowGlowMeshes) {
      (w.material as THREE.MeshStandardMaterial).emissiveIntensity = f;
    }
  }

  private _updatePerchMarkers(state: GargoyleState): void {
    const p = state.player;
    const show = state.phase === "night" || state.phase === "dawn" || state.phase === "dusk";
    for (let i = 0; i < this._perchMarkers.length && i < state.cathedral.perchPoints.length; i++) {
      const marker = this._perchMarkers[i];
      const beam = this._perchBeams[i];
      const pp = state.cathedral.perchPoints[i];
      const d = Math.sqrt((p.pos.x - pp.pos.x) ** 2 + (p.pos.y - pp.pos.y) ** 2 + (p.pos.z - pp.pos.z) ** 2);
      const nearEnough = d < GARG.PERCH_SNAP_DIST * 3;
      const vis = show && p.action !== "perched" && nearEnough;
      const inRange = d < GARG.PERCH_SNAP_DIST;

      marker.position.set(pp.pos.x, pp.pos.y + Math.sin(state.gameTime * 2 + i) * 0.3, pp.pos.z);
      marker.visible = vis;
      const mat = marker.material as THREE.MeshBasicMaterial;
      mat.opacity = inRange ? 0.9 : 0.3;
      marker.scale.setScalar((inRange ? 0.5 : 0.3) + Math.sin(state.gameTime * 3) * 0.1);

      // Light beam
      if (beam) {
        beam.position.set(pp.pos.x, pp.pos.y + 3, pp.pos.z);
        beam.visible = vis && inRange;
        const bMat = beam.material as THREE.MeshBasicMaterial;
        bMat.opacity = 0.06 + Math.sin(state.gameTime * 4 + i) * 0.03;
        beam.scale.y = 1 + Math.sin(state.gameTime * 2 + i) * 0.2;
      }
    }
  }

  private _updateCathedralDamage(state: GargoyleState): void {
    const dmg = 1 - state.cathedral.hp / state.cathedral.maxHp;
    const mat = this._cathedralCrackOverlay.material as THREE.MeshBasicMaterial;
    mat.opacity = dmg * 0.15 + (dmg > 0.5 ? Math.sin(state.gameTime * 4) * 0.05 : 0);
  }

  private _updateGroundFog(state: GargoyleState): void {
    const night = state.phase !== "day";
    (this._groundFog.material as THREE.MeshBasicMaterial).opacity = night ? 0.1 : 0.02;
    this._groundFog.position.x = Math.sin(state.gameTime * 0.04) * 4;
    this._groundFog.position.z = Math.cos(state.gameTime * 0.06) * 4;
  }

  private _updateFogModifier(state: GargoyleState): void {
    if (state.waveModifier === "fog_night" && (state.phase === "night" || state.phase === "dawn")) {
      (this._scene.fog as THREE.FogExp2).density = GARG.FOG_DENSITY_FOG_MOD;
    }
  }

  private _updateBloodMoon(state: GargoyleState): void {
    const blood = state.waveModifier === "blood_moon" && state.phase !== "day" && state.phase !== "menu";
    if (blood) {
      this._moonMesh.material = new THREE.MeshBasicMaterial({ color: 0xff3322 });
      if (this._moonGlow) (this._moonGlow.material as THREE.MeshBasicMaterial).color.set(0xaa2211);
      this._moonLight.color.set(0xcc5533);
      // Tint the full sky red
      this._skyUniforms.topColor.value.set(0x1a0408);
      this._skyUniforms.bottomColor.value.set(0x2a0a10);
      this._hemiLight.color.set(0x442222);
      (this._scene.fog as THREE.FogExp2).color.set(0x180808);
    } else if (state.phase !== "day") {
      this._moonMesh.material = new THREE.MeshBasicMaterial({ color: 0xdde4f0 });
      if (this._moonGlow) (this._moonGlow.material as THREE.MeshBasicMaterial).color.set(0x6688bb);
      this._hemiLight.color.set(0x1a1a66);
      (this._scene.fog as THREE.FogExp2).color.set(0x060412);
    }
  }

  private _updateFury(state: GargoyleState): void {
    const p = state.player;
    const fury = p.hp > 0 && p.hp < p.maxHp * 0.25 && p.action !== "frozen";

    this._furyLight.position.copy(this._playerMesh.position);
    if (fury) {
      this._furyLight.intensity = 1.5 + Math.sin(state.gameTime * 6) * 0.5;
      this._furyLight.color.set(0xff2200);

      // Red fury trail particles
      if (state.tick % 4 === 0) {
        state.particles.push({
          pos: { x: p.pos.x, y: p.pos.y - 0.3, z: p.pos.z },
          vel: { x: (Math.random() - 0.5) * 1, y: 1 + Math.random(), z: (Math.random() - 0.5) * 1 },
          life: 0.4, maxLife: 0.4, color: 0xff2200, size: 0.2, type: "fire",
        });
      }
    } else {
      this._furyLight.intensity = 0;
    }
  }

  private _updateSacredCircle(state: GargoyleState): void {
    // Pulse and rotate the sacred circle
    const mat = this._sacredCircle.material as THREE.MeshBasicMaterial;
    const isActive = state.phase === "night" || state.phase === "dawn";
    mat.opacity = isActive ? 0.06 + Math.sin(state.gameTime * 1.5) * 0.03 : 0.02;
    this._sacredCircle.rotation.y = state.gameTime * 0.03;

    // Color based on modifier
    if (state.waveModifier === "blood_moon") mat.color.set(0xaa2222);
    else if (state.waveModifier === "spirit") mat.color.set(0x6644aa);
    else mat.color.set(0x4466aa);
  }

  triggerBellRing(): void {
    // Called externally when cathedral bell tolls
    if (this._bellRing) this._scene.remove(this._bellRing);
    const geo = new THREE.RingGeometry(0.5, 1.5, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffdd44, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide,
    });
    this._bellRing = new THREE.Mesh(geo, mat);
    this._bellRing.position.set(0, GARG.CATHEDRAL_HEIGHT * 0.8, 0);
    this._scene.add(this._bellRing);
    this._bellRingScale = 0.5;
    this._bellRingLife = 1.5;
  }

  private _updateBellRing(state: GargoyleState): void {
    // Check if bell just triggered
    for (let i = 0; i < state.bellTriggered.length; i++) {
      if (state.bellTriggered[i] && !this._bellTriggeredPrev[i]) {
        this.triggerBellRing();
      }
    }
    this._bellTriggeredPrev = [...state.bellTriggered];

    if (!this._bellRing) return;
    this._bellRingLife -= 0.016;
    if (this._bellRingLife <= 0) {
      this._scene.remove(this._bellRing);
      this._bellRing = null;
      return;
    }
    this._bellRingScale += 0.5;
    this._bellRing.scale.setScalar(this._bellRingScale);
    (this._bellRing.material as THREE.MeshBasicMaterial).opacity = this._bellRingLife * 0.4;
  }
  private _bellTriggeredPrev: boolean[] = [false, false, false];

  private _updateDynamicFOV(state: GargoyleState): void {
    const p = state.player;
    if (p.action === "diving") {
      this._targetFOV = GARG.CAMERA_FOV + 15; // widen during dive
    } else if (state.keys.has("shift") && (p.action === "flying")) {
      this._targetFOV = GARG.CAMERA_FOV - 5; // narrow when sprinting (tunnel vision)
    } else {
      this._targetFOV = GARG.CAMERA_FOV;
    }
    // Smooth interpolation
    const currentFOV = this._camera.fov;
    if (Math.abs(currentFOV - this._targetFOV) > 0.1) {
      this._camera.fov += (this._targetFOV - currentFOV) * 0.08;
      this._camera.updateProjectionMatrix();
    }
  }

  private _updateClouds(state: GargoyleState): void {
    const isDay = state.phase === "day";
    for (const cloud of this._cloudMeshes) {
      const spd = (cloud.userData as { speed: number }).speed;
      cloud.position.x += spd * 0.016;
      // Wrap around
      if (cloud.position.x > 120) cloud.position.x = -120;
      // Opacity: more visible at night
      (cloud.material as THREE.MeshBasicMaterial).opacity = isDay ? 0.08 : 0.15;
      // Blood moon: redish clouds
      if (state.waveModifier === "blood_moon" && !isDay) {
        (cloud.material as THREE.MeshBasicMaterial).color.set(0x2a1015);
      } else {
        (cloud.material as THREE.MeshBasicMaterial).color.set(0x1a1a2a);
      }
    }
  }

  private _updateGodRay(state: GargoyleState): void {
    const isNight = state.phase === "night" || state.phase === "dawn" || state.phase === "dusk" || state.phase === "menu";
    const mat = this._godRay.material as THREE.MeshBasicMaterial;
    // Subtle breathing
    mat.opacity = isNight ? 0.015 + Math.sin(state.gameTime * 0.5) * 0.008 : 0.005;
    this._godRay.rotation.y = state.gameTime * 0.01;
    // Blood moon: red god rays
    mat.color.set(state.waveModifier === "blood_moon" && isNight ? 0x882233 : 0x6688aa);
  }

  private _updateAurora(state: GargoyleState): void {
    this._auroraUniforms.time.value = state.gameTime;
    // Hide during day
    this._auroraMesh.visible = state.phase !== "day";
    // Blood moon: shift aurora to red
    if (state.waveModifier === "blood_moon") {
      this._auroraUniforms.color1.value.set(0xaa2244);
      this._auroraUniforms.color2.value.set(0xcc4422);
    } else if (state.waveModifier === "spirit") {
      this._auroraUniforms.color1.value.set(0x4422aa);
      this._auroraUniforms.color2.value.set(0x8844ff);
    } else {
      this._auroraUniforms.color1.value.set(0x2244aa);
      this._auroraUniforms.color2.value.set(0x22aa66);
    }
  }

  private _updateBats(state: GargoyleState): void {
    const isNight = state.phase === "night" || state.phase === "dawn" || state.phase === "menu";
    const hw = GARG.CATHEDRAL_WIDTH / 2;
    const hl = GARG.CATHEDRAL_LENGTH / 2;
    const towers = [[-hw, -hl], [hw, -hl], [-hw, hl], [hw, hl]];
    const dummy = new THREE.Object3D();
    const count = isNight ? Math.min(this._batData.length, 16) : 0;
    this._batMesh.count = count;

    for (let i = 0; i < count; i++) {
      const b = this._batData[i];
      const t = towers[i % 4];
      b.angle += b.speed * 0.016;
      b.flapPhase += 12 * 0.016;
      const x = t[0] + Math.cos(b.angle) * b.radius;
      const z = t[1] + Math.sin(b.angle) * b.radius;
      const y = b.height + Math.sin(b.angle * 2 + i) * 2;
      dummy.position.set(x, y, z);
      // Face direction of travel
      dummy.rotation.y = b.angle + Math.PI / 2;
      // Wing flap via scale oscillation
      const flap = 0.8 + Math.sin(b.flapPhase) * 0.4;
      dummy.scale.set(flap, 1, 1);
      dummy.updateMatrix();
      this._batMesh.setMatrixAt(i, dummy.matrix);
    }
    this._batMesh.instanceMatrix.needsUpdate = true;
  }

  private _updateFireParticles(state: GargoyleState): void {
    // Render fire-type particles with additive blending separately
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    let count = 0;
    for (const p of state.particles) {
      if (count >= 200) break;
      if (p.type !== "fire" && p.type !== "holy") continue;
      dummy.position.set(p.pos.x, p.pos.y, p.pos.z);
      const s = p.size * (p.life / p.maxLife) * 1.5; // slightly larger for glow
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      this._fireParticleMesh.setMatrixAt(count, dummy.matrix);
      col.set(p.color);
      this._fireParticleMesh.setColorAt(count, col);
      count++;
    }
    this._fireParticleMesh.count = count;
    this._fireParticleMesh.instanceMatrix.needsUpdate = true;
    if (this._fireParticleMesh.instanceColor) this._fireParticleMesh.instanceColor.needsUpdate = true;
  }

  private _updateLightning(state: GargoyleState): void {
    // Random lightning flashes during blood moon or spirit night
    const shouldFlash = state.waveModifier === "blood_moon" || state.waveModifier === "spirit";
    if (!shouldFlash || state.phase === "day" || state.phase === "menu") {
      this._lightningFlash = 0;
      return;
    }

    this._lightningTimer -= 0.016;
    if (this._lightningTimer <= 0) {
      this._lightningTimer = 8 + Math.random() * 15; // every 8-23 seconds
      this._lightningFlash = 0.3;
    }

    if (this._lightningFlash > 0) {
      this._lightningFlash -= 0.016 * 3;
      // Brief white flash on ambient
      this._ambientLight.intensity += this._lightningFlash * 2;
      this._ambientLight.color.set(0xccccff);
    }
  }

  // ---- Dive bomb crater (called from systems via state) ----

  spawnCrater(x: number, z: number): void {
    const geo = new THREE.RingGeometry(0.3, GARG.DIVE_BOMB_RADIUS, 16);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x222211, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide,
    });
    const crater = new THREE.Mesh(geo, mat);
    crater.position.set(x, 0.12, z);
    this._scene.add(crater);
    this._craters.push({ mesh: crater, life: 5.0 });
  }

  private _updateCraters(_state: GargoyleState): void {
    for (let i = this._craters.length - 1; i >= 0; i--) {
      const c = this._craters[i];
      c.life -= 0.016;
      (c.mesh.material as THREE.MeshBasicMaterial).opacity = c.life * 0.08;
      if (c.life <= 0) {
        this._scene.remove(c.mesh);
        this._craters.splice(i, 1);
      }
    }
  }

  // ---- Consecrate ground ring (triggered externally) ----

  triggerConsecrateRing(): void {
    if (this._consecrateRing) this._scene.remove(this._consecrateRing);
    const geo = new THREE.RingGeometry(0.5, 2, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffdd44, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this._consecrateRing = new THREE.Mesh(geo, mat);
    this._consecrateRing.position.set(0, 0.15, 0);
    this._scene.add(this._consecrateRing);
    this._consecrateRingScale = 1;
    this._consecrateRingLife = 1.2;
  }

  private _consumePendingEvents(state: GargoyleState): void {
    for (const c of state.pendingCraters) this.spawnCrater(c.x, c.z);
    state.pendingCraters.length = 0;

    if (state.pendingConsecrateRing) { this.triggerConsecrateRing(); state.pendingConsecrateRing = false; }

    if (state.pendingGustRing) {
      this._spawnGustRing(state.player.pos.x, state.player.pos.y, state.player.pos.z);
      state.pendingGustRing = false;
    }

    if (state.pendingBreathCone) {
      const b = state.pendingBreathCone;
      this._spawnBreathCone(state.player.pos, b.yaw, b.pitch, b.range);
      state.pendingBreathCone = null;
    }
  }

  private _spawnGustRing(x: number, y: number, z: number): void {
    if (this._gustRing) this._scene.remove(this._gustRing);
    const geo = new THREE.RingGeometry(0.3, 1, 24);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x88bbff, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this._gustRing = new THREE.Mesh(geo, mat);
    this._gustRing.position.set(x, y, z);
    this._scene.add(this._gustRing);
    this._gustRingScale = 0.5;
    this._gustRingLife = 0.6;
  }

  private _updateGustRing(_state: GargoyleState): void {
    if (!this._gustRing) return;
    this._gustRingLife -= 0.016;
    if (this._gustRingLife <= 0) { this._scene.remove(this._gustRing); this._gustRing = null; return; }
    this._gustRingScale += 0.6;
    this._gustRing.scale.setScalar(this._gustRingScale);
    (this._gustRing.material as THREE.MeshBasicMaterial).opacity = this._gustRingLife * 0.6;
  }

  private _spawnBreathCone(pos: { x: number; y: number; z: number }, yaw: number, pitch: number, range: number): void {
    if (this._breathCone) this._scene.remove(this._breathCone);
    const geo = new THREE.ConeGeometry(range * 0.35, range, 12, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x999999, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide,
    });
    this._breathCone = new THREE.Mesh(geo, mat);
    this._breathCone.position.set(pos.x, pos.y, pos.z);
    // Point cone forward along player's facing
    this._breathCone.rotation.set(0, yaw + Math.PI, 0);
    this._breathCone.rotateX(Math.PI / 2 + pitch);
    this._breathCone.translateY(range / 2);
    this._scene.add(this._breathCone);
    this._breathConeLife = 0.4;
  }

  private _updateBreathCone(_state: GargoyleState): void {
    if (!this._breathCone) return;
    this._breathConeLife -= 0.016;
    if (this._breathConeLife <= 0) { this._scene.remove(this._breathCone); this._breathCone = null; return; }
    (this._breathCone.material as THREE.MeshBasicMaterial).opacity = this._breathConeLife * 0.3;
  }

  private _updateConsecrateRing(_state: GargoyleState): void {
    if (!this._consecrateRing) return;
    this._consecrateRingLife -= 0.016;
    if (this._consecrateRingLife <= 0) {
      this._scene.remove(this._consecrateRing);
      this._consecrateRing = null;
      return;
    }
    this._consecrateRingScale += 0.4;
    this._consecrateRing.scale.setScalar(this._consecrateRingScale);
    (this._consecrateRing.material as THREE.MeshBasicMaterial).opacity = this._consecrateRingLife * 0.4;
  }

  // ======================================================================
  // Cleanup
  // ======================================================================

  resize(w: number, h: number): void {
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(w, h);
  }

  cleanup(): void {
    if (this._onResize) window.removeEventListener("resize", this._onResize);

    // Dispose all Three.js resources in the scene
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

    this._renderer.dispose();
    this._canvas.remove();
    this._demonMeshes.clear();
    this._demonScales.clear();
  }
}
