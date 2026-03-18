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

    // Scene — subtle blue-tinted atmospheric fog
    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(0xc0d4e8, 0.0014);

    // Camera
    this._camera = new THREE.PerspectiveCamera(65, sw / sh, 0.5, 800);
    this._camera.position.set(0, 70, -100);
    this._camera.lookAt(0, 40, 0);
    this._camPos.copy(this._camera.position);
    this._camTarget.set(0, 40, 0);

    this._buildLighting();
    this._buildSky();
    this._buildGodRays();
    this._buildTerrain();
    this._buildRiver();
    this._buildCityWalls();
    this._buildCastle();
    this._buildCity();
    this._buildOutskirts();
    this._buildClouds();
    this._buildPlayer();
    this._buildDustParticles();
    this._buildBirds();
    this._buildEagleTrail();
    this._buildGroundFog();
    this._buildLensFlare();
  }

  // ---------------------------------------------------------------------------
  // Lighting
  // ---------------------------------------------------------------------------

  private _buildLighting(): void {
    // Warm ambient for golden-hour feel
    this._ambientLight = new THREE.AmbientLight(0x8899bb, 0.5);
    this._scene.add(this._ambientLight);

    // Main sun — warm directional with high-quality shadows
    this._sunLight = new THREE.DirectionalLight(0xffeedd, 1.6);
    this._sunLight.position.set(80, 120, -60);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(4096, 4096);
    this._sunLight.shadow.camera.near = 1;
    this._sunLight.shadow.camera.far = 400;
    this._sunLight.shadow.camera.left = -150;
    this._sunLight.shadow.camera.right = 150;
    this._sunLight.shadow.camera.top = 150;
    this._sunLight.shadow.camera.bottom = -150;
    this._sunLight.shadow.bias = -0.0005;
    this._sunLight.shadow.normalBias = 0.02;
    this._scene.add(this._sunLight);
    this._scene.add(this._sunLight.target);

    // Hemisphere — sky blue to warm ground bounce
    const hemiLight = new THREE.HemisphereLight(0x8ab4e8, 0x6a7a44, 0.55);
    this._scene.add(hemiLight);

    // Warm fill from opposite side of sun
    const fillLight = new THREE.DirectionalLight(0xffd4aa, 0.35);
    fillLight.position.set(-60, 40, 80);
    this._scene.add(fillLight);

    // Cool rim light from behind for dramatic edge
    const rimLight = new THREE.DirectionalLight(0x99aacc, 0.25);
    rimLight.position.set(0, 30, 100);
    this._scene.add(rimLight);
  }

  // ---------------------------------------------------------------------------
  // Sky — shader sphere
  // ---------------------------------------------------------------------------

  private _buildSky(): void {
    const skyGeo = new THREE.SphereGeometry(400, 48, 24);
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

          // Multi-band sky gradient
          vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.25, h));
          col = mix(col, topColor, smoothstep(0.25, 0.75, h));

          // Warm horizon band
          float horizonBand = exp(-pow((h - 0.48) * 8.0, 2.0));
          col = mix(col, vec3(0.95, 0.85, 0.7), horizonBand * 0.3);

          // Sun disc + glow
          float sunDot = max(dot(dir, sunDir), 0.0);
          col += sunColor * pow(sunDot, 400.0) * 4.0;  // sharp core
          col += sunColor * pow(sunDot, 80.0) * 1.0;   // inner glow
          col += sunColor * pow(sunDot, 12.0) * 0.2;   // outer glow
          col += vec3(1.0, 0.7, 0.4) * pow(sunDot, 3.0) * 0.08; // atmospheric scatter

          // Horizon haze
          float haze = 1.0 - smoothstep(0.0, 0.15, abs(dir.y));
          col = mix(col, vec3(0.82, 0.87, 0.92), haze * 0.4);

          // Animated procedural cirrus clouds
          vec2 cloudUV = dir.xz / max(dir.y, 0.01) * 3.0;
          float cirrus = fbm(cloudUV + time * 0.02);
          cirrus = smoothstep(0.4, 0.7, cirrus);
          cirrus *= smoothstep(0.5, 0.65, h) * (1.0 - smoothstep(0.7, 0.9, h));
          // Lit by sun
          float cirrusLit = 0.9 + pow(sunDot, 2.0) * 0.15;
          col = mix(col, vec3(0.95, 0.93, 0.9) * cirrusLit, cirrus * 0.2);

          // Second cloud layer (lower altitude wisps)
          float wisps = fbm(cloudUV * 0.5 - time * 0.015);
          wisps = smoothstep(0.45, 0.65, wisps);
          wisps *= smoothstep(0.35, 0.5, h) * (1.0 - smoothstep(0.55, 0.7, h));
          col = mix(col, vec3(0.92, 0.9, 0.88), wisps * 0.12);

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
    const groundGeo = new THREE.PlaneGeometry(800, 800, 160, 160);
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

    // Procedural terrain shader — blends grass/dirt/rock by height + slope
    const terrainMat = new THREE.ShaderMaterial({
      lights: true,
      uniforms: {
        ...THREE.UniformsLib.lights,
        ...THREE.UniformsLib.fog,
        grassColor: { value: new THREE.Color(0x4a7a3a) },
        grassColor2: { value: new THREE.Color(0x5a9a4a) },
        dirtColor: { value: new THREE.Color(0x6a5a3a) },
        rockColor: { value: new THREE.Color(0x7a7a6a) },
        pathColor: { value: new THREE.Color(0x8a7a6a) },
      },
      vertexShader: `
        #include <common>
        #include <fog_pars_vertex>
        #include <shadowmap_pars_vertex>
        attribute float aSlope;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vSlope;
        varying float vHeight;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vNormal = normalize(normalMatrix * normal);
          vSlope = aSlope;
          vHeight = position.y;
          gl_Position = projectionMatrix * viewMatrix * wp;
          #include <fog_vertex>
          #include <shadowmap_vertex>
        }
      `,
      fragmentShader: `
        #include <common>
        #include <packing>
        #include <fog_pars_fragment>
        #include <lights_pars_begin>
        #include <shadowmap_pars_fragment>
        #include <shadowmask_pars_fragment>
        uniform vec3 grassColor;
        uniform vec3 grassColor2;
        uniform vec3 dirtColor;
        uniform vec3 rockColor;
        uniform vec3 pathColor;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vSlope;
        varying float vHeight;

        // Simple noise
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          // Procedural noise for texture variation
          float n1 = noise(vWorldPos.xz * 0.15);
          float n2 = noise(vWorldPos.xz * 0.5);
          float n3 = noise(vWorldPos.xz * 2.0);
          float detailNoise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

          // Grass blend between two tones
          vec3 grass = mix(grassColor, grassColor2, detailNoise);

          // Dirt on slopes and paths
          float slopeFactor = smoothstep(0.15, 0.4, vSlope);
          vec3 col = mix(grass, dirtColor, slopeFactor);

          // Rock on steep slopes
          float rockFactor = smoothstep(0.35, 0.6, vSlope);
          col = mix(col, rockColor, rockFactor);

          // City center path area
          float dist = length(vWorldPos.xz);
          float cityMask = 1.0 - smoothstep(75.0, 90.0, dist);
          col = mix(col, pathColor, cityMask * 0.6);

          // Height-based darkening in low areas (near water)
          float lowMask = 1.0 - smoothstep(-1.0, 2.0, vHeight);
          col = mix(col, dirtColor * 0.7, lowMask * 0.4);

          // Subtle grass stripe pattern
          float stripes = sin(vWorldPos.x * 1.5 + vWorldPos.z * 0.8) * 0.5 + 0.5;
          stripes *= (1.0 - cityMask);
          col = mix(col, col * 1.08, stripes * 0.15 * (1.0 - slopeFactor));

          // Lighting
          vec3 lightDir = normalize(vec3(0.3, 0.55, -0.4));
          float NdotL = max(dot(vNormal, lightDir), 0.0);
          float shadow = getShadowMask();
          vec3 ambient = col * 0.35;
          vec3 diffuse = col * NdotL * 1.2 * shadow;

          // Subsurface scattering hint for grass
          float sss = pow(max(dot(vNormal, -lightDir), 0.0), 3.0) * 0.08;
          vec3 sssColor = grass * sss * (1.0 - slopeFactor);

          vec3 finalColor = ambient + diffuse + sssColor;

          gl_FragColor = vec4(finalColor, 1.0);
          #include <fog_fragment>
        }
      `,
      fog: true,
    });
    const ground = new THREE.Mesh(groundGeo, terrainMat);
    ground.receiveShadow = true;
    this._terrainGroup.add(ground);

    // Cobblestone area — procedural pattern
    const cobbleGeo = new THREE.PlaneGeometry(180, 180, 1, 1);
    cobbleGeo.rotateX(-Math.PI / 2);
    const cobbleMat = new THREE.ShaderMaterial({
      uniforms: {
        ...THREE.UniformsLib.fog,
      },
      vertexShader: `
        #include <fog_pars_vertex>
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
          #include <fog_vertex>
        }
      `,
      fragmentShader: `
        #include <fog_pars_fragment>
        varying vec2 vUv;
        varying vec3 vWorldPos;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        void main() {
          // Procedural cobblestone pattern
          vec2 cell = floor(vWorldPos.xz * 0.8);
          float h = hash(cell);
          float edge = smoothstep(0.0, 0.08, fract(vWorldPos.x * 0.8)) *
                       smoothstep(0.0, 0.08, fract(vWorldPos.z * 0.8));
          vec3 stoneBase = vec3(0.48, 0.44, 0.38);
          vec3 col = stoneBase + (h - 0.5) * 0.12;
          col = mix(col * 0.7, col, edge); // darken mortar lines
          // Worn center path
          float center = 1.0 - smoothstep(0.0, 40.0, length(vWorldPos.xz));
          col = mix(col, col * 0.9, center * 0.2);
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
        }
      `,
      fog: true,
    });
    const cobble = new THREE.Mesh(cobbleGeo, cobbleMat);
    cobble.position.y = 0.06;
    cobble.receiveShadow = true;
    this._terrainGroup.add(cobble);

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
      if (Math.abs(gz + 15) < 20 && dist < 200) continue;
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
  // River — winding through the city
  // ---------------------------------------------------------------------------

  private _buildRiver(): void {
    const shape = new THREE.Shape();
    shape.moveTo(-400, -30);
    shape.bezierCurveTo(-200, -50, -80, 20, 0, 10);
    shape.bezierCurveTo(80, 0, 150, -40, 400, -20);
    shape.lineTo(400, -10);
    shape.bezierCurveTo(150, -30, 80, 10, 0, 20);
    shape.bezierCurveTo(-80, 30, -200, -40, -400, -20);
    shape.closePath();

    const riverGeo = new THREE.ShapeGeometry(shape, 48);
    riverGeo.rotateX(-Math.PI / 2);

    // Advanced water shader with Fresnel, flow, depth, caustics
    this._waterUniforms = { time: { value: 0 } };
    const riverMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        time: this._waterUniforms.time,
        waterColor: { value: new THREE.Color(0x1a4488) },
        shallowColor: { value: new THREE.Color(0x3388aa) },
        foamColor: { value: new THREE.Color(0xaaccdd) },
        deepColor: { value: new THREE.Color(0x061833) },
        skyColor: { value: new THREE.Color(0x88bbee) },
        sunDir: { value: new THREE.Vector3(0.3, 0.55, -0.4).normalize() },
        sunColor: { value: new THREE.Color(0xfffbe8) },
        camPos: { value: new THREE.Vector3() },
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        uniform vec3 camPos;
        void main() {
          vUv = uv;
          vec3 pos = position;
          // Multi-frequency wave displacement
          pos.y += sin(pos.x * 0.3 + time * 1.8) * 0.18;
          pos.y += cos(pos.z * 0.4 + time * 1.4) * 0.12;
          pos.y += sin(pos.x * 0.8 - time * 2.2) * 0.06;
          pos.y += cos(pos.z * 1.2 + time * 1.0) * 0.04;
          // Compute perturbed normal for wave shading
          float dx = cos(pos.x * 0.3 + time * 1.8) * 0.3 * 0.18
                   + cos(pos.x * 0.8 - time * 2.2) * 0.8 * 0.06;
          float dz = -sin(pos.z * 0.4 + time * 1.4) * 0.4 * 0.12
                   - sin(pos.z * 1.2 + time * 1.0) * 1.2 * 0.04;
          vNormal = normalize(vec3(-dx, 1.0, -dz));
          vec4 wp = modelMatrix * vec4(pos, 1.0);
          vWorldPos = wp.xyz;
          vViewDir = normalize(camPos - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 waterColor;
        uniform vec3 shallowColor;
        uniform vec3 foamColor;
        uniform vec3 deepColor;
        uniform vec3 skyColor;
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec3 vViewDir;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
        }

        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewDir);

          // Fresnel — more reflection at glancing angles
          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.0);
          fresnel = clamp(fresnel, 0.05, 0.85);

          // Water depth approximation (center is deeper)
          float depth = smoothstep(0.0, 0.1, vUv.y) * smoothstep(0.0, 0.1, 1.0 - vUv.y);
          vec3 baseWater = mix(shallowColor, deepColor, depth * 0.8);

          // Animated caustics
          float c1 = noise(vWorldPos.xz * 1.5 + time * vec2(0.8, 0.6));
          float c2 = noise(vWorldPos.xz * 2.5 - time * vec2(0.6, 0.9));
          float caustic = pow(abs(c1 * c2), 0.6) * 0.25;
          baseWater += caustic * vec3(0.3, 0.5, 0.7);

          // Flow-direction ripples
          float flow = noise(vWorldPos.xz * 0.3 + vec2(time * 0.5, 0.0));
          baseWater += flow * 0.03;

          // Reflection (fake sky + sun)
          vec3 reflDir = reflect(-V, N);
          float skyRefl = max(reflDir.y, 0.0);
          vec3 reflColor = mix(vec3(0.6, 0.7, 0.8), skyColor, skyRefl);

          // Sun specular highlight
          vec3 H = normalize(sunDir + V);
          float spec = pow(max(dot(N, H), 0.0), 256.0);
          float specWide = pow(max(dot(N, H), 0.0), 32.0);
          reflColor += sunColor * spec * 3.0;
          reflColor += sunColor * specWide * 0.15;

          // Blend base water with reflection via Fresnel
          vec3 col = mix(baseWater, reflColor, fresnel);

          // Foam at edges
          float foam = 1.0 - smoothstep(0.0, 0.06, vUv.y) * smoothstep(0.0, 0.06, 1.0 - vUv.y);
          float foamNoise = noise(vWorldPos.xz * 4.0 + time * vec2(1.5, 0.8));
          foam = max(foam, foamNoise * 0.15 * (1.0 - depth));
          col = mix(col, foamColor, foam * 0.7);

          gl_FragColor = vec4(col, 0.82 + fresnel * 0.1);
        }
      `,
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

      // Torch on every other tower
      if (i % 2 === 0) {
        const tl = new THREE.PointLight(0xff8833, 1.2, 20);
        tl.position.set(tx, towerHeight + 1, tz);
        this._wallsGroup.add(tl);
        this._torchLights.push(tl);
        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.25, 4, 3), torchFireMat);
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

    // --- Castle moat ---
    const moatGeo = new THREE.TorusGeometry(34, 3, 6, 32);
    const moatMat = new THREE.MeshStandardMaterial({
      color: 0x1a4466,
      roughness: 0.2,
      metalness: 0.2,
      transparent: true,
      opacity: 0.7,
    });
    const moat = new THREE.Mesh(moatGeo, moatMat);
    moat.rotation.x = -Math.PI / 2;
    moat.position.set(0, 0.1, 0);
    this._castleGroup.add(moat);

    // --- Drawbridge over moat (south side) ---
    const drawbridgeMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.9 });
    const drawbridge = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 8), drawbridgeMat);
    drawbridge.position.set(0, 1, -34);
    this._castleGroup.add(drawbridge);
    // Chains
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.3 });
    for (const side of [-1, 1]) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 4), chainMat);
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
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.25, 5, 4), flowerMat);
        flower.position.set(
          gp.x + (gardenRng() - 0.5) * 6,
          3.6,
          gp.z + (gardenRng() - 0.5) * 4,
        );
        this._castleGroup.add(flower);
        // Stem
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 0.4, 3),
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
      const torchFlame = new THREE.Mesh(new THREE.SphereGeometry(0.3, 5, 4), torchMat);
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

    // Street-level props for lived-in feel
    this._buildStreetProps();

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
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 4, 5), lampMat);
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
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 3), lampGlowMat);
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
        new THREE.CylinderGeometry(0.4, 0.45, 0.9, 8),
        darkWoodMat,
      );
      barrel.position.set(bx, 0.45, bz);
      this._cityGroup.add(barrel);
      // Metal band
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.03, 4, 8),
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
        new THREE.CylinderGeometry(0.6, 0.6, 0.8, 8),
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
    const wellBody = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 1.5, 10), wellMat);
    wellBody.position.set(15, 0.75, -15);
    this._cityGroup.add(wellBody);
    const wellRoof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.5, 6), woodMat);
    wellRoof.position.set(15, 3, -15);
    this._cityGroup.add(wellRoof);
    // Well posts
    for (const side of [-1, 1]) {
      const wellPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 4), woodMat);
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
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 6, 12), darkWoodMat);
      wheel.position.set(side * 0.8, 0.5, 0.9);
      wheel.rotation.y = Math.PI / 2;
      cartGroup.add(wheel);
    }
    // Cargo (cloth sacks)
    for (let s = 0; s < 3; s++) {
      const sack = new THREE.Mesh(new THREE.SphereGeometry(0.3, 5, 4), clothMat);
      sack.position.set(-0.5 + s * 0.5, 1.2, 0);
      sack.scale.y = 0.7;
      cartGroup.add(sack);
    }
    // Handles
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 4), woodMat);
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
    const pineTrunkMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 });
    const leafMats = [
      new THREE.MeshStandardMaterial({ color: 0x337733, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x448833, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x558844, roughness: 0.8 }),
    ];
    const pineLeafMats = [
      new THREE.MeshStandardMaterial({ color: 0x224422, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x2a5522, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.8 }),
    ];

    // Mixed trees — deciduous and pine
    for (let i = 0; i < 400; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 95 + rng() * 220;
      const tx = Math.cos(angle) * dist;
      const tz = Math.sin(angle) * dist;
      if (Math.abs(tz + 15) < 15 && dist < 200) continue;

      const isPine = rng() > 0.6;
      const trunkH = isPine ? 5 + rng() * 6 : 3 + rng() * 5;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(isPine ? 0.2 : 0.3, isPine ? 0.35 : 0.5, trunkH, 5),
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
          const cone = new THREE.Mesh(new THREE.ConeGeometry(coneR, coneH, 6), pineMat);
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
          const leaves = new THREE.Mesh(new THREE.SphereGeometry(leafR, 7, 5), leafMat);
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
    for (let i = 0; i < 16; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 120 + rng() * 100;
      const fx = Math.cos(angle) * dist;
      const fz = Math.sin(angle) * dist;
      const fw = 15 + rng() * 25;
      const fd = 10 + rng() * 18;

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
      const dist = 130 + rng() * 80;
      const wx = Math.cos(angle) * dist;
      const wz = Math.sin(angle) * dist;
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
    for (let i = 0; i < 30; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 110 + rng() * 100;
      const sx = Math.cos(angle) * dist;
      const sz = Math.sin(angle) * dist;
      if (Math.abs(sz + 15) < 15) continue;

      const sheep = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 5), woolMat);
      body.position.y = 0.5;
      body.scale.set(1, 0.8, 1.3);
      sheep.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 4, 3), sheepFaceMat);
      head.position.set(0, 0.6, -0.6);
      sheep.add(head);
      // Legs
      for (const lx of [-0.25, 0.25]) {
        for (const lz of [-0.3, 0.3]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 3), sheepFaceMat);
          leg.position.set(lx, 0.1, lz);
          sheep.add(leg);
        }
      }
      sheep.position.set(sx, 0, sz);
      sheep.rotation.y = rng() * Math.PI * 2;
      this._terrainGroup.add(sheep);
    }

    // Flower meadows
    const flowerMeadowColors = [0xff6688, 0xffaa44, 0xaa66ff, 0xffff55, 0xff88cc, 0x66aaff];
    for (let i = 0; i < 8; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 100 + rng() * 120;
      const mx = Math.cos(angle) * dist;
      const mz = Math.sin(angle) * dist;
      for (let f = 0; f < 25; f++) {
        const fMat = new THREE.MeshStandardMaterial({
          color: flowerMeadowColors[Math.floor(rng() * flowerMeadowColors.length)],
          emissive: 0x221111,
          emissiveIntensity: 0.1,
        });
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.15 + rng() * 0.1, 4, 3), fMat);
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

    // Harbor/docks at river edge
    this._buildHarbor(-180, -25);

    // Windmills
    this._buildWindmill(140, -60);
    this._buildWindmill(-120, 90);
    this._buildWindmill(200, 50);
  }

  private _buildRuins(x: number, z: number, rng: () => number): void {
    const ruinMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.9 });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x556644, roughness: 0.95 });

    // Broken walls
    for (let i = 0; i < 6; i++) {
      const w = 3 + rng() * 5;
      const h = 2 + rng() * 4;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.8), rng() > 0.4 ? ruinMat : mossMat);
      wall.position.set(
        x + (rng() - 0.5) * 15,
        h / 2,
        z + (rng() - 0.5) * 15,
      );
      wall.rotation.y = rng() * Math.PI;
      wall.castShadow = true;
      this._terrainGroup.add(wall);
    }

    // Fallen column
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 4, 6), ruinMat);
    col.position.set(x + 3, 0.4, z - 2);
    col.rotation.z = Math.PI / 2 - 0.1;
    this._terrainGroup.add(col);

    // Standing column
    const standCol = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 5, 6), ruinMat);
    standCol.position.set(x - 4, 2.5, z + 3);
    standCol.castShadow = true;
    this._terrainGroup.add(standCol);
  }

  private _buildVillage(x: number, z: number, rng: () => number): void {
    const houseMats = [
      new THREE.MeshStandardMaterial({ color: 0xccbb88, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0xbbaa77, roughness: 0.85 }),
    ];
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x774433, roughness: 0.8 });

    for (let i = 0; i < 6; i++) {
      const hx = x + (rng() - 0.5) * 30;
      const hz = z + (rng() - 0.5) * 20;
      const hw = 3 + rng() * 3;
      const hh = 3 + rng() * 2;
      const hd = 3 + rng() * 3;
      const mat = houseMats[Math.floor(rng() * houseMats.length)];

      const body = new THREE.Mesh(new THREE.BoxGeometry(hw, hh, hd), mat);
      body.position.set(hx, hh / 2, hz);
      body.castShadow = true;
      this._terrainGroup.add(body);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(hw, hd) * 0.7, hh * 0.4, 4), roofMat);
      roof.position.set(hx, hh + hh * 0.2, hz);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      this._terrainGroup.add(roof);
    }
  }

  private _buildHarbor(x: number, z: number): void {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x443311, roughness: 0.9 });

    // Dock platform
    const dock = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 6), woodMat);
    dock.position.set(x, 1.5, z);
    dock.castShadow = true;
    this._terrainGroup.add(dock);

    // Dock pilings
    for (let i = -4; i <= 4; i++) {
      for (const side of [-1, 1]) {
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 3, 5), darkWoodMat);
        pile.position.set(x + i * 2.2, 0.5, z + side * 2.5);
        this._terrainGroup.add(pile);
      }
    }

    // Boats (simple)
    for (let i = 0; i < 3; i++) {
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 1.5), darkWoodMat);
      hull.position.y = 0.4;
      boat.add(hull);
      // Mast
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 4), woodMat);
      mast.position.y = 2;
      boat.add(mast);
      // Sail
      const sailMat = new THREE.MeshStandardMaterial({
        color: 0xeeddcc,
        roughness: 0.8,
        side: THREE.DoubleSide,
      });
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.2), sailMat);
      sail.position.set(0.5, 2.5, 0);
      boat.add(sail);

      boat.position.set(x + (i - 1) * 5, 0.3, z - 4);
      boat.rotation.y = 0.2 + i * 0.15;
      this._terrainGroup.add(boat);
    }

    // Mooring posts
    for (let i = 0; i < 4; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2, 4), woodMat);
      post.position.set(x - 8 + i * 5, 2, z + 2.8);
      this._terrainGroup.add(post);
    }
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

    // Blades hub
    const bladesHub = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const bladeArm = new THREE.Group();
      // Main blade arm
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 0.1), woodMat);
      blade.position.set(0, 4, 0);
      bladeArm.add(blade);
      // Sail cloth on blade
      const sailMat = new THREE.MeshStandardMaterial({
        color: 0xddccaa,
        roughness: 0.9,
        side: THREE.DoubleSide,
      });
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 6), sailMat);
      sail.position.set(1.3, 4, 0);
      bladeArm.add(sail);
      bladeArm.rotation.z = (i / 4) * Math.PI * 2;
      bladesHub.add(bladeArm);
    }
    bladesHub.position.set(0, 11, 3.5);
    group.add(bladesHub);
    this._windmillBladeGroups.push(bladesHub);

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
        const cx = (rng() - 0.5) * 600;
        const cy = layer.minY + rng() * (layer.maxY - layer.minY);
        const cz = (rng() - 0.5) * 600;

        const puffCount = layer.puffs[0] + Math.floor(rng() * (layer.puffs[1] - layer.puffs[0]));
        for (let p = 0; p < puffCount; p++) {
          const r = layer.radius[0] + rng() * (layer.radius[1] - layer.radius[0]);
          const puff = new THREE.Mesh(
            new THREE.SphereGeometry(r, 10, 7),
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
    const bodyGeo = new THREE.SphereGeometry(1.2, 12, 8);
    this._eagleBody = new THREE.Mesh(bodyGeo, featherMat);
    this._eagleBody.scale.set(1.1, 0.65, 2.0);
    this._eagleGroup.add(this._eagleBody);

    // Breast feathers (lighter)
    const breastGeo = new THREE.SphereGeometry(0.9, 8, 6);
    const breast = new THREE.Mesh(breastGeo, goldenFeatherMat);
    breast.scale.set(0.8, 0.5, 1.2);
    breast.position.set(0, -0.15, -0.5);
    this._eagleGroup.add(breast);

    // Head (white-feathered)
    this._eagleHead = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), whiteFeatherMat);
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
    const beakUpper = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 5), beakMat);
    beakUpper.position.set(0, 0.28, -2.5);
    beakUpper.rotation.x = Math.PI / 2 + 0.1;
    this._eagleGroup.add(beakUpper);
    const beakLower = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 4), beakMat);
    beakLower.position.set(0, 0.15, -2.35);
    beakLower.rotation.x = Math.PI / 2 - 0.15;
    this._eagleGroup.add(beakLower);

    // Eyes with iris
    for (const side of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), whiteFeatherMat);
      eyeWhite.position.set(side * 0.32, 0.42, -2.05);
      this._eagleGroup.add(eyeWhite);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), eyeIrisMat);
      iris.position.set(side * 0.35, 0.42, -2.12);
      this._eagleGroup.add(iris);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 3), eyeMat);
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
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 4), talonMat);
      leg.position.y = -0.3;
      legGroup.add(leg);
      // Toes
      for (let t = -1; t <= 1; t++) {
        const toe = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.35, 3), talonMat);
        toe.position.set(t * 0.1, -0.7, -0.1);
        toe.rotation.x = -0.3;
        legGroup.add(toe);
      }
      // Back toe
      const backToe = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 3), talonMat);
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
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), skinMat);
    head.position.set(0, 1.98, 0);
    this._merlinGroup.add(head);

    // Wizard hat — taller, slightly bent
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.0, 8), hatMat);
    hat.position.set(0, 2.6, 0);
    hat.rotation.z = 0.12;
    hat.rotation.x = -0.05;
    this._merlinGroup.add(hat);
    // Hat brim (wider)
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 10), hatMat);
    brim.position.set(0, 2.15, 0);
    this._merlinGroup.add(brim);
    // Stars on hat
    for (let i = 0; i < 3; i++) {
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), starMat);
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
    const beardMid = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 5), beardMat2);
    beardMid.position.set(0, 1.45, -0.25);
    beardMid.rotation.x = Math.PI;
    this._merlinGroup.add(beardMid);
    const beardTip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 4), beardMat2);
    beardTip.position.set(0, 1.15, -0.28);
    beardTip.rotation.x = Math.PI;
    this._merlinGroup.add(beardTip);

    // Staff (thicker, gnarled)
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.8, 6), staffMat);
    staff.position.set(0.5, 1.9, -0.2);
    staff.rotation.z = -0.25;
    staff.rotation.x = 0.15;
    this._merlinGroup.add(staff);
    // Staff knot
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), staffMat);
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
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), skinMat);
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
    const count = 800;
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
    const birdMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const rng = seededRandom(444);

    for (let i = 0; i < 8; i++) {
      const birdGroup = new THREE.Group();
      // Simple bird shape: body + 2 wings
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 4, 3), birdMat);
      body.scale.set(1, 0.5, 2);
      birdGroup.add(body);
      const wingGeo = new THREE.PlaneGeometry(1.2, 0.3);
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(wingGeo, birdMat);
        wing.position.set(side * 0.6, 0, 0);
        wing.rotation.z = side * 0.2;
        birdGroup.add(wing);
      }

      const cx = (rng() - 0.5) * 150;
      const cz = (rng() - 0.5) * 150;
      const cy = 30 + rng() * 50;
      const radius = 15 + rng() * 30;
      const speed = 0.3 + rng() * 0.5;
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
    const maxPoints = 80;
    const positions = new Float32Array(maxPoints * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setDrawRange(0, 0);

    const mat = new THREE.LineBasicMaterial({
      color: 0x88bbff,
      transparent: true,
      opacity: 0.3,
      linewidth: 1,
    });
    this._trailMesh = new THREE.Line(geo, mat);
    this._scene.add(this._trailMesh);

    for (let i = 0; i < maxPoints; i++) {
      this._trailPoints.push(new THREE.Vector3());
    }
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
          float density = (n * 0.6 + n2 * 0.4);
          // Fade at edges
          float edgeFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x)
                         * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
          float alpha = density * edgeFade * 0.25;
          gl_FragColor = vec4(0.85, 0.88, 0.92, alpha);
        }
      `,
    });

    // Fog patches near river and in low areas
    const fogPositions = [
      { x: 0, z: -15, w: 120, d: 30 },    // Along river center
      { x: -100, z: -30, w: 80, d: 40 },   // River west
      { x: 100, z: -20, w: 80, d: 35 },    // River east
      { x: -150, z: 50, w: 60, d: 50 },    // Valley
      { x: 180, z: -80, w: 50, d: 40 },    // Valley
    ];

    for (const fp of fogPositions) {
      const fogGeo = new THREE.PlaneGeometry(fp.w, fp.d, 4, 4);
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
      const geo = new THREE.CircleGeometry(f.size, 16);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 999;
      this._lensFlareGroup.add(mesh);
    }
    this._scene.add(this._lensFlareGroup);
  }

  // ---------------------------------------------------------------------------
  // Update (called each frame)
  // ---------------------------------------------------------------------------

  update(state: EagleFlightState, dt: number): void {
    const p = state.player;
    const t = state.gameTime;

    // --- Update eagle position and rotation ---
    this._eagleGroup.position.set(p.position.x, p.position.y, p.position.z);
    const euler = new THREE.Euler(p.pitch, p.yaw, p.roll, "YXZ");
    this._eagleGroup.setRotationFromEuler(euler);

    // Wing flap animation — more organic with speed-based amplitude
    const speedRatio = p.speed / 45;
    const flapAmp = 0.15 + (1 - speedRatio) * 0.25; // flap more when slow
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

    // --- Camera follow with boost FOV and free look ---
    const camDist = p.boostActive ? 22 : 18;
    const camHeight = p.boostActive ? 4 : 6;
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(euler);
    const up = new THREE.Vector3(0, 1, 0).applyEuler(euler);

    let targetCamPos: THREE.Vector3;
    let targetLookAt: THREE.Vector3;

    if (p.freeLook) {
      // Free look: camera orbits around eagle based on mouse
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

    const smoothFactor = 1 - Math.pow(0.02, dt);
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

    // Boost FOV effect
    const targetFov = p.boostActive ? 78 : 65;
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
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 4, 3), sparkMat);
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

    // --- Update eagle trail ---
    if (this._trailMesh) {
      // Shift points back
      for (let i = this._trailPoints.length - 1; i > 0; i--) {
        this._trailPoints[i].copy(this._trailPoints[i - 1]);
      }
      this._trailPoints[0].set(p.position.x, p.position.y, p.position.z);

      const tPos = this._trailMesh.geometry.getAttribute("position");
      let drawCount = 0;
      for (let i = 0; i < this._trailPoints.length; i++) {
        tPos.setXYZ(i, this._trailPoints[i].x, this._trailPoints[i].y, this._trailPoints[i].z);
        if (i > 0) {
          const d = this._trailPoints[i].distanceTo(this._trailPoints[0]);
          if (d < 0.01) break;
        }
        drawCount++;
      }
      tPos.needsUpdate = true;
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
      const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 5, 4), smokeMat);
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
      sp.mesh.position.x += Math.sin(t * 2 + i) * 0.02;
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
