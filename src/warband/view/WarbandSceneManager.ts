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
    Math.sin(x * 0.1) * 0.8 +
    Math.cos(z * 0.08) * 0.5 +
    Math.sin(x * 0.05 + z * 0.05) * 1.2 +
    Math.sin(x * 0.03 - z * 0.04) * 0.4
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
    this.canvas.style.pointerEvents = "auto";

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
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
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
      const h = getTerrainHeight(x, y);
      posAttr.setZ(i, h);

      // Height-based color interpolation (like MageWars)
      // Normalize height: terrain range is roughly -2.9 to +2.9
      const maxAmp = 2.9;
      const t = Math.min(1, Math.max(0, (h / maxAmp) * 0.5 + 0.5));

      // Low areas -> darker grass, high areas -> lighter grass
      const col = new THREE.Color();
      col.lerpColors(grassDark, grassLight, t);

      // Add position-based noise for natural variation
      const n = (Math.sin(x * 0.3) * Math.cos(y * 0.25) + 1) * 0.5;
      col.lerpColors(col, grassMid, n * 0.3);

      // Occasional dirt tint in valleys
      const dirtT = Math.max(0, 0.3 - t) * 0.6;
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
    this._addStoneCircle(rng);
    this._addWildflowerPatches(rng);
    this._addTerrainRocks(rng);
    this._addDustMotes(rng);
    this._addGrassPatches(rng);
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

  // ---- Trees: MageWars-style multi-layered cones with bark rings ----------

  private _addTrees(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;

    // Shared geometries for performance (MageWars style)
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.3, 2.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 });
    const trunkDarkMat = new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 0.95 });
    const barkRingGeo = new THREE.TorusGeometry(0.22, 0.03, 4, 8);
    const rootGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.8, 5);

    // Foliage color palettes
    const leafColors = [
      [0x2c5c1e, 0x3a7228],  // deep forest
      [0x3a6e28, 0x4e8c38],  // mid-green
      [0x2e6030, 0x3e7840],  // cool green
      [0x5a7820, 0x6a9030],  // yellow-green
    ];

    // Helper: brighten a color
    const brighten = (c: number, factor: number): number => {
      const r = Math.min(255, ((c >> 16) & 0xff) * factor);
      const g = Math.min(255, ((c >> 8) & 0xff) * factor);
      const b = Math.min(255, (c & 0xff) * factor);
      return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
    };

    for (let i = 0; i < 38; i++) {
      const angle = (i / 38) * Math.PI * 2 + (rng() - 0.5) * 0.35;
      const radius = halfW * 0.90 + rng() * 10;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const h = getTerrainHeight(x, z);

      const tree = new THREE.Group();

      // --- Trunk (MageWars style) ---
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.25;
      trunk.castShadow = true;
      tree.add(trunk);

      // Bark rings (MageWars signature detail)
      for (let br = 0; br < 3; br++) {
        const ring = new THREE.Mesh(barkRingGeo, trunkDarkMat);
        ring.position.y = 0.5 + br * 0.7;
        ring.rotation.x = Math.PI / 2;
        tree.add(ring);
      }

      // Exposed roots (MageWars style)
      for (let r = 0; r < 3; r++) {
        const rootAngle = (r / 3) * Math.PI * 2 + rng() * 0.8;
        const root = new THREE.Mesh(rootGeo, trunkDarkMat);
        root.position.set(Math.cos(rootAngle) * 0.25, 0.15, Math.sin(rootAngle) * 0.25);
        root.rotation.z = Math.PI / 3 * (rng() > 0.5 ? 1 : -1);
        root.rotation.y = rootAngle;
        tree.add(root);
      }

      // --- Multi-layered cone foliage (MageWars style) ---
      const pal = leafColors[Math.floor(rng() * leafColors.length)];
      const leafColor = rng() > 0.5 ? pal[0] : pal[1];
      const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.8 });
      const leafLightMat = new THREE.MeshStandardMaterial({ color: brighten(leafColor, 1.2), roughness: 0.75 });

      // Lower wider cone
      const leafGeo1 = new THREE.ConeGeometry(1.8, 2.0, 8);
      const leaves1 = new THREE.Mesh(leafGeo1, leafMat);
      leaves1.position.y = 3.2;
      leaves1.castShadow = true;
      tree.add(leaves1);

      // Middle cone
      const leafGeo2 = new THREE.ConeGeometry(1.4, 2.2, 8);
      const leaves2 = new THREE.Mesh(leafGeo2, leafLightMat);
      leaves2.position.y = 4.3;
      leaves2.castShadow = true;
      tree.add(leaves2);

      // Top cone
      const leafGeo3 = new THREE.ConeGeometry(0.8, 1.5, 6);
      const leaves3 = new THREE.Mesh(leafGeo3, leafMat);
      leaves3.position.y = 5.3;
      leaves3.castShadow = true;
      tree.add(leaves3);

      tree.position.set(x, h, z);
      tree.scale.setScalar(0.7 + rng() * 0.6);
      tree.rotation.y = rng() * Math.PI * 2;
      this.scene.add(tree);
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

  // ---- Stone circle: ancient monument adding atmosphere ------------------

  private _addStoneCircle(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    // Place one stone circle offset from center
    const cx = (rng() - 0.5) * halfW * 0.8;
    const cz = (rng() - 0.5) * halfD * 0.8;
    const circleR = 2.5 + rng() * 1.5;
    const stoneCount = 5 + Math.floor(rng() * 4);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a8a7a, roughness: 0.96, metalness: 0.02 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x6a6a5a, roughness: 0.98 });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x4a6a2a, roughness: 1.0 });

    for (let i = 0; i < stoneCount; i++) {
      const a = (i / stoneCount) * Math.PI * 2;
      const sx = cx + Math.cos(a) * circleR;
      const sz = cz + Math.sin(a) * circleR;
      const sh = getTerrainHeight(sx, sz);

      const height = 0.8 + rng() * 1.2;
      const width = 0.2 + rng() * 0.3;

      // Standing stone (slightly tapered box with vertex noise)
      const geo = new THREE.BoxGeometry(width, height, width * 0.6);
      const pos = geo.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const n = 0.88 + rng() * 0.24;
        pos.setX(v, pos.getX(v) * n);
        pos.setZ(v, pos.getZ(v) * n);
      }
      geo.computeVertexNormals();

      const mat = rng() < 0.3 ? darkStoneMat : stoneMat;
      const stone = new THREE.Mesh(geo, mat);
      stone.position.set(sx, sh + height * 0.45, sz);
      stone.rotation.y = a + rng() * 0.5;
      // Some lean slightly
      stone.rotation.z = (rng() - 0.5) * 0.15;
      stone.rotation.x = (rng() - 0.5) * 0.1;
      stone.castShadow = true;
      stone.receiveShadow = true;
      this.scene.add(stone);

      // Moss at base
      if (rng() < 0.5) {
        const mGeo = new THREE.SphereGeometry(width * 0.6, 4, 3, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const moss = new THREE.Mesh(mGeo, mossMat);
        moss.position.set(sx, sh + 0.02, sz);
        moss.scale.set(1.2, 0.2, 1.2);
        this.scene.add(moss);
      }
    }

    // Fallen stone (toppled)
    if (rng() < 0.6) {
      const fa = rng() * Math.PI * 2;
      const fx = cx + Math.cos(fa) * circleR * 0.6;
      const fz = cz + Math.sin(fa) * circleR * 0.6;
      const fh = getTerrainHeight(fx, fz);
      const fallenGeo = new THREE.BoxGeometry(0.8, 0.25, 0.35);
      const fallen = new THREE.Mesh(fallenGeo, darkStoneMat);
      fallen.position.set(fx, fh + 0.12, fz);
      fallen.rotation.y = rng() * Math.PI;
      fallen.castShadow = true;
      this.scene.add(fallen);
    }
  }

  // ---- Wildflower patches: clusters of colorful ground flowers -----------

  private _addWildflowerPatches(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    const flowerColors = [0xffee66, 0xff8855, 0xdd66aa, 0x8888dd, 0xffaacc, 0xeedd44];

    for (let p = 0; p < 12; p++) {
      const cx = (rng() - 0.5) * halfW * 1.6;
      const cz = (rng() - 0.5) * halfD * 1.6;
      const patchR = 0.8 + rng() * 1.2;
      const count = 8 + Math.floor(rng() * 12);
      const color = flowerColors[Math.floor(rng() * flowerColors.length)];
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });

      for (let f = 0; f < count; f++) {
        const a = rng() * Math.PI * 2;
        const d = rng() * patchR;
        const fx = cx + Math.cos(a) * d;
        const fz = cz + Math.sin(a) * d;
        const fh = getTerrainHeight(fx, fz);

        const geo = new THREE.SphereGeometry(0.02 + rng() * 0.015, 4, 3);
        const flower = new THREE.Mesh(geo, mat);
        flower.position.set(fx, fh + 0.03 + rng() * 0.06, fz);
        flower.scale.set(1, 0.5, 1);
        this.scene.add(flower);
      }
    }
  }

  // ---- Terrain rocks: scattered small stones adding texture to ground ----

  private _addTerrainRocks(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    const pebbleMats = [
      new THREE.MeshStandardMaterial({ color: 0x999990, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: 0x888878, roughness: 0.97 }),
      new THREE.MeshStandardMaterial({ color: 0x777768, roughness: 0.96 }),
    ];

    for (let i = 0; i < 60; i++) {
      const x = (rng() - 0.5) * halfW * 1.8;
      const z = (rng() - 0.5) * halfD * 1.8;
      const h = getTerrainHeight(x, z);
      const mat = pebbleMats[Math.floor(rng() * pebbleMats.length)];
      const r = 0.02 + rng() * 0.05;

      const geo = new THREE.SphereGeometry(r, 4, 3);
      const pebble = new THREE.Mesh(geo, mat);
      pebble.position.set(x, h + r * 0.3, z);
      pebble.scale.set(1 + rng() * 0.5, 0.4 + rng() * 0.3, 1 + rng() * 0.5);
      pebble.rotation.y = rng() * Math.PI;
      this.scene.add(pebble);
    }
  }

  // ---- Dust motes: floating particles catching the light ----------------

  private _addDustMotes(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    const moteMat = new THREE.MeshBasicMaterial({
      color: 0xffffee,
      transparent: true,
      opacity: 0.15,
    });

    for (let i = 0; i < 40; i++) {
      const x = (rng() - 0.5) * halfW * 1.5;
      const y = 1.0 + rng() * 4.0;
      const z = (rng() - 0.5) * halfD * 1.5;
      const r = 0.01 + rng() * 0.02;

      const geo = new THREE.SphereGeometry(r, 3, 2);
      const mote = new THREE.Mesh(geo, moteMat);
      mote.position.set(x, y, z);
      this.scene.add(mote);
    }
  }

  // ---- Grass patches: larger irregular grass clusters on the ground ------

  private _addGrassPatches(rng: () => number): void {
    const halfW = WB.ARENA_WIDTH / 2;
    const halfD = WB.ARENA_DEPTH / 2;

    const grassMats = [
      new THREE.MeshStandardMaterial({ color: 0x3a6830, roughness: 1.0, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x4a7a38, roughness: 1.0, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x2e5820, roughness: 1.0, side: THREE.DoubleSide }),
    ];

    for (let i = 0; i < 50; i++) {
      const cx = (rng() - 0.5) * halfW * 1.7;
      const cz = (rng() - 0.5) * halfD * 1.7;
      const ch = getTerrainHeight(cx, cz);
      const mat = grassMats[Math.floor(rng() * grassMats.length)];

      // A small cluster of grass blades using thin triangles
      const bladeCount = 4 + Math.floor(rng() * 5);
      for (let b = 0; b < bladeCount; b++) {
        const bx = cx + (rng() - 0.5) * 0.3;
        const bz = cz + (rng() - 0.5) * 0.3;
        const bh = 0.15 + rng() * 0.3;
        const bw = 0.02 + rng() * 0.02;

        const geo = new THREE.BufferGeometry();
        const verts = new Float32Array([
          bx - bw, ch + 0.01, bz,
          bx + bw, ch + 0.01, bz,
          bx + (rng() - 0.5) * 0.03, ch + bh, bz + (rng() - 0.5) * 0.03,
        ]);
        geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
        geo.computeVertexNormals();
        const blade = new THREE.Mesh(geo, mat);
        this.scene.add(blade);
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

    // Inner wall crenellations (tops of inner walls)
    for (let z = -29; z <= -21; z += 2) {
      for (const ix of [-10, 10]) {
        const ic = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.5), darkStoneMat);
        ic.position.set(ix, 5.4, z);
        ic.castShadow = true;
        this.scene.add(ic);
      }
    }

    // ---- Wall interior stone block detail (mortar lines + protruding bricks) ----
    const mortarMat = new THREE.MeshStandardMaterial({ color: 0xaaa898, roughness: 1.0 });
    const mortarThick = 0.07; // thicker mortar lines for visibility
    const brickH = 0.9; // brick row height
    const brickW = 2.2; // brick width
    // Slightly varied brick materials for realism
    const brickMats = [
      new THREE.MeshStandardMaterial({ color: 0x807868, roughness: 0.97, metalness: 0.02 }),
      new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.95, metalness: 0.02 }),
      new THREE.MeshStandardMaterial({ color: 0x787060, roughness: 0.98, metalness: 0.01 }),
      new THREE.MeshStandardMaterial({ color: 0x908878, roughness: 0.93, metalness: 0.03 }),
      new THREE.MeshStandardMaterial({ color: 0x756d5d, roughness: 0.96, metalness: 0.02 }),
    ];
    const pickBrickMat = () => brickMats[Math.floor(Math.random() * brickMats.length)];

    // Helper: draw a full brick pattern on a wall face
    // facing: 'z' = wall faces along z-axis (front/back), 'x' = wall faces along x-axis (sides)
    const drawBrickWall = (
      startX: number, endX: number,
      startY: number, endY: number,
      facePos: number, // z for z-facing walls, x for x-facing walls
      facing: "z" | "x",
      depthDir: number, // +1 or -1: which direction bricks protrude
    ) => {
      const wallWidth = facing === "z" ? (endX - startX) : (endX - startX); // endX/startX are the span coords
      const rows = Math.floor((endY - startY) / brickH);

      for (let row = 0; row < rows; row++) {
        const y = startY + row * brickH;
        const offset = (row % 2 === 0) ? 0 : brickW / 2;
        const spanStart = facing === "z" ? startX : startX;
        const spanEnd = facing === "z" ? endX : endX;

        // Horizontal mortar line
        if (row > 0) {
          if (facing === "z") {
            const hLine = new THREE.Mesh(new THREE.PlaneGeometry(spanEnd - spanStart, mortarThick), mortarMat);
            hLine.position.set((spanStart + spanEnd) / 2, y, facePos);
            this.scene.add(hLine);
          } else {
            const hLine = new THREE.Mesh(new THREE.PlaneGeometry(spanEnd - spanStart, mortarThick), mortarMat);
            hLine.rotation.y = Math.PI / 2;
            hLine.position.set(facePos, y, (spanStart + spanEnd) / 2);
            this.scene.add(hLine);
          }
        }

        // Individual bricks with slight depth protrusion
        let pos = spanStart + offset;
        while (pos < spanEnd) {
          const thisBrickW = Math.min(brickW, spanEnd - pos);
          if (thisBrickW < 0.3) { pos += brickW; continue; }

          // Protruding brick (subtle depth variation)
          const protrusion = 0.02 + Math.random() * 0.06;
          const brickGeo = new THREE.BoxGeometry(
            facing === "z" ? thisBrickW - 0.08 : protrusion,
            brickH - 0.08,
            facing === "z" ? protrusion : thisBrickW - 0.08,
          );
          const brick = new THREE.Mesh(brickGeo, pickBrickMat());
          if (facing === "z") {
            brick.position.set(
              pos + thisBrickW / 2,
              y + brickH / 2,
              facePos + depthDir * protrusion / 2,
            );
          } else {
            brick.position.set(
              facePos + depthDir * protrusion / 2,
              y + brickH / 2,
              pos + thisBrickW / 2,
            );
          }
          brick.castShadow = true;
          brick.receiveShadow = true;
          this.scene.add(brick);

          // Vertical mortar line between bricks
          if (pos > spanStart + 0.1) {
            if (facing === "z") {
              const vLine = new THREE.Mesh(new THREE.PlaneGeometry(mortarThick, brickH), mortarMat);
              vLine.position.set(pos, y + brickH / 2, facePos + depthDir * 0.01);
              this.scene.add(vLine);
            } else {
              const vLine = new THREE.Mesh(new THREE.PlaneGeometry(mortarThick, brickH), mortarMat);
              vLine.rotation.y = Math.PI / 2;
              vLine.position.set(facePos + depthDir * 0.01, y + brickH / 2, pos);
              this.scene.add(vLine);
            }
          }

          pos += brickW;
        }
      }
    };

    // Front wall interior brick pattern (z = -14, facing inward +z)
    // Left section
    drawBrickWall(-19.5, -2.5, 0, wallH, -13.99, "z", 1);
    // Right section
    drawBrickWall(2.5, 19.5, 0, wallH, -13.99, "z", 1);
    // Above gate
    drawBrickWall(-2.5, 2.5, 5, wallH, -13.99, "z", 1);

    // Side walls interior brick patterns
    // Left wall inner face (x = -19, facing +x inside)
    drawBrickWall(-35, -15, 0, wallH, -18.99, "x", 1);
    // Right wall inner face (x = 19, facing -x inside)
    drawBrickWall(-35, -15, 0, wallH, 18.99, "x", -1);

    // Back wall interior brick pattern (z = -34, facing inward +z toward inside)
    drawBrickWall(-20, 20, 0, wallH, -34.0, "z", 1);

    // ---- Weathering stains on walls (dark patches for realism) ----
    const stainMat = new THREE.MeshStandardMaterial({
      color: 0x444438,
      roughness: 1.0,
      transparent: true,
      opacity: 0.3,
    });
    const stainPositions: [number, number, number, number, number, string][] = [
      // [x, y, z, width, height, facing]
      [-15, 1.5, -13.97, 3, 2, "z"],
      [8, 0.8, -13.97, 2.5, 1.5, "z"],
      [-18.97, 2, -20, 2, 3, "x"],
      [18.97, 1.5, -30, 3, 2, "x"],
      [-5, 0.5, -33.98, 4, 1, "z"],
      [12, 1, -33.98, 2, 1.5, "z"],
    ];
    for (const [sx, sy, sz, sw, sh, sf] of stainPositions) {
      const stain = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), stainMat);
      stain.position.set(sx, sy, sz);
      if (sf === "x") stain.rotation.y = Math.PI / 2;
      this.scene.add(stain);
    }

    // ---- Stone lintels above arrow slits (interior side) ----
    const lintelMat = new THREE.MeshStandardMaterial({ color: 0x6a6a5a, roughness: 0.9 });
    for (let z = -18; z >= -32; z -= 4) {
      for (const fx of [-18.85, 18.85]) {
        // Lintel stone above
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.15), lintelMat);
        lintel.position.set(fx, 4.8, z);
        lintel.rotation.y = Math.PI / 2;
        lintel.castShadow = true;
        this.scene.add(lintel);
        // Sill stone below
        const sill = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.12), lintelMat);
        sill.position.set(fx, 3.3, z);
        sill.rotation.y = Math.PI / 2;
        this.scene.add(sill);
      }
    }

    // ---- Wall niches / recesses (small alcoves in back wall) ----
    const nicheMat = new THREE.MeshStandardMaterial({ color: 0x555548, roughness: 0.95 });
    for (const nx of [-16, -8, 8, 16]) {
      // Niche opening (dark recess)
      const nicheBack = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2), nicheMat);
      nicheBack.position.set(nx, 3, -33.95);
      nicheBack.rotation.y = Math.PI;
      this.scene.add(nicheBack);
      // Niche frame stones
      const nfMat = new THREE.MeshStandardMaterial({ color: 0x7a7a6a, roughness: 0.9 });
      // Top
      const nt = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.15, 0.12), nfMat);
      nt.position.set(nx, 3.65, -33.9);
      nt.castShadow = true;
      this.scene.add(nt);
      // Bottom
      const nb = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.15), nfMat);
      nb.position.set(nx, 2.35, -33.9);
      this.scene.add(nb);
      // Left side
      const nl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 0.12), nfMat);
      nl.position.set(nx - 0.45, 3, -33.9);
      this.scene.add(nl);
      // Right side
      const nr = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 0.12), nfMat);
      nr.position.set(nx + 0.45, 3, -33.9);
      this.scene.add(nr);
    }

    // ---- Wall walkway / rampart (interior ledge along outer walls) ----
    const walkwayMat = new THREE.MeshStandardMaterial({ color: 0x7a7a6a, roughness: 0.9 });
    const walkwayH = 5.5; // ledge height
    const walkwayW = 1.5; // ledge depth from wall

    // Front wall walkway (behind the wall, z slightly > -14)
    addWall(36, 0.3, walkwayW, 0, walkwayH, -13.2, walkwayMat);
    // Left wall walkway
    addWall(walkwayW, 0.3, 18, -18.2, walkwayH, -25, walkwayMat);
    // Right wall walkway
    addWall(walkwayW, 0.3, 18, 18.2, walkwayH, -25, walkwayMat);
    // Back wall walkway
    addWall(36, 0.3, walkwayW, 0, walkwayH, -33.8, walkwayMat);

    // Walkway support brackets (corbels) along front wall
    const corbelGeo = new THREE.BoxGeometry(0.4, 0.6, walkwayW);
    for (let x = -17; x <= 17; x += 4) {
      if (Math.abs(x) < 3) continue;
      const corbel = new THREE.Mesh(corbelGeo, wallMat);
      corbel.position.set(x, walkwayH - 0.3, -13.2);
      corbel.castShadow = true;
      this.scene.add(corbel);
    }
    // Brackets along side walls
    for (let z = -17; z >= -33; z -= 4) {
      const cL = new THREE.Mesh(new THREE.BoxGeometry(walkwayW, 0.6, 0.4), wallMat);
      cL.position.set(-18.2, walkwayH - 0.3, z);
      cL.castShadow = true;
      this.scene.add(cL);
      const cR = new THREE.Mesh(new THREE.BoxGeometry(walkwayW, 0.6, 0.4), wallMat);
      cR.position.set(18.2, walkwayH - 0.3, z);
      cR.castShadow = true;
      this.scene.add(cR);
    }
    // Brackets along back wall
    for (let x = -17; x <= 17; x += 4) {
      const cb = new THREE.Mesh(corbelGeo, wallMat);
      cb.position.set(x, walkwayH - 0.3, -33.8);
      cb.castShadow = true;
      this.scene.add(cb);
    }

    // ---- Stairs to walkway (left and right, near front wall) ----
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.95 });
    const stairCount = 8;
    const stairW = 1.5;
    const stairStepH = walkwayH / stairCount;
    const stairStepD = 0.6;
    // Left stair (x ~ -17, z ~ -16 going back)
    for (let s = 0; s < stairCount; s++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(stairW, stairStepH, stairStepD),
        stairMat,
      );
      step.position.set(-17, stairStepH * (s + 0.5), -16.5 - s * stairStepD);
      step.castShadow = true;
      step.receiveShadow = true;
      this.scene.add(step);
    }
    // Right stair
    for (let s = 0; s < stairCount; s++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(stairW, stairStepH, stairStepD),
        stairMat,
      );
      step.position.set(17, stairStepH * (s + 0.5), -16.5 - s * stairStepD);
      step.castShadow = true;
      step.receiveShadow = true;
      this.scene.add(step);
    }

    // ---- Buttresses / pilasters along inner faces of outer walls ----
    const buttressMat = new THREE.MeshStandardMaterial({ color: 0x7a7a6a, roughness: 0.95 });
    const buttressCapMat = new THREE.MeshStandardMaterial({ color: 0x6a6a5a, roughness: 0.9 });
    const buttressGeo = new THREE.BoxGeometry(0.6, wallH * 0.8, 0.8);

    // Helper: add buttress with stone cap and base
    const addButtress = (geo: THREE.BoxGeometry, x: number, y: number, z: number) => {
      const b = new THREE.Mesh(geo, buttressMat);
      b.position.set(x, y, z);
      b.castShadow = true;
      b.receiveShadow = true;
      this.scene.add(b);
      // Stone capital (top cap, wider)
      const params = geo.parameters;
      const capGeo = new THREE.BoxGeometry(params.width + 0.2, 0.2, params.depth + 0.2);
      const cap = new THREE.Mesh(capGeo, buttressCapMat);
      cap.position.set(x, y + params.height / 2 + 0.1, z);
      cap.castShadow = true;
      this.scene.add(cap);
      // Stone base (wider base block)
      const baseGeo = new THREE.BoxGeometry(params.width + 0.15, 0.3, params.depth + 0.15);
      const base = new THREE.Mesh(baseGeo, buttressCapMat);
      base.position.set(x, 0.15, z);
      this.scene.add(base);
    };

    // Left wall buttresses (inside face, x = -18.5)
    for (let z = -18; z >= -32; z -= 4.5) {
      addButtress(buttressGeo, -18.6, wallH * 0.4, z);
    }
    // Right wall buttresses
    for (let z = -18; z >= -32; z -= 4.5) {
      addButtress(buttressGeo, 18.6, wallH * 0.4, z);
    }
    // Back wall buttresses
    const backButtressGeo = new THREE.BoxGeometry(0.8, wallH * 0.8, 0.6);
    for (let x = -15; x <= 15; x += 6) {
      addButtress(backButtressGeo, x, wallH * 0.4, -33.6);
    }
    // Front wall buttresses (inside)
    const frontButtressGeo = new THREE.BoxGeometry(0.8, wallH * 0.7, 0.6);
    for (let x = -16; x <= 16; x += 8) {
      if (Math.abs(x) < 4) continue;
      addButtress(frontButtressGeo, x, wallH * 0.35, -13.6);
    }

    // ---- Stone base course along wall bottoms (plinth) ----
    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x666658, roughness: 0.95 });
    const plinthH = 0.4;
    // Front wall plinth (interior)
    addWall(36, plinthH, 0.15, 0, plinthH / 2, -13.85, plinthMat);
    // Left wall plinth
    addWall(0.15, plinthH, 20, -18.85, plinthH / 2, -25, plinthMat);
    // Right wall plinth
    addWall(0.15, plinthH, 20, 18.85, plinthH / 2, -25, plinthMat);
    // Back wall plinth
    addWall(40, plinthH, 0.15, 0, plinthH / 2, -33.85, plinthMat);

    // ---- String course / horizontal band at mid-height on outer walls (interior) ----
    const stringCourseMat = new THREE.MeshStandardMaterial({ color: 0x7e7e6e, roughness: 0.9 });
    const stringCourseH = wallH * 0.55;
    // Front wall string course
    addWall(36, 0.2, 0.1, 0, stringCourseH, -13.88, stringCourseMat);
    // Left wall
    addWall(0.1, 0.2, 20, -18.88, stringCourseH, -25, stringCourseMat);
    // Right wall
    addWall(0.1, 0.2, 20, 18.88, stringCourseH, -25, stringCourseMat);
    // Back wall
    addWall(40, 0.2, 0.1, 0, stringCourseH, -33.88, stringCourseMat);

    // ---- Lean-to / guard shelters along inside walls ----
    const leantoRoofMat = new THREE.MeshStandardMaterial({
      color: 0x5a4a30,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    // Left wall shelter
    const roofGeoL = new THREE.PlaneGeometry(3, 2.5);
    const roofL = new THREE.Mesh(roofGeoL, leantoRoofMat);
    roofL.position.set(-17.5, 3.2, -20);
    roofL.rotation.z = -0.3;
    roofL.castShadow = true;
    this.scene.add(roofL);
    // Shelter post
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 3, 4);
    const post1 = new THREE.Mesh(postGeo, woodMat);
    post1.position.set(-16.5, 1.5, -19);
    this.scene.add(post1);
    const post2 = new THREE.Mesh(postGeo, woodMat);
    post2.position.set(-16.5, 1.5, -21);
    this.scene.add(post2);

    // Right wall shelter
    const roofR = new THREE.Mesh(roofGeoL, leantoRoofMat);
    roofR.position.set(17.5, 3.2, -20);
    roofR.rotation.z = 0.3;
    roofR.castShadow = true;
    this.scene.add(roofR);
    const post3 = new THREE.Mesh(postGeo, woodMat);
    post3.position.set(16.5, 1.5, -19);
    this.scene.add(post3);
    const post4 = new THREE.Mesh(postGeo, woodMat);
    post4.position.set(16.5, 1.5, -21);
    this.scene.add(post4);

    // ---- Wall-mounted shields / decoration on inner walls ----
    const shieldDecoMat = new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.6, metalness: 0.2 });
    const shieldDecoGeo = new THREE.CircleGeometry(0.35, 8);
    const shieldPositions = [
      [-19.0, 4.5, -22, Math.PI / 2],
      [-19.0, 4.5, -28, Math.PI / 2],
      [19.0, 4.5, -22, -Math.PI / 2],
      [19.0, 4.5, -28, -Math.PI / 2],
      [0, 5.5, -34.0, Math.PI],
      [-8, 5.5, -34.0, Math.PI],
      [8, 5.5, -34.0, Math.PI],
    ];
    for (const [sx, sy, sz, ry] of shieldPositions) {
      const sd = new THREE.Mesh(shieldDecoGeo, shieldDecoMat);
      sd.position.set(sx, sy, sz);
      sd.rotation.y = ry;
      this.scene.add(sd);
      // Shield boss
      const boss = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 4, 3, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xdaa520, roughness: 0.3, metalness: 0.6 }),
      );
      boss.position.set(sx, sy, sz);
      boss.rotation.y = ry;
      this.scene.add(boss);
    }

    // ---- Weapon racks along back wall ----
    // Rack frame
    for (const rx of [-5, 5]) {
      addWall(2, 0.1, 0.3, rx, 2.5, -33.8, woodMat);
      addWall(2, 0.1, 0.3, rx, 1.5, -33.8, woodMat);
      addWall(0.1, 1.2, 0.3, rx - 1, 2, -33.8, woodMat);
      addWall(0.1, 1.2, 0.3, rx + 1, 2, -33.8, woodMat);
      // Weapons on rack (angled sticks)
      for (let i = -0.7; i <= 0.7; i += 0.35) {
        const wpnGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4);
        const wpn = new THREE.Mesh(wpnGeo, barMat);
        wpn.position.set(rx + i, 2, -33.6);
        wpn.rotation.z = 0.15 * (i > 0 ? 1 : -1);
        this.scene.add(wpn);
      }
    }

    // ---- Well in the courtyard (left side) ----
    const wellMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.95 });
    const wellGeo = new THREE.CylinderGeometry(0.8, 0.9, 0.8, 8, 1, true);
    const well = new THREE.Mesh(wellGeo, wellMat);
    well.position.set(-6, 0.4, -18);
    well.castShadow = true;
    this.scene.add(well);
    // Well rim
    const wellRimGeo = new THREE.TorusGeometry(0.85, 0.1, 4, 8);
    const wellRim = new THREE.Mesh(wellRimGeo, wellMat);
    wellRim.rotation.x = -Math.PI / 2;
    wellRim.position.set(-6, 0.85, -18);
    this.scene.add(wellRim);
    // Well water (dark circle inside)
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.2, metalness: 0.3 });
    const waterGeo = new THREE.CircleGeometry(0.7, 8);
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(-6, 0.3, -18);
    this.scene.add(water);
    // Well roof frame
    const wellPostGeo = new THREE.CylinderGeometry(0.05, 0.05, 2, 4);
    const wp1 = new THREE.Mesh(wellPostGeo, woodMat);
    wp1.position.set(-6.6, 1.8, -18);
    this.scene.add(wp1);
    const wp2 = new THREE.Mesh(wellPostGeo, woodMat);
    wp2.position.set(-5.4, 1.8, -18);
    this.scene.add(wp2);
    const wellBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 4), woodMat);
    wellBeam.rotation.z = Math.PI / 2;
    wellBeam.position.set(-6, 2.8, -18);
    this.scene.add(wellBeam);

    // ---- Hay bales near shelters ----
    const hayMat = new THREE.MeshStandardMaterial({ color: 0xc4a84a, roughness: 0.95 });
    const hayPositions = [
      [-16, 0.3, -22.5], [-15.5, 0.3, -22.8],
      [16, 0.3, -22.5], [15.5, 0.3, -22.8],
      [-15, 0.3, -32], [15, 0.3, -32],
    ];
    for (const [hx, hy, hz] of hayPositions) {
      const hay = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 0.7), hayMat);
      hay.position.set(hx, hy, hz);
      hay.rotation.y = Math.random() * 0.5;
      hay.castShadow = true;
      this.scene.add(hay);
    }

    // ---- Stacked logs near back wall ----
    const logMat = new THREE.MeshStandardMaterial({ color: 0x5a3d1e, roughness: 0.9 });
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 4 - row; i++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2, 6), logMat);
        log.rotation.z = Math.PI / 2;
        log.position.set(
          12 + i * 0.32 + row * 0.16,
          0.15 + row * 0.3,
          -33,
        );
        log.castShadow = true;
        this.scene.add(log);
      }
    }

    // ---- Hanging banners on inner walls (tapestries) ----
    const bannerMat1 = new THREE.MeshStandardMaterial({ color: 0x882222, roughness: 0.7, side: THREE.DoubleSide });
    const bannerMat2 = new THREE.MeshStandardMaterial({ color: 0x222288, roughness: 0.7, side: THREE.DoubleSide });
    const bannerGeo = new THREE.PlaneGeometry(1.2, 2.5);
    // Back wall banners
    const bPositions: [number, number, number, THREE.Material][] = [
      [-12, 5, -33.9, bannerMat1],
      [-4, 5, -33.9, bannerMat2],
      [4, 5, -33.9, bannerMat1],
      [12, 5, -33.9, bannerMat2],
    ];
    for (const [bx, by, bz, bmat] of bPositions) {
      const banner = new THREE.Mesh(bannerGeo, bmat);
      banner.position.set(bx, by, bz);
      banner.rotation.y = Math.PI;
      this.scene.add(banner);
      // Banner rod
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 4), barMat);
      rod.rotation.z = Math.PI / 2;
      rod.position.set(bx, by + 1.3, bz);
      this.scene.add(rod);
    }
    // Side wall banners
    const sideBannerGeo = new THREE.PlaneGeometry(1, 2);
    for (const [sbx, sby, sbz, sbry] of [
      [-18.9, 5, -25, Math.PI / 2],
      [18.9, 5, -25, -Math.PI / 2],
    ] as [number, number, number, number][]) {
      const sb = new THREE.Mesh(sideBannerGeo, bannerMat1);
      sb.position.set(sbx, sby, sbz);
      sb.rotation.y = sbry;
      this.scene.add(sb);
    }

    // ---- Gate arch detail (keystone + voussoirs) ----
    const keystoneMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.85 });
    // Keystone at top centre of gate arch
    const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3), keystoneMat);
    keystone.position.set(0, wallH - 0.1, -13.8);
    this.scene.add(keystone);
    // Voussoir stones (arch blocks flanking keystone)
    for (let i = 1; i <= 2; i++) {
      for (const side of [-1, 1]) {
        const vs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.25), keystoneMat);
        vs.position.set(side * i * 0.7, wallH - 0.2 - i * 0.3, -13.8);
        vs.rotation.z = side * i * 0.15;
        this.scene.add(vs);
      }
    }

    // ---- Inner wall stone block detail (full brick pattern) ----
    // Left inner wall: x=-10, both faces
    drawBrickWall(-30, -20, 0, 5, -9.99, "x", 1);   // right face (facing +x)
    drawBrickWall(-30, -20, 0, 5, -10.01, "x", -1);  // left face (facing -x)
    // Right inner wall: x=10, both faces
    drawBrickWall(-30, -20, 0, 5, 9.99, "x", -1);   // left face (facing -x)
    drawBrickWall(-30, -20, 0, 5, 10.01, "x", 1);    // right face (facing +x)

    // Centre barricade brick detail
    drawBrickWall(-3, 3, 0, 3, -21.99, "z", 1);   // front face
    drawBrickWall(-3, 3, 0, 3, -22.01, "z", -1);  // back face

    // ---- Capstones on inner walls (stone capping) ----
    const capstoneMat = new THREE.MeshStandardMaterial({ color: 0x6e6e5e, roughness: 0.9 });
    for (const ix of [-10, 10]) {
      const capGeo = new THREE.BoxGeometry(0.25, 0.2, 10.2);
      const capL = new THREE.Mesh(capGeo, capstoneMat);
      capL.position.set(ix - 0.55, 5.1, -25);
      capL.castShadow = true;
      this.scene.add(capL);
      const capR = new THREE.Mesh(capGeo, capstoneMat);
      capR.position.set(ix + 0.55, 5.1, -25);
      capR.castShadow = true;
      this.scene.add(capR);
    }

    // ---- Keep / centre structure ----
    // Raised platform for the capture zone
    const platformGeo = new THREE.CylinderGeometry(5, 5.5, 0.4, 16);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.9 });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, 0.2, -28);
    platform.receiveShadow = true;
    this.scene.add(platform);

    // Platform edge ring (stone border)
    const platEdge = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.2, 4, 16), wallMat);
    platEdge.rotation.x = -Math.PI / 2;
    platEdge.position.set(0, 0.42, -28);
    this.scene.add(platEdge);

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
    // Second flag (opposite side, different color)
    const flag2Mat = new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.7, side: THREE.DoubleSide });
    const flag2 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), flag2Mat);
    flag2.position.set(-0.7, 5.1, -28);
    this.scene.add(flag2);

    // Keep low walls (short walls around the capture zone)
    addWall(4, 2, 0.5, -5, 1, -28, darkStoneMat);
    addWall(4, 2, 0.5, 5, 1, -28, darkStoneMat);
    addWall(0.5, 2, 6, 0, 1, -31.5, darkStoneMat);
    // Keep pillars at wall junctions
    const pillarGeo = new THREE.CylinderGeometry(0.2, 0.25, 2.5, 6);
    const pillarPositions = [
      [-7, -28], [-3, -28], [3, -28], [7, -28],
      [0, -34], [0, -28.5],
    ];
    for (const [px, pz] of pillarPositions) {
      const pillar = new THREE.Mesh(pillarGeo, wallMat);
      pillar.position.set(px, 1.25, pz);
      pillar.castShadow = true;
      this.scene.add(pillar);
    }

    // ---- Courtyard ground ----
    const courtGeo = new THREE.PlaneGeometry(40, 22);
    const courtMat = new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 0.95 });
    const court = new THREE.Mesh(courtGeo, courtMat);
    court.rotation.x = -Math.PI / 2;
    court.position.set(0, 0.02, -25);
    court.receiveShadow = true;
    this.scene.add(court);

    // ---- Stone floor tiles (visible individual flagstones) ----
    const flagstoneMats = [
      new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.97 }),
      new THREE.MeshStandardMaterial({ color: 0x7e7050, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: 0x958568, roughness: 0.96 }),
      new THREE.MeshStandardMaterial({ color: 0x847458, roughness: 0.98 }),
    ];
    const flagGapMat = new THREE.MeshStandardMaterial({ color: 0x5a5040, roughness: 1.0 });
    const tileSize = 2.0;
    const tileGap = 0.08;
    // Lay flagstones across the courtyard
    for (let tx = -19; tx < 19; tx += tileSize) {
      for (let tz = -34; tz < -15; tz += tileSize) {
        // Skip areas under the keep platform (circular)
        const dx = tx + tileSize / 2;
        const dz = tz + tileSize / 2 + 28;
        if (Math.sqrt(dx * dx + dz * dz) < 5.5) continue;

        const tileH = 0.03 + Math.random() * 0.02; // slight height variation
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(tileSize - tileGap, tileH, tileSize - tileGap),
          flagstoneMats[Math.floor(Math.random() * flagstoneMats.length)],
        );
        tile.position.set(tx + tileSize / 2, tileH / 2 + 0.02, tz + tileSize / 2);
        tile.receiveShadow = true;
        this.scene.add(tile);
      }
    }
    // Floor gap lines (horizontal, along z)
    for (let tx = -19; tx <= 19; tx += tileSize) {
      const gapLine = new THREE.Mesh(
        new THREE.PlaneGeometry(0.06, 19),
        flagGapMat,
      );
      gapLine.rotation.x = -Math.PI / 2;
      gapLine.position.set(tx, 0.055, -24.5);
      this.scene.add(gapLine);
    }
    // Floor gap lines (vertical, along x)
    for (let tz = -34; tz <= -15; tz += tileSize) {
      const gapLine = new THREE.Mesh(
        new THREE.PlaneGeometry(38, 0.06),
        flagGapMat,
      );
      gapLine.rotation.x = -Math.PI / 2;
      gapLine.position.set(0, 0.055, tz);
      this.scene.add(gapLine);
    }

    // Cobblestone path from gate to centre (darker strip with individual stones)
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x7a7060, roughness: 0.98 });
    const pathGeo = new THREE.PlaneGeometry(5, 14);
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.03, -22);
    path.receiveShadow = true;
    this.scene.add(path);
    // Individual cobblestones along the path (slightly raised)
    const cobbleMats = [
      new THREE.MeshStandardMaterial({ color: 0x6a6050, roughness: 0.98 }),
      new THREE.MeshStandardMaterial({ color: 0x5e5848, roughness: 0.97 }),
      new THREE.MeshStandardMaterial({ color: 0x726858, roughness: 0.96 }),
    ];
    for (let pz = -15; pz > -28; pz -= 0.7) {
      for (let px = -2; px <= 2; px += 0.7) {
        const cobH = 0.04 + Math.random() * 0.03;
        const cobW = 0.5 + Math.random() * 0.15;
        const cob = new THREE.Mesh(
          new THREE.BoxGeometry(cobW, cobH, 0.5 + Math.random() * 0.15),
          cobbleMats[Math.floor(Math.random() * cobbleMats.length)],
        );
        cob.position.set(px + (Math.random() - 0.5) * 0.1, cobH / 2 + 0.03, pz + (Math.random() - 0.5) * 0.1);
        cob.rotation.y = Math.random() * 0.15;
        cob.receiveShadow = true;
        this.scene.add(cob);
      }
    }

    // Cobblestone circle around keep platform
    const cobbleRing = new THREE.Mesh(
      new THREE.RingGeometry(5.5, 7, 24),
      new THREE.MeshStandardMaterial({ color: 0x6a6050, roughness: 0.98 }),
    );
    cobbleRing.rotation.x = -Math.PI / 2;
    cobbleRing.position.set(0, 0.025, -28);
    this.scene.add(cobbleRing);

    // Side corridor floors (left and right routes)
    const sidePathGeo = new THREE.PlaneGeometry(7, 18);
    for (const sx of [-14.5, 14.5]) {
      const sp = new THREE.Mesh(sidePathGeo, pathMat);
      sp.rotation.x = -Math.PI / 2;
      sp.position.set(sx, 0.03, -25);
      sp.receiveShadow = true;
      this.scene.add(sp);
    }

    // Drain gutter along base of side walls
    const gutterMat = new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.9 });
    const gutterGeo = new THREE.BoxGeometry(0.3, 0.1, 18);
    for (const gx of [-18.5, 18.5]) {
      const gutter = new THREE.Mesh(gutterGeo, gutterMat);
      gutter.position.set(gx, 0.06, -25);
      this.scene.add(gutter);
    }

    // ---- Decorative details ----
    // Wooden crates and barrels near inner walls
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x7a5c2e, roughness: 0.85 });
    const crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const barrelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.9, 8);
    const cratePositions = [
      [-8, -20], [-8, -22], [8, -20], [8, -22],
      [-14, -18], [14, -18], [-14, -30], [14, -30],
      [-16, -25], [16, -25], [-7, -32], [7, -32],
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
    // Barrel clusters (stacked)
    for (const [bsx, bsz] of [[-15, -26], [15, -26]] as [number, number][]) {
      const b1 = new THREE.Mesh(barrelGeo, crateMat);
      b1.position.set(bsx, 0.45, bsz);
      b1.castShadow = true;
      this.scene.add(b1);
      const b2 = new THREE.Mesh(barrelGeo, crateMat);
      b2.position.set(bsx + 0.6, 0.45, bsz);
      b2.castShadow = true;
      this.scene.add(b2);
      const b3 = new THREE.Mesh(barrelGeo, crateMat);
      b3.position.set(bsx + 0.3, 1.35, bsz);
      b3.castShadow = true;
      this.scene.add(b3);
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
      [-18, 5, -18], [18, 5, -18],
      [-18, 5, -22], [18, 5, -22],
      [-18, 5, -28], [18, 5, -28],
      [-18, 5, -32], [18, 5, -32],
      // Front wall interior
      [-12, 5.5, -13.5], [12, 5.5, -13.5],
      // Back wall interior
      [-10, 5.5, -33.5], [10, 5.5, -33.5], [0, 5.5, -33.5],
    ];
    for (const [tx, ty, tz] of torchPositions) {
      const torch = new THREE.Mesh(torchGeo, torchMat);
      torch.position.set(tx, ty, tz);
      this.scene.add(torch);
      // Torch bracket (iron arm + mounting plate)
      const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4), barMat);
      bracket.position.set(tx, ty - 0.3, tz);
      this.scene.add(bracket);
      const mountPlate = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.05), barMat);
      mountPlate.position.set(tx, ty - 0.1, tz);
      this.scene.add(mountPlate);
      // Point light for torch glow
      const light = new THREE.PointLight(0xff6622, 0.5, 8);
      light.position.set(tx, ty + 0.2, tz);
      this.scene.add(light);
    }

    // Arrow slits in side walls (with stone frame)
    const slitMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const slitGeo = new THREE.BoxGeometry(0.15, 1.2, 0.5);
    const slitFrameGeo = new THREE.BoxGeometry(0.5, 1.5, 0.1);
    for (let z = -18; z >= -32; z -= 4) {
      for (const [wx, frameX] of [
        [-19.5, -18.9],
        [19.5, 18.9],
      ] as [number, number][]) {
        const slit = new THREE.Mesh(slitGeo, slitMat);
        slit.position.set(wx, 4, z);
        this.scene.add(slit);
        // Stone frame around slit (interior side)
        const frame = new THREE.Mesh(slitFrameGeo, keystoneMat);
        frame.position.set(frameX, 4, z);
        frame.rotation.y = Math.PI / 2;
        this.scene.add(frame);
      }
    }

    // Arrow slits in back wall
    for (let x = -15; x <= 15; x += 6) {
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.5), slitMat);
      slit.position.set(x, 4, -34.5);
      slit.rotation.y = Math.PI / 2;
      this.scene.add(slit);
    }

    // ---- Siege approach ramp (slight slope in front of gate) ----
    const rampGeo = new THREE.BoxGeometry(6, 0.3, 4);
    const rampMat = new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.95 });
    const ramp = new THREE.Mesh(rampGeo, rampMat);
    ramp.position.set(0, 0.15, -12.5);
    ramp.rotation.x = 0.05;
    ramp.receiveShadow = true;
    this.scene.add(ramp);

    // ---- Scattered ground debris inside castle ----
    const debrisMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 1.0 });
    const debrisMat2 = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 1.0 });
    for (let i = 0; i < 30; i++) {
      const dx = (Math.random() - 0.5) * 34;
      const dz = -16 - Math.random() * 18;
      const size = 0.1 + Math.random() * 0.25;
      const debris = new THREE.Mesh(
        new THREE.BoxGeometry(size, size * 0.5, size * 0.8),
        Math.random() < 0.5 ? debrisMat : debrisMat2,
      );
      debris.position.set(dx, size * 0.25, dz);
      debris.rotation.y = Math.random() * Math.PI;
      debris.rotation.z = Math.random() * 0.3;
      debris.castShadow = true;
      this.scene.add(debris);
    }
    // Fallen stone blocks near walls (larger rubble)
    const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x807868, roughness: 0.95 });
    const rubblePositions: [number, number, number][] = [
      [-17, 0.2, -17], [16, 0.15, -31], [-14, 0.25, -33],
      [13, 0.2, -16], [-6, 0.15, -33], [3, 0.2, -16],
    ];
    for (const [rx, ry, rz] of rubblePositions) {
      const rw = 0.3 + Math.random() * 0.4;
      const rh = 0.2 + Math.random() * 0.2;
      const rd = 0.3 + Math.random() * 0.3;
      const rubble = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, rd), rubbleMat);
      rubble.position.set(rx, ry, rz);
      rubble.rotation.y = Math.random() * Math.PI;
      rubble.rotation.z = (Math.random() - 0.5) * 0.4;
      rubble.castShadow = true;
      this.scene.add(rubble);
    }

    // ---- Moss / lichen patches at base of walls ----
    const mossMat = new THREE.MeshStandardMaterial({
      color: 0x3a4a2a,
      roughness: 1.0,
      transparent: true,
      opacity: 0.4,
    });
    const mossPositions: [number, number, number, number, number, string][] = [
      [-16, 0.3, -13.96, 2, 0.6, "z"],
      [14, 0.3, -13.96, 1.5, 0.5, "z"],
      [-18.96, 0.4, -22, 0.8, 2.5, "x"],
      [18.96, 0.3, -31, 0.6, 2, "x"],
      [-8, 0.25, -33.96, 3, 0.5, "z"],
      [15, 0.3, -33.96, 2, 0.6, "z"],
    ];
    for (const [mx, my, mz, mw, mh, mf] of mossPositions) {
      const moss = new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), mossMat);
      moss.position.set(mx, my, mz);
      if (mf === "x") moss.rotation.y = Math.PI / 2;
      this.scene.add(moss);
    }

    // ---- Drain/water stain streaks below arrow slits ----
    const drainStainMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a30,
      roughness: 1.0,
      transparent: true,
      opacity: 0.25,
    });
    for (let z = -18; z >= -32; z -= 4) {
      for (const [wx, dir] of [[-18.98, 1], [18.98, -1]] as [number, number][]) {
        const streak = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 2.5), drainStainMat);
        streak.position.set(wx, 2.5, z);
        streak.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        this.scene.add(streak);
      }
    }
  }

  /** Apply weather visual effects. Call after init(). */
  applyWeather(weather: string): void {
    switch (weather) {
      case "rain":
        // Reduce sun intensity by 40%
        this._sunLight.intensity *= 0.6;
        // Blue-grey fog
        this.scene.fog = new THREE.FogExp2(0x555566, 0.015);
        // Darker ambient
        this._ambientLight.color.set(0x606878);
        break;

      case "fog":
        // Heavy fog
        this.scene.fog = new THREE.FogExp2(0x888888, 0.04);
        // Reduce sun intensity by 60%
        this._sunLight.intensity *= 0.4;
        // Reduce ambient intensity
        this._ambientLight.intensity = 0.4;
        break;

      case "night":
        // Very dark ambient
        this._ambientLight.color.set(0x1a1a2a);
        this._ambientLight.intensity = 0.25;
        // Moonlight instead of sun
        this._sunLight.color.set(0x6688cc);
        this._sunLight.intensity = 0.8;
        this._sunLight.position.set(0, 80, 0); // from above
        // Dark fog
        this.scene.fog = new THREE.FogExp2(0x111122, 0.012);
        // Darken scene background for sky dome
        this.scene.background = new THREE.Color(0x0a0a18);
        // Dim hemisphere light
        this._hemiLight.intensity = 0.15;
        break;

      case "clear":
      default:
        // Default lighting — no changes needed
        break;
    }
  }

  /**
   * Apply a map theme — recolors the ground, sky, fog, and lighting.
   * Call after init() but before applyWeather().
   */
  applyMapTheme(theme: {
    groundColors: { dark: number; mid: number; light: number; dirt: number };
    skyColor: number;
    fogColor: number;
    fogDensity: number;
    sunColor: number;
    sunIntensity: number;
    ambientColor: number;
    hemiSky: number;
    hemiGround: number;
    seed: number;
  }): void {
    // Recolor ground vertices
    if (this._ground) {
      const geo = this._ground.geometry;
      const posAttr = geo.attributes.position;
      const colorAttr = geo.attributes.color;
      if (colorAttr) {
        const grassDark = new THREE.Color(theme.groundColors.dark);
        const grassMid = new THREE.Color(theme.groundColors.mid);
        const grassLight = new THREE.Color(theme.groundColors.light);
        const dirtColor = new THREE.Color(theme.groundColors.dirt);
        const maxAmp = 2.9;
        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i);
          const y = posAttr.getY(i);
          const h = getTerrainHeight(x, y);
          const t = Math.min(1, Math.max(0, (h / maxAmp) * 0.5 + 0.5));
          const col = new THREE.Color();
          col.lerpColors(grassDark, grassLight, t);
          const n = (Math.sin(x * 0.3) * Math.cos(y * 0.25) + 1) * 0.5;
          col.lerpColors(col, grassMid, n * 0.3);
          const dirtT = Math.max(0, 0.3 - t) * 0.6;
          col.lerpColors(col, dirtColor, dirtT);
          colorAttr.setXYZ(i, col.r, col.g, col.b);
        }
        colorAttr.needsUpdate = true;
      }
    }

    // Sky / fog
    this.scene.background = new THREE.Color(theme.skyColor);
    this.scene.fog = new THREE.FogExp2(theme.fogColor, theme.fogDensity);

    // Lighting
    this._sunLight.color.set(theme.sunColor);
    this._sunLight.intensity = theme.sunIntensity;
    this._ambientLight.color.set(theme.ambientColor);
    this._hemiLight.color.set(theme.hemiSky);
    this._hemiLight.groundColor.set(theme.hemiGround);
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

  /** Disable pointer events on the canvas so HTML overlays can receive clicks. */
  setCanvasPointerEvents(enabled: boolean): void {
    this.canvas.style.pointerEvents = enabled ? "auto" : "none";
  }

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
