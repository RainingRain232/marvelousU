import * as THREE from "three";
import { SB } from "../config/SolsticeBalance";
import { SolsticeState, SolUnit, SolPlatform, Owner } from "../state/SolsticeState";

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const COL = {
  player:     0xffcc44,
  ai:         0x44aaff,
  neutral:    0x88aacc,
  platformTop: 0x22243a,
  platformSide: 0x18192c,
  bridgeDay:  0xffe880,
  bridgeNight: 0x88aaff,
  skyDay:     new THREE.Color(0x1a3a6a),
  skyNight:   new THREE.Color(0x040614),
  fogDay:     new THREE.Color(0x0a1a40),
  fogNight:   new THREE.Color(0x020308),
  sun:        0xffdd88,
  moon:       0xaaccff,
  starColor:  0xffffff,
  auroraA:    new THREE.Color(0x00ffaa),
  auroraB:    new THREE.Color(0x4444ff),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexShape(r: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

function bridgeCurve(a: THREE.Vector3, b: THREE.Vector3): THREE.CatmullRomCurve3 {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  mid.y = Math.max(a.y, b.y) + 2.5; // gentle arc upward
  return new THREE.CatmullRomCurve3([a, mid, b]);
}

// ---------------------------------------------------------------------------
// SolsticeSceneManager
// ---------------------------------------------------------------------------

export class SolsticeSceneManager {
  renderer!:    THREE.WebGLRenderer;
  scene!:       THREE.Scene;
  camera!:      THREE.PerspectiveCamera;
  canvas!:      HTMLCanvasElement;

  private _w = 0;
  private _h = 0;

  // Orbit camera state
  private _theta  = 0.55;
  private _phi    = 0.62;
  private _radius = 90;
  private _target = new THREE.Vector3(0, 9, 4);

  // Lighting
  private _ambientLight!:   THREE.AmbientLight;
  private _hemiLight!:      THREE.HemisphereLight;
  private _sunLight!:       THREE.DirectionalLight;
  private _moonLight!:      THREE.DirectionalLight;
  private _sunMesh!:        THREE.Mesh;
  private _sunGlow!:        THREE.Mesh;
  private _moonMesh!:       THREE.Mesh;
  private _moonGlow!:       THREE.Mesh;
  private _sunPlatformLight!: THREE.PointLight;

  // Geometry
  private _platformMeshes:   THREE.Mesh[]         = [];
  private _platformGlows:    THREE.Mesh[]          = [];
  private _platformRings:    THREE.Mesh[]          = [];
  private _captureRings:     THREE.Mesh[]          = [];
  private _bridgeMeshes:     THREE.Mesh[][]        = [];
  private _bridgeGlowLines:  THREE.Line[][]        = [];
  private _bridgeAnimOffset: number[][]            = [];

  // Stars
  private _stars!:      THREE.Points;
  private _starMat!:    THREE.PointsMaterial;

  // Aurora planes
  private _auroraMeshes: THREE.Mesh[] = [];
  private _auroraTime = 0;

  // Mote particles
  private _motes!:      THREE.Points;
  private _motePositions!: Float32Array;
  private _moteVels!:   Float32Array;
  private _moteTime = 0;

  // Unit meshes
  private _unitMeshes:  Map<string, THREE.Group> = new Map();
  private _unitLights:  Map<string, THREE.PointLight> = new Map();
  private _unitRings:   Map<string, THREE.Mesh> = new Map();

  // Alignment flash
  private _flashMesh!:  THREE.Mesh;
  private _flashTime = 0;

  // Raycast helpers
  private _raycaster    = new THREE.Raycaster();
  private _platformHits: THREE.Mesh[] = [];

  // Platform positions cache (for bridge lookup)
  private _platPositions: THREE.Vector3[] = [];

  // Resize handler reference
  private _onResize = () => this._handleResize();

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  init(): void {
    this._w = window.innerWidth;
    this._h = window.innerHeight;

    this.canvas = document.createElement("canvas");
    this.canvas.id = "solstice-canvas";
    Object.assign(this.canvas.style, {
      position:      "absolute",
      top:           "0",
      left:          "0",
      width:         "100%",
      height:        "100%",
      zIndex:        "10",
      pointerEvents: "auto",
    });
    document.getElementById("pixi-container")?.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(this._w, this._h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace  = THREE.SRGBColorSpace;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.background = COL.skyNight.clone();
    this.scene.fog = new THREE.FogExp2(COL.fogNight.getHex(), 0.006);

    this.camera = new THREE.PerspectiveCamera(60, this._w / this._h, 0.5, 600);
    this._updateCameraPosition();

    this._buildLights();
    this._buildStars();
    this._buildAurora();
    this._buildMotes();
    this._buildSunMoon();
    this._buildVoidFloor();
    this._buildFlashPlane();

    window.addEventListener("resize", this._onResize);
  }

  buildWorld(state: SolsticeState): void {
    this._platPositions = state.platforms.map(p => new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z));
    this._buildPlatforms(state);
    this._buildBridges(state);
  }

  // ---------------------------------------------------------------------------
  // Lighting
  // ---------------------------------------------------------------------------

  private _buildLights(): void {
    this._ambientLight = new THREE.AmbientLight(0x111128, 1.0);
    this.scene.add(this._ambientLight);

    this._hemiLight = new THREE.HemisphereLight(0x223366, 0x050510, 0.8);
    this.scene.add(this._hemiLight);

    this._sunLight = new THREE.DirectionalLight(COL.sun, 0.0);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(1024, 1024);
    this._sunLight.shadow.camera.near = 10;
    this._sunLight.shadow.camera.far  = 250;
    this._sunLight.shadow.camera.left = -80;
    this._sunLight.shadow.camera.right = 80;
    this._sunLight.shadow.camera.top   = 80;
    this._sunLight.shadow.camera.bottom = -80;
    this.scene.add(this._sunLight);

    this._moonLight = new THREE.DirectionalLight(COL.moon, 0.0);
    this.scene.add(this._moonLight);

    this._sunPlatformLight = new THREE.PointLight(0xffffff, 0, 120);
    this._sunPlatformLight.position.set(0, 30, 0);
    this.scene.add(this._sunPlatformLight);
  }

  // ---------------------------------------------------------------------------
  // Stars
  // ---------------------------------------------------------------------------

  private _buildStars(): void {
    const N = 2400;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 280 + Math.random() * 30;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi));  // upper hemisphere only
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this._starMat = new THREE.PointsMaterial({ color: COL.starColor, size: 0.8, sizeAttenuation: true, transparent: true, opacity: 1.0 });
    this._stars = new THREE.Points(geo, this._starMat);
    this.scene.add(this._stars);
  }

  // ---------------------------------------------------------------------------
  // Aurora
  // ---------------------------------------------------------------------------

  private _buildAurora(): void {
    const configs = [
      { x:  0,   z: -200, rot: 0    },
      { x:  160, z: -120, rot: 0.9  },
      { x: -160, z: -120, rot: -0.9 },
    ];
    for (const cfg of configs) {
      const geo = new THREE.PlaneGeometry(180, 120, 1, 6);
      // fade top and bottom verts
      const posArr = geo.attributes["position"].array as Float32Array;
      const colArr = new Float32Array(posArr.length);
      for (let i = 0; i < posArr.length / 3; i++) {
        const ty = (posArr[i * 3 + 1] + 60) / 120; // 0..1
        const alpha = Math.sin(ty * Math.PI) * 0.35;
        colArr[i * 3]     = alpha;
        colArr[i * 3 + 1] = alpha;
        colArr[i * 3 + 2] = alpha;
      }
      geo.setAttribute("color", new THREE.BufferAttribute(colArr, 3));

      const mat = new THREE.MeshBasicMaterial({
        color:       COL.auroraA,
        transparent: true,
        opacity:     0.0,
        side:        THREE.DoubleSide,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
        vertexColors: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cfg.x, 60, cfg.z);
      mesh.rotation.y = cfg.rot;
      this.scene.add(mesh);
      this._auroraMeshes.push(mesh);
    }
  }

  // ---------------------------------------------------------------------------
  // Floating motes
  // ---------------------------------------------------------------------------

  private _buildMotes(): void {
    const N = 300;
    this._motePositions = new Float32Array(N * 3);
    this._moteVels      = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      this._motePositions[i * 3]     = (Math.random() - 0.5) * 120;
      this._motePositions[i * 3 + 1] = Math.random() * 40 + 2;
      this._motePositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
      this._moteVels[i * 3]          = (Math.random() - 0.5) * 0.4;
      this._moteVels[i * 3 + 1]      = Math.random() * 0.3 + 0.05;
      this._moteVels[i * 3 + 2]      = (Math.random() - 0.5) * 0.4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._motePositions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xaaddff, size: 0.22, sizeAttenuation: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    this._motes = new THREE.Points(geo, mat);
    this.scene.add(this._motes);
  }

  // ---------------------------------------------------------------------------
  // Sun & Moon
  // ---------------------------------------------------------------------------

  private _buildSunMoon(): void {
    // Sun
    const sunGeo  = new THREE.SphereGeometry(5, 24, 16);
    const sunMat  = new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0xffcc44, emissiveIntensity: 3.0, roughness: 0, metalness: 0 });
    this._sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this._sunMesh);

    const sunGlowGeo  = new THREE.SphereGeometry(9, 20, 12);
    const sunGlowMat  = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.18, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false });
    this._sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
    this._sunMesh.add(this._sunGlow);

    // Moon
    const moonGeo  = new THREE.SphereGeometry(3.5, 22, 14);
    const moonMat  = new THREE.MeshStandardMaterial({ color: 0xddeeff, emissive: 0x6688cc, emissiveIntensity: 1.8, roughness: 0.4, metalness: 0 });
    this._moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this._moonMesh);

    const moonGlowGeo = new THREE.SphereGeometry(6.5, 18, 10);
    const moonGlowMat = new THREE.MeshBasicMaterial({ color: 0x4466bb, transparent: true, opacity: 0.14, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false });
    this._moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat);
    this._moonMesh.add(this._moonGlow);
  }

  // ---------------------------------------------------------------------------
  // Void floor (distant dark plane for depth)
  // ---------------------------------------------------------------------------

  private _buildVoidFloor(): void {
    const geo = new THREE.PlaneGeometry(800, 800);
    const mat = new THREE.MeshBasicMaterial({ color: 0x03040e });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -25;
    this.scene.add(mesh);
  }

  // ---------------------------------------------------------------------------
  // Alignment flash plane
  // ---------------------------------------------------------------------------

  private _buildFlashPlane(): void {
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthTest: false, depthWrite: false });
    this._flashMesh = new THREE.Mesh(geo, mat);
    this._flashMesh.frustumCulled = false;
    this._flashMesh.renderOrder   = 999;
    this.scene.add(this._flashMesh);
  }

  // ---------------------------------------------------------------------------
  // Platforms
  // ---------------------------------------------------------------------------

  private _buildPlatforms(state: SolsticeState): void {
    const shape    = hexShape(SB.PLATFORM_RADIUS);
    const extruded = new THREE.ExtrudeGeometry(shape, { depth: SB.PLATFORM_HEIGHT, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.3, bevelSegments: 2 });

    // Rotate so the flat side sits on xz plane
    extruded.rotateX(-Math.PI / 2);

    const topMat  = new THREE.MeshStandardMaterial({ color: COL.platformTop,  roughness: 0.75, metalness: 0.2 });
    const sideMat = new THREE.MeshStandardMaterial({ color: COL.platformSide, roughness: 0.85, metalness: 0.1 });

    // Edge glow ring
    const ringGeo = new THREE.TorusGeometry(SB.PLATFORM_RADIUS + 0.15, 0.18, 8, 64);
    // Capture progress ring (slightly larger torus, shown as arc)
    const capGeo  = new THREE.TorusGeometry(SB.PLATFORM_RADIUS + 0.8, 0.22, 8, 64);

    for (const p of state.platforms) {
      const mesh = new THREE.Mesh(extruded, [topMat, sideMat]);
      mesh.position.set(p.pos.x, p.pos.y, p.pos.z);
      mesh.castShadow    = true;
      mesh.receiveShadow = true;
      mesh.userData["platId"] = p.id;
      this.scene.add(mesh);
      this._platformMeshes.push(mesh);
      this._platformHits.push(mesh);

      // Glow ring
      const ringMat  = new THREE.MeshBasicMaterial({ color: COL.neutral, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(p.pos.x, p.pos.y + SB.PLATFORM_HEIGHT * 0.5 + 0.1, p.pos.z);
      this.scene.add(ringMesh);
      this._platformGlows.push(ringMesh);

      // Capture ring
      const capMat  = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, wireframe: true });
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.rotation.x = -Math.PI / 2;
      capMesh.position.set(p.pos.x, p.pos.y + SB.PLATFORM_HEIGHT * 0.5 + 0.2, p.pos.z);
      this.scene.add(capMesh);
      this._captureRings.push(capMesh);

      // Center platform: add a glowing crystal spire
      if (p.isCenter) this._addCrystalSpire(p);
    }
  }

  private _addCrystalSpire(p: SolPlatform): void {
    const geo  = new THREE.ConeGeometry(1.2, 9, 6);
    const mat  = new THREE.MeshStandardMaterial({ color: 0xaaccff, emissive: 0x6699ff, emissiveIntensity: 1.5, roughness: 0, metalness: 0.3, transparent: true, opacity: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(p.pos.x, p.pos.y + SB.PLATFORM_HEIGHT + 4.5, p.pos.z);
    mesh.castShadow = true;
    this.scene.add(mesh);

    // Floating crystal light
    const light = new THREE.PointLight(0x88aaff, 2.5, 35);
    light.position.copy(mesh.position);
    this.scene.add(light);
  }

  // ---------------------------------------------------------------------------
  // Bridges
  // ---------------------------------------------------------------------------

  private _buildBridges(state: SolsticeState): void {
    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0x334466,
      emissive: 0x2244aa,
      emissiveIntensity: 0.6,
      roughness: 0.4,
      metalness: 0.5,
      transparent: true,
      opacity: 0.75,
    });

    const lineMat = new THREE.LineBasicMaterial({
      color: COL.bridgeDay,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const built = new Set<string>();

    for (const p of state.platforms) {
      this._bridgeMeshes[p.id]    = this._bridgeMeshes[p.id]    ?? [];
      this._bridgeGlowLines[p.id] = this._bridgeGlowLines[p.id] ?? [];
      this._bridgeAnimOffset[p.id] = this._bridgeAnimOffset[p.id] ?? [];

      for (const nid of p.adjacentIds) {
        const key = [Math.min(p.id, nid), Math.max(p.id, nid)].join("-");
        if (built.has(key)) continue;
        built.add(key);

        const a = this._platPositions[p.id].clone();
        const b = this._platPositions[nid].clone();
        a.y += SB.PLATFORM_HEIGHT * 0.5;
        b.y += SB.PLATFORM_HEIGHT * 0.5;

        const curve     = bridgeCurve(a, b);
        const tubeGeo   = new THREE.TubeGeometry(curve, 24, SB.BRIDGE_RADIUS, 6, false);
        const tubeMesh  = new THREE.Mesh(tubeGeo, bridgeMat.clone());
        tubeMesh.castShadow = true;
        this.scene.add(tubeMesh);

        // Glow line along bridge
        const pts      = curve.getPoints(40);
        const lineGeo  = new THREE.BufferGeometry().setFromPoints(pts);
        const lineMesh = new THREE.Line(lineGeo, lineMat.clone());
        this.scene.add(lineMesh);

        this._bridgeMeshes[p.id].push(tubeMesh);
        this._bridgeMeshes[nid] = this._bridgeMeshes[nid] ?? [];
        this._bridgeMeshes[nid].push(tubeMesh);

        this._bridgeGlowLines[p.id].push(lineMesh);
        this._bridgeGlowLines[nid] = this._bridgeGlowLines[nid] ?? [];
        this._bridgeGlowLines[nid].push(lineMesh);

        this._bridgeAnimOffset[p.id].push(0);
        this._bridgeAnimOffset[nid] = this._bridgeAnimOffset[nid] ?? [];
        this._bridgeAnimOffset[nid].push(0);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Unit meshes
  // ---------------------------------------------------------------------------

  private _buildUnitMesh(unit: SolUnit): THREE.Group {
    const isPlayer = unit.owner === "player";
    const col      = isPlayer ? COL.player : COL.ai;
    const emissive = isPlayer ? 0xffaa00 : 0x0066ff;

    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: col, emissive, emissiveIntensity: 0.6, roughness: 0.45, metalness: 0.35 });
    const headMat = new THREE.MeshStandardMaterial({ color: isPlayer ? 0xffe8aa : 0xaaddff, emissive: isPlayer ? 0xffcc44 : 0x4488ff, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.2 });

    if (unit.kind === "guardian") {
      // Stocky warrior
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.4, 0.9, 8), bodyMat);
      body.position.y = 0.45;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), headMat);
      head.position.y = 1.12;
      // Shield
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.45), new THREE.MeshStandardMaterial({ color: col, emissive, emissiveIntensity: 0.4 }));
      shield.position.set(0.38, 0.55, 0.1);
      group.add(body, head, shield);
    } else if (unit.kind === "warden") {
      // Lean archer
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 1.0, 8), bodyMat);
      body.position.y = 0.5;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), headMat);
      head.position.y = 1.17;
      // Bow (thin torus arc)
      const bowMat = new THREE.MeshBasicMaterial({ color: isPlayer ? 0xffdd77 : 0x77ccff });
      const bow    = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.035, 6, 18, Math.PI), bowMat);
      bow.position.set(0.32, 0.65, 0);
      bow.rotation.z = Math.PI / 2;
      group.add(body, head, bow);
    } else {
      // Invoker — robed with glowing orb
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.05, 8), bodyMat);
      body.position.y = 0.52;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), headMat);
      head.position.y = 1.2;
      // Staff
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), new THREE.MeshStandardMaterial({ color: isPlayer ? 0xcc9933 : 0x334488, roughness: 0.6 }));
      staff.position.set(0.42, 0.6, 0);
      // Orb
      const orbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: isPlayer ? 0xffaa00 : 0x0088ff, emissiveIntensity: 3.0, roughness: 0, metalness: 0 });
      const orb    = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), orbMat);
      orb.position.set(0.42, 1.28, 0);
      group.add(body, head, staff, orb);
    }

    // Base ring (ownership indicator)
    const ringMat  = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 6, 20), ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.03;
    group.add(ringMesh);

    return group;
  }

  // ---------------------------------------------------------------------------
  // Update (called every frame)
  // ---------------------------------------------------------------------------

  update(state: SolsticeState, dt: number): void {
    this._auroraTime += dt;
    this._moteTime   += dt;

    this._updateSkyAndLighting(state);
    this._updateSunMoon(state);
    this._updateStars(state);
    this._updateAurora(state);
    this._updateMotes(dt);
    this._updatePlatforms(state);
    this._updateBridges(state, dt);
    this._updateUnits(state, dt);
    this._updateFlash(state, dt);
    this._updatePlatformFloating(state, dt);

    // Position flash plane at camera near plane (fullscreen overlay)
    this._flashMesh.position.copy(this.camera.position);
    this._flashMesh.position.addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion), 1.5);
    this._flashMesh.quaternion.copy(this.camera.quaternion);
    this._flashMesh.scale.set(this._w * 0.02, this._h * 0.02, 1);

    this.renderer.render(this.scene, this.camera);
  }

  private _updateSkyAndLighting(state: SolsticeState): void {
    const t    = state.cycleT;
    const day  = t < SB.DAY_FRACTION;
    const dayF = day ? (t / SB.DAY_FRACTION) : ((t - SB.DAY_FRACTION) / (1 - SB.DAY_FRACTION));

    // Blend sky/fog color: sharp transition at dawn (0.0) and dusk (0.5)
    const rawBlend = day ? 1.0 : 0.0;
    const skyBlend = rawBlend * 0.92 + (day ? dayF * 0.08 : (1 - dayF) * 0.08);

    const skyCol = COL.skyNight.clone().lerp(COL.skyDay, skyBlend);
    (this.scene.background as THREE.Color).copy(skyCol);
    ((this.scene.fog as THREE.FogExp2).color).copy(COL.fogNight.clone().lerp(COL.fogDay, skyBlend));

    // Ambient gets brighter during day
    this._ambientLight.intensity = 0.35 + skyBlend * 0.85;
    this._ambientLight.color.setHex(day ? 0x334466 : 0x111128);

    // Directional sun light fades in during day
    this._sunLight.intensity  = day ? skyBlend * 2.2 : 0.0;
    this._moonLight.intensity = day ? 0.0 : (1 - skyBlend) * 1.4;

    this._sunPlatformLight.intensity = day ? skyBlend * 1.2 : 0.0;
  }

  private _updateSunMoon(state: SolsticeState): void {
    const t       = state.cycleT;
    const sunAngle  = t * Math.PI * 2 - Math.PI / 2;
    const moonAngle = sunAngle + Math.PI;

    const R = 130, H = 80;
    const sx = Math.cos(sunAngle) * R;
    const sy = Math.sin(sunAngle) * H + H;
    const sz = -20 + Math.sin(sunAngle * 0.5) * 40;

    this._sunMesh.position.set(sx, sy, sz);
    this._sunLight.position.copy(this._sunMesh.position);

    const mx = Math.cos(moonAngle) * R;
    const my = Math.sin(moonAngle) * H + H;
    const mz = -20 + Math.sin(moonAngle * 0.5) * 40;

    this._moonMesh.position.set(mx, my, mz);
    this._moonLight.position.copy(this._moonMesh.position);

    // Pulse glow
    const pulse = Math.sin(Date.now() * 0.001) * 0.05 + 1.0;
    (this._sunGlow.material as THREE.MeshBasicMaterial).opacity  = 0.16 * pulse;
    (this._moonGlow.material as THREE.MeshBasicMaterial).opacity = 0.12 * pulse;
  }

  private _updateStars(state: SolsticeState): void {
    const t = state.cycleT;
    const isDay = t < SB.DAY_FRACTION;
    const target = isDay ? 0.0 : 1.0;
    this._starMat.opacity += (target - this._starMat.opacity) * 0.015;
  }

  private _updateAurora(state: SolsticeState): void {
    const isNight  = state.cycleT >= SB.DAY_FRACTION;
    const targetOp = isNight ? 0.55 : 0.0;
    for (let i = 0; i < this._auroraMeshes.length; i++) {
      const mat = this._auroraMeshes[i].material as THREE.MeshBasicMaterial;
      const wave = Math.sin(this._auroraTime * 0.4 + i * 1.2) * 0.15 + targetOp;
      mat.opacity += (wave - mat.opacity) * 0.02;
      // Cycle aurora hue between green and blue
      const hue = 0.45 + Math.sin(this._auroraTime * 0.2 + i) * 0.1;
      mat.color.setHSL(hue, 1.0, 0.5);
    }
  }

  private _updateMotes(dt: number): void {
    const N   = this._motePositions.length / 3;
    const arr = this._motePositions;
    const vel = this._moteVels;
    for (let i = 0; i < N; i++) {
      arr[i * 3]     += vel[i * 3]     * dt;
      arr[i * 3 + 1] += vel[i * 3 + 1] * dt;
      arr[i * 3 + 2] += vel[i * 3 + 2] * dt;
      // Reset motes that drift too high
      if (arr[i * 3 + 1] > 55) {
        arr[i * 3 + 1] = 2;
        arr[i * 3]     = (Math.random() - 0.5) * 120;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 120;
      }
    }
    (this._motes.geometry.attributes["position"] as THREE.BufferAttribute).needsUpdate = true;
  }

  private _updatePlatforms(state: SolsticeState): void {
    for (const p of state.platforms) {
      const glowMat  = this._platformGlows[p.id].material as THREE.MeshBasicMaterial;
      const capMesh  = this._captureRings[p.id];
      const capMat   = capMesh.material as THREE.MeshBasicMaterial;

      const targetCol = p.owner === "player" ? COL.player : p.owner === "ai" ? COL.ai : COL.neutral;
      glowMat.color.setHex(targetCol);

      const isContested = (p.captureProgress > 0.05 && p.captureProgress < 0.95);
      capMesh.visible = isContested;
      if (isContested) {
        const frac = p.captureProgress;
        capMat.color.setHex(frac < 0.5 ? COL.player : COL.ai);
        capMesh.rotation.y += 0.02;
      }

      // Pulse glow on player or ai owned
      if (p.owner !== "neutral") {
        const t = Math.sin(Date.now() * 0.002 + p.id) * 0.15 + 0.65;
        glowMat.opacity = t;
      } else {
        glowMat.opacity = 0.3;
      }
    }
  }

  private _updateBridges(state: SolsticeState, _dt: number): void {
    const isDay     = state.cycleT < SB.DAY_FRACTION;
    const bridgeCol = isDay ? COL.bridgeDay : COL.bridgeNight;

    const seen = new Set<number>();
    for (const p of state.platforms) {
      for (let i = 0; i < (this._bridgeGlowLines[p.id]?.length ?? 0); i++) {
        if (seen.has(this._bridgeGlowLines[p.id][i].id)) continue;
        seen.add(this._bridgeGlowLines[p.id][i].id);
        const mat = this._bridgeGlowLines[p.id][i].material as THREE.LineBasicMaterial;
        mat.color.setHex(bridgeCol);
        const pulse = Math.sin(Date.now() * 0.0015 + i * 0.9) * 0.15 + 0.45;
        mat.opacity = pulse;
      }
    }
  }

  private _updateUnits(state: SolsticeState, dt: number): void {
    // Create meshes for new units
    for (const [id, unit] of state.units) {
      if (!this._unitMeshes.has(id) && !unit.isDead) {
        const group = this._buildUnitMesh(unit);
        this.scene.add(group);
        this._unitMeshes.set(id, group);

        // Small point light for glow
        const light = new THREE.PointLight(unit.owner === "player" ? 0xffcc44 : 0x44aaff, 1.2, 8);
        this.scene.add(light);
        this._unitLights.set(id, light);
      }
    }

    // Update positions and remove dead
    for (const [id, mesh] of this._unitMeshes) {
      const unit = state.units.get(id);
      if (!unit || unit.isDead) {
        this.scene.remove(mesh);
        this._unitMeshes.delete(id);
        const light = this._unitLights.get(id);
        if (light) { this.scene.remove(light); this._unitLights.delete(id); }
        continue;
      }

      mesh.position.set(unit.x, unit.y, unit.z);

      // Bob up and down gently
      mesh.position.y += Math.sin(Date.now() * 0.002 + unit.x) * 0.06;

      // Spawn flash: scale up from 0
      if (unit.spawnFlash > 0) {
        const s = 1.0 - unit.spawnFlash * 0.6;
        mesh.scale.setScalar(s);
      } else {
        mesh.scale.setScalar(1.0);
      }

      // Rotate to face movement direction
      if (unit.destPlatId !== null) {
        const dest = this._platPositions[unit.destPlatId];
        const dx   = dest.x - unit.x;
        const dz   = dest.z - unit.z;
        if (Math.abs(dx) + Math.abs(dz) > 0.1) {
          mesh.rotation.y = Math.atan2(dx, dz);
        }
      }

      const light = this._unitLights.get(id);
      if (light) {
        light.position.set(unit.x, unit.y + 0.8, unit.z);
        const pulse = Math.sin(Date.now() * 0.003 + unit.x * 0.5) * 0.3 + 1.2;
        light.intensity = pulse * (unit.spawnFlash > 0 ? 3.0 : 1.0);
      }
    }
  }

  private _updateFlash(state: SolsticeState, dt: number): void {
    if (state.alignmentFlash > 0) {
      const mat = this._flashMesh.material as THREE.MeshBasicMaterial;
      const rel = state.alignmentFlash / SB.ALIGNMENT_FLASH_DURATION;
      mat.opacity = Math.sin(rel * Math.PI) * 0.55;
    } else {
      const mat = this._flashMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, mat.opacity - dt * 1.5);
    }
  }

  private _updatePlatformFloating(state: SolsticeState, _dt: number): void {
    const now = Date.now() * 0.001;
    for (const p of state.platforms) {
      const float = Math.sin(now * SB.PLATFORM_FLOAT_SPEED + p.id * 1.2) * SB.PLATFORM_FLOAT_AMP;
      const mesh  = this._platformMeshes[p.id];
      mesh.position.y = p.pos.y + float;
      this._platformGlows[p.id].position.y  = p.pos.y + SB.PLATFORM_HEIGHT * 0.5 + float + 0.1;
      this._captureRings[p.id].position.y   = p.pos.y + SB.PLATFORM_HEIGHT * 0.5 + float + 0.2;
    }
  }

  // ---------------------------------------------------------------------------
  // Camera orbit
  // ---------------------------------------------------------------------------

  onOrbit(dx: number, dy: number): void {
    this._theta -= dx * 0.006;
    this._phi    = Math.max(0.18, Math.min(Math.PI * 0.44, this._phi + dy * 0.006));
    this._updateCameraPosition();
  }

  onZoom(delta: number): void {
    this._radius = Math.max(45, Math.min(140, this._radius + delta * 0.08));
    this._updateCameraPosition();
  }

  private _updateCameraPosition(): void {
    const x = this._target.x + this._radius * Math.sin(this._phi) * Math.sin(this._theta);
    const y = this._target.y + this._radius * Math.cos(this._phi);
    const z = this._target.z + this._radius * Math.sin(this._phi) * Math.cos(this._theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this._target);
  }

  // ---------------------------------------------------------------------------
  // Raycast platform click
  // ---------------------------------------------------------------------------

  raycastPlatform(clientX: number, clientY: number): number | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc  = new THREE.Vector2(
      ((clientX - rect.left) / rect.width)  * 2 - 1,
      -((clientY - rect.top)  / rect.height) * 2 + 1,
    );
    this._raycaster.setFromCamera(ndc, this.camera);
    const hits = this._raycaster.intersectObjects(this._platformHits);
    if (hits.length > 0) {
      return hits[0].object.userData["platId"] as number;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  destroy(): void {
    window.removeEventListener("resize", this._onResize);
    this.renderer.dispose();
    this.canvas.remove();
  }

  private _handleResize(): void {
    this._w = window.innerWidth;
    this._h = window.innerHeight;
    this.renderer.setSize(this._w, this._h);
    this.camera.aspect = this._w / this._h;
    this.camera.updateProjectionMatrix();
  }
}
