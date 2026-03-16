// ---------------------------------------------------------------------------
// Settlers – Three.js renderer (terrain, sky, lighting, buildings, roads, units)
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { SB } from "../config/SettlersBalance";
import { Biome, getHeightAt, getVertex } from "../state/SettlersMap";
import { BUILDING_DEFS } from "../config/SettlersBuildingDefs";
import { RESOURCE_META } from "../config/SettlersResourceDefs";
import type { SettlersState } from "../state/SettlersState";
import type { SettlersBuilding } from "../state/SettlersBuilding";
import type { SettlersFlag } from "../state/SettlersRoad";

// ---------------------------------------------------------------------------
// Biome colors
// ---------------------------------------------------------------------------

const BIOME_COLORS: Record<number, THREE.Color> = {
  [Biome.WATER]:    new THREE.Color(0x2277aa),
  [Biome.MEADOW]:   new THREE.Color(0x5a9e3e),
  [Biome.FOREST]:   new THREE.Color(0x3a7a2e),
  [Biome.MOUNTAIN]: new THREE.Color(0x8a8a7e),
  [Biome.DESERT]:   new THREE.Color(0xc4a854),
};

const PLAYER_COLORS = [0x3388ff, 0xff3333, 0x33cc33, 0xffaa00];

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

  // Territory border line
  private _territoryLine: THREE.LineSegments | null = null;

  // Decorative groups
  private _treesGroup = new THREE.Group();
  private _rocksGroup = new THREE.Group();

  // Cached geometries
  private _boxGeo = new THREE.BoxGeometry(1, 1, 1);
  private _coneGeo = new THREE.ConeGeometry(0.5, 1, 6);
  private _cylGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 6);
  private _sphereGeo = new THREE.SphereGeometry(0.15, 6, 4);

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
    this.renderer.toneMappingExposure = 1.15;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7ab4d8);
    this.scene.fog = new THREE.FogExp2(0x9dc8e0, 0.006);

    // Camera
    this.camera = new THREE.PerspectiveCamera(55, screenW / screenH, 0.5, 500);

    // Lighting
    this._setupLighting();

    // Sky dome
    this._addSkyDome();

    // Tile highlight
    const hlGeo = new THREE.PlaneGeometry(SB.TILE_SIZE, SB.TILE_SIZE);
    const hlMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
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

    // Resize handler
    window.addEventListener("resize", () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  /** Build terrain mesh from map state – called once after terrain generation */
  buildTerrain(state: SettlersState): void {
    const map = state.map;
    const w = map.width;
    const h = map.height;

    // Terrain geometry
    const geo = new THREE.PlaneGeometry(
      w * map.tileSize,
      h * map.tileSize,
      w,
      h,
    );
    geo.rotateX(-Math.PI / 2);

    // Displace vertices from heightmap
    const pos = geo.attributes.position;
    const colors: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const vx = i % (w + 1);
      const vz = Math.floor(i / (w + 1));
      const height = getVertex(map, vx, vz);
      pos.setY(i, height);

      // Offset X/Z so mesh starts at origin
      pos.setX(i, vx * map.tileSize);
      pos.setZ(i, vz * map.tileSize);

      // Color from neighboring tile biome
      const tx = Math.min(vx, w - 1);
      const tz = Math.min(vz, h - 1);
      const biome = map.biomes[tz * w + tx];
      const col = BIOME_COLORS[biome] || BIOME_COLORS[Biome.MEADOW];
      // Slight height-based variation
      const hFactor = 0.85 + (height / SB.MAX_HEIGHT) * 0.3;
      colors.push(col.r * hFactor, col.g * hFactor, col.b * hFactor);
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

    // Water plane
    const waterGeo = new THREE.PlaneGeometry(w * map.tileSize * 1.5, h * map.tileSize * 1.5);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2277aa,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.3,
    });
    this._waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this._waterMesh.rotation.x = -Math.PI / 2;
    this._waterMesh.position.set(
      w * map.tileSize * 0.5,
      SB.WATER_LEVEL * SB.MAX_HEIGHT - 0.1,
      h * map.tileSize * 0.5,
    );
    this.scene.add(this._waterMesh);

    // Decorative trees
    this._buildTrees(state);
    this._buildRocks(state);
  }

  /** Main render call – syncs 3D meshes with game state */
  render(state: SettlersState, _dt: number): void {
    // Update tile highlight
    if (state.hoveredTile) {
      this._tileHighlight.visible = true;
      const wx = (state.hoveredTile.x + 0.5) * SB.TILE_SIZE;
      const wz = (state.hoveredTile.z + 0.5) * SB.TILE_SIZE;
      const wy = getHeightAt(state.map, wx, wz) + 0.05;
      this._tileHighlight.position.set(wx, wy, wz);
    } else {
      this._tileHighlight.visible = false;
    }

    // Sync buildings
    this._syncBuildings(state);

    // Sync flags
    this._syncFlags(state);

    // Sync roads
    this._syncRoads(state);

    // Sync carriers
    this._syncCarriers(state);

    // Sync soldiers
    this._syncSoldiers(state);

    // Sync territory borders
    this._syncTerritory(state);

    // Animate water
    if (this._waterMesh) {
      this._waterMesh.position.y =
        SB.WATER_LEVEL * SB.MAX_HEIGHT - 0.1 + Math.sin(Date.now() * 0.001) * 0.05;
    }

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  destroy(): void {
    this.renderer.dispose();
    this.canvas.remove();
    // Re-show pixi container
    const container = document.getElementById("pixi-container");
    if (container) container.style.display = "";
  }

  // -----------------------------------------------------------------------
  // Private: Lighting
  // -----------------------------------------------------------------------

  private _setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x8090a8, 0.6);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xc8dff5, 0x3d5220, 0.9);
    this.scene.add(hemi);

    this._sunLight = new THREE.DirectionalLight(0xffecc0, 1.8);
    this._sunLight.position.set(60, 80, 40);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(2048, 2048);
    this._sunLight.shadow.camera.left = -80;
    this._sunLight.shadow.camera.right = 80;
    this._sunLight.shadow.camera.top = 80;
    this._sunLight.shadow.camera.bottom = -80;
    this._sunLight.shadow.camera.far = 200;
    this._sunLight.shadow.bias = -0.0005;
    this._sunLight.shadow.normalBias = 0.02;
    this.scene.add(this._sunLight);
    this.scene.add(this._sunLight.target);

    const fill = new THREE.DirectionalLight(0x8aaecc, 0.35);
    fill.position.set(-40, 30, -20);
    this.scene.add(fill);
  }

  // -----------------------------------------------------------------------
  // Private: Sky dome
  // -----------------------------------------------------------------------

  private _addSkyDome(): void {
    const skyGeo = new THREE.SphereGeometry(250, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const skyColors: number[] = [];
    const pos = skyGeo.attributes.position;
    const zenith = new THREE.Color(0x4488cc);
    const horizon = new THREE.Color(0xc8dff5);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = Math.max(0, y / 250);
      const c = new THREE.Color().lerpColors(horizon, zenith, t);
      skyColors.push(c.r, c.g, c.b);
    }
    skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(skyColors, 3));
    const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.set(
      SB.MAP_WIDTH * SB.TILE_SIZE * 0.5,
      0,
      SB.MAP_HEIGHT * SB.TILE_SIZE * 0.5,
    );
    this.scene.add(sky);
  }

  // -----------------------------------------------------------------------
  // Private: Decorative trees & rocks
  // -----------------------------------------------------------------------

  private _buildTrees(state: SettlersState): void {
    this._treesGroup.clear();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d6b1e, roughness: 0.85 });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x3d8b2e, roughness: 0.85 });

    for (const tree of state.map.trees) {
      const g = new THREE.Group();
      const s = tree.scale;

      // Trunk
      const trunk = new THREE.Mesh(this._cylGeo, trunkMat);
      trunk.scale.set(s * 0.8, s * 2, s * 0.8);
      trunk.position.y = s;
      g.add(trunk);

      // Canopy
      const canopy = new THREE.Mesh(this._coneGeo, tree.variant === 0 ? leafMat : leafMat2);
      canopy.scale.set(s * 2.5, s * 3, s * 2.5);
      canopy.position.y = s * 3;
      canopy.castShadow = true;
      g.add(canopy);

      const wy = getHeightAt(state.map, tree.x, tree.z);
      g.position.set(tree.x, wy, tree.z);
      this._treesGroup.add(g);
    }
  }

  private _buildRocks(state: SettlersState): void {
    this._rocksGroup.clear();
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x777770, roughness: 0.95 });

    for (const rock of state.map.rocks) {
      const mesh = new THREE.Mesh(this._boxGeo, rockMat);
      mesh.scale.set(rock.scale * 1.5, rock.scale, rock.scale * 1.2);
      const wy = getHeightAt(state.map, rock.x, rock.z);
      mesh.position.set(rock.x, wy + rock.scale * 0.3, rock.z);
      mesh.rotation.y = rock.x * 1.7; // pseudo-random rotation
      mesh.castShadow = true;
      this._rocksGroup.add(mesh);
    }
  }

  // -----------------------------------------------------------------------
  // Private: Entity sync (reconciliation pattern)
  // -----------------------------------------------------------------------

  private _syncBuildings(state: SettlersState): void {
    // Remove meshes for buildings that no longer exist
    for (const [id, mesh] of this._buildingMeshes) {
      if (!state.buildings.has(id)) {
        this.scene.remove(mesh);
        this._buildingMeshes.delete(id);
      }
    }
    // Add/update meshes
    for (const [id, building] of state.buildings) {
      let mesh = this._buildingMeshes.get(id);
      if (!mesh) {
        mesh = this._createBuildingMesh(building, state);
        this._buildingMeshes.set(id, mesh);
        this.scene.add(mesh);
      }
      // Update construction progress visual
      const progress = building.constructionProgress;
      if (progress < 1) {
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            (child.material as THREE.MeshStandardMaterial).wireframe = progress < 0.5;
            (child.material as THREE.MeshStandardMaterial).opacity = 0.4 + progress * 0.6;
          }
        });
      }
    }
  }

  private _createBuildingMesh(building: SettlersBuilding, state: SettlersState): THREE.Group {
    const def = BUILDING_DEFS[building.type];
    const g = new THREE.Group();
    const playerColor = this._getPlayerColor(building.owner, state);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xd4c4a0,
      roughness: 0.85,
      transparent: true,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: playerColor,
      roughness: 0.8,
      transparent: true,
    });

    const ts = SB.TILE_SIZE;
    const fw = def.footprint.w * ts;
    const fh = def.footprint.h * ts;

    if (def.garrisonSlots > 0) {
      // Military: cylinder tower + crenellations
      const towerGeo = new THREE.CylinderGeometry(fw * 0.35, fw * 0.4, fw * 1.2, 8);
      const tower = new THREE.Mesh(towerGeo, wallMat);
      tower.position.y = fw * 0.6;
      tower.castShadow = true;
      g.add(tower);

      // Crenellation ring
      const ringGeo = new THREE.TorusGeometry(fw * 0.38, 0.15, 4, 8);
      const ring = new THREE.Mesh(ringGeo, roofMat);
      ring.position.y = fw * 1.2;
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
    } else if (def.size === "large") {
      // Large: multi-box + tall roof
      const base = new THREE.Mesh(this._boxGeo, wallMat);
      base.scale.set(fw * 0.8, fw * 0.5, fh * 0.8);
      base.position.y = fw * 0.25;
      base.castShadow = true;
      g.add(base);

      const roof = new THREE.Mesh(this._coneGeo, roofMat);
      roof.scale.set(fw * 0.9, fw * 0.6, fh * 0.9);
      roof.position.y = fw * 0.7;
      roof.castShadow = true;
      g.add(roof);
    } else if (def.size === "medium") {
      // Medium: box + triangular roof
      const base = new THREE.Mesh(this._boxGeo, wallMat);
      base.scale.set(fw * 0.7, fw * 0.45, fh * 0.7);
      base.position.y = fw * 0.22;
      base.castShadow = true;
      g.add(base);

      const roof = new THREE.Mesh(this._coneGeo, roofMat);
      roof.scale.set(fw * 0.8, fw * 0.5, fh * 0.8);
      roof.position.y = fw * 0.55;
      roof.castShadow = true;
      g.add(roof);
    } else {
      // Small: box + small cone roof
      const base = new THREE.Mesh(this._boxGeo, wallMat);
      base.scale.set(fw * 0.6, fw * 0.35, fh * 0.6);
      base.position.y = fw * 0.17;
      base.castShadow = true;
      g.add(base);

      const roof = new THREE.Mesh(this._coneGeo, roofMat);
      roof.scale.set(fw * 0.65, fw * 0.4, fh * 0.65);
      roof.position.y = fw * 0.45;
      roof.castShadow = true;
      g.add(roof);
    }

    // Position in world
    const cx = (building.tileX + def.footprint.w * 0.5) * ts;
    const cz = (building.tileZ + def.footprint.h * 0.5) * ts;
    const wy = getHeightAt(state.map, cx, cz);
    g.position.set(cx, wy, cz);

    return g;
  }

  private _syncFlags(state: SettlersState): void {
    for (const [id, mesh] of this._flagMeshes) {
      if (!state.flags.has(id)) {
        this.scene.remove(mesh);
        this._flagMeshes.delete(id);
      }
    }
    for (const [id, flag] of state.flags) {
      if (!this._flagMeshes.has(id)) {
        const mesh = this._createFlagMesh(flag, state);
        this._flagMeshes.set(id, mesh);
        this.scene.add(mesh);
      }
    }
  }

  private _createFlagMesh(flag: SettlersFlag, state: SettlersState): THREE.Group {
    const g = new THREE.Group();
    const playerColor = this._getPlayerColor(flag.owner, state);

    // Pole
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
    const pole = new THREE.Mesh(this._cylGeo, poleMat);
    pole.scale.set(1, SB.FLAG_HEIGHT, 1);
    pole.position.y = SB.FLAG_HEIGHT * 0.5;
    g.add(pole);

    // Pennant (small triangle)
    const pennantGeo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      0, 0, 0,
      0.3, -0.1, 0,
      0, -0.2, 0,
    ]);
    pennantGeo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    pennantGeo.computeVertexNormals();
    const pennantMat = new THREE.MeshStandardMaterial({
      color: playerColor,
      side: THREE.DoubleSide,
    });
    const pennant = new THREE.Mesh(pennantGeo, pennantMat);
    pennant.position.y = SB.FLAG_HEIGHT;
    g.add(pennant);

    const wx = (flag.tileX + 0.5) * SB.TILE_SIZE;
    const wz = (flag.tileZ + 0.5) * SB.TILE_SIZE;
    const wy = getHeightAt(state.map, wx, wz);
    g.position.set(wx, wy, wz);

    return g;
  }

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
    // Create a ribbon along the path
    const points: THREE.Vector3[] = [];
    for (const p of path) {
      const wx = (p.x + 0.5) * SB.TILE_SIZE;
      const wz = (p.z + 0.5) * SB.TILE_SIZE;
      const wy = getHeightAt(state.map, wx, wz) + 0.03;
      points.push(new THREE.Vector3(wx, wy, wz));
    }

    if (points.length < 2) {
      // Degenerate road – just make a tiny invisible mesh
      const geo = new THREE.PlaneGeometry(0.01, 0.01);
      return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false }));
    }

    // Build a flat ribbon geometry along the path
    const positions: number[] = [];
    const indices: number[] = [];
    const hw = SB.ROAD_WIDTH * 0.5;

    for (let i = 0; i < points.length; i++) {
      const cur = points[i];
      const next = i < points.length - 1 ? points[i + 1] : points[i];
      const prev = i > 0 ? points[i - 1] : points[i];

      // Direction along path
      const dx = next.x - prev.x;
      const dz = next.z - prev.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      // Perpendicular
      const px = -dz / len * hw;
      const pz = dx / len * hw;

      positions.push(cur.x + px, cur.y, cur.z + pz);
      positions.push(cur.x - px, cur.y, cur.z - pz);

      if (i < points.length - 1) {
        const vi = i * 2;
        indices.push(vi, vi + 1, vi + 2);
        indices.push(vi + 1, vi + 3, vi + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x9e8a6a,
      roughness: 0.95,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return mesh;
  }

  private _syncCarriers(state: SettlersState): void {
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
      // Update position
      mesh.position.set(carrier.position.x, carrier.position.y, carrier.position.z);

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

    // Body
    const bodyMat = new THREE.MeshStandardMaterial({ color: playerColor });
    const body = new THREE.Mesh(this._boxGeo, bodyMat);
    body.scale.set(h * 0.6, h * 0.7, h * 0.4);
    body.position.y = h * 0.5;
    g.add(body);

    // Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xeeccaa });
    const head = new THREE.Mesh(this._sphereGeo, headMat);
    head.scale.set(1.2, 1.2, 1.2);
    head.position.y = h * 0.95;
    g.add(head);

    // Cargo box (hidden by default)
    const cargoMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const cargo = new THREE.Mesh(this._boxGeo, cargoMat);
    cargo.name = "cargo";
    cargo.scale.set(h * 0.3, h * 0.3, h * 0.3);
    cargo.position.set(0, h * 0.9, -h * 0.25);
    cargo.visible = false;
    g.add(cargo);

    return g;
  }

  private _syncSoldiers(state: SettlersState): void {
    for (const [id, mesh] of this._soldierMeshes) {
      if (!state.soldiers.has(id)) {
        this.scene.remove(mesh);
        this._soldierMeshes.delete(id);
      }
    }
    for (const [id, soldier] of state.soldiers) {
      if (soldier.state === "garrisoned") continue; // don't render garrisoned soldiers

      let mesh = this._soldierMeshes.get(id);
      if (!mesh) {
        mesh = this._createSoldierMesh(state, soldier.owner);
        this._soldierMeshes.set(id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(soldier.position.x, soldier.position.y, soldier.position.z);
    }
  }

  private _createSoldierMesh(state: SettlersState, owner: string): THREE.Group {
    const g = new THREE.Group();
    const playerColor = this._getPlayerColor(owner, state);
    const h = SB.SOLDIER_HEIGHT;

    // Body
    const bodyMat = new THREE.MeshStandardMaterial({ color: playerColor });
    const body = new THREE.Mesh(this._boxGeo, bodyMat);
    body.scale.set(h * 0.5, h * 0.8, h * 0.35);
    body.position.y = h * 0.5;
    g.add(body);

    // Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xeeccaa });
    const head = new THREE.Mesh(this._sphereGeo, headMat);
    head.scale.set(1.5, 1.5, 1.5);
    head.position.y = h * 1.0;
    g.add(head);

    // Shield (small disc)
    const shieldMat = new THREE.MeshStandardMaterial({ color: 0x886633 });
    const shieldGeo = new THREE.CylinderGeometry(h * 0.25, h * 0.25, 0.04, 6);
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.rotation.z = Math.PI / 2;
    shield.position.set(-h * 0.35, h * 0.55, 0);
    g.add(shield);

    // Sword (thin cylinder)
    const swordMat = new THREE.MeshStandardMaterial({ color: 0xccccdd });
    const sword = new THREE.Mesh(this._cylGeo, swordMat);
    sword.scale.set(0.3, h * 1.2, 0.3);
    sword.position.set(h * 0.35, h * 0.7, 0);
    sword.rotation.z = Math.PI * 0.15;
    g.add(sword);

    return g;
  }

  private _syncTerritory(state: SettlersState): void {
    // Rebuild territory border lines when territory changes
    // For performance, only rebuild periodically
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

        // Check each edge – if neighbor has different owner, draw border
        const edges: [number, number, number, number][] = [
          [tx, tz, tx + 1, tz],     // top
          [tx + 1, tz, tx + 1, tz + 1], // right
          [tx, tz + 1, tx + 1, tz + 1], // bottom
          [tx, tz, tx, tz + 1],     // left
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
            const wy1 = getHeightAt(map, wx1, wz1) + 0.15;
            const wy2 = getHeightAt(map, wx2, wz2) + 0.15;

            positions.push(wx1, wy1, wz1, wx2, wy2, wz2);
            colors.push(playerColor.r, playerColor.g, playerColor.b);
            colors.push(playerColor.r, playerColor.g, playerColor.b);
          }
        }
      }
    }

    if (positions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: 2,
        transparent: true,
        opacity: 0.7 + Math.sin(Date.now() * 0.003) * 0.15,
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
