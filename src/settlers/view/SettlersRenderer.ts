// ---------------------------------------------------------------------------
// Settlers – Three.js renderer (enhanced visuals)
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { SB } from "../config/SettlersBalance";
import { Biome, Deposit, getHeightAt, getVertex, tileIdx } from "../state/SettlersMap";
import { BUILDING_DEFS, SettlersBuildingType } from "../config/SettlersBuildingDefs";
import { RESOURCE_META } from "../config/SettlersResourceDefs";
import { Visibility } from "../state/SettlersMap";
import type { SettlersState } from "../state/SettlersState";
import type { SettlersBuilding } from "../state/SettlersBuilding";
import type { SettlersFlag, RoadQuality } from "../state/SettlersRoad";
import type { SoldierType } from "../state/SettlersUnit";

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

/** Hash-based value noise for vertex color variation (matches terrain system) */
function _hashR(ix: number, iz: number, seed: number): number {
  let h = (ix * 374761393 + iz * 668265263 + seed * 1274126177) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return (h & 0x7fffffff) / 0x7fffffff;
}
function _smoothstepR(t: number): number { return t * t * (3 - 2 * t); }
function _vnoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = _smoothstepR(x - ix);
  const fz = _smoothstepR(z - iz);
  const v00 = _hashR(ix, iz, seed) * 2 - 1;
  const v10 = _hashR(ix + 1, iz, seed) * 2 - 1;
  const v01 = _hashR(ix, iz + 1, seed) * 2 - 1;
  const v11 = _hashR(ix + 1, iz + 1, seed) * 2 - 1;
  const top = v00 + (v10 - v00) * fx;
  const bot = v01 + (v11 - v01) * fx;
  return top + (bot - top) * fz;
}

/** Multi-octave color noise for rich surface variation */
function _colorNoise(x: number, z: number, seed: number): number {
  return (
    _vnoise(x * 0.7, z * 0.7, seed) * 0.5 +
    _vnoise(x * 1.8, z * 1.8, seed + 37) * 0.3 +
    _vnoise(x * 4.3, z * 4.3, seed + 71) * 0.2
  );
}

// Terrain subdivision: vertices per tile edge (4 = 16 sub-quads per tile)
const TERRAIN_SUB = 4;

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
  private _roadMeshes = new Map<string, THREE.Group>();
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

  // Fog of war overlay
  private _fogMesh: THREE.Mesh | null = null;

  // Building level indicators (star meshes above buildings)
  private _levelIndicators = new Map<string, { group: THREE.Group; level: number }>();

  // Clouds
  private _cloudGroup = new THREE.Group();

  // Frustum culling
  private _frustum = new THREE.Frustum();
  private _projScreenMatrix = new THREE.Matrix4();

  // Building placement preview overlays
  private _placementPreviewGroup = new THREE.Group();
  private _territoryRadiusPreview: THREE.Mesh | null = null;
  private _placementTileOverlays: THREE.Mesh[] = [];
  private _resourceHighlights: THREE.Mesh[] = [];
  private _lastPreviewKey = "";

  // Bottleneck warning icons (floating yellow triangles above idle buildings)
  private _warningIcons = new Map<string, THREE.Group>();

  // Road preview line (shown while drawing a road)
  private _roadPreviewLine: THREE.Line | null = null;

  // Cached geometries (higher polygon counts for visual quality)
  private _boxGeo = new THREE.BoxGeometry(1, 1, 1, 3, 3, 3);
  private _coneGeo = new THREE.ConeGeometry(0.5, 1, 24);
  private _cylGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 24);
  private _sphereGeo = new THREE.SphereGeometry(0.15, 24, 16);

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
    this.scene.add(this._placementPreviewGroup);

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
    const ts = map.tileSize;
    const sub = TERRAIN_SUB;
    const segsX = w * sub;
    const segsZ = h * sub;

    // High-resolution terrain geometry
    const geo = new THREE.PlaneGeometry(w * ts, h * ts, segsX, segsZ);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors: number[] = [];
    const tmp = new THREE.Color();
    const tmp2 = new THREE.Color();
    const snowColor = new THREE.Color(0xeeeeff);
    const sandColor = new THREE.Color(0xc8b878);
    const cliffColor = new THREE.Color(0x706858);
    const dirtColor = new THREE.Color(0x8a7a5a);

    for (let i = 0; i < pos.count; i++) {
      const svx = i % (segsX + 1);
      const svz = Math.floor(i / (segsX + 1));

      // Map sub-vertex to continuous tile coords
      const fx = svx / sub;
      const fz = svz / sub;

      // Interpolate height from heightmap
      const height = getHeightAt(map, fx * ts, fz * ts);

      // Add micro-displacement for surface texture at sub-tile level
      const microH = _vnoise(fx * 2.5, fz * 2.5, 42) * 0.06 +
                      _vnoise(fx * 6.0, fz * 6.0, 99) * 0.02;

      pos.setY(i, height + microH);
      pos.setX(i, fx * ts);
      pos.setZ(i, fz * ts);

      // --- Vertex color computation ---

      // Determine biome at this point (sample the nearest tile)
      const tx = Math.min(Math.floor(fx), w - 1);
      const tz = Math.min(Math.floor(fz), h - 1);
      const biome = map.biomes[tz * w + tx];

      // Sample neighboring biomes for blending at tile edges
      const fracX = fx - tx;
      const fracZ = fz - tz;
      let blendBiome = biome;
      if (fracX > 0.7 && tx + 1 < w) blendBiome = map.biomes[tz * w + tx + 1];
      else if (fracZ > 0.7 && tz + 1 < h) blendBiome = map.biomes[(tz + 1) * w + tx];

      const base = BIOME_BASE[biome] || BIOME_BASE[Biome.MEADOW];
      const vari = BIOME_VAR[biome] || BIOME_VAR[Biome.MEADOW];

      // Multi-frequency noise for rich color variation
      const n1 = _colorNoise(fx, fz, 7.3) * 0.5 + 0.5;
      const n2 = _vnoise(fx * 3.2, fz * 3.2, 17.1) * 0.5 + 0.5;
      tmp.lerpColors(base, vari, n1 * 0.7 + n2 * 0.3);

      // Biome edge blending – soften transitions
      if (blendBiome !== biome) {
        const blendBase = BIOME_BASE[blendBiome] || BIOME_BASE[Biome.MEADOW];
        const blendFactor = Math.max(fracX - 0.7, fracZ - 0.7) / 0.3;
        tmp2.copy(blendBase);
        tmp.lerp(tmp2, Math.min(1, blendFactor) * 0.5);
      }

      // Calculate slope from nearby height samples for cliff/slope coloring
      const dx1 = getHeightAt(map, Math.min(fx + 0.3, w) * ts, fz * ts);
      const dx0 = getHeightAt(map, Math.max(fx - 0.3, 0) * ts, fz * ts);
      const dz1 = getHeightAt(map, fx * ts, Math.min(fz + 0.3, h) * ts);
      const dz0 = getHeightAt(map, fx * ts, Math.max(fz - 0.3, 0) * ts);
      const slopeX = (dx1 - dx0) / (0.6 * ts);
      const slopeZ = (dz1 - dz0) / (0.6 * ts);
      const slope = Math.sqrt(slopeX * slopeX + slopeZ * slopeZ);

      // Cliff faces get rocky/earthy color
      if (slope > 0.3) {
        const cliffBlend = Math.min(1, (slope - 0.3) / 0.5);
        tmp.lerp(cliffColor, cliffBlend * 0.7);
      }

      // Height-based tint (more nuanced)
      const normalizedH = height / SB.MAX_HEIGHT;
      const hFactor = 0.80 + normalizedH * 0.38;
      tmp.r *= hFactor;
      tmp.g *= hFactor;
      tmp.b *= hFactor;

      // Dirt patches in meadows (procedural)
      if (biome === Biome.MEADOW) {
        const dirtN = _vnoise(fx * 2.0, fz * 2.0, 333);
        if (dirtN > 0.4) {
          tmp.lerp(dirtColor, (dirtN - 0.4) * 0.5);
        }
      }

      // Snow on mountain peaks with noise-based edge
      if (biome === Biome.MOUNTAIN && normalizedH > 0.7) {
        const snowNoise = _vnoise(fx * 3, fz * 3, 55) * 0.1;
        const snowLine = 0.7 + snowNoise;
        if (normalizedH > snowLine) {
          const snowBlend = Math.min(1, (normalizedH - snowLine) / 0.15);
          // Less snow on steep slopes
          const slopePenalty = Math.min(1, slope * 2);
          tmp.lerp(snowColor, snowBlend * 0.7 * (1 - slopePenalty * 0.6));
        }
      }

      // Sandy shore near water with noise-based edge
      if (biome !== Biome.WATER && normalizedH < SB.WATER_LEVEL + 0.1) {
        const sandNoise = _vnoise(fx * 4, fz * 4, 77) * 0.03;
        const sandLine = SB.WATER_LEVEL + 0.1 + sandNoise;
        if (normalizedH < sandLine) {
          const sandBlend = 1 - (normalizedH - SB.WATER_LEVEL) / (sandLine - SB.WATER_LEVEL);
          tmp.lerp(sandColor, Math.max(0, sandBlend) * 0.75);
        }
      }

      // Subtle ambient occlusion in valleys (darker in low areas)
      if (normalizedH < 0.25 && biome !== Biome.WATER) {
        const aoFactor = 1 - (0.25 - normalizedH) * 0.4;
        tmp.r *= aoFactor;
        tmp.g *= aoFactor;
        tmp.b *= aoFactor;
      }

      colors.push(tmp.r, tmp.g, tmp.b);
    }

    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.02,
      flatShading: false,
    });

    this._terrainMesh = new THREE.Mesh(geo, mat);
    this._terrainMesh.receiveShadow = true;
    this._terrainMesh.castShadow = true;
    this.scene.add(this._terrainMesh);

    // Water plane with vertex displacement
    const waterSegs = Math.max(64, w);
    const waterGeo = new THREE.PlaneGeometry(w * ts * 1.4, h * ts * 1.4, waterSegs, waterSegs);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1a7090,
      transparent: true,
      opacity: 0.6,
      roughness: 0.02,
      metalness: 0.5,
      side: THREE.DoubleSide,
    });
    this._waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this._waterMesh.rotation.x = -Math.PI / 2;
    this._waterMesh.position.set(
      w * ts * 0.5,
      SB.WATER_LEVEL * SB.MAX_HEIGHT - 0.1,
      h * ts * 0.5,
    );
    this.scene.add(this._waterMesh);

    // Decorations
    this._buildTrees(state);
    this._buildRocks(state);
    this._buildGrass(state);
    this._buildDeposits(state);

    // Fog of war overlay – a semi-transparent plane matching the terrain grid
    this._buildFogOverlay(state);
  }

  /** Create (or recreate) the fog-of-war overlay mesh */
  private _buildFogOverlay(state: SettlersState): void {
    if (this._fogMesh) {
      this.scene.remove(this._fogMesh);
      this._fogMesh.geometry.dispose();
      (this._fogMesh.material as THREE.Material).dispose();
    }

    const map = state.map;
    const w = map.width;
    const h = map.height;

    // Same grid as terrain but using vertex alpha for fog darkness
    const fogGeo = new THREE.PlaneGeometry(w * map.tileSize, h * map.tileSize, w, h);
    fogGeo.rotateX(-Math.PI / 2);

    // Position vertices to match terrain heightmap (slightly above to prevent z-fighting)
    const pos = fogGeo.attributes.position;
    const alphas: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const vx = i % (w + 1);
      const vz = Math.floor(i / (w + 1));
      const height = getVertex(map, vx, vz);
      pos.setX(i, vx * map.tileSize);
      pos.setY(i, height + 0.15);
      pos.setZ(i, vz * map.tileSize);
      alphas.push(1.0); // default: fully dark (HIDDEN)
    }

    fogGeo.setAttribute("alpha", new THREE.Float32BufferAttribute(alphas, 1));
    fogGeo.computeVertexNormals();

    const fogMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {},
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          if (vAlpha < 0.01) discard;
          gl_FragColor = vec4(0.0, 0.0, 0.0, vAlpha);
        }
      `,
    });

    this._fogMesh = new THREE.Mesh(fogGeo, fogMat);
    this._fogMesh.renderOrder = 999; // render on top
    this._fogMesh.frustumCulled = false;
    this.scene.add(this._fogMesh);
  }

  /** Update the fog overlay vertex alphas from the visibility grid */
  private _updateFogOverlay(state: SettlersState): void {
    if (!this._fogMesh) return;

    const map = state.map;
    const w = map.width;
    const h = map.height;
    const vis = map.visibility[0]; // player 0 (human)

    const alphaAttr = this._fogMesh.geometry.getAttribute("alpha") as THREE.BufferAttribute;

    for (let i = 0; i < alphaAttr.count; i++) {
      const vx = i % (w + 1);
      const vz = Math.floor(i / (w + 1));

      // Sample the tile this vertex belongs to (clamp to grid)
      const tx = Math.min(vx, w - 1);
      const tz = Math.min(vz, h - 1);
      const tileVis = vis[tz * w + tx];

      let alpha: number;
      if (tileVis === Visibility.VISIBLE) {
        alpha = 0.0;   // fully clear
      } else if (tileVis === Visibility.EXPLORED) {
        alpha = 0.45;  // dimmed
      } else {
        alpha = 0.85;  // dark (HIDDEN)
      }

      alphaAttr.setX(i, alpha);
    }

    alphaAttr.needsUpdate = true;
  }

  /**
   * Hide/show entities based on fog of war visibility for the human player (p0).
   * - Enemy carriers & soldiers: hidden unless tile is VISIBLE
   * - Enemy buildings: visible in EXPLORED tiles (but we could dim them)
   * - Own entities: always visible
   */
  private _applyFogVisibility(state: SettlersState): void {
    const map = state.map;
    const vis = map.visibility[0]; // human player

    // Hide enemy carriers in non-visible tiles
    for (const [id, mesh] of this._carrierMeshes) {
      const carrier = state.carriers.get(id);
      if (!carrier || carrier.owner === "p0") continue;
      const tx = Math.floor(carrier.position.x / map.tileSize);
      const tz = Math.floor(carrier.position.z / map.tileSize);
      if (tx >= 0 && tx < map.width && tz >= 0 && tz < map.height) {
        mesh.visible = vis[tz * map.width + tx] === Visibility.VISIBLE;
      } else {
        mesh.visible = false;
      }
    }

    // Hide enemy soldiers in non-visible tiles
    for (const [id, mesh] of this._soldierMeshes) {
      const soldier = state.soldiers.get(id);
      if (!soldier || soldier.owner === "p0") continue;
      const tx = Math.floor(soldier.position.x / map.tileSize);
      const tz = Math.floor(soldier.position.z / map.tileSize);
      if (tx >= 0 && tx < map.width && tz >= 0 && tz < map.height) {
        mesh.visible = vis[tz * map.width + tx] === Visibility.VISIBLE;
      } else {
        mesh.visible = false;
      }
    }

    // Enemy buildings: hide in HIDDEN tiles, show (but dimmed) in EXPLORED, full in VISIBLE
    for (const [id, mesh] of this._buildingMeshes) {
      const building = state.buildings.get(id);
      if (!building || building.owner === "p0") continue;
      const def = BUILDING_DEFS[building.type];
      const cx = building.tileX + Math.floor(def.footprint.w / 2);
      const cz = building.tileZ + Math.floor(def.footprint.h / 2);
      if (cx >= 0 && cx < map.width && cz >= 0 && cz < map.height) {
        const tileVis = vis[cz * map.width + cx];
        mesh.visible = tileVis !== Visibility.HIDDEN;
      } else {
        mesh.visible = false;
      }
    }

    // Enemy flags: same as buildings
    for (const [id, mesh] of this._flagMeshes) {
      const flag = state.flags.get(id);
      if (!flag || flag.owner === "p0") continue;
      const tx = flag.tileX;
      const tz = flag.tileZ;
      if (tx >= 0 && tx < map.width && tz >= 0 && tz < map.height) {
        const tileVis = vis[tz * map.width + tx];
        mesh.visible = tileVis !== Visibility.HIDDEN;
      } else {
        mesh.visible = false;
      }
    }
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

    // Fog of war overlay
    this._updateFogOverlay(state);
    this._applyFogVisibility(state);

    // Frustum-cull entity meshes
    this._frustumCullEntities();

    // Road preview
    this._updateRoadPreview(state);

    // Building placement preview
    this._updatePlacementPreview(state);

    // Bottleneck warning icons
    this._updateWarningIcons(state, t);

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
    for (const [, m] of this._levelIndicators) this.scene.remove(m.group);
    this._buildingMeshes.clear();
    this._flagMeshes.clear();
    this._carrierMeshes.clear();
    this._workerMeshes.clear();
    this._soldierMeshes.clear();
    this._roadMeshes.clear();
    this._roadQualities.clear();
    this._scaffoldMeshes.clear();
    this._spinnerMeshes.clear();
    this._levelIndicators.clear();

    if (this._territoryLine) {
      this.scene.remove(this._territoryLine);
      this._territoryLine = null;
    }

    // Clear placement preview and warning icons
    this._clearPlacementPreview();
    for (const [, icon] of this._warningIcons) {
      this.scene.remove(icon);
    }
    this._warningIcons.clear();

    // Rebuild terrain + fog
    if (this._terrainMesh) this.scene.remove(this._terrainMesh);
    if (this._waterMesh) this.scene.remove(this._waterMesh);
    if (this._fogMesh) {
      this.scene.remove(this._fogMesh);
      this._fogMesh.geometry.dispose();
      (this._fogMesh.material as THREE.Material).dispose();
      this._fogMesh = null;
    }
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

    // Dispose placement preview
    this._clearPlacementPreview();

    // Dispose warning icons
    for (const [, icon] of this._warningIcons) {
      this.scene.remove(icon);
      icon.traverse((c: any) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }
    this._warningIcons.clear();

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

    // Dispose fog overlay
    if (this._fogMesh) {
      this.scene.remove(this._fogMesh);
      this._fogMesh.geometry.dispose();
      (this._fogMesh.material as THREE.Material).dispose();
      this._fogMesh = null;
    }

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
        // Clean up scaffold / spinner / level indicator
        const scaffold = this._scaffoldMeshes.get(id);
        if (scaffold) { this.scene.remove(scaffold); this._scaffoldMeshes.delete(id); }
        const spinner = this._spinnerMeshes.get(id);
        if (spinner) { this.scene.remove(spinner); this._spinnerMeshes.delete(id); }
        const lvlInd = this._levelIndicators.get(id);
        if (lvlInd) { this.scene.remove(lvlInd.group); this._levelIndicators.delete(id); }
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

      // Level indicators (star-like meshes for upgraded buildings)
      if (building.level > 1 && progress >= 1) {
        const existing = this._levelIndicators.get(id);
        if (!existing || existing.level !== building.level) {
          // Remove old indicator
          if (existing) { this.scene.remove(existing.group); }
          // Create new indicator group
          const indGroup = new THREE.Group();
          const starMat = new THREE.MeshStandardMaterial({
            color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 0.6,
            roughness: 0.3, metalness: 0.5,
          });
          const starCount = building.level - 1;
          const fwInd = def.footprint.w * ts;
          const bh = def.size === "large" ? fwInd * 1.1 : def.size === "medium" ? fwInd * 0.85 : fwInd * 0.7;
          for (let s = 0; s < starCount; s++) {
            const star = new THREE.Mesh(this._sphereGeo, starMat);
            star.scale.set(1.5, 1.5, 1.5);
            const offset = (s - (starCount - 1) * 0.5) * 0.4;
            star.position.set(offset, bh + 0.4, 0);
            indGroup.add(star);
          }
          indGroup.position.copy(mesh.position);
          this._levelIndicators.set(id, { group: indGroup, level: building.level });
          this.scene.add(indGroup);
        }
        // Animate the stars: gentle bobbing
        const ind = this._levelIndicators.get(id)!;
        ind.group.position.y = mesh.position.y + Math.sin(t * 2) * 0.05;
      } else {
        // Remove indicator if not applicable
        const existing = this._levelIndicators.get(id);
        if (existing) {
          this.scene.remove(existing.group);
          this._levelIndicators.delete(id);
        }
      }

      // Also scale building slightly taller per level
      if (building.level > 1 && progress >= 1) {
        const scaleY = 1 + (building.level - 1) * 0.1;
        mesh.scale.set(1, scaleY, 1);
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
  private _createRidgeRoof(w: number, h: number, d: number, mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const hw = w * 0.5, hd = d * 0.5;
    const overhang = w * 0.12;

    // Ridge spans the full depth of the roof
    const ridgeFront = -(hd + overhang);
    const ridgeBack = hd + overhang;
    const eaveL = -(hw + overhang);
    const eaveR = hw + overhang;

    // --- Main roof slopes + gable ends (fully closed) ---
    const verts = new Float32Array([
      // Left slope (2 triangles)
      eaveL, 0, ridgeFront,           // 0: left-front eave
      0, h, ridgeFront,               // 1: ridge-front
      0, h, ridgeBack,                // 2: ridge-back
      eaveL, 0, ridgeBack,            // 3: left-back eave
      // Right slope (2 triangles)
      eaveR, 0, ridgeFront,           // 4: right-front eave
      0, h, ridgeFront,               // 5: ridge-front (shared pos)
      0, h, ridgeBack,                // 6: ridge-back (shared pos)
      eaveR, 0, ridgeBack,            // 7: right-back eave
      // Front gable triangle
      eaveL, 0, ridgeFront,           // 8
      eaveR, 0, ridgeFront,           // 9
      0, h, ridgeFront,               // 10
      // Back gable triangle
      eaveL, 0, ridgeBack,            // 11
      eaveR, 0, ridgeBack,            // 12
      0, h, ridgeBack,                // 13
      // Underside (close the bottom so roof isn't open)
      eaveL, 0, ridgeFront,           // 14
      eaveR, 0, ridgeFront,           // 15
      eaveR, 0, ridgeBack,            // 16
      eaveL, 0, ridgeBack,            // 17
    ]);
    const idx = [
      0,1,2, 0,2,3,     // left slope
      4,6,5, 4,7,6,     // right slope
      8,10,9,            // front gable
      11,12,13,          // back gable
      14,16,15, 14,17,16 // underside
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const roofMesh = new THREE.Mesh(geo, mat);
    roofMesh.castShadow = true;
    g.add(roofMesh);

    // --- Ridge cap (decorative strip along the peak) ---
    const ridgeCap = new THREE.Mesh(this._boxGeo, (mat as THREE.MeshStandardMaterial).clone());
    ((ridgeCap.material as THREE.MeshStandardMaterial).color as THREE.Color).multiplyScalar(0.8);
    ridgeCap.scale.set(w * 0.04, h * 0.08, d + overhang * 2 + 0.02);
    ridgeCap.position.set(0, h - h * 0.02, 0);
    ridgeCap.castShadow = true;
    g.add(ridgeCap);

    // --- Fascia boards along eaves (L and R edges) ---
    const fasciaMat = this._woodMat.clone();
    (fasciaMat as THREE.MeshStandardMaterial).transparent = true;
    for (const side of [-1, 1]) {
      const fascia = new THREE.Mesh(this._boxGeo, fasciaMat);
      fascia.scale.set(0.02, 0.025, d + overhang * 2);
      fascia.position.set(side * (hw + overhang), 0, 0);
      g.add(fascia);
    }

    return g;
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

    if (def.type === SettlersBuildingType.WALL) {
      // ===== WALL – simple stone block =====
      const wallH = ts * 0.8;
      const wallMat = this._stoneMat.clone();
      (wallMat as THREE.MeshStandardMaterial).transparent = true;
      const wallBlock = new THREE.Mesh(this._boxGeo, wallMat);
      wallBlock.scale.set(ts * 0.85, wallH, ts * 0.85);
      wallBlock.position.y = wallH * 0.5;
      wallBlock.castShadow = true;
      g.add(wallBlock);

      // Stone texture lines
      for (let row = 0; row < 3; row++) {
        const line = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({ color: 0x666660, roughness: 0.95 }));
        line.scale.set(ts * 0.87, 0.015, ts * 0.87);
        line.position.y = wallH * (0.2 + row * 0.3);
        g.add(line);
      }

      // Battlements on top
      for (let m = 0; m < 4; m++) {
        const merlon = new THREE.Mesh(this._boxGeo, wallMat);
        merlon.scale.set(ts * 0.18, wallH * 0.2, ts * 0.18);
        const mx = (m % 2 === 0 ? -1 : 1) * ts * 0.28;
        const mz = (m < 2 ? -1 : 1) * ts * 0.28;
        merlon.position.set(mx, wallH + wallH * 0.1, mz);
        g.add(merlon);
      }

      // Moss patches on sides
      const mossMat = new THREE.MeshStandardMaterial({ color: 0x4a6b3a, roughness: 0.95, transparent: true });
      for (let mp = 0; mp < 3; mp++) {
        const moss = new THREE.Mesh(this._boxGeo, mossMat);
        moss.scale.set(ts * 0.12, ts * 0.06, 0.02);
        const mSide = mp === 0 ? 1 : -1;
        moss.position.set(mSide * ts * 0.43, wallH * (0.15 + mp * 0.25), mp === 2 ? ts * 0.43 : 0);
        if (mp === 2) moss.rotation.y = Math.PI * 0.5;
        g.add(moss);
      }

      // Arrow slit detail (narrow vertical opening on front)
      const arrowSlitMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const arrowSlit = new THREE.Mesh(this._boxGeo, arrowSlitMat);
      arrowSlit.scale.set(0.015, wallH * 0.25, 0.01);
      arrowSlit.position.set(0, wallH * 0.55, ts * 0.435);
      g.add(arrowSlit);

      // Weathered stone cap on top
      const capMat = new THREE.MeshStandardMaterial({ color: 0x8a8a80, roughness: 0.9, transparent: true });
      const cap = new THREE.Mesh(this._boxGeo, capMat);
      cap.scale.set(ts * 0.9, wallH * 0.05, ts * 0.9);
      cap.position.y = wallH + wallH * 0.02;
      g.add(cap);

      // Ground shadow / dirt patch
      const wallDirtMat = new THREE.MeshStandardMaterial({ color: 0x3a3525, roughness: 1.0, transparent: true, opacity: 0.6 });
      const wallDirt = new THREE.Mesh(this._boxGeo, wallDirtMat);
      wallDirt.scale.set(ts * 1.1, 0.005, ts * 1.1);
      wallDirt.position.y = 0.003;
      g.add(wallDirt);

      // Base rubble / debris stones
      const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x706860, roughness: 0.95, transparent: true });
      for (let rb = 0; rb < 4; rb++) {
        const rubble = new THREE.Mesh(this._boxGeo, rubbleMat);
        const angle = (rb / 4) * Math.PI * 2 + 0.3;
        rubble.scale.set(ts * 0.06, ts * 0.03, ts * 0.05);
        rubble.position.set(Math.cos(angle) * ts * 0.5, ts * 0.015, Math.sin(angle) * ts * 0.5);
        rubble.rotation.y = rb * 1.1;
        g.add(rubble);
      }

    } else if (def.type === SettlersBuildingType.GATE) {
      // ===== GATE – stone archway =====
      const gateH = ts * 0.9;
      const gateMat = this._stoneMat.clone();
      (gateMat as THREE.MeshStandardMaterial).transparent = true;

      // Left pillar
      const pillarL = new THREE.Mesh(this._boxGeo, gateMat);
      pillarL.scale.set(ts * 0.25, gateH, ts * 0.85);
      pillarL.position.set(-ts * 0.3, gateH * 0.5, 0);
      pillarL.castShadow = true;
      g.add(pillarL);

      // Right pillar
      const pillarR = new THREE.Mesh(this._boxGeo, gateMat);
      pillarR.scale.set(ts * 0.25, gateH, ts * 0.85);
      pillarR.position.set(ts * 0.3, gateH * 0.5, 0);
      pillarR.castShadow = true;
      g.add(pillarR);

      // Arch / lintel
      const lintel = new THREE.Mesh(this._boxGeo, gateMat);
      lintel.scale.set(ts * 0.85, gateH * 0.2, ts * 0.85);
      lintel.position.y = gateH + gateH * 0.1;
      g.add(lintel);

      // Gate door (wooden)
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85, transparent: true });
      const door = new THREE.Mesh(this._boxGeo, doorMat);
      door.scale.set(ts * 0.3, gateH * 0.7, ts * 0.04);
      door.position.set(0, gateH * 0.35, ts * 0.42);
      g.add(door);

      // Iron bars on door
      const barMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.4 });
      for (let b = -1; b <= 1; b++) {
        const bar = new THREE.Mesh(this._boxGeo, barMat);
        bar.scale.set(ts * 0.01, gateH * 0.5, ts * 0.01);
        bar.position.set(b * ts * 0.08, gateH * 0.35, ts * 0.44);
        g.add(bar);
      }

      // Player color pennant
      const pennantMat = new THREE.MeshStandardMaterial({ color: playerColor, roughness: 0.7 });
      const pennant = new THREE.Mesh(this._boxGeo, pennantMat);
      pennant.scale.set(ts * 0.12, ts * 0.08, ts * 0.01);
      pennant.position.set(0, gateH + gateH * 0.25, 0);
      g.add(pennant);

      // Ground shadow / dirt patch
      const gateDirtMat = new THREE.MeshStandardMaterial({ color: 0x3a3525, roughness: 1.0, transparent: true, opacity: 0.6 });
      const gateDirt = new THREE.Mesh(this._boxGeo, gateDirtMat);
      gateDirt.scale.set(ts * 1.2, 0.005, ts * 1.2);
      gateDirt.position.y = 0.003;
      g.add(gateDirt);

      // Base rubble / debris
      const gateRubbleMat = new THREE.MeshStandardMaterial({ color: 0x706860, roughness: 0.95, transparent: true });
      for (let rb = 0; rb < 3; rb++) {
        const rubble = new THREE.Mesh(this._boxGeo, gateRubbleMat);
        rubble.scale.set(ts * 0.05, ts * 0.025, ts * 0.04);
        rubble.position.set(ts * (-0.35 + rb * 0.35), ts * 0.012, ts * 0.48);
        rubble.rotation.y = rb * 0.8;
        g.add(rubble);
      }

    } else if (def.garrisonSlots > 0) {
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

      // Torch brackets on wall (2 torches at front)
      const torchBracketMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.4, transparent: true });
      for (let ti = 0; ti < 2; ti++) {
        const tAngle = (ti === 0 ? -0.5 : 0.5);
        // Bracket arm (cylinder)
        const bracket = new THREE.Mesh(this._cylGeo, torchBracketMat);
        bracket.scale.set(0.12, 0.15, 0.12);
        bracket.rotation.z = Math.PI * 0.4;
        bracket.position.set(Math.cos(tAngle) * (towerR + 0.04), towerH * 0.6, Math.sin(tAngle) * (towerR + 0.04));
        bracket.castShadow = true;
        g.add(bracket);
        // Torch flame glow (emissive sphere)
        const flameMat = new THREE.MeshStandardMaterial({
          color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 0.6, transparent: true,
        });
        const flame = new THREE.Mesh(this._sphereGeo, flameMat);
        flame.scale.set(0.25, 0.35, 0.25);
        flame.position.set(Math.cos(tAngle) * (towerR + 0.08), towerH * 0.65, Math.sin(tAngle) * (towerR + 0.08));
        g.add(flame);
      }

      // Banner / cloth hanging from side
      const bannerMat = new THREE.MeshStandardMaterial({ color: playerColor, roughness: 0.7, side: THREE.DoubleSide, transparent: true });
      const banner = new THREE.Mesh(this._boxGeo, bannerMat);
      banner.scale.set(0.2, 0.35, 0.01);
      banner.position.set(towerR + 0.02, towerH * 0.55, 0);
      banner.rotation.z = 0.05;
      banner.castShadow = true;
      g.add(banner);

      // Guard platform railing detail (posts around walkway)
      const railMat = new THREE.MeshStandardMaterial({ color: 0x706860, roughness: 0.9, transparent: true });
      for (let rp = 0; rp < 8; rp++) {
        const rAngle = (rp / 8) * Math.PI * 2;
        const railPost = new THREE.Mesh(this._cylGeo, railMat);
        railPost.scale.set(0.08, 0.15, 0.08);
        railPost.position.set(Math.cos(rAngle) * towerR * 1.05, towerH + 0.25, Math.sin(rAngle) * towerR * 1.05);
        g.add(railPost);
      }

      // Ground shadow / dirt patch
      const towerDirtMat = new THREE.MeshStandardMaterial({ color: 0x3a3525, roughness: 1.0, transparent: true, opacity: 0.6 });
      const towerDirt = new THREE.Mesh(this._boxGeo, towerDirtMat);
      towerDirt.scale.set(towerR * 3.0, 0.005, towerR * 3.0);
      towerDirt.position.y = 0.003;
      g.add(towerDirt);

      // Base rubble / debris
      const towerRubbleMat = new THREE.MeshStandardMaterial({ color: 0x706860, roughness: 0.95, transparent: true });
      for (let rb = 0; rb < 4; rb++) {
        const rubble = new THREE.Mesh(this._boxGeo, towerRubbleMat);
        const rbAngle = (rb / 4) * Math.PI * 2 + 0.7;
        rubble.scale.set(0.06, 0.03, 0.05);
        rubble.position.set(Math.cos(rbAngle) * towerR * 1.25, 0.015, Math.sin(rbAngle) * towerR * 1.25);
        rubble.rotation.y = rb * 1.3;
        g.add(rubble);
      }

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

      // Cobblestone courtyard in front
      const courtyardMat = new THREE.MeshStandardMaterial({ color: 0x706860, roughness: 0.95, transparent: true });
      const courtyard = new THREE.Mesh(this._boxGeo, courtyardMat);
      courtyard.scale.set(fw * 0.6, 0.01, fw * 0.3);
      courtyard.position.set(0, 0.006, fh * 0.6);
      g.add(courtyard);

      // Decorative window shutters (dark wood panels beside upper windows)
      const shutterMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.85, transparent: true });
      for (let side = -1; side <= 1; side += 2) {
        for (let sh = -1; sh <= 1; sh += 2) {
          const shutter = new THREE.Mesh(this._boxGeo, shutterMat);
          shutter.scale.set(0.02, 0.07, 0.01);
          shutter.position.set(side * fw * 0.2 + sh * 0.045, wallH1 + wallH2 * 0.45 + fw * 0.08, fh * 0.39);
          g.add(shutter);
        }
      }

      // Roof weathervane (thin rod + arrow)
      const vaneMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.3, transparent: true });
      const vaneRod = new THREE.Mesh(this._cylGeo, vaneMat);
      vaneRod.scale.set(0.06, fw * 0.12, 0.06);
      vaneRod.position.set(0, wallH1 + wallH2 + roofH + fw * 0.14, 0);
      g.add(vaneRod);
      const vaneArrow = new THREE.Mesh(this._boxGeo, vaneMat);
      vaneArrow.scale.set(fw * 0.1, 0.015, 0.01);
      vaneArrow.position.set(0, wallH1 + wallH2 + roofH + fw * 0.2, 0);
      g.add(vaneArrow);

      // Hanging shop sign
      const signPostMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.3, roughness: 0.6, transparent: true });
      const signArm = new THREE.Mesh(this._cylGeo, signPostMat);
      signArm.scale.set(0.06, fw * 0.1, 0.06);
      signArm.rotation.z = Math.PI * 0.5;
      signArm.position.set(fw * 0.48, fw * 0.38, fh * 0.43);
      g.add(signArm);
      const signBoard = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({ color: 0x8b6b3a, roughness: 0.85, transparent: true }));
      signBoard.scale.set(fw * 0.08, fw * 0.06, 0.01);
      signBoard.position.set(fw * 0.52, fw * 0.32, fh * 0.43);
      g.add(signBoard);

      // Smoke wisps from chimney
      const hqSmokeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 1.0, transparent: true, opacity: 0.25 });
      for (let si = 0; si < 3; si++) {
        const smoke = new THREE.Mesh(this._sphereGeo, hqSmokeMat);
        smoke.scale.set(0.3 + si * 0.15, 0.25 + si * 0.1, 0.3 + si * 0.15);
        smoke.position.set(fw * 0.25 + si * 0.02, wallH1 + wallH2 + roofH * 0.5 + fw * 0.35 + si * 0.15, fh * 0.15);
        g.add(smoke);
      }

      // Ground shadow / dirt patch
      const hqDirtMat = new THREE.MeshStandardMaterial({ color: 0x3a3525, roughness: 1.0, transparent: true, opacity: 0.6 });
      const hqDirt = new THREE.Mesh(this._boxGeo, hqDirtMat);
      hqDirt.scale.set(fw * 1.2, 0.005, fh * 1.2);
      hqDirt.position.y = 0.003;
      g.add(hqDirt);

      // Base rubble / debris
      const hqRubbleMat = new THREE.MeshStandardMaterial({ color: 0x706860, roughness: 0.95, transparent: true });
      for (let rb = 0; rb < 4; rb++) {
        const rubble = new THREE.Mesh(this._boxGeo, hqRubbleMat);
        rubble.scale.set(fw * 0.04, fw * 0.02, fw * 0.03);
        rubble.position.set(fw * (-0.45 + rb * 0.3), fw * 0.01, fh * (0.48 + (rb % 2) * 0.05));
        rubble.rotation.y = rb * 0.9;
        g.add(rubble);
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

      // Roof ridge cap (thin box along ridge peak)
      const lgRidgeCapMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85, transparent: true });
      const lgRidgeCap = new THREE.Mesh(this._boxGeo, lgRidgeCapMat);
      lgRidgeCap.scale.set(0.025, 0.025, fh * 0.84);
      lgRidgeCap.position.y = wallH + roofH + fw * 0.06;
      g.add(lgRidgeCap);

      // Rain gutter (thin cylinder along roof edge, front)
      const lgGutterMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.3, roughness: 0.5, transparent: true });
      const lgGutter = new THREE.Mesh(this._cylGeo, lgGutterMat);
      lgGutter.scale.set(0.06, fh * 0.84, 0.06);
      lgGutter.rotation.x = Math.PI * 0.5;
      lgGutter.position.set(0, wallH + fw * 0.06 + 0.01, fh * 0.43);
      g.add(lgGutter);

      // Flower / garden patch beside building
      const lgGardenMat = new THREE.MeshStandardMaterial({ color: 0x3a5a2a, roughness: 0.9, transparent: true });
      const lgGarden = new THREE.Mesh(this._boxGeo, lgGardenMat);
      lgGarden.scale.set(fw * 0.2, 0.02, fw * 0.1);
      lgGarden.position.set(fw * 0.35, 0.01, -fh * 0.45);
      g.add(lgGarden);
      // Small flowers in the garden
      const lgFlowerColors = [0xdd4444, 0xdddd44, 0xff88aa];
      for (let fi = 0; fi < 3; fi++) {
        const fl = new THREE.Mesh(this._sphereGeo, new THREE.MeshStandardMaterial({ color: lgFlowerColors[fi], roughness: 0.7, transparent: true }));
        fl.scale.set(0.15, 0.15, 0.15);
        fl.position.set(fw * (0.28 + fi * 0.07), 0.03, -fh * 0.45);
        g.add(fl);
      }

      // Smoke wisps from chimney
      const lgSmokeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 1.0, transparent: true, opacity: 0.25 });
      for (let si = 0; si < 3; si++) {
        const smoke = new THREE.Mesh(this._sphereGeo, lgSmokeMat);
        smoke.scale.set(0.25 + si * 0.1, 0.2 + si * 0.08, 0.25 + si * 0.1);
        smoke.position.set(fw * 0.22, wallH + roofH * 0.3 + fw * 0.3 + si * 0.12, -fh * 0.1);
        g.add(smoke);
      }

      // Ground shadow / dirt patch
      const lgDirtMat = new THREE.MeshStandardMaterial({ color: 0x3a3525, roughness: 1.0, transparent: true, opacity: 0.6 });
      const lgDirt = new THREE.Mesh(this._boxGeo, lgDirtMat);
      lgDirt.scale.set(fw * 1.1, 0.005, fh * 1.1);
      lgDirt.position.y = 0.003;
      g.add(lgDirt);

      // Base rubble / debris
      const lgRubbleMat = new THREE.MeshStandardMaterial({ color: 0x706860, roughness: 0.95, transparent: true });
      for (let rb = 0; rb < 3; rb++) {
        const rubble = new THREE.Mesh(this._boxGeo, lgRubbleMat);
        rubble.scale.set(fw * 0.04, fw * 0.02, fw * 0.035);
        rubble.position.set(fw * (-0.42 + rb * 0.42), fw * 0.01, fh * 0.48);
        rubble.rotation.y = rb * 1.2;
        g.add(rubble);
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

      // Roof ridge cap
      const mdRidgeCapMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85, transparent: true });
      const mdRidgeCap = new THREE.Mesh(this._boxGeo, mdRidgeCapMat);
      mdRidgeCap.scale.set(0.02, 0.02, fh * 0.74);
      mdRidgeCap.position.y = wallH + roofH;
      g.add(mdRidgeCap);

      // Rain gutter (thin cylinder along roof edge, front)
      const mdGutterMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.3, roughness: 0.5, transparent: true });
      const mdGutter = new THREE.Mesh(this._cylGeo, mdGutterMat);
      mdGutter.scale.set(0.05, fh * 0.74, 0.05);
      mdGutter.rotation.x = Math.PI * 0.5;
      mdGutter.position.set(0, wallH + 0.01, fh * 0.37);
      g.add(mdGutter);

      // Flower pot beside door
      const mdPotMat = new THREE.MeshStandardMaterial({ color: 0x9a5a3a, roughness: 0.85, transparent: true });
      const mdPot = new THREE.Mesh(this._cylGeo, mdPotMat);
      mdPot.scale.set(0.25, fw * 0.04, 0.25);
      mdPot.position.set(fw * 0.15, fw * 0.02, fh * 0.38);
      g.add(mdPot);
      const mdPlant = new THREE.Mesh(this._sphereGeo, new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.8, transparent: true }));
      mdPlant.scale.set(0.3, 0.35, 0.3);
      mdPlant.position.set(fw * 0.15, fw * 0.06, fh * 0.38);
      g.add(mdPlant);

      // Smoke wisps from chimney
      const mdSmokeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 1.0, transparent: true, opacity: 0.25 });
      for (let si = 0; si < 3; si++) {
        const smoke = new THREE.Mesh(this._sphereGeo, mdSmokeMat);
        smoke.scale.set(0.2 + si * 0.08, 0.18 + si * 0.06, 0.2 + si * 0.08);
        smoke.position.set(fw * 0.18, wallH + roofH * 0.25 + fw * 0.25 + si * 0.1, 0);
        g.add(smoke);
      }

      // Ground shadow / dirt patch
      const mdDirtMat = new THREE.MeshStandardMaterial({ color: 0x3a3525, roughness: 1.0, transparent: true, opacity: 0.6 });
      const mdDirt = new THREE.Mesh(this._boxGeo, mdDirtMat);
      mdDirt.scale.set(fw * 1.0, 0.005, fh * 1.0);
      mdDirt.position.y = 0.003;
      g.add(mdDirt);

      // Base rubble / debris
      const mdRubbleMat = new THREE.MeshStandardMaterial({ color: 0x706860, roughness: 0.95, transparent: true });
      for (let rb = 0; rb < 3; rb++) {
        const rubble = new THREE.Mesh(this._boxGeo, mdRubbleMat);
        rubble.scale.set(fw * 0.03, fw * 0.015, fw * 0.025);
        rubble.position.set(fw * (-0.38 + rb * 0.38), fw * 0.008, fh * 0.4);
        rubble.rotation.y = rb * 1.1;
        g.add(rubble);
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

      // Log pile beside building (more detailed woodpile)
      const logMat = new THREE.MeshStandardMaterial({ color: 0x7a5a2a, roughness: 0.9 });
      (logMat as THREE.MeshStandardMaterial).transparent = true;
      for (let l = 0; l < 3; l++) {
        const log = new THREE.Mesh(this._cylGeo, logMat);
        log.scale.set(0.25, fw * 0.15, 0.25);
        log.rotation.z = Math.PI * 0.5;
        log.position.set(fw * 0.38, 0.03 + l * 0.04, fh * (0.05 + l * 0.02));
        g.add(log);
      }
      // Additional split wood pieces leaning against the pile
      const splitMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9, transparent: true });
      const splitLog = new THREE.Mesh(this._boxGeo, splitMat);
      splitLog.scale.set(fw * 0.04, fw * 0.12, 0.02);
      splitLog.position.set(fw * 0.42, fw * 0.06, fh * 0.12);
      splitLog.rotation.z = 0.15;
      g.add(splitLog);

      // Thatched roof texture (rougher material overlay on ridge roof)
      const thatchMat = new THREE.MeshStandardMaterial({ color: 0xb89850, roughness: 0.98, transparent: true });
      const thatchOverlay = new THREE.Mesh(this._boxGeo, thatchMat);
      thatchOverlay.scale.set(fw * 0.3, 0.015, fh * 0.3);
      thatchOverlay.position.set(0, wallH + roofH * 0.5, 0);
      thatchOverlay.rotation.x = 0.25;
      g.add(thatchOverlay);

      // Hanging lantern by door
      const lanternBracketMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.4, roughness: 0.5, transparent: true });
      const lanternBracket = new THREE.Mesh(this._cylGeo, lanternBracketMat);
      lanternBracket.scale.set(0.05, fw * 0.06, 0.05);
      lanternBracket.rotation.z = Math.PI * 0.5;
      lanternBracket.position.set(fw * 0.14, fw * 0.3, fh * 0.32);
      g.add(lanternBracket);
      const lanternGlowMat = new THREE.MeshStandardMaterial({
        color: 0xffcc44, emissive: 0xffaa22, emissiveIntensity: 0.4, transparent: true,
      });
      const lantern = new THREE.Mesh(this._sphereGeo, lanternGlowMat);
      lantern.scale.set(0.18, 0.22, 0.18);
      lantern.position.set(fw * 0.18, fw * 0.27, fh * 0.32);
      g.add(lantern);

      // Smoke wisps from chimney
      const smSmokeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 1.0, transparent: true, opacity: 0.25 });
      for (let si = 0; si < 3; si++) {
        const smoke = new THREE.Mesh(this._sphereGeo, smSmokeMat);
        smoke.scale.set(0.18 + si * 0.06, 0.15 + si * 0.05, 0.18 + si * 0.06);
        smoke.position.set(fw * 0.15, wallH + roofH * 0.2 + fw * 0.2 + si * 0.09, 0);
        g.add(smoke);
      }

      // Ground shadow / dirt patch
      const smDirtMat = new THREE.MeshStandardMaterial({ color: 0x3a3525, roughness: 1.0, transparent: true, opacity: 0.6 });
      const smDirt = new THREE.Mesh(this._boxGeo, smDirtMat);
      smDirt.scale.set(fw * 0.9, 0.005, fh * 0.9);
      smDirt.position.y = 0.003;
      g.add(smDirt);

      // Base rubble / debris
      const smRubbleMat = new THREE.MeshStandardMaterial({ color: 0x706860, roughness: 0.95, transparent: true });
      for (let rb = 0; rb < 3; rb++) {
        const rubble = new THREE.Mesh(this._boxGeo, smRubbleMat);
        rubble.scale.set(fw * 0.025, fw * 0.012, fw * 0.02);
        rubble.position.set(fw * (-0.32 + rb * 0.32), fw * 0.006, fh * 0.34);
        rubble.rotation.y = rb * 0.9;
        g.add(rubble);
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
        // Saw horse with wood piece
        const sawHorseMat = new THREE.MeshStandardMaterial({ color: woodCol, roughness: 0.9, transparent: true });
        // Two X-legs
        for (let sx = -1; sx <= 1; sx += 2) {
          const horseLeg = new THREE.Mesh(this._boxGeo, sawHorseMat);
          horseLeg.scale.set(0.02, fw * 0.1, fw * 0.06);
          horseLeg.position.set(fw * (0.25 + sx * 0.05), fw * 0.05, fh * 0.5);
          g.add(horseLeg);
        }
        // Cross beam on horse
        const horseBeam = new THREE.Mesh(this._boxGeo, sawHorseMat);
        horseBeam.scale.set(fw * 0.12, 0.015, 0.02);
        horseBeam.position.set(fw * 0.25, fw * 0.1, fh * 0.5);
        g.add(horseBeam);
        // Wood piece on saw horse
        const sawPiece = new THREE.Mesh(this._cylGeo, logMat);
        sawPiece.scale.set(0.18, fw * 0.14, 0.18);
        sawPiece.rotation.z = Math.PI * 0.5;
        sawPiece.position.set(fw * 0.25, fw * 0.12, fh * 0.5);
        g.add(sawPiece);
        // Sawdust pile
        const dustMat = new THREE.MeshStandardMaterial({ color: 0xd4b87a, roughness: 0.95, transparent: true });
        const dustPile = new THREE.Mesh(this._coneGeo, dustMat);
        dustPile.scale.set(fw * 0.08, fw * 0.03, fw * 0.08);
        dustPile.position.set(fw * 0.25, fw * 0.015, fh * 0.55);
        g.add(dustPile);
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
        // Smoke from oven (emissive)
        const ovenSmokeMat = new THREE.MeshStandardMaterial({
          color: 0xcccccc, emissive: 0x443322, emissiveIntensity: 0.2, transparent: true, opacity: 0.3,
        });
        for (let si = 0; si < 2; si++) {
          const ovenSmoke = new THREE.Mesh(this._sphereGeo, ovenSmokeMat);
          ovenSmoke.scale.set(0.2 + si * 0.1, 0.15 + si * 0.08, 0.2 + si * 0.1);
          ovenSmoke.position.set(0, fw * 0.22 + si * 0.1, -fh * 0.5);
          g.add(ovenSmoke);
        }
        // Bread cooling rack (wooden shelf with bread loaves)
        const rackWoodMat = new THREE.MeshStandardMaterial({ color: woodCol, roughness: 0.85, transparent: true });
        const coolRack = new THREE.Mesh(this._boxGeo, rackWoodMat);
        coolRack.scale.set(fw * 0.14, 0.01, fw * 0.06);
        coolRack.position.set(fw * 0.35, fw * 0.18, fh * 0.35);
        g.add(coolRack);
        // Rack legs
        for (let rl = -1; rl <= 1; rl += 2) {
          const rackLeg = new THREE.Mesh(this._cylGeo, rackWoodMat);
          rackLeg.scale.set(0.08, fw * 0.18, 0.08);
          rackLeg.position.set(fw * (0.35 + rl * 0.06), fw * 0.09, fh * 0.35);
          g.add(rackLeg);
        }
        // Bread loaves on rack
        for (let bl = 0; bl < 2; bl++) {
          const loaf = new THREE.Mesh(this._sphereGeo, breadMat);
          loaf.scale.set(0.2, 0.12, 0.15);
          loaf.position.set(fw * (0.31 + bl * 0.08), fw * 0.2, fh * 0.35);
          g.add(loaf);
        }
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
        // Steam from vat (semi-transparent wisps above barrels)
        const vatSteamMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 1.0, transparent: true, opacity: 0.2 });
        for (let vi = 0; vi < 2; vi++) {
          const steam = new THREE.Mesh(this._sphereGeo, vatSteamMat);
          steam.scale.set(0.25 + vi * 0.1, 0.2 + vi * 0.08, 0.25 + vi * 0.1);
          steam.position.set(fw * 0.39, fw * (0.18 + vi * 0.1), -fh * 0.25);
          g.add(steam);
        }
        // Hop vine on trellis
        const trellisMat = new THREE.MeshStandardMaterial({ color: woodCol, roughness: 0.85, transparent: true });
        const trellisPost = new THREE.Mesh(this._cylGeo, trellisMat);
        trellisPost.scale.set(0.08, fw * 0.2, 0.08);
        trellisPost.position.set(-fw * 0.44, fw * 0.1, -fh * 0.15);
        g.add(trellisPost);
        // Trellis cross bar
        const trellisBar = new THREE.Mesh(this._cylGeo, trellisMat);
        trellisBar.scale.set(0.06, fw * 0.12, 0.06);
        trellisBar.rotation.z = Math.PI * 0.5;
        trellisBar.position.set(-fw * 0.44, fw * 0.18, -fh * 0.15);
        g.add(trellisBar);
        // Hop leaves (green spheres on trellis)
        const hopMat = new THREE.MeshStandardMaterial({ color: 0x4a8a3a, roughness: 0.8, transparent: true });
        for (let hi = 0; hi < 3; hi++) {
          const hop = new THREE.Mesh(this._sphereGeo, hopMat);
          hop.scale.set(0.2, 0.2, 0.2);
          hop.position.set(-fw * 0.44 + (hi - 1) * fw * 0.04, fw * (0.14 + hi * 0.03), -fh * 0.15);
          g.add(hop);
        }
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
        // Ingot stack (larger, more ingots)
        const ingotColor = type === SettlersBuildingType.MINT ? 0xffd700 : 0x888888;
        const ingotMat = new THREE.MeshStandardMaterial({ color: ingotColor, metalness: 0.6, roughness: 0.3, transparent: true });
        for (let i = 0; i < 3; i++) {
          const ingot = new THREE.Mesh(this._boxGeo, ingotMat);
          ingot.scale.set(fw * 0.04, fw * 0.02, fw * 0.025);
          ingot.position.set(fw * (0.32 + i * 0.05), fw * 0.01, -fh * 0.32);
          g.add(ingot);
        }
        // Second row of ingots stacked
        for (let i = 0; i < 2; i++) {
          const ingot2 = new THREE.Mesh(this._boxGeo, ingotMat);
          ingot2.scale.set(fw * 0.04, fw * 0.02, fw * 0.025);
          ingot2.position.set(fw * (0.345 + i * 0.05), fw * 0.03, -fh * 0.32);
          g.add(ingot2);
        }
        // Bellows (accordion-like shape: two boxes with a wedge)
        const bellowsMat = new THREE.MeshStandardMaterial({ color: 0x8b6b3a, roughness: 0.85, transparent: true });
        const bellowsBase = new THREE.Mesh(this._boxGeo, bellowsMat);
        bellowsBase.scale.set(fw * 0.06, fw * 0.04, fw * 0.08);
        bellowsBase.position.set(-fw * 0.25, fw * 0.02, fh * 0.15);
        g.add(bellowsBase);
        const bellowsTop = new THREE.Mesh(this._boxGeo, bellowsMat);
        bellowsTop.scale.set(fw * 0.06, fw * 0.02, fw * 0.08);
        bellowsTop.position.set(-fw * 0.25, fw * 0.06, fh * 0.15);
        g.add(bellowsTop);
        // Bellows nozzle
        const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.4, roughness: 0.5, transparent: true });
        const nozzle = new THREE.Mesh(this._cylGeo, nozzleMat);
        nozzle.scale.set(0.08, fw * 0.04, 0.08);
        nozzle.rotation.z = Math.PI * 0.5;
        nozzle.position.set(-fw * 0.3, fw * 0.04, fh * 0.15);
        g.add(nozzle);
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
        // Training dummy (more detailed with head and shield)
        const dummyPost = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: woodCol, transparent: true }));
        dummyPost.scale.set(0.15, fw * 0.22, 0.15);
        dummyPost.position.set(fw * 0.42, fw * 0.11, fh * 0.0);
        g.add(dummyPost);
        const dummyArm = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: woodCol, transparent: true }));
        dummyArm.scale.set(0.1, fw * 0.12, 0.1);
        dummyArm.rotation.z = Math.PI * 0.5;
        dummyArm.position.set(fw * 0.42, fw * 0.18, fh * 0.0);
        g.add(dummyArm);
        // Dummy head (sphere)
        const dummyHeadMat = new THREE.MeshStandardMaterial({ color: 0xd4b87a, roughness: 0.9, transparent: true });
        const dummyHead = new THREE.Mesh(this._sphereGeo, dummyHeadMat);
        dummyHead.scale.set(0.35, 0.35, 0.35);
        dummyHead.position.set(fw * 0.42, fw * 0.24, fh * 0.0);
        g.add(dummyHead);
        // Target painted circle (flat disc)
        const targetMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.8 });
        const target = new THREE.Mesh(new THREE.CylinderGeometry(fw * 0.05, fw * 0.05, 0.01, 8), targetMat);
        target.rotation.x = Math.PI * 0.5;
        target.position.set(fw * 0.42, fw * 0.14, fh * 0.01);
        g.add(target);
        // Weapon rack with crossed swords/spears
        const rackMat = new THREE.MeshStandardMaterial({ color: woodCol, roughness: 0.85, transparent: true });
        const rack = new THREE.Mesh(this._boxGeo, rackMat);
        rack.scale.set(fw * 0.15, fw * 0.15, 0.02);
        rack.position.set(-fw * 0.38, fw * 0.12, fh * 0.35);
        g.add(rack);
        // Crossed spears on the rack
        const spearMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.5, roughness: 0.3, transparent: true });
        for (let sp = -1; sp <= 1; sp += 2) {
          const spear = new THREE.Mesh(this._cylGeo, spearMat);
          spear.scale.set(0.04, fw * 0.18, 0.04);
          spear.position.set(-fw * 0.38, fw * 0.14, fh * 0.36);
          spear.rotation.z = sp * 0.3;
          g.add(spear);
        }
        // Sword hanging on rack
        const rackSwordMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.7, roughness: 0.2, transparent: true });
        const rackSword = new THREE.Mesh(this._boxGeo, rackSwordMat);
        rackSword.scale.set(0.012, fw * 0.12, 0.004);
        rackSword.position.set(-fw * 0.38, fw * 0.12, fh * 0.37);
        g.add(rackSword);
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
      case SettlersBuildingType.MARKET: {
        // Merchant stall awning (colored canopy)
        const awningMat = new THREE.MeshStandardMaterial({ color: 0xcc4444, roughness: 0.7, side: THREE.DoubleSide, transparent: true });
        const awning = new THREE.Mesh(this._boxGeo, awningMat);
        awning.scale.set(fw * 0.25, 0.01, fw * 0.15);
        awning.position.set(0, fw * 0.32, fh * 0.5);
        awning.rotation.x = 0.15;
        awning.castShadow = true;
        g.add(awning);
        // Awning support poles
        const stallPoleMat = new THREE.MeshStandardMaterial({ color: woodCol, roughness: 0.85, transparent: true });
        for (let sp = -1; sp <= 1; sp += 2) {
          const pole = new THREE.Mesh(this._cylGeo, stallPoleMat);
          pole.scale.set(0.08, fw * 0.3, 0.08);
          pole.position.set(sp * fw * 0.11, fw * 0.15, fh * 0.55);
          g.add(pole);
        }
        // Market counter / table
        const counterMat = new THREE.MeshStandardMaterial({ color: 0x8b6b3a, roughness: 0.85, transparent: true });
        const counter = new THREE.Mesh(this._boxGeo, counterMat);
        counter.scale.set(fw * 0.22, fw * 0.06, fw * 0.08);
        counter.position.set(0, fw * 0.13, fh * 0.52);
        g.add(counter);
        // Crates beside stall
        const mktCrateMat = new THREE.MeshStandardMaterial({ color: 0xa08050, roughness: 0.85, transparent: true });
        for (let c = 0; c < 2; c++) {
          const crate = new THREE.Mesh(this._boxGeo, mktCrateMat);
          crate.scale.set(fw * 0.05, fw * 0.05, fw * 0.05);
          crate.position.set(fw * (0.2 + c * 0.08), fw * 0.025, fh * 0.48);
          crate.rotation.y = c * 0.4;
          g.add(crate);
        }
        // Sacks of goods
        const mktSackMat = new THREE.MeshStandardMaterial({ color: 0xd4c4a0, roughness: 0.9, transparent: true });
        for (let s = 0; s < 2; s++) {
          const sack = new THREE.Mesh(this._boxGeo, mktSackMat);
          sack.scale.set(fw * 0.04, fw * 0.06, fw * 0.035);
          sack.position.set(-fw * (0.18 + s * 0.07), fw * 0.03, fh * 0.5);
          g.add(sack);
        }
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
  ): THREE.Group {
    const group = new THREE.Group();

    const points: THREE.Vector3[] = [];
    for (const p of path) {
      const wx = (p.x + 0.5) * SB.TILE_SIZE;
      const wz = (p.z + 0.5) * SB.TILE_SIZE;
      const wy = getHeightAt(state.map, wx, wz) + 0.25;
      points.push(new THREE.Vector3(wx, wy, wz));
    }

    if (points.length < 2) {
      return group;
    }

    // Seeded pseudo-random for deterministic decoration placement
    const seed = Math.abs(points[0].x * 73856093 + points[0].z * 19349663) | 0;
    const seededRand = (idx: number): number => {
      const n = ((seed + idx * 374761393) ^ 0x5bd1e995) * 0x5bd1e995;
      return ((n >>> 0) % 10000) / 10000;
    };

    // Road width – nearly a full tile for clear visibility
    const roadWidth = SB.TILE_SIZE * 0.8;
    const hw = roadWidth * 0.5;

    // Build ribbon with vertex colors – 6 vertices per point for richer detail:
    // outer-left, left-border, left-surface, right-surface, right-border, outer-right
    const positions: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    // Road colors by quality
    let outerColor: THREE.Color;
    let borderColor: THREE.Color;
    let surfaceColor: THREE.Color;
    if (quality === "paved") {
      outerColor = new THREE.Color(0x666660);
      borderColor = new THREE.Color(0x888880);
      surfaceColor = new THREE.Color(0xd0d0c8);
    } else if (quality === "stone") {
      outerColor = new THREE.Color(0x555550);
      borderColor = new THREE.Color(0x7a7a72);
      surfaceColor = new THREE.Color(0xa0a098);
    } else {
      // Dirt – warm brown, clearly distinct from green terrain
      outerColor = new THREE.Color(0x5a4a2a);
      borderColor = new THREE.Color(0x7a6030);
      surfaceColor = new THREE.Color(0xc0a060);
    }

    // Precompute perpendicular vectors for each point (used for decorations later)
    const perps: { px: number; pz: number }[] = [];

    for (let i = 0; i < points.length; i++) {
      const cur = points[i];
      const next = i < points.length - 1 ? points[i + 1] : points[i];
      const prev = i > 0 ? points[i - 1] : points[i];

      const dx = next.x - prev.x;
      const dz = next.z - prev.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      const px = -dz / len * hw;
      const pz = dx / len * hw;
      perps.push({ px, pz });

      // Subtle height undulation along the road for natural terrain following
      const heightVar = Math.sin(i * 1.7) * 0.03 + Math.sin(i * 3.1) * 0.015;
      const adjY = cur.y + heightVar;

      // For dirt roads, make outer edges rougher/more irregular
      let outerJitterL = 0;
      let outerJitterR = 0;
      if (quality === "dirt") {
        outerJitterL = (seededRand(i * 6) - 0.5) * 0.12;
        outerJitterR = (seededRand(i * 6 + 1) - 0.5) * 0.12;
      }

      // 6 vertices per path point: outer-left -> center -> outer-right
      const drop = 0.03; // outer edges drop slightly for ground blending
      positions.push(cur.x + px * (1.4 + outerJitterL), adjY - drop, cur.z + pz * (1.4 + outerJitterL));  // 0: outer-left
      positions.push(cur.x + px * 1.05, adjY, cur.z + pz * 1.05);       // 1: border-left
      positions.push(cur.x + px * 0.5, adjY + 0.02, cur.z + pz * 0.5);  // 2: surface-left
      positions.push(cur.x - px * 0.5, adjY + 0.02, cur.z - pz * 0.5);  // 3: surface-right
      positions.push(cur.x - px * 1.05, adjY, cur.z - pz * 1.05);       // 4: border-right
      positions.push(cur.x - px * (1.4 + outerJitterR), adjY - drop, cur.z - pz * (1.4 + outerJitterR));  // 5: outer-right

      // Vertex color variation for dirt track marks
      let surfL = surfaceColor.clone();
      let surfR = surfaceColor.clone();
      if (quality === "dirt") {
        const darkeningL = seededRand(i * 6 + 2) * 0.15;
        const darkeningR = seededRand(i * 6 + 3) * 0.15;
        surfL = surfaceColor.clone().multiplyScalar(1.0 - darkeningL);
        surfR = surfaceColor.clone().multiplyScalar(1.0 - darkeningR);
      }

      colors.push(outerColor.r, outerColor.g, outerColor.b);
      colors.push(borderColor.r, borderColor.g, borderColor.b);
      colors.push(surfL.r, surfL.g, surfL.b);
      colors.push(surfR.r, surfR.g, surfR.b);
      colors.push(borderColor.r, borderColor.g, borderColor.b);
      colors.push(outerColor.r, outerColor.g, outerColor.b);

      if (i < points.length - 1) {
        const vi = i * 6;
        // 5 strips connecting 6 vertices per point
        for (let s = 0; s < 5; s++) {
          indices.push(vi + s, vi + s + 1, vi + 6 + s);
          indices.push(vi + s + 1, vi + 6 + s + 1, vi + 6 + s);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);

    // Explicitly set normals to point up for consistent lighting on road surface
    const normals: number[] = [];
    for (let i = 0; i < positions.length / 3; i++) {
      normals.push(0, 1, 0);
    }
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: quality === "paved" ? 0.6 : quality === "stone" ? 0.8 : 0.95,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });

    const roadMesh = new THREE.Mesh(geo, mat);
    roadMesh.receiveShadow = true;
    roadMesh.renderOrder = 1;
    group.add(roadMesh);

    // ===================================================================
    // ALL ROADS: Wheel ruts - two parallel darker lines along road center
    // ===================================================================
    const rutColor = quality === "dirt" ? 0x4a3a1a : quality === "stone" ? 0x555555 : 0x888888;
    const rutMat = new THREE.MeshStandardMaterial({
      color: rutColor,
      roughness: 0.95,
      polygonOffset: true,
      polygonOffsetFactor: -5,
      polygonOffsetUnits: -5,
    });
    const rutWidth = hw * 0.06;
    const rutPositions: number[] = [];
    const rutIndices: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const cur = points[i];
      const { px, pz } = perps[i];
      const heightVar = Math.sin(i * 1.7) * 0.03 + Math.sin(i * 3.1) * 0.015;
      const ry = cur.y + heightVar + 0.03; // slightly above road surface
      // Left rut at ~25% from center, right rut at ~25% from center
      const rutOffset = 0.25;
      // Left rut: two vertices (inner/outer edge of rut)
      rutPositions.push(cur.x + px * (rutOffset + rutWidth), ry, cur.z + pz * (rutOffset + rutWidth));
      rutPositions.push(cur.x + px * (rutOffset - rutWidth), ry, cur.z + pz * (rutOffset - rutWidth));
      // Right rut: two vertices
      rutPositions.push(cur.x - px * (rutOffset - rutWidth), ry, cur.z - pz * (rutOffset - rutWidth));
      rutPositions.push(cur.x - px * (rutOffset + rutWidth), ry, cur.z - pz * (rutOffset + rutWidth));

      if (i < points.length - 1) {
        const vi = i * 4;
        // Left rut strip
        rutIndices.push(vi, vi + 1, vi + 4);
        rutIndices.push(vi + 1, vi + 5, vi + 4);
        // Right rut strip
        rutIndices.push(vi + 2, vi + 3, vi + 6);
        rutIndices.push(vi + 3, vi + 7, vi + 6);
      }
    }
    const rutGeo = new THREE.BufferGeometry();
    rutGeo.setAttribute("position", new THREE.Float32BufferAttribute(rutPositions, 3));
    rutGeo.setIndex(rutIndices);
    const rutNormals: number[] = [];
    for (let i = 0; i < rutPositions.length / 3; i++) rutNormals.push(0, 1, 0);
    rutGeo.setAttribute("normal", new THREE.Float32BufferAttribute(rutNormals, 3));
    const rutMesh = new THREE.Mesh(rutGeo, rutMat);
    rutMesh.receiveShadow = true;
    rutMesh.renderOrder = 2;
    group.add(rutMesh);

    // ===================================================================
    // ALL ROADS: Edge grass/weeds - small green cones along outer edges
    // ===================================================================
    const grassGeo = new THREE.ConeGeometry(0.04, 0.12, 4);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x4a8a2a, roughness: 0.9 });
    const grassSpacing = SB.TILE_SIZE * 2; // every ~2 tiles
    let grassCount = 0;
    {
      let accum = 0;
      for (let i = 0; i < points.length - 1 && grassCount < 10; i++) {
        const a = points[i];
        const b = points[i + 1];
        const segLen = a.distanceTo(b);
        const segDx = b.x - a.x;
        const segDz = b.z - a.z;
        const segL = Math.sqrt(segDx * segDx + segDz * segDz) || 1;
        const nx = -segDz / segL * hw * 1.45;
        const nz = segDx / segL * hw * 1.45;

        while (accum < segLen && grassCount < 10) {
          const t = accum / segLen;
          const gx = a.x + (b.x - a.x) * t;
          const gz = a.z + (b.z - a.z) * t;
          const gy = a.y + (b.y - a.y) * t;
          // Left side grass
          const grassL = new THREE.Mesh(grassGeo, grassMat);
          grassL.position.set(gx + nx, gy + 0.04, gz + nz);
          grassL.rotation.set(seededRand(grassCount * 2) * 0.4 - 0.2, 0, seededRand(grassCount * 2 + 1) * 0.4 - 0.2);
          group.add(grassL);
          // Right side grass
          const grassR = new THREE.Mesh(grassGeo, grassMat);
          grassR.position.set(gx - nx, gy + 0.04, gz - nz);
          grassR.rotation.set(seededRand(grassCount * 2 + 50) * 0.4 - 0.2, 0, seededRand(grassCount * 2 + 51) * 0.4 - 0.2);
          group.add(grassR);
          grassCount++;
          accum += grassSpacing;
        }
        accum -= segLen;
      }
    }

    // ===================================================================
    // DIRT ROADS: Puddle patches - small flat reflective circles
    // ===================================================================
    if (quality === "dirt" && points.length >= 3) {
      const puddleGeo = new THREE.CircleGeometry(0.1, 8);
      const puddleMat = new THREE.MeshStandardMaterial({
        color: 0x5a6a7a,
        roughness: 0.15,
        metalness: 0.1,
        polygonOffset: true,
        polygonOffsetFactor: -6,
        polygonOffsetUnits: -6,
      });
      // Place 1-3 puddles along the road
      const puddleCount = Math.min(3, Math.floor(points.length / 3));
      for (let p = 0; p < puddleCount; p++) {
        const idx = 1 + Math.floor(seededRand(p + 200) * (points.length - 2));
        const pt = points[idx];
        const { px, pz } = perps[idx];
        const offsetFrac = (seededRand(p + 210) - 0.5) * 0.4;
        const puddle = new THREE.Mesh(puddleGeo, puddleMat);
        puddle.position.set(pt.x + px * offsetFrac, pt.y + 0.035, pt.z + pz * offsetFrac);
        puddle.rotation.x = -Math.PI / 2;
        puddle.scale.set(0.6 + seededRand(p + 220) * 0.8, 0.4 + seededRand(p + 230) * 0.6, 1);
        group.add(puddle);
      }
    }

    // ===================================================================
    // STONE ROADS: Cobblestone pattern + curb stones + drainage lines
    // ===================================================================
    if (quality === "stone" && points.length >= 2) {
      // Cobblestone cubes on the road surface
      const cobbleGeo = new THREE.BoxGeometry(0.06, 0.03, 0.06);
      const cobbleMat = new THREE.MeshStandardMaterial({ color: 0x8a8a82, roughness: 0.85 });
      const cobbleDkMat = new THREE.MeshStandardMaterial({ color: 0x6a6a62, roughness: 0.9 });
      let cobbleCount = 0;
      const cobbleSpacing = 0.15;
      let cobbleAccum = 0;
      for (let i = 0; i < points.length - 1 && cobbleCount < 15; i++) {
        const a = points[i];
        const b = points[i + 1];
        const segLen = a.distanceTo(b);
        const segDx = b.x - a.x;
        const segDz = b.z - a.z;
        const segL = Math.sqrt(segDx * segDx + segDz * segDz) || 1;
        const cpx = -segDz / segL * hw;
        const cpz = segDx / segL * hw;

        while (cobbleAccum < segLen && cobbleCount < 15) {
          const t = cobbleAccum / segLen;
          const cx = a.x + (b.x - a.x) * t;
          const cz = a.z + (b.z - a.z) * t;
          const cy = a.y + (b.y - a.y) * t;
          // Place 3 cobbles across the road width
          for (let col = -1; col <= 1; col++) {
            const cMat = seededRand(cobbleCount * 3 + col + 100) > 0.5 ? cobbleMat : cobbleDkMat;
            const cobble = new THREE.Mesh(cobbleGeo, cMat);
            const hVar = seededRand(cobbleCount * 3 + col + 110) * 0.015;
            cobble.position.set(cx + cpx * col * 0.35, cy + 0.035 + hVar, cz + cpz * col * 0.35);
            cobble.rotation.y = seededRand(cobbleCount * 3 + col + 120) * 0.3;
            group.add(cobble);
          }
          cobbleCount++;
          cobbleAccum += cobbleSpacing;
        }
        cobbleAccum -= segLen;
      }

      // Curb stones - taller raised blocks along edges
      const curbGeo = new THREE.BoxGeometry(0.12, 0.06, 0.08);
      const curbMat = new THREE.MeshStandardMaterial({ color: 0x7a7a72, roughness: 0.85 });
      const curbSpacing = 0.3;
      let curbAccum = 0;
      let curbCount = 0;
      for (let i = 0; i < points.length - 1 && curbCount < 8; i++) {
        const a = points[i];
        const b = points[i + 1];
        const segLen = a.distanceTo(b);
        const segDx = b.x - a.x;
        const segDz = b.z - a.z;
        const segL = Math.sqrt(segDx * segDx + segDz * segDz) || 1;
        const cnx = -segDz / segL * hw * 1.1;
        const cnz = segDx / segL * hw * 1.1;

        while (curbAccum < segLen && curbCount < 8) {
          const t = curbAccum / segLen;
          const cx = a.x + (b.x - a.x) * t;
          const cz = a.z + (b.z - a.z) * t;
          const cy = a.y + (b.y - a.y) * t;
          const angle = Math.atan2(segDx, segDz);
          // Left curb
          const curbL = new THREE.Mesh(curbGeo, curbMat);
          curbL.position.set(cx + cnx, cy + 0.02, cz + cnz);
          curbL.rotation.y = angle;
          group.add(curbL);
          // Right curb
          const curbR = new THREE.Mesh(curbGeo, curbMat);
          curbR.position.set(cx - cnx, cy + 0.02, cz - cnz);
          curbR.rotation.y = angle;
          group.add(curbR);
          curbCount++;
          curbAccum += curbSpacing;
        }
        curbAccum -= segLen;
      }

      // Drainage channel lines along inner edges
      const drainMat = new THREE.MeshStandardMaterial({
        color: 0x3a3a35,
        roughness: 0.95,
        polygonOffset: true,
        polygonOffsetFactor: -5,
        polygonOffsetUnits: -5,
      });
      const drainPositions: number[] = [];
      const drainIndices: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const cur = points[i];
        const { px, pz } = perps[i];
        const heightVar = Math.sin(i * 1.7) * 0.03 + Math.sin(i * 3.1) * 0.015;
        const dy = cur.y + heightVar + 0.025;
        const drainOff = 0.85;
        const drainW = 0.02;
        drainPositions.push(cur.x + px * (drainOff + drainW), dy, cur.z + pz * (drainOff + drainW));
        drainPositions.push(cur.x + px * (drainOff - drainW), dy, cur.z + pz * (drainOff - drainW));
        drainPositions.push(cur.x - px * (drainOff - drainW), dy, cur.z - pz * (drainOff - drainW));
        drainPositions.push(cur.x - px * (drainOff + drainW), dy, cur.z - pz * (drainOff + drainW));
        if (i < points.length - 1) {
          const vi = i * 4;
          drainIndices.push(vi, vi + 1, vi + 4);
          drainIndices.push(vi + 1, vi + 5, vi + 4);
          drainIndices.push(vi + 2, vi + 3, vi + 6);
          drainIndices.push(vi + 3, vi + 7, vi + 6);
        }
      }
      const drainGeo = new THREE.BufferGeometry();
      drainGeo.setAttribute("position", new THREE.Float32BufferAttribute(drainPositions, 3));
      drainGeo.setIndex(drainIndices);
      const drainNormals: number[] = [];
      for (let i = 0; i < drainPositions.length / 3; i++) drainNormals.push(0, 1, 0);
      drainGeo.setAttribute("normal", new THREE.Float32BufferAttribute(drainNormals, 3));
      const drainMesh = new THREE.Mesh(drainGeo, drainMat);
      drainMesh.receiveShadow = true;
      drainMesh.renderOrder = 2;
      group.add(drainMesh);
    }

    // ===================================================================
    // PAVED ROADS: Flagstone pattern + center line + milestones
    // ===================================================================
    if (quality === "paved" && points.length >= 2) {
      // Flagstone rectangles in a brick pattern on the surface
      const flagGeo = new THREE.BoxGeometry(0.14, 0.015, 0.08);
      const flagMat = new THREE.MeshStandardMaterial({ color: 0xc8c8c0, roughness: 0.55 });
      const flagDkMat = new THREE.MeshStandardMaterial({ color: 0xb0b0a8, roughness: 0.6 });
      let flagCount = 0;
      const flagSpacing = 0.18;
      let flagAccum = 0;
      let flagRow = 0;
      for (let i = 0; i < points.length - 1 && flagCount < 12; i++) {
        const a = points[i];
        const b = points[i + 1];
        const segLen = a.distanceTo(b);
        const segDx = b.x - a.x;
        const segDz = b.z - a.z;
        const segL = Math.sqrt(segDx * segDx + segDz * segDz) || 1;
        const fpx = -segDz / segL * hw;
        const fpz = segDx / segL * hw;
        const angle = Math.atan2(segDx, segDz);

        while (flagAccum < segLen && flagCount < 12) {
          const t = flagAccum / segLen;
          const fx = a.x + (b.x - a.x) * t;
          const fz = a.z + (b.z - a.z) * t;
          const fy = a.y + (b.y - a.y) * t;
          // Brick pattern: offset every other row
          const brickOffset = (flagRow % 2 === 0) ? 0 : 0.35;
          for (let col = -1; col <= 1; col++) {
            const fMat = (flagRow + col) % 3 === 0 ? flagDkMat : flagMat;
            const flag = new THREE.Mesh(flagGeo, fMat);
            flag.position.set(
              fx + fpx * (col * 0.35 + brickOffset * 0.1),
              fy + 0.03,
              fz + fpz * (col * 0.35 + brickOffset * 0.1),
            );
            flag.rotation.y = angle;
            group.add(flag);
          }
          flagCount++;
          flagRow++;
          flagAccum += flagSpacing;
        }
        flagAccum -= segLen;
      }

      // Decorative center line - thin gold strip down the middle
      const centerMat = new THREE.MeshStandardMaterial({
        color: 0xd4b040,
        roughness: 0.4,
        metalness: 0.3,
        polygonOffset: true,
        polygonOffsetFactor: -6,
        polygonOffsetUnits: -6,
      });
      const centerPositions: number[] = [];
      const centerIndices: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const cur = points[i];
        const { px, pz } = perps[i];
        const heightVar = Math.sin(i * 1.7) * 0.03 + Math.sin(i * 3.1) * 0.015;
        const cy = cur.y + heightVar + 0.035;
        const cLineW = 0.025;
        centerPositions.push(cur.x + px * cLineW, cy, cur.z + pz * cLineW);
        centerPositions.push(cur.x - px * cLineW, cy, cur.z - pz * cLineW);
        if (i < points.length - 1) {
          const vi = i * 2;
          centerIndices.push(vi, vi + 1, vi + 2);
          centerIndices.push(vi + 1, vi + 3, vi + 2);
        }
      }
      const centerGeo = new THREE.BufferGeometry();
      centerGeo.setAttribute("position", new THREE.Float32BufferAttribute(centerPositions, 3));
      centerGeo.setIndex(centerIndices);
      const centerNormals: number[] = [];
      for (let i = 0; i < centerPositions.length / 3; i++) centerNormals.push(0, 1, 0);
      centerGeo.setAttribute("normal", new THREE.Float32BufferAttribute(centerNormals, 3));
      const centerMesh = new THREE.Mesh(centerGeo, centerMat);
      centerMesh.receiveShadow = true;
      centerMesh.renderOrder = 2;
      group.add(centerMesh);

      // Milestone markers - small stone pillars at start and end
      const milestoneGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.2, 6);
      const milestoneMat = new THREE.MeshStandardMaterial({ color: 0xc0c0b8, roughness: 0.7 });
      const milestoneCapGeo = new THREE.SphereGeometry(0.05, 6, 4);
      for (const ptIdx of [0, points.length - 1]) {
        const pt = points[ptIdx];
        const { px, pz } = perps[ptIdx];
        // Place milestone on the right side of the road
        const pillar = new THREE.Mesh(milestoneGeo, milestoneMat);
        pillar.position.set(pt.x - px * 1.3, pt.y + 0.08, pt.z - pz * 1.3);
        group.add(pillar);
        const cap = new THREE.Mesh(milestoneCapGeo, milestoneMat);
        cap.position.set(pt.x - px * 1.3, pt.y + 0.2, pt.z - pz * 1.3);
        group.add(cap);
      }
    }

    // For stone and paved roads, add small border stones along edges
    if (quality !== "dirt" && points.length >= 2) {
      const stoneGeo = new THREE.SphereGeometry(0.06, 4, 3);
      const stoneMat = new THREE.MeshStandardMaterial({
        color: quality === "paved" ? 0xaaaaaa : 0x888880,
        roughness: 0.9,
      });
      const spacing = quality === "paved" ? 1.0 : 1.5;
      let accumulated = 0;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const segLen = a.distanceTo(b);
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const nx = -dz / len * hw * 1.05;
        const nz = dx / len * hw * 1.05;

        while (accumulated < segLen) {
          const t = accumulated / segLen;
          const sx = a.x + (b.x - a.x) * t;
          const sz = a.z + (b.z - a.z) * t;
          const sy = a.y + (b.y - a.y) * t;
          // Left border stone
          const stoneL = new THREE.Mesh(stoneGeo, stoneMat);
          stoneL.position.set(sx + nx, sy - 0.02, sz + nz);
          group.add(stoneL);
          // Right border stone
          const stoneR = new THREE.Mesh(stoneGeo, stoneMat);
          stoneR.position.set(sx - nx, sy - 0.02, sz - nz);
          group.add(stoneR);
          accumulated += spacing;
        }
        accumulated -= segLen;
      }
    }

    return group;
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

    // === CARGO (resource being carried – on top of pack, visible and prominent) ===
    const cargoMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222 });
    const cargo = new THREE.Mesh(this._boxGeo, cargoMat);
    cargo.name = "cargo";
    cargo.scale.set(h * 0.28, h * 0.2, h * 0.2);
    cargo.position.set(0, h * 0.80, -h * 0.18);
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
        mesh = this._createSoldierMesh(state, soldier.owner, soldier.rank, soldier.unitType || "swordsman");
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

  private _createSoldierMesh(state: SettlersState, owner: string, rank: number, unitType: SoldierType = "swordsman"): THREE.Group {
    if (unitType === "archer") return this._createArcherMesh(state, owner, rank);
    if (unitType === "knight") return this._createKnightMesh(state, owner, rank);
    return this._createSwordsmanMesh(state, owner, rank);
  }

  private _createSwordsmanMesh(state: SettlersState, owner: string, rank: number): THREE.Group {
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
  // Archer mesh – lighter armor, bow instead of sword+shield
  // -----------------------------------------------------------------------

  private _createArcherMesh(state: SettlersState, owner: string, rank: number): THREE.Group {
    const g = new THREE.Group();
    const playerColor = this._getPlayerColor(owner, state);
    const h = SB.SOLDIER_HEIGHT;

    const tunicColor = rank >= 3 ? 0x1e4e0e : 0x2e5e1e;
    const tunicMat = new THREE.MeshStandardMaterial({ color: tunicColor, roughness: 0.8 }); // green tunic
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0ccaa, roughness: 0.7 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.85 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x4a2e16, roughness: 0.9 });

    // Torso (lighter leather vest)
    const torso = new THREE.Mesh(this._boxGeo, tunicMat);
    torso.scale.set(h * 0.40, h * 0.32, h * 0.22);
    torso.position.y = h * 0.52;
    g.add(torso);

    // Leather vest overlay
    const vest = new THREE.Mesh(this._boxGeo, leatherMat);
    vest.scale.set(h * 0.42, h * 0.25, h * 0.24);
    vest.position.y = h * 0.54;
    g.add(vest);

    // Belt with quiver
    const belt = new THREE.Mesh(this._boxGeo, leatherMat);
    belt.scale.set(h * 0.43, h * 0.03, h * 0.25);
    belt.position.y = h * 0.4;
    g.add(belt);

    // Quiver on back
    const quiver = new THREE.Mesh(this._cylGeo, leatherMat);
    quiver.scale.set(0.2, h * 0.25, 0.2);
    quiver.position.set(h * 0.1, h * 0.6, -h * 0.15);
    quiver.rotation.z = 0.15;
    g.add(quiver);

    // Arrow tips poking out
    const arrowMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6 });
    for (let a = 0; a < 3; a++) {
      const arrow = new THREE.Mesh(this._boxGeo, arrowMat);
      arrow.scale.set(h * 0.01, h * 0.04, h * 0.01);
      arrow.position.set(h * (0.08 + a * 0.02), h * 0.76, -h * 0.15);
      g.add(arrow);
    }

    // Neck
    const neck = new THREE.Mesh(this._cylGeo, skinMat);
    neck.scale.set(0.3, h * 0.05, 0.3);
    neck.position.y = h * 0.73;
    g.add(neck);

    // Head
    const head = new THREE.Mesh(this._sphereGeo, skinMat);
    head.scale.set(1.4, 1.45, 1.3);
    head.position.y = h * 0.84;
    g.add(head);

    // Hood (instead of helmet)
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x2a4a1a, roughness: 0.8 });
    const hood = new THREE.Mesh(this._sphereGeo, hoodMat);
    hood.scale.set(1.6, 1.2, 1.6);
    hood.position.y = h * 0.96;
    g.add(hood);

    // Eyes
    for (let side = -1; side <= 1; side += 2) {
      const eyeW = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eyeW.scale.set(0.26, 0.20, 0.12);
      eyeW.position.set(side * h * 0.05, h * 0.86, h * 0.04);
      g.add(eyeW);
      const eye = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({ color: 0x332211 }));
      eye.scale.set(0.16, 0.16, 0.12);
      eye.position.set(side * h * 0.05, h * 0.86, h * 0.045);
      g.add(eye);
    }

    // Arms
    for (let side = -1; side <= 1; side += 2) {
      const arm = new THREE.Mesh(this._cylGeo, tunicMat);
      arm.scale.set(0.32, h * 0.15, 0.32);
      arm.position.set(side * h * 0.26, h * 0.54, 0);
      arm.rotation.z = side * 0.15;
      g.add(arm);
      const hand = new THREE.Mesh(this._boxGeo, skinMat);
      hand.scale.set(h * 0.05, h * 0.05, h * 0.05);
      hand.position.set(side * h * 0.3, h * 0.38, 0);
      g.add(hand);
    }

    // Bow (held in left hand)
    const bowMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.7 });
    const bowStave = new THREE.Mesh(new THREE.TorusGeometry(h * 0.2, h * 0.012, 4, 12, Math.PI * 0.85),
      bowMat);
    bowStave.name = "sword"; // reuse animation hook name
    bowStave.position.set(-h * 0.34, h * 0.5, h * 0.08);
    bowStave.rotation.y = Math.PI * 0.5;
    g.add(bowStave);

    // Bowstring
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xddddbb });
    const bowString = new THREE.Mesh(this._boxGeo, stringMat);
    bowString.scale.set(h * 0.003, h * 0.35, h * 0.003);
    bowString.position.set(-h * 0.34, h * 0.5, h * 0.08);
    g.add(bowString);

    // Legs
    const pantMat = new THREE.MeshStandardMaterial({ color: 0x3a4a2a, roughness: 0.85 });
    for (let side = -1; side <= 1; side += 2) {
      const leg = new THREE.Group();
      leg.name = side === -1 ? "sLeftLeg" : "sRightLeg";
      const thigh = new THREE.Mesh(this._cylGeo, pantMat);
      thigh.scale.set(0.36, h * 0.15, 0.36);
      thigh.position.y = h * 0.08;
      leg.add(thigh);
      const boot = new THREE.Mesh(this._boxGeo, bootMat);
      boot.scale.set(h * 0.07, h * 0.06, h * 0.12);
      boot.position.set(0, -h * 0.08, h * 0.02);
      leg.add(boot);
      leg.position.set(side * h * 0.1, h * 0.2, 0);
      g.add(leg);
    }

    // Player color banner on belt
    const bannerMat = new THREE.MeshStandardMaterial({ color: playerColor, roughness: 0.7 });
    const banner = new THREE.Mesh(this._boxGeo, bannerMat);
    banner.scale.set(h * 0.08, h * 0.1, h * 0.01);
    banner.position.set(h * 0.18, h * 0.35, h * 0.12);
    g.add(banner);

    g.castShadow = true;
    return g;
  }

  // -----------------------------------------------------------------------
  // Knight mesh – mounted soldier, taller, heavier armor
  // -----------------------------------------------------------------------

  private _createKnightMesh(state: SettlersState, owner: string, rank: number): THREE.Group {
    const g = new THREE.Group();
    const playerColor = this._getPlayerColor(owner, state);
    const h = SB.SOLDIER_HEIGHT;

    const armorMat = new THREE.MeshStandardMaterial({
      color: rank >= 3 ? 0xc8b060 : 0x888899,
      metalness: 0.6, roughness: 0.35,
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0ccaa, roughness: 0.7 });
    const horseMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.75 });
    const horseDkMat = new THREE.MeshStandardMaterial({ color: 0x3a2415, roughness: 0.8 });
    const saddleMat = new THREE.MeshStandardMaterial({ color: playerColor, roughness: 0.6 });

    // === HORSE BODY ===
    const horseBody = new THREE.Mesh(this._boxGeo, horseMat);
    horseBody.scale.set(h * 0.35, h * 0.25, h * 0.6);
    horseBody.position.set(0, h * 0.25, 0);
    g.add(horseBody);

    // Horse neck
    const horseNeck = new THREE.Mesh(this._cylGeo, horseMat);
    horseNeck.scale.set(0.5, h * 0.2, 0.4);
    horseNeck.position.set(0, h * 0.4, h * 0.25);
    horseNeck.rotation.x = -0.5;
    g.add(horseNeck);

    // Horse head
    const horseHead = new THREE.Mesh(this._boxGeo, horseMat);
    horseHead.scale.set(h * 0.14, h * 0.12, h * 0.2);
    horseHead.position.set(0, h * 0.5, h * 0.42);
    g.add(horseHead);

    // Horse mane
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const mane = new THREE.Mesh(this._boxGeo, maneMat);
    mane.scale.set(h * 0.02, h * 0.08, h * 0.2);
    mane.position.set(0, h * 0.52, h * 0.3);
    g.add(mane);

    // Horse legs (4)
    const legPositions: [number, number][] = [
      [-h * 0.13, h * 0.2],
      [h * 0.13, h * 0.2],
      [-h * 0.13, -h * 0.2],
      [h * 0.13, -h * 0.2],
    ];
    for (const [lx, lz] of legPositions) {
      const leg = new THREE.Mesh(this._cylGeo, horseDkMat);
      leg.scale.set(0.2, h * 0.12, 0.2);
      leg.position.set(lx, h * 0.06, lz);
      g.add(leg);
      // Hoof
      const hoof = new THREE.Mesh(this._cylGeo, new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 }));
      hoof.scale.set(0.18, h * 0.02, 0.18);
      hoof.position.set(lx, 0, lz);
      g.add(hoof);
    }

    // Horse tail
    const tail = new THREE.Mesh(this._boxGeo, maneMat);
    tail.scale.set(h * 0.02, h * 0.12, h * 0.02);
    tail.position.set(0, h * 0.2, -h * 0.32);
    tail.rotation.x = 0.3;
    g.add(tail);

    // Saddle
    const saddle = new THREE.Mesh(this._boxGeo, saddleMat);
    saddle.scale.set(h * 0.3, h * 0.04, h * 0.2);
    saddle.position.set(0, h * 0.4, 0);
    g.add(saddle);

    // === RIDER ===
    // Rider torso (heavy armor)
    const riderTorso = new THREE.Mesh(this._boxGeo, armorMat);
    riderTorso.scale.set(h * 0.32, h * 0.28, h * 0.2);
    riderTorso.position.set(0, h * 0.68, 0);
    g.add(riderTorso);

    // Rider neck
    const neck = new THREE.Mesh(this._cylGeo, skinMat);
    neck.scale.set(0.25, h * 0.04, 0.25);
    neck.position.y = h * 0.86;
    g.add(neck);

    // Rider head
    const head = new THREE.Mesh(this._sphereGeo, skinMat);
    head.scale.set(1.3, 1.35, 1.2);
    head.position.y = h * 0.94;
    g.add(head);

    // Knight helmet (great helm style)
    const helmetColor = rank >= 3 ? 0xddaa33 : rank >= 2 ? 0x999999 : 0x777788;
    const helmetMat = new THREE.MeshStandardMaterial({
      color: helmetColor, metalness: 0.65, roughness: 0.3,
    });
    const helmet = new THREE.Mesh(this._boxGeo, helmetMat);
    helmet.scale.set(h * 0.18, h * 0.18, h * 0.17);
    helmet.position.y = h * 1.02;
    g.add(helmet);

    // Helmet visor slit
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const visor = new THREE.Mesh(this._boxGeo, visorMat);
    visor.scale.set(h * 0.12, h * 0.02, h * 0.01);
    visor.position.set(0, h * 1.0, h * 0.09);
    g.add(visor);

    // Helmet plume (rank >= 2)
    if (rank >= 2) {
      const plumeMat = new THREE.MeshStandardMaterial({
        color: playerColor, roughness: 0.7,
      });
      const plume = new THREE.Mesh(this._boxGeo, plumeMat);
      plume.scale.set(h * 0.02, h * 0.12, h * 0.16);
      plume.position.y = h * 1.14;
      g.add(plume);
    }

    // Rider arms
    for (let side = -1; side <= 1; side += 2) {
      const arm = new THREE.Mesh(this._cylGeo, armorMat);
      arm.scale.set(0.3, h * 0.14, 0.3);
      arm.position.set(side * h * 0.22, h * 0.64, 0);
      arm.rotation.z = side * 0.3;
      g.add(arm);
    }

    // Lance (right hand)
    const lanceMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.7 });
    const lance = new THREE.Mesh(this._cylGeo, lanceMat);
    lance.name = "sword"; // reuse animation hook name
    lance.scale.set(0.08, h * 0.6, 0.08);
    lance.position.set(h * 0.28, h * 0.8, h * 0.05);
    lance.rotation.z = Math.PI * 0.08;
    g.add(lance);

    // Lance tip
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.7 });
    const tip = new THREE.Mesh(this._boxGeo, tipMat);
    tip.scale.set(h * 0.04, h * 0.08, h * 0.015);
    tip.position.set(h * 0.3, h * 1.12, h * 0.05);
    g.add(tip);

    // Shield (left arm, smaller)
    const shieldMat = new THREE.MeshStandardMaterial({
      color: playerColor, metalness: 0.2, roughness: 0.5,
    });
    const shield = new THREE.Mesh(this._boxGeo, shieldMat);
    shield.scale.set(h * 0.02, h * 0.14, h * 0.1);
    shield.position.set(-h * 0.28, h * 0.6, h * 0.06);
    g.add(shield);

    // Rider legs (straddling horse)
    const pantMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.85 });
    for (let side = -1; side <= 1; side += 2) {
      const leg = new THREE.Group();
      leg.name = side === -1 ? "sLeftLeg" : "sRightLeg";
      const thigh = new THREE.Mesh(this._cylGeo, pantMat);
      thigh.scale.set(0.3, h * 0.1, 0.3);
      thigh.position.set(side * h * 0.16, h * 0.04, 0);
      thigh.rotation.z = side * 0.4;
      leg.add(thigh);
      const boot = new THREE.Mesh(this._boxGeo, new THREE.MeshStandardMaterial({ color: 0x4a2e16, roughness: 0.9 }));
      boot.scale.set(h * 0.06, h * 0.05, h * 0.1);
      boot.position.set(side * h * 0.2, -h * 0.02, h * 0.02);
      leg.add(boot);
      leg.position.y = h * 0.42;
      g.add(leg);
    }

    g.castShadow = true;
    return g;
  }

  // -----------------------------------------------------------------------
  // Building placement preview overlays
  // -----------------------------------------------------------------------

  private _updatePlacementPreview(state: SettlersState): void {
    // Only show when in build mode with a building type selected and hovering a tile
    if (state.selectedTool !== "build" || !state.selectedBuildingType || !state.hoveredTile) {
      this._clearPlacementPreview();
      return;
    }

    const bType = state.selectedBuildingType;
    const hx = state.hoveredTile.x;
    const hz = state.hoveredTile.z;
    const previewKey = `${bType}_${hx}_${hz}`;
    if (previewKey === this._lastPreviewKey) return;
    this._lastPreviewKey = previewKey;

    this._clearPlacementPreview();

    const def = BUILDING_DEFS[bType];
    const map = state.map;
    const ts = SB.TILE_SIZE;

    // 1. Show green/red overlay on tiles indicating valid/invalid placement
    for (let dz = 0; dz < def.footprint.h; dz++) {
      for (let dx = 0; dx < def.footprint.w; dx++) {
        const tx = hx + dx;
        const tz = hz + dz;
        if (tx < 0 || tx >= map.width || tz < 0 || tz >= map.height) continue;

        const idx = tileIdx(map, tx, tz);
        const playerIdx = 0; // p0
        const isInTerritory = map.territory[idx] === playerIdx;
        const isUnoccupied = map.occupied[idx] === "";
        const sizeNum = def.size === "small" ? 1 : def.size === "medium" ? 2 : 3;
        const isBuildable = map.buildable[idx] >= sizeNum;
        const isValid = isInTerritory && isUnoccupied && isBuildable;

        const tileGeo = new THREE.PlaneGeometry(ts * 0.9, ts * 0.9);
        const tileMat = new THREE.MeshBasicMaterial({
          color: isValid ? 0x44cc44 : 0xcc4444,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const tileMesh = new THREE.Mesh(tileGeo, tileMat);
        tileMesh.rotation.x = -Math.PI / 2;
        const wx = (tx + 0.5) * ts;
        const wz = (tz + 0.5) * ts;
        tileMesh.position.set(wx, getHeightAt(map, wx, wz) + 0.08, wz);
        this._placementPreviewGroup.add(tileMesh);
        this._placementTileOverlays.push(tileMesh);
      }
    }

    // 2. Territory radius for military buildings
    if (def.territoryRadius > 0) {
      const radiusWorld = def.territoryRadius * ts;
      const circleGeo = new THREE.CircleGeometry(radiusWorld, 48);
      const circleMat = new THREE.MeshBasicMaterial({
        color: 0x3388ff,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const circle = new THREE.Mesh(circleGeo, circleMat);
      circle.rotation.x = -Math.PI / 2;
      const centerX = (hx + def.footprint.w / 2) * ts;
      const centerZ = (hz + def.footprint.h / 2) * ts;
      circle.position.set(centerX, getHeightAt(map, centerX, centerZ) + 0.06, centerZ);
      this._placementPreviewGroup.add(circle);
      this._territoryRadiusPreview = circle;

      // Also draw a border ring
      const ringGeo = new THREE.RingGeometry(radiusWorld - 0.15, radiusWorld + 0.15, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x5599ff,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(circle.position);
      ring.position.y += 0.01;
      this._placementPreviewGroup.add(ring);
    }

    // 3. When placing a mine, highlight nearby resource deposits in range
    if (def.requiresTerrain === "mountain" &&
        (bType === SettlersBuildingType.IRON_MINE ||
         bType === SettlersBuildingType.GOLD_MINE ||
         bType === SettlersBuildingType.COAL_MINE)) {
      const targetDeposit = bType === SettlersBuildingType.IRON_MINE ? Deposit.IRON
        : bType === SettlersBuildingType.GOLD_MINE ? Deposit.GOLD
        : Deposit.COAL;
      const searchRange = 3;
      for (let dz = -searchRange; dz <= def.footprint.h + searchRange; dz++) {
        for (let dx = -searchRange; dx <= def.footprint.w + searchRange; dx++) {
          const tx = hx + dx;
          const tz = hz + dz;
          if (tx < 0 || tx >= map.width || tz < 0 || tz >= map.height) continue;
          const deposit = map.deposits[tileIdx(map, tx, tz)];
          if (deposit === targetDeposit) {
            const hlGeo = new THREE.PlaneGeometry(ts * 0.8, ts * 0.8);
            const hlMat = new THREE.MeshBasicMaterial({
              color: 0xffdd44,
              transparent: true,
              opacity: 0.4,
              side: THREE.DoubleSide,
              depthWrite: false,
            });
            const hl = new THREE.Mesh(hlGeo, hlMat);
            hl.rotation.x = -Math.PI / 2;
            const wx = (tx + 0.5) * ts;
            const wz = (tz + 0.5) * ts;
            hl.position.set(wx, getHeightAt(map, wx, wz) + 0.1, wz);
            this._placementPreviewGroup.add(hl);
            this._resourceHighlights.push(hl);
          }
        }
      }
    }
  }

  private _clearPlacementPreview(): void {
    if (this._lastPreviewKey === "") return;
    this._lastPreviewKey = "";

    // Remove all preview overlays
    for (const m of this._placementTileOverlays) {
      this._placementPreviewGroup.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this._placementTileOverlays.length = 0;

    for (const m of this._resourceHighlights) {
      this._placementPreviewGroup.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this._resourceHighlights.length = 0;

    if (this._territoryRadiusPreview) {
      this._placementPreviewGroup.remove(this._territoryRadiusPreview);
      this._territoryRadiusPreview.geometry.dispose();
      (this._territoryRadiusPreview.material as THREE.Material).dispose();
      this._territoryRadiusPreview = null;
    }

    // Clear any remaining children (border rings, etc.)
    while (this._placementPreviewGroup.children.length > 0) {
      const child = this._placementPreviewGroup.children[0];
      this._placementPreviewGroup.remove(child);
      child.traverse((c: any) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m: THREE.Material) => m.dispose());
          else c.material.dispose();
        }
      });
    }
  }

  // -----------------------------------------------------------------------
  // Bottleneck warning icons (floating yellow triangles)
  // -----------------------------------------------------------------------

  private _updateWarningIcons(state: SettlersState, t: number): void {
    // Remove icons for buildings that no longer have warnings
    for (const [id, icon] of this._warningIcons) {
      const info = state.bottlenecks.get(id);
      if (!info || !info.warned || !state.buildings.has(id)) {
        this.scene.remove(icon);
        icon.traverse((c: any) => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) c.material.dispose();
        });
        this._warningIcons.delete(id);
      }
    }

    // Add icons for warned buildings
    for (const [id, info] of state.bottlenecks) {
      if (!info.warned) continue;
      if (this._warningIcons.has(id)) {
        // Animate existing icon (float up/down)
        const icon = this._warningIcons.get(id)!;
        const building = state.buildings.get(id);
        if (building) {
          const def = BUILDING_DEFS[building.type];
          const ts = SB.TILE_SIZE;
          const bw = def.footprint.w * ts;
          const cx = (building.tileX + def.footprint.w / 2) * ts;
          const cz = (building.tileZ + def.footprint.h / 2) * ts;
          const baseH = getHeightAt(state.map, cx, cz);
          const buildH = def.size === "large" ? bw * 1.1 : def.size === "medium" ? bw * 0.85 : bw * 0.7;
          icon.position.set(cx, baseH + buildH + 0.5 + Math.sin(t * 3) * 0.15, cz);
          icon.rotation.y = t * 2;
        }
        continue;
      }

      const building = state.buildings.get(id);
      if (!building || building.owner !== "p0") continue;

      // Create warning icon: small yellow triangle
      const g = new THREE.Group();

      // Triangle shape
      const triShape = new THREE.Shape();
      triShape.moveTo(0, 0.25);
      triShape.lineTo(-0.15, -0.1);
      triShape.lineTo(0.15, -0.1);
      triShape.closePath();

      const triGeo = new THREE.ShapeGeometry(triShape);
      const triMat = new THREE.MeshBasicMaterial({
        color: 0xffcc00,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthTest: false,
      });
      const tri = new THREE.Mesh(triGeo, triMat);
      g.add(tri);

      // Exclamation mark
      const excGeo = new THREE.PlaneGeometry(0.04, 0.15);
      const excMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide,
        depthTest: false,
      });
      const exc = new THREE.Mesh(excGeo, excMat);
      exc.position.set(0, 0.1, 0.01);
      g.add(exc);

      const dotGeo = new THREE.PlaneGeometry(0.04, 0.04);
      const dot = new THREE.Mesh(dotGeo, excMat);
      dot.position.set(0, -0.02, 0.01);
      g.add(dot);

      this.scene.add(g);
      this._warningIcons.set(id, g);
    }
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
