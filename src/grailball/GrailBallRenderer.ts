// Grail Ball -- 3D Renderer (Three.js) -- Enhanced PBR Graphics
// Medieval tournament ground, detailed character models, particles, lighting.
// THIS IS THE MOST IMPORTANT FILE -- rich, detailed 3D scene.

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
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

// Helpers
/** Create a mesh and set its position (Object.assign can't override read-only .position). */
function meshAt(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

// Constants
const TAU = Math.PI * 2;
const CROWD_ROWS = 4;
const CROWD_PER_SIDE = 60;
const DUST_POOL = 200;
const MAGIC_POOL = 100;
const GOAL_POOL = 300;
const FIRE_POOL = 80;
const MIST_POOL = 120;

// Vignette + warm color grading shader
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    darkness: { value: 0.45 },
    offset: { value: 0.9 },
    warmth: { value: 0.08 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float darkness; uniform float offset; uniform float warmth;
    varying vec2 vUv;
    void main(){
      vec4 c=texture2D(tDiffuse,vUv);
      vec2 uv=(vUv-vec2(0.5))*2.0;
      float vig=1.0-smoothstep(offset,offset+0.6,length(uv));
      c.rgb*=mix(1.0,vig,darkness);
      c.r+=warmth*0.6; c.g+=warmth*0.25;
      gl_FragColor=c;
    }`,
};

// GrailBallRenderer
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
  private _ironGateMeshes: THREE.Mesh[] = [];

  // Orb mesh
  private _orbMesh!: THREE.Group;
  private _orbInner!: THREE.Mesh;
  private _orbGlow!: THREE.PointLight;
  private _orbTrailParticles!: THREE.Points;
  private _orbTrailPositions!: Float32Array;
  private _orbHaloParticles!: THREE.Points;
  private _orbHaloPositions!: Float32Array;

  // Particle systems
  private _dustParticles!: THREE.Points;
  private _dustData!: ParticleData[];
  private _magicParticles!: THREE.Points;
  private _magicData!: ParticleData[];
  private _goalParticles!: THREE.Points;
  private _goalData!: ParticleData[];
  private _goalCelebrationActive = false;
  private _goalCelebrationTimer = 0;
  private _fireParticles!: THREE.Points;
  private _fireData!: ParticleData[];
  private _mistParticles!: THREE.Points;
  private _mistData!: ParticleData[];

  // Crowd animation
  private _crowdBaseY: number[] = [];

  // Lighting
  private _sunLight!: THREE.DirectionalLight;
  private _ambientLight!: THREE.AmbientLight;
  private _torchLights: THREE.PointLight[] = [];
  private _goalLights: THREE.PointLight[] = [];
  private _torchSconces: THREE.Vector3[] = [];

  // Flags (animated)
  private _flagMeshes: THREE.Mesh[] = [];
  private _capeMeshes: { mesh: THREE.Mesh; playerId: number }[] = [];

  // Power-up meshes
  private _powerUpMeshMap = new Map<number, THREE.Group>();

  // Merlin mesh
  private _merlinMesh!: THREE.Group;

  // Selection ring
  private _selectionRing!: THREE.Mesh;

  // Sky
  private _skyMesh!: THREE.Mesh;
  private _cloudSprites: THREE.Mesh[] = [];
  private _starField!: THREE.Points;

  // Ability ground circles
  private _abilityCircles: THREE.Mesh[] = [];

  // Time tracking
  private _time = 0;

  // Init
  init(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this._canvas = document.createElement("canvas");
    this._canvas.id = "grailball-canvas";
    this._canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;";
    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._canvas);
    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas, antialias: true, alpha: false, powerPreference: "high-performance",
    });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.15;
    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(0x7a99b8, 0.004);
    this._camera = new THREE.PerspectiveCamera(55, w / h, 0.5, 500);
    this._camera.position.set(0, GB_CAMERA.DEFAULT_HEIGHT, GB_CAMERA.DEFAULT_DISTANCE);
    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(new RenderPass(this._scene, this._camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.4, 0.5, 0.8);
    this._composer.addPass(bloom);
    const vignette = new ShaderPass(VignetteShader);
    this._composer.addPass(vignette);
    this._composer.addPass(new OutputPass());
    this._buildSky();
    this._buildLighting();
    this._buildField();
    this._buildEnvironment();
    this._buildGates();
    this._buildOrb();
    this._buildParticleSystems();
    this._buildSelectionRing();
    this._buildMerlin();
    this._scene.add(this._fieldGroup);
    this._scene.add(this._environmentGroup);
    this._scene.add(this._playerGroup);
    this._scene.add(this._orbGroup);
    this._scene.add(this._particleGroup);
    this._scene.add(this._powerUpGroup);
    this._scene.add(this._crowdGroup);
    this._scene.add(this._merlinGroup);
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

  // Procedural Sky with gradient, clouds, stars
  private _buildSky(): void {
    const skyGeo = new THREE.SphereGeometry(220, 40, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x1a2a6c) },
        midColor: { value: new THREE.Color(0x4488cc) },
        horizonColor: { value: new THREE.Color(0xe8825c) },
        bottomColor: { value: new THREE.Color(0x8b5a2b) },
        sunsetColor: { value: new THREE.Color(0xd4547a) },
        offset: { value: 15 },
        exponent: { value: 0.5 },
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
        uniform vec3 topColor, midColor, horizonColor, bottomColor, sunsetColor;
        uniform float offset, exponent;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos + offset).y;
          vec3 col;
          if (h > 0.3) {
            col = mix(midColor, topColor, smoothstep(0.3, 0.8, h));
          } else if (h > 0.0) {
            col = mix(horizonColor, midColor, smoothstep(0.0, 0.3, h));
            float sunsetBlend = smoothstep(0.0, 0.15, h) * (1.0 - smoothstep(0.15, 0.3, h));
            col = mix(col, sunsetColor, sunsetBlend * 0.4);
          } else {
            col = mix(bottomColor, horizonColor, smoothstep(-0.2, 0.0, h));
          }
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this._skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(this._skyMesh);
    const starCount = 300;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * TAU;
      const phi = Math.acos(0.2 + Math.random() * 0.8); // upper hemisphere
      const r = 200;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    this._starField = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.6, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this._scene.add(this._starField);
    const cloudGeo = new THREE.PlaneGeometry(50, 20);
    for (let i = 0; i < 14; i++) {
      const cloudMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.08, 0.15, 0.85 + Math.random() * 0.15),
        transparent: true, opacity: 0.25 + Math.random() * 0.2,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.position.set(
        (Math.random() - 0.5) * 350,
        55 + Math.random() * 35,
        (Math.random() - 0.5) * 350,
      );
      cloud.rotation.x = -Math.PI / 2;
      cloud.rotation.z = Math.random() * TAU;
      const s = 0.5 + Math.random() * 1.8;
      cloud.scale.set(s, s * 0.5, 1);
      this._cloudSprites.push(cloud);
      this._scene.add(cloud);
    }
  }

  // Enhanced Lighting
  private _buildLighting(): void {
    this._ambientLight = new THREE.AmbientLight(0x6e7f8d, 0.35);
    this._scene.add(this._ambientLight);
    this._sunLight = new THREE.DirectionalLight(0xfff0d0, 1.3);
    this._sunLight.position.set(35, 55, 25);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(2048, 2048);
    this._sunLight.shadow.camera.left = -65;
    this._sunLight.shadow.camera.right = 65;
    this._sunLight.shadow.camera.top = 45;
    this._sunLight.shadow.camera.bottom = -45;
    this._sunLight.shadow.camera.near = 1;
    this._sunLight.shadow.camera.far = 130;
    this._sunLight.shadow.bias = -0.001;
    this._sunLight.shadow.normalBias = 0.02;
    this._scene.add(this._sunLight);
    const hemi = new THREE.HemisphereLight(0x88bbdd, 0x3d5522, 0.5);
    this._scene.add(hemi);
    const torchPositions: [number, number, number][] = [
      [-GB_FIELD.HALF_LENGTH - 3, 6, -GB_FIELD.HALF_WIDTH - 3],
      [-GB_FIELD.HALF_LENGTH - 3, 6, GB_FIELD.HALF_WIDTH + 3],
      [GB_FIELD.HALF_LENGTH + 3, 6, -GB_FIELD.HALF_WIDTH - 3],
      [GB_FIELD.HALF_LENGTH + 3, 6, GB_FIELD.HALF_WIDTH + 3],
      [0, 6, -GB_FIELD.HALF_WIDTH - 3],
      [0, 6, GB_FIELD.HALF_WIDTH + 3],
      [-GB_FIELD.HALF_LENGTH / 2, 6, -GB_FIELD.HALF_WIDTH - 3],
      [GB_FIELD.HALF_LENGTH / 2, 6, GB_FIELD.HALF_WIDTH + 3],
    ];
    for (const [x, y, z] of torchPositions) {
      const torch = new THREE.PointLight(0xff7722, 0.6, 28, 1.5);
      torch.position.set(x, y, z);
      torch.castShadow = false;
      this._scene.add(torch);
      this._torchLights.push(torch);
      this._torchSconces.push(new THREE.Vector3(x, y, z));
    }
    for (let side = 0; side < 2; side++) {
      const gx = side === 0 ? -GB_FIELD.HALF_LENGTH : GB_FIELD.HALF_LENGTH;
      const gl = new THREE.PointLight(0xffd700, 0, 30, 1);
      gl.position.set(gx, 8, 0);
      this._scene.add(gl);
      this._goalLights.push(gl);
    }
  }

  // Field with grass stripes, glowing field lines, center circle
  private _buildField(): void {
    const segsX = 80, segsZ = 50;
    const grassGeo = new THREE.PlaneGeometry(GB_FIELD.LENGTH + 4, GB_FIELD.WIDTH + 4, segsX, segsZ);
    const colors = new Float32Array((segsX + 1) * (segsZ + 1) * 3);
    const posAttr = grassGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const stripeIdx = Math.floor((x + GB_FIELD.HALF_LENGTH + 2) / (GB_FIELD.LENGTH / 10));
      const dark = stripeIdx % 2 === 0;
      const base = dark ? [0.22, 0.50, 0.20] : [0.26, 0.56, 0.24];
      // Add some random variation
      colors[i * 3] = base[0] + (Math.random() - 0.5) * 0.03;
      colors[i * 3 + 1] = base[1] + (Math.random() - 0.5) * 0.04;
      colors[i * 3 + 2] = base[2] + (Math.random() - 0.5) * 0.03;
    }
    grassGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const grassMat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.85, metalness: 0.0,
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    this._fieldGroup.add(grass);
    const glowLineMat = new THREE.MeshBasicMaterial({
      color: 0xccddff, transparent: true, opacity: 0.55,
    });
    const brightLineMat = new THREE.MeshBasicMaterial({
      color: 0xeeeeff, transparent: true, opacity: 0.7,
    });
    const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(0.18, GB_FIELD.WIDTH), brightLineMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.03;
    this._fieldGroup.add(centerLine);
    const ccGeo = new THREE.RingGeometry(GB_FIELD.CENTER_CIRCLE_RADIUS - 0.1, GB_FIELD.CENTER_CIRCLE_RADIUS + 0.1, 64);
    const cc = new THREE.Mesh(ccGeo, new THREE.MeshBasicMaterial({
      color: 0xaaccff, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
    }));
    cc.rotation.x = -Math.PI / 2;
    cc.position.y = 0.03;
    this._fieldGroup.add(cc);
    const cd = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), brightLineMat);
    cd.rotation.x = -Math.PI / 2;
    cd.position.y = 0.03;
    this._fieldGroup.add(cd);
    const bps = [
      { x: 0, z: -GB_FIELD.HALF_WIDTH, w: GB_FIELD.LENGTH, h: 0.15 },
      { x: 0, z: GB_FIELD.HALF_WIDTH, w: GB_FIELD.LENGTH, h: 0.15 },
      { x: -GB_FIELD.HALF_LENGTH, z: 0, w: 0.15, h: GB_FIELD.WIDTH },
      { x: GB_FIELD.HALF_LENGTH, z: 0, w: 0.15, h: GB_FIELD.WIDTH },
    ];
    for (const bp of bps) {
      const bl = new THREE.Mesh(new THREE.PlaneGeometry(bp.w, bp.h), glowLineMat);
      bl.rotation.x = -Math.PI / 2;
      bl.position.set(bp.x, 0.025, bp.z);
      this._fieldGroup.add(bl);
    }
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1;
      const px = sign * (GB_FIELD.HALF_LENGTH - GB_FIELD.PENALTY_AREA_LENGTH / 2);
      const paGeo = new THREE.EdgesGeometry(
        new THREE.PlaneGeometry(GB_FIELD.PENALTY_AREA_LENGTH, GB_FIELD.PENALTY_AREA_WIDTH)
      );
      const paLine = new THREE.LineSegments(paGeo, new THREE.LineBasicMaterial({
        color: 0xaabbcc, transparent: true, opacity: 0.4,
      }));
      paLine.rotation.x = -Math.PI / 2;
      paLine.position.set(px, 0.025, 0);
      this._fieldGroup.add(paLine);
    }
    const wallMat = new THREE.MeshPhysicalMaterial({
      color: 0x7a7a6a, roughness: 0.85, metalness: 0.08,
    });
    const wallH = GB_FIELD.BOUNDARY_HEIGHT;
    const wallThick = 0.9;
    for (const zSign of [-1, 1]) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(GB_FIELD.LENGTH + 10, wallH, wallThick),
        wallMat,
      );
      wall.position.set(0, wallH / 2, zSign * (GB_FIELD.HALF_WIDTH + wallThick / 2 + 1));
      wall.castShadow = true;
      wall.receiveShadow = true;
      this._fieldGroup.add(wall);
      // Battlements (crenellations on top)
      for (let i = 0; i < 24; i++) {
        const bw = 1.8 + Math.random() * 0.4;
        const block = new THREE.Mesh(
          new THREE.BoxGeometry(bw, 0.6, wallThick + 0.15),
          new THREE.MeshPhysicalMaterial({
            color: new THREE.Color().setHSL(0.1, 0.05, 0.42 + Math.random() * 0.12),
            roughness: 0.9, metalness: 0.05,
          }),
        );
        block.position.set(
          -GB_FIELD.HALF_LENGTH - 3 + i * (GB_FIELD.LENGTH + 10) / 24,
          wallH + 0.3,
          zSign * (GB_FIELD.HALF_WIDTH + wallThick / 2 + 1),
        );
        block.castShadow = true;
        this._fieldGroup.add(block);
      }
    }
    for (const xSign of [-1, 1]) {
      for (const zOff of [-1, 1]) {
        const sec = new THREE.Mesh(
          new THREE.BoxGeometry(wallThick, wallH, (GB_FIELD.WIDTH - GB_FIELD.GATE_WIDTH) / 2),
          wallMat,
        );
        sec.position.set(
          xSign * (GB_FIELD.HALF_LENGTH + wallThick / 2 + 1),
          wallH / 2,
          zOff * (GB_FIELD.GATE_WIDTH / 2 + (GB_FIELD.WIDTH - GB_FIELD.GATE_WIDTH) / 4),
        );
        sec.castShadow = true;
        this._fieldGroup.add(sec);
      }
    }
  }

  // Environment: castle walls, towers, stands, banners, torches
  private _buildEnvironment(): void {
    const castleMat = new THREE.MeshPhysicalMaterial({ color: 0x7a7a6e, roughness: 0.85, metalness: 0.05 });
    const darkStoneMat = new THREE.MeshPhysicalMaterial({ color: 0x5a5a52, roughness: 0.9, metalness: 0.05 });
    const towerPositions: [number, number][] = [
      [-GB_FIELD.HALF_LENGTH - 5, -GB_FIELD.HALF_WIDTH - 5],
      [-GB_FIELD.HALF_LENGTH - 5, GB_FIELD.HALF_WIDTH + 5],
      [GB_FIELD.HALF_LENGTH + 5, -GB_FIELD.HALF_WIDTH - 5],
      [GB_FIELD.HALF_LENGTH + 5, GB_FIELD.HALF_WIDTH + 5],
    ];
    for (const [tx, tz] of towerPositions) {
      this._environmentGroup.add(this._buildTower(tx, tz, castleMat, darkStoneMat));
    }
    this._buildSpectatorStands();
    for (let i = 0; i < 8; i++) {
      const x = -GB_FIELD.HALF_LENGTH + 6 + i * (GB_FIELD.LENGTH - 12) / 7;
      for (const zSign of [-1, 1]) {
        this._environmentGroup.add(this._buildBannerPole(x, zSign * (GB_FIELD.HALF_WIDTH + 4)));
      }
    }
    const sconcePositions: [number, number][] = [
      [-GB_FIELD.HALF_LENGTH - 3, -GB_FIELD.HALF_WIDTH - 2],
      [-GB_FIELD.HALF_LENGTH - 3, GB_FIELD.HALF_WIDTH + 2],
      [GB_FIELD.HALF_LENGTH + 3, -GB_FIELD.HALF_WIDTH - 2],
      [GB_FIELD.HALF_LENGTH + 3, GB_FIELD.HALF_WIDTH + 2],
      [0, -GB_FIELD.HALF_WIDTH - 2],
      [0, GB_FIELD.HALF_WIDTH + 2],
    ];
    for (const [tx, tz] of sconcePositions) {
      this._environmentGroup.add(this._buildTorchSconce(tx, tz));
    }
    const groundGeo = new THREE.PlaneGeometry(300, 300);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x5f503a, roughness: 0.95 });
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
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, h, 12), mainMat);
    body.position.set(x, h / 2, z);
    body.castShadow = true;
    group.add(body);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * TAU;
      const cren = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), darkMat);
      cren.position.set(x + Math.cos(angle) * (r + 0.1), h + 0.6, z + Math.sin(angle) * (r + 0.1));
      group.add(cren);
    }
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(r + 0.3, 3, 12),
      new THREE.MeshPhysicalMaterial({ color: 0x8b2020, roughness: 0.6 }),
    );
    roof.position.set(x, h + 2.7, z);
    roof.castShadow = true;
    group.add(roof);
    const flagPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 3, 4),
      new THREE.MeshStandardMaterial({ color: 0x333333 }),
    );
    flagPole.position.set(x, h + 5, z);
    group.add(flagPole);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.4, 10, 5),
      new THREE.MeshPhysicalMaterial({ color: 0xdaa520, side: THREE.DoubleSide, roughness: 0.55 }),
    );
    flag.position.set(x + 1.1, h + 5.8, z);
    this._flagMeshes.push(flag);
    group.add(flag);
    for (let j = 0; j < 3; j++) {
      const angle = (j / 3) * TAU + 0.5;
      const slit = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 0.7),
        new THREE.MeshBasicMaterial({ color: 0x443311 }),
      );
      slit.position.set(x + Math.cos(angle) * (r + 0.01), h * 0.6, z + Math.sin(angle) * (r + 0.01));
      slit.lookAt(x, h * 0.6, z);
      group.add(slit);
    }
    return group;
  }

  private _buildSpectatorStands(): void {
    const standMat = new THREE.MeshPhysicalMaterial({ color: 0x8b7355, roughness: 0.8 });
    const beamMat = new THREE.MeshPhysicalMaterial({ color: 0x664422, roughness: 0.85 });
    for (const zSign of [-1, 1]) {
      const standGroup = new THREE.Group();
      const baseZ = zSign * (GB_FIELD.HALF_WIDTH + 8);
      for (let row = 0; row < CROWD_ROWS; row++) {
        const rowZ = baseZ + zSign * row * 2.5;
        const rowY = 1 + row * 1.5;
        const platform = new THREE.Mesh(
          new THREE.BoxGeometry(GB_FIELD.LENGTH - 10, 0.3, 2.2), standMat,
        );
        platform.position.set(0, rowY, rowZ);
        platform.receiveShadow = true;
        standGroup.add(platform);
        // Wooden support beams
        for (let i = 0; i < 8; i++) {
          const bx = -GB_FIELD.HALF_LENGTH + 10 + i * 11;
          const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, rowY, 0.3), beamMat);
          beam.position.set(bx, rowY / 2, rowZ);
          beam.castShadow = true;
          standGroup.add(beam);
          // Cross braces between beams
          if (i < 7 && row > 0) {
            const brace = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.12), beamMat);
            brace.position.set(bx + 5.5, rowY - 0.5, rowZ);
            brace.rotation.z = 0.15 * (i % 2 === 0 ? 1 : -1);
            standGroup.add(brace);
          }
        }
        this._buildCrowdRow(standGroup, row, rowY + 0.15, rowZ, zSign);
      }
      // Roof
      const roofMesh = new THREE.Mesh(
        new THREE.BoxGeometry(GB_FIELD.LENGTH - 8, 0.25, CROWD_ROWS * 2.5 + 2),
        new THREE.MeshPhysicalMaterial({ color: 0x5b2a1a, roughness: 0.75 }),
      );
      roofMesh.position.set(0, 1 + CROWD_ROWS * 1.5 + 2, baseZ + zSign * (CROWD_ROWS - 1) * 1.25);
      roofMesh.castShadow = true;
      standGroup.add(roofMesh);
      this._environmentGroup.add(standGroup);
    }
  }

  private _buildCrowdRow(parent: THREE.Group, row: number, y: number, z: number, _zSign: number): void {
    const count = CROWD_PER_SIDE;
    const bodyGeo = new THREE.CylinderGeometry(0.25, 0.3, 1.2, 6);
    const headGeo = new THREE.SphereGeometry(0.2, 6, 4);
    const colors = [0xcc3333, 0x3333cc, 0x33cc33, 0xcccc33, 0xcc33cc, 0x885522, 0x558844, 0xaa6644];
    for (let i = 0; i < count; i++) {
      const px = -GB_FIELD.HALF_LENGTH + 8 + (i / count) * (GB_FIELD.LENGTH - 16);
      const mat = new THREE.MeshStandardMaterial({
        color: colors[(row * count + i) % colors.length], roughness: 0.8,
      });
      const body = new THREE.Mesh(bodyGeo, mat);
      body.position.set(px + (Math.random() - 0.5) * 0.5, y + 0.6, z + (Math.random() - 0.5) * 0.3);
      parent.add(body);
      const head = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: 0xddbb99, roughness: 0.7 }));
      head.position.set(body.position.x, y + 1.35, body.position.z);
      parent.add(head);
      this._crowdBaseY.push(y + 0.6);
    }
  }

  private _buildBannerPole(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 6, 6),
      new THREE.MeshPhysicalMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.4 }),
    );
    pole.position.set(x, 3, z);
    group.add(pole);
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 2.5, 8, 10),
      new THREE.MeshPhysicalMaterial({ color: 0xdaa520, side: THREE.DoubleSide, roughness: 0.55 }),
    );
    banner.position.set(x, 4.5, z + 0.8);
    this._flagMeshes.push(banner);
    group.add(banner);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 4),
      new THREE.MeshPhysicalMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.2 }),
    );
    cap.position.set(x, 6, z);
    group.add(cap);
    return group;
  }

  private _buildTorchSconce(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    const ironMat = new THREE.MeshPhysicalMaterial({
      color: 0x3a3a3a, metalness: 0.8, roughness: 0.35,
    });
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), ironMat);
    bracket.position.set(x, 4, z);
    group.add(bracket);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.3, 8), ironMat);
    bowl.position.set(x, 4.4, z);
    group.add(bowl);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff6600 }),
    );
    flame.position.set(x, 4.75, z);
    group.add(flame);
    const glowShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.15 }),
    );
    glowShell.position.set(x, 4.75, z);
    group.add(glowShell);
    return group;
  }

  // Gates with iron gate meshes
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
    const stoneMat = new THREE.MeshPhysicalMaterial({ color: 0x887766, roughness: 0.75, metalness: 0.08 });
    const darkMat = new THREE.MeshPhysicalMaterial({ color: 0x665544, roughness: 0.8 });
    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(1.3, gh + 1, 1.3), stoneMat);
    leftPillar.position.set(x, (gh + 1) / 2, -gw / 2 - 0.65);
    leftPillar.castShadow = true;
    group.add(leftPillar);
    const rightPillar = leftPillar.clone();
    rightPillar.position.z = gw / 2 + 0.65;
    group.add(rightPillar);
    const archCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, gh, -gw / 2 - 0.6),
      new THREE.Vector3(x, gh + 2, -gw / 4),
      new THREE.Vector3(x, gh + 2.5, 0),
      new THREE.Vector3(x, gh + 2, gw / 4),
      new THREE.Vector3(x, gh, gw / 2 + 0.6),
    ]);
    const arch = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 20, 0.5, 8, false), stoneMat);
    arch.castShadow = true;
    group.add(arch);
    const keystone = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.1, 0.9),
      new THREE.MeshPhysicalMaterial({ color: 0xdaa520, metalness: 0.5, roughness: 0.4 }),
    );
    keystone.position.set(x, gh + 2.5, 0);
    group.add(keystone);
    for (const pz of [-gw / 2 - 0.6, gw / 2 + 0.6]) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.4, 1.7), darkMat);
      cap.position.set(x, gh + 1.2, pz);
      group.add(cap);
      const gargoyle = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.8, 6),
        new THREE.MeshPhysicalMaterial({ color: 0x555544, roughness: 0.85 }),
      );
      gargoyle.position.set(x + (side === 0 ? 0.6 : -0.6), gh + 1, pz);
      gargoyle.rotation.z = side === 0 ? -Math.PI / 4 : Math.PI / 4;
      group.add(gargoyle);
    }
    const ironMat = new THREE.MeshPhysicalMaterial({
      color: 0x3a3a3a, metalness: 0.9, roughness: 0.3,
    });
    const barCount = 7;
    for (let i = 0; i < barCount; i++) {
      const bz = -gw / 2 + 0.5 + i * (gw - 1) / (barCount - 1);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, gh, 6), ironMat);
      bar.position.set(x, gh / 2, bz);
      group.add(bar);
    }
    for (let j = 0; j < 3; j++) {
      const hbar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, gw - 1, 6), ironMat);
      hbar.rotation.x = Math.PI / 2;
      hbar.position.set(x, 1 + j * (gh - 1) / 2, 0);
      group.add(hbar);
    }
    const ironGate = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, gh, gw),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    ironGate.position.set(x, gh / 2, 0);
    this._ironGateMeshes.push(ironGate);
    const barrierMat = new THREE.MeshBasicMaterial({
      color: 0x44aaff, transparent: true, opacity: 0.15, side: THREE.DoubleSide,
    });
    const barrier = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), barrierMat);
    barrier.rotation.y = Math.PI / 2;
    barrier.position.set(x, gh / 2 + 0.5, 0);
    group.add(barrier);
    this._gateBarriers.push(barrier);
    for (let i = 0; i < 8; i++) {
      const rune = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x88ccff }),
      );
      rune.position.copy(archCurve.getPoint(i / 7));
      group.add(rune);
    }
    return group;
  }

  // Enhanced Orb with layered glow
  private _buildOrb(): void {
    this._orbMesh = new THREE.Group();
    this._orbInner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(GB_PHYSICS.ORB_RADIUS * 0.7, 1),
      new THREE.MeshPhysicalMaterial({
        color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 1.0,
        metalness: 0.8, roughness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.1,
      }),
    );
    this._orbInner.castShadow = true;
    this._orbMesh.add(this._orbInner);
    const outerCore = new THREE.Mesh(
      new THREE.SphereGeometry(GB_PHYSICS.ORB_RADIUS, 28, 20),
      new THREE.MeshPhysicalMaterial({
        color: 0xffe066, emissive: 0xffbb22, emissiveIntensity: 0.5,
        metalness: 0.5, roughness: 0.2, transparent: true, opacity: 0.5,
      }),
    );
    this._orbMesh.add(outerCore);
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(GB_PHYSICS.ORB_RADIUS * 1.6, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffdd44, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending,
      }),
    );
    this._orbMesh.add(shell);
    const etchMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.04, GB_PHYSICS.ORB_RADIUS * 1.6, 0.04), etchMat);
    this._orbMesh.add(v);
    const h = new THREE.Mesh(new THREE.BoxGeometry(GB_PHYSICS.ORB_RADIUS * 1.2, 0.04, 0.04), etchMat);
    h.position.y = GB_PHYSICS.ORB_RADIUS * 0.15;
    this._orbMesh.add(h);
    this._orbGlow = new THREE.PointLight(0xffdd44, 2.0, 15, 1.5);
    this._orbMesh.add(this._orbGlow);
    this._orbGroup.add(this._orbMesh);
    const trailCount = 80;
    this._orbTrailPositions = new Float32Array(trailCount * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(this._orbTrailPositions, 3));
    const trailSizes = new Float32Array(trailCount);
    for (let i = 0; i < trailCount; i++) trailSizes[i] = 0.08 + (1 - i / trailCount) * 0.15;
    trailGeo.setAttribute("size", new THREE.BufferAttribute(trailSizes, 1));
    this._orbTrailParticles = new THREE.Points(trailGeo, new THREE.PointsMaterial({
      color: 0xffdd44, size: 0.15, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this._orbGroup.add(this._orbTrailParticles);
    const haloCount = 24;
    this._orbHaloPositions = new Float32Array(haloCount * 3);
    const haloGeo = new THREE.BufferGeometry();
    haloGeo.setAttribute("position", new THREE.BufferAttribute(this._orbHaloPositions, 3));
    this._orbHaloParticles = new THREE.Points(haloGeo, new THREE.PointsMaterial({
      color: 0xffeebb, size: 0.12, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this._orbGroup.add(this._orbHaloParticles);
  }

  // Particle systems (dust, magic, goal, fire, mist)
  private _buildParticleSystems(): void {
    this._dustData = [];
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(DUST_POOL * 3), 3));
    this._dustParticles = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0xccbb99, size: 0.2, transparent: true, opacity: 0.45,
    }));
    for (let i = 0; i < DUST_POOL; i++)
      this._dustData.push({ alive: false, life: 0, maxLife: 0, pos: [0, 0, 0], vel: [0, 0, 0] });
    this._particleGroup.add(this._dustParticles);
    this._magicData = [];
    const magicGeo = new THREE.BufferGeometry();
    magicGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAGIC_POOL * 3), 3));
    this._magicParticles = new THREE.Points(magicGeo, new THREE.PointsMaterial({
      color: 0x99bbff, size: 0.18, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    for (let i = 0; i < MAGIC_POOL; i++)
      this._magicData.push({ alive: false, life: 0, maxLife: 0, pos: [0, 0, 0], vel: [0, 0, 0] });
    this._particleGroup.add(this._magicParticles);
    this._goalData = [];
    const goalGeo = new THREE.BufferGeometry();
    goalGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(GOAL_POOL * 3), 3));
    this._goalParticles = new THREE.Points(goalGeo, new THREE.PointsMaterial({
      color: 0xffd700, size: 0.35, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    for (let i = 0; i < GOAL_POOL; i++)
      this._goalData.push({ alive: false, life: 0, maxLife: 0, pos: [0, 0, 0], vel: [0, 0, 0] });
    this._particleGroup.add(this._goalParticles);
    this._fireData = [];
    const fireGeo = new THREE.BufferGeometry();
    fireGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(FIRE_POOL * 3), 3));
    this._fireParticles = new THREE.Points(fireGeo, new THREE.PointsMaterial({
      color: 0xff6622, size: 0.12, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    for (let i = 0; i < FIRE_POOL; i++)
      this._fireData.push({ alive: false, life: 0, maxLife: 0, pos: [0, 0, 0], vel: [0, 0, 0] });
    this._particleGroup.add(this._fireParticles);
    this._mistData = [];
    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MIST_POOL * 3), 3));
    this._mistParticles = new THREE.Points(mistGeo, new THREE.PointsMaterial({
      color: 0xbbccdd, size: 1.2, transparent: true, opacity: 0.12,
      depthWrite: false,
    }));
    for (let i = 0; i < MIST_POOL; i++)
      this._mistData.push({ alive: false, life: 0, maxLife: 0, pos: [0, 0, 0], vel: [0, 0, 0] });
    this._particleGroup.add(this._mistParticles);
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.5, 2.0, 32),
        new THREE.MeshBasicMaterial({
          color: 0x88aaff, transparent: true, opacity: 0, side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06;
      ring.visible = false;
      this._abilityCircles.push(ring);
      this._particleGroup.add(ring);
    }
  }

  // Selection ring
  private _buildSelectionRing(): void {
    const ringGeo = new THREE.RingGeometry(1.2, 1.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88, transparent: true, opacity: 0.6, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this._selectionRing = new THREE.Mesh(ringGeo, ringMat);
    this._selectionRing.rotation.x = -Math.PI / 2;
    this._selectionRing.position.y = 0.05;
    this._scene.add(this._selectionRing);
  }

  // Merlin (floating referee) -- enhanced with PBR
  private _buildMerlin(): void {
    this._merlinMesh = new THREE.Group();
    const robeMat = new THREE.MeshPhysicalMaterial({ color: 0x2828aa, roughness: 0.5, metalness: 0.1 });
    const robe = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2, 8), robeMat);
    robe.position.y = -0.5;
    this._merlinMesh.add(robe);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 10, 8),
      new THREE.MeshPhysicalMaterial({ color: 0xddbb99, roughness: 0.6 }),
    );
    head.position.y = 0.7;
    this._merlinMesh.add(head);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 8), robeMat);
    hat.position.y = 1.5;
    this._merlinMesh.add(hat);
    for (let i = 0; i < 4; i++) {
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 4),
        new THREE.MeshBasicMaterial({ color: 0xffd700 }),
      );
      const a = (i / 4) * TAU;
      star.position.set(Math.cos(a) * 0.2, 1.2 + i * 0.1, Math.sin(a) * 0.2);
      this._merlinMesh.add(star);
    }
    const beard = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.6, 6),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 }),
    );
    beard.position.set(0, 0.25, 0.2);
    this._merlinMesh.add(beard);
    const aura = new THREE.PointLight(0x8888ff, 0.6, 10, 1.5);
    this._merlinMesh.add(aura);
    this._merlinMesh.position.set(0, 12, 0);
    this._merlinGroup.add(this._merlinMesh);
  }

  // Player model building -- PBR materials, distinct class looks
  buildPlayerMesh(player: GBPlayer, teamDef: GBTeamDef): THREE.Group {
    const group = new THREE.Group();
    group.userData = { playerId: player.id };
    switch (player.cls) {
      case GBPlayerClass.KNIGHT: this._buildKnightModel(group, teamDef, player.id); break;
      case GBPlayerClass.ROGUE: this._buildRogueModel(group, teamDef, player.id); break;
      case GBPlayerClass.MAGE: this._buildMageModel(group, teamDef, player.id); break;
      case GBPlayerClass.GATEKEEPER: this._buildGatekeeperModel(group, teamDef, player.id); break;
    }
    group.castShadow = true;
    return group;
  }

  private _makeArmorMat(color: number): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color, metalness: 0.9, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.15,
    });
  }

  private _makeMagicMat(color: THREE.Color | number): THREE.MeshPhysicalMaterial {
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);
    return new THREE.MeshPhysicalMaterial({
      color: c, emissive: c, emissiveIntensity: 0.7,
      metalness: 0.2, roughness: 0.4, transparent: true, opacity: 0.8,
    });
  }

  private _buildKnightModel(group: THREE.Group, team: GBTeamDef, playerId: number): void {
    const pri = new THREE.Color(team.primaryColor);
    const sec = new THREE.Color(team.secondaryColor);
    const armorMat = this._makeArmorMat(0x999999);
    const darkArmor = this._makeArmorMat(0x777777);
    const tabardMat = new THREE.MeshPhysicalMaterial({ color: pri, roughness: 0.55, metalness: 0.05 });
    const skinMat = new THREE.MeshPhysicalMaterial({ color: 0xddbb99, roughness: 0.65 });
    const bootMat = new THREE.MeshPhysicalMaterial({ color: 0x553322, roughness: 0.75, metalness: 0.15 });
    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.45), bootMat);
    leftBoot.position.set(-0.18, 0.2, 0.05); leftBoot.name = "leftFoot"; group.add(leftBoot);
    const rightBoot = leftBoot.clone(); rightBoot.position.x = 0.18; rightBoot.name = "rightFoot"; group.add(rightBoot);
    const leftGreave = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.5, 8), armorMat);
    leftGreave.position.set(-0.18, 0.65, 0); leftGreave.name = "leftShin"; group.add(leftGreave);
    const rightGreave = leftGreave.clone(); rightGreave.position.x = 0.18; rightGreave.name = "rightShin"; group.add(rightGreave);
    for (const xp of [-0.18, 0.18]) {
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), darkArmor);
      knee.position.set(xp, 0.9, 0.08); group.add(knee);
    }
    const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.45, 8), armorMat);
    leftThigh.position.set(-0.16, 1.15, 0); leftThigh.name = "leftThigh"; group.add(leftThigh);
    const rightThigh = leftThigh.clone(); rightThigh.position.x = 0.16; rightThigh.name = "rightThigh"; group.add(rightThigh);
    group.add(meshAt(new THREE.CylinderGeometry(0.22, 0.2, 0.15, 8), new THREE.MeshPhysicalMaterial({ color: 0x442200, roughness: 0.75, metalness: 0.2 }), 0, 1.38, 0));
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.35), armorMat);
    torso.position.y = 1.7; torso.name = "torso"; group.add(torso);
    const tabF = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.01), tabardMat);
    tabF.position.set(0, 1.7, 0.19); group.add(tabF);
    const tabB = tabF.clone(); tabB.position.z = -0.19; group.add(tabB);
    for (const xp of [-0.38, 0.38]) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), darkArmor);
      p.scale.set(1.3, 0.8, 1); p.position.set(xp, 1.95, 0); group.add(p);
    }
    for (const xp of [-0.4, 0.4]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.35, 8), armorMat);
      arm.position.set(xp, 1.72, 0); arm.name = xp < 0 ? "leftUpperArm" : "rightUpperArm"; group.add(arm);
      const gaunt = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.3, 0.13), darkArmor);
      gaunt.position.set(xp * 1.05, 1.42, 0); gaunt.name = xp < 0 ? "leftHand" : "rightHand"; group.add(gaunt);
    }
    group.add(meshAt(new THREE.CylinderGeometry(0.1, 0.12, 0.15, 6), skinMat, 0, 2.07, 0));
    const helm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.4, 0.34), darkArmor);
    helm.position.y = 2.35; helm.name = "head"; group.add(helm);
    group.add(meshAt(new THREE.BoxGeometry(0.29, 0.04, 0.01), new THREE.MeshBasicMaterial({ color: 0x111111 }), 0, 2.35, 0.18));
    group.add(meshAt(new THREE.BoxGeometry(0.04, 0.22, 0.28), new THREE.MeshPhysicalMaterial({ color: sec, roughness: 0.45, metalness: 0.2 }), 0, 2.6, 0));
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.35),
      new THREE.MeshPhysicalMaterial({ color: sec, metalness: 0.4, roughness: 0.45, clearcoat: 0.3 }));
    shield.position.set(-0.55, 1.6, 0); shield.name = "shield"; group.add(shield);
    group.add(meshAt(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshPhysicalMaterial({ color: pri, metalness: 0.6, roughness: 0.3 }), -0.58, 1.6, 0));
    const cape = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.7, 6, 8),
      new THREE.MeshPhysicalMaterial({ color: pri, side: THREE.DoubleSide, roughness: 0.55 }),
    );
    cape.position.set(0, 1.6, -0.2); cape.name = "cloak"; group.add(cape);
    this._capeMeshes.push({ mesh: cape, playerId });
  }

  private _buildRogueModel(group: THREE.Group, team: GBTeamDef, playerId: number): void {
    const pri = new THREE.Color(team.primaryColor);
    const sec = new THREE.Color(team.secondaryColor);
    const leather = new THREE.MeshPhysicalMaterial({ color: 0x6b4226, roughness: 0.7, metalness: 0.1 });
    const darkLeather = new THREE.MeshPhysicalMaterial({ color: 0x3d2b1f, roughness: 0.75, metalness: 0.1 });
    const clothMat = new THREE.MeshPhysicalMaterial({ color: pri, roughness: 0.6 });
    const skinMat = new THREE.MeshPhysicalMaterial({ color: 0xddbb99, roughness: 0.65 });
    const metalMat = this._makeArmorMat(0x999999);
    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, 0.4), darkLeather);
    leftBoot.position.set(-0.14, 0.18, 0.03); leftBoot.name = "leftFoot"; group.add(leftBoot);
    const rightBoot = leftBoot.clone(); rightBoot.position.x = 0.14; rightBoot.name = "rightFoot"; group.add(rightBoot);
    for (const [xp, nm] of [[-0.14, "leftShin"], [0.14, "rightShin"]] as const) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 6), leather);
      leg.position.set(xp, 0.8, 0); leg.name = nm; group.add(leg);
    }
    for (const [xp, nm] of [[-0.13, "leftThigh"], [0.13, "rightThigh"]] as const) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.35, 6), leather);
      t.position.set(xp, 1.15, 0); t.name = nm; group.add(t);
    }
    group.add(meshAt(new THREE.CylinderGeometry(0.17, 0.16, 0.1, 8), darkLeather, 0, 1.35, 0));
    group.add(meshAt(new THREE.BoxGeometry(0.1, 0.1, 0.08), darkLeather, 0.18, 1.35, 0.05));
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.5, 0.28), leather);
    torso.position.y = 1.62; torso.name = "torso"; group.add(torso);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.01), darkLeather);
    strap.position.set(0.05, 1.65, 0.15); strap.rotation.z = 0.3; group.add(strap);
    for (const xp of [-0.28, 0.28]) {
      group.add(meshAt(new THREE.BoxGeometry(0.18, 0.06, 0.18), leather, xp, 1.88, 0));
    }
    for (const [xp, armNm, handNm] of [[-0.3, "leftUpperArm", "leftHand"], [0.3, "rightUpperArm", "rightHand"]] as const) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.55, 6), leather);
      arm.position.set(xp, 1.55, 0); arm.name = armNm; group.add(arm);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), darkLeather);
      hand.position.set(xp, 1.22, 0); hand.name = handNm; group.add(hand);
    }
    group.add(meshAt(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 6), skinMat, 0, 1.93, 0));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), skinMat);
    head.position.y = 2.15; head.name = "head"; group.add(head);
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 8, 0, TAU, 0, Math.PI * 0.6), clothMat,
    );
    hood.position.y = 2.18; hood.rotation.x = -0.2; group.add(hood);
    { const _cape = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.3),
      new THREE.MeshPhysicalMaterial({ color: pri, side: THREE.DoubleSide, roughness: 0.6 }));
      _cape.position.set(0, 2.0, -0.15); _cape.rotation.set(0.3, 0, 0); group.add(_cape); }
    for (const xOff of [-0.06, 0.06])
      group.add(meshAt(new THREE.SphereGeometry(0.02, 4, 4), new THREE.MeshBasicMaterial({ color: 0x222222 }), xOff, 2.17, 0.16));
    for (const side of [-1, 1]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.02), metalMat);
      blade.position.set(side * 0.2, 1.2, -0.1); blade.rotation.z = side * 0.2; group.add(blade);
      group.add(meshAt(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 4), darkLeather, side * 0.2, 1.32, -0.1));
    }
    const cloak = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.9, 6, 8),
      new THREE.MeshPhysicalMaterial({ color: sec, side: THREE.DoubleSide, roughness: 0.6 }),
    );
    cloak.position.set(0, 1.45, -0.2); cloak.name = "cloak"; group.add(cloak);
    this._capeMeshes.push({ mesh: cloak, playerId });
  }

  private _buildMageModel(group: THREE.Group, team: GBTeamDef, _playerId: number): void {
    const pri = new THREE.Color(team.primaryColor);
    const sec = new THREE.Color(team.secondaryColor);
    const acc = new THREE.Color(team.accentColor);
    const robeMat = new THREE.MeshPhysicalMaterial({ color: pri, roughness: 0.55, metalness: 0.05 });
    const innerRobe = new THREE.MeshPhysicalMaterial({ color: sec, roughness: 0.6 });
    const skinMat = new THREE.MeshPhysicalMaterial({ color: 0xddbb99, roughness: 0.65 });
    const glowMat = this._makeMagicMat(acc);
    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.35), new THREE.MeshPhysicalMaterial({ color: 0x664433, roughness: 0.8 }));
    leftFoot.position.set(-0.12, 0.05, 0.03); leftFoot.name = "leftFoot"; group.add(leftFoot);
    const rightFoot = leftFoot.clone(); rightFoot.position.x = 0.12; rightFoot.name = "rightFoot"; group.add(rightFoot);
    const robeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.35, 1.5, 8), robeMat);
    robeBody.position.y = 0.8; robeBody.name = "torso"; group.add(robeBody);
    group.add(meshAt(new THREE.PlaneGeometry(0.2, 1.2), innerRobe, 0, 0.9, 0.16));
    group.add(meshAt(new THREE.CylinderGeometry(0.18, 0.17, 0.08, 8), new THREE.MeshPhysicalMaterial({ color: sec, roughness: 0.5, metalness: 0.15 }), 0, 1.4, 0));
    group.add(meshAt(new THREE.BoxGeometry(0.36, 0.35, 0.25), robeMat, 0, 1.72, 0));
    group.add(meshAt(new THREE.CylinderGeometry(0.16, 0.2, 0.12, 8), robeMat, 0, 1.93, 0));
    for (const xSign of [-1, 1]) {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 0.6, 8), robeMat);
      sleeve.position.set(xSign * 0.32, 1.55, 0); sleeve.rotation.z = xSign * 0.3;
      sleeve.name = xSign === -1 ? "leftUpperArm" : "rightUpperArm"; group.add(sleeve);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), skinMat);
      hand.position.set(xSign * 0.42, 1.3, 0);
      hand.name = xSign === -1 ? "leftHand" : "rightHand"; group.add(hand);
      // Magic glow (emissive)
      const handGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 8, 6), glowMat,
      );
      handGlow.position.set(xSign * 0.42, 1.3, 0);
      handGlow.name = xSign === -1 ? "leftGlow" : "rightGlow"; group.add(handGlow);
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), skinMat);
    head.position.y = 2.1; head.name = "head"; group.add(head);
    group.add(meshAt(new THREE.ConeGeometry(0.22, 0.75, 8), robeMat, 0, 2.55, 0));
    group.add(meshAt(new THREE.CylinderGeometry(0.28, 0.3, 0.04, 8), robeMat, 0, 2.22, 0));
    for (let i = 0; i < 3; i++) {
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4),
        new THREE.MeshBasicMaterial({ color: acc }));
      const a = (i / 3) * TAU + 0.5;
      star.position.set(Math.cos(a) * 0.15, 2.4 + i * 0.12, Math.sin(a) * 0.15);
      group.add(star);
    }
    for (const xOff of [-0.06, 0.06])
      group.add(meshAt(new THREE.SphereGeometry(0.025, 6, 4), new THREE.MeshBasicMaterial({ color: acc }), xOff, 2.12, 0.15));
    group.add(meshAt(new THREE.ConeGeometry(0.08, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.9 }), 0, 1.92, 0.12));
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 2.2, 8),
      new THREE.MeshPhysicalMaterial({ color: 0x553311, roughness: 0.75, metalness: 0.05 }));
    staff.position.set(0.5, 1.5, 0); staff.name = "staff"; group.add(staff);
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12, 0),
      new THREE.MeshPhysicalMaterial({
        color: acc, emissive: acc, emissiveIntensity: 0.8,
        metalness: 0.3, roughness: 0.2, transparent: true, opacity: 0.9,
      }),
    );
    crystal.position.set(0.5, 2.65, 0); crystal.name = "crystal"; group.add(crystal);
    { const _pl = new THREE.PointLight(new THREE.Color(acc).getHex(), 0.5, 6, 1.5); _pl.position.set(0.5, 2.65, 0); group.add(_pl); }
  }

  private _buildGatekeeperModel(group: THREE.Group, team: GBTeamDef, _playerId: number): void {
    const pri = new THREE.Color(team.primaryColor);
    const sec = new THREE.Color(team.secondaryColor);
    const heavyMetal = this._makeArmorMat(0x777777);
    const darkMetal = this._makeArmorMat(0x555555);
    const tabardMat = new THREE.MeshPhysicalMaterial({ color: pri, roughness: 0.55, metalness: 0.05 });
    const bootMat = new THREE.MeshPhysicalMaterial({ color: 0x444433, roughness: 0.75, metalness: 0.2 });
    const s = 1.15;
    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.35 * s, 0.45 * s, 0.5 * s), bootMat);
    leftBoot.position.set(-0.22 * s, 0.22 * s, 0.05); leftBoot.name = "leftFoot"; group.add(leftBoot);
    const rightBoot = leftBoot.clone(); rightBoot.position.x = 0.22 * s; rightBoot.name = "rightFoot"; group.add(rightBoot);
    for (const [xp, nm] of [[-0.2, "leftShin"], [0.2, "rightShin"]] as const) {
      const g = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.16 * s, 0.55 * s, 8), heavyMetal);
      g.position.set(xp * s, 0.72 * s, 0); g.name = nm; group.add(g);
    }
    for (const [xp, nm] of [[-0.18, "leftThigh"], [0.18, "rightThigh"]] as const) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.14 * s, 0.45 * s, 8), heavyMetal);
      t.position.set(xp * s, 1.2 * s, 0); t.name = nm; group.add(t);
    }
    group.add(meshAt(new THREE.CylinderGeometry(0.28 * s, 0.25 * s, 0.18 * s, 8), darkMetal, 0, 1.45 * s, 0));
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7 * s, 0.65 * s, 0.4 * s), heavyMetal);
    torso.position.y = 1.8 * s; torso.name = "torso"; group.add(torso);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      group.add(meshAt(new THREE.SphereGeometry(0.02, 4, 4), darkMetal, (c - 1) * 0.15 * s, (1.55 + r * 0.15) * s, 0.21 * s));
    }
    group.add(meshAt(new THREE.BoxGeometry(0.5 * s, 0.6 * s, 0.01), tabardMat, 0, 1.8 * s, 0.21 * s));
    for (const xSign of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.22 * s, 10, 8), heavyMetal);
      p.scale.set(1.3, 0.7, 1.1); p.position.set(xSign * 0.48 * s, 2.1 * s, 0); group.add(p);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 4), darkMetal);
      spike.position.set(xSign * 0.55 * s, 2.25 * s, 0); group.add(spike);
    }
    for (const [xp, armNm, handNm] of [[-0.5, "leftUpperArm", "leftHand"], [0.5, "rightUpperArm", "rightHand"]] as const) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.12 * s, 0.5 * s, 8), heavyMetal);
      arm.position.set(xp * s, 1.75 * s, 0); arm.name = armNm; group.add(arm);
      const gaunt = new THREE.Mesh(new THREE.BoxGeometry(0.14 * s, 0.3 * s, 0.14 * s), darkMetal);
      gaunt.position.set(xp * 1.04 * s, 1.4 * s, 0); gaunt.name = handNm; group.add(gaunt);
    }
    group.add(meshAt(new THREE.CylinderGeometry(0.14 * s, 0.16 * s, 0.12 * s, 8), heavyMetal, 0, 2.18 * s, 0));
    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.22 * s, 0.4 * s, 10), heavyMetal);
    helm.position.y = 2.45 * s; helm.name = "head"; group.add(helm);
    group.add(meshAt(new THREE.CylinderGeometry(0.2 * s, 0.2 * s, 0.04 * s, 10), darkMetal, 0, 2.65 * s, 0));
    group.add(meshAt(new THREE.BoxGeometry(0.25 * s, 0.03, 0.01), new THREE.MeshBasicMaterial({ color: 0x111111 }), 0, 2.45 * s, 0.22 * s));
    for (let i = 0; i < 5; i++)
      group.add(meshAt(new THREE.CircleGeometry(0.01, 4), new THREE.MeshBasicMaterial({ color: 0x111111 }), (i - 2) * 0.04, 2.38 * s, 0.23 * s));
    const towerShield = new THREE.Group();
    const shieldMat = new THREE.MeshPhysicalMaterial({ color: sec, metalness: 0.4, roughness: 0.4, clearcoat: 0.3 });
    towerShield.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2 * s, 0.7 * s), shieldMat));
    const crossMat = new THREE.MeshPhysicalMaterial({ color: pri, metalness: 0.5, roughness: 0.35 });
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.8 * s, 0.06), crossMat);
    crossV.position.x = 0.05; towerShield.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.06, 0.5 * s), crossMat);
    crossH.position.set(0.05, 0.1, 0); towerShield.add(crossH);
    towerShield.add(meshAt(new THREE.SphereGeometry(0.08, 8, 6), heavyMetal, 0.05, 0, 0));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35 * s, 0.02, 4, 12), darkMetal);
    rim.position.x = 0.05; rim.rotation.y = Math.PI / 2; rim.scale.y = 1.7; towerShield.add(rim);
    towerShield.position.set(-0.7 * s, 1.6 * s, 0); towerShield.name = "shield"; group.add(towerShield);
  }

  // Ensure player meshes exist
  ensurePlayerMeshes(state: GBMatchState): void {
    for (const p of state.players) {
      if (!this._playerMeshes.has(p.id)) {
        const teamDef = state.teamDefs[p.teamIndex];
        const mesh = this.buildPlayerMesh(p, teamDef);
        this._playerMeshes.set(p.id, mesh);
        this._playerGroup.add(mesh);
        this._playerAnimData.set(p.id, {
          runPhase: 0, targetBlend: 0, currentBlend: 0,
          prevAction: GBPlayerAction.IDLE, breathPhase: Math.random() * TAU,
        });
      }
    }
  }

  // Power-up meshes
  private _buildPowerUpMesh(type: GBPowerUpType): THREE.Group {
    const group = new THREE.Group();
    const color = type === GBPowerUpType.SPEED_BOOST ? 0x4488ff
      : type === GBPowerUpType.STRENGTH ? 0xff4444 : 0xaa44ff;
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5, 0),
      new THREE.MeshPhysicalMaterial({
        color, emissive: color, emissiveIntensity: 0.6,
        metalness: 0.4, roughness: 0.25, clearcoat: 0.5,
      }),
    );
    group.add(crystal);
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 10, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending }),
    ));
    group.add(new THREE.PointLight(color, 0.6, 10, 1.5));
    return group;
  }

  // UPDATE (called each frame)
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
    this._updateCapes(dt);
    this._updateGateBarriers(state, dt);
    this._updateLighting(state, dt);
    this._updateGoalCelebration(state, dt);
    this._updateSelectionRing(state);
    this._updateMist(dt);
    this._updateFireParticles(dt);
    this._updateAbilityCircles(state);
    this._composer.render();
  }

  // Camera
  private _updateCamera(state: GBMatchState, _dt: number): void {
    const orbPos = state.orb.pos;
    const sel = getSelectedPlayer(state);
    const targetX = orbPos.x * 0.6 + (sel ? sel.pos.x * 0.4 : 0);
    const targetZ = orbPos.z * 0.6 + (sel ? sel.pos.z * 0.4 : 0);
    this._camTarget.set(targetX, 0, targetZ);
    const smooth = GB_CAMERA.FOLLOW_SMOOTHING;
    let height = GB_CAMERA.DEFAULT_HEIGHT;
    let distance = GB_CAMERA.DEFAULT_DISTANCE;
    if (state.phase === GBMatchPhase.GOAL_SCORED) {
      height = GB_CAMERA.GOAL_ZOOM_HEIGHT;
      distance = GB_CAMERA.GOAL_ZOOM_DISTANCE;
    }
    this._camPos.x += (this._camTarget.x - this._camPos.x) * smooth;
    this._camPos.y += (height - this._camPos.y) * smooth * 0.5;
    this._camPos.z += (this._camTarget.z + distance - this._camPos.z) * smooth;
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

  // Player animation & positioning
  private _updatePlayers(state: GBMatchState, dt: number): void {
    for (const p of state.players) {
      const mesh = this._playerMeshes.get(p.id);
      if (!mesh) continue;
      const anim = this._playerAnimData.get(p.id)!;
      mesh.position.set(p.pos.x, p.pos.y, p.pos.z);
      mesh.rotation.y = -p.facing + Math.PI / 2;
      const speed = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
      const isRunning = speed > 0.5;
      if (isRunning) {
        anim.runPhase += dt * speed * 0.8;
        anim.targetBlend = 1;
      } else {
        anim.targetBlend = 0;
      }
      anim.currentBlend += (anim.targetBlend - anim.currentBlend) * 0.1;
      anim.breathPhase += dt * 2;
      this._animatePlayer(mesh, p, anim, dt);
      if (isRunning && Math.random() < speed * 0.05) {
        this._spawnDust(p.pos.x, 0.1, p.pos.z);
      }
      if (p.cls === GBPlayerClass.MAGE && p.action === GBPlayerAction.CASTING) {
        this._spawnMagicSpark(p.pos.x, p.pos.y + 1.5, p.pos.z);
      }
      // Tackle sparks
      if (p.action === GBPlayerAction.TACKLING && Math.random() < 0.3) {
        this._spawnMagicSpark(p.pos.x, p.pos.y + 0.5, p.pos.z);
      }
    }
  }

  private _animatePlayer(mesh: THREE.Group, player: GBPlayer, anim: PlayerAnimData, _dt: number): void {
    const blend = anim.currentBlend;
    const phase = anim.runPhase;
    mesh.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const name = child.name;
      const legSwing = Math.sin(phase) * 0.4 * blend;
      const armSwing = Math.sin(phase + Math.PI) * 0.3 * blend;
      switch (name) {
        case "leftFoot": case "leftShin":
          child.position.y += Math.abs(Math.sin(phase)) * 0.15 * blend;
          child.position.x += Math.sin(phase) * 0.08 * blend; break;
        case "rightFoot": case "rightShin":
          child.position.y += Math.abs(Math.sin(phase + Math.PI)) * 0.15 * blend;
          child.position.x += Math.sin(phase + Math.PI) * 0.08 * blend; break;
        case "leftThigh": child.rotation.x = legSwing; break;
        case "rightThigh": child.rotation.x = -legSwing; break;
        case "leftUpperArm": case "leftHand": child.rotation.x = -armSwing; break;
        case "rightUpperArm": case "rightHand": child.rotation.x = armSwing; break;
        case "torso":
          child.scale.y = 1 + Math.sin(anim.breathPhase) * 0.008;
          child.rotation.x = blend * 0.1; break;
        case "head":
          child.position.y += Math.sin(phase * 2) * 0.02 * blend; break;
      }
      if (player.action === GBPlayerAction.CELEBRATING) {
        if (name === "leftUpperArm" || name === "rightUpperArm")
          child.rotation.z = Math.sin(this._time * 5) * 0.5;
      }
      if (player.action === GBPlayerAction.STUNNED) {
        if (name === "torso" || name === "head")
          child.rotation.z = Math.sin(this._time * 10) * 0.15;
      }
      if (player.action === GBPlayerAction.THROWING) {
        if (name === "rightUpperArm" || name === "rightHand")
          child.rotation.x = -1.2;
      }
      if (player.action === GBPlayerAction.TACKLING) {
        if (name === "torso") child.rotation.x = 0.4;
      }
    });
  }

  // Cape / cloak sine-based vertex displacement
  private _updateCapes(_dt: number): void {
    for (const { mesh } of this._capeMeshes) {
      const geo = mesh.geometry as THREE.PlaneGeometry;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const wave = Math.sin(this._time * 3.5 + y * 3) * 0.06 * Math.abs(y - 0.4);
        const flap = Math.sin(this._time * 5 + i * 0.5) * 0.02;
        pos.setZ(i, wave + flap - 0.05);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }
  }

  // Orb
  private _updateOrb(state: GBMatchState, dt: number): void {
    const orb = state.orb;
    this._orbMesh.position.set(orb.pos.x, orb.pos.y, orb.pos.z);
    this._orbInner.rotation.x += dt * 3;
    this._orbInner.rotation.y += dt * 4;
    this._orbInner.rotation.z += dt * 1.5;
    this._orbMesh.rotation.x += dt * 1.5;
    this._orbMesh.rotation.y += dt * 2;
    const glowPulse = 1 + Math.sin(this._time * 4) * 0.35;
    this._orbGlow.intensity = orb.glowIntensity * glowPulse * 2;
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
    for (let i = 0; i < this._orbHaloPositions.length / 3; i++) {
      const a = (i / (this._orbHaloPositions.length / 3)) * TAU + this._time * 2;
      const r = 0.7 + Math.sin(this._time * 3 + i) * 0.15;
      this._orbHaloPositions[i * 3] = orb.pos.x + Math.cos(a) * r;
      this._orbHaloPositions[i * 3 + 1] = orb.pos.y + Math.sin(a * 0.7 + i) * 0.3;
      this._orbHaloPositions[i * 3 + 2] = orb.pos.z + Math.sin(a) * r;
    }
    (this._orbHaloParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  // Power-ups
  private _updatePowerUps(state: GBMatchState, dt: number): void {
    for (const [id, mesh] of this._powerUpMeshMap) {
      if (!state.powerUps.find(p => p.id === id && p.active)) {
        this._powerUpGroup.remove(mesh);
        this._powerUpMeshMap.delete(id);
      }
    }
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

  // Merlin
  private _updateMerlin(state: GBMatchState, _dt: number): void {
    const target = state.merlinTarget;
    const pos = this._merlinMesh.position;
    pos.x += (target.x - pos.x) * 0.02;
    pos.y += (target.y - pos.y) * 0.02;
    pos.z += (target.z - pos.z) * 0.02;
    pos.y += Math.sin(this._time * 1.5) * 0.3;
    this._merlinMesh.lookAt(state.orb.pos.x, pos.y, state.orb.pos.z);
  }

  // Particles
  private _spawnDust(x: number, y: number, z: number): void {
    for (const p of this._dustData) {
      if (!p.alive) {
        p.alive = true; p.life = 0; p.maxLife = 0.4 + Math.random() * 0.3;
        p.pos = [x + (Math.random() - 0.5) * 0.5, y, z + (Math.random() - 0.5) * 0.5];
        p.vel = [(Math.random() - 0.5) * 1, 1 + Math.random() * 2, (Math.random() - 0.5) * 1];
        break;
      }
    }
  }

  private _spawnMagicSpark(x: number, y: number, z: number): void {
    for (const p of this._magicData) {
      if (!p.alive) {
        p.alive = true; p.life = 0; p.maxLife = 0.5 + Math.random() * 0.5;
        p.pos = [x + (Math.random() - 0.5) * 1, y + (Math.random() - 0.5) * 0.5, z + (Math.random() - 0.5) * 1];
        p.vel = [(Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3];
        break;
      }
    }
  }

  spawnTackleImpact(x: number, y: number, z: number): void {
    for (let i = 0; i < 15; i++) this._spawnDust(x, y, z);
    for (let i = 0; i < 8; i++) this._spawnMagicSpark(x, y + 0.5, z);
  }

  spawnGoalExplosion(x: number, y: number, z: number): void {
    this._goalCelebrationActive = true;
    this._goalCelebrationTimer = 3;
    for (const p of this._goalData) {
      p.alive = true; p.life = 0; p.maxLife = 1.5 + Math.random() * 1.5;
      p.pos = [x, y + 2, z];
      p.vel = [(Math.random() - 0.5) * 20, 5 + Math.random() * 15, (Math.random() - 0.5) * 20];
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
      if (!p.alive) { positions[i * 3] = 0; positions[i * 3 + 1] = -100; positions[i * 3 + 2] = 0; continue; }
      p.life += dt;
      if (p.life >= p.maxLife) { p.alive = false; continue; }
      p.vel[1] += gravity * dt;
      p.pos[0] += p.vel[0] * dt; p.pos[1] += p.vel[1] * dt; p.pos[2] += p.vel[2] * dt;
      if (p.pos[1] < 0) { p.pos[1] = 0; p.vel[1] *= -0.3; }
      positions[i * 3] = p.pos[0]; positions[i * 3 + 1] = p.pos[1]; positions[i * 3 + 2] = p.pos[2];
    }
    (points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  // Fire particles on torch sconces
  private _updateFireParticles(_dt: number): void {
    for (const sconce of this._torchSconces) {
      if (Math.random() < 0.3) {
        for (const p of this._fireData) {
          if (!p.alive) {
            p.alive = true; p.life = 0; p.maxLife = 0.3 + Math.random() * 0.3;
            p.pos = [sconce.x + (Math.random() - 0.5) * 0.15, sconce.y + 0.5, sconce.z + (Math.random() - 0.5) * 0.15];
            p.vel = [(Math.random() - 0.5) * 0.5, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 0.5];
            break;
          }
        }
      }
    }
    this._updateParticleSystem(this._fireParticles, this._fireData, 0.016, -1);
  }

  // Ground mist
  private _updateMist(_dt: number): void {
    if (Math.random() < 0.15) {
      for (const p of this._mistData) {
        if (!p.alive) {
          p.alive = true; p.life = 0; p.maxLife = 3 + Math.random() * 4;
          p.pos = [
            (Math.random() - 0.5) * GB_FIELD.LENGTH,
            0.2 + Math.random() * 0.5,
            (Math.random() - 0.5) * GB_FIELD.WIDTH,
          ];
          p.vel = [(Math.random() - 0.5) * 0.3, 0.05, (Math.random() - 0.5) * 0.3];
          break;
        }
      }
    }
    this._updateParticleSystem(this._mistParticles, this._mistData, 0.016, 0);
  }

  // Ability cast ground circles
  private _updateAbilityCircles(state: GBMatchState): void {
    let circleIdx = 0;
    for (const p of state.players) {
      if (p.action === GBPlayerAction.CASTING && circleIdx < this._abilityCircles.length) {
        const circle = this._abilityCircles[circleIdx];
        circle.visible = true;
        circle.position.set(p.pos.x, 0.06, p.pos.z);
        const mat = circle.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.3 + Math.sin(this._time * 6) * 0.15;
        circle.rotation.z = this._time * 2;
        const pulse = 1 + Math.sin(this._time * 4) * 0.15;
        circle.scale.set(pulse, pulse, pulse);
        circleIdx++;
      }
    }
    for (let i = circleIdx; i < this._abilityCircles.length; i++) {
      this._abilityCircles[i].visible = false;
    }
  }

  // Flags (wind animation with cloth wave)
  private _updateFlags(_dt: number): void {
    for (const flag of this._flagMeshes) {
      const geo = flag.geometry as THREE.PlaneGeometry;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const wave = Math.sin(this._time * 3.5 + x * 2.5) * 0.12 * Math.abs(x);
        const ripple = Math.sin(this._time * 5 + x * 4) * 0.03;
        pos.setZ(i, wave + ripple);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }
  }

  // Gate barriers
  private _updateGateBarriers(state: GBMatchState, _dt: number): void {
    for (let i = 0; i < this._gateBarriers.length; i++) {
      const barrier = this._gateBarriers[i];
      const mat = barrier.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + Math.sin(this._time * 2.5 + i) * 0.06;
      if (state.phase === GBMatchPhase.GOAL_SCORED && state.lastGoalTeam !== i) {
        mat.opacity = 0.04; mat.color.setHex(0xff4444);
      } else {
        mat.color.setHex(0x44aaff);
      }
    }
  }

  // Lighting updates (flickering torches, goal lights)
  private _updateLighting(state: GBMatchState, _dt: number): void {
    for (let i = 0; i < this._torchLights.length; i++) {
      const torch = this._torchLights[i];
      const flicker = Math.sin(this._time * 8.7 + i * 2.3) * 0.12
        + Math.sin(this._time * 13.1 + i * 1.7) * 0.08
        + (Math.random() - 0.5) * 0.06;
      torch.intensity = 0.5 + flicker;
      // Slight color temperature variation
      torch.color.setHSL(0.07 + flicker * 0.02, 0.95, 0.55);
    }
    for (let i = 0; i < this._goalLights.length; i++) {
      if (state.phase === GBMatchPhase.GOAL_SCORED) {
        this._goalLights[i].intensity = 2.5 + Math.sin(this._time * 6) * 1.2;
        this._goalLights[i].color.setHSL((this._time * 0.5) % 1, 1, 0.6);
      } else {
        this._goalLights[i].intensity *= 0.95;
      }
    }
  }

  // Goal celebration
  private _updateGoalCelebration(_state: GBMatchState, dt: number): void {
    if (this._goalCelebrationActive) {
      this._goalCelebrationTimer -= dt;
      if (this._goalCelebrationTimer <= 0) this._goalCelebrationActive = false;
    }
  }

  // Selection ring
  private _updateSelectionRing(state: GBMatchState): void {
    const sel = getSelectedPlayer(state);
    if (sel) {
      this._selectionRing.visible = true;
      this._selectionRing.position.set(sel.pos.x, 0.05, sel.pos.z);
      this._selectionRing.rotation.z = this._time * 2;
      const pulse = 1 + Math.sin(this._time * 4) * 0.1;
      this._selectionRing.scale.set(pulse, pulse, pulse);
    } else {
      this._selectionRing.visible = false;
    }
  }

  // Cleanup
  destroy(): void {
    window.removeEventListener("resize", this._onResize);
    if (this._canvas && this._canvas.parentElement) {
      this._canvas.parentElement.removeChild(this._canvas);
    }
    this._renderer.dispose();
    this._scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    this._playerMeshes.clear();
    this._playerAnimData.clear();
    this._powerUpMeshMap.clear();
    this._capeMeshes.length = 0;
  }
}

// Internal types
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
