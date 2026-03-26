// ---------------------------------------------------------------------------
// Pendulum — The Clockwork Knight — Three.js 3D renderer
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { PENDULUM } from "../config/PendulumConfig";
import type { PendulumState } from "../state/PendulumState";

// ---- Color Palette ----
const COL = {
  // Ground
  GROUND: 0x2a2520,
  GROUND_GLOW: 0x443322,
  // Sky
  SKY_TOP: 0x1a1125,
  SKY_BOT: 0x332244,
  // Tower
  CLOCK_TOWER_BODY: 0x554433,
  CLOCK_TOWER_ROOF: 0x332244,
  CLOCK_FACE: 0xddddcc,
  CLOCK_HANDS: 0x222222,
  PENDULUM_ARM: 0x665544,
  PENDULUM_BOB: 0xccaa44,
  PENDULUM_GLOW: 0xffcc44,
  // Pillars
  PILLAR_ACTIVE: 0x44aacc,
  PILLAR_DAMAGED: 0xcc8844,
  PILLAR_DESTROYED: 0x443333,
  PILLAR_GEAR: 0x889999,
  // Enemies
  GEAR_DRONE: 0x997744,
  SPRING_KNIGHT: 0x556655,
  COIL_ARCHER: 0x665544,
  BRASS_GOLEM: 0xaa8844,
  CLOCK_SPIDER: 0x554455,
  CHRONOVORE: 0x882244,
  // Player
  CLOCKWORK_KNIGHT: 0x445566,
  CLOCKWORK_ARMOR: 0x556677,
  // Effects
  GEAR_FRAGMENT: 0xccaa44,
  REPAIR_KIT: 0x44cc88,
  TIME_SLOW: 0x4488ff,
  TIME_STOP: 0xaaccff,
  BOLT: 0xccaa66,
};

export class PendulumRenderer {
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _canvas!: HTMLCanvasElement;

  // Lighting
  private _ambientLight!: THREE.AmbientLight;
  private _sunLight!: THREE.DirectionalLight;
  private _hemiLight!: THREE.HemisphereLight;

  // Sky
  private _skyDome!: THREE.Mesh;
  private _starPoints!: THREE.Points;

  // Pendulum trail
  private _pendulumTrailPositions: THREE.Vector3[] = [];

  // Time stop overlay
  private _timeStopOverlay!: THREE.Mesh;

  // Turret meshes
  private _turretGroups = new Map<string, THREE.Group>();

  // (dash trail + telegraph visuals use pool below)

  // Moon
  private _moonMesh!: THREE.Mesh;
  private _moonGlow!: THREE.Mesh;

  // Ground
  private _groundMesh!: THREE.Mesh;
  private _groundMat!: THREE.MeshStandardMaterial;

  // Clock Tower
  private _towerGroup!: THREE.Group;
  private _pendulumArm!: THREE.Mesh;
  private _pendulumBob!: THREE.Mesh;
  private _pendulumGlow!: THREE.PointLight;
  private _clockFace!: THREE.Mesh;
  private _hourHandMesh!: THREE.Mesh;
  private _minuteHandMesh!: THREE.Mesh;

  // Tower extras
  private _towerWindows: THREE.Mesh[] = [];
  private _towerGears: THREE.Mesh[] = [];
  private _towerCracks: THREE.Mesh[] = [];
  private _clockNumerals: THREE.Mesh[] = [];

  // Pillar-tower energy beams
  private _pillarBeams: THREE.Mesh[] = [];

  // Pendulum inner gear
  private _pendulumInnerGear!: THREE.Mesh;

  // Ground rings
  private _groundRings: THREE.Mesh[] = [];
  private _groundGearDecals: THREE.Mesh[] = [];

  // Ground fog layers
  private _fogLayers: THREE.Mesh[] = [];

  // Sky nebula
  private _nebulaMesh!: THREE.Mesh;

  // Clouds
  private _cloudMeshes: THREE.Mesh[] = [];

  // Floating clockwork sparks (instanced)
  private _sparkMesh!: THREE.InstancedMesh;
  private _sparkData: { pos: THREE.Vector3; vel: THREE.Vector3; phase: number; brightness: number }[] = [];
  private _sparkDummy = new THREE.Object3D();

  // Ambient fill lights (scattered around ground)
  private _fillLights: THREE.PointLight[] = [];

  // Steam vents at tower base
  private _steamVents: THREE.Mesh[] = [];

  // Apex pulse ring
  private _apexPulseRing!: THREE.Mesh;
  private _apexPulseScale = 0;

  // Time slow clock hands
  private _slowZoneHandPool: THREE.Mesh[] = [];

  // Pillars
  private _pillarMeshes: THREE.Group[] = [];
  private _pillarGears: THREE.Mesh[] = [];

  // Debris
  private _debrisMeshes: THREE.Mesh[] = [];

  // Dynamic entities
  private _enemyMeshes = new Map<string, THREE.Group>();

  // Player mesh
  private _playerGroup!: THREE.Group;

  // Fog
  private _fog!: THREE.FogExp2;

  // Reusable vectors (never allocate in render loop)
  private _cameraTarget = new THREE.Vector3();

  // Reusable geometry & materials (pooled — never allocate per frame)
  private _boxGeo!: THREE.BoxGeometry;
  private _sphereGeo!: THREE.SphereGeometry;
  private _ringGeo!: THREE.RingGeometry;
  private _cylThinGeo!: THREE.CylinderGeometry;
  private _circleGeo!: THREE.CircleGeometry;

  // Pooled materials
  private _poolMatGear!: THREE.MeshStandardMaterial;
  private _poolMatKit!: THREE.MeshStandardMaterial;

  // Mesh pools (pre-allocated, show/hide instead of create/destroy)
  private _projPool: THREE.Mesh[] = [];
  private _fragPool: THREE.Mesh[] = [];
  private _kitPool: THREE.Mesh[] = [];
  private _particlePool: THREE.Mesh[] = [];
  private _slowZonePool: THREE.Mesh[] = [];
  private _telegraphPool: THREE.Mesh[] = [];
  private _dashTrailPool: THREE.Mesh[] = [];
  private _trailPool: THREE.Mesh[] = [];

  // Post-processing
  private _composer!: EffectComposer;
  private _bloomPass!: UnrealBloomPass;
  private _vignettePass!: ShaderPass;

  // Sword slash trail (pooled arc meshes)
  private _slashTrails: THREE.Mesh[] = [];

  // Dash afterimage pool
  private _dashAfterImages: THREE.Mesh[] = [];

  // Camera cinematics
  private _cameraMode: "follow" | "boss_zoom" | "death" | "victory" = "follow";
  private _cinematicTimer = 0;
  private _cinematicTarget = new THREE.Vector3();

  // Enemy HP bar pools (background + fill per enemy, max 50)
  private _hpBarBgs: THREE.Mesh[] = [];
  private _hpBarFills: THREE.Mesh[] = [];
  // Turret HP bar pools (max 6)
  private _turretHpBgs: THREE.Mesh[] = [];
  private _turretHpFills: THREE.Mesh[] = [];

  get canvas(): HTMLCanvasElement { return this._canvas; }

  init(w: number, h: number): void {
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._canvas = this._renderer.domElement;

    this._scene = new THREE.Scene();
    this._fog = new THREE.FogExp2(0x1a1125, PENDULUM.FOG_DENSITY_BASE);
    this._scene.fog = this._fog;

    this._camera = new THREE.PerspectiveCamera(PENDULUM.CAMERA_FOV, w / h, 0.5, 400);

    // Reusable geo (shared across all dynamic entities)
    this._boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this._sphereGeo = new THREE.SphereGeometry(0.5, 8, 6);
    this._ringGeo = new THREE.RingGeometry(0.7, 1.0, 20);
    this._cylThinGeo = new THREE.CylinderGeometry(1, 1, 0.3, 16, 1, true);
    this._circleGeo = new THREE.CircleGeometry(1, 20);

    // Pooled materials
    this._poolMatGear = new THREE.MeshStandardMaterial({ color: COL.GEAR_FRAGMENT, emissive: COL.GEAR_FRAGMENT, emissiveIntensity: 0.6 });
    this._poolMatKit = new THREE.MeshStandardMaterial({ color: COL.REPAIR_KIT, emissive: COL.REPAIR_KIT, emissiveIntensity: 0.5 });


    // Lighting
    this._ambientLight = new THREE.AmbientLight(0x334455, 0.6);
    this._scene.add(this._ambientLight);

    this._sunLight = new THREE.DirectionalLight(0xffddaa, 0.8);
    this._sunLight.position.set(30, 50, 20);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(1024, 1024);
    this._sunLight.shadow.camera.near = 1;
    this._sunLight.shadow.camera.far = 120;
    this._sunLight.shadow.camera.left = -60;
    this._sunLight.shadow.camera.right = 60;
    this._sunLight.shadow.camera.top = 60;
    this._sunLight.shadow.camera.bottom = -60;
    this._scene.add(this._sunLight);

    this._hemiLight = new THREE.HemisphereLight(0x445566, 0x221122, 0.4);
    this._scene.add(this._hemiLight);

    this._buildSky();
    this._buildStars();
    this._buildNebula();
    this._buildMoon();
    this._buildGround();
    this._buildTower();
    this._buildPlayer();
    this._buildClouds();
    this._buildClockworkSparks();
    this._buildFillLights();
    this._buildSteamVents();
    this._buildPillarBeams();
    this._buildSlowZoneHands();
    this._buildTimeStopOverlay();
    this._buildPostProcessing(w, h);
    this._buildSlashTrails();
    this._buildDashAfterImages();
    this._buildMeshPools();
  }

  /** Pre-allocate mesh pools so we never new() in the render loop */
  private _buildMeshPools(): void {
    // Projectile pool (max 30)
    for (let i = 0; i < 30; i++) {
      const mat = new THREE.MeshStandardMaterial({ emissiveIntensity: 0.8 });
      const mesh = new THREE.Mesh(this._sphereGeo, mat);
      mesh.visible = false;
      this._scene.add(mesh);
      this._projPool.push(mesh);
    }
    // Fragment pool (max 40)
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(this._sphereGeo, this._poolMatGear.clone());
      mesh.scale.setScalar(0.25);
      mesh.visible = false;
      this._scene.add(mesh);
      this._fragPool.push(mesh);
    }
    // Kit pool (max 15)
    for (let i = 0; i < 15; i++) {
      const mesh = new THREE.Mesh(this._boxGeo, this._poolMatKit.clone());
      mesh.scale.set(0.4, 0.3, 0.4);
      mesh.visible = false;
      this._scene.add(mesh);
      this._kitPool.push(mesh);
    }
    // Particle pool (max 200)
    for (let i = 0; i < 200; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true });
      const mesh = new THREE.Mesh(this._sphereGeo, mat);
      mesh.visible = false;
      this._scene.add(mesh);
      this._particlePool.push(mesh);
    }
    // Slow zone pool (max 6 — 2 meshes each for 3 zones)
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(i % 2 === 0 ? this._cylThinGeo : this._ringGeo, mat);
      mesh.visible = false;
      this._scene.add(mesh);
      this._slowZonePool.push(mesh);
    }
    // Telegraph pool (max 8 — 2 meshes each for 4 telegraphs)
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(i % 2 === 0 ? this._ringGeo : this._circleGeo, mat);
      mesh.visible = false;
      if (i % 2 === 1) mesh.rotation.x = -Math.PI / 2;
      this._scene.add(mesh);
      this._telegraphPool.push(mesh);
    }
    // Dash trail pool (max 6)
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x6688cc, transparent: true, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(this._ringGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this._scene.add(mesh);
      this._dashTrailPool.push(mesh);
    }
    // Pendulum trail pool (max 12)
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: COL.PENDULUM_GLOW, transparent: true });
      const mesh = new THREE.Mesh(this._sphereGeo, mat);
      mesh.visible = false;
      this._scene.add(mesh);
      this._trailPool.push(mesh);
    }
    // Enemy HP bars (background=dark, fill=colored)
    const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthTest: false });
    const hpFillMat = new THREE.MeshBasicMaterial({ color: 0xcc4444, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false });
    const hpBarGeo = new THREE.PlaneGeometry(1, 0.1);
    for (let i = 0; i < 50; i++) {
      const bg = new THREE.Mesh(hpBarGeo, hpBgMat.clone());
      bg.visible = false; bg.renderOrder = 100;
      this._scene.add(bg);
      this._hpBarBgs.push(bg);
      const fill = new THREE.Mesh(hpBarGeo, hpFillMat.clone());
      fill.visible = false; fill.renderOrder = 101;
      this._scene.add(fill);
      this._hpBarFills.push(fill);
    }
    // Turret HP bars
    for (let i = 0; i < 6; i++) {
      const bg = new THREE.Mesh(hpBarGeo, hpBgMat.clone());
      bg.visible = false; bg.renderOrder = 100;
      this._scene.add(bg);
      this._turretHpBgs.push(bg);
      const fill = new THREE.Mesh(hpBarGeo, new THREE.MeshBasicMaterial({ color: 0x44aacc, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false }));
      fill.visible = false; fill.renderOrder = 101;
      this._scene.add(fill);
      this._turretHpFills.push(fill);
    }
  }

  private _buildSky(): void {
    const skyGeo = new THREE.SphereGeometry(180, 16, 12);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(COL.SKY_TOP) },
        botColor: { value: new THREE.Color(COL.SKY_BOT) },
      },
      vertexShader: `
        varying float vY;
        void main() {
          vY = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 botColor;
        varying float vY;
        void main() {
          float t = clamp(vY * 0.5 + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(mix(botColor, topColor, t), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this._skyDome = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(this._skyDome);
  }

  private _buildStars(): void {
    const count = 600;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.8 + 0.2); // upper hemisphere bias
      const r = 170;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = 0.5 + Math.random() * 1.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({ color: 0xeeeeff, size: 0.8, sizeAttenuation: false, transparent: true, opacity: 0.7 });
    this._starPoints = new THREE.Points(geo, mat);
    this._scene.add(this._starPoints);
  }

  private _buildMoon(): void {
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xeeeeff });
    this._moonMesh = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12), moonMat);
    this._moonMesh.position.set(80, 120, -60);
    this._scene.add(this._moonMesh);

    const glowMat = new THREE.MeshBasicMaterial({ color: 0xaabbdd, transparent: true, opacity: 0.15 });
    this._moonGlow = new THREE.Mesh(new THREE.SphereGeometry(12, 12, 8), glowMat);
    this._moonGlow.position.copy(this._moonMesh.position);
    this._scene.add(this._moonGlow);
  }

  private _buildNebula(): void {
    // Wispy colored nebula bands in the sky
    const nebulaMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x331144) },
        color2: { value: new THREE.Color(0x113344) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          vUv = uv;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          float noise = sin(vPos.x * 0.02 + time * 0.1) * cos(vPos.z * 0.03 + time * 0.07) * 0.5 + 0.5;
          float band = smoothstep(0.3, 0.7, noise);
          vec3 col = mix(color1, color2, band);
          float alpha = band * 0.12 * smoothstep(0.0, 0.5, vUv.y);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this._nebulaMesh = new THREE.Mesh(new THREE.SphereGeometry(175, 16, 12), nebulaMat);
    this._scene.add(this._nebulaMesh);
  }

  private _buildClouds(): void {
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0x222233, transparent: true, opacity: 0.06, side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (let i = 0; i < 8; i++) {
      const w = 30 + Math.random() * 50;
      const h = 8 + Math.random() * 12;
      const cloud = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cloudMat.clone());
      cloud.position.set(
        (Math.random() - 0.5) * 200,
        90 + Math.random() * 30,
        (Math.random() - 0.5) * 200,
      );
      cloud.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      cloud.rotation.z = Math.random() * Math.PI;
      this._scene.add(cloud);
      this._cloudMeshes.push(cloud);
    }
  }

  private _buildClockworkSparks(): void {
    // Floating golden sparks — like fireflies but mechanical
    const count = 80;
    const sparkGeo = new THREE.SphereGeometry(0.08, 4, 3);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffcc44, transparent: true, opacity: 0.8,
    });
    this._sparkMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, count);
    this._sparkMesh.frustumCulled = false;
    this._scene.add(this._sparkMesh);

    const half = PENDULUM.GROUND_SIZE * 0.4;
    for (let i = 0; i < count; i++) {
      this._sparkData.push({
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * half * 2,
          0.5 + Math.random() * 6,
          (Math.random() - 0.5) * half * 2,
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.3,
        ),
        phase: Math.random() * Math.PI * 2,
        brightness: 0.4 + Math.random() * 0.6,
      });
    }
  }

  private _buildFillLights(): void {
    // Ambient point lights scattered around the ground to fill dark areas
    const positions = [
      { x: 30, z: 30 }, { x: -30, z: 30 }, { x: 30, z: -30 }, { x: -30, z: -30 },
      { x: 50, z: 0 }, { x: -50, z: 0 }, { x: 0, z: 50 }, { x: 0, z: -50 },
    ];
    for (const pos of positions) {
      const light = new THREE.PointLight(0x334455, 0.3, 35);
      light.position.set(pos.x, 3, pos.z);
      this._scene.add(light);
      this._fillLights.push(light);
    }
  }

  private _buildSteamVents(): void {
    // Steam vent cones at tower base — 4 around the base, emit visual steam
    const ventMat = new THREE.MeshStandardMaterial({
      color: 0x554433, metalness: 0.5, roughness: 0.6,
    });
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const vent = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.0, 6), ventMat);
      vent.position.set(Math.cos(angle) * 5, 0.5, Math.sin(angle) * 5);
      vent.rotation.x = Math.PI; // upside down cone = vent nozzle
      this._scene.add(vent);
      this._steamVents.push(vent);
    }
  }

  private _buildPillarBeams(): void {
    // Energy beams from active pillars to tower (built once, visibility toggled)
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x44aacc, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const spread = PENDULUM.PILLAR_SPREAD;
    const positions = [
      { x: spread, z: 0 }, { x: -spread, z: 0 },
      { x: 0, z: spread }, { x: 0, z: -spread },
    ];
    for (const pos of positions) {
      const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      const beamGeo = new THREE.PlaneGeometry(0.6, dist);
      const beam = new THREE.Mesh(beamGeo, beamMat.clone());
      beam.position.set(pos.x / 2, 6, pos.z / 2);
      beam.rotation.y = Math.atan2(-pos.x, -pos.z);
      beam.rotation.x = -Math.PI / 2;
      beam.visible = false;
      this._scene.add(beam);
      this._pillarBeams.push(beam);
    }
  }

  private _buildSlowZoneHands(): void {
    // Clock hand meshes for inside time slow zones (max 3 zones x 2 hands)
    const handMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const isMinute = i % 2 === 1;
      const hand = new THREE.Mesh(new THREE.PlaneGeometry(0.15, isMinute ? 3.5 : 2.5), handMat.clone());
      hand.geometry.translate(0, isMinute ? 1.75 : 1.25, 0);
      hand.rotation.x = -Math.PI / 2;
      hand.visible = false;
      this._scene.add(hand);
      this._slowZoneHandPool.push(hand);
    }
  }

  private _buildTimeStopOverlay(): void {
    // Full-screen quad tinted blue when time stop is active
    const geo = new THREE.PlaneGeometry(500, 500);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x4466aa, transparent: true, opacity: 0, side: THREE.DoubleSide,
      depthWrite: false, depthTest: false,
    });
    this._timeStopOverlay = new THREE.Mesh(geo, mat);
    this._timeStopOverlay.renderOrder = 999;
    this._timeStopOverlay.frustumCulled = false;
    // Don't add to scene yet — position in front of camera each frame
  }

  private _buildPostProcessing(sw: number, sh: number): void {
    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(new RenderPass(this._scene, this._camera));

    // Bloom — makes emissive materials glow (pendulum, crystals, eyes, weapons)
    this._bloomPass = new UnrealBloomPass(
      new THREE.Vector2(sw, sh),
      0.55,   // strength
      0.5,    // radius
      0.78,   // threshold (only bright emissives bloom)
    );
    this._composer.addPass(this._bloomPass);

    // Vignette — darker edges for dramatic focus
    this._vignettePass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uIntensity: { value: 0.45 },
        uColor: { value: new THREE.Vector3(0.02, 0.01, 0.04) },
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

  private _buildSlashTrails(): void {
    // Pre-allocate 3 slash arc meshes (one per combo step)
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0x66aadd, transparent: true, opacity: 0, side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (let i = 0; i < 3; i++) {
      // Arc shape — half-ring sweep
      const arcGeo = new THREE.RingGeometry(1.5, 2.2, 12, 1, 0, Math.PI * 0.8);
      const arc = new THREE.Mesh(arcGeo, trailMat.clone());
      arc.visible = false;
      this._scene.add(arc);
      this._slashTrails.push(arc);
    }
  }

  private _buildDashAfterImages(): void {
    // 4 fading silhouettes of the player
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x4488cc, transparent: true, opacity: 0, side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (let i = 0; i < 4; i++) {
      const ghost = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.0, 0.5), ghostMat.clone());
      ghost.visible = false;
      this._scene.add(ghost);
      this._dashAfterImages.push(ghost);
    }
  }

  private _buildGround(): void {
    const size = PENDULUM.GROUND_SIZE;
    const geo = new THREE.PlaneGeometry(size, size, 64, 64);
    this._groundMat = new THREE.MeshStandardMaterial({
      color: COL.GROUND,
      roughness: 0.85,
      metalness: 0.25,
    });
    this._groundMesh = new THREE.Mesh(geo, this._groundMat);
    this._groundMesh.rotation.x = -Math.PI / 2;
    this._groundMesh.receiveShadow = true;
    this._scene.add(this._groundMesh);

    // Concentric clockwork rings emanating from tower center
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x443322, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
    const radii = [10, 20, 30, 45, 60, 80];
    for (const r of radii) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.3, r, 48), ringMat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      this._scene.add(ring);
      this._groundRings.push(ring);
    }

    // Radial groove lines from center (like clock markings on the ground)
    const grooveMat = new THREE.MeshBasicMaterial({ color: 0x332211, transparent: true, opacity: 0.15 });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const groove = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 75), grooveMat);
      groove.rotation.x = -Math.PI / 2;
      groove.rotation.z = angle;
      groove.position.set(Math.cos(angle) * 37.5, 0.025, Math.sin(angle) * 37.5);
      this._scene.add(groove);
    }

    // Embedded gear decals on ground (scattered large decorative gears)
    const decalMat = new THREE.MeshBasicMaterial({ color: 0x3a3025, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.3;
      const r = 25 + (i % 3) * 15;
      const gearSize = 2 + Math.random() * 3;
      const decal = new THREE.Mesh(new THREE.TorusGeometry(gearSize, 0.3, 4, 8 + i % 4), decalMat);
      decal.rotation.x = -Math.PI / 2;
      decal.position.set(Math.cos(angle) * r, 0.04, Math.sin(angle) * r);
      this._scene.add(decal);
      this._groundGearDecals.push(decal);
    }

    // Ground fog layers (low-lying mist)
    const fogLayerMat = new THREE.MeshBasicMaterial({ color: 0x1a1125, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const fogLayer = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.6, size * 0.6), fogLayerMat.clone());
      fogLayer.rotation.x = -Math.PI / 2;
      fogLayer.position.y = 0.3 + i * 0.5;
      this._scene.add(fogLayer);
      this._fogLayers.push(fogLayer);
    }

    // Apex pulse ring (hidden, shown during apex)
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0, side: THREE.DoubleSide });
    this._apexPulseRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.2, 32), pulseMat);
    this._apexPulseRing.rotation.x = -Math.PI / 2;
    this._apexPulseRing.position.y = 0.06;
    this._scene.add(this._apexPulseRing);
  }

  private _buildTower(): void {
    this._towerGroup = new THREE.Group();

    const baseMat = new THREE.MeshStandardMaterial({ color: COL.CLOCK_TOWER_BODY, roughness: 0.7, metalness: 0.3 });

    // Tower base — wider at bottom, tapered
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.5, 30, 8), baseMat);
    base.position.y = 15;
    base.castShadow = true;
    base.receiveShadow = true;
    this._towerGroup.add(base);

    // Buttresses (4 diagonal supports at base)
    const buttressMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.8, metalness: 0.2 });
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const buttress = new THREE.Mesh(new THREE.BoxGeometry(1.2, 10, 0.8), buttressMat);
      buttress.position.set(Math.cos(angle) * 4.2, 4, Math.sin(angle) * 4.2);
      buttress.rotation.y = -angle;
      buttress.rotation.z = 0.3;
      buttress.castShadow = true;
      this._towerGroup.add(buttress);
    }

    // Mid-section ornamental band
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x667755, metalness: 0.6, roughness: 0.4 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.3, 6, 16), bandMat);
    band.position.y = 18;
    band.rotation.x = Math.PI / 2;
    this._towerGroup.add(band);

    // Tower roof (pyramid with finial)
    const roofMat = new THREE.MeshStandardMaterial({ color: COL.CLOCK_TOWER_ROOF, roughness: 0.6, metalness: 0.4 });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5, 10, 8), roofMat);
    roof.position.y = 35;
    roof.castShadow = true;
    this._towerGroup.add(roof);

    // Finial (spire on top)
    const finialMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.9, roughness: 0.2 });
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.3, 4, 6), finialMat);
    finial.position.y = 42;
    this._towerGroup.add(finial);

    // Glowing windows (3 rows of 4)
    const windowMat = new THREE.MeshStandardMaterial({ color: 0xffddaa, emissive: 0xffaa44, emissiveIntensity: 0.8, roughness: 0.3 });
    for (let row = 0; row < 3; row++) {
      for (let w = 0; w < 4; w++) {
        const angle = (w / 4) * Math.PI * 2;
        const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), windowMat);
        const r = 3.6 + (2 - row) * 0.1;
        windowMesh.position.set(
          Math.cos(angle) * r,
          10 + row * 6,
          Math.sin(angle) * r,
        );
        windowMesh.rotation.y = -angle + Math.PI;
        this._towerGroup.add(windowMesh);
        this._towerWindows.push(windowMesh);
      }
    }

    // Exposed internal gears (visible through arched openings)
    const gearMat = new THREE.MeshStandardMaterial({ color: 0xaa8844, metalness: 0.7, roughness: 0.3 });
    for (let g = 0; g < 3; g++) {
      const gearMesh = new THREE.Mesh(new THREE.TorusGeometry(1.0 + g * 0.3, 0.15, 4, 10), gearMat);
      const gAngle = (g / 3) * Math.PI * 2;
      gearMesh.position.set(Math.cos(gAngle) * 2, 14 + g * 3, Math.sin(gAngle) * 2);
      gearMesh.rotation.x = Math.PI / 2 + g * 0.4;
      this._towerGroup.add(gearMesh);
      this._towerGears.push(gearMesh);
    }

    // Clock face (larger, glowing rim)
    const faceRimMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.7, roughness: 0.3, emissive: 0xccaa44, emissiveIntensity: 0.2 });
    const faceRim = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.2, 8, 24), faceRimMat);
    faceRim.position.set(0, 24, 3.6);
    this._towerGroup.add(faceRim);

    const faceMat = new THREE.MeshStandardMaterial({ color: COL.CLOCK_FACE, roughness: 0.4, metalness: 0.1, emissive: 0x555544, emissiveIntensity: 0.4 });
    const faceGeo = new THREE.CircleGeometry(3, 24);
    this._clockFace = new THREE.Mesh(faceGeo, faceMat);
    this._clockFace.position.set(0, 24, 3.65);
    this._towerGroup.add(this._clockFace);

    // Clock numerals (12 tick marks)
    const numeralMat = new THREE.MeshStandardMaterial({ color: 0x222211, metalness: 0.5 });
    for (let n = 0; n < 12; n++) {
      const nAngle = (n / 12) * Math.PI * 2 - Math.PI / 2;
      const r = 2.6;
      const tick = new THREE.Mesh(new THREE.BoxGeometry(n % 3 === 0 ? 0.15 : 0.08, n % 3 === 0 ? 0.5 : 0.3, 0.05), numeralMat);
      tick.position.set(Math.cos(nAngle) * r, 24 + Math.sin(nAngle) * r, 3.7);
      tick.rotation.z = -nAngle;
      this._towerGroup.add(tick);
      this._clockNumerals.push(tick);
    }

    // Hour hand
    const handMat = new THREE.MeshStandardMaterial({ color: COL.CLOCK_HANDS, metalness: 0.8, roughness: 0.3 });
    this._hourHandMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.8, 0.08), handMat);
    this._hourHandMesh.position.set(0, 24, 3.75);
    this._hourHandMesh.geometry.translate(0, 0.9, 0);
    this._towerGroup.add(this._hourHandMesh);

    // Minute hand
    this._minuteHandMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 0.08), handMat);
    this._minuteHandMesh.position.set(0, 24, 3.8);
    this._minuteHandMesh.geometry.translate(0, 1.25, 0);
    this._towerGroup.add(this._minuteHandMesh);

    // Center dot
    const centerDot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), faceRimMat);
    centerDot.position.set(0, 24, 3.85);
    this._towerGroup.add(centerDot);

    // Tower damage cracks (hidden initially, shown at low HP)
    const crackMat = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff4422, emissiveIntensity: 0 });
    for (let c = 0; c < 6; c++) {
      const cAngle = Math.random() * Math.PI * 2;
      const cy = 4 + Math.random() * 20;
      const crack = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2 + Math.random() * 3, 0.1), crackMat.clone());
      crack.position.set(Math.cos(cAngle) * 3.8, cy, Math.sin(cAngle) * 3.8);
      crack.rotation.y = -cAngle + Math.PI;
      crack.rotation.z = (Math.random() - 0.5) * 0.8;
      crack.visible = false;
      this._towerGroup.add(crack);
      this._towerCracks.push(crack);
    }

    // Pendulum arm
    const armMat = new THREE.MeshStandardMaterial({ color: COL.PENDULUM_ARM, metalness: 0.5, roughness: 0.5 });
    this._pendulumArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 15, 6), armMat);
    this._pendulumArm.position.y = 7.5;
    this._towerGroup.add(this._pendulumArm);

    // Pendulum bob with inner rotating gear
    const bobMat = new THREE.MeshStandardMaterial({ color: COL.PENDULUM_BOB, metalness: 0.8, roughness: 0.2, emissive: COL.PENDULUM_GLOW, emissiveIntensity: 0.5 });
    this._pendulumBob = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), bobMat);
    this._pendulumBob.position.y = 0;
    this._towerGroup.add(this._pendulumBob);

    // Inner gear inside bob
    const innerGearMat = new THREE.MeshStandardMaterial({ color: 0xddbb55, metalness: 0.9, roughness: 0.1, emissive: 0xffcc44, emissiveIntensity: 0.6 });
    this._pendulumInnerGear = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.1, 4, 10), innerGearMat);
    this._pendulumInnerGear.position.y = 0;
    this._towerGroup.add(this._pendulumInnerGear);

    this._pendulumGlow = new THREE.PointLight(COL.PENDULUM_GLOW, 2, 30);
    this._pendulumGlow.position.y = 0;
    this._towerGroup.add(this._pendulumGlow);

    // Secondary glow for bob
    const bobGlow2 = new THREE.PointLight(0xffaa22, 1, 15);
    bobGlow2.position.y = 0;
    this._towerGroup.add(bobGlow2);

    this._scene.add(this._towerGroup);
  }

  private _buildPlayer(): void {
    this._playerGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: COL.CLOCKWORK_KNIGHT, metalness: 0.5, roughness: 0.5 });
    const armorMat = new THREE.MeshStandardMaterial({ color: COL.CLOCKWORK_ARMOR, metalness: 0.6, roughness: 0.4 });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.5), bodyMat);
    body.position.y = 1.2;
    body.castShadow = true;
    this._playerGroup.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), armorMat);
    head.position.y = 2.1;
    head.castShadow = true;
    this._playerGroup.add(head);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.4, roughness: 0.6 });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.35), legMat);
    legL.position.set(-0.2, 0.4, 0);
    const legR = legL.clone();
    legR.position.set(0.2, 0.4, 0);
    this._playerGroup.add(legL, legR);

    // Arms
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), armorMat);
    armL.position.set(-0.55, 1.2, 0);
    const armR = armL.clone();
    armR.position.set(0.55, 1.2, 0);
    this._playerGroup.add(armL, armR);

    // Chrono Sword (right hand)
    const swordMat = new THREE.MeshStandardMaterial({ color: 0xaabbcc, metalness: 0.9, roughness: 0.2, emissive: 0x4488cc, emissiveIntensity: 0.3 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.02), swordMat);
    blade.position.set(0.55, 1.8, -0.3);
    blade.rotation.x = -0.3;
    this._playerGroup.add(blade);

    // Sword guard
    const guardMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.8, roughness: 0.3 });
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.15), guardMat);
    guard.position.set(0.55, 1.2, -0.2);
    this._playerGroup.add(guard);

    // Shoulder pauldrons
    const pauldronMat = new THREE.MeshStandardMaterial({ color: 0x667788, metalness: 0.6, roughness: 0.4 });
    const pauldronL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4), pauldronMat);
    pauldronL.position.set(-0.55, 1.7, 0);
    pauldronL.scale.set(1, 0.6, 1);
    const pauldronR = pauldronL.clone();
    pauldronR.position.set(0.55, 1.7, 0);
    this._playerGroup.add(pauldronL, pauldronR);

    // Helmet visor (glowing slit)
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x44ccff, emissive: 0x44ccff, emissiveIntensity: 0.8,
      metalness: 0.3, roughness: 0.2,
    });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.05), visorMat);
    visor.position.set(0, 2.12, 0.24);
    this._playerGroup.add(visor); // child index 10

    // Shield (left arm — hidden by default, shown when blocking)
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x556677, metalness: 0.7, roughness: 0.3,
      emissive: 0x224466, emissiveIntensity: 0.1,
    });
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.5), shieldMat);
    shield.position.set(-0.7, 1.3, -0.2);
    shield.visible = false;
    this._playerGroup.add(shield); // child index 11

    // Shield emblem (gear shape on shield face)
    const emblemMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.8, roughness: 0.2, emissive: 0xccaa44, emissiveIntensity: 0.3 });
    const emblem = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 4, 6), emblemMat);
    emblem.position.set(-0.75, 1.3, -0.2);
    emblem.rotation.y = Math.PI / 2;
    emblem.visible = false;
    this._playerGroup.add(emblem); // child index 12

    // Chrono aura (glowing sphere around player — scales with pendulum power)
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x4488cc, transparent: true, opacity: 0, side: THREE.DoubleSide,
    });
    const aura = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8), auraMat);
    aura.position.y = 1.2;
    this._playerGroup.add(aura); // child index 13

    // Foot glow (small light under player)
    const footLight = new THREE.PointLight(0x4488cc, 0, 8);
    footLight.position.y = 0.2;
    this._playerGroup.add(footLight); // child index 14

    this._scene.add(this._playerGroup);
  }

  // ---- Build pillars from state ----
  private _buildPillars(state: PendulumState): void {
    // Clear old
    for (const g of this._pillarMeshes) this._scene.remove(g);
    this._pillarMeshes = [];
    this._pillarGears = [];

    for (const pil of state.pillars) {
      const group = new THREE.Group();
      const color = pil.status === "active" ? COL.PILLAR_ACTIVE :
                    pil.status === "damaged" ? COL.PILLAR_DAMAGED : COL.PILLAR_DESTROYED;
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.5 });

      // Ornate hexagonal base
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x443333, roughness: 0.7, metalness: 0.3 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 1.0, 6), baseMat);
      base.position.y = 0.5;
      base.castShadow = true;
      group.add(base);

      // Base ring decoration
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.12, 4, 12), new THREE.MeshStandardMaterial({ color: 0x556655, metalness: 0.6, roughness: 0.4 }));
      baseRing.position.y = 1.0;
      baseRing.rotation.x = Math.PI / 2;
      group.add(baseRing);

      // Main column — tapered with segments
      const col = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.4, 7, 8), mat);
      col.position.y = 4.5;
      col.castShadow = true;
      col.receiveShadow = true;
      group.add(col);

      // Column ring bands (3 decorative rings)
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x667766, metalness: 0.6, roughness: 0.4 });
      for (let b = 0; b < 3; b++) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(1.15 - b * 0.05, 0.08, 4, 8), bandMat);
        band.position.y = 2.5 + b * 2;
        band.rotation.x = Math.PI / 2;
        group.add(band);
      }

      // Floating chrono-crystal above column
      const crystalMat = new THREE.MeshStandardMaterial({
        color, metalness: 0.3, roughness: 0.1,
        emissive: color, emissiveIntensity: 0.6,
        transparent: true, opacity: 0.85,
      });
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), crystalMat);
      crystal.position.y = 9.5;
      group.add(crystal);

      // Spinning gear around crystal
      const gearMat = new THREE.MeshStandardMaterial({ color: COL.PILLAR_GEAR, metalness: 0.7, roughness: 0.3 });
      const gear = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.2, 4, 12), gearMat);
      gear.position.y = 9.5;
      gear.rotation.x = Math.PI / 2;
      group.add(gear);
      this._pillarGears.push(gear);

      // Second gear (perpendicular)
      const gear2 = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.15, 4, 10), gearMat);
      gear2.position.y = 9.5;
      group.add(gear2);
      // Store ref for animation (we'll use the pillarGears array length)

      // Energy field dome (translucent sphere around crystal)
      const domeMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.06, side: THREE.DoubleSide,
      });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.5, 12, 8), domeMat);
      dome.position.y = 9;
      group.add(dome);

      // Pillar point light
      const light = new THREE.PointLight(color, 1.5, 20);
      light.position.y = 9.5;
      group.add(light);

      // Ground glow ring
      const glowRing = new THREE.Mesh(
        new THREE.RingGeometry(1.8, 2.5, 16),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, side: THREE.DoubleSide }),
      );
      glowRing.rotation.x = -Math.PI / 2;
      glowRing.position.y = 0.03;
      group.add(glowRing);

      group.position.set(pil.pos.x, 0, pil.pos.z);
      this._scene.add(group);
      this._pillarMeshes.push(group);
    }
  }

  // ---- Build debris ----
  private _buildDebris(state: PendulumState): void {
    for (const d of this._debrisMeshes) this._scene.remove(d);
    this._debrisMeshes = [];

    const colors: Record<string, number> = { gear: 0x887744, spring: 0x667755, cog: 0x776644, pipe: 0x555555 };

    for (const debris of state.debris) {
      const mat = new THREE.MeshStandardMaterial({
        color: debris.rusted ? 0x664422 : (colors[debris.type] || 0x666655),
        roughness: 0.8, metalness: 0.3,
      });

      let mesh: THREE.Mesh;
      switch (debris.type) {
        case "gear":
          mesh = new THREE.Mesh(new THREE.TorusGeometry(debris.radius, 0.15, 4, 8), mat);
          mesh.rotation.x = Math.PI / 2 + Math.random() * 0.3;
          break;
        case "spring":
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(debris.radius * 0.3, debris.radius * 0.3, debris.height, 6), mat);
          break;
        case "cog":
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(debris.radius, debris.radius, 0.3, 6), mat);
          mesh.rotation.x = Math.random() * 0.5;
          break;
        default:
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, debris.height, 4), mat);
          mesh.rotation.z = Math.random() * 0.8;
          break;
      }

      mesh.position.set(debris.pos.x, debris.height * 0.5, debris.pos.z);
      mesh.castShadow = true;
      this._scene.add(mesh);
      this._debrisMeshes.push(mesh);
    }
  }

  // ---- Update ----
  update(state: PendulumState, _dt: number): void {
    // Init pillars/debris on first frame
    if (this._pillarMeshes.length === 0 && state.pillars.length > 0) {
      this._buildPillars(state);
      this._buildDebris(state);
    }

    const p = state.player;

    // Camera
    const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
    const camDist = PENDULUM.CAMERA_FOLLOW_DIST;
    const camH = PENDULUM.CAMERA_FOLLOW_HEIGHT;
    const targetX = p.pos.x + sinY * camDist;
    const targetZ = p.pos.z + cosY * camDist;
    const targetY = p.pos.y + camH;

    this._cameraTarget.set(targetX, targetY, targetZ);
    this._camera.position.lerp(this._cameraTarget, PENDULUM.CAMERA_LERP);
    this._camera.lookAt(p.pos.x, p.pos.y + 1.5, p.pos.z);

    // Screen shake
    if (state.screenShake > 0) {
      const intensity = state.screenShakeIntensity;
      this._camera.position.x += (Math.random() - 0.5) * intensity * 0.1;
      this._camera.position.y += (Math.random() - 0.5) * intensity * 0.1;
    }

    // Player position
    this._playerGroup.position.set(p.pos.x, p.pos.y, p.pos.z);
    this._playerGroup.rotation.y = p.yaw + Math.PI;

    // Player animation
    const legL = this._playerGroup.children[2] as THREE.Mesh;
    const legR = this._playerGroup.children[3] as THREE.Mesh;
    const armL = this._playerGroup.children[4] as THREE.Mesh;
    const armR = this._playerGroup.children[5] as THREE.Mesh;
    const blade = this._playerGroup.children[6] as THREE.Mesh;
    const playerBody = this._playerGroup.children[0] as THREE.Mesh;

    if (p.action === "walking" || p.action === "sprinting") {
      // Leg swing — faster when sprinting
      const freq = p.action === "sprinting" ? 14 : 8;
      const amp = p.action === "sprinting" ? 0.5 : 0.3;
      const swing = Math.sin(state.gameTime * freq) * amp;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.6;
      armR.rotation.x = swing * 0.4;
      // Sprint lean
      if (p.action === "sprinting") {
        playerBody.rotation.x = 0.1;
      } else {
        playerBody.rotation.x = 0;
      }
    } else {
      // Reset to idle
      legL.rotation.x = 0;
      legR.rotation.x = 0;
      armL.rotation.x = 0;
      playerBody.rotation.x = 0;
    }

    // Attack swing (sword)
    if (p.chronoStrikeCD > PENDULUM.CHRONO_STRIKE_COOLDOWN * 0.5) {
      // Mid-swing — slash forward
      const swingT = (p.chronoStrikeCD - PENDULUM.CHRONO_STRIKE_COOLDOWN * 0.5) / (PENDULUM.CHRONO_STRIKE_COOLDOWN * 0.5);
      blade.rotation.x = -0.3 - swingT * 1.5;
      blade.rotation.z = swingT * 0.8 * (p.strikeComboStep % 2 === 0 ? 1 : -1);
      armR.rotation.x = -swingT * 1.2;
      // Sword glow during swing
      (blade.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + swingT * 1.5;
    } else {
      blade.rotation.x = -0.3;
      blade.rotation.z = 0;
      (blade.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;
    }

    // Shield and aura refs
    const shield = this._playerGroup.children[11] as THREE.Mesh;
    const shieldEmblem = this._playerGroup.children[12] as THREE.Mesh;
    const aura = this._playerGroup.children[13] as THREE.Mesh;
    const footLight = this._playerGroup.children[14] as THREE.PointLight;

    // Blocking pose — raise left arm as shield, pull sword back
    if (p.blocking) {
      armL.rotation.x = -1.2;
      armL.rotation.z = 0.4;
      blade.rotation.x = -1.0;
      shield.visible = true;
      shieldEmblem.visible = true;
      // Shield glow intensifies during parry window
      const sMat = shield.material as THREE.MeshStandardMaterial;
      sMat.emissiveIntensity = state.parryWindow > 0 ? 0.6 : 0.1;
      // Parry flash glow on body
      if (state.lastParrySuccess > 0) {
        (playerBody.material as THREE.MeshStandardMaterial).emissive.setHex(0xffffff);
        (playerBody.material as THREE.MeshStandardMaterial).emissiveIntensity = state.lastParrySuccess * 3;
      }
    } else {
      armL.rotation.z = 0;
      shield.visible = false;
      shieldEmblem.visible = false;
      (playerBody.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
    }

    // Chrono aura — scales with pendulum power
    const auraMat = aura.material as THREE.MeshBasicMaterial;
    const powerNormP = (state.pendulumPower - PENDULUM.PENDULUM_POWER_MIN) /
      (PENDULUM.PENDULUM_POWER_MAX - PENDULUM.PENDULUM_POWER_MIN);
    auraMat.opacity = powerNormP * 0.08;
    aura.scale.setScalar(1 + powerNormP * 0.5);
    auraMat.color.setHex(state.apexStrikeActive ? 0xffcc44 : 0x4488cc);

    // Foot light intensity
    footLight.intensity = powerNormP * 1.5;
    footLight.color.setHex(state.apexStrikeActive ? 0xffcc44 : 0x4488cc);

    // Visor glow pulses
    const visor = this._playerGroup.children[10] as THREE.Mesh;
    const visorMat = visor.material as THREE.MeshStandardMaterial;
    visorMat.emissiveIntensity = 0.6 + Math.sin(state.gameTime * 3) * 0.2 + powerNormP * 0.4;

    // ---- Ability cast animations ----

    // Gear Throw — right arm extends forward in throw pose
    if (p.gearThrowCastTimer > 0) {
      const t = p.gearThrowCastTimer / 0.35;
      armR.rotation.x = -1.5 * t; // arm extends forward
      armR.rotation.z = -0.3 * t;
      (playerBody.material as THREE.MeshStandardMaterial).emissive.setHex(0xccaa44);
      (playerBody.material as THREE.MeshStandardMaterial).emissiveIntensity = t * 0.5;
    }

    // Time Slow — both arms extend outward, palms open
    if (p.timeSlowCastTimer > 0) {
      const t = p.timeSlowCastTimer / 0.4;
      armL.rotation.x = -1.0 * t;
      armL.rotation.z = -0.6 * t;
      armR.rotation.x = -1.0 * t;
      armR.rotation.z = 0.6 * t;
      (playerBody.material as THREE.MeshStandardMaterial).emissive.setHex(0x4488ff);
      (playerBody.material as THREE.MeshStandardMaterial).emissiveIntensity = t * 0.8;
      visorMat.emissiveIntensity = 1.5 * t;
      visorMat.emissive.setHex(0x4488ff);
    }

    // Rewind — arms pull backward, body leans back
    if (p.rewindCastTimer > 0) {
      const t = p.rewindCastTimer / 0.3;
      armL.rotation.x = 0.8 * t;
      armR.rotation.x = 0.8 * t;
      playerBody.rotation.x = -0.15 * t;
      (playerBody.material as THREE.MeshStandardMaterial).emissive.setHex(0x88ccff);
      (playerBody.material as THREE.MeshStandardMaterial).emissiveIntensity = t * 1.0;
    }

    // Time Stop — dramatic full-body glow, arms spread wide, float up slightly
    if (p.timeStopCastTimer > 0) {
      const t = p.timeStopCastTimer / 0.5;
      armL.rotation.x = -0.5 * t;
      armL.rotation.z = -1.0 * t;
      armR.rotation.x = -0.5 * t;
      armR.rotation.z = 1.0 * t;
      this._playerGroup.position.y += t * 0.5; // slight float
      // Full body glow
      (playerBody.material as THREE.MeshStandardMaterial).emissive.setHex(0xaaccff);
      (playerBody.material as THREE.MeshStandardMaterial).emissiveIntensity = t * 2.0;
      visorMat.emissiveIntensity = 2.0 * t;
      visorMat.emissive.setHex(0xffffff);
      // Aura flares
      auraMat.opacity = t * 0.3;
      aura.scale.setScalar(1.5 + t * 1.0);
    }

    // Footstep dust — spawn particles when walking/sprinting
    if ((p.action === "walking" || p.action === "sprinting") && p.onGround) {
      // Use the leg swing phase to emit particles at step moments
      const stepPhase = Math.sin(state.gameTime * (p.action === "sprinting" ? 14 : 8));
      if (Math.abs(stepPhase) < 0.1 && state.tick % 2 === 0) {
        // We can't spawn Three.js objects here, but we can reuse the particle pool
        // by setting a pool mesh position — handled via state.particles in systems
      }
    }

    // Jump landing dust — handled via state particles in systems

    // Dashing — blur scale effect
    if (p.action === "dashing") {
      this._playerGroup.scale.set(0.8, 1, 1.3);
      (playerBody.material as THREE.MeshStandardMaterial).emissive.setHex(0x4488cc);
      (playerBody.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
    } else if (!p.blocking) {
      this._playerGroup.scale.set(1, 1, 1);
    }

    // Dead — collapse
    if (p.action === "dead") {
      this._playerGroup.rotation.z = Math.min(Math.PI / 2, this._playerGroup.rotation.z + _dt * 2);
    } else {
      this._playerGroup.rotation.z = 0;
    }

    // Pendulum animation
    const angle = state.pendulumAngle * PENDULUM.PENDULUM_ANGLE_MAX * (Math.PI / 180);
    this._pendulumArm.rotation.z = angle;
    this._pendulumArm.position.x = Math.sin(angle) * 7.5;
    this._pendulumArm.position.y = Math.cos(angle) * 7.5;
    this._pendulumBob.position.x = Math.sin(angle) * 15;
    this._pendulumBob.position.y = Math.cos(angle) * 15 - 15;
    this._pendulumGlow.position.copy(this._pendulumBob.position);

    // Pendulum glow intensity based on power
    const powerNorm = (state.pendulumPower - PENDULUM.PENDULUM_POWER_MIN) /
      (PENDULUM.PENDULUM_POWER_MAX - PENDULUM.PENDULUM_POWER_MIN);
    this._pendulumGlow.intensity = 1 + powerNorm * 4;
    (this._pendulumBob.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + powerNorm * 1.2;

    // Clock hands
    this._hourHandMesh.rotation.z = -(state.clockTower.hourHand * Math.PI / 180);
    this._minuteHandMesh.rotation.z = -(state.clockTower.minuteHand * Math.PI / 180);

    // Tower damage visual
    const towerHpPct = state.clockTower.hp / state.clockTower.maxHp;
    const towerBody = this._towerGroup.children[0] as THREE.Mesh;
    const towerMat = towerBody.material as THREE.MeshStandardMaterial;
    towerMat.color.setHex(towerHpPct > 0.5 ? COL.CLOCK_TOWER_BODY :
      towerHpPct > 0.25 ? 0x664433 : 0x883322);

    // Pillar updates
    for (let i = 0; i < state.pillars.length && i < this._pillarMeshes.length; i++) {
      const pil = state.pillars[i];
      const group = this._pillarMeshes[i];
      const col = group.children[0] as THREE.Mesh;
      const mat = col.material as THREE.MeshStandardMaterial;
      const gear = this._pillarGears[i];

      if (pil.status === "destroyed") {
        mat.color.setHex(COL.PILLAR_DESTROYED);
        group.scale.y = 0.3;
        gear.visible = false;
        // Rubble tilt
        group.rotation.z = 0.15;
        group.rotation.x = 0.1;
        // Repair progress glow
        if (pil.repairProgress > 0) {
          mat.emissive.setHex(0x44ccff);
          mat.emissiveIntensity = pil.repairProgress * 1.5;
          // Rebuild animation — scale back up as progress increases
          group.scale.y = 0.3 + pil.repairProgress * 0.7;
          group.rotation.z = 0.15 * (1 - pil.repairProgress);
          group.rotation.x = 0.1 * (1 - pil.repairProgress);
        } else {
          mat.emissiveIntensity = 0;
        }
      } else {
        mat.color.setHex(pil.status === "active" ? COL.PILLAR_ACTIVE : COL.PILLAR_DAMAGED);
        mat.emissiveIntensity = 0;
        group.scale.y = 1;
        group.rotation.z = 0;
        group.rotation.x = 0;
        gear.visible = true;
        gear.rotation.z += _dt * 2 * (pil.status === "active" ? 1 : 0.3);
        // Damaged pillar flickers
        if (pil.status === "damaged") {
          mat.emissive.setHex(0xcc6622);
          mat.emissiveIntensity = 0.15 + Math.sin(state.gameTime * 6) * 0.1;
        }
      }
    }

    // Tower internal gears spin
    for (let i = 0; i < this._towerGears.length; i++) {
      this._towerGears[i].rotation.z += _dt * (1.5 + i * 0.5) * (i % 2 === 0 ? 1 : -1);
    }

    // Tower windows flicker based on HP
    for (const w of this._towerWindows) {
      const wMat = w.material as THREE.MeshStandardMaterial;
      wMat.emissiveIntensity = towerHpPct > 0.5 ? 0.8 + Math.sin(state.gameTime * 3 + w.position.y) * 0.2 :
        towerHpPct > 0.25 ? 0.4 + Math.random() * 0.3 : Math.random() * 0.2;
    }

    // Tower cracks appear at low HP
    for (let i = 0; i < this._towerCracks.length; i++) {
      const threshold = 0.5 - (i / this._towerCracks.length) * 0.4;
      this._towerCracks[i].visible = towerHpPct < threshold;
      if (this._towerCracks[i].visible) {
        const cMat = this._towerCracks[i].material as THREE.MeshStandardMaterial;
        cMat.emissiveIntensity = 0.3 + Math.sin(state.gameTime * 4 + i) * 0.2;
      }
    }

    // Pendulum inner gear — spins opposite to bob swing
    this._pendulumInnerGear.position.copy(this._pendulumBob.position);
    this._pendulumInnerGear.rotation.z = -state.gameTime * 3;
    this._pendulumInnerGear.rotation.x = Math.PI / 2;

    // Pillar energy beams — visible when pillar is active, pulsing with flow
    for (let i = 0; i < state.pillars.length && i < this._pillarBeams.length; i++) {
      const pil = state.pillars[i];
      const beam = this._pillarBeams[i];
      beam.visible = pil.status === "active";
      if (pil.status === "active") {
        const bMat = beam.material as THREE.MeshBasicMaterial;
        // Pulsing opacity and width for "energy flow" feel
        const pulse = Math.sin(state.gameTime * 3 + i * 1.5) * 0.5 + 0.5;
        bMat.opacity = 0.08 + pulse * 0.12;
        bMat.color.setHex(state.apexStrikeActive ? 0xffcc44 : 0x44aacc);
        // Width pulse
        beam.scale.x = 1 + pulse * 0.5;
        // Vertical shimmer
        beam.position.y = 6 + Math.sin(state.gameTime * 5 + i) * 0.3;
      }
    }

    // Nebula time uniform
    if (this._nebulaMesh) {
      (this._nebulaMesh.material as THREE.ShaderMaterial).uniforms.time.value = state.gameTime;
    }

    // Ground fog drift with layered noise
    for (let i = 0; i < this._fogLayers.length; i++) {
      const fog = this._fogLayers[i];
      const drift = state.gameTime * (0.12 + i * 0.03);
      fog.position.x = Math.sin(drift + i * 2.3) * 15 + Math.cos(drift * 0.7) * 5;
      fog.position.z = Math.cos(drift * 0.8 + i * 1.7) * 12 + Math.sin(drift * 0.5) * 4;
      // Scale fog layers slightly for parallax feel
      fog.scale.setScalar(1 + i * 0.15 + Math.sin(state.gameTime * 0.3 + i) * 0.05);
      const fMat = fog.material as THREE.MeshBasicMaterial;
      // Opacity varies per layer + time — thicker near ground, thinner higher up
      const baseOpacity = 0.08 - i * 0.015;
      fMat.opacity = Math.max(0, baseOpacity + Math.sin(state.gameTime * 0.4 + i * 0.8) * 0.02);
      // Fog thickens during rust storm
      if (state.waveModifier === "rust_storm") {
        fMat.opacity *= 2.5;
        fMat.color.setHex(0x332211);
      } else {
        fMat.color.setHex(0x1a1125);
      }
    }

    // Ground gear decals slowly rotate
    for (const decal of this._groundGearDecals) {
      decal.rotation.z += _dt * 0.1;
    }

    // Ground rings pulse with pendulum power
    for (let i = 0; i < this._groundRings.length; i++) {
      const ring = this._groundRings[i];
      const rMat = ring.material as THREE.MeshBasicMaterial;
      const phase = state.gameTime * 0.8 - i * 0.3;
      const pulse = Math.sin(phase) * 0.5 + 0.5;
      rMat.opacity = 0.1 + pulse * powerNorm * 0.15;
      rMat.color.setHex(state.apexStrikeActive ? 0x665522 : 0x443322);
    }

    // Apex ground pulse ring
    if (state.apexStrikeActive) {
      this._apexPulseScale += _dt * 25;
      if (this._apexPulseScale > 40) this._apexPulseScale = 0;
      this._apexPulseRing.scale.setScalar(this._apexPulseScale);
      const pMat = this._apexPulseRing.material as THREE.MeshBasicMaterial;
      pMat.opacity = Math.max(0, 0.2 - this._apexPulseScale / 200);
      this._apexPulseRing.visible = true;
    } else {
      this._apexPulseRing.visible = false;
      this._apexPulseScale = 0;
    }

    // ---- Wave modifier environmental visuals ----
    switch (state.waveModifier) {
      case "rust_storm":
        this._fog.density = PENDULUM.FOG_DENSITY_RUST_STORM;
        this._fog.color.setHex(0x332211); // orange-brown tint
        this._sunLight.color.setHex(0xcc8844); // warm storm light
        this._hemiLight.color.setHex(0x664422);
        this._groundMat.color.setHex(0x332518); // darkened ground
        break;
      case "overclock":
        this._fog.density = PENDULUM.FOG_DENSITY_BASE;
        this._fog.color.setHex(0x1a1125);
        // Electric orange-yellow ambient
        this._sunLight.color.setHex(0xffcc66);
        this._sunLight.intensity = 1.0;
        this._hemiLight.color.setHex(0x665533);
        this._groundMat.color.setHex(0x2d2218);
        break;
      case "haywire":
        this._fog.density = PENDULUM.FOG_DENSITY_BASE * 0.8;
        this._fog.color.setHex(0x1a1125);
        // Glitchy red flicker
        this._sunLight.color.setHex(0xddaaaa);
        this._ambientLight.intensity = 0.6 + (Math.random() < 0.05 ? 0.4 : 0); // rare brightness spike
        this._groundMat.color.setHex(0x2a2220);
        break;
      case "magnetic":
        this._fog.density = PENDULUM.FOG_DENSITY_BASE;
        this._fog.color.setHex(0x111122);
        // Cool blue-purple tint
        this._sunLight.color.setHex(0xaabbdd);
        this._hemiLight.color.setHex(0x334466);
        this._groundMat.color.setHex(0x222230);
        break;
      default:
        this._fog.density = PENDULUM.FOG_DENSITY_BASE;
        this._fog.color.setHex(0x1a1125);
        if (!state.timeStopActive) {
          this._sunLight.color.setHex(0xffddaa);
          this._sunLight.intensity = 0.8;
          this._hemiLight.color.setHex(0x445566);
          this._groundMat.color.setHex(COL.GROUND);
        }
        break;
    }

    // ---- Hour-based lighting shifts ----
    const hour = state.clockHour;
    if (state.waveModifier === "none" && !state.timeStopActive) {
      // Shift sun angle and color with clock hour
      const sunAngle = (hour / 12) * Math.PI;
      this._sunLight.position.set(
        Math.cos(sunAngle) * 50,
        30 + Math.sin(sunAngle) * 20,
        Math.sin(sunAngle) * 30,
      );
      // Early hours: cooler; late hours: warmer/redder
      if (hour >= 10) {
        this._sunLight.color.setHex(0xcc8866); // late-game warm
        this._ambientLight.intensity = 0.5; // darker
      }
    }

    // Star twinkle + shooting stars
    if (this._starPoints) {
      const sizes = this._starPoints.geometry.getAttribute("size") as THREE.BufferAttribute;
      const positions = this._starPoints.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < sizes.count; i++) {
        sizes.setX(i, 0.5 + Math.sin(state.gameTime * 2 + i * 0.7) * 0.3);
      }
      // Shooting star — one star streaks across the sky occasionally
      const shootIdx = Math.floor(state.gameTime * 0.3) % sizes.count;
      const shootPhase = (state.gameTime * 0.3) % 1;
      if (shootPhase < 0.15) {
        // Brighten and shift position
        sizes.setX(shootIdx, 3 + (0.15 - shootPhase) * 20);
        positions.setX(shootIdx, positions.getX(shootIdx) + _dt * 80);
        positions.setZ(shootIdx, positions.getZ(shootIdx) + _dt * 40);
        positions.needsUpdate = true;
      }
      sizes.needsUpdate = true;
    }

    // Drifting clouds
    for (let i = 0; i < this._cloudMeshes.length; i++) {
      const cloud = this._cloudMeshes[i];
      cloud.position.x += _dt * (0.8 + i * 0.2) * (i % 2 === 0 ? 1 : -0.6);
      // Wrap around
      if (cloud.position.x > 150) cloud.position.x = -150;
      if (cloud.position.x < -150) cloud.position.x = 150;
      // Subtle opacity variation
      (cloud.material as THREE.MeshBasicMaterial).opacity = 0.04 + Math.sin(state.gameTime * 0.3 + i) * 0.02;
    }

    // Clockwork sparks — floating embers that drift and pulse
    if (this._sparkMesh && this._sparkData.length > 0) {
      const half = PENDULUM.GROUND_SIZE * 0.4;
      for (let i = 0; i < this._sparkData.length; i++) {
        const s = this._sparkData[i];
        // Drift
        s.pos.x += s.vel.x * _dt;
        s.pos.y += s.vel.y * _dt + Math.sin(state.gameTime * 2 + s.phase) * _dt * 0.3;
        s.pos.z += s.vel.z * _dt;
        // Gentle orbit tendency toward tower
        s.pos.x += (-s.pos.x * 0.001) * _dt;
        s.pos.z += (-s.pos.z * 0.001) * _dt;
        // Boundary wrap
        if (s.pos.x > half) s.pos.x = -half;
        if (s.pos.x < -half) s.pos.x = half;
        if (s.pos.z > half) s.pos.z = -half;
        if (s.pos.z < -half) s.pos.z = half;
        s.pos.y = Math.max(0.3, Math.min(8, s.pos.y));
        // Brightness pulse
        s.brightness = 0.4 + Math.sin(state.gameTime * 3 + s.phase) * 0.3;
        // Update instance matrix
        this._sparkDummy.position.copy(s.pos);
        this._sparkDummy.scale.setScalar(0.5 + s.brightness * 0.5);
        this._sparkDummy.updateMatrix();
        this._sparkMesh.setMatrixAt(i, this._sparkDummy.matrix);
      }
      this._sparkMesh.instanceMatrix.needsUpdate = true;
      // Color shifts with pendulum power
      (this._sparkMesh.material as THREE.MeshBasicMaterial).color.setHex(
        state.apexStrikeActive ? 0xffdd44 : 0xccaa44,
      );
    }

    // Fill lights — subtle pulse
    for (let i = 0; i < this._fillLights.length; i++) {
      this._fillLights[i].intensity = 0.25 + Math.sin(state.gameTime * 0.8 + i * 1.2) * 0.08;
    }

    // Steam vents — intermittent bursts via particle spawning
    // (particles are spawned in systems, vents just exist as geometry)
    for (let i = 0; i < this._steamVents.length; i++) {
      const vent = this._steamVents[i];
      // Slight bob
      vent.position.y = 0.5 + Math.sin(state.gameTime * 2 + i * 1.5) * 0.05;
    }

    // Pendulum trail effect
    this._updatePendulumTrail(state);

    // Time stop visual overlay
    this._updateTimeStopOverlay(state);

    // Update dynamic entities
    this._updateEnemies(state);
    this._updateTurrets(state);
    this._updateProjectiles(state);
    this._updateFragments(state);
    this._updateKits(state);
    this._updateParticles(state);
    this._updateSlowZones(state);
    this._updateDashTrails(state);
    this._updateTelegraphs(state);

    // Spin debris
    for (const mesh of this._debrisMeshes) {
      mesh.rotation.y += _dt * 0.3;
    }

    // Spin gear fragments
    for (const mesh of this._fragPool) {
      mesh.rotation.y += _dt * 8;
      mesh.rotation.x += _dt * 4;
    }

    // Apex power ground pulse
    if (state.apexStrikeActive) {
      this._ambientLight.intensity = 0.6 + Math.sin(state.gameTime * 8) * 0.15;
      this._pendulumGlow.color.setHex(0xffdd44);
    } else {
      this._ambientLight.intensity = 0.6;
      this._pendulumGlow.color.setHex(COL.PENDULUM_GLOW);
    }

    // Slash trail VFX
    this._updateSlashTrails(state, _dt);

    // Dash afterimages
    this._updateDashAfterImages(state);

    // Camera cinematics
    this._updateCameraMode(state, _dt);

    // Dynamic bloom intensity — stronger during apex, time stop
    if (this._bloomPass) {
      let bloomStr = 0.55;
      if (state.apexStrikeActive) bloomStr = 0.8;
      if (state.timeStopActive) bloomStr = 1.0;
      if (state.phase === "game_over" && state.victory) bloomStr = 1.2;
      this._bloomPass.strength = bloomStr;
    }

    // Vignette — intensifies during low HP, time stop, game over
    if (this._vignettePass) {
      const pHpPct = state.player.hp / state.player.maxHp;
      let vigInt = 0.45;
      if (pHpPct < 0.25) vigInt = 0.7; // danger vignette
      if (state.timeStopActive) vigInt = 0.6;
      if (state.phase === "game_over" && !state.victory) vigInt = 0.85;
      this._vignettePass.uniforms.uIntensity.value = vigInt;
      // Red tint when low HP
      if (pHpPct < 0.25 && !state.timeStopActive) {
        this._vignettePass.uniforms.uColor.value.set(0.15, 0.0, 0.0);
      } else {
        this._vignettePass.uniforms.uColor.value.set(0.02, 0.01, 0.04);
      }
    }

    // Render through post-processing pipeline
    this._composer.render();
  }

  private _updateSlashTrails(state: PendulumState, _dt: number): void {
    const p = state.player;
    for (let i = 0; i < this._slashTrails.length; i++) {
      const trail = this._slashTrails[i];
      const mat = trail.material as THREE.MeshBasicMaterial;

      // Show trail for the most recent combo step during attack cooldown
      if (p.chronoStrikeCD > PENDULUM.CHRONO_STRIKE_COOLDOWN * 0.3 && i === (p.strikeComboStep + 2) % 3) {
        const t = (p.chronoStrikeCD - PENDULUM.CHRONO_STRIKE_COOLDOWN * 0.3) / (PENDULUM.CHRONO_STRIKE_COOLDOWN * 0.7);
        trail.visible = true;
        mat.opacity = t * 0.5;
        mat.color.setHex(state.apexStrikeActive ? 0xffcc44 : 0x66aadd);

        // Position at player, oriented to swing direction
        const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
        trail.position.set(p.pos.x - sinY * 1.5, p.pos.y + 1.5, p.pos.z - cosY * 1.5);
        trail.rotation.y = p.yaw + Math.PI;
        // Alternate slash direction per combo step
        trail.rotation.z = (i % 2 === 0 ? 1 : -1) * (1 - t) * 1.5;
        trail.rotation.x = -0.3;
        trail.scale.setScalar(0.8 + t * 0.4);
      } else {
        trail.visible = false;
        mat.opacity = 0;
      }
    }
  }

  private _updateDashAfterImages(state: PendulumState): void {
    const p = state.player;
    if (p.action === "dashing" && p.dashTimer > 0) {
      // Space out afterimages along dash path
      for (let i = 0; i < this._dashAfterImages.length; i++) {
        const ghost = this._dashAfterImages[i];
        const mat = ghost.material as THREE.MeshBasicMaterial;
        const offset = (i + 1) * 0.06;
        if (p.dashTimer > offset) {
          ghost.visible = true;
          mat.opacity = 0.15 * (1 - i / this._dashAfterImages.length);
          ghost.position.set(
            p.pos.x + p.dashDir.x * i * 1.2,
            p.pos.y + 1,
            p.pos.z + p.dashDir.z * i * 1.2,
          );
          ghost.rotation.y = p.yaw + Math.PI;
        } else {
          ghost.visible = false;
        }
      }
    } else {
      for (const ghost of this._dashAfterImages) ghost.visible = false;
    }
  }

  private _updateCameraMode(state: PendulumState, dt: number): void {
    // Boss spawn — quick zoom toward boss
    if (state.pendingBossRoar && state.bossId) {
      const boss = state.enemies.get(state.bossId);
      if (boss) {
        this._cameraMode = "boss_zoom";
        this._cinematicTimer = 1.5;
        this._cinematicTarget.set(boss.pos.x, boss.pos.y + 4, boss.pos.z);
        state.pendingBossRoar = false;
      }
    }

    // Death camera
    if (state.player.action === "dead" && this._cameraMode !== "death") {
      this._cameraMode = "death";
      this._cinematicTimer = 3;
    }

    // Victory camera
    if (state.victory && this._cameraMode !== "victory") {
      this._cameraMode = "victory";
      this._cinematicTimer = 5;
    }

    if (this._cinematicTimer > 0) {
      this._cinematicTimer -= dt;
      if (this._cinematicTimer <= 0) {
        this._cameraMode = "follow";
      }
    }

    switch (this._cameraMode) {
      case "boss_zoom": {
        // Zoom camera toward boss then back
        const t = Math.max(0, this._cinematicTimer / 1.5);
        const zoomLerp = t > 0.5 ? (1 - t) * 2 : t * 2; // in-out
        this._cameraTarget.lerpVectors(
          new THREE.Vector3(
            state.player.pos.x + Math.sin(state.player.yaw) * PENDULUM.CAMERA_FOLLOW_DIST,
            state.player.pos.y + PENDULUM.CAMERA_FOLLOW_HEIGHT,
            state.player.pos.z + Math.cos(state.player.yaw) * PENDULUM.CAMERA_FOLLOW_DIST,
          ),
          new THREE.Vector3(this._cinematicTarget.x + 8, this._cinematicTarget.y + 6, this._cinematicTarget.z + 8),
          zoomLerp * 0.6,
        );
        this._camera.position.lerp(this._cameraTarget, 0.08);
        this._camera.lookAt(this._cinematicTarget);
        break;
      }
      case "death": {
        // Slow pullback and tilt up
        this._camera.position.y += dt * 2;
        this._camera.position.x += Math.sin(state.gameTime * 0.3) * dt * 0.5;
        this._camera.lookAt(state.player.pos.x, state.player.pos.y + 1, state.player.pos.z);
        break;
      }
      case "victory": {
        // Orbit around tower triumphantly
        const orbitAngle = state.gameTime * 0.3;
        const orbitR = 25;
        this._cameraTarget.set(
          Math.cos(orbitAngle) * orbitR,
          15 + Math.sin(state.gameTime * 0.5) * 3,
          Math.sin(orbitAngle) * orbitR,
        );
        this._camera.position.lerp(this._cameraTarget, 0.03);
        this._camera.lookAt(0, 20, 0); // look at tower
        break;
      }
      default:
        // Normal follow handled in main update
        break;
    }
  }

  private _updateEnemies(state: PendulumState): void {
    // Remove stale
    for (const [id, group] of this._enemyMeshes) {
      if (!state.enemies.has(id)) {
        // Dispose materials to prevent GPU memory leak
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mat = (child as THREE.Mesh).material;
            if (Array.isArray(mat)) mat.forEach(m => m.dispose());
            else if (mat) mat.dispose();
          }
        });
        this._scene.remove(group);
        this._enemyMeshes.delete(id);
      }
    }

    const enemyColors: Record<string, number> = {
      gear_drone: COL.GEAR_DRONE,
      spring_knight: COL.SPRING_KNIGHT,
      coil_archer: COL.COIL_ARCHER,
      brass_golem: COL.BRASS_GOLEM,
      clock_spider: COL.CLOCK_SPIDER,
      chronovore: COL.CHRONOVORE,
    };

    for (const [id, enemy] of state.enemies) {
      let group = this._enemyMeshes.get(id);

      if (!group) {
        group = new THREE.Group();
        const color = enemyColors[enemy.type] || 0x888888;
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.4 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff4444, emissiveIntensity: 1 });

        switch (enemy.type) {
          case "gear_drone": {
            // Small flying gear with wings
            const core = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.12, 4, 8), mat);
            core.rotation.x = Math.PI / 2;
            core.position.y = 2;
            core.castShadow = true;
            group.add(core);
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), eyeMat);
            eye.position.set(0, 2, 0.3);
            group.add(eye);
            break;
          }
          case "spring_knight": {
            // Tall humanoid with spring-coil legs
            const body = new THREE.Mesh(this._boxGeo, mat);
            body.scale.set(0.8, 1.4, 0.6);
            body.position.y = 1.5;
            body.castShadow = true;
            group.add(body);
            const helm = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 6), mat);
            helm.position.y = 2.5;
            group.add(helm);
            // Spring legs
            const springMat = new THREE.MeshStandardMaterial({ color: 0x889988, metalness: 0.6, roughness: 0.4 });
            const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.0, 4), springMat);
            legL.position.set(-0.25, 0.5, 0);
            const legR = legL.clone();
            legR.position.x = 0.25;
            group.add(legL, legR);
            const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), eyeMat);
            eyeL.position.set(-0.12, 2.3, 0.25);
            const eyeR = eyeL.clone(); eyeR.position.x = 0.12;
            group.add(eyeL, eyeR);
            break;
          }
          case "coil_archer": {
            // Lean figure with crossbow arm
            const body = new THREE.Mesh(this._boxGeo, mat);
            body.scale.set(0.6, 1.2, 0.5);
            body.position.y = 1.2;
            body.castShadow = true;
            group.add(body);
            const head = new THREE.Mesh(this._sphereGeo, mat);
            head.scale.setScalar(0.5);
            head.position.y = 2.0;
            group.add(head);
            // Crossbow arm
            const bowMat = new THREE.MeshStandardMaterial({ color: 0x887766, metalness: 0.5, roughness: 0.5 });
            const bow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.1), bowMat);
            bow.position.set(0.6, 1.3, 0.3);
            group.add(bow);
            const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), eyeMat);
            eyeL.position.set(-0.1, 2.05, 0.2);
            const eyeR = eyeL.clone(); eyeR.position.x = 0.1;
            group.add(eyeL, eyeR);
            break;
          }
          case "brass_golem": {
            // Massive blocky brute
            const torso = new THREE.Mesh(this._boxGeo, mat);
            torso.scale.set(2.2, 2.0, 1.5);
            torso.position.y = 2;
            torso.castShadow = true;
            group.add(torso);
            const head = new THREE.Mesh(this._boxGeo, mat);
            head.scale.set(1.2, 0.8, 1.0);
            head.position.y = 3.5;
            group.add(head);
            // Fists
            const fistMat = new THREE.MeshStandardMaterial({ color: 0xbb9944, metalness: 0.7, roughness: 0.3 });
            const fistL = new THREE.Mesh(this._sphereGeo, fistMat);
            fistL.scale.setScalar(0.8);
            fistL.position.set(-1.5, 1.2, 0);
            const fistR = fistL.clone(); fistR.position.x = 1.5;
            group.add(fistL, fistR);
            const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 4), eyeMat);
            eyeL.position.set(-0.3, 3.6, 0.4);
            const eyeR = eyeL.clone(); eyeR.position.x = 0.3;
            group.add(eyeL, eyeR);
            break;
          }
          case "clock_spider": {
            // Low, wide, with legs
            const body = new THREE.Mesh(this._sphereGeo, mat);
            body.scale.set(0.8, 0.4, 1.0);
            body.position.y = 0.5;
            body.castShadow = true;
            group.add(body);
            // 4 pairs of legs
            const legMat = new THREE.MeshStandardMaterial({ color: 0x665566, metalness: 0.5, roughness: 0.5 });
            for (let l = 0; l < 4; l++) {
              const angle = (l / 4) * Math.PI - Math.PI / 4;
              const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 3), legMat);
              leg.position.set(Math.cos(angle) * 0.5, 0.3, Math.sin(angle) * 0.5);
              leg.rotation.z = angle > 0 ? 0.5 : -0.5;
              group.add(leg);
              const legR = leg.clone();
              legR.position.x *= -1;
              legR.rotation.z *= -1;
              group.add(legR);
            }
            const eyes = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), eyeMat);
            eyes.position.set(0, 0.6, 0.4);
            group.add(eyes);
            break;
          }
          case "chronovore": {
            // Massive multi-limbed horror
            const body = new THREE.Mesh(this._boxGeo, mat);
            body.scale.set(3, 3.5, 2.5);
            body.position.y = 3;
            body.castShadow = true;
            group.add(body);
            const head = new THREE.Mesh(this._sphereGeo, mat);
            head.scale.set(2, 1.5, 2);
            head.position.y = 5.5;
            group.add(head);
            // Clock face on chest
            const faceMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, emissive: 0xcc4444, emissiveIntensity: 0.5 });
            const face = new THREE.Mesh(new THREE.CircleGeometry(1, 12), faceMat);
            face.position.set(0, 3, 1.3);
            group.add(face);
            // Multiple arms
            const armMat = new THREE.MeshStandardMaterial({ color: 0x993344, metalness: 0.5, roughness: 0.5 });
            for (let a = 0; a < 3; a++) {
              const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 2.5, 4), armMat);
              arm.position.set(-2, 3.5 - a * 0.8, 0);
              arm.rotation.z = 0.8;
              group.add(arm);
              const armR = arm.clone();
              armR.position.x = 2;
              armR.rotation.z = -0.8;
              group.add(armR);
            }
            // Boss eye
            const bossEye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), eyeMat);
            bossEye.position.set(0, 5.7, 0.8);
            group.add(bossEye);
            // Boss glow
            const glow = new THREE.PointLight(0xff4444, 2, 20);
            glow.position.y = 4;
            group.add(glow);
            break;
          }
        }

        // Enable shadows on all parts
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).castShadow = true;
          }
        });

        // Spawn materialization — start scaled down and grow
        group.scale.setScalar(0.01);

        this._scene.add(group);
        this._enemyMeshes.set(id, group);
      }

      group.position.set(enemy.pos.x, enemy.pos.y, enemy.pos.z);
      group.rotation.y = enemy.rotation;

      // Charging glow — spring knights and brass golems glow before attacks
      if (enemy.behavior === "charging" && (enemy.type === "spring_knight" || enemy.type === "brass_golem")) {
        const bodyM = group.children[0] as THREE.Mesh;
        if (bodyM) {
          (bodyM.material as THREE.MeshStandardMaterial).emissive.setHex(
            enemy.type === "spring_knight" ? 0xff6644 : 0xcc4422,
          );
          (bodyM.material as THREE.MeshStandardMaterial).emissiveIntensity =
            0.3 + Math.sin(state.gameTime * 12) * 0.2;
        }
      }

      // Brass golem slam wind-up glow
      if (enemy.slamDelayTimer > 0 && enemy.type === "brass_golem") {
        const bodyM = group.children[0] as THREE.Mesh;
        if (bodyM) {
          (bodyM.material as THREE.MeshStandardMaterial).emissive.setHex(0xff4422);
          (bodyM.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + enemy.slamDelayTimer;
          // Raise fists up during wind-up
          group.scale.y = 1 + enemy.slamDelayTimer * 0.2;
        }
      } else if (enemy.type === "brass_golem" && enemy.behavior !== "dead") {
        group.scale.y = 1;
      }

      // Walk bobbing for approaching/chasing enemies
      if (enemy.behavior === "approaching" || enemy.behavior === "chasing" || enemy.behavior === "charging") {
        const bobAmp = enemy.type === "brass_golem" ? 0.15 : enemy.type === "clock_spider" ? 0.05 : 0.1;
        const bobFreq = enemy.speed * 1.2;
        group.position.y += Math.abs(Math.sin(state.gameTime * bobFreq + enemy.bobPhase)) * bobAmp;
        // Slight tilt toward movement direction
        group.rotation.z = Math.sin(state.gameTime * bobFreq * 0.5 + enemy.bobPhase) * 0.05;
      } else {
        group.rotation.z = 0;
      }

      // Death dissolve — scale down + spin + emissive burst
      if (enemy.behavior === "dead") {
        const deathT = Math.max(0, enemy.deathTimer / 0.5); // 0→1 over death
        group.scale.setScalar(deathT);
        group.rotation.y += (1 - deathT) * 0.3; // spin as dying
        // Emissive burst during death
        const bodyM = group.children[0] as THREE.Mesh;
        if (bodyM) {
          (bodyM.material as THREE.MeshStandardMaterial).emissive.setHex(0xffaa44);
          (bodyM.material as THREE.MeshStandardMaterial).emissiveIntensity = (1 - deathT) * 3;
        }
      } else {
        // Spawn grow-in (scale from 0.01 to 1 over ~0.3s)
        const currentScale = group.scale.x;
        if (currentScale < 0.99) {
          group.scale.setScalar(Math.min(1, currentScale + 0.08));
        } else {
          group.scale.setScalar(1);
        }
      }

      // Hit flash
      if (enemy.hitFlash > 0) {
        const body = group.children[0] as THREE.Mesh;
        (body.material as THREE.MeshStandardMaterial).emissive.setHex(0xffffff);
        (body.material as THREE.MeshStandardMaterial).emissiveIntensity = enemy.hitFlash * 5;
      } else {
        const body = group.children[0] as THREE.Mesh;
        (body.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      }

      // Frozen tint
      if (enemy.frozenTimer > 0) {
        const body = group.children[0] as THREE.Mesh;
        (body.material as THREE.MeshStandardMaterial).emissive.setHex(COL.TIME_STOP);
        (body.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
      }

      // Time slowed tint
      if (enemy.timeSlowed && enemy.frozenTimer <= 0) {
        const body = group.children[0] as THREE.Mesh;
        (body.material as THREE.MeshStandardMaterial).emissive.setHex(COL.TIME_SLOW);
        (body.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;
      }

      // Chronovore phase visuals — body pulses, eye grows, color shifts
      if (enemy.type === "chronovore" && enemy.behavior !== "dead") {
        const body = group.children[0] as THREE.Mesh;
        const bodyMat = body.material as THREE.MeshStandardMaterial;
        const hpRatio = enemy.hp / enemy.maxHp;

        // Phase 2+: body pulses red
        if (enemy.bossPhase >= 1) {
          bodyMat.emissive.setHex(enemy.bossPhase >= 2 ? 0xcc2222 : 0x884422);
          bodyMat.emissiveIntensity = 0.2 + Math.sin(state.gameTime * (enemy.bossPhase >= 2 ? 6 : 3)) * 0.15;
        }

        // Scale boss eye with damage (angrier as HP drops)
        if (group.children.length > 6) {
          const bossEye = group.children[6] as THREE.Mesh;
          bossEye.scale.setScalar(1 + (1 - hpRatio) * 1.5);
        }

        // Body scale breathing
        const breathe = 1 + Math.sin(state.gameTime * 2) * 0.03;
        body.scale.set(3 * breathe, 3.5, 2.5 * breathe);

        // Clock face on chest spins faster in later phases
        if (group.children.length > 2) {
          const face = group.children[2] as THREE.Mesh;
          face.rotation.z = state.gameTime * (1 + enemy.bossPhase * 2);
        }
      }

      // Apply colorVariant as subtle hue shift
      if (enemy.behavior !== "dead" && enemy.hitFlash <= 0 && enemy.frozenTimer <= 0 && !enemy.timeSlowed) {
        const body = group.children[0] as THREE.Mesh;
        const baseMat = body.material as THREE.MeshStandardMaterial;
        const baseColor = enemyColors[enemy.type] || 0x888888;
        // Shift hue slightly based on colorVariant
        const r = ((baseColor >> 16) & 0xff) / 255;
        const g = ((baseColor >> 8) & 0xff) / 255;
        const b = (baseColor & 0xff) / 255;
        const shift = (enemy.colorVariant - 0.5) * 0.2;
        baseMat.color.setRGB(
          Math.max(0, Math.min(1, r + shift)),
          Math.max(0, Math.min(1, g + shift * 0.5)),
          Math.max(0, Math.min(1, b - shift * 0.3)),
        );
      }
    }

    // 3D enemy HP bars — billboard facing camera
    for (const m of this._hpBarBgs) m.visible = false;
    for (const m of this._hpBarFills) m.visible = false;
    let hpIdx = 0;
    for (const enemy of state.enemies.values()) {
      if (enemy.behavior === "dead" || hpIdx >= this._hpBarBgs.length) continue;
      if (enemy.hp >= enemy.maxHp) continue; // don't show full HP bars
      const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
      const barWidth = enemy.type === "chronovore" ? 3 : enemy.type === "brass_golem" ? 2 : 1;
      const barY = enemy.type === "chronovore" ? 7 : enemy.type === "brass_golem" ? 5 : enemy.type === "gear_drone" ? 3 : 2.5;

      // Background
      const bg = this._hpBarBgs[hpIdx];
      bg.scale.set(barWidth, 1, 1);
      bg.position.set(enemy.pos.x, enemy.pos.y + barY, enemy.pos.z);
      bg.quaternion.copy(this._camera.quaternion);
      bg.visible = true;

      // Fill
      const fill = this._hpBarFills[hpIdx];
      const fillMat = fill.material as THREE.MeshBasicMaterial;
      fillMat.color.setHex(hpPct > 0.5 ? 0x44cc44 : hpPct > 0.25 ? 0xccaa44 : 0xcc4444);
      fill.scale.set(barWidth * hpPct, 1, 1);
      fill.position.set(
        enemy.pos.x - (barWidth * (1 - hpPct) * 0.5) * 0.5,
        enemy.pos.y + barY,
        enemy.pos.z,
      );
      fill.quaternion.copy(this._camera.quaternion);
      fill.visible = true;

      hpIdx++;
    }
  }

  private _updateProjectiles(state: PendulumState): void {
    // Hide all pooled projectile meshes
    for (const m of this._projPool) m.visible = false;

    const count = Math.min(state.projectiles.length, this._projPool.length);
    for (let i = 0; i < count; i++) {
      const proj = state.projectiles[i];
      const mesh = this._projPool[i];
      const mat = mesh.material as THREE.MeshStandardMaterial;

      const color = proj.type === "gear" ? COL.GEAR_FRAGMENT :
                    proj.type === "reversed_bolt" ? COL.TIME_SLOW :
                    proj.type === "chrono_beam" ? COL.CHRONOVORE :
                    COL.BOLT;
      mat.color.setHex(color);
      mat.emissive.setHex(color);

      if (proj.type === "gear") {
        mesh.scale.setScalar(0.4);
        mesh.rotation.z = state.gameTime * 15;
        mesh.rotation.x = Math.PI / 2;
      } else if (proj.type === "chrono_beam") {
        mesh.scale.set(0.3, 0.3, 0.8);
        mesh.rotation.set(0, 0, 0);
      } else {
        mesh.scale.setScalar(0.2);
        mesh.rotation.set(0, 0, 0);
      }
      mesh.position.set(proj.pos.x, proj.pos.y + 1, proj.pos.z);
      mesh.visible = true;
    }
  }

  private _updateFragments(state: PendulumState): void {
    for (const m of this._fragPool) m.visible = false;
    const count = Math.min(state.gearFragments.length, this._fragPool.length);
    for (let i = 0; i < count; i++) {
      const frag = state.gearFragments[i];
      const mesh = this._fragPool[i];
      mesh.position.set(frag.pos.x, frag.pos.y, frag.pos.z);
      mesh.visible = true;
    }
  }

  private _updateKits(state: PendulumState): void {
    for (const m of this._kitPool) m.visible = false;
    const count = Math.min(state.repairKits.length, this._kitPool.length);
    for (let i = 0; i < count; i++) {
      const kit = state.repairKits[i];
      const mesh = this._kitPool[i];
      mesh.position.set(kit.pos.x, kit.pos.y, kit.pos.z);
      mesh.visible = true;
    }
  }

  private _updateParticles(state: PendulumState): void {
    for (const m of this._particlePool) m.visible = false;
    const maxRender = Math.min(state.particles.length, this._particlePool.length);
    for (let i = 0; i < maxRender; i++) {
      const part = state.particles[i];
      const mesh = this._particlePool[i];
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const alpha = part.life / part.maxLife;
      mat.color.setHex(part.color);
      mat.opacity = alpha;
      mesh.scale.setScalar(part.size * alpha);
      mesh.position.set(part.pos.x, part.pos.y, part.pos.z);
      mesh.visible = true;
    }
  }

  private _updateSlowZones(state: PendulumState): void {
    for (const m of this._slowZonePool) m.visible = false;
    for (const m of this._slowZoneHandPool) m.visible = false;

    const maxZones = Math.min(state.timeSlowZones.length, Math.floor(this._slowZonePool.length / 2));
    for (let i = 0; i < maxZones; i++) {
      const zone = state.timeSlowZones[i];
      const alpha = Math.min(1, zone.timer / 1.5) * 0.25;

      // Cylinder wall
      const cyl = this._slowZonePool[i * 2];
      const cylMat = cyl.material as THREE.MeshBasicMaterial;
      cylMat.color.setHex(COL.TIME_SLOW);
      cylMat.opacity = alpha;
      cyl.scale.set(zone.radius, 1, zone.radius);
      cyl.position.set(zone.pos.x, 1.5, zone.pos.z);
      cyl.visible = true;

      // Ring on ground
      const ring = this._slowZonePool[i * 2 + 1];
      const ringMat = ring.material as THREE.MeshBasicMaterial;
      ringMat.color.setHex(COL.TIME_SLOW);
      ringMat.opacity = alpha * 1.5;
      ring.scale.setScalar(zone.radius);
      ring.position.set(zone.pos.x, 0.05, zone.pos.z);
      ring.rotation.x = -Math.PI / 2;
      ring.visible = true;

      // Clock hands inside zone — slow rotation
      if (i * 2 < this._slowZoneHandPool.length) {
        const hourHand = this._slowZoneHandPool[i * 2];
        hourHand.position.set(zone.pos.x, 0.08, zone.pos.z);
        hourHand.rotation.z = state.gameTime * zone.factor * 0.5;
        (hourHand.material as THREE.MeshBasicMaterial).opacity = alpha * 1.2;
        hourHand.visible = true;

        const minuteHand = this._slowZoneHandPool[i * 2 + 1];
        minuteHand.position.set(zone.pos.x, 0.09, zone.pos.z);
        minuteHand.rotation.z = state.gameTime * zone.factor * 2;
        (minuteHand.material as THREE.MeshBasicMaterial).opacity = alpha * 1.2;
        minuteHand.visible = true;
      }
    }
  }

  private _updateTelegraphs(state: PendulumState): void {
    for (const m of this._telegraphPool) m.visible = false;
    const maxTel = Math.min(state.telegraphs.length, Math.floor(this._telegraphPool.length / 2));
    for (let i = 0; i < maxTel; i++) {
      const tel = state.telegraphs[i];
      const alpha = Math.min(1, tel.timer) * 0.4;
      const pulseScale = 1 + Math.sin(state.gameTime * 12) * 0.1;

      // Ring outline
      const ring = this._telegraphPool[i * 2];
      const ringMat = ring.material as THREE.MeshBasicMaterial;
      ringMat.color.setHex(tel.color);
      ringMat.opacity = alpha;
      ring.scale.setScalar(tel.radius * pulseScale);
      ring.position.set(tel.pos.x, 0.08, tel.pos.z);
      ring.rotation.x = -Math.PI / 2;
      ring.visible = true;

      // Fill
      const fill = this._telegraphPool[i * 2 + 1];
      const fillMat = fill.material as THREE.MeshBasicMaterial;
      fillMat.color.setHex(tel.color);
      fillMat.opacity = alpha * 0.2;
      fill.scale.setScalar(tel.radius * pulseScale);
      fill.position.set(tel.pos.x, 0.06, tel.pos.z);
      fill.visible = true;
    }
  }

  private _updatePendulumTrail(_state: PendulumState): void {
    // Hide all trail pool meshes
    for (const m of this._trailPool) m.visible = false;

    // Add current bob position to trail history
    const bobPos = this._pendulumBob.position.clone();
    this._pendulumTrailPositions.push(bobPos);
    if (this._pendulumTrailPositions.length > 12) this._pendulumTrailPositions.shift();

    // Show trail using pooled meshes
    const count = Math.min(this._pendulumTrailPositions.length, this._trailPool.length);
    for (let i = 0; i < count; i++) {
      const mesh = this._trailPool[i];
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const alpha = (i / count) * 0.4;
      mat.opacity = alpha;
      const scale = 0.3 + (i / count) * 0.8;
      mesh.scale.setScalar(scale);
      mesh.position.copy(this._pendulumTrailPositions[i]);
      mesh.visible = true;
    }
  }

  private _updateTimeStopOverlay(state: PendulumState): void {
    const mat = this._timeStopOverlay.material as THREE.MeshBasicMaterial;
    if (state.timeStopActive) {
      mat.opacity = 0.08 + Math.sin(state.gameTime * 4) * 0.03;
      if (!this._timeStopOverlay.parent) this._scene.add(this._timeStopOverlay);
      // Position in front of camera
      this._timeStopOverlay.position.copy(this._camera.position);
      this._timeStopOverlay.quaternion.copy(this._camera.quaternion);
      this._timeStopOverlay.translateZ(-2);
      // Desaturate scene slightly
      this._ambientLight.color.setHex(0x6677aa);
      this._sunLight.intensity = 0.4;
    } else {
      mat.opacity = 0;
      if (this._timeStopOverlay.parent) this._scene.remove(this._timeStopOverlay);
      this._ambientLight.color.setHex(0x334455);
      this._sunLight.intensity = 0.8;
    }
  }

  private _updateTurrets(state: PendulumState): void {
    // Remove stale
    for (const [id, group] of this._turretGroups) {
      if (!state.turrets.find(t => t.id === id)) {
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mat = (child as THREE.Mesh).material;
            if (Array.isArray(mat)) mat.forEach(m => m.dispose());
            else if (mat) mat.dispose();
          }
        });
        this._scene.remove(group);
        this._turretGroups.delete(id);
      }
    }

    for (const turret of state.turrets) {
      let group = this._turretGroups.get(turret.id);
      if (!group) {
        group = new THREE.Group();
        // Base — hexagonal platform
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x445555, metalness: 0.5, roughness: 0.5 });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.5, 6), baseMat);
        base.position.y = 0.25;
        base.castShadow = true;
        group.add(base);

        // Central column
        const colMat = new THREE.MeshStandardMaterial({ color: 0x556666, metalness: 0.6, roughness: 0.4 });
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.8, 6), colMat);
        col.position.y = 0.9;
        group.add(col);

        // Rotating turret head (dome)
        const domeMat = new THREE.MeshStandardMaterial({ color: 0x44aacc, metalness: 0.5, roughness: 0.4, emissive: 0x44aacc, emissiveIntensity: 0.3 });
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), domeMat);
        dome.position.y = 1.5;
        dome.scale.y = 0.6;
        group.add(dome);

        // Barrel
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x778888, metalness: 0.7, roughness: 0.3 });
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 6), barrelMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 1.5, 0.7);
        group.add(barrel);

        // Muzzle tip (glows on fire)
        const muzzleMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, emissive: 0xccaa44, emissiveIntensity: 0 });
        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.15, 4, 4), muzzleMat);
        muzzle.position.set(0, 1.5, 1.6);
        group.add(muzzle);

        // Radar dish on top
        const dishMat = new THREE.MeshStandardMaterial({ color: 0x667777, metalness: 0.5, roughness: 0.4 });
        const dish = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.15, 8), dishMat);
        dish.position.y = 1.9;
        dish.rotation.x = Math.PI;
        group.add(dish);

        // Base ring glow
        const baseRing = new THREE.Mesh(
          new THREE.RingGeometry(0.9, 1.2, 12),
          new THREE.MeshBasicMaterial({ color: 0x44aacc, transparent: true, opacity: 0.12, side: THREE.DoubleSide }),
        );
        baseRing.rotation.x = -Math.PI / 2;
        baseRing.position.y = 0.02;
        group.add(baseRing);

        group.position.set(turret.pos.x, 0, turret.pos.z);
        this._scene.add(group);
        this._turretGroups.set(turret.id, group);
      }

      // Rotate barrel toward target
      group.rotation.y = turret.barrelRotation;

      // Muzzle flash — glow when recently fired
      if (group.children.length > 5) {
        const muzzle = group.children[5] as THREE.Mesh;
        const mMat = muzzle.material as THREE.MeshStandardMaterial;
        const justFired = turret.attackTimer > PENDULUM.TURRET_FIRE_RATE * 0.85;
        mMat.emissiveIntensity = justFired ? 2.0 : 0;
        if (justFired) muzzle.scale.setScalar(1.5);
        else muzzle.scale.setScalar(1);
      }

      // Radar dish spin
      if (group.children.length > 6) {
        const dish = group.children[6] as THREE.Mesh;
        dish.rotation.y = state.gameTime * 4;
      }
    }

    // Turret HP bars
    for (const m of this._turretHpBgs) m.visible = false;
    for (const m of this._turretHpFills) m.visible = false;
    for (let i = 0; i < state.turrets.length && i < this._turretHpBgs.length; i++) {
      const turret = state.turrets[i];
      if (turret.hp >= turret.maxHp) continue;
      const hpPct = Math.max(0, turret.hp / turret.maxHp);
      const bg = this._turretHpBgs[i];
      bg.position.set(turret.pos.x, 2.5, turret.pos.z);
      bg.quaternion.copy(this._camera.quaternion);
      bg.visible = true;
      const fill = this._turretHpFills[i];
      const fillMat = fill.material as THREE.MeshBasicMaterial;
      fillMat.color.setHex(hpPct > 0.5 ? 0x44aacc : hpPct > 0.25 ? 0xccaa44 : 0xcc4444);
      fill.scale.set(hpPct, 1, 1);
      fill.position.set(turret.pos.x - (1 - hpPct) * 0.25, 2.5, turret.pos.z);
      fill.quaternion.copy(this._camera.quaternion);
      fill.visible = true;
    }
  }

  private _updateDashTrails(state: PendulumState): void {
    for (const m of this._dashTrailPool) m.visible = false;
    const count = Math.min(state.dashTrails.length, this._dashTrailPool.length);
    for (let i = 0; i < count; i++) {
      const trail = state.dashTrails[i];
      const mesh = this._dashTrailPool[i];
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(1, trail.timer / 0.5) * 0.3;
      mesh.scale.setScalar(trail.radius);
      mesh.position.set(trail.pos.x, 0.05, trail.pos.z);
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
