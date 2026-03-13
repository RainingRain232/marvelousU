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
} from './DiabloTypes';
import { ENEMY_DEFS, MAP_CONFIGS } from './DiabloConfig';
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
  }

  buildPlayer(cls: DiabloClass): void {
    while (this._playerGroup.children.length > 0) {
      this._playerGroup.remove(this._playerGroup.children[0]);
    }
    this._weaponMesh = null;
    this._weaponArmGroup = null;

    const skinColor = 0xdeb887;
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });

    // Head
    const headGeo = new THREE.SphereGeometry(0.18, 10, 8);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.6;
    head.castShadow = true;
    this._playerGroup.add(head);

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

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.55, 0.3);
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.2;
    torso.castShadow = true;
    this._playerGroup.add(torso);

    // Legs
    const legMat = torsoMat.clone();
    for (let side = -1; side <= 1; side += 2) {
      // Thigh
      const thighGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.4, 8);
      const thigh = new THREE.Mesh(thighGeo, legMat);
      thigh.position.set(side * 0.12, 0.73, 0);
      thigh.castShadow = true;
      this._playerGroup.add(thigh);

      // Shin
      const shinGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.4, 8);
      const shin = new THREE.Mesh(shinGeo, legMat);
      shin.position.set(side * 0.12, 0.33, 0);
      shin.castShadow = true;
      this._playerGroup.add(shin);

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

      const handGeo = new THREE.SphereGeometry(0.05, 6, 5);
      const hand = new THREE.Mesh(handGeo, skinMat);
      hand.position.y = -0.62;
      armGroup.add(hand);
    }

    // Class-specific gear
    switch (cls) {
      case DiabloClass.WARRIOR: {
        // Pauldrons
        for (let side = -1; side <= 1; side += 2) {
          const pauldronGeo = new THREE.SphereGeometry(0.14, 8, 6);
          const pauldronMat = new THREE.MeshStandardMaterial({ color: 0x777788, metalness: 0.8, roughness: 0.2 });
          const pauldron = new THREE.Mesh(pauldronGeo, pauldronMat);
          pauldron.position.set(side * 0.35, 1.42, 0);
          pauldron.castShadow = true;
          this._playerGroup.add(pauldron);
        }

        // Sword
        const swordGroup = new THREE.Group();
        const bladeGeo = new THREE.BoxGeometry(0.06, 0.8, 0.02);
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.9, roughness: 0.1 });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = -0.4;
        swordGroup.add(blade);

        const pommelGeo = new THREE.SphereGeometry(0.04, 6, 5);
        const pommelMat = new THREE.MeshStandardMaterial({ color: 0x886633, metalness: 0.5 });
        const pommel = new THREE.Mesh(pommelGeo, pommelMat);
        pommel.position.y = 0.02;
        swordGroup.add(pommel);

        const guardGeo = new THREE.BoxGeometry(0.2, 0.03, 0.04);
        const guard = new THREE.Mesh(guardGeo, bladeMat);
        guard.position.y = -0.02;
        swordGroup.add(guard);

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
        break;
      }

      case DiabloClass.MAGE: {
        // Robe cone from waist
        const robeGeo = new THREE.ConeGeometry(0.4, 0.8, 10);
        const robeMat = new THREE.MeshStandardMaterial({ color: 0x1a0a3a, roughness: 0.9 });
        const robe = new THREE.Mesh(robeGeo, robeMat);
        robe.position.y = 0.5;
        this._playerGroup.add(robe);

        // Pointed hat
        const hatGeo = new THREE.ConeGeometry(0.2, 0.4, 8);
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x1a0a3a, roughness: 0.8 });
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

        const orbGeo = new THREE.SphereGeometry(0.1, 10, 8);
        const orbMat = new THREE.MeshStandardMaterial({
          color: 0x8844ff,
          emissive: 0x6622cc,
          emissiveIntensity: 1.5,
          transparent: true,
          opacity: 0.9,
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.y = 0.45;
        staffGroup.add(orb);

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

        // Arrows in quiver
        for (let a = 0; a < 4; a++) {
          const arrowGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.55, 4);
          const arrowMat = new THREE.MeshStandardMaterial({ color: 0x886644 });
          const arrow = new THREE.Mesh(arrowGeo, arrowMat);
          arrow.position.set(
            0.15 + (a - 1.5) * 0.025,
            1.35,
            -0.2
          );
          this._playerGroup.add(arrow);
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

        const snoutGeo = new THREE.ConeGeometry(0.1, 0.3, 6);
        const snout = new THREE.Mesh(snoutGeo, bodyMat);
        snout.rotation.x = -Math.PI / 2;
        snout.position.set(0, 0.55, 0.6);
        group.add(snout);

        for (let side = -1; side <= 1; side += 2) {
          const earGeo = new THREE.ConeGeometry(0.06, 0.15, 4);
          const ear = new THREE.Mesh(earGeo, bodyMat);
          ear.position.set(side * 0.12, 0.75, 0.35);
          group.add(ear);
        }

        const tailGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.4, 6);
        const tail = new THREE.Mesh(tailGeo, bodyMat);
        tail.position.set(0, 0.6, -0.55);
        tail.rotation.x = -0.6;
        group.add(tail);

        // Legs
        for (let lx = -1; lx <= 1; lx += 2) {
          for (let lz = -1; lz <= 1; lz += 2) {
            const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6);
            const leg = new THREE.Mesh(legGeo, bodyMat);
            leg.position.set(lx * 0.2, 0.18, lz * 0.3);
            group.add(leg);
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
        // Legs
        for (let side = -1; side <= 1; side += 2) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.7, 8), mat);
          leg.position.set(side * 0.1, 0.5, 0);
          group.add(leg);
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
        break;
      }

      case EnemyType.BEAR: {
        const mat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.85 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), mat);
        body.position.y = 0.9;
        body.scale.set(1, 0.85, 1.2);
        body.castShadow = true;
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), mat);
        head.position.set(0, 1.3, 0.7);
        group.add(head);

        const snout = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 5), mat);
        snout.position.set(0, 1.2, 1.05);
        group.add(snout);

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

        // Eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 });
        for (let side = -1; side <= 1; side += 2) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), eyeMat);
          eye.position.set(side * 0.1, 0.6, 0.2);
          group.add(eye);
        }

        // 8 legs
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

        // Bow
        const bowGeo = new THREE.TorusGeometry(0.35, 0.02, 6, 10, Math.PI);
        const bowMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.8 });
        const bow = new THREE.Mesh(bowGeo, bowMat);
        bow.position.set(-0.35, 1.0, 0.15);
        bow.rotation.z = Math.PI / 2;
        group.add(bow);
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

        // Purple eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822dd, emissiveIntensity: 2.0 });
        for (let side = -1; side <= 1; side += 2) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), eyeMat);
          eye.position.set(side * 0.15, 2.0, 0.3);
          group.add(eye);
        }
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

        // Sword
        const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.015),
          new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.3 }));
        swordBlade.position.set(0.3, 0.8, 0);
        group.add(swordBlade);
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

        // Legs
        for (let side = -1; side <= 1; side += 2) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.65, 8), clothMat);
          leg.position.set(side * 0.1, 0.4, 0);
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

        const staffSkull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.7 }));
        staffSkull.position.set(0.3, 1.95, 0);
        group.add(staffSkull);
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

        // Hidden teeth (subtle hint)
        const teethMat = new THREE.MeshStandardMaterial({ color: 0xeeeecc });
        for (let t = 0; t < 5; t++) {
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), teethMat);
          tooth.position.set(-0.3 + t * 0.15, 0.5, 0.31);
          tooth.rotation.x = Math.PI;
          group.add(tooth);
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

    this._renderer.dispose();
  }

  resize(w: number, h: number): void {
    this._renderer.setSize(w, h);
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
  }
}
