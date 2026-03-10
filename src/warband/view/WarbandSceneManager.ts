// ---------------------------------------------------------------------------
// Warband mode – Three.js scene manager
// Creates and manages the 3D rendering context, separate from PixiJS.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { WB } from "../config/WarbandBalanceConfig";

// ---- Seeded random for deterministic placement ----------------------------

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---- Terrain height function (shared with physics later) ------------------

/** Get terrain height at world coordinates (x, z). */
export function getTerrainHeight(x: number, z: number): number {
  return (
    Math.sin(x * 0.1) * 0.3 +
    Math.cos(z * 0.08) * 0.2 +
    Math.sin(x * 0.05 + z * 0.05) * 0.5
  );
}


export class WarbandSceneManager {
  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  canvas!: HTMLCanvasElement;

  // Lighting
  private _sunLight!: THREE.DirectionalLight;
  private _ambientLight!: THREE.AmbientLight;
  private _hemiLight!: THREE.HemisphereLight;

  // Ground
  private _ground!: THREE.Mesh;

  private _width = 0;
  private _height = 0;

  init(): void {
    this._width = window.innerWidth;
    this._height = window.innerHeight;

    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.id = "warband-canvas";
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.zIndex = "10";

    const container = document.getElementById("pixi-container");
    if (container) {
      container.appendChild(this.canvas);
    }

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(this._width, this._height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 60, 120);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      65,
      this._width / this._height,
      0.1,
      200,
    );
    this.camera.position.set(0, WB.THIRD_PERSON_HEIGHT, WB.THIRD_PERSON_DIST);

    // Lighting
    this._setupLighting();

    // Ground
    this._setupGround();

    // Handle resize
    window.addEventListener("resize", this._onResize);
  }

  private _setupLighting(): void {
    this._ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(this._ambientLight);

    this._hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.5);
    this.scene.add(this._hemiLight);

    this._sunLight = new THREE.DirectionalLight(0xfff4e0, 1.5);
    this._sunLight.position.set(30, 50, 20);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.width = 2048;
    this._sunLight.shadow.mapSize.height = 2048;
    this._sunLight.shadow.camera.near = 0.5;
    this._sunLight.shadow.camera.far = 150;
    this._sunLight.shadow.camera.left = -50;
    this._sunLight.shadow.camera.right = 50;
    this._sunLight.shadow.camera.top = 50;
    this._sunLight.shadow.camera.bottom = -50;
    this._sunLight.shadow.bias = -0.001;
    this.scene.add(this._sunLight);
  }

  private _setupGround(): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    // Main grass plane with terrain variation
    const groundGeo = new THREE.PlaneGeometry(
      WB.ARENA_WIDTH * 1.5,
      WB.ARENA_DEPTH * 1.5,
      96,
      96,
    );
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      // PlaneGeometry is on XY; after rotation X stays X, Y becomes Z
      posAttr.setZ(i, getTerrainHeight(x, y));
    }
    groundGeo.computeVertexNormals();

    // Vertex-colored ground for natural look
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x4a7c3f,
      roughness: 0.92,
      metalness: 0.0,
    });

    this._ground = new THREE.Mesh(groundGeo, groundMat);
    this._ground.rotation.x = -Math.PI / 2;
    this._ground.receiveShadow = true;
    this.scene.add(this._ground);

    // Dirt patches for variety
    const rng = seededRandom(42);
    const dirtGeo = new THREE.CircleGeometry(1, 8);
    const dirtMat = new THREE.MeshStandardMaterial({
      color: 0x8a7a5a,
      roughness: 0.95,
    });
    for (let i = 0; i < 15; i++) {
      const dx = (rng() - 0.5) * halfW * 1.6;
      const dz = (rng() - 0.5) * halfD * 1.6;
      const dirt = new THREE.Mesh(dirtGeo, dirtMat);
      dirt.rotation.x = -Math.PI / 2;
      dirt.position.set(dx, getTerrainHeight(dx, dz) + 0.01, dz);
      dirt.scale.set(0.8 + rng() * 1.5, 0.8 + rng() * 1.5, 1);
      dirt.receiveShadow = true;
      this.scene.add(dirt);
    }

    // Arena boundary markers
    const postGeo = new THREE.CylinderGeometry(0.12, 0.18, 2.2, 6);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.85,
    });
    const corners = [
      [-halfW, halfD],
      [halfW, halfD],
      [halfW, -halfD],
      [-halfW, -halfD],
    ];
    for (const [cx, cz] of corners) {
      const h = getTerrainHeight(cx, cz);
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(cx, h + 1.1, cz);
      post.castShadow = true;
      this.scene.add(post);
    }

    // Environment details
    this._addRocks(rng);
    this._addGrassTufts(rng);
    this._addTrees(rng);
    this._addBushes(rng);
    this._addFlowers(rng);
  }

  // ---- Rocks: varied shapes, partially embedded, some with moss -----------

  private _addRocks(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    // Several rock material variations
    const rockMats = [
      new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.95, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0x8a8a7e, roughness: 0.92, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0x6b6b60, roughness: 0.97, metalness: 0.03 }),
    ];
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x4a6b3a, roughness: 1.0 });

    for (let i = 0; i < 25; i++) {
      const x = (rng() - 0.5) * halfW * 1.8;
      const z = (rng() - 0.5) * halfD * 1.8;
      const h = getTerrainHeight(x, z);
      const mat = rockMats[Math.floor(rng() * rockMats.length)];

      const group = new THREE.Group();

      // Main rock body (deformed icosahedron)
      const detail = rng() < 0.3 ? 1 : 0;
      const rockGeo = new THREE.IcosahedronGeometry(0.3 + rng() * 0.4, detail);
      // Deform vertices for organic look
      const rPos = rockGeo.attributes.position;
      for (let v = 0; v < rPos.count; v++) {
        const vx = rPos.getX(v);
        const vy = rPos.getY(v);
        const vz = rPos.getZ(v);
        const noise = 0.8 + rng() * 0.4;
        rPos.setXYZ(v, vx * noise, vy * noise * 0.7, vz * noise);
      }
      rockGeo.computeVertexNormals();

      const rock = new THREE.Mesh(rockGeo, mat);
      rock.castShadow = true;
      rock.receiveShadow = true;
      group.add(rock);

      // Moss patch on top of some rocks
      if (rng() < 0.4) {
        const mossGeo = new THREE.SphereGeometry(0.15 + rng() * 0.15, 5, 3, 0, Math.PI * 2, 0, Math.PI * 0.4);
        const moss = new THREE.Mesh(mossGeo, mossMat);
        moss.position.y = 0.15 + rng() * 0.1;
        moss.scale.set(1.2, 0.3, 1.2);
        group.add(moss);
      }

      // Embed partially into ground
      const embedDepth = rng() * 0.15;
      group.position.set(x, h - embedDepth, z);
      group.rotation.set(rng() * 0.4, rng() * Math.PI * 2, rng() * 0.3);
      group.scale.set(
        0.4 + rng() * 0.9,
        0.3 + rng() * 0.6,
        0.4 + rng() * 0.9,
      );

      this.scene.add(group);
    }
  }

  // ---- Grass tufts: varied height, clustered -----------------------

  private _addGrassTufts(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    const grassColors = [0x3a6b2f, 0x4a7a3a, 0x2f5e24, 0x558844];

    for (let i = 0; i < 100; i++) {
      const cx = (rng() - 0.5) * halfW * 1.8;
      const cz = (rng() - 0.5) * halfD * 1.8;
      const h = getTerrainHeight(cx, cz);
      const color = grassColors[Math.floor(rng() * grassColors.length)];
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 1.0 });

      // Cluster of 2-4 blades
      const bladeCount = 2 + Math.floor(rng() * 3);
      for (let b = 0; b < bladeCount; b++) {
        const bx = cx + (rng() - 0.5) * 0.3;
        const bz = cz + (rng() - 0.5) * 0.3;
        const bladeH = 0.15 + rng() * 0.3;

        // Thin cone for each blade
        const bladeGeo = new THREE.ConeGeometry(0.03 + rng() * 0.04, bladeH, 3);
        const blade = new THREE.Mesh(bladeGeo, mat);
        blade.position.set(bx, h + bladeH / 2, bz);
        // Slight lean
        blade.rotation.x = (rng() - 0.5) * 0.3;
        blade.rotation.z = (rng() - 0.5) * 0.3;
        this.scene.add(blade);
      }
    }
  }

  // ---- Trees: trunk with roots, layered canopy, bark texture --------

  private _addTrees(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;

    for (let i = 0; i < 35; i++) {
      const angle = (i / 35) * Math.PI * 2 + (rng() - 0.5) * 0.3;
      const radius = halfW * 0.92 + rng() * 8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const h = getTerrainHeight(x, z);

      const treeGroup = new THREE.Group();
      const treeHeight = 2.5 + rng() * 2.5;
      const trunkRadius = 0.12 + rng() * 0.15;

      // ---- Trunk: tapered cylinder with slight bend ----
      const trunkColor = 0x4a3520 + Math.floor(rng() * 0x151510);
      const trunkMat = new THREE.MeshStandardMaterial({
        color: trunkColor,
        roughness: 0.95,
      });

      const trunkGeo = new THREE.CylinderGeometry(
        trunkRadius * 0.5,  // top (thinner)
        trunkRadius,         // bottom
        treeHeight, 7,
      );
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = treeHeight / 2;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      treeGroup.add(trunk);

      // ---- Visible roots flaring at base ----
      const rootCount = 3 + Math.floor(rng() * 3);
      for (let r = 0; r < rootCount; r++) {
        const rootAngle = (r / rootCount) * Math.PI * 2 + rng() * 0.5;
        const rootLen = 0.4 + rng() * 0.5;
        const rootGeo = new THREE.CylinderGeometry(0.02, trunkRadius * 0.35, rootLen, 4);
        const root = new THREE.Mesh(rootGeo, trunkMat);
        root.position.set(
          Math.cos(rootAngle) * rootLen * 0.4,
          0.05,
          Math.sin(rootAngle) * rootLen * 0.4,
        );
        root.rotation.z = Math.cos(rootAngle) * 1.2;
        root.rotation.x = Math.sin(rootAngle) * 1.2;
        treeGroup.add(root);
      }

      // ---- Canopy: layered spheres for depth ----
      const canopyBaseY = treeHeight * 0.65;
      const leafVariants = [0x2d5a1e, 0x3a6b28, 0x24501a, 0x3e7530];
      const leafColor = leafVariants[Math.floor(rng() * leafVariants.length)];
      const leavesMat = new THREE.MeshStandardMaterial({
        color: leafColor,
        roughness: 0.85,
        side: THREE.DoubleSide,
      });

      // Main canopy (large sphere)
      const mainRadius = 1.0 + rng() * 0.8;
      const mainGeo = new THREE.IcosahedronGeometry(mainRadius, 1);
      // Slightly deform for organic shape
      const mPos = mainGeo.attributes.position;
      for (let v = 0; v < mPos.count; v++) {
        const vx = mPos.getX(v);
        const vy = mPos.getY(v);
        const vz = mPos.getZ(v);
        const n = 0.85 + rng() * 0.3;
        mPos.setXYZ(v, vx * n, vy * n * 0.8, vz * n);
      }
      mainGeo.computeVertexNormals();
      const mainLeaves = new THREE.Mesh(mainGeo, leavesMat);
      mainLeaves.position.y = canopyBaseY + mainRadius * 0.6;
      mainLeaves.castShadow = true;
      treeGroup.add(mainLeaves);

      // Secondary canopy clusters (2-3 smaller spheres offset)
      const clusterCount = 1 + Math.floor(rng() * 3);
      for (let c = 0; c < clusterCount; c++) {
        const cAngle = rng() * Math.PI * 2;
        const cDist = mainRadius * (0.4 + rng() * 0.4);
        const cR = mainRadius * (0.4 + rng() * 0.3);
        const cGeo = new THREE.IcosahedronGeometry(cR, 0);
        const clusterLeaf = new THREE.Mesh(cGeo, leavesMat);
        clusterLeaf.position.set(
          Math.cos(cAngle) * cDist,
          canopyBaseY + mainRadius * 0.5 + (rng() - 0.3) * mainRadius * 0.5,
          Math.sin(cAngle) * cDist,
        );
        clusterLeaf.castShadow = true;
        treeGroup.add(clusterLeaf);
      }

      // ---- Branches visible below canopy ----
      const branchCount = 2 + Math.floor(rng() * 2);
      const branchMat = trunkMat;
      for (let br = 0; br < branchCount; br++) {
        const bAngle = rng() * Math.PI * 2;
        const bLen = 0.5 + rng() * 0.8;
        const bGeo = new THREE.CylinderGeometry(0.02, trunkRadius * 0.25, bLen, 4);
        const branch = new THREE.Mesh(bGeo, branchMat);
        const bY = canopyBaseY * (0.6 + rng() * 0.3);
        branch.position.set(
          Math.cos(bAngle) * bLen * 0.3,
          bY,
          Math.sin(bAngle) * bLen * 0.3,
        );
        branch.rotation.z = Math.cos(bAngle) * 0.8;
        branch.rotation.x = Math.sin(bAngle) * 0.8;
        branch.castShadow = true;
        treeGroup.add(branch);
      }

      treeGroup.position.set(x, h, z);
      // Slight random lean
      treeGroup.rotation.x = (rng() - 0.5) * 0.05;
      treeGroup.rotation.z = (rng() - 0.5) * 0.05;
      this.scene.add(treeGroup);
    }
  }

  // ---- Bushes: low, rounded foliage clumps --------------------------

  private _addBushes(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    const bushColors = [0x3a6b2f, 0x2f5e24, 0x4a7a3a];

    for (let i = 0; i < 30; i++) {
      const x = (rng() - 0.5) * halfW * 1.9;
      const z = (rng() - 0.5) * halfD * 1.9;
      const h = getTerrainHeight(x, z);
      const color = bushColors[Math.floor(rng() * bushColors.length)];
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });

      const bushGroup = new THREE.Group();
      const lobeCount = 2 + Math.floor(rng() * 3);
      const bushR = 0.3 + rng() * 0.4;

      for (let l = 0; l < lobeCount; l++) {
        const angle = (l / lobeCount) * Math.PI * 2 + rng() * 0.5;
        const dist = bushR * 0.4 * rng();
        const lobeR = bushR * (0.5 + rng() * 0.5);
        const geo = new THREE.SphereGeometry(lobeR, 6, 4);
        const lobe = new THREE.Mesh(geo, mat);
        lobe.position.set(
          Math.cos(angle) * dist,
          lobeR * 0.6,
          Math.sin(angle) * dist,
        );
        lobe.scale.set(1, 0.6 + rng() * 0.3, 1);
        lobe.castShadow = true;
        bushGroup.add(lobe);
      }

      bushGroup.position.set(x, h, z);
      this.scene.add(bushGroup);
    }
  }

  // ---- Flowers: small colored dots in clusters ----------------------

  private _addFlowers(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    const flowerColors = [0xdddd44, 0xdd8844, 0xcc44aa, 0xeeeedd, 0x8888dd];

    for (let i = 0; i < 20; i++) {
      const cx = (rng() - 0.5) * halfW * 1.4;
      const cz = (rng() - 0.5) * halfD * 1.4;
      const color = flowerColors[Math.floor(rng() * flowerColors.length)];
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.9 });

      // Cluster of 3-6 flowers
      const count = 3 + Math.floor(rng() * 4);
      for (let f = 0; f < count; f++) {
        const fx = cx + (rng() - 0.5) * 1.5;
        const fz = cz + (rng() - 0.5) * 1.5;
        const fh = getTerrainHeight(fx, fz);
        const stemH = 0.1 + rng() * 0.2;

        // Stem
        const stemGeo = new THREE.CylinderGeometry(0.006, 0.008, stemH, 3);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(fx, fh + stemH / 2, fz);
        this.scene.add(stem);

        // Flower head
        const petalGeo = new THREE.SphereGeometry(0.025 + rng() * 0.02, 5, 3);
        const petal = new THREE.Mesh(petalGeo, mat);
        petal.position.set(fx, fh + stemH + 0.02, fz);
        this.scene.add(petal);
      }
    }
  }

  /** Build a siege castle environment */
  buildSiegeArena(): void {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x888877,
      roughness: 0.95,
      metalness: 0.05,
    });

    // Castle wall
    const wallGeo = new THREE.BoxGeometry(40, 8, 2);
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 4, -15);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);

    // Towers at wall ends
    const towerGeo = new THREE.CylinderGeometry(2, 2.2, 12, 8);
    for (const xPos of [-20, 20]) {
      const tower = new THREE.Mesh(towerGeo, wallMat);
      tower.position.set(xPos, 6, -15);
      tower.castShadow = true;
      tower.receiveShadow = true;
      this.scene.add(tower);

      const topGeo = new THREE.CylinderGeometry(2.4, 2.4, 1, 8);
      const top = new THREE.Mesh(topGeo, wallMat);
      top.position.set(xPos, 12.5, -15);
      top.castShadow = true;
      this.scene.add(top);
    }

    // Gate
    const gateGeo = new THREE.BoxGeometry(4, 5, 2.5);
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.9,
    });
    const gate = new THREE.Mesh(gateGeo, gateMat);
    gate.position.set(0, 2.5, -15);
    this.scene.add(gate);

    // Crenellations
    const crenGeo = new THREE.BoxGeometry(1.5, 1.5, 0.5);
    for (let x = -18; x <= 18; x += 3) {
      const cren = new THREE.Mesh(crenGeo, wallMat);
      cren.position.set(x, 8.75, -14);
      cren.castShadow = true;
      this.scene.add(cren);
    }

    // Courtyard
    const courtGeo = new THREE.PlaneGeometry(30, 20);
    const courtMat = new THREE.MeshStandardMaterial({
      color: 0x9a8a6a,
      roughness: 0.95,
    });
    const court = new THREE.Mesh(courtGeo, courtMat);
    court.rotation.x = -Math.PI / 2;
    court.position.set(0, 0.02, -25);
    court.receiveShadow = true;
    this.scene.add(court);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private _onResize = (): void => {
    this._width = window.innerWidth;
    this._height = window.innerHeight;
    this.camera.aspect = this._width / this._height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this._width, this._height);
  };

  destroy(): void {
    window.removeEventListener("resize", this._onResize);

    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    this.renderer.dispose();
  }
}
