// ---------------------------------------------------------------------------
// Eagle Flight — Three.js renderer
// Merlin on an eagle soaring over the medieval city of Camelot.
// Features: grand castle, city walls, houses, towers, cathedral, market,
// streets, bridges, river, rolling hills, forests, atmospheric sky.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { getTerrainHeight } from "../state/EagleFlightState";
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

  // Walking Merlin (dismounted)
  private _walkingMerlinGroup = new THREE.Group();
  private _walkMerlinLegL!: THREE.Group;
  private _walkMerlinLegR!: THREE.Group;
  private _walkMerlinArmL!: THREE.Group;
  private _walkMerlinArmR!: THREE.Group;
  private _walkMerlinRobeSkirt!: THREE.Mesh;

  // Mount/dismount particles
  private _mountParticles: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }[] = [];

  // City elements
  private _castleGroup = new THREE.Group();
  private _cityGroup = new THREE.Group();
  private _wallsGroup = new THREE.Group();
  private _terrainGroup = new THREE.Group();

  // Clouds
  private _cloudGroup = new THREE.Group();

  // Water (river)
  private _riverMesh!: THREE.Mesh;
  private _waterUniforms!: { time: { value: number } };

  // Particles
  private _dustParticles!: THREE.Points;
  private _birdGroups: { group: THREE.Group; phase: number; cx: number; cz: number; radius: number; speed: number; cy: number }[] = [];
  // Chimney smoke (spawned dynamically in update)
  private _smokeParticles: { mesh: THREE.Mesh; vy: number; life: number }[] = [];

  // Torch lights
  private _torchLights: THREE.PointLight[] = [];
  private _torchMeshes: THREE.Mesh[] = [];

  // Windmill blade groups (for animation)
  private _windmillBladeGroups: THREE.Group[] = [];

  // Banner meshes (for animation)
  private _bannerMeshes: THREE.Mesh[] = [];

  // Eagle trail
  private _trailPoints: THREE.Vector3[] = [];
  private _trailMesh!: THREE.Line;

  // God rays mesh
  private _godRaysMesh!: THREE.Mesh;

  // Checkpoint rings
  private _checkpointMeshes: THREE.Mesh[] = [];
  // Checkpoint collection particles
  private _collectParticles: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }[] = [];

  // Thermal shimmer meshes
  private _thermalShimmers: THREE.Mesh[] = [];

  // Ground effect particles (dust kick-up, water spray)
  private _groundEffectParticles: { mesh: THREE.Mesh; vy: number; life: number }[] = [];

  // Magic orb meshes
  private _orbMeshes: THREE.Mesh[] = [];

  // NPC meshes
  private _npcGroups: THREE.Group[] = [];

  // Spell effect particles
  private _spellParticles: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }[] = [];

  // Magic trail ribbon
  private _magicTrailPoints: THREE.Vector3[] = [];
  private _magicTrailMesh!: THREE.Line;

  // Ground fog
  private _groundFogMeshes: THREE.Mesh[] = [];

  // Lens flare
  private _lensFlareGroup = new THREE.Group();

  // Animated trees (wind sway)
  private _swayTrees: { mesh: THREE.Mesh; baseY: number; phase: number }[] = [];

  // Animated grass (wind)
  private _grassBlades: { mesh: THREE.Mesh; baseX: number; baseZ: number; phase: number }[] = [];

  // Camera smoothing
  private _camPos = new THREE.Vector3();
  private _camTarget = new THREE.Vector3();

  // Dragon meshes
  private _dragonGroups: THREE.Group[] = [];

  // Bird flock meshes
  private _birdMeshes: THREE.Mesh[][] = [];

  // Lightning scorch
  private _scorchMeshes: THREE.Mesh[] = [];

  // Weather fog overlay
  private _weatherFogDensity = 0;

  get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  init(sw: number, sh: number): void {
    // Renderer
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this._renderer.setSize(sw, sh);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.0;
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._canvas = this._renderer.domElement;
    this._canvas.style.position = "absolute";
    this._canvas.style.top = "0";
    this._canvas.style.left = "0";
    this._canvas.style.zIndex = "0";

    // Scene — subtle blue-tinted atmospheric fog
    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(0xc0d4e8, 0.0007);

    // Camera
    this._camera = new THREE.PerspectiveCamera(65, sw / sh, 0.5, 1600);
    this._camera.position.set(0, 70, -100);
    this._camera.lookAt(0, 40, 0);
    this._camPos.copy(this._camera.position);
    this._camTarget.set(0, 40, 0);

    this._buildLighting();
    this._buildSky();
    this._buildGodRays();
    this._buildTerrain();
    // this._buildRiver();
    this._buildCityWalls();
    this._buildCastle();
    this._buildCity();
    this._buildOutskirts();
    this._buildClouds();
    this._buildPlayer();
    this._buildWalkingMerlin();
    this._buildDustParticles();
    this._buildBirds();
    this._buildEagleTrail();
    this._buildGroundFog();
    this._buildLensFlare();
    this._buildCheckpointRings();
    this._buildThermalShimmers();
    this._buildOrbs();
    this._buildNPCs();
    this._buildMagicTrail();
    this._buildDragons();
    this._buildBirdFlocks();
  }

  // ---------------------------------------------------------------------------
  // Lighting
  // ---------------------------------------------------------------------------

  private _buildLighting(): void {
    // Soft ambient base
    this._ambientLight = new THREE.AmbientLight(0x7788aa, 0.35);
    this._scene.add(this._ambientLight);

    // Main sun — warm directional with high-quality shadows
    this._sunLight = new THREE.DirectionalLight(0xfff0dd, 1.8);
    this._sunLight.position.set(80, 120, -60);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(4096, 4096);
    this._sunLight.shadow.camera.near = 1;
    this._sunLight.shadow.camera.far = 600;
    this._sunLight.shadow.camera.left = -250;
    this._sunLight.shadow.camera.right = 250;
    this._sunLight.shadow.camera.top = 250;
    this._sunLight.shadow.camera.bottom = -250;
    this._sunLight.shadow.bias = -0.001;
    this._sunLight.shadow.normalBias = 0.03;
    this._sunLight.shadow.radius = 2;
    this._scene.add(this._sunLight);
    this._scene.add(this._sunLight.target);

    // Hemisphere — sky blue to earthy ground bounce (natural outdoor feel)
    const hemiLight = new THREE.HemisphereLight(0x87b5e0, 0x5a6a3a, 0.6);
    this._scene.add(hemiLight);

    // Warm fill from opposite side (simulates bounce light from terrain)
    const fillLight = new THREE.DirectionalLight(0xffe8cc, 0.2);
    fillLight.position.set(-60, 40, 80);
    this._scene.add(fillLight);

    // Cool rim/back light for depth separation
    const rimLight = new THREE.DirectionalLight(0x8899bb, 0.15);
    rimLight.position.set(0, 30, 100);
    this._scene.add(rimLight);

    // Subtle ground bounce (warm uplight)
    const bounceLight = new THREE.DirectionalLight(0x998866, 0.1);
    bounceLight.position.set(0, -20, 0);
    this._scene.add(bounceLight);
  }

  // ---------------------------------------------------------------------------
  // Sky — shader sphere
  // ---------------------------------------------------------------------------

  private _buildSky(): void {
    const skyGeo = new THREE.SphereGeometry(400, 80, 40);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x0a1e4a) },
        midColor: { value: new THREE.Color(0x3a6eb5) },
        horizonColor: { value: new THREE.Color(0xc8ddf0) },
        sunColor: { value: new THREE.Color(0xfffbe8) },
        sunDir: { value: new THREE.Vector3(0.3, 0.55, -0.4).normalize() },
        time: { value: 0 },
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
        uniform float time;
        varying vec3 vWorldPos;

        // Noise functions for procedural clouds
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0;
          v += noise(p * 1.0) * 0.5;
          v += noise(p * 2.0) * 0.25;
          v += noise(p * 4.0) * 0.125;
          v += noise(p * 8.0) * 0.0625;
          return v;
        }

        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = dir.y * 0.5 + 0.5;

          // Rayleigh-inspired sky gradient (deeper blue zenith, warmer horizon)
          vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.3, h));
          col = mix(col, topColor, smoothstep(0.3, 0.8, h));

          // Warm golden-hour horizon band
          float horizonBand = exp(-pow((h - 0.48) * 7.0, 2.0));
          col = mix(col, vec3(0.95, 0.82, 0.65), horizonBand * 0.35);

          // Sun disc + realistic multi-layer glow
          float sunDot = max(dot(dir, sunDir), 0.0);
          col += sunColor * pow(sunDot, 800.0) * 5.0;  // tight bright core
          col += sunColor * pow(sunDot, 200.0) * 1.5;  // inner corona
          col += sunColor * pow(sunDot, 40.0) * 0.5;   // mid glow
          col += sunColor * pow(sunDot, 8.0) * 0.12;   // outer glow
          col += vec3(1.0, 0.6, 0.3) * pow(sunDot, 3.0) * 0.1; // Mie scattering

          // Horizon haze / aerial perspective
          float haze = 1.0 - smoothstep(0.0, 0.18, abs(dir.y));
          col = mix(col, vec3(0.80, 0.85, 0.90), haze * 0.5);

          // Animated procedural cirrus clouds (3 layers for depth)
          vec2 cloudUV = dir.xz / max(dir.y, 0.01) * 3.0;
          float cirrus = fbm(cloudUV + time * 0.02);
          cirrus = smoothstep(0.4, 0.7, cirrus);
          cirrus *= smoothstep(0.5, 0.65, h) * (1.0 - smoothstep(0.7, 0.9, h));
          // Sun-lit cloud coloring
          float cirrusLit = 0.85 + pow(sunDot, 2.0) * 0.2;
          vec3 cloudCol = mix(vec3(0.9, 0.9, 0.92), vec3(1.0, 0.95, 0.85), pow(sunDot, 3.0));
          col = mix(col, cloudCol * cirrusLit, cirrus * 0.25);

          // Lower wispy cloud layer
          float wisps = fbm(cloudUV * 0.5 - time * 0.015);
          wisps = smoothstep(0.45, 0.65, wisps);
          wisps *= smoothstep(0.35, 0.5, h) * (1.0 - smoothstep(0.55, 0.7, h));
          col = mix(col, vec3(0.92, 0.90, 0.87), wisps * 0.15);

          // Very high altitude thin haze layer
          float highHaze = fbm(cloudUV * 0.2 + time * 0.008);
          highHaze = smoothstep(0.5, 0.7, highHaze);
          highHaze *= smoothstep(0.65, 0.8, h) * (1.0 - smoothstep(0.85, 0.95, h));
          col = mix(col, vec3(0.88, 0.9, 0.95), highHaze * 0.08);

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
    // High-res terrain with procedural shader for multi-biome blending
    const groundGeo = new THREE.PlaneGeometry(1600, 1600, 400, 400);
    groundGeo.rotateX(-Math.PI / 2);
    const posAttr = groundGeo.getAttribute("position");
    const rng = seededRandom(42);

    // Store normals for slope calculation
    const slopes = new Float32Array(posAttr.count);

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      let h = 0;
      if (dist > 100) {
        h += (dist - 100) * 0.05 * (Math.sin(x * 0.02) * Math.cos(z * 0.03) + 0.5);
        h += Math.sin(x * 0.01 + z * 0.015) * 8;
        h += Math.sin(x * 0.035 + z * 0.02) * 4;
        h += Math.sin(x * 0.06 - z * 0.04) * 2;
        h += rng() * 2;
      }
      h += Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.5;
      h += Math.sin(x * 0.05 + z * 0.07) * 1.5;
      posAttr.setY(i, h);
    }
    groundGeo.computeVertexNormals();

    // Compute slope from normals for biome blending
    const normalAttr = groundGeo.getAttribute("normal");
    for (let i = 0; i < normalAttr.count; i++) {
      const ny = normalAttr.getY(i);
      slopes[i] = 1.0 - Math.abs(ny); // 0 = flat, 1 = vertical
    }
    groundGeo.setAttribute("aSlope", new THREE.BufferAttribute(slopes, 1));

    // Terrain — use MeshStandardMaterial with vertex colors for reliable rendering
    // Compute vertex colors based on slope, height, and city proximity
    const vColors = new Float32Array(posAttr.count * 3);
    const grassBase = new THREE.Color(0x3d5e30);
    const grassLight = new THREE.Color(0x4a7038);
    const grassDark = new THREE.Color(0x2e4c1e);
    const dirtColor = new THREE.Color(0x6a5a3a);
    const mudColor = new THREE.Color(0x5a4a30);
    const rockColor = new THREE.Color(0x7a7a6a);
    const cityMudColor = new THREE.Color(0x7a6a50);
    const tmpCol = new THREE.Color();
    const rng2 = seededRandom(77);

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const slope = slopes[i];
      const dist2 = Math.sqrt(vx * vx + vz * vz);
      const noise = rng2();

      // Base: grass with variation
      if (noise < 0.35) tmpCol.copy(grassDark);
      else if (noise < 0.7) tmpCol.copy(grassBase);
      else tmpCol.copy(grassLight);

      // Slope: blend to dirt then rock
      if (slope > 0.15) {
        const dirtFactor = Math.min(1, (slope - 0.15) / 0.25);
        tmpCol.lerp(dirtColor, dirtFactor * 0.7);
      }
      if (slope > 0.35) {
        const rockFactor = Math.min(1, (slope - 0.35) / 0.25);
        tmpCol.lerp(rockColor, rockFactor * 0.6);
      }

      // City center: brown mud/dirt ground
      if (dist2 < 90) {
        const cityFactor = 1 - Math.min(1, dist2 / 90);
        tmpCol.lerp(cityMudColor, cityFactor * 0.7);
        // Add mud variation in city
        if (noise > 0.6) tmpCol.lerp(mudColor, cityFactor * 0.3);
      }

      // Low areas near water: darker
      if (vy < 1) {
        tmpCol.lerp(mudColor, Math.max(0, (1 - vy)) * 0.4);
      }

      // Height: slightly lighter at altitude
      if (vy > 5) {
        tmpCol.lerp(grassLight, Math.min(0.2, (vy - 5) * 0.01));
      }

      vColors[i * 3] = tmpCol.r;
      vColors[i * 3 + 1] = tmpCol.g;
      vColors[i * 3 + 2] = tmpCol.b;
    }
    groundGeo.setAttribute("color", new THREE.BufferAttribute(vColors, 3));

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.0,
      flatShading: false,
      envMapIntensity: 0.3,
    });
    const ground = new THREE.Mesh(groundGeo, terrainMat);
    ground.receiveShadow = true;
    ground.castShadow = true;
    this._terrainGroup.add(ground);

    // City ground — brown mud with brick road strips
    // Main city ground (mud/packed earth, not cobblestone everywhere)
    const cityGroundGeo = new THREE.PlaneGeometry(180, 180, 36, 36);
    cityGroundGeo.rotateX(-Math.PI / 2);
    const cityGroundPos = cityGroundGeo.getAttribute("position");
    const cityColors = new Float32Array(cityGroundPos.count * 3);
    const rng3 = seededRandom(88);
    const mudBase = new THREE.Color(0x6a5a40);
    const mudDark = new THREE.Color(0x554430);
    const mudLight = new THREE.Color(0x7a6a50);
    const brickColor = new THREE.Color(0x887060);
    const tmpCol2 = new THREE.Color();

    for (let i = 0; i < cityGroundPos.count; i++) {
      const cx = cityGroundPos.getX(i);
      const cz = cityGroundPos.getZ(i);
      const n = rng3();

      // Base mud/earth
      if (n < 0.3) tmpCol2.copy(mudDark);
      else if (n < 0.7) tmpCol2.copy(mudBase);
      else tmpCol2.copy(mudLight);

      // Brick roads along main streets (cardinal directions)
      const isMainStreet =
        (Math.abs(cx) < 3 && Math.abs(cz) > 10) ||  // N-S street
        (Math.abs(cz) < 3 && Math.abs(cx) > 10);     // E-W street
      if (isMainStreet) {
        tmpCol2.lerp(brickColor, 0.7);
      }

      // Market area — more worn/darker
      const marketDist = Math.sqrt((cx + 30) ** 2 + (cz + 35) ** 2);
      if (marketDist < 15) {
        tmpCol2.lerp(mudDark, 0.3);
      }

      cityColors[i * 3] = tmpCol2.r;
      cityColors[i * 3 + 1] = tmpCol2.g;
      cityColors[i * 3 + 2] = tmpCol2.b;
    }
    cityGroundGeo.setAttribute("color", new THREE.BufferAttribute(cityColors, 3));
    const cityGroundMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.0,
    });
    const cityGround = new THREE.Mesh(cityGroundGeo, cityGroundMat);
    cityGround.position.y = 0.06;
    cityGround.receiveShadow = true;
    this._terrainGroup.add(cityGround);

    // Grass tufts
    this._buildGrassTufts(rng);

    this._scene.add(this._terrainGroup);
  }

  private _buildGrassTufts(rng: () => number): void {
    // Wind-responsive grass using a shader
    const grassShaderMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        grassColor: { value: new THREE.Color(0x55993a) },
        grassTip: { value: new THREE.Color(0x88cc55) },
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying float vHeight;
        void main() {
          vUv = uv;
          vec3 pos = position;
          // Wind sway — top of blade bends more
          float windStr = uv.y * uv.y; // top of blade
          pos.x += sin(time * 2.5 + pos.x * 0.5 + pos.z * 0.3) * windStr * 0.15;
          pos.z += cos(time * 1.8 + pos.z * 0.4) * windStr * 0.08;
          vHeight = uv.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 grassColor;
        uniform vec3 grassTip;
        varying vec2 vUv;
        varying float vHeight;
        void main() {
          vec3 col = mix(grassColor, grassTip, vHeight);
          // Slight translucency at tips
          float alpha = 0.9 + vHeight * 0.1;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
    });

    const grassDarkShaderMat = grassShaderMat.clone();
    grassDarkShaderMat.uniforms = {
      time: { value: 0 },
      grassColor: { value: new THREE.Color(0x3a7728) },
      grassTip: { value: new THREE.Color(0x66aa44) },
    };

    const grassMats = [grassShaderMat, grassDarkShaderMat];

    for (let i = 0; i < 600; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 30 + rng() * 260;
      const gx = Math.cos(angle) * dist;
      const gz = Math.sin(angle) * dist;
      // River exclusion zone removed (no river)
      if (Math.abs(gx) < 85 && Math.abs(gz) < 85) continue;

      const mat = grassMats[rng() > 0.5 ? 0 : 1];
      const bladeCount = 3 + Math.floor(rng() * 4);
      for (let b = 0; b < bladeCount; b++) {
        const h = 0.5 + rng() * 0.8;
        const bladeGeo = new THREE.PlaneGeometry(0.12, h, 1, 3);
        const blade = new THREE.Mesh(bladeGeo, mat);
        const bx = gx + (rng() - 0.5) * 1;
        const bz = gz + (rng() - 0.5) * 1;
        blade.position.set(bx, h * 0.5, bz);
        blade.rotation.y = rng() * Math.PI;
        this._terrainGroup.add(blade);
        this._grassBlades.push({ mesh: blade, baseX: bx, baseZ: bz, phase: rng() * Math.PI * 2 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // City Walls — encircle the inner city
  // ---------------------------------------------------------------------------

  private _buildCityWalls(): void {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xaa9977, roughness: 0.85, metalness: 0.05 });
    const mortarMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9, metalness: 0.02 });
    const brickDarkMat = new THREE.MeshStandardMaterial({ color: 0x998866, roughness: 0.9 });
    const wallHeight = 8;
    const wallThick = 2;
    const wallRadius = 85;
    const segments = 24;
    const towerRadius = 3.5;
    const towerHeight = 14;
    const wallWalkMat = new THREE.MeshStandardMaterial({ color: 0xaa9977, roughness: 0.85 });

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

      // Horizontal mortar lines (brick coursing) on both faces
      const brickRows = 6;
      for (let row = 0; row < brickRows; row++) {
        const mortarY = 1 + row * (wallHeight / brickRows);
        for (const face of [-1, 1]) {
          const mortarLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.06, len + 0.1),
            mortarMat,
          );
          mortarLine.position.set(mx, mortarY, mz);
          const faceOffset = new THREE.Vector3(face * (wallThick / 2 + 0.01), 0, 0);
          faceOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
          mortarLine.position.add(faceOffset);
          mortarLine.rotation.y = angle;
          this._wallsGroup.add(mortarLine);
        }
        // Vertical brick joints (staggered per row)
        const jointCount = Math.floor(len / 2.5);
        for (let j = 0; j < jointCount; j++) {
          const jt = (j + (row % 2 === 0 ? 0 : 0.5) + 0.5) / jointCount - 0.5;
          if (Math.abs(jt) > 0.48) continue;
          for (const face of [-1, 1]) {
            const joint = new THREE.Mesh(
              new THREE.BoxGeometry(0.02, wallHeight / brickRows - 0.06, 0.06),
              mortarMat,
            );
            joint.position.set(mx, mortarY + wallHeight / brickRows / 2, mz);
            const fo = new THREE.Vector3(face * (wallThick / 2 + 0.01), 0, jt * len);
            fo.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
            joint.position.add(fo);
            joint.rotation.y = angle;
            this._wallsGroup.add(joint);
          }
        }
      }

      // Occasional darker bricks for variation
      const brickRng = seededRandom(Math.floor(mx * 100 + mz * 10));
      for (let db = 0; db < 6; db++) {
        const dbY = 1 + brickRng() * (wallHeight - 1.5);
        const dbT = (brickRng() - 0.5) * 0.9;
        for (const face of [-1, 1]) {
          const darkBrick = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.8, 1.8),
            brickDarkMat,
          );
          darkBrick.position.set(mx, dbY, mz);
          const fo = new THREE.Vector3(face * (wallThick / 2 + 0.01), 0, dbT * len);
          fo.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
          darkBrick.position.add(fo);
          darkBrick.rotation.y = angle;
          this._wallsGroup.add(darkBrick);
        }
      }

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
    const torchFireMat = new THREE.MeshStandardMaterial({
      color: 0xff6622,
      emissive: 0xff4400,
      emissiveIntensity: 0.9,
    });
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const tx = Math.cos(a) * wallRadius;
      const tz = Math.sin(a) * wallRadius;
      // Tower body
      const towerGeo = new THREE.CylinderGeometry(
        towerRadius,
        towerRadius * 1.1,
        towerHeight,
        16,
        2,
      );
      const tower = new THREE.Mesh(towerGeo, wallMat);
      tower.position.set(tx, towerHeight / 2, tz);
      tower.castShadow = true;
      this._wallsGroup.add(tower);

      // Brick course rings on wall towers
      for (let br = 0; br < 7; br++) {
        const brickRing = new THREE.Mesh(
          new THREE.TorusGeometry(towerRadius + 0.02 - br * 0.01, 0.08, 10, 28),
          mortarMat,
        );
        brickRing.position.set(tx, 2 + br * 2, tz);
        brickRing.rotation.x = Math.PI / 2;
        this._wallsGroup.add(brickRing);
        // Vertical brick joints (staggered per row)
        const jointCount = 8;
        for (let bj = 0; bj < jointCount; bj++) {
          const ja = ((bj + (br % 2 === 0 ? 0 : 0.5)) / jointCount) * Math.PI * 2;
          const jx = tx + Math.cos(ja) * (towerRadius + 0.04);
          const jz = tz + Math.sin(ja) * (towerRadius + 0.04);
          const joint = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 1.8, 0.06),
            mortarMat,
          );
          joint.position.set(jx, 2 + br * 2 + 1, jz);
          joint.rotation.y = ja;
          this._wallsGroup.add(joint);
        }
      }

      // Tower parapet with individual merlons
      const parapetRing = new THREE.Mesh(new THREE.CylinderGeometry(towerRadius + 0.3, towerRadius + 0.3, 1, 24), wallMat);
      parapetRing.position.set(tx, towerHeight + 0.5, tz);
      this._wallsGroup.add(parapetRing);
      for (let m = 0; m < 8; m++) {
        if (m % 2 === 0) continue;
        const ma = (m / 8) * Math.PI * 2;
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.8), wallMat);
        merlon.position.set(
          tx + Math.cos(ma) * (towerRadius + 0.3),
          towerHeight + 1.6,
          tz + Math.sin(ma) * (towerRadius + 0.3),
        );
        merlon.rotation.y = ma;
        this._wallsGroup.add(merlon);
      }

      // Tower roof (higher poly cone)
      const roofGeo = new THREE.ConeGeometry(towerRadius * 1.3, 5, 24);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(tx, towerHeight + 3, tz);
      roof.castShadow = true;
      this._wallsGroup.add(roof);

      // Tower window slits
      for (let ws = 0; ws < 4; ws++) {
        const wsa = (ws / 4) * Math.PI * 2;
        const wslit = new THREE.Mesh(
          new THREE.PlaneGeometry(0.15, 1.2),
          new THREE.MeshStandardMaterial({ color: 0x222222 }),
        );
        wslit.position.set(
          tx + Math.cos(wsa) * (towerRadius + 0.02),
          towerHeight * 0.6,
          tz + Math.sin(wsa) * (towerRadius + 0.02),
        );
        wslit.rotation.y = wsa + Math.PI / 2;
        this._wallsGroup.add(wslit);
      }

      // Wall walk platform between towers
      if (i > 0) {
        const prevA = ((i - 1) / segments) * Math.PI * 2;
        const ptx = Math.cos(prevA) * wallRadius;
        const ptz = Math.sin(prevA) * wallRadius;
        const walkLen = Math.sqrt((tx - ptx) ** 2 + (tz - ptz) ** 2);
        if (walkLen < 30) {
          const walkAngle = Math.atan2(tx - ptx, tz - ptz);
          const walk = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.3, walkLen), wallWalkMat);
          walk.position.set((tx + ptx) / 2, wallHeight + 0.15, (tz + ptz) / 2);
          walk.rotation.y = walkAngle;
          this._wallsGroup.add(walk);
        }
      }

      // Torch on every other tower
      if (i % 2 === 0) {
        const tl = new THREE.PointLight(0xff8833, 1.2, 20);
        tl.position.set(tx, towerHeight + 1, tz);
        this._wallsGroup.add(tl);
        this._torchLights.push(tl);
        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), torchFireMat);
        flame.position.set(tx, towerHeight + 0.5, tz);
        this._wallsGroup.add(flame);
        this._torchMeshes.push(flame);
      }
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

    // Guard figures on every 3rd tower
    const guardBodyMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.7 });
    const guardSkinMat = new THREE.MeshStandardMaterial({ color: 0xddbbaa, roughness: 0.8 });
    const guardHelmetMat = new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.5, roughness: 0.4 });
    for (let i = 0; i < segments; i += 3) {
      const a = (i / segments) * Math.PI * 2;
      const gx = Math.cos(a) * wallRadius;
      const gz = Math.sin(a) * wallRadius;
      const guard = new THREE.Group();
      // Body (armor)
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.3), guardBodyMat);
      body.position.y = 0.4;
      guard.add(body);
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), guardSkinMat);
      head.position.y = 0.95;
      guard.add(head);
      // Helmet
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), guardHelmetMat);
      helmet.position.y = 1.0;
      guard.add(helmet);
      // Spear
      const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2, 16), new THREE.MeshStandardMaterial({ color: 0x664422 }));
      spear.position.set(0.25, 0.8, 0);
      guard.add(spear);
      const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 16), guardHelmetMat);
      spearTip.position.set(0.25, 1.9, 0);
      guard.add(spearTip);
      guard.position.set(gx, towerHeight + 1.5, gz);
      guard.rotation.y = a + Math.PI;
      this._wallsGroup.add(guard);
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

    const ghMortarMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9, metalness: 0.02 });

    // Two tower pillars
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(3, 14, 4, 2, 4, 2),
        mat,
      );
      pillar.position.set(side * 4, 7, 0);
      pillar.castShadow = true;
      group.add(pillar);

      // Brick mortar lines on gatehouse pillars
      for (let br = 0; br < 10; br++) {
        const mortarY = 1 + br * 1.3;
        if (mortarY > 13) break;
        // Front and back faces
        for (const fb of [-1, 1]) {
          const mLine = new THREE.Mesh(
            new THREE.BoxGeometry(3.04, 0.05, 0.04),
            ghMortarMat,
          );
          mLine.position.set(side * 4, mortarY, fb * 2.01);
          group.add(mLine);
        }
        // Side faces
        for (const lr of [-1, 1]) {
          const mLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.05, 4.04),
            ghMortarMat,
          );
          mLine.position.set(side * 4 + lr * 1.51, mortarY, 0);
          group.add(mLine);
        }
      }

      // Tower roof
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(2.5, 5, 16),
        roofMat,
      );
      roof.position.set(side * 4, 16.5, 0);
      roof.rotation.y = Math.PI / 4;
      group.add(roof);

      // Crenellations on each pillar
      for (let c = -1; c <= 1; c++) {
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.8), mat);
        merlon.position.set(side * 4 + c * 1, 14.5, 0);
        group.add(merlon);
      }

      // Window slit
      const slitMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
      const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 1.2), slitMat);
      slit.position.set(side * 5.55, 8, 0);
      slit.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(slit);
    }

    // Top connecting beam with machicolations
    const beam = new THREE.Mesh(new THREE.BoxGeometry(11, 3, 4), mat);
    beam.position.y = 11;
    beam.castShadow = true;
    group.add(beam);

    // Machicolation slots under beam
    for (let m = -2; m <= 2; m++) {
      const machSlot = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.3, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x222211 }),
      );
      machSlot.position.set(m * 2, 9.4, 2.1);
      group.add(machSlot);
    }

    // Portcullis (dark arch with iron grate)
    const archMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.9 });
    const arch = new THREE.Mesh(new THREE.BoxGeometry(5, 8, 0.5), archMat);
    arch.position.set(0, 4, 0);
    group.add(arch);
    // Arch top (rounded)
    const archTop = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.3, 10, 20, Math.PI),
      mat,
    );
    archTop.position.set(0, 8, 0);
    archTop.rotation.x = Math.PI / 2;
    group.add(archTop);
    // Iron grate bars
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.4 });
    for (let gb = -3; gb <= 3; gb++) {
      const gBar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 7, 16), ironMat);
      gBar.position.set(gb * 0.7, 3.5, 0.3);
      group.add(gBar);
    }
    // Horizontal bars
    for (let hb = 0; hb < 4; hb++) {
      const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 5, 16), ironMat);
      hBar.position.set(0, 1.5 + hb * 1.8, 0.3);
      hBar.rotation.z = Math.PI / 2;
      group.add(hBar);
    }

    group.position.set(x, 0, z);
    group.rotation.y = ry;
    this._wallsGroup.add(group);
  }

  // ---------------------------------------------------------------------------
  // Castle — the grand centerpiece
  // ---------------------------------------------------------------------------

  private _buildCastle(): void {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.72, metalness: 0.08 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.78, metalness: 0.06 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.7, metalness: 0.08 });
    const blueRoofMat = new THREE.MeshStandardMaterial({ color: 0x334488, roughness: 0.55, metalness: 0.12 });
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

    // Main keep — tall central tower (multi-tier)
    const keepGeo = new THREE.BoxGeometry(18, 30, 18, 6, 8, 6);
    const keep = new THREE.Mesh(keepGeo, stoneMat);
    keep.position.set(0, 18, 0);
    keep.castShadow = true;
    this._castleGroup.add(keep);

    // Stone course ledges on keep (horizontal bands for realism)
    for (let ledge = 0; ledge < 5; ledge++) {
      const ledgeY = 6 + ledge * 6;
      for (let face = 0; face < 4; face++) {
        const faceAngle = (face / 4) * Math.PI * 2;
        const lx = Math.sin(faceAngle) * 9.15;
        const lz = Math.cos(faceAngle) * 9.15;
        const ledgeMesh = new THREE.Mesh(
          new THREE.BoxGeometry(face % 2 === 0 ? 18.5 : 0.4, 0.3, face % 2 === 0 ? 0.4 : 18.5),
          darkStoneMat,
        );
        ledgeMesh.position.set(face % 2 === 0 ? 0 : lx, ledgeY, face % 2 === 0 ? lz : 0);
        this._castleGroup.add(ledgeMesh);
      }
    }

    // Brick mortar lines on keep (finer detail between course ledges)
    const keepMortarMat = new THREE.MeshStandardMaterial({ color: 0xaa9988, roughness: 0.95 });
    const keepBrickDarkMat = new THREE.MeshStandardMaterial({ color: 0xbbaa99, roughness: 0.85 });
    for (let row = 0; row < 20; row++) {
      const mortarY = 4 + row * 1.4;
      if (mortarY > 32) break;
      for (let face = 0; face < 4; face++) {
        const faceAngle = (face / 4) * Math.PI * 2;
        const nx = Math.sin(faceAngle) * 9.08;
        const nz = Math.cos(faceAngle) * 9.08;
        const mortarLine = new THREE.Mesh(
          new THREE.BoxGeometry(face % 2 === 0 ? 18.2 : 0.04, 0.05, face % 2 === 0 ? 0.04 : 18.2),
          keepMortarMat,
        );
        mortarLine.position.set(face % 2 === 0 ? 0 : nx, mortarY, face % 2 === 0 ? nz : 0);
        this._castleGroup.add(mortarLine);

        // Vertical brick joints on this row (staggered)
        const bricksPerRow = 8;
        for (let bj = 0; bj < bricksPerRow; bj++) {
          const bjt = (bj + (row % 2 === 0 ? 0 : 0.5)) / bricksPerRow - 0.5;
          if (Math.abs(bjt) > 0.47) continue;
          const joint = new THREE.Mesh(
            new THREE.BoxGeometry(face % 2 === 0 ? 0.04 : 0.04, 1.3, face % 2 === 0 ? 0.04 : 0.04),
            keepMortarMat,
          );
          const jx = face % 2 === 0 ? bjt * 18 : nx;
          const jz = face % 2 === 0 ? nz : bjt * 18;
          joint.position.set(jx, mortarY + 0.7, jz);
          this._castleGroup.add(joint);
        }
      }
    }

    // Scattered darker bricks on keep for variation
    const keepBrickRng = seededRandom(555);
    for (let face = 0; face < 4; face++) {
      const faceAngle = (face / 4) * Math.PI * 2;
      for (let db = 0; db < 8; db++) {
        const dbY = 5 + keepBrickRng() * 25;
        const dbPos = (keepBrickRng() - 0.5) * 16;
        const darkBrick = new THREE.Mesh(
          new THREE.BoxGeometry(face % 2 === 0 ? 1.8 : 0.06, 1.0, face % 2 === 0 ? 0.06 : 1.8),
          keepBrickDarkMat,
        );
        darkBrick.position.set(
          face % 2 === 0 ? dbPos : Math.sin(faceAngle) * 9.1,
          dbY,
          face % 2 === 0 ? Math.cos(faceAngle) * 9.1 : dbPos,
        );
        this._castleGroup.add(darkBrick);
      }
    }

    // Keep upper parapet
    const keepParapet = new THREE.Mesh(new THREE.BoxGeometry(19, 2, 19, 3, 2, 3), stoneMat);
    keepParapet.position.set(0, 33.5, 0);
    keepParapet.castShadow = true;
    this._castleGroup.add(keepParapet);

    // Keep corner turrets (4 small cylinders on keep top)
    for (const cx2 of [-8, 8]) {
      for (const cz2 of [-8, 8]) {
        const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 8, 20), stoneMat);
        turret.position.set(cx2, 30, cz2);
        turret.castShadow = true;
        this._castleGroup.add(turret);
        const turretRoof = new THREE.Mesh(new THREE.ConeGeometry(2, 3, 20), blueRoofMat);
        turretRoof.position.set(cx2, 35.5, cz2);
        turretRoof.castShadow = true;
        this._castleGroup.add(turretRoof);
        // Turret crenellations
        for (let c = 0; c < 6; c++) {
          const ca = (c / 6) * Math.PI * 2;
          const cren = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.5), stoneMat);
          cren.position.set(cx2 + Math.cos(ca) * 1.7, 34.4, cz2 + Math.sin(ca) * 1.7);
          this._castleGroup.add(cren);
        }
      }
    }

    // Keep roof
    const keepRoofGeo = new THREE.ConeGeometry(15, 12, 16);
    const keepRoof = new THREE.Mesh(keepRoofGeo, blueRoofMat);
    keepRoof.position.set(0, 39, 0);
    keepRoof.rotation.y = Math.PI / 4;
    keepRoof.castShadow = true;
    this._castleGroup.add(keepRoof);

    // Gold spire on top with orb
    const spireGeo = new THREE.ConeGeometry(0.8, 8, 20);
    const spire = new THREE.Mesh(spireGeo, goldMat);
    spire.position.set(0, 49, 0);
    this._castleGroup.add(spire);
    const spireOrb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 14), goldMat);
    spireOrb.position.set(0, 53.5, 0);
    this._castleGroup.add(spireOrb);

    // Decorative buttresses on keep (4 sides)
    for (let side = 0; side < 4; side++) {
      const ba = (side / 4) * Math.PI * 2;
      for (let b = -1; b <= 1; b += 2) {
        const buttress = new THREE.Mesh(new THREE.BoxGeometry(1, 20, 1.5), darkStoneMat);
        const bx = Math.sin(ba) * 9.3 + Math.cos(ba) * b * 5;
        const bz = Math.cos(ba) * 9.3 - Math.sin(ba) * b * 5;
        buttress.position.set(bx, 13, bz);
        buttress.rotation.y = ba;
        buttress.castShadow = true;
        this._castleGroup.add(buttress);
      }
    }

    // Corner towers (4)
    const cornerOffsets = [
      { x: -25, z: -20 },
      { x: 25, z: -20 },
      { x: -25, z: 20 },
      { x: 25, z: 20 },
    ];
    for (const co of cornerOffsets) {
      // Tower body (high poly)
      const tGeo = new THREE.CylinderGeometry(4, 4.5, 22, 32, 10);
      const tower = new THREE.Mesh(tGeo, stoneMat);
      tower.position.set(co.x, 14, co.z);
      tower.castShadow = true;
      this._castleGroup.add(tower);

      // Stone course rings on tower (major)
      for (let sr = 0; sr < 4; sr++) {
        const stoneRing = new THREE.Mesh(
          new THREE.TorusGeometry(4.15 - sr * 0.05, 0.18, 10, 28),
          darkStoneMat,
        );
        stoneRing.position.set(co.x, 5 + sr * 5, co.z);
        stoneRing.rotation.x = Math.PI / 2;
        this._castleGroup.add(stoneRing);
      }
      // Fine brick mortar rings on castle corner towers
      for (let br = 0; br < 14; br++) {
        const brickRing = new THREE.Mesh(
          new THREE.TorusGeometry(4.08, 0.08, 10, 28),
          darkStoneMat,
        );
        brickRing.position.set(co.x, 4 + br * 1.4, co.z);
        brickRing.rotation.x = Math.PI / 2;
        this._castleGroup.add(brickRing);
        // Vertical brick joints (staggered per row)
        const jointCount = 10;
        for (let bj = 0; bj < jointCount; bj++) {
          const ja = ((bj + (br % 2 === 0 ? 0 : 0.5)) / jointCount) * Math.PI * 2;
          const jx = co.x + Math.cos(ja) * 4.1;
          const jz = co.z + Math.sin(ja) * 4.1;
          const joint = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 1.3, 0.06),
            darkStoneMat,
          );
          joint.position.set(jx, 4 + br * 1.4 + 0.7, jz);
          joint.rotation.y = ja;
          this._castleGroup.add(joint);
        }
      }

      // Tower upper parapet ring
      const tParapet = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 1.5, 24), stoneMat);
      tParapet.position.set(co.x, 25.5, co.z);
      this._castleGroup.add(tParapet);

      // Tower crenellations (individual merlons)
      for (let c = 0; c < 10; c++) {
        const ca = (c / 10) * Math.PI * 2;
        if (c % 2 === 0) continue;
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 1.2), stoneMat);
        merlon.position.set(
          co.x + Math.cos(ca) * 4.3,
          27,
          co.z + Math.sin(ca) * 4.3,
        );
        this._castleGroup.add(merlon);
      }

      // Tower roof (higher poly)
      const trGeo = new THREE.ConeGeometry(5, 8, 24);
      const tRoof = new THREE.Mesh(trGeo, blueRoofMat);
      tRoof.position.set(co.x, 31, co.z);
      tRoof.castShadow = true;
      this._castleGroup.add(tRoof);

      // Window openings on tower (arched)
      for (let floor = 0; floor < 3; floor++) {
        const wy = 8 + floor * 6;
        for (let w2 = 0; w2 < 4; w2++) {
          const wa = (w2 / 4) * Math.PI * 2;
          const winMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, emissive: 0x886633, emissiveIntensity: 0.15 });
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.5), winMat);
          win.position.set(co.x + Math.cos(wa) * 4.05, wy, co.z + Math.sin(wa) * 4.05);
          win.rotation.y = wa + Math.PI / 2;
          this._castleGroup.add(win);
        }
      }

      // Pennant pole + banner
      const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 8, 16);
      const pole = new THREE.Mesh(poleGeo, darkStoneMat);
      pole.position.set(co.x, 39, co.z);
      this._castleGroup.add(pole);

      const bannerGeo = new THREE.PlaneGeometry(2.5, 4, 4, 6);
      const banner = new THREE.Mesh(bannerGeo, redBannerMat);
      banner.position.set(co.x + 1.5, 38, co.z);
      this._castleGroup.add(banner);
      this._bannerMeshes.push(banner);
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

      // Brick mortar lines on castle connecting walls
      const cwMortarMat = new THREE.MeshStandardMaterial({ color: 0xaa9988, roughness: 0.95 });
      for (let row = 0; row < 8; row++) {
        const mortarY = 4 + row * 1.4;
        if (mortarY > 14) break;
        for (const face of [-1, 1]) {
          const mLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.05, len - 8),
            cwMortarMat,
          );
          mLine.position.set(mx, mortarY, mz);
          const fo = new THREE.Vector3(face * 1.01, 0, 0);
          fo.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
          mLine.position.add(fo);
          mLine.rotation.y = angle;
          this._castleGroup.add(mLine);
        }
        // Vertical joints
        const jointCount = Math.floor((len - 8) / 2.5);
        for (let j = 0; j < jointCount; j++) {
          const jt = (j + (row % 2 === 0 ? 0 : 0.5) + 0.5) / jointCount - 0.5;
          if (Math.abs(jt) > 0.47) continue;
          for (const face of [-1, 1]) {
            const joint = new THREE.Mesh(
              new THREE.BoxGeometry(0.04, 1.3, 0.05),
              cwMortarMat,
            );
            joint.position.set(mx, mortarY + 0.7, mz);
            const fo = new THREE.Vector3(face * 1.01, 0, jt * (len - 8));
            fo.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
            joint.position.add(fo);
            joint.rotation.y = angle;
            this._castleGroup.add(joint);
          }
        }
      }

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

    // Brick mortar lines on Great Hall
    const hallMortarMat = new THREE.MeshStandardMaterial({ color: 0xaa9988, roughness: 0.95 });
    for (let row = 0; row < 8; row++) {
      const mortarY = 4 + row * 1.4;
      if (mortarY > 14) break;
      // Front and back faces (z-facing)
      for (const fb of [-1, 1]) {
        const mLine = new THREE.Mesh(
          new THREE.BoxGeometry(22.04, 0.05, 0.04),
          hallMortarMat,
        );
        mLine.position.set(-12, mortarY, fb * 7.01);
        this._castleGroup.add(mLine);
      }
      // Side faces (x-facing)
      for (const lr of [-1, 1]) {
        const mLine = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.05, 14.04),
          hallMortarMat,
        );
        mLine.position.set(-12 + lr * 11.01, mortarY, 0);
        this._castleGroup.add(mLine);
      }
    }

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
    const wellGeo = new THREE.CylinderGeometry(1.5, 1.5, 2, 20);
    const well = new THREE.Mesh(wellGeo, darkStoneMat);
    well.position.set(8, 4, -8);
    this._castleGroup.add(well);

    // Well roof
    const wellRoofGeo = new THREE.ConeGeometry(2.5, 2, 16);
    const wellRoof = new THREE.Mesh(wellRoofGeo, roofMat);
    wellRoof.position.set(8, 6.5, -8);
    this._castleGroup.add(wellRoof);

    // --- Drawbridge (south side) ---
    const drawbridgeMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.88, metalness: 0.03 });
    const drawbridge = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 8), drawbridgeMat);
    drawbridge.position.set(0, 1, -34);
    this._castleGroup.add(drawbridge);
    // Chains
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.3 });
    for (const side of [-1, 1]) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 16), chainMat);
      chain.position.set(side * 2.5, 4, -30);
      chain.rotation.z = side * 0.4;
      this._castleGroup.add(chain);
    }

    // --- Courtyard gardens ---
    const flowerColors = [0xff4466, 0xffaa22, 0xff66aa, 0xaa44ff, 0x44aaff, 0xffff44];
    const gardenRng = seededRandom(777);
    const gardenPositions = [
      { x: 15, z: -12 }, { x: -15, z: -12 },
      { x: 15, z: 10 }, { x: -15, z: 10 },
    ];
    for (const gp of gardenPositions) {
      // Flower bed border
      const bedGeo = new THREE.BoxGeometry(8, 0.3, 6);
      const bedMat = new THREE.MeshStandardMaterial({ color: 0x3a5520, roughness: 0.95 });
      const bed = new THREE.Mesh(bedGeo, bedMat);
      bed.position.set(gp.x, 3.15, gp.z);
      this._castleGroup.add(bed);
      // Flowers
      for (let f = 0; f < 12; f++) {
        const flowerMat = new THREE.MeshStandardMaterial({
          color: flowerColors[Math.floor(gardenRng() * flowerColors.length)],
          emissive: flowerColors[Math.floor(gardenRng() * flowerColors.length)],
          emissiveIntensity: 0.1,
        });
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), flowerMat);
        flower.position.set(
          gp.x + (gardenRng() - 0.5) * 6,
          3.6,
          gp.z + (gardenRng() - 0.5) * 4,
        );
        this._castleGroup.add(flower);
        // Stem
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 0.4, 16),
          new THREE.MeshStandardMaterial({ color: 0x2a6618 }),
        );
        stem.position.set(flower.position.x, 3.4, flower.position.z);
        this._castleGroup.add(stem);
      }
    }

    // --- Torches on castle corners ---
    const torchMat = new THREE.MeshStandardMaterial({
      color: 0xff6622,
      emissive: 0xff4400,
      emissiveIntensity: 0.9,
    });
    for (const co of cornerOffsets) {
      const torchLight = new THREE.PointLight(0xff8833, 1.5, 25);
      torchLight.position.set(co.x, 26, co.z);
      this._castleGroup.add(torchLight);
      this._torchLights.push(torchLight);
      const torchFlame = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), torchMat);
      torchFlame.position.set(co.x, 25.5, co.z);
      this._castleGroup.add(torchFlame);
      this._torchMeshes.push(torchFlame);
    }

    // --- Royal standard (large banner on keep) ---
    const standardMat = new THREE.MeshStandardMaterial({
      color: 0xcc0000,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });
    const standard = new THREE.Mesh(new THREE.PlaneGeometry(5, 8), standardMat);
    standard.position.set(3, 38, 9.1);
    this._castleGroup.add(standard);
    this._bannerMeshes.push(standard);

    // --- Inner ward buildings ---
    // Barracks (long building, west side)
    const barracksMat = new THREE.MeshStandardMaterial({ color: 0xbbaa88, roughness: 0.8 });
    const barracks = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 6), barracksMat);
    barracks.position.set(18, 6, -5);
    barracks.castShadow = true;
    this._castleGroup.add(barracks);
    const barracksRoof = new THREE.Mesh(new THREE.ConeGeometry(10, 3, 16), roofMat);
    barracksRoof.position.set(18, 10, -5);
    barracksRoof.rotation.y = Math.PI / 4;
    this._castleGroup.add(barracksRoof);

    // Chapel (small building with cross, east side)
    const chapelBody = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 8), stoneMat);
    chapelBody.position.set(-18, 7, 8);
    chapelBody.castShadow = true;
    this._castleGroup.add(chapelBody);
    const chapelRoof = new THREE.Mesh(new THREE.ConeGeometry(6, 4, 16), blueRoofMat);
    chapelRoof.position.set(-18, 13, 8);
    chapelRoof.rotation.y = Math.PI / 4;
    this._castleGroup.add(chapelRoof);
    const chapelCross = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 0.2), goldMat);
    chapelCross.position.set(-18, 16, 8);
    this._castleGroup.add(chapelCross);
    const chapelCrossH = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.2), goldMat);
    chapelCrossH.position.set(-18, 15.5, 8);
    this._castleGroup.add(chapelCrossH);

    // Stables (open-front building, south)
    const stablesMat = new THREE.MeshStandardMaterial({ color: 0x8a7755, roughness: 0.9 });
    const stables = new THREE.Mesh(new THREE.BoxGeometry(12, 4, 5), stablesMat);
    stables.position.set(10, 5, -15);
    stables.castShadow = true;
    this._castleGroup.add(stables);
    // Stable roof (lean-to)
    const stableRoof = new THREE.Mesh(new THREE.BoxGeometry(13, 0.3, 6), roofMat);
    stableRoof.position.set(10, 7.2, -15);
    stableRoof.rotation.x = 0.1;
    this._castleGroup.add(stableRoof);

    // Arrow slits on keep walls
    const arrowSlitMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    for (let floor = 0; floor < 3; floor++) {
      const y = 10 + floor * 8;
      for (let side = 0; side < 4; side++) {
        const angle = (side / 4) * Math.PI * 2;
        for (let s = -2; s <= 2; s++) {
          const slitX = Math.sin(angle) * 9.05 + Math.cos(angle) * s * 3;
          const slitZ = Math.cos(angle) * 9.05 - Math.sin(angle) * s * 3;
          const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 1.5), arrowSlitMat);
          slit.position.set(slitX, y, slitZ);
          slit.rotation.y = angle + Math.PI / 2;
          this._castleGroup.add(slit);
        }
      }
    }

    // Machicolations (overhanging defense on keep top)
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const mx = Math.sin(angle) * 10;
      const mz = Math.cos(angle) * 10;
      const mach = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.5), stoneMat);
      mach.position.set(mx, 33.3, mz);
      mach.rotation.y = angle;
      this._castleGroup.add(mach);
    }

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
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.92, metalness: 0.02 });
    const roofMats = [
      new THREE.MeshStandardMaterial({ color: 0x884433, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x774422, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x665533, roughness: 0.8 }),
    ];

    // Generate houses along streets radiating from castle (12 streets for denser city)
    const streets = [
      { angle: 0, len: 70 },
      { angle: Math.PI / 2, len: 65 },
      { angle: Math.PI, len: 70 },
      { angle: -Math.PI / 2, len: 65 },
      { angle: Math.PI / 4, len: 55 },
      { angle: -Math.PI / 4, len: 55 },
      { angle: Math.PI * 0.75, len: 55 },
      { angle: -Math.PI * 0.75, len: 55 },
      { angle: Math.PI / 6, len: 50 },
      { angle: -Math.PI / 6, len: 50 },
      { angle: Math.PI * 5 / 6, len: 45 },
      { angle: -Math.PI * 5 / 6, len: 45 },
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

    // Houses along each street (denser placement)
    for (const st of streets) {
      const count = Math.floor(st.len / 7);
      for (let i = 0; i < count; i++) {
        for (const side of [-1, 1]) {
          const dist = 14 + i * 7 + rng() * 3;
          const offset = side * (3.5 + rng() * 3);
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

    // Street-level props for lived-in feel
    this._buildStreetProps();

    // Noble quarter (larger houses, north-east)
    this._buildNobleQuarter();

    // Training yard near castle
    this._buildTrainingYard();

    // Cemetery near cathedral
    this._buildCemetery(50, -45);

    // Aqueduct running through city
    this._buildAqueduct();

    // City trees and benches
    this._buildCityFurniture(rng);

    this._scene.add(this._cityGroup);
  }

  private _buildStreetProps(): void {
    const rng = seededRandom(2222);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x443311, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 });
    const hayMat = new THREE.MeshStandardMaterial({ color: 0xccaa55, roughness: 0.95 });
    const clothMat = new THREE.MeshStandardMaterial({ color: 0xaa8866, roughness: 0.8 });

    // Lamp posts along streets
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 });
    const lampGlowMat = new THREE.MeshStandardMaterial({
      color: 0xff9944,
      emissive: 0xff8833,
      emissiveIntensity: 0.6,
    });
    const lampPositions = [
      { x: 12, z: 10 }, { x: -12, z: 10 }, { x: 20, z: -20 },
      { x: -20, z: -20 }, { x: 35, z: 0 }, { x: -35, z: 0 },
      { x: 0, z: -50 }, { x: 25, z: -45 }, { x: -25, z: -45 },
      { x: 15, z: 50 }, { x: -15, z: 50 }, { x: 40, z: 30 },
    ];
    for (const lp of lampPositions) {
      // Post
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 4, 16), lampMat);
      post.position.set(lp.x, 2, lp.z);
      this._cityGroup.add(post);
      // Bracket
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.08), lampMat);
      bracket.position.set(lp.x + 0.3, 3.8, lp.z);
      this._cityGroup.add(bracket);
      // Lantern
      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.35), lampMat);
      lantern.position.set(lp.x + 0.7, 3.6, lp.z);
      this._cityGroup.add(lantern);
      // Glow
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), lampGlowMat);
      glow.position.set(lp.x + 0.7, 3.6, lp.z);
      this._cityGroup.add(glow);
      // Light
      const light = new THREE.PointLight(0xff9944, 0.8, 12);
      light.position.set(lp.x + 0.7, 3.6, lp.z);
      this._cityGroup.add(light);
      this._torchLights.push(light);
      this._torchMeshes.push(glow);
    }

    // Barrels scattered near buildings
    for (let i = 0; i < 25; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 20 + rng() * 55;
      const bx = Math.cos(angle) * dist;
      const bz = Math.sin(angle) * dist;
      if (Math.sqrt(bx * bx + bz * bz) > 76) continue;
      if (Math.sqrt(bx * bx + (bz - 30) ** 2) < 30) continue;

      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.45, 0.9, 16),
        darkWoodMat,
      );
      barrel.position.set(bx, 0.45, bz);
      this._cityGroup.add(barrel);
      // Metal band
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.03, 10, 20),
        metalMat,
      );
      band.position.set(bx, 0.5, bz);
      band.rotation.x = Math.PI / 2;
      this._cityGroup.add(band);
    }

    // Crates near market and tavern
    for (let i = 0; i < 15; i++) {
      const cx = -30 + (rng() - 0.5) * 25;
      const cz = -35 + (rng() - 0.5) * 20;
      const size = 0.5 + rng() * 0.5;
      const crate = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), woodMat);
      crate.position.set(cx, size / 2, cz);
      crate.rotation.y = rng() * Math.PI;
      this._cityGroup.add(crate);
    }

    // Hay bales near stables area
    for (let i = 0; i < 8; i++) {
      const hx = 20 + (rng() - 0.5) * 15;
      const hz = 15 + (rng() - 0.5) * 10;
      const hay = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.6, 0.8, 16),
        hayMat,
      );
      hay.position.set(hx, 0.4, hz);
      hay.rotation.x = Math.PI / 2;
      hay.rotation.z = rng() * Math.PI;
      this._cityGroup.add(hay);
    }

    // Cloth awnings on some house fronts
    const awningColors = [0xcc4433, 0x3366aa, 0x886633, 0x448844];
    for (let i = 0; i < 10; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 25 + rng() * 45;
      const ax = Math.cos(angle) * dist;
      const az = Math.sin(angle) * dist;
      if (Math.sqrt(ax * ax + az * az) > 75) continue;

      const awningMat = new THREE.MeshStandardMaterial({
        color: awningColors[Math.floor(rng() * awningColors.length)],
        roughness: 0.7,
        side: THREE.DoubleSide,
      });
      const awning = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), awningMat);
      awning.position.set(ax, 3.5, az);
      awning.rotation.x = -0.3;
      awning.rotation.y = rng() * Math.PI * 2;
      this._cityGroup.add(awning);
    }

    // Water well in city
    const wellMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.85 });
    const wellBody = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 1.5, 16), wellMat);
    wellBody.position.set(15, 0.75, -15);
    this._cityGroup.add(wellBody);
    const wellRoof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.5, 16), woodMat);
    wellRoof.position.set(15, 3, -15);
    this._cityGroup.add(wellRoof);
    // Well posts
    for (const side of [-1, 1]) {
      const wellPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 16), woodMat);
      wellPost.position.set(15 + side * 0.8, 2, -15);
      this._cityGroup.add(wellPost);
    }

    // Horse cart near gate
    const cartGroup = new THREE.Group();
    const cartBed = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 1.5), woodMat);
    cartBed.position.y = 0.8;
    cartGroup.add(cartBed);
    // Wheels
    for (const side of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 10, 20), darkWoodMat);
      wheel.position.set(side * 0.8, 0.5, 0.9);
      wheel.rotation.y = Math.PI / 2;
      cartGroup.add(wheel);
    }
    // Cargo (cloth sacks)
    for (let s = 0; s < 3; s++) {
      const sack = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), clothMat);
      sack.position.set(-0.5 + s * 0.5, 1.2, 0);
      sack.scale.y = 0.7;
      cartGroup.add(sack);
    }
    // Handles
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 16), woodMat);
    handle.position.set(0, 0.9, -1.5);
    handle.rotation.x = 0.3;
    cartGroup.add(handle);
    cartGroup.position.set(0, 0, -75);
    this._cityGroup.add(cartGroup);

    // Second cart near market
    const cart2 = cartGroup.clone();
    cart2.position.set(-20, 0, -25);
    cart2.rotation.y = 0.8;
    this._cityGroup.add(cart2);
  }

  private _buildNobleQuarter(): void {
    const mansionMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.7 });
    const mansionRoofMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.6 });
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.92, metalness: 0.02 });
    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.9 });
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.4 });

    // 4 noble mansions in NE quadrant
    const mansions = [
      { x: 40, z: 50, rot: 0.2 },
      { x: 55, z: 35, rot: -0.3 },
      { x: 50, z: 55, rot: 0.5 },
      { x: 60, z: 50, rot: -0.1 },
    ];

    for (const m of mansions) {
      const group = new THREE.Group();

      // Main body (larger than regular houses)
      const body = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 6, 3, 3, 2), mansionMat);
      body.position.y = 3.5;
      body.castShadow = true;
      group.add(body);

      // Second wing
      const wing = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 5), mansionMat);
      wing.position.set(5, 3, -1);
      wing.castShadow = true;
      group.add(wing);

      // Tall roof
      const roof = new THREE.Mesh(new THREE.ConeGeometry(7, 5, 16), mansionRoofMat);
      roof.position.y = 9.5;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);

      // Wing roof
      const wingRoof = new THREE.Mesh(new THREE.ConeGeometry(5, 3.5, 16), mansionRoofMat);
      wingRoof.position.set(5, 8, -1);
      wingRoof.rotation.y = Math.PI / 4;
      group.add(wingRoof);

      // Dormer windows (roof protrusions)
      for (let d = -1; d <= 1; d += 2) {
        const dormer = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), mansionMat);
        dormer.position.set(d * 2, 8, 3.2);
        group.add(dormer);
        const dormerRoof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1, 16), mansionRoofMat);
        dormerRoof.position.set(d * 2, 9, 3.2);
        dormerRoof.rotation.y = Math.PI / 4;
        group.add(dormerRoof);
        // Dormer window
        const dWinMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, emissive: 0x886633, emissiveIntensity: 0.2 });
        const dWin = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), dWinMat);
        dWin.position.set(d * 2, 8, 3.96);
        group.add(dWin);
      }

      // Many windows with mullions
      const winMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, emissive: 0x886633, emissiveIntensity: 0.2 });
      for (let floor = 0; floor < 2; floor++) {
        for (let w = -2; w <= 2; w++) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.2), winMat);
          win.position.set(w * 1.5, 2.5 + floor * 3, 3.02);
          group.add(win);
          // Mullion (cross bar)
          const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 0.04), timberMat);
          mullionV.position.set(w * 1.5, 2.5 + floor * 3, 3.03);
          group.add(mullionV);
          const mullionH = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.04), timberMat);
          mullionH.position.set(w * 1.5, 2.5 + floor * 3, 3.03);
          group.add(mullionH);
        }
      }

      // Grand entrance with columns
      for (const side of [-1, 1]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 3, 16), new THREE.MeshStandardMaterial({ color: 0xbbbbaa }));
        col.position.set(side * 1, 1.5, 3.3);
        group.add(col);
      }
      // Entrance pediment (triangle)
      const pediment = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.8, 16), mansionMat);
      pediment.position.set(0, 3.5, 3.3);
      pediment.rotation.x = Math.PI / 2;
      group.add(pediment);

      // Chimney stacks (multiple)
      for (let ch = 0; ch < 2; ch++) {
        const chim = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3, 0.8), new THREE.MeshStandardMaterial({ color: 0x776655 }));
        chim.position.set(-2 + ch * 6, 10, -1);
        group.add(chim);
        // Chimney pot
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0x884422 }));
        pot.position.set(-2 + ch * 6, 11.8, -1);
        group.add(pot);
      }

      // Garden hedge around property
      for (const side of [-1, 1]) {
        const hedge = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 0.8), hedgeMat);
        hedge.position.set(2, 0.5, side * 5);
        group.add(hedge);
      }
      const hedgeSide = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 10), hedgeMat);
      hedgeSide.position.set(-3, 0.5, 0);
      group.add(hedgeSide);

      // Iron fence gate
      const gate = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 0.1), fenceMat);
      gate.position.set(0, 0.75, 5.4);
      group.add(gate);

      group.position.set(m.x, 0, m.z);
      group.rotation.y = m.rot;
      this._cityGroup.add(group);
    }
  }

  private _buildTrainingYard(): void {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
    const straw = new THREE.MeshStandardMaterial({ color: 0xccaa55, roughness: 0.95 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 });

    // Training dummies (5)
    for (let i = 0; i < 5; i++) {
      const dummyGroup = new THREE.Group();
      // Post
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 2.5, 16), woodMat);
      post.position.y = 1.25;
      dummyGroup.add(post);
      // Straw body
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.2, 16), straw);
      body.position.y = 2;
      dummyGroup.add(body);
      // Straw head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), straw);
      head.position.y = 2.8;
      dummyGroup.add(head);
      // Cross arm
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 0.15), woodMat);
      arm.position.y = 2.2;
      dummyGroup.add(arm);
      // Shield on one side
      const shield = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), metalMat);
      shield.position.set(-0.5, 2.0, 0.2);
      dummyGroup.add(shield);

      dummyGroup.position.set(i * 3 - 6, 0, 0);
      dummyGroup.rotation.y = Math.random() * 0.5;
      group.add(dummyGroup);
    }

    // Weapon racks (2)
    for (let r = 0; r < 2; r++) {
      const rack = new THREE.Group();
      // Frame
      const frameL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2, 16), woodMat);
      frameL.position.set(-1, 1, 0);
      rack.add(frameL);
      const frameR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2, 16), woodMat);
      frameR.position.set(1, 1, 0);
      rack.add(frameR);
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.1), woodMat);
      crossbar.position.y = 1.5;
      rack.add(crossbar);
      const crossbar2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.1), woodMat);
      crossbar2.position.y = 0.8;
      rack.add(crossbar2);
      // Swords/spears on rack
      for (let s = -2; s <= 2; s++) {
        const sword = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5, 0.04), metalMat);
        sword.position.set(s * 0.35, 1.3, 0.08);
        sword.rotation.z = 0.1;
        rack.add(sword);
      }
      rack.position.set(-8 + r * 16, 0, 4);
      group.add(rack);
    }

    // Archery targets (3)
    const targetMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, roughness: 0.9 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.8 });
    for (let t = 0; t < 3; t++) {
      const targetGroup = new THREE.Group();
      const backing = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.15, 20), targetMat);
      backing.rotation.x = Math.PI / 2;
      backing.position.y = 1.5;
      targetGroup.add(backing);
      // Rings
      const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 20), redMat);
      ring1.position.set(0, 1.5, 0.08);
      targetGroup.add(ring1);
      const bullseye = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), redMat);
      bullseye.position.set(0, 1.5, 0.09);
      targetGroup.add(bullseye);
      // Post
      const tPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2, 16), woodMat);
      tPost.position.y = 1;
      targetGroup.add(tPost);

      targetGroup.position.set(t * 4 - 4, 0, -5);
      group.add(targetGroup);
    }

    // Fence around yard
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x665533, roughness: 0.9 });
    for (const side of [-1, 1]) {
      const fence = new THREE.Mesh(new THREE.BoxGeometry(20, 0.8, 0.12), fenceMat);
      fence.position.set(0, 0.4, side * 7);
      group.add(fence);
    }
    for (const side of [-1, 1]) {
      const fence = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 14), fenceMat);
      fence.position.set(side * 10, 0.4, 0);
      group.add(fence);
    }

    group.position.set(-25, 0, 55);
    this._cityGroup.add(group);
  }

  private _buildCemetery(x: number, z: number): void {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.85 });
    const darkStoneMat3 = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.9 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.5 });

    // Headstones
    const rng2 = seededRandom(888);
    for (let i = 0; i < 20; i++) {
      const gx = (rng2() - 0.5) * 16;
      const gz = (rng2() - 0.5) * 12;
      const mat = rng2() > 0.5 ? stoneMat : darkStoneMat3;

      if (rng2() > 0.3) {
        // Regular headstone
        const stone = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1 + rng2() * 0.5, 0.15), mat);
        stone.position.set(gx, 0.5 + rng2() * 0.25, gz);
        stone.rotation.y = (rng2() - 0.5) * 0.15;
        group.add(stone);
        // Rounded top
        const top = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat);
        top.position.set(gx, 1 + rng2() * 0.3, gz);
        group.add(top);
      } else {
        // Cross gravestone
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), ironMat);
        crossV.position.set(gx, 0.6, gz);
        group.add(crossV);
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.1), ironMat);
        crossH.position.set(gx, 0.9, gz);
        group.add(crossH);
      }
    }

    // Stone wall enclosure
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(18, 1.5, 0.5), stoneMat);
      wall.position.set(0, 0.75, side * 7);
      group.add(wall);
    }
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 14), stoneMat);
      wall.position.set(side * 9, 0.75, 0);
      group.add(wall);
    }

    // Gate
    const gatePost1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.5, 0.6), stoneMat);
    gatePost1.position.set(-1.2, 1.25, 7);
    group.add(gatePost1);
    const gatePost2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.5, 0.6), stoneMat);
    gatePost2.position.set(1.2, 1.25, 7);
    group.add(gatePost2);

    // Yew trees (dark, conical)
    const yewMat = new THREE.MeshStandardMaterial({ color: 0x1a3318, roughness: 0.85 });
    for (let t = 0; t < 4; t++) {
      const tx2 = (t % 2 === 0 ? -1 : 1) * 7;
      const tz2 = (t < 2 ? -1 : 1) * 5;
      const trunkH = 3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, trunkH, 16), new THREE.MeshStandardMaterial({ color: 0x3a2a1a }));
      trunk.position.set(tx2, trunkH / 2, tz2);
      group.add(trunk);
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4, 16), yewMat);
      canopy.position.set(tx2, 5, tz2);
      canopy.castShadow = true;
      group.add(canopy);
    }

    group.position.set(x, 0, z);
    this._cityGroup.add(group);
  }

  private _buildAqueduct(): void {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xaa9977, roughness: 0.8 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x3388aa, transparent: true, opacity: 0.5 });

    // Aqueduct runs from north gate area across city
    const pillars = 8;
    const startX = -60;
    const startZ = 60;
    const endX = 40;
    const endZ = -40;

    for (let i = 0; i < pillars; i++) {
      const t = i / (pillars - 1);
      const px = startX + (endX - startX) * t;
      const pz = startZ + (endZ - startZ) * t;
      const pillarH = 8 + Math.sin(t * Math.PI) * 3;

      // Pillar
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.5, pillarH, 1.5, 2, 4, 2), stoneMat);
      pillar.position.set(px, pillarH / 2, pz);
      pillar.castShadow = true;
      this._cityGroup.add(pillar);

      // Pillar base (wider)
      const base = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), stoneMat);
      base.position.set(px, 0.5, pz);
      this._cityGroup.add(base);

      // Arch between pillars
      if (i < pillars - 1) {
        const t2 = (i + 0.5) / (pillars - 1);
        const ax = startX + (endX - startX) * t2;
        const az = startZ + (endZ - startZ) * t2;
        const archSpan = Math.sqrt(((endX - startX) / (pillars - 1)) ** 2 + ((endZ - startZ) / (pillars - 1)) ** 2);
        const archAngle = Math.atan2(endX - startX, endZ - startZ);

        const arch = new THREE.Mesh(
          new THREE.TorusGeometry(archSpan / 2 * 0.8, 0.4, 10, 20, Math.PI),
          stoneMat,
        );
        arch.position.set(ax, pillarH - 1.5, az);
        arch.rotation.y = archAngle;
        arch.rotation.z = Math.PI / 2;
        this._cityGroup.add(arch);
      }

      // Top channel (trough on top)
      if (i < pillars - 1) {
        const t2 = (i + 0.5) / (pillars - 1);
        const cx2 = startX + (endX - startX) * t2;
        const cz2 = startZ + (endZ - startZ) * t2;
        const span = Math.sqrt(((endX - startX) / (pillars - 1)) ** 2 + ((endZ - startZ) / (pillars - 1)) ** 2);
        const chAngle = Math.atan2(endX - startX, endZ - startZ);
        const channel = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, span + 1), stoneMat);
        channel.position.set(cx2, pillarH + 0.25, cz2);
        channel.rotation.y = chAngle;
        this._cityGroup.add(channel);
        // Water in channel
        const water = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, span + 0.5), waterMat);
        water.position.set(cx2, pillarH + 0.53, cz2);
        water.rotation.y = chAngle;
        this._cityGroup.add(water);
      }
    }
  }

  private _buildCityFurniture(rng: () => number): void {
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.92, metalness: 0.02 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x448833, roughness: 0.75, metalness: 0.03 });
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
    const planterMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.85 });

    // Ornamental trees inside the city (small, trimmed)
    const treePositions = [
      { x: 10, z: -10 }, { x: -10, z: -10 }, { x: 20, z: 5 },
      { x: -20, z: 5 }, { x: 0, z: -30 }, { x: 30, z: -15 },
      { x: -30, z: -15 }, { x: 15, z: 30 }, { x: -15, z: 30 },
    ];
    for (const tp of treePositions) {
      // Trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3, 16), treeTrunkMat);
      trunk.position.set(tp.x, 1.5, tp.z);
      trunk.castShadow = true;
      this._cityGroup.add(trunk);
      // Trimmed spherical canopy
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), leafMat);
      canopy.position.set(tp.x, 3.8, tp.z);
      canopy.castShadow = true;
      this._cityGroup.add(canopy);
      // Stone planter base
      const planter = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.5, 16), planterMat);
      planter.position.set(tp.x, 0.25, tp.z);
      this._cityGroup.add(planter);
    }

    // Benches near trees
    for (let i = 0; i < 6; i++) {
      const tp = treePositions[i];
      const bench = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.5), benchMat);
      seat.position.y = 0.5;
      bench.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.08), benchMat);
      back.position.set(0, 0.75, -0.2);
      bench.add(back);
      // Legs
      for (const lx of [-0.6, 0.6]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.4), benchMat);
        leg.position.set(lx, 0.25, 0);
        bench.add(leg);
      }
      bench.position.set(tp.x + 2, 0, tp.z);
      bench.rotation.y = rng() * Math.PI * 2;
      this._cityGroup.add(bench);
    }
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

    // Stone foundation
    const foundationMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.9 });
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.6, d + 0.3), foundationMat);
    foundation.position.y = 0.3;
    foundation.receiveShadow = true;
    group.add(foundation);

    // Main body
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const body = new THREE.Mesh(bodyGeo, wallMat);
    body.position.y = h / 2 + 0.6;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Timber frame accents (cross beams) — front and back
    const beamThick = 0.2;
    for (const faceZ of [1, -1]) {
      // Horizontal beams
      for (const bh of [0.35, 0.6, 0.85]) {
        const hBeam = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.15, beamThick, beamThick),
          timberMat,
        );
        hBeam.position.y = h * bh + 0.6;
        hBeam.position.z = faceZ * (d / 2 + 0.04);
        group.add(hBeam);
      }
      // Vertical beams
      const vCount = Math.max(2, Math.floor(w / 2));
      for (let v = 0; v <= vCount; v++) {
        const vx = -w / 2 + (v / vCount) * w;
        const vBeam = new THREE.Mesh(
          new THREE.BoxGeometry(beamThick, h, beamThick),
          timberMat,
        );
        vBeam.position.set(vx, h / 2 + 0.6, faceZ * (d / 2 + 0.04));
        group.add(vBeam);
      }
      // Diagonal cross braces
      if (w > 4 && rng() > 0.3) {
        const diagBeam = new THREE.Mesh(
          new THREE.BoxGeometry(beamThick, h * 0.5, beamThick),
          timberMat,
        );
        diagBeam.position.set(w * 0.15, h * 0.5 + 0.6, faceZ * (d / 2 + 0.04));
        diagBeam.rotation.z = 0.5;
        group.add(diagBeam);
      }
    }
    // Side beams
    for (const faceX of [1, -1]) {
      const sideH = new THREE.Mesh(
        new THREE.BoxGeometry(beamThick, beamThick, d + 0.15),
        timberMat,
      );
      sideH.position.set(faceX * (w / 2 + 0.04), h * 0.6 + 0.6, 0);
      group.add(sideH);
    }

    // Door step
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.9 });
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 0.5), stepMat);
    step.position.set(0, 0.08, d / 2 + 0.3);
    group.add(step);

    // Pitched roof (higher poly)
    const roofW = w + 1;
    const roofD = d + 1;
    const roofH = h * 0.5;
    const roofGeo = new THREE.ConeGeometry(
      Math.max(roofW, roofD) * 0.7,
      roofH,
      4,
      2,
    );
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = h + roofH / 2 + 0.6;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Ridge beam removed

    // Roof eaves (overhang detail)
    const eavesMat = new THREE.MeshStandardMaterial({ color: 0x664433, roughness: 0.85 });
    for (const fz2 of [1, -1]) {
      const eave = new THREE.Mesh(new THREE.BoxGeometry(w + 1.5, 0.1, 0.4), eavesMat);
      eave.position.set(0, h + 0.6, fz2 * (d / 2 + 0.5));
      group.add(eave);
    }

    // Door with arch frame
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), doorMat);
    door.position.set(0, 1.7, d / 2 + 0.06);
    group.add(door);
    // Door arch
    const doorArchMat = new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.85 });
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.1), doorArchMat);
    doorFrame.position.set(0, 1.7, d / 2 + 0.05);
    group.add(doorFrame);

    // Window(s) with warm glow and shutters
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xddcc88,
      emissive: 0x886633,
      emissiveIntensity: 0.25,
    });
    const shutterMat = new THREE.MeshStandardMaterial({ color: 0x445533, roughness: 0.85 });
    if (w > 5) {
      for (const sx of [-1, 1]) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1), windowMat);
        win.position.set(sx * (w / 2 - 1.2), h * 0.65, d / 2 + 0.06);
        group.add(win);
        // Window frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.05), timberMat);
        frame.position.set(sx * (w / 2 - 1.2), h * 0.65, d / 2 + 0.04);
        group.add(frame);
        // Shutters (one open, one closed randomly)
        if (rng() > 0.4) {
          const shutter = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.9), shutterMat);
          shutter.position.set(sx * (w / 2 - 1.2) + 0.55, h * 0.65, d / 2 + 0.08);
          shutter.rotation.y = -0.4;
          group.add(shutter);
        }
      }
    }
    // Also add window on side wall
    if (d > 5) {
      const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), windowMat);
      sideWin.position.set(w / 2 + 0.06, h * 0.6, 0);
      sideWin.rotation.y = Math.PI / 2;
      group.add(sideWin);
    }

    // Flower box under front windows
    if (rng() > 0.5 && w > 5) {
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
      const flowerBoxColors = [0xff6688, 0xffaa44, 0xff88cc, 0xaa66ff];
      for (const sx of [-1, 1]) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.3), boxMat);
        box.position.set(sx * (w / 2 - 1.2), h * 0.55 - 0.6, d / 2 + 0.2);
        group.add(box);
        // Tiny flowers
        for (let f = 0; f < 3; f++) {
          const fMat = new THREE.MeshStandardMaterial({
            color: flowerBoxColors[Math.floor(rng() * flowerBoxColors.length)],
          });
          const fl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), fMat);
          fl.position.set(
            sx * (w / 2 - 1.2) + (f - 1) * 0.25,
            h * 0.55 - 0.4,
            d / 2 + 0.2,
          );
          group.add(fl);
        }
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
    const mortarMat = new THREE.MeshStandardMaterial({ color: 0xb0b0a0, roughness: 0.9 });
    const brickAltMat = new THREE.MeshStandardMaterial({ color: 0xc0bfae, roughness: 0.75 });

    // Helper: add brick mortar lines to a rectangular surface
    const addBrickLines = (
      cx: number, cy: number, cz: number,
      w: number, h: number,
      faceDir: "x" | "z",
      rows: number,
    ) => {
      const rowH = h / rows;
      for (let r = 1; r < rows; r++) {
        const lineY = cy - h / 2 + r * rowH;
        // Horizontal mortar line
        if (faceDir === "z") {
          const line = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.06, 0.06), mortarMat);
          line.position.set(cx, lineY, cz);
          group.add(line);
        } else {
          const line = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, w + 0.02), mortarMat);
          line.position.set(cx, lineY, cz);
          group.add(line);
        }
        // Vertical brick seams (offset every other row)
        const seams = Math.floor(w / 2);
        const offset = r % 2 === 0 ? 0 : 1;
        for (let s = 0; s < seams; s++) {
          const sx = -w / 2 + (s + 0.5 + offset * 0.5) * (w / seams);
          if (Math.abs(sx) > w / 2 - 0.2) continue;
          if (faceDir === "z") {
            const seam = new THREE.Mesh(new THREE.BoxGeometry(0.05, rowH - 0.02, 0.06), mortarMat);
            seam.position.set(cx + sx, lineY - rowH / 2, cz);
            group.add(seam);
          } else {
            const seam = new THREE.Mesh(new THREE.BoxGeometry(0.06, rowH - 0.02, 0.05), mortarMat);
            seam.position.set(cx, lineY - rowH / 2, cz + sx);
            group.add(seam);
          }
        }
      }
      // Alternating brick accent blocks (subtle color variation)
      for (let r = 0; r < rows; r += 3) {
        const lineY = cy - h / 2 + (r + 0.5) * rowH;
        const bw = w * 0.3;
        const brickOff = (r % 6 === 0) ? -w * 0.25 : w * 0.25;
        if (faceDir === "z") {
          const accent = new THREE.Mesh(new THREE.BoxGeometry(bw, rowH * 0.9, 0.08), brickAltMat);
          accent.position.set(cx + brickOff, lineY, cz);
          group.add(accent);
        } else {
          const accent = new THREE.Mesh(new THREE.BoxGeometry(0.08, rowH * 0.9, bw), brickAltMat);
          accent.position.set(cx, lineY, cz + brickOff);
          group.add(accent);
        }
      }
    };

    // Main nave
    const naveGeo = new THREE.BoxGeometry(12, 14, 24, 3, 3, 4);
    const nave = new THREE.Mesh(naveGeo, stoneMat);
    nave.position.set(0, 7, 0);
    nave.castShadow = true;
    group.add(nave);

    // Nave brick lines (both sides)
    for (const side of [-1, 1]) {
      addBrickLines(side * 6.01, 7, 0, 24, 14, "x", 14);
    }
    // Nave front and back
    addBrickLines(0, 7, 12.01, 12, 14, "z", 14);
    addBrickLines(0, 7, -12.01, 12, 14, "z", 14);

    // Transept (cross-shaped wing)
    const transept = new THREE.Mesh(new THREE.BoxGeometry(24, 12, 8, 4, 3, 2), stoneMat);
    transept.position.set(0, 6, -4);
    transept.castShadow = true;
    group.add(transept);

    // Transept brick lines (front/back)
    addBrickLines(0, 6, -8.01, 24, 12, "z", 12);
    addBrickLines(0, 6, 0.01, 24, 12, "z", 12);
    // Transept brick lines (sides)
    for (const side of [-1, 1]) {
      addBrickLines(side * 12.01, 6, -4, 8, 12, "x", 12);
    }
    const transeptRoof = new THREE.Mesh(new THREE.ConeGeometry(14, 4, 16), roofMat);
    transeptRoof.position.set(0, 14, -4);
    transeptRoof.rotation.y = Math.PI / 4;
    group.add(transeptRoof);

    // Apse (rounded end, semicircular)
    const apse = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 12, 20, 1, false, 0, Math.PI), stoneMat);
    apse.position.set(0, 6, -16);
    apse.rotation.y = Math.PI;
    apse.castShadow = true;
    group.add(apse);
    const apseRoof = new THREE.Mesh(new THREE.SphereGeometry(6, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), roofMat);
    apseRoof.position.set(0, 12, -16);
    group.add(apseRoof);

    // Nave roof
    const naveRoofGeo = new THREE.ConeGeometry(10, 6, 16);
    const naveRoof = new THREE.Mesh(naveRoofGeo, roofMat);
    naveRoof.position.set(0, 17, 0);
    naveRoof.rotation.y = Math.PI / 4;
    naveRoof.castShadow = true;
    group.add(naveRoof);

    // Nave ridge ornaments
    for (let r = -3; r <= 3; r++) {
      const ornament = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.2, 16), stoneMat);
      ornament.position.set(0, 20.5, r * 3);
      group.add(ornament);
    }

    // Bell tower (taller, more detailed)
    const towerGeo = new THREE.BoxGeometry(6, 32, 6, 2, 6, 2);
    const tower = new THREE.Mesh(towerGeo, stoneMat);
    tower.position.set(0, 16, 14);
    tower.castShadow = true;
    group.add(tower);

    // Bell tower brick lines (all 4 sides)
    for (const side of [-1, 1]) {
      addBrickLines(side * 3.01, 16, 14, 6, 32, "x", 32);
      addBrickLines(0, 16, 14 + side * 3.01, 6, 32, "z", 32);
    }

    // Bell tower upper stage (slightly narrower)
    const towerUpper = new THREE.Mesh(new THREE.BoxGeometry(5, 8, 5), stoneMat);
    towerUpper.position.set(0, 36, 14);
    towerUpper.castShadow = true;
    group.add(towerUpper);

    // Upper stage brick lines
    for (const side of [-1, 1]) {
      addBrickLines(side * 2.51, 36, 14, 5, 8, "x", 8);
      addBrickLines(0, 36, 14 + side * 2.51, 5, 8, "z", 8);
    }

    // Bell openings (arched windows on tower)
    const bellOpeningMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
    for (let bSide = 0; bSide < 4; bSide++) {
      const ba = (bSide / 4) * Math.PI * 2;
      const bx2 = Math.sin(ba) * 2.55;
      const bz2 = Math.cos(ba) * 2.55 + 14;
      const bellWin = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3), bellOpeningMat);
      bellWin.position.set(bx2, 36, bz2);
      bellWin.rotation.y = ba + Math.PI / 2;
      group.add(bellWin);
      // Arch above window
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.15, 10, 20, Math.PI), stoneMat);
      arch.position.set(bx2, 37.5, bz2);
      arch.rotation.y = ba + Math.PI / 2;
      arch.rotation.x = Math.PI / 2;
      group.add(arch);
    }

    // Bell tower spire (octagonal, taller)
    const spireGeo = new THREE.ConeGeometry(3.5, 14, 16);
    const spire = new THREE.Mesh(spireGeo, roofMat);
    spire.position.set(0, 47, 14);
    spire.castShadow = true;
    group.add(spire);

    // Cross on top
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4, 0.25), goldMat);
    crossV.position.set(0, 56, 14);
    group.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.25, 0.25), goldMat);
    crossH.position.set(0, 55, 14);
    group.add(crossH);

    // Rose window (multi-ring)
    const roseMat = new THREE.MeshStandardMaterial({
      color: 0x6644aa,
      emissive: 0x332266,
      emissiveIntensity: 0.5,
    });
    const roseOuter = new THREE.Mesh(new THREE.RingGeometry(1.5, 3, 24), roseMat);
    roseOuter.position.set(0, 11, -22.05);
    group.add(roseOuter);
    const roseInner = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), new THREE.MeshStandardMaterial({
      color: 0x4433aa,
      emissive: 0x221155,
      emissiveIntensity: 0.6,
    }));
    roseInner.position.set(0, 11, -22.06);
    group.add(roseInner);
    // Rose window frame spokes
    for (let s = 0; s < 8; s++) {
      const sa = (s / 8) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3, 0.08), stoneMat);
      spoke.position.set(Math.cos(sa) * 0.01, 11 + Math.sin(sa) * 0.01, -22.04);
      spoke.rotation.z = sa;
      group.add(spoke);
    }

    // Pinnacles on transept corners
    for (const px of [-12, 12]) {
      for (const pz of [-8, 0]) {
        const pinnacle = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4, 16), stoneMat);
        pinnacle.position.set(px, 14, pz - 4);
        pinnacle.castShadow = true;
        group.add(pinnacle);
      }
    }

    // Flying buttresses (more detailed, both sides, multiple)
    for (const side of [-1, 1]) {
      for (let fb = -1; fb <= 1; fb++) {
        const fbz = fb * 6;
        // Buttress pier
        const buttPier = new THREE.Mesh(new THREE.BoxGeometry(1, 12, 1.2), stoneMat);
        buttPier.position.set(side * 8.5, 6, fbz);
        buttPier.castShadow = true;
        group.add(buttPier);
        // Flying arch
        const buttArch = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.8, 1), stoneMat);
        buttArch.position.set(side * 7.5, 10, fbz);
        buttArch.rotation.z = side * 0.25;
        group.add(buttArch);
        // Pinnacle on top
        const buttPin = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2.5, 16), stoneMat);
        buttPin.position.set(side * 8.5, 13.5, fbz);
        group.add(buttPin);
      }
    }

    // Stained glass windows — multi-color
    const glassColors = [
      new THREE.MeshStandardMaterial({ color: 0xcc4422, emissive: 0x662211, emissiveIntensity: 0.3 }),
      new THREE.MeshStandardMaterial({ color: 0x2244cc, emissive: 0x112266, emissiveIntensity: 0.3 }),
      new THREE.MeshStandardMaterial({ color: 0x44aa22, emissive: 0x225511, emissiveIntensity: 0.3 }),
      new THREE.MeshStandardMaterial({ color: 0xccaa22, emissive: 0x665511, emissiveIntensity: 0.3 }),
    ];
    for (let i = -3; i <= 3; i++) {
      for (const side of [-1, 1]) {
        const glassMat2 = glassColors[Math.abs(i) % glassColors.length];
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3.5), glassMat2);
        win.position.set(side * 6.05, 9, i * 3);
        win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        group.add(win);
        // Pointed arch above each window
        const winArch = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.1, 10, 20, Math.PI), stoneMat);
        winArch.position.set(side * 6.04, 11, i * 3);
        winArch.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        winArch.rotation.z = Math.PI;
        group.add(winArch);
      }
    }

    // Transept windows
    for (const side of [-1, 1]) {
      const tWin = new THREE.Mesh(new THREE.CircleGeometry(2, 20), roseMat);
      tWin.position.set(side * 12.05, 9, -4);
      tWin.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(tWin);
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

    // Market stalls (covered booths) — expanded
    const stallColors = [0xcc3333, 0x3366cc, 0xccaa22, 0x33aa55, 0xaa3388, 0xcc6633, 0x3388aa, 0x885533];
    for (let i = 0; i < 8; i++) {
      const stall = new THREE.Group();
      const angle = (i / 5) * Math.PI * 2;
      const sx = Math.cos(angle) * 10;
      const sz = Math.sin(angle) * 10;

      // Posts
      for (const px of [-1.5, 1.5]) {
        for (const pz of [-1, 1]) {
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, 3, 16),
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

      // Merchandise on counter
      const merchRng = seededRandom(i * 100 + 55);
      for (let m = 0; m < 4; m++) {
        const merchType = Math.floor(merchRng() * 3);
        const mx = -1 + m * 0.7;
        if (merchType === 0) {
          // Small pots/jugs
          const pot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.15, 0.3, 16),
            new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.8 }),
          );
          pot.position.set(mx, 1.3, 0);
          stall.add(pot);
        } else if (merchType === 1) {
          // Fruit/food spheres
          const fruit = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 16, 12),
            new THREE.MeshStandardMaterial({ color: [0xcc3322, 0xffaa22, 0x44aa33][Math.floor(merchRng() * 3)] }),
          );
          fruit.position.set(mx, 1.24, 0);
          stall.add(fruit);
        } else {
          // Cloth/fabric roll
          const roll = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 0.4, 16),
            new THREE.MeshStandardMaterial({ color: [0xcc6644, 0x4466aa, 0x886644][Math.floor(merchRng() * 3)], roughness: 0.8 }),
          );
          roll.position.set(mx, 1.24, 0);
          roll.rotation.z = Math.PI / 2;
          stall.add(roll);
        }
      }

      // Hanging lantern
      const lanternMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.4 });
      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), lanternMat);
      lantern.position.set(0, 2.6, -0.5);
      stall.add(lantern);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xff9944, emissive: 0xff8833, emissiveIntensity: 0.5 }),
      );
      glow.position.set(0, 2.6, -0.5);
      stall.add(glow);

      stall.position.set(sx, 0, sz);
      stall.rotation.y = angle + Math.PI;
      group.add(stall);
    }

    // Central fountain (elaborate multi-tier)
    const fountainMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5 });
    const goldFountainMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.6, roughness: 0.3 });

    // Base steps (octagonal)
    const step1 = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 0.5, 16), fountainMat);
    step1.position.y = 0.25;
    group.add(step1);
    const step2 = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.5, 0.4, 16), fountainMat);
    step2.position.y = 0.7;
    group.add(step2);

    // Main basin
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.8, 1.2, 24), fountainMat);
    basin.position.y = 1.5;
    group.add(basin);
    // Basin rim
    const basinRim = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.15, 10, 24), fountainMat);
    basinRim.position.y = 2.1;
    basinRim.rotation.x = Math.PI / 2;
    group.add(basinRim);

    // Central column with decorative rings
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3.5, 16), fountainMat);
    pillar.position.y = 3.8;
    group.add(pillar);
    for (let ring = 0; ring < 3; ring++) {
      const decorRing = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 10, 20), fountainMat);
      decorRing.position.y = 2.5 + ring * 1;
      decorRing.rotation.x = Math.PI / 2;
      group.add(decorRing);
    }

    // Upper basin
    const topBasin = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.2, 0.6, 20), fountainMat);
    topBasin.position.y = 5.8;
    group.add(topBasin);

    // Top figure (small statue — dragon or angel)
    const figureMat = new THREE.MeshStandardMaterial({ color: 0xbbbbaa, roughness: 0.4, metalness: 0.3 });
    const figureBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.2, 16), figureMat);
    figureBody.position.y = 6.7;
    group.add(figureBody);
    const figureHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), figureMat);
    figureHead.position.y = 7.4;
    group.add(figureHead);
    // Wings
    for (const ws of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), goldFountainMat);
      wing.position.set(ws * 0.35, 7, 0);
      wing.rotation.y = ws * 0.5;
      group.add(wing);
    }

    // Water in fountain
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x3388cc,
      transparent: true,
      opacity: 0.6,
    });
    const water = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.08, 24), waterMat);
    water.position.y = 2;
    group.add(water);
    const waterUpper = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.06, 20), waterMat);
    waterUpper.position.y = 6;
    group.add(waterUpper);

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
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.4 });
    const winMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, emissive: 0xaa8833, emissiveIntensity: 0.3 });

    // Stone foundation
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1, 8.5), stoneMat);
    foundation.position.y = 0.5;
    foundation.receiveShadow = true;
    group.add(foundation);

    // Main building ground floor
    const body = new THREE.Mesh(new THREE.BoxGeometry(10, 7, 8, 3, 3, 2), wallMat);
    body.position.y = 4.5;
    body.castShadow = true;
    group.add(body);

    // Second floor overhang (jettied)
    const upper = new THREE.Mesh(new THREE.BoxGeometry(11.5, 4, 9.5), wallMat);
    upper.position.y = 10;
    upper.castShadow = true;
    group.add(upper);
    // Overhang support brackets
    for (let b = -2; b <= 2; b++) {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.5), timberMat);
      bracket.position.set(b * 2.5, 7.6, 4.7);
      bracket.rotation.x = 0.3;
      group.add(bracket);
    }

    // Dense timber frame — front, back, sides
    for (const fz of [4.55, -4.55]) {
      for (const sx2 of [-5.5, -2.75, 0, 2.75, 5.5]) {
        const vBeam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 12, 0.22), timberMat);
        vBeam.position.set(sx2, 6, fz);
        group.add(vBeam);
      }
      for (const sy2 of [2, 4, 7, 8, 10]) {
        const hBeam = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.22, 0.22), timberMat);
        hBeam.position.set(0, sy2, fz);
        group.add(hBeam);
      }
      // X-braces
      for (const sx2 of [-4, 0, 4]) {
        const diag1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.5, 0.15), timberMat);
        diag1.position.set(sx2, 5, fz);
        diag1.rotation.z = 0.6;
        group.add(diag1);
      }
    }

    // Roof with dormers
    const roof = new THREE.Mesh(new THREE.ConeGeometry(10, 5, 16), roofMat);
    roof.position.y = 14.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);
    // Dormer
    const dormer = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 1.5), wallMat);
    dormer.position.set(0, 13.5, 5);
    group.add(dormer);
    const dormerRoof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1, 16), roofMat);
    dormerRoof.position.set(0, 14.5, 5);
    dormerRoof.rotation.y = Math.PI / 4;
    group.add(dormerRoof);
    const dormerWin = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), winMat);
    dormerWin.position.set(0, 13.5, 5.76);
    group.add(dormerWin);

    // Windows (many, with warm glow)
    for (let floor = 0; floor < 2; floor++) {
      const wy = 3.5 + floor * 5;
      for (let w = -2; w <= 2; w++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.3), winMat);
        win.position.set(w * 2, wy, 4.02);
        group.add(win);
      }
    }

    // Grand entrance door
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.85 });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.8), doorMat);
    door.position.set(0, 2.4, 4.03);
    group.add(door);
    // Door frame arch
    const doorArch = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 10, 20, Math.PI), timberMat);
    doorArch.position.set(0, 3.8, 4.04);
    doorArch.rotation.x = Math.PI / 2;
    group.add(doorArch);

    // Hanging sign on iron bracket
    const signBracket = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.08), metalMat);
    signBracket.position.set(5.9, 5.5, 4);
    group.add(signBracket);
    const signChain1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 16), metalMat);
    signChain1.position.set(5.2, 5.1, 4);
    group.add(signChain1);
    const signChain2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 16), metalMat);
    signChain2.position.set(6.6, 5.1, 4);
    group.add(signChain2);
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.12), new THREE.MeshStandardMaterial({ color: 0x663311 }));
    signBoard.position.set(5.9, 4.7, 4);
    group.add(signBoard);
    // Tavern icon on sign (ale mug = small cylinder)
    const mugMat = new THREE.MeshStandardMaterial({ color: 0xccaa55, emissive: 0x664422, emissiveIntensity: 0.15 });
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 16), mugMat);
    mug.position.set(5.9, 4.7, 4.08);
    mug.rotation.x = Math.PI / 2;
    group.add(mug);

    // Second chimney
    const chimMat = new THREE.MeshStandardMaterial({ color: 0x776655 });
    const chimney1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4, 1.2), chimMat);
    chimney1.position.set(-3, 14, -2);
    group.add(chimney1);
    const chimPot1 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.5, 16), chimMat);
    chimPot1.position.set(-3, 16.2, -2);
    group.add(chimPot1);
    const chimney2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.5, 0.9), chimMat);
    chimney2.position.set(3, 14.5, -1);
    group.add(chimney2);

    // Outdoor seating area (front patio)
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
    for (let t = -1; t <= 1; t += 2) {
      // Table
      const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1), benchMat);
      tableTop.position.set(t * 3, 1, 6);
      group.add(tableTop);
      const tableLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), benchMat);
      tableLeg1.position.set(t * 3 - 0.7, 0.5, 5.6);
      group.add(tableLeg1);
      const tableLeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), benchMat);
      tableLeg2.position.set(t * 3 + 0.7, 0.5, 6.4);
      group.add(tableLeg2);
      // Benches (2 per table)
      for (const bs of [-0.7, 0.7]) {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.35), benchMat);
        bench.position.set(t * 3, 0.55, 6 + bs);
        group.add(bench);
      }
    }

    // Balcony on second floor (front)
    const balconyFloor = new THREE.Mesh(new THREE.BoxGeometry(6, 0.15, 2), benchMat);
    balconyFloor.position.set(0, 8, 5.5);
    group.add(balconyFloor);
    // Balcony railing
    const railMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.85 });
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 0.12), railMat);
    railTop.position.set(0, 9, 6.4);
    group.add(railTop);
    for (let bp = -5; bp <= 5; bp++) {
      const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 16), railMat);
      baluster.position.set(bp * 0.55, 8.5, 6.4);
      group.add(baluster);
    }
    // Balcony support beams
    for (const bx of [-2.5, 0, 2.5]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 0.2), timberMat);
      support.position.set(bx, 7.5, 5.5);
      support.rotation.x = 0.4;
      group.add(support);
    }

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
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.7 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.8 });

    // Stone workshop body (thicker walls)
    const body = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 7, 2, 1, 1), stoneMat);
    body.position.y = 2.5;
    body.castShadow = true;
    group.add(body);

    // Back room (living quarters)
    const backRoom = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 5), new THREE.MeshStandardMaterial({ color: 0xccbb88, roughness: 0.85 }));
    backRoom.position.set(0, 3, -6);
    backRoom.castShadow = true;
    group.add(backRoom);
    const backRoof = new THREE.Mesh(new THREE.ConeGeometry(5, 3, 16), roofMat);
    backRoof.position.set(0, 7.5, -6);
    backRoof.rotation.y = Math.PI / 4;
    group.add(backRoof);

    // Open front — lean-to roof with support posts
    const roofGeo = new THREE.BoxGeometry(10, 0.4, 9);
    const roof = new THREE.Mesh(roofGeo, woodMat);
    roof.position.set(0, 5.5, 1);
    roof.rotation.x = 0.15;
    roof.castShadow = true;
    group.add(roof);
    // Support posts
    for (const px of [-4.5, 4.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 5.5, 16), woodMat);
      post.position.set(px, 2.75, 5);
      group.add(post);
    }
    const midPost = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 5.5, 16), woodMat);
    midPost.position.set(0, 2.75, 5);
    group.add(midPost);

    // Anvil (more detailed)
    const anvilBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 0.8), metalMat);
    anvilBase.position.set(2, 0.8, 5);
    group.add(anvilBase);
    const anvilWaist = new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 0.6), metalMat);
    anvilWaist.position.set(2, 1.35, 5);
    group.add(anvilWaist);
    const anvilTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 1), metalMat);
    anvilTop.position.set(2, 1.7, 5);
    group.add(anvilTop);
    // Horn (tapered end)
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 16), metalMat);
    horn.position.set(3.2, 1.7, 5);
    horn.rotation.z = Math.PI / 2;
    group.add(horn);
    // Hammer on anvil
    const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.25), metalMat);
    hammerHead.position.set(2.3, 2, 5.2);
    group.add(hammerHead);
    const hammerHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 16), woodMat);
    hammerHandle.position.set(2, 2, 5.2);
    hammerHandle.rotation.z = Math.PI / 2;
    group.add(hammerHandle);

    // Forge (more detailed with hood)
    const forgeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff3300, emissiveIntensity: 0.7 });
    const forgeBase = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 2.5), stoneMat);
    forgeBase.position.set(-2, 0.75, 5);
    group.add(forgeBase);
    const forgeBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 0.6, 16), stoneMat);
    forgeBowl.position.set(-2, 1.8, 5);
    group.add(forgeBowl);
    const embers = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.15, 16), forgeMat);
    embers.position.set(-2, 2.15, 5);
    group.add(embers);
    // Forge glow light
    const forgeLight = new THREE.PointLight(0xff4400, 2, 10);
    forgeLight.position.set(-2, 2.5, 5);
    group.add(forgeLight);
    this._torchLights.push(forgeLight);
    this._torchMeshes.push(embers);
    // Hood / chimney
    const hood = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2, 16), stoneMat);
    hood.position.set(-2, 3.5, 5);
    group.add(hood);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 5, 16), stoneMat);
    chimney.position.set(-2, 6, 5);
    group.add(chimney);

    // Bellows
    const bellowsMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.9 });
    const bellowsBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 1), bellowsMat);
    bellowsBody.position.set(-0.5, 1.8, 5);
    group.add(bellowsBody);
    const bellowsNozzle = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 16), metalMat);
    bellowsNozzle.position.set(-0.8, 1.8, 5);
    bellowsNozzle.rotation.z = Math.PI / 2;
    group.add(bellowsNozzle);

    // Water quenching trough
    const troughMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.9 });
    const trough = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 0.8), troughMat);
    trough.position.set(2, 0.3, 3);
    group.add(trough);
    const troughWater = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.6), new THREE.MeshStandardMaterial({ color: 0x336688, transparent: true, opacity: 0.6 }));
    troughWater.position.set(2, 0.55, 3);
    group.add(troughWater);

    // Tool rack on back wall
    const rackBack = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 0.15), woodMat);
    rackBack.position.set(0, 3, -3.4);
    group.add(rackBack);
    // Tools hanging (tongs, files, etc)
    for (let t = -2; t <= 2; t++) {
      const tool = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.06), metalMat);
      tool.position.set(t * 0.6, 3.2, -3.3);
      tool.rotation.z = (t * 0.1);
      group.add(tool);
    }

    // Horseshoe rack
    for (let h = 0; h < 3; h++) {
      const horseshoe = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 10, 20, Math.PI), metalMat);
      horseshoe.position.set(3.5, 2 + h * 0.5, -3.4);
      group.add(horseshoe);
    }

    // Wheel leaning against wall
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 10, 20), woodMat);
    wheel.position.set(4, 0.7, 2);
    wheel.rotation.y = 0.3;
    group.add(wheel);

    group.position.set(x, 0, z);
    group.rotation.y = Math.PI / 4;
    this._cityGroup.add(group);
  }

  // ---------------------------------------------------------------------------
  // Outskirts — farms, trees, hills
  // ---------------------------------------------------------------------------

  private _buildOutskirts(): void {
    const rng = seededRandom(999);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.92, metalness: 0.02 });
    const pineTrunkMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 });
    const leafMats = [
      new THREE.MeshStandardMaterial({ color: 0x337733, roughness: 0.75, metalness: 0.03 }),
      new THREE.MeshStandardMaterial({ color: 0x448833, roughness: 0.75, metalness: 0.03 }),
      new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.75, metalness: 0.03 }),
      new THREE.MeshStandardMaterial({ color: 0x558844, roughness: 0.75, metalness: 0.03 }),
    ];
    const pineLeafMats = [
      new THREE.MeshStandardMaterial({ color: 0x224422, roughness: 0.72, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0x2a5522, roughness: 0.72, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.72, metalness: 0.05 }),
    ];

    // Mixed trees — deciduous and pine (dense forest)
    for (let i = 0; i < 1200; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 95 + rng() * 500;
      const tx = Math.cos(angle) * dist;
      const tz = Math.sin(angle) * dist;
      if (Math.abs(tz + 15) < 15 && dist < 200) continue;

      const isPine = rng() > 0.6;
      const trunkH = isPine ? 5 + rng() * 6 : 3 + rng() * 5;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(isPine ? 0.2 : 0.3, isPine ? 0.35 : 0.5, trunkH, 16),
        isPine ? pineTrunkMat : treeTrunkMat,
      );
      trunk.position.set(tx, trunkH / 2, tz);
      trunk.castShadow = true;
      this._terrainGroup.add(trunk);

      if (isPine) {
        // Conical pine layers
        const pineMat = pineLeafMats[Math.floor(rng() * pineLeafMats.length)];
        for (let layer = 0; layer < 3; layer++) {
          const coneR = 2.5 - layer * 0.6;
          const coneH = 3 - layer * 0.5;
          const cone = new THREE.Mesh(new THREE.ConeGeometry(coneR, coneH, 16), pineMat);
          cone.position.set(tx, trunkH - 1 + layer * 2, tz);
          cone.castShadow = true;
          this._terrainGroup.add(cone);
        }
      } else {
        // Deciduous — multi-cluster canopy
        const leafMat = leafMats[Math.floor(rng() * leafMats.length)];
        const clusters = 1 + Math.floor(rng() * 3);
        for (let c = 0; c < clusters; c++) {
          const leafR = 1.5 + rng() * 2.5;
          const leaves = new THREE.Mesh(new THREE.SphereGeometry(leafR, 16, 12), leafMat);
          const lx = tx + (rng() - 0.5) * 2;
          const ly = trunkH + leafR * 0.5 + c * 0.8;
          const lz = tz + (rng() - 0.5) * 2;
          leaves.position.set(lx, ly, lz);
          leaves.castShadow = true;
          this._terrainGroup.add(leaves);
          // Store for wind sway animation
          if (this._swayTrees.length < 200) {
            this._swayTrees.push({ mesh: leaves, baseY: ly, phase: rng() * Math.PI * 2 });
          }
        }
      }
    }

    // Farm fields
    const fieldColors = [0x88aa44, 0xaacc55, 0x99bb33, 0xbbaa44, 0x77aa33, 0xccbb55];
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x665533, roughness: 0.9 });
    // Exclusion zones: wizard tower, villages
    const _exclZones = [
      { x: 450, z: -350 }, { x: -400, z: 300 },
      { x: 150, z: 40 }, { x: -130, z: -60 },
      { x: 50, z: -300 }, { x: -80, z: 350 },
      { x: 380, z: 150 }, { x: -250, z: -200 }, { x: 300, z: -250 },
    ];
    const _excl = (px: number, pz: number) =>
      _exclZones.some(({ x: ex, z: ez }) => Math.sqrt((px - ex) ** 2 + (pz - ez) ** 2) < 60);

    for (let i = 0; i < 16; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 120 + rng() * 350;
      const fx = Math.cos(angle) * dist;
      const fz = Math.sin(angle) * dist;
      const fw = 15 + rng() * 25;
      const fd = 10 + rng() * 18;
      if (_excl(fx, fz)) continue;

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

      // Full fence (4 sides)
      for (const side of [-1, 1]) {
        const fenceH = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.8, 0.12), fenceMat);
        fenceH.position.set(fx, 0.4, fz + side * fd / 2);
        fenceH.rotation.y = field.rotation.y;
        this._terrainGroup.add(fenceH);

        const fenceV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, fd), fenceMat);
        fenceV.position.set(fx + side * fw / 2, 0.4, fz);
        fenceV.rotation.y = field.rotation.y;
        this._terrainGroup.add(fenceV);
      }
    }

    // Stone walls in countryside
    const stoneWallMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.9 });
    for (let i = 0; i < 8; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 130 + rng() * 300;
      const wx = Math.cos(angle) * dist;
      const wz = Math.sin(angle) * dist;
      if (_excl(wx, wz)) continue;
      const wLen = 15 + rng() * 25;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(wLen, 1.2, 0.6), stoneWallMat);
      wall.position.set(wx, 0.6, wz);
      wall.rotation.y = rng() * Math.PI;
      wall.castShadow = true;
      this._terrainGroup.add(wall);
    }

    // Sheep in fields
    const woolMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.95 });
    const sheepFaceMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
    for (let i = 0; i < 55; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 100 + rng() * 400;
      const sx = Math.cos(angle) * dist;
      const sz = Math.sin(angle) * dist;
      if (Math.abs(sz + 15) < 15 && dist < 200) continue;
      if (_excl(sx, sz)) continue;

      const sheep = new THREE.Group();
      // Woolly body (multiple spheres for fluffiness)
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), woolMat);
      body.position.y = 0.5;
      body.scale.set(1, 0.8, 1.3);
      sheep.add(body);
      // Wool tufts
      for (let tuft = 0; tuft < 4; tuft++) {
        const woolTuft = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), woolMat);
        woolTuft.position.set(
          (rng() - 0.5) * 0.5,
          0.55 + rng() * 0.15,
          (rng() - 0.5) * 0.6,
        );
        sheep.add(woolTuft);
      }
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), sheepFaceMat);
      head.position.set(0, 0.55, -0.65);
      sheep.add(head);
      // Ears
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.08), sheepFaceMat);
        ear.position.set(side * 0.15, 0.65, -0.6);
        ear.rotation.z = side * 0.4;
        sheep.add(ear);
      }
      // Eyes
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        eye.position.set(side * 0.1, 0.58, -0.8);
        sheep.add(eye);
      }
      // Legs
      for (const lx of [-0.2, 0.2]) {
        for (const lz of [-0.3, 0.3]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 16), sheepFaceMat);
          leg.position.set(lx, 0.1, lz);
          sheep.add(leg);
        }
      }
      // Tail
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), woolMat);
      tail.position.set(0, 0.5, 0.6);
      sheep.add(tail);

      sheep.position.set(sx, 0, sz);
      sheep.rotation.y = rng() * Math.PI * 2;
      this._terrainGroup.add(sheep);
    }

    // Flower meadows
    const flowerMeadowColors = [0xff6688, 0xffaa44, 0xaa66ff, 0xffff55, 0xff88cc, 0x66aaff];
    for (let i = 0; i < 8; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 100 + rng() * 400;
      const mx = Math.cos(angle) * dist;
      const mz = Math.sin(angle) * dist;
      if (_excl(mx, mz)) continue;
      for (let f = 0; f < 25; f++) {
        const fMat = new THREE.MeshStandardMaterial({
          color: flowerMeadowColors[Math.floor(rng() * flowerMeadowColors.length)],
          emissive: 0x221111,
          emissiveIntensity: 0.1,
        });
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.15 + rng() * 0.1, 16, 12), fMat);
        flower.position.set(
          mx + (rng() - 0.5) * 12,
          0.3 + rng() * 0.2,
          mz + (rng() - 0.5) * 12,
        );
        this._terrainGroup.add(flower);
      }
    }

    // Ruins (old stone structures)
    this._buildRuins(180, 80, rng);
    this._buildRuins(-160, -100, rng);

    // Small village outside walls
    this._buildVillage(150, 40, rng);
    this._buildVillage(-130, -60, rng);

    // Harbor/docks removed (no river)

    // Windmills
    this._buildWindmill(140, -60);
    this._buildWindmill(-120, 90);
    this._buildWindmill(200, 50);

    // Distant village
    this._buildVillage(-400, 300, rng);
    this._buildWindmill(-380, 320);
    this._buildRuins(-420, 340, rng);

    // Northern hamlet
    this._buildVillage(50, -300, rng);
    this._buildWindmill(30, -320);

    // Southern settlement
    this._buildVillage(-80, 350, rng);
    this._buildWindmill(-60, 370);

    // Far east village
    this._buildVillage(380, 150, rng);
    this._buildWindmill(400, 130);

    // Riverside village
    this._buildVillage(-250, -200, rng);

    // Hilltop village
    this._buildVillage(300, -250, rng);
    this._buildWindmill(320, -270);

    // Wizard tower (far from city)
    this._buildWizardTower(450, -350);
  }

  private _buildRuins(x: number, z: number, rng: () => number): void {
    const ruinMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.9 });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x556644, roughness: 0.95 });
    const darkRuinMat = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.95 });
    const vineMat = new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.9 });

    // Broken walls with varying heights (foundation ruins)
    for (let i = 0; i < 10; i++) {
      const w = 2 + rng() * 6;
      const h = 1 + rng() * 5;
      const mat = rng() > 0.3 ? (rng() > 0.5 ? ruinMat : darkRuinMat) : mossMat;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.7 + rng() * 0.4), mat);
      wall.position.set(x + (rng() - 0.5) * 18, h / 2, z + (rng() - 0.5) * 18);
      wall.rotation.y = rng() * Math.PI;
      wall.castShadow = true;
      this._terrainGroup.add(wall);
      // Vine growing up wall
      if (rng() > 0.5) {
        const vine = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.6, h * 0.8), vineMat);
        vine.position.copy(wall.position);
        vine.position.y += 0.1;
        vine.rotation.y = wall.rotation.y;
        this._terrainGroup.add(vine);
      }
    }

    // Broken arch
    const arch = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.4, 10, 20, Math.PI * 0.7), ruinMat);
    arch.position.set(x, 2.5, z);
    arch.rotation.x = -Math.PI / 2;
    arch.castShadow = true;
    this._terrainGroup.add(arch);
    // Arch support pillars
    for (const side of [-1, 1]) {
      const archPillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3, 0.6), ruinMat);
      archPillar.position.set(x + side * 2.3, 1.5, z);
      archPillar.castShadow = true;
      this._terrainGroup.add(archPillar);
    }

    // Multiple columns (colonnade remnant)
    for (let c = 0; c < 4; c++) {
      const ch = 2 + rng() * 4;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, ch, 16), ruinMat);
      col.position.set(x - 6 + c * 3, ch / 2, z + 5);
      col.castShadow = true;
      this._terrainGroup.add(col);
      // Column capital (top)
      if (rng() > 0.3) {
        const capital = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.8), ruinMat);
        capital.position.set(x - 6 + c * 3, ch + 0.15, z + 5);
        this._terrainGroup.add(capital);
      }
    }

    // Fallen columns
    for (let fc = 0; fc < 2; fc++) {
      const fcLen = 3 + rng() * 3;
      const fallen = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, fcLen, 16), ruinMat);
      fallen.position.set(x + (rng() - 0.5) * 10, 0.35, z + (rng() - 0.5) * 10);
      fallen.rotation.z = Math.PI / 2 - 0.1;
      fallen.rotation.y = rng() * Math.PI;
      this._terrainGroup.add(fallen);
    }

    // Scattered stone blocks
    for (let sb = 0; sb < 15; sb++) {
      const blockSize = 0.3 + rng() * 0.6;
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(blockSize, blockSize * (0.5 + rng() * 0.5), blockSize),
        rng() > 0.5 ? ruinMat : darkRuinMat,
      );
      block.position.set(
        x + (rng() - 0.5) * 20,
        blockSize * 0.25,
        z + (rng() - 0.5) * 20,
      );
      block.rotation.y = rng() * Math.PI;
      block.rotation.z = (rng() - 0.5) * 0.3;
      this._terrainGroup.add(block);
    }

    // Overgrown vegetation
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x448833, roughness: 0.9, side: THREE.DoubleSide });
    for (let g = 0; g < 12; g++) {
      const grass = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.5 + rng() * 0.4), grassMat);
      grass.position.set(x + (rng() - 0.5) * 16, 0.3, z + (rng() - 0.5) * 16);
      grass.rotation.y = rng() * Math.PI;
      this._terrainGroup.add(grass);
    }
  }

  private _buildVillage(x: number, z: number, rng: () => number): void {
    const houseMats = [
      new THREE.MeshStandardMaterial({ color: 0xccbb88, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0xbbaa77, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0xddcc99, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0xc4a870, roughness: 0.85 }),
    ];
    const roofMats = [
      new THREE.MeshStandardMaterial({ color: 0x774433, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x665533, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.8 }),
    ];
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 });
    const darkTimberMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.9 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.92, metalness: 0.02 });
    const winMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, emissive: 0x886633, emissiveIntensity: 0.15 });
    const foundMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.9 });
    const chimMat = new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.9 });
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x665533, roughness: 0.9 });
    const thatchMat = new THREE.MeshStandardMaterial({ color: 0x998844, roughness: 0.95 });
    const shutterMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.85 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.55, metalness: 0.6 });
    const dirtPathMat = new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.95 });

    // --- Village dirt paths (connecting cottages) ---
    const pathGeo = new THREE.PlaneGeometry(40, 3);
    pathGeo.rotateX(-Math.PI / 2);
    const path1 = new THREE.Mesh(pathGeo, dirtPathMat);
    path1.position.set(x, getTerrainHeight(x, z) + 0.05, z);
    path1.receiveShadow = true;
    this._terrainGroup.add(path1);
    const path2 = new THREE.Mesh(new THREE.PlaneGeometry(3, 30), dirtPathMat);
    path2.rotateX(-Math.PI / 2);
    path2.position.set(x, getTerrainHeight(x, z) + 0.05, z);
    path2.receiveShadow = true;
    this._terrainGroup.add(path2);

    // --- Village well at center ---
    const wellGroup = new THREE.Group();
    const wellBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 1, 24), foundMat);
    wellBase.position.y = 0.5;
    wellGroup.add(wellBase);
    const wellRim = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.12, 12, 24), foundMat);
    wellRim.position.y = 1.05;
    wellRim.rotation.x = Math.PI / 2;
    wellGroup.add(wellRim);
    // Well roof supports
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 16), timberMat);
      pole.position.set(side * 0.9, 2.3, 0);
      wellGroup.add(pole);
    }
    const wellRoof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1, 16), roofMats[0]);
    wellRoof.position.y = 4;
    wellRoof.rotation.y = Math.PI / 4;
    wellGroup.add(wellRoof);
    const wellBeam = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.1), timberMat);
    wellBeam.position.y = 3.5;
    wellGroup.add(wellBeam);
    // Bucket
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.25, 16), darkTimberMat);
    bucket.position.set(0.3, 2, 0);
    wellGroup.add(bucket);
    wellGroup.position.set(x, getTerrainHeight(x, z), z);
    this._terrainGroup.add(wellGroup);

    // --- Cottages (12 houses, more spread) ---
    for (let i = 0; i < 12; i++) {
      const hx = x + (rng() - 0.5) * 50;
      const hz = z + (rng() - 0.5) * 40;
      // Avoid placing on top of the well
      if (Math.abs(hx - x) < 4 && Math.abs(hz - z) < 4) continue;
      const hw = 3 + rng() * 3.5;
      const hh = 3 + rng() * 2.5;
      const hd = 3 + rng() * 3.5;
      const mat = houseMats[Math.floor(rng() * houseMats.length)];
      const roofMat = roofMats[Math.floor(rng() * roofMats.length)];
      const rot = rng() * Math.PI * 2;
      const hasSecondFloor = rng() > 0.7;
      const totalH = hasSecondFloor ? hh * 1.6 : hh;

      const cottage = new THREE.Group();

      // Foundation (raised stone base)
      const found = new THREE.Mesh(new THREE.BoxGeometry(hw + 0.3, 0.5, hd + 0.3), foundMat);
      found.position.y = 0.25;
      found.castShadow = true;
      cottage.add(found);

      // Main body
      const body = new THREE.Mesh(new THREE.BoxGeometry(hw, totalH, hd), mat);
      body.position.y = totalH / 2 + 0.5;
      body.castShadow = true;
      body.receiveShadow = true;
      cottage.add(body);

      // Timber frame on all 4 sides
      for (const fz of [1, -1]) {
        // Corner verticals (front/back)
        for (const fx of [-1, 1]) {
          const vb = new THREE.Mesh(new THREE.BoxGeometry(0.15, totalH, 0.15), timberMat);
          vb.position.set(fx * hw / 2, totalH / 2 + 0.5, fz * (hd / 2 + 0.04));
          cottage.add(vb);
        }
        // Horizontal beams at 1/3 and 2/3 height
        for (const bh of [0.35, 0.65]) {
          const hb = new THREE.Mesh(new THREE.BoxGeometry(hw + 0.1, 0.15, 0.15), timberMat);
          hb.position.set(0, totalH * bh + 0.5, fz * (hd / 2 + 0.04));
          cottage.add(hb);
        }
        // Diagonal brace
        if (hw > 3.5) {
          const diag = new THREE.Mesh(new THREE.BoxGeometry(0.12, totalH * 0.35, 0.12), timberMat);
          diag.position.set(hw * 0.2, totalH * 0.25 + 0.5, fz * (hd / 2 + 0.04));
          diag.rotation.z = 0.5;
          cottage.add(diag);
        }
      }
      // Side timber beams
      for (const fx of [-1, 1]) {
        const sb = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, hd + 0.1), timberMat);
        sb.position.set(fx * (hw / 2 + 0.04), totalH * 0.5 + 0.5, 0);
        cottage.add(sb);
      }

      // Second floor overhang (jettied upper floor)
      if (hasSecondFloor) {
        const overhang = new THREE.Mesh(new THREE.BoxGeometry(hw + 0.6, 0.15, hd + 0.6), timberMat);
        overhang.position.y = hh + 0.5;
        cottage.add(overhang);
      }

      // Roof with eaves
      const roofH = totalH * 0.4;
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(hw, hd) * 0.8, roofH, 4),
        roofMat,
      );
      roof.position.y = totalH + roofH / 2 + 0.5;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      cottage.add(roof);

      // Roof eaves (overhang strips)
      for (const ez of [1, -1]) {
        const eave = new THREE.Mesh(new THREE.BoxGeometry(hw + 1.2, 0.08, 0.35), roofMat);
        eave.position.set(0, totalH + 0.55, ez * (hd / 2 + 0.4));
        cottage.add(eave);
      }

      // Door with frame and iron hinges
      const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2), doorMat);
      door.position.set(0, 1.5, hd / 2 + 0.06);
      cottage.add(door);
      const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 0.08), darkTimberMat);
      doorFrame.position.set(0, 1.6, hd / 2 + 0.05);
      cottage.add(doorFrame);
      // Door handle
      const handle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), ironMat);
      handle.position.set(0.3, 1.4, hd / 2 + 0.1);
      cottage.add(handle);
      // Door arch
      const doorArch = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.06, 12, 20, Math.PI),
        darkTimberMat,
      );
      doorArch.position.set(0, 2.55, hd / 2 + 0.05);
      cottage.add(doorArch);
      // Step
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.4), foundMat);
      step.position.set(0, 0.06, hd / 2 + 0.3);
      cottage.add(step);

      // Windows with shutters (front and sides)
      const windowPositions = [
        { x: hw / 2 - 0.7, z: hd / 2 + 0.06, ry: 0 },
        { x: -(hw / 2 - 0.7), z: hd / 2 + 0.06, ry: 0 },
      ];
      if (hasSecondFloor) {
        windowPositions.push(
          { x: 0.5, z: hd / 2 + 0.06, ry: 0 },
          { x: -0.5, z: hd / 2 + 0.06, ry: 0 },
        );
      }
      for (let wi = 0; wi < windowPositions.length; wi++) {
        const wp = windowPositions[wi];
        const wy = wi < 2 ? totalH * 0.5 + 0.5 : hh + totalH * 0.25;
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.7), winMat);
        win.position.set(wp.x, wy, wp.z);
        win.rotation.y = wp.ry;
        cottage.add(win);
        // Window frame
        const wFrame = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.05), darkTimberMat);
        wFrame.position.set(wp.x, wy, wp.z - 0.01);
        cottage.add(wFrame);
        // Window cross bar
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.04), darkTimberMat);
        crossH.position.set(wp.x, wy, wp.z + 0.02);
        cottage.add(crossH);
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.04), darkTimberMat);
        crossV.position.set(wp.x, wy, wp.z + 0.02);
        cottage.add(crossV);
        // Shutters (one open, one closed)
        if (rng() > 0.3) {
          const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.75, 0.04), shutterMat);
          shutter.position.set(wp.x - 0.45, wy, wp.z + 0.03);
          shutter.rotation.y = -0.3;
          cottage.add(shutter);
          const shutter2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.75, 0.04), shutterMat);
          shutter2.position.set(wp.x + 0.45, wy, wp.z + 0.01);
          cottage.add(shutter2);
        }
      }
      // Side window
      const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.6), winMat);
      sideWin.position.set(hw / 2 + 0.06, totalH * 0.5 + 0.5, 0);
      sideWin.rotation.y = Math.PI / 2;
      cottage.add(sideWin);

      // Chimney with brick detail
      if (rng() > 0.2) {
        const chimW = 0.6 + rng() * 0.3;
        const chimH = 2.5 + rng() * 1;
        const chim = new THREE.Mesh(new THREE.BoxGeometry(chimW, chimH, chimW), chimMat);
        chim.position.set(hw / 2 - 0.6, totalH + chimH * 0.2, -hd / 4);
        chim.castShadow = true;
        cottage.add(chim);
        // Chimney cap
        const chimCap = new THREE.Mesh(new THREE.BoxGeometry(chimW + 0.15, 0.1, chimW + 0.15), foundMat);
        chimCap.position.set(hw / 2 - 0.6, totalH + chimH * 0.2 + chimH / 2, -hd / 4);
        cottage.add(chimCap);
        // Chimney mortar lines
        for (let cl = 0; cl < 3; cl++) {
          const mLine = new THREE.Mesh(new THREE.BoxGeometry(chimW + 0.02, 0.03, chimW + 0.02), foundMat);
          mLine.position.set(hw / 2 - 0.6, totalH + chimH * 0.2 - chimH / 2 + cl * (chimH / 3), -hd / 4);
          cottage.add(mLine);
        }
      }

      // Flower box under front window
      if (rng() > 0.4) {
        const fBoxW = 0.7;
        const fBox = new THREE.Mesh(new THREE.BoxGeometry(fBoxW, 0.15, 0.2), darkTimberMat);
        fBox.position.set(hw / 2 - 0.7, totalH * 0.5 + 0.5 - 0.5, hd / 2 + 0.15);
        cottage.add(fBox);
        // Flowers
        const fColors = [0xff6688, 0xffaa44, 0xff88cc, 0xffff55];
        for (let fl = 0; fl < 4; fl++) {
          const flower = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 16, 12),
            new THREE.MeshStandardMaterial({ color: fColors[fl % fColors.length] }),
          );
          flower.position.set(hw / 2 - 0.7 + (fl - 1.5) * 0.15, totalH * 0.5 + 0.5 - 0.35, hd / 2 + 0.15);
          cottage.add(flower);
        }
      }

      // Garden fence (L-shaped or full perimeter)
      if (rng() > 0.4) {
        const fenceH = 0.7;
        // Front fence with gate gap
        const fenceL = new THREE.Mesh(new THREE.BoxGeometry(hw * 0.4, fenceH, 0.08), fenceMat);
        fenceL.position.set(-hw * 0.35, fenceH / 2, hd / 2 + 3);
        cottage.add(fenceL);
        const fenceR = new THREE.Mesh(new THREE.BoxGeometry(hw * 0.4, fenceH, 0.08), fenceMat);
        fenceR.position.set(hw * 0.35, fenceH / 2, hd / 2 + 3);
        cottage.add(fenceR);
        // Fence posts
        for (const px of [-hw * 0.55, -hw * 0.15, hw * 0.15, hw * 0.55]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, fenceH + 0.2, 0.1), fenceMat);
          post.position.set(px, (fenceH + 0.2) / 2, hd / 2 + 3);
          cottage.add(post);
        }
        // Side fence
        const fenceSide = new THREE.Mesh(new THREE.BoxGeometry(0.08, fenceH, 3), fenceMat);
        fenceSide.position.set(hw * 0.55, fenceH / 2, hd / 2 + 1.5);
        cottage.add(fenceSide);
      }

      // Thatch/straw pile beside some cottages
      if (rng() > 0.6) {
        const straw = new THREE.Mesh(
          new THREE.ConeGeometry(1.2, 1.5, 16),
          thatchMat,
        );
        straw.position.set(-hw / 2 - 1.5, 0.75, hd / 4);
        cottage.add(straw);
      }

      // Barrel or crate
      if (rng() > 0.5) {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.8, 16), darkTimberMat);
        barrel.position.set(hw / 2 + 0.8, 0.4, hd / 4);
        cottage.add(barrel);
        // Barrel rings
        for (const ry of [0.15, 0.55]) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.02, 10, 20), ironMat);
          ring.position.set(hw / 2 + 0.8, ry + 0.05, hd / 4);
          ring.rotation.x = Math.PI / 2;
          cottage.add(ring);
        }
      }

      cottage.position.set(hx, getTerrainHeight(hx, hz), hz);
      cottage.rotation.y = rot;
      this._terrainGroup.add(cottage);
    }

    // --- Village signpost ---
    const signGroup = new THREE.Group();
    const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3, 16), timberMat);
    signPole.position.y = 1.5;
    signGroup.add(signPole);
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 0.06), darkTimberMat);
    signBoard.position.set(0.4, 2.8, 0);
    signGroup.add(signBoard);
    signGroup.position.set(x + 5, getTerrainHeight(x + 5, z + 5), z + 5);
    this._terrainGroup.add(signGroup);

    // --- Haystacks scattered around ---
    for (let h = 0; h < 3; h++) {
      const hayX = x + (rng() - 0.5) * 40;
      const hayZ = z + (rng() - 0.5) * 30;
      const hayY = getTerrainHeight(hayX, hayZ);
      const hay = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1.2, 1.5, 16),
        thatchMat,
      );
      hay.position.set(hayX, hayY + 0.75, hayZ);
      hay.castShadow = true;
      this._terrainGroup.add(hay);
      // Hay dome top
      const hayTop = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), thatchMat);
      hayTop.position.copy(hay.position);
      hayTop.position.y = hayY + 1.5;
      this._terrainGroup.add(hayTop);
    }

    // --- Cart ---
    const cartGroup = new THREE.Group();
    const cartBed = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 1.2), darkTimberMat);
    cartBed.position.y = 0.6;
    cartGroup.add(cartBed);
    // Cart sides
    for (const cz of [-1, 1]) {
      const cartSide = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 0.08), darkTimberMat);
      cartSide.position.set(0, 0.9, cz * 0.6);
      cartGroup.add(cartSide);
    }
    const cartBack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 1.2), darkTimberMat);
    cartBack.position.set(-1.2, 0.9, 0);
    cartGroup.add(cartBack);
    // Wheels
    for (const wx of [-0.8, 0.8]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 12, 20), darkTimberMat);
      wheel.position.set(wx, 0.4, 0.7);
      wheel.rotation.y = Math.PI / 2;
      cartGroup.add(wheel);
      const wheel2 = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 12, 20), darkTimberMat);
      wheel2.position.set(wx, 0.4, -0.7);
      wheel2.rotation.y = Math.PI / 2;
      cartGroup.add(wheel2);
    }
    // Shaft
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(2, 0.06, 0.06), darkTimberMat);
    shaft.position.set(2, 0.5, 0);
    shaft.rotation.z = -0.15;
    cartGroup.add(shaft);
    cartGroup.position.set(x + 12, getTerrainHeight(x + 12, z - 8), z - 8);
    cartGroup.rotation.y = rng() * Math.PI;
    this._terrainGroup.add(cartGroup);

    // --- Torches/lanterns near the well and paths ---
    for (let lt = 0; lt < 6; lt++) {
      const lAngle = (lt / 6) * Math.PI * 2 + 0.4;
      const lDist = 8 + rng() * 5;
      const lx = x + Math.cos(lAngle) * lDist;
      const lz = z + Math.sin(lAngle) * lDist;
      const ly = getTerrainHeight(lx, lz);
      const lanternPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3, 16), timberMat);
      lanternPost.position.set(lx, ly + 1.5, lz);
      this._terrainGroup.add(lanternPost);
      const lanternBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), ironMat);
      lanternBox.position.set(lx, ly + 3.2, lz);
      this._terrainGroup.add(lanternBox);
      const lanternGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xff9944, emissive: 0xff8833, emissiveIntensity: 0.5 }),
      );
      lanternGlow.position.set(lx, ly + 3.2, lz);
      this._terrainGroup.add(lanternGlow);
    }

    // --- Small village chapel ---
    const chapelGroup = new THREE.Group();
    const chapelStoneMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.85 });
    const chapelDarkStoneMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.9 });
    // Nave
    const nave = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 8), chapelStoneMat);
    nave.position.y = 2.9;
    nave.castShadow = true;
    chapelGroup.add(nave);
    // Apse (rounded back)
    const apse = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 5, 20, 1, false, 0, Math.PI), chapelStoneMat);
    apse.position.set(0, 2.9, -4.5);
    apse.rotation.y = Math.PI / 2;
    chapelGroup.add(apse);
    // Steep roof
    const chapelRoof = new THREE.Mesh(new THREE.ConeGeometry(4.5, 4, 16), roofMats[0]);
    chapelRoof.position.y = 7.5;
    chapelRoof.rotation.y = Math.PI / 4;
    chapelRoof.castShadow = true;
    chapelGroup.add(chapelRoof);
    // Bell tower
    const bellTower = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 2), chapelStoneMat);
    bellTower.position.set(0, 6, 5);
    bellTower.castShadow = true;
    chapelGroup.add(bellTower);
    // Bell tower cap
    const bellCap = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3, 16), roofMats[0]);
    bellCap.position.set(0, 11.5, 5);
    chapelGroup.add(bellCap);
    // Cross on top
    const crossV2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), ironMat);
    crossV2.position.set(0, 13.5, 5);
    chapelGroup.add(crossV2);
    const crossH2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.12), ironMat);
    crossH2.position.set(0, 14, 5);
    chapelGroup.add(crossH2);
    // Bell openings (arched windows)
    for (const side of [1, -1]) {
      const bellWin = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0x333333 }));
      bellWin.position.set(side * 1.01, 8, 5);
      bellWin.rotation.y = side * Math.PI / 2;
      chapelGroup.add(bellWin);
      const bellArch = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 12, 20, Math.PI), chapelDarkStoneMat);
      bellArch.position.set(side * 1.02, 8.6, 5);
      bellArch.rotation.y = side * Math.PI / 2;
      chapelGroup.add(bellArch);
    }
    // Chapel door
    const chapelDoor = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.5), doorMat);
    chapelDoor.position.set(0, 1.7, 5 + 1.01);
    chapelGroup.add(chapelDoor);
    const chapelDoorArch = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 12, 20, Math.PI), chapelDarkStoneMat);
    chapelDoorArch.position.set(0, 2.95, 5 + 1.02);
    chapelGroup.add(chapelDoorArch);
    // Stained glass window (round)
    const stainedGlass = new THREE.Mesh(
      new THREE.CircleGeometry(0.8, 24),
      new THREE.MeshStandardMaterial({ color: 0x4466aa, emissive: 0x223366, emissiveIntensity: 0.3, transparent: true, opacity: 0.8 }),
    );
    stainedGlass.position.set(0, 4, 5 + 1.01);
    chapelGroup.add(stainedGlass);
    // Stone frame around stained glass
    const glassFrame = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.08, 12, 24), chapelDarkStoneMat);
    glassFrame.position.set(0, 4, 5 + 1.02);
    chapelGroup.add(glassFrame);
    // Nave windows
    for (let nw = 0; nw < 3; nw++) {
      for (const side of [1, -1]) {
        const naveWin = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.2), winMat);
        naveWin.position.set(side * 2.51, 3.5, -2 + nw * 2.5);
        naveWin.rotation.y = side * Math.PI / 2;
        chapelGroup.add(naveWin);
      }
    }
    // Graveyard stones behind chapel
    for (let gs = 0; gs < 6; gs++) {
      const gravestone = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.8 + rng() * 0.4, 0.15),
        chapelDarkStoneMat,
      );
      gravestone.position.set(-3 + rng() * 6, 0.5, -6 - rng() * 4);
      gravestone.rotation.z = (rng() - 0.5) * 0.1;
      chapelGroup.add(gravestone);
      // Rounded top
      const graveTop = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        chapelDarkStoneMat,
      );
      graveTop.position.copy(gravestone.position);
      graveTop.position.y += 0.5 + (rng() > 0.5 ? 0.2 : 0);
      chapelGroup.add(graveTop);
    }
    // Low stone wall around churchyard
    const churchWall = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 0.3), chapelDarkStoneMat);
    churchWall.position.set(0, 0.4, -10);
    chapelGroup.add(churchWall);
    for (const cx2 of [-1, 1]) {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 12), chapelDarkStoneMat);
      sideWall.position.set(cx2 * 9, 0.4, -4);
      chapelGroup.add(sideWall);
    }

    chapelGroup.position.set(x - 18, getTerrainHeight(x - 18, z + 12), z + 12);
    chapelGroup.rotation.y = rng() * 0.3;
    this._terrainGroup.add(chapelGroup);

    // --- Blacksmith forge ---
    const smithGroup = new THREE.Group();
    // Open-air shelter (3 walls + roof)
    const smithBack = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 0.4), houseMats[0]);
    smithBack.position.set(0, 2.4, -2);
    smithBack.castShadow = true;
    smithGroup.add(smithBack);
    for (const sx2 of [-1, 1]) {
      const smithSide = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 4), houseMats[0]);
      smithSide.position.set(sx2 * 3, 2.4, 0);
      smithGroup.add(smithSide);
    }
    // Timber support posts
    for (const sx2 of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 4.5, 16), timberMat);
      post.position.set(sx2 * 2.8, 2.25, 2);
      smithGroup.add(post);
    }
    // Roof
    const smithRoof = new THREE.Mesh(new THREE.ConeGeometry(5, 2.5, 16), roofMats[1]);
    smithRoof.position.y = 5.3;
    smithRoof.rotation.y = Math.PI / 4;
    smithGroup.add(smithRoof);
    // Forge (stone hearth)
    const forgeMat = new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.9 });
    const forge = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 1.5), forgeMat);
    forge.position.set(-1, 1, -1);
    smithGroup.add(forge);
    // Forge fire
    const forgeFire = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff3300, emissiveIntensity: 0.8 }),
    );
    forgeFire.position.set(-1, 1.8, -1);
    smithGroup.add(forgeFire);
    const forgeLight = new THREE.PointLight(0xff4400, 2, 12);
    forgeLight.position.set(-1, 2.5, -1);
    smithGroup.add(forgeLight);
    // Forge chimney
    const forgeChim = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1), forgeMat);
    forgeChim.position.set(-1, 4.5, -1.5);
    smithGroup.add(forgeChim);
    // Anvil
    const anvilBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), ironMat);
    anvilBase.position.set(1.2, 0.7, 0);
    smithGroup.add(anvilBase);
    const anvilTop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.35), ironMat);
    anvilTop.position.set(1.2, 1.08, 0);
    smithGroup.add(anvilTop);
    const anvilHorn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 16), ironMat);
    anvilHorn.position.set(1.55, 1.05, 0);
    anvilHorn.rotation.z = Math.PI / 2;
    smithGroup.add(anvilHorn);
    // Water quench trough
    const trough = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.6), darkTimberMat);
    trough.position.set(2, 0.35, -1);
    smithGroup.add(trough);
    const troughWater = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.05, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x3388aa, transparent: true, opacity: 0.6 }),
    );
    troughWater.position.set(2, 0.55, -1);
    smithGroup.add(troughWater);
    // Tool rack on back wall
    for (let t = 0; t < 4; t++) {
      const tool = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 16), timberMat);
      tool.position.set(-2 + t * 1, 2.5, -1.7);
      tool.rotation.z = 0.1 * (t % 2 === 0 ? 1 : -1);
      smithGroup.add(tool);
      // Tool head
      const toolHead = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.08), ironMat);
      toolHead.position.set(-2 + t * 1, 3.3, -1.7);
      smithGroup.add(toolHead);
    }
    // Horseshoes hanging
    for (let hs = 0; hs < 3; hs++) {
      const horseshoe = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 10, 20, Math.PI * 1.5), ironMat);
      horseshoe.position.set(-1.5 + hs * 0.5, 3.5, -1.75);
      smithGroup.add(horseshoe);
    }

    smithGroup.position.set(x + 18, getTerrainHeight(x + 18, z - 5), z - 5);
    smithGroup.rotation.y = rng() * Math.PI;
    this._terrainGroup.add(smithGroup);

    // --- Animal pen with livestock ---
    const penGroup = new THREE.Group();
    const penFenceMat = new THREE.MeshStandardMaterial({ color: 0x665533, roughness: 0.9 });
    const penW = 12;
    const penD = 8;
    // Fence posts and rails (3-rail fence)
    for (let fp = 0; fp <= 6; fp++) {
      const fpx = -penW / 2 + fp * (penW / 6);
      // Front and back
      for (const fside of [-1, 1]) {
        if (fside === 1 && fp >= 2 && fp <= 4) continue; // gate opening
        const fpost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.2, 16), penFenceMat);
        fpost.position.set(fpx, 0.6, fside * penD / 2);
        penGroup.add(fpost);
      }
    }
    // Rails
    for (const rail of [0.3, 0.7, 1.0]) {
      // Back rail (full)
      const backRail = new THREE.Mesh(new THREE.BoxGeometry(penW, 0.06, 0.06), penFenceMat);
      backRail.position.set(0, rail, -penD / 2);
      penGroup.add(backRail);
      // Front rails (with gate gap)
      const frontRailL = new THREE.Mesh(new THREE.BoxGeometry(penW * 0.3, 0.06, 0.06), penFenceMat);
      frontRailL.position.set(-penW * 0.35, rail, penD / 2);
      penGroup.add(frontRailL);
      const frontRailR = new THREE.Mesh(new THREE.BoxGeometry(penW * 0.3, 0.06, 0.06), penFenceMat);
      frontRailR.position.set(penW * 0.35, rail, penD / 2);
      penGroup.add(frontRailR);
      // Side rails
      for (const sx3 of [-1, 1]) {
        const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, penD), penFenceMat);
        sideRail.position.set(sx3 * penW / 2, rail, 0);
        penGroup.add(sideRail);
      }
    }
    // Mud ground inside pen
    const penGround = new THREE.Mesh(
      new THREE.PlaneGeometry(penW - 1, penD - 1),
      new THREE.MeshStandardMaterial({ color: 0x6a5a3a, roughness: 0.95 }),
    );
    penGround.rotation.x = -Math.PI / 2;
    penGround.position.y = 0.03;
    penGroup.add(penGround);
    // Chickens (small simple birds)
    const chickenBodyMat = new THREE.MeshStandardMaterial({ color: 0xcc8844, roughness: 0.9 });
    const chickenWhiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.9 });
    const chickenRedMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.8 });
    for (let ch = 0; ch < 6; ch++) {
      const chicken = new THREE.Group();
      const cBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), ch % 2 === 0 ? chickenBodyMat : chickenWhiteMat);
      cBody.position.y = 0.25;
      cBody.scale.set(1, 0.8, 1.2);
      chicken.add(cBody);
      const cHead = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), ch % 2 === 0 ? chickenBodyMat : chickenWhiteMat);
      cHead.position.set(0, 0.38, -0.18);
      chicken.add(cHead);
      const cComb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.06), chickenRedMat);
      cComb.position.set(0, 0.46, -0.18);
      chicken.add(cComb);
      const cBeak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xddaa44 }));
      cBeak.position.set(0, 0.36, -0.28);
      cBeak.rotation.x = Math.PI / 2;
      chicken.add(cBeak);
      // Legs
      for (const lx2 of [-0.06, 0.06]) {
        const cLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.15, 16), new THREE.MeshStandardMaterial({ color: 0xddaa44 }));
        cLeg.position.set(lx2, 0.08, 0);
        chicken.add(cLeg);
      }
      chicken.position.set(
        (rng() - 0.5) * (penW - 2),
        0,
        (rng() - 0.5) * (penD - 2),
      );
      chicken.rotation.y = rng() * Math.PI * 2;
      penGroup.add(chicken);
    }
    // Pig
    const pigGroup2 = new THREE.Group();
    const pigMat = new THREE.MeshStandardMaterial({ color: 0xddaa88, roughness: 0.9 });
    const pigBody = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), pigMat);
    pigBody.position.y = 0.4;
    pigBody.scale.set(1, 0.8, 1.3);
    pigGroup2.add(pigBody);
    const pigHead = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), pigMat);
    pigHead.position.set(0, 0.4, -0.55);
    pigGroup2.add(pigHead);
    const pigSnout = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xcc9977 }));
    pigSnout.position.set(0, 0.35, -0.75);
    pigSnout.rotation.x = Math.PI / 2;
    pigGroup2.add(pigSnout);
    // Ears
    for (const ex2 of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.06), pigMat);
      ear.position.set(ex2 * 0.15, 0.58, -0.5);
      ear.rotation.z = ex2 * 0.3;
      pigGroup2.add(ear);
    }
    // Legs
    for (const lx2 of [-0.2, 0.2]) {
      for (const lz2 of [-0.25, 0.25]) {
        const pLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 16), pigMat);
        pLeg.position.set(lx2, 0.12, lz2);
        pigGroup2.add(pLeg);
      }
    }
    const pigTail = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 10, 20, Math.PI * 1.5), pigMat);
    pigTail.position.set(0, 0.5, 0.55);
    pigGroup2.add(pigTail);
    pigGroup2.position.set(-2, 0, -1);
    pigGroup2.rotation.y = rng() * Math.PI * 2;
    penGroup.add(pigGroup2);

    // Feeding trough in pen
    const feedTrough = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 0.5), darkTimberMat);
    feedTrough.position.set(3, 0.2, 0);
    penGroup.add(feedTrough);
    // Hay in trough
    const troughHay = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.15, 0.35), thatchMat);
    troughHay.position.set(3, 0.38, 0);
    penGroup.add(troughHay);

    penGroup.position.set(x + 15, getTerrainHeight(x + 15, z + 15), z + 15);
    penGroup.rotation.y = rng() * Math.PI;
    this._terrainGroup.add(penGroup);

    // --- Market cross / village square marker ---
    const marketCross = new THREE.Group();
    // Octagonal stepped base
    for (let mb = 0; mb < 3; mb++) {
      const mStep = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5 - mb * 0.3, 1.6 - mb * 0.3, 0.3, 16),
        foundMat,
      );
      mStep.position.y = mb * 0.3 + 0.15;
      marketCross.add(mStep);
    }
    // Column
    const mCol = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 4, 16), chapelStoneMat);
    mCol.position.y = 3;
    marketCross.add(mCol);
    // Cross at top
    const mCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), chapelStoneMat);
    mCrossV.position.y = 5.5;
    marketCross.add(mCrossV);
    const mCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.12), chapelStoneMat);
    mCrossH.position.y = 5.8;
    marketCross.add(mCrossH);
    // Decorative finial
    const mFinial = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), chapelStoneMat);
    mFinial.position.y = 6.1;
    marketCross.add(mFinial);
    marketCross.position.set(x + 3, getTerrainHeight(x + 3, z - 3), z - 3);
    this._terrainGroup.add(marketCross);

    // --- Water trough for animals / travellers ---
    const waterTroughGroup = new THREE.Group();
    const wtBody = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 0.8), foundMat);
    wtBody.position.y = 0.5;
    waterTroughGroup.add(wtBody);
    // Legs
    for (const wlx of [-1, 1]) {
      const wtLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.8), foundMat);
      wtLeg.position.set(wlx * 0.9, 0.25, 0);
      waterTroughGroup.add(wtLeg);
    }
    // Water surface
    const wtWater = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.04, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x3388aa, transparent: true, opacity: 0.5 }),
    );
    wtWater.position.set(0, 0.78, 0);
    waterTroughGroup.add(wtWater);
    waterTroughGroup.position.set(x - 8, getTerrainHeight(x - 8, z - 6), z - 6);
    waterTroughGroup.rotation.y = rng() * Math.PI;
    this._terrainGroup.add(waterTroughGroup);

    // --- Woodpile ---
    const woodpileGroup = new THREE.Group();
    const logMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 16), logMat);
        log.position.set(col * 0.26 - 0.5, 0.14 + row * 0.24, 0);
        log.rotation.z = Math.PI / 2;
        woodpileGroup.add(log);
      }
    }
    // Support stakes
    for (const ws of [-0.65, 0.65]) {
      const stake = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.06), logMat);
      stake.position.set(ws, 0.4, 0);
      woodpileGroup.add(stake);
    }
    woodpileGroup.position.set(x - 12, getTerrainHeight(x - 12, z + 3), z + 3);
    woodpileGroup.rotation.y = rng() * Math.PI;
    this._terrainGroup.add(woodpileGroup);

    // --- Clothesline ---
    const clothGroup = new THREE.Group();
    // Poles
    for (const cp of [-2.5, 2.5]) {
      const clothPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.5, 16), timberMat);
      clothPole.position.set(cp, 1.25, 0);
      clothGroup.add(clothPole);
    }
    // Line
    const clothLine = new THREE.Mesh(new THREE.BoxGeometry(5, 0.015, 0.015), new THREE.MeshStandardMaterial({ color: 0x998877 }));
    clothLine.position.y = 2.4;
    clothGroup.add(clothLine);
    // Hanging clothes (simple planes)
    const clothColors = [0xeeddcc, 0xaa7766, 0x667788, 0xddcc99, 0x886655];
    for (let cl = 0; cl < 4; cl++) {
      const cloth = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.8 + rng() * 0.5),
        new THREE.MeshStandardMaterial({ color: clothColors[cl], side: THREE.DoubleSide }),
      );
      cloth.position.set(-1.5 + cl * 1, 1.8, 0.02);
      cloth.rotation.z = (rng() - 0.5) * 0.15;
      clothGroup.add(cloth);
    }
    clothGroup.position.set(x - 6, getTerrainHeight(x - 6, z + 18), z + 18);
    clothGroup.rotation.y = rng() * Math.PI;
    this._terrainGroup.add(clothGroup);

    // --- Scarecrow in nearby field ---
    const scarecrow = new THREE.Group();
    // Pole
    const scPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.5, 16), timberMat);
    scPole.position.y = 1.25;
    scarecrow.add(scPole);
    // Arms
    const scArms = new THREE.Mesh(new THREE.BoxGeometry(2, 0.06, 0.06), timberMat);
    scArms.position.y = 2;
    scarecrow.add(scArms);
    // Head (burlap sack)
    const scHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), thatchMat);
    scHead.position.y = 2.7;
    scarecrow.add(scHead);
    // Hat
    const scHat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 16), darkTimberMat);
    scHat.position.y = 3;
    scarecrow.add(scHat);
    const scBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 16), darkTimberMat);
    scBrim.position.y = 2.8;
    scarecrow.add(scBrim);
    // Tattered shirt
    const scShirt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.2), new THREE.MeshStandardMaterial({ color: 0x886655, side: THREE.DoubleSide }));
    scShirt.position.y = 1.8;
    scarecrow.add(scShirt);
    const scX = x + (rng() - 0.5) * 30;
    const scZ = z + 20 + rng() * 10;
    scarecrow.position.set(scX, getTerrainHeight(scX, scZ), scZ);
    this._terrainGroup.add(scarecrow);
  }

  private _buildWindmill(x: number, z: number): void {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.8 });
    const darkStoneMat4 = new THREE.MeshStandardMaterial({ color: 0xaa9977, roughness: 0.85 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
    const roofMat2 = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.8 });

    // Stone foundation
    const foundation = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5, 1, 20), darkStoneMat4);
    foundation.position.y = 0.5;
    group.add(foundation);

    // Tower body (higher poly tapered cylinder)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 12, 24, 2), stoneMat);
    body.position.y = 7;
    body.castShadow = true;
    group.add(body);

    // Stone band decorations on tower
    for (let b = 0; b < 3; b++) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(3.3 - b * 0.2, 0.12, 10, 24), darkStoneMat4);
      band.position.y = 4 + b * 4;
      band.rotation.x = Math.PI / 2;
      group.add(band);
    }

    // Door
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.92, metalness: 0.02 });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.5), doorMat);
    door.position.set(0, 2.5, 4.05);
    group.add(door);
    // Door arch
    const doorArch = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.1, 10, 20, Math.PI), stoneMat);
    doorArch.position.set(0, 3.75, 4.04);
    doorArch.rotation.x = Math.PI / 2;
    group.add(doorArch);

    // Windows (3 at different heights)
    const winMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, emissive: 0x886633, emissiveIntensity: 0.15 });
    for (let w = 0; w < 3; w++) {
      const wa = w * Math.PI * 2 / 3 + Math.PI / 4;
      const wy = 6 + w * 3;
      const r = 3.2 - w * 0.15;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), winMat);
      win.position.set(Math.sin(wa) * r, wy, Math.cos(wa) * r);
      win.rotation.y = wa + Math.PI / 2;
      group.add(win);
    }

    // Gallery / balcony around tower top
    const galleryFloor = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.4, 10, 24), woodMat);
    galleryFloor.position.y = 12.5;
    galleryFloor.rotation.x = Math.PI / 2;
    group.add(galleryFloor);
    // Gallery railing posts
    for (let gp = 0; gp < 8; gp++) {
      const ga = (gp / 8) * Math.PI * 2;
      const grPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 16), woodMat);
      grPost.position.set(Math.sin(ga) * 3.8, 13, Math.cos(ga) * 3.8);
      group.add(grPost);
    }
    // Gallery railing ring
    const railRing = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.06, 10, 24), woodMat);
    railRing.position.y = 13.5;
    railRing.rotation.x = Math.PI / 2;
    group.add(railRing);

    // Conical roof (higher poly)
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4, 4.5, 20), roofMat2);
    roof.position.y = 15.5;
    roof.castShadow = true;
    group.add(roof);

    // Blade hub (center disc)
    const hubDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16), woodMat);
    hubDisc.position.set(0, 12, 4);
    hubDisc.rotation.x = Math.PI / 2;
    group.add(hubDisc);

    // Blades (more detailed with lattice frame)
    const bladesHub = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const bladeArm = new THREE.Group();
      // Main spar
      const spar = new THREE.Mesh(new THREE.BoxGeometry(0.25, 9, 0.12), woodMat);
      spar.position.set(0, 4.5, 0);
      bladeArm.add(spar);
      // Cross bars (lattice)
      for (let cb = 0; cb < 6; cb++) {
        const crossBar = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.08), woodMat);
        crossBar.position.set(1.25, 1.5 + cb * 1.2, 0);
        bladeArm.add(crossBar);
      }
      // Sail cloth
      const sailMat = new THREE.MeshStandardMaterial({
        color: 0xddccaa,
        roughness: 0.9,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 7, 1, 3), sailMat);
      sail.position.set(1.2, 4.5, 0.02);
      bladeArm.add(sail);
      bladeArm.rotation.z = (i / 4) * Math.PI * 2;
      bladesHub.add(bladeArm);
    }
    bladesHub.position.set(0, 12, 4.2);
    group.add(bladesHub);
    this._windmillBladeGroups.push(bladesHub);

    // Grain sacks at base
    const sackMat = new THREE.MeshStandardMaterial({ color: 0xaa9966, roughness: 0.95 });
    for (let s = 0; s < 3; s++) {
      const sack = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), sackMat);
      sack.position.set(1.5 + s * 0.7, 0.3, 3);
      sack.scale.y = 0.7;
      group.add(sack);
    }

    group.position.set(x, 0, z);
    this._terrainGroup.add(group);
  }

  // ---------------------------------------------------------------------------
  // Wizard Tower — half-open ruined tower with landing platform
  // ---------------------------------------------------------------------------

  private _buildWizardTower(x: number, z: number): void {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.85 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 });
    const lightStoneMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.85 });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x445533, roughness: 0.95 });
    const darkMossMat = new THREE.MeshStandardMaterial({ color: 0x334422, roughness: 0.95 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.92, metalness: 0.02 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3a2211, roughness: 0.9 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.55, metalness: 0.6 });
    const arcaneGlowMat = new THREE.MeshStandardMaterial({
      color: 0x4466ff, emissive: 0x2244cc, emissiveIntensity: 0.6,
    });
    const runeGlowMat = new THREE.MeshStandardMaterial({
      color: 0x6644ff, emissive: 0x4422cc, emissiveIntensity: 0.5,
    });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x88aaff, emissive: 0x4488ff, emissiveIntensity: 0.8,
      transparent: true, opacity: 0.85,
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.8 });
    const carpetMat = new THREE.MeshStandardMaterial({ color: 0x662244, roughness: 0.95 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xddbb55, roughness: 0.3, metalness: 0.75 });
    const candleMat = new THREE.MeshStandardMaterial({ color: 0xeeddbb, roughness: 0.9 });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff8833, emissive: 0xff6622, emissiveIntensity: 0.8,
    });
    const rubbleRng = seededRandom(777);

    const towerRadius = 5;
    const towerHeight = 32;

    // --- Stepped stone foundation ---
    for (let step = 0; step < 3; step++) {
      const stepR = 8 - step * 0.5;
      const stepH = 0.6;
      const stepMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(stepR, stepR + 0.3, stepH, 32),
        darkStoneMat,
      );
      stepMesh.position.y = step * stepH + stepH / 2;
      stepMesh.castShadow = true;
      group.add(stepMesh);
    }

    // --- Tower body (intact side, ~240 degrees) ---
    const towerBody = new THREE.Mesh(
      new THREE.CylinderGeometry(towerRadius, towerRadius + 1, towerHeight, 32, 8, true, 0, Math.PI * 1.35),
      stoneMat,
    );
    towerBody.position.y = 2 + towerHeight / 2;
    towerBody.castShadow = true;
    group.add(towerBody);

    // Inner wall (slightly smaller, same arc)
    const innerWall = new THREE.Mesh(
      new THREE.CylinderGeometry(towerRadius - 0.6, towerRadius + 0.4, towerHeight, 32, 8, true, 0, Math.PI * 1.35),
      darkStoneMat,
    );
    innerWall.position.y = 2 + towerHeight / 2;
    group.add(innerWall);

    // --- Broken side (3 fragments at varying heights for jagged look) ---
    const fragments = [
      { start: Math.PI * 1.35, span: Math.PI * 0.15, hFrac: 0.75 },
      { start: Math.PI * 1.5, span: Math.PI * 0.12, hFrac: 0.5 },
      { start: Math.PI * 1.62, span: Math.PI * 0.08, hFrac: 0.35 },
      { start: Math.PI * 1.8, span: Math.PI * 0.1, hFrac: 0.55 },
      { start: Math.PI * 1.9, span: Math.PI * 0.1, hFrac: 0.3 },
    ];
    for (const frag of fragments) {
      const fragH = towerHeight * frag.hFrac;
      const fragWall = new THREE.Mesh(
        new THREE.CylinderGeometry(towerRadius, towerRadius + 1, fragH, 16, 3, true, frag.start, frag.span),
        stoneMat,
      );
      fragWall.position.y = 2 + fragH / 2;
      fragWall.castShadow = true;
      group.add(fragWall);
    }

    // --- Brick mortar rings on tower ---
    for (let br = 0; br < 22; br++) {
      const ringY = 3 + br * 1.4;
      if (ringY > towerHeight + 1) break;
      const brickRing = new THREE.Mesh(
        new THREE.TorusGeometry(towerRadius + 0.06, 0.07, 12, 40, Math.PI * 1.35),
        darkStoneMat,
      );
      brickRing.position.y = ringY;
      brickRing.rotation.x = Math.PI / 2;
      group.add(brickRing);
      // Vertical joints (staggered)
      const jCount = 12;
      for (let j = 0; j < jCount; j++) {
        const ja = ((j + (br % 2 === 0 ? 0 : 0.5)) / jCount) * Math.PI * 1.35;
        const joint = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 1.3, 0.05),
          darkStoneMat,
        );
        joint.position.set(
          Math.cos(ja) * (towerRadius + 0.08),
          ringY + 0.65,
          Math.sin(ja) * (towerRadius + 0.08),
        );
        joint.rotation.y = ja;
        group.add(joint);
      }
    }

    // --- Stone course ledges (horizontal bands, protruding) ---
    for (let ledge = 0; ledge < 4; ledge++) {
      const ledgeY = 6 + ledge * 7;
      const ledgeRing = new THREE.Mesh(
        new THREE.TorusGeometry(towerRadius + 0.2, 0.15, 12, 36, Math.PI * 1.35),
        lightStoneMat,
      );
      ledgeRing.position.y = ledgeY;
      ledgeRing.rotation.x = Math.PI / 2;
      group.add(ledgeRing);
    }

    // --- Spiral staircase (visible through the open side) ---
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.85 });
    for (let s = 0; s < 35; s++) {
      const sa = (s / 35) * Math.PI * 5; // 2.5 turns
      const sy = 2.5 + s * 0.9;
      if (sy > towerHeight) break;
      // Wedge-shaped step (wider at outside)
      const stairStep = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.2, 0.7),
        stairMat,
      );
      stairStep.position.set(
        Math.cos(sa) * (towerRadius - 2.2),
        sy,
        Math.sin(sa) * (towerRadius - 2.2),
      );
      stairStep.rotation.y = -sa;
      group.add(stairStep);
      // Railing post on outer edge
      if (s % 3 === 0) {
        const railPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 16), ironMat);
        railPost.position.set(
          Math.cos(sa) * (towerRadius - 1),
          sy + 0.5,
          Math.sin(sa) * (towerRadius - 1),
        );
        group.add(railPost);
      }
    }

    // Central column for staircase
    const centralPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.6, towerHeight, 24),
      darkStoneMat,
    );
    centralPillar.position.y = 2 + towerHeight / 2;
    group.add(centralPillar);

    // --- Floor platforms (3 levels) ---
    const floorLevels = [10, 18, 25];
    for (let fi = 0; fi < floorLevels.length; fi++) {
      const floorY = floorLevels[fi];
      const floorMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(towerRadius - 0.6, towerRadius - 0.6, 0.35, 32, 1, false, 0, Math.PI * 1.35),
        woodMat,
      );
      floorMesh.position.y = floorY;
      group.add(floorMesh);
      // Floor support beams (radial)
      for (let fb = 0; fb < 4; fb++) {
        const fbAngle = (fb / 4) * Math.PI * 1.2 + 0.1;
        const beam = new THREE.Mesh(new THREE.BoxGeometry(towerRadius - 1.2, 0.15, 0.15), darkWoodMat);
        beam.position.set(
          Math.cos(fbAngle) * (towerRadius / 2 - 0.3),
          floorY - 0.25,
          Math.sin(fbAngle) * (towerRadius / 2 - 0.3),
        );
        beam.rotation.y = fbAngle + Math.PI / 2;
        group.add(beam);
      }
    }

    // --- Landing platform at top ---
    const landingPlatform = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 6.5, 0.7, 28),
      stoneMat,
    );
    landingPlatform.position.y = towerHeight + 2.3;
    landingPlatform.castShadow = true;
    group.add(landingPlatform);

    // Platform decorative rim (double)
    for (const rimY of [towerHeight + 2.7, towerHeight + 2.9]) {
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(6.8, 0.15, 12, 40),
        darkStoneMat,
      );
      rim.position.y = rimY;
      rim.rotation.x = Math.PI / 2;
      group.add(rim);
    }

    // Low parapet wall with merlons on intact side
    const parapet = new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 6.8, 1.2, 32, 1, true, 0, Math.PI * 1.35),
      stoneMat,
    );
    parapet.position.y = towerHeight + 3.3;
    group.add(parapet);
    // Merlons on parapet
    for (let m = 0; m < 10; m++) {
      const ma = (m / 10) * Math.PI * 1.35;
      if (m % 2 === 0) continue;
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.6), stoneMat);
      merlon.position.set(
        Math.cos(ma) * 6.8,
        towerHeight + 4.3,
        Math.sin(ma) * 6.8,
      );
      merlon.rotation.y = ma;
      group.add(merlon);
    }

    // --- Half roof (conical, covers intact side only) ---
    const halfRoof = new THREE.Mesh(
      new THREE.ConeGeometry(7, 7, 20, 1, false, 0, Math.PI),
      roofMat,
    );
    halfRoof.position.y = towerHeight + 7.5;
    halfRoof.rotation.y = Math.PI * 0.25;
    halfRoof.castShadow = true;
    group.add(halfRoof);
    // Exposed roof beams on broken side
    for (let rb = 0; rb < 5; rb++) {
      const rbAngle = Math.PI * 1.35 + (rb / 5) * Math.PI * 0.5;
      const rafter = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 16), woodMat);
      rafter.position.set(
        Math.cos(rbAngle) * 3.5,
        towerHeight + 5,
        Math.sin(rbAngle) * 3.5,
      );
      rafter.rotation.z = Math.PI / 4;
      rafter.rotation.y = -rbAngle;
      group.add(rafter);
    }

    // --- Rubble at base of open side (more scattered, varied shapes) ---
    for (let r = 0; r < 35; r++) {
      const rAngle = Math.PI * 1.3 + rubbleRng() * Math.PI * 0.75;
      const rDist = towerRadius + 0.5 + rubbleRng() * 7;
      const rSize = 0.2 + rubbleRng() * 1.2;
      const rubbleGeo = rubbleRng() > 0.6
        ? new THREE.BoxGeometry(rSize, rSize * 0.5, rSize * 0.7)
        : new THREE.SphereGeometry(rSize * 0.4, 16, 12);
      const rubble = new THREE.Mesh(
        rubbleGeo,
        rubbleRng() > 0.4 ? stoneMat : darkStoneMat,
      );
      rubble.position.set(
        Math.cos(rAngle) * rDist,
        rSize * 0.25,
        Math.sin(rAngle) * rDist,
      );
      rubble.rotation.set(rubbleRng() * 0.5, rubbleRng() * Math.PI, rubbleRng() * 0.5);
      rubble.castShadow = true;
      group.add(rubble);
    }

    // --- Moss/vine patches on walls (more varied, some dripping) ---
    for (let m = 0; m < 20; m++) {
      const mAngle = rubbleRng() * Math.PI * 1.35;
      const mY = 2 + rubbleRng() * (towerHeight - 2);
      const mW = 1 + rubbleRng() * 2.5;
      const mH = 0.5 + rubbleRng() * 2;
      const mossPatch = new THREE.Mesh(
        new THREE.PlaneGeometry(mW, mH),
        rubbleRng() > 0.5 ? mossMat : darkMossMat,
      );
      mossPatch.position.set(
        Math.cos(mAngle) * (towerRadius + 0.12),
        mY,
        Math.sin(mAngle) * (towerRadius + 0.12),
      );
      mossPatch.rotation.y = mAngle + Math.PI / 2;
      group.add(mossPatch);
    }
    // Hanging ivy tendrils at broken edges
    for (let iv = 0; iv < 6; iv++) {
      const ivAngle = Math.PI * 1.3 + rubbleRng() * Math.PI * 0.15;
      const ivH = 3 + rubbleRng() * 6;
      const ivy = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, ivH),
        darkMossMat,
      );
      ivy.position.set(
        Math.cos(ivAngle) * (towerRadius + 0.1),
        towerHeight * 0.6 - ivH / 2 + rubbleRng() * 8,
        Math.sin(ivAngle) * (towerRadius + 0.1),
      );
      ivy.rotation.y = ivAngle + Math.PI / 2;
      group.add(ivy);
    }

    // --- Arcane crystal on ornate pedestal ---
    // Pedestal base
    const pedBase = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 0.4, 20), darkStoneMat);
    pedBase.position.y = towerHeight + 2.8;
    group.add(pedBase);
    // Pedestal column
    const pedCol = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.2, 16), lightStoneMat);
    pedCol.position.y = towerHeight + 3.6;
    group.add(pedCol);
    // Pedestal top dish
    const pedTop = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 0.2, 16), darkStoneMat);
    pedTop.position.y = towerHeight + 4.3;
    group.add(pedTop);
    // Main crystal (large, rotating in update)
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 1), crystalMat);
    crystal.position.y = towerHeight + 5;
    group.add(crystal);
    // Secondary smaller crystals
    for (let sc = 0; sc < 4; sc++) {
      const scA = (sc / 4) * Math.PI * 2;
      const smallCrystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.2, 0),
        crystalMat,
      );
      smallCrystal.position.set(
        Math.cos(scA) * 0.6,
        towerHeight + 4.6,
        Math.sin(scA) * 0.6,
      );
      smallCrystal.rotation.set(0.3, scA, 0.5);
      group.add(smallCrystal);
    }

    // Magical point light
    const magicLight = new THREE.PointLight(0x4488ff, 4, 40);
    magicLight.position.y = towerHeight + 5;
    group.add(magicLight);
    // Secondary warm light inside (mid level)
    const innerLight = new THREE.PointLight(0xff8844, 2, 15);
    innerLight.position.set(0, 19, 0);
    group.add(innerLight);

    // --- Glowing rune circle on landing platform ---
    // Outer rune ring
    const runeRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.5, 0.08, 12, 40),
      arcaneGlowMat,
    );
    runeRing.position.y = towerHeight + 2.7;
    runeRing.rotation.x = Math.PI / 2;
    group.add(runeRing);
    // Inner rune ring
    const runeRingInner = new THREE.Mesh(
      new THREE.TorusGeometry(2, 0.06, 12, 32),
      runeGlowMat,
    );
    runeRingInner.position.y = towerHeight + 2.7;
    runeRingInner.rotation.x = Math.PI / 2;
    group.add(runeRingInner);
    // Rune stones around circle
    for (let rs = 0; rs < 8; rs++) {
      const rsAngle = (rs / 8) * Math.PI * 2;
      const rune = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.12, 0.5),
        rs % 2 === 0 ? arcaneGlowMat : runeGlowMat,
      );
      rune.position.set(Math.cos(rsAngle) * 3, towerHeight + 2.72, Math.sin(rsAngle) * 3);
      rune.rotation.y = rsAngle + Math.PI / 4;
      group.add(rune);
    }
    // Arcane symbol lines (cross pattern)
    for (let line = 0; line < 4; line++) {
      const lineAngle = (line / 4) * Math.PI;
      const arcaneLine = new THREE.Mesh(new THREE.BoxGeometry(5, 0.04, 0.08), arcaneGlowMat);
      arcaneLine.position.y = towerHeight + 2.68;
      arcaneLine.rotation.y = lineAngle;
      group.add(arcaneLine);
    }

    // --- Study room furnishings (mid level, floor 2 at y=18) ---
    // Desk
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 1), woodMat);
    desk.position.set(2.5, 18.8, 1.5);
    desk.rotation.y = 0.3;
    group.add(desk);
    // Desk legs
    for (const dl of [[-0.8, -0.4], [-0.8, 0.4], [0.8, -0.4], [0.8, 0.4]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), darkWoodMat);
      leg.position.set(2.5 + dl[0] * 0.9, 18.45, 1.5 + dl[1] * 0.4);
      group.add(leg);
    }
    // Open book on desk
    const openBook = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.35), new THREE.MeshStandardMaterial({ color: 0xeeddbb }));
    openBook.position.set(2.5, 18.88, 1.5);
    openBook.rotation.y = 0.3;
    group.add(openBook);
    // Candle on desk
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 16), candleMat);
    candle.position.set(3.2, 19, 1.2);
    group.add(candle);
    const candleFlame = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 16), flameMat);
    candleFlame.position.set(3.2, 19.2, 1.2);
    group.add(candleFlame);

    // Chair
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.5), woodMat);
    chairSeat.position.set(1.5, 18.5, 1.5);
    group.add(chairSeat);
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.06), woodMat);
    chairBack.position.set(1.5, 18.85, 1.25);
    group.add(chairBack);

    // Carpet/rug on study floor
    const carpet = new THREE.Mesh(new THREE.CircleGeometry(2.5, 24), carpetMat);
    carpet.position.set(1, 18.02, 0);
    carpet.rotation.x = -Math.PI / 2;
    group.add(carpet);

    // --- Bookshelves (larger, more detailed, on multiple floors) ---
    const bookColors = [0x882222, 0x224488, 0x228844, 0x884422, 0x442288, 0x886622, 0x662222, 0x225588];
    // Floor 2 (y=18) bookshelves
    for (let bs = 0; bs < 5; bs++) {
      const bsAngle = 0.2 + (bs / 5) * Math.PI * 1;
      // Shelf unit
      const shelfH = 2.8;
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.6, shelfH, 0.4), woodMat);
      shelf.position.set(
        Math.cos(bsAngle) * (towerRadius - 0.9),
        18 + shelfH / 2,
        Math.sin(bsAngle) * (towerRadius - 0.9),
      );
      shelf.rotation.y = bsAngle + Math.PI / 2;
      group.add(shelf);
      // Shelf planks (horizontal dividers)
      for (let sp = 0; sp < 4; sp++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.38), darkWoodMat);
        plank.position.set(
          Math.cos(bsAngle) * (towerRadius - 0.9),
          18 + 0.7 * sp + 0.3,
          Math.sin(bsAngle) * (towerRadius - 0.9),
        );
        plank.rotation.y = bsAngle + Math.PI / 2;
        group.add(plank);
      }
      // Books on shelves (varied sizes, tilted)
      for (let b = 0; b < 7; b++) {
        const bH = 0.2 + rubbleRng() * 0.25;
        const bW = 0.08 + rubbleRng() * 0.1;
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(bW, bH, 0.3),
          new THREE.MeshStandardMaterial({ color: bookColors[Math.floor(rubbleRng() * bookColors.length)] }),
        );
        const shelfRow = Math.floor(rubbleRng() * 3);
        book.position.set(
          Math.cos(bsAngle) * (towerRadius - 0.7),
          18 + 0.7 * shelfRow + 0.5,
          Math.sin(bsAngle) * (towerRadius - 0.7) + (b - 3) * 0.12,
        );
        book.rotation.y = bsAngle + Math.PI / 2;
        if (rubbleRng() > 0.8) book.rotation.z = 0.2;
        group.add(book);
      }
    }

    // --- Alchemy/potion table (floor 3 at y=25) ---
    const alchTable = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.8), woodMat);
    alchTable.position.set(-2, 25.85, 2);
    alchTable.rotation.y = 1.2;
    group.add(alchTable);
    // Potion bottles
    const potionColors = [0x44ff44, 0xff4444, 0x4444ff, 0xffaa00, 0xff44ff];
    for (let p = 0; p < 5; p++) {
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.06, 0.2, 16),
        new THREE.MeshStandardMaterial({
          color: potionColors[p], emissive: potionColors[p], emissiveIntensity: 0.2,
          transparent: true, opacity: 0.7,
        }),
      );
      bottle.position.set(-2 + (p - 2) * 0.25, 26, 2);
      group.add(bottle);
      // Bottle neck
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.08, 16), new THREE.MeshStandardMaterial({ color: potionColors[p], transparent: true, opacity: 0.6 }));
      neck.position.set(-2 + (p - 2) * 0.25, 26.14, 2);
      group.add(neck);
    }

    // --- Candelabra (hanging from ceiling on floor 2) ---
    const candelabraChain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2, 16), ironMat);
    candelabraChain.position.set(0, 24, 0);
    group.add(candelabraChain);
    const candelabraRing = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 12, 20), ironMat);
    candelabraRing.position.set(0, 23, 0);
    candelabraRing.rotation.x = Math.PI / 2;
    group.add(candelabraRing);
    for (let cc = 0; cc < 6; cc++) {
      const ccAngle = (cc / 6) * Math.PI * 2;
      const ccCandle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 16), candleMat);
      ccCandle.position.set(Math.cos(ccAngle) * 0.6, 23.1, Math.sin(ccAngle) * 0.6);
      group.add(ccCandle);
      const ccFlame = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 16), flameMat);
      ccFlame.position.set(Math.cos(ccAngle) * 0.6, 23.25, Math.sin(ccAngle) * 0.6);
      group.add(ccFlame);
    }

    // --- Standing stones (larger stone circle, weathered) ---
    for (let ss = 0; ss < 12; ss++) {
      const ssAngle = (ss / 12) * Math.PI * 2;
      const ssDist = 14 + (ss % 3) * 1;
      const ssHeight = 2 + (ss % 4) * 1.2;
      const ssW = 0.6 + (ss % 2) * 0.4;
      const stone = new THREE.Mesh(
        new THREE.BoxGeometry(ssW, ssHeight, 0.4),
        ss % 3 === 0 ? lightStoneMat : darkStoneMat,
      );
      stone.position.set(
        Math.cos(ssAngle) * ssDist,
        ssHeight / 2,
        Math.sin(ssAngle) * ssDist,
      );
      stone.rotation.y = ssAngle + 0.2;
      stone.rotation.z = (ss % 2 === 0 ? 0.06 : -0.04);
      stone.castShadow = true;
      group.add(stone);
      // Moss on standing stones
      if (ss % 2 === 0) {
        const stoneMoss = new THREE.Mesh(new THREE.PlaneGeometry(ssW * 0.8, ssHeight * 0.4), darkMossMat);
        stoneMoss.position.set(
          Math.cos(ssAngle) * (ssDist - 0.22),
          ssHeight * 0.3,
          Math.sin(ssAngle) * (ssDist - 0.22),
        );
        stoneMoss.rotation.y = ssAngle + Math.PI / 2 + 0.2;
        group.add(stoneMoss);
      }
    }
    // Lintel stones connecting some standing stones
    for (let li = 0; li < 3; li++) {
      const liAngle = (li / 3) * Math.PI * 2;
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 0.5), darkStoneMat);
      lintel.position.set(
        Math.cos(liAngle) * 14,
        4.5,
        Math.sin(liAngle) * 14,
      );
      lintel.rotation.y = liAngle + Math.PI / 2;
      group.add(lintel);
    }

    // --- Windows (arched, with stone surrounds and warm glow) ---
    for (let floor = 0; floor < 5; floor++) {
      const wy = 5 + floor * 5;
      if (wy > towerHeight - 2) break;
      for (let w = 0; w < 3; w++) {
        const wa = 0.3 + (w / 3) * Math.PI * 0.9;
        const wGlowMat = new THREE.MeshStandardMaterial({
          color: 0xddcc88, emissive: 0x886633, emissiveIntensity: 0.25,
        });
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.4), wGlowMat);
        win.position.set(
          Math.cos(wa) * (towerRadius + 0.12),
          wy,
          Math.sin(wa) * (towerRadius + 0.12),
        );
        win.rotation.y = wa + Math.PI / 2;
        group.add(win);
        // Stone window surround
        const winFrame = new THREE.Mesh(
          new THREE.TorusGeometry(0.4, 0.08, 12, 20, Math.PI),
          lightStoneMat,
        );
        winFrame.position.set(
          Math.cos(wa) * (towerRadius + 0.15),
          wy + 0.6,
          Math.sin(wa) * (towerRadius + 0.15),
        );
        winFrame.rotation.y = wa + Math.PI / 2;
        winFrame.rotation.x = Math.PI;
        group.add(winFrame);
        // Window sill
        const sill = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.2), lightStoneMat);
        sill.position.set(
          Math.cos(wa) * (towerRadius + 0.2),
          wy - 0.65,
          Math.sin(wa) * (towerRadius + 0.2),
        );
        sill.rotation.y = wa + Math.PI / 2;
        group.add(sill);
      }
    }

    // --- Telescope on top platform ---
    const scopeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.3, 16), ironMat);
    scopeBase.position.set(-3, towerHeight + 2.8, -2);
    group.add(scopeBase);
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.5, 16), new THREE.MeshStandardMaterial({ color: 0x886633, metalness: 0.3 }));
    scopeTube.position.set(-3, towerHeight + 3.5, -2);
    scopeTube.rotation.z = Math.PI / 6;
    group.add(scopeTube);
    const scopeLens = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), crystalMat);
    scopeLens.position.set(-3.4, towerHeight + 3.9, -2);
    scopeLens.rotation.z = Math.PI / 6;
    scopeLens.rotation.y = Math.PI / 2;
    group.add(scopeLens);

    // --- Weathered path leading to entrance ---
    for (let pw = 0; pw < 8; pw++) {
      const pathStone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6 + rubbleRng() * 0.4, 0.7 + rubbleRng() * 0.3, 0.08, 16),
        rubbleRng() > 0.5 ? stoneMat : lightStoneMat,
      );
      pathStone.position.set(
        Math.cos(Math.PI * 1.6) * (towerRadius + 2 + pw * 2),
        0.04,
        Math.sin(Math.PI * 1.6) * (towerRadius + 2 + pw * 2),
      );
      pathStone.rotation.y = rubbleRng() * Math.PI;
      group.add(pathStone);
    }

    // --- Golden astronomical armillary sphere on top ---
    const armillaryOuter = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 12, 24), goldMat);
    armillaryOuter.position.set(2, towerHeight + 3.5, -3);
    armillaryOuter.rotation.x = Math.PI / 4;
    group.add(armillaryOuter);
    const armillaryInner = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 12, 20), goldMat);
    armillaryInner.position.set(2, towerHeight + 3.5, -3);
    armillaryInner.rotation.z = Math.PI / 3;
    group.add(armillaryInner);
    const armillarySphere = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), goldMat);
    armillarySphere.position.set(2, towerHeight + 3.5, -3);
    group.add(armillarySphere);

    // --- Balcony on intact side (mid level) ---
    const balconyFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2, 0.2, 20, 1, false, 0.3, Math.PI * 0.5),
      stoneMat,
    );
    balconyFloor.position.set(
      Math.cos(Math.PI * 0.55) * (towerRadius + 1),
      18,
      Math.sin(Math.PI * 0.55) * (towerRadius + 1),
    );
    group.add(balconyFloor);
    // Balcony railing
    const balcRail = new THREE.Mesh(
      new THREE.TorusGeometry(2.3, 0.06, 12, 20, Math.PI * 0.5),
      ironMat,
    );
    balcRail.position.set(
      Math.cos(Math.PI * 0.55) * (towerRadius + 1),
      18.8,
      Math.sin(Math.PI * 0.55) * (towerRadius + 1),
    );
    balcRail.rotation.x = Math.PI / 2;
    balcRail.rotation.z = 0.3;
    group.add(balcRail);
    // Balcony support corbels
    for (let cb = 0; cb < 3; cb++) {
      const cbAngle = 0.4 + (cb / 3) * Math.PI * 0.4;
      const corbel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.3), darkStoneMat);
      corbel.position.set(
        Math.cos(cbAngle) * (towerRadius + 0.5),
        17.6,
        Math.sin(cbAngle) * (towerRadius + 0.5),
      );
      corbel.rotation.y = cbAngle;
      group.add(corbel);
    }
    // Potted plants on balcony
    for (let bp = 0; bp < 2; bp++) {
      const bpAngle = 0.5 + bp * 0.6;
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.25, 16), new THREE.MeshStandardMaterial({ color: 0x885533 }));
      pot.position.set(
        Math.cos(bpAngle) * (towerRadius + 1.5),
        18.22,
        Math.sin(bpAngle) * (towerRadius + 1.5),
      );
      group.add(pot);
      const plant = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ color: 0x338833 }));
      plant.position.set(
        Math.cos(bpAngle) * (towerRadius + 1.5),
        18.5,
        Math.sin(bpAngle) * (towerRadius + 1.5),
      );
      group.add(plant);
    }

    // --- Magical herb garden (circular, around tower base) ---
    const gardenBorder = new THREE.Mesh(
      new THREE.TorusGeometry(9, 0.2, 12, 32),
      darkStoneMat,
    );
    gardenBorder.position.y = 0.15;
    gardenBorder.rotation.x = Math.PI / 2;
    group.add(gardenBorder);
    // Garden beds (wedge-shaped between standing stones)
    for (let gb = 0; gb < 8; gb++) {
      const gbAngle = (gb / 8) * Math.PI * 2 + 0.2;
      // Soil bed
      const bedMat = new THREE.MeshStandardMaterial({ color: 0x5a4a30, roughness: 0.95 });
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 1.5), bedMat);
      bed.position.set(
        Math.cos(gbAngle) * 9.5,
        0.08,
        Math.sin(gbAngle) * 9.5,
      );
      bed.rotation.y = gbAngle;
      group.add(bed);
      // Plants in beds (varied magical herbs)
      const herbColors = [0x33aa55, 0x55cc33, 0x228844, 0x44bb66, 0x6644cc, 0x44aacc];
      for (let hp = 0; hp < 4; hp++) {
        const herbColor = herbColors[(gb + hp) % herbColors.length];
        const herb = new THREE.Mesh(
          new THREE.SphereGeometry(0.15 + rubbleRng() * 0.1, 16, 12),
          new THREE.MeshStandardMaterial({ color: herbColor, roughness: 0.9 }),
        );
        herb.position.set(
          Math.cos(gbAngle) * 9.5 + Math.cos(gbAngle + Math.PI / 2) * (hp - 1.5) * 0.5,
          0.25,
          Math.sin(gbAngle) * 9.5 + Math.sin(gbAngle + Math.PI / 2) * (hp - 1.5) * 0.5,
        );
        group.add(herb);
        // Some herbs glow faintly (magical)
        if ((gb + hp) % 3 === 0) {
          const glowHerb = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 16, 12),
            new THREE.MeshStandardMaterial({
              color: 0x44ffaa, emissive: 0x22cc66, emissiveIntensity: 0.3,
              transparent: true, opacity: 0.6,
            }),
          );
          glowHerb.position.copy(herb.position);
          glowHerb.position.y += 0.15;
          group.add(glowHerb);
        }
      }
    }

    // --- Weathervane on top of half-roof ---
    const vanePost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 16), ironMat);
    vanePost.position.set(
      Math.cos(Math.PI * 0.35) * 2,
      towerHeight + 10.5,
      Math.sin(Math.PI * 0.35) * 2,
    );
    group.add(vanePost);
    // Arrow/pointer
    const vaneArrow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.08), ironMat);
    vaneArrow.position.set(
      Math.cos(Math.PI * 0.35) * 2,
      towerHeight + 11.2,
      Math.sin(Math.PI * 0.35) * 2,
    );
    group.add(vaneArrow);
    // Crescent moon finial
    const moonFinial = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.02, 10, 20, Math.PI * 1.2),
      goldMat,
    );
    moonFinial.position.set(
      Math.cos(Math.PI * 0.35) * 2,
      towerHeight + 11.5,
      Math.sin(Math.PI * 0.35) * 2,
    );
    group.add(moonFinial);

    // --- Owl perch near top window ---
    const owlGroup = new THREE.Group();
    const owlBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.9 }),
    );
    owlBody.position.y = 0.2;
    owlBody.scale.set(1, 1.2, 1);
    owlGroup.add(owlBody);
    const owlHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 0.9 }),
    );
    owlHead.position.y = 0.42;
    owlGroup.add(owlHead);
    // Eyes
    for (const ex3 of [-0.06, 0.06]) {
      const owlEye = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xcc9900, emissiveIntensity: 0.3 }),
      );
      owlEye.position.set(ex3, 0.45, -0.12);
      owlGroup.add(owlEye);
    }
    // Beak
    const owlBeak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0x444433 }));
    owlBeak.position.set(0, 0.4, -0.16);
    owlBeak.rotation.x = Math.PI / 2;
    owlGroup.add(owlBeak);
    // Ear tufts
    for (const et of [-0.08, 0.08]) {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x886644 }));
      tuft.position.set(et, 0.56, -0.02);
      owlGroup.add(tuft);
    }
    owlGroup.position.set(
      Math.cos(0.6) * (towerRadius + 0.3),
      26,
      Math.sin(0.6) * (towerRadius + 0.3),
    );
    owlGroup.rotation.y = 0.6 + Math.PI;
    group.add(owlGroup);

    // --- Scattered old tomes / scrolls near base ---
    for (let st = 0; st < 4; st++) {
      const scrollAngle = Math.PI * 1.4 + rubbleRng() * Math.PI * 0.5;
      const scrollDist = towerRadius + 2 + rubbleRng() * 3;
      // Scroll (rolled parchment)
      const scroll = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16),
        new THREE.MeshStandardMaterial({ color: 0xddcc99, roughness: 0.9 }),
      );
      scroll.position.set(
        Math.cos(scrollAngle) * scrollDist,
        0.1,
        Math.sin(scrollAngle) * scrollDist,
      );
      scroll.rotation.z = Math.PI / 2;
      scroll.rotation.y = rubbleRng() * Math.PI;
      group.add(scroll);
    }

    // --- Magical barrier shimmer (faint ring at standing stone circle) ---
    const barrierRing = new THREE.Mesh(
      new THREE.TorusGeometry(14, 0.03, 12, 40),
      new THREE.MeshStandardMaterial({
        color: 0x6688ff, emissive: 0x4466cc, emissiveIntensity: 0.2,
        transparent: true, opacity: 0.3,
      }),
    );
    barrierRing.position.y = 2;
    barrierRing.rotation.x = Math.PI / 2;
    group.add(barrierRing);

    // --- Fallen tree near tower (storm damage) ---
    const fallenTrunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.5, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.92, metalness: 0.02 }),
    );
    fallenTrunk.position.set(-10, 0.4, 8);
    fallenTrunk.rotation.z = Math.PI / 2;
    fallenTrunk.rotation.y = 0.3;
    group.add(fallenTrunk);
    // Root ball
    const rootBall = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x5a4a30, roughness: 0.95 }),
    );
    rootBall.position.set(-14, 0.8, 8);
    rootBall.scale.set(1, 0.6, 1);
    group.add(rootBall);
    // Dead branches
    for (let db = 0; db < 4; db++) {
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.1, 2 + rubbleRng(), 16),
        new THREE.MeshStandardMaterial({ color: 0x664433, roughness: 0.9 }),
      );
      branch.position.set(-8 + db * 1.5, 0.5 + rubbleRng() * 0.5, 8 + (rubbleRng() - 0.5) * 2);
      branch.rotation.z = Math.PI / 3 + rubbleRng() * 0.5;
      branch.rotation.y = rubbleRng() * Math.PI;
      group.add(branch);
    }

    // --- Cauldron on the study floor ---
    const cauldron = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.7),
      ironMat,
    );
    cauldron.position.set(-1.5, 18.4, -1);
    group.add(cauldron);
    // Cauldron rim
    const cauldronRim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 12, 20), ironMat);
    cauldronRim.position.set(-1.5, 18.68, -1);
    cauldronRim.rotation.x = Math.PI / 2;
    group.add(cauldronRim);
    // Cauldron legs
    for (let cl2 = 0; cl2 < 3; cl2++) {
      const clAngle = (cl2 / 3) * Math.PI * 2;
      const cauldronLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 16), ironMat);
      cauldronLeg.position.set(
        -1.5 + Math.cos(clAngle) * 0.3,
        18.1,
        -1 + Math.sin(clAngle) * 0.3,
      );
      group.add(cauldronLeg);
    }
    // Glowing liquid inside
    const cauldronLiquid = new THREE.Mesh(
      new THREE.CircleGeometry(0.35, 20),
      new THREE.MeshStandardMaterial({
        color: 0x44ff88, emissive: 0x22cc44, emissiveIntensity: 0.4,
        transparent: true, opacity: 0.7,
      }),
    );
    cauldronLiquid.position.set(-1.5, 18.62, -1);
    cauldronLiquid.rotation.x = -Math.PI / 2;
    group.add(cauldronLiquid);
    // Faint green light from cauldron
    const cauldronLight = new THREE.PointLight(0x44ff88, 1, 5);
    cauldronLight.position.set(-1.5, 19, -1);
    group.add(cauldronLight);

    // --- Globe / world sphere on a stand ---
    const globeStand = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.8, 16), darkWoodMat);
    globeStand.position.set(3, 25.4, -2);
    group.add(globeStand);
    const globeSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 18, 14),
      new THREE.MeshStandardMaterial({ color: 0x4488aa, roughness: 0.6 }),
    );
    globeSphere.position.set(3, 26, -2);
    group.add(globeSphere);
    // Globe ring (equator)
    const globeRing = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.015, 10, 24), goldMat);
    globeRing.position.set(3, 26, -2);
    globeRing.rotation.x = Math.PI / 2;
    group.add(globeRing);
    // Globe tilt ring
    const globeTilt = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.01, 10, 24), goldMat);
    globeTilt.position.set(3, 26, -2);
    globeTilt.rotation.x = Math.PI / 2 + 0.4;
    group.add(globeTilt);

    group.position.set(x, 0, z);
    this._terrainGroup.add(group);
  }

  // ---------------------------------------------------------------------------
  // Clouds
  // ---------------------------------------------------------------------------

  private _buildClouds(): void {
    const rng = seededRandom(555);

    // Lit cloud shader — simulates sun-lit tops, dark undersides
    const cloudShaderMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        sunDir: { value: new THREE.Vector3(0.3, 0.55, -0.4).normalize() },
        sunColor: { value: new THREE.Color(0xfffbe8) },
        baseColor: { value: new THREE.Color(0xeeeeff) },
        shadowColor: { value: new THREE.Color(0x8899aa) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vAltitude;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vAltitude = position.y;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        uniform vec3 baseColor;
        uniform vec3 shadowColor;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vAltitude;
        void main() {
          float NdotL = dot(vNormal, sunDir);
          // Sun-lit tops are bright, undersides are dark
          float lit = smoothstep(-0.3, 0.6, NdotL);
          vec3 col = mix(shadowColor, baseColor, lit);
          // Warm sun tint on lit areas
          col += sunColor * pow(max(NdotL, 0.0), 3.0) * 0.15;
          // Silver lining at edges
          float rim = 1.0 - abs(dot(vNormal, normalize(vWorldPos - cameraPosition)));
          col += vec3(0.95, 0.92, 0.88) * pow(rim, 3.0) * 0.2;
          // Softer at bottom of each puff
          float bottomFade = smoothstep(-1.0, 0.3, vAltitude);
          float alpha = 0.55 * bottomFade;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    // Multiple cloud layers
    const layers = [
      { count: 35, minY: 70, maxY: 100, puffs: [5, 10], radius: [4, 10] },
      { count: 25, minY: 110, maxY: 140, puffs: [3, 7], radius: [6, 14] },
      { count: 15, minY: 150, maxY: 180, puffs: [3, 6], radius: [8, 18] },
    ];

    for (const layer of layers) {
      for (let i = 0; i < layer.count; i++) {
        const cloudCluster = new THREE.Group();
        const cx = (rng() - 0.5) * 1200;
        const cy = layer.minY + rng() * (layer.maxY - layer.minY);
        const cz = (rng() - 0.5) * 1200;

        const puffCount = layer.puffs[0] + Math.floor(rng() * (layer.puffs[1] - layer.puffs[0]));
        for (let p = 0; p < puffCount; p++) {
          const r = layer.radius[0] + rng() * (layer.radius[1] - layer.radius[0]);
          const puff = new THREE.Mesh(
            new THREE.SphereGeometry(r, 16, 12),
            cloudShaderMat,
          );
          puff.position.set(
            (rng() - 0.5) * 20,
            (rng() - 0.5) * 4,
            (rng() - 0.5) * 14,
          );
          puff.scale.y = 0.3 + rng() * 0.3;
          cloudCluster.add(puff);
        }

        cloudCluster.position.set(cx, cy, cz);
        this._cloudGroup.add(cloudCluster);
      }
    }
    this._scene.add(this._cloudGroup);
  }

  // ---------------------------------------------------------------------------
  // Player — Eagle + Merlin
  // ---------------------------------------------------------------------------

  private _buildPlayer(): void {
    // --- Eagle (more detailed) ---
    const featherMat = new THREE.MeshStandardMaterial({ color: 0x7a4a1a, roughness: 0.65 });
    const darkFeatherMat = new THREE.MeshStandardMaterial({ color: 0x5a3515, roughness: 0.7 });
    const whiteFeatherMat = new THREE.MeshStandardMaterial({ color: 0xf0e8dd, roughness: 0.65 });
    const goldenFeatherMat = new THREE.MeshStandardMaterial({ color: 0xbb8833, roughness: 0.6 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xddaa22, roughness: 0.4, metalness: 0.2 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111100 });
    const eyeIrisMat = new THREE.MeshStandardMaterial({
      color: 0xddaa00,
      emissive: 0x664400,
      emissiveIntensity: 0.3,
    });

    // Body — elongated oval
    const bodyGeo = new THREE.SphereGeometry(1.2, 18, 12);
    this._eagleBody = new THREE.Mesh(bodyGeo, featherMat);
    this._eagleBody.scale.set(1.1, 0.65, 2.0);
    this._eagleGroup.add(this._eagleBody);

    // Breast feathers (lighter)
    const breastGeo = new THREE.SphereGeometry(0.9, 16, 12);
    const breast = new THREE.Mesh(breastGeo, goldenFeatherMat);
    breast.scale.set(0.8, 0.5, 1.2);
    breast.position.set(0, -0.15, -0.5);
    this._eagleGroup.add(breast);

    // Head (white-feathered)
    this._eagleHead = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), whiteFeatherMat);
    this._eagleHead.position.set(0, 0.35, -1.9);
    this._eagleHead.scale.set(1, 0.9, 1.1);
    this._eagleGroup.add(this._eagleHead);

    // Brow ridges
    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.2), darkFeatherMat);
      brow.position.set(side * 0.25, 0.55, -2.0);
      brow.rotation.z = side * -0.2;
      this._eagleGroup.add(brow);
    }

    // Beak — upper and lower
    const beakUpper = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 16), beakMat);
    beakUpper.position.set(0, 0.28, -2.5);
    beakUpper.rotation.x = Math.PI / 2 + 0.1;
    this._eagleGroup.add(beakUpper);
    const beakLower = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 16), beakMat);
    beakLower.position.set(0, 0.15, -2.35);
    beakLower.rotation.x = Math.PI / 2 - 0.15;
    this._eagleGroup.add(beakLower);

    // Eyes with iris
    for (const side of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), whiteFeatherMat);
      eyeWhite.position.set(side * 0.32, 0.42, -2.05);
      this._eagleGroup.add(eyeWhite);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), eyeIrisMat);
      iris.position.set(side * 0.35, 0.42, -2.12);
      this._eagleGroup.add(iris);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), eyeMat);
      pupil.position.set(side * 0.36, 0.42, -2.15);
      this._eagleGroup.add(pupil);
    }

    // Wings — multi-segment for more realistic shape
    // Each wing: inner + mid + outer + wingtip
    for (const side of [-1, 1]) {
      const wingGroup = new THREE.Group();

      // Inner wing (broad)
      const innerGeo = new THREE.BoxGeometry(2.2, 0.12, 2.0);
      const inner = new THREE.Mesh(innerGeo, featherMat);
      inner.position.set(side * 1.5, 0, 0);
      wingGroup.add(inner);

      // Mid wing
      const midGeo = new THREE.BoxGeometry(1.8, 0.1, 1.6);
      const mid = new THREE.Mesh(midGeo, darkFeatherMat);
      mid.position.set(side * 3.2, 0.05, -0.1);
      wingGroup.add(mid);

      // Outer wing (tapered)
      const outerGeo = new THREE.BoxGeometry(1.4, 0.08, 1.2);
      const outer = new THREE.Mesh(outerGeo, featherMat);
      outer.position.set(side * 4.5, 0.1, -0.2);
      wingGroup.add(outer);

      // Wingtip feathers (individual long feathers)
      for (let f = 0; f < 5; f++) {
        const featherGeo = new THREE.BoxGeometry(0.8, 0.04, 0.18);
        const feather = new THREE.Mesh(featherGeo, darkFeatherMat);
        feather.position.set(side * (5.2 + f * 0.15), 0.12, -0.5 + f * 0.25);
        feather.rotation.y = side * (f * 0.08);
        wingGroup.add(feather);
      }

      if (side === -1) this._eagleWingL = wingGroup as unknown as THREE.Mesh;
      else this._eagleWingR = wingGroup as unknown as THREE.Mesh;
      this._eagleGroup.add(wingGroup);
    }

    // Tail feathers — fan shape
    this._eagleTail = new THREE.Group() as unknown as THREE.Mesh;
    for (let i = -3; i <= 3; i++) {
      const tailGeo = new THREE.BoxGeometry(0.3, 0.06, 1.4);
      const tail = new THREE.Mesh(tailGeo, darkFeatherMat);
      tail.position.set(i * 0.22, -0.05, 2.2);
      tail.rotation.y = i * 0.06;
      (this._eagleTail as unknown as THREE.Group).add(tail);
    }
    this._eagleGroup.add(this._eagleTail);

    // Talons — more detailed with toes
    const talonMat = new THREE.MeshStandardMaterial({ color: 0x444433, roughness: 0.6 });
    for (const side of [-1, 1]) {
      const legGroup = new THREE.Group();
      // Leg
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 16), talonMat);
      leg.position.y = -0.3;
      legGroup.add(leg);
      // Toes
      for (let t = -1; t <= 1; t++) {
        const toe = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.35, 16), talonMat);
        toe.position.set(t * 0.1, -0.7, -0.1);
        toe.rotation.x = -0.3;
        legGroup.add(toe);
      }
      // Back toe
      const backToe = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 16), talonMat);
      backToe.position.set(0, -0.65, 0.15);
      backToe.rotation.x = 0.4;
      legGroup.add(backToe);
      legGroup.position.set(side * 0.4, -0.4, 0.3);
      this._eagleGroup.add(legGroup);
    }

    // --- Merlin (more detailed) ---
    const robeMat = new THREE.MeshStandardMaterial({ color: 0x1a2888, roughness: 0.65 });
    const robeAccentMat = new THREE.MeshStandardMaterial({ color: 0x3344aa, roughness: 0.6 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xddbbaa, roughness: 0.75 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x1a2888, roughness: 0.65 });
    const staffMat = new THREE.MeshStandardMaterial({ color: 0x5a3a18, roughness: 0.7 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x44aaff,
      emissive: 0x2288ff,
      emissiveIntensity: 1.0,
    });
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xccbb44,
      emissive: 0x887722,
      emissiveIntensity: 0.4,
    });

    // Torso (seated)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.5), robeMat);
    torso.position.y = 1.2;
    this._merlinGroup.add(torso);

    // Shoulders
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.55), robeAccentMat);
    shoulders.position.y = 1.75;
    this._merlinGroup.add(shoulders);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), skinMat);
    head.position.set(0, 1.98, 0);
    this._merlinGroup.add(head);

    // Wizard hat — taller, slightly bent
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.0, 16), hatMat);
    hat.position.set(0, 2.6, 0);
    hat.rotation.z = 0.12;
    hat.rotation.x = -0.05;
    this._merlinGroup.add(hat);
    // Hat brim (wider)
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 16), hatMat);
    brim.position.set(0, 2.15, 0);
    this._merlinGroup.add(brim);
    // Stars on hat
    for (let i = 0; i < 3; i++) {
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), starMat);
      star.position.set(
        Math.cos(i * 2.1) * 0.25,
        2.35 + i * 0.2,
        Math.sin(i * 2.1) * 0.25,
      );
      this._merlinGroup.add(star);
    }

    // Beard — longer, flowing
    const beardMat2 = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.85 });
    const beardUpper = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.15), beardMat2);
    beardUpper.position.set(0, 1.75, -0.2);
    this._merlinGroup.add(beardUpper);
    const beardMid = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 16), beardMat2);
    beardMid.position.set(0, 1.45, -0.25);
    beardMid.rotation.x = Math.PI;
    this._merlinGroup.add(beardMid);
    const beardTip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 16), beardMat2);
    beardTip.position.set(0, 1.15, -0.28);
    beardTip.rotation.x = Math.PI;
    this._merlinGroup.add(beardTip);

    // Staff (thicker, gnarled)
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.8, 16), staffMat);
    staff.position.set(0.5, 1.9, -0.2);
    staff.rotation.z = -0.25;
    staff.rotation.x = 0.15;
    this._merlinGroup.add(staff);
    // Staff knot
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), staffMat);
    knot.position.set(0.58, 2.4, -0.22);
    this._merlinGroup.add(knot);

    // Staff crystal (larger, multi-layered glow)
    const crystalInner = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), glowMat);
    crystalInner.position.set(0.68, 3.2, -0.28);
    this._merlinGroup.add(crystalInner);
    const crystalOuter = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2, 0),
      new THREE.MeshStandardMaterial({
        color: 0x44aaff,
        emissive: 0x2288ff,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.4,
      }),
    );
    crystalOuter.position.copy(crystalInner.position);
    this._merlinGroup.add(crystalOuter);

    // Staff point light (brighter)
    const staffLight = new THREE.PointLight(0x4488ff, 3, 20);
    staffLight.position.copy(crystalInner.position);
    this._merlinGroup.add(staffLight);

    // Arms
    for (const side of [-1, 1]) {
      // Upper arm
      const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), robeMat);
      upperArm.position.set(side * 0.5, 1.5, 0);
      upperArm.rotation.z = side * 0.25;
      this._merlinGroup.add(upperArm);
      // Forearm
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.45, 0.15), robeAccentMat);
      forearm.position.set(side * 0.6, 1.15, -0.05);
      forearm.rotation.z = side * 0.4;
      this._merlinGroup.add(forearm);
      // Hand
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), skinMat);
      hand.position.set(side * 0.65, 0.95, -0.08);
      this._merlinGroup.add(hand);
    }

    // Robe skirt (draped over eagle)
    const robeBottom = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 1.0), robeMat);
    robeBottom.position.y = 0.7;
    this._merlinGroup.add(robeBottom);
    // Robe hem detail
    const hem = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.1), robeAccentMat);
    hem.position.y = 0.45;
    this._merlinGroup.add(hem);

    // Belt with buckle
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.7 });
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.1, 0.55), beltMat);
    belt.position.y = 1.0;
    this._merlinGroup.add(belt);
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.7, roughness: 0.3 });
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.08), buckleMat);
    buckle.position.set(0, 1.0, -0.3);
    this._merlinGroup.add(buckle);

    this._merlinGroup.position.set(0, 0.3, -0.3);
    this._eagleGroup.add(this._merlinGroup);

    this._eagleGroup.scale.set(1.5, 1.5, 1.5);
    this._scene.add(this._eagleGroup);
  }

  // ---------------------------------------------------------------------------
  // Walking Merlin (dismounted form)
  // ---------------------------------------------------------------------------

  private _buildWalkingMerlin(): void {
    const robeMat = new THREE.MeshStandardMaterial({ color: 0x1a2888, roughness: 0.65 });
    const robeAccentMat = new THREE.MeshStandardMaterial({ color: 0x3344aa, roughness: 0.6 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xddbbaa, roughness: 0.75 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x1a2888, roughness: 0.65 });
    const staffMat = new THREE.MeshStandardMaterial({ color: 0x5a3a18, roughness: 0.7 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x44aaff,
      emissive: 0x2288ff,
      emissiveIntensity: 1.0,
    });
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xccbb44,
      emissive: 0x887722,
      emissiveIntensity: 0.4,
    });
    const beardMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.85 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.7 });
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.7, roughness: 0.3 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.8 });

    // --- Torso ---
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.5), robeMat);
    torso.position.y = 1.8;
    this._walkingMerlinGroup.add(torso);

    // Shoulders
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 0.6), robeAccentMat);
    shoulders.position.y = 2.45;
    this._walkingMerlinGroup.add(shoulders);

    // --- Head ---
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), skinMat);
    head.position.set(0, 2.72, 0);
    this._walkingMerlinGroup.add(head);

    // Eyes
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), new THREE.MeshStandardMaterial({ color: 0x334488 }));
      eye.position.set(side * 0.12, 2.75, -0.28);
      this._walkingMerlinGroup.add(eye);
    }

    // Nose
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 16), skinMat);
    nose.position.set(0, 2.68, -0.32);
    nose.rotation.x = -Math.PI / 2;
    this._walkingMerlinGroup.add(nose);

    // --- Wizard hat (taller for standing) ---
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.2, 16), hatMat);
    hat.position.set(0, 3.4, 0);
    hat.rotation.z = 0.12;
    hat.rotation.x = -0.05;
    this._walkingMerlinGroup.add(hat);
    // Hat brim
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.07, 16), hatMat);
    brim.position.set(0, 2.88, 0);
    this._walkingMerlinGroup.add(brim);
    // Stars on hat
    for (let i = 0; i < 3; i++) {
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), starMat);
      star.position.set(
        Math.cos(i * 2.1) * 0.28,
        3.1 + i * 0.22,
        Math.sin(i * 2.1) * 0.28,
      );
      this._walkingMerlinGroup.add(star);
    }

    // --- Beard (longer for standing) ---
    const beardUpper = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.18), beardMat);
    beardUpper.position.set(0, 2.5, -0.22);
    this._walkingMerlinGroup.add(beardUpper);
    const beardMid = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 16), beardMat);
    beardMid.position.set(0, 2.1, -0.28);
    beardMid.rotation.x = Math.PI;
    this._walkingMerlinGroup.add(beardMid);
    const beardTip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 16), beardMat);
    beardTip.position.set(0, 1.75, -0.3);
    beardTip.rotation.x = Math.PI;
    this._walkingMerlinGroup.add(beardTip);

    // --- Belt with buckle ---
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.55), beltMat);
    belt.position.y = 1.25;
    this._walkingMerlinGroup.add(belt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.08), buckleMat);
    buckle.position.set(0, 1.25, -0.3);
    this._walkingMerlinGroup.add(buckle);

    // --- Robe skirt (flows around legs) ---
    this._walkMerlinRobeSkirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.55, 1.0, 16),
      robeMat,
    );
    this._walkMerlinRobeSkirt.position.y = 0.7;
    this._walkingMerlinGroup.add(this._walkMerlinRobeSkirt);

    // Robe hem
    const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.58, 0.08, 16), robeAccentMat);
    hem.position.y = 0.22;
    this._walkingMerlinGroup.add(hem);

    // --- Staff (held at side, taller) ---
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.5, 16), staffMat);
    staff.position.set(0.55, 1.8, 0);
    this._walkingMerlinGroup.add(staff);
    // Staff knot
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), staffMat);
    knot.position.set(0.55, 3.0, 0);
    this._walkingMerlinGroup.add(knot);

    // Staff crystal (larger glow)
    const crystalInner = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), glowMat);
    crystalInner.position.set(0.55, 3.5, 0);
    this._walkingMerlinGroup.add(crystalInner);
    const crystalOuter = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.25, 0),
      new THREE.MeshStandardMaterial({
        color: 0x44aaff,
        emissive: 0x2288ff,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.4,
      }),
    );
    crystalOuter.position.copy(crystalInner.position);
    this._walkingMerlinGroup.add(crystalOuter);

    // Staff light
    const staffLight = new THREE.PointLight(0x4488ff, 4, 25);
    staffLight.position.copy(crystalInner.position);
    this._walkingMerlinGroup.add(staffLight);

    // --- Arms (animatable groups) ---
    // Left arm
    this._walkMerlinArmL = new THREE.Group();
    const upperArmL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), robeMat);
    upperArmL.position.set(0, -0.25, 0);
    this._walkMerlinArmL.add(upperArmL);
    const forearmL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.5, 0.17), robeAccentMat);
    forearmL.position.set(0, -0.7, -0.05);
    this._walkMerlinArmL.add(forearmL);
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), skinMat);
    handL.position.set(0, -0.95, -0.08);
    this._walkMerlinArmL.add(handL);
    this._walkMerlinArmL.position.set(-0.58, 2.4, 0);
    this._walkingMerlinGroup.add(this._walkMerlinArmL);

    // Right arm (holding staff)
    this._walkMerlinArmR = new THREE.Group();
    const upperArmR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), robeMat);
    upperArmR.position.set(0, -0.25, 0);
    this._walkMerlinArmR.add(upperArmR);
    const forearmR = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.5, 0.17), robeAccentMat);
    forearmR.position.set(0, -0.7, -0.05);
    this._walkMerlinArmR.add(forearmR);
    const handR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), skinMat);
    handR.position.set(0, -0.95, -0.08);
    this._walkMerlinArmR.add(handR);
    this._walkMerlinArmR.position.set(0.58, 2.4, 0);
    this._walkingMerlinGroup.add(this._walkMerlinArmR);

    // --- Legs (animatable groups) ---
    // Left leg
    this._walkMerlinLegL = new THREE.Group();
    const thighL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.22), robeMat);
    thighL.position.y = -0.25;
    this._walkMerlinLegL.add(thighL);
    const shinL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.2), robeMat);
    shinL.position.y = -0.65;
    this._walkMerlinLegL.add(shinL);
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.35), bootMat);
    bootL.position.set(0, -0.9, -0.05);
    this._walkMerlinLegL.add(bootL);
    this._walkMerlinLegL.position.set(-0.2, 1.15, 0);
    this._walkingMerlinGroup.add(this._walkMerlinLegL);

    // Right leg
    this._walkMerlinLegR = new THREE.Group();
    const thighR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.22), robeMat);
    thighR.position.y = -0.25;
    this._walkMerlinLegR.add(thighR);
    const shinR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.2), robeMat);
    shinR.position.y = -0.65;
    this._walkMerlinLegR.add(shinR);
    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.35), bootMat);
    bootR.position.set(0, -0.9, -0.05);
    this._walkMerlinLegR.add(bootR);
    this._walkMerlinLegR.position.set(0.2, 1.15, 0);
    this._walkingMerlinGroup.add(this._walkMerlinLegR);

    // Scale to match world
    this._walkingMerlinGroup.scale.set(1.8, 1.8, 1.8);
    this._walkingMerlinGroup.visible = false;
    this._scene.add(this._walkingMerlinGroup);
  }

  // ---------------------------------------------------------------------------
  // God rays
  // ---------------------------------------------------------------------------

  private _buildGodRays(): void {
    const rayMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        void main() {
          float ray = sin(vUv.x * 12.0 + time * 0.3) * 0.5 + 0.5;
          ray *= smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
          ray *= 0.08;
          gl_FragColor = vec4(1.0, 0.95, 0.8, ray);
        }
      `,
    });
    const rayGeo = new THREE.PlaneGeometry(200, 150);
    this._godRaysMesh = new THREE.Mesh(rayGeo, rayMat);
    this._godRaysMesh.position.set(60, 80, -80);
    this._godRaysMesh.rotation.x = -0.3;
    this._godRaysMesh.rotation.y = -0.4;
    this._scene.add(this._godRaysMesh);
  }

  // ---------------------------------------------------------------------------
  // Dust / pollen particles
  // ---------------------------------------------------------------------------

  private _buildDustParticles(): void {
    const count = 1500;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const rng = seededRandom(321);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rng() - 0.5) * 400;
      positions[i * 3 + 1] = 2 + rng() * 60;
      positions[i * 3 + 2] = (rng() - 0.5) * 400;
      sizes[i] = 0.3 + rng() * 0.8;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      color: 0xffffee,
      size: 0.5,
      transparent: true,
      opacity: 0.35,
      sizeAttenuation: true,
      depthWrite: false,
    });
    this._dustParticles = new THREE.Points(geo, mat);
    this._scene.add(this._dustParticles);
  }

  // ---------------------------------------------------------------------------
  // Birds circling the city
  // ---------------------------------------------------------------------------

  private _buildBirds(): void {
    const rng = seededRandom(444);
    // Multiple bird species with color variety
    const birdColors = [
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }), // crow
      new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.8 }), // hawk
      new THREE.MeshStandardMaterial({ color: 0x556655, roughness: 0.8 }), // pigeon
      new THREE.MeshStandardMaterial({ color: 0x884433, roughness: 0.8 }), // kestrel
    ];
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.8 });

    for (let i = 0; i < 20; i++) {
      const birdGroup = new THREE.Group();
      const birdMat = birdColors[i % birdColors.length];
      const birdScale = 0.7 + rng() * 0.6;

      // Body (elongated)
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), birdMat);
      body.scale.set(1, 0.5, 2.2);
      birdGroup.add(body);
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), birdMat);
      head.position.set(0, 0.05, -0.4);
      birdGroup.add(head);
      // Beak
      const beakMat = new THREE.MeshStandardMaterial({ color: 0xddaa22, roughness: 0.5 });
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 16), beakMat);
      beak.position.set(0, 0.03, -0.55);
      beak.rotation.x = Math.PI / 2;
      birdGroup.add(beak);
      // Eye
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 12), eyeMat);
      eye.position.set(0.06, 0.08, -0.42);
      birdGroup.add(eye);
      // Tail
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.3), birdMat);
      tail.position.set(0, 0, 0.4);
      birdGroup.add(tail);
      // Wings (larger, more detailed)
      for (const side of [-1, 1]) {
        const wingInner = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.25), birdMat);
        wingInner.position.set(side * 0.35, 0.02, -0.05);
        birdGroup.add(wingInner);
        const wingOuter = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), birdMat);
        wingOuter.position.set(side * 0.8, 0.04, -0.1);
        birdGroup.add(wingOuter);
      }
      // White breast for some species
      if (i % 3 === 0) {
        const breast = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), whiteMat);
        breast.position.set(0, -0.06, -0.15);
        breast.scale.set(0.8, 0.5, 1);
        birdGroup.add(breast);
      }

      birdGroup.scale.setScalar(birdScale);

      const cx = (rng() - 0.5) * 200;
      const cz = (rng() - 0.5) * 200;
      const cy = 25 + rng() * 60;
      const radius = 12 + rng() * 35;
      const speed = 0.3 + rng() * 0.6;
      const phase = rng() * Math.PI * 2;

      birdGroup.position.set(cx + radius, cy, cz);
      this._scene.add(birdGroup);
      this._birdGroups.push({ group: birdGroup, phase, cx, cz, radius, speed, cy });
    }
  }

  // ---------------------------------------------------------------------------
  // Eagle trail effect
  // ---------------------------------------------------------------------------

  private _buildEagleTrail(): void {
    const maxPoints = 120;
    const positions = new Float32Array(maxPoints * 3);
    const colors = new Float32Array(maxPoints * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setDrawRange(0, 0);

    // Glowing trail with vertex color fade
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      linewidth: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this._trailMesh = new THREE.Line(geo, mat);
    this._trailMesh.frustumCulled = false;
    this._scene.add(this._trailMesh);

    for (let i = 0; i < maxPoints; i++) {
      this._trailPoints.push(new THREE.Vector3());
    }

    // Second trail (wider, dimmer wing trails)
    const trailPositions2 = new Float32Array(maxPoints * 3);
    const trailColors2 = new Float32Array(maxPoints * 3);
    const geo2 = new THREE.BufferGeometry();
    geo2.setAttribute("position", new THREE.BufferAttribute(trailPositions2, 3));
    geo2.setAttribute("color", new THREE.BufferAttribute(trailColors2, 3));
    geo2.setDrawRange(0, 0);
    const mat2 = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const trail2 = new THREE.Line(geo2, mat2);
    trail2.frustumCulled = false;
    this._scene.add(trail2);
  }

  // ---------------------------------------------------------------------------
  // Ground fog — low-lying mist in valleys and near river
  // ---------------------------------------------------------------------------

  private _buildGroundFog(): void {
    const fogMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec3 pos = position;
          pos.y += sin(pos.x * 0.05 + time * 0.3) * 0.5;
          vec4 wp = modelMatrix * vec4(pos, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
        }
        void main() {
          float n = noise(vWorldPos.xz * 0.03 + time * 0.08);
          float n2 = noise(vWorldPos.xz * 0.08 - time * 0.05);
          float n3 = noise(vWorldPos.xz * 0.15 + time * 0.03);
          float density = (n * 0.5 + n2 * 0.3 + n3 * 0.2);
          // Soft edge fade
          float edgeFade = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x)
                         * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
          float alpha = density * edgeFade * 0.3;
          // Slightly warm-tinted fog
          vec3 fogCol = mix(vec3(0.82, 0.86, 0.92), vec3(0.88, 0.85, 0.80), n * 0.5);
          gl_FragColor = vec4(fogCol, alpha);
        }
      `,
    });

    // Fog patches in valleys and low areas
    const fogPositions = [
      { x: 0, z: -15, w: 120, d: 30 },     // City center low area
      { x: -100, z: -30, w: 80, d: 40 },    // West valley
      { x: 100, z: -20, w: 80, d: 35 },     // East valley
      { x: -150, z: 50, w: 60, d: 50 },     // NW valley
      { x: 180, z: -80, w: 50, d: 40 },     // SE valley
      { x: -300, z: 200, w: 100, d: 60 },   // Far NW
      { x: 300, z: -250, w: 80, d: 50 },    // Near wizard tower
      { x: -350, z: -150, w: 70, d: 45 },   // SW lowland
      { x: 250, z: 150, w: 60, d: 40 },     // NE lowland
      { x: 0, z: 200, w: 90, d: 50 },       // North field
    ];

    for (const fp of fogPositions) {
      const fogGeo = new THREE.PlaneGeometry(fp.w, fp.d, 8, 8);
      fogGeo.rotateX(-Math.PI / 2);
      const fog = new THREE.Mesh(fogGeo, fogMat.clone());
      fog.position.set(fp.x, 1.5, fp.z);
      this._scene.add(fog);
      this._groundFogMeshes.push(fog);
    }
  }

  // ---------------------------------------------------------------------------
  // Lens flare — screen-space sun flare
  // ---------------------------------------------------------------------------

  private _buildLensFlare(): void {
    const flareMats = [
      { size: 1.5, color: 0xffffff, opacity: 0.12 },
      { size: 3.0, color: 0xffeecc, opacity: 0.06 },
      { size: 0.4, color: 0xffaa44, opacity: 0.15 },
      { size: 0.6, color: 0x88aaff, opacity: 0.08 },
      { size: 0.3, color: 0xff8844, opacity: 0.1 },
    ];

    for (const f of flareMats) {
      const mat = new THREE.MeshBasicMaterial({
        color: f.color,
        transparent: true,
        opacity: f.opacity,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      });
      const geo = new THREE.CircleGeometry(f.size, 24);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 999;
      this._lensFlareGroup.add(mesh);
    }
    this._scene.add(this._lensFlareGroup);
  }

  // ---------------------------------------------------------------------------
  // Magic orbs
  // ---------------------------------------------------------------------------

  private _buildOrbs(): void {
    const orbMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        collected: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float collected;
        varying vec3 vNormal;
        void main() {
          if (collected > 0.5) discard;
          float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          float pulse = 0.7 + sin(time * 4.0) * 0.3;
          vec3 col = mix(vec3(0.2, 0.5, 1.0), vec3(0.8, 0.9, 1.0), rim);
          float glow = pulse * (0.5 + rim * 0.5);
          gl_FragColor = vec4(col * 1.5, glow * 0.8);
        }
      `,
    });

    for (let i = 0; i < 40; i++) {
      const geo = new THREE.SphereGeometry(0.6, 16, 12);
      const mat = orbMat.clone();
      const orb = new THREE.Mesh(geo, mat);
      this._scene.add(orb);
      this._orbMeshes.push(orb);
    }
  }

  // ---------------------------------------------------------------------------
  // NPCs (simple low-poly figures)
  // ---------------------------------------------------------------------------

  private _buildNPCs(): void {
    // ── Shared materials ──
    const peasantTunic = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.9 });
    const peasantTrousers = new THREE.MeshStandardMaterial({ color: 0x665533, roughness: 0.92 });
    const knightArmor = new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.5, roughness: 0.4 });
    const knightChainmail = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.6, roughness: 0.35 });
    const merchantRobe = new THREE.MeshStandardMaterial({ color: 0x668844, roughness: 0.8 });
    const merchantApron = new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xddbbaa, roughness: 0.8 });
    const skinDark = new THREE.MeshStandardMaterial({ color: 0xbb9977, roughness: 0.8 });
    const hairBrown = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.95 });
    const hairBlack = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
    const hairBlonde = new THREE.MeshStandardMaterial({ color: 0xccaa55, roughness: 0.95 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x3b2510, roughness: 0.9 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x442200, roughness: 0.85 });
    const shieldMat = new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.4, roughness: 0.5 });
    const crestRed = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.7 });
    const crestBlue = new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.7 });
    const sackMat = new THREE.MeshStandardMaterial({ color: 0xaa8855, roughness: 0.95 });
    const spearWood = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
    const spearTip = new THREE.MeshStandardMaterial({ color: 0xaabbcc, metalness: 0.7, roughness: 0.3 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const woolMat = new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.98, metalness: 0.0 });
    const sheepFaceMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
    const sheepLegMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });

    const hairMats = [hairBrown, hairBlack, hairBlonde];
    const skinMats = [skinMat, skinDark];
    const peasantColors = [
      new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x7a5533, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x996655, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x6b5540, roughness: 0.9 }),
    ];
    const merchantColors = [
      new THREE.MeshStandardMaterial({ color: 0x668844, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x995533, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x557755, roughness: 0.8 }),
    ];

    // Build mesh for each NPC type. Order must match _createNPCs():
    // 60 city, 20 market, 10 cathedral, 8 tavern, 5 blacksmith,
    // 6 noble, 8 training, 16 gates, 6 wall knights, then ~36 sheep
    const npcTypes: ("peasant" | "knight" | "merchant" | "sheep")[] = [];
    // City streets (60): mixed types
    for (let ci = 0; ci < 60; ci++) npcTypes.push(["peasant", "knight", "merchant"][ci % 3] as "peasant" | "knight" | "merchant");
    // Market (20): merchants + peasants
    for (let mi = 0; mi < 20; mi++) npcTypes.push(mi % 3 === 0 ? "peasant" : "merchant");
    // Cathedral (10)
    for (let i = 0; i < 10; i++) npcTypes.push("peasant");
    // Tavern (8)
    for (let i = 0; i < 8; i++) npcTypes.push(i < 3 ? "knight" : "peasant");
    // Blacksmith (5)
    for (let i = 0; i < 5; i++) npcTypes.push("peasant");
    // Noble quarter (6)
    for (let i = 0; i < 6; i++) npcTypes.push(i < 2 ? "knight" : "merchant");
    // Training yard (8)
    for (let i = 0; i < 8; i++) npcTypes.push("knight");
    // Gates (16)
    for (let i = 0; i < 16; i++) npcTypes.push(["peasant", "knight", "merchant"][i % 3] as "peasant" | "knight" | "merchant");
    // Wall guards (6)
    for (let gi = 0; gi < 6; gi++) npcTypes.push("knight");
    // Sheep flocks (6 flocks * ~6 avg = ~36 sheep, build 50 to be safe)
    for (let si = 0; si < 50; si++) npcTypes.push("sheep");
    const npcCount = npcTypes.length;

    // Simple seeded rng for visual variation
    let _vs = 7777;
    const vr = () => { _vs = (_vs * 16807) % 2147483647; return (_vs - 1) / 2147483646; };

    for (let i = 0; i < npcCount; i++) {
      const npcType = npcTypes[i];
      const group = new THREE.Group();

      if (npcType === "sheep") {
        // Woolly body
        const sheepBody = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), woolMat);
        sheepBody.position.y = 0.5;
        sheepBody.scale.set(0.8, 0.7, 1.1);
        group.add(sheepBody);
        // Fluffy top wool
        const topWool = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), woolMat);
        topWool.position.set(0, 0.75, 0);
        group.add(topWool);
        // Head
        const sheepHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), sheepFaceMat);
        sheepHead.position.set(0, 0.55, -0.55);
        group.add(sheepHead);
        // Ears
        for (const ex of [-1, 1]) {
          const ear = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.04), sheepFaceMat);
          ear.position.set(ex * 0.18, 0.6, -0.5);
          ear.rotation.z = ex * 0.4;
          group.add(ear);
        }
        // Eyes
        for (const ex of [-1, 1]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), eyeMat);
          eye.position.set(ex * 0.1, 0.58, -0.68);
          group.add(eye);
        }
        // Snout
        const snout = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), sheepLegMat);
        snout.position.set(0, 0.48, -0.7);
        group.add(snout);
        // Legs
        for (const lx of [-0.2, 0.2]) {
          for (const lz of [-0.3, 0.3]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 16), sheepLegMat);
            leg.position.set(lx, 0.17, lz);
            group.add(leg);
          }
        }
        // Tail
        const tail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), woolMat);
        tail.position.set(0, 0.55, 0.5);
        group.add(tail);
      } else {
        // ── Detailed human NPC ──
        const skin = skinMats[Math.floor(vr() * skinMats.length)];
        const hair = hairMats[Math.floor(vr() * hairMats.length)];

        // --- Torso (chest + shoulders) ---
        if (npcType === "knight") {
          // Armoured torso with chainmail underlay
          const chainmail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.22), knightChainmail);
          chainmail.position.y = 0.75;
          group.add(chainmail);
          const chestplate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.45, 0.26), knightArmor);
          chestplate.position.y = 0.78;
          group.add(chestplate);
          // Shoulder pauldrons
          for (const side of [-1, 1]) {
            const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), knightArmor);
            pauldron.position.set(side * 0.22, 1.0, 0);
            group.add(pauldron);
          }
        } else if (npcType === "merchant") {
          const robeMat = merchantColors[Math.floor(vr() * merchantColors.length)];
          // Long robe
          const robe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.75, 0.24), robeMat);
          robe.position.y = 0.65;
          group.add(robe);
          // Apron over front
          const apron = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.02), merchantApron);
          apron.position.set(0, 0.6, -0.13);
          group.add(apron);
        } else {
          // Peasant tunic
          const tunicMat = peasantColors[Math.floor(vr() * peasantColors.length)];
          const tunic = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.22), tunicMat);
          tunic.position.y = 0.72;
          group.add(tunic);
        }

        // --- Belt ---
        const belt = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.27), beltMat);
        belt.position.y = 0.52;
        group.add(belt);

        // --- Arms ---
        const armMat = npcType === "knight" ? knightChainmail : npcType === "merchant" ? merchantColors[Math.floor(vr() * merchantColors.length)] : peasantColors[Math.floor(vr() * peasantColors.length)];
        for (const side of [-1, 1]) {
          // Upper arm
          const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.09), armMat);
          upperArm.position.set(side * 0.22, 0.85, 0);
          group.add(upperArm);
          // Forearm
          const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), armMat);
          forearm.position.set(side * 0.22, 0.58, 0);
          group.add(forearm);
          // Hand
          const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), skin);
          hand.position.set(side * 0.22, 0.44, 0);
          group.add(hand);
        }

        // --- Head ---
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), skin);
        head.name = "head";
        head.position.y = 1.22;
        group.add(head);

        // Eyes
        for (const ex of [-1, 1]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), eyeMat);
          eye.position.set(ex * 0.055, 1.24, -0.12);
          group.add(eye);
        }
        // Nose
        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.04), skin);
        nose.position.set(0, 1.2, -0.15);
        group.add(nose);

        // --- Hair / headwear ---
        if (npcType === "knight") {
          // Full helmet with visor slit
          const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), knightArmor);
          helmet.position.y = 1.24;
          group.add(helmet);
          // Visor slit
          const visor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), eyeMat);
          visor.position.set(0, 1.24, -0.15);
          group.add(visor);
          // Crest / plume on top
          const crest = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.12, 0.14),
            vr() > 0.5 ? crestRed : crestBlue,
          );
          crest.position.set(0, 1.4, 0);
          group.add(crest);
        } else if (npcType === "merchant") {
          // Hat / hood
          const hood = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
          hood.position.y = 1.28;
          group.add(hood);
          // Brim
          const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16), hair);
          brim.position.y = 1.28;
          group.add(brim);
        } else {
          // Peasant hair — side-swept
          const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
          hairMesh.position.y = 1.27;
          group.add(hairMesh);
        }

        // --- Legs with boots ---
        const legMat = npcType === "knight" ? knightArmor : peasantTrousers;
        for (const side of [-1, 1]) {
          // Upper leg
          const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.12), legMat);
          thigh.position.set(side * 0.1, 0.35, 0);
          group.add(thigh);
          // Boot
          const boot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.2, 0.16), bootMat);
          boot.position.set(side * 0.1, 0.1, -0.01);
          group.add(boot);
        }

        // --- Type-specific accessories ---
        if (npcType === "knight") {
          // Spear in right hand
          const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 8), spearWood);
          shaft.position.set(0.22, 1.05, 0);
          group.add(shaft);
          // Spear tip
          const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 8), spearTip);
          tip.position.set(0.22, 1.88, 0);
          group.add(tip);
          // Shield on left arm
          if (vr() > 0.4) {
            const shield = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.22), shieldMat);
            shield.position.set(-0.26, 0.75, 0);
            group.add(shield);
            // Shield emblem (small cross)
            const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.03), crestRed);
            emblem.position.set(-0.275, 0.78, 0);
            group.add(emblem);
            const emblemH = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 0.1), crestRed);
            emblemH.position.set(-0.275, 0.8, 0);
            group.add(emblemH);
          }
          // Cape on back
          if (vr() > 0.5) {
            const capeMat = vr() > 0.5 ? crestRed : crestBlue;
            const cape = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.5, 0.02), capeMat);
            cape.position.set(0, 0.72, 0.14);
            cape.rotation.x = 0.1;
            group.add(cape);
          }
        } else if (npcType === "merchant") {
          // Sack / bundle carried
          if (vr() > 0.3) {
            const sack = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), sackMat);
            sack.position.set(0.24, 0.6, 0);
            group.add(sack);
          }
          // Pouch on belt
          const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.06), beltMat);
          pouch.position.set(0.15, 0.49, -0.1);
          group.add(pouch);
        } else {
          // Peasant — occasional walking stick
          if (vr() > 0.6) {
            const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.1, 6), spearWood);
            stick.position.set(0.22, 0.55, 0);
            stick.rotation.z = -0.15;
            group.add(stick);
          }
          // Occasional basket
          if (vr() > 0.7) {
            const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.1, 8), sackMat);
            basket.position.set(-0.22, 0.55, 0);
            group.add(basket);
          }
        }
      }

      group.visible = false;
      this._scene.add(group);
      this._npcGroups.push(group);
    }
  }

  // ---------------------------------------------------------------------------
  // Magic trail (spell 3)
  // ---------------------------------------------------------------------------

  private _buildMagicTrail(): void {
    const maxPts = 200;
    const positions = new Float32Array(maxPts * 3);
    const colors = new Float32Array(maxPts * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this._magicTrailMesh = new THREE.Line(geo, mat);
    this._magicTrailMesh.frustumCulled = false;
    this._scene.add(this._magicTrailMesh);
    for (let i = 0; i < maxPts; i++) {
      this._magicTrailPoints.push(new THREE.Vector3());
    }
  }

  // ---------------------------------------------------------------------------
  // Checkpoint rings (glowing torus rings in the air)
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Dragons
  // ---------------------------------------------------------------------------

  private _buildDragons(): void {
    const dragonScaleMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.6, metalness: 0.15 });
    const dragonDarkMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.7 });
    const dragonWingMembraneMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const dragonBellyMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.6 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x222211, roughness: 0.5, metalness: 0.2 });
    const clawMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.3 });

    for (let d = 0; d < 2; d++) {
      const group = new THREE.Group();

      // --- Main body (elongated, muscular) ---
      const body = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), dragonScaleMat);
      body.scale.set(1, 0.7, 2.5);
      body.castShadow = true;
      group.add(body);
      // Chest/front body
      const chest = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 12), dragonScaleMat);
      chest.position.set(0, 0.2, -2);
      chest.scale.set(1, 0.8, 1.2);
      group.add(chest);
      // Belly (lighter underside)
      const belly = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), dragonBellyMat);
      belly.position.set(0, -0.6, -0.5);
      belly.scale.set(0.8, 0.4, 2);
      group.add(belly);
      // Spine ridges
      for (let sr = 0; sr < 8; sr++) {
        const ridge = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 12), hornMat);
        ridge.position.set(0, 1.2 - sr * 0.05, -2 + sr * 0.9);
        ridge.rotation.x = -0.2;
        group.add(ridge);
      }

      // --- Neck (segmented) ---
      for (let ns = 0; ns < 4; ns++) {
        const neckSeg = new THREE.Mesh(new THREE.SphereGeometry(0.8 - ns * 0.1, 16, 12), dragonScaleMat);
        neckSeg.position.set(0, 0.4 + ns * 0.3, -3.5 - ns * 0.8);
        neckSeg.scale.set(1, 0.9, 1.2);
        group.add(neckSeg);
      }

      // --- Head ---
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), dragonScaleMat);
      head.position.set(0, 1.6, -6.5);
      head.scale.set(0.9, 0.8, 1.3);
      group.add(head);
      // Jaw
      const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), dragonDarkMat);
      jaw.position.set(0, 1.1, -6.8);
      jaw.scale.set(0.8, 0.4, 1.2);
      group.add(jaw);
      // Snout
      const snout = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.8, 16), dragonScaleMat);
      snout.position.set(0, 1.4, -7.8);
      snout.rotation.x = Math.PI / 2;
      group.add(snout);
      // Nostrils
      for (const nx of [-0.2, 0.2]) {
        const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), dragonDarkMat);
        nostril.position.set(nx, 1.5, -8.5);
        group.add(nostril);
      }
      // Eyes (glowing, slitted)
      for (const ex of [-0.45, 0.45]) {
        const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), dragonDarkMat);
        eyeSocket.position.set(ex, 1.9, -6.6);
        group.add(eyeSocket);
        const eyeGlow = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.8 }),
        );
        eyeGlow.position.set(ex, 1.9, -6.55);
        group.add(eyeGlow);
        // Slit pupil
        const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.02), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        pupil.position.set(ex, 1.9, -6.5);
        group.add(pupil);
      }
      // Horns
      for (const hx of [-0.5, 0.5]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.2, 16), hornMat);
        horn.position.set(hx, 2.4, -6);
        horn.rotation.x = -0.4;
        horn.rotation.z = hx * 0.3;
        group.add(horn);
        // Secondary smaller horn
        const horn2 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.7, 16), hornMat);
        horn2.position.set(hx * 0.7, 2.2, -5.5);
        horn2.rotation.x = -0.3;
        horn2.rotation.z = hx * 0.4;
        group.add(horn2);
      }
      // Teeth (visible from jaw)
      for (let ti = 0; ti < 6; ti++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0xeeddcc }));
        tooth.position.set((ti - 2.5) * 0.15, 1.05, -7.2 - ti * 0.1);
        tooth.rotation.x = Math.PI;
        group.add(tooth);
      }

      // --- Wings (multi-segment with membrane) ---
      for (const side of [-1, 1]) {
        const wingGroup = new THREE.Group();
        // Wing arm (bone structure)
        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 3, 16), dragonScaleMat);
        upperArm.rotation.z = side * Math.PI / 2;
        upperArm.position.set(side * 1.5, 0.8, 0);
        wingGroup.add(upperArm);
        // Forearm
        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 4, 16), dragonScaleMat);
        forearm.rotation.z = side * Math.PI / 2.5;
        forearm.position.set(side * 4.5, 1.2, -0.3);
        wingGroup.add(forearm);
        // Wing fingers (3 segments radiating outward)
        for (let f = 0; f < 3; f++) {
          const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 2.5, 16), dragonScaleMat);
          const fAngle = (f - 1) * 0.25;
          finger.rotation.z = side * (Math.PI / 3 + fAngle);
          finger.position.set(side * (6.5 + f * 0.3), 1.5 - f * 0.2, -0.5 + f * 0.8);
          wingGroup.add(finger);
          // Claw at finger tip
          const claw = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 16), clawMat);
          claw.position.set(side * (7.5 + f * 0.4), 2 - f * 0.3, -0.5 + f * 0.8);
          wingGroup.add(claw);
        }
        // Membrane (large triangular planes between fingers)
        const membrane1 = new THREE.Mesh(new THREE.PlaneGeometry(5, 3, 3, 2), dragonWingMembraneMat);
        membrane1.position.set(side * 4, 0.8, 0);
        membrane1.rotation.z = side * 0.05;
        wingGroup.add(membrane1);
        const membrane2 = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.5, 2, 2), dragonWingMembraneMat);
        membrane2.position.set(side * 6.5, 1.2, 0.3);
        membrane2.rotation.z = side * 0.1;
        wingGroup.add(membrane2);

        wingGroup.name = side === -1 ? "wingL" : "wingR";
        group.add(wingGroup);
      }

      // --- Tail (multi-segment, curved) ---
      for (let ts = 0; ts < 6; ts++) {
        const tailSeg = new THREE.Mesh(
          new THREE.SphereGeometry(0.6 - ts * 0.08, 16, 12),
          dragonScaleMat,
        );
        tailSeg.position.set(0, -0.1 - ts * 0.1, 3 + ts * 1.2);
        tailSeg.scale.set(0.8, 0.6, 1.2);
        group.add(tailSeg);
      }
      // Tail spade
      const tailSpade = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.8, 16), hornMat);
      tailSpade.position.set(0, -0.6, 10);
      tailSpade.rotation.x = Math.PI / 2;
      tailSpade.rotation.z = Math.PI / 4;
      group.add(tailSpade);

      // --- Legs (4 legs) ---
      for (const lz of [-1, 1.5]) {
        for (const lx of [-1.2, 1.2]) {
          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 1.5, 16), dragonScaleMat);
          thigh.position.set(lx, -0.8, lz);
          thigh.rotation.z = lx > 0 ? 0.3 : -0.3;
          group.add(thigh);
          const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 1.2, 16), dragonScaleMat);
          shin.position.set(lx * 1.2, -1.8, lz);
          group.add(shin);
          // Claws
          for (let c = 0; c < 3; c++) {
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 16), clawMat);
            claw.position.set(lx * 1.2 + (c - 1) * 0.1, -2.3, lz + 0.1);
            claw.rotation.x = 0.3;
            group.add(claw);
          }
        }
      }

      // --- Fire breath (layered for depth) ---
      const fireGroup = new THREE.Group();
      fireGroup.name = "fire";
      const fireMat1 = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.2, transparent: true, opacity: 0.7 });
      const fireMat2 = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff0000, emissiveIntensity: 1, transparent: true, opacity: 0.5 });
      const fireMat3 = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 0.8, transparent: true, opacity: 0.4 });
      const fireCore = new THREE.Mesh(new THREE.ConeGeometry(0.8, 10, 16), fireMat1);
      fireCore.rotation.x = Math.PI / 2;
      fireCore.position.z = -12;
      fireGroup.add(fireCore);
      const fireMid = new THREE.Mesh(new THREE.ConeGeometry(1.5, 8, 16), fireMat2);
      fireMid.rotation.x = Math.PI / 2;
      fireMid.position.z = -10;
      fireGroup.add(fireMid);
      const fireOuter = new THREE.Mesh(new THREE.ConeGeometry(2.5, 6, 16), fireMat3);
      fireOuter.rotation.x = Math.PI / 2;
      fireOuter.position.z = -9;
      fireGroup.add(fireOuter);
      // Fire light
      const fireLight = new THREE.PointLight(0xff4400, 5, 25);
      fireLight.position.set(0, 0, -10);
      fireGroup.add(fireLight);
      fireGroup.visible = false;
      group.add(fireGroup);

      // Dragon glow light (ambient presence)
      const dragonGlow = new THREE.PointLight(0xff6622, 1, 20);
      dragonGlow.position.set(0, 0, -6);
      group.add(dragonGlow);

      group.scale.setScalar(1.8);
      group.castShadow = true;
      this._scene.add(group);
      this._dragonGroups.push(group);
    }
  }

  // ---------------------------------------------------------------------------
  // Bird Flocks
  // ---------------------------------------------------------------------------

  private _buildBirdFlocks(): void {
    const birdBodyMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    const birdWingMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8, side: THREE.DoubleSide });
    const birdBellyMat = new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.8 });
    // Create mesh pools for 8 flocks, up to 14 birds each
    for (let f = 0; f < 8; f++) {
      const flockMeshes: THREE.Mesh[] = [];
      for (let b = 0; b < 14; b++) {
        // Use a Group as the "mesh" (cast to Mesh for array compatibility)
        const birdGroup = new THREE.Group();
        // Body (elongated ellipsoid)
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), birdBodyMat);
        body.scale.set(0.8, 0.7, 1.5);
        birdGroup.add(body);
        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), birdBodyMat);
        head.position.set(0, 0.05, -0.2);
        birdGroup.add(head);
        // Beak
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 12), new THREE.MeshStandardMaterial({ color: 0xddaa44 }));
        beak.position.set(0, 0.04, -0.28);
        beak.rotation.x = Math.PI / 2;
        birdGroup.add(beak);
        // Wings
        for (const side of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.15), birdWingMat);
          wing.position.set(side * 0.25, 0.05, 0);
          wing.name = side === -1 ? "bwL" : "bwR";
          birdGroup.add(wing);
        }
        // Tail
        const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.12), birdBodyMat);
        tail.position.set(0, 0, 0.2);
        tail.rotation.x = -0.2;
        birdGroup.add(tail);
        // Belly highlight
        const bellySpot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), birdBellyMat);
        bellySpot.position.set(0, -0.06, 0);
        bellySpot.scale.set(0.7, 0.3, 1.2);
        birdGroup.add(bellySpot);

        birdGroup.visible = false;
        this._scene.add(birdGroup);
        flockMeshes.push(birdGroup as unknown as THREE.Mesh);
      }
      this._birdMeshes.push(flockMeshes);
    }
  }

  private _buildCheckpointRings(): void {
    const ringMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x229966) },
        collected: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        uniform float collected;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          if (collected > 0.5) discard;
          float pulse = 0.6 + sin(time * 3.0) * 0.2;
          // Edge glow
          float rim = 1.0 - abs(dot(vNormal, normalize(cameraPosition - vWorldPos)));
          float glow = pow(rim, 2.0) * 0.8 + pulse * 0.3;
          gl_FragColor = vec4(color * glow, glow * 0.7);
        }
      `,
    });

    // Create 10 checkpoint rings (will be positioned from state)
    for (let i = 0; i < 10; i++) {
      const geo = new THREE.TorusGeometry(8, 0.4, 12, 32);
      const mat = ringMat.clone();
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = Math.PI / 2;
      this._scene.add(ring);
      this._checkpointMeshes.push(ring);
    }
  }

  // ---------------------------------------------------------------------------
  // Thermal shimmer effect
  // ---------------------------------------------------------------------------

  private _buildThermalShimmers(): void {
    const shimmerMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 pos = position;
          pos.x += sin(pos.y * 2.0 + time * 3.0) * 0.5;
          pos.z += cos(pos.y * 1.5 + time * 2.5) * 0.3;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        void main() {
          float shimmer = sin(vUv.y * 20.0 + time * 5.0) * 0.5 + 0.5;
          shimmer *= smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
          gl_FragColor = vec4(1.0, 0.95, 0.9, shimmer * 0.04);
        }
      `,
    });

    // 6 thermal locations
    const thermalPos = [
      { x: 0, z: 30 }, { x: 140, z: -60 }, { x: -120, z: 90 },
      { x: -45, z: 5 }, { x: 180, z: 80 }, { x: -160, z: -100 },
    ];
    for (const tp of thermalPos) {
      const geo = new THREE.CylinderGeometry(10, 15, 40, 16, 8, true);
      const shimmer = new THREE.Mesh(geo, shimmerMat.clone());
      shimmer.position.set(tp.x, 20, tp.z);
      this._scene.add(shimmer);
      this._thermalShimmers.push(shimmer);
    }
  }

  // ---------------------------------------------------------------------------
  // Update (called each frame)
  // ---------------------------------------------------------------------------

  update(state: EagleFlightState, dt: number): void {
    const p = state.player;
    const t = state.gameTime;

    // --- Mount/Dismount visibility ---
    const isMounted = p.mounted;
    const inTransition = p.mountTransition < 1;
    const transT = p.mountTransition; // 0→1

    this._eagleGroup.visible = isMounted || (inTransition && p.mountTransitionDir === 1);
    this._walkingMerlinGroup.visible = !isMounted || (inTransition && p.mountTransitionDir === -1);

    // --- Mount/dismount magic particle effects ---
    if (inTransition && Math.random() < 0.6) {
      const sparkMat = new THREE.MeshStandardMaterial({
        color: p.mountTransitionDir === 1 ? 0x44aaff : 0xffaa44,
        emissive: p.mountTransitionDir === 1 ? 0x2288ff : 0xff8822,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.9,
      });
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 16, 12), sparkMat);
      spark.position.set(
        p.position.x + (Math.random() - 0.5) * 4,
        p.position.y + Math.random() * 3,
        p.position.z + (Math.random() - 0.5) * 4,
      );
      this._scene.add(spark);
      this._mountParticles.push({
        mesh: spark,
        vx: (Math.random() - 0.5) * 6,
        vy: 2 + Math.random() * 4,
        vz: (Math.random() - 0.5) * 6,
        life: 0.6 + Math.random() * 0.4,
      });
    }

    // Update mount particles
    for (let i = this._mountParticles.length - 1; i >= 0; i--) {
      const mp = this._mountParticles[i];
      mp.life -= dt;
      if (mp.life <= 0) {
        this._scene.remove(mp.mesh);
        mp.mesh.geometry.dispose();
        this._mountParticles.splice(i, 1);
        continue;
      }
      mp.mesh.position.x += mp.vx * dt;
      mp.mesh.position.y += mp.vy * dt;
      mp.mesh.position.z += mp.vz * dt;
      mp.vy -= 5 * dt; // gravity
      const mat = mp.mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = mp.life;
      mp.mesh.scale.setScalar(mp.life * 1.5);
    }

    if (isMounted) {
      // --- Update eagle position and rotation ---
      this._eagleGroup.position.set(p.position.x, p.position.y, p.position.z);
      const euler = new THREE.Euler(p.pitch, p.yaw, p.roll, "YXZ");
      this._eagleGroup.setRotationFromEuler(euler);

      // Mount transition: eagle swoops in from above
      if (inTransition && p.mountTransitionDir === 1) {
        const swoopOffset = (1 - transT) * 15;
        this._eagleGroup.position.y += swoopOffset;
        this._eagleGroup.scale.setScalar(1.5 * transT);
      } else {
        this._eagleGroup.scale.setScalar(1.5);
      }

      // Wing flap animation
      const speedRatio = p.speed / 45;
      const flapAmp = 0.15 + (1 - speedRatio) * 0.25;
      const flapAngle = Math.sin(p.flapPhase) * flapAmp;
      if (this._eagleWingL) {
        this._eagleWingL.rotation.z = flapAngle + 0.05;
        this._eagleWingL.rotation.x = Math.sin(p.flapPhase * 0.7) * 0.05;
      }
      if (this._eagleWingR) {
        this._eagleWingR.rotation.z = -flapAngle - 0.05;
        this._eagleWingR.rotation.x = Math.sin(p.flapPhase * 0.7) * 0.05;
      }
      if (this._eagleTail) {
        this._eagleTail.rotation.x = p.pitch * 0.3;
        this._eagleTail.rotation.y = Math.sin(t * 2) * 0.05;
      }

      // Merlin staff crystal pulsing glow (on eagle)
      if (this._merlinGroup.children.length > 0) {
        const crystalScale = 1.0 + Math.sin(t * 4) * 0.15;
        const staffChildren = this._merlinGroup.children;
        for (const child of staffChildren) {
          if (child instanceof THREE.PointLight) {
            child.intensity = 2.5 + Math.sin(t * 3) * 1.0 + Math.sin(t * 7) * 0.3;
          }
          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.OctahedronGeometry) {
            child.rotation.y = t * 1.5;
            child.rotation.x = Math.sin(t * 0.8) * 0.3;
            child.scale.setScalar(crystalScale);
          }
        }
      }
    } else {
      // --- Walking Merlin update ---
      this._walkingMerlinGroup.position.set(p.position.x, p.position.y - 1.5, p.position.z);
      this._walkingMerlinGroup.rotation.y = p.yaw;

      // Dismount transition: Merlin fades in / drops from eagle height
      if (inTransition && p.mountTransitionDir === -1) {
        const dropOffset = (1 - transT) * 8;
        this._walkingMerlinGroup.position.y += dropOffset;
        this._walkingMerlinGroup.scale.setScalar(1.8 * (0.5 + transT * 0.5));
      } else {
        this._walkingMerlinGroup.scale.setScalar(1.8);
      }

      // Walking animation
      const walkPhase = p.walkPhase;
      const isWalking = p.speed > 0.5;
      const walkAmp = isWalking ? 0.4 : 0;

      // Leg swing
      if (this._walkMerlinLegL) {
        this._walkMerlinLegL.rotation.x = Math.sin(walkPhase) * walkAmp;
      }
      if (this._walkMerlinLegR) {
        this._walkMerlinLegR.rotation.x = -Math.sin(walkPhase) * walkAmp;
      }

      // Arm swing (opposite to legs)
      if (this._walkMerlinArmL) {
        this._walkMerlinArmL.rotation.x = -Math.sin(walkPhase) * walkAmp * 0.6;
      }
      if (this._walkMerlinArmR) {
        this._walkMerlinArmR.rotation.x = Math.sin(walkPhase) * walkAmp * 0.3; // less arm swing on staff side
      }

      // Slight body bob
      if (isWalking) {
        this._walkingMerlinGroup.position.y += Math.abs(Math.sin(walkPhase * 2)) * 0.08;
      }

      // Robe skirt sway
      if (this._walkMerlinRobeSkirt) {
        this._walkMerlinRobeSkirt.rotation.x = Math.sin(walkPhase) * walkAmp * 0.1;
      }

      // Staff crystal glow (walking)
      for (const child of this._walkingMerlinGroup.children) {
        if (child instanceof THREE.PointLight) {
          child.intensity = 3.0 + Math.sin(t * 3) * 1.2 + Math.sin(t * 7) * 0.4;
        }
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.OctahedronGeometry) {
          child.rotation.y = t * 1.5;
          child.rotation.x = Math.sin(t * 0.8) * 0.3;
          child.scale.setScalar(1.0 + Math.sin(t * 4) * 0.15);
        }
      }

      // Hide eagle off-screen during walk
      this._eagleGroup.position.set(p.position.x, p.position.y + 500, p.position.z);
    }

    // --- Camera follow ---
    const euler = new THREE.Euler(p.pitch, p.yaw, p.roll, "YXZ");
    let targetCamPos: THREE.Vector3;
    let targetLookAt: THREE.Vector3;

    if (!isMounted) {
      // Third-person walking camera: behind and above Merlin
      const walkCamDist = 8;
      const walkCamHeight = 4;
      const walkForward = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
      targetCamPos = new THREE.Vector3(
        p.position.x - walkForward.x * walkCamDist,
        p.position.y + walkCamHeight,
        p.position.z - walkForward.z * walkCamDist,
      );
      targetLookAt = new THREE.Vector3(
        p.position.x + walkForward.x * 5,
        p.position.y + 1,
        p.position.z + walkForward.z * 5,
      );
    } else {
      // Flight camera
      const altFactor = Math.min(1, p.position.y / 40);
      const baseDist = 14 + altFactor * 4;
      const camDist = p.boostActive ? baseDist + 6 : baseDist;
      const camHeight = p.boostActive ? 3 : (4 + altFactor * 2);
      const forward = new THREE.Vector3(0, 0, -1).applyEuler(euler);
      const up = new THREE.Vector3(0, 1, 0).applyEuler(euler);

      if (p.freeLook) {
        const flYaw = p.yaw + p.freeLookYaw;
        const flPitch = p.freeLookPitch;
        const flForward = new THREE.Vector3(
          -Math.sin(flYaw) * Math.cos(flPitch),
          Math.sin(flPitch),
          -Math.cos(flYaw) * Math.cos(flPitch),
        );
        targetCamPos = new THREE.Vector3(
          p.position.x - flForward.x * camDist,
          p.position.y - flForward.y * camDist + camHeight,
          p.position.z - flForward.z * camDist,
        );
        targetLookAt = new THREE.Vector3(p.position.x, p.position.y, p.position.z);
      } else {
        targetCamPos = new THREE.Vector3(
          p.position.x - forward.x * camDist + up.x * camHeight,
          p.position.y - forward.y * camDist + up.y * camHeight,
          p.position.z - forward.z * camDist + up.z * camHeight,
        );
        targetLookAt = new THREE.Vector3(
          p.position.x + forward.x * 20,
          p.position.y + forward.y * 10,
          p.position.z + forward.z * 20,
        );
      }
    }

    // Camera smoothing
    const speedSmooth = isMounted ? (0.01 + (p.speed / 65) * 0.03) : 0.04;
    const smoothFactor = 1 - Math.pow(speedSmooth, dt);
    this._camPos.lerp(targetCamPos, smoothFactor);
    this._camTarget.lerp(targetLookAt, smoothFactor);
    if (this._camPos.y < 2) this._camPos.y = 2;

    this._camera.position.copy(this._camPos);
    this._camera.lookAt(this._camTarget);

    // Camera shake
    if (state.shakeTimer > 0) {
      const shakeStr = state.shakeMag * (state.shakeTimer / 0.3);
      this._camera.position.x += (Math.random() - 0.5) * shakeStr * 0.3;
      this._camera.position.y += (Math.random() - 0.5) * shakeStr * 0.2;
    }

    // FOV: narrower when walking, wider when boosting
    const targetFov = !isMounted ? 60 : (p.boostActive ? 78 : 65);
    const currentFov = this._camera.fov;
    this._camera.fov += (targetFov - currentFov) * 3 * dt;
    this._camera.updateProjectionMatrix();

    // --- Spawn magic sparkles from Merlin's staff ---
    if (Math.random() < dt * 8) {
      const sparkMat = new THREE.MeshStandardMaterial({
        color: 0x44aaff,
        emissive: 0x2288ff,
        emissiveIntensity: 1.0,
        transparent: true,
        opacity: 0.8,
      });
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 16, 12), sparkMat);
      // Position behind the eagle (trail of magic)
      spark.position.set(
        p.position.x + (Math.random() - 0.5) * 2,
        p.position.y + (Math.random() - 0.5) * 1.5,
        p.position.z + (Math.random() - 0.5) * 2,
      );
      this._scene.add(spark);
      // Use smoke particles array for lifecycle management
      this._smokeParticles.push({ mesh: spark, vy: (Math.random() - 0.5) * 0.5, life: 1.0 + Math.random() * 0.5 });
    }

    // --- Animate water ---
    if (this._waterUniforms) {
      this._waterUniforms.time.value = t;
    }

    // --- Animate clouds ---
    this._cloudGroup.children.forEach((cloud, i) => {
      cloud.position.x += Math.sin(i * 0.7 + t * 0.1) * 0.025;
      cloud.position.z += 0.018;
      if (cloud.position.z > 300) cloud.position.z -= 600;
    });

    // --- Animate dust particles ---
    if (this._dustParticles) {
      const dPos = this._dustParticles.geometry.getAttribute("position");
      for (let i = 0; i < dPos.count; i++) {
        let y = dPos.getY(i);
        let x = dPos.getX(i);
        y += Math.sin(t * 0.5 + i * 0.1) * 0.02;
        x += Math.cos(t * 0.3 + i * 0.2) * 0.01;
        if (y > 65) y = 2;
        dPos.setY(i, y);
        dPos.setX(i, x);
      }
      dPos.needsUpdate = true;
    }

    // --- Animate tree canopies (wind sway) ---
    for (const st of this._swayTrees) {
      st.mesh.position.x += Math.sin(t * 1.2 + st.phase) * 0.003;
      st.mesh.position.z += Math.cos(t * 0.9 + st.phase * 1.3) * 0.002;
      st.mesh.position.y = st.baseY + Math.sin(t * 1.5 + st.phase) * 0.05;
    }

    // --- Update grass shader time uniforms ---
    // Update all unique grass materials
    const updatedMats = new Set<THREE.ShaderMaterial>();
    for (const gb of this._grassBlades) {
      const mat = gb.mesh.material as THREE.ShaderMaterial;
      if (mat.uniforms?.time && !updatedMats.has(mat)) {
        mat.uniforms.time.value = t;
        updatedMats.add(mat);
      }
    }

    // --- Animate birds ---
    for (const bird of this._birdGroups) {
      bird.phase += bird.speed * dt;
      const bx = bird.cx + Math.cos(bird.phase) * bird.radius;
      const bz = bird.cz + Math.sin(bird.phase) * bird.radius;
      const by = bird.cy + Math.sin(bird.phase * 2) * 3;
      bird.group.position.set(bx, by, bz);
      bird.group.rotation.y = bird.phase + Math.PI / 2;
      // Wing flap
      const wings = bird.group.children;
      if (wings.length >= 3) {
        const wingFlap = Math.sin(t * 8 + bird.phase * 5) * 0.4;
        wings[1].rotation.z = wingFlap;
        wings[2].rotation.z = -wingFlap;
      }
    }

    // --- Animate torch lights (flicker) ---
    for (let i = 0; i < this._torchLights.length; i++) {
      const light = this._torchLights[i];
      light.intensity = 1.2 + Math.sin(t * 8 + i * 3.7) * 0.4 + Math.sin(t * 13 + i * 2.1) * 0.2;
      if (this._torchMeshes[i]) {
        const scale = 0.9 + Math.sin(t * 10 + i * 4) * 0.15;
        this._torchMeshes[i].scale.setScalar(scale);
      }
    }

    // --- Animate windmill blades ---
    for (const bladeGroup of this._windmillBladeGroups) {
      bladeGroup.rotation.z += dt * 0.8;
    }

    // --- Animate banners (wave) ---
    for (const banner of this._bannerMeshes) {
      const geo = banner.geometry as THREE.PlaneGeometry;
      const pos = geo.getAttribute("position");
      if (!pos) continue;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        // Wave displacement increases toward bottom of banner
        const wave = Math.sin(t * 3 + y * 2) * 0.3 * (1 - (y + 4) / 8);
        pos.setZ(i, wave);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }

    // --- Update eagle trail with color fade ---
    if (this._trailMesh) {
      for (let i = this._trailPoints.length - 1; i > 0; i--) {
        this._trailPoints[i].copy(this._trailPoints[i - 1]);
      }
      this._trailPoints[0].set(p.position.x, p.position.y, p.position.z);

      const tPos = this._trailMesh.geometry.getAttribute("position");
      const tCol = this._trailMesh.geometry.getAttribute("color");
      let drawCount = 0;
      for (let i = 0; i < this._trailPoints.length; i++) {
        tPos.setXYZ(i, this._trailPoints[i].x, this._trailPoints[i].y, this._trailPoints[i].z);
        // Color fade: bright blue at front → transparent at back
        const fade = 1 - i / this._trailPoints.length;
        const boostGlow = p.boostActive ? 1.5 : 1.0;
        tCol.setXYZ(i, 0.3 * fade * boostGlow, 0.6 * fade * boostGlow, 1.0 * fade * boostGlow);
        if (i > 0) {
          const d = this._trailPoints[i].distanceTo(this._trailPoints[0]);
          if (d < 0.01) break;
        }
        drawCount++;
      }
      tPos.needsUpdate = true;
      tCol.needsUpdate = true;
      this._trailMesh.geometry.setDrawRange(0, drawCount);
    }

    // --- God rays follow sun direction relative to camera ---
    if (this._godRaysMesh) {
      this._godRaysMesh.position.set(
        this._camPos.x + 60,
        80,
        this._camPos.z - 80,
      );
      const rayMat = this._godRaysMesh.material as THREE.ShaderMaterial;
      rayMat.uniforms.time.value = t;
    }

    // --- Sky follows camera + animate ---
    this._skyMesh.position.set(this._camPos.x, 0, this._camPos.z);
    const skyMat = this._skyMesh.material as THREE.ShaderMaterial;
    if (skyMat.uniforms?.time) {
      skyMat.uniforms.time.value = t;
    }

    // --- Sun light follows player ---
    this._sunLight.target.position.set(p.position.x, 0, p.position.z);
    this._sunLight.position.set(p.position.x + 80, 120, p.position.z - 60);

    // --- Update water camera position for Fresnel ---
    const waterMat = this._riverMesh?.material as THREE.ShaderMaterial;
    if (waterMat?.uniforms?.camPos) {
      waterMat.uniforms.camPos.value.copy(this._camPos);
    }

    // --- Animate ground fog ---
    for (const fog of this._groundFogMeshes) {
      const fMat = fog.material as THREE.ShaderMaterial;
      if (fMat.uniforms?.time) {
        fMat.uniforms.time.value = t;
      }
    }

    // --- Update lens flare position (track sun in screen space) ---
    if (this._lensFlareGroup.children.length > 0) {
      const sunWorldPos = new THREE.Vector3(
        this._camPos.x + 80,
        120,
        this._camPos.z - 60,
      ).normalize().multiplyScalar(350).add(this._camPos);

      // Project sun to screen
      const sunScreen = sunWorldPos.clone().project(this._camera);
      const onScreen = sunScreen.x > -1.2 && sunScreen.x < 1.2 && sunScreen.y > -1.2 && sunScreen.y < 1.2 && sunScreen.z < 1;

      if (onScreen) {
        // Position flare elements along line from sun to center
        const flarePositions = [0.0, 0.2, 0.5, 0.7, 1.0];
        for (let i = 0; i < this._lensFlareGroup.children.length && i < flarePositions.length; i++) {
          const child = this._lensFlareGroup.children[i];
          const t2 = flarePositions[i];
          const fx = sunWorldPos.x * (1 - t2) + this._camPos.x * t2;
          const fy = sunWorldPos.y * (1 - t2) + this._camPos.y * t2;
          const fz = sunWorldPos.z * (1 - t2) + this._camPos.z * t2;
          child.position.set(fx, fy, fz);
          child.lookAt(this._camPos);
          child.visible = true;
        }
        // Fade flare based on how centered the sun is
        const sunCenterDist = Math.sqrt(sunScreen.x * sunScreen.x + sunScreen.y * sunScreen.y);
        const flareFade = Math.max(0, 1 - sunCenterDist * 0.8);
        this._lensFlareGroup.children.forEach((child) => {
          const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
          mat.opacity = mat.userData.baseOpacity !== undefined
            ? mat.userData.baseOpacity * flareFade
            : flareFade * 0.1;
        });
      } else {
        this._lensFlareGroup.children.forEach(c => c.visible = false);
      }
    }

    // --- Chimney smoke ---
    // Spawn new smoke particles occasionally
    if (Math.random() < dt * 3 && this._smokeParticles.length < 40) {
      const smokeMat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      });
      const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 12, 10), smokeMat);
      // Place near castle chimney area (or tavern) in world coords
      const sources = [
        { x: 45 - 3, z: 10 - 2 + 30 },  // tavern chimney approx
        { x: -45 - 2, z: 5 + 5 + 30 },   // blacksmith chimney approx
      ];
      const src = sources[Math.floor(Math.random() * sources.length)];
      smoke.position.set(src.x + (Math.random() - 0.5) * 1, 15, src.z);
      this._scene.add(smoke);
      this._smokeParticles.push({ mesh: smoke, vy: 1.5 + Math.random(), life: 3 + Math.random() * 2 });
    }
    // Update smoke
    for (let i = this._smokeParticles.length - 1; i >= 0; i--) {
      const sp = this._smokeParticles[i];
      sp.mesh.position.y += sp.vy * dt;
      // Drift with wind direction
      sp.mesh.position.x += Math.cos(state.windAngle) * state.windStrength * 0.3 * dt + Math.sin(t * 2 + i) * 0.02;
      sp.mesh.position.z += Math.sin(state.windAngle) * state.windStrength * 0.3 * dt;
      sp.mesh.scale.addScalar(dt * 0.3);
      sp.life -= dt;
      const mat = sp.mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = Math.max(0, sp.life * 0.1);
      if (sp.life <= 0) {
        this._scene.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        mat.dispose();
        this._smokeParticles.splice(i, 1);
      }
    }

    // --- Update magic orbs ---
    for (let i = 0; i < this._orbMeshes.length && i < state.orbs.length; i++) {
      const orb = state.orbs[i];
      const mesh = this._orbMeshes[i];
      mesh.position.set(orb.position.x, orb.position.y + Math.sin(t * 2 + orb.phase) * 0.5, orb.position.z);
      mesh.rotation.y = t * 2 + orb.phase;
      const mat = mesh.material as THREE.ShaderMaterial;
      mat.uniforms.time.value = t;
      mat.uniforms.collected.value = orb.collected ? 1 : 0;
      // Spawn particles on newly collected orbs
      if (orb.collected && mesh.visible) {
        for (let sp = 0; sp < 10; sp++) {
          const sMat = new THREE.MeshStandardMaterial({
            color: 0x4488ff, emissive: 0x2266dd, emissiveIntensity: 0.8,
            transparent: true, opacity: 0.8,
          });
          const spark = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), sMat);
          spark.position.copy(mesh.position);
          this._scene.add(spark);
          this._spellParticles.push({
            mesh: spark,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 6 + 2,
            vz: (Math.random() - 0.5) * 8,
            life: 0.8,
          });
        }
        mesh.visible = false;
      }
    }

    // --- Update NPCs ---
    for (let i = 0; i < this._npcGroups.length && i < state.npcs.length; i++) {
      const npc = state.npcs[i];
      const group = this._npcGroups[i];
      group.visible = true;
      group.position.set(npc.position.x, npc.position.y, npc.position.z);
      // Face movement direction
      const dx2 = npc.targetX - npc.position.x;
      const dz2 = npc.targetZ - npc.position.z;
      group.rotation.y = Math.atan2(dx2, dz2);
      // Look up at eagle if nearby
      const headMesh = group.getObjectByName("head");
      if (headMesh) {
        headMesh.rotation.x = npc.lookingUp ? -0.5 : 0;
      }
      // Walk animation — bob up and down
      const walkPhase = t * npc.speed * 3 + i;
      group.position.y = npc.position.y + Math.abs(Math.sin(walkPhase)) * 0.05;
    }

    // --- Spell effects ---
    // Firework (spell 1) — spawn burst particles when cooldown just started
    if (p.spellCooldowns[0] > 2.8 && p.spellCooldowns[0] < 3) {
      for (let fw = 0; fw < 30; fw++) {
        const colors = [0xff4444, 0xffaa22, 0x228833, 0x4444ff, 0xff44ff, 0xffff44];
        const fwColor = colors[Math.floor(Math.random() * colors.length)];
        const fwMat = new THREE.MeshStandardMaterial({
          color: fwColor, emissive: fwColor, emissiveIntensity: 0.6,
          transparent: true, opacity: 1.0,
        });
        const particle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), fwMat);
        particle.position.set(p.position.x, p.position.y + 5, p.position.z);
        this._scene.add(particle);
        const angle = Math.random() * Math.PI * 2;
        const upV = 5 + Math.random() * 10;
        const outV = 3 + Math.random() * 5;
        this._spellParticles.push({
          mesh: particle,
          vx: Math.cos(angle) * outV,
          vy: upV,
          vz: Math.sin(angle) * outV,
          life: 1.5 + Math.random(),
        });
      }
    }

    // Lightning (spell 2) — flash + bolt meshes when cooldown just started
    if (p.spellCooldowns[1] > 4.7 && p.spellCooldowns[1] < 5) {
      // Screen flash
      this._ambientLight.intensity = 3;
      setTimeout(() => { this._ambientLight.intensity = 0.5; }, 100);
      // Lightning bolt line
      const boltGeo = new THREE.BufferGeometry();
      const boltPts: number[] = [];
      let bx = p.position.x;
      let by = p.position.y;
      let bz = p.position.z;
      for (let seg = 0; seg < 12; seg++) {
        boltPts.push(bx, by, bz);
        bx += (Math.random() - 0.5) * 6;
        by -= 5;
        bz += (Math.random() - 0.5) * 6;
      }
      boltGeo.setAttribute("position", new THREE.Float32BufferAttribute(boltPts, 3));
      const boltMat = new THREE.LineBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.9 });
      const bolt = new THREE.Line(boltGeo, boltMat);
      this._scene.add(bolt);
      // Remove after 300ms
      setTimeout(() => { this._scene.remove(bolt); boltGeo.dispose(); boltMat.dispose(); }, 300);
    }

    // Magic trail (spell 3) — persistent colored ribbon
    if (p.magicTrailActive && this._magicTrailMesh) {
      for (let i = this._magicTrailPoints.length - 1; i > 0; i--) {
        this._magicTrailPoints[i].copy(this._magicTrailPoints[i - 1]);
      }
      this._magicTrailPoints[0].set(p.position.x, p.position.y, p.position.z);
      const mtPos = this._magicTrailMesh.geometry.getAttribute("position");
      const mtCol = this._magicTrailMesh.geometry.getAttribute("color");
      let drawCount = 0;
      for (let i = 0; i < this._magicTrailPoints.length; i++) {
        mtPos.setXYZ(i, this._magicTrailPoints[i].x, this._magicTrailPoints[i].y, this._magicTrailPoints[i].z);
        const fade = 1 - i / this._magicTrailPoints.length;
        // Rainbow color cycling
        const hue = (t * 0.5 + i * 0.02) % 1;
        const r = Math.abs(hue * 6 - 3) - 1;
        const g = 2 - Math.abs(hue * 6 - 2);
        const b = 2 - Math.abs(hue * 6 - 4);
        mtCol.setXYZ(i,
          Math.max(0, Math.min(1, r)) * fade,
          Math.max(0, Math.min(1, g)) * fade,
          Math.max(0, Math.min(1, b)) * fade,
        );
        if (i > 0 && this._magicTrailPoints[i].distanceTo(this._magicTrailPoints[0]) < 0.01) break;
        drawCount++;
      }
      mtPos.needsUpdate = true;
      mtCol.needsUpdate = true;
      this._magicTrailMesh.geometry.setDrawRange(0, drawCount);
    }

    // Update spell particles (firework, orb, etc.)
    for (let i = this._spellParticles.length - 1; i >= 0; i--) {
      const sp = this._spellParticles[i];
      sp.mesh.position.x += sp.vx * dt;
      sp.mesh.position.y += sp.vy * dt;
      sp.mesh.position.z += sp.vz * dt;
      sp.vy -= 6 * dt; // gravity
      sp.life -= dt;
      const sMat = sp.mesh.material as THREE.MeshStandardMaterial;
      sMat.opacity = Math.max(0, sp.life);
      sp.mesh.scale.setScalar(Math.max(0.1, sp.life));
      if (sp.life <= 0) {
        this._scene.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        sMat.dispose();
        this._spellParticles.splice(i, 1);
      }
    }

    // --- Day/night cycle lighting ---
    const sunY = Math.sin(state.sunAngle);
    const sunX = Math.cos(state.sunAngle) * 0.5;
    const daylight = Math.max(0, sunY); // 0 at night, 1 at noon
    // Sun position follows player
    this._sunLight.position.set(
      p.position.x + sunX * 100,
      sunY * 120 + 10,
      p.position.z - 60,
    );
    this._sunLight.target.position.set(p.position.x, 0, p.position.z);
    this._sunLight.intensity = 0.2 + daylight * 1.6;
    this._ambientLight.intensity = Math.max(this._ambientLight.intensity, 0.1 + daylight * 0.3);
    // Realistic sun color: warm white at noon, deep orange at dawn/dusk, cool at night
    const duskFactor = Math.max(0, 1 - Math.abs(sunY) * 4);
    const dawnGlow = duskFactor * duskFactor; // quadratic for richer sunsets
    const sunR = 1.0;
    const sunG = 0.9 + daylight * 0.1 - dawnGlow * 0.35;
    const sunB = 0.75 + daylight * 0.25 - dawnGlow * 0.55;
    this._sunLight.color.setRGB(sunR, Math.max(0.4, sunG), Math.max(0.2, sunB));
    // Fog color: blueish by day, warm orange at dusk, dark blue at night
    const fogR = 0.55 + daylight * 0.25 + dawnGlow * 0.2;
    const fogG = 0.60 + daylight * 0.2 - dawnGlow * 0.05;
    const fogB = 0.72 + daylight * 0.12 - dawnGlow * 0.15;
    (this._scene.fog as THREE.FogExp2).color.setRGB(fogR, fogG, fogB);
    // Sky shader uniforms update for time-of-day
    if (this._skyMesh) {
      const skyMat = this._skyMesh.material as THREE.ShaderMaterial;
      skyMat.uniforms.sunDir.value.set(sunX, sunY, -0.4).normalize();
      skyMat.uniforms.time.value = t;
      // Shift sky colors with daylight
      skyMat.uniforms.topColor.value.setRGB(
        0.04 + daylight * 0.04,
        0.08 + daylight * 0.1,
        0.2 + daylight * 0.1,
      );
      skyMat.uniforms.horizonColor.value.setRGB(
        0.6 + daylight * 0.2 + dawnGlow * 0.2,
        0.65 + daylight * 0.2 - dawnGlow * 0.1,
        0.75 + daylight * 0.15 - dawnGlow * 0.2,
      );
    }
    // Torch lights brighten at night
    const nightFactor = 1 - daylight;
    for (const tl of this._torchLights) {
      tl.intensity = (tl.intensity * 0.3) + nightFactor * 1.5 + 0.3;
    }
    // Exposure adapts to lighting conditions
    const duskExposure = dawnGlow * 0.15; // slightly brighter during golden hour

    // --- Update checkpoint rings ---
    for (let i = 0; i < this._checkpointMeshes.length && i < state.checkpoints.length; i++) {
      const cp = state.checkpoints[i];
      const ring = this._checkpointMeshes[i];
      ring.position.set(cp.position.x, cp.position.y, cp.position.z);
      const mat = ring.material as THREE.ShaderMaterial;
      mat.uniforms.time.value = t;
      // Detect newly collected (was not collected, now is)
      if (cp.collected && mat.uniforms.collected.value < 0.5) {
        // Spawn celebration particles
        for (let sp = 0; sp < 20; sp++) {
          const sparkMat = new THREE.MeshStandardMaterial({
            color: 0x229966,
            emissive: 0x116633,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9,
          });
          const spark = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random() * 0.15, 12, 10), sparkMat);
          spark.position.set(cp.position.x, cp.position.y, cp.position.z);
          this._scene.add(spark);
          this._collectParticles.push({
            mesh: spark,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 10 + 3,
            vz: (Math.random() - 0.5) * 15,
            life: 1.0 + Math.random() * 0.5,
          });
        }
      }
      mat.uniforms.collected.value = cp.collected ? 1 : 0;
      if (!cp.collected) {
        ring.position.y += Math.sin(t * 1.5 + i) * 0.5;
        ring.rotation.z = Math.sin(t * 0.5 + i * 0.7) * 0.15;
      }
    }

    // Update collection particles
    for (let i = this._collectParticles.length - 1; i >= 0; i--) {
      const cp2 = this._collectParticles[i];
      cp2.mesh.position.x += cp2.vx * dt;
      cp2.mesh.position.y += cp2.vy * dt;
      cp2.mesh.position.z += cp2.vz * dt;
      cp2.vy -= 8 * dt; // gravity
      cp2.life -= dt;
      const cpMat = cp2.mesh.material as THREE.MeshStandardMaterial;
      cpMat.opacity = Math.max(0, cp2.life);
      cp2.mesh.scale.setScalar(cp2.life);
      if (cp2.life <= 0) {
        this._scene.remove(cp2.mesh);
        cp2.mesh.geometry.dispose();
        cpMat.dispose();
        this._collectParticles.splice(i, 1);
      }
    }

    // --- Near-ground dust kick-up ---
    if (state.nearGround && Math.random() < dt * 12) {
      const dustMat = new THREE.MeshStandardMaterial({
        color: 0xbbaa88,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      });
      const dust = new THREE.Mesh(new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 16, 12), dustMat);
      dust.position.set(
        p.position.x + (Math.random() - 0.5) * 4,
        0.5 + Math.random() * 1,
        p.position.z + (Math.random() - 0.5) * 4,
      );
      this._scene.add(dust);
      this._groundEffectParticles.push({ mesh: dust, vy: 1 + Math.random() * 2, life: 1.5 + Math.random() });
    }

    // --- Water spray when near river ---
    if (state.nearWater && Math.random() < dt * 15) {
      const sprayMat = new THREE.MeshStandardMaterial({
        color: 0xaaddff,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      });
      const spray = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.2, 16, 12), sprayMat);
      spray.position.set(
        p.position.x + (Math.random() - 0.5) * 3,
        0.3 + Math.random() * 0.5,
        p.position.z + (Math.random() - 0.5) * 3,
      );
      this._scene.add(spray);
      this._groundEffectParticles.push({ mesh: spray, vy: 2 + Math.random() * 3, life: 0.8 + Math.random() * 0.5 });
    }

    // Update ground effect particles
    for (let i = this._groundEffectParticles.length - 1; i >= 0; i--) {
      const gep = this._groundEffectParticles[i];
      gep.mesh.position.y += gep.vy * dt;
      gep.mesh.scale.addScalar(dt * 0.8);
      gep.life -= dt;
      const gMat = gep.mesh.material as THREE.MeshStandardMaterial;
      gMat.opacity = Math.max(0, gep.life * 0.2);
      if (gep.life <= 0) {
        this._scene.remove(gep.mesh);
        gep.mesh.geometry.dispose();
        gMat.dispose();
        this._groundEffectParticles.splice(i, 1);
      }
    }

    // --- Update thermal shimmers ---
    for (const shimmer of this._thermalShimmers) {
      const sMat = shimmer.material as THREE.ShaderMaterial;
      sMat.uniforms.time.value = t;
    }

    // --- Photo mode: hide eagle at ultra-close distances, slow time feel ---
    // (Handled by HUD visibility toggle)

    // --- Dynamic fog density based on altitude ---
    // Thicker fog at low altitude, thinner high up
    const fogDensity = 0.0004 + Math.max(0, (50 - p.position.y) / 50) * 0.0006;
    (this._scene.fog as THREE.FogExp2).density = fogDensity;

    // --- Tone mapping exposure (altitude + time of day) ---
    const targetExposure = 0.9 + Math.min(0.25, p.position.y / 600) + duskExposure;
    this._renderer.toneMappingExposure += (targetExposure - this._renderer.toneMappingExposure) * 2 * dt;

    // --- Update dragons ---
    for (let di = 0; di < this._dragonGroups.length && di < state.dragons.length; di++) {
      const dragon = state.dragons[di];
      const dg = this._dragonGroups[di];
      dg.position.set(dragon.position.x, dragon.position.y, dragon.position.z);
      dg.rotation.y = dragon.yaw;
      // Gentle body undulation
      dg.rotation.x = Math.sin(t * 1.5) * 0.05;
      // Wing flap animation (find named wing groups)
      const wingL = dg.getObjectByName("wingL");
      const wingR = dg.getObjectByName("wingR");
      if (wingL) wingL.rotation.z = -(0.15 + Math.sin(t * 2.5) * 0.35);
      if (wingR) wingR.rotation.z = 0.15 + Math.sin(t * 2.5) * 0.35;
      // Fire breath visibility + animation
      const fire = dg.getObjectByName("fire");
      if (fire) {
        fire.visible = dragon.fireActive;
        if (dragon.fireActive) {
          // Pulsing fire scale
          const fireScale = 0.8 + Math.sin(t * 15) * 0.2;
          fire.scale.set(fireScale, fireScale, 1 + Math.sin(t * 8) * 0.15);
        }
      }
    }

    // --- Update bird flocks ---
    for (let fi = 0; fi < this._birdMeshes.length && fi < state.birdFlocks.length; fi++) {
      const flock = state.birdFlocks[fi];
      const meshes = this._birdMeshes[fi];
      for (let bi = 0; bi < meshes.length; bi++) {
        if (bi < flock.birds.length) {
          const bird = flock.birds[bi];
          meshes[bi].visible = true;
          meshes[bi].position.set(bird.x, bird.y, bird.z);
          // Face movement direction when scattered
          if (flock.scattered && (bird.vx !== 0 || bird.vz !== 0)) {
            meshes[bi].rotation.y = Math.atan2(bird.vx, bird.vz);
          }
          // Wing flap animation
          const bGroup = meshes[bi] as unknown as THREE.Group;
          if (bGroup.children) {
            const bwL = bGroup.getObjectByName("bwL");
            const bwR = bGroup.getObjectByName("bwR");
            const flapSpeed = flock.scattered ? 18 : 8;
            const flapAmp = flock.scattered ? 0.6 : 0.3;
            if (bwL) bwL.rotation.z = -Math.sin(t * flapSpeed + bi * 1.3) * flapAmp;
            if (bwR) bwR.rotation.z = Math.sin(t * flapSpeed + bi * 1.3) * flapAmp;
          }
        } else {
          meshes[bi].visible = false;
        }
      }
    }

    // --- Weather fog density ---
    if (state.weather === "fog") {
      this._weatherFogDensity += (0.003 - this._weatherFogDensity) * dt;
    } else if (state.weather === "storm") {
      this._weatherFogDensity += (0.0015 - this._weatherFogDensity) * dt;
    } else if (state.weather === "rain") {
      this._weatherFogDensity += (0.001 - this._weatherFogDensity) * dt;
    } else {
      this._weatherFogDensity += (0 - this._weatherFogDensity) * dt * 0.5;
    }
    const baseFog = fogDensity;
    (this._scene.fog as THREE.FogExp2).density = baseFog + this._weatherFogDensity;

    // --- Lightning scorch mark ---
    if (state.lightningStrikePos && state.lightningTimer > 2.5) {
      const sx = state.lightningStrikePos.x;
      const sy = state.lightningStrikePos.y;
      const sz = state.lightningStrikePos.z;
      // Main scorch circle (dark burn)
      const scorchMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a0a, transparent: true, opacity: 0.7, depthWrite: false,
      });
      const scR = 2 + Math.random() * 2;
      const scorch = new THREE.Mesh(new THREE.CircleGeometry(scR, 16), scorchMat);
      scorch.position.set(sx, sy + 0.1, sz);
      scorch.rotation.x = -Math.PI / 2;
      this._scene.add(scorch);
      this._scorchMeshes.push(scorch);
      // Charred ring around scorch
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x332211, transparent: true, opacity: 0.5, depthWrite: false,
      });
      const scorchRing = new THREE.Mesh(new THREE.RingGeometry(scR, scR + 0.8, 16), ringMat);
      scorchRing.position.set(sx, sy + 0.08, sz);
      scorchRing.rotation.x = -Math.PI / 2;
      this._scene.add(scorchRing);
      this._scorchMeshes.push(scorchRing);
      // Lightning branching lines radiating outward
      for (let lb = 0; lb < 5; lb++) {
        const lbAngle = Math.random() * Math.PI * 2;
        const lbLen = 1.5 + Math.random() * 3;
        const lbMat = new THREE.MeshStandardMaterial({
          color: 0x221100, transparent: true, opacity: 0.5, depthWrite: false,
        });
        const lbMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, lbLen), lbMat);
        lbMesh.position.set(
          sx + Math.cos(lbAngle) * (scR + lbLen / 2),
          sy + 0.09,
          sz + Math.sin(lbAngle) * (scR + lbLen / 2),
        );
        lbMesh.rotation.y = -lbAngle + Math.PI / 2;
        this._scene.add(lbMesh);
        this._scorchMeshes.push(lbMesh);
      }
      // Embers/glow (fading point light)
      const emberLight = new THREE.PointLight(0xff4400, 3, 8);
      emberLight.position.set(sx, sy + 1, sz);
      this._scene.add(emberLight);
      // Fade ember after 2 seconds
      setTimeout(() => { this._scene.remove(emberLight); }, 2000);
      // Keep max 30 scorch elements (10 strikes worth)
      while (this._scorchMeshes.length > 30) {
        const old = this._scorchMeshes.shift()!;
        this._scene.remove(old);
        old.geometry.dispose();
        (old.material as THREE.Material).dispose();
      }
    }

    // --- Landing animation: flare eagle wings + tail ---
    if (state.isLanding && state.landingTimer > 0.3) {
      const flareAmount = state.landingTimer * 0.4;
      if (this._eagleWingL) {
        this._eagleWingL.rotation.z = -(0.3 + flareAmount);
      }
      if (this._eagleWingR) {
        this._eagleWingR.rotation.z = 0.3 + flareAmount;
      }
      // Fan tail feathers on landing
      if (this._eagleTail) {
        this._eagleTail.rotation.x = -0.2 * state.landingTimer;
      }
    }

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
    // Dispose all Three.js resources in the scene
    this._scene.traverse((obj) => {
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) {
        const mat = (obj as any).material;
        if (Array.isArray(mat)) {
          for (const m of mat) { if (m.map) m.map.dispose(); m.dispose(); }
        } else {
          if (mat.map) mat.map.dispose();
          mat.dispose();
        }
      }
    });
    this._scene.clear();

    this._renderer.dispose();
    if (this._canvas.parentElement) {
      this._canvas.parentElement.removeChild(this._canvas);
    }
  }
}
