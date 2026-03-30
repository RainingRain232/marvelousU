// ---------------------------------------------------------------------------
// LOT: Fate's Gambit — Three.js 3D renderer
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { LOT, LOT_DISPLAY } from "../config/LotConfig";
import type {
  LotState, LotEnemy, Obstacle, Treasure,
} from "../state/LotState";

const TAU = Math.PI * 2;

export class LotRenderer {
  canvas!: HTMLCanvasElement;
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;

  // Arena
  private _arenaFloor!: THREE.Mesh;
  private _arenaWall!: THREE.Mesh;
  private _pillarMeshes: THREE.Mesh[] = [];
  private _curseRing!: THREE.Mesh;

  // Player
  private _playerGroup!: THREE.Group;
  private _playerBody!: THREE.Mesh;
  private _playerSword!: THREE.Mesh;
  private _playerShield!: THREE.Mesh;
  private _playerHelmet!: THREE.Mesh;

  // Enemies
  private _enemyMeshes = new Map<number, THREE.Group>();

  // Obstacles
  private _obstacleMeshes = new Map<number, THREE.Group>();

  // Treasures
  private _treasureMeshes = new Map<number, THREE.Group>();

  // Particles (instanced)
  private _particleInstancedMesh!: THREE.InstancedMesh;
  private _maxParticles = 500;
  private _particleDummy = new THREE.Object3D();

  // Projectiles
  private _projectileMeshes = new Map<number, THREE.Mesh>();

  // Enemy HP bars (sprite-based)
  private _hpBarMeshes = new Map<number, THREE.Group>();

  // Whirlwind ring visual
  private _whirlwindRing: THREE.Mesh | null = null;

  // Minimap canvas
  private _minimapCanvas!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;

  // Shockwave rings
  private _shockwaveRings: THREE.Mesh[] = [];

  // Ground telegraphs
  private _telegraphMeshes: THREE.Mesh[] = [];

  // Shrine meshes
  private _shrineMeshes = new Map<string, THREE.Group>();

  // Screen flash overlay
  private _flashOverlay!: HTMLDivElement;

  // Sword trail
  private _swordTrailMesh!: THREE.Line;
  private _swordTrailGeo!: THREE.BufferGeometry;

  // Rune meshes on floor
  private _runeMeshes: THREE.Mesh[] = [];

  // Reusable color
  private _tmpColor = new THREE.Color();

  // Fate wheel
  private _fateWheel!: THREE.Group;

  // Fog ref
  private _fog!: THREE.FogExp2;

  // Lights
  private _ambientLight!: THREE.AmbientLight;
  private _dirLight!: THREE.DirectionalLight;
  private _pointLights: THREE.PointLight[] = [];

  // Post-processing
  private _composer!: EffectComposer;
  private _bloomPass!: UnrealBloomPass;
  private _vignettePass!: ShaderPass;

  // Torch braziers
  private _braziers: THREE.Group[] = [];

  // Arena floor hex grid
  private _hexGridMesh!: THREE.Mesh;
  private _hexGridMat!: THREE.ShaderMaterial;

  // Dodge afterimage
  private _afterimages: { mesh: THREE.Mesh; life: number }[] = [];

  // Ground decals
  private _decalMeshes: THREE.Mesh[] = [];

  // Attack arc
  private _attackArc: THREE.Mesh | null = null;

  // Reflect bubble
  private _reflectBubble: THREE.Mesh | null = null;

  // 3D floating damage numbers
  private _dmgNumberSprites: { sprite: THREE.Sprite; life: number }[] = [];

  // Ambient atmosphere particles (instanced)
  private _dustMesh!: THREE.InstancedMesh;
  private _dustCount = 200;
  private _dustPositions: Float32Array = new Float32Array(0);
  private _dustVelocities: Float32Array = new Float32Array(0);
  private _dustDummy = new THREE.Object3D();

  // Sky objects
  private _moon!: THREE.Mesh;
  private _cloudLayer!: THREE.Mesh;

  // Sky
  private _skyDome!: THREE.Mesh;

  init(sw: number, sh: number): void {
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this._renderer.setSize(sw, sh);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.2;
    this.canvas = this._renderer.domElement;
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.zIndex = "1";

    this._scene = new THREE.Scene();
    this._fog = new THREE.FogExp2(0x1a0a2e, 0.012);
    this._scene.fog = this._fog;
    this._scene.background = new THREE.Color(0x0a0520);

    this._camera = new THREE.PerspectiveCamera(65, sw / sh, 0.5, 200);
    this._camera.position.set(0, LOT.CAMERA_HEIGHT, -LOT.CAMERA_DISTANCE);
    this._camera.lookAt(0, 0, 0);

    this._buildLights();
    this._buildSky();
    this._buildArena();
    this._buildPlayer();
    this._buildSkyDetails();
    this._buildDustParticles();
    this._buildBraziers();
    this._buildHexGrid();
    this._buildFateWheel();
    this._buildParticleSystem();
    this._buildSwordTrail();
    this._buildMinimap();
    this._buildPostProcessing(sw, sh);

    // Screen flash overlay
    this._flashOverlay = document.createElement("div");
    this._flashOverlay.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;
      pointer-events:none;opacity:0;
    `;
    document.body.appendChild(this._flashOverlay);
  }

  private _buildLights(): void {
    this._ambientLight = new THREE.AmbientLight(0x332244, 0.6);
    this._scene.add(this._ambientLight);

    this._dirLight = new THREE.DirectionalLight(0x8866cc, 1.2);
    this._dirLight.position.set(20, 30, -10);
    this._dirLight.castShadow = true;
    this._dirLight.shadow.mapSize.set(2048, 2048);
    this._dirLight.shadow.camera.near = 1;
    this._dirLight.shadow.camera.far = 80;
    this._dirLight.shadow.camera.left = -50;
    this._dirLight.shadow.camera.right = 50;
    this._dirLight.shadow.camera.top = 50;
    this._dirLight.shadow.camera.bottom = -50;
    this._scene.add(this._dirLight);

    // Hemisphere light for atmosphere
    const hemi = new THREE.HemisphereLight(0x4422aa, 0x221100, 0.4);
    this._scene.add(hemi);

    // Point lights at arena edges
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * TAU;
      const pl = new THREE.PointLight(0xff6633, 0.8, 30);
      pl.position.set(Math.cos(angle) * (LOT.ARENA_RADIUS - 2), 6, Math.sin(angle) * (LOT.ARENA_RADIUS - 2));
      this._scene.add(pl);
      this._pointLights.push(pl);
    }
  }

  private _buildSky(): void {
    const skyGeo = new THREE.SphereGeometry(150, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      vertexColors: true,
    });

    // Gradient sky
    const colors: number[] = [];
    const positions = skyGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = (y + 150) / 300;
      const r = 0.04 + t * 0.15;
      const g = 0.02 + t * 0.05;
      const b = 0.12 + t * 0.25;
      colors.push(r, g, b);
    }
    skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    this._skyDome = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(this._skyDome);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starVerts: number[] = [];
    for (let i = 0; i < 800; i++) {
      const theta = rng() * TAU;
      const phi = rng() * Math.PI;
      const r = 140;
      starVerts.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      );
    }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starVerts, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, sizeAttenuation: true });
    this._scene.add(new THREE.Points(starGeo, starMat));
  }

  private _buildArena(): void {
    // Floor — concentric ring pattern
    const floorGeo = new THREE.CircleGeometry(LOT.ARENA_RADIUS, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a3a,
      metalness: 0.3,
      roughness: 0.8,
    });
    this._arenaFloor = new THREE.Mesh(floorGeo, floorMat);
    this._arenaFloor.rotation.x = -Math.PI / 2;
    this._arenaFloor.receiveShadow = true;
    this._scene.add(this._arenaFloor);

    // Decorative rings on floor
    for (let r = 8; r <= LOT.ARENA_RADIUS; r += 8) {
      const ringGeo = new THREE.RingGeometry(r - 0.15, r + 0.15, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x6644aa,
        emissive: 0x331166,
        emissiveIntensity: 0.5,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      this._scene.add(ring);
    }

    // Rune symbols on floor (animated)
    this._runeMeshes = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * TAU;
      const d = 20;
      const runeGeo = new THREE.PlaneGeometry(2, 2);
      const runeMat = new THREE.MeshStandardMaterial({
        color: 0x8866cc,
        emissive: 0x4422aa,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.6,
      });
      const rune = new THREE.Mesh(runeGeo, runeMat);
      rune.rotation.x = -Math.PI / 2;
      rune.position.set(Math.cos(angle) * d, 0.03, Math.sin(angle) * d);
      rune.rotation.z = angle;
      this._scene.add(rune);
      this._runeMeshes.push(rune);
    }

    // Arena wall (energy barrier with vertical lines)
    const wallGeo = new THREE.CylinderGeometry(LOT.ARENA_RADIUS, LOT.ARENA_RADIUS, LOT.ARENA_WALL_HEIGHT, 64, 8, true);
    const wallMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x4422aa) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vY;
        void main() {
          vUv = uv;
          vY = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying float vY;
        void main() {
          // Vertical energy lines
          float lines = sin(vUv.x * 200.0) * 0.5 + 0.5;
          lines = pow(lines, 8.0);
          // Horizontal shimmer
          float shimmer = sin(vY * 3.0 + uTime * 2.0) * 0.5 + 0.5;
          // Traveling energy pulses
          float pulse = sin(vY * 2.0 - uTime * 4.0) * 0.5 + 0.5;
          pulse = pow(pulse, 4.0);
          // Fade at top and bottom
          float edgeFade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);

          float alpha = (lines * 0.3 + shimmer * 0.05 + pulse * 0.15) * edgeFade;
          vec3 col = uColor * (1.0 + pulse * 0.5 + lines * 0.3);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    this._arenaWall = new THREE.Mesh(wallGeo, wallMat);
    this._arenaWall.position.y = LOT.ARENA_WALL_HEIGHT / 2;
    this._scene.add(this._arenaWall);

    // Curse radius ring
    const curseGeo = new THREE.RingGeometry(LOT.ARENA_RADIUS - 0.5, LOT.ARENA_RADIUS, 64);
    const curseMat = new THREE.MeshStandardMaterial({
      color: 0x00cccc,
      emissive: 0x00cccc,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0,
    });
    this._curseRing = new THREE.Mesh(curseGeo, curseMat);
    this._curseRing.rotation.x = -Math.PI / 2;
    this._curseRing.position.y = 0.05;
    this._scene.add(this._curseRing);
  }

  private _buildPlayer(): void {
    this._playerGroup = new THREE.Group();

    // Body (armored knight)
    const bodyGeo = new THREE.CylinderGeometry(0.4, 0.5, 1.8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x7788aa, metalness: 0.7, roughness: 0.3 });
    this._playerBody = new THREE.Mesh(bodyGeo, bodyMat);
    this._playerBody.position.y = 0.9;
    this._playerBody.castShadow = true;
    this._playerGroup.add(this._playerBody);

    // Chest plate detail
    const chestGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.7, 16);
    const chestMat = new THREE.MeshStandardMaterial({ color: 0x8899bb, metalness: 0.8, roughness: 0.2 });
    const chest = new THREE.Mesh(chestGeo, chestMat);
    chest.position.set(0, 1.2, 0.08);
    chest.scale.set(1.05, 1, 0.7);
    this._playerGroup.add(chest);

    // Belt detail
    const beltGeo = new THREE.TorusGeometry(0.45, 0.05, 8, 16);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x665533, metalness: 0.4, roughness: 0.6 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 0.5;
    belt.rotation.x = Math.PI / 2;
    this._playerGroup.add(belt);
    // Belt buckle
    const buckleGeo = new THREE.BoxGeometry(0.12, 0.12, 0.06);
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xffcc44, metalness: 0.9, roughness: 0.1 });
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, 0.5, 0.45);
    this._playerGroup.add(buckle);

    // Helmet
    const helmetGeo = new THREE.SphereGeometry(0.35, 16, 12);
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x8899bb, metalness: 0.8, roughness: 0.2 });
    this._playerHelmet = new THREE.Mesh(helmetGeo, helmetMat);
    this._playerHelmet.position.y = 2.0;
    this._playerHelmet.scale.y = 1.2;
    this._playerGroup.add(this._playerHelmet);

    // Helmet crest / plume
    const crestGeo = new THREE.CylinderGeometry(0.03, 0.06, 0.5, 12);
    const crestMat = new THREE.MeshStandardMaterial({ color: 0xcc2233, roughness: 0.6 });
    const crest = new THREE.Mesh(crestGeo, crestMat);
    crest.position.set(0, 2.45, -0.05);
    this._playerGroup.add(crest);
    // Plume feathers (thin box running front to back)
    const plumeMat = new THREE.MeshStandardMaterial({ color: 0xdd3344, roughness: 0.7 });
    const plume = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.35), plumeMat);
    plume.position.set(0, 2.35, -0.1);
    this._playerGroup.add(plume);

    // Visor slit (dark)
    const visorGeo = new THREE.BoxGeometry(0.5, 0.08, 0.1);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x111122, emissive: 0x222266, emissiveIntensity: 0.5 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 2.0, 0.3);
    this._playerGroup.add(visor);

    // Sword
    const swordGeo = new THREE.BoxGeometry(0.08, 1.2, 0.04);
    const swordMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.9, roughness: 0.1, emissive: 0x334488, emissiveIntensity: 0.3 });
    this._playerSword = new THREE.Mesh(swordGeo, swordMat);
    this._playerSword.position.set(0.6, 1.3, 0.3);
    this._playerSword.castShadow = true;
    this._playerGroup.add(this._playerSword);

    // Sword guard
    const guardGeo = new THREE.BoxGeometry(0.3, 0.06, 0.08);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0xaa8844, metalness: 0.6 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.set(0.6, 0.7, 0.3);
    this._playerGroup.add(guard);

    // Shield
    const shieldGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.08, 12);
    const shieldMat = new THREE.MeshStandardMaterial({ color: 0x3344aa, metalness: 0.5, roughness: 0.4 });
    this._playerShield = new THREE.Mesh(shieldGeo, shieldMat);
    this._playerShield.rotation.z = Math.PI / 2;
    this._playerShield.rotation.x = Math.PI / 6;
    this._playerShield.position.set(-0.6, 1.2, 0.3);
    this._playerGroup.add(this._playerShield);

    // Shield emblem (golden cross)
    const emblemGeo = new THREE.BoxGeometry(0.04, 0.3, 0.02);
    const emblemMat = new THREE.MeshStandardMaterial({ color: 0xffcc44, metalness: 0.8, emissive: 0xffaa00, emissiveIntensity: 0.4 });
    const emblemV = new THREE.Mesh(emblemGeo, emblemMat);
    emblemV.position.set(-0.6, 1.2, 0.38);
    this._playerGroup.add(emblemV);
    const emblemH = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.2), emblemMat);
    emblemH.position.set(-0.6, 1.25, 0.38);
    this._playerGroup.add(emblemH);

    // Shoulder pauldrons
    const pauldronMat = new THREE.MeshStandardMaterial({ color: 0x6677aa, metalness: 0.8, roughness: 0.2 });
    for (const side of [-0.55, 0.55]) {
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), pauldronMat);
      pauldron.scale.set(1.2, 0.7, 1);
      pauldron.position.set(side, 1.7, 0);
      this._playerGroup.add(pauldron);
    }

    // Gauntlets (arms)
    const gauntletMat = new THREE.MeshStandardMaterial({ color: 0x5566aa, metalness: 0.7, roughness: 0.3 });
    for (const side of [-0.6, 0.6]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.8, 16), gauntletMat);
      arm.position.set(side, 1.1, 0.15);
      this._playerGroup.add(arm);
      // Hand (small sphere at arm end)
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), gauntletMat);
      hand.position.set(side, 0.65, 0.15);
      this._playerGroup.add(hand);
    }

    // Leg armor / boots
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x445577, metalness: 0.5, roughness: 0.5 });
    for (const side of [-0.2, 0.2]) {
      // Upper boot (shin guard)
      const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.4, 16), bootMat);
      boot.position.set(side, 0.3, 0);
      this._playerGroup.add(boot);
      // Rounded boot toe (sphere at base)
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), bootMat);
      toe.position.set(side, 0.08, 0.04);
      toe.scale.set(1, 0.5, 1.3);
      this._playerGroup.add(toe);
    }

    // Cape / cloak (larger, multi-segment)
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0x2233aa, side: THREE.DoubleSide, transparent: true, opacity: 0.85,
    });
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6, 4, 6), capeMat);
    cape.position.set(0, 1.1, -0.38);
    cape.rotation.x = 0.12;
    this._playerGroup.add(cape);
    // Cape inner lining (slightly different color, visible from inside)
    const liningMat = new THREE.MeshStandardMaterial({
      color: 0x112266, side: THREE.BackSide, transparent: true, opacity: 0.7,
    });
    const lining = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.5, 4, 6), liningMat);
    lining.position.set(0, 1.1, -0.37);
    lining.rotation.x = 0.12;
    this._playerGroup.add(lining);
    // Cape clasp at neck
    const claspMat = new THREE.MeshStandardMaterial({ color: 0xffcc44, metalness: 0.9 });
    const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), claspMat);
    clasp.position.set(0, 1.85, -0.3);
    this._playerGroup.add(clasp);

    this._scene.add(this._playerGroup);
  }

  private _buildSkyDetails(): void {
    // Moon
    const moonGeo = new THREE.SphereGeometry(8, 16, 12);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xddeeff,
      transparent: true,
      opacity: 0.7,
    });
    this._moon = new THREE.Mesh(moonGeo, moonMat);
    this._moon.position.set(60, 90, -40);
    this._scene.add(this._moon);

    // Moon glow
    const glowGeo = new THREE.SphereGeometry(14, 16, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x6688bb,
      transparent: true,
      opacity: 0.08,
    });
    const moonGlow = new THREE.Mesh(glowGeo, glowMat);
    moonGlow.position.copy(this._moon.position);
    this._scene.add(moonGlow);

    // Cloud layer — rotating transparent plane with procedural pattern
    const cloudGeo = new THREE.PlaneGeometry(300, 300, 1, 1);
    const cloudMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.06 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        varying vec2 vUv;

        // Simple noise approximation
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0;
          v += noise(p * 1.0) * 0.5;
          v += noise(p * 2.0) * 0.25;
          v += noise(p * 4.0) * 0.125;
          return v;
        }

        void main() {
          vec2 uv = vUv * 4.0 + vec2(uTime * 0.02, uTime * 0.01);
          float n = fbm(uv);
          float cloud = smoothstep(0.35, 0.65, n);
          float dist = length(vUv - 0.5) * 2.0;
          float fade = 1.0 - smoothstep(0.3, 1.0, dist);
          gl_FragColor = vec4(0.3, 0.25, 0.45, cloud * uOpacity * fade);
        }
      `,
    });
    this._cloudLayer = new THREE.Mesh(cloudGeo, cloudMat);
    this._cloudLayer.position.y = 80;
    this._cloudLayer.rotation.x = -Math.PI / 2;
    this._scene.add(this._cloudLayer);
  }

  private _buildDustParticles(): void {
    // Ambient floating dust/embers using instanced mesh
    const geo = new THREE.SphereGeometry(0.04, 16, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffaa66, transparent: true, opacity: 0.5 });
    this._dustMesh = new THREE.InstancedMesh(geo, mat, this._dustCount);
    this._dustMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this._dustPositions = new Float32Array(this._dustCount * 3);
    this._dustVelocities = new Float32Array(this._dustCount * 3);

    for (let i = 0; i < this._dustCount; i++) {
      const angle = rng() * TAU;
      const r = rng() * LOT.ARENA_RADIUS;
      this._dustPositions[i * 3] = Math.cos(angle) * r;
      this._dustPositions[i * 3 + 1] = rng() * 8 + 0.5;
      this._dustPositions[i * 3 + 2] = Math.sin(angle) * r;
      this._dustVelocities[i * 3] = (rng() - 0.5) * 0.3;
      this._dustVelocities[i * 3 + 1] = rng() * 0.2 + 0.05;
      this._dustVelocities[i * 3 + 2] = (rng() - 0.5) * 0.3;
    }

    this._scene.add(this._dustMesh);
  }

  private _buildBraziers(): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * TAU;
      const r = LOT.ARENA_RADIUS - 1.5;
      const g = new THREE.Group();

      // Stone base
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.7, 1.5, 12),
        new THREE.MeshStandardMaterial({ color: 0x443355, roughness: 0.9 }),
      );
      base.position.y = 0.75;
      g.add(base);

      // Bowl
      const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.35, 0.4, 12, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x554466, metalness: 0.4 }),
      );
      bowl.position.y = 1.6;
      g.add(bowl);

      // Fire core (emissive sphere)
      const fire = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xff6622 }),
      );
      fire.position.y = 1.9;
      g.add(fire);

      // Fire glow
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.15 }),
      );
      glow.position.y = 2.0;
      g.add(glow);

      // Point light
      const light = new THREE.PointLight(0xff6622, 1.2, 18);
      light.position.y = 2.2;
      g.add(light);

      g.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
      this._scene.add(g);
      this._braziers.push(g);
    }
  }

  private _buildHexGrid(): void {
    // Animated hex grid overlay on the arena floor using a custom shader
    const geo = new THREE.CircleGeometry(LOT.ARENA_RADIUS - 0.5, 64);
    this._hexGridMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x6644aa) },
        uIntensity: { value: 0.15 },
        uPlayerPos: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform vec2 uPlayerPos;
        varying vec2 vUv;
        varying vec3 vWorldPos;

        float hexGrid(vec2 p, float scale) {
          p *= scale;
          vec2 h = vec2(1.0, 1.732);
          vec2 a = mod(p, h) - h * 0.5;
          vec2 b = mod(p - h * 0.5, h) - h * 0.5;
          float d = min(dot(a, a), dot(b, b));
          return smoothstep(0.06, 0.08, sqrt(d));
        }

        void main() {
          vec2 p = vWorldPos.xz;
          float hex = 1.0 - hexGrid(p, 0.5);
          float dist = length(p);
          float arena = smoothstep(${(LOT.ARENA_RADIUS - 1).toFixed(1)}, ${(LOT.ARENA_RADIUS - 3).toFixed(1)}, dist);

          // Pulse from player position
          float playerDist = length(p - uPlayerPos);
          float pulse = sin(playerDist * 0.8 - uTime * 3.0) * 0.5 + 0.5;
          pulse *= smoothstep(20.0, 0.0, playerDist);

          // Radial wave
          float wave = sin(dist * 0.5 - uTime * 2.0) * 0.5 + 0.5;

          float alpha = hex * uIntensity * (0.5 + pulse * 0.5 + wave * 0.3) * arena;
          vec3 col = uColor * (1.0 + pulse * 0.5);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    this._hexGridMesh = new THREE.Mesh(geo, this._hexGridMat);
    this._hexGridMesh.rotation.x = -Math.PI / 2;
    this._hexGridMesh.position.y = 0.04;
    this._scene.add(this._hexGridMesh);
  }

  private _buildPostProcessing(sw: number, sh: number): void {
    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(new RenderPass(this._scene, this._camera));

    // Bloom
    this._bloomPass = new UnrealBloomPass(
      new THREE.Vector2(sw, sh),
      0.6,    // strength
      0.4,    // radius
      0.85,   // threshold
    );
    this._composer.addPass(this._bloomPass);

    // Vignette
    this._vignettePass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uIntensity: { value: 0.4 },
        uColor: { value: new THREE.Vector3(0, 0, 0) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uIntensity;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          vec4 tex = texture2D(tDiffuse, vUv);
          float dist = distance(vUv, vec2(0.5));
          float vig = smoothstep(0.3, 0.85, dist);
          vec3 col = mix(tex.rgb, uColor, vig * uIntensity);
          gl_FragColor = vec4(col, tex.a);
        }
      `,
    });
    this._composer.addPass(this._vignettePass);
  }

  private _buildFateWheel(): void {
    this._fateWheel = new THREE.Group();

    // Large spinning wheel above the arena
    const wheelGeo = new THREE.TorusGeometry(6, 0.3, 8, 32);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0xccaa44,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x664400,
      emissiveIntensity: 0.4,
    });
    const wheelRing = new THREE.Mesh(wheelGeo, wheelMat);
    this._fateWheel.add(wheelRing);

    // Spokes
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * TAU;
      const spokeGeo = new THREE.CylinderGeometry(0.1, 0.1, 12, 12);
      const spokeMat = new THREE.MeshStandardMaterial({ color: 0xaa8833, metalness: 0.7 });
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spoke.rotation.z = Math.PI / 2;
      spoke.rotation.y = angle;
      this._fateWheel.add(spoke);
    }

    // Colored segments for each lot type
    const lotTypes = LOT.LOT_TYPES;
    for (let i = 0; i < lotTypes.length; i++) {
      const startAngle = (i / lotTypes.length) * TAU;
      const endAngle = ((i + 1) / lotTypes.length) * TAU;
      const segGeo = new THREE.RingGeometry(1, 5.5, 16, 1, startAngle, endAngle - startAngle);
      const display = LOT_DISPLAY[lotTypes[i]];
      const segMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(display.color),
        transparent: true,
        opacity: 0.6,
        emissive: new THREE.Color(display.color),
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide,
      });
      const seg = new THREE.Mesh(segGeo, segMat);
      this._fateWheel.add(seg);
    }

    // Center hub
    const hubGeo = new THREE.SphereGeometry(1, 16, 8);
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0xff8800,
      emissiveIntensity: 0.6,
    });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    this._fateWheel.add(hub);

    this._fateWheel.position.y = 35;
    this._fateWheel.rotation.x = Math.PI / 2;
    this._scene.add(this._fateWheel);
  }

  private _buildParticleSystem(): void {
    const geo = new THREE.SphereGeometry(0.1, 12, 10);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this._particleInstancedMesh = new THREE.InstancedMesh(geo, mat, this._maxParticles);
    this._particleInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._particleInstancedMesh.count = 0;
    this._scene.add(this._particleInstancedMesh);
  }

  private _buildSwordTrail(): void {
    // Ribbon trail using a wider tube of triangles
    const numPoints = 12;
    const positions = new Float32Array(numPoints * 2 * 3); // 2 verts per point (top/bottom)
    const indices: number[] = [];
    for (let i = 0; i < numPoints - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
    this._swordTrailGeo = new THREE.BufferGeometry();
    this._swordTrailGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this._swordTrailGeo.setIndex(indices);

    const mat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this._swordTrailMesh = new THREE.Mesh(this._swordTrailGeo, mat) as unknown as THREE.Line;
    this._scene.add(this._swordTrailMesh);
  }

  private _buildMinimap(): void {
    this._minimapCanvas = document.createElement("canvas");
    this._minimapCanvas.width = 150;
    this._minimapCanvas.height = 150;
    this._minimapCanvas.style.cssText = `
      position:absolute;bottom:20px;right:20px;z-index:12;
      border-radius:50%;border:2px solid #44338866;
      background:rgba(10,5,20,0.7);pointer-events:none;
    `;
    this._minimapCtx = this._minimapCanvas.getContext("2d")!;
    document.body.appendChild(this._minimapCanvas);
  }

  // ---- Per-frame update ----
  update(state: LotState, dt: number): void {
    this._updateCamera(state, dt);
    this._updatePlayer(state);
    this._updateEnemies(state);
    this._updatePillars(state);
    this._updateObstacles(state, dt);
    this._updateTreasures(state, dt);
    this._updateProjectiles(state);
    this._updateShockwaves(state);
    this._updateSwordTrail(state);
    this._updateFateWheel(state, dt);
    this._updateCurseRing(state);
    this._updateParticles(state);
    this._updateEnemyHpBars(state);
    this._updateWhirlwind(state);
    this._updateTelegraphs(state);
    this._updateDecals(state);
    this._updateAttackArc(state);
    this._updateReflectBubble(state);
    this._updateShrines(state, dt);
    this._updateScreenFlash(state);
    this._updateLighting(state, dt);
    this._updateMutation(state);
    this._updateHexGrid(state);
    this._updateBrazierFire(state);
    this._updateAfterimages(dt);
    this._updateDmgNumbers(state);
    this._updateDust(state, dt);
    this._updateSkyDetails(state);
    this._updateVignette(state);
    this._applyScreenShake(state);
    this._updateMinimap(state);

    this._composer.render();
  }

  private _updateCamera(state: LotState, dt: number): void {
    const p = state.player;

    if (state.phase === "menu" || state.phase === "game_over") {
      // Orbit camera
      const orbitAngle = state.gameTime * 0.3;
      this._camera.position.set(
        Math.sin(orbitAngle) * 30,
        20,
        Math.cos(orbitAngle) * 30,
      );
      this._camera.lookAt(0, 5, 0);
      return;
    }

    if (state.phase === "draw") {
      // Look up at fate wheel
      const t = 1 - state.phaseTimer / LOT.DRAW_PHASE_DURATION;
      const startY = 20, endY = 12;
      const startDist = 30, endDist = LOT.CAMERA_DISTANCE;
      const y = startY + (endY - startY) * t;
      const dist = startDist + (endDist - startDist) * t;
      this._camera.position.set(
        Math.sin(state.gameTime * 0.5) * dist,
        y,
        Math.cos(state.gameTime * 0.5) * dist,
      );
      this._camera.lookAt(0, t < 0.5 ? 30 : p.pos.y + 2, 0);
      return;
    }

    // Third person follow camera
    const camDist = LOT.CAMERA_DISTANCE;
    const camH = LOT.CAMERA_HEIGHT;
    const targetX = p.pos.x - Math.sin(p.yaw) * camDist;
    const targetZ = p.pos.z - Math.cos(p.yaw) * camDist;
    const targetY = p.pos.y + camH - p.pitch * 3;

    const lerp = LOT.CAMERA_LERP * dt;
    this._camera.position.x += (targetX - this._camera.position.x) * lerp;
    this._camera.position.y += (targetY - this._camera.position.y) * lerp;
    this._camera.position.z += (targetZ - this._camera.position.z) * lerp;

    this._camera.lookAt(p.pos.x, p.pos.y + 2, p.pos.z);
  }

  private _updatePlayer(state: LotState): void {
    const p = state.player;
    this._playerGroup.position.set(p.pos.x, p.pos.y - 1, p.pos.z);
    this._playerGroup.rotation.y = p.yaw;

    // Sword animation with swing arcs
    const swordMat = this._playerSword.material as THREE.MeshStandardMaterial;
    if (p.attackTimer > 0) {
      // Swing arc: overhand slash
      const progress = 1 - p.attackTimer / LOT.ATTACK_COOLDOWN;
      const swingAngle = -Math.PI / 3 + progress * (Math.PI / 3 + Math.PI / 2);
      this._playerSword.rotation.x = swingAngle;
      this._playerSword.rotation.z = Math.sin(progress * Math.PI) * 0.4;
      this._playerSword.position.set(0.5, 1.3 + Math.sin(progress * Math.PI) * 0.4, 0.3 + progress * 0.6);
      // Body lean during attack
      this._playerBody.rotation.x = -0.15 * (1 - progress);
      // Combo glow: brighter with higher combo
      swordMat.emissiveIntensity = 0.3 + Math.min(p.comboCount * 0.1, 0.8);
      swordMat.emissive.setHex(p.comboCount > 5 ? 0xff6644 : p.comboCount > 2 ? 0x6688ff : 0x334488);
    } else if (p.heavyCharging) {
      // Wind-up: sword raised high, body leaned back
      const chargeProgress = Math.min(p.heavyChargeTimer / LOT.HEAVY_CHARGE_TIME, 1);
      this._playerSword.rotation.x = Math.PI / 4 + chargeProgress * Math.PI / 4;
      this._playerSword.position.set(0.5, 1.5 + chargeProgress * 0.5, 0.2);
      this._playerSword.scale.y = 1 + chargeProgress * 0.3;
      this._playerBody.rotation.x = 0.1 * chargeProgress;
      swordMat.emissiveIntensity = 0.3 + chargeProgress * 2.0;
      swordMat.emissive.setHex(0xff8822);
    } else {
      // Idle: sword at rest
      this._playerSword.rotation.x *= 0.85;
      this._playerSword.rotation.z *= 0.85;
      this._playerSword.position.lerp(new THREE.Vector3(0.6, 1.3, 0.3), 0.15);
      this._playerSword.scale.y = 1;
      this._playerBody.rotation.x *= 0.9;
      swordMat.emissiveIntensity = 0.2 + Math.min(p.comboCount * 0.05, 0.3);
      swordMat.emissive.setHex(0x334488);
    }

    // Shield raise when blocking
    if (p.blocking) {
      this._playerShield.position.set(-0.4, 1.5, 0.5);
    } else {
      this._playerShield.position.set(-0.6, 1.2, 0.3);
    }

    // Bob when moving
    const moving = state.keys.has("w") || state.keys.has("s") || state.keys.has("a") || state.keys.has("d");
    if (moving && p.grounded) {
      const bob = Math.sin(state.gameTime * 10) * 0.1;
      this._playerBody.position.y = 0.9 + bob;
    }

    // Hit flash
    if (p.hitFlash > 0) {
      (this._playerBody.material as THREE.MeshStandardMaterial).emissive.setHex(0xff2222);
      (this._playerBody.material as THREE.MeshStandardMaterial).emissiveIntensity = p.hitFlash * 3;
    } else {
      (this._playerBody.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
    }

    // Dodge visual with afterimage
    if (p.dodgeTimer > 0) {
      this._playerGroup.scale.y = 0.7;
      this._playerGroup.scale.x = 1.15;
      // Spawn afterimage ghost
      if (state.tick % 3 === 0) {
        const ghost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.5, 1.8, 12),
          new THREE.MeshBasicMaterial({ color: 0x4466cc, transparent: true, opacity: 0.4 }),
        );
        ghost.position.copy(this._playerGroup.position);
        ghost.position.y += 0.9;
        ghost.rotation.y = p.yaw;
        this._scene.add(ghost);
        this._afterimages.push({ mesh: ghost, life: 0.3 });
      }
    } else {
      this._playerGroup.scale.y = 1;
      this._playerGroup.scale.x = 1;
    }

    // Cape wind animation
    const cape = this._playerGroup.children[this._playerGroup.children.length - 1] as THREE.Mesh;
    if (cape && (cape.material as THREE.MeshStandardMaterial).side === THREE.DoubleSide) {
      const windAngle = Math.sin(state.gameTime * 3) * 0.1;
      const moveOffset = (moving && p.grounded) ? 0.25 : 0.05;
      cape.rotation.x = 0.15 + moveOffset + windAngle;
      if (p.dodgeTimer > 0) cape.rotation.x = 0.8; // Whip back during dodge
    }
  }

  private _updateEnemies(state: LotState): void {
    const alive = new Set<number>();

    for (const e of state.enemies) {
      alive.add(e.id);
      let group = this._enemyMeshes.get(e.id);
      if (!group) {
        group = this._createEnemyMesh(e);
        this._enemyMeshes.set(e.id, group);
        this._scene.add(group);
      }

      group.position.set(e.pos.x, e.pos.y, e.pos.z);
      group.rotation.y = e.yaw;

      // Spawn emergence: rise from ground with scale-up
      if (e.spawnTimer > 0) {
        const t = e.spawnTimer / 0.6; // 1→0 as spawn completes
        group.position.y -= t * 2.0; // Sink below ground
        group.scale.setScalar((1 - t) * (e.elite ? 1.1 : 1));
        // Glow during spawn
        const bodyMesh = group.children[0] as THREE.Mesh;
        if (bodyMesh?.material) {
          const m = bodyMesh.material as THREE.MeshStandardMaterial;
          m.emissive.setHex(e.elite ? 0xffaa00 : 0xff4422);
          m.emissiveIntensity = t * 3;
        }
        continue;
      }

      // Death dissolve with multi-axis tumble
      if (e.dead) {
        const t = 1 - e.deathTimer; // 0→1 progress
        const scale = e.deathTimer * (0.8 + Math.sin(t * 10) * 0.2);
        group.scale.setScalar(Math.max(0.01, scale));
        group.position.y += t * 4 + Math.sin(t * 8) * 0.5;
        group.rotation.x += t * 12 * 0.016;
        group.rotation.z += t * 8 * 0.016;
        // Fade body opacity
        const bodyMesh = group.children[0] as THREE.Mesh;
        if (bodyMesh?.material) {
          const m = bodyMesh.material as THREE.MeshStandardMaterial;
          m.transparent = true;
          m.opacity = e.deathTimer;
        }
      } else {
        const baseScale = e.type === "golem" || e.type === "boss" ? 1.5 : e.type === "champion" ? 1.2 : e.elite ? 1.1 : 1;
        group.scale.setScalar(baseScale);

        // Walk bob animation
        if (e.behavior === "chase" || e.behavior === "flank") {
          const bob = Math.sin(e.walkCycle) * 0.12;
          const tilt = Math.sin(e.walkCycle * 0.5) * 0.05;
          group.position.y += bob;
          group.rotation.z = tilt;
        } else {
          group.rotation.z = 0;
        }

        // Attack animation — lean forward
        if (e.behavior === "attack") {
          group.rotation.x = -0.3;
        } else if (e.behavior === "charge") {
          group.rotation.x = -0.5;  // Boss charge lean
        } else {
          group.rotation.x *= 0.85; // Ease back
        }

        // Parry stance glow (champion warning)
        if (e.behavior === "parry") {
          group.rotation.x = 0.15; // Leaned back, defensive
        }
      }

      // Hit flash / burn / stun / parry visuals
      const bodyMesh = group.children[0] as THREE.Mesh;
      if (bodyMesh && bodyMesh.material) {
        const mat = bodyMesh.material as THREE.MeshStandardMaterial;
        if (e.hitFlash > 0) {
          mat.emissive.setHex(0xff4444);
          mat.emissiveIntensity = e.hitFlash * 4;
        } else if (e.burning > 0) {
          mat.emissive.setHex(0xff6600);
          mat.emissiveIntensity = 0.5 + Math.sin(state.gameTime * 10) * 0.3;
        } else if (e.behavior === "parry") {
          mat.emissive.setHex(0xffdd44);
          mat.emissiveIntensity = 0.8 + Math.sin(state.gameTime * 6) * 0.4;
        } else if (e.stunVisual > 0) {
          mat.emissive.setHex(0xffff00);
          mat.emissiveIntensity = e.stunVisual * 2;
        } else if (e.elite) {
          mat.emissive.setHex(0xffaa00);
          mat.emissiveIntensity = 0.4 + Math.sin(state.gameTime * 3) * 0.2;
        } else {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      }
    }

    // Remove dead meshes
    for (const [id, group] of this._enemyMeshes) {
      if (!alive.has(id)) {
        this._scene.remove(group);
        this._enemyMeshes.delete(id);
      }
    }
  }

  private _createEnemyMesh(e: LotEnemy): THREE.Group {
    const g = new THREE.Group();

    switch (e.type) {
      case "skeleton": {
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.8 });
        // Ribcage torso
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.0, 16), boneMat);
        torso.position.y = 1.0; torso.castShadow = true; g.add(torso);
        // Individual rib bones (curved torus segments on the front)
        const ribMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.7 });
        for (let i = 0; i < 4; i++) {
          const rib = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 12, Math.PI), ribMat);
          rib.position.set(0, 0.7 + i * 0.2, 0.05);
          rib.rotation.x = Math.PI / 2;
          rib.scale.set(1.1 - i * 0.05, 1, 1);
          g.add(rib);
        }
        // Spine visible behind
        const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 12), boneMat);
        spine.position.set(0, 0.9, -0.15); g.add(spine);
        // Spine vertebrae bumps
        for (let i = 0; i < 5; i++) {
          const vert = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), boneMat);
          vert.position.set(0, 0.4 + i * 0.25, -0.18);
          vert.scale.set(1.2, 0.6, 1);
          g.add(vert);
        }
        // Pelvis
        const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.25), boneMat);
        pelvis.position.y = 0.45; g.add(pelvis);
        // Skull
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), new THREE.MeshStandardMaterial({ color: 0xddccaa }));
        skull.position.y = 1.7; skull.scale.set(1, 1.15, 1); g.add(skull);
        // Jaw (hinged, slightly open)
        const jawUpper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.14), boneMat);
        jawUpper.position.set(0, 1.55, 0.12); g.add(jawUpper);
        const jawLower = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.12), boneMat);
        jawLower.position.set(0, 1.49, 0.13);
        jawLower.rotation.x = 0.15; // slightly open
        g.add(jawLower);
        // Teeth (small boxes along jaw)
        for (const s of [-0.05, 0, 0.05]) {
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 0.015),
            new THREE.MeshStandardMaterial({ color: 0xeeddbb }));
          tooth.position.set(s, 1.52, 0.19); g.add(tooth);
        }
        // Eyes (red glow)
        for (const s of [-0.07, 0.07]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
          eye.position.set(s, 1.73, 0.18); g.add(eye);
        }
        // Arms (bone segments)
        for (const s of [-1, 1]) {
          const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.6, 12), boneMat);
          upper.position.set(s * 0.35, 1.25, 0); upper.rotation.z = s * 0.3; g.add(upper);
          const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 12), boneMat);
          lower.position.set(s * 0.5, 0.85, 0.15); lower.rotation.z = s * 0.5; g.add(lower);
          // Bony hand
          const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), boneMat);
          hand.position.set(s * 0.58, 0.6, 0.2); g.add(hand);
        }
        // Legs (bone segments)
        for (const s of [-0.15, 0.15]) {
          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.35, 12), boneMat);
          thigh.position.set(s, 0.3, 0); g.add(thigh);
          const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.35, 12), boneMat);
          shin.position.set(s, 0.0, 0.02); g.add(shin);
          // Bony foot
          const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.14), boneMat);
          foot.position.set(s, -0.15, 0.04); g.add(foot);
        }
        // Rusty sword
        const sword = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.03),
          new THREE.MeshStandardMaterial({ color: 0x777788, metalness: 0.6, roughness: 0.5 }));
        sword.position.set(0.5, 0.9, 0.2); g.add(sword);
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.05),
          new THREE.MeshStandardMaterial({ color: 0x665544 }));
        guard.position.set(0.5, 0.5, 0.2); g.add(guard);
        break;
      }
      case "wraith": {
        // Flowing spectral robes
        const robeMat = new THREE.MeshStandardMaterial({
          color: 0x6633cc, transparent: true, opacity: 0.6,
          emissive: 0x4422aa, emissiveIntensity: 0.6, side: THREE.DoubleSide,
        });
        // Main robe (cone tapering down to wispy tendrils)
        const robe = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.2, 16), robeMat);
        robe.position.y = 1.1; g.add(robe);
        // Inner darker robe layer
        const inner = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.8, 12),
          new THREE.MeshStandardMaterial({ color: 0x331166, transparent: true, opacity: 0.8, emissive: 0x220066, emissiveIntensity: 0.4 }));
        inner.position.y = 1.2; g.add(inner);
        // Hood
        const hood = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0x442288, emissive: 0x221144, emissiveIntensity: 0.3 }));
        hood.position.y = 2.1; hood.scale.set(1, 1.1, 0.9); g.add(hood);
        // Void face (dark recessed)
        const voidFace = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10),
          new THREE.MeshBasicMaterial({ color: 0x110022 }));
        voidFace.position.set(0, 2.05, 0.2); g.add(voidFace);
        // Glowing eyes
        for (const s of [-0.08, 0.08]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshBasicMaterial({ color: 0xeeddff }));
          eye.position.set(s, 2.08, 0.3); g.add(eye);
        }
        // Ghostly trailing wisps
        for (let i = 0; i < 3; i++) {
          const wisp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.08, 0.8, 10),
            new THREE.MeshBasicMaterial({ color: 0x8866cc, transparent: true, opacity: 0.3 }));
          wisp.position.set((i - 1) * 0.25, -0.1, 0); wisp.rotation.z = (i - 1) * 0.15; g.add(wisp);
        }
        // Soul orb in hands
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10),
          new THREE.MeshBasicMaterial({ color: 0xaa88ff }));
        orb.position.set(0, 1.5, 0.4); g.add(orb);
        break;
      }
      case "golem": {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.95, metalness: 0.1 });
        // Massive torso (irregular box)
        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.8, 1.0), rockMat);
        torso.position.y = 1.2; torso.castShadow = true; g.add(torso);
        // Rocky surface bumps on torso
        for (const bump of [
          { x: 0.5, y: 1.6, z: 0.45, s: 0.18 },
          { x: -0.4, y: 0.9, z: 0.48, s: 0.15 },
          { x: 0.3, y: 0.6, z: 0.42, s: 0.12 },
          { x: -0.2, y: 1.8, z: 0.4, s: 0.14 },
        ]) {
          const rock = new THREE.Mesh(new THREE.SphereGeometry(bump.s, 8, 6), rockMat);
          rock.position.set(bump.x, bump.y, bump.z);
          rock.scale.set(1.2, 0.8, 0.7);
          g.add(rock);
        }
        // Belly boulder
        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), rockMat);
        belly.position.set(0, 0.8, 0.3); g.add(belly);
        // Head (small, sunken into shoulders)
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.55),
          new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.9 }));
        head.position.y = 2.3; g.add(head);
        // Heavy brow ridge
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 }));
        brow.position.set(0, 2.45, 0.15); g.add(brow);
        // Glowing cracks (more extensive, wrapping around body)
        const crackMat = new THREE.MeshBasicMaterial({ color: 0xff6622 });
        for (const crack of [
          { x: 0.2, y: 1.0, z: 0.51, w: 0.06, h: 1.2 },
          { x: -0.3, y: 1.3, z: 0.51, w: 0.05, h: 0.8 },
          { x: 0.1, y: 0.7, z: 0.51, w: 0.04, h: 0.6 },
          { x: -0.5, y: 1.0, z: 0.51, w: 0.035, h: 0.5 },
          { x: 0.4, y: 1.6, z: 0.51, w: 0.04, h: 0.7 },
        ]) {
          const cm = new THREE.Mesh(new THREE.BoxGeometry(crack.w, crack.h, 0.01), crackMat);
          cm.position.set(crack.x, crack.y, crack.z); g.add(cm);
        }
        // Side cracks
        for (const crack of [
          { x: 0.66, y: 1.1, z: 0.2, rY: Math.PI / 2, w: 0.04, h: 0.9 },
          { x: -0.66, y: 1.4, z: -0.1, rY: Math.PI / 2, w: 0.035, h: 0.6 },
        ]) {
          const cm = new THREE.Mesh(new THREE.BoxGeometry(crack.w, crack.h, 0.01), crackMat);
          cm.position.set(crack.x, crack.y, crack.z); cm.rotation.y = crack.rY; g.add(cm);
        }
        // Glowing core (visible through cracks, larger and brighter)
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12),
          new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.4 }));
        core.position.set(0, 1.1, 0.15); g.add(core);
        // Core pulsing outer shell
        const coreOuter = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12),
          new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.1 }));
        coreOuter.position.set(0, 1.1, 0.15); g.add(coreOuter);
        // Heavy arms (thick cylinders with fist spheres)
        for (const s of [-1, 1]) {
          const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 1.0, 16), rockMat);
          upper.position.set(s * 0.85, 1.4, 0); upper.rotation.z = s * 0.2; g.add(upper);
          // Arm crack
          const armCrack = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.01), crackMat);
          armCrack.position.set(s * 0.85, 1.4, 0.21); g.add(armCrack);
          const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.9, 16), rockMat);
          lower.position.set(s * 1.0, 0.6, 0.1); g.add(lower);
          const fist = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), rockMat);
          fist.position.set(s * 1.0, 0.15, 0.15); g.add(fist);
        }
        // Stumpy legs
        for (const s of [-0.35, 0.35]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.6, 16), rockMat);
          leg.position.set(s, 0.1, 0); g.add(leg);
        }
        // Inner glow (overall aura)
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12),
          new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.06 }));
        glow.position.y = 1.0; g.add(glow);
        break;
      }
      case "boss": {
        const demonMat = new THREE.MeshStandardMaterial({ color: 0x441122, metalness: 0.5, roughness: 0.4 });
        // Armored torso
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 2.4, 16), demonMat);
        torso.position.y = 1.5; torso.castShadow = true; g.add(torso);
        // Chest plate (darker, metallic)
        const plate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x331111, metalness: 0.8, roughness: 0.2 }));
        plate.position.set(0, 1.7, 0.35); g.add(plate);
        // Massive shoulders
        for (const s of [-0.9, 0.9]) {
          const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10),
            new THREE.MeshStandardMaterial({ color: 0x551122, metalness: 0.6 }));
          shoulder.position.set(s, 2.5, 0); shoulder.scale.set(1.3, 0.8, 1); g.add(shoulder);
          // Shoulder spike
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 10),
            new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0x440000, emissiveIntensity: 0.3 }));
          spike.position.set(s * 1.1, 2.7, 0); spike.rotation.z = s * -0.5; g.add(spike);
        }
        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), demonMat);
        head.position.y = 3.0; head.scale.set(1, 1.1, 0.9); g.add(head);
        // Crown/horns (larger, more dramatic)
        for (const s of [-0.35, 0.35]) {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 1.0, 10),
            new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0x660000, emissiveIntensity: 0.5 }));
          horn.position.set(s, 3.5, 0); horn.rotation.z = s > 0 ? -0.25 : 0.25; g.add(horn);
        }
        // Glowing eyes
        for (const s of [-0.12, 0.12]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
          eye.position.set(s, 3.05, 0.32); g.add(eye);
        }
        // Arms with gauntlets
        for (const s of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 1.2, 12), demonMat);
          arm.position.set(s * 1.0, 1.8, 0.1); arm.rotation.z = s * 0.15; g.add(arm);
          const gauntlet = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.4, 12),
            new THREE.MeshStandardMaterial({ color: 0x331111, metalness: 0.7 }));
          gauntlet.position.set(s * 1.0, 1.1, 0.15); g.add(gauntlet);
        }
        // Massive weapon (greatsword with glow)
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.06),
          new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.9, emissive: 0x880000, emissiveIntensity: 0.5 }));
        blade.position.set(1.2, 1.6, 0.3); blade.rotation.z = -0.1; g.add(blade);
        const bladeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.3, 0.02),
          new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.15 }));
        bladeGlow.position.set(1.2, 1.6, 0.32); g.add(bladeGlow);
        // Legs
        for (const s of [-0.3, 0.3]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.0, 12), demonMat);
          leg.position.set(s, 0.2, 0); g.add(leg);
        }
        // Demonic aura (pulsing)
        const aura = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 12),
          new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.06 }));
        aura.position.y = 1.5; g.add(aura);
        break;
      }
      case "champion": {
        // Armored knight (mirror of player but different color)
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.5, 1.8, 16),
          new THREE.MeshStandardMaterial({ color: 0x993333, metalness: 0.7, roughness: 0.3 }),
        );
        body.position.y = 0.9;
        body.castShadow = true;
        g.add(body);
        const helmet = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0xaa4444, metalness: 0.8 }),
        );
        helmet.position.y = 2.0;
        helmet.scale.y = 1.2;
        g.add(helmet);
        // Plume
        const plume = new THREE.Mesh(
          new THREE.ConeGeometry(0.1, 0.6, 10),
          new THREE.MeshStandardMaterial({ color: 0xff2222 }),
        );
        plume.position.set(0, 2.4, -0.1);
        g.add(plume);
        // Sword
        const sword = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 1.0, 0.04),
          new THREE.MeshStandardMaterial({ color: 0xddddee, metalness: 0.9 }),
        );
        sword.position.set(0.5, 1.2, 0.2);
        g.add(sword);
        break;
      }
      case "skeleton_archer": {
        // Similar to skeleton but with a bow
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.3, 1.5, 16),
          new THREE.MeshStandardMaterial({ color: 0xbbaa88, roughness: 0.8 }),
        );
        body.position.y = 0.75;
        body.castShadow = true;
        g.add(body);
        const skull = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0xccbbaa }),
        );
        skull.position.y = 1.65;
        g.add(skull);
        // Jaw
        const archerJaw = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.04, 0.1),
          new THREE.MeshStandardMaterial({ color: 0xbbaa88 }),
        );
        archerJaw.position.set(0, 1.5, 0.12);
        g.add(archerJaw);
        // Bow (arc shape)
        const bow = new THREE.Mesh(
          new THREE.TorusGeometry(0.4, 0.03, 10, 8, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0x664422 }),
        );
        bow.position.set(0.4, 1.0, 0.2);
        bow.rotation.z = Math.PI / 2;
        g.add(bow);
        // Orange eyes
        for (const side of [-0.06, 0.06]) {
          const eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 12, 10),
            new THREE.MeshBasicMaterial({ color: 0xff8844 }),
          );
          eye.position.set(side, 1.67, 0.18);
          g.add(eye);
        }
        break;
      }
      case "necromancer": {
        // Dark robed figure with green glow
        const robe = new THREE.Mesh(
          new THREE.ConeGeometry(0.5, 2.0, 12),
          new THREE.MeshStandardMaterial({
            color: 0x224422,
            emissive: 0x114411,
            emissiveIntensity: 0.4,
          }),
        );
        robe.position.y = 1;
        g.add(robe);
        // Hood/head
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0x112211 }),
        );
        head.position.y = 2.0;
        g.add(head);
        // Green glowing eyes
        for (const side of [-0.1, 0.1]) {
          const eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 12, 10),
            new THREE.MeshBasicMaterial({ color: 0x44ff44 }),
          );
          eye.position.set(side, 2.05, 0.25);
          g.add(eye);
        }
        // Staff
        const staff = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 2.5, 10),
          new THREE.MeshStandardMaterial({ color: 0x332211 }),
        );
        staff.position.set(0.4, 1.2, 0);
        g.add(staff);
        // Staff orb
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 12, 10),
          new THREE.MeshBasicMaterial({ color: 0x44ff44 }),
        );
        orb.position.set(0.4, 2.5, 0);
        g.add(orb);
        // Green aura
        const aura = new THREE.Mesh(
          new THREE.SphereGeometry(1.5, 16, 12),
          new THREE.MeshBasicMaterial({ color: 0x22aa22, transparent: true, opacity: 0.08 }),
        );
        aura.position.y = 1;
        g.add(aura);
        break;
      }
    }

    return g;
  }

  private _updatePillars(state: LotState): void {
    // Sync pillar meshes
    while (this._pillarMeshes.length > state.pillars.length) {
      const m = this._pillarMeshes.pop()!;
      this._scene.remove(m);
    }
    while (this._pillarMeshes.length < state.pillars.length) {
      const pil = state.pillars[this._pillarMeshes.length];
      const geo = new THREE.CylinderGeometry(pil.radius, pil.radius * 1.1, pil.height, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0x554466, roughness: 0.7, metalness: 0.2 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this._scene.add(mesh);
      this._pillarMeshes.push(mesh);
    }

    for (let i = 0; i < state.pillars.length; i++) {
      const pil = state.pillars[i];
      const mesh = this._pillarMeshes[i];
      if (pil.destroyed) {
        if (pil.crumbleTimer > 0) {
          // Crumble animation: sink and tilt
          mesh.visible = true;
          const t = 1 - pil.crumbleTimer / 2.0;
          mesh.position.set(pil.pos.x, pil.height / 2 - t * pil.height, pil.pos.z);
          mesh.rotation.x = t * 0.5;
          mesh.scale.setScalar(1 - t * 0.5);
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.opacity = pil.crumbleTimer / 2.0;
          mat.transparent = true;
        } else {
          mesh.visible = false;
        }
      } else {
        mesh.visible = true;
        mesh.position.set(pil.pos.x, pil.height / 2, pil.pos.z);
        mesh.rotation.x = 0;
        mesh.scale.setScalar(1);
        // Damage tint: redder as HP lowers
        const hpPct = pil.hp / LOT.PILLAR_HP;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.transparent = false;
        mat.opacity = 1;
        if (hpPct < 0.5) {
          mat.emissive.setHex(0x442200);
          mat.emissiveIntensity = (1 - hpPct) * 0.5;
        } else {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      }
    }
  }

  private _updateObstacles(state: LotState, rawDt: number): void {
    const alive = new Set<number>();

    for (const obs of state.obstacles) {
      alive.add(obs.id);
      let group = this._obstacleMeshes.get(obs.id);
      if (!group) {
        group = this._createObstacleMesh(obs);
        this._obstacleMeshes.set(obs.id, group);
        this._scene.add(group);
      }

      switch (obs.type) {
        case "spike_trap":
          group.position.set(obs.pos.x, obs.active ? 0 : -0.8, obs.pos.z);
          break;
        case "fire_pillar":
          group.position.set(obs.pos.x, obs.pos.y, obs.pos.z);
          group.rotation.y += rawDt * 2;
          break;
        case "pendulum": {
          const swing = Math.sin(obs.angle) * 8;
          group.position.set(obs.pos.x + swing, obs.pos.y, obs.pos.z);
          group.rotation.z = Math.sin(obs.angle) * 0.5;
          break;
        }
      }
    }

    for (const [id, group] of this._obstacleMeshes) {
      if (!alive.has(id)) {
        this._scene.remove(group);
        this._obstacleMeshes.delete(id);
      }
    }
  }

  private _createObstacleMesh(obs: Obstacle): THREE.Group {
    const g = new THREE.Group();
    switch (obs.type) {
      case "spike_trap": {
        // Metal spikes
        for (let i = 0; i < 5; i++) {
          const spike = new THREE.Mesh(
            new THREE.ConeGeometry(0.15, 1.2, 10),
            new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.8 }),
          );
          spike.position.set(rng() * 1.5 - 0.75, 0.6, rng() * 1.5 - 0.75);
          g.add(spike);
        }
        // Base plate
        const plate = new THREE.Mesh(
          new THREE.CylinderGeometry(obs.radius, obs.radius, 0.1, 8),
          new THREE.MeshStandardMaterial({ color: 0x554444 }),
        );
        g.add(plate);
        break;
      }
      case "fire_pillar": {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.4, 3, 12),
          new THREE.MeshStandardMaterial({ color: 0x442200 }),
        );
        pillar.position.y = 1.5;
        g.add(pillar);
        // Fire glow
        const fire = new THREE.Mesh(
          new THREE.SphereGeometry(obs.radius, 16, 12),
          new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.25 }),
        );
        fire.position.y = 2;
        g.add(fire);
        const light = new THREE.PointLight(0xff4400, 1.5, obs.radius * 3);
        light.position.y = 2;
        g.add(light);
        break;
      }
      case "pendulum": {
        // Chain
        const chain = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 6, 10),
          new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.8 }),
        );
        chain.position.y = 3;
        g.add(chain);
        // Heavy ball
        const ball = new THREE.Mesh(
          new THREE.SphereGeometry(0.8, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.7 }),
        );
        ball.position.y = 0;
        g.add(ball);
        // Spikes on ball
        for (let i = 0; i < 6; i++) {
          const spikeAngle = (i / 6) * TAU;
          const spike = new THREE.Mesh(
            new THREE.ConeGeometry(0.1, 0.4, 10),
            new THREE.MeshStandardMaterial({ color: 0x555566 }),
          );
          spike.position.set(Math.cos(spikeAngle) * 0.7, Math.sin(spikeAngle) * 0.7, 0);
          spike.rotation.z = spikeAngle - Math.PI / 2;
          g.add(spike);
        }
        break;
      }
    }
    return g;
  }

  private _updateTreasures(state: LotState, dt: number): void {
    const alive = new Set<number>();

    for (const t of state.treasures) {
      if (t.collected) continue;
      alive.add(t.id);

      let group = this._treasureMeshes.get(t.id);
      if (!group) {
        group = this._createTreasureMesh(t);
        this._treasureMeshes.set(t.id, group);
        this._scene.add(group);
      }

      // Floating bob
      group.position.set(t.pos.x, t.pos.y + Math.sin(t.glowTimer) * 0.3, t.pos.z);
      group.rotation.y += dt * 2;
    }

    for (const [id, group] of this._treasureMeshes) {
      if (!alive.has(id)) {
        this._scene.remove(group);
        this._treasureMeshes.delete(id);
      }
    }
  }

  private _createTreasureMesh(t: Treasure): THREE.Group {
    const g = new THREE.Group();
    const color = t.type === "fortune" ? 0xffd700 : t.type === "heal" ? 0x44ff44 : 0xffdd00;

    // Gem
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5),
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.6,
        roughness: 0.2,
        emissive: color,
        emissiveIntensity: 0.5,
      }),
    );
    gem.castShadow = true;
    g.add(gem);

    // Glow
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 16, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2 }),
    );
    g.add(glow);

    // Light
    const light = new THREE.PointLight(color, 0.8, 8);
    g.add(light);

    return g;
  }

  private _updateFateWheel(state: LotState, dt: number): void {
    if (state.phase === "draw") {
      const progress = 1 - state.phaseTimer / LOT.DRAW_PHASE_DURATION;
      // Fast start, decelerating to stop (like a real wheel)
      const spinSpeed = 12 * Math.pow(1 - progress, 1.5) + 0.5;
      this._fateWheel.rotation.z += spinSpeed * dt;
      // Lower and grow during draw
      this._fateWheel.position.y = 35 - progress * 12;
      this._fateWheel.scale.setScalar(1 + progress * 0.15);
      // Spawn light ray particles around wheel
      if (state.tick % 3 === 0 && progress < 0.8) {
        const angle = rng() * Math.PI * 2;
        const r = 7;
        state.particles.push({
          pos: { x: Math.cos(angle) * r, y: this._fateWheel.position.y, z: Math.sin(angle) * r },
          vel: { x: Math.cos(angle) * 3, y: (rng() * 2 - 1), z: Math.sin(angle) * 3 },
          life: 0.8, maxLife: 0.8, color: "#ffd700", size: 0.2,
        });
      }
      // Final reveal: flash
      if (progress > 0.58 && progress < 0.62) {
        state.screenFlash = 0.3;
        state.screenFlashColor = "#ffd700";
      }
    } else {
      this._fateWheel.rotation.z += 0.2 * dt;
      this._fateWheel.position.y += (35 - this._fateWheel.position.y) * dt * 2;
      this._fateWheel.scale.setScalar(1);
    }
  }

  private _updateCurseRing(state: LotState): void {
    if (state.currentLot === "cursed_arena" && state.phase === "active") {
      const mat = this._curseRing.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.6;
      // Update ring geometry to match curse radius
      this._curseRing.scale.setScalar(state.curseRadius / LOT.ARENA_RADIUS);
    } else {
      (this._curseRing.material as THREE.MeshStandardMaterial).opacity = 0;
    }
  }

  private _updateParticles(state: LotState): void {
    const count = Math.min(state.particles.length, this._maxParticles);
    this._particleInstancedMesh.count = count;

    for (let i = 0; i < count; i++) {
      const p = state.particles[i];
      const alpha = p.life / p.maxLife;
      this._particleDummy.position.set(p.pos.x, p.pos.y, p.pos.z);
      this._particleDummy.scale.setScalar(p.size * alpha);
      this._particleDummy.updateMatrix();
      this._particleInstancedMesh.setMatrixAt(i, this._particleDummy.matrix);
      this._particleInstancedMesh.setColorAt(i, this._tmpColor.set(p.color));
    }

    this._particleInstancedMesh.instanceMatrix.needsUpdate = true;
    if (this._particleInstancedMesh.instanceColor) {
      this._particleInstancedMesh.instanceColor.needsUpdate = true;
    }
  }

  private _updateLighting(state: LotState, dt: number): void {
    // Change atmosphere based on current lot
    if (state.currentLot && state.phase === "active") {
      const display = LOT_DISPLAY[state.currentLot];
      const targetColor = new THREE.Color(display.color);
      this._ambientLight.color.lerp(targetColor, dt * 0.5);
      this._ambientLight.intensity = 0.5;

      // Point light flicker
      for (const pl of this._pointLights) {
        pl.intensity = 0.6 + Math.sin(state.gameTime * 3 + pl.position.x) * 0.3;
      }
    } else {
      this._ambientLight.color.lerp(new THREE.Color(0x332244), dt);
      this._ambientLight.intensity = 0.6;
    }

    // Pulsing floor runes
    for (let i = 0; i < this._runeMeshes.length; i++) {
      const rune = this._runeMeshes[i];
      const mat = rune.material as THREE.MeshStandardMaterial;
      const pulse = 0.4 + Math.sin(state.gameTime * 2 + i * 0.5) * 0.3;
      mat.emissiveIntensity = pulse;
      mat.opacity = 0.4 + pulse * 0.3;

      // Runic overcharge: runes that are about to explode glow bright
      if (state.mutation === "runic_overcharge" && i < state.runicExplosions.length) {
        const explosion = state.runicExplosions[i];
        if (explosion.warned) {
          mat.emissive.setHex(0xff4444);
          mat.emissiveIntensity = 2.0 + Math.sin(state.gameTime * 15) * 1.0;
          mat.opacity = 1.0;
          // Scale up as warning
          rune.scale.setScalar(1 + (1 - explosion.timer / LOT.RUNIC_WARN_TIME) * 0.5);
        } else {
          mat.emissive.setHex(0x4422aa);
          rune.scale.setScalar(1);
        }
      }

      // Combo intensity: runes glow brighter with combo
      if (state.player.comboCount > 3) {
        mat.emissiveIntensity += state.player.comboCount * 0.05;
      }
    }
  }

  private _updateProjectiles(state: LotState): void {
    const alive = new Set<number>();
    for (const proj of state.projectiles) {
      alive.add(proj.id);
      let mesh = this._projectileMeshes.get(proj.id);
      if (!mesh) {
        const group = new THREE.Group();
        // Core
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(proj.radius, 12, 10),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(proj.color) }),
        );
        group.add(core);
        // Glow trail
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(proj.radius * 2.5, 12, 10),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(proj.color),
            transparent: true,
            opacity: 0.2,
          }),
        );
        group.add(glow);
        // Point light
        const light = new THREE.PointLight(new THREE.Color(proj.color).getHex(), 0.6, 6);
        group.add(light);
        mesh = group as unknown as THREE.Mesh;
        this._projectileMeshes.set(proj.id, mesh);
        this._scene.add(mesh);
      }
      mesh.position.set(proj.pos.x, proj.pos.y, proj.pos.z);
      // Spin
      mesh.rotation.x += 0.15;
      mesh.rotation.z += 0.1;
    }
    for (const [id, mesh] of this._projectileMeshes) {
      if (!alive.has(id)) {
        this._scene.remove(mesh);
        this._projectileMeshes.delete(id);
      }
    }
  }

  private _updateShockwaves(state: LotState): void {
    // Remove old rings
    for (const ring of this._shockwaveRings) this._scene.remove(ring);
    this._shockwaveRings = [];

    for (const sw of state.shockwaves) {
      const geo = new THREE.RingGeometry(Math.max(0, sw.radius - 0.5), sw.radius + 0.5, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff8844,
        transparent: true,
        opacity: 1 - sw.radius / sw.maxRadius,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(sw.pos.x, 0.1, sw.pos.z);
      this._scene.add(ring);
      this._shockwaveRings.push(ring);
    }
  }

  private _updateSwordTrail(state: LotState): void {
    const trail = state.swordTrail;
    const positions = this._swordTrailGeo.attributes.position as THREE.BufferAttribute;
    const arr = positions.array as Float32Array;

    const showTrail = state.player.attackTimer > 0 || state.player.heavyCharging || state.player.whirlwindActive > 0;
    const mat = this._swordTrailMesh.material as THREE.MeshBasicMaterial;
    mat.opacity = showTrail ? 0.5 : 0;

    // Ribbon: for each trail point, create top and bottom vertices
    const ribbonWidth = 0.6;
    for (let i = 0; i < 12; i++) {
      const t = i < trail.length ? trail[i] : (trail.length > 0 ? trail[trail.length - 1] : { x: 0, y: 0, z: 0 });
      const fade = i / 12; // Thinner at tail
      const w = ribbonWidth * fade;
      arr[i * 6 + 0] = t.x;
      arr[i * 6 + 1] = t.y + w;
      arr[i * 6 + 2] = t.z;
      arr[i * 6 + 3] = t.x;
      arr[i * 6 + 4] = t.y - w;
      arr[i * 6 + 5] = t.z;
    }
    positions.needsUpdate = true;

    // Color based on state
    if (state.player.heavyCharging) {
      mat.color.setHex(0xffaa22);
    } else if (state.player.comboCount > 5) {
      mat.color.setHex(0xff6644);
    } else if (state.player.whirlwindActive > 0) {
      mat.color.setHex(0x44ccff);
    } else {
      mat.color.setHex(0x88ccff);
    }
  }

  private _updateEnemyHpBars(state: LotState): void {
    const alive = new Set<number>();
    for (const e of state.enemies) {
      if (e.dead || e.hp >= e.maxHp) continue; // Only show when damaged
      alive.add(e.id);
      let group = this._hpBarMeshes.get(e.id);
      if (!group) {
        group = new THREE.Group();
        // Background bar
        const bg = new THREE.Mesh(
          new THREE.PlaneGeometry(1.4, 0.15),
          new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
        );
        group.add(bg);
        // Fill bar
        const fill = new THREE.Mesh(
          new THREE.PlaneGeometry(1.3, 0.1),
          new THREE.MeshBasicMaterial({ color: e.elite ? 0xffd700 : 0xff4444, side: THREE.DoubleSide }),
        );
        fill.position.z = 0.01;
        group.add(fill);
        this._hpBarMeshes.set(e.id, group);
        this._scene.add(group);
      }
      // Position above enemy
      const height = e.type === "boss" ? 4.5 : e.type === "golem" ? 3.5 : 2.5;
      group.position.set(e.pos.x, e.pos.y + height, e.pos.z);
      group.lookAt(this._camera.position);
      // Scale fill bar by HP percentage
      const fill = group.children[1] as THREE.Mesh;
      const pct = e.hp / e.maxHp;
      fill.scale.x = Math.max(0.01, pct);
      fill.position.x = -(1 - pct) * 0.65;
      // Color: green → yellow → red
      const mat = fill.material as THREE.MeshBasicMaterial;
      if (e.elite) mat.color.setHex(0xffd700);
      else if (pct > 0.5) mat.color.setHex(0x44cc44);
      else if (pct > 0.25) mat.color.setHex(0xcccc22);
      else mat.color.setHex(0xcc2222);
    }
    for (const [id, group] of this._hpBarMeshes) {
      if (!alive.has(id)) {
        this._scene.remove(group);
        this._hpBarMeshes.delete(id);
      }
    }
  }

  private _updateWhirlwind(state: LotState): void {
    if (state.player.whirlwindActive > 0) {
      if (!this._whirlwindRing) {
        const geo = new THREE.RingGeometry(LOT.WHIRLWIND_RADIUS - 0.3, LOT.WHIRLWIND_RADIUS + 0.3, 32);
        const mat = new THREE.MeshBasicMaterial({
          color: 0x88ccff, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
        });
        this._whirlwindRing = new THREE.Mesh(geo, mat);
        this._whirlwindRing.rotation.x = -Math.PI / 2;
        this._scene.add(this._whirlwindRing);
      }
      this._whirlwindRing.position.set(state.player.pos.x, state.player.pos.y + 0.5, state.player.pos.z);
      this._whirlwindRing.rotation.z += 0.15;
      (this._whirlwindRing.material as THREE.MeshBasicMaterial).opacity = state.player.whirlwindActive * 0.5;
    } else if (this._whirlwindRing) {
      this._scene.remove(this._whirlwindRing);
      this._whirlwindRing = null;
    }
  }

  private _updateTelegraphs(state: LotState): void {
    // Remove old
    for (const m of this._telegraphMeshes) this._scene.remove(m);
    this._telegraphMeshes = [];

    for (const t of state.telegraphs) {
      const progress = 1 - t.timer / t.maxTimer;
      const geo = new THREE.RingGeometry(0, t.radius * progress, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(t.color),
        transparent: true,
        opacity: 0.3 * (1 - progress),
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(t.pos.x, 0.05, t.pos.z);
      this._scene.add(mesh);
      this._telegraphMeshes.push(mesh);

      // Pulsing edge ring
      const edgeGeo = new THREE.RingGeometry(t.radius * progress - 0.2, t.radius * progress + 0.2, 32);
      const edgeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(t.color),
        transparent: true,
        opacity: 0.6 + Math.sin(state.gameTime * 15) * 0.3,
        side: THREE.DoubleSide,
      });
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(t.pos.x, 0.06, t.pos.z);
      this._scene.add(edge);
      this._telegraphMeshes.push(edge);
    }
  }

  private _updateShrines(state: LotState, dt: number): void {
    const alive = new Set<string>();
    for (const s of state.shrines) {
      if (s.collected) continue;
      const key = `${s.pos.x}_${s.pos.z}`;
      alive.add(key);
      let group = this._shrineMeshes.get(key);
      if (!group) {
        group = new THREE.Group();
        const color = s.type === "power" ? 0xff6644 : s.type === "speed" ? 0x44ccff : 0x88aacc;
        // Pillar
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.4, 1.5, 12),
          new THREE.MeshStandardMaterial({ color: 0x554466 }),
        );
        pillar.position.y = 0.75;
        group.add(pillar);
        // Floating orb
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 16, 12),
          new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8 }),
        );
        orb.position.y = 2;
        group.add(orb);
        // Light
        const light = new THREE.PointLight(color, 1.0, 8);
        light.position.y = 2;
        group.add(light);
        // Ground glow
        const glow = new THREE.Mesh(
          new THREE.CircleGeometry(2, 16),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15 }),
        );
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = 0.02;
        group.add(glow);

        group.position.set(s.pos.x, 0, s.pos.z);
        this._shrineMeshes.set(key, group);
        this._scene.add(group);
      }
      // Orb bob
      const orb = group.children[1] as THREE.Mesh;
      orb.position.y = 2 + Math.sin(state.gameTime * 2) * 0.3;
      orb.rotation.y += dt * 2;
    }
    for (const [key, group] of this._shrineMeshes) {
      if (!alive.has(key)) {
        this._scene.remove(group);
        this._shrineMeshes.delete(key);
      }
    }
  }

  private _updateDecals(state: LotState): void {
    // Sync decal meshes
    while (this._decalMeshes.length > state.decals.length) {
      const m = this._decalMeshes.pop()!;
      this._scene.remove(m);
    }
    while (this._decalMeshes.length < state.decals.length) {
      const d = state.decals[this._decalMeshes.length];
      const geo = new THREE.CircleGeometry(d.radius, 12);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(d.color),
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(d.pos.x, 0.02, d.pos.z);
      this._scene.add(mesh);
      this._decalMeshes.push(mesh);
    }
    // Update opacity based on life
    for (let i = 0; i < state.decals.length && i < this._decalMeshes.length; i++) {
      const d = state.decals[i];
      const m = this._decalMeshes[i];
      (m.material as THREE.MeshBasicMaterial).opacity = Math.min(0.4, d.life * 0.1);
      m.position.set(d.pos.x, 0.02, d.pos.z);
    }
  }

  private _updateAttackArc(state: LotState): void {
    if (state.attackArcTimer > 0) {
      if (!this._attackArc) {
        const radius = state.attackArcHeavy ? LOT.HEAVY_RANGE : LOT.ATTACK_RANGE;
        const geo = new THREE.RingGeometry(0.5, radius, 16, 1, -Math.PI / 3, Math.PI / 1.5);
        const mat = new THREE.MeshBasicMaterial({
          color: state.attackArcHeavy ? 0xffaa22 : 0x88ccff,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        this._attackArc = new THREE.Mesh(geo, mat);
        this._scene.add(this._attackArc);
      }
      const p = state.player;
      this._attackArc.position.set(p.pos.x, 0.1, p.pos.z);
      this._attackArc.rotation.x = -Math.PI / 2;
      this._attackArc.rotation.z = -p.yaw;
      (this._attackArc.material as THREE.MeshBasicMaterial).opacity = state.attackArcTimer * 1.5;
      // Expand outward
      const t = 1 - state.attackArcTimer / (state.attackArcHeavy ? 0.3 : 0.2);
      this._attackArc.scale.setScalar(0.6 + t * 0.5);
    } else if (this._attackArc) {
      this._scene.remove(this._attackArc);
      this._attackArc = null;
    }
  }

  private _updateReflectBubble(state: LotState): void {
    if (state.player.reflectActive > 0) {
      if (!this._reflectBubble) {
        const geo = new THREE.SphereGeometry(2.5, 16, 12);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffdd44,
          transparent: true,
          opacity: 0.12,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        this._reflectBubble = new THREE.Mesh(geo, mat);
        this._scene.add(this._reflectBubble);
      }
      const p = state.player;
      this._reflectBubble.position.set(p.pos.x, p.pos.y + 1, p.pos.z);
      const pulse = 0.08 + Math.sin(state.gameTime * 12) * 0.06;
      (this._reflectBubble.material as THREE.MeshBasicMaterial).opacity = pulse;
      this._reflectBubble.scale.setScalar(1 + Math.sin(state.gameTime * 8) * 0.05);
    } else if (this._reflectBubble) {
      this._scene.remove(this._reflectBubble);
      this._reflectBubble = null;
    }
  }

  private _updateScreenFlash(state: LotState): void {
    if (state.screenFlash > 0.01) {
      this._flashOverlay.style.opacity = String(state.screenFlash);
      this._flashOverlay.style.background = state.screenFlashColor;
    } else {
      this._flashOverlay.style.opacity = "0";
    }
  }

  private _updateHexGrid(state: LotState): void {
    if (this._hexGridMat) {
      this._hexGridMat.uniforms.uTime.value = state.gameTime;
      this._hexGridMat.uniforms.uPlayerPos.value.set(state.player.pos.x, state.player.pos.z);
      // Intensity scales with combat (combo, active phase)
      const comboPulse = Math.min(state.player.comboCount * 0.02, 0.15);
      this._hexGridMat.uniforms.uIntensity.value = state.phase === "active" ? 0.15 + comboPulse : 0.08;
      // Color shifts per mutation
      if (state.mutation === "frozen") this._hexGridMat.uniforms.uColor.value.setHex(0x4488cc);
      else if (state.mutation === "blood_moon") this._hexGridMat.uniforms.uColor.value.setHex(0xaa2222);
      else this._hexGridMat.uniforms.uColor.value.setHex(0x6644aa);
    }
  }

  private _updateBrazierFire(state: LotState): void {
    for (let i = 0; i < this._braziers.length; i++) {
      const g = this._braziers[i];
      // Flicker fire core
      const fire = g.children[2] as THREE.Mesh;
      const scale = 0.8 + Math.sin(state.gameTime * 8 + i * 2) * 0.3 + Math.sin(state.gameTime * 13 + i) * 0.15;
      fire.scale.setScalar(scale);
      // Flicker point light
      const light = g.children[4] as THREE.PointLight;
      light.intensity = 1.0 + Math.sin(state.gameTime * 6 + i * 1.5) * 0.4;
      // Spawn occasional fire particles upward
      if (state.tick % 8 === i) {
        const bPos = g.position;
        state.particles.push({
          pos: { x: bPos.x + (rng() - 0.5) * 0.3, y: 2.5, z: bPos.z + (rng() - 0.5) * 0.3 },
          vel: { x: (rng() - 0.5) * 0.5, y: rng() * 2 + 1, z: (rng() - 0.5) * 0.5 },
          life: rng() * 0.6 + 0.3, maxLife: 0.9, color: rng() > 0.5 ? "#ff6622" : "#ffaa22", size: rng() * 0.12 + 0.05,
        });
      }
    }
  }

  private _updateAfterimages(dt: number): void {
    for (const ai of this._afterimages) {
      ai.life -= dt;
      (ai.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, ai.life * 1.3);
      ai.mesh.scale.multiplyScalar(0.95);
    }
    const expired = this._afterimages.filter(ai => ai.life <= 0);
    for (const ai of expired) this._scene.remove(ai.mesh);
    this._afterimages = this._afterimages.filter(ai => ai.life > 0);
  }

  private _updateDmgNumbers(state: LotState): void {
    // Create sprites for new damage numbers
    for (const dn of state.damageNumbers) {
      // Only create if not already tracked (check by approximate position match)
      const alreadyTracked = this._dmgNumberSprites.some(s =>
        Math.abs(s.sprite.position.x - dn.pos.x) < 0.1 &&
        Math.abs(s.sprite.position.z - dn.pos.z) < 0.1 &&
        s.life > dn.timer - 0.05,
      );
      if (alreadyTracked) continue;

      // Create canvas texture for the number
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.font = dn.crit ? "bold 48px Arial" : "bold 36px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillText(String(dn.value), 66, 34);
      // Main text
      ctx.fillStyle = dn.crit ? "#ffdd44" : "#ffffff";
      ctx.fillText(String(dn.value), 64, 32);

      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        blending: THREE.NormalBlending,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(dn.pos.x, dn.pos.y, dn.pos.z);
      sprite.scale.set(dn.crit ? 2.5 : 1.8, dn.crit ? 1.25 : 0.9, 1);
      this._scene.add(sprite);
      this._dmgNumberSprites.push({ sprite, life: dn.timer });
    }

    // Update existing
    for (const s of this._dmgNumberSprites) {
      s.life -= 0.016;
      s.sprite.position.y += 0.04;
      s.sprite.material.opacity = Math.min(1, s.life * 2);
      // Crits scale up briefly
      if (s.life > 0.8) {
        const t = (1 - s.life) / 0.2;
        s.sprite.scale.x *= 1 + t * 0.05;
      }
    }

    // Remove expired
    const expired = this._dmgNumberSprites.filter(s => s.life <= 0);
    for (const s of expired) {
      this._scene.remove(s.sprite);
      s.sprite.material.map?.dispose();
      s.sprite.material.dispose();
    }
    this._dmgNumberSprites = this._dmgNumberSprites.filter(s => s.life > 0);
  }

  private _updateDust(state: LotState, dt: number): void {
    if (!this._dustMesh) return;

    for (let i = 0; i < this._dustCount; i++) {
      // Move
      this._dustPositions[i * 3] += this._dustVelocities[i * 3] * dt;
      this._dustPositions[i * 3 + 1] += this._dustVelocities[i * 3 + 1] * dt;
      this._dustPositions[i * 3 + 2] += this._dustVelocities[i * 3 + 2] * dt;

      // Wrap around arena
      const x = this._dustPositions[i * 3];
      const z = this._dustPositions[i * 3 + 2];
      if (x * x + z * z > LOT.ARENA_RADIUS * LOT.ARENA_RADIUS) {
        const angle = rng() * TAU;
        const r = rng() * LOT.ARENA_RADIUS * 0.8;
        this._dustPositions[i * 3] = Math.cos(angle) * r;
        this._dustPositions[i * 3 + 2] = Math.sin(angle) * r;
      }
      // Reset if too high
      if (this._dustPositions[i * 3 + 1] > 10) {
        this._dustPositions[i * 3 + 1] = 0.5;
      }

      // Wind sway
      this._dustVelocities[i * 3] += (rng() - 0.5) * 0.02;
      this._dustVelocities[i * 3] *= 0.99;
      this._dustVelocities[i * 3 + 2] += (rng() - 0.5) * 0.02;
      this._dustVelocities[i * 3 + 2] *= 0.99;

      this._dustDummy.position.set(
        this._dustPositions[i * 3],
        this._dustPositions[i * 3 + 1],
        this._dustPositions[i * 3 + 2],
      );
      const flicker = 0.5 + Math.sin(state.gameTime * 2 + i) * 0.3;
      this._dustDummy.scale.setScalar(flicker);
      this._dustDummy.updateMatrix();
      this._dustMesh.setMatrixAt(i, this._dustDummy.matrix);
    }
    this._dustMesh.instanceMatrix.needsUpdate = true;

    // Change dust color by mutation
    const dustMat = this._dustMesh.material as THREE.MeshBasicMaterial;
    if (state.mutation === "blood_moon") dustMat.color.setHex(0xff4422);
    else if (state.mutation === "frozen") dustMat.color.setHex(0x88ccff);
    else dustMat.color.setHex(0xffaa66);
  }

  private _updateSkyDetails(state: LotState): void {
    // Cloud drift
    if (this._cloudLayer?.material && 'uniforms' in this._cloudLayer.material) {
      (this._cloudLayer.material as THREE.ShaderMaterial).uniforms.uTime.value = state.gameTime;
      // More cloud opacity during blood moon
      const opacity = state.mutation === "blood_moon" ? 0.12 : state.mutation === "fog" ? 0.15 : 0.06;
      (this._cloudLayer.material as THREE.ShaderMaterial).uniforms.uOpacity.value = opacity;
    }
    // Slow cloud rotation
    if (this._cloudLayer) {
      this._cloudLayer.rotation.z += 0.0003;
    }
    // Moon tint by mutation
    if (this._moon) {
      const moonMat = this._moon.material as THREE.MeshBasicMaterial;
      if (state.mutation === "blood_moon") {
        moonMat.color.setHex(0xff4444);
        moonMat.opacity = 0.9;
      } else {
        moonMat.color.setHex(0xddeeff);
        moonMat.opacity = 0.7;
      }
    }
  }

  private _updateVignette(state: LotState): void {
    if (!this._vignettePass) return;
    const p = state.player;
    const hpPct = p.hp / p.maxHp;
    // Red vignette at low HP, stronger as HP drops
    if (hpPct < 0.3 && state.phase === "active") {
      const pulse = 0.3 + Math.sin(state.gameTime * (4 + (1 - hpPct) * 8)) * 0.15;
      this._vignettePass.uniforms.uIntensity.value = pulse + (1 - hpPct) * 0.4;
      this._vignettePass.uniforms.uColor.value.set(0.4, 0.0, 0.0);
    } else {
      this._vignettePass.uniforms.uIntensity.value = 0.35;
      this._vignettePass.uniforms.uColor.value.set(0, 0, 0);
    }
    // Bloom intensity during combat
    if (this._bloomPass) {
      this._bloomPass.strength = state.phase === "active"
        ? 0.6 + Math.min(p.comboCount * 0.03, 0.3)
        : state.phase === "draw" ? 0.8 : 0.5;
    }
  }

  private _updateMinimap(state: LotState): void {
    if (state.phase !== "active" && state.phase !== "draw") {
      this._minimapCanvas.style.display = "none";
      return;
    }
    this._minimapCanvas.style.display = "block";
    const ctx = this._minimapCtx;
    const w = 150, h = 150, cx = w / 2, cy = h / 2;
    const scale = (w / 2) / LOT.ARENA_RADIUS;

    ctx.clearRect(0, 0, w, h);

    // Arena circle
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15,10,30,0.8)";
    ctx.fill();
    ctx.strokeStyle = "#44338888";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Curse radius
    if (state.currentLot === "cursed_arena") {
      ctx.beginPath();
      ctx.arc(cx, cy, state.curseRadius * scale, 0, Math.PI * 2);
      ctx.strokeStyle = "#00cccc66";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Pillars
    for (const pil of state.pillars) {
      if (pil.destroyed) continue;
      ctx.beginPath();
      ctx.arc(cx + pil.pos.x * scale, cy + pil.pos.z * scale, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#554466";
      ctx.fill();
    }

    // Enemies
    for (const e of state.enemies) {
      if (e.dead) continue;
      ctx.beginPath();
      ctx.arc(cx + e.pos.x * scale, cy + e.pos.z * scale, e.elite ? 3 : e.type === "boss" ? 4 : 2, 0, Math.PI * 2);
      ctx.fillStyle = e.elite ? "#ffd700" : e.type === "boss" || e.type === "champion" ? "#cc00ff" : "#ff4444";
      ctx.fill();
    }

    // Treasures
    for (const t of state.treasures) {
      if (t.collected) continue;
      ctx.beginPath();
      const tx = cx + t.pos.x * scale;
      const tz = cy + t.pos.z * scale;
      ctx.moveTo(tx, tz - 3);
      ctx.lineTo(tx + 2.5, tz + 2);
      ctx.lineTo(tx - 2.5, tz + 2);
      ctx.closePath();
      ctx.fillStyle = t.type === "fortune" ? "#ffd700" : t.type === "heal" ? "#44ff44" : "#ffdd00";
      ctx.fill();
    }

    // Obstacles
    for (const obs of state.obstacles) {
      if (obs.type === "fire_pillar") {
        ctx.beginPath();
        ctx.arc(cx + obs.pos.x * scale, cy + obs.pos.z * scale, obs.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,68,0,0.2)";
        ctx.fill();
      }
    }

    // Player (white triangle pointing forward)
    ctx.save();
    ctx.translate(cx + state.player.pos.x * scale, cy + state.player.pos.z * scale);
    ctx.rotate(-state.player.yaw);
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(3, 3);
    ctx.lineTo(-3, 3);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
  }

  private _updateMutation(state: LotState): void {
    // Arena wall animation
    const wallMat = this._arenaWall.material;
    if (wallMat && 'uniforms' in wallMat) {
      (wallMat as THREE.ShaderMaterial).uniforms.uTime.value = state.gameTime;
      if (state.mutation === "blood_moon") {
        (wallMat as THREE.ShaderMaterial).uniforms.uColor.value.setHex(0xaa2222);
      } else if (state.mutation === "frozen") {
        (wallMat as THREE.ShaderMaterial).uniforms.uColor.value.setHex(0x4488cc);
      } else {
        (wallMat as THREE.ShaderMaterial).uniforms.uColor.value.setHex(0x4422aa);
      }
    }

    // Fog mutation
    if (state.mutation === "fog" && state.phase === "active") {
      this._fog.density = LOT.FOG_DENSITY;
    } else if (state.mutation === "blood_moon" && state.phase === "active") {
      this._fog.density = 0.008;
      this._fog.color.setHex(0x2a0000);
      (this._scene.background as THREE.Color).setHex(0x150000);
    } else {
      this._fog.density = 0.012;
      this._fog.color.setHex(0x1a0a2e);
      (this._scene.background as THREE.Color).setHex(0x0a0520);
    }

    // Frozen floor tint
    if (state.mutation === "frozen") {
      (this._arenaFloor.material as THREE.MeshStandardMaterial).color.setHex(0x4488bb);
      (this._arenaFloor.material as THREE.MeshStandardMaterial).metalness = 0.7;
    } else {
      (this._arenaFloor.material as THREE.MeshStandardMaterial).color.setHex(0x2a1a3a);
      (this._arenaFloor.material as THREE.MeshStandardMaterial).metalness = 0.3;
    }
  }

  private _applyScreenShake(state: LotState): void {
    if (state.screenShake > 0.01) {
      this._camera.position.x += (rng() - 0.5) * state.screenShake * 2;
      this._camera.position.y += (rng() - 0.5) * state.screenShake * 1.5;
    }
    // Impact camera: zoom FOV on heavy hits
    if (state.hitStopTimer > 0) {
      this._camera.fov = 55;
    } else {
      this._camera.fov += (65 - this._camera.fov) * 0.15;
    }
    this._camera.updateProjectionMatrix();
  }

  cleanup(): void {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this._renderer.dispose();
    this._scene.clear();
    this._enemyMeshes.clear();
    this._obstacleMeshes.clear();
    this._treasureMeshes.clear();
    this._projectileMeshes.clear();
    this._hpBarMeshes.clear();
    if (this._minimapCanvas && this._minimapCanvas.parentNode) {
      this._minimapCanvas.parentNode.removeChild(this._minimapCanvas);
    }
    if (this._flashOverlay && this._flashOverlay.parentNode) {
      this._flashOverlay.parentNode.removeChild(this._flashOverlay);
    }
  }
}

function rng(): number { return Math.random(); }
