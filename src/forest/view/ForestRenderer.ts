// ---------------------------------------------------------------------------
// Forest of Camelot — Three.js 3D renderer
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { FOREST } from "../config/ForestConfig";
import type { ForestState, Enemy, Season } from "../state/ForestState";

// ---- Forest Color Palette ----
const COL = {
  // Ground
  GROUND_SPRING: 0x2a6622,
  GROUND_SUMMER: 0x447733,
  GROUND_AUTUMN: 0x664422,
  GROUND_WINTER: 0xccddee,
  // Sky
  SKY_SPRING_TOP: 0x88ccff,
  SKY_SPRING_BOT: 0xddffdd,
  SKY_SUMMER_TOP: 0x4488cc,
  SKY_SUMMER_BOT: 0xffddaa,
  SKY_AUTUMN_TOP: 0x886644,
  SKY_AUTUMN_BOT: 0xcc8844,
  SKY_WINTER_TOP: 0x445566,
  SKY_WINTER_BOT: 0x99aabb,
  // Trees
  TREE_OAK_TRUNK: 0x553311,
  TREE_OAK_LEAVES_SPRING: 0x44aa44,
  TREE_OAK_LEAVES_SUMMER: 0x227722,
  TREE_OAK_LEAVES_AUTUMN: 0xcc6622,
  TREE_OAK_LEAVES_WINTER: 0x887766,
  TREE_PINE: 0x225522,
  TREE_BIRCH_TRUNK: 0xddddcc,
  TREE_WILLOW: 0x44aa66,
  TREE_CORRUPTED: 0x331133,
  // Great Oak
  GREAT_OAK_TRUNK: 0x664422,
  GREAT_OAK_LEAVES: 0x44cc44,
  GREAT_OAK_GLOW: 0x88ff88,
  // Groves
  GROVE_PURE: 0x44ff88,
  GROVE_CORRUPTED: 0x662244,
  // Enemies
  BLIGHTLING: 0x553355,
  ROT_ARCHER: 0x445533,
  BARK_GOLEM: 0x554422,
  SHADOW_STAG: 0x333355,
  BLIGHT_MOTHER: 0x662244,
  WISP_CORRUPTOR: 0x884488,
  // Player
  GREEN_KNIGHT: 0x336633,
  GREEN_KNIGHT_ARMOR: 0x445544,
  // Wisp
  WISP_ALLY: 0x88ffcc,
  // Effects
  ESSENCE_GREEN: 0x44ff88,
  HEAL_SAP: 0x88cc44,
  THORN: 0x556633,
};

export class ForestRenderer {
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
  private _skyTopColor = new THREE.Color(COL.SKY_SPRING_TOP);
  private _skyBotColor = new THREE.Color(COL.SKY_SPRING_BOT);
  private _targetSkyTop = new THREE.Color(COL.SKY_SPRING_TOP);
  private _targetSkyBot = new THREE.Color(COL.SKY_SPRING_BOT);
  private _starPoints!: THREE.Points;
  private _starBaseSizes!: Float32Array;

  // Moon
  private _moonMesh!: THREE.Mesh;
  private _moonGlow1!: THREE.Mesh;
  private _moonGlow2!: THREE.Mesh;

  // Aurora
  private _auroraMesh!: THREE.Mesh;
  private _auroraUniforms!: { time: THREE.IUniform; color1: THREE.IUniform; color2: THREE.IUniform };

  // Ground fog layers
  private _groundFogLayers: THREE.Mesh[] = [];

  // Clouds
  private _cloudMeshes: THREE.Mesh[] = [];

  // Mushroom/plant ambient lights
  private _ambientLights: THREE.PointLight[] = [];

  // Ground
  private _groundMesh!: THREE.Mesh;
  private _groundMat!: THREE.MeshStandardMaterial;
  private _groundDetailMesh!: THREE.InstancedMesh;
  private _flowerMesh!: THREE.InstancedMesh;

  // Great Oak
  private _greatOakGroup!: THREE.Group;
  private _greatOakGlow!: THREE.PointLight;
  private _oakCrackOverlay!: THREE.Mesh;

  // Grove markers
  private _groveMeshes: THREE.Group[] = [];
  private _groveLights: THREE.PointLight[] = [];

  // Root nodes
  private _rootNodeMeshes: THREE.Mesh[] = [];

  // Trees
  private _treeMeshes: THREE.Group[] = [];
  private _treeLeafMats: THREE.MeshStandardMaterial[] = [];

  // Player
  private _playerGroup!: THREE.Group;
  private _staffSwingAngle = 0;
  private _staffSwingTarget = 0;

  // Enemies
  private _enemyMeshes: Map<string, THREE.Group> = new Map();
  private _enemyScales: Map<string, number> = new Map();

  // Wisp allies
  private _wispMeshes: Map<string, THREE.Mesh> = new Map();

  // Instanced meshes
  private _particleMesh!: THREE.InstancedMesh;
  private _essenceOrbMesh!: THREE.InstancedMesh;
  private _healSapMesh!: THREE.InstancedMesh;
  private _projectileMesh!: THREE.InstancedMesh;

  // Fog
  private _fog!: THREE.FogExp2;

  // Corruption overlay
  private _corruptionOverlay!: THREE.Mesh;

  // Spell effects
  private _rootCrushCrater: THREE.Mesh | null = null;
  private _rootCrushLife = 0;
  private _vineSnareRing: THREE.Mesh | null = null;
  private _vineSnareLife = 0;
  private _leafStormRing!: THREE.Mesh;
  private _leafStormMat!: THREE.MeshBasicMaterial;
  // Atmospheric
  private _godRay!: THREE.Mesh;
  private _godRayMat!: THREE.MeshBasicMaterial;
  private _fireflyMesh!: THREE.InstancedMesh;
  private _fireflyData: { pos: THREE.Vector3; vel: THREE.Vector3; phase: number }[] = [];

  // Dodge afterimage
  private _afterimages: { mesh: THREE.Mesh; life: number }[] = [];

  // Pond
  private _pondMesh!: THREE.Mesh;
  private _pondMat!: THREE.MeshStandardMaterial;

  // Staff trail
  private _staffTrail: THREE.Mesh | null = null;
  private _staffTrailLife = 0;

  // Ground paths
  private _pathMeshes: THREE.Mesh[] = [];

  // Camera FOV target
  private _targetFOV = FOREST.CAMERA_FOV;

  get canvas(): HTMLCanvasElement { return this._canvas; }

  init(w: number, h: number): void {
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.0;
    this._canvas = this._renderer.domElement;
    this._canvas.style.cssText = "position:fixed;top:0;left:0;z-index:5;";

    this._scene = new THREE.Scene();

    // Camera
    this._camera = new THREE.PerspectiveCamera(FOREST.CAMERA_FOV, w / h, 0.5, 500);
    this._camera.position.set(0, 10, 20);

    // Fog
    this._fog = new THREE.FogExp2(0x446644, FOREST.FOG_DENSITY_BASE);
    this._scene.fog = this._fog;

    // Lights
    this._ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this._scene.add(this._ambientLight);

    this._sunLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    this._sunLight.position.set(30, 50, 20);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(2048, 2048);
    this._sunLight.shadow.camera.near = 1;
    this._sunLight.shadow.camera.far = 150;
    this._sunLight.shadow.camera.left = -60;
    this._sunLight.shadow.camera.right = 60;
    this._sunLight.shadow.camera.top = 60;
    this._sunLight.shadow.camera.bottom = -60;
    this._scene.add(this._sunLight);

    this._hemiLight = new THREE.HemisphereLight(0x88ccff, 0x224422, 0.3);
    this._scene.add(this._hemiLight);

    this._buildGround();
    this._buildGreatOak();
    this._buildGroves();
    this._buildRootNodes();
    this._buildPlayer();
    this._buildInstancedMeshes();
    this._buildSky();
    this._buildMoon();
    this._buildAurora();
    this._buildGroundFog();
    this._buildClouds();
    this._buildCorruptionOverlay();
    this._buildSpellEffects();
    this._buildAtmosphere();
  }

  private _buildGround(): void {
    this._groundMat = new THREE.MeshStandardMaterial({
      color: COL.GROUND_SPRING,
      roughness: 0.9,
      metalness: 0,
    });
    this._groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(FOREST.GROUND_SIZE, FOREST.GROUND_SIZE, 32, 32),
      this._groundMat,
    );
    this._groundMesh.rotation.x = -Math.PI / 2;
    this._groundMesh.receiveShadow = true;

    // Slight terrain undulation
    const geo = this._groundMesh.geometry;
    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 0.5;
      posAttr.setZ(i, z);
    }
    geo.computeVertexNormals();
    this._scene.add(this._groundMesh);

    // Scattered ground detail (rocks, flowers)
    const detailGeo = new THREE.DodecahedronGeometry(0.3, 0);
    const detailMat = new THREE.MeshStandardMaterial({ color: 0x667766, roughness: 0.95 });
    this._groundDetailMesh = new THREE.InstancedMesh(detailGeo, detailMat, 200);
    this._groundDetailMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const detailDummy = new THREE.Object3D();
    for (let i = 0; i < 200; i++) {
      const x = (Math.random() - 0.5) * FOREST.GROUND_SIZE * 0.85;
      const z = (Math.random() - 0.5) * FOREST.GROUND_SIZE * 0.85;
      // Skip near center
      if (Math.sqrt(x * x + z * z) < 15) continue;
      detailDummy.position.set(x, Math.random() * 0.15, z);
      detailDummy.scale.setScalar(0.3 + Math.random() * 0.5);
      detailDummy.rotation.set(Math.random(), Math.random(), Math.random());
      detailDummy.updateMatrix();
      this._groundDetailMesh.setMatrixAt(i, detailDummy.matrix);
      // Color variation: grey rocks + some green moss
      const rockColor = Math.random() < 0.3 ? 0x556644 : 0x667766;
      this._groundDetailMesh.setColorAt(i, new THREE.Color(rockColor));
    }
    this._groundDetailMesh.instanceMatrix.needsUpdate = true;
    if (this._groundDetailMesh.instanceColor) this._groundDetailMesh.instanceColor.needsUpdate = true;
    this._groundDetailMesh.receiveShadow = true;
    this._scene.add(this._groundDetailMesh);

    // Seasonal flower patches (visible in spring)
    const flowerGeo = new THREE.ConeGeometry(0.15, 0.3, 10);
    const flowerMat = new THREE.MeshBasicMaterial({ color: 0xff88aa, transparent: true, opacity: 0.9 });
    this._flowerMesh = new THREE.InstancedMesh(flowerGeo, flowerMat, 150);
    this._flowerMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const flowerDummy = new THREE.Object3D();
    for (let i = 0; i < 150; i++) {
      const x = (Math.random() - 0.5) * FOREST.GROUND_SIZE * 0.7;
      const z = (Math.random() - 0.5) * FOREST.GROUND_SIZE * 0.7;
      if (Math.sqrt(x * x + z * z) < 12) continue;
      flowerDummy.position.set(x, 0.15, z);
      flowerDummy.scale.setScalar(0.5 + Math.random() * 0.8);
      flowerDummy.updateMatrix();
      this._flowerMesh.setMatrixAt(i, flowerDummy.matrix);
      const fColors = [0xff88aa, 0xffaa66, 0xffff88, 0xaa88ff, 0xff6688];
      this._flowerMesh.setColorAt(i, new THREE.Color(fColors[Math.floor(Math.random() * fColors.length)]));
    }
    this._flowerMesh.instanceMatrix.needsUpdate = true;
    if (this._flowerMesh.instanceColor) this._flowerMesh.instanceColor.needsUpdate = true;
    this._scene.add(this._flowerMesh);

    // Small pond near the Great Oak
    this._pondMat = new THREE.MeshStandardMaterial({
      color: 0x224466, roughness: 0.1, metalness: 0.8,
      transparent: true, opacity: 0.7,
    });
    this._pondMesh = new THREE.Mesh(
      new THREE.CircleGeometry(5, 24),
      this._pondMat,
    );
    this._pondMesh.rotation.x = -Math.PI / 2;
    this._pondMesh.position.set(12, 0.03, 10);
    this._scene.add(this._pondMesh);

    // Lily pads
    const lilyMat = new THREE.MeshStandardMaterial({ color: 0x338833, roughness: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 3;
      const lily = new THREE.Mesh(new THREE.CircleGeometry(0.4 + Math.random() * 0.3, 8), lilyMat);
      lily.rotation.x = -Math.PI / 2;
      lily.position.set(12 + Math.cos(angle) * r, 0.05, 10 + Math.sin(angle) * r);
      this._scene.add(lily);
    }

    // Dirt paths from Great Oak to each grove
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x554433, roughness: 0.95, metalness: 0,
    });
    const spread = FOREST.GROVE_SPREAD;
    const grovePos = [
      { x: spread, z: 0 }, { x: -spread, z: 0 },
      { x: 0, z: spread }, { x: 0, z: -spread },
    ];
    for (const gp of grovePos) {
      const len = Math.sqrt(gp.x * gp.x + gp.z * gp.z);
      const angle = Math.atan2(gp.x, gp.z);
      const pathGeo = new THREE.PlaneGeometry(2.5, len - 12, 1, 8);
      const path = new THREE.Mesh(pathGeo, pathMat);
      path.rotation.x = -Math.PI / 2;
      path.rotation.z = -angle;
      path.position.set(gp.x * 0.5, 0.015, gp.z * 0.5);
      path.receiveShadow = true;
      this._scene.add(path);
      this._pathMeshes.push(path);
    }
  }

  private _buildGreatOak(): void {
    this._greatOakGroup = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(2, 3.5, FOREST.GREAT_OAK_HEIGHT * 0.6, 12);
    const trunkMat = new THREE.MeshStandardMaterial({ color: COL.GREAT_OAK_TRUNK, roughness: 0.95 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = FOREST.GREAT_OAK_HEIGHT * 0.3;
    trunk.castShadow = true;
    this._greatOakGroup.add(trunk);

    // Canopy (multiple spheres for organic look)
    const canopyMat = new THREE.MeshStandardMaterial({ color: COL.GREAT_OAK_LEAVES, roughness: 0.8 });
    const canopyPositions = [
      { x: 0, y: FOREST.GREAT_OAK_HEIGHT * 0.7, z: 0, r: 8 },
      { x: 3, y: FOREST.GREAT_OAK_HEIGHT * 0.65, z: 2, r: 5 },
      { x: -4, y: FOREST.GREAT_OAK_HEIGHT * 0.65, z: -1, r: 6 },
      { x: 1, y: FOREST.GREAT_OAK_HEIGHT * 0.8, z: -3, r: 5 },
      { x: -2, y: FOREST.GREAT_OAK_HEIGHT * 0.75, z: 4, r: 5 },
    ];
    for (const cp of canopyPositions) {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(cp.r, 16, 12), canopyMat);
      sphere.position.set(cp.x, cp.y, cp.z);
      sphere.castShadow = true;
      this._greatOakGroup.add(sphere);
    }

    // Roots (thick cylinders at base)
    const rootMat = new THREE.MeshStandardMaterial({ color: 0x553318, roughness: 0.95 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rootGeo = new THREE.CylinderGeometry(0.4, 0.8, 6, 12);
      const root = new THREE.Mesh(rootGeo, rootMat);
      root.position.set(Math.cos(angle) * 4, 1, Math.sin(angle) * 4);
      root.rotation.z = angle + Math.PI / 2;
      root.rotation.x = Math.PI / 4;
      this._greatOakGroup.add(root);
    }

    // Hanging vines from canopy
    const vineMat = new THREE.MeshStandardMaterial({ color: 0x336633, roughness: 0.9, side: THREE.DoubleSide });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const vineLen = 4 + Math.random() * 6;
      const vine = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, vineLen, 1, 4),
        vineMat,
      );
      const r = 4 + Math.random() * 4;
      vine.position.set(
        Math.cos(angle) * r,
        FOREST.GREAT_OAK_HEIGHT * 0.6 - vineLen / 2,
        Math.sin(angle) * r,
      );
      vine.rotation.y = angle;
      this._greatOakGroup.add(vine);
    }

    // Glowing runes on trunk (small emissive planes)
    const runeMat = new THREE.MeshBasicMaterial({
      color: 0x88ff88, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2), runeMat);
      rune.position.set(
        Math.cos(angle) * 2.8,
        3 + i * 2.5,
        Math.sin(angle) * 2.8,
      );
      rune.rotation.y = angle + Math.PI;
      rune.userData.runePhase = i * 0.5;
      this._greatOakGroup.add(rune);
    }

    // Mushrooms at base
    const mushMat = new THREE.MeshStandardMaterial({ color: 0xcc8855, roughness: 0.7 });
    const mushCapMat = new THREE.MeshStandardMaterial({ color: 0xdd4444, roughness: 0.6 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.3;
      const mushGroup = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 10), mushMat);
      stem.position.y = 0.15;
      mushGroup.add(stem);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), mushCapMat);
      cap.position.y = 0.3;
      mushGroup.add(cap);
      mushGroup.position.set(Math.cos(angle) * 5, 0, Math.sin(angle) * 5);
      mushGroup.scale.setScalar(0.8 + Math.random() * 0.6);
      this._greatOakGroup.add(mushGroup);
    }

    // Glow
    this._greatOakGlow = new THREE.PointLight(COL.GREAT_OAK_GLOW, 2, 30);
    this._greatOakGlow.position.y = FOREST.GREAT_OAK_HEIGHT * 0.5;
    this._greatOakGroup.add(this._greatOakGlow);

    // Crack overlay (visible when damaged)
    const crackGeo = new THREE.CylinderGeometry(2.1, 3.6, FOREST.GREAT_OAK_HEIGHT * 0.6, 12);
    const crackMat = new THREE.MeshStandardMaterial({ color: 0x331133, transparent: true, opacity: 0 });
    this._oakCrackOverlay = new THREE.Mesh(crackGeo, crackMat);
    this._oakCrackOverlay.position.y = FOREST.GREAT_OAK_HEIGHT * 0.3;
    this._greatOakGroup.add(this._oakCrackOverlay);

    this._scene.add(this._greatOakGroup);
  }

  private _buildGroves(): void {
    const spread = FOREST.GROVE_SPREAD;
    const positions = [
      { x: spread, y: 0, z: 0 },
      { x: -spread, y: 0, z: 0 },
      { x: 0, y: 0, z: spread },
      { x: 0, y: 0, z: -spread },
    ];

    for (const pos of positions) {
      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);

      // Stone circle
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const stone = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 1.5 + Math.random(), 0.6),
          new THREE.MeshStandardMaterial({ color: 0x667766, roughness: 0.9 }),
        );
        stone.position.set(Math.cos(angle) * FOREST.GROVE_RADIUS, 0.5, Math.sin(angle) * FOREST.GROVE_RADIUS);
        stone.rotation.y = angle;
        stone.castShadow = true;
        group.add(stone);
      }

      // Central crystal/tree
      const crystal = new THREE.Mesh(
        new THREE.ConeGeometry(0.6, 3, 12),
        new THREE.MeshStandardMaterial({ color: COL.GROVE_PURE, emissive: COL.GROVE_PURE, emissiveIntensity: 0.3 }),
      );
      crystal.position.y = 1.5;
      group.add(crystal);

      // Grove light
      const light = new THREE.PointLight(COL.GROVE_PURE, 1.5, 15);
      light.position.y = 2;
      group.add(light);

      this._scene.add(group);
      this._groveMeshes.push(group);
      this._groveLights.push(light);
    }
  }

  private _buildRootNodes(): void {
    for (let i = 0; i < 7; i++) { // matching generateRootNodes count
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.2, 0.3, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0x664422, emissive: 0x228822, emissiveIntensity: 0.2 }),
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = 0.1;
      this._scene.add(mesh);
      this._rootNodeMeshes.push(mesh);
    }
  }

  private _buildPlayer(): void {
    this._playerGroup = new THREE.Group();

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x334433, roughness: 0.7 });
    for (let side = -1; side <= 1; side += 2) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.7, 12), legMat);
      leg.position.set(side * 0.15, 0.35, 0);
      leg.castShadow = true;
      this._playerGroup.add(leg);
    }

    // Body (torso)
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.3, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: COL.GREEN_KNIGHT, roughness: 0.6 }),
    );
    body.position.y = 1.1;
    body.castShadow = true;
    this._playerGroup.add(body);

    // Armor chestplate
    const armor = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.5, 0.4),
      new THREE.MeshStandardMaterial({ color: COL.GREEN_KNIGHT_ARMOR, roughness: 0.4, metalness: 0.4 }),
    );
    armor.position.y = 1.15;
    this._playerGroup.add(armor);

    // Shoulder pauldrons
    for (let side = -1; side <= 1; side += 2) {
      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x556655, roughness: 0.4, metalness: 0.5 }),
      );
      pauldron.position.set(side * 0.4, 1.35, 0);
      pauldron.scale.y = 0.7;
      this._playerGroup.add(pauldron);
    }

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x88aa88 }),
    );
    head.position.y = 1.7;
    this._playerGroup.add(head);

    // Leaf crown
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x44aa44, emissive: 0x226622, emissiveIntensity: 0.2 });
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 12, 8), crownMat);
    crown.position.y = 1.85;
    crown.rotation.x = Math.PI / 2;
    this._playerGroup.add(crown);

    // Cape (flat plane hanging from shoulders)
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0x225522, roughness: 0.8, side: THREE.DoubleSide,
    });
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.0, 1, 4), capeMat);
    cape.position.set(0, 0.9, 0.25);
    cape.rotation.x = 0.1;
    this._playerGroup.add(cape);

    // Staff
    const staffMat = new THREE.MeshStandardMaterial({ color: 0x554422, roughness: 0.85 });
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 2.4, 12), staffMat);
    staff.position.set(0.5, 1.2, 0);
    staff.rotation.z = 0.15;
    this._playerGroup.add(staff);

    // Staff crystal (glowing green tip)
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x44ff88, emissive: 0x44ff88, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.9,
    });
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), crystalMat);
    crystal.position.set(0.5 + Math.sin(0.15) * 1.2, 1.2 + Math.cos(0.15) * 1.2, 0);
    this._playerGroup.add(crystal);

    // Staff glow light
    const staffLight = new THREE.PointLight(0x44ff88, 0.5, 5);
    staffLight.position.copy(crystal.position);
    this._playerGroup.add(staffLight);

    this._scene.add(this._playerGroup);
  }

  private _buildInstancedMeshes(): void {
    // Particles
    const particleGeo = new THREE.SphereGeometry(0.15, 16, 12);
    const particleMat = new THREE.MeshBasicMaterial();
    this._particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, 1000);
    this._particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._particleMesh.count = 0;
    this._scene.add(this._particleMesh);

    // Essence orbs
    const orbGeo = new THREE.SphereGeometry(0.25, 12, 10);
    const orbMat = new THREE.MeshBasicMaterial({ color: COL.ESSENCE_GREEN, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    this._essenceOrbMesh = new THREE.InstancedMesh(orbGeo, orbMat, 100);
    this._essenceOrbMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._essenceOrbMesh.count = 0;
    this._scene.add(this._essenceOrbMesh);

    // Heal saps
    const sapGeo = new THREE.SphereGeometry(0.3, 12, 10);
    const sapMat = new THREE.MeshBasicMaterial({ color: COL.HEAL_SAP, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    this._healSapMesh = new THREE.InstancedMesh(sapGeo, sapMat, 50);
    this._healSapMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._healSapMesh.count = 0;
    this._scene.add(this._healSapMesh);

    // Projectiles
    const projGeo = new THREE.ConeGeometry(0.1, 0.6, 10);
    const projMat = new THREE.MeshBasicMaterial({ color: COL.THORN });
    this._projectileMesh = new THREE.InstancedMesh(projGeo, projMat, 200);
    this._projectileMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._projectileMesh.count = 0;
    this._scene.add(this._projectileMesh);
  }

  private _buildSky(): void {
    const skyGeo = new THREE.SphereGeometry(200, 16, 12);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: this._skyTopColor },
        bottomColor: { value: this._skyBotColor },
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
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
        }
      `,
    });
    this._skyDome = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(this._skyDome);

    // Stars
    const starCount = 300;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.8 + 0.2); // upper hemisphere
      const r = 190;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      starSizes[i] = 0.5 + Math.random() * 1.5;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));
    this._starBaseSizes = new Float32Array(starSizes);
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 1.0, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: false,
    });
    this._starPoints = new THREE.Points(starGeo, starMat);
    this._scene.add(this._starPoints);
  }

  private _buildMoon(): void {
    // Moon sphere
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xeeeedd, transparent: true, opacity: 0.5 });
    this._moonMesh = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), moonMat);
    this._moonMesh.position.set(-60, 120, -80);
    this._scene.add(this._moonMesh);

    // Layered glow halos
    const glowMat1 = new THREE.MeshBasicMaterial({
      color: 0xddeeff, transparent: true, opacity: 0.06,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    });
    this._moonGlow1 = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 8), glowMat1);
    this._moonGlow1.position.copy(this._moonMesh.position);
    this._scene.add(this._moonGlow1);

    const glowMat2 = new THREE.MeshBasicMaterial({
      color: 0xbbccee, transparent: true, opacity: 0.025,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    });
    this._moonGlow2 = new THREE.Mesh(new THREE.SphereGeometry(14, 12, 8), glowMat2);
    this._moonGlow2.position.copy(this._moonMesh.position);
    this._scene.add(this._moonGlow2);
  }

  private _buildAurora(): void {
    const auroraGeo = new THREE.PlaneGeometry(160, 30, 64, 8);
    this._auroraUniforms = {
      time: { value: 0 },
      color1: { value: new THREE.Color(0x44aa88) },
      color2: { value: new THREE.Color(0x2266cc) },
    };
    const auroraMat = new THREE.ShaderMaterial({
      uniforms: this._auroraUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying float vDisplace;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float wave = sin(pos.x * 0.04 + time * 0.3) * 5.0 + sin(pos.x * 0.08 + time * 0.5) * 2.5;
          pos.y += wave;
          vDisplace = wave * 0.1;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;
        varying float vDisplace;
        void main() {
          float alpha = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
          alpha *= smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
          alpha *= 0.12 + abs(vDisplace) * 0.3;
          vec3 col = mix(color1, color2, vUv.x + vDisplace * 0.5);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    this._auroraMesh = new THREE.Mesh(auroraGeo, auroraMat);
    this._auroraMesh.position.set(0, 110, -60);
    this._auroraMesh.rotation.x = -0.2;
    this._scene.add(this._auroraMesh);
  }

  private _buildGroundFog(): void {
    const fogMat1 = new THREE.MeshBasicMaterial({
      color: 0x446644, transparent: true, opacity: 0.08,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const fog1 = new THREE.Mesh(
      new THREE.PlaneGeometry(FOREST.GROUND_SIZE * 0.8, FOREST.GROUND_SIZE * 0.8),
      fogMat1,
    );
    fog1.rotation.x = -Math.PI / 2;
    fog1.position.y = 0.3;
    this._scene.add(fog1);
    this._groundFogLayers.push(fog1);

    const fogMat2 = new THREE.MeshBasicMaterial({
      color: 0x335533, transparent: true, opacity: 0.04,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const fog2 = new THREE.Mesh(
      new THREE.PlaneGeometry(FOREST.GROUND_SIZE * 0.9, FOREST.GROUND_SIZE * 0.9),
      fogMat2,
    );
    fog2.rotation.x = -Math.PI / 2;
    fog2.position.y = 0.8;
    this._scene.add(fog2);
    this._groundFogLayers.push(fog2);
  }

  private _buildClouds(): void {
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.15,
      side: THREE.DoubleSide, depthWrite: false,
    });
    for (let i = 0; i < 8; i++) {
      const w = 20 + Math.random() * 30;
      const h = 5 + Math.random() * 8;
      const cloud = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cloudMat.clone());
      cloud.position.set(
        (Math.random() - 0.5) * 160,
        55 + Math.random() * 25,
        (Math.random() - 0.5) * 160,
      );
      cloud.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.2;
      cloud.userData.cloudSpeed = 0.5 + Math.random() * 1.0;
      this._scene.add(cloud);
      this._cloudMeshes.push(cloud);
    }
  }

  private _buildCorruptionOverlay(): void {
    const geo = new THREE.PlaneGeometry(FOREST.GROUND_SIZE, FOREST.GROUND_SIZE);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x220022,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this._corruptionOverlay = new THREE.Mesh(geo, mat);
    this._corruptionOverlay.rotation.x = -Math.PI / 2;
    this._corruptionOverlay.position.y = 0.02;
    this._scene.add(this._corruptionOverlay);
  }

  private _buildAtmosphere(): void {
    // God ray — a tall transparent cone from the canopy
    this._godRayMat = new THREE.MeshBasicMaterial({
      color: 0xffffcc,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const rayGeo = new THREE.ConeGeometry(6, 30, 4, 1, true);
    this._godRay = new THREE.Mesh(rayGeo, this._godRayMat);
    this._godRay.position.set(8, 20, -5);
    this._godRay.rotation.z = 0.3;
    this._scene.add(this._godRay);

    // Fireflies — instanced glowing dots
    const ffGeo = new THREE.SphereGeometry(0.08, 16, 12);
    const ffMat = new THREE.MeshBasicMaterial({ color: 0xccff88, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    this._fireflyMesh = new THREE.InstancedMesh(ffGeo, ffMat, 60);
    this._fireflyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._fireflyMesh.count = 0;
    this._scene.add(this._fireflyMesh);

    // Initialize firefly data
    for (let i = 0; i < 60; i++) {
      this._fireflyData.push({
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * 80,
          1 + Math.random() * 4,
          (Math.random() - 0.5) * 80,
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.5,
        ),
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Small ambient lights at root node positions (mushroom glow)
    for (let i = 0; i < 6; i++) {
      const light = new THREE.PointLight(0x88ff88, 0.3, 6);
      light.position.set(0, 0.5, 0); // will be positioned in update
      this._scene.add(light);
      this._ambientLights.push(light);
    }
  }

  private _updateAtmosphere(state: ForestState, dt: number): void {
    // God ray — visible in spring/summer, fades in autumn/winter
    const rayOpacity = (state.season === "spring" || state.season === "summer") ? 0.06 : 0.015;
    this._godRayMat.opacity += (rayOpacity - this._godRayMat.opacity) * 0.02;
    this._godRay.rotation.y += dt * 0.05;
    // Pulse
    this._godRayMat.opacity += Math.sin(state.gameTime * 0.5) * 0.01;

    // Fireflies — more active in spring/summer, absent in winter
    const ffCount = state.season === "winter" ? 10 : state.season === "autumn" ? 25 : 50;
    const activeFf = Math.min(ffCount, this._fireflyData.length);
    this._fireflyMesh.count = activeFf;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < activeFf; i++) {
      const ff = this._fireflyData[i];
      ff.phase += dt * (1.5 + Math.sin(ff.phase) * 0.5);

      // Drift
      ff.pos.x += ff.vel.x * dt;
      ff.pos.y += Math.sin(ff.phase) * 0.02;
      ff.pos.z += ff.vel.z * dt;

      // Wander
      if (Math.random() < 0.01) {
        ff.vel.x = (Math.random() - 0.5) * 0.8;
        ff.vel.z = (Math.random() - 0.5) * 0.8;
      }

      // Keep near player
      const dx = state.player.pos.x - ff.pos.x;
      const dz = state.player.pos.z - ff.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 40) {
        ff.pos.x = state.player.pos.x + (Math.random() - 0.5) * 30;
        ff.pos.z = state.player.pos.z + (Math.random() - 0.5) * 30;
        ff.pos.y = 1 + Math.random() * 3;
      }

      const glow = 0.3 + Math.sin(ff.phase * 2) * 0.7;
      dummy.position.copy(ff.pos);
      dummy.scale.setScalar(glow * 0.5 + 0.5);
      dummy.updateMatrix();
      this._fireflyMesh.setMatrixAt(i, dummy.matrix);
    }
    if (activeFf > 0) this._fireflyMesh.instanceMatrix.needsUpdate = true;

    // Flickering ambient lights at root nodes
    for (let i = 0; i < this._ambientLights.length && i < state.rootNodes.length; i++) {
      const node = state.rootNodes[i];
      const light = this._ambientLights[i];
      light.position.set(node.pos.x, 0.5, node.pos.z);
      const flicker = 0.2 + Math.sin(state.gameTime * 8 + i * 1.7) * 0.08
        + Math.sin(state.gameTime * 13 + i * 3.1) * 0.05;
      light.intensity = node.active ? flicker : 0;
    }

    // Ground fog drift
    for (let i = 0; i < this._groundFogLayers.length; i++) {
      const fog = this._groundFogLayers[i];
      fog.position.x = Math.sin(state.gameTime * 0.04 + i * 2) * 3;
      fog.position.z = Math.cos(state.gameTime * 0.03 + i * 1.5) * 2;
    }

    // Dodge afterimage update
    for (let i = this._afterimages.length - 1; i >= 0; i--) {
      const ai = this._afterimages[i];
      ai.life -= dt;
      const mat = ai.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, ai.life * 0.6);
      ai.mesh.scale.multiplyScalar(0.97);
      if (ai.life <= 0) {
        this._scene.remove(ai.mesh);
        ai.mesh.geometry.dispose();
        mat.dispose();
        this._afterimages.splice(i, 1);
      }
    }
  }

  update(state: ForestState, dt: number): void {
    if (state.phase === "menu") {
      this._updateMenuCamera(state);
      this._renderer.render(this._scene, this._camera);
      return;
    }

    this._updateSeason(state);
    this._updateCamera(state, dt);
    this._updatePlayer(state);
    this._updateGreatOak(state);
    this._updateGroves(state);
    this._updateRootNodes(state);
    this._updateTrees(state);
    this._updateEnemies(state, dt);
    this._updateWisps(state);
    this._updateParticles(state);
    this._updateEssenceOrbs(state);
    this._updateHealSaps(state);
    this._updateProjectiles(state);
    this._updateSpellEffects(state, dt);
    this._updateAtmosphere(state, dt);
    this._updateCorruption(state);

    this._renderer.render(this._scene, this._camera);
  }

  private _updateMenuCamera(state: ForestState): void {
    const t = state.gameTime * 0.15;
    const radius = 45 + Math.sin(t * 0.3) * 10;
    const height = 18 + Math.sin(t * 0.5) * 5;
    this._camera.position.set(
      Math.cos(t) * radius,
      height,
      Math.sin(t) * radius,
    );
    this._camera.lookAt(0, FOREST.GREAT_OAK_HEIGHT * 0.35, 0);
    // Atmosphere runs during menu too
    this._updateSeason(state);
    this._updateAtmosphere(state, 0.016);
    this._updateGreatOak(state);
  }

  private _updateSeason(state: ForestState): void {
    const skyColors: Record<Season, { top: number; bot: number }> = {
      spring: { top: COL.SKY_SPRING_TOP, bot: COL.SKY_SPRING_BOT },
      summer: { top: COL.SKY_SUMMER_TOP, bot: COL.SKY_SUMMER_BOT },
      autumn: { top: COL.SKY_AUTUMN_TOP, bot: COL.SKY_AUTUMN_BOT },
      winter: { top: COL.SKY_WINTER_TOP, bot: COL.SKY_WINTER_BOT },
    };
    const groundColors: Record<Season, number> = {
      spring: COL.GROUND_SPRING,
      summer: COL.GROUND_SUMMER,
      autumn: COL.GROUND_AUTUMN,
      winter: COL.GROUND_WINTER,
    };
    const fogDensities: Record<Season, number> = {
      spring: FOREST.FOG_DENSITY_BASE,
      summer: FOREST.FOG_DENSITY_BASE * 0.8,
      autumn: FOREST.FOG_DENSITY_BASE * 1.3,
      winter: FOREST.FOG_DENSITY_WINTER,
    };
    const sunIntensities: Record<Season, number> = {
      spring: 1.0,
      summer: 1.3,
      autumn: 0.7,
      winter: 0.5,
    };

    const s = state.season;
    this._targetSkyTop.setHex(skyColors[s].top);
    this._targetSkyBot.setHex(skyColors[s].bot);
    this._skyTopColor.lerp(this._targetSkyTop, 0.02);
    this._skyBotColor.lerp(this._targetSkyBot, 0.02);

    const targetGround = new THREE.Color(groundColors[s]);
    (this._groundMat.color as THREE.Color).lerp(targetGround, 0.02);

    this._fog.density += (fogDensities[s] - this._fog.density) * 0.02;
    this._fog.color.copy(this._skyBotColor);

    // Stars: visible in winter/autumn, dim in spring, hidden in summer
    const starOpacity: Record<Season, number> = { spring: 0.15, summer: 0.0, autumn: 0.35, winter: 0.6 };
    const starMat = this._starPoints.material as THREE.PointsMaterial;
    starMat.opacity += ((starOpacity[s] ?? 0.1) - starMat.opacity) * 0.02;
    this._starPoints.rotation.y += 0.0001;
    // Star twinkling
    const sizeAttr = this._starPoints.geometry.attributes.size;
    if (sizeAttr && this._starBaseSizes) {
      for (let i = 0; i < Math.min(50, sizeAttr.count); i++) {
        const base = this._starBaseSizes[i];
        sizeAttr.setX(i, base * (0.6 + Math.sin(state.gameTime * (1.5 + i * 0.13)) * 0.4));
      }
      sizeAttr.needsUpdate = true;
    }

    // Moon visibility (brighter in autumn/winter)
    const moonOpacity: Record<Season, number> = { spring: 0.3, summer: 0.1, autumn: 0.7, winter: 0.9 };
    const moonTarget = moonOpacity[s] ?? 0.3;
    (this._moonMesh.material as THREE.MeshBasicMaterial).opacity = moonTarget;
    (this._moonGlow1.material as THREE.MeshBasicMaterial).opacity = moonTarget * 0.07;
    (this._moonGlow2.material as THREE.MeshBasicMaterial).opacity = moonTarget * 0.03;

    // Aurora: visible in winter/autumn with seasonal colors
    this._auroraUniforms.time.value = state.gameTime;
    const auroraOpacity: Record<Season, number> = { spring: 0, summer: 0, autumn: 0.4, winter: 1.0 };
    this._auroraMesh.visible = (auroraOpacity[s] ?? 0) > 0.05;
    const seasonAuroraColors: Record<Season, { c1: number; c2: number }> = {
      spring: { c1: 0x44aa88, c2: 0x2266cc },
      summer: { c1: 0x44aa88, c2: 0x2266cc },
      autumn: { c1: 0xcc8844, c2: 0xaa4422 },
      winter: { c1: 0x44ccaa, c2: 0x2288ff },
    };
    const ac = seasonAuroraColors[s];
    (this._auroraUniforms.color1.value as THREE.Color).lerp(new THREE.Color(ac.c1), 0.02);
    (this._auroraUniforms.color2.value as THREE.Color).lerp(new THREE.Color(ac.c2), 0.02);

    // Ground fog: denser in autumn/winter
    const fogLayerOpacity: Record<Season, number> = { spring: 0.06, summer: 0.03, autumn: 0.1, winter: 0.14 };
    for (const fogLayer of this._groundFogLayers) {
      const mat = fogLayer.material as THREE.MeshBasicMaterial;
      mat.opacity += ((fogLayerOpacity[s] ?? 0.06) - mat.opacity) * 0.02;
    }

    // Clouds: drift slowly
    for (const cloud of this._cloudMeshes) {
      cloud.position.x += cloud.userData.cloudSpeed * 0.02;
      if (cloud.position.x > 100) cloud.position.x = -100;
    }

    // Tone mapping exposure per season
    const exposures: Record<Season, number> = { spring: 1.0, summer: 1.2, autumn: 0.85, winter: 0.7 };
    this._renderer.toneMappingExposure += ((exposures[s] ?? 1.0) - this._renderer.toneMappingExposure) * 0.02;

    // Pond color shifts with season
    const pondColors: Record<Season, number> = { spring: 0x336688, summer: 0x224466, autumn: 0x443322, winter: 0x88aacc };
    this._pondMat.color.lerp(new THREE.Color(pondColors[s] ?? 0x224466), 0.02);
    // Winter: frozen pond (high roughness, opaque)
    this._pondMat.roughness += ((s === "winter" ? 0.8 : 0.1) - this._pondMat.roughness) * 0.02;
    this._pondMat.opacity += ((s === "winter" ? 0.9 : 0.7) - this._pondMat.opacity) * 0.02;

    // Flowers: visible in spring, hidden otherwise
    const flowerOpacity: Record<Season, number> = { spring: 0.9, summer: 0.4, autumn: 0.1, winter: 0.0 };
    (this._flowerMesh.material as THREE.MeshBasicMaterial).opacity += ((flowerOpacity[s] ?? 0) - (this._flowerMesh.material as THREE.MeshBasicMaterial).opacity) * 0.03;
    this._flowerMesh.visible = (this._flowerMesh.material as THREE.MeshBasicMaterial).opacity > 0.02;

    this._sunLight.intensity += (sunIntensities[s] - this._sunLight.intensity) * 0.02;

    // Sun position shifts with season
    const sunAngles: Record<string, number> = {
      spring: 40, summer: 60, autumn: 30, winter: 15,
    };
    const targetAngle = (sunAngles[s] || 40) * Math.PI / 180;
    const currentAngle = Math.atan2(this._sunLight.position.y, this._sunLight.position.x);
    const newAngle = currentAngle + (targetAngle - currentAngle) * 0.01;
    this._sunLight.position.set(30 * Math.cos(newAngle), 50 * Math.sin(newAngle), 20);

    // Wave modifier visual effects
    if (state.waveModifier === "deep_fog") {
      this._fog.density += (FOREST.FOG_DENSITY_BLIGHT - this._fog.density) * 0.05;
    }
    if (state.waveModifier === "wildfire") {
      // Orange-red tint: warm ambient, reduce sun blue
      this._ambientLight.color.lerp(new THREE.Color(0xff6633), 0.03);
      this._ambientLight.intensity += (0.6 - this._ambientLight.intensity) * 0.02;
      this._fog.color.lerp(new THREE.Color(0x442211), 0.02);
      this._fog.density += (0.01 - this._fog.density) * 0.03;
      this._sunLight.color.lerp(new THREE.Color(0xff8844), 0.02);
    }
    if (state.waveModifier === "blood_blight") {
      this._ambientLight.color.lerp(new THREE.Color(0xff4444), 0.02);
      this._fog.color.lerp(new THREE.Color(0x220808), 0.02);
    }
    if (state.waveModifier === "frostbite") {
      this._ambientLight.color.lerp(new THREE.Color(0x88aacc), 0.02);
      this._fog.color.lerp(new THREE.Color(0xaabbcc), 0.02);
      this._fog.density += (0.012 - this._fog.density) * 0.02;
    }
    // Reset ambient when no modifier
    if (state.waveModifier === "none") {
      this._ambientLight.color.lerp(new THREE.Color(0xffffff), 0.02);
      this._ambientLight.intensity += (0.4 - this._ambientLight.intensity) * 0.02;
      this._sunLight.color.lerp(new THREE.Color(0xffeedd), 0.02);
    }
  }

  private _updateCamera(state: ForestState, _dt: number): void {
    const p = state.player;
    if (p.action === "root_travelling") {
      // Camera stays at last position
      return;
    }

    const dist = FOREST.CAMERA_FOLLOW_DIST;
    const height = FOREST.CAMERA_FOLLOW_HEIGHT;
    const targetX = p.pos.x + Math.sin(p.yaw) * dist;
    const targetY = p.pos.y + height;
    const targetZ = p.pos.z + Math.cos(p.yaw) * dist;

    const lerp = FOREST.CAMERA_LERP;
    this._camera.position.x += (targetX - this._camera.position.x) * lerp;
    this._camera.position.y += (targetY - this._camera.position.y) * lerp;
    this._camera.position.z += (targetZ - this._camera.position.z) * lerp;

    // Look at player
    this._camera.lookAt(p.pos.x, p.pos.y + 1.5, p.pos.z);

    // Screen shake
    if (state.screenShake > 0) {
      const intensity = state.screenShakeIntensity * (state.screenShake / 0.3);
      this._camera.position.x += (Math.random() - 0.5) * intensity * 0.3;
      this._camera.position.y += (Math.random() - 0.5) * intensity * 0.2;
    }

    // Camera recoil on damage
    if (state.screenFlash.timer > 0 && state.screenFlash.color === "#ff2222") {
      this._camera.position.y -= state.screenFlash.timer * 0.5;
    }
  }

  private _updatePlayer(state: ForestState): void {
    const p = state.player;
    if (p.action === "root_travelling") {
      this._playerGroup.visible = false;
      // Ground rumble along root travel path — subtle camera vibration
      if (state.screenShake <= 0) {
        this._camera.position.y += Math.sin(state.gameTime * 20) * 0.05;
        this._camera.position.x += Math.sin(state.gameTime * 15) * 0.03;
      }
      return;
    }
    this._playerGroup.visible = true;
    this._playerGroup.position.set(p.pos.x, p.pos.y, p.pos.z);

    // Walk bob animation
    if (p.action === "walking" || p.action === "sprinting") {
      const bobSpeed = p.action === "sprinting" ? 12 : 8;
      const bobHeight = p.action === "sprinting" ? 0.08 : 0.05;
      this._playerGroup.position.y += Math.sin(state.gameTime * bobSpeed) * bobHeight;
      // Slight torso lean in movement direction
      this._playerGroup.rotation.z = Math.sin(state.gameTime * bobSpeed * 0.5) * 0.03;
    } else {
      this._playerGroup.rotation.z = 0;
    }

    this._playerGroup.rotation.y = p.yaw + Math.PI;

    // Staff swing animation
    if (p.staffCD > 0.3) {
      const swingPhase = (FOREST.STAFF_COOLDOWN - p.staffCD) / 0.2;
      this._staffSwingTarget = Math.sin(swingPhase * Math.PI) * 1.2 * (p.staffComboStep === 0 ? 1 : p.staffComboStep === 1 ? -1 : 1.5);
    } else {
      this._staffSwingTarget = 0;
    }
    this._staffSwingAngle += (this._staffSwingTarget - this._staffSwingAngle) * 0.3;
    // Apply to staff mesh (5th child: legs(0,1), body(2), armor(3), pauldron(4,5), head(6), crown(7), cape(8), staff(9), crystal(10), light(11))
    const staffChild = this._playerGroup.children[9];
    if (staffChild) {
      staffChild.rotation.z = 0.15 + this._staffSwingAngle;
      staffChild.rotation.x = this._staffSwingAngle * 0.5;
    }
    // Crystal follows staff tip
    const crystalChild = this._playerGroup.children[10];
    if (crystalChild) {
      crystalChild.rotation.y = state.gameTime * 2; // gentle spin
    }

    // Staff swing trail arc
    if (this._staffSwingAngle > 0.3 || this._staffSwingAngle < -0.3) {
      if (!this._staffTrail) {
        const trailMat = new THREE.MeshBasicMaterial({
          color: 0x88ff88, transparent: true, opacity: 0.3,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
        });
        this._staffTrail = new THREE.Mesh(
          new THREE.RingGeometry(1.5, 3.5, 12, 1, 0, Math.PI * 0.6),
          trailMat,
        );
        this._scene.add(this._staffTrail);
      }
      this._staffTrail.visible = true;
      this._staffTrail.position.set(p.pos.x, p.pos.y + 1.2, p.pos.z);
      this._staffTrail.rotation.y = p.yaw + Math.PI + this._staffSwingAngle * 0.5;
      this._staffTrail.rotation.x = -0.3;
      this._staffTrailLife = 0.15;
      (this._staffTrail.material as THREE.MeshBasicMaterial).opacity = 0.35;
    }
    if (this._staffTrail && this._staffTrailLife > 0) {
      this._staffTrailLife -= 0.016;
      (this._staffTrail.material as THREE.MeshBasicMaterial).opacity = this._staffTrailLife * 2;
      if (this._staffTrailLife <= 0) this._staffTrail.visible = false;
    }

    // Block stance visual — slightly crouch
    if (state.player.blocking) {
      this._playerGroup.scale.setScalar(0.9);
      this._playerGroup.position.y -= 0.15;
    } else {
      this._playerGroup.scale.setScalar(1);
    }

    // Flash when damaged
    if (p.invincibleTimer > 0 && p.action !== "dodging") {
      this._playerGroup.visible = Math.floor(state.gameTime * 20) % 2 === 0;
    }

    // Dodge afterimage — spawn translucent copy at current position
    if (p.action === "dodging" && state.tick % 3 === 0) {
      const ghost = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.4, 1.2, 4, 8),
        new THREE.MeshBasicMaterial({ color: 0x88cc88, transparent: true, opacity: 0.4, depthWrite: false }),
      );
      ghost.position.set(p.pos.x, p.pos.y + 1, p.pos.z);
      ghost.rotation.y = p.yaw + Math.PI;
      this._scene.add(ghost);
      this._afterimages.push({ mesh: ghost, life: 0.4 });
    }
  }

  private _updateGreatOak(state: ForestState): void {
    const oak = state.greatOak;
    const hpPct = oak.hp / oak.maxHp;

    // Glow intensity based on HP
    this._greatOakGlow.intensity = hpPct * 2 + Math.sin(state.gameTime * 2) * 0.3;

    // Crack overlay opacity
    (this._oakCrackOverlay.material as THREE.MeshStandardMaterial).opacity = 1 - hpPct;

    // Subtle sway
    this._greatOakGroup.rotation.y = Math.sin(state.gameTime * 0.3) * 0.02;

    // Canopy color shifts with season
    const seasonCanopyColors: Record<string, number> = {
      spring: 0x44cc44,
      summer: 0x228822,
      autumn: 0xcc8833,
      winter: 0x667766,
    };
    const targetCanopy = new THREE.Color(seasonCanopyColors[state.season] || 0x44cc44);
    this._greatOakGroup.traverse(child => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.color.getHex() !== 0x664422 && mat.color.getHex() !== 0x553318 && mat.color.getHex() !== 0x331133) {
          mat.color.lerp(targetCanopy, 0.01);
        }
      }
    });

    // Animate runes
    this._greatOakGroup.traverse(child => {
      if (child instanceof THREE.Mesh && child.userData.runePhase !== undefined) {
        const runeMat = child.material as THREE.MeshBasicMaterial;
        runeMat.opacity = 0.2 + Math.sin(state.gameTime * 2 + child.userData.runePhase) * 0.2;
      }
    });

    // Vine sway
    let vineIdx = 0;
    this._greatOakGroup.traverse(child => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry && child.userData.runePhase === undefined) {
        child.rotation.z = Math.sin(state.gameTime * 0.8 + vineIdx * 0.7) * 0.08;
        child.rotation.x = Math.sin(state.gameTime * 0.5 + vineIdx * 1.2) * 0.04;
        vineIdx++;
      }
    });
  }

  private _updateGroves(state: ForestState): void {
    for (let i = 0; i < state.groves.length; i++) {
      const grove = state.groves[i];
      const group = this._groveMeshes[i];
      const light = this._groveLights[i];
      if (!group || !light) continue;

      if (grove.status === "corrupted") {
        light.color.setHex(COL.GROVE_CORRUPTED);
        light.intensity = 0.5 + Math.sin(state.gameTime * 3) * 0.2;
      } else if (grove.status === "contested") {
        light.color.setHex(0xffaa44);
        light.intensity = 1.0 + Math.sin(state.gameTime * 4) * 0.4;
      } else {
        light.color.setHex(COL.GROVE_PURE);
        light.intensity = 1.5 + Math.sin(state.gameTime * 1.5) * 0.3;
      }

      // Crystal spin and visual state
      const crystal = group.children.find(c => c instanceof THREE.Mesh && (c as THREE.Mesh).geometry instanceof THREE.ConeGeometry) as THREE.Mesh | undefined;
      if (crystal) {
        crystal.rotation.y = state.gameTime * 1.5;
        crystal.position.y = 1.5 + Math.sin(state.gameTime * 2 + i) * 0.15;
        const crystalMat = crystal.material as THREE.MeshStandardMaterial;
        if (grove.status === "corrupted") {
          crystalMat.color.lerp(new THREE.Color(COL.GROVE_CORRUPTED), 0.03);
          crystalMat.emissive.lerp(new THREE.Color(COL.GROVE_CORRUPTED), 0.03);
        } else {
          crystalMat.color.lerp(new THREE.Color(COL.GROVE_PURE), 0.03);
          crystalMat.emissive.lerp(new THREE.Color(COL.GROVE_PURE), 0.03);
        }
      }
      // Stone darkening when corrupted
      if (grove.status === "corrupted") {
        group.traverse(child => {
          if (child instanceof THREE.Mesh) {
            const m = child.material as THREE.MeshStandardMaterial;
            if (m.color && m.roughness > 0.85) { // stones
              m.color.lerp(new THREE.Color(0x332233), 0.01);
            }
          }
        });
      }
    }
  }

  private _updateRootNodes(state: ForestState): void {
    for (let i = 0; i < state.rootNodes.length && i < this._rootNodeMeshes.length; i++) {
      const node = state.rootNodes[i];
      const mesh = this._rootNodeMeshes[i];
      mesh.position.set(node.pos.x, 0.1 + Math.sin(state.gameTime * 2 + node.glowPhase) * 0.1, node.pos.z);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = node.active ? 0.3 + Math.sin(state.gameTime * 3 + node.glowPhase) * 0.15 : 0;
    }
  }

  private _updateTrees(state: ForestState): void {
    // Build trees on first call
    if (this._treeMeshes.length === 0 && state.trees.length > 0) {
      this._buildTrees(state);
    }

    // Update tree corruption & sway
    for (let i = 0; i < state.trees.length && i < this._treeMeshes.length; i++) {
      const tree = state.trees[i];
      const group = this._treeMeshes[i];
      const leafMat = this._treeLeafMats[i];

      // Sway
      group.rotation.z = Math.sin(state.gameTime * 0.5 + tree.swayPhase) * 0.02;

      // Corruption: color shift + wilt (shrink crown, droop)
      if (tree.corrupted) {
        if (leafMat) leafMat.color.lerp(new THREE.Color(COL.TREE_CORRUPTED), 0.02);
        // Wilt: shrink crown
        const crown = group.children[1]; // second child is crown
        if (crown) {
          crown.scale.y += (0.6 - crown.scale.y) * 0.01; // flatten
          crown.scale.x += (0.8 - crown.scale.x) * 0.01;
          crown.scale.z += (0.8 - crown.scale.z) * 0.01;
        }
        // Trunk lean
        group.rotation.x += (0.05 - group.rotation.x) * 0.005;
      } else {
        if (leafMat) {
          const seasonColor = this._getTreeLeafColor(tree.type, state.season);
          leafMat.color.lerp(new THREE.Color(seasonColor), 0.02);
        }
        // Restore
        const crown = group.children[1];
        if (crown) {
          crown.scale.y += (1 - crown.scale.y) * 0.01;
          crown.scale.x += (1 - crown.scale.x) * 0.01;
          crown.scale.z += (1 - crown.scale.z) * 0.01;
        }
        group.rotation.x += (0 - group.rotation.x) * 0.005;
      }
    }
  }

  private _buildTrees(state: ForestState): void {
    for (const tree of state.trees) {
      const group = new THREE.Group();
      group.position.set(tree.pos.x, 0, tree.pos.z);

      // Trunk
      const trunkColor = tree.type === "birch" ? COL.TREE_BIRCH_TRUNK : COL.TREE_OAK_TRUNK;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(tree.radius * 0.3, tree.radius * 0.5, tree.height * 0.6, 12),
        new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.95 }),
      );
      trunk.position.y = tree.height * 0.3;
      trunk.castShadow = true;
      group.add(trunk);

      // Leaves/crown
      const leafColor = this._getTreeLeafColor(tree.type, state.season);
      const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.8 });
      let crown: THREE.Mesh;
      if (tree.type === "pine") {
        crown = new THREE.Mesh(new THREE.ConeGeometry(tree.radius * 2, tree.height * 0.6, 12), leafMat);
        crown.position.y = tree.height * 0.6;
      } else if (tree.type === "willow") {
        crown = new THREE.Mesh(new THREE.SphereGeometry(tree.radius * 2.5, 12, 10), leafMat);
        crown.position.y = tree.height * 0.6;
        crown.scale.y = 1.3;
      } else {
        crown = new THREE.Mesh(new THREE.SphereGeometry(tree.radius * 2, 12, 10), leafMat);
        crown.position.y = tree.height * 0.65;
      }
      crown.castShadow = true;
      group.add(crown);

      this._scene.add(group);
      this._treeMeshes.push(group);
      this._treeLeafMats.push(leafMat);
    }
  }

  private _getTreeLeafColor(type: string, season: Season): number {
    if (type === "pine") return COL.TREE_PINE;
    const seasonColors: Record<Season, number> = {
      spring: COL.TREE_OAK_LEAVES_SPRING,
      summer: COL.TREE_OAK_LEAVES_SUMMER,
      autumn: COL.TREE_OAK_LEAVES_AUTUMN,
      winter: COL.TREE_OAK_LEAVES_WINTER,
    };
    if (type === "willow") return season === "winter" ? 0x556655 : COL.TREE_WILLOW;
    return seasonColors[season];
  }

  private _updateEnemies(state: ForestState, dt: number): void {
    // Remove stale meshes and dispose resources
    for (const [id, mesh] of this._enemyMeshes) {
      if (!state.enemies.has(id)) {
        this._scene.remove(mesh);
        mesh.traverse(child => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) (child.material as THREE.Material).dispose();
          }
        });
        this._enemyMeshes.delete(id);
        this._enemyScales.delete(id);
      }
    }

    // Update / create enemy meshes
    for (const [id, enemy] of state.enemies) {
      let mesh = this._enemyMeshes.get(id);
      if (!mesh) {
        mesh = this._createEnemyMesh(enemy);
        this._scene.add(mesh);
        this._enemyMeshes.set(id, mesh);
        this._enemyScales.set(id, 0);
      }

      // Scale in animation
      let s = this._enemyScales.get(id) || 0;
      s = Math.min(1, s + dt * 3);
      this._enemyScales.set(id, s);

      if (enemy.behavior === "dead") {
        const deathProgress = Math.max(0, enemy.deathTimer / 0.6);
        mesh.scale.setScalar(s * deathProgress);
        mesh.position.y += (1 - deathProgress) * 2; // float up on death
        mesh.rotation.x = (1 - deathProgress) * 0.5; // tilt
      } else {
        mesh.scale.setScalar(s);
      }

      // Type-specific bob/animation
      let bobY = Math.sin(enemy.bobPhase) * 0.1;
      let bobTilt = 0;
      if (enemy.type === "wisp_corruptor") {
        bobY = 1.5 + Math.sin(enemy.bobPhase * 0.8) * 0.4; // floats high
      } else if (enemy.type === "shadow_stag") {
        bobTilt = Math.sin(enemy.bobPhase * 2) * 0.05; // quick head bob
      } else if (enemy.type === "bark_golem" && enemy.behavior === "charging") {
        bobY = Math.sin(enemy.bobPhase * 4) * 0.2; // heavy stomp
        bobTilt = 0.15; // leaning forward
      }
      mesh.position.set(enemy.pos.x, enemy.pos.y + bobY, enemy.pos.z);
      if (enemy.behavior !== "dead" && enemy.knockbackTimer <= 0) {
        mesh.rotation.x = bobTilt;
      }
      mesh.rotation.y = enemy.rotation;

      // Visual state feedback
      mesh.traverse(child => {
        if (!(child instanceof THREE.Mesh)) return;
        const mat = child.material as THREE.MeshStandardMaterial;
        // Hit flash (white glow)
        if (enemy.hitFlash > 0) {
          mat.emissiveIntensity = enemy.hitFlash * 0.5;
          mat.emissive.setHex(0xffffff);
        }
        // Stunned (blue tint)
        else if (enemy.stunTimer > 0) {
          mat.emissiveIntensity = 0.3;
          mat.emissive.setHex(0x4488ff);
        }
        // Snared (green tint)
        else if (enemy.snaredTimer > 0) {
          mat.emissiveIntensity = 0.25;
          mat.emissive.setHex(0x228822);
        }
        // Knockback tumble
        else if (enemy.knockbackTimer > 0) {
          mat.emissiveIntensity = 0.15;
          mat.emissive.setHex(0xff8844);
        }
        else {
          mat.emissiveIntensity = 0.05;
        }
      });

      // Knockback rotation tumble
      if (enemy.knockbackTimer > 0) {
        mesh.rotation.x = enemy.knockbackTimer * 3;
      } else if (enemy.behavior !== "dead") {
        mesh.rotation.x = 0;
      }

      // Blight Mother core pulse
      if (enemy.type === "blight_mother") {
        mesh.traverse(child => {
          if (child instanceof THREE.Mesh && child.userData.isCore) {
            const coreMat = child.material as THREE.MeshBasicMaterial;
            const hpPct = enemy.hp / enemy.maxHp;
            const pulse = 0.3 + Math.sin(state.gameTime * (4 + (1 - hpPct) * 6)) * 0.2;
            coreMat.opacity = pulse;
            child.scale.setScalar(0.8 + Math.sin(state.gameTime * 3) * 0.2);
          }
        });
      }
    }
  }

  private _createEnemyMesh(enemy: Enemy): THREE.Group {
    const group = new THREE.Group();
    let color: number;
    let bodyH: number;
    let bodyR: number;

    switch (enemy.type) {
      case "rot_archer":
        color = COL.ROT_ARCHER; bodyH = 1.6; bodyR = 0.3; break;
      case "bark_golem":
        color = COL.BARK_GOLEM; bodyH = 2.5; bodyR = 0.7; break;
      case "shadow_stag":
        color = COL.SHADOW_STAG; bodyH = 1.4; bodyR = 0.4; break;
      case "blight_mother":
        color = COL.BLIGHT_MOTHER; bodyH = 3.5; bodyR = 1.2; break;
      case "wisp_corruptor":
        color = COL.WISP_CORRUPTOR; bodyH = 1.0; bodyR = 0.4; break;
      default:
        color = COL.BLIGHTLING; bodyH = 1.2; bodyR = 0.3; break;
    }

    // Apply colorVariant for visual diversity
    const baseColor = new THREE.Color(color);
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    hsl.l = Math.max(0.05, Math.min(0.6, hsl.l + (enemy.colorVariant - 0.5) * 0.15));
    hsl.h += (enemy.colorVariant - 0.5) * 0.05;
    baseColor.setHSL(hsl.h, hsl.s, hsl.l);
    const mat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.8, emissive: baseColor, emissiveIntensity: 0.05 });

    // Body
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(bodyR, bodyH, 4, 8), mat);
    body.position.y = bodyH / 2 + 0.2;
    body.castShadow = true;
    group.add(body);

    // Eyes (two small glowing spheres)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    const eyeGeo = new THREE.SphereGeometry(bodyR * 0.2, 16, 12);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-bodyR * 0.4, bodyH * 0.7, -bodyR * 0.6);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(bodyR * 0.4, bodyH * 0.7, -bodyR * 0.6);
    group.add(rightEye);

    // Blightling: arm claws and back spines
    if (enemy.type === "blightling") {
      // Arms with claws
      for (let side = -1; side <= 1; side += 2) {
        const arm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.08, 0.6, 10),
          mat,
        );
        arm.position.set(side * 0.35, bodyH * 0.45, -0.1);
        arm.rotation.z = side * 0.5;
        arm.rotation.x = -0.3;
        group.add(arm);
        // Claw
        const claw = new THREE.Mesh(
          new THREE.ConeGeometry(0.04, 0.2, 8),
          new THREE.MeshStandardMaterial({ color: 0x442244 }),
        );
        claw.position.set(side * 0.5, bodyH * 0.25, -0.2);
        claw.rotation.x = -0.8;
        group.add(claw);
      }
      // Back spines
      for (let i = 0; i < 3; i++) {
        const spine = new THREE.Mesh(
          new THREE.ConeGeometry(0.04, 0.25 + i * 0.05, 8),
          new THREE.MeshStandardMaterial({ color: 0x443355 }),
        );
        spine.position.set(0, bodyH * (0.5 + i * 0.12), 0.2);
        spine.rotation.x = 0.4;
        group.add(spine);
      }
    }

    // Rot archer: bow
    if (enemy.type === "rot_archer") {
      const bowMat = new THREE.MeshStandardMaterial({ color: 0x443322 });
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 10, 8, Math.PI), bowMat);
      bow.position.set(-0.5, bodyH * 0.5, -0.2);
      bow.rotation.z = Math.PI / 2;
      group.add(bow);
      // Bowstring
      const stringGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.8, 8);
      const string = new THREE.Mesh(stringGeo, new THREE.MeshBasicMaterial({ color: 0x888888 }));
      string.position.set(-0.5, bodyH * 0.5, -0.2);
      group.add(string);
    }

    // Type-specific details
    if (enemy.type === "shadow_stag") {
      // Antlers (taller, more dramatic)
      for (let side = -1; side <= 1; side += 2) {
        const antler = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.07, 1.2, 10),
          new THREE.MeshStandardMaterial({ color: 0x444466, emissive: 0x222244, emissiveIntensity: 0.1 }),
        );
        antler.position.set(side * 0.3, bodyH * 0.85, -0.15);
        antler.rotation.z = side * 0.35;
        antler.rotation.x = -0.2;
        group.add(antler);
        // Antler branch
        const branch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.04, 0.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x444466 }),
        );
        branch.position.set(side * 0.45, bodyH * 0.9, -0.1);
        branch.rotation.z = side * 0.8;
        group.add(branch);
      }
      // Legs (4 thin legs for quadruped feel)
      const legMat = new THREE.MeshStandardMaterial({ color: 0x2a2a44, roughness: 0.8 });
      const legPositions = [
        { x: -0.2, z: -0.25 }, { x: 0.2, z: -0.25 },
        { x: -0.2, z: 0.25 }, { x: 0.2, z: 0.25 },
      ];
      for (const lp of legPositions) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.5, 10), legMat);
        leg.position.set(lp.x, 0.1, lp.z);
        group.add(leg);
      }
      // Shadow mane (wispy trail on back)
      const maneMat = new THREE.MeshBasicMaterial({
        color: 0x4444aa, transparent: true, opacity: 0.3,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      const mane = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.8), maneMat);
      mane.position.set(0, bodyH * 0.6, 0.3);
      group.add(mane);
    }

    if (enemy.type === "bark_golem") {
      // Shoulder plates (mossy)
      const mossMat = new THREE.MeshStandardMaterial({ color: 0x336633, roughness: 0.95 });
      for (let side = -1; side <= 1; side += 2) {
        const plate = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.4, 0.5),
          new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.95 }),
        );
        plate.position.set(side * 0.9, bodyH * 0.6, 0);
        group.add(plate);
        // Moss on shoulders
        const moss = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 16, 12),
          mossMat,
        );
        moss.position.set(side * 0.9, bodyH * 0.7, 0.1);
        group.add(moss);
      }
      // Thick arms
      for (let side = -1; side <= 1; side += 2) {
        const arm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.2, 1.2, 10),
          mat,
        );
        arm.position.set(side * 0.7, bodyH * 0.3, -0.3);
        arm.rotation.z = side * 0.3;
        arm.rotation.x = -0.4;
        group.add(arm);
      }
      // Rock fists
      for (let side = -1; side <= 1; side += 2) {
        const fist = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.2, 0),
          new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.9 }),
        );
        fist.position.set(side * 0.9, bodyH * 0.1, -0.6);
        group.add(fist);
      }
    }

    if (enemy.type === "blight_mother") {
      // Tentacles
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const tentacle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.2, 2.5, 10),
          mat,
        );
        tentacle.position.set(Math.cos(angle) * 1.4, 0.8, Math.sin(angle) * 1.4);
        tentacle.rotation.z = Math.cos(angle) * 0.6;
        tentacle.rotation.x = Math.sin(angle) * 0.6;
        group.add(tentacle);
      }
      // Pulsing core
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xff44ff, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), coreMat);
      core.position.y = bodyH * 0.5;
      core.userData.isCore = true;
      group.add(core);
      // Crown of thorns
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const thorn = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.6, 10),
          new THREE.MeshStandardMaterial({ color: 0x442244 }),
        );
        thorn.position.set(Math.cos(angle) * 0.8, bodyH * 0.75, Math.sin(angle) * 0.8);
        thorn.rotation.z = Math.cos(angle) * 0.3;
        thorn.rotation.x = Math.sin(angle) * 0.3;
        group.add(thorn);
      }
    }

    return group;
  }

  private _updateWisps(state: ForestState): void {
    // Remove stale
    for (const [id, mesh] of this._wispMeshes) {
      if (!state.wispAllies.find(w => w.id === id)) {
        this._scene.remove(mesh);
        this._wispMeshes.delete(id);
      }
    }

    for (const wisp of state.wispAllies) {
      let mesh = this._wispMeshes.get(wisp.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 16, 12),
          new THREE.MeshBasicMaterial({ color: COL.WISP_ALLY }),
        );
        const light = new THREE.PointLight(COL.WISP_ALLY, 0.8, 8);
        mesh.add(light);
        this._scene.add(mesh);
        this._wispMeshes.set(wisp.id, mesh);
      }
      mesh.position.set(wisp.pos.x, wisp.pos.y, wisp.pos.z);
      mesh.scale.setScalar(0.8 + Math.sin(wisp.bobPhase) * 0.1);
      // Trail glow
      const wLight = mesh.children[0] as THREE.PointLight | undefined;
      if (wLight) {
        wLight.intensity = 0.6 + Math.sin(wisp.bobPhase * 2) * 0.3;
      }
    }
  }

  private _updateParticles(state: ForestState): void {
    const dummy = new THREE.Object3D();
    const count = Math.min(state.particles.length, 1000);
    this._particleMesh.count = count;

    for (let i = 0; i < count; i++) {
      const pt = state.particles[i];
      dummy.position.set(pt.pos.x, pt.pos.y, pt.pos.z);
      const scale = pt.size * (pt.life / pt.maxLife);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      this._particleMesh.setMatrixAt(i, dummy.matrix);
      this._particleMesh.setColorAt(i, new THREE.Color(pt.color));
    }
    if (count > 0) {
      this._particleMesh.instanceMatrix.needsUpdate = true;
      if (this._particleMesh.instanceColor) this._particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private _updateEssenceOrbs(state: ForestState): void {
    const dummy = new THREE.Object3D();
    const count = Math.min(state.essenceOrbs.length, 100);
    this._essenceOrbMesh.count = count;

    for (let i = 0; i < count; i++) {
      const orb = state.essenceOrbs[i];
      dummy.position.set(orb.pos.x, orb.pos.y, orb.pos.z);
      const pulse = 1 + Math.sin(state.gameTime * 6 + i) * 0.2;
      dummy.scale.setScalar(pulse);
      dummy.updateMatrix();
      this._essenceOrbMesh.setMatrixAt(i, dummy.matrix);
    }
    if (count > 0) this._essenceOrbMesh.instanceMatrix.needsUpdate = true;
  }

  private _updateHealSaps(state: ForestState): void {
    const dummy = new THREE.Object3D();
    const count = Math.min(state.healSaps.length, 50);
    this._healSapMesh.count = count;

    for (let i = 0; i < count; i++) {
      const sap = state.healSaps[i];
      dummy.position.set(sap.pos.x, sap.pos.y, sap.pos.z);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      this._healSapMesh.setMatrixAt(i, dummy.matrix);
    }
    if (count > 0) this._healSapMesh.instanceMatrix.needsUpdate = true;
  }

  private _updateProjectiles(state: ForestState): void {
    const dummy = new THREE.Object3D();
    const count = Math.min(state.projectiles.length, 200);
    this._projectileMesh.count = count;

    for (let i = 0; i < count; i++) {
      const proj = state.projectiles[i];
      dummy.position.set(proj.pos.x, proj.pos.y, proj.pos.z);
      dummy.lookAt(proj.pos.x + proj.vel.x, proj.pos.y + proj.vel.y, proj.pos.z + proj.vel.z);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      this._projectileMesh.setMatrixAt(i, dummy.matrix);
      const color = proj.owner === "player" ? 0x66ff66 : (proj.type === "blight_spit" ? 0x884488 : 0x884422);
      // Scale player projectiles slightly larger
      if (proj.owner === "player") dummy.scale.setScalar(1.3);
      this._projectileMesh.setColorAt(i, new THREE.Color(color));
    }
    if (count > 0) {
      this._projectileMesh.instanceMatrix.needsUpdate = true;
      if (this._projectileMesh.instanceColor) this._projectileMesh.instanceColor.needsUpdate = true;
    }
  }

  private _buildSpellEffects(): void {
    // Leaf storm ring (always exists, toggled visible)
    this._leafStormMat = new THREE.MeshBasicMaterial({
      color: 0x88cc44,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._leafStormRing = new THREE.Mesh(
      new THREE.RingGeometry(FOREST.LEAF_STORM_RADIUS * 0.3, FOREST.LEAF_STORM_RADIUS, 32),
      this._leafStormMat,
    );
    this._leafStormRing.rotation.x = -Math.PI / 2;
    this._leafStormRing.position.y = 0.1;
    this._leafStormRing.visible = false;
    this._scene.add(this._leafStormRing);
  }

  private _updateSpellEffects(state: ForestState, dt: number): void {
    // Leaf storm ring follows player when active
    if (state.leafStormActive) {
      this._leafStormRing.visible = true;
      this._leafStormRing.position.set(state.player.pos.x, 0.15, state.player.pos.z);
      this._leafStormRing.rotation.z += dt * 3; // spin
      this._leafStormMat.opacity = 0.15 + Math.sin(state.gameTime * 5) * 0.08;
    } else {
      this._leafStormRing.visible = false;
    }

    // Root crush crater (temporary)
    if (state.pendingRootCrush) {
      if (this._rootCrushCrater) this._scene.remove(this._rootCrushCrater);
      const geo = new THREE.RingGeometry(0.5, FOREST.ROOT_CRUSH_RADIUS * (1 + state.player.rootLevel * 0.25), 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0x664422, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
      this._rootCrushCrater = new THREE.Mesh(geo, mat);
      this._rootCrushCrater.rotation.x = -Math.PI / 2;
      this._rootCrushCrater.position.set(state.pendingRootCrush.x, 0.05, state.pendingRootCrush.z);
      this._scene.add(this._rootCrushCrater);
      this._rootCrushLife = 2.0;
      state.pendingRootCrush = null;
    }
    if (this._rootCrushCrater && this._rootCrushLife > 0) {
      this._rootCrushLife -= dt;
      (this._rootCrushCrater.material as THREE.MeshBasicMaterial).opacity = this._rootCrushLife * 0.3;
      if (this._rootCrushLife <= 0) {
        this._scene.remove(this._rootCrushCrater);
        this._rootCrushCrater = null;
      }
    }

    // Vine snare ring (temporary)
    if (state.pendingVineSnarePos) {
      if (this._vineSnareRing) this._scene.remove(this._vineSnareRing);
      const geo = new THREE.RingGeometry(0.3, FOREST.VINE_SNARE_RADIUS, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0x228822, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
      this._vineSnareRing = new THREE.Mesh(geo, mat);
      this._vineSnareRing.rotation.x = -Math.PI / 2;
      this._vineSnareRing.position.set(state.pendingVineSnarePos.x, 0.08, state.pendingVineSnarePos.z);
      this._scene.add(this._vineSnareRing);
      this._vineSnareLife = FOREST.VINE_SNARE_DURATION;
      state.pendingVineSnarePos = null;
    }
    if (this._vineSnareRing && this._vineSnareLife > 0) {
      this._vineSnareLife -= dt;
      (this._vineSnareRing.material as THREE.MeshBasicMaterial).opacity = Math.min(0.4, this._vineSnareLife * 0.15);
      if (this._vineSnareLife <= 0) {
        this._scene.remove(this._vineSnareRing);
        this._vineSnareRing = null;
      }
    }

    // Leaf storm initial burst (consume pendingLeafStormPos)
    if (state.pendingLeafStormPos) {
      // Brief bright pulse on leaf storm ring
      this._leafStormMat.opacity = 0.5;
      state.pendingLeafStormPos = null;
    }

    // Grove purification burst
    if (state.pendingPurifyGroveIdx >= 0 && state.pendingPurifyGroveIdx < state.groves.length) {
      const groveGroup = this._groveMeshes[state.pendingPurifyGroveIdx];
      if (groveGroup) {
        // Pulse the grove light bright green
        const light = this._groveLights[state.pendingPurifyGroveIdx];
        if (light) {
          light.color.setHex(0x44ff88);
          light.intensity = 5;
        }
      }
      state.pendingPurifyGroveIdx = -1;
    }

    // Boss roar flash
    if (state.pendingBossRoar) {
      state.pendingBossRoar = false;
      // Handled by screen flash in HUD, but we can pulse the sun light
      this._sunLight.intensity = 2.5;
    }

    // FOV: wider when sprinting
    this._targetFOV = state.player.action === "sprinting" ? FOREST.CAMERA_FOV + 8 :
                       state.player.leafStormTimer > 0 ? FOREST.CAMERA_FOV + 4 : FOREST.CAMERA_FOV;
    this._camera.fov += (this._targetFOV - this._camera.fov) * 0.06;
    this._camera.updateProjectionMatrix();
  }

  private _updateCorruption(state: ForestState): void {
    const mat = this._corruptionOverlay.material as THREE.MeshBasicMaterial;
    mat.opacity = state.corruption * 0.15;
  }

  cleanup(): void {
    if (this._canvas.parentElement) this._canvas.parentElement.removeChild(this._canvas);
    // Clean up afterimages
    for (const ai of this._afterimages) {
      this._scene.remove(ai.mesh);
      ai.mesh.geometry.dispose();
      (ai.mesh.material as THREE.Material).dispose();
    }
    this._afterimages = [];
    this._scene.clear();
    this._renderer.dispose();
    this._enemyMeshes.clear();
    this._enemyScales.clear();
    this._wispMeshes.clear();
    this._treeMeshes = [];
    this._treeLeafMats = [];
    this._fireflyData = [];
  }
}
