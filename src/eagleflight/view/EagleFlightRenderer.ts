// ---------------------------------------------------------------------------
// Eagle Flight — Three.js renderer
// Merlin on an eagle soaring over the medieval city of Camelot.
// Features: grand castle, city walls, houses, towers, cathedral, market,
// streets, bridges, river, rolling hills, forests, atmospheric sky.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import type { EagleFlightState } from "../state/EagleFlightState";

// Seeded random for deterministic city generation
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---------------------------------------------------------------------------
// EagleFlightRenderer
// ---------------------------------------------------------------------------

export class EagleFlightRenderer {
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _canvas!: HTMLCanvasElement;

  // Lighting
  private _sunLight!: THREE.DirectionalLight;
  private _ambientLight!: THREE.AmbientLight;

  // Sky
  private _skyMesh!: THREE.Mesh;

  // Player — eagle + Merlin
  private _eagleGroup = new THREE.Group();
  private _eagleBody!: THREE.Mesh;
  private _eagleWingL!: THREE.Mesh;
  private _eagleWingR!: THREE.Mesh;
  private _eagleTail!: THREE.Mesh;
  private _eagleHead!: THREE.Mesh;
  private _merlinGroup = new THREE.Group();

  // City elements
  private _castleGroup = new THREE.Group();
  private _cityGroup = new THREE.Group();
  private _wallsGroup = new THREE.Group();
  private _terrainGroup = new THREE.Group();

  // Clouds
  private _cloudGroup = new THREE.Group();

  // Water (river)
  private _riverMesh!: THREE.Mesh;

  // Camera smoothing
  private _camPos = new THREE.Vector3();
  private _camTarget = new THREE.Vector3();

  get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  init(sw: number, sh: number): void {
    // Renderer
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this._renderer.setSize(sw, sh);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.1;
    this._canvas = this._renderer.domElement;
    this._canvas.style.position = "absolute";
    this._canvas.style.top = "0";
    this._canvas.style.left = "0";
    this._canvas.style.zIndex = "0";

    // Scene
    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(0xb8ccdd, 0.0018);

    // Camera
    this._camera = new THREE.PerspectiveCamera(65, sw / sh, 0.5, 800);
    this._camera.position.set(0, 70, -100);
    this._camera.lookAt(0, 40, 0);
    this._camPos.copy(this._camera.position);
    this._camTarget.set(0, 40, 0);

    this._buildLighting();
    this._buildSky();
    this._buildTerrain();
    this._buildRiver();
    this._buildCityWalls();
    this._buildCastle();
    this._buildCity();
    this._buildOutskirts();
    this._buildClouds();
    this._buildPlayer();
  }

  // ---------------------------------------------------------------------------
  // Lighting
  // ---------------------------------------------------------------------------

  private _buildLighting(): void {
    this._ambientLight = new THREE.AmbientLight(0x8899bb, 0.6);
    this._scene.add(this._ambientLight);

    this._sunLight = new THREE.DirectionalLight(0xffeedd, 1.4);
    this._sunLight.position.set(80, 120, -60);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(2048, 2048);
    this._sunLight.shadow.camera.near = 1;
    this._sunLight.shadow.camera.far = 400;
    this._sunLight.shadow.camera.left = -150;
    this._sunLight.shadow.camera.right = 150;
    this._sunLight.shadow.camera.top = 150;
    this._sunLight.shadow.camera.bottom = -150;
    this._sunLight.shadow.bias = -0.001;
    this._scene.add(this._sunLight);
    this._scene.add(this._sunLight.target);

    const hemiLight = new THREE.HemisphereLight(0x99bbff, 0x556633, 0.5);
    this._scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0xffddaa, 0.3);
    rimLight.position.set(-60, 40, 80);
    this._scene.add(rimLight);
  }

  // ---------------------------------------------------------------------------
  // Sky — shader sphere
  // ---------------------------------------------------------------------------

  private _buildSky(): void {
    const skyGeo = new THREE.SphereGeometry(400, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x1a3a6a) },
        midColor: { value: new THREE.Color(0x5588cc) },
        horizonColor: { value: new THREE.Color(0xddeeff) },
        sunColor: { value: new THREE.Color(0xffffcc) },
        sunDir: { value: new THREE.Vector3(0.3, 0.6, -0.4).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        uniform vec3 sunColor;
        uniform vec3 sunDir;
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = dir.y * 0.5 + 0.5;
          vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.3, h));
          col = mix(col, topColor, smoothstep(0.3, 0.8, h));
          // Sun glow
          float sunDot = max(dot(dir, sunDir), 0.0);
          col += sunColor * pow(sunDot, 64.0) * 1.5;
          col += sunColor * pow(sunDot, 8.0) * 0.3;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this._skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(this._skyMesh);
  }

  // ---------------------------------------------------------------------------
  // Terrain — large green ground with hills
  // ---------------------------------------------------------------------------

  private _buildTerrain(): void {
    // Main ground plane
    const groundGeo = new THREE.PlaneGeometry(800, 800, 80, 80);
    groundGeo.rotateX(-Math.PI / 2);
    const posAttr = groundGeo.getAttribute("position");
    const rng = seededRandom(42);
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      // Flat in city center, rolling hills outside
      let h = 0;
      if (dist > 100) {
        h += (dist - 100) * 0.05 * (Math.sin(x * 0.02) * Math.cos(z * 0.03) + 0.5);
        h += Math.sin(x * 0.01 + z * 0.015) * 8;
        h += rng() * 3;
      }
      // Small bumps everywhere
      h += Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.5;
      posAttr.setY(i, h);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x4a7a3a,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    this._terrainGroup.add(ground);

    // Cobblestone area in city center
    const cobbleGeo = new THREE.PlaneGeometry(180, 180, 1, 1);
    cobbleGeo.rotateX(-Math.PI / 2);
    const cobbleMat = new THREE.MeshStandardMaterial({
      color: 0x8a7a6a,
      roughness: 0.95,
      metalness: 0.0,
    });
    const cobble = new THREE.Mesh(cobbleGeo, cobbleMat);
    cobble.position.y = 0.05;
    cobble.receiveShadow = true;
    this._terrainGroup.add(cobble);

    this._scene.add(this._terrainGroup);
  }

  // ---------------------------------------------------------------------------
  // River — winding through the city
  // ---------------------------------------------------------------------------

  private _buildRiver(): void {
    const shape = new THREE.Shape();
    // River path — S-curve through the city
    shape.moveTo(-400, -30);
    shape.bezierCurveTo(-200, -50, -80, 20, 0, 10);
    shape.bezierCurveTo(80, 0, 150, -40, 400, -20);
    shape.lineTo(400, -10);
    shape.bezierCurveTo(150, -30, 80, 10, 0, 20);
    shape.bezierCurveTo(-80, 30, -200, -40, -400, -20);
    shape.closePath();

    const riverGeo = new THREE.ShapeGeometry(shape, 32);
    riverGeo.rotateX(-Math.PI / 2);
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x2255aa,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.75,
    });
    this._riverMesh = new THREE.Mesh(riverGeo, riverMat);
    this._riverMesh.position.y = 0.2;
    this._riverMesh.receiveShadow = true;
    this._scene.add(this._riverMesh);

    // Stone bridges over the river
    this._buildBridge(0, 15, Math.PI / 2);
    this._buildBridge(-60, -35, Math.PI * 0.6);
    this._buildBridge(70, -18, Math.PI * 0.4);
  }

  private _buildBridge(x: number, z: number, rot: number): void {
    const bridgeGroup = new THREE.Group();
    // Bridge deck
    const deckGeo = new THREE.BoxGeometry(8, 1.2, 20);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.85 });
    const deck = new THREE.Mesh(deckGeo, stoneMat);
    deck.position.y = 2;
    deck.castShadow = true;
    bridgeGroup.add(deck);
    // Arches
    for (let i = -1; i <= 1; i++) {
      const archGeo = new THREE.TorusGeometry(3, 0.6, 6, 8, Math.PI);
      const arch = new THREE.Mesh(archGeo, stoneMat);
      arch.position.set(0, 0.5, i * 6);
      arch.rotation.y = Math.PI / 2;
      bridgeGroup.add(arch);
    }
    // Railings
    for (const side of [-1, 1]) {
      const railGeo = new THREE.BoxGeometry(0.4, 1.5, 20);
      const rail = new THREE.Mesh(railGeo, stoneMat);
      rail.position.set(side * 3.8, 3, 0);
      bridgeGroup.add(rail);
    }
    bridgeGroup.position.set(x, 0, z);
    bridgeGroup.rotation.y = rot;
    this._scene.add(bridgeGroup);
  }

  // ---------------------------------------------------------------------------
  // City Walls — encircle the inner city
  // ---------------------------------------------------------------------------

  private _buildCityWalls(): void {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xaa9977, roughness: 0.85 });
    const wallHeight = 8;
    const wallThick = 2;
    const wallRadius = 85;
    const segments = 24;
    const towerRadius = 3.5;
    const towerHeight = 14;

    // Circular wall segments with gaps for gates
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const aMid = (a0 + a1) / 2;

      // Skip wall segment at cardinal directions for gates
      const isGate =
        Math.abs(Math.sin(aMid)) < 0.15 || Math.abs(Math.cos(aMid)) < 0.15;
      if (isGate) continue;

      const x0 = Math.cos(a0) * wallRadius;
      const z0 = Math.sin(a0) * wallRadius;
      const x1 = Math.cos(a1) * wallRadius;
      const z1 = Math.sin(a1) * wallRadius;
      const len = Math.sqrt((x1 - x0) ** 2 + (z1 - z0) ** 2);
      const mx = (x0 + x1) / 2;
      const mz = (z0 + z1) / 2;
      const angle = Math.atan2(x1 - x0, z1 - z0);

      const wallGeo = new THREE.BoxGeometry(wallThick, wallHeight, len);
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(mx, wallHeight / 2, mz);
      wall.rotation.y = angle;
      wall.castShadow = true;
      wall.receiveShadow = true;
      this._wallsGroup.add(wall);

      // Crenellations on top
      const crenCount = Math.floor(len / 2);
      for (let c = 0; c < crenCount; c++) {
        if (c % 2 === 0) continue;
        const t = (c + 0.5) / crenCount - 0.5;
        const cGeo = new THREE.BoxGeometry(wallThick + 0.3, 1.5, 1.2);
        const cren = new THREE.Mesh(cGeo, wallMat);
        const dz = t * len;
        cren.position.set(
          mx + Math.sin(angle + Math.PI / 2) * 0,
          wallHeight + 0.75,
          mz + dz * Math.cos(angle) * 0,
        );
        // Place crenellation relative to wall
        cren.position.set(mx, wallHeight + 0.75, mz);
        const offset = new THREE.Vector3(0, 0, t * len);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        cren.position.add(offset);
        cren.rotation.y = angle;
        this._wallsGroup.add(cren);
      }
    }

    // Towers at regular intervals
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const tx = Math.cos(a) * wallRadius;
      const tz = Math.sin(a) * wallRadius;
      // Tower body
      const towerGeo = new THREE.CylinderGeometry(
        towerRadius,
        towerRadius * 1.1,
        towerHeight,
        8,
      );
      const tower = new THREE.Mesh(towerGeo, wallMat);
      tower.position.set(tx, towerHeight / 2, tz);
      tower.castShadow = true;
      this._wallsGroup.add(tower);
      // Tower roof (cone)
      const roofGeo = new THREE.ConeGeometry(towerRadius * 1.3, 5, 8);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(tx, towerHeight + 2.5, tz);
      roof.castShadow = true;
      this._wallsGroup.add(roof);
    }

    // Gate houses (4 cardinal directions)
    const gateDirs = [
      { x: 0, z: wallRadius, ry: 0 },
      { x: 0, z: -wallRadius, ry: Math.PI },
      { x: wallRadius, z: 0, ry: Math.PI / 2 },
      { x: -wallRadius, z: 0, ry: -Math.PI / 2 },
    ];
    for (const g of gateDirs) {
      this._buildGatehouse(g.x, g.z, g.ry, wallMat);
    }

    this._scene.add(this._wallsGroup);
  }

  private _buildGatehouse(
    x: number,
    z: number,
    ry: number,
    mat: THREE.MeshStandardMaterial,
  ): void {
    const group = new THREE.Group();
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 });

    // Two pillars
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(3, 12, 4),
        mat,
      );
      pillar.position.set(side * 4, 6, 0);
      pillar.castShadow = true;
      group.add(pillar);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(2.5, 4, 4),
        roofMat,
      );
      roof.position.set(side * 4, 14, 0);
      roof.rotation.y = Math.PI / 4;
      group.add(roof);
    }
    // Top beam
    const beam = new THREE.Mesh(new THREE.BoxGeometry(11, 3, 4), mat);
    beam.position.y = 10;
    beam.castShadow = true;
    group.add(beam);

    // Portcullis (dark arch)
    const archMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.9 });
    const arch = new THREE.Mesh(new THREE.BoxGeometry(5, 8, 1), archMat);
    arch.position.set(0, 4, 0);
    group.add(arch);

    group.position.set(x, 0, z);
    group.rotation.y = ry;
    this._wallsGroup.add(group);
  }

  // ---------------------------------------------------------------------------
  // Castle — the grand centerpiece
  // ---------------------------------------------------------------------------

  private _buildCastle(): void {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.75 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.7 });
    const blueRoofMat = new THREE.MeshStandardMaterial({ color: 0x334488, roughness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffcc44,
      roughness: 0.3,
      metalness: 0.8,
    });
    const redBannerMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.7 });

    // Castle positioned on slight hill in center-north of city
    const cx = 0;
    const cz = 30;
    this._castleGroup.position.set(cx, 0, cz);

    // Castle base platform (raised)
    const baseGeo = new THREE.BoxGeometry(60, 3, 50);
    const base = new THREE.Mesh(baseGeo, darkStoneMat);
    base.position.y = 1.5;
    base.castShadow = true;
    base.receiveShadow = true;
    this._castleGroup.add(base);

    // Main keep — tall central tower
    const keepGeo = new THREE.BoxGeometry(18, 30, 18);
    const keep = new THREE.Mesh(keepGeo, stoneMat);
    keep.position.set(0, 18, 0);
    keep.castShadow = true;
    this._castleGroup.add(keep);

    // Keep roof
    const keepRoofGeo = new THREE.ConeGeometry(15, 12, 4);
    const keepRoof = new THREE.Mesh(keepRoofGeo, blueRoofMat);
    keepRoof.position.set(0, 39, 0);
    keepRoof.rotation.y = Math.PI / 4;
    keepRoof.castShadow = true;
    this._castleGroup.add(keepRoof);

    // Gold spire on top
    const spireGeo = new THREE.ConeGeometry(0.8, 8, 6);
    const spire = new THREE.Mesh(spireGeo, goldMat);
    spire.position.set(0, 49, 0);
    this._castleGroup.add(spire);

    // Corner towers (4)
    const cornerOffsets = [
      { x: -25, z: -20 },
      { x: 25, z: -20 },
      { x: -25, z: 20 },
      { x: 25, z: 20 },
    ];
    for (const co of cornerOffsets) {
      const tGeo = new THREE.CylinderGeometry(4, 4.5, 22, 8);
      const tower = new THREE.Mesh(tGeo, stoneMat);
      tower.position.set(co.x, 14, co.z);
      tower.castShadow = true;
      this._castleGroup.add(tower);

      const trGeo = new THREE.ConeGeometry(5, 8, 8);
      const tRoof = new THREE.Mesh(trGeo, blueRoofMat);
      tRoof.position.set(co.x, 29, co.z);
      tRoof.castShadow = true;
      this._castleGroup.add(tRoof);

      // Pennant pole + banner
      const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 6, 4);
      const pole = new THREE.Mesh(poleGeo, darkStoneMat);
      pole.position.set(co.x, 36, co.z);
      this._castleGroup.add(pole);

      const bannerGeo = new THREE.PlaneGeometry(2.5, 4);
      const banner = new THREE.Mesh(bannerGeo, redBannerMat);
      banner.position.set(co.x + 1.5, 36, co.z);
      this._castleGroup.add(banner);
    }

    // Castle walls connecting corners
    const wallPairs = [
      [cornerOffsets[0], cornerOffsets[1]],
      [cornerOffsets[2], cornerOffsets[3]],
      [cornerOffsets[0], cornerOffsets[2]],
      [cornerOffsets[1], cornerOffsets[3]],
    ];
    for (const [a, b] of wallPairs) {
      const mx = (a.x + b.x) / 2;
      const mz = (a.z + b.z) / 2;
      const len = Math.sqrt((b.x - a.x) ** 2 + (b.z - a.z) ** 2);
      const angle = Math.atan2(b.x - a.x, b.z - a.z);
      const cwGeo = new THREE.BoxGeometry(2, 12, len - 8);
      const cw = new THREE.Mesh(cwGeo, stoneMat);
      cw.position.set(mx, 9, mz);
      cw.rotation.y = angle;
      cw.castShadow = true;
      this._castleGroup.add(cw);

      // Crenellations
      const crenCount = Math.floor((len - 8) / 2.5);
      for (let i = 0; i < crenCount; i++) {
        if (i % 2 === 0) continue;
        const t = (i + 0.5) / crenCount - 0.5;
        const cGeo = new THREE.BoxGeometry(2.3, 1.8, 1.4);
        const cren = new THREE.Mesh(cGeo, stoneMat);
        cren.position.set(mx, 16, mz);
        const offset = new THREE.Vector3(0, 0, t * (len - 8));
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        cren.position.add(offset);
        cren.rotation.y = angle;
        this._castleGroup.add(cren);
      }
    }

    // Great Hall — side building
    const hallGeo = new THREE.BoxGeometry(22, 12, 14);
    const hall = new THREE.Mesh(hallGeo, stoneMat);
    hall.position.set(-12, 9, 0);
    hall.castShadow = true;
    this._castleGroup.add(hall);

    // Great Hall pitched roof
    const hallRoofGeo = new THREE.BoxGeometry(24, 1.5, 16);
    const hallRoof = new THREE.Mesh(hallRoofGeo, roofMat);
    hallRoof.position.set(-12, 15.5, 0);
    hallRoof.rotation.z = 0.15;
    this._castleGroup.add(hallRoof);

    // Stained glass windows on great hall (colored rectangles)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x4466cc,
      emissive: 0x223366,
      emissiveIntensity: 0.3,
      roughness: 0.2,
      metalness: 0.5,
    });
    for (let i = -2; i <= 2; i++) {
      const windowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 4),
        glassMat,
      );
      windowMesh.position.set(-23.1, 10, i * 2.8);
      windowMesh.rotation.y = Math.PI / 2;
      this._castleGroup.add(windowMesh);
    }

    // Courtyard well
    const wellGeo = new THREE.CylinderGeometry(1.5, 1.5, 2, 12);
    const well = new THREE.Mesh(wellGeo, darkStoneMat);
    well.position.set(8, 4, -8);
    this._castleGroup.add(well);

    // Well roof
    const wellRoofGeo = new THREE.ConeGeometry(2.5, 2, 6);
    const wellRoof = new THREE.Mesh(wellRoofGeo, roofMat);
    wellRoof.position.set(8, 6.5, -8);
    this._castleGroup.add(wellRoof);

    this._scene.add(this._castleGroup);
  }

  // ---------------------------------------------------------------------------
  // City — houses, cathedral, market, tavern
  // ---------------------------------------------------------------------------

  private _buildCity(): void {
    const rng = seededRandom(1337);

    // House materials
    const houseMats = [
      new THREE.MeshStandardMaterial({ color: 0xddcc99, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0xccbb88, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0xbbaa77, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0xeeddaa, roughness: 0.85 }),
    ];
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.9 });
    const roofMats = [
      new THREE.MeshStandardMaterial({ color: 0x884433, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x774422, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x665533, roughness: 0.8 }),
    ];

    // Generate houses along streets radiating from castle
    const streets = [
      { angle: 0, len: 70 },
      { angle: Math.PI / 2, len: 65 },
      { angle: Math.PI, len: 70 },
      { angle: -Math.PI / 2, len: 65 },
      { angle: Math.PI / 4, len: 55 },
      { angle: -Math.PI / 4, len: 55 },
      { angle: Math.PI * 0.75, len: 55 },
      { angle: -Math.PI * 0.75, len: 55 },
    ];

    // Draw streets as darker ground strips
    const streetMat = new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.95 });
    for (const st of streets) {
      const streetGeo = new THREE.PlaneGeometry(4, st.len);
      streetGeo.rotateX(-Math.PI / 2);
      const street = new THREE.Mesh(streetGeo, streetMat);
      street.position.set(
        Math.sin(st.angle) * (st.len / 2 + 10),
        0.1,
        Math.cos(st.angle) * (st.len / 2 + 10) + 30,
      );
      street.rotation.y = st.angle;
      this._cityGroup.add(street);
    }

    // Houses along each street
    for (const st of streets) {
      const count = Math.floor(st.len / 10);
      for (let i = 0; i < count; i++) {
        for (const side of [-1, 1]) {
          const dist = 15 + i * 9 + rng() * 4;
          const offset = side * (4 + rng() * 3);
          const hx = Math.sin(st.angle) * dist + Math.cos(st.angle) * offset;
          const hz = Math.cos(st.angle) * dist - Math.sin(st.angle) * offset + 30;

          // Skip if too close to castle center
          if (Math.sqrt(hx * hx + (hz - 30) ** 2) < 32) continue;
          // Skip if outside walls
          if (Math.sqrt(hx * hx + hz * hz) > 78) continue;

          const hw = 4 + rng() * 4;
          const hh = 4 + rng() * 5;
          const hd = 4 + rng() * 4;

          this._buildHouse(
            hx, hz, hw, hh, hd,
            st.angle + (rng() - 0.5) * 0.3,
            houseMats[Math.floor(rng() * houseMats.length)],
            timberMat,
            roofMats[Math.floor(rng() * roofMats.length)],
            rng,
          );
        }
      }
    }

    // Cathedral (large church with bell tower) — southeast area
    this._buildCathedral(35, -30);

    // Market square — southwest area
    this._buildMarket(-30, -35);

    // Tavern — east side
    this._buildTavern(45, 10);

    // Blacksmith — west side
    this._buildBlacksmith(-45, 5);

    this._scene.add(this._cityGroup);
  }

  private _buildHouse(
    x: number, z: number,
    w: number, h: number, d: number,
    rot: number,
    wallMat: THREE.MeshStandardMaterial,
    timberMat: THREE.MeshStandardMaterial,
    roofMat: THREE.MeshStandardMaterial,
    rng: () => number,
  ): void {
    const group = new THREE.Group();

    // Main body
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const body = new THREE.Mesh(bodyGeo, wallMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Timber frame accents (cross beams)
    const beamThick = 0.25;
    // Horizontal beam
    const hBeam = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.2, beamThick, beamThick),
      timberMat,
    );
    hBeam.position.y = h * 0.6;
    hBeam.position.z = d / 2 + 0.05;
    group.add(hBeam);
    // Vertical beams
    for (const sx of [-1, 0, 1]) {
      const vBeam = new THREE.Mesh(
        new THREE.BoxGeometry(beamThick, h, beamThick),
        timberMat,
      );
      vBeam.position.set(sx * (w / 2 - 0.5), h / 2, d / 2 + 0.05);
      group.add(vBeam);
    }

    // Pitched roof
    const roofW = w + 1;
    const roofD = d + 1;
    const roofH = h * 0.5;
    const roofGeo = new THREE.ConeGeometry(
      Math.max(roofW, roofD) * 0.7,
      roofH,
      4,
    );
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = h + roofH / 2;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Door
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), doorMat);
    door.position.set(0, 1.1, d / 2 + 0.06);
    group.add(door);

    // Window(s)
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xaaccee,
      emissive: 0x334455,
      emissiveIntensity: 0.15,
    });
    if (w > 5) {
      for (const sx of [-1, 1]) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1), windowMat);
        win.position.set(sx * (w / 2 - 1.2), h * 0.65, d / 2 + 0.06);
        group.add(win);
      }
    }

    // Chimney (sometimes)
    if (rng() > 0.5) {
      const chimGeo = new THREE.BoxGeometry(0.8, 3, 0.8);
      const chim = new THREE.Mesh(chimGeo, new THREE.MeshStandardMaterial({ color: 0x776655 }));
      chim.position.set(w / 2 - 1, h + roofH * 0.3, 0);
      group.add(chim);
    }

    group.position.set(x, 0, z);
    group.rotation.y = rot;
    this._cityGroup.add(group);
  }

  // ---------------------------------------------------------------------------
  // Cathedral
  // ---------------------------------------------------------------------------

  private _buildCathedral(x: number, z: number): void {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xccccbb, roughness: 0.7 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.7 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffdd44,
      roughness: 0.3,
      metalness: 0.7,
    });

    // Main nave
    const naveGeo = new THREE.BoxGeometry(12, 14, 24);
    const nave = new THREE.Mesh(naveGeo, stoneMat);
    nave.position.set(0, 7, 0);
    nave.castShadow = true;
    group.add(nave);

    // Nave roof (triangular prism via scaled box)
    const naveRoofGeo = new THREE.ConeGeometry(10, 6, 4);
    const naveRoof = new THREE.Mesh(naveRoofGeo, roofMat);
    naveRoof.position.set(0, 17, 0);
    naveRoof.rotation.y = Math.PI / 4;
    naveRoof.castShadow = true;
    group.add(naveRoof);

    // Bell tower
    const towerGeo = new THREE.BoxGeometry(6, 28, 6);
    const tower = new THREE.Mesh(towerGeo, stoneMat);
    tower.position.set(0, 14, -14);
    tower.castShadow = true;
    group.add(tower);

    // Bell tower spire
    const spireGeo = new THREE.ConeGeometry(4, 10, 8);
    const spire = new THREE.Mesh(spireGeo, roofMat);
    spire.position.set(0, 33, -14);
    spire.castShadow = true;
    group.add(spire);

    // Cross on top
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.3), goldMat);
    crossV.position.set(0, 40, -14);
    group.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.3, 0.3), goldMat);
    crossH.position.set(0, 39, -14);
    group.add(crossH);

    // Rose window
    const roseMat = new THREE.MeshStandardMaterial({
      color: 0x6644aa,
      emissive: 0x332266,
      emissiveIntensity: 0.4,
    });
    const roseGeo = new THREE.CircleGeometry(2.5, 16);
    const rose = new THREE.Mesh(roseGeo, roseMat);
    rose.position.set(0, 11, 12.05);
    group.add(rose);

    // Flying buttresses
    for (const side of [-1, 1]) {
      const buttGeo = new THREE.BoxGeometry(1, 10, 1.5);
      const butt = new THREE.Mesh(buttGeo, stoneMat);
      butt.position.set(side * 8, 5, -4);
      butt.rotation.z = side * 0.3;
      group.add(butt);

      const buttTop = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1.5), stoneMat);
      buttTop.position.set(side * 7, 9, -4);
      buttTop.rotation.z = side * 0.2;
      group.add(buttTop);
    }

    // Stained glass windows along nave
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xcc4422,
      emissive: 0x662211,
      emissiveIntensity: 0.3,
    });
    for (let i = -3; i <= 3; i++) {
      for (const side of [-1, 1]) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3.5), glassMat);
        win.position.set(side * 6.05, 9, i * 3);
        win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        group.add(win);
      }
    }

    group.position.set(x, 0, z);
    this._cityGroup.add(group);
  }

  // ---------------------------------------------------------------------------
  // Market square
  // ---------------------------------------------------------------------------

  private _buildMarket(x: number, z: number): void {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });

    // Market stalls (covered booths)
    const stallColors = [0xcc3333, 0x3366cc, 0xccaa22, 0x33aa55, 0xaa3388];
    for (let i = 0; i < 5; i++) {
      const stall = new THREE.Group();
      const angle = (i / 5) * Math.PI * 2;
      const sx = Math.cos(angle) * 10;
      const sz = Math.sin(angle) * 10;

      // Posts
      for (const px of [-1.5, 1.5]) {
        for (const pz of [-1, 1]) {
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, 3, 4),
            woodMat,
          );
          post.position.set(px, 1.5, pz);
          stall.add(post);
        }
      }

      // Canopy
      const canopyMat = new THREE.MeshStandardMaterial({
        color: stallColors[i],
        roughness: 0.7,
        side: THREE.DoubleSide,
      });
      const canopy = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), canopyMat);
      canopy.position.y = 3;
      canopy.rotation.x = -Math.PI / 2 + 0.15;
      stall.add(canopy);

      // Counter
      const counter = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 2), woodMat);
      counter.position.y = 1;
      stall.add(counter);

      stall.position.set(sx, 0, sz);
      stall.rotation.y = angle + Math.PI;
      group.add(stall);
    }

    // Central fountain
    const fountainMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5 });
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3.5, 1.5, 12),
      fountainMat,
    );
    basin.position.y = 0.75;
    group.add(basin);

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 4, 8),
      fountainMat,
    );
    pillar.position.y = 3.5;
    group.add(pillar);

    const topBasin = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1, 0.8, 10),
      fountainMat,
    );
    topBasin.position.y = 5.5;
    group.add(topBasin);

    // Water in fountain
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x3388cc,
      transparent: true,
      opacity: 0.6,
    });
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 2.8, 0.1, 12),
      waterMat,
    );
    water.position.y = 1.4;
    group.add(water);

    group.position.set(x, 0, z);
    this._cityGroup.add(group);
  }

  // ---------------------------------------------------------------------------
  // Tavern
  // ---------------------------------------------------------------------------

  private _buildTavern(x: number, z: number): void {
    const group = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xddbb88, roughness: 0.85 });
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x442211, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x775533, roughness: 0.8 });

    // Main building — wider than typical house
    const body = new THREE.Mesh(new THREE.BoxGeometry(10, 7, 8), wallMat);
    body.position.y = 3.5;
    body.castShadow = true;
    group.add(body);

    // Second floor overhang (timber frame style)
    const upper = new THREE.Mesh(new THREE.BoxGeometry(11, 4, 9), wallMat);
    upper.position.y = 9;
    upper.castShadow = true;
    group.add(upper);

    // Timber frame beams
    for (const sx of [-5.5, 0, 5.5]) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 11, 0.3),
        timberMat,
      );
      beam.position.set(sx, 5.5, 4.55);
      group.add(beam);
    }
    for (const sy of [3.5, 7]) {
      const hBeam = new THREE.Mesh(
        new THREE.BoxGeometry(11, 0.3, 0.3),
        timberMat,
      );
      hBeam.position.set(0, sy, 4.55);
      group.add(hBeam);
    }

    // Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(9, 5, 4), roofMat);
    roof.position.y = 13.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Sign
    const signMat = new THREE.MeshStandardMaterial({ color: 0x663311, roughness: 0.9 });
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 0.2), signMat);
    signBoard.position.set(3, 5, 4.2);
    group.add(signBoard);

    // Chimney with smoke hint
    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 4, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x776655 }),
    );
    chimney.position.set(-3, 13, -2);
    group.add(chimney);

    group.position.set(x, 0, z);
    group.rotation.y = -Math.PI / 6;
    this._cityGroup.add(group);
  }

  // ---------------------------------------------------------------------------
  // Blacksmith
  // ---------------------------------------------------------------------------

  private _buildBlacksmith(x: number, z: number): void {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.4,
      metalness: 0.7,
    });

    // Workshop body
    const body = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 7), stoneMat);
    body.position.y = 2.5;
    body.castShadow = true;
    group.add(body);

    // Open front (lean-to roof)
    const roofGeo = new THREE.BoxGeometry(10, 0.4, 9);
    const roof = new THREE.Mesh(roofGeo, woodMat);
    roof.position.set(0, 5.5, 1);
    roof.rotation.x = 0.15;
    roof.castShadow = true;
    group.add(roof);

    // Anvil
    const anvil = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 0.8), metalMat);
    anvil.position.set(2, 1, 5);
    group.add(anvil);
    const anvilTop = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 1), metalMat);
    anvilTop.position.set(2, 1.7, 5);
    group.add(anvilTop);

    // Forge (glowing)
    const forgeMat = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xff3300,
      emissiveIntensity: 0.6,
    });
    const forge = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), stoneMat);
    forge.position.set(-2, 1, 5);
    group.add(forge);
    const embers = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1.5), forgeMat);
    embers.position.set(-2, 2.15, 5);
    group.add(embers);

    // Chimney
    const chimney = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1, 5, 6),
      stoneMat,
    );
    chimney.position.set(-2, 5.5, 5);
    group.add(chimney);

    group.position.set(x, 0, z);
    group.rotation.y = Math.PI / 4;
    this._cityGroup.add(group);
  }

  // ---------------------------------------------------------------------------
  // Outskirts — farms, trees, hills
  // ---------------------------------------------------------------------------

  private _buildOutskirts(): void {
    const rng = seededRandom(999);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.9 });
    const leafMats = [
      new THREE.MeshStandardMaterial({ color: 0x337733, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x448833, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x558844, roughness: 0.8 }),
    ];

    // Trees scattered around outside the walls
    for (let i = 0; i < 300; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 95 + rng() * 200;
      const tx = Math.cos(angle) * dist;
      const tz = Math.sin(angle) * dist;

      // Skip river area approximately
      if (Math.abs(tz + 15) < 15 && dist < 200) continue;

      const trunkH = 3 + rng() * 5;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.5, trunkH, 5),
        treeTrunkMat,
      );
      trunk.position.set(tx, trunkH / 2, tz);
      trunk.castShadow = true;
      this._terrainGroup.add(trunk);

      const leafR = 2 + rng() * 3;
      const leafMat = leafMats[Math.floor(rng() * leafMats.length)];
      const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(leafR, 6, 5),
        leafMat,
      );
      leaves.position.set(tx, trunkH + leafR * 0.6, tz);
      leaves.castShadow = true;
      this._terrainGroup.add(leaves);
    }

    // Farm fields (patches of different colored ground)
    const fieldColors = [0x88aa44, 0xaacc55, 0x99bb33, 0xbbaa44];
    for (let i = 0; i < 12; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 120 + rng() * 80;
      const fx = Math.cos(angle) * dist;
      const fz = Math.sin(angle) * dist;
      const fw = 15 + rng() * 20;
      const fd = 10 + rng() * 15;

      const fieldGeo = new THREE.PlaneGeometry(fw, fd);
      fieldGeo.rotateX(-Math.PI / 2);
      const fieldMat = new THREE.MeshStandardMaterial({
        color: fieldColors[Math.floor(rng() * fieldColors.length)],
        roughness: 0.95,
      });
      const field = new THREE.Mesh(fieldGeo, fieldMat);
      field.position.set(fx, 0.08, fz);
      field.rotation.y = rng() * Math.PI;
      field.receiveShadow = true;
      this._terrainGroup.add(field);

      // Fence around field
      const fenceMat = new THREE.MeshStandardMaterial({ color: 0x665533, roughness: 0.9 });
      for (const side of [-1, 1]) {
        const fence = new THREE.Mesh(new THREE.BoxGeometry(fw, 1, 0.15), fenceMat);
        fence.position.set(fx, 0.5, fz + side * fd / 2);
        fence.rotation.y = rng() * Math.PI;
        this._terrainGroup.add(fence);
      }
    }

    // Windmill
    this._buildWindmill(140, -60);
    this._buildWindmill(-120, 90);
  }

  private _buildWindmill(x: number, z: number): void {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });

    // Tower body (tapered cylinder)
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 4, 12, 8),
      stoneMat,
    );
    body.position.y = 6;
    body.castShadow = true;
    group.add(body);

    // Conical roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(4, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.8 }),
    );
    roof.position.y = 14;
    roof.castShadow = true;
    group.add(roof);

    // Blades (four)
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 0.1), woodMat);
      blade.position.set(0, 4, 0);
      const bladeGroup = new THREE.Group();
      bladeGroup.add(blade);
      bladeGroup.rotation.z = (i / 4) * Math.PI * 2;
      bladeGroup.position.set(0, 11, 3.5);
      group.add(bladeGroup);
    }

    group.position.set(x, 0, z);
    this._terrainGroup.add(group);
  }

  // ---------------------------------------------------------------------------
  // Clouds
  // ---------------------------------------------------------------------------

  private _buildClouds(): void {
    const rng = seededRandom(555);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      transparent: true,
      opacity: 0.7,
    });

    for (let i = 0; i < 40; i++) {
      const cloudCluster = new THREE.Group();
      const cx = (rng() - 0.5) * 500;
      const cy = 80 + rng() * 80;
      const cz = (rng() - 0.5) * 500;

      const puffCount = 3 + Math.floor(rng() * 5);
      for (let p = 0; p < puffCount; p++) {
        const r = 4 + rng() * 8;
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(r, 6, 5),
          cloudMat,
        );
        puff.position.set(
          (rng() - 0.5) * 12,
          (rng() - 0.5) * 4,
          (rng() - 0.5) * 8,
        );
        puff.scale.y = 0.4 + rng() * 0.3;
        cloudCluster.add(puff);
      }

      cloudCluster.position.set(cx, cy, cz);
      this._cloudGroup.add(cloudCluster);
    }
    this._scene.add(this._cloudGroup);
  }

  // ---------------------------------------------------------------------------
  // Player — Eagle + Merlin
  // ---------------------------------------------------------------------------

  private _buildPlayer(): void {
    // --- Eagle ---
    const featherMat = new THREE.MeshStandardMaterial({
      color: 0x885522,
      roughness: 0.7,
    });
    const whiteFeatherMat = new THREE.MeshStandardMaterial({
      color: 0xeeddcc,
      roughness: 0.7,
    });
    const beakMat = new THREE.MeshStandardMaterial({
      color: 0xddaa22,
      roughness: 0.5,
    });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    // Body
    const bodyGeo = new THREE.SphereGeometry(1.2, 8, 6);
    this._eagleBody = new THREE.Mesh(bodyGeo, featherMat);
    this._eagleBody.scale.set(1, 0.6, 1.8);
    this._eagleGroup.add(this._eagleBody);

    // Head
    this._eagleHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 6, 5),
      whiteFeatherMat,
    );
    this._eagleHead.position.set(0, 0.3, -1.8);
    this._eagleGroup.add(this._eagleHead);

    // Beak
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 4), beakMat);
    beak.position.set(0, 0.2, -2.4);
    beak.rotation.x = Math.PI / 2;
    this._eagleGroup.add(beak);

    // Eyes
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4), eyeMat);
      eye.position.set(side * 0.3, 0.4, -2.0);
      this._eagleGroup.add(eye);
    }

    // Wings
    const wingGeo = new THREE.BoxGeometry(4.5, 0.15, 1.8);
    this._eagleWingL = new THREE.Mesh(wingGeo, featherMat);
    this._eagleWingL.position.set(-3, 0, 0);
    this._eagleGroup.add(this._eagleWingL);

    this._eagleWingR = new THREE.Mesh(wingGeo, featherMat);
    this._eagleWingR.position.set(3, 0, 0);
    this._eagleGroup.add(this._eagleWingR);

    // Tail feathers
    this._eagleTail = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.1, 1.5),
      featherMat,
    );
    this._eagleTail.position.set(0, 0, 1.8);
    this._eagleGroup.add(this._eagleTail);

    // Talons
    const talonMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    for (const side of [-1, 1]) {
      const talon = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.5, 4),
        talonMat,
      );
      talon.position.set(side * 0.5, -0.7, 0.3);
      talon.rotation.x = Math.PI;
      this._eagleGroup.add(talon);
    }

    // --- Merlin riding on top ---
    const robeMat = new THREE.MeshStandardMaterial({ color: 0x2233aa, roughness: 0.7 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xddbbaa, roughness: 0.8 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x2233aa, roughness: 0.7 });
    const staffMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.8 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x44aaff,
      emissive: 0x2288ff,
      emissiveIntensity: 0.8,
    });

    // Torso (seated)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.5), robeMat);
    torso.position.y = 1.2;
    this._merlinGroup.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), skinMat);
    head.position.set(0, 1.95, 0);
    this._merlinGroup.add(head);

    // Wizard hat (cone)
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 6), hatMat);
    hat.position.set(0, 2.5, 0);
    hat.rotation.z = 0.1;
    this._merlinGroup.add(hat);

    // Hat brim
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.06, 8),
      hatMat,
    );
    brim.position.set(0, 2.15, 0);
    this._merlinGroup.add(brim);

    // Beard (white)
    const beardMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 });
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 4), beardMat);
    beard.position.set(0, 1.6, -0.25);
    beard.rotation.x = Math.PI;
    this._merlinGroup.add(beard);

    // Staff (held in right hand)
    const staff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 2.5, 4),
      staffMat,
    );
    staff.position.set(0.5, 1.8, -0.2);
    staff.rotation.z = -0.3;
    staff.rotation.x = 0.2;
    this._merlinGroup.add(staff);

    // Staff crystal (glowing orb)
    const crystal = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 5), glowMat);
    crystal.position.set(0.7, 3.0, -0.3);
    this._merlinGroup.add(crystal);

    // Staff point light
    const staffLight = new THREE.PointLight(0x4488ff, 2, 15);
    staffLight.position.set(0.7, 3.0, -0.3);
    this._merlinGroup.add(staffLight);

    // Arms (simplified)
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.7, 0.2),
        robeMat,
      );
      arm.position.set(side * 0.5, 1.3, 0);
      arm.rotation.z = side * 0.3;
      this._merlinGroup.add(arm);
    }

    // Robe bottom (over eagle)
    const robeBottom = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.4, 0.8),
      robeMat,
    );
    robeBottom.position.y = 0.7;
    this._merlinGroup.add(robeBottom);

    this._merlinGroup.position.set(0, 0.3, -0.3);
    this._eagleGroup.add(this._merlinGroup);

    this._eagleGroup.scale.set(1.5, 1.5, 1.5);
    this._scene.add(this._eagleGroup);
  }

  // ---------------------------------------------------------------------------
  // Update (called each frame)
  // ---------------------------------------------------------------------------

  update(state: EagleFlightState, dt: number): void {
    const p = state.player;

    // --- Update eagle position and rotation ---
    this._eagleGroup.position.set(p.position.x, p.position.y, p.position.z);

    // Build rotation from euler angles
    const euler = new THREE.Euler(p.pitch, p.yaw, p.roll, "YXZ");
    this._eagleGroup.setRotationFromEuler(euler);

    // Wing flap animation
    const flapAngle = Math.sin(p.flapPhase) * 0.25;
    if (this._eagleWingL) {
      this._eagleWingL.rotation.z = flapAngle + 0.05;
    }
    if (this._eagleWingR) {
      this._eagleWingR.rotation.z = -flapAngle - 0.05;
    }

    // Tail feathers follow pitch slightly
    if (this._eagleTail) {
      this._eagleTail.rotation.x = p.pitch * 0.3;
    }

    // --- Camera follow ---
    // Camera sits behind and above the eagle, smoothly following
    const camDist = 18;
    const camHeight = 6;

    // Direction the eagle is facing
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyEuler(euler);

    const up = new THREE.Vector3(0, 1, 0);
    up.applyEuler(euler);

    // Target camera position: behind eagle
    const targetCamPos = new THREE.Vector3(
      p.position.x - forward.x * camDist + up.x * camHeight,
      p.position.y - forward.y * camDist + up.y * camHeight,
      p.position.z - forward.z * camDist + up.z * camHeight,
    );

    // Target look-at: ahead of eagle
    const targetLookAt = new THREE.Vector3(
      p.position.x + forward.x * 20,
      p.position.y + forward.y * 10,
      p.position.z + forward.z * 20,
    );

    // Smooth interpolation
    const smoothFactor = 1 - Math.pow(0.02, dt);
    this._camPos.lerp(targetCamPos, smoothFactor);
    this._camTarget.lerp(targetLookAt, smoothFactor);

    // Clamp camera altitude so it doesn't go underground
    if (this._camPos.y < 2) this._camPos.y = 2;

    this._camera.position.copy(this._camPos);
    this._camera.lookAt(this._camTarget);

    // --- Animate clouds slowly ---
    state.gameTime; // just reference
    this._cloudGroup.children.forEach((cloud, i) => {
      cloud.position.x += Math.sin(i * 0.7) * 0.02;
      cloud.position.z += 0.015;
      if (cloud.position.z > 300) cloud.position.z -= 600;
    });

    // --- Sky follows camera ---
    this._skyMesh.position.set(this._camPos.x, 0, this._camPos.z);

    // --- Sun light follows player ---
    this._sunLight.target.position.set(p.position.x, 0, p.position.z);
    this._sunLight.position.set(
      p.position.x + 80,
      120,
      p.position.z - 60,
    );

    // --- Render ---
    this._renderer.render(this._scene, this._camera);
  }

  // ---------------------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------------------

  resize(sw: number, sh: number): void {
    this._camera.aspect = sw / sh;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(sw, sh);
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  destroy(): void {
    this._renderer.dispose();
    if (this._canvas.parentElement) {
      this._canvas.parentElement.removeChild(this._canvas);
    }
  }
}
