import * as THREE from 'three';
import {
  DiabloState,
  DiabloMapId,
  EnemyType,
  ItemRarity,
  EnemyState,
  DiabloClass,
  SkillId,
  StatusEffect,
  DiabloPhase,
  TimeOfDay,
  VendorType,
  ParticleType,
  DiabloParticle,
  Weather,
  DiabloTownfolk,
  TownfolkRole,
} from './DiabloTypes';
import { ENEMY_DEFS, MAP_CONFIGS, VENDOR_DEFS } from './DiabloConfig';
import { RARITY_COLORS } from './DiabloTypes';

/** Compute terrain elevation at world (x, z). Amplitude kept moderate for isometric view. */
export function getTerrainHeight(x: number, z: number, amplitude: number = 1.4): number {
  return Math.sin(x * 0.04) * amplitude * 0.6 +
    Math.cos(z * 0.04 * 1.3) * amplitude * 0.4 +
    Math.sin((x + z) * 0.04 * 0.7) * amplitude * 0.3;
}

export class DiabloRenderer {
  public canvas!: HTMLCanvasElement;
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _playerGroup!: THREE.Group;
  private _weaponMesh: THREE.Mesh | null = null;
  private _enemyMeshes: Map<string, THREE.Group> = new Map();
  private _projectileMeshes: Map<string, THREE.Object3D> = new Map();
  private _lootMeshes: Map<string, THREE.Group> = new Map();
  private _chestMeshes: Map<string, THREE.Group> = new Map();
  private _aoeMeshes: Map<string, THREE.Mesh> = new Map();
  private _vendorMeshes: Map<string, THREE.Group> = new Map();
  private _townfolkMeshes: Map<string, THREE.Group> = new Map();
  private _floatTextSprites: Map<string, THREE.Sprite> = new Map();
  private _envGroup!: THREE.Group;
  private _currentMap: DiabloMapId | null = null;
  private _time: number = 0;
  private _groundPlane!: THREE.Mesh;
  private _sphereGeo!: THREE.SphereGeometry;
  private _boxGeo!: THREE.BoxGeometry;
  private _cylGeo!: THREE.CylinderGeometry;
  private _coneGeo!: THREE.ConeGeometry;
  private _dirLight!: THREE.DirectionalLight;
  private _ambientLight!: THREE.AmbientLight;
  private _hemiLight!: THREE.HemisphereLight;
  private _torchLights: THREE.PointLight[] = [];
  private _playerLantern: THREE.PointLight | null = null;
  private _weaponArmGroup: THREE.Group | null = null;
  private _leftLegGroup: THREE.Group | null = null;
  private _rightLegGroup: THREE.Group | null = null;
  private _leftArmGroup: THREE.Group | null = null;
  private _walkCycle: number = 0;
  private _prevPlayerX: number = 0;
  private _prevPlayerZ: number = 0;
  private _aimLine: THREE.Line | null = null;

  // First-person mode
  public firstPerson: boolean = false;
  public fpYaw: number = 0;
  public fpPitch: number = 0;
  private _fpWeapon: THREE.Group | null = null;

  private _raycaster: THREE.Raycaster = new THREE.Raycaster();
  private _shieldMeshes: Map<string, THREE.Mesh> = new Map();
  private _healBeams: Map<string, THREE.Line> = new Map();
  private _invulnMesh: THREE.Mesh | null = null;

  private _particleMeshPool: THREE.Mesh[] = [];
  private _particlePoolSize: number = 500;
  private _particleMat!: THREE.MeshStandardMaterial;

  private _shakeIntensity: number = 0;
  private _shakeDuration: number = 0;
  private _shakeTimer: number = 0;
  private _shakeOffsetX: number = 0;
  private _shakeOffsetY: number = 0;
  private _shakeOffsetZ: number = 0;

  private _rngSeed: number = 0;
  private _currentWeather: Weather = Weather.NORMAL;
  private _stormFlashTimer: number = 0;
  private _stormFlashActive: boolean = false;
  private _baseFogDensity: number = 0;
  private _baseAmbientIntensity: number = 0;
  private _baseDirIntensity: number = 0;

  init(w: number, h: number): void {
    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.0;

    this.canvas = this._renderer.domElement;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';

    this._scene = new THREE.Scene();

    this._camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500);
    this._camera.position.set(12, 18, 12);
    this._camera.lookAt(0, 0, 0);

    this._ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this._scene.add(this._ambientLight);

    this._hemiLight = new THREE.HemisphereLight(0x8888cc, 0x443322, 0.5);
    this._scene.add(this._hemiLight);

    this._dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    this._dirLight.position.set(15, 25, 10);
    this._dirLight.castShadow = true;
    this._dirLight.shadow.mapSize.set(2048, 2048);
    this._dirLight.shadow.camera.near = 0.5;
    this._dirLight.shadow.camera.far = 80;
    this._dirLight.shadow.camera.left = -40;
    this._dirLight.shadow.camera.right = 40;
    this._dirLight.shadow.camera.top = 40;
    this._dirLight.shadow.camera.bottom = -40;
    this._scene.add(this._dirLight);

    this._enemyMeshes = new Map();
    this._projectileMeshes = new Map();
    this._lootMeshes = new Map();
    this._chestMeshes = new Map();
    this._aoeMeshes = new Map();
    this._floatTextSprites = new Map();
    this._torchLights = [];

    this._sphereGeo = new THREE.SphereGeometry(1, 12, 10);
    this._boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this._cylGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
    this._coneGeo = new THREE.ConeGeometry(1, 1, 10);

    this._envGroup = new THREE.Group();
    this._scene.add(this._envGroup);

    this._playerGroup = new THREE.Group();
    this._scene.add(this._playerGroup);

    const groundGeo = new THREE.PlaneGeometry(200, 200, 128, 128);
    groundGeo.rotateX(-Math.PI / 2);
    const posAttr = groundGeo.attributes.position;
    const defaultColors: number[] = [];
    const c1 = new THREE.Color(0x446622);
    const c2 = new THREE.Color(0x668833);
    for (let i = 0; i < posAttr.count; i++) {
      const gx = posAttr.getX(i);
      const gz = posAttr.getZ(i);
      const h = getTerrainHeight(gx, gz);
      posAttr.setY(i, h);
      const t = THREE.MathUtils.clamp((h / 1.6) * 0.5 + 0.5, 0, 1);
      const col = new THREE.Color().lerpColors(c1, c2, t);
      defaultColors.push(col.r, col.g, col.b);
    }
    groundGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(defaultColors), 3));
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.0 });
    this._groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this._groundPlane.receiveShadow = true;
    this._scene.add(this._groundPlane);

    const particleGeo = new THREE.SphereGeometry(1, 4, 3);
    this._particleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 1.0,
    });
    this._particleMeshPool = [];
    for (let i = 0; i < this._particlePoolSize; i++) {
      const mat = this._particleMat.clone();
      const mesh = new THREE.Mesh(particleGeo, mat);
      mesh.visible = false;
      this._scene.add(mesh);
      this._particleMeshPool.push(mesh);
    }
  }

  /** Re-color the terrain mesh with height-based blending between two colors.
   *  For indoor/dungeon maps, pass a lower amplitude to flatten terrain. */
  private _applyTerrainColors(baseColor: number, secondaryColor: number, amplitude: number = 1.4): void {
    const geo = this._groundPlane.geometry as THREE.BufferGeometry;
    const posAttr = geo.attributes.position;
    const c1 = new THREE.Color(baseColor);
    const c2 = new THREE.Color(secondaryColor);
    const colors: number[] = [];
    for (let i = 0; i < posAttr.count; i++) {
      const gx = posAttr.getX(i);
      const gz = posAttr.getZ(i);
      const h = getTerrainHeight(gx, gz, amplitude);
      posAttr.setY(i, h);
      const t = THREE.MathUtils.clamp((h / (amplitude * 1.15)) * 0.5 + 0.5, 0, 1);
      const col = new THREE.Color().lerpColors(c1, c2, t);
      colors.push(col.r, col.g, col.b);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geo.computeVertexNormals();
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  buildMap(mapId: DiabloMapId): void {
    while (this._envGroup.children.length > 0) {
      const child = this._envGroup.children[0];
      this._envGroup.remove(child);
    }
    for (const tl of this._torchLights) {
      this._scene.remove(tl);
    }
    this._torchLights = [];
    this._currentMap = mapId;

    this._rngSeed = Date.now();
    const propVariation = 0.7 + this._seededRandom() * 0.6;

    const cfg = MAP_CONFIGS[mapId];

    switch (mapId) {
      case DiabloMapId.FOREST:
        this._buildForest(cfg.width, cfg.depth, propVariation);
        break;
      case DiabloMapId.ELVEN_VILLAGE:
        this._buildElvenVillage(cfg.width, cfg.depth);
        break;
      case DiabloMapId.NECROPOLIS_DUNGEON:
        this._buildNecropolis(cfg.width, cfg.depth);
        break;
      case DiabloMapId.VOLCANIC_WASTES:
        this._buildVolcanicWastes(cfg.width, cfg.depth);
        break;
      case DiabloMapId.ABYSSAL_RIFT:
        this._buildAbyssalRift(cfg.width, cfg.depth);
        break;
      case DiabloMapId.DRAGONS_SANCTUM:
        this._buildDragonsSanctum(cfg.width, cfg.depth);
        break;
      case DiabloMapId.SUNSCORCH_DESERT:
        this._buildSunscorchDesert(cfg.width, cfg.depth);
        break;
      case DiabloMapId.EMERALD_GRASSLANDS:
        this._buildEmeraldGrasslands(cfg.width, cfg.depth);
        break;
      case DiabloMapId.CAMELOT:
        this._buildCamelot(cfg.width, cfg.depth);
        break;
    }
  }

  private _buildForest(w: number, d: number, propMult: number = 1.0): void {
    this._scene.fog = new THREE.FogExp2(0x2a4a2a, 0.018);
    this._applyTerrainColors(0x2a4a1a, 0x4b6a3b);
    this._dirLight.color.setHex(0xffe8b0);
    this._dirLight.intensity = 1.4;
    this._ambientLight.color.setHex(0x304020);
    this._hemiLight.color.setHex(0x88aa66);
    this._hemiLight.groundColor.setHex(0x443322);

    const hw = w / 2;

    // Trees (85 * propMult) - multi-layered with bark rings and roots
    for (let i = 0; i < Math.round(85 * propMult); i++) {
      const tree = new THREE.Group();
      const trunkH = 1.5 + Math.random() * 2.5;
      const trunkR = 0.15 + Math.random() * 0.15;
      const trunkGeo = new THREE.CylinderGeometry(trunkR, trunkR * 1.3, trunkH, 8);
      const barkColor = 0x5c3a1e + Math.floor(Math.random() * 0x111100);
      const trunkMat = new THREE.MeshStandardMaterial({ color: barkColor, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      tree.add(trunk);

      // Bark rings along trunk
      const barkRingCount = 2 + Math.floor(Math.random() * 2);
      for (let br = 0; br < barkRingCount; br++) {
        const ringY = 0.4 + (br / barkRingCount) * trunkH * 0.6;
        const ringGeo = new THREE.TorusGeometry(trunkR * 1.15, trunkR * 0.2, 6, 8);
        const ring = new THREE.Mesh(ringGeo, trunkMat);
        ring.position.y = ringY;
        ring.rotation.x = Math.PI / 2;
        tree.add(ring);
      }

      // Exposed roots at base
      const rootCount = 2 + Math.floor(Math.random() * 3);
      for (let r = 0; r < rootCount; r++) {
        const rootAngle = (r / rootCount) * Math.PI * 2 + Math.random() * 0.5;
        const rootLen = 0.3 + Math.random() * 0.4;
        const rootGeo = new THREE.CylinderGeometry(trunkR * 0.3, trunkR * 0.15, rootLen, 5);
        const root = new THREE.Mesh(rootGeo, trunkMat);
        root.position.set(
          Math.cos(rootAngle) * trunkR * 0.8,
          rootLen * 0.2,
          Math.sin(rootAngle) * trunkR * 0.8
        );
        root.rotation.z = Math.cos(rootAngle) * 0.8;
        root.rotation.x = Math.sin(rootAngle) * 0.8;
        tree.add(root);
      }

      // Multi-layered foliage (3 cone layers)
      const baseGreenShade = 0x228b22 + Math.floor(Math.random() * 0x224400);
      const leafColors = [
        baseGreenShade,
        baseGreenShade + 0x112200,
        baseGreenShade - 0x001100,
      ];
      const layerConfigs = [
        { rMult: 1.0, hMult: 0.9, yOff: -0.3 },   // wide bottom
        { rMult: 0.75, hMult: 0.8, yOff: 0.4 },    // medium middle
        { rMult: 0.5, hMult: 0.65, yOff: 1.0 },    // narrow top
      ];
      const crownR = 1.0 + Math.random() * 1.2;
      const crownH = 2.0 + Math.random() * 2.0;
      for (let li = 0; li < 3; li++) {
        const lc = layerConfigs[li];
        const layerR = crownR * lc.rMult;
        const layerH = crownH * lc.hMult;
        const layerGeo = new THREE.ConeGeometry(layerR, layerH, 8);
        const layerMat = new THREE.MeshStandardMaterial({ color: leafColors[li], roughness: 0.8 });
        const layer = new THREE.Mesh(layerGeo, layerMat);
        layer.position.y = trunkH + crownH * 0.3 + lc.yOff;
        layer.castShadow = true;
        tree.add(layer);
      }

      const tx = (Math.random() - 0.5) * w;
      const tz = (Math.random() - 0.5) * d;
      tree.position.set(tx, getTerrainHeight(tx, tz), tz);
      this._envGroup.add(tree);
    }

    // Rocks (30) - smaller, ground-level
    for (let i = 0; i < 30; i++) {
      const rockGeo = new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.2, 0);
      const greyBrown = 0x666655 + Math.floor(Math.random() * 0x222211);
      const rockMat = new THREE.MeshStandardMaterial({ color: greyBrown, roughness: 0.95, metalness: 0.05 });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const rx = (Math.random() - 0.5) * w;
      const rz = (Math.random() - 0.5) * d;
      rock.position.set(rx, getTerrainHeight(rx, rz) + 0.1 + Math.random() * 0.1, rz);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.castShadow = true;
      this._envGroup.add(rock);
    }

    // Path segments (20)
    for (let i = 0; i < 20; i++) {
      const segGeo = new THREE.BoxGeometry(2.5, 0.05, 3.0);
      const segMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 1.0 });
      const seg = new THREE.Mesh(segGeo, segMat);
      const sx = i * 2.4 - 24;
      const sz = Math.sin(i * 0.4) * 3;
      seg.position.set(sx, getTerrainHeight(sx, sz) + 0.02, sz);
      seg.rotation.y = Math.sin(i * 0.3) * 0.15;
      this._envGroup.add(seg);
    }

    // Grass tufts (60)
    for (let i = 0; i < 60; i++) {
      const grassGeo = new THREE.ConeGeometry(0.08, 0.4, 4);
      const grassMat = new THREE.MeshStandardMaterial({ color: 0x44aa22, roughness: 0.9 });
      const tuft = new THREE.Group();
      for (let j = 0; j < 5; j++) {
        const blade = new THREE.Mesh(grassGeo, grassMat);
        blade.position.set((Math.random() - 0.5) * 0.3, 0.2, (Math.random() - 0.5) * 0.3);
        blade.rotation.z = (Math.random() - 0.5) * 0.4;
        tuft.add(blade);
      }
      const tuftX = (Math.random() - 0.5) * w;
      const tuftZ = (Math.random() - 0.5) * d;
      tuft.position.set(tuftX, getTerrainHeight(tuftX, tuftZ), tuftZ);
      this._envGroup.add(tuft);
    }

    // Fallen logs (10)
    for (let i = 0; i < 10; i++) {
      const logGeo = new THREE.CylinderGeometry(0.2, 0.25, 3 + Math.random() * 2, 8);
      const logMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.95 });
      const log = new THREE.Mesh(logGeo, logMat);
      log.rotation.z = Math.PI / 2;
      const logX = (Math.random() - 0.5) * w;
      const logZ = (Math.random() - 0.5) * d;
      log.position.set(logX, getTerrainHeight(logX, logZ) + 0.2, logZ);
      log.rotation.y = Math.random() * Math.PI;
      log.castShadow = true;
      this._envGroup.add(log);
    }

    // Mushrooms (15)
    for (let i = 0; i < 15; i++) {
      const mush = new THREE.Group();
      const stemGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.2, 6);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0xeeeecc });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.1;
      mush.add(stem);
      const capGeo = new THREE.SphereGeometry(0.1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      const capMat = new THREE.MeshStandardMaterial({ color: 0xcc3333 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 0.2;
      mush.add(cap);
      const mushX = (Math.random() - 0.5) * w;
      const mushZ = (Math.random() - 0.5) * d;
      mush.position.set(mushX, getTerrainHeight(mushX, mushZ), mushZ);
      this._envGroup.add(mush);
    }

    // Stream (blue transparent plane)
    const streamGeo = new THREE.PlaneGeometry(2, d * 0.8);
    const streamMat = new THREE.MeshStandardMaterial({
      color: 0x3388cc,
      transparent: true,
      opacity: 0.55,
      roughness: 0.2,
      metalness: 0.1,
    });
    const stream = new THREE.Mesh(streamGeo, streamMat);
    stream.rotation.x = -Math.PI / 2;
    stream.position.set(hw * 0.4, getTerrainHeight(hw * 0.4, 0) + 0.03, 0);
    this._envGroup.add(stream);

    // Flower patches (20)
    const flowerColors = [0xcc3344, 0xddcc22, 0x8833aa, 0xeeeedd];
    for (let i = 0; i < 20; i++) {
      const patch = new THREE.Group();
      const count = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < count; j++) {
        const stemGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x33aa22, roughness: 0.8 });
        const fStem = new THREE.Mesh(stemGeo, stemMat);
        fStem.position.set((Math.random() - 0.5) * 0.4, 0.15, (Math.random() - 0.5) * 0.4);
        patch.add(fStem);
        const petalGeo = new THREE.ConeGeometry(0.05, 0.08, 5);
        const petalMat = new THREE.MeshStandardMaterial({ color: flowerColors[Math.floor(Math.random() * flowerColors.length)], roughness: 0.6 });
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.position.set(fStem.position.x, 0.32, fStem.position.z);
        patch.add(petal);
      }
      const patchX = (Math.random() - 0.5) * w;
      const patchZ = (Math.random() - 0.5) * d;
      patch.position.set(patchX, getTerrainHeight(patchX, patchZ), patchZ);
      this._envGroup.add(patch);
    }

    // Boulders (6) - small, flat so they don't block view
    for (let i = 0; i < 6; i++) {
      const boulderGroup = new THREE.Group();
      const bRadius = 0.25 + Math.random() * 0.2;
      const boulderGeo = new THREE.SphereGeometry(bRadius, 6, 5);
      const boulderMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.95, metalness: 0.05 });
      const boulder = new THREE.Mesh(boulderGeo, boulderMat);
      boulder.scale.y = 0.5;
      boulder.position.y = bRadius * 0.25;
      boulder.castShadow = true;
      boulderGroup.add(boulder);
      const mossGeo = new THREE.SphereGeometry(bRadius * 0.35, 5, 4);
      const mossMat = new THREE.MeshStandardMaterial({ color: 0x447733, roughness: 1.0 });
      const moss = new THREE.Mesh(mossGeo, mossMat);
      moss.position.y = bRadius * 0.4;
      boulderGroup.add(moss);
      const bx2 = (Math.random() - 0.5) * w;
      const bz2 = (Math.random() - 0.5) * d;
      boulderGroup.position.set(bx2, getTerrainHeight(bx2, bz2), bz2);
      this._envGroup.add(boulderGroup);
    }

    // Animal bones (5)
    for (let i = 0; i < 5; i++) {
      const bonesGroup = new THREE.Group();
      for (let b = 0; b < 4; b++) {
        const abGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.3 + Math.random() * 0.2, 5);
        const abMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.9 });
        const ab = new THREE.Mesh(abGeo, abMat);
        ab.position.set((Math.random() - 0.5) * 0.5, 0.04, (Math.random() - 0.5) * 0.5);
        ab.rotation.z = Math.random() * Math.PI;
        ab.rotation.y = Math.random() * Math.PI;
        bonesGroup.add(ab);
      }
      const boneX = (Math.random() - 0.5) * w;
      const boneZ = (Math.random() - 0.5) * d;
      bonesGroup.position.set(boneX, getTerrainHeight(boneX, boneZ), boneZ);
      this._envGroup.add(bonesGroup);
    }

    // Wooden bridge over stream
    const wBridgeGeo = new THREE.BoxGeometry(3, 0.15, 1.5);
    const wBridgeMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
    const wBridge = new THREE.Mesh(wBridgeGeo, wBridgeMat);
    wBridge.position.set(hw * 0.4, getTerrainHeight(hw * 0.4, 0) + 0.1, 0);
    wBridge.castShadow = true;
    this._envGroup.add(wBridge);
    for (let side = -1; side <= 1; side += 2) {
      for (let pi = 0; pi < 2; pi++) {
        const railGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5);
        const railMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.set(hw * 0.4 + (pi === 0 ? -1.2 : 1.2), 0.4, side * 0.65);
        this._envGroup.add(rail);
      }
    }

    // Campfire remains (3)
    for (let i = 0; i < 3; i++) {
      const campfire = new THREE.Group();
      for (let s = 0; s < 7; s++) {
        const stoneGeo = new THREE.SphereGeometry(0.1, 5, 4);
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.95 });
        const stone = new THREE.Mesh(stoneGeo, stoneMat);
        const ang = (s / 7) * Math.PI * 2;
        stone.position.set(Math.cos(ang) * 0.4, 0.08, Math.sin(ang) * 0.4);
        campfire.add(stone);
      }
      const charGeo = new THREE.PlaneGeometry(0.6, 0.6);
      const charMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
      const charred = new THREE.Mesh(charGeo, charMat);
      charred.rotation.x = -Math.PI / 2;
      charred.position.y = 0.01;
      campfire.add(charred);
      const hLogGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.5, 6);
      const hLogMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.95 });
      const hLog = new THREE.Mesh(hLogGeo, hLogMat);
      hLog.rotation.z = Math.PI / 2;
      hLog.position.y = 0.08;
      campfire.add(hLog);
      const cfX = (Math.random() - 0.5) * w * 0.7;
      const cfZ = (Math.random() - 0.5) * d * 0.7;
      campfire.position.set(cfX, getTerrainHeight(cfX, cfZ), cfZ);
      this._envGroup.add(campfire);
    }

    // Beehives (2)
    for (let i = 0; i < 2; i++) {
      const hiveGeo = new THREE.SphereGeometry(0.3, 8, 6);
      const hiveMat = new THREE.MeshStandardMaterial({ color: 0xaa8833, roughness: 0.8 });
      const hive = new THREE.Mesh(hiveGeo, hiveMat);
      hive.position.set((Math.random() - 0.5) * w * 0.6, 3.0 + Math.random(), (Math.random() - 0.5) * d * 0.6);
      this._envGroup.add(hive);
      const holeGeo = new THREE.CircleGeometry(0.06, 6);
      const holeMat = new THREE.MeshStandardMaterial({ color: 0x111100, side: THREE.DoubleSide });
      const hole = new THREE.Mesh(holeGeo, holeMat);
      hole.position.set(hive.position.x, hive.position.y - 0.1, hive.position.z + 0.29);
      this._envGroup.add(hole);
    }

    // Spider webs between trees (4)
    for (let i = 0; i < 4; i++) {
      const webGeo = new THREE.PlaneGeometry(1.5, 1.5);
      const webMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12,
        roughness: 0.5,
        side: THREE.DoubleSide,
      });
      const web = new THREE.Mesh(webGeo, webMat);
      web.position.set((Math.random() - 0.5) * w * 0.5, 1.5 + Math.random() * 1.5, (Math.random() - 0.5) * d * 0.5);
      web.rotation.y = Math.random() * Math.PI;
      web.rotation.x = (Math.random() - 0.5) * 0.4;
      this._envGroup.add(web);
    }

    // Fog ground layer
    const fogGeo = new THREE.PlaneGeometry(w, d);
    const fogMat = new THREE.MeshStandardMaterial({
      color: 0xccddcc,
      transparent: true,
      opacity: 0.08,
      roughness: 1.0,
      side: THREE.DoubleSide,
    });
    const fogPlane = new THREE.Mesh(fogGeo, fogMat);
    fogPlane.rotation.x = -Math.PI / 2;
    fogPlane.position.y = 0.3;
    this._envGroup.add(fogPlane);

    // Light shafts (6)
    for (let i = 0; i < 6; i++) {
      const shaftGeo = new THREE.CylinderGeometry(0.3, 0.3, 15, 8);
      const shaftMat = new THREE.MeshStandardMaterial({
        color: 0xffffdd,
        transparent: true,
        opacity: 0.03,
        roughness: 0.5,
        side: THREE.DoubleSide,
      });
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      shaft.position.set((Math.random() - 0.5) * w * 0.6, 7.5, (Math.random() - 0.5) * d * 0.6);
      this._envGroup.add(shaft);
    }

    // Deer / animal silhouettes (4)
    for (let i = 0; i < 4; i++) {
      const deerGrp = new THREE.Group();
      const deerMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.2), deerMat);
      body.position.y = 0.5;
      deerGrp.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), deerMat);
      head.position.set(0.35, 0.7, 0);
      deerGrp.add(head);
      for (const lz of [-0.07, 0.07]) {
        for (const lx of [-0.15, 0.15]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 4), deerMat);
          leg.position.set(lx, 0.2, lz);
          deerGrp.add(leg);
        }
      }
      // Antlers
      for (const ax of [-0.04, 0.04]) {
        const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.25, 4), deerMat);
        antler.position.set(0.35 + ax, 0.85, 0);
        antler.rotation.z = ax < 0 ? 0.4 : -0.4;
        deerGrp.add(antler);
      }
      const deerX = (Math.random() - 0.5) * w * 0.8;
      const deerZ = (Math.random() - 0.5) * d * 0.8;
      deerGrp.position.set(deerX, getTerrainHeight(deerX, deerZ), deerZ);
      deerGrp.rotation.y = Math.random() * Math.PI * 2;
      this._envGroup.add(deerGrp);
    }

    // Berry bushes (12)
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x2a6a2a, roughness: 0.9 });
    const berryMat = new THREE.MeshStandardMaterial({ color: 0xcc2244, roughness: 0.5, emissive: 0x440011, emissiveIntensity: 0.1 });
    for (let i = 0; i < 12; i++) {
      const bushGrp = new THREE.Group();
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.4 + Math.random() * 0.3, 6, 5), bushMat);
      bush.scale.y = 0.6;
      bush.position.y = 0.2;
      bushGrp.add(bush);
      for (let b = 0; b < 5; b++) {
        const berry = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 3), berryMat);
        const bAngle = Math.random() * Math.PI * 2;
        berry.position.set(Math.cos(bAngle) * 0.3, 0.25 + Math.random() * 0.15, Math.sin(bAngle) * 0.3);
        bushGrp.add(berry);
      }
      const bushX = (Math.random() - 0.5) * w * 0.85;
      const bushZ = (Math.random() - 0.5) * d * 0.85;
      bushGrp.position.set(bushX, getTerrainHeight(bushX, bushZ), bushZ);
      this._envGroup.add(bushGrp);
    }

    // Toadstools / colorful mushroom clusters (8)
    const toadColors = [0xff3322, 0xffaa22, 0x8833aa, 0x22aaff];
    for (let i = 0; i < 8; i++) {
      const toadGrp = new THREE.Group();
      const numShrooms = 3 + Math.floor(Math.random() * 3);
      for (let m = 0; m < numShrooms; m++) {
        const stemH = 0.1 + Math.random() * 0.15;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, stemH, 5),
          new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 }));
        const mx = (Math.random() - 0.5) * 0.3;
        const mz = (Math.random() - 0.5) * 0.3;
        stem.position.set(mx, stemH / 2, mz);
        toadGrp.add(stem);
        const capColor = toadColors[Math.floor(Math.random() * toadColors.length)];
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2),
          new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.6 }));
        cap.position.set(mx, stemH, mz);
        toadGrp.add(cap);
      }
      const toadX = (Math.random() - 0.5) * w * 0.8;
      const toadZ = (Math.random() - 0.5) * d * 0.8;
      toadGrp.position.set(toadX, getTerrainHeight(toadX, toadZ), toadZ);
      this._envGroup.add(toadGrp);
    }

    // Old wooden signpost (2)
    for (let i = 0; i < 2; i++) {
      const signGrp = new THREE.Group();
      const postGeo = new THREE.CylinderGeometry(0.04, 0.05, 2.0, 5);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 1.0;
      signGrp.add(post);
      for (let s = 0; s < 2; s++) {
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.03),
          new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 }));
        board.position.set(0.25, 1.6 - s * 0.25, 0);
        board.rotation.z = (Math.random() - 0.5) * 0.15;
        signGrp.add(board);
      }
      const signX = (Math.random() - 0.5) * w * 0.5;
      const signZ = (Math.random() - 0.5) * d * 0.5;
      signGrp.position.set(signX, getTerrainHeight(signX, signZ), signZ);
      signGrp.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(signGrp);
    }

    // Fern patches (20)
    const fernMat = new THREE.MeshStandardMaterial({ color: 0x3a8a3a, roughness: 0.85, side: THREE.DoubleSide });
    for (let i = 0; i < 20; i++) {
      const fernGrp = new THREE.Group();
      const numFronds = 4 + Math.floor(Math.random() * 3);
      for (let f = 0; f < numFronds; f++) {
        const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.5), fernMat);
        frond.position.y = 0.2;
        frond.rotation.y = (f / numFronds) * Math.PI * 2;
        frond.rotation.x = -0.6;
        fernGrp.add(frond);
      }
      const fernX = (Math.random() - 0.5) * w * 0.9;
      const fernZ = (Math.random() - 0.5) * d * 0.9;
      fernGrp.position.set(fernX, getTerrainHeight(fernX, fernZ), fernZ);
      this._envGroup.add(fernGrp);
    }

    // Hollow tree stump (3)
    for (let i = 0; i < 3; i++) {
      const stumpGrp = new THREE.Group();
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 }));
      stump.position.y = 0.25;
      stumpGrp.add(stump);
      const hollow = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8),
        new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 1.0 }));
      hollow.position.y = 0.5;
      stumpGrp.add(hollow);
      const stumpX = (Math.random() - 0.5) * w * 0.7;
      const stumpZ = (Math.random() - 0.5) * d * 0.7;
      stumpGrp.position.set(stumpX, getTerrainHeight(stumpX, stumpZ), stumpZ);
      this._envGroup.add(stumpGrp);
    }

    // Fireflies / glowing particles (15)
    for (let i = 0; i < 15; i++) {
      const fly = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 3),
        new THREE.MeshStandardMaterial({ color: 0xddff44, emissive: 0xaacc22, emissiveIntensity: 1.5 }));
      fly.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.5 + Math.random() * 2.5,
        (Math.random() - 0.5) * d * 0.8
      );
      this._envGroup.add(fly);
    }

    // Fallen logs (5)
    for (let i = 0; i < 5; i++) {
      const logGrp = new THREE.Group();
      const logLen = 1.5 + Math.random() * 2.0;
      const logR = 0.08 + Math.random() * 0.06;
      const logMesh = new THREE.Mesh(new THREE.CylinderGeometry(logR, logR * 1.1, logLen, 7),
        new THREE.MeshStandardMaterial({ color: 0x4a2a10, roughness: 0.95 }));
      logMesh.rotation.z = Math.PI / 2;
      logMesh.position.y = logR;
      logGrp.add(logMesh);
      // Moss patches on log
      for (let m = 0; m < 3; m++) {
        const mossPatch = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 3),
          new THREE.MeshStandardMaterial({ color: 0x447733, roughness: 1.0 }));
        mossPatch.scale.y = 0.4;
        mossPatch.position.set((Math.random() - 0.5) * logLen * 0.6, logR * 1.5, (Math.random() - 0.5) * 0.1);
        logGrp.add(mossPatch);
      }
      const logGX = (Math.random() - 0.5) * w * 0.7;
      const logGZ = (Math.random() - 0.5) * d * 0.7;
      logGrp.position.set(logGX, getTerrainHeight(logGX, logGZ), logGZ);
      logGrp.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(logGrp);
    }

    // Woodland flowers (25) - small ground-level color spots
    const woodFlowerColors = [0xffee55, 0xff88cc, 0xaa66ff, 0x66ccff, 0xff6644];
    for (let i = 0; i < 25; i++) {
      const flGrp = new THREE.Group();
      const stemMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.15, 4),
        new THREE.MeshStandardMaterial({ color: 0x447733, roughness: 0.9 }));
      stemMesh.position.y = 0.075;
      flGrp.add(stemMesh);
      const petalColor = woodFlowerColors[Math.floor(Math.random() * woodFlowerColors.length)];
      const petalMesh = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4),
        new THREE.MeshStandardMaterial({ color: petalColor, roughness: 0.5, emissive: petalColor, emissiveIntensity: 0.1 }));
      petalMesh.scale.y = 0.5;
      petalMesh.position.y = 0.16;
      flGrp.add(petalMesh);
      const flGX = (Math.random() - 0.5) * w * 0.9;
      const flGZ = (Math.random() - 0.5) * d * 0.9;
      flGrp.position.set(flGX, getTerrainHeight(flGX, flGZ), flGZ);
      this._envGroup.add(flGrp);
    }

    // Hanging vines from trees (10) - thin green strands
    for (let i = 0; i < 10; i++) {
      const vineLen = 1.0 + Math.random() * 1.5;
      const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, vineLen, 4),
        new THREE.MeshStandardMaterial({ color: 0x338833, roughness: 0.9 }));
      vine.position.set(
        (Math.random() - 0.5) * w * 0.7,
        2.5 + Math.random() * 1.5,
        (Math.random() - 0.5) * d * 0.7
      );
      this._envGroup.add(vine);
    }

    // Owl nests in trees (3)
    for (let i = 0; i < 3; i++) {
      const nestGrp = new THREE.Group();
      const nestBase = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 5, 8),
        new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.95 }));
      nestBase.rotation.x = Math.PI / 2;
      nestGrp.add(nestBase);
      // Tiny eggs
      for (let e = 0; e < 2; e++) {
        const egg = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4),
          new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.7 }));
        egg.scale.y = 1.3;
        egg.position.set((e - 0.5) * 0.05, 0.02, 0);
        nestGrp.add(egg);
      }
      nestGrp.position.set((Math.random() - 0.5) * w * 0.5, 2.5 + Math.random(), (Math.random() - 0.5) * d * 0.5);
      this._envGroup.add(nestGrp);
    }

    // Leaf litter on ground (15 small flat circles)
    const leafColors = [0x886622, 0x995533, 0xaa7744, 0x664411, 0x553300];
    for (let i = 0; i < 15; i++) {
      const leafPile = new THREE.Mesh(new THREE.CircleGeometry(0.2 + Math.random() * 0.3, 6),
        new THREE.MeshStandardMaterial({ color: leafColors[i % leafColors.length], roughness: 1.0, side: THREE.DoubleSide }));
      leafPile.rotation.x = -Math.PI / 2;
      const lpX = (Math.random() - 0.5) * w * 0.9;
      const lpZ = (Math.random() - 0.5) * d * 0.9;
      leafPile.position.set(lpX, getTerrainHeight(lpX, lpZ) + 0.02, lpZ);
      this._envGroup.add(leafPile);
    }
  }

  private _buildElvenVillage(w: number, d: number): void {
    this._scene.fog = new THREE.FogExp2(0x334466, 0.012);
    this._applyTerrainColors(0x3a5a3a, 0x5a7a5a);
    this._dirLight.color.setHex(0xaabbdd);
    this._dirLight.intensity = 0.8;
    this._ambientLight.color.setHex(0x334466);
    this._hemiLight.color.setHex(0x6688bb);
    this._hemiLight.groundColor.setHex(0x223322);

    // 15 elven buildings
    for (let i = 0; i < 15; i++) {
      const building = new THREE.Group();
      const bh = 3 + Math.random() * 3;
      const br = 1.2 + Math.random() * 0.8;
      const baseGeo = new THREE.CylinderGeometry(br, br * 1.1, bh, 8);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0xccccbb, roughness: 0.6, metalness: 0.1 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = bh / 2;
      base.castShadow = true;
      building.add(base);

      const roofH = 2.0 + Math.random();
      const roofGeo = new THREE.ConeGeometry(br * 1.3, roofH, 8);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x336699, roughness: 0.4, metalness: 0.3 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = bh + roofH / 2;
      roof.castShadow = true;
      building.add(roof);

      // Glowing blue windows
      for (let wi = 0; wi < 3; wi++) {
        const winGeo = new THREE.BoxGeometry(0.3, 0.4, 0.1);
        const winMat = new THREE.MeshStandardMaterial({
          color: 0x44aaff,
          emissive: 0x44aaff,
          emissiveIntensity: 0.8,
        });
        const win = new THREE.Mesh(winGeo, winMat);
        const angle = (wi / 3) * Math.PI * 2;
        win.position.set(
          Math.cos(angle) * (br + 0.05),
          bh * 0.5 + wi * 0.5,
          Math.sin(angle) * (br + 0.05)
        );
        win.lookAt(building.position.x, win.position.y, building.position.z);
        building.add(win);
      }

      const bx = (Math.random() - 0.5) * w * 0.8;
      const bz = (Math.random() - 0.5) * d * 0.8;
      building.position.set(bx, getTerrainHeight(bx, bz), bz);
      this._envGroup.add(building);
    }

    // Crystal lanterns (12)
    for (let i = 0; i < 12; i++) {
      const lantern = new THREE.Group();
      const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.5, 6);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 1.25;
      lantern.add(post);

      const crystalGeo = new THREE.IcosahedronGeometry(0.2, 0);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x66ccff,
        emissive: 0x44aaff,
        emissiveIntensity: 1.0,
        transparent: true,
        opacity: 0.85,
      });
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.y = 2.6;
      lantern.add(crystal);

      const ptLight = new THREE.PointLight(0x44aaff, 0.6, 8);
      ptLight.position.y = 2.6;
      lantern.add(ptLight);

      const lanX = (Math.random() - 0.5) * w * 0.9;
      const lanZ = (Math.random() - 0.5) * d * 0.9;
      lantern.position.set(lanX, getTerrainHeight(lanX, lanZ), lanZ);
      this._envGroup.add(lantern);
    }

    // Ancient trees (20)
    for (let i = 0; i < 20; i++) {
      const tree = new THREE.Group();
      const trunkH = 4 + Math.random() * 3;
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, trunkH, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4a3e, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      tree.add(trunk);

      const crownGeo = new THREE.SphereGeometry(2.0 + Math.random(), 8, 6);
      const crownMat = new THREE.MeshStandardMaterial({ color: 0x2a6a3a, roughness: 0.8 });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = trunkH + 1.0;
      crown.castShadow = true;
      tree.add(crown);

      const etX = (Math.random() - 0.5) * w;
      const etZ = (Math.random() - 0.5) * d;
      tree.position.set(etX, getTerrainHeight(etX, etZ), etZ);
      this._envGroup.add(tree);
    }

    // Stone bridge over moonlit pond
    const pondGeo = new THREE.PlaneGeometry(8, 6);
    const pondMat = new THREE.MeshStandardMaterial({
      color: 0x224488,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.3,
    });
    const pond = new THREE.Mesh(pondGeo, pondMat);
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(5, getTerrainHeight(5, -5) + 0.02, -5);
    this._envGroup.add(pond);

    const bridgeGeo = new THREE.BoxGeometry(2, 0.3, 8);
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.7 });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.set(5, getTerrainHeight(5, -5) + 0.5, -5);
    bridge.castShadow = true;
    this._envGroup.add(bridge);

    // Railings
    for (let side = -1; side <= 1; side += 2) {
      for (let pi = 0; pi < 5; pi++) {
        const pillarGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6);
        const pillar = new THREE.Mesh(pillarGeo, bridgeMat);
        pillar.position.set(5 + side * 0.9, 0.9, -5 - 3 + pi * 1.5);
        this._envGroup.add(pillar);
      }
    }

    // Ruins with moss (8 pillars)
    for (let i = 0; i < 8; i++) {
      const ruin = new THREE.Group();
      const pH = 2 + Math.random() * 3;
      const pilGeo = new THREE.CylinderGeometry(0.35, 0.4, pH, 8);
      const pilMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.8 });
      const pil = new THREE.Mesh(pilGeo, pilMat);
      pil.position.y = pH / 2;
      ruin.add(pil);

      // Moss patches
      for (let m = 0; m < 3; m++) {
        const mossGeo = new THREE.SphereGeometry(0.15, 5, 4);
        const mossMat = new THREE.MeshStandardMaterial({ color: 0x336633, roughness: 1.0 });
        const moss = new THREE.Mesh(mossGeo, mossMat);
        moss.position.set(
          (Math.random() - 0.5) * 0.4,
          Math.random() * pH,
          (Math.random() - 0.5) * 0.4
        );
        ruin.add(moss);
      }

      const ruinX = -15 + (Math.random() - 0.5) * 10;
      const ruinZ = 10 + (Math.random() - 0.5) * 8;
      ruin.position.set(ruinX, getTerrainHeight(ruinX, ruinZ), ruinZ);
      this._envGroup.add(ruin);
    }

    // Garden flowers (25) - luminescent
    const gardenColors = [0x4488ff, 0xff44aa, 0xaaddff];
    for (let i = 0; i < 25; i++) {
      const flowerGroup = new THREE.Group();
      const fCount = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < fCount; j++) {
        const fStemGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.25, 4);
        const fStemMat = new THREE.MeshStandardMaterial({ color: 0x33aa44, roughness: 0.8 });
        const fStem = new THREE.Mesh(fStemGeo, fStemMat);
        fStem.position.set((Math.random() - 0.5) * 0.3, 0.125, (Math.random() - 0.5) * 0.3);
        flowerGroup.add(fStem);
        const gc = gardenColors[Math.floor(Math.random() * gardenColors.length)];
        const glowGeo = new THREE.SphereGeometry(0.05, 6, 5);
        const glowMat = new THREE.MeshStandardMaterial({ color: gc, emissive: gc, emissiveIntensity: 0.8, roughness: 0.3 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(fStem.position.x, 0.27, fStem.position.z);
        flowerGroup.add(glow);
      }
      const fgX = (Math.random() - 0.5) * w * 0.8;
      const fgZ = (Math.random() - 0.5) * d * 0.8;
      flowerGroup.position.set(fgX, getTerrainHeight(fgX, fgZ), fgZ);
      this._envGroup.add(flowerGroup);
    }

    // Vine-covered archways (4)
    for (let i = 0; i < 4; i++) {
      const archGroup = new THREE.Group();
      for (let side = -1; side <= 1; side += 2) {
        const pillarGeo = new THREE.CylinderGeometry(0.15, 0.15, 3.5, 8);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.7 });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(side * 1.2, 1.75, 0);
        pillar.castShadow = true;
        archGroup.add(pillar);
      }
      const archGeo = new THREE.TorusGeometry(1.2, 0.12, 8, 12, Math.PI);
      const archMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.7 });
      const arch = new THREE.Mesh(archGeo, archMat);
      arch.position.y = 3.5;
      arch.rotation.z = Math.PI;
      archGroup.add(arch);
      for (let iv = 0; iv < 12; iv++) {
        const ivyGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 5, 4);
        const ivyMat = new THREE.MeshStandardMaterial({ color: 0x336633, roughness: 0.9 });
        const ivy = new THREE.Mesh(ivyGeo, ivyMat);
        const ivAng = Math.random() * Math.PI;
        ivy.position.set(Math.cos(ivAng) * 1.2, 3.5 - Math.sin(ivAng) * 1.2 * (Math.random() > 0.5 ? 1 : 0.5), (Math.random() - 0.5) * 0.3);
        archGroup.add(ivy);
      }
      const archX = (Math.random() - 0.5) * w * 0.6;
      const archZ = (Math.random() - 0.5) * d * 0.6;
      archGroup.position.set(archX, getTerrainHeight(archX, archZ), archZ);
      archGroup.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(archGroup);
    }

    // Fountain - central feature
    const fountainGroup = new THREE.Group();
    const basinGeo = new THREE.TorusGeometry(1.5, 0.2, 8, 20);
    const basinMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.6, metalness: 0.2 });
    const basin = new THREE.Mesh(basinGeo, basinMat);
    basin.rotation.x = -Math.PI / 2;
    basin.position.y = 0.3;
    fountainGroup.add(basin);
    const waterGeo = new THREE.CircleGeometry(1.3, 16);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x4488cc, transparent: true, opacity: 0.5, roughness: 0.1, metalness: 0.3 });
    const waterSurf = new THREE.Mesh(waterGeo, waterMat);
    waterSurf.rotation.x = -Math.PI / 2;
    waterSurf.position.y = 0.25;
    fountainGroup.add(waterSurf);
    const jetGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.0, 6);
    const jetMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x4488ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.5 });
    const jet = new THREE.Mesh(jetGeo, jetMat);
    jet.position.y = 1.3;
    fountainGroup.add(jet);
    fountainGroup.position.set(0, getTerrainHeight(0, 0), 0);
    this._envGroup.add(fountainGroup);

    // Statues (3)
    for (let i = 0; i < 3; i++) {
      const statueGroup = new THREE.Group();
      const pedGeo = new THREE.BoxGeometry(0.8, 0.5, 0.8);
      const pedMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.1 });
      const pedestal = new THREE.Mesh(pedGeo, pedMat);
      pedestal.position.y = 0.25;
      statueGroup.add(pedestal);
      const stBodyGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.2, 8);
      const stMat = new THREE.MeshStandardMaterial({ color: 0x999999, emissive: 0x112244, emissiveIntensity: 0.3, roughness: 0.5 });
      const stBody = new THREE.Mesh(stBodyGeo, stMat);
      stBody.position.y = 1.1;
      statueGroup.add(stBody);
      const stHeadGeo = new THREE.SphereGeometry(0.14, 8, 6);
      const stHead = new THREE.Mesh(stHeadGeo, stMat);
      stHead.position.y = 1.85;
      statueGroup.add(stHead);
      const stArmGeo = new THREE.ConeGeometry(0.06, 0.5, 5);
      const stArm = new THREE.Mesh(stArmGeo, stMat);
      stArm.position.set(0.3, 1.5, 0.1);
      stArm.rotation.z = -0.8;
      statueGroup.add(stArm);
      const stX = (Math.random() - 0.5) * w * 0.5;
      const stZ = (Math.random() - 0.5) * d * 0.5;
      statueGroup.position.set(stX, getTerrainHeight(stX, stZ), stZ);
      this._envGroup.add(statueGroup);
    }

    // Floating crystals (8)
    const crystalColors = [0x4466ff, 0x8844cc, 0x44cc66];
    for (let i = 0; i < 8; i++) {
      const cc = crystalColors[i % crystalColors.length];
      const fcGeo = i % 2 === 0 ? new THREE.IcosahedronGeometry(0.2, 0) : new THREE.OctahedronGeometry(0.2, 0);
      const fcMat = new THREE.MeshStandardMaterial({ color: cc, emissive: cc, emissiveIntensity: 1.2, transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.5 });
      const fc = new THREE.Mesh(fcGeo, fcMat);
      fc.position.set((Math.random() - 0.5) * w * 0.7, 2.0 + Math.random() * 3.0, (Math.random() - 0.5) * d * 0.7);
      this._envGroup.add(fc);
      const cPt = new THREE.PointLight(cc, 0.4, 6);
      cPt.position.copy(fc.position);
      this._envGroup.add(cPt);
    }

    // Mushroom circle (fairy ring)
    const fairyRingGroup = new THREE.Group();
    for (let m = 0; m < 12; m++) {
      const mStemGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.15, 6);
      const mStemMat = new THREE.MeshStandardMaterial({ color: 0xaaddcc, emissive: 0x225544, emissiveIntensity: 0.5 });
      const mStem = new THREE.Mesh(mStemGeo, mStemMat);
      const mAng = (m / 12) * Math.PI * 2;
      mStem.position.set(Math.cos(mAng) * 1.5, 0.075, Math.sin(mAng) * 1.5);
      fairyRingGroup.add(mStem);
      const mCapGeo = new THREE.SphereGeometry(0.08, 6, 5, 0, Math.PI * 2, 0, Math.PI / 2);
      const mCapMat = new THREE.MeshStandardMaterial({ color: 0x44ddaa, emissive: 0x22aa77, emissiveIntensity: 0.8 });
      const mCap = new THREE.Mesh(mCapGeo, mCapMat);
      mCap.position.set(Math.cos(mAng) * 1.5, 0.15, Math.sin(mAng) * 1.5);
      fairyRingGroup.add(mCap);
    }
    const frX = (Math.random() - 0.5) * w * 0.4;
    const frZ = (Math.random() - 0.5) * d * 0.4;
    fairyRingGroup.position.set(frX, getTerrainHeight(frX, frZ), frZ);
    this._envGroup.add(fairyRingGroup);

    // Fallen leaves (15)
    const leafColors = [0xddaa33, 0xcc7722, 0xbb3322];
    for (let i = 0; i < 15; i++) {
      const leafGeo = new THREE.PlaneGeometry(0.12, 0.08);
      const leafMat = new THREE.MeshStandardMaterial({ color: leafColors[Math.floor(Math.random() * leafColors.length)], roughness: 0.9, side: THREE.DoubleSide });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      leaf.rotation.z = Math.random() * Math.PI * 2;
      const lfX = (Math.random() - 0.5) * w * 0.8;
      const lfZ = (Math.random() - 0.5) * d * 0.8;
      leaf.position.set(lfX, getTerrainHeight(lfX, lfZ) + 0.02, lfZ);
      this._envGroup.add(leaf);
    }

    // Benches (3)
    for (let i = 0; i < 3; i++) {
      const benchGroup = new THREE.Group();
      const seatGeo = new THREE.BoxGeometry(1.2, 0.08, 0.35);
      const benchMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });
      const seat = new THREE.Mesh(seatGeo, benchMat);
      seat.position.y = 0.4;
      benchGroup.add(seat);
      for (let leg = -1; leg <= 1; leg += 2) {
        const legGeo = new THREE.BoxGeometry(0.08, 0.4, 0.3);
        const legM = new THREE.Mesh(legGeo, benchMat);
        legM.position.set(leg * 0.5, 0.2, 0);
        benchGroup.add(legM);
      }
      const benchX = (Math.random() - 0.5) * w * 0.6;
      const benchZ = (Math.random() - 0.5) * d * 0.6;
      benchGroup.position.set(benchX, getTerrainHeight(benchX, benchZ), benchZ);
      benchGroup.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(benchGroup);
    }

    // Stepping stone paths (3 paths of 8 stones each)
    for (let p = 0; p < 3; p++) {
      const startX = (Math.random() - 0.5) * w * 0.5;
      const startZ = (Math.random() - 0.5) * d * 0.5;
      const dirX = (Math.random() - 0.5) * 0.8;
      const dirZ = (Math.random() - 0.5) * 0.8;
      for (let s = 0; s < 8; s++) {
        const ssGeo = new THREE.CylinderGeometry(0.2 + Math.random() * 0.1, 0.22 + Math.random() * 0.1, 0.06, 7);
        const ssMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.85 });
        const ss = new THREE.Mesh(ssGeo, ssMat);
        const ssX = startX + dirX * s * 1.2;
        const ssZ = startZ + dirZ * s * 1.2;
        ss.position.set(ssX, getTerrainHeight(ssX, ssZ) + 0.03, ssZ);
        this._envGroup.add(ss);
      }
    }

    // Bookshelf ruins (2)
    for (let i = 0; i < 2; i++) {
      const shelfGroup = new THREE.Group();
      const frameGeo = new THREE.BoxGeometry(1.0, 2.0, 0.3);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.9 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.y = 1.0;
      shelfGroup.add(frame);
      for (let b = 0; b < 6; b++) {
        const bookGeo = new THREE.BoxGeometry(0.08 + Math.random() * 0.05, 0.2 + Math.random() * 0.1, 0.2);
        const bookMat = new THREE.MeshStandardMaterial({ color: 0x224466 + Math.floor(Math.random() * 0x443322), roughness: 0.8 });
        const book = new THREE.Mesh(bookGeo, bookMat);
        book.position.set(-0.3 + b * 0.12, 0.5 + Math.floor(b / 3) * 0.6, 0);
        if (Math.random() > 0.6) book.rotation.z = (Math.random() - 0.5) * 0.5;
        shelfGroup.add(book);
      }
      const fallenGeo = new THREE.BoxGeometry(0.1, 0.22, 0.18);
      const fallenMat = new THREE.MeshStandardMaterial({ color: 0x663322, roughness: 0.85 });
      const fallen = new THREE.Mesh(fallenGeo, fallenMat);
      fallen.position.set(0.3, 0.05, 0.3);
      fallen.rotation.z = Math.PI / 2;
      shelfGroup.add(fallen);
      const shX = (Math.random() - 0.5) * w * 0.5;
      const shZ = (Math.random() - 0.5) * d * 0.5;
      shelfGroup.position.set(shX, getTerrainHeight(shX, shZ), shZ);
      shelfGroup.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(shelfGroup);
    }

    // Elven banners (4)
    for (let i = 0; i < 4; i++) {
      const bannerGroup = new THREE.Group();
      const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 4.0, 6);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.4, roughness: 0.5 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 2.0;
      bannerGroup.add(pole);
      const clothGeo = new THREE.BoxGeometry(0.6, 1.2, 0.02);
      const clothMat = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0x3355aa : 0xaabbcc, roughness: 0.8, side: THREE.DoubleSide });
      const cloth = new THREE.Mesh(clothGeo, clothMat);
      cloth.position.set(0.32, 3.2, 0);
      bannerGroup.add(cloth);
      const bnX = (Math.random() - 0.5) * w * 0.7;
      const bnZ = (Math.random() - 0.5) * d * 0.7;
      bannerGroup.position.set(bnX, getTerrainHeight(bnX, bnZ), bnZ);
      this._envGroup.add(bannerGroup);
    }

    // Moonwell / enchanted pool (1)
    const moonwellGrp = new THREE.Group();
    const mwRim = new THREE.Mesh(new THREE.TorusGeometry(2, 0.3, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xccccdd, roughness: 0.4, metalness: 0.3 }));
    mwRim.rotation.x = -Math.PI / 2;
    mwRim.position.y = 0.2;
    moonwellGrp.add(mwRim);
    const mwWater = new THREE.Mesh(new THREE.CircleGeometry(1.8, 16),
      new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x2244aa, emissiveIntensity: 0.6, transparent: true, opacity: 0.7 }));
    mwWater.rotation.x = -Math.PI / 2;
    mwWater.position.y = 0.1;
    moonwellGrp.add(mwWater);
    const mwLight = new THREE.PointLight(0x4488ff, 2, 12);
    mwLight.position.y = 1;
    moonwellGrp.add(mwLight);
    this._torchLights.push(mwLight);
    // Rune symbols around the rim
    for (let r = 0; r < 8; r++) {
      const runeAng = (r / 8) * Math.PI * 2;
      const rune = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x4466cc, emissiveIntensity: 1.0 }));
      rune.position.set(Math.cos(runeAng) * 2.2, 0.35, Math.sin(runeAng) * 2.2);
      rune.lookAt(new THREE.Vector3(0, 0.35, 0));
      moonwellGrp.add(rune);
    }
    moonwellGrp.position.set(w * 0.15, getTerrainHeight(w * 0.15, -d * 0.15), -d * 0.15);
    this._envGroup.add(moonwellGrp);

    // Glowing vines on trees (10)
    const vineGlowMat = new THREE.MeshStandardMaterial({ color: 0x44dd88, emissive: 0x22aa44, emissiveIntensity: 0.5, roughness: 0.7 });
    for (let i = 0; i < 10; i++) {
      const vineGrp = new THREE.Group();
      const vineLen = 1.5 + Math.random() * 2;
      for (let v = 0; v < 6; v++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, vineLen / 6, 4), vineGlowMat);
        seg.position.y = 3 - v * (vineLen / 6);
        seg.position.x = Math.sin(v * 0.5) * 0.1;
        vineGrp.add(seg);
      }
      // Glowing bud at end
      const bud = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4),
        new THREE.MeshStandardMaterial({ color: 0x88ffbb, emissive: 0x44dd88, emissiveIntensity: 1.5 }));
      bud.position.y = 3 - vineLen;
      vineGrp.add(bud);
      vineGrp.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
      this._envGroup.add(vineGrp);
    }

    // Elven gazebo / pavilion (1)
    const gazGrp = new THREE.Group();
    const gazPillarMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4, metalness: 0.2 });
    for (let p = 0; p < 6; p++) {
      const gazAng = (p / 6) * Math.PI * 2;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3, 6), gazPillarMat);
      pillar.position.set(Math.cos(gazAng) * 2, 1.5, Math.sin(gazAng) * 2);
      pillar.castShadow = true;
      gazGrp.add(pillar);
    }
    const gazRoof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x4466aa, roughness: 0.5, transparent: true, opacity: 0.7 }));
    gazRoof.position.y = 3.75;
    gazGrp.add(gazRoof);
    const gazFloor = new THREE.Mesh(new THREE.CircleGeometry(2.2, 12),
      new THREE.MeshStandardMaterial({ color: 0xaabbcc, roughness: 0.5 }));
    gazFloor.rotation.x = -Math.PI / 2;
    gazFloor.position.y = 0.02;
    gazGrp.add(gazFloor);
    gazGrp.position.set(-w * 0.2, 0, d * 0.15);
    this._envGroup.add(gazGrp);

    // Butterflies / pixie lights (12)
    for (let i = 0; i < 12; i++) {
      const pixie = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 3),
        new THREE.MeshStandardMaterial({
          color: [0xffdd44, 0xff88dd, 0x44ddff, 0xaaffaa][i % 4],
          emissive: [0xaa8822, 0xaa4488, 0x2288aa, 0x55aa55][i % 4],
          emissiveIntensity: 1.2, transparent: true, opacity: 0.7,
        }));
      pixie.position.set(
        (Math.random() - 0.5) * w * 0.7,
        1 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.7
      );
      this._envGroup.add(pixie);
    }

    // Ancient tree roots above ground (8)
    const rootMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });
    for (let i = 0; i < 8; i++) {
      const rootGrp = new THREE.Group();
      const numRoots = 3 + Math.floor(Math.random() * 3);
      for (let r = 0; r < numRoots; r++) {
        const rootLen = 1 + Math.random() * 2;
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, rootLen, 5), rootMat);
        root.rotation.z = Math.PI / 2 - 0.3;
        root.rotation.y = (r / numRoots) * Math.PI * 2;
        root.position.y = 0.1;
        rootGrp.add(root);
      }
      rootGrp.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
      this._envGroup.add(rootGrp);
    }

    // Elvish wind chimes (4)
    for (let i = 0; i < 4; i++) {
      const chimeGrp = new THREE.Group();
      const chimeMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.6, roughness: 0.2 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.01, 4, 8), chimeMat);
      chimeGrp.add(ring);
      for (let c = 0; c < 5; c++) {
        const chime = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.15 + c * 0.03, 4), chimeMat);
        chime.position.set((c - 2) * 0.05, -0.12, 0);
        chimeGrp.add(chime);
      }
      chimeGrp.position.set(
        (Math.random() - 0.5) * w * 0.6,
        3 + Math.random() * 1.5,
        (Math.random() - 0.5) * d * 0.6
      );
      this._envGroup.add(chimeGrp);
    }
  }

  private _buildNecropolis(w: number, d: number): void {
    this._scene.fog = new THREE.FogExp2(0x110815, 0.03);
    this._applyTerrainColors(0x121218, 0x22222c, 0.4);
    this._dirLight.color.setHex(0x554466);
    this._dirLight.intensity = 0.3;
    this._ambientLight.color.setHex(0x110815);
    this._ambientLight.intensity = 0.3;
    this._hemiLight.color.setHex(0x221133);
    this._hemiLight.groundColor.setHex(0x110808);

    // Pillars (20)
    for (let i = 0; i < 20; i++) {
      const pilH = 4 + Math.random() * 3;
      const pilGeo = new THREE.CylinderGeometry(0.4, 0.5, pilH, 8);
      const pilMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.7, metalness: 0.1 });
      const pil = new THREE.Mesh(pilGeo, pilMat);
      pil.position.set(
        (Math.random() - 0.5) * w * 0.8,
        pilH / 2,
        (Math.random() - 0.5) * d * 0.8
      );
      pil.castShadow = true;
      this._envGroup.add(pil);
    }

    // Walls forming corridors (16 segments)
    for (let i = 0; i < 16; i++) {
      const wallH = 3 + Math.random() * 2;
      const wallW = 4 + Math.random() * 4;
      const wallGeo = new THREE.BoxGeometry(wallW, wallH, 0.5);
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.8 });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(
        (Math.random() - 0.5) * w * 0.7,
        wallH / 2,
        (Math.random() - 0.5) * d * 0.7
      );
      wall.rotation.y = Math.random() * Math.PI;
      wall.castShadow = true;
      this._envGroup.add(wall);
    }

    // Skull piles (12)
    for (let i = 0; i < 12; i++) {
      const pile = new THREE.Group();
      const skullCount = 3 + Math.floor(Math.random() * 5);
      for (let s = 0; s < skullCount; s++) {
        const skullGeo = new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 6, 5);
        const skullMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.8 });
        const skull = new THREE.Mesh(skullGeo, skullMat);
        skull.position.set(
          (Math.random() - 0.5) * 0.6,
          0.1 + Math.random() * 0.3,
          (Math.random() - 0.5) * 0.6
        );
        pile.add(skull);
      }
      const pileX = (Math.random() - 0.5) * w * 0.8;
      const pileZ = (Math.random() - 0.5) * d * 0.8;
      pile.position.set(pileX, getTerrainHeight(pileX, pileZ, 0.4), pileZ);
      this._envGroup.add(pile);
    }

    // Glowing rune circles (8)
    for (let i = 0; i < 8; i++) {
      const runeColor = Math.random() > 0.5 ? 0x44ff44 : 0x9944ff;
      const torusGeo = new THREE.TorusGeometry(1.0 + Math.random() * 0.5, 0.05, 8, 24);
      const torusMat = new THREE.MeshStandardMaterial({
        color: runeColor,
        emissive: runeColor,
        emissiveIntensity: 1.5,
      });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      torus.rotation.x = -Math.PI / 2;
      const torusX = (Math.random() - 0.5) * w * 0.7;
      const torusZ = (Math.random() - 0.5) * d * 0.7;
      torus.position.set(torusX, getTerrainHeight(torusX, torusZ, 0.4) + 0.05, torusZ);
      this._envGroup.add(torus);
    }

    // Bone piles (10)
    for (let i = 0; i < 10; i++) {
      const bonePile = new THREE.Group();
      for (let b = 0; b < 6; b++) {
        const boneGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5 + Math.random() * 0.3, 5);
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xddddbb, roughness: 0.9 });
        const bone = new THREE.Mesh(boneGeo, boneMat);
        bone.position.set(
          (Math.random() - 0.5) * 0.5,
          0.1,
          (Math.random() - 0.5) * 0.5
        );
        bone.rotation.z = Math.random() * Math.PI;
        bone.rotation.y = Math.random() * Math.PI;
        bonePile.add(bone);
      }
      const bpX = (Math.random() - 0.5) * w * 0.8;
      const bpZ = (Math.random() - 0.5) * d * 0.8;
      bonePile.position.set(bpX, getTerrainHeight(bpX, bpZ, 0.4), bpZ);
      this._envGroup.add(bonePile);
    }

    // Coffins (8)
    for (let i = 0; i < 8; i++) {
      const coffin = new THREE.Group();
      const baseGeo = new THREE.BoxGeometry(0.8, 0.4, 2.0);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
      const cBase = new THREE.Mesh(baseGeo, baseMat);
      cBase.position.y = 0.2;
      coffin.add(cBase);

      const lidGeo = new THREE.BoxGeometry(0.85, 0.1, 2.05);
      const lidMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.85 });
      const lid = new THREE.Mesh(lidGeo, lidMat);
      lid.position.y = 0.45;
      if (Math.random() > 0.5) {
        lid.rotation.z = 0.3;
        lid.position.x = 0.2;
      }
      coffin.add(lid);

      const cofX = (Math.random() - 0.5) * w * 0.7;
      const cofZ = (Math.random() - 0.5) * d * 0.7;
      coffin.position.set(cofX, getTerrainHeight(cofX, cofZ, 0.4), cofZ);
      coffin.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(coffin);
    }

    // Torch brackets with flickering point lights (10)
    for (let i = 0; i < 10; i++) {
      const torch = new THREE.Group();
      const bracketGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6);
      const bracketMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5 });
      const bracket = new THREE.Mesh(bracketGeo, bracketMat);
      bracket.position.y = 2.0;
      torch.add(bracket);

      const flameGeo = new THREE.SphereGeometry(0.12, 6, 5);
      const flameMat = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        emissive: 0xff4400,
        emissiveIntensity: 2.0,
      });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 2.35;
      torch.add(flame);

      const tLight = new THREE.PointLight(0xff6622, 1.2, 12);
      tLight.position.set(
        (Math.random() - 0.5) * w * 0.8,
        2.35,
        (Math.random() - 0.5) * d * 0.8
      );
      this._scene.add(tLight);
      this._torchLights.push(tLight);

      torch.position.set(tLight.position.x, getTerrainHeight(tLight.position.x, tLight.position.z, 0.4), tLight.position.z);
      this._envGroup.add(torch);
    }

    // Iron maidens (2)
    for (let i = 0; i < 2; i++) {
      const imGroup = new THREE.Group();
      const imBodyGeo = new THREE.BoxGeometry(0.8, 2.0, 0.6);
      const imMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.6, roughness: 0.4 });
      const imBody = new THREE.Mesh(imBodyGeo, imMat);
      imBody.position.y = 1.0;
      imGroup.add(imBody);
      const imDoorGeo = new THREE.BoxGeometry(0.7, 1.8, 0.05);
      const imDoor = new THREE.Mesh(imDoorGeo, imMat);
      imDoor.position.set(0.35, 1.0, 0.3);
      imDoor.rotation.y = 0.4;
      imGroup.add(imDoor);
      for (let sp = 0; sp < 5; sp++) {
        const spikeGeo = new THREE.ConeGeometry(0.03, 0.15, 4);
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x777788, metalness: 0.7, roughness: 0.3 });
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.set((Math.random() - 0.5) * 0.5, 0.5 + sp * 0.3, -0.25);
        spike.rotation.x = Math.PI / 2;
        imGroup.add(spike);
      }
      const imX = (Math.random() - 0.5) * w * 0.6;
      const imZ = (Math.random() - 0.5) * d * 0.6;
      imGroup.position.set(imX, getTerrainHeight(imX, imZ, 0.4), imZ);
      imGroup.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(imGroup);
    }

    // Chains hanging from ceiling (10)
    for (let i = 0; i < 10; i++) {
      const chainGroup = new THREE.Group();
      const chainLen = 2 + Math.random() * 3;
      const segments = 4 + Math.floor(Math.random() * 4);
      const segH = chainLen / segments;
      for (let s = 0; s < segments; s++) {
        const linkGeo = new THREE.CylinderGeometry(0.03, 0.03, segH * 0.7, 5);
        const linkMat = new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.6, roughness: 0.4 });
        const link = new THREE.Mesh(linkGeo, linkMat);
        link.position.y = 6 - s * segH;
        chainGroup.add(link);
      }
      const chX = (Math.random() - 0.5) * w * 0.7;
      const chZ = (Math.random() - 0.5) * d * 0.7;
      chainGroup.position.set(chX, getTerrainHeight(chX, chZ, 0.4), chZ);
      this._envGroup.add(chainGroup);
    }

    // Rat swarms (5)
    for (let i = 0; i < 5; i++) {
      const ratGroup = new THREE.Group();
      const ratCount = 3 + Math.floor(Math.random() * 2);
      for (let r = 0; r < ratCount; r++) {
        const ratGeo = new THREE.SphereGeometry(0.06, 6, 5);
        const ratMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
        const rat = new THREE.Mesh(ratGeo, ratMat);
        rat.scale.set(1, 0.6, 1.4);
        rat.position.set((Math.random() - 0.5) * 0.5, 0.04, (Math.random() - 0.5) * 0.5);
        ratGroup.add(rat);
      }
      const ratX = (Math.random() - 0.5) * w * 0.8;
      const ratZ = (Math.random() - 0.5) * d * 0.8;
      ratGroup.position.set(ratX, getTerrainHeight(ratX, ratZ, 0.4), ratZ);
      this._envGroup.add(ratGroup);
    }

    // Blood pools (6)
    for (let i = 0; i < 6; i++) {
      const bpRadius = 0.5 + Math.random();
      const bpGeo = new THREE.CircleGeometry(bpRadius, 12);
      const bpMat = new THREE.MeshStandardMaterial({ color: 0x880000, transparent: true, opacity: 0.3, roughness: 0.8 });
      const bp = new THREE.Mesh(bpGeo, bpMat);
      bp.rotation.x = -Math.PI / 2;
      const bpX2 = (Math.random() - 0.5) * w * 0.7;
      const bpZ2 = (Math.random() - 0.5) * d * 0.7;
      bp.position.set(bpX2, getTerrainHeight(bpX2, bpZ2, 0.4) + 0.02, bpZ2);
      this._envGroup.add(bp);
    }

    // Skeleton remains (8) - decorative
    for (let i = 0; i < 8; i++) {
      const skelGroup = new THREE.Group();
      const skullGeo = new THREE.SphereGeometry(0.1, 6, 5);
      const skelMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 });
      const sk = new THREE.Mesh(skullGeo, skelMat);
      sk.position.set(0, 0.1, 0);
      skelGroup.add(sk);
      for (let rb = 0; rb < 4; rb++) {
        const ribGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.3, 5);
        const rib = new THREE.Mesh(ribGeo, skelMat);
        rib.position.set(0.15, 0.04, -0.15 - rb * 0.08);
        rib.rotation.z = Math.PI / 2;
        skelGroup.add(rib);
      }
      for (let bn = 0; bn < 3; bn++) {
        const bnGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2 + Math.random() * 0.15, 5);
        const bnM = new THREE.Mesh(bnGeo, skelMat);
        bnM.position.set((Math.random() - 0.5) * 0.4, 0.03, (Math.random() - 0.5) * 0.4);
        bnM.rotation.z = Math.random() * Math.PI;
        skelGroup.add(bnM);
      }
      const skX = (Math.random() - 0.5) * w * 0.7;
      const skZ = (Math.random() - 0.5) * d * 0.7;
      skelGroup.position.set(skX, getTerrainHeight(skX, skZ, 0.4), skZ);
      this._envGroup.add(skelGroup);
    }

    // Cobweb curtains (6)
    for (let i = 0; i < 6; i++) {
      const cwGroup = new THREE.Group();
      for (let p = 0; p < 3; p++) {
        const cwGeo = new THREE.PlaneGeometry(2.0 + Math.random(), 2.5 + Math.random());
        const cwMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.08, roughness: 0.5, side: THREE.DoubleSide });
        const cw = new THREE.Mesh(cwGeo, cwMat);
        cw.position.set((Math.random() - 0.5) * 0.3, 3.0 + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.2);
        cw.rotation.y = (Math.random() - 0.5) * 0.3;
        cwGroup.add(cw);
      }
      const cwX = (Math.random() - 0.5) * w * 0.7;
      const cwZ = (Math.random() - 0.5) * d * 0.7;
      cwGroup.position.set(cwX, getTerrainHeight(cwX, cwZ, 0.4), cwZ);
      cwGroup.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(cwGroup);
    }

    // Braziers (4)
    for (let i = 0; i < 4; i++) {
      const brazierGroup = new THREE.Group();
      const pedGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.0, 8);
      const pedMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.5, roughness: 0.4 });
      const ped = new THREE.Mesh(pedGeo, pedMat);
      ped.position.y = 0.5;
      brazierGroup.add(ped);
      const bowlGeo = new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      const bowlMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide });
      const bowl = new THREE.Mesh(bowlGeo, bowlMat);
      bowl.rotation.x = Math.PI;
      bowl.position.y = 1.0;
      brazierGroup.add(bowl);
      const emberGeo = new THREE.SphereGeometry(0.15, 6, 5);
      const emberMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 2.0 });
      const ember = new THREE.Mesh(emberGeo, emberMat);
      ember.position.y = 1.1;
      brazierGroup.add(ember);
      const bx = (Math.random() - 0.5) * w * 0.7;
      const bz = (Math.random() - 0.5) * d * 0.7;
      brazierGroup.position.set(bx, getTerrainHeight(bx, bz, 0.4), bz);
      this._envGroup.add(brazierGroup);
      const bLight = new THREE.PointLight(0xff4422, 1.0, 10);
      bLight.position.set(bx, 1.2, bz);
      this._scene.add(bLight);
      this._torchLights.push(bLight);
    }

    // Sarcophagus with lid ajar (3)
    for (let i = 0; i < 3; i++) {
      const sarcGroup = new THREE.Group();
      const sarcBaseGeo = new THREE.BoxGeometry(1.0, 0.6, 2.2);
      const sarcMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.7, metalness: 0.1 });
      const sarcBase = new THREE.Mesh(sarcBaseGeo, sarcMat);
      sarcBase.position.y = 0.3;
      sarcGroup.add(sarcBase);
      const trimGeo = new THREE.BoxGeometry(1.05, 0.05, 2.25);
      const trimMat = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.6, metalness: 0.2 });
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.y = 0.62;
      sarcGroup.add(trim);
      const sarcLidGeo = new THREE.BoxGeometry(1.05, 0.12, 2.25);
      const sarcLid = new THREE.Mesh(sarcLidGeo, sarcMat);
      sarcLid.position.set(0.25, 0.68, 0.15);
      sarcLid.rotation.z = 0.15;
      sarcLid.rotation.y = 0.1;
      sarcGroup.add(sarcLid);
      const darkGeo = new THREE.BoxGeometry(0.8, 0.1, 2.0);
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1.0 });
      const darkInside = new THREE.Mesh(darkGeo, darkMat);
      darkInside.position.y = 0.55;
      sarcGroup.add(darkInside);
      const sarcX = (Math.random() - 0.5) * w * 0.6;
      const sarcZ = (Math.random() - 0.5) * d * 0.6;
      sarcGroup.position.set(sarcX, getTerrainHeight(sarcX, sarcZ, 0.4), sarcZ);
      sarcGroup.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(sarcGroup);
    }

    // Altar (1) - central
    const altarGroup = new THREE.Group();
    const altarGeo = new THREE.BoxGeometry(2.0, 1.0, 1.2);
    const altarMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.7, metalness: 0.1 });
    const altar = new THREE.Mesh(altarGeo, altarMat);
    altar.position.y = 0.5;
    altar.castShadow = true;
    altarGroup.add(altar);
    for (let c = 0; c < 4; c++) {
      const candleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 5);
      const candleMat = new THREE.MeshStandardMaterial({ color: 0xdddd88, roughness: 0.8 });
      const candle = new THREE.Mesh(candleGeo, candleMat);
      candle.position.set(-0.6 + c * 0.4, 1.1, 0);
      altarGroup.add(candle);
      const cfGeo = new THREE.SphereGeometry(0.03, 5, 4);
      const cfMat = new THREE.MeshStandardMaterial({ color: 0xffaa22, emissive: 0xff8800, emissiveIntensity: 2.0 });
      const cf = new THREE.Mesh(cfGeo, cfMat);
      cf.position.set(-0.6 + c * 0.4, 1.22, 0);
      altarGroup.add(cf);
    }
    const daggerGeo = new THREE.BoxGeometry(0.03, 0.01, 0.25);
    const daggerMat = new THREE.MeshStandardMaterial({ color: 0xaaaacc, metalness: 0.8, roughness: 0.1 });
    const dagger = new THREE.Mesh(daggerGeo, daggerMat);
    dagger.position.set(0, 1.02, 0.3);
    altarGroup.add(dagger);
    altarGroup.position.set(0, getTerrainHeight(0, 0, 0.4), 0);
    this._envGroup.add(altarGroup);

    // Crumbling archways (3)
    for (let i = 0; i < 3; i++) {
      const caGroup = new THREE.Group();
      for (let side = -1; side <= 1; side += 2) {
        const cPilGeo = new THREE.CylinderGeometry(0.25, 0.3, 3.5, 8);
        const cPilMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.8 });
        const cPil = new THREE.Mesh(cPilGeo, cPilMat);
        cPil.position.set(side * 1.5, 1.75, 0);
        cPil.castShadow = true;
        caGroup.add(cPil);
      }
      const caArchGeo = new THREE.TorusGeometry(1.5, 0.15, 8, 8, Math.PI * 0.6);
      const caArchMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.8 });
      const caArch = new THREE.Mesh(caArchGeo, caArchMat);
      caArch.position.y = 3.5;
      caArch.rotation.z = Math.PI * 0.7;
      caGroup.add(caArch);
      for (let rb = 0; rb < 4; rb++) {
        const rubGeo = new THREE.BoxGeometry(0.2 + Math.random() * 0.2, 0.15, 0.2 + Math.random() * 0.2);
        const rubMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.9 });
        const rub = new THREE.Mesh(rubGeo, rubMat);
        rub.position.set(1.5 + (Math.random() - 0.5) * 0.8, 0.08, (Math.random() - 0.5) * 0.5);
        rub.rotation.y = Math.random() * Math.PI;
        caGroup.add(rub);
      }
      const caX = (Math.random() - 0.5) * w * 0.6;
      const caZ = (Math.random() - 0.5) * d * 0.6;
      caGroup.position.set(caX, getTerrainHeight(caX, caZ, 0.4), caZ);
      caGroup.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(caGroup);
    }

    // Dungeon grate/drain (4)
    for (let i = 0; i < 4; i++) {
      const grateGroup = new THREE.Group();
      const holeGeo = new THREE.CircleGeometry(0.4, 10);
      const holeMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1.0 });
      const grateHole = new THREE.Mesh(holeGeo, holeMat);
      grateHole.rotation.x = -Math.PI / 2;
      grateHole.position.y = 0.01;
      grateGroup.add(grateHole);
      for (let b = 0; b < 4; b++) {
        const barGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 5);
        const barMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.5, roughness: 0.4 });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.rotation.x = Math.PI / 2;
        bar.position.set(-0.3 + b * 0.2, 0.02, 0);
        grateGroup.add(bar);
      }
      const grX = (Math.random() - 0.5) * w * 0.7;
      const grZ = (Math.random() - 0.5) * d * 0.7;
      grateGroup.position.set(grX, getTerrainHeight(grX, grZ, 0.4), grZ);
      this._envGroup.add(grateGroup);
    }

    // Poison gas vents (3)
    for (let i = 0; i < 3; i++) {
      const ventGroup = new THREE.Group();
      const ventGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 8);
      const ventMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
      const vent = new THREE.Mesh(ventGeo, ventMat);
      vent.position.y = 0.025;
      ventGroup.add(vent);
      const gasGeo = new THREE.SphereGeometry(0.4, 8, 6);
      const gasMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 0.5, transparent: true, opacity: 0.15 });
      const gas = new THREE.Mesh(gasGeo, gasMat);
      gas.position.y = 0.5;
      ventGroup.add(gas);
      const ventX = (Math.random() - 0.5) * w * 0.7;
      const ventZ = (Math.random() - 0.5) * d * 0.7;
      ventGroup.position.set(ventX, getTerrainHeight(ventX, ventZ, 0.4), ventZ);
      this._envGroup.add(ventGroup);
    }

    // Caged skeletons (2)
    for (let i = 0; i < 2; i++) {
      const cageGroup = new THREE.Group();
      const cBarMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.5, roughness: 0.4 });
      for (let side = 0; side < 8; side++) {
        const cBarGeo = new THREE.CylinderGeometry(0.02, 0.02, 2.0, 5);
        const cBar = new THREE.Mesh(cBarGeo, cBarMat);
        const cbAng = (side / 8) * Math.PI * 2;
        cBar.position.set(Math.cos(cbAng) * 0.5, 1.0, Math.sin(cbAng) * 0.5);
        cageGroup.add(cBar);
      }
      const cTopGeo = new THREE.CircleGeometry(0.5, 8);
      const cTop = new THREE.Mesh(cTopGeo, cBarMat);
      cTop.rotation.x = -Math.PI / 2;
      cTop.position.y = 2.0;
      cageGroup.add(cTop);
      for (let bn = 0; bn < 3; bn++) {
        const cBoneGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2 + Math.random() * 0.1, 5);
        const cBoneMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 });
        const cBone = new THREE.Mesh(cBoneGeo, cBoneMat);
        cBone.position.set((Math.random() - 0.5) * 0.3, 0.05, (Math.random() - 0.5) * 0.3);
        cBone.rotation.z = Math.random() * Math.PI;
        cageGroup.add(cBone);
      }
      const cgX = (Math.random() - 0.5) * w * 0.6;
      const cgZ = (Math.random() - 0.5) * d * 0.6;
      cageGroup.position.set(cgX, getTerrainHeight(cgX, cgZ, 0.4), cgZ);
      this._envGroup.add(cageGroup);
    }

    // Additional wall-mounted torches at varying heights (6)
    for (let i = 0; i < 6; i++) {
      const wtGroup = new THREE.Group();
      const wtBracketGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5);
      const isExtinguished = i < 2;
      const wtBracketMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.5 });
      const wtBracket = new THREE.Mesh(wtBracketGeo, wtBracketMat);
      const wallY = 1.5 + Math.random() * 2.5;
      wtBracket.position.y = wallY;
      wtBracket.rotation.z = Math.PI / 4;
      wtGroup.add(wtBracket);
      if (!isExtinguished) {
        const wtFlameGeo = new THREE.SphereGeometry(0.08, 5, 4);
        const wtFlameMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2.0 });
        const wtFlame = new THREE.Mesh(wtFlameGeo, wtFlameMat);
        wtFlame.position.y = wallY + 0.25;
        wtGroup.add(wtFlame);
        const wtx = (Math.random() - 0.5) * w * 0.8;
        const wtz = (Math.random() - 0.5) * d * 0.8;
        wtGroup.position.set(wtx, getTerrainHeight(wtx, wtz, 0.4), wtz);
        const wtLight = new THREE.PointLight(0xff6622, 0.8, 8);
        wtLight.position.set(wtx, wallY + 0.25, wtz);
        this._scene.add(wtLight);
        this._torchLights.push(wtLight);
      } else {
        const wtCharGeo = new THREE.SphereGeometry(0.06, 5, 4);
        const wtCharMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1.0 });
        const wtChar = new THREE.Mesh(wtCharGeo, wtCharMat);
        wtChar.position.y = wallY + 0.2;
        wtGroup.add(wtChar);
        const wtx2 = (Math.random() - 0.5) * w * 0.8;
        const wtz2 = (Math.random() - 0.5) * d * 0.8;
        wtGroup.position.set(wtx2, getTerrainHeight(wtx2, wtz2, 0.4), wtz2);
      }
      this._envGroup.add(wtGroup);
    }

    // Ghostly wisp trails (8)
    const wispGhostMat = new THREE.MeshStandardMaterial({
      color: 0x88aaff, emissive: 0x4466cc, emissiveIntensity: 1.0,
      transparent: true, opacity: 0.2,
    });
    for (let i = 0; i < 8; i++) {
      const wispGrp = new THREE.Group();
      for (let s = 0; s < 5; s++) {
        const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.06 - s * 0.008, 5, 4), wispGhostMat);
        wisp.position.set(s * 0.3, 1.5 + Math.sin(s) * 0.3, s * 0.1);
        wispGrp.add(wisp);
      }
      const wiX = (Math.random() - 0.5) * w * 0.7;
      const wiZ = (Math.random() - 0.5) * d * 0.7;
      wispGrp.position.set(wiX, getTerrainHeight(wiX, wiZ, 0.4), wiZ);
      wispGrp.rotation.y = Math.random() * Math.PI * 2;
      this._envGroup.add(wispGrp);
    }

    // Broken statues (4)
    const brokenStatMat = new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.7 });
    for (let i = 0; i < 4; i++) {
      const statGrp = new THREE.Group();
      // Pedestal
      const ped = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), brokenStatMat);
      ped.position.y = 0.3;
      statGrp.add(ped);
      // Broken torso
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.8, 6), brokenStatMat);
      torso.position.y = 1.0;
      statGrp.add(torso);
      // One arm
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.5, 5), brokenStatMat);
      arm.position.set(0.25, 1.1, 0);
      arm.rotation.z = -0.6;
      statGrp.add(arm);
      // Rubble around base
      for (let r = 0; r < 4; r++) {
        const rub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.08, 0), brokenStatMat);
        rub.position.set((Math.random() - 0.5) * 0.8, 0.05, (Math.random() - 0.5) * 0.8);
        statGrp.add(rub);
      }
      statGrp.position.set((Math.random() - 0.5) * w * 0.6, 0, (Math.random() - 0.5) * d * 0.6);
      this._envGroup.add(statGrp);
    }

    // Crypt entrances (3)
    for (let i = 0; i < 3; i++) {
      const cryptGrp = new THREE.Group();
      const cryptMat = new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.8 });
      // Frame
      for (const side of [-1, 1]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2, 0.3), cryptMat);
        pillar.position.set(side * 0.7, 1, 0);
        pillar.castShadow = true;
        cryptGrp.add(pillar);
      }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 0.35), cryptMat);
      lintel.position.y = 2.1;
      cryptGrp.add(lintel);
      // Dark entrance
      const entrance = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2),
        new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 1.0 }));
      entrance.position.set(0, 1, -0.1);
      cryptGrp.add(entrance);
      // Skull above entrance
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5),
        new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.7 }));
      skull.position.set(0, 2.35, 0.1);
      skull.scale.set(1, 0.8, 0.8);
      cryptGrp.add(skull);
      cryptGrp.position.set((Math.random() - 0.5) * w * 0.6, 0, (Math.random() - 0.5) * d * 0.6);
      cryptGrp.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(cryptGrp);
    }

    // Ethereal mist layers (5)
    for (let i = 0; i < 5; i++) {
      const mist = new THREE.Mesh(
        new THREE.PlaneGeometry(6 + Math.random() * 8, 6 + Math.random() * 8),
        new THREE.MeshStandardMaterial({ color: 0x334455, transparent: true, opacity: 0.06, roughness: 1.0, side: THREE.DoubleSide })
      );
      mist.rotation.x = -Math.PI / 2;
      mist.position.set((Math.random() - 0.5) * w * 0.8, 0.2 + Math.random() * 0.4, (Math.random() - 0.5) * d * 0.8);
      this._envGroup.add(mist);
    }

    // Cursed tombstones (12)
    const tombMat = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.8 });
    for (let i = 0; i < 12; i++) {
      const tombGrp = new THREE.Group();
      const tombH = 0.5 + Math.random() * 0.5;
      const tombstone = new THREE.Mesh(new THREE.BoxGeometry(0.4, tombH, 0.1), tombMat);
      tombstone.position.y = tombH / 2;
      tombstone.rotation.z = (Math.random() - 0.5) * 0.2;
      tombGrp.add(tombstone);
      // Rounded top
      const topRound = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), tombMat);
      topRound.position.y = tombH;
      topRound.scale.x = 1;
      tombGrp.add(topRound);
      tombGrp.position.set((Math.random() - 0.5) * w * 0.75, 0, (Math.random() - 0.5) * d * 0.75);
      tombGrp.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(tombGrp);
    }

    // Pentagram on ground (1)
    const pentaMat = new THREE.MeshStandardMaterial({
      color: 0xcc2222, emissive: 0x881111, emissiveIntensity: 0.5,
      transparent: true, opacity: 0.3, side: THREE.DoubleSide,
    });
    const pentaRing = new THREE.Mesh(new THREE.RingGeometry(2.5, 2.7, 5), pentaMat);
    pentaRing.rotation.x = -Math.PI / 2;
    pentaRing.position.set(w * 0.2, 0.03, d * 0.2);
    this._envGroup.add(pentaRing);
    const pentaInner = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.0, 5), pentaMat);
    pentaInner.rotation.x = -Math.PI / 2;
    pentaInner.rotation.z = Math.PI / 5;
    pentaInner.position.set(w * 0.2, 0.04, d * 0.2);
    this._envGroup.add(pentaInner);
  }

  private _buildCamelot(w: number, d: number): void {
    // ── Lighting / Atmosphere ──
    this._scene.fog = new THREE.FogExp2(0x8899aa, 0.008);
    this._applyTerrainColors(0x887766, 0xaa9988, 0.8);
    this._dirLight.color.setHex(0xffeedd);
    this._dirLight.intensity = 1.3;
    this._ambientLight.color.setHex(0x556677);
    this._ambientLight.intensity = 0.6;
    this._hemiLight.color.setHex(0x99bbdd);
    this._hemiLight.groundColor.setHex(0x665544);

    const hw = w / 2;
    const hd = d / 2;

    // ── Paved Market Square with cobblestone tiles (center, 30x30) ──
    const pavedGeo = new THREE.BoxGeometry(30, 0.04, 30);
    const pavedMat = new THREE.MeshStandardMaterial({ color: 0xbbaa99, roughness: 0.85 });
    const paved = new THREE.Mesh(pavedGeo, pavedMat);
    paved.position.set(0, 0.02, 0);
    paved.receiveShadow = true;
    this._envGroup.add(paved);

    // Cobblestone tile grid on market square
    const tileColors = [0xaa9988, 0xbbaa99, 0xccbbaa, 0x998877, 0xb0a090, 0xc4b4a4];
    const tileSize = 1.2;
    const tileGeo = new THREE.BoxGeometry(tileSize - 0.06, 0.03, tileSize - 0.06);
    for (let tx = -14; tx <= 14; tx += tileSize) {
      for (let tz = -14; tz <= 14; tz += tileSize) {
        const tileMat = new THREE.MeshStandardMaterial({
          color: tileColors[Math.floor(Math.random() * tileColors.length)],
          roughness: 0.8 + Math.random() * 0.15,
        });
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.position.set(tx, 0.055, tz);
        tile.receiveShadow = true;
        this._envGroup.add(tile);
      }
    }

    // Decorative stone border around market square
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.9 });
    for (let bi = -15; bi <= 15; bi += 1.5) {
      const borderGeo = new THREE.BoxGeometry(1.4, 0.08, 0.3);
      const bN = new THREE.Mesh(borderGeo, borderMat);
      bN.position.set(bi, 0.06, -15);
      bN.receiveShadow = true;
      this._envGroup.add(bN);
      const bS = new THREE.Mesh(borderGeo, borderMat);
      bS.position.set(bi, 0.06, 15);
      bS.receiveShadow = true;
      this._envGroup.add(bS);
    }
    for (let bi = -15; bi <= 15; bi += 1.5) {
      const borderGeo = new THREE.BoxGeometry(0.3, 0.08, 1.4);
      const bE = new THREE.Mesh(borderGeo, borderMat);
      bE.position.set(15, 0.06, bi);
      bE.receiveShadow = true;
      this._envGroup.add(bE);
      const bW = new THREE.Mesh(borderGeo, borderMat);
      bW.position.set(-15, 0.06, bi);
      bW.receiveShadow = true;
      this._envGroup.add(bW);
    }

    // ── City-wide floor tiles (outside market square) ──
    const cityTileGeo = new THREE.BoxGeometry(2.4, 0.03, 2.4);
    const cityTileColors = [0x887766, 0x998877, 0x7a6a5a, 0x8a7a6a, 0x907e6e];
    for (let ctx = -hw + 2; ctx < hw; ctx += 2.5) {
      for (let ctz = -hd + 2; ctz < hd; ctz += 2.5) {
        if (Math.abs(ctx) < 16 && Math.abs(ctz) < 16) continue; // skip market square area
        const ctMat = new THREE.MeshStandardMaterial({
          color: cityTileColors[Math.floor(Math.random() * cityTileColors.length)],
          roughness: 0.85 + Math.random() * 0.1,
        });
        const ct = new THREE.Mesh(cityTileGeo, ctMat);
        ct.position.set(ctx + (Math.random() - 0.5) * 0.1, 0.025, ctz + (Math.random() - 0.5) * 0.1);
        ct.receiveShadow = true;
        this._envGroup.add(ct);
      }
    }

    // ── Main road from south gate to castle (stone slabs) ──
    for (let i = 0; i < 12; i++) {
      const roadGeo = new THREE.BoxGeometry(5, 0.05, 4);
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.position.set(0, 0.035, -30 + 15 + i * 4);
      road.receiveShadow = true;
      this._envGroup.add(road);
      // Road detail - individual stone slabs
      for (let rs = -2; rs <= 2; rs += 1.3) {
        for (let rd = -1.5; rd <= 1.5; rd += 1.3) {
          const slabGeo = new THREE.BoxGeometry(1.2, 0.02, 1.2);
          const slabMat = new THREE.MeshStandardMaterial({
            color: 0x887766 + Math.floor(Math.random() * 0x111111),
            roughness: 0.85,
          });
          const slab = new THREE.Mesh(slabGeo, slabMat);
          slab.position.set(rs, 0.065, -30 + 15 + i * 4 + rd);
          slab.receiveShadow = true;
          this._envGroup.add(slab);
        }
      }
    }

    // Side streets with cobblestones
    for (let i = 0; i < 8; i++) {
      const sideGeo = new THREE.BoxGeometry(3, 0.05, 3);
      const sideMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 });
      const sideRoad = new THREE.Mesh(sideGeo, sideMat);
      const sx = (i < 4 ? -1 : 1) * (5 + (i % 4) * 3);
      sideRoad.position.set(sx, 0.035, (i % 4) * 4 - 6);
      sideRoad.receiveShadow = true;
      this._envGroup.add(sideRoad);
    }

    // ═══════════════════════════════════════════════
    // CASTLE / KEEP (center-back, z=-30)
    // ═══════════════════════════════════════════════
    const castleGroup = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8, metalness: 0.05 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.85 });

    // Main keep
    const keepGeo = new THREE.BoxGeometry(12, 15, 10);
    const keep = new THREE.Mesh(keepGeo, stoneMat);
    keep.position.set(0, 7.5, 0);
    keep.castShadow = true;
    keep.receiveShadow = true;
    castleGroup.add(keep);

    // 4 corner towers
    const towerPositions = [
      [-6, 5], [6, 5], [-6, -5], [6, -5]
    ];
    for (const [tx, tz] of towerPositions) {
      const towerGeo = new THREE.CylinderGeometry(2, 2, 18, 12);
      const tower = new THREE.Mesh(towerGeo, stoneMat);
      tower.position.set(tx, 9, tz);
      tower.castShadow = true;
      castleGroup.add(tower);

      // Cone roof
      const roofGeo = new THREE.ConeGeometry(2.5, 4, 12);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.6 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(tx, 20, tz);
      roof.castShadow = true;
      castleGroup.add(roof);

      // Royal banner on each tower
      const bannerGeo = new THREE.PlaneGeometry(0.6, 2.5);
      const bannerMat = new THREE.MeshStandardMaterial({
        color: 0xcc2222, roughness: 0.7, side: THREE.DoubleSide,
        emissive: 0x220000, emissiveIntensity: 0.1
      });
      const banner = new THREE.Mesh(bannerGeo, bannerMat);
      banner.position.set(tx + 0.3, 17, tz);
      castleGroup.add(banner);

      // Gold trim on banner
      const goldTrimGeo = new THREE.PlaneGeometry(0.6, 0.15);
      const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xddaa22, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide });
      const goldTrim = new THREE.Mesh(goldTrimGeo, goldTrimMat);
      goldTrim.position.set(tx + 0.3, 16, tz);
      castleGroup.add(goldTrim);
    }

    // Crenellations on top of keep
    for (let ci = 0; ci < 12; ci++) {
      const crenGeo = new THREE.BoxGeometry(1, 1.5, 0.5);
      const cren = new THREE.Mesh(crenGeo, stoneMat);
      const cx = -5.5 + ci * 1;
      cren.position.set(cx, 15.75, 5.25);
      castleGroup.add(cren);
      const cren2 = cren.clone();
      cren2.position.set(cx, 15.75, -5.25);
      castleGroup.add(cren2);
    }
    for (let ci = 0; ci < 10; ci++) {
      const crenGeo = new THREE.BoxGeometry(0.5, 1.5, 1);
      const cren = new THREE.Mesh(crenGeo, stoneMat);
      cren.position.set(6.25, 15.75, -4.5 + ci * 1);
      castleGroup.add(cren);
      const cren2 = cren.clone();
      cren2.position.set(-6.25, 15.75, -4.5 + ci * 1);
      castleGroup.add(cren2);
    }

    // Castle gate (archway)
    const gateGeo = new THREE.BoxGeometry(4, 6, 1.5);
    const gate = new THREE.Mesh(gateGeo, darkStoneMat);
    gate.position.set(0, 3, 5.75);
    castleGroup.add(gate);

    // Portcullis bars
    for (let pb = 0; pb < 7; pb++) {
      const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 5.5, 6);
      const barMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(-1.5 + pb * 0.5, 3, 6.5);
      castleGroup.add(bar);
    }
    // Horizontal portcullis bars
    for (let hb = 0; hb < 5; hb++) {
      const hBarGeo = new THREE.CylinderGeometry(0.03, 0.03, 3.5, 6);
      const hBarMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 });
      const hBar = new THREE.Mesh(hBarGeo, hBarMat);
      hBar.rotation.z = Math.PI / 2;
      hBar.position.set(0, 1 + hb * 1.2, 6.5);
      castleGroup.add(hBar);
    }

    castleGroup.position.set(0, 0, -30);
    this._envGroup.add(castleGroup);

    // ═══════════════════════════════════════════════
    // TOWN WALLS
    // ═══════════════════════════════════════════════
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });

    // North wall
    const nWallGeo = new THREE.BoxGeometry(w, 4, 1);
    const nWall = new THREE.Mesh(nWallGeo, wallMat);
    nWall.position.set(0, 2, -hd);
    nWall.castShadow = true;
    this._envGroup.add(nWall);
    // South wall (split for gatehouse gap)
    const sWallLeftGeo = new THREE.BoxGeometry(hw - 3, 4, 1);
    const sWallLeft = new THREE.Mesh(sWallLeftGeo, wallMat);
    sWallLeft.position.set(-(hw - 3) / 2 - 3, 2, hd);
    sWallLeft.castShadow = true;
    this._envGroup.add(sWallLeft);
    const sWallRight = new THREE.Mesh(sWallLeftGeo, wallMat);
    sWallRight.position.set((hw - 3) / 2 + 3, 2, hd);
    sWallRight.castShadow = true;
    this._envGroup.add(sWallRight);
    // East wall
    const eWallGeo = new THREE.BoxGeometry(1, 4, d);
    const eWall = new THREE.Mesh(eWallGeo, wallMat);
    eWall.position.set(hw, 2, 0);
    eWall.castShadow = true;
    this._envGroup.add(eWall);
    // West wall
    const wWall = new THREE.Mesh(eWallGeo, wallMat);
    wWall.position.set(-hw, 2, 0);
    wWall.castShadow = true;
    this._envGroup.add(wWall);

    // Wall corner towers (4)
    const wallTowerPositions = [
      [-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]
    ];
    for (const [wtx, wtz] of wallTowerPositions) {
      const wtGeo = new THREE.CylinderGeometry(1.5, 1.5, 6, 10);
      const wt = new THREE.Mesh(wtGeo, wallMat);
      wt.position.set(wtx, 3, wtz);
      wt.castShadow = true;
      this._envGroup.add(wt);
      const wtRoofGeo = new THREE.ConeGeometry(1.8, 2, 10);
      const wtRoofMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.6 });
      const wtRoof = new THREE.Mesh(wtRoofGeo, wtRoofMat);
      wtRoof.position.set(wtx, 7, wtz);
      this._envGroup.add(wtRoof);
    }

    // Gatehouse towers (south side)
    for (const gSide of [-3, 3]) {
      const ghTowerGeo = new THREE.CylinderGeometry(1.5, 1.5, 7, 10);
      const ghTower = new THREE.Mesh(ghTowerGeo, wallMat);
      ghTower.position.set(gSide, 3.5, hd);
      ghTower.castShadow = true;
      this._envGroup.add(ghTower);
      const ghRoofGeo = new THREE.ConeGeometry(1.8, 2.5, 10);
      const ghRoofMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.6 });
      const ghRoof = new THREE.Mesh(ghRoofGeo, ghRoofMat);
      ghRoof.position.set(gSide, 8, hd);
      this._envGroup.add(ghRoof);
    }

    // ═══════════════════════════════════════════════
    // MARKET SQUARE (center area, around 0,0)
    // ═══════════════════════════════════════════════

    // Market stalls (10)
    const stallColors = [0xcc3333, 0x3344cc, 0xcccc33, 0x33aa33, 0xcc6633, 0x8833aa, 0x33aaaa, 0xaa3366, 0x66aa33, 0xcc8833];
    for (let si = 0; si < 10; si++) {
      const stallGroup = new THREE.Group();
      const angle = (si / 10) * Math.PI * 2;
      const radius = 8 + (si % 2) * 2;

      // 4 poles
      for (let px = -1; px <= 1; px += 2) {
        for (let pz = -1; pz <= 1; pz += 2) {
          const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6);
          const poleMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
          const pole = new THREE.Mesh(poleGeo, poleMat);
          pole.position.set(px * 0.8, 1.25, pz * 0.6);
          pole.castShadow = true;
          stallGroup.add(pole);
        }
      }

      // Canvas roof
      const canvasGeo = new THREE.BoxGeometry(2.0, 0.08, 1.5);
      const canvasMat = new THREE.MeshStandardMaterial({ color: stallColors[si], roughness: 0.7 });
      const canvas = new THREE.Mesh(canvasGeo, canvasMat);
      canvas.position.set(0, 2.5, 0);
      canvas.castShadow = true;
      stallGroup.add(canvas);

      // Counter
      const counterGeo = new THREE.BoxGeometry(1.6, 0.8, 0.5);
      const counterMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
      const counter = new THREE.Mesh(counterGeo, counterMat);
      counter.position.set(0, 0.4, 0.5);
      counter.castShadow = true;
      stallGroup.add(counter);

      // Wares on counter (small colorful boxes)
      for (let ww = 0; ww < 3; ww++) {
        const wareGeo = new THREE.BoxGeometry(0.2, 0.15, 0.15);
        const wareMat = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff, roughness: 0.6 });
        const ware = new THREE.Mesh(wareGeo, wareMat);
        ware.position.set(-0.4 + ww * 0.4, 0.88, 0.5);
        stallGroup.add(ware);
      }

      stallGroup.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      stallGroup.rotation.y = -angle + Math.PI;
      this._envGroup.add(stallGroup);
    }

    // Central well
    const wellGroup = new THREE.Group();
    const wellBaseGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.8, 16);
    const wellBaseMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.85 });
    const wellBase = new THREE.Mesh(wellBaseGeo, wellBaseMat);
    wellBase.position.y = 0.4;
    wellBase.castShadow = true;
    wellGroup.add(wellBase);
    // Inner dark water
    const wellWaterGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 16);
    const wellWaterMat = new THREE.MeshStandardMaterial({ color: 0x224466, roughness: 0.3, transparent: true, opacity: 0.7 });
    const wellWater = new THREE.Mesh(wellWaterGeo, wellWaterMat);
    wellWater.position.y = 0.75;
    wellGroup.add(wellWater);
    // Two upright posts
    for (const sx of [-0.6, 0.6]) {
      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(sx, 1.65, 0);
      post.castShadow = true;
      wellGroup.add(post);
    }
    // Cross beam
    const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0, 2.9, 0);
    wellGroup.add(beam);
    // Bucket
    const bucketGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.15, 8);
    const bucketMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.7 });
    const bucket = new THREE.Mesh(bucketGeo, bucketMat);
    bucket.position.set(0, 2.2, 0);
    wellGroup.add(bucket);
    // Rope
    const ropeGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.7, 4);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xaa9966, roughness: 0.9 });
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.position.set(0, 2.55, 0);
    wellGroup.add(rope);
    wellGroup.position.set(0, 0, 0);
    this._envGroup.add(wellGroup);

    // ═══════════════════════════════════════════════
    // BUILDINGS (25 scattered)
    // ═══════════════════════════════════════════════
    const buildingPositions: [number, number, number, number][] = [
      // [x, z, width, depth]
      [-18, -5, 3, 3], [-18, 0, 2.5, 3], [-18, 5, 3, 4], [-18, 10, 2, 3],
      [18, -5, 3, 3], [18, 0, 4, 3], [18, 5, 2.5, 2.5], [18, 10, 3, 3],
      [-12, 15, 3, 3], [-8, 15, 2.5, 3], [-4, 15, 3, 2], [4, 15, 2.5, 3],
      [8, 15, 3, 3], [12, 15, 3, 2.5],
      [-12, -18, 3, 3], [-8, -18, 2.5, 2], [-4, -18, 3, 3],
      [4, -18, 2.5, 3], [8, -18, 3, 3], [12, -18, 3, 2.5],
      [-12, -12, 2, 2], [12, -12, 2.5, 2.5],
      [-12, 8, 3, 3], [12, 8, 2.5, 2.5], [0, 18, 3, 2],
    ];

    const houseColors = [0x998866, 0xaa9977, 0x887755, 0xbb9977, 0x776655, 0x9a8a6a];
    const roofColors = [0x664422, 0x553311, 0x774433, 0x334466, 0x553322, 0x884433];

    for (let bi = 0; bi < buildingPositions.length; bi++) {
      const [bx, bz, bw, bd] = buildingPositions[bi];
      const bh = 3 + Math.random() * 2;
      const buildGroup = new THREE.Group();

      // Base walls
      const baseGeo = new THREE.BoxGeometry(bw, bh, bd);
      const baseMat = new THREE.MeshStandardMaterial({ color: houseColors[bi % houseColors.length], roughness: 0.85 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = bh / 2;
      base.castShadow = true;
      base.receiveShadow = true;
      buildGroup.add(base);

      // Peaked roof (two angled planes) - aligned to walls
      const roofColor = roofColors[bi % roofColors.length];
      const roofW = bw + 0.4;
      const roofD = bd + 0.4;
      const roofH = 1.5 + Math.random() * 0.5;
      const slopeLen = Math.sqrt(roofD * roofD / 4 + roofH * roofH);
      const roofAngle = Math.atan2(roofD / 2, roofH);
      const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7, side: THREE.DoubleSide });
      const roofLeft = new THREE.Mesh(new THREE.PlaneGeometry(roofW, slopeLen), roofMat);
      roofLeft.position.set(0, bh + roofH / 2, -roofD / 4);
      roofLeft.rotation.x = roofAngle;
      buildGroup.add(roofLeft);
      const roofRight = new THREE.Mesh(new THREE.PlaneGeometry(roofW, slopeLen), roofMat);
      roofRight.position.set(0, bh + roofH / 2, roofD / 4);
      roofRight.rotation.x = -roofAngle;
      buildGroup.add(roofRight);
      // Gable triangles (fill the ends of the roof)
      const gableShape = new THREE.Shape();
      gableShape.moveTo(-roofD / 2, 0);
      gableShape.lineTo(0, roofH);
      gableShape.lineTo(roofD / 2, 0);
      gableShape.closePath();
      const gableGeo = new THREE.ShapeGeometry(gableShape);
      const gableMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7, side: THREE.DoubleSide });
      const gableLeft = new THREE.Mesh(gableGeo, gableMat);
      gableLeft.rotation.y = Math.PI / 2;
      gableLeft.position.set(-roofW / 2, bh, 0);
      buildGroup.add(gableLeft);
      const gableRight = new THREE.Mesh(gableGeo, gableMat);
      gableRight.rotation.y = Math.PI / 2;
      gableRight.position.set(roofW / 2, bh, 0);
      buildGroup.add(gableRight);

      // Windows (emissive warm yellow)
      const windowMat = new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffdd88, emissiveIntensity: 0.5, roughness: 0.3 });
      for (let wi = 0; wi < 2; wi++) {
        const winGeo = new THREE.BoxGeometry(0.35, 0.4, 0.05);
        const win = new THREE.Mesh(winGeo, windowMat);
        win.position.set(-bw * 0.2 + wi * bw * 0.4, bh * 0.6, bd / 2 + 0.03);
        buildGroup.add(win);
        // Back side windows
        const winBack = new THREE.Mesh(winGeo, windowMat);
        winBack.position.set(-bw * 0.2 + wi * bw * 0.4, bh * 0.6, -bd / 2 - 0.03);
        buildGroup.add(winBack);
      }

      // Door
      const doorGeo = new THREE.BoxGeometry(0.6, 1.2, 0.06);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(0, 0.6, bd / 2 + 0.03);
      buildGroup.add(door);

      // Chimney (every other building)
      if (bi % 2 === 0) {
        const chimGeo = new THREE.CylinderGeometry(0.15, 0.18, 1.5, 6);
        const chimMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 });
        const chim = new THREE.Mesh(chimGeo, chimMat);
        chim.position.set(bw * 0.25, bh + 1.0, -bd * 0.2);
        chim.castShadow = true;
        buildGroup.add(chim);
        // Smoke puff
        const smokeGeo = new THREE.SphereGeometry(0.2, 6, 5);
        const smokeMat = new THREE.MeshStandardMaterial({ color: 0x888888, transparent: true, opacity: 0.25, roughness: 1.0 });
        const smoke = new THREE.Mesh(smokeGeo, smokeMat);
        smoke.position.set(bw * 0.25, bh + 1.9, -bd * 0.2);
        buildGroup.add(smoke);
      }

      buildGroup.position.set(bx, 0, bz);
      this._envGroup.add(buildGroup);
    }

    // ── Tavern (larger, near center, x=6, z=5) ──
    const tavernGroup = new THREE.Group();
    const tavernGeo = new THREE.BoxGeometry(5, 5, 4);
    const tavernMat = new THREE.MeshStandardMaterial({ color: 0xaa7744, roughness: 0.75 });
    const tavern = new THREE.Mesh(tavernGeo, tavernMat);
    tavern.position.y = 2.5;
    tavern.castShadow = true;
    tavernGroup.add(tavern);
    // Tavern roof
    const tavernRoofGeo = new THREE.BoxGeometry(5.6, 0.3, 4.6);
    const tavernRoofMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 });
    const tavernRoof = new THREE.Mesh(tavernRoofGeo, tavernRoofMat);
    tavernRoof.position.y = 5.15;
    tavernRoof.rotation.x = 0.1;
    tavernGroup.add(tavernRoof);
    // Hanging sign bracket
    const bracketGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 5);
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.3 });
    const bracket = new THREE.Mesh(bracketGeo, bracketMat);
    bracket.rotation.z = Math.PI / 2;
    bracket.position.set(2.8, 4, 2);
    tavernGroup.add(bracket);
    const signGeo = new THREE.BoxGeometry(0.6, 0.4, 0.04);
    const signMat = new THREE.MeshStandardMaterial({ color: 0xddaa44, roughness: 0.6 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(3.2, 3.6, 2);
    tavernGroup.add(sign);
    // Tavern windows emissive
    const tavernWinMat = new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa44, emissiveIntensity: 0.6, roughness: 0.3 });
    for (let twi = 0; twi < 3; twi++) {
      const twGeo = new THREE.BoxGeometry(0.5, 0.5, 0.05);
      const tw = new THREE.Mesh(twGeo, tavernWinMat);
      tw.position.set(-1.5 + twi * 1.5, 3, 2.03);
      tavernGroup.add(tw);
    }
    // Tavern door
    const tavernDoorGeo = new THREE.BoxGeometry(0.8, 1.5, 0.06);
    const tavernDoorMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 });
    const tavernDoor = new THREE.Mesh(tavernDoorGeo, tavernDoorMat);
    tavernDoor.position.set(0, 0.75, 2.03);
    tavernGroup.add(tavernDoor);
    // Warm interior glow
    const tavernLight = new THREE.PointLight(0xffaa44, 0.8, 12);
    tavernLight.position.set(6, 2, 5);
    this._scene.add(tavernLight);
    this._torchLights.push(tavernLight);
    tavernGroup.position.set(6, 0, 5);
    this._envGroup.add(tavernGroup);

    // ── Chapel (near castle, x=-6, z=-20) ──
    const chapelGroup = new THREE.Group();
    const chapelGeo = new THREE.BoxGeometry(4, 6, 5);
    const chapelMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.75 });
    const chapel = new THREE.Mesh(chapelGeo, chapelMat);
    chapel.position.y = 3;
    chapel.castShadow = true;
    chapelGroup.add(chapel);
    // Pointed roof
    const chapelRoofGeo = new THREE.ConeGeometry(3.5, 3, 4);
    const chapelRoofMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.6 });
    const chapelRoof = new THREE.Mesh(chapelRoofGeo, chapelRoofMat);
    chapelRoof.position.y = 7.5;
    chapelRoof.rotation.y = Math.PI / 4;
    chapelRoof.castShadow = true;
    chapelGroup.add(chapelRoof);
    // Cross on top (thin cylinders forming +)
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xddaa22, metalness: 0.6, roughness: 0.3 });
    const crossVGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6);
    const crossV = new THREE.Mesh(crossVGeo, crossMat);
    crossV.position.set(0, 9.75, 0);
    chapelGroup.add(crossV);
    const crossHGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
    const crossH = new THREE.Mesh(crossHGeo, crossMat);
    crossH.rotation.z = Math.PI / 2;
    crossH.position.set(0, 10.2, 0);
    chapelGroup.add(crossH);
    // Stained glass window
    const sgWinGeo = new THREE.BoxGeometry(1.2, 2.0, 0.06);
    const sgWinMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x2244aa, emissiveIntensity: 0.4, roughness: 0.3, transparent: true, opacity: 0.8 });
    const sgWin = new THREE.Mesh(sgWinGeo, sgWinMat);
    sgWin.position.set(0, 4, 2.53);
    chapelGroup.add(sgWin);
    chapelGroup.position.set(-6, 0, -20);
    this._envGroup.add(chapelGroup);

    // ═══════════════════════════════════════════════
    // BLACKSMITH AREA (x=-15, z=-10)
    // ═══════════════════════════════════════════════
    const forgeGroup = new THREE.Group();
    // Open shed roof
    const shedRoofGeo = new THREE.BoxGeometry(4, 0.15, 3);
    const shedRoofMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
    const shedRoof = new THREE.Mesh(shedRoofGeo, shedRoofMat);
    shedRoof.position.set(0, 2.8, 0);
    shedRoof.castShadow = true;
    forgeGroup.add(shedRoof);
    // Shed poles
    for (const [fpx, fpz] of [[-1.8, -1.3], [1.8, -1.3], [-1.8, 1.3], [1.8, 1.3]]) {
      const fpGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.8, 6);
      const fpMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
      const fp = new THREE.Mesh(fpGeo, fpMat);
      fp.position.set(fpx, 1.4, fpz);
      forgeGroup.add(fp);
    }
    // Anvil
    const anvilBaseGeo = new THREE.BoxGeometry(0.5, 0.6, 0.3);
    const anvilMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });
    const anvilBase = new THREE.Mesh(anvilBaseGeo, anvilMat);
    anvilBase.position.set(0, 0.3, 0);
    forgeGroup.add(anvilBase);
    const anvilTopGeo = new THREE.BoxGeometry(0.7, 0.15, 0.35);
    const anvilTop = new THREE.Mesh(anvilTopGeo, anvilMat);
    anvilTop.position.set(0, 0.68, 0);
    anvilTop.castShadow = true;
    forgeGroup.add(anvilTop);
    // Forge fire
    const forgeFireGeo = new THREE.BoxGeometry(1.0, 0.6, 0.8);
    const forgeFireMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
    const forgeFire = new THREE.Mesh(forgeFireGeo, forgeFireMat);
    forgeFire.position.set(-1.2, 0.3, 0);
    forgeGroup.add(forgeFire);
    const emberGeo = new THREE.SphereGeometry(0.3, 8, 6);
    const emberMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff3300, emissiveIntensity: 2.0 });
    const forgeEmber = new THREE.Mesh(emberGeo, emberMat);
    forgeEmber.position.set(-1.2, 0.7, 0);
    forgeGroup.add(forgeEmber);
    // Forge point light
    const forgeLight = new THREE.PointLight(0xff6622, 1.0, 10);
    forgeLight.position.set(-15 - 1.2, 1.0, -10);
    this._scene.add(forgeLight);
    this._torchLights.push(forgeLight);
    // Weapon rack
    const rackGeo = new THREE.BoxGeometry(0.1, 1.5, 1.5);
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
    const rack = new THREE.Mesh(rackGeo, rackMat);
    rack.position.set(1.5, 0.75, 0);
    forgeGroup.add(rack);
    // Weapons on rack
    for (let wri = 0; wri < 3; wri++) {
      const wpGeo = new THREE.BoxGeometry(0.06, 1.0, 0.04);
      const wpMat = new THREE.MeshStandardMaterial({ color: 0xaaaacc, metalness: 0.7, roughness: 0.2 });
      const wp = new THREE.Mesh(wpGeo, wpMat);
      wp.position.set(1.55, 0.8, -0.4 + wri * 0.4);
      wp.rotation.z = 0.1;
      forgeGroup.add(wp);
    }
    forgeGroup.position.set(-15, 0, -10);
    this._envGroup.add(forgeGroup);

    // ═══════════════════════════════════════════════
    // VENDOR MARKERS
    // ═══════════════════════════════════════════════
    const vendorTypeColors: Record<string, number> = {
      [VendorType.BLACKSMITH]: 0xff6600,
      [VendorType.ARCANIST]: 0x8844ff,
      [VendorType.JEWELER]: 0x44ddff,
      [VendorType.ALCHEMIST]: 0x44ff44,
      [VendorType.GENERAL_MERCHANT]: 0xffdd00,
    };

    for (const vdef of VENDOR_DEFS) {
      const vendorMarker = new THREE.Group();
      // Tall post
      const vPostGeo = new THREE.CylinderGeometry(0.06, 0.06, 3, 6);
      const vPostMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
      const vPost = new THREE.Mesh(vPostGeo, vPostMat);
      vPost.position.y = 1.5;
      vPost.castShadow = true;
      vendorMarker.add(vPost);
      // Sign box
      const vSignGeo = new THREE.BoxGeometry(0.5, 0.35, 0.05);
      const vSignMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.7 });
      const vSign = new THREE.Mesh(vSignGeo, vSignMat);
      vSign.position.set(0.3, 2.5, 0);
      vendorMarker.add(vSign);
      // Emissive sphere on top
      const vColor = vendorTypeColors[vdef.type] || 0xffffff;
      const vSphereGeo = new THREE.SphereGeometry(0.2, 8, 6);
      const vSphereMat = new THREE.MeshStandardMaterial({ color: vColor, emissive: vColor, emissiveIntensity: 1.0 });
      const vSphere = new THREE.Mesh(vSphereGeo, vSphereMat);
      vSphere.position.set(0, 3.2, 0);
      vendorMarker.add(vSphere);
      // Point light
      const vLight = new THREE.PointLight(vColor, 0.5, 6);
      vLight.position.set(vdef.x, 3.2, vdef.z);
      this._scene.add(vLight);
      this._torchLights.push(vLight);

      vendorMarker.position.set(vdef.x, 0, vdef.z);
      this._envGroup.add(vendorMarker);
    }

    // ═══════════════════════════════════════════════
    // DECORATIVE ELEMENTS
    // ═══════════════════════════════════════════════

    // Hay bales (6)
    const hayMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.9 });
    const hayPositions = [[-10, 2], [-11, 3], [10, -2], [11, -3], [5, 12], [-5, -12]];
    for (const [hx, hz] of hayPositions) {
      const hayGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.8, 10);
      const hay = new THREE.Mesh(hayGeo, hayMat);
      hay.position.set(hx, 0.4, hz);
      hay.rotation.z = Math.PI / 2;
      hay.rotation.y = Math.random() * 0.5;
      hay.castShadow = true;
      this._envGroup.add(hay);
    }

    // Barrels (10)
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.8 });
    for (let bri = 0; bri < 10; bri++) {
      const barrelGeo = new THREE.CylinderGeometry(0.25, 0.22, 0.6, 8);
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      const bAngle = (bri / 10) * Math.PI * 2;
      const bRadius = 13 + (bri % 3);
      barrel.position.set(
        Math.cos(bAngle) * bRadius + (Math.random() - 0.5) * 2,
        0.3,
        Math.sin(bAngle) * bRadius + (Math.random() - 0.5) * 2
      );
      barrel.castShadow = true;
      this._envGroup.add(barrel);
      // Band on barrel
      const bandGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.04, 8);
      const bandMtl = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.4 });
      const band = new THREE.Mesh(bandGeo, bandMtl);
      band.position.copy(barrel.position);
      band.position.y += 0.1;
      this._envGroup.add(band);
    }

    // Carts (3)
    const cartPositions: [number, number, number][] = [[-8, -5, 0.3], [9, 3, -0.5], [2, -14, 0.8]];
    for (const [cx, cz, cRot] of cartPositions) {
      const cartGroup = new THREE.Group();
      // Platform
      const platGeo = new THREE.BoxGeometry(2, 0.12, 1);
      const platMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
      const plat = new THREE.Mesh(platGeo, platMat);
      plat.position.y = 0.5;
      cartGroup.add(plat);
      // Wheels
      for (const [wx, wz] of [[-0.7, -0.5], [-0.7, 0.5], [0.7, -0.5], [0.7, 0.5]]) {
        const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 10);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 });
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.3, wz);
        cartGroup.add(wheel);
      }
      // Handle
      const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 5);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.rotation.z = Math.PI / 3;
      handle.position.set(-1.4, 0.9, 0);
      cartGroup.add(handle);
      cartGroup.position.set(cx, 0, cz);
      cartGroup.rotation.y = cRot;
      this._envGroup.add(cartGroup);
    }

    // Trees (8) - small deciduous, placed far from center to not block buildings
    const treeGreens = [0x448833, 0x55aa44, 0x669944, 0x778833, 0xaa8833, 0xcc6622];
    for (let ti = 0; ti < 8; ti++) {
      const treeGroup = new THREE.Group();
      const trunkH = 1.0 + Math.random() * 0.8;
      const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, trunkH, 7);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      treeGroup.add(trunk);
      // Small sphere crown
      const crownR = 0.5 + Math.random() * 0.4;
      const crownGeo = new THREE.SphereGeometry(crownR, 8, 6);
      const crownMat = new THREE.MeshStandardMaterial({ color: treeGreens[ti % treeGreens.length], roughness: 0.8 });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = trunkH + crownR * 0.6;
      crown.castShadow = true;
      treeGroup.add(crown);
      // Place at far edges only
      const tAngle = (ti / 8) * Math.PI * 2;
      const tRadius = hw * 0.85 + Math.random() * 3;
      treeGroup.position.set(
        Math.cos(tAngle) * tRadius,
        0,
        Math.sin(tAngle) * tRadius
      );
      this._envGroup.add(treeGroup);
    }

    // Flower boxes (8) - near buildings
    const flowerColors = [0xff4466, 0xff88aa, 0xffdd44, 0xff6633, 0xaa44ff, 0x44aaff, 0xff44aa, 0xffaa44];
    for (let fi = 0; fi < 8; fi++) {
      const fboxGroup = new THREE.Group();
      const fboxGeo = new THREE.BoxGeometry(0.5, 0.15, 0.2);
      const fboxMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
      const fbox = new THREE.Mesh(fboxGeo, fboxMat);
      fboxGroup.add(fbox);
      // Flowers (small spheres)
      for (let ff = 0; ff < 4; ff++) {
        const flGeo = new THREE.SphereGeometry(0.06, 5, 4);
        const flMat = new THREE.MeshStandardMaterial({ color: flowerColors[fi], roughness: 0.6 });
        const fl = new THREE.Mesh(flGeo, flMat);
        fl.position.set(-0.15 + ff * 0.1, 0.12, 0);
        fboxGroup.add(fl);
      }
      const fbi = fi < buildingPositions.length ? fi : 0;
      const [fbx, fbz] = buildingPositions[fbi];
      fboxGroup.position.set(fbx, 1.5, fbz + 1.8);
      this._envGroup.add(fboxGroup);
    }

    // Street lamps (6)
    const lampPositions: [number, number][] = [[-5, -3], [5, -3], [-5, 5], [5, 5], [-10, 0], [10, 0]];
    for (const [lx, lz] of lampPositions) {
      const lampGroup = new THREE.Group();
      // Pole
      const lampPoleGeo = new THREE.CylinderGeometry(0.04, 0.06, 3.5, 6);
      const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.4 });
      const lampPole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
      lampPole.position.y = 1.75;
      lampPole.castShadow = true;
      lampGroup.add(lampPole);
      // Light sphere
      const lampSphGeo = new THREE.SphereGeometry(0.15, 8, 6);
      const lampSphMat = new THREE.MeshStandardMaterial({ color: 0xffeeaa, emissive: 0xffcc66, emissiveIntensity: 1.0 });
      const lampSph = new THREE.Mesh(lampSphGeo, lampSphMat);
      lampSph.position.y = 3.6;
      lampGroup.add(lampSph);
      // Point light
      const lampLight = new THREE.PointLight(0xffcc66, 0.6, 10);
      lampLight.position.set(lx, 3.6, lz);
      this._scene.add(lampLight);
      this._torchLights.push(lampLight);
      lampGroup.position.set(lx, 0, lz);
      this._envGroup.add(lampGroup);
    }

    // Flags/Pennants (4) on tall poles
    const flagPositions: [number, number, number][] = [[-12, -15, 0xcc2222], [12, -15, 0x2244cc], [-12, 12, 0xcc2222], [12, 12, 0x2244cc]];
    for (const [fx, fz, fColor] of flagPositions) {
      const flagGroup = new THREE.Group();
      const fpGeo = new THREE.CylinderGeometry(0.04, 0.04, 5, 6);
      const fpMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
      const fpole = new THREE.Mesh(fpGeo, fpMat);
      fpole.position.y = 2.5;
      fpole.castShadow = true;
      flagGroup.add(fpole);
      const flagGeo = new THREE.PlaneGeometry(1.2, 0.8);
      const flagMat = new THREE.MeshStandardMaterial({ color: fColor, roughness: 0.7, side: THREE.DoubleSide });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(0.6, 4.5, 0);
      flagGroup.add(flag);
      flagGroup.position.set(fx, 0, fz);
      this._envGroup.add(flagGroup);
    }

    // Horse troughs (2)
    const troughPositions: [number, number][] = [[-7, -8], [8, 8]];
    for (const [tx, tz] of troughPositions) {
      const troughGroup = new THREE.Group();
      // Basin
      const basinGeo = new THREE.BoxGeometry(1.5, 0.4, 0.5);
      const basinMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
      const basin = new THREE.Mesh(basinGeo, basinMat);
      basin.position.y = 0.4;
      troughGroup.add(basin);
      // Water plane
      const waterGeo = new THREE.BoxGeometry(1.3, 0.02, 0.35);
      const waterMat = new THREE.MeshStandardMaterial({ color: 0x3388aa, transparent: true, opacity: 0.5, roughness: 0.2 });
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.position.y = 0.58;
      troughGroup.add(water);
      // Legs
      for (const lsx of [-0.55, 0.55]) {
        const legGeo = new THREE.BoxGeometry(0.08, 0.2, 0.5);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(lsx, 0.1, 0);
        troughGroup.add(leg);
      }
      troughGroup.position.set(tx, 0, tz);
      this._envGroup.add(troughGroup);
    }

    // Stone benches (4)
    const benchPositions: [number, number, number][] = [[-3, 4, 0], [3, 4, 0], [-3, -4, Math.PI], [3, -4, Math.PI]];
    for (const [bx, bz, bRot] of benchPositions) {
      const benchGeo = new THREE.BoxGeometry(1.5, 0.3, 0.5);
      const benchMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.85 });
      const bench = new THREE.Mesh(benchGeo, benchMat);
      bench.position.set(bx, 0.15, bz);
      bench.rotation.y = bRot;
      bench.castShadow = true;
      this._envGroup.add(bench);
      // Bench legs
      for (const blx of [-0.55, 0.55]) {
        const blGeo = new THREE.BoxGeometry(0.12, 0.3, 0.5);
        const blMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.85 });
        const bl = new THREE.Mesh(blGeo, blMat);
        bl.position.set(bx + blx, 0.15, bz);
        bl.rotation.y = bRot;
        this._envGroup.add(bl);
      }
    }

    // Additional small rocks / cobblestones scattered (15)
    for (let ri = 0; ri < 15; ri++) {
      const rockGeo = new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.15, 0);
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.95 });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.08,
        (Math.random() - 0.5) * d * 0.8
      );
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this._envGroup.add(rock);
    }

    // Sacks of grain near market (4) - small burlap-colored, not sandy
    for (let si = 0; si < 4; si++) {
      const sackGeo = new THREE.SphereGeometry(0.12, 6, 5);
      const sackMat = new THREE.MeshStandardMaterial({ color: 0x7a6530, roughness: 0.95 });
      const sack = new THREE.Mesh(sackGeo, sackMat);
      sack.scale.set(1, 0.8, 0.8);
      sack.position.set(
        -6 + si * 0.4 + (Math.random() - 0.5) * 0.2,
        0.1,
        7 + (Math.random() - 0.5) * 0.3
      );
      sack.castShadow = true;
      this._envGroup.add(sack);
    }

    // Wooden crates near blacksmith (5)
    for (let ci = 0; ci < 5; ci++) {
      const crateGeo = new THREE.BoxGeometry(0.4 + Math.random() * 0.2, 0.4 + Math.random() * 0.2, 0.4 + Math.random() * 0.2);
      const crateMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(-13 + ci * 0.6, 0.25, -8 + (Math.random() - 0.5));
      crate.rotation.y = Math.random() * 0.5;
      crate.castShadow = true;
      this._envGroup.add(crate);
    }

    // Potted plants near chapel (4)
    for (let pi = 0; pi < 4; pi++) {
      const potGroup = new THREE.Group();
      const potGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.25, 8);
      const potMat = new THREE.MeshStandardMaterial({ color: 0xaa6633, roughness: 0.8 });
      const pot = new THREE.Mesh(potGeo, potMat);
      pot.position.y = 0.125;
      potGroup.add(pot);
      const plantGeo = new THREE.SphereGeometry(0.2, 6, 5);
      const plantMat = new THREE.MeshStandardMaterial({ color: 0x44aa33, roughness: 0.8 });
      const plant = new THREE.Mesh(plantGeo, plantMat);
      plant.position.y = 0.35;
      potGroup.add(plant);
      potGroup.position.set(-6 + pi * 0.8, 0, -18);
      this._envGroup.add(potGroup);
    }

    // Hanging lanterns on building overhangs (6)
    for (let li = 0; li < 6; li++) {
      const lanternGroup = new THREE.Group();
      const chainGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4);
      const chainMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.3 });
      const chain = new THREE.Mesh(chainGeo, chainMat);
      chain.position.y = 2.8;
      lanternGroup.add(chain);
      const lanternBodyGeo = new THREE.BoxGeometry(0.15, 0.2, 0.15);
      const lanternBodyMat = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa22, emissiveIntensity: 0.8, roughness: 0.4, transparent: true, opacity: 0.8 });
      const lanternBody = new THREE.Mesh(lanternBodyGeo, lanternBodyMat);
      lanternBody.position.y = 2.5;
      lanternGroup.add(lanternBody);
      const bIdx = li * 3;
      if (bIdx < buildingPositions.length) {
        const [blx, blz] = buildingPositions[bIdx];
        lanternGroup.position.set(blx, 0, blz + 1.5);
        this._envGroup.add(lanternGroup);
      }
    }

    // Well-worn path stones (cobblestone details, 20)
    for (let pi = 0; pi < 20; pi++) {
      const csGeo = new THREE.CylinderGeometry(0.2 + Math.random() * 0.15, 0.2 + Math.random() * 0.15, 0.03, 6);
      const csMat = new THREE.MeshStandardMaterial({ color: 0x776655 + Math.floor(Math.random() * 0x111111), roughness: 0.95 });
      const cs = new THREE.Mesh(csGeo, csMat);
      cs.position.set(
        (Math.random() - 0.5) * 25,
        0.015,
        (Math.random() - 0.5) * 25
      );
      this._envGroup.add(cs);
    }

    // Clotheslines between buildings (3)
    for (let cli = 0; cli < 3; cli++) {
      const clGroup = new THREE.Group();
      const clRopeGeo = new THREE.CylinderGeometry(0.008, 0.008, 4, 4);
      const clRopeMat = new THREE.MeshStandardMaterial({ color: 0xaa9966, roughness: 0.9 });
      const clRope = new THREE.Mesh(clRopeGeo, clRopeMat);
      clRope.rotation.z = Math.PI / 2;
      clRope.position.y = 3.0;
      clGroup.add(clRope);
      // Hanging clothes (small planes)
      const clothColors = [0xeeeeee, 0xcc8844, 0x8844cc, 0xcc4444];
      for (let cc = 0; cc < 3; cc++) {
        const clothGeo = new THREE.PlaneGeometry(0.4, 0.5);
        const clothMat = new THREE.MeshStandardMaterial({ color: clothColors[cc % clothColors.length], roughness: 0.8, side: THREE.DoubleSide });
        const cloth = new THREE.Mesh(clothGeo, clothMat);
        cloth.position.set(-1 + cc * 1, 2.6, 0);
        clGroup.add(cloth);
      }
      const clX = -14 + cli * 14;
      clGroup.position.set(clX, 0, 3 + cli * 3);
      this._envGroup.add(clGroup);
    }

    // Stacked logs near buildings (4 piles)
    for (let lpi = 0; lpi < 4; lpi++) {
      const logPile = new THREE.Group();
      for (let lo = 0; lo < 5; lo++) {
        const logGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 6);
        const logMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.9 });
        const log = new THREE.Mesh(logGeo, logMat);
        log.rotation.z = Math.PI / 2;
        log.position.set(0, 0.08 + lo * 0.16, (Math.random() - 0.5) * 0.1);
        logPile.add(log);
      }
      const lpAngle = (lpi / 4) * Math.PI * 2 + 0.5;
      logPile.position.set(Math.cos(lpAngle) * 16, 0, Math.sin(lpAngle) * 16);
      this._envGroup.add(logPile);
    }

    // Bird bath / fountain near chapel (1)
    const fountainGroup = new THREE.Group();
    const fPedGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.0, 8);
    const fPedMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.75 });
    const fPed = new THREE.Mesh(fPedGeo, fPedMat);
    fPed.position.y = 0.5;
    fountainGroup.add(fPed);
    const fBowlGeo = new THREE.CylinderGeometry(0.6, 0.4, 0.25, 12);
    const fBowl = new THREE.Mesh(fBowlGeo, fPedMat);
    fBowl.position.y = 1.12;
    fountainGroup.add(fBowl);
    const fWaterGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 12);
    const fWaterMat = new THREE.MeshStandardMaterial({ color: 0x3388aa, transparent: true, opacity: 0.5, roughness: 0.2 });
    const fWater = new THREE.Mesh(fWaterGeo, fWaterMat);
    fWater.position.y = 1.22;
    fountainGroup.add(fWater);
    fountainGroup.position.set(-3, 0, -18);
    this._envGroup.add(fountainGroup);

    // Notice board near center (1)
    const boardGroup = new THREE.Group();
    const boardPostGeo = new THREE.CylinderGeometry(0.06, 0.06, 2, 6);
    const boardPostMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
    for (const bpx of [-0.4, 0.4]) {
      const bp = new THREE.Mesh(boardPostGeo, boardPostMat);
      bp.position.set(bpx, 1, 0);
      bp.castShadow = true;
      boardGroup.add(bp);
    }
    const boardFaceGeo = new THREE.BoxGeometry(1.0, 0.8, 0.06);
    const boardFaceMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
    const boardFace = new THREE.Mesh(boardFaceGeo, boardFaceMat);
    boardFace.position.y = 1.6;
    boardGroup.add(boardFace);
    // Parchment notes
    for (let ni = 0; ni < 3; ni++) {
      const noteGeo = new THREE.PlaneGeometry(0.2, 0.25);
      const noteMat = new THREE.MeshStandardMaterial({ color: 0xeeddbb, roughness: 0.7, side: THREE.DoubleSide });
      const note = new THREE.Mesh(noteGeo, noteMat);
      note.position.set(-0.25 + ni * 0.25, 1.6, 0.04);
      note.rotation.z = (Math.random() - 0.5) * 0.2;
      boardGroup.add(note);
    }
    boardGroup.position.set(3, 0, -2);
    this._envGroup.add(boardGroup);

    // ═══════════════════════════════════════════════
    // MOAT & DRAWBRIDGE (around castle)
    // ═══════════════════════════════════════════════
    const moatMat = new THREE.MeshStandardMaterial({ color: 0x224466, transparent: true, opacity: 0.6, roughness: 0.15 });
    // North moat (behind castle)
    const moatN = new THREE.Mesh(new THREE.BoxGeometry(20, 0.08, 2.5), moatMat);
    moatN.position.set(0, 0.04, -38);
    moatN.receiveShadow = true;
    this._envGroup.add(moatN);
    // Side moats
    for (const sx of [-10, 10]) {
      const moatSide = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 18), moatMat);
      moatSide.position.set(sx, 0.04, -29);
      moatSide.receiveShadow = true;
      this._envGroup.add(moatSide);
    }
    // Drawbridge planks (south of castle gate)
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
    for (let bp = 0; bp < 6; bp++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.4), bridgeMat);
      plank.position.set(0, 0.08, -24.5 + bp * 0.5);
      plank.castShadow = true;
      this._envGroup.add(plank);
    }
    // Bridge chains
    const chainMtl = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 });
    for (const cx of [-1.6, 1.6]) {
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.5, 4), chainMtl);
      ch.rotation.x = Math.PI * 0.35;
      ch.position.set(cx, 2, -24);
      this._envGroup.add(ch);
    }

    // ═══════════════════════════════════════════════
    // HEDGE GARDENS (near chapel & east side)
    // ═══════════════════════════════════════════════
    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.85 });
    // Rectangular hedge rows (garden east of chapel)
    const hedgeLayout: [number, number, number, number][] = [
      [-10, -16, 4, 0.4], [-10, -14, 4, 0.4], [-10, -15, 0.4, 2.4], [-6.4, -15, 0.4, 2.4],
      // East garden
      [14, 0, 0.4, 5], [14, 0, 3, 0.4], [14, 5, 3, 0.4],
    ];
    for (const [hx, hz, hw2, hd2] of hedgeLayout) {
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(hw2, 0.8, hd2), hedgeMat);
      hedge.position.set(hx, 0.4, hz);
      hedge.castShadow = true;
      this._envGroup.add(hedge);
    }
    // Topiary spheres in gardens
    for (const [tx, tz] of [[-8.5, -15], [-10, -15], [15, 1], [15, 4]] as [number, number][]) {
      const topiary = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), hedgeMat);
      topiary.position.set(tx, 0.7, tz);
      topiary.castShadow = true;
      this._envGroup.add(topiary);
    }
    // Garden flowers inside hedges
    const gardenFlowerColors = [0xff6688, 0xffdd44, 0xaa44ff, 0xff4444, 0x44aaff, 0xffaacc];
    for (let gf = 0; gf < 12; gf++) {
      const gfMat = new THREE.MeshStandardMaterial({ color: gardenFlowerColors[gf % gardenFlowerColors.length], roughness: 0.6 });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4), new THREE.MeshStandardMaterial({ color: 0x338822 }));
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), gfMat);
      const fGroup = new THREE.Group();
      stem.position.y = 0.15;
      bloom.position.y = 0.33;
      fGroup.add(stem);
      fGroup.add(bloom);
      fGroup.position.set(
        -9.5 + (gf % 4) * 0.8,
        0,
        -15.5 + Math.floor(gf / 4) * 0.8
      );
      this._envGroup.add(fGroup);
    }

    // ═══════════════════════════════════════════════
    // GRAVEYARD (near chapel, west side)
    // ═══════════════════════════════════════════════
    const gravestoneMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 });
    for (let gi = 0; gi < 8; gi++) {
      const gsGroup = new THREE.Group();
      // Headstone
      const gsGeo = new THREE.BoxGeometry(0.3, 0.6 + Math.random() * 0.3, 0.08);
      const gs = new THREE.Mesh(gsGeo, gravestoneMat);
      gs.position.y = 0.35;
      gsGroup.add(gs);
      // Rounded top
      const gsTop = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), gravestoneMat);
      gsTop.position.y = 0.65 + (gi % 3) * 0.1;
      gsGroup.add(gsTop);
      // Small cross on some
      if (gi % 3 === 0) {
        const gcV = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.03), gravestoneMat);
        gcV.position.set(0, 0.9, 0);
        gsGroup.add(gcV);
        const gcH = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.03), gravestoneMat);
        gcH.position.set(0, 0.95, 0);
        gsGroup.add(gcH);
      }
      gsGroup.position.set(-9 + (gi % 4) * 1.0, 0, -22 + Math.floor(gi / 4) * 1.2);
      gsGroup.rotation.y = (Math.random() - 0.5) * 0.15;
      this._envGroup.add(gsGroup);
    }
    // Iron fence around graveyard
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 });
    for (let fi = 0; fi < 12; fi++) {
      const fenceBar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 4), fenceMat);
      fenceBar.position.set(-10.5 + fi * 0.5, 0.5, -23.5);
      this._envGroup.add(fenceBar);
    }
    const fenceRail = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 6, 4), fenceMat);
    fenceRail.rotation.z = Math.PI / 2;
    fenceRail.position.set(-8, 0.8, -23.5);
    this._envGroup.add(fenceRail);

    // ═══════════════════════════════════════════════
    // TRAINING GROUNDS (southeast, x=15, z=-15)
    // ═══════════════════════════════════════════════
    // Practice dummies
    for (let di = 0; di < 3; di++) {
      const dummyGroup = new THREE.Group();
      const dPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.0, 6),
        new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 }));
      dPole.position.y = 1.0;
      dummyGroup.add(dPole);
      // Cross arm
      const dArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 5),
        new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 }));
      dArm.rotation.z = Math.PI / 2;
      dArm.position.y = 1.6;
      dummyGroup.add(dArm);
      // Straw body
      const dBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.6, 8),
        new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.9 }));
      dBody.position.y = 1.3;
      dummyGroup.add(dBody);
      // Straw head
      const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 5),
        new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.9 }));
      dHead.position.y = 1.85;
      dummyGroup.add(dHead);
      // Shield target on some
      if (di === 1) {
        const shield = new THREE.Mesh(new THREE.CircleGeometry(0.25, 8),
          new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.6, side: THREE.DoubleSide }));
        shield.position.set(0, 1.3, 0.2);
        dummyGroup.add(shield);
        const innerRing = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.12, 8),
          new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
        innerRing.position.set(0, 1.3, 0.21);
        dummyGroup.add(innerRing);
      }
      dummyGroup.position.set(14 + di * 1.5, 0, -15);
      this._envGroup.add(dummyGroup);
    }
    // Archery targets
    for (let ai = 0; ai < 2; ai++) {
      const targetGroup = new THREE.Group();
      const backboard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 1.2),
        new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.9 }));
      backboard.position.y = 0.9;
      targetGroup.add(backboard);
      // Target rings
      const ringColors = [0xcc2222, 0xffffff, 0xcc2222, 0xffcc00];
      for (let ri = 0; ri < 4; ri++) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.1 + ri * 0.1, 0.2 + ri * 0.1, 16),
          new THREE.MeshStandardMaterial({ color: ringColors[ri], side: THREE.DoubleSide }));
        ring.rotation.y = Math.PI / 2;
        ring.position.set(0.05, 0.9, 0);
        targetGroup.add(ring);
      }
      // Support legs
      for (const lz of [-0.4, 0.4]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 5),
          new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 }));
        leg.rotation.x = (lz > 0 ? -1 : 1) * 0.2;
        leg.position.set(-0.2, 0.6, lz);
        targetGroup.add(leg);
      }
      targetGroup.position.set(18, 0, -13 + ai * 3);
      targetGroup.rotation.y = -Math.PI / 2;
      this._envGroup.add(targetGroup);
    }
    // Weapon racks at training ground
    const tRack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 2), new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 }));
    tRack.position.set(13, 0.6, -16);
    this._envGroup.add(tRack);
    for (let tw = 0; tw < 4; tw++) {
      const tWeapon = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xaaaacc, metalness: 0.7, roughness: 0.2 }));
      tWeapon.position.set(13.05, 0.7, -16.7 + tw * 0.45);
      tWeapon.rotation.z = 0.08;
      this._envGroup.add(tWeapon);
    }

    // ═══════════════════════════════════════════════
    // ANIMALS
    // ═══════════════════════════════════════════════
    // Horses (2) near troughs
    for (const [hx, hz, hRot] of [[-7, -6.5, 0.3], [8, 6.5, -0.5]] as [number, number, number][]) {
      const horseGroup = new THREE.Group();
      // Body
      const hBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 }));
      hBody.position.y = 1.0;
      horseGroup.add(hBody);
      // Neck
      const hNeck = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 }));
      hNeck.position.set(0.7, 1.4, 0);
      hNeck.rotation.z = -0.4;
      horseGroup.add(hNeck);
      // Head
      const hHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x5A3A1A, roughness: 0.8 }));
      hHead.position.set(1.1, 1.6, 0);
      horseGroup.add(hHead);
      // Legs (4)
      for (const [lx, lz] of [[-0.5, -0.25], [-0.5, 0.25], [0.5, -0.25], [0.5, 0.25]]) {
        const hLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x5A3A1A, roughness: 0.8 }));
        hLeg.position.set(lx, 0.35, lz);
        horseGroup.add(hLeg);
      }
      // Tail
      const hTail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.6, 5),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }));
      hTail.position.set(-0.9, 1.1, 0);
      hTail.rotation.z = 0.6;
      horseGroup.add(hTail);
      // Mane
      const hMane = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }));
      hMane.position.set(0.5, 1.55, 0);
      hMane.rotation.z = -0.3;
      horseGroup.add(hMane);
      // Saddle
      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.65),
        new THREE.MeshStandardMaterial({ color: 0x882222, roughness: 0.7 }));
      saddle.position.set(0, 1.45, 0);
      horseGroup.add(saddle);
      horseGroup.position.set(hx, 0, hz);
      horseGroup.rotation.y = hRot;
      this._envGroup.add(horseGroup);
    }

    // Chickens (5) near market
    for (let ci = 0; ci < 5; ci++) {
      const chickenGroup = new THREE.Group();
      const cBody = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5),
        new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.85 }));
      cBody.position.y = 0.18;
      cBody.scale.set(1, 0.8, 1.2);
      chickenGroup.add(cBody);
      const cHead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4),
        new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.85 }));
      cHead.position.set(0.1, 0.28, 0);
      chickenGroup.add(cHead);
      // Beak
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.04, 4),
        new THREE.MeshStandardMaterial({ color: 0xddaa22 }));
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(0.17, 0.28, 0);
      chickenGroup.add(beak);
      // Comb
      const comb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xcc2222 }));
      comb.position.set(0.1, 0.34, 0);
      chickenGroup.add(comb);
      chickenGroup.position.set(
        -3 + ci * 1.5 + (Math.random() - 0.5),
        0,
        6 + (Math.random() - 0.5) * 2
      );
      chickenGroup.rotation.y = Math.random() * Math.PI * 2;
      this._envGroup.add(chickenGroup);
    }

    // Cat on barrel (1)
    const catGroup = new THREE.Group();
    const catBody = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xdd8833, roughness: 0.8 }));
    catBody.position.y = 0.08;
    catGroup.add(catBody);
    const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5),
      new THREE.MeshStandardMaterial({ color: 0xdd8833, roughness: 0.8 }));
    catHead.position.set(0.18, 0.13, 0);
    catGroup.add(catHead);
    // Ears
    for (const ez of [-0.04, 0.04]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 4),
        new THREE.MeshStandardMaterial({ color: 0xdd8833 }));
      ear.position.set(0.2, 0.22, ez);
      catGroup.add(ear);
    }
    // Tail
    const catTail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.35, 4),
      new THREE.MeshStandardMaterial({ color: 0xdd8833 }));
    catTail.rotation.z = 0.5;
    catTail.position.set(-0.25, 0.15, 0);
    catGroup.add(catTail);
    catGroup.position.set(10, 0.6, -2);
    this._envGroup.add(catGroup);

    // ═══════════════════════════════════════════════
    // HALF-TIMBER DETAILS on buildings
    // ═══════════════════════════════════════════════
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x4A2A0A, roughness: 0.85 });
    for (let tbi = 0; tbi < 10; tbi++) {
      const [tbx, tbz, tbw2, tbd] = buildingPositions[tbi];
      const tbh = 3 + ((tbi * 7 + 3) % 5) * 0.4; // approximate building height
      // Horizontal beams
      for (const by of [0.5, tbh * 0.5, tbh * 0.85]) {
        const hBeam = new THREE.Mesh(new THREE.BoxGeometry(tbw2 + 0.05, 0.06, 0.06), timberMat);
        hBeam.position.set(tbx, by, tbz + tbd / 2 + 0.04);
        this._envGroup.add(hBeam);
      }
      // Vertical beams at edges
      for (const vx of [-tbw2 / 2, tbw2 / 2]) {
        const vBeam = new THREE.Mesh(new THREE.BoxGeometry(0.06, tbh, 0.06), timberMat);
        vBeam.position.set(tbx + vx, tbh / 2, tbz + tbd / 2 + 0.04);
        this._envGroup.add(vBeam);
      }
      // Diagonal cross beam (X pattern)
      const diagLen = Math.sqrt(tbw2 * tbw2 + (tbh * 0.35) * (tbh * 0.35));
      const diagAngle = Math.atan2(tbh * 0.35, tbw2);
      const diag = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.04, 0.04), timberMat);
      diag.rotation.z = diagAngle;
      diag.position.set(tbx, tbh * 0.65, tbz + tbd / 2 + 0.04);
      this._envGroup.add(diag);
    }

    // ═══════════════════════════════════════════════
    // WINDOW SHUTTERS on buildings
    // ═══════════════════════════════════════════════
    const shutterColors = [0x334466, 0x446633, 0x663333, 0x553344, 0x336655];
    for (let si = 0; si < 12; si++) {
      const [sx, sz, sw2] = buildingPositions[si];
      const sbh = 3 + ((si * 7 + 3) % 5) * 0.4;
      const shutterMat = new THREE.MeshStandardMaterial({ color: shutterColors[si % shutterColors.length], roughness: 0.8 });
      for (let wi = 0; wi < 2; wi++) {
        const wx = sx - sw2 * 0.2 + wi * sw2 * 0.4;
        // Left shutter
        const shutterL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.03), shutterMat);
        shutterL.position.set(wx - 0.22, sbh * 0.6, sz + buildingPositions[si][3] / 2 + 0.06);
        shutterL.rotation.y = 0.3;
        this._envGroup.add(shutterL);
        // Right shutter
        const shutterR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.03), shutterMat);
        shutterR.position.set(wx + 0.22, sbh * 0.6, sz + buildingPositions[si][3] / 2 + 0.06);
        shutterR.rotation.y = -0.3;
        this._envGroup.add(shutterR);
      }
    }

    // ═══════════════════════════════════════════════
    // IVY / MOSS on walls
    // ═══════════════════════════════════════════════
    const ivyMat = new THREE.MeshStandardMaterial({ color: 0x2a5a1a, roughness: 0.9, transparent: true, opacity: 0.85 });
    // Ivy patches on town walls
    for (let iv = 0; iv < 10; iv++) {
      const ivyPatch = new THREE.Mesh(new THREE.PlaneGeometry(2 + Math.random() * 2, 1.5 + Math.random()),
        ivyMat);
      const side = iv < 3 ? 0 : iv < 5 ? 1 : iv < 7 ? 2 : 3;
      if (side === 0) { // north wall
        ivyPatch.position.set(-hw * 0.5 + iv * 6, 1.5 + Math.random(), -hd + 0.55);
      } else if (side === 1) {
        ivyPatch.position.set(hw - 0.55, 1.5 + Math.random(), -hd * 0.3 + iv * 4);
        ivyPatch.rotation.y = Math.PI / 2;
      } else if (side === 2) {
        ivyPatch.position.set(-hw + 0.55, 1.5 + Math.random(), -hd * 0.3 + iv * 3);
        ivyPatch.rotation.y = -Math.PI / 2;
      } else {
        ivyPatch.position.set(-5 + iv * 3, 1.2 + Math.random(), hd - 0.55);
        ivyPatch.rotation.y = Math.PI;
      }
      this._envGroup.add(ivyPatch);
    }

    // ═══════════════════════════════════════════════
    // PUDDLES (after rain effect)
    // ═══════════════════════════════════════════════
    const puddleMat = new THREE.MeshStandardMaterial({ color: 0x556677, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.3 });
    for (let pi = 0; pi < 6; pi++) {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.3 + Math.random() * 0.5, 10), puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(
        (Math.random() - 0.5) * 20,
        0.02,
        (Math.random() - 0.5) * 20
      );
      this._envGroup.add(puddle);
    }

    // ═══════════════════════════════════════════════
    // WEATHER VANES on rooftops (6)
    // ═══════════════════════════════════════════════
    const vaneMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.3 });
    for (let vi = 0; vi < 6; vi++) {
      const [vx, vz] = buildingPositions[vi * 3];
      const vGroup = new THREE.Group();
      const vPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4), vaneMat);
      vPole.position.y = 0.5;
      vGroup.add(vPole);
      // Arrow
      const vArrow = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 4), vaneMat);
      vArrow.rotation.z = Math.PI / 2;
      vArrow.position.set(0.15, 1.0, 0);
      vGroup.add(vArrow);
      // Tail fin
      const vTail = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5, side: THREE.DoubleSide }));
      vTail.position.set(-0.15, 1.0, 0);
      vGroup.add(vTail);
      // N-S-E-W indicator bars
      const nsBar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), vaneMat);
      nsBar.rotation.z = Math.PI / 2;
      nsBar.position.y = 0.85;
      vGroup.add(nsBar);
      const ewBar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), vaneMat);
      ewBar.rotation.x = Math.PI / 2;
      ewBar.position.y = 0.85;
      vGroup.add(ewBar);
      vGroup.position.set(vx, 5 + Math.random(), vz);
      vGroup.rotation.y = Math.random() * Math.PI * 2;
      this._envGroup.add(vGroup);
    }

    // ═══════════════════════════════════════════════
    // STONE ARCHWAYS in market area (2)
    // ═══════════════════════════════════════════════
    for (const [ax, az, aRot] of [[0, 12, 0], [0, -12, 0]] as [number, number, number][]) {
      const archGroup = new THREE.Group();
      const archStoneMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.8 });
      // Left pillar
      const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4, 0.6), archStoneMat);
      pillarL.position.set(-2, 2, 0);
      pillarL.castShadow = true;
      archGroup.add(pillarL);
      // Right pillar
      const pillarR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4, 0.6), archStoneMat);
      pillarR.position.set(2, 2, 0);
      pillarR.castShadow = true;
      archGroup.add(pillarR);
      // Arch top (half torus)
      const archTop = new THREE.Mesh(
        new THREE.TorusGeometry(2, 0.3, 8, 12, Math.PI),
        archStoneMat
      );
      archTop.position.set(0, 4, 0);
      archTop.rotation.z = Math.PI;
      archTop.castShadow = true;
      archGroup.add(archTop);
      // Keystone
      const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), archStoneMat);
      keystone.position.set(0, 6, 0);
      archGroup.add(keystone);
      archGroup.position.set(ax, 0, az);
      archGroup.rotation.y = aRot;
      this._envGroup.add(archGroup);
    }

    // ═══════════════════════════════════════════════
    // WALL WALKWAY with guard posts
    // ═══════════════════════════════════════════════
    // Walkway planks on top of walls (visible sections)
    const walkwayMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 });
    // North wall walkway
    const nWalkway = new THREE.Mesh(new THREE.BoxGeometry(w - 4, 0.1, 1.2), walkwayMat);
    nWalkway.position.set(0, 4.05, -hd);
    this._envGroup.add(nWalkway);
    // Crenellations on town walls
    for (let ci = 0; ci < 30; ci++) {
      const cren = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3), wallMat);
      cren.position.set(-hw + 1.5 + ci * (w / 30), 4.4, -hd + 0.4);
      this._envGroup.add(cren);
    }
    // Guard torches on walls (4)
    for (const [gtx, gtz] of [[-hw * 0.5, -hd], [hw * 0.5, -hd], [-hw, 0], [hw, 0]] as [number, number][]) {
      const torchGroup = new THREE.Group();
      const tStick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 5),
        new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 }));
      tStick.position.y = 0.4;
      torchGroup.add(tStick);
      const tFlame = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 2.0 }));
      tFlame.position.y = 0.85;
      torchGroup.add(tFlame);
      torchGroup.position.set(gtx, 4.1, gtz);
      this._envGroup.add(torchGroup);
      const gtLight = new THREE.PointLight(0xff8844, 0.4, 8);
      gtLight.position.set(gtx, 5, gtz);
      this._scene.add(gtLight);
      this._torchLights.push(gtLight);
    }

    // ═══════════════════════════════════════════════
    // DOOR AWNINGS on buildings (8)
    // ═══════════════════════════════════════════════
    const awningColors = [0xcc4444, 0x4444cc, 0x44aa44, 0xccaa44, 0xaa44aa, 0x44aaaa, 0xcc6644, 0xaaaa44];
    for (let awi = 0; awi < 8; awi++) {
      const [awx, awz, , awd] = buildingPositions[awi + 2];
      const awGroup = new THREE.Group();
      const awGeo = new THREE.PlaneGeometry(1.2, 0.8);
      const awMat = new THREE.MeshStandardMaterial({ color: awningColors[awi], roughness: 0.7, side: THREE.DoubleSide });
      const aw = new THREE.Mesh(awGeo, awMat);
      aw.rotation.x = -0.5;
      aw.position.set(0, 1.8, awd / 2 + 0.3);
      awGroup.add(aw);
      // Support rods
      for (const rx of [-0.5, 0.5]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4),
          new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.4 }));
        rod.rotation.x = -0.5;
        rod.position.set(rx, 1.6, awd / 2 + 0.2);
        awGroup.add(rod);
      }
      awGroup.position.set(awx, 0, awz);
      this._envGroup.add(awGroup);
    }

    // ═══════════════════════════════════════════════
    // WELL-STOCKED MARKET GOODS
    // ═══════════════════════════════════════════════
    // Fruit/vegetable crates near stalls
    const goodColors = [0xff3333, 0xff8833, 0xffff33, 0x33ff33, 0x8833ff, 0xff33aa];
    for (let gi = 0; gi < 8; gi++) {
      const goodsGroup = new THREE.Group();
      // Wooden crate
      const gCrate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.85 }));
      gCrate.position.y = 0.125;
      goodsGroup.add(gCrate);
      // Small spheres as goods (fruit/vegetables)
      for (let gs = 0; gs < 4; gs++) {
        const good = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4),
          new THREE.MeshStandardMaterial({ color: goodColors[(gi + gs) % goodColors.length], roughness: 0.6 }));
        good.position.set(-0.08 + gs * 0.06, 0.28, (Math.random() - 0.5) * 0.1);
        goodsGroup.add(good);
      }
      const gAngle = (gi / 8) * Math.PI * 2 + 0.3;
      const gR = 6.5;
      goodsGroup.position.set(Math.cos(gAngle) * gR, 0, Math.sin(gAngle) * gR);
      this._envGroup.add(goodsGroup);
    }

    // ═══════════════════════════════════════════════
    // CASTLE HERALDIC BANNERS on walls
    // ═══════════════════════════════════════════════
    const heraldColors = [0xcc2222, 0x2244cc, 0xddaa22];
    for (let hbi = 0; hbi < 6; hbi++) {
      const hBanner = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2.5),
        new THREE.MeshStandardMaterial({ color: heraldColors[hbi % heraldColors.length], roughness: 0.7, side: THREE.DoubleSide }));
      // Hang on town walls
      if (hbi < 3) {
        hBanner.position.set(-hw * 0.5 + hbi * hw * 0.5, 2.5, -hd + 0.55);
      } else {
        hBanner.position.set(-hw * 0.5 + (hbi - 3) * hw * 0.5, 2.5, hd - 0.55);
        hBanner.rotation.y = Math.PI;
      }
      this._envGroup.add(hBanner);
      // Gold fringe at bottom
      const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xddaa22, metalness: 0.5, roughness: 0.3, side: THREE.DoubleSide }));
      fringe.position.copy(hBanner.position);
      fringe.position.y -= 1.25;
      fringe.rotation.y = hBanner.rotation.y;
      this._envGroup.add(fringe);
    }

    // ═══════════════════════════════════════════════
    // STEPPING STONES path to chapel
    // ═══════════════════════════════════════════════
    for (let ss = 0; ss < 8; ss++) {
      const stepStone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25 + Math.random() * 0.1, 0.25, 0.04, 7),
        new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 })
      );
      stepStone.position.set(-3 + (Math.random() - 0.5) * 0.3, 0.02, -10 - ss * 1.3);
      this._envGroup.add(stepStone);
    }

    // ═══════════════════════════════════════════════
    // SMOKE FROM CHIMNEYS (animated puffs)
    // ═══════════════════════════════════════════════
    const smokeMat2 = new THREE.MeshStandardMaterial({ color: 0x999999, transparent: true, opacity: 0.15, roughness: 1.0 });
    for (let sci = 0; sci < 6; sci++) {
      const [scx, scz, scw] = buildingPositions[sci * 2];
      const scH = 3 + ((sci * 2 * 7 + 3) % 5) * 0.4;
      for (let sp = 0; sp < 3; sp++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.15 + sp * 0.08, 5, 4), smokeMat2);
        puff.position.set(scx + scw * 0.25, scH + 1.8 + sp * 0.4, scz);
        puff.scale.set(1 + sp * 0.3, 1 + sp * 0.2, 1 + sp * 0.3);
        this._envGroup.add(puff);
      }
    }

    // Cobblestone path details (12) - small dark circles on ground
    for (let i = 0; i < 12; i++) {
      const cobble = new THREE.Mesh(new THREE.CircleGeometry(0.8 + Math.random() * 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 1.0, side: THREE.DoubleSide }));
      cobble.rotation.x = -Math.PI / 2;
      cobble.position.set((Math.random() - 0.5) * w * 0.4, 0.02, (Math.random() - 0.5) * d * 0.4);
      this._envGroup.add(cobble);
    }

    // Hanging banners on buildings (6)
    const bannerColors = [0xcc2222, 0x2244aa, 0xddaa22, 0x228833, 0x8833aa, 0xcc6622];
    for (let i = 0; i < 6; i++) {
      const bannerGrp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4),
        new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.9 }));
      pole.position.y = 0.6;
      bannerGrp.add(pole);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.6),
        new THREE.MeshStandardMaterial({ color: bannerColors[i], roughness: 0.7, side: THREE.DoubleSide }));
      cloth.position.set(0.2, 0.8, 0);
      bannerGrp.add(cloth);
      const bAngle = (i / 6) * Math.PI * 2;
      bannerGrp.position.set(Math.cos(bAngle) * 8, 2.5, Math.sin(bAngle) * 8);
      bannerGrp.rotation.y = bAngle;
      this._envGroup.add(bannerGrp);
    }

    // Puddles (5) - flat reflective circles
    for (let i = 0; i < 5; i++) {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.3 + Math.random() * 0.4, 10),
        new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.1, metalness: 0.8, side: THREE.DoubleSide }));
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set((Math.random() - 0.5) * w * 0.5, 0.01, (Math.random() - 0.5) * d * 0.5);
      this._envGroup.add(puddle);
    }

    // Chickens wandering (4)
    for (let i = 0; i < 4; i++) {
      const chickenGrp = new THREE.Group();
      const cBody = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5),
        new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 }));
      cBody.scale.set(1.2, 1, 0.8);
      cBody.position.y = 0.12;
      chickenGrp.add(cBody);
      const cHead = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4),
        new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 }));
      cHead.position.set(0.08, 0.2, 0);
      chickenGrp.add(cHead);
      const comb = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 3),
        new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.6 }));
      comb.position.set(0.08, 0.25, 0);
      chickenGrp.add(comb);
      chickenGrp.position.set((Math.random() - 0.5) * w * 0.3, 0, (Math.random() - 0.5) * d * 0.3);
      chickenGrp.rotation.y = Math.random() * Math.PI * 2;
      this._envGroup.add(chickenGrp);
    }

    // Wooden barrels (6) - near tavern area
    for (let i = 0; i < 6; i++) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.85 }));
      barrel.position.set(8 + (i % 3) * 0.5, 0.2, -5 + Math.floor(i / 3) * 0.5);
      barrel.castShadow = true;
      this._envGroup.add(barrel);
      // Metal band
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.01, 4, 12),
        new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.4 }));
      band.position.copy(barrel.position);
      band.position.y += 0.05;
      band.rotation.x = Math.PI / 2;
      this._envGroup.add(band);
    }

    // Hanging lanterns (8) - warm glow along pathways
    for (let i = 0; i < 8; i++) {
      const lanternGrp = new THREE.Group();
      const lFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.5 }));
      lanternGrp.add(lFrame);
      const lGlow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5),
        new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff8822, emissiveIntensity: 1.0 }));
      lanternGrp.add(lGlow);
      const lAngle = (i / 8) * Math.PI * 2;
      lanternGrp.position.set(Math.cos(lAngle) * 6, 2.8, Math.sin(lAngle) * 6);
      this._envGroup.add(lanternGrp);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  VOLCANIC WASTES MAP
  // ════════════════════════════════════════════════════════════════════
  private _buildVolcanicWastes(w: number, d: number): void {
    this._scene.fog = new THREE.FogExp2(0x331100, 0.02);
    this._applyTerrainColors(0x1a0a00, 0x3a2a1a, 1.6);
    this._dirLight.color.setHex(0xff6633);
    this._dirLight.intensity = 1.0;
    this._ambientLight.color.setHex(0x441100);
    this._ambientLight.intensity = 0.5;
    this._hemiLight.color.setHex(0xff4400);
    this._hemiLight.groundColor.setHex(0x220000);

    // Lava rivers (glowing strips)
    const lavaMat = new THREE.MeshStandardMaterial({
      color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8,
      roughness: 0.3, metalness: 0.1,
    });
    for (let i = 0; i < 6; i++) {
      const riverW = 1.5 + Math.random() * 2;
      const riverL = 20 + Math.random() * 30;
      const river = new THREE.Mesh(new THREE.PlaneGeometry(riverW, riverL), lavaMat);
      river.rotation.x = -Math.PI / 2;
      const rvX = (Math.random() - 0.5) * w * 0.7;
      const rvZ = (Math.random() - 0.5) * d * 0.7;
      river.position.set(rvX, getTerrainHeight(rvX, rvZ, 1.6) + 0.05, rvZ);
      river.rotation.z = Math.random() * Math.PI;
      this._envGroup.add(river);

      // Lava glow light
      const lavaLight = new THREE.PointLight(0xff4400, 2, 15);
      lavaLight.position.set(river.position.x, 1, river.position.z);
      this._scene.add(lavaLight);
      this._torchLights.push(lavaLight);
    }

    // Volcanic rocks / boulders (60)
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 });
    const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.2, metalness: 0.5 });
    for (let i = 0; i < 60; i++) {
      const mat = Math.random() < 0.3 ? obsidianMat : rockMat;
      const rSize = 0.3 + Math.random() * 1.5;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rSize, 0), mat);
      const vrX = (Math.random() - 0.5) * w * 0.9;
      const vrZ = (Math.random() - 0.5) * d * 0.9;
      rock.position.set(vrX, getTerrainHeight(vrX, vrZ, 1.6) + rSize * 0.3, vrZ);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      this._envGroup.add(rock);
    }

    // Ash pillars / volcanic columns (20)
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.85 });
    for (let i = 0; i < 20; i++) {
      const pH = 2 + Math.random() * 5;
      const pR = 0.3 + Math.random() * 0.5;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(pR * 0.6, pR, pH, 7), pillarMat);
      pillar.position.set(
        (Math.random() - 0.5) * w * 0.85,
        pH / 2,
        (Math.random() - 0.5) * d * 0.85
      );
      pillar.castShadow = true;
      this._envGroup.add(pillar);
    }

    // Ember particles on ground (40 glowing spots)
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 1.0,
      transparent: true, opacity: 0.7,
    });
    for (let i = 0; i < 40; i++) {
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.1, 5, 4), emberMat);
      ember.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.1 + Math.random() * 0.3,
        (Math.random() - 0.5) * d * 0.8
      );
      this._envGroup.add(ember);
    }

    // Ruined structures (8)
    const ruinMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 });
    for (let i = 0; i < 8; i++) {
      const ruinGroup = new THREE.Group();
      const wallH = 1.5 + Math.random() * 3;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(2 + Math.random() * 2, wallH, 0.3), ruinMat);
      wall.position.y = wallH / 2;
      wall.castShadow = true;
      ruinGroup.add(wall);
      // Broken top edge
      const breakGeo = new THREE.BoxGeometry(0.6, 0.4, 0.35);
      const breakMesh = new THREE.Mesh(breakGeo, ruinMat);
      breakMesh.position.set(0.5, wallH + 0.1, 0);
      breakMesh.rotation.z = 0.3;
      ruinGroup.add(breakMesh);
      const ruX = (Math.random() - 0.5) * w * 0.7;
      const ruZ = (Math.random() - 0.5) * d * 0.7;
      ruinGroup.position.set(ruX, getTerrainHeight(ruX, ruZ, 1.6), ruZ);
      ruinGroup.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(ruinGroup);
    }

    // Smoke vents (12)
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0x444444, transparent: true, opacity: 0.2, roughness: 1.0,
    });
    for (let i = 0; i < 12; i++) {
      const ventGroup = new THREE.Group();
      const ventHole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 0.2, 8), rockMat);
      ventGroup.add(ventHole);
      for (let s = 0; s < 3; s++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.2 + s * 0.15, 5, 4), smokeMat);
        puff.position.y = 0.5 + s * 0.6;
        puff.scale.set(1 + s * 0.3, 1, 1 + s * 0.3);
        ventGroup.add(puff);
      }
      const svX = (Math.random() - 0.5) * w * 0.8;
      const svZ = (Math.random() - 0.5) * d * 0.8;
      ventGroup.position.set(svX, getTerrainHeight(svX, svZ, 1.6), svZ);
      this._envGroup.add(ventGroup);
    }

    // Bone piles (15)
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.8 });
    for (let i = 0; i < 15; i++) {
      const boneGroup = new THREE.Group();
      for (let b = 0; b < 5; b++) {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3 + Math.random() * 0.2, 4), boneMat);
        bone.position.set((Math.random() - 0.5) * 0.3, 0.05, (Math.random() - 0.5) * 0.3);
        bone.rotation.set(Math.random(), Math.random(), Math.random());
        boneGroup.add(bone);
      }
      const bgX = (Math.random() - 0.5) * w * 0.8;
      const bgZ = (Math.random() - 0.5) * d * 0.8;
      boneGroup.position.set(bgX, getTerrainHeight(bgX, bgZ, 1.6), bgZ);
      this._envGroup.add(boneGroup);
    }

    // Cracked ground patches (20)
    const crackMat = new THREE.MeshStandardMaterial({
      color: 0x1a0a00, roughness: 1.0, transparent: true, opacity: 0.6,
    });
    for (let i = 0; i < 20; i++) {
      const crack = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.8 + Math.random() * 0.5, 6),
        crackMat
      );
      crack.rotation.x = -Math.PI / 2;
      crack.position.set(
        (Math.random() - 0.5) * w * 0.85,
        0.02,
        (Math.random() - 0.5) * d * 0.85
      );
      this._envGroup.add(crack);
    }

    // Charred dead trees (15)
    const charredMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
    for (let i = 0; i < 15; i++) {
      const treeGrp = new THREE.Group();
      const trunkH = 2 + Math.random() * 3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, trunkH, 5), charredMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      treeGrp.add(trunk);
      // Bare branches
      const numBranches = 2 + Math.floor(Math.random() * 3);
      for (let b = 0; b < numBranches; b++) {
        const branchLen = 0.5 + Math.random() * 1.0;
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, branchLen, 4), charredMat);
        const branchY = trunkH * 0.5 + Math.random() * trunkH * 0.4;
        const branchAngle = Math.random() * Math.PI * 2;
        branch.position.set(Math.cos(branchAngle) * 0.1, branchY, Math.sin(branchAngle) * 0.1);
        branch.rotation.z = (Math.random() - 0.5) * 1.2;
        branch.rotation.x = (Math.random() - 0.5) * 0.5;
        treeGrp.add(branch);
      }
      const ctX = (Math.random() - 0.5) * w * 0.85;
      const ctZ = (Math.random() - 0.5) * d * 0.85;
      treeGrp.position.set(ctX, getTerrainHeight(ctX, ctZ, 1.6), ctZ);
      this._envGroup.add(treeGrp);
    }

    // Lava pools (circular, bubbling) (5)
    const lavaPoolMat = new THREE.MeshStandardMaterial({
      color: 0xff5500, emissive: 0xff3300, emissiveIntensity: 1.2,
      roughness: 0.2,
    });
    const lavaRimMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 });
    for (let i = 0; i < 5; i++) {
      const poolGrp = new THREE.Group();
      const poolR = 1.5 + Math.random() * 2;
      // Rim
      const rim = new THREE.Mesh(new THREE.TorusGeometry(poolR, 0.3, 6, 12), lavaRimMat);
      rim.rotation.x = -Math.PI / 2;
      rim.position.y = 0.1;
      poolGrp.add(rim);
      // Lava surface
      const pool = new THREE.Mesh(new THREE.CircleGeometry(poolR - 0.1, 12), lavaPoolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.y = 0.08;
      poolGrp.add(pool);
      // Bubbles
      for (let b = 0; b < 4; b++) {
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.1, 5, 4),
          new THREE.MeshStandardMaterial({ color: 0xff7700, emissive: 0xff4400, emissiveIntensity: 1.5, transparent: true, opacity: 0.6 }));
        const bAngle = Math.random() * Math.PI * 2;
        const bR = Math.random() * (poolR - 0.5);
        bubble.position.set(Math.cos(bAngle) * bR, 0.15, Math.sin(bAngle) * bR);
        poolGrp.add(bubble);
      }
      // Pool light
      const poolLight = new THREE.PointLight(0xff4400, 3, 12);
      poolLight.position.y = 1;
      poolGrp.add(poolLight);
      this._torchLights.push(poolLight);
      const plX = (Math.random() - 0.5) * w * 0.65;
      const plZ = (Math.random() - 0.5) * d * 0.65;
      poolGrp.position.set(plX, getTerrainHeight(plX, plZ, 1.6), plZ);
      this._envGroup.add(poolGrp);
    }

    // Volcanic caldera (center-ish) - large terrain feature
    const calderaGrp = new THREE.Group();
    const calderaR = 6;
    const calderaRim = new THREE.Mesh(new THREE.TorusGeometry(calderaR, 1.5, 8, 16), rockMat);
    calderaRim.rotation.x = -Math.PI / 2;
    calderaRim.position.y = 0.5;
    calderaGrp.add(calderaRim);
    // Inner lava
    const calderaLava = new THREE.Mesh(new THREE.CircleGeometry(calderaR - 1, 16), lavaPoolMat);
    calderaLava.rotation.x = -Math.PI / 2;
    calderaLava.position.y = -0.2;
    calderaGrp.add(calderaLava);
    const calderaLight = new THREE.PointLight(0xff4400, 5, 25);
    calderaLight.position.y = 2;
    calderaGrp.add(calderaLight);
    this._torchLights.push(calderaLight);
    calderaGrp.position.set(w * 0.15, getTerrainHeight(w * 0.15, -d * 0.15, 1.6), -d * 0.15);
    this._envGroup.add(calderaGrp);

    // Obsidian shards (sharp crystals) (20)
    const obsidianShardMat = new THREE.MeshStandardMaterial({ color: 0x0a0a15, roughness: 0.1, metalness: 0.7 });
    for (let i = 0; i < 20; i++) {
      const shardH = 0.5 + Math.random() * 2;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.08 + Math.random() * 0.12, shardH, 4), obsidianShardMat);
      shard.position.set(
        (Math.random() - 0.5) * w * 0.85,
        shardH / 2,
        (Math.random() - 0.5) * d * 0.85
      );
      shard.rotation.z = (Math.random() - 0.5) * 0.4;
      shard.rotation.x = (Math.random() - 0.5) * 0.4;
      shard.castShadow = true;
      this._envGroup.add(shard);
    }

    // Ash drifts (ground cover patches) (15)
    const ashMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 1.0, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 15; i++) {
      const ash = new THREE.Mesh(new THREE.CircleGeometry(1 + Math.random() * 2, 8), ashMat);
      ash.rotation.x = -Math.PI / 2;
      ash.position.set(
        (Math.random() - 0.5) * w * 0.9,
        0.03,
        (Math.random() - 0.5) * d * 0.9
      );
      this._envGroup.add(ash);
    }

    // Fallen demonic statues (4)
    const demonStoneMat = new THREE.MeshStandardMaterial({ color: 0x332222, roughness: 0.8 });
    for (let i = 0; i < 4; i++) {
      const statGrp = new THREE.Group();
      // Torso (fallen on side)
      const sTorso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.5), demonStoneMat);
      sTorso.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      sTorso.position.y = 0.3;
      statGrp.add(sTorso);
      // Head
      const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), demonStoneMat);
      sHead.position.set(0.8, 0.2, 0);
      statGrp.add(sHead);
      // Horns
      for (const hx of [-0.15, 0.15]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 4), demonStoneMat);
        horn.position.set(0.8 + hx, 0.5, 0);
        horn.rotation.z = hx < 0 ? 0.3 : -0.3;
        statGrp.add(horn);
      }
      statGrp.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0,
        (Math.random() - 0.5) * d * 0.7
      );
      statGrp.rotation.y = Math.random() * Math.PI * 2;
      this._envGroup.add(statGrp);
    }

    // Fire geysers (6) - tall erupting columns
    for (let i = 0; i < 6; i++) {
      const geyserGrp = new THREE.Group();
      const geyserBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 }));
      geyserBase.position.y = 0.15;
      geyserGrp.add(geyserBase);
      // Fire column
      const fireMat = new THREE.MeshStandardMaterial({
        color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 2.0,
        transparent: true, opacity: 0.5,
      });
      const fireH = 2 + Math.random() * 3;
      const fire = new THREE.Mesh(new THREE.ConeGeometry(0.3, fireH, 6), fireMat);
      fire.position.y = fireH / 2 + 0.3;
      geyserGrp.add(fire);
      const gLight = new THREE.PointLight(0xff4400, 3, 15);
      gLight.position.y = fireH / 2;
      geyserGrp.add(gLight);
      this._torchLights.push(gLight);
      geyserGrp.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
      this._envGroup.add(geyserGrp);
    }

    // Scorched earth patches (15)
    for (let i = 0; i < 15; i++) {
      const scorchR = 1 + Math.random() * 2;
      const scorch = new THREE.Mesh(new THREE.CircleGeometry(scorchR, 8),
        new THREE.MeshStandardMaterial({ color: 0x0a0500, roughness: 1.0, transparent: true, opacity: 0.7 }));
      scorch.rotation.x = -Math.PI / 2;
      scorch.position.set((Math.random() - 0.5) * w * 0.85, 0.02, (Math.random() - 0.5) * d * 0.85);
      this._envGroup.add(scorch);
    }

    // Magma rock formations (6) - stacked boulders
    for (let i = 0; i < 6; i++) {
      const formGrp = new THREE.Group();
      const numRocks = 3 + Math.floor(Math.random() * 3);
      for (let r = 0; r < numRocks; r++) {
        const rSize = 0.5 + Math.random() * 0.8;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rSize, 0),
          new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 }));
        rock.position.set((Math.random() - 0.5) * 1.5, r * 0.8, (Math.random() - 0.5) * 1.5);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        formGrp.add(rock);
      }
      // Glowing cracks between rocks
      const crackGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.0, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
      crackGlow.position.y = 0.5;
      crackGlow.rotation.y = Math.random() * Math.PI;
      formGrp.add(crackGlow);
      formGrp.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
      this._envGroup.add(formGrp);
    }

    // Demon summoning circles (3)
    for (let i = 0; i < 3; i++) {
      const circGrp = new THREE.Group();
      const circMat = new THREE.MeshStandardMaterial({
        color: 0xff2200, emissive: 0xcc1100, emissiveIntensity: 0.6,
        transparent: true, opacity: 0.3, side: THREE.DoubleSide,
      });
      const outerRing = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.0, 8), circMat);
      outerRing.rotation.x = -Math.PI / 2;
      circGrp.add(outerRing);
      const innerRing = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.35, 5), circMat);
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.rotation.z = Math.PI / 5;
      innerRing.position.y = 0.01;
      circGrp.add(innerRing);
      circGrp.position.set((Math.random() - 0.5) * w * 0.6, 0.03, (Math.random() - 0.5) * d * 0.6);
      this._envGroup.add(circGrp);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  ABYSSAL RIFT MAP
  // ════════════════════════════════════════════════════════════════════
  private _buildAbyssalRift(w: number, d: number): void {
    this._scene.fog = new THREE.FogExp2(0x0a0020, 0.035);
    this._applyTerrainColors(0x080616, 0x120e26, 0.5);
    this._dirLight.color.setHex(0x6644aa);
    this._dirLight.intensity = 0.6;
    this._ambientLight.color.setHex(0x110033);
    this._ambientLight.intensity = 0.4;
    this._hemiLight.color.setHex(0x4422aa);
    this._hemiLight.groundColor.setHex(0x000011);

    // Floating stone islands (25)
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.8 });
    for (let i = 0; i < 25; i++) {
      const islandGroup = new THREE.Group();
      const iSize = 1 + Math.random() * 3;
      const island = new THREE.Mesh(new THREE.DodecahedronGeometry(iSize, 1), stoneMat);
      island.scale.y = 0.4;
      island.castShadow = true;
      islandGroup.add(island);
      // Crystals on top of some islands
      if (Math.random() < 0.4) {
        const crystalMat = new THREE.MeshStandardMaterial({
          color: 0x8844ff, emissive: 0x4422aa, emissiveIntensity: 0.5,
          transparent: true, opacity: 0.8,
        });
        const cH = 0.5 + Math.random() * 1.0;
        const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.15, cH, 5), crystalMat);
        crystal.position.y = iSize * 0.3;
        islandGroup.add(crystal);
      }
      islandGroup.position.set(
        (Math.random() - 0.5) * w * 0.9,
        -1 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.9
      );
      this._envGroup.add(islandGroup);
    }

    // Void cracks in the ground (glowing purple fissures) (15)
    const voidMat = new THREE.MeshStandardMaterial({
      color: 0x6622ff, emissive: 0x4400cc, emissiveIntensity: 1.0,
      transparent: true, opacity: 0.6,
    });
    for (let i = 0; i < 15; i++) {
      const fissureW = 0.3 + Math.random() * 0.5;
      const fissureL = 5 + Math.random() * 15;
      const fissure = new THREE.Mesh(new THREE.PlaneGeometry(fissureW, fissureL), voidMat);
      fissure.rotation.x = -Math.PI / 2;
      const fiX = (Math.random() - 0.5) * w * 0.8;
      const fiZ = (Math.random() - 0.5) * d * 0.8;
      fissure.position.set(fiX, getTerrainHeight(fiX, fiZ, 0.5) + 0.03, fiZ);
      fissure.rotation.z = Math.random() * Math.PI;
      this._envGroup.add(fissure);
    }

    // Void lights
    for (let i = 0; i < 8; i++) {
      const voidLight = new THREE.PointLight(0x6622ff, 3, 20);
      voidLight.position.set(
        (Math.random() - 0.5) * w * 0.7,
        2,
        (Math.random() - 0.5) * d * 0.7
      );
      this._scene.add(voidLight);
      this._torchLights.push(voidLight);
    }

    // Twisted spires (15)
    const spireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.7, metalness: 0.3 });
    for (let i = 0; i < 15; i++) {
      const spireGroup = new THREE.Group();
      const sH = 3 + Math.random() * 8;
      const sR = 0.2 + Math.random() * 0.4;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(sR, sH, 6), spireMat);
      spire.position.y = sH / 2;
      spire.rotation.z = (Math.random() - 0.5) * 0.3;
      spire.rotation.x = (Math.random() - 0.5) * 0.3;
      spire.castShadow = true;
      spireGroup.add(spire);
      const spX = (Math.random() - 0.5) * w * 0.85;
      const spZ = (Math.random() - 0.5) * d * 0.85;
      spireGroup.position.set(spX, getTerrainHeight(spX, spZ, 0.5), spZ);
      this._envGroup.add(spireGroup);
    }

    // Eldritch runes on ground (20 glowing circles)
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0xaa44ff, emissive: 0x6622cc, emissiveIntensity: 0.8,
      transparent: true, opacity: 0.4,
    });
    for (let i = 0; i < 20; i++) {
      const rune = new THREE.Mesh(
        new THREE.RingGeometry(0.4, 0.6 + Math.random() * 0.3, 8),
        runeMat
      );
      rune.rotation.x = -Math.PI / 2;
      const rnX = (Math.random() - 0.5) * w * 0.8;
      const rnZ = (Math.random() - 0.5) * d * 0.8;
      rune.position.set(rnX, getTerrainHeight(rnX, rnZ, 0.5) + 0.02, rnZ);
      this._envGroup.add(rune);
    }

    // Shattered pillars (12)
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.8 });
    for (let i = 0; i < 12; i++) {
      const pillarGroup = new THREE.Group();
      const pH = 2 + Math.random() * 4;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, pH, 8), pillarMat);
      pillar.position.y = pH / 2;
      pillar.castShadow = true;
      pillarGroup.add(pillar);
      // Broken top
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 0.3, 8), pillarMat);
      cap.position.y = pH;
      pillarGroup.add(cap);
      const piX = (Math.random() - 0.5) * w * 0.8;
      const piZ = (Math.random() - 0.5) * d * 0.8;
      pillarGroup.position.set(piX, getTerrainHeight(piX, piZ, 0.5), piZ);
      pillarGroup.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(pillarGroup);
    }

    // Chains hanging from nothing (8)
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.7, roughness: 0.3 });
    for (let i = 0; i < 8; i++) {
      const chainGroup = new THREE.Group();
      const links = 8 + Math.floor(Math.random() * 8);
      for (let c = 0; c < links; c++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 6), chainMat);
        link.position.y = -c * 0.12;
        link.rotation.y = c % 2 === 0 ? 0 : Math.PI / 2;
        chainGroup.add(link);
      }
      chainGroup.position.set(
        (Math.random() - 0.5) * w * 0.7,
        6 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.7
      );
      this._envGroup.add(chainGroup);
    }

    // Entropy orbs (floating glowing spheres) (10)
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0xcc66ff, emissive: 0x8833cc, emissiveIntensity: 1.2,
      transparent: true, opacity: 0.5,
    });
    for (let i = 0; i < 10; i++) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 8, 6), orbMat);
      orb.position.set(
        (Math.random() - 0.5) * w * 0.8,
        2 + Math.random() * 4,
        (Math.random() - 0.5) * d * 0.8
      );
      this._envGroup.add(orb);
    }

    // Dark fog patches (15)
    const darkFogMat = new THREE.MeshStandardMaterial({
      color: 0x110022, transparent: true, opacity: 0.2, roughness: 1.0,
    });
    for (let i = 0; i < 15; i++) {
      const fog = new THREE.Mesh(
        new THREE.PlaneGeometry(3 + Math.random() * 4, 3 + Math.random() * 4),
        darkFogMat
      );
      fog.rotation.x = -Math.PI / 2;
      fog.position.set(
        (Math.random() - 0.5) * w * 0.9,
        0.3 + Math.random() * 0.5,
        (Math.random() - 0.5) * d * 0.9
      );
      this._envGroup.add(fog);
    }

    // Void tentacles (8) - curved segmented cylinders reaching up
    const tentacleMat = new THREE.MeshStandardMaterial({
      color: 0x220044, roughness: 0.6, emissive: 0x110022, emissiveIntensity: 0.3,
    });
    for (let i = 0; i < 8; i++) {
      const tentGrp = new THREE.Group();
      const segs = 8 + Math.floor(Math.random() * 6);
      const baseAngle = Math.random() * Math.PI * 2;
      let tx = 0, ty = 0, tz = 0;
      for (let s = 0; s < segs; s++) {
        const segR = 0.12 - (s / segs) * 0.08;
        const seg = new THREE.Mesh(new THREE.SphereGeometry(segR, 5, 4), tentacleMat);
        ty += 0.25;
        tx += Math.sin(baseAngle + s * 0.4) * 0.15;
        tz += Math.cos(baseAngle + s * 0.4) * 0.15;
        seg.position.set(tx, ty, tz);
        tentGrp.add(seg);
      }
      const tnX = (Math.random() - 0.5) * w * 0.8;
      const tnZ = (Math.random() - 0.5) * d * 0.8;
      tentGrp.position.set(tnX, getTerrainHeight(tnX, tnZ, 0.5), tnZ);
      this._envGroup.add(tentGrp);
    }

    // Unstable portals (4) - torus rings with glowing center
    for (let i = 0; i < 4; i++) {
      const portalGrp = new THREE.Group();
      const portalR = 1.5 + Math.random() * 1;
      const portalTorus = new THREE.Mesh(
        new THREE.TorusGeometry(portalR, 0.15, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0x6622ff, emissive: 0x4400cc, emissiveIntensity: 1.0, metalness: 0.3, roughness: 0.4 })
      );
      portalGrp.add(portalTorus);
      // Swirling center
      const portalCenter = new THREE.Mesh(
        new THREE.CircleGeometry(portalR - 0.2, 12),
        new THREE.MeshStandardMaterial({
          color: 0x3311aa, emissive: 0x2200cc, emissiveIntensity: 0.8,
          transparent: true, opacity: 0.4, side: THREE.DoubleSide,
        })
      );
      portalGrp.add(portalCenter);
      // Inner ring
      const innerRing = new THREE.Mesh(
        new THREE.TorusGeometry(portalR * 0.6, 0.06, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0xaa66ff, emissive: 0x8844cc, emissiveIntensity: 0.6 })
      );
      portalGrp.add(innerRing);
      // Portal light
      const portalLight = new THREE.PointLight(0x6622ff, 4, 15);
      portalGrp.add(portalLight);
      this._torchLights.push(portalLight);
      portalGrp.position.set(
        (Math.random() - 0.5) * w * 0.6,
        2 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.6
      );
      portalGrp.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      this._envGroup.add(portalGrp);
    }

    // Corrupted altar (centerpiece)
    const altarGrp = new THREE.Group();
    const altarBaseMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.7 });
    // Platform steps
    for (let step = 0; step < 3; step++) {
      const stepSize = 3 - step * 0.8;
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(stepSize, 0.25, stepSize), altarBaseMat);
      stepMesh.position.y = step * 0.25 + 0.125;
      stepMesh.castShadow = true;
      altarGrp.add(stepMesh);
    }
    // Central obelisk
    const obelisk = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 0.4), altarBaseMat);
    obelisk.position.y = 2.25;
    obelisk.castShadow = true;
    altarGrp.add(obelisk);
    // Obelisk top - pyramid
    const obeliskTop = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.6, 4),
      new THREE.MeshStandardMaterial({ color: 0x6622ff, emissive: 0x4400cc, emissiveIntensity: 1.5 })
    );
    obeliskTop.position.y = 3.9;
    obeliskTop.rotation.y = Math.PI / 4;
    altarGrp.add(obeliskTop);
    // Rune circles around altar
    for (let r = 0; r < 3; r++) {
      const runeRing = new THREE.Mesh(
        new THREE.RingGeometry(1.8 + r * 0.8, 2 + r * 0.8, 12),
        new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x6622cc, emissiveIntensity: 0.6, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
      );
      runeRing.rotation.x = -Math.PI / 2;
      runeRing.position.y = 0.05;
      altarGrp.add(runeRing);
    }
    // Altar light
    const altarLight = new THREE.PointLight(0x8844ff, 5, 20);
    altarLight.position.y = 4.5;
    altarGrp.add(altarLight);
    this._torchLights.push(altarLight);
    altarGrp.position.set(0, 0, 0);
    this._envGroup.add(altarGrp);

    // Soul wisps (20) - small ghostly floating lights
    const wispMat = new THREE.MeshStandardMaterial({
      color: 0xaaddff, emissive: 0x88bbff, emissiveIntensity: 1.5,
      transparent: true, opacity: 0.3,
    });
    for (let i = 0; i < 20; i++) {
      const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 5, 4), wispMat);
      wisp.position.set(
        (Math.random() - 0.5) * w * 0.85,
        1 + Math.random() * 5,
        (Math.random() - 0.5) * d * 0.85
      );
      this._envGroup.add(wisp);
      // Wisp trail
      const trail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.005, 0.3, 4),
        new THREE.MeshStandardMaterial({ color: 0x8899ff, emissive: 0x6677cc, emissiveIntensity: 0.8, transparent: true, opacity: 0.2 })
      );
      trail.position.copy(wisp.position);
      trail.position.y -= 0.2;
      this._envGroup.add(trail);
    }

    // Dimensional tears (6) - vertical glowing cracks in space
    for (let i = 0; i < 6; i++) {
      const tearGrp = new THREE.Group();
      const tearH = 3 + Math.random() * 4;
      // Main tear - thin glowing strip
      const tear = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, tearH),
        new THREE.MeshStandardMaterial({
          color: 0xffffff, emissive: 0xccaaff, emissiveIntensity: 2.0,
          transparent: true, opacity: 0.7, side: THREE.DoubleSide,
        })
      );
      tear.position.y = tearH / 2 + 1;
      tearGrp.add(tear);
      // Glow aura around tear
      const aura = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, tearH + 0.5),
        new THREE.MeshStandardMaterial({
          color: 0x6622ff, emissive: 0x4411aa, emissiveIntensity: 0.5,
          transparent: true, opacity: 0.15, side: THREE.DoubleSide,
        })
      );
      aura.position.y = tearH / 2 + 1;
      tearGrp.add(aura);
      // Tear light
      const tearLight = new THREE.PointLight(0xaa88ff, 2, 10);
      tearLight.position.y = tearH / 2 + 1;
      tearGrp.add(tearLight);
      this._torchLights.push(tearLight);
      tearGrp.position.set(
        (Math.random() - 0.5) * w * 0.75,
        0,
        (Math.random() - 0.5) * d * 0.75
      );
      tearGrp.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(tearGrp);
    }

    // Corrupted growth / void coral (12)
    const coralMat = new THREE.MeshStandardMaterial({ color: 0x2a1144, roughness: 0.6, emissive: 0x110033, emissiveIntensity: 0.2 });
    for (let i = 0; i < 12; i++) {
      const coralGrp = new THREE.Group();
      const branches = 3 + Math.floor(Math.random() * 4);
      for (let b = 0; b < branches; b++) {
        const bH = 0.5 + Math.random() * 1.5;
        const branch = new THREE.Mesh(new THREE.ConeGeometry(0.06 + Math.random() * 0.08, bH, 4), coralMat);
        branch.position.set((Math.random() - 0.5) * 0.3, bH / 2, (Math.random() - 0.5) * 0.3);
        branch.rotation.z = (Math.random() - 0.5) * 0.6;
        branch.rotation.x = (Math.random() - 0.5) * 0.6;
        coralGrp.add(branch);
      }
      coralGrp.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0,
        (Math.random() - 0.5) * d * 0.8
      );
      this._envGroup.add(coralGrp);
    }

    // Gravity-defying rock arches (4)
    for (let i = 0; i < 4; i++) {
      const archGrp = new THREE.Group();
      const archMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.8 });
      for (const side of [-1, 1]) {
        const archPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 5, 6), archMat);
        archPillar.position.set(side * 2, 2.5, 0);
        archPillar.castShadow = true;
        archGrp.add(archPillar);
      }
      const archTop = new THREE.Mesh(new THREE.TorusGeometry(2, 0.3, 6, 8, Math.PI), archMat);
      archTop.position.y = 5;
      archTop.rotation.z = Math.PI;
      archGrp.add(archTop);
      // Void energy under arch
      const voidEnergy = new THREE.Mesh(new THREE.PlaneGeometry(3, 4),
        new THREE.MeshStandardMaterial({ color: 0x6622ff, emissive: 0x4400cc, emissiveIntensity: 0.5, transparent: true, opacity: 0.15, side: THREE.DoubleSide }));
      voidEnergy.position.y = 3;
      archGrp.add(voidEnergy);
      archGrp.position.set((Math.random() - 0.5) * w * 0.6, 0, (Math.random() - 0.5) * d * 0.6);
      archGrp.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(archGrp);
    }

    // Abyssal eye formations (5) - watching from the void
    for (let i = 0; i < 5; i++) {
      const eyeGrp = new THREE.Group();
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x331155, emissive: 0x220044, emissiveIntensity: 0.5, roughness: 0.3 }));
      eyeGrp.add(eyeWhite);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5),
        new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xcc00cc, emissiveIntensity: 2.0 }));
      pupil.position.z = 0.22;
      eyeGrp.add(pupil);
      eyeGrp.position.set(
        (Math.random() - 0.5) * w * 0.7,
        3 + Math.random() * 5,
        (Math.random() - 0.5) * d * 0.7
      );
      eyeGrp.lookAt(0, 0, 0);
      this._envGroup.add(eyeGrp);
    }

    // Fractured ground platforms (8)
    for (let i = 0; i < 8; i++) {
      const platSize = 2 + Math.random() * 3;
      const plat = new THREE.Mesh(new THREE.DodecahedronGeometry(platSize, 0),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 }));
      plat.scale.y = 0.15;
      plat.position.set(
        (Math.random() - 0.5) * w * 0.85,
        -0.5 + Math.random() * 0.5,
        (Math.random() - 0.5) * d * 0.85
      );
      plat.rotation.y = Math.random() * Math.PI;
      plat.receiveShadow = true;
      this._envGroup.add(plat);
    }

    // Void lightning bolts (frozen) (6)
    const boltMat = new THREE.MeshStandardMaterial({
      color: 0xaa66ff, emissive: 0x8844cc, emissiveIntensity: 1.5,
      transparent: true, opacity: 0.6,
    });
    for (let i = 0; i < 6; i++) {
      const boltGrp = new THREE.Group();
      let bx = 0, by = 0;
      for (let s = 0; s < 8; s++) {
        const segLen = 0.5 + Math.random() * 0.8;
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, segLen, 4), boltMat);
        bx += (Math.random() - 0.5) * 0.6;
        by += segLen * 0.8;
        seg.position.set(bx, by, 0);
        seg.rotation.z = (Math.random() - 0.5) * 0.8;
        boltGrp.add(seg);
      }
      boltGrp.position.set(
        (Math.random() - 0.5) * w * 0.7,
        1,
        (Math.random() - 0.5) * d * 0.7
      );
      this._envGroup.add(boltGrp);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  DRAGON'S SANCTUM MAP
  // ════════════════════════════════════════════════════════════════════
  private _buildDragonsSanctum(w: number, d: number): void {
    this._scene.fog = new THREE.FogExp2(0x221100, 0.015);
    this._applyTerrainColors(0x2a1a0a, 0x4a3a2a, 1.2);
    this._dirLight.color.setHex(0xffaa44);
    this._dirLight.intensity = 1.2;
    this._ambientLight.color.setHex(0x332200);
    this._ambientLight.intensity = 0.5;
    this._hemiLight.color.setHex(0xffcc66);
    this._hemiLight.groundColor.setHex(0x221100);

    // Gold piles (30)
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700, metalness: 0.8, roughness: 0.2,
      emissive: 0x664400, emissiveIntensity: 0.2,
    });
    for (let i = 0; i < 30; i++) {
      const pileGroup = new THREE.Group();
      const pileSize = 0.3 + Math.random() * 0.8;
      const pile = new THREE.Mesh(new THREE.SphereGeometry(pileSize, 6, 4), goldMat);
      pile.scale.y = 0.4;
      pile.position.y = pileSize * 0.2;
      pileGroup.add(pile);
      // Individual coins
      for (let c = 0; c < 5; c++) {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 6), goldMat);
        coin.position.set(
          (Math.random() - 0.5) * pileSize,
          0.02,
          (Math.random() - 0.5) * pileSize
        );
        coin.rotation.x = Math.random() * 0.5;
        pileGroup.add(coin);
      }
      const gpX = (Math.random() - 0.5) * w * 0.85;
      const gpZ = (Math.random() - 0.5) * d * 0.85;
      pileGroup.position.set(gpX, getTerrainHeight(gpX, gpZ, 1.2), gpZ);
      this._envGroup.add(pileGroup);
    }

    // Massive stone columns (cavern pillars) (20)
    const cavernMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.85 });
    for (let i = 0; i < 20; i++) {
      const colGroup = new THREE.Group();
      const cH = 8 + Math.random() * 6;
      const cR = 0.5 + Math.random() * 0.8;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(cR * 0.8, cR, cH, 8), cavernMat);
      col.position.y = cH / 2;
      col.castShadow = true;
      colGroup.add(col);
      // Capital on top
      const capGeo = new THREE.CylinderGeometry(cR * 1.2, cR * 0.8, 0.5, 8);
      const cap = new THREE.Mesh(capGeo, cavernMat);
      cap.position.y = cH;
      colGroup.add(cap);
      const clX = (Math.random() - 0.5) * w * 0.85;
      const clZ = (Math.random() - 0.5) * d * 0.85;
      colGroup.position.set(clX, getTerrainHeight(clX, clZ, 1.2), clZ);
      this._envGroup.add(colGroup);
    }

    // Dragon eggs (10)
    const eggColors = [0xcc4422, 0x22cc44, 0x4422cc, 0xcccc22, 0xcc22cc];
    for (let i = 0; i < 10; i++) {
      const egg = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 8, 6),
        new THREE.MeshStandardMaterial({
          color: eggColors[i % eggColors.length], roughness: 0.4, metalness: 0.3,
          emissive: eggColors[i % eggColors.length], emissiveIntensity: 0.15,
        })
      );
      egg.scale.y = 1.3;
      const egX = (Math.random() - 0.5) * w * 0.6;
      const egZ = (Math.random() - 0.5) * d * 0.6;
      egg.position.set(egX, getTerrainHeight(egX, egZ, 1.2) + 0.2, egZ);
      egg.castShadow = true;
      this._envGroup.add(egg);
    }

    // Stalactites (hanging from above) (30)
    const stalMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.9 });
    for (let i = 0; i < 30; i++) {
      const sH = 1 + Math.random() * 3;
      const stal = new THREE.Mesh(new THREE.ConeGeometry(0.15 + Math.random() * 0.2, sH, 5), stalMat);
      stal.rotation.z = Math.PI; // point downward
      stal.position.set(
        (Math.random() - 0.5) * w * 0.9,
        10 + Math.random() * 4,
        (Math.random() - 0.5) * d * 0.9
      );
      this._envGroup.add(stal);
    }

    // Stalagmites (floor) (25)
    for (let i = 0; i < 25; i++) {
      const sH = 0.5 + Math.random() * 2;
      const stalag = new THREE.Mesh(new THREE.ConeGeometry(0.15 + Math.random() * 0.25, sH, 5), stalMat);
      stalag.position.set(
        (Math.random() - 0.5) * w * 0.9,
        sH / 2,
        (Math.random() - 0.5) * d * 0.9
      );
      stalag.castShadow = true;
      this._envGroup.add(stalag);
    }

    // Fire braziers (12)
    const brazierMat = new THREE.MeshStandardMaterial({ color: 0x555544, metalness: 0.5, roughness: 0.4 });
    for (let i = 0; i < 12; i++) {
      const bGroup = new THREE.Group();
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.4, 8), brazierMat);
      bowl.position.y = 1.2;
      bGroup.add(bowl);
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 6), brazierMat);
      stand.position.y = 0.6;
      bGroup.add(stand);
      // Fire
      const fireMat = new THREE.MeshStandardMaterial({
        color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.5,
        transparent: true, opacity: 0.8,
      });
      const fire = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 5), fireMat);
      fire.position.y = 1.6;
      bGroup.add(fire);

      const fireLight = new THREE.PointLight(0xff6600, 3, 18);
      fireLight.position.set(0, 2, 0);
      bGroup.add(fireLight);
      this._torchLights.push(fireLight);

      const brX = (Math.random() - 0.5) * w * 0.8;
      const brZ = (Math.random() - 0.5) * d * 0.8;
      bGroup.position.set(brX, getTerrainHeight(brX, brZ, 1.2), brZ);
      this._envGroup.add(bGroup);
    }

    // Dragon skulls (6)
    const skullMat = new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.7 });
    for (let i = 0; i < 6; i++) {
      const skullGroup = new THREE.Group();
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 5), skullMat);
      head.scale.set(1.5, 0.8, 1);
      skullGroup.add(head);
      // Snout
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.8), skullMat);
      snout.position.set(0, -0.1, 0.7);
      skullGroup.add(snout);
      // Horns
      for (const hx of [-0.4, 0.4]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 5), skullMat);
        horn.position.set(hx, 0.5, -0.2);
        horn.rotation.z = hx < 0 ? 0.4 : -0.4;
        skullGroup.add(horn);
      }
      // Eye sockets (dark)
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
      for (const ex of [-0.25, 0.25]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), eyeMat);
        eye.position.set(ex, 0.15, 0.55);
        skullGroup.add(eye);
      }
      const dsX = (Math.random() - 0.5) * w * 0.7;
      const dsZ = (Math.random() - 0.5) * d * 0.7;
      skullGroup.position.set(dsX, getTerrainHeight(dsX, dsZ, 1.2) + 0.3, dsZ);
      skullGroup.rotation.y = Math.random() * Math.PI * 2;
      this._envGroup.add(skullGroup);
    }

    // Broken weapon piles (10)
    const weaponMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.6, roughness: 0.4 });
    for (let i = 0; i < 10; i++) {
      const wpGroup = new THREE.Group();
      for (let s = 0; s < 4; s++) {
        const sword = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6 + Math.random() * 0.4, 0.02), weaponMat);
        sword.position.set((Math.random() - 0.5) * 0.4, 0.1, (Math.random() - 0.5) * 0.4);
        sword.rotation.set(Math.random() * 0.5, Math.random(), Math.random() * 0.5);
        wpGroup.add(sword);
      }
      const wpX = (Math.random() - 0.5) * w * 0.8;
      const wpZ = (Math.random() - 0.5) * d * 0.8;
      wpGroup.position.set(wpX, getTerrainHeight(wpX, wpZ, 1.2), wpZ);
      this._envGroup.add(wpGroup);
    }

    // Molten cracks (8)
    const moltenMat = new THREE.MeshStandardMaterial({
      color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.5,
    });
    for (let i = 0; i < 8; i++) {
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 8 + Math.random() * 10), moltenMat);
      crack.rotation.x = -Math.PI / 2;
      crack.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0.04,
        (Math.random() - 0.5) * d * 0.7
      );
      crack.rotation.z = Math.random() * Math.PI;
      this._envGroup.add(crack);
    }

    // Treasure chests (8)
    const chestWoodMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
    const chestMetalMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.7, roughness: 0.2 });
    for (let i = 0; i < 8; i++) {
      const chestGrp = new THREE.Group();
      const chestBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.4), chestWoodMat);
      chestBase.position.y = 0.15;
      chestBase.castShadow = true;
      chestGrp.add(chestBase);
      const chestLid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.62, 8, 1, false, 0, Math.PI), chestWoodMat);
      chestLid.rotation.z = Math.PI / 2;
      chestLid.position.y = 0.3;
      chestGrp.add(chestLid);
      // Metal bands
      for (const bz of [-0.12, 0, 0.12]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.03), chestMetalMat);
        band.position.set(0, 0.15, bz);
        chestGrp.add(band);
      }
      // Lock
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), chestMetalMat);
      lock.position.set(0, 0.2, 0.22);
      chestGrp.add(lock);
      const tcX = (Math.random() - 0.5) * w * 0.7;
      const tcZ = (Math.random() - 0.5) * d * 0.7;
      chestGrp.position.set(tcX, getTerrainHeight(tcX, tcZ, 1.2), tcZ);
      chestGrp.rotation.y = Math.random() * Math.PI * 2;
      this._envGroup.add(chestGrp);
    }

    // Gem clusters (12)
    const gemColors = [0xff2244, 0x2244ff, 0x22ff44, 0xff44ff, 0x44ffff, 0xffaa22];
    for (let i = 0; i < 12; i++) {
      const gemGrp = new THREE.Group();
      const numGems = 3 + Math.floor(Math.random() * 4);
      for (let g = 0; g < numGems; g++) {
        const gColor = gemColors[Math.floor(Math.random() * gemColors.length)];
        const gem = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.06 + Math.random() * 0.1, 0),
          new THREE.MeshStandardMaterial({ color: gColor, emissive: gColor, emissiveIntensity: 0.3, metalness: 0.3, roughness: 0.2 })
        );
        gem.position.set((Math.random() - 0.5) * 0.4, Math.random() * 0.15, (Math.random() - 0.5) * 0.4);
        gem.rotation.set(Math.random(), Math.random(), Math.random());
        gemGrp.add(gem);
      }
      gemGrp.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.05,
        (Math.random() - 0.5) * d * 0.8
      );
      this._envGroup.add(gemGrp);
    }

    // Ancient rune-carved pillars (8)
    const runePillarMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.7 });
    for (let i = 0; i < 8; i++) {
      const rpGrp = new THREE.Group();
      const rpH = 5 + Math.random() * 4;
      const rpCol = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, rpH, 8), runePillarMat);
      rpCol.position.y = rpH / 2;
      rpCol.castShadow = true;
      rpGrp.add(rpCol);
      // Glowing runes spiraling up
      for (let r = 0; r < 6; r++) {
        const runeAngle = (r / 6) * Math.PI * 4;
        const runeY = (r / 6) * rpH + 0.5;
        const rune = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.15, 0.03),
          new THREE.MeshStandardMaterial({ color: 0xffaa22, emissive: 0xff8800, emissiveIntensity: 0.8 })
        );
        rune.position.set(Math.cos(runeAngle) * 0.55, runeY, Math.sin(runeAngle) * 0.55);
        rune.lookAt(new THREE.Vector3(0, runeY, 0));
        rpGrp.add(rune);
      }
      const rpX = (Math.random() - 0.5) * w * 0.75;
      const rpZ = (Math.random() - 0.5) * d * 0.75;
      rpGrp.position.set(rpX, getTerrainHeight(rpX, rpZ, 1.2), rpZ);
      this._envGroup.add(rpGrp);
    }

    // Hanging chains with shackles (10)
    const dsChainMat = new THREE.MeshStandardMaterial({ color: 0x555544, metalness: 0.6, roughness: 0.3 });
    for (let i = 0; i < 10; i++) {
      const chainGrp = new THREE.Group();
      const numLinks = 6 + Math.floor(Math.random() * 6);
      for (let c = 0; c < numLinks; c++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 6), dsChainMat);
        link.position.y = -c * 0.1;
        link.rotation.y = c % 2 === 0 ? 0 : Math.PI / 2;
        chainGrp.add(link);
      }
      // Shackle at bottom
      const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 5, 8, Math.PI), dsChainMat);
      shackle.position.y = -numLinks * 0.1 - 0.05;
      shackle.rotation.x = Math.PI;
      chainGrp.add(shackle);
      chainGrp.position.set(
        (Math.random() - 0.5) * w * 0.7,
        8 + Math.random() * 4,
        (Math.random() - 0.5) * d * 0.7
      );
      this._envGroup.add(chainGrp);
    }

    // Cavern wall segments (curved backdrop) (6)
    const wallSegMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const wallAngle = (i / 6) * Math.PI * 2;
      const wallR = w * 0.42;
      const wallH = 10 + Math.random() * 5;
      const wallSeg = new THREE.Mesh(new THREE.BoxGeometry(8, wallH, 0.8), wallSegMat);
      wallSeg.position.set(Math.cos(wallAngle) * wallR, wallH / 2, Math.sin(wallAngle) * wallR);
      wallSeg.rotation.y = -wallAngle + Math.PI / 2;
      wallSeg.castShadow = true;
      wallSeg.receiveShadow = true;
      this._envGroup.add(wallSeg);
    }

    // Scattered armor pieces (6)
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 });
    for (let i = 0; i < 6; i++) {
      const armorGrp = new THREE.Group();
      // Shield
      const shield = new THREE.Mesh(new THREE.CircleGeometry(0.25, 6), armorMat);
      shield.rotation.x = -0.8;
      shield.position.y = 0.1;
      armorGrp.add(shield);
      // Helmet
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), armorMat);
      helmet.scale.y = 0.7;
      helmet.position.set(0.2, 0.08, 0.15);
      armorGrp.add(helmet);
      const arX = (Math.random() - 0.5) * w * 0.75;
      const arZ = (Math.random() - 0.5) * d * 0.75;
      armorGrp.position.set(arX, getTerrainHeight(arX, arZ, 1.2), arZ);
      armorGrp.rotation.y = Math.random() * Math.PI * 2;
      this._envGroup.add(armorGrp);
    }

    // Dragon sleeping mound (1 centerpiece)
    const moundGrp = new THREE.Group();
    const moundMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.85 });
    // Large body (elongated sphere)
    const dragonBody = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), moundMat);
    dragonBody.scale.set(2, 0.6, 1);
    dragonBody.position.y = 1.2;
    moundGrp.add(dragonBody);
    // Neck
    const dragonNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1, 3, 6), moundMat);
    dragonNeck.position.set(4, 1.5, 0);
    dragonNeck.rotation.z = Math.PI / 3;
    moundGrp.add(dragonNeck);
    // Head
    const dragonHead = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 5), moundMat);
    dragonHead.scale.set(1.5, 0.7, 1);
    dragonHead.position.set(5.5, 2.5, 0);
    moundGrp.add(dragonHead);
    // Snout
    const dragonSnout = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.6), moundMat);
    dragonSnout.position.set(6.5, 2.3, 0);
    moundGrp.add(dragonSnout);
    // Horns
    for (const hz of [-0.3, 0.3]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.8, 5), cavernMat);
      horn.position.set(5.3, 3.2, hz);
      horn.rotation.z = hz < 0 ? 0.3 : -0.3;
      moundGrp.add(horn);
    }
    // Tail
    for (let t = 0; t < 8; t++) {
      const tailSeg = new THREE.Mesh(new THREE.SphereGeometry(0.8 - t * 0.08, 5, 4), moundMat);
      tailSeg.position.set(-3 - t * 1, 0.6 - t * 0.05, Math.sin(t * 0.4) * 0.8);
      moundGrp.add(tailSeg);
    }
    // Wings (folded)
    for (const wz of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(4, 2),
        new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8, side: THREE.DoubleSide }));
      wing.position.set(0, 2.5, wz * 2);
      wing.rotation.x = wz * 0.8;
      wing.rotation.z = 0.3;
      moundGrp.add(wing);
    }
    // Sleeping smoke from nostrils
    for (let s = 0; s < 3; s++) {
      const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.15 + s * 0.1, 5, 4),
        new THREE.MeshStandardMaterial({ color: 0x444444, transparent: true, opacity: 0.15 - s * 0.04 }));
      smoke.position.set(7.2 + s * 0.3, 2.5 + s * 0.3, 0);
      moundGrp.add(smoke);
    }
    moundGrp.position.set(-w * 0.15, getTerrainHeight(-w * 0.15, d * 0.15, 1.2), d * 0.15);
    this._envGroup.add(moundGrp);

    // Jeweled goblets (10)
    const gobletMat = new THREE.MeshStandardMaterial({ color: 0xddaa22, metalness: 0.7, roughness: 0.2 });
    for (let i = 0; i < 10; i++) {
      const gobGrp = new THREE.Group();
      const gobBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.03, 6), gobletMat);
      gobGrp.add(gobBase);
      const gobStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.12, 5), gobletMat);
      gobStem.position.y = 0.06;
      gobGrp.add(gobStem);
      const gobCup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.06, 6), gobletMat);
      gobCup.position.y = 0.15;
      gobGrp.add(gobCup);
      // Gem on goblet
      const gemColor = [0xff2244, 0x2244ff, 0x22ff44][i % 3];
      const gobGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.015, 0),
        new THREE.MeshStandardMaterial({ color: gemColor, emissive: gemColor, emissiveIntensity: 0.4 }));
      gobGem.position.set(0.05, 0.15, 0);
      gobGrp.add(gobGem);
      gobGrp.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0.02,
        (Math.random() - 0.5) * d * 0.7
      );
      this._envGroup.add(gobGrp);
    }

    // Lava veins in cavern floor (10)
    const lavaVeinMat = new THREE.MeshStandardMaterial({
      color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8,
      transparent: true, opacity: 0.4,
    });
    for (let i = 0; i < 10; i++) {
      const veinLen = 5 + Math.random() * 10;
      const vein = new THREE.Mesh(new THREE.PlaneGeometry(0.2, veinLen), lavaVeinMat);
      vein.rotation.x = -Math.PI / 2;
      vein.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.03,
        (Math.random() - 0.5) * d * 0.8
      );
      vein.rotation.z = Math.random() * Math.PI;
      this._envGroup.add(vein);
    }

    // Cavern ceiling stalactite clusters (6)
    for (let i = 0; i < 6; i++) {
      const clustGrp = new THREE.Group();
      const numStal = 5 + Math.floor(Math.random() * 5);
      for (let s = 0; s < numStal; s++) {
        const sH = 0.5 + Math.random() * 2;
        const stal = new THREE.Mesh(new THREE.ConeGeometry(0.1 + Math.random() * 0.15, sH, 5), stalMat);
        stal.rotation.z = Math.PI;
        stal.position.set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
        clustGrp.add(stal);
      }
      clustGrp.position.set(
        (Math.random() - 0.5) * w * 0.8,
        12 + Math.random() * 3,
        (Math.random() - 0.5) * d * 0.8
      );
      this._envGroup.add(clustGrp);
    }

    // Ancient dragon claw marks on ground (8)
    const clawMat = new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 1.0, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 8; i++) {
      const clawGrp = new THREE.Group();
      for (let c = 0; c < 3; c++) {
        const claw = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2 + Math.random()), clawMat);
        claw.rotation.x = -Math.PI / 2;
        claw.position.set(c * 0.3 - 0.3, 0.02, 0);
        clawGrp.add(claw);
      }
      clawGrp.position.set((Math.random() - 0.5) * w * 0.8, 0, (Math.random() - 0.5) * d * 0.8);
      clawGrp.rotation.y = Math.random() * Math.PI;
      this._envGroup.add(clawGrp);
    }
  }

  syncVendors(vendors: { id: string; type: VendorType; x: number; z: number }[]): void {
    const currentIds = new Set(vendors.map((v) => v.id));

    // Remove old vendor meshes
    for (const [id, mesh] of this._vendorMeshes) {
      if (!currentIds.has(id)) {
        this._scene.remove(mesh);
        this._vendorMeshes.delete(id);
      }
    }

    const vendorColors: Record<string, number> = {
      [VendorType.BLACKSMITH]: 0x8B5A2B,
      [VendorType.ARCANIST]: 0x6622aa,
      [VendorType.ALCHEMIST]: 0x228833,
      [VendorType.JEWELER]: 0x2266aa,
      [VendorType.GENERAL_MERCHANT]: 0xccbb88,
    };

    for (const vendor of vendors) {
      let mesh = this._vendorMeshes.get(vendor.id);
      if (!mesh) {
        mesh = new THREE.Group();

        const robeColor = vendorColors[vendor.type] || 0x887766;
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.7 });
        const robeMat = new THREE.MeshStandardMaterial({ color: robeColor, roughness: 0.7 });

        // Head
        const headGeo = new THREE.SphereGeometry(0.16, 10, 8);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 1.42;
        head.castShadow = true;
        mesh.add(head);

        // Eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 });
        for (const ex of [-0.055, 0.055]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), eyeMat);
          eye.position.set(ex, 1.45, 0.14);
          mesh.add(eye);
        }
        // Nose
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 4), skinMat);
        nose.position.set(0, 1.41, 0.16);
        nose.rotation.x = -Math.PI / 2;
        mesh.add(nose);

        // Neck
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 6), skinMat);
        neck.position.y = 1.24;
        mesh.add(neck);

        // Torso
        const torsoGeo = new THREE.BoxGeometry(0.38, 0.5, 0.22);
        const torso = new THREE.Mesh(torsoGeo, robeMat);
        torso.position.y = 0.95;
        torso.castShadow = true;
        mesh.add(torso);

        // Belt
        const beltMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.6, metalness: 0.2 });
        const belt = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.24), beltMat);
        belt.position.y = 0.72;
        mesh.add(belt);
        // Belt buckle
        const buckleMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.7, roughness: 0.2 });
        const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), buckleMat);
        buckle.position.set(0, 0.72, 0.13);
        mesh.add(buckle);

        // Legs
        for (const lx of [-0.08, 0.08]) {
          const legGeo = new THREE.CylinderGeometry(0.06, 0.055, 0.55, 6);
          const leg = new THREE.Mesh(legGeo, robeMat);
          leg.position.set(lx, 0.4, 0);
          leg.castShadow = true;
          mesh.add(leg);
          // Boots
          const bootMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.8 });
          const boot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.14), bootMat);
          boot.position.set(lx, 0.1, 0.02);
          mesh.add(boot);
        }

        // Arms with hands
        for (const side of [-1, 1]) {
          // Upper arm
          const upperArmGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.3, 6);
          const upperArm = new THREE.Mesh(upperArmGeo, robeMat);
          upperArm.position.set(side * 0.24, 1.05, 0);
          upperArm.rotation.z = side * 0.2;
          mesh.add(upperArm);
          // Forearm
          const forearmGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.25, 6);
          const forearm = new THREE.Mesh(forearmGeo, skinMat);
          forearm.position.set(side * 0.3, 0.82, 0.05);
          forearm.rotation.z = side * 0.15;
          mesh.add(forearm);
          // Hand
          const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), skinMat);
          hand.position.set(side * 0.32, 0.7, 0.06);
          mesh.add(hand);
        }

        // Shoulders
        for (const side of [-1, 1]) {
          const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), robeMat);
          shoulder.position.set(side * 0.22, 1.18, 0);
          mesh.add(shoulder);
        }

        // Type-specific details
        if (vendor.type === VendorType.ARCANIST) {
          // Wizard hat
          const hatBrimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.03, 10);
          const hatMat = new THREE.MeshStandardMaterial({ color: 0x4411aa, roughness: 0.6 });
          const hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
          hatBrim.position.y = 1.56;
          mesh.add(hatBrim);
          const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 8), hatMat);
          hatCone.position.y = 1.78;
          mesh.add(hatCone);
          // Star on hat
          const star = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4),
            new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xffdd00, emissiveIntensity: 0.6 }));
          star.position.set(0, 1.96, 0.05);
          mesh.add(star);
          // Staff in hand
          const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.4, 5),
            new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 }));
          staff.position.set(-0.34, 0.8, 0.06);
          mesh.add(staff);
          const staffOrb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5),
            new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 0.8 }));
          staffOrb.position.set(-0.34, 1.52, 0.06);
          mesh.add(staffOrb);
          // Beard
          const beard = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 5), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 }));
          beard.position.set(0, 1.28, 0.1);
          beard.rotation.x = 0.2;
          mesh.add(beard);
        } else if (vendor.type === VendorType.BLACKSMITH) {
          // Leather apron
          const apronMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.8 });
          const apron = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.05), apronMat);
          apron.position.set(0, 0.82, 0.13);
          mesh.add(apron);
          // Hammer in hand
          const hammerHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 5),
            new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 }));
          hammerHandle.position.set(0.34, 0.75, 0.06);
          hammerHandle.rotation.z = -0.3;
          mesh.add(hammerHandle);
          const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.12),
            new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.3 }));
          hammerHead.position.set(0.38, 0.96, 0.06);
          mesh.add(hammerHead);
          // Muscular arms (slightly bigger shoulders)
          for (const side of [-1, 1]) {
            const bigShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), robeMat);
            bigShoulder.position.set(side * 0.23, 1.18, 0);
            mesh.add(bigShoulder);
          }
          // Short hair
          const hair = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 5),
            new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.9 }));
          hair.position.y = 1.48;
          hair.scale.set(1, 0.6, 1);
          mesh.add(hair);
        } else if (vendor.type === VendorType.JEWELER) {
          // Elegant hat (beret)
          const beretMat = new THREE.MeshStandardMaterial({ color: 0x224488, roughness: 0.5 });
          const beret = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 5), beretMat);
          beret.position.y = 1.55;
          beret.scale.y = 0.4;
          mesh.add(beret);
          // Monocle
          const monocle = new THREE.Mesh(new THREE.RingGeometry(0.025, 0.035, 8),
            new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.1, side: THREE.DoubleSide }));
          monocle.position.set(0.06, 1.46, 0.16);
          mesh.add(monocle);
          // Gem in hand
          const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0),
            new THREE.MeshStandardMaterial({ color: 0x44ddff, emissive: 0x2288aa, emissiveIntensity: 0.5 }));
          gem.position.set(0.32, 0.75, 0.08);
          mesh.add(gem);
          // Trim on clothes
          const trimMat = new THREE.MeshStandardMaterial({ color: 0xddaa44, metalness: 0.4, roughness: 0.3 });
          const trim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.24), trimMat);
          trim.position.y = 1.19;
          mesh.add(trim);
        } else if (vendor.type === VendorType.ALCHEMIST) {
          // Hood
          const hoodMat = new THREE.MeshStandardMaterial({ color: 0x226633, roughness: 0.7 });
          const hood = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), hoodMat);
          hood.position.y = 1.48;
          hood.scale.set(1, 0.8, 1.1);
          mesh.add(hood);
          // Potion bottle in hand
          const bottleGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.12, 6);
          const bottleMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 0.4, transparent: true, opacity: 0.7 });
          const bottle = new THREE.Mesh(bottleGeo, bottleMat);
          bottle.position.set(-0.32, 0.75, 0.06);
          mesh.add(bottle);
          const bottleNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.05, 5), bottleMat);
          bottleNeck.position.set(-0.32, 0.83, 0.06);
          mesh.add(bottleNeck);
          // Goggles on forehead
          const goggleMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.5 });
          for (const ex of [-0.05, 0.05]) {
            const goggle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 4, 6), goggleMat);
            goggle.position.set(ex, 1.5, 0.14);
            mesh.add(goggle);
          }
        } else if (vendor.type === VendorType.GENERAL_MERCHANT) {
          // Wide-brim hat
          const hatMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.7 });
          const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 10), hatMat);
          brim.position.y = 1.56;
          mesh.add(brim);
          const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.15, 8), hatMat);
          crown.position.y = 1.64;
          mesh.add(crown);
          // Sack over shoulder
          const sack = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 5),
            new THREE.MeshStandardMaterial({ color: 0xaa9966, roughness: 0.9 }));
          sack.position.set(-0.2, 1.25, -0.1);
          sack.scale.y = 1.3;
          mesh.add(sack);
          // Mustache
          for (const mx of [-0.035, 0.035]) {
            const stache = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.02),
              new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.9 }));
            stache.position.set(mx, 1.38, 0.15);
            stache.rotation.z = mx < 0 ? 0.2 : -0.2;
            mesh.add(stache);
          }
        }

        // Face toward center
        mesh.position.set(vendor.x, 0, vendor.z);
        mesh.lookAt(0, 0, 0);
        mesh.rotation.x = 0;
        mesh.rotation.z = 0;

        this._scene.add(mesh);
        this._vendorMeshes.set(vendor.id, mesh);
      }

      // Update position
      mesh.position.set(vendor.x, 0, vendor.z);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  TOWNFOLK (Camelot wandering NPCs)
  // ──────────────────────────────────────────────────────────────

  private _syncTownfolk(townfolk: DiabloTownfolk[], _dt: number): void {
    const currentIds = new Set(townfolk.map(t => t.id));

    // Remove old meshes
    for (const [id, mesh] of this._townfolkMeshes) {
      if (!currentIds.has(id)) {
        this._scene.remove(mesh);
        this._townfolkMeshes.delete(id);
      }
    }

    for (const tf of townfolk) {
      let mesh = this._townfolkMeshes.get(tf.id);
      if (!mesh) {
        mesh = this._buildTownfolkMesh(tf.role);
        this._scene.add(mesh);
        this._townfolkMeshes.set(tf.id, mesh);
      }

      mesh.position.set(tf.x, tf.y, tf.z);
      mesh.rotation.y = tf.angle;

      // Walk animation when moving
      const isMoving = tf.wanderTarget !== null;
      const leftLeg = mesh.getObjectByName('tf_left_leg');
      const rightLeg = mesh.getObjectByName('tf_right_leg');
      const leftArm = mesh.getObjectByName('tf_left_arm');
      const rightArm = mesh.getObjectByName('tf_right_arm');
      if (isMoving) {
        const swing = Math.sin(this._time * 5 + tf.x * 3) * 0.35;
        if (leftLeg) leftLeg.rotation.x = swing;
        if (rightLeg) rightLeg.rotation.x = -swing;
        if (leftArm) leftArm.rotation.x = -swing * 0.6;
        if (rightArm) rightArm.rotation.x = swing * 0.6;
      } else {
        // Idle gentle sway
        const sway = Math.sin(this._time * 1.2 + tf.z * 2) * 0.04;
        if (leftLeg) leftLeg.rotation.x = 0;
        if (rightLeg) rightLeg.rotation.x = 0;
        if (leftArm) leftArm.rotation.x = sway;
        if (rightArm) rightArm.rotation.x = -sway;
      }
    }
  }

  private _buildTownfolkMesh(role: TownfolkRole): THREE.Group {
    const mesh = new THREE.Group();

    // Colors by role
    const roleColors: Record<TownfolkRole, { robe: number; hair: number; accent: number }> = {
      peasant: { robe: 0x8B7355, hair: 0x553322, accent: 0x665544 },
      noble:   { robe: 0x4422aa, hair: 0x332211, accent: 0xddaa44 },
      guard:   { robe: 0x556688, hair: 0x443322, accent: 0x888899 },
      maiden:  { robe: 0xcc6688, hair: 0x885522, accent: 0xeebb88 },
      monk:    { robe: 0x887755, hair: 0x443322, accent: 0xccbb99 },
      bard:    { robe: 0xcc4444, hair: 0x664422, accent: 0xddcc44 },
      child:   { robe: 0x668844, hair: 0x886633, accent: 0x99aa66 },
    };
    const colors = roleColors[role];
    const isChild = role === 'child';
    const scale = isChild ? 0.65 : 1.0;

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.7 });
    const robeMat = new THREE.MeshStandardMaterial({ color: colors.robe, roughness: 0.7 });
    const hairMat = new THREE.MeshStandardMaterial({ color: colors.hair, roughness: 0.9 });
    const accentMat = new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.5, metalness: 0.2 });

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14 * scale, 8, 6), skinMat);
    head.position.y = 1.38 * scale;
    head.castShadow = true;
    mesh.add(head);

    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    for (const ex of [-0.04, 0.04]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02 * scale, 5, 4), eyeMat);
      eye.position.set(ex * scale, 1.41 * scale, 0.12 * scale);
      mesh.add(eye);
    }

    // Hair
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.13 * scale, 7, 5), hairMat);
    hair.position.y = 1.44 * scale;
    hair.scale.set(1, role === 'maiden' ? 1.0 : 0.6, 1);
    mesh.add(hair);
    // Long hair for maiden
    if (role === 'maiden') {
      const longHair = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.05 * scale, 0.3 * scale, 6), hairMat);
      longHair.position.set(0, 1.22 * scale, -0.06 * scale);
      mesh.add(longHair);
    }

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 0.08 * scale, 6), skinMat);
    neck.position.y = 1.22 * scale;
    mesh.add(neck);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.42 * scale, 0.18 * scale), robeMat);
    torso.position.y = 0.95 * scale;
    torso.castShadow = true;
    mesh.add(torso);

    // Belt
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.04 * scale, 0.2 * scale), accentMat);
    belt.position.y = 0.72 * scale;
    mesh.add(belt);

    // Legs (as named groups for animation)
    for (const [side, name] of [[-1, 'tf_left_leg'], [1, 'tf_right_leg']] as const) {
      const legGroup = new THREE.Group();
      legGroup.name = name;
      legGroup.position.set((side as number) * 0.07 * scale, 0.42 * scale, 0);

      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.045 * scale, 0.42 * scale, 6), robeMat);
      leg.position.y = -0.21 * scale;
      leg.castShadow = true;
      legGroup.add(leg);

      // Boot
      const bootMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.8 });
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.07 * scale, 0.08 * scale, 0.11 * scale), bootMat);
      boot.position.set(0, -0.44 * scale, 0.015 * scale);
      legGroup.add(boot);

      mesh.add(legGroup);
    }

    // Arms (as named groups for animation)
    for (const [side, name] of [[-1, 'tf_left_arm'], [1, 'tf_right_arm']] as const) {
      const armGroup = new THREE.Group();
      armGroup.name = name;
      armGroup.position.set((side as number) * 0.2 * scale, 1.1 * scale, 0);

      // Shoulder
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.055 * scale, 5, 4), robeMat);
      armGroup.add(shoulder);

      // Arm
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.035 * scale, 0.3 * scale, 5), robeMat);
      arm.position.y = -0.18 * scale;
      armGroup.add(arm);

      // Hand
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.03 * scale, 5, 4), skinMat);
      hand.position.y = -0.35 * scale;
      armGroup.add(hand);

      mesh.add(armGroup);
    }

    // Role-specific accessories
    if (role === 'guard') {
      // Helmet
      const helmetMat = new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.6, roughness: 0.3 });
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 5), helmetMat);
      helmet.position.y = 1.44;
      helmet.scale.set(1, 0.7, 1);
      mesh.add(helmet);
      // Spear
      const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 5),
        new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 }));
      spear.position.set(-0.24, 0.9, 0.05);
      mesh.add(spear);
      const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4),
        new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.7, roughness: 0.2 }));
      spearTip.position.set(-0.24, 1.75, 0.05);
      mesh.add(spearTip);
    } else if (role === 'noble') {
      // Crown/circlet
      const crownMat = new THREE.MeshStandardMaterial({ color: 0xddaa33, metalness: 0.7, roughness: 0.2 });
      const crown = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 4, 8), crownMat);
      crown.position.y = 1.48;
      crown.rotation.x = Math.PI / 2;
      mesh.add(crown);
      // Cape
      const capeMat = new THREE.MeshStandardMaterial({ color: 0x4422aa, roughness: 0.6, side: THREE.DoubleSide });
      const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.5), capeMat);
      cape.position.set(0, 0.95, -0.12);
      mesh.add(cape);
    } else if (role === 'monk') {
      // Hood
      const hoodMat = new THREE.MeshStandardMaterial({ color: 0x776644, roughness: 0.8 });
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 5), hoodMat);
      hood.position.y = 1.42;
      hood.scale.set(1, 0.8, 1.1);
      mesh.add(hood);
      // Book in hand
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7 }));
      book.position.set(0.24, 0.7, 0.06);
      mesh.add(book);
    } else if (role === 'bard') {
      // Feathered cap
      const capMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.6 });
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), capMat);
      cap.position.y = 1.48;
      cap.scale.y = 0.5;
      mesh.add(cap);
      // Feather
      const feather = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.12, 3),
        new THREE.MeshStandardMaterial({ color: 0xdddd44, roughness: 0.5 }));
      feather.position.set(0.08, 1.55, 0);
      feather.rotation.z = -0.4;
      mesh.add(feather);
      // Lute
      const lute = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0xAA7744, roughness: 0.6 }));
      lute.position.set(-0.2, 0.75, 0.1);
      lute.scale.set(1, 1.3, 0.5);
      mesh.add(lute);
    } else if (role === 'maiden') {
      // Flower in hair
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4),
        new THREE.MeshStandardMaterial({ color: 0xff6688, emissive: 0xff3355, emissiveIntensity: 0.2 }));
      flower.position.set(0.1, 1.5, 0.05);
      mesh.add(flower);
      // Basket
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.08, 6),
        new THREE.MeshStandardMaterial({ color: 0xBB9955, roughness: 0.8 }));
      basket.position.set(0.22, 0.68, 0.06);
      mesh.add(basket);
    }

    return mesh;
  }

  buildPlayer(cls: DiabloClass): void {
    while (this._playerGroup.children.length > 0) {
      this._playerGroup.remove(this._playerGroup.children[0]);
    }
    this._weaponMesh = null;
    this._weaponArmGroup = null;
    this._leftLegGroup = null;
    this._rightLegGroup = null;
    this._leftArmGroup = null;
    if (this._aimLine) { this._scene.remove(this._aimLine); this._aimLine = null; }

    const skinColor = 0xdeb887;
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });
    const skinDarkMat = new THREE.MeshStandardMaterial({ color: 0xb8925a, roughness: 0.7 });

    // Head
    const headGeo = new THREE.SphereGeometry(0.18, 10, 8);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.6;
    head.castShadow = true;
    this._playerGroup.add(head);

    // Nose (small cone)
    const noseGeo = new THREE.ConeGeometry(0.03, 0.06, 5);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 1.58, 0.17);
    nose.rotation.x = -Math.PI / 2;
    this._playerGroup.add(nose);

    // Chin (small box)
    const chinGeo = new THREE.BoxGeometry(0.08, 0.04, 0.04);
    const chin = new THREE.Mesh(chinGeo, skinMat);
    chin.position.set(0, 1.48, 0.14);
    this._playerGroup.add(chin);

    // Eyebrows (thin boxes, skin-darkened)
    for (let side = -1; side <= 1; side += 2) {
      const browGeo = new THREE.BoxGeometry(0.06, 0.015, 0.02);
      const brow = new THREE.Mesh(browGeo, skinDarkMat);
      brow.position.set(side * 0.06, 1.65, 0.15);
      this._playerGroup.add(brow);
    }

    // Eyes (white spheres with dark pupil dots)
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    for (let side = -1; side <= 1; side += 2) {
      const eyeGeo = new THREE.SphereGeometry(0.04, 6, 5);
      const eye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      eye.position.set(side * 0.06, 1.62, 0.15);
      this._playerGroup.add(eye);

      const pupilGeo = new THREE.SphereGeometry(0.02, 5, 4);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(side * 0.06, 1.62, 0.185);
      this._playerGroup.add(pupil);
    }

    // Neck (cylinder connecting head to torso)
    const neckGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.12, 8);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 1.46;
    this._playerGroup.add(neck);

    let torsoColor: number;
    let torsoMetalness: number;
    let torsoRoughness: number;

    switch (cls) {
      case DiabloClass.WARRIOR:
        torsoColor = 0x888899;
        torsoMetalness = 0.7;
        torsoRoughness = 0.3;
        break;
      case DiabloClass.MAGE:
        torsoColor = 0x2a1a4a;
        torsoMetalness = 0.0;
        torsoRoughness = 0.8;
        break;
      case DiabloClass.RANGER:
        torsoColor = 0x6b4226;
        torsoMetalness = 0.0;
        torsoRoughness = 0.8;
        break;
    }

    const torsoMat = new THREE.MeshStandardMaterial({
      color: torsoColor,
      metalness: torsoMetalness,
      roughness: torsoRoughness,
    });

    // Torso - slightly tapered (wider at shoulders, narrower at waist)
    const torsoUpperGeo = new THREE.BoxGeometry(0.52, 0.28, 0.3);
    const torsoUpper = new THREE.Mesh(torsoUpperGeo, torsoMat);
    torsoUpper.position.y = 1.32;
    torsoUpper.castShadow = true;
    this._playerGroup.add(torsoUpper);

    const torsoLowerGeo = new THREE.BoxGeometry(0.44, 0.28, 0.28);
    const torsoLower = new THREE.Mesh(torsoLowerGeo, torsoMat);
    torsoLower.position.y = 1.06;
    torsoLower.castShadow = true;
    this._playerGroup.add(torsoLower);

    // Belt (thin box around waist)
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 });
    const beltGeo = new THREE.BoxGeometry(0.52, 0.06, 0.32);
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 0.92;
    this._playerGroup.add(belt);

    // Belt buckle (tiny metallic box)
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.8, roughness: 0.2 });
    const buckleGeo = new THREE.BoxGeometry(0.05, 0.05, 0.04);
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, 0.92, 0.17);
    this._playerGroup.add(buckle);

    // Legs — in groups for walk animation (pivot at hip)
    const legMat = torsoMat.clone();
    const legGroups: THREE.Group[] = [];
    for (let side = -1; side <= 1; side += 2) {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.12, 0.9, 0);  // pivot at hip

      // Thigh
      const thighGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.4, 8);
      const thigh = new THREE.Mesh(thighGeo, legMat);
      thigh.position.y = -0.17;
      thigh.castShadow = true;
      legGroup.add(thigh);

      // Knee joint
      const kneeGeo = new THREE.SphereGeometry(0.055, 6, 5);
      const knee = new THREE.Mesh(kneeGeo, legMat);
      knee.position.y = -0.37;
      legGroup.add(knee);

      // Shin
      const shinGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.4, 8);
      const shin = new THREE.Mesh(shinGeo, legMat);
      shin.position.y = -0.57;
      shin.castShadow = true;
      legGroup.add(shin);

      // Ankle joint
      const ankleGeo = new THREE.SphereGeometry(0.045, 6, 5);
      const ankle = new THREE.Mesh(ankleGeo, legMat);
      ankle.position.y = -0.77;
      legGroup.add(ankle);

      // Foot
      const footGeo = new THREE.BoxGeometry(0.12, 0.06, 0.2);
      const foot = new THREE.Mesh(footGeo, legMat);
      foot.position.set(0, -0.85, 0.04);
      legGroup.add(foot);

      this._playerGroup.add(legGroup);
      legGroups.push(legGroup);
    }
    this._leftLegGroup = legGroups[0];
    this._rightLegGroup = legGroups[1];

    // Arms
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.35, 1.35, 0);
    this._playerGroup.add(rightArmGroup);
    this._weaponArmGroup = rightArmGroup;

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.35, 1.35, 0);
    this._playerGroup.add(leftArmGroup);
    this._leftArmGroup = leftArmGroup;

    for (const armGroup of [rightArmGroup, leftArmGroup]) {
      const upperGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.3, 8);
      const upper = new THREE.Mesh(upperGeo, skinMat);
      upper.position.y = -0.15;
      armGroup.add(upper);

      const foreGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.3, 8);
      const fore = new THREE.Mesh(foreGeo, skinMat);
      fore.position.y = -0.45;
      armGroup.add(fore);

      // Fingers hint: flattened box for palm + tiny thin boxes for finger suggestion
      const palmGeo = new THREE.BoxGeometry(0.08, 0.04, 0.06);
      const palm = new THREE.Mesh(palmGeo, skinMat);
      palm.position.y = -0.62;
      armGroup.add(palm);

      for (let f = 0; f < 4; f++) {
        const fingerGeo = new THREE.BoxGeometry(0.015, 0.04, 0.015);
        const finger = new THREE.Mesh(fingerGeo, skinMat);
        finger.position.set(-0.025 + f * 0.017, -0.66, 0);
        armGroup.add(finger);
      }
    }

    // Muscle definition for warrior (chest armor plates)
    if (cls === DiabloClass.WARRIOR) {
      const plateMat = new THREE.MeshStandardMaterial({ color: 0x999aab, metalness: 0.75, roughness: 0.25 });
      for (let side = -1; side <= 1; side += 2) {
        const plateGeo = new THREE.BoxGeometry(0.14, 0.16, 0.04);
        const plate = new THREE.Mesh(plateGeo, plateMat);
        plate.position.set(side * 0.1, 1.32, 0.17);
        this._playerGroup.add(plate);
      }
    }

    // Class-specific gear
    switch (cls) {
      case DiabloClass.WARRIOR: {
        const pauldronMat = new THREE.MeshStandardMaterial({ color: 0x777788, metalness: 0.8, roughness: 0.2 });

        // Layered shoulder pauldrons
        for (let side = -1; side <= 1; side += 2) {
          // Main sphere
          const pauldronGeo = new THREE.SphereGeometry(0.14, 8, 6);
          const pauldron = new THREE.Mesh(pauldronGeo, pauldronMat);
          pauldron.position.set(side * 0.35, 1.42, 0);
          pauldron.castShadow = true;
          this._playerGroup.add(pauldron);

          // Spike on top (cone pointing up)
          const spikeGeo = new THREE.ConeGeometry(0.04, 0.12, 5);
          const spike = new THREE.Mesh(spikeGeo, pauldronMat);
          spike.position.set(side * 0.35, 1.58, 0);
          this._playerGroup.add(spike);

          // Decorative rim (torus around base)
          const rimGeo = new THREE.TorusGeometry(0.13, 0.02, 6, 12);
          const rim = new THREE.Mesh(rimGeo, pauldronMat);
          rim.position.set(side * 0.35, 1.38, 0);
          rim.rotation.x = Math.PI / 2;
          this._playerGroup.add(rim);
        }

        // Chest plate with cross/emblem
        const chestPlateGeo = new THREE.BoxGeometry(0.36, 0.3, 0.04);
        const chestPlateMat = new THREE.MeshStandardMaterial({ color: 0x8888aa, metalness: 0.8, roughness: 0.2 });
        const chestPlate = new THREE.Mesh(chestPlateGeo, chestPlateMat);
        chestPlate.position.set(0, 1.28, 0.18);
        this._playerGroup.add(chestPlate);

        // Cross emblem on chest plate
        const emblemMat = new THREE.MeshStandardMaterial({ color: 0xcccc44, metalness: 0.7, roughness: 0.2 });
        const emblemV = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.02), emblemMat);
        emblemV.position.set(0, 1.28, 0.21);
        this._playerGroup.add(emblemV);
        const emblemH = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.02), emblemMat);
        emblemH.position.set(0, 1.30, 0.21);
        this._playerGroup.add(emblemH);

        // Arm bracers (thin cylinders around forearms)
        for (const armGroup of [rightArmGroup, leftArmGroup]) {
          const bracerGeo = new THREE.CylinderGeometry(0.065, 0.07, 0.12, 8);
          const bracer = new THREE.Mesh(bracerGeo, pauldronMat);
          bracer.position.y = -0.42;
          armGroup.add(bracer);
        }

        // Helmet: half sphere on top + nose guard + cheek guards
        const helmetMat = new THREE.MeshStandardMaterial({ color: 0x777788, metalness: 0.8, roughness: 0.2 });
        const helmetGeo = new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const helmet = new THREE.Mesh(helmetGeo, helmetMat);
        helmet.position.y = 1.62;
        this._playerGroup.add(helmet);

        // Nose guard (thin box going down front)
        const noseGuardGeo = new THREE.BoxGeometry(0.03, 0.16, 0.02);
        const noseGuard = new THREE.Mesh(noseGuardGeo, helmetMat);
        noseGuard.position.set(0, 1.58, 0.18);
        this._playerGroup.add(noseGuard);

        // Cheek guards (two small boxes on sides)
        for (let side = -1; side <= 1; side += 2) {
          const cheekGeo = new THREE.BoxGeometry(0.03, 0.1, 0.1);
          const cheek = new THREE.Mesh(cheekGeo, helmetMat);
          cheek.position.set(side * 0.17, 1.56, 0.06);
          this._playerGroup.add(cheek);
        }

        // Cape (flat box hanging from upper back)
        const capeMat = new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.9 });
        const capeGeo = new THREE.BoxGeometry(0.4, 0.01, 0.5);
        const cape = new THREE.Mesh(capeGeo, capeMat);
        cape.position.set(0, 1.1, -0.25);
        this._playerGroup.add(cape);

        // Sword with fuller, grip, crossguard
        const swordGroup = new THREE.Group();
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.9, roughness: 0.1 });
        const bladeGeo = new THREE.BoxGeometry(0.06, 0.8, 0.02);
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = -0.4;
        swordGroup.add(blade);

        // Fuller line (thin box down blade center)
        const fullerGeo = new THREE.BoxGeometry(0.02, 0.65, 0.025);
        const fullerMat = new THREE.MeshStandardMaterial({ color: 0xaaaacc, metalness: 0.85, roughness: 0.15 });
        const fuller = new THREE.Mesh(fullerGeo, fullerMat);
        fuller.position.y = -0.38;
        swordGroup.add(fuller);

        // Crossguard
        const guardGeo = new THREE.BoxGeometry(0.22, 0.035, 0.045);
        const guard = new THREE.Mesh(guardGeo, bladeMat);
        guard.position.y = -0.02;
        swordGroup.add(guard);

        // Leather-wrapped grip
        const gripGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.1, 6);
        const gripMat = new THREE.MeshStandardMaterial({ color: 0x4a2a10, roughness: 0.9 });
        const grip = new THREE.Mesh(gripGeo, gripMat);
        grip.position.y = 0.0;
        swordGroup.add(grip);

        const pommelGeo = new THREE.SphereGeometry(0.04, 6, 5);
        const pommelMat = new THREE.MeshStandardMaterial({ color: 0x886633, metalness: 0.5 });
        const pommel = new THREE.Mesh(pommelGeo, pommelMat);
        pommel.position.y = 0.06;
        swordGroup.add(pommel);

        swordGroup.position.y = -0.62;
        rightArmGroup.add(swordGroup);
        this._weaponMesh = blade;

        // Shield
        const shieldGeo = new THREE.CircleGeometry(0.25, 8);
        const shieldMat = new THREE.MeshStandardMaterial({
          color: 0x666688,
          metalness: 0.6,
          roughness: 0.3,
          side: THREE.DoubleSide,
        });
        const shield = new THREE.Mesh(shieldGeo, shieldMat);
        shield.position.y = -0.4;
        shield.position.z = 0.1;
        shield.rotation.y = Math.PI / 6;
        leftArmGroup.add(shield);

        // Shield boss (center sphere)
        const bossGeo = new THREE.SphereGeometry(0.06, 6, 5);
        const bossMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.8, roughness: 0.2 });
        const shieldBoss = new THREE.Mesh(bossGeo, bossMat);
        shieldBoss.position.set(0, -0.4, 0.13);
        leftArmGroup.add(shieldBoss);

        // Shield rivets (4 tiny spheres around edge)
        const rivetMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.9, roughness: 0.1 });
        for (let ri = 0; ri < 4; ri++) {
          const riAngle = (ri / 4) * Math.PI * 2;
          const rivetGeo = new THREE.SphereGeometry(0.02, 4, 3);
          const rivet = new THREE.Mesh(rivetGeo, rivetMat);
          rivet.position.set(Math.cos(riAngle) * 0.2, -0.4 + Math.sin(riAngle) * 0.2, 0.12);
          leftArmGroup.add(rivet);
        }
        break;
      }

      case DiabloClass.MAGE: {
        // Robe cone from waist
        const robeMat = new THREE.MeshStandardMaterial({ color: 0x1a0a3a, roughness: 0.9 });
        const robeGeo = new THREE.ConeGeometry(0.4, 0.8, 10);
        const robe = new THREE.Mesh(robeGeo, robeMat);
        robe.position.y = 0.5;
        this._playerGroup.add(robe);

        // Outer robe flap (thin box on front, slightly offset)
        const flapGeo = new THREE.BoxGeometry(0.3, 0.7, 0.02);
        const flap = new THREE.Mesh(flapGeo, robeMat);
        flap.position.set(0.05, 0.55, 0.18);
        this._playerGroup.add(flap);

        // Sleeve cones around upper arms
        const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x1a0a3a, roughness: 0.85 });
        for (const armGrp of [rightArmGroup, leftArmGroup]) {
          const sleeveGeo = new THREE.ConeGeometry(0.1, 0.25, 8);
          const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
          sleeve.position.y = -0.1;
          sleeve.rotation.x = Math.PI;
          armGrp.add(sleeve);
        }

        // High collar (raised box behind neck)
        const collarGeo = new THREE.BoxGeometry(0.2, 0.12, 0.06);
        const collar = new THREE.Mesh(collarGeo, robeMat);
        collar.position.set(0, 1.52, -0.12);
        this._playerGroup.add(collar);

        // Rune glow on robe (small emissive circles on robe front)
        const runeMat = new THREE.MeshStandardMaterial({
          color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 1.5,
          transparent: true, opacity: 0.8,
        });
        for (let r = 0; r < 3; r++) {
          const runeGeo = new THREE.CircleGeometry(0.03, 8);
          const runeM = new THREE.Mesh(runeGeo, runeMat);
          runeM.position.set(0, 1.15 - r * 0.12, 0.16);
          this._playerGroup.add(runeM);
        }

        // Beard (small cone under chin, grey/white)
        const beardMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 });
        const beardGeo = new THREE.ConeGeometry(0.06, 0.12, 6);
        const beard = new THREE.Mesh(beardGeo, beardMat);
        beard.position.set(0, 1.44, 0.1);
        beard.rotation.x = Math.PI;
        this._playerGroup.add(beard);

        // Book on belt (spellbook)
        const bookMat = new THREE.MeshStandardMaterial({ color: 0x3a1a0a, roughness: 0.9 });
        const bookGeo = new THREE.BoxGeometry(0.08, 0.1, 0.04);
        const book = new THREE.Mesh(bookGeo, bookMat);
        book.position.set(-0.22, 0.92, 0.1);
        this._playerGroup.add(book);

        // Pointed hat
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x1a0a3a, roughness: 0.8 });
        const hatGeo = new THREE.ConeGeometry(0.2, 0.4, 8);
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.y = 1.9;
        this._playerGroup.add(hat);

        const brimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.03, 10);
        const brim = new THREE.Mesh(brimGeo, hatMat);
        brim.position.y = 1.72;
        this._playerGroup.add(brim);

        // Staff with glowing orb
        const staffGroup = new THREE.Group();
        const staffGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6);
        const staffMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.9 });
        const staff = new THREE.Mesh(staffGeo, staffMat);
        staff.position.y = -0.5;
        staffGroup.add(staff);

        // Staff rings (3 thin torus rings along the shaft)
        for (let ri = 0; ri < 3; ri++) {
          const sRingGeo = new THREE.TorusGeometry(0.045, 0.008, 6, 12);
          const sRingMat = new THREE.MeshStandardMaterial({ color: 0x886644, metalness: 0.5, roughness: 0.3 });
          const sRing = new THREE.Mesh(sRingGeo, sRingMat);
          sRing.position.y = -0.15 + ri * 0.4;
          sRing.rotation.x = Math.PI / 2;
          staffGroup.add(sRing);
        }

        const orbGeo = new THREE.SphereGeometry(0.1, 10, 8);
        const orbMat = new THREE.MeshStandardMaterial({
          color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 1.5,
          transparent: true, opacity: 0.9,
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.y = 0.45;
        staffGroup.add(orb);

        // Orbiting small crystals (3 tiny icosahedrons around main orb)
        const crystalMat = new THREE.MeshStandardMaterial({
          color: 0xaa66ff, emissive: 0x8844dd, emissiveIntensity: 1.2,
          transparent: true, opacity: 0.8,
        });
        for (let ci = 0; ci < 3; ci++) {
          const cAngle = (ci / 3) * Math.PI * 2;
          const crystalGeo = new THREE.IcosahedronGeometry(0.03, 0);
          const crystal = new THREE.Mesh(crystalGeo, crystalMat);
          crystal.position.set(
            Math.cos(cAngle) * 0.16,
            0.45 + Math.sin(cAngle) * 0.08,
            Math.sin(cAngle) * 0.16
          );
          staffGroup.add(crystal);
        }

        staffGroup.position.y = -0.62;
        rightArmGroup.add(staffGroup);
        this._weaponMesh = staff;
        break;
      }

      case DiabloClass.RANGER: {
        // Hood
        const hoodGeo = new THREE.ConeGeometry(0.2, 0.25, 8);
        const hoodMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 });
        const hood = new THREE.Mesh(hoodGeo, hoodMat);
        hood.position.set(0, 1.72, -0.05);
        this._playerGroup.add(hood);

        // Face mask/scarf (small box covering lower face)
        const scarfMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
        const scarfGeo = new THREE.BoxGeometry(0.18, 0.08, 0.08);
        const scarf = new THREE.Mesh(scarfGeo, scarfMat);
        scarf.position.set(0, 1.52, 0.1);
        this._playerGroup.add(scarf);

        // Cloak (larger draped plane from shoulders down back)
        const cloakMat = new THREE.MeshStandardMaterial({ color: 0x2a4a22, roughness: 0.9 });
        const cloakGeo = new THREE.BoxGeometry(0.45, 0.01, 0.6);
        const cloak = new THREE.Mesh(cloakGeo, cloakMat);
        cloak.position.set(0, 1.05, -0.2);
        this._playerGroup.add(cloak);

        // Arm guards / leather bracers
        const bracerMat = new THREE.MeshStandardMaterial({ color: 0x5a3216, roughness: 0.85 });
        for (const armGrp of [rightArmGroup, leftArmGroup]) {
          const bracerGeo = new THREE.CylinderGeometry(0.062, 0.068, 0.14, 8);
          const bracer = new THREE.Mesh(bracerGeo, bracerMat);
          bracer.position.y = -0.42;
          armGrp.add(bracer);
        }

        // Knee pads (small flattened boxes on front of knees)
        for (let side = -1; side <= 1; side += 2) {
          const kneePadGeo = new THREE.BoxGeometry(0.08, 0.06, 0.04);
          const kneePad = new THREE.Mesh(kneePadGeo, bracerMat);
          kneePad.position.set(side * 0.12, 0.53, 0.06);
          this._playerGroup.add(kneePad);
        }

        // Bandolier (thin cylinder diagonal across chest + pouches)
        const bandolierGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.55, 6);
        const bandolierMat = new THREE.MeshStandardMaterial({ color: 0x5a3216, roughness: 0.85 });
        const bandolier = new THREE.Mesh(bandolierGeo, bandolierMat);
        bandolier.position.set(0, 1.2, 0.16);
        bandolier.rotation.z = 0.6;
        this._playerGroup.add(bandolier);

        // Pouches on bandolier
        for (let p = 0; p < 3; p++) {
          const pouchGeo = new THREE.BoxGeometry(0.05, 0.04, 0.03);
          const pouch = new THREE.Mesh(pouchGeo, bracerMat);
          pouch.position.set(-0.08 + p * 0.08, 1.12 + p * 0.06, 0.18);
          this._playerGroup.add(pouch);
        }

        // Bow (torus segment)
        const bowGeo = new THREE.TorusGeometry(0.4, 0.02, 6, 12, Math.PI);
        const bowMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8 });
        const bow = new THREE.Mesh(bowGeo, bowMat);
        bow.position.y = -0.3;
        bow.rotation.z = Math.PI / 2;
        leftArmGroup.add(bow);

        // Bowstring
        const stringGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.8, 4);
        const stringMat = new THREE.MeshStandardMaterial({ color: 0xccccaa });
        const bowString = new THREE.Mesh(stringGeo, stringMat);
        bowString.position.y = -0.3;
        leftArmGroup.add(bowString);

        // Quiver on back
        const quiverGeo = new THREE.BoxGeometry(0.12, 0.5, 0.08);
        const quiverMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.8 });
        const quiver = new THREE.Mesh(quiverGeo, quiverMat);
        quiver.position.set(0.15, 1.25, -0.2);
        this._playerGroup.add(quiver);

        // 6 arrows in quiver with arrowhead tips and feathers
        const arrowMat = new THREE.MeshStandardMaterial({ color: 0x886644 });
        const arrowHeadMat = new THREE.MeshStandardMaterial({ color: 0xaaaacc, metalness: 0.7, roughness: 0.2 });
        const featherMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.9 });
        for (let a = 0; a < 6; a++) {
          const arrowGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.55, 4);
          const arrow = new THREE.Mesh(arrowGeo, arrowMat);
          const ax = 0.15 + (a - 2.5) * 0.02;
          arrow.position.set(ax, 1.35, -0.2);
          this._playerGroup.add(arrow);

          // Arrowhead tip (tiny cone, metallic)
          const tipGeo = new THREE.ConeGeometry(0.018, 0.05, 4);
          const tip = new THREE.Mesh(tipGeo, arrowHeadMat);
          tip.position.set(ax, 1.63, -0.2);
          this._playerGroup.add(tip);

          // Feathers at nock end (tiny plane)
          const featherGeo = new THREE.BoxGeometry(0.025, 0.04, 0.005);
          const feather = new THREE.Mesh(featherGeo, featherMat);
          feather.position.set(ax, 1.08, -0.2);
          this._playerGroup.add(feather);
        }

        this._weaponMesh = bow;
        break;
      }
    }

    this._playerGroup.castShadow = true;

    // Player lantern – warm point light for dark maps
    const lantern = new THREE.PointLight(0xffaa55, 0, 12, 2);
    lantern.position.set(0, 1.8, 0);
    this._playerGroup.add(lantern);
    this._playerLantern = lantern;
  }

  private _createEnemyMesh(type: EnemyType, scale: number): THREE.Group {
    const group = new THREE.Group();

    switch (type) {
      case EnemyType.WOLF: {
        const bodyGeo = new THREE.BoxGeometry(0.6, 0.35, 1.0);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.8 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        body.castShadow = true;
        group.add(body);

        // Fur texture suggestion (thin small planes sticking up)
        for (let fi = 0; fi < 8; fi++) {
          const furGeo = new THREE.BoxGeometry(0.04, 0.08, 0.02);
          const fur = new THREE.Mesh(furGeo, bodyMat);
          fur.position.set(
            (Math.random() - 0.5) * 0.5,
            0.7 + Math.random() * 0.05,
            (Math.random() - 0.5) * 0.8
          );
          fur.rotation.z = (Math.random() - 0.5) * 0.4;
          group.add(fur);
        }

        const snoutGeo = new THREE.ConeGeometry(0.1, 0.3, 6);
        const snout = new THREE.Mesh(snoutGeo, bodyMat);
        snout.rotation.x = -Math.PI / 2;
        snout.position.set(0, 0.55, 0.6);
        group.add(snout);

        // Teeth (two tiny white cones pointing down from snout)
        const toothMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
        for (let side = -1; side <= 1; side += 2) {
          const toothGeo = new THREE.ConeGeometry(0.015, 0.06, 4);
          const tooth = new THREE.Mesh(toothGeo, toothMat);
          tooth.position.set(side * 0.04, 0.48, 0.72);
          tooth.rotation.x = Math.PI;
          group.add(tooth);
        }

        for (let side = -1; side <= 1; side += 2) {
          const earGeo = new THREE.ConeGeometry(0.06, 0.15, 4);
          const ear = new THREE.Mesh(earGeo, bodyMat);
          ear.position.set(side * 0.12, 0.75, 0.35);
          group.add(ear);
        }

        // Glowing eyes
        const wolfEyeMat = new THREE.MeshStandardMaterial({ color: 0x99ff44, emissive: 0x99ff44, emissiveIntensity: 1.0 });
        for (let side = -1; side <= 1; side += 2) {
          const wolfEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), wolfEyeMat);
          wolfEye.position.set(side * 0.1, 0.62, 0.5);
          group.add(wolfEye);
        }

        // Bushy tail (multiple overlapping cylinders)
        for (let ti = 0; ti < 3; ti++) {
          const tailSegGeo = new THREE.CylinderGeometry(0.04 - ti * 0.008, 0.035 - ti * 0.008, 0.35, 6);
          const tailSeg = new THREE.Mesh(tailSegGeo, bodyMat);
          tailSeg.position.set((Math.random() - 0.5) * 0.04, 0.6 + ti * 0.04, -0.55 - ti * 0.08);
          tailSeg.rotation.x = -0.6 - ti * 0.15;
          group.add(tailSeg);
        }

        // Legs with paws
        for (let lx = -1; lx <= 1; lx += 2) {
          for (let lz = -1; lz <= 1; lz += 2) {
            const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6);
            const leg = new THREE.Mesh(legGeo, bodyMat);
            leg.position.set(lx * 0.2, 0.18, lz * 0.3);
            group.add(leg);

            // Paws (small flattened boxes)
            const pawGeo = new THREE.BoxGeometry(0.07, 0.03, 0.09);
            const paw = new THREE.Mesh(pawGeo, bodyMat);
            paw.position.set(lx * 0.2, 0.02, lz * 0.3 + 0.02);
            group.add(paw);
          }
        }
        break;
      }

      case EnemyType.BANDIT: {
        const mat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });
        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.25), mat);
        torso.position.y = 1.1;
        torso.castShadow = true;
        group.add(torso);
        // Head
        const headMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.7 });
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), headMat);
        head.position.y = 1.5;
        group.add(head);

        // Leather cap (half sphere on head, brown)
        const capGeo = new THREE.SphereGeometry(0.16, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const capMat = new THREE.MeshStandardMaterial({ color: 0x5a3216, roughness: 0.85 });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.y = 1.52;
        group.add(cap);

        // Scar across face (thin red box)
        const scarGeo = new THREE.BoxGeometry(0.18, 0.015, 0.01);
        const scarMat = new THREE.MeshStandardMaterial({ color: 0xaa3333, roughness: 0.9 });
        const scar = new THREE.Mesh(scarGeo, scarMat);
        scar.position.set(0, 1.52, 0.14);
        scar.rotation.z = 0.3;
        group.add(scar);

        // Belt with pouches
        const bBeltGeo = new THREE.BoxGeometry(0.44, 0.05, 0.28);
        const bBeltMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.85 });
        const bBelt = new THREE.Mesh(bBeltGeo, bBeltMat);
        bBelt.position.y = 0.85;
        group.add(bBelt);
        for (let bp = -1; bp <= 1; bp += 2) {
          const bPouchGeo = new THREE.BoxGeometry(0.06, 0.06, 0.05);
          const bPouch = new THREE.Mesh(bPouchGeo, bBeltMat);
          bPouch.position.set(bp * 0.15, 0.85, 0.15);
          group.add(bPouch);
        }

        // Legs with boot detail
        const bootMat = new THREE.MeshStandardMaterial({ color: 0x4a2a10, roughness: 0.9 });
        for (let side = -1; side <= 1; side += 2) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.7, 8), mat);
          leg.position.set(side * 0.1, 0.5, 0);
          group.add(leg);
          // Boots (slightly different colored)
          const boot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.16), bootMat);
          boot.position.set(side * 0.1, 0.08, 0.02);
          group.add(boot);
        }
        // Arms
        for (let side = -1; side <= 1; side += 2) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 8), headMat);
          arm.position.set(side * 0.28, 1.1, 0);
          group.add(arm);
        }
        // Dagger
        const daggerGeo = new THREE.BoxGeometry(0.03, 0.3, 0.015);
        const daggerMat = new THREE.MeshStandardMaterial({ color: 0xaaaacc, metalness: 0.8, roughness: 0.2 });
        const dagger = new THREE.Mesh(daggerGeo, daggerMat);
        dagger.position.set(0.35, 0.9, 0);
        group.add(dagger);

        // Second weapon: small buckler on other arm
        const bucklerGeo = new THREE.CircleGeometry(0.12, 6);
        const bucklerMat = new THREE.MeshStandardMaterial({ color: 0x666655, metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide });
        const buckler = new THREE.Mesh(bucklerGeo, bucklerMat);
        buckler.position.set(-0.35, 0.95, 0.08);
        group.add(buckler);

        // Torn cape (small box on back)
        const tornCapeGeo = new THREE.BoxGeometry(0.25, 0.01, 0.3);
        const tornCapeMat = new THREE.MeshStandardMaterial({ color: 0x444433, roughness: 0.95 });
        const tornCape = new THREE.Mesh(tornCapeGeo, tornCapeMat);
        tornCape.position.set(0, 1.0, -0.15);
        group.add(tornCape);
        break;
      }

      case EnemyType.BEAR: {
        const mat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.85 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), mat);
        body.position.y = 0.9;
        body.scale.set(1, 0.85, 1.2);
        body.castShadow = true;
        group.add(body);

        // Thick neck (cylinder connecting head to body)
        const neckGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.3, 8);
        const neckMesh = new THREE.Mesh(neckGeo, mat);
        neckMesh.position.set(0, 1.15, 0.5);
        neckMesh.rotation.x = -0.4;
        group.add(neckMesh);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), mat);
        head.position.set(0, 1.3, 0.7);
        group.add(head);

        const snout = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 5), mat);
        snout.position.set(0, 1.2, 1.05);
        group.add(snout);

        // Open mouth hint (small dark red box under snout)
        const mouthGeo = new THREE.BoxGeometry(0.12, 0.04, 0.08);
        const mouthMat = new THREE.MeshStandardMaterial({ color: 0x881111, roughness: 0.9 });
        const mouth = new THREE.Mesh(mouthGeo, mouthMat);
        mouth.position.set(0, 1.12, 1.1);
        group.add(mouth);

        // Fur ridge (row of small cones along spine)
        const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.9 });
        for (let ri = 0; ri < 6; ri++) {
          const ridgeGeo = new THREE.ConeGeometry(0.04, 0.08, 4);
          const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
          ridge.position.set(0, 1.5 - ri * 0.05, 0.1 + ri * 0.1);
          group.add(ridge);
        }

        // Scars (thin lighter-colored boxes on body)
        const scarMat2 = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.8 });
        for (let sc = 0; sc < 3; sc++) {
          const scarGeo2 = new THREE.BoxGeometry(0.2, 0.015, 0.01);
          const bearScar = new THREE.Mesh(scarGeo2, scarMat2);
          bearScar.position.set((Math.random() - 0.5) * 0.4, 0.8 + sc * 0.15, 0.5 + sc * 0.1);
          bearScar.rotation.z = (Math.random() - 0.5) * 0.3;
          group.add(bearScar);
        }

        for (let side = -1; side <= 1; side += 2) {
          const ear = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), mat);
          ear.position.set(side * 0.25, 1.55, 0.6);
          group.add(ear);
        }

        for (let lx = -1; lx <= 1; lx += 2) {
          for (let lz = -1; lz <= 1; lz += 2) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.5, 8), mat);
            leg.position.set(lx * 0.35, 0.25, lz * 0.5);
            group.add(leg);

            // Claws on front paws (3 small cones per front paw)
            if (lz === 1) {
              const clawMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
              for (let cl = -1; cl <= 1; cl++) {
                const clawGeo = new THREE.ConeGeometry(0.02, 0.08, 4);
                const claw = new THREE.Mesh(clawGeo, clawMat);
                claw.position.set(lx * 0.35 + cl * 0.04, 0.02, lz * 0.5 + 0.12);
                claw.rotation.x = -Math.PI / 2;
                group.add(claw);
              }
            }
          }
        }
        break;
      }

      case EnemyType.FOREST_SPIDER: {
        const spiderMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
        const bodyGeo = new THREE.SphereGeometry(0.25, 8, 6);
        const spiderBody = new THREE.Mesh(bodyGeo, spiderMat);
        spiderBody.position.y = 0.5;
        spiderBody.castShadow = true;
        group.add(spiderBody);

        const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), spiderMat);
        abdomen.position.set(0, 0.45, -0.45);
        group.add(abdomen);

        // Mandibles (2 small cones at front, pointing down/forward)
        for (let side = -1; side <= 1; side += 2) {
          const mandibleGeo = new THREE.ConeGeometry(0.025, 0.12, 4);
          const mandible = new THREE.Mesh(mandibleGeo, spiderMat);
          mandible.position.set(side * 0.06, 0.42, 0.28);
          mandible.rotation.x = -0.4;
          group.add(mandible);
        }

        // Hair/bristles on body and abdomen
        for (let bi = 0; bi < 10; bi++) {
          const bristleGeo = new THREE.ConeGeometry(0.01, 0.06, 3);
          const bristle = new THREE.Mesh(bristleGeo, spiderMat);
          if (bi < 5) {
            bristle.position.set((Math.random() - 0.5) * 0.2, 0.55 + Math.random() * 0.1, (Math.random() - 0.5) * 0.2);
          } else {
            bristle.position.set((Math.random() - 0.5) * 0.3, 0.5 + Math.random() * 0.1, -0.45 + (Math.random() - 0.5) * 0.3);
          }
          group.add(bristle);
        }

        // Web spinner (tiny sphere at back of abdomen)
        const spinnerGeo = new THREE.SphereGeometry(0.04, 5, 4);
        const spinner = new THREE.Mesh(spinnerGeo, spiderMat);
        spinner.position.set(0, 0.38, -0.8);
        group.add(spinner);

        // Pattern on abdomen (colored markings)
        const markingMat = new THREE.MeshStandardMaterial({ color: 0xff4422, roughness: 0.7 });
        for (let mi = 0; mi < 3; mi++) {
          const markGeo = new THREE.SphereGeometry(0.04, 5, 4);
          const mark = new THREE.Mesh(markGeo, markingMat);
          mark.position.set(0, 0.55 - mi * 0.06, -0.45 + 0.34);
          group.add(mark);
        }

        // 6 eyes total (smaller, arranged in cluster)
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 });
        const eyePositions = [
          [-0.1, 0.6, 0.2], [0.1, 0.6, 0.2],
          [-0.06, 0.65, 0.22], [0.06, 0.65, 0.22],
          [-0.04, 0.57, 0.23], [0.04, 0.57, 0.23],
        ];
        for (const ep of eyePositions) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), eyeMat);
          eye.position.set(ep[0], ep[1], ep[2]);
          group.add(eye);
        }

        // 8 legs with joint spheres at bend points
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const legGeo = new THREE.CylinderGeometry(0.02, 0.015, 0.7, 5);
          const leg = new THREE.Mesh(legGeo, spiderMat);
          leg.position.set(
            Math.cos(angle) * 0.35,
            0.35,
            Math.sin(angle) * 0.35
          );
          leg.rotation.z = Math.cos(angle) * 0.8;
          leg.rotation.x = Math.sin(angle) * 0.3;
          group.add(leg);

          // Leg joint (small sphere at bend point)
          const jointGeo = new THREE.SphereGeometry(0.025, 4, 3);
          const joint = new THREE.Mesh(jointGeo, spiderMat);
          joint.position.set(
            Math.cos(angle) * 0.5,
            0.25,
            Math.sin(angle) * 0.5
          );
          group.add(joint);
        }
        break;
      }

      case EnemyType.TREANT: {
        const barkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.95 });
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.5, 8), barkMat);
        trunk.position.y = 1.25;
        trunk.castShadow = true;
        group.add(trunk);

        // Branches as arms
        for (let side = -1; side <= 1; side += 2) {
          const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.2, 6), barkMat);
          branch.position.set(side * 0.7, 2.0, 0);
          branch.rotation.z = side * 0.8;
          group.add(branch);

          // Sub-branches
          for (let j = 0; j < 3; j++) {
            const subBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.5, 5), barkMat);
            subBranch.position.set(side * (0.9 + j * 0.15), 2.2 + j * 0.2, (Math.random() - 0.5) * 0.3);
            subBranch.rotation.z = side * (1.0 + j * 0.2);
            group.add(subBranch);
          }
        }

        // Leaf crown
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a6a22, roughness: 0.8 });
        const crown = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), leafMat);
        crown.position.y = 3.2;
        crown.castShadow = true;
        group.add(crown);

        // Face (eyes)
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xaa6600, emissiveIntensity: 0.5 });
        for (let side = -1; side <= 1; side += 2) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), eyeMat);
          eye.position.set(side * 0.2, 2.2, 0.45);
          group.add(eye);
        }

        // Bark detail (multiple thin boxes on trunk surface)
        for (let bi = 0; bi < 6; bi++) {
          const barkPlateGeo = new THREE.BoxGeometry(0.15, 0.3, 0.06);
          const barkPlate = new THREE.Mesh(barkPlateGeo, barkMat);
          const bAngle = (bi / 6) * Math.PI * 2;
          barkPlate.position.set(Math.cos(bAngle) * 0.55, 0.8 + bi * 0.3, Math.sin(bAngle) * 0.55);
          group.add(barkPlate);
        }

        // Moss patches (small green spheres on trunk)
        const mossMat2 = new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 1.0 });
        for (let mi = 0; mi < 5; mi++) {
          const mossGeo2 = new THREE.SphereGeometry(0.1, 5, 4);
          const moss2 = new THREE.Mesh(mossGeo2, mossMat2);
          moss2.position.set((Math.random() - 0.5) * 0.6, 0.5 + Math.random() * 2.0, (Math.random() - 0.5) * 0.6);
          group.add(moss2);
        }

        // Bird nest (small brown box in branches with tiny sphere eggs)
        const nestGeo = new THREE.BoxGeometry(0.25, 0.08, 0.25);
        const nestMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.95 });
        const nest = new THREE.Mesh(nestGeo, nestMat);
        nest.position.set(0.6, 2.5, 0.2);
        group.add(nest);
        const eggMat = new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.6 });
        for (let ei = 0; ei < 3; ei++) {
          const eggGeo = new THREE.SphereGeometry(0.03, 5, 4);
          const egg = new THREE.Mesh(eggGeo, eggMat);
          egg.position.set(0.55 + ei * 0.05, 2.55, 0.18 + (Math.random() - 0.5) * 0.1);
          group.add(egg);
        }

        // Roots visible at base (thick cylinders spreading from base)
        for (let ri = 0; ri < 4; ri++) {
          const rootAngle = (ri / 4) * Math.PI * 2 + 0.3;
          const rootGeo = new THREE.CylinderGeometry(0.08, 0.12, 1.0, 6);
          const root = new THREE.Mesh(rootGeo, barkMat);
          root.position.set(Math.cos(rootAngle) * 0.6, 0.05, Math.sin(rootAngle) * 0.6);
          root.rotation.z = Math.cos(rootAngle) * 1.2;
          root.rotation.x = Math.sin(rootAngle) * 0.3;
          group.add(root);
        }

        // Glowing sap (small emissive yellow-green planes in trunk cracks)
        const sapMat = new THREE.MeshStandardMaterial({ color: 0xaaff44, emissive: 0x88cc22, emissiveIntensity: 1.0 });
        for (let si = 0; si < 3; si++) {
          const sapGeo = new THREE.BoxGeometry(0.04, 0.12, 0.01);
          const sap = new THREE.Mesh(sapGeo, sapMat);
          sap.position.set((Math.random() - 0.5) * 0.4, 1.0 + si * 0.5, 0.55);
          group.add(sap);
        }

        // Hanging vines (thin green cylinders from branches)
        const vineMat = new THREE.MeshStandardMaterial({ color: 0x337722, roughness: 0.9 });
        for (let vi = 0; vi < 4; vi++) {
          const vineGeo = new THREE.CylinderGeometry(0.015, 0.01, 1.0 + Math.random() * 0.5, 4);
          const vine = new THREE.Mesh(vineGeo, vineMat);
          vine.position.set((Math.random() - 0.5) * 1.5, 2.5, (Math.random() - 0.5) * 1.0);
          group.add(vine);
        }

        // More leaf clusters (additional smaller spheres in crown)
        for (let li = 0; li < 4; li++) {
          const leafClusterGeo = new THREE.SphereGeometry(0.5 + Math.random() * 0.3, 6, 5);
          const leafCluster = new THREE.Mesh(leafClusterGeo, leafMat);
          leafCluster.position.set(
            (Math.random() - 0.5) * 1.5,
            3.0 + Math.random() * 0.6,
            (Math.random() - 0.5) * 1.5
          );
          group.add(leafCluster);
        }

        // Leg trunks
        for (let side = -1; side <= 1; side += 2) {
          const legTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.8, 6), barkMat);
          legTrunk.position.set(side * 0.3, 0.2, 0);
          group.add(legTrunk);
        }
        break;
      }

      case EnemyType.CORRUPTED_ELF: {
        const darkPurple = new THREE.MeshStandardMaterial({ color: 0x3a1a4a, roughness: 0.6 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0x8866aa, roughness: 0.5 });
        // Slender body
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.18), darkPurple);
        torso.position.y = 1.15;
        torso.castShadow = true;
        group.add(torso);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), skinMat);
        head.position.y = 1.55;
        group.add(head);

        // Pointed ears
        for (let side = -1; side <= 1; side += 2) {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 4), skinMat);
          ear.position.set(side * 0.16, 1.58, 0);
          ear.rotation.z = side * 0.5;
          group.add(ear);
        }

        // Red emissive eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2.0 });
        for (let side = -1; side <= 1; side += 2) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), eyeMat);
          eye.position.set(side * 0.055, 1.57, 0.12);
          group.add(eye);
        }

        // Legs
        for (let side = -1; side <= 1; side += 2) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.7, 8), darkPurple);
          leg.position.set(side * 0.08, 0.5, 0);
          group.add(leg);
        }

        // Arms
        for (let side = -1; side <= 1; side += 2) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.5, 8), skinMat);
          arm.position.set(side * 0.22, 1.15, 0);
          group.add(arm);

          // Glowing runes on arms (small emissive planes on forearms)
          const runeArmMat = new THREE.MeshStandardMaterial({
            color: 0xaa44ff, emissive: 0x8822dd, emissiveIntensity: 1.5,
            transparent: true, opacity: 0.8,
          });
          const runeArmGeo = new THREE.BoxGeometry(0.03, 0.06, 0.01);
          const runeArm = new THREE.Mesh(runeArmGeo, runeArmMat);
          runeArm.position.set(side * 0.22, 1.0, 0.04);
          group.add(runeArm);
        }

        // Dark crown/tiara (thin torus on head with spike)
        const tiaraGeo = new THREE.TorusGeometry(0.15, 0.015, 6, 12);
        const tiaraMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.7, roughness: 0.3 });
        const tiara = new THREE.Mesh(tiaraGeo, tiaraMat);
        tiara.position.y = 1.65;
        tiara.rotation.x = Math.PI / 2;
        group.add(tiara);
        const tiaraSpikeGeo = new THREE.ConeGeometry(0.02, 0.1, 4);
        const tiaraSpike = new THREE.Mesh(tiaraSpikeGeo, tiaraMat);
        tiaraSpike.position.set(0, 1.72, 0.12);
        group.add(tiaraSpike);

        // Flowing dark hair (thin box strips down back)
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2a, roughness: 0.9 });
        for (let hi = 0; hi < 3; hi++) {
          const hairGeo = new THREE.BoxGeometry(0.06, 0.3, 0.02);
          const hair = new THREE.Mesh(hairGeo, hairMat);
          hair.position.set(-0.06 + hi * 0.06, 1.4, -0.12);
          group.add(hair);
        }

        // Elegant but corrupted armor (angular pauldrons)
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x2a1a3a, metalness: 0.5, roughness: 0.4 });
        for (let side = -1; side <= 1; side += 2) {
          const pauldGeo = new THREE.BoxGeometry(0.08, 0.04, 0.1);
          const pauld = new THREE.Mesh(pauldGeo, armorMat);
          pauld.position.set(side * 0.2, 1.42, 0);
          pauld.rotation.z = side * 0.3;
          group.add(pauld);
        }

        // Shadow wisps (translucent dark spheres floating near body)
        const wispMat = new THREE.MeshStandardMaterial({
          color: 0x1a0a2a, transparent: true, opacity: 0.3, roughness: 0.5,
        });
        for (let wi = 0; wi < 3; wi++) {
          const wispGeo = new THREE.SphereGeometry(0.08, 6, 5);
          const wisp = new THREE.Mesh(wispGeo, wispMat);
          wisp.position.set(
            (Math.random() - 0.5) * 0.6,
            0.8 + Math.random() * 0.8,
            (Math.random() - 0.5) * 0.4
          );
          group.add(wisp);
        }
        break;
      }

      case EnemyType.DARK_RANGER: {
        const cloakMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.9 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0x7766aa, roughness: 0.5 });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.2), cloakMat);
        torso.position.y = 1.15;
        torso.castShadow = true;
        group.add(torso);

        // Cloak
        const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 8), cloakMat);
        cloak.position.set(0, 0.9, -0.1);
        group.add(cloak);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), skinMat);
        head.position.y = 1.55;
        group.add(head);

        // Hood
        const hood = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 8), cloakMat);
        hood.position.y = 1.68;
        group.add(hood);

        // Legs
        for (let side = -1; side <= 1; side += 2) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.7, 8), cloakMat);
          leg.position.set(side * 0.09, 0.5, 0);
          group.add(leg);
        }

        // Arms
        for (let side = -1; side <= 1; side += 2) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.5, 8), skinMat);
          arm.position.set(side * 0.25, 1.15, 0);
          group.add(arm);
        }

        // Dark bow (black with purple glow)
        const bowGeo = new THREE.TorusGeometry(0.35, 0.02, 6, 10, Math.PI);
        const bowMat = new THREE.MeshStandardMaterial({
          color: 0x111122, emissive: 0x4422aa, emissiveIntensity: 0.5, roughness: 0.6,
        });
        const bow = new THREE.Mesh(bowGeo, bowMat);
        bow.position.set(-0.35, 1.0, 0.15);
        bow.rotation.z = Math.PI / 2;
        group.add(bow);

        // Quiver of dark arrows with purple tips
        const drQuiverGeo = new THREE.BoxGeometry(0.08, 0.4, 0.06);
        const drQuiverMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.8 });
        const drQuiver = new THREE.Mesh(drQuiverGeo, drQuiverMat);
        drQuiver.position.set(0.12, 1.2, -0.15);
        group.add(drQuiver);
        const purpleTipMat = new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 1.0 });
        for (let da = 0; da < 4; da++) {
          const daGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.45, 4);
          const daArrow = new THREE.Mesh(daGeo, cloakMat);
          daArrow.position.set(0.12 + (da - 1.5) * 0.018, 1.3, -0.15);
          group.add(daArrow);
          const daTipGeo = new THREE.ConeGeometry(0.015, 0.04, 4);
          const daTip = new THREE.Mesh(daTipGeo, purpleTipMat);
          daTip.position.set(0.12 + (da - 1.5) * 0.018, 1.54, -0.15);
          group.add(daTip);
        }

        // Face mask/veil (small plane across face)
        const veilGeo = new THREE.BoxGeometry(0.16, 0.06, 0.02);
        const veilMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.9 });
        const veil = new THREE.Mesh(veilGeo, veilMat);
        veil.position.set(0, 1.52, 0.13);
        group.add(veil);

        // Shadow trail hint (translucent dark cone trailing behind)
        const trailGeo = new THREE.ConeGeometry(0.2, 0.6, 6);
        const trailMat = new THREE.MeshStandardMaterial({
          color: 0x1a0a2a, transparent: true, opacity: 0.2, roughness: 0.5,
        });
        const trail = new THREE.Mesh(trailGeo, trailMat);
        trail.position.set(0, 0.6, -0.4);
        trail.rotation.x = Math.PI / 2;
        group.add(trail);
        break;
      }

      case EnemyType.SHADOW_BEAST: {
        const shadowMat = new THREE.MeshStandardMaterial({
          color: 0x1a0a2a,
          transparent: true,
          opacity: 0.7,
          roughness: 0.5,
        });
        // Overlapping translucent spheres
        const radii = [0.6, 0.5, 0.45, 0.35, 0.3];
        const yOffsets = [0.7, 1.2, 1.6, 2.0, 2.3];
        for (let i = 0; i < radii.length; i++) {
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(radii[i], 10, 8), shadowMat);
          sphere.position.y = yOffsets[i];
          sphere.position.x = (Math.random() - 0.5) * 0.2;
          sphere.position.z = (Math.random() - 0.5) * 0.2;
          group.add(sphere);
        }

        // Additional overlapping spheres of different sizes (shifting form)
        const extraRadii = [0.25, 0.2, 0.4, 0.15, 0.3];
        const extraYOff = [0.4, 0.9, 1.4, 2.4, 2.6];
        for (let ei = 0; ei < extraRadii.length; ei++) {
          const eSphere = new THREE.Mesh(new THREE.SphereGeometry(extraRadii[ei], 8, 6), shadowMat);
          eSphere.position.set((Math.random() - 0.5) * 0.3, extraYOff[ei], (Math.random() - 0.5) * 0.3);
          group.add(eSphere);
        }

        // Purple eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822dd, emissiveIntensity: 2.0 });
        for (let side = -1; side <= 1; side += 2) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), eyeMat);
          eye.position.set(side * 0.15, 2.0, 0.3);
          group.add(eye);
        }

        // Jaw/maw (red emissive opening in the front)
        const mawMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xaa0000, emissiveIntensity: 1.5 });
        const mawGeo = new THREE.BoxGeometry(0.2, 0.1, 0.05);
        const maw = new THREE.Mesh(mawGeo, mawMat);
        maw.position.set(0, 1.8, 0.35);
        group.add(maw);

        // Core (central brighter sphere within dark mass)
        const coreMat = new THREE.MeshStandardMaterial({
          color: 0x6622aa, emissive: 0x4411aa, emissiveIntensity: 2.0,
          transparent: true, opacity: 0.6,
        });
        const coreGeo = new THREE.SphereGeometry(0.2, 8, 6);
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.y = 1.3;
        group.add(core);

        // Tendrils (thin cylinders extending from body mass)
        for (let ti = 0; ti < 5; ti++) {
          const tAngle = (ti / 5) * Math.PI * 2;
          const tendrilGeo = new THREE.CylinderGeometry(0.03, 0.01, 1.0, 5);
          const tendril = new THREE.Mesh(tendrilGeo, shadowMat);
          tendril.position.set(Math.cos(tAngle) * 0.4, 1.0, Math.sin(tAngle) * 0.4);
          tendril.rotation.z = Math.cos(tAngle) * 0.8;
          tendril.rotation.x = Math.sin(tAngle) * 0.5;
          group.add(tendril);
        }

        // Floating debris (small dark boxes orbiting the body)
        const debrisMat = new THREE.MeshStandardMaterial({ color: 0x0a0510, roughness: 0.8 });
        for (let di = 0; di < 4; di++) {
          const debrisGeo = new THREE.BoxGeometry(0.08, 0.06, 0.06);
          const debris = new THREE.Mesh(debrisGeo, debrisMat);
          const dAngle2 = (di / 4) * Math.PI * 2;
          debris.position.set(Math.cos(dAngle2) * 0.8, 1.5 + Math.random() * 0.5, Math.sin(dAngle2) * 0.8);
          debris.rotation.set(Math.random(), Math.random(), Math.random());
          group.add(debris);
        }

        // Ground shadow (dark transparent circle below)
        const gShadowGeo = new THREE.CircleGeometry(1.0, 12);
        const gShadowMat = new THREE.MeshStandardMaterial({
          color: 0x0a0510, transparent: true, opacity: 0.3, roughness: 1.0,
        });
        const gShadow = new THREE.Mesh(gShadowGeo, gShadowMat);
        gShadow.rotation.x = -Math.PI / 2;
        gShadow.position.y = 0.02;
        group.add(gShadow);
        break;
      }

      case EnemyType.SKELETON_WARRIOR: {
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.7 });
        // Skull
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), boneMat);
        skull.position.y = 1.55;
        group.add(skull);

        // Eye sockets
        const socketMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        for (let side = -1; side <= 1; side += 2) {
          const socket = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), socketMat);
          socket.position.set(side * 0.06, 1.57, 0.13);
          group.add(socket);
        }

        // Spine
        const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 6), boneMat);
        spine.position.y = 1.15;
        group.add(spine);

        // Ribs (thin torus rings)
        for (let r = 0; r < 4; r++) {
          const ribGeo = new THREE.TorusGeometry(0.15 - r * 0.015, 0.015, 5, 10, Math.PI);
          const rib = new THREE.Mesh(ribGeo, boneMat);
          rib.position.y = 1.3 - r * 0.08;
          rib.rotation.y = Math.PI;
          group.add(rib);
        }

        // Pelvis
        const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.12), boneMat);
        pelvis.position.y = 0.85;
        group.add(pelvis);

        // Arms
        for (let side = -1; side <= 1; side += 2) {
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 5), boneMat);
          upperArm.position.set(side * 0.22, 1.2, 0);
          group.add(upperArm);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 5), boneMat);
          forearm.position.set(side * 0.25, 0.9, 0);
          group.add(forearm);
        }

        // Legs
        for (let side = -1; side <= 1; side += 2) {
          const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.4, 5), boneMat);
          femur.position.set(side * 0.08, 0.6, 0);
          group.add(femur);
          const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5), boneMat);
          tibia.position.set(side * 0.08, 0.2, 0);
          group.add(tibia);
        }

        // Jaw (small separate box that hangs below skull)
        const jawGeo = new THREE.BoxGeometry(0.1, 0.04, 0.06);
        const jaw = new THREE.Mesh(jawGeo, boneMat);
        jaw.position.set(0, 1.42, 0.08);
        jaw.rotation.x = 0.15;
        group.add(jaw);

        // Finger bones (tiny cylinders at hands)
        for (let side = -1; side <= 1; side += 2) {
          for (let fb = 0; fb < 3; fb++) {
            const fingerBoneGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.08, 4);
            const fingerBone = new THREE.Mesh(fingerBoneGeo, boneMat);
            fingerBone.position.set(side * 0.25 + (fb - 1) * 0.02, 0.72, 0);
            group.add(fingerBone);
          }
        }

        // Spine (column of small spheres connecting head to pelvis)
        for (let sv = 0; sv < 5; sv++) {
          const vertebraGeo = new THREE.SphereGeometry(0.03, 5, 4);
          const vertebra = new THREE.Mesh(vertebraGeo, boneMat);
          vertebra.position.set(0, 0.9 + sv * 0.1, -0.05);
          group.add(vertebra);
        }

        // Tattered cloth (small translucent plane hanging from waist)
        const tatteredMat = new THREE.MeshStandardMaterial({
          color: 0x444433, transparent: true, opacity: 0.5, roughness: 0.9, side: THREE.DoubleSide,
        });
        const tatteredGeo = new THREE.BoxGeometry(0.2, 0.25, 0.01);
        const tatCloth = new THREE.Mesh(tatteredGeo, tatteredMat);
        tatCloth.position.set(0, 0.7, 0.08);
        group.add(tatCloth);

        // Sword
        const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.015),
          new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.3 }));
        swordBlade.position.set(0.3, 0.8, 0);
        group.add(swordBlade);

        // Broken shield (half circle geometry)
        const brokenShieldGeo = new THREE.CircleGeometry(0.15, 6, 0, Math.PI);
        const brokenShieldMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.8, side: THREE.DoubleSide });
        const brokenShield = new THREE.Mesh(brokenShieldGeo, brokenShieldMat);
        brokenShield.position.set(-0.3, 0.9, 0.08);
        group.add(brokenShield);
        break;
      }

      case EnemyType.ZOMBIE: {
        const zombieSkin = new THREE.MeshStandardMaterial({ color: 0x667755, roughness: 0.9 });
        const clothMat = new THREE.MeshStandardMaterial({ color: 0x444433, roughness: 0.95 });

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), zombieSkin);
        head.position.set(0.05, 1.4, 0.08);
        group.add(head);

        // Torso (hunched)
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.28), clothMat);
        torso.position.set(0, 1.0, 0.05);
        torso.rotation.x = 0.2;
        torso.castShadow = true;
        group.add(torso);

        // Torn clothing patches
        for (let p = 0; p < 3; p++) {
          const patchGeo = new THREE.BoxGeometry(0.15, 0.12, 0.01);
          const patchMat = new THREE.MeshStandardMaterial({ color: 0x333322, roughness: 1.0 });
          const patch = new THREE.Mesh(patchGeo, patchMat);
          patch.position.set(
            (Math.random() - 0.5) * 0.3,
            0.9 + Math.random() * 0.3,
            0.15
          );
          group.add(patch);
        }

        // Arms (one hanging lower)
        for (let side = -1; side <= 1; side += 2) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.6, 8), zombieSkin);
          arm.position.set(side * 0.25, side === 1 ? 0.85 : 0.95, 0.1);
          arm.rotation.z = side * 0.15;
          arm.rotation.x = side === 1 ? 0.5 : 0;
          group.add(arm);
        }

        // Exposed flesh (small red/pink spheres on body - wounds)
        const woundMat = new THREE.MeshStandardMaterial({ color: 0xaa3344, roughness: 0.8 });
        for (let wi = 0; wi < 4; wi++) {
          const woundGeo = new THREE.SphereGeometry(0.04, 5, 4);
          const wound = new THREE.Mesh(woundGeo, woundMat);
          wound.position.set(
            (Math.random() - 0.5) * 0.3,
            0.85 + Math.random() * 0.4,
            0.12 + Math.random() * 0.05
          );
          group.add(wound);
        }

        // Green glow from wounds (small emissive green planes)
        const glowWoundMat = new THREE.MeshStandardMaterial({
          color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 1.0,
          transparent: true, opacity: 0.6,
        });
        for (let gi = 0; gi < 2; gi++) {
          const glowWGeo = new THREE.BoxGeometry(0.04, 0.04, 0.01);
          const glowW = new THREE.Mesh(glowWGeo, glowWoundMat);
          glowW.position.set((Math.random() - 0.5) * 0.25, 0.9 + gi * 0.2, 0.16);
          group.add(glowW);
        }

        // Torn clothing patches (translucent dark planes on torso)
        const tornMat = new THREE.MeshStandardMaterial({
          color: 0x333322, transparent: true, opacity: 0.6, roughness: 1.0, side: THREE.DoubleSide,
        });
        for (let tp = 0; tp < 3; tp++) {
          const tornGeo = new THREE.BoxGeometry(0.12, 0.1, 0.01);
          const torn = new THREE.Mesh(tornGeo, tornMat);
          torn.position.set((Math.random() - 0.5) * 0.3, 0.85 + tp * 0.15, 0.16);
          group.add(torn);
        }

        // Hunched back (additional sphere on upper back)
        const hunchGeo = new THREE.SphereGeometry(0.12, 6, 5);
        const hunch = new THREE.Mesh(hunchGeo, zombieSkin);
        hunch.position.set(0, 1.2, -0.1);
        group.add(hunch);

        // Jaw hanging (rotated jaw box)
        const zJawGeo = new THREE.BoxGeometry(0.1, 0.04, 0.06);
        const zJaw = new THREE.Mesh(zJawGeo, zombieSkin);
        zJaw.position.set(0.05, 1.33, 0.14);
        zJaw.rotation.x = 0.3;
        group.add(zJaw);

        // Legs (one shorter/angled differently for dragging foot)
        for (let side = -1; side <= 1; side += 2) {
          const legLen = side === 1 ? 0.55 : 0.65;
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, legLen, 8), clothMat);
          leg.position.set(side * 0.1, side === 1 ? 0.35 : 0.4, 0);
          if (side === 1) leg.rotation.x = 0.15;
          group.add(leg);
        }
        break;
      }

      case EnemyType.NECROMANCER: {
        const robeMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2a, roughness: 0.8 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.6 });

        // Robe body (tall cone)
        const robe = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 8), robeMat);
        robe.position.y = 0.75;
        robe.castShadow = true;
        group.add(robe);

        // Upper torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.2), robeMat);
        torso.position.y = 1.3;
        group.add(torso);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), skinMat);
        head.position.y = 1.65;
        group.add(head);

        // Hood
        const hood = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.25, 8), robeMat);
        hood.position.y = 1.78;
        group.add(hood);

        // Purple eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822dd, emissiveIntensity: 2.0 });
        for (let side = -1; side <= 1; side += 2) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), eyeMat);
          eye.position.set(side * 0.055, 1.67, 0.12);
          group.add(eye);
        }

        // Arms
        for (let side = -1; side <= 1; side += 2) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.5, 8), robeMat);
          arm.position.set(side * 0.25, 1.15, 0);
          group.add(arm);
        }

        // Skull staff
        const staffGeo = new THREE.CylinderGeometry(0.03, 0.04, 1.8, 6);
        const staffMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
        const staff = new THREE.Mesh(staffGeo, staffMat);
        staff.position.set(0.3, 1.0, 0);
        group.add(staff);

        // Ornate staff skull with green emissive eyes
        const staffSkullMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.7 });
        const staffSkull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), staffSkullMat);
        staffSkull.position.set(0.3, 1.95, 0);
        group.add(staffSkull);
        const skullEyeMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22cc22, emissiveIntensity: 2.0 });
        for (let side = -1; side <= 1; side += 2) {
          const skullEye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 3), skullEyeMat);
          skullEye.position.set(0.3 + side * 0.04, 1.97, 0.08);
          group.add(skullEye);
        }

        // Floating orbs (2 small translucent purple spheres orbiting)
        const floatOrbMat = new THREE.MeshStandardMaterial({
          color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 1.0,
          transparent: true, opacity: 0.5,
        });
        for (let fo = 0; fo < 2; fo++) {
          const foGeo = new THREE.SphereGeometry(0.06, 6, 5);
          const floatOrb = new THREE.Mesh(foGeo, floatOrbMat);
          const foAngle = (fo / 2) * Math.PI * 2;
          floatOrb.position.set(
            Math.cos(foAngle) * 0.5,
            1.5,
            Math.sin(foAngle) * 0.5
          );
          group.add(floatOrb);
        }

        // Hood shadow (dark box over face area)
        const hoodShadowGeo = new THREE.BoxGeometry(0.18, 0.08, 0.12);
        const hoodShadowMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1.0 });
        const hoodShadow = new THREE.Mesh(hoodShadowGeo, hoodShadowMat);
        hoodShadow.position.set(0, 1.65, 0.06);
        group.add(hoodShadow);

        // Skeletal hands (thin cylinders for fingers visible from sleeves)
        for (let side = -1; side <= 1; side += 2) {
          for (let nf = 0; nf < 3; nf++) {
            const nfGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.08, 4);
            const nfMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.7 });
            const nfMesh = new THREE.Mesh(nfGeo, nfMat);
            nfMesh.position.set(side * 0.25 + (nf - 1) * 0.015, 0.85, 0);
            group.add(nfMesh);
          }
        }

        // Runic circle at feet (torus with emissive green material)
        const runicGeo = new THREE.TorusGeometry(0.6, 0.02, 6, 16);
        const runicMat = new THREE.MeshStandardMaterial({
          color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 1.5,
        });
        const runicCircle = new THREE.Mesh(runicGeo, runicMat);
        runicCircle.rotation.x = -Math.PI / 2;
        runicCircle.position.y = 0.03;
        group.add(runicCircle);

        // Book held in off-hand (small box, dark leather colored)
        const necBookGeo = new THREE.BoxGeometry(0.1, 0.12, 0.04);
        const necBookMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 });
        const necBook = new THREE.Mesh(necBookGeo, necBookMat);
        necBook.position.set(-0.3, 0.95, 0.1);
        group.add(necBook);
        break;
      }

      case EnemyType.BONE_GOLEM: {
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.7 });

        // Massive body cluster
        const bodyParts = [
          { r: 0.8, y: 1.2, x: 0, z: 0 },
          { r: 0.6, y: 2.0, x: 0.1, z: 0 },
          { r: 0.5, y: 0.6, x: -0.1, z: 0.1 },
          { r: 0.4, y: 2.5, x: 0, z: 0 },
        ];
        for (const part of bodyParts) {
          const geo = new THREE.SphereGeometry(part.r, 8, 6);
          const mesh = new THREE.Mesh(geo, boneMat);
          mesh.position.set(part.x, part.y, part.z);
          mesh.castShadow = true;
          group.add(mesh);
        }

        // Head skull
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), boneMat);
        skull.position.y = 3.0;
        group.add(skull);

        // Eye sockets
        const socketMat = new THREE.MeshStandardMaterial({ color: 0x440000, emissive: 0x330000, emissiveIntensity: 1.0 });
        for (let side = -1; side <= 1; side += 2) {
          const socket = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), socketMat);
          socket.position.set(side * 0.12, 3.05, 0.25);
          group.add(socket);
        }

        // Arms
        for (let side = -1; side <= 1; side += 2) {
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.8, 8), boneMat);
          upperArm.position.set(side * 1.0, 2.0, 0);
          upperArm.rotation.z = side * 0.5;
          group.add(upperArm);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.7, 8), boneMat);
          forearm.position.set(side * 1.4, 1.4, 0);
          group.add(forearm);
          // Fist
          const fist = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), boneMat);
          fist.position.set(side * 1.5, 0.9, 0);
          group.add(fist);
        }

        // Central ribcage structure (curved cylinders forming ribs)
        for (let rb = 0; rb < 4; rb++) {
          const ribGeo2 = new THREE.TorusGeometry(0.4 - rb * 0.03, 0.03, 5, 8, Math.PI);
          const rib2 = new THREE.Mesh(ribGeo2, boneMat);
          rib2.position.set(0, 1.8 - rb * 0.15, 0);
          rib2.rotation.y = Math.PI;
          group.add(rib2);
        }

        // Massive bone club arm (one arm much larger)
        const clubGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.0, 8);
        const club = new THREE.Mesh(clubGeo, boneMat);
        club.position.set(1.5, 0.9, 0);
        group.add(club);
        const clubEndGeo = new THREE.SphereGeometry(0.35, 6, 5);
        const clubEnd = new THREE.Mesh(clubEndGeo, boneMat);
        clubEnd.position.set(1.5, 0.35, 0);
        group.add(clubEnd);

        // Visible joints (green/purple glowing spheres at connections)
        const jointGlowMat = new THREE.MeshStandardMaterial({
          color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 1.5,
          transparent: true, opacity: 0.7,
        });
        const jointPositions = [
          [0, 2.6, 0], [1.0, 2.0, 0], [-1.0, 2.0, 0],
          [0.4, 0.7, 0], [-0.4, 0.7, 0],
        ];
        for (const jp of jointPositions) {
          const jGeo = new THREE.SphereGeometry(0.08, 5, 4);
          const jMesh = new THREE.Mesh(jGeo, jointGlowMat);
          jMesh.position.set(jp[0], jp[1], jp[2]);
          group.add(jMesh);
        }

        // Ground cracks (small dark planes around feet)
        const crackMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.4, roughness: 1.0 });
        for (let ci = 0; ci < 4; ci++) {
          const crackGeo = new THREE.BoxGeometry(0.3 + Math.random() * 0.2, 0.01, 0.05);
          const crack = new THREE.Mesh(crackGeo, crackMat);
          crack.position.set((Math.random() - 0.5) * 1.0, 0.01, (Math.random() - 0.5) * 0.8);
          crack.rotation.y = Math.random() * Math.PI;
          group.add(crack);
        }

        // More varied bone pieces (mix of shapes)
        for (let bv = 0; bv < 5; bv++) {
          const bvType = bv % 3;
          let bvMesh: THREE.Mesh;
          if (bvType === 0) {
            bvMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.1), boneMat);
          } else if (bvType === 1) {
            bvMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.35, 5), boneMat);
          } else {
            bvMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), boneMat);
          }
          bvMesh.position.set(
            (Math.random() - 0.5) * 0.8,
            0.5 + Math.random() * 1.5,
            (Math.random() - 0.5) * 0.6
          );
          bvMesh.rotation.set(Math.random(), Math.random(), Math.random());
          group.add(bvMesh);
        }

        // Legs
        for (let side = -1; side <= 1; side += 2) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.8, 8), boneMat);
          leg.position.set(side * 0.4, 0.3, 0);
          group.add(leg);
        }
        break;
      }

      case EnemyType.WRAITH: {
        const wraithMat = new THREE.MeshStandardMaterial({
          color: 0x2244aa,
          transparent: true,
          opacity: 0.5,
          emissive: 0x1122aa,
          emissiveIntensity: 0.8,
          roughness: 0.3,
        });

        // Floating cone robe (no legs)
        const robe = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.8, 8), wraithMat);
        robe.position.y = 1.2;
        group.add(robe);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), wraithMat);
        head.position.y = 2.2;
        group.add(head);

        // Blue glowing eyes
        const eyeMat = new THREE.MeshStandardMaterial({
          color: 0x44ccff,
          emissive: 0x44ccff,
          emissiveIntensity: 3.0,
        });
        for (let side = -1; side <= 1; side += 2) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), eyeMat);
          eye.position.set(side * 0.07, 2.22, 0.15);
          group.add(eye);
        }

        // Ethereal arms
        for (let side = -1; side <= 1; side += 2) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.8, 6), wraithMat);
          arm.position.set(side * 0.5, 1.8, 0);
          arm.rotation.z = side * 0.6;
          group.add(arm);
        }

        // Spectral chains (thin cylinders hanging from wrists)
        for (let side = -1; side <= 1; side += 2) {
          for (let ch = 0; ch < 3; ch++) {
            const chainGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.15, 4);
            const chain = new THREE.Mesh(chainGeo, wraithMat);
            chain.position.set(side * 0.55, 1.5 - ch * 0.12, 0);
            group.add(chain);
          }
        }

        // Crown remnant (thin torus with broken spike)
        const crownGeo = new THREE.TorusGeometry(0.2, 0.015, 6, 10);
        const crownMat2 = new THREE.MeshStandardMaterial({
          color: 0x4466aa, emissive: 0x2244aa, emissiveIntensity: 0.8,
          transparent: true, opacity: 0.6,
        });
        const crownMesh = new THREE.Mesh(crownGeo, crownMat2);
        crownMesh.position.y = 2.35;
        crownMesh.rotation.x = Math.PI / 2;
        group.add(crownMesh);
        const crownSpikeGeo = new THREE.ConeGeometry(0.02, 0.1, 4);
        const crownSpike = new THREE.Mesh(crownSpikeGeo, crownMat2);
        crownSpike.position.set(0, 2.42, 0.15);
        group.add(crownSpike);

        // Ethereal trail (translucent plane extending behind)
        const trailGeo2 = new THREE.BoxGeometry(0.3, 0.01, 0.8);
        const trailMat2 = new THREE.MeshStandardMaterial({
          color: 0x2244aa, emissive: 0x1122aa, emissiveIntensity: 0.5,
          transparent: true, opacity: 0.2,
        });
        const trail2 = new THREE.Mesh(trailGeo2, trailMat2);
        trail2.position.set(0, 0.8, -0.5);
        group.add(trail2);

        // Ghostly face (very subtle light-colored features)
        const faceMat = new THREE.MeshStandardMaterial({
          color: 0x6688cc, emissive: 0x4466aa, emissiveIntensity: 0.3,
          transparent: true, opacity: 0.3,
        });
        const noseGhostGeo = new THREE.ConeGeometry(0.02, 0.05, 4);
        const noseGhost = new THREE.Mesh(noseGhostGeo, faceMat);
        noseGhost.position.set(0, 2.18, 0.16);
        noseGhost.rotation.x = -Math.PI / 2;
        group.add(noseGhost);

        // Soul orbs (tiny bright blue orbiting spheres)
        const soulMat = new THREE.MeshStandardMaterial({
          color: 0x44ccff, emissive: 0x44ccff, emissiveIntensity: 2.0,
        });
        for (let so = 0; so < 3; so++) {
          const soulGeo = new THREE.SphereGeometry(0.03, 5, 4);
          const soul = new THREE.Mesh(soulGeo, soulMat);
          const soAngle = (so / 3) * Math.PI * 2;
          soul.position.set(
            Math.cos(soAngle) * 0.7,
            1.5 + Math.sin(soAngle) * 0.3,
            Math.sin(soAngle) * 0.7
          );
          group.add(soul);
        }

        // Tattered robe edges (multiple thin planes at bottom of robe cone)
        for (let te = 0; te < 5; te++) {
          const tatEdgeGeo = new THREE.BoxGeometry(0.15, 0.3, 0.01);
          const tatEdge = new THREE.Mesh(tatEdgeGeo, wraithMat);
          const teAngle = (te / 5) * Math.PI * 2;
          tatEdge.position.set(
            Math.cos(teAngle) * 0.5,
            0.4,
            Math.sin(teAngle) * 0.5
          );
          tatEdge.rotation.y = teAngle;
          group.add(tatEdge);
        }

        // Floating glow underneath
        const glowGeo = new THREE.SphereGeometry(0.3, 8, 6);
        const glowMat = new THREE.MeshStandardMaterial({
          color: 0x2244aa,
          emissive: 0x1122aa,
          emissiveIntensity: 1.0,
          transparent: true,
          opacity: 0.3,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.y = 0.3;
        glow.scale.set(1, 0.3, 1);
        group.add(glow);
        break;
      }

      case EnemyType.TREASURE_MIMIC: {
        const chestMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.6, metalness: 0.3 });

        // Box base
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), chestMat);
        base.position.y = 0.25;
        base.castShadow = true;
        group.add(base);

        // Lid
        const lid = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.15, 0.62), chestMat);
        lid.position.y = 0.55;
        group.add(lid);

        // Metal bands
        const bandMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.2 });
        for (let b = -1; b <= 1; b += 2) {
          const band = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.05, 0.02), bandMat);
          band.position.set(0, 0.35, b * 0.25);
          group.add(band);
        }

        // Teeth - row of white cones along lid edge (top and bottom)
        const teethMat = new THREE.MeshStandardMaterial({ color: 0xeeeecc });
        for (let t = 0; t < 8; t++) {
          // Top teeth
          const toothTop = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 4), teethMat);
          toothTop.position.set(-0.35 + t * 0.1, 0.5, 0.31);
          toothTop.rotation.x = Math.PI;
          group.add(toothTop);
          // Bottom teeth
          const toothBot = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), teethMat);
          toothBot.position.set(-0.35 + t * 0.1, 0.5, 0.31);
          group.add(toothBot);
        }

        // Tongue (red box inside, hanging down)
        const tongueMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.8 });
        const tongueGeo = new THREE.BoxGeometry(0.15, 0.04, 0.2);
        const tongue = new THREE.Mesh(tongueGeo, tongueMat);
        tongue.position.set(0, 0.42, 0.2);
        tongue.rotation.x = 0.3;
        group.add(tongue);

        // Eyes on stalks (2 spheres on thin cylinders poking up from lid)
        const mimicEyeMat = new THREE.MeshStandardMaterial({ color: 0xffff44, emissive: 0xaaaa00, emissiveIntensity: 1.0 });
        for (let side = -1; side <= 1; side += 2) {
          const stalkGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.2, 4);
          const stalk = new THREE.Mesh(stalkGeo, chestMat);
          stalk.position.set(side * 0.2, 0.7, 0.15);
          group.add(stalk);
          const eyeStalkGeo = new THREE.SphereGeometry(0.04, 6, 5);
          const eyeStalk = new THREE.Mesh(eyeStalkGeo, mimicEyeMat);
          eyeStalk.position.set(side * 0.2, 0.82, 0.15);
          group.add(eyeStalk);
        }

        // Stubby legs (4 small cylinders under the base)
        for (let lx = -1; lx <= 1; lx += 2) {
          for (let lz = -1; lz <= 1; lz += 2) {
            const stubGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.12, 6);
            const stub = new THREE.Mesh(stubGeo, chestMat);
            stub.position.set(lx * 0.25, 0.06, lz * 0.18);
            group.add(stub);
          }
        }

        // Chain detail (thin cylinder loop on the side)
        const chainLoopGeo = new THREE.TorusGeometry(0.08, 0.015, 6, 8);
        const chainLoopMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7, roughness: 0.3 });
        const chainLoop = new THREE.Mesh(chainLoopGeo, chainLoopMat);
        chainLoop.position.set(0.42, 0.3, 0);
        chainLoop.rotation.y = Math.PI / 2;
        group.add(chainLoop);
        break;
      }

      // ── Volcanic Wastes enemies ──
      case EnemyType.FIRE_IMP: {
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcc3300, emissive: 0x661100, emissiveIntensity: 0.3, roughness: 0.6 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), bodyMat);
        body.position.y = 0.5;
        body.castShadow = true;
        group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), bodyMat);
        head.position.y = 0.85;
        group.add(head);
        // Horns
        for (const hx of [-0.1, 0.1]) {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 4), new THREE.MeshStandardMaterial({ color: 0x222222 }));
          horn.position.set(hx, 1.05, 0);
          horn.rotation.z = hx < 0 ? 0.3 : -0.3;
          group.add(horn);
        }
        // Glowing eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffaa00, emissiveIntensity: 2.0 });
        for (const ex of [-0.06, 0.06]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 3), eyeMat);
          eye.position.set(ex, 0.9, 0.17);
          group.add(eye);
        }
        // Legs
        for (const lx of [-0.12, 0.12]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.35, 5), bodyMat);
          leg.position.set(lx, 0.17, 0);
          group.add(leg);
        }
        break;
      }
      case EnemyType.LAVA_ELEMENTAL: {
        const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.5, roughness: 0.4 });
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
        const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), rockMat);
        torso.position.y = 0.8;
        torso.castShadow = true;
        group.add(torso);
        const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), rockMat);
        head.position.y = 1.4;
        group.add(head);
        // Lava cracks (emissive stripes)
        for (let i = 0; i < 4; i++) {
          const crack = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.02), lavaMat);
          crack.position.set((Math.random() - 0.5) * 0.4, 0.6 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3);
          group.add(crack);
        }
        // Arms
        for (const ax of [-0.5, 0.5]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 5), rockMat);
          arm.position.set(ax, 0.7, 0);
          arm.rotation.z = ax < 0 ? 0.4 : -0.4;
          group.add(arm);
        }
        break;
      }
      case EnemyType.INFERNAL_KNIGHT: {
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x330000, metalness: 0.7, roughness: 0.3 });
        const fireMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8 });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), armorMat);
        torso.position.y = 0.9;
        torso.castShadow = true;
        group.add(torso);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.25), armorMat);
        head.position.y = 1.35;
        group.add(head);
        // Visor glow
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.02), fireMat);
        visor.position.set(0, 1.35, 0.14);
        group.add(visor);
        // Legs
        for (const lx of [-0.12, 0.12]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.6, 5), armorMat);
          leg.position.set(lx, 0.3, 0);
          group.add(leg);
        }
        // Sword
        const sword = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.02), fireMat);
        sword.position.set(0.35, 0.8, 0);
        group.add(sword);
        break;
      }
      case EnemyType.MAGMA_SERPENT: {
        const serpMat = new THREE.MeshStandardMaterial({ color: 0x882200, emissive: 0x441100, emissiveIntensity: 0.3, roughness: 0.5 });
        // Snake-like body segments
        for (let s = 0; s < 6; s++) {
          const seg = new THREE.Mesh(new THREE.SphereGeometry(0.15 - s * 0.01, 6, 5), serpMat);
          seg.position.set(Math.sin(s * 0.8) * 0.2, 0.2 + Math.sin(s * 0.5) * 0.15, -s * 0.25);
          seg.castShadow = true;
          group.add(seg);
        }
        // Head
        const headMat = new THREE.MeshStandardMaterial({ color: 0xcc3300, emissive: 0x661100, emissiveIntensity: 0.4 });
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), headMat);
        head.scale.set(1, 0.7, 1.3);
        head.position.set(0, 0.3, 0.15);
        group.add(head);
        // Eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffaa00, emissiveIntensity: 1.5 });
        for (const ex of [-0.06, 0.06]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 3), eyeMat);
          eye.position.set(ex, 0.35, 0.3);
          group.add(eye);
        }
        break;
      }
      case EnemyType.MOLTEN_COLOSSUS: {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
        const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8 });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.7), rockMat);
        torso.position.y = 1.5;
        torso.castShadow = true;
        group.add(torso);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 5), rockMat);
        head.position.y = 2.3;
        group.add(head);
        // Lava eyes
        for (const ex of [-0.15, 0.15]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), lavaMat);
          eye.position.set(ex, 2.35, 0.35);
          group.add(eye);
        }
        // Arms
        for (const ax of [-0.7, 0.7]) {
          const arm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), rockMat);
          arm.position.set(ax, 1.2, 0);
          group.add(arm);
          const fist = new THREE.Mesh(new THREE.SphereGeometry(0.2, 5, 4), lavaMat);
          fist.position.set(ax, 0.65, 0);
          group.add(fist);
        }
        // Legs
        for (const lx of [-0.3, 0.3]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.8, 6), rockMat);
          leg.position.set(lx, 0.4, 0);
          group.add(leg);
        }
        // Lava cracks on body
        for (let i = 0; i < 6; i++) {
          const crack = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.03), lavaMat);
          crack.position.set((Math.random() - 0.5) * 0.8, 1.2 + Math.random() * 0.8, (Math.random() - 0.5) * 0.5);
          group.add(crack);
        }
        break;
      }

      // ── Abyssal Rift enemies ──
      case EnemyType.VOID_STALKER: {
        const voidMat = new THREE.MeshStandardMaterial({ color: 0x220044, emissive: 0x110022, emissiveIntensity: 0.3, roughness: 0.5 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.6), voidMat);
        body.position.y = 0.6;
        body.castShadow = true;
        group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), voidMat);
        head.position.y = 1.0;
        group.add(head);
        // Glowing purple eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822cc, emissiveIntensity: 2.0 });
        for (const ex of [-0.06, 0.06]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 3), eyeMat);
          eye.position.set(ex, 1.03, 0.15);
          group.add(eye);
        }
        // Long limbs
        for (const lx of [-0.2, 0.2]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 4), voidMat);
          leg.position.set(lx, 0.25, 0);
          group.add(leg);
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.45, 4), voidMat);
          arm.position.set(lx * 1.5, 0.75, 0);
          arm.rotation.z = lx < 0 ? 0.5 : -0.5;
          group.add(arm);
        }
        break;
      }
      case EnemyType.SHADOW_WEAVER: {
        const shadowMat = new THREE.MeshStandardMaterial({ color: 0x1a0033, emissive: 0x0a0015, emissiveIntensity: 0.2, roughness: 0.7 });
        const robeMat = new THREE.MeshStandardMaterial({ color: 0x110022, roughness: 0.8 });
        // Floating robed figure
        const robe = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 6), robeMat);
        robe.position.y = 0.6;
        robe.castShadow = true;
        group.add(robe);
        const hood = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), shadowMat);
        hood.position.y = 1.1;
        group.add(hood);
        // Glowing hands
        const handMat = new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 1.5 });
        for (const hx of [-0.3, 0.3]) {
          const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), handMat);
          hand.position.set(hx, 0.8, 0.15);
          group.add(hand);
        }
        // Shadow tendrils
        for (let t = 0; t < 4; t++) {
          const tendril = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.4, 4), shadowMat);
          tendril.position.set((Math.random() - 0.5) * 0.3, 0.2, (Math.random() - 0.5) * 0.3);
          tendril.rotation.set(Math.random() * 0.5, 0, Math.random() * 0.5);
          group.add(tendril);
        }
        break;
      }
      case EnemyType.ABYSSAL_HORROR: {
        const horrorMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2e, emissive: 0x0a0015, emissiveIntensity: 0.2, roughness: 0.6 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 5), horrorMat);
        body.position.y = 0.8;
        body.scale.set(1.2, 0.8, 1);
        body.castShadow = true;
        group.add(body);
        // Multiple eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xcc44ff, emissive: 0xaa22dd, emissiveIntensity: 1.5 });
        for (let i = 0; i < 5; i++) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), eyeMat);
          eye.position.set((Math.random() - 0.5) * 0.4, 0.7 + Math.random() * 0.3, 0.4);
          group.add(eye);
        }
        // Tentacles
        for (let t = 0; t < 6; t++) {
          const tentMat = new THREE.MeshStandardMaterial({ color: 0x2a1a3e, roughness: 0.7 });
          const angle = (t / 6) * Math.PI * 2;
          const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.6, 4), tentMat);
          tent.position.set(Math.cos(angle) * 0.4, 0.3, Math.sin(angle) * 0.4);
          tent.rotation.set(Math.random() * 0.5, 0, Math.cos(angle) * 0.8);
          group.add(tent);
        }
        break;
      }
      case EnemyType.RIFT_WALKER: {
        const riftMat = new THREE.MeshStandardMaterial({ color: 0x2a1a4e, emissive: 0x110033, emissiveIntensity: 0.3, roughness: 0.5 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.25), riftMat);
        body.position.y = 0.8;
        body.castShadow = true;
        group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 5), riftMat);
        head.position.y = 1.2;
        group.add(head);
        // Phase effect - translucent aura
        const auraMat = new THREE.MeshStandardMaterial({ color: 0x6622ff, emissive: 0x4400cc, emissiveIntensity: 0.5, transparent: true, opacity: 0.3 });
        const aura = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), auraMat);
        aura.position.y = 0.8;
        group.add(aura);
        // Legs
        for (const lx of [-0.1, 0.1]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 4), riftMat);
          leg.position.set(lx, 0.25, 0);
          group.add(leg);
        }
        break;
      }
      case EnemyType.ENTROPY_LORD: {
        const lordMat = new THREE.MeshStandardMaterial({ color: 0x1a0a3e, emissive: 0x0a0020, emissiveIntensity: 0.3, roughness: 0.5 });
        const voidMat = new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 1.0 });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.5), lordMat);
        torso.position.y = 1.5;
        torso.castShadow = true;
        group.add(torso);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 5), lordMat);
        head.position.y = 2.2;
        group.add(head);
        // Crown of void energy
        const crownMat = new THREE.MeshStandardMaterial({ color: 0xaa66ff, emissive: 0x8844cc, emissiveIntensity: 1.5 });
        for (let c = 0; c < 5; c++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 4), crownMat);
          const a = (c / 5) * Math.PI * 2;
          spike.position.set(Math.cos(a) * 0.25, 2.55, Math.sin(a) * 0.25);
          group.add(spike);
        }
        // Arms with void orbs
        for (const ax of [-0.6, 0.6]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 5), lordMat);
          arm.position.set(ax, 1.3, 0);
          arm.rotation.z = ax < 0 ? 0.4 : -0.4;
          group.add(arm);
          const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), voidMat);
          orb.position.set(ax * 1.3, 1.0, 0);
          group.add(orb);
        }
        // Legs
        for (const lx of [-0.2, 0.2]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.8, 6), lordMat);
          leg.position.set(lx, 0.5, 0);
          group.add(leg);
        }
        break;
      }

      // ── Dragon's Sanctum enemies ──
      case EnemyType.DRAGONKIN_WARRIOR: {
        const scaleMat = new THREE.MeshStandardMaterial({ color: 0x445522, roughness: 0.6, metalness: 0.2 });
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x554422, metalness: 0.5, roughness: 0.4 });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.3), armorMat);
        torso.position.y = 0.9;
        torso.castShadow = true;
        group.add(torso);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), scaleMat);
        head.scale.set(1, 0.9, 1.2);
        head.position.y = 1.35;
        group.add(head);
        // Snout
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.15), scaleMat);
        snout.position.set(0, 1.3, 0.2);
        group.add(snout);
        // Eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xcc8800, emissiveIntensity: 1.0 });
        for (const ex of [-0.07, 0.07]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3), eyeMat);
          eye.position.set(ex, 1.38, 0.16);
          group.add(eye);
        }
        // Legs & Arms
        for (const lx of [-0.12, 0.12]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.5, 5), scaleMat);
          leg.position.set(lx, 0.3, 0);
          group.add(leg);
        }
        // Weapon (halberd)
        const weapMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7, roughness: 0.3 });
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4), weapMat);
        shaft.position.set(0.3, 0.9, 0);
        group.add(shaft);
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), weapMat);
        blade.position.set(0.3, 1.45, 0);
        group.add(blade);
        break;
      }
      case EnemyType.WYRM_PRIEST: {
        const robeMat = new THREE.MeshStandardMaterial({ color: 0x442200, roughness: 0.8 });
        const scaleMat = new THREE.MeshStandardMaterial({ color: 0x556633, roughness: 0.6 });
        const fireMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.0 });
        // Robed body
        const robe = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 6), robeMat);
        robe.position.y = 0.5;
        robe.castShadow = true;
        group.add(robe);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), scaleMat);
        head.position.y = 1.1;
        group.add(head);
        // Staff with flame
        const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0x553311 }));
        staff.position.set(0.25, 0.7, 0);
        group.add(staff);
        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), fireMat);
        flame.position.set(0.25, 1.35, 0);
        group.add(flame);
        break;
      }
      case EnemyType.DRAKE_GUARDIAN: {
        const scaleMat = new THREE.MeshStandardMaterial({ color: 0x886633, roughness: 0.5, metalness: 0.3 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.8), scaleMat);
        body.position.y = 0.6;
        body.castShadow = true;
        group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 5), scaleMat);
        head.scale.set(1, 0.8, 1.4);
        head.position.set(0, 0.9, 0.3);
        group.add(head);
        // Wings (folded)
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x775522, roughness: 0.6, side: THREE.DoubleSide });
        for (const wx of [-0.5, 0.5]) {
          const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), wingMat);
          wing.position.set(wx, 0.9, -0.1);
          wing.rotation.y = wx < 0 ? -0.8 : 0.8;
          wing.rotation.z = wx < 0 ? -0.3 : 0.3;
          group.add(wing);
        }
        // Legs
        for (const [lx, lz] of [[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.3], [0.2, -0.3]]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.4, 5), scaleMat);
          leg.position.set(lx, 0.2, lz);
          group.add(leg);
        }
        // Tail
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 4), scaleMat);
        tail.position.set(0, 0.5, -0.7);
        tail.rotation.x = -0.5;
        group.add(tail);
        break;
      }
      case EnemyType.DRAGON_WHELP: {
        const whelpMat = new THREE.MeshStandardMaterial({ color: 0xcc5533, emissive: 0x441100, emissiveIntensity: 0.2, roughness: 0.5 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 5), whelpMat);
        body.position.y = 0.5;
        body.scale.set(1, 0.8, 1.2);
        body.castShadow = true;
        group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 5), whelpMat);
        head.position.set(0, 0.7, 0.15);
        group.add(head);
        // Small wings
        const wingMat = new THREE.MeshStandardMaterial({ color: 0xaa4422, side: THREE.DoubleSide });
        for (const wx of [-0.3, 0.3]) {
          const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), wingMat);
          wing.position.set(wx, 0.6, 0);
          wing.rotation.y = wx < 0 ? -0.6 : 0.6;
          group.add(wing);
        }
        // Fire eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xcc6600, emissiveIntensity: 1.5 });
        for (const ex of [-0.05, 0.05]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3), eyeMat);
          eye.position.set(ex, 0.73, 0.26);
          group.add(eye);
        }
        break;
      }
      case EnemyType.ELDER_DRAGON: {
        const dragonMat = new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.4, metalness: 0.3 });
        const fireMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8 });
        // Massive body
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.5), dragonMat);
        body.position.y = 1.0;
        body.castShadow = true;
        group.add(body);
        // Neck and head
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.8, 6), dragonMat);
        neck.position.set(0, 1.5, 0.6);
        neck.rotation.x = -0.5;
        group.add(neck);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.6), dragonMat);
        head.position.set(0, 1.8, 1.0);
        group.add(head);
        // Horns
        for (const hx of [-0.15, 0.15]) {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 4), new THREE.MeshStandardMaterial({ color: 0x222211 }));
          horn.position.set(hx, 2.1, 0.85);
          horn.rotation.z = hx < 0 ? 0.3 : -0.3;
          group.add(horn);
        }
        // Fire eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2.0 });
        for (const ex of [-0.1, 0.1]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), eyeMat);
          eye.position.set(ex, 1.85, 1.25);
          group.add(eye);
        }
        // Wings
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x663311, roughness: 0.6, side: THREE.DoubleSide });
        for (const wx of [-1.0, 1.0]) {
          const wing = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), wingMat);
          wing.position.set(wx, 1.5, 0);
          wing.rotation.y = wx < 0 ? -0.6 : 0.6;
          wing.rotation.z = wx < 0 ? -0.3 : 0.3;
          group.add(wing);
        }
        // Legs
        for (const [lx, lz] of [[-0.4, 0.4], [0.4, 0.4], [-0.4, -0.5], [0.4, -0.5]]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.7, 6), dragonMat);
          leg.position.set(lx, 0.35, lz);
          group.add(leg);
        }
        // Tail
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.2, 5), dragonMat);
        tail.position.set(0, 0.8, -1.3);
        tail.rotation.x = -0.3;
        group.add(tail);
        // Fire breath glow
        const breathGlow = new THREE.Mesh(new THREE.SphereGeometry(0.15, 5, 4), fireMat);
        breathGlow.position.set(0, 1.75, 1.3);
        group.add(breathGlow);
        break;
      }

      // ── DESERT ENEMIES ──────────────────────────────────────────
      case EnemyType.SAND_SCORPION: {
        const shellMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.7, metalness: 0.1 });
        const underMat = new THREE.MeshStandardMaterial({ color: 0xa09070, roughness: 0.6 });
        const clawMat = new THREE.MeshStandardMaterial({ color: 0x6b5335, roughness: 0.5, metalness: 0.2 });
        // Main carapace (flattened, segmented)
        const scBody = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), shellMat);
        scBody.scale.set(1.3, 0.45, 1.6);
        scBody.position.y = 0.28;
        scBody.castShadow = true;
        group.add(scBody);
        // Carapace ridge lines
        for (let r = 0; r < 3; r++) {
          const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.5 - r * 0.1, 0.02, 0.04), shellMat);
          ridge.position.set(0, 0.42, -0.15 + r * 0.2);
          group.add(ridge);
        }
        // Underbelly
        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), underMat);
        belly.scale.set(1.1, 0.3, 1.4);
        belly.position.y = 0.18;
        group.add(belly);
        // Tail — 7 articulated segments curving up and over
        for (let s = 0; s < 7; s++) {
          const r = 0.1 - s * 0.008;
          const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), shellMat);
          const t = s / 6;
          seg.position.set(0, 0.35 + t * t * 1.2, -0.4 - t * 0.6 + t * t * 0.4);
          seg.castShadow = true;
          group.add(seg);
          // Joint ring between segments
          if (s > 0) {
            const joint = new THREE.Mesh(new THREE.TorusGeometry(r * 0.7, 0.008, 4, 6), underMat);
            joint.rotation.x = Math.PI / 2;
            joint.position.copy(seg.position);
            group.add(joint);
          }
        }
        // Stinger (curved, venomous)
        const stingerMat = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0x661100, emissiveIntensity: 0.8 });
        const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18, 5), stingerMat);
        stinger.position.set(0, 1.55, -0.35);
        stinger.rotation.x = 0.6;
        group.add(stinger);
        // Venom droplet
        const venomMat = new THREE.MeshStandardMaterial({ color: 0x44ff22, emissive: 0x22aa00, emissiveIntensity: 1.2, transparent: true, opacity: 0.7 });
        const venom = new THREE.Mesh(new THREE.SphereGeometry(0.02, 5, 4), venomMat);
        venom.position.set(0, 1.44, -0.28);
        group.add(venom);
        // Pedipalps / Claws (articulated pincers)
        for (const side of [-1, 1]) {
          // Upper arm
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 5), clawMat);
          upperArm.position.set(side * 0.3, 0.28, 0.35);
          upperArm.rotation.z = side * 0.5;
          upperArm.castShadow = true;
          group.add(upperArm);
          // Forearm
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.25, 5), clawMat);
          forearm.position.set(side * 0.48, 0.25, 0.48);
          forearm.rotation.z = side * 0.3;
          group.add(forearm);
          // Claw base
          const clawBase = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), clawMat);
          clawBase.scale.set(1, 0.6, 1.2);
          clawBase.position.set(side * 0.58, 0.25, 0.58);
          group.add(clawBase);
          // Upper pincer
          const upperP = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.18), clawMat);
          upperP.position.set(side * 0.58, 0.3, 0.7);
          upperP.rotation.y = side * 0.15;
          group.add(upperP);
          // Lower pincer
          const lowerP = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.02, 0.15), clawMat);
          lowerP.position.set(side * 0.58, 0.22, 0.68);
          lowerP.rotation.y = side * -0.1;
          group.add(lowerP);
        }
        // Cluster of eyes (4 pairs like a real scorpion)
        const scEyeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 2.0 });
        const eyePositions = [[-0.06, 0.42, 0.42], [0.06, 0.42, 0.42], [-0.04, 0.44, 0.38], [0.04, 0.44, 0.38]];
        for (const ep of eyePositions) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), scEyeMat);
          eye.position.set(ep[0], ep[1], ep[2]);
          group.add(eye);
        }
        // 8 segmented legs with knee joints
        for (let i = 0; i < 4; i++) {
          for (const side of [-1, 1]) {
            const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.2, 5), shellMat);
            upper.position.set(side * (0.32 + i * 0.04), 0.22, 0.15 - i * 0.18);
            upper.rotation.z = side * 0.7;
            group.add(upper);
            const knee = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3), shellMat);
            knee.position.set(side * (0.42 + i * 0.04), 0.12, 0.15 - i * 0.18);
            group.add(knee);
            const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.15, 4), shellMat);
            lower.position.set(side * (0.46 + i * 0.04), 0.06, 0.15 - i * 0.18);
            lower.rotation.z = side * 0.2;
            group.add(lower);
          }
        }
        break;
      }

      case EnemyType.DESERT_BANDIT: {
        const robesMat = new THREE.MeshStandardMaterial({ color: 0xaa8844, roughness: 0.8 });
        const robeTrimMat = new THREE.MeshStandardMaterial({ color: 0x886633, roughness: 0.7 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xc4956a, roughness: 0.6 });
        const leatherMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.75 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
        const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xddaa33, metalness: 0.6, roughness: 0.3 });
        // Torso with layered robes
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.5, 0.22), robesMat);
        torso.position.y = 0.92;
        torso.castShadow = true;
        group.add(torso);
        // Outer robe flap (front)
        const robeFront = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.03), robeTrimMat);
        robeFront.position.set(0, 0.78, 0.12);
        robeFront.rotation.x = 0.1;
        group.add(robeFront);
        // Robe skirt flowing down
        const robeSkirt = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.35, 6), robesMat);
        robeSkirt.position.y = 0.58;
        group.add(robeSkirt);
        // Belt with buckle
        const belt = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.02, 4, 8), leatherMat);
        belt.rotation.x = Math.PI / 2;
        belt.position.y = 0.72;
        group.add(belt);
        const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.03), goldTrimMat);
        buckle.position.set(0, 0.72, 0.2);
        group.add(buckle);
        // Shoulder wraps
        for (const sx of [-0.22, 0.22]) {
          const wrap = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), robeTrimMat);
          wrap.scale.set(1, 0.6, 1);
          wrap.position.set(sx, 1.15, 0);
          group.add(wrap);
        }
        // Neck scarf/shemagh drape
        const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), robesMat);
        scarf.position.set(0, 1.22, 0.02);
        group.add(scarf);
        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 7), skinMat);
        head.position.y = 1.35;
        group.add(head);
        // Turban with folds
        const turbanBase = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshStandardMaterial({ color: 0xccaa55, roughness: 0.7 }));
        turbanBase.scale.set(1, 0.65, 1);
        turbanBase.position.y = 1.45;
        group.add(turbanBase);
        // Turban fold wraps
        for (let t = 0; t < 3; t++) {
          const fold = new THREE.Mesh(new THREE.TorusGeometry(0.14 - t * 0.015, 0.018, 4, 8), new THREE.MeshStandardMaterial({ color: 0xbbaa44, roughness: 0.6 }));
          fold.rotation.x = Math.PI / 2 + t * 0.15;
          fold.position.y = 1.42 + t * 0.04;
          group.add(fold);
        }
        // Turban jewel
        const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xaa0000, emissiveIntensity: 0.5 }));
        jewel.position.set(0, 1.45, 0.16);
        group.add(jewel);
        // Shemagh tail draping down back
        const shemagTail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.04), new THREE.MeshStandardMaterial({ color: 0xccaa55, roughness: 0.7 }));
        shemagTail.position.set(0.05, 1.2, -0.14);
        shemagTail.rotation.z = 0.15;
        group.add(shemagTail);
        // Eyes with dark liner
        const dbEyeMat = new THREE.MeshStandardMaterial({ color: 0x332200 });
        const linerMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        for (const ex of [-0.05, 0.05]) {
          const liner = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 4), linerMat);
          liner.position.set(ex, 1.37, 0.12);
          liner.scale.set(1.2, 0.6, 0.5);
          group.add(liner);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4), dbEyeMat);
          eye.position.set(ex, 1.37, 0.13);
          group.add(eye);
        }
        // Nose
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 4), skinMat);
        nose.position.set(0, 1.34, 0.14);
        nose.rotation.x = -0.3;
        group.add(nose);
        // Scimitar (curved blade with guard and pommel)
        const bladeGeo = new THREE.BoxGeometry(0.025, 0.45, 0.015);
        const blade = new THREE.Mesh(bladeGeo, metalMat);
        blade.position.set(0.3, 0.85, 0);
        blade.rotation.z = -0.2;
        group.add(blade);
        // Blade curve tip
        const bladeTip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 4), metalMat);
        bladeTip.position.set(0.26, 1.08, 0);
        bladeTip.rotation.z = -0.5;
        group.add(bladeTip);
        // Blade edge glow
        const edgeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.42, 0.02), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaaaaa, emissiveIntensity: 0.3, metalness: 1.0 }));
        edgeGlow.position.set(0.315, 0.85, 0);
        edgeGlow.rotation.z = -0.2;
        group.add(edgeGlow);
        // Sword guard
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.04), goldTrimMat);
        guard.position.set(0.32, 0.62, 0);
        group.add(guard);
        // Hilt wrap
        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.1, 5), leatherMat);
        hilt.position.set(0.33, 0.55, 0);
        group.add(hilt);
        // Pommel
        const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.02, 5, 4), goldTrimMat);
        pommel.position.set(0.34, 0.49, 0);
        group.add(pommel);
        // Arms
        for (const ax of [-0.22, 0.22]) {
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.25, 6), robesMat);
          upperArm.position.set(ax, 1.02, 0);
          upperArm.rotation.z = ax < 0 ? 0.15 : -0.15;
          group.add(upperArm);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.22, 6), skinMat);
          forearm.position.set(ax * 1.15, 0.82, 0);
          forearm.rotation.z = ax < 0 ? 0.2 : -0.2;
          group.add(forearm);
          // Leather bracer
          const bracer = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.05, 0.08, 6), leatherMat);
          bracer.position.set(ax * 1.1, 0.88, 0);
          group.add(bracer);
        }
        // Legs with sandals
        for (const lx of [-0.1, 0.1]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.45, 6), robesMat);
          leg.position.set(lx, 0.35, 0);
          group.add(leg);
          // Sandal
          const sandal = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.12), leatherMat);
          sandal.position.set(lx, 0.1, 0.02);
          group.add(sandal);
          // Sandal strap
          const strap = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 3, 6), leatherMat);
          strap.rotation.x = Math.PI / 2;
          strap.position.set(lx, 0.14, 0.02);
          group.add(strap);
        }
        // Pouch on belt
        const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.05), leatherMat);
        pouch.position.set(-0.2, 0.72, 0.1);
        group.add(pouch);
        break;
      }

      case EnemyType.SAND_WURM: {
        const wurmMat = new THREE.MeshStandardMaterial({ color: 0x9b8060, roughness: 0.7 });
        const wurmDarkMat = new THREE.MeshStandardMaterial({ color: 0x7a6040, roughness: 0.8 });
        const innerMat = new THREE.MeshStandardMaterial({ color: 0xcc4444, emissive: 0x881111, emissiveIntensity: 0.5 });
        const toothMat = new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.3 });
        const slimeMat = new THREE.MeshStandardMaterial({ color: 0x88aa44, transparent: true, opacity: 0.6, roughness: 0.2 });
        // Body segments emerging from ground with ridged plating
        for (let s = 0; s < 8; s++) {
          const radius = 0.28 - s * 0.015;
          const seg = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 7), s % 2 === 0 ? wurmMat : wurmDarkMat);
          seg.scale.set(1, 0.7, 1);
          seg.position.set(Math.sin(s * 0.6) * 0.35, 0.15 + s * 0.22, -s * 0.18);
          seg.castShadow = true;
          group.add(seg);
          // Segment ridge ring
          const ridge = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.95, 0.015, 4, 8), wurmDarkMat);
          ridge.rotation.y = Math.PI / 2;
          ridge.position.copy(seg.position);
          group.add(ridge);
          // Small spines on each segment
          for (let sp = 0; sp < 3; sp++) {
            const ang = (sp / 3) * Math.PI - Math.PI / 2;
            const spine = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 3), wurmDarkMat);
            spine.position.set(
              seg.position.x + Math.cos(ang) * radius * 0.8,
              seg.position.y + 0.05,
              seg.position.z + Math.sin(ang) * radius * 0.5
            );
            spine.rotation.z = ang;
            group.add(spine);
          }
        }
        // Sand burst at ground level
        for (let d = 0; d < 6; d++) {
          const ang = (d / 6) * Math.PI * 2;
          const debris = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.06), new THREE.MeshStandardMaterial({ color: 0xc8a870, roughness: 0.9 }));
          debris.position.set(Math.sin(ang) * 0.4, 0.05, Math.cos(ang) * 0.4);
          debris.rotation.set(Math.random(), Math.random(), Math.random());
          group.add(debris);
        }
        // Head (larger, armored)
        const wHead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 7), wurmMat);
        wHead.scale.set(1, 1.1, 0.9);
        wHead.position.set(Math.sin(7.5 * 0.6) * 0.35, 1.85, -0.1);
        group.add(wHead);
        // Head armor plates
        for (let p = 0; p < 3; p++) {
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.2 - p * 0.04, 0.06, 0.25), wurmDarkMat);
          plate.position.set(wHead.position.x, wHead.position.y + 0.1 + p * 0.07, wHead.position.z - 0.05);
          group.add(plate);
        }
        // Open maw with depth
        const mawOuter = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.25, 8), innerMat);
        mawOuter.position.set(wHead.position.x, wHead.position.y + 0.05, wHead.position.z + 0.3);
        group.add(mawOuter);
        const mawInner = new THREE.Mesh(new THREE.CircleGeometry(0.1, 8), new THREE.MeshStandardMaterial({ color: 0x441111, roughness: 0.9 }));
        mawInner.position.set(wHead.position.x, wHead.position.y + 0.05, wHead.position.z + 0.25);
        group.add(mawInner);
        // Multiple rings of teeth (outer ring large, inner ring small)
        for (let ring = 0; ring < 2; ring++) {
          const teethCount = ring === 0 ? 8 : 6;
          const teethR = ring === 0 ? 0.2 : 0.12;
          const teethH = ring === 0 ? 0.1 : 0.06;
          for (let t = 0; t < teethCount; t++) {
            const ang = (t / teethCount) * Math.PI * 2;
            const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.018 - ring * 0.005, teethH, 4), toothMat);
            tooth.position.set(
              wHead.position.x + Math.cos(ang) * teethR,
              wHead.position.y + 0.05 + Math.sin(ang) * teethR,
              wHead.position.z + 0.27
            );
            tooth.rotation.x = -Math.PI / 2;
            group.add(tooth);
          }
        }
        // Dripping slime from maw
        for (let sl = 0; sl < 3; sl++) {
          const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.003, 0.1 + sl * 0.04, 4), slimeMat);
          drip.position.set(
            wHead.position.x + (sl - 1) * 0.06,
            wHead.position.y - 0.1 - sl * 0.03,
            wHead.position.z + 0.25
          );
          group.add(drip);
        }
        // Sensory tendrils around mouth
        for (let ten = 0; ten < 4; ten++) {
          const ang = (ten / 4) * Math.PI * 2;
          const tendril = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.003, 0.18, 4), wurmMat);
          tendril.position.set(
            wHead.position.x + Math.cos(ang) * 0.26,
            wHead.position.y + Math.sin(ang) * 0.26,
            wHead.position.z + 0.22
          );
          tendril.rotation.x = -Math.PI / 3;
          tendril.rotation.z = ang;
          group.add(tendril);
        }
        break;
      }

      case EnemyType.DUST_WRAITH: {
        const wraithMat = new THREE.MeshStandardMaterial({ color: 0xc8a870, transparent: true, opacity: 0.55, roughness: 0.3 });
        const wraithDarkMat = new THREE.MeshStandardMaterial({ color: 0xa08050, transparent: true, opacity: 0.4, roughness: 0.2 });
        const glowMat = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa00, emissiveIntensity: 1.8 });
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, transparent: true, opacity: 0.7, roughness: 0.5 });
        // Swirling sand vortex base
        for (let v = 0; v < 4; v++) {
          const vortex = new THREE.Mesh(new THREE.TorusGeometry(0.25 + v * 0.06, 0.03, 4, 12), wraithDarkMat);
          vortex.rotation.x = Math.PI / 2;
          vortex.rotation.z = v * 0.4;
          vortex.position.y = 0.15 + v * 0.12;
          group.add(vortex);
        }
        // Ghostly body (layered flowing form)
        const dwBodyOuter = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.1, 8), wraithDarkMat);
        dwBodyOuter.position.y = 0.65;
        group.add(dwBodyOuter);
        const dwBodyInner = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.0, 8), wraithMat);
        dwBodyInner.position.y = 0.7;
        dwBodyInner.castShadow = true;
        group.add(dwBodyInner);
        // Tattered robe edges
        for (let e = 0; e < 6; e++) {
          const ang = (e / 6) * Math.PI * 2;
          const tatter = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.02), wraithDarkMat);
          tatter.position.set(Math.sin(ang) * 0.32, 0.2, Math.cos(ang) * 0.32);
          tatter.rotation.y = ang;
          tatter.rotation.x = 0.3;
          group.add(tatter);
        }
        // Skeletal ribcage visible through translucent body
        for (let r = 0; r < 3; r++) {
          const rib = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.01, 3, 6, Math.PI), boneMat);
          rib.position.set(0, 0.85 + r * 0.12, 0.08);
          group.add(rib);
        }
        // Spine
        const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, 0.5, 4), boneMat);
        spine.position.set(0, 0.95, -0.05);
        group.add(spine);
        // Head with hollow features
        const dwHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 7), wraithMat);
        dwHead.position.y = 1.38;
        group.add(dwHead);
        // Skull underneath
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), boneMat);
        skull.position.y = 1.36;
        group.add(skull);
        // Eye sockets (dark hollows)
        const socketMat = new THREE.MeshStandardMaterial({ color: 0x221100 });
        for (const ex of [-0.06, 0.06]) {
          const socket = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), socketMat);
          socket.position.set(ex, 1.39, 0.12);
          socket.scale.z = 0.5;
          group.add(socket);
          // Glowing ember eyes
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), glowMat);
          eye.position.set(ex, 1.39, 0.14);
          group.add(eye);
          // Eye trail wisps
          const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.003, 0.12, 4), glowMat);
          trail.position.set(ex + (ex > 0 ? 0.03 : -0.03), 1.42, 0.13);
          trail.rotation.z = ex > 0 ? -0.5 : 0.5;
          group.add(trail);
        }
        // Ghostly jaw (slightly open)
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.06), boneMat);
        jaw.position.set(0, 1.29, 0.1);
        jaw.rotation.x = 0.15;
        group.add(jaw);
        // Ghostly arms reaching outward
        for (const ax of [-0.3, 0.3]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.4, 5), wraithMat);
          arm.position.set(ax, 1.1, 0.1);
          arm.rotation.z = ax < 0 ? 0.6 : -0.6;
          arm.rotation.x = -0.3;
          group.add(arm);
          // Skeletal hand with fingers
          for (let f = 0; f < 3; f++) {
            const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.08, 3), boneMat);
            finger.position.set(ax * 1.5 + (f - 1) * 0.02, 0.92, 0.15);
            finger.rotation.x = -0.4;
            group.add(finger);
          }
        }
        // Orbiting sand wisps (larger, more varied)
        for (let w = 0; w < 10; w++) {
          const size = 0.02 + Math.random() * 0.04;
          const wisp = new THREE.Mesh(new THREE.SphereGeometry(size, 4, 3), new THREE.MeshStandardMaterial({
            color: 0xd4b896, transparent: true, opacity: 0.25 + Math.random() * 0.25
          }));
          const ang = (w / 10) * Math.PI * 2;
          const r = 0.3 + Math.random() * 0.3;
          wisp.position.set(Math.sin(ang) * r, 0.3 + w * 0.12, Math.cos(ang) * r);
          group.add(wisp);
        }
        // Sand dust cloud at base
        for (let dc = 0; dc < 5; dc++) {
          const cloud = new THREE.Mesh(new THREE.SphereGeometry(0.06 + dc * 0.02, 4, 3), new THREE.MeshStandardMaterial({
            color: 0xc8a870, transparent: true, opacity: 0.2
          }));
          const ang = (dc / 5) * Math.PI * 2;
          cloud.position.set(Math.sin(ang) * 0.2, 0.08, Math.cos(ang) * 0.2);
          cloud.scale.y = 0.4;
          group.add(cloud);
        }
        break;
      }

      case EnemyType.SAND_GOLEM: {
        const sandMat = new THREE.MeshStandardMaterial({ color: 0xb8a070, roughness: 0.9 });
        const sandDarkMat = new THREE.MeshStandardMaterial({ color: 0x8a7050, roughness: 0.95 });
        const crystalMat = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa00, emissiveIntensity: 0.6, metalness: 0.3 });
        const crystalBrightMat = new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0xffcc22, emissiveIntensity: 1.0, transparent: true, opacity: 0.8 });
        const crackedMat = new THREE.MeshStandardMaterial({ color: 0x665530, roughness: 1.0 });
        // Massive torso (layered rock slabs)
        const sgTorso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 0.55), sandMat);
        sgTorso.position.y = 1.25;
        sgTorso.castShadow = true;
        group.add(sgTorso);
        // Rock slab layers on torso
        for (let sl = 0; sl < 3; sl++) {
          const slab = new THREE.Mesh(new THREE.BoxGeometry(0.78 - sl * 0.04, 0.08, 0.58 - sl * 0.03), sandDarkMat);
          slab.position.set(0, 0.95 + sl * 0.3, 0);
          slab.rotation.y = sl * 0.1;
          group.add(slab);
        }
        // Cracks running through body (glowing energy lines)
        for (let c = 0; c < 5; c++) {
          const crack = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.25 + Math.random() * 0.2, 0.015), crystalBrightMat);
          crack.position.set((Math.random() - 0.5) * 0.5, 1.0 + Math.random() * 0.5, (Math.random() - 0.5) * 0.35);
          crack.rotation.z = (Math.random() - 0.5) * 0.4;
          group.add(crack);
        }
        // Head (rough-hewn boulder)
        const sgHead = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), sandMat);
        sgHead.scale.set(0.9, 0.8, 0.85);
        sgHead.position.y = 2.0;
        group.add(sgHead);
        // Brow ridge
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.2), sandDarkMat);
        brow.position.set(0, 2.08, 0.12);
        group.add(brow);
        // Crystal eyes (glowing octahedrons with glow halo)
        for (const ex of [-0.1, 0.1]) {
          const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), crystalBrightMat);
          eyeGlow.position.set(ex, 2.02, 0.22);
          group.add(eyeGlow);
          const eye = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), crystalMat);
          eye.position.set(ex, 2.02, 0.24);
          group.add(eye);
        }
        // Jaw line
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.15), sandDarkMat);
        jaw.position.set(0, 1.85, 0.1);
        group.add(jaw);
        // Shoulder boulders
        for (const sx of [-0.5, 0.5]) {
          const shoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), sandMat);
          shoulder.position.set(sx, 1.7, 0);
          group.add(shoulder);
          // Small crystal shard on shoulder
          const shard = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 4), crystalMat);
          shard.position.set(sx * 0.9, 1.85, 0);
          shard.rotation.z = sx > 0 ? -0.3 : 0.3;
          group.add(shard);
        }
        // Arms (segmented rock chunks with visible joints)
        for (const ax of [-0.55, 0.55]) {
          // Upper arm
          const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.16), sandMat);
          upperArm.position.set(ax, 1.35, 0);
          upperArm.rotation.z = ax < 0 ? 0.25 : -0.25;
          group.add(upperArm);
          // Elbow joint (glowing energy)
          const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), crystalBrightMat);
          elbow.position.set(ax * 1.1, 1.1, 0);
          group.add(elbow);
          // Forearm
          const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.14), sandDarkMat);
          forearm.position.set(ax * 1.15, 0.88, 0);
          forearm.rotation.z = ax < 0 ? 0.15 : -0.15;
          group.add(forearm);
          // Massive fist with knuckle detail
          const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), sandMat);
          fist.position.set(ax * 1.25, 0.6, 0);
          group.add(fist);
          // Knuckle ridges
          for (let k = 0; k < 3; k++) {
            const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), sandDarkMat);
            knuckle.position.set(ax * 1.25 + (k - 1) * 0.06, 0.65, 0.12);
            group.add(knuckle);
          }
        }
        // Legs (thick pillars with knee joints)
        for (const lx of [-0.22, 0.22]) {
          const upperLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.16), sandMat);
          upperLeg.position.set(lx, 0.62, 0);
          group.add(upperLeg);
          const knee = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), crackedMat);
          knee.position.set(lx, 0.45, 0.04);
          group.add(knee);
          const lowerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.18), sandDarkMat);
          lowerLeg.position.set(lx, 0.25, 0);
          group.add(lowerLeg);
          // Foot (flat rock slab)
          const foot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.22), sandMat);
          foot.position.set(lx, 0.08, 0.03);
          group.add(foot);
        }
        // Embedded crystals on back
        for (let bc = 0; bc < 3; bc++) {
          const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 5), crystalMat);
          crystal.position.set((bc - 1) * 0.18, 1.5 + bc * 0.1, -0.3);
          crystal.rotation.x = 0.4;
          group.add(crystal);
        }
        // Falling sand particles
        for (let fp = 0; fp < 4; fp++) {
          const particle = new THREE.Mesh(new THREE.SphereGeometry(0.015, 3, 3), new THREE.MeshStandardMaterial({ color: 0xc8a870, transparent: true, opacity: 0.4 }));
          particle.position.set((Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4);
          group.add(particle);
        }
        break;
      }

      // ── GRASSLAND ENEMIES ───────────────────────────────────────
      case EnemyType.WILD_BOAR: {
        const furMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 });
        const furDarkMat = new THREE.MeshStandardMaterial({ color: 0x3a2820, roughness: 0.9 });
        const furLightMat = new THREE.MeshStandardMaterial({ color: 0x7a5a43, roughness: 0.8 });
        const tuskMat = new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.3, metalness: 0.1 });
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xcc8888, roughness: 0.6 });
        // Barrel-shaped body with muscle definition
        const wbBody = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), furMat);
        wbBody.scale.set(0.85, 0.72, 1.35);
        wbBody.position.y = 0.47;
        wbBody.castShadow = true;
        group.add(wbBody);
        // Darker ridge along spine
        const spineRidge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.8), furDarkMat);
        spineRidge.position.set(0, 0.72, 0.0);
        group.add(spineRidge);
        // Bristle tufts along back
        for (let b = 0; b < 6; b++) {
          const bristle = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.08, 3), furDarkMat);
          bristle.position.set((Math.random() - 0.5) * 0.08, 0.73, -0.2 + b * 0.12);
          bristle.rotation.x = -0.2;
          group.add(bristle);
        }
        // Muscular shoulder hump
        const hump = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 6), furMat);
        hump.position.set(0, 0.62, 0.2);
        group.add(hump);
        // Head with broader shape
        const wbHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 7), furMat);
        wbHead.scale.set(1, 0.85, 1.15);
        wbHead.position.set(0, 0.5, 0.52);
        group.add(wbHead);
        // Brow ridges (heavy)
        for (const bx of [-0.08, 0.08]) {
          const browR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), furDarkMat);
          browR.scale.set(1.2, 0.5, 1);
          browR.position.set(bx, 0.57, 0.58);
          group.add(browR);
        }
        // Snout with nostrils
        const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.14, 6), noseMat);
        snout.rotation.x = Math.PI / 2;
        snout.position.set(0, 0.45, 0.7);
        group.add(snout);
        // Nostril holes
        for (const nx of [-0.03, 0.03]) {
          const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.018, 4, 3), new THREE.MeshStandardMaterial({ color: 0x331111 }));
          nostril.position.set(nx, 0.45, 0.78);
          group.add(nostril);
        }
        // Curved tusks with thickness variation
        for (const tx of [-0.09, 0.09]) {
          const tuskBase = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.06, 5), tuskMat);
          tuskBase.position.set(tx, 0.42, 0.72);
          tuskBase.rotation.x = -0.2;
          group.add(tuskBase);
          const tuskTip = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.1, 5), tuskMat);
          tuskTip.position.set(tx * 1.1, 0.38, 0.76);
          tuskTip.rotation.x = -0.6;
          tuskTip.rotation.z = tx > 0 ? -0.25 : 0.25;
          group.add(tuskTip);
        }
        // Eyes (angry red with dark surround)
        const wbEyeMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff0000, emissiveIntensity: 1.2 });
        for (const ex of [-0.1, 0.1]) {
          const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 3), furDarkMat);
          eyeSocket.position.set(ex, 0.55, 0.56);
          eyeSocket.scale.z = 0.5;
          group.add(eyeSocket);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), wbEyeMat);
          eye.position.set(ex, 0.55, 0.58);
          group.add(eye);
        }
        // Ears (small, pointed)
        for (const ex of [-0.12, 0.12]) {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 4), furMat);
          ear.position.set(ex, 0.64, 0.42);
          ear.rotation.x = -0.3;
          ear.rotation.z = ex > 0 ? -0.3 : 0.3;
          group.add(ear);
        }
        // Legs with joints and hooves
        for (let i = 0; i < 2; i++) {
          for (const side of [-1, 1]) {
            const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.15, 5), furMat);
            upperLeg.position.set(side * 0.2, 0.28, i * 0.42 - 0.1);
            group.add(upperLeg);
            const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.15, 5), furLightMat);
            lowerLeg.position.set(side * 0.2, 0.13, i * 0.42 - 0.1);
            group.add(lowerLeg);
            // Hoof
            const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.04, 5), new THREE.MeshStandardMaterial({ color: 0x222222 }));
            hoof.position.set(side * 0.2, 0.04, i * 0.42 - 0.1);
            group.add(hoof);
          }
        }
        // Short curly tail
        const tail = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 4, 6, Math.PI * 1.5), furMat);
        tail.position.set(0, 0.5, -0.4);
        tail.rotation.y = Math.PI / 2;
        group.add(tail);
        // Belly lighter fur patch
        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), furLightMat);
        belly.scale.set(1.2, 0.5, 1.5);
        belly.position.set(0, 0.3, 0.05);
        group.add(belly);
        break;
      }

      case EnemyType.PLAINS_RAIDER: {
        const leatherMat = new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.7 });
        const leatherDarkMat = new THREE.MeshStandardMaterial({ color: 0x5a3c1a, roughness: 0.8 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xb08060, roughness: 0.6 });
        const paintMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, emissive: 0x881111, emissiveIntensity: 0.4 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.8 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.7, roughness: 0.3 });
        const furTrimMat = new THREE.MeshStandardMaterial({ color: 0x8a7050, roughness: 0.9 });
        // Torso with leather armor layers
        const prTorso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.26), leatherMat);
        prTorso.position.y = 0.97;
        prTorso.castShadow = true;
        group.add(prTorso);
        // Chest plate (hardened leather)
        const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.35, 0.04), leatherDarkMat);
        chestPlate.position.set(0, 1.0, 0.14);
        group.add(chestPlate);
        // Leather straps crossing chest
        const strap1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.02), leatherDarkMat);
        strap1.position.set(-0.08, 1.0, 0.16);
        strap1.rotation.z = 0.3;
        group.add(strap1);
        const strap2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.02), leatherDarkMat);
        strap2.position.set(0.08, 1.0, 0.16);
        strap2.rotation.z = -0.3;
        group.add(strap2);
        // Fur collar
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 4, 8), furTrimMat);
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 1.22;
        group.add(collar);
        // Shoulder pads with bone spikes
        for (const sx of [-0.26, 0.26]) {
          const pad = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), leatherDarkMat);
          pad.scale.set(1.3, 0.6, 1);
          pad.position.set(sx, 1.18, 0);
          group.add(pad);
          const boneSpike = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.08, 4), new THREE.MeshStandardMaterial({ color: 0xddccaa }));
          boneSpike.position.set(sx * 1.15, 1.24, 0);
          boneSpike.rotation.z = sx > 0 ? -0.6 : 0.6;
          group.add(boneSpike);
        }
        // Head
        const prHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 7), skinMat);
        prHead.position.y = 1.42;
        group.add(prHead);
        // War braids (hanging from sides)
        for (const bx of [-0.12, 0.12]) {
          const braid = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, 0.15, 4), new THREE.MeshStandardMaterial({ color: 0x222211 }));
          braid.position.set(bx, 1.32, -0.05);
          group.add(braid);
          // Braid bead
          const bead = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 3), metalMat);
          bead.position.set(bx, 1.24, -0.05);
          group.add(bead);
        }
        // War paint (multiple stripes)
        const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.025, 0.02), paintMat);
        stripe1.position.set(0, 1.42, 0.14);
        group.add(stripe1);
        const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.02), paintMat);
        stripe2.position.set(0, 1.45, 0.14);
        group.add(stripe2);
        // Chin paint (vertical stripe)
        const chinPaint = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.02), paintMat);
        chinPaint.position.set(0, 1.34, 0.13);
        group.add(chinPaint);
        // Fierce eyes
        for (const ex of [-0.045, 0.045]) {
          const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
          eyeWhite.position.set(ex, 1.43, 0.12);
          eyeWhite.scale.z = 0.5;
          group.add(eyeWhite);
          const iris = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 3), new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 1.0 }));
          iris.position.set(ex, 1.43, 0.135);
          group.add(iris);
        }
        // Nose
        const prNose = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 4), skinMat);
        prNose.position.set(0, 1.39, 0.14);
        prNose.rotation.x = -0.2;
        group.add(prNose);
        // Spear (detailed with wrapped grip and feathers)
        const spearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 1.3, 6), woodMat);
        spearShaft.position.set(0.3, 0.95, 0);
        group.add(spearShaft);
        // Spear grip wrap
        for (let w = 0; w < 4; w++) {
          const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 3, 6), leatherDarkMat);
          wrap.rotation.x = Math.PI / 2;
          wrap.position.set(0.3, 0.6 + w * 0.08, 0);
          group.add(wrap);
        }
        // Spear head (leaf-shaped)
        const spearHead = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 4), metalMat);
        spearHead.position.set(0.3, 1.65, 0);
        group.add(spearHead);
        // Feathers on spear
        for (let f = 0; f < 2; f++) {
          const feather = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.005), paintMat);
          feather.position.set(0.3, 1.48 + f * 0.04, 0.03);
          feather.rotation.z = f === 0 ? 0.2 : -0.2;
          group.add(feather);
        }
        // Arms
        for (const ax of [-0.24, 0.24]) {
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.22, 6), skinMat);
          upperArm.position.set(ax, 1.05, 0);
          upperArm.rotation.z = ax < 0 ? 0.15 : -0.15;
          group.add(upperArm);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.2, 6), skinMat);
          forearm.position.set(ax * 1.1, 0.86, 0);
          group.add(forearm);
          // Arm wraps
          const armWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.05, 0.06, 6), leatherDarkMat);
          armWrap.position.set(ax * 1.05, 0.92, 0);
          group.add(armWrap);
        }
        // Legs with wraps
        for (const lx of [-0.1, 0.1]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.45, 6), leatherMat);
          leg.position.set(lx, 0.37, 0);
          group.add(leg);
          // Knee wrap
          const kWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.06, 6), leatherDarkMat);
          kWrap.position.set(lx, 0.48, 0);
          group.add(kWrap);
          // Foot wraps / moccasins
          const moccasin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.1), leatherDarkMat);
          moccasin.position.set(lx, 0.12, 0.02);
          group.add(moccasin);
        }
        // Belt with trophy pouch
        const prBelt = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 4, 8), leatherDarkMat);
        prBelt.rotation.x = Math.PI / 2;
        prBelt.position.y = 0.73;
        group.add(prBelt);
        const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), leatherMat);
        pouch.position.set(0.18, 0.72, 0.08);
        group.add(pouch);
        break;
      }

      case EnemyType.GIANT_HAWK: {
        const featherMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.7 });
        const featherDarkMat = new THREE.MeshStandardMaterial({ color: 0x5b3914, roughness: 0.75 });
        const featherLightMat = new THREE.MeshStandardMaterial({ color: 0xab8934, roughness: 0.65 });
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x6b4914, roughness: 0.6 });
        const wingTipMat = new THREE.MeshStandardMaterial({ color: 0x3a2808, roughness: 0.7 });
        const beakMat = new THREE.MeshStandardMaterial({ color: 0xddaa33, roughness: 0.4 });
        const talonMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.2 });
        // Streamlined body
        const hawkBody = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), featherMat);
        hawkBody.scale.set(0.78, 0.68, 1.25);
        hawkBody.position.y = 1.2;
        hawkBody.castShadow = true;
        group.add(hawkBody);
        // Breast feather pattern (lighter v-shape)
        const breast = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 6), featherLightMat);
        breast.scale.set(0.8, 0.6, 0.9);
        breast.position.set(0, 1.12, 0.2);
        group.add(breast);
        // Back feather layers
        for (let bf = 0; bf < 3; bf++) {
          const backF = new THREE.Mesh(new THREE.BoxGeometry(0.2 - bf * 0.03, 0.015, 0.12), featherDarkMat);
          backF.position.set(0, 1.28 - bf * 0.04, -0.15 - bf * 0.05);
          backF.rotation.x = 0.1;
          group.add(backF);
        }
        // Head with crest
        const hawkHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 7), featherMat);
        hawkHead.scale.set(1, 0.95, 1.1);
        hawkHead.position.set(0, 1.52, 0.28);
        group.add(hawkHead);
        // Crown crest feathers
        for (let c = 0; c < 3; c++) {
          const crest = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06 + c * 0.01, 0.04), featherDarkMat);
          crest.position.set(0, 1.62 + c * 0.02, 0.2 - c * 0.04);
          crest.rotation.x = -0.3 - c * 0.1;
          group.add(crest);
        }
        // Eye ridge (intimidating brow)
        for (const ex of [-0.06, 0.06]) {
          const brow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.03), featherDarkMat);
          brow.position.set(ex, 1.56, 0.36);
          brow.rotation.z = ex > 0 ? -0.2 : 0.2;
          group.add(brow);
        }
        // Beak (upper and lower)
        const upperBeak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 5), beakMat);
        upperBeak.rotation.x = -Math.PI / 2;
        upperBeak.position.set(0, 1.50, 0.42);
        group.add(upperBeak);
        const lowerBeak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 4), beakMat);
        lowerBeak.rotation.x = -Math.PI / 2 + 0.15;
        lowerBeak.position.set(0, 1.47, 0.4);
        group.add(lowerBeak);
        // Beak hook at tip
        const beakHook = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 3), beakMat);
        beakHook.position.set(0, 1.48, 0.49);
        group.add(beakHook);
        // Fierce eyes with golden iris
        const hawkEyeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.5 });
        for (const ex of [-0.06, 0.06]) {
          const eyeBase = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 4), new THREE.MeshStandardMaterial({ color: 0xffdd44 }));
          eyeBase.position.set(ex, 1.53, 0.35);
          eyeBase.scale.z = 0.5;
          group.add(eyeBase);
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 3), hawkEyeMat);
          pupil.position.set(ex, 1.53, 0.37);
          group.add(pupil);
        }
        // Wings (multi-layered feathers)
        for (const wx of [-1, 1]) {
          // Inner wing (secondary feathers)
          const innerWing = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.35), featherMat);
          innerWing.position.set(wx * 0.35, 1.25, 0.02);
          innerWing.rotation.z = wx * 0.15;
          group.add(innerWing);
          // Outer wing (primary feathers)
          const outerWing = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.015, 0.3), wingMat);
          outerWing.position.set(wx * 0.7, 1.22, -0.02);
          outerWing.rotation.z = wx * 0.25;
          group.add(outerWing);
          // Wing tip feathers (individual)
          for (let ft = 0; ft < 4; ft++) {
            const tipFeather = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.06), wingTipMat);
            tipFeather.position.set(wx * (0.92 + ft * 0.03), 1.18 - ft * 0.02, -0.05 - ft * 0.04);
            tipFeather.rotation.z = wx * (0.35 + ft * 0.05);
            tipFeather.rotation.y = wx * ft * 0.05;
            group.add(tipFeather);
          }
          // Wing coverts (small overlapping feathers)
          for (let cv = 0; cv < 3; cv++) {
            const covert = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.015, 0.08), featherLightMat);
            covert.position.set(wx * (0.3 + cv * 0.15), 1.28, 0.08 - cv * 0.03);
            covert.rotation.z = wx * 0.1;
            group.add(covert);
          }
        }
        // Tail feathers (fanned)
        for (let tf = 0; tf < 5; tf++) {
          const tailFeather = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.2), tf % 2 === 0 ? featherDarkMat : wingMat);
          tailFeather.position.set((tf - 2) * 0.05, 1.14, -0.3 - Math.abs(tf - 2) * 0.03);
          tailFeather.rotation.y = (tf - 2) * 0.08;
          group.add(tailFeather);
        }
        // Legs with scales and talons
        for (const tx of [-0.1, 0.1]) {
          // Feathered thigh
          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.15, 6), featherMat);
          thigh.position.set(tx, 1.02, 0.1);
          group.add(thigh);
          // Scaled tarsus
          const tarsus = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.2, 5), beakMat);
          tarsus.position.set(tx, 0.88, 0.12);
          group.add(tarsus);
          // Scale rings on tarsus
          for (let sr = 0; sr < 3; sr++) {
            const scaleRing = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.004, 3, 6), beakMat);
            scaleRing.rotation.x = Math.PI / 2;
            scaleRing.position.set(tx, 0.82 + sr * 0.05, 0.12);
            group.add(scaleRing);
          }
          // Talons (3 front + 1 back)
          for (let tc = 0; tc < 3; tc++) {
            const talon = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.08, 4), talonMat);
            talon.position.set(tx + (tc - 1) * 0.025, 0.74, 0.14 + tc * 0.01);
            talon.rotation.x = Math.PI * 0.85;
            group.add(talon);
          }
          // Rear talon
          const rearTalon = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.06, 4), talonMat);
          rearTalon.position.set(tx, 0.76, 0.08);
          rearTalon.rotation.x = Math.PI * 1.15;
          group.add(rearTalon);
        }
        break;
      }

      case EnemyType.BISON_BEAST: {
        const bisonMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.85 });
        const bisonDarkMat = new THREE.MeshStandardMaterial({ color: 0x221510, roughness: 0.9 });
        const bisonLightMat = new THREE.MeshStandardMaterial({ color: 0x5a4a30, roughness: 0.8 });
        const hornMat = new THREE.MeshStandardMaterial({ color: 0x888866, roughness: 0.4, metalness: 0.1 });
        const hornDarkMat = new THREE.MeshStandardMaterial({ color: 0x666644, roughness: 0.5 });
        const hoofMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
        // Massive body (rounded, muscular)
        const biBody = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), bisonMat);
        biBody.scale.set(0.85, 0.65, 1.1);
        biBody.position.y = 0.82;
        biBody.castShadow = true;
        group.add(biBody);
        // Ribcage bulge on sides
        for (const sx of [-1, 1]) {
          const ribs = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 5), bisonMat);
          ribs.scale.set(0.4, 0.6, 1.0);
          ribs.position.set(sx * 0.35, 0.75, -0.05);
          group.add(ribs);
        }
        // Massive shoulder hump with matted fur
        const hump = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 7), bisonDarkMat);
        hump.scale.set(1, 0.9, 0.85);
        hump.position.set(0, 1.25, 0.15);
        group.add(hump);
        // Fur tufts on hump
        for (let ft = 0; ft < 8; ft++) {
          const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 3), bisonDarkMat);
          const ang = (ft / 8) * Math.PI * 2;
          tuft.position.set(Math.sin(ang) * 0.2, 1.4 + Math.random() * 0.1, 0.15 + Math.cos(ang) * 0.15);
          tuft.rotation.set(Math.random() * 0.5, 0, Math.random() * 0.5 - 0.25);
          group.add(tuft);
        }
        // Shaggy beard/chest fur
        for (let bf = 0; bf < 5; bf++) {
          const beard = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 3), bisonDarkMat);
          beard.position.set((bf - 2) * 0.06, 0.65, 0.5 + Math.random() * 0.1);
          beard.rotation.x = 0.3;
          group.add(beard);
        }
        // Head (broad, lowered)
        const biHead = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 7), bisonMat);
        biHead.scale.set(1.05, 0.78, 0.95);
        biHead.position.set(0, 0.78, 0.72);
        group.add(biHead);
        // Broad nose/muzzle
        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), bisonLightMat);
        muzzle.scale.set(1.2, 0.7, 1);
        muzzle.position.set(0, 0.7, 0.9);
        group.add(muzzle);
        // Nostrils (flared)
        for (const nx of [-0.05, 0.05]) {
          const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3), new THREE.MeshStandardMaterial({ color: 0x331111 }));
          nostril.scale.z = 0.5;
          nostril.position.set(nx, 0.68, 0.98);
          group.add(nostril);
        }
        // Horns (curved, multi-segment)
        for (const hx of [-0.22, 0.22]) {
          // Horn base (thick)
          const hornBase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 6), hornDarkMat);
          hornBase.position.set(hx, 0.92, 0.7);
          hornBase.rotation.z = hx > 0 ? -0.4 : 0.4;
          group.add(hornBase);
          // Horn mid (curving outward)
          const hornMid = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.15, 6), hornMat);
          hornMid.position.set(hx * 1.3, 0.98, 0.72);
          hornMid.rotation.z = hx > 0 ? -0.8 : 0.8;
          group.add(hornMid);
          // Horn tip (curving upward)
          const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 5), hornMat);
          hornTip.position.set(hx * 1.5, 1.08, 0.74);
          hornTip.rotation.z = hx > 0 ? -1.2 : 1.2;
          group.add(hornTip);
          // Horn ridges
          for (let hr = 0; hr < 2; hr++) {
            const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.006, 3, 6), hornDarkMat);
            ridge.rotation.x = Math.PI / 2;
            ridge.position.set(hx * (1.1 + hr * 0.15), 0.94 + hr * 0.04, 0.71);
            group.add(ridge);
          }
        }
        // Eyes (deep-set, fierce)
        const biEyeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xcc2200, emissiveIntensity: 1.0 });
        for (const ex of [-0.12, 0.12]) {
          const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), bisonDarkMat);
          eyeSocket.scale.z = 0.5;
          eyeSocket.position.set(ex, 0.82, 0.86);
          group.add(eyeSocket);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), biEyeMat);
          eye.position.set(ex, 0.82, 0.89);
          group.add(eye);
        }
        // Ears
        for (const ex of [-0.2, 0.2]) {
          const ear = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.03), bisonMat);
          ear.position.set(ex, 0.92, 0.6);
          ear.rotation.z = ex > 0 ? -0.4 : 0.4;
          group.add(ear);
        }
        // Legs (thick, muscular with joints)
        for (let i = 0; i < 2; i++) {
          for (const side of [-1, 1]) {
            const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.25, 6), bisonMat);
            upperLeg.position.set(side * 0.32, 0.5, i * 0.72 - 0.15);
            group.add(upperLeg);
            const knee = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), bisonMat);
            knee.position.set(side * 0.32, 0.38, i * 0.72 - 0.15);
            group.add(knee);
            const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.22, 6), bisonLightMat);
            lowerLeg.position.set(side * 0.32, 0.22, i * 0.72 - 0.15);
            group.add(lowerLeg);
            // Hoof
            const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.05, 6), hoofMat);
            hoof.position.set(side * 0.32, 0.08, i * 0.72 - 0.15);
            group.add(hoof);
            // Hoof split detail
            const split = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.06, 0.06), bisonDarkMat);
            split.position.set(side * 0.32, 0.08, i * 0.72 - 0.15);
            group.add(split);
          }
        }
        // Tail (long with tuft)
        const tailBase = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.35, 5), bisonMat);
        tailBase.position.set(0, 0.75, -0.55);
        tailBase.rotation.x = 0.4;
        group.add(tailBase);
        const tailTuft = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), bisonDarkMat);
        tailTuft.scale.y = 1.5;
        tailTuft.position.set(0, 0.58, -0.7);
        group.add(tailTuft);
        break;
      }

      case EnemyType.CENTAUR_WARCHIEF: {
        const horseMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.7 });
        const horseDarkMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.8 });
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x886622, metalness: 0.5, roughness: 0.4 });
        const armorTrimMat = new THREE.MeshStandardMaterial({ color: 0xccaa33, metalness: 0.7, roughness: 0.3 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xb08060, roughness: 0.6 });
        const chainMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.2 });
        const hoofMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 });
        // Horse body (muscular, rounded)
        const hBody = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), horseMat);
        hBody.scale.set(0.7, 0.55, 1.4);
        hBody.position.y = 0.68;
        hBody.castShadow = true;
        group.add(hBody);
        // Horse barrel (side bulge)
        for (const sx of [-1, 1]) {
          const barrel = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), horseMat);
          barrel.scale.set(0.5, 0.5, 1);
          barrel.position.set(sx * 0.25, 0.6, 0);
          group.add(barrel);
        }
        // Horse armor blanket
        const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.8), armorMat);
        blanket.position.set(0, 0.88, -0.1);
        group.add(blanket);
        // Blanket trim edges
        for (const sx of [-0.32, 0.32]) {
          const trim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.82), armorTrimMat);
          trim.position.set(sx, 0.87, -0.1);
          group.add(trim);
        }
        // Horse neck (muscular transition)
        const hNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.35, 6), horseMat);
        hNeck.position.set(0, 0.9, 0.45);
        hNeck.rotation.x = -0.5;
        group.add(hNeck);
        // Horse head
        const hHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 6), horseMat);
        hHead.scale.set(0.8, 0.7, 1.3);
        hHead.position.set(0, 0.85, 0.7);
        group.add(hHead);
        // Horse muzzle
        const hMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 5), horseMat);
        hMuzzle.rotation.x = Math.PI / 2;
        hMuzzle.position.set(0, 0.82, 0.82);
        group.add(hMuzzle);
        // Horse ears
        for (const ex of [-0.06, 0.06]) {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 4), horseMat);
          ear.position.set(ex, 0.98, 0.65);
          group.add(ear);
        }
        // Mane (flowing tufts)
        for (let m = 0; m < 6; m++) {
          const mane = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06 + m * 0.01, 0.03), horseDarkMat);
          mane.position.set(0, 0.95 - m * 0.02, 0.5 - m * 0.06);
          mane.rotation.x = -0.2;
          group.add(mane);
        }
        // Human torso (armored, rising from horse)
        const hTorso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.28), armorMat);
        hTorso.position.set(0, 1.28, 0.25);
        group.add(hTorso);
        // Chest plate detail
        const chestEmblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), armorTrimMat);
        chestEmblem.position.set(0, 1.3, 0.4);
        chestEmblem.scale.z = 0.3;
        group.add(chestEmblem);
        // Chain mail under armor (visible at waist)
        const chainSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.1, 8), chainMat);
        chainSkirt.position.set(0, 0.98, 0.25);
        group.add(chainSkirt);
        // Shoulder pauldrons
        for (const sx of [-0.28, 0.28]) {
          const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), armorMat);
          pauldron.scale.set(1.3, 0.7, 1);
          pauldron.position.set(sx, 1.52, 0.25);
          group.add(pauldron);
          // Pauldron spike
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 4), armorTrimMat);
          spike.position.set(sx * 1.2, 1.58, 0.25);
          spike.rotation.z = sx > 0 ? -0.6 : 0.6;
          group.add(spike);
          // Pauldron edge trim
          const pTrim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 3, 8, Math.PI), armorTrimMat);
          pTrim.position.set(sx, 1.48, 0.25);
          pTrim.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
          group.add(pTrim);
        }
        // Arms
        for (const ax of [-0.28, 0.28]) {
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.25, 6), skinMat);
          upperArm.position.set(ax, 1.35, 0.25);
          upperArm.rotation.z = ax < 0 ? 0.2 : -0.2;
          group.add(upperArm);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.22, 6), skinMat);
          forearm.position.set(ax * 1.15, 1.15, 0.25);
          group.add(forearm);
          // Bracer
          const bracer = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.08, 6), armorMat);
          bracer.position.set(ax * 1.1, 1.2, 0.25);
          group.add(bracer);
        }
        // Head
        const cHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), skinMat);
        cHead.position.set(0, 1.72, 0.25);
        group.add(cHead);
        // War crown/helm (detailed)
        const helmBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.1, 8), armorMat);
        helmBase.position.set(0, 1.82, 0.25);
        group.add(helmBase);
        // Crown spikes
        for (let cs = 0; cs < 5; cs++) {
          const ang = (cs / 5) * Math.PI * 2;
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.08, 4), armorTrimMat);
          spike.position.set(Math.sin(ang) * 0.13, 1.9, 0.25 + Math.cos(ang) * 0.13);
          group.add(spike);
        }
        // Facial features
        const cEyeMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.2 });
        for (const ex of [-0.055, 0.055]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), cEyeMat);
          eye.position.set(ex, 1.73, 0.4);
          group.add(eye);
        }
        // Beard
        const beard = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), horseDarkMat);
        beard.position.set(0, 1.6, 0.35);
        beard.rotation.x = 0.2;
        group.add(beard);
        // Great axe (detailed)
        const axeShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 1.1, 6), woodMat);
        axeShaft.position.set(0.38, 1.25, 0.25);
        group.add(axeShaft);
        // Shaft grip wraps
        for (let gw = 0; gw < 3; gw++) {
          const grip = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.005, 3, 6), new THREE.MeshStandardMaterial({ color: 0x443322 }));
          grip.rotation.x = Math.PI / 2;
          grip.position.set(0.38, 0.85 + gw * 0.1, 0.25);
          group.add(grip);
        }
        // Double axe head
        for (const side of [-1, 1]) {
          const axeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.025), chainMat);
          axeBlade.position.set(0.38 + side * 0.08, 1.82, 0.25);
          group.add(axeBlade);
          // Blade edge curve
          const edgeCurve = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.07, 0.2, 4), chainMat);
          edgeCurve.position.set(0.38 + side * 0.15, 1.82, 0.25);
          group.add(edgeCurve);
        }
        // Axe pommel
        const axePommel = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), armorTrimMat);
        axePommel.position.set(0.38, 0.68, 0.25);
        group.add(axePommel);
        // Horse legs (muscular with joints and hooves)
        for (let i = 0; i < 2; i++) {
          for (const side of [-1, 1]) {
            const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.2, 6), horseMat);
            upperLeg.position.set(side * 0.24, 0.42, i * 0.82 - 0.22);
            group.add(upperLeg);
            const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 6), horseMat);
            lowerLeg.position.set(side * 0.24, 0.2, i * 0.82 - 0.22);
            group.add(lowerLeg);
            const fetlock = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), horseDarkMat);
            fetlock.position.set(side * 0.24, 0.1, i * 0.82 - 0.22);
            group.add(fetlock);
            const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.04, 6), hoofMat);
            hoof.position.set(side * 0.24, 0.03, i * 0.82 - 0.22);
            group.add(hoof);
          }
        }
        // Horse tail (flowing)
        const tailBase = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.3, 5), horseDarkMat);
        tailBase.position.set(0, 0.6, -0.6);
        tailBase.rotation.x = 0.5;
        group.add(tailBase);
        for (let tt = 0; tt < 4; tt++) {
          const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.2, 3), horseDarkMat);
          strand.position.set((tt - 1.5) * 0.015, 0.42, -0.72);
          strand.rotation.x = 0.3 + tt * 0.05;
          group.add(strand);
        }
        break;
      }

      // ── NIGHT BOSSES ────────────────────────────────────────────
      case EnemyType.NIGHT_FOREST_WENDIGO: {
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.6 });
        const boneDarkMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.7 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
        const darkSkinMat = new THREE.MeshStandardMaterial({ color: 0x2a2222, roughness: 0.85 });
        const glowMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22ff22, emissiveIntensity: 2.0 });
        const glowDimMat = new THREE.MeshStandardMaterial({ color: 0x33cc33, emissive: 0x11aa11, emissiveIntensity: 1.0 });
        const bloodMat = new THREE.MeshStandardMaterial({ color: 0x660000, emissive: 0x330000, emissiveIntensity: 0.3, roughness: 0.4 });
        // Tall gaunt torso (emaciated)
        const wTorso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.85, 0.22), darkMat);
        wTorso.position.y = 1.35;
        wTorso.castShadow = true;
        group.add(wTorso);
        // Emaciated belly (sunken)
        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), darkSkinMat);
        belly.scale.set(1, 1.2, 0.6);
        belly.position.set(0, 1.1, 0.05);
        group.add(belly);
        // Rib cage (detailed individual ribs)
        for (let r = 0; r < 5; r++) {
          const rib = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.015, 4, 8, Math.PI), boneMat);
          rib.position.set(0, 1.0 + r * 0.13, 0.12);
          group.add(rib);
          // Rib connecting to spine
          const ribBack = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.08, 3), boneDarkMat);
          ribBack.position.set(0, 1.0 + r * 0.13, -0.08);
          ribBack.rotation.x = Math.PI / 2;
          group.add(ribBack);
        }
        // Spine (visible vertebrae)
        for (let v = 0; v < 7; v++) {
          const vert = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.04), boneMat);
          vert.position.set(0, 0.9 + v * 0.15, -0.12);
          group.add(vert);
          // Spinous process
          const proc = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.04, 3), boneDarkMat);
          proc.position.set(0, 0.92 + v * 0.15, -0.16);
          proc.rotation.x = 0.3;
          group.add(proc);
        }
        // Skull head (deer skull shape)
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 7), boneMat);
        skull.scale.set(0.9, 1.2, 1);
        skull.position.y = 2.02;
        group.add(skull);
        // Elongated snout
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.2), boneMat);
        snout.position.set(0, 1.95, 0.22);
        group.add(snout);
        // Nasal cavity (dark hole)
        const nasal = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        nasal.position.set(0, 1.94, 0.32);
        group.add(nasal);
        // Jaw with teeth
        const upperJaw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.15), boneMat);
        upperJaw.position.set(0, 1.9, 0.2);
        group.add(upperJaw);
        const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.13), boneDarkMat);
        lowerJaw.position.set(0, 1.87, 0.19);
        lowerJaw.rotation.x = 0.15;
        group.add(lowerJaw);
        // Individual teeth
        for (let t = 0; t < 4; t++) {
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.04, 3), boneMat);
          tooth.position.set((t - 1.5) * 0.025, 1.88, 0.28);
          group.add(tooth);
        }
        // Blood stains around mouth
        for (let bs = 0; bs < 3; bs++) {
          const stain = new THREE.Mesh(new THREE.SphereGeometry(0.015, 3, 3), bloodMat);
          stain.position.set((Math.random() - 0.5) * 0.08, 1.86 + Math.random() * 0.04, 0.27);
          stain.scale.set(1.5, 0.5, 0.5);
          group.add(stain);
        }
        // Massive branching antlers
        for (const ax of [-0.15, 0.15]) {
          // Main antler trunk
          const antlerMain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.5, 5), boneMat);
          antlerMain.position.set(ax, 2.3, 0);
          antlerMain.rotation.z = ax > 0 ? -0.25 : 0.25;
          group.add(antlerMain);
          // First branch
          const branch1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.25, 4), boneMat);
          branch1.position.set(ax * 1.3, 2.35, 0.08);
          branch1.rotation.z = ax > 0 ? -0.6 : 0.6;
          branch1.rotation.x = -0.3;
          group.add(branch1);
          // Second branch
          const branch2 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.018, 0.2, 4), boneDarkMat);
          branch2.position.set(ax * 1.1, 2.5, -0.06);
          branch2.rotation.z = ax > 0 ? -0.9 : 0.9;
          group.add(branch2);
          // Third branch (highest)
          const branch3 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, 0.18, 4), boneMat);
          branch3.position.set(ax * 0.9, 2.6, 0);
          branch3.rotation.z = ax > 0 ? -0.4 : 0.4;
          group.add(branch3);
          // Tine tips
          for (let tn = 0; tn < 2; tn++) {
            const tine = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.1, 3), boneMat);
            tine.position.set(ax * (1.4 + tn * 0.2), 2.5 + tn * 0.12, tn * 0.06);
            tine.rotation.z = ax > 0 ? -0.5 : 0.5;
            group.add(tine);
          }
        }
        // Green glowing eyes (intense with trail)
        for (const ex of [-0.065, 0.065]) {
          const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), glowDimMat);
          eyeGlow.position.set(ex, 2.05, 0.14);
          group.add(eyeGlow);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), glowMat);
          eye.position.set(ex, 2.05, 0.16);
          group.add(eye);
          // Green wisp trail from eye
          const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.003, 0.1, 3), glowDimMat);
          trail.position.set(ex * 1.2, 2.1, 0.12);
          trail.rotation.z = ex > 0 ? -0.5 : 0.5;
          group.add(trail);
        }
        // Long emaciated arms
        for (const ax of [-0.35, 0.35]) {
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.45, 5), darkMat);
          upperArm.position.set(ax, 1.35, 0);
          upperArm.rotation.z = ax < 0 ? 0.15 : -0.15;
          group.add(upperArm);
          // Elbow bone protrusion
          const elbow = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 3), boneMat);
          elbow.position.set(ax * 1.1, 1.1, -0.05);
          elbow.rotation.z = ax > 0 ? 0.5 : -0.5;
          group.add(elbow);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.45, 5), darkSkinMat);
          forearm.position.set(ax * 1.2, 0.85, 0.05);
          forearm.rotation.z = ax < 0 ? 0.25 : -0.25;
          group.add(forearm);
          // Bony hand
          const hand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.05), boneMat);
          hand.position.set(ax * 1.35, 0.6, 0.08);
          group.add(hand);
          // Long claws (5 per hand)
          for (let c = 0; c < 4; c++) {
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.14, 3), boneMat);
            claw.position.set(ax * 1.35 + (c - 1.5) * 0.02, 0.52, 0.1);
            claw.rotation.x = 0.35;
            group.add(claw);
          }
        }
        // Digitigrade legs (bent backward at knee)
        for (const lx of [-0.12, 0.12]) {
          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.35, 5), darkMat);
          thigh.position.set(lx, 0.7, 0.05);
          thigh.rotation.x = 0.2;
          group.add(thigh);
          const knee = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), darkSkinMat);
          knee.position.set(lx, 0.52, 0.1);
          group.add(knee);
          const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.35, 5), darkSkinMat);
          shin.position.set(lx, 0.32, -0.02);
          shin.rotation.x = -0.3;
          group.add(shin);
          // Hooved foot
          const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.1), darkMat);
          hoof.position.set(lx, 0.12, -0.08);
          group.add(hoof);
          // Split hoof detail
          const split = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.04, 0.08), boneDarkMat);
          split.position.set(lx, 0.12, -0.08);
          group.add(split);
        }
        // Icy frost particles around body
        for (let fp = 0; fp < 6; fp++) {
          const frost = new THREE.Mesh(new THREE.OctahedronGeometry(0.02, 0), new THREE.MeshStandardMaterial({
            color: 0x88ffaa, emissive: 0x44cc66, emissiveIntensity: 0.5, transparent: true, opacity: 0.5
          }));
          frost.position.set((Math.random() - 0.5) * 0.6, 0.5 + Math.random() * 1.5, (Math.random() - 0.5) * 0.4);
          group.add(frost);
        }
        break;
      }

      case EnemyType.NIGHT_ELVEN_BANSHEE_QUEEN: {
        const ghostMat = new THREE.MeshStandardMaterial({ color: 0x6644aa, transparent: true, opacity: 0.65, roughness: 0.3 });
        const ghostDarkMat = new THREE.MeshStandardMaterial({ color: 0x442288, transparent: true, opacity: 0.5, roughness: 0.2 });
        const crownMat = new THREE.MeshStandardMaterial({ color: 0xaaaaff, emissive: 0x6644ff, emissiveIntensity: 1.2 });
        const runeGlowMat = new THREE.MeshStandardMaterial({ color: 0xcc88ff, emissive: 0xaa44ff, emissiveIntensity: 1.5 });
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x8866cc, transparent: true, opacity: 0.6, roughness: 0.2 });
        // Flowing ghostly dress base (layered)
        const bqDressOuter = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 10), ghostDarkMat);
        bqDressOuter.position.y = 0.65;
        group.add(bqDressOuter);
        const bqDress = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.35, 10), ghostMat);
        bqDress.position.y = 0.7;
        bqDress.castShadow = true;
        group.add(bqDress);
        // Tattered dress edges
        for (let e = 0; e < 8; e++) {
          const ang = (e / 8) * Math.PI * 2;
          const tatter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.015), ghostDarkMat);
          tatter.position.set(Math.sin(ang) * 0.38, 0.15, Math.cos(ang) * 0.38);
          tatter.rotation.y = ang;
          tatter.rotation.x = 0.3 + Math.random() * 0.2;
          group.add(tatter);
        }
        // Floating rune circle at base
        const runeCircle = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.015, 4, 16), runeGlowMat);
        runeCircle.rotation.x = Math.PI / 2;
        runeCircle.position.y = 0.1;
        group.add(runeCircle);
        // Rune symbols on circle
        for (let rs = 0; rs < 6; rs++) {
          const ang = (rs / 6) * Math.PI * 2;
          const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.02, 0), runeGlowMat);
          rune.position.set(Math.sin(ang) * 0.5, 0.1, Math.cos(ang) * 0.5);
          group.add(rune);
        }
        // Upper torso (elegant form)
        const bqTorso = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 7), ghostMat);
        bqTorso.scale.set(1, 1.1, 0.8);
        bqTorso.position.y = 1.52;
        group.add(bqTorso);
        // Necklace/collar
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.015, 4, 10), crownMat);
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 1.62;
        group.add(collar);
        // Pendant
        const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), new THREE.MeshStandardMaterial({ color: 0xff44ff, emissive: 0xcc00cc, emissiveIntensity: 1.5 }));
        pendant.position.set(0, 1.55, 0.16);
        group.add(pendant);
        // Elegant arms reaching outward
        for (const ax of [-0.3, 0.3]) {
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.3, 5), ghostMat);
          upperArm.position.set(ax, 1.45, 0.05);
          upperArm.rotation.z = ax < 0 ? 0.5 : -0.5;
          group.add(upperArm);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.28, 5), ghostMat);
          forearm.position.set(ax * 1.5, 1.28, 0.1);
          forearm.rotation.z = ax < 0 ? 0.7 : -0.7;
          group.add(forearm);
          // Elegant pointed fingers
          for (let f = 0; f < 4; f++) {
            const finger = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.08, 3), ghostMat);
            finger.position.set(ax * 1.7 + (f - 1.5) * 0.015, 1.12 + f * 0.01, 0.12);
            finger.rotation.x = 0.2;
            group.add(finger);
          }
          // Bracelet
          const bracelet = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 3, 8), crownMat);
          bracelet.rotation.x = Math.PI / 2;
          bracelet.position.set(ax * 1.4, 1.32, 0.08);
          group.add(bracelet);
        }
        // Head (elven features)
        const bqHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), ghostMat);
        bqHead.scale.set(1, 1.05, 0.95);
        bqHead.position.y = 1.88;
        group.add(bqHead);
        // Pointed elven ears
        for (const ex of [-0.14, 0.14]) {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 4), ghostMat);
          ear.position.set(ex, 1.9, 0.02);
          ear.rotation.z = ex > 0 ? -0.8 : 0.8;
          group.add(ear);
        }
        // Flowing spectral hair
        for (let h = 0; h < 8; h++) {
          const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.006, 0.3 + h * 0.04, 3), hairMat);
          const ang = (h / 8) * Math.PI + Math.PI / 2;
          strand.position.set(Math.sin(ang) * 0.12, 1.72 - h * 0.02, -0.05 + Math.cos(ang) * 0.08);
          strand.rotation.x = 0.3;
          strand.rotation.z = (Math.random() - 0.5) * 0.3;
          group.add(strand);
        }
        // Crown (ornate, elven style)
        const crownBase = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 4, 10), crownMat);
        crownBase.rotation.x = Math.PI / 2;
        crownBase.position.y = 1.98;
        group.add(crownBase);
        for (let i = 0; i < 5; i++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.14 + (i === 2 ? 0.06 : 0), 4), crownMat);
          const ang = (i / 5) * Math.PI * 2;
          spike.position.set(Math.sin(ang) * 0.14, 2.06, Math.cos(ang) * 0.14);
          group.add(spike);
        }
        // Crown center gem
        const centerGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), new THREE.MeshStandardMaterial({ color: 0xff66ff, emissive: 0xff22ff, emissiveIntensity: 2.0 }));
        centerGem.position.set(0, 2.0, 0.14);
        group.add(centerGem);
        // Glowing eyes (intense magenta)
        const bqEyeMat = new THREE.MeshStandardMaterial({ color: 0xff44ff, emissive: 0xff00ff, emissiveIntensity: 2.0 });
        for (const ex of [-0.055, 0.055]) {
          const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 3), new THREE.MeshStandardMaterial({ color: 0xcc44cc, emissive: 0xaa22aa, emissiveIntensity: 1.0, transparent: true, opacity: 0.5 }));
          eyeGlow.position.set(ex, 1.89, 0.12);
          group.add(eyeGlow);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), bqEyeMat);
          eye.position.set(ex, 1.89, 0.14);
          group.add(eye);
        }
        // Mouth (slightly open, spectral scream)
        const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 3), new THREE.MeshStandardMaterial({ color: 0x220033, emissive: 0x110022, emissiveIntensity: 0.5 }));
        mouth.scale.set(1.2, 0.5, 0.5);
        mouth.position.set(0, 1.82, 0.14);
        group.add(mouth);
        // Orbiting soul wisps
        for (let sw = 0; sw < 5; sw++) {
          const ang = (sw / 5) * Math.PI * 2;
          const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3), new THREE.MeshStandardMaterial({
            color: 0xaa88ff, emissive: 0x6644cc, emissiveIntensity: 1.0, transparent: true, opacity: 0.5
          }));
          wisp.position.set(Math.sin(ang) * 0.55, 0.8 + sw * 0.25, Math.cos(ang) * 0.55);
          group.add(wisp);
        }
        break;
      }

      case EnemyType.NIGHT_NECRO_DEATH_KNIGHT: {
        const dkArmorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, metalness: 0.8, roughness: 0.3 });
        const dkArmorDarkMat = new THREE.MeshStandardMaterial({ color: 0x0e0e1a, metalness: 0.9, roughness: 0.2 });
        const dkGlowMat = new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x22ff88, emissiveIntensity: 1.5 });
        const dkGlowDimMat = new THREE.MeshStandardMaterial({ color: 0x33cc88, emissive: 0x11aa66, emissiveIntensity: 0.8 });
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xbbaa99, roughness: 0.6 });
        const chainMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.7, roughness: 0.3 });
        // Heavy armored torso with detail
        const dkTorso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), dkArmorMat);
        dkTorso.position.y = 1.22;
        dkTorso.castShadow = true;
        group.add(dkTorso);
        // Chest plate with skull emblem
        const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.04), dkArmorDarkMat);
        chestPlate.position.set(0, 1.22, 0.18);
        group.add(chestPlate);
        // Skull emblem on chest
        const emblemSkull = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), boneMat);
        emblemSkull.scale.set(1, 1.2, 0.5);
        emblemSkull.position.set(0, 1.3, 0.22);
        group.add(emblemSkull);
        // Emblem eye sockets
        for (const ex of [-0.02, 0.02]) {
          const embEye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 3, 3), dkGlowMat);
          embEye.position.set(ex, 1.32, 0.24);
          group.add(embEye);
        }
        // Gorget (neck armor)
        const gorget = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.1, 8), dkArmorMat);
        gorget.position.y = 1.62;
        group.add(gorget);
        // Tasset (waist armor plates)
        for (let t = 0; t < 4; t++) {
          const ang = (t / 4) * Math.PI - Math.PI / 4;
          const tasset = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.03), dkArmorMat);
          tasset.position.set(Math.sin(ang) * 0.22, 0.78, Math.cos(ang) * 0.12);
          tasset.rotation.y = ang;
          group.add(tasset);
        }
        // Chain mail skirt
        const chainSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.12, 8), chainMat);
        chainSkirt.position.y = 0.83;
        group.add(chainSkirt);
        // Massive pauldrons with spikes
        for (const sx of [-0.35, 0.35]) {
          const padBase = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.2), dkArmorMat);
          padBase.position.set(sx, 1.65, 0);
          group.add(padBase);
          const padTop = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), dkArmorDarkMat);
          padTop.scale.set(1.3, 0.6, 1);
          padTop.position.set(sx, 1.7, 0);
          group.add(padTop);
          // Pauldron spikes
          for (let sp = 0; sp < 2; sp++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.1, 4), dkArmorMat);
            spike.position.set(sx * 1.15, 1.72 + sp * 0.05, (sp - 0.5) * 0.08);
            spike.rotation.z = sx > 0 ? -0.5 : 0.5;
            group.add(spike);
          }
          // Green glow rune on pauldron
          const padRune = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.015), dkGlowDimMat);
          padRune.position.set(sx * 0.9, 1.66, 0.1);
          group.add(padRune);
        }
        // Helmet (great helm style)
        const dkHelm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.25, 8), dkArmorMat);
        dkHelm.position.y = 1.82;
        group.add(dkHelm);
        const helmTop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), dkArmorDarkMat);
        helmTop.scale.y = 0.5;
        helmTop.position.y = 1.95;
        group.add(helmTop);
        // Visor slit with glow
        const dkVisor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.035, 0.02), dkGlowMat);
        dkVisor.position.set(0, 1.82, 0.2);
        group.add(dkVisor);
        // Breath holes
        for (let bh = 0; bh < 3; bh++) {
          const hole = new THREE.Mesh(new THREE.CircleGeometry(0.008, 4), dkGlowDimMat);
          hole.position.set(-0.03 + bh * 0.03, 1.75, 0.2);
          group.add(hole);
        }
        // Helm crest
        const crest = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.15), dkArmorMat);
        crest.position.set(0, 1.98, 0);
        group.add(crest);
        // Arms (armored)
        for (const ax of [-0.32, 0.32]) {
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.28, 6), dkArmorMat);
          upperArm.position.set(ax, 1.42, 0);
          upperArm.rotation.z = ax < 0 ? 0.15 : -0.15;
          group.add(upperArm);
          // Elbow cop
          const elbowCop = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), dkArmorDarkMat);
          elbowCop.position.set(ax * 1.05, 1.25, 0);
          group.add(elbowCop);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.25, 6), dkArmorMat);
          forearm.position.set(ax * 1.1, 1.08, 0);
          group.add(forearm);
          // Gauntlet
          const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.07), dkArmorDarkMat);
          gauntlet.position.set(ax * 1.15, 0.93, 0);
          group.add(gauntlet);
        }
        // Runic greatsword
        const gsHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.2, 5), new THREE.MeshStandardMaterial({ color: 0x333344 }));
        gsHilt.position.set(0.42, 0.55, 0);
        group.add(gsHilt);
        const gsGuard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.04), dkArmorMat);
        gsGuard.position.set(0.42, 0.66, 0);
        group.add(gsGuard);
        const gsBlade = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.1, 0.018), dkArmorDarkMat);
        gsBlade.position.set(0.42, 1.22, 0);
        group.add(gsBlade);
        // Blade rune glow lines
        for (let rl = 0; rl < 4; rl++) {
          const runeLine = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.06, 0.02), dkGlowMat);
          runeLine.position.set(0.42, 0.8 + rl * 0.22, 0.01);
          group.add(runeLine);
        }
        // Blade tip
        const gsTip = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.08, 4), dkArmorDarkMat);
        gsTip.position.set(0.42, 1.82, 0);
        group.add(gsTip);
        // Armored legs
        for (const lx of [-0.13, 0.13]) {
          const cuisses = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.3, 6), dkArmorMat);
          cuisses.position.set(lx, 0.6, 0);
          group.add(cuisses);
          const kneeCop = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), dkArmorDarkMat);
          kneeCop.position.set(lx, 0.43, 0.03);
          group.add(kneeCop);
          const greaves = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.28, 6), dkArmorMat);
          greaves.position.set(lx, 0.27, 0);
          group.add(greaves);
          const sabaton = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.14), dkArmorDarkMat);
          sabaton.position.set(lx, 0.1, 0.02);
          group.add(sabaton);
        }
        // Green necromantic aura wisps
        for (let aw = 0; aw < 4; aw++) {
          const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 3), new THREE.MeshStandardMaterial({
            color: 0x44ffaa, emissive: 0x22cc88, emissiveIntensity: 1.0, transparent: true, opacity: 0.4
          }));
          const ang = (aw / 4) * Math.PI * 2;
          wisp.position.set(Math.sin(ang) * 0.5, 0.8 + aw * 0.3, Math.cos(ang) * 0.4);
          group.add(wisp);
        }
        break;
      }

      case EnemyType.NIGHT_VOLCANIC_INFERNO_TITAN: {
        const titanRock = new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 0.9 });
        const titanRockLight = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.85 });
        const titanLava = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.2 });
        const titanLavaBright = new THREE.MeshStandardMaterial({ color: 0xffaa22, emissive: 0xff6600, emissiveIntensity: 2.0 });
        const magmaMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 });
        // Massive torso (layered volcanic rock)
        const ttTorso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 0.75), titanRock);
        ttTorso.position.y = 1.85;
        ttTorso.castShadow = true;
        group.add(ttTorso);
        // Rock plate overlays
        for (let rp = 0; rp < 4; rp++) {
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.9 - rp * 0.1, 0.15, 0.78 - rp * 0.05), titanRockLight);
          plate.position.set(0, 1.3 + rp * 0.35, 0);
          plate.rotation.y = rp * 0.08;
          group.add(plate);
        }
        // Lava veins running through body
        for (let lv = 0; lv < 12; lv++) {
          const veinLen = 0.3 + Math.random() * 0.5;
          const vein = new THREE.Mesh(new THREE.BoxGeometry(0.025, veinLen, 0.025), titanLava);
          vein.position.set(
            (Math.random() - 0.5) * 0.8,
            1.2 + Math.random() * 1.2,
            (Math.random() - 0.5) * 0.5
          );
          vein.rotation.z = (Math.random() - 0.5) * 0.5;
          group.add(vein);
        }
        // Magma core visible in chest crack
        const coreCrack = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.04), titanLavaBright);
        coreCrack.position.set(0, 1.9, 0.38);
        group.add(coreCrack);
        const coreGlow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), magmaMat);
        coreGlow.position.set(0, 1.9, 0.35);
        group.add(coreGlow);
        // Head (craggy boulder with volcanic vents)
        const ttHead = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 1), titanRock);
        ttHead.position.y = 2.95;
        group.add(ttHead);
        // Volcanic vents on head (smoking)
        for (let vt = 0; vt < 3; vt++) {
          const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.08, 5), titanRockLight);
          const ang = (vt / 3) * Math.PI - Math.PI / 3;
          vent.position.set(Math.sin(ang) * 0.3, 3.2, Math.cos(ang) * 0.2);
          group.add(vent);
          // Smoke/ember from vent
          const ember = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 3), magmaMat);
          ember.position.set(Math.sin(ang) * 0.3, 3.3 + vt * 0.05, Math.cos(ang) * 0.2);
          group.add(ember);
        }
        // Molten lava mouth
        const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.06), titanLavaBright);
        mouth.position.set(0, 2.85, 0.4);
        group.add(mouth);
        // Lava drip from mouth
        const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.008, 0.12, 4), titanLava);
        drip.position.set(0.05, 2.78, 0.42);
        group.add(drip);
        // Lava eyes (intense)
        for (const ex of [-0.14, 0.14]) {
          const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
          eyeSocket.position.set(ex, 2.98, 0.35);
          eyeSocket.scale.z = 0.5;
          group.add(eyeSocket);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), titanLavaBright);
          eye.position.set(ex, 2.98, 0.38);
          group.add(eye);
        }
        // Shoulder boulders with lava seams
        for (const sx of [-0.7, 0.7]) {
          const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), titanRock);
          boulder.position.set(sx, 2.55, 0);
          group.add(boulder);
          const seam = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 3, 6), titanLava);
          seam.position.set(sx, 2.55, 0);
          seam.rotation.set(Math.random(), Math.random(), 0);
          group.add(seam);
        }
        // Arms (massive, rocky with lava joints)
        for (const ax of [-0.8, 0.8]) {
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.55, 6), titanRock);
          upperArm.position.set(ax, 2.1, 0);
          upperArm.rotation.z = ax < 0 ? 0.25 : -0.25;
          group.add(upperArm);
          // Elbow lava joint
          const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.14, 5, 4), titanLava);
          elbowJoint.position.set(ax * 1.15, 1.75, 0);
          group.add(elbowJoint);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 0.5, 6), titanRock);
          forearm.position.set(ax * 1.2, 1.4, 0);
          forearm.rotation.z = ax < 0 ? 0.15 : -0.15;
          group.add(forearm);
          // Massive fist
          const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), titanRock);
          fist.position.set(ax * 1.3, 1.05, 0);
          group.add(fist);
          // Lava knuckle cracks
          for (let k = 0; k < 2; k++) {
            const knuckCrack = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.02), titanLava);
            knuckCrack.position.set(ax * 1.3 + (k - 0.5) * 0.08, 1.1, 0.12);
            group.add(knuckCrack);
          }
        }
        // Legs (pillar-like with lava knee joints)
        for (const lx of [-0.3, 0.3]) {
          const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.45, 6), titanRock);
          upperLeg.position.set(lx, 0.9, 0);
          group.add(upperLeg);
          const knee = new THREE.Mesh(new THREE.SphereGeometry(0.15, 5, 4), titanLava);
          knee.position.set(lx, 0.65, 0.05);
          group.add(knee);
          const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.45, 6), titanRock);
          lowerLeg.position.set(lx, 0.35, 0);
          group.add(lowerLeg);
          // Massive foot
          const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.25), titanRockLight);
          foot.position.set(lx, 0.08, 0.05);
          group.add(foot);
        }
        // Ground lava pool around feet
        const lavaPool = new THREE.Mesh(new THREE.CircleGeometry(0.6, 10), new THREE.MeshStandardMaterial({
          color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.6, transparent: true, opacity: 0.4
        }));
        lavaPool.rotation.x = -Math.PI / 2;
        lavaPool.position.y = 0.02;
        group.add(lavaPool);
        // Floating ember particles
        for (let em = 0; em < 8; em++) {
          const ember = new THREE.Mesh(new THREE.SphereGeometry(0.015 + Math.random() * 0.015, 3, 3), titanLavaBright);
          ember.position.set(
            (Math.random() - 0.5) * 1.2,
            0.5 + Math.random() * 2.5,
            (Math.random() - 0.5) * 0.8
          );
          group.add(ember);
        }
        break;
      }

      case EnemyType.NIGHT_RIFT_VOID_EMPEROR: {
        const voidMat = new THREE.MeshStandardMaterial({ color: 0x110022, roughness: 0.3 });
        const voidDarkMat = new THREE.MeshStandardMaterial({ color: 0x080012, roughness: 0.2 });
        const voidGlow = new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822ff, emissiveIntensity: 2.0 });
        const voidGlowDim = new THREE.MeshStandardMaterial({ color: 0x7722cc, emissive: 0x5511aa, emissiveIntensity: 1.0, transparent: true, opacity: 0.6 });
        const riftMat = new THREE.MeshStandardMaterial({ color: 0xcc66ff, emissive: 0xaa44ff, emissiveIntensity: 1.5, transparent: true, opacity: 0.5 });
        // Rift tear portal beneath (ground effect)
        const riftPortal = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 4, 16), riftMat);
        riftPortal.rotation.x = Math.PI / 2;
        riftPortal.position.y = 0.1;
        group.add(riftPortal);
        const riftInner = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12), new THREE.MeshStandardMaterial({
          color: 0x220044, emissive: 0x110022, emissiveIntensity: 0.5, transparent: true, opacity: 0.4
        }));
        riftInner.rotation.x = -Math.PI / 2;
        riftInner.position.y = 0.08;
        group.add(riftInner);
        // Floating dark crystalline body (multi-layered)
        const veBodyOuter = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 1), voidMat);
        veBodyOuter.position.y = 1.55;
        veBodyOuter.castShadow = true;
        group.add(veBodyOuter);
        const veBodyInner = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), voidDarkMat);
        veBodyInner.position.y = 1.55;
        veBodyInner.rotation.y = Math.PI / 4;
        group.add(veBodyInner);
        // Void energy core
        const voidCore = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 7), voidGlow);
        voidCore.position.y = 1.55;
        group.add(voidCore);
        // Energy lines radiating from core
        for (let el = 0; el < 6; el++) {
          const ang = (el / 6) * Math.PI * 2;
          const line = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.003, 0.4, 3), voidGlowDim);
          line.position.set(Math.sin(ang) * 0.2, 1.55, Math.cos(ang) * 0.2);
          line.rotation.z = Math.sin(ang) * Math.PI / 2;
          line.rotation.x = Math.cos(ang) * Math.PI / 2;
          group.add(line);
        }
        // Crown of void energy (ornate rings)
        const crownOuter = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 6, 12), voidGlow);
        crownOuter.rotation.x = Math.PI / 2;
        crownOuter.position.y = 2.25;
        group.add(crownOuter);
        const crownInner = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 4, 10), voidGlowDim);
        crownInner.rotation.x = Math.PI / 2;
        crownInner.rotation.z = Math.PI / 6;
        crownInner.position.y = 2.22;
        group.add(crownInner);
        // Crown spires
        for (let cs = 0; cs < 6; cs++) {
          const ang = (cs / 6) * Math.PI * 2;
          const spire = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.15, 4), voidGlow);
          spire.position.set(Math.sin(ang) * 0.35, 2.35, Math.cos(ang) * 0.35);
          group.add(spire);
        }
        // Central all-seeing eye
        const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 7), voidDarkMat);
        eyeSocket.position.set(0, 1.75, 0.38);
        eyeSocket.scale.z = 0.5;
        group.add(eyeSocket);
        const veEye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 7), voidGlow);
        veEye.position.set(0, 1.75, 0.42);
        group.add(veEye);
        // Slit pupil
        const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: 0x000000 }));
        pupil.position.set(0, 1.75, 0.47);
        group.add(pupil);
        // Spectral arms (manifesting from void)
        for (const ax of [-0.5, 0.5]) {
          // Upper arm (dissolving into particles)
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.4, 5), voidMat);
          upperArm.position.set(ax, 1.55, 0.1);
          upperArm.rotation.z = ax < 0 ? 0.6 : -0.6;
          group.add(upperArm);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.35, 5), voidDarkMat);
          forearm.position.set(ax * 1.4, 1.3, 0.15);
          forearm.rotation.z = ax < 0 ? 0.8 : -0.8;
          group.add(forearm);
          // Void claw hand
          for (let f = 0; f < 3; f++) {
            const finger = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.12, 3), voidGlowDim);
            finger.position.set(ax * 1.6 + (f - 1) * 0.02, 1.1, 0.18);
            finger.rotation.x = 0.2;
            group.add(finger);
          }
          // Dissolving particles around arm
          for (let dp = 0; dp < 3; dp++) {
            const particle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), voidGlowDim);
            particle.position.set(
              ax * (1.2 + dp * 0.15),
              1.3 + (Math.random() - 0.5) * 0.3,
              0.1 + Math.random() * 0.1
            );
            particle.rotation.set(Math.random(), Math.random(), Math.random());
            group.add(particle);
          }
        }
        // Floating void orbs (with orbit trails)
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          const r = 0.65 + Math.sin(i * 1.5) * 0.1;
          const orb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), voidGlow);
          orb.position.set(Math.sin(ang) * r, 1.1 + Math.sin(ang * 2) * 0.35, Math.cos(ang) * r);
          group.add(orb);
          // Orbit trail
          const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.02, 0.12, 3), voidGlowDim);
          trail.position.set(Math.sin(ang) * (r - 0.1), orb.position.y + 0.08, Math.cos(ang) * (r - 0.1));
          group.add(trail);
        }
        // Void tendrils (thicker, more organic)
        for (let t = 0; t < 6; t++) {
          const ang = (t / 6) * Math.PI * 2;
          const tendril = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.008, 0.9, 5), voidMat);
          tendril.position.set(Math.sin(ang) * 0.35, 0.7, Math.cos(ang) * 0.35);
          tendril.rotation.z = Math.sin(ang) * 0.5;
          tendril.rotation.x = Math.cos(ang) * 0.3;
          group.add(tendril);
          // Tendril tip glow
          const tipGlow = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 3), voidGlowDim);
          tipGlow.position.set(Math.sin(ang) * 0.35, 0.25, Math.cos(ang) * 0.35);
          group.add(tipGlow);
        }
        // Void particle field
        for (let vp = 0; vp < 8; vp++) {
          const particle = new THREE.Mesh(new THREE.OctahedronGeometry(0.015, 0), new THREE.MeshStandardMaterial({
            color: 0x8844cc, emissive: 0x6622aa, emissiveIntensity: 0.8, transparent: true, opacity: 0.4
          }));
          particle.position.set(
            (Math.random() - 0.5) * 1.2,
            0.3 + Math.random() * 2.0,
            (Math.random() - 0.5) * 1.2
          );
          group.add(particle);
        }
        break;
      }

      case EnemyType.NIGHT_DRAGON_SHADOW_WYRM: {
        const shadowMat = new THREE.MeshStandardMaterial({ color: 0x0a0a15, roughness: 0.5 });
        const shadowDarkMat = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.6 });
        const scaleMat = new THREE.MeshStandardMaterial({ color: 0x121225, roughness: 0.4, metalness: 0.2 });
        const purpleGlow = new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622ff, emissiveIntensity: 1.5 });
        const purpleGlowDim = new THREE.MeshStandardMaterial({ color: 0x6633cc, emissive: 0x4411aa, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 });
        const clawMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.3, roughness: 0.3 });
        // Massive dragon body (rounded, muscular)
        const swBody = new THREE.Mesh(new THREE.SphereGeometry(0.65, 10, 8), shadowMat);
        swBody.scale.set(0.8, 0.6, 1.6);
        swBody.position.y = 1.2;
        swBody.castShadow = true;
        group.add(swBody);
        // Scale rows along body
        for (let sr = 0; sr < 5; sr++) {
          const scaleRow = new THREE.Mesh(new THREE.BoxGeometry(0.6 - sr * 0.05, 0.03, 0.15), scaleMat);
          scaleRow.position.set(0, 1.42, -0.5 + sr * 0.3);
          group.add(scaleRow);
        }
        // Dorsal spines along back
        for (let ds = 0; ds < 8; ds++) {
          const spine = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1 + Math.sin(ds * 0.5) * 0.04, 4), shadowDarkMat);
          spine.position.set(0, 1.5 + Math.sin(ds * 0.4) * 0.05, -0.6 + ds * 0.2);
          group.add(spine);
        }
        // Neck (segmented, muscular)
        for (let ns = 0; ns < 4; ns++) {
          const neckSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.18 - ns * 0.02, 0.2 - ns * 0.015, 0.2, 7), shadowMat);
          neckSeg.position.set(0, 1.55 + ns * 0.18, 0.7 + ns * 0.15);
          neckSeg.rotation.x = -0.45;
          group.add(neckSeg);
          // Neck scale ring
          const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.19 - ns * 0.02, 0.01, 3, 8), scaleMat);
          neckRing.rotation.x = Math.PI / 2;
          neckRing.position.set(0, 1.52 + ns * 0.18, 0.7 + ns * 0.15);
          group.add(neckRing);
        }
        // Head (draconic with horns)
        const swHead = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.25, 0.48), shadowMat);
        swHead.position.set(0, 2.25, 1.25);
        group.add(swHead);
        // Snout ridge
        const snoutRidge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.3), scaleMat);
        snoutRidge.position.set(0, 2.32, 1.3);
        group.add(snoutRidge);
        // Lower jaw
        const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.35), shadowDarkMat);
        lowerJaw.position.set(0, 2.14, 1.22);
        lowerJaw.rotation.x = 0.1;
        group.add(lowerJaw);
        // Fangs
        for (let f = 0; f < 4; f++) {
          const fang = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.08, 4), new THREE.MeshStandardMaterial({ color: 0xccccdd }));
          fang.position.set((f - 1.5) * 0.06, 2.14, 1.42);
          fang.rotation.x = Math.PI;
          group.add(fang);
        }
        // Dragon horns (swept back)
        for (const hx of [-0.15, 0.15]) {
          const hornBase = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.15, 5), scaleMat);
          hornBase.position.set(hx, 2.35, 1.1);
          hornBase.rotation.x = 0.6;
          hornBase.rotation.z = hx > 0 ? -0.2 : 0.2;
          group.add(hornBase);
          const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.2, 4), purpleGlowDim);
          hornTip.position.set(hx * 1.1, 2.38, 0.95);
          hornTip.rotation.x = 0.8;
          group.add(hornTip);
        }
        // Brow ridges
        for (const ex of [-0.1, 0.1]) {
          const brow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.08), shadowDarkMat);
          brow.position.set(ex, 2.32, 1.38);
          group.add(brow);
        }
        // Purple glowing eyes
        for (const ex of [-0.09, 0.09]) {
          const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.055, 4, 3), new THREE.MeshStandardMaterial({ color: 0x050505 }));
          eyeSocket.position.set(ex, 2.28, 1.42);
          eyeSocket.scale.z = 0.5;
          group.add(eyeSocket);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), purpleGlow);
          eye.position.set(ex, 2.28, 1.45);
          group.add(eye);
          // Slit pupil
          const slit = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.06, 0.01), new THREE.MeshStandardMaterial({ color: 0x000000 }));
          slit.position.set(ex, 2.28, 1.48);
          group.add(slit);
        }
        // Wings (multi-segment membrane)
        for (const wx of [-1, 1]) {
          // Wing arm bone
          const wingArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.8, 5), shadowMat);
          wingArm.position.set(wx * 0.6, 1.5, 0.2);
          wingArm.rotation.z = wx * 0.3;
          group.add(wingArm);
          // Wing forearm
          const wingFore = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.6, 5), shadowMat);
          wingFore.position.set(wx * 1.0, 1.45, -0.1);
          wingFore.rotation.z = wx * 0.5;
          group.add(wingFore);
          // Wing membrane panels
          const membrane1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.015, 0.5), shadowDarkMat);
          membrane1.position.set(wx * 0.6, 1.42, 0.1);
          membrane1.rotation.z = wx * 0.2;
          group.add(membrane1);
          const membrane2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.012, 0.4), shadowDarkMat);
          membrane2.position.set(wx * 1.0, 1.38, -0.1);
          membrane2.rotation.z = wx * 0.35;
          group.add(membrane2);
          // Wing finger bones
          for (let wf = 0; wf < 3; wf++) {
            const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.35, 3), scaleMat);
            finger.position.set(wx * (0.8 + wf * 0.15), 1.42, -0.2 + wf * 0.2);
            finger.rotation.z = wx * (0.3 + wf * 0.1);
            group.add(finger);
          }
          // Wing claw at joint
          const wingClaw = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 3), clawMat);
          wingClaw.position.set(wx * 0.45, 1.55, 0.5);
          wingClaw.rotation.z = wx * -0.5;
          group.add(wingClaw);
        }
        // Tail (segmented with spade tip)
        for (let ts = 0; ts < 6; ts++) {
          const tailSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1 - ts * 0.015, 0.12 - ts * 0.015, 0.25, 6), shadowMat);
          tailSeg.position.set(Math.sin(ts * 0.3) * 0.1, 1.0 - ts * 0.05, -0.8 - ts * 0.22);
          tailSeg.rotation.x = -0.2 + ts * 0.03;
          group.add(tailSeg);
        }
        // Tail spade
        const tailSpade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.2), shadowDarkMat);
        tailSpade.position.set(0, 0.7, -2.1);
        tailSpade.rotation.x = -0.3;
        group.add(tailSpade);
        // Tail spade point
        const spadePoint = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 4), shadowMat);
        spadePoint.position.set(0, 0.68, -2.25);
        spadePoint.rotation.x = Math.PI / 2;
        group.add(spadePoint);
        // Legs with claws
        for (let li = 0; li < 2; li++) {
          for (const side of [-1, 1]) {
            const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.35, 6), shadowMat);
            thigh.position.set(side * 0.35, 0.8, li * 1.0 - 0.3);
            group.add(thigh);
            const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.35, 6), shadowMat);
            shin.position.set(side * 0.35, 0.45, li * 1.0 - 0.3);
            group.add(shin);
            // Dragon claws (3 toes)
            for (let cl = 0; cl < 3; cl++) {
              const claw = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.08, 3), clawMat);
              claw.position.set(side * 0.35 + (cl - 1) * 0.04, 0.24, li * 1.0 - 0.26);
              claw.rotation.x = Math.PI * 0.9;
              group.add(claw);
            }
          }
        }
        // Shadow breath gathering in maw
        const breathCore = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), purpleGlow);
        breathCore.position.set(0, 2.18, 1.52);
        group.add(breathCore);
        const breathAura = new THREE.Mesh(new THREE.SphereGeometry(0.18, 5, 4), purpleGlowDim);
        breathAura.position.set(0, 2.18, 1.5);
        group.add(breathAura);
        // Shadow wisps around body
        for (let sw = 0; sw < 6; sw++) {
          const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.03, 3, 3), purpleGlowDim);
          wisp.position.set(
            (Math.random() - 0.5) * 1.5,
            0.8 + Math.random() * 1.0,
            (Math.random() - 0.5) * 1.5
          );
          group.add(wisp);
        }
        break;
      }

      case EnemyType.NIGHT_DESERT_SANDSTORM_DJINN: {
        const djinnMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, transparent: true, opacity: 0.65, roughness: 0.3 });
        const djinnDarkMat = new THREE.MeshStandardMaterial({ color: 0xaa8822, transparent: true, opacity: 0.5, roughness: 0.2 });
        const djinnGlow = new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xffcc00, emissiveIntensity: 1.5 });
        const djinnGlowDim = new THREE.MeshStandardMaterial({ color: 0xddbb22, emissive: 0xccaa00, emissiveIntensity: 0.8, transparent: true, opacity: 0.5 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.2, emissive: 0xaa8800, emissiveIntensity: 0.3 });
        const gemMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xcc0000, emissiveIntensity: 0.8 });
        // Sandstorm vortex base (multiple spinning rings)
        for (let vr = 0; vr < 6; vr++) {
          const vortexRing = new THREE.Mesh(new THREE.TorusGeometry(0.35 + vr * 0.08, 0.025, 4, 12), djinnDarkMat);
          vortexRing.rotation.x = Math.PI / 2;
          vortexRing.rotation.z = vr * 0.5;
          vortexRing.position.y = 0.1 + vr * 0.1;
          group.add(vortexRing);
        }
        // Swirling sand tornado body (layered cones)
        const djBodyOuter = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 10), djinnDarkMat);
        djBodyOuter.position.y = 0.6;
        group.add(djBodyOuter);
        const djBodyInner = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.2, 10), djinnMat);
        djBodyInner.position.y = 0.65;
        djBodyInner.castShadow = true;
        group.add(djBodyInner);
        // Sand streams spiraling up
        for (let ss = 0; ss < 12; ss++) {
          const ang = (ss / 12) * Math.PI * 2;
          const r = 0.25 + ss * 0.04;
          const stream = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), djinnMat);
          stream.position.set(Math.sin(ang) * r, 0.2 + ss * 0.13, Math.cos(ang) * r);
          stream.scale.set(1.5, 0.5, 1.5);
          group.add(stream);
        }
        // Upper body (muscular, semi-transparent)
        const djTorso = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 7), djinnMat);
        djTorso.scale.set(1, 1.1, 0.85);
        djTorso.position.y = 1.52;
        group.add(djTorso);
        // Golden chest harness
        const harness = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 4, 8), goldMat);
        harness.rotation.x = Math.PI / 2;
        harness.position.y = 1.55;
        group.add(harness);
        // Cross straps
        for (const sx of [-1, 1]) {
          const strap = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.4, 0.015), goldMat);
          strap.position.set(sx * 0.08, 1.55, 0.15);
          strap.rotation.z = sx * 0.2;
          group.add(strap);
        }
        // Central amulet gem
        const amulet = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), gemMat);
        amulet.position.set(0, 1.52, 0.22);
        group.add(amulet);
        // Muscular arms (semi-transparent with golden bracers)
        for (const ax of [-0.35, 0.35]) {
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 6), djinnMat);
          upperArm.position.set(ax, 1.42, 0.05);
          upperArm.rotation.z = ax < 0 ? 0.35 : -0.35;
          group.add(upperArm);
          // Golden armband
          const armband = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 3, 8), goldMat);
          armband.rotation.x = Math.PI / 2;
          armband.position.set(ax * 1.05, 1.45, 0.05);
          group.add(armband);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.28, 6), djinnMat);
          forearm.position.set(ax * 1.2, 1.22, 0.1);
          forearm.rotation.z = ax < 0 ? 0.5 : -0.5;
          group.add(forearm);
          // Golden bracer
          const bracer = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.08, 6), goldMat);
          bracer.position.set(ax * 1.15, 1.28, 0.08);
          group.add(bracer);
          // Hands with pointed fingers
          for (let f = 0; f < 4; f++) {
            const finger = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.08, 3), djinnMat);
            finger.position.set(ax * 1.35 + (f - 1.5) * 0.015, 1.08, 0.12);
            finger.rotation.x = 0.2;
            group.add(finger);
          }
        }
        // Head (regal, with turban-like crown)
        const djHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 7), djinnMat);
        djHead.position.y = 1.92;
        group.add(djHead);
        // Ornate turban/crown
        const turbanBase = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), djinnDarkMat);
        turbanBase.scale.y = 0.6;
        turbanBase.position.y = 2.02;
        group.add(turbanBase);
        // Turban jewel
        const turbanJewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), gemMat);
        turbanJewel.position.set(0, 2.02, 0.18);
        group.add(turbanJewel);
        // Turban feather/plume
        const plume = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.15, 4), djinnGlow);
        plume.position.set(0, 2.15, 0.12);
        group.add(plume);
        // Pointed beard
        const beard = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 4), djinnDarkMat);
        beard.position.set(0, 1.78, 0.12);
        beard.rotation.x = 0.2;
        group.add(beard);
        // Glowing eyes (intense golden)
        for (const ex of [-0.065, 0.065]) {
          const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 3), djinnGlowDim);
          eyeGlow.position.set(ex, 1.95, 0.14);
          group.add(eyeGlow);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), djinnGlow);
          eye.position.set(ex, 1.95, 0.16);
          group.add(eye);
        }
        // Floating golden relics orbiting
        for (let rl = 0; rl < 4; rl++) {
          const ang = (rl / 4) * Math.PI * 2;
          const relic = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), goldMat);
          relic.position.set(Math.sin(ang) * 0.6, 1.3 + Math.sin(ang * 2) * 0.3, Math.cos(ang) * 0.6);
          relic.rotation.set(ang, ang * 0.5, 0);
          group.add(relic);
        }
        // Sand debris cloud
        for (let sd = 0; sd < 8; sd++) {
          const debris = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.03), new THREE.MeshStandardMaterial({
            color: 0xc8a870, transparent: true, opacity: 0.3
          }));
          debris.position.set(
            (Math.random() - 0.5) * 0.8,
            0.2 + Math.random() * 1.0,
            (Math.random() - 0.5) * 0.8
          );
          debris.rotation.set(Math.random(), Math.random(), Math.random());
          group.add(debris);
        }
        break;
      }

      case EnemyType.NIGHT_GRASSLAND_STAMPEDE_KING: {
        const skMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.7 });
        const skDarkMat = new THREE.MeshStandardMaterial({ color: 0x2a1510, roughness: 0.8 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 0.8, metalness: 0.6 });
        const goldDarkMat = new THREE.MeshStandardMaterial({ color: 0xccaa00, metalness: 0.5, roughness: 0.4 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xb08060, roughness: 0.6 });
        const hoofMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
        const furMat = new THREE.MeshStandardMaterial({ color: 0x3a2515, roughness: 0.9 });
        const gemMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xcc0000, emissiveIntensity: 1.0 });
        // Massive beast body (muscular)
        const skBody = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), skMat);
        skBody.scale.set(0.85, 0.6, 1.4);
        skBody.position.y = 0.92;
        skBody.castShadow = true;
        group.add(skBody);
        // Barrel sides
        for (const sx of [-1, 1]) {
          const barrel = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), skMat);
          barrel.scale.set(0.5, 0.55, 1.1);
          barrel.position.set(sx * 0.32, 0.82, 0);
          group.add(barrel);
        }
        // Golden battle armor on beast body
        const bodyArmor = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 1.2), goldDarkMat);
        bodyArmor.position.set(0, 1.15, 0);
        group.add(bodyArmor);
        // Armor trim
        for (const sx of [-0.44, 0.44]) {
          const trim = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 1.25), goldMat);
          trim.position.set(sx, 1.14, 0);
          group.add(trim);
        }
        // Armor chain links (decorative)
        for (let ch = 0; ch < 4; ch++) {
          const chain = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 3, 6), goldMat);
          chain.position.set(0.35, 1.08, -0.3 + ch * 0.25);
          chain.rotation.y = Math.PI / 2;
          group.add(chain);
        }
        // Muscular transition / human torso
        const skTorso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.32), goldMat);
        skTorso.position.set(0, 1.72, 0.35);
        group.add(skTorso);
        // Chest muscle definition
        for (const cx of [-0.1, 0.1]) {
          const pec = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), goldDarkMat);
          pec.scale.set(1.2, 0.8, 0.5);
          pec.position.set(cx, 1.78, 0.5);
          group.add(pec);
        }
        // Belly plate
        const bellyPlate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.04), goldDarkMat);
        bellyPlate.position.set(0, 1.5, 0.5);
        group.add(bellyPlate);
        // Massive shoulder pauldrons
        for (const sx of [-0.35, 0.35]) {
          const padBase = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), goldMat);
          padBase.scale.set(1.3, 0.7, 1.1);
          padBase.position.set(sx, 2.05, 0.35);
          group.add(padBase);
          // Pauldron spikes (3 each)
          for (let sp = 0; sp < 3; sp++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1, 4), goldMat);
            spike.position.set(sx * (1.1 + sp * 0.05), 2.1 + sp * 0.03, 0.35 + (sp - 1) * 0.06);
            spike.rotation.z = sx > 0 ? -0.5 - sp * 0.1 : 0.5 + sp * 0.1;
            group.add(spike);
          }
          // Pauldron gem
          const padGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), gemMat);
          padGem.position.set(sx * 0.95, 2.05, 0.45);
          group.add(padGem);
        }
        // Arms
        for (const ax of [-0.35, 0.35]) {
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.28, 6), skinMat);
          upperArm.position.set(ax, 1.82, 0.35);
          upperArm.rotation.z = ax < 0 ? 0.2 : -0.2;
          group.add(upperArm);
          // Golden bracer
          const bracer = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.08, 6), goldMat);
          bracer.position.set(ax * 1.05, 1.72, 0.35);
          group.add(bracer);
          const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.25, 6), skinMat);
          forearm.position.set(ax * 1.1, 1.58, 0.35);
          group.add(forearm);
          // Gauntlet
          const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), goldDarkMat);
          gauntlet.position.set(ax * 1.15, 1.42, 0.35);
          group.add(gauntlet);
        }
        // Head (fierce, bull-like with crown)
        const skHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 7), skMat);
        skHead.scale.set(1, 0.95, 0.95);
        skHead.position.set(0, 2.22, 0.35);
        group.add(skHead);
        // Bull muzzle
        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), skMat);
        muzzle.scale.set(1.1, 0.7, 1);
        muzzle.position.set(0, 2.15, 0.52);
        group.add(muzzle);
        // Nostrils (flared with steam)
        for (const nx of [-0.04, 0.04]) {
          const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.02, 3, 3), new THREE.MeshStandardMaterial({ color: 0x331111 }));
          nostril.position.set(nx, 2.14, 0.6);
          group.add(nostril);
          // Steam
          const steam = new THREE.Mesh(new THREE.SphereGeometry(0.015, 3, 3), new THREE.MeshStandardMaterial({
            color: 0xcccccc, transparent: true, opacity: 0.2
          }));
          steam.position.set(nx, 2.12, 0.65);
          group.add(steam);
        }
        // Massive bull horns
        for (const hx of [-0.18, 0.18]) {
          const hornBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x666644 }));
          hornBase.position.set(hx, 2.32, 0.3);
          hornBase.rotation.z = hx > 0 ? -0.5 : 0.5;
          group.add(hornBase);
          const hornMid = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.15, 5), new THREE.MeshStandardMaterial({ color: 0x777755 }));
          hornMid.position.set(hx * 1.5, 2.36, 0.28);
          hornMid.rotation.z = hx > 0 ? -0.9 : 0.9;
          group.add(hornMid);
          const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 4), goldMat);
          hornTip.position.set(hx * 1.8, 2.38, 0.3);
          hornTip.rotation.z = hx > 0 ? -1.2 : 1.2;
          group.add(hornTip);
        }
        // Grand golden crown
        const skCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 0.12, 8), goldMat);
        skCrown.position.set(0, 2.38, 0.35);
        group.add(skCrown);
        // Crown filigree band
        const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 3, 10), goldMat);
        crownBand.rotation.x = Math.PI / 2;
        crownBand.position.set(0, 2.35, 0.35);
        group.add(crownBand);
        // Crown spires with gems
        for (let i = 0; i < 7; i++) {
          const ang = (i / 7) * Math.PI * 2;
          const isMain = i % 2 === 0;
          const spike = new THREE.Mesh(new THREE.ConeGeometry(isMain ? 0.022 : 0.015, isMain ? 0.12 : 0.08, 4), goldMat);
          spike.position.set(Math.sin(ang) * 0.15, 2.47, 0.35 + Math.cos(ang) * 0.15);
          group.add(spike);
          if (isMain) {
            const gem = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 3), gemMat);
            gem.position.set(Math.sin(ang) * 0.15, 2.44, 0.35 + Math.cos(ang) * 0.15);
            group.add(gem);
          }
        }
        // Fierce glowing eyes
        const skEyeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 2.0 });
        for (const ex of [-0.065, 0.065]) {
          const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 3), new THREE.MeshStandardMaterial({
            color: 0xff6622, emissive: 0xff3300, emissiveIntensity: 1.0, transparent: true, opacity: 0.5
          }));
          eyeGlow.position.set(ex, 2.24, 0.48);
          group.add(eyeGlow);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 4), skEyeMat);
          eye.position.set(ex, 2.24, 0.5);
          group.add(eye);
        }
        // Beard (braided)
        const beardMain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.15, 4), skDarkMat);
        beardMain.position.set(0, 2.05, 0.48);
        beardMain.rotation.x = 0.2;
        group.add(beardMain);
        // Beard bead
        const beardBead = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 3), goldMat);
        beardBead.position.set(0, 1.97, 0.5);
        group.add(beardBead);
        // War hammer (massive, ornate)
        const hamShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 1.4, 6), new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 }));
        hamShaft.position.set(0.48, 1.55, 0.35);
        group.add(hamShaft);
        // Shaft grip wraps
        for (let gw = 0; gw < 4; gw++) {
          const grip = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.006, 3, 6), new THREE.MeshStandardMaterial({ color: 0x553311 }));
          grip.rotation.x = Math.PI / 2;
          grip.position.set(0.48, 1.0 + gw * 0.1, 0.35);
          group.add(grip);
        }
        // Massive hammer head
        const hamHead = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.18), goldMat);
        hamHead.position.set(0.48, 2.25, 0.35);
        group.add(hamHead);
        // Hammer face detail (impact surface)
        for (const fz of [-0.1, 0.1]) {
          const face = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.02), goldDarkMat);
          face.position.set(0.48, 2.25, 0.35 + fz);
          group.add(face);
        }
        // Hammer rune glow
        const hamRune = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.2), new THREE.MeshStandardMaterial({
          color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.8, transparent: true, opacity: 0.5
        }));
        hamRune.position.set(0.48, 2.25, 0.35);
        group.add(hamRune);
        // Hammer pommel
        const hamPommel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), goldMat);
        hamPommel.position.set(0.48, 0.82, 0.35);
        group.add(hamPommel);
        // Beast legs (powerful, muscular with hooves)
        for (let i = 0; i < 2; i++) {
          for (const side of [-1, 1]) {
            const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.28, 6), skMat);
            thigh.position.set(side * 0.36, 0.6, i * 1.02 - 0.3);
            group.add(thigh);
            const knee = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), skDarkMat);
            knee.position.set(side * 0.36, 0.44, i * 1.02 - 0.3);
            group.add(knee);
            const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.25, 6), skMat);
            shin.position.set(side * 0.36, 0.28, i * 1.02 - 0.3);
            group.add(shin);
            // Fetlock fur tuft
            const fetlock = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 3), furMat);
            fetlock.scale.y = 1.3;
            fetlock.position.set(side * 0.36, 0.14, i * 1.02 - 0.3);
            group.add(fetlock);
            // Golden hoof
            const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 6), hoofMat);
            hoof.position.set(side * 0.36, 0.04, i * 1.02 - 0.3);
            group.add(hoof);
            // Golden hoof band
            const hoofBand = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.008, 3, 6), goldMat);
            hoofBand.rotation.x = Math.PI / 2;
            hoofBand.position.set(side * 0.36, 0.08, i * 1.02 - 0.3);
            group.add(hoofBand);
          }
        }
        // Flowing tail with golden ring
        const tailBase = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.35, 5), skDarkMat);
        tailBase.position.set(0, 0.78, -0.7);
        tailBase.rotation.x = 0.5;
        group.add(tailBase);
        const tailRing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 3, 6), goldMat);
        tailRing.position.set(0, 0.65, -0.8);
        group.add(tailRing);
        for (let tt = 0; tt < 5; tt++) {
          const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.2, 3), skDarkMat);
          strand.position.set((tt - 2) * 0.015, 0.5, -0.88);
          strand.rotation.x = 0.3 + tt * 0.04;
          group.add(strand);
        }
        // Dust cloud at hooves
        for (let dc = 0; dc < 6; dc++) {
          const dust = new THREE.Mesh(new THREE.SphereGeometry(0.04, 3, 3), new THREE.MeshStandardMaterial({
            color: 0x998866, transparent: true, opacity: 0.2
          }));
          dust.position.set(
            (Math.random() - 0.5) * 0.8,
            0.05,
            (Math.random() - 0.5) * 1.2
          );
          dust.scale.y = 0.4;
          group.add(dust);
        }
        break;
      }
    }

    group.scale.setScalar(scale);

    // Boss ring
    const def = ENEMY_DEFS[type];
    if (def.isBoss) {
      const ringGeo = new THREE.TorusGeometry(1.2 * scale, 0.05, 8, 24);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xff4400,
        emissive: 0xff2200,
        emissiveIntensity: 1.5,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      group.add(ring);
    }

    return group;
  }

  private _createLootBeam(rarity: ItemRarity): THREE.Group {
    const group = new THREE.Group();
    const color = RARITY_COLORS[rarity];

    // Floating octahedron
    const octGeo = new THREE.OctahedronGeometry(0.2, 0);
    const octMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.6,
      metalness: 0.4,
      roughness: 0.3,
    });
    const oct = new THREE.Mesh(octGeo, octMat);
    oct.position.y = 0.5;
    oct.castShadow = true;
    group.add(oct);

    // Legendary+ get light beam
    if (
      rarity === ItemRarity.LEGENDARY ||
      rarity === ItemRarity.MYTHIC ||
      rarity === ItemRarity.DIVINE
    ) {
      const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, 8, 6);
      const beamMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.4,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 4.5;
      group.add(beam);
    }

    return group;
  }

  private _createChest(rarity: ItemRarity, opened: boolean): THREE.Group {
    const group = new THREE.Group();
    const rarityColor = RARITY_COLORS[rarity];

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6B3A1F, roughness: 0.8, metalness: 0.05 });
    const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x4A2810, roughness: 0.85 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 });
    const goldMat = new THREE.MeshStandardMaterial({ color: rarityColor, metalness: 0.6, roughness: 0.25 });
    const hingeMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.2 });

    // Wooden base body
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.65), woodMat);
    base.position.y = 0.25;
    base.castShadow = true;
    group.add(base);

    // Darker bottom trim
    const bottomTrim = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.08, 0.69), woodDarkMat);
    bottomTrim.position.y = 0.04;
    group.add(bottomTrim);

    // Wooden planks (horizontal lines on front/back)
    for (let i = 0; i < 3; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.01, 0.015, 0.01), woodDarkMat);
      plank.position.set(0, 0.12 + i * 0.14, 0.326);
      group.add(plank);
      const plankB = new THREE.Mesh(new THREE.BoxGeometry(1.01, 0.015, 0.01), woodDarkMat);
      plankB.position.set(0, 0.12 + i * 0.14, -0.326);
      group.add(plankB);
    }

    // Metal corner brackets (4 bottom corners)
    for (let sx = -1; sx <= 1; sx += 2) {
      for (let sz = -1; sz <= 1; sz += 2) {
        const corner = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), metalMat);
        corner.position.set(sx * 0.47, 0.1, sz * 0.29);
        group.add(corner);
      }
    }

    // Metal bands across front and back
    const band1 = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.06, 0.015), metalMat);
    band1.position.set(0, 0.3, 0.33);
    group.add(band1);
    const band2 = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.06, 0.015), metalMat);
    band2.position.set(0, 0.3, -0.33);
    group.add(band2);
    // Side bands
    const bandL = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.68), metalMat);
    bandL.position.set(-0.505, 0.3, 0);
    group.add(bandL);
    const bandR = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.68), metalMat);
    bandR.position.set(0.505, 0.3, 0);
    group.add(bandR);

    // Half-cylinder lid (arched top)
    const lidGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.02, 12, 1, false, 0, Math.PI);
    const lid = new THREE.Mesh(lidGeo, woodMat);
    lid.rotation.z = Math.PI / 2;
    lid.position.y = 0.5;

    if (opened) {
      lid.rotation.x = -Math.PI * 0.6;
      lid.position.z = -0.28;
      lid.position.y = 0.7;
    }
    lid.castShadow = true;
    group.add(lid);

    // Lid metal band
    const lidBand = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.04, 0.015), metalMat);
    if (opened) {
      lidBand.position.set(0, 0.75, -0.35);
      lidBand.rotation.x = -Math.PI * 0.6;
    } else {
      lidBand.position.set(0, 0.63, 0.33);
    }
    group.add(lidBand);

    // Hinges on back
    for (let hx = -0.3; hx <= 0.3; hx += 0.6) {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 6), hingeMat);
      hinge.rotation.x = Math.PI / 2;
      hinge.position.set(hx, 0.5, -0.34);
      group.add(hinge);
    }

    // Front lock plate (rarity-colored)
    const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.04), goldMat);
    lockPlate.position.set(0, 0.42, 0.34);
    group.add(lockPlate);
    // Keyhole
    const keyhole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    keyhole.rotation.x = Math.PI / 2;
    keyhole.position.set(0, 0.41, 0.36);
    group.add(keyhole);

    // Rarity-colored gem on front center
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), new THREE.MeshStandardMaterial({ color: rarityColor, emissive: rarityColor, emissiveIntensity: 0.4 }));
    gem.position.set(0, 0.46, 0.36);
    group.add(gem);

    // Interior glow when opened
    if (opened) {
      const glow = new THREE.PointLight(rarityColor, 0.8, 3);
      glow.position.set(0, 0.4, 0);
      group.add(glow);
    }

    return group;
  }

  private _seededRandom(): number {
    this._rngSeed = (this._rngSeed + 0x6D2B79F5) | 0;
    let t = Math.imul(this._rngSeed ^ (this._rngSeed >>> 15), 1 | this._rngSeed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  spawnParticles(type: ParticleType, x: number, y: number, z: number, count: number, particles: DiabloParticle[]): void {
    for (let i = 0; i < count; i++) {
      if (particles.length >= this._particlePoolSize) return;
      const p = this._createParticle(type, x, y, z);
      particles.push(p);
    }
  }

  private _createParticle(type: ParticleType, x: number, y: number, z: number): DiabloParticle {
    let vx = 0, vy = 0, vz = 0;
    let color = 0xffffff;
    let size = 0.1;
    let life = 0.5;

    const rr = () => Math.random();
    const spread = () => (rr() - 0.5) * 2;

    switch (type) {
      case ParticleType.BLOOD:
        color = 0x880000 + Math.floor(rr() * 0x440000);
        vx = spread() * 3; vy = rr() * 2 + 1; vz = spread() * 3;
        size = 0.08 + rr() * 0.07;
        life = 0.4;
        break;
      case ParticleType.SPARK:
        color = 0xffff44 + Math.floor(rr() * 0x0000bb);
        vx = spread() * 6; vy = rr() * 4 + 2; vz = spread() * 6;
        size = 0.06 + rr() * 0.06;
        life = 0.3;
        break;
      case ParticleType.FIRE:
        color = 0xff4400 + Math.floor(rr() * 0x004400);
        vx = spread() * 1.5; vy = rr() * 3 + 2; vz = spread() * 1.5;
        size = 0.1 + rr() * 0.1;
        life = 0.6;
        break;
      case ParticleType.ICE:
        color = 0x88ccff + Math.floor(rr() * 0x773300);
        vx = spread() * 4; vy = rr() * 3 + 1; vz = spread() * 4;
        size = 0.08 + rr() * 0.08;
        life = 0.5;
        break;
      case ParticleType.POISON:
        color = 0x44ff00 + Math.floor(rr() * 0x440044);
        vx = spread() * 1.5; vy = -rr() * 1.5; vz = spread() * 1.5;
        size = 0.08 + rr() * 0.06;
        life = 0.5;
        break;
      case ParticleType.DUST:
        color = 0x886644 + Math.floor(rr() * 0x222222);
        vx = spread() * 3; vy = rr() * 2 + 0.5; vz = spread() * 3;
        size = 0.1 + rr() * 0.12;
        life = 0.8;
        break;
      case ParticleType.GOLD:
        color = 0xffd700 - Math.floor(rr() * 0x002d00);
        vx = spread() * 2; vy = rr() * 4 + 2; vz = spread() * 2;
        size = 0.06 + rr() * 0.06;
        life = 0.5;
        break;
      case ParticleType.HEAL:
        color = 0x44ff44 + Math.floor(rr() * 0x440044);
        vx = spread() * 1; vy = rr() * 3 + 2; vz = spread() * 1;
        size = 0.07 + rr() * 0.05;
        life = 0.6;
        break;
      case ParticleType.LIGHTNING:
        color = 0xffff88 + Math.floor(rr() * 0x000077);
        vx = spread() * 8; vy = rr() * 5 + 3; vz = spread() * 8;
        size = 0.05 + rr() * 0.05;
        life = 0.2;
        break;
      case ParticleType.LEVEL_UP:
        color = 0xffd700 + Math.floor(rr() * 0x002800);
        const ang = rr() * Math.PI * 2;
        const rad = rr() * 2 + 1;
        vx = Math.cos(ang) * rad; vy = rr() * 6 + 4; vz = Math.sin(ang) * rad;
        size = 0.1 + rr() * 0.1;
        life = 1.0;
        break;
    }

    return {
      x, y: y + rr() * 0.3, z,
      vx, vy, vz,
      color, size, life, maxLife: life, type,
    };
  }

  private _updateParticles(particles: DiabloParticle[], dt: number): void {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      if (p.type === ParticleType.BLOOD || p.type === ParticleType.POISON || p.type === ParticleType.DUST) {
        p.vy -= 6 * dt;
      } else if (p.type === ParticleType.FIRE || p.type === ParticleType.HEAL || p.type === ParticleType.LEVEL_UP) {
        p.vy -= 1.5 * dt;
      } else {
        p.vy -= 3 * dt;
      }

      p.vx *= (1 - 2 * dt);
      p.vz *= (1 - 2 * dt);
    }
  }

  private _renderParticles(particles: DiabloParticle[]): void {
    let poolIdx = 0;
    for (let i = 0; i < particles.length && poolIdx < this._particlePoolSize; i++) {
      const p = particles[i];
      const mesh = this._particleMeshPool[poolIdx];
      mesh.visible = true;
      mesh.position.set(p.x, Math.max(0.05, p.y), p.z);
      mesh.scale.setScalar(p.size);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(p.color);
      mat.emissive.setHex(p.color);
      const lifeFrac = p.life / p.maxLife;
      mat.opacity = lifeFrac;
      mat.emissiveIntensity = lifeFrac * 1.5;
      poolIdx++;
    }
    for (let i = poolIdx; i < this._particlePoolSize; i++) {
      this._particleMeshPool[i].visible = false;
    }
  }

  shakeCamera(intensity: number, duration: number): void {
    this._shakeIntensity = intensity;
    this._shakeDuration = duration;
    this._shakeTimer = 0;
  }

  private _updateShake(dt: number): void {
    if (this._shakeDuration <= 0) {
      this._shakeOffsetX = 0;
      this._shakeOffsetY = 0;
      this._shakeOffsetZ = 0;
      return;
    }
    this._shakeTimer += dt;
    if (this._shakeTimer >= this._shakeDuration) {
      this._shakeDuration = 0;
      this._shakeOffsetX = 0;
      this._shakeOffsetY = 0;
      this._shakeOffsetZ = 0;
      return;
    }
    const decay = 1 - this._shakeTimer / this._shakeDuration;
    const mag = this._shakeIntensity * decay;
    this._shakeOffsetX = (Math.random() - 0.5) * 2 * mag;
    this._shakeOffsetY = (Math.random() - 0.5) * 2 * mag;
    this._shakeOffsetZ = (Math.random() - 0.5) * 2 * mag;
  }

  applyWeather(weather: Weather): void {
    this._currentWeather = weather;
    if (!this._scene.fog) return;
    const fog = this._scene.fog as THREE.FogExp2;
    this._baseFogDensity = fog.density;
    this._baseAmbientIntensity = this._ambientLight.intensity;
    this._baseDirIntensity = this._dirLight.intensity;

    switch (weather) {
      case Weather.FOGGY:
        fog.density = this._baseFogDensity * 2;
        break;
      case Weather.CLEAR:
        fog.density = this._baseFogDensity * 0.5;
        this._dirLight.intensity = this._baseDirIntensity * 1.2;
        break;
      case Weather.STORMY:
        this._ambientLight.intensity = this._baseAmbientIntensity * 0.6;
        this._dirLight.intensity = this._baseDirIntensity * 0.7;
        this._stormFlashTimer = 5 + Math.random() * 10;
        break;
      case Weather.NORMAL:
        break;
    }
  }

  private _updateWeather(dt: number): void {
    if (this._currentWeather !== Weather.STORMY) return;
    this._stormFlashTimer -= dt;
    if (this._stormFlashTimer <= 0) {
      if (!this._stormFlashActive) {
        this._stormFlashActive = true;
        this._ambientLight.intensity = this._baseAmbientIntensity * 3;
        this._stormFlashTimer = 0.1;
      } else {
        this._stormFlashActive = false;
        this._ambientLight.intensity = this._baseAmbientIntensity * 0.6;
        this._stormFlashTimer = 5 + Math.random() * 10;
      }
    }
  }

  update(state: DiabloState, dt: number): void {
    if (state.phase !== DiabloPhase.PLAYING) {
      return;
    }

    this._time += dt;

    this._updateShake(dt);
    this._updateWeather(dt);
    this._updateParticles(state.particles, dt);
    this._renderParticles(state.particles);

    // -- Camera --
    if (this.firstPerson) {
      // FPS camera: at player eye height, looking in facing direction
      if (this._camera.fov !== 75) {
        this._camera.fov = 75;
        this._camera.updateProjectionMatrix();
      }
      const eyeH = 1.6;
      const camX = state.player.x + this._shakeOffsetX;
      const camY = state.player.y + eyeH + this._shakeOffsetY;
      const camZ = state.player.z + this._shakeOffsetZ;
      this._camera.position.set(camX, camY, camZ);

      const lookX = camX - Math.sin(this.fpYaw) * Math.cos(this.fpPitch);
      const lookY = camY + Math.sin(this.fpPitch);
      const lookZ = camZ - Math.cos(this.fpYaw) * Math.cos(this.fpPitch);
      this._camera.lookAt(lookX, lookY, lookZ);

      // Hide player mesh in FPS, show FP weapon
      this._playerGroup.visible = false;
      this._buildFPWeaponIfNeeded();
      if (this._fpWeapon) this._fpWeapon.visible = true;
      // Hide aim line in FPS
      if (this._aimLine) this._aimLine.visible = false;
    } else {
      // Isometric camera
      if (this._camera.fov !== 50) {
        this._camera.fov = 50;
        this._camera.updateProjectionMatrix();
      }
      const camTargetX = state.player.x + 12 + this._shakeOffsetX;
      const camTargetY = 18 + this._shakeOffsetY;
      const camTargetZ = state.player.z + 12 + this._shakeOffsetZ;
      const lerpSpeed = 3.0 * dt;
      this._camera.position.x += (camTargetX - this._camera.position.x) * Math.min(lerpSpeed, 1);
      this._camera.position.y += (camTargetY - this._camera.position.y) * Math.min(lerpSpeed, 1);
      this._camera.position.z += (camTargetZ - this._camera.position.z) * Math.min(lerpSpeed, 1);
      this._camera.lookAt(state.player.x, 0, state.player.z);

      // Show player mesh, hide FP weapon
      this._playerGroup.visible = true;
      if (this._fpWeapon) this._fpWeapon.visible = false;
      if (this._aimLine) this._aimLine.visible = true;
    }

    // -- Player --
    this._playerGroup.position.set(state.player.x, state.player.y, state.player.z);
    this._playerGroup.rotation.y = state.player.angle;

    // Invulnerability glow
    if (state.player.invulnTimer > 0) {
      if (!this._invulnMesh) {
        const iGeo = new THREE.SphereGeometry(1.5, 16, 12);
        const iMat = new THREE.MeshStandardMaterial({
          color: 0xffd700,
          emissive: 0xffa500,
          emissiveIntensity: 1.5,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        this._invulnMesh = new THREE.Mesh(iGeo, iMat);
        this._scene.add(this._invulnMesh);
      }
      this._invulnMesh.position.set(state.player.x, state.player.y + 1, state.player.z);
      const iPulse = 0.3 + Math.sin(this._time * 8) * 0.1;
      if (this._invulnMesh.material instanceof THREE.MeshStandardMaterial) {
        this._invulnMesh.material.opacity = iPulse;
      }
      this._invulnMesh.visible = true;
    } else if (this._invulnMesh) {
      this._invulnMesh.visible = false;
    }

    // Walk animation — swing legs and off-hand arm based on movement
    const pdx = state.player.x - this._prevPlayerX;
    const pdz = state.player.z - this._prevPlayerZ;
    const playerSpeed = Math.sqrt(pdx * pdx + pdz * pdz) / Math.max(dt, 0.001);
    this._prevPlayerX = state.player.x;
    this._prevPlayerZ = state.player.z;

    if (playerSpeed > 0.3) {
      this._walkCycle += dt * playerSpeed * 1.8;
      const swing = Math.sin(this._walkCycle) * 0.45;
      const bounce = Math.abs(Math.sin(this._walkCycle * 2)) * 0.03;
      if (this._leftLegGroup) this._leftLegGroup.rotation.x = swing;
      if (this._rightLegGroup) this._rightLegGroup.rotation.x = -swing;
      if (this._leftArmGroup && !state.player.isAttacking) this._leftArmGroup.rotation.x = -swing * 0.6;
      // Subtle body bob
      this._playerGroup.position.y = state.player.y + bounce;
    } else {
      // Ease back to idle
      if (this._leftLegGroup) this._leftLegGroup.rotation.x *= 0.85;
      if (this._rightLegGroup) this._rightLegGroup.rotation.x *= 0.85;
      if (this._leftArmGroup) this._leftArmGroup.rotation.x *= 0.85;
      this._playerGroup.position.y = state.player.y;
    }

    // Attack animation: rotate weapon arm
    if (state.player.isAttacking && this._weaponArmGroup) {
      const t = state.player.attackTimer;
      this._weaponArmGroup.rotation.x = Math.sin(t * 10) * 1.2;
    } else if (this._weaponArmGroup) {
      this._weaponArmGroup.rotation.x *= 0.85;
    }

    // Aim line — subtle line from player in facing direction
    if (!this._aimLine) {
      const aimGeo = new THREE.BufferGeometry();
      aimGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
      const aimMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
      this._aimLine = new THREE.Line(aimGeo, aimMat);
      this._scene.add(this._aimLine);
    }
    const aimLen = 4.0;
    const aimY = state.player.y + 0.3;
    const aimDirX = Math.sin(state.player.angle) * aimLen;
    const aimDirZ = Math.cos(state.player.angle) * aimLen;
    const aimPos = this._aimLine.geometry.attributes.position as THREE.BufferAttribute;
    aimPos.setXYZ(0, state.player.x, aimY, state.player.z);
    aimPos.setXYZ(1, state.player.x + aimDirX, aimY, state.player.z + aimDirZ);
    aimPos.needsUpdate = true;

    // -- Enemies --
    this._syncEnemies(state);

    // -- Projectiles --
    this._syncProjectiles(state);

    // -- Loot --
    this._syncLoot(state);

    // -- Chests --
    this._syncChests(state);

    // -- AOE --
    this._syncAOE(state);

    // -- Floating text --
    this._syncFloatingText(state, dt);

    // -- Vendors (Camelot map) --
    if (state.currentMap === DiabloMapId.CAMELOT && state.vendors.length > 0) {
      this.syncVendors(state.vendors.map((v) => ({ id: v.id, type: v.type, x: v.x, z: v.z })));
      // Gentle idle bob for vendor NPCs
      for (const [, mesh] of this._vendorMeshes) {
        mesh.position.y = Math.sin(this._time * 1.5 + mesh.position.x) * 0.03;
      }
    }

    // -- Townfolk (Camelot map only) --
    if (state.currentMap === DiabloMapId.CAMELOT && state.townfolk.length > 0) {
      this._syncTownfolk(state.townfolk, dt);
    } else if (this._townfolkMeshes.size > 0) {
      for (const [, mesh] of this._townfolkMeshes) {
        this._scene.remove(mesh);
      }
      this._townfolkMeshes.clear();
    }

    // -- Environment animation --
    this._animateEnvironment();

    // Render
    this._renderer.render(this._scene, this._camera);
  }

  private _syncEnemies(state: DiabloState): void {
    const currentIds = new Set(state.enemies.map((e) => e.id));

    // Remove meshes for dead/gone enemies
    for (const [id, mesh] of this._enemyMeshes) {
      if (!currentIds.has(id)) {
        // Fade out
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.transparent = true;
            child.material.opacity *= 0.9;
          }
        });
        let anyVisible = false;
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            if (child.material.opacity > 0.05) {
              anyVisible = true;
            }
          }
        });
        if (!anyVisible) {
          this._scene.remove(mesh);
          this._enemyMeshes.delete(id);
        }
      }
    }

    // Add/update enemies
    for (const enemy of state.enemies) {
      let mesh = this._enemyMeshes.get(enemy.id);
      if (!mesh) {
        mesh = this._createEnemyMesh(enemy.type, enemy.scale);
        this._scene.add(mesh);
        this._enemyMeshes.set(enemy.id, mesh);
      }

      mesh.position.set(enemy.x, enemy.y, enemy.z);

      // Face toward player when chasing/attacking
      if (enemy.state === EnemyState.CHASE || enemy.state === EnemyState.ATTACK) {
        mesh.rotation.y = enemy.angle;
      } else {
        mesh.rotation.y = enemy.angle;
      }

      // Dying fade
      if (enemy.state === EnemyState.DYING) {
        const fade = Math.max(0, 1.0 - enemy.deathTimer * 2);
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.transparent = true;
            child.material.opacity = fade;
          }
        });
      }

      // Status effect visuals
      this._applyStatusTint(mesh, enemy.statusEffects);

      // Boss enrage glow
      if (enemy.bossEnraged) {
        const pulse = 0.5 + Math.sin(this._time * 6) * 0.5;
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissive.setHex(0xff0000);
            child.material.emissiveIntensity = 0.5 + pulse * 0.8;
          }
        });
      }

      // Boss shield sphere
      if (enemy.bossShieldTimer && enemy.bossShieldTimer > 0) {
        let shieldMesh = this._shieldMeshes.get(enemy.id + "_boss");
        if (!shieldMesh) {
          const sGeo = new THREE.SphereGeometry(enemy.scale * 1.8, 16, 12);
          const sMat = new THREE.MeshStandardMaterial({
            color: 0x4488ff,
            emissive: 0x2244aa,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
          });
          shieldMesh = new THREE.Mesh(sGeo, sMat);
          this._scene.add(shieldMesh);
          this._shieldMeshes.set(enemy.id + "_boss", shieldMesh);
        }
        shieldMesh.position.set(enemy.x, enemy.y + 1, enemy.z);
        const sPulse = 1.0 + Math.sin(this._time * 4) * 0.05;
        shieldMesh.scale.setScalar(sPulse);
      } else {
        const existing = this._shieldMeshes.get(enemy.id + "_boss");
        if (existing) {
          this._scene.remove(existing);
          this._shieldMeshes.delete(enemy.id + "_boss");
        }
      }

      // Shielded enemy behavior shield
      if (enemy.shieldActive) {
        let shieldMesh = this._shieldMeshes.get(enemy.id + "_shield");
        if (!shieldMesh) {
          const sGeo = new THREE.SphereGeometry(enemy.scale * 1.5, 12, 10);
          const sMat = new THREE.MeshStandardMaterial({
            color: 0x88aaff,
            emissive: 0x4466cc,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide,
          });
          shieldMesh = new THREE.Mesh(sGeo, sMat);
          this._scene.add(shieldMesh);
          this._shieldMeshes.set(enemy.id + "_shield", shieldMesh);
        }
        shieldMesh.position.set(enemy.x, enemy.y + 0.8, enemy.z);
      } else {
        const existing = this._shieldMeshes.get(enemy.id + "_shield");
        if (existing) {
          this._scene.remove(existing);
          this._shieldMeshes.delete(enemy.id + "_shield");
        }
      }

      // Healer heal beam
      if (enemy.healTarget) {
        const target = state.enemies.find((e) => e.id === enemy.healTarget);
        if (target) {
          let beam = this._healBeams.get(enemy.id);
          if (!beam) {
            const bGeo = new THREE.BufferGeometry();
            const positions = new Float32Array(6);
            bGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
            const bMat = new THREE.LineBasicMaterial({ color: 0x44ff44, linewidth: 2 });
            beam = new THREE.Line(bGeo, bMat);
            this._scene.add(beam);
            this._healBeams.set(enemy.id, beam);
          }
          const posAttr = beam.geometry.getAttribute("position") as THREE.BufferAttribute;
          posAttr.setXYZ(0, enemy.x, enemy.y + 1.5, enemy.z);
          posAttr.setXYZ(1, target.x, target.y + 1.5, target.z);
          posAttr.needsUpdate = true;
        }
      } else {
        const existing = this._healBeams.get(enemy.id);
        if (existing) {
          this._scene.remove(existing);
          this._healBeams.delete(enemy.id);
        }
      }
    }

    // Cleanup shields and beams for removed enemies
    for (const [key, mesh] of this._shieldMeshes) {
      const eid = key.split("_")[0];
      if (!currentIds.has(eid)) {
        this._scene.remove(mesh);
        this._shieldMeshes.delete(key);
      }
    }
    for (const [key, beam] of this._healBeams) {
      if (!currentIds.has(key)) {
        this._scene.remove(beam);
        this._healBeams.delete(key);
      }
    }
  }

  private _applyStatusTint(
    group: THREE.Group,
    effects: { effect: StatusEffect; duration: number; source: string }[]
  ): void {
    if (effects.length === 0) {
      return;
    }

    let tintColor: number | null = null;
    let emissiveColor: number | null = null;

    for (const fx of effects) {
      switch (fx.effect) {
        case StatusEffect.BURNING:
          tintColor = 0xff4400;
          emissiveColor = 0xff2200;
          break;
        case StatusEffect.FROZEN:
          tintColor = 0x88ccff;
          emissiveColor = 0x4488cc;
          break;
        case StatusEffect.SHOCKED:
          tintColor = 0xffff44;
          emissiveColor = 0xaaaa00;
          break;
        case StatusEffect.POISONED:
          tintColor = 0x44ff44;
          emissiveColor = 0x22aa22;
          break;
        case StatusEffect.SLOWED:
          tintColor = 0x8888ff;
          emissiveColor = 0x4444aa;
          break;
        case StatusEffect.STUNNED:
          tintColor = 0xffff88;
          emissiveColor = 0xaaaa44;
          break;
        case StatusEffect.BLEEDING:
          tintColor = 0xff2222;
          emissiveColor = 0xaa0000;
          break;
        case StatusEffect.WEAKENED:
          tintColor = 0x888888;
          emissiveColor = 0x444444;
          break;
      }
    }

    if (tintColor !== null && emissiveColor !== null) {
      const pulse = Math.sin(this._time * 6) * 0.3 + 0.5;
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.emissive.setHex(emissiveColor!);
          child.material.emissiveIntensity = pulse;
        }
      });
    }
  }

  private _buildFPWeaponIfNeeded(): void {
    if (this._fpWeapon) return;

    this._fpWeapon = new THREE.Group();

    // Sword/weapon handle
    const handleGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.18, 6);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x5a3520, roughness: 0.7 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.09;
    this._fpWeapon.add(handle);

    // Grip wrapping
    const gripGeo = new THREE.TorusGeometry(0.02, 0.004, 4, 8);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 0.4 });
    for (let i = 0; i < 4; i++) {
      const grip = new THREE.Mesh(gripGeo, gripMat);
      grip.position.y = -0.06 + i * 0.035;
      this._fpWeapon.add(grip);
    }

    // Cross guard
    const guardGeo = new THREE.BoxGeometry(0.08, 0.012, 0.012);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.2, metalness: 0.7 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.y = 0.01;
    this._fpWeapon.add(guard);

    // Blade
    const bladeGeo = new THREE.BoxGeometry(0.025, 0.3, 0.005);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, roughness: 0.15, metalness: 0.8 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.16;
    this._fpWeapon.add(blade);

    // Blade edge highlight
    const edgeGeo = new THREE.BoxGeometry(0.003, 0.28, 0.008);
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.1, metalness: 0.9 });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.y = 0.16;
    this._fpWeapon.add(edge);

    // Blade tip
    const tipGeo = new THREE.ConeGeometry(0.014, 0.04, 4);
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.position.y = 0.33;
    this._fpWeapon.add(tip);

    // Pommel gem
    const gemGeo = new THREE.SphereGeometry(0.01, 6, 6);
    const gemMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.y = -0.19;
    this._fpWeapon.add(gem);

    // Position relative to camera — lower right like MageWars
    this._fpWeapon.position.set(0.28, -0.2, -0.4);
    this._fpWeapon.rotation.set(0.15, 0, -0.1);

    this._camera.add(this._fpWeapon);
    if (!this._camera.parent) this._scene.add(this._camera);
  }

  private _syncProjectiles(state: DiabloState): void {
    const currentIds = new Set(state.projectiles.map((p) => p.id));

    // Remove old
    for (const [id, mesh] of this._projectileMeshes) {
      if (!currentIds.has(id)) {
        this._scene.remove(mesh);
        mesh.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
          if ((child as THREE.Mesh).material) ((child as THREE.Mesh).material as THREE.Material).dispose();
        });
        this._projectileMeshes.delete(id);
      }
    }

    // Add/update
    for (const proj of state.projectiles) {
      let mesh = this._projectileMeshes.get(proj.id);
      if (!mesh) {
        const r = proj.radius || 0.15;
        const group = new THREE.Group();

        if (!proj.isPlayerOwned) {
          // Enemy projectile: red core with spikes
          const core = new THREE.Mesh(
            new THREE.SphereGeometry(r * 0.6, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xcc0000, emissiveIntensity: 1.5 })
          );
          group.add(core);
          for (let i = 0; i < 3; i++) {
            const spike = new THREE.Mesh(
              new THREE.ConeGeometry(r * 0.15, r * 0.4, 4),
              new THREE.MeshStandardMaterial({ color: 0xaa0000, emissive: 0x880000, emissiveIntensity: 1.2 })
            );
            const angle = (i / 3) * Math.PI * 2;
            spike.position.set(Math.cos(angle) * r * 0.5, 0, Math.sin(angle) * r * 0.5);
            spike.rotation.z = -Math.cos(angle) * Math.PI * 0.4;
            spike.rotation.x = Math.sin(angle) * Math.PI * 0.4;
            group.add(spike);
          }
        } else if (proj.skillId) {
          switch (proj.skillId) {
            case SkillId.FIREBALL: {
              // Core orange sphere
              const core = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.7, 10, 8),
                new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 2.0 })
              );
              group.add(core);
              // Outer transparent glow
              const outer = new THREE.Mesh(
                new THREE.SphereGeometry(r * 1.3, 10, 8),
                new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8, transparent: true, opacity: 0.25 })
              );
              group.add(outer);
              // Flame wisps
              for (let i = 0; i < 3; i++) {
                const wisp = new THREE.Mesh(
                  new THREE.ConeGeometry(r * 0.3, r * 0.6, 5),
                  new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: i % 2 === 0 ? 0xff0000 : 0xffaa00, emissiveIntensity: 1.8 })
                );
                wisp.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                wisp.position.set((Math.random() - 0.5) * r, (Math.random() - 0.5) * r, (Math.random() - 0.5) * r);
                group.add(wisp);
              }
              break;
            }
            case SkillId.ICE_NOVA: {
              // Core ice crystal
              const core = new THREE.Mesh(
                new THREE.IcosahedronGeometry(r * 0.8, 0),
                new THREE.MeshStandardMaterial({ color: 0xaaddff, emissive: 0x44ccff, emissiveIntensity: 1.5 })
              );
              group.add(core);
              // Crystal shards
              for (let i = 0; i < 4; i++) {
                const shard = new THREE.Mesh(
                  new THREE.OctahedronGeometry(r * 0.3, 0),
                  new THREE.MeshStandardMaterial({ color: 0xeeffff, emissive: 0x88bbff, emissiveIntensity: 1.0, transparent: true, opacity: 0.7 })
                );
                const angle = (i / 4) * Math.PI * 2;
                shard.position.set(Math.cos(angle) * r * 0.9, 0, Math.sin(angle) * r * 0.9);
                shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
                group.add(shard);
              }
              break;
            }
            case SkillId.LIGHTNING_BOLT:
            case SkillId.CHAIN_LIGHTNING: {
              // Bright yellow core
              const core = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.5, 8, 6),
                new THREE.MeshStandardMaterial({ color: 0xffff66, emissive: 0xffff00, emissiveIntensity: 3.0 })
              );
              group.add(core);
              // Electric sparks - thin elongated boxes
              for (let i = 0; i < 5; i++) {
                const spark = new THREE.Mesh(
                  new THREE.BoxGeometry(r * 0.05, r * 0.6, r * 0.05),
                  new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffff88, emissiveIntensity: 2.5 })
                );
                spark.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                spark.position.set((Math.random() - 0.5) * r * 0.8, (Math.random() - 0.5) * r * 0.8, (Math.random() - 0.5) * r * 0.8);
                group.add(spark);
              }
              // Outer glow
              const glow = new THREE.Mesh(
                new THREE.SphereGeometry(r * 1.2, 8, 6),
                new THREE.MeshStandardMaterial({ color: 0xffff44, emissive: 0xaaaa00, emissiveIntensity: 0.5, transparent: true, opacity: 0.2 })
              );
              group.add(glow);
              break;
            }
            case SkillId.POISON_ARROW: {
              // Green core
              const core = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.6, 8, 6),
                new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x228822, emissiveIntensity: 1.5 })
              );
              group.add(core);
              // Drip particles trailing below
              for (let i = 0; i < 3; i++) {
                const drip = new THREE.Mesh(
                  new THREE.SphereGeometry(r * 0.15, 6, 4),
                  new THREE.MeshStandardMaterial({ color: 0x228822, emissive: 0x115511, emissiveIntensity: 1.0, transparent: true, opacity: 0.6 })
                );
                drip.position.set((Math.random() - 0.5) * r * 0.3, -r * 0.4 - i * r * 0.25, (Math.random() - 0.5) * r * 0.3);
                group.add(drip);
              }
              // Outer mist
              const mist = new THREE.Mesh(
                new THREE.SphereGeometry(r * 1.1, 8, 6),
                new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 0.4, transparent: true, opacity: 0.2 })
              );
              group.add(mist);
              break;
            }
            case SkillId.MULTI_SHOT:
            case SkillId.PIERCING_SHOT: {
              // Arrow shaft - thin brown cylinder
              const shaft = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, r * 3, 6),
                new THREE.MeshStandardMaterial({ color: 0x8b6914, emissive: 0x442200, emissiveIntensity: 0.3 })
              );
              shaft.rotation.z = Math.PI / 2; // Point forward
              group.add(shaft);
              // Arrow head - metallic cone
              const head = new THREE.Mesh(
                new THREE.ConeGeometry(r * 0.3, r * 0.4, 4),
                new THREE.MeshStandardMaterial({ color: 0xaaaaaa, emissive: 0x444444, emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.3 })
              );
              head.rotation.z = -Math.PI / 2;
              head.position.x = r * 1.7;
              group.add(head);
              // Feathered tail - 2 small flat boxes
              for (let i = 0; i < 2; i++) {
                const feather = new THREE.Mesh(
                  new THREE.BoxGeometry(r * 0.4, r * 0.3, 0.02),
                  new THREE.MeshStandardMaterial({ color: 0xddccaa, emissive: 0x554433, emissiveIntensity: 0.2 })
                );
                feather.position.set(-r * 1.3, (i === 0 ? 1 : -1) * r * 0.15, 0);
                feather.rotation.z = (i === 0 ? 0.2 : -0.2);
                group.add(feather);
              }
              break;
            }
            case SkillId.ARCANE_MISSILES: {
              // Purple core
              const core = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.6, 8, 6),
                new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822cc, emissiveIntensity: 2.0 })
              );
              group.add(core);
              // Arcane ring
              const ring = new THREE.Mesh(
                new THREE.TorusGeometry(r * 0.7, r * 0.08, 8, 16),
                new THREE.MeshStandardMaterial({ color: 0xcc66ff, emissive: 0xaa44ee, emissiveIntensity: 1.8 })
              );
              group.add(ring);
              // Sparkles - 3 tiny orbiting white spheres
              for (let i = 0; i < 3; i++) {
                const sparkle = new THREE.Mesh(
                  new THREE.SphereGeometry(r * 0.1, 6, 4),
                  new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xddddff, emissiveIntensity: 2.0 })
                );
                const angle = (i / 3) * Math.PI * 2;
                sparkle.position.set(Math.cos(angle) * r * 0.9, Math.sin(angle) * r * 0.3, Math.sin(angle) * r * 0.9);
                group.add(sparkle);
              }
              break;
            }
            case SkillId.FIRE_VOLLEY: {
              // Red-orange core
              const core = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.5, 8, 6),
                new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xcc0000, emissiveIntensity: 2.0 })
              );
              group.add(core);
              // Flame tail cone
              const tail = new THREE.Mesh(
                new THREE.ConeGeometry(r * 0.4, r * 1.0, 6),
                new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.5, transparent: true, opacity: 0.6 })
              );
              tail.position.x = -r * 0.6;
              tail.rotation.z = Math.PI / 2;
              group.add(tail);
              break;
            }
            default: {
              // Default player projectile
              const core = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.7, 8, 6),
                new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 1.5 })
              );
              group.add(core);
              break;
            }
          }
        } else {
          // No skillId, default
          const core = new THREE.Mesh(
            new THREE.SphereGeometry(r * 0.7, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 1.5 })
          );
          group.add(core);
        }

        group.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).castShadow = true;
        });
        mesh = group;
        this._scene.add(mesh);
        this._projectileMeshes.set(proj.id, mesh);
      }

      mesh.position.set(proj.x, proj.y, proj.z);
      mesh.rotation.y += 0.05;
      mesh.rotation.x += 0.03;
    }
  }

  private _syncLoot(state: DiabloState): void {
    const currentIds = new Set(state.loot.map((l) => l.id));

    for (const [id, mesh] of this._lootMeshes) {
      if (!currentIds.has(id)) {
        this._scene.remove(mesh);
        this._lootMeshes.delete(id);
      }
    }

    for (const loot of state.loot) {
      let mesh = this._lootMeshes.get(loot.id);
      if (!mesh) {
        mesh = this._createLootBeam(loot.item.rarity);
        this._scene.add(mesh);
        this._lootMeshes.set(loot.id, mesh);
      }

      // Bob up/down and rotate
      const bob = Math.sin(this._time * 2 + loot.x) * 0.2;
      mesh.position.set(loot.x, loot.y + bob, loot.z);
      mesh.rotation.y = this._time * 0.8;
    }
  }

  private _syncChests(state: DiabloState): void {
    const currentIds = new Set(state.treasureChests.map((c) => c.id));

    for (const [id, mesh] of this._chestMeshes) {
      if (!currentIds.has(id)) {
        this._scene.remove(mesh);
        this._chestMeshes.delete(id);
      }
    }

    for (const chest of state.treasureChests) {
      let mesh = this._chestMeshes.get(chest.id);
      if (!mesh) {
        mesh = this._createChest(chest.rarity, chest.opened);
        this._scene.add(mesh);
        this._chestMeshes.set(chest.id, mesh);
      }

      mesh.position.set(chest.x, chest.y, chest.z);

      // If opened state changed, rebuild
      if (chest.opened) {
        const lid = mesh.children[1];
        if (lid && lid.rotation.x > -1.0) {
          lid.rotation.x = -Math.PI * 0.6;
          lid.position.z = -0.25;
          lid.position.y = 0.7;
        }
      }
    }
  }

  private _syncAOE(state: DiabloState): void {
    const currentIds = new Set(state.aoeEffects.map((a) => a.id));

    for (const [id, mesh] of this._aoeMeshes) {
      if (!currentIds.has(id)) {
        this._scene.remove(mesh);
        this._aoeMeshes.delete(id);
      }
    }

    for (const aoe of state.aoeEffects) {
      let mesh = this._aoeMeshes.get(aoe.id);

      let color = 0xff4400;
      switch (aoe.damageType) {
        case 'FIRE':
          color = 0xff4400;
          break;
        case 'ICE':
          color = 0x44aaff;
          break;
        case 'LIGHTNING':
          color = 0xffff44;
          break;
        case 'POISON':
          color = 0x44ff44;
          break;
        case 'ARCANE':
          color = 0xaa44ff;
          break;
        case 'SHADOW':
          color = 0x442266;
          break;
        case 'HOLY':
          color = 0xffdd88;
          break;
        default:
          color = 0xff8844;
          break;
      }

      if (!mesh) {
        const ringGeo = new THREE.TorusGeometry(aoe.radius, 0.1, 8, 24);
        const ringMat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 1.5,
          transparent: true,
          opacity: 0.7,
        });
        mesh = new THREE.Mesh(ringGeo, ringMat);
        mesh.rotation.x = -Math.PI / 2;
        this._scene.add(mesh);
        this._aoeMeshes.set(aoe.id, mesh);
      }

      mesh.position.set(aoe.x, 0.1, aoe.z);

      // Expand/fade based on timer
      const progress = aoe.timer / aoe.duration;
      const currentScale = 0.5 + progress * 0.5;
      mesh.scale.setScalar(currentScale);
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.opacity = Math.max(0, 0.7 * (1.0 - progress));
      }
    }
  }

  private _syncFloatingText(state: DiabloState, _dt: number): void {
    const currentIds = new Set(state.floatingTexts.map((f) => f.id));

    for (const [id, sprite] of this._floatTextSprites) {
      if (!currentIds.has(id)) {
        this._scene.remove(sprite);
        this._floatTextSprites.delete(id);
      }
    }

    for (const ft of state.floatingTexts) {
      let sprite = this._floatTextSprites.get(ft.id);
      if (!sprite) {
        sprite = this._createTextSprite(ft.text, ft.color);
        this._scene.add(sprite);
        this._floatTextSprites.set(ft.id, sprite);
      }

      sprite.position.set(ft.x, ft.y, ft.z);

      const t = ft.timer;
      const isCrit = ft.text.startsWith('CRIT');

      // Scale: pop in then shrink; crits start bigger
      const baseScale = isCrit ? 3.5 : 2.0;
      const popScale = t < 0.15 ? 1.0 + (1.0 - t / 0.15) * 0.6 : 1.0;
      const shrink = t > 1.0 ? Math.max(0.3, 1.0 - (t - 1.0) * 1.2) : 1.0;
      const s = baseScale * popScale * shrink;
      sprite.scale.set(s, s * 0.25, 1);

      // Fade based on timer
      if (sprite.material instanceof THREE.SpriteMaterial) {
        sprite.material.opacity = Math.max(0, 1.0 - t * 0.5);
      }
    }
  }

  private _createTextSprite(text: string, color: string): THREE.Sprite {
    const isCrit = text.startsWith('CRIT');
    const canvas = document.createElement('canvas');
    canvas.width = isCrit ? 512 : 256;
    canvas.height = isCrit ? 128 : 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = isCrit ? 'bold 56px Arial' : 'bold 32px Arial';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = isCrit ? 5 : 3;
    // Glow for crits
    if (isCrit) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
    }
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    if (isCrit) { ctx.shadowBlur = 0; }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2, 0.5, 1);
    return sprite;
  }

  private _animateEnvironment(): void {
    // Torch flicker (necropolis)
    if (this._currentMap === DiabloMapId.NECROPOLIS_DUNGEON) {
      for (let i = 0; i < this._torchLights.length; i++) {
        const light = this._torchLights[i];
        light.intensity = 1.0 + Math.sin(this._time * 8 + i * 2.3) * 0.4 + Math.random() * 0.2;
      }
    }

    // Camelot lamp flicker and torch glow
    if (this._currentMap === DiabloMapId.CAMELOT) {
      for (let i = 0; i < this._torchLights.length; i++) {
        const light = this._torchLights[i];
        light.intensity = light.intensity * 0.95 + (0.6 + Math.sin(this._time * 3 + i * 1.7) * 0.15 + Math.random() * 0.05) * 0.05;
      }
    }

    // Volcanic Wastes / Dragon's Sanctum fire flicker
    if (this._currentMap === DiabloMapId.VOLCANIC_WASTES || this._currentMap === DiabloMapId.DRAGONS_SANCTUM) {
      for (let i = 0; i < this._torchLights.length; i++) {
        const light = this._torchLights[i];
        light.intensity = light.intensity * 0.92 + (2 + Math.sin(this._time * 4 + i * 2.3) * 0.5 + Math.random() * 0.3) * 0.08;
      }
    }

    // Abyssal Rift void pulse
    if (this._currentMap === DiabloMapId.ABYSSAL_RIFT) {
      for (let i = 0; i < this._torchLights.length; i++) {
        const light = this._torchLights[i];
        light.intensity = 2 + Math.sin(this._time * 1.5 + i * 1.1) * 1.0;
      }
    }

    // Water shimmer (forest stream, elven village pond)
    if (this._currentMap === DiabloMapId.FOREST || this._currentMap === DiabloMapId.ELVEN_VILLAGE) {
      this._envGroup.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.MeshStandardMaterial &&
          child.material.transparent &&
          child.material.opacity < 0.7 &&
          child.material.opacity > 0.3
        ) {
          child.material.opacity = 0.5 + Math.sin(this._time * 1.5) * 0.08;
        }
      });
    }
  }

  getClickTarget(
    mx: number,
    my: number,
    _state: DiabloState
  ): { type: string; id: string } | null {
    const ndcX = (mx / this._renderer.domElement.clientWidth) * 2 - 1;
    const ndcY = -(my / this._renderer.domElement.clientHeight) * 2 + 1;
    this._raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this._camera);

    // Check enemies
    for (const [id, mesh] of this._enemyMeshes) {
      const intersects = this._raycaster.intersectObject(mesh, true);
      if (intersects.length > 0) {
        return { type: 'enemy', id };
      }
    }

    // Check chests
    for (const [id, mesh] of this._chestMeshes) {
      const intersects = this._raycaster.intersectObject(mesh, true);
      if (intersects.length > 0) {
        return { type: 'chest', id };
      }
    }

    // Check loot
    for (const [id, mesh] of this._lootMeshes) {
      const intersects = this._raycaster.intersectObject(mesh, true);
      if (intersects.length > 0) {
        return { type: 'loot', id };
      }
    }

    return null;
  }

  // ────────────────────────────────────────────────────────────────────────
  //  SUNSCORCH DESERT
  // ────────────────────────────────────────────────────────────────────────
  private _buildSunscorchDesert(w: number, d: number): void {
    this._scene.fog = new THREE.FogExp2(0xddcc99, 0.008);
    this._applyTerrainColors(0xbb9955, 0xddbb77, 1.4);
    this._dirLight.color.setHex(0xffeebb);
    this._dirLight.intensity = 1.8;
    this._ambientLight.color.setHex(0x665533);
    this._ambientLight.intensity = 0.7;
    this._hemiLight.color.setHex(0xeedd99);
    this._hemiLight.groundColor.setHex(0x886644);
    const hw = w / 2, hd = d / 2;

    const sandMat = new THREE.MeshStandardMaterial({ color: 0xd4b87a, roughness: 0.95 });
    const darkSandMat = new THREE.MeshStandardMaterial({ color: 0xb89960, roughness: 0.9 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x998866, roughness: 0.85 });
    const ruinMat = new THREE.MeshStandardMaterial({ color: 0xaa9970, roughness: 0.8 });
    const cactusMat = new THREE.MeshStandardMaterial({ color: 0x447733, roughness: 0.7 });
    const cactusFlowerMat = new THREE.MeshStandardMaterial({ color: 0xff5577, roughness: 0.5 });
    const oasisWaterMat = new THREE.MeshStandardMaterial({ color: 0x3399cc, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.7 });
    const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 });
    const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x8a9a3a, roughness: 0.6, side: THREE.DoubleSide });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.7 });
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.6, side: THREE.DoubleSide });
    const tentMat = new THREE.MeshStandardMaterial({ color: 0xaa7744, roughness: 0.8, side: THREE.DoubleSide });

    // ── Sand dunes (low rolling hills) ──
    for (let i = 0; i < 35; i++) {
      const sx = 10 + Math.random() * 22;
      const sy = 0.3 + Math.random() * 0.8;
      const sz = 10 + Math.random() * 22;
      const geo = new THREE.SphereGeometry(1, 12, 8);
      geo.scale(sx, sy, sz);
      const dune = new THREE.Mesh(geo, i % 3 === 0 ? darkSandMat : sandMat);
      dune.position.set(
        (Math.random() - 0.5) * w * 0.9,
        sy * 0.25,
        (Math.random() - 0.5) * d * 0.9,
      );
      this._scene.add(dune);
    }

    // ── Cacti scattered around ──
    for (let i = 0; i < 40; i++) {
      const cactus = new THREE.Group();
      const h = 1.5 + Math.random() * 3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, h, 6), cactusMat);
      trunk.position.y = h / 2;
      cactus.add(trunk);
      // Arms
      if (Math.random() > 0.4) {
        const armH = 0.8 + Math.random() * 1.2;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, armH, 5), cactusMat);
        arm.position.set(0.4, h * 0.5 + armH * 0.3, 0);
        arm.rotation.z = -0.6;
        cactus.add(arm);
        const armUp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, armH * 0.7, 5), cactusMat);
        armUp.position.set(0.65, h * 0.5 + armH * 0.6, 0);
        cactus.add(armUp);
      }
      if (Math.random() > 0.5) {
        const armH = 0.6 + Math.random();
        const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, armH, 5), cactusMat);
        arm2.position.set(-0.35, h * 0.4, 0);
        arm2.rotation.z = 0.7;
        cactus.add(arm2);
      }
      // Flower on top
      if (Math.random() > 0.6) {
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), cactusFlowerMat);
        flower.position.y = h + 0.1;
        cactus.add(flower);
      }
      const cacX = (Math.random() - 0.5) * w * 0.85;
      const cacZ = (Math.random() - 0.5) * d * 0.85;
      cactus.position.set(cacX, getTerrainHeight(cacX, cacZ, 1.4), cacZ);
      this._scene.add(cactus);
    }

    // ── Ancient ruins (broken pillars, walls, arches) ──
    for (let i = 0; i < 8; i++) {
      const ruin = new THREE.Group();
      const cx = (Math.random() - 0.5) * w * 0.7;
      const cz = (Math.random() - 0.5) * d * 0.7;
      // Broken pillars
      const pillarCount = 3 + Math.floor(Math.random() * 5);
      for (let p = 0; p < pillarCount; p++) {
        const ph = 2 + Math.random() * 4;
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, ph, 8), ruinMat);
        pillar.position.set(
          (Math.random() - 0.5) * 8,
          ph / 2,
          (Math.random() - 0.5) * 8,
        );
        pillar.rotation.x = (Math.random() - 0.5) * 0.15;
        pillar.rotation.z = (Math.random() - 0.5) * 0.15;
        ruin.add(pillar);
        // Broken top cap
        if (Math.random() > 0.5) {
          const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.5, 0.3, 8), ruinMat);
          cap.position.set(pillar.position.x, ph + 0.15, pillar.position.z);
          ruin.add(cap);
        }
      }
      // Stone slabs on ground
      for (let s = 0; s < 4; s++) {
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(1 + Math.random() * 2, 0.3, 1 + Math.random() * 2),
          stoneMat,
        );
        slab.position.set(
          (Math.random() - 0.5) * 10,
          0.15,
          (Math.random() - 0.5) * 10,
        );
        slab.rotation.y = Math.random() * Math.PI;
        ruin.add(slab);
      }
      // Arch (sometimes)
      if (Math.random() > 0.5) {
        const archL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), ruinMat);
        archL.position.set(-2, 2.5, 0);
        ruin.add(archL);
        const archR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), ruinMat);
        archR.position.set(2, 2.5, 0);
        ruin.add(archR);
        const archTop = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.6, 0.8), ruinMat);
        archTop.position.set(0, 5.3, 0);
        ruin.add(archTop);
      }
      ruin.position.set(cx, getTerrainHeight(cx, cz, 1.4), cz);
      this._scene.add(ruin);
    }

    // ── Oasis (water pool with palm trees) ──
    const oasisX = -hw * 0.3, oasisZ = -hd * 0.3;
    const oasisPool = new THREE.Mesh(new THREE.CircleGeometry(8, 24), oasisWaterMat);
    oasisPool.rotation.x = -Math.PI / 2;
    oasisPool.position.set(oasisX, getTerrainHeight(oasisX, oasisZ, 1.4) + 0.05, oasisZ);
    this._scene.add(oasisPool);
    // Green ring around oasis
    const grassRing = new THREE.Mesh(
      new THREE.RingGeometry(7, 10, 24),
      new THREE.MeshStandardMaterial({ color: 0x558833, roughness: 0.8 }),
    );
    grassRing.rotation.x = -Math.PI / 2;
    grassRing.position.set(oasisX, getTerrainHeight(oasisX, oasisZ, 1.4) + 0.02, oasisZ);
    this._scene.add(grassRing);
    // Palm trees around oasis
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const palm = new THREE.Group();
      const trunkH = 4 + Math.random() * 3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, trunkH, 6), palmTrunkMat);
      trunk.position.y = trunkH / 2;
      trunk.rotation.x = (Math.random() - 0.5) * 0.2;
      trunk.rotation.z = (Math.random() - 0.5) * 0.2;
      palm.add(trunk);
      // Leaves (flat planes angled outward)
      for (let l = 0; l < 6; l++) {
        const leafAngle = (l / 6) * Math.PI * 2;
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.6), palmLeafMat);
        leaf.position.set(Math.cos(leafAngle) * 1.0, trunkH + 0.2, Math.sin(leafAngle) * 1.0);
        leaf.rotation.x = -0.5;
        leaf.rotation.y = leafAngle;
        palm.add(leaf);
      }
      // Coconuts
      if (Math.random() > 0.5) {
        const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), new THREE.MeshStandardMaterial({ color: 0x885522 }));
        coconut.position.y = trunkH - 0.2;
        palm.add(coconut);
      }
      const palmX = oasisX + Math.cos(angle) * (8 + Math.random() * 2);
      const palmZ = oasisZ + Math.sin(angle) * (8 + Math.random() * 2);
      palm.position.set(palmX, getTerrainHeight(palmX, palmZ, 1.4), palmZ);
      this._scene.add(palm);
    }

    // ── Bones and skulls (scattered) ──
    for (let i = 0; i < 25; i++) {
      const bone = new THREE.Group();
      const boneLen = 0.5 + Math.random() * 1.5;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, boneLen, 4), boneMat);
      shaft.rotation.z = Math.PI / 2;
      shaft.position.y = 0.1;
      bone.add(shaft);
      const end1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4), boneMat);
      end1.position.set(boneLen / 2, 0.1, 0);
      bone.add(end1);
      const end2 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4), boneMat);
      end2.position.set(-boneLen / 2, 0.1, 0);
      bone.add(end2);
      const bnX2 = (Math.random() - 0.5) * w * 0.8;
      const bnZ2 = (Math.random() - 0.5) * d * 0.8;
      bone.position.set(bnX2, getTerrainHeight(bnX2, bnZ2, 1.4), bnZ2);
      bone.rotation.y = Math.random() * Math.PI;
      this._scene.add(bone);
    }
    // Skulls
    for (let i = 0; i < 12; i++) {
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), boneMat);
      skull.scale.set(1, 0.8, 1.1);
      skull.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.15,
        (Math.random() - 0.5) * d * 0.8,
      );
      this._scene.add(skull);
    }

    // ── Bandit camp (tents, fire pit, flags) ──
    const campX = hw * 0.35, campZ = hd * 0.3;
    // Tents
    for (let t = 0; t < 3; t++) {
      const tent = new THREE.Group();
      const tShape = new THREE.ConeGeometry(2.5, 3, 4);
      const tMesh = new THREE.Mesh(tShape, tentMat);
      tMesh.position.y = 1.5;
      tent.add(tMesh);
      // Pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.5, 4), new THREE.MeshStandardMaterial({ color: 0x664422 }));
      pole.position.y = 1.75;
      tent.add(pole);
      const tentX = campX + (t - 1) * 6;
      const tentZ = campZ + (Math.random() - 0.5) * 4;
      tent.position.set(tentX, getTerrainHeight(tentX, tentZ, 1.4), tentZ);
      this._scene.add(tent);
    }
    // Fire pit
    const pitRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.25, 6, 12), stoneMat);
    pitRing.rotation.x = Math.PI / 2;
    pitRing.position.set(campX, 0.25, campZ);
    this._scene.add(pitRing);
    // Ember glow
    const campFire = new THREE.PointLight(0xff6622, 1.5, 12);
    campFire.position.set(campX, 1.5, campZ);
    this._scene.add(campFire);
    // Flag poles
    for (let f = 0; f < 2; f++) {
      const flagGroup = new THREE.Group();
      const poleH = 5;
      const fPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, poleH, 4), new THREE.MeshStandardMaterial({ color: 0x664422 }));
      fPole.position.y = poleH / 2;
      flagGroup.add(fPole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.8), flagMat);
      flag.position.set(0.75, poleH - 0.5, 0);
      flagGroup.add(flag);
      const fgX2 = campX + (f === 0 ? -8 : 8);
      flagGroup.position.set(fgX2, getTerrainHeight(fgX2, campZ, 1.4), campZ);
      this._scene.add(flagGroup);
    }

    // ── Rock formations ──
    for (let i = 0; i < 18; i++) {
      const rockGroup = new THREE.Group();
      const count = 2 + Math.floor(Math.random() * 4);
      for (let r = 0; r < count; r++) {
        const rh = 1 + Math.random() * 3;
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(rh, 0),
          stoneMat,
        );
        rock.scale.set(0.8 + Math.random() * 0.5, 0.6 + Math.random() * 0.8, 0.8 + Math.random() * 0.5);
        rock.position.set((Math.random() - 0.5) * 3, rh * 0.3, (Math.random() - 0.5) * 3);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rockGroup.add(rock);
      }
      const rgX = (Math.random() - 0.5) * w * 0.85;
      const rgZ = (Math.random() - 0.5) * d * 0.85;
      rockGroup.position.set(rgX, getTerrainHeight(rgX, rgZ, 1.4), rgZ);
      this._scene.add(rockGroup);
    }

    // ── Quicksand patches (dark circles) ──
    const qsMat = new THREE.MeshStandardMaterial({ color: 0x997744, roughness: 1.0, transparent: true, opacity: 0.6 });
    for (let i = 0; i < 6; i++) {
      const qs = new THREE.Mesh(new THREE.CircleGeometry(2 + Math.random() * 3, 16), qsMat);
      qs.rotation.x = -Math.PI / 2;
      qs.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0.03,
        (Math.random() - 0.5) * d * 0.7,
      );
      this._scene.add(qs);
    }

    // ── Desert sand trails (paths) ──
    const trailMat = new THREE.MeshStandardMaterial({ color: 0xc8a55a, roughness: 0.9 });
    for (let i = 0; i < 5; i++) {
      const trail = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5 + Math.random(), 20 + Math.random() * 30),
        trailMat,
      );
      trail.rotation.x = -Math.PI / 2;
      trail.rotation.z = Math.random() * Math.PI;
      trail.position.set(
        (Math.random() - 0.5) * w * 0.6,
        0.01,
        (Math.random() - 0.5) * d * 0.6,
      );
      this._scene.add(trail);
    }

    // ── Dry tumbleweed bushes ──
    const dryBushMat = new THREE.MeshStandardMaterial({ color: 0x997744, roughness: 0.9 });
    for (let i = 0; i < 20; i++) {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 5, 4), dryBushMat);
      bush.scale.y = 0.6;
      bush.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.15,
        (Math.random() - 0.5) * d * 0.8,
      );
      this._scene.add(bush);
    }

    // ── Sand ripple patterns ──
    const rippleMat = new THREE.MeshStandardMaterial({ color: 0xc0a060, roughness: 0.95 });
    for (let i = 0; i < 12; i++) {
      const rippleGroup = new THREE.Group();
      for (let r = 0; r < 6; r++) {
        const ripple = new THREE.Mesh(new THREE.BoxGeometry(3 + Math.random() * 2, 0.02, 0.06), rippleMat);
        ripple.position.set(0, 0.01, r * 0.3);
        rippleGroup.add(ripple);
      }
      const riX = (Math.random() - 0.5) * w * 0.7;
      const riZ = (Math.random() - 0.5) * d * 0.7;
      rippleGroup.position.set(riX, getTerrainHeight(riX, riZ, 1.4), riZ);
      rippleGroup.rotation.y = Math.random() * Math.PI;
      this._scene.add(rippleGroup);
    }

    // ── Vulture perches (dead tree stumps with vultures) ──
    const deadWoodMat = new THREE.MeshStandardMaterial({ color: 0x8a7050, roughness: 0.9 });
    for (let i = 0; i < 5; i++) {
      const perch = new THREE.Group();
      const stumpH = 2 + Math.random() * 2;
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, stumpH, 5), deadWoodMat);
      stump.position.y = stumpH / 2;
      perch.add(stump);
      // Dead branches
      for (let b = 0; b < 3; b++) {
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.8, 4), deadWoodMat);
        branch.position.set((Math.random() - 0.5) * 0.3, stumpH * 0.5 + b * 0.4, 0);
        branch.rotation.z = (Math.random() - 0.5) * 1.2;
        perch.add(branch);
      }
      // Vulture silhouette on top (simple)
      if (Math.random() > 0.4) {
        const vBody = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        vBody.scale.set(0.8, 0.7, 1.2);
        vBody.position.y = stumpH + 0.1;
        perch.add(vBody);
        const vHead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 3), new THREE.MeshStandardMaterial({ color: 0xcc4444 }));
        vHead.position.set(0, stumpH + 0.2, 0.12);
        perch.add(vHead);
      }
      const prX = (Math.random() - 0.5) * w * 0.8;
      const prZ = (Math.random() - 0.5) * d * 0.8;
      perch.position.set(prX, getTerrainHeight(prX, prZ, 1.4), prZ);
      this._scene.add(perch);
    }

    // ── Pottery shards (broken urns) ──
    const potteryMat = new THREE.MeshStandardMaterial({ color: 0xbb7744, roughness: 0.7 });
    for (let i = 0; i < 8; i++) {
      const shardGroup = new THREE.Group();
      for (let s = 0; s < 4; s++) {
        const shard = new THREE.Mesh(new THREE.BoxGeometry(0.15 + Math.random() * 0.1, 0.08, 0.12), potteryMat);
        shard.position.set((Math.random() - 0.5) * 0.4, 0.04, (Math.random() - 0.5) * 0.4);
        shard.rotation.set(Math.random(), Math.random(), Math.random());
        shardGroup.add(shard);
      }
      // Intact base of urn sometimes
      if (Math.random() > 0.5) {
        const urnBase = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.2, 6), potteryMat);
        urnBase.position.y = 0.1;
        shardGroup.add(urnBase);
      }
      const sdX = (Math.random() - 0.5) * w * 0.7;
      const sdZ = (Math.random() - 0.5) * d * 0.7;
      shardGroup.position.set(sdX, getTerrainHeight(sdX, sdZ, 1.4), sdZ);
      this._scene.add(shardGroup);
    }

    // ── Scorpion burrow holes ──
    const burrowMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 1.0 });
    for (let i = 0; i < 10; i++) {
      const burrow = new THREE.Mesh(new THREE.CircleGeometry(0.15 + Math.random() * 0.1, 6), burrowMat);
      burrow.rotation.x = -Math.PI / 2;
      burrow.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.01,
        (Math.random() - 0.5) * d * 0.8,
      );
      this._scene.add(burrow);
      // Sand mound around burrow
      const mound = new THREE.Mesh(new THREE.SphereGeometry(0.2, 5, 4), sandMat);
      mound.scale.y = 0.2;
      mound.position.copy(burrow.position);
      mound.position.y = 0.03;
      this._scene.add(mound);
    }

    // ── Sun-bleached wagon wreck ──
    const wagonGroup = new THREE.Group();
    const bleachedMat = new THREE.MeshStandardMaterial({ color: 0xbbaa88, roughness: 0.9 });
    // Wagon bed (tilted)
    const wBed = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 1.2), bleachedMat);
    wBed.position.set(0, 0.3, 0);
    wBed.rotation.z = 0.2;
    wagonGroup.add(wBed);
    // Broken wheel
    const wWheel = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 4, 8), bleachedMat);
    wWheel.position.set(1, 0.4, 0.7);
    wWheel.rotation.x = Math.PI / 2;
    wWheel.rotation.z = 0.3;
    wagonGroup.add(wWheel);
    // Wheel on ground
    const wWheel2 = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 4, 8), bleachedMat);
    wWheel2.rotation.x = Math.PI / 2;
    wWheel2.position.set(-0.8, 0.06, -0.5);
    wagonGroup.add(wWheel2);
    // Scattered cargo
    for (let c = 0; c < 3; c++) {
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.25), new THREE.MeshStandardMaterial({ color: 0xaa9966 }));
      cargo.position.set((Math.random() - 0.5) * 2, 0.1, (Math.random() - 0.5) * 1.5);
      cargo.rotation.y = Math.random();
      wagonGroup.add(cargo);
    }
    wagonGroup.position.set(hw * 0.2, 0, hd * 0.15);
    this._scene.add(wagonGroup);

    // ── Desert rose crystal clusters ──
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0xddaa88, roughness: 0.4, metalness: 0.2 });
    for (let i = 0; i < 6; i++) {
      const cluster = new THREE.Group();
      const count = 3 + Math.floor(Math.random() * 3);
      for (let c = 0; c < count; c++) {
        const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2 + Math.random() * 0.15, 4), crystalMat);
        crystal.position.set((Math.random() - 0.5) * 0.2, 0.08, (Math.random() - 0.5) * 0.2);
        crystal.rotation.z = (Math.random() - 0.5) * 0.5;
        cluster.add(crystal);
      }
      cluster.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0,
        (Math.random() - 0.5) * d * 0.7,
      );
      this._scene.add(cluster);
    }

    // ── Snake tracks in sand ──
    const trackMat = new THREE.MeshStandardMaterial({ color: 0xb89050, roughness: 0.95 });
    for (let i = 0; i < 5; i++) {
      const track = new THREE.Group();
      for (let s = 0; s < 8; s++) {
        const seg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.01, 0.04), trackMat);
        seg.position.set(s * 0.35, 0.005, Math.sin(s * 0.8) * 0.15);
        seg.rotation.y = Math.cos(s * 0.8) * 0.3;
        track.add(seg);
      }
      track.position.set(
        (Math.random() - 0.5) * w * 0.6,
        0,
        (Math.random() - 0.5) * d * 0.6,
      );
      track.rotation.y = Math.random() * Math.PI;
      this._scene.add(track);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  //  EMERALD GRASSLANDS
  // ────────────────────────────────────────────────────────────────────────
  private _buildEmeraldGrasslands(w: number, d: number): void {
    this._scene.fog = new THREE.FogExp2(0xaaccaa, 0.006);
    this._applyTerrainColors(0x449922, 0x66bb44, 1.4);
    this._dirLight.color.setHex(0xfff5dd);
    this._dirLight.intensity = 1.6;
    this._ambientLight.color.setHex(0x336622);
    this._ambientLight.intensity = 0.7;
    this._hemiLight.color.setHex(0xbbdd88);
    this._hemiLight.groundColor.setHex(0x445522);
    const hw = w / 2, hd = d / 2;

    const grassDarkMat = new THREE.MeshStandardMaterial({ color: 0x448822, roughness: 0.85 });
    const grassLightMat = new THREE.MeshStandardMaterial({ color: 0x66bb44, roughness: 0.85 });
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.9 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.7 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x44aa22, roughness: 0.5, transparent: true, opacity: 0.7, depthWrite: false });
    const flowerColors = [0xff6688, 0xffdd44, 0xcc88ff, 0xff8844, 0x88ddff, 0xffaacc];
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x4488bb, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.65 });
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x9B7653, roughness: 0.8 });
    const hayMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xccaa55, roughness: 0.8 });

    // ── Gently rolling hills (low enough to walk over) ──
    for (let i = 0; i < 25; i++) {
      const sx = 10 + Math.random() * 18;
      const sy = 0.3 + Math.random() * 0.7;
      const sz = 10 + Math.random() * 18;
      const hill = new THREE.Mesh(
        new THREE.SphereGeometry(1, 12, 8),
        i % 2 === 0 ? grassDarkMat : grassLightMat,
      );
      hill.scale.set(sx, sy, sz);
      hill.position.set(
        (Math.random() - 0.5) * w * 0.9,
        sy * 0.3,
        (Math.random() - 0.5) * d * 0.9,
      );
      this._scene.add(hill);
    }

    // ── Wildflower patches ──
    for (let i = 0; i < 80; i++) {
      const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.12 + Math.random() * 0.15, 5, 5),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4 }),
      );
      flower.position.set(
        (Math.random() - 0.5) * w * 0.85,
        0.15 + Math.random() * 0.1,
        (Math.random() - 0.5) * d * 0.85,
      );
      this._scene.add(flower);
      // Stem
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.02, 0.2, 3),
        new THREE.MeshStandardMaterial({ color: 0x337722 }),
      );
      stem.position.set(flower.position.x, 0.05, flower.position.z);
      this._scene.add(stem);
    }

    // ── Deciduous trees (scattered) ──
    for (let i = 0; i < 30; i++) {
      const tree = new THREE.Group();
      const trunkH = 3 + Math.random() * 3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, trunkH, 6), woodMat);
      trunk.position.y = trunkH / 2;
      tree.add(trunk);
      // Canopy (multiple spheres)
      const canopyR = 1.5 + Math.random() * 2;
      for (let c = 0; c < 3; c++) {
        const canopy = new THREE.Mesh(
          new THREE.SphereGeometry(canopyR * (0.7 + Math.random() * 0.4), 8, 6),
          leafMat,
        );
        canopy.position.set(
          (Math.random() - 0.5) * canopyR * 0.6,
          trunkH + canopyR * 0.3 + (Math.random() - 0.5) * canopyR * 0.3,
          (Math.random() - 0.5) * canopyR * 0.6,
        );
        tree.add(canopy);
      }
      const trX = (Math.random() - 0.5) * w * 0.85;
      const trZ = (Math.random() - 0.5) * d * 0.85;
      tree.position.set(trX, getTerrainHeight(trX, trZ, 1.4), trZ);
      this._scene.add(tree);
    }

    // ── Creek / stream (winding water) ──
    const streamParts = 12;
    for (let i = 0; i < streamParts; i++) {
      const seg = new THREE.Mesh(
        new THREE.PlaneGeometry(3 + Math.random() * 2, 12),
        waterMat,
      );
      seg.rotation.x = -Math.PI / 2;
      const t = i / streamParts;
      seg.position.set(
        -hw * 0.5 + t * w * 0.7 + Math.sin(t * 6) * 8,
        0.04,
        -hd * 0.2 + Math.cos(t * 4) * 15,
      );
      seg.rotation.z = Math.atan2(Math.cos(t * 6) * 8, w * 0.7 / streamParts);
      this._scene.add(seg);
    }

    // ── Stone bridge over stream ──
    const bridgeX = 0, bridgeZ = -hd * 0.15;
    const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 3), stoneMat);
    bridgeDeck.position.set(bridgeX, 1.2, bridgeZ);
    this._scene.add(bridgeDeck);
    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 0.2), stoneMat);
    rail1.position.set(bridgeX, 1.8, bridgeZ - 1.4);
    this._scene.add(rail1);
    const rail2 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 0.2), stoneMat);
    rail2.position.set(bridgeX, 1.8, bridgeZ + 1.4);
    this._scene.add(rail2);
    // Arched support
    const archSupport = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.25, 6, 8, Math.PI), stoneMat);
    archSupport.rotation.y = Math.PI / 2;
    archSupport.position.set(bridgeX, 0.2, bridgeZ);
    this._scene.add(archSupport);

    // ── Hay bales ──
    for (let i = 0; i < 15; i++) {
      const hay = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 8), hayMat);
      hay.rotation.x = Math.PI / 2;
      const hayX = (Math.random() - 0.5) * w * 0.7;
      const hayZ = (Math.random() - 0.5) * d * 0.7;
      hay.position.set(hayX, getTerrainHeight(hayX, hayZ, 1.4) + 0.4, hayZ);
      hay.rotation.z = Math.random() * Math.PI;
      this._scene.add(hay);
    }

    // ── Farmstead (small hut + fences) ──
    const farmX = hw * 0.3, farmZ = -hd * 0.35;
    // Hut
    const hutWalls = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), new THREE.MeshStandardMaterial({ color: 0xbb9966, roughness: 0.8 }));
    hutWalls.position.set(farmX, 1.5, farmZ);
    this._scene.add(hutWalls);
    const hutRoof = new THREE.Mesh(new THREE.ConeGeometry(3.5, 2, 4), roofMat);
    hutRoof.position.set(farmX, 4, farmZ);
    hutRoof.rotation.y = Math.PI / 4;
    this._scene.add(hutRoof);
    // Door
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1, 2), new THREE.MeshStandardMaterial({ color: 0x553311 }));
    door.position.set(farmX, 1, farmZ + 2.01);
    this._scene.add(door);
    // Fences around farm
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const fenceR = 10;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), fenceMat);
      post.position.set(
        farmX + Math.cos(angle) * fenceR,
        0.6,
        farmZ + Math.sin(angle) * fenceR,
      );
      this._scene.add(post);
      // Horizontal rail
      if (i < 19) {
        const nextAngle = ((i + 1) / 20) * Math.PI * 2;
        const midX = farmX + Math.cos((angle + nextAngle) / 2) * fenceR;
        const midZ = farmZ + Math.sin((angle + nextAngle) / 2) * fenceR;
        const railLen = 2 * fenceR * Math.sin(Math.PI / 20);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.08, 0.08), fenceMat);
        rail.position.set(midX, 0.8, midZ);
        rail.rotation.y = -(angle + nextAngle) / 2 + Math.PI / 2;
        this._scene.add(rail);
      }
    }

    // ── Rock outcrops ──
    for (let i = 0; i < 12; i++) {
      const rockGroup = new THREE.Group();
      const cnt = 1 + Math.floor(Math.random() * 3);
      for (let r = 0; r < cnt; r++) {
        const rh = 0.6 + Math.random() * 2;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rh, 0), stoneMat);
        rock.scale.set(0.7 + Math.random() * 0.6, 0.5 + Math.random() * 0.5, 0.7 + Math.random() * 0.6);
        rock.position.set((Math.random() - 0.5) * 2, rh * 0.3, (Math.random() - 0.5) * 2);
        rockGroup.add(rock);
      }
      const roX = (Math.random() - 0.5) * w * 0.85;
      const roZ = (Math.random() - 0.5) * d * 0.85;
      rockGroup.position.set(roX, getTerrainHeight(roX, roZ, 1.4), roZ);
      this._scene.add(rockGroup);
    }

    // ── Dirt paths ──
    for (let i = 0; i < 4; i++) {
      const path = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 25 + Math.random() * 20),
        dirtMat,
      );
      path.rotation.x = -Math.PI / 2;
      path.rotation.z = Math.random() * Math.PI;
      path.position.set(
        (Math.random() - 0.5) * w * 0.5,
        0.01,
        (Math.random() - 0.5) * d * 0.5,
      );
      this._scene.add(path);
    }

    // ── Windmill ──
    const wmX = -hw * 0.35, wmZ = hd * 0.3;
    const wmBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 6, 8), new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.7 }));
    wmBase.position.set(wmX, 3, wmZ);
    this._scene.add(wmBase);
    const wmRoof = new THREE.Mesh(new THREE.ConeGeometry(2, 2, 8), new THREE.MeshStandardMaterial({ color: 0x885533, roughness: 0.8 }));
    wmRoof.position.set(wmX, 7, wmZ);
    this._scene.add(wmRoof);
    // Blades
    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.05), woodMat);
      blade.position.set(
        wmX + Math.cos(b * Math.PI / 2) * 2,
        6 + Math.sin(b * Math.PI / 2) * 2,
        wmZ - 1.6,
      );
      blade.rotation.z = b * Math.PI / 2;
      this._scene.add(blade);
    }

    // ── Campfire in open field ──
    const cfX = hw * 0.1, cfZ = hd * 0.2;
    const fireRing = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.2, 6, 10), stoneMat);
    fireRing.rotation.x = Math.PI / 2;
    fireRing.position.set(cfX, 0.2, cfZ);
    this._scene.add(fireRing);
    const fieldFire = new THREE.PointLight(0xff8833, 1.2, 10);
    fieldFire.position.set(cfX, 1.5, cfZ);
    this._scene.add(fieldFire);
    // Log seats
    for (let i = 0; i < 3; i++) {
      const logAngle = (i / 3) * Math.PI * 2 + 0.3;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.8, 6), woodMat);
      log.rotation.z = Math.PI / 2;
      log.position.set(
        cfX + Math.cos(logAngle) * 2.5,
        0.2,
        cfZ + Math.sin(logAngle) * 2.5,
      );
      log.rotation.y = logAngle;
      this._scene.add(log);
    }

    // ── Tall grass tufts ──
    const tGrassMat = new THREE.MeshStandardMaterial({ color: 0x77cc44, roughness: 0.6, side: THREE.DoubleSide });
    for (let i = 0; i < 60; i++) {
      const tuft = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.8 + Math.random() * 0.5), tGrassMat);
      tuft.position.set(
        (Math.random() - 0.5) * w * 0.85,
        0.3,
        (Math.random() - 0.5) * d * 0.85,
      );
      tuft.rotation.y = Math.random() * Math.PI;
      this._scene.add(tuft);
    }
  }

  dispose(): void {
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }

    this._scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            for (const mat of obj.material) {
              mat.dispose();
            }
          } else {
            obj.material.dispose();
          }
        }
      }
      if (obj instanceof THREE.Sprite) {
        if (obj.material) {
          if (obj.material.map) {
            obj.material.map.dispose();
          }
          obj.material.dispose();
        }
      }
    });

    this._sphereGeo.dispose();
    this._boxGeo.dispose();
    this._cylGeo.dispose();
    this._coneGeo.dispose();

    if (this._weaponMesh) {
      this._weaponMesh.geometry.dispose();
    }
    this._weaponMesh = null;
    this._enemyMeshes.clear();
    for (const [, mesh] of this._projectileMeshes) {
      this._scene.remove(mesh);
      mesh.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) ((child as THREE.Mesh).material as THREE.Material).dispose();
      });
    }
    this._projectileMeshes.clear();
    this._lootMeshes.clear();
    this._chestMeshes.clear();
    this._aoeMeshes.clear();
    this._floatTextSprites.clear();
    for (const [, mesh] of this._vendorMeshes) {
      this._scene.remove(mesh);
    }
    this._vendorMeshes.clear();

    for (const [, mesh] of this._townfolkMeshes) {
      this._scene.remove(mesh);
    }
    this._townfolkMeshes.clear();

    for (const mesh of this._particleMeshPool) {
      this._scene.remove(mesh);
      (mesh.material as THREE.MeshStandardMaterial).dispose();
    }
    this._particleMeshPool = [];

    this._renderer.dispose();
  }

  resize(w: number, h: number): void {
    this._renderer.setSize(w, h);
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
  }

  applyTimeOfDay(tod: TimeOfDay, mapId: DiabloMapId): void {
    // Adjust directional light position based on time
    switch (tod) {
      case TimeOfDay.DAY:
        this._dirLight.position.set(15, 25, 10);
        break;
      case TimeOfDay.DAWN:
        this._dirLight.position.set(25, 12, 10);
        break;
      case TimeOfDay.DUSK:
        this._dirLight.position.set(-25, 10, -10);
        break;
      case TimeOfDay.NIGHT:
        this._dirLight.position.set(10, 20, 15);
        break;
    }

    const groundMat = this._groundPlane.material as THREE.MeshStandardMaterial;

    if (mapId === DiabloMapId.FOREST) {
      switch (tod) {
        case TimeOfDay.DAY:
          this._dirLight.color.setHex(0xffe8b0);
          this._dirLight.intensity = 1.4;
          this._ambientLight.color.setHex(0x304020);
          this._ambientLight.intensity = 0.6;
          this._hemiLight.color.setHex(0x88aa66);
          this._hemiLight.groundColor.setHex(0x443322);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x2a4a2a);
          (this._scene.fog as THREE.FogExp2).density = 0.018;
          this._renderer.toneMappingExposure = 1.0;
          break;
        case TimeOfDay.DAWN:
          this._dirLight.color.setHex(0xffaa77);
          this._dirLight.intensity = 1.1;
          this._ambientLight.color.setHex(0x553322);
          this._ambientLight.intensity = 0.6;
          this._hemiLight.color.setHex(0xcc8866);
          this._hemiLight.groundColor.setHex(0x332211);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x443322);
          (this._scene.fog as THREE.FogExp2).density = 0.015;
          groundMat.color.setHex(0x4a5a30);
          this._renderer.toneMappingExposure = 0.95;
          break;
        case TimeOfDay.DUSK:
          this._dirLight.color.setHex(0xff6633);
          this._dirLight.intensity = 0.8;
          this._ambientLight.color.setHex(0x331a10);
          this._ambientLight.intensity = 0.6;
          this._hemiLight.color.setHex(0x995533);
          this._hemiLight.groundColor.setHex(0x221111);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x331a15);
          (this._scene.fog as THREE.FogExp2).density = 0.022;
          groundMat.color.setHex(0x3a4a25);
          this._renderer.toneMappingExposure = 0.85;
          break;
        case TimeOfDay.NIGHT:
          this._dirLight.color.setHex(0x4466aa);
          this._dirLight.intensity = 0.4;
          this._ambientLight.color.setHex(0x0a0a1a);
          this._ambientLight.intensity = 0.6;
          this._hemiLight.color.setHex(0x223355);
          this._hemiLight.groundColor.setHex(0x111108);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x0a1a0a);
          (this._scene.fog as THREE.FogExp2).density = 0.025;
          groundMat.color.setHex(0x1a2a15);
          this._renderer.toneMappingExposure = 0.6;
          break;
      }
    } else if (mapId === DiabloMapId.ELVEN_VILLAGE) {
      switch (tod) {
        case TimeOfDay.DAY:
          this._dirLight.color.setHex(0xaabbdd);
          this._dirLight.intensity = 0.8;
          this._ambientLight.color.setHex(0x334466);
          this._ambientLight.intensity = 0.6;
          this._hemiLight.color.setHex(0x6688bb);
          this._hemiLight.groundColor.setHex(0x223322);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x334466);
          (this._scene.fog as THREE.FogExp2).density = 0.012;
          this._renderer.toneMappingExposure = 1.0;
          break;
        case TimeOfDay.DAWN:
          this._dirLight.color.setHex(0xddaa88);
          this._dirLight.intensity = 0.7;
          this._ambientLight.color.setHex(0x443333);
          this._ambientLight.intensity = 0.6;
          this._hemiLight.color.setHex(0xaa7766);
          this._hemiLight.groundColor.setHex(0x332222);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x443333);
          (this._scene.fog as THREE.FogExp2).density = 0.014;
          groundMat.color.setHex(0x556644);
          this._renderer.toneMappingExposure = 0.9;
          break;
        case TimeOfDay.DUSK:
          this._dirLight.color.setHex(0xcc6644);
          this._dirLight.intensity = 0.5;
          this._ambientLight.color.setHex(0x2a1a2a);
          this._ambientLight.intensity = 0.6;
          this._hemiLight.color.setHex(0x774433);
          this._hemiLight.groundColor.setHex(0x1a1122);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x2a1a2a);
          (this._scene.fog as THREE.FogExp2).density = 0.018;
          groundMat.color.setHex(0x3a5a3a);
          this._renderer.toneMappingExposure = 0.8;
          break;
        case TimeOfDay.NIGHT:
          this._dirLight.color.setHex(0x3355aa);
          this._dirLight.intensity = 0.35;
          this._ambientLight.color.setHex(0x0a0a22);
          this._ambientLight.intensity = 0.6;
          this._hemiLight.color.setHex(0x223366);
          this._hemiLight.groundColor.setHex(0x0a0a10);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x0a1022);
          (this._scene.fog as THREE.FogExp2).density = 0.02;
          groundMat.color.setHex(0x2a3a2a);
          this._renderer.toneMappingExposure = 0.6;
          break;
      }
    } else if (mapId === DiabloMapId.NECROPOLIS_DUNGEON) {
      switch (tod) {
        case TimeOfDay.DAY:
          this._dirLight.color.setHex(0x99aacc);
          this._dirLight.intensity = 0.9;
          this._ambientLight.color.setHex(0x443355);
          this._ambientLight.intensity = 0.7;
          this._hemiLight.color.setHex(0x667799);
          this._hemiLight.groundColor.setHex(0x332233);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x332244);
          (this._scene.fog as THREE.FogExp2).density = 0.015;
          this._renderer.toneMappingExposure = 1.1;
          break;
        case TimeOfDay.DAWN:
          this._dirLight.color.setHex(0x664444);
          this._dirLight.intensity = 0.35;
          this._ambientLight.color.setHex(0x1a0c10);
          this._ambientLight.intensity = 0.35;
          this._hemiLight.color.setHex(0x332222);
          this._hemiLight.groundColor.setHex(0x110808);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x150a10);
          (this._scene.fog as THREE.FogExp2).density = 0.028;
          this._renderer.toneMappingExposure = 0.8;
          break;
        case TimeOfDay.DUSK:
          this._dirLight.color.setHex(0x553344);
          this._dirLight.intensity = 0.25;
          this._ambientLight.color.setHex(0x110810);
          this._ambientLight.intensity = 0.25;
          this._hemiLight.color.setHex(0x221122);
          this._hemiLight.groundColor.setHex(0x0a0505);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x0d060a);
          (this._scene.fog as THREE.FogExp2).density = 0.032;
          this._renderer.toneMappingExposure = 0.7;
          break;
        case TimeOfDay.NIGHT:
          this._dirLight.color.setHex(0x221133);
          this._dirLight.intensity = 0.15;
          this._ambientLight.color.setHex(0x080408);
          this._ambientLight.intensity = 0.15;
          this._hemiLight.color.setHex(0x110818);
          this._hemiLight.groundColor.setHex(0x050303);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x080410);
          (this._scene.fog as THREE.FogExp2).density = 0.035;
          groundMat.color.setHex(0x0e0e16);
          this._renderer.toneMappingExposure = 0.5;
          break;
      }
    } else if (mapId === DiabloMapId.VOLCANIC_WASTES) {
      switch (tod) {
        case TimeOfDay.DAY:
          this._dirLight.color.setHex(0xffaa66);
          this._dirLight.intensity = 1.4;
          this._ambientLight.color.setHex(0x663322);
          this._ambientLight.intensity = 0.7;
          (this._scene.fog as THREE.FogExp2).color.setHex(0x553322);
          (this._scene.fog as THREE.FogExp2).density = 0.012;
          this._renderer.toneMappingExposure = 1.15;
          break;
        case TimeOfDay.DAWN:
          this._dirLight.color.setHex(0xff8844);
          this._dirLight.intensity = 0.8;
          this._ambientLight.color.setHex(0x331100);
          this._ambientLight.intensity = 0.45;
          (this._scene.fog as THREE.FogExp2).color.setHex(0x441500);
          (this._scene.fog as THREE.FogExp2).density = 0.018;
          this._renderer.toneMappingExposure = 0.9;
          break;
        case TimeOfDay.DUSK:
          this._dirLight.color.setHex(0xcc3311);
          this._dirLight.intensity = 0.6;
          this._ambientLight.color.setHex(0x220800);
          this._ambientLight.intensity = 0.4;
          (this._scene.fog as THREE.FogExp2).color.setHex(0x220800);
          (this._scene.fog as THREE.FogExp2).density = 0.025;
          this._renderer.toneMappingExposure = 0.8;
          break;
        case TimeOfDay.NIGHT:
          this._dirLight.color.setHex(0x882200);
          this._dirLight.intensity = 0.3;
          this._ambientLight.color.setHex(0x110400);
          this._ambientLight.intensity = 0.3;
          (this._scene.fog as THREE.FogExp2).color.setHex(0x110400);
          (this._scene.fog as THREE.FogExp2).density = 0.03;
          this._renderer.toneMappingExposure = 0.6;
          break;
      }
    } else if (mapId === DiabloMapId.ABYSSAL_RIFT) {
      switch (tod) {
        case TimeOfDay.DAY:
          this._dirLight.color.setHex(0x9977cc);
          this._dirLight.intensity = 1.0;
          this._ambientLight.color.setHex(0x332266);
          this._ambientLight.intensity = 0.65;
          (this._scene.fog as THREE.FogExp2).color.setHex(0x1a1040);
          (this._scene.fog as THREE.FogExp2).density = 0.02;
          this._renderer.toneMappingExposure = 1.15;
          break;
        case TimeOfDay.DAWN:
          this._dirLight.color.setHex(0x8855bb);
          this._dirLight.intensity = 0.5;
          this._ambientLight.color.setHex(0x0d0022);
          this._ambientLight.intensity = 0.35;
          (this._scene.fog as THREE.FogExp2).color.setHex(0x0d0025);
          (this._scene.fog as THREE.FogExp2).density = 0.032;
          this._renderer.toneMappingExposure = 0.85;
          break;
        case TimeOfDay.DUSK:
          this._dirLight.color.setHex(0x442266);
          this._dirLight.intensity = 0.35;
          this._ambientLight.color.setHex(0x080015);
          this._ambientLight.intensity = 0.25;
          (this._scene.fog as THREE.FogExp2).color.setHex(0x060012);
          (this._scene.fog as THREE.FogExp2).density = 0.04;
          this._renderer.toneMappingExposure = 0.7;
          break;
        case TimeOfDay.NIGHT:
          this._dirLight.color.setHex(0x220044);
          this._dirLight.intensity = 0.2;
          this._ambientLight.color.setHex(0x04000a);
          this._ambientLight.intensity = 0.15;
          (this._scene.fog as THREE.FogExp2).color.setHex(0x030008);
          (this._scene.fog as THREE.FogExp2).density = 0.045;
          this._renderer.toneMappingExposure = 0.5;
          break;
      }
    } else if (mapId === DiabloMapId.DRAGONS_SANCTUM) {
      switch (tod) {
        case TimeOfDay.DAY:
          this._dirLight.color.setHex(0xffcc66);
          this._dirLight.intensity = 1.5;
          this._ambientLight.color.setHex(0x554422);
          this._ambientLight.intensity = 0.7;
          (this._scene.fog as THREE.FogExp2).color.setHex(0x443322);
          (this._scene.fog as THREE.FogExp2).density = 0.01;
          this._renderer.toneMappingExposure = 1.15;
          break;
        case TimeOfDay.DAWN:
          this._dirLight.color.setHex(0xdd8833);
          this._dirLight.intensity = 0.9;
          this._ambientLight.color.setHex(0x221800);
          this._ambientLight.intensity = 0.45;
          (this._scene.fog as THREE.FogExp2).color.setHex(0x2a1500);
          (this._scene.fog as THREE.FogExp2).density = 0.013;
          this._renderer.toneMappingExposure = 0.9;
          break;
        case TimeOfDay.DUSK:
          this._dirLight.color.setHex(0xbb5522);
          this._dirLight.intensity = 0.6;
          this._ambientLight.color.setHex(0x1a0c00);
          this._ambientLight.intensity = 0.35;
          (this._scene.fog as THREE.FogExp2).color.setHex(0x150a00);
          (this._scene.fog as THREE.FogExp2).density = 0.02;
          this._renderer.toneMappingExposure = 0.8;
          break;
        case TimeOfDay.NIGHT:
          this._dirLight.color.setHex(0x553311);
          this._dirLight.intensity = 0.3;
          this._ambientLight.color.setHex(0x0a0500);
          this._ambientLight.intensity = 0.2;
          (this._scene.fog as THREE.FogExp2).color.setHex(0x080400);
          (this._scene.fog as THREE.FogExp2).density = 0.025;
          this._renderer.toneMappingExposure = 0.6;
          break;
      }
    } else if (mapId === DiabloMapId.SUNSCORCH_DESERT) {
      switch (tod) {
        case TimeOfDay.DAY:
          this._dirLight.color.setHex(0xffeebb);
          this._dirLight.intensity = 1.8;
          this._ambientLight.color.setHex(0x665533);
          this._ambientLight.intensity = 0.7;
          this._hemiLight.color.setHex(0xeedd99);
          this._hemiLight.groundColor.setHex(0x886644);
          (this._scene.fog as THREE.FogExp2).color.setHex(0xddcc99);
          (this._scene.fog as THREE.FogExp2).density = 0.008;
          this._renderer.toneMappingExposure = 1.1;
          break;
        case TimeOfDay.DAWN:
          this._dirLight.color.setHex(0xffaa77);
          this._dirLight.intensity = 1.2;
          this._ambientLight.color.setHex(0x553322);
          this._ambientLight.intensity = 0.55;
          this._hemiLight.color.setHex(0xcc9966);
          this._hemiLight.groundColor.setHex(0x553322);
          (this._scene.fog as THREE.FogExp2).color.setHex(0xbb9966);
          (this._scene.fog as THREE.FogExp2).density = 0.01;
          groundMat.color.setHex(0xb89960);
          this._renderer.toneMappingExposure = 0.95;
          break;
        case TimeOfDay.DUSK:
          this._dirLight.color.setHex(0xff6633);
          this._dirLight.intensity = 0.9;
          this._ambientLight.color.setHex(0x442211);
          this._ambientLight.intensity = 0.45;
          this._hemiLight.color.setHex(0x995533);
          this._hemiLight.groundColor.setHex(0x331a10);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x885533);
          (this._scene.fog as THREE.FogExp2).density = 0.012;
          groundMat.color.setHex(0xa08850);
          this._renderer.toneMappingExposure = 0.85;
          break;
        case TimeOfDay.NIGHT:
          this._dirLight.color.setHex(0x4466aa);
          this._dirLight.intensity = 0.4;
          this._ambientLight.color.setHex(0x111122);
          this._ambientLight.intensity = 0.3;
          this._hemiLight.color.setHex(0x223355);
          this._hemiLight.groundColor.setHex(0x111108);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x151525);
          (this._scene.fog as THREE.FogExp2).density = 0.015;
          groundMat.color.setHex(0x665540);
          this._renderer.toneMappingExposure = 0.6;
          break;
      }
    } else if (mapId === DiabloMapId.EMERALD_GRASSLANDS) {
      switch (tod) {
        case TimeOfDay.DAY:
          this._dirLight.color.setHex(0xfff5dd);
          this._dirLight.intensity = 1.6;
          this._ambientLight.color.setHex(0x336622);
          this._ambientLight.intensity = 0.7;
          this._hemiLight.color.setHex(0xbbdd88);
          this._hemiLight.groundColor.setHex(0x445522);
          (this._scene.fog as THREE.FogExp2).color.setHex(0xaaccaa);
          (this._scene.fog as THREE.FogExp2).density = 0.006;
          this._renderer.toneMappingExposure = 1.1;
          break;
        case TimeOfDay.DAWN:
          this._dirLight.color.setHex(0xffbb88);
          this._dirLight.intensity = 1.1;
          this._ambientLight.color.setHex(0x443322);
          this._ambientLight.intensity = 0.55;
          this._hemiLight.color.setHex(0xcc9966);
          this._hemiLight.groundColor.setHex(0x332211);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x889966);
          (this._scene.fog as THREE.FogExp2).density = 0.008;
          groundMat.color.setHex(0x4a8a2a);
          this._renderer.toneMappingExposure = 0.95;
          break;
        case TimeOfDay.DUSK:
          this._dirLight.color.setHex(0xff7744);
          this._dirLight.intensity = 0.8;
          this._ambientLight.color.setHex(0x332211);
          this._ambientLight.intensity = 0.4;
          this._hemiLight.color.setHex(0x996633);
          this._hemiLight.groundColor.setHex(0x221a10);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x554433);
          (this._scene.fog as THREE.FogExp2).density = 0.01;
          groundMat.color.setHex(0x3a7a2a);
          this._renderer.toneMappingExposure = 0.85;
          break;
        case TimeOfDay.NIGHT:
          this._dirLight.color.setHex(0x3355aa);
          this._dirLight.intensity = 0.35;
          this._ambientLight.color.setHex(0x0a0a1a);
          this._ambientLight.intensity = 0.25;
          this._hemiLight.color.setHex(0x223355);
          this._hemiLight.groundColor.setHex(0x0a0a08);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x0a1a0a);
          (this._scene.fog as THREE.FogExp2).density = 0.012;
          groundMat.color.setHex(0x1a3a15);
          this._renderer.toneMappingExposure = 0.6;
          break;
      }
    }

  }

  setPlayerLantern(on: boolean, intensity = 0, distance = 0, color = 0xffaa55): void {
    if (!this._playerLantern) return;
    if (on) {
      this._playerLantern.intensity = intensity;
      this._playerLantern.distance = distance;
      this._playerLantern.color.setHex(color);
    } else {
      this._playerLantern.intensity = 0;
    }
  }
}
