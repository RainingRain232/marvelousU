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
import type { SettlersFlag, RoadQuality } from "../state/SettlersRoad";

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
  private _workerMeshes = new Map<string, THREE.Group>();
  private _soldierMeshes = new Map<string, THREE.Group>();
  private _roadMeshes = new Map<string, THREE.Mesh>();
  /** Track road quality so we know when to rebuild road meshes */
  private _roadQualities = new Map<string, string>();

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

  // Frustum culling
  private _frustum = new THREE.Frustum();
  private _projScreenMatrix = new THREE.Matrix4();

  // Road preview line (shown while drawing a road)
  private _roadPreviewLine: THREE.Line | null = null;

  // Cached geometries (higher polygon counts for visual quality)
  private _boxGeo = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
  private _coneGeo = new THREE.ConeGeometry(0.5, 1, 16);
  private _cylGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 16);
  private _sphereGeo = new THREE.SphereGeometry(0.15, 16, 12);

  // Cached geometries for frequently recreated objects (prevents memory leaks)
  private _healthBarBgGeo = new THREE.PlaneGeometry(0.6, 0.06);
  private _healthBarFgGeo = new THREE.PlaneGeometry(0.6, 0.06);
  private _healthBarBuildBgGeo = new THREE.PlaneGeometry(1.2, 0.08);
  private _healthBarBuildFgGeo = new THREE.PlaneGeometry(1.2, 0.08);
  private _healthBarBgMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.7 });
  private _dotGeo = new THREE.SphereGeometry(0.04, 6, 4);
  private _dotMats = new Map<number, THREE.MeshBasicMaterial>();
  private _glowGeo = new THREE.SphereGeometry(0.15, 8, 6);
  private _combatFlashGeo = new THREE.SphereGeometry(0.15, 8, 6);
  private _smokeGeo = new THREE.SphereGeometry(0.18, 8, 6);

  // Resize handler reference (for cleanup)
  private _resizeHandler: (() => void) | null = null;

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

    // Resize handler (stored for cleanup)
    this._resizeHandler = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener("resize", this._resizeHandler);
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

    // Update frustum for culling
    this.camera.updateMatrixWorld();
    this._projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse,
    );
    this._frustum.setFromProjectionMatrix(this._projScreenMatrix);

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
    this._syncWorkers(state, t);
    this._syncSoldiers(state, t);
    this._syncTerritory(state);

    // Frustum-cull entity meshes
    this._frustumCullEntities();

    // Road preview
    this._updateRoadPreview(state);

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
    for (const [, m] of this._workerMeshes) this.scene.remove(m);
    for (const [, m] of this._soldierMeshes) this.scene.remove(m);
    for (const [, m] of this._roadMeshes) this.scene.remove(m);
    for (const [, m] of this._scaffoldMeshes) this.scene.remove(m);
    for (const [, m] of this._spinnerMeshes) this.scene.remove(m);
    this._buildingMeshes.clear();
    this._flagMeshes.clear();
    this._carrierMeshes.clear();
    this._workerMeshes.clear();
    this._soldierMeshes.clear();
    this._roadMeshes.clear();
    this._roadQualities.clear();
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
    // Remove event listeners
    if (this._resizeHandler) {
      window.removeEventListener("resize", this._resizeHandler);
      this._resizeHandler = null;
    }

    // Dispose cached geometries
    this._boxGeo.dispose();
    this._coneGeo.dispose();
    this._cylGeo.dispose();
    this._sphereGeo.dispose();
    this._healthBarBgGeo.dispose();
    this._healthBarFgGeo.dispose();
    this._healthBarBuildBgGeo.dispose();
    this._healthBarBuildFgGeo.dispose();
    this._healthBarBgMat.dispose();
    this._dotGeo.dispose();
    this._glowGeo.dispose();
    this._combatFlashGeo.dispose();
    this._smokeGeo.dispose();
    for (const mat of this._dotMats.values()) mat.dispose();
    this._dotMats.clear();

    // Dispose all mesh maps
    const disposeMesh = (mesh: THREE.Object3D) => {
      mesh.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m: THREE.Material) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    };
    for (const [, mesh] of this._buildingMeshes) disposeMesh(mesh);
    for (const [, mesh] of this._flagMeshes) disposeMesh(mesh);
    for (const [, mesh] of this._roadMeshes) disposeMesh(mesh);
    for (const [, mesh] of this._carrierMeshes) disposeMesh(mesh);
    for (const [, mesh] of this._workerMeshes) disposeMesh(mesh);
    for (const [, mesh] of this._soldierMeshes) disposeMesh(mesh);
    for (const [, mesh] of this._scaffoldMeshes) disposeMesh(mesh);
    for (const [, mesh] of this._spinnerMeshes) disposeMesh(mesh);
    this._buildingMeshes.clear();
    this._flagMeshes.clear();
    this._roadMeshes.clear();
    this._roadQualities.clear();
    this._carrierMeshes.clear();
    this._workerMeshes.clear();
    this._soldierMeshes.clear();
    this._scaffoldMeshes.clear();
    this._spinnerMeshes.clear();

    // Dispose combat flashes
    for (const f of this._combatFlashes) {
      this.scene.remove(f.mesh);
      (f.mesh.material as THREE.Material).dispose();
    }
    this._combatFlashes.length = 0;

    // Dispose smoke particles
    for (const p of this._smokeParticles) {
      this._smokeGroup.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    this._smokeParticles.length = 0;

    // Dispose shared materials
    this._wallMat?.dispose();
    this._wallDarkMat?.dispose();
    this._woodMat?.dispose();
    this._stoneMat?.dispose();
    this._windowMat?.dispose();
    this._chimneyMat?.dispose();

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

        const mesh = new THREE.Mesh(this._smokeGeo, this._smokeMat.clone());
        const smokeScale = 0.8 + Math.random() * 0.6;
        mesh.scale.set(smokeScale, smokeScale, smokeScale);
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
        // Only dispose cloned material (geometry is shared/cached)
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

  // Cached health bar foreground materials (reused each frame)
  private _hpBarGreenMat = new THREE.MeshBasicMaterial({ color: 0x44cc44, side: THREE.DoubleSide, depthTest: false });
  private _hpBarYellowMat = new THREE.MeshBasicMaterial({ color: 0xcccc44, side: THREE.DoubleSide, depthTest: false });
  private _hpBarRedMat = new THREE.MeshBasicMaterial({ color: 0xcc4444, side: THREE.DoubleSide, depthTest: false });

  private _getHpBarMat(hpPct: number): THREE.MeshBasicMaterial {
    return hpPct > 0.5 ? this._hpBarGreenMat : hpPct > 0.25 ? this._hpBarYellowMat : this._hpBarRedMat;
  }

  private _updateHealthBars(state: SettlersState): void {
    // Remove old meshes without disposing shared geometry/materials
    while (this._healthBarGroup.children.length > 0) {
      this._healthBarGroup.remove(this._healthBarGroup.children[0]);
    }

    // Soldier health bars (reuse cached geo & materials)
    for (const [, soldier] of state.soldiers) {
      if (soldier.state === "garrisoned") continue;
      if (soldier.hp >= soldier.maxHp) continue;

      const hpPct = Math.max(0, soldier.hp / soldier.maxHp);

      const bg = new THREE.Mesh(this._healthBarBgGeo, this._healthBarBgMat);
      bg.position.set(soldier.position.x, soldier.position.y + SB.SOLDIER_HEIGHT + 0.35, soldier.position.z);
      bg.lookAt(this.camera.position);
      this._healthBarGroup.add(bg);

      const fg = new THREE.Mesh(this._healthBarFgGeo, this._getHpBarMat(hpPct));
      fg.scale.x = hpPct;
      fg.position.set(
        soldier.position.x - (1 - hpPct) * 0.3,
        soldier.position.y + SB.SOLDIER_HEIGHT + 0.35,
        soldier.position.z,
      );
      fg.lookAt(this.camera.position);
      this._healthBarGroup.add(fg);
    }

    // Damaged building health bars (reuse cached geo & materials)
    for (const [, building] of state.buildings) {
      if (building.hp >= building.maxHp) continue;
      const def = BUILDING_DEFS[building.type];
      const hpPct = Math.max(0, building.hp / building.maxHp);

      const cx = (building.tileX + def.footprint.w * 0.5) * SB.TILE_SIZE;
      const cz = (building.tileZ + def.footprint.h * 0.5) * SB.TILE_SIZE;
      const wy = getHeightAt(state.map, cx, cz);
      const buildH = def.size === "large" ? 3.5 : def.size === "medium" ? 2.5 : 2.0;

      const bg = new THREE.Mesh(this._healthBarBuildBgGeo, this._healthBarBgMat);
      bg.position.set(cx, wy + buildH, cz);
      bg.lookAt(this.camera.position);
      this._healthBarGroup.add(bg);

      const fg = new THREE.Mesh(this._healthBarBuildFgGeo, this._getHpBarMat(hpPct));
      fg.scale.x = hpPct;
      fg.position.set(cx - (1 - hpPct) * 0.6, wy + buildH, cz);
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
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffff44,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
        });
        const flash = new THREE.Mesh(this._combatFlashGeo, mat);
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
        // Only dispose material (geometry is shared/cached)
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
        mesh.traverse((child: any) => {
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
        scaffold.traverse((child: any) => {
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

      // Animate mill windmill sails
      if (building.type === SettlersBuildingType.MILL && progress >= 1) {
        const speed = building.active ? 1.5 : 0.2; // Spin faster when active
        for (let s = 0; s < 4; s++) {
          const sail = mesh.getObjectByName(`sail${s}`) as THREE.Object3D | undefined;
          if (sail) {
            sail.rotation.z = (s / 4) * Math.PI * 2 + t * speed;
          }
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

  // Helper: create a ridged (A-frame) roof from vertices
  private _createRidgeRoof(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
    const hw = w * 0.5, hd = d * 0.5;
    const overhang = w * 0.08;
    const verts = new Float32Array([
      // Left slope
      -(hw + overhang), 0, -(hd + overhang),
      0, h, -(hd * 0.3),
      0, h, hd * 0.3,
      -(hw + overhang), 0, hd + overhang,
      // Right slope
      (hw + overhang), 0, -(hd + overhang),
      0, h, -(hd * 0.3),
      0, h, hd * 0.3,
      (hw + overhang), 0, hd + overhang,
      // Front gable
      -(hw + overhang), 0, -(hd + overhang),
      (hw + overhang), 0, -(hd + overhang),
      0, h, -(hd * 0.3),
      // Back gable
      -(hw + overhang), 0, hd + overhang,
      (hw + overhang), 0, hd + overhang,
      0, h, hd * 0.3,
    ]);
    const idx = [0,1,2, 0,2,3, 4,6,5, 4,7,6, 8,10,9, 11,12,13];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }

  // Helper: add stone foundation blocks around a building base
  private _addFoundation(g: THREE.Group, w: number, d: number, h: number): void {
    const stoneCol = [0x808078, 0x8a8a80, 0x757568, 0x929288];
    const hw = w * 0.5, hd = d * 0.5;
    const stoneH = h * 0.12;
    // Place irregular stone blocks along bottom edges
    for (let side = 0; side < 4; side++) {
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const t = (i + 0.2) / count;
        const mat = new THREE.MeshStandardMaterial({ color: stoneCol[i % 4], roughness: 0.95 });
        (mat as THREE.MeshStandardMaterial).transparent = true;
        const stone = new THREE.Mesh(this._boxGeo, mat);
        const sw = w * (0.06 + Math.random() * 0.05);
        const sh = stoneH * (0.7 + Math.random() * 0.6);
        const sd = 0.06 + Math.random() * 0.04;
        stone.scale.set(sw, sh, sd);
        if (side === 0) stone.position.set(-hw + t * w, sh * 0.5, hd + 0.01);
        else if (side === 1) stone.position.set(-hw + t * w, sh * 0.5, -hd - 0.01);
        else if (side === 2) { stone.position.set(hw + 0.01, sh * 0.5, -hd + t * d); stone.rotation.y = Math.PI * 0.5; }
        else { stone.position.set(-hw - 0.01, sh * 0.5, -hd + t * d); stone.rotation.y = Math.PI * 0.5; }
        g.add(stone);
      }
    }
  }

  // Helper: add timber framing on a wall face
  private _addTimberFrame(g: THREE.Group, w: number, wallH: number, z: number, woodMat: THREE.Material): void {
    const hw = w * 0.5;
    const makeBeam = (sx: number, sy: number, sz: number, px: number, py: number, pz: number, rz = 0) => {
      const b = new THREE.Mesh(this._boxGeo, woodMat);
      (b.material as THREE.MeshStandardMaterial).transparent = true;
      b.scale.set(sx, sy, sz);
      b.position.set(px, py, pz);
      b.rotation.z = rz;
      g.add(b);
    };
    // Corner posts
    makeBeam(0.04, wallH, 0.04, -hw + 0.02, wallH * 0.5, z);
    makeBeam(0.04, wallH, 0.04, hw - 0.02, wallH * 0.5, z);
    // Mid post
    makeBeam(0.03, wallH, 0.03, 0, wallH * 0.5, z);
    // Top plate
    makeBeam(w, 0.03, 0.03, 0, wallH, z);
    // Bottom plate
    makeBeam(w, 0.03, 0.03, 0, 0, z);
    // Mid rail
    makeBeam(w * 0.48, 0.025, 0.025, -hw * 0.5, wallH * 0.5, z);
    makeBeam(w * 0.48, 0.025, 0.025, hw * 0.5, wallH * 0.5, z);
    // Diagonal braces
    makeBeam(0.025, hw * 0.7, 0.02, -hw * 0.5, wallH * 0.5, z, 0.45);
    makeBeam(0.025, hw * 0.7, 0.02, hw * 0.5, wallH * 0.5, z, -0.45);
  }

  // Helper: add a detailed window with frame and shutters
  private _addWindow(g: THREE.Group, x: number, y: number, z: number, size: number): void {
    // Glass pane
    const win = new THREE.Mesh(this._boxGeo, this._windowMat);
    win.scale.set(size, size * 1.3, 0.02);
    win.position.set(x, y, z);
    g.add(win);
    // Wooden frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.8 });
    (frameMat as THREE.MeshStandardMaterial).transparent = true;
    // Top/bottom
    const ft = new THREE.Mesh(this._boxGeo, frameMat);
    ft.scale.set(size * 1.2, 0.015, 0.025);
    ft.position.set(x, y + size * 0.65, z + 0.01);
    g.add(ft);
    const fb = ft.clone(); fb.position.set(x, y - size * 0.65, z + 0.01); g.add(fb);
    // Sides
    const fs = new THREE.Mesh(this._boxGeo, frameMat);
    fs.scale.set(0.015, size * 1.3, 0.025);
    fs.position.set(x - size * 0.6, y, z + 0.01);
    g.add(fs);
    const fs2 = fs.clone(); fs2.position.set(x + size * 0.6, y, z + 0.01); g.add(fs2);
    // Cross divider
    const cx2 = new THREE.Mesh(this._boxGeo, frameMat);
    cx2.scale.set(size * 1.1, 0.01, 0.02);
    cx2.position.set(x, y, z + 0.012);
    g.add(cx2);
    const cv = new THREE.Mesh(this._boxGeo, frameMat);
    cv.scale.set(0.01, size * 1.25, 0.02);
    cv.position.set(x, y, z + 0.012);
    g.add(cv);
    // Shutters (angled open)
    const shutMat = new THREE.MeshStandardMaterial({ color: 0x5a7a3a, roughness: 0.85 });
    (shutMat as THREE.MeshStandardMaterial).transparent = true;
    for (let side = -1; side <= 1; side += 2) {
      const sh = new THREE.Mesh(this._boxGeo, shutMat);
      sh.scale.set(size * 0.45, size * 1.2, 0.015);
      sh.position.set(x + side * size * 0.75, y, z + 0.02);
      sh.rotation.y = side * 0.35;
      g.add(sh);
      // Shutter hinge detail
      const hinge = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
      hinge.scale.set(0.01, 0.02, 0.015);
      hinge.position.set(x + side * size * 0.55, y + size * 0.4, z + 0.025);
      g.add(hinge);
    }
  }

  // Helper: add a detailed door with arch and handle
  private _addDoor(g: THREE.Group, x: number, z: number, w: number, h: number): void {
    const doorMat = this._woodMat.clone();
    (doorMat as THREE.MeshStandardMaterial).transparent = true;
    (doorMat as THREE.MeshStandardMaterial).color.set(0x5c3a1e);
    const door = new THREE.Mesh(this._boxGeo, doorMat);
    door.scale.set(w, h, 0.04);
    door.position.set(x, h * 0.5, z);
    g.add(door);
    // Door planks (vertical lines)
    const plankMat = new THREE.MeshStandardMaterial({ color: 0x4a2e16, roughness: 0.9 });
    (plankMat as THREE.MeshStandardMaterial).transparent = true;
    for (let p = -1; p <= 1; p++) {
      const plank = new THREE.Mesh(this._boxGeo, plankMat);
      plank.scale.set(0.006, h * 0.9, 0.005);
      plank.position.set(x + p * w * 0.25, h * 0.5, z + 0.025);
      g.add(plank);
    }
    // Door frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.8 });
    (frameMat as THREE.MeshStandardMaterial).transparent = true;
    const frameL = new THREE.Mesh(this._boxGeo, frameMat);
    frameL.scale.set(0.025, h * 1.05, 0.05);
    frameL.position.set(x - w * 0.52, h * 0.5, z);
    g.add(frameL);
    const frameR = frameL.clone();
    frameR.position.set(x + w * 0.52, h * 0.5, z);
    g.add(frameR);
    // Arch above door
    const arch = new THREE.Mesh(this._boxGeo, frameMat);
    arch.scale.set(w * 1.15, 0.035, 0.05);
    arch.position.set(x, h * 1.02, z);
    g.add(arch);
    // Handle
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.3 });
    const handle = new THREE.Mesh(this._sphereGeo, handleMat);
    handle.scale.set(0.4, 0.4, 0.4);
    handle.position.set(x + w * 0.25, h * 0.45, z + 0.03);
    g.add(handle);
  }

  // Helper: chimney with cap and smoke opening
  private _addChimney(g: THREE.Group, x: number, baseY: number, z: number, r: number, h: number): void {
    // Main shaft (slightly tapered)
    const chimneyGeo = new THREE.CylinderGeometry(r * 0.85, r, h, 6);
    const chimney = new THREE.Mesh(chimneyGeo, this._chimneyMat);
    chimney.position.set(x, baseY + h * 0.5, z);
    chimney.castShadow = true;
    g.add(chimney);
    // Chimney cap (wider ring at top)
    const capGeo = new THREE.CylinderGeometry(r * 1.1, r * 1.1, h * 0.08, 6);
    const cap = new THREE.Mesh(capGeo, this._chimneyMat);
    cap.position.set(x, baseY + h * 1.0, z);
    g.add(cap);
    // Dark interior
    const innerGeo = new THREE.CylinderGeometry(r * 0.6, r * 0.6, 0.02, 6);
    const inner = new THREE.Mesh(innerGeo, new THREE.MeshBasicMaterial({ color: 0x111111 }));
    inner.position.set(x, baseY + h * 1.01, z);
    g.add(inner);
  }

  // Helper: add a porch/awning over a door
  private _addPorch(g: THREE.Group, x: number, y: number, z: number, w: number, d: number): void {
    // Awning roof (tilted plane)
    const awningMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2a, roughness: 0.8, side: THREE.DoubleSide });
    (awningMat as THREE.MeshStandardMaterial).transparent = true;
    const awning = new THREE.Mesh(this._boxGeo, awningMat);
    awning.scale.set(w * 1.2, 0.02, d);
    awning.position.set(x, y, z + d * 0.5);
    awning.rotation.x = 0.2;
    g.add(awning);
    // Support posts
    const postMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });
    (postMat as THREE.MeshStandardMaterial).transparent = true;
    for (let side = -1; side <= 1; side += 2) {
      const post = new THREE.Mesh(this._cylGeo, postMat);
      post.scale.set(0.4, y * 0.95, 0.4);
      post.position.set(x + side * w * 0.5, y * 0.47, z + d * 0.85);
      g.add(post);
    }
  }

  private _createBuildingMesh(building: SettlersBuilding, state: SettlersState): THREE.Group {
    const def = BUILDING_DEFS[building.type];
    const g = new THREE.Group();
    const playerColor = this._getPlayerColor(building.owner, state);
    const roofMat = new THREE.MeshStandardMaterial({ color: playerColor, roughness: 0.75, transparent: true });
    const roofDarkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(playerColor).multiplyScalar(0.7).getHex(),
      roughness: 0.8, transparent: true,
    });

    const ts = SB.TILE_SIZE;
    const fw = def.footprint.w * ts;
    const fh = def.footprint.h * ts;

    if (def.garrisonSlots > 0) {
      // ===== MILITARY BUILDING – detailed stone tower =====
      const towerR = fw * 0.35;
      const towerH = fw * 1.4;

      // Battered (tapered) tower walls with stone texture
      const towerGeo = new THREE.CylinderGeometry(towerR * 0.9, towerR * 1.05, towerH, 12);
      const towerMat = this._stoneMat.clone();
      (towerMat as THREE.MeshStandardMaterial).transparent = true;
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.y = towerH * 0.5;
      tower.castShadow = true;
      g.add(tower);

      // Stone course lines (horizontal rings at intervals)
      for (let row = 0; row < 5; row++) {
        const ringY = towerH * (0.1 + row * 0.18);
        const ringR = towerR * (1.05 - row * 0.03);
        const ringGeo = new THREE.TorusGeometry(ringR, 0.015, 4, 12);
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ color: 0x777770, roughness: 0.95 }));
        ring.position.y = ringY;
        ring.rotation.x = Math.PI * 0.5;
        g.add(ring);
      }

      // Battlements with crenellation gaps
      const merlonCount = 10;
      for (let m = 0; m < merlonCount; m++) {
        const angle = (m / merlonCount) * Math.PI * 2;
        const merlon = new THREE.Mesh(this._boxGeo, this._stoneMat.clone());
        (merlon.material as THREE.MeshStandardMaterial).transparent = true;
        merlon.scale.set(0.18, 0.3, 0.18);
        merlon.position.set(
          Math.cos(angle) * towerR * 0.92,
          towerH + 0.15,
          Math.sin(angle) * towerR * 0.92,
        );
        merlon.rotation.y = angle;
        g.add(merlon);
      }

      // Walkway ring at top
      const walkwayGeo = new THREE.TorusGeometry(towerR * 0.92, towerR * 0.12, 4, 12);
      const walkway = new THREE.Mesh(walkwayGeo, this._stoneMat.clone());
      (walkway.material as THREE.MeshStandardMaterial).transparent = true;
      walkway.position.y = towerH;
      walkway.rotation.x = Math.PI * 0.5;
      g.add(walkway);

      // Machicolations (overhanging supports under battlements)
      for (let m = 0; m < 6; m++) {
        const angle = (m / 6) * Math.PI * 2;
        const bracket = new THREE.Mesh(this._boxGeo, this._stoneMat.clone());
        (bracket.material as THREE.MeshStandardMaterial).transparent = true;
        bracket.scale.set(0.08, 0.12, 0.15);
        bracket.position.set(
          Math.cos(angle) * towerR * 1.02,
          towerH - 0.06,
          Math.sin(angle) * towerR * 1.02,
        );
        bracket.rotation.y = angle;
        g.add(bracket);
      }

      // Flag pole and pennant
      const flagPole = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: 0x8b7355 }));
      flagPole.scale.set(0.4, 0.7, 0.4);
      flagPole.position.y = towerH + 0.6;
      g.add(flagPole);

      const pennantGeo = new THREE.BufferGeometry();
      const verts = new Float32Array([0, 0, 0, 0.45, -0.05, 0.02, 0.2, -0.18, 0, 0, -0.15, -0.01]);
      const pennIdx = [0, 1, 2, 0, 2, 3];
      pennantGeo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      pennantGeo.setIndex(pennIdx);
      pennantGeo.computeVertexNormals();
      const pennant = new THREE.Mesh(pennantGeo, new THREE.MeshStandardMaterial({ color: playerColor, side: THREE.DoubleSide }));
      pennant.position.y = towerH + 0.88;
      g.add(pennant);

      // Arched doorway
      this._addDoor(g, 0, towerR + 0.03, 0.22, 0.4);

      // Arrow slits (taller, more of them, on multiple levels)
      for (let level = 0; level < 2; level++) {
        for (let s = 0; s < 4; s++) {
          const angle = (s / 4) * Math.PI * 2 + 0.4 + level * 0.4;
          const slitMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
          const slit = new THREE.Mesh(this._boxGeo, slitMat);
          slit.scale.set(0.025, 0.18, 0.015);
          const r2 = towerR + 0.015;
          slit.position.set(
            Math.cos(angle) * r2,
            towerH * (0.3 + level * 0.3),
            Math.sin(angle) * r2,
          );
          slit.lookAt(new THREE.Vector3(0, towerH * (0.3 + level * 0.3), 0));
          g.add(slit);
          // Stone frame around slit
          const frame = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({ color: 0x999990, roughness: 0.9 }));
          frame.scale.set(0.05, 0.22, 0.025);
          frame.position.copy(slit.position);
          frame.lookAt(new THREE.Vector3(0, towerH * (0.3 + level * 0.3), 0));
          g.add(frame);
        }
      }

      // Base stone foundation
      const baseGeo = new THREE.CylinderGeometry(towerR * 1.12, towerR * 1.15, towerH * 0.08, 12);
      const baseMesh = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ color: 0x706860, roughness: 0.95 }));
      baseMesh.position.y = towerH * 0.04;
      g.add(baseMesh);

    } else if (def.type === SettlersBuildingType.HEADQUARTERS) {
      // ===== HQ – grand multi-story timber-framed manor =====
      const wallH1 = fw * 0.5;
      const wallH2 = fw * 0.35;

      // Stone foundation
      const foundation = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({ color: 0x706860, roughness: 0.95 }));
      (foundation.material as THREE.MeshStandardMaterial).transparent = true;
      foundation.scale.set(fw * 0.9, fw * 0.08, fh * 0.9);
      foundation.position.y = fw * 0.04;
      g.add(foundation);
      this._addFoundation(g, fw * 0.85, fh * 0.85, fw * 0.5);

      // Ground floor walls
      const base = new THREE.Mesh(this._boxGeo, this._wallMat.clone());
      (base.material as THREE.MeshStandardMaterial).transparent = true;
      base.scale.set(fw * 0.85, wallH1, fh * 0.85);
      base.position.y = wallH1 * 0.5 + fw * 0.08;
      base.castShadow = true;
      g.add(base);

      // Timber framing on front and back
      const woodMat = this._woodMat.clone();
      (woodMat as THREE.MeshStandardMaterial).transparent = true;
      this._addTimberFrame(g, fw * 0.85, wallH1, fh * 0.43, woodMat);
      this._addTimberFrame(g, fw * 0.85, wallH1, -fh * 0.43, woodMat);

      // Second floor (slightly overhanging – jettied)
      const upper = new THREE.Mesh(this._boxGeo, this._wallDarkMat.clone());
      (upper.material as THREE.MeshStandardMaterial).transparent = true;
      upper.scale.set(fw * 0.75, wallH2, fh * 0.75);
      upper.position.y = wallH1 + wallH2 * 0.5 + fw * 0.08;
      upper.castShadow = true;
      g.add(upper);

      // Jetty overhang trim
      const jettyTrim = new THREE.Mesh(this._boxGeo, woodMat);
      jettyTrim.scale.set(fw * 0.78, 0.03, fh * 0.78);
      jettyTrim.position.y = wallH1 + fw * 0.08;
      g.add(jettyTrim);

      // Ridge roof instead of cone
      const roofH = fw * 0.55;
      const roof = this._createRidgeRoof(fw * 0.85, roofH, fh * 0.85, roofMat);
      roof.position.y = wallH1 + wallH2 + fw * 0.08;
      g.add(roof);

      // Roof ridge beam
      const ridgeBeam = new THREE.Mesh(this._boxGeo, woodMat);
      ridgeBeam.scale.set(0.03, 0.03, fh * 0.6);
      ridgeBeam.position.y = wallH1 + wallH2 + roofH + fw * 0.08;
      g.add(ridgeBeam);

      // Dormer window on roof
      const dormerBase = new THREE.Mesh(this._boxGeo, this._wallMat.clone());
      (dormerBase.material as THREE.MeshStandardMaterial).transparent = true;
      dormerBase.scale.set(fw * 0.18, fw * 0.15, fw * 0.12);
      dormerBase.position.set(fw * 0.15, wallH1 + wallH2 + roofH * 0.35 + fw * 0.08, -fh * 0.35);
      g.add(dormerBase);
      const dormerRoof = new THREE.Mesh(this._coneGeo, roofDarkMat);
      dormerRoof.scale.set(fw * 0.22, fw * 0.12, fw * 0.15);
      dormerRoof.position.set(fw * 0.15, wallH1 + wallH2 + roofH * 0.35 + fw * 0.16, -fh * 0.35);
      g.add(dormerRoof);

      // Grand entrance door with porch
      this._addDoor(g, 0, fh * 0.43, fw * 0.16, fw * 0.28);
      this._addPorch(g, 0, fw * 0.35, fh * 0.43, fw * 0.25, fw * 0.15);

      // Windows – ground floor
      for (let side = -1; side <= 1; side += 2) {
        this._addWindow(g, side * fw * 0.25, fw * 0.32, fh * 0.435, 0.09);
      }
      // Windows – upper floor
      for (let side = -1; side <= 1; side += 2) {
        this._addWindow(g, side * fw * 0.2, wallH1 + wallH2 * 0.45 + fw * 0.08, fh * 0.385, 0.07);
      }
      // Side windows
      for (let row = 0; row < 2; row++) {
        this._addWindow(g, fw * 0.435, fw * (0.25 + row * 0.38), fh * 0.1, 0.07);
      }

      // Chimney with cap
      this._addChimney(g, fw * 0.25, wallH1 + wallH2 + roofH * 0.5, fh * 0.15, 0.08, fw * 0.35);

      // Flower boxes under ground floor windows
      const flowerMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });
      (flowerMat as THREE.MeshStandardMaterial).transparent = true;
      for (let side = -1; side <= 1; side += 2) {
        const box = new THREE.Mesh(this._boxGeo, flowerMat);
        box.scale.set(0.12, 0.025, 0.035);
        box.position.set(side * fw * 0.25, fw * 0.2, fh * 0.46);
        g.add(box);
        // Flowers
        for (let f = -1; f <= 1; f++) {
          const flower = new THREE.Mesh(this._sphereGeo, new THREE.MeshStandardMaterial({
            color: [0xdd4444, 0xdddd44, 0xff88aa][f + 1], roughness: 0.7,
          }));
          flower.scale.set(0.35, 0.35, 0.35);
          flower.position.set(side * fw * 0.25 + f * 0.035, fw * 0.22, fh * 0.46);
          g.add(flower);
        }
      }

    } else if (def.size === "large") {
      // ===== Large production building – detailed workshop =====
      const wallH = fw * 0.5;

      // Stone foundation
      const foundation = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({ color: 0x706860, roughness: 0.95 }));
      (foundation.material as THREE.MeshStandardMaterial).transparent = true;
      foundation.scale.set(fw * 0.85, fw * 0.06, fh * 0.85);
      foundation.position.y = fw * 0.03;
      g.add(foundation);
      this._addFoundation(g, fw * 0.8, fh * 0.8, wallH);

      // Main walls
      const base = new THREE.Mesh(this._boxGeo, this._wallMat.clone());
      (base.material as THREE.MeshStandardMaterial).transparent = true;
      base.scale.set(fw * 0.8, wallH, fh * 0.8);
      base.position.y = wallH * 0.5 + fw * 0.06;
      base.castShadow = true;
      g.add(base);

      // Timber framing on front and sides
      const woodMat = this._woodMat.clone();
      (woodMat as THREE.MeshStandardMaterial).transparent = true;
      this._addTimberFrame(g, fw * 0.8, wallH, fh * 0.41, woodMat);

      // Side timber verticals
      for (let side = -1; side <= 1; side += 2) {
        const vBeam = new THREE.Mesh(this._boxGeo, woodMat);
        vBeam.scale.set(0.035, wallH, 0.035);
        vBeam.position.set(side * fw * 0.4, wallH * 0.5 + fw * 0.06, 0);
        g.add(vBeam);
      }

      // Ridge roof
      const roofH = fw * 0.45;
      const roof = this._createRidgeRoof(fw * 0.82, roofH, fh * 0.82, roofMat);
      roof.position.y = wallH + fw * 0.06;
      g.add(roof);

      // Roof trim
      const trimMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });
      (trimMat as THREE.MeshStandardMaterial).transparent = true;
      const trim = new THREE.Mesh(this._boxGeo, trimMat);
      trim.scale.set(fw * 0.84, 0.025, 0.03);
      trim.position.set(0, wallH + fw * 0.06, fh * 0.42);
      g.add(trim);
      const trimB = trim.clone(); trimB.position.set(0, wallH + fw * 0.06, -fh * 0.42); g.add(trimB);

      // Door
      this._addDoor(g, 0, fh * 0.41, fw * 0.12, fw * 0.22);

      // Windows with shutters
      this._addWindow(g, -fw * 0.22, fw * 0.32, fh * 0.415, 0.07);
      this._addWindow(g, fw * 0.22, fw * 0.32, fh * 0.415, 0.07);

      // Chimney
      this._addChimney(g, fw * 0.22, wallH + roofH * 0.3, -fh * 0.1, 0.06, fw * 0.3);

      // Work bench / anvil outside (production detail)
      const benchMat = new THREE.MeshStandardMaterial({ color: 0x8b6b3a, roughness: 0.85 });
      (benchMat as THREE.MeshStandardMaterial).transparent = true;
      const bench = new THREE.Mesh(this._boxGeo, benchMat);
      bench.scale.set(fw * 0.2, fw * 0.12, fw * 0.1);
      bench.position.set(-fw * 0.35, fw * 0.06, fh * 0.5);
      g.add(bench);
      // Bench legs
      for (let lx = -1; lx <= 1; lx += 2) {
        const leg = new THREE.Mesh(this._cylGeo, benchMat);
        leg.scale.set(0.3, fw * 0.12, 0.3);
        leg.position.set(-fw * 0.35 + lx * fw * 0.08, fw * 0.06, fh * 0.5);
        g.add(leg);
      }

    } else if (def.size === "medium") {
      // ===== Medium building – cottage with character =====
      const wallH = fw * 0.45;

      // Foundation
      this._addFoundation(g, fw * 0.7, fh * 0.7, wallH);

      // Walls
      const base = new THREE.Mesh(this._boxGeo, this._wallMat.clone());
      (base.material as THREE.MeshStandardMaterial).transparent = true;
      base.scale.set(fw * 0.7, wallH, fh * 0.7);
      base.position.y = wallH * 0.5;
      base.castShadow = true;
      g.add(base);

      // Timber framing – X pattern plus verticals
      const woodMat = this._woodMat.clone();
      (woodMat as THREE.MeshStandardMaterial).transparent = true;
      // Corner posts
      for (let sx = -1; sx <= 1; sx += 2) {
        const post = new THREE.Mesh(this._boxGeo, woodMat);
        post.scale.set(0.035, wallH, 0.035);
        post.position.set(sx * fw * 0.345, wallH * 0.5, fh * 0.355);
        g.add(post);
      }
      // Diagonal braces on front
      for (let d = -1; d <= 1; d += 2) {
        const xBeam = new THREE.Mesh(this._boxGeo, woodMat);
        xBeam.scale.set(0.025, fw * 0.42, 0.025);
        xBeam.position.set(d * fw * 0.12, wallH * 0.5, fh * 0.36);
        xBeam.rotation.z = d * 0.42;
        g.add(xBeam);
      }
      // Horizontal mid-rail
      const hBeam = new THREE.Mesh(this._boxGeo, woodMat);
      hBeam.scale.set(fw * 0.68, 0.025, 0.025);
      hBeam.position.set(0, wallH * 0.55, fh * 0.36);
      g.add(hBeam);

      // Ridge roof
      const roofH = fw * 0.4;
      const roof = this._createRidgeRoof(fw * 0.72, roofH, fh * 0.72, roofMat);
      roof.position.y = wallH;
      g.add(roof);

      // Door with frame
      this._addDoor(g, 0, fh * 0.36, fw * 0.1, fw * 0.2);

      // Window with shutters
      this._addWindow(g, -fw * 0.2, fw * 0.3, fh * 0.365, 0.055);

      // Side window
      this._addWindow(g, fw * 0.36, fw * 0.28, fh * 0.05, 0.045);

      // Chimney
      this._addChimney(g, fw * 0.18, wallH + roofH * 0.25, 0, 0.05, fw * 0.25);

      // Barrel or crate beside building
      const barrelMat = new THREE.MeshStandardMaterial({ color: 0x8b6b3a, roughness: 0.85 });
      (barrelMat as THREE.MeshStandardMaterial).transparent = true;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.12, 8), barrelMat);
      barrel.position.set(fw * 0.42, 0.06, fh * 0.2);
      g.add(barrel);
      // Barrel hoops
      for (let h2 = 0; h2 < 2; h2++) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.005, 4, 8), new THREE.MeshStandardMaterial({ color: 0x444444 }));
        hoop.position.set(fw * 0.42, 0.03 + h2 * 0.06, fh * 0.2);
        hoop.rotation.x = Math.PI * 0.5;
        g.add(hoop);
      }

    } else {
      // ===== Small building – detailed hut =====
      const wallH = fw * 0.35;

      // Foundation stones
      this._addFoundation(g, fw * 0.6, fh * 0.6, wallH);

      // Walls with slight taper (wider at base)
      const wallGeo = new THREE.BoxGeometry(fw * 0.6, wallH, fh * 0.6);
      const base = new THREE.Mesh(wallGeo, this._wallMat.clone());
      (base.material as THREE.MeshStandardMaterial).transparent = true;
      base.position.y = wallH * 0.5;
      base.castShadow = true;
      g.add(base);

      // Corner posts
      const woodMat = this._woodMat.clone();
      (woodMat as THREE.MeshStandardMaterial).transparent = true;
      for (let sx = -1; sx <= 1; sx += 2) {
        for (let sz = -1; sz <= 1; sz += 2) {
          const post = new THREE.Mesh(this._boxGeo, woodMat);
          post.scale.set(0.03, wallH, 0.03);
          post.position.set(sx * fw * 0.295, wallH * 0.5, sz * fh * 0.295);
          g.add(post);
        }
      }

      // Ridge roof
      const roofH = fw * 0.35;
      const roof = this._createRidgeRoof(fw * 0.62, roofH, fh * 0.62, roofMat);
      roof.position.y = wallH;
      g.add(roof);

      // Door
      this._addDoor(g, 0, fh * 0.31, fw * 0.08, fw * 0.16);

      // Small window
      this._addWindow(g, -fw * 0.16, fw * 0.24, fh * 0.315, 0.04);

      // Chimney
      this._addChimney(g, fw * 0.15, wallH + roofH * 0.2, 0, 0.04, fw * 0.2);

      // Log pile beside building
      const logMat = new THREE.MeshStandardMaterial({ color: 0x7a5a2a, roughness: 0.9 });
      (logMat as THREE.MeshStandardMaterial).transparent = true;
      for (let l = 0; l < 3; l++) {
        const log = new THREE.Mesh(this._cylGeo, logMat);
        log.scale.set(0.25, fw * 0.15, 0.25);
        log.rotation.z = Math.PI * 0.5;
        log.position.set(fw * 0.38, 0.03 + l * 0.04, fh * (0.05 + l * 0.02));
        g.add(log);
      }
    }

    // ===== Building-type-specific props and details =====
    this._addBuildingTypeProps(g, def.type, fw, fh);

    // Position in world
    const cx = (building.tileX + def.footprint.w * 0.5) * ts;
    const cz = (building.tileZ + def.footprint.h * 0.5) * ts;
    const wy = getHeightAt(state.map, cx, cz);
    g.position.set(cx, wy, cz);

    return g;
  }

  private _addBuildingTypeProps(g: THREE.Group, type: SettlersBuildingType, fw: number, fh: number): void {
    const woodCol = 0x6b4226;
    const ironCol = 0x666677;

    switch (type) {
      case SettlersBuildingType.WOODCUTTER: {
        // Axe leaning against wall
        const axeHandle = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: woodCol, roughness: 0.9 }));
        axeHandle.scale.set(0.15, fw * 0.25, 0.15);
        axeHandle.position.set(fw * 0.35, fw * 0.12, fh * 0.2);
        axeHandle.rotation.z = 0.2;
        g.add(axeHandle);
        const axeHead = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({ color: ironCol, metalness: 0.5 }));
        axeHead.scale.set(fw * 0.08, fw * 0.06, 0.02);
        axeHead.position.set(fw * 0.37, fw * 0.26, fh * 0.2);
        g.add(axeHead);
        // Tree stump
        const stump = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: 0x7a5a2a, roughness: 0.95 }));
        stump.scale.set(0.6, fw * 0.06, 0.6);
        stump.position.set(-fw * 0.35, fw * 0.03, fh * 0.35);
        g.add(stump);
        break;
      }
      case SettlersBuildingType.QUARRY: {
        // Pickaxe
        const pick = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: woodCol, roughness: 0.9 }));
        pick.scale.set(0.15, fw * 0.2, 0.15);
        pick.position.set(-fw * 0.3, fw * 0.1, fh * 0.33);
        pick.rotation.z = -0.3;
        g.add(pick);
        const pickHead = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({ color: ironCol, metalness: 0.5 }));
        pickHead.scale.set(fw * 0.1, 0.025, 0.025);
        pickHead.position.set(-fw * 0.32, fw * 0.22, fh * 0.33);
        g.add(pickHead);
        // Stone pile
        for (let i = 0; i < 4; i++) {
          const stone = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({
            color: [0x808078, 0x8a8a80, 0x757568, 0x909088][i], roughness: 0.95,
          }));
          stone.scale.set(fw * (0.06 + Math.random() * 0.04), fw * 0.04, fw * 0.05);
          stone.position.set(fw * (0.28 + (i % 2) * 0.08), fw * 0.02 + Math.floor(i / 2) * fw * 0.04, -fh * 0.32);
          stone.rotation.y = i * 0.7;
          g.add(stone);
        }
        break;
      }
      case SettlersBuildingType.FISHER: {
        // Fishing rod leaning
        const rod = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: woodCol, roughness: 0.85 }));
        rod.scale.set(0.1, fw * 0.35, 0.1);
        rod.position.set(fw * 0.32, fw * 0.15, -fh * 0.2);
        rod.rotation.z = 0.35;
        g.add(rod);
        // Fish drying rack
        const rackPost1 = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: woodCol }));
        rackPost1.scale.set(0.15, fw * 0.15, 0.15);
        rackPost1.position.set(-fw * 0.35, fw * 0.07, fh * 0.3);
        g.add(rackPost1);
        const rackPost2 = rackPost1.clone();
        rackPost2.position.set(-fw * 0.2, fw * 0.07, fh * 0.3);
        g.add(rackPost2);
        const rackBar = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: woodCol }));
        rackBar.scale.set(0.08, fw * 0.16, 0.08);
        rackBar.rotation.z = Math.PI * 0.5;
        rackBar.position.set(-fw * 0.275, fw * 0.15, fh * 0.3);
        g.add(rackBar);
        break;
      }
      case SettlersBuildingType.HUNTER: {
        // Hanging animal skin on wall
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xa08050, roughness: 0.9, side: THREE.DoubleSide });
        const skin = new THREE.Mesh(this._boxGeo, skinMat);
        skin.scale.set(fw * 0.12, fw * 0.1, 0.01);
        skin.position.set(fw * 0.31, fw * 0.2, fh * 0.15);
        g.add(skin);
        // Bow
        const bowMat = new THREE.MeshStandardMaterial({ color: woodCol, roughness: 0.85 });
        const bow = new THREE.Mesh(new THREE.TorusGeometry(fw * 0.08, 0.008, 4, 8, Math.PI * 1.2), bowMat);
        bow.position.set(-fw * 0.32, fw * 0.22, fh * 0.32);
        bow.rotation.z = 0.3;
        g.add(bow);
        break;
      }
      case SettlersBuildingType.FARM: {
        // Wheat field rows around building
        const wheatMat = new THREE.MeshStandardMaterial({ color: 0xd4b844, roughness: 0.8 });
        const wheatDkMat = new THREE.MeshStandardMaterial({ color: 0xb89830, roughness: 0.8 });
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 6; col++) {
            const stalk = new THREE.Mesh(this._cylGeo, row % 2 === 0 ? wheatMat : wheatDkMat);
            stalk.scale.set(0.05, fw * 0.08, 0.05);
            stalk.position.set(
              -fw * 0.4 + col * fw * 0.12 + (row % 2) * fw * 0.06,
              fw * 0.04,
              -fh * 0.5 - row * fh * 0.08,
            );
            // Slight random lean
            stalk.rotation.x = (Math.random() - 0.5) * 0.15;
            stalk.rotation.z = (Math.random() - 0.5) * 0.15;
            g.add(stalk);
            // Wheat head (small sphere)
            const head = new THREE.Mesh(this._sphereGeo, wheatMat);
            head.scale.set(0.15, 0.25, 0.15);
            head.position.set(stalk.position.x, fw * 0.09, stalk.position.z);
            g.add(head);
          }
        }
        // Scarecrow
        const scPost = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: woodCol }));
        scPost.scale.set(0.12, fw * 0.22, 0.12);
        scPost.position.set(fw * 0.45, fw * 0.11, -fh * 0.65);
        g.add(scPost);
        const scArm = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: woodCol }));
        scArm.scale.set(0.08, fw * 0.15, 0.08);
        scArm.rotation.z = Math.PI * 0.5;
        scArm.position.set(fw * 0.45, fw * 0.2, -fh * 0.65);
        g.add(scArm);
        const scHead = new THREE.Mesh(this._sphereGeo, new THREE.MeshStandardMaterial({ color: 0xd4b844 }));
        scHead.scale.set(0.5, 0.5, 0.5);
        scHead.position.set(fw * 0.45, fw * 0.25, -fh * 0.65);
        g.add(scHead);
        break;
      }
      case SettlersBuildingType.SAWMILL: {
        // Log pile input side
        const logMat = new THREE.MeshStandardMaterial({ color: 0x7a5a2a, roughness: 0.9 });
        for (let l = 0; l < 4; l++) {
          const log = new THREE.Mesh(this._cylGeo, logMat);
          log.scale.set(0.22, fw * 0.18, 0.22);
          log.rotation.z = Math.PI * 0.5;
          log.position.set(-fw * 0.44, 0.03 + (l % 2) * 0.04, fh * (-0.05 + Math.floor(l / 2) * 0.1));
          g.add(log);
        }
        // Plank stack output side
        const plankMat = new THREE.MeshStandardMaterial({ color: 0xc49a5c, roughness: 0.8 });
        for (let p = 0; p < 3; p++) {
          const plank = new THREE.Mesh(this._boxGeo, plankMat);
          plank.scale.set(fw * 0.18, 0.015, fw * 0.06);
          plank.position.set(fw * 0.44, 0.01 + p * 0.018, fh * 0.05);
          g.add(plank);
        }
        // Sawblade (thin disc on side of building)
        const bladeMat = new THREE.MeshStandardMaterial({ color: ironCol, metalness: 0.6, roughness: 0.3 });
        const blade = new THREE.Mesh(new THREE.CylinderGeometry(fw * 0.08, fw * 0.08, 0.01, 12), bladeMat);
        blade.rotation.x = Math.PI * 0.5;
        blade.position.set(0, fw * 0.35, fh * 0.42);
        g.add(blade);
        break;
      }
      case SettlersBuildingType.MILL: {
        // Windmill sails (4 arms from roof peak)
        const sailMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7, side: THREE.DoubleSide });
        const hubMat = new THREE.MeshStandardMaterial({ color: woodCol, roughness: 0.85 });
        // Hub
        const hub = new THREE.Mesh(this._cylGeo, hubMat);
        hub.name = "millHub";
        hub.scale.set(0.3, fw * 0.04, 0.3);
        hub.rotation.x = Math.PI * 0.5;
        hub.position.set(0, fw * 0.7, fh * 0.42);
        g.add(hub);
        // 4 sail arms
        for (let s = 0; s < 4; s++) {
          const armGroup = new THREE.Group();
          armGroup.name = `sail${s}`;
          const arm = new THREE.Mesh(this._cylGeo, hubMat);
          arm.scale.set(0.08, fw * 0.28, 0.08);
          arm.position.y = fw * 0.14;
          armGroup.add(arm);
          // Sail cloth (flat quad)
          const sail = new THREE.Mesh(this._boxGeo, sailMat);
          sail.scale.set(fw * 0.06, fw * 0.22, 0.005);
          sail.position.set(fw * 0.04, fw * 0.14, 0);
          armGroup.add(sail);
          armGroup.rotation.z = (s / 4) * Math.PI * 2;
          armGroup.position.set(0, fw * 0.7, fh * 0.43);
          g.add(armGroup);
        }
        // Flour sacks
        const sackMat = new THREE.MeshStandardMaterial({ color: 0xf0e6c0, roughness: 0.9 });
        for (let s = 0; s < 2; s++) {
          const sack = new THREE.Mesh(this._boxGeo, sackMat);
          sack.scale.set(fw * 0.06, fw * 0.08, fw * 0.05);
          sack.position.set(fw * (0.3 + s * 0.1), fw * 0.04, -fh * 0.3);
          g.add(sack);
        }
        break;
      }
      case SettlersBuildingType.BAKERY: {
        // Brick oven (rounded back protrusion)
        const ovenMat = new THREE.MeshStandardMaterial({ color: 0xb07050, roughness: 0.9 });
        const oven = new THREE.Mesh(this._sphereGeo, ovenMat);
        oven.scale.set(1.0, 0.7, 0.8);
        oven.position.set(0, fw * 0.12, -fh * 0.42);
        g.add(oven);
        // Oven opening (dark)
        const opening = new THREE.Mesh(this._boxGeo, new THREE.MeshBasicMaterial({ color: 0x221111 }));
        opening.scale.set(fw * 0.06, fw * 0.05, 0.01);
        opening.position.set(0, fw * 0.1, -fh * 0.5);
        g.add(opening);
        // Bread on windowsill
        const breadMat = new THREE.MeshStandardMaterial({ color: 0xc89050, roughness: 0.8 });
        const bread = new THREE.Mesh(this._sphereGeo, breadMat);
        bread.scale.set(0.3, 0.2, 0.25);
        bread.position.set(-fw * 0.22, fw * 0.33, fh * 0.42);
        g.add(bread);
        break;
      }
      case SettlersBuildingType.BREWERY: {
        // Large brewing barrels
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x8b6b3a, roughness: 0.85 });
        for (let b = 0; b < 2; b++) {
          const barrel = new THREE.Mesh(new THREE.CylinderGeometry(fw * 0.07, fw * 0.065, fw * 0.14, 8), barrelMat);
          barrel.position.set(fw * (0.32 + b * 0.15), fw * 0.07, -fh * 0.25);
          g.add(barrel);
          // Barrel hoops
          for (let h2 = 0; h2 < 2; h2++) {
            const hoop = new THREE.Mesh(new THREE.TorusGeometry(fw * 0.068, 0.005, 4, 8),
              new THREE.MeshStandardMaterial({ color: 0x444444 }));
            hoop.position.set(fw * (0.32 + b * 0.15), fw * (0.03 + h2 * 0.06), -fh * 0.25);
            hoop.rotation.x = Math.PI * 0.5;
            g.add(hoop);
          }
        }
        // Tankard on bench
        const mugMat = new THREE.MeshStandardMaterial({ color: 0xaa8844, roughness: 0.8 });
        const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.013, 0.04, 6), mugMat);
        mug.position.set(-fw * 0.35, fw * 0.14, fh * 0.38);
        g.add(mug);
        break;
      }
      case SettlersBuildingType.SMELTER:
      case SettlersBuildingType.MINT: {
        // Forge/crucible (glowing)
        const forgeMat = new THREE.MeshStandardMaterial({
          color: 0x444444, roughness: 0.9,
        });
        const forge = new THREE.Mesh(this._boxGeo, forgeMat);
        forge.scale.set(fw * 0.15, fw * 0.1, fw * 0.12);
        forge.position.set(-fw * 0.38, fw * 0.05, fh * 0.15);
        g.add(forge);
        // Embers glow
        const emberMat = new THREE.MeshStandardMaterial({
          color: type === SettlersBuildingType.MINT ? 0xffd700 : 0xff4400,
          emissive: type === SettlersBuildingType.MINT ? 0xffd700 : 0xff4400,
          emissiveIntensity: 0.5,
        });
        const ember = new THREE.Mesh(this._boxGeo, emberMat);
        ember.scale.set(fw * 0.1, fw * 0.03, fw * 0.08);
        ember.position.set(-fw * 0.38, fw * 0.1, fh * 0.15);
        g.add(ember);
        // Ingot stack
        const ingotColor = type === SettlersBuildingType.MINT ? 0xffd700 : 0x888888;
        const ingotMat = new THREE.MeshStandardMaterial({ color: ingotColor, metalness: 0.6, roughness: 0.3 });
        for (let i = 0; i < 3; i++) {
          const ingot = new THREE.Mesh(this._boxGeo, ingotMat);
          ingot.scale.set(fw * 0.04, fw * 0.02, fw * 0.025);
          ingot.position.set(fw * (0.32 + i * 0.05), fw * 0.01, -fh * 0.32);
          g.add(ingot);
        }
        break;
      }
      case SettlersBuildingType.SWORD_SMITH:
      case SettlersBuildingType.SHIELD_SMITH: {
        // Anvil
        const anvilMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.6, roughness: 0.4 });
        const anvilBase = new THREE.Mesh(this._boxGeo, anvilMat);
        anvilBase.scale.set(fw * 0.08, fw * 0.06, fw * 0.05);
        anvilBase.position.set(-fw * 0.35, fw * 0.03, fh * 0.38);
        g.add(anvilBase);
        const anvilTop = new THREE.Mesh(this._boxGeo, anvilMat);
        anvilTop.scale.set(fw * 0.1, fw * 0.02, fw * 0.06);
        anvilTop.position.set(-fw * 0.35, fw * 0.07, fh * 0.38);
        g.add(anvilTop);
        // Hammer
        const hammerH = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: woodCol }));
        hammerH.scale.set(0.12, fw * 0.1, 0.12);
        hammerH.position.set(-fw * 0.28, fw * 0.08, fh * 0.38);
        hammerH.rotation.z = 0.5;
        g.add(hammerH);
        // Product display
        if (type === SettlersBuildingType.SWORD_SMITH) {
          // Sword on rack
          const swordMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.7, roughness: 0.2 });
          const sword = new THREE.Mesh(this._boxGeo, swordMat);
          sword.scale.set(0.015, fw * 0.15, 0.005);
          sword.position.set(fw * 0.35, fw * 0.15, fh * 0.32);
          sword.rotation.z = 0.15;
          g.add(sword);
        } else {
          // Shield on wall
          const shieldGeo = new THREE.CylinderGeometry(fw * 0.06, fw * 0.06, 0.01, 6);
          const shieldMat = new THREE.MeshStandardMaterial({ color: 0x886633, metalness: 0.2 });
          const shield = new THREE.Mesh(shieldGeo, shieldMat);
          shield.rotation.x = Math.PI * 0.5;
          shield.position.set(fw * 0.35, fw * 0.22, fh * 0.36);
          g.add(shield);
        }
        break;
      }
      case SettlersBuildingType.BARRACKS: {
        // Training dummy
        const dummyPost = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: woodCol }));
        dummyPost.scale.set(0.15, fw * 0.22, 0.15);
        dummyPost.position.set(fw * 0.42, fw * 0.11, fh * 0.0);
        g.add(dummyPost);
        const dummyArm = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: woodCol }));
        dummyArm.scale.set(0.1, fw * 0.12, 0.1);
        dummyArm.rotation.z = Math.PI * 0.5;
        dummyArm.position.set(fw * 0.42, fw * 0.18, fh * 0.0);
        g.add(dummyArm);
        // Target painted circle (flat disc)
        const targetMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.8 });
        const target = new THREE.Mesh(new THREE.CylinderGeometry(fw * 0.05, fw * 0.05, 0.01, 8), targetMat);
        target.rotation.x = Math.PI * 0.5;
        target.position.set(fw * 0.42, fw * 0.14, fh * 0.01);
        g.add(target);
        // Weapon rack
        const rackMat = new THREE.MeshStandardMaterial({ color: woodCol, roughness: 0.85 });
        const rack = new THREE.Mesh(this._boxGeo, rackMat);
        rack.scale.set(fw * 0.15, fw * 0.15, 0.02);
        rack.position.set(-fw * 0.38, fw * 0.12, fh * 0.35);
        g.add(rack);
        break;
      }
      case SettlersBuildingType.IRON_MINE:
      case SettlersBuildingType.GOLD_MINE:
      case SettlersBuildingType.COAL_MINE: {
        // Mine entrance (dark opening in front)
        const entranceMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const entrance = new THREE.Mesh(this._boxGeo, entranceMat);
        entrance.scale.set(fw * 0.14, fw * 0.16, 0.02);
        entrance.position.set(0, fw * 0.08, fh * 0.37);
        g.add(entrance);
        // Timber frame around entrance
        const frameMat = new THREE.MeshStandardMaterial({ color: woodCol, roughness: 0.85 });
        const frameTop = new THREE.Mesh(this._boxGeo, frameMat);
        frameTop.scale.set(fw * 0.18, 0.03, 0.04);
        frameTop.position.set(0, fw * 0.17, fh * 0.38);
        g.add(frameTop);
        for (let side = -1; side <= 1; side += 2) {
          const post = new THREE.Mesh(this._boxGeo, frameMat);
          post.scale.set(0.025, fw * 0.17, 0.035);
          post.position.set(side * fw * 0.08, fw * 0.08, fh * 0.38);
          g.add(post);
        }
        // Ore cart track rails
        const railMat = new THREE.MeshStandardMaterial({ color: ironCol, metalness: 0.4 });
        for (let side = -1; side <= 1; side += 2) {
          const rail = new THREE.Mesh(this._boxGeo, railMat);
          rail.scale.set(0.008, 0.005, fw * 0.2);
          rail.position.set(side * fw * 0.04, 0.003, fh * 0.48);
          g.add(rail);
        }
        // Ore type indicator colored pile
        const oreColor = type === SettlersBuildingType.GOLD_MINE ? 0xc4a32e
          : type === SettlersBuildingType.IRON_MINE ? 0x7a4e2e : 0x2c2c2c;
        const oreMat = new THREE.MeshStandardMaterial({ color: oreColor, roughness: 0.9 });
        const orePile = new THREE.Mesh(this._coneGeo, oreMat);
        orePile.scale.set(fw * 0.08, fw * 0.04, fw * 0.08);
        orePile.position.set(fw * 0.28, fw * 0.02, fh * 0.35);
        g.add(orePile);
        break;
      }
      case SettlersBuildingType.STOREHOUSE: {
        // Crate stacks
        const crateMat = new THREE.MeshStandardMaterial({ color: 0xa08050, roughness: 0.85 });
        for (let c = 0; c < 4; c++) {
          const crate = new THREE.Mesh(this._boxGeo, crateMat);
          const cs = fw * 0.06;
          crate.scale.set(cs, cs, cs);
          crate.position.set(
            fw * (0.35 + (c % 2) * 0.08),
            cs * 0.5 + Math.floor(c / 2) * cs,
            fh * (0.15 + (c % 2) * 0.06),
          );
          crate.rotation.y = c * 0.3;
          g.add(crate);
        }
        // Sacks
        const sackMat = new THREE.MeshStandardMaterial({ color: 0xd4c4a0, roughness: 0.9 });
        for (let s = 0; s < 2; s++) {
          const sack = new THREE.Mesh(this._boxGeo, sackMat);
          sack.scale.set(fw * 0.06, fw * 0.08, fw * 0.05);
          sack.position.set(-fw * (0.35 + s * 0.09), fw * 0.04, -fh * 0.35);
          g.add(sack);
        }
        break;
      }
      case SettlersBuildingType.FORTRESS: {
        // Extra wall ring / curtain wall
        const curtainGeo = new THREE.CylinderGeometry(fw * 0.52, fw * 0.55, fw * 0.2, 12, 1, true);
        const curtainMat = this._stoneMat.clone();
        (curtainMat as THREE.MeshStandardMaterial).transparent = true;
        const curtain = new THREE.Mesh(curtainGeo, curtainMat);
        curtain.position.y = fw * 0.1;
        g.add(curtain);
        // Gate portcullis texture (dark slats)
        const portMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4 });
        for (let bar = 0; bar < 3; bar++) {
          const vBar = new THREE.Mesh(this._boxGeo, portMat);
          vBar.scale.set(0.015, fw * 0.15, 0.01);
          vBar.position.set(-fw * 0.04 + bar * fw * 0.04, fw * 0.08, fw * 0.55);
          g.add(vBar);
        }
        for (let bar = 0; bar < 2; bar++) {
          const hBar = new THREE.Mesh(this._boxGeo, portMat);
          hBar.scale.set(fw * 0.1, 0.01, 0.01);
          hBar.position.set(0, fw * (0.04 + bar * 0.08), fw * 0.55);
          g.add(hBar);
        }
        break;
      }
      default:
        break;
    }
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

      // Dynamic inventory dots (reuse cached geometry & materials)
      const dotsGroup = mesh.getObjectByName("inventoryDots") as THREE.Group | undefined;
      if (dotsGroup) {
        while (dotsGroup.children.length > 0) dotsGroup.remove(dotsGroup.children[0]);
        const count = Math.min(flag.inventory.length, 8);
        for (let i = 0; i < count; i++) {
          const resColor = RESOURCE_META[flag.inventory[i].type].color;
          let dotMat = this._dotMats.get(resColor);
          if (!dotMat) {
            dotMat = new THREE.MeshBasicMaterial({ color: resColor });
            this._dotMats.set(resColor, dotMat);
          }
          const dot = new THREE.Mesh(this._dotGeo, dotMat);
          const row = Math.floor(i / 4);
          const col = i % 4;
          dot.position.set((col - 1.5) * 0.08, 0.1 + row * 0.08, 0.15);
          dotsGroup.add(dot);
        }
        // Bottleneck glow (reuse cached geo, only update existing material)
        if (flag.inventory.length >= 6) {
          const glowMat = new THREE.MeshBasicMaterial({
            color: 0xff4444, transparent: true,
            opacity: 0.3 + Math.sin(t * 4) * 0.15, depthWrite: false,
          });
          const glow = new THREE.Mesh(this._glowGeo, glowMat);
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
        this._roadQualities.delete(id);
      }
    }
    for (const [id, road] of state.roads) {
      const prevQuality = this._roadQualities.get(id);
      if (!this._roadMeshes.has(id) || prevQuality !== road.quality) {
        // Remove old mesh if quality changed
        const oldMesh = this._roadMeshes.get(id);
        if (oldMesh) this.scene.remove(oldMesh);
        const mesh = this._createRoadMesh(road.path, state, road.quality);
        this._roadMeshes.set(id, mesh);
        this._roadQualities.set(id, road.quality);
        this.scene.add(mesh);
      }
    }
  }

  private _createRoadMesh(
    path: { x: number; z: number }[],
    state: SettlersState,
    quality: RoadQuality = "dirt",
  ): THREE.Mesh {
    const points: THREE.Vector3[] = [];
    for (const p of path) {
      const wx = (p.x + 0.5) * SB.TILE_SIZE;
      const wz = (p.z + 0.5) * SB.TILE_SIZE;
      const wy = getHeightAt(state.map, wx, wz) + 0.12;
      points.push(new THREE.Vector3(wx, wy, wz));
    }

    if (points.length < 2) {
      const geo = new THREE.PlaneGeometry(0.01, 0.01);
      return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false }));
    }

    // Build ribbon with vertex colors – color varies by road quality
    const positions: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];
    const hw = SB.ROAD_WIDTH * 0.5;

    // Road colors by quality: dirt = brown, stone = gray, paved = light gray/white
    let edgeColor: THREE.Color;
    let centerColor: THREE.Color;
    if (quality === "paved") {
      edgeColor = new THREE.Color(0x999999);
      centerColor = new THREE.Color(0xd8d8d0);
    } else if (quality === "stone") {
      edgeColor = new THREE.Color(0x6a6a62);
      centerColor = new THREE.Color(0x9a9a90);
    } else {
      edgeColor = new THREE.Color(0x7a6a4a);
      centerColor = new THREE.Color(0xb09868);
    }

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
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;
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

      // Face movement direction based on actual travel direction
      const road = state.roads.get(carrier.roadId);
      if (road && road.path.length >= 2) {
        const p = carrier.pathProgress;
        const segCount = road.path.length - 1;
        let idx: number, next: number;
        if (carrier.direction === 1) {
          idx = Math.min(Math.floor(p * segCount), segCount - 1);
          next = idx + 1;
        } else {
          idx = Math.min(Math.ceil(p * segCount), segCount);
          next = Math.max(idx - 1, 0);
        }
        if (idx !== next) {
          const dx = road.path[next].x - road.path[idx].x;
          const dz = road.path[next].z - road.path[idx].z;
          if (dx !== 0 || dz !== 0) {
            mesh.rotation.y = Math.atan2(dx, dz);
          }
        }
      }

      // Animate walking: legs, arms, body bob, head bob
      const leftLeg = mesh.getObjectByName("leftLeg") as THREE.Object3D | undefined;
      const rightLeg = mesh.getObjectByName("rightLeg") as THREE.Object3D | undefined;
      const leftArm = mesh.getObjectByName("leftArm") as THREE.Object3D | undefined;
      const rightArm = mesh.getObjectByName("rightArm") as THREE.Object3D | undefined;
      const headGroup = mesh.getObjectByName("headGroup") as THREE.Object3D | undefined;
      const isMoving = carrier.pathProgress > 0.01 && carrier.pathProgress < 0.99;
      const walkPhase = t * 8 + carrier.pathProgress * 20;

      if (isMoving) {
        const legSwing = Math.sin(walkPhase) * 0.5;
        // Leg swing (opposite legs)
        if (leftLeg) leftLeg.rotation.x = legSwing;
        if (rightLeg) rightLeg.rotation.x = -legSwing;
        // Arm counter-swing (arms oppose legs for natural gait)
        if (leftArm) leftArm.rotation.x = -legSwing * 0.6;
        if (rightArm) rightArm.rotation.x = legSwing * 0.6;
        // Body bob (vertical bounce – two bounces per stride)
        const bob = Math.abs(Math.sin(walkPhase)) * 0.03;
        mesh.position.y = carrier.position.y + bob;
        // Torso lean forward while walking
        const bodyNode = mesh.getObjectByName("body");
        if (bodyNode) {
          bodyNode.rotation.x = 0.08;
          // Body sway (slight tilt side to side, synced to stride)
          bodyNode.rotation.z = Math.sin(walkPhase * 0.5) * 0.04;
        }
        // Head slight counter-bob
        if (headGroup) {
          headGroup.rotation.x = Math.sin(walkPhase * 2) * 0.02;
          headGroup.rotation.z = Math.sin(walkPhase * 0.5) * -0.02;
        }
      } else {
        // Idle breathing animation
        if (leftLeg) leftLeg.rotation.x = 0;
        if (rightLeg) rightLeg.rotation.x = 0;
        if (leftArm) leftArm.rotation.x = 0;
        if (rightArm) rightArm.rotation.x = 0;
        const bodyIdle = mesh.getObjectByName("body");
        if (bodyIdle) { bodyIdle.rotation.x = 0; bodyIdle.rotation.z = 0; }
        if (headGroup) { headGroup.rotation.x = 0; headGroup.rotation.z = 0; }
        // Subtle idle breathing bob
        mesh.position.y = carrier.position.y + Math.sin(t * 2) * 0.005;
      }

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

    // --- Materials ---
    const tunicMat = new THREE.MeshStandardMaterial({ color: playerColor, roughness: 0.8 });
    const tunicDkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(playerColor).multiplyScalar(0.65).getHex(), roughness: 0.85,
    });
    const tunicLtMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(playerColor).lerp(new THREE.Color(0xffffff), 0.2).getHex(), roughness: 0.8,
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0ccaa, roughness: 0.7 });
    const skinShadow = new THREE.MeshStandardMaterial({ color: 0xd4a880, roughness: 0.75 });
    const pantMat = new THREE.MeshStandardMaterial({ color: 0x6a5a3a, roughness: 0.85 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x4a2e16, roughness: 0.9 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x4a2e16, roughness: 0.85 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xb8960c, metalness: 0.6, roughness: 0.4 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });

    // --- Body pivot (first child, used for lean/sway) ---
    const body = new THREE.Group();
    body.name = "body";
    g.add(body);

    // === TORSO (tapered cylinder for more realistic shape) ===
    const torsoGeo = new THREE.CylinderGeometry(h * 0.16, h * 0.19, h * 0.3, 8);
    const torso = new THREE.Mesh(torsoGeo, tunicMat);
    torso.position.y = h * 0.55;
    body.add(torso);

    // Chest detail – lighter fabric panel
    const chestPanel = new THREE.Mesh(this._boxGeo, tunicLtMat);
    chestPanel.scale.set(h * 0.18, h * 0.12, h * 0.01);
    chestPanel.position.set(0, h * 0.6, h * 0.13);
    body.add(chestPanel);

    // Tunic skirt (flares out below waist)
    const skirtGeo = new THREE.CylinderGeometry(h * 0.19, h * 0.22, h * 0.1, 8);
    const skirt = new THREE.Mesh(skirtGeo, tunicMat);
    skirt.position.y = h * 0.38;
    body.add(skirt);

    // Belt
    const beltGeo = new THREE.CylinderGeometry(h * 0.195, h * 0.195, h * 0.035, 10);
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = h * 0.42;
    body.add(belt);
    // Belt buckle
    const buckle = new THREE.Mesh(this._boxGeo, metalMat);
    buckle.scale.set(h * 0.045, h * 0.04, h * 0.02);
    buckle.position.set(0, h * 0.42, h * 0.17);
    body.add(buckle);
    // Belt pouch (small side pouch)
    const pouch = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({ color: 0x8b6b3a, roughness: 0.85 }));
    pouch.scale.set(h * 0.06, h * 0.06, h * 0.05);
    pouch.position.set(h * 0.17, h * 0.4, h * 0.04);
    body.add(pouch);

    // Collar / neckline – V-shape
    const collar = new THREE.Mesh(this._boxGeo, tunicDkMat);
    collar.scale.set(h * 0.16, h * 0.035, h * 0.2);
    collar.position.y = h * 0.71;
    body.add(collar);

    // === NECK ===
    const neckGeo = new THREE.CylinderGeometry(h * 0.055, h * 0.06, h * 0.06, 6);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = h * 0.74;
    body.add(neck);

    // === HEAD GROUP (grouped for animation) ===
    const headGroup = new THREE.Group();
    headGroup.name = "headGroup";
    headGroup.position.y = h * 0.86;

    // Head (slightly elongated sphere)
    const headGeo = new THREE.SphereGeometry(h * 0.09, 10, 8);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.scale.set(1.0, 1.1, 0.95);
    headGroup.add(head);

    // Hair (back of head)
    const hairGeo = new THREE.SphereGeometry(h * 0.085, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, h * 0.02, -h * 0.01);
    hair.rotation.x = -0.3;
    headGroup.add(hair);

    // Ears
    for (let side = -1; side <= 1; side += 2) {
      const earGeo = new THREE.SphereGeometry(h * 0.02, 5, 4);
      const ear = new THREE.Mesh(earGeo, skinShadow);
      ear.position.set(side * h * 0.085, -h * 0.01, 0);
      ear.scale.set(0.6, 1.0, 0.8);
      headGroup.add(ear);
    }

    // Eyes (iris + pupil + white)
    for (let side = -1; side <= 1; side += 2) {
      // Eye white
      const eyeW = new THREE.Mesh(
        new THREE.SphereGeometry(h * 0.022, 6, 4),
        new THREE.MeshBasicMaterial({ color: 0xf8f4f0 }),
      );
      eyeW.position.set(side * h * 0.04, h * 0.01, h * 0.065);
      eyeW.scale.set(1.2, 0.8, 0.5);
      headGroup.add(eyeW);
      // Iris
      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(h * 0.012, 5, 4),
        new THREE.MeshBasicMaterial({ color: 0x4477aa }),
      );
      iris.position.set(side * h * 0.04, h * 0.01, h * 0.075);
      headGroup.add(iris);
      // Pupil
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(h * 0.006, 4, 3),
        new THREE.MeshBasicMaterial({ color: 0x111111 }),
      );
      pupil.position.set(side * h * 0.04, h * 0.01, h * 0.08);
      headGroup.add(pupil);
      // Eyebrow (small box above eye)
      const brow = new THREE.Mesh(this._boxGeo, hairMat);
      brow.scale.set(h * 0.035, h * 0.008, h * 0.01);
      brow.position.set(side * h * 0.04, h * 0.035, h * 0.06);
      brow.rotation.z = side * -0.15;
      headGroup.add(brow);
    }

    // Nose (small wedge)
    const noseGeo = new THREE.ConeGeometry(h * 0.015, h * 0.03, 4);
    const nose = new THREE.Mesh(noseGeo, skinShadow);
    nose.position.set(0, -h * 0.005, h * 0.085);
    nose.rotation.x = Math.PI * 0.5;
    headGroup.add(nose);

    // Mouth (thin line)
    const mouth = new THREE.Mesh(this._boxGeo, new THREE.MeshBasicMaterial({ color: 0xb87860 }));
    mouth.scale.set(h * 0.03, h * 0.005, h * 0.005);
    mouth.position.set(0, -h * 0.03, h * 0.075);
    headGroup.add(mouth);

    // === HAT (straw-style wide-brim peasant hat) ===
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x8b7640, roughness: 0.95 });
    const hatDkMat = new THREE.MeshStandardMaterial({ color: 0x6b5630, roughness: 0.9 });
    // Crown (tapered cylinder)
    const crownGeo = new THREE.CylinderGeometry(h * 0.07, h * 0.09, h * 0.08, 10);
    const crown = new THREE.Mesh(crownGeo, hatMat);
    crown.position.y = h * 0.12;
    headGroup.add(crown);
    // Crown dent (indent on top)
    const dentGeo = new THREE.CylinderGeometry(h * 0.04, h * 0.06, h * 0.02, 8);
    const dent = new THREE.Mesh(dentGeo, hatDkMat);
    dent.position.y = h * 0.155;
    headGroup.add(dent);
    // Brim (wide disc, slightly droopy)
    const brimGeo = new THREE.CylinderGeometry(h * 0.17, h * 0.18, h * 0.015, 14);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.position.y = h * 0.08;
    brim.rotation.x = 0.05; // slight forward droop
    headGroup.add(brim);
    // Hat band (ribbon)
    const bandGeo = new THREE.TorusGeometry(h * 0.085, h * 0.01, 4, 12);
    const band = new THREE.Mesh(bandGeo, new THREE.MeshStandardMaterial({ color: 0xcc4444, roughness: 0.8 }));
    band.position.y = h * 0.1;
    band.rotation.x = Math.PI * 0.5;
    headGroup.add(band);

    body.add(headGroup);

    // === SHOULDERS (round pads) ===
    for (let side = -1; side <= 1; side += 2) {
      const shoulderGeo = new THREE.SphereGeometry(h * 0.06, 6, 5);
      const shoulder = new THREE.Mesh(shoulderGeo, tunicMat);
      shoulder.position.set(side * h * 0.19, h * 0.68, 0);
      shoulder.scale.set(1.0, 0.7, 0.9);
      body.add(shoulder);
    }

    // === ARMS (grouped for animation – upper arm + forearm + hand + fingers) ===
    for (let side = -1; side <= 1; side += 2) {
      const armGroup = new THREE.Group();
      armGroup.name = side === -1 ? "leftArm" : "rightArm";
      armGroup.position.set(side * h * 0.22, h * 0.66, 0);
      // Upper arm (sleeve)
      const uaGeo = new THREE.CylinderGeometry(h * 0.045, h * 0.05, h * 0.16, 6);
      const upperArm = new THREE.Mesh(uaGeo, tunicMat);
      upperArm.position.y = -h * 0.08;
      upperArm.rotation.z = side * 0.12;
      armGroup.add(upperArm);
      // Sleeve cuff
      const cuffGeo = new THREE.CylinderGeometry(h * 0.048, h * 0.045, h * 0.02, 6);
      const cuff = new THREE.Mesh(cuffGeo, tunicDkMat);
      cuff.position.y = -h * 0.16;
      armGroup.add(cuff);
      // Forearm (skin)
      const faGeo = new THREE.CylinderGeometry(h * 0.032, h * 0.04, h * 0.14, 6);
      const forearm = new THREE.Mesh(faGeo, skinMat);
      forearm.position.y = -h * 0.24;
      forearm.rotation.z = side * 0.08;
      armGroup.add(forearm);
      // Wrist
      const wristGeo = new THREE.SphereGeometry(h * 0.025, 5, 4);
      const wrist = new THREE.Mesh(wristGeo, skinMat);
      wrist.position.y = -h * 0.31;
      armGroup.add(wrist);
      // Hand (mitten shape)
      const handGeo = new THREE.BoxGeometry(h * 0.04, h * 0.05, h * 0.03);
      const hand = new THREE.Mesh(handGeo, skinMat);
      hand.position.y = -h * 0.34;
      armGroup.add(hand);
      // Thumb
      const thumbGeo = new THREE.SphereGeometry(h * 0.012, 4, 3);
      const thumb = new THREE.Mesh(thumbGeo, skinMat);
      thumb.position.set(side * h * 0.025, -h * 0.33, h * 0.01);
      armGroup.add(thumb);
      body.add(armGroup);
    }

    // === LEGS (thigh + knee + shin + boot – grouped for animation) ===
    for (let side = -1; side <= 1; side += 2) {
      const legGroup = new THREE.Group();
      legGroup.name = side === -1 ? "leftLeg" : "rightLeg";
      legGroup.position.set(side * h * 0.08, h * 0.32, 0);
      // Thigh
      const thighGeo = new THREE.CylinderGeometry(h * 0.055, h * 0.05, h * 0.16, 6);
      const thigh = new THREE.Mesh(thighGeo, pantMat);
      thigh.position.y = -h * 0.04;
      legGroup.add(thigh);
      // Knee joint
      const kneeGeo = new THREE.SphereGeometry(h * 0.04, 5, 4);
      const knee = new THREE.Mesh(kneeGeo, pantMat);
      knee.position.y = -h * 0.12;
      legGroup.add(knee);
      // Shin
      const shinGeo = new THREE.CylinderGeometry(h * 0.04, h * 0.045, h * 0.14, 6);
      const shin = new THREE.Mesh(shinGeo, pantMat);
      shin.position.y = -h * 0.2;
      legGroup.add(shin);
      // Boot (taller, shaped)
      const bootGeo = new THREE.BoxGeometry(h * 0.07, h * 0.1, h * 0.1);
      const boot = new THREE.Mesh(bootGeo, bootMat);
      boot.position.set(0, -h * 0.3, h * 0.01);
      legGroup.add(boot);
      // Boot sole
      const soleGeo = new THREE.BoxGeometry(h * 0.075, h * 0.015, h * 0.11);
      const sole = new THREE.Mesh(soleGeo, new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.95 }));
      sole.position.set(0, -h * 0.35, h * 0.01);
      legGroup.add(sole);
      // Boot cuff (folded leather top)
      const bootCuffGeo = new THREE.CylinderGeometry(h * 0.048, h * 0.05, h * 0.02, 6);
      const bootCuff = new THREE.Mesh(bootCuffGeo, new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 }));
      bootCuff.position.y = -h * 0.24;
      legGroup.add(bootCuff);
      body.add(legGroup);
    }

    // === BACKPACK (wooden frame pack with bundle) ===
    const packFrameMat = new THREE.MeshStandardMaterial({ color: 0x7a5a30, roughness: 0.9 });
    const packBundleMat = new THREE.MeshStandardMaterial({ color: 0xc0a060, roughness: 0.85 });
    // Wooden frame (two vertical rails + cross bar)
    for (let side = -1; side <= 1; side += 2) {
      const rail = new THREE.Mesh(this._boxGeo, packFrameMat);
      rail.scale.set(h * 0.015, h * 0.28, h * 0.015);
      rail.position.set(side * h * 0.1, h * 0.55, -h * 0.17);
      body.add(rail);
    }
    // Cross bars
    for (const yOff of [0.44, 0.62]) {
      const crossBar = new THREE.Mesh(this._boxGeo, packFrameMat);
      crossBar.scale.set(h * 0.2, h * 0.015, h * 0.015);
      crossBar.position.set(0, h * yOff, -h * 0.17);
      body.add(crossBar);
    }
    // Bundle (wrapped cloth/sack)
    const bundleGeo = new THREE.SphereGeometry(h * 0.1, 7, 6);
    const bundle = new THREE.Mesh(bundleGeo, packBundleMat);
    bundle.position.set(0, h * 0.55, -h * 0.2);
    bundle.scale.set(0.9, 1.1, 0.7);
    body.add(bundle);
    // Bundle tie (rope)
    const ropeGeo = new THREE.TorusGeometry(h * 0.08, h * 0.005, 4, 8);
    const rope = new THREE.Mesh(ropeGeo, new THREE.MeshStandardMaterial({ color: 0x8b7748, roughness: 0.9 }));
    rope.position.set(0, h * 0.55, -h * 0.16);
    rope.rotation.y = Math.PI * 0.5;
    body.add(rope);
    // Shoulder straps (visible from front)
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x6a4a20, roughness: 0.85 });
    for (let side = -1; side <= 1; side += 2) {
      const strap = new THREE.Mesh(this._boxGeo, strapMat);
      strap.scale.set(h * 0.025, h * 0.3, h * 0.015);
      strap.position.set(side * h * 0.08, h * 0.58, -h * 0.04);
      strap.rotation.x = -0.2;
      body.add(strap);
    }

    // === CARGO (resource being carried – on top of pack, hidden by default) ===
    const cargoMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const cargo = new THREE.Mesh(this._boxGeo, cargoMat);
    cargo.name = "cargo";
    cargo.scale.set(h * 0.18, h * 0.12, h * 0.12);
    cargo.position.set(0, h * 0.72, -h * 0.2);
    cargo.visible = false;
    body.add(cargo);

    // === SHADOW (simple circle on ground) ===
    const shadowGeo = new THREE.CircleGeometry(h * 0.15, 8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI * 0.5;
    shadow.position.y = -h * 0.35;
    g.add(shadow);

    g.castShadow = true;
    return g;
  }

  // -----------------------------------------------------------------------
  // Workers (visible building workers)
  // -----------------------------------------------------------------------

  private _syncWorkers(state: SettlersState, t: number): void {
    for (const [id, mesh] of this._workerMeshes) {
      if (!state.workers.has(id)) {
        this.scene.remove(mesh);
        this._workerMeshes.delete(id);
      }
    }
    for (const [id, worker] of state.workers) {
      let mesh = this._workerMeshes.get(id);
      if (!mesh) {
        mesh = this._createWorkerMesh(state, worker.owner);
        this._workerMeshes.set(id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(worker.position.x, worker.position.y, worker.position.z);

      const isWalking = worker.state === "walking_to_building" || worker.state === "walking_to_hq";

      if (isWalking) {
        // Face movement direction
        const dx = worker.target.x - worker.start.x;
        const dz = worker.target.z - worker.start.z;
        if (dx !== 0 || dz !== 0) {
          mesh.rotation.y = Math.atan2(dx, dz);
        }

        // Walk animation
        const walkPhase = t * 6 + worker.pathProgress * 15;
        const legSwing = Math.sin(walkPhase) * 0.4;
        const leftLeg = mesh.getObjectByName("leftLeg") as THREE.Object3D | undefined;
        const rightLeg = mesh.getObjectByName("rightLeg") as THREE.Object3D | undefined;
        if (leftLeg) leftLeg.rotation.x = legSwing;
        if (rightLeg) rightLeg.rotation.x = -legSwing;
        const bob = Math.abs(Math.sin(walkPhase)) * 0.02;
        mesh.position.y = worker.position.y + bob;
      } else {
        // Idle: subtle breathing
        const leftLeg = mesh.getObjectByName("leftLeg") as THREE.Object3D | undefined;
        const rightLeg = mesh.getObjectByName("rightLeg") as THREE.Object3D | undefined;
        if (leftLeg) leftLeg.rotation.x = 0;
        if (rightLeg) rightLeg.rotation.x = 0;
        mesh.position.y = worker.position.y + Math.sin(t * 2) * 0.003;
      }
    }
  }

  private _createWorkerMesh(state: SettlersState, owner: string): THREE.Group {
    const g = new THREE.Group();
    const playerColor = this._getPlayerColor(owner, state);
    const h = SB.WORKER_HEIGHT;

    // Workers are simpler than carriers – green-ish tunic to distinguish
    const workerColor = new THREE.Color(playerColor).lerp(new THREE.Color(0x44aa44), 0.4).getHex();
    const tunicMat = new THREE.MeshStandardMaterial({ color: workerColor, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0ccaa, roughness: 0.7 });
    const pantMat = new THREE.MeshStandardMaterial({ color: 0x6a5a3a, roughness: 0.85 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x4a2e16, roughness: 0.9 });

    // Body
    const body = new THREE.Group();
    body.name = "body";
    g.add(body);

    // Torso
    const torsoGeo = new THREE.CylinderGeometry(h * 0.14, h * 0.17, h * 0.28, 6);
    const torso = new THREE.Mesh(torsoGeo, tunicMat);
    torso.position.y = h * 0.55;
    body.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(h * 0.08, 8, 6);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = h * 0.82;
    body.add(head);

    // Left leg
    const legGeo = new THREE.CylinderGeometry(h * 0.05, h * 0.045, h * 0.22, 5);
    const leftLeg = new THREE.Mesh(legGeo, pantMat);
    leftLeg.name = "leftLeg";
    leftLeg.position.set(-h * 0.07, h * 0.25, 0);
    g.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(legGeo, pantMat);
    rightLeg.name = "rightLeg";
    rightLeg.position.set(h * 0.07, h * 0.25, 0);
    g.add(rightLeg);

    // Boots
    const bootGeo = new THREE.BoxGeometry(h * 0.07, h * 0.05, h * 0.1);
    const lBoot = new THREE.Mesh(bootGeo, bootMat);
    lBoot.position.set(-h * 0.07, h * 0.12, h * 0.01);
    g.add(lBoot);
    const rBoot = new THREE.Mesh(bootGeo, bootMat);
    rBoot.position.set(h * 0.07, h * 0.12, h * 0.01);
    g.add(rBoot);

    // Shadow
    const shadowGeo = new THREE.CircleGeometry(h * 0.12, 6);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI * 0.5;
    shadow.position.y = -h * 0.35;
    g.add(shadow);

    g.castShadow = true;
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

      const leftLeg = mesh.getObjectByName("sLeftLeg") as THREE.Object3D | undefined;
      const rightLeg = mesh.getObjectByName("sRightLeg") as THREE.Object3D | undefined;
      const sword = mesh.getObjectByName("sword") as THREE.Object3D | undefined;

      if (soldier.state === "fighting") {
        // Combat animation: sword swings, body lunges, legs planted
        if (sword) {
          const swingPhase = t * 8;
          sword.rotation.z = Math.PI * 0.15 + Math.sin(swingPhase) * 0.6;
          sword.rotation.x = Math.cos(swingPhase * 0.7) * 0.2;
        }
        // Lunge forward and back
        const lungePhase = Math.sin(t * 4);
        mesh.children[0].rotation.x = lungePhase * 0.08;
        // Combat stance – legs slightly apart
        if (leftLeg) leftLeg.rotation.x = -0.15 + Math.sin(t * 3) * 0.1;
        if (rightLeg) rightLeg.rotation.x = 0.15 + Math.cos(t * 3) * 0.1;
        // Body bob from strikes
        mesh.position.y = soldier.position.y + Math.abs(Math.sin(t * 8)) * 0.015;
      } else if (soldier.state === "marching") {
        // March animation: legs, body bob, sword at side
        const phase = t * 6;
        if (leftLeg) leftLeg.rotation.x = Math.sin(phase) * 0.35;
        if (rightLeg) rightLeg.rotation.x = Math.sin(phase + Math.PI) * 0.35;
        if (sword) {
          sword.rotation.z = Math.PI * 0.15;
          sword.rotation.x = 0;
        }
        // Marching body bob
        mesh.position.y = soldier.position.y + Math.abs(Math.sin(phase)) * 0.015;
        mesh.children[0].rotation.x = 0.03;
        mesh.children[0].rotation.z = Math.sin(phase * 0.5) * 0.02;
      } else {
        // Idle / garrison exit – subtle weight shift
        if (leftLeg) leftLeg.rotation.x = 0;
        if (rightLeg) rightLeg.rotation.x = 0;
        if (sword) {
          sword.rotation.z = Math.PI * 0.15;
          sword.rotation.x = 0;
        }
        if (mesh.children[0]) {
          mesh.children[0].rotation.x = 0;
          mesh.children[0].rotation.z = 0;
        }
        // Idle breathing sway
        mesh.position.y = soldier.position.y + Math.sin(t * 1.8) * 0.004;
      }
    }
  }

  private _createSoldierMesh(state: SettlersState, owner: string, rank: number): THREE.Group {
    const g = new THREE.Group();
    const playerColor = this._getPlayerColor(owner, state);
    const h = SB.SOLDIER_HEIGHT;

    const tunicMat = new THREE.MeshStandardMaterial({ color: playerColor, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0ccaa, roughness: 0.7 });
    const armorMat = new THREE.MeshStandardMaterial({
      color: rank >= 3 ? 0xc8b060 : 0x888899,
      metalness: 0.6, roughness: 0.35,
    });
    const armorDkMat = new THREE.MeshStandardMaterial({
      color: rank >= 3 ? 0xa08838 : 0x666677,
      metalness: 0.5, roughness: 0.4,
    });
    const chainmailMat = new THREE.MeshStandardMaterial({
      color: 0x999999, metalness: 0.4, roughness: 0.6,
    });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.85 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x4a2e16, roughness: 0.9 });

    // === TORSO with layered armor ===
    // Base tunic
    const torso = new THREE.Mesh(this._boxGeo, tunicMat);
    torso.scale.set(h * 0.44, h * 0.35, h * 0.24);
    torso.position.y = h * 0.52;
    g.add(torso);

    // Chainmail over tunic (visible below chestplate)
    if (rank >= 1) {
      const chain = new THREE.Mesh(this._boxGeo, chainmailMat);
      chain.scale.set(h * 0.46, h * 0.15, h * 0.26);
      chain.position.y = h * 0.4;
      g.add(chain);
    }

    // Chestplate (layered over torso)
    const chestplate = new THREE.Mesh(this._boxGeo, armorMat);
    chestplate.scale.set(h * 0.46, h * 0.28, h * 0.27);
    chestplate.position.y = h * 0.56;
    g.add(chestplate);

    // Chest plate center ridge
    const ridge = new THREE.Mesh(this._boxGeo, armorDkMat);
    ridge.scale.set(h * 0.04, h * 0.22, h * 0.02);
    ridge.position.set(0, h * 0.56, h * 0.14);
    g.add(ridge);

    // Belt with pouches
    const belt = new THREE.Mesh(this._boxGeo, leatherMat);
    belt.scale.set(h * 0.47, h * 0.035, h * 0.27);
    belt.position.y = h * 0.4;
    g.add(belt);
    // Belt buckle
    const buckle = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({
      color: rank >= 3 ? 0xddaa33 : 0x999999, metalness: 0.6,
    }));
    buckle.scale.set(h * 0.05, h * 0.04, h * 0.02);
    buckle.position.set(0, h * 0.4, h * 0.14);
    g.add(buckle);
    // Belt pouch
    const pouch = new THREE.Mesh(this._boxGeo, leatherMat);
    pouch.scale.set(h * 0.06, h * 0.06, h * 0.05);
    pouch.position.set(-h * 0.18, h * 0.38, h * 0.12);
    g.add(pouch);

    // Shoulder pauldrons
    for (let side = -1; side <= 1; side += 2) {
      const pauldron = new THREE.Mesh(this._sphereGeo, armorMat);
      pauldron.scale.set(0.7, 0.5, 0.65);
      pauldron.position.set(side * h * 0.26, h * 0.7, 0);
      g.add(pauldron);
      // Pauldron rim
      const rim = new THREE.Mesh(new THREE.TorusGeometry(h * 0.065, h * 0.008, 4, 8, Math.PI),
        armorDkMat);
      rim.position.set(side * h * 0.26, h * 0.67, 0);
      rim.rotation.x = Math.PI * 0.5;
      rim.rotation.z = side * -0.3;
      g.add(rim);
    }

    // === NECK ===
    const neck = new THREE.Mesh(this._cylGeo, skinMat);
    neck.scale.set(0.35, h * 0.05, 0.35);
    neck.position.y = h * 0.76;
    g.add(neck);

    // Gorget (neck armor)
    const gorget = new THREE.Mesh(this._cylGeo, armorDkMat);
    gorget.scale.set(0.45, h * 0.035, 0.45);
    gorget.position.y = h * 0.73;
    g.add(gorget);

    // === HEAD ===
    const head = new THREE.Mesh(this._sphereGeo, skinMat);
    head.scale.set(1.5, 1.55, 1.4);
    head.position.y = h * 0.86;
    g.add(head);

    // Eyes
    for (let side = -1; side <= 1; side += 2) {
      const eyeW = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eyeW.scale.set(0.28, 0.22, 0.12);
      eyeW.position.set(side * h * 0.06, h * 0.88, h * 0.04);
      g.add(eyeW);
      const eye = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({ color: 0x332211 }));
      eye.scale.set(0.18, 0.18, 0.12);
      eye.position.set(side * h * 0.06, h * 0.88, h * 0.045);
      g.add(eye);
    }

    // === HELMET (detailed, rank-dependent) ===
    const helmetColor = rank >= 3 ? 0xddaa33 : rank >= 2 ? 0x999999 : 0x777788;
    const helmetMat = new THREE.MeshStandardMaterial({
      color: helmetColor, metalness: 0.65, roughness: 0.3,
    });

    // Helmet dome
    const helmet = new THREE.Mesh(this._sphereGeo, helmetMat);
    helmet.scale.set(1.8, 1.3, 1.7);
    helmet.position.y = h * 1.0;
    g.add(helmet);

    // Nose guard
    const noseGuard = new THREE.Mesh(this._boxGeo, helmetMat);
    noseGuard.scale.set(h * 0.02, h * 0.1, h * 0.04);
    noseGuard.position.set(0, h * 0.9, h * 0.06);
    g.add(noseGuard);

    // Helmet brow ridge
    const browRidge = new THREE.Mesh(this._boxGeo, helmetMat);
    browRidge.scale.set(h * 0.28, h * 0.02, h * 0.04);
    browRidge.position.set(0, h * 0.94, h * 0.05);
    g.add(browRidge);

    // Cheek guards
    for (let side = -1; side <= 1; side += 2) {
      const cheek = new THREE.Mesh(this._boxGeo, helmetMat);
      cheek.scale.set(h * 0.04, h * 0.1, h * 0.08);
      cheek.position.set(side * h * 0.12, h * 0.88, h * 0.01);
      g.add(cheek);
    }

    // Helmet crest (feathered for rank >= 2)
    if (rank >= 2) {
      const crestMat = new THREE.MeshStandardMaterial({
        color: rank >= 3 ? 0xff2222 : 0xcc2222, roughness: 0.7,
      });
      // Central crest ridge
      const crest = new THREE.Mesh(this._boxGeo, crestMat);
      crest.scale.set(h * 0.025, h * 0.18, h * 0.22);
      crest.position.y = h * 1.14;
      g.add(crest);
      // Feather plume segments
      for (let f = 0; f < 4; f++) {
        const feather = new THREE.Mesh(this._boxGeo, crestMat);
        feather.scale.set(h * 0.015, h * (0.12 - f * 0.015), h * 0.04);
        feather.position.set(0, h * (1.18 + f * 0.02), -h * (0.05 + f * 0.04));
        feather.rotation.x = f * 0.15;
        g.add(feather);
      }
    }

    // === ARMS (upper arm with armor + forearm + gauntlet) ===
    for (let side = -1; side <= 1; side += 2) {
      // Upper arm (sleeve + armor)
      const upperArm = new THREE.Mesh(this._cylGeo, tunicMat);
      upperArm.scale.set(0.38, h * 0.17, 0.38);
      upperArm.position.set(side * h * 0.3, h * 0.58, 0);
      upperArm.rotation.z = side * 0.15;
      g.add(upperArm);
      // Vambrace (forearm armor)
      const vambrace = new THREE.Mesh(this._cylGeo, armorMat);
      vambrace.scale.set(0.32, h * 0.14, 0.32);
      vambrace.position.set(side * h * 0.34, h * 0.42, 0);
      vambrace.rotation.z = side * 0.1;
      g.add(vambrace);
      // Gauntlet
      const gauntlet = new THREE.Mesh(this._boxGeo, armorDkMat);
      gauntlet.scale.set(h * 0.07, h * 0.06, h * 0.06);
      gauntlet.position.set(side * h * 0.36, h * 0.34, 0);
      g.add(gauntlet);
    }

    // === SHIELD (kite shield shape with emblem) ===
    // Kite shield from custom geometry
    const shieldVerts = new Float32Array([
      0, h * 0.15, 0,     // top center
      -h * 0.12, h * 0.08, 0.01,  // top left
      -h * 0.13, 0, 0,     // mid left
      0, -h * 0.18, 0.01,  // bottom point
      h * 0.13, 0, 0,      // mid right
      h * 0.12, h * 0.08, 0.01,   // top right
    ]);
    const shieldIdx = [0, 1, 5, 1, 2, 4, 1, 4, 5, 2, 3, 4];
    const shieldGeo = new THREE.BufferGeometry();
    shieldGeo.setAttribute("position", new THREE.Float32BufferAttribute(shieldVerts, 3));
    shieldGeo.setIndex(shieldIdx);
    shieldGeo.computeVertexNormals();
    const shieldMat = new THREE.MeshStandardMaterial({
      color: playerColor, metalness: 0.2, roughness: 0.5, side: THREE.DoubleSide,
    });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.position.set(-h * 0.38, h * 0.48, h * 0.05);
    g.add(shield);

    // Shield boss
    const boss = new THREE.Mesh(this._sphereGeo, armorMat);
    boss.scale.set(0.4, 0.4, 0.25);
    boss.position.set(-h * 0.38, h * 0.5, h * 0.06);
    g.add(boss);

    // Shield rim
    const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(h * 0.13, h * 0.008, 4, 8),
      armorDkMat);
    shieldRim.position.set(-h * 0.38, h * 0.5, h * 0.04);
    g.add(shieldRim);

    // === SWORD (blade + fuller + crossguard + grip + pommel) ===
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xdddde8, metalness: 0.75, roughness: 0.15,
    });
    // Blade
    const blade = new THREE.Mesh(this._boxGeo, bladeMat);
    blade.name = "sword";
    blade.scale.set(h * 0.03, h * 0.45, h * 0.008);
    blade.position.set(h * 0.36, h * 0.62, 0);
    blade.rotation.z = Math.PI * 0.15;
    g.add(blade);
    // Fuller (groove in blade)
    const fullerMat = new THREE.MeshStandardMaterial({ color: 0xaaaabc, metalness: 0.6, roughness: 0.2 });
    const fuller = new THREE.Mesh(this._boxGeo, fullerMat);
    fuller.scale.set(h * 0.01, h * 0.35, h * 0.002);
    fuller.position.set(h * 0.36, h * 0.64, h * 0.005);
    fuller.rotation.z = Math.PI * 0.15;
    g.add(fuller);
    // Crossguard
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x886633, metalness: 0.3, roughness: 0.5 });
    const guard = new THREE.Mesh(this._boxGeo, guardMat);
    guard.scale.set(h * 0.18, h * 0.025, h * 0.03);
    guard.position.set(h * 0.3, h * 0.4, 0);
    g.add(guard);
    // Grip (wrapped leather)
    const grip = new THREE.Mesh(this._cylGeo, leatherMat);
    grip.scale.set(0.2, h * 0.08, 0.2);
    grip.position.set(h * 0.28, h * 0.35, 0);
    grip.rotation.z = Math.PI * 0.15;
    g.add(grip);
    // Pommel
    const pommel = new THREE.Mesh(this._sphereGeo, new THREE.MeshStandardMaterial({
      color: rank >= 3 ? 0xddaa33 : 0x886633, metalness: 0.4,
    }));
    pommel.scale.set(0.3, 0.3, 0.3);
    pommel.position.set(h * 0.25, h * 0.3, 0);
    g.add(pommel);

    // === LEGS (armored, with greaves and boots) ===
    const pantMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.85 });

    // Left leg
    const leftLeg = new THREE.Group();
    leftLeg.name = "sLeftLeg";
    const lThigh = new THREE.Mesh(this._cylGeo, pantMat);
    lThigh.scale.set(0.42, h * 0.17, 0.42);
    lThigh.position.y = h * 0.08;
    leftLeg.add(lThigh);
    // Greave (shin armor)
    const lGreave = new THREE.Mesh(this._cylGeo, armorDkMat);
    lGreave.scale.set(0.36, h * 0.13, 0.36);
    lGreave.position.y = -h * 0.04;
    leftLeg.add(lGreave);
    // Knee cop
    const lKnee = new THREE.Mesh(this._sphereGeo, armorMat);
    lKnee.scale.set(0.35, 0.3, 0.3);
    lKnee.position.set(0, h * 0.01, h * 0.02);
    leftLeg.add(lKnee);
    // Boot
    const lBoot = new THREE.Mesh(this._boxGeo, bootMat);
    lBoot.scale.set(h * 0.08, h * 0.07, h * 0.14);
    lBoot.position.set(0, -h * 0.11, h * 0.02);
    leftLeg.add(lBoot);
    leftLeg.position.set(-h * 0.12, h * 0.2, 0);
    g.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Group();
    rightLeg.name = "sRightLeg";
    const rThigh = new THREE.Mesh(this._cylGeo, pantMat);
    rThigh.scale.set(0.42, h * 0.17, 0.42);
    rThigh.position.y = h * 0.08;
    rightLeg.add(rThigh);
    const rGreave = new THREE.Mesh(this._cylGeo, armorDkMat);
    rGreave.scale.set(0.36, h * 0.13, 0.36);
    rGreave.position.y = -h * 0.04;
    rightLeg.add(rGreave);
    const rKnee = new THREE.Mesh(this._sphereGeo, armorMat);
    rKnee.scale.set(0.35, 0.3, 0.3);
    rKnee.position.set(0, h * 0.01, h * 0.02);
    rightLeg.add(rKnee);
    const rBoot = new THREE.Mesh(this._boxGeo, bootMat);
    rBoot.scale.set(h * 0.08, h * 0.07, h * 0.14);
    rBoot.position.set(0, -h * 0.11, h * 0.02);
    rightLeg.add(rBoot);
    rightLeg.position.set(h * 0.12, h * 0.2, 0);
    g.add(rightLeg);

    // === CAPE (rank >= 2) ===
    if (rank >= 2) {
      const capeMat = new THREE.MeshStandardMaterial({
        color: playerColor, roughness: 0.75, side: THREE.DoubleSide,
      });
      const capeVerts = new Float32Array([
        -h * 0.18, h * 0.7, -h * 0.13,   // top left
        h * 0.18, h * 0.7, -h * 0.13,    // top right
        h * 0.22, h * 0.15, -h * 0.18,   // bottom right
        -h * 0.22, h * 0.15, -h * 0.18,  // bottom left
        0, h * 0.72, -h * 0.14,           // top center
        0, h * 0.1, -h * 0.2,             // bottom center
      ]);
      const capeIdx = [0, 4, 3, 4, 5, 3, 4, 1, 5, 1, 2, 5];
      const capeGeo = new THREE.BufferGeometry();
      capeGeo.setAttribute("position", new THREE.Float32BufferAttribute(capeVerts, 3));
      capeGeo.setIndex(capeIdx);
      capeGeo.computeVertexNormals();
      const cape = new THREE.Mesh(capeGeo, capeMat);
      g.add(cape);

      // Cape clasp at neck
      const clasp = new THREE.Mesh(this._sphereGeo, new THREE.MeshStandardMaterial({
        color: rank >= 3 ? 0xddaa33 : 0xcccccc, metalness: 0.5,
      }));
      clasp.scale.set(0.25, 0.25, 0.2);
      clasp.position.set(0, h * 0.72, -h * 0.12);
      g.add(clasp);
    }

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
  // Frustum culling for entity meshes and decoration groups
  // -----------------------------------------------------------------------

  private _frustumCullEntities(): void {
    const _sphere = new THREE.Sphere();
    const _pos = new THREE.Vector3();

    // Cull building meshes
    for (const [, mesh] of this._buildingMeshes) {
      _pos.copy(mesh.position);
      _sphere.set(_pos, 5); // generous radius for buildings
      mesh.visible = this._frustum.intersectsSphere(_sphere);
    }

    // Cull flag meshes
    for (const [, mesh] of this._flagMeshes) {
      _pos.copy(mesh.position);
      _sphere.set(_pos, 2);
      mesh.visible = this._frustum.intersectsSphere(_sphere);
    }

    // Cull carrier meshes
    for (const [, mesh] of this._carrierMeshes) {
      _pos.copy(mesh.position);
      _sphere.set(_pos, 1.5);
      mesh.visible = this._frustum.intersectsSphere(_sphere);
    }

    // Cull worker meshes
    for (const [, mesh] of this._workerMeshes) {
      _pos.copy(mesh.position);
      _sphere.set(_pos, 1.5);
      mesh.visible = this._frustum.intersectsSphere(_sphere);
    }

    // Cull soldier meshes
    for (const [, mesh] of this._soldierMeshes) {
      _pos.copy(mesh.position);
      _sphere.set(_pos, 1.5);
      mesh.visible = this._frustum.intersectsSphere(_sphere);
    }

    // Cull scaffold meshes
    for (const [, mesh] of this._scaffoldMeshes) {
      _pos.copy(mesh.position);
      _sphere.set(_pos, 5);
      mesh.visible = this._frustum.intersectsSphere(_sphere);
    }

    // Cull spinner meshes
    for (const [, mesh] of this._spinnerMeshes) {
      _pos.copy(mesh.position);
      _sphere.set(_pos, 1);
      mesh.visible = this._frustum.intersectsSphere(_sphere);
    }

    // Cull individual decoration children (trees, rocks, grass)
    for (const child of this._treesGroup.children) {
      _pos.copy(child.position);
      _sphere.set(_pos, 4);
      child.visible = this._frustum.intersectsSphere(_sphere);
    }

    for (const child of this._rocksGroup.children) {
      _pos.copy(child.position);
      _sphere.set(_pos, 3);
      child.visible = this._frustum.intersectsSphere(_sphere);
    }

    for (const child of this._grassGroup.children) {
      _pos.copy(child.position);
      _sphere.set(_pos, 1);
      child.visible = this._frustum.intersectsSphere(_sphere);
    }

    for (const child of this._depositsGroup.children) {
      _pos.copy(child.position);
      _sphere.set(_pos, 1);
      child.visible = this._frustum.intersectsSphere(_sphere);
    }
  }

  // -----------------------------------------------------------------------
  // Road preview line (drawn while road tool is active)
  // -----------------------------------------------------------------------

  private _updateRoadPreview(state: SettlersState): void {
    const drawing = state.roadDrawing;

    if (!drawing.active || drawing.path.length === 0) {
      // Remove preview if not drawing
      if (this._roadPreviewLine) {
        this.scene.remove(this._roadPreviewLine);
        this._roadPreviewLine.geometry.dispose();
        (this._roadPreviewLine.material as THREE.Material).dispose();
        this._roadPreviewLine = null;
      }
      return;
    }

    // Build path points including current hovered tile
    const pathPoints: THREE.Vector3[] = [];
    for (const p of drawing.path) {
      const wx = (p.x + 0.5) * SB.TILE_SIZE;
      const wz = (p.z + 0.5) * SB.TILE_SIZE;
      const wy = getHeightAt(state.map, wx, wz) + 0.15;
      pathPoints.push(new THREE.Vector3(wx, wy, wz));
    }

    // Extend to hovered tile if different from last path point
    if (state.hoveredTile) {
      const last = drawing.path[drawing.path.length - 1];
      if (state.hoveredTile.x !== last.x || state.hoveredTile.z !== last.z) {
        const wx = (state.hoveredTile.x + 0.5) * SB.TILE_SIZE;
        const wz = (state.hoveredTile.z + 0.5) * SB.TILE_SIZE;
        const wy = getHeightAt(state.map, wx, wz) + 0.15;
        pathPoints.push(new THREE.Vector3(wx, wy, wz));
      }
    }

    if (pathPoints.length < 2) {
      if (this._roadPreviewLine) {
        this.scene.remove(this._roadPreviewLine);
        this._roadPreviewLine.geometry.dispose();
        (this._roadPreviewLine.material as THREE.Material).dispose();
        this._roadPreviewLine = null;
      }
      return;
    }

    // Remove old line
    if (this._roadPreviewLine) {
      this.scene.remove(this._roadPreviewLine);
      this._roadPreviewLine.geometry.dispose();
      (this._roadPreviewLine.material as THREE.Material).dispose();
      this._roadPreviewLine = null;
    }

    // Create new line
    const geo = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const pulse = 0.5 + Math.sin(Date.now() * 0.006) * 0.3;
    const mat = new THREE.LineBasicMaterial({
      color: 0xffdd44,
      linewidth: 2,
      transparent: true,
      opacity: pulse,
    });
    this._roadPreviewLine = new THREE.Line(geo, mat);
    this._roadPreviewLine.renderOrder = 999;
    (this._roadPreviewLine.material as THREE.LineBasicMaterial).depthTest = false;
    this.scene.add(this._roadPreviewLine);
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private _getPlayerColor(playerId: string, state: SettlersState): number {
    const player = state.players.get(playerId);
    return player ? player.color : 0xaaaaaa;
  }
}
