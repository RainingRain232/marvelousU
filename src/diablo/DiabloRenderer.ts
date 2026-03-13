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
} from './DiabloTypes';
import { ENEMY_DEFS, MAP_CONFIGS, VENDOR_DEFS } from './DiabloConfig';
import { RARITY_COLORS } from './DiabloTypes';

export class DiabloRenderer {
  public canvas!: HTMLCanvasElement;
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _playerGroup!: THREE.Group;
  private _weaponMesh: THREE.Mesh | null = null;
  private _enemyMeshes: Map<string, THREE.Group> = new Map();
  private _projectileMeshes: Map<string, THREE.Mesh> = new Map();
  private _lootMeshes: Map<string, THREE.Group> = new Map();
  private _chestMeshes: Map<string, THREE.Group> = new Map();
  private _aoeMeshes: Map<string, THREE.Mesh> = new Map();
  private _vendorMeshes: Map<string, THREE.Group> = new Map();
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
  private _weaponArmGroup: THREE.Group | null = null;
  private _raycaster: THREE.Raycaster = new THREE.Raycaster();

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

    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x557733, roughness: 0.9, metalness: 0.0 });
    this._groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this._groundPlane.rotation.x = -Math.PI / 2;
    this._groundPlane.receiveShadow = true;
    this._scene.add(this._groundPlane);
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

    const cfg = MAP_CONFIGS[mapId];

    switch (mapId) {
      case DiabloMapId.FOREST:
        this._buildForest(cfg.width, cfg.depth);
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
      case DiabloMapId.CAMELOT:
        this._buildCamelot(cfg.width, cfg.depth);
        break;
    }
  }

  private _buildForest(w: number, d: number): void {
    this._scene.fog = new THREE.FogExp2(0x2a4a2a, 0.018);
    (this._groundPlane.material as THREE.MeshStandardMaterial).color.setHex(0x3b5a2b);
    this._dirLight.color.setHex(0xffe8b0);
    this._dirLight.intensity = 1.4;
    this._ambientLight.color.setHex(0x304020);
    this._hemiLight.color.setHex(0x88aa66);
    this._hemiLight.groundColor.setHex(0x443322);

    const hw = w / 2;

    // Trees (85)
    for (let i = 0; i < 85; i++) {
      const tree = new THREE.Group();
      const trunkH = 1.5 + Math.random() * 2.5;
      const trunkR = 0.15 + Math.random() * 0.15;
      const trunkGeo = new THREE.CylinderGeometry(trunkR, trunkR * 1.3, trunkH, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      tree.add(trunk);

      const crownH = 2.0 + Math.random() * 2.0;
      const crownR = 1.0 + Math.random() * 1.2;
      const greenShade = 0x228b22 + Math.floor(Math.random() * 0x224400);
      const crownGeo = new THREE.ConeGeometry(crownR, crownH, 8);
      const crownMat = new THREE.MeshStandardMaterial({ color: greenShade, roughness: 0.8 });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = trunkH + crownH / 2 - 0.3;
      crown.castShadow = true;
      tree.add(crown);

      tree.position.set(
        (Math.random() - 0.5) * w,
        0,
        (Math.random() - 0.5) * d
      );
      this._envGroup.add(tree);
    }

    // Rocks (45)
    for (let i = 0; i < 45; i++) {
      const rockGeo = new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.6, 0);
      const greyBrown = 0x666655 + Math.floor(Math.random() * 0x222211);
      const rockMat = new THREE.MeshStandardMaterial({ color: greyBrown, roughness: 0.95, metalness: 0.05 });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(
        (Math.random() - 0.5) * w,
        0.2 + Math.random() * 0.2,
        (Math.random() - 0.5) * d
      );
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.castShadow = true;
      this._envGroup.add(rock);
    }

    // Path segments (20)
    for (let i = 0; i < 20; i++) {
      const segGeo = new THREE.BoxGeometry(2.5, 0.05, 3.0);
      const segMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 1.0 });
      const seg = new THREE.Mesh(segGeo, segMat);
      seg.position.set(
        i * 2.4 - 24,
        0.02,
        Math.sin(i * 0.4) * 3
      );
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
      tuft.position.set(
        (Math.random() - 0.5) * w,
        0,
        (Math.random() - 0.5) * d
      );
      this._envGroup.add(tuft);
    }

    // Fallen logs (10)
    for (let i = 0; i < 10; i++) {
      const logGeo = new THREE.CylinderGeometry(0.2, 0.25, 3 + Math.random() * 2, 8);
      const logMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.95 });
      const log = new THREE.Mesh(logGeo, logMat);
      log.rotation.z = Math.PI / 2;
      log.position.set(
        (Math.random() - 0.5) * w,
        0.2,
        (Math.random() - 0.5) * d
      );
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
      mush.position.set(
        (Math.random() - 0.5) * w,
        0,
        (Math.random() - 0.5) * d
      );
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
    stream.position.set(hw * 0.4, 0.03, 0);
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
      patch.position.set((Math.random() - 0.5) * w, 0, (Math.random() - 0.5) * d);
      this._envGroup.add(patch);
    }

    // Boulders (8)
    for (let i = 0; i < 8; i++) {
      const boulderGroup = new THREE.Group();
      const bRadius = 0.8 + Math.random() * 0.7;
      const boulderGeo = new THREE.SphereGeometry(bRadius, 6, 5);
      const boulderMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.95, metalness: 0.05 });
      const boulder = new THREE.Mesh(boulderGeo, boulderMat);
      boulder.position.y = bRadius * 0.5;
      boulder.castShadow = true;
      boulderGroup.add(boulder);
      const mossGeo = new THREE.SphereGeometry(bRadius * 0.35, 5, 4);
      const mossMat = new THREE.MeshStandardMaterial({ color: 0x447733, roughness: 1.0 });
      const moss = new THREE.Mesh(mossGeo, mossMat);
      moss.position.y = bRadius * 0.9;
      boulderGroup.add(moss);
      boulderGroup.position.set((Math.random() - 0.5) * w, 0, (Math.random() - 0.5) * d);
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
      bonesGroup.position.set((Math.random() - 0.5) * w, 0, (Math.random() - 0.5) * d);
      this._envGroup.add(bonesGroup);
    }

    // Wooden bridge over stream
    const wBridgeGeo = new THREE.BoxGeometry(3, 0.15, 1.5);
    const wBridgeMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
    const wBridge = new THREE.Mesh(wBridgeGeo, wBridgeMat);
    wBridge.position.set(hw * 0.4, 0.1, 0);
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
      campfire.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
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
  }

  private _buildElvenVillage(w: number, d: number): void {
    this._scene.fog = new THREE.FogExp2(0x334466, 0.012);
    (this._groundPlane.material as THREE.MeshStandardMaterial).color.setHex(0x4a6a4a);
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
      building.position.set(bx, 0, bz);
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

      lantern.position.set(
        (Math.random() - 0.5) * w * 0.9,
        0,
        (Math.random() - 0.5) * d * 0.9
      );
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

      tree.position.set(
        (Math.random() - 0.5) * w,
        0,
        (Math.random() - 0.5) * d
      );
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
    pond.position.set(5, 0.02, -5);
    this._envGroup.add(pond);

    const bridgeGeo = new THREE.BoxGeometry(2, 0.3, 8);
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.7 });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.set(5, 0.5, -5);
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

      ruin.position.set(
        -15 + (Math.random() - 0.5) * 10,
        0,
        10 + (Math.random() - 0.5) * 8
      );
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
      flowerGroup.position.set((Math.random() - 0.5) * w * 0.8, 0, (Math.random() - 0.5) * d * 0.8);
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
      archGroup.position.set((Math.random() - 0.5) * w * 0.6, 0, (Math.random() - 0.5) * d * 0.6);
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
    fountainGroup.position.set(0, 0, 0);
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
      statueGroup.position.set((Math.random() - 0.5) * w * 0.5, 0, (Math.random() - 0.5) * d * 0.5);
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
    fairyRingGroup.position.set((Math.random() - 0.5) * w * 0.4, 0, (Math.random() - 0.5) * d * 0.4);
    this._envGroup.add(fairyRingGroup);

    // Fallen leaves (15)
    const leafColors = [0xddaa33, 0xcc7722, 0xbb3322];
    for (let i = 0; i < 15; i++) {
      const leafGeo = new THREE.PlaneGeometry(0.12, 0.08);
      const leafMat = new THREE.MeshStandardMaterial({ color: leafColors[Math.floor(Math.random() * leafColors.length)], roughness: 0.9, side: THREE.DoubleSide });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      leaf.rotation.z = Math.random() * Math.PI * 2;
      leaf.position.set((Math.random() - 0.5) * w * 0.8, 0.02, (Math.random() - 0.5) * d * 0.8);
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
      benchGroup.position.set((Math.random() - 0.5) * w * 0.6, 0, (Math.random() - 0.5) * d * 0.6);
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
        ss.position.set(startX + dirX * s * 1.2, 0.03, startZ + dirZ * s * 1.2);
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
      shelfGroup.position.set((Math.random() - 0.5) * w * 0.5, 0, (Math.random() - 0.5) * d * 0.5);
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
      bannerGroup.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
      this._envGroup.add(bannerGroup);
    }
  }

  private _buildNecropolis(w: number, d: number): void {
    this._scene.fog = new THREE.FogExp2(0x110815, 0.03);
    (this._groundPlane.material as THREE.MeshStandardMaterial).color.setHex(0x1a1a22);
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
      pile.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0,
        (Math.random() - 0.5) * d * 0.8
      );
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
      torus.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0.05,
        (Math.random() - 0.5) * d * 0.7
      );
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
      bonePile.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0,
        (Math.random() - 0.5) * d * 0.8
      );
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

      coffin.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0,
        (Math.random() - 0.5) * d * 0.7
      );
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

      torch.position.set(tLight.position.x, 0, tLight.position.z);
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
      imGroup.position.set((Math.random() - 0.5) * w * 0.6, 0, (Math.random() - 0.5) * d * 0.6);
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
      chainGroup.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
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
      ratGroup.position.set((Math.random() - 0.5) * w * 0.8, 0, (Math.random() - 0.5) * d * 0.8);
      this._envGroup.add(ratGroup);
    }

    // Blood pools (6)
    for (let i = 0; i < 6; i++) {
      const bpRadius = 0.5 + Math.random();
      const bpGeo = new THREE.CircleGeometry(bpRadius, 12);
      const bpMat = new THREE.MeshStandardMaterial({ color: 0x880000, transparent: true, opacity: 0.3, roughness: 0.8 });
      const bp = new THREE.Mesh(bpGeo, bpMat);
      bp.rotation.x = -Math.PI / 2;
      bp.position.set((Math.random() - 0.5) * w * 0.7, 0.02, (Math.random() - 0.5) * d * 0.7);
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
      skelGroup.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
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
      cwGroup.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
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
      brazierGroup.position.set(bx, 0, bz);
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
      sarcGroup.position.set((Math.random() - 0.5) * w * 0.6, 0, (Math.random() - 0.5) * d * 0.6);
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
    altarGroup.position.set(0, 0, 0);
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
      caGroup.position.set((Math.random() - 0.5) * w * 0.6, 0, (Math.random() - 0.5) * d * 0.6);
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
      grateGroup.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
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
      ventGroup.position.set((Math.random() - 0.5) * w * 0.7, 0, (Math.random() - 0.5) * d * 0.7);
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
      cageGroup.position.set((Math.random() - 0.5) * w * 0.6, 0, (Math.random() - 0.5) * d * 0.6);
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
        wtGroup.position.set(wtx, 0, wtz);
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
        wtGroup.position.set((Math.random() - 0.5) * w * 0.8, 0, (Math.random() - 0.5) * d * 0.8);
      }
      this._envGroup.add(wtGroup);
    }
  }

  private _buildCamelot(w: number, d: number): void {
    // ── Lighting / Atmosphere ──
    this._scene.fog = new THREE.FogExp2(0x8899aa, 0.008);
    (this._groundPlane.material as THREE.MeshStandardMaterial).color.setHex(0x998877);
    this._dirLight.color.setHex(0xffeedd);
    this._dirLight.intensity = 1.3;
    this._ambientLight.color.setHex(0x556677);
    this._ambientLight.intensity = 0.6;
    this._hemiLight.color.setHex(0x99bbdd);
    this._hemiLight.groundColor.setHex(0x665544);

    const hw = w / 2;
    const hd = d / 2;

    // ── Paved Market Square (center, 30x30) ──
    const pavedGeo = new THREE.BoxGeometry(30, 0.06, 30);
    const pavedMat = new THREE.MeshStandardMaterial({ color: 0xbbaa99, roughness: 0.85 });
    const paved = new THREE.Mesh(pavedGeo, pavedMat);
    paved.position.set(0, 0.03, 0);
    paved.receiveShadow = true;
    this._envGroup.add(paved);

    // ── Main road from south gate to castle ──
    for (let i = 0; i < 12; i++) {
      const roadGeo = new THREE.BoxGeometry(5, 0.05, 4);
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.position.set(0, 0.025, -30 + 15 + i * 4);
      road.receiveShadow = true;
      this._envGroup.add(road);
    }

    // Side streets
    for (let i = 0; i < 8; i++) {
      const sideGeo = new THREE.BoxGeometry(3, 0.05, 3);
      const sideMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 });
      const sideRoad = new THREE.Mesh(sideGeo, sideMat);
      const sx = (i < 4 ? -1 : 1) * (5 + (i % 4) * 3);
      sideRoad.position.set(sx, 0.025, (i % 4) * 4 - 6);
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

      // Peaked roof (two angled planes)
      const roofColor = roofColors[bi % roofColors.length];
      const roofW = bw + 0.4;
      const roofD = bd + 0.4;
      const roofH = 1.5 + Math.random() * 0.5;
      const roofLeft = new THREE.Mesh(
        new THREE.PlaneGeometry(roofW, Math.sqrt(roofD * roofD / 4 + roofH * roofH)),
        new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7, side: THREE.DoubleSide })
      );
      roofLeft.position.set(0, bh + roofH * 0.4, -roofD * 0.15);
      roofLeft.rotation.x = -0.75;
      buildGroup.add(roofLeft);
      const roofRight = new THREE.Mesh(
        new THREE.PlaneGeometry(roofW, Math.sqrt(roofD * roofD / 4 + roofH * roofH)),
        new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7, side: THREE.DoubleSide })
      );
      roofRight.position.set(0, bh + roofH * 0.4, roofD * 0.15);
      roofRight.rotation.x = 0.75;
      buildGroup.add(roofRight);

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

    // Trees (15) - deciduous
    const treeGreens = [0x448833, 0x55aa44, 0x669944, 0x778833, 0xaa8833, 0xcc6622];
    for (let ti = 0; ti < 15; ti++) {
      const treeGroup = new THREE.Group();
      const trunkH = 1.5 + Math.random() * 1.5;
      const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, trunkH, 7);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      treeGroup.add(trunk);
      // Sphere crown
      const crownR = 1.0 + Math.random() * 0.8;
      const crownGeo = new THREE.SphereGeometry(crownR, 8, 6);
      const crownMat = new THREE.MeshStandardMaterial({ color: treeGreens[ti % treeGreens.length], roughness: 0.8 });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = trunkH + crownR * 0.6;
      crown.castShadow = true;
      treeGroup.add(crown);
      // Place around perimeter
      const tAngle = (ti / 15) * Math.PI * 2;
      const tRadius = hw * 0.7 + Math.random() * 5;
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

    // Sacks of grain near market (6)
    for (let si = 0; si < 6; si++) {
      const sackGeo = new THREE.SphereGeometry(0.25, 6, 5);
      const sackMat = new THREE.MeshStandardMaterial({ color: 0xaa9955, roughness: 0.9 });
      const sack = new THREE.Mesh(sackGeo, sackMat);
      sack.scale.set(1, 0.7, 1);
      sack.position.set(
        -6 + si * 0.6 + (Math.random() - 0.5) * 0.3,
        0.18,
        7 + (Math.random() - 0.5) * 0.5
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
  }

  // ════════════════════════════════════════════════════════════════════
  //  VOLCANIC WASTES MAP
  // ════════════════════════════════════════════════════════════════════
  private _buildVolcanicWastes(w: number, d: number): void {
    this._scene.fog = new THREE.FogExp2(0x331100, 0.02);
    (this._groundPlane.material as THREE.MeshStandardMaterial).color.setHex(0x2a1a0a);
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
      river.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0.05,
        (Math.random() - 0.5) * d * 0.7
      );
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
      rock.position.set(
        (Math.random() - 0.5) * w * 0.9,
        rSize * 0.3,
        (Math.random() - 0.5) * d * 0.9
      );
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
      ruinGroup.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0,
        (Math.random() - 0.5) * d * 0.7
      );
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
      ventGroup.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0,
        (Math.random() - 0.5) * d * 0.8
      );
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
      boneGroup.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0,
        (Math.random() - 0.5) * d * 0.8
      );
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
  }

  // ════════════════════════════════════════════════════════════════════
  //  ABYSSAL RIFT MAP
  // ════════════════════════════════════════════════════════════════════
  private _buildAbyssalRift(w: number, d: number): void {
    this._scene.fog = new THREE.FogExp2(0x0a0020, 0.035);
    (this._groundPlane.material as THREE.MeshStandardMaterial).color.setHex(0x0d0a1e);
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
      fissure.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.03,
        (Math.random() - 0.5) * d * 0.8
      );
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
      spireGroup.position.set(
        (Math.random() - 0.5) * w * 0.85,
        0,
        (Math.random() - 0.5) * d * 0.85
      );
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
      rune.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0.02,
        (Math.random() - 0.5) * d * 0.8
      );
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
      pillarGroup.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0,
        (Math.random() - 0.5) * d * 0.8
      );
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
  }

  // ════════════════════════════════════════════════════════════════════
  //  DRAGON'S SANCTUM MAP
  // ════════════════════════════════════════════════════════════════════
  private _buildDragonsSanctum(w: number, d: number): void {
    this._scene.fog = new THREE.FogExp2(0x221100, 0.015);
    (this._groundPlane.material as THREE.MeshStandardMaterial).color.setHex(0x3a2a1a);
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
      pileGroup.position.set(
        (Math.random() - 0.5) * w * 0.85,
        0,
        (Math.random() - 0.5) * d * 0.85
      );
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
      colGroup.position.set(
        (Math.random() - 0.5) * w * 0.85,
        0,
        (Math.random() - 0.5) * d * 0.85
      );
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
      egg.position.set(
        (Math.random() - 0.5) * w * 0.6,
        0.2,
        (Math.random() - 0.5) * d * 0.6
      );
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

      bGroup.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0,
        (Math.random() - 0.5) * d * 0.8
      );
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
      skullGroup.position.set(
        (Math.random() - 0.5) * w * 0.7,
        0.3,
        (Math.random() - 0.5) * d * 0.7
      );
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
      wpGroup.position.set(
        (Math.random() - 0.5) * w * 0.8,
        0,
        (Math.random() - 0.5) * d * 0.8
      );
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

        // Head (sphere)
        const headGeo = new THREE.SphereGeometry(0.15, 8, 6);
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.7 });
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 1.35;
        head.castShadow = true;
        mesh.add(head);

        // Torso (box)
        const torsoGeo = new THREE.BoxGeometry(0.35, 0.5, 0.2);
        const robeMat = new THREE.MeshStandardMaterial({ color: robeColor, roughness: 0.7 });
        const torso = new THREE.Mesh(torsoGeo, robeMat);
        torso.position.y = 1.0;
        torso.castShadow = true;
        mesh.add(torso);

        // Robe (cone)
        const robeGeo = new THREE.ConeGeometry(0.3, 0.7, 8);
        const robe = new THREE.Mesh(robeGeo, robeMat);
        robe.position.y = 0.45;
        robe.castShadow = true;
        mesh.add(robe);

        // Arms
        for (const side of [-1, 1]) {
          const armGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.4, 6);
          const arm = new THREE.Mesh(armGeo, robeMat);
          arm.position.set(side * 0.25, 0.95, 0);
          arm.rotation.z = side * 0.3;
          mesh.add(arm);
        }

        // Hat/hood detail by type
        if (vendor.type === VendorType.ARCANIST) {
          const hatGeo = new THREE.ConeGeometry(0.18, 0.4, 6);
          const hatMat = new THREE.MeshStandardMaterial({ color: 0x4411aa, roughness: 0.6 });
          const hat = new THREE.Mesh(hatGeo, hatMat);
          hat.position.y = 1.65;
          mesh.add(hat);
        } else if (vendor.type === VendorType.BLACKSMITH) {
          // Apron
          const apronGeo = new THREE.BoxGeometry(0.3, 0.35, 0.05);
          const apronMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.8 });
          const apron = new THREE.Mesh(apronGeo, apronMat);
          apron.position.set(0, 0.85, 0.13);
          mesh.add(apron);
        }

        // Face toward center
        mesh.position.set(vendor.x, 0, vendor.z);
        mesh.lookAt(0, 0, 0);
        mesh.rotation.x = 0; // Keep upright
        mesh.rotation.z = 0;

        this._scene.add(mesh);
        this._vendorMeshes.set(vendor.id, mesh);
      }

      // Update position
      mesh.position.set(vendor.x, 0, vendor.z);
    }
  }

  buildPlayer(cls: DiabloClass): void {
    while (this._playerGroup.children.length > 0) {
      this._playerGroup.remove(this._playerGroup.children[0]);
    }
    this._weaponMesh = null;
    this._weaponArmGroup = null;

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

    // Legs
    const legMat = torsoMat.clone();
    for (let side = -1; side <= 1; side += 2) {
      // Thigh
      const thighGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.4, 8);
      const thigh = new THREE.Mesh(thighGeo, legMat);
      thigh.position.set(side * 0.12, 0.73, 0);
      thigh.castShadow = true;
      this._playerGroup.add(thigh);

      // Knee joint (small sphere)
      const kneeGeo = new THREE.SphereGeometry(0.055, 6, 5);
      const knee = new THREE.Mesh(kneeGeo, legMat);
      knee.position.set(side * 0.12, 0.53, 0);
      this._playerGroup.add(knee);

      // Shin
      const shinGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.4, 8);
      const shin = new THREE.Mesh(shinGeo, legMat);
      shin.position.set(side * 0.12, 0.33, 0);
      shin.castShadow = true;
      this._playerGroup.add(shin);

      // Ankle joint (small sphere)
      const ankleGeo = new THREE.SphereGeometry(0.045, 6, 5);
      const ankle = new THREE.Mesh(ankleGeo, legMat);
      ankle.position.set(side * 0.12, 0.13, 0);
      this._playerGroup.add(ankle);

      // Foot
      const footGeo = new THREE.BoxGeometry(0.12, 0.06, 0.2);
      const foot = new THREE.Mesh(footGeo, legMat);
      foot.position.set(side * 0.12, 0.05, 0.04);
      this._playerGroup.add(foot);
    }

    // Arms
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.35, 1.35, 0);
    this._playerGroup.add(rightArmGroup);
    this._weaponArmGroup = rightArmGroup;

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.35, 1.35, 0);
    this._playerGroup.add(leftArmGroup);

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
    const color = RARITY_COLORS[rarity];

    const baseMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.3,
    });

    // Box base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), baseMat);
    base.position.y = 0.25;
    base.castShadow = true;
    group.add(base);

    // Half-cylinder lid
    const lidGeo = new THREE.CylinderGeometry(0.41, 0.41, 0.82, 10, 1, false, 0, Math.PI);
    const lid = new THREE.Mesh(lidGeo, baseMat);
    lid.rotation.z = Math.PI / 2;
    lid.position.y = 0.5;

    if (opened) {
      lid.rotation.x = -Math.PI * 0.6;
      lid.position.z = -0.25;
      lid.position.y = 0.7;
    }

    lid.castShadow = true;
    group.add(lid);

    // Metal bands
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 });
    const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 0.02), bandMat);
    band1.position.set(0, 0.3, 0.3);
    group.add(band1);
    const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 0.02), bandMat);
    band2.position.set(0, 0.3, -0.3);
    group.add(band2);

    // Lock
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.05), bandMat);
    lock.position.set(0, 0.5, 0.32);
    group.add(lock);

    return group;
  }

  update(state: DiabloState, dt: number): void {
    if (state.phase !== DiabloPhase.PLAYING) {
      return;
    }

    this._time += dt;

    // -- Camera: smooth lerp to player + isometric offset --
    const camTargetX = state.player.x + 12;
    const camTargetY = 18;
    const camTargetZ = state.player.z + 12;
    const lerpSpeed = 3.0 * dt;
    this._camera.position.x += (camTargetX - this._camera.position.x) * Math.min(lerpSpeed, 1);
    this._camera.position.y += (camTargetY - this._camera.position.y) * Math.min(lerpSpeed, 1);
    this._camera.position.z += (camTargetZ - this._camera.position.z) * Math.min(lerpSpeed, 1);
    this._camera.lookAt(state.player.x, 0, state.player.z);

    // -- Player --
    this._playerGroup.position.set(state.player.x, state.player.y, state.player.z);
    this._playerGroup.rotation.y = state.player.angle;

    // Attack animation: rotate weapon arm
    if (state.player.isAttacking && this._weaponArmGroup) {
      const t = state.player.attackTimer;
      this._weaponArmGroup.rotation.x = Math.sin(t * 10) * 1.2;
    } else if (this._weaponArmGroup) {
      this._weaponArmGroup.rotation.x *= 0.85;
    }

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

  private _syncProjectiles(state: DiabloState): void {
    const currentIds = new Set(state.projectiles.map((p) => p.id));

    // Remove old
    for (const [id, mesh] of this._projectileMeshes) {
      if (!currentIds.has(id)) {
        this._scene.remove(mesh);
        this._projectileMeshes.delete(id);
      }
    }

    // Add/update
    for (const proj of state.projectiles) {
      let mesh = this._projectileMeshes.get(proj.id);
      if (!mesh) {
        let color = 0xffaa00;
        let emissive = 0xff6600;
        if (proj.skillId) {
          switch (proj.skillId) {
            case SkillId.FIREBALL:
              color = 0xff4400;
              emissive = 0xff2200;
              break;
            case SkillId.ICE_NOVA:
              color = 0x88ccff;
              emissive = 0x4488cc;
              break;
            case SkillId.LIGHTNING_BOLT:
            case SkillId.CHAIN_LIGHTNING:
              color = 0xffff44;
              emissive = 0xaaaa00;
              break;
            case SkillId.POISON_ARROW:
              color = 0x44ff44;
              emissive = 0x22aa22;
              break;
            case SkillId.MULTI_SHOT:
            case SkillId.PIERCING_SHOT:
              color = 0xaa8844;
              emissive = 0x664422;
              break;
            default:
              color = 0xffaa00;
              emissive = 0xff6600;
              break;
          }
        }

        const geo = new THREE.SphereGeometry(proj.radius || 0.15, 8, 6);
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive,
          emissiveIntensity: 1.5,
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        this._scene.add(mesh);
        this._projectileMeshes.set(proj.id, mesh);
      }

      mesh.position.set(proj.x, proj.y, proj.z);
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

      // Fade based on timer
      if (sprite.material instanceof THREE.SpriteMaterial) {
        sprite.material.opacity = Math.max(0, 1.0 - ft.timer * 0.8);
      }
    }
  }

  private _createTextSprite(text: string, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(text, 128, 32);
    ctx.fillText(text, 128, 32);

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
    this._projectileMeshes.clear();
    this._lootMeshes.clear();
    this._chestMeshes.clear();
    this._aoeMeshes.clear();
    this._floatTextSprites.clear();
    for (const [, mesh] of this._vendorMeshes) {
      this._scene.remove(mesh);
    }
    this._vendorMeshes.clear();

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
          this._dirLight.color.setHex(0x554466);
          this._dirLight.intensity = 0.4;
          this._ambientLight.color.setHex(0x1a1020);
          this._ambientLight.intensity = 0.4;
          this._hemiLight.color.setHex(0x332244);
          this._hemiLight.groundColor.setHex(0x110808);
          (this._scene.fog as THREE.FogExp2).color.setHex(0x110815);
          (this._scene.fog as THREE.FogExp2).density = 0.025;
          this._renderer.toneMappingExposure = 0.9;
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
          this._dirLight.color.setHex(0xff6633);
          this._dirLight.intensity = 1.0;
          this._ambientLight.color.setHex(0x441100);
          this._ambientLight.intensity = 0.5;
          (this._scene.fog as THREE.FogExp2).color.setHex(0x331100);
          (this._scene.fog as THREE.FogExp2).density = 0.02;
          this._renderer.toneMappingExposure = 1.0;
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
          this._dirLight.color.setHex(0x6644aa);
          this._dirLight.intensity = 0.6;
          this._ambientLight.color.setHex(0x110033);
          this._ambientLight.intensity = 0.4;
          (this._scene.fog as THREE.FogExp2).color.setHex(0x0a0020);
          (this._scene.fog as THREE.FogExp2).density = 0.035;
          this._renderer.toneMappingExposure = 0.9;
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
          this._dirLight.color.setHex(0xffaa44);
          this._dirLight.intensity = 1.2;
          this._ambientLight.color.setHex(0x332200);
          this._ambientLight.intensity = 0.5;
          (this._scene.fog as THREE.FogExp2).color.setHex(0x221100);
          (this._scene.fog as THREE.FogExp2).density = 0.015;
          this._renderer.toneMappingExposure = 1.0;
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
    }
  }
}
