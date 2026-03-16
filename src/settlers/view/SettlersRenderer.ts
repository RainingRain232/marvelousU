// ---------------------------------------------------------------------------
// Settlers – Three.js renderer (enhanced visuals)
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { SB } from "../config/SettlersBalance";
import { Biome, Deposit, getHeightAt, getVertex, tileIdx } from "../state/SettlersMap";
import { BUILDING_DEFS, SettlersBuildingType } from "../config/SettlersBuildingDefs";
import { RESOURCE_META } from "../config/SettlersResourceDefs";
import type { SettlersState } from "../state/SettlersState";
import type { SettlersBuilding } from "../state/SettlersBuilding";
import type { SettlersFlag } from "../state/SettlersRoad";

// ---------------------------------------------------------------------------
// Biome colors – base + variation pairs
// ---------------------------------------------------------------------------

const BIOME_BASE: Record<number, THREE.Color> = {
  [Biome.WATER]:    new THREE.Color(0x1a6090),
  [Biome.MEADOW]:   new THREE.Color(0x5da040),
  [Biome.FOREST]:   new THREE.Color(0x3a7a2c),
  [Biome.MOUNTAIN]: new THREE.Color(0x8a8a7e),
  [Biome.DESERT]:   new THREE.Color(0xc4a854),
};
const BIOME_VAR: Record<number, THREE.Color> = {
  [Biome.WATER]:    new THREE.Color(0x1888b8),
  [Biome.MEADOW]:   new THREE.Color(0x6eb84a),
  [Biome.FOREST]:   new THREE.Color(0x2e6820),
  [Biome.MOUNTAIN]: new THREE.Color(0x999888),
  [Biome.DESERT]:   new THREE.Color(0xd4b86a),
};

const PLAYER_COLORS = [0x3388ff, 0xff3333, 0x33cc33, 0xffaa00];

// Simple noise helper for vertex color variation
function _vnoise(x: number, z: number, seed: number): number {
  return Math.sin(x * 0.7 + seed) * 0.5 + Math.cos(z * 0.9 + seed * 1.3) * 0.5;
}

// ---------------------------------------------------------------------------
// Smoke particle pool
// ---------------------------------------------------------------------------

interface SmokeParticle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  vz: number;
}

export class SettlersRenderer {
  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  canvas!: HTMLCanvasElement;

  private _terrainMesh!: THREE.Mesh;
  private _waterMesh!: THREE.Mesh;
  private _sunLight!: THREE.DirectionalLight;

  // Entity mesh pools
  private _buildingMeshes = new Map<string, THREE.Group>();
  private _flagMeshes = new Map<string, THREE.Group>();
  private _carrierMeshes = new Map<string, THREE.Group>();
  private _soldierMeshes = new Map<string, THREE.Group>();
  private _roadMeshes = new Map<string, THREE.Mesh>();

  // Tile highlight
  private _tileHighlight!: THREE.Mesh;

  // Territory border
  private _territoryLine: THREE.LineSegments | null = null;

  // Decorative groups
  private _treesGroup = new THREE.Group();
  private _rocksGroup = new THREE.Group();
  private _grassGroup = new THREE.Group();
  private _depositsGroup = new THREE.Group();

  // Smoke particles
  private _smokeParticles: SmokeParticle[] = [];
  private _smokeGroup = new THREE.Group();
  private _smokeMat!: THREE.MeshBasicMaterial;

  // Health bars
  private _healthBarGroup = new THREE.Group();
  private _combatFlashes: { mesh: THREE.Mesh; life: number }[] = [];

  // Building construction scaffolding & production spinners
  private _scaffoldMeshes = new Map<string, THREE.Group>();
  private _spinnerMeshes = new Map<string, THREE.Mesh>();

  // Clouds
  private _cloudGroup = new THREE.Group();

  // Cached geometries
  private _boxGeo = new THREE.BoxGeometry(1, 1, 1);
  private _coneGeo = new THREE.ConeGeometry(0.5, 1, 6);
  private _cylGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 6);
  private _sphereGeo = new THREE.SphereGeometry(0.15, 6, 4);

  // Shared materials
  private _wallMat!: THREE.MeshStandardMaterial;
  private _wallDarkMat!: THREE.MeshStandardMaterial;
  private _woodMat!: THREE.MeshStandardMaterial;
  private _stoneMat!: THREE.MeshStandardMaterial;
  private _windowMat!: THREE.MeshStandardMaterial;
  private _chimneyMat!: THREE.MeshStandardMaterial;

  private _startTime = Date.now();

  // Day/night cycle
  private _ambientLight!: THREE.AmbientLight;
  private _hemiLight!: THREE.HemisphereLight;
  private _dayLength = 300; // seconds for a full day cycle
  private _sunDisc: THREE.Mesh | null = null;

  get terrainMesh(): THREE.Mesh { return this._terrainMesh; }

  init(screenW: number, screenH: number): void {
    // Canvas
    this.canvas = document.createElement("canvas");
    this.canvas.id = "settlers-canvas";
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.zIndex = "10";
    const container = document.getElementById("pixi-container");
    if (container) {
      container.style.display = "none";
      container.parentElement?.appendChild(this.canvas);
    } else {
      document.body.appendChild(this.canvas);
    }

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(screenW, screenH);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7ab8e0);
    this.scene.fog = new THREE.FogExp2(0xa0cce8, 0.005);

    // Camera
    this.camera = new THREE.PerspectiveCamera(55, screenW / screenH, 0.5, 500);

    // Shared materials
    this._wallMat = new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.85, transparent: true });
    this._wallDarkMat = new THREE.MeshStandardMaterial({ color: 0xb0a080, roughness: 0.9, transparent: true });
    this._woodMat = new THREE.MeshStandardMaterial({ color: 0x8b6b3a, roughness: 0.85, transparent: true });
    this._stoneMat = new THREE.MeshStandardMaterial({ color: 0x888880, roughness: 0.9, transparent: true });
    this._windowMat = new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0x886622, emissiveIntensity: 0.3, roughness: 0.3 });
    this._chimneyMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.95 });
    this._smokeMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.3, depthWrite: false });

    // Lighting
    this._setupLighting();

    // Sky dome
    this._addSkyDome();

    // Clouds
    this._addClouds();

    // Tile highlight
    const hlGeo = new THREE.PlaneGeometry(SB.TILE_SIZE, SB.TILE_SIZE);
    const hlMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._tileHighlight = new THREE.Mesh(hlGeo, hlMat);
    this._tileHighlight.rotation.x = -Math.PI / 2;
    this._tileHighlight.visible = false;
    this.scene.add(this._tileHighlight);

    // Groups
    this.scene.add(this._treesGroup);
    this.scene.add(this._rocksGroup);
    this.scene.add(this._grassGroup);
    this.scene.add(this._smokeGroup);
    this.scene.add(this._cloudGroup);
    this.scene.add(this._depositsGroup);
    this.scene.add(this._healthBarGroup);

    // Resize handler
    window.addEventListener("resize", () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  /** Build terrain mesh from map state */
  buildTerrain(state: SettlersState): void {
    const map = state.map;
    const w = map.width;
    const h = map.height;

    // Terrain geometry
    const geo = new THREE.PlaneGeometry(w * map.tileSize, h * map.tileSize, w, h);
    geo.rotateX(-Math.PI / 2);

    // Displace vertices from heightmap + apply biome colors with noise variation
    const pos = geo.attributes.position;
    const colors: number[] = [];
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const vx = i % (w + 1);
      const vz = Math.floor(i / (w + 1));
      const height = getVertex(map, vx, vz);
      pos.setY(i, height);
      pos.setX(i, vx * map.tileSize);
      pos.setZ(i, vz * map.tileSize);

      // Biome color with noise variation
      const tx = Math.min(vx, w - 1);
      const tz = Math.min(vz, h - 1);
      const biome = map.biomes[tz * w + tx];
      const base = BIOME_BASE[biome] || BIOME_BASE[Biome.MEADOW];
      const vari = BIOME_VAR[biome] || BIOME_VAR[Biome.MEADOW];

      // Mix base and variation using noise
      const n = _vnoise(vx, vz, 7.3) * 0.5 + 0.5; // 0..1
      tmp.lerpColors(base, vari, n);

      // Height-based tint
      const hFactor = 0.82 + (height / SB.MAX_HEIGHT) * 0.35;
      tmp.r *= hFactor;
      tmp.g *= hFactor;
      tmp.b *= hFactor;

      // Snow on mountain peaks
      if (biome === Biome.MOUNTAIN && height > SB.MAX_HEIGHT * 0.8) {
        const snowBlend = Math.min(1, (height - SB.MAX_HEIGHT * 0.8) / (SB.MAX_HEIGHT * 0.2));
        tmp.lerp(new THREE.Color(0xeeeeff), snowBlend * 0.6);
      }

      // Sandy shore near water
      if (biome === Biome.MEADOW) {
        const normalizedH = height / SB.MAX_HEIGHT;
        if (normalizedH < SB.WATER_LEVEL + 0.08) {
          const sandBlend = 1 - (normalizedH - SB.WATER_LEVEL) / 0.08;
          tmp.lerp(new THREE.Color(0xc8b878), Math.max(0, sandBlend) * 0.7);
        }
      }

      colors.push(tmp.r, tmp.g, tmp.b);
    }

    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.0,
    });

    this._terrainMesh = new THREE.Mesh(geo, mat);
    this._terrainMesh.receiveShadow = true;
    this.scene.add(this._terrainMesh);

    // Water plane with vertex displacement
    const waterSegs = 64;
    const waterGeo = new THREE.PlaneGeometry(w * map.tileSize * 1.4, h * map.tileSize * 1.4, waterSegs, waterSegs);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2288aa,
      transparent: true,
      opacity: 0.55,
      roughness: 0.05,
      metalness: 0.4,
      side: THREE.DoubleSide,
    });
    this._waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this._waterMesh.rotation.x = -Math.PI / 2;
    this._waterMesh.position.set(
      w * map.tileSize * 0.5,
      SB.WATER_LEVEL * SB.MAX_HEIGHT - 0.1,
      h * map.tileSize * 0.5,
    );
    this.scene.add(this._waterMesh);

    // Decorations
    this._buildTrees(state);
    this._buildRocks(state);
    this._buildGrass(state);
    this._buildDeposits(state);
  }

  /** Main render call */
  render(state: SettlersState, _dt: number): void {
    const t = (Date.now() - this._startTime) * 0.001;

    // Tile highlight
    if (state.hoveredTile) {
      this._tileHighlight.visible = true;
      const wx = (state.hoveredTile.x + 0.5) * SB.TILE_SIZE;
      const wz = (state.hoveredTile.z + 0.5) * SB.TILE_SIZE;
      const wy = getHeightAt(state.map, wx, wz) + 0.05;
      this._tileHighlight.position.set(wx, wy, wz);
    } else {
      this._tileHighlight.visible = false;
    }

    // Sync entities
    this._syncBuildings(state);
    this._syncFlags(state, t);
    this._syncRoads(state);
    this._syncCarriers(state, t);
    this._syncSoldiers(state, t);
    this._syncTerritory(state);

    // Health bars + combat effects
    this._updateHealthBars(state);
    this._updateCombatFlashes(state, _dt);

    // Animate water waves
    this._animateWater(t);

    // Animate clouds
    this._animateClouds(t);

    // Update smoke
    this._updateSmoke(state, _dt, t);

    // Day/night cycle
    this._updateDayNight(t);

    // Move sun shadow target to camera focus
    this._sunLight.target.position.set(
      this.camera.position.x,
      0,
      this.camera.position.z,
    );

    this.renderer.render(this.scene, this.camera);
  }

  // -----------------------------------------------------------------------
  // Day/night cycle
  // -----------------------------------------------------------------------

  private _updateDayNight(t: number): void {
    // Time of day: 0=noon, 0.25=sunset, 0.5=midnight, 0.75=sunrise
    const dayTime = (t / this._dayLength) % 1;
    const sunAngle = dayTime * Math.PI * 2; // 0 = noon (sun at top)

    // Sun height (sinusoidal): peaks at noon, lowest at midnight
    const sunHeight = Math.sin(sunAngle + Math.PI * 0.5);
    const sunY = sunHeight * 80 + 10;
    const sunX = Math.cos(sunAngle) * 60;

    const mapCx = SB.MAP_WIDTH * SB.TILE_SIZE * 0.5;
    const mapCz = SB.MAP_HEIGHT * SB.TILE_SIZE * 0.5;

    // Move sun light
    this._sunLight.position.set(
      this.camera.position.x + sunX,
      Math.max(5, sunY),
      this.camera.position.z + 30,
    );

    // Move sun disc
    if (this._sunDisc) {
      this._sunDisc.position.set(mapCx + sunX * 2, Math.max(10, sunY * 2), mapCz - 60);
      this._sunDisc.lookAt(mapCx, 0, mapCz);
    }

    // Light intensity based on time of day
    const dayBrightness = Math.max(0, sunHeight);
    const dayFactor = Math.pow(dayBrightness, 0.5); // Smoother transition

    // Sun light color: warm gold at day, orange at dusk/dawn, dim blue at night
    const sunColor = new THREE.Color();
    if (dayFactor > 0.5) {
      // Day: warm golden
      sunColor.setHex(0xffeabb);
    } else if (dayFactor > 0.1) {
      // Dusk/dawn: orange to red
      sunColor.lerpColors(new THREE.Color(0xff6644), new THREE.Color(0xffeabb), (dayFactor - 0.1) / 0.4);
    } else {
      // Night: dim blue
      sunColor.lerpColors(new THREE.Color(0x223355), new THREE.Color(0xff6644), dayFactor / 0.1);
    }

    this._sunLight.color.copy(sunColor);
    this._sunLight.intensity = 0.3 + dayFactor * 1.6;

    // Ambient light
    this._ambientLight.intensity = 0.15 + dayFactor * 0.35;
    if (dayFactor < 0.3) {
      this._ambientLight.color.setHex(0x334466);
    } else {
      this._ambientLight.color.setHex(0x8898b0);
    }

    // Hemisphere light
    this._hemiLight.intensity = 0.2 + dayFactor * 0.6;

    // Fog and background color
    const bgDay = new THREE.Color(0x7ab8e0);
    const bgDusk = new THREE.Color(0xcc7744);
    const bgNight = new THREE.Color(0x112244);
    const bgColor = new THREE.Color();
    if (dayFactor > 0.5) {
      bgColor.copy(bgDay);
    } else if (dayFactor > 0.15) {
      bgColor.lerpColors(bgDusk, bgDay, (dayFactor - 0.15) / 0.35);
    } else {
      bgColor.lerpColors(bgNight, bgDusk, dayFactor / 0.15);
    }
    this.scene.background = bgColor;
    (this.scene.fog as THREE.FogExp2).color.copy(bgColor);

    // Window emissive glow brightens at night
    this._windowMat.emissiveIntensity = 0.1 + (1 - dayFactor) * 0.8;
  }

  /** Rebuild all visuals from a fresh state (used after loading) */
  rebuildAll(state: SettlersState): void {
    // Clear all entity meshes
    for (const [, m] of this._buildingMeshes) this.scene.remove(m);
    for (const [, m] of this._flagMeshes) this.scene.remove(m);
    for (const [, m] of this._carrierMeshes) this.scene.remove(m);
    for (const [, m] of this._soldierMeshes) this.scene.remove(m);
    for (const [, m] of this._roadMeshes) this.scene.remove(m);
    for (const [, m] of this._scaffoldMeshes) this.scene.remove(m);
    for (const [, m] of this._spinnerMeshes) this.scene.remove(m);
    this._buildingMeshes.clear();
    this._flagMeshes.clear();
    this._carrierMeshes.clear();
    this._soldierMeshes.clear();
    this._roadMeshes.clear();
    this._scaffoldMeshes.clear();
    this._spinnerMeshes.clear();

    if (this._territoryLine) {
      this.scene.remove(this._territoryLine);
      this._territoryLine = null;
    }

    // Rebuild terrain
    if (this._terrainMesh) this.scene.remove(this._terrainMesh);
    if (this._waterMesh) this.scene.remove(this._waterMesh);
    this._treesGroup.clear();
    this._rocksGroup.clear();
    this._grassGroup.clear();
    this._depositsGroup.clear();
    this.buildTerrain(state);
  }

  destroy(): void {
    this.renderer.dispose();
    this.canvas.remove();
    const container = document.getElementById("pixi-container");
    if (container) container.style.display = "";
  }

  // -----------------------------------------------------------------------
  // Lighting
  // -----------------------------------------------------------------------

  private _setupLighting(): void {
    // Warm ambient
    this._ambientLight = new THREE.AmbientLight(0x8898b0, 0.5);
    this.scene.add(this._ambientLight);

    // Sky-ground hemisphere
    this._hemiLight = new THREE.HemisphereLight(0xc0d8f0, 0x446622, 0.8);
    this.scene.add(this._hemiLight);

    // Sun – warm directional
    this._sunLight = new THREE.DirectionalLight(0xffeabb, 1.9);
    this._sunLight.position.set(60, 80, 40);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(2048, 2048);
    this._sunLight.shadow.camera.left = -80;
    this._sunLight.shadow.camera.right = 80;
    this._sunLight.shadow.camera.top = 80;
    this._sunLight.shadow.camera.bottom = -80;
    this._sunLight.shadow.camera.far = 200;
    this._sunLight.shadow.bias = -0.0004;
    this._sunLight.shadow.normalBias = 0.02;
    this.scene.add(this._sunLight);
    this.scene.add(this._sunLight.target);

    // Cool fill from opposite side
    const fill = new THREE.DirectionalLight(0x88aacc, 0.3);
    fill.position.set(-40, 30, -20);
    this.scene.add(fill);

    // Warm bounce from ground
    const bounce = new THREE.DirectionalLight(0xddcc88, 0.15);
    bounce.position.set(0, -10, 0);
    this.scene.add(bounce);
  }

  // -----------------------------------------------------------------------
  // Sky dome with sun disc
  // -----------------------------------------------------------------------

  private _addSkyDome(): void {
    const skyGeo = new THREE.SphereGeometry(250, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const skyColors: number[] = [];
    const pos = skyGeo.attributes.position;
    const zenith = new THREE.Color(0x3a70b0);
    const mid = new THREE.Color(0x6fa8d8);
    const horizon = new THREE.Color(0xd0e4f4);

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = Math.max(0, y / 250);
      const c = new THREE.Color();
      if (t < 0.3) {
        c.lerpColors(horizon, mid, t / 0.3);
      } else {
        c.lerpColors(mid, zenith, (t - 0.3) / 0.7);
      }
      skyColors.push(c.r, c.g, c.b);
    }
    skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(skyColors, 3));
    const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.set(SB.MAP_WIDTH * SB.TILE_SIZE * 0.5, 0, SB.MAP_HEIGHT * SB.TILE_SIZE * 0.5);
    this.scene.add(sky);

    // Sun disc
    const sunGeo = new THREE.CircleGeometry(8, 16);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfffde0,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(
      SB.MAP_WIDTH * SB.TILE_SIZE * 0.5 + 120,
      160,
      SB.MAP_HEIGHT * SB.TILE_SIZE * 0.5 - 60,
    );
    sun.lookAt(SB.MAP_WIDTH * SB.TILE_SIZE * 0.5, 0, SB.MAP_HEIGHT * SB.TILE_SIZE * 0.5);
    this._sunDisc = sun;
    this.scene.add(sun);

    // Sun glow
    const glowGeo = new THREE.CircleGeometry(18, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xfff4c0,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(sun.position);
    glow.lookAt(SB.MAP_WIDTH * SB.TILE_SIZE * 0.5, 0, SB.MAP_HEIGHT * SB.TILE_SIZE * 0.5);
    this.scene.add(glow);
  }

  // -----------------------------------------------------------------------
  // Clouds
  // -----------------------------------------------------------------------

  private _addClouds(): void {
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mapCx = SB.MAP_WIDTH * SB.TILE_SIZE * 0.5;
    const mapCz = SB.MAP_HEIGHT * SB.TILE_SIZE * 0.5;

    for (let i = 0; i < 15; i++) {
      const g = new THREE.Group();
      // 3-4 overlapping ellipses per cloud
      const puffs = 3 + Math.floor(Math.random() * 2);
      for (let p = 0; p < puffs; p++) {
        const w = 8 + Math.random() * 12;
        const h = 4 + Math.random() * 6;
        const geo = new THREE.PlaneGeometry(w, h);
        const puff = new THREE.Mesh(geo, cloudMat);
        puff.position.set(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 6,
        );
        puff.rotation.x = -Math.PI / 2;
        g.add(puff);
      }
      g.position.set(
        mapCx + (Math.random() - 0.5) * 200,
        50 + Math.random() * 30,
        mapCz + (Math.random() - 0.5) * 200,
      );
      g.userData.speed = 0.3 + Math.random() * 0.5;
      this._cloudGroup.add(g);
    }
  }

  private _animateClouds(_t: number): void {
    for (const cloud of this._cloudGroup.children) {
      cloud.position.x += (cloud.userData as { speed: number }).speed * 0.016;
      // Wrap around
      const mapW = SB.MAP_WIDTH * SB.TILE_SIZE;
      if (cloud.position.x > mapW + 100) {
        cloud.position.x = -100;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Water animation
  // -----------------------------------------------------------------------

  private _animateWater(t: number): void {
    if (!this._waterMesh) return;
    const geo = this._waterMesh.geometry;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const wave = Math.sin(x * 0.15 + t * 1.5) * 0.08
                 + Math.cos(z * 0.12 + t * 1.2) * 0.06
                 + Math.sin((x + z) * 0.08 + t * 0.8) * 0.04;
      pos.setY(i, wave);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  // -----------------------------------------------------------------------
  // Decorative trees (multiple variants)
  // -----------------------------------------------------------------------

  private _buildTrees(state: SettlersState): void {
    this._treesGroup.clear();

    // Shared materials
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
    const trunkBirchMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.85 });
    const leafDark = new THREE.MeshStandardMaterial({ color: 0x226618, roughness: 0.85 });
    const leafMid = new THREE.MeshStandardMaterial({ color: 0x2d7a1e, roughness: 0.85 });
    const leafLight = new THREE.MeshStandardMaterial({ color: 0x44aa30, roughness: 0.85 });

    for (const tree of state.map.trees) {
      const g = new THREE.Group();
      const s = tree.scale;

      if (tree.variant === 0) {
        // Pine tree – layered cones
        const trunk = new THREE.Mesh(this._cylGeo, trunkMat);
        trunk.scale.set(s * 0.5, s * 2.5, s * 0.5);
        trunk.position.y = s * 1.25;
        g.add(trunk);

        for (let layer = 0; layer < 3; layer++) {
          const layerS = s * (2.2 - layer * 0.5);
          const layerY = s * (1.8 + layer * 1.0);
          const cone = new THREE.Mesh(this._coneGeo, layer === 0 ? leafDark : leafMid);
          cone.scale.set(layerS, s * 1.2, layerS);
          cone.position.y = layerY;
          cone.castShadow = true;
          g.add(cone);
        }
      } else if (tree.variant === 1) {
        // Deciduous tree – sphere canopy
        const trunk = new THREE.Mesh(this._cylGeo, trunkMat);
        trunk.scale.set(s * 0.7, s * 2.0, s * 0.7);
        trunk.position.y = s * 1.0;
        g.add(trunk);

        // Multi-sphere canopy
        const canopyGeo = new THREE.SphereGeometry(s * 1.4, 8, 6);
        const canopy = new THREE.Mesh(canopyGeo, leafLight);
        canopy.position.y = s * 2.8;
        canopy.scale.set(1, 0.8, 1);
        canopy.castShadow = true;
        g.add(canopy);

        // Secondary smaller sphere
        const canopy2Geo = new THREE.SphereGeometry(s * 0.9, 6, 5);
        const canopy2 = new THREE.Mesh(canopy2Geo, leafMid);
        canopy2.position.set(s * 0.6, s * 2.4, s * 0.3);
        canopy2.castShadow = true;
        g.add(canopy2);
      } else {
        // Birch tree – thin trunk, small leaves
        const trunk = new THREE.Mesh(this._cylGeo, trunkBirchMat);
        trunk.scale.set(s * 0.35, s * 3.0, s * 0.35);
        trunk.position.y = s * 1.5;
        g.add(trunk);

        const canopyGeo = new THREE.SphereGeometry(s * 1.0, 6, 5);
        const canopy = new THREE.Mesh(canopyGeo, leafLight);
        canopy.position.y = s * 3.2;
        canopy.scale.set(0.8, 1.2, 0.8);
        canopy.castShadow = true;
        g.add(canopy);
      }

      const wy = getHeightAt(state.map, tree.x, tree.z);
      g.position.set(tree.x, wy, tree.z);
      this._treesGroup.add(g);
    }
  }

  // -----------------------------------------------------------------------
  // Decorative rocks (irregular shapes)
  // -----------------------------------------------------------------------

  private _buildRocks(state: SettlersState): void {
    this._rocksGroup.clear();
    const rockMat1 = new THREE.MeshStandardMaterial({ color: 0x777770, roughness: 0.95 });
    const rockMat2 = new THREE.MeshStandardMaterial({ color: 0x888878, roughness: 0.92 });

    for (const rock of state.map.rocks) {
      const g = new THREE.Group();
      const s = rock.scale;

      // Main rock
      const main = new THREE.Mesh(this._boxGeo, rockMat1);
      main.scale.set(s * 1.8, s * 1.0, s * 1.4);
      main.rotation.y = rock.x * 1.7;
      main.rotation.x = 0.1;
      main.castShadow = true;
      g.add(main);

      // Secondary smaller rock
      if (s > 0.5) {
        const sub = new THREE.Mesh(this._boxGeo, rockMat2);
        sub.scale.set(s * 0.8, s * 0.6, s * 0.7);
        sub.position.set(s * 0.8, -s * 0.1, s * 0.3);
        sub.rotation.y = rock.x * 2.3;
        sub.castShadow = true;
        g.add(sub);
      }

      const wy = getHeightAt(state.map, rock.x, rock.z);
      g.position.set(rock.x, wy + s * 0.3, rock.z);
      this._rocksGroup.add(g);
    }
  }

  // -----------------------------------------------------------------------
  // Grass patches and flowers on meadow tiles
  // -----------------------------------------------------------------------

  private _buildGrass(state: SettlersState): void {
    this._grassGroup.clear();
    const map = state.map;
    const grassMat = new THREE.MeshBasicMaterial({
      color: 0x4a9030,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const flowerColors = [0xff6688, 0xffdd44, 0xffffff, 0xcc88ff, 0xff8844];

    let grassCount = 0;
    const maxGrass = 600;

    for (let tz = 0; tz < map.height; tz++) {
      for (let tx = 0; tx < map.width; tx++) {
        if (grassCount >= maxGrass) break;
        const biome = map.biomes[tz * map.width + tx];
        if (biome !== Biome.MEADOW) continue;

        // Sparse grass tufts
        const rnd = _vnoise(tx * 3.7, tz * 4.1, 42) * 0.5 + 0.5;
        if (rnd < 0.7) continue;

        const wx = (tx + 0.3 + rnd * 0.4) * SB.TILE_SIZE;
        const wz = (tz + 0.2 + (1 - rnd) * 0.6) * SB.TILE_SIZE;
        const wy = getHeightAt(map, wx, wz);

        // 2-3 grass blades as thin planes
        const blades = 2 + Math.floor(rnd * 2);
        for (let b = 0; b < blades; b++) {
          const blade = new THREE.Mesh(
            new THREE.PlaneGeometry(0.08, 0.25 + rnd * 0.15),
            grassMat,
          );
          blade.position.set(
            wx + (b - 1) * 0.1,
            wy + 0.12,
            wz + (b * 0.07),
          );
          blade.rotation.y = b * 1.2 + tx;
          blade.rotation.x = -0.1;
          this._grassGroup.add(blade);
          grassCount++;
        }

        // Occasional flower
        if (rnd > 0.88) {
          const flowerGeo = new THREE.SphereGeometry(0.06, 4, 3);
          const flowerMat = new THREE.MeshBasicMaterial({
            color: flowerColors[Math.floor(rnd * 100) % flowerColors.length],
          });
          const flower = new THREE.Mesh(flowerGeo, flowerMat);
          flower.position.set(wx + 0.15, wy + 0.2, wz + 0.1);
          this._grassGroup.add(flower);
          grassCount++;
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Resource deposit indicators on terrain
  // -----------------------------------------------------------------------

  private _buildDeposits(state: SettlersState): void {
    this._depositsGroup.clear();
    const map = state.map;

    const depositColors: Record<number, number> = {
      [Deposit.IRON]: 0x7a4e2e,
      [Deposit.GOLD]: 0xffd700,
      [Deposit.COAL]: 0x333333,
      [Deposit.STONE]: 0x999999,
      [Deposit.FISH]: 0x5599bb,
    };

    const depositGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 6);

    for (let tz = 0; tz < map.height; tz++) {
      for (let tx = 0; tx < map.width; tx++) {
        const idx = tileIdx(map, tx, tz);
        const deposit = map.deposits[idx];
        if (deposit === Deposit.NONE) continue;

        const color = depositColors[deposit] || 0xffffff;
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.3,
          roughness: 0.5,
          metalness: deposit === Deposit.GOLD ? 0.6 : 0.2,
        });

        const marker = new THREE.Mesh(depositGeo, mat);
        const wx = (tx + 0.5) * SB.TILE_SIZE;
        const wz = (tz + 0.5) * SB.TILE_SIZE;
        const wy = getHeightAt(map, wx, wz) + 0.05;
        marker.position.set(wx, wy, wz);
        this._depositsGroup.add(marker);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Smoke particles from active production buildings
  // -----------------------------------------------------------------------

  private _updateSmoke(state: SettlersState, dt: number, _t: number): void {
    // Spawn new particles from active chimneys
    if (Math.random() < 0.3) {
      for (const [, building] of state.buildings) {
        if (building.constructionProgress < 1) continue;
        if (!building.active) continue;
        const def = BUILDING_DEFS[building.type];
        // Only production buildings with outputs emit smoke
        if (def.outputs.length === 0 && def.type !== SettlersBuildingType.HEADQUARTERS) continue;

        if (Math.random() > 0.08) continue; // throttle
        if (this._smokeParticles.length > 60) break;

        const ts = SB.TILE_SIZE;
        const cx = (building.tileX + def.footprint.w * 0.5) * ts;
        const cz = (building.tileZ + def.footprint.h * 0.5) * ts;
        const wy = getHeightAt(state.map, cx, cz);
        const buildH = def.size === "large" ? ts * 2.5 : def.size === "medium" ? ts * 1.8 : ts * 1.4;

        const geo = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 4, 3);
        const mesh = new THREE.Mesh(geo, this._smokeMat.clone());
        mesh.position.set(cx + (Math.random() - 0.5) * 0.3, wy + buildH, cz + (Math.random() - 0.5) * 0.3);
        this._smokeGroup.add(mesh);

        this._smokeParticles.push({
          mesh,
          life: 0,
          maxLife: 2 + Math.random() * 2,
          vx: (Math.random() - 0.5) * 0.2,
          vy: 0.4 + Math.random() * 0.3,
          vz: (Math.random() - 0.5) * 0.2,
        });
      }
    }

    // Update existing particles
    for (let i = this._smokeParticles.length - 1; i >= 0; i--) {
      const p = this._smokeParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this._smokeGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this._smokeParticles.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      const lifeRatio = p.life / p.maxLife;
      const scale = 1 + lifeRatio * 2;
      p.mesh.scale.set(scale, scale, scale);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.25 * (1 - lifeRatio);
    }
  }

  // -----------------------------------------------------------------------
  // Health bars for soldiers and damaged buildings
  // -----------------------------------------------------------------------

  private _updateHealthBars(state: SettlersState): void {
    this._healthBarGroup.clear();
    const barBgGeo = new THREE.PlaneGeometry(0.6, 0.06);
    const barFgGeo = new THREE.PlaneGeometry(0.6, 0.06);
    const barBgMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.7 });

    // Soldier health bars
    for (const [, soldier] of state.soldiers) {
      if (soldier.state === "garrisoned") continue;
      if (soldier.hp >= soldier.maxHp) continue;

      const hpPct = Math.max(0, soldier.hp / soldier.maxHp);
      const color = hpPct > 0.5 ? 0x44cc44 : hpPct > 0.25 ? 0xcccc44 : 0xcc4444;

      const bg = new THREE.Mesh(barBgGeo, barBgMat);
      bg.position.set(soldier.position.x, soldier.position.y + SB.SOLDIER_HEIGHT + 0.35, soldier.position.z);
      bg.lookAt(this.camera.position);
      this._healthBarGroup.add(bg);

      const fgMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthTest: false });
      const fg = new THREE.Mesh(barFgGeo, fgMat);
      fg.scale.x = hpPct;
      fg.position.set(
        soldier.position.x - (1 - hpPct) * 0.3,
        soldier.position.y + SB.SOLDIER_HEIGHT + 0.35,
        soldier.position.z,
      );
      fg.lookAt(this.camera.position);
      this._healthBarGroup.add(fg);
    }

    // Damaged building health bars
    for (const [, building] of state.buildings) {
      if (building.hp >= building.maxHp) continue;
      const def = BUILDING_DEFS[building.type];
      const hpPct = Math.max(0, building.hp / building.maxHp);
      const color = hpPct > 0.5 ? 0x44cc44 : hpPct > 0.25 ? 0xcccc44 : 0xcc4444;

      const cx = (building.tileX + def.footprint.w * 0.5) * SB.TILE_SIZE;
      const cz = (building.tileZ + def.footprint.h * 0.5) * SB.TILE_SIZE;
      const wy = getHeightAt(state.map, cx, cz);
      const buildH = def.size === "large" ? 3.5 : def.size === "medium" ? 2.5 : 2.0;

      const barW = 1.2;
      const bgGeo = new THREE.PlaneGeometry(barW, 0.08);
      const fgGeo = new THREE.PlaneGeometry(barW, 0.08);

      const bg = new THREE.Mesh(bgGeo, barBgMat);
      bg.position.set(cx, wy + buildH, cz);
      bg.lookAt(this.camera.position);
      this._healthBarGroup.add(bg);

      const fgMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthTest: false });
      const fg = new THREE.Mesh(fgGeo, fgMat);
      fg.scale.x = hpPct;
      fg.position.set(cx - (1 - hpPct) * barW * 0.5, wy + buildH, cz);
      fg.lookAt(this.camera.position);
      this._healthBarGroup.add(fg);
    }
  }

  // -----------------------------------------------------------------------
  // Combat flash effects
  // -----------------------------------------------------------------------

  private _updateCombatFlashes(state: SettlersState, dt: number): void {
    // Spawn flashes at combat locations
    for (const combat of state.combats) {
      if (Math.random() < 0.15) {
        const geo = new THREE.SphereGeometry(0.15, 4, 3);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffff44,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
        });
        const flash = new THREE.Mesh(geo, mat);
        flash.position.set(
          combat.position.x + (Math.random() - 0.5) * 0.3,
          combat.position.y + SB.SOLDIER_HEIGHT * 0.5 + Math.random() * 0.3,
          combat.position.z + (Math.random() - 0.5) * 0.3,
        );
        this.scene.add(flash);
        this._combatFlashes.push({ mesh: flash, life: 0.3 });
      }
    }

    // Update existing flashes
    for (let i = this._combatFlashes.length - 1; i >= 0; i--) {
      const f = this._combatFlashes[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        (f.mesh.material as THREE.Material).dispose();
        this._combatFlashes.splice(i, 1);
      } else {
        const scale = 1 + (0.3 - f.life) * 3;
        f.mesh.scale.set(scale, scale, scale);
        (f.mesh.material as THREE.MeshBasicMaterial).opacity = f.life / 0.3 * 0.8;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Entity sync
  // -----------------------------------------------------------------------

  private _syncBuildings(state: SettlersState): void {
    const t = performance.now() * 0.001;
    for (const [id, mesh] of this._buildingMeshes) {
      if (!state.buildings.has(id)) {
        this.scene.remove(mesh);
        this._buildingMeshes.delete(id);
        // Clean up scaffold / spinner
        const scaffold = this._scaffoldMeshes.get(id);
        if (scaffold) { this.scene.remove(scaffold); this._scaffoldMeshes.delete(id); }
        const spinner = this._spinnerMeshes.get(id);
        if (spinner) { this.scene.remove(spinner); this._spinnerMeshes.delete(id); }
      }
    }
    for (const [id, building] of state.buildings) {
      let mesh = this._buildingMeshes.get(id);
      if (!mesh) {
        mesh = this._createBuildingMesh(building, state);
        this._buildingMeshes.set(id, mesh);
        this.scene.add(mesh);
      }
      const def = BUILDING_DEFS[building.type];
      const ts = SB.TILE_SIZE;
      const progress = building.constructionProgress;

      if (progress < 1) {
        // Construction: apply transparency / wireframe
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat.transparent !== undefined) {
              mat.wireframe = progress < 0.5;
              mat.opacity = 0.3 + progress * 0.7;
            }
          }
        });

        // Scaffolding: wooden poles around the building during construction
        if (!this._scaffoldMeshes.has(id)) {
          const scaffold = this._createScaffold(building, state);
          this._scaffoldMeshes.set(id, scaffold);
          this.scene.add(scaffold);
        }
        // Animate scaffold opacity based on progress (fade out as building completes)
        const scaffold = this._scaffoldMeshes.get(id)!;
        scaffold.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            mat.opacity = 1.0 - progress * 0.8;
          }
        });
      } else {
        // Remove scaffold once construction is done
        const scaffold = this._scaffoldMeshes.get(id);
        if (scaffold) {
          this.scene.remove(scaffold);
          this._scaffoldMeshes.delete(id);
        }
      }

      // Production spinner for active production buildings
      if (progress >= 1 && building.productionTimer > 0 && def.garrisonSlots === 0
          && def.type !== SettlersBuildingType.HEADQUARTERS) {
        if (!this._spinnerMeshes.has(id)) {
          const spinnerMat = new THREE.MeshStandardMaterial({
            color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 0.4,
            roughness: 0.5, metalness: 0.3,
          });
          const spinner = new THREE.Mesh(this._boxGeo, spinnerMat);
          const fw = def.footprint.w * ts;
          spinner.scale.set(0.12, 0.12, 0.12);
          const bh = def.size === "large" ? fw * 1.1 : def.size === "medium" ? fw * 0.85 : fw * 0.7;
          spinner.position.copy(mesh.position);
          spinner.position.y += bh;
          this._spinnerMeshes.set(id, spinner);
          this.scene.add(spinner);
        }
        const spinner = this._spinnerMeshes.get(id)!;
        spinner.rotation.y = t * 3;
        spinner.rotation.x = t * 1.5;
      } else {
        // Remove spinner when not producing
        const spinner = this._spinnerMeshes.get(id);
        if (spinner) {
          this.scene.remove(spinner);
          this._spinnerMeshes.delete(id);
        }
      }
    }
  }

  private _createScaffold(building: SettlersBuilding, state: SettlersState): THREE.Group {
    const def = BUILDING_DEFS[building.type];
    const ts = SB.TILE_SIZE;
    const fw = def.footprint.w * ts;
    const fh = def.footprint.h * ts;
    const scaffoldH = def.size === "large" ? fw * 1.0 : def.size === "medium" ? fw * 0.7 : fw * 0.55;

    const g = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0xc4944a, roughness: 0.9, transparent: true, opacity: 1.0,
    });

    // 4 corner poles
    const halfW = fw * 0.45;
    const halfH = fh * 0.45;
    const corners = [
      [-halfW, -halfH], [halfW, -halfH],
      [-halfW, halfH], [halfW, halfH],
    ];
    for (const [cx, cz] of corners) {
      const pole = new THREE.Mesh(this._cylGeo, poleMat.clone());
      pole.scale.set(0.3, scaffoldH * 0.5, 0.3);
      pole.position.set(cx, scaffoldH * 0.5, cz);
      g.add(pole);
    }

    // Horizontal cross beams at mid-height
    const beamMat = poleMat.clone();
    for (let side = -1; side <= 1; side += 2) {
      // Along X
      const hBeam = new THREE.Mesh(this._boxGeo, beamMat.clone());
      hBeam.scale.set(fw * 0.88, 0.04, 0.04);
      hBeam.position.set(0, scaffoldH * 0.55, side * halfH);
      g.add(hBeam);
      // Along Z
      const vBeam = new THREE.Mesh(this._boxGeo, beamMat.clone());
      vBeam.scale.set(0.04, 0.04, fh * 0.88);
      vBeam.position.set(side * halfW, scaffoldH * 0.55, 0);
      g.add(vBeam);
    }

    // Diagonal braces on two sides
    for (let side = -1; side <= 1; side += 2) {
      const brace = new THREE.Mesh(this._boxGeo, beamMat.clone());
      brace.scale.set(0.03, scaffoldH * 0.7, 0.03);
      brace.position.set(side * halfW, scaffoldH * 0.4, 0);
      brace.rotation.z = side * 0.35;
      g.add(brace);
    }

    // Position at building location
    const bx = (building.tileX + def.footprint.w * 0.5) * ts;
    const bz = (building.tileZ + def.footprint.h * 0.5) * ts;
    const wy = getHeightAt(state.map, bx, bz);
    g.position.set(bx, wy, bz);

    return g;
  }

  private _createBuildingMesh(building: SettlersBuilding, state: SettlersState): THREE.Group {
    const def = BUILDING_DEFS[building.type];
    const g = new THREE.Group();
    const playerColor = this._getPlayerColor(building.owner, state);
    const roofMat = new THREE.MeshStandardMaterial({ color: playerColor, roughness: 0.75, transparent: true });

    const ts = SB.TILE_SIZE;
    const fw = def.footprint.w * ts;
    const fh = def.footprint.h * ts;

    if (def.garrisonSlots > 0) {
      // Military building – stone tower with battlements
      const towerR = fw * 0.35;
      const towerH = fw * 1.4;
      const towerGeo = new THREE.CylinderGeometry(towerR * 0.95, towerR, towerH, 8);
      const tower = new THREE.Mesh(towerGeo, this._stoneMat.clone());
      (tower.material as THREE.MeshStandardMaterial).transparent = true;
      tower.position.y = towerH * 0.5;
      tower.castShadow = true;
      g.add(tower);

      // Battlements (small boxes around top)
      const merlonCount = 8;
      for (let m = 0; m < merlonCount; m++) {
        const angle = (m / merlonCount) * Math.PI * 2;
        const merlon = new THREE.Mesh(this._boxGeo, this._stoneMat.clone());
        (merlon.material as THREE.MeshStandardMaterial).transparent = true;
        merlon.scale.set(0.2, 0.25, 0.15);
        merlon.position.set(
          Math.cos(angle) * towerR * 0.95,
          towerH + 0.12,
          Math.sin(angle) * towerR * 0.95,
        );
        g.add(merlon);
      }

      // Colored flag on top
      const flagPole = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: 0x8b7355 }));
      flagPole.scale.set(0.5, 0.6, 0.5);
      flagPole.position.y = towerH + 0.55;
      g.add(flagPole);

      const pennantGeo = new THREE.BufferGeometry();
      const verts = new Float32Array([0, 0, 0, 0.4, -0.05, 0, 0, -0.15, 0]);
      pennantGeo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      pennantGeo.computeVertexNormals();
      const pennant = new THREE.Mesh(pennantGeo, new THREE.MeshStandardMaterial({ color: playerColor, side: THREE.DoubleSide }));
      pennant.position.y = towerH + 0.8;
      g.add(pennant);

      // Door
      const door = new THREE.Mesh(this._boxGeo, this._woodMat.clone());
      (door.material as THREE.MeshStandardMaterial).transparent = true;
      door.scale.set(0.2, 0.35, 0.05);
      door.position.set(0, 0.17, towerR + 0.03);
      g.add(door);

      // Arrow slits
      for (let s = 0; s < 3; s++) {
        const angle = (s / 3) * Math.PI * 2 + 0.5;
        const slit = new THREE.Mesh(this._boxGeo, new THREE.MeshBasicMaterial({ color: 0x222222 }));
        slit.scale.set(0.04, 0.15, 0.02);
        slit.position.set(
          Math.cos(angle) * (towerR + 0.01),
          towerH * 0.5,
          Math.sin(angle) * (towerR + 0.01),
        );
        slit.lookAt(0, towerH * 0.5, 0);
        g.add(slit);
      }
    } else if (def.type === SettlersBuildingType.HEADQUARTERS) {
      // HQ – large multi-story building
      const base = new THREE.Mesh(this._boxGeo, this._wallMat.clone());
      (base.material as THREE.MeshStandardMaterial).transparent = true;
      base.scale.set(fw * 0.85, fw * 0.5, fh * 0.85);
      base.position.y = fw * 0.25;
      base.castShadow = true;
      g.add(base);

      // Second floor
      const upper = new THREE.Mesh(this._boxGeo, this._wallDarkMat.clone());
      (upper.material as THREE.MeshStandardMaterial).transparent = true;
      upper.scale.set(fw * 0.7, fw * 0.35, fh * 0.7);
      upper.position.y = fw * 0.67;
      upper.castShadow = true;
      g.add(upper);

      // Large peaked roof
      const roof = new THREE.Mesh(this._coneGeo, roofMat);
      roof.scale.set(fw * 0.9, fw * 0.7, fh * 0.9);
      roof.position.y = fw * 1.1;
      roof.castShadow = true;
      g.add(roof);

      // Door
      const door = new THREE.Mesh(this._boxGeo, this._woodMat.clone());
      (door.material as THREE.MeshStandardMaterial).transparent = true;
      door.scale.set(fw * 0.15, fw * 0.25, 0.05);
      door.position.set(0, fw * 0.12, fh * 0.43);
      g.add(door);

      // Windows (2 on each side)
      for (let side = -1; side <= 1; side += 2) {
        for (let row = 0; row < 2; row++) {
          const win = new THREE.Mesh(this._boxGeo, this._windowMat);
          win.scale.set(0.08, 0.12, fw * 0.06);
          win.position.set(
            side * fw * 0.25,
            fw * (0.3 + row * 0.35),
            fh * 0.43,
          );
          g.add(win);
        }
      }

      // Chimney
      const chimney = new THREE.Mesh(this._cylGeo, this._chimneyMat);
      chimney.scale.set(1.5, fw * 0.4, 1.5);
      chimney.position.set(fw * 0.25, fw * 1.3, fh * 0.15);
      g.add(chimney);
    } else if (def.size === "large") {
      // Large production building
      const base = new THREE.Mesh(this._boxGeo, this._wallMat.clone());
      (base.material as THREE.MeshStandardMaterial).transparent = true;
      base.scale.set(fw * 0.8, fw * 0.5, fh * 0.8);
      base.position.y = fw * 0.25;
      base.castShadow = true;
      g.add(base);

      // Timber framing (dark cross beams)
      for (let side = -1; side <= 1; side += 2) {
        const beam = new THREE.Mesh(this._boxGeo, this._woodMat.clone());
        (beam.material as THREE.MeshStandardMaterial).transparent = true;
        beam.scale.set(0.04, fw * 0.48, fh * 0.78);
        beam.position.set(side * fw * 0.39, fw * 0.25, 0);
        g.add(beam);
      }
      // Horizontal beam
      const hbeam = new THREE.Mesh(this._boxGeo, this._woodMat.clone());
      (hbeam.material as THREE.MeshStandardMaterial).transparent = true;
      hbeam.scale.set(fw * 0.78, 0.04, 0.04);
      hbeam.position.set(0, fw * 0.35, fh * 0.4);
      g.add(hbeam);

      // Roof
      const roof = new THREE.Mesh(this._coneGeo, roofMat);
      roof.scale.set(fw * 0.9, fw * 0.6, fh * 0.9);
      roof.position.y = fw * 0.7;
      roof.castShadow = true;
      g.add(roof);

      // Door
      const door = new THREE.Mesh(this._boxGeo, this._woodMat.clone());
      (door.material as THREE.MeshStandardMaterial).transparent = true;
      door.scale.set(fw * 0.12, fw * 0.22, 0.05);
      door.position.set(0, fw * 0.11, fh * 0.41);
      g.add(door);

      // Windows
      const win = new THREE.Mesh(this._boxGeo, this._windowMat);
      win.scale.set(0.06, 0.08, fw * 0.05);
      win.position.set(-fw * 0.2, fw * 0.32, fh * 0.41);
      g.add(win);
      const win2 = win.clone();
      win2.position.set(fw * 0.2, fw * 0.32, fh * 0.41);
      g.add(win2);

      // Chimney
      const chimney = new THREE.Mesh(this._cylGeo, this._chimneyMat);
      chimney.scale.set(1.2, fw * 0.3, 1.2);
      chimney.position.set(fw * 0.2, fw * 0.85, -fh * 0.1);
      g.add(chimney);
    } else if (def.size === "medium") {
      // Medium building
      const base = new THREE.Mesh(this._boxGeo, this._wallMat.clone());
      (base.material as THREE.MeshStandardMaterial).transparent = true;
      base.scale.set(fw * 0.7, fw * 0.45, fh * 0.7);
      base.position.y = fw * 0.22;
      base.castShadow = true;
      g.add(base);

      // Timber X on front face
      for (let d = -1; d <= 1; d += 2) {
        const xBeam = new THREE.Mesh(this._boxGeo, this._woodMat.clone());
        (xBeam.material as THREE.MeshStandardMaterial).transparent = true;
        xBeam.scale.set(0.03, fw * 0.4, 0.03);
        xBeam.position.set(d * fw * 0.1, fw * 0.22, fh * 0.36);
        xBeam.rotation.z = d * 0.4;
        g.add(xBeam);
      }

      // Roof
      const roof = new THREE.Mesh(this._coneGeo, roofMat);
      roof.scale.set(fw * 0.8, fw * 0.5, fh * 0.8);
      roof.position.y = fw * 0.55;
      roof.castShadow = true;
      g.add(roof);

      // Door
      const door = new THREE.Mesh(this._boxGeo, this._woodMat.clone());
      (door.material as THREE.MeshStandardMaterial).transparent = true;
      door.scale.set(fw * 0.1, fw * 0.18, 0.04);
      door.position.set(0, fw * 0.09, fh * 0.36);
      g.add(door);

      // Window
      const win = new THREE.Mesh(this._boxGeo, this._windowMat);
      win.scale.set(0.05, 0.06, fw * 0.04);
      win.position.set(-fw * 0.18, fw * 0.3, fh * 0.36);
      g.add(win);

      // Chimney
      const chimney = new THREE.Mesh(this._cylGeo, this._chimneyMat);
      chimney.scale.set(1.0, fw * 0.25, 1.0);
      chimney.position.set(fw * 0.15, fw * 0.7, 0);
      g.add(chimney);
    } else {
      // Small building
      const base = new THREE.Mesh(this._boxGeo, this._wallMat.clone());
      (base.material as THREE.MeshStandardMaterial).transparent = true;
      base.scale.set(fw * 0.6, fw * 0.35, fh * 0.6);
      base.position.y = fw * 0.17;
      base.castShadow = true;
      g.add(base);

      // Roof
      const roof = new THREE.Mesh(this._coneGeo, roofMat);
      roof.scale.set(fw * 0.7, fw * 0.45, fh * 0.7);
      roof.position.y = fw * 0.47;
      roof.castShadow = true;
      g.add(roof);

      // Door
      const door = new THREE.Mesh(this._boxGeo, this._woodMat.clone());
      (door.material as THREE.MeshStandardMaterial).transparent = true;
      door.scale.set(fw * 0.08, fw * 0.15, 0.04);
      door.position.set(0, fw * 0.07, fh * 0.31);
      g.add(door);

      // Small window
      const win = new THREE.Mesh(this._boxGeo, this._windowMat);
      win.scale.set(0.04, 0.04, fw * 0.03);
      win.position.set(-fw * 0.15, fw * 0.24, fh * 0.31);
      g.add(win);
    }

    // Position in world
    const cx = (building.tileX + def.footprint.w * 0.5) * ts;
    const cz = (building.tileZ + def.footprint.h * 0.5) * ts;
    const wy = getHeightAt(state.map, cx, cz);
    g.position.set(cx, wy, cz);

    return g;
  }

  // -----------------------------------------------------------------------
  // Flags with animated pennant
  // -----------------------------------------------------------------------

  private _syncFlags(state: SettlersState, t: number): void {
    for (const [id, mesh] of this._flagMeshes) {
      if (!state.flags.has(id)) {
        this.scene.remove(mesh);
        this._flagMeshes.delete(id);
      }
    }
    for (const [id, flag] of state.flags) {
      let mesh = this._flagMeshes.get(id);
      if (!mesh) {
        mesh = this._createFlagMesh(flag, state);
        this._flagMeshes.set(id, mesh);
        this.scene.add(mesh);
      }
      // Animate pennant wave
      const pennant = mesh.getObjectByName("pennant") as THREE.Mesh | undefined;
      if (pennant) {
        const geo = pennant.geometry;
        const pos = geo.attributes.position;
        pos.setX(1, 0.3 + Math.sin(t * 4 + flag.tileX * 2) * 0.06);
        pos.setY(1, -0.1 + Math.cos(t * 3.5 + flag.tileZ) * 0.03);
        pos.needsUpdate = true;
      }

      // Dynamic inventory dots
      const dotsGroup = mesh.getObjectByName("inventoryDots") as THREE.Group | undefined;
      if (dotsGroup) {
        while (dotsGroup.children.length > 0) dotsGroup.remove(dotsGroup.children[0]);
        const count = Math.min(flag.inventory.length, 8);
        for (let i = 0; i < count; i++) {
          const dotGeo = new THREE.SphereGeometry(0.04, 4, 3);
          const dotMat = new THREE.MeshBasicMaterial({ color: RESOURCE_META[flag.inventory[i].type].color });
          const dot = new THREE.Mesh(dotGeo, dotMat);
          const row = Math.floor(i / 4);
          const col = i % 4;
          dot.position.set((col - 1.5) * 0.08, 0.1 + row * 0.08, 0.15);
          dotsGroup.add(dot);
        }
        // Bottleneck glow
        if (flag.inventory.length >= 6) {
          const glowGeo = new THREE.SphereGeometry(0.15, 6, 4);
          const glowMat = new THREE.MeshBasicMaterial({
            color: 0xff4444, transparent: true,
            opacity: 0.3 + Math.sin(t * 4) * 0.15, depthWrite: false,
          });
          const glow = new THREE.Mesh(glowGeo, glowMat);
          glow.position.y = 0.3;
          dotsGroup.add(glow);
        }
      }
    }
  }

  private _createFlagMesh(flag: SettlersFlag, state: SettlersState): THREE.Group {
    const g = new THREE.Group();
    const playerColor = this._getPlayerColor(flag.owner, state);

    // Pole
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
    const pole = new THREE.Mesh(this._cylGeo, poleMat);
    pole.scale.set(0.8, SB.FLAG_HEIGHT, 0.8);
    pole.position.y = SB.FLAG_HEIGHT * 0.5;
    g.add(pole);

    // Pennant
    const pennantGeo = new THREE.BufferGeometry();
    const verts = new Float32Array([0, 0, 0, 0.3, -0.1, 0, 0, -0.22, 0]);
    pennantGeo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    pennantGeo.computeVertexNormals();
    const pennantMat = new THREE.MeshStandardMaterial({
      color: playerColor, side: THREE.DoubleSide,
      emissive: playerColor, emissiveIntensity: 0.1,
    });
    const pennant = new THREE.Mesh(pennantGeo, pennantMat);
    pennant.name = "pennant";
    pennant.position.y = SB.FLAG_HEIGHT;
    g.add(pennant);

    // Small base stone
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.95 });
    const base = new THREE.Mesh(this._boxGeo, baseMat);
    base.scale.set(0.2, 0.08, 0.2);
    base.position.y = 0.04;
    g.add(base);

    // Dynamic inventory group (updated each frame)
    const dotsGroup = new THREE.Group();
    dotsGroup.name = "inventoryDots";
    g.add(dotsGroup);

    const wx = (flag.tileX + 0.5) * SB.TILE_SIZE;
    const wz = (flag.tileZ + 0.5) * SB.TILE_SIZE;
    const wy = getHeightAt(state.map, wx, wz);
    g.position.set(wx, wy, wz);

    return g;
  }

  // -----------------------------------------------------------------------
  // Roads with edge detail
  // -----------------------------------------------------------------------

  private _syncRoads(state: SettlersState): void {
    for (const [id, mesh] of this._roadMeshes) {
      if (!state.roads.has(id)) {
        this.scene.remove(mesh);
        this._roadMeshes.delete(id);
      }
    }
    for (const [id, road] of state.roads) {
      if (!this._roadMeshes.has(id)) {
        const mesh = this._createRoadMesh(road.path, state);
        this._roadMeshes.set(id, mesh);
        this.scene.add(mesh);
      }
    }
  }

  private _createRoadMesh(
    path: { x: number; z: number }[],
    state: SettlersState,
  ): THREE.Mesh {
    const points: THREE.Vector3[] = [];
    for (const p of path) {
      const wx = (p.x + 0.5) * SB.TILE_SIZE;
      const wz = (p.z + 0.5) * SB.TILE_SIZE;
      const wy = getHeightAt(state.map, wx, wz) + 0.03;
      points.push(new THREE.Vector3(wx, wy, wz));
    }

    if (points.length < 2) {
      const geo = new THREE.PlaneGeometry(0.01, 0.01);
      return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false }));
    }

    // Build ribbon with vertex colors (darker edges, lighter center)
    const positions: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];
    const hw = SB.ROAD_WIDTH * 0.5;

    const edgeColor = new THREE.Color(0x7a6a4a);
    const centerColor = new THREE.Color(0xb09868);

    for (let i = 0; i < points.length; i++) {
      const cur = points[i];
      const next = i < points.length - 1 ? points[i + 1] : points[i];
      const prev = i > 0 ? points[i - 1] : points[i];

      const dx = next.x - prev.x;
      const dz = next.z - prev.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      const px = -dz / len * hw;
      const pz = dx / len * hw;

      // Left edge
      positions.push(cur.x + px * 1.3, cur.y - 0.01, cur.z + pz * 1.3);
      // Left
      positions.push(cur.x + px, cur.y, cur.z + pz);
      // Right
      positions.push(cur.x - px, cur.y, cur.z - pz);
      // Right edge
      positions.push(cur.x - px * 1.3, cur.y - 0.01, cur.z - pz * 1.3);

      colors.push(edgeColor.r, edgeColor.g, edgeColor.b);
      colors.push(centerColor.r, centerColor.g, centerColor.b);
      colors.push(centerColor.r, centerColor.g, centerColor.b);
      colors.push(edgeColor.r, edgeColor.g, edgeColor.b);

      if (i < points.length - 1) {
        const vi = i * 4;
        // Left edge strip
        indices.push(vi, vi + 1, vi + 4);
        indices.push(vi + 1, vi + 5, vi + 4);
        // Center strip
        indices.push(vi + 1, vi + 2, vi + 5);
        indices.push(vi + 2, vi + 6, vi + 5);
        // Right edge strip
        indices.push(vi + 2, vi + 3, vi + 6);
        indices.push(vi + 3, vi + 7, vi + 6);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return mesh;
  }

  // -----------------------------------------------------------------------
  // Carriers with visible limbs
  // -----------------------------------------------------------------------

  private _syncCarriers(state: SettlersState, t: number): void {
    for (const [id, mesh] of this._carrierMeshes) {
      if (!state.carriers.has(id)) {
        this.scene.remove(mesh);
        this._carrierMeshes.delete(id);
      }
    }
    for (const [id, carrier] of state.carriers) {
      let mesh = this._carrierMeshes.get(id);
      if (!mesh) {
        mesh = this._createCarrierMesh(state, carrier.owner);
        this._carrierMeshes.set(id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(carrier.position.x, carrier.position.y, carrier.position.z);

      // Face movement direction
      const road = state.roads.get(carrier.roadId);
      if (road && road.path.length >= 2) {
        const p = carrier.pathProgress;
        const idx = Math.floor(p * (road.path.length - 1));
        const next = Math.min(idx + 1, road.path.length - 1);
        if (idx !== next) {
          const dx = road.path[next].x - road.path[idx].x;
          const dz = road.path[next].z - road.path[idx].z;
          if (dx !== 0 || dz !== 0) {
            mesh.rotation.y = Math.atan2(dx, dz) * (carrier.direction === 1 ? 1 : -1);
          }
        }
      }

      // Animate legs
      const leftLeg = mesh.getObjectByName("leftLeg") as THREE.Mesh | undefined;
      const rightLeg = mesh.getObjectByName("rightLeg") as THREE.Mesh | undefined;
      const walkPhase = t * 8 + carrier.pathProgress * 20;
      if (leftLeg) leftLeg.rotation.x = Math.sin(walkPhase) * 0.4;
      if (rightLeg) rightLeg.rotation.x = Math.sin(walkPhase + Math.PI) * 0.4;

      // Show/hide carried resource
      const cargo = mesh.getObjectByName("cargo") as THREE.Mesh | undefined;
      if (cargo) {
        if (carrier.carrying) {
          cargo.visible = true;
          (cargo.material as THREE.MeshStandardMaterial).color.setHex(
            RESOURCE_META[carrier.carrying].color,
          );
        } else {
          cargo.visible = false;
        }
      }
    }
  }

  private _createCarrierMesh(state: SettlersState, owner: string): THREE.Group {
    const g = new THREE.Group();
    const playerColor = this._getPlayerColor(owner, state);
    const h = SB.CARRIER_HEIGHT;

    const bodyMat = new THREE.MeshStandardMaterial({ color: playerColor });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xeeccaa });

    // Body (torso)
    const body = new THREE.Mesh(this._boxGeo, bodyMat);
    body.scale.set(h * 0.5, h * 0.5, h * 0.3);
    body.position.y = h * 0.55;
    g.add(body);

    // Head
    const head = new THREE.Mesh(this._sphereGeo, skinMat);
    head.scale.set(1.3, 1.3, 1.3);
    head.position.y = h * 0.95;
    g.add(head);

    // Hat
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x664422 });
    const hat = new THREE.Mesh(this._coneGeo, hatMat);
    hat.scale.set(h * 0.6, h * 0.3, h * 0.6);
    hat.position.y = h * 1.1;
    g.add(hat);

    // Arms
    for (let side = -1; side <= 1; side += 2) {
      const arm = new THREE.Mesh(this._cylGeo, skinMat);
      arm.scale.set(0.4, h * 0.35, 0.4);
      arm.position.set(side * h * 0.32, h * 0.5, 0);
      arm.rotation.z = side * 0.3;
      g.add(arm);
    }

    // Legs
    const leftLeg = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: 0x554433 }));
    leftLeg.name = "leftLeg";
    leftLeg.scale.set(0.5, h * 0.3, 0.5);
    leftLeg.position.set(-h * 0.12, h * 0.15, 0);
    g.add(leftLeg);

    const rightLeg = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: 0x554433 }));
    rightLeg.name = "rightLeg";
    rightLeg.scale.set(0.5, h * 0.3, 0.5);
    rightLeg.position.set(h * 0.12, h * 0.15, 0);
    g.add(rightLeg);

    // Cargo box (hidden by default)
    const cargoMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const cargo = new THREE.Mesh(this._boxGeo, cargoMat);
    cargo.name = "cargo";
    cargo.scale.set(h * 0.25, h * 0.25, h * 0.25);
    cargo.position.set(0, h * 0.9, -h * 0.2);
    cargo.visible = false;
    g.add(cargo);

    return g;
  }

  // -----------------------------------------------------------------------
  // Soldiers with more detail
  // -----------------------------------------------------------------------

  private _syncSoldiers(state: SettlersState, t: number): void {
    for (const [id, mesh] of this._soldierMeshes) {
      if (!state.soldiers.has(id)) {
        this.scene.remove(mesh);
        this._soldierMeshes.delete(id);
      }
    }
    for (const [id, soldier] of state.soldiers) {
      if (soldier.state === "garrisoned") {
        // Remove mesh if garrisoned
        const mesh = this._soldierMeshes.get(id);
        if (mesh) {
          this.scene.remove(mesh);
          this._soldierMeshes.delete(id);
        }
        continue;
      }

      let mesh = this._soldierMeshes.get(id);
      if (!mesh) {
        mesh = this._createSoldierMesh(state, soldier.owner, soldier.rank);
        this._soldierMeshes.set(id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(soldier.position.x, soldier.position.y, soldier.position.z);

      // Fighting animation
      if (soldier.state === "fighting") {
        const sword = mesh.getObjectByName("sword") as THREE.Mesh | undefined;
        if (sword) {
          sword.rotation.z = Math.PI * 0.15 + Math.sin(t * 6) * 0.5;
        }
      }

      // Marching leg animation
      if (soldier.state === "marching") {
        const leftLeg = mesh.getObjectByName("sLeftLeg") as THREE.Mesh | undefined;
        const rightLeg = mesh.getObjectByName("sRightLeg") as THREE.Mesh | undefined;
        const phase = t * 6;
        if (leftLeg) leftLeg.rotation.x = Math.sin(phase) * 0.3;
        if (rightLeg) rightLeg.rotation.x = Math.sin(phase + Math.PI) * 0.3;
      }
    }
  }

  private _createSoldierMesh(state: SettlersState, owner: string, rank: number): THREE.Group {
    const g = new THREE.Group();
    const playerColor = this._getPlayerColor(owner, state);
    const h = SB.SOLDIER_HEIGHT;

    const bodyMat = new THREE.MeshStandardMaterial({ color: playerColor });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xeeccaa });
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x888899,
      metalness: 0.5,
      roughness: 0.4,
    });

    // Body
    const body = new THREE.Mesh(this._boxGeo, bodyMat);
    body.scale.set(h * 0.45, h * 0.6, h * 0.3);
    body.position.y = h * 0.5;
    g.add(body);

    // Armor chest plate (higher rank = more armor)
    if (rank >= 1) {
      const chestplate = new THREE.Mesh(this._boxGeo, armorMat);
      chestplate.scale.set(h * 0.48, h * 0.4, h * 0.32);
      chestplate.position.y = h * 0.55;
      g.add(chestplate);
    }

    // Head
    const head = new THREE.Mesh(this._sphereGeo, skinMat);
    head.scale.set(1.6, 1.6, 1.6);
    head.position.y = h * 0.95;
    g.add(head);

    // Helmet (gets more elaborate with rank)
    const helmetMat = new THREE.MeshStandardMaterial({
      color: rank >= 3 ? 0xddaa33 : 0x888888,
      metalness: 0.6,
      roughness: 0.3,
    });
    const helmet = new THREE.Mesh(this._sphereGeo, helmetMat);
    helmet.scale.set(1.8, 1.2, 1.8);
    helmet.position.y = h * 1.05;
    g.add(helmet);

    // Helmet crest for rank >= 2
    if (rank >= 2) {
      const crest = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({ color: 0xcc2222 }));
      crest.scale.set(0.03, h * 0.25, h * 0.2);
      crest.position.y = h * 1.2;
      g.add(crest);
    }

    // Shield
    const shieldMat = new THREE.MeshStandardMaterial({
      color: playerColor,
      metalness: 0.2,
      roughness: 0.5,
    });
    const shieldGeo = new THREE.CylinderGeometry(h * 0.22, h * 0.22, 0.04, 6);
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.rotation.z = Math.PI / 2;
    shield.position.set(-h * 0.35, h * 0.5, 0);
    g.add(shield);

    // Shield boss (center bump)
    const boss = new THREE.Mesh(this._sphereGeo, armorMat);
    boss.scale.set(0.5, 0.5, 0.5);
    boss.position.set(-h * 0.37, h * 0.5, 0);
    g.add(boss);

    // Sword
    const swordMat = new THREE.MeshStandardMaterial({
      color: 0xccccdd,
      metalness: 0.7,
      roughness: 0.2,
    });
    const sword = new THREE.Mesh(this._cylGeo, swordMat);
    sword.name = "sword";
    sword.scale.set(0.25, h * 1.0, 0.15);
    sword.position.set(h * 0.35, h * 0.65, 0);
    sword.rotation.z = Math.PI * 0.15;
    g.add(sword);

    // Sword crossguard
    const guard = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({ color: 0x886633 }));
    guard.scale.set(h * 0.2, 0.03, 0.05);
    guard.position.set(h * 0.3, h * 0.4, 0);
    g.add(guard);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x554433 });
    const leftLeg = new THREE.Mesh(this._cylGeo, legMat);
    leftLeg.name = "sLeftLeg";
    leftLeg.scale.set(0.5, h * 0.3, 0.5);
    leftLeg.position.set(-h * 0.12, h * 0.15, 0);
    g.add(leftLeg);

    const rightLeg = new THREE.Mesh(this._cylGeo, legMat);
    rightLeg.name = "sRightLeg";
    rightLeg.scale.set(0.5, h * 0.3, 0.5);
    rightLeg.position.set(h * 0.12, h * 0.15, 0);
    g.add(rightLeg);

    return g;
  }

  // -----------------------------------------------------------------------
  // Territory borders with glow effect
  // -----------------------------------------------------------------------

  private _syncTerritory(state: SettlersState): void {
    if (state.tick % 30 !== 0 && this._territoryLine) return;

    if (this._territoryLine) {
      this.scene.remove(this._territoryLine);
      this._territoryLine = null;
    }

    const map = state.map;
    const positions: number[] = [];
    const colors: number[] = [];

    for (let tz = 0; tz < map.height; tz++) {
      for (let tx = 0; tx < map.width; tx++) {
        const owner = map.territory[tz * map.width + tx];
        if (owner < 0) continue;

        const playerColor = new THREE.Color(PLAYER_COLORS[owner] || 0xffffff);
        // Brighten for visibility
        const brightColor = playerColor.clone();
        brightColor.r = Math.min(1, brightColor.r * 1.3 + 0.1);
        brightColor.g = Math.min(1, brightColor.g * 1.3 + 0.1);
        brightColor.b = Math.min(1, brightColor.b * 1.3 + 0.1);

        const edges: [number, number, number, number][] = [
          [tx, tz, tx + 1, tz],
          [tx + 1, tz, tx + 1, tz + 1],
          [tx, tz + 1, tx + 1, tz + 1],
          [tx, tz, tx, tz + 1],
        ];
        const neighbors: [number, number][] = [
          [tx, tz - 1], [tx + 1, tz], [tx, tz + 1], [tx - 1, tz],
        ];

        for (let e = 0; e < 4; e++) {
          const [nx, nz] = neighbors[e];
          let neighborOwner = -1;
          if (nx >= 0 && nx < map.width && nz >= 0 && nz < map.height) {
            neighborOwner = map.territory[nz * map.width + nx];
          }
          if (neighborOwner !== owner) {
            const [x1, z1, x2, z2] = edges[e];
            const wx1 = x1 * SB.TILE_SIZE;
            const wz1 = z1 * SB.TILE_SIZE;
            const wx2 = x2 * SB.TILE_SIZE;
            const wz2 = z2 * SB.TILE_SIZE;
            const wy1 = getHeightAt(map, wx1, wz1) + 0.2;
            const wy2 = getHeightAt(map, wx2, wz2) + 0.2;

            positions.push(wx1, wy1, wz1, wx2, wy2, wz2);
            colors.push(brightColor.r, brightColor.g, brightColor.b);
            colors.push(brightColor.r, brightColor.g, brightColor.b);
          }
        }
      }
    }

    if (positions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      const pulse = 0.65 + Math.sin(Date.now() * 0.004) * 0.2;
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: 2,
        transparent: true,
        opacity: pulse,
      });
      this._territoryLine = new THREE.LineSegments(geo, mat);
      this.scene.add(this._territoryLine);
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private _getPlayerColor(playerId: string, state: SettlersState): number {
    const player = state.players.get(playerId);
    return player ? player.color : 0xaaaaaa;
  }
}
