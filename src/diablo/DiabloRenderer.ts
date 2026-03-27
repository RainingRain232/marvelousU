import * as THREE from 'three';
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
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
  DamageType,
  PetSpecies,
  PetAIState,
  DungeonLayout,
  BossAbility,
} from './DiabloTypes';
import { MAP_CONFIGS, BOSS_PHASE_CONFIGS } from './DiabloConfig';
import { RARITY_COLORS } from './DiabloTypes';
import { createEnemyMesh } from './DiabloRendererEnemies';
import { buildPlayerMesh, PlayerBuildContext } from './DiabloRendererPlayer';
import { applyTimeOfDay as applyTimeOfDayImpl, TimeOfDayContext } from './DiabloRendererLighting';
import { MapBuildContext, buildForest, buildElvenVillage, buildNecropolis, buildCamelot, buildVolcanicWastes, buildAbyssalRift, buildDragonsSanctum, buildSunscorchDesert, buildEmeraldGrasslands, buildWhisperingMarsh, buildCrystalCaverns, buildFrozenTundra, buildHauntedCathedral, buildThornwoodThicket, buildClockworkFoundry, buildCrimsonCitadel, buildStormspirePeak, buildShadowRealm, buildPrimordialAbyss, buildMoonlitGrove, buildCoralDepths, buildAncientLibrary, buildJadeTemple, buildAshenBattlefield, buildFungalDepths, buildObsidianFortress, buildCelestialRuins, buildInfernalThrone, buildAstralVoid, buildShatteredColosseum, buildPetrifiedGarden, buildSunkenCitadel, buildWyrmscarCanyon, buildPlaguerotSewers, buildEtherealSanctum, buildIronWastes, buildBlightedThrone, buildChronoLabyrinth, buildEldritchNexus, buildCityRuins, buildCity } from './DiabloRendererMaps';

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
  private _enemyHpBars: Map<string, THREE.Sprite> = new Map();
  private _enemyFlashTimers: Map<string, number> = new Map();
  private _projectileMeshes: Map<string, THREE.Object3D> = new Map();
  private _lootMeshes: Map<string, THREE.Group> = new Map();
  private _chestMeshes: Map<string, THREE.Group> = new Map();
  private _aoeMeshes: Map<string, THREE.Group> = new Map();
  private _vendorMeshes: Map<string, THREE.Group> = new Map();
  private _townfolkMeshes: Map<string, THREE.Group> = new Map();
  private _floatTextSprites: Map<string, THREE.Sprite> = new Map();
  private _envGroup!: THREE.Group;
  private _currentMap: DiabloMapId | null = null;
  private _time: number = 0;
  private _dt: number = 0;
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
  private _swingArc: THREE.Mesh | null = null;
  private _swingArcTimer: number = 0;

  // First-person mode
  public firstPerson: boolean = false;
  public fpYaw: number = 0;
  public fpPitch: number = 0;
  private _fpWeapon: THREE.Group | null = null;

  private _raycaster: THREE.Raycaster = new THREE.Raycaster();
  private _shieldMeshes: Map<string, THREE.Mesh> = new Map();
  private _healBeams: Map<string, THREE.Line> = new Map();
  private _invulnMesh: THREE.Mesh | null = null;
  private _fadeEl: HTMLDivElement | null = null;
  private _vignetteEl: HTMLDivElement | null = null;
  private _skillFlashEl: HTMLDivElement | null = null;
  private _skillFlashTimer: number = 0;
  private _dodgeGhosts: { mesh: THREE.Group; timer: number }[] = [];

  private _particleMeshPool: THREE.Mesh[] = [];
  private _particlePoolSize: number = 500;
  private _particleMat!: THREE.MeshStandardMaterial;
  private _sharedParticleGeo: THREE.SphereGeometry | null = null;

  /** Axis-aligned collision boxes for buildings: [centerX, centerZ, halfWidth, halfDepth] */
  buildingColliders: [number, number, number, number][] = [];

  private _shakeIntensity: number = 0;
  private _shakeDuration: number = 0;
  private _shakeTimer: number = 0;
  private _shakeOffsetX: number = 0;
  private _shakeOffsetY: number = 0;
  private _shakeOffsetZ: number = 0;
  private _telegraphMeshes: Map<string, THREE.Mesh> = new Map();

  private _rngSeed: number = 0;
  private _currentWeather: Weather = Weather.NORMAL;
  private _stormFlashTimer: number = 0;
  private _stormFlashActive: boolean = false;
  private _baseFogDensity: number = 0;
  private _baseAmbientIntensity: number = 0;
  private _baseDirIntensity: number = 0;

  // Rain particle system
  private _rainGroup: THREE.Group | null = null;
  private _rainDrops: THREE.Mesh[] = [];
  private _rainSplashes: THREE.Mesh[] = [];
  private _rainSplashTimers: number[] = [];
  private _rainActive: boolean = false;

  // Ambient world particles (dust motes, fireflies)
  private _ambientParticleGroup: THREE.Group | null = null;
  private _ambientMotes: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number }[] = [];

  // Pet rendering
  private _petMeshes: Map<string, THREE.Group> = new Map();

  // Enemy death animation tracking (id -> { timer, sinkY, initialY })
  private _dyingAnims: Map<string, { timer: number; sinkY: number; initialY: number; scattered: boolean }> = new Map();

  // Skill cast effect meshes (temporary visual bursts at player position)
  private _castEffectGroup: THREE.Group | null = null;
  private _castEffectTimer: number = 0;
  private _prevActiveSkillTimer: number = 0;

  // Water surface meshes for animation
  private _waterMeshes: THREE.Mesh[] = [];
  private _waterOriginalY: Map<THREE.Mesh, number> = new Map();
  private _waterMesh: THREE.Mesh | null = null;

  // Player status effect overlay meshes — pooled per effect type
  private _playerStatusFxGroup: THREE.Group | null = null;
  private _playerStatusFxPools: Map<string, THREE.Group> = new Map();
  private _playerActiveEffects: Set<string> = new Set();

  // Dodge roll animation state
  private _dodgeRollAngle: number = 0;
  private _dodgeDirection: number = 0;
  private _wasDodging: boolean = false;

  // Loot drop animation tracking (id -> spawn time)
  private _lootSpawnTimes: Map<string, number> = new Map();

  // Boss arena hazard effect meshes
  private _bossEffectMeshes: Map<string, THREE.Mesh> = new Map();

  // Boss telegraph enhancements
  private _bossWarningRings: Map<string, THREE.Group> = new Map();

  // Remote multiplayer player meshes
  private _remotePlayerMeshes: Map<string, THREE.Group> = new Map();

  // Dungeon layout rendering
  private _dungeonGroup: THREE.Group | null = null;

  private _skyDome: THREE.Mesh | null = null;

  private _footprints: THREE.Mesh[] = [];
  private _footprintTimers: number[] = [];
  private _footprintCooldown: number = 0;
  private _footprintGeo: THREE.CircleGeometry | null = null;
  private _footprintMat: THREE.MeshBasicMaterial | null = null;

  // Environmental destruction animation tracking
  private _destroyingProps: {
    obj: THREE.Object3D;
    timer: number;
    duration: number;
    knockX: number;
    knockZ: number;
    knockSpeed: number;
    originalScale: THREE.Vector3;
  }[] = [];

  // HP bar change tracking (only redraw canvas when HP changes)
  private _lastEnemyHp: Map<string, number> = new Map();

  // Cached material arrays per enemy (avoid traverse() every frame)
  private _enemyMaterials: Map<string, THREE.MeshStandardMaterial[]> = new Map();

  // Shared status-effect geometries (created once, reused for all enemies)
  private _emberGeo: THREE.SphereGeometry | null = null;
  private _flameGeo: THREE.ConeGeometry | null = null;
  private _heatGlowGeo: THREE.SphereGeometry | null = null;
  private _crystalGeo: THREE.OctahedronGeometry | null = null;
  private _frostShellGeo: THREE.IcosahedronGeometry | null = null;
  private _frostMoteGeo: THREE.SphereGeometry | null = null;
  private _frostRingGeo: THREE.TorusGeometry | null = null;
  private _poisonMistGeo: THREE.SphereGeometry | null = null;
  private _poisonBubbleGeo: THREE.SphereGeometry | null = null;

  // Post-processing
  private _bloomComposer: EffectComposer | null = null;


  private _mapCtx(): MapBuildContext {
    return {
      scene: this._scene,
      envGroup: this._envGroup,
      dirLight: this._dirLight,
      ambientLight: this._ambientLight,
      hemiLight: this._hemiLight,
      torchLights: this._torchLights,
      buildingColliders: this.buildingColliders,
      applyTerrainColors: (b: number, s: number, a?: number) => this._applyTerrainColors(b, s, a),
    };
  }

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

    this._sphereGeo = new THREE.SphereGeometry(1, 36, 30);
    this._boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this._cylGeo = new THREE.CylinderGeometry(1, 1, 1, 30);
    this._coneGeo = new THREE.ConeGeometry(1, 2, 30);

    this._envGroup = new THREE.Group();
    this._scene.add(this._envGroup);

    this._playerGroup = new THREE.Group();
    this._scene.add(this._playerGroup);

    const groundGeo = new THREE.PlaneGeometry(200, 200, 256, 256);
    groundGeo.rotateX(-Math.PI / 2);
    const posAttr = groundGeo.attributes.position;
    const defaultColors: number[] = [];
    const c1 = new THREE.Color(0x446622);
    const c2 = new THREE.Color(0x668833);
    const c3 = new THREE.Color(0x335518); // dark patch color
    for (let i = 0; i < posAttr.count; i++) {
      const gx = posAttr.getX(i);
      const gz = posAttr.getZ(i);
      const h = getTerrainHeight(gx, gz);
      posAttr.setY(i, h);
      const t = THREE.MathUtils.clamp((h / 1.6) * 0.5 + 0.5, 0, 1);
      const col = new THREE.Color().lerpColors(c1, c2, t);
      // Micro-noise for natural terrain variation (patchy grass/dirt)
      const noise = Math.sin(gx * 1.7) * Math.cos(gz * 2.3) * 0.5
        + Math.sin(gx * 4.1 + gz * 3.7) * 0.25
        + Math.sin(gx * 8.3 - gz * 6.1) * 0.12;
      const darkPatch = Math.max(0, noise) * 0.15;
      col.lerp(c3, darkPatch);
      // Subtle brightness variation
      const brightnessNoise = (Math.sin(gx * 0.8 + gz * 1.1) * 0.06);
      col.r = Math.max(0, col.r + brightnessNoise);
      col.g = Math.max(0, col.g + brightnessNoise);
      col.b = Math.max(0, col.b + brightnessNoise * 0.5);
      defaultColors.push(col.r, col.g, col.b);
    }
    groundGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(defaultColors), 3));
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.0 });
    this._groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this._groundPlane.receiveShadow = true;
    this._scene.add(this._groundPlane);

    const particleGeo = new THREE.SphereGeometry(1, 17, 16);
    this._sharedParticleGeo = particleGeo;
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

    // Post-processing: bloom for magic effects, loot beams, emissive surfaces
    const renderPass = new RenderPass(this._scene, this._camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      0.35,  // strength — subtle so it enhances without washing out
      0.4,   // radius
      0.85   // threshold — only bright emissives bloom
    );
    this._bloomComposer = new EffectComposer(this._renderer);
    this._bloomComposer.addPass(renderPass);
    this._bloomComposer.addPass(bloomPass);

    // Sky dome
    const skyGeo = new THREE.SphereGeometry(150, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x4488cc, side: THREE.BackSide,
      fog: false,
    });
    this._skyDome = new THREE.Mesh(skyGeo, skyMat);
    this._skyDome.position.y = -5;
    this._scene.add(this._skyDome);

    // Rain particle system (initially hidden)
    this._rainGroup = new THREE.Group();
    this._rainGroup.visible = false;
    this._scene.add(this._rainGroup);
    const rainGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.6, 3);
    const rainMat = new THREE.MeshBasicMaterial({ color: 0x8899bb, transparent: true, opacity: 0.4 });
    for (let i = 0; i < 400; i++) {
      const drop = new THREE.Mesh(rainGeo, rainMat);
      drop.position.set(
        (Math.random() - 0.5) * 60,
        Math.random() * 25 + 5,
        (Math.random() - 0.5) * 60,
      );
      this._rainGroup.add(drop);
      this._rainDrops.push(drop);
    }
    // Rain splash pools (ground impact circles)
    const splashGeo = new THREE.RingGeometry(0, 0.2, 8);
    splashGeo.rotateX(-Math.PI / 2);
    const splashMat = new THREE.MeshBasicMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    for (let i = 0; i < 30; i++) {
      const splash = new THREE.Mesh(splashGeo.clone(), splashMat.clone());
      splash.visible = false;
      this._rainGroup.add(splash);
      this._rainSplashes.push(splash);
      this._rainSplashTimers.push(0);
    }

    // Ambient world particle group
    this._ambientParticleGroup = new THREE.Group();
    this._scene.add(this._ambientParticleGroup);
  }

  /** Re-color the terrain mesh with height-based blending between two colors.
   *  For indoor/dungeon maps, pass a lower amplitude to flatten terrain. */
  private _applyTerrainColors(baseColor: number, secondaryColor: number, amplitude: number = 1.4): void {
    const geo = this._groundPlane.geometry as THREE.BufferGeometry;
    const posAttr = geo.attributes.position;
    const c1 = new THREE.Color(baseColor);
    const c2 = new THREE.Color(secondaryColor);
    // Derive a darker accent from the base for natural variation
    const c3 = new THREE.Color(baseColor).multiplyScalar(0.65);
    const colors: number[] = [];
    for (let i = 0; i < posAttr.count; i++) {
      const gx = posAttr.getX(i);
      const gz = posAttr.getZ(i);
      const h = getTerrainHeight(gx, gz, amplitude);
      posAttr.setY(i, h);
      const t = THREE.MathUtils.clamp((h / (amplitude * 1.15)) * 0.5 + 0.5, 0, 1);
      const col = new THREE.Color().lerpColors(c1, c2, t);
      // Multi-frequency noise for patchy natural ground (dirt spots, worn paths)
      const n1 = Math.sin(gx * 1.7) * Math.cos(gz * 2.3) * 0.5
        + Math.sin(gx * 4.1 + gz * 3.7) * 0.25
        + Math.sin(gx * 8.3 - gz * 6.1) * 0.12;
      const darkPatch = Math.max(0, n1) * 0.2;
      col.lerp(c3, darkPatch);
      // High-frequency brightness dither (breaks up banding)
      const dither = (Math.sin(gx * 12.7 + gz * 9.3) * 0.015)
        + (Math.cos(gx * 7.1 - gz * 11.9) * 0.01);
      col.r = Math.max(0, Math.min(1, col.r + dither));
      col.g = Math.max(0, Math.min(1, col.g + dither));
      col.b = Math.max(0, Math.min(1, col.b + dither * 0.5));
      colors.push(col.r, col.g, col.b);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geo.computeVertexNormals();
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  /** Scatter small ground details (pebbles, dirt discs, tiny plants) across the terrain.
   *  Skipped for indoor/dungeon maps. These are very low-poly and share geometry. */
  private _scatterGroundDetail(w: number, d: number, mapId: DiabloMapId): void {
    // Skip indoor/dungeon maps
    const indoorMaps = new Set([
      DiabloMapId.NECROPOLIS_DUNGEON, DiabloMapId.HAUNTED_CATHEDRAL,
      DiabloMapId.CLOCKWORK_FOUNDRY, DiabloMapId.ANCIENT_LIBRARY,
      DiabloMapId.OBSIDIAN_FORTRESS, DiabloMapId.JADE_TEMPLE,
      DiabloMapId.PLAGUEROT_SEWERS, DiabloMapId.CHRONO_LABYRINTH,
      DiabloMapId.ELDRITCH_NEXUS, DiabloMapId.IRON_WASTES,
      DiabloMapId.ASTRAL_VOID, DiabloMapId.SHADOW_REALM,
      DiabloMapId.PRIMORDIAL_ABYSS, DiabloMapId.INFERNAL_THRONE,
    ]);
    if (indoorMaps.has(mapId)) return;

    // Determine color palette from the ground plane vertex colors
    const geo = this._groundPlane.geometry as THREE.BufferGeometry;
    const colorAttr = geo.attributes.color;
    // Sample a few vertex colors to get the average ground color
    const avgColor = new THREE.Color(0, 0, 0);
    const sampleCount = Math.min(20, colorAttr.count);
    for (let i = 0; i < sampleCount; i++) {
      const idx = Math.floor(Math.random() * colorAttr.count);
      avgColor.r += colorAttr.getX(idx);
      avgColor.g += colorAttr.getY(idx);
      avgColor.b += colorAttr.getZ(idx);
    }
    avgColor.multiplyScalar(1 / sampleCount);
    const darkGround = avgColor.clone().multiplyScalar(0.5);
    const lightGround = avgColor.clone().multiplyScalar(1.3);

    // Shared geometries (very low poly)
    const pebbleGeo = new THREE.DodecahedronGeometry(1, 0);
    const discGeo = new THREE.CircleGeometry(1, 6);
    discGeo.rotateX(-Math.PI / 2);

    const pebbleMat = new THREE.MeshStandardMaterial({ color: darkGround, roughness: 1.0, metalness: 0 });
    const dirtMat = new THREE.MeshBasicMaterial({ color: darkGround, transparent: true, opacity: 0.15, side: THREE.DoubleSide });

    // Scatter pebbles (120)
    for (let i = 0; i < 120; i++) {
      const px = (Math.random() - 0.5) * w * 0.9;
      const pz = (Math.random() - 0.5) * d * 0.9;
      const size = 0.03 + Math.random() * 0.06;
      const pebble = new THREE.Mesh(pebbleGeo, pebbleMat);
      pebble.scale.set(size, size * (0.3 + Math.random() * 0.4), size);
      pebble.position.set(px, getTerrainHeight(px, pz) + size * 0.2, pz);
      pebble.rotation.y = Math.random() * Math.PI * 2;
      this._envGroup.add(pebble);
    }

    // Scatter dirt/shadow patches (80) — flat dark circles that break up the ground
    for (let i = 0; i < 80; i++) {
      const dx = (Math.random() - 0.5) * w * 0.85;
      const dz = (Math.random() - 0.5) * d * 0.85;
      const size = 0.3 + Math.random() * 0.8;
      const disc = new THREE.Mesh(discGeo, dirtMat);
      disc.scale.set(size, 1, size);
      disc.position.set(dx, getTerrainHeight(dx, dz) + 0.01, dz);
      disc.rotation.y = Math.random() * Math.PI * 2;
      this._envGroup.add(disc);
    }

    // Scatter tiny ground plants/weeds (60) — small cone clusters
    const plantColors = [
      lightGround.clone().multiplyScalar(1.1),
      avgColor.clone(),
      darkGround.clone().lerp(new THREE.Color(0x228822), 0.3),
    ];
    const plantGeo = new THREE.ConeGeometry(1, 1, 3);
    for (let i = 0; i < 60; i++) {
      const px = (Math.random() - 0.5) * w * 0.85;
      const pz = (Math.random() - 0.5) * d * 0.85;
      const tuft = new THREE.Group();
      const bladeCount = 2 + Math.floor(Math.random() * 4);
      const pColor = plantColors[i % plantColors.length];
      const pMat = new THREE.MeshStandardMaterial({ color: pColor, roughness: 0.95 });
      for (let j = 0; j < bladeCount; j++) {
        const h = 0.08 + Math.random() * 0.12;
        const blade = new THREE.Mesh(plantGeo, pMat);
        blade.scale.set(0.02 + Math.random() * 0.02, h, 0.02 + Math.random() * 0.02);
        blade.position.set((Math.random() - 0.5) * 0.1, h * 0.5, (Math.random() - 0.5) * 0.1);
        blade.rotation.z = (Math.random() - 0.5) * 0.6;
        tuft.add(blade);
      }
      tuft.position.set(px, getTerrainHeight(px, pz), pz);
      this._envGroup.add(tuft);
    }
  }

  /**
   * Add biome-aware ground clutter: scattered stones, grass clumps, twigs,
   * leaf litter, cracks, and small debris. Called after map-specific builders
   * to fill in empty ground areas with micro-detail.
   */
  private _addGroundClutter(mapId: string, w: number, d: number): void {
    // Sample existing terrain vertex colors to determine biome palette
    const groundGeo = this._groundPlane?.geometry;
    if (!groundGeo) return;
    const colorAttr = groundGeo.getAttribute('color');
    if (!colorAttr) return;

    // Sample a few vertices for average color
    const avg = new THREE.Color(0, 0, 0);
    const sampleCount = Math.min(20, colorAttr.count);
    for (let i = 0; i < sampleCount; i++) {
      const idx = Math.floor(Math.random() * colorAttr.count);
      avg.r += colorAttr.getX(idx);
      avg.g += colorAttr.getY(idx);
      avg.b += colorAttr.getZ(idx);
    }
    avg.multiplyScalar(1 / sampleCount);

    const dark = avg.clone().multiplyScalar(0.55);
    const light = avg.clone().multiplyScalar(1.35);
    const warm = avg.clone().lerp(new THREE.Color(0x886644), 0.3);

    // Shared low-poly geometries
    const stoneGeo = new THREE.DodecahedronGeometry(1, 0);
    const flatGeo = new THREE.CircleGeometry(1, 5);
    flatGeo.rotateX(-Math.PI / 2);
    const bladeGeo = new THREE.ConeGeometry(1, 1, 3);
    const twigGeo = new THREE.CylinderGeometry(0.015, 0.01, 1, 3);

    // --- 1. Extra scattered stones (120) ---
    const stoneMat = new THREE.MeshStandardMaterial({ color: dark, roughness: 1.0, metalness: 0 });
    const stoneMat2 = new THREE.MeshStandardMaterial({ color: warm, roughness: 0.95, metalness: 0 });
    for (let i = 0; i < 120; i++) {
      const px = (Math.random() - 0.5) * w * 0.92;
      const pz = (Math.random() - 0.5) * d * 0.92;
      const size = 0.04 + Math.random() * 0.1;
      const stone = new THREE.Mesh(stoneGeo, i % 3 === 0 ? stoneMat2 : stoneMat);
      stone.scale.set(
        size * (0.6 + Math.random() * 0.8),
        size * (0.2 + Math.random() * 0.4),
        size * (0.6 + Math.random() * 0.8)
      );
      stone.position.set(px, getTerrainHeight(px, pz) + size * 0.1, pz);
      stone.rotation.set(Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.3);
      this._envGroup.add(stone);
    }

    // --- 2. Ground stain patches (70) — break up uniform color ---
    const stainMat = new THREE.MeshBasicMaterial({
      color: dark, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false,
    });
    const stainMat2 = new THREE.MeshBasicMaterial({
      color: warm, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false,
    });
    for (let i = 0; i < 70; i++) {
      const px = (Math.random() - 0.5) * w * 0.88;
      const pz = (Math.random() - 0.5) * d * 0.88;
      const size = 0.4 + Math.random() * 1.5;
      const patch = new THREE.Mesh(flatGeo, i % 3 === 0 ? stainMat2 : stainMat);
      patch.scale.set(size, 1, size * (0.6 + Math.random() * 0.8));
      patch.position.set(px, getTerrainHeight(px, pz) + 0.015, pz);
      patch.rotation.y = Math.random() * Math.PI * 2;
      this._envGroup.add(patch);
    }

    // --- 3. Dense grass tufts (100) - multi-blade clusters ---
    // Determine if biome should have grass (skip for lava/void/ice-heavy biomes)
    const noGrassBiomes = ['VOLCANIC_WASTES', 'ABYSSAL_RIFT', 'SHADOW_REALM', 'PRIMORDIAL_ABYSS',
      'NECROPOLIS_DUNGEON', 'ASTRAL_VOID', 'INFERNAL_THRONE', 'CORAL_DEPTHS', 'SUNKEN_CITADEL',
      'IRON_WASTES', 'CLOCKWORK_FOUNDRY', 'CHRONO_LABYRINTH', 'ELDRITCH_NEXUS'];
    const hasGrass = !noGrassBiomes.includes(mapId);

    if (hasGrass) {
      const grassColor = avg.clone().lerp(new THREE.Color(0x338833), 0.4);
      const grassColor2 = avg.clone().lerp(new THREE.Color(0x557722), 0.3);
      const grassMat = new THREE.MeshStandardMaterial({ color: grassColor, roughness: 0.95, metalness: 0 });
      const grassMat2 = new THREE.MeshStandardMaterial({ color: grassColor2, roughness: 0.95, metalness: 0 });

      for (let i = 0; i < 100; i++) {
        const px = (Math.random() - 0.5) * w * 0.88;
        const pz = (Math.random() - 0.5) * d * 0.88;
        const tuft = new THREE.Group();
        const count = 3 + Math.floor(Math.random() * 5);
        for (let j = 0; j < count; j++) {
          const h = 0.1 + Math.random() * 0.2;
          const blade = new THREE.Mesh(bladeGeo, j % 2 === 0 ? grassMat : grassMat2);
          blade.scale.set(0.015 + Math.random() * 0.02, h, 0.015 + Math.random() * 0.02);
          blade.position.set((Math.random() - 0.5) * 0.15, h * 0.5, (Math.random() - 0.5) * 0.15);
          blade.rotation.z = (Math.random() - 0.5) * 0.7;
          blade.rotation.y = Math.random() * Math.PI;
          tuft.add(blade);
        }
        tuft.position.set(px, getTerrainHeight(px, pz), pz);
        this._envGroup.add(tuft);
      }
    }

    // --- 4. Twigs and sticks (50) ---
    const twigMat = new THREE.MeshStandardMaterial({ color: warm.clone().multiplyScalar(0.7), roughness: 1.0 });
    for (let i = 0; i < 50; i++) {
      const px = (Math.random() - 0.5) * w * 0.85;
      const pz = (Math.random() - 0.5) * d * 0.85;
      const len = 0.2 + Math.random() * 0.5;
      const twig = new THREE.Mesh(twigGeo, twigMat);
      twig.scale.set(1, len, 1);
      twig.position.set(px, getTerrainHeight(px, pz) + 0.01, pz);
      twig.rotation.set(Math.PI / 2 + (Math.random() - 0.5) * 0.3, 0, Math.random() * Math.PI * 2);
      this._envGroup.add(twig);
    }

    // --- 5. Biome-specific ground accents ---
    // Desert: small sand ripple ridges
    const sandBiomes = ['SUNSCORCH_DESERT', 'ASHEN_BATTLEFIELD', 'WYRMSCAR_CANYON', 'SHATTERED_COLOSSEUM'];
    if (sandBiomes.includes(mapId)) {
      const rippleMat = new THREE.MeshBasicMaterial({ color: light, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false });
      const rippleGeo = new THREE.PlaneGeometry(1, 0.04);
      rippleGeo.rotateX(-Math.PI / 2);
      for (let i = 0; i < 80; i++) {
        const px = (Math.random() - 0.5) * w * 0.85;
        const pz = (Math.random() - 0.5) * d * 0.85;
        const ripple = new THREE.Mesh(rippleGeo, rippleMat);
        const rw = 1 + Math.random() * 3;
        ripple.scale.set(rw, 1, 1);
        ripple.position.set(px, getTerrainHeight(px, pz) + 0.02, pz);
        ripple.rotation.y = Math.random() * Math.PI;
        this._envGroup.add(ripple);
      }
    }

    // Frozen biomes: ice shards on ground
    const iceBiomes = ['FROZEN_TUNDRA', 'STORMSPIRE_PEAK'];
    if (iceBiomes.includes(mapId)) {
      const iceMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.6 });
      const iceGeo = new THREE.BoxGeometry(1, 1, 1);
      for (let i = 0; i < 40; i++) {
        const px = (Math.random() - 0.5) * w * 0.85;
        const pz = (Math.random() - 0.5) * d * 0.85;
        const shard = new THREE.Mesh(iceGeo, iceMat);
        const s = 0.05 + Math.random() * 0.15;
        shard.scale.set(s * 0.5, s * (1 + Math.random()), s * 0.3);
        shard.position.set(px, getTerrainHeight(px, pz) + s * 0.3, pz);
        shard.rotation.set(Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.3 + 0.2);
        this._envGroup.add(shard);
      }
    }

    // Dark/undead biomes: bone fragments
    const boneBiomes = ['NECROPOLIS_DUNGEON', 'HAUNTED_CATHEDRAL', 'BLIGHTED_THRONE', 'PLAGUEROT_SEWERS', 'CRIMSON_CITADEL'];
    if (boneBiomes.includes(mapId)) {
      const boneMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.9 });
      for (let i = 0; i < 35; i++) {
        const px = (Math.random() - 0.5) * w * 0.85;
        const pz = (Math.random() - 0.5) * d * 0.85;
        const bone = new THREE.Mesh(twigGeo, boneMat);
        const len = 0.15 + Math.random() * 0.35;
        bone.scale.set(1.5, len, 1.5);
        bone.position.set(px, getTerrainHeight(px, pz) + 0.02, pz);
        bone.rotation.set(Math.PI / 2 + (Math.random() - 0.5) * 0.4, 0, Math.random() * Math.PI * 2);
        this._envGroup.add(bone);
      }
    }

    // Magical biomes: glowing ground runes/spots
    const magicBiomes = ['ABYSSAL_RIFT', 'SHADOW_REALM', 'CELESTIAL_RUINS', 'ETHEREAL_SANCTUM',
      'ASTRAL_VOID', 'ELDRITCH_NEXUS', 'PRIMORDIAL_ABYSS'];
    if (magicBiomes.includes(mapId)) {
      const runeColors = [0x6633ff, 0x3366ff, 0xff33ff, 0x33ffff, 0xff6633];
      for (let i = 0; i < 25; i++) {
        const px = (Math.random() - 0.5) * w * 0.85;
        const pz = (Math.random() - 0.5) * d * 0.85;
        const runeColor = runeColors[i % runeColors.length];
        const runeMat = new THREE.MeshBasicMaterial({
          color: runeColor, transparent: true, opacity: 0.15 + Math.random() * 0.1,
          side: THREE.DoubleSide, depthWrite: false,
        });
        const rune = new THREE.Mesh(flatGeo, runeMat);
        const s = 0.3 + Math.random() * 0.6;
        rune.scale.set(s, 1, s);
        rune.position.set(px, getTerrainHeight(px, pz) + 0.03, pz);
        rune.rotation.y = Math.random() * Math.PI * 2;
        this._envGroup.add(rune);
      }
    }

    // Fungal/organic biomes: small mushroom caps
    const fungalBiomes = ['FUNGAL_DEPTHS', 'WHISPERING_MARSH', 'THORNWOOD_THICKET'];
    if (fungalBiomes.includes(mapId)) {
      const capGeo = new THREE.SphereGeometry(1, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      const stemGeo = new THREE.CylinderGeometry(0.3, 0.4, 1, 5);
      const capColors = [0x884422, 0xaa6633, 0x663311, 0xcc8844, 0x995533];
      for (let i = 0; i < 45; i++) {
        const px = (Math.random() - 0.5) * w * 0.85;
        const pz = (Math.random() - 0.5) * d * 0.85;
        const mush = new THREE.Group();
        const s = 0.04 + Math.random() * 0.08;
        const capMat = new THREE.MeshStandardMaterial({ color: capColors[i % capColors.length], roughness: 0.8 });
        const stemMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.9 });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.scale.set(s, s * 0.6, s);
        cap.position.y = s * 0.8;
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.scale.set(s * 0.3, s * 0.7, s * 0.3);
        stem.position.y = s * 0.35;
        mush.add(stem);
        mush.add(cap);
        mush.position.set(px, getTerrainHeight(px, pz), pz);
        this._envGroup.add(mush);
      }
    }

    // Industrial/metal biomes: scrap metal pieces
    const metalBiomes = ['CLOCKWORK_FOUNDRY', 'IRON_WASTES', 'OBSIDIAN_FORTRESS'];
    if (metalBiomes.includes(mapId)) {
      const scrapMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.5 });
      const scrapMat2 = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7, metalness: 0.3 });
      const plateGeo = new THREE.BoxGeometry(1, 0.02, 1);
      for (let i = 0; i < 40; i++) {
        const px = (Math.random() - 0.5) * w * 0.85;
        const pz = (Math.random() - 0.5) * d * 0.85;
        const scrap = new THREE.Mesh(Math.random() > 0.5 ? plateGeo : stoneGeo, i % 2 === 0 ? scrapMat : scrapMat2);
        const s = 0.08 + Math.random() * 0.2;
        scrap.scale.set(s * (0.5 + Math.random()), s * 0.3, s * (0.5 + Math.random()));
        scrap.position.set(px, getTerrainHeight(px, pz) + 0.02, pz);
        scrap.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.3);
        this._envGroup.add(scrap);
      }
    }
  }

  /** Recursively dispose all geometries and materials on an Object3D and its descendants. */
  private _disposeObject3D(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            for (const mat of child.material) {
              if (mat.map) mat.map.dispose();
              mat.dispose();
            }
          } else {
            if ((child.material as THREE.MeshStandardMaterial).map) {
              (child.material as THREE.MeshStandardMaterial).map!.dispose();
            }
            (child.material as THREE.Material).dispose();
          }
        }
      }
      if (child instanceof THREE.Sprite) {
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
      if (child instanceof THREE.Line) {
        if ((child as any).geometry) (child as any).geometry.dispose();
        if ((child as any).material) {
          if (Array.isArray((child as any).material)) {
            for (const m of (child as any).material) m.dispose();
          } else {
            (child as any).material.dispose();
          }
        }
      }
    });
  }

  buildMap(mapId: DiabloMapId): void {
    // Build a set of persistent objects that must survive map transitions
    const persistent = new Set<THREE.Object3D>();
    persistent.add(this._ambientLight);
    persistent.add(this._hemiLight);
    persistent.add(this._dirLight);
    persistent.add(this._envGroup);
    persistent.add(this._playerGroup);
    persistent.add(this._groundPlane);
    persistent.add(this._camera);
    for (const mesh of this._particleMeshPool) {
      persistent.add(mesh);
    }
    // Keep gameplay entity meshes (enemies, loot, projectiles, etc.) — they are
    // managed by their own sync methods, not by buildMap.
    for (const [, m] of this._enemyMeshes) persistent.add(m);
    for (const [, m] of this._projectileMeshes) persistent.add(m);
    for (const [, m] of this._lootMeshes) persistent.add(m);
    for (const [, m] of this._chestMeshes) persistent.add(m);
    for (const [, m] of this._aoeMeshes) persistent.add(m);
    for (const [, m] of this._vendorMeshes) persistent.add(m);
    for (const [, m] of this._townfolkMeshes) persistent.add(m);
    for (const [, m] of this._floatTextSprites) persistent.add(m);
    for (const [, m] of this._shieldMeshes) persistent.add(m);
    for (const [, m] of this._healBeams) persistent.add(m);
    for (const [, m] of this._petMeshes) persistent.add(m);
    for (const [, m] of this._bossWarningRings) persistent.add(m);
    if (this._castEffectGroup) persistent.add(this._castEffectGroup);
    if (this._playerStatusFxGroup) persistent.add(this._playerStatusFxGroup);
    if (this._aimLine) persistent.add(this._aimLine);
    if (this._invulnMesh) persistent.add(this._invulnMesh);

    // 1. Dispose and remove all children from _envGroup
    while (this._envGroup.children.length > 0) {
      const child = this._envGroup.children[0];
      this._disposeObject3D(child);
      this._envGroup.remove(child);
    }

    // 2. Remove torch lights tracked in _torchLights
    for (const tl of this._torchLights) {
      this._scene.remove(tl);
      tl.dispose();
    }
    this._torchLights = [];

    // 2b. Clear tracked water meshes (they live in _envGroup or scene, already disposed above)
    this._waterMeshes = [];

    // 3. Remove ALL non-persistent objects from the scene (catches objects
    //    added directly to _scene by map builders instead of _envGroup)
    const toRemove: THREE.Object3D[] = [];
    for (const child of this._scene.children) {
      if (!persistent.has(child)) {
        toRemove.push(child);
      }
    }
    for (const obj of toRemove) {
      this._disposeObject3D(obj);
      this._scene.remove(obj);
    }

    // 4. Reset fog (each map sets its own)
    this._scene.fog = null;

    // 5. Reset lighting to default init() values so per-map overrides don't leak
    this._ambientLight.color.setHex(0x404060);
    this._ambientLight.intensity = 0.6;
    this._hemiLight.color.setHex(0x8888cc);
    this._hemiLight.groundColor.setHex(0x443322);
    this._hemiLight.intensity = 0.5;
    this._dirLight.color.setHex(0xffeedd);
    this._dirLight.intensity = 1.2;
    this._dirLight.position.set(15, 25, 10);

    this._currentMap = mapId;
    this.buildingColliders = [];

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
      case DiabloMapId.WHISPERING_MARSH:
        this._buildWhisperingMarsh(cfg.width, cfg.depth);
        break;
      case DiabloMapId.CRYSTAL_CAVERNS:
        this._buildCrystalCaverns(cfg.width, cfg.depth);
        break;
      case DiabloMapId.FROZEN_TUNDRA:
        this._buildFrozenTundra(cfg.width, cfg.depth);
        break;
      case DiabloMapId.HAUNTED_CATHEDRAL:
        this._buildHauntedCathedral(cfg.width, cfg.depth);
        break;
      case DiabloMapId.THORNWOOD_THICKET:
        this._buildThornwoodThicket(cfg.width, cfg.depth);
        break;
      case DiabloMapId.CLOCKWORK_FOUNDRY:
        this._buildClockworkFoundry(cfg.width, cfg.depth);
        break;
      case DiabloMapId.CRIMSON_CITADEL:
        this._buildCrimsonCitadel(cfg.width, cfg.depth);
        break;
      case DiabloMapId.STORMSPIRE_PEAK:
        this._buildStormspirePeak(cfg.width, cfg.depth);
        break;
      case DiabloMapId.SHADOW_REALM:
        this._buildShadowRealm(cfg.width, cfg.depth);
        break;
      case DiabloMapId.PRIMORDIAL_ABYSS:
        this._buildPrimordialAbyss(cfg.width, cfg.depth);
        break;
      // ── Wave 2 maps ──
      case DiabloMapId.MOONLIT_GROVE:
        this._buildMoonlitGrove(cfg.width, cfg.depth);
        break;
      case DiabloMapId.CORAL_DEPTHS:
        this._buildCoralDepths(cfg.width, cfg.depth);
        break;
      case DiabloMapId.ANCIENT_LIBRARY:
        this._buildAncientLibrary(cfg.width, cfg.depth);
        break;
      case DiabloMapId.JADE_TEMPLE:
        this._buildJadeTemple(cfg.width, cfg.depth);
        break;
      case DiabloMapId.ASHEN_BATTLEFIELD:
        this._buildAshenBattlefield(cfg.width, cfg.depth);
        break;
      case DiabloMapId.FUNGAL_DEPTHS:
        this._buildFungalDepths(cfg.width, cfg.depth);
        break;
      case DiabloMapId.OBSIDIAN_FORTRESS:
        this._buildObsidianFortress(cfg.width, cfg.depth);
        break;
      case DiabloMapId.CELESTIAL_RUINS:
        this._buildCelestialRuins(cfg.width, cfg.depth);
        break;
      case DiabloMapId.INFERNAL_THRONE:
        this._buildInfernalThrone(cfg.width, cfg.depth);
        break;
      case DiabloMapId.ASTRAL_VOID:
        this._buildAstralVoid(cfg.width, cfg.depth);
        break;
      // ── Wave 3 maps ──
      case DiabloMapId.SHATTERED_COLOSSEUM:
        this._buildShatteredColosseum(cfg.width, cfg.depth);
        break;
      case DiabloMapId.PETRIFIED_GARDEN:
        this._buildPetrifiedGarden(cfg.width, cfg.depth);
        break;
      case DiabloMapId.SUNKEN_CITADEL:
        this._buildSunkenCitadel(cfg.width, cfg.depth);
        break;
      case DiabloMapId.WYRMSCAR_CANYON:
        this._buildWyrmscarCanyon(cfg.width, cfg.depth);
        break;
      case DiabloMapId.PLAGUEROT_SEWERS:
        this._buildPlaguerotSewers(cfg.width, cfg.depth);
        break;
      case DiabloMapId.ETHEREAL_SANCTUM:
        this._buildEtherealSanctum(cfg.width, cfg.depth);
        break;
      case DiabloMapId.IRON_WASTES:
        this._buildIronWastes(cfg.width, cfg.depth);
        break;
      case DiabloMapId.BLIGHTED_THRONE:
        this._buildBlightedThrone(cfg.width, cfg.depth);
        break;
      case DiabloMapId.CHRONO_LABYRINTH:
        this._buildChronoLabyrinth(cfg.width, cfg.depth);
        break;
      case DiabloMapId.ELDRITCH_NEXUS:
        this._buildEldritchNexus(cfg.width, cfg.depth);
        break;
      case DiabloMapId.CAMELOT:
        this._buildCamelot(cfg.width, cfg.depth);
        break;
      // ── City maps ──
      case DiabloMapId.CITY_RUINS:
        this._buildCityRuins(cfg.width, cfg.depth);
        break;
      case DiabloMapId.CITY:
        this._buildCity(cfg.width, cfg.depth);
        break;
    }

    // Add universal biome-aware ground clutter to all maps
    this._addGroundClutter(mapId, cfg.width, cfg.depth);

    // Tint sky dome to match map atmosphere
    if (this._skyDome) {
      const skyMat = this._skyDome.material as THREE.MeshBasicMaterial;
      if (this._scene.fog) {
        skyMat.color.copy((this._scene.fog as THREE.FogExp2).color);
        skyMat.color.multiplyScalar(1.3); // Slightly brighter than fog
      }
    }

    // Match scene background to fog color for seamless sky
    const fog = this._scene.fog as THREE.FogExp2 | null;
    if (fog) {
      this._scene.background = fog.color.clone();
    }

    // Scatter ground detail (small pebbles, dirt patches, micro-plants) on outdoor maps
    this._scatterGroundDetail(cfg.width, cfg.depth || cfg.width, mapId);

    // Auto-detect water surfaces after map is built
    this._detectWaterMeshes();

    // Water rendering for aquatic maps
    const waterMaps = ['CORAL_DEPTHS', 'SUNKEN_CITADEL', 'WHISPERING_MARSH', 'MOONLIT_GROVE'];
    if (waterMaps.includes(mapId)) {
      if (this._waterMesh) {
        this._scene.remove(this._waterMesh);
        this._waterMesh = null;
      }
      const w = cfg.width;
      const d = (cfg as any).depth || w;
      const waterGeo = new THREE.PlaneGeometry(w * 0.8, d * 0.8, 32, 32);
      const waterMat = new THREE.MeshLambertMaterial({
        color: 0x2244aa,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      this._waterMesh = new THREE.Mesh(waterGeo, waterMat);
      this._waterMesh.rotation.x = -Math.PI / 2;
      this._waterMesh.position.y = -0.5; // Below terrain level
      this._scene.add(this._waterMesh);
    } else {
      if (this._waterMesh) {
        this._scene.remove(this._waterMesh);
        this._waterMesh = null;
      }
    }
  }

  /** Scan scene for water-like meshes (transparent, low roughness, blue-tinted). Called once per map build. */
  private _detectWaterMeshes(): void {
    this._waterMeshes = [];
    this._waterOriginalY.clear();

    const isWater = (child: THREE.Object3D): child is THREE.Mesh => {
      if (!(child instanceof THREE.Mesh)) return false;
      if (!(child.material instanceof THREE.MeshStandardMaterial)) return false;
      const m = child.material;
      if (!m.transparent || m.opacity < 0.3 || m.opacity > 0.75) return false;
      if (m.roughness > 0.35) return false;
      const c = m.color;
      // Blue-ish or teal (blue channel dominant or close to dominant)
      return c.b > 0.25 && c.b >= c.r * 0.8;
    };

    this._envGroup.traverse((child) => {
      if (isWater(child)) {
        this._waterMeshes.push(child);
        this._waterOriginalY.set(child, child.position.y);
      }
    });

    // Also scan scene root for water added directly by map builders
    for (const child of this._scene.children) {
      if (child === this._envGroup) continue; // already scanned
      if (isWater(child)) {
        this._waterMeshes.push(child);
        this._waterOriginalY.set(child, child.position.y);
      }
    }
  }

  private _buildForest(w: number, d: number, propMult: number = 1.0): void { buildForest(this._mapCtx(), w, d, propMult); }

  private _buildElvenVillage(w: number, d: number): void { buildElvenVillage(this._mapCtx(), w, d); }

  private _buildNecropolis(w: number, d: number): void { buildNecropolis(this._mapCtx(), w, d); }

  private _buildCamelot(w: number, d: number): void { buildCamelot(this._mapCtx(), w, d); }

  // ════════════════════════════════════════════════════════════════════
  //  VOLCANIC WASTES MAP
  // ════════════════════════════════════════════════════════════════════
  private _buildVolcanicWastes(w: number, d: number): void { buildVolcanicWastes(this._mapCtx(), w, d); }

  // ════════════════════════════════════════════════════════════════════
  //  ABYSSAL RIFT MAP
  // ════════════════════════════════════════════════════════════════════
  private _buildAbyssalRift(w: number, d: number): void { buildAbyssalRift(this._mapCtx(), w, d); }

  // ════════════════════════════════════════════════════════════════════
  //  DRAGON'S SANCTUM MAP
  // ════════════════════════════════════════════════════════════════════
  private _buildDragonsSanctum(w: number, d: number): void { buildDragonsSanctum(this._mapCtx(), w, d); }

  syncVendors(vendors: { id: string; type: VendorType; x: number; z: number }[]): void {
    const currentIds = new Set(vendors.map((v) => v.id));

    // Remove old vendor meshes
    for (const [id, mesh] of this._vendorMeshes) {
      if (!currentIds.has(id)) {
        this._disposeObject3D(mesh);
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
        const headGeo = new THREE.SphereGeometry(0.16, 16, 12);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 1.42;
        head.castShadow = true;
        mesh.add(head);

        // Eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 });
        for (const ex of [-0.055, 0.055]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), eyeMat);
          eye.position.set(ex, 1.45, 0.14);
          mesh.add(eye);
        }
        // Nose
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 44), skinMat);
        nose.position.set(0, 1.41, 0.16);
        nose.rotation.x = -Math.PI / 2;
        mesh.add(nose);

        // Neck
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 44), skinMat);
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
          const legGeo = new THREE.CylinderGeometry(0.06, 0.055, 0.55, 44);
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
          const upperArmGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.3, 44);
          const upperArm = new THREE.Mesh(upperArmGeo, robeMat);
          upperArm.position.set(side * 0.24, 1.05, 0);
          upperArm.rotation.z = side * 0.2;
          mesh.add(upperArm);
          // Forearm
          const forearmGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.25, 44);
          const forearm = new THREE.Mesh(forearmGeo, skinMat);
          forearm.position.set(side * 0.3, 0.82, 0.05);
          forearm.rotation.z = side * 0.15;
          mesh.add(forearm);
          // Hand
          const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), skinMat);
          hand.position.set(side * 0.32, 0.7, 0.06);
          mesh.add(hand);
        }

        // Shoulders
        for (const side of [-1, 1]) {
          const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), robeMat);
          shoulder.position.set(side * 0.22, 1.18, 0);
          mesh.add(shoulder);
        }

        // Type-specific details
        if (vendor.type === VendorType.ARCANIST) {
          // Wizard hat
          const hatBrimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.03, 44);
          const hatMat = new THREE.MeshStandardMaterial({ color: 0x4411aa, roughness: 0.6 });
          const hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
          hatBrim.position.y = 1.56;
          mesh.add(hatBrim);
          const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 44), hatMat);
          hatCone.position.y = 1.78;
          mesh.add(hatCone);
          // Star on hat
          const star = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xffdd00, emissiveIntensity: 0.6 }));
          star.position.set(0, 1.96, 0.05);
          mesh.add(star);
          // Staff in hand
          const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.4, 44),
            new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 }));
          staff.position.set(-0.34, 0.8, 0.06);
          mesh.add(staff);
          const staffOrb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0x8844ff, emissive: 0x6622cc, emissiveIntensity: 0.8 }));
          staffOrb.position.set(-0.34, 1.52, 0.06);
          mesh.add(staffOrb);
          // Beard
          const beard = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 44), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 }));
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
          const hammerHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 44),
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
            const bigShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), robeMat);
            bigShoulder.position.set(side * 0.23, 1.18, 0);
            mesh.add(bigShoulder);
          }
          // Short hair
          const hair = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12),
            new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.9 }));
          hair.position.y = 1.48;
          hair.scale.set(1, 0.6, 1);
          mesh.add(hair);
        } else if (vendor.type === VendorType.JEWELER) {
          // Elegant hat (beret)
          const beretMat = new THREE.MeshStandardMaterial({ color: 0x224488, roughness: 0.5 });
          const beret = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), beretMat);
          beret.position.y = 1.55;
          beret.scale.y = 0.4;
          mesh.add(beret);
          // Monocle
          const monocle = new THREE.Mesh(new THREE.RingGeometry(0.025, 0.035, 16),
            new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.1, side: THREE.DoubleSide }));
          monocle.position.set(0.06, 1.46, 0.16);
          mesh.add(monocle);
          // Gem in hand
          const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 3),
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
          const hood = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), hoodMat);
          hood.position.y = 1.48;
          hood.scale.set(1, 0.8, 1.1);
          mesh.add(hood);
          // Potion bottle in hand
          const bottleGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.12, 44);
          const bottleMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 0.4, transparent: true, opacity: 0.7 });
          const bottle = new THREE.Mesh(bottleGeo, bottleMat);
          bottle.position.set(-0.32, 0.75, 0.06);
          mesh.add(bottle);
          const bottleNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.05, 44), bottleMat);
          bottleNeck.position.set(-0.32, 0.83, 0.06);
          mesh.add(bottleNeck);
          // Goggles on forehead
          const goggleMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.5 });
          for (const ex of [-0.05, 0.05]) {
            const goggle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 44, 62), goggleMat);
            goggle.position.set(ex, 1.5, 0.14);
            mesh.add(goggle);
          }
        } else if (vendor.type === VendorType.GENERAL_MERCHANT) {
          // Wide-brim hat
          const hatMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.7 });
          const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 44), hatMat);
          brim.position.y = 1.56;
          mesh.add(brim);
          const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.15, 44), hatMat);
          crown.position.y = 1.64;
          mesh.add(crown);
          // Sack over shoulder
          const sack = new THREE.Mesh(new THREE.SphereGeometry(0.15, 80, 44),
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
        this._disposeObject3D(mesh);
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
    // --- TOWNFOLK NPC | Estimated polygons: ~33440 triangles ---
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
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14 * scale, 16, 12), skinMat);
    head.position.y = 1.38 * scale;
    head.castShadow = true;
    mesh.add(head);

    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    for (const ex of [-0.04, 0.04]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02 * scale, 8, 6), eyeMat);
      eye.position.set(ex * scale, 1.41 * scale, 0.12 * scale);
      mesh.add(eye);
    }

    // Hair
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.13 * scale, 16, 12), hairMat);
    hair.position.y = 1.44 * scale;
    hair.scale.set(1, role === 'maiden' ? 1.0 : 0.6, 1);
    mesh.add(hair);
    // Long hair for maiden
    if (role === 'maiden') {
      const longHair = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.05 * scale, 0.3 * scale, 44), hairMat);
      longHair.position.set(0, 1.22 * scale, -0.06 * scale);
      mesh.add(longHair);
    }

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 0.08 * scale, 44), skinMat);
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

      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.045 * scale, 0.42 * scale, 44), robeMat);
      leg.position.y = -0.21 * scale;
      leg.castShadow = true;
      legGroup.add(leg);

      // Boot
      const bootMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.8 });
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.07 * scale, 0.08 * scale, 0.11 * scale), bootMat);
      boot.position.set(0, -0.44 * scale, 0.015 * scale);
      legGroup.add(boot);

      // Shoe sole (flat box beneath boot for extra detail)
      const soleMat = new THREE.MeshStandardMaterial({ color: 0x221111, roughness: 0.95 });
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.075 * scale, 0.02 * scale, 0.12 * scale), soleMat);
      sole.position.set(0, -0.49 * scale, 0.015 * scale);
      legGroup.add(sole);

      mesh.add(legGroup);
    }

    // Arms (as named groups for animation)
    for (const [side, name] of [[-1, 'tf_left_arm'], [1, 'tf_right_arm']] as const) {
      const armGroup = new THREE.Group();
      armGroup.name = name;
      armGroup.position.set((side as number) * 0.2 * scale, 1.1 * scale, 0);

      // Shoulder
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.055 * scale, 8, 6), robeMat);
      armGroup.add(shoulder);

      // Arm
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.035 * scale, 0.3 * scale, 44), robeMat);
      arm.position.y = -0.18 * scale;
      armGroup.add(arm);

      // Hand
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.03 * scale, 62, 36), skinMat);
      hand.position.y = -0.35 * scale;
      armGroup.add(hand);

      mesh.add(armGroup);
    }

    // Role-specific accessories
    if (role === 'guard') {
      // Helmet
      const helmetMat = new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.6, roughness: 0.3 });
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), helmetMat);
      helmet.position.y = 1.44;
      helmet.scale.set(1, 0.7, 1);
      mesh.add(helmet);
      // Spear
      const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 44),
        new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 }));
      spear.position.set(-0.24, 0.9, 0.05);
      mesh.add(spear);
      const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 44),
        new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.7, roughness: 0.2 }));
      spearTip.position.set(-0.24, 1.75, 0.05);
      mesh.add(spearTip);
    } else if (role === 'noble') {
      // Crown/circlet
      const crownMat = new THREE.MeshStandardMaterial({ color: 0xddaa33, metalness: 0.7, roughness: 0.2 });
      const crown = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 44, 62), crownMat);
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
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), hoodMat);
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
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), capMat);
      cap.position.y = 1.48;
      cap.scale.y = 0.5;
      mesh.add(cap);
      // Feather
      const feather = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.12, 44),
        new THREE.MeshStandardMaterial({ color: 0xdddd44, roughness: 0.5 }));
      feather.position.set(0.08, 1.55, 0);
      feather.rotation.z = -0.4;
      mesh.add(feather);
      // Lute
      const lute = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xAA7744, roughness: 0.6 }));
      lute.position.set(-0.2, 0.75, 0.1);
      lute.scale.set(1, 1.3, 0.5);
      mesh.add(lute);
    } else if (role === 'maiden') {
      // Flower in hair
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xff6688, emissive: 0xff3355, emissiveIntensity: 0.2 }));
      flower.position.set(0.1, 1.5, 0.05);
      mesh.add(flower);
      // Basket
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.08, 44),
        new THREE.MeshStandardMaterial({ color: 0xBB9955, roughness: 0.8 }));
      basket.position.set(0.22, 0.68, 0.06);
      mesh.add(basket);
    }

    return mesh;
  }

  buildPlayer(cls: DiabloClass): void {
    if (this._aimLine) { this._scene.remove(this._aimLine); this._aimLine = null; }
    const ctx: PlayerBuildContext = { playerGroup: this._playerGroup, scene: this._scene, aimLine: this._aimLine };
    const result = buildPlayerMesh(ctx, cls);
    this._weaponMesh = result.weaponMesh;
    this._weaponArmGroup = result.weaponArmGroup;
    this._leftLegGroup = result.leftLegGroup;
    this._rightLegGroup = result.rightLegGroup;
    this._leftArmGroup = result.leftArmGroup;
    this._aimLine = result.aimLine;
    this._playerLantern = result.playerLantern;
  }

  private _createEnemyMesh(type: EnemyType, scale: number): THREE.Group {
    return createEnemyMesh(type, scale);
  }

  private _createLootBeam(rarity: ItemRarity): THREE.Group {
    const group = new THREE.Group();
    const color = RARITY_COLORS[rarity];

    // Floating octahedron
    const octGeo = new THREE.OctahedronGeometry(0.2, 3);
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

    // Rarity-based light beam
    const beamCfg = rarity === ItemRarity.RARE ? { h: 4, op: 0.2, ei: 1.0 }
      : rarity === ItemRarity.EPIC ? { h: 6, op: 0.3, ei: 1.5 }
      : (rarity === ItemRarity.LEGENDARY || rarity === ItemRarity.MYTHIC || rarity === ItemRarity.DIVINE) ? { h: 8, op: 0.4, ei: 2.0 }
      : null;
    if (beamCfg) {
      const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, beamCfg.h, 36);
      const beamMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: beamCfg.ei,
        transparent: true,
        opacity: beamCfg.op,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = beamCfg.h / 2 + 0.5;
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
    const lidGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.02, 44, 2, false, 0, Math.PI);
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
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 36), hingeMat);
      hinge.rotation.x = Math.PI / 2;
      hinge.position.set(hx, 0.5, -0.34);
      group.add(hinge);
    }

    // Front lock plate (rarity-colored)
    const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.04), goldMat);
    lockPlate.position.set(0, 0.42, 0.34);
    group.add(lockPlate);
    // Keyhole
    const keyhole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 36), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    keyhole.rotation.x = Math.PI / 2;
    keyhole.position.set(0, 0.41, 0.36);
    group.add(keyhole);

    // Rarity-colored gem on front center
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 2), new THREE.MeshStandardMaterial({ color: rarityColor, emissive: rarityColor, emissiveIntensity: 0.4 }));
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

  flashEnemy(enemyId: string): void {
    this._enemyFlashTimers.set(enemyId, 0.12); // 120ms flash
  }

  showSwingArc(playerX: number, playerY: number, playerZ: number, angle: number, color: number = 0xffffff): void {
    if (!this._swingArc) {
      const geo = new THREE.RingGeometry(0.8, 2.5, 16, 1, 0, Math.PI * 0.6);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
      this._swingArc = new THREE.Mesh(geo, mat);
      this._scene.add(this._swingArc);
    }
    const mat = this._swingArc.material as THREE.MeshBasicMaterial;
    mat.color.setHex(color);
    mat.opacity = 0.5;
    this._swingArc.position.set(playerX, playerY + 1.0, playerZ);
    this._swingArc.rotation.set(-Math.PI / 2, 0, angle - Math.PI * 0.3);
    this._swingArc.visible = true;
    this._swingArcTimer = 0.2;
  }

  showSkillFlash(color: string): void {
    if (!this._skillFlashEl) {
      this._skillFlashEl = document.createElement('div');
      this._skillFlashEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9997;opacity:0;transition:opacity 0.05s ease;';
      document.body.appendChild(this._skillFlashEl);
    }
    this._skillFlashEl.style.background = `radial-gradient(ellipse at center, transparent 60%, ${color} 100%)`;
    this._skillFlashEl.style.opacity = '0.4';
    this._skillFlashTimer = 0.15;
  }

  showDodgeGhost(playerX: number, playerY: number, playerZ: number): void {
    if (this._dodgeGhosts.length >= 3) return;
    // Clone the player group as a translucent ghost
    const ghost = this._playerGroup.clone(true);
    ghost.position.set(playerX, playerY, playerZ);
    ghost.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = (child.material as THREE.MeshStandardMaterial).clone();
        mat.transparent = true;
        mat.opacity = 0.4;
        mat.emissive.setHex(0x4488ff);
        mat.emissiveIntensity = 0.5;
        child.material = mat;
      }
    });
    this._scene.add(ghost);
    this._dodgeGhosts.push({ mesh: ghost, timer: 0.4 });
  }

  /** Trigger a brief time-freeze effect for impactful hits */
  triggerHitFreeze(_duration: number): void {
    // This is tracked by the game logic; renderer just needs to know
    // The freeze is handled by skipping update(dt) in the game loop
  }

  /** Apply slow-motion post-processing tint */
  setSlowMotion(active: boolean): void {
    if (active) {
      this._renderer.toneMappingExposure = 0.7;
    } else {
      this._renderer.toneMappingExposure = 1.0;
    }
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
        this._ambientLight.intensity = this._baseAmbientIntensity * 0.45;
        this._dirLight.intensity = this._baseDirIntensity * 0.5;
        this._hemiLight.intensity = 0.25;
        this._stormFlashTimer = 5 + Math.random() * 10;
        // Dark stormy fog
        fog.density = this._baseFogDensity * 1.8;
        fog.color.setHex(0x1a2a2a);
        // Darken sky
        if (this._skyDome) {
          (this._skyDome.material as THREE.MeshBasicMaterial).color.setHex(0x222833);
        }
        // Enable rain
        this._rainActive = true;
        if (this._rainGroup) this._rainGroup.visible = true;
        // Lower exposure for moody atmosphere
        this._renderer.toneMappingExposure = 0.75;
        break;
      case Weather.NORMAL:
        break;
    }
    // Disable rain for non-stormy weather
    if (weather !== Weather.STORMY) {
      this._rainActive = false;
      if (this._rainGroup) this._rainGroup.visible = false;
    }
  }

  private _updateWeather(dt: number): void {
    if (this._currentWeather !== Weather.STORMY) return;
    this._stormFlashTimer -= dt;
    if (this._stormFlashTimer <= 0) {
      if (!this._stormFlashActive) {
        this._stormFlashActive = true;
        // Dramatic lightning flash — both ambient and directional
        this._ambientLight.intensity = this._baseAmbientIntensity * 4;
        this._dirLight.intensity = this._baseDirIntensity * 3;
        this._hemiLight.intensity = 1.5;
        this._renderer.toneMappingExposure = 1.5;
        // Double flash sometimes
        this._stormFlashTimer = Math.random() > 0.6 ? 0.05 : 0.12;
      } else {
        this._stormFlashActive = false;
        this._ambientLight.intensity = this._baseAmbientIntensity * 0.45;
        this._dirLight.intensity = this._baseDirIntensity * 0.5;
        this._hemiLight.intensity = 0.25;
        this._renderer.toneMappingExposure = 0.75;
        this._stormFlashTimer = 3 + Math.random() * 8;
      }
    }
  }

  private _updateRain(state: DiabloState, dt: number): void {
    if (!this._rainActive || !this._rainGroup) return;
    const px = state.player.x;
    const pz = state.player.z;
    const fallSpeed = 35;
    const windX = Math.sin(this._time * 0.3) * 3;

    for (const drop of this._rainDrops) {
      drop.position.y -= fallSpeed * dt;
      drop.position.x += windX * dt;
      // Reset drops that fall below ground
      if (drop.position.y < 0) {
        drop.position.y = 20 + Math.random() * 10;
        drop.position.x = px + (Math.random() - 0.5) * 60;
        drop.position.z = pz + (Math.random() - 0.5) * 60;
        // Trigger a splash
        for (let i = 0; i < this._rainSplashes.length; i++) {
          if (this._rainSplashTimers[i] <= 0) {
            const splash = this._rainSplashes[i];
            splash.position.set(drop.position.x, getTerrainHeight(drop.position.x, drop.position.z) + 0.05, drop.position.z);
            splash.visible = true;
            splash.scale.set(0.3, 0.3, 0.3);
            this._rainSplashTimers[i] = 0.3;
            break;
          }
        }
      }
    }

    // Update splashes
    for (let i = 0; i < this._rainSplashes.length; i++) {
      if (this._rainSplashTimers[i] > 0) {
        this._rainSplashTimers[i] -= dt;
        const t = 1 - this._rainSplashTimers[i] / 0.3;
        this._rainSplashes[i].scale.setScalar(0.3 + t * 1.5);
        (this._rainSplashes[i].material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - t);
        if (this._rainSplashTimers[i] <= 0) {
          this._rainSplashes[i].visible = false;
        }
      }
    }

    // Keep rain centered on player
    this._rainGroup.position.set(0, 0, 0);
  }

  private _updateAmbientMotes(state: DiabloState, dt: number): void {
    if (!this._ambientParticleGroup) return;
    const px = state.player.x;
    const pz = state.player.z;

    // Spawn new motes periodically
    if (this._ambientMotes.length < 20 && Math.random() < dt * 2) {
      const isFirefly = Math.random() > 0.6;
      const moteGeo = new THREE.SphereGeometry(isFirefly ? 0.02 : 0.012, 3, 3);
      const moteMat = new THREE.MeshBasicMaterial({
        color: isFirefly ? 0xccff88 : 0xccccaa,
        transparent: true,
        opacity: isFirefly ? 0.5 : 0.15,
      });
      const mesh = new THREE.Mesh(moteGeo, moteMat);
      mesh.position.set(
        px + (Math.random() - 0.5) * 25,
        0.3 + Math.random() * 2.5,
        pz + (Math.random() - 0.5) * 25,
      );
      this._ambientParticleGroup.add(mesh);
      this._ambientMotes.push({
        mesh,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.3) * 0.15,
        vz: (Math.random() - 0.5) * 0.2,
        life: 5 + Math.random() * 8,
        maxLife: 5 + Math.random() * 8,
      });
    }

    // Update motes
    for (let i = this._ambientMotes.length - 1; i >= 0; i--) {
      const m = this._ambientMotes[i];
      m.life -= dt;
      m.mesh.position.x += m.vx * dt;
      m.mesh.position.y += m.vy * dt + Math.sin(this._time * 2 + i) * 0.003;
      m.mesh.position.z += m.vz * dt;
      // Fade in/out
      const alpha = m.life < 1.5 ? m.life / 1.5 : (m.maxLife - m.life < 1.5 ? (m.maxLife - m.life) / 1.5 : 1);
      (m.mesh.material as THREE.MeshBasicMaterial).opacity = alpha * 0.25;

      if (m.life <= 0) {
        this._ambientParticleGroup.remove(m.mesh);
        this._ambientMotes.splice(i, 1);
      }
    }
  }

  update(state: DiabloState, dt: number): void {
    if (state.phase !== DiabloPhase.PLAYING) {
      return;
    }

    this._time += dt;
    this._dt = dt;

    this._updateShake(dt);
    this._updateWeather(dt);
    this._updateRain(state, dt);
    this._updateAmbientMotes(state, dt);
    this._updateDestroyingProps(dt);
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

      // -- First-person weapon attack / ability animation --
      if (this._fpWeapon) {
        const restPos = { x: 0.28, y: -0.2, z: -0.4 };
        const restRot = { x: 0.15, y: 0, z: -0.1 };

        if (state.player.activeSkillAnimTimer > 0) {
          // Skill/ability cast animation
          const t = state.player.activeSkillAnimTimer / 0.5; // 1 = just started, 0 = done
          const pClass = state.player.class;

          if (pClass === DiabloClass.WARRIOR) {
            // Overhead slam
            if (t > 0.65) {
              const rise = 1.0 - (t - 0.65) / 0.35;
              this._fpWeapon.position.set(restPos.x - 0.05 * rise, restPos.y + 0.35 * rise, restPos.z + 0.1 * rise);
              this._fpWeapon.rotation.set(-1.2 * rise, 0, restRot.z - 0.2 * rise);
            } else if (t > 0.3) {
              const strike = 1.0 - (t - 0.3) / 0.35;
              this._fpWeapon.position.set(restPos.x, restPos.y + 0.35 - 0.55 * strike, restPos.z - 0.15 * strike);
              this._fpWeapon.rotation.set(-1.2 + 2.0 * strike, 0, restRot.z + 0.3 * strike);
            } else {
              const recover = 1.0 - t / 0.3;
              this._fpWeapon.position.set(restPos.x, restPos.y - 0.2 * (1 - recover), restPos.z - 0.15 * (1 - recover));
              this._fpWeapon.rotation.set(0.8 * (1 - recover), 0, restRot.z + 0.3 * (1 - recover));
            }
          } else if (pClass === DiabloClass.MAGE) {
            // Thrust forward with magical pulse
            const thrust = Math.sin(t * Math.PI);
            this._fpWeapon.position.set(restPos.x - 0.08 * thrust, restPos.y + 0.15 * thrust, restPos.z - 0.25 * thrust);
            this._fpWeapon.rotation.set(restRot.x - 0.6 * thrust, 0.3 * thrust, restRot.z);
          } else if (pClass === DiabloClass.RANGER) {
            // Pull back then release (bow draw)
            if (t > 0.5) {
              const draw = 1.0 - (t - 0.5) / 0.5;
              this._fpWeapon.position.set(restPos.x + 0.06 * draw, restPos.y + 0.1 * draw, restPos.z + 0.12 * draw);
              this._fpWeapon.rotation.set(restRot.x - 0.3 * draw, -0.15 * draw, restRot.z);
            } else {
              const release = 1.0 - t / 0.5;
              this._fpWeapon.position.set(restPos.x + 0.06 * (1 - release), restPos.y + 0.1 * (1 - release), restPos.z - 0.1 * release);
              this._fpWeapon.rotation.set(restRot.x - 0.3 * (1 - release) + 0.2 * release, 0, restRot.z);
            }
          } else if (pClass === DiabloClass.PALADIN) {
            // Holy smite — raise shield-arm then slam forward
            if (t > 0.6) {
              const rise = 1.0 - (t - 0.6) / 0.4;
              this._fpWeapon.position.set(restPos.x - 0.12 * rise, restPos.y + 0.25 * rise, restPos.z);
              this._fpWeapon.rotation.set(-0.8 * rise, -0.4 * rise, restRot.z);
            } else {
              const smash = Math.sin((1.0 - t / 0.6) * Math.PI * 0.5);
              this._fpWeapon.position.set(restPos.x - 0.12 + 0.2 * smash, restPos.y + 0.25 - 0.45 * smash, restPos.z - 0.2 * smash);
              this._fpWeapon.rotation.set(-0.8 + 1.6 * smash, -0.4 + 0.4 * smash, restRot.z + 0.15 * smash);
            }
          } else if (pClass === DiabloClass.NECROMANCER) {
            // Dark channeling — weapon drifts up and trembles
            const channel = Math.sin(t * Math.PI);
            const tremble = Math.sin(this._time * 30) * 0.015 * channel;
            this._fpWeapon.position.set(restPos.x + tremble, restPos.y + 0.2 * channel, restPos.z - 0.1 * channel);
            this._fpWeapon.rotation.set(restRot.x - 0.4 * channel, 0.2 * channel + tremble * 5, restRot.z);
          } else if (pClass === DiabloClass.ASSASSIN) {
            // Rapid dual-strike — fast left-right slashes
            const phase = t * 3.0; // 3 quick slashes in one cast
            const slashDir = Math.sin(phase * Math.PI) * (Math.floor(phase) % 2 === 0 ? 1 : -1);
            this._fpWeapon.position.set(restPos.x + 0.15 * slashDir, restPos.y + 0.05, restPos.z - 0.15 * Math.abs(slashDir));
            this._fpWeapon.rotation.set(restRot.x + 0.3 * Math.abs(slashDir), 0.6 * slashDir, restRot.z - 0.3 * slashDir);
          } else {
            // Generic cast: thrust forward
            const thrust = Math.sin(t * Math.PI);
            this._fpWeapon.position.set(restPos.x, restPos.y + 0.1 * thrust, restPos.z - 0.2 * thrust);
            this._fpWeapon.rotation.set(restRot.x - 0.4 * thrust, 0, restRot.z);
          }
        } else if (state.player.isAttacking) {
          // Basic melee attack — 3-phase swing
          const t = state.player.attackTimer;
          if (t > 0.6) {
            // Wind-up: pull weapon back and to the right
            const w = (t - 0.6) / 0.4;
            this._fpWeapon.position.set(restPos.x + 0.12 * (1 - w), restPos.y + 0.15 * (1 - w), restPos.z + 0.08 * (1 - w));
            this._fpWeapon.rotation.set(restRot.x - 0.8 * (1 - w), -0.5 * (1 - w), restRot.z - 0.3 * (1 - w));
          } else if (t > 0.3) {
            // Strike: fast swing from right to left
            const s = 1.0 - (t - 0.3) / 0.3;
            this._fpWeapon.position.set(restPos.x + 0.12 - 0.3 * s, restPos.y + 0.15 - 0.1 * s, restPos.z - 0.15 * s);
            this._fpWeapon.rotation.set(restRot.x - 0.8 + 1.4 * s, -0.5 + 1.2 * s, restRot.z - 0.3 + 0.6 * s);
          } else {
            // Follow-through and return
            const r = 1.0 - t / 0.3;
            this._fpWeapon.position.x = restPos.x - 0.18 * (1 - r);
            this._fpWeapon.position.y = restPos.y + 0.05 * (1 - r);
            this._fpWeapon.position.z = restPos.z - 0.15 * (1 - r);
            this._fpWeapon.rotation.set(restRot.x + 0.6 * (1 - r), 0.7 * (1 - r), restRot.z + 0.3 * (1 - r));
          }
        } else {
          // Idle: gentle sway
          const sway = Math.sin(this._time * 1.5) * 0.008;
          const bob = Math.sin(this._time * 2.0) * 0.004;
          this._fpWeapon.position.set(restPos.x + sway, restPos.y + bob, restPos.z);
          this._fpWeapon.rotation.set(restRot.x, restRot.y, restRot.z + sway * 0.5);
        }
      }

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

    // Render remote multiplayer players
    if (state.multiplayer && state.multiplayer.remotePlayers) {
      const activeIds = new Set<string>();
      for (const rp of state.multiplayer.remotePlayers) {
        activeIds.add(rp.id);
        let mesh = this._remotePlayerMeshes.get(rp.id);
        if (!mesh) {
          // Create a simple colored capsule/cylinder for remote player
          mesh = new THREE.Group();
          const bodyGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.6, 8);
          const bodyMat = new THREE.MeshLambertMaterial({ color: this._getClassColor(rp.class) });
          const body = new THREE.Mesh(bodyGeo, bodyMat);
          body.position.y = 0.8;
          mesh.add(body);
          // Head
          const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
          const head = new THREE.Mesh(headGeo, bodyMat);
          head.position.y = 1.9;
          mesh.add(head);
          // Name label (using a sprite or just floating position)
          this._scene.add(mesh);
          this._remotePlayerMeshes.set(rp.id, mesh);
        }
        mesh.position.set(rp.x, rp.y, rp.z);
        mesh.rotation.y = rp.angle;
        mesh.visible = true;
      }
      // Remove meshes for disconnected players
      for (const [id, mesh] of this._remotePlayerMeshes) {
        if (!activeIds.has(id)) {
          this._disposeObject3D(mesh);
          this._scene.remove(mesh);
          this._remotePlayerMeshes.delete(id);
        }
      }
    }

    // Invulnerability glow
    if (state.player.invulnTimer > 0) {
      if (!this._invulnMesh) {
        // Multi-layered divine shield effect
        const shieldGroup = new THREE.Group();
        // Inner golden aura
        const innerGeo = new THREE.SphereGeometry(1.2, 16, 12);
        const innerMat = new THREE.MeshStandardMaterial({
          color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 2.5,
          transparent: true, opacity: 0.15, side: THREE.DoubleSide,
        });
        const innerMesh = new THREE.Mesh(innerGeo, innerMat);
        innerMesh.name = 'invuln_inner';
        shieldGroup.add(innerMesh);
        // Outer holy shield with wireframe
        const outerGeo = new THREE.IcosahedronGeometry(1.8, 4);
        const outerMat = new THREE.MeshStandardMaterial({
          color: 0xffeedd, emissive: 0xffcc44, emissiveIntensity: 1.8,
          wireframe: true, transparent: true, opacity: 0.4,
        });
        const outerMesh = new THREE.Mesh(outerGeo, outerMat);
        outerMesh.name = 'invuln_outer';
        shieldGroup.add(outerMesh);
        // Holy light column
        const pillarGeo = new THREE.CylinderGeometry(0.3, 0.8, 6, 39, 2, true);
        const pillarMat = new THREE.MeshStandardMaterial({
          color: 0xfff8e0, emissive: 0xffdd66, emissiveIntensity: 2.0,
          transparent: true, opacity: 0.12, side: THREE.DoubleSide,
        });
        const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
        pillarMesh.position.y = 3;
        pillarMesh.name = 'invuln_pillar';
        shieldGroup.add(pillarMesh);
        // Golden point light
        const invulnLight = new THREE.PointLight(0xffd700, 3, 8);
        invulnLight.name = 'invuln_light';
        shieldGroup.add(invulnLight);
        this._invulnMesh = shieldGroup as unknown as THREE.Mesh;
        this._scene.add(shieldGroup);
      }
      const invGroup = this._invulnMesh as unknown as THREE.Group;
      invGroup.position.set(state.player.x, state.player.y + 1, state.player.z);
      const fadeOut = Math.min(1, state.player.invulnTimer / 1.0); // fade during last second
      invGroup.traverse((child: THREE.Object3D) => {
        if (child.name === 'invuln_inner') {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.opacity = (0.15 + Math.sin(this._time * 6) * 0.08) * fadeOut;
          mat.emissiveIntensity = 2.5 + Math.sin(this._time * 10) * 0.8;
        } else if (child.name === 'invuln_outer') {
          child.rotation.x += 0.008;
          child.rotation.y += 0.012;
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.opacity = (0.3 + Math.sin(this._time * 8) * 0.15) * fadeOut;
        } else if (child.name === 'invuln_pillar') {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.opacity = (0.1 + Math.sin(this._time * 4) * 0.05) * fadeOut;
        } else if (child.name === 'invuln_light') {
          (child as THREE.PointLight).intensity = (3 + Math.sin(this._time * 8) * 1.5) * fadeOut;
        }
      });
      invGroup.visible = true;
    } else if (this._invulnMesh) {
      (this._invulnMesh as unknown as THREE.Group).visible = false;
    }

    // Walk animation — swing legs and off-hand arm based on movement
    const pdx = state.player.x - this._prevPlayerX;
    const pdz = state.player.z - this._prevPlayerZ;
    const playerSpeed = Math.sqrt(pdx * pdx + pdz * pdz) / Math.max(dt, 0.001);

    // Footprint trails
    const playerMoved = Math.abs(state.player.x - this._prevPlayerX) + Math.abs(state.player.z - this._prevPlayerZ) > 0.05;
    this._footprintCooldown -= dt;
    if (playerMoved && this._footprintCooldown <= 0) {
      if (!this._footprintGeo) {
        this._footprintGeo = new THREE.CircleGeometry(0.15, 6);
        this._footprintMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false });
      }
      const fp = new THREE.Mesh(this._footprintGeo, this._footprintMat!.clone());
      fp.rotation.x = -Math.PI / 2;
      fp.position.set(state.player.x, 0.02, state.player.z);
      this._scene.add(fp);
      this._footprints.push(fp);
      this._footprintTimers.push(4.0);
      this._footprintCooldown = 0.25;
    }
    // Fade and remove old footprints
    for (let i = this._footprints.length - 1; i >= 0; i--) {
      this._footprintTimers[i] -= dt;
      const mat = this._footprints[i].material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, this._footprintTimers[i] / 4.0) * 0.15;
      if (this._footprintTimers[i] <= 0) {
        this._scene.remove(this._footprints[i]);
        mat.dispose();
        this._footprints.splice(i, 1);
        this._footprintTimers.splice(i, 1);
      }
    }
    // Cap footprint count
    while (this._footprints.length > 80) {
      const old = this._footprints.shift()!;
      this._footprintTimers.shift();
      this._scene.remove(old);
      (old.material as THREE.MeshBasicMaterial).dispose();
    }

    this._prevPlayerX = state.player.x;
    this._prevPlayerZ = state.player.z;

    if (playerSpeed > 0.3) {
      this._walkCycle += dt * playerSpeed * 1.8;
      const swing = Math.sin(this._walkCycle) * 0.45;
      const bounce = Math.abs(Math.sin(this._walkCycle * 2)) * 0.03;
      if (this._leftLegGroup) this._leftLegGroup.rotation.x = swing;
      if (this._rightLegGroup) this._rightLegGroup.rotation.x = -swing;
      if (this._leftArmGroup && !state.player.isAttacking && !(state.player.activeSkillAnimTimer > 0)) this._leftArmGroup.rotation.x = -swing * 0.6;
      // Subtle body bob
      this._playerGroup.position.y = state.player.y + bounce;
    } else {
      // Ease back to idle
      if (this._leftLegGroup) this._leftLegGroup.rotation.x *= 0.85;
      if (this._rightLegGroup) this._rightLegGroup.rotation.x *= 0.85;
      if (this._leftArmGroup) this._leftArmGroup.rotation.x *= 0.85;
      this._playerGroup.position.y = state.player.y;
    }

    // Skill casting animation — takes priority over basic melee attack
    if (state.player.activeSkillAnimTimer > 0 && this._weaponArmGroup) {
      const t = state.player.activeSkillAnimTimer / 0.5; // 1.0 = just started, 0.0 = done
      const pClass = state.player.class;

      if (pClass === DiabloClass.WARRIOR) {
        // Warrior: powerful overhead slash — raise high then slam down
        if (t > 0.65) {
          // Phase 1: Wind-up — raise sword overhead and lean back
          const rise = 1.0 - (t - 0.65) / 0.35; // 0 to 1
          this._weaponArmGroup.rotation.x = -2.4 * rise;
          this._weaponArmGroup.rotation.z = -0.15 * rise;
          if (this._playerGroup) this._playerGroup.rotation.x = -0.18 * rise;
          if (this._leftArmGroup) this._leftArmGroup.rotation.x = -0.3 * rise;
        } else if (t > 0.3) {
          // Phase 2: Slam down — fast powerful downward strike
          const slam = 1.0 - (t - 0.3) / 0.35; // 0 to 1
          this._weaponArmGroup.rotation.x = -2.4 + slam * 4.2; // -2.4 to +1.8
          this._weaponArmGroup.rotation.z = -0.15 + slam * 0.4;
          if (this._playerGroup) this._playerGroup.rotation.x = -0.18 + slam * 0.38;
          if (this._leftArmGroup) this._leftArmGroup.rotation.x = -0.3 + slam * 0.6;
        } else {
          // Phase 3: Recovery — ease back from slam
          const recover = 1.0 - t / 0.3; // 0 to 1
          this._weaponArmGroup.rotation.x = 1.8 * (1.0 - recover);
          this._weaponArmGroup.rotation.z = 0.25 * (1.0 - recover);
          if (this._playerGroup) this._playerGroup.rotation.x = 0.2 * (1.0 - recover);
          if (this._leftArmGroup) this._leftArmGroup.rotation.x = 0.3 * (1.0 - recover);
        }
        // Body twist for weight
        if (this._playerGroup) {
          this._playerGroup.rotation.z = Math.sin(t * Math.PI * 1.5) * 0.1;
        }

      } else if (pClass === DiabloClass.MAGE) {
        // Mage: thrust staff forward to channel, hold, then pull back
        if (t > 0.6) {
          // Phase 1: Thrust staff forward
          const thrust = 1.0 - (t - 0.6) / 0.4; // 0 to 1
          this._weaponArmGroup.rotation.x = 1.6 * thrust;
          this._weaponArmGroup.rotation.z = 0.2 * thrust;
          if (this._playerGroup) this._playerGroup.rotation.x = 0.12 * thrust;
          if (this._leftArmGroup) this._leftArmGroup.rotation.x = 1.2 * thrust; // both hands forward
        } else if (t > 0.2) {
          // Phase 2: Hold staff extended — channeling energy, slight pulsing
          const pulse = Math.sin((1.0 - (t - 0.2) / 0.4) * Math.PI * 3) * 0.08;
          this._weaponArmGroup.rotation.x = 1.6 + pulse;
          this._weaponArmGroup.rotation.z = 0.2;
          if (this._playerGroup) this._playerGroup.rotation.x = 0.12;
          if (this._leftArmGroup) this._leftArmGroup.rotation.x = 1.2 + pulse;
        } else {
          // Phase 3: Pull back and release
          const release = 1.0 - t / 0.2; // 0 to 1
          this._weaponArmGroup.rotation.x = 1.6 * (1.0 - release);
          this._weaponArmGroup.rotation.z = 0.2 * (1.0 - release);
          if (this._playerGroup) this._playerGroup.rotation.x = 0.12 * (1.0 - release);
          if (this._leftArmGroup) this._leftArmGroup.rotation.x = 1.2 * (1.0 - release);
        }
        // Staff glow effect — boost emissive on weapon mesh during cast
        if (this._weaponMesh && (this._weaponMesh.material as THREE.MeshStandardMaterial).emissiveIntensity !== undefined) {
          const glowT = Math.sin(t * Math.PI); // peaks in the middle of the cast
          (this._weaponMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0 + glowT * 3.0;
        }

      } else if (pClass === DiabloClass.RANGER) {
        // Ranger: draw bow back, hold at full draw, then release
        if (t > 0.6) {
          // Phase 1: Raise bow arm and draw string back
          const draw = 1.0 - (t - 0.6) / 0.4; // 0 to 1
          this._weaponArmGroup.rotation.x = 0.8 * draw; // bow arm extends forward
          this._weaponArmGroup.rotation.z = -0.3 * draw;
          if (this._leftArmGroup) {
            this._leftArmGroup.rotation.x = -1.4 * draw; // pull string back
            this._leftArmGroup.rotation.z = 0.2 * draw;
          }
          if (this._playerGroup) this._playerGroup.rotation.x = -0.08 * draw;
        } else if (t > 0.25) {
          // Phase 2: Hold at full draw — slight tension tremor
          const tremor = Math.sin((1.0 - (t - 0.25) / 0.35) * Math.PI * 6) * 0.03;
          this._weaponArmGroup.rotation.x = 0.8 + tremor;
          this._weaponArmGroup.rotation.z = -0.3;
          if (this._leftArmGroup) {
            this._leftArmGroup.rotation.x = -1.4 + tremor;
            this._leftArmGroup.rotation.z = 0.2;
          }
          if (this._playerGroup) this._playerGroup.rotation.x = -0.08;
        } else {
          // Phase 3: Release — snap string hand forward, bow arm recoils
          const release = 1.0 - t / 0.25; // 0 to 1
          this._weaponArmGroup.rotation.x = 0.8 * (1.0 - release * 0.5);
          this._weaponArmGroup.rotation.z = -0.3 * (1.0 - release);
          if (this._leftArmGroup) {
            this._leftArmGroup.rotation.x = -1.4 + release * 1.8; // snap forward past neutral
            this._leftArmGroup.rotation.z = 0.2 * (1.0 - release);
          }
          if (this._playerGroup) this._playerGroup.rotation.x = -0.08 * (1.0 - release);
        }

      } else if (pClass === DiabloClass.PALADIN) {
        // Paladin: raise weapon high then smash down with holy force
        if (t > 0.65) {
          const rise = 1.0 - (t - 0.65) / 0.35;
          this._weaponArmGroup.rotation.x = -2.6 * rise;
          this._weaponArmGroup.rotation.z = -0.1 * rise;
          if (this._playerGroup) this._playerGroup.rotation.x = -0.2 * rise;
          if (this._leftArmGroup) this._leftArmGroup.rotation.x = -0.4 * rise;
        } else if (t > 0.3) {
          const slam = 1.0 - (t - 0.3) / 0.35;
          this._weaponArmGroup.rotation.x = -2.6 + slam * 4.4;
          this._weaponArmGroup.rotation.z = -0.1 + slam * 0.3;
          if (this._playerGroup) this._playerGroup.rotation.x = -0.2 + slam * 0.4;
          if (this._leftArmGroup) this._leftArmGroup.rotation.x = -0.4 + slam * 0.8;
        } else {
          const recover = 1.0 - t / 0.3;
          this._weaponArmGroup.rotation.x = 1.8 * (1.0 - recover);
          this._weaponArmGroup.rotation.z = 0.2 * (1.0 - recover);
          if (this._playerGroup) this._playerGroup.rotation.x = 0.2 * (1.0 - recover);
          if (this._leftArmGroup) this._leftArmGroup.rotation.x = 0.4 * (1.0 - recover);
        }
        // Subtle golden glow pulse on weapon during cast
        if (this._weaponMesh && (this._weaponMesh.material as THREE.MeshStandardMaterial).emissiveIntensity !== undefined) {
          const glowT = Math.sin(t * Math.PI);
          (this._weaponMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + glowT * 4.0;
        }

      } else if (pClass === DiabloClass.NECROMANCER) {
        // Necromancer: thrust staff forward and channel dark energy, similar to Mage but with a sinister twist
        if (t > 0.6) {
          const thrust = 1.0 - (t - 0.6) / 0.4;
          this._weaponArmGroup.rotation.x = 1.4 * thrust;
          this._weaponArmGroup.rotation.z = 0.3 * thrust;
          if (this._playerGroup) this._playerGroup.rotation.x = 0.15 * thrust;
          if (this._leftArmGroup) this._leftArmGroup.rotation.x = 1.0 * thrust;
        } else if (t > 0.2) {
          const pulse = Math.sin((1.0 - (t - 0.2) / 0.4) * Math.PI * 4) * 0.1;
          this._weaponArmGroup.rotation.x = 1.4 + pulse;
          this._weaponArmGroup.rotation.z = 0.3;
          if (this._playerGroup) this._playerGroup.rotation.x = 0.15 + pulse * 0.5;
          if (this._leftArmGroup) this._leftArmGroup.rotation.x = 1.0 + pulse;
        } else {
          const release = 1.0 - t / 0.2;
          this._weaponArmGroup.rotation.x = 1.4 * (1.0 - release);
          this._weaponArmGroup.rotation.z = 0.3 * (1.0 - release);
          if (this._playerGroup) this._playerGroup.rotation.x = 0.15 * (1.0 - release);
          if (this._leftArmGroup) this._leftArmGroup.rotation.x = 1.0 * (1.0 - release);
        }
        // Green glow on staff
        if (this._weaponMesh && (this._weaponMesh.material as THREE.MeshStandardMaterial).emissiveIntensity !== undefined) {
          const glowT = Math.sin(t * Math.PI);
          (this._weaponMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + glowT * 2.5;
        }

      } else if (pClass === DiabloClass.ASSASSIN) {
        // Assassin: rapid dual-slash combo — fast alternating strikes
        if (t > 0.7) {
          // Phase 1: Right arm forward stab
          const stab = 1.0 - (t - 0.7) / 0.3;
          this._weaponArmGroup.rotation.x = 1.8 * stab;
          this._weaponArmGroup.rotation.z = 0.2 * stab;
          if (this._leftArmGroup) this._leftArmGroup.rotation.x = -0.5 * stab;
          if (this._playerGroup) this._playerGroup.rotation.z = 0.15 * stab;
        } else if (t > 0.4) {
          // Phase 2: Left arm cross-slash
          const cross = 1.0 - (t - 0.4) / 0.3;
          this._weaponArmGroup.rotation.x = 1.8 * (1.0 - cross * 0.5);
          if (this._leftArmGroup) {
            this._leftArmGroup.rotation.x = -0.5 + cross * 2.3;
            this._leftArmGroup.rotation.z = cross * 0.4;
          }
          if (this._playerGroup) this._playerGroup.rotation.z = 0.15 - cross * 0.3;
        } else {
          // Phase 3: Recovery — both arms snap back
          const recover = 1.0 - t / 0.4;
          this._weaponArmGroup.rotation.x = 0.9 * (1.0 - recover);
          this._weaponArmGroup.rotation.z = 0.1 * (1.0 - recover);
          if (this._leftArmGroup) {
            this._leftArmGroup.rotation.x = 1.8 * (1.0 - recover);
            this._leftArmGroup.rotation.z = 0.4 * (1.0 - recover);
          }
          if (this._playerGroup) this._playerGroup.rotation.z = -0.15 * (1.0 - recover);
        }
      }

      // Brace legs during skill cast
      if (this._leftLegGroup) this._leftLegGroup.rotation.x = 0.12;
      if (this._rightLegGroup) this._rightLegGroup.rotation.x = -0.18;

    // Attack animation: multi-phase weapon swing with body involvement
    } else if (state.player.isAttacking && this._weaponArmGroup) {
      const t = state.player.attackTimer; // counts down from ~1.0

      // Phase 1: Wind-up (t > 0.6) - pull weapon arm back
      if (t > 0.6) {
        const windUp = (t - 0.6) / 0.4; // 1 to 0
        this._weaponArmGroup.rotation.x = -1.8 * (1.0 - windUp);
        this._weaponArmGroup.rotation.z = -0.3 * (1.0 - windUp);
        // Lean back during wind-up
        if (this._playerGroup) this._playerGroup.rotation.x = -0.1 * (1.0 - windUp);
      }
      // Phase 2: Strike (0.3 < t <= 0.6) - fast forward slash
      else if (t > 0.3) {
        const strike = 1.0 - (t - 0.3) / 0.3; // 0 to 1
        this._weaponArmGroup.rotation.x = -1.8 + strike * 3.2; // -1.8 to +1.4
        this._weaponArmGroup.rotation.z = -0.3 + strike * 0.8;
        // Lean forward into strike
        if (this._playerGroup) this._playerGroup.rotation.x = -0.1 + strike * 0.25;
        // Off-hand braces
        if (this._leftArmGroup) this._leftArmGroup.rotation.x = -0.4 * strike;
      }
      // Phase 3: Follow-through (t <= 0.3) - decelerate and return
      else {
        const recovery = 1.0 - t / 0.3; // 0 to 1
        this._weaponArmGroup.rotation.x = 1.4 * (1.0 - recovery * 0.7);
        this._weaponArmGroup.rotation.z = 0.5 * (1.0 - recovery);
        if (this._playerGroup) this._playerGroup.rotation.x = 0.15 * (1.0 - recovery);
        if (this._leftArmGroup) this._leftArmGroup.rotation.x = -0.4 * (1.0 - recovery);
      }

      // Body twist during attack
      if (this._playerGroup) {
        this._playerGroup.rotation.z = Math.sin(t * Math.PI) * 0.08;
      }

      // Legs brace during attack
      if (this._leftLegGroup) this._leftLegGroup.rotation.x = 0.15;
      if (this._rightLegGroup) this._rightLegGroup.rotation.x = -0.2;

    } else if (this._weaponArmGroup) {
      // Reset weapon arm when idle
      this._weaponArmGroup.rotation.x *= 0.82;
      this._weaponArmGroup.rotation.z *= 0.82;
      if (this._playerGroup) {
        this._playerGroup.rotation.x *= 0.85;
        this._playerGroup.rotation.z *= 0.9;
      }
      // Fade out staff glow for mage when not casting
      if (this._weaponMesh && state.player.class === DiabloClass.MAGE &&
          (this._weaponMesh.material as THREE.MeshStandardMaterial).emissiveIntensity !== undefined) {
        const mat = this._weaponMesh.material as THREE.MeshStandardMaterial;
        if (mat.emissiveIntensity > 1.0) {
          mat.emissiveIntensity = Math.max(1.0, mat.emissiveIntensity - dt * 8.0);
        }
      }
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
        this._disposeObject3D(mesh);
        this._scene.remove(mesh);
      }
      this._townfolkMeshes.clear();
    }

    // -- Pets --
    this._syncPets(state, dt);

    // -- Skill cast effects (3rd person) --
    this._updateCastEffects(state, dt);

    // -- Player status effect visuals --
    this._syncPlayerStatusEffects(state);

    // -- Dodge roll animation --
    this._updateDodgeRoll(state, dt);

    // -- Environment animation --
    this._animateEnvironment();

    // -- Water surface animation --
    this._animateWater(dt);

    // -- Update telegraph timers --
    for (const [id, mesh] of this._telegraphMeshes) {
      if ((mesh as any)._telegraphTimer !== undefined) {
        (mesh as any)._telegraphTimer -= dt;
        // Pulse opacity
        const t = (mesh as any)._telegraphTimer;
        if (mesh.material && 'opacity' in mesh.material) {
          (mesh.material as any).opacity = 0.2 + Math.sin(t * 8) * 0.2;
        }
        if (t <= 0) {
          this._scene.remove(mesh);
          if ((mesh as any).geometry) (mesh as any).geometry.dispose();
          if ((mesh as any).material) (mesh as any).material.dispose();
          this._telegraphMeshes.delete(id);
        }
      }
    }

    // Boss arena hazard rendering
    this._syncBossHazards(state, dt);

    // Boss attack telegraphs (enhanced)
    this._syncBossTelegraphs(state);

    // Slow motion visual tint
    if (state.slowMotionTimer > 0) {
      this._renderer.toneMappingExposure = 0.6 + 0.4 * (1 - Math.min(state.slowMotionTimer, 1));
    } else {
      if (this._renderer.toneMappingExposure !== 1.0) this._renderer.toneMappingExposure = 1.0;
    }

    // Skill flash fade
    if (this._skillFlashEl && this._skillFlashTimer > 0) {
      this._skillFlashTimer -= dt;
      this._skillFlashEl.style.opacity = String(Math.max(0, this._skillFlashTimer / 0.15) * 0.4);
    }

    // Dodge ghost fade
    for (let i = this._dodgeGhosts.length - 1; i >= 0; i--) {
      const g = this._dodgeGhosts[i];
      g.timer -= dt;
      const opacity = Math.max(0, g.timer / 0.4) * 0.4;
      g.mesh.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.opacity = opacity;
        }
      });
      if (g.timer <= 0) {
        this._disposeObject3D(g.mesh);
        this._scene.remove(g.mesh);
        this._dodgeGhosts.splice(i, 1);
      }
    }

    // Swing arc fade
    if (this._swingArc && this._swingArcTimer > 0) {
      this._swingArcTimer -= dt;
      const mat = this._swingArc.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, this._swingArcTimer / 0.2) * 0.5;
      this._swingArc.scale.setScalar(1 + (0.2 - this._swingArcTimer) * 3);
      if (this._swingArcTimer <= 0) this._swingArc.visible = false;
    }

    // Render with bloom post-processing
    if (this._bloomComposer) {
      this._bloomComposer.render();
    } else {
      this._renderer.render(this._scene, this._camera);
    }
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
          this._disposeObject3D(mesh);
          this._scene.remove(mesh);
          this._enemyMeshes.delete(id);
          this._enemyFlashTimers.delete(id);
          this._lastEnemyHp.delete(id);
          this._enemyMaterials.delete(id);
          const hpBar = this._enemyHpBars.get(id);
          if (hpBar) {
            if (hpBar.material instanceof THREE.SpriteMaterial && hpBar.material.map) {
              hpBar.material.map.dispose();
            }
            hpBar.material.dispose();
            this._scene.remove(hpBar);
            this._enemyHpBars.delete(id);
          }
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
        // Cache all MeshStandardMaterial references for this enemy
        const mats: THREE.MeshStandardMaterial[] = [];
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            mats.push(child.material);
          }
        });
        this._enemyMaterials.set(enemy.id, mats);
        // Spawn smoke effect for new enemies
        this.spawnParticles(ParticleType.DUST, enemy.x, enemy.y + 0.5, enemy.z, 8, state.particles);
      }

      mesh.position.set(enemy.x, enemy.y, enemy.z);

      // Enemy health bar
      if (enemy.hp < enemy.maxHp && enemy.state !== EnemyState.DYING && enemy.state !== EnemyState.DEAD) {
        let hpSprite = this._enemyHpBars.get(enemy.id);
        if (!hpSprite) {
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 8;
          const tex = new THREE.CanvasTexture(canvas);
          const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
          hpSprite = new THREE.Sprite(mat);
          hpSprite.scale.set(enemy.isBoss ? 3.0 : 1.5, enemy.isBoss ? 0.3 : 0.15, 1);
          this._scene.add(hpSprite);
          this._enemyHpBars.set(enemy.id, hpSprite);
        }
        // Position above enemy
        hpSprite.position.set(enemy.x, enemy.y + enemy.scale * 2 + 0.5, enemy.z);
        hpSprite.visible = true;
        // Only redraw HP bar canvas when HP has actually changed
        const lastHp = this._lastEnemyHp.get(enemy.id);
        if (lastHp === undefined || lastHp !== enemy.hp) {
          this._lastEnemyHp.set(enemy.id, enemy.hp);
          const mat = hpSprite.material as THREE.SpriteMaterial;
          const tex = mat.map as THREE.CanvasTexture;
          const ctx = tex.image.getContext('2d') as CanvasRenderingContext2D;
          ctx.clearRect(0, 0, 64, 8);
          // Background
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(0, 0, 64, 8);
          // HP fill
          const pct = Math.max(0, enemy.hp / enemy.maxHp);
          const hpColor = pct > 0.5 ? '#44ff44' : pct > 0.25 ? '#ffaa00' : '#ff3333';
          ctx.fillStyle = hpColor;
          ctx.fillRect(1, 1, Math.floor(62 * pct), 6);
          // Border
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.strokeRect(0, 0, 64, 8);
          tex.needsUpdate = true;
        }
      } else {
        const hpSprite = this._enemyHpBars.get(enemy.id);
        if (hpSprite) hpSprite.visible = false;
      }

      // Face toward player when chasing/attacking
      if (enemy.state === EnemyState.CHASE || enemy.state === EnemyState.ATTACK) {
        mesh.rotation.y = enemy.angle;
      } else {
        mesh.rotation.y = enemy.angle;
      }

      // Reset mesh transforms before applying animations
      mesh.rotation.x = 0;
      mesh.rotation.z = 0;
      mesh.scale.setScalar(enemy.scale || 1);

      // -- CHASE animation: forward lean like running --
      if (enemy.state === EnemyState.CHASE) {
        // Lean forward while chasing
        mesh.rotation.x = 0.15;
        // Subtle running bob
        const runBob = Math.sin(this._time * 10 + enemy.id.charCodeAt(0)) * 0.06;
        mesh.position.y += runBob;
      }

      // -- ATTACK animations --
      if (enemy.state === EnemyState.ATTACK) {
        const at = enemy.attackTimer;
        const baseScale = enemy.scale || 1;

        if (at > 0 && at <= 0.5) {
          // === WIND-UP PHASE (attackTimer 0.5 -> 0) ===
          const windUpProgress = 1.0 - at / 0.5; // 0 -> 1 as timer counts down

          // Lunge forward toward the player
          const lungeAmount = Math.sin(windUpProgress * Math.PI * 0.5) * 0.4;
          mesh.position.x += Math.sin(enemy.angle) * lungeAmount;
          mesh.position.z += Math.cos(enemy.angle) * lungeAmount;

          // Tilt forward (leaning into the attack)
          mesh.rotation.x = windUpProgress * 0.3;

          // Weapon swing: tilt to one side as weapon is raised
          mesh.rotation.z = windUpProgress * 0.35;

          // Slight rise before the slam
          if (enemy.isBoss) {
            // Boss: rise up dramatically before slamming down
            mesh.position.y += windUpProgress * 0.6;
            mesh.scale.setScalar(baseScale * (1.0 + windUpProgress * 0.08));
          }

          // Brief scale pulse right at the moment of strike (near 0)
          if (at < 0.08) {
            mesh.scale.setScalar(baseScale * 1.12);
            mesh.position.y += 0.1;
            // Weapon swing snaps to the other side on strike
            mesh.rotation.z = -0.4;
            mesh.rotation.x = 0.4;

            if (enemy.isBoss) {
              // Boss slam: crash down
              mesh.position.y = enemy.y - 0.15;
              mesh.scale.setScalar(baseScale * 1.18);
              mesh.rotation.x = 0.5;
            }
          }
        } else if (at > 0.5) {
          // === COOLDOWN / RECOVERY PHASE (attackTimer 1.5 -> 0.5) ===
          const cooldownProgress = (at - 0.5) / 1.0; // 1 -> 0 as timer counts down

          // Recovery sway: gentle rocking oscillation
          const swaySpeed = 4.0;
          const swayAmount = 0.12 * cooldownProgress;
          mesh.rotation.z = Math.sin(this._time * swaySpeed + enemy.id.charCodeAt(0)) * swayAmount;

          // Subtle backward lean recovering from the strike
          mesh.rotation.x = -0.1 * cooldownProgress;

          // Recovery bob
          mesh.position.y += Math.abs(Math.sin(this._time * 3)) * 0.04 * cooldownProgress;

          if (enemy.isBoss) {
            // Boss recovery: scale pulse settling down
            const bossRecoverPulse = 1.0 + Math.sin(this._time * 6) * 0.04 * cooldownProgress;
            mesh.scale.setScalar(baseScale * bossRecoverPulse);
          }
        }
      }

      // Attack telegraph: glow red when about to strike
      const isAttackTelegraph = enemy.state === EnemyState.ATTACK && enemy.attackTimer < 0.4 && enemy.attackTimer > 0;
      if (isAttackTelegraph) {
        const telegraphIntensity = (0.4 - enemy.attackTimer) / 0.4;
        const cachedMats = this._enemyMaterials.get(enemy.id);
        if (cachedMats) {
          for (const m of cachedMats) {
            m.emissive.setHex(0xff2200);
            m.emissiveIntensity = telegraphIntensity * 1.5;
          }
        }
      }

      // Hit flash effect
      const flashTimer = this._enemyFlashTimers.get(enemy.id) || 0;
      if (flashTimer > 0) {
        this._enemyFlashTimers.set(enemy.id, flashTimer - this._dt);
        const cachedMats = this._enemyMaterials.get(enemy.id);
        if (cachedMats) {
          for (const m of cachedMats) {
            m.emissive.setHex(0xffffff);
            m.emissiveIntensity = flashTimer * 15; // bright flash that fades
          }
        }
      }

      // Enhanced dying animation: collapse + sink + dissolve
      if (enemy.state === EnemyState.DYING) {
        let dyingAnim = this._dyingAnims.get(enemy.id);
        if (!dyingAnim) {
          dyingAnim = { timer: 0, sinkY: 0, initialY: enemy.y, scattered: false };
          this._dyingAnims.set(enemy.id, dyingAnim);
          // One-time setup: mark all materials as transparent for fading
          const cachedMats = this._enemyMaterials.get(enemy.id);
          if (cachedMats) {
            for (const m of cachedMats) m.transparent = true;
          }
        }
        const dt2 = enemy.deathTimer; // how far into death (increases)
        const phase = Math.min(dt2 * 2, 1.0); // 0→1 over 0.5s
        const prevPhase = dyingAnim.timer;
        dyingAnim.timer = phase;

        // Phase 1: Collapse — tilt forward/sideways and shrink
        const collapseT = Math.min(phase * 2, 1.0);
        mesh.rotation.x = collapseT * 1.2;
        mesh.rotation.z = collapseT * 0.4 * (enemy.id.charCodeAt(0) % 2 === 0 ? 1 : -1);
        const baseScale = enemy.scale || 1;
        const scaleY = baseScale * (1.0 - collapseT * 0.5);
        mesh.scale.set(baseScale * (1.0 + collapseT * 0.15), scaleY, baseScale * (1.0 + collapseT * 0.15));

        // Phase 2: Sink into ground
        const sinkT = Math.max(0, (phase - 0.3) / 0.7);
        mesh.position.y = enemy.y - sinkT * 0.8;

        // Phase 3: Dissolve/fade — only traverse when opacity actually changes
        const fadeT = Math.max(0, (phase - 0.2) / 0.8);
        const fade = Math.max(0, 1.0 - fadeT);
        const prevFadeT = Math.max(0, (prevPhase - 0.2) / 0.8);
        // Only update materials when fade value has meaningfully changed (>0.02)
        if (Math.abs(fadeT - prevFadeT) > 0.02 || phase < 0.2) {
          const isFlash = phase < 0.2;
          const flashIntensity = isFlash ? (1.0 - phase * 5) * 2.0 : 0;
          const cachedMats2 = this._enemyMaterials.get(enemy.id);
          if (cachedMats2) {
            for (const m of cachedMats2) {
              m.opacity = fade;
              if (isFlash) {
                m.emissive.setHex(0xff2200);
                m.emissiveIntensity = flashIntensity;
              }
            }
          }
        }
      } else {
        // Clean up dying anim tracking if enemy is no longer dying
        this._dyingAnims.delete(enemy.id);
      }

      // Status effect visuals
      this._applyStatusTint(mesh, enemy.statusEffects);

      // Boss enrage glow — dramatic multi-frequency pulsing with scale throb
      if (enemy.bossEnraged) {
        const slowPulse = Math.sin(this._time * 3) * 0.3;
        const fastPulse = Math.sin(this._time * 8) * 0.2;
        const flicker = Math.sin(this._time * 20) * 0.1;
        const totalPulse = 0.6 + slowPulse + fastPulse + flicker;
        const enrageMats = this._enemyMaterials.get(enemy.id);
        if (enrageMats) {
          const redShift = Math.sin(this._time * 4) > 0 ? 0xff2200 : 0xff0000;
          for (const m of enrageMats) {
            m.emissive.setHex(redShift);
            m.emissiveIntensity = 0.5 + totalPulse * 1.0;
          }
        }
        // Boss scale throb when enraged
        const enrageBaseScale = enemy.scale || 1;
        const enrageScale = enrageBaseScale * (1.0 + Math.sin(this._time * 5) * 0.03);
        mesh.scale.setScalar(enrageScale);
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
          this._disposeObject3D(existing);
          this._scene.remove(existing);
          this._shieldMeshes.delete(enemy.id + "_boss");
        }
      }

      // Shielded enemy behavior shield
      if (enemy.shieldActive) {
        let shieldMesh = this._shieldMeshes.get(enemy.id + "_shield");
        if (!shieldMesh) {
          const sGeo = new THREE.SphereGeometry(enemy.scale * 1.5, 46, 44);
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
          this._disposeObject3D(existing);
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
          this._disposeObject3D(existing);
          this._scene.remove(existing);
          this._healBeams.delete(enemy.id);
        }
      }

      // ── Limb Animation ──
      const enemyOffset = enemy.id.charCodeAt(0) * 0.7;
      const isMoving = enemy.state === EnemyState.CHASE || enemy.state === EnemyState.PATROL;
      const isAttacking = enemy.state === EnemyState.ATTACK;

      // Retrieve named limb groups (returns undefined if not present)
      const ll = mesh.getObjectByName('anim_ll');
      const rl = mesh.getObjectByName('anim_rl');
      const la = mesh.getObjectByName('anim_la');
      const ra = mesh.getObjectByName('anim_ra');
      const fll = mesh.getObjectByName('anim_fll');
      const frl = mesh.getObjectByName('anim_frl');
      const bll = mesh.getObjectByName('anim_bll');
      const brl = mesh.getObjectByName('anim_brl');
      const lw = mesh.getObjectByName('anim_lw');
      const rw = mesh.getObjectByName('anim_rw');
      const animTail = mesh.getObjectByName('anim_tail');
      const animJaw = mesh.getObjectByName('anim_jaw');
      const animHover = mesh.getObjectByName('anim_hover');
      const legsL = mesh.getObjectByName('anim_legs_left');
      const legsR = mesh.getObjectByName('anim_legs_right');

      if (isMoving) {
        const walkFreq = enemy.isBoss ? 6 : 9;
        const swing = Math.sin(this._time * walkFreq + enemyOffset) * 0.5;

        // Biped legs
        if (ll) ll.rotation.x = swing;
        if (rl) rl.rotation.x = -swing;

        // Quadruped legs (diagonal gait: FL+BR together, FR+BL together)
        if (fll) fll.rotation.x = swing;
        if (brl) brl.rotation.x = swing * 0.8;
        if (frl) frl.rotation.x = -swing;
        if (bll) bll.rotation.x = -swing * 0.8;

        // Spider legs (wave motion)
        if (legsL) legsL.rotation.x = Math.sin(this._time * walkFreq + enemyOffset) * 0.3;
        if (legsR) legsR.rotation.x = Math.sin(this._time * walkFreq + enemyOffset + Math.PI) * 0.3;

        // Arms swing opposite to legs (weapon arm only if not attacking)
        if (la) la.rotation.x = -swing * 0.5;
        if (ra && !isAttacking) ra.rotation.x = swing * 0.5;

        // Wings flap
        if (lw) lw.rotation.z = Math.sin(this._time * 7 + enemyOffset) * 0.5;
        if (rw) rw.rotation.z = -Math.sin(this._time * 7 + enemyOffset) * 0.5;

        // Tail sway
        if (animTail) animTail.rotation.y = Math.sin(this._time * 5 + enemyOffset) * 0.35;

        // Hover bob
        if (animHover) animHover.position.y = Math.sin(this._time * 3 + enemyOffset) * 0.12;

      } else if (isAttacking) {
        const at = enemy.attackTimer;

        // Biped legs: plant firmly, slight bend
        if (ll) ll.rotation.x = 0.15;
        if (rl) rl.rotation.x = -0.1;

        // Quadruped legs: brace
        if (fll) fll.rotation.x = -0.2;
        if (frl) frl.rotation.x = -0.2;
        if (bll) bll.rotation.x = 0.15;
        if (brl) brl.rotation.x = 0.15;

        // Weapon arm: big swing attack
        if (ra) {
          if (at < 0.5) {
            // Strike phase: rapid forward swing
            const strikeT = 1.0 - at / 0.5;
            ra.rotation.x = -1.5 + strikeT * 2.5;
            ra.rotation.z = Math.sin(strikeT * Math.PI) * 0.4;
          } else {
            // Wind-up phase: pull arm back
            const windupT = (at - 0.5) / 1.0;
            ra.rotation.x = -1.5 * (1.0 - windupT);
          }
        }

        // Off-hand arm: guard/brace position
        if (la) {
          la.rotation.x = -0.3;
          la.rotation.z = 0.2;
        }

        // Wings flare out during attack
        if (lw) lw.rotation.z = Math.sin(this._time * 12) * 0.3 + 0.6;
        if (rw) rw.rotation.z = -Math.sin(this._time * 12) * 0.3 - 0.6;

        // Jaw snap for bite attacks
        if (animJaw) {
          if (at < 0.15) {
            animJaw.rotation.x = 0.6;
          } else if (at < 0.4) {
            animJaw.rotation.x = -0.4 * (1.0 - (at - 0.15) / 0.25);
          } else {
            animJaw.rotation.x *= 0.9;
          }
        }

        // Tail thrash during attack
        if (animTail) animTail.rotation.y = Math.sin(this._time * 12 + enemyOffset) * 0.6;

        // Hover enemies rise up before attack
        if (animHover) animHover.position.y = Math.sin(this._time * 4) * 0.08 + 0.2;

      } else {
        // Idle: subtle breathing/sway
        const idleSway = Math.sin(this._time * 1.5 + enemyOffset) * 0.04;

        if (ll) ll.rotation.x *= 0.9;
        if (rl) rl.rotation.x *= 0.9;
        if (la) la.rotation.x = idleSway;
        if (ra) ra.rotation.x = -idleSway;
        if (fll) fll.rotation.x *= 0.9;
        if (frl) frl.rotation.x *= 0.9;
        if (bll) bll.rotation.x *= 0.9;
        if (brl) brl.rotation.x *= 0.9;
        if (lw) { lw.rotation.z *= 0.92; lw.rotation.z += Math.sin(this._time * 2 + enemyOffset) * 0.02; }
        if (rw) { rw.rotation.z *= 0.92; rw.rotation.z -= Math.sin(this._time * 2 + enemyOffset) * 0.02; }
        if (animTail) animTail.rotation.y = Math.sin(this._time * 2 + enemyOffset) * 0.15;
        if (animJaw) animJaw.rotation.x *= 0.9;
        if (animHover) animHover.position.y = Math.sin(this._time * 2 + enemyOffset) * 0.06;
        if (legsL) legsL.rotation.x *= 0.9;
        if (legsR) legsR.rotation.x *= 0.9;
      }
    }

    // Cleanup shields and beams for removed enemies
    for (const [key, mesh] of this._shieldMeshes) {
      const eid = key.split("_")[0];
      if (!currentIds.has(eid)) {
        this._disposeObject3D(mesh);
        this._scene.remove(mesh);
        this._shieldMeshes.delete(key);
      }
    }
    for (const [key, beam] of this._healBeams) {
      if (!currentIds.has(key)) {
        this._disposeObject3D(beam);
        this._scene.remove(beam);
        this._healBeams.delete(key);
      }
    }
  }

  private _applyStatusTint(
    group: THREE.Group,
    effects: { effect: StatusEffect; duration: number; source: string }[]
  ): void {
    // Clean up old status effect decorations when no effects
    if (effects.length === 0) {
      // Remove status-effect children that were added dynamically
      const toRemove: THREE.Object3D[] = [];
      group.traverse((child) => {
        if (child.name && child.name.startsWith('status_fx_')) {
          toRemove.push(child);
        }
      });
      for (const obj of toRemove) {
        obj.parent?.remove(obj);
      }
      return;
    }

    let tintColor: number | null = null;
    let emissiveColor: number | null = null;
    let hasBurning = false;
    let hasFrozen = false;
    let hasShocked = false;
    let hasPoisoned = false;

    for (const fx of effects) {
      switch (fx.effect) {
        case StatusEffect.BURNING:
          tintColor = 0xff4400;
          emissiveColor = 0xff2200;
          hasBurning = true;
          break;
        case StatusEffect.FROZEN:
          tintColor = 0x88ccff;
          emissiveColor = 0x4488cc;
          hasFrozen = true;
          break;
        case StatusEffect.SHOCKED:
          tintColor = 0xffff44;
          emissiveColor = 0xaaaa00;
          hasShocked = true;
          break;
        case StatusEffect.POISONED:
          tintColor = 0x44ff44;
          emissiveColor = 0x22aa22;
          hasPoisoned = true;
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

    const t = this._time;

    if (tintColor !== null && emissiveColor !== null) {
      const pulse = Math.sin(t * 6) * 0.3 + 0.5;
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          if (!child.name.startsWith('status_fx_')) {
            child.material.emissive.setHex(emissiveColor!);
            child.material.emissiveIntensity = pulse;
          }
        }
      });
    }

    // ── BURNING: Fire particles orbiting around the unit, rising flames, orange point light ──
    if (hasBurning) {
      let fireLight = group.getObjectByName('status_fx_fire_light') as THREE.Object3D | undefined;
      if (!fireLight) {
        // Use a dummy marker object instead of PointLight (emissive + bloom provides glow)
        fireLight = new THREE.Object3D();
        fireLight.name = 'status_fx_fire_light';
        group.add(fireLight);

        // Orbiting fire embers (6 small flame meshes)
        if (!this._emberGeo) this._emberGeo = new THREE.SphereGeometry(0.08, 8, 6);
        for (let i = 0; i < 6; i++) {
          const ember = new THREE.Mesh(
            this._emberGeo,
            new THREE.MeshStandardMaterial({
              color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 3.0,
              transparent: true, opacity: 0.8,
            })
          );
          ember.name = 'status_fx_fire_ember';
          ember.userData.orbitAngle = (i / 6) * Math.PI * 2;
          ember.userData.orbitSpeed = 3.0 + Math.random() * 2.0;
          ember.userData.orbitRadius = 0.5 + Math.random() * 0.3;
          ember.userData.heightOffset = 0.3 + Math.random() * 1.2;
          group.add(ember);
        }

        // Rising flame cones (3 larger flames)
        if (!this._flameGeo) this._flameGeo = new THREE.ConeGeometry(0.1, 0.55, 8);
        for (let i = 0; i < 3; i++) {
          const flame = new THREE.Mesh(
            this._flameGeo,
            new THREE.MeshStandardMaterial({
              color: 0xff8800, emissive: 0xff4400, emissiveIntensity: 2.5,
              transparent: true, opacity: 0.7,
            })
          );
          flame.name = 'status_fx_fire_flame';
          flame.userData.flameOffset = (i / 3) * Math.PI * 2;
          flame.userData.flameRadius = 0.2 + Math.random() * 0.15;
          group.add(flame);
        }

        // Hot glow overlay sphere
        if (!this._heatGlowGeo) this._heatGlowGeo = new THREE.SphereGeometry(0.9, 8, 6);
        const heatGlow = new THREE.Mesh(
          this._heatGlowGeo,
          new THREE.MeshStandardMaterial({
            color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.5,
            transparent: true, opacity: 0.12, side: THREE.DoubleSide,
          })
        );
        heatGlow.name = 'status_fx_fire_glow';
        heatGlow.position.y = 0.8;
        group.add(heatGlow);
      }

      // Animate fire effects
      group.traverse((child) => {
        if (child.name === 'status_fx_fire_ember') {
          const angle = child.userData.orbitAngle + t * child.userData.orbitSpeed;
          const r = child.userData.orbitRadius;
          child.position.set(
            Math.cos(angle) * r,
            child.userData.heightOffset + Math.sin(t * 5 + angle) * 0.2,
            Math.sin(angle) * r
          );
          const s = 0.6 + Math.sin(t * 10 + angle * 3) * 0.4;
          child.scale.setScalar(s);
          const emberMat = (child as THREE.Mesh).material;
          if (emberMat instanceof THREE.MeshStandardMaterial) {
            emberMat.opacity = 0.5 + Math.sin(t * 8 + angle) * 0.3;
          }
        } else if (child.name === 'status_fx_fire_flame') {
          const angle = child.userData.flameOffset + t * 1.5;
          const r = child.userData.flameRadius;
          child.position.set(
            Math.cos(angle) * r,
            0.3 + Math.sin(t * 6 + angle * 2) * 0.15,
            Math.sin(angle) * r
          );
          child.scale.y = 0.7 + Math.sin(t * 10 + angle * 4) * 0.4;
          child.scale.x = 0.8 + Math.sin(t * 7 + angle) * 0.2;
          child.rotation.z = Math.sin(t * 4 + angle) * 0.3;
        } else if (child.name === 'status_fx_fire_glow') {
          const glowPulse = 0.08 + Math.sin(t * 5) * 0.06;
          const glowMat = (child as THREE.Mesh).material;
          if (glowMat instanceof THREE.MeshStandardMaterial) {
            glowMat.opacity = glowPulse;
            glowMat.emissiveIntensity = 1.0 + Math.sin(t * 8) * 0.8;
          }
          child.scale.setScalar(0.9 + Math.sin(t * 4) * 0.15);
        }
      });
    }

    // ── FROZEN: Ice crystals, frost overlay, blue-white point light, frozen shell ──
    if (hasFrozen) {
      let iceLight = group.getObjectByName('status_fx_ice_light') as THREE.Object3D | undefined;
      if (!iceLight) {
        iceLight = new THREE.Object3D();
        iceLight.name = 'status_fx_ice_light';
        group.add(iceLight);

        // Ice crystal spikes (5 jutting outward)
        if (!this._crystalGeo) this._crystalGeo = new THREE.OctahedronGeometry(0.11, 1);
        for (let i = 0; i < 5; i++) {
          const crystal = new THREE.Mesh(
            this._crystalGeo,
            new THREE.MeshStandardMaterial({
              color: 0xccefff, emissive: 0x88ccff, emissiveIntensity: 1.5,
              transparent: true, opacity: 0.8, metalness: 0.4, roughness: 0.1,
            })
          );
          crystal.name = 'status_fx_ice_crystal';
          const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.4;
          crystal.userData.crystalAngle = angle;
          crystal.userData.crystalDist = 0.35 + Math.random() * 0.2;
          crystal.userData.crystalHeight = 0.3 + Math.random() * 1.0;
          crystal.scale.set(0.8, 1.8 + Math.random() * 0.8, 0.8);
          crystal.rotation.set(
            (Math.random() - 0.5) * 0.5,
            angle,
            (Math.random() - 0.5) * 0.8
          );
          group.add(crystal);
        }

        // Frost shell overlay (translucent icy sphere around body)
        if (!this._frostShellGeo) this._frostShellGeo = new THREE.IcosahedronGeometry(0.85, 2);
        const frostShell = new THREE.Mesh(
          this._frostShellGeo,
          new THREE.MeshStandardMaterial({
            color: 0xaaddff, emissive: 0x4488cc, emissiveIntensity: 0.8,
            transparent: true, opacity: 0.18, side: THREE.DoubleSide,
            metalness: 0.3, roughness: 0.2,
          })
        );
        frostShell.name = 'status_fx_ice_shell';
        frostShell.position.y = 0.8;
        group.add(frostShell);

        // Floating frost motes (tiny snowflake-like particles)
        if (!this._frostMoteGeo) this._frostMoteGeo = new THREE.SphereGeometry(0.035, 6, 4);
        for (let i = 0; i < 8; i++) {
          const mote = new THREE.Mesh(
            this._frostMoteGeo,
            new THREE.MeshStandardMaterial({
              color: 0xffffff, emissive: 0xaaddff, emissiveIntensity: 2.0,
              transparent: true, opacity: 0.7,
            })
          );
          mote.name = 'status_fx_ice_mote';
          mote.userData.moteAngle = Math.random() * Math.PI * 2;
          mote.userData.moteSpeed = 0.8 + Math.random() * 1.2;
          mote.userData.moteRadius = 0.5 + Math.random() * 0.4;
          mote.userData.moteHeight = 0.2 + Math.random() * 1.5;
          mote.userData.motePhase = Math.random() * Math.PI * 2;
          group.add(mote);
        }

        // Ground frost ring
        if (!this._frostRingGeo) this._frostRingGeo = new THREE.TorusGeometry(0.7, 0.04, 8, 16);
        const frostRing = new THREE.Mesh(
          this._frostRingGeo,
          new THREE.MeshStandardMaterial({
            color: 0xaaddff, emissive: 0x66aadd, emissiveIntensity: 1.5,
            transparent: true, opacity: 0.5,
          })
        );
        frostRing.name = 'status_fx_ice_ring';
        frostRing.rotation.x = -Math.PI / 2;
        frostRing.position.y = 0.05;
        group.add(frostRing);
      }

      // Animate frozen effects
      group.traverse((child) => {
        if (child.name === 'status_fx_ice_crystal') {
          const a = child.userData.crystalAngle;
          const d = child.userData.crystalDist;
          child.position.set(
            Math.cos(a) * d,
            child.userData.crystalHeight,
            Math.sin(a) * d
          );
          // Gentle shimmer
          const crystalMat = (child as THREE.Mesh).material;
          if (crystalMat instanceof THREE.MeshStandardMaterial) {
            crystalMat.emissiveIntensity = 1.2 + Math.sin(t * 4 + a * 3) * 0.5;
          }
        } else if (child.name === 'status_fx_ice_shell') {
          child.rotation.y = t * 0.5;
          child.rotation.x = Math.sin(t * 0.3) * 0.1;
          const shellMat = (child as THREE.Mesh).material;
          if (shellMat instanceof THREE.MeshStandardMaterial) {
            shellMat.opacity = 0.12 + Math.sin(t * 2) * 0.06;
          }
        } else if (child.name === 'status_fx_ice_mote') {
          const angle = child.userData.moteAngle + t * child.userData.moteSpeed;
          const r = child.userData.moteRadius;
          child.position.set(
            Math.cos(angle) * r,
            child.userData.moteHeight + Math.sin(t * 2 + child.userData.motePhase) * 0.15,
            Math.sin(angle) * r
          );
          const moteMat = (child as THREE.Mesh).material;
          if (moteMat instanceof THREE.MeshStandardMaterial) {
            moteMat.opacity = 0.4 + Math.sin(t * 5 + child.userData.motePhase) * 0.3;
          }
        } else if (child.name === 'status_fx_ice_ring') {
          const ringPulse = 0.7 + Math.sin(t * 3) * 0.15;
          child.scale.setScalar(ringPulse);
          const ringMat = (child as THREE.Mesh).material;
          if (ringMat instanceof THREE.MeshStandardMaterial) {
            ringMat.opacity = 0.3 + Math.sin(t * 4) * 0.15;
          }
        }
      });
    }

    // ── SHOCKED: Electric arcs flashing around the unit ──
    if (hasShocked) {
      let sparkLight = group.getObjectByName('status_fx_spark_light') as THREE.Object3D | undefined;
      if (!sparkLight) {
        sparkLight = new THREE.Object3D();
        sparkLight.name = 'status_fx_spark_light';
        group.add(sparkLight);

        // Electric arc segments
        for (let i = 0; i < 4; i++) {
          const arcMat = new THREE.MeshStandardMaterial({
            color: 0xffffff, emissive: 0xffffaa, emissiveIntensity: 4.0,
            transparent: true, opacity: 0.8,
          });
          const arc = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.015, 0.5 + Math.random() * 0.3, 27),
            arcMat
          );
          arc.name = 'status_fx_spark_arc';
          arc.userData.arcIdx = i;
          group.add(arc);
        }
      }

      group.traverse((child) => {
        if (child.name === 'status_fx_spark_arc') {
          child.visible = Math.random() > 0.3;
          const angle = Math.random() * Math.PI * 2;
          child.position.set(
            Math.cos(angle) * 0.3,
            0.3 + Math.random() * 1.2,
            Math.sin(angle) * 0.3
          );
          child.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        }
      });
    }

    // ── POISONED: Dripping green bubbles and toxic mist ──
    if (hasPoisoned) {
      let poisonLight = group.getObjectByName('status_fx_poison_light') as THREE.Object3D | undefined;
      if (!poisonLight) {
        poisonLight = new THREE.Object3D();
        poisonLight.name = 'status_fx_poison_light';
        group.add(poisonLight);

        // Toxic mist sphere
        if (!this._poisonMistGeo) this._poisonMistGeo = new THREE.SphereGeometry(0.7, 8, 6);
        const mist = new THREE.Mesh(
          this._poisonMistGeo,
          new THREE.MeshStandardMaterial({
            color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 0.8,
            transparent: true, opacity: 0.1, side: THREE.DoubleSide,
          })
        );
        mist.name = 'status_fx_poison_mist';
        mist.position.y = 0.7;
        group.add(mist);

        // Rising poison bubbles
        if (!this._poisonBubbleGeo) this._poisonBubbleGeo = new THREE.SphereGeometry(0.055, 6, 4);
        for (let i = 0; i < 4; i++) {
          const bubble = new THREE.Mesh(
            this._poisonBubbleGeo,
            new THREE.MeshStandardMaterial({
              color: 0x66ff44, emissive: 0x44cc22, emissiveIntensity: 2.0,
              transparent: true, opacity: 0.6,
            })
          );
          bubble.name = 'status_fx_poison_bubble';
          bubble.userData.bubblePhase = Math.random() * Math.PI * 2;
          bubble.userData.bubbleX = (Math.random() - 0.5) * 0.6;
          bubble.userData.bubbleZ = (Math.random() - 0.5) * 0.6;
          group.add(bubble);
        }
      }

      group.traverse((child) => {
        if (child.name === 'status_fx_poison_mist') {
          child.scale.setScalar(0.9 + Math.sin(t * 2) * 0.15);
          const mistMat = (child as THREE.Mesh).material;
          if (mistMat instanceof THREE.MeshStandardMaterial) {
            mistMat.opacity = 0.08 + Math.sin(t * 3) * 0.04;
          }
        } else if (child.name === 'status_fx_poison_bubble') {
          const phase = child.userData.bubblePhase;
          const rise = ((t * 0.8 + phase) % 2.0);
          child.position.set(
            child.userData.bubbleX + Math.sin(t * 2 + phase) * 0.05,
            rise * 0.8,
            child.userData.bubbleZ + Math.cos(t * 2 + phase) * 0.05
          );
          const bubbleMat = (child as THREE.Mesh).material;
          if (bubbleMat instanceof THREE.MeshStandardMaterial) {
            bubbleMat.opacity = Math.max(0, 0.6 - rise * 0.3);
          }
        }
      });
    }

    // Clean up status effects that are no longer active
    if (!hasBurning) {
      const fireToRemove: THREE.Object3D[] = [];
      group.traverse((c) => { if (c.name.startsWith('status_fx_fire_')) fireToRemove.push(c); });
      for (const obj of fireToRemove) obj.parent?.remove(obj);
    }
    if (!hasFrozen) {
      const iceToRemove: THREE.Object3D[] = [];
      group.traverse((c) => { if (c.name.startsWith('status_fx_ice_')) iceToRemove.push(c); });
      for (const obj of iceToRemove) obj.parent?.remove(obj);
    }
    if (!hasShocked) {
      const sparkToRemove: THREE.Object3D[] = [];
      group.traverse((c) => { if (c.name.startsWith('status_fx_spark_')) sparkToRemove.push(c); });
      for (const obj of sparkToRemove) obj.parent?.remove(obj);
    }
    if (!hasPoisoned) {
      const poisonToRemove: THREE.Object3D[] = [];
      group.traverse((c) => { if (c.name.startsWith('status_fx_poison_')) poisonToRemove.push(c); });
      for (const obj of poisonToRemove) obj.parent?.remove(obj);
    }
  }

  private _buildFPWeaponIfNeeded(): void {
    if (this._fpWeapon) return;

    this._fpWeapon = new THREE.Group();

    // Sword/weapon handle
    const handleGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.18, 36);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x5a3520, roughness: 0.7 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.09;
    this._fpWeapon.add(handle);

    // Grip wrapping
    const gripGeo = new THREE.TorusGeometry(0.02, 0.004, 17, 27);
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
    const tipGeo = new THREE.ConeGeometry(0.014, 0.04, 17);
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.position.y = 0.33;
    this._fpWeapon.add(tip);

    // Pommel gem
    const gemGeo = new THREE.SphereGeometry(0.01, 23, 23);
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
        this._disposeObject3D(mesh);
        this._scene.remove(mesh);
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
          // Enemy projectile: visuals based on damage type
          const dt = proj.damageType;

          if (dt === DamageType.FIRE) {
            // Fire variant: blazing orb with flame wisps
            const fireCore = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.5, 30, 27),
              new THREE.MeshStandardMaterial({ color: 0xff6622, emissive: 0xff4400, emissiveIntensity: 2.5 })
            );
            group.add(fireCore);
            const fireOuter = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.9, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xcc1100, emissiveIntensity: 0.8, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
            );
            group.add(fireOuter);
            for (let i = 0; i < 5; i++) {
              const wisp = new THREE.Mesh(
                new THREE.ConeGeometry(r * 0.12, r * 0.5, 17),
                new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xffaa22 : 0xff4400, emissive: i % 2 === 0 ? 0xff8800 : 0xcc2200, emissiveIntensity: 2.0, transparent: true, opacity: 0.7 })
              );
              const a = (i / 5) * Math.PI * 2;
              wisp.position.set(Math.cos(a) * r * 0.4, 0, Math.sin(a) * r * 0.4);
              wisp.lookAt(wisp.position.x * 3, wisp.position.y * 3 + 1, wisp.position.z * 3);
              wisp.name = 'enemy_flame';
              group.add(wisp);
            }
            group.userData.skillType = 'ENEMY_FIRE';
          } else if (dt === DamageType.ICE) {
            // Ice variant: frozen shard cluster
            const iceCrystal = new THREE.Mesh(
              new THREE.OctahedronGeometry(r * 0.5, 2),
              new THREE.MeshStandardMaterial({ color: 0xaaddff, emissive: 0x6699ff, emissiveIntensity: 2.0, metalness: 0.3, roughness: 0.1 })
            );
            iceCrystal.scale.set(1, 1.4, 1);
            group.add(iceCrystal);
            const iceAura = new THREE.Mesh(
              new THREE.SphereGeometry(r * 1.0, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x4488cc, emissiveIntensity: 0.4, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
            );
            group.add(iceAura);
            for (let i = 0; i < 4; i++) {
              const shard = new THREE.Mesh(
                new THREE.OctahedronGeometry(r * 0.15, 2),
                new THREE.MeshStandardMaterial({ color: 0xddeeff, emissive: 0x88aaff, emissiveIntensity: 1.5, transparent: true, opacity: 0.8 })
              );
              const sa = (i / 4) * Math.PI * 2;
              shard.position.set(Math.cos(sa) * r * 0.6, (Math.random() - 0.5) * r * 0.4, Math.sin(sa) * r * 0.6);
              shard.rotation.set(Math.random() * Math.PI, 0, Math.random() * Math.PI);
              shard.name = 'enemy_ice_shard';
              group.add(shard);
            }
            group.userData.skillType = 'ENEMY_ICE';
          } else if (dt === DamageType.LIGHTNING) {
            // Lightning variant: crackling electric orb
            const lCore = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.35, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeeeeff, emissiveIntensity: 4.0 })
            );
            group.add(lCore);
            const lShell = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.8, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0x8888ff, emissive: 0x6666ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            group.add(lShell);
            for (let i = 0; i < 4; i++) {
              const spark = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.06, 17, 16),
                new THREE.MeshStandardMaterial({ color: 0xaaaaff, emissive: 0x8888ff, emissiveIntensity: 5.0 })
              );
              const sa = (i / 4) * Math.PI * 2;
              spark.position.set(Math.cos(sa) * r * 0.7, (Math.random() - 0.5) * r * 0.5, Math.sin(sa) * r * 0.7);
              spark.name = 'enemy_spark';
              group.add(spark);
            }
            group.userData.skillType = 'ENEMY_LIGHTNING';
          } else if (dt === DamageType.POISON) {
            // Poison variant: toxic glob with dripping trails
            const pCore = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.55, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0x44cc22, emissive: 0x22aa00, emissiveIntensity: 2.0 })
            );
            group.add(pCore);
            const pOuter = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.85, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0x33aa11, emissive: 0x118800, emissiveIntensity: 0.5, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            group.add(pOuter);
            for (let i = 0; i < 3; i++) {
              const blob = new THREE.Mesh(
                new THREE.SphereGeometry(r * (0.12 + Math.random() * 0.08), 20, 17),
                new THREE.MeshStandardMaterial({ color: 0x88ff44, emissive: 0x66cc22, emissiveIntensity: 1.5, transparent: true, opacity: 0.6 })
              );
              blob.position.set((Math.random() - 0.5) * r * 0.6, -r * 0.3 - Math.random() * r * 0.3, (Math.random() - 0.5) * r * 0.6);
              blob.name = 'enemy_poison_drip';
              group.add(blob);
            }
            group.userData.skillType = 'ENEMY_POISON';
          } else if (dt === DamageType.SHADOW || dt === DamageType.ARCANE) {
            // Shadow/arcane variant: dark swirling vortex
            const sCore = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.4, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0x6622cc, emissive: 0x4411aa, emissiveIntensity: 2.5 })
            );
            group.add(sCore);
            const sVortex = new THREE.Mesh(
              new THREE.TorusGeometry(r * 0.6, r * 0.08, 23, 36),
              new THREE.MeshStandardMaterial({ color: 0x8844dd, emissive: 0x6622bb, emissiveIntensity: 1.8, transparent: true, opacity: 0.6 })
            );
            sVortex.name = 'enemy_vortex_ring';
            group.add(sVortex);
            const sOuter = new THREE.Mesh(
              new THREE.SphereGeometry(r * 1.0, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0x220044, emissive: 0x110022, emissiveIntensity: 0.3, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
            );
            group.add(sOuter);
            for (let i = 0; i < 4; i++) {
              const mote = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.05, 17, 16),
                new THREE.MeshStandardMaterial({ color: 0xbb66ff, emissive: 0x9944dd, emissiveIntensity: 3.0 })
              );
              const ma = (i / 4) * Math.PI * 2;
              mote.position.set(Math.cos(ma) * r * 0.7, 0, Math.sin(ma) * r * 0.7);
              mote.name = 'enemy_shadow_mote';
              group.add(mote);
            }
            group.userData.skillType = 'ENEMY_SHADOW';
          } else {
            // Default red variant: classic red core with spikes and pulsing aura
            const core = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.5, 30, 27),
              new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xcc0000, emissiveIntensity: 2.0 })
            );
            group.add(core);
            const redAura = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.9, 27, 23),
              new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xaa0000, emissiveIntensity: 0.5, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            redAura.name = 'enemy_red_aura';
            group.add(redAura);
            for (let i = 0; i < 4; i++) {
              const spike = new THREE.Mesh(
                new THREE.ConeGeometry(r * 0.12, r * 0.4, 17),
                new THREE.MeshStandardMaterial({ color: 0xaa0000, emissive: 0x880000, emissiveIntensity: 1.5 })
              );
              const angle = (i / 4) * Math.PI * 2;
              spike.position.set(Math.cos(angle) * r * 0.45, 0, Math.sin(angle) * r * 0.45);
              spike.rotation.z = -Math.cos(angle) * Math.PI * 0.4;
              spike.rotation.x = Math.sin(angle) * Math.PI * 0.4;
              spike.name = 'enemy_spike';
              group.add(spike);
            }
            group.userData.skillType = 'ENEMY_RED';
          }
        } else if (proj.skillId) {
          switch (proj.skillId) {
            case SkillId.FIREBALL: {
              // ── FIREBALL — Blazing inferno sphere with layered flames, embers, smoke ──
              // Inner white-hot core
              const hotCore = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.35, 36, 30),
                new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 4.0 })
              );
              group.add(hotCore);
              // Main fire core (orange)
              const fireCore = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.7, 31, 36),
                new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 3.0 })
              );
              group.add(fireCore);
              // Outer heat distortion shell
              const heatShell = new THREE.Mesh(
                new THREE.SphereGeometry(r * 1.5, 36, 30),
                new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff1100, emissiveIntensity: 0.6, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
              );
              group.add(heatShell);
              // Flame tendrils — elongated cones radiating outward
              for (let i = 0; i < 8; i++) {
                const flameLen = r * (0.6 + Math.random() * 0.5);
                const flame = new THREE.Mesh(
                  new THREE.ConeGeometry(r * 0.18, flameLen, 20),
                  new THREE.MeshStandardMaterial({
                    color: i % 3 === 0 ? 0xffcc00 : (i % 3 === 1 ? 0xff6600 : 0xff2200),
                    emissive: i % 3 === 0 ? 0xffaa00 : (i % 3 === 1 ? 0xff4400 : 0xcc0000),
                    emissiveIntensity: 2.5,
                    transparent: true,
                    opacity: 0.8,
                  })
                );
                const a = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
                const elev = (Math.random() - 0.5) * Math.PI * 0.6;
                flame.position.set(
                  Math.cos(a) * Math.cos(elev) * r * 0.5,
                  Math.sin(elev) * r * 0.5,
                  Math.sin(a) * Math.cos(elev) * r * 0.5
                );
                flame.lookAt(flame.position.x * 3, flame.position.y * 3, flame.position.z * 3);
                flame.name = 'flame_tendril';
                group.add(flame);
              }
              // Smoke wisps — dark translucent trailing spheres
              for (let i = 0; i < 4; i++) {
                const smoke = new THREE.Mesh(
                  new THREE.SphereGeometry(r * (0.2 + Math.random() * 0.2), 23, 20),
                  new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x111111, emissiveIntensity: 0.2, transparent: true, opacity: 0.25 })
                );
                smoke.position.set(
                  (Math.random() - 0.5) * r * 0.8,
                  r * 0.4 + Math.random() * r * 0.3,
                  (Math.random() - 0.5) * r * 0.8
                );
                smoke.name = 'smoke_wisp';
                group.add(smoke);
              }
              // Ember particles — tiny bright dots orbiting
              for (let i = 0; i < 6; i++) {
                const ember = new THREE.Mesh(
                  new THREE.SphereGeometry(r * 0.06, 17, 16),
                  new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xffcc00, emissiveIntensity: 4.0 })
                );
                const ea = (i / 6) * Math.PI * 2;
                const ed = r * (1.0 + Math.random() * 0.5);
                ember.position.set(Math.cos(ea) * ed, (Math.random() - 0.5) * r, Math.sin(ea) * ed);
                ember.name = 'ember';
                group.add(ember);
              }
              group.userData.skillType = 'FIREBALL';
              break;
            }
            case SkillId.ICE_NOVA: {
              // ── ICE NOVA — Crystalline shard cluster with frost aura ──
              // Central crystal — elongated octahedron
              const crystal = new THREE.Mesh(
                new THREE.OctahedronGeometry(r * 0.6, 2),
                new THREE.MeshStandardMaterial({
                  color: 0xccefff, emissive: 0x66ccff, emissiveIntensity: 2.0,
                  metalness: 0.3, roughness: 0.1,
                })
              );
              crystal.scale.set(1, 1.6, 1);
              group.add(crystal);
              // Inner glow core
              const iceGlow = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.3, 27, 23),
                new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaeeff, emissiveIntensity: 3.0 })
              );
              group.add(iceGlow);
              // Orbiting ice shards — 6 sharp crystals at various angles
              for (let i = 0; i < 6; i++) {
                const shard = new THREE.Mesh(
                  new THREE.OctahedronGeometry(r * (0.15 + Math.random() * 0.15), 2),
                  new THREE.MeshStandardMaterial({
                    color: 0xddeeff, emissive: 0x88bbff, emissiveIntensity: 1.5,
                    transparent: true, opacity: 0.8, metalness: 0.4, roughness: 0.05,
                  })
                );
                shard.scale.set(0.6, 1.4, 0.6);
                const sa = (i / 6) * Math.PI * 2;
                const sd = r * (0.8 + Math.random() * 0.3);
                shard.position.set(Math.cos(sa) * sd, (Math.random() - 0.5) * r * 0.6, Math.sin(sa) * sd);
                shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                shard.name = 'ice_shard';
                group.add(shard);
              }
              // Frost particle ring — tiny translucent specs
              for (let i = 0; i < 10; i++) {
                const frost = new THREE.Mesh(
                  new THREE.SphereGeometry(r * 0.04, 17, 16),
                  new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xccddff, emissiveIntensity: 2.0, transparent: true, opacity: 0.6 })
                );
                const fa = Math.random() * Math.PI * 2;
                const fd = r * (1.0 + Math.random() * 0.8);
                frost.position.set(Math.cos(fa) * fd, (Math.random() - 0.5) * r * 0.5, Math.sin(fa) * fd);
                frost.name = 'frost_particle';
                group.add(frost);
              }
              // Outer frost aura
              const frostAura = new THREE.Mesh(
                new THREE.SphereGeometry(r * 1.4, 30, 27),
                new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x4488cc, emissiveIntensity: 0.5, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
              );
              group.add(frostAura);
              group.userData.skillType = 'ICE_NOVA';
              break;
            }
            case SkillId.LIGHTNING_BOLT: {
              // ── LIGHTNING BOLT — Actual jagged bolt geometry with bright core and forks ──
              // Bright electric core
              const boltCore = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.35, 27, 23),
                new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeeeeff, emissiveIntensity: 5.0 })
              );
              group.add(boltCore);
              // Build jagged bolt segments extending forward (along X axis)
              const boltLen = r * 4;
              const segments = 10;
              const boltPoints: THREE.Vector3[] = [];
              for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const jx = t * boltLen - boltLen * 0.3;
                const jy = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * r * 1.2;
                const jz = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * r * 1.2;
                boltPoints.push(new THREE.Vector3(jx, jy, jz));
              }
              // Main bolt — bright white/blue tube
              const boltCurve = new THREE.CatmullRomCurve3(boltPoints);
              const boltTubeGeo = new THREE.TubeGeometry(boltCurve, 20, r * 0.12, 6, false);
              const boltTubeMat = new THREE.MeshStandardMaterial({
                color: 0xccddff, emissive: 0xaaccff, emissiveIntensity: 4.0,
              });
              const boltTube = new THREE.Mesh(boltTubeGeo, boltTubeMat);
              boltTube.name = 'bolt_main';
              group.add(boltTube);
              // Outer glow tube (thicker, transparent)
              const glowTubeGeo = new THREE.TubeGeometry(boltCurve, 16, r * 0.35, 6, false);
              const glowTubeMat = new THREE.MeshStandardMaterial({
                color: 0x8888ff, emissive: 0x6666ff, emissiveIntensity: 1.5,
                transparent: true, opacity: 0.25,
              });
              group.add(new THREE.Mesh(glowTubeGeo, glowTubeMat));
              // Fork branches — 2-3 smaller jagged branches splitting off
              for (let b = 0; b < 3; b++) {
                const branchStart = Math.floor(segments * (0.3 + Math.random() * 0.4));
                const startPt = boltPoints[branchStart];
                const forkPts: THREE.Vector3[] = [startPt.clone()];
                const forkLen = r * (1.0 + Math.random() * 1.5);
                const forkSegs = 4;
                const forkDir = new THREE.Vector3(
                  (Math.random() - 0.5) * 2,
                  (Math.random() - 0.5) * 2,
                  (Math.random() - 0.5) * 2
                ).normalize();
                for (let f = 1; f <= forkSegs; f++) {
                  const ft = f / forkSegs;
                  forkPts.push(new THREE.Vector3(
                    startPt.x + forkDir.x * forkLen * ft + (Math.random() - 0.5) * r * 0.5,
                    startPt.y + forkDir.y * forkLen * ft + (Math.random() - 0.5) * r * 0.5,
                    startPt.z + forkDir.z * forkLen * ft + (Math.random() - 0.5) * r * 0.5,
                  ));
                }
                const forkCurve = new THREE.CatmullRomCurve3(forkPts);
                const forkGeo = new THREE.TubeGeometry(forkCurve, 8, r * 0.06, 4, false);
                const forkMat = new THREE.MeshStandardMaterial({
                  color: 0xaabbff, emissive: 0x8899ff, emissiveIntensity: 3.0,
                  transparent: true, opacity: 0.7,
                });
                group.add(new THREE.Mesh(forkGeo, forkMat));
              }
              // Electric sparks at tip and along bolt
              for (let i = 0; i < 8; i++) {
                const spark = new THREE.Mesh(
                  new THREE.SphereGeometry(r * 0.05, 17, 16),
                  new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xddddff, emissiveIntensity: 5.0 })
                );
                const si = Math.floor(Math.random() * boltPoints.length);
                const sp = boltPoints[si];
                spark.position.set(sp.x + (Math.random() - 0.5) * r * 0.5, sp.y + (Math.random() - 0.5) * r * 0.5, sp.z + (Math.random() - 0.5) * r * 0.5);
                spark.name = 'lightning_spark';
                group.add(spark);
              }
              group.userData.skillType = 'LIGHTNING_BOLT';
              break;
            }
            case SkillId.CHAIN_LIGHTNING: {
              // ── CHAIN LIGHTNING — Multiple arcing bolts emanating from a crackling orb ──
              // Central crackling energy orb
              const chainCore = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.4, 30, 27),
                new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xccddff, emissiveIntensity: 5.0 })
              );
              group.add(chainCore);
              // Electric shell
              const chainShell = new THREE.Mesh(
                new THREE.IcosahedronGeometry(r * 0.6, 3),
                new THREE.MeshStandardMaterial({
                  color: 0x88aaff, emissive: 0x6688ff, emissiveIntensity: 2.0,
                  wireframe: true,
                })
              );
              chainShell.name = 'chain_shell';
              group.add(chainShell);
              // Multiple arcing bolt tendrils extending outward (3-5 bolts)
              for (let b = 0; b < 5; b++) {
                const arcLen = r * (2.0 + Math.random() * 2.0);
                const arcSegs = 6;
                const arcDir = new THREE.Vector3(
                  (Math.random() - 0.5) * 2,
                  (Math.random() - 0.5) * 1.5,
                  (Math.random() - 0.5) * 2
                ).normalize();
                const arcPts: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0)];
                for (let s = 1; s <= arcSegs; s++) {
                  const t = s / arcSegs;
                  arcPts.push(new THREE.Vector3(
                    arcDir.x * arcLen * t + (Math.random() - 0.5) * r * 0.8,
                    arcDir.y * arcLen * t + (Math.random() - 0.5) * r * 0.8,
                    arcDir.z * arcLen * t + (Math.random() - 0.5) * r * 0.8,
                  ));
                }
                const arcCurve = new THREE.CatmullRomCurve3(arcPts);
                const arcGeo = new THREE.TubeGeometry(arcCurve, 12, r * 0.07, 5, false);
                const arcMat = new THREE.MeshStandardMaterial({
                  color: b < 2 ? 0xeeeeff : 0xaabbff,
                  emissive: b < 2 ? 0xccddff : 0x8899ee,
                  emissiveIntensity: 3.5,
                  transparent: true, opacity: 0.8,
                });
                const arcMesh = new THREE.Mesh(arcGeo, arcMat);
                arcMesh.name = 'chain_arc';
                group.add(arcMesh);
                // Spark at end of each arc
                const endSpark = new THREE.Mesh(
                  new THREE.SphereGeometry(r * 0.12, 23, 17),
                  new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xbbccff, emissiveIntensity: 4.0 })
                );
                endSpark.position.copy(arcPts[arcPts.length - 1]);
                endSpark.name = 'chain_end_spark';
                group.add(endSpark);
              }
              // Outer crackling field
              const crackleField = new THREE.Mesh(
                new THREE.SphereGeometry(r * 1.8, 27, 23),
                new THREE.MeshStandardMaterial({ color: 0x6688ff, emissive: 0x4466cc, emissiveIntensity: 0.4, transparent: true, opacity: 0.1, side: THREE.DoubleSide })
              );
              group.add(crackleField);
              group.userData.skillType = 'CHAIN_LIGHTNING';
              // Initial chain lightning beam (visible for first 0.3s)
              const beamSegs = 8;
              const beamPts: THREE.Vector3[] = [];
              for (let s = 0; s <= beamSegs; s++) {
                const t = s / beamSegs;
                beamPts.push(new THREE.Vector3(
                  -t * r * 6 + (s > 0 && s < beamSegs ? (Math.random() - 0.5) * r * 1.5 : 0),
                  (Math.random() - 0.5) * r * 0.8,
                  (Math.random() - 0.5) * r * 0.8,
                ));
              }
              const beamCurve = new THREE.CatmullRomCurve3(beamPts);
              const beamGeo = new THREE.TubeGeometry(beamCurve, 16, r * 0.12, 4, false);
              const beamMat = new THREE.MeshStandardMaterial({
                color: 0xeeffff, emissive: 0xaaddff, emissiveIntensity: 6.0,
                transparent: true, opacity: 0.9,
              });
              const beamMesh = new THREE.Mesh(beamGeo, beamMat);
              beamMesh.name = 'chain_beam';
              group.add(beamMesh);
              // Secondary thinner beam
              const beam2Pts: THREE.Vector3[] = [];
              for (let s = 0; s <= beamSegs; s++) {
                const t = s / beamSegs;
                beam2Pts.push(new THREE.Vector3(
                  -t * r * 6 + (s > 0 && s < beamSegs ? (Math.random() - 0.5) * r * 2.0 : 0),
                  (Math.random() - 0.5) * r * 1.0,
                  (Math.random() - 0.5) * r * 1.0,
                ));
              }
              const beam2Curve = new THREE.CatmullRomCurve3(beam2Pts);
              const beam2Geo = new THREE.TubeGeometry(beam2Curve, 16, r * 0.06, 4, false);
              const beam2Mat = new THREE.MeshStandardMaterial({
                color: 0xccddff, emissive: 0x8899ff, emissiveIntensity: 4.0,
                transparent: true, opacity: 0.7,
              });
              const beam2Mesh = new THREE.Mesh(beam2Geo, beam2Mat);
              beam2Mesh.name = 'chain_beam';
              group.add(beam2Mesh);
              break;
            }
            case SkillId.POISON_ARROW: {
              // ── POISON ARROW — Venomous arrow with toxic dripping trail ──
              // Arrow shaft
              const pShaft = new THREE.Mesh(
                new THREE.CylinderGeometry(0.025, 0.025, r * 3.5, 23),
                new THREE.MeshStandardMaterial({ color: 0x5a4a1a, emissive: 0x221100, emissiveIntensity: 0.2 })
              );
              pShaft.rotation.z = Math.PI / 2;
              group.add(pShaft);
              // Poison-coated head — green glowing cone
              const pHead = new THREE.Mesh(
                new THREE.ConeGeometry(r * 0.3, r * 0.5, 17),
                new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22cc22, emissiveIntensity: 2.5, metalness: 0.6, roughness: 0.2 })
              );
              pHead.rotation.z = -Math.PI / 2;
              pHead.position.x = r * 2.0;
              group.add(pHead);
              // Feathered tail
              for (let i = 0; i < 2; i++) {
                const pFeather = new THREE.Mesh(
                  new THREE.BoxGeometry(r * 0.45, r * 0.25, 0.015),
                  new THREE.MeshStandardMaterial({ color: 0xccbb88, emissive: 0x443322, emissiveIntensity: 0.15 })
                );
                pFeather.position.set(-r * 1.5, (i === 0 ? 1 : -1) * r * 0.12, 0);
                pFeather.rotation.z = (i === 0 ? 0.15 : -0.15);
                group.add(pFeather);
              }
              // Dripping poison blobs — trailing below and behind
              for (let i = 0; i < 5; i++) {
                const blob = new THREE.Mesh(
                  new THREE.SphereGeometry(r * (0.06 + Math.random() * 0.08), 20, 17),
                  new THREE.MeshStandardMaterial({
                    color: 0x33dd33, emissive: 0x22aa22, emissiveIntensity: 1.5,
                    transparent: true, opacity: 0.5 + Math.random() * 0.3,
                  })
                );
                blob.position.set(
                  -r * 0.5 - i * r * 0.4,
                  -r * 0.2 - i * r * 0.15,
                  (Math.random() - 0.5) * r * 0.3
                );
                blob.name = 'poison_blob';
                group.add(blob);
              }
              // Toxic mist aura around head
              const toxicMist = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.8, 27, 23),
                new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 0.6, transparent: true, opacity: 0.15 })
              );
              toxicMist.position.x = r * 1.0;
              group.add(toxicMist);
              group.userData.skillType = 'POISON_ARROW';
              break;
            }
            case SkillId.MULTI_SHOT:
            case SkillId.PIERCING_SHOT: {
              // ── MULTI-SHOT / PIERCING SHOT — Sleek arrow with speed lines and impact glow ──
              const isPiercing = proj.skillId === SkillId.PIERCING_SHOT;
              // Arrow shaft — longer, sleeker
              const aShaft = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.025, r * 4, 23),
                new THREE.MeshStandardMaterial({ color: 0x8b6914, emissive: 0x442200, emissiveIntensity: 0.3 })
              );
              aShaft.rotation.z = Math.PI / 2;
              group.add(aShaft);
              // Arrowhead — metallic, sharp
              const aHead = new THREE.Mesh(
                new THREE.ConeGeometry(r * 0.25, r * 0.5, 17),
                new THREE.MeshStandardMaterial({
                  color: isPiercing ? 0xddddff : 0xbbbbbb,
                  emissive: isPiercing ? 0x8888ff : 0x444444,
                  emissiveIntensity: isPiercing ? 1.5 : 0.5,
                  metalness: 0.9, roughness: 0.15,
                })
              );
              aHead.rotation.z = -Math.PI / 2;
              aHead.position.x = r * 2.3;
              group.add(aHead);
              // Feathered tail
              for (let i = 0; i < 3; i++) {
                const aFeather = new THREE.Mesh(
                  new THREE.BoxGeometry(r * 0.35, r * 0.2, 0.01),
                  new THREE.MeshStandardMaterial({ color: i < 2 ? 0xddccaa : 0xcc4444, emissive: 0x332211, emissiveIntensity: 0.1 })
                );
                const featherAngle = ((i - 1) / 2) * Math.PI * 0.25;
                aFeather.position.set(-r * 1.6, Math.sin(featherAngle) * r * 0.15, Math.cos(featherAngle) * r * 0.15);
                group.add(aFeather);
              }
              // Speed lines — thin stretched translucent trails behind
              for (let i = 0; i < 3; i++) {
                const speedLine = new THREE.Mesh(
                  new THREE.BoxGeometry(r * 2.5, 0.008, 0.008),
                  new THREE.MeshStandardMaterial({
                    color: isPiercing ? 0x8888ff : 0xffffff,
                    emissive: isPiercing ? 0x6666cc : 0xaaaaaa,
                    emissiveIntensity: isPiercing ? 2.0 : 0.8,
                    transparent: true, opacity: 0.3,
                  })
                );
                speedLine.position.set(-r * 2.0, (Math.random() - 0.5) * r * 0.4, (Math.random() - 0.5) * r * 0.4);
                speedLine.name = 'speed_line';
                group.add(speedLine);
              }
              if (isPiercing) {
                // Piercing glow at tip
                const pierceGlow = new THREE.Mesh(
                  new THREE.SphereGeometry(r * 0.3, 23, 17),
                  new THREE.MeshStandardMaterial({ color: 0xaaaaff, emissive: 0x8888ff, emissiveIntensity: 2.5, transparent: true, opacity: 0.4 })
                );
                pierceGlow.position.x = r * 2.5;
                group.add(pierceGlow);
              }
              group.userData.skillType = 'ARROW';
              break;
            }
            case SkillId.ARCANE_MISSILES: {
              // ── ARCANE MISSILES — Swirling purple energy with runic ring and star sparkles ──
              // Core arcane orb
              const arcCore = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.5, 30, 27),
                new THREE.MeshStandardMaterial({ color: 0xcc66ff, emissive: 0xaa44ee, emissiveIntensity: 3.0 })
              );
              group.add(arcCore);
              // Inner white flash
              const arcFlash = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.2, 23, 20),
                new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeeddff, emissiveIntensity: 4.0 })
              );
              group.add(arcFlash);
              // Arcane rings — 2 perpendicular tori
              for (let i = 0; i < 2; i++) {
                const arcRing = new THREE.Mesh(
                  new THREE.TorusGeometry(r * 0.75, r * 0.04, 27, 46),
                  new THREE.MeshStandardMaterial({ color: 0xdd88ff, emissive: 0xbb66ee, emissiveIntensity: 2.5 })
                );
                if (i === 0) arcRing.rotation.x = Math.PI / 2;
                else arcRing.rotation.z = Math.PI / 2;
                arcRing.name = 'arcane_ring';
                group.add(arcRing);
              }
              // Orbiting sparkle motes
              for (let i = 0; i < 6; i++) {
                const mote = new THREE.Mesh(
                  new THREE.OctahedronGeometry(r * 0.07, 2),
                  new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeeddff, emissiveIntensity: 3.5 })
                );
                const ma = (i / 6) * Math.PI * 2;
                const md = r * (0.9 + Math.random() * 0.3);
                mote.position.set(Math.cos(ma) * md, Math.sin(ma) * r * 0.4, Math.sin(ma) * md);
                mote.name = 'arcane_mote';
                group.add(mote);
              }
              // Purple trail wisps
              for (let i = 0; i < 3; i++) {
                const trail = new THREE.Mesh(
                  new THREE.SphereGeometry(r * (0.1 + i * 0.05), 20, 17),
                  new THREE.MeshStandardMaterial({ color: 0x8833cc, emissive: 0x6622aa, emissiveIntensity: 1.5, transparent: true, opacity: 0.3 - i * 0.08 })
                );
                trail.position.x = -r * (0.5 + i * 0.6);
                trail.name = 'arcane_trail';
                group.add(trail);
              }
              group.userData.skillType = 'ARCANE_MISSILES';
              break;
            }
            case SkillId.FIRE_VOLLEY: {
              // ── FIRE VOLLEY — Flaming arrow with blazing trail ──
              // Arrow shaft
              const fvShaft = new THREE.Mesh(
                new THREE.CylinderGeometry(0.025, 0.025, r * 3.5, 23),
                new THREE.MeshStandardMaterial({ color: 0x5a3a0a, emissive: 0x331100, emissiveIntensity: 0.3 })
              );
              fvShaft.rotation.z = Math.PI / 2;
              group.add(fvShaft);
              // Fiery arrowhead
              const fvHead = new THREE.Mesh(
                new THREE.ConeGeometry(r * 0.3, r * 0.5, 17),
                new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 3.0 })
              );
              fvHead.rotation.z = -Math.PI / 2;
              fvHead.position.x = r * 2.0;
              group.add(fvHead);
              // Flame wrapping the tip
              for (let i = 0; i < 4; i++) {
                const tipFlame = new THREE.Mesh(
                  new THREE.ConeGeometry(r * 0.15, r * 0.4, 17),
                  new THREE.MeshStandardMaterial({
                    color: i % 2 === 0 ? 0xffaa00 : 0xff4400,
                    emissive: i % 2 === 0 ? 0xff8800 : 0xcc2200,
                    emissiveIntensity: 2.5, transparent: true, opacity: 0.7,
                  })
                );
                const flameA = (i / 4) * Math.PI * 2;
                tipFlame.position.set(r * 1.5, Math.sin(flameA) * r * 0.3, Math.cos(flameA) * r * 0.3);
                tipFlame.lookAt(r * 3, Math.sin(flameA) * r * 0.5, Math.cos(flameA) * r * 0.5);
                tipFlame.name = 'volley_flame';
                group.add(tipFlame);
              }
              // Fire trail — elongated cones behind
              for (let i = 0; i < 4; i++) {
                const fireTrail = new THREE.Mesh(
                  new THREE.ConeGeometry(r * (0.08 + i * 0.03), r * (0.5 + i * 0.15), 20),
                  new THREE.MeshStandardMaterial({
                    color: 0xff4400, emissive: 0xcc2200, emissiveIntensity: 1.5 - i * 0.3,
                    transparent: true, opacity: 0.4 - i * 0.08,
                  })
                );
                fireTrail.rotation.z = Math.PI / 2;
                fireTrail.position.x = -r * (0.8 + i * 0.6);
                fireTrail.name = 'fire_trail';
                group.add(fireTrail);
              }
              group.userData.skillType = 'FIRE_VOLLEY';
              break;
            }
            default: {
              // ── DEFAULT PLAYER PROJECTILE — Glowing energy ball with ring ──
              const defCore = new THREE.Mesh(
                new THREE.SphereGeometry(r * 0.6, 30, 27),
                new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 2.5 })
              );
              group.add(defCore);
              const defGlow = new THREE.Mesh(
                new THREE.SphereGeometry(r * 1.0, 27, 23),
                new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.6, transparent: true, opacity: 0.2 })
              );
              group.add(defGlow);
              const defRing = new THREE.Mesh(
                new THREE.TorusGeometry(r * 0.7, r * 0.04, 23, 44),
                new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffaa00, emissiveIntensity: 1.5 })
              );
              defRing.name = 'default_ring';
              group.add(defRing);
              group.userData.skillType = 'DEFAULT';
              break;
            }
          }
        } else {
          // No skillId, default
          const core = new THREE.Mesh(
            new THREE.SphereGeometry(r * 0.7, 27, 23),
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

      // ── Per-frame projectile animation based on skill type ──
      const st = (mesh as THREE.Group).userData?.skillType;
      const t = this._time;

      if (st === 'FIREBALL') {
        // Flickering rotation, pulsing flames
        mesh.rotation.y += 0.08;
        mesh.rotation.x += 0.04;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'flame_tendril') {
            child.rotation.x += (Math.random() - 0.5) * 0.15;
            child.rotation.z += (Math.random() - 0.5) * 0.15;
            const s = 0.8 + Math.sin(t * 12 + child.position.x * 5) * 0.3;
            child.scale.setScalar(s);
          } else if (child.name === 'smoke_wisp') {
            child.position.y += 0.02;
            child.position.x += (Math.random() - 0.5) * 0.01;
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity - 0.005);
            }
          } else if (child.name === 'ember') {
            const ea = t * 6 + child.position.z * 10;
            const ed = 0.15 + Math.sin(ea) * 0.05;
            child.position.x = Math.cos(ea) * ed * 5;
            child.position.z = Math.sin(ea) * ed * 5;
            child.position.y += Math.sin(t * 8 + child.position.x) * 0.01;
          }
        });
      } else if (st === 'ICE_NOVA') {
        // Slow majestic rotation with orbiting shards
        mesh.rotation.y += 0.03;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'ice_shard') {
            child.rotation.y += 0.02;
            child.rotation.x += 0.01;
          } else if (child.name === 'frost_particle') {
            const fa = t * 3 + child.position.z * 5;
            const fd = child.position.length() || 0.1;
            child.position.x = Math.cos(fa) * fd;
            child.position.z = Math.sin(fa) * fd;
          }
        });
      } else if (st === 'LIGHTNING_BOLT') {
        // Flickering intensity, jittering sparks — the bolt should feel alive
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'lightning_spark') {
            child.position.x += (Math.random() - 0.5) * 0.06;
            child.position.y += (Math.random() - 0.5) * 0.06;
            child.position.z += (Math.random() - 0.5) * 0.06;
            const vis = Math.random() > 0.3;
            child.visible = vis;
          }
        });
        // Subtle bolt flicker
        const flicker = 0.7 + Math.random() * 0.3;
        mesh.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (mat.emissiveIntensity > 2) {
              mat.emissiveIntensity *= flicker;
            }
          }
        });
        // Orient bolt along velocity
        if (proj.vx !== 0 || proj.vz !== 0) {
          mesh.rotation.y = Math.atan2(proj.vx, proj.vz);
        }
      } else if (st === 'CHAIN_LIGHTNING') {
        // Chaotic crackling — shell spins, arcs flicker randomly
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'chain_shell') {
            child.rotation.x += 0.1;
            child.rotation.y += 0.15;
          } else if (child.name === 'chain_arc') {
            child.visible = Math.random() > 0.15; // flicker
          } else if (child.name === 'chain_end_spark') {
            child.visible = Math.random() > 0.2;
            const s = 0.5 + Math.random() * 1.0;
            child.scale.setScalar(s);
          }
        });
        mesh.rotation.y += 0.02;
        // Fade out initial beam
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'chain_beam') {
            if (proj.lifetime < 0.3) {
              child.visible = true;
              if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
                ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.9 * (1 - proj.lifetime / 0.3);
              }
            } else {
              child.visible = false;
            }
          }
        });
      } else if (st === 'POISON_ARROW') {
        // Dripping animation — blobs drift down, orient along velocity
        if (proj.vx !== 0 || proj.vz !== 0) {
          mesh.rotation.y = Math.atan2(proj.vx, proj.vz);
        }
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'poison_blob') {
            child.position.y -= 0.008;
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0.1, ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity - 0.003);
            }
          }
        });
      } else if (st === 'ARROW') {
        // Orient along velocity, speed line shimmer
        if (proj.vx !== 0 || proj.vz !== 0) {
          mesh.rotation.y = Math.atan2(proj.vx, proj.vz);
        }
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'speed_line') {
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.15 + Math.random() * 0.25;
            }
          }
        });
      } else if (st === 'ARCANE_MISSILES') {
        // Rings spin, motes orbit
        mesh.rotation.y += 0.06;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'arcane_ring') {
            child.rotation.z += 0.08;
            child.rotation.x += 0.05;
          } else if (child.name === 'arcane_mote') {
            const ma = t * 5 + child.position.z * 8;
            const md = 0.12;
            child.position.x = Math.cos(ma) * md * 6;
            child.position.z = Math.sin(ma) * md * 6;
            child.position.y = Math.sin(ma * 1.3) * md * 3;
          } else if (child.name === 'arcane_trail') {
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              const op = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
              op.opacity = 0.15 + Math.sin(t * 6) * 0.1;
            }
          }
        });
      } else if (st === 'FIRE_VOLLEY') {
        // Orient along velocity, animate flames
        if (proj.vx !== 0 || proj.vz !== 0) {
          mesh.rotation.y = Math.atan2(proj.vx, proj.vz);
        }
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'volley_flame') {
            const s = 0.7 + Math.sin(t * 15 + child.position.y * 10) * 0.4;
            child.scale.setScalar(s);
          } else if (child.name === 'fire_trail') {
            const s = 0.6 + Math.sin(t * 10 + child.position.x * 5) * 0.3;
            child.scale.y = s;
          }
        });
      } else if (st === 'DEFAULT') {
        mesh.rotation.y += 0.06;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'default_ring') {
            child.rotation.x += 0.04;
            child.rotation.z += 0.06;
          }
        });
      } else if (st === 'ENEMY_FIRE') {
        mesh.rotation.y += 0.06;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'enemy_flame') {
            // Multi-frequency flickering for more realistic fire
            const s = 0.5 + Math.sin(t * 14 + child.position.x * 8) * 0.35
              + Math.sin(t * 22 + child.position.z * 6) * 0.15;
            child.scale.setScalar(s);
            child.scale.y = s * (1.0 + Math.sin(t * 18 + child.position.x * 4) * 0.3);
            child.rotation.x += (Math.random() - 0.5) * 0.15;
            child.rotation.z = Math.sin(t * 8 + child.position.x * 3) * 0.2;
            // Vertical dancing movement
            child.position.y += Math.sin(t * 10 + child.position.x * 5) * 0.003;
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 2.0 + Math.sin(t * 12) * 1.0;
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.5 + Math.sin(t * 15 + child.position.z * 4) * 0.2;
            }
          }
        });
      } else if (st === 'ENEMY_ICE') {
        mesh.rotation.y += 0.025;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'enemy_ice_shard') {
            child.rotation.y += 0.02;
            child.rotation.x += 0.012;
            // Shimmering glow effect
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + Math.sin(t * 5 + child.position.x * 4) * 0.6;
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.6 + Math.sin(t * 3 + child.position.z * 3) * 0.15;
            }
            // Subtle scale breathing
            const crystalPulse = 1.0 + Math.sin(t * 4 + child.position.y * 3) * 0.08;
            child.scale.y = 1.0 * crystalPulse;
          }
        });
      } else if (st === 'ENEMY_LIGHTNING') {
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'enemy_spark') {
            child.position.x += (Math.random() - 0.5) * 0.05;
            child.position.y += (Math.random() - 0.5) * 0.05;
            child.position.z += (Math.random() - 0.5) * 0.05;
            child.visible = Math.random() > 0.25;
          }
        });
        const ef = 0.6 + Math.random() * 0.4;
        mesh.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (m.emissiveIntensity > 3) m.emissiveIntensity *= ef;
          }
        });
      } else if (st === 'ENEMY_POISON') {
        mesh.rotation.y += 0.03;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'enemy_poison_drip') {
            child.position.y -= 0.007;
            // Drips sway as they fall
            child.position.x += Math.sin(t * 6 + child.position.y * 4) * 0.001;
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0.08, ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity - 0.002);
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0 + Math.sin(t * 8) * 0.5;
            }
            // Growing drip size as it falls
            const dripScale = 1.0 + Math.max(0, -child.position.y) * 0.3;
            child.scale.setScalar(Math.min(1.5, dripScale));
          } else if (child.name === 'poison_blob') {
            // Blobs pulse and breathe
            const blobPulse = 1.0 + Math.sin(t * 5 + child.position.x * 4) * 0.15;
            child.scale.setScalar(blobPulse);
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0 + Math.sin(t * 6 + child.position.z * 3) * 0.5;
            }
          }
        });
      } else if (st === 'ENEMY_SHADOW') {
        mesh.rotation.y += 0.04;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'enemy_vortex_ring') {
            child.rotation.x += 0.07;
            child.rotation.z += 0.05;
            // Pulsing scale for vortex rings
            const vortexPulse = 1.0 + Math.sin(t * 6) * 0.12;
            child.scale.setScalar(vortexPulse);
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + Math.sin(t * 4) * 0.3;
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.3 + Math.sin(t * 8) * 0.1;
            }
          } else if (child.name === 'enemy_shadow_mote') {
            // More complex orbital path with varying speed
            const ma = t * 4.5 + child.position.z * 6;
            const md = 0.1;
            const orbitExpand = 1.0 + Math.sin(t * 2) * 0.3;
            child.position.x = Math.cos(ma) * md * 7 * orbitExpand;
            child.position.z = Math.sin(ma) * md * 7 * orbitExpand;
            child.position.y = Math.sin(ma * 1.5) * md * 4;
            // Flickering visibility and glow
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.3 + Math.sin(t * 10 + ma) * 0.2;
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.sin(t * 7 + ma * 2) * 0.4;
            }
          }
        });
      } else if (st === 'ENEMY_RED') {
        mesh.rotation.y += 0.05;
        mesh.traverse((child: THREE.Object3D) => {
          if (child.name === 'enemy_red_aura') {
            if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
              // Multi-layered pulsing: slow breathing + fast flicker
              const slowPulse = Math.sin(t * 3) * 0.06;
              const fastPulse = Math.sin(t * 10) * 0.04;
              const microFlicker = Math.sin(t * 25) * 0.02;
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.18 + slowPulse + fastPulse + microFlicker;
              ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.sin(t * 5) * 0.4;
              // Scale-pulsing glow
              const scaleBreath = 1.0 + Math.sin(t * 2.5) * 0.08;
              child.scale.setScalar(scaleBreath);
            }
          } else if (child.name === 'enemy_spike') {
            child.rotation.y += 0.04;
            // Spikes pulse outward
            const spikeScale = 1.0 + Math.sin(t * 6 + child.position.x * 5) * 0.15;
            child.scale.y = spikeScale;
          }
        });
      } else {
        // Fallback generic rotation
        mesh.rotation.y += 0.05;
        mesh.rotation.x += 0.03;
      }
    }
  }

  private _syncLoot(state: DiabloState): void {
    const currentIds = new Set(state.loot.map((l) => l.id));

    for (const [id, mesh] of this._lootMeshes) {
      if (!currentIds.has(id)) {
        this._disposeObject3D(mesh);
        this._scene.remove(mesh);
        this._lootMeshes.delete(id);
        this._lootSpawnTimes.delete(id);
      }
    }

    for (const loot of state.loot) {
      let mesh = this._lootMeshes.get(loot.id);
      if (!mesh) {
        mesh = this._createLootBeam(loot.item.rarity);
        this._scene.add(mesh);
        this._lootMeshes.set(loot.id, mesh);
        this._lootSpawnTimes.set(loot.id, this._time);
      }

      // Loot drop bounce animation for newly spawned items
      const spawnTime = this._lootSpawnTimes.get(loot.id) || 0;
      const age = this._time - spawnTime;
      const bounceDuration = 0.8;
      let dropOffset = 0;
      let scaleMultiplier = 1.0;

      if (age < bounceDuration) {
        // Pop up from the ground with decaying bounces
        const t = age / bounceDuration;
        const bounce1 = Math.sin(t * Math.PI) * (1.0 - t) * 1.5; // first big bounce
        const bounce2 = Math.sin(t * Math.PI * 3) * (1.0 - t) * 0.3; // smaller secondary bounces
        dropOffset = bounce1 + bounce2;
        // Scale pop: starts small, pops to slightly large, settles to normal
        scaleMultiplier = 0.3 + t * 0.7 + Math.sin(t * Math.PI) * 0.3 * (1.0 - t);
      }

      // Bob up/down and rotate (ongoing after bounce settles)
      const bob = Math.sin(this._time * 2 + loot.x) * 0.2;
      mesh.position.set(loot.x, loot.y + bob + dropOffset, loot.z);
      mesh.rotation.y = this._time * 0.8;
      mesh.scale.setScalar(scaleMultiplier);
    }
  }

  private _syncChests(state: DiabloState): void {
    const currentIds = new Set(state.treasureChests.map((c) => c.id));

    for (const [id, mesh] of this._chestMeshes) {
      if (!currentIds.has(id)) {
        this._disposeObject3D(mesh);
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

    for (const [id, grp] of this._aoeMeshes) {
      if (!currentIds.has(id)) {
        this._disposeObject3D(grp);
        this._scene.remove(grp);
        this._aoeMeshes.delete(id);
      }
    }

    for (const aoe of state.aoeEffects) {
      let grp = this._aoeMeshes.get(aoe.id);

      let color = 0xff4400;
      let innerColor = 0xff8800;
      switch (aoe.damageType) {
        case 'FIRE':    color = 0xff4400; innerColor = 0xffaa00; break;
        case 'ICE':     color = 0x44aaff; innerColor = 0xaaddff; break;
        case 'LIGHTNING': color = 0xffff44; innerColor = 0xffffff; break;
        case 'POISON':  color = 0x44ff44; innerColor = 0x88ff88; break;
        case 'ARCANE':  color = 0xaa44ff; innerColor = 0xdd88ff; break;
        case 'SHADOW':  color = 0x442266; innerColor = 0x6633aa; break;
        case 'HOLY':    color = 0xffdd88; innerColor = 0xffffff; break;
        default:        color = 0xff8844; innerColor = 0xffcc88; break;
      }

      if (!grp) {
        grp = new THREE.Group();

        // Outer glowing ring — thicker and more dramatic
        const ringGeo = new THREE.TorusGeometry(aoe.radius, 0.18, 30, 80);
        const ringMat = new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity: 2.5,
          transparent: true, opacity: 0.85,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.name = 'aoe_ring';
        grp.add(ring);

        // Inner filled disc (subtle ground effect)
        const discGeo = new THREE.CircleGeometry(aoe.radius, 80);
        const discMat = new THREE.MeshStandardMaterial({
          color: innerColor, emissive: color, emissiveIntensity: 1.0,
          transparent: true, opacity: 0.2, side: THREE.DoubleSide,
        });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.rotation.x = -Math.PI / 2;
        disc.position.y = 0.02;
        disc.name = 'aoe_disc';
        grp.add(disc);

        // Secondary pulsing ring (smaller, brighter)
        const innerRingGeo = new THREE.TorusGeometry(aoe.radius * 0.6, 0.08, 27, 62);
        const innerRingMat = new THREE.MeshStandardMaterial({
          color: innerColor, emissive: innerColor, emissiveIntensity: 3.0,
          transparent: true, opacity: 0.6,
        });
        const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
        innerRing.rotation.x = -Math.PI / 2;
        innerRing.position.y = 0.05;
        innerRing.name = 'aoe_inner_ring';
        grp.add(innerRing);

        // Expanding shockwave ring (fast-expanding, fading outer ring)
        const shockGeo = new THREE.TorusGeometry(aoe.radius * 0.3, 0.04, 23, 62);
        const shockMat = new THREE.MeshStandardMaterial({
          color: 0xffffff, emissive: innerColor, emissiveIntensity: 4.0,
          transparent: true, opacity: 0.7,
        });
        const shockRing = new THREE.Mesh(shockGeo, shockMat);
        shockRing.rotation.x = -Math.PI / 2;
        shockRing.position.y = 0.08;
        shockRing.name = 'aoe_shockwave';
        grp.add(shockRing);

        // Vertical energy column at center
        const columnGeo = new THREE.CylinderGeometry(aoe.radius * 0.08, aoe.radius * 0.15, 3.0, 27);
        const columnMat = new THREE.MeshStandardMaterial({
          color: innerColor, emissive: color, emissiveIntensity: 2.5,
          transparent: true, opacity: 0.25,
        });
        const column = new THREE.Mesh(columnGeo, columnMat);
        column.position.y = 1.5;
        column.name = 'aoe_column';
        grp.add(column);

        // Orbiting energy motes around the circumference
        for (let i = 0; i < 6; i++) {
          const mote = new THREE.Mesh(
            new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 20, 17),
            new THREE.MeshStandardMaterial({
              color: innerColor, emissive: color, emissiveIntensity: 3.0,
              transparent: true, opacity: 0.7,
            })
          );
          mote.name = 'aoe_mote';
          mote.userData.moteAngle = (i / 6) * Math.PI * 2;
          mote.userData.moteSpeed = 2.5 + Math.random() * 1.5;
          mote.userData.moteHeight = 0.2 + Math.random() * 0.6;
          grp.add(mote);
        }

        // Type-specific effects
        if (aoe.damageType === 'FIRE') {
          // Rising flame pillars around the ring (more, taller)
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const flameDist = aoe.radius * (0.5 + Math.random() * 0.4);
            const flame = new THREE.Mesh(
              new THREE.ConeGeometry(0.18 + Math.random() * 0.1, 1.0 + Math.random() * 0.8, 20),
              new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 3.0, transparent: true, opacity: 0.7 })
            );
            flame.position.set(Math.cos(angle) * flameDist, 0.5, Math.sin(angle) * flameDist);
            flame.name = 'aoe_flame';
            flame.userData.flameAngle = angle;
            flame.userData.flameDist = flameDist;
            grp.add(flame);
          }
          // Inner fire vortex (swirling embers)
          for (let i = 0; i < 8; i++) {
            const ember = new THREE.Mesh(
              new THREE.SphereGeometry(0.05 + Math.random() * 0.04, 17, 16),
              new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 4.0, transparent: true, opacity: 0.8 })
            );
            ember.name = 'aoe_fire_ember';
            ember.userData.emberAngle = (i / 8) * Math.PI * 2;
            ember.userData.emberDist = aoe.radius * (0.2 + Math.random() * 0.5);
            ember.userData.emberSpeed = 4.0 + Math.random() * 3.0;
            ember.userData.emberHeight = 0.2 + Math.random() * 1.5;
            grp.add(ember);
          }
          // Heat distortion sphere
          const heatSphere = new THREE.Mesh(
            new THREE.SphereGeometry(aoe.radius * 0.8, 30, 27),
            new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8, transparent: true, opacity: 0.06, side: THREE.DoubleSide })
          );
          heatSphere.position.y = 0.5;
          heatSphere.name = 'aoe_heat_sphere';
          grp.add(heatSphere);
        } else if (aoe.damageType === 'ICE') {
          // Ice crystals jutting from ground (more, varied sizes)
          for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
            const crystalSize = 0.12 + Math.random() * 0.15;
            const crystal = new THREE.Mesh(
              new THREE.OctahedronGeometry(crystalSize, 2),
              new THREE.MeshStandardMaterial({ color: 0xccefff, emissive: 0x66ccff, emissiveIntensity: 2.0, transparent: true, opacity: 0.75, metalness: 0.4, roughness: 0.05 })
            );
            crystal.scale.set(0.5, 1.8 + Math.random() * 1.2, 0.5);
            const crystalDist = aoe.radius * (0.3 + Math.random() * 0.5);
            crystal.position.set(Math.cos(angle) * crystalDist, 0.3, Math.sin(angle) * crystalDist);
            crystal.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
            crystal.name = 'aoe_crystal';
            crystal.userData.crystalPhase = Math.random() * Math.PI * 2;
            grp.add(crystal);
          }
          // Frost mist ground layer
          const frostMist = new THREE.Mesh(
            new THREE.CylinderGeometry(aoe.radius * 0.9, aoe.radius, 0.3, 44),
            new THREE.MeshStandardMaterial({ color: 0xaaddff, emissive: 0x4488cc, emissiveIntensity: 0.6, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
          );
          frostMist.position.y = 0.15;
          frostMist.name = 'aoe_frost_mist';
          grp.add(frostMist);
          // Floating ice shards (smaller, spinning)
          for (let i = 0; i < 6; i++) {
            const shard = new THREE.Mesh(
              new THREE.OctahedronGeometry(0.05 + Math.random() * 0.04, 2),
              new THREE.MeshStandardMaterial({ color: 0xeeffff, emissive: 0x88ccff, emissiveIntensity: 2.5, transparent: true, opacity: 0.6 })
            );
            shard.name = 'aoe_ice_shard';
            shard.userData.shardAngle = Math.random() * Math.PI * 2;
            shard.userData.shardDist = aoe.radius * (0.2 + Math.random() * 0.6);
            shard.userData.shardSpeed = 1.5 + Math.random() * 2.0;
            shard.userData.shardHeight = 0.5 + Math.random() * 1.0;
            grp.add(shard);
          }
        } else if (aoe.damageType === 'LIGHTNING') {
          // Electric arcs across the area (more, with varying thickness)
          for (let i = 0; i < 6; i++) {
            const a1 = Math.random() * Math.PI * 2;
            const a2 = a1 + Math.PI * (0.4 + Math.random());
            const r1 = aoe.radius * (0.2 + Math.random() * 0.7);
            const r2 = aoe.radius * (0.2 + Math.random() * 0.7);
            const arcPts: THREE.Vector3[] = [];
            const segs = 6;
            for (let s = 0; s <= segs; s++) {
              const t = s / segs;
              const x = Math.cos(a1) * r1 * (1 - t) + Math.cos(a2) * r2 * t + (Math.random() - 0.5) * 0.4;
              const z = Math.sin(a1) * r1 * (1 - t) + Math.sin(a2) * r2 * t + (Math.random() - 0.5) * 0.4;
              arcPts.push(new THREE.Vector3(x, 0.1 + Math.random() * 0.3, z));
            }
            const arcCurve = new THREE.CatmullRomCurve3(arcPts);
            const arcThickness = 0.02 + Math.random() * 0.03;
            const arcGeo = new THREE.TubeGeometry(arcCurve, 10, arcThickness, 4, false);
            const arcMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffaa, emissiveIntensity: 5.0, transparent: true, opacity: 0.8 });
            const arc = new THREE.Mesh(arcGeo, arcMat);
            arc.name = 'aoe_lightning_arc';
            grp.add(arc);
          }
          // Central lightning strike column
          const strikeGeo = new THREE.CylinderGeometry(0.05, 0.15, 4.0, 23);
          const strikeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffcc, emissiveIntensity: 6.0, transparent: true, opacity: 0.6 });
          const strike = new THREE.Mesh(strikeGeo, strikeMat);
          strike.position.y = 2.0;
          strike.name = 'aoe_lightning_strike';
          grp.add(strike);
          // Spark spheres scattered in the zone
          for (let i = 0; i < 5; i++) {
            const spark = new THREE.Mesh(
              new THREE.SphereGeometry(0.06, 17, 16),
              new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffff44, emissiveIntensity: 5.0, transparent: true, opacity: 0.8 })
            );
            spark.name = 'aoe_spark_mote';
            spark.userData.sparkAngle = Math.random() * Math.PI * 2;
            spark.userData.sparkDist = Math.random() * aoe.radius * 0.8;
            grp.add(spark);
          }
        } else if (aoe.damageType === 'POISON') {
          // Bubbling poison pools (more, varied)
          for (let i = 0; i < 10; i++) {
            const bubble = new THREE.Mesh(
              new THREE.SphereGeometry(0.06 + Math.random() * 0.1, 23, 20),
              new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 1.8, transparent: true, opacity: 0.55 })
            );
            const ba = Math.random() * Math.PI * 2;
            const bd = Math.random() * aoe.radius * 0.8;
            bubble.position.set(Math.cos(ba) * bd, 0.08, Math.sin(ba) * bd);
            bubble.name = 'aoe_bubble';
            bubble.userData.bubblePhase = Math.random() * Math.PI * 2;
            grp.add(bubble);
          }
          // Toxic gas cloud
          const gasCloud = new THREE.Mesh(
            new THREE.SphereGeometry(aoe.radius * 0.6, 27, 23),
            new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 0.5, transparent: true, opacity: 0.08, side: THREE.DoubleSide })
          );
          gasCloud.position.y = 0.4;
          gasCloud.name = 'aoe_gas_cloud';
          grp.add(gasCloud);
        } else if (aoe.damageType === 'ARCANE') {
          // Arcane rune circle on the ground
          const runeRing = new THREE.Mesh(
            new THREE.TorusGeometry(aoe.radius * 0.45, 0.04, 23, 46),
            new THREE.MeshStandardMaterial({ color: 0xdd88ff, emissive: 0xaa44ff, emissiveIntensity: 3.0, transparent: true, opacity: 0.6 })
          );
          runeRing.rotation.x = -Math.PI / 2;
          runeRing.position.y = 0.03;
          runeRing.name = 'aoe_arcane_rune';
          grp.add(runeRing);
          // Arcane orbiting motes
          for (let i = 0; i < 6; i++) {
            const arcaneMote = new THREE.Mesh(
              new THREE.OctahedronGeometry(0.07, 2),
              new THREE.MeshStandardMaterial({ color: 0xdd88ff, emissive: 0xaa44ff, emissiveIntensity: 3.5, transparent: true, opacity: 0.7 })
            );
            arcaneMote.name = 'aoe_arcane_mote';
            arcaneMote.userData.arcMoteAngle = (i / 6) * Math.PI * 2;
            arcaneMote.userData.arcMoteSpeed = 3.0 + Math.random() * 2.0;
            grp.add(arcaneMote);
          }
        }

        // AOE light — brighter, with wider range
        const aoeLight = new THREE.PointLight(color, 3.5, aoe.radius * 4);
        aoeLight.position.y = 1.0;
        aoeLight.name = 'aoe_light';
        grp.add(aoeLight);

        // Secondary color accent light
        const accentLight = new THREE.PointLight(innerColor, 1.5, aoe.radius * 2);
        accentLight.position.y = 0.3;
        accentLight.name = 'aoe_accent_light';
        grp.add(accentLight);

        this._scene.add(grp);
        this._aoeMeshes.set(aoe.id, grp);
      }

      grp.position.set(aoe.x, 0.1, aoe.z);

      // Animate based on timer
      const progress = aoe.timer / aoe.duration;
      const fadeOut = Math.max(0, 1.0 - progress);
      const pulse = 0.85 + Math.sin(this._time * 8) * 0.15;
      const fastPulse = 0.8 + Math.sin(this._time * 14) * 0.2;

      grp.traverse((child: THREE.Object3D) => {
        if (child.name === 'aoe_ring') {
          const ringScale = 0.4 + progress * 0.6;
          child.scale.setScalar(ringScale * pulse);
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.85 * fadeOut);
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 2.0 + Math.sin(this._time * 6) * 1.0;
          }
        } else if (child.name === 'aoe_disc') {
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.2 * fadeOut * pulse);
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8 + Math.sin(this._time * 10) * 0.4;
          }
        } else if (child.name === 'aoe_inner_ring') {
          child.rotation.z = this._time * 3;
          const innerPulse = 0.8 + Math.sin(this._time * 12) * 0.2;
          child.scale.setScalar(innerPulse);
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.6 * fadeOut * pulse);
          }
        } else if (child.name === 'aoe_shockwave') {
          // Expand rapidly at the start, then fade
          const shockProgress = Math.min(1.0, progress * 4.0);
          const shockScale = 0.3 + shockProgress * 3.5;
          child.scale.setScalar(shockScale);
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.7 * (1.0 - shockProgress));
          }
        } else if (child.name === 'aoe_column') {
          const colScale = 0.8 + Math.sin(this._time * 6) * 0.3;
          child.scale.set(colScale, 0.6 + fadeOut * 0.6, colScale);
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.25 * fadeOut);
          }
        } else if (child.name === 'aoe_mote') {
          const angle = child.userData.moteAngle + this._time * child.userData.moteSpeed;
          const r = aoe.radius * 0.85;
          child.position.set(
            Math.cos(angle) * r,
            child.userData.moteHeight + Math.sin(this._time * 4 + angle) * 0.2,
            Math.sin(angle) * r
          );
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.5 + Math.sin(this._time * 8 + angle) * 0.3;
          }
        } else if (child.name === 'aoe_flame') {
          const fScale = 0.5 + Math.sin(this._time * 12 + (child.userData.flameAngle || 0) * 5) * 0.5;
          child.scale.y = fScale * fadeOut;
          child.scale.x = 0.8 + Math.sin(this._time * 8 + (child.userData.flameAngle || 0)) * 0.3;
          child.position.y = 0.3 + Math.sin(this._time * 10 + (child.userData.flameAngle || 0) * 3) * 0.25;
          child.rotation.z = Math.sin(this._time * 5 + (child.userData.flameAngle || 0)) * 0.2;
        } else if (child.name === 'aoe_fire_ember') {
          const angle = child.userData.emberAngle + this._time * child.userData.emberSpeed;
          const r = child.userData.emberDist;
          child.position.set(
            Math.cos(angle) * r,
            child.userData.emberHeight + Math.sin(this._time * 6 + angle) * 0.3,
            Math.sin(angle) * r
          );
          const es = 0.6 + Math.sin(this._time * 10 + angle * 2) * 0.4;
          child.scale.setScalar(es);
        } else if (child.name === 'aoe_heat_sphere') {
          child.scale.setScalar(0.9 + Math.sin(this._time * 4) * 0.15);
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.06 * fadeOut);
          }
        } else if (child.name === 'aoe_crystal') {
          child.rotation.y += 0.015;
          const shimmer = 1.5 + Math.sin(this._time * 5 + (child.userData.crystalPhase || 0)) * 0.8;
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = shimmer;
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.75 * fadeOut);
          }
        } else if (child.name === 'aoe_frost_mist') {
          child.scale.setScalar(0.95 + Math.sin(this._time * 2) * 0.1);
          child.rotation.y = this._time * 0.3;
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.12 * fadeOut);
          }
        } else if (child.name === 'aoe_ice_shard') {
          const angle = child.userData.shardAngle + this._time * child.userData.shardSpeed;
          child.position.set(
            Math.cos(angle) * child.userData.shardDist,
            child.userData.shardHeight + Math.sin(this._time * 3 + angle) * 0.15,
            Math.sin(angle) * child.userData.shardDist
          );
          child.rotation.y += 0.06;
          child.rotation.x += 0.04;
        } else if (child.name === 'aoe_lightning_arc') {
          child.visible = Math.random() > 0.15;
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 3.0 + Math.random() * 4.0;
          }
        } else if (child.name === 'aoe_lightning_strike') {
          child.visible = Math.random() > 0.4;
          child.scale.x = 0.5 + Math.random() * 1.0;
          child.scale.z = 0.5 + Math.random() * 1.0;
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, (0.4 + Math.random() * 0.3) * fadeOut);
          }
        } else if (child.name === 'aoe_spark_mote') {
          child.visible = Math.random() > 0.3;
          child.position.set(
            Math.cos(child.userData.sparkAngle + Math.random() * 0.5) * child.userData.sparkDist,
            0.1 + Math.random() * 0.5,
            Math.sin(child.userData.sparkAngle + Math.random() * 0.5) * child.userData.sparkDist
          );
        } else if (child.name === 'aoe_bubble') {
          const bPhase = child.userData.bubblePhase || 0;
          child.position.y = 0.08 + Math.abs(Math.sin(this._time * 4 + bPhase)) * 0.3;
          const bs = 0.7 + Math.sin(this._time * 6 + bPhase) * 0.4;
          child.scale.setScalar(bs);
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.55 * fadeOut);
          }
        } else if (child.name === 'aoe_gas_cloud') {
          child.scale.setScalar(0.9 + Math.sin(this._time * 2) * 0.2);
          child.rotation.y = this._time * 0.5;
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.08 * fadeOut);
          }
        } else if (child.name === 'aoe_arcane_rune') {
          child.rotation.z = this._time * 1.5;
          const runeScale = 0.9 + Math.sin(this._time * 4) * 0.15;
          child.scale.setScalar(runeScale);
          if ((child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.6 * fadeOut * fastPulse);
          }
        } else if (child.name === 'aoe_arcane_mote') {
          const angle = child.userData.arcMoteAngle + this._time * child.userData.arcMoteSpeed;
          const r = aoe.radius * 0.5;
          child.position.set(
            Math.cos(angle) * r,
            0.5 + Math.sin(this._time * 5 + angle * 2) * 0.3,
            Math.sin(angle) * r
          );
          child.rotation.y += 0.08;
          child.rotation.x += 0.05;
        } else if (child.name === 'aoe_light') {
          (child as THREE.PointLight).intensity = 3.5 * fadeOut * pulse;
        } else if (child.name === 'aoe_accent_light') {
          (child as THREE.PointLight).intensity = 1.5 * fadeOut * fastPulse;
        }
      });
    }
  }

  private _syncFloatingText(state: DiabloState, _dt: number): void {
    const currentIds = new Set(state.floatingTexts.map((f) => f.id));

    for (const [id, sprite] of this._floatTextSprites) {
      if (!currentIds.has(id)) {
        this._scene.remove(sprite);
        if (sprite.material instanceof THREE.SpriteMaterial) {
          if (sprite.material.map) sprite.material.map.dispose();
          sprite.material.dispose();
        }
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
      const isCrit = ft.text.startsWith('CRIT') || (ft.text.startsWith('-') && ft.text.length > 3);
      const isHeal = ft.color === '#44ff44' || ft.color === '#44ffaa';

      // Scale: dramatic pop in with elastic bounce, then shrink
      const baseScale = isCrit ? 4.0 : isHeal ? 2.4 : 2.2;
      let popScale = 1.0;
      if (t < 0.08) {
        popScale = 1.0 + (1.0 - t / 0.08) * 1.2; // big pop
      } else if (t < 0.2) {
        popScale = 1.0 + Math.sin((t - 0.08) / 0.12 * Math.PI) * 0.15; // slight bounce
      }
      const shrink = t > 0.8 ? Math.max(0.2, 1.0 - (t - 0.8) * 1.5) : 1.0;
      const s = baseScale * popScale * shrink;
      // Slight wobble for crits
      const wobble = isCrit ? Math.sin(t * 25) * 0.03 * Math.max(0, 1 - t * 2) : 0;
      sprite.scale.set(s + wobble, (s * 0.3125) + wobble * 0.5, 1);

      // Fade with style
      if (sprite.material instanceof THREE.SpriteMaterial) {
        const fadeStart = isCrit ? 0.6 : 0.5;
        sprite.material.opacity = t < fadeStart ? 1.0 : Math.max(0, 1.0 - (t - fadeStart) * 2.0);
      }
    }
  }

  private _createTextSprite(text: string, color: string): THREE.Sprite {
    const isCrit = text.startsWith('CRIT') || text.startsWith('-') && text.length > 3;
    const isHeal = color === '#44ff44' || color === '#44ffaa';
    const isGold = color === '#ffd700';
    const isSkill = color === '#44ffff' || color === '#ff8844' || color === '#aa44ff';
    const canvas = document.createElement('canvas');
    canvas.width = isCrit ? 512 : 256;
    canvas.height = isCrit ? 160 : 80;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Medieval-style font
    const fontSize = isCrit ? 60 : 30;
    ctx.font = `bold ${fontSize}px 'Cinzel', 'Palatino Linotype', 'Book Antiqua', Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Multi-layer glow for crits
    if (isCrit) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 25;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 7;
      ctx.strokeText(text, cx, cy);
      ctx.fillStyle = color;
      ctx.fillText(text, cx, cy);
      // Second pass for extra glow
      ctx.shadowBlur = 15;
      ctx.fillText(text, cx, cy);
      ctx.shadowBlur = 0;
      // Inner highlight
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.3;
      ctx.fillText(text, cx, cy - 1);
      ctx.globalAlpha = 1.0;
    } else if (isHeal) {
      ctx.shadowColor = '#22ff66';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#003300';
      ctx.lineWidth = 4;
      ctx.strokeText(text, cx, cy);
      ctx.fillStyle = color;
      ctx.fillText(text, cx, cy);
      ctx.shadowBlur = 0;
    } else if (isGold) {
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#332200';
      ctx.lineWidth = 4;
      ctx.strokeText(text, cx, cy);
      const grad = ctx.createLinearGradient(cx - 40, cy - 15, cx + 40, cy + 15);
      grad.addColorStop(0, '#fff7aa');
      grad.addColorStop(0.5, '#ffd700');
      grad.addColorStop(1, '#cc9900');
      ctx.fillStyle = grad;
      ctx.fillText(text, cx, cy);
      ctx.shadowBlur = 0;
    } else if (isSkill) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.strokeText(text, cx, cy);
      ctx.fillStyle = color;
      ctx.fillText(text, cx, cy);
      ctx.shadowBlur = 8;
      ctx.fillText(text, cx, cy);
      ctx.shadowBlur = 0;
    } else {
      // Regular damage numbers — bold with fire-like gradient
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(text, cx, cy);
      const grad = ctx.createLinearGradient(cx, cy - fontSize/2, cx, cy + fontSize/2);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, color);
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
      ctx.fillText(text, cx, cy);
      ctx.shadowBlur = 0;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2, 0.625, 1);
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
  private _buildSunscorchDesert(w: number, d: number): void { buildSunscorchDesert(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  EMERALD GRASSLANDS
  // ────────────────────────────────────────────────────────────────────────
  private _buildEmeraldGrasslands(w: number, d: number): void { buildEmeraldGrasslands(this._mapCtx(), w, d); }

  // ═══════════════════════════════════════════════════════════════════════════
  // WHISPERING MARSH - Swamp / wetland theme
  // ═══════════════════════════════════════════════════════════════════════════
  private _buildWhisperingMarsh(w: number, d: number): void { buildWhisperingMarsh(this._mapCtx(), w, d); }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRYSTAL CAVERNS - Underground crystal cave theme
  // ═══════════════════════════════════════════════════════════════════════════
  private _buildCrystalCaverns(w: number, d: number): void { buildCrystalCaverns(this._mapCtx(), w, d); }

  // ═══════════════════════════════════════════════════════════════════════════
  // FROZEN TUNDRA - Arctic wasteland theme
  // ═══════════════════════════════════════════════════════════════════════════
  private _buildFrozenTundra(w: number, d: number): void { buildFrozenTundra(this._mapCtx(), w, d); }

  // ═══════════════════════════════════════════════════════════════════════════
  // HAUNTED CATHEDRAL - Gothic ruins theme
  // ═══════════════════════════════════════════════════════════════════════════
  private _buildHauntedCathedral(w: number, d: number): void { buildHauntedCathedral(this._mapCtx(), w, d); }

  // ═══════════════════════════════════════════════════════════════════════════
  // THORNWOOD THICKET - Dark twisted forest theme
  // ═══════════════════════════════════════════════════════════════════════════
  private _buildThornwoodThicket(w: number, d: number): void { buildThornwoodThicket(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  CLOCKWORK FOUNDRY
  // ────────────────────────────────────────────────────────────────────────
  private _buildClockworkFoundry(w: number, d: number): void { buildClockworkFoundry(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  CRIMSON CITADEL
  // ────────────────────────────────────────────────────────────────────────
  private _buildCrimsonCitadel(w: number, d: number): void { buildCrimsonCitadel(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  STORMSPIRE PEAK
  // ────────────────────────────────────────────────────────────────────────
  private _buildStormspirePeak(w: number, d: number): void { buildStormspirePeak(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  SHADOW REALM
  // ────────────────────────────────────────────────────────────────────────
  private _buildShadowRealm(w: number, d: number): void { buildShadowRealm(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  PRIMORDIAL ABYSS
  // ────────────────────────────────────────────────────────────────────────
  private _buildPrimordialAbyss(w: number, d: number): void { buildPrimordialAbyss(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  MOONLIT GROVE (Wave 2)
  // ────────────────────────────────────────────────────────────────────────
  private _buildMoonlitGrove(w: number, d: number): void { buildMoonlitGrove(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  CORAL DEPTHS (Wave 2)
  // ────────────────────────────────────────────────────────────────────────
  private _buildCoralDepths(w: number, d: number): void { buildCoralDepths(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  ANCIENT LIBRARY (Wave 2)
  // ────────────────────────────────────────────────────────────────────────
  private _buildAncientLibrary(w: number, d: number): void { buildAncientLibrary(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  JADE TEMPLE (Wave 2)
  // ────────────────────────────────────────────────────────────────────────
  private _buildJadeTemple(w: number, d: number): void { buildJadeTemple(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  ASHEN BATTLEFIELD (Wave 2)
  // ────────────────────────────────────────────────────────────────────────
  private _buildAshenBattlefield(w: number, d: number): void { buildAshenBattlefield(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  FUNGAL DEPTHS (Wave 2)
  // ────────────────────────────────────────────────────────────────────────
  private _buildFungalDepths(w: number, d: number): void { buildFungalDepths(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  OBSIDIAN FORTRESS (Wave 2)
  // ────────────────────────────────────────────────────────────────────────
  private _buildObsidianFortress(w: number, d: number): void { buildObsidianFortress(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  CELESTIAL RUINS (Wave 2)
  // ────────────────────────────────────────────────────────────────────────
  private _buildCelestialRuins(w: number, d: number): void { buildCelestialRuins(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  INFERNAL THRONE (Wave 2)
  // ────────────────────────────────────────────────────────────────────────
  private _buildInfernalThrone(w: number, d: number): void { buildInfernalThrone(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  ASTRAL VOID (Wave 2)
  // ────────────────────────────────────────────────────────────────────────
  private _buildAstralVoid(w: number, d: number): void { buildAstralVoid(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  SHATTERED COLOSSEUM (Wave 3)
  // ────────────────────────────────────────────────────────────────────────
  private _buildShatteredColosseum(w: number, d: number): void { buildShatteredColosseum(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  PETRIFIED GARDEN (Wave 3)
  // ────────────────────────────────────────────────────────────────────────
  private _buildPetrifiedGarden(w: number, d: number): void { buildPetrifiedGarden(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  SUNKEN CITADEL (Wave 3)
  // ────────────────────────────────────────────────────────────────────────
  private _buildSunkenCitadel(w: number, d: number): void { buildSunkenCitadel(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  WYRMSCAR CANYON (Wave 3)
  // ────────────────────────────────────────────────────────────────────────
  private _buildWyrmscarCanyon(w: number, d: number): void { buildWyrmscarCanyon(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  PLAGUEROT SEWERS (Wave 3)
  // ────────────────────────────────────────────────────────────────────────
  private _buildPlaguerotSewers(w: number, d: number): void { buildPlaguerotSewers(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  ETHEREAL SANCTUM (Wave 3)
  // ────────────────────────────────────────────────────────────────────────
  private _buildEtherealSanctum(w: number, d: number): void { buildEtherealSanctum(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  IRON WASTES (Wave 3)
  // ────────────────────────────────────────────────────────────────────────
  private _buildIronWastes(w: number, d: number): void { buildIronWastes(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  BLIGHTED THRONE (Wave 3)
  // ────────────────────────────────────────────────────────────────────────
  private _buildBlightedThrone(w: number, d: number): void { buildBlightedThrone(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  CHRONO LABYRINTH (Wave 3)
  // ────────────────────────────────────────────────────────────────────────
  private _buildChronoLabyrinth(w: number, d: number): void { buildChronoLabyrinth(this._mapCtx(), w, d); }

  // ────────────────────────────────────────────────────────────────────────
  //  ELDRITCH NEXUS (Wave 3)
  // ────────────────────────────────────────────────────────────────────────
  private _buildEldritchNexus(w: number, d: number): void { buildEldritchNexus(this._mapCtx(), w, d); }

  // ════════════════════════════════════════════════════════════════════════
  //  PET RENDERING
  // ════════════════════════════════════════════════════════════════════════

  private _createPetMesh(species: PetSpecies): THREE.Group {
    const group = new THREE.Group();

    switch (species) {
      case PetSpecies.WOLF_PUP: {
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.8 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), bodyMat);
        body.scale.set(1.3, 0.9, 0.9);
        body.position.y = 0.25;
        group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), bodyMat);
        head.position.set(0.22, 0.35, 0);
        group.add(head);
        // Ears
        for (const side of [-1, 1]) {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 8), bodyMat);
          ear.position.set(0.22, 0.48, side * 0.06);
          ear.rotation.z = side * 0.3;
          group.add(ear);
        }
        // Tail
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.01, 0.15, 8), bodyMat);
        tail.position.set(-0.25, 0.3, 0);
        tail.rotation.z = 0.8;
        tail.name = 'pet_tail';
        group.add(tail);
        // Legs
        for (const lx of [0.12, -0.12]) {
          for (const lz of [0.08, -0.08]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8), bodyMat);
            leg.position.set(lx, 0.08, lz);
            group.add(leg);
          }
        }
        break;
      }
      case PetSpecies.FIRE_SPRITE: {
        const fireMat = new THREE.MeshStandardMaterial({
          color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2.0, transparent: true, opacity: 0.8
        });
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), fireMat);
        core.position.y = 0.5;
        group.add(core);
        for (let i = 0; i < 5; i++) {
          const flame = new THREE.Mesh(
            new THREE.ConeGeometry(0.05 + Math.random() * 0.04, 0.2 + Math.random() * 0.15, 8),
            new THREE.MeshStandardMaterial({
              color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 3.0, transparent: true, opacity: 0.6
            })
          );
          const a = (i / 5) * Math.PI * 2;
          flame.position.set(Math.cos(a) * 0.1, 0.5 + Math.random() * 0.1, Math.sin(a) * 0.1);
          flame.name = 'pet_flame';
          group.add(flame);
        }
        const light = new THREE.PointLight(0xff6600, 2, 4);
        light.position.y = 0.5;
        group.add(light);
        break;
      }
      case PetSpecies.SHADOW_HOUND: {
        const shadowMat = new THREE.MeshStandardMaterial({
          color: 0x221133, emissive: 0x330066, emissiveIntensity: 0.5, transparent: true, opacity: 0.85
        });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), shadowMat);
        body.scale.set(1.4, 0.85, 0.85);
        body.position.y = 0.28;
        group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), shadowMat);
        head.position.set(0.25, 0.38, 0);
        group.add(head);
        const eyes = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0xff0044, emissive: 0xff0044, emissiveIntensity: 3.0 }));
        eyes.position.set(0.35, 0.4, 0);
        group.add(eyes);
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.01, 0.2, 8), shadowMat);
        tail.position.set(-0.28, 0.32, 0);
        tail.rotation.z = 0.6;
        tail.name = 'pet_tail';
        group.add(tail);
        break;
      }
      case PetSpecies.STORM_FALCON: {
        const featherMat = new THREE.MeshStandardMaterial({ color: 0x6688aa, roughness: 0.6 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), featherMat);
        body.scale.set(1.2, 0.8, 0.8);
        body.position.y = 0.8;
        group.add(body);
        for (const side of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.3), featherMat);
          wing.position.set(0, 0.82, side * 0.2);
          wing.name = 'pet_wing';
          wing.userData.side = side;
          group.add(wing);
        }
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 8),
          new THREE.MeshStandardMaterial({ color: 0xffcc44 }));
        beak.position.set(0.12, 0.8, 0);
        beak.rotation.z = -Math.PI / 2;
        group.add(beak);
        break;
      }
      case PetSpecies.BONE_MINION: {
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xddd8c8, roughness: 0.7 });
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), boneMat);
        skull.position.y = 0.45;
        group.add(skull);
        const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), boneMat);
        spine.position.y = 0.28;
        group.add(spine);
        for (const side of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.15, 6), boneMat);
          arm.position.set(0, 0.35, side * 0.1);
          arm.rotation.z = side * 0.5;
          group.add(arm);
        }
        const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22ff22, emissiveIntensity: 2.0 }));
        eyeGlow.position.set(0.08, 0.47, 0);
        group.add(eyeGlow);
        break;
      }
      case PetSpecies.TREASURE_IMP: {
        const impMat = new THREE.MeshStandardMaterial({ color: 0xcc8844, roughness: 0.7 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), impMat);
        body.position.y = 0.2;
        group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), impMat);
        head.position.y = 0.38;
        group.add(head);
        // Little sack on back
        const sack = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0x886633 }));
        sack.position.set(-0.08, 0.25, 0);
        sack.scale.set(0.8, 1.0, 0.8);
        group.add(sack);
        // Gold coin glow
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.005, 12),
          new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xffaa00, emissiveIntensity: 1.5, metalness: 0.8 }));
        coin.position.set(0.05, 0.48, 0);
        group.add(coin);
        break;
      }
      case PetSpecies.GOLD_SCARAB: {
        const scarabMat = new THREE.MeshStandardMaterial({ color: 0xccaa22, metalness: 0.6, roughness: 0.3 });
        const shell = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), scarabMat);
        shell.scale.set(1.3, 0.6, 1.0);
        shell.position.y = 0.12;
        group.add(shell);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), scarabMat);
        head.position.set(0.12, 0.12, 0);
        group.add(head);
        break;
      }
      case PetSpecies.MAGPIE_FAMILIAR: {
        const birdMat = new THREE.MeshStandardMaterial({ color: 0x222244 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), birdMat);
        body.scale.set(1.1, 0.8, 0.8);
        body.position.y = 0.7;
        group.add(body);
        for (const side of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.04, 0.2), birdMat);
          wing.position.set(0, 0.72, side * 0.14);
          wing.name = 'pet_wing';
          wing.userData.side = side;
          group.add(wing);
        }
        break;
      }
      case PetSpecies.HEALING_WISP: {
        const wispMat = new THREE.MeshStandardMaterial({
          color: 0x44ff88, emissive: 0x22ff66, emissiveIntensity: 2.5, transparent: true, opacity: 0.7
        });
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), wispMat);
        core.position.y = 0.5;
        group.add(core);
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10),
          new THREE.MeshStandardMaterial({
            color: 0x44ff88, emissive: 0x22ff66, emissiveIntensity: 1.0, transparent: true, opacity: 0.15
          }));
        glow.position.y = 0.5;
        group.add(glow);
        const light = new THREE.PointLight(0x44ff88, 1.5, 3);
        light.position.y = 0.5;
        group.add(light);
        break;
      }
      case PetSpecies.SHIELD_GOLEM: {
        const golemMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.6, metalness: 0.4 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.18), golemMat);
        body.position.y = 0.25;
        group.add(body);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), golemMat);
        head.position.y = 0.45;
        group.add(head);
        const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x4488ff, emissiveIntensity: 2.0 }));
        eyeGlow.position.set(0.05, 0.47, 0);
        group.add(eyeGlow);
        break;
      }
      case PetSpecies.MANA_SPRITE: {
        const manaMat = new THREE.MeshStandardMaterial({
          color: 0x4466ff, emissive: 0x2244cc, emissiveIntensity: 2.0, transparent: true, opacity: 0.75
        });
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), manaMat);
        core.position.y = 0.5;
        group.add(core);
        // Orbiting mana crystals
        for (let i = 0; i < 3; i++) {
          const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0),
            new THREE.MeshStandardMaterial({
              color: 0x6688ff, emissive: 0x4466ff, emissiveIntensity: 3.0, transparent: true, opacity: 0.8
            }));
          crystal.name = 'pet_orbit';
          crystal.userData.orbitAngle = (i / 3) * Math.PI * 2;
          crystal.userData.orbitSpeed = 3.0;
          crystal.userData.orbitRadius = 0.15;
          group.add(crystal);
        }
        const light = new THREE.PointLight(0x4466ff, 1.5, 3);
        light.position.y = 0.5;
        group.add(light);
        break;
      }
      case PetSpecies.LANTERN_FAIRY: {
        const fairyMat = new THREE.MeshStandardMaterial({
          color: 0xffdd88, emissive: 0xffaa44, emissiveIntensity: 2.0, transparent: true, opacity: 0.8
        });
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), fairyMat);
        core.position.y = 0.6;
        group.add(core);
        for (const side of [-1, 1]) {
          const wing = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 8, 6),
            new THREE.MeshStandardMaterial({
              color: 0xffeedd, emissive: 0xffcc88, emissiveIntensity: 1.0, transparent: true, opacity: 0.4
            }));
          wing.scale.set(0.5, 1.0, 1.5);
          wing.position.set(0, 0.62, side * 0.08);
          wing.name = 'pet_wing';
          wing.userData.side = side;
          group.add(wing);
        }
        const light = new THREE.PointLight(0xffdd88, 3, 8);
        light.position.y = 0.6;
        group.add(light);
        break;
      }
      default: {
        // Generic glowing orb fallback
        const mat = new THREE.MeshStandardMaterial({
          color: 0xaaaaff, emissive: 0x6666cc, emissiveIntensity: 1.5, transparent: true, opacity: 0.7
        });
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mat);
        orb.position.y = 0.4;
        group.add(orb);
        break;
      }
    }

    group.scale.setScalar(0.8);
    return group;
  }

  private _syncPets(state: DiabloState, _dt: number): void {
    const activePets = state.player.pets.filter(p => p.isSummoned);
    const currentIds = new Set(activePets.map(p => p.id));

    // Remove meshes for despawned pets (with proper disposal)
    for (const [id, mesh] of this._petMeshes) {
      if (!currentIds.has(id)) {
        this._scene.remove(mesh);
        this._disposeObject3D(mesh);
        this._petMeshes.delete(id);
      }
    }

    for (const pet of activePets) {
      let mesh = this._petMeshes.get(pet.id);
      if (!mesh) {
        mesh = this._createPetMesh(pet.species);
        this._scene.add(mesh);
        this._petMeshes.set(pet.id, mesh);
      }

      mesh.position.set(pet.x, pet.y, pet.z);
      mesh.rotation.y = pet.angle;

      // Animate based on AI state
      const petOffset = pet.id.charCodeAt(0) * 0.7;

      if (pet.aiState === PetAIState.FOLLOWING || pet.aiState === PetAIState.RETURNING) {
        // Gentle bob while following
        mesh.position.y += Math.sin(this._time * 3 + petOffset) * 0.04;
      } else if (pet.aiState === PetAIState.ATTACKING) {
        // Quick forward lean + bob
        mesh.rotation.x = 0.2;
        mesh.position.y += Math.sin(this._time * 8 + petOffset) * 0.03;
      } else if (pet.aiState === PetAIState.COLLECTING_LOOT) {
        // Excited bounce
        mesh.position.y += Math.abs(Math.sin(this._time * 6 + petOffset)) * 0.08;
      }

      // Animate wings for flying pets
      mesh.traverse((child) => {
        if (child.name === 'pet_wing') {
          const side = child.userData.side || 1;
          child.rotation.x = Math.sin(this._time * 8 + petOffset) * 0.6 * side;
        }
        if (child.name === 'pet_tail') {
          child.rotation.y = Math.sin(this._time * 5 + petOffset) * 0.4;
        }
        if (child.name === 'pet_flame') {
          // Use userData for base position to avoid Y drift from +=
          if (child.userData.baseY === undefined) child.userData.baseY = child.position.y;
          child.position.y = child.userData.baseY + Math.sin(this._time * 10 + child.position.x * 10) * 0.04;
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.opacity = 0.4 + Math.sin(this._time * 12 + child.position.z * 10) * 0.3;
        }
        if (child.name === 'pet_orbit') {
          const angle = child.userData.orbitAngle + this._time * child.userData.orbitSpeed;
          const r = child.userData.orbitRadius;
          child.position.set(Math.cos(angle) * r, 0.5 + Math.sin(angle * 2) * 0.05, Math.sin(angle) * r);
        }
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  SKILL CAST VISUAL EFFECTS (3rd person)
  // ════════════════════════════════════════════════════════════════════════

  private _updateCastEffects(state: DiabloState, dt: number): void {
    // Detect new skill cast
    if (state.player.activeSkillAnimTimer > 0 && this._prevActiveSkillTimer <= 0) {
      this._spawnCastEffect(state);
    }
    this._prevActiveSkillTimer = state.player.activeSkillAnimTimer;

    // Animate existing cast effect
    if (this._castEffectGroup && this._castEffectTimer > 0) {
      this._castEffectTimer -= dt;
      const t = Math.max(0, this._castEffectTimer / 0.6); // 1 → 0 over 0.6s
      const expand = 1.0 + (1.0 - t) * 2.0;
      const fade = t;

      this._castEffectGroup.scale.setScalar(expand);
      this._castEffectGroup.rotation.y += dt * 4;
      this._castEffectGroup.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.opacity = fade * 0.7;
        }
      });
      this._castEffectGroup.position.set(state.player.x, state.player.y + 0.1, state.player.z);

      if (this._castEffectTimer <= 0) {
        this._scene.remove(this._castEffectGroup);
        this._disposeObject3D(this._castEffectGroup);
        this._castEffectGroup = null;
      }
    }
  }

  private _spawnCastEffect(state: DiabloState): void {
    // Clean up previous
    if (this._castEffectGroup) {
      this._scene.remove(this._castEffectGroup);
      this._disposeObject3D(this._castEffectGroup);
    }

    const group = new THREE.Group();
    const pClass = state.player.class;

    let color = 0xffffff;
    let emissive = 0x888888;
    switch (pClass) {
      case DiabloClass.WARRIOR: color = 0xff8844; emissive = 0xff4400; break;
      case DiabloClass.MAGE: color = 0x4488ff; emissive = 0x2244cc; break;
      case DiabloClass.RANGER: color = 0x44cc44; emissive = 0x228822; break;
      case DiabloClass.PALADIN: color = 0xffdd88; emissive = 0xffaa44; break;
      case DiabloClass.NECROMANCER: color = 0x44ff44; emissive = 0x006600; break;
      case DiabloClass.ASSASSIN: color = 0x8844cc; emissive = 0x442266; break;
    }

    // Ground ring burst
    const ringGeo = new THREE.TorusGeometry(0.5, 0.06, 12, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color, emissive, emissiveIntensity: 3.0, transparent: true, opacity: 0.7
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);

    // Rising energy wisps
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const wisp = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 6),
        new THREE.MeshStandardMaterial({
          color, emissive, emissiveIntensity: 4.0, transparent: true, opacity: 0.6
        })
      );
      wisp.position.set(Math.cos(angle) * 0.4, 0.2 + i * 0.15, Math.sin(angle) * 0.4);
      group.add(wisp);
    }

    // Central glow column
    const columnGeo = new THREE.CylinderGeometry(0.08, 0.15, 1.5, 12);
    const columnMat = new THREE.MeshStandardMaterial({
      color, emissive, emissiveIntensity: 2.0, transparent: true, opacity: 0.25
    });
    const column = new THREE.Mesh(columnGeo, columnMat);
    column.position.y = 0.75;
    group.add(column);

    group.position.set(state.player.x, state.player.y + 0.1, state.player.z);
    this._scene.add(group);
    this._castEffectGroup = group;
    this._castEffectTimer = 0.6;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  PLAYER STATUS EFFECT VISUALS
  // ════════════════════════════════════════════════════════════════════════

  private _syncPlayerStatusEffects(state: DiabloState): void {
    const effects = state.player.statusEffects;

    if (!this._playerStatusFxGroup) {
      this._playerStatusFxGroup = new THREE.Group();
      this._scene.add(this._playerStatusFxGroup);
    }

    if (effects.length === 0) {
      // Hide all pooled effect groups
      for (const [, grp] of this._playerStatusFxPools) {
        grp.visible = false;
      }
      this._playerActiveEffects.clear();
      return;
    }

    this._playerStatusFxGroup.position.set(state.player.x, state.player.y, state.player.z);

    // Determine which effects are currently active
    const currentEffects = new Set<string>();
    for (const fx of effects) {
      currentEffects.add(fx.effect);
    }

    // Hide pools for effects that are no longer active
    for (const [key, grp] of this._playerStatusFxPools) {
      if (!currentEffects.has(key)) {
        grp.visible = false;
      }
    }

    for (const fx of effects) {
      const key = fx.effect;
      let pool = this._playerStatusFxPools.get(key);

      // Create pool group once per effect type, reuse every frame
      if (!pool) {
        pool = this._buildStatusFxPool(fx.effect);
        this._playerStatusFxGroup.add(pool);
        this._playerStatusFxPools.set(key, pool);
      }

      pool.visible = true;

      // Animate the pooled meshes (position/rotation/opacity only — no allocations)
      this._animateStatusFxPool(pool, fx.effect);
    }

    this._playerActiveEffects = currentEffects;
  }

  /** Build a reusable group of meshes for one status effect type. Created once. */
  private _buildStatusFxPool(effect: StatusEffect): THREE.Group {
    const grp = new THREE.Group();

    switch (effect) {
      case StatusEffect.BURNING: {
        for (let i = 0; i < 4; i++) {
          const flame = new THREE.Mesh(
            new THREE.ConeGeometry(0.08, 0.3, 8),
            new THREE.MeshStandardMaterial({
              color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 3.0,
              transparent: true, opacity: 0.5
            })
          );
          flame.userData.index = i;
          grp.add(flame);
        }
        break;
      }
      case StatusEffect.FROZEN: {
        const iceShell = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.7, 1),
          new THREE.MeshStandardMaterial({
            color: 0x88ccff, emissive: 0x4488cc, emissiveIntensity: 1.0,
            transparent: true, opacity: 0.3
          })
        );
        iceShell.position.y = 0.8;
        grp.add(iceShell);
        break;
      }
      case StatusEffect.SHOCKED: {
        for (let i = 0; i < 3; i++) {
          const bolt = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.6, 0.02),
            new THREE.MeshStandardMaterial({
              color: 0xffff44, emissive: 0xffff00, emissiveIntensity: 4.0,
              transparent: true, opacity: 0.7
            })
          );
          bolt.userData.index = i;
          bolt.userData.seedAngle = (i / 3) * Math.PI * 2;
          grp.add(bolt);
        }
        break;
      }
      case StatusEffect.POISONED: {
        for (let i = 0; i < 5; i++) {
          const cloud = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 8, 6),
            new THREE.MeshStandardMaterial({
              color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 1.5,
              transparent: true, opacity: 0.2
            })
          );
          cloud.userData.index = i;
          grp.add(cloud);
        }
        break;
      }
      case StatusEffect.BLEEDING: {
        for (let i = 0; i < 4; i++) {
          const drop = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 6, 4),
            new THREE.MeshStandardMaterial({
              color: 0xff2222, emissive: 0xaa0000, emissiveIntensity: 1.0,
              transparent: true, opacity: 0.6
            })
          );
          drop.userData.index = i;
          grp.add(drop);
        }
        break;
      }
      case StatusEffect.SLOWED: {
        const slowRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.5, 0.04, 8, 24),
          new THREE.MeshStandardMaterial({
            color: 0x6666ff, emissive: 0x3333aa, emissiveIntensity: 1.0,
            transparent: true, opacity: 0.4
          })
        );
        slowRing.rotation.x = -Math.PI / 2;
        slowRing.position.y = 0.1;
        grp.add(slowRing);
        break;
      }
      case StatusEffect.STUNNED: {
        for (let i = 0; i < 3; i++) {
          const star = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.04, 0),
            new THREE.MeshStandardMaterial({
              color: 0xffff88, emissive: 0xffff44, emissiveIntensity: 2.0
            })
          );
          star.userData.index = i;
          grp.add(star);
        }
        break;
      }
      case StatusEffect.WEAKENED: {
        const aura = new THREE.Mesh(
          new THREE.SphereGeometry(0.8, 12, 10),
          new THREE.MeshStandardMaterial({
            color: 0x444444, emissive: 0x222222, emissiveIntensity: 0.5,
            transparent: true, opacity: 0.2
          })
        );
        aura.position.y = 0.8;
        grp.add(aura);
        break;
      }
    }

    return grp;
  }

  /** Animate pooled status effect meshes — position/rotation/opacity only, zero allocations. */
  private _animateStatusFxPool(pool: THREE.Group, effect: StatusEffect): void {
    const t = this._time;
    const children = pool.children;

    switch (effect) {
      case StatusEffect.BURNING: {
        for (let ci = 0; ci < children.length; ci++) {
          const child = children[ci];
          const i = child.userData.index;
          const angle = (i / 4) * Math.PI * 2 + t * 3;
          child.position.set(
            Math.cos(angle) * 0.6,
            0.3 + Math.sin(t * 5 + i) * 0.2,
            Math.sin(angle) * 0.6
          );
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.opacity = 0.5 + Math.sin(t * 8 + i) * 0.2;
        }
        break;
      }
      case StatusEffect.FROZEN: {
        if (children.length > 0) {
          children[0].rotation.y = t * 0.3;
          const mat = (children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.opacity = 0.3 + Math.sin(t * 2) * 0.1;
        }
        break;
      }
      case StatusEffect.SHOCKED: {
        for (let ci = 0; ci < children.length; ci++) {
          const child = children[ci];
          const i = child.userData.index;
          // Randomized flicker by using sin with high frequency + seed
          const flicker = Math.sin(t * 20 + i * 7.3) > 0.0;
          const a = child.userData.seedAngle + Math.sin(t * 4 + i * 2) * 1.5;
          child.position.set(
            Math.cos(a) * 0.5,
            0.5 + Math.sin(t * 6 + i * 3) * 0.4,
            Math.sin(a) * 0.5
          );
          child.rotation.set(
            Math.sin(t * 3 + i) * 0.8,
            0,
            Math.cos(t * 5 + i * 2) * 1.2
          );
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.opacity = flicker ? 0.7 : 0.0;
        }
        break;
      }
      case StatusEffect.POISONED: {
        for (let ci = 0; ci < children.length; ci++) {
          const child = children[ci];
          const i = child.userData.index;
          const a = (i / 5) * Math.PI * 2 + t * 1.5;
          child.position.set(
            Math.cos(a) * 0.5,
            0.3 + Math.sin(t * 2 + i) * 0.3,
            Math.sin(a) * 0.5
          );
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.opacity = 0.2 + Math.sin(t * 3 + i) * 0.1;
        }
        break;
      }
      case StatusEffect.BLEEDING: {
        for (let ci = 0; ci < children.length; ci++) {
          const child = children[ci];
          const i = child.userData.index;
          const phase = (t * 3 + i * 1.5) % 2.0;
          const a = (i / 4) * Math.PI * 2;
          child.position.set(Math.cos(a) * 0.3, 1.5 - phase * 0.8, Math.sin(a) * 0.3);
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.opacity = 0.6 * (1.0 - phase / 2.0); // fade as drop falls
        }
        break;
      }
      case StatusEffect.SLOWED: {
        if (children.length > 0) {
          const mat = (children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.opacity = 0.4 + Math.sin(t * 2) * 0.1;
          children[0].rotation.z = t * 0.5; // slow rotation
        }
        break;
      }
      case StatusEffect.STUNNED: {
        for (let ci = 0; ci < children.length; ci++) {
          const child = children[ci];
          const i = child.userData.index;
          const a = (i / 3) * Math.PI * 2 + t * 4;
          child.position.set(
            Math.cos(a) * 0.3,
            2.0 + Math.sin(a * 2) * 0.05,
            Math.sin(a) * 0.3
          );
        }
        break;
      }
      case StatusEffect.WEAKENED: {
        if (children.length > 0) {
          const mat = (children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.opacity = 0.2 + Math.sin(t * 2) * 0.08;
        }
        break;
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  DODGE ROLL ANIMATION
  // ════════════════════════════════════════════════════════════════════════

  private _updateDodgeRoll(state: DiabloState, dt: number): void {
    if (state.player.isDodging) {
      if (!this._wasDodging) {
        // Just started dodging — capture roll direction from dodge velocity
        this._dodgeRollAngle = 0;
        this._wasDodging = true;
        // Compute dodge direction from dodge velocity vector
        const dvx = state.player.dodgeVx;
        const dvz = state.player.dodgeVz;
        if (Math.abs(dvx) > 0.01 || Math.abs(dvz) > 0.01) {
          this._dodgeDirection = Math.atan2(dvx, dvz);
        } else {
          this._dodgeDirection = state.player.angle;
        }
      }

      // Roll the player mesh (one full rotation over dodge duration ~0.3s)
      this._dodgeRollAngle += dt * 10;
      const rollAngle = Math.min(this._dodgeRollAngle, Math.PI * 2);
      const rollT = rollAngle / (Math.PI * 2); // 0→1 over the roll

      // Apply roll rotation perpendicular to dodge direction
      const dirSin = Math.sin(this._dodgeDirection);
      const dirCos = Math.cos(this._dodgeDirection);
      this._playerGroup.rotation.x = dirSin * Math.sin(rollAngle) * 1.2;
      this._playerGroup.rotation.z = -dirCos * Math.sin(rollAngle) * 1.2;

      // Squash and stretch — peaks at mid-roll
      const squash = Math.sin(rollAngle);
      this._playerGroup.scale.set(
        1.0 + squash * 0.12,
        1.0 - Math.abs(squash) * 0.18,
        1.0 + squash * 0.12
      );

      // Lower to ground during mid-roll, smooth in/out
      this._playerGroup.position.y -= Math.sin(rollT * Math.PI) * 0.3;

    } else if (this._wasDodging) {
      // Just stopped dodging — explicitly reset all transforms
      this._wasDodging = false;
      this._playerGroup.scale.set(1, 1, 1);
      this._playerGroup.rotation.x = 0;
      this._playerGroup.rotation.z = 0;
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  WATER SURFACE ANIMATION
  // ════════════════════════════════════════════════════════════════════════

  /** Register a water mesh for animation (call from map builders) */
  trackWaterMesh(mesh: THREE.Mesh): void {
    this._waterMeshes.push(mesh);
  }

  private _animateWater(_dt: number): void {
    for (let wi = 0; wi < this._waterMeshes.length; wi++) {
      const water = this._waterMeshes[wi];
      if (!water.parent) {
        // Water mesh was removed from scene — prune it
        this._waterMeshes.splice(wi, 1);
        this._waterOriginalY.delete(water);
        wi--;
        continue;
      }
      const mat = water.material as THREE.MeshStandardMaterial;
      if (!mat) continue;

      // Store original Y on first encounter
      if (!this._waterOriginalY.has(water)) {
        this._waterOriginalY.set(water, water.position.y);
      }
      const baseY = this._waterOriginalY.get(water)!;

      // Subtle opacity ripple
      mat.opacity = 0.45 + Math.sin(this._time * 1.8 + baseY * 3 + wi * 1.7) * 0.08
        + Math.sin(this._time * 2.5 + wi * 2.3) * 0.05;

      // Gentle Y bob from original position (no drift)
      water.position.y = baseY + Math.sin(this._time * 2.0 + wi * 1.3) * 0.02;

      // Emissive shimmer
      if (mat.emissive) {
        const shimmer = Math.sin(this._time * 3 + wi * 2.1) * 0.15 + 0.2;
        mat.emissiveIntensity = shimmer;
      }
    }

    // Animate aquatic map water plane
    if (this._waterMesh) {
      const positions = (this._waterMesh.geometry as THREE.PlaneGeometry).attributes.position;
      if (positions) {
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i);
          const z = positions.getZ(i);
          const y = Math.sin(x * 0.5 + this._time * 2) * 0.15 + Math.cos(z * 0.3 + this._time * 1.5) * 0.1;
          positions.setY(i, y);
        }
        positions.needsUpdate = true;
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BOSS TELEGRAPH VISUALS (ENHANCED)
  // ════════════════════════════════════════════════════════════════════════

  private _syncBossHazards(state: DiabloState, dt: number): void {
    // Boss arena hazard rendering
    for (const enemy of state.enemies) {
      if (!enemy.isBoss || enemy.state === EnemyState.DEAD) continue;

      const phases = BOSS_PHASE_CONFIGS[state.currentMap as keyof typeof BOSS_PHASE_CONFIGS];
      if (!phases) continue;

      const currentPhase = phases.find((ph: any) => enemy.hp / enemy.maxHp <= ph.hpThreshold);
      if (!currentPhase) continue;

      // Fire Wall visualization
      if (currentPhase.abilities.includes(BossAbility.FIRE_WALL)) {
        const key = `firewall-${enemy.id}`;
        let mesh = this._bossEffectMeshes.get(key);
        if (!mesh) {
          const geo = new THREE.TorusGeometry(5, 0.3, 8, 32);
          const mat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.6 });
          mesh = new THREE.Mesh(geo, mat);
          mesh.rotation.x = Math.PI / 2;
          this._scene.add(mesh);
          this._bossEffectMeshes.set(key, mesh);
        }
        mesh.position.set(enemy.x, 1, enemy.z);
        mesh.rotation.z += dt * 0.5; // Rotate
        const scale = 1 + Math.sin(state.time * 2) * 0.2;
        mesh.scale.set(scale, scale, 1);
        mesh.visible = true;
      }

      // Death Beam visualization
      if (currentPhase.abilities.includes(BossAbility.DEATH_BEAM)) {
        const key = `deathbeam-${enemy.id}`;
        let mesh = this._bossEffectMeshes.get(key);
        if (!mesh) {
          const geo = new THREE.CylinderGeometry(0.15, 0.15, 15, 8);
          geo.rotateZ(Math.PI / 2);
          const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7 });
          mesh = new THREE.Mesh(geo, mat);
          this._scene.add(mesh);
          this._bossEffectMeshes.set(key, mesh);
        }
        // Position beam from boss toward player
        const p = state.player;
        const dx = p.x - enemy.x;
        const dz = p.z - enemy.z;
        const beamAngle = Math.atan2(dx, dz);
        mesh.position.set(
          enemy.x + dx * 0.5,
          1.5,
          enemy.z + dz * 0.5
        );
        mesh.rotation.y = beamAngle;
        const dist = Math.sqrt(dx * dx + dz * dz);
        mesh.scale.set(1, 1, dist / 15);
        mesh.visible = true;
      }
    }

    // Clean up boss effect meshes for dead bosses
    for (const [key, mesh] of this._bossEffectMeshes) {
      const enemyId = key.split('-').slice(1).join('-');
      const enemy = state.enemies.find(e => e.id === enemyId);
      if (!enemy || enemy.state === EnemyState.DEAD) {
        this._disposeObject3D(mesh);
        this._scene.remove(mesh);
        this._bossEffectMeshes.delete(key);
      }
    }
  }

  private _syncBossTelegraphs(state: DiabloState): void {
    for (const enemy of state.enemies) {
      if (!enemy.isBoss) continue;
      if (enemy.state === 'DEAD' || enemy.state === 'DYING') continue;
      const key = `telegraph_${enemy.id}`;

      if (enemy.state === 'ATTACK' && enemy.attackTimer < 1.0) {
        let tGroup = this._bossWarningRings.get(key);
        if (!tGroup) {
          tGroup = new THREE.Group();

          // Outer warning ring
          const outerGeo = new THREE.RingGeometry(0.5, enemy.attackRange * 1.2, 48);
          outerGeo.rotateX(-Math.PI / 2);
          const outerMat = new THREE.MeshBasicMaterial({
            color: 0xff0000, transparent: true, opacity: 0.3, side: THREE.DoubleSide
          });
          const outerRing = new THREE.Mesh(outerGeo, outerMat);
          outerRing.name = 'telegraph_outer';
          tGroup.add(outerRing);

          // Inner filling disc that grows as attack charges
          const innerGeo = new THREE.CircleGeometry(enemy.attackRange * 1.2, 48);
          innerGeo.rotateX(-Math.PI / 2);
          const innerMat = new THREE.MeshBasicMaterial({
            color: 0xff2200, transparent: true, opacity: 0.1, side: THREE.DoubleSide
          });
          const innerDisc = new THREE.Mesh(innerGeo, innerMat);
          innerDisc.position.y = 0.01;
          innerDisc.name = 'telegraph_inner';
          tGroup.add(innerDisc);

          // Pulsing danger border
          const borderGeo = new THREE.TorusGeometry(enemy.attackRange * 1.2, 0.08, 8, 48);
          borderGeo.rotateX(-Math.PI / 2);
          const borderMat = new THREE.MeshStandardMaterial({
            color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 2.0,
            transparent: true, opacity: 0.6
          });
          const border = new THREE.Mesh(borderGeo, borderMat);
          border.position.y = 0.02;
          border.name = 'telegraph_border';
          tGroup.add(border);

          // Directional arrow (shows attack direction)
          const arrowGeo = new THREE.ConeGeometry(0.3, 0.8, 8);
          arrowGeo.rotateX(-Math.PI / 2);
          const arrowMat = new THREE.MeshStandardMaterial({
            color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2.0,
            transparent: true, opacity: 0.5
          });
          const arrow = new THREE.Mesh(arrowGeo, arrowMat);
          arrow.position.y = 0.1;
          arrow.name = 'telegraph_arrow';
          tGroup.add(arrow);

          this._scene.add(tGroup);
          this._bossWarningRings.set(key, tGroup);
        }

        tGroup.position.set(enemy.x, enemy.y + 0.05, enemy.z);
        tGroup.visible = true;

        // Animate: pulse opacity, grow inner fill, rotate border
        const chargeT = 1.0 - enemy.attackTimer; // 0→1 as attack charges
        const pulse = 0.3 + Math.sin(this._time * 8) * 0.15;

        tGroup.traverse((child) => {
          if (child.name === 'telegraph_outer') {
            ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = pulse;
          }
          if (child.name === 'telegraph_inner') {
            ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = chargeT * 0.2;
            child.scale.setScalar(chargeT);
          }
          if (child.name === 'telegraph_border') {
            child.rotation.y = this._time * 2;
            const borderMat2 = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
            borderMat2.emissiveIntensity = 2.0 + Math.sin(this._time * 10) * 1.0;
          }
          if (child.name === 'telegraph_arrow') {
            // Point arrow toward player
            const dx = state.player.x - enemy.x;
            const dz = state.player.z - enemy.z;
            child.rotation.y = Math.atan2(dx, dz);
            child.position.x = Math.sin(child.rotation.y) * enemy.attackRange * 0.5;
            child.position.z = Math.cos(child.rotation.y) * enemy.attackRange * 0.5;
            ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.3 + chargeT * 0.4;
          }
        });

      } else {
        const tGroup = this._bossWarningRings.get(key);
        if (tGroup) tGroup.visible = false;
      }
    }

    // Clean up boss warning rings for removed enemies
    for (const [key, grp] of this._bossWarningRings) {
      const id = key.replace('telegraph_', '');
      const enemy = state.enemies.find(e => e.id === id);
      if (!enemy || enemy.state === 'DEAD' || enemy.state === 'DYING') {
        this._scene.remove(grp);
        this._disposeObject3D(grp);
        this._bossWarningRings.delete(key);
      }
    }
  }

  dispose(): void {
    if (this._fadeEl && this._fadeEl.parentElement) {
      this._fadeEl.parentElement.removeChild(this._fadeEl);
      this._fadeEl = null;
    }
    if (this._vignetteEl && this._vignetteEl.parentElement) {
      this._vignetteEl.parentElement.removeChild(this._vignetteEl);
      this._vignetteEl = null;
    }
    if (this._skillFlashEl && this._skillFlashEl.parentElement) {
      this._skillFlashEl.parentElement.removeChild(this._skillFlashEl);
      this._skillFlashEl = null;
    }
    if (this._castOverlay) {
      this._castOverlay.remove();
      this._castOverlay = null;
    }

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
      if (this._weaponMesh.material) {
        if (Array.isArray(this._weaponMesh.material)) {
          for (const mat of this._weaponMesh.material) mat.dispose();
        } else {
          (this._weaponMesh.material as THREE.Material).dispose();
        }
      }
    }
    this._weaponMesh = null;
    if (this._fpWeapon) {
      this._disposeObject3D(this._fpWeapon);
      this._camera.remove(this._fpWeapon);
      this._fpWeapon = null;
    }
    for (const [, mesh] of this._enemyMeshes) {
      this._disposeObject3D(mesh);
      this._scene.remove(mesh);
    }
    this._enemyMeshes.clear();
    this._enemyFlashTimers.clear();
    for (const [, sprite] of this._enemyHpBars) {
      if (sprite.material instanceof THREE.SpriteMaterial && sprite.material.map) {
        sprite.material.map.dispose();
      }
      sprite.material.dispose();
      this._scene.remove(sprite);
    }
    this._enemyHpBars.clear();
    for (const [, mesh] of this._projectileMeshes) {
      this._disposeObject3D(mesh);
      this._scene.remove(mesh);
    }
    this._projectileMeshes.clear();
    for (const [, mesh] of this._lootMeshes) {
      this._disposeObject3D(mesh);
      this._scene.remove(mesh);
    }
    this._lootMeshes.clear();
    for (const [, mesh] of this._chestMeshes) {
      this._disposeObject3D(mesh);
      this._scene.remove(mesh);
    }
    this._chestMeshes.clear();
    for (const [, grp] of this._aoeMeshes) {
      this._disposeObject3D(grp);
      this._scene.remove(grp);
    }
    this._aoeMeshes.clear();
    for (const [, sprite] of this._floatTextSprites) {
      this._scene.remove(sprite);
      if (sprite.material instanceof THREE.SpriteMaterial) {
        if (sprite.material.map) sprite.material.map.dispose();
        sprite.material.dispose();
      }
    }
    this._floatTextSprites.clear();
    for (const [, mesh] of this._vendorMeshes) {
      this._disposeObject3D(mesh);
      this._scene.remove(mesh);
    }
    this._vendorMeshes.clear();

    for (const [, mesh] of this._townfolkMeshes) {
      this._disposeObject3D(mesh);
      this._scene.remove(mesh);
    }
    this._townfolkMeshes.clear();

    for (const [, mesh] of this._shieldMeshes) {
      this._disposeObject3D(mesh);
      this._scene.remove(mesh);
    }
    this._shieldMeshes.clear();

    for (const [, beam] of this._healBeams) {
      this._disposeObject3D(beam);
      this._scene.remove(beam);
    }
    this._healBeams.clear();

    for (const [, mesh] of this._bossEffectMeshes) {
      this._disposeObject3D(mesh);
      this._scene.remove(mesh);
    }
    this._bossEffectMeshes.clear();

    for (const [, mesh] of this._remotePlayerMeshes) {
      this._disposeObject3D(mesh);
      this._scene.remove(mesh);
    }
    this._remotePlayerMeshes.clear();

    for (const [, mesh] of this._petMeshes) {
      this._scene.remove(mesh);
      this._disposeObject3D(mesh);
    }
    this._petMeshes.clear();

    this._dyingAnims.clear();
    this._lootSpawnTimes.clear();
    this._waterMeshes = [];
    this._waterOriginalY.clear();
    if (this._waterMesh) {
      this._disposeObject3D(this._waterMesh);
      this._scene.remove(this._waterMesh);
      this._waterMesh = null;
    }

    if (this._castEffectGroup) {
      this._scene.remove(this._castEffectGroup);
      this._disposeObject3D(this._castEffectGroup);
      this._castEffectGroup = null;
    }
    if (this._playerStatusFxGroup) {
      this._scene.remove(this._playerStatusFxGroup);
      this._disposeObject3D(this._playerStatusFxGroup);
      this._playerStatusFxGroup = null;
    }
    for (const [, grp] of this._playerStatusFxPools) {
      this._disposeObject3D(grp);
    }
    this._playerStatusFxPools.clear();
    this._playerActiveEffects.clear();

    for (const [, grp] of this._bossWarningRings) {
      this._disposeObject3D(grp);
      this._scene.remove(grp);
    }
    this._bossWarningRings.clear();

    for (const mesh of this._particleMeshPool) {
      this._scene.remove(mesh);
      (mesh.material as THREE.MeshStandardMaterial).dispose();
    }
    if (this._sharedParticleGeo) {
      this._sharedParticleGeo.dispose();
      this._sharedParticleGeo = null;
    }
    this._particleMeshPool = [];

    for (const fp of this._footprints) {
      this._scene.remove(fp);
      if (fp.material) (fp.material as THREE.Material).dispose();
    }
    this._footprints = [];
    this._footprintTimers = [];
    if (this._footprintGeo) {
      this._footprintGeo.dispose();
      this._footprintGeo = null;
    }
    if (this._footprintMat) {
      this._footprintMat.dispose();
      this._footprintMat = null;
    }

    for (const g of this._dodgeGhosts) {
      this._disposeObject3D(g.mesh);
      this._scene.remove(g.mesh);
    }
    this._dodgeGhosts = [];

    if (this._bloomComposer) {
      this._bloomComposer.renderTarget1.dispose();
      this._bloomComposer.renderTarget2.dispose();
      this._bloomComposer = null;
    }

    this._renderer.dispose();
  }

  resize(w: number, h: number): void {
    this._renderer.setSize(w, h);
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    if (this._bloomComposer) {
      this._bloomComposer.setSize(w, h);
    }
  }

  applyTimeOfDay(tod: TimeOfDay, mapId: DiabloMapId): void {
    const ctx: TimeOfDayContext = {
      dirLight: this._dirLight,
      ambientLight: this._ambientLight,
      hemiLight: this._hemiLight,
      groundPlane: this._groundPlane,
      scene: this._scene,
      renderer: this._renderer,
      skyDome: this._skyDome,
    };
    applyTimeOfDayImpl(ctx, tod, mapId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CITY RUINS — A shattered city of crumbling buildings and rubble alleyways
  // ═══════════════════════════════════════════════════════════════════════════
  private _buildCityRuins(w: number, d: number): void { buildCityRuins(this._mapCtx(), w, d); }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CITY OF THORNWALL — A walled city with buildings, alleys, and markets
  // ═══════════════════════════════════════════════════════════════════════════
  private _buildCity(w: number, d: number): void { buildCity(this._mapCtx(), w, d); }

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

  private _getClassColor(cls: string): number {
    switch (cls) {
      case 'WARRIOR': return 0xcc4444;
      case 'MAGE': return 0x4444cc;
      case 'RANGER': return 0x44cc44;
      case 'PALADIN': return 0xcccc44;
      case 'NECROMANCER': return 0x884488;
      case 'ASSASSIN': return 0x444444;
      default: return 0x888888;
    }
  }

  renderDungeonLayout(layout: DungeonLayout | null): void {
    // Remove old dungeon
    if (this._dungeonGroup) {
      this._scene.remove(this._dungeonGroup);
      this._dungeonGroup = null;
    }
    if (!layout) return;

    this._dungeonGroup = new THREE.Group();

    // Render room floors as slightly raised/colored planes
    for (const room of layout.rooms) {
      const floorGeo = new THREE.PlaneGeometry(room.width, room.height);
      let floorColor = 0x333333;
      if (room.type === 'start') floorColor = 0x334433;
      else if (room.type === 'boss') floorColor = 0x443333;
      else if (room.type === 'treasure') floorColor = 0x443322;
      else if (room.type === 'secret') floorColor = 0x333344;

      const floorMat = new THREE.MeshLambertMaterial({ color: floorColor, transparent: true, opacity: 0.5 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(room.x + room.width / 2, 0.05, room.z + room.height / 2);
      this._dungeonGroup.add(floor);
    }

    // Render corridors as floor strips
    const corridorMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.5 });
    for (const corridor of layout.corridors) {
      const dx = Math.abs(corridor.x2 - corridor.x1);
      const dz = Math.abs(corridor.z2 - corridor.z1);
      const cx = (corridor.x1 + corridor.x2) / 2;
      const cz = (corridor.z1 + corridor.z2) / 2;
      const cw = Math.max(corridor.width, dx);
      const ch = Math.max(corridor.width, dz);

      const corrGeo = new THREE.PlaneGeometry(cw, ch);
      const corrFloor = new THREE.Mesh(corrGeo, corridorMat);
      corrFloor.rotation.x = -Math.PI / 2;
      corrFloor.position.set(cx, 0.04, cz);
      this._dungeonGroup.add(corrFloor);
    }

    // Render hazards as colored circles on the ground
    for (const hazard of layout.hazards) {
      let hazardColor = 0xff4400;
      if (hazard.type === 'poison') hazardColor = 0x44ff00;
      else if (hazard.type === 'ice') hazardColor = 0x4488ff;
      else if (hazard.type === 'spikes') hazardColor = 0x888888;

      const hazardGeo = new THREE.CircleGeometry(hazard.radius, 16);
      const hazardMat = new THREE.MeshLambertMaterial({ color: hazardColor, transparent: true, opacity: 0.4 });
      const hazardMesh = new THREE.Mesh(hazardGeo, hazardMat);
      hazardMesh.rotation.x = -Math.PI / 2;
      hazardMesh.position.set(hazard.x, 0.06, hazard.z);
      this._dungeonGroup.add(hazardMesh);
    }

    this._scene.add(this._dungeonGroup);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  TELEGRAPH SYSTEM FOR BOSS AOE
  // ════════════════════════════════════════════════════════════════════════

  showTelegraph(id: string, x: number, z: number, radius: number, color: number = 0xff0000, duration: number = 1.5): void {
    let mesh = this._telegraphMeshes.get(id);
    if (!mesh) {
      const geo = new THREE.RingGeometry(radius - 0.1, radius, 32);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      this._scene.add(mesh);
      this._telegraphMeshes.set(id, mesh);
    }
    mesh.position.set(x, 0.1, z);
    mesh.visible = true;
    // Store removal timer on the mesh userData
    (mesh as any)._telegraphTimer = duration;
  }

  removeTelegraph(id: string): void {
    const mesh = this._telegraphMeshes.get(id);
    if (mesh) {
      this._scene.remove(mesh);
      if ((mesh as any).geometry) (mesh as any).geometry.dispose();
      if ((mesh as any).material) (mesh as any).material.dispose();
      this._telegraphMeshes.delete(id);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  CAST EFFECT OVERLAY
  // ════════════════════════════════════════════════════════════════════════

  private _castOverlay: HTMLDivElement | null = null;

  showCastOverlay(damageType: string, duration: number = 0.3): void {
    if (this._castOverlay) {
      this._castOverlay.remove();
    }

    const colors: Record<string, string> = {
      FIRE: 'rgba(255,100,0,0.15)',
      ICE: 'rgba(100,180,255,0.15)',
      LIGHTNING: 'rgba(200,200,50,0.15)',
      POISON: 'rgba(100,255,50,0.15)',
      ARCANE: 'rgba(170,100,255,0.15)',
      SHADOW: 'rgba(80,0,120,0.15)',
      HOLY: 'rgba(255,255,200,0.15)',
      PHYSICAL: 'rgba(200,200,200,0.08)',
    };

    const color = colors[damageType] || colors.PHYSICAL;

    this._castOverlay = document.createElement('div');
    this._castOverlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;box-shadow:inset 0 0 80px ${color};transition:opacity ${duration}s;opacity:1;`;
    document.body.appendChild(this._castOverlay);

    setTimeout(() => {
      if (this._castOverlay) {
        this._castOverlay.style.opacity = '0';
        setTimeout(() => {
          this._castOverlay?.remove();
          this._castOverlay = null;
        }, duration * 1000);
      }
    }, 50);
  }

  fadeOverlay(opacity: number): void {
    if (!this._fadeEl) {
      this._fadeEl = document.createElement('div');
      this._fadeEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#000;pointer-events:none;transition:opacity 0.3s ease;z-index:9999;opacity:0;';
      document.body.appendChild(this._fadeEl);
    }
    this._fadeEl.style.opacity = String(opacity);
  }

  /**
   * Destroy small environmental props near an AOE impact point.
   * Targets flowers, barrels, crates, bushes, mushrooms, and other small objects.
   * Leaves trees, buildings, and large structures intact.
   */
  destroyNearbyProps(x: number, z: number, radius: number): void {
    if (!this._envGroup) return;

    const maxBoundingSize = 1.2; // Only destroy objects with bounding sphere radius below this
    const duration = 0.5;
    const knockDistance = 0.8;

    const toRemove: THREE.Object3D[] = [];

    for (const child of this._envGroup.children) {
      // Skip if already being destroyed
      if (this._destroyingProps.some(d => d.obj === child)) continue;

      // Check distance from AOE center (xz plane)
      const dx = child.position.x - x;
      const dz = child.position.z - z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > radius) continue;

      // Compute bounding sphere to filter by size - only destroy small props
      const box = new THREE.Box3().setFromObject(child);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      // Skip large objects (trees, buildings, large rocks, carts, bridges, etc.)
      if (maxDim > maxBoundingSize) continue;

      // Skip ground plane, water, or very flat objects that are likely terrain
      if (size.y < 0.02) continue;

      // Compute knockback direction (away from AOE center)
      const len = dist > 0.01 ? dist : 0.01;
      const knockX = dx / len;
      const knockZ = dz / len;

      toRemove.push(child);
      this._destroyingProps.push({
        obj: child,
        timer: 0,
        duration,
        knockX,
        knockZ,
        knockSpeed: knockDistance * (1 - dist / radius + 0.3),
        originalScale: child.scale.clone(),
      });
    }
  }

  /** Tick destruction animations: knockback + shrink + fade, then remove from scene. */
  private _updateDestroyingProps(dt: number): void {
    if (this._destroyingProps.length === 0) return;

    for (let i = this._destroyingProps.length - 1; i >= 0; i--) {
      const d = this._destroyingProps[i];
      d.timer += dt;
      const t = Math.min(d.timer / d.duration, 1);

      // Knockback (decelerating)
      const knockFactor = (1 - t) * dt;
      d.obj.position.x += d.knockX * d.knockSpeed * knockFactor * 4;
      d.obj.position.z += d.knockZ * d.knockSpeed * knockFactor * 4;

      // Shrink
      const scale = 1 - t;
      d.obj.scale.set(
        d.originalScale.x * scale,
        d.originalScale.y * scale,
        d.originalScale.z * scale,
      );

      // Fade out all materials in the object
      d.obj.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const mat = (node as THREE.Mesh).material;
          if (mat && !Array.isArray(mat)) {
            const m = mat as THREE.MeshStandardMaterial;
            if (!m.transparent) {
              m.transparent = true;
              m.needsUpdate = true;
            }
            m.opacity = Math.max(0, scale);
          }
        }
      });

      // Remove when done
      if (t >= 1) {
        d.obj.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            mesh.geometry?.dispose();
            const mat = mesh.material;
            if (Array.isArray(mat)) mat.forEach(m => m.dispose());
            else if (mat) (mat as THREE.Material).dispose();
          }
        });
        if (d.obj.parent) d.obj.parent.remove(d.obj);
        this._destroyingProps.splice(i, 1);
      }
    }
  }

  updateVignette(hpPercent: number): void {
    if (!this._vignetteEl) {
      this._vignetteEl = document.createElement('div');
      this._vignetteEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9998;opacity:0;transition:opacity 0.3s ease;';
      this._vignetteEl.style.background = 'radial-gradient(ellipse at center, transparent 50%, rgba(180,0,0,0.6) 100%)';
      document.body.appendChild(this._vignetteEl);
    }
    if (hpPercent < 0.3) {
      const intensity = (0.3 - hpPercent) / 0.3; // 0 at 30%, 1 at 0%
      const pulse = 0.7 + Math.sin(Date.now() * 0.006 * (1 + intensity * 2)) * 0.3;
      this._vignetteEl.style.opacity = String(intensity * pulse);
    } else {
      this._vignetteEl.style.opacity = '0';
    }
  }
}
