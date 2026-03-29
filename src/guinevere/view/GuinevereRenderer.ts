// ---------------------------------------------------------------------------
// Guinevere: The Astral Garden — Three.js 3D renderer
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { GUIN } from "../config/GuinevereConfig";
import type { GuinevereState, GardenPlant, GuinevereEnemy, SeedType, WaveModifier } from "../state/GuinevereState";
import { ARTIFACT_INFO } from "../state/GuinevereState";

const TAU = Math.PI * 2;

// Plant color palette
const PLANT_COLORS: Record<SeedType, { stem: number; bloom: number; glow: number }> = {
  crystal_rose:  { stem: 0x44aa66, bloom: 0xff88cc, glow: 0xff44aa },
  starbloom:     { stem: 0x55aa55, bloom: 0xffd700, glow: 0xffaa00 },
  moonvine:      { stem: 0x338855, bloom: 0x88ccff, glow: 0x4488ff },
  aurora_tree:   { stem: 0x446644, bloom: 0x44ffaa, glow: 0x22cc88 },
  void_lily:     { stem: 0x554466, bloom: 0xaa44ff, glow: 0x8822cc },
};

export class GuinevereRenderer {
  canvas!: HTMLCanvasElement;
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;

  // Post-processing
  private _composer!: EffectComposer;
  private _bloomPass!: UnrealBloomPass;

  // Sky
  private _skyDome!: THREE.Mesh;
  private _stars: THREE.Points | null = null;

  // Islands
  private _islandMeshes: THREE.Mesh[] = [];
  private _bridgeMeshes: THREE.Mesh[] = [];

  // Plants
  private _plantMeshes = new Map<number, THREE.Group>();

  // Player
  private _playerGroup!: THREE.Group;
  private _playerBody!: THREE.Mesh;
  private _playerCrown!: THREE.Mesh;
  private _playerStaff!: THREE.Mesh;
  private _playerCape!: THREE.Mesh;

  // Enemies
  private _enemyMeshes = new Map<number, THREE.Group>();

  // Thorn walls
  private _thornMeshes = new Map<number, THREE.Group>();

  // Projectiles
  private _projectileMeshes = new Map<number, THREE.Mesh>();

  // Particles (instanced)
  private _particleInstancedMesh!: THREE.InstancedMesh;
  private _maxParticles = 600;
  private _particleDummy = new THREE.Object3D();

  // Lights
  private _ambientLight!: THREE.AmbientLight;
  private _sunLight!: THREE.DirectionalLight;
  private _moonLight!: THREE.DirectionalLight;
  private _playerGlow!: THREE.PointLight;
  // Reserved for future per-plant lighting
  // private _plantLights: THREE.PointLight[] = [];

  // Fog
  private _fog!: THREE.FogExp2;

  // Effects
  private _blossomRing: THREE.Mesh | null = null;
  private _rootBindRing: THREE.Mesh | null = null;
  private _auroraShield: THREE.Mesh | null = null;

  // Moonbeam visual beam
  private _moonbeamLine: THREE.Line | null = null;
  private _moonbeamTimer = 0;

  // Moon mesh
  private _moonMesh: THREE.Mesh | null = null;
  private _moonPointLight: THREE.PointLight | null = null;

  // Enemy HP bars
  private _hpBarMeshes = new Map<number, THREE.Group>();

  // Minimap
  private _minimapCanvas!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;

  // Damage number sprites
  private _damageNumberSprites = new Map<number, THREE.Sprite>();
  private _damageNumberIdCounter = 0;
  private _activeDamageNumbers: { spriteId: number; timer: number; maxTimer: number; pos: { x: number; y: number; z: number } }[] = [];

  // Synergy zone rings
  private _synergyRings = new Map<string, THREE.Mesh>();

  // Celestial burst ring
  private _celestialBurstRing: THREE.Mesh | null = null;
  private _celestialBurstTimer = 0;

  // Boss entrance shockwave
  private _bossShockwave: THREE.Mesh | null = null;
  private _bossShockwaveTimer = 0;

  // Perfect dodge flash ring
  private _perfectDodgeRing: THREE.Mesh | null = null;
  private _perfectDodgeTimer = 0;

  // Elite enemy aura rings
  private _eliteAuraRings = new Map<number, THREE.Mesh>();

  // Stag charge trails
  private _stagTrails = new Map<number, THREE.Mesh[]>();

  // Environmental decor
  private _crystalFormations: THREE.Mesh[] = [];
  private _fireflyLights: THREE.PointLight[] = [];
  private _fireflyPivots: THREE.Object3D[] = [];
  private _islandGlowRings: THREE.Mesh[] = [];

  // Weather particles
  private _weatherParticles: THREE.Points | null = null;
  private _lastModifier: WaveModifier = "none";

  // Northern lights (aurora borealis)
  private _auroraMeshes: THREE.Mesh[] = [];

  // Telegraph warning circles
  private _telegraphMeshes: THREE.Mesh[] = [];

  // Artifact drop meshes
  private _artifactMeshes = new Map<number, THREE.Group>();

  // Charged moonbeam orb
  private _chargeOrb: THREE.Mesh | null = null;
  private _chargeOrbLight: THREE.PointLight | null = null;

  // Reusable
  private _tmpColor = new THREE.Color();

  init(w: number, h: number): void {
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = false;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.2;
    this.canvas = this._renderer.domElement;
    this.canvas.style.position = "fixed";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.zIndex = "1";

    this._scene = new THREE.Scene();
    this._fog = new THREE.FogExp2(0x0a0820, GUIN.FOG_DENSITY);
    this._scene.fog = this._fog;
    this._scene.background = new THREE.Color(0x050510);

    this._camera = new THREE.PerspectiveCamera(65, w / h, 0.5, 300);

    // Post-processing
    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(new RenderPass(this._scene, this._camera));
    this._bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.6, 0.4, 0.85);
    this._composer.addPass(this._bloomPass);

    this._buildLights();
    this._buildSky();
    this._buildIslands();
    this._buildDecor();
    this._buildPlayer();
    this._buildParticles();
    this._buildMinimap();
  }

  private _buildLights(): void {
    this._ambientLight = new THREE.AmbientLight(0x334466, 0.4);
    this._scene.add(this._ambientLight);

    this._sunLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    this._sunLight.position.set(30, 50, 20);
    this._scene.add(this._sunLight);

    this._moonLight = new THREE.DirectionalLight(0x8899cc, 0.0);
    this._moonLight.position.set(-20, 40, -30);
    this._scene.add(this._moonLight);

    this._playerGlow = new THREE.PointLight(0xffd700, 0.5, 15);
    this._scene.add(this._playerGlow);

    // Hemisphere light for nice fill
    const hemi = new THREE.HemisphereLight(0x6688aa, 0x221133, 0.3);
    this._scene.add(hemi);
  }

  private _buildSky(): void {
    // Starfield
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(GUIN.STAR_COUNT * 3);
    const starSizes = new Float32Array(GUIN.STAR_COUNT);
    for (let i = 0; i < GUIN.STAR_COUNT; i++) {
      const theta = Math.random() * TAU;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 180;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)); // only upper hemisphere
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      starSizes[i] = Math.random() * 3 + 1;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.8 });
    this._stars = new THREE.Points(starGeo, starMat);
    this._scene.add(this._stars);

    // Sky dome — gradient sphere
    const skyGeo = new THREE.SphereGeometry(190, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x0a0820,
      side: THREE.BackSide,
    });
    this._skyDome = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(this._skyDome);

    // Moon mesh — glowing sphere
    const moonGeo = new THREE.SphereGeometry(3, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xeeeeff });
    this._moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this._moonMesh.position.set(-40, 80, -60);
    this._moonMesh.visible = false;
    this._scene.add(this._moonMesh);

    this._moonPointLight = new THREE.PointLight(0x8899cc, 0.3, 100);
    this._moonPointLight.position.set(-40, 80, -60);
    this._moonPointLight.visible = false;
    this._scene.add(this._moonPointLight);

    // Northern lights — semi-transparent curtains in the sky
    const auroraColors = [0x22ff88, 0x4488ff, 0x8844ff, 0x22ccaa];
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.PlaneGeometry(80, 15, 16, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: auroraColors[i], transparent: true, opacity: 0,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(-40 + i * 25, 110 + i * 3, -50 + i * 15);
      mesh.rotation.x = -0.3;
      mesh.rotation.y = i * 0.4;
      this._scene.add(mesh);
      this._auroraMeshes.push(mesh);
    }
  }

  private _buildIslands(): void {
    // Central island — flat cylinder with grass-like top
    const islandMat = new THREE.MeshStandardMaterial({ color: 0x334422, roughness: 0.9, flatShading: true });
    const islandEdgeMat = new THREE.MeshStandardMaterial({ color: 0x221133, roughness: 0.8, flatShading: true });

    for (let i = 0; i < 5; i++) {
      // Top surface
      const r = i === 0 ? GUIN.ISLAND_RADIUS : GUIN.ISLAND_RADIUS * 0.8;
      const topGeo = new THREE.CylinderGeometry(r, r * 1.1, 2, 32);
      const top = new THREE.Mesh(topGeo, islandMat);

      // Bottom rocky part
      const botGeo = new THREE.CylinderGeometry(r * 1.1, r * 0.6, 8, 16);
      const bot = new THREE.Mesh(botGeo, islandEdgeMat);
      bot.position.y = -5;

      const group = new THREE.Group();
      group.add(top, bot);
      group.visible = i === 0; // only first island visible initially
      this._scene.add(group);
      this._islandMeshes.push(top);

      // Store group reference on the mesh for visibility toggling
      (top as any)._group = group;
    }

    // Bridges (initially hidden)
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, emissive: 0xffd700, emissiveIntensity: 0.3, transparent: true, opacity: 0.7 });
    const center = { x: 0, z: 0 };
    const dist = GUIN.ISLAND_RADIUS * 2 + GUIN.BRIDGE_LENGTH;
    const offsets = [{ x: dist, z: 0 }, { x: -dist, z: 0 }, { x: 0, z: dist }, { x: 0, z: -dist }];
    for (const off of offsets) {
      const len = Math.sqrt((off.x - center.x) ** 2 + (off.z - center.z) ** 2);
      const bridgeGeo = new THREE.BoxGeometry(GUIN.BRIDGE_WIDTH, 0.3, len);
      const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
      bridge.position.set((center.x + off.x) / 2, 0, (center.z + off.z) / 2);
      bridge.rotation.y = Math.atan2(off.x - center.x, off.z - center.z);
      bridge.visible = false;
      this._scene.add(bridge);
      this._bridgeMeshes.push(bridge);
    }
  }

  private _buildDecor(): void {
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff, emissive: 0x4488ff, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.8, metalness: 0.5, roughness: 0.2,
    });
    // Floating crystal formations (larger clusters)
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * TAU;
      const r = GUIN.ISLAND_RADIUS * (0.85 + Math.random() * 0.2);
      const cluster = new THREE.Group();
      // Main crystal
      const main = new THREE.Mesh(new THREE.OctahedronGeometry(0.4 + Math.random() * 0.3, 1), crystalMat.clone());
      cluster.add(main);
      // Smaller satellite crystals
      for (let j = 0; j < 3; j++) {
        const sat = new THREE.Mesh(new THREE.OctahedronGeometry(0.15 + Math.random() * 0.15, 0), crystalMat.clone());
        sat.position.set((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.8);
        sat.rotation.set(Math.random() * TAU, Math.random() * TAU, 0);
        cluster.add(sat);
      }
      cluster.position.set(Math.cos(angle) * r, 2.5 + Math.random() * 5, Math.sin(angle) * r);
      cluster.rotation.set(Math.random(), Math.random(), 0);
      this._scene.add(cluster);
      this._crystalFormations.push(cluster.children[0] as THREE.Mesh);
    }

    // Ambient firefly-like point lights orbiting main island
    for (let i = 0; i < 5; i++) {
      const pivot = new THREE.Object3D();
      pivot.rotation.y = (i / 5) * TAU;
      this._scene.add(pivot);
      this._fireflyPivots.push(pivot);
      const light = new THREE.PointLight(0xaaff88, 0.3, 10);
      light.position.set(GUIN.ISLAND_RADIUS * 0.7, 1.5 + i * 1.2, 0);
      pivot.add(light);
      this._fireflyLights.push(light);
      // Firefly visible mesh
      const ffMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xaaff88, transparent: true, opacity: 0.7 }));
      ffMesh.position.copy(light.position);
      pivot.add(ffMesh);
    }

    // Ground glow ring at island edge
    const glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(GUIN.ISLAND_RADIUS, 0.15, 10, 72),
      new THREE.MeshStandardMaterial({ color: 0x22aa88, emissive: 0x22aa88, emissiveIntensity: 0.5, transparent: true, opacity: 0.3 }),
    );
    glowRing.rotation.x = -Math.PI / 2; glowRing.position.y = 0.1;
    this._scene.add(glowRing);
    this._islandGlowRings.push(glowRing);

    // ── Mushroom clusters on the island ──
    const mushCapMat = new THREE.MeshStandardMaterial({ color: 0x6644aa, emissive: 0x4422aa, emissiveIntensity: 0.3, roughness: 0.6 });
    const mushStemMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.8 });
    for (let mi = 0; mi < 8; mi++) {
      const ma = (mi / 8) * TAU + Math.random() * 0.5;
      const mr = 3 + Math.random() * (GUIN.ISLAND_RADIUS - 6);
      const mh = 0.3 + Math.random() * 0.5;
      // Stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, mh, 10), mushStemMat);
      stem.position.set(Math.cos(ma) * mr, mh / 2 + 1, Math.sin(ma) * mr);
      this._scene.add(stem);
      // Cap
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 12, 8, 0, TAU, 0, Math.PI * 0.5), mushCapMat);
      cap.position.set(Math.cos(ma) * mr, mh + 1, Math.sin(ma) * mr);
      this._scene.add(cap);
      // Glow dots on cap
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4),
        new THREE.MeshBasicMaterial({ color: 0xaaffcc, transparent: true, opacity: 0.6 }));
      dot.position.set(Math.cos(ma) * mr + 0.08, mh + 1.05, Math.sin(ma) * mr);
      this._scene.add(dot);
    }

    // ── Grass tufts on island ──
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x446633, roughness: 0.9, side: THREE.DoubleSide });
    for (let gi = 0; gi < 20; gi++) {
      const ga = Math.random() * TAU;
      const gr = 2 + Math.random() * (GUIN.ISLAND_RADIUS - 4);
      const grass = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.5), grassMat);
      grass.position.set(Math.cos(ga) * gr, 1.25, Math.sin(ga) * gr);
      grass.rotation.y = Math.random() * TAU;
      this._scene.add(grass);
    }

    // ── Stone ruins / pillars on island ──
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x556655, roughness: 0.85, metalness: 0.1 });
    for (let si = 0; si < 4; si++) {
      const sa = (si / 4) * TAU + 0.4;
      const sr = GUIN.ISLAND_RADIUS * 0.6;
      const sh2 = 1.5 + Math.random() * 2;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, sh2, 10), stoneMat);
      pillar.position.set(Math.cos(sa) * sr, sh2 / 2 + 1, Math.sin(sa) * sr);
      this._scene.add(pillar);
      // Broken top
      const broken = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 6), stoneMat);
      broken.position.set(Math.cos(sa) * sr, sh2 + 1.15, Math.sin(sa) * sr);
      broken.rotation.z = Math.random() * 0.3;
      this._scene.add(broken);
      // Vine on pillar
      const vine = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0x337733, roughness: 0.8 }));
      vine.position.set(Math.cos(sa) * sr, 1.5 + Math.random(), Math.sin(sa) * sr);
      vine.rotation.x = Math.PI / 2;
      this._scene.add(vine);
    }
  }

  private _buildPlayer(): void {
    this._playerGroup = new THREE.Group();

    const dressMat = new THREE.MeshStandardMaterial({ color: 0x4444cc, roughness: 0.4, metalness: 0.2 });
    const dressAccent = new THREE.MeshStandardMaterial({ color: 0x3333aa, roughness: 0.35, metalness: 0.25 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.2 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0xddaa44, roughness: 0.7 });

    // ── Dress (layered skirt) ──
    const skirtOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.85, 2.0, 16), dressMat);
    skirtOuter.position.y = 1.0; this._playerGroup.add(skirtOuter);
    this._playerBody = skirtOuter;
    // Dress overlay layer
    const skirtInner = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.75, 1.8, 14), dressAccent);
    skirtInner.position.y = 1.1; this._playerGroup.add(skirtInner);
    // Dress hem trim (gold)
    const hem = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.04, 8, 24), goldMat);
    hem.rotation.x = Math.PI / 2; hem.position.y = 0.02;
    this._playerGroup.add(hem);
    // Waist sash
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.12, 16), goldMat);
    sash.position.y = 1.85; this._playerGroup.add(sash);
    // Bodice
    const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.5, 14), dressAccent);
    bodice.position.y = 2.1; this._playerGroup.add(bodice);
    // Neckline trim
    const neckTrim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 8, 16), goldMat);
    neckTrim.rotation.x = Math.PI / 2; neckTrim.position.y = 2.35;
    this._playerGroup.add(neckTrim);

    // ── Arms ──
    for (const sx of [-1, 1]) {
      // Shoulder puff
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), dressMat);
      puff.position.set(sx * 0.38, 2.25, 0); this._playerGroup.add(puff);
      // Upper arm (sleeve)
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.35, 12), dressMat);
      sleeve.position.set(sx * 0.4, 2.0, 0); this._playerGroup.add(sleeve);
      // Forearm (skin)
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 12), skinMat);
      forearm.position.set(sx * 0.42, 1.75, 0); this._playerGroup.add(forearm);
      // Hand
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), skinMat);
      hand.position.set(sx * 0.42, 1.58, 0); this._playerGroup.add(hand);
      // Bracelet
      const bracelet = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 8, 12), goldMat);
      bracelet.rotation.x = Math.PI / 2;
      bracelet.position.set(sx * 0.42, 1.65, 0); this._playerGroup.add(bracelet);
    }

    // ── Head ──
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 16), skinMat);
    head.position.y = 2.6; this._playerGroup.add(head);
    // Eyes
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: 0x2244aa }));
      eye.position.set(sx * 0.12, 2.64, -0.3); this._playerGroup.add(eye);
    }
    // Lips
    const lips = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.04), new THREE.MeshStandardMaterial({ color: 0xcc6666, roughness: 0.5 }));
    lips.position.set(0, 2.52, -0.32); this._playerGroup.add(lips);
    // Hair (flowing golden)
    const hairBack = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 10, 16), hairMat);
    hairBack.position.set(0, 2.4, 0.15); this._playerGroup.add(hairBack);
    const hairSide1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.5, 8, 12), hairMat);
    hairSide1.position.set(-0.25, 2.5, 0.05); this._playerGroup.add(hairSide1);
    const hairSide2 = hairSide1.clone(); hairSide2.position.x = 0.25;
    this._playerGroup.add(hairSide2);
    // Hair flowing down back
    const hairFlow = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.05, 1.2, 10), hairMat);
    hairFlow.position.set(0, 1.8, 0.2); this._playerGroup.add(hairFlow);

    // ── Crown (ornate) ──
    this._playerCrown = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 12, 20), goldMat);
    this._playerCrown.position.y = 2.95; this._playerCrown.rotation.x = Math.PI / 2;
    this._playerGroup.add(this._playerCrown);
    // Crown points
    for (let cp = 0; cp < 5; cp++) {
      const a = (cp / 5) * TAU;
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 6), goldMat);
      point.position.set(Math.cos(a) * 0.3, 3.05, Math.sin(a) * 0.3);
      this._playerGroup.add(point);
      // Jewel on each point
      const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6),
        new THREE.MeshStandardMaterial({ color: cp % 2 === 0 ? 0x4488ff : 0xff4488, emissive: cp % 2 === 0 ? 0x4488ff : 0xff4488, emissiveIntensity: 1.0 }));
      jewel.position.set(Math.cos(a) * 0.3, 3.15, Math.sin(a) * 0.3);
      this._playerGroup.add(jewel);
    }

    // ── Staff (detailed) ──
    const staffShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.5, 14), new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.5 }));
    staffShaft.position.set(0.65, 1.5, 0); this._playerGroup.add(staffShaft);
    this._playerStaff = staffShaft;
    // Staff vine wrap
    const vine = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 12), new THREE.MeshStandardMaterial({ color: 0x44aa44, roughness: 0.7 }));
    vine.position.set(0.65, 1.8, 0); this._playerGroup.add(vine);
    const vine2 = vine.clone(); vine2.position.y = 2.2; this._playerGroup.add(vine2);
    // Staff cradle (ornate top)
    const cradle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 8, 12), goldMat);
    cradle.position.set(0.65, 2.75, 0); cradle.rotation.x = Math.PI / 2;
    this._playerGroup.add(cradle);
    // Staff orb
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x88ccff, emissiveIntensity: 0.8, transparent: true, opacity: 0.9 }));
    orb.position.set(0.65, 2.85, 0); this._playerGroup.add(orb);
    // Orb inner glow
    const orbInner = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xccddff, transparent: true, opacity: 0.6 }));
    orbInner.position.set(0.65, 2.85, 0); this._playerGroup.add(orbInner);

    // ── Cape (higher poly, flowing) ──
    this._playerCape = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 2.0, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0x2222aa, side: THREE.DoubleSide, roughness: 0.55 }),
    );
    this._playerCape.position.set(0, 1.3, 0.45); this._playerCape.rotation.x = -0.12;
    this._playerGroup.add(this._playerCape);
    // Cape gold trim
    const capeTrim = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.02), goldMat);
    capeTrim.position.set(0, 2.3, 0.38); this._playerGroup.add(capeTrim);

    // Player glow light
    const playerLight = new THREE.PointLight(0x6688ff, 0.3, 6);
    playerLight.position.y = 2; this._playerGroup.add(playerLight);

    this._scene.add(this._playerGroup);
  }

  private _buildParticles(): void {
    const geo = new THREE.SphereGeometry(0.15, 12, 10);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    this._particleInstancedMesh = new THREE.InstancedMesh(geo, mat, this._maxParticles);
    this._particleInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._particleInstancedMesh.count = 0;
    this._scene.add(this._particleInstancedMesh);
  }

  // ---- Update ----
  update(state: GuinevereState, dt: number): void {
    this._updateCamera(state, dt);
    this._updateLighting(state);
    this._updatePlayer(state, dt);
    this._updateIslands(state);
    this._updatePlants(state);
    this._updateEnemies(state);
    this._updateThornWalls(state);
    this._updateProjectiles(state);
    this._updateParticles(state);
    this._updateEffects(state, dt);
    this._updateDamageNumbers(state, dt);
    this._updateMinimap(state);

    // Update environmental decor
    this._updateDecor(state, dt);
    this._updateWeather(state, dt);
    this._updateAurora(state);
    this._updateTelegraphs(state, dt);
    this._updateArtifactDrops(state, dt);
    this._updateChargeOrb(state);

    // Screen shake
    if (state.screenShake > 0.01) {
      this._camera.position.x += (Math.random() - 0.5) * state.screenShake * 0.5;
      this._camera.position.y += (Math.random() - 0.5) * state.screenShake * 0.3;
    }

    this._composer.render();
  }

  private _updateCamera(state: GuinevereState, dt: number): void {
    const p = state.player;
    let dist = GUIN.CAMERA_DISTANCE;
    let height = GUIN.CAMERA_HEIGHT;
    let lookY = p.pos.y + 1.5;

    // Death camera: zoom in, tilt down, slight rotation
    if (state.deathSequenceTimer > 0) {
      const deathProgress = Math.min(1, state.deathSequenceTimer / 3); // normalized 0-1 over 3 seconds
      dist = GUIN.CAMERA_DISTANCE * (1 - deathProgress * 0.6); // zoom in to 40% closer
      height = GUIN.CAMERA_HEIGHT * (1 - deathProgress * 0.3); // lower
      lookY = p.pos.y + 1.5 - deathProgress * 0.8; // tilt down
    }

    const targetX = p.pos.x - Math.sin(p.yaw) * dist;
    const targetZ = p.pos.z - Math.cos(p.yaw) * dist;
    const targetY = p.pos.y + height;

    const lerp = GUIN.CAMERA_LERP * dt;
    this._camera.position.x += (targetX - this._camera.position.x) * lerp;
    this._camera.position.y += (targetY - this._camera.position.y) * lerp;
    this._camera.position.z += (targetZ - this._camera.position.z) * lerp;

    // Dramatic rotation during death
    if (state.deathSequenceTimer > 0) {
      const rotOffset = Math.sin(state.gameTime * 0.8) * 0.03 * Math.min(1, state.deathSequenceTimer / 3);
      this._camera.position.x += Math.cos(p.yaw) * rotOffset * dist;
      this._camera.position.z -= Math.sin(p.yaw) * rotOffset * dist;
    }

    this._camera.lookAt(p.pos.x, lookY, p.pos.z);
  }

  private _updateLighting(state: GuinevereState): void {
    const blend = state.dayNightBlend;

    // Sun fades out, moon fades in
    this._sunLight.intensity = 0.8 * (1 - blend);
    this._moonLight.intensity = 0.6 * blend;

    // Ambient shifts from warm to cool
    this._ambientLight.color.setHex(blend > 0.5 ? 0x223344 : 0x445566);
    this._ambientLight.intensity = 0.3 + (1 - blend) * 0.2;

    // Fog color shifts
    const dayFog = new THREE.Color(0x1a1830);
    const nightFog = new THREE.Color(0x050510);
    this._fog.color.copy(dayFog).lerp(nightFog, blend);
    (this._scene.background as THREE.Color).copy(this._fog.color);

    // Stars visibility + twinkle
    if (this._stars) {
      (this._stars.material as THREE.PointsMaterial).opacity = blend * 0.9;
      // Star twinkle — vary individual star sizes with sine wave
      const sizeAttr = this._stars.geometry.getAttribute("size") as THREE.BufferAttribute;
      if (sizeAttr) {
        for (let i = 0; i < sizeAttr.count; i++) {
          const base = 1.5;
          const twinkle = Math.sin(state.gameTime * (2 + (i % 7) * 0.5) + i * 1.37) * 0.5 + 0.5;
          sizeAttr.setX(i, base + twinkle * 1.5);
        }
        sizeAttr.needsUpdate = true;
      }
    }

    // Moon visibility — proportional to dayNightBlend
    if (this._moonMesh) {
      this._moonMesh.visible = blend > 0.05;
      (this._moonMesh.material as THREE.MeshBasicMaterial).opacity = blend;
    }
    if (this._moonPointLight) {
      this._moonPointLight.visible = blend > 0.05;
      this._moonPointLight.intensity = 0.3 * blend;
    }

    // Bloom intensity changes with night
    this._bloomPass.strength = 0.4 + blend * 0.5;

    // Player glow
    this._playerGlow.position.set(state.player.pos.x, state.player.pos.y + 2, state.player.pos.z);
    this._playerGlow.intensity = 0.3 + blend * 0.4;
  }

  private _updatePlayer(state: GuinevereState, _dt: number): void {
    const p = state.player;
    this._playerGroup.position.set(p.pos.x, p.pos.y - 1, p.pos.z);
    this._playerGroup.rotation.y = p.yaw;

    // Hit flash
    if (p.hitFlash > 0) {
      (this._playerBody.material as THREE.MeshStandardMaterial).emissive.setHex(0xff2222);
      (this._playerBody.material as THREE.MeshStandardMaterial).emissiveIntensity = p.hitFlash * 3;
    } else {
      (this._playerBody.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
      (this._playerBody.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
    }

    // Cape sway
    this._playerCape.rotation.x = -0.15 + Math.sin(state.gameTime * 3) * 0.1;

    // Aurora shield visual
    if (p.auroraShieldHp > 0) {
      if (!this._auroraShield) {
        const shieldGeo = new THREE.SphereGeometry(2, 16, 12);
        const shieldMat = new THREE.MeshBasicMaterial({
          color: 0x88ccff, transparent: true, opacity: 0.2, side: THREE.DoubleSide,
        });
        this._auroraShield = new THREE.Mesh(shieldGeo, shieldMat);
        this._scene.add(this._auroraShield);
      }
      this._auroraShield.visible = true;
      this._auroraShield.position.set(p.pos.x, p.pos.y + 1, p.pos.z);
      this._auroraShield.scale.setScalar(1 + Math.sin(state.gameTime * 4) * 0.05);
      (this._auroraShield.material as THREE.MeshBasicMaterial).opacity = 0.15 + (p.auroraShieldHp / 80) * 0.15;
    } else if (this._auroraShield) {
      this._auroraShield.visible = false;
    }
  }

  private _updateIslands(state: GuinevereState): void {
    for (let i = 0; i < state.islands.length; i++) {
      const island = state.islands[i];
      const mesh = this._islandMeshes[i];
      if (!mesh) continue;
      const group = (mesh as any)._group as THREE.Group;
      group.visible = island.unlocked;
      group.position.set(island.pos.x, -1, island.pos.z);

      // Bridge visibility
      if (i > 0 && i - 1 < this._bridgeMeshes.length) {
        this._bridgeMeshes[i - 1].visible = island.unlocked;
      }
    }
  }

  private _updatePlants(state: GuinevereState): void {
    // Remove old meshes
    for (const [id, group] of this._plantMeshes) {
      if (!state.plants.has(id)) {
        this._scene.remove(group);
        this._plantMeshes.delete(id);
      }
    }

    // Update/create plant meshes
    for (const [id, plant] of state.plants) {
      let group = this._plantMeshes.get(id);
      if (!group) {
        group = this._createPlantMesh(plant);
        this._plantMeshes.set(id, group);
        this._scene.add(group);
      }
      this._updatePlantMesh(group, plant);
    }
  }

  private _createPlantMesh(plant: GardenPlant): THREE.Group {
    const group = new THREE.Group();
    const colors = PLANT_COLORS[plant.type];

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.08, 0.12, 1, 12);
    const stemMat = new THREE.MeshStandardMaterial({ color: colors.stem, roughness: 0.7 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.5;
    stem.name = "stem";
    group.add(stem);

    // Bloom head (grows with stage)
    const bloomGeo = new THREE.DodecahedronGeometry(0.3, 1);
    const bloomMat = new THREE.MeshStandardMaterial({
      color: colors.bloom, emissive: colors.glow, emissiveIntensity: 0,
      roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.9,
    });
    const bloom = new THREE.Mesh(bloomGeo, bloomMat);
    bloom.position.y = 1;
    bloom.name = "bloom";
    group.add(bloom);

    // Leaves (2-3)
    const leafGeo = new THREE.PlaneGeometry(0.4, 0.2);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x44aa44, side: THREE.DoubleSide, roughness: 0.7 });
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.y = 0.3 + i * 0.25;
      leaf.rotation.y = (i / 3) * TAU;
      leaf.rotation.z = 0.5;
      group.add(leaf);
    }

    return group;
  }

  private _updatePlantMesh(group: THREE.Group, plant: GardenPlant): void {
    const scale = 0.3 + plant.growthStage * 0.5;
    group.position.set(plant.pos.x, plant.pos.y, plant.pos.z);
    group.scale.setScalar(scale);

    // Bob animation
    group.position.y += Math.sin(plant.bobPhase) * 0.05;

    // Bloom glow
    const bloom = group.getObjectByName("bloom") as THREE.Mesh | undefined;
    if (bloom) {
      const mat = bloom.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = plant.glowIntensity;
      if (plant.withering) {
        mat.color.setHex(0x664444);
        mat.emissive.setHex(0x442222);
      } else {
        const colors = PLANT_COLORS[plant.type];
        mat.color.setHex(colors.bloom);
        mat.emissive.setHex(colors.glow);
      }

      // Awakened sentinel: aggressive golden pulse
      if (plant.awakened) {
        mat.emissive.setHex(0xffd700);
        mat.emissiveIntensity = 1.0 + Math.sin(plant.bobPhase * 3) * 0.5;
        bloom.scale.setScalar(1 + Math.sin(plant.bobPhase * 3) * 0.2);
      } else if (plant.harvestReady) {
        // Harvest-ready pulse
        bloom.scale.setScalar(1 + Math.sin(plant.bobPhase * 2) * 0.15);
      } else {
        bloom.scale.setScalar(1);
      }
    }

    // Sentinel stem golden tint + turret marker
    const stem = group.getObjectByName("stem") as THREE.Mesh | undefined;
    if (stem) {
      const stemMat = stem.material as THREE.MeshStandardMaterial;
      if (plant.awakened) {
        stemMat.emissive.setHex(0xffd700);
        stemMat.emissiveIntensity = 0.3;
        // Add turret marker if not present
        if (!group.getObjectByName("turretMarker")) {
          const markerGeo = new THREE.ConeGeometry(0.15, 0.3, 10);
          const markerMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
          const marker = new THREE.Mesh(markerGeo, markerMat);
          marker.name = "turretMarker";
          marker.position.y = 1.6;
          marker.rotation.x = Math.PI; // point downward like a targeting marker
          group.add(marker);
        }
      } else {
        stemMat.emissive.setHex(0x000000);
        stemMat.emissiveIntensity = 0;
        // Remove turret marker if present
        const marker = group.getObjectByName("turretMarker");
        if (marker) {
          group.remove(marker);
          (marker as THREE.Mesh).geometry.dispose();
          ((marker as THREE.Mesh).material as THREE.Material).dispose();
        }
      }
    }
  }

  private _updateEnemies(state: GuinevereState): void {
    // Remove old enemy meshes and HP bars
    for (const [id, group] of this._enemyMeshes) {
      if (!state.enemies.find(e => e.id === id)) {
        this._scene.remove(group);
        this._enemyMeshes.delete(id);
      }
    }
    // Remove HP bars for dead/removed enemies
    for (const [id, hpGroup] of this._hpBarMeshes) {
      const enemy = state.enemies.find(e => e.id === id);
      if (!enemy || enemy.behavior === "dead") {
        this._scene.remove(hpGroup);
        this._hpBarMeshes.delete(id);
      }
    }

    for (const enemy of state.enemies) {
      let group = this._enemyMeshes.get(enemy.id);
      if (!group) {
        group = this._createEnemyMesh(enemy);
        this._enemyMeshes.set(enemy.id, group);
        this._scene.add(group);
      }

      group.position.set(enemy.pos.x, enemy.pos.y, enemy.pos.z);
      group.rotation.y = enemy.yaw;

      // Death fade
      if (enemy.behavior === "dead") {
        group.scale.setScalar(Math.max(0.01, enemy.deathTimer / 0.8));
        group.position.y += (0.8 - enemy.deathTimer) * 3;
      } else {
        const base = enemy.type === "wither_lord" ? 2 : enemy.type === "stag" ? 1.3 : 1;
        group.scale.setScalar(base * (enemy.spawnTimer > 0 ? 1 - enemy.spawnTimer / 0.5 : 1));
        // Bob for flying enemies
        if (enemy.flying) group.position.y += Math.sin(enemy.bobPhase) * 0.3;
      }

      // Hit flash
      const body = group.children[0] as THREE.Mesh;
      if (body) {
        const mat = body.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = enemy.hitFlash > 0 ? 2 : 0;
      }

      // Root visual
      if (enemy.rootTimer > 0) {
        group.position.y -= 0.3;
      }

      // Elite aura pulsing
      if (enemy.elite && enemy.behavior !== "dead") {
        const aura = group.getObjectByName("eliteAura") as THREE.Mesh | undefined;
        if (aura) {
          const pulse = 1.0 + Math.sin(enemy.bobPhase) * 0.25;
          aura.scale.set(pulse, pulse, 1);
          (aura.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(enemy.bobPhase) * 0.2;
        }
      }

      // Stag charge trail
      if (enemy.type === "stag" && enemy.behavior === "charging") {
        let trail = this._stagTrails.get(enemy.id);
        if (!trail) {
          trail = [];
          this._stagTrails.set(enemy.id, trail);
        }
        // Spawn a dust puff behind the stag
        const dustGeo = new THREE.SphereGeometry(0.3, 12, 10);
        const dustMat = new THREE.MeshBasicMaterial({ color: 0x886644, transparent: true, opacity: 0.5 });
        const dust = new THREE.Mesh(dustGeo, dustMat);
        dust.position.set(
          enemy.pos.x - Math.sin(enemy.yaw) * 1.2 + (Math.random() - 0.5) * 0.5,
          0.2,
          enemy.pos.z - Math.cos(enemy.yaw) * 1.2 + (Math.random() - 0.5) * 0.5,
        );
        this._scene.add(dust);
        trail.push(dust);
        // Limit trail length and fade old particles
        while (trail.length > 12) {
          const old = trail.shift()!;
          this._scene.remove(old);
          old.geometry.dispose();
          (old.material as THREE.Material).dispose();
        }
        for (const t of trail) {
          const m = t.material as THREE.MeshBasicMaterial;
          m.opacity -= 0.03;
          t.scale.multiplyScalar(0.95);
        }
      } else {
        // Clean up stale trails
        const trail = this._stagTrails.get(enemy.id);
        if (trail) {
          for (const t of trail) {
            const m = t.material as THREE.MeshBasicMaterial;
            m.opacity -= 0.05;
            if (m.opacity <= 0) {
              this._scene.remove(t);
              t.geometry.dispose();
              m.dispose();
            }
          }
          const filtered = trail.filter(t => (t.material as THREE.MeshBasicMaterial).opacity > 0);
          if (filtered.length === 0) this._stagTrails.delete(enemy.id);
          else this._stagTrails.set(enemy.id, filtered);
        }
      }

      // HP bar — create/update for non-dead enemies
      if (enemy.behavior !== "dead") {
        let hpGroup = this._hpBarMeshes.get(enemy.id);
        if (!hpGroup) {
          hpGroup = new THREE.Group();
          // Background bar (dark)
          const bgGeo = new THREE.BoxGeometry(1.2, 0.12, 0.02);
          const bgMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.7 });
          const bg = new THREE.Mesh(bgGeo, bgMat);
          bg.name = "hpBg";
          hpGroup.add(bg);
          // Foreground bar (colored by enemy type)
          const fgColors: Record<string, number> = { wisp: 0x88ddff, crawler: 0x553388, stag: 0x886644, moth: 0x88aa44, shambler: 0x44aa66, wither_lord: 0xff0044 };
          const fgGeo = new THREE.BoxGeometry(1.2, 0.12, 0.03);
          const fgMat = new THREE.MeshBasicMaterial({ color: fgColors[enemy.type] ?? 0xff4444, transparent: true, opacity: 0.9 });
          const fg = new THREE.Mesh(fgGeo, fgMat);
          fg.name = "hpFg";
          fg.position.z = 0.01;
          hpGroup.add(fg);
          this._hpBarMeshes.set(enemy.id, hpGroup);
          this._scene.add(hpGroup);
        }
        // Position above enemy
        const barHeight = enemy.type === "wither_lord" ? 5 : enemy.type === "stag" ? 3.5 : 2.5;
        hpGroup.position.set(enemy.pos.x, enemy.pos.y + barHeight, enemy.pos.z);
        // Billboard to face camera
        hpGroup.quaternion.copy(this._camera.quaternion);
        // Scale foreground by HP ratio
        const fg = hpGroup.getObjectByName("hpFg") as THREE.Mesh;
        if (fg) {
          const ratio = Math.max(0, enemy.hp / enemy.maxHp);
          fg.scale.x = ratio;
          fg.position.x = -(1 - ratio) * 0.6;
        }
      }
    }
  }

  private _createEnemyMesh(enemy: GuinevereEnemy): THREE.Group {
    const group = new THREE.Group();

    switch (enemy.type) {
      case "wisp": {
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0x88ddff, emissive: 0x44aaff, emissiveIntensity: 0.8, transparent: true, opacity: 0.8 })
        );
        core.position.y = 1;
        group.add(core);
        // Trail wisps
        for (let i = 0; i < 3; i++) {
          const trail = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 12, 10),
            new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.5 })
          );
          trail.position.set(Math.sin(i * TAU / 3) * 0.5, 0.8, Math.cos(i * TAU / 3) * 0.5);
          group.add(trail);
        }
        break;
      }
      case "crawler": {
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(1, 0.6, 1.4),
          new THREE.MeshStandardMaterial({ color: 0x553388, roughness: 0.6, emissive: 0x221144, emissiveIntensity: 0 })
        );
        body.position.y = 0.4;
        group.add(body);
        // Eyes
        for (const sx of [-0.3, 0.3]) {
          const eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 12, 10),
            new THREE.MeshBasicMaterial({ color: 0xff44ff })
          );
          eye.position.set(sx, 0.6, 0.6);
          group.add(eye);
        }
        // Legs
        for (let i = 0; i < 4; i++) {
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.5, 10),
            new THREE.MeshStandardMaterial({ color: 0x442266 })
          );
          leg.position.set(i < 2 ? -0.5 : 0.5, 0.1, i % 2 === 0 ? 0.3 : -0.3);
          leg.rotation.z = i < 2 ? 0.3 : -0.3;
          group.add(leg);
        }
        break;
      }
      case "stag": {
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1.2, 2),
          new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.7, emissive: 0x221111, emissiveIntensity: 0 })
        );
        body.position.y = 1;
        group.add(body);
        // Antlers
        for (const sx of [-0.4, 0.4]) {
          const antler = new THREE.Mesh(
            new THREE.ConeGeometry(0.1, 1.2, 10),
            new THREE.MeshStandardMaterial({ color: 0x554433, metalness: 0.3 })
          );
          antler.position.set(sx, 2, 0.3);
          antler.rotation.z = sx > 0 ? -0.3 : 0.3;
          group.add(antler);
        }
        // Legs
        for (let i = 0; i < 4; i++) {
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 1, 10),
            new THREE.MeshStandardMaterial({ color: 0x332211 })
          );
          leg.position.set(i < 2 ? -0.35 : 0.35, 0.15, i % 2 === 0 ? 0.6 : -0.6);
          group.add(leg);
        }
        break;
      }
      case "moth": {
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.25, 0.8, 4, 6),
          new THREE.MeshStandardMaterial({ color: 0x88aa44, roughness: 0.5, emissive: 0x446622, emissiveIntensity: 0 })
        );
        body.position.y = GUIN.MOTH_FLY_HEIGHT;
        group.add(body);
        // Wings
        for (const sx of [-1, 1]) {
          const wing = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 1),
            new THREE.MeshStandardMaterial({
              color: 0xaaff44, emissive: 0x66aa22, emissiveIntensity: 0.3,
              side: THREE.DoubleSide, transparent: true, opacity: 0.7,
            })
          );
          wing.position.set(sx * 0.8, GUIN.MOTH_FLY_HEIGHT, 0);
          wing.rotation.z = sx * 0.3;
          group.add(wing);
        }
        break;
      }
      case "shambler": {
        // Bulky mushroom body
        const shBody = new THREE.Mesh(
          new THREE.SphereGeometry(0.7, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0x556633, roughness: 0.8, emissive: 0x224411, emissiveIntensity: 0 })
        );
        shBody.position.y = 0.7;
        group.add(shBody);
        // Mushroom cap
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0x338866, emissive: 0x22aa66, emissiveIntensity: 0.3, roughness: 0.5 })
        );
        cap.position.y = 1.4;
        cap.scale.set(1.3, 0.6, 1.3);
        group.add(cap);
        // Spore dots
        for (let sp = 0; sp < 5; sp++) {
          const spore = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 12, 10),
            new THREE.MeshBasicMaterial({ color: 0xaaff88 })
          );
          const a = (sp / 5) * TAU;
          spore.position.set(Math.cos(a) * 0.5, 0.6 + Math.random() * 0.6, Math.sin(a) * 0.5);
          group.add(spore);
        }
        // Stubby legs
        for (let l = 0; l < 3; l++) {
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 0.4, 10),
            new THREE.MeshStandardMaterial({ color: 0x443322 })
          );
          const a = (l / 3) * TAU;
          leg.position.set(Math.cos(a) * 0.4, 0.1, Math.sin(a) * 0.4);
          group.add(leg);
        }
        break;
      }
      case "wither_lord": {
        // Large dark figure
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.8, 1.2, 3, 8),
          new THREE.MeshStandardMaterial({ color: 0x220033, roughness: 0.3, emissive: 0x220033, emissiveIntensity: 0 })
        );
        body.position.y = 1.5;
        group.add(body);
        // Head
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.6, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0x110022, emissive: 0x440066, emissiveIntensity: 0.5 })
        );
        head.position.y = 3.3;
        group.add(head);
        // Eyes
        for (const sx of [-0.2, 0.2]) {
          const eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 12, 10),
            new THREE.MeshBasicMaterial({ color: 0xff0044 })
          );
          eye.position.set(sx, 3.5, 0.4);
          group.add(eye);
        }
        // Crown of thorns
        const crownGeo = new THREE.TorusGeometry(0.5, 0.08, 10, 8);
        const crown = new THREE.Mesh(crownGeo, new THREE.MeshStandardMaterial({ color: 0x442200, metalness: 0.6 }));
        crown.position.y = 3.8;
        crown.rotation.x = Math.PI / 2;
        group.add(crown);
        // Arms / tendrils
        for (const sx of [-1, 1]) {
          const arm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.08, 2, 10),
            new THREE.MeshStandardMaterial({ color: 0x220033 })
          );
          arm.position.set(sx * 1.2, 2, 0);
          arm.rotation.z = sx * 0.5;
          group.add(arm);
        }
        break;
      }
    }

    // Elite enemy: make body emissive and add aura ring
    if (enemy.elite) {
      const body = group.children[0] as THREE.Mesh;
      if (body) {
        const mat = body.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0xff4400);
        mat.emissiveIntensity = 0.3;
      }
      const auraGeo = new THREE.TorusGeometry(1.2, 0.08, 8, 32);
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0xff6622, transparent: true, opacity: 0.6,
      });
      const aura = new THREE.Mesh(auraGeo, auraMat);
      aura.rotation.x = -Math.PI / 2;
      aura.position.y = 0.05;
      aura.name = "eliteAura";
      group.add(aura);
    }

    return group;
  }

  private _updateThornWalls(state: GuinevereState): void {
    for (const [id, group] of this._thornMeshes) {
      if (!state.thornWalls.find(w => w.id === id)) {
        this._scene.remove(group);
        this._thornMeshes.delete(id);
      }
    }

    for (const wall of state.thornWalls) {
      let group = this._thornMeshes.get(wall.id);
      if (!group) {
        group = new THREE.Group();
        // Series of thorn pillars
        const thornMat = new THREE.MeshStandardMaterial({ color: 0x338833, roughness: 0.6 });
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x225522, roughness: 0.5 });
        const count = 6;
        for (let i = 0; i < count; i++) {
          const offset = (i - count / 2) * (GUIN.THORN_WALL_LENGTH / count);
          const height = 2 + Math.random() * 1.5;
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, height, 10), thornMat);
          pillar.position.set(Math.sin(wall.yaw + Math.PI / 2) * offset, height / 2, Math.cos(wall.yaw + Math.PI / 2) * offset);
          group.add(pillar);
          // Spikes
          for (let j = 0; j < 3; j++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 10), spikeMat);
            spike.position.copy(pillar.position);
            spike.position.y = 0.5 + j * 0.6;
            spike.position.x += (Math.random() - 0.5) * 0.4;
            spike.rotation.z = (Math.random() - 0.5) * 1.5;
            group.add(spike);
          }
        }
        this._thornMeshes.set(wall.id, group);
        this._scene.add(group);
      }
      group.position.set(wall.pos.x, wall.pos.y, wall.pos.z);
      // Fade out near end of life
      const fade = Math.min(1, wall.life / 2);
      group.scale.setScalar(fade);
    }
  }

  private _updateProjectiles(state: GuinevereState): void {
    for (const [id, mesh] of this._projectileMeshes) {
      if (!state.projectiles.find(p => p.id === id)) {
        this._scene.remove(mesh);
        this._projectileMeshes.delete(id);
      }
    }

    for (const proj of state.projectiles) {
      let mesh = this._projectileMeshes.get(proj.id);
      if (!mesh) {
        const color = proj.fromEnemy ? 0xaaff44 : 0x88ccff;
        const geo = new THREE.SphereGeometry(0.3, 12, 10);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
        mesh = new THREE.Mesh(geo, mat);
        this._projectileMeshes.set(proj.id, mesh);
        this._scene.add(mesh);
      }
      mesh.position.set(proj.pos.x, proj.pos.y + 1, proj.pos.z);
    }
  }

  private _updateParticles(state: GuinevereState): void {
    const count = Math.min(state.particles.length, this._maxParticles);
    this._particleInstancedMesh.count = count;

    for (let i = 0; i < count; i++) {
      const p = state.particles[i];
      this._particleDummy.position.set(p.pos.x, p.pos.y, p.pos.z);
      const lifeRatio = p.life / p.maxLife;
      this._particleDummy.scale.setScalar(p.size * lifeRatio);
      this._particleDummy.updateMatrix();
      this._particleInstancedMesh.setMatrixAt(i, this._particleDummy.matrix);
      this._tmpColor.setHex(p.color);
      this._particleInstancedMesh.setColorAt(i, this._tmpColor);
    }

    this._particleInstancedMesh.instanceMatrix.needsUpdate = true;
    if (this._particleInstancedMesh.instanceColor) {
      this._particleInstancedMesh.instanceColor.needsUpdate = true;
    }
  }

  private _updateEffects(state: GuinevereState, dt: number): void {
    // Blossom burst ring
    if (state.pendingBlossomBurst) {
      if (this._blossomRing) this._scene.remove(this._blossomRing);
      const geo = new THREE.RingGeometry(0.5, GUIN.BLOSSOM_BURST_RADIUS, 32);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff88cc, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
      this._blossomRing = new THREE.Mesh(geo, mat);
      this._blossomRing.position.set(state.pendingBlossomBurst.x, 0.2, state.pendingBlossomBurst.z);
      this._blossomRing.rotation.x = -Math.PI / 2;
      this._scene.add(this._blossomRing);
      state.pendingBlossomBurst = null;
    }
    if (this._blossomRing) {
      const mat = this._blossomRing.material as THREE.MeshBasicMaterial;
      mat.opacity -= dt * 0.5;
      if (mat.opacity <= 0) {
        this._scene.remove(this._blossomRing);
        this._blossomRing = null;
      }
    }

    // Root bind ring
    if (state.pendingRootBind) {
      if (this._rootBindRing) this._scene.remove(this._rootBindRing);
      const geo = new THREE.RingGeometry(0.3, GUIN.ROOT_BIND_RADIUS, 24);
      const mat = new THREE.MeshBasicMaterial({ color: 0x44aa44, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
      this._rootBindRing = new THREE.Mesh(geo, mat);
      this._rootBindRing.position.set(state.pendingRootBind.x, 0.15, state.pendingRootBind.z);
      this._rootBindRing.rotation.x = -Math.PI / 2;
      this._scene.add(this._rootBindRing);
      state.pendingRootBind = null;
    }
    if (this._rootBindRing) {
      const mat = this._rootBindRing.material as THREE.MeshBasicMaterial;
      mat.opacity -= dt * 0.3;
      if (mat.opacity <= 0) {
        this._scene.remove(this._rootBindRing);
        this._rootBindRing = null;
      }
    }

    // Moonbeam visual beam
    if (state.pendingMoonbeam) {
      if (this._moonbeamLine) this._scene.remove(this._moonbeamLine);
      const mb = state.pendingMoonbeam;
      const startPos = new THREE.Vector3(state.player.pos.x, state.player.pos.y + 1.5, state.player.pos.z);
      const endPos = new THREE.Vector3(
        state.player.pos.x + mb.dx * mb.range,
        state.player.pos.y + 1.5,
        state.player.pos.z + mb.dz * mb.range,
      );
      const lineGeo = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.8 });
      this._moonbeamLine = new THREE.Line(lineGeo, lineMat);
      this._scene.add(this._moonbeamLine);
      this._moonbeamTimer = 0.3;
      state.pendingMoonbeam = null;
    }
    if (this._moonbeamLine) {
      this._moonbeamTimer -= dt;
      const mat = this._moonbeamLine.material as THREE.LineBasicMaterial;
      mat.opacity = Math.max(0, (this._moonbeamTimer / 0.3) * 0.8);
      if (this._moonbeamTimer <= 0) {
        this._scene.remove(this._moonbeamLine);
        this._moonbeamLine = null;
      }
    }

    // Synergy zone rings
    const activeSynergyKeys = new Set<string>();
    if (state.activeSynergies) {
      for (const syn of state.activeSynergies) {
        const key = `${syn.type}_${syn.pos.x.toFixed(1)}_${syn.pos.z.toFixed(1)}`;
        activeSynergyKeys.add(key);
        let ring = this._synergyRings.get(key);
        if (!ring) {
          const ringGeo = new THREE.RingGeometry(syn.radius * 0.9, syn.radius, 32);
          const synergyColors: Record<string, number> = {
            crystal_rose: 0xff88cc, starbloom: 0xffd700, moonvine: 0x88ccff,
            aurora_tree: 0x44ffaa, void_lily: 0xaa44ff,
          };
          const ringMat = new THREE.MeshBasicMaterial({
            color: synergyColors[syn.type] ?? 0xffffff,
            transparent: true, opacity: 0.15, side: THREE.DoubleSide,
          });
          ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = -Math.PI / 2;
          this._synergyRings.set(key, ring);
          this._scene.add(ring);
        }
        ring.position.set(syn.pos.x, 0.1, syn.pos.z);
        // Pulse opacity with gameTime
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.sin(state.gameTime * 2) * 0.05 + 0.05;
      }
    }
    // Remove stale synergy rings
    for (const [key, ring] of this._synergyRings) {
      if (!activeSynergyKeys.has(key)) {
        this._scene.remove(ring);
        this._synergyRings.delete(key);
      }
    }

    // Celestial burst effect
    if (state.pendingCelestialBurst) {
      state.pendingCelestialBurst = false;
      if (this._celestialBurstRing) this._scene.remove(this._celestialBurstRing);
      const geo = new THREE.RingGeometry(0.8, 1.2, 48);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd700, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
      });
      this._celestialBurstRing = new THREE.Mesh(geo, mat);
      this._celestialBurstRing.position.set(state.player.pos.x, 1, state.player.pos.z);
      this._celestialBurstRing.rotation.x = -Math.PI / 2;
      this._scene.add(this._celestialBurstRing);
      this._celestialBurstTimer = 1.0;
      this._bloomPass.strength = 2.0;
      // Golden fog flash
      this._fog.color.setHex(0x665500);
    }
    if (this._celestialBurstRing) {
      this._celestialBurstTimer -= dt;
      const t = 1 - this._celestialBurstTimer; // 0 -> 1 over 1 second
      const expandScale = 1 + t * 19; // radius 1 -> 20
      this._celestialBurstRing.scale.setScalar(expandScale);
      const mat = this._celestialBurstRing.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.7 * this._celestialBurstTimer);
      if (this._celestialBurstTimer <= 0) {
        this._scene.remove(this._celestialBurstRing);
        this._celestialBurstRing = null;
      }
    }

    // Boss entrance effect
    if (state.pendingBossEntrance) {
      state.pendingBossEntrance = false;
      if (this._bossShockwave) this._scene.remove(this._bossShockwave);
      const geo = new THREE.RingGeometry(0.5, 1.0, 48);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x330044, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
      });
      this._bossShockwave = new THREE.Mesh(geo, mat);
      this._bossShockwave.position.set(0, 0.5, 0); // arena center
      this._bossShockwave.rotation.x = -Math.PI / 2;
      this._scene.add(this._bossShockwave);
      this._bossShockwaveTimer = 1.2;
      this._bloomPass.strength = 1.5;
      // Dark purple fog flash
      this._fog.color.setHex(0x220033);
    }
    if (this._bossShockwave) {
      this._bossShockwaveTimer -= dt;
      const t = 1 - this._bossShockwaveTimer / 1.2;
      this._bossShockwave.scale.setScalar(1 + t * 25);
      const mat = this._bossShockwave.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.8 * (this._bossShockwaveTimer / 1.2));
      if (this._bossShockwaveTimer <= 0) {
        this._scene.remove(this._bossShockwave);
        this._bossShockwave = null;
      }
    }

    // Perfect dodge flash
    if (state.pendingPerfectDodge) {
      state.pendingPerfectDodge = false;
      if (this._perfectDodgeRing) this._scene.remove(this._perfectDodgeRing);
      const geo = new THREE.RingGeometry(0.3, 0.8, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
      });
      this._perfectDodgeRing = new THREE.Mesh(geo, mat);
      this._perfectDodgeRing.position.set(state.player.pos.x, 1, state.player.pos.z);
      this._perfectDodgeRing.rotation.x = -Math.PI / 2;
      this._scene.add(this._perfectDodgeRing);
      this._perfectDodgeTimer = 0.4;
      this._bloomPass.strength = 1.8;
      // Blue-white fog flash (chromatic aberration feel)
      this._fog.color.setHex(0x8888ff);
    }
    if (this._perfectDodgeRing) {
      this._perfectDodgeTimer -= dt;
      const t = 1 - this._perfectDodgeTimer / 0.4;
      this._perfectDodgeRing.scale.setScalar(1 + t * 8);
      const mat = this._perfectDodgeRing.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.9 * (this._perfectDodgeTimer / 0.4));
      if (this._perfectDodgeTimer <= 0) {
        this._scene.remove(this._perfectDodgeRing);
        this._perfectDodgeRing = null;
      }
    }

    // Aurora flash
    if (state.pendingAuroraFlash) {
      state.pendingAuroraFlash = false;
      // Brief flash handled by bloom intensity
      this._bloomPass.strength = 1.5;
    }
    // Restore bloom
    const targetBloom = 0.4 + state.dayNightBlend * 0.5;
    this._bloomPass.strength += (targetBloom - this._bloomPass.strength) * 3 * dt;

    // Restore fog color smoothly after flash effects
    const dayFogTarget = new THREE.Color(0x1a1830);
    const nightFogTarget = new THREE.Color(0x050510);
    const normalFog = dayFogTarget.lerp(nightFogTarget, state.dayNightBlend);
    this._fog.color.lerp(normalFog, 3 * dt);
  }

  private _updateDecor(state: GuinevereState, _dt: number): void {
    // Floating crystals: bob and rotate
    for (let i = 0; i < this._crystalFormations.length; i++) {
      const crystal = this._crystalFormations[i];
      const baseY = 3 + (i / 6) * 5;
      crystal.position.y = baseY + Math.sin(state.gameTime * 0.8 + i * 1.3) * 0.5;
      crystal.rotation.y = state.gameTime * 0.3 + i;
      crystal.rotation.z = Math.sin(state.gameTime * 0.5 + i * 0.7) * 0.2;
      // Pulse glow
      const mat = crystal.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + Math.sin(state.gameTime * 1.5 + i * 2) * 0.3;
    }

    // Firefly lights: slow orbit
    for (let i = 0; i < this._fireflyPivots.length; i++) {
      this._fireflyPivots[i].rotation.y = state.gameTime * 0.2 + (i / 3) * TAU;
      this._fireflyLights[i].intensity = 0.3 + Math.sin(state.gameTime * 2 + i * 1.5) * 0.15;
    }

    // Island glow ring pulse
    for (const ring of this._islandGlowRings) {
      const mat = ring.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + Math.sin(state.gameTime * 1.2) * 0.2;
      mat.opacity = 0.2 + Math.sin(state.gameTime * 0.8) * 0.1;
    }
  }

  private _buildMinimap(): void {
    this._minimapCanvas = document.createElement("canvas");
    this._minimapCanvas.width = 150;
    this._minimapCanvas.height = 150;
    this._minimapCanvas.style.position = "fixed";
    this._minimapCanvas.style.bottom = "16px";
    this._minimapCanvas.style.right = "16px";
    this._minimapCanvas.style.zIndex = "10";
    this._minimapCanvas.style.border = "2px solid rgba(255,215,0,0.5)";
    this._minimapCanvas.style.borderRadius = "12px";
    this._minimapCanvas.style.background = "rgba(5,5,16,0.6)";
    this._minimapCanvas.style.pointerEvents = "none";
    document.body.appendChild(this._minimapCanvas);
    this._minimapCtx = this._minimapCanvas.getContext("2d")!;
  }

  private _updateMinimap(state: GuinevereState): void {
    const ctx = this._minimapCtx;
    const w = 150, h = 150;
    const scale = 1.8; // world units per pixel
    const cx = state.player.pos.x;
    const cz = state.player.pos.z;

    ctx.clearRect(0, 0, w, h);

    // Island circles
    ctx.globalAlpha = 0.3;
    for (const island of state.islands) {
      if (!island.unlocked) continue;
      const ix = w / 2 + (island.pos.x - cx) / scale;
      const iz = h / 2 + (island.pos.z - cz) / scale;
      const ir = island.radius / scale;
      ctx.beginPath();
      ctx.arc(ix, iz, ir, 0, TAU);
      ctx.fillStyle = "#334422";
      ctx.fill();
      ctx.strokeStyle = "#556633";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Thorn walls
    ctx.globalAlpha = 0.5;
    for (const wall of state.thornWalls) {
      const wx = w / 2 + (wall.pos.x - cx) / scale;
      const wz = h / 2 + (wall.pos.z - cz) / scale;
      ctx.beginPath();
      ctx.arc(wx, wz, 2, 0, TAU);
      ctx.fillStyle = "#338833";
      ctx.fill();
    }

    // Plant dots (green)
    ctx.globalAlpha = 0.7;
    for (const [, plant] of state.plants) {
      const px = w / 2 + (plant.pos.x - cx) / scale;
      const pz = h / 2 + (plant.pos.z - cz) / scale;
      ctx.beginPath();
      ctx.arc(px, pz, 3, 0, TAU);
      ctx.fillStyle = plant.withering ? "#664444" : "#44cc44";
      ctx.fill();
    }

    // Enemy dots (colored by type)
    const enemyMinimapColors: Record<string, string> = {
      wisp: "#88ddff", crawler: "#553388", stag: "#886644", moth: "#88aa44", shambler: "#44aa66", wither_lord: "#ff0044",
    };
    ctx.globalAlpha = 0.8;
    for (const enemy of state.enemies) {
      if (enemy.behavior === "dead") continue;
      const ex = w / 2 + (enemy.pos.x - cx) / scale;
      const ez = h / 2 + (enemy.pos.z - cz) / scale;
      const r = enemy.type === "wither_lord" ? 4 : 2.5;
      ctx.beginPath();
      ctx.arc(ex, ez, r, 0, TAU);
      ctx.fillStyle = enemyMinimapColors[enemy.type] ?? "#ff4444";
      ctx.fill();
    }

    // Player dot (gold, center)
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 4, 0, TAU);
    ctx.fillStyle = "#ffd700";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Player direction indicator
    const dirLen = 8;
    const dirX = w / 2 + Math.sin(state.player.yaw) * dirLen;
    const dirZ = h / 2 + Math.cos(state.player.yaw) * dirLen;
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(dirX, dirZ);
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  private _updateDamageNumbers(state: GuinevereState, dt: number): void {
    // Create sprites for new damage numbers
    for (const dn of state.damageNumbers) {
      // Use a simple heuristic: if timer is close to max (~1.0), it's new
      if (dn.timer > 0.9) {
        const id = this._damageNumberIdCounter++;
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 64;
        const ctx2 = canvas.getContext("2d")!;
        ctx2.font = dn.crit ? "bold 48px sans-serif" : "bold 36px sans-serif";
        ctx2.textAlign = "center";
        ctx2.textBaseline = "middle";
        // Outline
        ctx2.strokeStyle = "#000";
        ctx2.lineWidth = 4;
        ctx2.strokeText(String(dn.value), 64, 32);
        // Fill — gold for normal, red for crits
        ctx2.fillStyle = dn.crit ? "#ff4444" : "#ffd700";
        ctx2.fillText(String(dn.value), 64, 32);

        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(dn.pos.x, dn.pos.y + 2, dn.pos.z);
        sprite.scale.set(2, 1, 1);
        this._scene.add(sprite);
        this._damageNumberSprites.set(id, sprite);
        this._activeDamageNumbers.push({ spriteId: id, timer: dn.timer, maxTimer: dn.timer, pos: { ...dn.pos } });
      }
    }

    // Update existing damage number sprites
    for (let i = this._activeDamageNumbers.length - 1; i >= 0; i--) {
      const entry = this._activeDamageNumbers[i];
      entry.timer -= dt;
      const sprite = this._damageNumberSprites.get(entry.spriteId);
      if (!sprite) { this._activeDamageNumbers.splice(i, 1); continue; }

      // Float upward
      sprite.position.y += dt * 2;

      // Scale based on distance from camera
      const dist = sprite.position.distanceTo(this._camera.position);
      const scaleFactor = Math.max(0.5, Math.min(2, dist / 15));
      sprite.scale.set(2 * scaleFactor, 1 * scaleFactor, 1);

      // Fade out
      (sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, entry.timer / entry.maxTimer);

      if (entry.timer <= 0) {
        this._scene.remove(sprite);
        (sprite.material as THREE.SpriteMaterial).map?.dispose();
        sprite.material.dispose();
        this._damageNumberSprites.delete(entry.spriteId);
        this._activeDamageNumbers.splice(i, 1);
      }
    }
  }

  // ---- Weather Particles ----
  private _updateWeather(state: GuinevereState, _dt: number): void {
    if (state.waveModifier !== this._lastModifier) {
      this._lastModifier = state.waveModifier;
      if (this._weatherParticles) {
        this._scene.remove(this._weatherParticles);
        this._weatherParticles = null;
      }
      if (state.waveModifier !== "none" && state.waveModifier !== "eclipse") {
        const count = state.waveModifier === "frost_storm" ? 200
          : state.waveModifier === "blight_rain" ? 150
          : state.waveModifier === "starfall" ? 80
          : state.waveModifier === "void_tide" ? 100 : 0;
        if (count > 0) {
          const geo = new THREE.BufferGeometry();
          const pos = new Float32Array(count * 3);
          for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 100;
            pos[i * 3 + 1] = Math.random() * 40;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
          }
          geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
          const colors: Record<string, number> = {
            frost_storm: 0xaaddff, blight_rain: 0x66aa44,
            starfall: 0xffd700, void_tide: 0xaa44ff,
          };
          const mat = new THREE.PointsMaterial({
            color: colors[state.waveModifier] ?? 0xffffff,
            size: state.waveModifier === "starfall" ? 2.5 : 1.2,
            transparent: true, opacity: 0.6, sizeAttenuation: true,
          });
          this._weatherParticles = new THREE.Points(geo, mat);
          this._scene.add(this._weatherParticles);
        }
      }
      // Eclipse: darken scene
      if (state.waveModifier === "eclipse") {
        this._ambientLight.intensity *= 0.5;
        this._fog.density = GUIN.FOG_DENSITY * 1.8;
      } else {
        this._fog.density = GUIN.FOG_DENSITY;
      }
    }
    // Animate weather particles
    if (this._weatherParticles) {
      const posAttr = this._weatherParticles.geometry.getAttribute("position") as THREE.BufferAttribute;
      const mod = state.waveModifier;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i);
        let x = posAttr.getX(i);
        if (mod === "frost_storm") {
          y -= 0.15; x += Math.sin(state.gameTime + i) * 0.02;
        } else if (mod === "blight_rain") {
          y -= 0.4;
        } else if (mod === "starfall") {
          y -= 0.08;
          x += Math.sin(state.gameTime * 0.5 + i * 0.7) * 0.03;
        } else if (mod === "void_tide") {
          y += 0.1;
          x += Math.sin(state.gameTime + i * 0.3) * 0.05;
        }
        if (y < 0) y = 40;
        if (y > 42) y = 0;
        posAttr.setX(i, x);
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
      // Center on player
      this._weatherParticles.position.set(state.player.pos.x, 0, state.player.pos.z);
    }
  }

  // ---- Northern Lights ----
  private _updateAurora(state: GuinevereState): void {
    const nightBlend = state.dayNightBlend;
    for (let i = 0; i < this._auroraMeshes.length; i++) {
      const mesh = this._auroraMeshes[i];
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = nightBlend * (0.08 + Math.sin(state.gameTime * 0.3 + i * 1.5) * 0.04);
      // Undulate position
      mesh.position.y = 110 + i * 3 + Math.sin(state.gameTime * 0.2 + i * 0.8) * 3;
      mesh.rotation.z = Math.sin(state.gameTime * 0.15 + i) * 0.1;
      // Shift scale for curtain wave effect
      mesh.scale.x = 1 + Math.sin(state.gameTime * 0.25 + i * 2) * 0.15;
    }
  }

  // ---- Attack Telegraphs ----
  private _updateTelegraphs(state: GuinevereState, _dt: number): void {
    // Remove excess meshes
    while (this._telegraphMeshes.length > state.telegraphs.length) {
      const mesh = this._telegraphMeshes.pop()!;
      this._scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    // Create/update
    for (let i = 0; i < state.telegraphs.length; i++) {
      const tel = state.telegraphs[i];
      let mesh = this._telegraphMeshes[i];
      if (!mesh) {
        const geo = new THREE.RingGeometry(0.3, 1, 32);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xff0000, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        this._scene.add(mesh);
        this._telegraphMeshes.push(mesh);
      }
      const progress = 1 - tel.timer / tel.maxTimer;
      const scale = tel.radius * progress;
      mesh.scale.setScalar(Math.max(0.1, scale));
      mesh.position.set(tel.pos.x, 0.15, tel.pos.z);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.set(tel.color);
      mat.opacity = 0.2 + progress * 0.5; // more opaque as danger approaches
    }
  }

  // ---- Artifact Drops ----
  private _updateArtifactDrops(state: GuinevereState, _dt: number): void {
    // Remove stale
    for (const [id, group] of this._artifactMeshes) {
      if (!state.artifactDrops.find(d => d.id === id)) {
        this._scene.remove(group);
        this._artifactMeshes.delete(id);
      }
    }
    // Create/update
    for (const drop of state.artifactDrops) {
      let group = this._artifactMeshes.get(drop.id);
      if (!group) {
        group = new THREE.Group();
        const info = ARTIFACT_INFO[drop.type];
        const colorNum = parseInt(info.color.replace("#", ""), 16);
        const geo = new THREE.OctahedronGeometry(0.4, 0);
        const mat = new THREE.MeshStandardMaterial({
          color: colorNum, emissive: colorNum, emissiveIntensity: 0.8,
          metalness: 0.6, roughness: 0.2, transparent: true, opacity: 0.9,
        });
        const gem = new THREE.Mesh(geo, mat);
        group.add(gem);
        // Glow light
        const light = new THREE.PointLight(colorNum, 0.5, 8);
        light.position.y = 0.5;
        group.add(light);
        this._artifactMeshes.set(drop.id, group);
        this._scene.add(group);
      }
      group.position.set(drop.pos.x, drop.pos.y, drop.pos.z);
      // Spin and bob
      group.rotation.y = state.gameTime * 2;
      group.children[0].rotation.x = state.gameTime * 1.5;
    }
  }

  // ---- Charged Moonbeam Orb ----
  private _updateChargeOrb(state: GuinevereState): void {
    const p = state.player;
    if (p.moonbeamCharging && p.moonbeamChargeTime > 0.05) {
      if (!this._chargeOrb) {
        const geo = new THREE.SphereGeometry(0.15, 16, 12);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xaaddff, transparent: true, opacity: 0.8,
        });
        this._chargeOrb = new THREE.Mesh(geo, mat);
        this._scene.add(this._chargeOrb);
        this._chargeOrbLight = new THREE.PointLight(0x88ccff, 0.3, 8);
        this._scene.add(this._chargeOrbLight);
      }
      const ratio = p.moonbeamChargeTime / GUIN.MOONBEAM_CHARGE_TIME;
      const scale = 0.3 + ratio * 1.2;
      this._chargeOrb.scale.setScalar(scale);
      // Position at staff tip (approx: player pos + offset)
      const staffX = p.pos.x + Math.sin(p.yaw) * 0.6;
      const staffZ = p.pos.z + Math.cos(p.yaw) * 0.6;
      const staffY = p.pos.y + 1.8;
      this._chargeOrb.position.set(staffX, staffY, staffZ);
      this._chargeOrbLight!.position.copy(this._chargeOrb.position);
      // Color shifts from white to cyan as charge builds
      const mat = this._chargeOrb.material as THREE.MeshBasicMaterial;
      mat.color.setHSL(0.55, ratio * 0.8, 0.7 + ratio * 0.3);
      mat.opacity = 0.5 + ratio * 0.5;
      this._chargeOrbLight!.intensity = 0.3 + ratio * 1.2;
      this._chargeOrb.visible = true;
      this._chargeOrbLight!.visible = true;
    } else {
      if (this._chargeOrb) {
        this._chargeOrb.visible = false;
        this._chargeOrbLight!.visible = false;
      }
    }
  }

  cleanup(): void {
    if (this._auroraShield) this._scene.remove(this._auroraShield);
    if (this._blossomRing) this._scene.remove(this._blossomRing);
    if (this._rootBindRing) this._scene.remove(this._rootBindRing);
    if (this._moonbeamLine) this._scene.remove(this._moonbeamLine);
    if (this._moonMesh) this._scene.remove(this._moonMesh);
    if (this._moonPointLight) this._scene.remove(this._moonPointLight);

    // New effect meshes
    if (this._celestialBurstRing) this._scene.remove(this._celestialBurstRing);
    if (this._bossShockwave) this._scene.remove(this._bossShockwave);
    if (this._perfectDodgeRing) this._scene.remove(this._perfectDodgeRing);

    // Elite aura rings
    for (const [, r] of this._eliteAuraRings) this._scene.remove(r);
    this._eliteAuraRings.clear();

    // Stag charge trails
    for (const [, trail] of this._stagTrails) {
      for (const t of trail) {
        this._scene.remove(t);
        t.geometry.dispose();
        (t.material as THREE.Material).dispose();
      }
    }
    this._stagTrails.clear();

    // Environmental decor
    for (const c of this._crystalFormations) {
      this._scene.remove(c);
      c.geometry.dispose();
      (c.material as THREE.Material).dispose();
    }
    this._crystalFormations.length = 0;

    for (let i = 0; i < this._fireflyPivots.length; i++) {
      this._scene.remove(this._fireflyPivots[i]);
      this._fireflyLights[i].dispose();
    }
    this._fireflyPivots.length = 0;
    this._fireflyLights.length = 0;

    for (const r of this._islandGlowRings) {
      this._scene.remove(r);
      r.geometry.dispose();
      (r.material as THREE.Material).dispose();
    }
    this._islandGlowRings.length = 0;

    for (const [, g] of this._plantMeshes) this._scene.remove(g);
    for (const [, g] of this._enemyMeshes) this._scene.remove(g);
    for (const [, g] of this._thornMeshes) this._scene.remove(g);
    for (const [, m] of this._projectileMeshes) this._scene.remove(m);
    for (const [, g] of this._hpBarMeshes) this._scene.remove(g);
    for (const [, s] of this._damageNumberSprites) {
      this._scene.remove(s);
      (s.material as THREE.SpriteMaterial).map?.dispose();
      s.material.dispose();
    }
    for (const [, r] of this._synergyRings) this._scene.remove(r);

    this._hpBarMeshes.clear();
    this._damageNumberSprites.clear();
    this._activeDamageNumbers.length = 0;
    this._synergyRings.clear();

    // Weather particles
    if (this._weatherParticles) this._scene.remove(this._weatherParticles);
    // Aurora
    for (const m of this._auroraMeshes) { this._scene.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
    this._auroraMeshes.length = 0;
    // Telegraphs
    for (const m of this._telegraphMeshes) { this._scene.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
    this._telegraphMeshes.length = 0;
    // Artifact drops
    for (const [, g] of this._artifactMeshes) this._scene.remove(g);
    this._artifactMeshes.clear();
    // Charge orb
    if (this._chargeOrb) { this._scene.remove(this._chargeOrb); }
    if (this._chargeOrbLight) { this._scene.remove(this._chargeOrbLight); }

    // Remove minimap canvas
    if (this._minimapCanvas && this._minimapCanvas.parentElement) {
      this._minimapCanvas.parentElement.removeChild(this._minimapCanvas);
    }

    this._renderer.dispose();
    this._composer.dispose();
    if (this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas);
  }
}
