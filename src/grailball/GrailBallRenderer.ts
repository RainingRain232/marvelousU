// ---------------------------------------------------------------------------
// Grail Ball -- 3D Renderer (Three.js)
// Medieval tournament ground, detailed character models, particles, lighting.
// THIS IS THE MOST IMPORTANT FILE -- rich, detailed 3D scene.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import {
  GBPlayerClass, GBPowerUpType, GBMatchPhase,
  GB_FIELD, GB_CAMERA, GB_PHYSICS,
  type GBTeamDef,
} from "./GrailBallConfig";
import {
  type GBMatchState, type GBPlayer,
  GBPlayerAction,
  getSelectedPlayer,
} from "./GrailBallState";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TAU = Math.PI * 2;
// Crowd constants
const CROWD_ROWS = 4;
const CROWD_PER_SIDE = 60;

// Particle pool sizes
const DUST_POOL = 200;
const MAGIC_POOL = 100;
const GOAL_POOL = 300;

// ---------------------------------------------------------------------------
// GrailBallRenderer
// ---------------------------------------------------------------------------
export class GrailBallRenderer {
  // Three.js core
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _composer!: EffectComposer;
  private _canvas!: HTMLCanvasElement;
  // Camera state
  private _camTarget = new THREE.Vector3();
  private _camPos = new THREE.Vector3(0, GB_CAMERA.DEFAULT_HEIGHT, GB_CAMERA.DEFAULT_DISTANCE);
  private _camShakeOffset = new THREE.Vector3();

  // Scene groups
  private _fieldGroup = new THREE.Group();
  private _environmentGroup = new THREE.Group();
  private _playerGroup = new THREE.Group();
  private _orbGroup = new THREE.Group();
  private _particleGroup = new THREE.Group();
  private _powerUpGroup = new THREE.Group();
  private _crowdGroup = new THREE.Group();
  private _merlinGroup = new THREE.Group();

  // Player meshes indexed by player id
  private _playerMeshes = new Map<number, THREE.Group>();
  private _playerAnimData = new Map<number, PlayerAnimData>();

  // Gate meshes
  private _gates: THREE.Group[] = [];
  private _gateBarriers: THREE.Mesh[] = [];

  // Orb mesh
  private _orbMesh!: THREE.Group;
  private _orbGlow!: THREE.PointLight;
  private _orbTrailParticles!: THREE.Points;
  private _orbTrailPositions!: Float32Array;

  // Particle systems
  private _dustParticles!: THREE.Points;
  private _dustData!: ParticleData[];
  private _magicParticles!: THREE.Points;
  private _magicData!: ParticleData[];
  private _goalParticles!: THREE.Points;
  private _goalData!: ParticleData[];
  private _goalCelebrationActive = false;
  private _goalCelebrationTimer = 0;

  // Crowd animation
  private _crowdBaseY: number[] = [];

  // Lighting
  private _sunLight!: THREE.DirectionalLight;
  private _ambientLight!: THREE.AmbientLight;
  private _torchLights: THREE.PointLight[] = [];
  private _goalLights: THREE.PointLight[] = [];

  // Flags (animated)
  private _flagMeshes: THREE.Mesh[] = [];

  // Power-up meshes
  private _powerUpMeshMap = new Map<number, THREE.Group>();

  // Merlin mesh
  private _merlinMesh!: THREE.Group;

  // Selection ring
  private _selectionRing!: THREE.Mesh;

  // Sky
  private _skyMesh!: THREE.Mesh;

  // Time tracking
  private _time = 0;

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  init(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Canvas
    this._canvas = document.createElement("canvas");
    this._canvas.id = "grailball-canvas";
    this._canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;";
    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._canvas);

    // Renderer
    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.1;

    // Scene
    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(0x87ceeb, 0.003);

    // Camera
    this._camera = new THREE.PerspectiveCamera(55, w / h, 0.5, 500);
    this._camera.position.set(0, GB_CAMERA.DEFAULT_HEIGHT, GB_CAMERA.DEFAULT_DISTANCE);

    // Post-processing
    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(new RenderPass(this._scene, this._camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.3, 0.4, 0.85);
    this._composer.addPass(bloom);
    this._composer.addPass(new OutputPass());

    // Build scene
    this._buildSky();
    this._buildLighting();
    this._buildField();
    this._buildEnvironment();
    this._buildGates();
    this._buildOrb();
    this._buildParticleSystems();
    this._buildSelectionRing();
    this._buildMerlin();

    // Add groups to scene
    this._scene.add(this._fieldGroup);
    this._scene.add(this._environmentGroup);
    this._scene.add(this._playerGroup);
    this._scene.add(this._orbGroup);
    this._scene.add(this._particleGroup);
    this._scene.add(this._powerUpGroup);
    this._scene.add(this._crowdGroup);
    this._scene.add(this._merlinGroup);

    // Resize handler
    window.addEventListener("resize", this._onResize);
  }

  private _onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(w, h);
    this._composer.setSize(w, h);
  };

  // ---------------------------------------------------------------------------
  // Sky
  // ---------------------------------------------------------------------------
  private _buildSky(): void {
    const skyGeo = new THREE.SphereGeometry(200, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x4488cc) },
        bottomColor: { value: new THREE.Color(0xccddee) },
        offset: { value: 10 },
        exponent: { value: 0.4 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h,0.0), exponent), 0.0)), 1.0);
        }
      `,
    });
    this._skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(this._skyMesh);

    // Clouds (simple transparent planes)
    const cloudGeo = new THREE.PlaneGeometry(40, 20);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
    });
    for (let i = 0; i < 12; i++) {
      const cloud = new THREE.Mesh(cloudGeo, cloudMat.clone());
      cloud.position.set(
        (Math.random() - 0.5) * 300,
        60 + Math.random() * 30,
        (Math.random() - 0.5) * 300,
      );
      cloud.rotation.x = -Math.PI / 2;
      cloud.rotation.z = Math.random() * TAU;
      const s = 0.5 + Math.random() * 1.5;
      cloud.scale.set(s, s * 0.6, 1);
      this._scene.add(cloud);
    }
  }

  // ---------------------------------------------------------------------------
  // Lighting
  // ---------------------------------------------------------------------------
  private _buildLighting(): void {
    // Ambient
    this._ambientLight = new THREE.AmbientLight(0x8899aa, 0.5);
    this._scene.add(this._ambientLight);

    // Sun
    this._sunLight = new THREE.DirectionalLight(0xffffee, 1.2);
    this._sunLight.position.set(30, 50, 20);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(2048, 2048);
    this._sunLight.shadow.camera.left = -60;
    this._sunLight.shadow.camera.right = 60;
    this._sunLight.shadow.camera.top = 40;
    this._sunLight.shadow.camera.bottom = -40;
    this._sunLight.shadow.camera.near = 1;
    this._sunLight.shadow.camera.far = 120;
    this._sunLight.shadow.bias = -0.001;
    this._scene.add(this._sunLight);

    // Hemisphere light for sky color bounce
    const hemi = new THREE.HemisphereLight(0x88aacc, 0x445522, 0.4);
    this._scene.add(hemi);

    // Torch lights at field corners
    const torchPositions = [
      [-GB_FIELD.HALF_LENGTH - 3, 6, -GB_FIELD.HALF_WIDTH - 3],
      [-GB_FIELD.HALF_LENGTH - 3, 6, GB_FIELD.HALF_WIDTH + 3],
      [GB_FIELD.HALF_LENGTH + 3, 6, -GB_FIELD.HALF_WIDTH - 3],
      [GB_FIELD.HALF_LENGTH + 3, 6, GB_FIELD.HALF_WIDTH + 3],
      [0, 6, -GB_FIELD.HALF_WIDTH - 3],
      [0, 6, GB_FIELD.HALF_WIDTH + 3],
    ];
    for (const [x, y, z] of torchPositions) {
      const torch = new THREE.PointLight(0xff8833, 0.5, 25, 1.5);
      torch.position.set(x, y, z);
      this._scene.add(torch);
      this._torchLights.push(torch);
    }

    // Goal celebration lights (initially off)
    for (let side = 0; side < 2; side++) {
      const gx = side === 0 ? -GB_FIELD.HALF_LENGTH : GB_FIELD.HALF_LENGTH;
      const gl = new THREE.PointLight(0xffd700, 0, 30, 1);
      gl.position.set(gx, 8, 0);
      this._scene.add(gl);
      this._goalLights.push(gl);
    }
  }

  // ---------------------------------------------------------------------------
  // Field
  // ---------------------------------------------------------------------------
  private _buildField(): void {
    // Grass pitch
    const grassGeo = new THREE.PlaneGeometry(GB_FIELD.LENGTH + 4, GB_FIELD.WIDTH + 4, 32, 32);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x3d8b37,
      roughness: 0.9,
      metalness: 0.0,
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    this._fieldGroup.add(grass);

    // Grass stripes (alternating light/dark)
    for (let i = 0; i < 10; i++) {
      const stripeGeo = new THREE.PlaneGeometry(GB_FIELD.LENGTH / 10, GB_FIELD.WIDTH, 1, 1);
      const stripeMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x3a8a35 : 0x429640,
        roughness: 0.9,
      });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(-GB_FIELD.HALF_LENGTH + (i + 0.5) * (GB_FIELD.LENGTH / 10), 0.01, 0);
      stripe.receiveShadow = true;
      this._fieldGroup.add(stripe);
    }

    // Field lines (white)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });

    // Center line
    const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(0.15, GB_FIELD.WIDTH), lineMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.02;
    this._fieldGroup.add(centerLine);

    // Center circle
    const ccGeo = new THREE.RingGeometry(GB_FIELD.CENTER_CIRCLE_RADIUS - 0.08, GB_FIELD.CENTER_CIRCLE_RADIUS + 0.08, 48);
    const cc = new THREE.Mesh(ccGeo, lineMat.clone());
    cc.rotation.x = -Math.PI / 2;
    cc.position.y = 0.02;
    this._fieldGroup.add(cc);

    // Center dot
    const cdGeo = new THREE.CircleGeometry(0.4, 16);
    const cd = new THREE.Mesh(cdGeo, lineMat.clone());
    cd.rotation.x = -Math.PI / 2;
    cd.position.y = 0.02;
    this._fieldGroup.add(cd);

    // Boundary lines
    const boundaryPositions = [
      // Left/right sidelines
      { x: 0, z: -GB_FIELD.HALF_WIDTH, w: GB_FIELD.LENGTH, h: 0.15 },
      { x: 0, z: GB_FIELD.HALF_WIDTH, w: GB_FIELD.LENGTH, h: 0.15 },
      // Goal lines
      { x: -GB_FIELD.HALF_LENGTH, z: 0, w: 0.15, h: GB_FIELD.WIDTH },
      { x: GB_FIELD.HALF_LENGTH, z: 0, w: 0.15, h: GB_FIELD.WIDTH },
    ];
    for (const bp of boundaryPositions) {
      const bl = new THREE.Mesh(new THREE.PlaneGeometry(bp.w, bp.h), lineMat.clone());
      bl.rotation.x = -Math.PI / 2;
      bl.position.set(bp.x, 0.02, bp.z);
      this._fieldGroup.add(bl);
    }

    // Penalty areas
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1;
      const px = sign * (GB_FIELD.HALF_LENGTH - GB_FIELD.PENALTY_AREA_LENGTH / 2);
      const paGeo = new THREE.EdgesGeometry(
        new THREE.PlaneGeometry(GB_FIELD.PENALTY_AREA_LENGTH, GB_FIELD.PENALTY_AREA_WIDTH)
      );
      const paLine = new THREE.LineSegments(paGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
      paLine.rotation.x = -Math.PI / 2;
      paLine.position.set(px, 0.02, 0);
      this._fieldGroup.add(paLine);
    }

    // Stone boundary walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.8, metalness: 0.1 });
    const wallH = GB_FIELD.BOUNDARY_HEIGHT;
    const wallThick = 0.8;

    // Side walls
    for (const zSign of [-1, 1]) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(GB_FIELD.LENGTH + 8, wallH, wallThick),
        wallMat,
      );
      wall.position.set(0, wallH / 2, zSign * (GB_FIELD.HALF_WIDTH + wallThick / 2 + 1));
      wall.castShadow = true;
      wall.receiveShadow = true;
      this._fieldGroup.add(wall);

      // Stone texture blocks on top
      for (let i = 0; i < 20; i++) {
        const block = new THREE.Mesh(
          new THREE.BoxGeometry(2 + Math.random(), 0.4, wallThick + 0.2),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.1, 0.05, 0.45 + Math.random() * 0.15),
            roughness: 0.9,
          }),
        );
        block.position.set(
          -GB_FIELD.HALF_LENGTH - 2 + i * (GB_FIELD.LENGTH + 8) / 20,
          wallH + 0.2,
          zSign * (GB_FIELD.HALF_WIDTH + wallThick / 2 + 1),
        );
        this._fieldGroup.add(block);
      }
    }

    // End walls (behind goals, with openings for gates)
    for (const xSign of [-1, 1]) {
      // Left section
      const leftSec = new THREE.Mesh(
        new THREE.BoxGeometry(wallThick, wallH, (GB_FIELD.WIDTH - GB_FIELD.GATE_WIDTH) / 2),
        wallMat,
      );
      leftSec.position.set(
        xSign * (GB_FIELD.HALF_LENGTH + wallThick / 2 + 1),
        wallH / 2,
        -(GB_FIELD.GATE_WIDTH / 2 + (GB_FIELD.WIDTH - GB_FIELD.GATE_WIDTH) / 4),
      );
      leftSec.castShadow = true;
      this._fieldGroup.add(leftSec);

      // Right section
      const rightSec = leftSec.clone();
      rightSec.position.z = GB_FIELD.GATE_WIDTH / 2 + (GB_FIELD.WIDTH - GB_FIELD.GATE_WIDTH) / 4;
      this._fieldGroup.add(rightSec);
    }
  }

  // ---------------------------------------------------------------------------
  // Environment: castle walls, towers, stands, banners, torches
  // ---------------------------------------------------------------------------
  private _buildEnvironment(): void {
    const castleMat = new THREE.MeshStandardMaterial({ color: 0x7a7a6e, roughness: 0.85, metalness: 0.05 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x5a5a52, roughness: 0.9, metalness: 0.05 });

    // Corner towers
    const towerPositions = [
      [-GB_FIELD.HALF_LENGTH - 5, -GB_FIELD.HALF_WIDTH - 5],
      [-GB_FIELD.HALF_LENGTH - 5, GB_FIELD.HALF_WIDTH + 5],
      [GB_FIELD.HALF_LENGTH + 5, -GB_FIELD.HALF_WIDTH - 5],
      [GB_FIELD.HALF_LENGTH + 5, GB_FIELD.HALF_WIDTH + 5],
    ];

    for (const [tx, tz] of towerPositions) {
      const tower = this._buildTower(tx, tz, castleMat, darkStoneMat);
      this._environmentGroup.add(tower);
    }

    // Spectator stands
    this._buildSpectatorStands();

    // Banner poles along sidelines
    for (let i = 0; i < 8; i++) {
      const x = -GB_FIELD.HALF_LENGTH + 6 + i * (GB_FIELD.LENGTH - 12) / 7;
      for (const zSign of [-1, 1]) {
        const z = zSign * (GB_FIELD.HALF_WIDTH + 4);
        const pole = this._buildBannerPole(x, z);
        this._environmentGroup.add(pole);
      }
    }

    // Torch sconces on walls
    for (const [tx, _, tz] of [
      [-GB_FIELD.HALF_LENGTH - 3, 0, -GB_FIELD.HALF_WIDTH - 2],
      [-GB_FIELD.HALF_LENGTH - 3, 0, GB_FIELD.HALF_WIDTH + 2],
      [GB_FIELD.HALF_LENGTH + 3, 0, -GB_FIELD.HALF_WIDTH - 2],
      [GB_FIELD.HALF_LENGTH + 3, 0, GB_FIELD.HALF_WIDTH + 2],
      [0, 0, -GB_FIELD.HALF_WIDTH - 2],
      [0, 0, GB_FIELD.HALF_WIDTH + 2],
    ]) {
      const torch = this._buildTorchSconce(tx, tz);
      this._environmentGroup.add(torch);
    }

    // Ground outside field (dirt/stone)
    const groundGeo = new THREE.PlaneGeometry(300, 300);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x6b5b3a, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    this._environmentGroup.add(ground);
  }

  private _buildTower(x: number, z: number, mainMat: THREE.Material, darkMat: THREE.Material): THREE.Group {
    const group = new THREE.Group();
    const r = GB_FIELD.TOWER_RADIUS;
    const h = GB_FIELD.TOWER_HEIGHT;

    // Main cylinder
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, h, 12), mainMat);
    body.position.set(x, h / 2, z);
    body.castShadow = true;
    group.add(body);

    // Crenellations
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * TAU;
      const cx = x + Math.cos(angle) * (r + 0.1);
      const cz = z + Math.sin(angle) * (r + 0.1);
      const cren = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), darkMat);
      cren.position.set(cx, h + 0.6, cz);
      group.add(cren);
    }

    // Conical roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(r + 0.3, 3, 12),
      new THREE.MeshStandardMaterial({ color: 0x8b2020, roughness: 0.7 }),
    );
    roof.position.set(x, h + 2.7, z);
    group.add(roof);

    // Flag on top
    const flagPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 3, 4),
      new THREE.MeshStandardMaterial({ color: 0x333333 }),
    );
    flagPole.position.set(x, h + 5, z);
    group.add(flagPole);

    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 1.2, 8, 4),
      new THREE.MeshStandardMaterial({
        color: 0xdaa520, side: THREE.DoubleSide, roughness: 0.6,
      }),
    );
    flag.position.set(x + 1, h + 5.8, z);
    this._flagMeshes.push(flag);
    group.add(flag);

    // Window slits
    for (let j = 0; j < 3; j++) {
      const angle = (j / 3) * TAU + 0.5;
      const wx = x + Math.cos(angle) * (r + 0.01);
      const wz = z + Math.sin(angle) * (r + 0.01);
      const slit = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, 0.8),
        new THREE.MeshBasicMaterial({ color: 0x111111 }),
      );
      slit.position.set(wx, h * 0.6, wz);
      slit.lookAt(x, h * 0.6, z);
      group.add(slit);
    }

    return group;
  }

  private _buildSpectatorStands(): void {
    const standMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.85 });

    for (const zSign of [-1, 1]) {
      const standGroup = new THREE.Group();
      const baseZ = zSign * (GB_FIELD.HALF_WIDTH + 8);

      for (let row = 0; row < CROWD_ROWS; row++) {
        const rowZ = baseZ + zSign * row * 2.5;
        const rowY = 1 + row * 1.5;

        // Stand platform
        const platform = new THREE.Mesh(
          new THREE.BoxGeometry(GB_FIELD.LENGTH - 10, 0.3, 2.2),
          standMat,
        );
        platform.position.set(0, rowY, rowZ);
        platform.receiveShadow = true;
        standGroup.add(platform);

        // Support beams
        for (let i = 0; i < 6; i++) {
          const bx = -GB_FIELD.HALF_LENGTH + 12 + i * 14;
          const beam = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, rowY, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x664422 }),
          );
          beam.position.set(bx, rowY / 2, rowZ);
          standGroup.add(beam);
        }

        // Crowd (instanced cylinders for bodies, spheres for heads)
        this._buildCrowdRow(standGroup, row, rowY + 0.15, rowZ, zSign);
      }

      // Roof over stands
      const roofMesh = new THREE.Mesh(
        new THREE.BoxGeometry(GB_FIELD.LENGTH - 8, 0.2, CROWD_ROWS * 2.5 + 2),
        new THREE.MeshStandardMaterial({ color: 0x6b3a2a, roughness: 0.8 }),
      );
      roofMesh.position.set(0, 1 + CROWD_ROWS * 1.5 + 2, baseZ + zSign * (CROWD_ROWS - 1) * 1.25);
      standGroup.add(roofMesh);

      this._environmentGroup.add(standGroup);
    }
  }

  private _buildCrowdRow(parent: THREE.Group, row: number, y: number, z: number, _zSign: number): void {
    const count = CROWD_PER_SIDE;
    const bodyGeo = new THREE.CylinderGeometry(0.25, 0.3, 1.2, 6);
    const headGeo = new THREE.SphereGeometry(0.2, 6, 4);

    // Random colors for crowd
    const colors = [0xcc3333, 0x3333cc, 0x33cc33, 0xcccc33, 0xcc33cc, 0x885522, 0x558844, 0xaa6644];

    for (let i = 0; i < count; i++) {
      const px = -GB_FIELD.HALF_LENGTH + 8 + (i / count) * (GB_FIELD.LENGTH - 16);
      const colorIdx = (row * count + i) % colors.length;
      const mat = new THREE.MeshStandardMaterial({ color: colors[colorIdx], roughness: 0.8 });

      // Body
      const body = new THREE.Mesh(bodyGeo, mat);
      body.position.set(px + (Math.random() - 0.5) * 0.5, y + 0.6, z + (Math.random() - 0.5) * 0.3);
      body.castShadow = false;
      parent.add(body);

      // Head (flesh color)
      const head = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: 0xddbb99, roughness: 0.7 }));
      head.position.set(body.position.x, y + 1.35, body.position.z);
      parent.add(head);

      // Store base Y for animation
      this._crowdBaseY.push(y + 0.6);
    }
  }

  private _buildBannerPole(x: number, z: number): THREE.Group {
    const group = new THREE.Group();

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x333333 }),
    );
    pole.position.set(x, 3, z);
    group.add(pole);

    // Banner cloth
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 2.5, 6, 8),
      new THREE.MeshStandardMaterial({
        color: 0xdaa520, side: THREE.DoubleSide,
        roughness: 0.6,
      }),
    );
    banner.position.set(x, 4.5, z + 0.8);
    this._flagMeshes.push(banner);
    group.add(banner);

    // Pole cap
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 4),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.6 }),
    );
    cap.position.set(x, 6, z);
    group.add(cap);

    return group;
  }

  private _buildTorchSconce(x: number, z: number): THREE.Group {
    const group = new THREE.Group();

    // Bracket
    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.8, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 }),
    );
    bracket.position.set(x, 4, z);
    group.add(bracket);

    // Bowl
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.15, 0.3, 8),
      new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.4 }),
    );
    bowl.position.set(x, 4.4, z);
    group.add(bowl);

    // Flame (emissive sphere)
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xff6600 }),
    );
    flame.position.set(x, 4.7, z);
    group.add(flame);

    return group;
  }

  // ---------------------------------------------------------------------------
  // Gates (stone archways with magical barriers)
  // ---------------------------------------------------------------------------
  private _buildGates(): void {
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1;
      const gx = sign * (GB_FIELD.HALF_LENGTH + 1);
      const gate = this._buildSingleGate(gx, side);
      this._gates.push(gate);
      this._fieldGroup.add(gate);
    }
  }

  private _buildSingleGate(x: number, side: number): THREE.Group {
    const group = new THREE.Group();
    const gw = GB_FIELD.GATE_WIDTH;
    const gh = GB_FIELD.GATE_HEIGHT;
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.8, metalness: 0.1 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.85 });

    // Left pillar
    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, gh + 1, 1.2), stoneMat);
    leftPillar.position.set(x, (gh + 1) / 2, -gw / 2 - 0.6);
    leftPillar.castShadow = true;
    group.add(leftPillar);

    // Right pillar
    const rightPillar = leftPillar.clone();
    rightPillar.position.z = gw / 2 + 0.6;
    group.add(rightPillar);

    // Archway top (curved)
    const archCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, gh, -gw / 2 - 0.6),
      new THREE.Vector3(x, gh + 2, -gw / 4),
      new THREE.Vector3(x, gh + 2.5, 0),
      new THREE.Vector3(x, gh + 2, gw / 4),
      new THREE.Vector3(x, gh, gw / 2 + 0.6),
    ]);
    const archGeo = new THREE.TubeGeometry(archCurve, 20, 0.5, 8, false);
    const arch = new THREE.Mesh(archGeo, stoneMat);
    arch.castShadow = true;
    group.add(arch);

    // Decorative keystones
    const keystone = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xdaa520, metalness: 0.4, roughness: 0.5 }),
    );
    keystone.position.set(x, gh + 2.5, 0);
    group.add(keystone);

    // Pillar caps
    for (const pz of [-gw / 2 - 0.6, gw / 2 + 0.6]) {
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.4, 1.6),
        darkMat,
      );
      cap.position.set(x, gh + 1.2, pz);
      group.add(cap);

      // Gargoyle-like decoration
      const gargoyle = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.8, 6),
        new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.9 }),
      );
      gargoyle.position.set(x + (side === 0 ? 0.6 : -0.6), gh + 1, pz);
      gargoyle.rotation.z = side === 0 ? -Math.PI / 4 : Math.PI / 4;
      group.add(gargoyle);
    }

    // Magical barrier (glowing translucent plane)
    const barrierMat = new THREE.MeshBasicMaterial({
      color: 0x44aaff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });
    const barrier = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, gh, gw),
      barrierMat,
    );
    // Rotate so the plane faces the field
    barrier.rotation.y = Math.PI / 2;
    barrier.position.set(x, gh / 2, 0);
    // Scale width along z
    barrier.scale.set(1, 1, 1);
    // Actually, let's make it a proper plane
    const barrierGeo2 = new THREE.PlaneGeometry(gw, gh);
    const barrier2 = new THREE.Mesh(barrierGeo2, barrierMat);
    barrier2.rotation.y = Math.PI / 2;
    barrier2.position.set(x, gh / 2 + 0.5, 0);
    group.add(barrier2);
    this._gateBarriers.push(barrier2);

    // Rune markings around the gate
    for (let i = 0; i < 6; i++) {
      const rune = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.15, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x88ccff }),
      );
      const t = i / 5;
      const runePos = archCurve.getPoint(t);
      rune.position.copy(runePos);
      group.add(rune);
    }

    return group;
  }

  // ---------------------------------------------------------------------------
  // Orb
  // ---------------------------------------------------------------------------
  private _buildOrb(): void {
    this._orbMesh = new THREE.Group();

    // Core sphere
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(GB_PHYSICS.ORB_RADIUS, 24, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffaa00,
        emissiveIntensity: 0.8,
        metalness: 0.6,
        roughness: 0.2,
      }),
    );
    core.castShadow = true;
    this._orbMesh.add(core);

    // Outer glow shell
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(GB_PHYSICS.ORB_RADIUS * 1.4, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffdd44,
        transparent: true,
        opacity: 0.15,
      }),
    );
    this._orbMesh.add(shell);

    // Holy cross etching (thin boxes)
    const etchMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.04, GB_PHYSICS.ORB_RADIUS * 1.6, 0.04), etchMat);
    this._orbMesh.add(v);
    const h = new THREE.Mesh(new THREE.BoxGeometry(GB_PHYSICS.ORB_RADIUS * 1.2, 0.04, 0.04), etchMat);
    h.position.y = GB_PHYSICS.ORB_RADIUS * 0.15;
    this._orbMesh.add(h);

    // Orb glow light
    this._orbGlow = new THREE.PointLight(0xffdd44, 1.5, 12, 1.5);
    this._orbMesh.add(this._orbGlow);

    this._orbGroup.add(this._orbMesh);

    // Trail particles
    const trailCount = 60;
    this._orbTrailPositions = new Float32Array(trailCount * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(this._orbTrailPositions, 3));
    const trailMat = new THREE.PointsMaterial({
      color: 0xffdd44,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    this._orbTrailParticles = new THREE.Points(trailGeo, trailMat);
    this._orbGroup.add(this._orbTrailParticles);
  }

  // ---------------------------------------------------------------------------
  // Particle systems
  // ---------------------------------------------------------------------------
  private _buildParticleSystems(): void {
    // Dust particles
    this._dustData = [];
    const dustPositions = new Float32Array(DUST_POOL * 3);
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    this._dustParticles = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0xccbb99, size: 0.2, transparent: true, opacity: 0.4,
    }));
    for (let i = 0; i < DUST_POOL; i++) {
      this._dustData.push({ alive: false, life: 0, maxLife: 0, pos: [0, 0, 0], vel: [0, 0, 0] });
    }
    this._particleGroup.add(this._dustParticles);

    // Magic spark particles
    this._magicData = [];
    const magicPositions = new Float32Array(MAGIC_POOL * 3);
    const magicGeo = new THREE.BufferGeometry();
    magicGeo.setAttribute("position", new THREE.BufferAttribute(magicPositions, 3));
    this._magicParticles = new THREE.Points(magicGeo, new THREE.PointsMaterial({
      color: 0x88aaff, size: 0.15, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending,
    }));
    for (let i = 0; i < MAGIC_POOL; i++) {
      this._magicData.push({ alive: false, life: 0, maxLife: 0, pos: [0, 0, 0], vel: [0, 0, 0] });
    }
    this._particleGroup.add(this._magicParticles);

    // Goal celebration particles
    this._goalData = [];
    const goalPositions = new Float32Array(GOAL_POOL * 3);
    const goalGeo = new THREE.BufferGeometry();
    goalGeo.setAttribute("position", new THREE.BufferAttribute(goalPositions, 3));
    this._goalParticles = new THREE.Points(goalGeo, new THREE.PointsMaterial({
      color: 0xffd700, size: 0.3, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending,
    }));
    for (let i = 0; i < GOAL_POOL; i++) {
      this._goalData.push({ alive: false, life: 0, maxLife: 0, pos: [0, 0, 0], vel: [0, 0, 0] });
    }
    this._particleGroup.add(this._goalParticles);
  }

  // ---------------------------------------------------------------------------
  // Selection ring
  // ---------------------------------------------------------------------------
  private _buildSelectionRing(): void {
    const ringGeo = new THREE.RingGeometry(1.2, 1.5, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88, transparent: true, opacity: 0.6, side: THREE.DoubleSide,
    });
    this._selectionRing = new THREE.Mesh(ringGeo, ringMat);
    this._selectionRing.rotation.x = -Math.PI / 2;
    this._selectionRing.position.y = 0.05;
    this._scene.add(this._selectionRing);
  }

  // ---------------------------------------------------------------------------
  // Merlin (floating referee)
  // ---------------------------------------------------------------------------
  private _buildMerlin(): void {
    this._merlinMesh = new THREE.Group();

    // Robe (cone)
    const robe = new THREE.Mesh(
      new THREE.ConeGeometry(0.6, 2, 8),
      new THREE.MeshStandardMaterial({ color: 0x3333aa, roughness: 0.6 }),
    );
    robe.position.y = -0.5;
    this._merlinMesh.add(robe);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xddbb99, roughness: 0.7 }),
    );
    head.position.y = 0.7;
    this._merlinMesh.add(head);

    // Hat
    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x2222aa, roughness: 0.6 }),
    );
    hat.position.y = 1.5;
    this._merlinMesh.add(hat);

    // Star on hat
    const star = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xffd700 }),
    );
    star.position.set(0.15, 1.3, 0.15);
    this._merlinMesh.add(star);

    // Beard
    const beard = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.5, 6),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 }),
    );
    beard.position.set(0, 0.3, 0.2);
    this._merlinMesh.add(beard);

    // Glowing aura
    const aura = new THREE.PointLight(0x8888ff, 0.5, 8, 1.5);
    this._merlinMesh.add(aura);

    this._merlinMesh.position.set(0, 12, 0);
    this._merlinGroup.add(this._merlinMesh);
  }

  // ---------------------------------------------------------------------------
  // Player model building (detailed multi-geometry characters)
  // ---------------------------------------------------------------------------

  buildPlayerMesh(player: GBPlayer, teamDef: GBTeamDef): THREE.Group {
    const group = new THREE.Group();
    group.userData = { playerId: player.id };

    switch (player.cls) {
      case GBPlayerClass.KNIGHT:
        this._buildKnightModel(group, teamDef);
        break;
      case GBPlayerClass.ROGUE:
        this._buildRogueModel(group, teamDef);
        break;
      case GBPlayerClass.MAGE:
        this._buildMageModel(group, teamDef);
        break;
      case GBPlayerClass.GATEKEEPER:
        this._buildGatekeeperModel(group, teamDef);
        break;
    }

    group.castShadow = true;
    return group;
  }

  private _buildKnightModel(group: THREE.Group, team: GBTeamDef): void {
    const pri = new THREE.Color(team.primaryColor);
    const sec = new THREE.Color(team.secondaryColor);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.7, roughness: 0.3 });
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.35 });
    const tabardMat = new THREE.MeshStandardMaterial({ color: pri, roughness: 0.6 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xddbb99, roughness: 0.7 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 });

    // Boots
    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.45), bootMat);
    leftBoot.position.set(-0.18, 0.2, 0.05);
    leftBoot.name = "leftFoot";
    group.add(leftBoot);
    const rightBoot = leftBoot.clone();
    rightBoot.position.x = 0.18;
    rightBoot.name = "rightFoot";
    group.add(rightBoot);

    // Greaves (shin armor)
    const leftGreave = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.5, 6), armorMat);
    leftGreave.position.set(-0.18, 0.65, 0);
    leftGreave.name = "leftShin";
    group.add(leftGreave);
    const rightGreave = leftGreave.clone();
    rightGreave.position.x = 0.18;
    rightGreave.name = "rightShin";
    group.add(rightGreave);

    // Knee guards
    const leftKnee = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), metalMat);
    leftKnee.position.set(-0.18, 0.9, 0.08);
    group.add(leftKnee);
    const rightKnee = leftKnee.clone();
    rightKnee.position.x = 0.18;
    group.add(rightKnee);

    // Thighs
    const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.45, 6), armorMat);
    leftThigh.position.set(-0.16, 1.15, 0);
    leftThigh.name = "leftThigh";
    group.add(leftThigh);
    const rightThigh = leftThigh.clone();
    rightThigh.position.x = 0.16;
    rightThigh.name = "rightThigh";
    group.add(rightThigh);

    // Waist / belt
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.15, 8), new THREE.MeshStandardMaterial({ color: 0x442200, roughness: 0.8 }));
    belt.position.y = 1.38;
    group.add(belt);

    // Torso (chest armor)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.35), armorMat);
    torso.position.y = 1.7;
    torso.name = "torso";
    group.add(torso);

    // Tabard (team color cloth over chest)
    const tabard = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.01), tabardMat);
    tabard.position.set(0, 1.7, 0.19);
    group.add(tabard);

    // Tabard back
    const tabardBack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.01), tabardMat);
    tabardBack.position.set(0, 1.7, -0.19);
    group.add(tabardBack);

    // Pauldrons (shoulder armor)
    const leftPauldron = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4), metalMat);
    leftPauldron.scale.set(1.3, 0.8, 1);
    leftPauldron.position.set(-0.38, 1.95, 0);
    group.add(leftPauldron);
    const rightPauldron = leftPauldron.clone();
    rightPauldron.position.x = 0.38;
    group.add(rightPauldron);

    // Upper arms
    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.35, 6), armorMat);
    leftUpperArm.position.set(-0.4, 1.72, 0);
    leftUpperArm.name = "leftUpperArm";
    group.add(leftUpperArm);
    const rightUpperArm = leftUpperArm.clone();
    rightUpperArm.position.x = 0.4;
    rightUpperArm.name = "rightUpperArm";
    group.add(rightUpperArm);

    // Gauntlets (forearms)
    const leftGauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), metalMat);
    leftGauntlet.position.set(-0.42, 1.42, 0);
    leftGauntlet.name = "leftHand";
    group.add(leftGauntlet);
    const rightGauntlet = leftGauntlet.clone();
    rightGauntlet.position.x = 0.42;
    rightGauntlet.name = "rightHand";
    group.add(rightGauntlet);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.15, 6), skinMat);
    neck.position.y = 2.07;
    group.add(neck);

    // Greathelm (box-like with visor slit)
    const helm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.38, 0.32), metalMat);
    helm.position.y = 2.35;
    helm.name = "head";
    group.add(helm);

    // Visor slit
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.01), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    visor.position.set(0, 2.35, 0.17);
    group.add(visor);

    // Helm crest
    const crest = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.2, 0.25),
      new THREE.MeshStandardMaterial({ color: sec, roughness: 0.5 }),
    );
    crest.position.set(0, 2.6, 0);
    group.add(crest);

    // Shield (on left arm)
    const shield = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.5, 0.35),
      new THREE.MeshStandardMaterial({ color: sec, metalness: 0.3, roughness: 0.5 }),
    );
    shield.position.set(-0.55, 1.6, 0);
    shield.name = "shield";
    group.add(shield);

    // Shield emblem (small sphere)
    const emblem = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshStandardMaterial({ color: pri, metalness: 0.5 }));
    emblem.position.set(-0.58, 1.6, 0);
    group.add(emblem);
  }

  private _buildRogueModel(group: THREE.Group, team: GBTeamDef): void {
    const pri = new THREE.Color(team.primaryColor);
    const sec = new THREE.Color(team.secondaryColor);
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.75 });
    const darkLeather = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.8 });
    const clothMat = new THREE.MeshStandardMaterial({ color: pri, roughness: 0.7 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xddbb99, roughness: 0.7 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.6, roughness: 0.4 });

    // Boots (lighter, more agile looking)
    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, 0.4), darkLeather);
    leftBoot.position.set(-0.14, 0.18, 0.03);
    leftBoot.name = "leftFoot";
    group.add(leftBoot);
    const rightBoot = leftBoot.clone();
    rightBoot.position.x = 0.14;
    rightBoot.name = "rightFoot";
    group.add(rightBoot);

    // Legs (slender)
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 6), leatherMat);
    leftLeg.position.set(-0.14, 0.8, 0);
    leftLeg.name = "leftShin";
    group.add(leftLeg);
    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.14;
    rightLeg.name = "rightShin";
    group.add(rightLeg);

    // Thighs
    const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.35, 6), leatherMat);
    leftThigh.position.set(-0.13, 1.15, 0);
    leftThigh.name = "leftThigh";
    group.add(leftThigh);
    const rightThigh = leftThigh.clone();
    rightThigh.position.x = 0.13;
    rightThigh.name = "rightThigh";
    group.add(rightThigh);

    // Belt with pouches
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.1, 8), darkLeather);
    belt.position.y = 1.35;
    group.add(belt);
    // Pouch
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.08), darkLeather);
    pouch.position.set(0.18, 1.35, 0.05);
    group.add(pouch);

    // Torso (lean)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.5, 0.28), leatherMat);
    torso.position.y = 1.62;
    torso.name = "torso";
    group.add(torso);

    // Chest strap (cross-body)
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.01), darkLeather);
    strap.position.set(0.05, 1.65, 0.15);
    strap.rotation.z = 0.3;
    group.add(strap);

    // Light shoulder pads
    const leftPad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.18), leatherMat);
    leftPad.position.set(-0.28, 1.88, 0);
    group.add(leftPad);
    const rightPad = leftPad.clone();
    rightPad.position.x = 0.28;
    group.add(rightPad);

    // Arms
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.55, 6), leatherMat);
    leftArm.position.set(-0.3, 1.55, 0);
    leftArm.name = "leftUpperArm";
    group.add(leftArm);
    const rightArm = leftArm.clone();
    rightArm.position.x = 0.3;
    rightArm.name = "rightUpperArm";
    group.add(rightArm);

    // Hands (wrapped)
    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), darkLeather);
    leftHand.position.set(-0.3, 1.22, 0);
    leftHand.name = "leftHand";
    group.add(leftHand);
    const rightHand = leftHand.clone();
    rightHand.position.x = 0.3;
    rightHand.name = "rightHand";
    group.add(rightHand);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 6), skinMat);
    neck.position.y = 1.93;
    group.add(neck);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), skinMat);
    head.position.y = 2.15;
    head.name = "head";
    group.add(head);

    // Hood
    const hoodOuter = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 8, 6, 0, TAU, 0, Math.PI * 0.6),
      clothMat,
    );
    hoodOuter.position.y = 2.18;
    hoodOuter.rotation.x = -0.2;
    group.add(hoodOuter);

    // Hood drape
    const hoodBack = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 0.3),
      new THREE.MeshStandardMaterial({ color: pri, side: THREE.DoubleSide, roughness: 0.7 }),
    );
    hoodBack.position.set(0, 2.0, -0.15);
    hoodBack.rotation.x = 0.3;
    group.add(hoodBack);

    // Eyes (small dark spots)
    for (const xOff of [-0.06, 0.06]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), new THREE.MeshBasicMaterial({ color: 0x222222 }));
      eye.position.set(xOff, 2.17, 0.16);
      group.add(eye);
    }

    // Daggers on belt
    for (const side of [-1, 1]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.02), metalMat);
      blade.position.set(side * 0.2, 1.2, -0.1);
      blade.rotation.z = side * 0.2;
      group.add(blade);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 4), darkLeather);
      handle.position.set(side * 0.2, 1.32, -0.1);
      group.add(handle);
    }

    // Cloak (team color, trailing behind)
    const cloak = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.8, 4, 6),
      new THREE.MeshStandardMaterial({ color: sec, side: THREE.DoubleSide, roughness: 0.65 }),
    );
    cloak.position.set(0, 1.5, -0.2);
    cloak.name = "cloak";
    group.add(cloak);
  }

  private _buildMageModel(group: THREE.Group, team: GBTeamDef): void {
    const pri = new THREE.Color(team.primaryColor);
    const sec = new THREE.Color(team.secondaryColor);
    const acc = new THREE.Color(team.accentColor);
    const robeMat = new THREE.MeshStandardMaterial({ color: pri, roughness: 0.65 });
    const innerRobe = new THREE.MeshStandardMaterial({ color: sec, roughness: 0.7 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xddbb99, roughness: 0.7 });
    const glowMat = new THREE.MeshBasicMaterial({ color: acc });

    // Sandals
    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.35), new THREE.MeshStandardMaterial({ color: 0x664433, roughness: 0.85 }));
    leftFoot.position.set(-0.12, 0.05, 0.03);
    leftFoot.name = "leftFoot";
    group.add(leftFoot);
    const rightFoot = leftFoot.clone();
    rightFoot.position.x = 0.12;
    rightFoot.name = "rightFoot";
    group.add(rightFoot);

    // Robe (wide cone for the full robe)
    const robeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.35, 1.5, 8), robeMat);
    robeBody.position.y = 0.8;
    robeBody.name = "torso";
    group.add(robeBody);

    // Inner robe visible at front
    const innerVest = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 1.2), innerRobe);
    innerVest.position.set(0, 0.9, 0.16);
    group.add(innerVest);

    // Belt / sash
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.17, 0.08, 8), new THREE.MeshStandardMaterial({ color: sec, roughness: 0.6 }));
    sash.position.y = 1.4;
    group.add(sash);

    // Upper robe / chest
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.35, 0.25), robeMat);
    chest.position.y = 1.72;
    group.add(chest);

    // Collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.12, 8), robeMat);
    collar.position.y = 1.93;
    group.add(collar);

    // Sleeves (wide, drooping)
    for (const xSign of [-1, 1]) {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.15, 0.6, 6), robeMat);
      sleeve.position.set(xSign * 0.32, 1.55, 0);
      sleeve.rotation.z = xSign * 0.3;
      sleeve.name = xSign === -1 ? "leftUpperArm" : "rightUpperArm";
      group.add(sleeve);

      // Glowing hand
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), skinMat);
      hand.position.set(xSign * 0.42, 1.3, 0);
      hand.name = xSign === -1 ? "leftHand" : "rightHand";
      group.add(hand);

      // Magic glow around hands
      const handGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 4),
        new THREE.MeshBasicMaterial({ color: acc, transparent: true, opacity: 0.3 }),
      );
      handGlow.position.set(xSign * 0.42, 1.3, 0);
      handGlow.name = xSign === -1 ? "leftGlow" : "rightGlow";
      group.add(handGlow);
    }

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), skinMat);
    head.position.y = 2.1;
    head.name = "head";
    group.add(head);

    // Pointed hat
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 8), robeMat);
    hat.position.y = 2.55;
    group.add(hat);

    // Hat brim
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.04, 8), robeMat);
    brim.position.y = 2.22;
    group.add(brim);

    // Stars on hat
    for (let i = 0; i < 3; i++) {
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 4), glowMat);
      const angle = (i / 3) * TAU + 0.5;
      star.position.set(Math.cos(angle) * 0.15, 2.4 + i * 0.12, Math.sin(angle) * 0.15);
      group.add(star);
    }

    // Eyes
    for (const xOff of [-0.06, 0.06]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), new THREE.MeshBasicMaterial({ color: acc }));
      eye.position.set(xOff, 2.12, 0.15);
      group.add(eye);
    }

    // Beard
    const beard = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.25, 6),
      new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.9 }),
    );
    beard.position.set(0, 1.92, 0.12);
    group.add(beard);

    // Staff (held in right hand)
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 2.2, 6), new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 }));
    staff.position.set(0.5, 1.5, 0);
    staff.name = "staff";
    group.add(staff);

    // Staff crystal
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.1, 0),
      new THREE.MeshStandardMaterial({ color: acc, emissive: acc, emissiveIntensity: 0.5, metalness: 0.3 }),
    );
    crystal.position.set(0.5, 2.65, 0);
    crystal.name = "crystal";
    group.add(crystal);

    // Staff glow
    const staffGlow = new THREE.PointLight(new THREE.Color(acc).getHex(), 0.4, 5, 1.5);
    staffGlow.position.set(0.5, 2.65, 0);
    group.add(staffGlow);
  }

  private _buildGatekeeperModel(group: THREE.Group, team: GBTeamDef): void {
    const pri = new THREE.Color(team.primaryColor);
    const sec = new THREE.Color(team.secondaryColor);
    const heavyMetal = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.7, roughness: 0.3 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.65, roughness: 0.35 });
    const tabardMat = new THREE.MeshStandardMaterial({ color: pri, roughness: 0.6 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x444433, roughness: 0.8 });

    // Scale up (gatekeepers are bigger)
    const s = 1.15;

    // Heavy boots
    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.35 * s, 0.45 * s, 0.5 * s), bootMat);
    leftBoot.position.set(-0.22 * s, 0.22 * s, 0.05);
    leftBoot.name = "leftFoot";
    group.add(leftBoot);
    const rightBoot = leftBoot.clone();
    rightBoot.position.x = 0.22 * s;
    rightBoot.name = "rightFoot";
    group.add(rightBoot);

    // Heavy greaves
    const leftGreave = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.16 * s, 0.55 * s, 8), heavyMetal);
    leftGreave.position.set(-0.2 * s, 0.72 * s, 0);
    leftGreave.name = "leftShin";
    group.add(leftGreave);
    const rightGreave = leftGreave.clone();
    rightGreave.position.x = 0.2 * s;
    rightGreave.name = "rightShin";
    group.add(rightGreave);

    // Thigh armor
    const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.14 * s, 0.45 * s, 8), heavyMetal);
    leftThigh.position.set(-0.18 * s, 1.2 * s, 0);
    leftThigh.name = "leftThigh";
    group.add(leftThigh);
    const rightThigh = leftThigh.clone();
    rightThigh.position.x = 0.18 * s;
    rightThigh.name = "rightThigh";
    group.add(rightThigh);

    // Heavy belt
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.25 * s, 0.18 * s, 8), darkMetal);
    belt.position.y = 1.45 * s;
    group.add(belt);

    // Massive torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7 * s, 0.65 * s, 0.4 * s), heavyMetal);
    torso.position.y = 1.8 * s;
    torso.name = "torso";
    group.add(torso);

    // Chest plate rivet details
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), darkMetal);
        rivet.position.set(
          (c - 1) * 0.15 * s,
          (1.55 + r * 0.15) * s,
          0.21 * s,
        );
        group.add(rivet);
      }
    }

    // Tabard
    const tabard = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.6 * s, 0.01), tabardMat);
    tabard.position.set(0, 1.8 * s, 0.21 * s);
    group.add(tabard);

    // Massive pauldrons
    const leftPauldron = new THREE.Mesh(new THREE.SphereGeometry(0.22 * s, 8, 6), heavyMetal);
    leftPauldron.scale.set(1.3, 0.7, 1.1);
    leftPauldron.position.set(-0.48 * s, 2.1 * s, 0);
    group.add(leftPauldron);
    const rightPauldron = leftPauldron.clone();
    rightPauldron.position.x = 0.48 * s;
    group.add(rightPauldron);

    // Pauldron spikes
    for (const xSign of [-1, 1]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 4), darkMetal);
      spike.position.set(xSign * 0.55 * s, 2.25 * s, 0);
      group.add(spike);
    }

    // Arms
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.12 * s, 0.5 * s, 6), heavyMetal);
    leftArm.position.set(-0.5 * s, 1.75 * s, 0);
    leftArm.name = "leftUpperArm";
    group.add(leftArm);
    const rightArm = leftArm.clone();
    rightArm.position.x = 0.5 * s;
    rightArm.name = "rightUpperArm";
    group.add(rightArm);

    // Heavy gauntlets
    const leftGauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.14 * s, 0.3 * s, 0.14 * s), darkMetal);
    leftGauntlet.position.set(-0.52 * s, 1.4 * s, 0);
    leftGauntlet.name = "leftHand";
    group.add(leftGauntlet);
    const rightGauntlet = leftGauntlet.clone();
    rightGauntlet.position.x = 0.52 * s;
    rightGauntlet.name = "rightHand";
    group.add(rightGauntlet);

    // Neck gorget
    const gorget = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.16 * s, 0.12 * s, 8), heavyMetal);
    gorget.position.y = 2.18 * s;
    group.add(gorget);

    // Great helm (barrel helm)
    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.22 * s, 0.4 * s, 8), heavyMetal);
    helm.position.y = 2.45 * s;
    helm.name = "head";
    group.add(helm);

    // Helm flat top
    const helmTop = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.2 * s, 0.04 * s, 8), darkMetal);
    helmTop.position.y = 2.65 * s;
    group.add(helmTop);

    // Visor slit
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.25 * s, 0.03, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x111111 }),
    );
    visor.position.set(0, 2.45 * s, 0.22 * s);
    group.add(visor);

    // Breathing holes
    for (let i = 0; i < 5; i++) {
      const hole = new THREE.Mesh(
        new THREE.CircleGeometry(0.01, 4),
        new THREE.MeshBasicMaterial({ color: 0x111111 }),
      );
      hole.position.set((i - 2) * 0.04, 2.38 * s, 0.23 * s);
      group.add(hole);
    }

    // TOWER SHIELD (massive, on left side)
    const towerShield = new THREE.Group();
    const shieldBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.2 * s, 0.7 * s),
      new THREE.MeshStandardMaterial({ color: sec, metalness: 0.3, roughness: 0.5 }),
    );
    towerShield.add(shieldBody);

    // Shield cross
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.8 * s, 0.06), new THREE.MeshStandardMaterial({ color: pri, metalness: 0.4 }));
    crossV.position.z = 0;
    crossV.position.x = 0.05;
    towerShield.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.06, 0.5 * s), new THREE.MeshStandardMaterial({ color: pri, metalness: 0.4 }));
    crossH.position.set(0.05, 0.1, 0);
    towerShield.add(crossH);

    // Shield boss
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), heavyMetal);
    boss.position.set(0.05, 0, 0);
    towerShield.add(boss);

    // Shield rim
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.35 * s, 0.02, 4, 12),
      darkMetal,
    );
    rim.position.x = 0.05;
    rim.rotation.y = Math.PI / 2;
    rim.scale.y = 1.7;
    towerShield.add(rim);

    towerShield.position.set(-0.7 * s, 1.6 * s, 0);
    towerShield.name = "shield";
    group.add(towerShield);
  }

  // ---------------------------------------------------------------------------
  // Ensure player meshes exist
  // ---------------------------------------------------------------------------
  ensurePlayerMeshes(state: GBMatchState): void {
    for (const p of state.players) {
      if (!this._playerMeshes.has(p.id)) {
        const teamDef = state.teamDefs[p.teamIndex];
        const mesh = this.buildPlayerMesh(p, teamDef);
        this._playerMeshes.set(p.id, mesh);
        this._playerGroup.add(mesh);

        this._playerAnimData.set(p.id, {
          runPhase: 0,
          targetBlend: 0,
          currentBlend: 0,
          prevAction: GBPlayerAction.IDLE,
          breathPhase: Math.random() * TAU,
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Power-up meshes
  // ---------------------------------------------------------------------------
  private _buildPowerUpMesh(type: GBPowerUpType): THREE.Group {
    const group = new THREE.Group();
    const color = type === GBPowerUpType.SPEED_BOOST ? 0x4488ff
      : type === GBPowerUpType.STRENGTH ? 0xff4444 : 0xaa44ff;

    // Crystal shape
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5, 0),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, metalness: 0.4, roughness: 0.3 }),
    );
    group.add(crystal);

    // Glow
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 8, 6),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15 }),
    );
    group.add(glow);

    // Light
    const light = new THREE.PointLight(color, 0.5, 8, 1.5);
    group.add(light);

    return group;
  }

  // ---------------------------------------------------------------------------
  // UPDATE (called each frame)
  // ---------------------------------------------------------------------------
  update(state: GBMatchState, dt: number): void {
    this._time += dt;

    this.ensurePlayerMeshes(state);
    this._updateCamera(state, dt);
    this._updatePlayers(state, dt);
    this._updateOrb(state, dt);
    this._updatePowerUps(state, dt);
    this._updateMerlin(state, dt);
    this._updateParticles(dt);
    this._updateFlags(dt);
    this._updateGateBarriers(state, dt);
    this._updateLighting(state, dt);
    this._updateGoalCelebration(state, dt);
    this._updateSelectionRing(state);

    // Render
    this._composer.render();
  }

  // ---------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------
  private _updateCamera(state: GBMatchState, _dt: number): void {
    // Target: follow the orb, but bias toward selected player
    const orbPos = state.orb.pos;
    const sel = getSelectedPlayer(state);
    const targetX = orbPos.x * 0.6 + (sel ? sel.pos.x * 0.4 : 0);
    const targetZ = orbPos.z * 0.6 + (sel ? sel.pos.z * 0.4 : 0);

    this._camTarget.set(targetX, 0, targetZ);

    // Smooth camera follow
    const smooth = GB_CAMERA.FOLLOW_SMOOTHING;

    // During goal celebration, zoom in
    let height = GB_CAMERA.DEFAULT_HEIGHT;
    let distance = GB_CAMERA.DEFAULT_DISTANCE;
    if (state.phase === GBMatchPhase.GOAL_SCORED) {
      height = GB_CAMERA.GOAL_ZOOM_HEIGHT;
      distance = GB_CAMERA.GOAL_ZOOM_DISTANCE;
    }

    this._camPos.x += (this._camTarget.x - this._camPos.x) * smooth;
    this._camPos.y += (height - this._camPos.y) * smooth * 0.5;
    this._camPos.z += (this._camTarget.z + distance - this._camPos.z) * smooth;

    // Camera shake
    if (state.cameraShake > 0.01) {
      this._camShakeOffset.set(
        (Math.random() - 0.5) * state.cameraShake * 2,
        (Math.random() - 0.5) * state.cameraShake,
        (Math.random() - 0.5) * state.cameraShake,
      );
    } else {
      this._camShakeOffset.set(0, 0, 0);
    }

    this._camera.position.set(
      this._camPos.x + this._camShakeOffset.x,
      this._camPos.y + this._camShakeOffset.y,
      this._camPos.z + this._camShakeOffset.z,
    );
    this._camera.lookAt(this._camTarget);
  }

  // ---------------------------------------------------------------------------
  // Player animation & positioning
  // ---------------------------------------------------------------------------
  private _updatePlayers(state: GBMatchState, dt: number): void {
    for (const p of state.players) {
      const mesh = this._playerMeshes.get(p.id);
      if (!mesh) continue;
      const anim = this._playerAnimData.get(p.id)!;

      // Position
      mesh.position.set(p.pos.x, p.pos.y, p.pos.z);

      // Facing
      mesh.rotation.y = -p.facing + Math.PI / 2;

      // Run animation
      const speed = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
      const isRunning = speed > 0.5;

      if (isRunning) {
        anim.runPhase += dt * speed * 0.8;
        anim.targetBlend = 1;
      } else {
        anim.targetBlend = 0;
      }

      // Smooth blend
      anim.currentBlend += (anim.targetBlend - anim.currentBlend) * 0.1;

      // Breathing
      anim.breathPhase += dt * 2;

      // Apply skeletal-like animation
      this._animatePlayer(mesh, p, anim, dt);

      // Spawn dust when running
      if (isRunning && Math.random() < speed * 0.05) {
        this._spawnDust(p.pos.x, 0.1, p.pos.z);
      }

      // Spawn magic particles for mages
      if (p.cls === GBPlayerClass.MAGE && p.action === GBPlayerAction.CASTING) {
        this._spawnMagicSpark(p.pos.x, p.pos.y + 1.5, p.pos.z);
      }
    }
  }

  private _animatePlayer(mesh: THREE.Group, player: GBPlayer, anim: PlayerAnimData, _dt: number): void {
    const blend = anim.currentBlend;
    const phase = anim.runPhase;

    // Find named parts
    mesh.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const name = child.name;

      // Run cycle: legs swing, arms swing opposite
      const legSwing = Math.sin(phase) * 0.4 * blend;
      const armSwing = Math.sin(phase + Math.PI) * 0.3 * blend;

      switch (name) {
        case "leftFoot":
        case "leftShin":
          child.position.y += Math.abs(Math.sin(phase)) * 0.15 * blend;
          child.position.x += Math.sin(phase) * 0.08 * blend;
          break;
        case "rightFoot":
        case "rightShin":
          child.position.y += Math.abs(Math.sin(phase + Math.PI)) * 0.15 * blend;
          child.position.x += Math.sin(phase + Math.PI) * 0.08 * blend;
          break;
        case "leftThigh":
          child.rotation.x = legSwing;
          break;
        case "rightThigh":
          child.rotation.x = -legSwing;
          break;
        case "leftUpperArm":
        case "leftHand":
          child.rotation.x = -armSwing;
          break;
        case "rightUpperArm":
        case "rightHand":
          child.rotation.x = armSwing;
          break;
        case "torso":
          // Breathing + slight lean when running
          child.scale.y = 1 + Math.sin(anim.breathPhase) * 0.008;
          child.rotation.x = blend * 0.1; // lean forward when running
          break;
        case "head":
          // Slight bob
          child.position.y += Math.sin(phase * 2) * 0.02 * blend;
          break;
      }

      // Celebration: arm raise
      if (player.action === GBPlayerAction.CELEBRATING) {
        if (name === "leftUpperArm" || name === "rightUpperArm") {
          child.rotation.z = Math.sin(this._time * 5) * 0.5;
        }
      }

      // Stunned: wobble
      if (player.action === GBPlayerAction.STUNNED) {
        if (name === "torso" || name === "head") {
          child.rotation.z = Math.sin(this._time * 10) * 0.15;
        }
      }

      // Throwing: arm forward
      if (player.action === GBPlayerAction.THROWING) {
        if (name === "rightUpperArm" || name === "rightHand") {
          child.rotation.x = -1.2;
        }
      }

      // Tackling: lean forward
      if (player.action === GBPlayerAction.TACKLING) {
        if (name === "torso") {
          child.rotation.x = 0.4;
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Orb
  // ---------------------------------------------------------------------------
  private _updateOrb(state: GBMatchState, dt: number): void {
    const orb = state.orb;
    this._orbMesh.position.set(orb.pos.x, orb.pos.y, orb.pos.z);

    // Rotate the orb
    this._orbMesh.rotation.x += dt * 2;
    this._orbMesh.rotation.y += dt * 3;

    // Glow pulsing
    const glowPulse = 1 + Math.sin(this._time * 4) * 0.3;
    this._orbGlow.intensity = orb.glowIntensity * glowPulse;

    // Update trail
    const trail = orb.trail;
    for (let i = 0; i < this._orbTrailPositions.length / 3; i++) {
      if (i < trail.length) {
        this._orbTrailPositions[i * 3] = trail[i].x;
        this._orbTrailPositions[i * 3 + 1] = trail[i].y;
        this._orbTrailPositions[i * 3 + 2] = trail[i].z;
      } else {
        this._orbTrailPositions[i * 3] = orb.pos.x;
        this._orbTrailPositions[i * 3 + 1] = orb.pos.y;
        this._orbTrailPositions[i * 3 + 2] = orb.pos.z;
      }
    }
    (this._orbTrailParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  // ---------------------------------------------------------------------------
  // Power-ups
  // ---------------------------------------------------------------------------
  private _updatePowerUps(state: GBMatchState, dt: number): void {
    // Remove old meshes
    for (const [id, mesh] of this._powerUpMeshMap) {
      if (!state.powerUps.find(p => p.id === id && p.active)) {
        this._powerUpGroup.remove(mesh);
        this._powerUpMeshMap.delete(id);
      }
    }

    // Add/update
    for (const pu of state.powerUps) {
      if (!pu.active) continue;

      let mesh = this._powerUpMeshMap.get(pu.id);
      if (!mesh) {
        mesh = this._buildPowerUpMesh(pu.type);
        this._powerUpMeshMap.set(pu.id, mesh);
        this._powerUpGroup.add(mesh);
      }

      mesh.position.set(pu.pos.x, 1.5 + Math.sin(this._time * 3 + pu.id) * 0.3, pu.pos.z);
      mesh.rotation.y += dt * 2;
    }
  }

  // ---------------------------------------------------------------------------
  // Merlin
  // ---------------------------------------------------------------------------
  private _updateMerlin(state: GBMatchState, _dt: number): void {
    // Smooth movement
    const target = state.merlinTarget;
    const pos = this._merlinMesh.position;
    pos.x += (target.x - pos.x) * 0.02;
    pos.y += (target.y - pos.y) * 0.02;
    pos.z += (target.z - pos.z) * 0.02;

    // Hover bob
    pos.y += Math.sin(this._time * 1.5) * 0.3;

    // Face the orb
    this._merlinMesh.lookAt(state.orb.pos.x, pos.y, state.orb.pos.z);
  }

  // ---------------------------------------------------------------------------
  // Particles
  // ---------------------------------------------------------------------------
  private _spawnDust(x: number, y: number, z: number): void {
    for (const p of this._dustData) {
      if (!p.alive) {
        p.alive = true;
        p.life = 0;
        p.maxLife = 0.4 + Math.random() * 0.3;
        p.pos = [x + (Math.random() - 0.5) * 0.5, y, z + (Math.random() - 0.5) * 0.5];
        p.vel = [(Math.random() - 0.5) * 1, 1 + Math.random() * 2, (Math.random() - 0.5) * 1];
        break;
      }
    }
  }

  private _spawnMagicSpark(x: number, y: number, z: number): void {
    for (const p of this._magicData) {
      if (!p.alive) {
        p.alive = true;
        p.life = 0;
        p.maxLife = 0.5 + Math.random() * 0.5;
        p.pos = [x + (Math.random() - 0.5) * 1, y + (Math.random() - 0.5) * 0.5, z + (Math.random() - 0.5) * 1];
        p.vel = [(Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3];
        break;
      }
    }
  }

  spawnTackleImpact(x: number, y: number, z: number): void {
    for (let i = 0; i < 15; i++) {
      this._spawnDust(x, y, z);
    }
  }

  spawnGoalExplosion(x: number, y: number, z: number): void {
    this._goalCelebrationActive = true;
    this._goalCelebrationTimer = 3;

    for (const p of this._goalData) {
      p.alive = true;
      p.life = 0;
      p.maxLife = 1.5 + Math.random() * 1.5;
      p.pos = [x, y + 2, z];
      p.vel = [
        (Math.random() - 0.5) * 20,
        5 + Math.random() * 15,
        (Math.random() - 0.5) * 20,
      ];
    }
  }

  private _updateParticles(dt: number): void {
    this._updateParticleSystem(this._dustParticles, this._dustData, dt, -5);
    this._updateParticleSystem(this._magicParticles, this._magicData, dt, 0);
    this._updateParticleSystem(this._goalParticles, this._goalData, dt, -8);
  }

  private _updateParticleSystem(points: THREE.Points, data: ParticleData[], dt: number, gravity: number): void {
    const positions = (points.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;

    for (let i = 0; i < data.length; i++) {
      const p = data[i];
      if (!p.alive) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = -100; // hide
        positions[i * 3 + 2] = 0;
        continue;
      }

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.alive = false;
        continue;
      }

      p.vel[1] += gravity * dt;
      p.pos[0] += p.vel[0] * dt;
      p.pos[1] += p.vel[1] * dt;
      p.pos[2] += p.vel[2] * dt;

      if (p.pos[1] < 0) {
        p.pos[1] = 0;
        p.vel[1] *= -0.3;
      }

      positions[i * 3] = p.pos[0];
      positions[i * 3 + 1] = p.pos[1];
      positions[i * 3 + 2] = p.pos[2];
    }

    (points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  // ---------------------------------------------------------------------------
  // Flags (wind animation)
  // ---------------------------------------------------------------------------
  private _updateFlags(_dt: number): void {
    for (const flag of this._flagMeshes) {
      const geo = flag.geometry as THREE.PlaneGeometry;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const count = pos.count;

      for (let i = 0; i < count; i++) {
        const x = pos.getX(i);
        // Wave based on position along x
        const wave = Math.sin(this._time * 3 + x * 2) * 0.1 * Math.abs(x);
        pos.setZ(i, wave);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }
  }

  // ---------------------------------------------------------------------------
  // Gate barriers
  // ---------------------------------------------------------------------------
  private _updateGateBarriers(state: GBMatchState, _dt: number): void {
    for (let i = 0; i < this._gateBarriers.length; i++) {
      const barrier = this._gateBarriers[i];
      const mat = barrier.material as THREE.MeshBasicMaterial;

      // Pulse opacity
      mat.opacity = 0.15 + Math.sin(this._time * 2 + i) * 0.08;

      // Flash when goal scored
      if (state.phase === GBMatchPhase.GOAL_SCORED && state.lastGoalTeam !== i) {
        mat.opacity = 0.05;
        mat.color.setHex(0xff4444);
      } else {
        mat.color.setHex(0x44aaff);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Lighting updates
  // ---------------------------------------------------------------------------
  private _updateLighting(state: GBMatchState, _dt: number): void {
    // Torches flicker
    for (const torch of this._torchLights) {
      torch.intensity = 0.4 + Math.sin(this._time * 8 + torch.position.x) * 0.15;
    }

    // Goal lights
    for (let i = 0; i < this._goalLights.length; i++) {
      if (state.phase === GBMatchPhase.GOAL_SCORED) {
        this._goalLights[i].intensity = 2 + Math.sin(this._time * 6) * 1;
        this._goalLights[i].color.setHSL((this._time * 0.5) % 1, 1, 0.6);
      } else {
        this._goalLights[i].intensity *= 0.95;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Goal celebration
  // ---------------------------------------------------------------------------
  private _updateGoalCelebration(_state: GBMatchState, dt: number): void {
    if (this._goalCelebrationActive) {
      this._goalCelebrationTimer -= dt;
      if (this._goalCelebrationTimer <= 0) {
        this._goalCelebrationActive = false;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Selection ring
  // ---------------------------------------------------------------------------
  private _updateSelectionRing(state: GBMatchState): void {
    const sel = getSelectedPlayer(state);
    if (sel) {
      this._selectionRing.visible = true;
      this._selectionRing.position.set(sel.pos.x, 0.05, sel.pos.z);
      this._selectionRing.rotation.z = this._time * 2;
      // Pulse
      const pulse = 1 + Math.sin(this._time * 4) * 0.1;
      this._selectionRing.scale.set(pulse, pulse, pulse);
    } else {
      this._selectionRing.visible = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------
  destroy(): void {
    window.removeEventListener("resize", this._onResize);

    // Remove canvas
    if (this._canvas && this._canvas.parentElement) {
      this._canvas.parentElement.removeChild(this._canvas);
    }

    // Dispose Three.js resources
    this._renderer.dispose();
    this._scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    this._playerMeshes.clear();
    this._playerAnimData.clear();
    this._powerUpMeshMap.clear();
  }
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------
interface PlayerAnimData {
  runPhase: number;
  targetBlend: number;
  currentBlend: number;
  prevAction: GBPlayerAction;
  breathPhase: number;
}

interface ParticleData {
  alive: boolean;
  life: number;
  maxLife: number;
  pos: number[];
  vel: number[];
}
