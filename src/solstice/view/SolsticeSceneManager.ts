import * as THREE from "three";
import { SB } from "../config/SolsticeBalance";
import { SolsticeState, SolUnit, SolPlatform, Owner } from "../state/SolsticeState";

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const COL = {
  player:      0xffcc44,
  ai:          0x44aaff,
  neutral:     0x88aacc,
  platformTop: 0x1c1e30,
  platformSide:0x10121e,
  bridgeDay:   0xffe046,
  bridgeNight: 0x66aaff,
  skyDay:      new THREE.Color(0x162d55),
  skyNight:    new THREE.Color(0x040614),
  fogDay:      new THREE.Color(0x0a1a40),
  fogNight:    new THREE.Color(0x02030a),
  sun:         0xffdd88,
  moon:        0xaaccff,
  starColor:   0xffffff,
  auroraA:     new THREE.Color(0x00ffaa),
  auroraB:     new THREE.Color(0x4444ff),
};

// Hot-path cached colours (avoid per-frame allocation)
const _C_PLAYER_EM  = new THREE.Color(0xff9922);
const _C_AI_EM      = new THREE.Color(0x2277ff);
const _C_NEUTRAL_EM = new THREE.Color(0x0a1828);
const _C_TMP        = new THREE.Color();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexShape(r: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else          s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}

function bridgeCurve(a: THREE.Vector3, b: THREE.Vector3): THREE.CatmullRomCurve3 {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  mid.y = Math.max(a.y, b.y) + 2.5;
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
  private _ambientLight!:     THREE.AmbientLight;
  private _hemiLight!:        THREE.HemisphereLight;
  private _sunLight!:         THREE.DirectionalLight;
  private _moonLight!:        THREE.DirectionalLight;
  private _sunMesh!:          THREE.Mesh;
  private _sunGlow!:          THREE.Mesh;
  private _moonMesh!:         THREE.Mesh;
  private _moonGlow!:         THREE.Mesh;
  private _sunPlatformLight!: THREE.PointLight;

  // Platforms
  private _platformMeshes:     THREE.Mesh[]                     = [];
  private _platformGlows:      THREE.Mesh[]                     = [];
  private _platformRings:      THREE.Mesh[]                     = [];
  private _captureRings:       THREE.Mesh[]                     = [];
  private _platformTopMats:    THREE.MeshStandardMaterial[]     = [];
  private _platformBeams:      THREE.Mesh[]                     = [];
  private _platformOwnerLights: THREE.PointLight[]              = [];

  // Bridges
  private _bridgeMeshes:     THREE.Mesh[][]  = [];
  private _bridgeGlow:       THREE.Mesh[][]  = [];   // thin tube (replaces 1-px lines)
  private _bridgeAnimOffset: number[][]      = [];

  // Stars
  private _stars!:      THREE.Points;
  private _starMat!:    THREE.PointsMaterial;
  private _stars2!:     THREE.Points;
  private _star2Mat!:   THREE.PointsMaterial;

  // Aurora planes
  private _auroraMeshes: THREE.Mesh[] = [];
  private _auroraTime = 0;

  // Mote particles
  private _motes!:         THREE.Points;
  private _moteMat!:       THREE.PointsMaterial;
  private _motePositions!: Float32Array;
  private _moteVels!:      Float32Array;

  // Unit meshes
  private _unitMeshes: Map<string, THREE.Group>      = new Map();
  private _unitLights: Map<string, THREE.PointLight> = new Map();
  private _unitRings:  Map<string, THREE.Mesh>       = new Map();

  // Alignment flash & pulse ring
  private _flashMesh!:      THREE.Mesh;
  private _alignPulseRing!: THREE.Mesh;
  private _alignPulseT      = -1;
  private _prevAlignFlash   = 0;

  // Raycast helpers
  private _raycaster     = new THREE.Raycaster();
  private _platformHits: THREE.Mesh[] = [];
  private _platPositions: THREE.Vector3[] = [];

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
      position: "absolute", top: "0", left: "0",
      width: "100%", height: "100%", zIndex: "10", pointerEvents: "auto",
    });
    document.getElementById("pixi-container")?.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(this._w, this._h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace  = THREE.SRGBColorSpace;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.scene.background = COL.skyNight.clone();
    this.scene.fog = new THREE.FogExp2(COL.fogNight.getHex(), 0.006);

    this.camera = new THREE.PerspectiveCamera(60, this._w / this._h, 0.5, 600);
    this._updateCameraPosition();

    this._buildLights();
    this._buildStars();
    this._buildStars2();
    this._buildAurora();
    this._buildMotes();
    this._buildSunMoon();
    this._buildNebulaFloor();
    this._buildFlashPlane();
    this._buildAlignPulseRing();

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
    this._sunLight.shadow.camera.near   = 10;
    this._sunLight.shadow.camera.far    = 250;
    this._sunLight.shadow.camera.left   = -80;
    this._sunLight.shadow.camera.right  = 80;
    this._sunLight.shadow.camera.top    = 80;
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
    const N = 3200;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 280 + Math.random() * 30;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi));
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this._starMat = new THREE.PointsMaterial({
      color: COL.starColor, size: 0.75, sizeAttenuation: true,
      transparent: true, opacity: 1.0,
    });
    this._stars = new THREE.Points(geo, this._starMat);
    this.scene.add(this._stars);
  }

  // Sparse large bright stars for depth / twinkle effect
  private _buildStars2(): void {
    const N = 140;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 272 + Math.random() * 18;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi));
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this._star2Mat = new THREE.PointsMaterial({
      color: 0xfff8e8, size: 2.4, sizeAttenuation: true,
      transparent: true, opacity: 0.0,
    });
    this._stars2 = new THREE.Points(geo, this._star2Mat);
    this.scene.add(this._stars2);
  }

  // ---------------------------------------------------------------------------
  // Aurora
  // ---------------------------------------------------------------------------

  private _buildAurora(): void {
    const configs = [
      { x:   0,  z: -200, rot:  0    },
      { x:  160, z: -120, rot:  0.9  },
      { x: -160, z: -120, rot: -0.9  },
      { x:  100, z:  180, rot:  2.6  },
    ];
    for (const cfg of configs) {
      const geo = new THREE.PlaneGeometry(200, 130, 1, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: COL.auroraA, transparent: true, opacity: 0.0,
        side: THREE.DoubleSide, depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cfg.x, 65, cfg.z);
      mesh.rotation.y = cfg.rot;
      this.scene.add(mesh);
      this._auroraMeshes.push(mesh);
    }
  }

  // ---------------------------------------------------------------------------
  // Motes
  // ---------------------------------------------------------------------------

  private _buildMotes(): void {
    const N = 480;
    this._motePositions = new Float32Array(N * 3);
    this._moteVels      = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      this._motePositions[i * 3]     = (Math.random() - 0.5) * 130;
      this._motePositions[i * 3 + 1] = Math.random() * 45 + 2;
      this._motePositions[i * 3 + 2] = (Math.random() - 0.5) * 130;
      this._moteVels[i * 3]          = (Math.random() - 0.5) * 0.35;
      this._moteVels[i * 3 + 1]      = Math.random() * 0.28 + 0.04;
      this._moteVels[i * 3 + 2]      = (Math.random() - 0.5) * 0.35;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._motePositions, 3));
    this._moteMat = new THREE.PointsMaterial({
      color: 0xaaddff, size: 0.2, sizeAttenuation: true,
      transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this._motes = new THREE.Points(geo, this._moteMat);
    this.scene.add(this._motes);
  }

  // ---------------------------------------------------------------------------
  // Sun & Moon
  // ---------------------------------------------------------------------------

  private _buildSunMoon(): void {
    // Sun core
    const sunMat = new THREE.MeshStandardMaterial({
      color: 0xffee88, emissive: 0xffcc44, emissiveIntensity: 3.2,
      roughness: 0, metalness: 0,
    });
    this._sunMesh = new THREE.Mesh(new THREE.SphereGeometry(5, 24, 16), sunMat);
    this.scene.add(this._sunMesh);

    // Sun glow layers
    const sg1 = new THREE.Mesh(
      new THREE.SphereGeometry(9, 18, 10),
      new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.18, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    const sg2 = new THREE.Mesh(
      new THREE.SphereGeometry(16, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0xff9900, transparent: true, opacity: 0.07, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this._sunMesh.add(sg1, sg2);
    this._sunGlow = sg1;

    // Moon core
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xddeeff, emissive: 0x6688cc, emissiveIntensity: 2.0,
      roughness: 0.4, metalness: 0,
    });
    this._moonMesh = new THREE.Mesh(new THREE.SphereGeometry(3.5, 22, 14), moonMat);
    this.scene.add(this._moonMesh);

    const mg1 = new THREE.Mesh(
      new THREE.SphereGeometry(6.5, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0x4466bb, transparent: true, opacity: 0.14, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    const mg2 = new THREE.Mesh(
      new THREE.SphereGeometry(12, 14, 6),
      new THREE.MeshBasicMaterial({ color: 0x2233aa, transparent: true, opacity: 0.06, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this._moonMesh.add(mg1, mg2);
    this._moonGlow = mg1;
  }

  // ---------------------------------------------------------------------------
  // Nebula floor (replaces flat void floor)
  // ---------------------------------------------------------------------------

  private _buildNebulaFloor(): void {
    // Opaque cap to block anything below
    const cap = new THREE.Mesh(
      new THREE.CircleGeometry(250, 16),
      new THREE.MeshBasicMaterial({ color: 0x01020a }),
    );
    cap.rotation.x = -Math.PI / 2;
    cap.position.y = -22;
    this.scene.add(cap);

    // Layered glowing torus rings at various depths
    const layers = [
      { y: -3,  r: 22, tube: 2.2, col: 0x3355cc, op: 0.22 },
      { y: -6,  r: 44, tube: 4.5, col: 0x1133aa, op: 0.18 },
      { y: -10, r: 68, tube: 7.0, col: 0x0a1a55, op: 0.24 },
      { y: -14, r: 90, tube: 9.5, col: 0x050e30, op: 0.30 },
      { y: -18, r: 56, tube: 7.0, col: 0x2a0d55, op: 0.14 },
      { y: -7,  r: 30, tube: 3.0, col: 0x4466dd, op: 0.12 },
    ];
    for (const l of layers) {
      const mat = new THREE.MeshBasicMaterial({
        color: l.col, transparent: true, opacity: l.op,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(l.r, l.tube, 4, 72), mat);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = l.y;
      this.scene.add(mesh);
    }
  }

  // ---------------------------------------------------------------------------
  // Alignment flash plane
  // ---------------------------------------------------------------------------

  private _buildFlashPlane(): void {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd966, transparent: true, opacity: 0.0, depthTest: false, depthWrite: false,
    });
    this._flashMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this._flashMesh.frustumCulled = false;
    this._flashMesh.renderOrder   = 999;
    this.scene.add(this._flashMesh);
  }

  // ---------------------------------------------------------------------------
  // Alignment pulse ring (expands outward on each alignment event)
  // ---------------------------------------------------------------------------

  private _buildAlignPulseRing(): void {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd966, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this._alignPulseRing = new THREE.Mesh(new THREE.TorusGeometry(5, 0.7, 6, 80), mat);
    this._alignPulseRing.rotation.x = -Math.PI / 2;
    this._alignPulseRing.position.set(0, 10, 0);
    this.scene.add(this._alignPulseRing);
  }

  // ---------------------------------------------------------------------------
  // Platforms
  // ---------------------------------------------------------------------------

  private _buildPlatforms(state: SolsticeState): void {
    const shape    = hexShape(SB.PLATFORM_RADIUS);
    const extruded = new THREE.ExtrudeGeometry(shape, {
      depth: SB.PLATFORM_HEIGHT, bevelEnabled: true,
      bevelSize: 0.3, bevelThickness: 0.3, bevelSegments: 2,
    });
    extruded.rotateX(-Math.PI / 2);

    const sideMat = new THREE.MeshStandardMaterial({ color: COL.platformSide, roughness: 0.85, metalness: 0.15 });
    const ringGeo = new THREE.TorusGeometry(SB.PLATFORM_RADIUS + 0.15, 0.22, 8, 64);
    const capGeo  = new THREE.TorusGeometry(SB.PLATFORM_RADIUS + 0.9,  0.26, 8, 64);

    for (const p of state.platforms) {
      // Per-platform top material so we can lerp emissive toward owner colour
      const topMat = new THREE.MeshStandardMaterial({
        color: COL.platformTop, emissive: COL.platformTop,
        emissiveIntensity: 0.0, roughness: 0.65, metalness: 0.25,
      });
      this._platformTopMats.push(topMat);

      const mesh = new THREE.Mesh(extruded, [topMat, sideMat]);
      mesh.position.set(p.pos.x, p.pos.y, p.pos.z);
      mesh.castShadow    = true;
      mesh.receiveShadow = true;
      mesh.userData["platId"] = p.id;
      this.scene.add(mesh);
      this._platformMeshes.push(mesh);
      this._platformHits.push(mesh);

      // Small accent crystals at hex corners (parented → float with platform)
      this._addCornerCrystals(mesh);

      // Glow ring (ownership colour indicator)
      const ringMat  = new THREE.MeshBasicMaterial({
        color: COL.neutral, transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(p.pos.x, p.pos.y + SB.PLATFORM_HEIGHT * 0.5 + 0.1, p.pos.z);
      this.scene.add(ringMesh);
      this._platformGlows.push(ringMesh);

      // Capture progress ring
      const capMat  = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.4,
        blending: THREE.AdditiveBlending, depthWrite: false, wireframe: true,
      });
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.rotation.x = -Math.PI / 2;
      capMesh.position.set(p.pos.x, p.pos.y + SB.PLATFORM_HEIGHT * 0.5 + 0.2, p.pos.z);
      this.scene.add(capMesh);
      this._captureRings.push(capMesh);

      // Downward light shaft into the void
      const beamH = p.pos.y + 22;
      const beamGeo = new THREE.CylinderGeometry(0.45, 3.5, beamH, 8, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x2244aa, transparent: true, opacity: 0.07,
        side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(p.pos.x, p.pos.y - beamH / 2, p.pos.z);
      this.scene.add(beam);
      this._platformBeams.push(beam);

      // Per-platform ownership point light
      const ownerLight = new THREE.PointLight(0x6677aa, 0.6, 28);
      ownerLight.position.set(p.pos.x, p.pos.y + 5, p.pos.z);
      this.scene.add(ownerLight);
      this._platformOwnerLights.push(ownerLight);

      // Crystal spire on center platform
      if (p.isCenter) this._addCrystalSpire(p);
    }
  }

  private _addCornerCrystals(platformMesh: THREE.Mesh): void {
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const r   = SB.PLATFORM_RADIUS - 0.65;
      const h   = 0.5 + (i % 3) * 0.2;
      const mat = new THREE.MeshStandardMaterial({
        color: 0x7788bb, emissive: 0x3355aa, emissiveIntensity: 1.1,
        transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.5,
      });
      const cm = new THREE.Mesh(new THREE.ConeGeometry(0.1, h, 5), mat);
      // Local position relative to platform mesh (top face = y=SB.PLATFORM_HEIGHT)
      cm.position.set(Math.cos(ang) * r, SB.PLATFORM_HEIGHT + h / 2, Math.sin(ang) * r);
      platformMesh.add(cm);
    }
  }

  private _addCrystalSpire(p: SolPlatform): void {
    const mat  = new THREE.MeshStandardMaterial({
      color: 0xaaccff, emissive: 0x6699ff, emissiveIntensity: 1.8,
      roughness: 0, metalness: 0.3, transparent: true, opacity: 0.88,
    });
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(1.2, 9, 6), mat);
    mesh.position.set(p.pos.x, p.pos.y + SB.PLATFORM_HEIGHT + 4.5, p.pos.z);
    mesh.castShadow = true;
    this.scene.add(mesh);

    const light = new THREE.PointLight(0x88aaff, 3.0, 38);
    light.position.copy(mesh.position);
    this.scene.add(light);
  }

  // ---------------------------------------------------------------------------
  // Bridges
  // ---------------------------------------------------------------------------

  private _buildBridges(state: SolsticeState): void {
    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a44, emissive: 0x2255bb, emissiveIntensity: 0.9,
      roughness: 0.3, metalness: 0.6, transparent: true, opacity: 0.82,
    });

    const built = new Set<string>();

    for (const p of state.platforms) {
      this._bridgeMeshes[p.id]     = this._bridgeMeshes[p.id]     ?? [];
      this._bridgeGlow[p.id]       = this._bridgeGlow[p.id]       ?? [];
      this._bridgeAnimOffset[p.id] = this._bridgeAnimOffset[p.id] ?? [];

      for (const nid of p.adjacentIds) {
        const key = [Math.min(p.id, nid), Math.max(p.id, nid)].join("-");
        if (built.has(key)) continue;
        built.add(key);

        const a = this._platPositions[p.id].clone();
        const b = this._platPositions[nid].clone();
        a.y += SB.PLATFORM_HEIGHT * 0.5;
        b.y += SB.PLATFORM_HEIGHT * 0.5;

        const curve = bridgeCurve(a, b);

        // Bridge tube
        const tubeMesh = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 24, SB.BRIDGE_RADIUS, 6, false),
          bridgeMat.clone(),
        );
        tubeMesh.castShadow = true;
        this.scene.add(tubeMesh);

        // Glow tube — thin, additive blending
        const glowMat = new THREE.MeshBasicMaterial({
          color: COL.bridgeDay, transparent: true, opacity: 0.65,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const glowMesh = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 20, SB.BRIDGE_RADIUS * 0.6, 5, false),
          glowMat,
        );
        this.scene.add(glowMesh);

        this._bridgeMeshes[p.id].push(tubeMesh);
        this._bridgeMeshes[nid] = this._bridgeMeshes[nid] ?? [];
        this._bridgeMeshes[nid].push(tubeMesh);

        this._bridgeGlow[p.id].push(glowMesh);
        this._bridgeGlow[nid] = this._bridgeGlow[nid] ?? [];
        this._bridgeGlow[nid].push(glowMesh);

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

    const bodyMat = new THREE.MeshStandardMaterial({
      color: col, emissive, emissiveIntensity: 0.65, roughness: 0.4, metalness: 0.4,
    });
    const headMat = new THREE.MeshStandardMaterial({
      color: isPlayer ? 0xffe8aa : 0xaaddff,
      emissive: isPlayer ? 0xffcc44 : 0x4488ff,
      emissiveIntensity: 1.0, roughness: 0.25, metalness: 0.2,
    });

    if (unit.kind === "guardian") {
      const body   = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.42, 0.92, 8), bodyMat);
      body.position.y = 0.46;
      const head   = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), headMat);
      head.position.y = 1.14;
      const shield = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.56, 0.46),
        new THREE.MeshStandardMaterial({ color: col, emissive, emissiveIntensity: 0.5, roughness: 0.5, metalness: 0.6 }),
      );
      shield.position.set(0.38, 0.55, 0.1);
      // Pauldrons
      const pMat = new THREE.MeshStandardMaterial({ color: col, emissive, emissiveIntensity: 0.3, roughness: 0.55, metalness: 0.5 });
      const pL   = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), pMat);
      pL.position.set( 0.36, 0.92, 0);
      const pR   = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), pMat);
      pR.position.set(-0.36, 0.92, 0);
      group.add(body, head, shield, pL, pR);

    } else if (unit.kind === "warden") {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 1.02, 8), bodyMat);
      body.position.y = 0.51;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), headMat);
      head.position.y = 1.19;
      // Quiver
      const quiver = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.55, 6),
        new THREE.MeshStandardMaterial({ color: isPlayer ? 0x885522 : 0x223366, roughness: 0.7 }),
      );
      quiver.position.set(-0.3, 0.65, -0.1);
      quiver.rotation.z = 0.2;

      // Bow group — orientation is preserved as previously established
      const bowGroup = new THREE.Group();
      bowGroup.position.set(0.32, 0.72, 0);
      const bowMat  = new THREE.MeshBasicMaterial({ color: isPlayer ? 0xffdd77 : 0x77ccff });
      const bowArc  = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.038, 6, 20, Math.PI), bowMat);
      bowGroup.add(bowArc);
      bowGroup.rotation.set(Math.PI, Math.PI / 2, Math.PI / 2);

      group.add(body, head, quiver, bowGroup);

    } else {
      // Invoker — robe + staff + orb
      const body  = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.06, 8), bodyMat);
      body.position.y = 0.53;
      const head  = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), headMat);
      head.position.y = 1.22;
      // Hood
      const hoodMat = new THREE.MeshStandardMaterial({
        color: isPlayer ? 0xcc8822 : 0x224488, roughness: 0.7, metalness: 0.1,
      });
      const hood  = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.38, 7), hoodMat);
      hood.position.y = 1.46;
      // Staff
      const staffMat = new THREE.MeshStandardMaterial({
        color: isPlayer ? 0xcc9933 : 0x334488, roughness: 0.55, metalness: 0.3,
      });
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.25, 6), staffMat);
      staff.position.set(0.42, 0.62, 0);
      // Orb
      const orbMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: isPlayer ? 0xffaa00 : 0x0088ff,
        emissiveIntensity: 3.2, roughness: 0, metalness: 0,
      });
      const orb   = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), orbMat);
      orb.position.set(0.42, 1.30, 0);
      group.add(body, head, hood, staff, orb);
    }

    // Ownership ground ring
    const ringMat  = new THREE.MeshBasicMaterial({
      color: col, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.065, 6, 22), ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.03;
    group.add(ringMesh);

    return group;
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(state: SolsticeState, dt: number): void {
    this._auroraTime += dt;

    this._updateSkyAndLighting(state);
    this._updateSunMoon(state);
    this._updateStars(state);
    this._updateAurora(state);
    this._updateMotes(state, dt);
    this._updatePlatforms(state);
    this._updateBridges(state);
    this._updateUnits(state, dt);
    this._updateFlash(state, dt);
    this._updateAlignPulse(state, dt);
    this._updatePlatformFloating(state);

    // Flash plane follows camera near plane
    this._flashMesh.position.copy(this.camera.position);
    this._flashMesh.position.addScaledVector(
      new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion), 1.5,
    );
    this._flashMesh.quaternion.copy(this.camera.quaternion);
    this._flashMesh.scale.set(this._w * 0.02, this._h * 0.02, 1);

    this.renderer.render(this.scene, this.camera);
  }

  private _updateSkyAndLighting(state: SolsticeState): void {
    const t    = state.cycleT;
    const day  = t < SB.DAY_FRACTION;
    const dayF = day ? t / SB.DAY_FRACTION : (t - SB.DAY_FRACTION) / (1 - SB.DAY_FRACTION);

    const rawBlend = day ? 1.0 : 0.0;
    const skyBlend = rawBlend * 0.92 + (day ? dayF * 0.08 : (1 - dayF) * 0.08);

    const skyCol = COL.skyNight.clone().lerp(COL.skyDay, skyBlend);
    (this.scene.background as THREE.Color).copy(skyCol);
    (this.scene.fog as THREE.FogExp2).color.copy(COL.fogNight.clone().lerp(COL.fogDay, skyBlend));

    this._ambientLight.intensity = 0.35 + skyBlend * 0.85;
    this._ambientLight.color.setHex(day ? 0x334466 : 0x111128);
    this._sunLight.intensity  = day ? skyBlend * 2.2 : 0.0;
    this._moonLight.intensity = day ? 0.0 : (1 - skyBlend) * 1.4;
    this._sunPlatformLight.intensity = day ? skyBlend * 1.2 : 0.0;
  }

  private _updateSunMoon(state: SolsticeState): void {
    const sunAngle  = state.cycleT * Math.PI * 2 - Math.PI / 2;
    const moonAngle = sunAngle + Math.PI;
    const R = 130, H = 80;

    this._sunMesh.position.set(
      Math.cos(sunAngle) * R,
      Math.sin(sunAngle) * H + H,
      -20 + Math.sin(sunAngle * 0.5) * 40,
    );
    this._sunLight.position.copy(this._sunMesh.position);

    this._moonMesh.position.set(
      Math.cos(moonAngle) * R,
      Math.sin(moonAngle) * H + H,
      -20 + Math.sin(moonAngle * 0.5) * 40,
    );
    this._moonLight.position.copy(this._moonMesh.position);

    const pulse = Math.sin(Date.now() * 0.001) * 0.05 + 1.0;
    (this._sunGlow.material  as THREE.MeshBasicMaterial).opacity = 0.18 * pulse;
    (this._moonGlow.material as THREE.MeshBasicMaterial).opacity = 0.14 * pulse;
  }

  private _updateStars(state: SolsticeState): void {
    const isDay = state.cycleT < SB.DAY_FRACTION;
    const target = isDay ? 0.0 : 1.0;
    this._starMat.opacity += (target - this._starMat.opacity) * 0.015;

    // Large stars twinkle
    const now = Date.now() * 0.0008;
    const base2 = isDay ? 0.0 : 0.82;
    const twinkle = Math.sin(now) * 0.12;
    this._star2Mat.opacity += (base2 + twinkle - this._star2Mat.opacity) * 0.02;
  }

  private _updateAurora(state: SolsticeState): void {
    const isNight = state.cycleT >= SB.DAY_FRACTION;
    const baseOp  = isNight ? 0.5 : 0.0;
    for (let i = 0; i < this._auroraMeshes.length; i++) {
      const mat  = this._auroraMeshes[i].material as THREE.MeshBasicMaterial;
      const wave = Math.sin(this._auroraTime * 0.38 + i * 1.3) * 0.14 + baseOp;
      mat.opacity += (wave - mat.opacity) * 0.018;
      const hue = 0.42 + Math.sin(this._auroraTime * 0.18 + i * 0.9) * 0.12;
      mat.color.setHSL(hue, 1.0, 0.5);
    }
  }

  private _updateMotes(state: SolsticeState, dt: number): void {
    const isDay = state.cycleT < SB.DAY_FRACTION;
    // Shift mote colour: warm gold by day, cool blue by night
    _C_TMP.setHex(isDay ? 0xffddaa : 0xaaddff);
    this._moteMat.color.lerp(_C_TMP, 0.02);

    const N   = this._motePositions.length / 3;
    const arr = this._motePositions;
    const vel = this._moteVels;
    for (let i = 0; i < N; i++) {
      arr[i * 3]     += vel[i * 3]     * dt;
      arr[i * 3 + 1] += vel[i * 3 + 1] * dt;
      arr[i * 3 + 2] += vel[i * 3 + 2] * dt;
      if (arr[i * 3 + 1] > 55) {
        arr[i * 3 + 1] = 2;
        arr[i * 3]     = (Math.random() - 0.5) * 130;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 130;
      }
    }
    (this._motes.geometry.attributes["position"] as THREE.BufferAttribute).needsUpdate = true;
  }

  private _updatePlatforms(state: SolsticeState): void {
    const now = Date.now();
    for (const p of state.platforms) {
      const targetCol = p.owner === "player" ? COL.player : p.owner === "ai" ? COL.ai : COL.neutral;

      // --- Glow ring ---
      const glowMat = this._platformGlows[p.id].material as THREE.MeshBasicMaterial;
      glowMat.color.setHex(targetCol);
      glowMat.opacity = p.owner !== "neutral"
        ? Math.sin(now * 0.002 + p.id) * 0.18 + 0.68
        : 0.28;

      // --- Capture ring ---
      const capMesh = this._captureRings[p.id];
      const capMat  = capMesh.material as THREE.MeshBasicMaterial;
      const contested = p.captureProgress > 0.05 && p.captureProgress < 0.95;
      capMesh.visible = contested;
      if (contested) {
        capMat.color.setHex(p.captureProgress < 0.5 ? COL.player : COL.ai);
        capMesh.rotation.y += 0.025;
      }

      // --- Platform top emissive (lerp toward owner colour) ---
      const topMat = this._platformTopMats[p.id];
      const emTarget = p.owner === "player" ? _C_PLAYER_EM
                     : p.owner === "ai"     ? _C_AI_EM
                     :                        _C_NEUTRAL_EM;
      topMat.emissive.lerp(emTarget, 0.04);
      topMat.emissiveIntensity = p.owner !== "neutral"
        ? 0.32 + Math.sin(now * 0.0018 + p.id * 0.8) * 0.08
        : 0.04;

      // --- Per-platform ownership light ---
      const ownerLight = this._platformOwnerLights[p.id];
      _C_TMP.setHex(targetCol);
      ownerLight.color.lerp(_C_TMP, 0.06);
      ownerLight.intensity = p.owner !== "neutral"
        ? 0.9 + Math.sin(now * 0.002 + p.id) * 0.2
        : 0.25;

      // --- Downward beam colour ---
      const beamMat = this._platformBeams[p.id].material as THREE.MeshBasicMaterial;
      _C_TMP.setHex(targetCol);
      beamMat.color.lerp(_C_TMP, 0.04);
      beamMat.opacity = 0.05 + Math.sin(now * 0.001 + p.id * 1.1) * 0.02;
    }
  }

  private _updateBridges(state: SolsticeState): void {
    const isDay     = state.cycleT < SB.DAY_FRACTION;
    const bridgeCol = isDay ? COL.bridgeDay : COL.bridgeNight;
    const now       = Date.now();

    const seen = new Set<number>();
    for (const p of state.platforms) {
      for (let i = 0; i < (this._bridgeGlow[p.id]?.length ?? 0); i++) {
        const gm = this._bridgeGlow[p.id][i];
        if (seen.has(gm.id)) continue;
        seen.add(gm.id);
        const mat = gm.material as THREE.MeshBasicMaterial;
        mat.color.setHex(bridgeCol);
        mat.opacity = Math.sin(now * 0.0014 + i * 1.1) * 0.18 + 0.55;
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

        const light = new THREE.PointLight(
          unit.owner === "player" ? 0xffcc44 : 0x44aaff, 1.4, 9,
        );
        this.scene.add(light);
        this._unitLights.set(id, light);
      }
    }

    // Update / remove
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
      mesh.position.y += Math.sin(Date.now() * 0.002 + unit.x) * 0.06;

      if (unit.spawnFlash > 0) {
        mesh.scale.setScalar(1.0 - unit.spawnFlash * 0.6);
      } else {
        mesh.scale.setScalar(1.0);
      }

      if (unit.destPlatId !== null) {
        const dest = this._platPositions[unit.destPlatId];
        const dx = dest.x - unit.x;
        const dz = dest.z - unit.z;
        if (Math.abs(dx) + Math.abs(dz) > 0.1) mesh.rotation.y = Math.atan2(dx, dz);
      }

      const light = this._unitLights.get(id);
      if (light) {
        light.position.set(unit.x, unit.y + 0.8, unit.z);

        // HP-based light colour: team colour → orange → red as HP drops
        const hpFrac = unit.hp / unit.maxHp;
        const lightCol = hpFrac > 0.55
          ? (unit.owner === "player" ? 0xffcc44 : 0x44aaff)
          : hpFrac > 0.28 ? 0xff8822
          :                 0xff2222;
        _C_TMP.setHex(lightCol);
        light.color.lerp(_C_TMP, 0.08);

        const pulse = Math.sin(Date.now() * 0.003 + unit.x * 0.5) * 0.3 + 1.2;
        light.intensity = pulse * (unit.spawnFlash > 0 ? 3.0 : 1.0) * (hpFrac < 0.28 ? 1.6 : 1.0);
      }
    }
  }

  private _updateFlash(state: SolsticeState, dt: number): void {
    const mat = this._flashMesh.material as THREE.MeshBasicMaterial;
    if (state.alignmentFlash > 0) {
      const rel = state.alignmentFlash / SB.ALIGNMENT_FLASH_DURATION;
      mat.opacity = Math.sin(rel * Math.PI) * 0.5;
      mat.color.setHex(state.phase !== "playing" ? 0xffffff : 0xffd966);
    } else {
      mat.opacity = Math.max(0, mat.opacity - dt * 1.5);
    }
  }

  private _updateAlignPulse(state: SolsticeState, dt: number): void {
    // Detect new alignment event (flash timer jumped up)
    if (state.alignmentFlash > 0 && this._prevAlignFlash <= 0) {
      this._alignPulseT = 0;
      this._alignPulseRing.scale.setScalar(1);
      (this._alignPulseRing.material as THREE.MeshBasicMaterial).opacity = 0.7;
    }
    this._prevAlignFlash = state.alignmentFlash;

    if (this._alignPulseT >= 0) {
      this._alignPulseT += dt;
      const s = 1 + this._alignPulseT * 20;   // expand quickly outward
      this._alignPulseRing.scale.setScalar(s);
      const mat = this._alignPulseRing.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.7 - this._alignPulseT * 1.0);
      if (this._alignPulseT > 0.7) {
        this._alignPulseT = -1;
        mat.opacity = 0;
      }
    }
  }

  private _updatePlatformFloating(state: SolsticeState): void {
    const now = Date.now() * 0.001;
    for (const p of state.platforms) {
      const float = Math.sin(now * SB.PLATFORM_FLOAT_SPEED + p.id * 1.2) * SB.PLATFORM_FLOAT_AMP;
      this._platformMeshes[p.id].position.y = p.pos.y + float;
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
  // Raycast
  // ---------------------------------------------------------------------------

  raycastPlatform(clientX: number, clientY: number): number | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc  = new THREE.Vector2(
      ((clientX - rect.left) / rect.width)  *  2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this._raycaster.setFromCamera(ndc, this.camera);
    const hits = this._raycaster.intersectObjects(this._platformHits);
    return hits.length > 0 ? (hits[0].object.userData["platId"] as number) : null;
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
