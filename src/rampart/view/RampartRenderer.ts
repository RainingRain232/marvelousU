// ---------------------------------------------------------------------------
// Rampart — Three.js 3D renderer
// Castle tower-defense with terrain, towers, enemies, projectiles
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { RAMPART, TOWER_DEFS } from "../config/RampartConfig";
import type { RampartState, RampartTower, RampartEnemy } from "../state/RampartState";
import { getTerrainHeight, getTowerEffectiveRange } from "../systems/RampartSystem";

const CS = RAMPART.CELL_SIZE;

export class RampartRenderer {
  public canvas!: HTMLCanvasElement;

  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;

  // Reusable groups
  private _terrainGroup = new THREE.Group();
  private _castleGroup = new THREE.Group();
  private _towerGroup = new THREE.Group();
  private _enemyGroup = new THREE.Group();
  private _projectileGroup = new THREE.Group();
  private _particleGroup = new THREE.Group();
  private _gridOverlay = new THREE.Group();
  private _explosionGroup = new THREE.Group();
  private _rangeCircle: THREE.Mesh | null = null;
  private _hoverMarker: THREE.Mesh | null = null;
  private _explosions: Array<{ mesh: THREE.Mesh; life: number; maxLife: number; radius: number }> = [];
  private _muzzleFlashGroup = new THREE.Group();
  private _flagMeshes: THREE.Mesh[] = [];

  // Pools
  private _towerMeshes = new Map<number, THREE.Group>();
  private _towerLevels = new Map<number, number>();
  private _enemyMeshes = new Map<number, THREE.Group>();
  private _hpBars = new Map<number, THREE.Mesh>();

  // Cached materials
  private _matCache = new Map<number, THREE.MeshStandardMaterial>();

  // Lighting
  private _sunLight!: THREE.DirectionalLight;
  private _time = 0;

  init(sw: number, sh: number): void {
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this._renderer.setSize(sw, sh);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.canvas = this._renderer.domElement;
    this.canvas.style.position = "fixed";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.zIndex = "5";

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x87ceeb);
    this._scene.fog = new THREE.Fog(0x87ceeb, 80, 200);

    this._camera = new THREE.PerspectiveCamera(50, sw / sh, 0.5, 300);

    // Lighting
    const ambient = new THREE.AmbientLight(0x8899bb, 0.6);
    this._scene.add(ambient);

    this._sunLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    this._sunLight.position.set(30, 50, 20);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(2048, 2048);
    this._sunLight.shadow.camera.left = -60;
    this._sunLight.shadow.camera.right = 60;
    this._sunLight.shadow.camera.top = 60;
    this._sunLight.shadow.camera.bottom = -60;
    this._sunLight.shadow.camera.near = 1;
    this._sunLight.shadow.camera.far = 120;
    this._scene.add(this._sunLight);

    // Hemisphere light for sky/ground color
    const hemi = new THREE.HemisphereLight(0x88bbff, 0x445522, 0.4);
    this._scene.add(hemi);

    // Groups
    this._scene.add(this._terrainGroup);
    this._scene.add(this._castleGroup);
    this._scene.add(this._towerGroup);
    this._scene.add(this._enemyGroup);
    this._scene.add(this._projectileGroup);
    this._scene.add(this._particleGroup);
    this._scene.add(this._gridOverlay);
    this._scene.add(this._explosionGroup);
    this._scene.add(this._muzzleFlashGroup);

    this._buildTerrain();
    this._buildCastle();
    this._buildGridOverlay();
    this._buildHoverMarker();
    this._buildRangeCircle();
    this._buildPath();
  }

  private _getMat(color: number): THREE.MeshStandardMaterial {
    let mat = this._matCache.get(color);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
      this._matCache.set(color, mat);
    }
    return mat;
  }

  // -----------------------------------------------------------------------
  // Terrain
  // -----------------------------------------------------------------------

  private _buildTerrain(): void {
    const cols = RAMPART.GRID_COLS;
    const rows = RAMPART.GRID_ROWS;

    // Ground plane with vertex displacement
    const geo = new THREE.PlaneGeometry(
      cols * CS + 20, rows * CS + 20,
      cols * 2, rows * 2,
    );
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // Map z to row
      const row = (z + rows * CS / 2) / CS;
      const h = getTerrainHeight(Math.max(0, Math.min(rows - 1, row)));
      pos.setY(i, h - 0.1 + Math.sin(x * 0.3) * 0.2 + Math.cos(z * 0.4) * 0.15);
    }
    geo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: RAMPART.COLOR_GROUND,
      roughness: 0.9,
      metalness: 0,
      flatShading: true,
    });
    const ground = new THREE.Mesh(geo, groundMat);
    ground.position.set(cols * CS / 2, 0, rows * CS / 2);
    ground.receiveShadow = true;
    this._terrainGroup.add(ground);

  }

  private _buildPath(): void {
    const cols = RAMPART.GRID_COLS;
    const rows = RAMPART.GRID_ROWS;
    const pathMat = new THREE.MeshStandardMaterial({
      color: RAMPART.COLOR_PATH,
      roughness: 0.95,
      metalness: 0,
      flatShading: true,
    });

    // Build path quads based on default grid layout
    // Reconstruct grid to find path cells
    const grid: number[][] = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) grid[r][c] = 0;
    }
    // Regenerate path info using same logic as state init
    const mid = Math.floor(cols / 2);
    let col = mid;
    const pathCells: Array<{col: number; row: number}> = [];
    for (let row = rows - 1; row >= 2; row--) {
      pathCells.push({ col, row });
      if (row === rows - 4) col = Math.min(col + 4, cols - 3);
      else if (row === rows - 8) col = Math.max(col - 6, 2);
      else if (row === rows - 12) col = Math.min(col + 5, cols - 3);
      else if (row === rows - 16) col = Math.max(col - 4, 2);
    }
    for (const node of pathCells) {
      grid[node.row][node.col] = 1;
      if (node.col > 0) grid[node.row][node.col - 1] = 1;
      if (node.col < cols - 1) grid[node.row][node.col + 1] = 1;
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] !== 1) continue;
        const geo = new THREE.PlaneGeometry(CS, CS);
        geo.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geo, pathMat);
        mesh.position.set(
          c * CS + CS / 2,
          getTerrainHeight(r) + 0.02,
          r * CS + CS / 2,
        );
        mesh.receiveShadow = true;
        this._terrainGroup.add(mesh);
      }
    }
  }

  private _buildGridOverlay(): void {
    const cols = RAMPART.GRID_COLS;
    const rows = RAMPART.GRID_ROWS;

    // Thin lines showing the grid
    const lineMat = new THREE.LineBasicMaterial({ color: RAMPART.COLOR_GRID_LINE, transparent: true, opacity: 0.15 });

    for (let c = 0; c <= cols; c++) {
      const pts = [
        new THREE.Vector3(c * CS, getTerrainHeight(0) + 0.05, 0),
        new THREE.Vector3(c * CS, getTerrainHeight(rows - 1) + 0.05, rows * CS),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      this._gridOverlay.add(new THREE.Line(geo, lineMat));
    }
    for (let r = 0; r <= rows; r++) {
      const y = getTerrainHeight(Math.min(r, rows - 1)) + 0.05;
      const pts = [
        new THREE.Vector3(0, y, r * CS),
        new THREE.Vector3(cols * CS, y, r * CS),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      this._gridOverlay.add(new THREE.Line(geo, lineMat));
    }
  }

  // -----------------------------------------------------------------------
  // Castle
  // -----------------------------------------------------------------------

  private _buildCastle(): void {
    const mid = Math.floor(RAMPART.GRID_COLS / 2);
    const cx = mid * CS + CS / 2;
    const cz = 1 * CS + CS / 2;
    const baseY = getTerrainHeight(1);

    // Main keep
    const keepGeo = new THREE.BoxGeometry(10, 8, 6);
    const keep = new THREE.Mesh(keepGeo, this._getMat(RAMPART.COLOR_CASTLE));
    keep.position.set(cx, baseY + 4, cz);
    keep.castShadow = true;
    keep.receiveShadow = true;
    this._castleGroup.add(keep);

    // Roof
    const roofGeo = new THREE.ConeGeometry(7, 4, 4);
    const roof = new THREE.Mesh(roofGeo, this._getMat(RAMPART.COLOR_CASTLE_ROOF));
    roof.position.set(cx, baseY + 10, cz);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    this._castleGroup.add(roof);

    // Corner towers
    const offsets = [[-5, -3], [5, -3], [-5, 3], [5, 3]];
    for (const [ox, oz] of offsets) {
      const towerGeo = new THREE.CylinderGeometry(1.5, 1.8, 10, 8);
      const tower = new THREE.Mesh(towerGeo, this._getMat(RAMPART.COLOR_CASTLE));
      tower.position.set(cx + ox, baseY + 5, cz + oz);
      tower.castShadow = true;
      this._castleGroup.add(tower);

      const capGeo = new THREE.ConeGeometry(2, 3, 8);
      const cap = new THREE.Mesh(capGeo, this._getMat(RAMPART.COLOR_CASTLE_ROOF));
      cap.position.set(cx + ox, baseY + 11.5, cz + oz);
      cap.castShadow = true;
      this._castleGroup.add(cap);
    }

    // Gate
    const gateGeo = new THREE.BoxGeometry(3, 4, 1);
    const gate = new THREE.Mesh(gateGeo, this._getMat(0x3a2a1a));
    gate.position.set(cx, baseY + 2, cz + 3.5);
    this._castleGroup.add(gate);

    // Walls
    const wallGeo = new THREE.BoxGeometry(18, 5, 1);
    const wall = new THREE.Mesh(wallGeo, this._getMat(RAMPART.COLOR_CASTLE));
    wall.position.set(cx, baseY + 2.5, cz + 3);
    wall.receiveShadow = true;
    this._castleGroup.add(wall);

    // Battlements
    for (let i = -8; i <= 8; i += 2) {
      const merlonGeo = new THREE.BoxGeometry(1, 1.5, 1.2);
      const merlon = new THREE.Mesh(merlonGeo, this._getMat(RAMPART.COLOR_CASTLE));
      merlon.position.set(cx + i, baseY + 5.75, cz + 3);
      this._castleGroup.add(merlon);
    }

    // Banner poles with flags
    const bannerPositions = [[-5, -3], [5, -3]];
    for (const [ox, oz] of bannerPositions) {
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 4, 4);
      const pole = new THREE.Mesh(poleGeo, this._getMat(0x888888));
      pole.position.set(cx + ox, baseY + 14, cz + oz);
      this._castleGroup.add(pole);

      const flagGeo = new THREE.PlaneGeometry(2, 1.5);
      const flagMat = new THREE.MeshStandardMaterial({
        color: 0xcc2222,
        side: THREE.DoubleSide,
        roughness: 0.8,
      });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(cx + ox + 1.2, baseY + 15, cz + oz);
      this._castleGroup.add(flag);
      this._flagMeshes.push(flag);
    }
  }

  // -----------------------------------------------------------------------
  // Hover & range indicators
  // -----------------------------------------------------------------------

  private _buildHoverMarker(): void {
    const geo = new THREE.BoxGeometry(CS - 0.2, 0.15, CS - 0.2);
    const mat = new THREE.MeshBasicMaterial({ color: RAMPART.COLOR_HOVER_VALID, transparent: true, opacity: 0.5 });
    this._hoverMarker = new THREE.Mesh(geo, mat);
    this._hoverMarker.visible = false;
    this._scene.add(this._hoverMarker);
  }

  private _buildRangeCircle(): void {
    const geo = new THREE.RingGeometry(0, 1, 48);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    this._rangeCircle = new THREE.Mesh(geo, mat);
    this._rangeCircle.visible = false;
    this._scene.add(this._rangeCircle);
  }

  // -----------------------------------------------------------------------
  // Update loop
  // -----------------------------------------------------------------------

  update(state: RampartState, dt: number): void {
    this._time += dt;

    this._updateCamera(state);
    this._updateHover(state);

    // Clear per-frame groups
    while (this._muzzleFlashGroup.children.length > 0) {
      this._muzzleFlashGroup.remove(this._muzzleFlashGroup.children[0]);
    }

    this._updateTowers(state);
    this._updateEnemies(state);
    this._updateProjectiles(state);
    this._updateParticles(state);
    this._updateExplosions(state);
    this._updateCastleDamage(state, dt);

    // Animate sun slightly
    this._sunLight.position.x = 30 + Math.sin(this._time * 0.05) * 10;

    // Flag waving
    for (let i = 0; i < this._flagMeshes.length; i++) {
      const flag = this._flagMeshes[i];
      flag.rotation.y = Math.sin(this._time * 3 + i * 2) * 0.2;
      flag.rotation.z = Math.sin(this._time * 2.5 + i) * 0.1;
      flag.position.y += Math.sin(this._time * 4 + i) * 0.003;
    }

    this._renderer.render(this._scene, this._camera);
  }

  // -----------------------------------------------------------------------
  // Camera
  // -----------------------------------------------------------------------

  private _updateCamera(state: RampartState): void {
    const d = state.camDistance;
    const a = state.camAngle;
    const cx = state.camTargetX;
    const cz = state.camTargetZ;

    // Camera shake offset
    const shakeX = state.camShake * (Math.random() - 0.5) * 2;
    const shakeY = state.camShake * (Math.random() - 0.5) * 1.5;
    const shakeZ = state.camShake * (Math.random() - 0.5) * 2;

    this._camera.position.set(
      cx + Math.sin(a) * d + shakeX,
      RAMPART.CAM_HEIGHT + (d - RAMPART.CAM_DISTANCE) * 0.3 + shakeY,
      cz + Math.cos(a) * d + shakeZ,
    );
    this._camera.lookAt(cx, getTerrainHeight(Math.floor(RAMPART.GRID_ROWS / 2)) + 2, cz);
  }

  // -----------------------------------------------------------------------
  // Hover marker
  // -----------------------------------------------------------------------

  private _updateHover(state: RampartState): void {
    if (!this._hoverMarker || !this._rangeCircle) return;

    // Show range circle for selected placed tower
    if (state.selectedPlacedTower !== null) {
      const tower = state.towers.find(t => t.id === state.selectedPlacedTower);
      if (tower) {
        const y = tower.y + 0.1;
        this._rangeCircle.visible = true;
        this._rangeCircle.position.set(tower.x, y + 0.05, tower.z);
        this._rangeCircle.scale.setScalar(getTowerEffectiveRange(tower));

        // Highlight the tower's cell
        this._hoverMarker.position.set(tower.x, y, tower.z);
        this._hoverMarker.visible = true;
        (this._hoverMarker.material as THREE.MeshBasicMaterial).color.setHex(0xffd700);
        return;
      }
    }

    if (state.hoverCol >= 0 && state.hoverRow >= 0 && state.selectedTower) {
      const x = state.hoverCol * CS + CS / 2;
      const z = state.hoverRow * CS + CS / 2;
      const y = getTerrainHeight(state.hoverRow) + 0.1;
      this._hoverMarker.position.set(x, y, z);
      this._hoverMarker.visible = true;

      const valid = state.grid[state.hoverRow]?.[state.hoverCol] === 0;
      const def = TOWER_DEFS[state.selectedTower];
      const canAfford = def ? state.gold >= def.cost : false;
      const mat = this._hoverMarker.material as THREE.MeshBasicMaterial;
      mat.color.setHex(valid && canAfford ? RAMPART.COLOR_HOVER_VALID : RAMPART.COLOR_HOVER_INVALID);

      // Range circle
      if (def) {
        this._rangeCircle.visible = true;
        this._rangeCircle.position.set(x, y + 0.05, z);
        this._rangeCircle.scale.setScalar(def.range);
      }
    } else {
      this._hoverMarker.visible = false;
      this._rangeCircle!.visible = false;
    }
  }

  // -----------------------------------------------------------------------
  // Towers
  // -----------------------------------------------------------------------

  private _updateTowers(state: RampartState): void {
    // Remove meshes for towers that no longer exist
    const towerIds = new Set(state.towers.map(t => t.id));
    for (const [id, mesh] of this._towerMeshes) {
      if (!towerIds.has(id)) {
        this._towerGroup.remove(mesh);
        this._towerMeshes.delete(id);
        this._towerLevels.delete(id);
      }
    }

    // Add/update tower meshes (rebuild if level changed)
    for (const tower of state.towers) {
      const prevLevel = this._towerLevels.get(tower.id);
      if (!this._towerMeshes.has(tower.id) || prevLevel !== tower.level) {
        const old = this._towerMeshes.get(tower.id);
        if (old) this._towerGroup.remove(old);

        const group = this._buildTowerMesh(tower);
        this._towerGroup.add(group);
        this._towerMeshes.set(tower.id, group);
        this._towerLevels.set(tower.id, tower.level);
      }

      // Muzzle flash
      if (tower.muzzleFlash > 0) {
        const flashGeo = new THREE.SphereGeometry(0.3, 6, 6);
        const flashMat = new THREE.MeshBasicMaterial({
          color: tower.def.projectileColor,
          transparent: true,
          opacity: Math.min(1, tower.muzzleFlash / 0.06),
        });
        const flash = new THREE.Mesh(flashGeo, flashMat);
        flash.position.set(tower.x, tower.y + tower.def.height + 0.5, tower.z);
        this._muzzleFlashGroup.add(flash);
      }

      // Rotate tower to face nearest alive enemy in range
      const group = this._towerMeshes.get(tower.id);
      if (group) {
        let bestEnemy: RampartEnemy | null = null;
        let bestDist = Infinity;
        for (const enemy of state.enemies) {
          if (!enemy.alive) continue;
          const dx = tower.x - enemy.x;
          const dz = tower.z - enemy.z;
          const distSq = dx * dx + dz * dz;
          if (distSq < bestDist) {
            bestDist = distSq;
            bestEnemy = enemy;
          }
        }
        if (bestEnemy) {
          const targetAngle = Math.atan2(bestEnemy.x - tower.x, bestEnemy.z - tower.z);
          // Smooth rotation
          let diff = targetAngle - group.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          group.rotation.y += diff * 0.15;
        }
      }
    }
  }

  private _buildTowerMesh(tower: RampartTower): THREE.Group {
    const group = new THREE.Group();
    const def = tower.def;

    // Base platform
    const baseGeo = new THREE.CylinderGeometry(CS * 0.4, CS * 0.45, 0.5, 8);
    const base = new THREE.Mesh(baseGeo, this._getMat(0x666666));
    base.position.y = 0.25;
    base.castShadow = true;
    group.add(base);

    if (def.id === "catapult") {
      // Catapult: wooden frame with arm
      const frameGeo = new THREE.BoxGeometry(1.8, 1.5, 2.5);
      const frame = new THREE.Mesh(frameGeo, this._getMat(def.color));
      frame.position.y = 1.25;
      frame.castShadow = true;
      group.add(frame);

      const armGeo = new THREE.BoxGeometry(0.2, 0.2, 3);
      const arm = new THREE.Mesh(armGeo, this._getMat(0x8b6914));
      arm.position.set(0, 2.2, 0.5);
      arm.rotation.x = -0.3;
      arm.castShadow = true;
      group.add(arm);

      const bucketGeo = new THREE.BoxGeometry(0.6, 0.4, 0.6);
      const bucket = new THREE.Mesh(bucketGeo, this._getMat(0x555555));
      bucket.position.set(0, 2.5, 2);
      group.add(bucket);
    } else if (def.id === "ballista") {
      // Ballista: wooden frame with horizontal bow
      const frameGeo = new THREE.BoxGeometry(2, 1, 1.5);
      const frame = new THREE.Mesh(frameGeo, this._getMat(def.color));
      frame.position.y = 1;
      frame.castShadow = true;
      group.add(frame);

      const bowGeo = new THREE.TorusGeometry(1.2, 0.08, 4, 12, Math.PI);
      const bow = new THREE.Mesh(bowGeo, this._getMat(0x8b6914));
      bow.position.set(0, 1.8, 0);
      bow.rotation.z = Math.PI / 2;
      group.add(bow);

      const boltGeo = new THREE.CylinderGeometry(0.04, 0.04, 2, 4);
      const bolt = new THREE.Mesh(boltGeo, this._getMat(0xcccccc));
      bolt.position.set(0, 1.8, 0.5);
      bolt.rotation.x = Math.PI / 2;
      group.add(bolt);
    } else {
      // Tower structure (archer, mage, flame)
      const towerGeo = new THREE.CylinderGeometry(CS * 0.25, CS * 0.35, def.height, 8);
      const towerMesh = new THREE.Mesh(towerGeo, this._getMat(def.color));
      towerMesh.position.y = def.height / 2 + 0.5;
      towerMesh.castShadow = true;
      group.add(towerMesh);

      // Top platform
      const topGeo = new THREE.CylinderGeometry(CS * 0.35, CS * 0.3, 0.4, 8);
      const top = new THREE.Mesh(topGeo, this._getMat(def.color));
      top.position.y = def.height + 0.7;
      top.castShadow = true;
      group.add(top);

      // Crenellations
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const merlonGeo = new THREE.BoxGeometry(0.3, 0.5, 0.3);
        const merlon = new THREE.Mesh(merlonGeo, this._getMat(def.color));
        merlon.position.set(
          Math.cos(angle) * CS * 0.32,
          def.height + 1.15,
          Math.sin(angle) * CS * 0.32,
        );
        group.add(merlon);
      }

      if (def.id === "mage") {
        // Glowing crystal on top
        const crystalGeo = new THREE.OctahedronGeometry(0.4, 0);
        const crystalMat = new THREE.MeshStandardMaterial({
          color: 0xaa66ff,
          emissive: 0x6633aa,
          emissiveIntensity: 0.8,
          roughness: 0.2,
          metalness: 0.5,
        });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.y = def.height + 1.8;
        group.add(crystal);
      }

      if (def.id === "flame") {
        // Flame bowl on top
        const bowlGeo = new THREE.CylinderGeometry(0.5, 0.3, 0.4, 8, 1, true);
        const bowl = new THREE.Mesh(bowlGeo, this._getMat(0x333333));
        bowl.position.y = def.height + 1.1;
        group.add(bowl);

        // Flame glow
        const flameGeo = new THREE.SphereGeometry(0.35, 6, 6);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.7 });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.y = def.height + 1.5;
        group.add(flame);
      }
    }

    // Upgrade glow ring (visible at level 2+)
    if (tower.level > 1) {
      const ringGeo = new THREE.RingGeometry(CS * 0.35, CS * 0.45, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const glowColors = [0, 0x44aaff, 0x44ff44, 0xffaa00, 0xff4444, 0xffd700];
      const glowColor = glowColors[Math.min(tower.level, glowColors.length - 1)];
      const ringMat = new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0.4 + tower.level * 0.08,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.1;
      group.add(ring);
    }

    group.position.set(tower.x, tower.y, tower.z);
    return group;
  }

  // -----------------------------------------------------------------------
  // Enemies
  // -----------------------------------------------------------------------

  private _updateEnemies(state: RampartState): void {
    const aliveIds = new Set<number>();
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      aliveIds.add(enemy.id);

      let group = this._enemyMeshes.get(enemy.id);
      if (!group) {
        group = this._buildEnemyMesh(enemy);
        this._enemyGroup.add(group);
        this._enemyMeshes.set(enemy.id, group);
      }

      group.position.set(enemy.x, enemy.y, enemy.z);

      // Face movement direction
      if (enemy.pathIndex < state.path.length) {
        const target = state.path[enemy.pathIndex];
        const angle = Math.atan2(target.x - enemy.x, target.z - enemy.z);
        group.rotation.y = angle;
      }

      // Bobbing animation
      group.position.y += Math.sin(this._time * 3 + enemy.id) * 0.1;

      // Update HP bar — billboard toward camera
      const hpBar = this._hpBars.get(enemy.id);
      if (hpBar) {
        const ratio = enemy.hp / enemy.maxHp;
        hpBar.scale.x = Math.max(0.01, ratio);
        (hpBar.material as THREE.MeshBasicMaterial).color.setHex(
          ratio > 0.6 ? 0x44ff44 : ratio > 0.3 ? 0xffaa00 : 0xff4444,
        );
        // Billboard: make HP bar face camera
        hpBar.lookAt(this._camera.position);
        // Also billboard the background bar (sibling)
        const parent = hpBar.parent;
        if (parent) {
          const lastChild = parent.children[parent.children.length - 1];
          if (lastChild !== hpBar && lastChild instanceof THREE.Mesh) {
            lastChild.lookAt(this._camera.position);
          }
        }
      }

      // Slow visual — tint blue
      if (enemy.slowTimer > 0) {
        group.children[0]?.traverse(c => {
          if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
            c.material.emissive.setHex(0x2244aa);
            c.material.emissiveIntensity = 0.4;
          }
        });
      } else {
        group.children[0]?.traverse(c => {
          if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
            c.material.emissiveIntensity = 0;
          }
        });
      }
    }

    // Remove dead enemy meshes
    for (const [id, mesh] of this._enemyMeshes) {
      if (!aliveIds.has(id)) {
        this._enemyGroup.remove(mesh);
        this._enemyMeshes.delete(id);
        this._hpBars.delete(id);
      }
    }
  }

  private _buildEnemyMesh(enemy: RampartEnemy): THREE.Group {
    const group = new THREE.Group();
    const s = enemy.def.scale;
    const color = enemy.def.color;

    if (enemy.def.id === "ram") {
      // Battering ram — long wooden frame
      const bodyGeo = new THREE.BoxGeometry(1.2 * s, 1 * s, 2.5 * s);
      const body = new THREE.Mesh(bodyGeo, this._getMat(color));
      body.position.y = 0.8 * s;
      body.castShadow = true;
      group.add(body);

      const ramGeo = new THREE.CylinderGeometry(0.15 * s, 0.15 * s, 3 * s, 6);
      const ram = new THREE.Mesh(ramGeo, this._getMat(0x444444));
      ram.rotation.x = Math.PI / 2;
      ram.position.set(0, 0.8 * s, 1.8 * s);
      group.add(ram);

      // Wheels
      for (const ox of [-0.7, 0.7]) {
        for (const oz of [-0.8, 0.8]) {
          const wheelGeo = new THREE.CylinderGeometry(0.3 * s, 0.3 * s, 0.15 * s, 8);
          const wheel = new THREE.Mesh(wheelGeo, this._getMat(0x333333));
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(ox * s, 0.3 * s, oz * s);
          group.add(wheel);
        }
      }
    } else if (enemy.def.id === "cavalry") {
      // Horse + rider
      const horseGeo = new THREE.BoxGeometry(0.8 * s, 0.7 * s, 1.6 * s);
      const horse = new THREE.Mesh(horseGeo, this._getMat(0x664422));
      horse.position.y = 0.8 * s;
      horse.castShadow = true;
      group.add(horse);

      const riderGeo = new THREE.BoxGeometry(0.5 * s, 0.7 * s, 0.5 * s);
      const rider = new THREE.Mesh(riderGeo, this._getMat(color));
      rider.position.set(0, 1.5 * s, 0);
      rider.castShadow = true;
      group.add(rider);

      // Legs
      for (const ox of [-0.3, 0.3]) {
        for (const oz of [-0.5, 0.5]) {
          const legGeo = new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 0.6 * s, 4);
          const leg = new THREE.Mesh(legGeo, this._getMat(0x664422));
          leg.position.set(ox * s, 0.3 * s, oz * s);
          group.add(leg);
        }
      }
    } else if (enemy.def.id === "giant") {
      // Giant — large humanoid
      const bodyGeo = new THREE.BoxGeometry(1.2 * s, 2 * s, 0.8 * s);
      const body = new THREE.Mesh(bodyGeo, this._getMat(color));
      body.position.y = 2.5 * s;
      body.castShadow = true;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(0.5 * s, 6, 6);
      const head = new THREE.Mesh(headGeo, this._getMat(0x886655));
      head.position.y = 4 * s;
      head.castShadow = true;
      group.add(head);

      // Arms
      for (const ox of [-0.9, 0.9]) {
        const armGeo = new THREE.CylinderGeometry(0.15 * s, 0.12 * s, 1.5 * s, 4);
        const arm = new THREE.Mesh(armGeo, this._getMat(color));
        arm.position.set(ox * s, 2 * s, 0);
        group.add(arm);
      }

      // Legs
      for (const ox of [-0.35, 0.35]) {
        const legGeo = new THREE.CylinderGeometry(0.2 * s, 0.18 * s, 1.5 * s, 4);
        const leg = new THREE.Mesh(legGeo, this._getMat(color));
        leg.position.set(ox * s, 0.75 * s, 0);
        group.add(leg);
      }
    } else if (enemy.def.id === "darkMage") {
      // Dark mage — robed figure with glowing orb
      const bodyGeo = new THREE.ConeGeometry(0.4 * s, 1.5 * s, 6);
      const body = new THREE.Mesh(bodyGeo, this._getMat(color));
      body.position.y = 0.75 * s;
      body.castShadow = true;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(0.22 * s, 6, 6);
      const head = new THREE.Mesh(headGeo, this._getMat(0x665588));
      head.position.y = 1.7 * s;
      group.add(head);

      // Glowing orb
      const orbGeo = new THREE.SphereGeometry(0.15 * s, 8, 8);
      const orbMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.8 });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(0.5 * s, 1.3 * s, 0.3 * s);
      group.add(orb);
    } else {
      // Default humanoid (peasant, soldier, knight)
      const bodyGeo = new THREE.BoxGeometry(0.5 * s, 0.8 * s, 0.3 * s);
      const body = new THREE.Mesh(bodyGeo, this._getMat(color));
      body.position.y = 1.1 * s;
      body.castShadow = true;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(0.18 * s, 6, 6);
      const head = new THREE.Mesh(headGeo, this._getMat(0xddbb99));
      head.position.y = 1.7 * s;
      head.castShadow = true;
      group.add(head);

      // Legs
      for (const ox of [-0.12, 0.12]) {
        const legGeo = new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 0.5 * s, 4);
        const leg = new THREE.Mesh(legGeo, this._getMat(0x554433));
        leg.position.set(ox * s, 0.45 * s, 0);
        group.add(leg);
      }

      // Shield for knights
      if (enemy.def.id === "knight") {
        const shieldGeo = new THREE.BoxGeometry(0.05 * s, 0.5 * s, 0.4 * s);
        const shield = new THREE.Mesh(shieldGeo, this._getMat(0xaaaaaa));
        shield.position.set(-0.35 * s, 1.1 * s, 0);
        group.add(shield);

        // Helmet
        const helmetGeo = new THREE.CylinderGeometry(0.2 * s, 0.2 * s, 0.25 * s, 6);
        const helmet = new THREE.Mesh(helmetGeo, this._getMat(0xcccccc));
        helmet.position.y = 1.85 * s;
        group.add(helmet);
      }

      // Weapon — sword or pitchfork
      const weapGeo = new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 0.8 * s, 4);
      const weap = new THREE.Mesh(weapGeo, this._getMat(enemy.def.id === "peasant" ? 0x8b6914 : 0xaaaaaa));
      weap.position.set(0.35 * s, 1.2 * s, 0);
      weap.rotation.z = -0.3;
      group.add(weap);
    }

    // HP bar
    const hpGeo = new THREE.PlaneGeometry(1.2, 0.12);
    const hpMat = new THREE.MeshBasicMaterial({ color: 0x44ff44, side: THREE.DoubleSide });
    const hpBar = new THREE.Mesh(hpGeo, hpMat);
    const topY = enemy.def.id === "giant" ? 5 * enemy.def.scale : 2.2 * enemy.def.scale;
    hpBar.position.y = topY;
    hpBar.rotation.x = 0; // Will face camera via lookAt later
    group.add(hpBar);
    this._hpBars.set(enemy.id, hpBar);

    // HP bar background
    const bgGeo = new THREE.PlaneGeometry(1.3, 0.16);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.position.y = topY;
    bg.position.z = -0.01;
    group.add(bg);

    return group;
  }

  // -----------------------------------------------------------------------
  // Projectiles
  // -----------------------------------------------------------------------

  private _updateProjectiles(state: RampartState): void {
    // Clear old projectile meshes
    while (this._projectileGroup.children.length > 0) {
      this._projectileGroup.remove(this._projectileGroup.children[0]);
    }

    for (const proj of state.projectiles) {
      if (!proj.alive) continue;

      let mesh: THREE.Mesh;
      if (proj.splash > 0) {
        // Boulder
        const geo = new THREE.SphereGeometry(0.35, 6, 6);
        mesh = new THREE.Mesh(geo, this._getMat(proj.color));
      } else {
        // Arrow / bolt
        const geo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 4);
        mesh = new THREE.Mesh(geo, this._getMat(proj.color));
        // Orient towards target
        const dx = proj.tx - proj.x;
        const dy = proj.ty - proj.y;
        const dz = proj.tz - proj.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > 0) {
          mesh.lookAt(proj.tx, proj.ty, proj.tz);
          mesh.rotateX(Math.PI / 2);
        }
      }

      mesh.position.set(proj.x, proj.y, proj.z);
      this._projectileGroup.add(mesh);
    }
  }

  // -----------------------------------------------------------------------
  // Particles
  // -----------------------------------------------------------------------

  private _updateParticles(state: RampartState): void {
    while (this._particleGroup.children.length > 0) {
      this._particleGroup.remove(this._particleGroup.children[0]);
    }

    for (const p of state.particles) {
      const alpha = p.life / p.maxLife;
      const geo = new THREE.SphereGeometry(p.size * alpha, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: p.color,
        transparent: true,
        opacity: alpha,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x, p.y, p.z);
      this._particleGroup.add(mesh);
    }
  }

  // -----------------------------------------------------------------------
  // Explosions (AoE rings)
  // -----------------------------------------------------------------------

  private _updateExplosions(state: RampartState): void {
    // Remove old
    while (this._explosionGroup.children.length > 0) {
      this._explosionGroup.remove(this._explosionGroup.children[0]);
    }

    for (const exp of state.explosions) {
      const t = 1 - exp.life / exp.maxLife; // 0→1 as it expands
      const alpha = exp.life / exp.maxLife;

      // Expanding ring
      const innerR = exp.radius * t * 0.6;
      const outerR = exp.radius * (t * 0.8 + 0.2);
      const geo = new THREE.RingGeometry(innerR, outerR, 24);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        color: exp.color,
        transparent: true,
        opacity: alpha * 0.5,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.position.set(exp.x, exp.y + 0.15, exp.z);
      this._explosionGroup.add(ring);

      // Inner flash (bright center)
      if (t < 0.3) {
        const flashGeo = new THREE.CircleGeometry(exp.radius * 0.3 * (1 - t / 0.3), 12);
        flashGeo.rotateX(-Math.PI / 2);
        const flashMat = new THREE.MeshBasicMaterial({
          color: 0xffffaa,
          transparent: true,
          opacity: (1 - t / 0.3) * 0.7,
        });
        const flash = new THREE.Mesh(flashGeo, flashMat);
        flash.position.set(exp.x, exp.y + 0.2, exp.z);
        this._explosionGroup.add(flash);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Castle damage visual
  // -----------------------------------------------------------------------

  private _castleDamageFlash = 0;

  private _updateCastleDamage(state: RampartState, dt: number): void {
    const ratio = state.castleHp / state.castleMaxHp;

    // Darken + redden castle materials as HP drops
    this._castleGroup.traverse(c => {
      if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
        const mat = c.material;
        // Skip gate and flag materials
        if (mat.color.getHex() === 0x3a2a1a || mat.color.getHex() === 0xcc2222) return;
        // Blend towards damaged reddish-brown based on HP ratio
        const damageIntensity = (1 - ratio) * 0.3;
        mat.emissive.setRGB(damageIntensity * 0.8, damageIntensity * 0.1, 0);
        mat.emissiveIntensity = this._castleDamageFlash > 0 ? 0.6 : damageIntensity;
      }
    });

    // Flash on recent damage
    if (state.audioCastleDamage) {
      this._castleDamageFlash = 0.2;
    }
    if (this._castleDamageFlash > 0) {
      this._castleDamageFlash -= dt;
      this._castleGroup.traverse(c => {
        if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
          if (c.material.color.getHex() !== 0x3a2a1a && c.material.color.getHex() !== 0xcc2222) {
            c.material.emissive.setHex(0xff2200);
            c.material.emissiveIntensity = 0.5 * (this._castleDamageFlash / 0.2);
          }
        }
      });
    }
  }

  // -----------------------------------------------------------------------
  // Raycasting for mouse → grid cell
  // -----------------------------------------------------------------------

  raycastGrid(mouseX: number, mouseY: number, sw: number, sh: number): { col: number; row: number } | null {
    const ndc = new THREE.Vector2(
      (mouseX / sw) * 2 - 1,
      -(mouseY / sh) * 2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this._camera);

    // Intersect with a horizontal plane at average terrain height
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -getTerrainHeight(Math.floor(RAMPART.GRID_ROWS / 2)));
    const intersection = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersection)) {
      const col = Math.floor(intersection.x / CS);
      const row = Math.floor(intersection.z / CS);
      if (col >= 0 && col < RAMPART.GRID_COLS && row >= 0 && row < RAMPART.GRID_ROWS) {
        return { col, row };
      }
    }
    return null;
  }

  projectToScreen(x: number, y: number, z: number, sw: number, sh: number): { x: number; y: number; visible: boolean } {
    const vec = new THREE.Vector3(x, y, z);
    vec.project(this._camera);
    const behind = vec.z > 1;
    return {
      x: (vec.x * 0.5 + 0.5) * sw,
      y: (-vec.y * 0.5 + 0.5) * sh,
      visible: !behind && vec.x >= -1 && vec.x <= 1 && vec.y >= -1 && vec.y <= 1,
    };
  }

  resize(sw: number, sh: number): void {
    this._camera.aspect = sw / sh;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(sw, sh);
  }

  cleanup(): void {
    this._renderer.dispose();
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this._scene.clear();
    this._matCache.clear();
    this._towerMeshes.clear();
    this._towerLevels.clear();
    this._enemyMeshes.clear();
    this._hpBars.clear();
  }
}
