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
    this.renderer.toneMappingExposure = 1.15;

    // Scene — no flat background color; sky dome handles it
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7ab4d8);
    this.scene.fog = new THREE.FogExp2(0x9dc8e0, 0.012);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      65,
      this._width / this._height,
      0.1,
      300,
    );
    this.camera.position.set(0, WB.THIRD_PERSON_HEIGHT, WB.THIRD_PERSON_DIST);

    // Lighting
    this._setupLighting();

    // Sky dome
    this._addSkyDome();

    // Ground
    this._setupGround();

    // Handle resize
    window.addEventListener("resize", this._onResize);
  }

  private _setupLighting(): void {
    // Soft ambient — slightly cool blue-grey (overcast sky fill)
    this._ambientLight = new THREE.AmbientLight(0x8090a8, 0.65);
    this.scene.add(this._ambientLight);

    // Hemisphere — warm golden sky above, deep olive ground below
    this._hemiLight = new THREE.HemisphereLight(0xc8dff5, 0x3d5220, 1.0);
    this.scene.add(this._hemiLight);

    // Main sun — warm afternoon gold, angled from upper-right
    this._sunLight = new THREE.DirectionalLight(0xffecc0, 2.0);
    this._sunLight.position.set(40, 60, 25);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.width = 2048;
    this._sunLight.shadow.mapSize.height = 2048;
    this._sunLight.shadow.camera.near = 1;
    this._sunLight.shadow.camera.far = 200;
    this._sunLight.shadow.camera.left = -60;
    this._sunLight.shadow.camera.right = 60;
    this._sunLight.shadow.camera.top = 60;
    this._sunLight.shadow.camera.bottom = -60;
    this._sunLight.shadow.bias = -0.0005;
    this._sunLight.shadow.normalBias = 0.02;
    this.scene.add(this._sunLight);
    this.scene.add(this._sunLight.target);

    // Secondary fill — cool blue from opposite side (sky bounce)
    const fillLight = new THREE.DirectionalLight(0x8aaecc, 0.4);
    fillLight.position.set(-30, 20, -15);
    this.scene.add(fillLight);
  }

  // ---- Sky dome with gradient from deep blue top to hazy horizon ----------

  private _addSkyDome(): void {
    const skyGeo = new THREE.SphereGeometry(250, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);

    // Vertex-colored gradient: deep blue at top → pale blue-white at horizon
    const colors: number[] = [];
    const posAttr = skyGeo.attributes.position;
    const topColor = new THREE.Color(0x3a78c9);    // deep sky blue
    const midColor = new THREE.Color(0x7ab4d8);    // mid sky
    const horizColor = new THREE.Color(0xc8dde8);  // hazy horizon

    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      // Normalize y: sphere radius 250, top at 250, horizon at 0
      const t = Math.max(0, Math.min(1, y / 250));
      const col = new THREE.Color();
      if (t > 0.35) {
        col.lerpColors(midColor, topColor, (t - 0.35) / 0.65);
      } else {
        col.lerpColors(horizColor, midColor, t / 0.35);
      }
      colors.push(col.r, col.g, col.b);
    }

    skyGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));

    const skyMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);

    // Sun disc — bright glowing circle in the sky
    const sunGeo = new THREE.CircleGeometry(8, 12);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffae0, fog: false });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    // Position in same direction as sunLight
    sun.position.set(80, 120, 50).normalize().multiplyScalar(240);
    sun.lookAt(0, 0, 0);
    this.scene.add(sun);

    // Sun halo (slightly larger, transparent orange ring)
    const haloGeo = new THREE.RingGeometry(8, 18, 12);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffcc66,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      fog: false,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(sun.position);
    halo.lookAt(0, 0, 0);
    this.scene.add(halo);

    // Distant mountains / hills silhouette on the horizon
    this._addHorizonHills();
  }

  private _addHorizonHills(): void {
    const rng = seededRandom(99);
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x3a5c3a,
      roughness: 1.0,
      fog: true,
    });
    const hillMatFar = new THREE.MeshStandardMaterial({
      color: 0x5a7a8a,
      roughness: 1.0,
      fog: true,
    });

    // Two rings of hills at different distances
    for (let ring = 0; ring < 2; ring++) {
      const dist = 120 + ring * 60;
      const mat = ring === 0 ? hillMat : hillMatFar;
      const count = 14 + ring * 6;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + rng() * 0.25;
        const w = 20 + rng() * 30;
        const h = 6 + rng() * 12;
        const hillGeo = new THREE.SphereGeometry(1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.4);
        const hill = new THREE.Mesh(hillGeo, mat);
        hill.position.set(
          Math.cos(angle) * (dist + rng() * 20),
          -2 + rng() * 2,
          Math.sin(angle) * (dist + rng() * 20),
        );
        hill.scale.set(w, h, w * (0.6 + rng() * 0.5));
        hill.receiveShadow = false;
        this.scene.add(hill);
      }
    }
  }

  private _setupGround(): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    // Main grass plane with terrain variation
    const groundGeo = new THREE.PlaneGeometry(
      WB.ARENA_WIDTH * 2.0,
      WB.ARENA_DEPTH * 2.0,
      128,
      128,
    );
    const posAttr = groundGeo.attributes.position;

    // Vertex-color the ground for natural variation
    const gColors: number[] = [];
    const grassDark  = new THREE.Color(0x3a6230);
    const grassMid   = new THREE.Color(0x4e7d3c);
    const grassLight = new THREE.Color(0x5e9146);
    const dirtColor  = new THREE.Color(0x7a6a48);

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      posAttr.setZ(i, getTerrainHeight(x, y));

      // Mix grass shades based on position noise
      const n = (Math.sin(x * 0.3) * Math.cos(y * 0.25) + 1) * 0.5;
      const n2 = (Math.sin(x * 0.7 + y * 0.4) + 1) * 0.5;
      const col = new THREE.Color();
      col.lerpColors(grassDark, grassMid, n);
      col.lerpColors(col, grassLight, n2 * 0.4);
      // Occasional dirt tint
      const dirtT = Math.max(0, Math.sin(x * 0.15) * Math.cos(y * 0.18) - 0.5) * 0.4;
      col.lerpColors(col, dirtColor, dirtT);
      gColors.push(col.r, col.g, col.b);
    }
    groundGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(gColors), 3));
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.0,
    });

    this._ground = new THREE.Mesh(groundGeo, groundMat);
    this._ground.rotation.x = -Math.PI / 2;
    this._ground.receiveShadow = true;
    this.scene.add(this._ground);

    // Worn dirt path / arena centre scuff
    const rng = seededRandom(42);
    const dirtMat = new THREE.MeshStandardMaterial({
      color: 0x9a8a65,
      roughness: 0.98,
    });
    for (let i = 0; i < 18; i++) {
      const dx = (rng() - 0.5) * halfW * 1.4;
      const dz = (rng() - 0.5) * halfD * 1.4;
      const dirtGeo = new THREE.CircleGeometry(0.6 + rng() * 1.8, 7);
      const dirt = new THREE.Mesh(dirtGeo, dirtMat);
      dirt.rotation.x = -Math.PI / 2;
      dirt.position.set(dx, getTerrainHeight(dx, dz) + 0.01, dz);
      dirt.scale.set(1 + rng(), 1 + rng(), 1);
      dirt.receiveShadow = true;
      this.scene.add(dirt);
    }

    // Arena boundary posts with rope suggestion
    const postGeo = new THREE.CylinderGeometry(0.10, 0.16, 2.4, 7);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x7a3c10, roughness: 0.9 });
    const corners = [
      [-halfW, halfD], [halfW, halfD], [halfW, -halfD], [-halfW, -halfD],
    ];
    for (const [cx, cz] of corners) {
      const ph = getTerrainHeight(cx, cz);
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(cx, ph + 1.2, cz);
      post.castShadow = true;
      post.receiveShadow = true;
      this.scene.add(post);
      // Post top cap
      const capGeo = new THREE.ConeGeometry(0.12, 0.18, 7);
      const cap = new THREE.Mesh(capGeo, postMat);
      cap.position.set(cx, ph + 2.49, cz);
      this.scene.add(cap);
    }

    // Environment details
    this._addRocks(rng);
    this._addGrassTufts(rng);
    this._addTrees(rng);
    this._addBushes(rng);
    this._addFlowers(rng);
    this._addClouds(rng);
    this._addFallenLogs(rng);
    this._addMushrooms(rng);
    this._addPond(rng);
    this._addGroundLeaves(rng);
    this._addFenceRow(rng);
    this._addBirds(rng);
  }

  // ---- Rocks: varied shapes, partially embedded, moss and lichen ----------

  private _addRocks(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    const rockMats = [
      new THREE.MeshStandardMaterial({ color: 0x7a7a72, roughness: 0.96, metalness: 0.04 }),
      new THREE.MeshStandardMaterial({ color: 0x8e8e82, roughness: 0.93, metalness: 0.04 }),
      new THREE.MeshStandardMaterial({ color: 0x68685e, roughness: 0.98, metalness: 0.02 }),
      new THREE.MeshStandardMaterial({ color: 0x9a9080, roughness: 0.94, metalness: 0.03 }),
    ];
    const mossMat  = new THREE.MeshStandardMaterial({ color: 0x4a6b32, roughness: 1.0 });
    const lichenMat = new THREE.MeshStandardMaterial({ color: 0x9aaa60, roughness: 1.0 });

    for (let i = 0; i < 30; i++) {
      const x = (rng() - 0.5) * halfW * 1.9;
      const z = (rng() - 0.5) * halfD * 1.9;
      const h = getTerrainHeight(x, z);
      const mat = rockMats[Math.floor(rng() * rockMats.length)];

      const group = new THREE.Group();

      const detail = rng() < 0.35 ? 1 : 0;
      const rockGeo = new THREE.IcosahedronGeometry(0.25 + rng() * 0.5, detail);
      const rPos = rockGeo.attributes.position;
      for (let v = 0; v < rPos.count; v++) {
        const noise = 0.78 + rng() * 0.44;
        rPos.setXYZ(v,
          rPos.getX(v) * noise,
          rPos.getY(v) * noise * 0.65,
          rPos.getZ(v) * noise,
        );
      }
      rockGeo.computeVertexNormals();
      const rock = new THREE.Mesh(rockGeo, mat);
      rock.castShadow = true;
      rock.receiveShadow = true;
      group.add(rock);

      // Moss patch on top
      if (rng() < 0.5) {
        const mossGeo = new THREE.SphereGeometry(0.12 + rng() * 0.18, 5, 3, 0, Math.PI * 2, 0, Math.PI * 0.4);
        const moss = new THREE.Mesh(mossGeo, mossMat);
        moss.position.y = 0.12 + rng() * 0.08;
        moss.scale.set(1.3, 0.25, 1.3);
        group.add(moss);
      }

      // Lichen patches on side
      if (rng() < 0.35) {
        const lGeo = new THREE.CircleGeometry(0.06 + rng() * 0.08, 5);
        const lichen = new THREE.Mesh(lGeo, lichenMat);
        const la = rng() * Math.PI * 2;
        lichen.position.set(Math.cos(la) * 0.28, rng() * 0.15, Math.sin(la) * 0.28);
        lichen.lookAt(Math.cos(la) * 2, rng() * 0.3, Math.sin(la) * 2);
        group.add(lichen);
      }

      // Occasionally a small companion rock
      if (rng() < 0.3) {
        const smGeo = new THREE.IcosahedronGeometry(0.08 + rng() * 0.12, 0);
        const smRPos = smGeo.attributes.position;
        for (let v = 0; v < smRPos.count; v++) {
          const n = 0.8 + rng() * 0.4;
          smRPos.setXYZ(v, smRPos.getX(v) * n, smRPos.getY(v) * n * 0.7, smRPos.getZ(v) * n);
        }
        smGeo.computeVertexNormals();
        const smRock = new THREE.Mesh(smGeo, mat);
        smRock.position.set((rng() - 0.5) * 0.6, 0, (rng() - 0.5) * 0.6);
        smRock.castShadow = true;
        group.add(smRock);
      }

      group.position.set(x, h - rng() * 0.18, z);
      group.rotation.set(rng() * 0.4, rng() * Math.PI * 2, rng() * 0.3);
      group.scale.set(0.5 + rng() * 1.0, 0.35 + rng() * 0.7, 0.5 + rng() * 1.0);
      this.scene.add(group);
    }
  }

  // ---- Grass tufts: varied blades, some seed heads ----------------------

  private _addGrassTufts(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    const grassColors = [0x3d6e2e, 0x4e8038, 0x2e5820, 0x5a9040, 0x3a6630, 0x608848];

    for (let i = 0; i < 160; i++) {
      const cx = (rng() - 0.5) * halfW * 1.9;
      const cz = (rng() - 0.5) * halfD * 1.9;
      const h = getTerrainHeight(cx, cz);
      const color = grassColors[Math.floor(rng() * grassColors.length)];
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 1.0 });
      const seedMat = new THREE.MeshStandardMaterial({ color: 0xc8b060, roughness: 1.0 });

      const bladeCount = 3 + Math.floor(rng() * 4);
      for (let b = 0; b < bladeCount; b++) {
        const bx = cx + (rng() - 0.5) * 0.4;
        const bz = cz + (rng() - 0.5) * 0.4;
        const bladeH = 0.2 + rng() * 0.35;

        const bladeGeo = new THREE.ConeGeometry(0.025 + rng() * 0.03, bladeH, 3);
        const blade = new THREE.Mesh(bladeGeo, mat);
        blade.position.set(bx, h + bladeH / 2, bz);
        blade.rotation.x = (rng() - 0.5) * 0.4;
        blade.rotation.z = (rng() - 0.5) * 0.4;
        blade.rotation.y = rng() * Math.PI * 2;
        this.scene.add(blade);

        // Occasional seed head on tall blades
        if (bladeH > 0.38 && rng() < 0.4) {
          const seedGeo = new THREE.SphereGeometry(0.018, 4, 3);
          const seed = new THREE.Mesh(seedGeo, seedMat);
          seed.position.set(bx, h + bladeH + 0.02, bz);
          seed.scale.set(1, 1.8, 1);
          this.scene.add(seed);
        }
      }
    }
  }

  // ---- Trees: detailed bark, layered multi-cluster canopy ----------------

  private _addTrees(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;

    // Leaf color palettes — mix of bright summer and deeper forest greens
    const leafPalettes = [
      [0x2c5c1e, 0x3a7228, 0x4a8c34],  // deep forest
      [0x3a6e28, 0x4e8c38, 0x5ea040],  // mid-green
      [0x2e6030, 0x3e7840, 0x4e8c50],  // cool green
      [0x5a7820, 0x6a9030, 0x7aaa3c],  // yellow-green (young leaves)
    ];

    for (let i = 0; i < 38; i++) {
      const angle = (i / 38) * Math.PI * 2 + (rng() - 0.5) * 0.35;
      const radius = halfW * 0.90 + rng() * 10;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const h = getTerrainHeight(x, z);

      const treeGroup = new THREE.Group();
      const treeHeight = 3.5 + rng() * 3.5;
      const trunkR = 0.14 + rng() * 0.18;

      // --- Trunk ---
      // Bark: dark brown base, lighter secondary highlight
      const barkBase = 0x3a2510 + Math.floor(rng() * 0x100800);
      const trunkMat = new THREE.MeshStandardMaterial({
        color: barkBase,
        roughness: 0.98,
        metalness: 0.0,
      });

      // Main trunk — 3-section taper for more natural silhouette
      const t1Geo = new THREE.CylinderGeometry(trunkR * 0.75, trunkR * 1.1, treeHeight * 0.4, 7);
      const t1 = new THREE.Mesh(t1Geo, trunkMat);
      t1.position.y = treeHeight * 0.2;
      t1.rotation.y = rng() * Math.PI * 2;
      t1.castShadow = true;
      t1.receiveShadow = true;
      treeGroup.add(t1);

      const t2Geo = new THREE.CylinderGeometry(trunkR * 0.55, trunkR * 0.75, treeHeight * 0.35, 7);
      const t2 = new THREE.Mesh(t2Geo, trunkMat);
      t2.position.y = treeHeight * 0.575;
      t2.rotation.y = rng() * Math.PI * 2;
      t2.castShadow = true;
      treeGroup.add(t2);

      const t3Geo = new THREE.CylinderGeometry(trunkR * 0.3, trunkR * 0.55, treeHeight * 0.3, 6);
      const t3 = new THREE.Mesh(t3Geo, trunkMat);
      t3.position.y = treeHeight * 0.85;
      t3.castShadow = true;
      treeGroup.add(t3);

      // Bark ridges — 4-6 thin vertical fins along trunk
      const ridgeCount = 4 + Math.floor(rng() * 3);
      for (let r = 0; r < ridgeCount; r++) {
        const ra = (r / ridgeCount) * Math.PI * 2;
        const ridgeGeo = new THREE.BoxGeometry(0.025, treeHeight * 0.6, 0.04);
        const ridge = new THREE.Mesh(ridgeGeo, trunkMat);
        ridge.position.set(
          Math.cos(ra) * (trunkR * 0.9),
          treeHeight * 0.35,
          Math.sin(ra) * (trunkR * 0.9),
        );
        ridge.rotation.y = ra;
        treeGroup.add(ridge);
      }

      // Exposed roots — flaring buttresses at base
      const rootCount = 4 + Math.floor(rng() * 3);
      for (let r = 0; r < rootCount; r++) {
        const ra = (r / rootCount) * Math.PI * 2 + rng() * 0.4;
        const rootLen = 0.5 + rng() * 0.6;
        const rootGeo = new THREE.CylinderGeometry(0.025, trunkR * 0.38, rootLen, 4);
        const root = new THREE.Mesh(rootGeo, trunkMat);
        root.position.set(
          Math.cos(ra) * rootLen * 0.45,
          0.04,
          Math.sin(ra) * rootLen * 0.45,
        );
        root.rotation.z = Math.cos(ra) * 1.15;
        root.rotation.x = Math.sin(ra) * 1.15;
        root.castShadow = true;
        treeGroup.add(root);
      }

      // --- Canopy ---
      const palette = leafPalettes[Math.floor(rng() * leafPalettes.length)];
      const canopyBaseY = treeHeight * 0.62;
      const mainR = 1.2 + rng() * 1.0;

      // Helper to make a deformed icosahedron leaf cluster
      const makeLeafCluster = (radius: number, color: number) => {
        const mat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.88,
          metalness: 0.0,
        });
        const geo = new THREE.IcosahedronGeometry(radius, 1);
        const p = geo.attributes.position;
        for (let v = 0; v < p.count; v++) {
          const n = 0.82 + rng() * 0.36;
          p.setXYZ(v, p.getX(v) * n, p.getY(v) * n * 0.78, p.getZ(v) * n);
        }
        geo.computeVertexNormals();
        return new THREE.Mesh(geo, mat);
      };

      // Bottom layer — widest, darkest (shadowed inside)
      const base = makeLeafCluster(mainR * 0.9, palette[0]);
      base.position.y = canopyBaseY;
      base.castShadow = true;
      treeGroup.add(base);

      // Mid layer — slightly smaller, medium green
      const mid = makeLeafCluster(mainR * 0.82, palette[1]);
      mid.position.y = canopyBaseY + mainR * 0.55;
      mid.castShadow = true;
      treeGroup.add(mid);

      // Top layer — smallest, brightest (sunlit top)
      const top = makeLeafCluster(mainR * 0.6, palette[2]);
      top.position.y = canopyBaseY + mainR * 1.05;
      top.castShadow = true;
      treeGroup.add(top);

      // Side clusters — irregular shape around main
      const clusterCount = 2 + Math.floor(rng() * 4);
      for (let c = 0; c < clusterCount; c++) {
        const ca = rng() * Math.PI * 2;
        const cdist = mainR * (0.45 + rng() * 0.45);
        const cr = mainR * (0.38 + rng() * 0.35);
        const colIdx = Math.floor(rng() * palette.length);
        const cluster = makeLeafCluster(cr, palette[colIdx]);
        cluster.position.set(
          Math.cos(ca) * cdist,
          canopyBaseY + mainR * (0.2 + rng() * 0.7),
          Math.sin(ca) * cdist,
        );
        cluster.castShadow = true;
        treeGroup.add(cluster);
      }

      // Branches reaching out below canopy
      const branchCount = 3 + Math.floor(rng() * 3);
      for (let br = 0; br < branchCount; br++) {
        const ba = rng() * Math.PI * 2;
        const bLen = 0.6 + rng() * 1.0;
        const bThick = trunkR * (0.15 + rng() * 0.2);
        const bGeo = new THREE.CylinderGeometry(bThick * 0.4, bThick, bLen, 5);
        const branch = new THREE.Mesh(bGeo, trunkMat);
        const bY = canopyBaseY * (0.55 + rng() * 0.4);
        branch.position.set(
          Math.cos(ba) * bLen * 0.35,
          bY,
          Math.sin(ba) * bLen * 0.35,
        );
        branch.rotation.z = Math.cos(ba) * 0.75;
        branch.rotation.x = Math.sin(ba) * 0.75;
        branch.castShadow = true;
        treeGroup.add(branch);

        // Sub-branch tip
        if (rng() < 0.5) {
          const sbLen = bLen * 0.5;
          const sbGeo = new THREE.CylinderGeometry(bThick * 0.15, bThick * 0.35, sbLen, 4);
          const sb = new THREE.Mesh(sbGeo, trunkMat);
          sb.position.set(
            Math.cos(ba + 0.6) * sbLen * 0.4 + Math.cos(ba) * bLen * 0.35,
            bY + sbLen * 0.2,
            Math.sin(ba + 0.6) * sbLen * 0.4 + Math.sin(ba) * bLen * 0.35,
          );
          sb.rotation.z = Math.cos(ba + 0.6) * 0.9;
          sb.rotation.x = Math.sin(ba + 0.6) * 0.9;
          treeGroup.add(sb);
        }
      }

      treeGroup.position.set(x, h, z);
      treeGroup.rotation.x = (rng() - 0.5) * 0.04;
      treeGroup.rotation.z = (rng() - 0.5) * 0.04;
      treeGroup.rotation.y = rng() * Math.PI * 2;
      this.scene.add(treeGroup);
    }
  }

  // ---- Bushes / shrubs: layered, varied species --------------------------

  private _addBushes(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    // Several shrub species
    type ShrubSpec = { colors: number[]; height: number; spread: number };
    const species: ShrubSpec[] = [
      { colors: [0x2a5c20, 0x386830, 0x4a7a40], height: 0.9, spread: 1.0 },  // dark evergreen
      { colors: [0x3e7030, 0x50883e, 0x62a050], height: 0.7, spread: 1.2 },  // mid bush
      { colors: [0x5a8030, 0x6e9840, 0x82b050], height: 0.5, spread: 0.9 },  // light shrub
      { colors: [0x4a6820, 0x608030, 0x78a040], height: 1.2, spread: 0.8 },  // tall hedge
      { colors: [0x8a6030, 0x7a5020, 0x6a4018], height: 0.6, spread: 1.0 },  // autumn / bramble
    ];

    for (let i = 0; i < 40; i++) {
      const x = (rng() - 0.5) * halfW * 2.0;
      const z = (rng() - 0.5) * halfD * 2.0;
      const h = getTerrainHeight(x, z);
      const spec = species[Math.floor(rng() * species.length)];
      const bushR = (0.35 + rng() * 0.5) * spec.spread;
      const bushH = bushR * spec.height;

      const bushGroup = new THREE.Group();

      const lobeCount = 3 + Math.floor(rng() * 4);

      for (let l = 0; l < lobeCount; l++) {
        const la = (l / lobeCount) * Math.PI * 2 + rng() * 0.8;
        const dist = bushR * 0.35 * rng();
        const lobeR = bushR * (0.55 + rng() * 0.45);
        const colorIdx = Math.floor(rng() * spec.colors.length);
        const mat = new THREE.MeshStandardMaterial({
          color: spec.colors[colorIdx],
          roughness: 0.92,
          metalness: 0.0,
        });

        // Main lobe sphere — deformed for organic look
        const geo = new THREE.SphereGeometry(lobeR, 7, 5);
        const pos = geo.attributes.position;
        for (let v = 0; v < pos.count; v++) {
          const n = 0.88 + rng() * 0.24;
          pos.setXYZ(v, pos.getX(v) * n, pos.getY(v) * n * 0.7, pos.getZ(v) * n);
        }
        geo.computeVertexNormals();

        const lobe = new THREE.Mesh(geo, mat);
        lobe.position.set(
          Math.cos(la) * dist,
          lobeR * (0.45 + rng() * 0.2),
          Math.sin(la) * dist,
        );
        lobe.castShadow = true;
        lobe.receiveShadow = true;
        bushGroup.add(lobe);
      }

      // Top highlight lobe — lightest color, sits on top
      const topMat = new THREE.MeshStandardMaterial({
        color: spec.colors[spec.colors.length - 1],
        roughness: 0.88,
      });
      const topGeo = new THREE.SphereGeometry(bushR * 0.55, 6, 4);
      const topLobe = new THREE.Mesh(topGeo, topMat);
      topLobe.position.y = bushH * 0.9;
      topLobe.scale.set(1, 0.5, 1);
      topLobe.castShadow = true;
      bushGroup.add(topLobe);

      // Small woody stems visible at base
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 1.0 });
      const stemCount = 2 + Math.floor(rng() * 3);
      for (let s = 0; s < stemCount; s++) {
        const sa = rng() * Math.PI * 2;
        const stemH = bushH * (0.3 + rng() * 0.4);
        const sGeo = new THREE.CylinderGeometry(0.012, 0.022, stemH, 4);
        const stem = new THREE.Mesh(sGeo, stemMat);
        stem.position.set(Math.cos(sa) * bushR * 0.3, stemH / 2, Math.sin(sa) * bushR * 0.3);
        stem.rotation.z = Math.cos(sa) * 0.2;
        stem.rotation.x = Math.sin(sa) * 0.2;
        bushGroup.add(stem);
      }

      // Occasional berries / flowers on bramble-type
      if (spec.colors[0] === 0x8a6030 && rng() < 0.5) {
        const berryMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.6 });
        for (let b = 0; b < 6; b++) {
          const bGeo = new THREE.SphereGeometry(0.025, 4, 3);
          const berry = new THREE.Mesh(bGeo, berryMat);
          berry.position.set(
            (rng() - 0.5) * bushR * 1.2,
            bushH * (0.3 + rng() * 0.5),
            (rng() - 0.5) * bushR * 1.2,
          );
          bushGroup.add(berry);
        }
      }

      bushGroup.position.set(x, h, z);
      bushGroup.rotation.y = rng() * Math.PI * 2;
      this.scene.add(bushGroup);
    }
  }

  // ---- Flowers: petalled heads on slender stems -------------------------

  private _addFlowers(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    type FlowerSpec = { center: number; petals: number };
    const flowerSpecs: FlowerSpec[] = [
      { center: 0xffee44, petals: 0xffffff },  // daisy
      { center: 0xffaa00, petals: 0xff6600 },  // marigold
      { center: 0xffee00, petals: 0xcc44aa },  // purple
      { center: 0xffffff, petals: 0x8888dd },  // bluebell-ish
      { center: 0xffcc00, petals: 0xeeee88 },  // primrose
    ];

    for (let i = 0; i < 28; i++) {
      const cx = (rng() - 0.5) * halfW * 1.5;
      const cz = (rng() - 0.5) * halfD * 1.5;
      const spec = flowerSpecs[Math.floor(rng() * flowerSpecs.length)];
      const centerMat = new THREE.MeshStandardMaterial({ color: spec.center, roughness: 0.7 });
      const petalMat  = new THREE.MeshStandardMaterial({ color: spec.petals, roughness: 0.85 });
      const stemMat   = new THREE.MeshStandardMaterial({ color: 0x3a6020, roughness: 0.95 });
      const leafMat   = new THREE.MeshStandardMaterial({ color: 0x3a7028, roughness: 0.95, side: THREE.DoubleSide });

      const count = 4 + Math.floor(rng() * 5);
      for (let f = 0; f < count; f++) {
        const fx = cx + (rng() - 0.5) * 1.8;
        const fz = cz + (rng() - 0.5) * 1.8;
        const fh = getTerrainHeight(fx, fz);
        const stemH = 0.15 + rng() * 0.25;

        // Stem
        const stemGeo = new THREE.CylinderGeometry(0.005, 0.008, stemH, 3);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(fx, fh + stemH / 2, fz);
        this.scene.add(stem);

        // Leaf on stem (small ellipse)
        if (rng() < 0.5) {
          const leafGeo = new THREE.CircleGeometry(0.04 + rng() * 0.03, 5);
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          leaf.position.set(fx + (rng() - 0.5) * 0.06, fh + stemH * 0.5, fz + (rng() - 0.5) * 0.06);
          leaf.rotation.x = -0.5;
          leaf.rotation.z = rng() * Math.PI;
          this.scene.add(leaf);
        }

        // Petals — 5-7 ellipses arranged around center
        const petalCount = 5 + Math.floor(rng() * 3);
        const headR = 0.03 + rng() * 0.025;
        for (let p = 0; p < petalCount; p++) {
          const pa = (p / petalCount) * Math.PI * 2;
          const pGeo = new THREE.CircleGeometry(headR, 4);
          const petal = new THREE.Mesh(pGeo, petalMat);
          petal.position.set(
            fx + Math.cos(pa) * headR * 1.5,
            fh + stemH + 0.008,
            fz + Math.sin(pa) * headR * 1.5,
          );
          petal.rotation.x = -Math.PI / 2;
          petal.scale.set(1, 1.5, 1);
          this.scene.add(petal);
        }

        // Flower centre disc
        const cGeo = new THREE.CircleGeometry(headR * 0.7, 6);
        const centre = new THREE.Mesh(cGeo, centerMat);
        centre.position.set(fx, fh + stemH + 0.012, fz);
        centre.rotation.x = -Math.PI / 2;
        this.scene.add(centre);
      }
    }
  }

  // ---- Clouds: soft translucent shapes drifting in the sky ----------------

  private _addClouds(rng: () => number): void {
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      fog: false,
    });
    const cloudMat2 = new THREE.MeshBasicMaterial({
      color: 0xeee8dd,
      transparent: true,
      opacity: 0.4,
      fog: false,
    });

    for (let i = 0; i < 18; i++) {
      const cloudGroup = new THREE.Group();
      const lobeCount = 4 + Math.floor(rng() * 5);
      const baseR = 5 + rng() * 10;
      const mat = rng() < 0.6 ? cloudMat : cloudMat2;

      for (let l = 0; l < lobeCount; l++) {
        const lr = baseR * (0.4 + rng() * 0.6);
        const geo = new THREE.SphereGeometry(lr, 6, 5);
        const lobe = new THREE.Mesh(geo, mat);
        lobe.position.set(
          (rng() - 0.5) * baseR * 1.5,
          (rng() - 0.3) * baseR * 0.3,
          (rng() - 0.5) * baseR * 0.8,
        );
        lobe.scale.set(1, 0.35 + rng() * 0.2, 1);
        cloudGroup.add(lobe);
      }

      const angle = rng() * Math.PI * 2;
      const dist = 60 + rng() * 120;
      cloudGroup.position.set(
        Math.cos(angle) * dist,
        50 + rng() * 40,
        Math.sin(angle) * dist,
      );
      cloudGroup.rotation.y = rng() * Math.PI;
      this.scene.add(cloudGroup);
    }
  }

  // ---- Fallen logs: decaying tree trunks on the ground -------------------

  private _addFallenLogs(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    const barkMat = new THREE.MeshStandardMaterial({ color: 0x3a2810, roughness: 0.98 });
    const darkBark = new THREE.MeshStandardMaterial({ color: 0x2a1c08, roughness: 1.0 });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x4a6b2a, roughness: 1.0 });

    for (let i = 0; i < 5; i++) {
      const x = (rng() - 0.5) * halfW * 1.6;
      const z = (rng() - 0.5) * halfD * 1.6;
      const h = getTerrainHeight(x, z);
      const logLen = 1.5 + rng() * 2.5;
      const logR = 0.08 + rng() * 0.14;
      const logGroup = new THREE.Group();

      // Main log body
      const logGeo = new THREE.CylinderGeometry(logR * 0.8, logR, logLen, 7);
      const log = new THREE.Mesh(logGeo, barkMat);
      log.rotation.z = Math.PI / 2;
      log.castShadow = true;
      log.receiveShadow = true;
      logGroup.add(log);

      // Cross-section at broken end (lighter inner wood)
      const endMat = new THREE.MeshStandardMaterial({ color: 0x9a8060, roughness: 0.9 });
      for (const side of [-1, 1]) {
        const endGeo = new THREE.CircleGeometry(logR * (side === 1 ? 0.8 : 1.0), 6);
        const end = new THREE.Mesh(endGeo, endMat);
        end.position.set(side * logLen / 2, 0, 0);
        end.rotation.y = side * Math.PI / 2;
        logGroup.add(end);
      }

      // Bark strips peeling off
      for (let b = 0; b < 3; b++) {
        const stripLen = logLen * (0.15 + rng() * 0.2);
        const stripGeo = new THREE.BoxGeometry(stripLen, 0.005, 0.04 + rng() * 0.03);
        const strip = new THREE.Mesh(stripGeo, darkBark);
        strip.position.set(
          (rng() - 0.5) * logLen * 0.6,
          logR * 0.85 + rng() * 0.02,
          (rng() - 0.5) * logR * 0.8,
        );
        strip.rotation.x = (rng() - 0.5) * 0.3;
        logGroup.add(strip);
      }

      // Moss patches on top
      if (rng() < 0.7) {
        const mCt = 2 + Math.floor(rng() * 3);
        for (let m = 0; m < mCt; m++) {
          const mGeo = new THREE.SphereGeometry(logR * (0.6 + rng() * 0.4), 4, 3, 0, Math.PI * 2, 0, Math.PI * 0.4);
          const moss = new THREE.Mesh(mGeo, mossMat);
          moss.position.set(
            (rng() - 0.5) * logLen * 0.6,
            logR * 0.6,
            0,
          );
          moss.scale.set(1.5, 0.25, 1);
          logGroup.add(moss);
        }
      }

      // Small broken branch stubs
      for (let s = 0; s < 2; s++) {
        const stubGeo = new THREE.CylinderGeometry(0.01, 0.03, 0.15 + rng() * 0.1, 4);
        const stub = new THREE.Mesh(stubGeo, barkMat);
        stub.position.set(
          (rng() - 0.5) * logLen * 0.5,
          logR * 0.7,
          0,
        );
        stub.rotation.z = (rng() - 0.5) * 0.4;
        logGroup.add(stub);
      }

      logGroup.position.set(x, h + logR * 0.5, z);
      logGroup.rotation.y = rng() * Math.PI;
      logGroup.rotation.z = (rng() - 0.5) * 0.15; // slight tilt
      this.scene.add(logGroup);
    }
  }

  // ---- Mushrooms: clusters growing on logs, near trees, damp areas ------

  private _addMushrooms(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    const mushSpecs = [
      { cap: 0xcc8844, stem: 0xe8dcc0, capR: 0.045, stemH: 0.05 },  // brown toadstool
      { cap: 0xdd3322, stem: 0xeee8d8, capR: 0.04, stemH: 0.06 },   // red amanita
      { cap: 0xeedd88, stem: 0xddd8c0, capR: 0.035, stemH: 0.04 },  // chanterelle
      { cap: 0xeeeeee, stem: 0xddddcc, capR: 0.03, stemH: 0.045 },  // white button
    ];

    for (let i = 0; i < 14; i++) {
      const x = (rng() - 0.5) * halfW * 1.8;
      const z = (rng() - 0.5) * halfD * 1.8;
      const spec = mushSpecs[Math.floor(rng() * mushSpecs.length)];

      const count = 2 + Math.floor(rng() * 5);
      for (let m = 0; m < count; m++) {
        const mx = x + (rng() - 0.5) * 0.4;
        const mz = z + (rng() - 0.5) * 0.4;
        const mh = getTerrainHeight(mx, mz);
        const scale = 0.6 + rng() * 0.8;

        // Stem
        const stemMat = new THREE.MeshStandardMaterial({ color: spec.stem, roughness: 0.85 });
        const stemGeo = new THREE.CylinderGeometry(spec.capR * 0.3 * scale, spec.capR * 0.4 * scale, spec.stemH * scale, 5);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(mx, mh + spec.stemH * scale * 0.5, mz);
        this.scene.add(stem);

        // Cap — half-sphere on top
        const capMat = new THREE.MeshStandardMaterial({ color: spec.cap, roughness: 0.75, metalness: 0.02 });
        const capGeo = new THREE.SphereGeometry(spec.capR * scale, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(mx, mh + spec.stemH * scale, mz);
        cap.scale.set(1, 0.55, 1);
        this.scene.add(cap);

        // White spots on red mushrooms
        if (spec.cap === 0xdd3322 && rng() < 0.7) {
          const spotMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
          for (let s = 0; s < 4; s++) {
            const sa = rng() * Math.PI * 2;
            const sd = spec.capR * scale * 0.5;
            const spotGeo = new THREE.CircleGeometry(0.006 * scale, 4);
            const spot = new THREE.Mesh(spotGeo, spotMat);
            spot.position.set(
              mx + Math.cos(sa) * sd,
              mh + spec.stemH * scale + 0.005,
              mz + Math.sin(sa) * sd,
            );
            spot.rotation.x = -Math.PI / 2;
            this.scene.add(spot);
          }
        }
      }
    }
  }

  // ---- Pond: a small still-water area with reeds and lily pads ----------

  private _addPond(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    // Place pond near one edge of the arena, offset
    const px = halfW * 0.6 + rng() * 4;
    const pz = -halfD * 0.5 + rng() * 4;
    const ph = getTerrainHeight(px, pz);
    const pondR = 2.5 + rng() * 1.5;

    // Water surface — slightly reflective dark blue-green
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2a4a4a,
      roughness: 0.15,
      metalness: 0.4,
      transparent: true,
      opacity: 0.82,
    });
    const waterGeo = new THREE.CircleGeometry(pondR, 14);
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(px, ph - 0.06, pz);
    water.receiveShadow = true;
    this.scene.add(water);

    // Muddy bank around the edge
    const bankMat = new THREE.MeshStandardMaterial({ color: 0x5a4a30, roughness: 1.0 });
    const bankGeo = new THREE.RingGeometry(pondR * 0.85, pondR * 1.15, 14);
    const bank = new THREE.Mesh(bankGeo, bankMat);
    bank.rotation.x = -Math.PI / 2;
    bank.position.set(px, ph - 0.04, pz);
    bank.receiveShadow = true;
    this.scene.add(bank);

    // Lily pads — flat green discs on the water surface
    const lilyMat = new THREE.MeshStandardMaterial({
      color: 0x3a6a28,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 6; i++) {
      const la = rng() * Math.PI * 2;
      const ld = pondR * (0.2 + rng() * 0.55);
      const lilyR = 0.12 + rng() * 0.12;
      // Lily pad with a notch cut — approximated as a circle
      const lilyGeo = new THREE.CircleGeometry(lilyR, 8, 0, Math.PI * 1.8);
      const lily = new THREE.Mesh(lilyGeo, lilyMat);
      lily.rotation.x = -Math.PI / 2;
      lily.rotation.z = rng() * Math.PI * 2;
      lily.position.set(
        px + Math.cos(la) * ld,
        ph - 0.045,
        pz + Math.sin(la) * ld,
      );
      this.scene.add(lily);

      // Tiny flower on some lily pads
      if (rng() < 0.4) {
        const fMat = new THREE.MeshStandardMaterial({ color: rng() < 0.5 ? 0xffccdd : 0xffffff, roughness: 0.7 });
        const fGeo = new THREE.SphereGeometry(0.03, 5, 3);
        const flower = new THREE.Mesh(fGeo, fMat);
        flower.position.set(
          px + Math.cos(la) * ld,
          ph - 0.02,
          pz + Math.sin(la) * ld,
        );
        flower.scale.set(1, 0.5, 1);
        this.scene.add(flower);
      }
    }

    // Reeds / cattails growing around the pond edge
    const reedMat = new THREE.MeshStandardMaterial({ color: 0x3a5a20, roughness: 0.95 });
    const reedTopMat = new THREE.MeshStandardMaterial({ color: 0x6a4a20, roughness: 0.9 });
    for (let i = 0; i < 12; i++) {
      const ra = rng() * Math.PI * 2;
      const rd = pondR * (0.75 + rng() * 0.35);
      const rx = px + Math.cos(ra) * rd;
      const rz = pz + Math.sin(ra) * rd;
      const rh = getTerrainHeight(rx, rz);
      const reedH = 0.5 + rng() * 0.6;

      const rGeo = new THREE.CylinderGeometry(0.006, 0.01, reedH, 3);
      const reed = new THREE.Mesh(rGeo, reedMat);
      reed.position.set(rx, rh + reedH / 2, rz);
      reed.rotation.x = (rng() - 0.5) * 0.15;
      reed.rotation.z = (rng() - 0.5) * 0.15;
      this.scene.add(reed);

      // Cattail head on some reeds
      if (rng() < 0.5) {
        const topGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.06, 4);
        const rTop = new THREE.Mesh(topGeo, reedTopMat);
        rTop.position.set(rx, rh + reedH + 0.02, rz);
        this.scene.add(rTop);
      }
    }

    // Pebbles around shore
    const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x888878, roughness: 1.0 });
    for (let i = 0; i < 15; i++) {
      const pa2 = rng() * Math.PI * 2;
      const pd = pondR * (0.9 + rng() * 0.3);
      const pGeo = new THREE.SphereGeometry(0.03 + rng() * 0.04, 4, 3);
      const pebble = new THREE.Mesh(pGeo, pebbleMat);
      pebble.position.set(
        px + Math.cos(pa2) * pd,
        ph - 0.04,
        pz + Math.sin(pa2) * pd,
      );
      pebble.scale.set(1, 0.5, 1 + rng() * 0.5);
      this.scene.add(pebble);
    }
  }

  // ---- Ground leaves: scattered fallen leaves adding color & texture ----

  private _addGroundLeaves(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    const leafColors = [0x7a5020, 0x8a6030, 0x6a4018, 0x9a7030, 0xaa8040, 0x5a6020, 0x887722];
    const leafMats = leafColors.map(c =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, side: THREE.DoubleSide }),
    );

    for (let i = 0; i < 80; i++) {
      const x = (rng() - 0.5) * halfW * 1.8;
      const z = (rng() - 0.5) * halfD * 1.8;
      const h = getTerrainHeight(x, z);
      const mat = leafMats[Math.floor(rng() * leafMats.length)];

      const lGeo = new THREE.CircleGeometry(0.04 + rng() * 0.04, 5);
      const leaf = new THREE.Mesh(lGeo, mat);
      leaf.position.set(x, h + 0.01, z);
      leaf.rotation.x = -Math.PI / 2 + (rng() - 0.5) * 0.3;
      leaf.rotation.z = rng() * Math.PI * 2;
      leaf.scale.set(1, 0.6 + rng() * 0.4, 1);
      this.scene.add(leaf);
    }
  }

  // ---- Fence row: wooden split-rail fence segment in midground ----------

  private _addFenceRow(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;

    // Place along one side of the arena perimeter
    const fenceZ = halfW * 0.7 + 3;
    const fenceStartX = -8 + rng() * 4;
    const fenceLen = 12 + rng() * 6;
    const postSpacing = 2.5;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6a4820, roughness: 0.95 });
    const oldWoodMat = new THREE.MeshStandardMaterial({ color: 0x5a4018, roughness: 0.98 });

    const postCount = Math.floor(fenceLen / postSpacing) + 1;
    for (let i = 0; i < postCount; i++) {
      const fx = fenceStartX + i * postSpacing;
      const fh = getTerrainHeight(fx, fenceZ);
      const postH = 1.0 + rng() * 0.3;

      // Post — slightly irregular
      const postGeo = new THREE.BoxGeometry(0.08 + rng() * 0.03, postH, 0.08 + rng() * 0.03);
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(fx, fh + postH / 2, fenceZ);
      post.rotation.y = rng() * 0.15;
      post.castShadow = true;
      this.scene.add(post);

      // Top chamfer
      const capGeo = new THREE.ConeGeometry(0.055, 0.08, 4);
      const cap = new THREE.Mesh(capGeo, woodMat);
      cap.position.set(fx, fh + postH + 0.03, fenceZ);
      cap.rotation.y = Math.PI / 4;
      this.scene.add(cap);

      // Rails connecting to next post
      if (i < postCount - 1) {
        const nfx = fenceStartX + (i + 1) * postSpacing;
        const nfh = getTerrainHeight(nfx, fenceZ);
        const midX = (fx + nfx) / 2;
        const midH = (fh + nfh) / 2;
        const railLen = postSpacing * 1.05;

        for (let r = 0; r < 2; r++) {
          const railH = 0.35 + r * 0.35;
          const railGeo = new THREE.BoxGeometry(railLen, 0.05 + rng() * 0.02, 0.04);
          const rail = new THREE.Mesh(railGeo, r === 0 ? oldWoodMat : woodMat);
          rail.position.set(midX, midH + railH, fenceZ);
          // Slight angle if terrain differs
          rail.rotation.z = Math.atan2(nfh - fh, postSpacing) * 0.5;
          rail.castShadow = true;
          this.scene.add(rail);
        }
      }
    }
  }

  // ---- Birds: distant silhouettes circling in the sky -------------------

  private _addBirds(rng: () => number): void {
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x222222, fog: true });

    for (let i = 0; i < 8; i++) {
      // Each bird is 2 small triangles (wings) in a V shape
      const birdGroup = new THREE.Group();
      const wingSpan = 0.15 + rng() * 0.1;
      const wingGeo = new THREE.BufferGeometry();

      // Left wing triangle
      const lv = new Float32Array([
        0, 0, 0,
        -wingSpan, 0.02, -wingSpan * 0.25,
        -wingSpan * 0.5, 0, -wingSpan * 0.15,
      ]);
      wingGeo.setAttribute("position", new THREE.BufferAttribute(lv, 3));
      wingGeo.computeVertexNormals();
      const lWing = new THREE.Mesh(wingGeo, birdMat);
      birdGroup.add(lWing);

      // Right wing triangle
      const rwGeo = new THREE.BufferGeometry();
      const rv = new Float32Array([
        0, 0, 0,
        wingSpan, 0.02, -wingSpan * 0.25,
        wingSpan * 0.5, 0, -wingSpan * 0.15,
      ]);
      rwGeo.setAttribute("position", new THREE.BufferAttribute(rv, 3));
      rwGeo.computeVertexNormals();
      const rWing = new THREE.Mesh(rwGeo, birdMat);
      birdGroup.add(rWing);

      // Position birds at various heights circling in the distance
      const angle = rng() * Math.PI * 2;
      const dist = 30 + rng() * 50;
      birdGroup.position.set(
        Math.cos(angle) * dist,
        20 + rng() * 25,
        Math.sin(angle) * dist,
      );
      birdGroup.rotation.y = angle + Math.PI / 2;
      birdGroup.scale.setScalar(3 + rng() * 4);
      this.scene.add(birdGroup);
    }
  }

  /** Build a siege castle environment */
  buildSiegeArena(): void {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x888877,
      roughness: 0.95,
      metalness: 0.05,
    });
    const darkStoneMat = new THREE.MeshStandardMaterial({
      color: 0x666655,
      roughness: 0.95,
      metalness: 0.05,
    });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 });
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.7, side: THREE.DoubleSide });

    const wallH = 8;
    const wallThick = 2;

    // Helper to add a wall box
    const addWall = (w: number, h: number, d: number, x: number, y: number, z: number, mat = wallMat) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      return mesh;
    };

    // ---- Front wall (two sections with gate gap) ----
    // Left section: x from -20 to -2.5
    addWall(17.5, wallH, wallThick, -11.25, wallH / 2, -15);
    // Right section: x from 2.5 to 20
    addWall(17.5, wallH, wallThick, 11.25, wallH / 2, -15);
    // Gate arch (above the opening)
    addWall(5, 3, wallThick, 0, wallH - 1.5, -15);

    // Gate doors (wooden, on either side of opening)
    addWall(1.2, 5, 0.3, -1.8, 2.5, -14.5, woodMat);
    addWall(1.2, 5, 0.3, 1.8, 2.5, -14.5, woodMat);
    // Gate portcullis bars (iron grate above gate)
    const barMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.6 });
    for (let bx = -2; bx <= 2; bx += 0.8) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 5, 4), barMat);
      bar.position.set(bx, 2.5, -15);
      this.scene.add(bar);
    }

    // Front wall crenellations
    const crenGeo = new THREE.BoxGeometry(1.2, 1.5, 0.6);
    for (let x = -19; x <= 19; x += 2.5) {
      if (Math.abs(x) < 3) continue; // skip gate area
      const cren = new THREE.Mesh(crenGeo, wallMat);
      cren.position.set(x, wallH + 0.75, -14);
      cren.castShadow = true;
      this.scene.add(cren);
    }

    // ---- Side walls ----
    // Left wall: x=-20, z from -15 to -35
    addWall(wallThick, wallH, 20, -20, wallH / 2, -25);
    // Right wall: x=20, z from -15 to -35
    addWall(wallThick, wallH, 20, 20, wallH / 2, -25);

    // Side wall crenellations
    for (let z = -17; z >= -33; z -= 2.5) {
      const crenL = new THREE.Mesh(crenGeo, wallMat);
      crenL.position.set(-19, wallH + 0.75, z);
      crenL.rotation.y = Math.PI / 2;
      crenL.castShadow = true;
      this.scene.add(crenL);
      const crenR = new THREE.Mesh(crenGeo, wallMat);
      crenR.position.set(19, wallH + 0.75, z);
      crenR.rotation.y = Math.PI / 2;
      crenR.castShadow = true;
      this.scene.add(crenR);
    }

    // ---- Back wall ----
    addWall(42, wallH, wallThick, 0, wallH / 2, -35);
    // Back wall crenellations
    for (let x = -19; x <= 19; x += 2.5) {
      const cren = new THREE.Mesh(crenGeo, wallMat);
      cren.position.set(x, wallH + 0.75, -34);
      cren.castShadow = true;
      this.scene.add(cren);
    }

    // ---- Corner towers (4 corners) ----
    const towerGeo = new THREE.CylinderGeometry(2.2, 2.5, 12, 8);
    const towerTopGeo = new THREE.CylinderGeometry(2.7, 2.7, 1, 8);
    const towerPositions = [
      [-20, -15], [-20, -35], [20, -15], [20, -35],
    ];
    for (const [tx, tz] of towerPositions) {
      const tower = new THREE.Mesh(towerGeo, wallMat);
      tower.position.set(tx, 6, tz);
      tower.castShadow = true;
      tower.receiveShadow = true;
      this.scene.add(tower);
      const top = new THREE.Mesh(towerTopGeo, wallMat);
      top.position.set(tx, 12.5, tz);
      top.castShadow = true;
      this.scene.add(top);
      // Tower crenellations (small blocks on top ring)
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        const tc = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.5), wallMat);
        tc.position.set(tx + Math.cos(a) * 2.5, 13.5, tz + Math.sin(a) * 2.5);
        tc.rotation.y = a;
        tc.castShadow = true;
        this.scene.add(tc);
      }
    }

    // ---- Inner walls (create three routes) ----
    // Left inner wall: x=-10, z from -30 to -20
    addWall(wallThick, 5, 10, -10, 2.5, -25, darkStoneMat);
    // Right inner wall: x=10, z from -30 to -20
    addWall(wallThick, 5, 10, 10, 2.5, -25, darkStoneMat);
    // Centre barricade: blocks direct centre route, forces flanking
    addWall(6, 3, 1, 0, 1.5, -22, darkStoneMat);
    // Wooden barricade details on centre blockade
    addWall(5.5, 0.15, 0.3, 0, 2.8, -21.7, woodMat);
    addWall(5.5, 0.15, 0.3, 0, 1.5, -21.7, woodMat);

    // ---- Keep / centre structure ----
    // Raised platform for the capture zone
    const platformGeo = new THREE.CylinderGeometry(5, 5.5, 0.4, 16);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.9 });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, 0.2, -28);
    platform.receiveShadow = true;
    this.scene.add(platform);

    // Capture zone ring marker (glowing ring on the ground)
    const ringGeo = new THREE.TorusGeometry(5, 0.15, 6, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5,
      roughness: 0.3,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.45, -28);
    this.scene.add(ring);

    // Central banner pole
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 6, 6);
    const pole = new THREE.Mesh(poleGeo, woodMat);
    pole.position.set(0, 3, -28);
    pole.castShadow = true;
    this.scene.add(pole);
    // Banner flag
    const flagGeo = new THREE.PlaneGeometry(1.5, 1);
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.8, 5.5, -28);
    this.scene.add(flag);

    // Keep low walls (short walls around the capture zone)
    addWall(4, 2, 0.5, -5, 1, -28, darkStoneMat);
    addWall(4, 2, 0.5, 5, 1, -28, darkStoneMat);
    addWall(0.5, 2, 6, 0, 1, -31.5, darkStoneMat);

    // ---- Courtyard ground ----
    const courtGeo = new THREE.PlaneGeometry(40, 22);
    const courtMat = new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 0.95 });
    const court = new THREE.Mesh(courtGeo, courtMat);
    court.rotation.x = -Math.PI / 2;
    court.position.set(0, 0.02, -25);
    court.receiveShadow = true;
    this.scene.add(court);

    // Cobblestone path from gate to centre (darker strip)
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x7a7060, roughness: 0.98 });
    const pathGeo = new THREE.PlaneGeometry(5, 14);
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.03, -22);
    path.receiveShadow = true;
    this.scene.add(path);

    // Side corridor floors (left and right routes)
    const sidePathGeo = new THREE.PlaneGeometry(7, 18);
    for (const sx of [-14.5, 14.5]) {
      const sp = new THREE.Mesh(sidePathGeo, pathMat);
      sp.rotation.x = -Math.PI / 2;
      sp.position.set(sx, 0.03, -25);
      sp.receiveShadow = true;
      this.scene.add(sp);
    }

    // ---- Decorative details ----
    // Wooden crates and barrels near inner walls
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x7a5c2e, roughness: 0.85 });
    const crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const barrelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.9, 8);
    const cratePositions = [
      [-8, -20], [-8, -22], [8, -20], [8, -22],
      [-14, -18], [14, -18], [-14, -30], [14, -30],
    ];
    for (const [cx, cz] of cratePositions) {
      if (Math.random() < 0.5) {
        const crate = new THREE.Mesh(crateGeo, crateMat);
        crate.position.set(cx, 0.4, cz);
        crate.rotation.y = Math.random() * 0.3;
        crate.castShadow = true;
        this.scene.add(crate);
      } else {
        const barrel = new THREE.Mesh(barrelGeo, crateMat);
        barrel.position.set(cx, 0.45, cz);
        barrel.castShadow = true;
        this.scene.add(barrel);
      }
    }

    // Torches on inner walls (emissive light sources)
    const torchMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff4400,
      emissiveIntensity: 0.8,
    });
    const torchGeo = new THREE.SphereGeometry(0.15, 4, 4);
    const torchPositions = [
      [-9, 3.5, -23], [9, 3.5, -23],
      [-9, 3.5, -27], [9, 3.5, -27],
      [-18, 5, -20], [18, 5, -20],
      [-18, 5, -30], [18, 5, -30],
    ];
    for (const [tx, ty, tz] of torchPositions) {
      const torch = new THREE.Mesh(torchGeo, torchMat);
      torch.position.set(tx, ty, tz);
      this.scene.add(torch);
      // Torch bracket
      const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4), woodMat);
      bracket.position.set(tx, ty - 0.3, tz);
      this.scene.add(bracket);
      // Point light for torch glow
      const light = new THREE.PointLight(0xff6622, 0.6, 8);
      light.position.set(tx, ty + 0.2, tz);
      this.scene.add(light);
    }

    // Arrow slits in side walls
    const slitMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const slitGeo = new THREE.BoxGeometry(0.15, 1.2, 0.5);
    for (let z = -18; z >= -32; z -= 4) {
      for (const wx of [-19.5, 19.5]) {
        const slit = new THREE.Mesh(slitGeo, slitMat);
        slit.position.set(wx, 4, z);
        this.scene.add(slit);
      }
    }

    // Siege approach ramp (slight slope in front of gate)
    const rampGeo = new THREE.BoxGeometry(6, 0.3, 4);
    const rampMat = new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.95 });
    const ramp = new THREE.Mesh(rampGeo, rampMat);
    ramp.position.set(0, 0.15, -12.5);
    ramp.rotation.x = 0.05;
    ramp.receiveShadow = true;
    this.scene.add(ramp);
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
