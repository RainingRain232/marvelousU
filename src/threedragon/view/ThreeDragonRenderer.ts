// ---------------------------------------------------------------------------
// 3Dragon mode — Three.js 3D renderer
// Beautiful 3D world: volumetric sky, rolling terrain, eagle + Arthur,
// enemies as 3D meshes, projectile trails, god rays, and atmospheric fog.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import type { ThreeDragonState, TDEnemy } from "../state/ThreeDragonState";
import { TDEnemyType, TDSkillId } from "../state/ThreeDragonState";
import type { TDMapConfig } from "../config/ThreeDragonConfig";
import { TD_MAPS } from "../config/ThreeDragonConfig";

// ---------------------------------------------------------------------------
// ThreeDragonRenderer
// ---------------------------------------------------------------------------

export class ThreeDragonRenderer {
  private _mapCfg: TDMapConfig = TD_MAPS[0];
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _canvas!: HTMLCanvasElement;

  // Lighting
  private _sunLight!: THREE.DirectionalLight;
  private _ambientLight!: THREE.AmbientLight;
  private _pointLight!: THREE.PointLight;

  // Sky
  private _skyMesh!: THREE.Mesh;
  private _sunMesh!: THREE.Mesh;
  private _moonMesh!: THREE.Mesh;
  private _cloudGroup = new THREE.Group();
  private _starField!: THREE.Points;
  private _godRays!: THREE.Mesh;

  // Ground
  private _groundTiles: THREE.Mesh[] = [];
  private _waterPlane!: THREE.Mesh;
  private _mountains: THREE.Mesh[] = [];
  private _trees: THREE.Mesh[] = [];

  // Player
  private _eagleGroup = new THREE.Group();
  private _eagleBody!: THREE.Mesh;
  private _eagleWingL!: THREE.Mesh;
  private _eagleWingR!: THREE.Mesh;
  private _eagleTail!: THREE.Mesh;
  private _eagleHead!: THREE.Mesh;
  private _arthurGroup = new THREE.Group();
  private _wandLight!: THREE.PointLight;
  private _wandGlow!: THREE.Mesh;
  private _capeMesh!: THREE.Mesh;
  private _shieldMesh!: THREE.Mesh;

  // Enemy meshes
  private _enemyMeshes = new Map<number, THREE.Group>();

  // Projectile meshes (groups for complex projectiles)
  private _projMeshes = new Map<number, THREE.Group>();

  // Explosion meshes
  private _explosionMeshes: { mesh: THREE.Mesh; timer: number; maxTimer: number }[] = [];
  // Shockwave ring meshes
  private _shockwaveRings: { mesh: THREE.Mesh; timer: number; maxTimer: number; maxRadius: number }[] = [];
  // Animated debris particles (for deaths, hits, etc.)
  private _debrisParticles: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; timer: number; maxTimer: number; rotSpeed: THREE.Vector3 }[] = [];
  // Lightning bolt meshes (animated fade)
  private _lightningBolts: { group: THREE.Group; timer: number; maxTimer: number }[] = [];
  // Hit impact rings
  private _hitRings: { mesh: THREE.Mesh; timer: number; maxTimer: number; maxScale: number }[] = [];

  // Power-up meshes
  private _powerUpMeshes = new Map<number, THREE.Group>();

  // Screen flash overlays
  private _screenFlashes: { mesh: THREE.Mesh; timer: number; maxTimer: number }[] = [];

  // Fireflies / magical floating particles
  private _fireflyGroup = new THREE.Group();

  // Wildlife silhouettes
  private _wildlifeGroup = new THREE.Group();

  // Reusable geometries
  private _sphereGeo!: THREE.SphereGeometry;
  private _boxGeo!: THREE.BoxGeometry;
  private _coneGeo!: THREE.ConeGeometry;

  // Boost visual effects
  private _boostSpeedLines: THREE.Group = new THREE.Group();
  private _baseFov = 70;

  // Trail particles
  private _trailParticles!: THREE.Points;
  private _trailPositions: Float32Array = new Float32Array(0);
  private _trailColors: Float32Array = new Float32Array(0);
  private _trailSizes: Float32Array = new Float32Array(0);
  private _trailIndex = 0;
  private _maxTrailParticles = 900;

  get canvas(): HTMLCanvasElement { return this._canvas; }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  init(sw: number, sh: number, mapCfg?: TDMapConfig): void {
    if (mapCfg) this._mapCfg = mapCfg;
    // Renderer
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this._renderer.setSize(sw, sh);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.2;
    this._canvas = this._renderer.domElement;
    this._canvas.style.position = "absolute";
    this._canvas.style.top = "0";
    this._canvas.style.left = "0";
    this._canvas.style.zIndex = "0";

    // Scene
    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(this._mapCfg.fogColor, this._mapCfg.fogDensity);

    // Camera — wider FOV for dramatic perspective, slightly higher and further back
    this._camera = new THREE.PerspectiveCamera(70, sw / sh, 0.5, 600);
    this._camera.position.set(0, 16, 18);
    this._camera.lookAt(0, 6, -35);

    // Reusable geometries
    this._sphereGeo = new THREE.SphereGeometry(1, 12, 8);
    this._boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this._coneGeo = new THREE.ConeGeometry(1, 2, 8);

    // Build scene
    this._buildLighting();
    this._buildSky();
    this._buildGround();
    this._buildPlayer();
    this._buildTrailSystem();
    this._buildFireflies();
    this._buildWildlife();
    this._buildBoostEffects();
  }

  // ---------------------------------------------------------------------------
  // Lighting
  // ---------------------------------------------------------------------------

  private _buildLighting(): void {
    const mc = this._mapCfg;

    // Ambient
    this._ambientLight = new THREE.AmbientLight(mc.ambientColor, mc.ambientIntensity);
    this._scene.add(this._ambientLight);

    // Sun directional
    this._sunLight = new THREE.DirectionalLight(mc.sunLightColor, mc.sunLightIntensity);
    this._sunLight.position.set(30, 50, -40);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(2048, 2048);
    this._sunLight.shadow.camera.near = 1;
    this._sunLight.shadow.camera.far = 250;
    this._sunLight.shadow.camera.left = -60;
    this._sunLight.shadow.camera.right = 60;
    this._sunLight.shadow.camera.top = 60;
    this._sunLight.shadow.camera.bottom = -60;
    this._sunLight.shadow.bias = -0.001;
    this._scene.add(this._sunLight);
    this._scene.add(this._sunLight.target);

    // Player wand light
    this._pointLight = new THREE.PointLight(0x88ccff, 3, 20);
    this._scene.add(this._pointLight);

    // Hemisphere light
    const hemiLight = new THREE.HemisphereLight(mc.hemiSkyColor, mc.hemiGroundColor, 0.5);
    this._scene.add(hemiLight);

    // Rim light
    const rimLight = new THREE.DirectionalLight(mc.rimLightColor, 0.4);
    rimLight.position.set(-20, 30, 60);
    this._scene.add(rimLight);
  }

  // ---------------------------------------------------------------------------
  // Sky
  // ---------------------------------------------------------------------------

  private _buildSky(): void {
    const mc = this._mapCfg;

    // Sky dome
    const skyGeo = new THREE.SphereGeometry(200, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uTopColor: { value: new THREE.Color(mc.skyTopColor) },
        uMidColor: { value: new THREE.Color(mc.skyMidColor) },
        uHorizonColor: { value: new THREE.Color(mc.skyHorizonColor) },
        uSunColor: { value: new THREE.Color(mc.skySunColor) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunColor;
        uniform float uTime;
        varying vec3 vWorldPos;
        void main() {
          vec3 n = normalize(vWorldPos);
          float h = n.y;
          vec3 col;
          if (h > 0.3) {
            col = mix(uMidColor, uTopColor, (h - 0.3) / 0.7);
          } else if (h > 0.0) {
            col = mix(uHorizonColor, uMidColor, h / 0.3);
          } else {
            col = mix(vec3(0.05, 0.08, 0.12), uHorizonColor, (h + 0.3) / 0.3);
          }
          // Sun glow with multiple layers
          vec3 sunDir = normalize(vec3(0.5, 0.3, -0.7));
          float sunDot = max(0.0, dot(n, sunDir));
          col += uSunColor * pow(sunDot, 64.0) * 1.2;
          col += uSunColor * pow(sunDot, 16.0) * 0.25;
          col += vec3(1.0, 0.6, 0.2) * pow(sunDot, 4.0) * 0.08;
          // Subtle aurora/nebula near zenith
          float aurora = sin(n.x * 3.0 + uTime * 0.2) * cos(n.z * 2.0 + uTime * 0.15);
          aurora = max(0.0, aurora) * smoothstep(0.4, 0.8, h) * 0.06;
          col += vec3(0.2, 0.4, 0.8) * aurora;
          col += vec3(0.5, 0.2, 0.6) * aurora * sin(n.x * 5.0 + uTime * 0.3) * 0.5;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this._skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(this._skyMesh);

    // Sun billboard
    const sunGeo = new THREE.CircleGeometry(10, 64);
    const sunMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec2 c = vUv - 0.5;
          float d = length(c);
          float glow = exp(-d * 5.0) * 0.8;
          float core = exp(-d * 14.0) * 1.0;
          // Subtle soft rays — low contrast so no visible stripes
          float angle = atan(c.y, c.x);
          float rays = sin(angle * 12.0 + uTime * 0.3) * 0.5 + 0.5;
          rays = mix(0.85, 1.0, rays); // very subtle variation
          float rayMask = exp(-d * 3.0) * 0.12;
          float a = (glow + core) * rays + rayMask * (rays - 0.85);
          // Smooth circular edge fade to avoid any geometry edge artifacts
          float edgeFade = smoothstep(0.5, 0.35, d);
          a *= edgeFade;
          vec3 col = mix(vec3(1.0, 0.85, 0.4), vec3(1.0, 1.0, 0.95), core);
          gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
        }
      `,
    });
    this._sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this._sunMesh.position.set(mc.sunPosition[0], mc.sunPosition[1], mc.sunPosition[2]);
    this._sunMesh.lookAt(0, 0, 0);
    this._scene.add(this._sunMesh);

    // Stars
    const starCount = 500;
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.4; // upper hemisphere
      const r = 180;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi) + 20;
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      starSizes[i] = 0.5 + Math.random() * 2;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));
    const starMat = new THREE.PointsMaterial({
      color: 0xeeeeff,
      size: 1.0,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: false,
    });
    this._starField = new THREE.Points(starGeo, starMat);
    this._scene.add(this._starField);

    // Moon — crescent on the opposite side of the sun
    const moonGeo = new THREE.PlaneGeometry(12, 12);
    const moonMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec2 c = vUv - 0.5;
          float d = length(c);
          // Main moon disc
          float disc = smoothstep(0.28, 0.25, d);
          // Crescent cutout — shifted circle
          float cutout = smoothstep(0.22, 0.19, length(c - vec2(0.08, 0.04)));
          float crescent = disc * (1.0 - cutout * 0.85);
          // Soft glow — falls off well before plane edges
          float glow = exp(-d * 6.0) * 0.3;
          float halo = exp(-d * 3.0) * 0.1;
          vec3 moonCol = vec3(0.8, 0.85, 1.0);
          vec3 glowCol = vec3(0.5, 0.6, 0.9);
          vec3 col = moonCol * crescent + glowCol * (glow + halo);
          float a = crescent * 0.9 + glow + halo;
          // Smooth edge fade to eliminate square plane artifact
          float edgeFade = smoothstep(0.5, 0.32, d);
          a *= edgeFade;
          // Subtle surface detail
          float detail = sin(c.x * 40.0) * sin(c.y * 40.0) * 0.05 * disc;
          col -= detail;
          gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
        }
      `,
    });
    this._moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this._moonMesh.position.set(mc.moonPosition[0], mc.moonPosition[1], mc.moonPosition[2]);
    this._moonMesh.lookAt(0, 0, 0);
    this._scene.add(this._moonMesh);

    // God ray beams from the sun
    const godRayGeo = new THREE.PlaneGeometry(60, 80);
    const godRayMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          // Create angled ray beams
          float rays = 0.0;
          float x = vUv.x;
          float y = vUv.y;
          // Multiple ray bands at different angles
          for (float i = 0.0; i < 5.0; i++) {
            float offset = i * 0.18 + 0.1;
            float width = 0.015 + sin(uTime * 0.3 + i) * 0.005;
            float ray = smoothstep(width, 0.0, abs(x - offset + sin(y * 2.0 + uTime * 0.2 + i) * 0.03));
            ray *= smoothstep(0.0, 0.3, y) * smoothstep(1.0, 0.4, y);
            rays += ray * (0.8 + sin(uTime * 0.5 + i * 1.5) * 0.2);
          }
          vec3 col = vec3(1.0, 0.9, 0.6) * rays * 0.12;
          float a = rays * 0.08;
          gl_FragColor = vec4(col, a);
        }
      `,
    });
    this._godRays = new THREE.Mesh(godRayGeo, godRayMat);
    this._godRays.position.set(60, 35, -100);
    this._godRays.rotation.y = -0.4;
    this._godRays.rotation.z = -0.2;
    this._scene.add(this._godRays);

    // Clouds
    this._buildClouds();
  }

  private _buildClouds(): void {
    const mc = this._mapCfg;
    const cloudLightColors = mc.cloudLightColors;
    const cloudDarkColors = mc.cloudDarkColors;
    const cloudMidColors = mc.cloudMidColors;

    for (let i = 0; i < mc.cloudCount; i++) {
      const cloudGroup = new THREE.Group();
      const puffs = 5 + Math.floor(Math.random() * 6);
      const litFromSun = Math.random() < 0.5; // some clouds are lit, some in shadow

      for (let j = 0; j < puffs; j++) {
        const size = 4 + Math.random() * 12;
        const layerIndex = j / puffs; // 0 = bottom, 1 = top

        // Bottom layer: darker; middle: mid tone; top: bright (lit by sun)
        let color: number;
        if (layerIndex < 0.33) {
          color = cloudDarkColors[Math.floor(Math.random() * cloudDarkColors.length)];
        } else if (layerIndex < 0.66) {
          color = cloudMidColors[Math.floor(Math.random() * cloudMidColors.length)];
        } else {
          color = litFromSun
            ? cloudLightColors[Math.floor(Math.random() * cloudLightColors.length)]
            : cloudMidColors[Math.floor(Math.random() * cloudMidColors.length)];
        }

        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.05 + Math.random() * 0.12,
          depthWrite: false,
        });
        const puff = new THREE.Mesh(this._sphereGeo, mat);
        // Varied aspect ratios for more 3D feel
        const flatness = 0.25 + Math.random() * 0.15;
        const depth = 0.5 + Math.random() * 0.4;
        puff.scale.set(size, size * flatness, size * depth);
        puff.position.set(
          (Math.random() - 0.5) * size * 2.5,
          (j - puffs * 0.5) * size * 0.12, // stack vertically for depth
          (Math.random() - 0.5) * size * 1.2,
        );
        puff.rotation.y = Math.random() * Math.PI; // rotate for variety
        cloudGroup.add(puff);
      }

      // Add bright highlight puff on top of some clouds
      if (litFromSun && Math.random() < 0.6) {
        const highlightMat = new THREE.MeshBasicMaterial({
          color: mc.cloudHighlightColor,
          transparent: true,
          opacity: 0.04 + Math.random() * 0.06,
          depthWrite: false,
        });
        const hlSize = 3 + Math.random() * 5;
        const highlight = new THREE.Mesh(this._sphereGeo, highlightMat);
        highlight.scale.set(hlSize, hlSize * 0.15, hlSize * 0.4);
        highlight.position.set(
          (Math.random() - 0.5) * hlSize,
          hlSize * 0.3,
          0,
        );
        cloudGroup.add(highlight);
      }

      cloudGroup.position.set(
        (Math.random() - 0.5) * 250,
        18 + Math.random() * 55,
        -Math.random() * 250,
      );
      cloudGroup.userData.speed = 0.3 + Math.random() * 1.5;
      this._cloudGroup.add(cloudGroup);
    }
    this._scene.add(this._cloudGroup);
  }

  // ---------------------------------------------------------------------------
  // Ground
  // ---------------------------------------------------------------------------

  private _buildGround(): void {
    const mc = this._mapCfg;

    // Rolling terrain tiles
    const tileSize = 80;
    const tileCount = 8;

    for (let i = 0; i < tileCount; i++) {
      const geo = new THREE.PlaneGeometry(tileSize, tileSize, 32, 32);
      geo.rotateX(-Math.PI / 2);

      // Procedural height variation
      const posAttr = geo.getAttribute("position");
      for (let v = 0; v < posAttr.count; v++) {
        const x = posAttr.getX(v);
        const z = posAttr.getZ(v);
        const h = Math.sin(x * 0.05 + i * 3) * 1.5 +
                  Math.cos(z * 0.08 + i * 2) * 1.0 +
                  Math.sin((x + z) * 0.03) * 2.5;
        posAttr.setY(v, h);
      }
      geo.computeVertexNormals();

      // Ground material colored per map
      const mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(mc.groundColor).offsetHSL(
          (Math.random() - 0.5) * mc.groundHueVariation,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.06,
        ),
        flatShading: true,
        shininess: 5,
      });
      const tile = new THREE.Mesh(geo, mat);
      tile.position.z = -i * tileSize;
      tile.receiveShadow = true;
      this._scene.add(tile);
      this._groundTiles.push(tile);
    }

    // Water plane — animated shader for shimmering surface
    const waterGeo = new THREE.PlaneGeometry(800, 800, 64, 64);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(mc.waterColor) },
        uHighlight: { value: new THREE.Color(mc.waterHighlight) },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          vUv = uv;
          vec3 p = position;
          float w = sin(p.x * 0.15 + uTime * 0.8) * cos(p.z * 0.12 + uTime * 0.6) * 0.8;
          w += sin(p.x * 0.3 + p.z * 0.2 + uTime * 1.2) * 0.3;
          p.y += w;
          vWave = w;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uHighlight;
        uniform float uTime;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          float shimmer = sin(vUv.x * 80.0 + uTime * 2.0) * cos(vUv.y * 60.0 + uTime * 1.5) * 0.5 + 0.5;
          shimmer = pow(shimmer, 4.0) * 0.3;
          float foam = smoothstep(0.5, 0.8, vWave) * 0.2;

          // Reflective sun/moon highlights
          float sunReflect = sin(vUv.x * 120.0 + uTime * 3.0) * sin(vUv.y * 100.0 + uTime * 2.5);
          sunReflect = pow(max(0.0, sunReflect), 8.0) * 0.4;
          // Concentrate reflection in a band (simulating sun reflection path)
          float reflBand = exp(-pow((vUv.x - 0.6) * 4.0, 2.0)) * exp(-pow((vUv.y - 0.3) * 3.0, 2.0));
          sunReflect *= reflBand;

          // Secondary moon reflection (dimmer, on other side)
          float moonReflect = sin(vUv.x * 90.0 + uTime * 1.5) * sin(vUv.y * 70.0 + uTime * 1.8);
          moonReflect = pow(max(0.0, moonReflect), 10.0) * 0.15;
          float moonBand = exp(-pow((vUv.x - 0.3) * 4.0, 2.0)) * exp(-pow((vUv.y - 0.5) * 3.0, 2.0));
          moonReflect *= moonBand;

          // Caustic ripple pattern
          float caustic = sin(vUv.x * 200.0 + uTime * 4.0 + sin(vUv.y * 30.0)) *
                          cos(vUv.y * 150.0 + uTime * 3.0 + sin(vUv.x * 25.0));
          caustic = pow(max(0.0, caustic), 6.0) * 0.08;

          vec3 col = mix(uColor, uHighlight, shimmer + foam);
          col += vec3(1.0, 0.9, 0.7) * sunReflect;    // warm sun sparkles
          col += vec3(0.6, 0.7, 1.0) * moonReflect;    // cool moon sparkles
          col += vec3(0.3, 0.5, 0.7) * caustic;        // underwater caustics
          float alpha = 0.65 + shimmer * 0.1 + sunReflect * 0.15;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    this._waterPlane = new THREE.Mesh(waterGeo, waterMat);
    this._waterPlane.position.y = mc.waterY;
    this._scene.add(this._waterPlane);

    // Mountains (distant backdrop) with snow caps, ridgelines, and foothills
    const mtnCount = mc.mountainCount ?? 45;
    const mtnHMin = mc.mountainHeightMin ?? 15;
    const mtnHMax = mc.mountainHeightMax ?? 60;
    const mtnSpreadX = mc.mountainSpreadX ?? 100;
    for (let i = 0; i < mtnCount; i++) {
      const h = mtnHMin + Math.random() * (mtnHMax - mtnHMin);
      const w = 10 + Math.random() * 25;
      const mtnGroup = new THREE.Group();

      // Main peak — varied polygon counts for organic shapes
      const mtnGeo = new THREE.ConeGeometry(w, h, 5 + Math.floor(Math.random() * 4));
      const baseHue = mc.mountainBaseHue + (Math.random() - 0.5) * 0.06;
      const mtnMat = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(baseHue, mc.mountainSatRange[0] + Math.random() * (mc.mountainSatRange[1] - mc.mountainSatRange[0]), mc.mountainLightRange[0] + Math.random() * (mc.mountainLightRange[1] - mc.mountainLightRange[0])),
        flatShading: true,
      });
      const mtn = new THREE.Mesh(mtnGeo, mtnMat);
      mtnGroup.add(mtn);

      // Secondary ridge/shoulder peak
      if (Math.random() < 0.6) {
        const ridgeH = h * (0.4 + Math.random() * 0.3);
        const ridgeW = w * (0.3 + Math.random() * 0.4);
        const ridgeGeo = new THREE.ConeGeometry(ridgeW, ridgeH, 5);
        const ridge = new THREE.Mesh(ridgeGeo, mtnMat.clone());
        ridge.position.set(
          (Math.random() < 0.5 ? -1 : 1) * w * 0.5,
          -h * 0.15,
          (Math.random() - 0.5) * w * 0.3,
        );
        mtnGroup.add(ridge);
      }

      // Foothills — smaller bumps at the base
      for (let f = 0; f < 2 + Math.floor(Math.random() * 3); f++) {
        const fh = h * (0.1 + Math.random() * 0.15);
        const fw = w * (0.2 + Math.random() * 0.3);
        const footGeo = new THREE.ConeGeometry(fw, fh, 5);
        const footMat = new THREE.MeshPhongMaterial({
          color: new THREE.Color().setHSL(baseHue + 0.02, 0.3, 0.18 + Math.random() * 0.08),
          flatShading: true,
        });
        const foot = new THREE.Mesh(footGeo, footMat);
        foot.position.set(
          (Math.random() - 0.5) * w * 1.5,
          -h * 0.35,
          (Math.random() - 0.5) * w * 0.5,
        );
        mtnGroup.add(foot);
      }

      // Snow cap on tall mountains — layered snow
      if (h > mc.snowThreshold) {
        const snowGeo = new THREE.ConeGeometry(w * 0.35, h * 0.2, 6);
        const snowMat = new THREE.MeshPhongMaterial({
          color: mc.snowColor,
          emissive: 0x223344,
          emissiveIntensity: 0.1,
        });
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = h * 0.4;
        mtnGroup.add(snow);

        // Secondary snow streak
        if (h > 32) {
          const streak = new THREE.Mesh(
            new THREE.ConeGeometry(w * 0.2, h * 0.12, 5),
            snowMat.clone(),
          );
          streak.position.set(w * 0.15, h * 0.32, 0);
          mtnGroup.add(streak);
        }
      }

      // Rocky outcrops on some mountains
      if (Math.random() < 0.4) {
        const rockMat = new THREE.MeshPhongMaterial({
          color: new THREE.Color(0x555566).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1),
          flatShading: true,
        });
        for (let r = 0; r < 2 + Math.floor(Math.random() * 3); r++) {
          const rockGeo = new THREE.DodecahedronGeometry(w * 0.06 + Math.random() * w * 0.08, 0);
          const rock = new THREE.Mesh(rockGeo, rockMat);
          const angle = Math.random() * Math.PI * 2;
          const rDist = w * (0.3 + Math.random() * 0.4);
          rock.position.set(
            Math.cos(angle) * rDist,
            -h * 0.2 + Math.random() * h * 0.3,
            Math.sin(angle) * rDist,
          );
          rock.rotation.set(Math.random(), Math.random(), Math.random());
          mtnGroup.add(rock);
        }
      }

      mtnGroup.position.set(
        (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * mtnSpreadX),
        h * 0.4,
        -Math.random() * 650,
      );
      mtn.castShadow = true;
      this._scene.add(mtnGroup);
      this._mountains.push(mtnGroup as any);
    }

    // Scattered ground rocks and boulders
    const rockMat = new THREE.MeshPhongMaterial({ color: mc.rockColor, flatShading: true });
    for (let i = 0; i < 60; i++) {
      const rSize = 0.3 + Math.random() * 1.2;
      const rockGeo = new THREE.DodecahedronGeometry(rSize, 0);
      const rock = new THREE.Mesh(rockGeo, rockMat.clone());
      (rock.material as THREE.MeshPhongMaterial).color.setHSL(
        0.28 + (Math.random() - 0.5) * 0.05,
        0.15 + Math.random() * 0.1,
        0.15 + Math.random() * 0.15,
      );
      rock.position.set(
        (Math.random() - 0.5) * 70,
        rSize * 0.3,
        -Math.random() * 300,
      );
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rock.castShadow = true;
      this._scene.add(rock);
      this._trees.push(rock); // reuse trees array for scrolling
    }

    // Grass tufts — small cone clusters on the ground
    const grassColors = mc.grassColors;
    for (let i = 0; i < 120; i++) {
      const tuftGroup = new THREE.Group();
      const blades = 3 + Math.floor(Math.random() * 4);
      const gColor = grassColors[Math.floor(Math.random() * grassColors.length)];
      for (let b = 0; b < blades; b++) {
        const bladeH = 0.3 + Math.random() * 0.6;
        const bladeGeo = new THREE.ConeGeometry(0.06 + Math.random() * 0.05, bladeH, 3);
        const bladeMat = new THREE.MeshPhongMaterial({
          color: new THREE.Color(gColor).offsetHSL(
            (Math.random() - 0.5) * 0.03, 0, (Math.random() - 0.5) * 0.08
          ),
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.set(
          (Math.random() - 0.5) * 0.4,
          bladeH * 0.5,
          (Math.random() - 0.5) * 0.4,
        );
        blade.rotation.z = (Math.random() - 0.5) * 0.3;
        tuftGroup.add(blade);
      }
      tuftGroup.position.set(
        (Math.random() - 0.5) * 65,
        0,
        -Math.random() * 300,
      );
      this._scene.add(tuftGroup);
      this._trees.push(tuftGroup as any);
    }

    // Wildflowers — small colorful dots scattered on the ground
    const flowerColors = mc.flowerColors;
    for (let i = 0; i < 80; i++) {
      const flowerGroup = new THREE.Group();
      const fColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      // Stem
      const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3 + Math.random() * 0.3, 4);
      const stemMat = new THREE.MeshPhongMaterial({ color: 0x336633 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.15;
      flowerGroup.add(stem);
      // Petals
      const petalGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 6, 4);
      const petalMat = new THREE.MeshPhongMaterial({
        color: fColor,
        emissive: fColor,
        emissiveIntensity: 0.15,
      });
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.y = 0.35 + Math.random() * 0.2;
      flowerGroup.add(petal);

      flowerGroup.position.set(
        (Math.random() - 0.5) * 50,
        0,
        -Math.random() * 300,
      );
      this._scene.add(flowerGroup);
      this._trees.push(flowerGroup as any);
    }

    // Trees scattered on ground
    const canopyColors = mc.treeCanopyColors;
    for (let i = 0; i < 80; i++) {
      const treeGroup = new THREE.Group();
      const trunkH = 1.5 + Math.random() * 2.5;
      const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, trunkH, 6);
      const trunkMat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(mc.trunkColor).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1),
      });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH * 0.5;
      treeGroup.add(trunk);

      const canopyH = 2 + Math.random() * 3.5;
      const baseColor = canopyColors[Math.floor(Math.random() * canopyColors.length)];
      const canopyGeo = new THREE.ConeGeometry(1.2 + Math.random() * 1.5, canopyH, 7);
      const canopyMat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(baseColor).offsetHSL(
          (Math.random() - 0.5) * 0.04,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.08,
        ),
        flatShading: true,
      });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.y = trunkH + canopyH * 0.4;
      canopy.castShadow = true;
      treeGroup.add(canopy);

      // Some trees get a second canopy layer
      if (Math.random() < 0.3) {
        const layer2H = canopyH * 0.6;
        const layer2Geo = new THREE.ConeGeometry((1.2 + Math.random()) * 0.7, layer2H, 7);
        const layer2 = new THREE.Mesh(layer2Geo, canopyMat.clone());
        layer2.position.y = trunkH + canopyH * 0.7 + layer2H * 0.3;
        treeGroup.add(layer2);
      }

      treeGroup.position.set(
        (Math.random() - 0.5) * 60,
        0,
        -Math.random() * 300,
      );
      treeGroup.scale.setScalar(0.8 + Math.random() * 0.5);
      this._scene.add(treeGroup);
      this._trees.push(treeGroup as any);
    }
  }

  // ---------------------------------------------------------------------------
  // Player (Eagle + Arthur + Wand)
  // ---------------------------------------------------------------------------

  private _buildPlayer(): void {
    // --- Eagle body ---
    const bodyGeo = new THREE.SphereGeometry(1, 12, 8);
    bodyGeo.scale(2.2, 0.9, 1.4);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0xf0ead0,
      specular: 0x444444,
      shininess: 30,
    });
    this._eagleBody = new THREE.Mesh(bodyGeo, bodyMat);
    this._eagleGroup.add(this._eagleBody);

    // Head
    const headGeo = new THREE.SphereGeometry(0.55, 10, 8);
    const headMat = new THREE.MeshPhongMaterial({ color: 0xfaf5e8 });
    this._eagleHead = new THREE.Mesh(headGeo, headMat);
    this._eagleHead.position.set(2, 0.4, 0);
    this._eagleGroup.add(this._eagleHead);

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.2, 0.6, 4);
    beakGeo.rotateZ(-Math.PI / 2);
    const beakMat = new THREE.MeshPhongMaterial({ color: 0xddaa33 });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(2.7, 0.3, 0);
    this._eagleGroup.add(beak);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.12, 8, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x221100 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(2.3, 0.55, -0.3);
    this._eagleGroup.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(2.3, 0.55, 0.3);
    this._eagleGroup.add(eyeR);

    // Wings
    const wingGeo = this._createWingGeometry();
    const wingMat = new THREE.MeshPhongMaterial({
      color: 0xf5f0e0,
      side: THREE.DoubleSide,
      flatShading: true,
    });
    this._eagleWingL = new THREE.Mesh(wingGeo, wingMat);
    this._eagleWingL.position.set(0, 0.3, -0.8);
    this._eagleGroup.add(this._eagleWingL);

    this._eagleWingR = new THREE.Mesh(wingGeo, wingMat.clone());
    this._eagleWingR.position.set(0, 0.3, 0.8);
    this._eagleWingR.scale.z = -1;
    this._eagleGroup.add(this._eagleWingR);

    // Tail feathers
    const tailGeo = new THREE.ConeGeometry(0.6, 2, 5);
    tailGeo.rotateZ(Math.PI / 2);
    const tailMat = new THREE.MeshPhongMaterial({ color: 0xe8e0c8 });
    this._eagleTail = new THREE.Mesh(tailGeo, tailMat);
    this._eagleTail.position.set(-2, 0.3, 0);
    this._eagleGroup.add(this._eagleTail);

    // Talons
    const talonGeo = new THREE.ConeGeometry(0.15, 0.6, 4);
    const talonMat = new THREE.MeshPhongMaterial({ color: 0xccaa44 });
    for (const z of [-0.4, 0.4]) {
      const talon = new THREE.Mesh(talonGeo, talonMat);
      talon.position.set(0, -0.9, z);
      this._eagleGroup.add(talon);
    }

    // --- Arthur ---
    this._buildArthur();

    // --- Shield mesh ---
    const shieldGeo = new THREE.SphereGeometry(3, 16, 12);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0xffdd88,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this._eagleGroup.add(this._shieldMesh);

    // Rotate entire eagle to face forward (-Z direction)
    // The eagle is built facing +X, so rotate +90 degrees around Y
    this._eagleGroup.rotation.y = Math.PI / 2;

    this._scene.add(this._eagleGroup);
  }

  private _createWingGeometry(): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      // Base triangle fans for wing shape
      0, 0, 0,     // root
      1, 0.2, -3,  // tip front
      -0.5, 0, -3.5, // tip back
      -1.5, 0, -2,   // mid back
      0, 0, 0,       // root again
      1, 0.2, -3,    // tip front
      2, 0.1, -1.5,  // mid front
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
  }

  private _buildArthur(): void {
    // Body (blue tunic)
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.8, 0.4);
    const torsoMat = new THREE.MeshPhongMaterial({ color: 0x2244aa });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.set(0, 1.3, 0);
    this._arthurGroup.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.25, 8, 6);
    const headMat = new THREE.MeshPhongMaterial({ color: 0xffccaa });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.95, 0);
    this._arthurGroup.add(head);

    // Hair
    const hairGeo = new THREE.SphereGeometry(0.27, 8, 6);
    const hairMat = new THREE.MeshPhongMaterial({ color: 0x553311 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 2.05, -0.02);
    hair.scale.set(1, 0.7, 1);
    this._arthurGroup.add(hair);

    // Crown
    const crownGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.15, 8);
    const crownMat = new THREE.MeshPhongMaterial({
      color: 0xddaa22,
      specular: 0xffffff,
      shininess: 80,
      emissive: 0x442200,
      emissiveIntensity: 0.3,
    });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.set(0, 2.2, 0);
    this._arthurGroup.add(crown);

    // Crown gems
    const gemGeo = new THREE.SphereGeometry(0.06, 6, 4);
    const gemMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const gem = new THREE.Mesh(gemGeo, gemMat);
      gem.position.set(Math.cos(a) * 0.25, 2.25, Math.sin(a) * 0.25);
      this._arthurGroup.add(gem);
    }

    // Cape
    const capeGeo = new THREE.PlaneGeometry(0.6, 1.2);
    const capeMat = new THREE.MeshPhongMaterial({
      color: 0xcc2222,
      side: THREE.DoubleSide,
    });
    this._capeMesh = new THREE.Mesh(capeGeo, capeMat);
    this._capeMesh.position.set(-0.3, 1.2, 0);
    this._capeMesh.rotation.y = Math.PI / 2;
    this._capeMesh.rotation.x = 0.3;
    this._arthurGroup.add(this._capeMesh);

    // Right arm (wand arm)
    const armGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6);
    const armMat = new THREE.MeshPhongMaterial({ color: 0x2244aa });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(0.15, 1.4, 0.3);
    arm.rotation.x = -0.5;
    this._arthurGroup.add(arm);

    // Wand
    const wandGeo = new THREE.CylinderGeometry(0.04, 0.06, 1.2, 6);
    const wandMat = new THREE.MeshPhongMaterial({ color: 0x886644, specular: 0x444444 });
    const wand = new THREE.Mesh(wandGeo, wandMat);
    wand.position.set(0.2, 1.6, 0.5);
    wand.rotation.x = -0.8;
    wand.rotation.z = 0.3;
    this._arthurGroup.add(wand);

    // Wand orb
    const orbGeo = new THREE.SphereGeometry(0.15, 10, 8);
    const orbMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
    });
    this._wandGlow = new THREE.Mesh(orbGeo, orbMat);
    this._wandGlow.position.set(0.25, 2.05, 0.8);
    this._arthurGroup.add(this._wandGlow);

    // Wand point light
    this._wandLight = new THREE.PointLight(0x88ccff, 3, 8);
    this._wandLight.position.copy(this._wandGlow.position);
    this._arthurGroup.add(this._wandLight);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6);
    const legMat = new THREE.MeshPhongMaterial({ color: 0x443322 });
    for (const z of [-0.12, 0.12]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(0, 0.65, z);
      this._arthurGroup.add(leg);
    }

    // Belt
    const beltGeo = new THREE.BoxGeometry(0.55, 0.1, 0.45);
    const beltMat = new THREE.MeshPhongMaterial({ color: 0x886633 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.set(0, 1.0, 0);
    this._arthurGroup.add(belt);

    // Belt buckle
    const buckleGeo = new THREE.BoxGeometry(0.12, 0.12, 0.02);
    const buckleMat = new THREE.MeshPhongMaterial({ color: 0xccaa44, specular: 0xffffff, shininess: 80 });
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, 1.0, 0.23);
    this._arthurGroup.add(buckle);

    this._eagleGroup.add(this._arthurGroup);
  }

  // ---------------------------------------------------------------------------
  // Trail particle system
  // ---------------------------------------------------------------------------

  private _buildTrailSystem(): void {
    const count = this._maxTrailParticles;
    this._trailPositions = new Float32Array(count * 3);
    this._trailColors = new Float32Array(count * 3);
    this._trailSizes = new Float32Array(count);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._trailPositions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this._trailColors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(this._trailSizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.5,
      transparent: true,
      opacity: 0.7,
      vertexColors: true,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this._trailParticles = new THREE.Points(geo, mat);
    this._scene.add(this._trailParticles);
  }

  private _addTrailPoint(x: number, y: number, z: number, r: number, g: number, b: number, size: number): void {
    const i = this._trailIndex;
    this._trailPositions[i * 3] = x;
    this._trailPositions[i * 3 + 1] = y;
    this._trailPositions[i * 3 + 2] = z;
    this._trailColors[i * 3] = r;
    this._trailColors[i * 3 + 1] = g;
    this._trailColors[i * 3 + 2] = b;
    this._trailSizes[i] = size;
    this._trailIndex = (this._trailIndex + 1) % this._maxTrailParticles;
  }

  // ---------------------------------------------------------------------------
  // Fireflies / magical floating particles
  // ---------------------------------------------------------------------------

  private _buildFireflies(): void {
    const count = 60;
    for (let i = 0; i < count; i++) {
      const colors = [0x88ffaa, 0xaaffcc, 0xffee88, 0x88ccff, 0xffaa88, 0xcc88ff];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 0.08 + Math.random() * 0.12;

      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.0, // starts invisible, animated in render
        depthWrite: false,
      });
      const fly = new THREE.Mesh(this._sphereGeo, mat);
      fly.scale.setScalar(size);
      fly.position.set(
        (Math.random() - 0.5) * 50,
        0.5 + Math.random() * 6,
        -Math.random() * 200,
      );
      // Store animation parameters
      fly.userData.baseY = fly.position.y;
      fly.userData.speed = 0.5 + Math.random() * 2;
      fly.userData.amplitude = 0.3 + Math.random() * 1.5;
      fly.userData.phase = Math.random() * Math.PI * 2;
      fly.userData.driftX = (Math.random() - 0.5) * 0.5;
      fly.userData.blinkSpeed = 1 + Math.random() * 3;
      fly.userData.blinkPhase = Math.random() * Math.PI * 2;
      this._fireflyGroup.add(fly);
    }
    this._scene.add(this._fireflyGroup);
  }

  // ---------------------------------------------------------------------------
  // Wildlife silhouettes
  // ---------------------------------------------------------------------------

  private _buildWildlife(): void {
    // Distant bird flocks (V-formations)
    for (let f = 0; f < 4; f++) {
      const flockGroup = new THREE.Group();
      const birdCount = 5 + Math.floor(Math.random() * 6);
      const birdMat = new THREE.MeshBasicMaterial({
        color: 0x111122,
        transparent: true,
        opacity: 0.3 + Math.random() * 0.2,
        depthWrite: false,
      });

      for (let b = 0; b < birdCount; b++) {
        // Simple bird silhouette: two small triangles for wings
        const wingSpan = 0.4 + Math.random() * 0.3;
        const birdGeo = new THREE.BufferGeometry();
        const verts = new Float32Array([
          0, 0, 0,
          -wingSpan, 0.1, -0.1,
          -wingSpan * 0.5, 0, -0.15,
          0, 0, 0,
          wingSpan, 0.1, -0.1,
          wingSpan * 0.5, 0, -0.15,
        ]);
        birdGeo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
        birdGeo.computeVertexNormals();
        const bird = new THREE.Mesh(birdGeo, birdMat);

        // V-formation positioning
        const side = b % 2 === 0 ? 1 : -1;
        const rank = Math.floor((b + 1) / 2);
        bird.position.set(
          side * rank * 1.5,
          -rank * 0.3,
          -rank * 1.2,
        );
        bird.userData.flapPhase = Math.random() * Math.PI * 2;
        bird.userData.flapSpeed = 3 + Math.random() * 2;
        flockGroup.add(bird);
      }

      flockGroup.position.set(
        (Math.random() - 0.5) * 80,
        25 + Math.random() * 20,
        -50 - Math.random() * 150,
      );
      flockGroup.userData.driftSpeed = 1 + Math.random() * 2;
      flockGroup.userData.driftDir = Math.random() < 0.5 ? 1 : -1;
      this._wildlifeGroup.add(flockGroup);
    }

    // Distant deer/animal silhouettes on hilltops
    for (let i = 0; i < 3; i++) {
      const deerGroup = new THREE.Group();
      const silMat = new THREE.MeshBasicMaterial({
        color: 0x0a0a0a,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      });

      // Body
      const bodyGeo = new THREE.BoxGeometry(1.2, 0.5, 0.4);
      const body = new THREE.Mesh(bodyGeo, silMat);
      body.position.y = 0.6;
      deerGroup.add(body);
      // Head
      const headGeo = new THREE.SphereGeometry(0.2, 6, 4);
      const head = new THREE.Mesh(headGeo, silMat);
      head.position.set(0.7, 0.9, 0);
      deerGroup.add(head);
      // Legs
      const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 4);
      for (const lx of [-0.4, 0.4]) {
        const leg = new THREE.Mesh(legGeo, silMat);
        leg.position.set(lx, 0.25, 0);
        deerGroup.add(leg);
      }
      // Antlers (on some)
      if (Math.random() < 0.5) {
        const antlerGeo = new THREE.ConeGeometry(0.04, 0.4, 3);
        for (const z of [-0.1, 0.1]) {
          const antler = new THREE.Mesh(antlerGeo, silMat);
          antler.position.set(0.7, 1.2, z);
          antler.rotation.z = z < 0 ? 0.3 : -0.3;
          deerGroup.add(antler);
        }
      }

      deerGroup.position.set(
        (Math.random() < 0.5 ? -1 : 1) * (25 + Math.random() * 30),
        2 + Math.random() * 3,
        -80 - Math.random() * 150,
      );
      deerGroup.scale.setScalar(0.8 + Math.random() * 0.6);
      this._wildlifeGroup.add(deerGroup);
    }

    this._scene.add(this._wildlifeGroup);
  }

  // ---------------------------------------------------------------------------
  // Boost speed-line effects
  // ---------------------------------------------------------------------------

  private _buildBoostEffects(): void {
    // Create speed-line meshes (hidden until boost activates)
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0x88ddff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    for (let i = 0; i < 40; i++) {
      const lineGeo = new THREE.CylinderGeometry(0.03, 0.03, 8 + Math.random() * 12, 3);
      lineGeo.rotateX(Math.PI / 2); // align along Z
      const line = new THREE.Mesh(lineGeo, lineMat.clone());
      line.userData.offsetX = (Math.random() - 0.5) * 30;
      line.userData.offsetY = (Math.random() - 0.5) * 20;
      line.userData.speedZ = 40 + Math.random() * 40;
      line.userData.phase = Math.random() * Math.PI * 2;
      line.visible = false;
      this._boostSpeedLines.add(line);
    }
    this._scene.add(this._boostSpeedLines);
  }

  private _updateBoostEffects(state: ThreeDragonState, dt: number, time: number): void {
    const boosting = state.player.boostActive;
    const px = state.player.position.x;
    const py = state.player.position.y;
    const pz = state.player.position.z;

    // Smoothly lerp FOV
    const targetFov = boosting ? 85 : this._baseFov;
    this._camera.fov += (targetFov - this._camera.fov) * 5 * dt;
    this._camera.updateProjectionMatrix();

    // Speed lines
    for (const child of this._boostSpeedLines.children) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;

      if (boosting) {
        mesh.visible = true;
        // Position lines around the player, streaming backward
        const ud = mesh.userData;
        mesh.position.x = px + ud.offsetX;
        mesh.position.y = py + ud.offsetY;
        // Cycle Z position
        const cycleLen = 50;
        mesh.position.z = pz - 10 - ((time * ud.speedZ + ud.phase * 20) % cycleLen);

        // Fade based on distance to player
        const distZ = Math.abs(mesh.position.z - pz);
        const alpha = Math.max(0, 0.4 - distZ * 0.008);
        mat.opacity = alpha;
        mat.color.setHex(0x88ddff);
      } else {
        // Fade out
        mat.opacity *= 0.9;
        if (mat.opacity < 0.01) {
          mesh.visible = false;
        }
      }
    }

    // Boost particle trail from eagle
    if (boosting && Math.random() < 0.7) {
      const col = new THREE.Color(0x44ccff);
      this._addTrailPoint(
        px + (Math.random() - 0.5) * 3,
        py + (Math.random() - 0.5) * 2,
        pz + 3 + Math.random() * 2,
        col.r, col.g, col.b, 0.3,
      );
    }

  }

  // ---------------------------------------------------------------------------
  // Enemy mesh creation
  // ---------------------------------------------------------------------------

  private _createEnemyMesh(enemy: TDEnemy): THREE.Group {
    const group = new THREE.Group();
    const s = enemy.size;

    // Glow aura
    const auraMat = new THREE.MeshBasicMaterial({
      color: enemy.glowColor,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    const aura = new THREE.Mesh(new THREE.SphereGeometry(s * 2, 8, 6), auraMat);
    aura.name = "aura";
    group.add(aura);

    switch (enemy.type) {
      case TDEnemyType.SHADOW_RAVEN:
      case TDEnemyType.STORM_HARPY: {
        const isHarpy = enemy.type === TDEnemyType.STORM_HARPY;
        // Bird-like body with neck
        const bodyMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.25,
          specular: isHarpy ? 0x4488ff : 0x331111,
          shininess: 40,
        });
        const body = new THREE.Mesh(this._sphereGeo, bodyMat);
        body.scale.set(s * 1.3, s * 0.55, s * 0.85);
        group.add(body);
        // Neck
        const neckGeo = new THREE.CylinderGeometry(s * 0.15, s * 0.25, s * 0.5, 6);
        const neck = new THREE.Mesh(neckGeo, bodyMat.clone());
        neck.position.set(s * 0.8, s * 0.25, 0);
        neck.rotation.z = -0.5;
        group.add(neck);
        // Head
        const headMat = new THREE.MeshPhongMaterial({
          color: isHarpy ? 0x334466 : 0x221122,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.15,
        });
        const head = new THREE.Mesh(this._sphereGeo, headMat);
        head.scale.set(s * 0.35, s * 0.3, s * 0.3);
        head.position.set(s * 1.1, s * 0.4, 0);
        group.add(head);
        // Beak
        const beakGeo = new THREE.ConeGeometry(s * 0.08, s * 0.35, 4);
        beakGeo.rotateZ(-Math.PI / 2);
        const beakMat = new THREE.MeshPhongMaterial({ color: isHarpy ? 0x88aacc : 0x553322 });
        const beak = new THREE.Mesh(beakGeo, beakMat);
        beak.position.set(s * 1.45, s * 0.35, 0);
        group.add(beak);
        // Wings
        const wingMat = new THREE.MeshPhongMaterial({
          color: enemy.color - 0x111111,
          side: THREE.DoubleSide,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.1,
        });
        const wL = new THREE.Mesh(this._createWingGeometry(), wingMat);
        wL.scale.set(s * 0.6, s * 0.6, s * 0.9);
        wL.position.set(0, 0.2 * s, -s * 0.5);
        wL.name = "wingL";
        group.add(wL);
        const wR = new THREE.Mesh(this._createWingGeometry(), wingMat.clone());
        wR.scale.set(s * 0.6, s * 0.6, -s * 0.9);
        wR.position.set(0, 0.2 * s, s * 0.5);
        wR.name = "wingR";
        group.add(wR);
        // Tail feathers
        const tailGeo = new THREE.ConeGeometry(s * 0.2, s * 0.8, 4);
        tailGeo.rotateZ(Math.PI / 2);
        const tailMat = new THREE.MeshPhongMaterial({ color: enemy.color - 0x080808 });
        const tail = new THREE.Mesh(tailGeo, tailMat);
        tail.position.set(-s * 1.1, 0, 0);
        group.add(tail);
        // Eyes — glowing
        const eyeColor = isHarpy ? 0x00ffff : 0xff0000;
        const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });
        for (const z of [-s * 0.15, s * 0.15]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.08, 6, 4), eyeMat);
          eye.position.set(s * 1.2, s * 0.45, z);
          group.add(eye);
        }
        // Harpy: lightning crackling around body
        if (isHarpy) {
          const sparkMat = new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.5 });
          for (let i = 0; i < 3; i++) {
            const spark = new THREE.Mesh(new THREE.SphereGeometry(s * 0.06, 4, 3), sparkMat);
            spark.position.set(
              (Math.random() - 0.5) * s * 1.5,
              (Math.random() - 0.5) * s * 0.5,
              (Math.random() - 0.5) * s * 0.8,
            );
            group.add(spark);
          }
        }
        // Raven: shadow wisps
        if (!isHarpy) {
          const wispMat = new THREE.MeshBasicMaterial({ color: 0x220022, transparent: true, opacity: 0.3, depthWrite: false });
          for (let i = 0; i < 2; i++) {
            const wisp = new THREE.Mesh(this._sphereGeo, wispMat);
            wisp.scale.set(s * 0.4, s * 0.15, s * 0.3);
            wisp.position.set(-s * 0.5 - i * s * 0.4, -s * 0.1, (Math.random() - 0.5) * s * 0.4);
            group.add(wisp);
          }
        }
        // Claws
        const clawMat = new THREE.MeshPhongMaterial({ color: isHarpy ? 0x667788 : 0x332211 });
        for (const z of [-s * 0.3, s * 0.3]) {
          const claw = new THREE.Mesh(new THREE.ConeGeometry(s * 0.05, s * 0.25, 3), clawMat);
          claw.position.set(s * 0.2, -s * 0.45, z);
          group.add(claw);
        }
        break;
      }

      case TDEnemyType.CRYSTAL_WYVERN: {
        // Dragon-like with crystalline armor
        const bodyMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          specular: 0x88ccff,
          shininess: 80,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.2,
        });
        const body = new THREE.Mesh(this._sphereGeo, bodyMat);
        body.scale.set(s * 2, s * 0.75, s * 1.1);
        group.add(body);
        // Neck
        const neckGeo = new THREE.CylinderGeometry(s * 0.2, s * 0.35, s * 0.8, 6);
        const neck = new THREE.Mesh(neckGeo, bodyMat.clone());
        neck.position.set(s * 1.5, s * 0.3, 0);
        neck.rotation.z = -0.6;
        group.add(neck);
        // Head
        const headMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          specular: 0xaaddff,
          shininess: 90,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.25,
        });
        const head = new THREE.Mesh(this._sphereGeo, headMat);
        head.scale.set(s * 0.5, s * 0.35, s * 0.4);
        head.position.set(s * 2, s * 0.5, 0);
        group.add(head);
        // Jaw
        const jawGeo = new THREE.ConeGeometry(s * 0.15, s * 0.4, 4);
        jawGeo.rotateZ(-Math.PI / 2);
        const jaw = new THREE.Mesh(jawGeo, headMat.clone());
        jaw.position.set(s * 2.4, s * 0.35, 0);
        group.add(jaw);
        // Crystal spines — more detailed with varying sizes
        const spineMat = new THREE.MeshPhongMaterial({
          color: 0x88ddff,
          transparent: true,
          opacity: 0.75,
          specular: 0xffffff,
          shininess: 100,
          emissive: 0x2266aa,
          emissiveIntensity: 0.2,
        });
        for (let i = 0; i < 6; i++) {
          const spineH = s * (0.3 + Math.random() * 0.4);
          const spine = new THREE.Mesh(this._coneGeo, spineMat.clone());
          spine.scale.set(s * 0.12, spineH, s * 0.12);
          spine.position.set(-s * 0.6 + i * s * 0.4, s * 0.5 + Math.sin(i) * s * 0.1, 0);
          spine.rotation.z = (Math.random() - 0.5) * 0.3;
          group.add(spine);
        }
        // Crystal wing membranes
        const wingMat = new THREE.MeshPhongMaterial({
          color: 0x6699cc,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          emissive: 0x224488,
          emissiveIntensity: 0.15,
        });
        const wL = new THREE.Mesh(this._createWingGeometry(), wingMat);
        wL.scale.set(s * 0.5, s * 0.5, s * 0.7);
        wL.position.set(0, s * 0.3, -s * 0.6);
        wL.name = "wingL";
        group.add(wL);
        const wR = new THREE.Mesh(this._createWingGeometry(), wingMat.clone());
        wR.scale.set(s * 0.5, s * 0.5, -s * 0.7);
        wR.position.set(0, s * 0.3, s * 0.6);
        wR.name = "wingR";
        group.add(wR);
        // Tail
        const tailMat = new THREE.MeshPhongMaterial({ color: enemy.color, specular: 0x88ccff, shininess: 60 });
        const tail = new THREE.Mesh(this._coneGeo, tailMat);
        tail.scale.set(s * 0.2, s * 1.5, s * 0.2);
        tail.rotation.z = Math.PI / 2;
        tail.position.set(-s * 2, 0, 0);
        group.add(tail);
        // Eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x44eeff });
        for (const z of [-s * 0.15, s * 0.15]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.08, 6, 4), eyeMat);
          eye.position.set(s * 2.2, s * 0.55, z);
          group.add(eye);
        }
        break;
      }

      case TDEnemyType.EMBER_PHOENIX: {
        // Fiery bird with blazing plumage
        const bodyMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
        const body = new THREE.Mesh(this._sphereGeo, bodyMat);
        body.scale.set(s * 1.1, s * 0.65, s * 0.65);
        body.name = "phoenixBody";
        group.add(body);
        // Inner white-hot core
        const innerMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
        const inner = new THREE.Mesh(this._sphereGeo, innerMat);
        inner.scale.set(s * 0.55, s * 0.3, s * 0.3);
        group.add(inner);
        // Head
        const headMat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
        const head = new THREE.Mesh(this._sphereGeo, headMat);
        head.scale.set(s * 0.3, s * 0.25, s * 0.25);
        head.position.set(s * 0.9, s * 0.2, 0);
        group.add(head);
        // Beak
        const beakGeo = new THREE.ConeGeometry(s * 0.06, s * 0.25, 3);
        beakGeo.rotateZ(-Math.PI / 2);
        const beak = new THREE.Mesh(beakGeo, new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
        beak.position.set(s * 1.15, s * 0.15, 0);
        group.add(beak);
        // Fire wings
        const fireWingMat = new THREE.MeshBasicMaterial({
          color: 0xff4400,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const fwL = new THREE.Mesh(this._createWingGeometry(), fireWingMat);
        fwL.scale.set(s * 0.5, s * 0.5, s * 0.7);
        fwL.position.set(0, s * 0.2, -s * 0.4);
        fwL.name = "wingL";
        group.add(fwL);
        const fwR = new THREE.Mesh(this._createWingGeometry(), fireWingMat.clone());
        fwR.scale.set(s * 0.5, s * 0.5, -s * 0.7);
        fwR.position.set(0, s * 0.2, s * 0.4);
        fwR.name = "wingR";
        group.add(fwR);
        // Tail flame plumes
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.6, depthWrite: false });
        for (let i = 0; i < 3; i++) {
          const flame = new THREE.Mesh(this._coneGeo, flameMat.clone());
          flame.scale.set(s * 0.15, s * (0.5 + i * 0.2), s * 0.15);
          flame.rotation.z = Math.PI / 2 + (i - 1) * 0.2;
          flame.position.set(-s * 0.9 - i * s * 0.15, (i - 1) * s * 0.15, 0);
          group.add(flame);
        }
        // Ember particles (static decorative spheres)
        const emberMat = new THREE.MeshBasicMaterial({ color: 0xffaa22 });
        for (let i = 0; i < 5; i++) {
          const ember = new THREE.Mesh(new THREE.SphereGeometry(s * 0.04, 4, 3), emberMat);
          ember.position.set(
            (Math.random() - 0.5) * s * 2,
            (Math.random() - 0.5) * s * 0.8,
            (Math.random() - 0.5) * s * 0.8,
          );
          group.add(ember);
        }
        // Eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff88 });
        for (const z of [-s * 0.1, s * 0.1]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.06, 4, 3), eyeMat);
          eye.position.set(s * 1.0, s * 0.25, z);
          group.add(eye);
        }
        break;
      }

      case TDEnemyType.VOID_WRAITH:
      case TDEnemyType.SPECTRAL_KNIGHT: {
        const isKnight = enemy.type === TDEnemyType.SPECTRAL_KNIGHT;
        // Ghostly robed figure with details
        const bodyMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.8,
        });
        const body = new THREE.Mesh(this._coneGeo, bodyMat);
        body.scale.set(s * 0.85, s * 1.6, s * 0.85);
        body.position.y = s * 0.5;
        group.add(body);
        // Shoulders (wider for knight)
        if (isKnight) {
          const shoulderMat = new THREE.MeshPhongMaterial({
            color: enemy.color + 0x111111,
            emissive: enemy.glowColor,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.85,
          });
          for (const z of [-1, 1]) {
            const shoulder = new THREE.Mesh(this._boxGeo, shoulderMat);
            shoulder.scale.set(s * 0.35, s * 0.25, s * 0.4);
            shoulder.position.set(0, s * 1.2, z * s * 0.55);
            group.add(shoulder);
          }
          // Shield
          const shieldGeo = new THREE.PlaneGeometry(s * 0.6, s * 0.8);
          const shieldMat = new THREE.MeshPhongMaterial({
            color: 0x334455,
            emissive: enemy.glowColor,
            emissiveIntensity: 0.1,
            side: THREE.DoubleSide,
          });
          const shield = new THREE.Mesh(shieldGeo, shieldMat);
          shield.position.set(s * 0.3, s * 0.9, -s * 0.6);
          shield.rotation.y = 0.3;
          group.add(shield);
          // Sword
          const swordGeo = new THREE.BoxGeometry(s * 0.05, s * 1.2, s * 0.1);
          const swordMat = new THREE.MeshPhongMaterial({ color: 0x8899aa, specular: 0xffffff, shininess: 100 });
          const sword = new THREE.Mesh(swordGeo, swordMat);
          sword.position.set(s * 0.3, s * 1.0, s * 0.5);
          sword.rotation.x = -0.3;
          group.add(sword);
        }
        // Head with hood
        const hoodMat = new THREE.MeshPhongMaterial({
          color: enemy.color - 0x050505,
          transparent: true,
          opacity: 0.85,
        });
        const hood = new THREE.Mesh(this._sphereGeo, hoodMat);
        hood.scale.set(s * 0.45, s * 0.5, s * 0.45);
        hood.position.y = s * 1.5;
        group.add(hood);
        // Glowing face/eyes
        const faceMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor });
        for (const z of [-s * 0.12, s * 0.12]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.06, 4, 3), faceMat);
          eye.position.set(s * 0.2, s * 1.55, z);
          group.add(eye);
        }
        // Wispy trailing robe edges
        const wispMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
        });
        for (let i = 0; i < 3; i++) {
          const wisp = new THREE.Mesh(this._sphereGeo, wispMat);
          wisp.scale.set(s * 0.25, s * 0.6, s * 0.25);
          wisp.position.set(
            -s * 0.2 + (Math.random() - 0.5) * s * 0.3,
            -s * 0.3 - i * s * 0.15,
            (Math.random() - 0.5) * s * 0.4,
          );
          group.add(wisp);
        }
        break;
      }

      case TDEnemyType.ARCANE_ORB: {
        // Core orb with layered glow
        const orbMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor });
        const orb = new THREE.Mesh(this._sphereGeo, orbMat);
        orb.scale.set(s * 0.5, s * 0.5, s * 0.5);
        group.add(orb);
        // Inner bright core
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const core = new THREE.Mesh(this._sphereGeo, coreMat);
        core.scale.set(s * 0.2, s * 0.2, s * 0.2);
        group.add(core);
        // Outer translucent shell
        const shellMat = new THREE.MeshPhongMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
          specular: 0xffffff,
          shininess: 100,
        });
        const shell = new THREE.Mesh(this._sphereGeo, shellMat);
        shell.scale.set(s * 0.75, s * 0.75, s * 0.75);
        group.add(shell);
        // Multiple orbiting rings
        const ringMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor, transparent: true, opacity: 0.4 });
        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(s * 0.8, 0.04, 8, 20), ringMat);
        ring1.name = "ring";
        group.add(ring1);
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(s * 0.65, 0.03, 8, 16), ringMat.clone());
        ring2.rotation.x = Math.PI / 2;
        ring2.name = "ring2";
        group.add(ring2);
        // Orbiting motes
        for (let i = 0; i < 4; i++) {
          const mote = new THREE.Mesh(new THREE.SphereGeometry(s * 0.06, 4, 3), new THREE.MeshBasicMaterial({ color: enemy.glowColor }));
          const angle = (i / 4) * Math.PI * 2;
          mote.position.set(Math.cos(angle) * s * 0.8, Math.sin(angle) * s * 0.3, Math.sin(angle) * s * 0.8);
          group.add(mote);
        }
        break;
      }

      case TDEnemyType.DARK_TOWER:
      case TDEnemyType.CANNON_FORT: {
        const isFort = enemy.type === TDEnemyType.CANNON_FORT;
        // Tower base — tapered
        const towerMat = new THREE.MeshPhongMaterial({ color: enemy.color, flatShading: true });
        const baseMat = new THREE.MeshPhongMaterial({ color: enemy.color - 0x080808, flatShading: true });
        // Foundation
        const foundation = new THREE.Mesh(this._boxGeo, baseMat);
        foundation.scale.set(s * 1.3, s * 0.5, s * 1.3);
        foundation.position.y = s * 0.25;
        group.add(foundation);
        // Main tower body
        const tower = new THREE.Mesh(this._boxGeo, towerMat);
        tower.scale.set(s * 0.9, s * 2.5, s * 0.9);
        tower.position.y = s * 1.75;
        group.add(tower);
        // Battlements / crenellations at top
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          const merlon = new THREE.Mesh(this._boxGeo, towerMat.clone());
          merlon.scale.set(s * 0.2, s * 0.3, s * 0.2);
          merlon.position.set(
            Math.cos(angle) * s * 0.4,
            s * 3.15,
            Math.sin(angle) * s * 0.4,
          );
          group.add(merlon);
        }
        // Window slits
        const windowMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor });
        for (let i = 0; i < 2; i++) {
          const win = new THREE.Mesh(this._boxGeo, windowMat);
          win.scale.set(s * 0.06, s * 0.2, s * 0.01);
          win.position.set(s * 0.46, s * 1.5 + i * s * 0.7, 0);
          group.add(win);
        }
        // Top orb — magical energy
        const topMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor });
        const top = new THREE.Mesh(this._sphereGeo, topMat);
        top.scale.set(s * 0.35, s * 0.35, s * 0.35);
        top.position.y = s * 3.4;
        top.name = "topOrb";
        group.add(top);
        // Fort: cannon barrels
        if (isFort) {
          const cannonMat = new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 60 });
          for (const z of [-s * 0.3, s * 0.3]) {
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.08, s * 0.1, s * 0.8, 8), cannonMat);
            barrel.rotation.z = Math.PI / 2;
            barrel.position.set(s * 0.8, s * 1.5, z);
            group.add(barrel);
          }
        }
        // Dark tower: ominous floating runes around it
        if (!isFort) {
          const runeMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor, transparent: true, opacity: 0.4 });
          for (let i = 0; i < 3; i++) {
            const rune = new THREE.Mesh(new THREE.TorusGeometry(s * 0.15, s * 0.02, 4, 6), runeMat);
            const angle = (i / 3) * Math.PI * 2;
            rune.position.set(Math.cos(angle) * s * 0.7, s * 1.5 + i * s * 0.5, Math.sin(angle) * s * 0.7);
            rune.rotation.set(Math.random(), Math.random(), Math.random());
            group.add(rune);
          }
        }
        break;
      }

      case TDEnemyType.SIEGE_GOLEM: {
        // Blocky golem with armored plates and rune markings
        const bodyMat = new THREE.MeshPhongMaterial({ color: enemy.color, flatShading: true });
        // Legs
        for (const z of [-s * 0.3, s * 0.3]) {
          const legGeo = new THREE.BoxGeometry(1, 1, 1);
          const leg = new THREE.Mesh(legGeo, bodyMat.clone());
          leg.scale.set(s * 0.4, s * 0.8, s * 0.4);
          leg.position.set(0, s * 0.4, z);
          group.add(leg);
          // Knee joint
          const knee = new THREE.Mesh(this._sphereGeo, bodyMat.clone());
          knee.scale.set(s * 0.2, s * 0.2, s * 0.2);
          knee.position.set(0, s * 0.8, z);
          group.add(knee);
        }
        // Torso — chunky
        const torso = new THREE.Mesh(this._boxGeo, bodyMat);
        torso.scale.set(s * 1.6, s * 1.4, s * 1.3);
        torso.position.y = s * 1.5;
        group.add(torso);
        // Chest plate — slightly different shade
        const plateMat = new THREE.MeshPhongMaterial({
          color: enemy.color + 0x0a0a0a,
          flatShading: true,
          specular: 0x333333,
          shininess: 30,
        });
        const plate = new THREE.Mesh(this._boxGeo, plateMat);
        plate.scale.set(s * 1.2, s * 1.0, s * 0.1);
        plate.position.set(0, s * 1.6, s * 0.65);
        group.add(plate);
        // Arms
        const armMat = new THREE.MeshPhongMaterial({ color: enemy.color - 0x050505, flatShading: true });
        for (const z of [-1, 1]) {
          const upperArm = new THREE.Mesh(this._boxGeo, armMat);
          upperArm.scale.set(s * 0.35, s * 0.8, s * 0.35);
          upperArm.position.set(0, s * 1.6, z * s * 0.85);
          group.add(upperArm);
          const fist = new THREE.Mesh(this._sphereGeo, armMat.clone());
          fist.scale.set(s * 0.25, s * 0.25, s * 0.25);
          fist.position.set(0, s * 1.0, z * s * 0.85);
          group.add(fist);
        }
        // Head
        const headMat = new THREE.MeshPhongMaterial({ color: enemy.color + 0x111111, flatShading: true });
        const head = new THREE.Mesh(this._boxGeo, headMat);
        head.scale.set(s * 0.75, s * 0.65, s * 0.7);
        head.position.y = s * 2.55;
        group.add(head);
        // Eyes — glowing slits
        const eyeMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor });
        for (const z of [-0.18, 0.18]) {
          const eye = new THREE.Mesh(this._boxGeo, eyeMat);
          eye.scale.set(s * 0.08, s * 0.04, s * 0.15);
          eye.position.set(s * 0.38, s * 2.6, z * s);
          group.add(eye);
        }
        // Rune markings — glowing symbols on chest
        const runeMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor, transparent: true, opacity: 0.5 });
        const rune = new THREE.Mesh(new THREE.TorusGeometry(s * 0.2, s * 0.025, 4, 6), runeMat);
        rune.position.set(0, s * 1.7, s * 0.72);
        rune.rotation.y = Math.PI / 2;
        group.add(rune);
        break;
      }

      default:
        // Bosses and fallback
        if (enemy.isBoss) {
          this._buildBossMesh(group, enemy);
        } else {
          const mat = new THREE.MeshPhongMaterial({ color: enemy.color, emissive: enemy.glowColor, emissiveIntensity: 0.2 });
          const mesh = new THREE.Mesh(this._sphereGeo, mat);
          mesh.scale.set(s, s, s);
          group.add(mesh);
        }
    }

    // Elite golden glow
    if ((enemy as any).isElite) {
      const eliteLight = new THREE.PointLight(0xffd700, 3, 8);
      eliteLight.name = "eliteGlow";
      group.add(eliteLight);

      // Golden ring indicator
      const ringGeo = new THREE.RingGeometry(enemy.size * 1.2, enemy.size * 1.4, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.name = "eliteRing";
      group.add(ring);
    }

    return group;
  }

  private _buildBossMesh(group: THREE.Group, enemy: TDEnemy): void {
    const s = enemy.size;

    switch (enemy.type) {
      case TDEnemyType.BOSS_ANCIENT_DRAGON: {
        // Massive dragon with detailed body, scales, jaw, and spines
        const bodyMat = new THREE.MeshPhongMaterial({
          color: 0x881100,
          emissive: 0xff4400,
          emissiveIntensity: 0.15,
          flatShading: true,
          specular: 0x442200,
          shininess: 30,
        });
        const underbellyMat = new THREE.MeshPhongMaterial({
          color: 0xaa4422,
          emissive: 0xff6600,
          emissiveIntensity: 0.1,
          flatShading: true,
        });

        // Main body — elongated torso
        const body = new THREE.Mesh(this._sphereGeo, bodyMat);
        body.scale.set(s * 2.2, s * 0.85, s * 1.3);
        group.add(body);

        // Underbelly (lighter plate)
        const belly = new THREE.Mesh(this._sphereGeo, underbellyMat);
        belly.scale.set(s * 1.8, s * 0.4, s * 1.0);
        belly.position.set(0, -s * 0.35, 0);
        group.add(belly);

        // Scale plates along spine — row of overlapping bumps
        const scaleMat = new THREE.MeshPhongMaterial({
          color: 0x661000,
          emissive: 0xff3300,
          emissiveIntensity: 0.08,
          flatShading: true,
          specular: 0x553311,
          shininess: 50,
        });
        for (let i = 0; i < 10; i++) {
          const scaleGeo = new THREE.SphereGeometry(s * (0.18 + Math.sin(i * 0.5) * 0.05), 5, 3);
          const scalePlate = new THREE.Mesh(scaleGeo, scaleMat.clone());
          scalePlate.scale.set(1, 0.5, 1.3);
          scalePlate.position.set(-s * 1.5 + i * s * 0.35, s * 0.55 + Math.sin(i * 0.6) * s * 0.05, 0);
          group.add(scalePlate);
        }

        // Neck — thicker, muscular
        const neckGeo = new THREE.CylinderGeometry(s * 0.25, s * 0.4, s * 1.2, 8);
        const neck = new THREE.Mesh(neckGeo, bodyMat.clone());
        neck.position.set(s * 1.8, s * 0.35, 0);
        neck.rotation.z = -0.55;
        group.add(neck);

        // Head — larger, more angular
        const headMat = new THREE.MeshPhongMaterial({
          color: 0x771000,
          emissive: 0xff4400,
          emissiveIntensity: 0.2,
          flatShading: true,
          specular: 0x664422,
          shininess: 40,
        });
        const head = new THREE.Mesh(this._sphereGeo, headMat);
        head.scale.set(s * 0.9, s * 0.55, s * 0.65);
        head.position.set(s * 2.5, s * 0.55, 0);
        group.add(head);

        // Snout / upper jaw — elongated cone
        const snoutGeo = new THREE.ConeGeometry(s * 0.22, s * 0.7, 5);
        snoutGeo.rotateZ(-Math.PI / 2);
        const snout = new THREE.Mesh(snoutGeo, headMat.clone());
        snout.position.set(s * 3.15, s * 0.52, 0);
        group.add(snout);

        // Lower jaw — hinged-looking jaw piece
        const jawMat = new THREE.MeshPhongMaterial({
          color: 0x881100,
          emissive: 0xff2200,
          emissiveIntensity: 0.12,
          flatShading: true,
        });
        const jawGeo = new THREE.ConeGeometry(s * 0.18, s * 0.55, 4);
        jawGeo.rotateZ(-Math.PI / 2);
        const jaw = new THREE.Mesh(jawGeo, jawMat);
        jaw.position.set(s * 3.0, s * 0.22, 0);
        jaw.name = "dragonJaw";
        group.add(jaw);

        // Teeth — small spikes along upper and lower jaw
        const toothMat = new THREE.MeshPhongMaterial({ color: 0xeeddcc, specular: 0xffffff, shininess: 80 });
        for (let t = 0; t < 5; t++) {
          const toothSize = s * (0.04 + Math.random() * 0.03);
          for (const yOff of [0.58, 0.28]) {
            const tooth = new THREE.Mesh(
              new THREE.ConeGeometry(toothSize, toothSize * 3, 3),
              toothMat,
            );
            tooth.position.set(
              s * 2.7 + t * s * 0.12,
              s * yOff + (yOff < 0.4 ? toothSize * 1.2 : -toothSize * 1.2),
              (Math.random() - 0.5) * s * 0.15,
            );
            tooth.rotation.z = yOff < 0.4 ? 0 : Math.PI;
            group.add(tooth);
          }
        }

        // Fire glow inside mouth
        const mouthGlowMat = new THREE.MeshBasicMaterial({
          color: 0xff4400,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        });
        const mouthGlow = new THREE.Mesh(
          new THREE.SphereGeometry(s * 0.15, 6, 4),
          mouthGlowMat,
        );
        mouthGlow.position.set(s * 2.8, s * 0.4, 0);
        mouthGlow.name = "mouthGlow";
        group.add(mouthGlow);

        // Horns — larger and curved-looking (two pairs)
        const hornMat = new THREE.MeshPhongMaterial({ color: 0x553300, specular: 0x332211, shininess: 60 });
        for (const z of [-0.3, 0.3]) {
          // Main horns
          const horn = new THREE.Mesh(this._coneGeo, hornMat);
          horn.scale.set(s * 0.12, s * 0.9, s * 0.12);
          horn.position.set(s * 2.3, s * 0.9, z * s);
          horn.rotation.z = z > 0 ? 0.2 : -0.2;
          horn.rotation.x = z * 0.3;
          group.add(horn);
          // Secondary smaller horn
          const horn2 = new THREE.Mesh(this._coneGeo, hornMat.clone());
          horn2.scale.set(s * 0.08, s * 0.5, s * 0.08);
          horn2.position.set(s * 2.0, s * 0.85, z * s * 0.7);
          horn2.rotation.z = z > 0 ? 0.35 : -0.35;
          group.add(horn2);
        }

        // Brow ridges
        const browMat = new THREE.MeshPhongMaterial({ color: 0x661000, flatShading: true });
        for (const z of [-0.2, 0.2]) {
          const brow = new THREE.Mesh(this._boxGeo, browMat);
          brow.scale.set(s * 0.25, s * 0.08, s * 0.12);
          brow.position.set(s * 2.6, s * 0.72, z * s);
          group.add(brow);
        }

        // Fire eyes — larger with glow
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        for (const z of [-0.2, 0.2]) {
          const eye = new THREE.Mesh(this._sphereGeo, eyeMat);
          eye.scale.set(s * 0.12, s * 0.15, s * 0.12);
          eye.position.set(s * 2.65, s * 0.65, z * s);
          group.add(eye);
          // Eye glow light
          const eyeLight = new THREE.PointLight(0xff4400, 1, s * 2);
          eyeLight.position.copy(eye.position);
          group.add(eyeLight);
        }

        // Spines along the back — taller and more aggressive
        const spineMat = new THREE.MeshPhongMaterial({
          color: 0x553300,
          emissive: 0xff2200,
          emissiveIntensity: 0.05,
          flatShading: true,
        });
        for (let i = 0; i < 8; i++) {
          const spineH = s * (0.4 + Math.sin(i * 0.7) * 0.15 + (i < 4 ? 0.2 : 0));
          const spine = new THREE.Mesh(this._coneGeo, spineMat.clone());
          spine.scale.set(s * 0.06, spineH, s * 0.04);
          spine.position.set(s * 1.5 - i * s * 0.45, s * 0.7 + Math.sin(i) * s * 0.05, 0);
          spine.rotation.z = -0.15 + (Math.random() - 0.5) * 0.1;
          group.add(spine);
        }

        // Tail — segmented with tail blade
        const tailMat = new THREE.MeshPhongMaterial({ color: 0x770a00, flatShading: true });
        // Thick tail base
        const tailBase = new THREE.Mesh(this._coneGeo, tailMat);
        tailBase.scale.set(s * 0.35, s * 1.8, s * 0.35);
        tailBase.rotation.z = Math.PI / 2;
        tailBase.position.set(-s * 2.0, 0, 0);
        group.add(tailBase);
        // Tail mid
        const tailMid = new THREE.Mesh(this._coneGeo, tailMat.clone());
        tailMid.scale.set(s * 0.2, s * 1.5, s * 0.2);
        tailMid.rotation.z = Math.PI / 2;
        tailMid.position.set(-s * 3.5, -s * 0.1, 0);
        group.add(tailMid);
        // Tail blade/spike
        const bladeMat = new THREE.MeshPhongMaterial({ color: 0x553300, specular: 0x442211, shininess: 60, flatShading: true });
        const tailBlade = new THREE.Mesh(
          new THREE.ConeGeometry(s * 0.3, s * 0.6, 3),
          bladeMat,
        );
        tailBlade.rotation.z = Math.PI / 2;
        tailBlade.position.set(-s * 4.5, -s * 0.15, 0);
        group.add(tailBlade);

        // Legs / claws — stubby but visible
        const legMat = new THREE.MeshPhongMaterial({ color: 0x661000, flatShading: true });
        const clawMat2 = new THREE.MeshPhongMaterial({ color: 0x332200 });
        for (const side of [-1, 1]) {
          for (const xOff of [s * 0.8, -s * 0.5]) {
            const leg = new THREE.Mesh(
              new THREE.CylinderGeometry(s * 0.12, s * 0.18, s * 0.8, 5),
              legMat,
            );
            leg.position.set(xOff, -s * 0.7, side * s * 0.7);
            group.add(leg);
            // Claws
            for (let c = -1; c <= 1; c++) {
              const claw = new THREE.Mesh(
                new THREE.ConeGeometry(s * 0.04, s * 0.2, 3),
                clawMat2,
              );
              claw.position.set(xOff + c * s * 0.06, -s * 1.15, side * s * 0.7);
              claw.rotation.z = c * 0.3;
              group.add(claw);
            }
          }
        }

        // --- Detailed dragon wings ---
        // Wing membrane material: semi-transparent with boss glow color
        const membraneMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.25,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          flatShading: true,
        });
        // Wing bone material
        const boneMat = new THREE.MeshPhongMaterial({
          color: 0x553300,
          emissive: 0xff4400,
          emissiveIntensity: 0.1,
        });

        // Build each wing (left = -z, right = +z)
        for (const side of [-1, 1]) {
          const wingRoot = new THREE.Group();
          wingRoot.position.set(s * 0.2, s * 0.5, side * s * 0.9);
          wingRoot.name = side < 0 ? "dragonWingL" : "dragonWingR";

          // Upper arm bone
          const upperArm = new THREE.Group();
          upperArm.name = side < 0 ? "upperArmL" : "upperArmR";
          const upperBone = new THREE.Mesh(
            new THREE.CylinderGeometry(s * 0.08, s * 0.12, s * 2.5, 6),
            boneMat.clone()
          );
          upperBone.rotation.x = side * 0.2;
          upperBone.rotation.z = Math.PI / 2;
          upperBone.position.set(0, 0, side * s * 1.2);
          upperArm.add(upperBone);

          // Forearm bone
          const forearm = new THREE.Group();
          forearm.position.set(0, 0, side * s * 2.4);
          forearm.name = side < 0 ? "forearmL" : "forearmR";
          const forearmBone = new THREE.Mesh(
            new THREE.CylinderGeometry(s * 0.06, s * 0.09, s * 2.0, 6),
            boneMat.clone()
          );
          forearmBone.rotation.x = side * 0.3;
          forearmBone.rotation.z = Math.PI / 2;
          forearmBone.position.set(0, 0, side * s * 1.0);
          forearm.add(forearmBone);

          // 4 finger bones extending from the forearm tip
          const fingerAngles = [0.0, 0.25, 0.55, 0.85];
          const fingerLengths = [s * 2.8, s * 2.4, s * 1.8, s * 1.2];

          for (let f = 0; f < 4; f++) {
            const angle = fingerAngles[f] * side;
            const len = fingerLengths[f];
            const fingerBone = new THREE.Mesh(
              new THREE.CylinderGeometry(s * 0.03, s * 0.05, len, 5),
              boneMat.clone()
            );
            fingerBone.rotation.z = Math.PI / 2;
            fingerBone.rotation.x = angle;
            fingerBone.position.set(
              -len * 0.3,
              Math.sin(angle) * len * 0.4,
              side * (s * 1.8 + Math.cos(angle) * len * 0.4)
            );
            fingerBone.name = `finger${f}`;
            forearm.add(fingerBone);
          }

          // Wing membrane: triangular fan panels stretched between finger bones
          // Build as a single BufferGeometry with multiple triangles
          const memVerts: number[] = [];
          // Shoulder (root) position in wing-local space
          const rootX = 0, rootY = 0, rootZ = 0;
          // Points along fingers (tips)
          const fingerTips: [number, number, number][] = [];
          for (let f = 0; f < 4; f++) {
            const angle = fingerAngles[f] * side;
            const len = fingerLengths[f];
            fingerTips.push([
              -len * 0.7,
              Math.sin(angle) * len * 0.8,
              side * (s * 3.5 + Math.cos(angle) * len * 0.5)
            ]);
          }
          // Also add the forearm elbow and tip as anchor points
          const elbowPt: [number, number, number] = [0, 0, side * s * 0.3];
          const forearmTip: [number, number, number] = [0, 0, side * s * 2.0];

          // Membrane from root to first finger tip, through each finger
          // Panel: root -> elbow -> forearmTip
          memVerts.push(rootX, rootY, rootZ);
          memVerts.push(...elbowPt);
          memVerts.push(...forearmTip);

          // Panel: forearmTip -> first finger tip -> root (inner membrane)
          memVerts.push(...forearmTip);
          memVerts.push(...fingerTips[0]);
          memVerts.push(rootX, rootY, rootZ);

          // Panels between consecutive finger tips
          for (let f = 0; f < fingerTips.length - 1; f++) {
            // Triangle: forearmTip -> fingerTip[f] -> fingerTip[f+1]
            memVerts.push(...forearmTip);
            memVerts.push(...fingerTips[f]);
            memVerts.push(...fingerTips[f + 1]);
            // Extra triangle to fill: fingerTip[f] -> fingerTip[f+1] -> midpoint
            const midX = (fingerTips[f][0] + fingerTips[f + 1][0]) * 0.5;
            const midY = (fingerTips[f][1] + fingerTips[f + 1][1]) * 0.5 - s * 0.3;
            const midZ = (fingerTips[f][2] + fingerTips[f + 1][2]) * 0.5;
            memVerts.push(...fingerTips[f]);
            memVerts.push(...fingerTips[f + 1]);
            memVerts.push(midX, midY, midZ);
          }

          // Trailing membrane from last finger back to body
          const lastTip = fingerTips[fingerTips.length - 1];
          memVerts.push(...lastTip);
          memVerts.push(rootX, rootY - s * 0.3, rootZ);
          memVerts.push(rootX, rootY, rootZ);

          const memGeo = new THREE.BufferGeometry();
          memGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(memVerts), 3));
          memGeo.computeVertexNormals();
          const membrane = new THREE.Mesh(memGeo, membraneMat.clone());
          membrane.name = `membrane${side < 0 ? "L" : "R"}`;
          forearm.add(membrane);

          upperArm.add(forearm);
          wingRoot.add(upperArm);
          group.add(wingRoot);
        }
        break;
      }

      case TDEnemyType.BOSS_STORM_COLOSSUS: {
        // Giant humanoid of storm energy — more detailed and menacing
        const bodyMat = new THREE.MeshPhongMaterial({
          color: 0x003355,
          emissive: 0x00ccff,
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 0.85,
          flatShading: true,
        });
        // Torso
        const body = new THREE.Mesh(this._sphereGeo, bodyMat);
        body.scale.set(s * 1.6, s * 2.5, s * 1.3);
        group.add(body);

        // Armored chest plate
        const armorMat = new THREE.MeshPhongMaterial({
          color: 0x113355,
          emissive: 0x0088cc,
          emissiveIntensity: 0.15,
          specular: 0x44aaff,
          shininess: 60,
          flatShading: true,
        });
        const chest = new THREE.Mesh(this._boxGeo, armorMat);
        chest.scale.set(s * 1.4, s * 1.5, s * 0.5);
        chest.position.set(0, s * 0.5, s * 0.5);
        group.add(chest);

        // Arms
        for (const side of [-1, 1]) {
          const arm = new THREE.Mesh(
            new THREE.CylinderGeometry(s * 0.3, s * 0.4, s * 2.5, 6),
            bodyMat.clone(),
          );
          arm.position.set(0, s * 0.5, side * s * 1.5);
          arm.rotation.x = side * 0.3;
          group.add(arm);
          // Fist
          const fist = new THREE.Mesh(this._sphereGeo, armorMat.clone());
          fist.scale.set(s * 0.4, s * 0.4, s * 0.4);
          fist.position.set(0, -s * 0.8, side * s * 1.5);
          group.add(fist);
        }

        // Head — skull-like face
        const headMat3 = bodyMat.clone();
        const head = new THREE.Mesh(this._sphereGeo, headMat3);
        head.scale.set(s * 0.75, s * 0.75, s * 0.7);
        head.position.y = s * 2.8;
        group.add(head);

        // Jaw
        const jawGeo3 = new THREE.BoxGeometry(s * 0.5, s * 0.2, s * 0.5);
        const jaw3 = new THREE.Mesh(jawGeo3, armorMat.clone());
        jaw3.position.set(s * 0.15, s * 2.4, 0);
        group.add(jaw3);

        // Lightning eyes — larger, more menacing
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ccff });
        for (const z of [-0.25, 0.25]) {
          const eye = new THREE.Mesh(this._sphereGeo, eyeMat);
          eye.scale.set(s * 0.18, s * 0.22, s * 0.18);
          eye.position.set(s * 0.35, s * 2.95, z * s);
          group.add(eye);
          // Eye glow
          const eLight = new THREE.PointLight(0x00ccff, 1.5, s * 2);
          eLight.position.copy(eye.position);
          group.add(eLight);
        }

        // Storm crown
        const crownGeo = new THREE.TorusGeometry(s * 0.9, s * 0.08, 6, 12);
        const crownMat = new THREE.MeshBasicMaterial({
          color: 0x00ccff,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        });
        const crown = new THREE.Mesh(crownGeo, crownMat);
        crown.position.y = s * 3.3;
        crown.rotation.x = Math.PI / 2;
        crown.name = "halo";
        group.add(crown);

        // Lightning crackling arcs
        const sparkMat2 = new THREE.MeshBasicMaterial({ color: 0x44eeff, transparent: true, opacity: 0.5 });
        for (let i = 0; i < 6; i++) {
          const spark = new THREE.Mesh(new THREE.SphereGeometry(s * 0.08, 4, 3), sparkMat2.clone());
          spark.position.set(
            (Math.random() - 0.5) * s * 2,
            s * 0.5 + Math.random() * s * 2.5,
            (Math.random() - 0.5) * s * 1.5,
          );
          group.add(spark);
        }
        break;
      }

      case TDEnemyType.BOSS_DEATH_KNIGHT: {
        // Floating armored figure
        const armorMat = new THREE.MeshPhongMaterial({
          color: 0x110033,
          specular: 0x9900ff,
          shininess: 50,
          emissive: 0x9900ff,
          emissiveIntensity: 0.15,
        });
        const body = new THREE.Mesh(this._coneGeo, armorMat);
        body.scale.set(s, s * 2, s);
        body.position.y = s;
        group.add(body);
        // Shoulders
        const shoulderMat = new THREE.MeshPhongMaterial({ color: 0x220044 });
        for (const z of [-1, 1]) {
          const shoulder = new THREE.Mesh(this._boxGeo, shoulderMat);
          shoulder.scale.set(s * 0.5, s * 0.4, s * 0.5);
          shoulder.position.set(0, s * 1.8, z * s * 0.8);
          group.add(shoulder);
        }
        // Head (skull with crown)
        const skullMat = new THREE.MeshPhongMaterial({ color: 0xccbbaa });
        const skull = new THREE.Mesh(this._sphereGeo, skullMat);
        skull.scale.set(s * 0.5, s * 0.5, s * 0.5);
        skull.position.y = s * 2.5;
        group.add(skull);
        // Soul fire eyes
        const fireMat = new THREE.MeshBasicMaterial({ color: 0x9900ff });
        for (const z of [-0.15, 0.15]) {
          const fire = new THREE.Mesh(this._sphereGeo, fireMat);
          fire.scale.set(s * 0.12, s * 0.12, s * 0.12);
          fire.position.set(s * 0.2, s * 2.55, z * s);
          group.add(fire);
        }
        break;
      }

      case TDEnemyType.BOSS_CELESTIAL_HYDRA: {
        // Multi-headed serpent with detailed heads, jaws, and scales
        const bodyMat = new THREE.MeshPhongMaterial({
          color: 0x005533,
          emissive: 0x44ffaa,
          emissiveIntensity: 0.15,
          flatShading: true,
          specular: 0x226644,
          shininess: 35,
        });
        // Main body — larger, more serpentine
        const body = new THREE.Mesh(this._sphereGeo, bodyMat);
        body.scale.set(s * 2.2, s * 1.6, s * 1.6);
        group.add(body);

        // Body scale ridges
        const scaleRidgeMat = new THREE.MeshPhongMaterial({
          color: 0x004422,
          emissive: 0x22aa66,
          emissiveIntensity: 0.08,
          flatShading: true,
        });
        for (let i = 0; i < 6; i++) {
          const ridge = new THREE.Mesh(
            new THREE.SphereGeometry(s * 0.15, 5, 3),
            scaleRidgeMat.clone(),
          );
          ridge.scale.set(1.2, 0.4, 1.5);
          ridge.position.set(-s * 0.8 + i * s * 0.4, s * 1.1, 0);
          group.add(ridge);
        }

        // Three heads with necks, jaws, teeth, and glowing eyes
        for (let i = -1; i <= 1; i++) {
          // Neck — segmented feel
          const neckGeo = new THREE.CylinderGeometry(s * 0.18, s * 0.3, s * 2.2, 6);
          neckGeo.rotateZ(-Math.PI / 4 + i * 0.3);
          const neck = new THREE.Mesh(neckGeo, bodyMat.clone());
          neck.position.set(s * 1.3, s * 1 + i * s * 0.3, i * s * 0.65);
          group.add(neck);

          // Neck rings / bands
          for (let r = 0; r < 3; r++) {
            const ring = new THREE.Mesh(
              new THREE.TorusGeometry(s * 0.22, s * 0.03, 4, 6),
              scaleRidgeMat.clone(),
            );
            const t = r / 3;
            ring.position.set(
              s * 0.8 + t * s * 1.2,
              s * 0.7 + t * s * 0.8 + i * s * (0.15 + t * 0.15),
              i * s * (0.35 + t * 0.2),
            );
            ring.rotation.z = -0.5 + i * 0.2;
            group.add(ring);
          }

          // Head
          const headMat2 = new THREE.MeshPhongMaterial({
            color: 0x006644,
            emissive: 0x44ffaa,
            emissiveIntensity: 0.2,
            flatShading: true,
            specular: 0x228866,
            shininess: 50,
          });
          const hydHead = new THREE.Mesh(this._sphereGeo, headMat2);
          hydHead.scale.set(s * 0.55, s * 0.35, s * 0.4);
          const headX = s * 2.6;
          const headY = s * 1.9 + i * s * 0.55;
          const headZ = i * s * 0.85;
          hydHead.position.set(headX, headY, headZ);
          group.add(hydHead);

          // Upper jaw / snout
          const snoutGeo2 = new THREE.ConeGeometry(s * 0.12, s * 0.4, 4);
          snoutGeo2.rotateZ(-Math.PI / 2);
          const snout2 = new THREE.Mesh(snoutGeo2, headMat2.clone());
          snout2.position.set(headX + s * 0.45, headY + s * 0.05, headZ);
          group.add(snout2);

          // Lower jaw
          const jawGeo2 = new THREE.ConeGeometry(s * 0.10, s * 0.35, 4);
          jawGeo2.rotateZ(-Math.PI / 2);
          const jawMat2 = new THREE.MeshPhongMaterial({
            color: 0x005533,
            emissive: 0x22cc88,
            emissiveIntensity: 0.1,
            flatShading: true,
          });
          const jaw2 = new THREE.Mesh(jawGeo2, jawMat2);
          jaw2.position.set(headX + s * 0.35, headY - s * 0.15, headZ);
          group.add(jaw2);

          // Teeth
          const hydToothMat = new THREE.MeshPhongMaterial({ color: 0xccddcc, specular: 0xffffff, shininess: 80 });
          for (let t = 0; t < 3; t++) {
            const tooth = new THREE.Mesh(
              new THREE.ConeGeometry(s * 0.025, s * 0.08, 3),
              hydToothMat,
            );
            tooth.position.set(
              headX + s * 0.3 + t * s * 0.08,
              headY - s * 0.08,
              headZ + (Math.random() - 0.5) * s * 0.08,
            );
            tooth.rotation.z = Math.PI;
            group.add(tooth);
          }

          // Mouth glow
          const mGlow = new THREE.Mesh(
            new THREE.SphereGeometry(s * 0.08, 5, 3),
            new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.5, depthWrite: false }),
          );
          mGlow.position.set(headX + s * 0.2, headY - s * 0.05, headZ);
          group.add(mGlow);

          // Eyes — two per head, glowing
          const eyeMat2 = new THREE.MeshBasicMaterial({ color: 0x44ffaa });
          for (const eZ of [-0.08, 0.08]) {
            const eye = new THREE.Mesh(this._sphereGeo, eyeMat2);
            eye.scale.set(s * 0.08, s * 0.1, s * 0.08);
            eye.position.set(headX + s * 0.2, headY + s * 0.12, headZ + eZ * s);
            group.add(eye);
          }

          // Head crest / horn
          const crestMat = new THREE.MeshPhongMaterial({ color: 0x337755, flatShading: true });
          const crest = new THREE.Mesh(this._coneGeo, crestMat);
          crest.scale.set(s * 0.06, s * 0.35, s * 0.06);
          crest.position.set(headX - s * 0.1, headY + s * 0.3, headZ);
          group.add(crest);
        }

        // Tail
        const hydTailMat = new THREE.MeshPhongMaterial({ color: 0x004422, flatShading: true });
        const hydTail = new THREE.Mesh(this._coneGeo, hydTailMat);
        hydTail.scale.set(s * 0.4, s * 2.5, s * 0.4);
        hydTail.rotation.z = Math.PI / 2;
        hydTail.position.set(-s * 2.5, 0, 0);
        group.add(hydTail);
        break;
      }

      case TDEnemyType.BOSS_VOID_EMPEROR: {
        // Cosmic entity made of void
        const bodyMat = new THREE.MeshPhongMaterial({
          color: 0x0a0a0a,
          emissive: 0xff00ff,
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.9,
        });
        // Segmented body
        for (let i = 0; i < 6; i++) {
          const seg = new THREE.Mesh(this._sphereGeo, bodyMat.clone());
          const segSize = (6 - i) * s * 0.3 + s * 0.5;
          seg.scale.set(segSize, segSize, segSize);
          seg.position.set(i * s * 0.6, Math.sin(i * 0.5) * s * 0.3, 0);
          seg.name = `seg${i}`;
          group.add(seg);
        }
        // Crown / halo
        const haloGeo = new THREE.TorusGeometry(s * 1.2, s * 0.1, 8, 24);
        const haloMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.4 });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.set(0, s * 1.5, 0);
        halo.rotation.x = Math.PI / 2;
        halo.name = "halo";
        group.add(halo);
        // Void eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
        for (const z of [-0.3, 0.3]) {
          const eye = new THREE.Mesh(this._sphereGeo, eyeMat);
          eye.scale.set(s * 0.25, s * 0.25, s * 0.25);
          eye.position.set(s * 0.5, s * 0.2, z * s);
          group.add(eye);
        }
        break;
      }

      default: {
        const mat = new THREE.MeshPhongMaterial({ color: enemy.color });
        const mesh = new THREE.Mesh(this._sphereGeo, mat);
        mesh.scale.set(s * 2, s * 2, s * 2);
        group.add(mesh);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  render(state: ThreeDragonState, dt: number): void {
    if (!this._renderer) return;

    const time = state.gameTime;

    // Update camera — smooth cinematic follow
    const px = state.player.position.x;
    const py = state.player.position.y;
    const pz = state.player.position.z;
    // Camera trails behind and slightly above, with smooth lerp
    const camTargetX = px * 0.25;
    const camTargetY = py + 7;
    const camTargetZ = pz + 18;
    this._camera.position.x += (camTargetX - this._camera.position.x) * 3 * dt;
    this._camera.position.y += (camTargetY - this._camera.position.y) * 3 * dt;
    this._camera.position.z += (camTargetZ - this._camera.position.z) * 4 * dt;
    // Look ahead of the player
    const lookTarget = new THREE.Vector3(px * 0.4, py - 3, pz - 35);
    this._camera.lookAt(lookTarget);

    // Update sun light to follow
    this._sunLight.position.set(px + 30, 50, pz - 40);
    this._sunLight.target.position.set(px, py, pz - 20);
    this._sunLight.target.updateMatrixWorld();

    // Sky dome follows camera
    this._skyMesh.position.set(px * 0.1, 0, pz);
    (this._skyMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    (this._sunMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    this._sunMesh.position.set(px * 0.1 + 80, 60, pz - 120);
    this._sunMesh.lookAt(this._camera.position);
    this._starField.position.set(0, 0, pz);

    // Moon follows camera on opposite side
    this._moonMesh.position.set(px * 0.05 - 90, 70, pz - 80);
    this._moonMesh.lookAt(this._camera.position);
    (this._moonMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = time;

    // God rays follow sun position
    this._godRays.position.set(px * 0.1 + 60, 35, pz - 100);
    (this._godRays.material as THREE.ShaderMaterial).uniforms.uTime.value = time;

    // Update clouds
    for (const cloud of this._cloudGroup.children) {
      cloud.position.x += (cloud.userData.speed || 1) * dt;
      if (cloud.position.x > 100) cloud.position.x = -100;
      cloud.position.z = pz - 50 + (cloud.position.z % 200);
    }

    // Scroll ground tiles
    const tileSize = 80;
    for (const tile of this._groundTiles) {
      // If tile is behind camera, move it ahead
      while (tile.position.z > pz + tileSize) {
        tile.position.z -= tileSize * this._groundTiles.length;
      }
    }

    // Water follows + animate
    this._waterPlane.position.z = pz;
    if ((this._waterPlane.material as THREE.ShaderMaterial).uniforms) {
      (this._waterPlane.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    }

    // Scroll mountains and trees
    for (const mtn of this._mountains) {
      if (mtn.position.z > pz + 50) {
        mtn.position.z -= 650;
      }
    }
    for (const tree of this._trees) {
      if (tree.position.z > pz + 30) {
        tree.position.z -= 300;
        tree.position.x = (Math.random() - 0.5) * 60;
      }
    }

    // Player world scroll
    state.worldZ -= state.scrollSpeed * dt;
    state.player.position.z = state.worldZ;

    // Update player
    this._updatePlayer(state, dt, time);

    // Update enemies
    this._updateEnemies(state, dt, time);

    // Update boost visual effects (FOV, speed lines, trail)
    this._updateBoostEffects(state, dt, time);

    // Update projectiles
    this._updateProjectiles(state, dt, time);

    // Update explosions
    this._updateExplosionMeshes(state, dt);

    // Update power-ups
    this._updatePowerUpMeshes(state, dt, time);

    // Update screen flashes
    this._updateScreenFlashes(dt);

    // Update fireflies
    for (const fly of this._fireflyGroup.children) {
      const mesh = fly as THREE.Mesh;
      const ud = mesh.userData;
      // Float up and down with drift
      mesh.position.y = ud.baseY + Math.sin(time * ud.speed + ud.phase) * ud.amplitude;
      mesh.position.x += ud.driftX * dt;
      // Blink in and out
      const blink = Math.sin(time * ud.blinkSpeed + ud.blinkPhase);
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, blink * 0.6);
      // Scale pulse
      const s = 0.08 + Math.max(0, blink) * 0.06;
      mesh.scale.setScalar(s);
      // Scroll with world
      if (mesh.position.z > pz + 30) {
        mesh.position.z -= 200;
        mesh.position.x = px + (Math.random() - 0.5) * 50;
      }
    }

    // Update wildlife
    for (const child of this._wildlifeGroup.children) {
      const ud = child.userData;
      if (ud.driftSpeed) {
        // Bird flocks — drift across sky
        child.position.x += ud.driftDir * ud.driftSpeed * dt;
        if (child.position.x > 60) { child.position.x = -60; child.position.z = pz - 50 - Math.random() * 150; }
        if (child.position.x < -60) { child.position.x = 60; child.position.z = pz - 50 - Math.random() * 150; }
        // Animate individual bird wing flaps
        for (const bird of child.children) {
          if (bird.userData.flapPhase !== undefined) {
            const flapAngle = Math.sin(time * bird.userData.flapSpeed + bird.userData.flapPhase) * 0.15;
            bird.rotation.z = flapAngle;
          }
        }
      }
      // Scroll wildlife with world
      if (child.position.z > pz + 50) {
        child.position.z -= 250;
      }
    }

    // Update shockwave rings
    this._shockwaveRings = this._shockwaveRings.filter(ring => {
      ring.timer += dt;
      if (ring.timer < 0) return true; // staggered start
      const t = ring.timer / ring.maxTimer;
      if (t >= 1) {
        this._scene.remove(ring.mesh);
        (ring.mesh.material as THREE.Material).dispose();
        ring.mesh.geometry.dispose();
        return false;
      }
      const eased = 1 - Math.pow(1 - t, 2);
      const scale = eased * ring.maxRadius;
      ring.mesh.scale.set(scale, scale, scale * 0.3);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
      return true;
    });

    // Update debris particles
    this._debrisParticles = this._debrisParticles.filter(dp => {
      dp.timer += dt;
      const t = dp.timer / dp.maxTimer;
      if (t >= 1) {
        this._scene.remove(dp.mesh);
        (dp.mesh.material as THREE.Material).dispose();
        return false;
      }
      dp.mesh.position.x += dp.vx * dt;
      dp.mesh.position.y += (dp.vy - 20 * dp.timer) * dt; // gravity
      dp.mesh.position.z += dp.vz * dt;
      dp.mesh.rotation.x += dp.rotSpeed.x * dt;
      dp.mesh.rotation.y += dp.rotSpeed.y * dt;
      dp.mesh.rotation.z += dp.rotSpeed.z * dt;
      (dp.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.95 * (1 - t * t));
      dp.mesh.scale.multiplyScalar(1 - dt * 1.5);
      return true;
    });

    // Update lightning bolt fade
    this._lightningBolts = this._lightningBolts.filter(lb => {
      lb.timer += dt;
      const t = lb.timer / lb.maxTimer;
      if (t >= 1) {
        lb.group.traverse(child => {
          if ((child as THREE.Line).geometry) (child as THREE.Line).geometry.dispose();
          if ((child as THREE.Line | THREE.Mesh).material) {
            const mat = (child as any).material;
            if (mat.dispose) mat.dispose();
          }
        });
        this._scene.remove(lb.group);
        return false;
      }
      // Fade all materials in the group
      lb.group.traverse(child => {
        const mat = (child as any).material;
        if (mat && 'opacity' in mat) {
          mat.opacity *= (1 - t * 0.5);
        }
      });
      return true;
    });

    // Update hit impact rings
    this._hitRings = this._hitRings.filter(hr => {
      hr.timer += dt;
      const t = hr.timer / hr.maxTimer;
      if (t >= 1) {
        this._scene.remove(hr.mesh);
        (hr.mesh.material as THREE.Material).dispose();
        hr.mesh.geometry.dispose();
        return false;
      }
      const eased = 1 - Math.pow(1 - t, 3);
      const scale = eased * hr.maxScale;
      hr.mesh.scale.setScalar(scale);
      (hr.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
      return true;
    });

    // Atmospheric magic particles — floating sparkles around player area
    if (Math.random() < 0.3) {
      const colors = [
        { r: 0.5, g: 0.7, b: 1.0 },   // soft blue
        { r: 1.0, g: 0.9, b: 0.5 },   // warm gold
        { r: 0.7, g: 0.5, b: 1.0 },   // purple
      ];
      const c = colors[Math.floor(Math.random() * colors.length)];
      this._addTrailPoint(
        state.player.position.x + (Math.random() - 0.5) * 30,
        state.player.position.y + (Math.random() - 0.5) * 15 + 5,
        state.player.position.z + (Math.random() - 0.5) * 40 - 10,
        c.r, c.g, c.b,
        0.08 + Math.random() * 0.12,
      );
    }

    // Fade trail particles
    for (let i = 0; i < this._maxTrailParticles; i++) {
      this._trailSizes[i] *= 0.97;
    }
    (this._trailParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this._trailParticles.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this._trailParticles.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;

    // Render
    this._renderer.render(this._scene, this._camera);
  }

  // ---------------------------------------------------------------------------
  // Update player visuals
  // ---------------------------------------------------------------------------

  private _updatePlayer(state: ThreeDragonState, _dt: number, time: number): void {
    const p = state.player;
    const px = p.position.x;
    const py = p.position.y;
    const pz = p.position.z;

    this._eagleGroup.position.set(px, py, pz);
    // Base rotation faces -Z; bank tilts on the Z axis (roll)
    // Since the group is rotated +PI/2 on Y, banking maps to local Z
    this._eagleGroup.rotation.set(0, Math.PI / 2, p.eagleBankAngle);

    // Wing flap — animate around local X axis (up/down relative to the bird)
    const flapAngle = Math.sin(p.eagleFlapPhase) * 0.45;
    this._eagleWingL.rotation.x = flapAngle;
    this._eagleWingR.rotation.x = flapAngle;

    // Gentle bob
    const bob = Math.sin(time * 2) * 0.25;
    this._eagleBody.position.y = bob;
    this._eagleHead.position.y = 0.4 + bob * 0.5;

    // Slight pitch when moving up/down
    const pitchTarget = state.input.up ? 0.15 : state.input.down ? -0.15 : 0;
    this._eagleGroup.rotation.x += (pitchTarget - this._eagleGroup.rotation.x) * 0.05;

    // Invincibility flicker
    if (p.invincTimer > 0) {
      this._eagleGroup.visible = Math.sin(time * 20) > 0;
    } else {
      this._eagleGroup.visible = true;
    }

    // Wand glow pulse
    const glowPulse = 0.7 + Math.sin(time * 4) * 0.3;
    this._wandGlow.scale.setScalar(0.15 * (1 + glowPulse * 0.3));
    this._wandLight.intensity = 2 + glowPulse * 2;
    this._wandLight.color.setHex(
      p.shieldActive ? 0xffdd88 : 0x88ccff,
    );

    // Point light follows wand
    const wandWorldPos = new THREE.Vector3();
    this._wandGlow.getWorldPosition(wandWorldPos);
    this._pointLight.position.copy(wandWorldPos);
    this._pointLight.color.copy(this._wandLight.color);

    // Shield
    if (p.shieldActive) {
      const shieldPulse = 0.15 + Math.sin(time * 6) * 0.05;
      (this._shieldMesh.material as THREE.MeshBasicMaterial).opacity = shieldPulse;
      this._shieldMesh.scale.setScalar(1 + Math.sin(time * 3) * 0.05);
      this._shieldMesh.rotation.y += 0.02;
    } else {
      (this._shieldMesh.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    // Cape billowing animation
    this._capeMesh.rotation.x = 0.3 + Math.sin(time * 3) * 0.1 + Math.sin(time * 7) * 0.05;
    this._capeMesh.rotation.z = Math.sin(time * 2.5) * 0.08;

    // Eagle feather trail — behind the bird (positive Z in world = behind)
    if (Math.random() < 0.4) {
      const col = new THREE.Color(0xf0ead0);
      this._addTrailPoint(
        px + (Math.random() - 0.5) * 1.5,
        py - 0.5 + Math.random() * 0.5,
        pz + 2 + Math.random() * 1.5,
        col.r, col.g, col.b, 0.3 + Math.random() * 0.3,
      );
    }
    // Wand magic trail — sparkles around wand tip
    if (Math.random() < 0.6) {
      const col = new THREE.Color(0x88ccff);
      this._addTrailPoint(
        wandWorldPos.x + (Math.random() - 0.5) * 0.5,
        wandWorldPos.y + (Math.random() - 0.5) * 0.5,
        wandWorldPos.z + (Math.random() - 0.5) * 0.5,
        col.r, col.g, col.b, 0.2 + Math.random() * 0.3,
      );
    }
    // Golden sparkle trail from crown
    if (Math.random() < 0.15) {
      const col = new THREE.Color(0xffdd44);
      this._addTrailPoint(
        px + (Math.random() - 0.5) * 0.3,
        py + 2.2 + Math.random() * 0.3,
        pz + 0.5 + Math.random() * 0.5,
        col.r, col.g, col.b, 0.15 + Math.random() * 0.15,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Update enemies
  // ---------------------------------------------------------------------------

  private _updateEnemies(state: ThreeDragonState, dt: number, time: number): void {
    const seen = new Set<number>();

    for (const enemy of state.enemies) {
      seen.add(enemy.id);
      let group = this._enemyMeshes.get(enemy.id);

      if (!group) {
        group = this._createEnemyMesh(enemy);
        this._scene.add(group);
        this._enemyMeshes.set(enemy.id, group);
      }

      group.position.set(enemy.position.x, enemy.position.y, enemy.position.z);
      group.rotation.y = enemy.rotationY;

      if (!enemy.alive) {
        // Death: scale up, fade, and tumble
        const t = 1 - enemy.deathTimer / 0.5;
        group.scale.setScalar(1 + t * 0.5);
        group.rotation.x += (Math.random() - 0.5) * 8 * t;
        group.rotation.z += (Math.random() - 0.5) * 6 * t;
        group.traverse(child => {
          if ((child as THREE.Mesh).material) {
            const mat = (child as THREE.Mesh).material as THREE.Material;
            if ('opacity' in mat) {
              (mat as any).opacity = Math.max(0, 1 - t);
              (mat as any).transparent = true;
            }
          }
        });
        continue;
      }

      group.scale.setScalar(1);

      // Hit flash
      if (enemy.hitTimer > 0) {
        group.traverse(child => {
          if ((child as THREE.Mesh).material && 'emissiveIntensity' in ((child as THREE.Mesh).material as any)) {
            ((child as THREE.Mesh).material as any).emissiveIntensity = 1.0;
          }
        });
      } else {
        group.traverse(child => {
          if ((child as THREE.Mesh).material && 'emissiveIntensity' in ((child as THREE.Mesh).material as any)) {
            ((child as THREE.Mesh).material as any).emissiveIntensity = 0.15;
          }
        });
      }

      // Animate wing-bearing enemies
      const wingL = group.getObjectByName("wingL") as THREE.Mesh;
      const wingR = group.getObjectByName("wingR") as THREE.Mesh;
      if (wingL && wingR) {
        const flapSpeed = enemy.isBoss ? 3 : 8;
        wingL.rotation.x = Math.sin(time * flapSpeed + enemy.id) * 0.5;
        wingR.rotation.x = Math.sin(time * flapSpeed + enemy.id) * 0.5;
      }

      // Animate detailed dragon wings (Ancient Dragon boss)
      if (enemy.type === TDEnemyType.BOSS_ANCIENT_DRAGON) {
        const dragonWingL = group.getObjectByName("dragonWingL") as THREE.Group;
        const dragonWingR = group.getObjectByName("dragonWingR") as THREE.Group;
        if (dragonWingL && dragonWingR) {
          const flapBase = Math.sin(time * 2.0 + enemy.id) * 0.4;
          // Upper arm flap
          dragonWingL.rotation.x = flapBase;
          dragonWingR.rotation.x = -flapBase;
          // Forearm follows with a delay
          const forearmL = group.getObjectByName("forearmL") as THREE.Group;
          const forearmR = group.getObjectByName("forearmR") as THREE.Group;
          if (forearmL && forearmR) {
            const forearmFlap = Math.sin(time * 2.0 + enemy.id - 0.4) * 0.3;
            forearmL.rotation.x = forearmFlap * 0.5;
            forearmR.rotation.x = -forearmFlap * 0.5;
          }
          // Slight folding on the upstroke
          const upperArmL = group.getObjectByName("upperArmL") as THREE.Group;
          const upperArmR = group.getObjectByName("upperArmR") as THREE.Group;
          if (upperArmL && upperArmR) {
            const fold = Math.sin(time * 2.0 + enemy.id + 0.3) * 0.15;
            upperArmL.rotation.z = fold;
            upperArmR.rotation.z = -fold;
          }
        }
        // Jaw animation — open and close menacingly
        const dragonJaw = group.getObjectByName("dragonJaw") as THREE.Mesh;
        if (dragonJaw) {
          const jawOpen = Math.sin(time * 1.5 + enemy.id) * 0.15 + 0.05;
          dragonJaw.rotation.x = jawOpen;
        }
        // Mouth fire glow pulsing
        const mouthGlow = group.getObjectByName("mouthGlow") as THREE.Mesh;
        if (mouthGlow) {
          const glowPulse = 0.4 + Math.sin(time * 3 + enemy.id) * 0.3;
          (mouthGlow.material as THREE.MeshBasicMaterial).opacity = glowPulse;
          const glowScale = 1 + Math.sin(time * 4 + enemy.id) * 0.3;
          mouthGlow.scale.setScalar(glowScale);
        }
      }

      // Animate rings
      const ring = group.getObjectByName("ring") as THREE.Mesh;
      if (ring) {
        ring.rotation.x = time * 2;
        ring.rotation.y = time * 1.5;
      }

      // Animate halos
      const halo = group.getObjectByName("halo") as THREE.Mesh;
      if (halo) {
        halo.rotation.z = time * 0.5;
      }

      // Aura pulse
      const aura = group.getObjectByName("aura") as THREE.Mesh;
      if (aura) {
        const pulse = 1 + Math.sin(time * 3 + enemy.id) * 0.15;
        aura.scale.setScalar(pulse);
      }

      // Boss body segments animation
      if (enemy.type === TDEnemyType.BOSS_VOID_EMPEROR) {
        for (let i = 0; i < 6; i++) {
          const seg = group.getObjectByName(`seg${i}`) as THREE.Mesh;
          if (seg) {
            seg.position.y = Math.sin(time * 1.5 + i * 0.5) * enemy.size * 0.3;
            seg.position.x = i * enemy.size * 0.6 + Math.sin(time + i * 0.4) * 0.5;
          }
        }
      }

      // Elite ring rotation
      const eliteRing = group.getObjectByName("eliteRing") as THREE.Mesh;
      if (eliteRing) {
        eliteRing.rotation.z += dt * 2;
      }
    }

    // Cleanup removed enemies
    for (const [id, group] of this._enemyMeshes) {
      if (!seen.has(id)) {
        this._scene.remove(group);
        group.traverse(child => {
          if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
          if ((child as THREE.Mesh).material) {
            const mat = (child as THREE.Mesh).material;
            if (Array.isArray(mat)) mat.forEach(m => m.dispose());
            else (mat as THREE.Material).dispose();
          }
        });
        this._enemyMeshes.delete(id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Projectiles
  // ---------------------------------------------------------------------------

  private _updateProjectiles(state: ThreeDragonState, _dt: number, time: number): void {
    const seen = new Set<number>();

    for (const proj of state.projectiles) {
      seen.add(proj.id);
      let group = this._projMeshes.get(proj.id);

      if (!group) {
        group = this._createProjectileGroup(proj.skillId, proj.color, proj.trailColor, proj.size, proj.isPlayerOwned);
        this._scene.add(group);
        this._projMeshes.set(proj.id, group);
      }

      group.position.set(proj.position.x, proj.position.y, proj.position.z);

      // Skill-specific animations
      const pulse = 1 + Math.sin(time * 10 + proj.id) * 0.15 * proj.glowIntensity;

      if (proj.skillId === TDSkillId.ARCANE_BOLT) {
        // Arcane bolt: spinning energy core with pulsing aura
        const core = group.getObjectByName("projCore") as THREE.Mesh;
        const aura = group.getObjectByName("projAura") as THREE.Mesh;
        const ring = group.getObjectByName("projRing") as THREE.Mesh;
        if (core) core.scale.setScalar(proj.size * pulse);
        if (aura) {
          aura.scale.setScalar(proj.size * 2.5 * (1 + Math.sin(time * 15 + proj.id) * 0.2));
          (aura.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(time * 12 + proj.id) * 0.08;
        }
        if (ring) {
          ring.rotation.x = time * 8 + proj.id;
          ring.rotation.y = time * 6;
        }
        group.rotation.z = time * 5;
        // Rich trail with multiple colors
        if (Math.random() < 0.85) {
          const trailColors = [
            { r: 0.3, g: 0.5, b: 1.0 },
            { r: 0.5, g: 0.7, b: 1.0 },
            { r: 0.7, g: 0.4, b: 1.0 },
            { r: 0.2, g: 0.8, b: 1.0 },
          ];
          const c = trailColors[Math.floor(Math.random() * trailColors.length)];
          const spread = proj.size * 0.8;
          this._addTrailPoint(
            proj.position.x + (Math.random() - 0.5) * spread,
            proj.position.y + (Math.random() - 0.5) * spread,
            proj.position.z + (Math.random() - 0.5) * spread + 0.5,
            c.r, c.g, c.b,
            proj.size * (0.4 + Math.random() * 0.6),
          );
        }
        // Extra sparkle particles behind
        if (Math.random() < 0.4) {
          this._addTrailPoint(
            proj.position.x + (Math.random() - 0.5) * 1.5,
            proj.position.y + (Math.random() - 0.5) * 1.5,
            proj.position.z + 1 + Math.random() * 2,
            0.6, 0.8, 1.0,
            0.1 + Math.random() * 0.15,
          );
        }
      } else if (proj.skillId === TDSkillId.CELESTIAL_LANCE) {
        // Celestial lance: brilliant elongated beam with divine particles
        const beam = group.getObjectByName("projCore") as THREE.Mesh;
        const halo = group.getObjectByName("projAura") as THREE.Mesh;
        const divineRing1 = group.getObjectByName("projRing") as THREE.Mesh;
        const divineRing2 = group.getObjectByName("projRing2") as THREE.Mesh;
        if (beam) {
          beam.scale.set(proj.size * 0.6, proj.size * 0.6, proj.size * 4 * pulse);
        }
        if (halo) {
          halo.scale.set(proj.size * 2 * pulse, proj.size * 2 * pulse, proj.size * 6);
          (halo.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(time * 8) * 0.05;
        }
        if (divineRing1) {
          divineRing1.rotation.z = time * 12;
          divineRing1.scale.setScalar(1 + Math.sin(time * 6) * 0.3);
        }
        if (divineRing2) {
          divineRing2.rotation.z = -time * 8;
          divineRing2.rotation.x = time * 4;
        }
        // Brilliant divine trail
        for (let t = 0; t < 3; t++) {
          if (Math.random() < 0.9) {
            const brightness = 0.8 + Math.random() * 0.2;
            const spread = proj.size * 1.5;
            this._addTrailPoint(
              proj.position.x + (Math.random() - 0.5) * spread,
              proj.position.y + (Math.random() - 0.5) * spread,
              proj.position.z + t * 0.8 + Math.random() * 1.5,
              brightness, brightness * 0.95, brightness * 0.7,
              proj.size * (0.5 + Math.random() * 0.8),
            );
          }
        }
        // Divine light motes floating outward
        if (Math.random() < 0.5) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 1 + Math.random() * 2;
          this._addTrailPoint(
            proj.position.x + Math.cos(angle) * dist,
            proj.position.y + Math.sin(angle) * dist,
            proj.position.z + Math.random() * 3,
            1.0, 0.95, 0.6,
            0.15 + Math.random() * 0.2,
          );
        }
      } else {
        // Default projectile (enemy projectiles, etc.)
        const core = group.getObjectByName("projCore") as THREE.Mesh;
        if (core) core.scale.setScalar(proj.size * pulse);
        const aura = group.getObjectByName("projAura") as THREE.Mesh;
        if (aura) {
          aura.scale.setScalar(proj.size * 2 * pulse);
          (aura.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(time * 8 + proj.id) * 0.08;
        }
        group.rotation.y = time * 3 + proj.id;
        // Trail
        if (Math.random() < 0.7) {
          const col = new THREE.Color(proj.trailColor);
          this._addTrailPoint(
            proj.position.x + (Math.random() - 0.5) * 0.5,
            proj.position.y + (Math.random() - 0.5) * 0.5,
            proj.position.z + (Math.random() - 0.5) * 0.5,
            col.r, col.g, col.b,
            proj.size * (0.4 + Math.random() * 0.4),
          );
        }
      }
    }

    // Cleanup
    for (const [id, group] of this._projMeshes) {
      if (!seen.has(id)) {
        this._scene.remove(group);
        group.traverse(child => {
          if ((child as THREE.Mesh).geometry && (child as THREE.Mesh).geometry !== this._sphereGeo) {
            (child as THREE.Mesh).geometry.dispose();
          }
          if ((child as THREE.Mesh).material) {
            const mat = (child as THREE.Mesh).material;
            if (Array.isArray(mat)) mat.forEach(m => m.dispose());
            else (mat as THREE.Material).dispose();
          }
        });
        this._projMeshes.delete(id);
      }
    }
  }

  /** Create a visually distinct projectile group based on skill type */
  private _createProjectileGroup(
    skillId: TDSkillId | null,
    color: number,
    trailColor: number,
    size: number,
    isPlayerOwned: boolean,
  ): THREE.Group {
    const group = new THREE.Group();

    if (skillId === TDSkillId.ARCANE_BOLT) {
      // --- Arcane Bolt: Glowing magical sphere with energy ring and aura ---
      // Bright inner core
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xaaddff });
      const core = new THREE.Mesh(this._sphereGeo, coreMat);
      core.scale.setScalar(size);
      core.name = "projCore";
      group.add(core);
      // Colored mid layer
      const midMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
      });
      const mid = new THREE.Mesh(this._sphereGeo, midMat);
      mid.scale.setScalar(size * 1.4);
      group.add(mid);
      // Outer aura glow
      const auraMat = new THREE.MeshBasicMaterial({
        color: trailColor,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const aura = new THREE.Mesh(this._sphereGeo, auraMat);
      aura.scale.setScalar(size * 2.5);
      aura.name = "projAura";
      group.add(aura);
      // Orbiting energy ring
      const ringGeo = new THREE.TorusGeometry(size * 1.2, size * 0.06, 6, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x66aaff,
        transparent: true,
        opacity: 0.5,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.name = "projRing";
      group.add(ring);
      // Point light for illumination
      const light = new THREE.PointLight(color, 2, 6);
      group.add(light);

    } else if (skillId === TDSkillId.CELESTIAL_LANCE) {
      // --- Celestial Lance: Elongated divine beam with halo rings ---
      // Elongated bright core (stretched sphere)
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xfffff0 });
      const core = new THREE.Mesh(this._sphereGeo, coreMat);
      core.scale.set(size * 0.6, size * 0.6, size * 4);
      core.name = "projCore";
      group.add(core);
      // Golden-white inner glow
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xffeeaa,
        transparent: true,
        opacity: 0.8,
      });
      const inner = new THREE.Mesh(this._sphereGeo, innerMat);
      inner.scale.set(size * 0.9, size * 0.9, size * 5);
      group.add(inner);
      // Large outer halo
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0xffffdd,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const aura = new THREE.Mesh(this._sphereGeo, auraMat);
      aura.scale.set(size * 2, size * 2, size * 6);
      aura.name = "projAura";
      group.add(aura);
      // Divine spinning ring 1
      const ring1Geo = new THREE.TorusGeometry(size * 1.5, size * 0.08, 8, 20);
      const ring1Mat = new THREE.MeshBasicMaterial({
        color: 0xffdd88,
        transparent: true,
        opacity: 0.4,
      });
      const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
      ring1.name = "projRing";
      group.add(ring1);
      // Divine spinning ring 2 (perpendicular)
      const ring2Geo = new THREE.TorusGeometry(size * 1.2, size * 0.06, 8, 16);
      const ring2Mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
      });
      const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
      ring2.rotation.x = Math.PI / 2;
      ring2.name = "projRing2";
      group.add(ring2);
      // Bright point light
      const light = new THREE.PointLight(0xffffcc, 5, 15);
      group.add(light);

    } else {
      // --- Default / Enemy projectile: glowing sphere with aura ---
      const coreMat = new THREE.MeshBasicMaterial({
        color: isPlayerOwned ? 0xffffff : new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.3).getHex(),
      });
      const core = new THREE.Mesh(this._sphereGeo, coreMat);
      core.scale.setScalar(size * 0.7);
      core.name = "projCore";
      group.add(core);
      // Colored layer
      const midMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
      });
      const mid = new THREE.Mesh(this._sphereGeo, midMat);
      mid.scale.setScalar(size);
      group.add(mid);
      // Outer glow
      const auraMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const aura = new THREE.Mesh(this._sphereGeo, auraMat);
      aura.scale.setScalar(size * 2);
      aura.name = "projAura";
      group.add(aura);
      // Small point light
      const light = new THREE.PointLight(color, 1.5, 5);
      group.add(light);
    }

    return group;
  }

  // ---------------------------------------------------------------------------
  // Explosions
  // ---------------------------------------------------------------------------

  addExplosion(x: number, y: number, z: number, radius: number, color: number): void {
    // --- Layer 1: White-hot inner core (fast expand, fast fade) ---
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });
    const core = new THREE.Mesh(this._sphereGeo, coreMat);
    core.position.set(x, y, z);
    core.scale.setScalar(0.05);
    this._scene.add(core);
    this._explosionMeshes.push({ mesh: core, timer: 0, maxTimer: 0.2 });

    // --- Layer 2: Hot colored core ---
    const hotColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5).getHex();
    const hotMat = new THREE.MeshBasicMaterial({
      color: hotColor,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const hotMesh = new THREE.Mesh(this._sphereGeo, hotMat);
    hotMesh.position.set(x, y, z);
    hotMesh.scale.setScalar(0.05);
    this._scene.add(hotMesh);
    this._explosionMeshes.push({ mesh: hotMesh, timer: 0, maxTimer: 0.35 });

    // --- Layer 3: Main colored explosion sphere ---
    const mainMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mainMesh = new THREE.Mesh(this._sphereGeo, mainMat);
    mainMesh.position.set(x, y, z);
    mainMesh.scale.setScalar(0.1);
    this._scene.add(mainMesh);
    this._explosionMeshes.push({ mesh: mainMesh, timer: 0, maxTimer: 0.6 });

    // --- Layer 4: Outer dark smoke/falloff sphere ---
    const darkColor = new THREE.Color(color).lerp(new THREE.Color(0x000000), 0.5).getHex();
    const darkMat = new THREE.MeshBasicMaterial({
      color: darkColor,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const darkMesh = new THREE.Mesh(this._sphereGeo, darkMat);
    darkMesh.position.set(x, y, z);
    darkMesh.scale.setScalar(0.05);
    this._scene.add(darkMesh);
    this._explosionMeshes.push({ mesh: darkMesh, timer: 0, maxTimer: 0.9 });

    // --- Shockwave ring 1: horizontal expanding torus ---
    const ringGeo = new THREE.TorusGeometry(1, 0.12, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: hotColor,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, y, z);
    ring.rotation.x = Math.PI / 2;
    ring.scale.setScalar(0.1);
    this._scene.add(ring);
    this._shockwaveRings.push({ mesh: ring, timer: 0, maxTimer: 0.5, maxRadius: radius * 1.8 });

    // --- Shockwave ring 2: vertical for 3D depth ---
    if (radius > 2) {
      const ring2Geo = new THREE.TorusGeometry(1, 0.08, 8, 24);
      const ring2Mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.3).getHex(),
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
      ring2.position.set(x, y, z);
      ring2.rotation.z = Math.PI / 2;
      ring2.scale.setScalar(0.1);
      this._scene.add(ring2);
      this._shockwaveRings.push({ mesh: ring2, timer: 0, maxTimer: 0.6, maxRadius: radius * 1.4 });
    }

    // --- Shockwave ring 3: diagonal for extra large explosions ---
    if (radius > 5) {
      const ring3Geo = new THREE.TorusGeometry(1, 0.06, 8, 20);
      const ring3Mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
      ring3.position.set(x, y, z);
      ring3.rotation.x = Math.PI / 4;
      ring3.rotation.y = Math.PI / 4;
      ring3.scale.setScalar(0.1);
      this._scene.add(ring3);
      this._shockwaveRings.push({ mesh: ring3, timer: 0, maxTimer: 0.7, maxRadius: radius * 1.6 });
    }

    // --- Flying debris chunks ---
    const debrisCount = Math.min(12, Math.floor(radius * 2));
    for (let i = 0; i < debrisCount; i++) {
      const debrisMat = new THREE.MeshBasicMaterial({
        color: Math.random() < 0.3 ? hotColor : Math.random() < 0.5 ? color : darkColor,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const geoChoice = Math.random() < 0.5 ? this._boxGeo : this._sphereGeo;
      const debris = new THREE.Mesh(geoChoice, debrisMat);
      const debrisSize = 0.1 + Math.random() * 0.25;
      debris.scale.set(debrisSize * (0.5 + Math.random()), debrisSize * (0.5 + Math.random()), debrisSize * (0.5 + Math.random()));
      debris.position.set(x, y, z);
      this._scene.add(debris);

      const angle = Math.random() * Math.PI * 2;
      const angleV = Math.random() * Math.PI;
      const speed = 8 + Math.random() * 15;
      this._debrisParticles.push({
        mesh: debris,
        vx: Math.cos(angle) * Math.sin(angleV) * speed,
        vy: Math.cos(angleV) * speed * 0.8 + 3,
        vz: Math.sin(angle) * Math.sin(angleV) * speed,
        timer: 0,
        maxTimer: 0.4 + Math.random() * 0.5,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
        ),
      });
    }

    // --- Flash point light for illumination ---
    const flash = new THREE.PointLight(color, 15, radius * 5);
    flash.position.set(x, y, z);
    this._scene.add(flash);
    // Secondary white flash
    const flash2 = new THREE.PointLight(0xffffff, 8, radius * 3);
    flash2.position.set(x, y, z);
    this._scene.add(flash2);
    setTimeout(() => { this._scene.remove(flash); this._scene.remove(flash2); }, 200);

    // --- Burst trail particles — lots of them ---
    const col = new THREE.Color(color);
    const brightCol = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5);
    const midCol = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.2);
    const darkCol2 = new THREE.Color(color).lerp(new THREE.Color(0x000000), 0.3);
    const particleCount = Math.min(50, Math.floor(radius * 8));
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const angleV = Math.random() * Math.PI;
      const r = radius * (0.1 + Math.random() * 0.6);
      const rnd = Math.random();
      const useColor = rnd < 0.15 ? brightCol : rnd < 0.3 ? midCol : rnd < 0.45 ? darkCol2 : col;
      this._addTrailPoint(
        x + Math.cos(angle) * Math.sin(angleV) * r,
        y + Math.cos(angleV) * r,
        z + Math.sin(angle) * Math.sin(angleV) * r,
        useColor.r, useColor.g, useColor.b,
        0.3 + Math.random() * 1.2,
      );
    }
    // Extra ring of sparks at the equator
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = radius * 0.7;
      this._addTrailPoint(
        x + Math.cos(a) * r,
        y + (Math.random() - 0.5) * 0.5,
        z + Math.sin(a) * r,
        brightCol.r, brightCol.g, brightCol.b,
        0.5 + Math.random() * 0.5,
      );
    }
  }

  private _updateExplosionMeshes(_state: ThreeDragonState, dt: number): void {
    this._explosionMeshes = this._explosionMeshes.filter(ex => {
      ex.timer += dt;
      if (ex.timer < 0) return true; // staggered start — not yet visible
      const t = ex.timer / ex.maxTimer;
      if (t >= 1) {
        this._scene.remove(ex.mesh);
        (ex.mesh.material as THREE.Material).dispose();
        return false;
      }
      // Ease-out expansion for more natural feel
      const eased = 1 - Math.pow(1 - t, 3);
      const scale = eased * 6;
      ex.mesh.scale.setScalar(scale);
      // Faster initial opacity then smooth fade
      const opacity = t < 0.15 ? 0.7 : 0.7 * Math.pow(1 - (t - 0.15) / 0.85, 2);
      (ex.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity);
      return true;
    });
  }

  // ---------------------------------------------------------------------------
  // Lightning FX
  // ---------------------------------------------------------------------------

  addLightning(x: number, y: number, z: number): void {
    const group = new THREE.Group();

    // --- Helper: generate a jagged bolt path ---
    const generateBoltPath = (
      startX: number, startY: number, startZ: number,
      endX: number, endY: number, endZ: number,
      jitter: number, segments: number,
    ): THREE.Vector3[] => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const px = startX + (endX - startX) * t + (i > 0 && i < segments ? (Math.random() - 0.5) * jitter : 0);
        const py = startY + (endY - startY) * t;
        const pz = startZ + (endZ - startZ) * t + (i > 0 && i < segments ? (Math.random() - 0.5) * jitter : 0);
        pts.push(new THREE.Vector3(px, py, pz));
      }
      return pts;
    };

    // --- Main bolt: bright white-blue core ---
    const skyY = 45;
    const startX = x + (Math.random() - 0.5) * 8;
    const mainPoints = generateBoltPath(startX, skyY, z + (Math.random() - 0.5) * 3, x, y, z, 5, 14);

    // Thick bright core line (rendered as tube-like with multiple lines)
    for (let pass = 0; pass < 3; pass++) {
      const offsetScale = pass * 0.15;
      const adjustedPoints = mainPoints.map(p => new THREE.Vector3(
        p.x + (Math.random() - 0.5) * offsetScale,
        p.y + (Math.random() - 0.5) * offsetScale,
        p.z + (Math.random() - 0.5) * offsetScale,
      ));
      const lineGeo = new THREE.BufferGeometry().setFromPoints(adjustedPoints);
      const lineColor = pass === 0 ? 0xffffff : pass === 1 ? 0xcceeFF : 0x88ddff;
      const lineOpacity = pass === 0 ? 1.0 : pass === 1 ? 0.8 : 0.5;
      const lineMat = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: lineOpacity,
        linewidth: 2,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      group.add(line);
    }

    // --- Branch bolts: 2-4 smaller forks splitting from the main bolt ---
    const branchCount = 2 + Math.floor(Math.random() * 3);
    for (let b = 0; b < branchCount; b++) {
      const forkIndex = 3 + Math.floor(Math.random() * 8);
      if (forkIndex >= mainPoints.length) continue;
      const forkPt = mainPoints[forkIndex];
      const branchEndX = forkPt.x + (Math.random() - 0.5) * 12;
      const branchEndY = forkPt.y - 3 - Math.random() * 10;
      const branchEndZ = forkPt.z + (Math.random() - 0.5) * 8;
      const branchPts = generateBoltPath(forkPt.x, forkPt.y, forkPt.z, branchEndX, branchEndY, branchEndZ, 3, 6);
      const branchGeo = new THREE.BufferGeometry().setFromPoints(branchPts);
      const branchMat = new THREE.LineBasicMaterial({
        color: 0xaaddff,
        transparent: true,
        opacity: 0.6,
        linewidth: 1,
      });
      const branchLine = new THREE.Line(branchGeo, branchMat);
      group.add(branchLine);

      // Sub-branches (tiny forks from branches)
      if (Math.random() < 0.5 && branchPts.length > 3) {
        const subIdx = 2 + Math.floor(Math.random() * 3);
        if (subIdx < branchPts.length) {
          const subPt = branchPts[subIdx];
          const subPts = generateBoltPath(subPt.x, subPt.y, subPt.z,
            subPt.x + (Math.random() - 0.5) * 5, subPt.y - 2 - Math.random() * 4, subPt.z + (Math.random() - 0.5) * 4,
            1.5, 4);
          const subGeo = new THREE.BufferGeometry().setFromPoints(subPts);
          const subMat = new THREE.LineBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.35 });
          group.add(new THREE.Line(subGeo, subMat));
        }
      }
    }

    // --- Impact glow sphere at strike point ---
    const impactMat = new THREE.MeshBasicMaterial({
      color: 0xcceeFF,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const impact = new THREE.Mesh(this._sphereGeo, impactMat);
    impact.position.set(x, y, z);
    impact.scale.setScalar(2);
    group.add(impact);

    // --- Ground impact ring ---
    const impactRingGeo = new THREE.RingGeometry(0.5, 3, 16);
    const impactRingMat = new THREE.MeshBasicMaterial({
      color: 0x88ddff,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const impactRing = new THREE.Mesh(impactRingGeo, impactRingMat);
    impactRing.position.set(x, y, z);
    impactRing.rotation.x = -Math.PI / 2;
    group.add(impactRing);

    this._scene.add(group);

    // --- Bright flash lights ---
    const flash1 = new THREE.PointLight(0xcceeFF, 20, 40);
    flash1.position.set(x, y + 5, z);
    this._scene.add(flash1);
    const flash2 = new THREE.PointLight(0xffffff, 12, 25);
    flash2.position.set(x, y, z);
    this._scene.add(flash2);
    // Secondary flash at the origin (sky) for ambient illumination
    const skyFlash = new THREE.PointLight(0x88ddff, 6, 80);
    skyFlash.position.set(startX, skyY * 0.7, z);
    this._scene.add(skyFlash);

    // --- Spark trail particles at impact point ---
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * 3;
      const sparkBright = 0.7 + Math.random() * 0.3;
      this._addTrailPoint(
        x + Math.cos(angle) * r,
        y + Math.random() * 2,
        z + Math.sin(angle) * r,
        sparkBright * 0.6, sparkBright * 0.85, sparkBright,
        0.3 + Math.random() * 0.6,
      );
    }
    // Particles along the bolt path
    for (let i = 0; i < mainPoints.length; i += 2) {
      const p = mainPoints[i];
      this._addTrailPoint(
        p.x + (Math.random() - 0.5) * 1, p.y, p.z + (Math.random() - 0.5) * 1,
        0.6, 0.85, 1.0,
        0.2 + Math.random() * 0.3,
      );
    }

    // Store for animated fade
    this._lightningBolts.push({ group, timer: 0, maxTimer: 0.25 });

    // Cleanup lights after a short time
    setTimeout(() => {
      this._scene.remove(flash1);
      this._scene.remove(flash2);
      this._scene.remove(skyFlash);
    }, 120);
  }

  // ---------------------------------------------------------------------------
  // Enemy death effects
  // ---------------------------------------------------------------------------

  addEnemyDeathEffect(x: number, y: number, z: number, size: number, color: number, glowColor: number, isBoss: boolean): void {
    // --- Debris burst: varied shapes flying outward with rotation ---
    const debrisCount = isBoss ? 40 : 18 + Math.floor(Math.random() * 8);
    const brightColor = new THREE.Color(glowColor).lerp(new THREE.Color(0xffffff), 0.4).getHex();

    for (let i = 0; i < debrisCount; i++) {
      const rnd = Math.random();
      const debrisColor = rnd < 0.2 ? 0xffffff : rnd < 0.45 ? brightColor : rnd < 0.7 ? glowColor : color;
      const debrisMat = new THREE.MeshBasicMaterial({
        color: debrisColor,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      // Mix of shapes for variety
      const geoChoice = Math.random() < 0.4 ? this._boxGeo : Math.random() < 0.6 ? this._sphereGeo : this._coneGeo;
      const debris = new THREE.Mesh(geoChoice, debrisMat);
      const debrisSize = (isBoss ? 0.25 : 0.1) + Math.random() * (isBoss ? 0.4 : 0.2);
      debris.scale.set(
        debrisSize * (0.5 + Math.random()),
        debrisSize * (0.5 + Math.random()),
        debrisSize * (0.5 + Math.random()),
      );
      debris.position.set(x, y, z);
      debris.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this._scene.add(debris);

      const angle = Math.random() * Math.PI * 2;
      const angleV = Math.random() * Math.PI;
      const speed = (isBoss ? 18 : 10) + Math.random() * 12;
      this._debrisParticles.push({
        mesh: debris,
        vx: Math.cos(angle) * Math.sin(angleV) * speed,
        vy: Math.cos(angleV) * speed * 0.6 + 4,
        vz: Math.sin(angle) * Math.sin(angleV) * speed,
        timer: 0,
        maxTimer: (isBoss ? 0.7 : 0.5) + Math.random() * 0.4,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
        ),
      });
    }

    // --- Disintegration ring (expanding torus at death point) ---
    const deathRingGeo = new THREE.TorusGeometry(1, 0.1, 8, 24);
    const deathRingMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const deathRing = new THREE.Mesh(deathRingGeo, deathRingMat);
    deathRing.position.set(x, y, z);
    deathRing.rotation.x = Math.PI / 2;
    deathRing.scale.setScalar(0.1);
    this._scene.add(deathRing);
    this._shockwaveRings.push({ mesh: deathRing, timer: 0, maxTimer: 0.5, maxRadius: size * 4 });

    // --- Bright flash core ---
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const core = new THREE.Mesh(this._sphereGeo, coreMat);
    core.position.set(x, y, z);
    core.scale.setScalar(0.2);
    this._scene.add(core);
    this._explosionMeshes.push({ mesh: core, timer: 0, maxTimer: 0.25 });

    // --- Colored glow burst ---
    const glowMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(this._sphereGeo, glowMat);
    glow.position.set(x, y, z);
    glow.scale.setScalar(0.1);
    this._scene.add(glow);
    this._explosionMeshes.push({ mesh: glow, timer: 0, maxTimer: 0.5 });

    // --- Flash point lights ---
    const flashIntensity = isBoss ? 25 : 10;
    const flashRange = isBoss ? size * 12 : size * 6;
    const flash = new THREE.PointLight(glowColor, flashIntensity, flashRange);
    flash.position.set(x, y, z);
    this._scene.add(flash);
    const flash2 = new THREE.PointLight(0xffffff, flashIntensity * 0.5, flashRange * 0.6);
    flash2.position.set(x, y, z);
    this._scene.add(flash2);
    setTimeout(() => { this._scene.remove(flash); this._scene.remove(flash2); }, isBoss ? 350 : 180);

    // --- Trail particle burst ---
    const col = new THREE.Color(glowColor);
    const brightCol = new THREE.Color(glowColor).lerp(new THREE.Color(0xffffff), 0.5);
    const burstCount = isBoss ? 40 : 25;
    for (let i = 0; i < burstCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const angleV = Math.random() * Math.PI;
      const r = size * (0.5 + Math.random() * 2);
      const useColor = Math.random() < 0.3 ? brightCol : col;
      this._addTrailPoint(
        x + Math.cos(angle) * Math.sin(angleV) * r,
        y + Math.cos(angleV) * r,
        z + Math.sin(angle) * Math.sin(angleV) * r,
        useColor.r, useColor.g, useColor.b,
        0.3 + Math.random() * 0.8,
      );
    }

    // --- Boss: epic multi-layer death ---
    if (isBoss) {
      // Multiple expanding glow layers with staggered timing
      for (let i = 0; i < 5; i++) {
        const layerMat = new THREE.MeshBasicMaterial({
          color: i < 2 ? 0xffffff : glowColor,
          transparent: true,
          opacity: 0.5 - i * 0.08,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const layer = new THREE.Mesh(this._sphereGeo, layerMat);
        layer.position.set(x, y, z);
        layer.scale.setScalar(0.3);
        this._scene.add(layer);
        this._explosionMeshes.push({ mesh: layer, timer: -i * 0.1, maxTimer: 1.0 + i * 0.15 });
      }

      // Multiple shockwave rings at different angles
      for (let i = 0; i < 3; i++) {
        const bossRingGeo = new THREE.TorusGeometry(1, 0.08, 8, 24);
        const bossRingMat = new THREE.MeshBasicMaterial({
          color: i === 0 ? 0xffffff : glowColor,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const bossRing = new THREE.Mesh(bossRingGeo, bossRingMat);
        bossRing.position.set(x, y, z);
        bossRing.rotation.set(i * Math.PI / 3, i * Math.PI / 4, 0);
        bossRing.scale.setScalar(0.1);
        this._scene.add(bossRing);
        this._shockwaveRings.push({ mesh: bossRing, timer: -i * 0.08, maxTimer: 0.8, maxRadius: size * 6 });
      }

      // Energy pillars (vertical beams shooting up)
      for (let i = 0; i < 3; i++) {
        const pillarMat = new THREE.MeshBasicMaterial({
          color: glowColor,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        });
        const pillar = new THREE.Mesh(this._sphereGeo, pillarMat);
        const pAngle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
        const pDist = size * 1.5;
        pillar.position.set(x + Math.cos(pAngle) * pDist, y, z + Math.sin(pAngle) * pDist);
        pillar.scale.set(0.3, 8, 0.3);
        this._scene.add(pillar);
        this._explosionMeshes.push({ mesh: pillar, timer: 0, maxTimer: 1.2 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Screen flash
  // ---------------------------------------------------------------------------

  addScreenFlash(color: number, duration: number): void {
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 9999;
    mesh.frustumCulled = false;

    // Place in front of camera using camera's NDC space
    this._camera.add(mesh);
    mesh.position.set(0, 0, -0.5);

    if (!this._camera.parent) {
      this._scene.add(this._camera);
    }

    this._screenFlashes.push({ mesh, timer: 0, maxTimer: duration });
  }

  private _updateScreenFlashes(dt: number): void {
    this._screenFlashes = this._screenFlashes.filter(sf => {
      sf.timer += dt;
      const t = sf.timer / sf.maxTimer;
      if (t >= 1) {
        this._camera.remove(sf.mesh);
        (sf.mesh.material as THREE.Material).dispose();
        sf.mesh.geometry.dispose();
        return false;
      }
      // Fade opacity from 0.6 to 0
      (sf.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
      return true;
    });
  }

  // ---------------------------------------------------------------------------
  // Power-up meshes
  // ---------------------------------------------------------------------------

  private _updatePowerUpMeshes(state: ThreeDragonState, _dt: number, time: number): void {
    const seen = new Set<number>();

    for (const pu of state.powerUps) {
      seen.add(pu.id);
      let group = this._powerUpMeshes.get(pu.id);

      if (!group) {
        group = new THREE.Group();

        const isHealth = pu.type === "health";
        const orbColor = isHealth ? 0x44ff66 : 0x4488ff;
        const glowColor = isHealth ? 0x22cc44 : 0x2266dd;

        // Inner orb
        const orbMat = new THREE.MeshBasicMaterial({
          color: orbColor,
          transparent: true,
          opacity: 0.9,
        });
        const orb = new THREE.Mesh(this._sphereGeo, orbMat);
        orb.scale.setScalar(0.5);
        orb.name = "orb";
        group.add(orb);

        // Outer glow
        const glowMat = new THREE.MeshBasicMaterial({
          color: glowColor,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const glow = new THREE.Mesh(this._sphereGeo, glowMat);
        glow.scale.setScalar(0.9);
        glow.name = "glow";
        group.add(glow);

        // Point light
        const light = new THREE.PointLight(orbColor, 2, 6);
        light.name = "light";
        group.add(light);

        this._scene.add(group);
        this._powerUpMeshes.set(pu.id, group);
      }

      // Position
      group.position.set(pu.position.x, pu.position.y, pu.position.z);

      // Bob with sine wave
      group.position.y += Math.sin(time * 3 + pu.id) * 0.5;

      // Rotate
      group.rotation.y = time * 2 + pu.id;

      // Pulse scale
      const pulse = 1 + Math.sin(time * 5 + pu.id * 1.7) * 0.15;
      const orb = group.getObjectByName("orb") as THREE.Mesh;
      if (orb) orb.scale.setScalar(0.5 * pulse);
      const glow = group.getObjectByName("glow") as THREE.Mesh;
      if (glow) glow.scale.setScalar(0.9 * pulse);
    }

    // Cleanup removed power-ups
    for (const [id, group] of this._powerUpMeshes) {
      if (!seen.has(id)) {
        this._scene.remove(group);
        group.traverse(child => {
          if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
          if ((child as THREE.Mesh).material) {
            const mat = (child as THREE.Mesh).material;
            if (Array.isArray(mat)) mat.forEach(m => m.dispose());
            else (mat as THREE.Material).dispose();
          }
        });
        this._powerUpMeshes.delete(id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Hit impact effect
  // ---------------------------------------------------------------------------

  addHitEffect(x: number, y: number, z: number, _damage: number, isCrit: boolean): void {
    const intensity = isCrit ? 1.5 : 1.0;
    const hitColor = isCrit ? 0xffaa44 : 0xffffff;

    // --- Impact flash sphere ---
    const flashMat = new THREE.MeshBasicMaterial({
      color: hitColor,
      transparent: true,
      opacity: 0.8 * intensity,
      depthWrite: false,
    });
    const flash = new THREE.Mesh(this._sphereGeo, flashMat);
    flash.position.set(x, y, z);
    flash.scale.setScalar(0.3);
    this._scene.add(flash);
    this._explosionMeshes.push({ mesh: flash, timer: 0, maxTimer: 0.15 });

    // --- Impact sparks ring ---
    const ringGeo = new THREE.RingGeometry(0.3, 1.5 * intensity, 12);
    const ringMat = new THREE.MeshBasicMaterial({
      color: hitColor,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, y, z);
    // Random orientation for variety
    ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    this._scene.add(ring);
    this._hitRings.push({ mesh: ring, timer: 0, maxTimer: 0.2, maxScale: 1.5 * intensity });

    // --- Spark trail particles ---
    const sparkCount = isCrit ? 12 : 6;
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 1.5 * intensity;
      const brightness = 0.7 + Math.random() * 0.3;
      this._addTrailPoint(
        x + Math.cos(angle) * r * Math.random(),
        y + (Math.random() - 0.3) * r,
        z + Math.sin(angle) * r * Math.random(),
        brightness, brightness * (isCrit ? 0.7 : 0.9), isCrit ? brightness * 0.3 : brightness,
        0.15 + Math.random() * 0.3 * intensity,
      );
    }

    // --- Crit: extra starburst lines ---
    if (isCrit) {
      const burstCount = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < burstCount; i++) {
        const angle = (i / burstCount) * Math.PI * 2 + Math.random() * 0.3;
        const len = 1.5 + Math.random() * 1.5;
        const pts = [
          new THREE.Vector3(x, y, z),
          new THREE.Vector3(
            x + Math.cos(angle) * len,
            y + (Math.random() - 0.5) * len * 0.5,
            z + Math.sin(angle) * len,
          ),
        ];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const lineMat = new THREE.MeshBasicMaterial({
          color: 0xffdd66,
          transparent: true,
          opacity: 0.8,
        });
        // Use a thin mesh instead of line for visibility
        const sparkMesh = new THREE.Mesh(this._sphereGeo, lineMat);
        sparkMesh.position.set(
          (pts[0].x + pts[1].x) / 2,
          (pts[0].y + pts[1].y) / 2,
          (pts[0].z + pts[1].z) / 2,
        );
        sparkMesh.scale.set(0.03, 0.03, len * 0.5);
        sparkMesh.lookAt(pts[1]);
        this._scene.add(sparkMesh);
        this._explosionMeshes.push({ mesh: sparkMesh, timer: 0, maxTimer: 0.15 });
        lineGeo.dispose();
      }

      // Crit flash light
      const critFlash = new THREE.PointLight(0xffaa44, 6, 8);
      critFlash.position.set(x, y, z);
      this._scene.add(critFlash);
      setTimeout(() => { this._scene.remove(critFlash); }, 100);
    }

    // Small flash light
    const light = new THREE.PointLight(hitColor, 3 * intensity, 5);
    light.position.set(x, y, z);
    this._scene.add(light);
    setTimeout(() => { this._scene.remove(light); }, 80);
  }

  // ---------------------------------------------------------------------------
  // Player hit effect (red flash, screen distortion)
  // ---------------------------------------------------------------------------

  addPlayerHitEffect(px: number, py: number, pz: number): void {
    // Red flash sphere around player
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const flash = new THREE.Mesh(this._sphereGeo, flashMat);
    flash.position.set(px, py, pz);
    flash.scale.setScalar(4);
    this._scene.add(flash);
    this._explosionMeshes.push({ mesh: flash, timer: 0, maxTimer: 0.3 });

    // Red impact sparks
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 2;
      this._addTrailPoint(
        px + Math.cos(angle) * r,
        py + (Math.random() - 0.5) * 2,
        pz + Math.sin(angle) * r,
        1.0, 0.2, 0.1,
        0.2 + Math.random() * 0.3,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Power-up collect burst effect
  // ---------------------------------------------------------------------------

  addPowerUpCollectEffect(x: number, y: number, z: number, type: "health" | "mana"): void {
    const color = type === "health" ? 0x44ff66 : 0x4488ff;
    const brightColor = type === "health" ? 0xaaffcc : 0xaaccff;

    // Burst sphere
    const burstMat = new THREE.MeshBasicMaterial({
      color: brightColor,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const burst = new THREE.Mesh(this._sphereGeo, burstMat);
    burst.position.set(x, y, z);
    burst.scale.setScalar(0.3);
    this._scene.add(burst);
    this._explosionMeshes.push({ mesh: burst, timer: 0, maxTimer: 0.3 });

    // Sparkle ring
    const ringGeo = new THREE.TorusGeometry(1, 0.06, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, y, z);
    ring.rotation.x = Math.PI / 2;
    ring.scale.setScalar(0.1);
    this._scene.add(ring);
    this._shockwaveRings.push({ mesh: ring, timer: 0, maxTimer: 0.3, maxRadius: 3 });

    // Sparkle particles rising upward
    const col = new THREE.Color(color);
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * 1.5;
      this._addTrailPoint(
        x + Math.cos(angle) * r * 0.5,
        y + Math.random() * 2,
        z + Math.sin(angle) * r * 0.5,
        col.r, col.g, col.b,
        0.15 + Math.random() * 0.25,
      );
    }

    // Flash light
    const light = new THREE.PointLight(color, 4, 8);
    light.position.set(x, y, z);
    this._scene.add(light);
    setTimeout(() => { this._scene.remove(light); }, 150);
  }

  // ---------------------------------------------------------------------------
  // Screen effects
  // ---------------------------------------------------------------------------

  shake(magnitude: number, _duration: number): void {
    // Apply random offset to camera
    this._camera.position.x += (Math.random() - 0.5) * magnitude * 0.5;
    this._camera.position.y += (Math.random() - 0.5) * magnitude * 0.5;
  }

  // ---------------------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------------------

  resize(sw: number, sh: number): void {
    this._renderer.setSize(sw, sh);
    this._camera.aspect = sw / sh;
    this._camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------------------
  // Dispose helper
  // ---------------------------------------------------------------------------

  private _disposeObject(obj: THREE.Object3D): void {
    obj.traverse(child => {
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else (mat as THREE.Material).dispose();
      }
    });
    if (obj.parent) obj.parent.remove(obj);
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  cleanup(): void {
    // Remove all enemy meshes
    for (const [, group] of this._enemyMeshes) {
      this._scene.remove(group);
      group.traverse(child => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
    }
    this._enemyMeshes.clear();

    // Remove projectile meshes
    for (const [, group] of this._projMeshes) {
      this._scene.remove(group);
      group.traverse(child => {
        if ((child as THREE.Mesh).geometry && (child as THREE.Mesh).geometry !== this._sphereGeo) {
          (child as THREE.Mesh).geometry.dispose();
        }
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
    }
    this._projMeshes.clear();

    // Remove explosion meshes
    for (const ex of this._explosionMeshes) {
      this._scene.remove(ex.mesh);
      (ex.mesh.material as THREE.Material).dispose();
    }
    this._explosionMeshes = [];

    // Remove shockwave rings
    for (const ring of this._shockwaveRings) {
      this._scene.remove(ring.mesh);
      (ring.mesh.material as THREE.Material).dispose();
      ring.mesh.geometry.dispose();
    }
    this._shockwaveRings = [];

    // Remove debris particles
    for (const dp of this._debrisParticles) {
      this._scene.remove(dp.mesh);
      (dp.mesh.material as THREE.Material).dispose();
    }
    this._debrisParticles = [];

    // Remove lightning bolts
    for (const lb of this._lightningBolts) {
      lb.group.traverse(child => {
        if ((child as any).geometry) (child as any).geometry.dispose();
        if ((child as any).material && (child as any).material.dispose) (child as any).material.dispose();
      });
      this._scene.remove(lb.group);
    }
    this._lightningBolts = [];

    // Remove hit rings
    for (const hr of this._hitRings) {
      this._scene.remove(hr.mesh);
      (hr.mesh.material as THREE.Material).dispose();
      hr.mesh.geometry.dispose();
    }
    this._hitRings = [];

    // Remove power-up meshes
    for (const [, group] of this._powerUpMeshes) {
      this._scene.remove(group);
      group.traverse(child => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
    }
    this._powerUpMeshes.clear();

    // Remove screen flashes
    for (const sf of this._screenFlashes) {
      this._camera.remove(sf.mesh);
      (sf.mesh.material as THREE.Material).dispose();
      sf.mesh.geometry.dispose();
    }
    this._screenFlashes = [];

    // Dispose ground tiles
    for (const tile of this._groundTiles) this._disposeObject(tile);
    this._groundTiles = [];

    // Dispose water
    if (this._waterPlane) this._disposeObject(this._waterPlane);

    // Dispose mountains
    for (const mtn of this._mountains) this._disposeObject(mtn);
    this._mountains = [];

    // Dispose trees/rocks/grass/flowers
    for (const tree of this._trees) this._disposeObject(tree);
    this._trees = [];

    // Dispose sky objects
    if (this._skyMesh) this._disposeObject(this._skyMesh);
    if (this._sunMesh) this._disposeObject(this._sunMesh);
    if (this._moonMesh) this._disposeObject(this._moonMesh);
    if (this._starField) this._disposeObject(this._starField);
    if (this._godRays) this._disposeObject(this._godRays);
    this._disposeObject(this._cloudGroup);
    this._cloudGroup = new THREE.Group();

    // Dispose fireflies and wildlife
    this._disposeObject(this._fireflyGroup);
    this._fireflyGroup = new THREE.Group();
    this._disposeObject(this._wildlifeGroup);
    this._wildlifeGroup = new THREE.Group();

    // Dispose player
    this._disposeObject(this._eagleGroup);
    this._eagleGroup = new THREE.Group();

    // Dispose trail particles
    if (this._trailParticles) this._disposeObject(this._trailParticles);

    // Remove canvas
    if (this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }

    this._renderer.dispose();
  }

  // ---------------------------------------------------------------------------
  // Project 3D world position to 2D screen coordinates
  // ---------------------------------------------------------------------------

  projectToScreen(worldPos: { x: number; y: number; z: number }, sw: number, sh: number): { x: number; y: number; visible: boolean } {
    const vec = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
    vec.project(this._camera);
    const x = (vec.x * 0.5 + 0.5) * sw;
    const y = (-vec.y * 0.5 + 0.5) * sh;
    const visible = vec.z < 1 && x > -50 && x < sw + 50 && y > -50 && y < sh + 50;
    return { x, y, visible };
  }
}
