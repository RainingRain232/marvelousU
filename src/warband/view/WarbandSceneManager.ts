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

  /** Build a siege castle environment */
  buildSiegeArena(): void {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x888877,
      roughness: 0.95,
      metalness: 0.05,
    });

    const wallGeo = new THREE.BoxGeometry(40, 8, 2);
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 4, -15);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);

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

    const gateGeo = new THREE.BoxGeometry(4, 5, 2.5);
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 });
    const gate = new THREE.Mesh(gateGeo, gateMat);
    gate.position.set(0, 2.5, -15);
    this.scene.add(gate);

    const crenGeo = new THREE.BoxGeometry(1.5, 1.5, 0.5);
    for (let x = -18; x <= 18; x += 3) {
      const cren = new THREE.Mesh(crenGeo, wallMat);
      cren.position.set(x, 8.75, -14);
      cren.castShadow = true;
      this.scene.add(cren);
    }

    const courtGeo = new THREE.PlaneGeometry(30, 20);
    const courtMat = new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 0.95 });
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
